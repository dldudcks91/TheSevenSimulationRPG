/**
 * 피해 계산 — battle_design.md §9 의 구현. **순수 함수뿐**이다.
 *
 * 이 모듈이 따로 있는 이유: 공식은 엔진 이식(Phase 2) 대조 검증의 핵이라 전투 진행(라운드·타임라인)과
 * 섞이면 안 된다. 같은 입력 → 같은 숫자인지를 여기만 떼어 시험할 수 있어야 한다.
 *
 * 계수는 전부 balance.csv — 이 파일에 숫자 리터럴을 쓰지 않는다.
 *
 * 직격 1회 = 적중 게이트 → 타격 피해 → 감소 (§9-2 ~ §9-5)
 *
 *   적중률   = clamp(hit_base_pct − 부족레벨 × hit_per_level_deficit_pct, hit_min_pct, hit_base_pct)
 *              **레벨 차만이 정한다** — 명중·회피 스탯은 폐지됐다 (§9-4). 오버레벨 초과 이득 없음
 *   타격피해 = 공격력 × 스킬 배율 × (1 + 조건부 합%) × 치명 배수
 *              **타격 편차 없음** — 편차는 무기 개체가 드롭될 때 한 번 굴려 watk 에 박혀 있다 (§9-1)
 *   물리     × (1 − 방어값/(방어값 + def_curve_k))     K 는 **상수**다 — 공격자 레벨 무관 (§9-3)
 *   원소     × (1 − 적용저항/100)                       저항은 소재값이 아니라 **직접 %**, 상한형 (§9-5)
 *   공통     × (1 − 피해감소%)                          원천별 곱은 호출자가 reductionMult 로 합쳐 온다
 *   최종피해 = max(dmg_min, round(…))
 *
 * 성장 축은 곡선 하나뿐이다 — growthMult (§9-0). 레벨과 ilvl 이 같은 곡선을 탄다.
 */

