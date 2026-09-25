/**
 * 게임 상태 — 생성 / 직렬화 / 모든 상태 전이(장착·고용·원정 결과 반영·재접속 시 런 마무리).
 *
 * 순수 모듈. DOM·localStorage·Date 를 모른다 — 현재 시각이 필요한 함수는 `now`(ms)를 인자로 받는다.
 * 저장은 **엔진 중립 JSON** 이다: 상태 객체 자체가 평문 데이터라 serialize 는 버전 도장만 찍는다.
 * localStorage 접근은 ui/storage.js 어댑터 한 곳에서만 한다 (CLAUDE.md 이식성 규칙 3).
 *
 * 세이브 형식 v37 (2026-09-22)
 * {
 *   version, seed, createdAt, savedAt,
 *   playMs   — **누적 플레이 시간**(ms). 더하는 것은 `addPlayTime` 하나 · 언제 더할지는 화면이 정한다 · 없으면 0 · 버전 무변경 (2026-09-25 · ADR-0356)
 *   resources: {gold, dust, stigma},
 *   materials: {yieldId: n}   — 제작 재료(광석 · 목재 — 산출물 id 가 키). 없으면 {} · 버전 무변경 (2026-09-15 · R96)
 *   potions: {potionId: n}    — 물약 재고(v32 · R124). 마시면 준다(`advanceRun`) · 만들면 는다 · 0 이면 키가 없다. 새 게임 = `start_owned` 개수. 칸 구성은 편성이 든다
 *   heroes: [{uid, name, tier, sin, cls, trait, face, level, xp, mastery, masteryPoints, innate, stats, equipped:{position: itemUid|null}}],
 *     — tier = 매직 | 레어 | 유니크 (`hero_tier.csv`). ~~caps(개체별 히든 상한)~~ 는 **v15 에서 사라졌다** —
 *       상한이 전 영웅 공통 하나가 되어(hero_design §4-3) 개체가 들 것이 없다
 *     — face = 초상 id `'<classId>_<k>'` 문자열 | null. **제 직업 풀에서** 생성 시 한 번 굴리고 이후 불변 —
 *       innate 와 같은 층이다 (2026-09-06 저장형 · 2026-09-07 직업 분류). 풀이 0장인 직업(마법사)은 `null` = 초상 없음.
 *       로직은 그림을 모른다 — id 하나만 든다. 어느 파일인지는 화면이 정한다(`ui/mock.js:heroFace`).
 *       화면이 이름 해시로 매번 다시 계산하던 것을 저장으로 바꾼 것이다 (SCREEN_DESIGN §5 · DEV_PLAN 부채 #36)
 *     — innate = 고유 스킬 id. **생성 시 한 번 굴리고 이후 불변**이다 (hero_design §1).
 *       배정은 `skill.activesFor` 가 1번 칸에 싣는다 — 저장하는 건 굴린 결과 하나뿐
 *     — mastery = {nodeId: rank} 찍은 것만 담는다(0은 안 담는다) · masteryPoints = 남은 포인트.
 *       죄종·직업 마스터리가 한 풀을 공유한다 (skill_design §1-4). 전직 전용 포인트는 전직 미구현이라 없다
 *     — position = 착용 위치 id. 부위 7종 · 위치 8개 (반지 ×2 = ring1/ring2, 나머지는 부위 id 그대로).
 *       보조(offhand)는 2026-09-01 한손 개념 폐지와 함께 사라졌다
 *   presets: [{party: [uid], formation: {tpl, ranks}, potionSlots: [potionId|null], tactics: {slots}}], preset: n, items: {uid: item}, bag: [uid],
 *     — presets = **편성**(v32 · R122 · 길이 = `limitsOf(state).presets` — 원정 랭크가 연다 · R156) · preset = 고른 편성 번호(1 부터).
 *       party = **편성한 순서 그대로** · `party[0]` 이 리더 · **새 게임은 전부 빈 배열**이다 (2026-09-09).
 *       **한 영웅은 한 편성에만 든다 — v38** [2026-09-23 · 다부대] — 편성이 곧 부대라 겹치면 한 사람이 두 부대에 선다.
 *       `toggleParty` 가 넣을 때 다른 편성에서 빼고(이동), 로드도 같은 규칙으로 걸러 낸다 (옛 규칙 = 여러 편성에 들어도 됨)
 *       potionSlots = 물약 칸 구성(길이 = `potion_slot_max` · null = 빈 칸) — 런을 열 때 재고에서 앞 칸부터 채운다 (R124)
 *       tactics = **이 편성의 파티 전술 칸**(v34 · R129) — 아래 옛 `tactics` 와 같은 모양이고 편성마다 한 벌이다
 *     — items[*].proc = **목걸이 발동 스킬** `{trigger, skill, v}` (목걸이만 · v33 · 2026-09-21 · ⚠ 전투는 안 읽는다 — 설명에만).
 *     — items[*].skill = **무기가 담은 액티브 id** | null (무기만 · v18 신설 2026-09-09).
 *       드롭 때 그 무기군의 **직업 풀**에서 굴려 개체에 박는다 — 액티브 2번 칸의 입력이다
 *       (skill_design §12-1 규칙 3 · `skill.activesFor` 의 `ctx.weaponSkill`)
 *   progress: {cleared: [stageId], levelUp: {stageId: n}},   // levelUp = 스테이지별 올린 양 — 없으면 {} (2026-09-14 · R87 · 버전 무변경)
 *   codexKills: {monsterId: n}   — **도감 레벨의 출처** — 누적 처치 수 (monster_design §8 · 2026-09-21 카드 → 처치 수)
 *   counters: {hero, item, battle, tavern, tactic, upgrade, search, make, gamble, commission},   // upgrade 는 R95(2026-09-15)부터 안 오른다 — 강화가 rng 를 안 쓴다 · make = 제작 회차(R96 · 없으면 0) · gamble = 도박장 판 수(R149 · 없으면 0) · commission = 굴린 의뢰 카드 수(R153 · 없으면 0)
 *   commissions: {cards: [{no, tpl, kind, axis, ref, need, grade, gold, have?}]}   — **의뢰 게시판** (R153 · 버전 무변경 · base_expedition_design §1-3).
 *     자리 순서 그대로 · **굴린 순간의 내용을 박는다**(대상 풀이 그때의 진행에 달려 있다 — 수색 스냅샷과 같은 이유) · `have` 가 있으면 받아 둔 것 · 없으면 게시판에 걸린 것
 *   runs: [{stageId, preset, repeat, lastAt, durationSec, active, fallen?} | null],   // **부대마다 하나 — v38** [2026-09-23 · 다부대 · GAME_DESIGN §1-1] — 옛 `run`(단수) 대체.
 *     길이 = presets 와 같고 **자리 + 1 = 편성 번호**(부대 = 편성이다) · 안 나간 편성은 null · 동시에 active 일 수 있는 수는 `limitsOf(state).expeditions`.
 *     active = 그 부대가 도는 중(v25 · R89) — 불러온 세이브에 서 있으면 끊긴 원정이다 · preset = 나간 편성 번호(자리와 같다 · v32) ·
 *     fallen = 이 런에서 쓰러져 있는 영웅(R130 · 없으면 [] — 옛 v16 `downed` 와 다른 필드)
 *   reports: [{...}]             — 리포트 목록. **최신이 맨 앞**이고 [balance.csv:report_keep] 개까지 남는다 (v21).
 *     반복 원정은 이기는 동안 런을 잇는데, 칸이 하나면 앞 런이 매번 덮여 사라졌다 (SCREEN_DESIGN §4-3)
 *   notice: {kind:'runClosed', runs: [{stageId, at}], stageId, at, seenAt} | null   — 재접속 알림 (배너 1회).
 *     `runs` = **끊은 부대마다 한 줄 — v38**(편성 번호 순) · `stageId`·`at` 은 그중 첫 줄을 그대로 둔 것이다(한 부대만 돌던 화면이 안 깨지게)
 *   tavern: {rerolledAt: ms|null, hired: [슬롯번호]}         — 리롤 쿨다운의 기준 시각 · 이번 명단에서 산 칸.
 *     명단 자체는 저장하지 않는다(시드+카운터로 재현) — 저장하는 건 「언제 갈았나」와 「몇 번 칸을 샀나」뿐이다
 *   search: {heroUid, startedAt: ms, no, sin, cha, answer: 답 id|null} | null   — 나가 있는 수색 1건 (base_expedition_design §2-4).
 *     `answer` = 만남에서 고른 답. **고용비만 깎는다** — 결과 영웅은 안 건드리므로 언제 답하든 같은 사람이 온다.
 *     결과도 이야기도 저장하지 않는다 — `no`(= 그때의 `counters.search`)와 시드가 재현한다. 명단과 같은 문법이다.
 *     ⚠ **판정 입력(`sin`·`cha`)을 보낼 때 함께 박는다** — 수색 중에 그 영웅이 레벨업해도 결과가 뒤바뀌면 안 된다.
 *     「보낼 때의 그 사람이 물어온 결과」가 계약이라 스냅샷이 세이브에 든다.
 *     **버전을 안 올린 필드다** — 없으면 `null`(= 수색을 한 적이 없다)이고 그것이 정확한 초기 상태라
 *     이관이 소급할 판단이 하나도 없다 (v5 의 `tavern` 은 「쿨다운이 열린 상태」라는 판단이 필요했다 · INTERFACE §4)
 *   presets[*].tactics: {slots: {칸번호: {id, grade}}, locked: [칸번호]}   — **리롤로 바꾼 칸만** 담는다 (v34 부터 편성마다 · 그 전엔 최상위 `tactics` 하나).
 *     안 담긴 칸은 시드에서 파생되는 첫 배정이다(tactic.initialAssign · **모든 편성이 같다**) — 선술집 명단과 같은 규칙:
 *     저장하는 건 「플레이어가 바꾼 것」뿐이고 나머지는 시드가 재현한다. 열린 칸 수는 계정(합산 레벨)이라 세이브에 없다.
 *     `locked` = **잠근 칸 번호 — v35** [2026-09-22 · R28] · 편성마다 · 전체 리롤이 건너뛰고 비용은 그 개수가 정한다 (tactic_card_design §5-6)
 *   bonds: {"uid|uid|uid": n}   — **같이 나간 런 수 — v36** [2026-09-22 · R134] · 키 = 나간 인원의 uid 를 정렬해 이은 것 · 출발할 때 +1.
 *     전술 「관계」 조건이 읽는다(tactic_card_design §5-8) · 한 명이라도 바뀌면 다른 키다
 *   buildings: {buildingId: rank}   — **건물 랭크 — v37** [2026-09-22 · R137 · construction_draft §11] · 0 은 안 적는다.
 *     **「무엇이 열렸나」는 저장하지 않는다** — `construction.js` 가 부를 때마다 표에서 센다(표를 고치면 옛 세이브도 따른다)
 *   research: {researchId: level}   — 연구 레벨(v37 · 지금은 항목이 없어 언제나 {})
 *   progress.peakTotal              — 로스터 합산 레벨의 **도달 최고치**(v37) — 해고가 합산을 내리기 전에 적는다(건설 문턱 `total:`)
 * }
 *
 * **버전** — `deserialize` 는 **v38 만 연다** [2026-09-23 · 사용자 지시 「끊어」 · 다부대] — 그 전 세이브(v1 ~ v37)는 던지고 시작 화면이 새 게임으로 받는다.
 *   v37 에서 한 번 끊고(2026-09-22 · R139) 이관 틀을 통째로 지운 직후라, `run` → `runs` 하나 때문에 그것만 되살리는 것보다 끊는 쪽이 깨끗하다.
 *   v39 가 생기면 `deserialize` 안에서 한 단계씩 올린다 (INTERFACE §4)
 */

import { makeRng, deriveSeed } from './rng.js';
// 건설 어휘 — 창구가 모르는 이름을 거절하는 데만 쓴다(시스템 주입이 아니다 · skill_effects.js 와 같은 취급)
import { TARGETS as CN_TARGETS } from './construction.js';
// 의뢰 어휘 — 로드가 모르는 어휘의 카드를 거르는 데만 쓴다(같은 취급 · R153)
import { AXES as CM_AXES } from './commission.js';

export const SAVE_VERSION = 38;

/**
 * @param {object} deps
 *   hero, item, battle, skill, tactic — 각 시스템 / balance / equipSlots [{id, part}] (착용 위치 8개) / stages(byId) / stageOrder [id...]
 *   monsters(byId) / codex {levels:[kills_total...](codex_level.csv 레벨순 — 누적 처치 문턱), bonus:[레벨별 보정 — 비율](codex_level.csv:bonus_pct), statByNum:{stage_num: statKey}(codex_series.csv)}
 *   sins [죄종 id...] — 수색 이야기의 `sin` 컬럼 검증에만 쓴다
 *   searchStories — `search_story.csv` 파싱 행. **막의 어휘도 순서도 코드에 없다** — 아래 `searchPhases` 참조
 *   searchMeetings / searchAnswers — `search_meeting.csv` · `search_answer.csv` 파싱 행 (만남 · 답)
 *   makeRecipes {part: {ore, timber, dust}} (make_recipe.csv) · mineNodes / logNodes — 재료 단계 표 [{id, tier, yieldId, …}] (제작 · R96)
 *   potions [{id, kind, tier, ko, en, heal, craftGold, startOwned}] (potion.csv 행 순서) — 물약 단계 표 · startOwned = 시작 개수 (battle_design §7-1 · item_design §7-4 · R103 · R124) · 만들 수 있는 단계는 제련소 랭크가 연다(R137)
 *   construction — 건설 시스템(`construction.js` · 표 넷을 든다 · INTERFACE §2-14 · R137)
 *   gamble — 도박장 슬롯(`gamble.js` · 표 넷을 든다 · 한 판을 굴린다 · INTERFACE §2-15 · R149)
 *   commission — 의뢰(`commission.js` · 표 넷을 든다 · 카드 한 장을 굴리고 처치 · 드롭을 대조한다 · INTERFACE §2-16 · R153)
 *   openAll — `() → bool` 선택 · **개발 장치**(관리자 모드) — 켜져 있으면 「무엇이 열렸나」가 모든 건물을 최대 랭크로 친다(`openRanks`) · 스테이지도 전부 열린다(`stageUnlocked` · INTERFACE §2-7)
 */
