/**
 * 게임 상태 — 생성 / 직렬화 / 모든 상태 전이(장착·고용·원정 결과 반영·재접속 시 런 마무리).
 *
 * 순수 모듈. DOM·localStorage·Date 를 모른다 — 현재 시각이 필요한 함수는 `now`(ms)를 인자로 받는다.
 * 저장은 **엔진 중립 JSON** 이다: 상태 객체 자체가 평문 데이터라 serialize 는 버전 도장만 찍는다.
 * localStorage 접근은 ui/storage.js 어댑터 한 곳에서만 한다 (CLAUDE.md 이식성 규칙 3).
 *
 * 세이브 형식 v8 (2026-09-01)
 * {
 *   version, seed, createdAt, savedAt,
 *   resources: {gold, dust, stigma},
 *   heroes: [{uid, name, tier, sin, cls, trait, level, xp, mastery, masteryPoints, stats, caps, equipped:{position: itemUid|null}, injuredUntil}],
 *     — mastery = {nodeId: rank} 찍은 것만 담는다(0은 안 담는다) · masteryPoints = 남은 포인트.
 *       죄종·직업 마스터리가 한 풀을 공유한다 (skill_design §1-4). 전직 전용 포인트는 전직 미구현이라 없다
 *     — position = 착용 위치 id. 부위 7종 · 위치 8개 (반지 ×2 = ring1/ring2, 나머지는 부위 id 그대로).
 *       보조(offhand)는 2026-09-01 한손 개념 폐지와 함께 사라졌다
 *   party: [uid], items: {uid: item}, bag: [uid],
 *   progress: {cleared: [stageId]},
 *   codexCards: {monsterId: n}   — 도감 레벨의 출처. 누적 카운트, 소모 없음 (monster_design §8)
 *   codexKills: {monsterId: n}   — 기록만. 레벨의 트리거가 아니다
 *   counters: {hero, item, battle, tavern, tactic, upgrade},
 *   run: {stageId, repeat, lastAt, durationSec} | null,
 *   lastReport: {...} | null,
 *   notice: {kind:'runClosed', stageId, at, seenAt} | null   — 재접속 알림 (배너 1회)
 *   tavern: {rerolledAt: ms|null, hired: [슬롯번호]}         — 리롤 쿨다운의 기준 시각 · 이번 명단에서 산 칸.
 *     명단 자체는 저장하지 않는다(시드+카운터로 재현) — 저장하는 건 「언제 갈았나」와 「몇 번 칸을 샀나」뿐이다
 *   tactics: {slots: {칸번호: optionId}}                     — **리롤로 바꾼 칸만** 담는다.
 *     안 담긴 칸은 시드에서 파생되는 첫 배정이다(tactic.initialAssign) — 선술집 명단과 같은 규칙:
 *     저장하는 건 「플레이어가 바꾼 것」뿐이고 나머지는 시드가 재현한다
 * }
 *
 * **버전 이관** — v2 부터는 `deserialize` 안에서 올린다 (INTERFACE §4 정책).
 *   v2 → v3 (2026-08-26 — 감각→운 · 명중/회피 폐지):
 *     · `heroes[*].stats.sen` → `stats.luck` (키 이름만 바꾸고 값·자리는 유지) · `caps` 동일
 *     · `items[*].affixes` 에서 `stat ∈ {accuracy, evasion}` 제거 — 폐지된 축이라 읽는 곳이 없다
 *     · 무기 `watk` 는 **재굴림하지 않는다** — 편차 없이 굴려진 개체로 그대로 남는다 (개체값은 개체의 역사다)
 *   v3 → v4 (2026-08-28 — 마스터리 수치층 신설):
 *     · `heroes[*].mastery = {}` · `masteryPoints = (level − 1) × mastery_point_per_level` 소급 지급
 *       — 이미 레벨업한 영웅이 안 받고 지나간 몫이다. 랭크는 전부 0 이라 전투 결과는 안 바뀐다
 *   v5 → v6 (2026-08-30 — 파티 전술):
 *     · `tactics = {slots: {}}` · `counters.tactic = 0` — 칸은 합산 레벨로 이미 열려 있고 첫 배정은 시드가 낸다.
 *       옛 세이브도 같은 시드를 쓰므로 「새로 시작한 판과 같은 첫 배정」이 그대로 나온다
 *   v4 → v5 (2026-08-30 — 선술집 리롤 쿨다운):
 *     · `tavern` 이 없으면 `{rerolledAt: null, hired: []}` — **쿨다운이 열린 상태**로 올린다.
 *       옛 세이브는 리롤한 적이 없어 기다린 시간을 소급할 근거가 없고, 닫힌 채로 올리면 접속하자마자 골드를 물린다
 *   v7 → v8 (2026-09-01 — 한손 개념 폐지 · 보조 슬롯 폐지):
 *     · 보조 아이템(착용분 · 가방분)을 **지운다** — 부위 자체가 없어져 돌려줄 자리가 없다
 *     · `equipped.offhand` 키 삭제 · `items[*].twoHanded` 삭제
 *     · 무기군 재편 — `sword1h` → `sword2h` · `wand` → `orb` · 창이 기사로 가면서 직업이 안 맞게 된 무기는 가방으로
 *   v6 → v7 (2026-08-31 — 강화 재정의 R25):
 *     · `items[*].up = 0` · `counters.upgrade = 0` — 강화한 적이 없는 상태.
 *       옛 아이템의 watk·implicit·접사 값은 전부 강화 이전 값이라 소급할 것이 없고, up=0 이면 파생 배율이 1이라
 *       이관이 전투 수치를 흔들지 않는다
 *   v1 → v2 는 이관하지 않는다 — 무기군(group)·슬롯·도감 카드·세트포인트 보류로 아이템/도감 스키마가 단절됐다.
 *   하루 된 프로토타입 세이브라 새 게임으로 받는다. v1 은 계속 throw.
 */