export function createFormula(balance) {
    const B = balance;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    /**
     * 성장 축의 유일한 곡선 (§9-0) — `power_growth_per_level ^ (n − 1)`.
     * 타는 것: 무기 공격력(ilvl) · 영웅 최대 HP(레벨) · 공격력/HP flat 접사(ilvl).
     * 타지 않는 것: 방어·저항(비율 축) · 모든 % 접사 · 치명 · 공속 (곡선 밖).
     */
    const growthMult = n => Math.pow(B.power_growth_per_level, Math.max(1, n ?? 1) - 1);

    /**
     * 물리 감쇠율 0~1 — 롤(LoL) 방식. **`def_curve_k` 는 상수다** (§9-3, 08-26 개정).
     * 뜻은 "감쇠가 정확히 50% 가 되는 방어값". 실효 체력 = HP × (1 + 방어/K) 라 방어 1점의 가치가 항상 같다.
     * 면역 없음(1에 닿지 않는다) · 무의미 없음(0 근처가 가장 가파르다) → 상한 규칙이 필요 없다.
     */
    function mitigation(D) {
        if (!(D > 0)) return 0;
        return D / (D + B.def_curve_k);
    }

    /** 곡선에 넣을 물리 방어값 — 방어 무시는 **곡선 앞** 소재값을 비율로 깎는다 (감쇠율의 %가 아니다) */
    const physicalDefense = (def, defIgnorePct = 0) => Math.max(0, (def ?? 0) * (1 - (defIgnorePct ?? 0) / 100));

    /** 현재 저항 상한(%) — 기본 상한을 뚫는 유일한 수단이 최대 저항 증가, 그 위에 절대 상한 (§9-5) */
    const resCap = (resMaxBonus = 0) => Math.min(B.res_cap_base + (resMaxBonus ?? 0), B.res_cap_absolute);

    /** 적용 저항(%) — 상한만 있고 **하한은 없다.** 음수 저항 = 피해 증폭 (§9-5) */
    const appliedResist = (res, resMaxBonus = 0) => Math.min(res ?? 0, resCap(resMaxBonus));

    /**
     * 피해 감소 — **원천별로 각각 곱한다** (§9-3). 덧셈이 아니다.
     * 몇 개를 쌓아도 0에 수렴할 뿐 닿지 않아 상한 규칙이 필요 없고, 접사 하나의 실효 체력 기여가 항상 일정하다.
     */
    const reductionMult = pcts => (pcts ?? []).reduce((m, p) => m * (1 - (p ?? 0) / 100), 1);

    /**
     * 적중률(%) — **레벨 차 하나로 정해진다** (§9-4). 명중·회피 스탯 폐지.
     * 오버레벨은 hit_base_pct 에서 멈추고(초과 이득 없음), 아무리 모자라도 hit_min_pct 는 맞는다.
     * 적정 레벨에서는 분산이 0 — 분산은 언더레벨 도전을 자발적으로 택했을 때만 생긴다.
     */
    const hitChance = (attackerLevel, defenderLevel) =>
        clamp(B.hit_base_pct - Math.max(0, (defenderLevel ?? 1) - (attackerLevel ?? 1)) * B.hit_per_level_deficit_pct,
            B.hit_min_pct, B.hit_base_pct);

    /**
     * 직격 1회. rng 는 반드시 두 번 이 순서로 쓴다 — 적중 → 치명 (빗나가면 한 번만).
     * 순서를 바꾸면 같은 시드가 다른 전투가 되므로 이식 대조가 깨진다.
     *
     * @param a 공격자 {atk, atkType, lvl, crit, critDmg, defIgnore, resReduction, skillMult, bonusPct}
     * @param d 방어자 {def, res:{fire,cold,lightning,poison}, resMaxBonus, dr, lvl} — res 는 **항상 객체**(몬스터도)
     */
    function strike(rng, a, d) {
        if (rng() * 100 >= hitChance(a.lvl, d.lvl)) return { hit: false, dmg: 0, crit: false };

        let v = a.atk * (a.skillMult ?? 1);                        // 스킬 배율 (기본 공격 = 1)
        v *= 1 + (a.bonusPct ?? 0) / 100;                          // 조건부 합% — 특효·도감·버프 덧셈
        const crit = rng() * 100 < Math.min(a.crit ?? 0, B.crit_cap_pct);
        if (crit) v *= (a.critDmg ?? 100) / 100;

        if (a.atkType === 'physical') {
            v *= 1 - mitigation(physicalDefense(d.def ?? 0, a.defIgnore ?? 0));
        } else {
            // 저항 감소는 관통이라는 별도 규칙이 아니라 저항값에 음수를 더하는 것이다 (§9-5)
            v *= 1 - appliedResist((d.res?.[a.atkType] ?? 0) - (a.resReduction ?? 0), d.resMaxBonus ?? 0) / 100;
        }
        v *= 1 - (d.dr ?? 0) / 100;
        return { hit: true, dmg: Math.max(B.dmg_min, Math.round(v)), crit };
    }

    /**
     * 비직격 — 반사·도트·사망 폭발 (§9-6). 적중·스킬 배율·치명·감소를 **받지 않고**,
     * 흡혈·반사·타격 발동 효과를 **유발하지 않는다**. 반사가 반사를 부르지 않는 것이 이 규칙의 요점.
     */
    const indirect = amount => Math.max(B.dmg_min, Math.round(amount));

    /** 흡혈 — 직격의 최종 피해에만 비례한다 */
    const leech = (dmg, pct) => Math.round(dmg * (pct ?? 0) / 100);

    /**
     * 실효 쿨 (battle_design §6) — 스킬은 **행동 주기에 얹혀** 나가므로 쿨이 돌아도 다음 차례까지 기다린다.
     * `ceil(쿨 / 주기) × 주기` — 쿨이 주기의 정수배면 손실 0. 엔진은 이 함수를 쓰지 않는다(틱 루프에서
     * 자연히 생긴다) — 화면 표기와 검증이 같은 규칙을 읽게 하려고 여기 둔다.
     */
    const effectiveCd = (cd, period) => Math.ceil(cd / period) * period;

    return {
        growthMult, mitigation, physicalDefense, resCap, appliedResist, reductionMult,
        hitChance, strike, indirect, leech, effectiveCd,
    };
}
