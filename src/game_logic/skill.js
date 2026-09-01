/**
 * 스킬 시스템 — `skill.csv` 정의의 정규화 · 검증 · 배정 · 발동 선택. **실행은 하지 않는다**(battle.js 의 일).
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 정의는 생성자 주입, 시각은 인자(`t`, 초).
 * 이 모듈은 유닛의 HP·버프를 바꾸지 않는다 — 읽기만 한다.
 *
 * **정의는 CSV · 종류는 코드** — `kind`/`target`/`effect_stat`/`cast_condition` 어휘는 `skill_effects.js`
 *   **등록표의 키**이고 값은 전부 CSV 다. 어휘 배열을 여기 따로 두면 표와 반드시 갈리므로 표를 그대로 읽는다
 *   (종류 하나 = 등록 한 번). 미니 DSL 인터프리터를 두지 않는다 (skill_architecture_survey §8-2 · §8-11).
 *
 * skill_design.md / battle_design.md 확정 규칙:
 *   · 배정(§9-0 개정 2026-09-01) — **고유 칸 1 + 나머지 칸은 직업 행**(`owner_kind=job`)을 `priority`
 *     오름차순으로 채운다. 고유와 같은 id 는 빼고, 총 칸 수는 [balance.csv:active_slots] 에서 자른다.
 *     무기군·전직 출처가 생겨도 `owner_kind` 어휘와 `activesFor` 하나만 바뀐다
 *   · 발동(battle_design §3) — 준비된 것 중 `readyAt` 최소(가장 오래 기다린 것) → 동률이면 **칸 순서**.
 *     없으면 기본 공격. **한 차례에 하나**
 *   · 쿨은 실시간 초(battle_design §6) — 전투 시작 시 전부 준비 상태라 첫 차례는 **1번 칸**이 나간다
 *   · 발동 조건(§9-3) — 거짓이면 **준비된 것으로 치지 않는다**(쿨은 그대로, 그 차례엔 다른 것이 나간다)
 *   · 태그(skill_design §11) — 어휘·대분류·표시 이름의 SSOT 는 **`skill_tag.csv`**(주입 `tagRows`)다. 직접 적는 것
 *     (`derived=0`)은 최대 2개(`|` 구분)이고 `derived=1` 셋은 `target`·`hits` 에서 **파생**돼 칸을 먹지 않는다.
 *     정의·검증만 여기서 하고 **전투 로직은 태그를 읽지 않는다** — 소비자는 전술카드 조건 · 변형 노드 · 화면
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   배정 출처: 고유 칸은 채워졌지만 **고유 전용 행이 아직 없다** — 영웅이 생성 시 skill.csv 전 행에서
 *     하나를 뽑아 온다(hero.rollInnate). 무기군·전직 칸은 그 직업의 액티브가 임시로 메운다 (§9-0).
 *   전사 ③ 은 기획 미정이라 전사만 2개로 돈다 (skill_design §7).
 *   `status` 컬럼(결빙 등)은 `status_effect.csv` 가 없어 **정규화만 하고 아무도 읽지 않는다** (§9-1 규칙 4).
 */

import { ELEMENTS } from './hero.js';
import {
    KINDS, TARGETS, ATTACK_TARGETS, SUPPORT_TARGETS, EFFECT_STATS, CONDITIONS, CONDITION_IDS,
} from './skill_effects.js';

/** 준비·만료 판정 허용 오차 — 틱 누산(0.1 씩 더한 t)이 `readyAt` 을 미세하게 밑도는 것을 막는다 (INTERFACE §5-3) */
const EPS = 1e-9;

