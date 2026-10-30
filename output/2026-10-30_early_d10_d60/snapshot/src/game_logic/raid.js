/** Three-party encounter orchestration over the ordinary combat/skill engine.
 * Pure data, injected RNG, no save mutations. All tuning comes from the raid CSVs.
 */
import { makeRng, deriveSeed } from './rng.js';
import { refreshDerived, stateOf } from './skill_effects.js';

const clone = value => JSON.parse(JSON.stringify(value));
const round = value => Math.round(value * 10) / 10;
const GROUPS = [1, 2, 3];
const COMMANDS = ['guard', 'focus', 'support'];

export function createRaidSystem({ battle, arena, game, monsters = {}, chapters = {}, bosses = [], patterns = [], balance = {} }) {
    const defs = bosses.map(row => ({ ...row, patterns: patterns.filter(p => p.raid_id === row.raid_id).map(p => ({ ...p })).sort((a, b) => a.sort_order - b.sort_order) }));
    if (new Set(defs.map(d => d.raid_id)).size !== defs.length) throw new Error('raid: duplicate encounter ids');
    const byId = Object.fromEntries(defs.map(d => [d.raid_id, d]));
    const requireDef = id => {
        const d = byId[id];
        if (!d) throw new Error(`raid: unknown encounter ${id}`);
        return d;
    };
    for (const d of defs) {
        if (!d.raid_id || !Number.isInteger(d.chapter) || d.chapter < 1 || !Number.isInteger(d.monster_id)
            || !Number.isInteger(d.level) || d.level > (balance.hero_level_cap ?? Infinity)
            || !Number.isInteger(d.unlock_level) || d.unlock_level > (balance.hero_level_cap ?? Infinity) || !Number.isInteger(d.demo_seed))
            throw new Error(`raid: invalid identity/level in ${d.raid_id}`);
        for (const key of ['level', 'unlock_level', 'hp', 'damage_min', 'damage_max', 'phase2_speed', 'phase3_speed', 'phase2_damage', 'phase3_damage', 'gap_sec', 'timeout_sec', 'expose_sec', 'command_cool_sec', 'guard_sec', 'focus_sec'])
            if (!(Number.isFinite(d[key]) && d[key] > 0)) throw new Error(`raid: ${d.raid_id}.${key} must be positive`);
        for (const key of ['phase2_hp', 'phase3_hp', 'guard_pct', 'focus_pct', 'support_pct', 'support_threshold', 'resist', 'expose_bonus'])
            if (!(Number.isFinite(d[key]) && d[key] >= 0 && d[key] < 1)) throw new Error(`raid: ${d.raid_id}.${key} out of range`);
        if (!(d.phase3_hp < d.phase2_hp && d.damage_min <= d.damage_max && d.defense >= 0 && d.opening_sec >= 0 && d.auto_guard_lead >= 0))
            throw new Error(`raid: invalid thresholds in ${d.raid_id}`);
        if (!d.patterns.length || new Set(d.patterns.map(p => p.pattern_id)).size !== d.patterns.length
            || new Set(d.patterns.map(p => p.sort_order)).size !== d.patterns.length) throw new Error(`raid: missing/duplicate patterns in ${d.raid_id}`);
        for (const p of d.patterns) {
            if (!p.pattern_id || !Number.isInteger(p.sort_order) || p.sort_order < 1
                || !['single', 'pair', 'all'].includes(p.groups) || !['front', 'all'].includes(p.target)
                || !(p.cast_sec > 0 && p.mult > 0 && p.break_hp_pct >= 0 && p.break_hp_pct < 1)
                || !['physical', 'fire', 'cold', 'lightning', 'poison'].includes(p.element) || !p.name_kr || !p.name_en)
                throw new Error(`raid: invalid pattern ${p.pattern_id}`);
        }
    }

    function entryState(state, id) {
        const need = requireDef(id).unlock_level;
        const have = (state.heroes ?? []).reduce((highest, hero) => Number.isFinite(hero.level) ? Math.max(highest, hero.level) : highest, 0);
        const open = have >= need;
        return { open, have, need, err: open ? null : 'level' };
    }

    function readiness(state, id) {
        const d = requireDef(id), presets = game.presetState(state).presets;
        const gate = game.chapterGate(d.chapter + 1);
        const unlocked = gate != null && (state.progress?.clearedIn?.hell ?? []).includes(gate);
        const parties = GROUPS.map(no => {
            const p = presets.find(p => p.no === no);
            const err = !p || p.party.length !== arena.teamSize ? 'party' : p.running || p.party.some(uid => game.heroBusy(state, uid) === 'run') ? 'running'
                : p.exploring || p.party.some(uid => game.heroBusy(state, uid) === 'explore') ? 'exploring'
                : p.party.some(uid => !state.heroes.some(h => h.uid === uid)) ? 'missing'
                    : p.party.some(uid => game.heroBusy(state, uid) === 'advance') ? 'advancing' : null;
            return { no, count: p?.party.length ?? 0, err };
        });
        const ids = presets.slice(0, GROUPS.length).flatMap(p => p.party);
        const err = entryState(state, id).err ?? (!unlocked ? 'locked' : parties.find(p => p.err)?.err ?? (new Set(ids).size !== ids.length ? 'duplicate' : null));
        return { ok: !err, err, unlocked, chapter: d.chapter, parties };
    }

    function snapshotParties(state) {
        return GROUPS.map(no => {
            const p = state.presets[no - 1];
            if (!p || p.party.length !== arena.teamSize) throw new Error('raid: three full parties required');
            const heroes = p.party.map(uid => game.heroById(state, uid));
            if (heroes.some(h => !h)) throw new Error('raid: missing hero');
            const loadout = game.arenaLoadout(state, no);
            const team = arena.snapshotTeam(heroes, state.items, game.formationState(state, no).byUid, loadout);
            team.forEach((unit, i) => { unit.combat = game.heroCombat(state, heroes[i], p.party, no); });
            return team;
        });
    }

    const practiceCache = new Map();
    function practiceTeams(id, seed = requireDef(id).demo_seed) {
        const cached = seed === requireDef(id).demo_seed;
        if (cached && practiceCache.has(id)) return clone(practiceCache.get(id));
        const d = requireDef(id), taken = [], teams = [];
        for (const no of GROUPS) {
            const rng = makeRng(deriveSeed(seed, no));
            let team;
            // Caller-supplied seeds allow random lab rosters and repeatable diagnostics.
            for (let attempt = 0; attempt < 500; attempt++) {
                team = arena.rollTierOpponent(d.demo_tier, rng, taken);
                if (team.some(p => ['knight', 'warrior'].includes(p.hero.cls)) && team.some(p => p.hero.cls === 'priest')
                    && team.some(p => ['archer', 'mage'].includes(p.hero.cls))) break;
            }
            team.forEach((p, i) => {
                p.uid = p.hero.uid = `raid-demo-${no}-${i}`;
                p.rank = ['knight', 'warrior'].includes(p.hero.cls) ? 0 : 1;
                if (p.hero.cls === 'priest') {
                    p.hero.innate = 'pri_heal';
                    p.actives = [{ id: 'pri_heal', source: 'innate' }, ...p.actives.filter(a => a.source !== 'innate' && a.id !== 'pri_heal')];
                }
                taken.push(p.hero.name);
            });
            teams.push(team);
        }
        if (cached) practiceCache.set(id, teams);
        return clone(teams);
    }

    function createRun(source, id, rng, { auto = true } = {}) {
        const d = requireDef(id);
        if (!Array.isArray(source) || source.length !== GROUPS.length || source.some(p => !Array.isArray(p) || p.length !== arena.teamSize))
            throw new Error('raid: expected three parties of three');
        const teams = clone(source), all = teams.flat();
        if (new Set(all.map(p => p.uid)).size !== all.length || all.some(p => !p.uid || !p.combat || !(p.combat.hp_max > 0)))
            throw new Error('raid: distinct valid heroes required');
        const party = teams.flatMap((team, i) => team.map(p => ({ ...p, group: i + 1 })));
        const template = clone(party[0].combat);
        const combat = { ...template, level: d.level, hp_max: d.hp, hp_regen: 0, defense: d.defense,
            atk_physical: { min: d.damage_min, max: d.damage_max }, atk_magic: { min: d.damage_min, max: d.damage_max },
            atk_pct_sum: 0, main_attr_mult: 1, attack_type: 'physical', basic_attack: true,
            action_period: d.gap_sec, res_fire: d.resist, res_cold: d.resist, res_lightning: d.resist, res_poison: d.resist,
            damage_reduction: 0, res_max_bonus: 0, res_max_el: null, crit_rate: 0, crit_damage: 1,
            life_steal: 0, reflect_damage: 0, def_ignore: 0, res_reduction: 0, res_reduction_el: null,
            dmg_bonus_pct: 0, cooldown_reduction: 0, option_fx: null, mastery_cond: null, find_own: null, find_party: null };
        const bossInput = { uid: 'raid-boss', combat, stats: null, actives: [], rank: 0 };
        let ctx = null, pending = null, phase = 1, turn = 0, nextAt = d.opening_sec, exposedUntil = 0, autoOn = !!auto, cursor = 0, hpBefore = d.hp;
        const commands = GROUPS.map(no => ({ no, readyAt: 0, active: null, until: 0, uses: 0, dealt: 0, healed: 0, taken: 0 }));
        const hpSeen = new Map();
        let breaks = 0, failedBreaks = 0;
        const emit = (e, fields = {}) => ctx.timeline.push({ t: ctx.t, e, ...fields });
        const members = no => ctx.party.filter(u => u.group === no && !u.summon);
        const living = no => members(no).filter(u => u.hp > 0);
        const hpRatio = no => {
            const group = living(no);
            return group.length ? group.reduce((s, u) => s + u.hp / u.hpMax, 0) / group.length : 0;
        };
        const setBuff = (u, key, stat, value, until) => {
            u.buffs[key] = { stat, v: value, until, by: 'raid', quiet: true };
            refreshDerived(u);
        };

        function command(no, kind) {
            if (!ctx || engine.ended) return { ok: false, err: 'ended' };
            if (!GROUPS.includes(no) || !COMMANDS.includes(kind)) return { ok: false, err: 'command' };
            const c = commands[no - 1], group = living(no);
            if (!group.length) return { ok: false, err: 'down' };
            if (c.readyAt > ctx.t) return { ok: false, err: 'cooldown' };
            let targetNo = null;
            if (kind === 'support') {
                const targets = GROUPS.filter(n => n !== no && living(n).length && living(n).some(u => u.hp < u.hpMax));
                targets.sort((a, b) => hpRatio(a) - hpRatio(b) || a - b);
                targetNo = targets[0];
                if (!targetNo) return { ok: false, err: 'full' };
                for (const u of living(targetNo)) {
                    const amt = Math.min(u.hpMax - u.hp, Math.round(u.hpMax * d.support_pct * Math.max(0, 1 + (u.recv ?? 0))));
                    u.hp += amt;
                    emit('heal', { a: group[0].key, d: u.key, s: 'raid_support', amt, dhp: u.hp });
                }
            }
            const duration = kind === 'guard' ? d.guard_sec : kind === 'focus' ? d.focus_sec : 0;
            if (duration) for (const u of ctx.party.filter(u => u.group === no && u.hp > 0))
                setBuff(u, `raid:${kind}`, kind === 'guard' ? 'dr_pct' : 'atk_pct', kind === 'guard' ? d.guard_pct : d.focus_pct, ctx.t + duration);
            c.readyAt = round(ctx.t + d.command_cool_sec); c.active = kind; c.until = round(ctx.t + duration); c.uses++;
            emit('raidCommand', { no, kind, targetNo, until: c.until });
            return { ok: true, targetNo };
        }

        function autoCommand() {
            if (!autoOn) return;
            for (const no of GROUPS) {
                if (!living(no).length || commands[no - 1].readyAt > ctx.t) continue;
                if (pending?.breakMax > 0) { command(no, 'focus'); continue; }
                if (pending?.groups.includes(no) && pending.until - ctx.t <= d.auto_guard_lead) { command(no, 'guard'); continue; }
                if (GROUPS.some(n => n !== no && living(n).length && hpRatio(n) < d.support_threshold)
                    && (!pending || !pending.groups.includes(no))) command(no, 'support');
            }
        }

        function beforeTick(context) {
            ctx = context;
            const boss = ctx.enemies[0];
            if (boss.hp <= 0) return;
            const hp = boss.hp / boss.hpMax, nextPhase = hp <= d.phase3_hp ? 3 : hp <= d.phase2_hp ? 2 : 1;
            if (nextPhase > phase) { phase = nextPhase; emit('raidPhase', { phase }); }
            if (exposedUntil && ctx.t >= exposedUntil) { exposedUntil = 0; emit('raidRecover'); }
            if (!pending && ctx.t >= nextAt && !exposedUntil) {
                const p = d.patterns[turn % d.patterns.length];
                const active = GROUPS.filter(n => living(n).length);
                const single = active.length ? active[Math.floor(rng() * active.length)] : 1;
                const groups = p.groups === 'all' ? GROUPS.slice() : p.groups === 'single' ? [single] : single === 3 ? [2, 3] : [single, single + 1];
                const speed = phase === 3 ? d.phase3_speed : phase === 2 ? d.phase2_speed : 1;
                pending = { id: p.pattern_id, name: { ko: p.name_kr, en: p.name_en }, groups, target: p.target, element: p.element,
                    mult: p.mult, at: ctx.t, until: round(ctx.t + p.cast_sec / speed), breakMax: Math.round(d.hp * p.break_hp_pct), breakNow: 0 };
                turn++;
                emit('raidWarning', clone(pending));
            }
            autoCommand();
            if (pending && ctx.t >= pending.until) {
                const hit = pending;
                pending = null;
                if (hit.breakMax) { failedBreaks++; emit('raidBreakFailed'); }
                emit('raidImpact', { id: hit.id, groups: hit.groups });
                const power = phase === 3 ? d.phase3_damage : phase === 2 ? d.phase2_damage : 1;
                for (const no of hit.groups) {
                    const alive = ctx.party.filter(u => u.group === no && u.hp > 0);
                    if (!alive.length || boss.hp <= 0) continue;
                    const duel = stateOf(boss, 'duel')?.[1];
                    const marked = alive.find(u => u.key === duel?.by);
                    const taunt = alive.find(u => stateOf(u, 'taunt'));
                    const front = alive.filter(u => u.rank === 0), pool = front.length ? front : alive;
                    const targets = hit.target === 'front' ? [marked ?? taunt ?? pool[Math.floor(rng() * pool.length)]] : alive;
                    for (const u of targets) {
                        if (boss.hp <= 0) break;
                        ctx.attack(boss, u, hit.mult * power, hit.element, `raid_${hit.id}`, { statMult: 1, spread: hit.target === 'all' });
                    }
                }
                nextAt = round(ctx.t + d.gap_sec);
            }
            hpBefore = boss.hp;
        }

        function afterTick(context) {
            ctx = context;
            const boss = ctx.enemies[0];
            if (pending?.breakMax) {
                pending.breakNow += Math.max(0, hpBefore - boss.hp);
                if (pending.breakNow >= pending.breakMax && boss.hp > 0) {
                    breaks++; pending = null; exposedUntil = round(ctx.t + d.expose_sec); nextAt = exposedUntil + d.gap_sec;
                    setBuff(boss, 'raid:exposed', 'dr_pct', -d.expose_bonus, exposedUntil);
                    emit('raidBreak', { until: exposedUntil });
                }
            }
            // Actual HP loss (exclude overkill) and effective healing, attributed to each party.
            const byKey = new Map(ctx.party.map(u => [u.key, u]));
            for (; cursor < ctx.timeline.length; cursor++) {
                const e = ctx.timeline[cursor], a = byKey.get(e.a), target = byKey.get(e.d);
                if (e.e === 'hit' || e.e === 'dot' || e.e === 'blast' || e.e === 'reflect' || e.e === 'pulse') {
                    const actual = Math.max(0, (e.dmg ?? 0) - (e.ov ?? 0) + (e.cull ?? 0));
                    if (a?.group && e.d === boss.key) commands[a.group - 1].dealt += actual;
                    if (target?.group) commands[target.group - 1].taken += actual;
                }
                if (e.e === 'heal' && a?.group) commands[a.group - 1].healed += Math.max(0, (e.dhp ?? 0) - (hpSeen.get(e.d) ?? e.dhp));
                const hpKey = e.d ?? e.u;
                if (hpKey && Number.isFinite(e.dhp)) hpSeen.set(hpKey, e.dhp);
            }
        }

        const rules = { kind: 'boss', partyScope: true, timeoutSec: d.timeout_sec, skipActor: u => u.key === 'e0',
            onStart(context) {
                ctx = context;
                for (const u of ctx.party) hpSeen.set(u.key, u.hp);
                Object.assign(ctx.enemies[0], { grade: 'chapter_boss', monsterId: d.monster_id,
                    monsterType: monsters[d.monster_id]?.monster_type ?? 'Normal', sin: chapters[d.chapter]?.sin ?? null, next: Infinity });
                hpBefore = ctx.enemies[0].hp;
                emit('raidStart', { id });
            }, beforeTick, afterTick };
        const engine = battle.createRun(party, null, rng, d.level, null, 0, [bossInput], null, null, null, rules);
        engine.advance(0);

        function view() {
            const boss = ctx.enemies[0];
            return { id, t: ctx.t, phase, auto: autoOn, ended: engine.ended, won: engine.result.won, reason: engine.result.reason,
                timeLimit: d.timeout_sec, boss: { hp: boss.hp, hpMax: boss.hpMax, monsterId: d.monster_id, exposedUntil },
                warning: pending ? clone(pending) : null, breaks, failedBreaks,
                parties: commands.map(c => ({ ...c, cooldown: Math.max(0, round(c.readyAt - ctx.t)),
                    alive: living(c.no).length, members: members(c.no).map(u => ({ key: u.key, uid: u.uid, hp: u.hp, hpMax: u.hpMax,
                        rank: u.rank, period: u.period, next: u.next, noBasic: u.noBasic, charges: u.charges ?? 0,
                        chan: u.chan ? { skill: u.chan.def.id, left: u.chan.left, interval: u.chan.iv, elapsed: u.chan.acc } : null,
                        skills: u.actives.map(a => ({ id: a.id, readyAt: a.readyAt, off: a.off })),
                        guard: (u.buffs['raid:guard']?.until ?? 0) > ctx.t, focus: (u.buffs['raid:focus']?.until ?? 0) > ctx.t,
                        buffs: Object.values(u.buffs).filter(b => !b.quiet).map(b => ({ s: b.s, until: Number.isFinite(b.until) ? b.until : null })) })) })),
            };
        }
        return { advance: until => engine.advance(until), command, setAuto: on => { autoOn = !!on; }, retreat: () => engine.abort(), view,
            result: engine.result, get time() { return ctx.t; }, get ended() { return engine.ended; } };
    }

    return { list: defs.map(d => clone(d)), entryState, readiness, snapshotParties, practiceTeams, createRun, commands: COMMANDS.slice() };
}
