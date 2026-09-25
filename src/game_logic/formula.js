/**
 * 피해 계산 — battle_design.md §9 의 구현. **순수 함수뿐**이다.
 *
 * 이 모듈이 따로 있는 이유: 공식은 엔진 이식(Phase 2) 대조 검증의 핵이라 전투 진행(라운드·타임라인)과
 * 섞이면 안 된다. 같은 입력 → 같은 숫자인지를 여기만 떼어 시험할 수 있어야 한다.
 *
 * 계수는 전부 balance.csv — 이 파일에 숫자 리터럴을 쓰지 않는다.
 *
 * **퍼센트는 비율로 든다** [2026-09-17 · R111 · src/data/README.md 단위 규약] — 5% = `0.05` · 배율 150% = `1.5`.
 *   CSV 의 `_pct` 이름은 그대로지만 값은 비율이고, 이 파일은 `/ 100` 을 하지 않는다. 화면이 찍을 때만 100 을 곱한다.
 *
 * 직격 1회 = 적중 게이트 → 타격 피해 → 감소 (§9-2 ~ §9-5)
 *
 *   적중률   = clamp(hit_base_pct − 부족레벨 × hit_per_level_deficit_pct, hit_min_pct, hit_base_pct)   (비율)
 *              **레벨 차만이 정한다** — 명중·회피 스탯은 폐지됐다 (§9-4). 오버레벨 초과 이득 없음
 *   타격피해 = 데미지 × 스킬 배율 × 능력치 계수 × 치명 배수 × 추가 피해 배수 × (1 + 피해량)      [2026-09-18 · §9-1 · §9-2]
 *              데미지 = 무기 범위 굴림 × (1 + Σ 데미지 %) — 상시 · 창 · 도감 「데미지」 · **그 타격의 조건부 %** 가 한 괄호의 덧셈
 *              능력치 계수 = (1 + attr_dmg_step_pct) ^ (능력치 − attr_dmg_pivot) — 복리 곱 · ~~능력치 항 덧셈(09-10)~~ 폐기
 *              추가 피해는 확률이 있는 스킬 타격만 치명 뒤에 한 번 더 굴린다 — 치명과 겹친다 (§9-2 · 2026-09-10)
 *              **공격력은 범위를 굴린다** — 적중하면 공격력 범위의 양끝(atkMin~atkMax) 사이를 한 번 균등 굴림 (§9-1 · R90)
 *   물리     × (1 − 방어값/(방어값 + def_curve_k))     K 는 **상수**다 — 공격자 레벨 무관 (§9-3)
 *   원소     × (1 − 적용저항)                           저항은 소재값이 아니라 **직접 비율**, 상한형 (§9-5)
 *   공통     × (1 − 피해감소)                           원천별 곱은 호출자가 reductionMult 로 합쳐 온다
 *   최종피해 = max(dmg_min, round(…))
 *
 * 성장 축은 둘이다 (§9-0) — **구간 직선**(무기 피해 · 방어구 고유값 · 최대 HP)과 **곱셈 곡선**(growthMult — HP flat 접사 · HP 재생 바탕값).
 * 09-14 최대 HP · 09-15 무기 피해 · 09-16 방어구 고유값이 차례로 곱셈 축을 떠났다.
 */

/**
 * 피해 감소 — **원천별로 각각 곱한다** (§9-3). 덧셈이 아니다.
 * 몇 개를 쌓아도 0에 수렴할 뿐 닿지 않아 상한 규칙이 필요 없고, 접사 하나의 실효 체력 기여가 항상 일정하다.
 * **밸런스 값을 안 읽어 팩토리 밖에 선다** [2026-09-22] — 장비 · 마스터리 합산(`hero.computeCombat`)과 버프 창(`skill_effects.dr_pct`)이
 *   이 함수 하나를 쓴다. `createFormula(...).reductionMult` 도 같은 함수다 (INTERFACE §2-3)
 */
