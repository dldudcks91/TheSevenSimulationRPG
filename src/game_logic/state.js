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
 *   party: [uid], items: {uid: item}, bag: [uid],
 *     — party = **편성한 순서 그대로**. `party[0]` 이 리더다. **새 게임은 빈 배열**이다 (2026-09-09)
 *     — items[*].skill = **무기가 담은 액티브 id** | null (무기만 · v18 신설 2026-09-09).
 *       드롭 때 그 무기군의 **직업 풀**에서 굴려 개체에 박는다 — 액티브 2번 칸의 입력이다
 *       (skill_design §12-1 규칙 3 · `skill.activesFor` 의 `ctx.weaponSkill`)
 *   progress: {cleared: [stageId]},
 *   codexCards: {monsterId: n}   — 도감 레벨의 출처. 누적 카운트, 소모 없음 (monster_design §8)
 *   codexKills: {monsterId: n}   — 기록만. 레벨의 트리거가 아니다
 *   counters: {hero, item, battle, tavern, tactic, upgrade, search},
 *   run: {stageId, repeat, lastAt, durationSec} | null,
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
 *   v1 → v2 는 이관하지 않는다 — 무기군(group)·슬롯·도감 카드·세트포인트 보류로 아이템/도감 스키마가 단절됐다.
 *   하루 된 프로토타입 세이브라 새 게임으로 받는다. v1 은 계속 throw.
 */

import { makeRng, deriveSeed } from './rng.js';

export const SAVE_VERSION = 24;

/**
 * @param {object} deps
 *   hero, item, battle, skill, tactic — 각 시스템 / balance / equipSlots [{id, part}] (착용 위치 8개) / stages(byId) / stageOrder [id...]
 *   monsters(byId) / codex {levels:[cards_to_next...](codex_level.csv 레벨순), bonus:[레벨별 %](codex_level.csv:bonus_pct), statByNum:{stage_num: statKey}(codex_series.csv)}
 *   sins [죄종 id...] — 수색 이야기의 `sin` 컬럼 검증에만 쓴다
 *   searchStories — `search_story.csv` 파싱 행. **막의 어휘도 순서도 코드에 없다** — 아래 `searchPhases` 참조
 *   searchMeetings / searchAnswers — `search_meeting.csv` · `search_answer.csv` 파싱 행 (만남 · 답)
 */
