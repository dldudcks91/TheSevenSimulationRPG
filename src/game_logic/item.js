/**
 * 아이템 시스템 — 드롭 굴림 / 시작 무기 / 세트포인트 / 분해.
 *
 * 순수 모듈. 데이터는 생성자 주입, 난수는 rng 인자.
 *
 * 아이템 = { uid, slot, rarity, ilvl, name:{ko,en}, twoHanded?, cls?(무기군의 직업),
 *            watk?, period?(무기), implicit:{stat,v}|null, affixes:[{stat,v}], sins:{sin:n} }
 *   표시 문자열은 name 하나뿐이다 — 접사는 stat id + 숫자로 들고 다니고 단위 붙이기는 렌더러가 한다.
 *   (CSV 로 이사할 때 stat id 가 곧 combat_stat.csv 의 키가 된다)
 *
 * ⚠ 접사 종류·수치 범위·희귀도 가중치는 전부 프로토타입 임시값 — balance.csv ⚠제안 키와
 *   주입된 affixDefs 에서 온다. 계승 접사 매트릭스(7죄종×슬롯)는 아직 연결하지 않았다.
 */

/**
 * @param {object} data
 *   balance      — {key: value}
 *   slots        — 슬롯 id 목록 (8부위)
 *   sins         — 죄종 id 목록
 *   itemBases    — {slot: [{ko,en, twoHanded?, cls?, period?}...]}  무기는 cls(직업)와 period 를 가진다
 *   affixDefs    — [{stat, min, max, perIlvl, slots?:[...]}]  slots 없으면 전 부위
 *   composeName  — (prefixSin, base, suffixSin|null) → {ko,en}
 */
export function createItemSystem(data) {
    const B = data.balance;
    const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

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

    /** 부위 고유값(Implicit) — 방어구는 방어력, 무기는 공격력·행동주기를 따로 든다 */
    const implicitFor = (slot, ilvl) => {
        if (slot === 'weapon') return null;
        if (['amulet', 'ring'].includes(slot)) return null;
        const v = Math.round(B.armor_def_base + ilvl * B.armor_def_per_ilvl);
        return { stat: 'def_flat', v: slot === 'offhand' ? Math.round(v * 1.5) : v };
    };

    function build(rng, slot, rarity, ilvl, base) {
        const prefix = pick(rng, data.sins);
        let suffix = null;
        if (rarity === 'rare' && rng() < B.suffix_sin_chance_pct / 100) {
            suffix = pick(rng, data.sins.filter(s => s !== prefix));
        }
        const two = base.twoHanded === true;
        const sins = { [prefix]: two ? 2 : 1 };        // 양손 무기는 2포인트 (item_design §2)
        if (suffix) sins[suffix] = (sins[suffix] ?? 0) + 1;

        const item = {
            uid: null,
            slot, rarity, ilvl,
            name: data.composeName(prefix, base, suffix),
            implicit: implicitFor(slot, ilvl),
            affixes: rollAffixes(rng, slot, ilvl, affixCount(rng, rarity)),
            sins,
        };
        if (two) item.twoHanded = true;
        if (slot === 'weapon') {
            item.cls = base.cls;
            item.watk = Math.round((B.weapon_atk_base + ilvl * B.weapon_atk_per_ilvl) * (two ? B.two_hand_atk_mult : 1));
            item.period = base.period;
        }
        return item;
    }

    /** 드롭 1개 — 부위 균등, 희귀도 가중치, ilvl 은 호출자가 준다 */
    function rollDrop(rng, ilvl) {
        const slot = pick(rng, data.slots);
        const base = pick(rng, data.itemBases[slot]);
        return build(rng, slot, rollRarity(rng), ilvl, base);
    }

    /** 시작 무기 — 그 직업의 무기군에서 ilvl 1 매직 1개 (장비가 주인공이라 빈손으로 내보내지 않는다) */
    function startingWeapon(rng, cls) {
        const bases = data.itemBases.weapon.filter(b => b.cls === cls);
        const base = bases.length ? pick(rng, bases) : pick(rng, data.itemBases.weapon);
        return build(rng, 'weapon', 'magic', 1, base);
    }

    /** 착용 가능 판정 — 부위 일치 + 무기는 직업 무기군 + 양손/보조 배타 */
    function canEquip(hero, item, equippedItems) {
        if (item.slot === 'weapon' && item.cls && item.cls !== hero.cls) return 'class';
        if (item.slot === 'offhand' && equippedItems.some(it => it.slot === 'weapon' && it.twoHanded)) return 'twoHanded';
        return null;
    }

    /** 세트포인트 = 착용 장비 죄종 합 + 메인 죄종 +1 (장비가 없어도 붙는다) */
    function setPoints(hero, equippedItems) {
        const pts = { [hero.sin]: 1 };
        for (const it of equippedItems)
            for (const [sin, n] of Object.entries(it.sins ?? {})) pts[sin] = (pts[sin] ?? 0) + n;
        return pts;
    }

    const salvageDust = item => item.rarity === 'rare' ? B.salvage_dust_rare : B.salvage_dust_magic;

    return { rollDrop, startingWeapon, canEquip, setPoints, salvageDust };
}
