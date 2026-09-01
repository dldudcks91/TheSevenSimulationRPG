/**
 * 아이템 시스템 — 드롭 굴림 / 시작 무기 / 착용 규칙 / 분해 / 강화.
 *
 * 순수 모듈. 데이터는 생성자 주입, 난수는 rng 인자.
 *
 * 아이템 = { uid, slot, rarity, ilvl, up(강화 단계), name:{ko,en}, implicit:{stat,v}|null, affixes:[{stat,v}], sins:[sin...],
 *            group?(무기군 id — weapon_group.csv), watk?(무기 공격력 굴림값), element?(마법 무기의 원소) }
 *   표시 문자열은 name 하나뿐이다 — 접사는 stat id + 숫자로 들고 다니고 단위 붙이기는 렌더러가 한다.
 *   (CSV 로 이사할 때 stat id 가 곧 combat_stat.csv 의 키가 된다)
 *   무기의 행동 주기·공격 타입·착용 직업은 아이템에 박지 않는다 — 매번 무기군(group)에서 읽는다. SSOT 는 weapon_group.csv.
 *
 * **한손 개념은 없다** (2026-09-01) — 전 무기가 양손이라 `twoHanded` 플래그도 보조(offhand) 슬롯도 폐지했다.
 *   부위는 7종 · 착용 위치는 8개. 무기↔보조 배타 규칙과 양손 공격력 배율(two_hand_atk_mult)이 함께 사라졌다.
 *
 * 세트포인트는 **보류** (item_design.md §4, 2026-08-25) — `sins` 는 접사의 죄종 **목록**(접사 카테고리 · 지역 드롭 편향 ·
 *   낙인 지정의 축)일 뿐 포인트가 아니다. 양손 2포인트 · 메인 죄종 +1 도 같이 보류라 여기 없다.
 *
 * **개체 굴림** (item_design §2 · battle_design §9-1, 08-26) — 편차는 타격마다가 아니라 **드롭 시 한 번** 굴려
 *   개체에 박는다. 무기는 공격력(watk, 무기군 편차 폭), 방어구는 부위 고유 방어력(전역 폭 하나).
 *   같은 등급·같은 ilvl 이라도 개체차가 영구히 남아 "잘 뜬 것을 찾는" 파밍 성격이 생긴다.
 *
 * **접사 ilvl 스케일링은 3분류다** (item_design §2-1) — 정의의 `scale` 이 정한다:
 *   `growth` 기하 곡선(공격력·HP flat) / `band` 완만한 가산(물리 방어 flat) / `flat` ilvl 무관(% · 저항 · 유틸 전부).
 *
 * **강화** (item_design §1 개정 2026-08-31) — 골드를 먹고 `up` 을 올린다. 두 갈래가 서로 다르게 남는다:
 *   베이스(무기 watk · 방어구 implicit)는 **파생**하고, 3강마다 오르는 접사 값은 **박는다**.
 *   랜덤한 것은 다시 못 만드니 저장하고, 결정적인 것은 `up` 하나로 언제든 다시 계산한다 — 파생이면
 *   단계마다 반올림이 쌓이지 않고 드롭 시 굴린 개체값이 원본 그대로 남는다.
 *   **재굴림은 없다** — 접사의 종류·개수·순서를 강화가 바꾸는 일은 없다. 값만 오른다.
 *
 * ⚠ 접사 종류·수치 범위·희귀도 가중치는 전부 프로토타입 임시값 — balance.csv ⚠제안 키와
 *   주입된 affixDefs 에서 온다. 계승 접사 매트릭스(7죄종×슬롯)는 아직 연결하지 않았다.
 */

import { createFormula } from './formula.js';

/**
 * @param {object} data
 *   balance      — {key: value}
 *   slots        — 부위 id 목록 (7부위). 드롭은 부위 단위 — 반지는 착용 **위치**가 2개일 뿐 부위는 하나다
 *   sins         — 죄종 id 목록
 *   weaponGroups — {id: {id, ko, en, classes:[cls...], period, variance, damageKind, release}}  ← weapon_group.csv
 *   elements     — 원소 4종 id 목록 (마법 무기 개체가 하나를 든다)
 *   itemBases    — {slot: [{ko,en}...]}  무기 외 부위의 베이스 이름 풀. 무기의 베이스는 무기군 자체다
 *   affixDefs    — [{stat, scale:'growth'|'band'|'flat', min, max, perIlvl?, slots?:[...]}]  slots 없으면 전 부위
 *   composeName  — (prefixSin, base, suffixSin|null) → {ko,en}
 */