export function createGameSystem(deps) {
    const { hero: H, item: I, battle: BT, skill: SK, tactic: TC, balance: B } = deps;
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
     * 새 게임 — 확정한 시작 영웅 3명이 곧 로스터다. 각자 직업 전속 무기군의 무기 1개를 쥐고 시작한다.
     * **파티는 비어 있다** [사용자 지시 2026-09-09 · SCREEN_DESIGN §5] — ~~로스터가 곧 파티~~ 폐기.
     *   자동으로 채우면 플레이어가 **편성을 한 번도 안 하고** 첫 원정을 떠나므로 편성이 결정이라는 것을 배울 자리가 없다.
     *   **처음 고른 영웅이 리더**가 되는 것은 새 규칙이 아니다 — `party` 는 넣은 순서 그대로이고 리더는 `party[0]` 이다.
     * ⚠ 전투를 바로 돌리는 쪽(골든 · 단정 · `?dev=battle|play|offline`)은 **파티를 직접 채워야 한다** — `toggleParty` 는 rng 를 안 쓴다
     */
    function newGame(seed, candidates, now) {
        const state = {
            version: SAVE_VERSION, seed: seed >>> 0, createdAt: now, savedAt: now,
            resources: { gold: B.start_gold, dust: B.start_dust, stigma: B.start_stigma },
            heroes: [], party: [], items: {}, bag: [], stash: [],
            progress: { cleared: [] },
            codexCards: {}, codexKills: {},
            counters: { hero: 0, item: 0, battle: 0, tavern: 0, tactic: 0, upgrade: 0, search: 0 },
            run: null, reports: [], notice: null,
            tavern: { rerolledAt: null, hired: [] },
            search: null,
            // 진형 — 파티가 비어 있으니 랭크도 비어 있다. 편성이 채우면 `normalizeFormation` 이 자리를 준다 (v20)
            formation: { tpl: DEFAULT_TPL, ranks: [[], []] },
            tactics: { slots: {} },
        };
        const rng = makeRng(deriveSeed(state.seed, 0));
        for (const c of candidates) {
            const h = addHero(state, clone(c));
            const w = addItem(state, I.startingWeapon(rng, h.cls));
            h.equipped.weapon = w.uid;
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
     * · 개체 굴림(watk · element · 접사 · 강화)은 안 건드린다 (`item.regroupWeapon`)
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
     */
    function upgradeV22(s) {
        for (const it of Object.values(s.items ?? {})) {
            if (!it) continue;
            for (const a of it.affixes ?? []) a.src = a.src ?? 'random';
            if (it.slot === 'weapon' && !(it.affixes ?? []).some(a => a.src !== 'random'))
                it.affixes = [...I.legacyWeaponLayers(it), ...(it.affixes ?? [])];
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
        if (![SAVE_VERSION, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].includes(obj.version))
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
        for (const h of s.heroes) h.equipped = { ...emptyEquip(), ...h.equipped };
        s.codexCards = s.codexCards ?? {}; s.codexKills = s.codexKills ?? {};
        s.run = s.run ?? null; s.reports = s.reports ?? []; s.notice = s.notice ?? null;
        s.tavern = s.tavern ?? { rerolledAt: null, hired: [] };
        s.tactics = s.tactics ?? { slots: {} };
        // 수색 — 없으면 「한 적이 없다」가 정확한 초기 상태라 **버전을 안 올린다** (INTERFACE §4 · 2026-09-09)
        s.stash = s.stash ?? [];       // 창고 — v24. 없던 세이브는 빈 채로 열린다
        s.search = s.search ?? null;
        if (s.search) s.search.answer = s.search.answer ?? null;   // 만남 이전에 나간 수색 (2026-09-09)
        s.counters.search = s.counters.search ?? 0;
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
       아웃은 **그 런 안에서만** 살고 런은 출발 순간 통째로 정산되므로, 전투 밖에 아웃된 영웅이 존재하지 않는다. */

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

    /** 분해 — 가방 아이템을 몬스터 가루로 */
    function salvage(state, itemUid) {
        const it = state.items[itemUid];
        const from = it ? holderOf(state, itemUid) : null;   // 창고 것도 분해된다 [v24 · item_design §1]
        if (!from) return { ok: false, err: 'missing' };
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

    /**
     * 파티와 진형을 맞춘다 — **결정적이고 순서를 보존한다.** rng 를 안 쓴다.
     *   ① 파티에 없는 uid 를 뺀다 ② 정원 초과분은 **뒤에서부터** 뽑아 대기로 ③ 미배치(파티 순서) + 대기를
     *   **앞 랭크부터** 빈 정원에 채운다. 그래서 새 영웅은 언제나 전열이 찬 뒤에 후열로 간다
     */
    function normalizeFormation(state) {
        const f = state.formation ?? (state.formation = { tpl: DEFAULT_TPL, ranks: [[], []] });
        if (!FT[f.tpl]) f.tpl = DEFAULT_TPL;
        const caps = formCaps(f.tpl);
        const ranks = caps.map((_, i) => (f.ranks?.[i] ?? []).filter(uid => state.party.includes(uid)));
        const spill = [];
        ranks.forEach((list, i) => { while (list.length > caps[i]) spill.push(list.pop()); });
        const placed = new Set(ranks.flat());
        const queue = state.party.filter(uid => !placed.has(uid)).concat(spill);
        ranks.forEach((list, i) => { while (list.length < caps[i] && queue.length) list.push(queue.shift()); });
        f.ranks = ranks;
        return f;
    }

    /** 읽기 — 순수하다. `byUid` 는 uid → 랭크 번호 (없는 영웅은 전열로 읽는다) */
    function formationState(state) {
        const f = state.formation ?? { tpl: DEFAULT_TPL, ranks: [[], []] };
        const caps = formCaps(f.tpl);
        const ranks = caps.map((_, i) => (f.ranks?.[i] ?? []).slice());
        const byUid = {};
        ranks.forEach((list, i) => { for (const uid of list) byUid[uid] = i; });
        // `shapes` — 템플릿마다의 정원. 화면이 아이콘(점 배열)을 그리려면 **현재 것만으로는 모자라다**
        const shapes = Object.fromEntries(FT_ORDER.map(id => [id, formCaps(id)]));
        return { tpl: f.tpl, caps, ranks, byUid, templates: FT_ORDER.slice(), shapes };
    }

    /** 그 영웅의 랭크 — 배치가 없으면 **전열**이다 (자리를 못 받은 유닛이 뒤에 숨지 않는다) */
    const rankOf = (state, uid) => formationState(state).byUid[uid] ?? 0;

    /** 템플릿 교체 — 정원이 바뀌므로 재배치가 따라온다 */
    function setFormation(state, tpl) {
        if (!FT[tpl]) return { ok: false, err: 'missing' };
        (state.formation ?? (state.formation = { tpl, ranks: [[], []] })).tpl = tpl;
        normalizeFormation(state);
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
        if (!state.party.includes(uid)) return { ok: false, err: 'missing' };
        const f = normalizeFormation(state);
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
                normalizeFormation(state);
                return { ok: true, swapped: null };
            }
            if (from >= 0) f.ranks[from][f.ranks[from].indexOf(uid)] = owner;   // 주인은 내가 있던 칸으로
            f.ranks[rank][idx] = uid;
            normalizeFormation(state);
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
        normalizeFormation(state);
        return { ok: true, swapped };
    }

    /* ── 파티 ── */

    function toggleParty(state, uid, now) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        if (state.party.includes(uid)) {
            state.party = state.party.filter(u => u !== uid);
            normalizeFormation(state);                    // 뺀 자리를 뒤가 메운다 (진형 2026-09-09)
            return { ok: true };
        }
        // 편성이 막는 상태는 **수색 하나**다 [2026-09-09] — 전투 밖에 쓰러져 있는 영웅은 없지만(나오면 전원 회복)
        //   수색 나간 영웅은 마을에 없다. 출정 중 아웃은 편성이 아니라 출발이 본다
        if (state.search?.heroUid === uid) return { ok: false, err: 'searching' };
        if (state.party.length >= B.party_size_max) return { ok: false, err: 'full' };
        state.party.push(uid);
        normalizeFormation(state);                        // 전열이 찬 뒤 후열로 — 새 영웅의 자리 (진형 2026-09-09)
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

    function canDepart(state, stageId, now) {
        if (!stageUnlocked(state, stageId)) return 'locked';
        // 파티가 비면 못 나간다. ~~「아웃을 빼고 아무도 안 남으면」~~ 은 2026-09-08 삭제 —
        // 아웃이 런을 넘지 않으므로 언제나 전원이 나간다 (base_expedition_design §1-1)
        if (state.party.length === 0) return 'noParty';
        return null;
    }

    /* ~~`activeParty(state, stageId)`~~ · ~~`continuing`~~ 은 2026-09-08 삭제 — 「출정 아웃」 폐기.
       반복으로 잇는 런에도 **전원이 다시 나간다**(런이 끝나면 회복 · base_expedition_design §1-1 개정 09-08). */

    // 액티브는 **전투 안에서만** 산다 — 쿨·창·배리어는 HP 와 같은 취급이라 세이브에 넣지 않는다 (INTERFACE §4)
    const partyUnits = (state, uids) => {
        const byUid = formationState(state).byUid;        // 자리 — 전투가 「앞」을 읽는 유일한 입력 (진형 2026-09-09)
        return (uids ?? state.party).map(uid => {
            const h = heroById(state, uid);
            return {
                uid, combat: heroCombat(state, h),
                stats: h.stats,                           // 기본 능력치 — 스킬 계수가 시전 순간 읽는다 (skill.js scaleDef · 2026-09-10 R72)
                actives: SK.activesFor(h, { weaponSkill: weaponSkillOf(state, h) }),
                rank: byUid[uid] ?? 0,                    // 배치가 없으면 전열 — 뒤에 숨는 유닛을 만들지 않는다
            };
        });
    };

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
        // **전원이 나간다** [개정 2026-09-08 — 「출정 아웃」 폐기]. ~~이어지는 반복이면 이전 런까지 아웃된 영웅을 뺀다~~ 는
        // 아웃이 런을 넘지 않게 되면서 사라졌다 (base_expedition_design §1-1)
        const going = state.party.slice();
        const result = BT.simulate(partyUnits(state, going), stageId, rng);

        // 보상 — XP 는 참가 전원 동일 지급 (⚠제안 — 분배 규칙 미확정)
        const xpEach = Math.round(result.xpTotal * B.xp_rate);
        const levelUps = [];
        for (const uid of going) {          // 파티 전원 — 09-08 부터 안 나가는 영웅이 없다
            const h = heroById(state, uid);
            const lu = H.grantXp(h, xpEach, rng);
            if (lu) levelUps.push(lu);
        }
        state.resources.gold += result.gold;
        // ~~`state.resources.dust += result.dust`~~ 는 2026-09-09 삭제 — **처치가 뱉는 재료는 없다**
        // (item_design §5-3 확정). 가루의 공급원은 **분해** 하나다(`salvage`)
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

        // 아웃 — 쓰러진 영웅은 **그 런의 남은 라운드** 동안만 빠진다(battle.js). 런이 끝나면 회복이라
        // 상태에 남기는 것이 없다 [개정 2026-09-08 — ~~출정 누적 아웃(`run.downed`)~~ 폐기 · 세이브 v17]

        if (result.won && !state.progress.cleared.includes(stageId)) state.progress.cleared.push(stageId);

        const report = {
            at: now, stageId, won: result.won, reason: result.reason, durationSec: result.durationSec,
            gold: result.gold, xpEach, levelUps,          // ~~dust~~ 09-09 폐기 — 처치는 가루를 안 뱉는다
            downed: result.downed.slice(), party: going.slice(), drops, discarded,   // ~~outTotal(출정 누적)~~ 09-08 폐기
            cards: { ...result.cards },
            rounds: result.rounds,
            // 깬 라운드 수 — 렌더러가 「이겼으면 전부, 아니면 하나 뺀다」로 짐작하던 값이다.
            // 귀환 룰이 들어오면서 「라운드를 정리한 직후에 철수」가 생겨 그 짐작이 틀릴 수 있다
            roundsCleared: result.roundsCleared,
            // 빗나감 비율 — 레벨 부족의 전용 신호 (battle_design §9-8). 옛 리포트에는 없을 수 있다(렌더러가 허용)
            strikes: result.strikes ? clone(result.strikes) : null,
            // 기여 — 영웅별 가한/받은 피해와 처치 수 (SCREEN_DESIGN §4-3). 렌더러가 타임라인을 다시 더하지 않게
            // **정산이 실어 보낸다** — 리포트에는 타임라인이 없고(세이브에 안 든다) 화면은 계산하지 않는다
            contrib: result.contrib ? clone(result.contrib) : null,
        };
        // 목록의 맨 앞에 넣고 상한만큼만 남긴다 — 오래된 런부터 밀려난다 (v21)
        state.reports.unshift(report);
        if (state.reports.length > B.report_keep) state.reports.length = B.report_keep;
        state.run = {
            stageId, repeat: state.run?.stageId === stageId ? state.run.repeat : false,
            lastAt: now, durationSec: result.durationSec,
            // ~~downed(출정 누적 아웃)~~ 는 2026-09-08 삭제 — 런을 넘어 유지되는 전투불능이 없다 (세이브 v17)
        };
        return { ok: true, result, report };
    }

    /**
     * 재접속 — 반복 원정은 **게임이 켜져 있는 동안만** 돈다 (base_expedition_design §1, 2026-08-25).
     * 꺼져 있던 사이 돌던 런은 마무리된 것으로 본다. 프로토타입은 런을 출발 시점에 통째로 정산하므로(resolveBattle)
     * 남은 미정산분이 없다 — `reports[0]` 이 곧 "진행 중이던 전투까지 정산한" 결과다. 여기서는 반복을 끄고 알림만 남긴다.
     * 오프라인에 도는 것은 파견뿐이다 — 미구현 (회복은 오프라인에 돌 것이 없다 — 전투 밖은 이미 전원 회복).
     * **재접속은 귀환이다** — 09-08 「출정 아웃」 폐기로 ~~아웃된 영웅을 낫게 하는 일~~ 자체가 없어졌고,
     * 여기서는 반복을 끄고 알림만 남긴다 (base_expedition_design §1-1).
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

    /**
     * 해고 — 로스터에서 지운다. **되돌릴 수 없다** [신설 2026-09-09 사용자 확정 · INTERFACE §2-7].
     * 막는 것 둘:
     *   · `equipped` — **장비를 하나라도 걸치고 있으면 못 한다.** 다 벗으면 아이템이 가방에 남으므로
     *     「해고하면 장비가 어떻게 되나」라는 질문 자체가 생기지 않는다 (사용자 확정).
     *   · `last` — 마지막 한 명은 못 지운다. 0명이 되면 원정을 못 돌려 골드가 안 들어오고 고용도 못 해 복구가 막힌다.
     * **반환물은 없다** — 있으면 GAME_DESIGN §10 이 경고한 고용→해고 루프가 열린다(고용은 골드를 받는다).
     * `party` 에서도 뺀다 — 지운 uid 가 남으면 편성·출발이 유령을 든다. `run` 은 uid 를 안 들어 런 중에도 안전하다.
     */
    function dismiss(state, uid) {
        const h = heroById(state, uid);
        if (!h) return { ok: false, err: 'missing' };
        // **수색을 먼저 본다** — 나가 있는 사람에게 「장비를 벗어라」라고 하면 벗어도 안 되는 길로 보내게 된다
        if (state.search?.heroUid === uid) return { ok: false, err: 'searching' };
        if (Object.values(h.equipped ?? {}).some(Boolean)) return { ok: false, err: 'equipped' };
        if (state.heroes.length <= 1) return { ok: false, err: 'last' };
        state.party = state.party.filter(u => u !== uid);
        state.heroes = state.heroes.filter(x => x.uid !== uid);
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

    /** 매력이 미는 것 — **레어 확률(%) 하나**다. 상한이 있어 매력만으로 확정에 닿지 않는다 */
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
     * 고른 답이 깎는 고용비(%) — **두 층이다** (ADR-0068).
     *   · 만난 사람의 죄종에 **맞는 답**(`hit_sin`)이면 `meet_hit_pct` — 소문이 죄종을 알려주므로 **읽으면 누구나** 얻는다
     *   · 그 위에 **보낸 영웅이 연 답**(`need_sin ≠ '-'`)이면 `meet_key_pct` — 맞는 사람을 보낸 **준비의 보상**이다
     * 안 맞는 답은 0 이다. **어느 쪽도 벌이 아니다** — 정가가 바닥이고 답은 거기서 깎기만 한다.
     */
    function searchDiscount(meeting, ans) {
        if (!meeting || !ans || ans.hit_sin !== meeting.sin) return 0;
        return ans.need_sin === '-' ? B.tavern_search_meet_hit_pct : B.tavern_search_meet_key_pct;
    }
    const searchCost = pct => Math.round(B.tavern_hire_cost * (100 - pct) / 100);
    const searchMeetAt = startedAt => startedAt + Math.round(searchMs() * B.tavern_search_meet_at_pct / 100);
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
        const tier = rng() * 100 < searchRarePct(snap.cha) ? SEARCH_TIER_HI : SEARCH_TIER_LO;
        const [hero] = H.rollCandidates(rng, 1, [tier]);
        if (rng() * 100 < B.tavern_search_sin_echo_pct && snap.sin) hero.sin = snap.sin;
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
            hours: B.tavern_search_hours, slots: B.tavern_search_slots, cost: B.tavern_hire_cost,
            echoPct: B.tavern_search_sin_echo_pct,
            // 안 나가 있을 때 보낼 수 있는 사람 — **원정 파티만 뺀다**(전투 밖에 쓰러져 있는 영웅이 없다 · §1-1)
            ready: s ? [] : state.heroes.filter(h => !state.party.includes(h.uid)).map(h => h.uid),
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
        if (state.party.includes(uid)) return { ok: false, err: 'party' };
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
     * 조건이 세는 대상 = **파티**(편성). 전술은 파티 단위이므로 벤치는 조건에 안 들어간다.
     * `actives` 는 **스킬 정의**를 넘긴다 — `tactic.contextOf` 의 계약이 정의이고(`tagsOf(def)`),
     * id 문자열을 넘기면 `skill_tag` 조건 4종이 영원히 0 을 센다 (2026-09-01 회귀 수정 · INTERFACE §2-9)
     */
    const partyMembers = state => state.party.map(uid => heroById(state, uid)).filter(Boolean)
        .map(h => ({ sin: h.sin, cls: h.cls, items: heroItems(state, h), actives: SK.activesFor(h, { weaponSkill: weaponSkillOf(state, h) }).map(a => SK.resolve(a)).filter(Boolean) }));

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
    function tacticBonus(state) {
        return TC.bonusOf(tacticState(state).slots.filter(s => s.open && s.active).map(s => s.option));
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
        heroById, heroItems, heroCombat, upgradeState, upgradeItem,
        codexLevel, codexNext, codexMaxLevel, codexBonusAt, codexBonus,
        equipTarget, equip, unequip, salvage, moveToStash, moveToBag, holderOf,
        toggleParty, formationState, setFormation, placeFormation, rankOf,
        stageUnlocked, canDepart, resolveBattle, closeRun, dismissNotice,
        tavernCandidates, tavernState, tavernReroll, hire, dismiss,
        searchState, searchSend, searchTake, searchDrop, searchAnswer,
        masteryState, learnMastery, unlearnMastery, resetMastery,
        tacticState, tacticBonus, rerollTactic, weaponGroupOf, weaponSkillOf,
    };
}
