/** Raid battlefield renderer. Rules and clocks belong to SYS.raid; this layer reads snapshots. */
import { makeRng, deriveSeed } from '../game_logic/rng.js';
import { t, L } from './i18n.js';
import * as M from './mock.js';
import { D, monsterName, monsterFace, skillInfo } from './data.js';
import { skillFxOn, basicFxOn, hitFxOn, lungeFxOn, shakeLevel, fxTransparency, SPEED_K } from './fx.js';

const node = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};
const fmt = n => Math.round(n).toLocaleString();
const clock = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const percent = (n, max) => Math.min(100, Math.max(0, max > 0 ? n / max * 100 : 0));
const button = (cls, label, fn) => {
    const b = node('button', `btn ${cls}`, label);
    b.type = 'button'; b.onclick = fn;
    return b;
};
const meter = cls => {
    const wrap = node('span', cls), fill = node('i');
    wrap.append(fill);
    return { wrap, fill };
};
const setText = (n, value) => { if (n.textContent !== value) n.textContent = value; };
const setMeter = (meter, value) => {
    const fraction = Math.max(0, Math.min(1, value));
    if (meter.value === fraction) return;
    meter.value = fraction;
    meter.fill.style.setProperty('--raid-fill', String(fraction));
};
// Ten units share a busy battlefield. Reuse small marks instead of spawning the
// ordinary viewer's layered skill artwork and filter animations for every event.
const marks = host => {
    const hit = node('span', 'raid-hit-mark'), aid = node('span', 'raid-aid-mark');
    hit.setAttribute('aria-hidden', 'true'); aid.setAttribute('aria-hidden', 'true');
    host.append(hit, aid);
    return { hit, aid };
};
const floats = () => {
    const host = node('div', 'raid-floats'); host.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) host.append(node('span', 'raid-float'));
    return host;
};

export function createRaidSession(owner, id = 'wrath') {
    return { owner, id, source: 'practice', practiceSeed: crypto.getRandomValues(new Uint32Array(1))[0], run: null, teams: null, auto: true, paused: false, speed: 1, attempt: 0, expanded: false };
}

