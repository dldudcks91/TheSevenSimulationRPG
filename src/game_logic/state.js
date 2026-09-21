/**
 * 게임 상태 — 생성 / 직렬화 / 모든 상태 전이(장착·고용·원정 결과 반영·재접속 시 런 마무리).
 *
 * 순수 모듈. DOM·localStorage·Date 를 모른다 — 현재 시각이 필요한 함수는 `now`(ms)를 인자로 받는다.
 * 저장은 **엔진 중립 JSON** 이다: 상태 객체 자체가 평문 데이터라 serialize 는 버전 도장만 찍는다.
 * localStorage 접근은 ui/storage.js 어댑터 한 곳에서만 한다 (CLAUDE.md 이식성 규칙 3).
 *
 * 세이브 형식 v9 (2026-09-01)
 * {
 *   version, seed, createdAt, savedAt,
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
 *   presets: [{party: [uid], formation: {tpl, ranks}, potionSlots: [potionId|null]}], preset: n, items: {uid: item}, bag: [uid],
 *     — presets = **편성**(v32 · R122 · 길이 = `party_preset_count`) · preset = 고른 편성 번호(1 부터).
 *       party = **편성한 순서 그대로** · `party[0]` 이 리더 · **새 게임은 전부 빈 배열**이다 (2026-09-09) · 한 영웅이 여러 편성에 든다.
 *       potionSlots = 물약 칸 구성(길이 = `potion_slot_max` · null = 빈 칸) — 런을 열 때 재고에서 앞 칸부터 채운다 (R124)
 *     — items[*].proc = **목걸이 발동 스킬** `{trigger, skill, v}` (목걸이만 · v33 · 2026-09-21 · ⚠ 전투는 안 읽는다 — 설명에만).
 *     — items[*].skill = **무기가 담은 액티브 id** | null (무기만 · v18 신설 2026-09-09).
 *       드롭 때 그 무기군의 **직업 풀**에서 굴려 개체에 박는다 — 액티브 2번 칸의 입력이다
 *       (skill_design §12-1 규칙 3 · `skill.activesFor` 의 `ctx.weaponSkill`)
 *   progress: {cleared: [stageId], levelUp: {stageId: n}},   // levelUp = 스테이지별 올린 양 — 없으면 {} (2026-09-14 · R87 · 버전 무변경)
 *   codexKills: {monsterId: n}   — **도감 레벨의 출처** — 누적 처치 수 (monster_design §8 · 2026-09-21 카드 → 처치 수)
 *   counters: {hero, item, battle, tavern, tactic, upgrade, search, make},   // upgrade 는 R95(2026-09-15)부터 안 오른다 — 강화가 rng 를 안 쓴다 · make = 제작 회차(R96 · 없으면 0)
 *   run: {stageId, preset, repeat, lastAt, durationSec, active} | null,   // active = 원정이 도는 중(v25 · R89) — 불러온 세이브에 서 있으면 끊긴 원정이다 · preset = 나간 편성 번호(v32)
 *   reports: [{...}]             — 리포트 목록. **최신이 맨 앞**이고 [balance.csv:report_keep] 개까지 남는다 (v21).
 *     반복 원정은 이기는 동안 런을 잇는데, 칸이 하나면 앞 런이 매번 덮여 사라졌다 (SCREEN_DESIGN §4-3)
 *   notice: {kind:'runClosed', stageId, at, seenAt} | null   — 재접속 알림 (배너 1회)
 *   tavern: {rerolledAt: ms|null, hired: [슬롯번호]}         — 리롤 쿨다운의 기준 시각 · 이번 명단에서 산 칸.
 *     명단 자체는 저장하지 않는다(시드+카운터로 재현) — 저장하는 건 「언제 갈았나」와 「몇 번 칸을 샀나」뿐이다
 *   search: {heroUid, startedAt: ms, no, sin, cha, answer: 답 id|null} | null   — 나가 있는 수색 1건 (base_expedition_design §2-4).
 *     `answer` = 만남에서 고른 답. **고용비만 깎는다** — 결과 영웅은 안 건드리므로 언제 답하든 같은 사람이 온다.
 *     결과도 이야기도 저장하지 않는다 — `no`(= 그때의 `counters.search`)와 시드가 재현한다. 명단과 같은 문법이다.
 *     ⚠ **판정 입력(`sin`·`cha`)을 보낼 때 함께 박는다** — 수색 중에 그 영웅이 레벨업해도 결과가 뒤바뀌면 안 된다.
 *     「보낼 때의 그 사람이 물어온 결과」가 계약이라 스냅샷이 세이브에 든다.
 *     **버전을 안 올린 필드다** — 없으면 `null`(= 수색을 한 적이 없다)이고 그것이 정확한 초기 상태라
 *     이관이 소급할 판단이 하나도 없다 (v5 의 `tavern` 은 「쿨다운이 열린 상태」라는 판단이 필요했다 · INTERFACE §4)
 *   tactics: {slots: {칸번호: {id, grade}}}                   — **리롤로 바꾼 칸만** 담는다.
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
 *   v9 → v10 (2026-09-02 — 전술 옵션 등급 축):
 *     · `tactics.slots[*]` 가 문자열이면 `{id, grade:'common'}` — 등급이 없던 시절에 굴린 칸이라
 *       **가장 낮은 등급**으로 받는다. 첫 배정이 언제나 일반인 것과 같은 자리이고, 올려 주면 이관이 파워를 준다
 *   v8 → v9 (2026-09-01 — 레어 고유 스킬 프로토타입 배정):
 *     · `heroes[*].innate` — 옛 영웅은 고유 스킬 없이 태어났으므로 **시드에서 소급해 굴린다**
 *       (전용 스트림 `seed ^ 0x5C11` · 전투 수열과 안 섞인다). 이미 가진 영웅은 건드리지 않는다
 *   v17 → v18 (2026-09-09 확정 — 직업 스킬 풀 「1스킬 = 1직업」 · R59):
 *     · `items[*].skill` — 무기 개체가 스킬을 안 들고 있으므로 **그 무기군의 직업 풀에서 채운다**.
 *       **rng 0회** — 이관이 굴림을 태우면 같은 시드가 다른 결과를 낸다(v14·v15 와 같은 규칙).
 *       대신 `uid` 로 고르므로 결정적이고 무기마다 갈린다
 *     · `heroes[*].innate` — 고유가 **제 직업 풀 밖**이면(옛 균등 굴림의 산물 · 지워진 무기군 행) 같은 규칙으로 갈아끼운다
 *   v15 → v16 (2026-09-07 확정 — 사제 전용 무기 성경·십자가 · R46):
 *     · 스태프·오브가 마법사 전용이 되어, **사제가 낀** 그 둘만 무기군을 사제 짝으로 갈아끼운다
 *       (스태프 → 성경 · 오브 → 십자가 — 주기 축이 대응한다). 가방에 든 것은 그대로 둔다
 *   v7 → v8 (2026-09-01 — 한손 개념 폐지 · 보조 슬롯 폐지):
 *     · 보조 아이템(착용분 · 가방분)을 **지운다** — 부위 자체가 없어져 돌려줄 자리가 없다
 *     · `equipped.offhand` 키 삭제 · `items[*].twoHanded` 삭제
 *     · 무기군 재편 — `sword1h` → `sword2h` · `wand` → `orb` · 창이 기사로 가면서 직업이 안 맞게 된 무기는 가방으로
 *   v6 → v7 (2026-08-31 — 강화 재정의 R25):
 *     · `items[*].up = 0` · `counters.upgrade = 0` — 강화한 적이 없는 상태.
 *       옛 아이템의 watk·implicit·접사 값은 전부 강화 이전 값이라 소급할 것이 없고, up=0 이면 파생 배율이 1이라
 *       이관이 전투 수치를 흔들지 않는다
 *   v21 → v22 (2026-09-11 — 챕터 5스테이지 · R75):
 *     · `progress.cleared` — 챕터보스 스테이지(`boss_grade = chapter_boss`)의 **직전 스테이지를 깼으면 그것도 깬 것으로** 소급한다.
 *       옛 세이브에선 그 직전 자리가 챕터보스 자리였다. 안 올리면 해금(직전 클리어)이 다음 챕터를 통째로 잠근다. rng 0회
 *   v24 → v25 (2026-09-14 — 원정 보상은 라운드 승리 순간 · R89):
 *     · `reports[*].xpEach`(전원 동일) → `xp: {uid: n}`(영웅별) — 옛 리포트는 그때 전원이 같은 양을 받았으므로 `party` 마다 옮긴다 · `run.active = false`. rng 0
 *   v25 → v26 (2026-09-14 — 무기 피해는 최소 ~ 최대 범위 · R90):
 *     · `items[*].watk` 를 지운다 — 무기 피해는 무기군 · ilvl · 강화에서 파생한다(formula.weaponDamage). 옛 무기는 같은 조건의 범위로 돌아간다. rng 0
 *   v27 → v28 (2026-09-16 — 방어구 고유값이 부위 배수 · 갑옷군 배수 · 10레벨 구간 직선으로 · R107):
 *     · `items[*].implicit.v` 를 **지금 공식의 바탕값**으로 다시 앉힌다(`item.baseImplicit`) — 옛 공식(9.5 + ilvl × 0.15)이 새 대역의 1/5 라 그냥 두면 옛 방어구만 종잇장이 된다.
 *       개체 편차는 못 살린다(다시 굴리면 rng 순서가 깨진다) · 옛 갑옷은 `group` 이 없어 갑옷군 배수 1.0(경갑 자리)으로 앉는다. rng 0
 *   v26 → v27 (2026-09-16 — 장비 옵션은 소수를 두지 않는다 · 사용자 지시):
 *     · `items[*].implicit.v` · `items[*].affixes[*].v` 를 반올림한다. 옛 아이템만 소수로 남는 것을 막는다.
 *       **오만 「레벨당 데미지 +%」(`dmg_per_level_pct`)는 건드리지 않는다** — 1 보다 작은 값이 본질이라 값 대역부터 다시 정할 자리다. rng 0
 *   v28 → v29 (2026-09-17 — 퍼센트는 비율로 · R111 · 사용자 지시):
 *     · `items[*].affixes[*].v` 중 **퍼센트 채널**(`item.pctStat`)을 100 으로 나눈다 — 5 → 0.05. 고정값(`hp_flat` · `def_flat` · `atk_flat`)과
 *       `implicit.v`(방어력)는 그대로다. 오만 「레벨당 데미지」도 퍼센트라 같이 나눈다(0.3 → 0.003 · 동작은 같다). rng 0
 *   v29 → v30 (2026-09-18 — 방어구 옵션 세 층 · 고유 방어력 편차 폐지 · 사용자 확정 · item_design §1 「갑옷 옵션」):
 *     · 방어구(갑옷 · 투구 · 장갑 · 신발)에 고정 옵션이 없으면 `item.legacyArmorLayers` 로 **고정 옵션 · 죄종 칸을 앞에 채운다** —
 *       가진 옛 옵션은 뒤에 그대로 둔다(개수를 줄이지 않는다 · v22 무기와 같은 규칙). rng 0 · 행은 uid 번호 · 값은 가운데
 *     · 방어구 `implicit.v` 를 **지금 공식의 바탕값**으로(`item.baseImplicit` — 부위 갈래 계수 포함 · 편차 없음). 옛 장갑 · 신발 이름 · baseId 는 그대로
 *   v30 → v31 (2026-09-19 — 아이템 이름 = 「A와 B의 베이스」 · 죄종 단어 넷 · 사용자 확정 · item_design §1 「이름」):
 *     · `items[*].words` 를 채우고 `name` 을 새 형식으로 다시 조립한다(`item.legacyName` — 단 번호는 uid 번호 · 베이스는 옛 이름에서 뗀다).
 *       못 알아보는 옛 이름은 그대로 둔다. 이름은 표시 전용이라 전투 결과는 안 바뀐다. rng 0
 *   v31 → v32 (2026-09-21 — 편성이 셋 · 물약은 개수 · 사용자 확정 · SCREEN_DESIGN §15 · R122 · R124):
 *     · `party` · `formation` 을 **편성 1** 로 접고 나머지 편성은 빈 채로 · `preset = 1` · 옛 원정은 `run.preset = 1`
 *     · `potions`(가진 종류 목록) → **개수 표**(종류마다 1 개) · 편성 1 의 물약 칸 = 표에 있는 id 를 얻은 순서대로(옛 런이 칸을 채우던 규칙)
 *       — 그래서 편성 1 의 다음 런이 같은 칸으로 나간다. rng 0
 *   v32 → v33 (2026-09-21 — 반지 · 목걸이 옵션 세 층 · 목걸이 고정 옵션 = 발동 스킬 · 사용자 확정 · item_design §1 「반지 · 목걸이」 · R127):
 *     · 반지 · 목걸이에 죄종 칸이 없으면 `item.legacyAccessoryLayers` 로 **죄종 칸을 앞에 채운다** — 옛 옵션은 뒤에 그대로(v29 방어구와 같은 규칙)
 *     · 목걸이에 `proc` 이 없으면 **발동 스킬**을 채운다(발동 조건 = 베이스 · 모르는 베이스는 uid 번호). rng 0 · 행은 uid 번호 · 값은 가운데
 *   v1 → v2 는 이관하지 않는다 — 무기군(group)·슬롯·도감 카드·세트포인트 보류로 아이템/도감 스키마가 단절됐다.
 *   하루 된 프로토타입 세이브라 새 게임으로 받는다. v1 은 계속 throw.
 */