/* ── 어휘 사전 — 이 밖의 값은 로드 시 throw (D1) ── */
// 스킬의 출처 — 지금 발행된 행은 전부 `job` 이다. 전직·무기군·고유가 붙어도 이 어휘와 activesFor 만 바뀐다
const OWNER_KINDS = ['job', 'advance', 'weapon_group', 'unique'];
// kind · target · effect_stat · cast_condition 은 skill_effects.js 등록표의 키를 그대로 쓴다 (import 참조)
/**
 * 스킬 태그 — 목록 자체는 `skill_tag.csv`(주입 `tagRows`)가 든다. 여기 남는 것은 **코드가 아는 두 가지**뿐:
 *   `TAG_CATEGORIES` 대분류 4 (skill_design §11) · `DERIVED_TAG_IDS` = `derivedTagsOf` 가 실제로 내는 셋.
 * CSV 의 `derived=1` 집합이 아래 셋과 어긋나면 CSV 가 코드에 없는 태그를 약속하는 것이므로 로드 시 던진다.
 */
const TAG_CATEGORIES = ['damage', 'buff', 'debuff', 'other'];
const DERIVED_TAG_IDS = ['aoe', 'single', 'multihit'];
const MAX_TAGS = 2;                   // §11-2 규칙 1 — 세 번째 태그는 변형 노드가 준다
const NONE = '-';                     // CSV 의 "없음" 표기 — 정규화하면 null

/**
 * @param {object} data
 *   balance — balance.csv 를 {key: value} 로 눕힌 것. `active_slots` 를 읽는다 — 칸 수 상한
 *             (스킬 계수 자체는 전부 skill.csv 행에 있다)
 *   rows    — skill.csv 파싱 행 배열 (csv.js:parseCsv 결과)
 *   tagRows — skill_tag.csv 파싱 행 배열. 태그 어휘의 SSOT — 비면 던진다(태그 없는 스킬 시스템은 없다)
 */
