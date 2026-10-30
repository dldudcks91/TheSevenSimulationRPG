/** Focused invariants for the raid orchestration; run by scripts/verify_raid.py. */
import { makeRng } from '../game_logic/rng.js';
import { createRaidSystem } from '../game_logic/raid.js';
import { createSkillRuntime } from '../game_logic/skill_runtime.js';

export function checkRaid(SYS, D) {
    const checks = [];
    const check = (name, fn) => {
        try { const value = fn(); checks.push({ name, ok: value !== false }); }
        catch (error) { checks.push({ name, ok: false, error: String(error.stack) }); }
    };
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const clone = value => JSON.parse(JSON.stringify(value));
    const teams = SYS.raid.practiceTeams('wrath');
    const deps = { battle: SYS.battle, arena: SYS.arena, game: SYS.game, monsters: D.monsters, chapters: D.chapters, balance: D.balance };
    const run = (seed = 1, party = teams, system = SYS.raid) => system.createRun(party, 'wrath', makeRng(seed));
    const override = changes => createRaidSystem({ ...deps,
        bosses: D.raidBosses.map(d => ({ ...d, ...changes })), patterns: D.raidPatterns, balance: D.balance });
    const completed = run(); completed.advance(Infinity);
    const v = completed.view(), timeline = completed.result.timeline;
    const groupOf = key => /^p\d+$/.test(key ?? '') ? Math.floor(Number(key.slice(1)) / 3) + 1 : null;

    check('three full parties and unique hero identities', () => teams.length === 3 && teams.every(t => t.length === 3)
        && new Set(teams.flat().map(p => p.uid)).size === 9);
    check('fixed practice roster is copied on every request', () => {
        const first = SYS.raid.practiceTeams('wrath'); first[0][0].combat.hp_max = 0;
        return SYS.raid.practiceTeams('wrath')[0][0].combat.hp_max > 0;
    });
    check('lab rosters vary with their seed and remain repeatable without touching the fixed fixture', () => {
        const first = SYS.raid.practiceTeams('wrath', 101), next = SYS.raid.practiceTeams('wrath', 202);
        return equal(first, SYS.raid.practiceTeams('wrath', 101)) && !equal(first, next)
            && equal(teams, SYS.raid.practiceTeams('wrath'))
            && [first, next].every(roster => roster.length === 3 && roster.every(p => p.length === 3)
                && new Set(roster.flat().map(p => p.uid)).size === 9 && roster.flat().every(p => p.combat.hp_max > 0));
    });
    check('combat leaves input snapshots untouched', () => {
        const before = JSON.stringify(teams), r = run(); r.advance(Infinity); return JSON.stringify(teams) === before;
    });
    check('boss metadata and anti-demon damage use the existing combat rules', () => {
        const round = timeline.find(e => e.e === 'round');
        if (round.kind !== 'boss' || round.enemies[0].monsterId !== 1900 || round.enemies[0].grade !== 'chapter_boss') return false;
        const p = clone(teams);
        p[0][0].actives = [];
        p[0][0].combat.option_fx = { ...(p[0][0].combat.option_fx ?? {}), vs: { demon: 1 } };
        const normal = createRaidSystem({ ...deps, monsters: { ...D.monsters, 1900: { ...D.monsters[1900], monster_type: 'Normal' } },
            bosses: D.raidBosses, patterns: D.raidPatterns });
        const damage = r => r.result.timeline.find(e => e.e === 'hit' && e.a === 'p0' && e.d === 'e0')?.dmg ?? 0;
        for (let seed = 1; seed <= 10; seed++) {
            const demonRun = run(seed, p), normalRun = run(seed, p, normal);
            demonRun.advance(5); normalRun.advance(5);
            if (!damage(normalRun)) continue;
            if (damage(demonRun) <= damage(normalRun)) throw new Error(JSON.stringify({ demon: damage(demonRun), normal: damage(normalRun) }));
            return true;
        }
        return false;
    });
    check('same seed produces identical timeline and result', () => {
        const r = run(); r.advance(Infinity); return equal(r.result, completed.result) && equal(r.view(), v);
    });
    check('frame chunking preserves the full result', () => {
        const r = run(); for (let t = 0; t < 200 && !r.ended; t += 0.137) r.advance(t);
        return equal(r.result, completed.result) && equal(r.view(), v);
    });
    check('duplicate heroes rejected', () => {
        const party = clone(teams); party[1][0].uid = party[0][0].uid;
        try { run(1, party); return false; } catch { return true; }
    });
    check('missing party rejected', () => { try { run(1, teams.slice(1)); return false; } catch { return true; } });
    check('healing skills stay within the caster party', () => timeline.filter(e => e.e === 'heal' && groupOf(e.a) && groupOf(e.d))
        .every(e => groupOf(e.a) === groupOf(e.d)));
    check('auras stay within their party', () => {
        const p = clone(teams);
        p[0][0].actives = [{ id: 'kni_defiance', source: 'innate' }];
        const r = run(1, p); r.advance(0);
        const aura = r.result.timeline.filter(e => e.e === 'buff' && e.s === 'kni_defiance');
        return aura.length === 3 && aura.every(e => groupOf(e.u) === 1);
    });
    check('summons enter the shared target pool while their allies remain party scoped', () => {
        // The removed wall skill is exercised with a hand-built summon effect, as in the runtime suite.
        for (const partyScope of [false, true]) {
            const caster = { key: 'p0', side: 'party', group: 1, hp: 200, hpMax: 200 };
            const other = { key: 'p3', side: 'party', group: 2, hp: 200, hpMax: 200 };
            const enemy = { key: 'e0', side: 'enemy', hp: 200, hpMax: 200 };
            const units = { party: [caster, other], enemies: [enemy] }, log = [];
            const rt = createSkillRuntime({ B: D.balance, units, partyScope, timeline: log, r1: n => n,
                makeSummon: u => ({ key: `wall:${u.key}`, side: u.side, group: u.group, hp: 160, hpMax: 160, summon: true }) });
            const effect = { id: 'test_wall', effect: 'summon', target: 'self', mult: 0.8, statMult: 1 };
            rt.castSummon(caster, effect, 3);
            rt.castSummon(enemy, effect, 3);
            const wall = units.party.find(u => u.key === 'wall:p0'), enemyWall = units.enemies.find(u => u.key === 'wall:e0');
            if (!wall || !enemyWall || units.party.length !== 3 || units.enemies.length !== 2) return false;
            if (!rt.foesOf(enemy).includes(wall) || !rt.foesOf(caster).includes(enemyWall) || !rt.alliesOf(caster).includes(wall)) return false;
            if (rt.alliesOf(other).includes(wall) !== !partyScope) return false;
            if (log.length !== 2 || log.some(e => e.e !== 'summon' || e.hpMax !== 160)) return false;
        }
        return true;
    });
    check('boss hits only announced lanes', () => {
        let targets = [], hits = 0;
        for (const e of timeline) {
            if (e.e === 'raidImpact') targets = e.groups;
            if (e.e === 'hit' && e.a === 'e0' && e.s?.startsWith('raid_')) {
                hits++; if (!targets.includes(groupOf(e.d))) return false;
            }
        }
        return hits > 0;
    });
    check('taunt and duel from another lane cannot redirect an announced hit', () => {
        const battle = { createRun(...args) {
            const rules = args[10], onStart = rules.onStart;
            rules.onStart = ctx => {
                onStart(ctx);
                ctx.enemies[0].buffs['qa:duel'] = { stat: 'duel', v: 1, by: 'p8', until: Infinity };
                ctx.party[8].buffs['qa:taunt'] = { stat: 'taunt', v: 1, by: 'p8', until: Infinity };
            };
            return SYS.battle.createRun(...args);
        } };
        const system = createRaidSystem({ ...deps, battle, bosses: D.raidBosses, patterns: D.raidPatterns });
        for (let seed = 1; seed <= 10; seed++) {
            const r = run(seed, teams, system); r.advance(7);
            const warning = r.result.timeline.find(e => e.e === 'raidWarning');
            if (warning.groups.includes(3)) continue;
            const hits = r.result.timeline.filter(e => e.e === 'hit' && e.a === 'e0');
            if (!hits.length) continue;
            if (!hits.every(e => warning.groups.includes(groupOf(e.d)))) throw new Error(JSON.stringify({ warning, hits }));
            return true;
        }
        return false;
    });
    check('raid tactics expose no controls, tuning fields or combat effects', () => {
        let tacticalBuff = false;
        const battle = { createRun(...args) {
            const rules = args[10], afterTick = rules.afterTick;
            rules.afterTick = ctx => {
                afterTick(ctx);
                tacticalBuff ||= ctx.party.some(u => ['raid:guard', 'raid:focus'].some(key => key in u.buffs));
            };
            return SYS.battle.createRun(...args);
        } };
        const system = createRaidSystem({ ...deps, battle, bosses: D.raidBosses, patterns: D.raidPatterns });
        const r = run(1, teams, system); r.advance(Infinity);
        const view = r.view();
        return !('commands' in system) && !('command' in r) && !('setAuto' in r) && !('auto' in view) && !tacticalBuff
            && D.raidBosses.every(d => Object.keys(d).every(key => !/^(command_|guard_|focus_|support_|auto_guard_)/.test(key)))
            && r.result.timeline.every(e => e.e !== 'raidCommand' && e.s !== 'raid_support')
            && view.parties.every(p => ['uses', 'active', 'until', 'readyAt', 'cooldown'].every(key => !(key in p))
                && p.members.every(u => !('guard' in u) && !('focus' in u)));
    });
    check('cast breaks suppress that heavy impact', () => {
        let broken = false;
        for (const e of timeline) {
            if (e.e === 'raidWarning') broken = false;
            if (e.e === 'raidBreak') broken = true;
            if (e.e === 'raidImpact' && broken) return false;
        }
        return v.breaks > 0;
    });
    check('failed cast breaks resolve the heavy raid-wide attack', () => {
        const p = clone(teams);
        for (const u of p.flat()) {
            u.actives = []; u.combat.hp_max *= 2; u.combat.hp_regen = 0;
            u.combat.atk_physical = { min: 1, max: 1 }; u.combat.atk_magic = { min: 1, max: 1 };
            u.combat.option_fx = null; u.combat.mastery_cond = null;
        }
        const r = run(1, p); r.advance(Infinity);
        return r.view().failedBreaks > 0 && r.result.timeline.some(e => e.e === 'raidImpact' && e.id === 'cataclysm');
    });
    check('timeout occurs exactly on its configured tick', () => {
        const r = run(1, teams, override({ timeout_sec: 1 })); r.advance(Infinity);
        return r.view().reason === 'timeout' && r.view().t === 1 && !r.view().won;
    });
    check('wipe terminates and one fallen party does not end the raid', () => {
        const fragile = clone(teams); fragile[0].forEach(p => { p.combat.hp_max = 1; p.combat.hp_regen = 0; p.actives = []; });
        const r = run(2, fragile, override({ damage_min: 10000, damage_max: 10000 })); r.advance(Infinity);
        const downs = r.result.timeline.filter(e => e.e === 'down' && groupOf(e.u));
        return r.view().reason === 'wipe' && downs.length >= 9 && downs[0].t < r.view().t;
    });
    check('combat phases and result totals remain finite', () => v.phase === 3 && v.parties.every(p => [p.dealt, p.healed, p.taken].every(Number.isFinite))
        && v.parties.reduce((n, p) => n + p.dealt, 0) <= v.boss.hpMax);
    check('finished raids ignore further advances', () => {
        const before = JSON.stringify(completed.result); completed.advance(Infinity);
        return before === JSON.stringify(completed.result);
    });
    const need = D.raidBosses.find(d => d.raid_id === 'wrath').unlock_level;
    check(`entry stays locked below level ${need} and opens exactly at level ${need}`, () => {
        const g = { heroes: [{ level: need - 1 }, { level: 1 }] }, before = JSON.stringify(g);
        if (!equal(SYS.raid.entryState(g, 'wrath'), { open: false, have: need - 1, need, err: 'level' }) || JSON.stringify(g) !== before) return false;
        g.heroes[1].level = need;
        return equal(SYS.raid.entryState(g, 'wrath'), { open: true, have: need, need, err: null });
    });
    check('empty rosters remain level locked', () => equal(SYS.raid.entryState({ heroes: [] }, 'wrath'), { open: false, have: 0, need, err: 'level' }));
    check('entry level is read from the encounter data', () => {
        const system = override({ unlock_level: need - 1 });
        return system.entryState({ heroes: [{ level: need - 1 }] }, 'wrath').open;
    });
    check('invalid unlock levels are rejected', () => [0, -1, need + 0.5, D.balance.hero_level_cap + 1, undefined].every(unlock_level => {
        try { override({ unlock_level }); return false; } catch { return true; }
    }));
    check('new saves report the real-party level requirement independently of lab practice', () => {
        const heroes = SYS.hero.rollCandidates(makeRng(77), 3), g = SYS.game.newGame(77, heroes, 0);
        return SYS.raid.entryState(g, 'wrath').err === 'level' && SYS.raid.readiness(g, 'wrath').err === 'level';
    });
    check('reaching the entry level keeps the own-party Hell clear requirement', () => {
        const heroes = SYS.hero.rollCandidates(makeRng(78), 3), g = SYS.game.newGame(78, heroes, 0);
        g.heroes[0].level = need;
        return SYS.raid.entryState(g, 'wrath').open && SYS.raid.readiness(g, 'wrath').err === 'locked';
    });
    const ownState = () => {
        let g = SYS.game.newGame(81, SYS.hero.rollCandidates(makeRng(81), 9), 0);
        for (const b of SYS.construction.list) g.buildings[b.id] = b.maxRank;
        g = SYS.game.deserialize(SYS.game.serialize(g, 0));
        g.presets.slice(0, 3).forEach((p, i) => {
            p.party = g.heroes.slice(i * 3, i * 3 + 3).map(h => h.uid);
            p.formation.ranks = [p.party.slice(0, 1), p.party.slice(1)];
        });
        g.progress.clearedIn.hell = [SYS.game.chapterGate(2)];
        g.heroes[0].level = need;
        return g;
    };
    check('Hell clear opens three full own parties and snapshots actual combat values', () => {
        const g = ownState(), before = JSON.stringify(g);
        if (!SYS.raid.readiness(g, 'wrath').ok) return false;
        const snapshot = SYS.raid.snapshotParties(g);
        const expected = SYS.game.heroCombat(g, g.heroes[3], g.presets[1].party, 2);
        const r = run(1, snapshot); r.advance(4);
        return equal(snapshot[1][0].combat, expected) && r.view().parties.length === 3 && JSON.stringify(g) === before;
    });
    check('own parties reject duplicates and expedition or exploration occupancy', () => {
        const g = ownState();
        g.presets[1].party[0] = g.presets[0].party[0];
        if (SYS.raid.readiness(g, 'wrath').err !== 'duplicate') return false;
        g.presets[1].party[0] = g.heroes[3].uid;
        g.runs[0] = { ...g.runs[0], auto: true };
        if (SYS.raid.readiness(g, 'wrath').err !== 'running') return false;
        g.runs[0] = null; g.explores.push({ preset: 2, heroes: g.presets[1].party.slice() });
        return SYS.raid.readiness(g, 'wrath').err === 'exploring';
    });
    check('retreat finishes at the current time and cannot emit duplicate end events', () => {
        const r = run(); r.advance(3.7); r.retreat(); r.retreat();
        return r.ended && r.view().reason === 'retreat' && r.view().t === 3.7 && r.result.timeline.filter(e => e.e === 'end').length === 1;
    });
    return { checks, passed: checks.filter(c => c.ok).length, total: checks.length };
}

export function calibrateRaid(SYS, D) {
    const teams = SYS.raid.practiceTeams('wrath'), rows = [];
    for (const damage of [1, 1.15, 1.25, 1.35]) {
        const system = createRaidSystem({ battle: SYS.battle, arena: SYS.arena, game: SYS.game, monsters: D.monsters, chapters: D.chapters,
            bosses: D.raidBosses.map(d => ({ ...d, damage_min: d.damage_min * damage, damage_max: d.damage_max * damage })), patterns: D.raidPatterns, balance: D.balance });
        const results = [];
        for (let seed = 1; seed <= 20; seed++) {
            const r = system.createRun(teams, 'wrath', makeRng(seed)); r.advance(Infinity); results.push(r.view());
        }
        rows.push({ damage, wins: results.filter(v => v.won).length, n: results.length,
            meanSeconds: results.reduce((n, v) => n + v.t, 0) / results.length,
            meanSurvivors: results.reduce((n, v) => n + v.parties.reduce((n, p) => n + p.alive, 0), 0) / results.length,
            breaks: results.reduce((n, v) => n + v.breaks, 0) / results.length });
    }
    return rows;
}
