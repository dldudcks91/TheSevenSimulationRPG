/**
 * 스킬 시스템 — `skill.csv` 정의의 정규화 · 검증 · 배정 · 발동 선택. **실행은 하지 않는다**(battle.js 의 일).
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 정의는 생성자 주입, 시각은 인자(`t`, 초).
 * 이 모듈은 유닛의 HP·버프를 바꾸지 않는다 — 읽기만 한다.
 *
 * **정의는 CSV · 종류는 코드** — `kind`/`target`/`effect_stat`/`cast_condition` 어휘는 아래 고정 사전이고
 *   값은 전부 CSV 다. 미니 DSL 인터프리터를 두지 않는다 (skill_architecture_survey §8-2 · §8-11).
 *
 * skill_design.md / battle_design.md 확정 규칙:
 *   · 배정(프로토타입 §9-0) — `owner_kind=job` 인 그 직업의 행 전부를 `priority` 오름차순으로 준다.
 *     고유·무기군·전직 출처가 생기면 `owner_kind` 어휘와 `activesFor` 하나만 바뀐다
 *   · 발동(battle_design §3) — 준비된 것 중 `readyAt` 최소(가장 오래 기다린 것) → 동률이면 `priority`
 *     → 그래도 동률이면 배열 순. 없으면 기본 공격. **한 차례에 하나**
 *   · 쿨은 실시간 초(battle_design §6) — 전투 시작 시 전부 준비 상태라 첫 차례는 `priority` 로 갈린다
 *   · 발동 조건(§9-3) — 거짓이면 **준비된 것으로 치지 않는다**(쿨은 그대로, 그 차례엔 다른 것이 나간다)
 *   · 태그(skill_design §11) — `tags` 에 직접 적는 10종(최대 2 · `|` 구분) + `target`·`hits` 에서 **파생**되는 3종.
 *     정의·검증만 여기서 하고 **전투 로직은 태그를 읽지 않는다** — 소비자는 전술카드 조건 · 변형 노드 · 화면
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   배정 출처: 고유 스킬 풀·무기군 액티브·전직 액티브 36 미확정 → 지금은 직업 행 전부(프로토타입 §9-0).
 *   전사 ③ 은 기획 미정이라 전사만 2개로 돈다 (skill_design §7).
 *   `status` 컬럼(결빙 등)은 `status_effect.csv` 가 없어 **정규화만 하고 아무도 읽지 않는다** (§9-1 규칙 4).
 */

import { ELEMENTS } from './hero.js';

/** 준비·만료 판정 허용 오차 — 틱 누산(0.1 씩 더한 t)이 `readyAt` 을 미세하게 밑도는 것을 막는다 (INTERFACE §5-3) */
const EPS = 1e-9;

/* ── 어휘 사전 — 이 밖의 값은 로드 시 throw (D1) ── */
// 스킬의 출처 — 지금 발행된 행은 전부 `job` 이다. 전직·무기군·고유가 붙어도 이 어휘와 activesFor 만 바뀐다
const OWNER_KINDS = ['job', 'advance', 'weapon_group', 'unique'];
const KINDS = ['attack', 'heal', 'buff'];
const TARGETS = ['enemy_single', 'enemy_all', 'enemy_rotate', 'enemy_chain', 'self', 'party'];
const EFFECT_STATS = ['atk_pct', 'barrier_pct', 'period_pct', 'taunt'];
const CONDITIONS = ['buff_absent', 'ally_hp_below'];
/**
 * 스킬 태그 13종 — 4 대분류(피해 방식 · 버프 · 디버프 · 기타). skill_design §11 확정 2026-08-28.
 * `TAGS` 만 CSV 의 `tags` 칸에 적는다. `DERIVED_TAGS` 셋은 `target`·`hits` 가 이미 답을 갖고 있어
 *   **칸을 먹지 않는다** — 적으면 두 곳 관리가 되어 반드시 어긋나므로 로드 시 던진다 (§11-2 규칙 2).
 */
const TAGS = ['dot', 'shout', 'blessing', 'boost', 'restore', 'curse', 'control', 'transform', 'summon', 'sacrifice'];
const DERIVED_TAGS = ['aoe', 'single', 'multihit'];
const MAX_TAGS = 2;                   // §11-2 규칙 1 — 세 번째 태그는 변형 노드가 준다
const NONE = '-';                     // CSV 의 "없음" 표기 — 정규화하면 null

/**
 * @param {object} data
 *   balance — balance.csv 를 {key: value} 로 눕힌 것 (지금 읽는 키는 없다 — 계수는 전부 skill.csv 행에 있다)
 *   rows    — skill.csv 파싱 행 배열 (csv.js:parseCsv 결과)
 */