import { makeRng, deriveSeed } from './rng.js';

export const SAVE_VERSION = 8;

/**
 * @param {object} deps
 *   hero, item, battle, skill, tactic — 각 시스템 / balance / equipSlots [{id, part}] (착용 위치 8개) / stages(byId) / stageOrder [id...]
 *   monsters(byId) / codex {levels:[cards_to_next...](codex_level.csv 레벨순), bonus:[레벨별 %](codex_level.csv:bonus_pct), statByNum:{stage_num: statKey}(codex_series.csv)}
 */
export function createGameSystem(deps) {
    const { hero: H, item: I, battle: BT, skill: SK, tactic: TC, balance: B } = deps;
    const clone = v => JSON.parse(JSON.stringify(v));

    const positions = deps.equipSlots.map(s => s.id);
    const positionsOf = part => deps.equipSlots.filter(s => s.part === part).map(s => s.id);

    /* ── 생성 · 직렬화 ── */

    const emptyEquip = () => Object.fromEntries(positions.map(p => [p, null]));

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

    /** 새 게임 — 확정한 시작 파티 3명이 곧 로스터·파티. 각자 직업 전속 무기군의 무기 1개를 쥐고 시작한다 */
    function newGame(seed, candidates, now) {
        const state = {
            version: SAVE_VERSION, seed: seed >>> 0, createdAt: now, savedAt: now,
            resources: { gold: B.start_gold, dust: B.start_dust, stigma: B.start_stigma },
            heroes: [], party: [], items: {}, bag: [],
            progress: { cleared: [] },
            codexCards: {}, codexKills: {},
            counters: { hero: 0, item: 0, battle: 0, tavern: 0, tactic: 0, upgrade: 0 },
            run: null, lastReport: null, notice: null,
            tavern: { rerolledAt: null, hired: [] },
            tactics: { slots: {} },
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

    /** 키 이름만 바꾼다 — 자리(순서)를 지켜야 표시 순서·직렬화 결과가 흔들리지 않는다 */
    const renameKey = (o, from, to) =>
        Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k === from ? to : k, v]));

    /** v2 → v3 — 감각→운(hero_design §4-1) · 명중/회피 접사 폐지(battle_design §9-4) */
    function upgradeV2(s) {
        for (const h of s.heroes ?? []) {
            h.stats = renameKey(h.stats, 'sen', 'luck');
            h.caps = renameKey(h.caps, 'sen', 'luck');
        }
        for (const it of Object.values(s.items ?? {})) {
            if (Array.isArray(it.affixes)) it.affixes = it.affixes.filter(a => a.stat !== 'accuracy' && a.stat !== 'evasion');
        }
        s.version = 3;
        return s;
    }

    /**
     * v3 → v4 — 마스터리 수치층 신설 (skill_design §3-1~§3-4).
     * 안 받고 지나간 포인트를 레벨에서 역산해 소급 지급한다 — 새로 시작한 영웅과 같은 자리에 서게 한다.
     */
    function upgradeV3(s) {
        for (const h of s.heroes ?? []) {
            h.mastery = h.mastery ?? {};
            h.masteryPoints = h.masteryPoints ?? Math.max(0, (h.level ?? 1) - 1) * B.mastery_point_per_level;
        }
        s.version = 4;
        return s;
    }

    /**
     * v4 → v5 — 선술집 리롤 쿨다운 (base_expedition_design §2-4).
     * 옛 세이브는 쿨다운을 걸린 적이 없으므로 **열려 있는 상태**로 올린다(`rerolledAt: null`).
     */
    function upgradeV4(s) {
        s.tavern = s.tavern ?? { rerolledAt: null, hired: [] };
        s.version = 5;
        return s;
    }

    /**
     * v5 → v6 — 파티 전술 (tactic_card_design §5).
     * 리롤한 적이 없는 상태로 올린다 — 칸의 첫 배정은 저장하지 않고 시드에서 나오므로 채울 것이 없다.
     */
    function upgradeV5(s) {
        s.tactics = s.tactics ?? { slots: {} };
        s.counters.tactic = s.counters.tactic ?? 0;
        s.version = 6;
        return s;
    }

    /**
     * v6 → v7 — 장비 강화 (item_design §1 개정 2026-08-31).
     * ⚠ 이름만 닮았을 뿐 `item.upgrade`(장비 강화)와는 남남이다 — 이쪽은 스키마 버전을 올린다.
     * 강화한 적이 없는 상태로 올린다: `up = 0` 이면 베이스 배율이 1이라 능력치가 한 칸도 안 움직인다.
     */
    function upgradeV6(s) {
        for (const it of Object.values(s.items ?? {})) it.up = it.up ?? 0;
        s.counters.upgrade = s.counters.upgrade ?? 0;
        s.version = 7;
        return s;
    }

    /**
     * v7 → v8 — 한손 개념 폐지 · 보조(offhand) 슬롯 폐지 (2026-09-01).
     * 슬롯이 사라진 물건은 돌려줄 자리가 없으므로 **아이템 자체를 지운다** — 가방에 남기면 영원히 못 끼는 짐이 된다.
     * ⚠ 직업이 안 맞게 된 무기(창을 든 전사)를 가방으로 되돌리면서 가방이 상한을 넘을 수 있다.
     *   상한은 새로 얻을 때만 막는 값이라 넘긴 채로 열려도 게임은 성립하고, 분해하면 정상으로 돌아온다.
     */
    function upgradeV7(s) {
        const RENAME = { sword1h: 'sword2h', wand: 'orb' };      // 삭제·개명된 무기군
        const dead = new Set();
        for (const [uid, it] of Object.entries(s.items ?? {})) {
            if (it.slot === 'offhand') { dead.add(uid); continue; }
            delete it.twoHanded;
            if (it.slot === 'weapon' && RENAME[it.group]) it.group = RENAME[it.group];
        }
        for (const uid of dead) delete s.items[uid];
        s.bag = (s.bag ?? []).filter(u => !dead.has(u));
        for (const h of s.heroes ?? []) {
            delete h.equipped.offhand;                            // 안 지우면 아래 emptyEquip 병합이 되살린다
            for (const [pos, uid] of Object.entries(h.equipped)) {
                const it = uid ? s.items[uid] : null;
                if (!it) { h.equipped[pos] = null; continue; }
                if (I.canEquip(h, it)) { h.equipped[pos] = null; s.bag.push(uid); }
            }
        }
        s.version = 8;
        return s;
    }

    /**
     * 이 세이브를 열 수 있는가 — **판정의 권한은 `deserialize` 하나다.**
     * 받아들이는 버전 목록을 두 곳에 두면 이관을 늘릴 때마다 화면이 멀쩡한 세이브를 거부한다
     *   (시작 화면이 `version !== SAVE_VERSION` 으로 직접 판정하다 v2 부터 그 증상이 있었다).
     */
    function canLoad(obj) {
        try { deserialize(obj); return true; } catch { return false; }
    }

    /** 버전이 낮으면 여기서 올린다 — v1 은 스키마 단절이라 거부한다 (파일 머리 참조) */
    function deserialize(obj) {
        if (!obj || typeof obj !== 'object') throw new Error('save: not an object');
        if (![SAVE_VERSION, 2, 3, 4, 5, 6, 7].includes(obj.version))
            throw new Error(`save: version ${obj.version} (expected ${SAVE_VERSION})`);
        let s = clone(obj);
        if (s.version === 2) s = upgradeV2(s);
        if (s.version === 3) s = upgradeV3(s);
        if (s.version === 4) s = upgradeV4(s);
        if (s.version === 5) s = upgradeV5(s);
        if (s.version === 6) s = upgradeV6(s);
        if (s.version === 7) s = upgradeV7(s);
        for (const h of s.heroes) h.equipped = { ...emptyEquip(), ...h.equipped };
        s.codexCards = s.codexCards ?? {}; s.codexKills = s.codexKills ?? {};
        s.run = s.run ?? null; s.lastReport = s.lastReport ?? null; s.notice = s.notice ?? null;
        s.tavern = s.tavern ?? { rerolledAt: null, hired: [] };
        s.tactics = s.tactics ?? { slots: {} };
        return s;
    }

    /* ── 조회 ── */

    const heroById = (state, uid) => state.heroes.find(h => h.uid === uid);
    const heroItems = (state, h) => Object.values(h.equipped).filter(Boolean).map(uid => state.items[uid]).filter(Boolean);
    const isInjured = (h, now) => h.injuredUntil != null && h.injuredUntil > now;

    /* ── 도감 — 몬스터 카드 모델 (monster_design §8) ── */

    /**
     * 카드 수 → 도감 레벨. codex_level.csv 의 cards_to_next 는 "그 레벨에 오르는 데 필요한 장수"(누적 아님)라
     * 여기서 누적해 비교한다. 레벨은 역행하지 않고 카드는 소모되지 않는다.
     */
    function codexLevel(cards) {
        let lv = 0, need = 0;
        for (const req of deps.codex.levels) {
            need += req;
            if (cards >= need) lv += 1; else break;
        }
        return lv;
    }
    /** 다음 레벨의 누적 필요 장수 — 최종 레벨이면 null */
    function codexNext(cards) {
        let need = 0;
        for (const req of deps.codex.levels) {
            need += req;
            if (cards < need) return need;
        }
        return null;
    }
    const codexMaxLevel = () => deps.codex.levels.length;
    /** 레벨 lv 까지의 누적 보정 % (codex_level.csv:bonus_pct) */
    const codexBonusAt = lv => deps.codex.bonus.slice(0, lv).reduce((a, b) => a + b, 0);

    /**
     * 도감 보너스 — 몬스터별 레벨 보정을 스테이지 번호가 정하는 계열 스탯에 합산한다.
     * 누적 객체의 키는 `codex.statByNum` 의 값들에서 만든다 — 계열 배정이 바뀌어도 여기를 고칠 필요가 없다.
     * ⚠ `computeCombat` 이 읽는 것은 `atk_pct` · `hp_pct` · `dmg_pct` 뿐이다. 명중 폐지(08-26)로
     *   스테이지 3 계열(`acc_pct`)은 갈 곳이 없다 — 재배정은 기획 결정 (GAME_DESIGN §10).
     */
    function codexBonus(state) {
        const out = Object.fromEntries(Object.values(deps.codex.statByNum).map(k => [k, 0]));
        for (const [id, cards] of Object.entries(state.codexCards)) {
            const m = deps.monsters[id];
            if (!m) continue;
            const key = deps.codex.statByNum[m.stage_num];
            if (key === undefined) continue;
            out[key] += codexBonusAt(codexLevel(cards));
        }
        return out;
    }

    /**
     * 전투 능력치 = 기본 능력치 + 장비 + 도감 + **파티 전술**.
     * 전술 보너스는 **파티에 든 영웅에게만** 붙는다 (tactic_card_design §1 「파티 단위」) — 조건이 편성을 세는데
     *   편성 밖 영웅이 그 결과를 받으면 인과가 깨진다. 벤치 영웅의 시트에 안 붙는 것이 맞다.
     */
    const heroCombat = (state, h) => H.computeCombat(h, heroItems(state, h).map(I.effective), codexBonus(state),
        state.party.includes(h.uid) ? tacticBonus(state) : null);

    /* ── 장비 ── */

    /** 착용 위치 — 같은 부위의 빈 위치가 있으면 거기, 없으면 첫 위치(교체). 위치가 둘인 부위는 반지뿐이다 */
    function equipTarget(hero, item) {
        const ps = positionsOf(item.slot);
        return ps.find(p => !hero.equipped[p]) ?? ps[0] ?? null;
    }

    /** 가방 → 착용. 그 위치의 착용품은 가방으로 (가방이 차면 실패). position 은 생략 가능.
     *  양손↔보조 배타는 2026-09-01 한손 개념 폐지로 사라졌다 — 되돌아오는 것은 언제나 그 자리에 있던 하나뿐이다 */
    function equip(state, heroUid, itemUid, position) {
        const h = heroById(state, heroUid), it = state.items[itemUid];
        if (!h || !it || !state.bag.includes(itemUid)) return { ok: false, err: 'missing' };
        const why = I.canEquip(h, it);
        if (why) return { ok: false, err: why };
        const pos = position && positionsOf(it.slot).includes(position) ? position : equipTarget(h, it);
        if (!pos) return { ok: false, err: 'missing' };

        const back = [];
        if (h.equipped[pos]) back.push(h.equipped[pos]);
        // 가방에서 하나 빠지고 back 만큼 들어온다
        if (state.bag.length - 1 + back.length > B.inventory_cap) return { ok: false, err: 'bagFull' };

        state.bag = state.bag.filter(u => u !== itemUid);
        for (const u of back) state.bag.push(u);
        h.equipped[pos] = itemUid;
        return { ok: true, back, position: pos };
    }

    function unequip(state, heroUid, position) {
        const h = heroById(state, heroUid);
        const uid = h?.equipped[position];
        if (!uid) return { ok: false, err: 'missing' };
        if (state.bag.length >= B.inventory_cap) return { ok: false, err: 'bagFull' };
        h.equipped[position] = null;
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

    /* ── 강화 (item_design §1 개정 2026-08-31 — R25) ── */

    /**
     * 강화 화면 상태 한 덩어리 — **판정을 여기서 다 낸다** (`tavernState`·`masteryState` 와 같은 규칙).
     * `optionAt` = 다음 옵션 상승이 걸리는 단계. 얼마가 나가고 무엇이 걸려 있는지를 화면이 계산하지 않는다.
     */
    function upgradeState(state, itemUid) {
        const it = state.items[itemUid];
        if (!it) return null;
        const up = it.up ?? 0, max = I.upgradeMax(), cost = I.upgradeCost(it);
        const next = up + 1;
        const interval = B.equip_upgrade_option_interval;
        const optionAt = next <= max ? Math.ceil(next / interval) * interval : null;
        return {
            up, max, cost, gold: state.resources.gold,
            canUpgrade: cost != null && state.resources.gold >= cost,
            optionAt: optionAt != null && optionAt <= max ? optionAt : null,
        };
    }

    /**
     * 강화 1단계 — 골드를 내고 `up` 을 올린다.
     * **가방·착용을 가리지 않는다** — 소유물에 하는 일이지 자리에 하는 일이 아니다(분해와 갈리는 지점).
     * rng 는 강화 전용 스트림이라 전투·선술집·전술 어느 수열과도 안 섞인다 (INTERFACE §5-1).
     */
    function upgradeItem(state, itemUid) {
        const it = state.items[itemUid];
        if (!it) return { ok: false, err: 'missing' };
        const cost = I.upgradeCost(it);
        if (cost == null) return { ok: false, err: 'maxUp' };
        if (state.resources.gold < cost) return { ok: false, err: 'gold' };
        state.resources.gold -= cost;
        const rng = makeRng(deriveSeed(state.seed ^ 0xF0C3, ++state.counters.upgrade));
        const r = I.upgrade(rng, it);
        return { ok: true, up: r.up, cost, affix: r.affix };
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

    /** 부상 회복 타이머가 지난 영웅을 정리한다 — 화면을 그리기 전마다 부른다. 오프라인에도 흐르는 유일한 시계 */
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

    // 액티브는 **전투 안에서만** 산다 — 쿨·창·배리어는 HP 와 같은 취급이라 세이브에 넣지 않는다 (INTERFACE §4)
    const partyUnits = state => state.party.map(uid => {
        const h = heroById(state, uid);
        return { uid, combat: heroCombat(state, h), actives: SK.activesFor(h) };
    });

    /**
     * 전투 1회 — 시뮬 → 결과를 상태에 반영 → 리포트.
     * 시드는 마스터 시드 + 전투 카운터에서 파생된다: 같은 세이브에서 다음 전투는 언제 돌려도 같다.
     * 런은 출발 시점에 통째로 정산된다 — 관전은 재생일 뿐이라 게임이 꺼져도 잃는 것이 없다.
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
        for (const [id, n] of Object.entries(result.cards)) state.codexCards[id] = (state.codexCards[id] ?? 0) + n;

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
            cards: { ...result.cards },
            rounds: result.rounds,
            // 깬 라운드 수 — 렌더러가 「이겼으면 전부, 아니면 하나 뺀다」로 짐작하던 값이다.
            // 귀환 룰이 들어오면서 「라운드를 정리한 직후에 철수」가 생겨 그 짐작이 틀릴 수 있다
            roundsCleared: result.roundsCleared,
            // 빗나감 비율 — 레벨 부족의 전용 신호 (battle_design §9-8). 옛 리포트에는 없을 수 있다(렌더러가 허용)
            strikes: result.strikes ? clone(result.strikes) : null,
        };
        state.lastReport = report;
        state.run = { stageId, repeat: state.run?.stageId === stageId ? state.run.repeat : false, lastAt: now, durationSec: result.durationSec };
        return { ok: true, result, report };
    }

    /**
     * 재접속 — 반복 원정은 **게임이 켜져 있는 동안만** 돈다 (base_expedition_design §1, 2026-08-25).
     * 꺼져 있던 사이 돌던 런은 마무리된 것으로 본다. 프로토타입은 런을 출발 시점에 통째로 정산하므로(resolveBattle)
     * 남은 미정산분이 없다 — lastReport 가 곧 "진행 중이던 전투까지 정산한" 결과다. 여기서는 반복을 끄고 알림만 남긴다.
     * 오프라인에 도는 것은 치료 타이머(tickInjuries)뿐 — 파견은 미구현.
     */
    function closeRun(state, now) {
        const run = state.run;
        if (!run || !run.repeat) return null;
        run.repeat = false;
        state.notice = { kind: 'runClosed', stageId: run.stageId, at: run.lastAt, seenAt: now };
        return state.notice;
    }
    function dismissNotice(state) { state.notice = null; }

    /* ── 선술집 — 명단 · 리롤 쿨다운 (base_expedition_design §2-4 확정 2026-08-26) ── */

    /**
     * 명단 — 시드+카운터에서 매번 같은 사람들이 다시 나온다 (명단 자체는 저장하지 않는다).
     * **고용한 칸은 `null`** — 빈 채로 남고 다음 리롤에 채워진다. 그래서 저장하는 것은 「몇 번 칸을 샀나」뿐이다
     */
    function tavernCandidates(state) {
        const rng = makeRng(deriveSeed(state.seed ^ 0x5A17, state.counters.tavern));
        const hired = state.tavern?.hired ?? [];
        return H.rollCandidates(rng, B.tavern_candidates).map((c, i) => (hired.includes(i) ? null : c));
    }
    /** 무료 리롤이 열리는 시각 — 리롤한 적이 없으면 이미 열려 있다. 쿨다운은 **플레이어 행동**에 걸린다(자동 갱신 없음) */
    function tavernFreeAt(state) {
        const at = state.tavern?.rerolledAt;
        return at == null ? 0 : at + B.tavern_refresh_hours * 60 * 60 * 1000;
    }
    /** 선술집 화면 상태 한 덩어리 — 판정을 여기서 다 낸다 (masteryState 와 같은 규칙) */
    function tavernState(state, now) {
        const freeAt = tavernFreeAt(state);
        return { candidates: tavernCandidates(state), freeAt, free: now >= freeAt, cost: B.tavern_reroll_cost };
    }
    /** 리롤 — 쿨다운이 끝났으면 무료, 아니면 즉시 리롤 비용(골드). 리롤은 명단을 통째로 갈고 쿨다운을 다시 건다 */
    function tavernReroll(state, now) {
        const free = now >= tavernFreeAt(state);
        if (!free && state.resources.gold < B.tavern_reroll_cost) return { ok: false, err: 'gold' };
        if (!free) state.resources.gold -= B.tavern_reroll_cost;
        state.counters.tavern += 1;
        state.tavern = { rerolledAt: now, hired: [] };
        return { ok: true, free };
    }
    function hire(state, index) {
        if (state.heroes.length >= B.roster_cap) return { ok: false, err: 'roster' };
        if (state.resources.gold < B.tavern_hire_cost) return { ok: false, err: 'gold' };
        const c = tavernCandidates(state)[index];
        if (!c) return { ok: false, err: 'missing' };
        state.resources.gold -= B.tavern_hire_cost;
        const h = addHero(state, clone(c));
        // 고용한 칸만 빈다 — 명단을 갈지 않는다. 고용이 무료 리롤 우회로가 되면 쿨다운이 무의미해진다 (§2-4)
        state.tavern = state.tavern ?? { rerolledAt: null, hired: [] };
        state.tavern.hired.push(index);
        return { ok: true, hero: h };
    }

    /* ── 파티 전술 — 칸 해금(합산 레벨) · 리롤 (tactic_card_design §5 확정 2026-08-30) ── */

    /** 해금 기준 = **로스터 전원의 레벨 합.** 파티 3명이 아니라 보유 영웅 전부다 — 벤치를 키워도 칸이 열린다 */
    const totalLevel = state => state.heroes.reduce((a, h) => a + (h.level ?? 1), 0);

    /** 조건이 세는 대상 = **파티**(편성). 전술은 파티 단위이므로 벤치는 조건에 안 들어간다 */
    const partyMembers = state => state.party.map(uid => heroById(state, uid)).filter(Boolean)
        .map(h => ({ sin: h.sin, cls: h.cls, items: heroItems(state, h), actives: SK.activesFor(h) }));

    /** 첫 배정 — 시드 하나에서 나온다. 리롤 카운터를 안 타므로 **리롤이 다른 칸의 내용을 흔들지 않는다** */
    const initialAssign = state => TC.initialAssign(makeRng(deriveSeed(state.seed ^ 0x7AC7, 0)));

    /**
     * 칸의 지금 상태 한 덩어리 — 열렸나 · 무엇이 들었나 · 조건이 몇 / 몇인가 · 리롤 비용.
     * 판정은 전부 여기서 낸다 (masteryState · tavernState 와 같은 규칙) — 화면은 그리기만 한다.
     */
    function tacticState(state) {
        const total = totalLevel(state);
        const open = TC.openCount(total);
        const stored = state.tactics?.slots ?? {};
        const initial = initialAssign(state);
        const ctx = TC.contextOf(partyMembers(state));
        const slots = TC.slotList.map((s, i) => {
            const opened = s.no <= open;
            // 저장된 것(리롤한 칸) 우선 · 없으면 첫 배정. 세이브에 없는 옵션 id 는 CSV 가 바뀐 것이라 첫 배정으로 되돌린다
            const option = opened ? (TC.byId[stored[s.no]] ?? TC.byId[initial[i]] ?? null) : null;
            const m = option ? TC.measure(option, ctx) : null;
            return {
                no: s.no, open: opened, unlockTotalLevel: s.unlockTotalLevel, cost: s.rerollCost,
                option, have: m?.have ?? 0, need: m?.need ?? 0, active: m?.active ?? false,
            };
        });
        return { totalLevel: total, open, count: TC.slotCount, slots };
    }

    /** 켜진 칸들의 효과 합 — 접사·마스터리와 **같은 채널** (§2-4). `heroCombat` 이 이걸 받는다 */
    function tacticBonus(state) {
        return TC.bonusOf(tacticState(state).slots.filter(s => s.open && s.active).map(s => s.option));
    }

    /**
     * 리롤 — 칸 하나의 옵션을 간다. 비용은 칸마다 다르다 (tactic_slot.csv:reroll_cost_gold).
     * **지금 든 것과 다른 칸에 든 것을 후보에서 뺀다** — 돈을 내고 같은 것이 나오거나 칸끼리 겹치는 일을 막는다.
     */
    function rerollTactic(state, slotNo) {
        const st = tacticState(state);
        const slot = st.slots.find(s => s.no === slotNo);
        if (!slot) return { ok: false, err: 'missing' };
        if (!slot.open) return { ok: false, err: 'locked' };
        if (state.resources.gold < slot.cost) return { ok: false, err: 'gold' };
        const held = st.slots.filter(s => s.open && s.option).map(s => s.option.id);
        state.counters.tactic = (state.counters.tactic ?? 0) + 1;
        const next = TC.pick(makeRng(deriveSeed(state.seed ^ 0x7AC7, state.counters.tactic)), held);
        if (!next) return { ok: false, err: 'missing' };      // 풀이 칸보다 많다는 것은 로드 시 검증했다
        state.resources.gold -= slot.cost;
        state.tactics = state.tactics ?? { slots: {} };
        state.tactics.slots[slotNo] = next;
        return { ok: true, option: TC.byId[next], cost: slot.cost };
    }

    /* ── 마스터리 — 찍기 · 롤백 (skill_design §3 · §5) ── */

    /**
     * 그 영웅의 마스터리 화면 상태 한 덩어리 — 노드마다 현재 랭크·상한·해금 여부·지금 찍을 수 있는가.
     * 판정 규칙이 렌더러로 새지 않게 여기서 한 번에 낸다(경계 규칙 — 화면은 결과만 그린다).
     */
    function masteryState(state, uid) {
        const h = heroById(state, uid);
        if (!h) return null;
        const points = h.masteryPoints ?? 0;
        return {
            points,
            nodes: H.masteryNodesFor(h).map(n => {
                const rank = h.mastery?.[n.id] ?? 0;
                const unlocked = h.level >= n.unlockLevel;
                return {
                    id: n.id, treeKind: n.treeKind, ownerId: n.ownerId, tier: n.tier, stat: n.stat,
                    value: n.value, rank, maxRank: n.maxRank, unlockLevel: n.unlockLevel, unlocked,
                    total: Number((n.value * rank).toFixed(3)),
                    canLearn: unlocked && rank < n.maxRank && points > 0,
                };
            }),
        };
    }

    /** 한 랭크 찍는다 — 포인트 1점 소비. 결과 코드는 INTERFACE §3 사전 */
    function learnMastery(state, uid, nodeId) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        const n = H.masteryById[nodeId];
        // 그 영웅의 트리에 없는 노드는 「없음」이다 — 다른 죄종·직업의 노드를 남이 찍지 못한다
        if (!n || !H.masteryNodesFor(h).some(x => x.id === nodeId)) return { ok: false, err: 'missing' };
        if (h.level < n.unlockLevel) return { ok: false, err: 'locked' };
        const rank = h.mastery?.[nodeId] ?? 0;
        if (rank >= n.maxRank) return { ok: false, err: 'maxRank' };
        if ((h.masteryPoints ?? 0) < 1) return { ok: false, err: 'points' };
        h.mastery = h.mastery ?? {};
        h.mastery[nodeId] = rank + 1;
        h.masteryPoints -= 1;
        return { ok: true, rank: rank + 1, points: h.masteryPoints };
    }

    /** 롤백 — **무료 · 수시** (skill_design §5). 찍은 것을 전부 돌려주고 포인트를 되돌린다 */
    function resetMastery(state, uid) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        const spent = Object.values(h.mastery ?? {}).reduce((a, b) => a + b, 0);
        h.mastery = {};
        h.masteryPoints = (h.masteryPoints ?? 0) + spent;
        return { ok: true, refunded: spent, points: h.masteryPoints };
    }

    return {
        newGame, serialize, deserialize, canLoad,
        heroById, heroItems, heroCombat, isInjured, upgradeState, upgradeItem,
        codexLevel, codexNext, codexMaxLevel, codexBonusAt, codexBonus,
        equipTarget, equip, unequip, salvage,
        toggleParty, tickInjuries,
        stageUnlocked, canDepart, resolveBattle, closeRun, dismissNotice,
        tavernCandidates, tavernState, tavernReroll, hire,
        masteryState, learnMastery, resetMastery,
        tacticState, tacticBonus, rerollTactic,
    };
}