export const reductionMult = pcts => (pcts ?? []).reduce((m, p) => m * (1 - (p ?? 0)), 1);

export function createFormula(balance) {
    const B = balance;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    /**
     * 퍼센트 반올림 [2026-09-17 · R111 · item_design §2-1] — 비율을 **1% 단위**(소수 둘째 자리)로 자른다.
     * `fine` 은 0.1% 단위다 — 오만 「레벨당 데미지」 한 행(1 보다 작은 % 가 본질 · 값 대역 대기 — GAME_DESIGN §10).
     * 장비 옵션 값과 운 계수를 먹인 드롭 보정이 쓴다 — 표기(1% 단위) = 계산이 되게 한다.
     */
    const PCT_STEP = 100;                 // 결정론 상수 — INTERFACE §5-3 (1% = 비율 0.01)
    const PCT_FINE_STEP = 1000;           // 결정론 상수 — INTERFACE §5-3 (0.1% = 비율 0.001)
    const roundPct = (v, fine = false) => {
        const k = fine ? PCT_FINE_STEP : PCT_STEP;
        return Math.round(v * k) / k;
    };
    /** 장비 옵션의 퍼센트 값 — 반올림하고 **한 칸(1% · fine 은 0.1%) 아래로는 안 내려간다**(옛 정수 규칙의 하한 1 과 같은 자리) */
    const pctOption = (v, fine = false) => Math.max(1 / (fine ? PCT_FINE_STEP : PCT_STEP), roundPct(v, fine));

    /**
     * 성장 축의 유일한 곡선 (§9-0) — `power_growth_per_level ^ (n − 1)`.
     * 타는 것: HP flat 접사(ilvl) · HP 재생 밑수(레벨)**뿐이다**.
     *   ~~영웅 최대 HP~~ 09-14 구간 직선으로 떠났다(R84) · ~~무기 피해 범위~~ 09-15(R105) · ~~방어구 고유값~~ 09-16(R107).
     * 타지 않는 것: 저항(비율 축) · 모든 % 접사 · 치명 · 공속 (곡선 밖).
     */
    const growthMult = n => Math.pow(B.power_growth_per_level, Math.max(1, n ?? 1) - 1);

    /**
     * 구간 직선의 누적합 표 [2026-09-16 · R107] — 레벨 1 값에서 시작해 **10레벨 구간마다 정해진 단위**를 더한다.
     * 무기 피해(09-15 확정)와 방어구 고유 방어력(09-16 확정)이 같은 모양을 쓴다 — `hero.js` 의 최대 HP(09-14)까지 셋이 한 규칙이다.
     * **생성할 때 한 번** 만든다(전투·드롭이 매번 부르는 자리라 루프를 남기지 않는다) · 구간 키가 없으면 여기서 던진다.
     * `ILVL_CAP` 을 넘는 레벨은 마지막 칸을 쓴다 — 아이템 레벨은 만렙 위로 `spawn_grade.csv:gear_ilvl_add` 만큼 더 올라간다.
     */
    const ILVL_CAP = 120;                 // 결정론 상수 — INTERFACE §5-3
    const MAX_BAND = 8;                   // 구간 키는 8 까지 발행돼 있다 · 그 위는 8 번을 계속 쓴다
    function bandTable(l1, prefix, levels) {
        if (!(levels > 0)) throw new Error(`formula: balance.csv 의 ${prefix}_levels 가 없거나 0 이하다`);
        if (typeof l1 !== 'number') throw new Error(`formula: ${prefix} 의 레벨 1 값이 없다`);
        const t = [0, l1];
        for (let n = 2; n <= ILVL_CAP; n++) {
            const b = Math.min(MAX_BAND, Math.floor((n - 1) / levels) + 1);
            const u = B[`${prefix}${b}_unit`];
            if (typeof u !== 'number') throw new Error(`formula: balance.csv 에 '${prefix}${b}_unit' 이 없다`);
            t[n] = t[n - 1] + u;
        }
        return t;
    }
    const atIlvl = (t, n) => t[Math.min(ILVL_CAP, Math.max(1, Math.round(n ?? 1)))];
    const weaponMidTable = bandTable(B.weapon_atk_base, 'weapon_atk_band', B.weapon_atk_band_levels);
    const armorDefTable = bandTable(B.armor_def_l1, 'armor_def_band', B.armor_def_band_levels);

    /**
     * 방어구 부위 고유 방어력의 **바탕값** [2026-09-16 사용자 확정 · item_design §1] — 굴림 전 값이다.
     *   부위 기준값(구간 직선) × 부위 배수(`armor_def_slot_*`) × 갑옷군 배수(`armor_group.csv:def_mult`)
     * 갑옷군은 **갑옷 칸에만** 있다(09-07) — 투구·장갑·신발은 `groupMult` 가 1 이다.
     * 개체 편차와 반올림은 부르는 쪽(`item.implicitFor`)이 한다 — 여기는 바탕만 낸다.
     */
    const armorDefense = (ilvl, slotMult, groupMult = 1) =>
        atIlvl(armorDefTable, ilvl) * (slotMult ?? 0) * (groupMult ?? 1);

    /**
     * 강화 배율 — `+`강화 단계 하나가 베이스 능력치(무기 피해 양끝 · 방어구 고유값)에 곱하는 값 (item_design §1 · R25).
     * item.js 에 있던 식을 여기로 옮겼다 [2026-09-14 · R90] — 무기 피해 범위를 hero.computeCombat 도 파생해야 해서 한 곳에 둔다
     */
    const upgradeMult = up => 1 + (up ?? 0) * B.equip_upgrade_base_pct;

    /**
     * 무기 피해 범위 [2026-09-14 · R90 · battle_design §9-1] — **굴림이 아니라 파생**이다. 같은 무기군 · 같은 ilvl · 같은 강화면 같은 범위.
     *   가운데 = weapon_atk_base + 구간 단위 누적합(ilvl) [2026-09-15 확정 · R105 — ~~× growthMult(ilvl)~~ 곱셈 축을 떠났다]
     *   양끝 = 가운데 × (1 ∓ 폭) × 강화 배율 → **반올림은 곱을 다 한 뒤 한 번**(표기 = 계산).
     *   폭(비율) = 무기군 `variance`(weapon_group.csv:variance_pct) · 없으면 dmg_variance_pct. 최소 ≥ 1 · 최대 ≥ 최소 (INTERFACE §5-3).
     *   범위 안의 굴림은 `strike` 가 직격마다 한다 — 여기는 양끝만 낸다.
     * @param group 무기군 정의(모르면 null — 전역 폭) · @returns {{min: number, max: number}}
     */
    function weaponDamage(ilvl, group, up = 0) {
        const mid = atIlvl(weaponMidTable, ilvl);
        const w = group?.variance ?? B.dmg_variance_pct;
        const m = upgradeMult(up);
        const min = Math.max(1, Math.round(mid * (1 - w) * m));
        return { min, max: Math.max(min, Math.round(mid * (1 + w) * m)) };
    }

    /**
     * 물리 감쇠율 −1~1 — 롤(LoL) 방식. **`def_curve_k` 는 상수다** (§9-3, 08-26 개정).
     * 뜻은 "감쇠가 정확히 50% 가 되는 방어값". 실효 체력 = HP × (1 + 방어/K) 라 방어 1점의 가치가 항상 같다.
     * 면역 없음(1에 닿지 않는다) · 무의미 없음(0 근처가 가장 가파르다) → 상한 규칙이 필요 없다.
     * **음수 방어는 거울식** [2026-09-21 · R130 · battle_design §9-3] — `K / (K − D) − 1`(음수 깎임 = 더 받는다). 0 에서 기울기까지 이어지고
     *   −1 에 닿지 않아 **받는 배수(1 − 깎임율)가 2 에서 멈춘다**(무한 증폭 없음). 양수 식을 음수에 쓰면 `D = −K` 에서 0 으로 나눈다. NaN 은 0
     */
    function mitigation(D) {
        if (D > 0) return D / (D + B.def_curve_k);
        if (D < 0) return B.def_curve_k / (B.def_curve_k - D) - 1;
        return 0;
    }

    /**
     * 곡선에 넣을 물리 방어값 — 방어 무시는 **곡선 앞** 소재값을 비율로 깎는다 (감쇠율의 %가 아니다).
     * **무시는 양수 방어에만 건다** [2026-09-21 · R130] — 0 밑으로 끌어내리지 않고(무시 100% 넘어도 0), 방어가 0 이하면 그대로 낸다:
     *   음수에 걸면 음수가 줄어 공격자의 관통이 방어자를 돕는다. 방어 **감소**(방어자의 값을 깎는다 — 0 밑까지 간다)와는 다른 개념이다
     */
    const physicalDefense = (def, defIgnorePct = 0) => {
        const d = def ?? 0;
        return d > 0 ? Math.max(0, d * (1 - (defIgnorePct ?? 0))) : d;
    };

    /** 현재 저항 상한(비율) — 기본 상한을 뚫는 유일한 수단이 최대 저항 증가, 그 위에 절대 상한 (§9-5).
     *  `elBonus` = **그 원소의** 최대 저항 증가(투구 시기 칸 · 2026-09-18) — 네 원소 공통인 `resMaxBonus` 위에 더한다. 화면(저항 행의 상한)과 전투가 같은 식을 쓴다 */
    const resCap = (resMaxBonus = 0, elBonus = 0) => Math.min(B.res_cap_base + (resMaxBonus ?? 0) + (elBonus ?? 0), B.res_cap_absolute);

    /** 적용 저항(비율) — 상한만 있고 **하한은 없다.** 음수 저항 = 피해 증폭 (§9-5) */
    const appliedResist = (res, resMaxBonus = 0, elBonus = 0) => Math.min(res ?? 0, resCap(resMaxBonus, elBonus));

    // 피해 감소 `reductionMult` 는 모듈 위에 선다 — 밸런스 값을 안 읽어서 버프 창(`skill_effects`)도 같은 함수를 부른다. 반환 목록은 그 함수를 그대로 싣는다

    /**
     * 적중률(비율) — **레벨 차 하나로 정해진다** (§9-4). 명중·회피 스탯 폐지.
     * 오버레벨은 hit_base_pct 에서 멈추고(초과 이득 없음), 아무리 모자라도 hit_min_pct 는 맞는다.
     * 적정 레벨에서는 분산이 0 — 분산은 언더레벨 도전을 자발적으로 택했을 때만 생긴다.
     * `bonus` = 공격자의 **명중률**(비율 · 궁수 T1-3 — 2026-09-22 R138) — 레벨 차로 나온 값에 더하고 hit_base_pct 를 넘지 않는다.
     *   오버레벨이면 이미 기준이라 아무 일도 안 하고, 레벨이 모자란 스테이지에서만 듣는다 (§9-4). 없으면 0 이라 종전과 같다
     */
    const hitChance = (attackerLevel, defenderLevel, bonus = 0) =>
        Math.min(B.hit_base_pct,
            clamp(B.hit_base_pct - Math.max(0, (defenderLevel ?? 1) - (attackerLevel ?? 1)) * B.hit_per_level_deficit_pct,
                B.hit_min_pct, B.hit_base_pct) + (bonus || 0));

    /**
     * 능력치 계수 [2026-09-18 · 사용자 확정 · battle_design §9-2] — `(1 + attr_dmg_step_pct) ^ (능력치 − attr_dmg_pivot)`.
     *   기준 능력치에서 1 · 1점마다 **복리** — 기준 아래로 내려가도 0 에 닿지 않는다(다른 직업 스킬은 「못 쓴다」가 아니라 「덜 세다」).
     *   평타는 직업 메인 스탯(`hero.computeCombat:main_attr_mult`) · 스킬은 데미지 슬롯이 적은 능력치(`skill.scaleDef:statMult`)가 같은 함수를 쓴다.
     *   능력치를 모르면(수가 아니면) 1 이다
     */
    const statCoef = v => (Number.isFinite(v) ? Math.pow(1 + B.attr_dmg_step_pct, v - B.attr_dmg_pivot) : 1);

    /**
     * 직격 1회. rng 는 이 순서로 쓴다 — 적중 → **피해** → 치명 → (추가 피해 확률이 있는 타격만) 추가 피해.
     * 빗나가면 한 번 · 확률이 0 인 적중은 세 번 · 확률이 있는 적중은 네 번이다 (INTERFACE §5-2 · 2026-09-10 · 피해 굴림 2026-09-14 R90).
     * 순서를 바꾸면 같은 시드가 다른 전투가 되므로 이식 대조가 깨진다.
     *
     * @param a 공격자 {atkMin, atkMax, atkType, lvl, hitBonus?, crit, critDmg, defIgnore, resReduction, resReductionEl?, skillMult, dmgPct, condPct, statMult, bonusPct, procChance, procMult}
     *          `atkMin`·`atkMax` = 데미지 범위 — 데미지 % 괄호(`dmgPct` = 그 괄호 안의 합)까지 **이미 곱해진** 값이다(시트 · 회복이 같은 값을 읽는다)
     *          `condPct` = **그 타격의** 조건부 % — 같은 괄호 안에 더한다(괄호를 `1 + dmgPct` 에서 `1 + dmgPct + condPct` 로 바꿔 끼운다 · 2026-09-18)
     *          `statMult` = 능력치 계수(`statCoef` — 평타 = 메인 스탯 · 스킬 = 슬롯의 능력치) · `bonusPct` = **피해량**(괄호와 합치지 않고 따로 곱한다)
     *          `procChance`·`procMult` 는 **스킬 타격만** 싣는다(battle.strikeOnce) — 없으면 0 이라 기본 공격은 굴림을 안 태운다
     * @param d 방어자 {def, res:{fire,cold,lightning,poison}, resMaxBonus, resMaxEl?, dr, drFlat?, lvl} — res 는 **항상 객체**(몬스터도)
     *          `resMaxEl` = 원소별 최대 저항 증가(투구 시기 칸 — 그 타격 원소의 값만 상한에 더한다) · `drFlat` = 절대값 피해 감소(투구 플레이트 — 모든 감소 뒤에 뺀다)
     *          [2026-09-18 · item_design §1 「투구 옵션」] — 둘 다 없으면 0 이라 종전과 같다. rng 소비는 안 바뀐다
     */
    function strike(rng, a, d) {
        if (rng() >= hitChance(a.lvl, d.lvl, a.hitBonus)) return { hit: false, dmg: 0, crit: false, proc: false };

        // 피해 굴림 [2026-09-14 · R90 · battle_design §9-1] — 적중 뒤 · 치명 앞에 **한 번**, 데미지 범위 양끝 사이 연속 균등.
        //   양끝이 같아도 소비한다 — 소비 수가 무기에 의존하면 같은 시드가 다른 전투를 낸다
        const atk = a.atkMin + rng() * (a.atkMax - a.atkMin);
        // 능력치 계수는 **곱**이다 [2026-09-18 · battle_design §9-2] — ~~능력치 항을 더한다(곱이 아니라 합 · 09-10)~~ 폐기. 복리라 0 이 안 된다
        let v = atk * (a.skillMult ?? 1) * (a.statMult ?? 1);     // 스킬 배율 (기본 공격 = 1) × 능력치 계수
        // 조건부 % 는 **데미지 % 괄호 안의 덧셈**이다 [2026-09-18 · battle_design §9-1] — 범위에는 괄호(1 + dmgPct)가 이미 곱해져 있어 그 괄호를 바꿔 끼운다.
        //   `dmgPct` 를 안 넘기면(0) `(1 + condPct)` 곱과 같다 · 괄호가 0 이하면(창이 다 깎았다) 범위도 0 이라 끼울 것이 없다
        const bracket = 1 + (a.dmgPct ?? 0);
        if (a.condPct && bracket > 0) v *= (bracket + a.condPct) / bracket;
        v *= 1 + (a.bonusPct ?? 0);                                // 피해량(도감) — 데미지 % 괄호와 합치지 않고 따로 곱한다 (2026-09-18)
        // 치명 확률에 상한이 없다 [2026-09-25 사용자 — ~~`crit_cap_pct`~~ 삭제] — 1 이상이면 전타 치명. 굴림은 그대로 1회(rng ③)
        const crit = rng() < (a.crit ?? 0);
        if (crit) v *= a.critDmg ?? 1;
        // 확률로 터지는 추가 피해 — 치명과 **따로 굴려 겹친다**(§9-2). 확률이 있는 타격만 굴린다:
        //   기본 공격은 확률이 0 이라 굴림을 안 태우므로 수열이 종전과 같다 (INTERFACE §5-2)
        let proc = false;
        if ((a.procChance ?? 0) > 0) {
            proc = rng() < Math.min(a.procChance, 1);
            if (proc) v *= a.procMult ?? 1;
        }

        if (a.atkType === 'physical') {
            v *= 1 - mitigation(physicalDefense(d.def ?? 0, a.defIgnore ?? 0));
        } else {
            // 저항 감소는 관통이라는 별도 규칙이 아니라 저항값에 음수를 더하는 것이다 (§9-5)
            //   `resReductionEl` = 원소별 저항 무시(반지 시기 칸 · 2026-09-21) — **그 타격 원소의 값만** 더한다 · 없으면 0 이라 종전과 같다
            const cut = (a.resReduction ?? 0) + (a.resReductionEl?.[a.atkType] ?? 0);
            v *= 1 - appliedResist((d.res?.[a.atkType] ?? 0) - cut, d.resMaxBonus ?? 0, d.resMaxEl?.[a.atkType] ?? 0);
        }
        v *= 1 - (d.dr ?? 0);
        v -= d.drFlat ?? 0;                                        // 절대값 피해 감소 — 모든 감소 뒤 · 하한은 아래 dmg_min (2026-09-18)
        return { hit: true, dmg: Math.max(B.dmg_min, Math.round(v)), crit, proc };
    }

    /**
     * 비직격 — 반사·도트·사망 폭발 (§9-6). 적중·스킬 배율·치명·추가 피해·감소를 **받지 않고**,
     * 흡혈·반사·타격 발동 효과를 **유발하지 않는다**. 반사가 반사를 부르지 않는 것이 이 규칙의 요점.
     */
    const indirect = amount => Math.max(B.dmg_min, Math.round(amount));

    /** 흡혈 — 직격의 최종 피해에만 비례한다 (`pct` 는 비율). `recv` = 흡혈하는 쪽의 **체력 회복 +%**(갑옷 나태 · 2026-09-18) — 0 이면 종전과 같은 값 */
    const leech = (dmg, pct, recv = 0) => Math.round(dmg * (pct ?? 0) * (1 + (recv ?? 0)));

    /**
     * 실효 쿨 (battle_design §6) — 스킬은 **행동 주기에 얹혀** 나가므로 쿨이 돌아도 다음 차례까지 기다린다.
     * `ceil(쿨 / 주기) × 주기` — 쿨이 주기의 정수배면 손실 0. 엔진은 이 함수를 쓰지 않는다(틱 루프에서
     * 자연히 생긴다) — 화면 표기와 검증이 같은 규칙을 읽게 하려고 여기 둔다.
     */
    const effectiveCd = (cd, period) => Math.ceil(cd / period) * period;

    return {
        roundPct, pctOption, growthMult, upgradeMult, weaponDamage, armorDefense, mitigation, physicalDefense, resCap, appliedResist, reductionMult,
        hitChance, statCoef, strike, indirect, leech, effectiveCd,
    };
}
