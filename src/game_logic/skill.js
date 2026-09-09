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
 *   · **1스킬 = 1직업** (§12 확정 2026-09-08) — 스킬은 직업에 귀속되고 직업 사이에 겹치지 않는다.
 *     ~~고유 풀 = 직업 비종속 균등~~(09-01)과 ~~무기군이 스킬의 종류를 정한다~~(§2-1) 둘 다 폐기됐다.
 *     배정은 **출처 셋이 각각 하나씩** 주고(§2) 두 출처(고유 · 무기)가 **같은 직업 풀**에서 온다:
 *     고유는 영웅이 태어날 때 굴린 것(`hero.innate`) · 무기는 **무기 개체가 든 것**(`ctx.weaponSkill`)이다.
 *     총 칸 수는 [balance.csv:active_slots] 에서 자른다
 *   · 발동(battle_design §3) — 준비된 것 중 `readyAt` 최소(가장 오래 기다린 것) → 동률이면 **칸 순서**.
 *     없으면 기본 공격. **한 차례에 하나**
 *   · 쿨은 실시간 초(battle_design §6) — 전투 시작 시 전부 준비 상태라 첫 차례는 **1번 칸**이 나간다
 *   · 발동 조건(§9-3) — 거짓이면 **준비된 것으로 치지 않는다**(쿨은 그대로, 그 차례엔 다른 것이 나간다)
 *   · 태그(skill_design §11) — 어휘·대분류·표시 이름의 SSOT 는 **`skill_tag.csv`**(주입 `tagRows`)다. 직접 적는 것
 *     (`derived=0`)은 최대 2개(`|` 구분)이고 `derived=1` 셋은 `target`·`hits` 에서 **파생**돼 칸을 먹지 않는다.
 *     정의·검증만 여기서 하고 **전투 로직은 태그를 읽지 않는다** — 소비자는 전술카드 조건 · 변형 노드 · 화면
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   배정 출처: **칸은 출처가 정한다** (§2 — 고유 / 무기 / 전직).
 *     · 고유 — 영웅이 생성 시 **제 직업 풀**에서 하나를 굴려 온다(hero.rollInnate · §12-1 규칙 1)
 *     · 무기 — **무기 개체가 든 스킬**(`item.skill`)이다. 그 무기군의 직업 풀에서 드롭 때 굴린 것이고,
 *       무기를 바꾸면 이 칸이 통째로 바뀐다. 출처 id 는 `weapon_group` 을 그대로 쓴다 —
 *       무기군이라는 **어휘는 죽었지만 키는 산다**(R39 와 같은 취급 · 화면 라벨은 이미 「무기」다)
 *     · 전직 — **전직 시스템이 없다**(R16 미반영). 찍은 것이 없으므로 이 칸은 언제나 빈다(R52)
 *   두 출처가 **같은 직업 풀**에서 오므로 고유와 무기가 같은 스킬일 수 있다 — 그때는 앞선 출처만 남아
 *     칸이 하나로 준다. 겹침 처리는 기획 미발행이라 종전 중복 제거 규칙을 그대로 둔다 (§12-1 규칙 3).
 *   **직업 풀 37 이 전부 발행됐다** (2026-09-09 · DEV_PLAN R61) — 다만 다섯은 **근사**다:
 *     오오라(칸 순서 첫 하나를 전투 시작에 자동으로 켠다 — 고르는 화면이 없다) ·
 *     「라운드 종료까지」(창 999초 + 라운드마다 적 배열이 갈리는 것으로 근사) ·
 *     「양 옆의 아군」(`party` 배열의 인접 자리 — 위치 개념은 여전히 미확정) ·
 *     독화살(**도트가 아니라** 원소 추가타 1회 — 틱 피해 채널 미도입) ·
 *     적 공격력 감소(새 채널이 아니라 **음수 버프 창** [사용자 확정 2026-09-09]). 전부 skill_design §7 이 든다.
 *   `status` 컬럼(결빙 등)은 `status_effect.csv` 가 없어 **정규화만 하고 아무도 읽지 않는다** (§9-1 규칙 4).
 */

