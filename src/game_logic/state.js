/**
 * 게임 상태 — 생성 / 직렬화 / 모든 상태 전이(장착·고용·원정 결과 반영·부재 정산).
 *
 * 순수 모듈. DOM·localStorage·Date 를 모른다 — 현재 시각이 필요한 함수는 `now`(ms)를 인자로 받는다.
 * 저장은 **엔진 중립 JSON** 이다: 상태 객체 자체가 평문 데이터라 serialize 는 버전 도장만 찍는다.
 * localStorage 접근은 ui/storage.js 어댑터 한 곳에서만 한다 (CLAUDE.md 이식성 규칙 3).
 *
 * 세이브 형식 v1
 * {
 *   version, seed, createdAt, savedAt,
 *   resources: {gold, dust, stigma},
 *   heroes: [{uid, name, tier, sin, cls, trait, level, xp, stats, caps, equipped:{slot: itemUid|null}, injuredUntil}],
 *   party: [uid], items: {uid: item}, bag: [uid],
 *   progress: {cleared: [stageId]},
 *   codexKills: {monsterId: n},
 *   counters: {hero, item, battle, tavern},
 *   run: {stageId, repeat, lastAt, durationSec} | null,
 *   lastReport: {...} | null, offline: {...} | null
 * }
 */

import { makeRng, deriveSeed } from './rng.js';

export const SAVE_VERSION = 1;

/**
 * @param {object} deps
 *   hero, item, battle — 각 시스템 / balance / slots [id...] / stages(byId) / stageOrder [id...]
 *   monsters(byId) / codex {milestones:[], bonus:[], statByNum:{1:'atk_pct',...}}
 */