export function createItemSystem(data) {
    const B = data.balance;
    const WG = data.weaponGroups;
    const F = createFormula(B);        // 성장 곡선(growthMult) — 시뮬·영웅과 같은 함수를 쓴다
    const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
    const r1 = v => Math.round(v * 10) / 10;
    const r2 = v => Math.round(v * 100) / 100;

    /** 드롭·시작 무기에 쓰는 무기군 = 본편(release=main)뿐 — 확장 직업의 무기는 아직 아무도 못 드니 굴리지 않는다 */
    const dropGroups = Object.values(WG).filter(g => g.release === 'main');
    const groupsFor = cls => dropGroups.filter(g => g.classes.includes(cls));

    const rollRarity = rng => {
        const wm = B.rarity_w_magic, wr = B.rarity_w_rare;
        return rng() * (wm + wr) < wm ? 'magic' : 'rare';
    };

    const affixCount = (rng, rarity) => {
        const lo = rarity === 'rare' ? B.affix_rare_min : B.affix_magic_min;
        const hi = rarity === 'rare' ? B.affix_rare_max : B.affix_magic_max;
        return lo + Math.floor(rng() * (hi - lo + 1));
    };

    /**
     * 접사 n개 — 같은 stat 이 두 번 붙지 않는다. 값은 정의의 `scale` 이 정한다 (item_design §2-1):
     *   growth — 굴림 × growthMult(ilvl), 소수 1자리 (밑수가 2.3 대역이라 정수로 반올림하면 뭉개진다)
     *   band   — 굴림 + ilvl × perIlvl, 정수 (비율 축은 완만하게만 오른다)
     *   flat   — 굴림 그대로, 정수. **ilvl 무관** — % 접사가 곡선을 타면 곱셈층이 두 번 자라 후반이 폭주한다
     */
    function rollAffixes(rng, slot, ilvl, n) {
        const pool = data.affixDefs.filter(d => !d.slots || d.slots.includes(slot));
        const out = [];
        for (let i = 0; i < n && pool.length; i++) {
            const d = pool.splice(Math.floor(rng() * pool.length), 1)[0];
            const roll = d.min + rng() * (d.max - d.min);
            const v = d.scale === 'growth' ? Math.max(0.1, r1(roll * F.growthMult(ilvl)))
                : d.scale === 'band' ? Math.max(1, Math.round(roll + ilvl * (d.perIlvl ?? 0)))
                    : Math.max(1, Math.round(roll));
            out.push({ stat: d.stat, v });
        }
        return out;
    }

    /**
     * 부위 고유값(Implicit) — 방어구만 든다 (무기는 watk, 목걸이·반지는 없다).
     * 방어는 **비율 축**이라 성장 곡선을 타지 않는다 (§9-0) — ilvl 완만 가산 + 개체 편차 1회.
     * 부위별 배수는 없다 — 보조(offhand) ×1.5 는 슬롯 폐지와 함께 삭제 (2026-09-01).
     */
    function implicitFor(rng, slot, ilvl) {
        if (slot === 'weapon' || slot === 'amulet' || slot === 'ring') return null;    // rng 소비 없음
        const eps = (rng() * 2 - 1) * B.armor_def_variance_pct / 100;
        const base = B.armor_def_base + ilvl * B.armor_def_per_ilvl;
        return { stat: 'def_flat', v: r1(base * (1 + eps)) };
    }

    /**
     * base = 무기면 무기군 정의, 아니면 {ko,en} 이름.
     * rng 소비 순서(계약 — INTERFACE §5-2): 접두 죄종 → (레어) 접미 판정 → (성공 시) 접미 죄종 →
     *   접사 수 → 접사마다 (정의 선택 → 값) → **개체 굴림 1회** → (마법 무기) 원소
     */
    function build(rng, slot, rarity, ilvl, base) {
        const prefix = pick(rng, data.sins);
        let suffix = null;
        if (rarity === 'rare' && rng() < B.suffix_sin_chance_pct / 100) {
            suffix = pick(rng, data.sins.filter(s => s !== prefix));
        }
        const item = {
            uid: null,
            slot, rarity, ilvl,
            up: 0,                             // 강화 단계 — 드롭은 굴리지 않는다. 올리는 것은 upgrade 하나뿐
            name: data.composeName(prefix, base, suffix),
            implicit: null,
            affixes: rollAffixes(rng, slot, ilvl, affixCount(rng, rarity)),
            sins: suffix ? [prefix, suffix] : [prefix],
        };
        if (slot === 'weapon') {
            item.group = base.id;
            // 무기 공격력 = 밑수 × 성장 곡선 × 개체 편차. 편차 폭은 무기군 값이 우선 (§9-1)
            const eps = (rng() * 2 - 1) * (base.variance ?? B.dmg_variance_pct) / 100;
            item.watk = r2(B.weapon_atk_base * F.growthMult(ilvl) * (1 + eps));
            // 마법 무기는 **개체**가 원소를 든다 (battle_design §9-5) — 무기군은 종류를, 개체는 상대할 저항을 정한다.
            // 세기가 아니라 대상 선택이라 "무기군 스킬은 개체에 붙지 않는다"(skill_design §3)와 충돌하지 않는다.
            if (base.damageKind === 'magic') item.element = pick(rng, data.elements);
        } else {
            item.implicit = implicitFor(rng, slot, ilvl);
        }
        return item;
    }

    /** 드롭 1개 — 부위 균등, 희귀도 가중치, ilvl 은 호출자가 준다 */
    function rollDrop(rng, ilvl) {
        const slot = pick(rng, data.slots);
        const base = slot === 'weapon' ? pick(rng, dropGroups) : pick(rng, data.itemBases[slot]);
        return build(rng, slot, rollRarity(rng), ilvl, base);
    }

    /** 시작 무기 — 그 직업 전속 무기군에서 ilvl 1 매직 1개 (무기가 밑수라 빈손이면 세기가 성립하지 않는다) */
    function startingWeapon(rng, cls) {
        const gs = groupsFor(cls);
        return build(rng, 'weapon', 'magic', 1, gs.length ? pick(rng, gs) : pick(rng, dropGroups));
    }

    /** 무기군 정의 — 무기가 아니거나 모르는 군이면 null */
    const groupOf = item => (item && item.slot === 'weapon' ? WG[item.group] : null) ?? null;

    /** 착용 가능 판정 — 무기는 직업 전속 무기군(hero_design §2)뿐. 능력치 게이트는 없다 (착용 제약 = 요구 레벨만).
     *  양손/보조 배타는 2026-09-01 한손 개념 폐지로 사라졌다 — 남은 거절 사유는 `class` 하나다 */
    function canEquip(hero, item) {
        if (item.slot === 'weapon') {
            const g = groupOf(item);
            if (g && !g.classes.includes(hero.cls)) return 'class';
        }
        return null;
    }

    const salvageDust = item => item.rarity === 'rare' ? B.salvage_dust_rare : B.salvage_dust_magic;

    /* ── 강화 (item_design §1 개정 2026-08-31) ── */

    /** 베이스 능력치에 먹는 배율 — `up` 하나가 정한다 (원본은 안 건드린다) */
    const upMult = up => 1 + (up ?? 0) * B.equip_upgrade_base_pct / 100;

    /** 베이스 능력치가 있는 부위인가 — 목걸이·반지는 없어서 옵션 갈래만 받는다 */
    const hasBase = item => item.watk != null || item.implicit != null;

    const upgradeMax = () => B.equip_upgrade_max;

    /** 다음 한 단계의 골드. 상한이면 null — 비용은 단계마다 기하로 붙는다 */
    function upgradeCost(item) {
        const up = item.up ?? 0;
        if (up >= B.equip_upgrade_max) return null;
        return Math.round(B.equip_upgrade_gold_base * Math.pow(B.equip_upgrade_gold_growth, up));
    }

    /**
     * 강화 1단계 — **in-place**. 상한 검사는 호출자(state.js)가 한다.
     * 옵션 계단(3·6·9강)에서만 rng 를 **한 번** 쓴다 — 어느 접사가 오를지 고르는 굴림 하나뿐이고,
     * 접사의 종류·개수·순서는 건드리지 않는다(재굴림 없음).
     * 값 상승은 그 접사의 `scale` 이 정한 반올림을 따르되 **최소 한 칸은 반드시 오른다**
     * (growth +0.1 · 나머지 +1) — 비율만 곱하면 값이 작은 접사가 반올림에 먹혀 아무 일도 안 일어난다.
     */
    function upgrade(rng, item) {
        item.up = (item.up ?? 0) + 1;
        let affix = null;
        if (item.up % B.equip_upgrade_option_interval === 0 && (item.affixes ?? []).length) {
            const a = item.affixes[Math.floor(rng() * item.affixes.length)];
            const def = data.affixDefs.find(d => d.stat === a.stat);
            const growth = def ? def.scale === 'growth' : !Number.isInteger(a.v);
            const raised = a.v * (1 + B.equip_upgrade_option_pct / 100);
            const next = growth ? Math.max(r1(a.v + 0.1), r1(raised)) : Math.max(a.v + 1, Math.round(raised));
            affix = { stat: a.stat, from: a.v, to: next };
            a.v = next;
        }
        return { up: item.up, affix };
    }

    /**
     * 읽기용 사본 — 베이스에 강화 배율을 먹인다. 접사는 값이 이미 박혀 있어 손대지 않는다.
     * `up` 이 0 이거나 베이스가 없으면 **원본을 그대로** 돌려준다 — 전투·렌더가 매번 부르는 자리라 할당을 아낀다.
     */
    function effective(item) {
        if (!item || !(item.up > 0) || !hasBase(item)) return item;
        const m = upMult(item.up);
        const out = { ...item };
        if (out.watk != null) out.watk = r2(out.watk * m);
        if (out.implicit) out.implicit = { ...out.implicit, v: r1(out.implicit.v * m) };
        return out;
    }

    return { rollDrop, startingWeapon, canEquip, groupOf, groupsFor, salvageDust, upgradeMax, upgradeCost, upgrade, effective };
}