export function createSkillSystem(data) {
    const B = data.balance;
    const rows = data.rows ?? [];
    const dash = v => (v === NONE || v === '' || v === undefined || v === null ? null : v);

    /* ── 태그 어휘 — `skill_tag.csv` 가 SSOT (skill_design §11) ── */
    const tagRows = data.tagRows ?? [];
    if (tagRows.length === 0) throw new Error('skill_tag: 행이 없다 — 태그 어휘의 SSOT 가 비면 tags 검증이 통과만 한다');
    const TAGS = [];                  // `tags` 칸에 직접 적는 것 (derived=0)
    const DERIVED_TAGS = [];          // target·hits 가 내는 것 (derived=1) — 적으면 두 곳 관리다 (§11-2 규칙 2)
    const seenTag = {};
    for (const r of tagRows) {
        const badTag = why => { throw new Error(`skill_tag: ${r.tag_id} — ${why}`); };
        if (!r.tag_id) throw new Error('skill_tag: tag_id 가 없는 행이 있다');
        if (seenTag[r.tag_id]) badTag('tag_id 중복');
        seenTag[r.tag_id] = true;
        if (!TAG_CATEGORIES.includes(r.category)) badTag(`category '${r.category}'`);
        if (r.derived !== 0 && r.derived !== 1) badTag(`derived '${r.derived}' — 0 또는 1`);
        (r.derived === 1 ? DERIVED_TAGS : TAGS).push(r.tag_id);
    }
    // 파생 집합은 `derivedTagsOf` 가 내는 셋과 **정확히** 같아야 한다 — 어긋나면 CSV 가 없는 태그를 약속한다
    if (DERIVED_TAGS.slice().sort().join('|') !== DERIVED_TAG_IDS.slice().sort().join('|'))
        throw new Error(`skill_tag: derived=1 이 [${DERIVED_TAGS}] 인데 derivedTagsOf 는 [${DERIVED_TAG_IDS}] 를 낸다`);

    /** 정의 1행 정규화 — %는 CSV 의 숫자 그대로 두고(코드에서 /100), 없음은 null */
    const normalize = row => ({
        id: row.skill_id,
        ownerKind: row.owner_kind,
        ownerId: row.owner_id,
        kind: row.kind,
        target: row.target,
        hits: row.hits,
        mult: row.mult_pct,
        decay: row.decay_pct,
        cool: row.cool_sec,
        dur: row.duration_sec,
        element: dash(row.element),
        stat: dash(row.effect_stat),
        value: row.effect_value,
        cond: dash(row.cast_condition),
        condValue: row.cond_value,
        status: dash(row.status),
        tags: dash(row.tags) === null ? [] : String(row.tags).split('|').map(v => v.trim()).filter(Boolean),
        priority: row.priority,
        name: { ko: row.name_kr, en: row.name_en },
        // 화면이 읽는 것 — 아이콘·설명도 CSV 가 SSOT 다 (2026-09-01 `mock.js:SKILL_DISPLAY` 폐지)
        icon: String(row.icon ?? ''),
        desc: { ko: row.desc_kr, en: row.desc_en },
        // 고유 스킬 후보 풀에 들어가는가 (hero.rollInnate 가 받는 목록 · §9-0). `note` 는 설계 노트라 화면에 안 나간다
        innatePool: row.innate_pool === 1,
        note: row.note,
    });

    /**
     * 로드 시 전수 검증 — 어휘 밖 값·종류별 필수값·출처 안 priority 중복은 데이터 오류라 즉시 던진다 (§9-5).
     * @param row 원시 행 — 정규화가 삼켜 버리는 값(`innate_pool` 의 0/1 여부)을 여기서 본다
     */
    function validate(d, row) {
        const bad = why => { throw new Error(`skill: ${d.id} — ${why}`); };
        if (!d.id) bad('skill_id 가 없다');
        if (!OWNER_KINDS.includes(d.ownerKind)) bad(`owner_kind '${d.ownerKind}'`);
        if (d.ownerId === '' || d.ownerId === undefined || d.ownerId === null) bad('owner_id 가 없다');
        if (!KINDS.includes(d.kind)) bad(`kind '${d.kind}'`);
        if (!TARGETS.includes(d.target)) bad(`target '${d.target}'`);
        if (d.element !== null && !ELEMENTS.includes(d.element)) bad(`element '${d.element}'`);
        if (d.cond !== null && !CONDITION_IDS.includes(d.cond)) bad(`cast_condition '${d.cond}'`);
        if (!(d.cool > 0)) bad(`cool_sec ${d.cool}`);
        if (d.kind === 'buff') {
            if (d.stat === null || !EFFECT_STATS.includes(d.stat)) bad(`effect_stat '${d.stat}'`);
            if (!(d.dur > 0)) bad(`buff 인데 duration_sec ${d.dur}`);
        } else if (d.stat !== null) {
            bad(`effect_stat 은 buff 만 쓴다 ('${d.stat}')`);
        }
        // 종류↔대상 짝 — attack 은 적 대상 표에, heal·buff 는 아군 대상에 있어야 한다 (등록표가 곧 어휘)
        if (d.kind === 'attack') {
            if (!ATTACK_TARGETS[d.target]) bad(`attack 인데 target '${d.target}' 는 적 대상이 아니다`);
            if (!(d.hits >= 1)) bad(`attack 인데 hits ${d.hits}`);
            if (!(d.mult > 0)) bad(`attack 인데 mult_pct ${d.mult}`);
            if (d.dur !== 0) bad(`attack 인데 duration_sec ${d.dur} — 창은 buff 만 연다`);
        } else {
            if (!SUPPORT_TARGETS.includes(d.target)) bad(`${d.kind} 인데 target '${d.target}' 는 아군 대상이 아니다`);
            if (d.hits !== 0) bad(`${d.kind} 인데 hits ${d.hits} — 타수는 attack 만 쓴다`);
            if (d.kind === 'heal' && !(d.mult > 0)) bad(`heal 인데 mult_pct ${d.mult}`);
            if (d.kind === 'buff' && d.mult !== 0) bad(`buff 인데 mult_pct ${d.mult} — 버프의 세기는 effect_value 다`);
        }
        // 광역·연쇄는 **대상 수가 타수를 정한다** — hits 를 따로 적으면 두 곳 관리가 된다 (§9-3)
        if ((d.target === 'enemy_all' || d.target === 'enemy_chain') && d.hits !== 1)
            bad(`${d.target} 인데 hits ${d.hits} — 타수는 대상 수가 정한다`);
        // 감쇠는 연쇄 전용. 100 이면 두 번째 대상부터 0 이라 연쇄가 아니다
        if (d.target === 'enemy_chain') {
            if (!(d.decay >= 0 && d.decay < 100)) bad(`enemy_chain 인데 decay_pct ${d.decay}`);
        } else if (d.decay !== 0) {
            bad(`decay_pct 는 enemy_chain 만 쓴다 (${d.decay})`);
        }
        // 조건값은 조건이 있을 때만 — ally_hp_below 는 HP 비율(%)이라 0 초과 100 이하다
        if (d.cond === 'ally_hp_below') {
            if (!(d.condValue > 0 && d.condValue <= 100)) bad(`ally_hp_below 인데 cond_value ${d.condValue}`);
        } else if (d.condValue !== 0) {
            bad(`cond_value 는 ally_hp_below 만 쓴다 (${d.condValue})`);
        }
        if (d.tags.length > MAX_TAGS) bad(`tags ${d.tags.length}개 — 최대 ${MAX_TAGS} (§11-2 규칙 1)`);
        if (new Set(d.tags).size !== d.tags.length) bad(`tags 중복 '${d.tags.join('|')}'`);
        for (const tg of d.tags) {
            if (DERIVED_TAGS.includes(tg)) bad(`'${tg}' 는 target·hits 에서 파생된다 — tags 에 적지 않는다 (§11-2 규칙 2)`);
            if (!TAGS.includes(tg)) bad(`tag '${tg}'`);
        }
        // 표시 컬럼 — 화면은 이제 CSV 만 읽으므로 비면 빈 칸·빈 툴팁이 그대로 그려진다 (mock 표시 사전 폐지)
        if (row.innate_pool !== 0 && row.innate_pool !== 1) bad(`innate_pool ${row.innate_pool} — 0 또는 1`);
        if (d.icon === '') bad('icon 이 비었다');
        if (!d.desc.ko || !d.desc.en) bad('desc_kr·desc_en 이 비었다');
    }

    /**
     * 파생 태그 — `target`·`hits` 가 곧 답이다.
     * `enemy_rotate`(순환)는 타수만큼만 닿으므로 **광역으로 세지 않는다** (§11-2 규칙 3) — 단일도 아니다.
     */
    function derivedTagsOf(d) {
        const out = [];
        if (d.target === 'enemy_all' || d.target === 'enemy_chain') out.push('aoe');
        if (d.target === 'enemy_single') out.push('single');
        if (d.hits > 1) out.push('multihit');
        return out;
    }

    const list = rows.map(normalize);
    const defs = {};
    const seen = {};                  // 출처(owner_kind#owner_id) 별 priority 중복 검출
    list.forEach((d, i) => {
        validate(d, rows[i]);
        d.derived = derivedTagsOf(d);
        if (defs[d.id]) throw new Error(`skill: ${d.id} — skill_id 중복`);
        defs[d.id] = d;
        const owner = `${d.ownerKind}#${d.ownerId}`;
        const key = `${owner}#${d.priority}`;
        if (seen[key]) throw new Error(`skill: ${d.id} — ${owner} 안에서 priority ${d.priority} 가 ${seen[key]} 와 겹친다`);
        seen[key] = d.id;
    });

    /**
     * 배정 — **고유 칸 1 + 나머지 칸은 직업 행**(`priority` 오름차순) · 상한 [balance.csv:active_slots]
     *   (§9-0 개정 2026-09-01). 고유와 같은 id 는 빼서 한 스킬이 두 칸을 먹지 않게 한다.
     * 배정 단위는 id 가 아니라 **인스턴스** `{id, source}` 다 — 같은 스킬이라도 어디서 왔는지가 화면의 입력이고,
     *   변형 노드가 붙으면 칸마다 덧씌울 것이 생긴다(정의 객체는 공유물이라 손대면 안 된다 — `resolve` 참조).
     * hero 를 통째로 받는 이유: 무기군·전직 출처가 붙어도 이 함수 안만 바뀌게 하려는 것.
     * @param hero.skillOrder [skillId] — 플레이어가 정한 칸 순서(선택 필드). 지금은 아무도 싣지 않아 기본 순서가 곧 결과다
     */
    const activesFor = hero => {
        const jobs = list
            .filter(d => d.ownerKind === 'job' && d.ownerId === hero?.cls)
            .slice()
            .sort((a, b) => a.priority - b.priority)
            .map(d => ({ id: d.id, source: 'job' }));
        // 정의에 없는 id(행이 지워진 옛 세이브)는 **빈 고유 칸**으로 친다 — 던지면 세이브를 못 연다
        const innate = hero?.innate && defs[hero.innate] ? [{ id: hero.innate, source: 'innate' }] : [];
        const base = [...innate, ...jobs.filter(a => a.id !== innate[0]?.id)];
        const order = hero?.skillOrder ?? null;
        if (!order) return base.slice(0, B.active_slots);
        // 플레이어가 고른 순서를 앞에 — 목록에 없는 id·중복은 무시하고, 안 적힌 것은 기본 순서대로 뒤에 붙는다
        const front = [];
        for (const id of order) {
            const a = base.find(x => x.id === id);
            if (a && !front.includes(a)) front.push(a);
        }
        return [...front, ...base.filter(a => !front.includes(a))].slice(0, B.active_slots);
    };

    /**
     * 배정 인스턴스 → 정의. 정의에 없는 id(행이 지워진 옛 세이브)는 `null` 이다 — 던지면 세이브를 못 연다.
     * ⚠ 변형 노드가 오면 `active.override` 를 **여기서** 덧씌운다 — 배정 단위가 id 가 아니라 인스턴스인 이유다.
     */
    const resolve = active => defs[active?.id] ?? null;

    /**
     * 발동 조건 (§9-3) — 거짓이면 그 차례엔 준비된 것으로 치지 않는다. 판정 자체는 등록표가 든다.
     * @param ctx {self, allies} — allies = 생존 아군 배열(self 포함)
     */
    const castable = (def, ctx) => (def.cond === null ? true : CONDITIONS[def.cond](def, ctx));

    /**
     * 발동 선택 (battle_design §3) — 순수. `actives` 를 변경하지 않고 정렬도 새 배열에서 한다.
     * 동률은 **칸 순서**다 — 우선순위는 플레이어가 정하는 값(battle_design §5 · skill_design §2)이고
     *   `skill.csv:priority` 는 **직업 행의 기본 정렬**에만 쓴다(`activesFor`). 여기서 다시 읽으면
     *   플레이어가 칸을 바꿔도 발동 순서가 안 바뀌어 칸 순서가 죽은 값이 된다.
     * @param actives [{id, def, readyAt}] — 유닛이 들고 있는 슬롯
     * @param t 현재 시각(초)
     * @param isCastable (active) → bool — 발동 조건 판정 콜백(유닛 상태는 호출자가 안다)
     */
    function pickReady(actives, t, isCastable) {
        const ready = [];
        (actives ?? []).forEach((a, i) => {
            if (a.readyAt > t + EPS) return;                       // 쿨이 안 돌았다
            if (isCastable && !isCastable(a)) return;              // 조건 거짓 = 준비 아님 (쿨은 그대로)
            ready.push({ a, i });
        });
        if (ready.length === 0) return null;
        // 가장 오래 기다린 것 → 동률이면 칸 순서(앞칸이 먼저)
        ready.sort((x, y) => (x.a.readyAt - y.a.readyAt) || (x.i - y.i));
        return ready[0].a;
    }

    /** 그 스킬이 실제로 갖는 태그 전부 — 파생 먼저, 그다음 정의한 것. 세는 쪽(전술카드·화면)의 유일한 입구 */
    const tagsOf = def => [...(def?.derived ?? []), ...(def?.tags ?? [])];

    return { defs, list, activesFor, resolve, castable, pickReady, tagsOf, TAGS, DERIVED_TAGS, MAX_TAGS, EPS };
}
