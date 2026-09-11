/**
 * 아이템 시스템 — 드롭 굴림 / 시작 무기 / 착용 규칙 / 분해 / 강화.
 *
 * 순수 모듈. 데이터는 생성자 주입, 난수는 rng 인자.
 *
 * 아이템 = { uid, slot, rarity, ilvl, up(강화 단계), name:{ko,en}, implicit:{stat,v}|null, affixes:[{stat,v,src}], sins:[sin...],
 *            group?(무기군 id — weapon_group.csv), watk?(무기 공격력 굴림값),
 *            skill?(무기가 담은 액티브 id — 무기만 · 2026-09-09),
 *            baseId?(무기 베이스 id — weapon_base.csv · 그 무기군에 베이스 풀이 있을 때만 · 2026-09-10) }
 *   표시 문자열은 name 하나뿐이다 — 접사는 stat id + 숫자로 들고 다니고 단위 붙이기는 렌더러가 한다.
 *   (CSV 로 이사할 때 stat id 가 곧 combat_stat.csv 의 키가 된다)
 *   무기의 행동 주기·공격 타입·착용 직업은 아이템에 박지 않는다 — 매번 무기군(group)에서 읽는다. SSOT 는 weapon_group.csv.
 *
 * **접사는 출처(`src`)를 든다** [2026-09-11 · R78 · item_design §1 「무기 옵션」] — `fixed`(고정 옵션) · 죄종 id(죄종 칸) · `random`(통합옵션).
 *   **무기는 세 층을 정해진 개수로 받는다** — 고정 1 + 죄종 칸(이름의 죄종마다 1 — 매직 1 · 레어 2) + 통합옵션
 *   [balance.csv:weapon_common_opt_magic · weapon_common_opt_rare]. 무기는 `affix.csv` 를 안 쓴다 — 죄종 칸은 `weapon_sin_option.csv`,
 *   통합옵션은 `weapon_common_option.csv` 에서 온다. 무기 외 부위는 종전 그대로(`affix.csv` 한 풀 · 전부 `random`).
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
 *   무기 옵션 표에만 `fine` 이 하나 더 있다 — `flat` 과 같되 **소수 1자리**다(레벨당 데미지처럼 1 보다 작은 값 · 2026-09-11).
 *
 * **강화** (item_design §1 개정 2026-08-31) — 골드를 먹고 `up` 을 올린다. 두 갈래가 서로 다르게 남는다:
 *   베이스(무기 watk · 방어구 implicit)는 **파생**하고, 3강마다 오르는 접사 값은 **박는다**.
 *   랜덤한 것은 다시 못 만드니 저장하고, 결정적인 것은 `up` 하나로 언제든 다시 계산한다 — 파생이면
 *   단계마다 반올림이 쌓이지 않고 드롭 시 굴린 개체값이 원본 그대로 남는다.
 *   **재굴림은 없다** — 접사의 종류·개수·순서를 강화가 바꾸는 일은 없다. 값만 오른다.
 *
 * ⚠ 접사 종류·수치 범위·희귀도 가중치는 전부 프로토타입 임시값 — balance.csv ⚠제안 키와
 *   주입된 affixDefs · 무기 옵션 표에서 온다. 방어구 · 장신구의 죄종 칸은 아직 없다(부위 개편은 후속 — 사용자 지시).
 */

import { createFormula } from './formula.js';