export function createGameSystem(deps) {
    const { hero: H, item: I, battle: BT, balance: B } = deps;
    const clone = v => JSON.parse(JSON.stringify(v));

    /* ── 생성 · 직렬화 ── */

    const emptyEquip = () => Object.fromEntries(deps.slots.map(s => [s, null]));

    function addHero(state, h) {
        state.counters.hero += 1;
        h.uid = `h${state.counters.hero}`;
        h.equipped = { ...emptyEquip(), ...(h.equipped ?? {}) };
        state.heroes.push(h);
        return h;
    }
    function addItem(state, it) {
        state.counters.item += 1;
        it.uid = `i${state.counters.item}`;
        state.items[it.uid] = it;
        return it;
    }

    /** 새 게임 — 확정한 시작 파티 3명이 곧 로스터·파티. 각자 직업 무기 1개를 쥐고 시작한다 */
    function newGame(seed, candidates, now) {
        const state = {
            version: SAVE_VERSION, seed: seed >>> 0, createdAt: now, savedAt: now,
            resources: { gold: B.start_gold, dust: B.start_dust, stigma: B.start_stigma },
            heroes: [], party: [], items: {}, bag: [],
            progress: { cleared: [] },
            codexKills: {},
            counters: { hero: 0, item: 0, battle: 0, tavern: 0 },
            run: null, lastReport: null, offline: null,
        };
        const rng = makeRng(deriveSeed(state.seed, 0));
        for (const c of candidates) {
            const h = addHero(state, clone(c));
            const w = addItem(state, I.startingWeapon(rng, h.cls));
            h.equipped.weapon = w.uid;
            state.party.push(h.uid);
        }
        return state;
    }

    const serialize = (state, now) => ({ ...clone(state), version: SAVE_VERSION, savedAt: now });

    /** 버전이 낮으면 여기서 올린다 — 아직 v1 뿐이라 검증만 */
    function deserialize(obj) {
        if (!obj || typeof obj !== 'object') throw new Error('save: not an object');
        if (obj.version !== SAVE_VERSION) throw new Error(`save: version ${obj.version} (expected ${SAVE_VERSION})`);
        const s = clone(obj);
        for (const h of s.heroes) h.equipped = { ...emptyEquip(), ...h.equipped };
        s.run = s.run ?? null; s.lastReport = s.lastReport ?? null; s.offline = s.offline ?? null;
        return s;
    }

    /* ── 조회 ── */

    const heroById = (state, uid) => state.heroes.find(h => h.uid === uid);
    const heroItems = (state, h) => Object.values(h.equipped).filter(Boolean).map(uid => state.items[uid]).filter(Boolean);
    const isInjured = (h, now) => h.injuredUntil != null && h.injuredUntil > now;

    /** 도감 보너스 — 처치 수 문턱별 %, 스테이지 번호가 계열 스탯을 정한다 */
    function codexBonus(state) {
        const { milestones, bonus, statByNum } = deps.codex;
        const out = { atk_pct: 0, hp_pct: 0, acc_pct: 0, dmg_pct: 0 };
        for (const [id, kills] of Object.entries(state.codexKills)) {
            const m = deps.monsters[id];
            if (!m) continue;
            const stat = statByNum[m.stage_num];
            let pct = 0;
            milestones.forEach((th, i) => { if (kills >= th) pct += bonus[i]; });
            out[stat] += pct;
        }
        return out;
    }

    const heroCombat = (state, h) => H.computeCombat(h, heroItems(state, h), codexBonus(state));
    const setPoints = (state, h) => I.setPoints(h, heroItems(state, h));

    /* ── 장비 ── */

    /** 가방 → 착용. 같은 부위 착용품은 가방으로. 양손 무기는 보조를 벗긴다 (가방이 차면 실패) */
    function equip(state, heroUid, itemUid) {
        const h = heroById(state, heroUid), it = state.items[itemUid];
        if (!h || !it || !state.bag.includes(itemUid)) return { ok: false, err: 'missing' };
        const worn = heroItems(state, h);
        const why = I.canEquip(h, it, worn);
        if (why) return { ok: false, err: why };

        const back = [];
        if (h.equipped[it.slot]) back.push(h.equipped[it.slot]);
        if (it.slot === 'weapon' && it.twoHanded && h.equipped.offhand) back.push(h.equipped.offhand);
        // 가방에서 하나 빠지고 back 만큼 들어온다
        if (state.bag.length - 1 + back.length > B.inventory_cap) return { ok: false, err: 'bagFull' };

        state.bag = state.bag.filter(u => u !== itemUid);
        for (const u of back) state.bag.push(u);
        if (it.slot === 'weapon' && it.twoHanded) h.equipped.offhand = null;
        h.equipped[it.slot] = itemUid;
        return { ok: true, back };
    }

    function unequip(state, heroUid, slot) {
        const h = heroById(state, heroUid);
        const uid = h?.equipped[slot];
        if (!uid) return { ok: false, err: 'missing' };
        if (state.bag.length >= B.inventory_cap) return { ok: false, err: 'bagFull' };
        h.equipped[slot] = null;
        state.bag.push(uid);
        return { ok: true };
    }

    /** 분해 — 가방 아이템을 몬스터 가루로 */
    function salvage(state, itemUid) {
        const it = state.items[itemUid];
        if (!it || !state.bag.includes(itemUid)) return { ok: false, err: 'missing' };
        const dust = I.salvageDust(it);
        state.bag = state.bag.filter(u => u !== itemUid);
        delete state.items[itemUid];
        state.resources.dust += dust;
        return { ok: true, dust };
    }

    /* ── 파티 ── */

    function toggleParty(state, uid, now) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        if (state.party.includes(uid)) { state.party = state.party.filter(u => u !== uid); return { ok: true }; }
        if (isInjured(h, now)) return { ok: false, err: 'injured' };
        if (state.party.length >= B.party_size_max) return { ok: false, err: 'full' };
        state.party.push(uid);
        return { ok: true };
    }

    /** 부상 회복 타이머가 지난 영웅을 정리한다 — 화면을 그리기 전마다 부른다 */
    function tickInjuries(state, now) {
        for (const h of state.heroes) if (h.injuredUntil != null && h.injuredUntil <= now) h.injuredUntil = null;
    }

    /* ── 스테이지 · 원정 ── */

    /** 해금 = 첫 스테이지이거나 직전 스테이지(순서 기준)를 클리어했다 */
    function stageUnlocked(state, stageId) {
        const i = deps.stageOrder.indexOf(stageId);
        if (i <= 0) return i === 0;
        return state.progress.cleared.includes(deps.stageOrder[i - 1]);
    }

    function canDepart(state, stageId, now) {
        if (!stageUnlocked(state, stageId)) return 'locked';
        if (state.party.length === 0) return 'noParty';
        if (state.party.some(uid => isInjured(heroById(state, uid), now))) return 'injured';
        return null;
    }

    const partyUnits = state => state.party.map(uid => {
        const h = heroById(state, uid);
        return { uid, combat: heroCombat(state, h) };
    });

    /**
     * 전투 1회 — 시뮬 → 결과를 상태에 반영 → 리포트.
     * 시드는 마스터 시드 + 전투 카운터에서 파생된다: 같은 세이브에서 다음 전투는 언제 돌려도 같다.
     */
    function resolveBattle(state, stageId, now) {
        const why = canDepart(state, stageId, now);
        if (why) return { ok: false, err: why };

        state.counters.battle += 1;
        const rng = makeRng(deriveSeed(state.seed, state.counters.battle));
        const result = BT.simulate(partyUnits(state), stageId, rng);

        // 보상 — XP 는 참가 전원 동일 지급 (⚠제안 — 분배 규칙 미확정)
        const xpEach = Math.round(result.xpTotal * B.xp_rate);
        const levelUps = [];
        for (const uid of state.party) {
            const h = heroById(state, uid);
            const lu = H.grantXp(h, xpEach, rng);
            if (lu) levelUps.push(lu);
        }
        state.resources.gold += result.gold;
        state.resources.dust += result.dust;
        for (const [id, n] of Object.entries(result.kills)) state.codexKills[id] = (state.codexKills[id] ?? 0) + n;

        // 드롭 → 가방. 가득 차면 버린다 (개수는 리포트에 남긴다)
        const drops = [];
        let discarded = 0;
        for (const it of result.drops) {
            if (state.bag.length >= B.inventory_cap) { discarded++; continue; }
            const added = addItem(state, it);
            state.bag.push(added.uid);
            drops.push(added.uid);
        }

        // 부상 — 전투불능자만 타이머, 나머지는 귀환 즉시 무료 회복 (HP 는 상태에 없다: 매 전투 최대치 시작)
        for (const uid of result.downed) {
            const h = heroById(state, uid);
            h.injuredUntil = now + B.injury_minutes * 60 * 1000;
        }

        if (result.won && !state.progress.cleared.includes(stageId)) state.progress.cleared.push(stageId);

        const report = {
            at: now, stageId, won: result.won, reason: result.reason, durationSec: result.durationSec,
            gold: result.gold, dust: result.dust, xpEach, levelUps,
            downed: result.downed.slice(), drops, discarded,
            rounds: result.rounds,
        };
        state.lastReport = report;
        state.run = { stageId, repeat: state.run?.stageId === stageId ? state.run.repeat : false, lastAt: now, durationSec: result.durationSec };
        return { ok: true, result, report };
    }

    /**
     * 부재 정산 — 반복 원정이 켜진 채 떠나 있던 시간만큼 전투를 돌린다.
     * 멈추는 조건: 패배 / 부상자 발생(출발 불가) / 가방 가득 / 상한 [balance.csv:offline_cap_hours].
     * 결과는 합산만 남긴다 — 관전용 타임라인은 만들지 않는다.
     */
    function offlineCatchup(state, now) {
        const run = state.run;
        if (!run || !run.repeat || !run.durationSec) return null;
        const elapsed = Math.max(0, now - run.lastAt) / 1000;
        const cap = Math.floor(B.offline_cap_hours * 3600 / run.durationSec);
        const n = Math.min(cap, Math.floor(elapsed / run.durationSec));
        if (n <= 0) return null;

        const sum = { battles: 0, wins: 0, gold: 0, dust: 0, xpEach: 0, drops: 0, discarded: 0, downed: [], levelUps: [], stopped: null, elapsedSec: Math.round(elapsed) };
        for (let i = 0; i < n; i++) {
            if (state.bag.length >= B.inventory_cap) { sum.stopped = 'bagFull'; break; }
            const at = run.lastAt + (i + 1) * run.durationSec * 1000;
            const r = resolveBattle(state, run.stageId, at);
            if (!r.ok) { sum.stopped = r.err; break; }
            const rp = r.report;
            sum.battles++; if (rp.won) sum.wins++;
            sum.gold += rp.gold; sum.dust += rp.dust; sum.xpEach += rp.xpEach;
            sum.drops += rp.drops.length; sum.discarded += rp.discarded;
            sum.downed.push(...rp.downed); sum.levelUps.push(...rp.levelUps);
            if (!rp.won) { sum.stopped = 'defeat'; break; }
            if (rp.downed.length) { sum.stopped = 'injured'; break; }
        }
        state.run.lastAt = now;
        state.run.repeat = sum.stopped == null;   // 멈춘 이유가 있으면 반복도 꺼진다
        state.offline = sum;
        return sum;
    }

    /* ── 선술집 ── */

    /** 후보 3명 — 시드+카운터에서 매번 같은 3명이 다시 나온다 (저장 불필요) */
    function tavernCandidates(state) {
        const rng = makeRng(deriveSeed(state.seed ^ 0x5A17, state.counters.tavern));
        return H.rollCandidates(rng, B.tavern_candidates);
    }
    function tavernReroll(state) {
        if (state.resources.gold < B.tavern_reroll_cost) return { ok: false, err: 'gold' };
        state.resources.gold -= B.tavern_reroll_cost;
        state.counters.tavern += 1;
        return { ok: true };
    }
    function hire(state, index) {
        if (state.heroes.length >= B.roster_cap) return { ok: false, err: 'roster' };
        if (state.resources.gold < B.tavern_hire_cost) return { ok: false, err: 'gold' };
        const c = tavernCandidates(state)[index];
        if (!c) return { ok: false, err: 'missing' };
        state.resources.gold -= B.tavern_hire_cost;
        const h = addHero(state, clone(c));
        state.counters.tavern += 1;      // 고용하면 후보가 갈린다 (같은 사람을 두 번 사지 못한다)
        return { ok: true, hero: h };
    }

    return {
        newGame, serialize, deserialize,
        heroById, heroItems, heroCombat, setPoints, codexBonus, isInjured,
        equip, unequip, salvage,
        toggleParty, tickInjuries,
        stageUnlocked, canDepart, resolveBattle, offlineCatchup,
        tavernCandidates, tavernReroll, hire,
    };
}
