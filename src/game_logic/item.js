/**
 * 아이템 시스템 — 드롭 굴림 / 시작 무기 / 착용 규칙 / 분해.
 *
 * 순수 모듈. 데이터는 생성자 주입, 난수는 rng 인자.
 *
 * 아이템 = { uid, slot, rarity, ilvl, name:{ko,en}, implicit:{stat,v}|null, affixes:[{stat,v}], sins:[sin...],
 *            group?(무기군 id — weapon_group.csv), twoHanded?, watk?(무기 공격력 굴림값), element?(마법 무기의 원소) }
 *   표시 문자열은 name 하나뿐이다 — 접사는 stat id + 숫자로 들고 다니고 단위 붙이기는 렌더러가 한다.
 *   (CSV 로 이사할 때 stat id 가 곧 combat_stat.csv 의 키가 된다)
 *   무기의 행동 주기·공격 타입·착용 직업은 아이템에 박지 않는다 — 매번 무기군(group)에서 읽는다. SSOT 는 weapon_group.csv.
 *
 * 세트포인트는 **보류** (item_design.md §4, 2026-08-25) — `sins` 는 접사의 죄종 **목록**(접사 카테고리 · 지역 드롭 편향 ·
 *   낙인 지정의 축)일 뿐 포인트가 아니다. 양손 2포인트 · 메인 죄종 +1 도 같이 보류라 여기 없다.
 *
 * ⚠ 접사 종류·수치 범위·희귀도 가중치는 전부 프로토타입 임시값 — balance.csv ⚠제안 키와
 *   주입된 affixDefs 에서 온다. 계승 접사 매트릭스(7죄종×슬롯)는 아직 연결하지 않았다.
 */

/**
 * @param {object} data
 *   balance      — {key: value}
 *   slots        — 부위 id 목록 (8부위). 드롭은 부위 단위 — 반지는 착용 **위치**가 2개일 뿐 부위는 하나다
 *   sins         — 죄종 id 목록
 *   weaponGroups — {id: {id, ko, en, classes:[cls...], twoHanded, period, variance, attackType, stage}}  ← weapon_group.csv
 *   elements     — 원소 4종 id 목록 (마법 무기 개체가 하나를 든다)
 *   itemBases    — {slot: [{ko,en}...]}  무기 외 부위의 베이스 이름 풀. 무기의 베이스는 무기군 자체다
 *   affixDefs    — [{stat, min, max, perIlvl, slots?:[...]}]  slots 없으면 전 부위
 *   composeName  — (prefixSin, base, suffixSin|null) → {ko,en}
 */
export function createItemSystem(data) {
    const B = data.balance;
    const WG = data.weaponGroups;
    const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

    /** 드롭·시작 무기에 쓰는 무기군 = 본편(stage=main)뿐 — 확장 직업의 무기는 아직 아무도 못 드니 굴리지 않는다 */
    const dropGroups = Object.values(WG).filter(g => g.stage === 'main');
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

    /** 접사 n개 — 같은 stat 이 두 번 붙지 않는다 */
    function rollAffixes(rng, slot, ilvl, n) {
        const pool = data.affixDefs.filter(d => !d.slots || d.slots.includes(slot));
        const out = [];
        for (let i = 0; i < n && pool.length; i++) {
            const d = pool.splice(Math.floor(rng() * pool.length), 1)[0];
            const v = Math.round(d.min + rng() * (d.max - d.min) + ilvl * d.perIlvl);
            out.push({ stat: d.stat, v: Math.max(1, v) });
        }
        return out;
    }

    /** 부위 고유값(Implicit) — 방어구는 방어력, 무기는 공격력을 따로 든다 */
    const implicitFor = (slot, ilvl) => {
        if (slot === 'weapon') return null;
        if (['amulet', 'ring'].includes(slot)) return null;
        const v = Math.round(B.armor_def_base + ilvl * B.armor_def_per_ilvl);
        return { stat: 'def_flat', v: slot === 'offhand' ? Math.round(v * 1.5) : v };
    };

    /** base = 무기면 무기군 정의, 아니면 {ko,en} 이름 */
    function build(rng, slot, rarity, ilvl, base) {
        const prefix = pick(rng, data.sins);
        let suffix = null;
        if (rarity === 'rare' && rng() < B.suffix_sin_chance_pct / 100) {
            suffix = pick(rng, data.sins.filter(s => s !== prefix));
        }
        const item = {
            uid: null,
            slot, rarity, ilvl,
            name: data.composeName(prefix, base, suffix),
            implicit: implicitFor(slot, ilvl),
            affixes: rollAffixes(rng, slot, ilvl, affixCount(rng, rarity)),
            sins: suffix ? [prefix, suffix] : [prefix],
        };
        if (slot === 'weapon') {
            item.group = base.id;
            if (base.twoHanded) item.twoHanded = true;
            item.watk = Math.round((B.weapon_atk_base + ilvl * B.weapon_atk_per_ilvl) * (base.twoHanded ? B.two_hand_atk_mult : 1));
            // 마법 무기는 **개체**가 원소를 든다 (battle_design §9-5) — 무기군은 종류를, 개체는 상대할 저항을 정한다.
            // 세기가 아니라 대상 선택이라 "무기군 스킬은 개체에 붙지 않는다"(skill_design §3)와 충돌하지 않는다.
            if (base.attackType === 'magic') item.element = pick(rng, data.elements);
        }
        return item;
    }

    /** 드롭 1개 — 부위 균등, 희귀도 가중치, ilvl 은 호출자가 준다 */
    function rollDrop(rng, ilvl) {
        const slot = pick(rng, data.slots);
        const base = slot === 'weapon' ? pick(rng, dropGroups) : pick(rng, data.itemBases[slot]);
        return build(rng, slot, rollRarity(rng), ilvl, base);
    }

    /** 시작 무기 — 그 직업 전속 무기군에서 ilvl 1 매직 1개 (장비가 주인공이라 빈손으로 내보내지 않는다) */
    function startingWeapon(rng, cls) {
        const gs = groupsFor(cls);
        return build(rng, 'weapon', 'magic', 1, gs.length ? pick(rng, gs) : pick(rng, dropGroups));
    }

    /** 무기군 정의 — 무기가 아니거나 모르는 군이면 null */
    const groupOf = item => (item && item.slot === 'weapon' ? WG[item.group] : null) ?? null;

    /** 착용 가능 판정 — 무기는 직업 전속 무기군(hero_design §2) + 양손/보조 배타. 능력치 게이트는 없다 (착용 제약 = 요구 레벨만) */
    function canEquip(hero, item, equippedItems) {
        if (item.slot === 'weapon') {
            const g = groupOf(item);
            if (g && !g.classes.includes(hero.cls)) return 'class';
        }
        if (item.slot === 'offhand' && equippedItems.some(it => it.slot === 'weapon' && it.twoHanded)) return 'twoHanded';
        return null;
    }

    const salvageDust = item => item.rarity === 'rare' ? B.salvage_dust_rare : B.salvage_dust_magic;

    return { rollDrop, startingWeapon, canEquip, groupOf, groupsFor, salvageDust };
}