import { makeRng, deriveSeed } from './rng.js';
import { createFormula } from './formula.js';

export const SAVE_VERSION = 33;

/**
 * @param {object} deps
 *   hero, item, battle, skill, tactic — 각 시스템 / balance / equipSlots [{id, part}] (착용 위치 8개) / stages(byId) / stageOrder [id...]
 *   monsters(byId) / codex {levels:[kills_total...](codex_level.csv 레벨순 — 누적 처치 문턱), bonus:[레벨별 보정 — 비율](codex_level.csv:bonus_pct), statByNum:{stage_num: statKey}(codex_series.csv)}
 *   sins [죄종 id...] — 수색 이야기의 `sin` 컬럼 검증에만 쓴다
 *   searchStories — `search_story.csv` 파싱 행. **막의 어휘도 순서도 코드에 없다** — 아래 `searchPhases` 참조
 *   searchMeetings / searchAnswers — `search_meeting.csv` · `search_answer.csv` 파싱 행 (만남 · 답)
 *   makeRecipes {part: {ore, timber, dust}} (make_recipe.csv) · mineNodes / logNodes — 재료 단계 표 [{id, tier, yieldId, …}] (제작 · R96)
 *   potions [{id, kind, tier, ko, en, heal, craftGold, craftable, startOwned}] (potion.csv 행 순서) — 물약 단계 표 · startOwned = 시작 개수 (battle_design §7-1 · item_design §7-4 · R103 · R124)
 */