import { ELEMENTS } from './hero.js';
import { createFormula } from './formula.js';
import {
    KINDS, TARGETS, ATTACK_TARGETS, SUPPORT_TARGETS, DEBUFF_TARGETS, EFFECT_STATS, CONDITIONS, CONDITION_IDS,
} from './skill_effects.js';

/** 준비·만료 판정 허용 오차 — 틱 누산(0.1 씩 더한 t)이 `readyAt` 을 미세하게 밑도는 것을 막는다 (INTERFACE §5-3) */
const EPS = 1e-9;

/* ── 어휘 사전 — 이 밖의 값은 로드 시 throw (D1) ── */
// 스킬은 **직업 · 전직 · 유니크** 셋으로 나뉜다 [사용자 확정 2026-09-09 · skill_design §12].
//   ~~`weapon_group`~~ 은 무기군 고정 폐기(§12-1 규칙 2)로 어휘에서 빠졌다 — 무기는 스킬의 **그릇**이지 출처가 아니다.
//   지금 발행된 행은 전부 `job`(37 중 엔진 어휘로 도는 22) · `advance`·`unique` 는 미발행이다
const OWNER_KINDS = ['job', 'advance', 'unique'];
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
    const F = createFormula(B);      // 실효 쿨 — 화면·검증이 같은 함수를 읽게 한다 (item.js 와 같은 규칙)
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
        // 쿨 — **오오라만 0 이다**(쿨 없이 상시 · §1-5). 나머지는 양수라야 예산 자가 선다
        if (d.kind === 'aura') {
            if (d.cool !== 0) bad(`aura 인데 cool_sec ${d.cool} — 오오라는 쿨이 없다`);
        } else if (!(d.cool > 0)) {
            bad(`cool_sec ${d.cool}`);
        }
        if (d.kind === 'buff' || d.kind === 'aura') {
            if (d.stat === null || !EFFECT_STATS.includes(d.stat)) bad(`effect_stat '${d.stat}'`);
            // 창이냐 상시냐 — buff 는 창(양수 지속), aura 는 창이 아니다(전투 내내 켜져 있다)
            if (d.kind === 'buff' && !(d.dur > 0)) bad(`buff 인데 duration_sec ${d.dur}`);
            if (d.kind === 'aura' && d.dur !== 0) bad(`aura 인데 duration_sec ${d.dur} — 오오라는 창이 아니다`);
        } else if (d.stat !== null) {
            bad(`effect_stat 은 buff·aura 만 쓴다 ('${d.stat}')`);
        }
        // 종류↔대상 짝 — attack 은 적 대상 표에, heal·buff 는 아군 대상에 있어야 한다 (등록표가 곧 어휘)
        if (d.kind === 'attack') {
            if (!ATTACK_TARGETS[d.target]) bad(`attack 인데 target '${d.target}' 는 적 대상이 아니다`);
            if (!(d.hits >= 1)) bad(`attack 인데 hits ${d.hits}`);
            if (!(d.mult > 0)) bad(`attack 인데 mult_pct ${d.mult}`);
            if (d.dur !== 0) bad(`attack 인데 duration_sec ${d.dur} — 창은 buff 만 연다`);
        } else if (d.kind === 'summon') {
            // 소환 — `mult_pct` 는 피해 배율이 아니라 **시전자 최대 HP 의 %**(벽의 HP)다 (§12-6)
            if (d.target !== 'self') bad(`summon 인데 target '${d.target}' — 소환은 시전자 자리에 세운다`);
            if (d.hits !== 0) bad(`summon 인데 hits ${d.hits}`);
            if (!(d.mult > 0)) bad(`summon 인데 mult_pct ${d.mult} — 시전자 최대 HP 의 % 다`);
            if (d.dur !== 0) bad(`summon 인데 duration_sec ${d.dur} — 라운드가 끝날 때 사라진다`);
        } else {
            // **buff 만 적에게 걸 수 있다**(디버프 = 음수 값). heal·aura 는 아군 대상뿐이다
            const okTargets = d.kind === 'buff' ? [...SUPPORT_TARGETS, ...DEBUFF_TARGETS] : SUPPORT_TARGETS;
            if (!okTargets.includes(d.target)) bad(`${d.kind} 인데 target '${d.target}' 는 쓸 수 없다`);
            if (d.hits !== 0) bad(`${d.kind} 인데 hits ${d.hits} — 타수는 attack 만 쓴다`);
            if (d.kind === 'heal' && !(d.mult > 0)) bad(`heal 인데 mult_pct ${d.mult}`);
            if ((d.kind === 'buff' || d.kind === 'aura') && d.mult !== 0) bad(`${d.kind} 인데 mult_pct ${d.mult} — 세기는 effect_value 다`);
        }
        // 광역·연쇄는 **대상 수가 타수를 정한다** — hits 를 따로 적으면 두 곳 관리가 된다 (§9-3).
        //   ⚠ `attack` 에만 건다 — 같은 대상어를 **적에게 거는 창**(참회·속박)도 쓰는데 그쪽은 타수가 0 이다
        if (d.kind === 'attack' && (d.target === 'enemy_all' || d.target === 'enemy_chain') && d.hits !== 1)
            bad(`${d.target} 인데 hits ${d.hits} — 타수는 대상 수가 정한다`);
        // 감쇠 — 두 대상 표가 쓴다. 뜻이 다르다: 연쇄는 **배율**이 줄고, 최고 방어 다단은 **대상의 방어값**이 준다.
        //   100 이면 연쇄는 두 번째부터 0 이고 방어는 한 방에 0 이라 둘 다 어긋난다
        if (d.target === 'enemy_chain' || d.target === 'enemy_highest_def') {
            if (!(d.decay >= 0 && d.decay < 100)) bad(`${d.target} 인데 decay_pct ${d.decay}`);
        } else if (d.decay !== 0) {
            bad(`decay_pct 는 enemy_chain·enemy_highest_def 만 쓴다 (${d.decay})`);
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
        // 피해 태그는 **`attack` 만** 낸다 — 적에게 거는 창(참회·속박)이 `enemy_all` 이라고 광역「피해」는 아니다
        if (d.kind !== 'attack') return out;
        if (d.target === 'enemy_all' || d.target === 'enemy_chain') out.push('aoe');
        if (d.target === 'enemy_single' || d.target === 'enemy_highest_def') out.push('single');
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
     * 배정 — **출처가 칸을 정한다** (§2). 상한 [balance.csv:active_slots].
     * 배정 단위는 id 가 아니라 **인스턴스** `{id, source}` 다 — 같은 스킬이라도 어디서 왔는지가 화면의 입력이고,
     *   변형 노드가 붙으면 칸마다 덧씌울 것이 생긴다(정의 객체는 공유물이라 손대면 안 된다 — `resolve` 참조).
     * hero 를 통째로 받는 이유: 전직 출처가 붙어도 이 함수 안만 바뀌게 하려는 것.
     * @param ctx.weaponSkill 착용 무기 개체가 든 스킬 id — **아이템을 아는 쪽(state.js)이 넘긴다.**
     *        이 모듈은 장비를 모른다. 안 넘기면 그 칸이 빈다(맨손과 구분되지 않는다 — 넘기는 쪽의 책임)
     * @param hero.skillOrder [skillId] — 플레이어가 정한 칸 순서(선택 필드). 지금은 아무도 싣지 않아 기본 순서가 곧 결과다
     */
    const activesFor = (hero, ctx = {}) => {
        // 정의에 없는 id(행이 지워진 옛 세이브)는 **빈 고유 칸**으로 친다 — 던지면 세이브를 못 연다
        const innate = hero?.innate && defs[hero.innate] ? { id: hero.innate, source: 'innate' } : null;
        // 무기 — **무기 개체가 든 스킬**이다 (§12-1 규칙 3). 무기를 바꾸면 이 칸이 바뀌고 맨손이면 빈 칸이다
        const wg = ctx.weaponSkill && defs[ctx.weaponSkill] ? defs[ctx.weaponSkill] : null;
        // **출처가 칸을 정한다** (§2) — 배운 것 중 셋을 고르는 게 아니라 출처가 셋이고 각각 하나씩 준다.
        //   비어 있는 출처는 자리를 남기지 않고 빠진다(전투는 든 것만 돌린다). 어느 출처인지는 `source` 가 말한다
        const base = [
            innate,
            wg ? { id: wg.id, source: 'weapon_group' } : null,
            // 전직 — **찍은 하나뿐이다. 안 찍었으면 이 칸은 비어 있다** [사용자 확정 2026-09-08 · §2].
            //   전직 시스템이 없어(R16 미반영 · 해금 레벨 [balance.csv:advance_unlock_level]) 아무도 못 찍었으므로
            //   **지금은 언제나 빈 칸**이고, 화면은 그 칸을 「전직 전」으로 그린다(`sk.emptyAdvance`).
            //   ~~그 직업 전직 임시분 중 `priority` 최소 하나를 임시로 싣던 것~~(§9-0 08-27~09-08)은 **폐기**했다 —
            //   안 찍은 영웅에게 전직 액티브를 주고 있어서 §2 와 정면으로 어긋났다.
            //   전직이 오면 여기가 「고른 갈래가 준 3 중 찍은 하나」가 된다 (§4-2 B안 — `hero.advance` 를 읽는다).
            null,
        ].filter(Boolean)
            // 같은 스킬이 두 출처에서 와도 앞선 출처만 남긴다 — 출처가 둘뿐인 지금은 안 걸리지만,
            //   전직 칸이 열리면 「자기 직업 갈래의 스킬을 고유로 굴린」 경우가 다시 생긴다
            .filter((a, i, all) => all.findIndex(x => x.id === a.id) === i);
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

    /**
     * 툴팁 미리보기 (SCREEN_DESIGN §4-2 · 2026-09-08) — **화면이 문장을 만들 재료**다.
     * 공식을 렌더러가 다시 적지 않게 여기서 낸다 (DEV_PLAN 부채 #3 을 늘리지 않는다).
     *
     * ⚠ **감소도 치명도 안 태운다** — 방어·저항·피해 감소는 **대상이 정해져야** 나오는 값이라 미리보기가 될 수 없고,
     *   치명은 굴림이다. 그래서 `amount` 는 `formula.strike` 의 **첫 줄**(공격력 × 스킬 배율)까지이고
     *   그 뒤 단계는 전투가 낸다. 툴팁이 약속하는 것은 「내가 때리는 세기」이지 「상대가 받는 피해」가 아니다.
     * ⚠ **버프는 `amount` 가 `null` 이다** — 버프의 세기는 배율이 아니라 `effect_value` 라서 곱할 것이 없다.
     *
     * @param def 스킬 정의 (`defs[id]` 또는 `resolve(inst)`)
     * @param ctx {atk, period} — 모르는 값의 자리는 `null` 로 낸다(화면이 그 조각을 접는다)
     */
    const previewOf = (def, ctx = {}) => {
        if (!def) return null;
        const period = ctx.period > 0 ? ctx.period : null;
        const atk = Number.isFinite(ctx.atk) && ctx.atk > 0 ? ctx.atk : null;
        const everySec = period === null ? null : F.effectiveCd(def.cool, period);
        return {
            baseSec: def.cool,
            everySec,
            // 실효 쿨이 표기보다 얼마나 밀리는가(%) — 0 이면 주기와 정렬이 맞는다
            lossPct: everySec === null ? null : (everySec - def.cool) / def.cool * 100,
            // 한 타 피해(attack) · 회복량(heal). 다단은 **한 타** 값이다 — 총합은 화면이 말하지 않는다
            amount: atk === null || !(def.mult > 0) ? null : Math.round(atk * def.mult / 100),
        };
    };

    return { defs, list, activesFor, resolve, castable, pickReady, tagsOf, previewOf, TAGS, DERIVED_TAGS, MAX_TAGS, EPS };
}
