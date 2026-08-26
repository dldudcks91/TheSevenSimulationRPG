/**
 * 피해 계산 — battle_design.md §9 의 구현. **순수 함수뿐**이다.
 *
 * 이 모듈이 따로 있는 이유: 공식은 엔진 이식(Phase 2) 대조 검증의 핵이라 전투 진행(라운드·타임라인)과
 * 섞이면 안 된다. 같은 입력 → 같은 숫자인지를 여기만 떼어 시험할 수 있어야 한다.
 *
 * 계수는 전부 balance.csv — 이 파일에 숫자 리터럴을 쓰지 않는다.
 *
 * 직격 1회 = 명중 대결 → 타격 피해 → 감쇠 (§9-2·9-3·9-4)
 *
 *   적중률   = clamp(100 − 회피 + 명중, hit_floor_pct, 100)
 *   타격피해 = 공격력 × 편차 × 스킬 배율 × (1 + 조건부 합%) × 치명 배율
 *   K        = def_curve_k × 공격자 레벨
 *   감쇠율   = D ÷ (D + K)                        D = 물리 → 방어 / 원소 → 그 원소 저항
 *   최종피해 = max(dmg_min, 타격피해 × (1 − 감쇠율) × (1 − 피해감소%))
 *
 * 덧셈 공격 / 곱셈 감쇠 — 괄호 안은 덧셈이라 접사를 겹칠수록 선형으로 커지고,
 * 방어는 곡선이라 면역(1에 닿음)도 무의미(0 근처가 가장 가파름)도 없다.
 */

export function createFormula(balance) {
    const B = balance;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    /**
     * 감쇠율 0~1 — K 가 공격자 레벨에 비례하는 이유는 §9-3:
     * 고정 K 면 방어 소재값이 챕터마다 커지는 만큼 감쇠가 100% 로 수렴해 후반에 방어 1점이 무의미해진다.
     * 영웅은 자기 레벨, 몬스터는 스테이지 dlvl 을 쓴다.
     */
    function mitigation(D, attackerLevel) {
        if (!(D > 0)) return 0;
        return D / (D + B.def_curve_k * Math.max(1, attackerLevel ?? 1));
    }

    /** 적중률(%) — 하한 hit_floor_pct 가 회피 상한을 겸한다 (회피 몰빵 면역 차단) */
    const hitChance = (accuracy = 0, evasion = 0) =>
        clamp(100 - evasion + accuracy, B.hit_floor_pct, 100);

    /**
     * 감쇠에 들어갈 방어 소재값 — 공격 타입이 물리/저항 중 하나를 고르고,
     * 방어 무시는 **곡선에 넣기 전** 소재값을 비율로 깎는다 (감쇠율의 %가 아니다).
     * defender.res 는 {fire, cold, lightning, poison} 이거나 4원소 공통 숫자 하나.
     */
    function defenseAgainst(defender, atkType, defIgnorePct = 0) {
        const D = atkType === 'physical'
            ? (defender.def ?? 0)
            : (typeof defender.res === 'number' ? defender.res : (defender.res?.[atkType] ?? 0));
        return Math.max(0, D * (1 - defIgnorePct / 100));
    }

    /**
     * 직격 1회. rng 는 반드시 세 번 이 순서로 쓴다 — 명중 → 편차 → 치명 (빗나가면 한 번만).
     * 순서를 바꾸면 같은 시드가 다른 전투가 되므로 이식 대조가 깨진다.
     *
     * @param a 공격자 {atk, atkType, acc, crit, critDmg, defIgnore, variance, skillMult, bonusPct, lvl}
     * @param d 방어자 {def, res, eva, dr}
     */
    function strike(rng, a, d) {
        if (rng() * 100 >= hitChance(a.acc, d.eva)) return { hit: false, dmg: 0, crit: false };

        const varPct = (a.variance ?? B.dmg_variance_pct) / 100;
        let v = a.atk * (1 - varPct + rng() * varPct * 2);       // 편차 — 무기군 3축의 하나
        v *= a.skillMult ?? 1;                                    // 스킬 배율 (기본 공격 = 1)
        v *= 1 + (a.bonusPct ?? 0) / 100;                         // 조건부 합% — 특효·도감·버프 덧셈
        const crit = rng() * 100 < Math.min(a.crit ?? 0, B.crit_cap_pct);
        if (crit) v *= (a.critDmg ?? 100) / 100;

        v *= 1 - mitigation(defenseAgainst(d, a.atkType, a.defIgnore ?? 0), a.lvl);
        v *= 1 - (d.dr ?? 0) / 100;
        return { hit: true, dmg: Math.max(B.dmg_min, Math.round(v)), crit };
    }

    /**
     * 비직격 — 반사·도트·사망 폭발 (§9-6). 명중·편차·스킬 배율·치명·감쇠를 **받지 않고**,
     * 흡혈·반사·타격 발동 효과를 **유발하지 않는다**. 반사가 반사를 부르지 않는 것이 이 규칙의 요점.
     */
    const indirect = amount => Math.max(B.dmg_min, Math.round(amount));

    /** 흡혈 — 직격의 최종 피해에만 비례한다 */
    const leech = (dmg, pct) => Math.round(dmg * (pct ?? 0) / 100);

    return { mitigation, hitChance, defenseAgainst, strike, indirect, leech };
}