export function mountRaid(main, { session: s, system, game, onHelp, canPlay = () => true }) {
    const d = system.list.find(d => d.raid_id === s.id) ?? system.list[0];
    let ready = system.readiness(game, d.raid_id);
    let frame = 0, disposed = false, previousAt = null, eventCursor = 0, lastWarning = null, finished = false, targetTime = s.run?.time ?? 0, paintedAt = -1;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const keyToCard = new Map(), motions = new Map();
    const skillNames = new Map(), floatCursor = new WeakMap();
    const skillName = id => { if (!skillNames.has(id)) skillNames.set(id, L(skillInfo(id).name)); return skillNames.get(id); };
    function motion(n, channel, frames, duration) {
        if (reducedMotion.matches || !n?.isConnected) return;
        let channels = motions.get(n);
        if (!channels) motions.set(n, channels = new Map());
        channels.get(channel)?.cancel();
        const animation = n.animate(frames, { duration: duration * (SPEED_K[s.speed] ?? 1), easing: 'ease-out' });
        channels.set(channel, animation);
        const clear = () => {
            if (channels.get(channel) === animation) channels.delete(channel);
            if (!channels.size && motions.get(n) === channels) motions.delete(n);
        };
        animation.onfinish = animation.oncancel = clear;
        if (s.paused) animation.pause();
    }
    function pulse(n, kind, skill = false) {
        const playing = motions.get(n)?.get('pulse');
        if (playing && playing.currentTime < 60 * (SPEED_K[s.speed] ?? 1)) return;
        n.dataset.kind = kind;
        const alpha = skill ? 1 - fxTransparency() / 100 : 1;
        motion(n, 'pulse', [{ opacity: .9 * alpha, scale: '.75' }, { opacity: 0, scale: '1.35' }], 260);
    }
    const onVisibility = () => { previousAt = null; };
    document.addEventListener('visibilitychange', onVisibility);
    const root = node('section', 'page raid-page');
    root.setAttribute('aria-label', t('nav.raid'));
    const head = node('header', 'raid-header');
    const heading = node('div', 'raid-heading');
    heading.append(node('span', 'raid-eyebrow', t('raid.eyebrow')), node('h1', '', L(monsterName(d.monster_id))));
    const badge = node('span', 'raid-trial', t('raid.trial'));
    const controls = node('div', 'raid-controls');
    const source = node('div', 'raid-source');
    const practice = button('', t('raid.practice'), () => selectSource('practice'));
    const own = button('', t('raid.own'), () => selectSource('own'));
    practice.dataset.raidSource = 'practice'; own.dataset.raidSource = 'own';
    source.append(practice, own);
    const reroll = button('', t('raid.reroll'), () => {
        if (s.run && !s.run.ended) return;
        s.practiceSeed = deriveSeed(s.practiceSeed, 1);
        selectSource('practice');
    });
    reroll.dataset.raidReroll = '';
    const auto = button('', '', () => { s.auto = !s.auto; s.run?.setAuto(s.auto); paint(); });
    auto.dataset.raidAuto = '';
    const pause = button('', '', () => { s.paused = !s.paused; previousAt = null; paint(); });
    pause.dataset.raidPause = '';
    const speed = button('', '', () => { s.speed = s.speed === 1 ? 2 : s.speed === 2 ? 4 : 1; paint(); });
    speed.dataset.raidSpeed = '';
    const retreat = button('', t('raid.retreat'), () => { s.run?.retreat(); paint(); });
    retreat.dataset.raidRetreat = '';
    const expand = button('', t('raid.expand'), () => {
        s.expanded = !s.expanded;
        main.closest('#app')?.classList.toggle('raid-expanded', s.expanded);
        expand.textContent = t(s.expanded ? 'raid.shrink' : 'raid.expand');
    });
    const help = button('', '?', onHelp);
    help.setAttribute('aria-label', t('raid.help'));
    controls.append(source, reroll, auto, pause, speed, retreat, expand, help);
    head.append(heading, badge, controls);
    root.append(head);
    const announcer = node('span', 'raid-sr-only');
    announcer.setAttribute('aria-live', 'polite'); root.append(announcer);

    const battlefield = node('div', 'raid-field');
    battlefield.style.setProperty('--raid-scene', `url("${new URL(M.stageBg(d.chapter * 100 + 5), document.baseURI).href}")`);
    const front = node('div', 'raid-front');
    const bossHud = node('div', 'raid-boss-hud');
    const bossMeta = node('div', 'raid-boss-meta');
    const phaseLabel = node('b'), bossHealth = node('span'), timeLabel = node('span');
    bossMeta.append(phaseLabel, bossHealth, timeLabel);
    const bossHp = meter('raid-boss-hp');
    const markers = node('div', 'raid-phase-markers');
    for (const threshold of [d.phase2_hp, d.phase3_hp]) {
        const mark = node('i'); mark.style.left = `${threshold * 100}%`; markers.append(mark);
    }
    bossHp.wrap.append(markers);
    bossHud.append(bossMeta, bossHp.wrap);
    const boss = node('div', 'raid-boss');
    const bossBody = node('div', 'raid-boss-body');
    const bossSprite = node('div', 'sprite raid-boss-sprite');
    const art = node('img', 'raid-boss-art');
    art.src = monsterFace(d.monster_id); art.alt = L(monsterName(d.monster_id));
    const ring = node('div', 'raid-boss-ring'); ring.setAttribute('aria-hidden', 'true');
    const bossState = node('span', 'raid-boss-state');
    const bossFloats = floats(), bossMarks = marks(bossBody);
    bossSprite.append(art); bossBody.append(bossSprite); boss.append(ring, bossBody, bossState, bossFloats);
    const bossFxUnit = { key: 'e0', side: 'enemy', node: bossBody, ...bossMarks };
    const leftSeal = node('div', 'raid-seal left'), rightSeal = node('div', 'raid-seal right');
    leftSeal.textContent = 'I'; rightSeal.textContent = 'III';
    leftSeal.setAttribute('aria-hidden', 'true'); rightSeal.setAttribute('aria-hidden', 'true');
    front.append(leftSeal, boss, rightSeal, bossHud);
    battlefield.append(front);

    const telegraph = node('div', 'raid-telegraph');
    telegraph.setAttribute('role', 'group');
    const warningTitle = node('b'), warningTarget = node('span'), warningTime = node('strong');
    const castBar = meter('raid-cast-bar');
    const warningTop = node('div', 'raid-warning-top');
    warningTop.append(warningTitle, warningTarget, warningTime);
    const breakRow = node('div', 'raid-break-row');
    const breakText = node('span'), breakBar = meter('raid-break-bar');
    breakRow.append(breakText, breakBar.wrap);
    telegraph.append(warningTop, castBar.wrap, breakRow);
    battlefield.append(telegraph);

    const laneRow = node('div', 'raid-lanes'), laneViews = [];
    for (const no of [1, 2, 3]) {
        const lane = node('section', 'raid-lane'); lane.dataset.raidParty = String(no);
        const laneHead = node('div', 'raid-lane-head');
        const title = node('h2', '', t(`raid.lane.${no}`));
        const targeted = node('span', 'raid-lane-target');
        laneHead.append(title, targeted);
        const heroes = node('div', 'raid-heroes');
        const commands = node('div', 'raid-commands');
        const commandButtons = system.commands.map(kind => {
            const b = button(`raid-cmd raid-${kind}`, t(`raid.command.${kind}`), () => {
                s.run?.command(no, kind); paint();
            });
            b.dataset.raidCommand = `${no}:${kind}`;
            b.title = t(`raid.effect.${kind}`, { pct: Math.round((kind === 'guard' ? d.guard_pct : kind === 'focus' ? d.focus_pct : d.support_pct) * 100), sec: kind === 'guard' ? d.guard_sec : d.focus_sec });
            commands.append(b);
            return { b, kind };
        });
        const contribution = node('div', 'raid-contribution');
        lane.append(laneHead, heroes, commands, contribution);
        laneRow.append(lane);
        laneViews.push({ no, lane, heroes, targeted, commandButtons, contribution, cards: [] });
    }
    battlefield.append(laneRow);
    const footer = node('footer', 'raid-footer');
    const status = node('span', 'raid-readiness');
    const start = button('primary raid-start', '', () => startRun()); start.dataset.raidStart = '';
    const encounterNote = node('span', 'raid-encounter-note', t('raid.bossOnly'));
    footer.append(status, encounterNote, start);
    battlefield.append(footer);
    root.append(battlefield);
    const log = node('div', 'raid-feed');
    log.setAttribute('aria-label', t('raid.log'));
    root.append(log);
    const report = node('div', 'raid-result'); report.hidden = true;
    report.setAttribute('role', 'region'); report.setAttribute('aria-label', t('raid.results'));
    root.append(report);
    main.append(root);
    main.closest('#app')?.classList.toggle('raid-expanded', s.expanded);

    function selectSource(which) {
        if (s.run && !s.run.ended) return;
        s.source = which; s.run = null; s.teams = null;
        ready = system.readiness(game, d.raid_id);
        report.hidden = true; finished = false; eventCursor = 0; log.replaceChildren();
        makeCards(); paint();
    }

    function previewTeams() {
        if (s.teams) return s.teams;
        if (s.source === 'practice') s.teams = system.practiceTeams(d.raid_id, s.practiceSeed);
        else s.teams = [1, 2, 3].map(no => {
            const p = game.presets[no - 1];
            if (!p?.party.length) return [];
            // Partial parties are displayed before they meet the entry condition.
            const heroes = p.party.map(uid => game.heroes.find(h => h.uid === uid)).filter(Boolean);
            return heroes.map(h => ({ uid: h.uid, hero: h, rank: p.formation?.ranks?.[1]?.includes(h.uid) ? 1 : 0 }));
        });
        return s.teams;
    }

    function makeCards() {
        for (const channels of motions.values()) for (const animation of channels.values()) animation.cancel();
        motions.clear();
        const teams = previewTeams();
        const currentUnits = new Map((s.run?.view().parties ?? []).flatMap(p => p.members.map(u => [u.uid, u])));
        keyToCard.clear();
        for (const v of laneViews) {
            v.heroes.replaceChildren(); v.cards = [];
            const team = teams[v.no - 1];
            // Keep the front rank above the rear rank, preserving each hero's original combat key.
            for (const p of [...team].sort((a, b) => a.rank - b.rank)) {
                const card = node('div', `raid-hero rank-${p.rank ?? 0}`); card.dataset.raidHero = p.uid;
                const seat = node('div', 'raid-hero-seat');
                const portrait = node('img', 'sprite');
                const face = M.heroFace(p.hero); if (face) portrait.src = face;
                portrait.alt = L(p.hero.name);
                const label = node('b', 'raid-hero-name', L(p.hero.name));
                const rank = node('span', 'raid-hero-rank', t(p.rank ? 'raid.rear' : 'raid.front'));
                const hp = meter('raid-hero-hp'), hpText = node('span', 'raid-hero-hp-text');
                const action = meter('raid-hero-action');
                const skillRow = node('div', 'raid-hero-skills');
                for (const a of p.actives ?? []) {
                    const info = skillInfo(a.id), image = node('img');
                    image.src = M.skillIcon(a.id); image.alt = L(info.name); image.title = L(info.name);
                    skillRow.append(image);
                }
                const stateLabel = node('span', 'raid-hero-state');
                const numbers = floats(), cardMarks = marks(card);
                card.append(portrait, label, rank, hp.wrap, hpText, action.wrap, skillRow, stateLabel, numbers);
                card.title = `${L(p.hero.name)} · ${L(D.classes.find(c => c.id === p.hero.cls))} · Lv.${p.hero.level}`;
                seat.append(card); v.heroes.append(seat);
                const current = currentUnits.get(p.uid);
                const view = { uid: p.uid, card, hp, hpText, action, stateLabel, floats: numbers, portrait,
                    lastHp: current?.hp ?? p.combat?.hp_max ?? 0, lastSkill: '', castUntil: 0,
                    fxUnit: { key: current?.key ?? `p${(v.no - 1) * 3 + team.indexOf(p)}`, side: 'party', node: card, ...cardMarks } };
                v.cards.push(view); keyToCard.set(view.fxUnit.key, view);
            }
            for (let i = team.length; i < 3; i++) v.heroes.append(node('div', 'raid-hero empty', '+'));
        }
    }

    function startRun() {
        if (!canPlay() || s.run && !s.run.ended) return;
        if (s.source === 'own' && !system.readiness(game, d.raid_id).ok) return;
        s.teams = s.source === 'practice' ? previewTeams() : system.snapshotParties(game);
        s.run = system.createRun(s.teams, d.raid_id, makeRng(deriveSeed(d.demo_seed, ++s.attempt)), { auto: s.auto });
        s.paused = false; previousAt = null; targetTime = 0; paintedAt = -1; eventCursor = s.run.result.timeline.length; finished = false; lastWarning = null;
        report.hidden = true; log.replaceChildren(); makeCards(); paint();
        addFeed(t('raid.started'));
    }

    function addFeed(text, cls = '') {
        const line = node('span', cls, text);
        log.prepend(line);
        while (log.children.length > 4) log.lastChild.remove();
    }

    function float(target, value, heal = false, crit = false) {
        if (reducedMotion.matches) return;
        const i = floatCursor.get(target) ?? 0, n = target.children[i];
        floatCursor.set(target, (i + 1) % target.children.length);
        n.className = `raid-float${heal ? ' heal' : ''}${crit ? ' crit' : ''}`;
        setText(n, `${heal ? '+' : '−'}${fmt(value)}`);
        motion(n, 'number', [{ opacity: 1, transform: 'translate(-50%, 0)' }, { opacity: 0, transform: 'translate(-50%, -44px)' }], 900);
    }

    function applyEvents() {
        const events = s.run.result.timeline;
        const attacks = new Map(), reactions = new Map(), hits = new Map(), aids = new Map(), numbers = new Map();
        let bossDamage = 0, crit = false;
        for (; eventCursor < events.length; eventCursor++) {
            const e = events[eventCursor];
            const targetCard = keyToCard.get(e.d ?? e.u), sourceCard = keyToCard.get(e.a);
            const targetFx = e.d === 'e0' || e.u === 'e0' ? bossFxUnit : targetCard?.fxUnit;
            const sourceFx = e.a === 'e0' ? bossFxUnit : sourceCard?.fxUnit;
            if (e.e === 'hit') {
                if (sourceFx?.side === 'party') attacks.set(sourceFx.key, sourceFx.node.parentElement);
                if (targetFx) reactions.set(targetFx.key, { unit: targetFx, crit: e.crit || reactions.get(targetFx.key)?.crit });
                if (targetFx && (e.s ? skillFxOn() : basicFxOn())) {
                    const previous = hits.get(targetFx.key)?.e;
                    if (!previous || e.s && !previous.s || !!e.s === !!previous.s && e.crit)
                        hits.set(targetFx.key, { unit: targetFx, e });
                }
                if (e.d === 'e0') { bossDamage += e.dmg - (e.ov ?? 0); crit ||= e.crit; }
                else {
                    const card = keyToCard.get(e.d);
                    if (card) {
                        const value = numbers.get(card) ?? { dmg: 0, healed: 0, crit: false };
                        value.dmg += e.dmg; value.crit ||= e.crit; numbers.set(card, value);
                    }
                }
            }
            if (e.e === 'heal') {
                const healed = targetCard ? Math.max(0, e.dhp - targetCard.lastHp) : 0;
                if (healed > 0) {
                    const value = numbers.get(targetCard) ?? { dmg: 0, healed: 0, crit: false };
                    value.healed += healed; numbers.set(targetCard, value);
                    if (e.s && targetFx) aids.set(targetFx.key, { unit: targetFx, kind: 'heal' });
                }
            }
            if (e.e === 'buff' && e.s && e.until !== null && targetFx && !aids.has(targetFx.key))
                aids.set(targetFx.key, { unit: targetFx, kind: e.k || (e.v ?? 0) < 0 ? 'debuff' : 'buff' });
            if (e.e === 'dodge' || e.e === 'evade') {
                if (sourceFx?.side === 'party') attacks.set(sourceFx.key, sourceFx.node.parentElement);
                if (targetFx && hitFxOn()) motion(targetFx.node, 'reaction', [{ translate: '0 0' }, { translate: '12px 0', offset: .35 }, { translate: '0 0' }], 260);
            }
            if (e.e === 'skill') {
                const card = keyToCard.get(e.u);
                if (card) { card.lastSkill = skillName(e.s); card.castUntil = e.t + 1.2; }
            }
            if (targetCard && Number.isFinite(e.dhp)) targetCard.lastHp = e.dhp;
            if (e.e === 'raidWarning') addFeed(`${clock(e.t)} · ${L(e.name)} · ${e.groups.map(n => M.roman(n)).join(' + ')}`);
            if (e.e === 'raidBreak') addFeed(t('raid.breakSuccess'), 'success');
            if (e.e === 'raidBreakFailed') addFeed(t('raid.breakFail'), 'danger');
            if (e.e === 'raidPhase') addFeed(t('raid.phaseChange', { n: e.phase }), 'danger');
            if (e.e === 'raidCommand') addFeed(t('raid.commandLog', { n: M.roman(e.no), command: t(`raid.command.${e.kind}`) }));
        }
        if (lungeFxOn()) for (const seat of attacks.values())
            motion(seat, 'lunge', [{ translate: '0 0' }, { translate: '0 -9px', offset: .35 }, { translate: '0 0' }], 240);
        if (hitFxOn()) for (const { unit, crit } of reactions.values()) {
            const px = unit.side === 'enemy' ? (crit ? [0, 4, 7, 12] : [0, 2, 4, 8])[shakeLevel()] : crit ? 7 : 4;
            if (px) motion(unit.node, 'reaction', [{ translate: '0 0' }, { translate: `${-px}px 0`, offset: .2 },
                { translate: `${px}px 0`, offset: .45 }, { translate: `${-px / 2}px 0`, offset: .7 }, { translate: '0 0' }], crit ? 320 : 220);
            // The hit mark provides the flash without rerasterizing the portrait.
            if (!hits.has(unit.key)) pulse(unit.hit, crit ? 'crit' : 'physical');
        }
        for (const { unit, e } of hits.values()) pulse(unit.hit, e.crit ? 'crit' : e.ty ?? 'physical', !!e.s);
        if (skillFxOn()) for (const { unit, kind } of aids.values()) pulse(unit.aid, kind, true);
        for (const [card, value] of numbers) {
            if (value.dmg) float(card.floats, value.dmg, false, value.crit);
            if (value.healed) float(card.floats, value.healed, true);
        }
        if (bossDamage) {
            float(bossFloats, bossDamage, false, crit);
        }
    }

    function showReport(v) {
        if (finished) return;
        ready = system.readiness(game, d.raid_id);
        finished = true; report.hidden = false; report.replaceChildren();
        const panel = node('div', 'raid-result-panel');
        panel.append(node('span', 'raid-eyebrow', t('raid.trial')), node('h2', v.won ? 'success' : 'danger', t(v.won ? 'raid.victory' : v.reason === 'timeout' ? 'raid.timeout' : v.reason === 'retreat' ? 'raid.retreated' : 'raid.defeat')),
            node('div', 'raid-result-summary', t('raid.resultSummary', { time: clock(v.t), n: v.parties.reduce((n, p) => n + p.alive, 0), breaks: v.breaks, failed: v.failedBreaks })));
        const rows = node('div', 'raid-result-rows');
        for (const p of v.parties) {
            const row = node('div');
            row.append(node('b', '', t(`raid.lane.${p.no}`)), node('span', '', t('raid.damageValue', { n: fmt(p.dealt) })),
                node('span', '', t('raid.healValue', { n: fmt(p.healed) })), node('span', '', t('raid.aliveValue', { n: p.alive })),
                node('span', '', t('raid.commandValue', { n: p.uses })));
            rows.append(row);
        }
        panel.append(rows);
        const actions = node('div', 'raid-result-actions');
        const retry = button('primary', t('raid.retry'), () => startRun()); retry.dataset.raidRetry = '';
        actions.append(button('', t('raid.reviewField'), () => { report.hidden = true; }), retry);
        panel.append(actions); report.append(panel);
    }

    function paint(v = s.run?.view()) {
        if (v?.ended && !finished) ready = system.readiness(game, d.raid_id);
        const active = !!v && !v.ended;
        practice.classList.toggle('on', s.source === 'practice'); own.classList.toggle('on', s.source === 'own');
        practice.disabled = own.disabled = active;
        reroll.hidden = s.source !== 'practice'; reroll.disabled = active;
        setText(auto, t(s.auto ? 'raid.autoOn' : 'raid.autoOff')); auto.classList.toggle('on', s.auto); auto.setAttribute('aria-pressed', String(s.auto));
        setText(pause, t(s.paused ? 'raid.resume' : 'raid.pause')); pause.disabled = !active;
        retreat.disabled = !active;
        setText(speed, `×${s.speed}`); speed.setAttribute('aria-label', t('raid.speed', { n: s.speed }));
        setText(start, t(!v ? 'raid.start' : v.ended ? 'raid.retry' : s.paused ? 'raid.paused' : 'raid.fighting'));
        start.disabled = active || s.source === 'own' && !ready.ok;
        setText(status, s.source === 'practice' ? t('raid.practiceReady') : ready.ok ? t('raid.ownReady') : t(`raid.err.${ready.err}`, { chapter: d.chapter, ...system.entryState(game, d.raid_id) }));
        status.classList.toggle('locked', s.source === 'own' && !ready.ok);
        setMeter(bossHp, percent(v?.boss.hp ?? d.hp, v?.boss.hpMax ?? d.hp) / 100);
        setText(bossHealth, `${fmt(v?.boss.hp ?? d.hp)} / ${fmt(v?.boss.hpMax ?? d.hp)}`);
        setText(phaseLabel, t('raid.phase', { n: v?.phase ?? 1 }));
        setText(timeLabel, `${clock(v?.t ?? 0)} / ${clock(d.timeout_sec)}`);
        boss.classList.toggle('exposed', (v?.boss.exposedUntil ?? 0) > (v?.t ?? 0));
        boss.classList.toggle('fallen', v?.boss.hp === 0);
        setText(bossState, (v?.boss.exposedUntil ?? 0) > (v?.t ?? 0) ? t('raid.exposed') : v?.phase === 3 ? t('raid.enraged') : '');
        const warning = v?.warning;
        root.classList.toggle('has-warning', !!warning); root.classList.toggle('raid-paused', s.paused);
        telegraph.classList.toggle('breakable', !!warning?.breakMax);
        setText(warningTitle, warning ? L(warning.name) : !v ? t('raid.awaiting') : v.boss.exposedUntil > v.t ? t('raid.breakSuccess') : v.ended ? t('raid.finished') : t('raid.nextAttack'));
        setText(warningTarget, warning ? t('raid.target', { parties: warning.groups.map(n => M.roman(n)).join(' + ') }) : t('raid.threeParties'));
        setText(warningTime, warning ? `${Math.max(0, warning.until - v.t).toFixed(1)}s` : '');
        setMeter(castBar, warning ? percent(v.t - warning.at, warning.until - warning.at) / 100 : 0);
        breakRow.hidden = !warning?.breakMax;
        if (warning?.breakMax) {
            setText(breakText, t('raid.breakProgress', { n: fmt(warning.breakNow), max: fmt(warning.breakMax) }));
            setMeter(breakBar, percent(warning.breakNow, warning.breakMax) / 100);
        }
        // Avoid live-region announcements on every animation frame.
        if (lastWarning !== warning?.id) {
            lastWarning = warning?.id;
            const text = warningTitle.textContent + ' ' + warningTarget.textContent;
            telegraph.setAttribute('aria-label', text); announcer.textContent = text;
        }
        for (const lane of laneViews) {
            const p = v?.parties[lane.no - 1], targeted = !!warning?.groups.includes(lane.no);
            lane.lane.classList.toggle('targeted', targeted); lane.lane.classList.toggle('broken', !!p && !p.alive);
            setText(lane.targeted, targeted ? t('raid.targeted') : p ? t('raid.aliveValue', { n: p.alive }) : t('raid.ready'));
            setText(lane.contribution, p ? `${t('raid.damageValue', { n: fmt(p.dealt) })} · ${t('raid.healValue', { n: fmt(p.healed) })}` : t('raid.partySize'));
            for (const { b, kind } of lane.commandButtons) {
                const supportReady = kind !== 'support' || v?.parties.some(other => other.no !== lane.no && other.members.some(u => u.hp > 0 && u.hp < u.hpMax));
                b.disabled = !active || !p?.alive || p.cooldown > 0 || s.paused || !supportReady;
                setText(b, `${t(`raid.command.${kind}`)}${p?.cooldown > 0 ? ` ${Math.ceil(p.cooldown)}s` : ''}`);
                b.setAttribute('aria-label', `${t(`raid.lane.${lane.no}`)} · ${b.textContent}`);
                b.classList.toggle('active', p?.active === kind && p.until > v.t);
            }
            for (const card of lane.cards) {
                const u = p?.members.find(u => u.uid === card.uid);
                setMeter(card.hp, u ? percent(u.hp, u.hpMax) / 100 : 1);
                setText(card.hpText, u ? `${fmt(u.hp)} / ${fmt(u.hpMax)}` : '');
                let progress = u ? 1 - u.next / u.period : 0;
                if (u?.chan) progress = u.chan.elapsed / u.chan.interval;
                setMeter(card.action, progress);
                card.card.classList.toggle('down', u?.hp === 0); card.card.classList.toggle('guarding', !!u?.guard); card.card.classList.toggle('focusing', !!u?.focus);
                setText(card.stateLabel, u?.hp === 0 ? t('raid.downed') : u?.guard ? t('raid.command.guard') : u?.focus ? t('raid.command.focus')
                    : u?.chan ? skillName(u.chan.skill) : (v?.t ?? 0) < card.castUntil ? card.lastSkill : '');
            }
        }
        for (const channels of motions.values()) for (const animation of channels.values()) {
            if (s.paused && animation.playState === 'running') animation.pause();
            else if (!s.paused && animation.playState === 'paused') animation.play();
        }
        if (v?.ended) showReport(v);
    }

    function tick(at) {
        if (disposed) return;
        if (previousAt !== null && s.run && !s.run.ended && !s.paused && !document.hidden && canPlay()) {
            const elapsed = Math.min(0.25, Math.max(0, (at - previousAt) / 1000)) * s.speed;
            targetTime += elapsed;
            s.run.advance(targetTime);
            if (s.run.time !== paintedAt || s.run.ended) {
                const view = s.run.view(); applyEvents(); paint(view); paintedAt = view.t;
            }
        }
        previousAt = document.hidden ? null : at;
        frame = requestAnimationFrame(tick);
    }

    makeCards();
    if (s.run) eventCursor = s.run.result.timeline.length;
    paint(); frame = requestAnimationFrame(tick);
    return () => {
        disposed = true; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onVisibility);
        for (const channels of motions.values()) for (const animation of channels.values()) animation.cancel();
        motions.clear();
        main.closest('#app')?.classList.remove('raid-expanded');
    };
}