export function createGameSystem(deps) {
    const { hero: H, item: I, battle: BT, skill: SK, tactic: TC, balance: B } = deps;
    const F = createFormula(B);                 // 퍼센트 반올림(`roundPct`) — 세이브 이관이 쓴다 (R111)
    /** v29 전 세이브의 퍼센트 눈금 — 5% 를 `5` 로 들었다. **이관 전용** 결정론 상수 (INTERFACE §4 · §5-3 · R111) */
    const LEGACY_PCT = 100;
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
     * 새 게임 — 확정한 시작 영웅 3명이 곧 로스터다. 각자 **일반 무기 + 일반 갑옷**을 입고 시작한다 [개정 2026-09-14 · R86 · hero_design §1] —
     *   무기는 제 직업 스킬이 붙는 무기군이고 **그 영웅의 고유 스킬과 같은 스킬을 담지 않는다**.
     * **파티는 비어 있다** [사용자 지시 2026-09-09 · SCREEN_DESIGN §5] — ~~로스터가 곧 파티~~ 폐기.
     *   자동으로 채우면 플레이어가 **편성을 한 번도 안 하고** 첫 원정을 떠나므로 편성이 결정이라는 것을 배울 자리가 없다.
     *   **처음 고른 영웅이 리더**가 되는 것은 새 규칙이 아니다 — `party` 는 넣은 순서 그대로이고 리더는 `party[0]` 이다.
     * ⚠ 전투를 바로 돌리는 쪽(골든 · 단정 · `?dev=battle|play|offline`)은 **파티를 직접 채워야 한다** — `toggleParty` 는 rng 를 안 쓴다
     */
    function newGame(seed, candidates, now) {
        const state = {
            version: SAVE_VERSION, seed: seed >>> 0, createdAt: now, savedAt: now,
            resources: { gold: B.start_gold, dust: B.start_dust, stigma: B.start_stigma },
            materials: {},   // 제작 재료(광석 · 목재) — 파견이 채운다(미구현 · R96)
            potions: startStock(),     // 물약 재고 — 새 게임은 `potion.csv:start_owned` 개수를 갖고 시작한다 (R103 · 개수 R124)
            heroes: [], items: {}, bag: [], stash: [],
            progress: { cleared: [], levelUp: {} },   // levelUp = 스테이지별 **올린 양** — 안 올린 스테이지는 안 적는다 (2026-09-14 · R87)
            codexKills: {},
            counters: { hero: 0, item: 0, battle: 0, tavern: 0, tactic: 0, upgrade: 0, search: 0, make: 0 },
            run: null, reports: [], notice: null,
            tavern: { rerolledAt: null, hired: [] },
            search: null,
            // 편성 — 전부 빈 파티라 진형 랭크도 비어 있다(편성이 채우면 `normalizeFormation` 이 자리를 준다 · v20).
            //   물약 칸은 **편성 1 에만** 시작 물약이 한 칸씩 든다 (v32 · R122 · R124)
            presets: newPresets(), preset: 1,
            tactics: { slots: {} },
            // 알아서 분해의 선 — 둘 다 안 봄 = 꺼짐이 기본값이다 (item_design §6-5 · R125)
            autoSalvage: { rarity: null, ilvlBelow: 0 },
        };
        const rng = makeRng(deriveSeed(state.seed, 0));
        for (const c of candidates) {
            const h = addHero(state, clone(c));
            // 영웅마다 무기 → 갑옷 — **이 순서가 계약이다**(INTERFACE §5-2). 무기 스킬 풀에서 고유 스킬을 빼도 소비 수는 같다
            const w = addItem(state, I.startingWeapon(rng, h.cls, h.innate));
            h.equipped.weapon = w.uid;
            const a = addItem(state, I.startingArmor(rng));
            h.equipped.armor = a.uid;
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
     * v8 → v9 — 레어 고유 스킬 프로토타입 배정 (hero_design §1 · skill_design §9-0 개정 2026-09-01).
     * 옛 영웅은 고유 스킬 없이 태어났으므로 **시드에서 소급해 굴린다** — 스트림 하나(`seed ^ 0x5C11`, 카운터 0)로
     * `heroes` 배열 순서대로. 이미 가진 영웅은 건드리지 않는다. 전투 rng 수열과는 섞이지 않는다.
     */
    function upgradeV8(s) {
        const rng = makeRng(deriveSeed((s.seed >>> 0) ^ 0x5C11, 0));
        for (const h of s.heroes ?? []) if (h.innate == null) h.innate = H.rollInnate(rng, h.cls);
        s.version = 9;
        return s;
    }

    /**
     * v9 → v10 — 전술 옵션 등급 축 (tactic_card_design §5-5 · 2026-09-02).
     * 옛 세이브는 칸에 옵션 id 문자열만 들고 있었다. 등급이 없던 시절의 굴림이므로 **가장 낮은 등급**으로 받는다 —
     * 첫 배정이 언제나 일반인 것과 같은 자리다(§5-5). CSV 에서 사라진 가족은 그대로 두면
     * `tacticState` 가 첫 배정으로 되돌린다.
     */
    function upgradeV9(s) {
        const slots = s.tactics?.slots ?? {};
        for (const no of Object.keys(slots)) {
            const v = slots[no];
            if (typeof v === 'string') slots[no] = { id: v, grade: TC.GRADES[0] };
        }
        s.version = 10;
        return s;
    }

    /**
     * v10 → v11 [2026-09-03] — 회복 대기 폐기 (base_expedition_design §1-1).
     * `injuredUntil` 을 걷고 런에 **출정 누적 아웃** 칸을 판다(⚠ 그 칸은 **v17 에서 다시 사라졌다** — 09-08 「출정 아웃」 폐기).
     * 옛 세이브에서 대기 중이던 영웅은 **전부 나은 것으로 본다** —
     * 새 규칙에서는 전투 밖에 쓰러져 있는 영웅이 존재할 수 없고, 이관이 만들 수 있는 상태 중 규칙에 맞는 것이 그것 하나뿐이다.
     */
    function upgradeV10(s) {
        for (const h of s.heroes) delete h.injuredUntil;
        if (s.run) s.run.downed = s.run.downed ?? [];
        s.version = 11;
        return s;
    }

    /**
     * v11 → v12 — **버전만 올린다** (2026-09-07 단순화).
     * 원래는 옛 영웅에게 얼굴 번호를 소급 배정하던 자리였다(전용 스트림 `seed ^ 0xFACE`, 카운터 0).
     * 그 소급은 **v12 → v13 전면 재굴림에 흡수됐다** — 바로 아래 `upgradeV12` 가 전 영웅의 face 를 조건 없이
     * 덮어쓰므로 여기서 채워 봐야 곧바로 버려진다. 스트림도 그쪽(카운터 1)으로 옮겼다 (INTERFACE §4 · §5-1).
     */
    function upgradeV11(s) {
        s.version = 12;
        return s;
    }

    /**
     * v12 → v13 [2026-09-07 사용자 지시] — 초상을 **직업 분류**로 (파일명 `hero_<classId>_<k>.png`).
     * `face` 가 정수에서 `'<classId>_<k>'` 문자열로 바뀌었고, 전 영웅을 **제 직업 풀에서 전면 재굴림**한다 —
     * 조건이 없다(이미 값이 있어도 덮어쓴다). v12 의 정수 얼굴은 **직업과 무관하게** 굴린 번호라 보존할
     * 개체성이 없고, 직업 일치가 이 개정의 목적 자체다. 전투 결과는 안 바뀐다(표시 전용).
     * 풀이 0장인 직업(마법사)은 `null` 이 되고 화면이 빈 칸으로 둔다. 전용 스트림이라 다른 수열과 안 섞인다.
     */
    function upgradeV12(s) {
        const rng = makeRng(deriveSeed((s.seed >>> 0) ^ 0xFACE, 1));
        for (const h of s.heroes ?? []) h.face = H.rollFace(rng, h.cls);
        s.version = 13;
        return s;
    }

    /**
     * v13 → v14 [2026-09-07 밤] — `face = null` 인 영웅만 제 직업 풀에서 굴린다 (INTERFACE §4).
     * v12→v13 전면 재굴림이 돌던 시점엔 마법사 풀이 0장이라 마법사가 전부 null 을 받았고, 같은 날 밤
     * 마법사 그림이 들어와 새 마법사만 그림을 받는 간극이 생겼다 — 이 이관이 그 간극을 닫는다.
     * 「생성 시 1회·불변」은 굴려진 얼굴의 계약이라 null 을 채우는 것은 덮어쓰기가 아니라 처음 굴리는 것이다.
     * 가진 영웅은 rng 를 소비하지 않는다 — 소비 수 = null 영웅 수 (전용 스트림이라 다른 수열과 안 섞인다).
     */
    function upgradeV13(s) {
        const rng = makeRng(deriveSeed((s.seed >>> 0) ^ 0xFACE, 2));
        for (const h of s.heroes ?? []) if (h.face == null) h.face = H.rollFace(rng, h.cls);
        s.version = 14;
        return s;
    }

    /**
     * v14 → v15 [2026-09-07 확정 · 2026-09-08 구현 — 영웅 3층 · 개체별 히든 상한 폐지 · R48]
     * · `heroes[*].caps` **삭제** — 상한은 `[balance.csv:hero_attr_max]` 하나로 전 영웅 공통이 됐다.
     *   옛 영웅은 상한이 개체마다 달랐지만 **소급 보정을 하지 않는다** — 낮게 굴렸던 영웅은 상한이
     *   풀리는 쪽이라 손해가 없고(등급은 출발선이지 천장이 아니다 · hero_design §4-3),
     *   이미 오른 `stats` 는 그대로 둔다.
     * · `tier` 가 없던 영웅은 **레어**로 본다 — v14 까지는 생성기가 레어만 냈다(`tier: 'rare'` 고정).
     *   ⚠ 소급 재굴림을 하지 않는다: 매직은 총합이 낮은 대역이라 옛 영웅을 매직으로 내리면 능력치가 깎인다.
     */
    function upgradeV14(s) {
        for (const h of s.heroes ?? []) {
            delete h.caps;
            h.tier = h.tier ?? 'rare';
        }
        s.version = 15;
        return s;
    }

    /**
     * v15 → v16 [2026-09-07 확정 · 2026-09-08 구현 — 사제 전용 무기 · R46]
     * 스태프·오브가 **마법사 전용**이 되면서(hero_design §2) 사제가 낀 그 둘이 착용 규칙을 어기게 됐다.
     * **벗기지 않고 무기군을 사제 짝으로 갈아끼운다** — 주기 축이 그대로 대응하기 때문이다
     * (스태프 1.7 느림 → 성경 1.7 · 오브 1.3 빠름 → 십자가 1.3). 벗기는 쪽을 안 고른 이유는
     * **무기가 밑수**라(battle_design §9-1) 맨손이 된 사제는 세기가 통째로 무너지기 때문이다.
     * · **착용 중인 것만** 옮긴다 — 가방에 든 스태프·오브는 마법사가 쓸 수 있으므로 그대로 둔다
     * · 개체 굴림(접사 · 강화 · ~~watk~~ R90 · ~~element~~ R80)은 안 건드린다 (`item.regroupWeapon`)
     * · rng 를 쓰지 않는다 — 이관이 굴림을 태우면 같은 시드가 다른 결과를 낸다 (v14 와 같은 규칙)
     */
    function upgradeV15(s) {
        const SWAP = { staff: 'bible', orb: 'crucifix' };
        for (const h of s.heroes ?? []) {
            if (h.cls !== 'priest') continue;
            const it = h.equipped?.weapon ? s.items?.[h.equipped.weapon] : null;
            if (it && SWAP[it.group]) I.regroupWeapon(it, SWAP[it.group]);
        }
        s.version = 16;
        return s;
    }

    /**
     * v16 → v17 [2026-09-08] — **「출정 아웃」 폐기** (base_expedition_design §1-1 · GAME_DESIGN §9 09-08).
     * 아웃이 런을 넘지 않으므로 세이브가 들 전투불능 상태가 하나도 없다 — `run.downed` 와 리포트의
     * `outTotal` 을 걷는다. 옛 세이브에서 아웃이던 영웅은 **전부 나은 것으로 본다**(v10→v11 이 `injuredUntil`
     * 을 걷을 때와 같은 논리 — 새 규칙에서 전투 밖에 쓰러져 있는 영웅은 존재할 수 없다).
     * 진행 중이던 반복(`run.repeat`)은 안 건드린다 — 다음 런에 전원이 나갈 뿐이다. **rng 0회.**
     */
    function upgradeV16(s) {
        if (s.run) delete s.run.downed;
        if (s.lastReport) delete s.lastReport.outTotal;
        s.version = 17;
        return s;
    }

    /**
     * v17 → v18 [2026-09-09] — **직업 스킬 풀 「1스킬 = 1직업」** (skill_design §12 · GAME_DESIGN §9 09-08·09-09).
     * `skill.csv` 가 통째로 갈렸다 — 무기군 전용 행 10 이 사라지고 직업 풀이 섰다. 옛 세이브가 드는 것 둘을 맞춘다:
     *   · **무기 개체의 스킬** — 종전엔 무기가 스킬을 안 들었다(무기군이 정했다). 이제 개체가 든다
     *   · **영웅의 고유** — 옛 굴림은 직업을 안 가려서 마법사가 `wg_axe` 를 들고 있을 수 있다
     * **rng 를 쓰지 않는다.** 이관이 굴림을 태우면 같은 시드가 다른 결과를 낸다(v14·v15 와 같은 규칙) —
     *   대신 `uid` 를 풀 길이로 나눈 나머지로 고른다. 결정적이면서 개체마다 갈린다.
     * 풀이 비는 무기군(확장 직업)은 `null` 로 둔다 — 그 칸이 비는 것뿐이고 던지지 않는다.
     */
    function upgradeV17(s) {
        const poolOf = cls => SK.list.filter(d => d.ownerKind === 'job' && d.ownerId === cls).map(d => d.id);
        // uid 는 `h3`·`i12` 라 접두 한 글자를 떼고 번호만 쓴다 — 못 읽으면 0(풀의 첫 행)
        const numOf = uid => { const n = parseInt(String(uid ?? '').slice(1), 10); return Number.isFinite(n) ? n : 0; };
        const pickBy = (cls, uid) => { const p = poolOf(cls); return p.length ? p[numOf(uid) % p.length] : null; };
        for (const it of Object.values(s.items ?? {})) {
            if (it?.slot !== 'weapon' || it.skill != null) continue;
            it.skill = pickBy(I.groupOf(it)?.classes?.[0], it.uid);
        }
        for (const h of s.heroes ?? []) {
            if (h.innate && poolOf(h.cls).includes(h.innate)) continue;
            h.innate = pickBy(h.cls, h.uid);
        }
        s.version = 18;
        return s;
    }

    /**
     * v18 → v19 [2026-09-09] — **처치는 가루를 안 뱉는다** (item_design §5-3 · GAME_DESIGN §9 09-09).
     * 정예·보스 처치의 산출이 **장비 · 골드**로 좁혀져 리포트에 가루 칸이 없어졌다.
     *   · `lastReport.dust` — **걷는다.** 리포트는 「그 전투가 준 것」을 적는데 줄 것이 없어졌다
     *     (v17 이 `lastReport.outTotal` 을 걷은 것과 같은 취급)
     *   · `resources.dust` — **안 건드린다.** 이미 번 가루는 플레이어의 것이고 **분해**라는 공급원이
     *     그대로 살아 있다. 소급 회수는 「자리 비워도 안전」을 깬다
     * **rng 0회** · 전투 결과 불변(가루는 굴림도 전투 수치도 안 탄다).
     */
    function upgradeV18(s) {
        if (s.lastReport) delete s.lastReport.dust;
        s.version = 19;
        return s;
    }

    /**
     * v19 → v20 [2026-09-09] — **진형이 실물이 된다** (battle_design §3-1 · 사용자 지시).
     * 종전엔 자리가 화면 상태(`ui/app.js:state.expForm`)에만 살아서 새로고침하면 사라졌고 전투도 몰랐다.
     * 옛 세이브에는 진형이 없으므로 **기본 템플릿으로 새로 만든다** — `normalizeFormation` 이 파티 순서대로
     * 전열부터 채우므로 결과가 결정적이고, 그 배치가 「그 파티의 자연스러운 줄」이다. **rng 0회.**
     * ⚠ 화면에 마지막으로 그려져 있던 배치는 **복원할 수 없다** — 저장된 적이 없는 값이다.
     */
    function upgradeV19(s) {
        s.formation = { tpl: DEFAULT_TPL, ranks: [[], []] };
        normalizeFormation(s);
        s.version = 20;
        return s;
    }

    /**
     * v20 → v21 [2026-09-09] — **리포트는 목록이다** (SCREEN_DESIGN §4-3 · ADR-0063 · 사용자 지시).
     * 반복 원정이 런을 이을 때마다 `lastReport` 한 칸이 덮여 앞 런이 통째로 사라졌다.
     * 있던 리포트 하나를 **배열의 첫 자리**로 옮긴다 — 그것이 그 세이브가 아는 유일한 런이다.
     * 옛 리포트에는 `contrib`(기여 집계)이 없고 **채워 넣지 않는다** — 지나간 전투를 다시 돌릴 수는 없고,
     * 없는 값을 0 으로 지어내면 「못 때렸다」로 읽힌다. 화면은 그 상자를 안 그린다. **rng 0회.**
     */
    function upgradeV20(s) {
        s.reports = s.lastReport ? [s.lastReport] : [];
        delete s.lastReport;
        s.version = 21;
        return s;
    }

    /**
     * v21 → v22 [2026-09-11] — **챕터는 5스테이지다** (base_expedition_design §1-2 · 사용자 지시 · R75).
     * 챕터보스가 4스테이지에서 **5스테이지(보스 단독 1라운드)** 로 옮겨 가고 4스테이지에 새 스테이지보스가 섰다.
     * 해금이 「직전 스테이지 클리어」라 옛 세이브는 새 챕터보스 스테이지를 깬 기록이 없어 **다음 챕터가 통째로 잠긴다.**
     * 옛 세이브에서 챕터보스를 잡은 증거는 **그 직전 자리(옛 챕터보스 자리)를 깬 기록**이다 — 그러면 챕터보스 스테이지도 깬 것으로 둔다.
     * 스테이지 번호 산술을 안 쓴다 — `boss_grade` 와 `stageOrder` 만 본다. **rng 0회.**
     * 리포트 · 런 · 알림의 `stageId` 는 **옮기지 않는다** — 그 런은 9라운드짜리 옛 자리에서 돈 것이라,
     * 보스 단독 스테이지로 고쳐 적으면 라운드 수가 거짓이 된다 (INTERFACE §4).
     */
    function upgradeV21(s) {
        const order = deps.stageOrder;
        const cleared = s.progress?.cleared;
        if (cleared) order.forEach((id, i) => {
            if (i === 0 || deps.stages[id]?.boss_grade !== 'chapter_boss') return;
            if (cleared.includes(order[i - 1]) && !cleared.includes(id)) cleared.push(id);
        });
        s.version = 22;
        return s;
    }

    /**
     * v22 → v23 [2026-09-11] — **무기 옵션은 세 층이다** (item_design §1 「무기 옵션」 · 사용자 지시 · R78).
     * 접사가 **출처(`src`)** 를 들게 됐다 — `fixed`(고정 옵션) · 죄종 id(죄종 칸) · `random`(통합옵션).
     *   · **이미 붙은 접사는 그대로 두고 `random` 표를 붙인다** — 가진 것을 다시 굴리지 않는다(개체값은 개체의 역사다 · v2 · v17 과 같은 규칙)
     *   · **무기는 고정 옵션과 죄종 칸을 규칙대로 채운다** — `item.legacyWeaponLayers` 가 **굴림 없이** uid 로 고른다(v17 의 스킬 소급과 같은 방식).
     *     옛 무기도 새 무기와 같은 층을 갖게 하려는 것이고, 옛 통합옵션의 개수는 줄이지 않는다
     * **rng 0회.** 방어구 · 장신구는 출처 표만 붙는다 — 부위 개편은 후속이다(사용자 지시).
     * ⚠ **이 시점의 세이브는 옛 눈금(0~100)이다** [2026-09-17 · R111] — `legacyWeaponLayers` 는 지금 CSV(비율)로 값을 내므로
     *   퍼센트 채널을 옛 눈금으로 되돌려 붙인다. 안 그러면 v27 의 정수화가 0.05 를 1(= 1%)로 올리고 v29 가 한 번 더 나눈다
     */
    function upgradeV22(s) {
        const legacyScale = a => (I.pctStat(a.stat) ? { ...a, v: F.roundPct(a.v * LEGACY_PCT, true) } : a);
        for (const it of Object.values(s.items ?? {})) {
            if (!it) continue;
            for (const a of it.affixes ?? []) a.src = a.src ?? 'random';
            if (it.slot === 'weapon' && !(it.affixes ?? []).some(a => a.src !== 'random'))
                it.affixes = [...I.legacyWeaponLayers(it).map(legacyScale), ...(it.affixes ?? [])];
        }
        s.version = 23;
        return s;
    }

    /** v23 → v24 — 보관이 둘이 된다(인벤토리 + 창고 · item_design §1).
     *  옛 가방을 앞에서부터 `inventory_cap` 개만 남기고 **넘치는 뒤쪽을 창고로** 옮긴다.
     *  아이템은 하나도 안 사라진다 · rng 를 안 쓴다 (INTERFACE §4 v23 → v24) */
    function upgradeV23(s) {
        const bag = s.bag ?? [];
        s.bag = bag.slice(0, B.inventory_cap);
        s.stash = [...(s.stash ?? []), ...bag.slice(B.inventory_cap)];
        s.version = 24;
        return s;
    }

    /** v24 → v25 — **원정 보상은 라운드를 이긴 순간 들어온다** (base_expedition_design §1-1 · R89 · INTERFACE §4 v24 → v25).
     *  경험치가 영웅마다 달라져(쓰러진 영웅은 그 뒤 라운드 몫이 없다) 리포트의 「전원 동일」 한 숫자(`xpEach`)가 영웅별 `xp` 로 바뀐다 —
     *  옛 리포트는 그때 전원이 같은 양을 받았으므로 `party` 의 영웅마다 그 값을 옮기는 것이 사실이다.
     *  `run.active` 는 `false` — 옛 런은 출발 순간 정산이 끝나 끊을 원정이 없다. rng 0 */
    function upgradeV24(s) {
        for (const R of s.reports ?? []) {
            R.xp = R.xp ?? Object.fromEntries((R.party ?? []).map(uid => [uid, R.xpEach ?? 0]));
            delete R.xpEach;
        }
        if (s.run) s.run.active = false;
        s.version = 25;
        return s;
    }

    /** v25 → v26 — **무기 피해는 최소 ~ 최대 범위이고 파생이다** (battle_design §9-1 · R90 · INTERFACE §4 v25 → v26).
     *  드롭 때 굴려 박던 무기 개체 공격력(`watk`)이 사라진다 — 범위는 무기군 · 아이템 레벨 · 강화 단계에서 매번 다시 계산한다.
     *  옛 무기는 **같은 조건의 범위로 돌아간다**(잘 뜬 개체도 못 뜬 개체도 · 사용자 확인 2026-09-14). rng 0 */
    function upgradeV25(s) {
        for (const it of Object.values(s.items ?? {})) if (it) delete it.watk;
        s.version = 26;
        return s;
    }

    /**
     * 장비 옵션은 소수를 두지 않는다 [2026-09-16 · 사용자 지시] — 이미 저장된 값을 정수로 올린다.
     * `fine` 한 행(오만 「레벨당 데미지 +%」)만 빼고 반올림한다 — 1 보다 작은 값이 그 옵션의 본질이라
     * 정수로 올리면 만렙 기여가 2~5배로 뛴다. 값 대역을 다시 정할 때 같이 처리한다 (item.js `valueOf`)
     */
    function upgradeV26(s) {
        for (const it of Object.values(s.items ?? {})) {
            if (!it) continue;
            if (it.implicit) it.implicit.v = Math.max(1, Math.round(it.implicit.v));
            for (const a of it.affixes ?? []) if (a.stat !== 'dmg_per_level_pct') a.v = Math.max(1, Math.round(a.v));
        }
        s.version = 27;
        return s;
    }

    /**
     * 방어구 고유값이 **부위 배수 × 갑옷군 배수 × 10레벨 구간 직선**이 됐다 [2026-09-16 사용자 확정 · R107 · item_design §1].
     * 옛 값은 `armor_def_base(9.5) + ilvl × armor_def_per_ilvl(0.15)` 이라 새 대역의 1/5 수준이다 — 그대로 두면
     * 옛 방어구만 쓸모가 없어지므로 지금 공식의 바탕값으로 앉힌다. 개체 편차는 버린다(다시 굴리면 rng 순서가 깨진다). rng 0
     */
    function upgradeV27(s) {
        for (const it of Object.values(s.items ?? {})) {
            if (!it?.implicit) continue;
            const v = I.baseImplicit(it);
            if (v !== null) it.implicit.v = v;
        }
        s.version = 28;
        return s;
    }

    /**
     * 퍼센트는 비율로 든다 [2026-09-17 · 사용자 지시 · R111 · src/data/README.md 단위 규약] — 저장된 접사 값의 눈금을 옮긴다.
     * **퍼센트 채널만** 나눈다(`item.pctStat` — 옵션 표의 `growth` · `band` 행과 옛 `atk_flat` 이 아니면 전부).
     * `implicit.v`(방어구 고유 방어력)는 고정값이라 그대로다. 오만 「레벨당 데미지」(`fine`)도 나눈다 — 눈금만 바뀌고 전투 결과는 같다.
     * 부동소수 꼬리는 0.1% 단위로 자른다(옛 값이 정수 또는 소수 1자리라 잃는 것이 없다). rng 0
     */
    function upgradeV28(s) {
        for (const it of Object.values(s.items ?? {})) {
            if (!it) continue;
            for (const a of it.affixes ?? []) {
                if (I.pctStat(a.stat) && typeof a.v === 'number') a.v = F.roundPct(a.v / LEGACY_PCT, true);
            }
        }
        s.version = 29;
        return s;
    }

    /**
     * 방어구 옵션이 세 층이 됐다 · 고유 방어력 편차가 사라졌다 [2026-09-18 · 사용자 확정 · item_design §1 「갑옷 옵션」 · INTERFACE §4 v29 → v30].
     * 옛 방어구는 옛 공용 풀(`affix.csv`)의 옵션만 들고 편차로 굴린 고유값을 든다 —
     *   · **고정 옵션이 없으면** 고정 옵션 · 죄종 칸을 앞에 채운다(`item.legacyArmorLayers` — uid 로 고르고 값은 가운데). 옛 옵션은 뒤에 그대로 둔다
     *   · 고유값은 **지금 공식의 바탕값**으로(`item.baseImplicit`) — 새 드롭과 같은 값이 된다. 티아라 · 가죽 투구가 갈래 계수를 이때 받는다
     * 목걸이 · 반지는 건드리지 않는다. **rng 0**
     */
    function upgradeV29(s) {
        for (const it of Object.values(s.items ?? {})) {
            if (!it) continue;
            const layers = I.legacyArmorLayers(it);
            if (!layers.length) continue;                              // 방어구가 아니다
            if (!(it.affixes ?? []).some(a => a.src === 'fixed')) it.affixes = [...layers, ...(it.affixes ?? [])];
            const v = I.baseImplicit(it);
            if (v !== null && it.implicit) it.implicit.v = v;
        }
        s.version = 30;
        return s;
    }

    /**
     * 아이템 이름이 「A와 B의 베이스」가 됐다 · 죄종마다 단어 넷 [2026-09-19 · 사용자 확정 · item_design §1 「이름」 · INTERFACE §4 v30 → v31].
     * 옛 아이템은 `words` 가 없고 이름이 옛 형식이다 — `item.legacyName` 이 단 번호(uid 번호)와 새 이름(옛 이름에서 뗀 베이스)을 낸다.
     * **rng 0** · 이름은 표시 전용이라 전투 결과는 안 바뀐다
     */
    function upgradeV30(s) {
        for (const it of Object.values(s.items ?? {})) {
            if (!it || Array.isArray(it.words)) continue;             // 이미 단어를 든 아이템(새 드롭)은 건드리지 않는다
            const r = I.legacyName(it);
            it.words = r.words;
            it.name = r.name;
        }
        s.version = 31;
        return s;
    }

    /**
     * 편성이 셋이 됐다 · 물약은 개수를 가진 소모품이다 [2026-09-21 · 사용자 확정 · SCREEN_DESIGN §15 · INTERFACE §4 v31 → v32 · R122 · R124].
     * 옛 파티 · 진형은 **편성 1** 이 된다. 물약 칸은 옛 런이 채우던 규칙(가진 순서대로 · 표에 있는 것만 · 칸 수에서 자른다) 그대로라
     *   편성 1 의 다음 런이 같은 칸으로 나간다. 가진 물약은 종류마다 **1 개**다(표에서 사라진 id 도 옮긴다 — 로드는 지우지 않는다).
     *   물약 목록이 없던 세이브(R103 이전)는 새 게임과 같은 시작 재고 · 시작 칸으로 연다. rng 0
     *   **이미 든 것은 건드리지 않는다** — 편성 · 개수 표를 이미 든 세이브는 그대로 둔다(v30 의 `words` 와 같은 규칙 · 없는 것만 채운다)
     */
    function upgradeV31(s) {
        const had = Array.isArray(s.potions) ? s.potions : null;
        if (!Array.isArray(s.presets)) {
            const first = emptyPreset();
            first.party = Array.isArray(s.party) ? s.party.slice() : [];
            if (s.formation) first.formation = s.formation;
            first.potionSlots = had ? padSlots(had.filter(id => potionById(id))) : startSlots();
            s.presets = [first, ...Array.from({ length: PRESET_N - 1 }, emptyPreset)];
        }
        s.preset = s.preset ?? 1;
        if (had) s.potions = Object.fromEntries(had.map(id => [id, 1]));
        else if (!s.potions || typeof s.potions !== 'object') s.potions = startStock();
        if (s.run) s.run.preset = s.run.preset ?? 1;
        delete s.party;
        delete s.formation;
        s.version = 32;
        return s;
    }

    /**
     * 반지 · 목걸이 옵션이 세 층이 됐다 · 목걸이 고정 옵션 = 발동 스킬 [2026-09-21 · 사용자 확정 · item_design §1 「반지 · 목걸이」 · INTERFACE §4 v32 → v33 · R127].
     * 옛 반지 · 목걸이는 옛 공용 풀(`affix.csv`)의 옵션만 든다(전부 `random`) —
     *   · **죄종 칸이 없으면** 죄종 칸을 앞에 채운다(`item.legacyAccessoryLayers` — uid 로 고르고 값은 가운데). 옛 옵션은 뒤에 그대로 둔다(v29 방어구와 같은 규칙)
     *   · 목걸이는 **`proc` 이 없으면** 발동 스킬을 채운다(발동 조건 = 그 베이스 · 모르는 베이스는 uid 로)
     * 다른 부위는 건드리지 않는다. **rng 0**
     */
    function upgradeV32(s) {
        for (const it of Object.values(s.items ?? {})) {
            if (!it) continue;
            const { proc, layers } = I.legacyAccessoryLayers(it);
            if (!proc && !layers.length) continue;                     // 반지 · 목걸이가 아니거나 채울 것이 없다(일반 반지)
            if (!(it.affixes ?? []).some(a => a.src && a.src !== 'random' && a.src !== 'fixed')) it.affixes = [...layers, ...(it.affixes ?? [])];
            if (proc && !it.proc) it.proc = proc;
        }
        s.version = 33;
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
        if (![SAVE_VERSION, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].includes(obj.version))
            throw new Error(`save: version ${obj.version} (expected ${SAVE_VERSION})`);
        let s = clone(obj);
        if (s.version === 2) s = upgradeV2(s);
        if (s.version === 3) s = upgradeV3(s);
        if (s.version === 4) s = upgradeV4(s);
        if (s.version === 5) s = upgradeV5(s);
        if (s.version === 6) s = upgradeV6(s);
        if (s.version === 7) s = upgradeV7(s);
        if (s.version === 8) s = upgradeV8(s);
        if (s.version === 9) s = upgradeV9(s);
        if (s.version === 10) s = upgradeV10(s);
        if (s.version === 11) s = upgradeV11(s);
        if (s.version === 12) s = upgradeV12(s);
        if (s.version === 13) s = upgradeV13(s);
        if (s.version === 14) s = upgradeV14(s);
        if (s.version === 15) s = upgradeV15(s);
        if (s.version === 16) s = upgradeV16(s);
        if (s.version === 17) s = upgradeV17(s);
        if (s.version === 18) s = upgradeV18(s);
        if (s.version === 19) s = upgradeV19(s);
        if (s.version === 20) s = upgradeV20(s);
        if (s.version === 21) s = upgradeV21(s);
        if (s.version === 22) s = upgradeV22(s);
        if (s.version === 23) s = upgradeV23(s);
        if (s.version === 24) s = upgradeV24(s);
        if (s.version === 25) s = upgradeV25(s);
        if (s.version === 26) s = upgradeV26(s);
        if (s.version === 27) s = upgradeV27(s);
        if (s.version === 28) s = upgradeV28(s);
        if (s.version === 29) s = upgradeV29(s);
        if (s.version === 30) s = upgradeV30(s);
        if (s.version === 31) s = upgradeV31(s);
        if (s.version === 32) s = upgradeV32(s);
        for (const h of s.heroes) h.equipped = { ...emptyEquip(), ...h.equipped };
        // 도감 카드는 걷혔다 [2026-09-21 · 버전 무변경] — 레벨은 이미 있던 `codexKills` 에서 다시 계산되므로 소급할 판단이 없다 · 필드만 지운다 (INTERFACE §4)
        delete s.codexCards; s.codexKills = s.codexKills ?? {};
        s.run = s.run ?? null; s.reports = s.reports ?? []; s.notice = s.notice ?? null;
        s.tavern = s.tavern ?? { rerolledAt: null, hired: [] };
        s.tactics = s.tactics ?? { slots: {} };
        // 수색 — 없으면 「한 적이 없다」가 정확한 초기 상태라 **버전을 안 올린다** (INTERFACE §4 · 2026-09-09)
        s.stash = s.stash ?? [];       // 창고 — v24. 없던 세이브는 빈 채로 열린다
        s.progress.levelUp = s.progress.levelUp ?? {};   // 스테이지 레벨 — 없으면 「아무것도 안 올렸다」가 정확한 초기 상태라 버전을 안 올린다 (INTERFACE §4 · R87)
        s.search = s.search ?? null;
        if (s.search) s.search.answer = s.search.answer ?? null;   // 만남 이전에 나간 수색 (2026-09-09)
        s.counters.search = s.counters.search ?? 0;
        // 제작 재료 · 회차 — 없으면 「가진 재료가 없다 · 만든 적이 없다」가 정확한 초기 상태라 버전을 안 올린다 (INTERFACE §4 · R96)
        s.materials = s.materials ?? {};
        s.counters.make = s.counters.make ?? 0;
        // 물약 재고 — v32 부터 개수 표다(없던 세이브는 v31 이관이 시작 재고로 채운다). 모양이 틀리면 시작 재고로 연다 (INTERFACE §4 · R124)
        if (!s.potions || typeof s.potions !== 'object' || Array.isArray(s.potions)) s.potions = startStock();
        // 편성 — **편성 수 · 칸 수를 CSV 에 맞춘다**(모자라면 빈 편성 · 빈 칸을 붙이고 넘치면 뒤를 자른다) · 고른 번호는 범위로 자른다 (INTERFACE §2-7 · R122)
        s.presets = fitPresets(s.presets);
        s.preset = Math.min(PRESET_N, Math.max(1, Number.isInteger(s.preset) ? s.preset : 1));
        // 알아서 분해 — 없으면 「꺼짐」이 새 게임과 같은 초기 상태라 버전을 안 올린다 (INTERFACE §4 · R125)
        s.autoSalvage = { rarity: null, ilvlBelow: 0, ...(s.autoSalvage ?? {}) };
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
     */
    const heroCombat = (state, h, party = partyOf(state)) => H.computeCombat(h, heroItems(state, h).map(I.effective), codexBonus(state),
        party.includes(h.uid) ? tacticBonus(state, party) : null);

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
        const it = state.items[itemUid];
        const pos = it && !Object.values(h.equipped).includes(itemUid) ? equipTarget(h, it) : null;
        if (!pos) return heroCombat(state, h);
        const off = x => Object.values(x.equipped).includes(itemUid)
            ? { ...x, equipped: Object.fromEntries(Object.entries(x.equipped).map(([p, u]) => [p, u === itemUid ? null : u])) } : x;
        const me = { ...h, equipped: { ...h.equipped, [pos]: itemUid } };
        return heroCombat({ ...state, heroes: state.heroes.map(x => x.uid === h.uid ? me : off(x)) }, me);
    }

    /** 가방 → 착용. 그 위치의 착용품은 가방으로 (가방이 차면 실패). position 은 생략 가능.
     *  양손↔보조 배타는 2026-09-01 한손 개념 폐지로 사라졌다 — 되돌아오는 것은 언제나 그 자리에 있던 하나뿐이다 */
    /** 그 아이템이 어느 보관함에 있나 — 인벤토리(`bag`) / 창고(`stash`) / 없음(null) [v24] */
    const holderOf = (state, uid) =>
        state.bag.includes(uid) ? 'bag' : (state.stash ?? []).includes(uid) ? 'stash' : null;
    const capOf = (where) => where === 'bag' ? B.inventory_cap : B.stash_cap;

    function equip(state, heroUid, itemUid, position) {
        const h = heroById(state, heroUid), it = state.items[itemUid];
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
        if (list.length - 1 + back.length > capOf(from)) return { ok: false, err: from === 'bag' ? 'bagFull' : 'stashFull' };

        const rest = list.filter(u => u !== itemUid);
        for (const u of back) rest.push(u);
        if (from === 'bag') state.bag = rest; else state.stash = rest;
        h.equipped[pos] = itemUid;
        return { ok: true, back, position: pos, from };
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

    /** 분해 — 가방 · 창고 아이템을 몬스터 가루로 (착용 중인 것은 `missing` · 잠근 것은 `locked`) */
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

    /** 인벤토리 → 창고 [v24]. 받는 쪽이 차 있으면 `stashFull` */
    function moveToStash(state, itemUid) {
        if (holderOf(state, itemUid) !== 'bag') return { ok: false, err: 'missing' };
        if (state.stash.length >= B.stash_cap) return { ok: false, err: 'stashFull' };
        state.bag = state.bag.filter(u => u !== itemUid);
        state.stash.push(itemUid);
        return { ok: true };
    }

    /** 창고 → 인벤토리 [v24]. 받는 쪽이 차 있으면 `bagFull` */
    function moveToBag(state, itemUid) {
        if (holderOf(state, itemUid) !== 'stash') return { ok: false, err: 'missing' };
        if (state.bag.length >= B.inventory_cap) return { ok: false, err: 'bagFull' };
        state.stash = state.stash.filter(u => u !== itemUid);
        state.bag.push(itemUid);
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

    /** 선을 바꾼다 — 준 키만. 가방의 것은 건드리지 않는다(다음 드롭부터 먹는다) */
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
        const up = it.up ?? 0, max = I.upgradeMax(), cost = I.upgradeCost(it);
        return {
            up, max, cost, gold: state.resources.gold,
            upgradeable: I.upgradeable(it),
            canUpgrade: cost != null && state.resources.gold >= cost,
        };
    }

    /**
     * 강화 1단계 — 골드를 내고 `up` 을 올린다. 거절은 `missing` → `noBase` → `maxUp` → `gold` 순으로 본다.
     * **가방·착용을 가리지 않는다** — 소유물에 하는 일이지 자리에 하는 일이 아니다(분해와 갈리는 지점).
     * **rng 를 안 쓴다** (R95) — 옵션 계단이 사라져 굴릴 것이 없다. `counters.upgrade` 도 더 오르지 않는다 (INTERFACE §5-1).
     */
    function upgradeItem(state, itemUid) {
        const it = state.items[itemUid];
        if (!it) return { ok: false, err: 'missing' };
        if (!I.upgradeable(it)) return { ok: false, err: 'noBase' };
        const cost = I.upgradeCost(it);
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
     * 재료는 **그 단계**의 광석(`mine_node.csv`) · 목재(`log_node.csv`) — 단계 n = 챕터 n 의 지역 (base_expedition §2-1).
     * 두 표 중 하나라도 그 단계가 없으면 그 레벨대는 목록에 없다
     */
    const makeBandList = (() => {
        const top = new Map();
        for (const s of Object.values(deps.stages ?? {})) top.set(s.chapter, Math.max(top.get(s.chapter) ?? 0, s.dlvl));
        const out = [];
        let lo = 1;
        for (const ch of [...top.keys()].sort((a, b) => a - b)) {
            const hi = top.get(ch);
            const ore = (deps.mineNodes ?? []).find(n => n.tier === ch);
            const timber = (deps.logNodes ?? []).find(n => n.tier === ch);
            if (ore && timber && hi >= lo) out.push({ band: ch, lo, hi, ore: ore.yieldId, timber: timber.yieldId });
            lo = hi + 1;
        }
        return out;
    })();

    /** 제작 레벨대 목록 — 부위 · 상태와 무관하다. 화면의 고르기 칸이 이 순서로 선다 */
    const makeBands = () => makeBandList.map(b => ({ ...b }));

    /**
     * 제작 화면 상태 한 덩어리 — **판정을 여기서 다 낸다** (`upgradeState` 와 같은 규칙).
     * `cost` = [{kind: 'ore'|'timber'|'dust', id, need, have}] — 광석 · 목재의 `id` 는 산출물 id · 가루는 null.
     * `err` = 지금 누르면 나올 거절(`materials` → `bagFull` 순) 또는 null. 없는 부위 · 레벨대면 null
     */
    function makeState(state, part, band) {
        const r = recipes[part], b = makeBandList.find(x => x.band === band);
        if (!r || !b) return null;
        const mats = state.materials ?? {};
        const cost = [
            { kind: 'ore', id: b.ore, need: r.ore, have: mats[b.ore] ?? 0 },
            { kind: 'timber', id: b.timber, need: r.timber, have: mats[b.timber] ?? 0 },
            { kind: 'dust', id: null, need: r.dust, have: state.resources.dust },
        ];
        const err = cost.some(c => c.have < c.need) ? 'materials'
            : state.bag.length >= B.inventory_cap ? 'bagFull' : null;
        return { part, band, lo: b.lo, hi: b.hi, cost, canMake: err === null, err };
    }

    /**
     * 제작 1회 — 재료를 내고 장비 하나를 **인벤토리 끝**에 넣는다. 거절은 `missing` → `materials` → `bagFull` 순이고 거절이면 아무것도 안 바뀐다.
     * rng 는 제작 전용 스트림(`seed ^ 0xC4AF` · `counters.make` 선증가) — 전투 · 선술집 · 전술 수열과 안 섞인다 (INTERFACE §5-1).
     * 소비: **ilvl 1회**(레벨대 안 균등 — ⚠제안 · GAME_DESIGN §10 「제작의 남은 설계」) → `item.rollGear` 한 벌(부위 하나 · 희귀도는 제작 가중치) (INTERFACE §5-2)
     */
    function makeItem(state, part, band) {
        const s = makeState(state, part, band);
        if (!s) return { ok: false, err: 'missing' };
        if (s.err) return { ok: false, err: s.err };
        state.materials = state.materials ?? {};
        for (const c of s.cost) {
            if (c.kind === 'dust') state.resources.dust -= c.need;
            else state.materials[c.id] -= c.need;
        }
        const rng = makeRng(deriveSeed(state.seed ^ 0xC4AF, ++state.counters.make));
        const ilvl = s.lo + Math.floor(rng() * (s.hi - s.lo + 1));
        const [it] = I.rollGear(rng, { slots: [part], ilvl, rarityWeights: MAKE_WEIGHTS });
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
    /** 칸 구성을 칸 수 [balance.csv:potion_slot_max] 에 맞춘다 — 넘치면 뒤를 자르고 모자라면 빈 칸(`null`)을 붙인다 */
    const padSlots = list => Array.from({ length: B.potion_slot_max }, (_, i) => list[i] ?? null);
    /** 시작 칸 — 시작 물약이 **행 순서대로 한 칸씩**(개수와 무관 · 칸 수에서 자른다). 새 게임의 편성 1 이 든다 */
    const startSlots = () => padSlots(potionRows.filter(p => p.startOwned > 0).map(p => p.id));

    /**
     * 칸 채우기 — 편성의 칸 구성을 **재고에서 앞 칸부터** 채운다 [R124 · battle_design §7-1]. 칸마다 `{id, heal}` 또는 `null`
     *   (비워 둔 칸 · 재고가 모자란 칸 · 표에서 사라진 id). 같은 물약이 여러 칸이면 앞 칸이 먼저 가져가서 **뒤 칸부터** 모자란다.
     * 재고는 **안 바꾼다** — 줄어드는 것은 마실 때다(`advanceRun`). `departRun` 이 전투에 넘기는 칸도, `presetState` 의 `short` 도 이 함수 하나에서 나온다
     */
    function fillSlots(state, p) {
        const left = { ...(state.potions ?? {}) };
        return padSlots(p?.potionSlots ?? []).map(id => {
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
     * `craftable` 은 ⚠ 임시 칸이다 — 단계가 열리는 조건(연구 또는 챕터)은 기획 미정이다 (GAME_DESIGN §10 「물약의 남은 설계」)
     */
    function potionState(state) {
        const gold = state.resources.gold;
        const list = potionRows.map(p => {
            const err = !p.craftable ? 'locked' : gold < p.craftGold ? 'gold' : null;
            return { id: p.id, kind: p.kind, tier: p.tier, heal: p.heal, cost: p.craftGold, have: state.potions?.[p.id] ?? 0, craftable: p.craftable, canMake: err === null, err };
        });
        return { slotMax: B.potion_slot_max, useHpPct: B.potion_use_hp_pct, cooldownSec: B.potion_cooldown_sec, list };
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
     *   · 정원은 `formation_template.csv` 가 든다 (`2-1` / `1-2` / `3`) — **칸 수 = 표의 값**
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
       편성은 **늘 [balance.csv:party_preset_count] 개가 서 있고** 번호가 이름이다(1 부터) — 만들고 지우는 동작이 없다.
       편성마다 파티 · 진형 · 물약 칸을 든다(파티 전술은 모든 편성이 같이 쓴다 — `tactics` 하나).
       파티 · 진형 · 물약 칸을 바꾸는 함수는 **고른 편성**(`state.preset`)에 작용한다 — 편성 탭은 늘 고른 편성을 펴므로 번호를 따로 받지 않는다.
       출발만 번호를 받는다 — 반복이 **도는 원정의 편성**으로 다시 나가야 해서다(고른 편성이 그새 바뀌었을 수 있다) */
    const PRESET_N = B.party_preset_count;
    if (!(Number.isInteger(PRESET_N) && PRESET_N >= 1)) throw new Error(`balance: party_preset_count ${PRESET_N} — 1 이상 정수여야 한다 (INTERFACE §2-7)`);
    const emptyPreset = () => ({ party: [], formation: { tpl: DEFAULT_TPL, ranks: [[], []] }, potionSlots: padSlots([]) });
    /** 새 게임의 편성 — 전부 빈 파티 · 물약 칸은 편성 1 에만 시작 물약 (R124) */
    const newPresets = () => {
        const list = Array.from({ length: PRESET_N }, emptyPreset);
        list[0].potionSlots = startSlots();
        return list;
    };
    /** 불러온 편성을 CSV 에 맞춘다 — 편성 수 · 칸 수. 모자라면 빈 편성 · 빈 칸을 붙이고 넘치면 뒤를 자른다 */
    const fitPresets = list => Array.from({ length: PRESET_N }, (_, i) => {
        const p = Array.isArray(list) ? list[i] : null;
        if (!p || typeof p !== 'object') return emptyPreset();
        return {
            party: Array.isArray(p.party) ? p.party : [],
            formation: p.formation ?? { tpl: DEFAULT_TPL, ranks: [[], []] },
            potionSlots: padSlots(Array.isArray(p.potionSlots) ? p.potionSlots : []),
        };
    });
    /** 번호 → 편성. 정수가 아니거나 범위 밖이면 null */
    const presetAt = (state, no) => (Number.isInteger(no) && no >= 1 && no <= (state.presets?.length ?? 0) ? state.presets[no - 1] : null);
    /** 고른 편성 — 번호가 틀려 있으면 편성 1 (로드가 범위로 자르므로 평소엔 안 탄다) */
    const curPreset = state => presetAt(state, state.preset) ?? state.presets[0];
    /** 편성의 파티 — **복사본**이다. `no` 를 안 주면 고른 편성 · 없는 번호면 [] */
    const partyOf = (state, no = state.preset) => (presetAt(state, no)?.party ?? []).slice();
    /** 그 편성으로 지금 나가면 나올 거절 — 스테이지 무관. 없는 편성 `missing` → 빈 파티 `noParty` → 수색 나간 영웅 `searching` → null */
    const presetErr = (state, p) => (!p ? 'missing' : p.party.length === 0 ? 'noParty'
        : state.search && p.party.includes(state.search.heroUid) ? 'searching' : null);

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
    /** **고른 편성**의 진형 (R122) */
    const formationState = state => formationOf(curPreset(state));

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
     * 편성 화면 상태 한 덩어리 — **판정을 여기서 다 낸다** [신설 2026-09-21 · R122 · R124 · SCREEN_DESIGN §15 · §4-1].
     * `runNo` = 도는 원정의 편성(고르개의 「원정 중」) · 칸마다 `short` = 재고가 모자라 런에서 빈 채 시작할 칸 — `departRun` 이 채우는 것과 같은 함수(`fillSlots`)다
     */
    function presetState(state) {
        const runNo = state.run?.active && presetAt(state, state.run.preset) ? state.run.preset : null;
        return {
            count: PRESET_N, activeNo: state.preset, runNo, slotMax: B.potion_slot_max,
            presets: state.presets.map((p, i) => {
                const filled = fillSlots(state, p);
                return {
                    no: i + 1, party: p.party.slice(), formation: clone(p.formation),
                    potionSlots: padSlots(p.potionSlots ?? []).map((id, k) => (id ? { id, short: !filled[k] } : null)),
                    err: presetErr(state, p),
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
        const slots = padSlots(p.potionSlots ?? []);
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
        const slots = padSlots(p.potionSlots ?? []);
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
        //   **고른 편성**에 작용한다 [2026-09-21 · R122] — 한 영웅이 여러 편성에 들어가도 된다(편성은 계획이다)
        const p = curPreset(state);
        if (p.party.includes(uid)) {
            p.party = p.party.filter(u => u !== uid);
            normalizeFormation(p);                        // 뺀 자리를 뒤가 메운다 (진형 2026-09-09)
            return { ok: true };
        }
        // 편성이 막는 상태는 **수색 하나**다 [2026-09-09] — 전투 밖에 쓰러져 있는 영웅은 없지만(나오면 전원 회복)
        //   수색 나간 영웅은 마을에 없다. 출정 중 아웃은 편성이 아니라 출발이 본다
        if (state.search?.heroUid === uid) return { ok: false, err: 'searching' };
        if (p.party.length >= B.party_size_max) return { ok: false, err: 'full' };
        p.party.push(uid);
        normalizeFormation(p);                            // 전열이 찬 뒤 후열로 — 새 영웅의 자리 (진형 2026-09-09)
        return { ok: true };
    }

    /* ~~`returnToTown(state)`~~ 는 2026-09-08 삭제 — 「출정 아웃」 폐기로 **귀환이 회복할 것이 없다**.
       회복은 런이 끝나는 순간 자동이고 상태에 남는 것이 없다(HP 는 애초에 세이브에 없다 — INTERFACE §4). */

    /* ── 스테이지 · 원정 ── */

    /** 해금 = 첫 스테이지이거나 직전 스테이지(순서 기준)를 클리어했다 */
    function stageUnlocked(state, stageId) {
        const i = deps.stageOrder.indexOf(stageId);
        if (i <= 0) return i === 0;
        return state.progress.cleared.includes(deps.stageOrder[i - 1]);
    }

    function canDepart(state, stageId, now, no = state.preset) {
        // 원정이 도는 중이어도 막지 않는다 — 보내면 `departRun` 이 그 원정을 끊는다 (R92)
        if (!stageUnlocked(state, stageId)) return 'locked';
        // 편성 `no`(기본 고른 편성)로 나간다 [2026-09-21 · R122] — 없는 편성 · 빈 파티 · **수색 나간 영웅이 든 편성**은 못 나간다.
        //   편성은 계획이라 든 채로 수색을 보낼 수 있고 여기서 막는다. ~~「아웃을 빼고 아무도 안 남으면」~~ 은 2026-09-08 삭제 —
        //   아웃이 런을 넘지 않으므로 언제나 전원이 나간다 (base_expedition_design §1-1)
        return presetErr(state, presetAt(state, no));
    }

    /**
     * 스테이지 레벨 [신설 2026-09-14 · R87 · base_expedition_design §1-4] — **플레이어가 만지는 숫자는 이것 하나**이고 몬스터 레벨이 곧 이 값이다.
     *   `base` = `stage.csv:dlvl` · `max` = **클리어한 스테이지의 기본 레벨 중 최고**(키가 없다 — 클리어 기록에서 파생) ·
     *   `level` = 기본 레벨 + 올린 양(`progress.levelUp`)을 `[base, max]` 로 자른 값.
     *   올린 스테이지는 상한 이하라 그걸 깨도 상한이 안 오른다 — 그래서 기본 레벨만 봐도 「클리어한 최고 레벨」이다.
     *   **해금 조건이 없다** — 처음부터 열려 있다(사용자 09-14 · 나중에 연구로 넣는다). 아무것도 안 깼으면 `max = base` 라 못 올린다.
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

    // 액티브는 **전투 안에서만** 산다 — 쿨·창·배리어는 HP 와 같은 취급이라 세이브에 넣지 않는다 (INTERFACE §4)
    const partyUnits = (state, uids, no = state.preset) => {
        const p = presetAt(state, no) ?? curPreset(state);   // 편성 `no` — 원정은 나간 편성을 넘긴다 (R122)
        const byUid = formationOf(p).byUid;               // 자리 — 전투가 「앞」을 읽는 유일한 입력 (진형 2026-09-09) · 둘째 라운드부터는 안 읽힌다(`refit`)
        const list = uids ?? p.party;
        return list.map(uid => {
            const h = heroById(state, uid);
            return {
                uid, combat: heroCombat(state, h, list),  // 전술 조건도 이 인원으로 센다 — 원정은 나간 인원이다 (R92)
                stats: h.stats,                           // 기본 능력치 — 스킬 계수가 시전 순간 읽는다 (skill.js scaleDef · 2026-09-10 R72)
                actives: SK.activesFor(h, { weaponSkill: weaponSkillOf(state, h) }),
                rank: byUid[uid] ?? 0,                    // 배치가 없으면 전열 — 뒤에 숨는 유닛을 만들지 않는다
            };
        });
    };

    /* ── 원정 — **라운드 단위로 진행한다** [2026-09-14 · R89 · base_expedition_design §1-1 · 사용자 확정] ──
       출발(`departRun`)이 첫 라운드를 계산하고, 진행 시각이 그 라운드의 끝에 닿을 때마다 `advanceRun` 이 **이긴 라운드만** 정산한 뒤
       다음 라운드를 **그 순간의 장비 · 레벨로** 계산한다 — 보상이 들어오는 시각이 곧 라운드가 끝나는 시각이다.
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

    /** 도는 원정의 리포트 — 판정이 아직 없고(`reason: null`) 그 원정이 나간 시각의 것. 도는 원정이 없으면 null */
    const liveReport = state => state.run?.active ? state.reports.find(r => r.at === state.run.lastAt && r.reason === null) ?? null : null;

    /** 끝났거나 **끊긴** 원정의 핸들인가 — 끊기(새 출발 · `closeRun`)는 핸들 없이 리포트 판정만 세운다 (R92) */
    const runOver = run => !run || run.done || run.report.reason !== null;

    /**
     * 지금 싸우는 영웅 — 도는 원정이 나갈 때의 인원 [신설 2026-09-14 · R92]. 원정 중에도 편성을 바꾸고 고르므로 **고른 편성의 파티**와 다를 수 있다 —
     * 파티에서 뺀 영웅도 그 원정이 끝날 때까지 싸우고, 새로 넣은 영웅은 안 싸운다. 해고 · 수색이 이것으로 막는다. 도는 원정이 없으면 `[]`
     */
    function runParty(state) {
        return liveReport(state)?.party.slice() ?? [];
    }

    /**
     * 출발 — 런을 열고 **첫 라운드까지 계산**한다. **보상은 하나도 안 준다** — 라운드의 보상은 그 라운드가 끝나는 시각에 `advanceRun` 이 준다.
     * 시드는 마스터 시드 + 전투 카운터에서 파생된다: 같은 세이브에서 다음 원정은 언제 돌려도 같다(도중에 장비를 안 바꾸면).
     * 리포트는 **지금 목록 맨 앞에 선다** — `reason: null` 이 「진행 중」이고 라운드를 이길 때마다 찬다.
     * @returns `{ok, run, report}` — `run` = 핸들 `{stageId, report, result, segEnd, done}` (INTERFACE §2-7)
     */
    function departRun(state, stageId, now, no = state.preset) {
        const why = canDepart(state, stageId, now, no);
        if (why) return { ok: false, err: why };
        // 도는 원정이 있으면 **먼저 끊는다** — 철수와 같다(진행 중이던 라운드는 없던 것 · 리포트 `retreat` · 반복 off) [2026-09-14 · R92 · 사용자 지시].
        //   보상은 이긴 라운드에만 들어오므로 끊고 다시 보내는 것이 가속 수단이 안 된다. 옛 핸들은 리포트 판정이 서서 `done` 으로 거절된다
        cutRun(state, 'retreat');

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
        const battle = BT.createRun(partyUnits(state, going, no), stageId, rng, level, fillSlots(state, preset));

        const report = {
            at: now, stageId, level, won: false, reason: null, durationSec: 0,   // reason null = 진행 중
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
        state.run = {
            stageId, preset: no, repeat: state.run?.stageId === stageId ? state.run.repeat : false,
            lastAt: now, durationSec: 0, active: true,
        };
        const pending = battle.next();
        return { ok: true, report, run: { stageId, preset: no, report, result: battle.result, segEnd: pending.t, done: false, battle, rng, party: going, pending } };
    }

    /**
     * 라운드 넘기기 — 진행 시각이 `run.segEnd` 에 닿았을 때 부른다.
     *   ① 끝난 라운드를 정산한다 — **이긴 라운드만**: 골드 → 도감(처치 수) → 드롭(인벤토리 · 넘치면 그 순간 버린다) →
     *      **경험치 = 그 라운드 처치 XP 합 × xp_rate 를 그 순간 살아 있는 영웅마다**(쓰러진 영웅은 그 라운드 몫이 없다) → 마지막 라운드면 클리어.
     *      진 라운드(전멸 · 시간 초과)는 보상 없이 런을 닫는다
     *   ② 런이 안 끝났으면 **다음 라운드를 그 순간의 장비 · 레벨로** 계산한다 — `partyUnits` 를 다시 만들어 넘기고 바뀐 영웅만 갈아입는다
     */
    function advanceRun(state, run, now) {
        if (runOver(run)) return { ok: false, err: 'done' };
        const s = run.pending, R = run.report, res = run.result;
        // 마신 물약을 재고에서 뺀다 — 이겼든 졌든 그 라운드에 마신 것이다 (R124 · battle_design §7-1). 버린 라운드(철수 · 끊김)는 여기 안 온다
        for (const [id, k] of Object.entries(s.potions ?? {})) spendPotion(state, id, k);
        if (s.cleared) {
            state.resources.gold += s.gold;
            R.gold += s.gold;
            // ~~처치가 뱉는 가루~~ 는 2026-09-09 삭제 — 가루의 공급원은 **분해** 하나다(`salvage` · item_design §5-3)
            // 도감 레벨의 출처 — 이긴 라운드의 처치 수 (monster_design §8 · 2026-09-21 카드 걷음)
            for (const [id, n] of Object.entries(s.kills)) state.codexKills[id] = (state.codexKills[id] ?? 0) + n;
            for (const it of s.drops) {
                // 알아서 분해 [2026-09-21 · R125 · item_design §6-5] — **가방 참 검사보다 먼저** 선을 본다: 걸린 것은 칸을 안 먹고 버린 수에도 안 든다.
                //   「그 런이 준 것」이라 uid 를 받아 리포트 `drops` 에 남긴 뒤 곧바로 지운다 — 화면은 흐린 빈 칸으로 그린다(SCREEN_DESIGN §4-3) · rng 0
                if (autoSalvageHits(autoRuleOf(state), it)) {
                    const gone = addItem(state, it);
                    R.drops.push(gone.uid);
                    state.resources.dust += I.salvageDust(gone);
                    delete state.items[gone.uid];
                    continue;
                }
                if (state.bag.length >= B.inventory_cap) { R.discarded++; continue; }
                const added = addItem(state, it);
                state.bag.push(added.uid);
                R.drops.push(added.uid);
            }
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
        if (state.run) state.run.durationSec = s.t;

        if (s.ended) {
            R.won = res.won;
            R.reason = res.reason;
            if (res.won && !state.progress.cleared.includes(run.stageId)) state.progress.cleared.push(run.stageId);
            run.done = true;
            if (state.run) state.run.active = false;
            return { ok: true, round: s, done: true };
        }
        run.pending = run.battle.next(partyUnits(state, run.party, run.preset));
        run.segEnd = run.pending.t;
        return { ok: true, round: s, done: false };
    }

    /** 도는 원정을 끊는다 — 진행 중이던 라운드는 **없던 것**이다(보상 없음 · 리포트는 마지막으로 정산한 라운드 끝 그대로). 반복도 끈다. 끊었으면 true */
    function cutRun(state, reason) {
        const run = state.run;
        if (!run?.active) return false;
        const R = liveReport(state);
        run.active = false;
        run.repeat = false;
        if (R) R.reason = reason;
        return true;
    }

    /** 철수 — 관전의 옛 「건너뛰기」 자리다 (R89). 진행 중이던 라운드는 버리고 원정을 끝낸다 · 이긴 라운드의 보상은 이미 들어가 있다 */
    function retreatRun(state, run, now) {
        if (runOver(run)) return { ok: false, err: 'done' };
        run.done = true;
        cutRun(state, 'retreat');
        return { ok: true, report: run.report };
    }

    /**
     * 개발 · 검증용 **즉시 계산** — 출발한 뒤 라운드를 끝까지 같은 `now` 로 넘긴다(장비를 안 바꾸므로 라운드 사이에 들어가는 것은 레벨업뿐이다).
     * 골든 · 단정 · 캘리브레이션 · `?dev=battle` 이 쓴다. **게임 화면은 안 쓴다** — 화면은 `departRun` → `advanceRun` 을 시간에 맞춰 부른다
     */
    function resolveBattle(state, stageId, now, no = state.preset) {
        const d = departRun(state, stageId, now, no);
        if (!d.ok) return d;
        while (!advanceRun(state, d.run, now).done);
        return { ok: true, result: d.run.result, report: d.report };
    }

    /**
     * 재접속 · 멈춤 — **원정은 게임이 켜져 있는 동안만 돈다** (base_expedition_design §1 · 2026-08-25).
     * 도는 원정이 있으면 **끊는다** [개정 2026-09-14 · R89 · 사용자 확정] — 진행 중이던 라운드는 버리고(리포트 `closed`) 반복을 끈다.
     *   ~~꺼져 있던 사이 돌던 런은 마무리된 것으로 본다~~ 는 폐기 — 남은 라운드를 마무리해 주면 껐다 켜기로 원정을 무한히 빨리 돌릴 수 있다.
     * 끊었거나 반복이 켜져 있었으면 재접속 알림을 남긴다. 오프라인에 도는 것은 파견뿐이다 — 미구현
     */
    function closeRun(state, now) {
        const run = state.run;
        if (!run) return null;
        const repeat = run.repeat === true;
        const cut = cutRun(state, 'closed');
        if (!cut && !repeat) return null;
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

    /**
     * 해고 — 로스터에서 지운다. **되돌릴 수 없다** [신설 2026-09-09 사용자 확정 · INTERFACE §2-7].
     * 막는 것 둘:
     *   · `equipped` — **장비를 하나라도 걸치고 있으면 못 한다.** 다 벗으면 아이템이 가방에 남으므로
     *     「해고하면 장비가 어떻게 되나」라는 질문 자체가 생기지 않는다 (사용자 확정).
     *   · `last` — 마지막 한 명은 못 지운다. 0명이 되면 원정을 못 돌려 골드가 안 들어오고 고용도 못 해 복구가 막힌다.
     * **반환물은 없다** — 있으면 GAME_DESIGN §10 이 경고한 고용→해고 루프가 열린다(고용은 골드를 받는다).
     * **모든 편성**에서도 뺀다(진형도 맞춘다 · R122) — 지운 uid 가 남으면 편성·출발이 유령을 든다. `run` 은 uid 를 안 들어 런 중에도 안전하다.
     */
    function dismiss(state, uid) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        // **수색을 먼저 본다** — 나가 있는 사람에게 「장비를 벗어라」라고 하면 벗어도 안 되는 길로 보내게 된다
        // 지금 싸우는 영웅은 못 지운다 — 도는 원정의 인원이다. 파티에서 뺐어도 그 원정이 끝날 때까지다 (R89 · R92)
        if (runParty(state).includes(uid)) return { ok: false, err: 'running' };
        if (state.search?.heroUid === uid) return { ok: false, err: 'searching' };
        if (Object.values(h.equipped ?? {}).some(Boolean)) return { ok: false, err: 'equipped' };
        if (state.heroes.length <= 1) return { ok: false, err: 'last' };
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
        const fighting = runParty(state);
        const head = {
            hours: B.tavern_search_hours, slots: B.tavern_search_slots, cost: B.tavern_hire_cost,
            echoPct: B.tavern_search_sin_echo_pct,
            // 안 나가 있을 때 보낼 수 있는 사람 — **지금 싸우는 영웅만 뺀다**(전투 밖에 쓰러져 있는 영웅이 없다 · §1-1 · R92).
            //   편성에 든 영웅도 보낸다 — 편성은 계획이고, 그 편성의 출발이 `searching` 으로 막힌다 (`canDepart` · 2026-09-21)
            ready: s ? [] : state.heroes.filter(h => !fighting.includes(h.uid)).map(h => h.uid),
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
        const err = state.heroes.length >= B.roster_cap ? 'roster'
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
        if (state.search) return { ok: false, err: 'busy' };
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        if (runParty(state).includes(uid)) return { ok: false, err: 'party' };   // 지금 싸우는 영웅만 막는다 — 편성은 계획이다(출발이 `searching` 으로 막는다 · R92 · 2026-09-21)
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
        if (state.heroes.length >= B.roster_cap) return { ok: false, err: 'roster' };
        const picked = answerRows.find(a => a.answer_id === s.answer) ?? null;
        const cost = searchCost(searchDiscount(searchMeetingOf(state, s.no), picked));
        if (state.resources.gold < cost) return { ok: false, err: 'gold' };
        const { hero } = searchRoll(state, s);
        state.resources.gold -= cost;
        const h = addHero(state, hero);
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

    /* ── 파티 전술 — 칸 해금(합산 레벨) · 리롤 (tactic_card_design §5 확정 2026-08-30) ── */

    /** 해금 기준 = **로스터 전원의 레벨 합.** 파티 3명이 아니라 보유 영웅 전부다 — 벤치를 키워도 칸이 열린다 */
    const totalLevel = state => state.heroes.reduce((a, h) => a + (h.level ?? 1), 0);

    /**
     * 조건이 세는 대상 = **파티**(기본은 고른 편성 · 원정은 나간 인원을 넘긴다 · R92 · R122). 전술은 파티 단위이므로 벤치는 조건에 안 들어간다.
     * `actives` 는 **스킬 정의**를 넘긴다 — `tactic.contextOf` 의 계약이 정의이고(`tagsOf(def)`),
     * id 문자열을 넘기면 `skill_tag` 조건 4종이 영원히 0 을 센다 (2026-09-01 회귀 수정 · INTERFACE §2-9)
     */
    const partyMembers = (state, party = partyOf(state)) => party.map(uid => heroById(state, uid)).filter(Boolean)
        .map(h => ({ sin: h.sin, cls: h.cls, items: heroItems(state, h), actives: SK.activesFor(h, { weaponSkill: weaponSkillOf(state, h) }).map(a => SK.resolve(a)).filter(Boolean) }));

    /** 첫 배정 — 시드 하나에서 나온다. 리롤 카운터를 안 타므로 **리롤이 다른 칸의 내용을 흔들지 않는다** */
    const initialAssign = state => TC.initialAssign(makeRng(deriveSeed(state.seed ^ 0x7AC7, 0)));

    /**
     * 칸의 지금 상태 한 덩어리 — 열렸나 · 무엇이 들었나 · 조건이 몇 / 몇인가 · 리롤 비용.
     * 판정은 전부 여기서 낸다 (masteryState · tavernState 와 같은 규칙) — 화면은 그리기만 한다.
     */
    function tacticState(state, party = partyOf(state)) {
        const total = totalLevel(state);
        const open = TC.openCount(total);
        const stored = state.tactics?.slots ?? {};
        const initial = initialAssign(state);
        const ctx = TC.contextOf(partyMembers(state, party));
        const slots = TC.slotList.map((s, i) => {
            const opened = s.no <= open;
            // 저장된 것(리롤한 칸) 우선 · 없으면 첫 배정. 세이브에 없는 가족·등급은 CSV 가 바뀐 것이라 첫 배정으로 되돌린다
            const option = opened ? (TC.optionOf(stored[s.no]) ?? TC.optionOf(initial[i]) ?? null) : null;
            const m = option ? TC.measure(option, ctx) : null;
            return {
                no: s.no, open: opened, unlockTotalLevel: s.unlockTotalLevel, cost: s.rerollCost,
                option, have: m?.have ?? 0, need: m?.need ?? 0, active: m?.active ?? false,
            };
        });
        return { totalLevel: total, open, count: TC.slotCount, slots };
    }

    /** 켜진 칸들의 효과 합 — 접사·마스터리와 **같은 채널** (§2-4). `heroCombat` 이 이걸 받는다 */
    function tacticBonus(state, party = partyOf(state)) {
        return TC.bonusOf(tacticState(state, party).slots.filter(s => s.open && s.active).map(s => s.option));
    }

    /**
     * 리롤 — 칸 하나의 옵션을 간다. 비용은 칸마다 다르다 (tactic_slot.csv:reroll_cost_gold).
     * **지금 든 것과 다른 칸에 든 것을 후보에서 뺀다** — 돈을 내고 같은 것이 나오거나 칸끼리 겹치는 일을 막는다.
     * 빼는 단위는 **가족**이다 (2026-09-02) — 등급이 달라도 같은 가족이면 같은 stat 이 두 칸에서 곱해진다 (§5-5).
     * 뽑히는 것은 `{id, grade}` 한 쌍이다 — 리롤은 옵션과 등급을 **같이** 굴린다.
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
        if (!next) return { ok: false, err: 'missing' };      // 가족이 칸보다 많다는 것은 로드 시 검증했다
        state.resources.gold -= slot.cost;
        state.tactics = state.tactics ?? { slots: {} };
        state.tactics.slots[slotNo] = next;
        return { ok: true, option: TC.optionOf(next), cost: slot.cost };
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

    /**
     * 한 랭크 무른다 — 포인트 1점 환급. `learnMastery` 의 역방향이다 (skill_design §5 「무료 · 수시」).
     * **해금 레벨을 보지 않는다** — 찍힌 랭크가 있다는 것 자체가 그때 열려 있었다는 증거이고,
     * 여기서 다시 보면 「찍었는데 못 뺀다」는 상태가 생긴다(초기화로는 빠지므로 규칙도 갈린다).
     * 랭크가 0 이 되면 키를 지운다 — 전액 롤백(`resetMastery`) 뒤와 같은 모양이어야 세이브가 두 갈래로 안 갈린다.
     */
    function unlearnMastery(state, uid, nodeId) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
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
        const spent = Object.values(h.mastery ?? {}).reduce((a, b) => a + b, 0);
        h.mastery = {};
        h.masteryPoints = (h.masteryPoints ?? 0) + spent;
        return { ok: true, refunded: spent, points: h.masteryPoints };
    }

    return {
        newGame, serialize, deserialize, canLoad,
        heroById, heroItems, heroCombat, heroCombatIf, upgradeState, upgradeItem, makeBands, makeState, makeItem, potionState, makePotion,
        codexLevel, codexNext, codexMaxLevel, codexBonusAt, codexBonus,
        equipTarget, equip, unequip, salvage, setItemLock, setAutoSalvage, autoSalvagePreview, applyAutoSalvage, moveToStash, moveToBag, holderOf,
        toggleParty, formationState, setFormation, placeFormation, rankOf,
        presetState, selectPreset, partyOf, setPotionSlot, swapPotionSlot,
        stageUnlocked, canDepart, runParty, stageLevelState, setStageLevel, departRun, advanceRun, retreatRun, resolveBattle, closeRun, dismissNotice,
        tavernCandidates, tavernState, tavernReroll, hire, dismiss, swapHeroes,
        searchState, searchSend, searchTake, searchDrop, searchAnswer,
        masteryState, learnMastery, unlearnMastery, resetMastery,
        tacticState, tacticBonus, rerollTactic, weaponGroupOf, weaponSkillOf,
    };
}