/**
 * @param {object} data
 *   balance      — {key: value}
 *   slots        — 부위 id 목록 (7부위). 드롭은 부위 단위 — 반지는 착용 **위치**가 2개일 뿐 부위는 하나다
 *   sins         — 죄종 id 목록
 *   weaponGroups — {id: {id, ko, en, classes:[cls...], period, variance, damageKind, release}}  ← weapon_group.csv
 *   itemBases    — {slot: [{ko,en}...]}  무기 외 부위의 베이스 이름 풀. 무기의 베이스는 무기군 자체다
 *   weaponBases  — {groupId: [{id,ko,en}...]}  무기군별 세부 베이스 풀(weapon_base.csv) — **아직 일부 무기군뿐**.
 *                  풀이 있는 무기군만 드롭 때 하나를 굴려 이름·그림을 그 베이스로 좁힌다(2026-09-10). 없으면 무기군 이름 그대로
 *   classSkills  — **직업별** 액티브 후보 `{classId: [skillId...]}` ← skill.csv (행 순서가 굴림 결과를 정한다).
 *                  무기가 **개체마다** 그 무기군의 직업 풀에서 하나를 굴려 담는다 (skill_design §12-1 규칙 3).
 *                  이 모듈은 스킬 시스템을 모른다 — id 목록만 받는다
 *   affixDefs    — [{stat, scale:'growth'|'band'|'flat', min, max, perIlvl?, slots?:[...]}]  slots 없으면 전 부위 · **무기는 안 쓴다**
 *   weaponSinOptions    — [{sin, appliesTo, stat, scale, min, max}] ← weapon_sin_option.csv — 죄종 칸 후보 (2026-09-11 · R78).
 *                         `appliesTo` = `all` · 무기군 `damageKind`(physical/magic) · 직업 id(그 무기군의 classes 에 있으면).
 *                         한 죄종 · 한 무기군에 행이 여럿이면 그중 하나를 굴린다 · **행 순서가 결정론 계약**
 *   weaponCommonOptions — [{family, stat, appliesTo, scale, min, max}] ← weapon_common_option.csv — 통합옵션 후보 (2026-09-11 · R78).
 *                         종류(`family`)를 먼저 뽑고 그 안에서 변형(행)을 고른다 · **행 순서가 결정론 계약**
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
    const classSkills = data.classSkills ?? {};   // {classId: [skillId...]} — 무기가 담을 후보 (skill_design §12)
    const dropGroups = Object.values(WG).filter(g => g.release === 'main');
    /** 그 직업의 **스킬이 붙는** 무기군들 — 09-10 장착 개방 뒤로는 착용 제한이 아니라 시작 무기 선정에만 쓴다 */
    const groupsFor = cls => dropGroups.filter(g => g.classes.includes(cls));

    /* ── 무기 옵션 표 (item_design §1 「무기 옵션」 · 2026-09-11 · R78) ── */
    const sinOpts = data.weaponSinOptions ?? [];
    const commonOpts = data.weaponCommonOptions ?? [];
    const SCALES = ['growth', 'band', 'flat', 'fine'];
    // 로드 검증 — 어휘 밖의 값이 조용히 새면 굴림이 빈 후보를 만들고 아무도 모른다. 즉시 던진다
    {
        const classIds = new Set(Object.values(WG).flatMap(g => g.classes ?? []));
        const okTarget = t => t === 'all' || t === 'physical' || t === 'magic' || classIds.has(t);
        for (const [name, rows] of [['weapon_sin_option', sinOpts], ['weapon_common_option', commonOpts]]) {
            for (const r of rows) {
                if (!SCALES.includes(r.scale)) throw new Error(`item: ${name} ${r.stat} scale '${r.scale}'`);
                if (!okTarget(r.appliesTo)) throw new Error(`item: ${name} ${r.stat} applies_to '${r.appliesTo}'`);
                if (!(r.max >= r.min)) throw new Error(`item: ${name} ${r.stat} 범위 ${r.min}~${r.max}`);
            }
        }
        for (const r of sinOpts) if (!data.sins.includes(r.sin)) throw new Error(`item: weapon_sin_option 죄종 '${r.sin}'`);
    }
    /** 그 무기군에 이 행이 붙는가 — `all` · damageKind · 직업 id 중 하나가 맞으면. 시기 칸이 물리 / 마법사 / 사제로 갈리는 자리다 */
    const appliesTo = (row, g) => row.appliesTo === 'all' || row.appliesTo === g.damageKind || (g.classes ?? []).includes(row.appliesTo);

    /**
     * 희귀도 — 가중치 1회. **매직아이템 획득확률은 레어 가중치에 곱한다** [2026-09-11 · R78 · item_design §1 「무기 옵션」].
     * `magicFind` 는 파티 평균 % 이고 0 이면 종전과 같다 — 굴림 수는 언제나 1회다
     */
    const rollRarity = (rng, magicFind = 0) => {
        const wm = B.rarity_w_magic, wr = B.rarity_w_rare * (1 + magicFind / 100);
        return rng() * (wm + wr) < wm ? 'magic' : 'rare';
    };

    const affixCount = (rng, rarity) => {
        const lo = rarity === 'rare' ? B.affix_rare_min : B.affix_magic_min;
        const hi = rarity === 'rare' ? B.affix_rare_max : B.affix_magic_max;
        return lo + Math.floor(rng() * (hi - lo + 1));
    };

    /**
     * 값 하나 — 정의의 `scale` 이 정한다 (item_design §2-1):
     *   growth — 굴림 × growthMult(ilvl), 소수 1자리 (밑수가 2.3 대역이라 정수로 반올림하면 뭉개진다)
     *   band   — 굴림 + ilvl × perIlvl, 정수 (비율 축은 완만하게만 오른다)
     *   flat   — 굴림 그대로, 정수. **ilvl 무관** — % 접사가 곡선을 타면 곱셈층이 두 번 자라 후반이 폭주한다
     *   fine   — flat 과 같되 소수 1자리. **무기 옵션 표에만** 있다(레벨당 데미지처럼 1 보다 작은 값 · 2026-09-11)
     */
    const valueOf = (d, roll, ilvl) =>
        d.scale === 'growth' ? Math.max(0.1, r1(roll * F.growthMult(ilvl)))
            : d.scale === 'band' ? Math.max(1, Math.round(roll + ilvl * (d.perIlvl ?? 0)))
                : d.scale === 'fine' ? Math.max(0.1, r1(roll))
                    : Math.max(1, Math.round(roll));

    /** 접사 n개 (무기 외 부위) — 같은 stat 이 두 번 붙지 않는다. 출처는 전부 `random`(affix.csv = 통합옵션 풀 · 09-08) */
    function rollAffixes(rng, slot, ilvl, n) {
        const pool = data.affixDefs.filter(d => !d.slots || d.slots.includes(slot));
        const out = [];
        for (let i = 0; i < n && pool.length; i++) {
            const d = pool.splice(Math.floor(rng() * pool.length), 1)[0];
            out.push({ stat: d.stat, v: valueOf(d, d.min + rng() * (d.max - d.min), ilvl), src: 'random' });
        }
        return out;
    }

    /**
     * 무기 옵션 세 층 [2026-09-11 · R78 · item_design §1 「무기 옵션」] — 아이템이 드는 **순서가 곧 표시 순서**다(고정 → 죄종 칸 → 통합).
     * rng 소비(계약 — INTERFACE §5-2): 고정 값 1 → 죄종마다 (행 1 → 값 1) → 통합옵션마다 (종류 1 → 변형 1 → 값 1).
     * ⚠ **후보가 비어도 소비 수는 같다** — 무기군 · 표 내용이 소비 수를 바꾸면 같은 시드가 다른 드롭을 낸다(베이스 · 스킬 굴림과 같은 규칙)
     */
    function weaponOptions(rng, g, sins, rarity, ilvl) {
        const lo = B.weapon_fixed_atk_pct_min, hi = B.weapon_fixed_atk_pct_max;
        // 고정 옵션 — 무기면 무조건 「공격력 +%」 하나. 붙는 것은 규칙이고 값만 굴린다 (item_design §1 고정 옵션)
        const out = [{ stat: 'atk_pct', v: Math.max(1, Math.round(lo + rng() * (hi - lo))), src: 'fixed' }];
        // 죄종 칸 — 이름의 죄종마다 하나. 한 칸에 후보가 여럿이면(탐욕 셋 · 시기-사제 둘) 그중 하나를 굴린다
        for (const sin of sins) {
            const rows = sinOpts.filter(r => r.sin === sin && appliesTo(r, g));
            const pr = rng(), vr = rng();
            if (!rows.length) continue;
            const d = rows[Math.floor(pr * rows.length)];
            out.push({ stat: d.stat, v: valueOf(d, d.min + vr * (d.max - d.min), ilvl), src: sin });
        }
        // 통합옵션 — **종류를 먼저 뽑고 그 안에서 변형**(원소 ×4 · 종족 ×3 이 행 수만큼 비중을 먹지 않게). 한 무기에 같은 종류는 한 번
        const rows = commonOpts.filter(r => appliesTo(r, g));
        const families = [...new Set(rows.map(r => r.family))];      // 첫 등장 순 = CSV 행 순서
        const n = rarity === 'rare' ? B.weapon_common_opt_rare : B.weapon_common_opt_magic;
        for (let i = 0; i < n; i++) {
            const fr = rng(), sr = rng(), vr = rng();
            if (!families.length) continue;
            const fam = families.splice(Math.floor(fr * families.length), 1)[0];
            const variants = rows.filter(r => r.family === fam);
            const d = variants[Math.floor(sr * variants.length)];
            out.push({ stat: d.stat, v: valueOf(d, d.min + vr * (d.max - d.min), ilvl), src: 'random' });
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
     * rng 소비 순서(계약 — INTERFACE §5-2): 접두 죄종 → (레어) 접미 죄종 →
     *   **(무기) 옵션 세 층**(`weaponOptions`) / (무기 외) 접사 수 → 접사마다 (정의 선택 → 값) →
     *   **(무기) 베이스 1회** [신설 2026-09-10] → **개체 굴림 1회** → **(무기) 스킬 1회**
     *   ~~(마법 무기) 원소~~ 는 **2026-09-11 삭제**(R80) — 마법 무기에서 소비 1회가 빠졌다
     */
    function build(rng, slot, rarity, ilvl, base) {
        const prefix = pick(rng, data.sins);
        // 죄종 수는 희귀도가 정한다 — 매직 1 · 레어 2 (item_design §1 확정 2026-09-11 · 계승 TheSevenRPG 규칙 채택).
        //   ~~레어 접미 확률 판정(suffix_sin_chance_pct)~~ 은 08-25 초반 루프의 임시값이라 걷었다 — 판정 rng 1회가 함께 빠졌다
        const suffix = rarity === 'rare' ? pick(rng, data.sins.filter(s => s !== prefix)) : null;
        const sins = suffix ? [prefix, suffix] : [prefix];
        const item = {
            uid: null,
            slot, rarity, ilvl,
            up: 0,                             // 강화 단계 — 드롭은 굴리지 않는다. 올리는 것은 upgrade 하나뿐
            name: data.composeName(prefix, base, suffix),
            implicit: null,
            // 무기는 세 층(R78) · 그 밖은 affix.csv 한 풀 — 둘 다 베이스 · 개체 굴림보다 **앞**에서 굴린다 (§5-2)
            affixes: slot === 'weapon' ? weaponOptions(rng, base, sins, rarity, ilvl)
                : rollAffixes(rng, slot, ilvl, affixCount(rng, rarity)),
            sins,
        };
        if (slot === 'weapon') {
            item.group = base.id;
            // 무기 베이스 — 이름이 실제로 갈리는 무기군만 풀이 있다(weapon_base.csv · 지금 양손검·도끼·둔기·창·활).
            //   드롭되는 레벨·성격(A/B/C)은 아직 안 갈라 **대역 전부에서 균등 굴림**이다(item_design §1 대역 경계 미정).
            // ⚠ **풀이 비어도 1회 소비한다** — 스킬 굴림과 같은 이유로, 소비 수가 무기군에 의존하면 같은 시드가 다른 드롭을 낸다
            const bases = data.weaponBases?.[base.id] ?? [];
            const br = rng();
            const wbase = bases.length ? bases[Math.floor(br * bases.length)] : null;
            if (wbase) {
                item.baseId = wbase.id;
                item.name = data.composeName(prefix, wbase, suffix);  // 이름은 베이스 이름으로 다시 조립 — 무기군 이름을 덮는다
            }
            // 무기 공격력 = 밑수 × 성장 곡선 × 개체 편차. 편차 폭은 무기군 값이 우선 (§9-1)
            const eps = (rng() * 2 - 1) * (base.variance ?? B.dmg_variance_pct) / 100;
            item.watk = r2(B.weapon_atk_base * F.growthMult(ilvl) * (1 + eps));
            // ~~마법 무기는 개체가 원소를 든다~~ **폐기 2026-09-11 · 사용자 지시 · R80** (battle_design §2-1 · §9-5 · item_design §2)
            //   원소는 **관련 옵션이 붙었을 때만** 생긴다 — 생성 때 따로 굴리지 않고 드롭의 무작위성은 옵션 굴림이 든다.
            //   그래서 `element` 키가 아예 없고 **마법 무기에서 rng 소비 1회가 빠졌다**(INTERFACE §5-2).
            //   원소 옵션이 없는 마법 무기의 기본 공격은 **물리로 친다** — 그 판정은 `hero.computeCombat` 이 한다(`attack_type`).
            //   ⚠ 옛 세이브의 `item.element` 는 읽는 곳이 없어져 **죽은 필드**로 남는다(세이브 버전 무변경 · R77 선례).
            // 무기가 담는 액티브 — **개체가 든다** (skill_design §12-1 규칙 3 · 사용자 확정 2026-09-09).
            //   무기군은 스킬의 **종류를 안 정한다**(§12-1 규칙 2 로 폐기) — 정하는 것은 그 무기군의 **직업**이고,
            //   같은 도끼라도 개체마다 다른 전사 스킬이 붙는다. 액티브 2번 칸의 입력이다(`skill.activesFor`).
            // ⚠ **낀 사람의 직업을 안 본다** [09-10 장착 개방] — 도끼는 전사 풀, 스태프는 마법사 풀에서 굴린다.
            //   전사가 스태프를 끼면 무기 칸에 마법사 스킬이 선다 (skill_design §2 · §12-1 규칙 2·3).
            // ⚠ **풀이 비어도 1회 소비한다** — 소비 수가 무기군에 의존하면 같은 시드가 다른 드롭을 낸다
            const pool = classSkills[base.classes?.[0]] ?? [];
            const sr = rng();
            item.skill = pool.length ? pool[Math.floor(sr * pool.length)] : null;
        } else {
            item.implicit = implicitFor(rng, slot, ilvl);
        }
        return item;
    }

    /**
     * **한 벌** — 주어진 부위마다 아이템 하나 [신설 2026-09-11 · R79 · monster_design §5-1 · item_design §1].
     * 몬스터가 **입고 있는** 장비가 이것이고, 처치 드롭은 그중 하나가 **그대로** 나간다(2단계 = 입은 부위 중 하나).
     * rng 소비 순서(계약 — INTERFACE §5-2): 부위 배열 순서대로 — 베이스(무기는 `weaponGroup` 을 주면 **0회**) → 희귀도 1 → `build`.
     *   ⚠ **부위 배열 순서가 계약이다** — 같은 부위 묶음이라도 순서가 바뀌면 같은 시드가 다른 한 벌을 낸다.
     * @param opts `{slots, ilvl, magicFind?, rareBonusPct?, weaponGroup?}`
     *   · `magicFind` 파티 평균 % · `rareBonusPct` 등급이 미는 레어 가중 %(`spawn_grade.csv:gear_rare_bonus_pct`) — **둘은 같은 채널**이다
     *   · `weaponGroup` 무기군 고정. 몬스터는 제 무기군(`monster.csv:weapon_group`)을 들고, 안 주면 본편 무기군에서 굴린다
     */
    function rollGear(rng, opts) {
        const { slots, ilvl } = opts;
        const rareBonus = (opts.magicFind ?? 0) + (opts.rareBonusPct ?? 0);
        const out = [];
        for (const slot of slots) {
            // 무기군을 지정받으면 굴리지 않는다 — 그 몬스터가 어느 무기를 드는지는 데이터가 정한다(드롭 편향의 단위)
            const base = slot === 'weapon'
                ? (opts.weaponGroup ? WG[opts.weaponGroup] : pick(rng, dropGroups))
                : pick(rng, data.itemBases[slot]);
            if (!base) throw new Error(`item: rollGear 부위 '${slot}' 의 베이스가 없다`);
            out.push(build(rng, slot, rollRarity(rng, rareBonus), ilvl, base));
        }
        return out;
    }

    /**
     * 드롭 1개 — 부위 균등, 희귀도 가중치, ilvl 은 호출자가 준다.
     * `opts.magicFind` = 파티 평균 매직아이템 획득확률 % — 레어 가중치에 곱한다(없으면 0 · 굴림 수 불변 · 2026-09-11 R78)
     * ⚠ **게임 경로에서는 더 안 불린다** [2026-09-11 · R79] — 처치 드롭이 「입고 있던 장비」로 바뀌어 부위를 굴리지 않는다.
     *   검증·골든이 파이프라인 전체(부위 → 베이스 → 희귀도 → `build`)를 한 입구로 재는 자리로 남는다. **수열은 종전과 같다.**
     */
    function rollDrop(rng, ilvl, opts = {}) {
        const slot = pick(rng, data.slots);
        return rollGear(rng, { slots: [slot], ilvl, magicFind: opts.magicFind ?? 0 })[0];
    }

    /** 시작 무기 — **그 직업의 스킬이 붙는 무기군**에서 ilvl 1 매직 1개 (무기가 밑수라 빈손이면 세기가 성립하지 않는다).
     *  09-10 장착 개방 뒤에도 시작만은 자기 직업 무기로 준다 — 첫 무기 칸에 제 직업 스킬이 서야 직업이 무엇인지 읽힌다.
     *  갈아 끼우는 것은 자유다(`canEquip` 은 아무것도 거절하지 않는다). */
    function startingWeapon(rng, cls) {
        const gs = groupsFor(cls);
        return build(rng, 'weapon', 'magic', 1, gs.length ? pick(rng, gs) : pick(rng, dropGroups));
    }

    /**
     * 옛 무기에 채울 고정 옵션 · 죄종 칸 — **세이브 이관 전용**이다 (`state.js upgradeV22` · 2026-09-11 R78). 게임 중에는 부르지 않는다.
     * **rng 를 쓰지 않는다** — 행은 uid 번호로 고르고(v17 의 스킬 소급과 같은 방식) 값은 **범위의 가운데**다.
     * 같은 세이브를 두 번 열면 같은 결과이고, 가진 접사는 건드리지 않는다(호출자가 뒤에 붙인다).
     */
    function legacyWeaponLayers(item) {
        const g = WG[item?.group];
        if (!g) return [];
        const n = parseInt(String(item.uid ?? '').slice(1), 10);    // uid 는 `i12` — 접두 한 글자를 떼고 번호만 쓴다
        const num = Number.isFinite(n) ? n : 0;
        const lo = B.weapon_fixed_atk_pct_min, hi = B.weapon_fixed_atk_pct_max;
        const out = [{ stat: 'atk_pct', v: Math.max(1, Math.round((lo + hi) / 2)), src: 'fixed' }];
        (item.sins ?? []).forEach((sin, i) => {
            const rows = sinOpts.filter(r => r.sin === sin && appliesTo(r, g));
            if (!rows.length) return;
            const d = rows[(num + i) % rows.length];
            out.push({ stat: d.stat, v: valueOf(d, (d.min + d.max) / 2, item.ilvl), src: sin });
        });
        return out;
    }

    /** 무기군 정의 — 무기가 아니거나 모르는 군이면 null */
    const groupOf = item => (item && item.slot === 'weapon' ? WG[item.group] : null) ?? null;

    /** 착용 가능 판정 — **거절 사유가 없다** [2026-09-10 사용자 확정 · hero_design §2].
     *  ~~무기는 직업 전속 무기군뿐~~ 폐기: 어느 직업이든 어느 무기든 낀다. `weapon_group.csv:classes` 는
     *  이제 장착 게이트가 아니라 **그 무기에 어느 직업의 스킬이 붙는가**를 정한다(위 `build` 의 스킬 굴림).
     *  양손/보조 배타는 09-01 한손 폐지로, `class` 는 09-10 개방으로 사라졌다 — 남은 것은 없다.
     *  **함수를 지우지 않는 이유**: 요구 레벨 게이트가 들어올 자리다(착용 제약 = 요구 레벨만 — hero_design §4-2). */
    function canEquip(hero, item) {
        return null;
    }

    /**
     * 무기군 교체 — **세이브 이관 전용**이다 (`state.js upgradeV15`). 게임 중에는 부르지 않는다.
     * 개체에 박힌 굴림(watk · element · 접사 · 강화)은 **그대로 두고** 군과 이름만 갈아끼운다 —
     * 아이템의 세기는 개체 굴림이 들고 있고(§9-1) 무기군은 주기·편차·착용 직업을 가리키는 포인터라,
     * 포인터만 옮기면 세기를 건드리지 않고 소유 직업을 옮길 수 있다.
     * 이름은 접사 죄종(`sins`)이 그대로라 **베이스만 바뀐 이름**으로 다시 조립한다.
     */
    function regroupWeapon(item, groupId) {
        const g = WG[groupId];
        if (!g || item?.slot !== 'weapon') return item;
        item.group = groupId;
        const [pre, suf] = item.sins ?? [];
        if (pre) item.name = data.composeName(pre, g, suf ?? null);
        return item;
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

    return { rollDrop, rollGear, startingWeapon, legacyWeaponLayers, canEquip, groupOf, groupsFor, regroupWeapon, salvageDust, upgradeMax, upgradeCost, upgrade, effective };
}
