/**
 * 파티 전술 — 칸마다 **죄종 옵션** 하나가 든다. **획득물이 아니다** (tactic_card_design §5 확정 2026-08-30):
 *   칸은 **지휘 천막 랭크**로 하나씩 열리고(로스터 합산 레벨은 그 랭크의 문턱 · 2026-09-22 · R137), 칸에 든 옵션은 **재화로 리롤**한다. 카드를 줍는 파밍 축이 없다.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 난수는 인자(`rng`), 정의는 생성자 주입.
 * 이 모듈은 상태를 들지 않는다 — 어느 칸에 무엇이 들었는지 · 어느 칸을 잠갔는지는 세이브(`state.presets[*].tactics` — 편성마다 · v34 · 잠금 v35)가 들고, 여기는 규칙만 낸다.
 *
 * **정의는 CSV · 종류는 코드** — 조건의 `test` 어휘는 아래 고정 사전이고 값(문턱 · 기준값 · 배수)은 전부 CSV 다.
 *   미니 DSL 을 두지 않는다 (skill.js 와 같은 규약).
 *
 * **죄종 옵션** [2026-11-11 · R441 · tactic_card_design §5-14] — 표가 셋이다:
 *   `tactic_option.csv` (1행 = 가족 하나 = 죄종 + 효과 + 능력치 + 기준값 · 같은 효과의 여러 행 = 변형) ·
 *   `tactic_condition.csv` (조건 사전 — 무엇을 세나 · 단계 문턱 셋) · `tactic_slot.csv` (칸마다 조건 하나 — 칸 = 상황 · §5-9).
 *   효과는 **모든 칸이 같은 풀**이다. 굴림 = 죄종(균등) → 그 죄종의 효과(균등) → 변형(균등) → 등급(가중).
 *   값 = 기준값 × (1 + 몫 × (등급 배수 × 단계 − 1)) · 단계 = 칸 조건이 넘은 문턱 수(0 이면 꺼짐) ·
 *   적용 값 = 값 × (1 + 리더 몫 + 그 죄종 장비 몫) (§5-10 · §5-14 「장비 죄종 버프」).
 *   ~~`tactic_score.csv`(점수 × 등급 배수) · 칸 종류(`category`) · 「같은 옵션 두 칸 금지」~~ 는 2026-11-11 걷었다.
 *
 * tactic_card_design.md 확정 규칙:
 *   · 조건은 **편성 시점에 확정되는 것만** (§2-1) — 현재 HP·남은 적 수 같은 전투 중 값은 세지 않는다.
 *   · 효과는 **기존 공식의 항**으로 들어간다 (§2-4) — 마스터리·접사와 같은 채널이고 새 곱셈 층을 만들지 않는다.
 *     피해 감소만 따로 낸다 (원천별 곱 — battle_design §9-3)
 *   · 효과는 **파티에만** 걸린다 (§1) — 벤치 영웅에게는 안 붙는다. 그 판정은 state.js 가 한다
 *   · 첫 배정 · 리롤 · 직전 옵션 제외의 단위는 **가족(옵션 하나)**이다 — 등급은 값만 가른다(§5-5).
 *     **같은 가족이 두 칸에 서도 된다 — 값이 더해진다**(§5-14)
 */

