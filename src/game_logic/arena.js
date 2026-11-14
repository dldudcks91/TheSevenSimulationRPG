/** 콜로세움 · 결투장 — 저장 상태와 독립된 3인 팀 스냅샷 · 상대 셋의 출처 · `battle.simulateTeams` 단판. RNG는 상대/전투마다 주입한다.
 * 순수 — DOM · 저장소 · 시계 · `Math.random` 을 모른다 · 데이터는 생성자 주입 · 세이브를 모른다 (INTERFACE §2-17).
 * **상대는 셋에서 온다** [2026-10-17 · 탭 둘 2026-10-18 · arena_design §0 · §7 · §8] — 콜로세움 = 층마다 정해진 AI 팀(`rollFloorOpponent` —
 *   시드를 층 번호로 파서 rng 를 안 받는다) / 결투장 = 레이팅 근처 후보(`rollRatedCandidates` — 수는 `arena_pick_count` — 받은 고스트만 · AI 팀 없음 · 2026-11-11 · §9 · R452) / 친선전 = 남이 올린 팀 그대로
 *   (`exportTeam` → 운반 → `importTeam` · 받은 팀은 `validateTeam` 을 지나야 선다 — arena_design §2).
 *   운반(문자열로 싸기 · 서버)은 이 모듈 밖이다. 어느 출처든 결과는 `snapshotTeam` 모양이라 `fight` 하나가 받는다.
 *   레이팅 · 오른 층은 세이브라 여기 없다(`state.arenaRecord` · `colosseumRecord`).
 * 개인 능력치·장비·스킬에 고른 편성의 파티 전술·물약 칸을 더한다(`loadout` = `state.arenaLoadout` · 2026-10-03). 도감은 제외.
 * 물약은 칸을 채운 값만 받는다 — 재고는 부르는 쪽이 안 줄인다(결투는 재고에 영향이 없다).
 * **수비 쪽도 물약 · 전술을 쓴다** [2026-11-13 · R460 · arena_design §0] — 팀 코드(판 2)가 방어 편성의 물약 칸 · 마시는 기준 · 전술 칸 · 함께 잡은 수를 싣고,
 *   받는 쪽이 전술 값을 **다시 잰다**(`tactic` 시스템 · 올린 쪽 숫자를 안 믿는다) · 물약 회복량은 받는 쪽 표에서 읽는다 · `fight` 의 `oppLoadout` 이 상대 물약이다.
 *   층 AI 팀은 차림(등급 행)의 물약 × 칸 수(`floorLoadout`) · 전술 칸(따로 판 굴림 줄 · 등급 행의 칸 수 · 등급)을 든다.
 * ⚠ 등급 표 값(물약 · 전술 칸 포함) · AI 가중치는 임시(GAME_DESIGN §10 「결투장」 ⑦) ·
 *   검사기는 옵션 줄 수 · 기본 능력치 대역을 아직 안 본다(⑧)
 */
import { makeRng, deriveSeed } from './rng.js';

/** 팀 코드 판 — 모양을 바꾸면 올린다. 받는 쪽은 `TEAM_CODE_READ` 의 판만 받고 나머지는 `format` 으로 거절한다 (세이브 판과 같은 성격 · INTERFACE §2-17).
 *  판 2 [2026-11-13 · R460] = 물약 · 전술을 싣는다 · 판 1 은 물약 · 전술 없는 팀으로 받는다(올린 사람이 다시 켜면 판 2 로 다시 올라간다) */