export function createSkillSystem(data) {
    const rows = data.rows ?? [];
    const dash = v => (v === NONE || v === '' || v === undefined || v === null ? null : v);

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
    });

    /** 로드 시 전수 검증 — 어휘 밖 값·종류별 필수값·출처 안 priority 중복은 데이터 오류라 즉시 던진다 (§9-5) */
    function validate(d) {
        const bad = why => { throw new Error(`skill: ${d.id} — ${why}`); };
        if (!d.id) bad('skill_id 가 없다');
        if (!OWNER_KINDS.includes(d.ownerKind)) bad(`owner_kind '${d.ownerKind}'`);
        if (d.ownerId === '' || d.ownerId === undefined || d.ownerId === null) bad('owner_id 가 없다');
        if (!KINDS.includes(d.kind)) bad(`kind '${d.kind}'`);
        if (!TARGETS.includes(d.target)) bad(`target '${d.target}'`);
        if (d.element !== null && !ELEMENTS.includes(d.element)) bad(`element '${d.element}'`);
        if (d.cond !== null && !CONDITIONS.includes(d.cond)) bad(`cast_condition '${d.cond}'`);
        if (!(d.cool > 0)) bad(`cool_sec ${d.cool}`);
        if (d.kind === 'buff') {
            if (d.stat === null || !EFFECT_STATS.includes(d.stat)) bad(`effect_stat '${d.stat}'`);
            if (!(d.dur > 0)) bad(`buff 인데 duration_sec ${d.dur}`);
        } else if (d.stat !== null) {
            bad(`effect_stat 은 buff 만 쓴다 ('${d.stat}')`);
        }
        if (d.kind === 'attack' && !(d.hits >= 1)) bad(`attack 인데 hits ${d.hits}`);
        if (d.kind === 'heal' && !(d.mult > 0)) bad(`heal 인데 mult_pct ${d.mult}`);
        if (d.tags.length > MAX_TAGS) bad(`tags ${d.tags.length}개 — 최대 ${MAX_TAGS} (§11-2 규칙 1)`);
        if (new Set(d.tags).size !== d.tags.length) bad(`tags 중복 '${d.tags.join('|')}'`);
        for (const tg of d.tags) {
            if (DERIVED_TAGS.includes(tg)) bad(`'${tg}' 는 target·hits 에서 파생된다 — tags 에 적지 않는다 (§11-2 규칙 2)`);
            if (!TAGS.includes(tg)) bad(`tag '${tg}'`);
        }
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
    for (const d of list) {
        validate(d);
        d.derived = derivedTagsOf(d);
        if (defs[d.id]) throw new Error(`skill: ${d.id} — skill_id 중복`);
        defs[d.id] = d;
        const owner = `${d.ownerKind}#${d.ownerId}`;
        const key = `${owner}#${d.priority}`;
        if (seen[key]) throw new Error(`skill: ${d.id} — ${owner} 안에서 priority ${d.priority} 가 ${seen[key]} 와 겹친다`);
        seen[key] = d.id;
    }

    /**
     * 배정 — 지금은 **`owner_kind=job` 인 그 직업의 행 전부**를 `priority` 오름차순으로 준다 (프로토타입 §9-0).
     * hero 를 통째로 받는 이유: 고유·무기군·전직 출처가 붙으면 이 함수 안만 바뀌게 하려는 것.
     */
    const activesFor = hero => list
        .filter(d => d.ownerKind === 'job' && d.ownerId === hero?.cls)
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .map(d => d.id);

    /**
     * 발동 조건 (§9-3) — 거짓이면 그 차례엔 준비된 것으로 치지 않는다.
     * @param ctx {self, allies} — allies = 생존 아군 배열(self 포함)
     */
    function castable(def, ctx) {
        if (def.cond === null) return true;
        if (def.cond === 'buff_absent') return !(ctx.self.buffs && ctx.self.buffs[def.id]);
        if (def.cond === 'ally_hp_below')
            return (ctx.allies ?? []).some(a => a.hp > 0 && a.hp / a.hpMax * 100 < def.condValue);
        return true;
    }

    /**
     * 발동 선택 (battle_design §3) — 순수. `actives` 를 변경하지 않고 정렬도 새 배열에서 한다.
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
        // 가장 오래 기다린 것 → 동률이면 우선순위 → 그래도 동률이면 배열 순
        ready.sort((x, y) => (x.a.readyAt - y.a.readyAt) || (x.a.def.priority - y.a.def.priority) || (x.i - y.i));
        return ready[0].a;
    }

    /** 그 스킬이 실제로 갖는 태그 전부 — 파생 먼저, 그다음 정의한 것. 세는 쪽(전술카드·화면)의 유일한 입구 */
    const tagsOf = def => [...(def?.derived ?? []), ...(def?.tags ?? [])];

    return { defs, list, activesFor, castable, pickReady, tagsOf, TAGS, DERIVED_TAGS, MAX_TAGS, EPS };
}