/**
 * @param {object} data
 *   slots        — tactic_slot.csv 파싱 행 (칸 수 = 행 수 · 칸마다 조건 하나 · 여는 것은 건설 표 — 지휘 천막)
 *   conditions   — tactic_condition.csv 파싱 행 (조건 사전 — 1행 = 조건 하나 · 단계 문턱 셋)
 *   options      — tactic_option.csv 파싱 행 (1행 = 가족 하나 = 죄종 + 효과 + 능력치 + 기준값 + 배수 몫 + 리더 몫)
 *   sins         — 죄종 id 목록 — **이 순서가 굴림의 죄종 순서**다
 *   gradeWeights — {common, magic, rare} 상대 가중치 (balance.csv:tactic_grade_weight_*) — 리롤의 등급 추첨
 *   gradeMult    — {common, magic, rare} 등급 배수 (balance.csv:tactic_grade_mult_*) — 값의 등급 항 (§5-14)
 *   gearPct      — 장비 죄종 하나의 버프 몫 (balance.csv:tactic_sin_gear_pct) (§5-14 「장비 죄종 버프」)
 *   rerollCost   — {base, lockMult} (balance.csv:tactic_reroll_base_cost · tactic_reroll_lock_mult) — 전체 리롤 비용 (§5-6)
 *   leader       — {pivot, min, max, multMin, multMax} (balance.csv:attr_dmg_pivot · hero_attr_min · hero_attr_max · tactic_leader_mult_min · _max) — 리더 보너스 (§5-10)
 */