const TEAM_CODE_VERSION = 2;
const TEAM_CODE_READ = [1, 2];
/** 층 AI 팀 전술 칸의 굴림 줄 솔트 — `deriveSeed(colosseum_seed ^ 이것, 층)` · 영웅 · 장비 굴림 줄과 갈라 그 순서를 안 건드린다 (R460 · INTERFACE §5-3) */
const FLOOR_TACTIC_SALT = 0x7AC7;
/** 진형 랭크 — 전열 · 후열 (battle_design §3-1) */
const RANKS = [0, 1];
/** 마스터리 트리 종류 — `mastery_node.csv:tree_kind` 의 어휘 · AI 가 주력을 여기서 하나 굴린다 */
const TREES = ['class', 'sin'];
/** 팀 코드에 싣는 영웅 칸 — 전투에 드는 것만. uid · XP · 남은 포인트 · 착용 표는 안 싣는다(받는 쪽이 다시 세운다) */
const HERO_KEYS = ['name', 'tier', 'sin', 'cls', 'trait', 'face', 'level', 'stats', 'mastery', 'innate', 'bookSkill', 'skillLv', 'advance', 'advanceSkill', 'advanceUp', 'advanceVar', 'advanceCommon'];
/** 받은 팀 코드의 문자열에 못 들어오는 글자 — 화면이 `innerHTML` 로 그리므로 태그 · 속성을 열 수 있는 것 (INTERFACE §2-17 `text`) */
const UNSAFE_TEXT = /[<>"`]/;

/**
 * @param deps.hero · item · skill · battle  시스템
 * @param deps.balance       balance.csv — 해금 문턱(`skillbook_learn_level` · `advance_unlock_level`) · 전직 줄 합(`advance_row_points`) · 공용 포인트(`mastery_point_per_level`) · 상한(`hero_level_cap` · `hero_attr_max`) · AI 가중치(`arena_ai_*`) ·
 *                           후보 간격(`arena_pick_spread` · `arena_pick_jitter`) · 층 시드(`colosseum_seed`)
 * @param deps.equipSlots    착용 위치 `[{id, part}]` — 위치 순서가 장비 굴림 순서다 (equip_slot.csv)
 * @param deps.advances      advance.csv 원시 행 — 전직 갈래 → 직업
 * @param deps.classSkills   직업 풀 `{classId: [skillId]}` — 고유 스킬의 후보 (hero 와 같은 표)
 * @param deps.tiers         arena_tier.csv 원시 행 — 등급(콜로세움 층 묶음 · 결투장 리그)
 * @param deps.upgradeCeiling 건물을 다 지었을 때의 강화 상한 · `skillCapMax` 스킬 업그레이드 상한의 끝 — 검사기가 보는 끝값
 * @param deps.tactic        전술 시스템(`tactic.js`) — 받은 팀의 전술 값을 다시 잰다 · 없으면 전술 칸이 든 팀은 `tactic` 으로 거절 (R460)
 * @param deps.potions       물약 표 `[{id, heal}]` — 받은 팀의 물약 회복량은 여기서 읽는다 (R460)
 * @param deps.potionSlotCeiling · tacticSlotCeiling  건물을 다 지었을 때의 물약 칸 · 열린 전술 칸 — 검사기가 보는 끝값 (R460)
 */
export function createArenaSystem({ hero, item, skill, battle, tactic = null, balance = {}, equipSlots = [], advances = [], classSkills = {}, tiers = [], potions = [], upgradeCeiling = 0, skillCapMax = 0, potionSlotCeiling = 0, tacticSlotCeiling = 0 }) {
    const B = balance;
    const teamSize = 3;
    const clone = value => JSON.parse(JSON.stringify(value));
    const POS = equipSlots.map(s => ({ id: s.id, part: s.part }));
    const potionById = Object.fromEntries((potions ?? []).map(p => [p.id, p]));
    const TC = tactic;
    const tacticCap = TC ? Math.min(tacticSlotCeiling, TC.slotCount) : 0;

    /* ── 표 ── */

    // 등급 — `tier_order` 순. 표가 틀리면 생성 때 던진다 (INTERFACE §2-17)
    const TIERS = (tiers ?? []).map(r => ({
        id: r.tier_id, order: Number(r.tier_order), name: { ko: r.name_kr, en: r.name_en }, ratingMin: r.rating_min, floors: r.floors, level: r.hero_level,
        rarityWeights: { normal: r.rarity_w_normal, magic: r.rarity_w_magic, rare: r.rarity_w_rare }, up: r.gear_up, skillUp: r.skill_up,
        // 층 AI 팀의 물약 · 전술 [2026-11-13 · R460 · arena_design §7] — 물약 하나 × 칸 수 · 열린 전술 칸 수 · 그 칸들의 등급
        potion: r.potion_id, potionSlots: r.potion_slots, tacticSlots: r.tactic_slots, tacticGrade: r.tactic_grade,
    })).sort((a, b) => a.order - b.order);
    (() => {
        const bad = why => { throw new Error(`arena_tier: ${why}`); };
        const within = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
        if (!TIERS.length) bad('행이 없다');
        const seen = new Set();
        TIERS.forEach((t, i) => {
            if (!t.id || seen.has(t.id)) bad(`tier_id '${t.id}'`);
            seen.add(t.id);
            if (!t.name.ko || !t.name.en) bad(`${t.id} — 이름이 비었다`);
            if (!within(t.level, 1, B.hero_level_cap)) bad(`${t.id} — hero_level '${t.level}' (1 ~ hero_level_cap)`);
            // 강화 · 스킬 업그레이드는 「바라는 단계」다 — 쓸 때 끝값으로 자른다(건물 표를 바꿔 끼운 단정에서도 시스템이 선다)
            if (!within(t.up, 0, Infinity)) bad(`${t.id} — gear_up '${t.up}' (0 이상 정수)`);
            if (!within(t.skillUp, 0, Infinity)) bad(`${t.id} — skill_up '${t.skillUp}' (0 이상 정수)`);
            const w = Object.values(t.rarityWeights);
            if (w.some(x => typeof x !== 'number' || x < 0) || !(w.reduce((s, x) => s + x, 0) > 0)) bad(`${t.id} — 희귀도 가중치`);
            if (!within(t.floors, 1, Infinity)) bad(`${t.id} — floors '${t.floors}' (1 이상 정수)`);
            // 물약 · 전술 (R460) — 칸 수는 `up` · `skillUp` 처럼 **바라는 칸 수**라 쓸 때 끝값(건물을 다 지었을 때)으로 자른다 · 칸이 있으면 물약은 표에 · 등급은 전술 등급 어휘에
            if (!within(t.potionSlots, 0, Infinity)) bad(`${t.id} — potion_slots '${t.potionSlots}' (0 이상 정수)`);
            if (t.potionSlots > 0 && !potionById[t.potion]) bad(`${t.id} — potion_id '${t.potion}' (potion.csv 에 없다)`);
            if (!within(t.tacticSlots, 0, Infinity)) bad(`${t.id} — tactic_slots '${t.tacticSlots}' (0 이상 정수)`);
            if (t.tacticSlots > 0 && TC && !TC.GRADES.includes(t.tacticGrade)) bad(`${t.id} — tactic_grade '${t.tacticGrade}'`);
            // 리그 문턱은 오름차순 — 사이를 잇는 분모가 0 이 되지 않게
            if (!Number.isInteger(t.ratingMin) || (i > 0 && t.ratingMin <= TIERS[i - 1].ratingMin)) bad(`${t.id} — rating_min '${t.ratingMin}' (정수 · 앞 등급보다 크다)`);
        });
    })();

    /* ── 차림 — 등급 행 사이를 비율로 잇는다 (INTERFACE §2-17 「차림」) ── */

    const lerp = (a, b, f) => a + (b - a) * f;
    /** 등급 i 에서 다음 등급 쪽으로 f 만큼 — 레벨만 f 를 그대로(첫 등급 아래로 낮출 때 음수) · 나머지는 0 ~ 1 로 자른다 · 마지막 등급은 그대로 */
    function kitAt(i, f) {
        const T = TIERS[i], N = TIERS[i + 1] ?? T, g = Math.min(1, Math.max(0, f));
        return {
            level: Math.min(B.hero_level_cap, Math.max(1, Math.round(lerp(T.level, N.level, f)))),
            rarityWeights: Object.fromEntries(Object.keys(T.rarityWeights).map(k => [k, lerp(T.rarityWeights[k], N.rarityWeights[k], g)])),
            up: Math.round(lerp(T.up, N.up, g)), skillUp: Math.round(lerp(T.skillUp, N.skillUp, g)),
            // 물약 · 전술은 잇지 않는다 — 그 등급 행 값 그대로(칸 수 · 물약 · 등급은 계단이다) · 칸 수는 끝값으로 자른다 (R460)
            potion: T.potion, potionSlots: Math.min(T.potionSlots, potionSlotCeiling), tacticSlots: Math.min(T.tacticSlots, tacticCap), tacticGrade: T.tacticGrade,
        };
    }
    // 콜로세움 사다리 — 등급 순서대로 그 등급 층 수만큼 이어 붙인다 · 등급의 마지막 층이 승급전(arena_design §7)
    const FLOORS = [];
    TIERS.forEach((t, i) => {
        for (let k = 0; k < t.floors; k++)
            FLOORS.push({ no: FLOORS.length + 1, tier: t.id, step: k + 1, steps: t.floors, gate: k === t.floors - 1, kit: kitAt(i, k / t.floors) });
    });
    const tierIndexOfRating = rating => TIERS.reduce((at, t, i) => (t.ratingMin <= rating ? i : at), 0);
    const tierOfRating = rating => TIERS[tierIndexOfRating(rating)].id;
    function kitOfRating(rating) {
        const i = tierIndexOfRating(rating), T = TIERS[i], N = TIERS[i + 1];
        return kitAt(i, N ? (rating - T.ratingMin) / (N.ratingMin - T.ratingMin) : 0);
    }

    // 전직 갈래 — 갈래의 스킬은 `skill.csv` 의 `owner_kind=advance` 행 · `priority` 순 (`state.advanceSkills` 와 같다)
    const ADV = (advances ?? []).map(r => ({ id: r.advance_id, cls: r.class_id, order: Number(r.sort_order) || 0 })).sort((a, b) => a.order - b.order);
    const advanceSkills = id => skill.list.filter(d => d.ownerKind === 'advance' && d.ownerId === id)
        .sort((a, b) => a.priority - b.priority).map(d => d.id);
    /** 전직 트리 한 줄의 랭크 — 칸마다 0 ~ P · 합 ≤ P (`state.advanceRank` 와 같은 규칙 · 2026-11-13 R471) · 키가 없으면 0 들 */
    const ADV_P = B.advance_row_points;
    const rowOk = (a, n) => a === undefined || (Array.isArray(a) && a.length === n && a.every(v => Number.isInteger(v) && v >= 0 && v <= ADV_P) && a.reduce((x, v) => x + v, 0) <= ADV_P);
    /** 그 레벨까지 받은 마스터리 포인트 — 태어날 때 몫(`rollHero`) + 레벨업 몫(`hero.grantXp`)과 같은 정액 (포인트 = 레벨 · R435) */
    const masteryBudget = level => B.mastery_point_start + (level - 1) * B.mastery_point_per_level;

    /* ── 스냅샷 · 단판 ── */

    function snapshotTeam(heroes, items, ranks = {}, loadout = null) {
        if (heroes.length !== teamSize || new Set(heroes.map(h => h.uid)).size !== teamSize)
            throw new Error('arena: a team must contain three distinct heroes');
        return heroes.map((source, i) => {
            const h = clone(source);
            const gear = Object.values(h.equipped).filter(Boolean).map(uid => items[uid]).filter(Boolean).map(clone);
            const combat = hero.computeCombat(h, gear.map(item.effective), {}, loadout?.tactic ?? null);
            return {
                uid: h.uid, hero: h, gear, combat, stats: h.stats,
                actives: skill.activesFor(h, { skillPlus: item.skillPlusOf(gear) }), weaponGroup: gear.find(it => it.slot === 'weapon')?.group ?? null,
                rank: ranks[h.uid] ?? (i === 0 ? 0 : 1),
            };
        });
    }

    function rollOpponent(team, rng) {
        const level = Math.max(1, Math.round(team.reduce((n, p) => n + p.hero.level, 0) / teamSize));
        // 우리 팀과 같은 이름은 피한다 — rng 0 이라 뒤의 굴림이 안 밀린다 (`hero.avoidNames` · 2026-10-15 · PLAN_user_review 2-5 「노엘 → 노엘」)
        const heroes = hero.avoidNames(hero.rollCandidates(rng, teamSize), team.map(p => p.hero.name));
        const items = {};
        heroes.forEach((h, i) => {
            h.uid = `arena-enemy-${i}`;
            h.level = level;
            const groups = item.groupsFor(h.cls);
            const group = groups[Math.floor(rng() * groups.length)].id;
            const gear = item.rollGear(rng, { slots: ['weapon', 'armor'], ilvl: level, weaponGroup: group });
            gear.forEach((it, j) => {
                it.uid = `arena-gear-${i}-${j}`;
                items[it.uid] = it;
                h.equipped[it.slot] = it.uid;
            });
        });
        return snapshotTeam(heroes, items);
    }

    function fight(team, opponent, rng, loadout = null, oppLoadout = null) {
        if (team.length !== teamSize || opponent.length !== teamSize) throw new Error('arena: expected 3 vs 3');
        // 물약을 안 주면 칸 0 — 물약 줄이 아예 안 선다 · 마시는 HP 비율은 편성의 값(없으면 CSV 기본값 · R378)
        //   상대 물약(`oppLoadout` · R460)은 같은 모양으로 적 쪽에 건다 — 없으면 상대는 안 마신다
        const enemyPotion = oppLoadout?.potions?.some(Boolean)
            ? { potions: oppLoadout.potions, slotMax: oppLoadout.slotMax ?? oppLoadout.potions.length, potionHp: oppLoadout.potionHp ?? null } : null;
        return battle.simulateTeams(clone(team), clone(opponent), rng, loadout?.potions ?? null, loadout?.slotMax ?? 0, loadout?.potionHp ?? null, enemyPotion);
    }

    /* ── 오프라인 — 등급에 맞춰 갖춘 AI 팀 (arena_design §7) ── */

    const drawDistinct = (rng, pool, n) => {
        const rest = pool.slice(), out = [];
        for (let i = 0; i < n && rest.length; i++) out.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
        return out;
    };
    /** 가중 추첨 한 번 — 합이 0 이면 균등. 언제나 1회 소비 */
    const pickIndex = (rng, weights) => {
        const total = weights.reduce((s, w) => s + w, 0);
        const r = rng();
        if (!(total > 0)) return Math.floor(r * weights.length);
        let x = r * total;
        for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
        return weights.length - 1;
    };
    const pickOne = (rng, list) => { const r = rng(); return list.length ? list[Math.floor(r * list.length)] : null; };
    /** 그 직업의 방어 스킬 — 고유 스킬 후보(`classSkills`) 중 `skill.csv:armor_pool` 인 것 · 표 순서 (2026-11-13 · AI 팀 방어 스킬 보장) */
    const defenseSkillsOf = cls => (classSkills[cls] ?? []).filter(id => skill.list.find(d => d.id === id)?.armorPool);

    /**
     * 마스터리 포인트를 다 쓴다 — **사람처럼**: 주력 트리 하나를 굴리고, 찍을 수 있는 노드(해금 레벨 · 랭크 상한 · 줄 합 상한(R473) · 지금 장비로 켜진 게이트) 중에서
     *   주력 트리 × `arena_ai_main_tree_weight` · 이미 찍은 노드 × `arena_ai_continue_weight` 로 한 랭크씩 가중 추첨한다 (INTERFACE §2-17) · 찍을 칸이 없으면 남긴다
     */
    function spendMastery(h, gear, rng) {
        const main = TREES[Math.floor(rng() * TREES.length)];
        const nodes = hero.masteryNodesFor(h);
        h.mastery = {};
        while ((h.masteryPoints ?? 0) > 0) {
            const open = nodes.filter(n => n.unlockLevel <= h.level && (h.mastery[n.id] ?? 0) < n.maxRank
                && hero.masteryRowUsed(h, n) < B.mastery_row_points && !hero.masteryPickOneBlocked(h, n) && hero.gateOn(n, gear, h));
            if (!open.length) break;
            const n = open[pickIndex(rng, open.map(x => (x.treeKind === main ? B.arena_ai_main_tree_weight : 1)
                * ((h.mastery[x.id] ?? 0) > 0 ? B.arena_ai_continue_weight : 1)))];
            h.mastery[n.id] = (h.mastery[n.id] ?? 0) + 1;
            h.masteryPoints -= 1;
        }
    }

    /** 책 · 전직 · 스킬 업그레이드 — 레벨 문턱은 게임과 같다. 건물(도서관)은 안 본다 — AI 는 다른 모험가다 */
    function learnSkills(h, T, rng) {
        if (h.level >= B.skillbook_learn_level) {
            const pool = skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === h.cls && d.id !== h.innate && skill.bookable(d.id)).map(d => d.id);
            const id = pickOne(rng, pool);   // 풀이 비어도 1회 소비
            if (id) h.bookSkill = id;
        }
        if (h.level >= B.advance_unlock_level) {
            const br = pickOne(rng, ADV.filter(a => a.cls === h.cls));
            const id = pickOne(rng, br ? advanceSkills(br.id) : []);   // 갈래가 없어도 1회 소비
            if (br) h.advance = br.id;
            // 전직 포인트로 배우고(무료) 크기에 공용 포인트를 넣는다 — 한 줄 합 상한까지 (2026-11-13 R471 — ~~배움 1 + 5레벨 간격 단계~~) · rng 0
            if (br && id) {
                h.advanceSkill = id;
                const up = Math.min(ADV_P, h.masteryPoints ?? 0);
                h.masteryPoints = (h.masteryPoints ?? 0) - up;
                if (up > 0) h.advanceUp = up;
            }
        }
        const lv = {};
        for (const id of [h.innate, h.bookSkill]) if (id && T.skillUp > 0) lv[id] = Math.min(T.skillUp, skillCapMax);
        if (Object.keys(lv).length) h.skillLv = lv;
    }

    /** 차림 하나로 AI 팀 하나 — 등급 · 층 · 레이팅이 같은 길을 쓴다(rng 순서는 INTERFACE §5-2 `rollTierOpponent`).
     *  `floor` = 결투장 층 AI 팀의 짜기(`rollFloorOpponent` 만 · 2026-11-13) — 없으면 옛 짜기 그대로(`rollTierOpponent` — 레이드 연습 팀 · 단정이 쓴다):
     *    · `floor.tacticRng` = 전술 칸의 굴림 줄(R460) — 차림의 `tacticSlots` 만큼 칸 번호 순으로 `tactic.pickMany` · 등급은 차림의 `tacticGrade` ·
     *      영웅 · 장비 굴림(`rng`)과 다른 줄이라 그 순서를 안 건드린다
     *    · 직업 겹침 · 배치 셋 · 방어 스킬 보장 [2026-11-13 사용자] — 아래 */
    function rollKit(T, rng, taken = [], floor = null) {
        let classes;
        if (!floor) classes = drawDistinct(rng, hero.mainClasses, teamSize);   // 옛 짜기 — 직업 셋이 다르다
        else {
            // 직업 — 한 명씩 본편 직업에서 균등 1회 · **같은 직업이 겹쳐도 된다** [2026-11-13 사용자 「같은직업도 섞일 수 있도록 뽑아 1전사 2법사가 가능함」] ·
            //   후열 직업(`class.csv:start_row`)뿐인데 방어 스킬을 가질 직업이 없으면(마법사뿐) 셋째를 방어 스킬이 있는 후열 직업에서 다시 1회 (아래 방어 스킬 보장이 서게)
            classes = Array.from({ length: teamSize }, () => hero.mainClasses[Math.floor(rng() * hero.mainClasses.length)]);
            if (classes.every(c => hero.startRankOf(c) === 1) && !classes.some(c => defenseSkillsOf(c).length)) {
                const alt = hero.mainClasses.filter(c => hero.startRankOf(c) === 1 && defenseSkillsOf(c).length);
                if (alt.length) classes[teamSize - 1] = alt[Math.floor(rng() * alt.length)];
            }
        }
        const heroes = classes.map(cls => hero.rollHeroOf(rng, cls, T.heroTier ?? null));   // 등급 고정(실험실 · R472)이어도 굴림 수 그대로
        // 후열 직업뿐이면 방어 스킬(`skill.csv:armor_pool` — 방어력 · 저항 · 보호막 · 받는 피해 감소 · 회피 · 적 공격 약화)을 하나는 든다
        //   [2026-11-13 사용자 「궁수, 마법사, 사제로만 배치되어있을경우 방어막또는 방어관련된 스킬들이 포함되도록」] — 이미 든 영웅이 없으면
        //   방어 스킬이 있는 첫 영웅의 고유 스킬을 그 직업의 방어 스킬 하나로(1회) · 층 AI 팀만
        if (floor && heroes.every(h => hero.startRankOf(h.cls) === 1) && !heroes.some(h => defenseSkillsOf(h.cls).includes(h.innate))) {
            const h = heroes.find(x => defenseSkillsOf(x.cls).length);
            if (h) h.innate = pickOne(rng, defenseSkillsOf(h.cls));
        }
        // 이름 — 부르는 쪽(`taken`)과도 서로도 안 겹친다. `avoidNames` 는 목록 안의 겹침을 안 보므로 한 명씩 앞사람을 더해 간다 (rng 0)
        const names = (taken ?? []).slice();
        for (const h of heroes) { hero.avoidNames([h], names); names.push(h.name); }
        const items = {};
        heroes.forEach((h, i) => {
            h.uid = `arena-enemy-${i}`;
            // 레벨 — 1 에서 그 레벨까지의 XP 를 게임과 같은 길로 받는다(마스터리 포인트도 `grantXp` 가 준다 · rng 0)
            let xp = 0;
            for (let l = 1; l < T.level; l++) xp += hero.xpNeeded(l);
            hero.grantXp(h, xp);
            // 장비 — 착용 위치를 다 채운다 · 아이템 레벨 = 영웅 레벨 · 희귀도 = 등급 가중치 · 강화 = 등급 단계(강화 대상 부위만)
            const groups = item.groupsFor(h.cls);
            const group = groups[Math.floor(rng() * groups.length)].id;
            const gear = item.rollGear(rng, { slots: POS.map(p => p.part), ilvl: h.level, weaponGroup: group, rarityWeights: T.rarityWeights });
            const up = Math.min(T.up, upgradeCeiling);
            gear.forEach((it, j) => {
                if (up > 0 && item.upgradeable(it)) it.up = up;
                it.uid = `arena-gear-${i}-${j}`;
                items[it.uid] = it;
                h.equipped[POS[j].id] = it.uid;
            });
            learnSkills(h, T, rng);
            spendMastery(h, gear, rng);
        });
        // 전술 — 공격 쪽과 같은 계산(`tacticBonusOf`) · AI 는 함께 잡은 수가 0 이다 (R460 · arena_design §7)
        const slots = floor?.tacticRng && TC && T.tacticSlots > 0
            ? TC.pickMany(floor.tacticRng, T.tacticSlots).map((x, k) => ({ no: k + 1, id: x.id, grade: T.tacticGrade })) : [];
        const tactic = slots.length ? tacticBonusOf(heroes, items, slots, 0) : null;
        const team = snapshotTeam(heroes, items, {}, tactic ? { tactic } : null);
        // 진형 [2026-11-13 사용자 「배치는 아래의 3개중에 1개를 따르도록」] · rng 0 —
        //   전열 직업(전사 · 기사 — `class.csv:start_row`)이 있으면 **전열 직업은 전열 · 나머지는 후열**(후열 직업이 섞이면 앞에 전사 · 기사가 하나는 선다 · 전사 · 기사뿐이면 모두 전열) ·
        //   후열 직업뿐이면 최대 HP 가 가장 큰 영웅 하나가 전열 · 나머지 후열(같으면 앞 영웅 — 옛 규칙 그대로) · 옛 짜기(`floor` 없음)는 언제나 옛 규칙
        if (floor && team.some(p => hero.startRankOf(p.hero.cls) === 0)) team.forEach(p => { p.rank = RANKS[hero.startRankOf(p.hero.cls)]; });
        else {
            let front = 0;
            team.forEach((p, i) => { if (p.combat.hp_max > team[front].combat.hp_max) front = i; });
            team.forEach((p, i) => { p.rank = i === front ? RANKS[0] : RANKS[1]; });
        }
        return team;
    }

    /** `opts.floorRules` — 짜기만 층 AI 팀(`rollFloorOpponent`)과 같게(직업 겹침 · 배치 셋 · 방어 스킬 보장 · R464) · 전술 칸은 안 굴린다 ·
     *  실험실 결투가 쓴다 [2026-11-13 · R469 · INTERFACE §2-17] — 없으면 옛 짜기 그대로(레이드 연습 팀 · 레이팅 후보) ·
     *  `opts.rarityWeights` — 주면 차림의 희귀도 가중치 대신(`item.rollGear` 와 같은 모양 · 실험실 결투 = 레전더리만 · R470) ·
     *  `opts.heroTier` — 주면 세 영웅의 등급을 그것으로(`hero.rollHeroOf` 의 `tier` · 실험실 결투 = 레어 · R472) */
    function rollTierOpponent(tierId, rng, taken = [], { floorRules = false, rarityWeights = null, heroTier = null } = {}) {
        const T = TIERS.find(t => t.id === tierId);
        if (!T) throw new Error(`arena: 모르는 등급 '${tierId}'`);
        const kit = { ...T, ...(rarityWeights ? { rarityWeights: { ...rarityWeights } } : {}), ...(heroTier ? { heroTier } : {}) };
        return rollKit(kit, rng, taken, floorRules ? {} : null);
    }

    /* ── 콜로세움 — 층마다 정해진 AI 팀 (arena_design §7) ── */

    /** 같은 층 = 같은 팀 — 시드를 층 번호로 판다(rng 를 안 받는다). 이름만 `taken` 을 피해 바뀔 수 있다(rng 0) ·
     *  전술 칸은 따로 판 줄(`colosseum_seed ^ FLOOR_TACTIC_SALT`)로 굴린다 — 같은 층 = 같은 전술 (R460) */
    function rollFloorOpponent(no, taken = []) {
        const F = FLOORS.find(f => f.no === no);
        if (!F) throw new Error(`arena: 모르는 층 '${no}'`);
        return rollKit(F.kit, makeRng(deriveSeed(B.colosseum_seed, no)), taken, { tacticRng: makeRng(deriveSeed(B.colosseum_seed ^ FLOOR_TACTIC_SALT, no)) });
    }

    /** 그 층 AI 팀의 물약 — 차림의 물약 하나 × 칸 수 · 회복량은 물약 표 · 마시는 기준은 CSV 기본값 · 칸이 0 이면 null (R460 · arena_design §7) · rng 0 */
    function floorLoadout(no) {
        const F = FLOORS.find(f => f.no === no);
        if (!F) throw new Error(`arena: 모르는 층 '${no}'`);
        const k = F.kit;
        if (!(k.potionSlots > 0)) return null;
        const heal = potionById[k.potion].heal;
        return { potions: Array.from({ length: k.potionSlots }, () => ({ id: k.potion, heal })), slotMax: k.potionSlots, potionHp: null };
    }

    /* ── 콜로세움 — 레이팅 근처 다른 플레이어 후보 (arena_design §8 · §9) ── */

    /** 내 레이팅을 가운데로 간격마다 한 자리 — 자리 수 `arena_pick_count`(다섯이면 아래2 · 아래1 · 비슷 · 위1 · 위2 · R450).
     *  `ghosts` = 받은 방어 편성 `[{id, rating, team}]` (arena_design §9 · 2026-11-11) — 자리마다 흔들림 1회(자리 순) →
     *  자리와 고스트를 레이팅 차가 작은 쌍부터 짝짓는다 · **짝 없는 자리는 버린다 — AI 팀이 없다**(R452 · ADR-1045) ·
     *  후보를 레이팅 순으로 다시 놓는다. 고스트가 없으면 `[]`(rng 0). `taken` 은 읽지 않는다(AI 이름 피하기였다 — 부르는 쪽 호환) (INTERFACE §2-17) */
    function rollRatedCandidates(rating, rng, taken = [], ghosts = []) {
        const n = B.arena_pick_count;
        if (!Number.isInteger(n) || n < 1) throw new Error(`arena: arena_pick_count ${n}`);
        const pool = (ghosts ?? []).filter(g => g && Number.isInteger(g.rating) && g.rating >= 0 && Array.isArray(g.team) && g.team.length === teamSize);
        if (!pool.length) return [];
        const steps = Array.from({ length: n }, (_, k) => k - (n - 1) / 2);   // 간격의 몇 배 — 다섯이면 −2 · −1 · 0 · +1 · +2
        const seats = steps.map(d => Math.max(0, Math.round(rating + d * B.arena_pick_spread + (rng() * 2 - 1) * B.arena_pick_jitter)));
        // 짝짓기 — (자리, 고스트) 쌍을 레이팅 차 → 자리 → 고스트 순으로 놓고 앞에서부터 둘 다 빈 쌍을 고른다 · rng 0
        const pairs = [];
        seats.forEach((r, s) => pool.forEach((g, k) => pairs.push({ s, k, gap: Math.abs(g.rating - r) })));
        pairs.sort((a, b) => a.gap - b.gap || a.s - b.s || a.k - b.k);
        const byseat = seats.map(() => null), used = new Set();
        for (const p of pairs) if (byseat[p.s] === null && !used.has(p.k)) { byseat[p.s] = p.k; used.add(p.k); }
        return byseat.map((k, s) => ({ k, s })).filter(x => x.k !== null)
            .map(({ k, s }) => ({ s, c: { rating: pool[k].rating, tier: tierOfRating(pool[k].rating), team: clone(pool[k].team), loadout: pool[k].loadout ? clone(pool[k].loadout) : null, ghost: pool[k].id } }))
            .sort((a, b) => a.c.rating - b.c.rating || a.s - b.s).map(x => x.c);
    }

    /* ── 온라인 — 남이 올린 팀 그대로 (arena_design §0 · §2) ── */

    /** 올릴 팀 — 영웅 순서 = 편성의 파티 순서(첫 영웅 = 전술 리더) · `extra` = `state.arenaExport` 의 물약 칸 · 마시는 기준 · 전술 칸 (판 2 · R460) */
    function exportTeam(heroes, items, ranks = {}, extra = null) {
        if (heroes.length !== teamSize || new Set(heroes.map(h => h.uid)).size !== teamSize)
            throw new Error('arena: a team must contain three distinct heroes');
        return {
            v: TEAM_CODE_VERSION,
            heroes: heroes.map((h, i) => ({
                hero: Object.fromEntries(HERO_KEYS.filter(k => h[k] !== undefined && h[k] !== null).map(k => [k, clone(h[k])])),
                gear: POS.filter(p => items[h.equipped?.[p.id]]).map(p => {
                    const it = clone(items[h.equipped[p.id]]);
                    delete it.uid;
                    return { pos: p.id, item: it };
                }),
                rank: ranks[h.uid] ?? (i === 0 ? RANKS[0] : RANKS[1]),
            })),
            potions: (extra?.potions ?? []).map(p => (p && typeof p === 'object' ? p.id : p) ?? null),
            potionHp: extra?.potionHp ?? null,
            tactic: { slots: (extra?.tactic?.slots ?? []).map(s => ({ no: s.no, id: s.id, grade: s.grade })), kills: extra?.tactic?.kills ?? 0 },
        };
    }

    /** 받은 팀의 전술 값 — **다시 잰다**(올린 쪽 숫자를 안 믿는다) · `state.tacticBonus` 와 같은 계산: 멤버 = 영웅 순서(첫 영웅 = 리더) ·
     *  칸마다 그 칸의 조건으로 잰 뒤 켜진 칸의 적용 값을 `bonusOf` 로 (R460). 판 1 · 칸 없음 · 시스템 없음이면 null */
    function ghostTactic(payload, heroes, items) {
        const slots = payload.tactic?.slots ?? [];
        if (!TC || payload.v < 2 || !slots.length) return null;
        return tacticBonusOf(heroes, items, slots, payload.tactic.kills ?? 0);
    }

    /** 전술 칸 `[{no, id, grade}]` → 전투 능력치에 얹는 가산치 — **`state.tacticBonus` 와 같은 계산**: 멤버 = 영웅 순서(첫 영웅 = 리더 · 통솔 · 낀 장비의 죄종) ·
     *  칸마다 그 칸의 조건으로 잰 뒤(`measure`) 켜진 칸의 적용 값을 `bonusOf` 로. 고스트(받은 칸)와 층 AI 팀(굴린 칸)이 같이 쓴다 (R460) · rng 0 */
    function tacticBonusOf(heroes, items, slots, kills) {
        const members = heroes.map(h => ({ sin: h.sin, cls: h.cls, ldr: h.stats?.ldr ?? 0, stats: h.stats ?? {},   // 능력치 = 3랭크 짝 능력치 합 (R466)
            gear: Object.values(h.equipped).map(uid => items[uid]).filter(Boolean).flatMap(it => it.sins ?? []) }));
        const ctx = TC.contextOf(members, { kills });
        const on = slots.map(s => TC.optionOf({ id: s.id, grade: s.grade }, s.no)).filter(Boolean)
            .map(option => ({ option, m: TC.measure(option, ctx) })).filter(x => x.m.active)
            .map(x => ({ ...x.option, value: x.m.value }));
        return TC.bonusOf(on);
    }

    /** 받은 팀의 물약 묶음 — 회복량은 이 표에서 · 찬 칸이 없으면 null (판 1 도 null · R460) */
    function ghostLoadout(payload) {
        if (payload.v < 2) return null;
        const potions = payload.potions.map(id => (id ? { id, heal: potionById[id].heal } : null));
        return potions.some(Boolean) ? { potions, slotMax: potions.length, potionHp: payload.potionHp ?? null } : null;
    }

    /** 적법성 검사 — 빈 배열 = 합법. 사유 코드는 INTERFACE §2-17. 순수 · rng 0 */
    function validateTeam(payload) {
        const out = [];
        const bad = (code, hero = null, extra = {}) => out.push({ code, ...(hero === null ? {} : { hero }), ...extra });
        const within = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
        if (!payload || !TEAM_CODE_READ.includes(payload.v) || !Array.isArray(payload.heroes) || payload.heroes.length !== teamSize) {
            bad('format');
            return out;
        }
        // 받은 문자열은 화면 HTML 로 들어간다 — 태그 · 속성을 열 수 있는 글자는 어디에도 못 들어온다 (이름 · 장비 이름 · 아무 칸)
        const texts = [];
        const walk = v => { if (typeof v === 'string') texts.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
        walk(payload.heroes);
        if (texts.some(s => UNSAFE_TEXT.test(s))) bad('text');
        payload.heroes.forEach((entry, i) => {
            const h = entry?.hero;
            if (!h || typeof h !== 'object' || !Array.isArray(entry.gear) || !RANKS.includes(entry.rank)) { bad('format', i); return; }
            // 초상 id 는 `<직업>_<번호>` 모양뿐이다(`hero.rollFace`) — 그림 경로로 들어가는 칸이다
            if (h.face != null && !(typeof h.face === 'string' && h.face.startsWith(`${h.cls}_`) && Number.isInteger(Number(h.face.slice(h.cls.length + 1))))) bad('format', i);
            if (!hero.mainClasses.includes(h.cls)) bad('class', i);
            if (!within(h.level, 1, B.hero_level_cap)) { bad('level', i); return; }   // 아래 검사는 레벨을 믿고 본다
            if (!h.stats || typeof h.stats !== 'object' || Object.values(h.stats).some(v => !within(v, 0, B.hero_attr_max))) bad('stats', i);
            // 마스터리 — 그 영웅의 트리 · 랭크 상한 · 해금 레벨 · 줄 합 상한(R473) · 포인트 예산
            const nodes = new Map(hero.masteryNodesFor(h).map(n => [n.id, n]));
            let spent = 0;
            const rowSum = {};
            for (const [id, r] of Object.entries(h.mastery ?? {})) {
                const n = nodes.get(id);
                if (!n || !within(r, 0, n.maxRank) || (r > 0 && h.level < n.unlockLevel)) bad('mastery', i, { detail: id });
                else { spent += r; const k = hero.masteryRowKey(n); rowSum[k] = (rowSum[k] ?? 0) + r; }
            }
            for (const [k, s] of Object.entries(rowSum)) if (s > B.mastery_row_points) bad('mastery', i, { detail: `${k} ${s}/${B.mastery_row_points}` });
            // 셋 중 하나(4단 · R437) — 4단 줄에 두 칸 이상 찍힌 팀은 받지 않는다
            for (const [id, r] of Object.entries(h.mastery ?? {})) { const n = nodes.get(id); if (n && r > 0 && hero.masteryPickOneBlocked(h, n)) bad('mastery', i, { detail: `${id} pickOne` }); }
            if (spent > masteryBudget(h.level)) bad('masteryPoints', i, { detail: `${spent}/${masteryBudget(h.level)}` });
            // 스킬 — 고유는 그 직업 풀 · 책은 책이 되는 스킬이고 책 레벨 이상 · 업그레이드는 고유 · 배운 칸만
            if (!(classSkills[h.cls] ?? []).includes(h.innate)) bad('innate', i);
            if (h.bookSkill != null && (!skill.bookable(h.bookSkill) || h.level < B.skillbook_learn_level)) bad('book', i);
            for (const [id, n] of Object.entries(h.skillLv ?? {}))
                if ((id !== h.innate && id !== h.bookSkill) || !within(n, 1, skillCapMax)) bad('skillLv', i, { detail: id });
            // 전직 — 제 직업의 갈래 · 전직 레벨 · 그 갈래의 스킬 · 포인트
            //   전직 트리(R471) — 스킬 줄(크기 + 변형 둘)은 배운 스킬이 있어야 · 공통 줄은 갈래가 있어야 · 줄마다 합 ≤ P · 배움은 무료(전직 포인트)
            const advUp = h.advanceUp ?? 0;
            const row = [advUp, ...(h.advanceVar ?? [0, 0])], com = h.advanceCommon ?? [0, 0, 0];
            const spentA = row.reduce((x, v) => x + v, 0) + com.reduce((x, v) => x + v, 0);
            if (h.advance != null) {
                const br = ADV.find(a => a.id === h.advance);
                if (!br || br.cls !== h.cls || h.level < B.advance_unlock_level
                    || (h.advanceSkill != null && !advanceSkills(br.id).includes(h.advanceSkill))
                    || !rowOk(row, 3) || !rowOk(h.advanceVar, 2) || !rowOk(h.advanceCommon, 3) || ((advUp > 0 || h.advanceVar) && !h.advanceSkill)) bad('advance', i);
                if (spent + spentA > masteryBudget(h.level)) bad('masteryPoints', i, { detail: `${spent + spentA}/${masteryBudget(h.level)}` });
            } else if (h.advanceSkill != null || advUp || h.advanceVar || h.advanceCommon) bad('advance', i);
            // 장비 — 위치 · 부위 · 무기군 · 착용 요구 · 강화 · 옵션 수치 범위
            const seen = new Set();
            for (const g of entry.gear) {
                const p = POS.find(x => x.id === g?.pos), it = g?.item;
                if (!p || seen.has(p.id) || !it || it.slot !== p.part || (it.slot === 'weapon' && !item.groupOf(it)) || !within(it.ilvl, 1, Infinity)) {
                    bad('slot', i, { pos: g?.pos ?? null });
                    continue;
                }
                seen.add(p.id);
                if (item.canEquip(h, it)) bad('reqLevel', i, { pos: p.id });
                const up = it.up ?? 0;
                if (!within(up, 0, upgradeCeiling) || (up > 0 && !item.upgradeable(it))) bad('up', i, { pos: p.id });
                (it.affixes ?? []).forEach((a, k) => {
                    const r = item.optionRange(it, k);
                    if (!r) return;   // ⚠ 범위를 못 찾는 줄은 막지 않는다 (INTERFACE §2-17)
                    // 옛 표 범위도 받는다 — 단어 범위(R436) 전에 굴린 옛 장비는 값이 표 양끝 사이에 있다 (2026-11-11)
                    const inside = x => !!x && a.v >= Math.min(x.min, x.max) && a.v <= Math.max(x.min, x.max);
                    if (typeof a.v !== 'number' || !(inside(r) || inside(item.optionTableRange(it, k)))) bad('option', i, { pos: p.id, detail: a.stat });
                });
            }
        });
        // 물약 · 전술 [2026-11-13 · R460] — 판 2 만 싣는다(판 1 은 물약 · 전술 없는 팀). 칸 수의 끝은 건물을 다 지었을 때다
        if (payload.v >= 2) {
            const pots = payload.potions, hp = payload.potionHp, tc = payload.tactic;
            if (!Array.isArray(pots) || !(hp === null || typeof hp === 'number') || !tc || typeof tc !== 'object' || !Array.isArray(tc.slots)) bad('format');
            else {
                if (pots.length > potionSlotCeiling || pots.some(id => id !== null && !potionById[id]) || !(hp === null || (hp > 0 && hp < 1))) bad('potion');
                const nos = new Set();
                const slotBad = s => {
                    const ok = !!s && within(s.no, 1, tacticCap) && !nos.has(s.no) && !!TC?.optionOf({ id: s.id, grade: s.grade }, s.no);
                    if (s && Number.isInteger(s.no)) nos.add(s.no);
                    return !ok;
                };
                if (tc.slots.length > tacticCap || tc.slots.filter(slotBad).length || !within(tc.kills, 0, Infinity)) bad('tactic');
            }
        }
        return out;
    }

    function importTeam(payload) {
        const problems = validateTeam(payload);
        if (problems.length) return { ok: false, problems };
        const items = {}, ranks = {};
        const heroes = payload.heroes.map((entry, i) => {
            // 정해진 영웅 칸만 들인다 — 코드에 덧붙은 다른 칸은 버린다
            const src = clone(entry.hero);
            const h = { ...Object.fromEntries(HERO_KEYS.filter(k => k in src).map(k => [k, src[k]])), uid: `ghost-${i}`, xp: 0, masteryPoints: 0, equipped: {} };
            entry.gear.forEach((g, j) => {
                const it = { ...clone(g.item), uid: `ghost-gear-${i}-${j}` };
                items[it.uid] = it;
                h.equipped[g.pos] = it.uid;
            });
            ranks[h.uid] = entry.rank;
            return h;
        });
        // 전투 능력치는 여기서 다시 계산한다 — payload 에는 능력치가 없다(올린 쪽 숫자를 안 믿는다) · 전술도 다시 잰다 · 물약은 표에서 (R460)
        return { ok: true, team: snapshotTeam(heroes, items, ranks, { tactic: ghostTactic(payload, heroes, items) }), loadout: ghostLoadout(payload) };
    }

    return {
        teamSize, tiers: TIERS.map(t => clone(t)), floors: clone(FLOORS),
        snapshotTeam, rollOpponent, fight,
        rollTierOpponent, rollFloorOpponent, floorLoadout, rollRatedCandidates, tierOfRating, kitOfRating: r => clone(kitOfRating(r)),
        exportTeam, validateTeam, importTeam,
    };
}