export function createGameSystem(deps) {
    const { hero: H, item: I, battle: BT, skill: SK, tactic: TC, construction: CN, gamble: GB, commission: CM, balance: B } = deps;
    const clone = v => JSON.parse(JSON.stringify(v));

    const positions = deps.equipSlots.map(s => s.id);
    const positionsOf = part => deps.equipSlots.filter(s => s.part === part).map(s => s.id);

    /* ── 수색 이야기 — `search_story.csv` (2026-09-09 신설 · base_expedition_design §2-4) ──
       **막을 늘리는 일이 CSV 행 추가뿐이어야 한다.** 그래서 막의 어휘도 순서도 코드에 없다:
       막 = `phase` 종류이고 순서는 `phase_order` 가 정한다. 코드가 아는 것은 「막마다 한 줄을 굴린다」뿐이다.
       (`tactic_slot.csv` 의 「칸 수 = 행 수」와 같은 문법 — 표가 구조를 든다) */
    const storyRows = deps.searchStories ?? [];
    const searchPhases = (() => {
        const bad = why => { throw new Error(`search_story: ${why}`); };
        if (!storyRows.length) bad('행이 없다');
        const order = new Map();
        for (const r of storyRows) {
            if (!r.story_id) bad('story_id 가 없다');
            if (!r.phase) bad(`${r.story_id} — phase 가 없다`);
            if (!(r.phase_order >= 1)) bad(`${r.story_id} — phase_order ${r.phase_order}`);
            if (r.sin !== '-' && !(deps.sins ?? []).includes(r.sin)) bad(`${r.story_id} — 죄종 '${r.sin}'`);
            if (!r.text_kr || !r.text_en) bad(`${r.story_id} — 문구가 비었다`);
            const had = order.get(r.phase);
            if (had !== undefined && had !== r.phase_order) bad(`${r.phase} 의 phase_order 가 둘이다 (${had} · ${r.phase_order})`);
            order.set(r.phase, r.phase_order);
        }
        const list = [...order.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
        list.forEach((id, i) => { if (order.get(id) !== i + 1) bad(`phase_order 가 1부터 연속이 아니다 (${id} = ${order.get(id)})`); });
        // 막마다 **공통(`-`) 행이 하나는 있어야** 어느 죄종이 와도 후보가 비지 않는다 — 「막마다 굴림 1회」의 전제다
        for (const id of list) if (!storyRows.some(r => r.phase === id && r.sin === '-')) bad(`${id} 에 공통(-) 행이 없다`);
        return list;
    })();
    /** 그 막에서 이 죄종이 뽑을 수 있는 줄 — 공통 + 제 죄종. **CSV 행 순서가 굴림 순서다** (INTERFACE §5-2) */
    const storyPool = (phase, sin) => storyRows.filter(r => r.phase === phase && (r.sin === '-' || r.sin === sin));

    /* ── 수색 만남 — `search_meeting.csv` · `search_answer.csv` (2026-09-09 신설 · ADR-0068) ──
       **컬럼 둘이 서로 다른 질문에 답한다**, 이것이 이 표의 전부다:
         · `need_sin` — **누가 갔느냐.** 그 죄종을 보냈을 때만 이 답이 **보인다**(`-` 는 언제나 보임)
         · `hit_sin`  — **누구를 만났느냐.** 만난 사람의 죄종과 같으면 이 답이 **먹힌다**
       그래서 보상이 두 층이다: 소문을 읽고 맞히면 `meet_hit_pct` · 맞는 죄종을 보내서 연 답이면 `meet_key_pct`.
       (Wartales 의 「관계 좋은 동료가 자기 선택지를 빌려준다」 · FTL 의 「장비를 갖추면 안전 선택지가 생긴다」와 같은 문법) */
    const meetRows = deps.searchMeetings ?? [];
    const answerRows = deps.searchAnswers ?? [];
    (() => {
        const bad = why => { throw new Error(`search_meeting: ${why}`); };
        if (!meetRows.length) bad('행이 없다');
        const sins = deps.sins ?? [];
        const seen = new Set();
        for (const m of meetRows) {
            if (!m.meeting_id || seen.has(m.meeting_id)) bad(`meeting_id '${m.meeting_id}'`);
            seen.add(m.meeting_id);
            if (!sins.includes(m.sin)) bad(`${m.meeting_id} — 죄종 '${m.sin}'`);
            if (!m.rumor_kr || !m.rumor_en || !m.prompt_kr || !m.prompt_en) bad(`${m.meeting_id} — 문구가 비었다`);
        }
        const aSeen = new Set();
        for (const a of answerRows) {
            if (!a.answer_id || aSeen.has(a.answer_id)) bad(`answer_id '${a.answer_id}'`);
            aSeen.add(a.answer_id);
            if (!seen.has(a.meeting_id)) bad(`${a.answer_id} — 없는 만남 '${a.meeting_id}'`);
            if (a.need_sin !== '-' && !sins.includes(a.need_sin)) bad(`${a.answer_id} — need_sin '${a.need_sin}'`);
            if (!sins.includes(a.hit_sin)) bad(`${a.answer_id} — hit_sin '${a.hit_sin}'`);
            if (!a.answer_kr || !a.answer_en) bad(`${a.answer_id} — 문구가 비었다`);
        }
        // 만남마다 **누구나 보이는 답이 최소 하나** — 없으면 그 죄종을 안 보낸 판에서 고를 것이 0개가 된다
        for (const m of meetRows)
            if (!answerRows.some(a => a.meeting_id === m.meeting_id && a.need_sin === '-'))
                bad(`${m.meeting_id} 에 공통(-) 답이 없다`);
    })();
    /** 그 만남에서 이 죄종이 **볼 수 있는** 답 — 공통 + 보낸 영웅의 죄종으로 열린 것 */
    const answersFor = (meetingId, sentSin) =>
        answerRows.filter(a => a.meeting_id === meetingId && (a.need_sin === '-' || a.need_sin === sentSin));

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
    /**
     * 시작 장비 한 벌 — **일반 무기 + 일반 갑옷**을 입힌다 (hero_design §1). 새 게임의 시작 영웅과 **선술집에서 온 영웅**(명단 · 수색)이 같은 한 벌이다 [2026-09-25 사용자 지시].
     *   무기 → 갑옷 — **이 순서가 계약이다**(INTERFACE §5-2). 무기 스킬 풀에서 고유 스킬을 빼도 소비 수는 같다 · 바로 입으므로 가방 칸을 안 먹는다
     */
    function equipStarter(state, h, rng) {
        const w = addItem(state, I.startingWeapon(rng, h.cls, h.innate));
        h.equipped.weapon = w.uid;
        const a = addItem(state, I.startingArmor(rng));
        h.equipped.armor = a.uid;
    }

    /**
     * 새 게임 — 확정한 시작 영웅 3명이 곧 로스터다. 각자 **일반 무기 + 일반 갑옷**을 입고 시작한다 [개정 2026-09-14 · R86 · hero_design §1] —
     *   무기는 제 직업 스킬이 붙는 무기군이고 **그 영웅의 고유 스킬과 같은 스킬을 담지 않는다**.
     * **파티는 비어 있다** [사용자 지시 2026-09-09 · SCREEN_DESIGN §5] — ~~로스터가 곧 파티~~ 폐기.
     *   자동으로 채우면 플레이어가 **편성을 한 번도 안 하고** 첫 원정을 떠나므로 편성이 결정이라는 것을 배울 자리가 없다.
     *   **처음 고른 영웅이 리더**가 되는 것은 새 규칙이 아니다 — `party` 는 넣은 순서 그대로이고 리더는 `party[0]` 이다.
     * ⚠ 전투를 바로 돌리는 쪽(골든 · 단정 · `?dev=battle|play|offline`)은 **직접 안 채운다** [2026-09-21 · ADR-0227] — 편성 1 이 이미 차 있어서
     *   `toggleParty` 를 또 부르면 **빼기로 뒤집힌다**
     */
    /**
     * 「무엇이 열렸나」가 세는 랭크 — 세이브의 `buildings` · **`deps.openAll()` 이 켜져 있으면 모든 건물의 최대 랭크** [2026-09-24 · 개발 장치 — 관리자 모드 · INTERFACE §2-7].
     *   세는 자리는 셋이다(`limitsOf` · `hasFeature` · `constructionState.tabs`). 짓기 쪽(건설 탭의 랭크 · 다음 랭크 · `construct`)은 안 거친다 — 실제 랭크를 본다.
     *   스테이지는 이 랭크가 아니라 `stageUnlocked` 가 `openAll()` 을 직접 본다(장 잠금 · 직전 클리어를 같이 건너뛴다)
     */
    const openAll = deps.openAll ?? (() => false);
    const maxRanks = Object.fromEntries(CN.list.map(b => [b.id, b.maxRank]));
    const openRanks = state => (openAll() ? maxRanks : state?.buildings ?? CN.startRanks());
    /**
     * 상한 — **이 세이브가 쓸 수 있는 칸 · 인원 · 단계의 수를 여기 한 곳이 답한다** [신설 2026-09-22 · INTERFACE §2-7 · construction_draft §9].
     *   bag 가방 · stash 창고 · roster 로스터 · party 파티 인원 · presets 편성 수 · **expeditions 동시 원정 부대 수**(v38 · 편성 수를 넘지 않는다) · potionSlots 물약 칸 · upgrade 강화 단계 ·
     *   tavernCandidates 고용 후보 · searchSlots 동시 수색 · shopPerSlot · shopWeapon 상단 장비 목록(부위마다 · 무기) · commissionSlots 동시 의뢰(R153)
     *   makeLevels 열린 제작 레벨 수 · potionTier 만들 수 있는 물약 단계 · tacticSlots 열린 전술 칸 수 · **chapters 들어갈 수 있는 장**(원정 랭크 · R152) — 이 넷은 기본값이 0 이다(건물만 연다)
     * **값 = balance.csv 기본값 + 지어진 건물 랭크의 더하기** [2단계 2026-09-22 · R137 · construction_draft §11-2] — 기본값은 **건설 전** 값이고
     *   더하기는 `building_effect.csv` 가 든다(이름이 같은 키에 붙는다 · 단계 셋은 `ADD_KEY`). 판정 · 불러오기 · 전투 입력 · 강화 비용 · 화면이 모두 이것을 읽는다.
     * `state` 가 null 이면(새 게임을 만드는 도중) **시작 랭크**(`building.csv:start_rank`)의 상한이다 · 관리자 모드면 모든 건물의 최대 랭크다(`openRanks`)
     */
    function limitsOf(state) {
        const out = {
            bag: B.inventory_cap, stash: B.stash_cap, roster: B.roster_cap, party: B.party_size_max,
            presets: B.party_preset_count, expeditions: B.concurrent_expedition_parties,
            potionSlots: B.potion_slot_max, upgrade: B.equip_upgrade_max,
            tavernCandidates: B.tavern_candidates, searchSlots: B.tavern_search_slots,
            shopPerSlot: B.shop_equip_per_slot, shopWeapon: B.shop_equip_weapon,
            makeLevels: 0, potionTier: 0, tacticSlots: 0,
            gambleStakes: B.gamble_stake_steps,   // 도박장 판돈 단계 — 선술집 뒤 랭크가 더한다 (R149)
            chapters: 0,   // 들어갈 수 있는 장 — 건물만 연다(원정 랭크마다 +1 · r1 은 처음부터 지어져 1장) (2026-09-24 · R152)
            commissionSlots: B.commission_slots,   // 동시에 받아 둘 수 있는 의뢰 — 더하기 대상이지만 지금 표엔 늘리는 랭크가 없다 (R153 · R162)
        };
        for (const [target, n] of Object.entries(CN.opened(openRanks(state)).adds)) {
            const key = ADD_KEY[target] ?? target;
            if (key in out) out[key] += n;      // 준비 중인 더하기(일꾼 칸 등)는 붙을 상한이 아직 없다
        }
        // 부대는 편성 하나에 하나다 — 편성보다 많은 부대를 낼 수 없다 [2026-09-23 · 다부대]
        out.expeditions = Math.min(out.expeditions, out.presets);
        return out;
    }
    /** 더하기 대상 이름 → 상한 키 — 표의 단계 셋만 이름이 다르다(나머지는 같은 이름에 붙는다) */
    const ADD_KEY = { make_level: 'makeLevels', potion_tier: 'potionTier', tactic_slots: 'tacticSlots', commission_slots: 'commissionSlots' };

    function newGame(seed, candidates, now) {
        const state = {
            version: SAVE_VERSION, seed: seed >>> 0, createdAt: now, savedAt: now,
            playMs: 0,       // 누적 플레이 시간 — 화면이 보이는 동안만 더한다(`addPlayTime` · ADR-0356)
            resources: { gold: B.start_gold, dust: B.start_dust, stigma: B.start_stigma },
            materials: {},   // 제작 재료(광석 · 목재) — 파견이 채운다(미구현 · R96)
            potions: startStock(),     // 물약 재고 — 새 게임은 `potion.csv:start_owned` 개수를 갖고 시작한다 (R103 · 개수 R124)
            heroes: [], items: {}, bag: [], stash: [],
            progress: { cleared: [], levelUp: {}, peakTotal: 0 },   // levelUp = 스테이지별 **올린 양** — 안 올린 스테이지는 안 적는다 (2026-09-14 · R87) · peakTotal = 합산 레벨 도달 최고치(v37)
            codexKills: {},
            counters: { hero: 0, item: 0, battle: 0, tavern: 0, tactic: 0, upgrade: 0, search: 0, make: 0, gamble: 0, commission: 0 },
            runs: newRuns(), reports: [], notice: null,   // 부대마다 한 자리 — 안 나간 편성은 null (v38 · 다부대)
            tavern: { rerolledAt: null, hired: [] },
            search: null,
            // 의뢰 게시판 — 빈 채로 시작한다. 선술집을 짓고 화면이 그릴 때 `commissionFill` 이 채운다 (R153)
            commissions: { cards: [] },
            // 편성 — **편성 1 에 시작 영웅 셋**(아래에서 채운다 · ADR-0227) · 편성 2 부터는 빈 파티다.
            //   물약 칸도 **편성 1 에만** 시작 물약이 한 칸씩 든다 (v32 · R122 · R124)
            presets: newPresets(), preset: 1,     // 전술 칸도 편성마다 든다(`presets[*].tactics` · v34 · R129)
            bonds: {},                            // 같이 나간 런 수 — 전술 「관계」 조건 (v36 · R134)
            // 알아서 분해의 선 — 둘 다 안 봄 = 꺼짐이 기본값이다 (item_design §6-5 · R125)
            autoSalvage: { rarity: null, ilvlBelow: 0 },
            // 건설 — **시작 랭크**(`building.csv:start_rank` · 처음부터 지어진 건물) · 연구는 빈 채 (v37 · R137 · construction_draft §4)
            buildings: CN.startRanks(), research: {},
        };
        const rng = makeRng(deriveSeed(state.seed, 0));
        // 영웅마다 무기 → 갑옷 — 한 스트림을 로스터 순서로 이어 쓴다(INTERFACE §5-2)
        for (const c of candidates) equipStarter(state, addHero(state, clone(c)), rng);
        // 모든 새 게임에 고블린 일꾼 한 명을 준다. 기존 시작 파티 뒤에 넣어 첫 편성은 그대로 둔다.
        addHero(state, {
            name: { ko: '고블린 일꾼', en: 'Goblin Worker' },
            tier: 'normal', sin: 'greed', cls: 'warrior',
            trait: { ko: '집사', en: 'Butler' }, face: 'goblin_butler',
            level: 1, xp: 0, mastery: {}, masteryPoints: 0, innate: null,
            stats: { str: 5, agi: 5, int: 5, vit: 5, luck: 5, ldr: 5, cha: 5 },
            equipped: {},
        });
        // **편성 1 = 로스터 순서** [2026-09-21 사용자 지시 · ADR-0227 · ~~빈 파티~~ 2026-09-09 폐기] — 첫 원정을 떠날 편성이
        //   처음부터 서 있다. 리더 규칙은 그대로다(`party[0]` = 먼저 넣은 영웅 = 로스터 첫 영웅).
        //   진형은 `normalizeFormation` 이 파티 순서대로 앞 랭크부터 채운다 — **rng 0 회**라 전투 결과가 안 흔들린다
        const first = state.presets[0];
        first.party = state.heroes.slice(0, limitsOf(state).party).map(h => h.uid);
        normalizeFormation(first);
        return state;
    }

    const serialize = (state, now) => ({ ...clone(state), version: SAVE_VERSION, savedAt: now });

    /**
     * 누적 플레이 시간에 더한다 [2026-09-25 · ADR-0356 · INTERFACE §2-7] — in-place · 새 누적 값을 돌려준다.
     * **0 이하 · 유한수가 아닌 값은 무시**한다(시계가 뒤로 가도 줄지 않는다). 무엇을 더할지(보이는 동안만 · 절전 공백 제외)는 부르는 쪽이 정한다
     */
    function addPlayTime(state, ms) {
        if (Number.isFinite(ms) && ms > 0) state.playMs = (state.playMs ?? 0) + ms;
        return state.playMs ?? 0;
    }

    /**
     * 이 세이브를 열 수 있는가 — **판정의 권한은 `deserialize` 하나다.**
     * 받아들이는 버전 목록을 두 곳에 두면 이관을 늘릴 때마다 화면이 멀쩡한 세이브를 거부한다
     *   (시작 화면이 `version !== SAVE_VERSION` 으로 직접 판정하다 v2 부터 그 증상이 있었다).
     */
    function canLoad(obj) {
        try { deserialize(obj); return true; } catch { return false; }
    }

    /** **v38 만 연다** — 그 전은 끊었다(2026-09-23 · 다부대 · 파일 머리 참조). 다음 버전이 생기면 여기서 한 단계씩 올린다 */
    function deserialize(obj) {
        if (!obj || typeof obj !== 'object') throw new Error('save: not an object');
        if (obj.version !== SAVE_VERSION)
            throw new Error(`save: version ${obj.version} (expected ${SAVE_VERSION})`);
        const s = clone(obj);
        for (const h of s.heroes) h.equipped = { ...emptyEquip(), ...h.equipped };
        // 고정 지급 캐릭터의 옛 이름을 이미 저장된 세이브에서도 갱신한다.
        for (const h of s.heroes) if (h.face === 'goblin_butler' && h.name?.ko === '집사 고블린')
            h.name = { ko: '고블린 일꾼', en: 'Goblin Worker' };
        // 마스터리 — **표에 맞춘다** [2026-09-22 · R138 · 버전 무변경] — 그 영웅의 트리에 없는 노드(표에서 걷힌 칸)와 상한을 넘은 랭크는
        //   포인트로 돌려준다. 롤백이 무료라(skill_design §5) 돌려주는 것이 곧 이관이고, 남겨 두면 못 빼는 포인트가 된다
        for (const h of s.heroes) {
            const own = new Map(H.masteryNodesFor(h).map(n => [n.id, n]));
            for (const [id, r] of Object.entries(h.mastery ?? {})) {
                const keep = Math.min(r, own.get(id)?.maxRank ?? 0);
                if (keep === r) continue;
                h.masteryPoints = (h.masteryPoints ?? 0) + (r - keep);
                if (keep > 0) h.mastery[id] = keep; else delete h.mastery[id];
            }
        }
        // 도감 카드는 걷혔다 [2026-09-21 · 버전 무변경] — 레벨은 이미 있던 `codexKills` 에서 다시 계산되므로 소급할 판단이 없다 · 필드만 지운다 (INTERFACE §4)
        delete s.codexCards; s.codexKills = s.codexKills ?? {};
        s.reports = s.reports ?? []; s.notice = s.notice ?? null;
        s.tavern = s.tavern ?? { rerolledAt: null, hired: [] };
        // 수색 — 없으면 「한 적이 없다」가 정확한 초기 상태라 **버전을 안 올린다** (INTERFACE §4 · 2026-09-09)
        s.stash = s.stash ?? [];       // 창고 — v24. 없던 세이브는 빈 채로 열린다
        s.progress.levelUp = s.progress.levelUp ?? {};   // 스테이지 레벨 — 없으면 「아무것도 안 올렸다」가 정확한 초기 상태라 버전을 안 올린다 (INTERFACE §4 · R87)
        s.search = s.search ?? null;
        if (s.search) s.search.answer = s.search.answer ?? null;   // 만남 이전에 나간 수색 (2026-09-09)
        s.counters.search = s.counters.search ?? 0;
        // 제작 재료 · 회차 — 없으면 「가진 재료가 없다 · 만든 적이 없다」가 정확한 초기 상태라 버전을 안 올린다 (INTERFACE §4 · R96)
        s.materials = s.materials ?? {};
        s.counters.make = s.counters.make ?? 0;
        // 도박장 판 수 — 없으면 「돌린 적이 없다」가 새 게임과 같은 초기 상태라 버전을 안 올린다 (INTERFACE §4 · R149).
        //   충전 시계 `gamble` 은 같은 날 나갔다(횟수 제한 없음 · ADR-0334) — 읽는 곳이 없어 필드만 지운다
        delete s.gamble;
        s.counters.gamble = s.counters.gamble ?? 0;
        // 의뢰 — 없으면 「게시판을 굴린 적이 없다」가 새 게임과 같은 초기 상태라 버전을 안 올린다 (INTERFACE §4 · R153).
        //   모르는 어휘의 카드는 지운다 — 표가 바뀌어 셀 수 없는 카드가 자리를 막지 않게(빈 자리는 다음 채우기가 굴린다)
        s.counters.commission = s.counters.commission ?? 0;
        s.commissions = { cards: (Array.isArray(s.commissions?.cards) ? s.commissions.cards : []).filter(c => c && CM_AXES[c.axis]) };
        // 물약 재고 — 개수 표다. 모양이 틀리면 시작 재고로 연다 (INTERFACE §4 · R124)
        if (!s.potions || typeof s.potions !== 'object' || Array.isArray(s.potions)) s.potions = startStock();
        // 건설 — **표에 맞춘다**(없는 건물은 지우고 최대 랭크에서 자르고 시작 랭크보다 낮으면 올린다 · 연구도 없는 항목을 지운다) (v37 · R137).
        //   「무엇이 열렸나」를 저장하지 않으므로 표가 바뀌어도 이관이 필요 없다 — 여기서 랭크만 표의 범위로 들인다.
        //   **편성보다 먼저** 맞춘다 — 편성 수 · 물약 칸 수가 건물 랭크의 더하기를 읽는다(`limitsOf` · 2단계)
        s.buildings = CN.fitRanks(s.buildings);
        s.research = CN.fitResearch(s.research);
        // 편성 — **편성 수 · 칸 수를 그 세이브의 상한에 맞춘다**(모자라면 빈 편성 · 빈 칸을 붙이고 넘치면 뒤를 자른다) · 고른 번호는 범위로 자른다 (INTERFACE §2-7 · R122)
        s.presets = fitPresets(s, s.presets);
        s.preset = Math.min(limitsOf(s).presets, Math.max(1, Number.isInteger(s.preset) ? s.preset : 1));
        // 한 영웅은 한 편성에만 든다 — 겹치면 **앞 편성이 갖는다** (v38 · 다부대 · `toggleParty` 와 같은 규칙)
        dedupeParties(s);
        // 부대 — 편성 수에 맞춘다(넘치면 뒤를 자르고 모자라면 빈 자리를 붙인다). 도는 채로 저장된 부대는 **끊긴 것**이라 `closeRun` 이 걷는다 (v38)
        s.runs = fitRuns(s, s.runs);
        // 알아서 분해 — 없으면 「꺼짐」이 새 게임과 같은 초기 상태라 버전을 안 올린다 (INTERFACE §4 · R125)
        s.autoSalvage = { rarity: null, ilvlBelow: 0, ...(s.autoSalvage ?? {}) };
        // 같이 나간 런 수 — 1 이상 정수만 남긴다 (v36 · R134)
        s.bonds = Object.fromEntries(Object.entries(s.bonds && typeof s.bonds === 'object' ? s.bonds : {}).filter(([, n]) => Number.isInteger(n) && n > 0));
        s.progress.peakTotal = Number.isInteger(s.progress.peakTotal) && s.progress.peakTotal > 0 ? s.progress.peakTotal : 0;
        // 플레이 시간 — 없으면 0 부터 센다. 흘러간 몫은 기록이 없어 소급할 판단이 없다 → 버전을 안 올린다 (INTERFACE §4 · ADR-0356)
        s.playMs = Number.isFinite(s.playMs) && s.playMs > 0 ? s.playMs : 0;
        return s;
    }

    /* ── 조회 ── */

    const heroById = (state, uid) => state.heroes.find(h => h.uid === uid);
    const heroItems = (state, h) => Object.values(h.equipped).filter(Boolean).map(uid => state.items[uid]).filter(Boolean);
    /**
     * 착용 무기의 무기군 — **액티브 2번 칸(무기군)의 입력**이다 (skill_design §2 · `skill.activesFor`).
     * 장비를 아는 층은 여기뿐이라 이 조회도 여기 있다 — `skill.js` 는 아이템을 모른다.
     * 맨손이면 `null` 이고, 그러면 그 칸이 빈다.
     */
    const weaponGroupOf = (state, h) => {
        const w = h?.equipped?.weapon ? state.items[h.equipped.weapon] : null;
        return w?.group ?? null;
    };
    /**
     * 착용 무기가 **담은 스킬** — 액티브 2번 칸의 입력이다 [개정 2026-09-09 · skill_design §12-1 규칙 3].
     * ~~무기군이 스킬을 정하던 것~~(`weaponGroupOf`)을 대체한다 — 이제 스킬은 **무기 개체**에 박혀 있고
     *   같은 도끼라도 개체마다 다르다. 맨손이거나 옛 무기면 `null` 이고 그러면 그 칸이 빈다.
     */
    const weaponSkillOf = (state, h) => {
        const w = h?.equipped?.weapon ? state.items[h.equipped.weapon] : null;
        return w?.skill ?? null;
    };
    /* ~~`isOut(state, uid)`~~ 는 2026-09-08 삭제 — 「출정 아웃」 폐기(base_expedition_design §1-1 개정).
       아웃은 **그 런 안에서만** 산다(전투 유닛의 HP 0) — 전투 밖에 아웃된 영웅이 존재하지 않는다. */

    /* ── 도감 — 처치 수 모델 (monster_design §8 · 2026-09-21 카드 → 처치 수) ── */

    /**
     * 누적 처치 수 → 도감 레벨. codex_level.csv 의 kills_total 은 **누적 문턱**이라 그대로 비교한다
     * (~~cards_to_next — 레벨당 증분~~ 은 2026-09-21 대체). 처치 수는 줄지 않으므로 레벨은 역행하지 않는다.
     */
    function codexLevel(kills) {
        let lv = 0;
        for (const need of deps.codex.levels) {
            if (kills >= need) lv += 1; else break;
        }
        return lv;
    }
    /** 다음 레벨의 누적 처치 문턱 — 최종 레벨이면 null */
    function codexNext(kills) {
        return deps.codex.levels[codexLevel(kills)] ?? null;
    }
    const codexMaxLevel = () => deps.codex.levels.length;
    /** 레벨 lv 까지의 누적 보정 — 비율 (codex_level.csv:bonus_pct · R111) */
    const codexBonusAt = lv => deps.codex.bonus.slice(0, lv).reduce((a, b) => a + b, 0);

    /**
     * 도감 보너스 — 몬스터별 레벨 보정을 스테이지 번호가 정하는 계열 스탯에 합산한다.
     * 누적 객체의 키는 `codex.statByNum` 의 값들에서 만든다 — 계열 배정이 바뀌어도 여기를 고칠 필요가 없다.
     * ⚠ `computeCombat` 이 읽는 것은 `atk_pct` · `hp_pct` · `dmg_pct` 뿐이다. 명중 폐지(08-26)로
     *   스테이지 3 계열(`acc_pct`)은 갈 곳이 없다 — 재배정은 기획 결정 (GAME_DESIGN §10).
     */
    function codexBonus(state) {
        const out = Object.fromEntries(Object.values(deps.codex.statByNum).map(k => [k, 0]));
        for (const [id, kills] of Object.entries(state.codexKills)) {
            const m = deps.monsters[id];
            if (!m) continue;
            const key = deps.codex.statByNum[m.stage_num];
            if (key === undefined) continue;
            out[key] += codexBonusAt(codexLevel(kills));
        }
        return out;
    }

    /**
     * 전투 능력치 = 기본 능력치 + 장비 + 도감 + **파티 전술**.
     * 전술 보너스는 **파티에 든 영웅에게만** 붙는다 (tactic_card_design §1 「파티 단위」) — 조건이 편성을 세는데
     *   편성 밖 영웅이 그 결과를 받으면 인과가 깨진다. 벤치 영웅의 시트에 안 붙는 것이 맞다.
     * `party` = 그 「파티」 — 기본은 **고른 편성**이고(R122) **원정은 나간 인원**을 넘긴다 [2026-09-14 · R92]. 원정 중에도 편성을 바꾸므로
     *   편성을 읽으면 도는 원정의 전술이 라운드 경계에서 흔들린다
     * `no` = 전술 칸을 읽는 편성 — 기본은 고른 편성 · **원정은 나간 편성**을 넘긴다 (칸이 편성마다 · R129)
     * `tactic` = 전술 보너스를 **덮는다**(`{flat, dr}`) [2026-09-21 · R130] — 원정은 **출발 때 켜진 전술만** 산다(`departRun` 의 스냅숏)라
     *   `partyUnits` 가 그 보너스를 넘긴다. 안 주면 종전대로 편성 `no` 의 칸을 지금 센다
     */
    const heroCombat = (state, h, party = partyOf(state), no = state.preset, tactic) => H.computeCombat(h, heroItems(state, h).map(I.effective), codexBonus(state),
        party.includes(h.uid) ? (tactic ?? tacticBonus(state, party, no)) : null);

    /* ── 장비 ── */

    /** 착용 위치 — 같은 부위의 빈 위치가 있으면 거기, 없으면 첫 위치(교체). 위치가 둘인 부위는 반지뿐이다 */
    function equipTarget(hero, item) {
        const ps = positionsOf(item.slot);
        return ps.find(p => !hero.equipped[p]) ?? ps[0] ?? null;
    }

    /**
     * **「이 아이템을 끼면」** 전투 능력치 [2026-09-15 · INTERFACE §2-7] — 아이템 툴팁의 스킬 칸이 숫자를 **그 무기를 낀 영웅 기준**으로 낸다.
     * 자리는 `equipTarget` 이 고른다(가방 칸 클릭이 끼울 그 자리). 원본은 안 건드린다 — 영웅 · 상태의 얕은 사본으로 `heroCombat` 을 부른다.
     * 전술 조건도 사본으로 센다: 무기가 바뀌면 죄종 수 · 스킬 태그가 바뀌어 칸이 켜지고 꺼질 수 있다.
     * 다른 영웅이 그 아이템을 끼고 있으면 그 사본에서 뺀다 — 한 개체가 두 몸에 서지 않는다
     */
    function heroCombatIf(state, h, itemUid) {
        const w = wearing(state, h, itemUid);
        return w ? heroCombat(w.state, w.me) : heroCombat(state, h);
    }

    /**
     * 「그 아이템을 끼면」의 사본 — `heroCombatIf` · `runTacticsIf` 가 같이 쓴다. 자리는 `equipTarget` 이 고르고, 다른 영웅이 끼고 있으면
     *   그 사본에서 뺀다(한 개체가 두 몸에 서지 않는다). 원본은 안 건드린다. 이미 끼고 있거나 아이템이 없으면 null
     */
    function wearing(state, h, itemUid) {
        const it = state.items[itemUid];
        const pos = h && it && !Object.values(h.equipped).includes(itemUid) ? equipTarget(h, it) : null;
        if (!pos) return null;
        const off = x => Object.values(x.equipped).includes(itemUid)
            ? { ...x, equipped: Object.fromEntries(Object.entries(x.equipped).map(([p, u]) => [p, u === itemUid ? null : u])) } : x;
        const me = { ...h, equipped: { ...h.equipped, [pos]: itemUid } };
        return { state: { ...state, heroes: state.heroes.map(x => x.uid === h.uid ? me : off(x)) }, me };
    }

    /**
     * 도는 원정에서 쓰러져 있는 영웅인가 [2026-09-21 · R130 · base_expedition_design §1-5] — 그 런이 끝날 때까지 장비 · 스킬 트리를 못 바꾼다
     *   (쓰러진 영웅의 장비를 벗겨 산 영웅에게 넘기는 길을 막는다). `runs[*].fallen` 은 `stepRun` 이 적는다 · 원정이 안 돌면 거짓.
     *   **부대를 안 가린다** [2026-09-23 · 다부대] — 어느 부대에서든 쓰러져 있으면 잠긴다(한 영웅은 한 부대에만 서므로 답은 하나다)
     */
    const fallenOf = (state, uid) => (state.runs ?? []).some(r => r?.active === true && (r.fallen ?? []).includes(uid));

    /** 가방 → 착용. 그 위치의 착용품은 가방으로 (가방이 차면 실패). position 은 생략 가능.
     *  양손↔보조 배타는 2026-09-01 한손 개념 폐지로 사라졌다 — 되돌아오는 것은 언제나 그 자리에 있던 하나뿐이다 */
    /** 그 아이템이 어느 보관함에 있나 — 인벤토리(`bag`) / 창고(`stash`) / 없음(null) [v24] */
    const holderOf = (state, uid) =>
        state.bag.includes(uid) ? 'bag' : (state.stash ?? []).includes(uid) ? 'stash' : null;
    const capOf = (state, where) => (where === 'bag' ? limitsOf(state).bag : limitsOf(state).stash);

    function equip(state, heroUid, itemUid, position) {
        const h = heroById(state, heroUid), it = state.items[itemUid];
        if (h && fallenOf(state, heroUid)) return { ok: false, err: 'downed' };   // 다른 검사보다 먼저 (R130)
        const from = h && it ? holderOf(state, itemUid) : null;
        if (!from) return { ok: false, err: 'missing' };
        const why = I.canEquip(h, it);
        if (why) return { ok: false, err: why };
        const pos = position && positionsOf(it.slot).includes(position) ? position : equipTarget(h, it);
        if (!pos) return { ok: false, err: 'missing' };

        const back = [];
        if (h.equipped[pos]) back.push(h.equipped[pos]);
        // **교체품은 꺼낸 쪽으로 돌아간다** [v24] — 창고에서 낌 것을 인벤으로 돌려보내면
        // 인벤이 찼을 때 거절이 나서 「창고에서 바로 장착」(item_design §1)이 깨진다. 칸 수는 그대로다
        const list = from === 'bag' ? state.bag : state.stash;
        if (list.length - 1 + back.length > capOf(state, from)) return { ok: false, err: from === 'bag' ? 'bagFull' : 'stashFull' };

        const rest = list.filter(u => u !== itemUid);
        for (const u of back) rest.push(u);
        if (from === 'bag') state.bag = rest; else state.stash = rest;
        h.equipped[pos] = itemUid;
        return { ok: true, back, position: pos, from };
    }

    function unequip(state, heroUid, position) {
        const h = heroById(state, heroUid);
        if (h && fallenOf(state, heroUid)) return { ok: false, err: 'downed' };   // 쓰러진 영웅의 장비를 벗겨 넘기지 못한다 (R130)
        const uid = h?.equipped[position];
        if (!uid) return { ok: false, err: 'missing' };
        if (state.bag.length >= capOf(state, 'bag')) return { ok: false, err: 'bagFull' };
        h.equipped[position] = null;
        state.bag.push(uid);
        return { ok: true };
    }

    /** 분해 — 가방 · 창고 아이템을 몬스터 가루로 (착용 중인 것은 `missing` · 잠근 것은 `locked`) · 건물이 막지 않는다 (R140) */
    function salvage(state, itemUid) {
        const it = state.items[itemUid];
        const from = it ? holderOf(state, itemUid) : null;   // 창고 것도 분해된다 [v24 · item_design §1]
        if (!from) return { ok: false, err: 'missing' };
        // 잠금은 **분해만** 막는다 [2026-09-21 · ADR-0185] — 여러 개를 한 번에 지우는 길이 열려 보호 태그가 필요해졌다
        if (it.locked) return { ok: false, err: 'locked' };
        const dust = I.salvageDust(it);
        if (from === 'bag') state.bag = state.bag.filter(u => u !== itemUid);
        else state.stash = state.stash.filter(u => u !== itemUid);
        delete state.items[itemUid];
        state.resources.dust += dust;
        return { ok: true, dust, from };
    }

    /** 인벤토리 → 창고 [v24]. 받는 쪽이 차 있으면 `stashFull` · 창고를 안 지었으면 `unbuilt`(꺼내기는 막지 않는다 — 넣어 둔 것이 갇히지 않게 · R137) */
    function moveToStash(state, itemUid) {
        if (!hasFeature(state, 'storage')) return { ok: false, err: 'unbuilt' };
        if (holderOf(state, itemUid) !== 'bag') return { ok: false, err: 'missing' };
        if (state.stash.length >= capOf(state, 'stash')) return { ok: false, err: 'stashFull' };
        state.bag = state.bag.filter(u => u !== itemUid);
        state.stash.push(itemUid);
        return { ok: true };
    }

    /** 창고 → 인벤토리 [v24]. 받는 쪽이 차 있으면 `bagFull` */
    function moveToBag(state, itemUid) {
        if (holderOf(state, itemUid) !== 'stash') return { ok: false, err: 'missing' };
        if (state.bag.length >= capOf(state, 'bag')) return { ok: false, err: 'bagFull' };
        state.stash = state.stash.filter(u => u !== itemUid);
        state.bag.push(itemUid);
        return { ok: true };
    }

    /* ── 정렬 (ADR-0242 · SCREEN_DESIGN §6) — 칸 하나를 **한 번** 줄 세운다. 늘 정렬된 상태가 아니다 ──
       등급 사다리는 「통제 가능성의 계단」(일반 → 매직 → 레어 → 크래프트 → 유니크 · `mock.js:RARITY` 머리말)이고
       수치가 아니라 어휘의 순서라 코드에 둔다. 부위 순서는 `equip_slot.csv` 가 든다(반지 둘은 부위 하나) */
    const RARITY_LADDER = ['normal', 'magic', 'rare', 'craft', 'unique'];
    const PART_ORDER = [...new Set(deps.equipSlots.map(s => s.part))];
    const orderIn = (list, v) => { const i = list.indexOf(v); return i < 0 ? list.length : i; };
    // 비교 셋 — 등급 · 레벨은 **높은 것이 앞**, 부위는 표 순서가 앞
    const CMP = {
        rarity: (a, b) => orderIn(RARITY_LADDER, b.rarity) - orderIn(RARITY_LADDER, a.rarity),
        ilvl: (a, b) => (b.ilvl ?? 0) - (a.ilvl ?? 0),
        slot: (a, b) => orderIn(PART_ORDER, a.slot) - orderIn(PART_ORDER, b.slot),
    };
    // 고른 기준 다음으로 남은 둘 — 유저가 그 기준 안에서 다음으로 볼 것
    const SORT_KEYS = { rarity: ['rarity', 'ilvl', 'slot'], ilvl: ['ilvl', 'rarity', 'slot'], slot: ['slot', 'rarity', 'ilvl'] };

    /** 보관 한 칸을 줄 세운다 — 순서만 바꾸고 개체 · 개수는 그대로 · 다 같으면 원래 순서(`Array.sort` 는 안정 정렬) · rng 0 */
    function sortStorage(state, where, key) {
        const keys = SORT_KEYS[key];
        if (!keys || (where !== 'bag' && where !== 'stash')) return { ok: false, err: 'invalid' };
        const list = where === 'bag' ? state.bag : (state.stash ?? []);
        const sorted = list.slice().sort((ua, ub) => {
            const a = state.items[ua], b = state.items[ub];
            if (!a || !b) return 0;
            for (const k of keys) { const d = CMP[k](a, b); if (d) return d; }
            return 0;
        });
        if (where === 'bag') state.bag = sorted; else state.stash = sorted;
        return { ok: true };
    }

    /**
     * 자물쇠 하나를 켜고 끈다 [2026-09-21 · ADR-0185] — 잠긴 아이템은 `salvage` 가 `locked` 로 거절한다.
     * 보관 두 칸(가방 · 창고)에 있는 것만 잠근다 — 착용 중인 것은 어차피 분해되지 않는다.
     * **끄면 필드를 지운다** — `locked: false` 를 남기면 세이브에 안 쓰는 값이 개체마다 쌓인다.
     * 여러 개는 호출하는 쪽이 고른 만큼 부른다 (일괄 함수를 따로 두지 않는다).
     */
    function setItemLock(state, itemUid, on) {
        const it = state.items[itemUid];
        if (!it || !holderOf(state, itemUid)) return { ok: false, err: 'missing' };
        if (on) it.locked = true; else delete it.locked;
        return { ok: true, locked: !!it.locked };
    }

    /* ── 알아서 분해 (item_design §6-5 · R125) ──
       선 둘을 **각각** 긋고 **하나라도 걸리면** 분해한다 — 둘 다 걸려야 하면 높은 레벨의 일반이 계속 쌓인다.
       새 드롭은 `advanceRun` 이 적재 전에 본다. 이미 가진 것은 `applyAutoSalvage` 를 부를 때만 · rng 0 */

    // 그 등급 **이하** — 크래프트 · 유니크는 어떤 선에도 안 걸린다
    const AUTO_RARITY = { normal: ['normal'], magic: ['normal', 'magic'] };
    const autoRuleOf = state => state.autoSalvage ?? { rarity: null, ilvlBelow: 0 };
    const autoSalvageHits = (rule, it) =>
        (!!rule.rarity && AUTO_RARITY[rule.rarity].includes(it.rarity))
        || (rule.ilvlBelow > 0 && it.ilvl < rule.ilvlBelow);

    /** 선을 바꾼다 — 준 키만. 가방의 것은 건드리지 않는다(다음 드롭부터 먹는다) · 건물이 막지 않는다 (R140) */
    function setAutoSalvage(state, rule) {
        const next = { ...autoRuleOf(state) };
        if ('rarity' in rule) {
            if (rule.rarity !== null && !AUTO_RARITY[rule.rarity]) return { ok: false, err: 'invalid' };
            next.rarity = rule.rarity;
        }
        if ('ilvlBelow' in rule) {
            if (!Number.isInteger(rule.ilvlBelow) || rule.ilvlBelow < 0) return { ok: false, err: 'invalid' };
            next.ilvlBelow = rule.ilvlBelow;
        }
        state.autoSalvage = next;
        return { ok: true };
    }

    // [지금 인벤토리에도 적용]이 갈 것 — **인벤토리만**(창고는 옮겨 둔 것이 곧 「남긴다」) · 잠근 것 제외
    const autoTargets = state => {
        const rule = autoRuleOf(state);
        return state.bag.map(u => state.items[u]).filter(it => it && !it.locked && autoSalvageHits(rule, it));
    };

    /** 지금 적용하면 갈릴 개수와 가루 — 확인 창이 이 숫자를 보여 준다. 상태를 안 바꾼다 */
    function autoSalvagePreview(state) {
        const list = autoTargets(state);
        return { n: list.length, dust: list.reduce((a, it) => a + I.salvageDust(it), 0) };
    }

    /** 인벤토리에서 선에 걸린 것을 분해한다 — `salvage` 를 그대로 부르므로 반환량 · 거절 규칙이 같다 */
    function applyAutoSalvage(state) {
        let n = 0, dust = 0;
        for (const it of autoTargets(state)) {
            const r = salvage(state, it.uid);
            if (r.ok) { n++; dust += r.dust; }
        }
        return { ok: true, n, dust };
    }

    /* ── 강화 (item_design §7-2 — R25 · 개정 2026-09-15 R95) ── */

    /**
     * 강화 화면 상태 한 덩어리 — **판정을 여기서 다 낸다** (`tavernState`·`masteryState` 와 같은 규칙).
     * `upgradeable` = 베이스 능력치가 있는 부위인가 — 목걸이 · 반지는 강화 대상이 아니다(`cost` 도 null).
     * 얼마가 나가고 무엇이 걸려 있는지를 화면이 계산하지 않는다. ~~optionAt~~ 은 옵션 계단과 함께 퇴역 (R95)
     */
    function upgradeState(state, itemUid) {
        const it = state.items[itemUid];
        if (!it) return null;
        const up = it.up ?? 0, max = limitsOf(state).upgrade, cost = I.upgradeCost(it, max);
        const open = hasFeature(state, 'upgrade_item');   // 제련소가 연다 (R137)
        return {
            up, max, cost, gold: state.resources.gold, open,
            upgradeable: I.upgradeable(it),
            canUpgrade: open && cost != null && state.resources.gold >= cost,
        };
    }

    /**
     * 강화 1단계 — 골드를 내고 `up` 을 올린다. 거절은 `missing` → `unbuilt`(제련소를 안 지었다 · R137) → `noBase` → `maxUp` → `gold` 순으로 본다.
     * **가방·착용을 가리지 않는다** — 소유물에 하는 일이지 자리에 하는 일이 아니다(분해와 갈리는 지점).
     * **rng 를 안 쓴다** (R95) — 옵션 계단이 사라져 굴릴 것이 없다. `counters.upgrade` 도 더 오르지 않는다 (INTERFACE §5-1).
     */
    function upgradeItem(state, itemUid) {
        const it = state.items[itemUid];
        if (!it) return { ok: false, err: 'missing' };
        if (!hasFeature(state, 'upgrade_item')) return { ok: false, err: 'unbuilt' };
        if (!I.upgradeable(it)) return { ok: false, err: 'noBase' };
        const cost = I.upgradeCost(it, limitsOf(state).upgrade);
        if (cost == null) return { ok: false, err: 'maxUp' };
        if (state.resources.gold < cost) return { ok: false, err: 'gold' };
        state.resources.gold -= cost;
        const r = I.upgrade(it);
        return { ok: true, up: r.up, cost };
    }

    /* ── 제작 (item_design §7-1 확정 2026-09-15 — R96) ── */

    /**
     * 레시피 — 부위마다 광석 · 목재 · 가루 필요량(`make_recipe.csv`). **셋 다 1 이상이어야 한다** — 생성 때 검증한다:
     *   · 광석 · 목재가 둘 다 들어가야 **보완재**다 — 한쪽이 다른 쪽을 대신하지 못해 채광 · 벌목의 통화 비중복이 산다 (item_design §5-1)
     *   · 가루가 들어가야 **원정 쪽 입력**이 있다 — 파견 재료만으로는 못 만든다 (item_design §7-1)
     */
    const recipes = deps.makeRecipes ?? {};
    (() => {
        const bad = why => { throw new Error(`make_recipe: ${why}`); };
        const parts = new Set(deps.equipSlots.map(s => s.part));
        for (const [part, r] of Object.entries(recipes)) {
            if (!parts.has(part)) bad(`없는 부위 '${part}'`);
            if (!(r.ore >= 1 && r.timber >= 1 && r.dust >= 1)) bad(`${part} — 광석 · 목재 · 가루는 모두 1 이상이어야 한다 (${r.ore} · ${r.timber} · ${r.dust})`);
        }
    })();
    const MAKE_WEIGHTS = { normal: B.make_rarity_w_normal, magic: B.make_rarity_w_magic, rare: B.make_rarity_w_rare };

    /**
     * 레벨대 = 챕터 — **stage.csv 가 정한다.** 레벨대 n 의 ilvl 은 (챕터 n−1 의 최고 스테이지 레벨, 챕터 n 의 최고 스테이지 레벨] 이고 첫 레벨대는 1 부터다.
     * 제작(아래)과 상점 장비 목록(`shopState`)이 같은 범위를 쓴다 — 범위가 비는 챕터(`hi < lo`)는 없다
     */
    const chapterBands = (() => {
        const top = new Map();
        for (const s of Object.values(deps.stages ?? {})) top.set(s.chapter, Math.max(top.get(s.chapter) ?? 0, s.dlvl));
        const out = [];
        let lo = 1;
        for (const ch of [...top.keys()].sort((a, b) => a - b)) {
            const hi = top.get(ch);
            if (hi >= lo) out.push({ band: ch, lo, hi });
            lo = hi + 1;
        }
        return out;
    })();

    /**
     * 제작 레벨 [개정 2026-09-21 — ~~레벨대 = 챕터 · ilvl 은 대역 안 균등~~ · item_design §7-1] — **1** 과 **챕터마다 끝 레벨**이고 ilvl 은 고른 레벨 그대로다.
     * 재료는 **그 레벨이 든 챕터 단계**의 광석(`mine_node.csv`) · 목재(`log_node.csv`) — 단계 n = 챕터 n 의 지역 (base_expedition §2-1) · Lv1 · Lv10 은 1 단계.
     * 두 표 중 하나라도 그 단계가 없으면 그 레벨은 목록에 없다
     */
    const makeLevelList = [...new Set([chapterBands[0]?.lo, ...chapterBands.map(b => b.hi)].filter(v => v != null))].flatMap(level => {
        const b = chapterBands.find(x => level >= x.lo && level <= x.hi);
        const ore = (deps.mineNodes ?? []).find(n => n.tier === b.band);
        const timber = (deps.logNodes ?? []).find(n => n.tier === b.band);
        return ore && timber ? [{ level, chapter: b.band, ore: ore.yieldId, timber: timber.yieldId }] : [];
    });

    /** 제작 레벨 목록 — 부위와 무관하다. 화면의 레벨 버튼이 이 순서로 선다.
     *  `state` 를 주면 레벨마다 **`open`** — 제작이 열렸고(`make`) 앞에서부터 `limitsOf(state).makeLevels` 개 안에 드나 (제련소 랭크가 연다 · R137) */
    const makeLevels = state => {
        const open = state ? (hasFeature(state, 'make') ? limitsOf(state).makeLevels : 0) : null;
        return makeLevelList.map((l, i) => (open == null ? { ...l } : { ...l, open: i < open }));
    };

    /**
     * 제작 화면 상태 한 덩어리 — **판정을 여기서 다 낸다** (`upgradeState` 와 같은 규칙).
     * `kinds` = 고를 수 있는 종류 = `item.basesAt(part, level)` — 무기는 무기군 · 무기 외는 베이스 (2026-09-21).
     * `cost` = [{kind: 'ore'|'timber'|'dust', id, need, have}] — 광석 · 목재의 `id` 는 산출물 id · 가루는 null. 필요량은 부위마다라 **종류와 무관**하다.
     * `err` = 지금 누르면 나올 거절(`unbuilt` → `materials` → `bagFull` 순) 또는 null. 없는 부위 · 레벨이면 null.
     *   `unbuilt` = 그 레벨이 안 열렸다(제련소 랭크가 연다 — `makeLevels(state)` 의 `open` · R137)
     */
    function makeState(state, part, level) {
        const r = recipes[part], l = makeLevels(state).find(x => x.level === level);
        if (!r || !l) return null;
        const mats = state.materials ?? {};
        const cost = [
            { kind: 'ore', id: l.ore, need: r.ore, have: mats[l.ore] ?? 0 },
            { kind: 'timber', id: l.timber, need: r.timber, have: mats[l.timber] ?? 0 },
            { kind: 'dust', id: null, need: r.dust, have: state.resources.dust },
        ];
        const err = !l.open ? 'unbuilt'
            : cost.some(c => c.have < c.need) ? 'materials'
            : state.bag.length >= capOf(state, 'bag') ? 'bagFull' : null;
        // 줄마다 **만들어질 베이스**(`baseId`)와 그 이름을 든다 — 무기는 무기군 줄에 그 레벨의 세부 베이스(`weaponBaseAt` · 2026-09-21) · 무기 외는 베이스 그 자체
        const kinds = I.basesAt(part, level).map(k => {
            if (part !== 'weapon') return { ...k, baseId: k.id };
            const b = I.weaponBaseAt(k.id, level);
            return { id: k.id, ko: b?.ko ?? k.ko, en: b?.en ?? k.en, group: k.id, baseId: b?.id ?? null };
        });
        return { part, level, kinds, cost, canMake: err === null, err };
    }

    /**
     * 제작 1회 — 재료를 내고 **고른 종류**의 장비 하나를 **인벤토리 끝**에 넣는다. 거절은 `missing`(없는 부위 · 레벨 · 목록 밖 종류) → `unbuilt` → `materials` → `bagFull` 순이고
     * 거절이면 아무것도 안 바뀐다. rng 는 제작 전용 스트림(`seed ^ 0xC4AF` · `counters.make` 선증가) — 전투 · 선술집 · 전술 수열과 안 섞인다 (INTERFACE §5-1).
     * 소비: `item.rollGear` 한 벌 — 베이스는 고른 종류라 **0회**(무기 = `weaponGroup` · 무기 외 = `itemBase`) → 희귀도(제작 가중치) → build (INTERFACE §5-2).
     * 무기의 세부 베이스는 레벨이 정한다(`weaponBase` — build 의 베이스 굴림 1회는 그대로 돌고 값만 버린다 · 2026-09-21).
     * ilvl 은 고른 레벨 그대로다 — ~~레벨대 안 균등 1회~~ 는 2026-09-21 폐기
     */
    function makeItem(state, part, level, kind) {
        const s = makeState(state, part, level);
        const k = s?.kinds.find(x => x.id === kind);
        if (!k) return { ok: false, err: 'missing' };
        if (s.err) return { ok: false, err: s.err };
        state.materials = state.materials ?? {};
        for (const c of s.cost) {
            if (c.kind === 'dust') state.resources.dust -= c.need;
            else state.materials[c.id] -= c.need;
        }
        const rng = makeRng(deriveSeed(state.seed ^ 0xC4AF, ++state.counters.make));
        // 무기 = 무기군 + 그 레벨의 세부 베이스(줄이 보인 그대로 · 2026-09-21) · 무기 외 = 베이스
        const fix = part === 'weapon' ? { weaponGroup: kind, weaponBase: k.baseId ?? undefined } : { itemBase: kind };
        const [it] = I.rollGear(rng, { slots: [part], ilvl: level, rarityWeights: MAKE_WEIGHTS, ...fix });
        addItem(state, it);
        state.bag.push(it.uid);
        return { ok: true, uid: it.uid };
    }

    /* ── 물약 (battle_design §7-1 · item_design §7-4 확정 2026-09-15 — R103 · 개수 · 칸 구성 2026-09-21 — R124) ──
       칸(스테이지당 개수)과 영웅별 쿨은 **전투 안에서만** 산다(battle.js). 세이브가 드는 것은 **재고**(`potions` — 물약마다 개수)와
       **편성마다의 칸 구성**(`presets[].potionSlots`) 둘이다. 런을 열 때 구성대로 **재고에서 앞 칸부터** 채우고(모자란 칸은 빈다)
       마신 만큼 라운드 정산에서 재고를 뺀다(`advanceRun`). 같은 물약을 여러 칸에 넣어도 된다. 제작은 지금 골드만 먹고 rng 를 안 쓴다 */

    /** 물약 종류 어휘 — 전투가 효과를 아는 종류만 둔다. 모르는 종류가 표에 오면 **로드에서 멈춘다**(조용히 새지 않게) */
    const POTION_KINDS = ['heal'];
    const potionRows = deps.potions ?? [];
    (() => {
        const bad = why => { throw new Error(`potion: ${why}`); };
        const seen = new Set();
        const lastTier = new Map(), lastHeal = new Map();
        for (const p of potionRows) {
            if (!p.id || seen.has(p.id)) bad(`id '${p.id}'`);
            seen.add(p.id);
            if (!POTION_KINDS.includes(p.kind)) bad(`${p.id} — 모르는 종류 '${p.kind}'`);
            // 같은 종류 안에서 단계는 1 부터 연속이고 회복량은 단계마다 커진다 — 단계 이름(마이너 → 슈퍼)이 회복량의 순서와 어긋나지 않게 (item_design §7-4)
            const want = (lastTier.get(p.kind) ?? 0) + 1;
            if (p.tier !== want) bad(`${p.id} — ${p.kind} 의 단계 ${p.tier} ≠ ${want}`);
            if (!(p.heal > (lastHeal.get(p.kind) ?? 0))) bad(`${p.id} — 회복량 ${p.heal} 이 앞 단계보다 크지 않다`);
            lastTier.set(p.kind, p.tier);
            lastHeal.set(p.kind, p.heal);
            if (!(p.craftGold >= 0)) bad(`${p.id} — craft_gold ${p.craftGold}`);
            // 시작 개수 — 0 이상 정수 (R124 · 전엔 0/1 플래그였다)
            if (!(Number.isInteger(p.startOwned) && p.startOwned >= 0)) bad(`${p.id} — start_owned ${p.startOwned} 은 0 이상 정수(시작 개수)여야 한다`);
            if (!p.ko || !p.en) bad(`${p.id} — 이름 ko/en 이 비었다`);
        }
    })();
    const potionById = id => potionRows.find(p => p.id === id) ?? null;
    /** 시작 재고 — `start_owned` 개수(0 보다 큰 행). 새 게임과 **물약이 없던 옛 세이브**가 같은 재고로 연다 (INTERFACE §4) */
    const startStock = () => Object.fromEntries(potionRows.filter(p => p.startOwned > 0).map(p => [p.id, p.startOwned]));
    /** 칸 구성을 그 세이브의 칸 수(`limitsOf(state).potionSlots`)에 맞춘다 — 넘치면 뒤를 자르고 모자라면 빈 칸(`null`)을 붙인다 */
    const padSlots = (state, list) => Array.from({ length: limitsOf(state).potionSlots }, (_, i) => list[i] ?? null);
    /** 시작 칸 — 시작 물약이 **행 순서대로 한 칸씩**(개수와 무관 · 칸 수에서 자른다). 새 게임의 편성 1 이 든다 */
    const startSlots = state => padSlots(state, potionRows.filter(p => p.startOwned > 0).map(p => p.id));

    /**
     * 칸 채우기 — 편성의 칸 구성을 **재고에서 앞 칸부터** 채운다 [R124 · battle_design §7-1]. 칸마다 `{id, heal}` 또는 `null`
     *   (비워 둔 칸 · 재고가 모자란 칸 · 표에서 사라진 id). 같은 물약이 여러 칸이면 앞 칸이 먼저 가져가서 **뒤 칸부터** 모자란다.
     * 재고는 **안 바꾼다** — 줄어드는 것은 마실 때다(`advanceRun`). `departRun` 이 전투에 넘기는 칸도, `presetState` 의 `short` 도 이 함수 하나에서 나온다
     */
    function fillSlots(state, p) {
        const left = { ...(state.potions ?? {}) };
        return padSlots(state, p?.potionSlots ?? []).map(id => {
            const row = id ? potionById(id) : null;
            if (!row || !((left[id] ?? 0) > 0)) return null;
            left[id] -= 1;
            return { id: row.id, heal: row.heal };
        });
    }
    /** 재고에서 뺀다 — 0 이 되면 키를 지운다(세이브에 안 쓰는 값이 쌓이지 않게) */
    function spendPotion(state, id, k) {
        state.potions = state.potions ?? {};
        const left = (state.potions[id] ?? 0) - k;
        if (left > 0) state.potions[id] = left; else delete state.potions[id];
    }

    /**
     * 물약 화면 상태 한 덩어리 — **판정을 여기서 다 낸다** (`makeState` · `upgradeState` 와 같은 규칙).
     * `have` = 재고 개수 · `err` = 지금 누르면 나올 거절(`locked` → `gold` 순) 또는 null. 칸은 편성마다라 여기 없다(`presetState`).
     * `craftable` = 그 단계가 열렸나 — **제련소 랭크가 연다**(단계 ≤ `limitsOf(state).potionTier` · R137 · ~~`potion.csv:craftable` 임시 칸~~ 2026-09-22 삭제)
     */
    function potionState(state) {
        const gold = state.resources.gold, tierOpen = limitsOf(state).potionTier;
        const list = potionRows.map(p => {
            const craftable = p.tier <= tierOpen;
            const err = !craftable ? 'locked' : gold < p.craftGold ? 'gold' : null;
            return { id: p.id, kind: p.kind, tier: p.tier, heal: p.heal, cost: p.craftGold, have: state.potions?.[p.id] ?? 0, craftable, canMake: err === null, err };
        });
        return { slotMax: limitsOf(state).potionSlots, useHpPct: B.potion_use_hp_pct, cooldownSec: B.potion_cooldown_sec, list };
    }

    /**
     * 물약 제작 1회 — 골드를 내고 **재고를 1 올린다**(거듭 만든다 · R124). 거절은 `missing` → `locked` → `gold` 순이고 거절이면 아무것도 안 바뀐다.
     * **rng 를 안 쓰고 카운터도 안 올린다** — `counters.make` 는 장비 제작 스트림의 회차라 여기서 올리면 다음 장비 제작이 밀린다 (INTERFACE §5-1).
     * 원정 중에도 만든다 — 도는 런의 칸은 안 바뀌고 다음 런부터 칸을 채운다
     */
    function makePotion(state, potionId) {
        const p = potionById(potionId);
        if (!p) return { ok: false, err: 'missing' };
        const { err } = potionState(state).list.find(x => x.id === potionId);
        if (err) return { ok: false, err };
        state.resources.gold -= p.craftGold;
        state.potions = state.potions ?? {};
        state.potions[p.id] = (state.potions[p.id] ?? 0) + 1;
        return { ok: true, id: p.id, cost: p.craftGold, have: state.potions[p.id] };
    }

    /* ── 진형 ── */

    /**
     * 진형 (battle_design §3-1 확정 2026-09-09 · 부채 #37 해소) — **자리가 전투에 닿는다.**
     * 랭크는 둘뿐이다: `0` 전열 · `1` 후열. 「앞에 있는 유닛부터 때린다」의 「앞」이 이것이다.
     *   · 정원은 `formation_template.csv` 가 든다 (행마다 전열 · 후열 정원 — 한쪽이 0 인 행도 있다: `3` 모두 전열 · `0-3` 모두 후열) — **칸 수 = 표의 값**
     *   · 저장하는 것은 `{tpl, ranks:[[uid...],[uid...]]}` 하나. 파생(정원 · uid→랭크)은 매번 다시 만든다
     *   · **정규화는 상태를 바꾸는 쪽이 부른다**(`toggleParty`·`setFormation`·`placeFormation`).
     *     읽기(`formationState`)는 순수하다 — 화면이 렌더마다 세이브를 흔들면 안 된다
     */
    const FT = deps.formationTemplates ?? {};
    // 표의 **행 순서**다 — `Object.keys` 는 `'3'` 같은 정수형 키를 앞으로 끌어올려 첫 행을 못 준다
    const FT_ORDER = (deps.formationTplOrder ?? []).filter(id => FT[id]);
    const DEFAULT_TPL = deps.defaultFormationTpl ?? FT_ORDER[0];
    const formCaps = tpl => { const t = FT[tpl] ?? FT[DEFAULT_TPL]; return t ? [t.front, t.back] : [B.party_size_max, 0]; };

    /* ── 편성 [2026-09-21 · 사용자 확정 · SCREEN_DESIGN §15 · ADR-0192 · R122] ──
       편성은 **늘 `limitsOf(state).presets` 개가 서 있고** 번호가 이름이다(1 부터) — 만들고 지우는 동작이 없다. 수는 기본값 하나에 원정 랭크가 더 연다(r3 · r6 · R156 · 첫 편성은 기본값 R161).
       편성마다 파티 · 진형 · 물약 칸 · **파티 전술 칸**을 든다(전술은 v34 부터 편성마다 · R129 — 열린 칸 수만 계정이다).
       파티 · 진형 · 물약 칸을 바꾸는 함수는 **고른 편성**(`state.preset`)에 작용한다 — 편성 탭은 늘 고른 편성을 펴므로 번호를 따로 받지 않는다.
       출발만 번호를 받는다 — 반복이 **도는 원정의 편성**으로 다시 나가야 해서다(고른 편성이 그새 바뀌었을 수 있다) */
    // 편성 수는 `limitsOf(state).presets` 가 답한다 — 여기서는 CSV 값이 쓸 수 있는 수인지만 본다.
    //   기본값은 0 이어도 된다 — 시작 랭크(처음부터 지어진 랭크)의 더하기를 얹은 수가 1 이상이면 된다 (R156 · 지금 표는 기본값 1 · R161)
    const startPresets = B.party_preset_count + (CN.opened(CN.startRanks()).adds.presets ?? 0);
    if (!(Number.isInteger(B.party_preset_count) && B.party_preset_count >= 0 && startPresets >= 1)) throw new Error(`balance: party_preset_count ${B.party_preset_count} · 시작 편성 ${startPresets} — 기본값은 0 이상 정수 · 시작 랭크의 편성은 1 이상이어야 한다 (INTERFACE §2-7)`);
    const emptyPreset = state => ({ party: [], formation: { tpl: DEFAULT_TPL, ranks: [[], []] }, potionSlots: padSlots(state, []), tactics: { slots: {}, locked: [] } });
    /** 불러온 전술 칸 — 없으면 리롤한 적이 없는 상태 (R129) · 잠금은 CSV 에 있는 칸 번호만 남긴다(칸이 줄면 잘린다 · v35 · R28) */
    const fitTactics = t => ({
        slots: t?.slots && typeof t.slots === 'object' ? t.slots : {},
        locked: Array.isArray(t?.locked) ? [...new Set(t.locked)].filter(no => TC.slotList.some(s => s.no === no)).sort((a, b) => a - b) : [],
    });
    /** 새 게임의 편성 — 전부 빈 파티 · 물약 칸은 편성 1 에만 시작 물약 (R124) */
    const newPresets = (state = null) => {
        const list = Array.from({ length: limitsOf(state).presets }, () => emptyPreset(state));
        list[0].potionSlots = startSlots(state);
        return list;
    };
    /** 불러온 편성을 그 세이브의 상한(`limitsOf`)에 맞춘다 — 편성 수 · 칸 수. 모자라면 빈 편성 · 빈 칸을 붙이고 넘치면 뒤를 자른다.
     *  **상한이 줄어든 옛 세이브도 자른다** [2026-09-22 사용자 확정 · R137] — 사라지는 것은 편성의 구성(파티 · 진형 · 칸 · 전술)뿐이고
     *  영웅 · 장비 · 물약 재고는 그대로다. 가방 · 창고는 반대로 **넘친 채 둔다**(아이템은 구성이 아니라 소유물이다 — 새 드롭만 막힌다) */
    const fitPresets = (state, list) => Array.from({ length: limitsOf(state).presets }, (_, i) => {
        const p = Array.isArray(list) ? list[i] : null;
        if (!p || typeof p !== 'object') return emptyPreset(state);
        return {
            party: Array.isArray(p.party) ? p.party : [],
            formation: p.formation ?? { tpl: DEFAULT_TPL, ranks: [[], []] },
            potionSlots: padSlots(state, Array.isArray(p.potionSlots) ? p.potionSlots : []),
            tactics: fitTactics(p.tactics),
        };
    });
    /* ── 부대 — 편성 하나에 하나다 [v38 · 2026-09-23 다부대 · GAME_DESIGN §1-1] ──
       `state.runs` 는 `presets` 와 같은 색인이다(자리 + 1 = 편성 번호). 부대라는 번호를 따로 두지 않는다 —
       편성이 곧 부대라서, 「2부대」는 「편성 2 가 나간 원정」이다 */
    /** 새 게임의 부대 자리 — 전부 비어 있다 */
    const newRuns = (state = null) => Array.from({ length: limitsOf(state).presets }, () => null);
    /** 불러온 부대 자리를 편성 수에 맞춘다 — 넘치면 뒤를 자르고 모자라면 빈 자리를 붙인다 */
    const fitRuns = (state, list) => Array.from({ length: limitsOf(state).presets }, (_, i) => {
        const r = Array.isArray(list) ? list[i] : null;
        return r && typeof r === 'object' ? r : null;
    });
    /** 그 편성의 부대 — 없는 번호면 null */
    const runAt = (state, no) => (Number.isInteger(no) && no >= 1 ? state.runs?.[no - 1] ?? null : null);
    /** 지금 도는 부대의 편성 번호 — 오름차순 · 없으면 [] */
    const runningNos = state => (state.runs ?? []).map((r, i) => (r?.active ? i + 1 : 0)).filter(Boolean);
    /**
     * 한 영웅은 한 편성에만 든다 [v38 · 다부대] — 겹치면 **앞 편성이 갖는다.**
     * 로드(`deserialize`)와 편성 이동(`toggleParty`)이 같은 규칙을 쓴다 · 뺀 자리는 진형에서도 빠진다 · rng 0
     */
    function dedupeParties(state) {
        const seen = new Set();
        for (const p of state.presets) {
            p.party = p.party.filter(uid => (seen.has(uid) ? false : (seen.add(uid), true)));
            normalizeFormation(p);
        }
    }

    /** 번호 → 편성. 정수가 아니거나 범위 밖이면 null */
    const presetAt = (state, no) => (Number.isInteger(no) && no >= 1 && no <= (state.presets?.length ?? 0) ? state.presets[no - 1] : null);
    /** 고른 편성 — 번호가 틀려 있으면 편성 1 (로드가 범위로 자르므로 평소엔 안 탄다) */
    const curPreset = state => presetAt(state, state.preset) ?? state.presets[0];
    /** 편성의 파티 — **복사본**이다. `no` 를 안 주면 고른 편성 · 없는 번호면 [] */
    const partyOf = (state, no = state.preset) => (presetAt(state, no)?.party ?? []).slice();
    /**
     * 그 편성으로 지금 나가면 나올 거절 — 스테이지 무관 [다부대 2026-09-23].
     * 없는 편성 `missing` → 빈 파티 `noParty` → 수색 나간 영웅 `searching` →
     * **`busy`**(그 편성의 영웅이 **다른 부대**에서 싸우는 중 — 도는 부대의 인원은 출발 때 굳은 스냅샷이라 편성을 옮겨 두면 한 사람이 두 부대에 선다) →
     * **`full`**(도는 부대가 이미 상한만큼이다 — **그 편성이 이미 도는 중이면 안 센다**: 다시 보내는 것은 그 부대를 끊고 여는 것이라 수가 안 는다) → null
     */
    const presetErr = (state, p, no) => {
        if (!p) return 'missing';
        if (p.party.length === 0) return 'noParty';
        if (p.party.some(uid => heroBusy(state, uid) === 'search')) return 'searching';
        if (p.party.some(uid => { const at = runOf(state, uid); return at !== null && at !== no; })) return 'busy';
        const going = runningNos(state);
        if (!going.includes(no) && going.length >= limitsOf(state).expeditions) return 'full';
        return null;
    };

    /**
     * 파티와 진형을 맞춘다 — **결정적이고 순서를 보존한다.** rng 를 안 쓴다.
     *   ① 파티에 없는 uid 를 뺀다 ② 정원 초과분은 **뒤에서부터** 뽑아 대기로 ③ 미배치(파티 순서) + 대기를
     *   **앞 랭크부터** 빈 정원에 채운다. 그래서 새 영웅은 언제나 전열이 찬 뒤에 후열로 간다
     */
    function normalizeFormation(p) {                     // p = 편성 `{party, formation}` (v19 이관은 옛 세이브 그 자체를 넘긴다 — 같은 두 필드다)
        const party = p.party ?? [];
        const f = p.formation ?? (p.formation = { tpl: DEFAULT_TPL, ranks: [[], []] });
        if (!FT[f.tpl]) f.tpl = DEFAULT_TPL;
        const caps = formCaps(f.tpl);
        const ranks = caps.map((_, i) => (f.ranks?.[i] ?? []).filter(uid => party.includes(uid)));
        const spill = [];
        ranks.forEach((list, i) => { while (list.length > caps[i]) spill.push(list.pop()); });
        const placed = new Set(ranks.flat());
        const queue = party.filter(uid => !placed.has(uid)).concat(spill);
        ranks.forEach((list, i) => { while (list.length < caps[i] && queue.length) list.push(queue.shift()); });
        f.ranks = ranks;
        return f;
    }

    /** 읽기 — 순수하다. `byUid` 는 uid → 랭크 번호 (없는 영웅은 전열로 읽는다) · p = 편성 */
    function formationOf(p) {
        const f = p?.formation ?? { tpl: DEFAULT_TPL, ranks: [[], []] };
        const caps = formCaps(f.tpl);
        const ranks = caps.map((_, i) => (f.ranks?.[i] ?? []).slice());
        const byUid = {};
        ranks.forEach((list, i) => { for (const uid of list) byUid[uid] = i; });
        // `shapes` — 템플릿마다의 정원. 화면이 아이콘(점 배열)을 그리려면 **현재 것만으로는 모자라다**
        const shapes = Object.fromEntries(FT_ORDER.map(id => [id, formCaps(id)]));
        return { tpl: f.tpl, caps, ranks, byUid, templates: FT_ORDER.slice(), shapes };
    }
    /** **고른 편성**의 진형 (R122) — `no` 를 주면 **그 편성**의 것이다 [2026-09-24 · 다부대] (없는 번호면 고른 편성) */
    const formationState = (state, no = state.preset) => formationOf(presetAt(state, no) ?? curPreset(state));

    /** 그 영웅의 랭크 — 배치가 없으면 **전열**이다 (자리를 못 받은 유닛이 뒤에 숨지 않는다) */
    const rankOf = (state, uid) => formationState(state).byUid[uid] ?? 0;

    /** 템플릿 교체 — 정원이 바뀌므로 재배치가 따라온다 */
    function setFormation(state, tpl) {
        if (!FT[tpl]) return { ok: false, err: 'missing' };
        const p = curPreset(state);                       // 고른 편성 (R122)
        (p.formation ?? (p.formation = { tpl, ranks: [[], []] })).tpl = tpl;
        normalizeFormation(p);
        return { ok: true };
    }

    /**
     * 한 명을 그 랭크로 옮긴다 (편성 화면의 드래그). 정원이 찼으면 **그 랭크의 마지막 하나와 자리를 바꾼다** —
     * 거절하면 플레이어가 "왜 안 되지"를 읽을 수 없고, 밀어내면 누가 밀렸는지가 안 보인다. 맞바꿈이 둘 다 답한다.
     * `idx` 를 주면 **그 칸**이 목적지다 [2026-09-11 사용자 지시 · SCREEN_DESIGN §4-1] — 주인이 있으면 **그 주인과** 맞바꾸고
     * (같은 랭크 안에서도), 비었으면 그 랭크 끝으로 간다. 칸은 늘 앞부터 차므로(`normalizeFormation`) 빈 칸은 끝에만 있다.
     * 칸을 안 받던 판은 후열 영웅을 전열 첫 칸에 끌어도 전열 **마지막**과 바뀌었고, 같은 랭크 안에서는 아무 일이 없었다.
     */
    function placeFormation(state, uid, rank, idx) {
        const p = curPreset(state);                       // 고른 편성 (R122)
        if (!p.party.includes(uid)) return { ok: false, err: 'missing' };
        const f = normalizeFormation(p);
        const caps = formCaps(f.tpl);
        if (!(rank >= 0 && rank < caps.length)) return { ok: false, err: 'missing' };
        const from = f.ranks.findIndex(list => list.includes(uid));
        if (idx !== undefined) {
            if (!(Number.isInteger(idx) && idx >= 0 && idx < caps[rank])) return { ok: false, err: 'missing' };
            const owner = f.ranks[rank][idx];
            if (owner === uid) return { ok: true, swapped: null };
            if (owner === undefined) {
                if (from === rank) return { ok: true, swapped: null };   // 같은 랭크의 빈 칸 — 앞부터 차므로 옮겨도 같은 자리다
                if (from >= 0) f.ranks[from] = f.ranks[from].filter(u => u !== uid);
                f.ranks[rank].push(uid);
                normalizeFormation(p);
                return { ok: true, swapped: null };
            }
            if (from >= 0) f.ranks[from][f.ranks[from].indexOf(uid)] = owner;   // 주인은 내가 있던 칸으로
            f.ranks[rank][idx] = uid;
            normalizeFormation(p);
            return { ok: true, swapped: owner };
        }
        if (from === rank) return { ok: true, swapped: null };
        let swapped = null;
        if (f.ranks[rank].length >= caps[rank]) {
            swapped = f.ranks[rank].pop();
            if (from >= 0) f.ranks[from].push(swapped);
        }
        if (from >= 0) f.ranks[from] = f.ranks[from].filter(u => u !== uid);
        f.ranks[rank].push(uid);
        normalizeFormation(p);
        return { ok: true, swapped };
    }

    /**
     * 편성 화면 상태 한 덩어리 — **판정을 여기서 다 낸다** [신설 2026-09-21 · R122 · R124 · SCREEN_DESIGN §15 · §4-1 · **다부대 2026-09-23**].
     * `runNos` = 도는 부대의 편성 번호(오름차순 · ~~`runNo` 하나~~) · `max` = 동시에 낼 수 있는 부대 수 ·
     * 편성마다 `running` = 그 편성이 도는 중인가(고르개의 「원정 중」) · 칸마다 `short` = 재고가 모자라 런에서 빈 채 시작할 칸 — `departRun` 이 채우는 것과 같은 함수(`fillSlots`)다
     */
    function presetState(state) {
        const L = limitsOf(state);
        const going = runningNos(state);
        return {
            count: L.presets, activeNo: state.preset, runNos: going, max: L.expeditions, slotMax: L.potionSlots,
            presets: state.presets.map((p, i) => {
                const filled = fillSlots(state, p);
                return {
                    no: i + 1, party: p.party.slice(), formation: clone(p.formation),
                    potionSlots: padSlots(state, p.potionSlots ?? []).map((id, k) => (id ? { id, short: !filled[k] } : null)),
                    running: going.includes(i + 1),
                    err: presetErr(state, p, i + 1),
                };
            }),
        };
    }

    /** 편성 고르기 — 편성 탭 · 출정 창 · 상단바가 **같은 값 하나**를 쓴다. 원정 중에도 고른다(도는 원정은 `run.preset` 을 든다) */
    function selectPreset(state, no) {
        if (!presetAt(state, no)) return { ok: false, err: 'missing' };
        state.preset = no;
        return { ok: true };
    }

    /**
     * 고른 편성의 물약 칸 하나를 채우거나 비운다 [신설 2026-09-21 · R124 · ADR-0195]. `slot` = 칸 자리(0 = 앞 칸) · `null` 이면 **앞의 빈 칸** ·
     * `potionId = null` 이면 비운다. **재고를 안 본다** — 칸은 구성일 뿐이고 모자란 칸은 런에서 빈다(`presetState` 의 `short`). 같은 물약을 여러 칸에 넣어도 된다
     */
    function setPotionSlot(state, slot, potionId) {
        if (potionId !== null && !potionById(potionId)) return { ok: false, err: 'missing' };
        const p = curPreset(state);
        const slots = padSlots(state, p.potionSlots ?? []);
        let at = slot;
        if (at === null || at === undefined) {
            at = slots.indexOf(null);
            if (at < 0) return { ok: false, err: 'slotsFull' };
        } else if (!(Number.isInteger(at) && at >= 0 && at < slots.length)) return { ok: false, err: 'missing' };
        slots[at] = potionId;
        p.potionSlots = slots;
        return { ok: true, slot: at };
    }

    /** 고른 편성의 물약 칸 둘을 맞바꾼다 — **앞 칸부터 마시므로 순서가 결정이다**(빈 칸과도 바꾼다) */
    function swapPotionSlot(state, a, b) {
        const p = curPreset(state);
        const slots = padSlots(state, p.potionSlots ?? []);
        const inRange = i => Number.isInteger(i) && i >= 0 && i < slots.length;
        if (!inRange(a) || !inRange(b)) return { ok: false, err: 'missing' };
        [slots[a], slots[b]] = [slots[b], slots[a]];
        p.potionSlots = slots;
        return { ok: true };
    }

    /* ── 파티 ── */

    function toggleParty(state, uid, now) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        // 원정 중에도 넣고 뺀다 [2026-09-14 · R92 · 사용자 지시] — 도는 원정은 나간 인원 그대로 싸우고(`runParty`), 바꾼 인원은 다음 원정부터다
        //   **고른 편성**에 작용한다 [2026-09-21 · R122]
        const p = curPreset(state);
        if (p.party.includes(uid)) {
            p.party = p.party.filter(u => u !== uid);
            normalizeFormation(p);                        // 뺀 자리를 뒤가 메운다 (진형 2026-09-09)
            return { ok: true };
        }
        // 편성이 막는 상태는 **수색 하나**다 [2026-09-09] — 전투 밖에 쓰러져 있는 영웅은 없지만(나오면 전원 회복)
        //   수색 나간 영웅은 마을에 없다. 출정 중 아웃은 편성이 아니라 출발이 본다
        if (heroBusy(state, uid) === 'search') return { ok: false, err: 'searching' };
        if (p.party.length >= limitsOf(state).party) return { ok: false, err: 'full' };
        // **한 영웅은 한 편성에만** [v38 · 2026-09-23 다부대] — 다른 편성에 들어 있으면 거기서 뺀다(거절이 아니라 이동 · 그 편성의 진형에서도 빠진다).
        //   편성이 곧 부대라 겹치면 한 사람이 두 부대에 선다. 도는 부대는 나간 인원 그대로 싸우므로 흔들리지 않는다 —
        //   옮겨 둔 탓에 그 편성이 못 나가는 것은 출발(`presetErr` 의 `busy`)이 본다
        for (const other of state.presets) {
            if (other === p || !other.party.includes(uid)) continue;
            other.party = other.party.filter(u => u !== uid);
            normalizeFormation(other);
        }
        p.party.push(uid);
        normalizeFormation(p);                            // 전열이 찬 뒤 후열로 — 새 영웅의 자리 (진형 2026-09-09)
        return { ok: true };
    }

    /* ~~`returnToTown(state)`~~ 는 2026-09-08 삭제 — 「출정 아웃」 폐기로 **귀환이 회복할 것이 없다**.
       회복은 런이 끝나는 순간 자동이고 상태에 남는 것이 없다(HP 는 애초에 세이브에 없다 — INTERFACE §4). */

    /* ── 스테이지 · 원정 ── */

    /** 그 장이 원정 랭크로 열렸나 — 보스를 깨도 다음 장은 저절로 안 열린다 (2026-09-24 · R152 · construction_draft §2) */
    const chapterOpen = (state, chapter) => chapter <= limitsOf(state).chapters;

    /** 해금 = **그 장이 열렸고**(`chapterOpen`) 첫 스테이지이거나 직전 스테이지(순서 기준)를 클리어했다 ·
     *  관리자 모드면 표의 모든 스테이지가 열린 척한다(클리어 기록은 안 쓴다 · 2026-09-24 · R155 · INTERFACE §2-7) */
    function stageUnlocked(state, stageId) {
        const i = deps.stageOrder.indexOf(stageId);
        if (i >= 0 && openAll()) return true;
        if (i < 0 || !chapterOpen(state, deps.stages[stageId]?.chapter)) return false;
        return i === 0 || state.progress.cleared.includes(deps.stageOrder[i - 1]);
    }

    function canDepart(state, stageId, now, no = state.preset) {
        // **그 편성의** 원정이 도는 중이어도 막지 않는다 — 보내면 `departRun` 이 그 부대를 끊는다 (R92 · 다른 부대는 안 건드린다)
        //   원정은 건물 밖이다 — 처음부터 열려 있어 `hasFeature` 를 묻지 않는다 (2026-09-25 · R161 · 원정 r1 은 장만 연다)
        if (!stageUnlocked(state, stageId)) return 'locked';
        // 편성 `no`(기본 고른 편성)로 나간다 [2026-09-21 · R122] — 없는 편성 · 빈 파티 · **수색 나간 영웅이 든 편성**은 못 나간다.
        //   편성은 계획이라 든 채로 수색을 보낼 수 있고 여기서 막는다. ~~「아웃을 빼고 아무도 안 남으면」~~ 은 2026-09-08 삭제 —
        //   아웃이 런을 넘지 않으므로 언제나 전원이 나간다 (base_expedition_design §1-1)
        //   **다부대** [2026-09-23] — 다른 부대에서 싸우는 영웅이 든 편성(`busy`) · 도는 부대가 이미 상한만큼(`full`)도 여기서 막는다
        return presetErr(state, presetAt(state, no), no);
    }

    /**
     * 스테이지 레벨 [신설 2026-09-14 · R87 · base_expedition_design §1-4] — **플레이어가 만지는 숫자는 이것 하나**이고 몬스터 레벨이 곧 이 값이다.
     *   `base` = `stage.csv:dlvl` · `max` = **클리어한 스테이지의 기본 레벨 중 최고**(키가 없다 — 클리어 기록에서 파생) ·
     *   `level` = 기본 레벨 + 올린 양(`progress.levelUp`)을 `[base, max]` 로 자른 값.
     *   올린 스테이지는 상한 이하라 그걸 깨도 상한이 안 오른다 — 그래서 기본 레벨만 봐도 「클리어한 최고 레벨」이다.
     *   **처음부터 열려 있다**(2026-09-24 · R152 — 사용자 09-14 로 되돌림 · ~~원정 건물 랭크가 연다 · `open` 칸 · R137~~).
     *   아무것도 안 깼으면 `max = base` 라 못 올린다.
     *   세이브에는 **올린 양**을 둔다 — 기본 레벨이 다시 깔려도 어긋나지 않게. 상한을 넘는 기록은 읽을 때 자른다. rng 를 안 쓴다
     */
    function stageLevelState(state, stageId) {
        const st = deps.stages[stageId];
        if (!st) return null;
        const base = st.dlvl;
        const cap = state.progress.cleared.reduce((m, id) => Math.max(m, deps.stages[id]?.dlvl ?? 0), 0);
        const max = Math.max(base, cap);
        return { base, max, level: Math.min(max, base + (state.progress.levelUp?.[stageId] ?? 0)) };
    }

    /** 스테이지 레벨을 바꾼다 — 비용 없음 · 되돌리기 자유. 기본 레벨로 돌리면 기록을 지운다(안 올린 스테이지는 적지 않는다) */
    function setStageLevel(state, stageId, level) {
        const s = stageLevelState(state, stageId);
        if (!s) return { ok: false, err: 'missing' };
        if (!Number.isInteger(level) || level < s.base || level > s.max) return { ok: false, err: 'range' };
        state.progress.levelUp = state.progress.levelUp ?? {};
        if (level === s.base) delete state.progress.levelUp[stageId];
        else state.progress.levelUp[stageId] = level - s.base;
        return { ok: true, level };
    }

    /* ~~`activeParty(state, stageId)`~~ · ~~`continuing`~~ 은 2026-09-08 삭제 — 「출정 아웃」 폐기.
       반복으로 잇는 런에도 **전원이 다시 나간다**(런이 끝나면 회복 · base_expedition_design §1-1 개정 09-08). */

    /**
     * 출발 때 켜진 전술 — 그 편성의 칸 중 **열렸고 조건이 선** 옵션 [2026-09-21 · R130 · tactic_card_design §2-1]. 원정은 이것만 산다:
     *   도중 리롤 · 새로 열린 칸은 다음 런부터 · 출발 때 꺼져 있던 것은 그 런에서 안 켜진다(교체로 전술을 **켜는** 길이 없다)
     */
    const tacticSnap = (state, party, no) => tacticState(state, party, no).slots.filter(s => s.open && s.active).map(s => s.option);
    /** 스냅숏 중 **지금 그 인원으로 조건이 선** 것 — 교체로 조건이 깨지면 꺼지고 되찾으면 다시 켜진다 (R130) */
    //   `fixed` = 출발 때 굳힌 전열 명단 · 같이 나간 런 수 — 원정 중에 그 편성의 진형을 고쳐도 도는 원정의 조건은 안 흔들린다 (R134)
    const snapMeasure = (state, snap, party, no = state.preset, fixed = null) => {
        const ctx = TC.contextOf(partyMembers(state, party, no, fixed?.front ?? null), { bond: fixed ? fixed.bond : bondOf(state, party) });
        return snap.map(option => ({ option, ...TC.measure(option, ctx) }));
    };

    // 액티브는 **전투 안에서만** 산다 — 쿨·창·배리어는 HP 와 같은 취급이라 세이브에 넣지 않는다 (INTERFACE §4)
    // `snap` = 원정의 전술 스냅숏(`departRun`) — 있으면 그 옵션 중 지금 조건이 선 것만 보너스로 넘긴다 (R130). 없으면 편성의 칸을 지금 센다
    const partyUnits = (state, uids, no = state.preset, snap = null, fixed = null) => {
        const p = presetAt(state, no) ?? curPreset(state);   // 편성 `no` — 원정은 나간 편성을 넘긴다 (R122)
        const byUid = formationOf(p).byUid;               // 자리 — 전투가 「앞」을 읽는 유일한 입력 (진형 2026-09-09) · 둘째 라운드부터는 안 읽힌다(`refit`)
        const list = uids ?? p.party;
        const tactic = snap ? TC.bonusOf(snapMeasure(state, snap, list, no, fixed).filter(m => m.active).map(m => m.option)) : undefined;
        return list.map(uid => {
            const h = heroById(state, uid);
            return {
                uid, combat: heroCombat(state, h, list, no, tactic),  // 전술 조건도 이 인원으로 센다 — 원정은 나간 인원이다 (R92) · 칸은 나간 편성의 것 (R129) · 출발 때 켜진 것만 (R130)
                stats: h.stats,                           // 기본 능력치 — 스킬 계수가 시전 순간 읽는다 (skill.js scaleDef · 2026-09-10 R72)
                actives: SK.activesFor(h, { weaponSkill: weaponSkillOf(state, h) }),
                rank: byUid[uid] ?? 0,                    // 배치가 없으면 전열 — 뒤에 숨는 유닛을 만들지 않는다
            };
        });
    };

    /* ── 원정 — **라운드 단위로 진행한다** [2026-09-14 · R89 · base_expedition_design §1-1 · 사용자 확정] ──
       출발(`departRun`)이 첫 라운드를 열고, **재생 시각을 따라 걸음마다**(`stepRun` · R130) 엔진을 그 시각까지만 민다 — 라운드가 끝나면
       **이긴 라운드만** 정산하고 경계에서 갈아입는다. 원정 중 장비 · 스킬 트리 교체는 **다음 걸음의 첫머리 = 바꾼 시각**에 먹는다
       (보스 라운드 도중만 다음 런부터 · base_expedition_design §1-5) — 보상이 들어오는 시각이 곧 라운드가 끝나는 시각이다.
       ~~런은 출발 시점에 통째로 정산된다 — 관전은 재생일 뿐~~ 은 폐기: 드롭이 실시간이 아니었고(출발 순간 가방에 다 들어갔다)
       건너뛰기 → 다시 출발로 원정을 몇 초에 하나씩 돌릴 수 있었다.
       런 핸들은 **세이브에 안 든다** — 전투 안의 HP · 쿨 · 창과 같은 취급이다. 게임이 꺼지면 그 원정은 끊긴다(`closeRun`) */

    /** 리포트의 레벨업 — 영웅마다 한 줄로 합친다(`from` = 원정 전 · `to` = 지금) */
    const mergeLevelUp = (list, lu) => {
        const had = list.find(x => x.uid === lu.uid);
        if (!had) { list.push({ ...lu, gains: {} }); return; }
        had.to = lu.to;
        had.points = (had.points ?? 0) + (lu.points ?? 0);
    };

    /**
     * 그 부대의 도는 리포트 — 판정이 아직 없고(`reason: null`) 그 부대가 나간 시각의 것. 안 돌면 null.
     * **편성 번호로 가린다** [v38 · 2026-09-23 다부대] — 부대가 여럿이면 `reason: null` 인 리포트도 여럿이라 시각만으로는 못 가린다(`report.preset`)
     */
    const liveReport = (state, no) => {
        const run = runAt(state, no);
        return run?.active ? state.reports.find(r => r.preset === no && r.at === run.lastAt && r.reason === null) ?? null : null;
    };

    /** 끝났거나 **끊긴** 원정의 핸들인가 — 끊기(새 출발 · `closeRun`)는 핸들 없이 리포트 판정만 세운다 (R92) */
    const runOver = run => !run || run.done || run.report.reason !== null;

    /**
     * 지금 싸우는 영웅 — 도는 원정이 나갈 때의 인원 [신설 2026-09-14 · R92 · **다부대 2026-09-23**]. 원정 중에도 편성을 바꾸고 고르므로 **그 편성의 지금 파티**와 다를 수 있다 —
     * 파티에서 뺀 영웅도 그 원정이 끝날 때까지 싸우고, 새로 넣은 영웅은 안 싸운다. 해고 · 수색이 이것으로 막는다. 도는 부대가 없으면 `[]`.
     * `no` 를 주면 **그 부대**의 인원, 안 주면 **도는 모든 부대를 합친 것**(중복 없음 · 편성 번호 순)
     */
    function runParty(state, no) {
        if (no !== undefined) return liveReport(state, no)?.party.slice() ?? [];
        const out = [];
        for (const n of runningNos(state)) for (const uid of liveReport(state, n)?.party ?? []) if (!out.includes(uid)) out.push(uid);
        return out;
    }

    /**
     * 그 영웅이 싸우는 부대 — 편성 번호 · 안 싸우면 null [신설 2026-09-23 · 다부대].
     * `heroBusy` 가 `'run'` 이라고만 말하는 자리에서 **어느 부대인지**가 필요할 때 읽는다(영웅 띠 · 출발의 `busy`).
     * 한 영웅은 한 부대에만 서므로 답은 하나다 · rng 0
     */
    const runOf = (state, uid) => runningNos(state).find(n => (liveReport(state, n)?.party ?? []).includes(uid)) ?? null;

    /**
     * 영웅이 지금 하는 일 — `'run'`(**도는 어느 부대든** 그 인원 · `runParty` · 어느 부대인지는 `runOf`) · `'search'`(수색 나감) · `null`(마을) [신설 2026-09-22 · INTERFACE §2-7].
     * **영웅을 붙잡는 활동의 판정은 여기 한 곳이다** — 편성 · 출발 · 해고 · 수색 · 화면의 「지금 하는 일」이 모두 이것을 읽는다.
     *   파견 · 훈련처럼 영웅을 붙잡는 활동이 생기면 여기에 더한다(흩어져 있던 `runParty(…).includes` · `search.heroUid ===` 를 걷었다 — 2026-09-22 구조 감사).
     * 둘은 겹치지 않는다 — 싸우는 영웅은 수색에 못 나가고(`searchSend`) 수색 나간 영웅이 든 편성은 못 나간다(`canDepart`).
     * 쓰러짐(`run.fallen`)은 하는 일이 아니라 **전투 안의 상태**라 따로다(`fallenOf` — 장비 · 스킬 트리 잠금)
     */
    function heroBusy(state, uid) {
        if (state.search?.heroUid === uid) return 'search';
        return runParty(state).includes(uid) ? 'run' : null;
    }

    /**
     * 출발 — 런을 열고 **첫 라운드를 연다**(R130 — ~~첫 라운드까지 계산~~). **보상은 하나도 안 준다** — 라운드의 보상은 그 라운드가 끝나는 시각에
     * `stepRun`(검증은 `advanceRun`)이 준다. 시드는 마스터 시드 + 전투 카운터에서 파생된다: 같은 세이브에서 다음 원정은 언제 돌려도 같다(도중에 장비를 안 바꾸면).
     * 리포트는 **지금 목록 맨 앞에 선다** — `reason: null` 이 「진행 중」이고 라운드를 이길 때마다 찬다.
     * @returns `{ok, run, report}` — `run` = 핸들 `{stageId, preset, report, result, done}` (INTERFACE §2-7)
     */
    function departRun(state, stageId, now, no = state.preset) {
        const why = canDepart(state, stageId, now, no);
        if (why) return { ok: false, err: why };
        // **그 부대의** 원정이 돌고 있으면 **먼저 끊는다** — 철수와 같다(진행 중이던 라운드는 없던 것 · 리포트 `retreat` · 반복 off) [2026-09-14 · R92 · 사용자 지시].
        //   보상은 이긴 라운드에만 들어오므로 끊고 다시 보내는 것이 가속 수단이 안 된다. 옛 핸들은 리포트 판정이 서서 `done` 으로 거절된다.
        //   **다른 부대는 안 건드린다** [2026-09-23 · 다부대] — 부대마다 제 칸을 가진다
        cutRun(state, 'retreat', no);

        state.counters.battle += 1;
        const rng = makeRng(deriveSeed(state.seed, state.counters.battle));
        // **전원이 나간다** [개정 2026-09-08 — 「출정 아웃」 폐기] (base_expedition_design §1-1). 이 인원이 핸들의 `party` 로 굳는다 —
        //   원정 중에 편성을 바꿔도 도는 원정은 이 인원 · 이 인원의 전술로 싸운다 (R92)
        //   편성 `no`(기본 고른 편성 · 반복은 도는 원정의 `run.preset`)의 파티다 — 반복은 **그 편성의 지금 모습**으로 나간다 (R122)
        const preset = presetAt(state, no);
        const going = preset.party.slice();
        // 몬스터 레벨 = **이 스테이지의 지금 레벨**(올린 양 포함 · 2026-09-14 R87). rng 를 안 쓰므로 수열이 안 밀린다
        const level = stageLevelState(state, stageId).level;
        // 물약 — **이 런을 열 때** 그 편성의 칸 구성을 재고에서 앞 칸부터 채운다(모자란 칸은 빈다). 재고는 마실 때 준다(`advanceRun`).
        //   원정 도중에 만든 물약은 다음 런부터 든다 (battle_design §7-1 · R124). rng 0
        // 전술은 **이 순간 켜진 것만** 산다 — 핸들의 `tactics` 로 굳힌다 (R130 · tactic_card_design §2-1). rng 0
        const tactics = tacticSnap(state, going, no);
        //   조건이 읽은 전열 · 같이 나간 런 수도 굳힌다 — 도는 원정의 재판정(`runTactics`)이 이 값으로 센다 (R134)
        const byUid = formationOf(preset).byUid;
        const fixed = { front: going.filter(uid => (byUid[uid] ?? 0) === 0), bond: bondOf(state, going) };
        const battle = BT.createRun(partyUnits(state, going, no, tactics, fixed), stageId, rng, level, fillSlots(state, preset), limitsOf(state).potionSlots);
        // 같이 나간 런 수 — **출발할 때 +1** · 이 런의 판정은 +1 전 값이다(위 `fixed.bond`) (v36 · tactic_card_design §5-8)
        state.bonds = state.bonds ?? {};
        state.bonds[bondKey(going)] = fixed.bond + 1;

        const report = {
            at: now, stageId, level, preset: no, won: false, reason: null, durationSec: 0,   // reason null = 진행 중 · preset = 어느 부대의 런인가 (v38 · 다부대)
            gold: 0, xp: Object.fromEntries(going.map(uid => [uid, 0])), levelUps: [],
            downed: [], party: going.slice(), drops: [], discarded: 0,
            rounds: [], roundsCleared: 0,
            // 빗나감 · 기여는 **0 에서 자리를 잡는다** — 첫 라운드 전에 끊겨도 리포트가 빈 칸 없이 선다 (SCREEN_DESIGN §4-3)
            strikes: { party: { n: 0, miss: 0 }, enemy: { n: 0, miss: 0 } },
            contrib: going.map(uid => ({ uid, dealt: 0, taken: 0, kills: 0 })),
        };
        // 목록의 맨 앞에 넣고 상한만큼만 남긴다 — 오래된 런부터 밀려난다 (v21)
        state.reports.unshift(report);
        if (state.reports.length > B.report_keep) state.reports.length = B.report_keep;
        // 부대의 자리에만 쓴다 — 다른 부대의 칸은 그대로다. 반복 플래그는 **그 부대가 같은 스테이지를 돌던 중**이었을 때만 이어받는다 (v38 · 다부대)
        state.runs[no - 1] = {
            stageId, preset: no, repeat: runAt(state, no)?.stageId === stageId ? runAt(state, no).repeat : false,
            // fallen = 이 런에서 쓰러져 있는 영웅 — `stepRun` 이 채운다 · 장비 · 스킬 트리 잠금(`downed`)이 읽는다 (R130 · 옛 v16 `downed` 와 다른 필드)
            lastAt: now, durationSec: 0, active: true, fallen: [],
        };
        // 첫 라운드를 **연다** — 스폰 · 등장 지연 굴림은 여기서 돈다. 틱은 재생 시각을 따라 `stepRun` 이 민다 [2026-09-21 · R130] —
        //   ~~첫 라운드까지 계산한다~~: 미래를 미리 계산해 두면 원정 중 교체가 그 순간 먹을 자리가 없다(base_expedition_design §1-5)
        battle.advance(0);
        return { ok: true, report, run: { stageId, preset: no, report, result: battle.result, done: false, battle, rng, party: going, tactics, fixed } };
    }

    /** 그 원정이 지금 입을 파티 — 나간 인원 · 나간 편성 · 출발 때 켜진 전술로 (R92 · R122 · R130) */
    const runUnits = (state, run) => partyUnits(state, run.party, run.preset, run.tactics, run.fixed);

    /**
     * 지금 교체가 전투에 먹는가 [신설 2026-09-21 · R130 · base_expedition_design §1-5] — 도는 원정이 **보스 라운드 도중**이면 `'boss'`
     *   (바꿔도 다음 런부터) · 아니면 null. 화면이 교체 뒤 플래시를 고른다 · rng 0
     */
    function runLock(state, run) {
        if (runOver(run)) return null;
        const st = run.battle.status();
        return st.inRound && st.kind === 'boss' ? 'boss' : null;
    }

    /**
     * 도는 원정의 전술 [신설 2026-09-21 · R130 · tactic_card_design §2-1] — 출발 때 켜진 옵션마다 **지금 그 원정 인원으로** 센 조건.
     *   `active` 가 거짓이면 교체로 조건이 깨져 꺼진 것이다(되찾으면 다시 켜진다). 도는 원정이 없으면 `[]` · rng 0
     * @returns `[{option, have, need, active}]`
     */
    function runTactics(state, run) {
        return runOver(run) ? [] : snapMeasure(state, run.tactics ?? [], run.party, run.preset, run.fixed);
    }

    /** 「이 아이템을 끼면」 도는 원정의 전술 [신설 2026-09-21 · R130] — `heroCombatIf` 와 같은 사본으로 센다(원본 불변 · 가방 툴팁의 경고 줄) */
    function runTacticsIf(state, run, heroUid, itemUid) {
        const w = runOver(run) || !run.party.includes(heroUid) ? null : wearing(state, heroById(state, heroUid), itemUid);
        return runTactics(w ? w.state : state, run);
    }

    /**
     * 끝난 라운드 하나를 정산한다 — `advanceRun` · `stepRun` 이 같이 쓴다.
     *   ① **이긴 라운드만**: 골드 → 도감(처치 수) → 드롭(인벤토리 · 넘치면 그 순간 버린다) →
     *      **경험치 = 그 라운드 처치 XP 합 × xp_rate 를 그 순간 살아 있는 영웅마다**(쓰러진 영웅은 그 라운드 몫이 없다) → 마지막 라운드면 클리어.
     *      진 라운드(전멸 · 시간 초과)는 보상 없이 런을 닫는다
     *   ② 런이 안 끝났으면 **경계 갈아입기** — 그 순간의 장비 · 레벨로(레벨업이 여기서 먹는다). 다음 라운드는 다음 걸음이 연다 (R130)
     * @returns 런이 끝났나
     */
    function settleRound(state, run, s) {
        const R = run.report, res = run.result;
        // 마신 물약을 재고에서 뺀다 — 이겼든 졌든 그 라운드에 마신 것이다 (R124 · battle_design §7-1). 버린 라운드(철수 · 끊김)는 여기 안 온다
        for (const [id, k] of Object.entries(s.potions ?? {})) spendPotion(state, id, k);
        if (s.cleared) {
            state.resources.gold += s.gold;
            R.gold += s.gold;
            // ~~처치가 뱉는 가루~~ 는 2026-09-09 삭제 — 가루의 공급원은 **분해** 하나다(`salvage` · item_design §5-3)
            // 도감 레벨의 출처 — 이긴 라운드의 처치 수 (monster_design §8 · 2026-09-21 카드 걷음)
            for (const [id, n] of Object.entries(s.kills)) state.codexKills[id] = (state.codexKills[id] ?? 0) + n;
            const gained = [];   // 들어온 드롭 — 의뢰 「수집」이 센다(버린 것은 안 든다 · R153)
            for (const it of s.drops) {
                // 알아서 분해 [2026-09-21 · R125 · item_design §6-5] — **가방 참 검사보다 먼저** 선을 본다: 걸린 것은 칸을 안 먹고 버린 수에도 안 든다.
                //   「그 런이 준 것」이라 uid 를 받아 리포트 `drops` 에 남긴 뒤 곧바로 지운다 — 화면은 흐린 빈 칸으로 그린다(SCREEN_DESIGN §4-3) · rng 0
                if (autoSalvageHits(autoRuleOf(state), it)) {
                    const gone = addItem(state, it);
                    R.drops.push(gone.uid);
                    gained.push(gone);
                    state.resources.dust += I.salvageDust(gone);
                    delete state.items[gone.uid];
                    continue;
                }
                if (state.bag.length >= capOf(state, 'bag')) { R.discarded++; continue; }
                const added = addItem(state, it);
                state.bag.push(added.uid);
                R.drops.push(added.uid);
                gained.push(added);
            }
            commissionCount(state, run.stageId, s.killGrades ?? {}, gained);
            // 경험치 — **그 순간 살아 있는 영웅만** 같은 양을 받는다 (사용자 확정 2026-09-14). 레벨업은 다음 라운드부터 전투에 먹는다(②)
            //   **경험치 획득 +%**(방어구 공통옵션)는 **낀 영웅 본인 몫**만 늘린다 [2026-09-18 사용자 확정 · item_design §1 「갑옷 옵션」] —
            //   그 순간 입은 장비로 잰다(`heroCombat` 의 옵션 묶음). 0 이면 종전과 같은 값 · rng 0
            const xpBase = s.xp * B.xp_rate;
            for (const uid of s.alive) {
                const h = heroById(state, uid);
                if (!h) continue;
                const gain = heroCombat(state, h).option_fx?.xpGain ?? 0;
                const xp = Math.round(gain ? xpBase * (1 + gain) : xpBase);
                const lu = H.grantXp(h, xp, run.rng);
                R.xp[uid] = (R.xp[uid] ?? 0) + xp;
                if (lu) mergeLevelUp(R.levelUps, lu);
            }
        }
        // 사실의 기록 — 소요 · 라운드 · 빗나감 · 기여 · 전투불능은 **정산한 라운드 끝**까지 (진 라운드도 끝까지 싸운 것이라 들어간다)
        R.durationSec = s.t;
        R.rounds = clone(res.rounds);
        R.roundsCleared = res.roundsCleared;
        R.strikes = clone(res.strikes);
        R.contrib = clone(s.contrib);
        R.downed = res.downed.slice();
        const slot = runAt(state, run.preset);   // **그 부대의 칸** — 다른 부대는 제 걸음으로 따로 정산한다 (v38 · 다부대)
        if (slot) slot.durationSec = s.t;

        if (s.ended) {
            R.won = res.won;
            R.reason = res.reason;
            if (res.won && !state.progress.cleared.includes(run.stageId)) state.progress.cleared.push(run.stageId);
            run.done = true;
            if (slot) { slot.active = false; slot.fallen = []; }   // 전투 밖 = 전원 회복 (base_expedition_design §1-1)
            return true;
        }
        run.battle.refit(runUnits(state, run));
        return false;
    }

    /**
     * 라운드 하나를 끝까지 [개정 2026-09-21 · R130] — 첫머리 갈아입기(`stepRun` 과 같다) 뒤 **지금 라운드를 끝까지 계산해** 정산한다
     * (`settleRound`). `stepRun(state, run, Infinity)` 의 한 라운드판이다 — 검증 · `resolveBattle` 이 쓴다. **게임 화면은 `stepRun`** 을 쓴다.
     * ~~진행 시각이 `run.segEnd` 에 닿았을 때 부른다~~ — 라운드를 미리 계산하지 않아 끝 시각이 없다
     */
    function advanceRun(state, run, now) {
        if (runOver(run)) return { ok: false, err: 'done' };
        run.battle.refit(runUnits(state, run));
        const s = run.battle.advance(Infinity);
        const done = settleRound(state, run, s);
        const slot = runAt(state, run.preset);
        if (slot?.active) slot.fallen = run.result.downed.slice();   // `stepRun` 과 같이 **그 부대의 칸에** 적는다 — 잠금(`downed`)이 읽는다
        return { ok: true, round: s, done };
    }

    /**
     * 걸음 [신설 2026-09-21 · R130 · base_expedition_design §1-5 — 원정 중 교체는 그 순간부터] — 재생 시각(또는 앱 시계) `until` 까지 원정을 민다.
     *   ① **첫머리 갈아입기** — 그 순간의 파티를 넘긴다(바뀐 영웅만 · 쓰러진 영웅은 안 입는다 · **보스 라운드 도중이면 엔진이 거절**).
     *      그래서 원정 중 장비 · 스킬 트리 교체는 **다음 걸음의 첫머리 = 바꾼 시각**에 먹는다
     *   ② `advance(until)` — 끝난 라운드가 나오면 정산하고(`settleRound` — 경계 갈아입기 포함) 이어 민다(한 걸음에 여러 라운드 — 숨긴 탭)
     *   ③ 이 런에서 쓰러져 있는 영웅(`runs[preset-1].fallen`)을 적는다 — 장비 · 스킬 트리 잠금(`downed`)이 읽는다
     * **교체가 없으면 어디서 끊어 걸어도 `resolveBattle` 과 같은 결과다**(틱 수열이 같다 · INTERFACE §8 항목 18)
     * @returns `{ok, rounds, done}` — 정산한 라운드 수 · 런이 끝났나
     */
    function stepRun(state, run, until) {
        if (runOver(run)) return { ok: false, err: 'done' };
        run.battle.refit(runUnits(state, run));
        let rounds = 0, done = false;
        for (let s = run.battle.advance(until); s; s = run.battle.advance(until)) {
            rounds++;
            done = settleRound(state, run, s);
            if (done) break;
        }
        const slot = runAt(state, run.preset);
        if (slot?.active) slot.fallen = run.result.downed.slice();   // 부대마다 제 칸에 적는다 (v38 · 다부대)
        return { ok: true, rounds, done };
    }

    /** 그 부대의 원정을 끊는다 — 진행 중이던 라운드는 **없던 것**이다(보상 없음 · 리포트는 마지막으로 정산한 라운드 끝 그대로). 반복도 끈다. 끊었으면 true */
    function cutRun(state, reason, no) {
        const run = runAt(state, no);
        if (!run?.active) return false;
        const R = liveReport(state, no);
        run.active = false;
        run.repeat = false;
        run.fallen = [];              // 끊기면 전투 밖이다 — 쓰러져 있는 영웅이 없다 (R130)
        if (R) R.reason = reason;
        return true;
    }

    /** 철수 — 관전의 옛 「건너뛰기」 자리다 (R89). 진행 중이던 라운드는 버리고 원정을 끝낸다 · 이긴 라운드의 보상은 이미 들어가 있다 */
    function retreatRun(state, run, now) {
        if (runOver(run)) return { ok: false, err: 'done' };
        run.done = true;
        cutRun(state, 'retreat', run.preset);   // 핸들이 어느 부대인지 안다 — 다른 부대는 안 건드린다 (v38 · 다부대)
        return { ok: true, report: run.report };
    }

    /**
     * 개발 · 검증용 **즉시 계산** — 출발한 뒤 라운드를 끝까지 같은 `now` 로 넘긴다(장비를 안 바꾸므로 라운드 사이에 들어가는 것은 레벨업뿐이다).
     * 골든 · 단정 · 캘리브레이션 · `?dev=battle` 이 쓴다. **게임 화면은 안 쓴다** — 화면은 `departRun` → `stepRun` 을 시간에 맞춰 부른다(R130)
     */
    function resolveBattle(state, stageId, now, no = state.preset) {
        const d = departRun(state, stageId, now, no);
        if (!d.ok) return d;
        while (!advanceRun(state, d.run, now).done);
        return { ok: true, result: d.run.result, report: d.report };
    }

    /**
     * 재접속 · 멈춤 — **원정은 게임이 켜져 있는 동안만 돈다** (base_expedition_design §1 · 2026-08-25).
     * **도는 부대를 전부 끊는다** [개정 2026-09-14 · R89 · 사용자 확정 · **다부대 2026-09-23**] — 진행 중이던 라운드는 버리고(리포트 `closed`) 반복을 끈다.
     *   ~~꺼져 있던 사이 돌던 런은 마무리된 것으로 본다~~ 는 폐기 — 남은 라운드를 마무리해 주면 껐다 켜기로 원정을 무한히 빨리 돌릴 수 있다.
     * 끊었거나 반복이 켜져 있던 부대가 하나라도 있으면 재접속 알림을 남긴다(`notice.runs` = 부대마다 한 줄 · 편성 번호 순).
     * 오프라인에 도는 것은 파견뿐이다 — 미구현
     */
    function closeRun(state, now) {
        const hit = [];
        for (let i = 0; i < (state.runs?.length ?? 0); i++) {
            const run = state.runs[i];
            if (!run) continue;
            const repeat = run.repeat === true;
            const cut = cutRun(state, 'closed', i + 1);
            if (!cut && !repeat) continue;
            run.repeat = false;
            hit.push({ stageId: run.stageId, at: run.lastAt });
        }
        if (hit.length === 0) return null;
        // `stageId` · `at` 은 **첫 줄 그대로** — 한 부대만 돌던 화면이 안 깨지게 남긴다 (v38)
        state.notice = { kind: 'runClosed', runs: hit, stageId: hit[0].stageId, at: hit[0].at, seenAt: now };
        return state.notice;
    }
    function dismissNotice(state) { state.notice = null; }

    /**
     * 반복 원정의 다음 출발 [신설 2026-09-22 · 부채 #57 · INTERFACE §2-7 · base_expedition_design §1-1 · ADR-0300] — **아무것도 안 바꾼다** · rng 0.
     * **부대마다 따로 묻는다** [2026-09-23 · 다부대] — `no` 가 없으면 그 부대는 없는 것이다.
     * 끝난 원정이 반복이 켜져 있고 이긴 런이면 같은 스테이지 · 같은 편성으로 **끝난 순간 + [balance.csv:repeat_restart_sec]** 에 나간다.
     * 관전 결과 띠의 세기와 앱 시계가 둘 다 이 답대로만 출발시킨다 — 보고 있든 다른 탭이든 같은 시각이다(옛 화면은 두 곳에서 따로 셌다).
     * `endedAt` = 그 런이 **실제로 끝난 순간**(ms) — 배속이 게임 시각을 밀어서 로직은 모르고 화면 층이 잰다
     */
    function nextRepeat(state, endedAt, no) {
        const run = runAt(state, no);
        if (!run || run.active || run.repeat !== true) return null;   // 반복 원정은 처음부터 열려 있다 (2026-09-24 · R152 · ~~원정 건물 r2 가 연다~~)
        const report = state.reports.find(r => r.preset === no && r.at === run.lastAt);
        if (!report?.won) return null;
        return { stageId: run.stageId, preset: run.preset, at: endedAt + B.repeat_restart_sec * 1000 };
    }

    /* ── 선술집 — 명단 · 리롤 쿨다운 (base_expedition_design §2-4 확정 2026-08-26) ── */

    /**
     * 명단 — 시드+카운터에서 매번 같은 사람들이 다시 나온다 (명단 자체는 저장하지 않는다).
     * **고용한 칸은 `null`** — 빈 채로 남고 다음 리롤에 채워진다. 그래서 저장하는 것은 「몇 번 칸을 샀나」뿐이다
     */
    function tavernCandidates(state) {
        const rng = makeRng(deriveSeed(state.seed ^ 0x5A17, state.counters.tavern));
        const hired = state.tavern?.hired ?? [];
        return H.rollCandidates(rng, limitsOf(state).tavernCandidates).map((c, i) => (hired.includes(i) ? null : c));
    }
    /**
     * 선술집에서 온 영웅(명단 · 수색)의 시작 장비 스트림 [2026-09-25 사용자 지시] — **그 영웅의 번호**(`addHero` 가 올린 `counters.hero`)가 정한다.
     *   명단(`^ 0x5A17`) · 수색 결과(`^ 0x5EA7`)와 갈라 두어 나올 영웅을 안 바꾼다 · 불러오기를 다시 해도 같은 한 벌이다 (INTERFACE §5-1)
     */
    const recruitRng = state => makeRng(deriveSeed(state.seed ^ 0x6EA2, state.counters.hero));
    /** 무료 리롤이 열리는 시각 — 리롤한 적이 없으면 이미 열려 있다. 쿨다운은 **플레이어 행동**에 걸린다(자동 갱신 없음) */
    function tavernFreeAt(state) {
        const at = state.tavern?.rerolledAt;
        return at == null ? 0 : at + B.tavern_refresh_hours * 60 * 60 * 1000;
    }
    /** 선술집 화면 상태 한 덩어리 — 판정을 여기서 다 낸다 (masteryState 와 같은 규칙) · `open` = 고용이 열렸나(선술집 건물 · R137) */
    function tavernState(state, now) {
        const freeAt = tavernFreeAt(state);
        return { candidates: tavernCandidates(state), freeAt, free: now >= freeAt, cost: B.tavern_reroll_cost, open: hasFeature(state, 'hire') };
    }
    /** 리롤 — 쿨다운이 끝났으면 무료, 아니면 즉시 리롤 비용(골드). 리롤은 명단을 통째로 갈고 쿨다운을 다시 건다 · 선술집을 안 지었으면 `unbuilt` */
    function tavernReroll(state, now) {
        if (!hasFeature(state, 'hire')) return { ok: false, err: 'unbuilt' };
        const free = now >= tavernFreeAt(state);
        if (!free && state.resources.gold < B.tavern_reroll_cost) return { ok: false, err: 'gold' };
        if (!free) state.resources.gold -= B.tavern_reroll_cost;
        state.counters.tavern += 1;
        state.tavern = { rerolledAt: now, hired: [] };
        return { ok: true, free };
    }
    function hire(state, index) {
        if (!hasFeature(state, 'hire')) return { ok: false, err: 'unbuilt' };   // 선술집이 연다 (R137)
        if (state.heroes.length >= limitsOf(state).roster) return { ok: false, err: 'roster' };
        if (state.resources.gold < B.tavern_hire_cost) return { ok: false, err: 'gold' };
        const c = tavernCandidates(state)[index];
        if (!c) return { ok: false, err: 'missing' };
        state.resources.gold -= B.tavern_hire_cost;
        const h = addHero(state, clone(c));
        equipStarter(state, h, recruitRng(state));   // 시작 영웅과 같은 한 벌을 입고 온다 (2026-09-25 사용자 지시)
        // 고용한 칸만 빈다 — 명단을 갈지 않는다. 고용이 무료 리롤 우회로가 되면 쿨다운이 무의미해진다 (§2-4)
        state.tavern = state.tavern ?? { rerolledAt: null, hired: [] };
        state.tavern.hired.push(index);
        return { ok: true, hero: h };
    }

    /* ── 상점 — 특수상단 방문 시계 · 상단 장비 목록 (base_expedition_design §2-6 · SCREEN_DESIGN §8-3 · 2026-09-21 사용자 지시 · ADR-0223) ──
       시계는 **게임을 만든 시각에서 센다** — `trade_visit_hours` 마다 상인이 오고 `trade_stay_hours` 머문다. 벽시계라 오프라인에도 흐른다.
       장비 목록은 **방문 회차마다** 새로 굴린다(상인이 오는 순간 같이 갈린다). 시드 + 회차라 저장하지 않는다 — 선술집 명단과 같은 문법.
       ⚠ 구매는 아직 없다(화면이 미착수 안내를 낸다) — 그래서 「산 칸」도 세이브에 없다 */
    const HOUR_MS = 60 * 60 * 1000;
    const SHOP_PRICE = { normal: B.shop_price_normal, magic: B.shop_price_magic, rare: B.shop_price_rare };

    /** 방문 시계 — rng 를 안 쓰고 아무것도 안 바꾼다. 앱 시계가 틱마다 불러 방문이 바뀌는 순간을 잰다(목록 굴림과 갈라 둔 이유) */
    function shopVisit(state, now) {
        const period = B.trade_visit_hours * HOUR_MS, stay = B.trade_stay_hours * HOUR_MS;
        const t0 = state.createdAt ?? 0;
        // 시계가 게임을 만든 시각보다 뒤로 가 있으면(기기 시계를 돌렸다) 첫 회차의 첫 순간으로 본다
        const cycle = Math.floor(Math.max(0, now - t0) / period);
        const arriveAt = t0 + cycle * period;
        const leaveAt = arriveAt + stay;
        const nextAt = arriveAt + period;
        const here = now < leaveAt;
        return { cycle, here, arriveAt, leaveAt, nextAt, remainMs: (here ? leaveAt : nextAt) - now };
    }

    /** 지금 진행 중인 챕터 — 열린 스테이지 중 **가장 뒤의 것**의 챕터 */
    function frontierChapter(state) {
        let ch = chapterBands[0]?.band ?? 1;
        for (const id of deps.stageOrder) if (stageUnlocked(state, id)) ch = deps.stages[id]?.chapter ?? ch;
        return ch;
    }

    /** 상단이 파는 부위 — 착용 위치 순서에서 부위만 한 번씩(반지는 위치가 둘이어도 한 종류다) */
    const shopParts = [...new Set(deps.equipSlots.map(s => s.part))];
    /** 부위마다 파는 개수 — **무기만 따로**(맨 윗줄을 혼자 채운다 · 사용자 지시 2026-09-21) · 나머지는 한 값 */
    const shopCountOf = (state, part) => (part === 'weapon' ? limitsOf(state).shopWeapon : limitsOf(state).shopPerSlot);

    /**
     * 상점 화면 상태 한 덩어리 — 방문 시계 + 상단 장비 목록. **판정을 여기서 다 낸다**(`tavernState` 와 같은 규칙).
     * 목록은 **부위마다 `shop_equip_per_slot` 개**(무기만 `shop_equip_weapon` 개)이고 같은 부위가 붙어 선다
     * [2026-09-21 사용자 지시 「종류별로 한 3개씩만 해서 붙여놔야지 서로」 · 「맨위에 무기 6개로 하고 다른걸 하나씩 밀어보자」].
     * rng = `deriveSeed(seed ^ 0x5409, 회차)` — 부위 순서대로 칸마다 ilvl 1회(진행 챕터의 레벨대 균등) → `item.rollGear` 한 점 (INTERFACE §5-1 · §5-2).
     * 아이템은 `uid` 가 없다 — 가방에 들지 않은 물건이라 `addItem` 을 안 지난다
     */
    function shopState(state, now) {
        const visit = shopVisit(state, now);
        const chapter = frontierChapter(state);
        const band = chapterBands.find(b => b.band === chapter) ?? chapterBands[0];
        const rng = makeRng(deriveSeed(state.seed ^ 0x5409, visit.cycle));
        const equip = [];
        for (const part of shopParts)
            for (let i = 0; i < shopCountOf(state, part); i++) {
                const ilvl = band.lo + Math.floor(rng() * (band.hi - band.lo + 1));
                const [item] = I.rollGear(rng, { slots: [part], ilvl });
                equip.push({ item, gold: SHOP_PRICE[item.rarity] });
            }
        // `open` = 상단 · `special` = 특수상단 방문 — 건물 랭크가 연다(R137). 목록 · 시계는 닫혀 있어도 같은 값이다(시드 + 회차)
        return { ...visit, chapter, lo: band.lo, hi: band.hi, equip, open: hasFeature(state, 'shop'), special: hasFeature(state, 'shop_special') };
    }

    /* ── 도박장 — 슬롯 (base_expedition_design 「도박장」 · INTERFACE §2-7 · §2-15 · 2026-09-24 사용자 「일단 만들어」 · R149) ──
       판은 `gamble.js` 가 굴리고 여기는 **판돈 · 지급**만 한다.
       **횟수 제한이 없다 — 판돈만 있으면 돈다**(같은 날 사용자 「횟수 무제한 · 돈만 있으면」 — 충전식에서 바뀜 · ADR-0334). 시계를 안 본다.
       판돈과 재료 단계는 **진행 챕터**(`frontierChapter` — 상점과 같은 값)를 따른다: 재료만 챕터를 따르면 뒤 챕터에서 싼 판돈으로 비싼 재료를 산다.
       결과는 저장하지 않는다 — 판 번호(`counters.gamble`)와 시드가 재현한다(선술집 명단 · 제작과 같은 문법). 장비 · 낙인은 안 나온다 */

    /** 판돈 — 기본 판돈 × 챕터 배수^(챕터−1) × 단계 배수를 곱한 **뒤 한 번** 정수로 (INTERFACE §5-3) */
    const gambleStake = (chapter, mult) => Math.round(B.gamble_stake_gold * B.gamble_stake_chapter_mult ** (chapter - 1) * mult);
    /** 그 단계보다 높지 않은 가장 높은 tier 의 산출물 — 표에 그 tier 가 없어도 비지 않게 */
    const tierYield = (nodes, chapter) => (nodes ?? []).reduce((best, n) => (n.tier <= chapter && (!best || n.tier > best.tier) ? n : best), null)?.yieldId ?? null;
    /** 재료 심볼이 주는 재화 id — 광석 · 목재는 진행 챕터 단계 · 가루는 자원 */
    const gambleMats = chapter => ({ ore: tierYield(deps.mineNodes, chapter), timber: tierYield(deps.logNodes, chapter), dust: 'dust' });

    /**
     * 도박장 화면 상태 한 덩어리 — **판정을 여기서 다 낸다**(`tavernState` 와 같은 규칙) · rng 0 · 상태 불변.
     * `pays` = **고른 단계의 판돈에서의** 배당표 — 골드는 `floor(값 × 판돈)`(지급과 같은 식) · 재료는 `pay × 단계 배수` 개
     */
    function gambleState(state, step = 1) {
        const chapter = frontierChapter(state);
        const openN = limitsOf(state).gambleStakes;
        const stakes = GB.stakes.map((s, i) => ({ step: s.step, mult: s.mult, gold: gambleStake(chapter, s.mult), open: i < openN }));
        const cur = stakes.find(s => s.step === step) ?? stakes[0];
        const mats = gambleMats(chapter);
        return {
            open: hasFeature(state, 'gamble'), chapter, mats, stakes,
            step: cur.step, stake: cur.gold, batch: B.gamble_batch_spins,
            pays: {
                symbols: GB.symbols.filter(s => s.kind !== 'coin').map(s => (s.yield === 'gold'
                    ? { id: s.id, gold: Math.floor(s.pay * cur.gold), mat: null }
                    : { id: s.id, gold: 0, mat: { id: mats[s.yield], n: s.pay * cur.mult } })),
                coins: GB.coins.map(c => ({ id: c.id, gold: Math.floor(c.value * cur.gold) })),
            },
            n: state.counters.gamble ?? 0,
        };
    }

    /**
     * 한 판 — 횟수 제한 없음. 거절 순서 `unbuilt` → `missing`(표에 없는 단계) → `locked`(안 열린 단계) → `gold` — 거절이면 아무것도 안 바뀐다(스트림도 안 연다).
     * 통과하면 판돈을 쓰고 `counters.gamble` 선증가 → rng = `deriveSeed(seed ^ 0x6A3B, 판 번호)` (INTERFACE §5-1)
     * → 골드 `floor(goldMult × 판돈)` · 재료 `mats × 단계 배수`(광석 · 목재 = `materials[그 챕터 단계 id]` · 가루 = `resources.dust`).
     * `net` 은 골드만 센다 — 재료는 순손익에 안 든다
     */
    function gambleSpin(state, step) {
        if (!hasFeature(state, 'gamble')) return { ok: false, err: 'unbuilt' };
        const idx = GB.stakes.findIndex(s => s.step === step);
        if (idx < 0) return { ok: false, err: 'missing' };
        if (idx >= limitsOf(state).gambleStakes) return { ok: false, err: 'locked' };
        const chapter = frontierChapter(state);
        const { mult } = GB.stakes[idx];
        const stake = gambleStake(chapter, mult);
        if (state.resources.gold < stake) return { ok: false, err: 'gold' };

        state.resources.gold -= stake;
        state.counters.gamble = (state.counters.gamble ?? 0) + 1;
        const r = GB.spin(makeRng(deriveSeed(state.seed ^ 0x6A3B, state.counters.gamble)));

        const gold = Math.floor(r.goldMult * stake);
        state.resources.gold += gold;
        const ids = gambleMats(chapter), got = {};
        for (const [k, units] of Object.entries(r.mats)) {
            const n = units * mult;
            if (!n || !ids[k]) continue;
            if (k === 'dust') state.resources.dust += n;
            else state.materials[ids[k]] = (state.materials[ids[k]] ?? 0) + n;
            got[ids[k]] = (got[ids[k]] ?? 0) + n;
        }
        // `coinGold` = 코인마다 **이 판의 판돈에서** 받는 골드 — 화면이 코인 칸에 적는 값이다(배당표와 같은 식 · 화면이 곱하지 않게)
        const coinGold = Object.fromEntries(GB.coins.map(c => [c.id, Math.floor(c.value * stake)]));
        return { ok: true, spin: { ...r, n: state.counters.gamble, step, stake, chapter, gold, mats: got, net: gold - stake, coinGold } };
    }

    /**
     * 여러 판 돌리기 — `gambleSpin` 을 **`gamble_batch_spins` 판까지** 거듭 부르고 거절이 나면 멈춘다(판돈이 떨어지면 덜 돈다).
     * 판 수가 정해진 까닭: 횟수 제한이 없어 끝이 골드뿐이면 한 번 누름에 가진 골드를 다 건다 (ADR-0334).
     * 한 판도 못 돌았으면 그 거절을 그대로 낸다 · `stop` = 멈춘 사유(다 돌았으면 null) · 합계는 여기서 낸다(화면이 더하지 않게)
     */
    function gambleSpinBatch(state, step) {
        const spins = [];
        let stop = null;
        while (spins.length < B.gamble_batch_spins) {
            const r = gambleSpin(state, step);
            if (!r.ok) { stop = r.err; break; }
            spins.push(r.spin);
        }
        if (!spins.length) return { ok: false, err: stop };
        const mats = {};
        for (const s of spins) for (const [id, n] of Object.entries(s.mats)) mats[id] = (mats[id] ?? 0) + n;
        const sum = k => spins.reduce((a, s) => a + s[k], 0);
        return { ok: true, spins, stop, gold: sum('gold'), stake: sum('stake'), net: sum('net'), mats };
    }

    /* ── 의뢰 — 게시판 · 받기 · 세기 · 수령 (base_expedition_design §1-3 · INTERFACE §2-7 · §2-16 · 2026-09-24 사용자 「의뢰가 실제로 적용되도록」 · R153) ──
       카드는 `commission.js` 가 굴리고 여기는 **자리 · 받기 · 세기 · 지급**만 한다.
       게시판은 `commission_board_cards` 자리이고 받은 카드는 **제자리에서** 진행 중이 된다 — 자리가 비는 것은 수령 · 포기 때이고 그 자리에 새 카드를 굴린다.
       카드는 **굴린 순간의 내용을 박는다** — 대상 풀이 그때의 진행(열린 스테이지)에 달려 있어 다시 굴리면 다른 카드다(수색 스냅샷과 같은 이유).
       기한은 없다 · 포기에 벌이 없다 · 명성은 보류(카드에 명성 칸이 없다) */

    const isTaken = c => c.have !== undefined && c.have !== null;
    const boardOf = state => state.commissions?.cards ?? [];
    const ownBoard = state => (state.commissions ??= { cards: [] }).cards;

    /** 굴릴 대상 — **지금 들어갈 수 있는 스테이지**의 챕터 · 일반몹 · 그 종족 + 진행 챕터. 순서가 계약이다(챕터 · 몬스터 오름차순 · 종족은 표 순서 · INTERFACE §2-16) */
    function commissionCtx(state) {
        const chapters = new Set(), monsters = new Set();
        for (const id of deps.stageOrder) {
            if (!stageUnlocked(state, id)) continue;
            const st = deps.stages[id];
            chapters.add(st.chapter);
            for (const m of BT.stagePool(st)) monsters.add(m);
        }
        const mons = [...monsters].sort((a, b) => a - b);
        const present = new Set(mons.map(id => deps.monsters[id]?.monster_type));
        return {
            chapters: [...chapters].sort((a, b) => a - b),
            monsters: mons,
            races: CM.races.map(r => r.id).filter(id => present.has(id)),
            chapter: frontierChapter(state),
        };
    }

    /** 카드 한 장 — `counters.commission` 선증가 → rng = `deriveSeed(seed ^ 0xC0DA, 번호)` (INTERFACE §5-1) · 굴릴 틀이 없으면 null */
    function rollCard(state) {
        state.counters.commission = (state.counters.commission ?? 0) + 1;
        const no = state.counters.commission;
        const c = CM.roll(makeRng(deriveSeed(state.seed ^ 0xC0DA, no)), commissionCtx(state));
        return c ? { no, ...c } : null;
    }

    /** 게시판 한 벌 — **판정을 여기서 다 낸다**(`tavernState` 와 같은 규칙) · rng 0 · 상태 불변 */
    function commissionState(state) {
        const open = hasFeature(state, 'commission_board');
        const slots = limitsOf(state).commissionSlots;
        const list = boardOf(state);
        const taken = list.filter(isTaken).length;
        return {
            open, slots, taken,
            cards: list.map(c => {
                const t = isTaken(c);
                return { ...c, taken: t, have: t ? c.have : null, done: t && c.have >= c.need, canTake: open && !t && taken < slots };
            }),
        };
    }

    /** 빈 자리를 굴려 채운다 — 자리 수가 `commission_board_cards` 가 될 때까지 끝에 붙인다 · 이미 차 있으면 아무것도 안 바뀐다 */
    function commissionFill(state) {
        if (!hasFeature(state, 'commission_board')) return { ok: false, err: 'unbuilt' };
        const cards = ownBoard(state);
        let rolled = 0;
        while (cards.length < B.commission_board_cards) {
            const c = rollCard(state);
            if (!c) break;
            cards.push(c);
            rolled++;
        }
        return { ok: true, rolled };
    }

    /** 받는다 — 거절 순서 `unbuilt` → `missing` → `full` · 거절이면 아무것도 안 바뀐다. **자리는 그대로**이고 받은 뒤부터 센다 */
    function commissionTake(state, no) {
        if (!hasFeature(state, 'commission_board')) return { ok: false, err: 'unbuilt' };
        const c = boardOf(state).find(x => x.no === no && !isTaken(x));
        if (!c) return { ok: false, err: 'missing' };
        if (boardOf(state).filter(isTaken).length >= limitsOf(state).commissionSlots) return { ok: false, err: 'full' };
        c.have = 0;
        return { ok: true, card: { ...c } };
    }

    /** 그 자리를 비운다 — 게시판이 열려 있으면 **그 자리에** 새 카드를 굴려 넣고, 닫혀 있으면 자리만 지운다 */
    function vacate(state, c) {
        const cards = ownBoard(state);
        const i = cards.indexOf(c);
        const next = hasFeature(state, 'commission_board') ? rollCard(state) : null;
        if (next) cards[i] = next; else cards.splice(i, 1);
    }

    /** 수령 — 거절 순서 `missing` → `notDone`. 골드를 주고 그 자리를 새로 굴린다 · **`unbuilt` 로 안 막는다**(받아 둔 것은 끝까지 간다) */
    function commissionClaim(state, no) {
        const c = boardOf(state).find(x => x.no === no && isTaken(x));
        if (!c) return { ok: false, err: 'missing' };
        if (c.have < c.need) return { ok: false, err: 'notDone' };
        state.resources.gold += c.gold;
        vacate(state, c);
        return { ok: true, gold: c.gold, card: { ...c } };
    }

    /** 포기 — **벌이 없다**(진행도만 버린다) · 그 자리를 새로 굴린다. ⚠ 받고 곧바로 포기하면 무료 리롤이다(GAME_DESIGN §10 「의뢰 세부」 ②) */
    function commissionDrop(state, no) {
        const c = boardOf(state).find(x => x.no === no && isTaken(x));
        if (!c) return { ok: false, err: 'missing' };
        vacate(state, c);
        return { ok: true };
    }

    /**
     * 센다 — `settleRound` 가 **이긴 라운드마다** 부른다. 받아 둔 · 안 찬 카드마다 처치(`killGrades`)와 들어온 드롭을 대조하고 `need` 에서 자른다.
     *   모든 부대가 같이 채운다(의뢰에는 파티가 없다) · 진 라운드 · 끊긴 라운드는 여기 안 온다(도감 처치 수와 같은 규칙) · rng 0
     */
    function commissionCount(state, stageId, killGrades, gained) {
        const open = boardOf(state).filter(c => isTaken(c) && c.have < c.need);
        if (!open.length) return;
        const chapter = deps.stages[stageId]?.chapter ?? null;
        const add = (c, n) => { c.have = Math.min(c.need, c.have + n); };
        for (const [id, byGrade] of Object.entries(killGrades)) {
            const ev0 = { chapter, monster: Number(id), race: deps.monsters[id]?.monster_type ?? null };
            for (const [grade, n] of Object.entries(byGrade)) {
                const ev = { ...ev0, grade };
                for (const c of open) if (CM.matchKill(c, ev)) add(c, n);
            }
        }
        for (const it of gained) for (const c of open) if (CM.matchDrop(c, it)) add(c, 1);
    }

    /**
     * 해고 판정 — **아무것도 안 바꾼다** [신설 2026-09-22 · 부채 #56 · INTERFACE §2-7]. `dismiss` 와 해고 창(SCREEN_DESIGN §6)이 이 하나를 읽는다 —
     *   창이 판정을 따로 세우면 둘이 갈린다(옛 창은 장비 · 마지막 한 명만 세어 원정 · 수색 중인 영웅에게 [확인] 을 띄웠다).
     * 순서가 곧 창에 서는 문장이다 — 막힘이 여럿이면 앞의 것 하나만 낸다
     */
    function dismissState(state, uid) {
        const h = heroById(state, uid);
        // 지금 싸우는 영웅은 못 지운다 — 도는 원정의 인원이다. 파티에서 뺐어도 그 원정이 끝날 때까지다 (R89 · R92)
        // **수색을 장비보다 먼저 본다** — 나가 있는 사람에게 「장비를 벗어라」라고 하면 벗어도 안 되는 길로 보내게 된다
        const err = !h ? 'missing'
            : heroBusy(state, uid) === 'run' ? 'running'
            : heroBusy(state, uid) === 'search' ? 'searching'
            : Object.values(h.equipped ?? {}).some(Boolean) ? 'equipped'
            : state.heroes.length <= 1 ? 'last'
            : null;
        return { canDismiss: err === null, err };
    }

    /**
     * 해고 — 로스터에서 지운다. **되돌릴 수 없다** [신설 2026-09-09 사용자 확정 · INTERFACE §2-7].
     * 막는 것 둘:
     *   · `equipped` — **장비를 하나라도 걸치고 있으면 못 한다.** 다 벗으면 아이템이 가방에 남으므로
     *     「해고하면 장비가 어떻게 되나」라는 질문 자체가 생기지 않는다 (사용자 확정).
     *   · `last` — 마지막 한 명은 못 지운다. 0명이 되면 원정을 못 돌려 골드가 안 들어오고 고용도 못 해 복구가 막힌다.
     * **반환물은 없다** — 있으면 GAME_DESIGN §10 이 경고한 고용→해고 루프가 열린다(고용은 골드를 받는다).
     * **모든 편성**에서도 뺀다(진형도 맞춘다 · R122) — 지운 uid 가 남으면 편성·출발이 유령을 든다. `run` 은 uid 를 안 들어 런 중에도 안전하다.
     * 막는 판정은 위 `dismissState` 하나다 — 여기서 다시 세지 않는다 [2026-09-22 · 부채 #56]
     */
    function dismiss(state, uid) {
        const { err } = dismissState(state, uid);
        if (err) return { ok: false, err };
        // 합산 레벨이 내려가기 **전에** 최고치를 적는다 — 건설 문턱 `total:` 은 도달한 최고치를 본다(construction_draft 원칙 3 · R137)
        state.progress.peakTotal = peakTotal(state);
        for (const p of state.presets) {
            if (!p.party.includes(uid)) continue;
            p.party = p.party.filter(u => u !== uid);
            normalizeFormation(p);
        }
        state.heroes = state.heroes.filter(x => x.uid !== uid);
        return { ok: true };
    }

    /**
     * 로스터 순서 맞바꾸기 — 캐릭터 탭 영웅 띠의 드래그 [신설 2026-09-15 사용자 지시 · INTERFACE §2-7 · SCREEN_DESIGN §5 · ADR-0136].
     * 순서를 읽는 곳은 **표시뿐**이다(영웅 띠 · 수색 후보) — 파티 · 리더(`party[0]`) · 진형은 따로 들고 있어 안 흔들린다.
     * 그래서 원정 중 · 수색 중에도 막을 것이 없다. 같은 영웅이면 바꿀 것이 없어 그대로 통과한다
     */
    function swapHeroes(state, uidA, uidB) {
        const i = state.heroes.findIndex(h => h.uid === uidA);
        const j = state.heroes.findIndex(h => h.uid === uidB);
        if (i < 0 || j < 0) return { ok: false, err: 'missing' };
        [state.heroes[i], state.heroes[j]] = [state.heroes[j], state.heroes[i]];
        return { ok: true };
    }

    /* ── 수색 — 대기 영웅 하나가 후보를 물어온다 (base_expedition_design §2-4 · 구현 2026-09-09) ──
       명단이 흐름이라면 수색은 통제다. **파견 슬롯을 먹지 않는다** — 선술집 하위 기능이다.
       저장하는 것은 「누가 · 언제 · 몇 번째」뿐이고 결과와 이야기는 시드에서 재현한다 (명단과 같은 문법).
       **실패는 없다** — 매력이 미는 것은 성공 여부가 아니라 결과의 품질이다 (§2-4). */

    const searchMs = () => B.tavern_search_hours * 60 * 60 * 1000;

    /* 매력이 가르는 두 등급 — `hero_tier.csv` 의 **굴림 가능한 두 행**이다(유니크는 `weight = 0` = 수작업이라
       수색이 못 낸다). 어휘가 코드에 있는 이유는 **어느 쪽이 위인가를 코드가 알아야** 하기 때문이다 —
       CSV 는 대역과 모양만 들고 「좋은 쪽」이 어디인지는 말하지 않는다 (INTERFACE §5-3) */
    const SEARCH_TIER_HI = 'rare', SEARCH_TIER_LO = 'magic';

    /** 매력이 미는 것 — **레어 확률(비율) 하나**다. 상한이 있어 매력만으로 확정에 닿지 않는다 */
    const searchRarePct = cha => Math.min(B.tavern_search_rare_cap_pct,
        B.tavern_search_rare_base_pct + (cha ?? 0) * B.tavern_search_rare_per_cha_pct);

    /**
     * 이번 회차에 만날 사람 — **보낸 영웅과 무관하다.** 전용 스트림(`^ 0x11EE`)이 회차 번호 하나로 정하므로
     *   **보내기 전에도 알 수 있고**, 그것이 「소문」이 거짓이 아닌 이유다 (ADR-0068).
     * ⚠ 결과 스트림(`^ 0x5EA7`)과 **갈라 두었다** — 한 스트림에 얹으면 만남 굴림이 결과 굴림의 소비 순서를 밀어
     *   같은 시드가 다른 영웅을 낸다. 갈라 두었기 때문에 `searchRoll` 의 15회 계약이 그대로다 (INTERFACE §5-2).
     */
    const searchMeetingOf = (state, no) => {
        const rng = makeRng(deriveSeed(state.seed ^ 0x11EE, no));
        return meetRows[Math.floor(rng() * meetRows.length)];
    };

    /**
     * 고른 답이 깎는 고용비(비율) — **두 층이다** (ADR-0068).
     *   · 만난 사람의 죄종에 **맞는 답**(`hit_sin`)이면 `meet_hit_pct` — 소문이 죄종을 알려주므로 **읽으면 누구나** 얻는다
     *   · 그 위에 **보낸 영웅이 연 답**(`need_sin ≠ '-'`)이면 `meet_key_pct` — 맞는 사람을 보낸 **준비의 보상**이다
     * 안 맞는 답은 0 이다. **어느 쪽도 벌이 아니다** — 정가가 바닥이고 답은 거기서 깎기만 한다.
     */
    function searchDiscount(meeting, ans) {
        if (!meeting || !ans || ans.hit_sin !== meeting.sin) return 0;
        return ans.need_sin === '-' ? B.tavern_search_meet_hit_pct : B.tavern_search_meet_key_pct;
    }
    const searchCost = pct => Math.round(B.tavern_hire_cost * (1 - pct));          // 할인은 비율 (R111)
    const searchMeetAt = startedAt => startedAt + Math.round(searchMs() * B.tavern_search_meet_at_pct);
    /** 화면이 그대로 그릴 수 있는 모양으로 편다 — `key` 는 「보낸 영웅이 연 답인가」(화면이 그 이유를 찍는다) */
    const answerView = a => a && ({ id: a.answer_id, key: a.need_sin !== '-', text: { ko: a.answer_kr, en: a.answer_en } });
    /** 소문 — **죄종을 숨기지 않는다.** 화제를 화면에 그대로 띄우는 것이 이 기능의 전제다 (ADR-0068) */
    const rumorView = m => m && ({ id: m.meeting_id, sin: m.sin,
        rumor: { ko: m.rumor_kr, en: m.rumor_en }, prompt: { ko: m.prompt_kr, en: m.prompt_en } });

    /**
     * 결과 굴림 — **저장하지 않는다.** `seed ^ 0x5EA7` 과 `no`(그때의 `counters.search`)가 매번 같은 답을 낸다.
     * rng 소비 순서가 계약이다 (INTERFACE §5-2) — **등급 1 → 후보 10 → 죄종 1 → 막마다 1**.
     * **결과를 먼저 굴리고 이야기를 뒤에 둔다** — 이야기 행이나 막을 늘려도 나온 영웅이 안 바뀐다
     *   (`rollFace` 를 맨 마지막에 두는 것과 같은 이유 · hero.js).
     * 죄종 메아리는 굴린 영웅의 `sin` 을 **덮어쓴다** — 죄종은 능력치·고유 굴림의 입력이 아니므로
     *   (주력 축은 직업이 정한다 · `rollAttributes`) 덮어써도 앞의 소비가 밀리지 않는다.
     */
    function searchRoll(state, snap) {
        const rng = makeRng(deriveSeed(state.seed ^ 0x5EA7, snap.no));
        const tier = rng() < searchRarePct(snap.cha) ? SEARCH_TIER_HI : SEARCH_TIER_LO;
        const [hero] = H.rollCandidates(rng, 1, [tier]);
        if (rng() < B.tavern_search_sin_echo_pct && snap.sin) hero.sin = snap.sin;
        const story = searchPhases.map(ph => {
            const pool = storyPool(ph, snap.sin);
            return pool[Math.floor(rng() * pool.length)];        // 후보가 빌 수 없다 — 로드 검증이 막았다
        });
        return { hero, story };
    }

    /**
     * 수색 화면 상태 한 덩어리 — **판정을 여기서 다 낸다** (`tavernState` 와 같은 규칙).
     * `beats` 는 **막마다 한 줄**이고 `open` 이 「지금 읽을 수 있나」다 — 소요 시간을 막 수로 균등분할한다.
     *   마지막 막이 열린 뒤에도 남은 시간이 있고, 결과(`result`)는 그 끝에 열린다.
     * `sent` 는 **보낼 때 박은 스냅샷**이고 `hero` 는 지금 로스터에 있는 그 사람이다 — 둘을 섞지 않는다
     *   (수색 중 레벨업하면 `hero.stats.cha` 는 오르지만 결과를 정한 것은 `sent.cha` 다).
     */
    function searchState(state, now) {
        const s = state.search ?? null;
        const head = {
            // `open` = 보내기가 열렸나(선술집 랭크 · R137) — 이미 나간 수색은 닫혀 있어도 끝까지 돌고 수령된다
            open: hasFeature(state, 'search'),
            hours: B.tavern_search_hours, slots: limitsOf(state).searchSlots, cost: B.tavern_hire_cost,
            echoPct: B.tavern_search_sin_echo_pct,
            // 안 나가 있을 때 보낼 수 있는 사람 — **지금 싸우는 영웅만 뺀다**(전투 밖에 쓰러져 있는 영웅이 없다 · §1-1 · R92).
            //   편성에 든 영웅도 보낸다 — 편성은 계획이고, 그 편성의 출발이 `searching` 으로 막힌다 (`canDepart` · 2026-09-21)
            ready: s ? [] : state.heroes.filter(h => heroBusy(state, h.uid) !== 'run').map(h => h.uid),
            out: !!s, hero: null, sent: null, startedAt: 0, endsAt: 0, remainMs: 0, done: false,
            beats: [], result: null, rarePct: 0, canHire: false, err: null,
            rumor: null, meetAt: 0, meetOpen: false, answers: [], answer: null, discountPct: 0,
        };
        // 소문 — 안 나가 있으면 **다음 회차**의 만남이다. 이걸 읽고 누굴 보낼지 정하는 것이 이 기능의 결정이다
        if (!s) return { ...head, rumor: rumorView(searchMeetingOf(state, (state.counters.search ?? 0) + 1)) };
        const span = searchMs();
        const endsAt = s.startedAt + span;
        const done = now >= endsAt;
        const { hero, story } = searchRoll(state, s);
        const beats = story.map((r, i) => {
            const at = s.startedAt + Math.round(span * i / story.length);
            return { id: r.story_id, at, open: now >= at, text: { ko: r.text_kr, en: r.text_en } };
        });
        const meeting = searchMeetingOf(state, s.no);
        const picked = answerRows.find(a => a.answer_id === s.answer) ?? null;
        const discountPct = searchDiscount(meeting, picked);
        const cost = searchCost(discountPct);
        const err = state.heroes.length >= limitsOf(state).roster ? 'roster'
            : state.resources.gold < cost ? 'gold' : null;
        const meetAt = searchMeetAt(s.startedAt);
        return {
            ...head, cost,
            hero: heroById(state, s.heroUid) ?? null,
            sent: { uid: s.heroUid, sin: s.sin, cha: s.cha },
            startedAt: s.startedAt, endsAt, remainMs: Math.max(0, endsAt - now), done,
            beats, result: done ? hero : null, rarePct: searchRarePct(s.cha),
            // 만남 — `meetAt` 부터 열리고 **답은 수령할 때까지 언제든**이다(시간 제한 없음 · 방치형 계약 ③)
            rumor: rumorView(meeting), meetAt, meetOpen: now >= meetAt,
            answers: picked ? [] : answersFor(meeting.meeting_id, s.sin).map(answerView),
            answer: answerView(picked), discountPct,
            canHire: done && !err, err: done ? err : null,
        };
    }

    /**
     * 보내기 — 대기 영웅 1명. **동시 1건**(`tavern_search_slots` 는 화면 표기이고 실제 상한은 이 `busy` 다).
     * 판정 입력을 여기서 박는다 — 나간 뒤에 그 영웅이 자라도 결과는 보낼 때의 값이 정한다.
     */
    function searchSend(state, uid, now) {
        if (!hasFeature(state, 'search')) return { ok: false, err: 'unbuilt' };   // 선술집 랭크가 연다 (R137)
        if (state.search) return { ok: false, err: 'busy' };
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        if (heroBusy(state, uid) === 'run') return { ok: false, err: 'party' };   // 지금 싸우는 영웅만 막는다 — 편성은 계획이다(출발이 `searching` 으로 막는다 · R92 · 2026-09-21)
        state.counters.search += 1;
        state.search = { heroUid: uid, startedAt: now, no: state.counters.search, sin: h.sin, cha: h.stats?.cha ?? 0, answer: null };
        return { ok: true, endsAt: now + searchMs() };
    }

/**
     * 수령(고용) — 밑값은 명단과 같고(`tavern_hire_cost`) **만남에서 고른 답이 거기서 깎는다** (ADR-0068).
     * 답을 안 골랐으면 정가다 — 안 고른 것이 벌이 아니라 **깎을 기회를 안 쓴 것**뿐이다.
     */
    function searchTake(state, now) {
        const s = state.search;
        if (!s) return { ok: false, err: 'none' };
        if (now < s.startedAt + searchMs()) return { ok: false, err: 'notDone' };
        if (state.heroes.length >= limitsOf(state).roster) return { ok: false, err: 'roster' };
        const picked = answerRows.find(a => a.answer_id === s.answer) ?? null;
        const cost = searchCost(searchDiscount(searchMeetingOf(state, s.no), picked));
        if (state.resources.gold < cost) return { ok: false, err: 'gold' };
        const { hero } = searchRoll(state, s);
        state.resources.gold -= cost;
        const h = addHero(state, hero);
        equipStarter(state, h, recruitRng(state));   // 명단 고용과 같은 한 벌 — 결과 스트림을 안 민다 (2026-09-25)
        state.search = null;
        return { ok: true, hero: h, cost };
    }

    /**
     * 만남에 답한다 — **되돌릴 수 없고 한 번뿐**이다. 고용비를 깎는 것 말고는 아무것도 안 바꾼다:
     *   결과 영웅은 답과 무관하게 이미 시드가 정해 놓았으므로 **언제 답하든 같은 사람이 온다**.
     * 시간 제한이 없다 — `meetAt` 부터 **수령할 때까지** 언제든. 안 답하고 수령해도 정가일 뿐 벌이 없다
     *   (OSRS 가 강제 페널티를 「Optional Randoms」로 걷어낸 것과 같은 규칙 · 방치형 계약 ③).
     * err: `none`(나간 수색 없음) · `answered`(이미 답했다) · `notOpen`(아직 안 만났다) · `missing`(지금 열려 있지 않은 답)
     */
    function searchAnswer(state, answerId, now) {
        const s = state.search;
        if (!s) return { ok: false, err: 'none' };
        if (s.answer) return { ok: false, err: 'answered' };
        if (now < searchMeetAt(s.startedAt)) return { ok: false, err: 'notOpen' };
        const meeting = searchMeetingOf(state, s.no);
        const ans = answersFor(meeting.meeting_id, s.sin).find(a => a.answer_id === answerId);
        if (!ans) return { ok: false, err: 'missing' };
        s.answer = answerId;
        const discountPct = searchDiscount(meeting, ans);
        return { ok: true, discountPct, cost: searchCost(discountPct) };
    }

    /**
     * 버리기 — 나가 있으면 **취소**하고 결과가 와 있으면 **돌려보낸다**. 되돌릴 수 없다.
     * 이 문이 없으면 로스터가 찼을 때 칸이 영원히 막힌다 — 결과는 수령할 때까지 남기 때문이다 (§2-4).
     * 다시 보내면 `counters.search` 가 올라 **다른 결과**가 나온다. 값이 오가지 않으므로 되풀이해도 얻는 것이 없다
     *   — 치르는 것은 그 시간뿐이다.
     */
    function searchDrop(state) {
        if (!state.search) return { ok: false, err: 'none' };
        state.search = null;
        return { ok: true };
    }

    /* ── 파티 전술 — 칸 해금(지휘 천막 랭크 · R137) · 리롤 (tactic_card_design §5 확정 2026-08-30) ── */

    /** 로스터 합산 레벨 = **로스터 전원의 레벨 합.** 파티 3명이 아니라 보유 영웅 전부다 — 벤치를 키워도 오른다 · 건설 문턱 `total:` 이 읽는다(`peakTotal`) */
    const totalLevel = state => state.heroes.reduce((a, h) => a + (h.level ?? 1), 0);

    /* ── 건설 — 건물 랭크가 기능을 연다 (construction_draft §11 · INTERFACE §2-7 · §2-14 · R137) ──
       **무엇을 여는지는 표가 정하고 `construction.js` 가 센다** — 여기는 세이브에서 셈의 입력(클리어 · 레벨 · 재화)을 모아 넘기고,
       짓기의 비용을 치르고, 게임이 묻는 **창구**를 낸다: 열렸나(`hasFeature`) · 몇 %인가(`bonusOf`) · 몇 개인가(`limitsOf`) · 무엇을 지어야 열리나(`needOf`).
       기능 자리마다 `hasFeature` 한 줄이 서 있고(거절 코드 `unbuilt`) 상한은 `limitsOf` 가 더하기를 얹는다 (2단계 2026-09-22) */

    /** 로스터 합산 레벨의 **도달 최고치** — 해고로 내려가도 닫히지 않는다(construction_draft 원칙 3). 해고가 내리기 전에 적는다(`dismiss`) */
    const peakTotal = state => Math.max(state.progress?.peakTotal ?? 0, totalLevel(state));
    /** 로스터 최고 영웅 레벨 — 문턱 `hero:` */
    const topLevel = state => state.heroes.reduce((a, h) => Math.max(a, h.level ?? 1), 0);
    /** 셈의 입력 — 문턱 조건이 읽는 값 셋 (`construction.check`) */
    const buildCtx = state => ({ cleared: new Set(state.progress?.cleared ?? []), peakTotal: peakTotal(state), topLevel: topLevel(state) });
    /** 가진 재화 — 자원 셋 + 제작 재료. 비용 칸이 적을 수 있는 이름과 같다 */
    const RESOURCE_KEYS = ['gold', 'dust', 'stigma'];
    const walletOf = state => ({ ...(state.materials ?? {}), ...Object.fromEntries(RESOURCE_KEYS.map(k => [k, state.resources[k] ?? 0])) });

    /**
     * 건설 탭이 읽는 한 벌 — 건물마다 지금 랭크 · **다음 랭크 판정**(`construction.nextState` — 조건 · 비용 · 여는 것 · err) ·
     *   **랭크마다 한 줄**(지었나 · 여는 것(준비 중 표시) · 조건(지금 값 포함) — 비용은 다음 랭크의 `next` 만 든다) · 탭마다 열렸나(`construction.tabs`).
     *   `built` / `total` = 지은 랭크 수 / 표의 랭크 수. rng 0 · 상태 불변
     * @returns `{built, total, tabs: {tab: bool}, buildings: [{id, name, tab, rank, maxRank, next, ranks: [{rank, built, effects, require}]}]}`
     */
    function constructionState(state) {
        const ctx = buildCtx(state), wallet = walletOf(state);
        const buildings = CN.list.map(b => {
            const rank = state.buildings[b.id] ?? 0;
            const ranks = Array.from({ length: b.maxRank }, (_, i) => {
                const info = CN.rankInfo(b.id, i + 1);
                // 더하기에 `total` — 그 건물을 이 랭크까지 지었을 때의 합(「챕터 n 해금」 같은 누적 문장 · R152)
                const upto = CN.opened({ [b.id]: i + 1 }).adds;
                const effects = info.effects.map(e => (e.kind === 'add' ? { ...e, total: upto[e.target] ?? 0 } : e));
                return { rank: i + 1, built: i < rank, effects, require: CN.check(info.require, ctx, state.buildings) };
            });
            return { id: b.id, name: b.name, tab: b.tab, rank, maxRank: b.maxRank, next: CN.nextState(b.id, state.buildings, ctx, wallet), ranks };
        });
        return {
            built: buildings.reduce((a, b) => a + b.rank, 0), total: buildings.reduce((a, b) => a + b.maxRank, 0),
            tabs: CN.tabs(openRanks(state)), buildings,
        };
    }

    /**
     * 다음 랭크를 짓는다 — **한 칸씩 · 즉시 · 되돌림 없음**(construction_draft 원칙 5). 판정은 `constructionState` 와 같은 것 하나다.
     * err: `missing` · `maxRank` · `pending`(여는 것이 전부 준비 중) · `locked`(조건 미달) · `gold` · `materials`. 비용을 치르고 랭크 +1 · rng 0
     */
    function construct(state, buildingId) {
        const nx = CN.nextState(buildingId, state.buildings, buildCtx(state), walletOf(state));
        if (nx.err) return { ok: false, err: nx.err };
        for (const c of nx.cost) {
            if (RESOURCE_KEYS.includes(c.res)) state.resources[c.res] -= c.need;
            else state.materials[c.res] -= c.need;
        }
        state.buildings[buildingId] = nx.rank;
        // 편성 수 · 물약 칸 수가 더하기로 늘었으면 **그 자리를 곧바로 붙인다**(빈 편성 · 빈 칸 — 불러오기와 같은 `fitPresets`) · 줄어드는 길은 없다
        //   부대 자리도 편성과 같은 길이로 맞춘다(`fitRuns` — 편성이 원정 랭크로 느는 길이 생겼다 · R156)
        state.presets = fitPresets(state, state.presets);
        state.runs = fitRuns(state, state.runs);
        return { ok: true, rank: nx.rank };
    }

    /** **창구 — 그 기능이 열렸나.** 모르는 이름이면 멈춘다(오타를 조용히 닫힌 기능으로 두지 않는다 · construction_draft §11-5) */
    function hasFeature(state, id) {
        if (CN_TARGETS[id]?.kind !== 'unlock') throw new Error(`state: hasFeature — 켜기 대상이 아니다 '${id}'`);
        return CN.opened(openRanks(state)).features.includes(id);
    }

    /** **창구 — 연구 배율**(`construction.bonus` — 레벨끼리 더한다). 다른 원천과는 부르는 쪽이 곱한다(§11-7) · 연구가 없으면 1 */
    const bonusOf = (state, target) => CN.bonus(state.research, target);

    /**
     * **창구 — 무엇을 지어야 열리나** `{id, name, rank}` · 표에 없으면 null(`construction.reach`) — 잠긴 자리가 「선술집 2랭크」를 말할 때 읽는다.
     *   켜기는 이름만(`needOf('search')`) · 더하기는 **기본값 위로 몇이 필요한가**(`needOf('tactic_slots', 3)` = 셋째 전술 칸 · 제작 레벨 · 물약 단계 · 전술 칸은 기본값이 0 이라 순번 그대로). 상태를 안 본다
     */
    const needOf = (target, n = 1) => CN.reach(target, n);

    /**
     * 전술 조건이 세는 파티 — **편성 순서대로**(첫 칸이 리더 · §5-8) · 죄종 · 직업 · 입은 장비 · **전열에 섰나**.
     * 조건이 세는 대상 = **파티**(기본은 칸을 읽는 편성의 파티 · 원정은 나간 인원을 넘긴다 · R92 · R122). 전술은 파티 단위이므로 벤치는 조건에 안 들어간다.
     * 전열은 그 편성의 진형이 정한다(배치가 없으면 전열 — `partyUnits` 와 같은 규칙) · `front` 를 주면 그 명단을 쓴다(원정은 출발 때의 전열 — R134).
     * ~~`actives`(스킬 정의)~~ 는 2026-09-22 삭제 — 스킬 태그 조건이 사라졌다(§5-8)
     */
    const partyMembers = (state, party = partyOf(state), no = state.preset, front = null) => {
        const byUid = formationOf(presetAt(state, no) ?? curPreset(state)).byUid;
        return party.map(uid => heroById(state, uid)).filter(Boolean)
            .map(h => ({ sin: h.sin, cls: h.cls, items: heroItems(state, h), front: front ? front.includes(h.uid) : (byUid[h.uid] ?? 0) === 0 }));
    };
    /** 같이 나간 런 수의 키 — 나간 인원의 uid 를 정렬해 잇는다(순서 · 자리와 무관) · 전술 「관계」 조건 (v36 · R134) */
    const bondKey = party => party.slice().sort().join('|');
    const bondOf = (state, party) => state.bonds?.[bondKey(party)] ?? 0;

    /** 첫 배정 — 시드 하나에서 나온다. 리롤 카운터를 안 타므로 **리롤이 다른 칸의 내용을 흔들지 않는다**.
     *  편성마다 같은 첫 배정이다 — 다르게 주면 편성 수만큼 공짜 리롤이 생긴다 (ADR-0250) */
    const initialAssign = state => TC.initialAssign(makeRng(deriveSeed(state.seed ^ 0x7AC7, 0)));

    /** 그 편성의 전술 칸 세이브 — 번호가 틀리면 고른 편성 (`partyUnits` 와 같은 대체) */
    const tacticsOf = (state, no) => (presetAt(state, no) ?? curPreset(state)).tactics ?? { slots: {} };

    /**
     * 칸의 지금 상태 한 덩어리 — 열렸나 · 무엇이 들었나 · 조건이 몇 / 몇인가 · 잠갔나 · 전체 리롤 비용.
     * 판정은 전부 여기서 낸다 (masteryState · tavernState 와 같은 규칙) — 화면은 그리기만 한다.
     * `no` = 칸의 내용을 읽는 편성(기본 고른 편성 · 칸이 편성마다 · R129) · `party` 를 안 주면 **그 편성의 파티**다.
     * 열린 칸 수는 계정이다 — **지휘 천막 랭크가 연다**(`limitsOf(state).tacticSlots` · 표의 칸 수에서 자른다 · R137 · ~~로스터 합산 레벨이 곧장 연다~~ —
     *   합산 레벨은 이제 그 랭크의 문턱이다) — 모든 편성이 같다. **잠금은 편성마다**다(칸의 내용과 같은 자리 · v35 · R28).
     * 비용은 칸이 아니라 **판 전체에 하나**다 — 잠근 칸 수가 정한다 (tactic_card_design §5-6)
     */
    function tacticState(state, party, no = state.preset) {
        party = party ?? partyOf(state, no);
        const total = totalLevel(state);
        const open = Math.min(limitsOf(state).tacticSlots, TC.slotCount);
        const saved = tacticsOf(state, no);
        const stored = saved.slots ?? {};
        const held = new Set(saved.locked ?? []);
        const initial = initialAssign(state);
        const ctx = TC.contextOf(partyMembers(state, party, no), { bond: bondOf(state, party) });
        const slots = TC.slotList.map((s, i) => {
            const opened = s.no <= open;
            // 저장된 것(리롤한 칸) 우선 · 없으면 첫 배정. 세이브에 없는 가족·등급은 CSV 가 바뀐 것이라 첫 배정으로 되돌린다
            const option = opened ? (TC.optionOf(stored[s.no]) ?? TC.optionOf(initial[i]) ?? null) : null;
            const m = option ? TC.measure(option, ctx) : null;
            return {
                no: s.no, open: opened, locked: opened && held.has(s.no),
                option, have: m?.have ?? 0, need: m?.need ?? 0, active: m?.active ?? false,
            };
        });
        const lockedCount = slots.filter(s => s.locked).length;
        const rerollCost = TC.rerollCost(lockedCount);
        const canReroll = slots.some(s => s.open && !s.locked) && state.resources.gold >= rerollCost;
        return { totalLevel: total, open, count: TC.slotCount, lockedCount, rerollCost, canReroll, slots };
    }

    /** 켜진 칸들의 효과 합 — 접사·마스터리와 **같은 채널** (§2-4). `heroCombat` 이 이걸 받는다 · 칸은 편성 `no` 의 것 (R129) */
    function tacticBonus(state, party, no = state.preset) {
        return TC.bonusOf(tacticState(state, party, no).slots.filter(s => s.open && s.active).map(s => s.option));
    }

    /** 고른 편성의 전술 칸 세이브 — 없으면 빈 자리를 세운다 (옛 세이브 · 테스트가 `{slots}` 만 꽂은 경우) */
    const ownTactics = state => {
        const p = curPreset(state);
        p.tactics = p.tactics?.slots ? p.tactics : { slots: {} };
        if (!Array.isArray(p.tactics.locked)) p.tactics.locked = [];
        return p.tactics;
    };

    /**
     * 전체 리롤 — **열렸고 안 잠긴 칸을 한 번에 전부** 다시 굴린다 (tactic_card_design §5-6 · 확정 2026-09-01 · 비용 곡선 2026-09-22 · R28).
     * 비용은 **잠근 칸 수**가 정한다(`tactic.rerollCost` — 기본가 × 배수 ^ 잠근 칸 수). 굴릴 칸이 없으면 `allLocked`.
     * 후보에서 빼는 것 = **굴리기 직전 열린 칸이 들고 있던 옵션 전부**(잠긴 칸 것 포함) + **이번에 이미 뽑은 것** — 가족 단위다(§5-5).
     *   돈을 내고 같은 것이 나오는 일과 같은 옵션이 두 칸에 서는 일을 둘 다 막는다.
     * rng — `counters.tactic` 은 리롤 **1회에 한 번만** 오르고 그 시드의 rng 하나가 굴릴 칸을 **번호 오름차순**으로 돈다 (INTERFACE §5-2).
     * **고른 편성의 칸**을 굴린다 [2026-09-21 · R129] — 다른 편성의 칸은 안 바뀐다. 리롤 스트림은 계정에 하나다.
     * 도는 원정은 안 흔들린다 — 원정은 출발 때 켜진 전술을 굳혀 들고 있다(`run.tactics` · R130)
     */
    function rerollTactic(state) {
        const st = tacticState(state);
        const roll = st.slots.filter(s => s.open && !s.locked);
        if (!roll.length) return { ok: false, err: 'allLocked' };
        if (state.resources.gold < st.rerollCost) return { ok: false, err: 'gold' };
        const held = st.slots.filter(s => s.open && s.option).map(s => s.option.id);
        const n = (state.counters.tactic ?? 0) + 1;
        const picks = TC.pickMany(makeRng(deriveSeed(state.seed ^ 0x7AC7, n)), roll.length, held);
        if (!picks) return { ok: false, err: 'missing' };     // 가족이 칸의 두 배 이상이라는 것은 로드 시 검증했다
        state.counters.tactic = n;
        state.resources.gold -= st.rerollCost;
        const t = ownTactics(state);
        const rolled = roll.map((s, i) => {
            t.slots[s.no] = picks[i];
            return { no: s.no, option: TC.optionOf(picks[i]) };
        });
        return { ok: true, rolled, cost: st.rerollCost };
    }

    /**
     * 잠금 — 고른 편성의 칸 하나를 잠그거나 푼다 (tactic_card_design §5-6 · R28). **무료**이고 rng · 카운터를 안 탄다 —
     * 값은 리롤할 때 치른다. 안 열린 칸은 못 잠근다(`locked`) · 없는 칸 `missing`
     */
    function toggleTacticLock(state, slotNo) {
        const slot = tacticState(state).slots.find(s => s.no === slotNo);
        if (!slot) return { ok: false, err: 'missing' };
        if (!slot.open) return { ok: false, err: 'locked' };
        const t = ownTactics(state);
        const locked = !t.locked.includes(slotNo);
        t.locked = locked ? [...t.locked, slotNo].sort((a, b) => a - b) : t.locked.filter(no => no !== slotNo);
        return { ok: true, locked };
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
        const items = heroItems(state, h);
        return {
            points,
            nodes: H.masteryNodesFor(h).map(n => {
                const rank = h.mastery?.[n.id] ?? 0;
                const unlocked = h.level >= n.unlockLevel;
                return {
                    id: n.id, treeKind: n.treeKind, ownerId: n.ownerId, tier: n.tier, stat: n.stat, name: n.name,
                    value: n.value, rank, maxRank: n.maxRank, unlockLevel: n.unlockLevel, unlocked,
                    total: Number((n.value * rank).toFixed(3)),
                    canLearn: unlocked && rank < n.maxRank && points > 0,
                    // 낀 장비가 켜는 칸 [2026-09-22 · skill_design §3-5 · R138] — `gate` = {slot, groups} 또는 null · `on` = 지금 장비로 켜졌나.
                    //   꺼져 있어도 찍을 수 있다 — 랭크는 캐릭터에 쌓이고 장비를 바꾸면 켜진다
                    gate: n.gate, on: H.gateOn(n, items),
                };
            }),
        };
    }

    /** 한 랭크 찍는다 — 포인트 1점 소비. 결과 코드는 INTERFACE §3 사전 */
    function learnMastery(state, uid, nodeId) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        if (fallenOf(state, uid)) return { ok: false, err: 'downed' };   // 도는 원정에서 쓰러져 있다 (R130)
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

    /**
     * 한 랭크 무른다 — 포인트 1점 환급. `learnMastery` 의 역방향이다 (skill_design §5 「무료 · 수시」).
     * **해금 레벨을 보지 않는다** — 찍힌 랭크가 있다는 것 자체가 그때 열려 있었다는 증거이고,
     * 여기서 다시 보면 「찍었는데 못 뺀다」는 상태가 생긴다(초기화로는 빠지므로 규칙도 갈린다).
     * 랭크가 0 이 되면 키를 지운다 — 전액 롤백(`resetMastery`) 뒤와 같은 모양이어야 세이브가 두 갈래로 안 갈린다.
     */
    function unlearnMastery(state, uid, nodeId) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        if (fallenOf(state, uid)) return { ok: false, err: 'downed' };   // R130
        const n = H.masteryById[nodeId];
        // 그 영웅의 트리에 없는 노드는 「없음」이다 — learnMastery 와 같은 판정
        if (!n || !H.masteryNodesFor(h).some(x => x.id === nodeId)) return { ok: false, err: 'missing' };
        const rank = h.mastery?.[nodeId] ?? 0;
        if (rank < 1) return { ok: false, err: 'noRank' };
        h.mastery = h.mastery ?? {};
        if (rank === 1) delete h.mastery[nodeId];
        else h.mastery[nodeId] = rank - 1;
        h.masteryPoints = (h.masteryPoints ?? 0) + 1;
        return { ok: true, rank: rank - 1, points: h.masteryPoints };
    }

    /** 롤백 — **무료 · 수시** (skill_design §5). 찍은 것을 전부 돌려주고 포인트를 되돌린다 */
    function resetMastery(state, uid) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        if (fallenOf(state, uid)) return { ok: false, err: 'downed' };   // R130
        const spent = Object.values(h.mastery ?? {}).reduce((a, b) => a + b, 0);
        h.mastery = {};
        h.masteryPoints = (h.masteryPoints ?? 0) + spent;
        return { ok: true, refunded: spent, points: h.masteryPoints };
    }

    return {
        newGame, serialize, deserialize, canLoad, addPlayTime,
        heroById, heroItems, heroCombat, heroCombatIf, upgradeState, upgradeItem, makeLevels, makeState, makeItem, potionState, makePotion,
        codexLevel, codexNext, codexMaxLevel, codexBonusAt, codexBonus,
        equipTarget, equip, unequip, salvage, setItemLock, setAutoSalvage, autoSalvagePreview, applyAutoSalvage, sortStorage, moveToStash, moveToBag, holderOf,
        toggleParty, formationState, setFormation, placeFormation, rankOf,
        presetState, selectPreset, partyOf, setPotionSlot, swapPotionSlot,
        stageUnlocked, chapterOpen, canDepart, runParty, runOf, heroBusy, limitsOf, stageLevelState, setStageLevel, departRun, advanceRun, stepRun, retreatRun, resolveBattle, closeRun, nextRepeat, dismissNotice,
        runLock, runTactics, runTacticsIf,
        tavernCandidates, tavernState, tavernReroll, hire, dismissState, dismiss, swapHeroes,
        shopVisit, shopState, gambleState, gambleSpin, gambleSpinBatch,
        commissionState, commissionFill, commissionTake, commissionClaim, commissionDrop,
        searchState, searchSend, searchTake, searchDrop, searchAnswer,
        masteryState, learnMastery, unlearnMastery, resetMastery,
        tacticState, tacticBonus, rerollTactic, toggleTacticLock, weaponGroupOf, weaponSkillOf,
        constructionState, construct, hasFeature, bonusOf, needOf, peakTotal,
    };
}