export function createTacticSystem(data) {
    const NONE = '-';
    const dash = v => (v === NONE || v === '' || v === undefined || v === null ? null : v);
    /** 등급 어휘 — **이 배열 순서가 계약이다** (INTERFACE §5-3): 가중 추첨이 이 순서로 훑는다 */
    const GRADES = ['common', 'magic', 'rare'];
    const BASE_GRADE = GRADES[0];   // 첫 배정은 언제나 여기 (§5-5 「첫 배정은 일반 고정」)
    /** 죄종 — 굴림의 첫 단계가 이 순서에서 균등하게 뽑는다 (INTERFACE §5-2) */
    const SINS = (data.sins ?? []).slice();
    if (!SINS.length) throw new Error('tactic: 죄종 목록이 비었다 (sins)');

    /**
     * 조건 어휘(`tactic_condition.csv:test`) — 이 밖의 값은 로드 시 throw. `count` 가 파티 문맥에서 숫자를 하나 뽑고,
     * **단계 = 그 숫자가 넘은 문턱 수**다(0 ~ 3 · 0 이면 꺼짐). `none` 은 세지 않고 언제나 단계 1 이다.
     * 전부 편성에서 확정되는 값이다 (§2-1) [2026-11-11 · R441 · §5-14 「랭크 조건」 — ~~점수 · 있으면/없으면 · 종류 다섯~~]
     */
    const TESTS = {
        none: { count: () => null },                                                 // 조건 없음 — 1 · 3 · 4랭크
        slot_sin_heroes: { count: (c, o) => c.sins.filter(s => s === o.sin).length }, // 그 칸 죄종의 영웅 수 — 2랭크
        kills_together: { count: c => c.kills },                                     // 지금 이 셋이 함께 잡은 몬스터 수 — 5랭크 (state.killsTogether)
    };

    /* ── 조건 사전 (tactic_condition.csv) ── */

    const condById = {};
    for (const row of data.conditions ?? []) {
        const id = row.cond_id;
        const bad = why => { throw new Error(`tactic: 조건 ${id} — ${why}`); };
        if (!id) bad('cond_id 가 없다');
        if (condById[id]) bad('cond_id 가 두 번 나온다');
        if (!TESTS[row.test]) bad(`test '${row.test}' — 어휘는 ${Object.keys(TESTS).join('/')}`);
        const raw = [row.step1, row.step2, row.step3].map(dash);
        let steps = [];
        if (row.test === 'none') {
            if (raw.some(v => v !== null)) bad('조건 없음은 문턱을 안 받는다 — step1 ~ step3 은 셋 다 -');
        } else {
            if (raw.some(v => !(Number.isInteger(v) && v >= 1))) bad(`문턱 ${raw.join('/')} — 1 이상 정수 셋`);
            // 단계 = 넘은 문턱 수 — 문턱이 오름차순이 아니면 「위 단계가 더 쉽다」가 된다
            for (let i = 1; i < raw.length; i++) if (!(raw[i] > raw[i - 1])) bad(`문턱 ${raw.join('/')} — 오름차순이어야 한다`);
            steps = raw;
        }
        condById[id] = { id, test: row.test, steps };
    }

    /* ── 칸 (tactic_slot.csv) ── */

    const slotList = (data.slots ?? []).slice().sort((a, b) => a.slot_no - b.slot_no).map((row, i) => {
        const no = row.slot_no;
        if (no !== i + 1) throw new Error(`tactic: slot_no 는 1부터 빈틈없이 — ${no} (${i + 1} 자리)`);
        // 이 표는 칸 **수**와 **칸마다의 조건**만 든다 — 몇 칸이 열렸나는 `state.tacticState` 가 `limitsOf` 로 센다(지휘 천막 · R137) ·
        //   비용은 칸이 아니라 잠근 칸 수가 정한다(§5-6). **칸 = 상황** [2026-09-27 · §5-9] — 칸마다 조건이 고정이고 효과 풀은 모든 칸이 같다(§5-14)
        const cond = condById[row.cond_id];
        if (!cond) throw new Error(`tactic: 칸 ${no} cond_id '${row.cond_id}' — tactic_condition.csv 에 없다`);
        return { no, condId: cond.id, condKind: cond.test, steps: cond.steps.slice() };
    });
    const slotCount = slotList.length;
    /** 칸 없이 편 옵션의 조건 — 조건 없음(언제나 단계 1) */
    const NO_COND = { condId: null, condKind: 'none', steps: [] };

    /* ── 리더 보너스 (balance.csv:tactic_leader_mult_* — 2026-10-24 · R340 · §5-10) ── */

    const LD = data.leader ?? {};
    if (![LD.pivot, LD.min, LD.max].every(Number.isFinite) || !(LD.min < LD.pivot && LD.pivot < LD.max))
        throw new Error(`tactic: 리더 통솔 범위 ${LD.min} < 기준 ${LD.pivot} < ${LD.max} 가 아니다 (balance.csv:hero_attr_min · attr_dmg_pivot · hero_attr_max)`);
    // 최소 쪽이 1 을 넘거나 최대 쪽이 1 밑이면 통솔이 높을수록 약해진다 — 곡선이 뒤집힌다
    if (!(LD.multMin > 0 && LD.multMin <= 1 && LD.multMax >= 1))
        throw new Error(`tactic: 리더 배수 ${LD.multMin} ~ ${LD.multMax} — 0 < 최소 ≤ 1 ≤ 최대 (balance.csv:tactic_leader_mult_min · _max)`);
    /**
     * 리더 곡선 — 리더(편성 첫 칸)의 통솔을 [최소, 최대]로 자르고 **기준 아래는 최소 배수까지 · 위는 최대 배수까지 직선** [2026-10-24 사용자
     *   「통솔 10을 기준으로 10보다 낮으면 감소해서 1이면 50%, 20이면 2배」]. 기준에서 1 · 리더가 없거나 통솔을 모르면 1
     */
    const leadCurve = ldr => {
        if (!Number.isFinite(ldr)) return 1;
        const v = Math.min(LD.max, Math.max(LD.min, ldr));
        return v >= LD.pivot
            ? 1 + (LD.multMax - 1) * (v - LD.pivot) / (LD.max - LD.pivot)
            : 1 - (1 - LD.multMin) * (LD.pivot - v) / (LD.pivot - LD.min);
    };

    /* ── 등급 배수 · 장비 죄종 몫 (balance.csv — 2026-11-11 · R441 · §5-14) ── */

    const gradeMult = Object.fromEntries(GRADES.map(g => {
        const m = data.gradeMult?.[g];
        if (typeof m !== 'number' || !(m > 0)) throw new Error(`tactic: 등급 배수 '${g}' 가 없다 (balance.csv:tactic_grade_mult_${g})`);
        return [g, m];
    }));
    // 등급이 오르면 값이 커진다 (§5-5) — 일반 < 매직 < 레어
    for (let i = 1; i < GRADES.length; i++)
        if (!(gradeMult[GRADES[i]] > gradeMult[GRADES[i - 1]])) throw new Error(`tactic: 등급 배수 ${GRADES[i]} ${gradeMult[GRADES[i]]} 가 ${GRADES[i - 1]} ${gradeMult[GRADES[i - 1]]} 보다 크지 않다`);
    const gearPct = data.gearPct;
    if (typeof gearPct !== 'number' || !(gearPct >= 0)) throw new Error('tactic: 장비 죄종 몫이 없다 (balance.csv:tactic_sin_gear_pct)');

    /* ── 옵션 (tactic_option.csv — 1행 = 가족 하나) ── */

    /** 고정값 채널(`_flat`)은 정수, 나머지는 비율이라 부동소수 꼬리만 자른다 */
    const round = (stat, v) => (stat.endsWith('_flat') ? Math.round(v) : Math.round(v * 1e4) / 1e4);
    /** 값 = 기준값 × (1 + 몫 × (등급 배수 × 단계 − 1)) — 몫 1 이면 기준값 × 등급 배수 × 단계 (§5-14 · 피해 감소만 몫이 1 밑) */
    const valueAt = (o, step) => round(o.stat, o.unit * (1 + o.multShare * (gradeMult[o.grade] * step - 1)));

    const families = [];
    const famById = {};
    /** 죄종마다 효과 목록 `[{effect, ids}]` — 효과 · 변형의 순서 = 행 순서(굴림 순서라 계약이다) */
    const effectsBySin = Object.fromEntries(SINS.map(s => [s, []]));
    for (const row of data.options ?? []) {
        const id = row.option_id;
        const bad = why => { throw new Error(`tactic: ${id} — ${why}`); };
        if (!id) bad('option_id 가 없다');
        if (famById[id]) bad('option_id 가 두 번 나온다');
        if (!SINS.includes(row.sin)) bad(`죄종 '${row.sin}' — 어휘는 ${SINS.join('/')}`);
        if (!row.effect) bad('effect 가 없다');
        if (!row.stat) bad('stat 이 없다');
        if (typeof row.unit !== 'number' || !(row.unit > 0)) bad(`unit ${row.unit} — 기준값은 양수`);
        // 배수 받는 몫 — 1 = 등급 × 단계를 전부 · 0 = 안 받음. 원천별 곱(피해 감소)처럼 일률 배수에서 터지는 채널만 1 밑이다 (§5-5 · §5-14)
        const share = row.mult_share;
        if (typeof share !== 'number' || !(share >= 0 && share <= 1)) bad(`mult_share ${share} — 0 ~ 1 (tactic_option.csv)`);
        // 리더 곡선을 받는 몫 — 1 = 전부 · 0 = 안 받음 · 통솔 최소에서도 값이 0 보다 커야 한다
        const lb = row.leader_bonus;
        if (typeof lb !== 'number' || !(lb >= 0)) bad(`leader_bonus ${lb} — 0 이상 (tactic_option.csv)`);
        if (!(1 + lb * (LD.multMin - 1) > 0)) bad(`leader_bonus ${lb} — 통솔 최소에서 값이 0 이하가 된다`);
        const list = effectsBySin[row.sin];
        let eff = list.find(e => e.effect === row.effect);
        // 같은 효과의 변형은 붙여 둔다 — 떨어져 있으면 행 순서로 읽는 효과 순서가 두 갈래가 된다
        if (eff && list[list.length - 1] !== eff) bad(`effect '${row.effect}' 의 행이 떨어져 있다 — 같은 효과의 변형은 붙여 둔다`);
        if (!eff) list.push(eff = { effect: row.effect, ids: [] });
        eff.ids.push(id);
        const fam = { id, sin: row.sin, effect: row.effect, stat: row.stat, unit: row.unit, multShare: share, leaderBonus: lb };
        // 등급별 **단계 1 값** — 화면 · 검증용. 반올림 뒤에도 등급 순으로 커져야 한다(고정값 채널은 기준값이 작으면 같은 정수로 뭉칠 수 있다)
        fam.grades = Object.fromEntries(GRADES.map(g => [g, valueAt({ ...fam, grade: g }, 1)]));
        for (let i = 1; i < GRADES.length; i++)
            if (!(fam.grades[GRADES[i]] > fam.grades[GRADES[i - 1]])) bad(`${GRADES[i]} ${fam.grades[GRADES[i]]} 가 ${GRADES[i - 1]} ${fam.grades[GRADES[i - 1]]} 보다 크지 않다 — 기준값이 너무 작다`);
        families.push(fam);
        famById[id] = fam;
    }
    const familyIds = families.map(f => f.id);
    // 죄종마다 효과가 둘 이상 — 리롤의 직전 제외는 효과 단계에서 「변형이 직전 가족 하나뿐인 효과」를 빼므로, 하나뿐이면 후보가 빈다 (§5-6 · INTERFACE §5-2)
    for (const s of SINS)
        if (effectsBySin[s].length < 2) throw new Error(`tactic: 죄종 ${s} 의 효과가 ${effectsBySin[s].length}개 — 둘 이상이어야 한다 (tactic_option.csv · 리롤의 직전 제외)`);

    /** 등급 가중치 — 값은 CSV. 하나라도 빠지거나 음수면 리롤이 조용히 한쪽으로 쏠리므로 로드 시 막는다 */
    const gradeWeights = GRADES.map(g => {
        const w = data.gradeWeights?.[g];
        if (typeof w !== 'number' || !(w >= 0)) throw new Error(`tactic: 등급 가중치 '${g}' 가 없다 (balance.csv:tactic_grade_weight_${g})`);
        return w;
    });
    const weightSum = gradeWeights.reduce((a, w) => a + w, 0);
    if (!(weightSum > 0)) throw new Error('tactic: 등급 가중치 합이 0 — 뽑을 등급이 없다');

    /** 전체 리롤 비용 — 기본가 × 배수 ^ 잠근 칸 수 (§5-6 확정 2026-09-22 — 가파른 곱). 값은 CSV */
    const costBase = data.rerollCost?.base, lockMult = data.rerollCost?.lockMult;
    if (typeof costBase !== 'number' || !(costBase >= 0)) throw new Error('tactic: 리롤 기본가가 없다 (balance.csv:tactic_reroll_base_cost)');
    // 배수가 1 밑이면 잠글수록 싸진다 — 「지킬수록 비싸다」(§5-6)가 뒤집힌다
    if (typeof lockMult !== 'number' || !(lockMult >= 1)) throw new Error('tactic: 잠금 배수가 없거나 1 미만 (balance.csv:tactic_reroll_lock_mult)');
    const rerollCost = lockedCount => Math.round(costBase * lockMult ** lockedCount);

    /**
     * 칸이 든 `{id, grade}` 한 쌍 → 옵션 하나. 조건은 **그 칸**(`slotNo`)의 것을 싣는다 — 원정 스냅숏이 칸 없이도 다시 잴 수 있게.
     * 칸을 안 주면 조건 없음 · 없는 가족 · 없는 등급이면 `null` (CSV 가 바뀐 세이브)
     */
    function optionOf(ref, slotNo = null) {
        const fam = ref && famById[ref.id];
        if (!fam || !GRADES.includes(ref.grade)) return null;
        const c = (slotNo == null ? null : slotList[slotNo - 1]) ?? NO_COND;
        return {
            id: fam.id, grade: ref.grade, sin: fam.sin, effect: fam.effect, stat: fam.stat, unit: fam.unit,
            multShare: fam.multShare, leaderBonus: fam.leaderBonus, value: fam.grades[ref.grade],
            condId: c.condId, condKind: c.condKind, steps: c.steps.slice(),
        };
    }

    /* ── 판정 ── */

    /**
     * 파티 문맥 — 조건 · 버프가 세는 숫자를 **한 번에** 뽑아 둔다. 칸마다 파티를 다시 훑지 않는다.
     * members = [{sin, cls, ldr, gear}] **편성 순서대로**(첫 칸이 리더) · `gear` = 그 영웅이 낀 장비의 죄종 목록(이름의 첫째 · 둘째 둘 다 · 유니크는 없다) ·
     * `extra.kills` = 이 셋이 함께 잡은 몬스터 수(state.killsTogether). 모으는 것은 state.js, 세는 규칙은 여기.
     */
    function contextOf(members, extra = {}) {
        const gear = Object.fromEntries(SINS.map(s => [s, 0]));
        const ctx = { size: members.length, members, sins: [], leader: members[0] ?? null, kills: extra.kills ?? 0, gear };
        for (const m of members) {
            ctx.sins.push(m.sin);
            for (const s of m.gear ?? []) if (s in gear) gear[s] += 1;
        }
        return ctx;
    }

    /**
     * 칸 하나를 잰다 — 조건 카운터 · 단계 · 값 · 버프 몫 (화면이 「지금 / 다음 문턱」 · ×단계 · 버프 몫을 찍는다 — §4 「안 보이면 함정」).
     *   단계 = 넘은 문턱 수(0 ~ 3) · 조건 없음은 1 · **0 이면 꺼짐**. `base` = 값(**꺼진 칸은 단계 1 값** — 「켜면 얼마」) ·
     *   `value` = 적용 값 = `base × (1 + leadPart + gearPart)` [§5-10 · §5-14 「장비 죄종 버프」] — 켜짐과 무관하게 낸다
     */
    function measure(option, ctx) {
        const none = option.condKind === 'none';
        const have = TESTS[option.condKind].count(ctx, option);
        const steps = option.steps ?? [];
        const step = none ? 1 : steps.filter(n => have >= n).length;
        const need = none ? null : (steps[step] ?? null);
        const base = valueAt(option, Math.max(step, 1));
        const leadPart = (option.leaderBonus ?? 0) * (leadCurve(ctx.leader?.ldr) - 1);
        const gearPart = (ctx.gear?.[option.sin] ?? 0) * gearPct;
        const value = round(option.stat, base * (1 + leadPart + gearPart));
        return {
            have, steps: steps.slice(), step, need, active: step >= 1, base,
            leadPart: Math.round(leadPart * 1e4) / 1e4, gearPart: Math.round(gearPart * 1e4) / 1e4,
            value, bonus: round(option.stat, value - base),
        };
    }

    /**
     * 켜진 옵션들 → 접사·마스터리와 **같은 채널**의 가산치 (§2-4). 같은 능력치는 더한다 — 같은 가족이 두 칸이면 둘 다(§5-14).
     * 피해 감소만 따로 낸다 — 원천별 곱이라 합치면 안 된다 (battle_design §9-3). **옵션 하나 = 원천 하나**.
     */
    function bonusOf(options) {
        const flat = {}, dr = [];
        for (const o of options) {
            if (!o) continue;
            if (o.stat === 'damage_reduction') dr.push(o.value);
            else flat[o.stat] = (flat[o.stat] ?? 0) + o.value;
        }
        return { flat, dr };
    }

    /** 옵션의 조건이 지금 어휘에 있고 가족이 지금 표에 있나 — 옛 세이브 · 옛 풀의 원정 스냅숏을 거른다 (state.snapMeasure) */
    const hasCond = option => !!TESTS[option?.condKind] && !!famById[option?.id] && Array.isArray(option?.steps) && GRADES.includes(option?.grade);

    /**
     * 가족 하나 — **죄종 → 효과 → 변형**, 각 1회 · 균등 (INTERFACE §5-2). `prevId` = 그 칸이 굴리기 직전 든 가족 — 그것만 피한다:
     *   효과 단계에서 「변형이 그 가족 하나뿐인 효과」를 빼고 변형 단계에서 그 가족을 뺀다. 죄종 단계는 안 뺀다(죄종마다 효과가 둘 이상 — 로드 검증).
     *   그래서 **rng 횟수가 직전 가족과 무관하다** — 변형이 하나뿐이어도 1회를 쓴다
     */
    function drawFamily(rng, prevId) {
        const sin = SINS[Math.floor(rng() * SINS.length)];
        const effs = effectsBySin[sin].filter(e => !(e.ids.length === 1 && e.ids[0] === prevId));
        const eff = effs[Math.floor(rng() * effs.length)];
        const ids = eff.ids.filter(id => id !== prevId);
        return ids[Math.floor(rng() * ids.length)];
    }

    /**
     * 칸이 처음 열렸을 때 들어 있는 옵션 — 칸 번호 순으로 칸마다 가족 하나(rng 3회). 등급은 안 굴린다 — 첫 배정은 언제나 일반이다 (§5-5):
     *   시드 운이 초반 격차를 만들지 않고 칸이 열릴 때마다 「굴릴 이유」가 같이 생긴다. 칸끼리 겹쳐도 된다(§5-14).
     * 리롤 결과에 의존하지 않는 게 핵심이다: 리롤했다고 아직 안 열린 칸의 내용이 바뀌면 플레이어가 인과를 못 읽는다(통제성 — CLAUDE.md 철학 2)
     */
    function initialAssign(rng) {
        return slotList.map(() => ({ id: drawFamily(rng, null), grade: BASE_GRADE }));
    }

    /**
     * 한 칸 뽑기 — **죄종 → 효과 → 변형 → 등급, rng 4회 고정** (§5-14 · INTERFACE §5-2).
     * `prevId` = 그 칸이 굴리기 직전 든 가족(등급 무관 — 「일반 데미지」와 「레어 데미지」는 같은 옵션 · §5-5) — 돈을 내고 아무 일도 안 일어나는 일만 막는다(§5-6)
     */
    function pick(rng, prevId = null) {
        const id = drawFamily(rng, prevId);
        return { id, grade: rollGrade(rng) };
    }

    /**
     * 전체 리롤의 뽑기 — rng **하나로** `pick` 을 굴릴 칸마다 잇는다 (§5-6 · INTERFACE §5-2). 부르는 쪽이 칸 번호 오름차순으로 나눠 준다.
     * `prevIds` = 칸마다 굴리기 직전 든 가족(수를 주면 직전 없이 그만큼). 다른 칸 · 잠긴 칸 · 이번에 뽑은 것과 겹쳐도 된다(§5-14)
     */
    function pickMany(rng, prevIds) {
        const prev = typeof prevIds === 'number' ? Array(prevIds).fill(null) : prevIds;
        return prev.map(p => pick(rng, p));
    }

    /** 등급 가중 추첨 — `GRADES` 순서로 훑는다. 그 순서가 계약이다 (INTERFACE §5-3) */
    function rollGrade(rng) {
        let r = rng() * weightSum;
        for (let i = 0; i < GRADES.length; i++) {
            r -= gradeWeights[i];
            if (r < 0) return GRADES[i];
        }
        return GRADES[GRADES.length - 1];   // 부동소수 끝자락 보호 — 가중치 합을 넘는 r 은 마지막 등급
    }

    return {
        slotList, slotCount, families, familyIds, sinList: SINS.slice(),
        effectsOf: sin => (effectsBySin[sin] ?? []).map(e => ({ effect: e.effect, ids: e.ids.slice() })),
        conditions: Object.values(condById), gradeMult, gearPct,
        optionOf, valueAt, contextOf, measure, bonusOf, leadCurve,
        initialAssign, pick, pickMany, rerollCost, GRADES, COND_KINDS: Object.keys(TESTS), hasCond,
    };
}
