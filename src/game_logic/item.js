/**
 * 아이템 시스템 — 드롭 굴림 / 시작 장비(무기 · 갑옷) / 착용 규칙 / 분해 / 강화.
 *
 * 순수 모듈. 데이터는 생성자 주입, 난수는 rng 인자.
 *
 * 아이템 = { uid, slot, rarity, ilvl, up(강화 단계), name:{ko,en}, implicit:{stat,v}|null, affixes:[{stat,v,src}], sins:[sin...],
 *            words:[단 번호...](이름에 쓴 죄종 단어 — sins 와 같은 길이 · 2026-09-19),
 *            group?(무기군 id — weapon_group.csv),
 *            skill?(무기가 담은 액티브 id — 무기만 · 2026-09-09),
 *            baseId?(베이스 id — 무기는 weapon_base.csv(그 무기군에 풀이 있을 때만 · 2026-09-10) · 방어구 · 장신구는 item_base.csv(2026-09-17)),
 *            proc?(목걸이 고정 옵션 = 발동 스킬 `{trigger, skill, v}` — 목걸이만 · 2026-09-21 · ⚠ 전투는 안 읽는다) }
 *   표시 문자열은 name 하나뿐이다 — 접사는 stat id + 숫자로 들고 다니고 단위 붙이기는 렌더러가 한다.
 *   name 은 `sins` · `words` · 베이스로 조립한 **결과**다 — 죄종 단어의 자리는 `words` 와 naming.sinPhrase 가 다시 낸다.
 *   (CSV 로 이사할 때 stat id 가 곧 combat_stat.csv 의 키가 된다)
 *   무기의 행동 주기·공격 타입·착용 직업은 아이템에 박지 않는다 — 매번 무기군(group)에서 읽는다. SSOT 는 weapon_group.csv.
 *
 * **접사는 출처(`src`)를 든다** [2026-09-11 · R78 · item_design §1 「무기 옵션」] — `fixed`(고정 옵션) · 죄종 id(죄종 칸) · `random`(통합옵션).
 *   **무기는 세 층을 정해진 개수로 받는다** — 고정 1 + 죄종 칸(이름의 죄종마다 1 — 일반 0 · 매직 1 · 레어 2) + 통합옵션
 *   [balance.csv:weapon_common_opt_normal · weapon_common_opt_magic · weapon_common_opt_rare]. 무기는 `affix.csv` 를 안 쓴다 — 죄종 칸은 `weapon_sin_option.csv`,
 *   통합옵션은 `weapon_common_option.csv` 에서 온다.
 *   **방어구 네 부위도 같은 세 층이다** [2026-09-18 · 사용자 확정 · item_design §1 「갑옷 옵션」 · 「투구 옵션」] — 고정 「방어력 +%」 1 + 죄종 칸 +
 *   공통옵션 [balance.csv:armor_common_opt_normal · armor_common_opt_magic · armor_common_opt_rare]. 죄종 칸은 `armor_sin_option.csv`
 *   (장갑만 ⚠임시로 `weapon_sin_option.csv` 를 그대로 읽는다), 공통옵션은 `armor_common_option.csv`(투구는 갈래별 풀).
 *   **목걸이 · 반지도 세 층이다** [2026-09-21 · 사용자 확정 · R127 · item_design §1 「반지 · 목걸이」] — 죄종 칸 `accessory_sin_option.csv` +
 *   공통옵션 `accessory_common_option.csv`(두 부위 한 풀) [balance.csv:accessory_common_opt_normal · _magic · _rare]. 반지는 고정이 없고,
 *   **목걸이 고정 옵션은 발동 스킬**이라 `affixes` 가 아니라 `item.proc` 에 든다(발동 조건은 베이스 — `amulet_proc.csv`).
 *   ~~`affix.csv` 한 풀(전부 `random`)을 쓰는 것은 목걸이 · 반지뿐이다~~ — 마지막 사용자가 떠나 파일째 퇴역했다.
 *
 * **한손 개념은 없다** (2026-09-01) — 전 무기가 양손이라 `twoHanded` 플래그도 보조(offhand) 슬롯도 폐지했다.
 *   부위는 7종 · 착용 위치는 8개. 무기↔보조 배타 규칙과 양손 공격력 배율(two_hand_atk_mult)이 함께 사라졌다.
 *
 * 세트포인트는 **보류** (item_design.md §4, 2026-08-25) — `sins` 는 접사의 죄종 **목록**(접사 카테고리 · 전술카드가 세는 대상 —
 *   ~~지역 드롭 편향~~ 08-27 · ~~낙인 지정~~ 2026-09-15 에 사라졌다)일 뿐 포인트가 아니다. 양손 2포인트 · 메인 죄종 +1 도 같이 보류라 여기 없다.
 *
 * **개체 굴림은 없다** [2026-09-18 · 사용자 확정 · item_design §1 「부위 고유 방어력」] — ~~방어구 고유 방어력만 드롭 시 한 번 굴려 개체에 박는다~~.
 *   방어구 고유값은 레벨 · 부위 · 갈래가 정한 값 그대로이고 개체 사이의 차이는 고정 옵션 「방어력 +%」 한 줄이 든다.
 *   ~~무기는 공격력(watk, 무기군 편차 폭)~~ 은 **2026-09-14 폐지**(R90 · battle_design §9-1) — 무기 피해는 **최소 ~ 최대 범위**이고
 *   무기군 × ilvl × 강화 단계가 정한다(`weaponDamage` — 박지 않고 파생). 범위 안의 굴림은 직격마다 전투(formula.strike)가 한다.
 *
 * **베이스는 티어가 고른다** [2026-09-18 · 사용자 확정 · item_design §1 「베이스」] — 무기 외 부위의 베이스 후보는 그 ilvl 에서 열린
 *   (`tierMin ≤ ilvl`) **가장 높은 티어의 행**뿐이다. 방어구는 시작 칸 → Normal → Exceptional → Elite 로 형상이 바뀌고 그 안의 갈래는 균등이다.
 *
 * **접사 ilvl 스케일링은 3분류다** (item_design §2-1) — 정의의 `scale` 이 정한다:
 *   `growth` 기하 곡선(공격력·HP flat) / `band` 완만한 가산(물리 방어 flat) / `flat` ilvl 무관(% · 저항 · 유틸 전부).
 *   무기 옵션 표에만 `fine` 이 하나 더 있다 — `flat` 과 같되 **0.1% 단위**다(레벨당 데미지처럼 1% 보다 작은 값 · 2026-09-11).
 *   **`flat` · `fine` 값은 비율이다** [2026-09-17 · R111] — 5% = `0.05`. `growth` · `band` 는 고정값이라 정수 그대로다.
 *
 * **강화** (item_design §7-2 개정 2026-09-15 · R95) — 골드를 먹고 `up` 을 올린다. **올리는 것은 베이스 능력치 하나다**:
 *   베이스(무기 피해 범위 · 방어구 implicit)는 `up` 하나로 **파생**한다 — 단계마다 반올림이 쌓이지 않고 드롭 시 굴린 개체값이 원본 그대로 남는다.
 *   ~~3강마다 접사 하나의 값을 올려 박는다~~ 는 R95 퇴역 — 강화는 접사를 **전혀** 안 건드리고 rng 를 안 쓴다.
 *   **목걸이 · 반지는 강화하지 않는다** — 베이스가 없다(`baseless`). 옛 세이브에 남은 `up` 은 그대로 두고, 파생할 것이 없어 무해하다.
 *
 * ⚠ 접사 종류·수치 범위·희귀도 가중치는 전부 프로토타입 임시값 — balance.csv ⚠제안 키와
 *   주입된 무기 · 방어구 · 장신구 옵션 표에서 온다.
 *   ⚠ 장갑의 공통옵션 풀은 옛 `affix.csv` 장갑 풀을 옮긴 임시다(기획 미정 · 2026-09-18 사용자 보류) · 장갑 갈래 고정값도 보류다.
 *   ⚠ **발동 스킬(`item.proc`)은 설명에만 나온다** [사용자 지시 2026-09-21] — 세기 · 내부 쿨타임이 미정이라 전투가 읽지 않는다(GAME_DESIGN §10).
 */

import { createFormula } from './formula.js';

/**
 * @param {object} data
 *   balance      — {key: value}
 *   slots        — 부위 id 목록 (7부위). 드롭은 부위 단위 — 반지는 착용 **위치**가 2개일 뿐 부위는 하나다
 *   sins         — 죄종 id 목록
 *   weaponGroups — {id: {id, ko, en, classes:[cls...], period, variance, damageKind, release}}  ← weapon_group.csv
 *   itemBases    — {slot: [{id,ko,en,group,tierMin}...]}  무기 외 부위의 베이스 풀. 무기의 베이스는 무기군 자체다
 *                  `id` 는 `item_base.csv:base_id` — 드롭이 `item.baseId` 에 박는다 (2026-09-17)
 *   weaponBases  — {groupId: [{id,ko,en}...]}  무기군별 세부 베이스 풀(weapon_base.csv) — **아직 일부 무기군뿐**.
 *                  풀이 있는 무기군만 드롭 때 하나를 굴려 이름·그림을 그 베이스로 좁힌다(2026-09-10). 없으면 무기군 이름 그대로
 *   classSkills  — **직업별** 액티브 후보 `{classId: [skillId...]}` ← skill.csv (행 순서가 굴림 결과를 정한다).
 *                  무기가 **개체마다** 그 무기군의 직업 풀에서 하나를 굴려 담는다 (skill_design §12-1 규칙 3).
 *                  이 모듈은 스킬 시스템을 모른다 — id 목록만 받는다
 *   ~~affixDefs~~ — 2026-09-21 R127 퇴역(`affix.csv` 삭제 — 마지막 사용자였던 목걸이 · 반지가 아래 세 표로 옮겼다)
 *   accessorySinOptions    — [{slot, sin, stat, scale, min, max, perIlvl?}] ← accessory_sin_option.csv — 반지 · 목걸이 죄종 칸 후보 (2026-09-21).
 *                            한 부위 · 한 죄종에 행이 여럿이면 그중 하나를 굴린다(반지 시기 다섯 · 목걸이 시기 둘 · 탐욕 셋) · **행 순서가 결정론 계약**
 *   accessoryCommonOptions — [{family, stat, scale, min, max, perIlvl?}] ← accessory_common_option.csv — **두 부위 한 풀** (2026-09-21) · **행 순서가 결정론 계약**
 *   amuletProcs  — [{baseId, trigger, min, max}] ← amulet_proc.csv — 목걸이 베이스마다 발동 조건 하나(`hit` · `struck` · `interval`)
 *   procSkills   — [skillId] ← skill.csv:amulet_pool = 1 — 목걸이 발동 스킬 후보(직업을 안 가리는 한 풀) · **행 순서가 결정론 계약**
 *   weaponSinOptions    — [{sin, appliesTo, stat, scale, min, max}] ← weapon_sin_option.csv — 죄종 칸 후보 (2026-09-11 · R78).
 *                         `appliesTo` = `all` · 무기군 `damageKind`(physical/magic) · 직업 id(그 무기군의 classes 에 있으면).
 *                         한 죄종 · 한 무기군에 행이 여럿이면 그중 하나를 굴린다 · **행 순서가 결정론 계약**
 *   weaponCommonOptions — [{family, stat, appliesTo, scale, min, max}] ← weapon_common_option.csv — 통합옵션 후보 (2026-09-11 · R78).
 *                         종류(`family`)를 먼저 뽑고 그 안에서 변형(행)을 고른다 · **행 순서가 결정론 계약**
 *   armorGroups  — {slot: {groupId: {defMult, aspdPct, cdrPct, …}}} ← armor_group.csv — **부위 → 갈래** (갑옷군 2026-09-16 · 투구 · 장갑 · 신발 2026-09-18).
 *                  고유 방어력의 갈래 계수(`defMult`)를 여기서 읽는다 — 갈래 id 는 부위마다 겹친다(`leather`)
 *   armorSinOptions    — [{slot, sin, stat, scale, min, max, perIlvl?}] ← armor_sin_option.csv — 방어구 죄종 칸 후보 (2026-09-18).
 *                         한 부위 · 한 죄종에 행이 여럿이면 그중 하나를 굴린다 · **장갑 행은 없다**(`SIN_FROM_WEAPON`) · **행 순서가 결정론 계약**
 *   armorCommonOptions — [{slot, group, family, stat, scale, min, max, perIlvl?}] ← armor_common_option.csv — 방어구 공통옵션 후보 (2026-09-18).
 *                         `group` = `all` 또는 그 부위의 갈래 id · **행 순서가 결정론 계약**
 *   naming       — game_logic/naming.js 의 조립기 — `composeName(prefixSin, base, suffixSin|null, words)` · `wordCount(sin)`
 */
export function createItemSystem(data) {
    const B = data.balance;
    const WG = data.weaponGroups;
    const AG = data.armorGroups ?? {};   // armor_group.csv — {slot: {groupId: def}} · 갑옷군 3 (2026-09-16 · R107) + 투구 · 장갑 · 신발 갈래 (2026-09-18)
    /** 그 부위의 갈래 정의 — 갈래가 없거나(시작 칸) 모르면 null. 갈래 id 는 부위마다 겹치므로 **부위와 함께** 찾는다 */
    const groupDef = (slot, group) => (group ? AG[slot]?.[group] ?? null : null);
    const F = createFormula(B);        // 성장 곡선(growthMult) — 시뮬·영웅과 같은 함수를 쓴다
    const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
    const N = data.naming;
    /**
     * 죄종 하나를 굴린다 — **그 굴림의 남은 자리(소수부)로 이름 단어의 단 번호도 낸다** [2026-09-19 · item_design §1 「이름」 · INTERFACE §2-5 `words`].
     * `r` 이 균등이면 `frac(r × 후보 수)` 도 균등이고 고른 죄종과 독립이라 **단어 넷 중 균등**이 된다 — rng 를 더 쓰지 않아 소비 순서가 그대로다(§5-2).
     * ⚠ 임시(사용자 지시 — 밸런싱 전) · 목표는 레벨 구간(`sin_word.csv:tier_min_ilvl`)이다
     */
    const pickSin = (rng, arr) => {
        const x = rng() * arr.length, i = Math.floor(x), sin = arr[i];
        const n = N.wordCount(sin);
        return { sin, word: Math.min(n - 1, Math.floor((x - i) * n)) };
    };

    /** 베이스 능력치가 없는 부위 — 무기(피해 범위)도 방어구(고유값)도 아닌 둘. 고유값 굴림과 강화가 같은 판정을 쓴다 (R95) */
    const baseless = slot => slot === 'amulet' || slot === 'ring';
    /** 방어구 네 부위(갑옷 · 투구 · 장갑 · 신발) — 고유 방어력을 갖고 옵션 세 층을 받는 부위 (2026-09-18) */
    const isArmor = slot => !!slot && slot !== 'weapon' && !baseless(slot);
    /**
     * **무기 죄종 표를 그대로 읽는 부위** — 장갑 [2026-09-17 사용자 ⚠임시 · item_design §1 「장갑 행 = 무기 행을 그대로 쓴다」].
     * 장갑에는 무기 갈래(물리 · 마법사 · 사제)가 없어 `appliesTo` 를 보지 않는다 — 그 죄종의 **모든 행**이 후보다(시기 넷 · 탐욕 셋 중 하나).
     * 구조 상수라 CSV 가 아니라 여기 둔다(INTERFACE §5-3). 장갑 죄종 칸이 기획되면 `armor_sin_option.csv` 에 행을 넣고 여기서 뺀다
     */
    const SIN_FROM_WEAPON = new Set(['gloves']);

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

    /* ── 방어구 옵션 표 (item_design §1 「갑옷 옵션」 · 「투구 옵션」 · 2026-09-18) ── */
    const armorSinOpts = data.armorSinOptions ?? [];
    const armorCommonOpts = data.armorCommonOptions ?? [];
    const ARMOR_SLOTS = (data.slots ?? []).filter(isArmor);
    // 로드 검증 — 무기 표와 같은 이유로 즉시 던진다. 게다가 **부위마다 일곱 죄종이 다 차 있어야 한다** — 한 칸이 비면
    //   그 죄종을 굴린 방어구의 칸이 조용히 비고(소비는 그대로) 아무도 모른다. 장갑은 무기 표를 읽으므로 행이 없어야 한다
    {
        for (const [name, rows] of [['armor_sin_option', armorSinOpts], ['armor_common_option', armorCommonOpts]]) {
            for (const r of rows) {
                if (!ARMOR_SLOTS.includes(r.slot)) throw new Error(`item: ${name} ${r.stat} slot '${r.slot}' 은 방어구 부위가 아니다`);
                if (!SCALES.includes(r.scale)) throw new Error(`item: ${name} ${r.stat} scale '${r.scale}'`);
                if (!(r.max >= r.min)) throw new Error(`item: ${name} ${r.stat} 범위 ${r.min}~${r.max}`);
                if (r.scale === 'band' && typeof r.perIlvl !== 'number') throw new Error(`item: ${name} ${r.stat} band 행에 per_ilvl 이 없다`);
            }
        }
        for (const r of armorSinOpts) {
            if (!data.sins.includes(r.sin)) throw new Error(`item: armor_sin_option 죄종 '${r.sin}'`);
            if (SIN_FROM_WEAPON.has(r.slot)) throw new Error(`item: armor_sin_option 에 ${r.slot} 행이 있다 — ${r.slot} 은 무기 죄종 표를 읽는다`);
            // 반격은 반격을 부른다(평타와 같은 규칙 · INTERFACE §2-6) — 한 출처가 1 이면 양쪽이 끝없이 되받아 친다
            if (r.stat === 'counter_chance' && !(r.max < 1)) throw new Error(`item: armor_sin_option counter_chance max ${r.max} — 1 미만이어야 한다`);
        }
        for (const slot of ARMOR_SLOTS) {
            if (SIN_FROM_WEAPON.has(slot)) continue;
            for (const sin of data.sins)
                if (!armorSinOpts.some(r => r.slot === slot && r.sin === sin)) throw new Error(`item: armor_sin_option 에 ${slot} · ${sin} 행이 없다`);
        }
        for (const r of armorCommonOpts)
            if (r.group !== 'all' && !groupDef(r.slot, r.group)) throw new Error(`item: armor_common_option ${r.stat} group '${r.group}' 은 ${r.slot} 의 갈래가 아니다`);
        for (const slot of ARMOR_SLOTS)
            if (!armorCommonOpts.some(r => r.slot === slot)) throw new Error(`item: armor_common_option 에 ${slot} 행이 없다`);
    }
    /* ── 반지 · 목걸이 옵션 표 (item_design §1 「반지 · 목걸이」 · 2026-09-21 · R127) ── */
    const accSinOpts = data.accessorySinOptions ?? [];
    const accCommonOpts = data.accessoryCommonOptions ?? [];
    const procSkills = data.procSkills ?? [];
    const procRows = data.amuletProcs ?? [];
    const procByBase = Object.fromEntries(procRows.map(r => [r.baseId, r]));
    /** 발동 조건 어휘 — 타격 시 · 피격 시 · n초마다. 구조 어휘라 CSV 가 아니라 여기 둔다(`SCALES` 와 같은 자리) */
    const PROC_TRIGGERS = ['hit', 'struck', 'interval'];
    const ACC_SLOTS = (data.slots ?? []).filter(baseless);
    // 로드 검증 — 방어구 표와 같은 이유로 즉시 던진다. **두 부위마다 일곱 죄종이 다 차 있어야 하고**, 목걸이 베이스마다 발동 조건이 하나 있어야 한다
    {
        for (const [name, rows] of [['accessory_sin_option', accSinOpts], ['accessory_common_option', accCommonOpts]]) {
            for (const r of rows) {
                if (!SCALES.includes(r.scale)) throw new Error(`item: ${name} ${r.stat} scale '${r.scale}'`);
                if (!(r.max >= r.min)) throw new Error(`item: ${name} ${r.stat} 범위 ${r.min}~${r.max}`);
                if (r.scale === 'band' && typeof r.perIlvl !== 'number') throw new Error(`item: ${name} ${r.stat} band 행에 per_ilvl 이 없다`);
            }
        }
        for (const r of accSinOpts) {
            if (!ACC_SLOTS.includes(r.slot)) throw new Error(`item: accessory_sin_option ${r.stat} slot '${r.slot}' 은 반지 · 목걸이가 아니다`);
            if (!data.sins.includes(r.sin)) throw new Error(`item: accessory_sin_option 죄종 '${r.sin}'`);
        }
        for (const slot of ACC_SLOTS) {
            for (const sin of data.sins)
                if (!accSinOpts.some(r => r.slot === slot && r.sin === sin)) throw new Error(`item: accessory_sin_option 에 ${slot} · ${sin} 행이 없다`);
        }
        if (ACC_SLOTS.length && !accCommonOpts.length) throw new Error('item: accessory_common_option 이 비었다');
        const amuletBases = (data.itemBases?.amulet ?? []).map(b => b.id);
        for (const r of procRows) {
            if (!PROC_TRIGGERS.includes(r.trigger)) throw new Error(`item: amulet_proc ${r.baseId} trigger '${r.trigger}'`);
            if (!amuletBases.includes(r.baseId)) throw new Error(`item: amulet_proc '${r.baseId}' 는 목걸이 베이스가 아니다`);
            if (!(r.max >= r.min) || !(r.min > 0)) throw new Error(`item: amulet_proc ${r.baseId} 범위 ${r.min}~${r.max}`);
        }
        if (ACC_SLOTS.includes('amulet'))
            for (const id of amuletBases) if (!procByBase[id]) throw new Error(`item: amulet_proc 에 목걸이 베이스 '${id}' 행이 없다`);
    }
    const accSinRows = (slot, sin) => accSinOpts.filter(r => r.slot === slot && r.sin === sin);

    /** 방어구 죄종 칸 후보 — 그 부위 · 그 죄종의 행. 장갑은 무기 표의 그 죄종 행 **전부**(무기 갈래를 안 본다 · ⚠임시) */
    const armorSinRows = (slot, sin) => (SIN_FROM_WEAPON.has(slot)
        ? sinOpts.filter(r => r.sin === sin)
        : armorSinOpts.filter(r => r.slot === slot && r.sin === sin));
    /** 방어구 공통옵션 후보 — 그 부위이고 `all` 이거나 그 아이템의 갈래인 행. **갈래가 없는 시작 칸은 그 부위의 모든 행**이다 */
    const armorCommonRows = (slot, group) => armorCommonOpts.filter(r => r.slot === slot && (!group || r.group === 'all' || r.group === group));
    /** 그 무기군에 이 행이 붙는가 — `all` · damageKind · 직업 id 중 하나가 맞으면. 시기 칸이 물리 / 마법사 / 사제로 갈리는 자리다 */
    const appliesTo = (row, g) => row.appliesTo === 'all' || row.appliesTo === g.damageKind || (g.classes ?? []).includes(row.appliesTo);

    /**
     * 희귀도 — 가중치 1회. **훑는 순서는 일반 → 매직 → 레어**다 [일반 신설 2026-09-14 · R86 · item_design §1].
     * **매직아이템 획득확률은 레어 가중치에 곱한다** [2026-09-11 · R78 · item_design §1 「무기 옵션」] — 일반·매직 가중치는 안 건드린다.
     * `magicFind` 는 파티 평균(비율)이고 0 이면 종전과 같다 — 굴림 수는 언제나 1회다
     * `weights` `{normal, magic, rare}` 를 주면 드롭 가중치 대신 그것으로 굴린다 — **제작**이 제 가중치를 넘긴다 [2026-09-15 · R96 · item_design §7-1]
     */
    const rollRarity = (rng, magicFind = 0, weights = null) => {
        const w = weights ?? { normal: B.rarity_w_normal, magic: B.rarity_w_magic, rare: B.rarity_w_rare };
        const wn = w.normal, wm = w.magic, wr = w.rare * (1 + magicFind);
        const x = rng() * (wn + wm + wr);
        return x < wn ? 'normal' : x < wn + wm ? 'magic' : 'rare';
    };

    /** 희귀도별 키 고르기 — 일반은 **제 키**를 따로 든다(값은 CSV · 죄종 칸만 없고 개수는 매직과 같은 수로 시작 · 2026-09-14 · R86) */
    const byRarity = (rarity, normal, magic, rare) => rarity === 'rare' ? rare : rarity === 'normal' ? normal : magic;

    /**
     * 값 하나 — 정의의 `scale` 이 정한다 (item_design §2-1):
     *   growth — 굴림 × growthMult(ilvl), 정수 [2026-09-16 사용자 지시 — 장비 옵션은 소수를 두지 않는다]
     *   band   — 굴림 + ilvl × perIlvl, 정수 (비율 축은 완만하게만 오른다)
     *   flat   — 굴림 그대로, **1% 단위**(비율 · `formula.pctOption`). **ilvl 무관** — % 접사가 곡선을 타면 곱셈층이 두 번 자라 후반이 폭주한다
     *            [2026-09-17 · R111] ~~정수~~ — 퍼센트가 비율로 옮겨 가며 「정수」가 「1% 단위」가 됐다(플레이어가 보는 눈금은 같다)
     *   fine   — flat 과 같되 **0.1% 단위**. 1% 보다 작은 값이 남은 유일한 자리다 — 오만 「레벨당 데미지 +%」 한 행뿐이고,
     *            1% 단위로 올리면 만렙 기여가 2~5배로 뛰어 값 대역부터 다시 정해야 한다 (2026-09-16 보류 · 09-17 사용자 대기 · GAME_DESIGN §10)
     */
    const valueOf = (d, roll, ilvl) =>
        d.scale === 'growth' ? Math.max(1, Math.round(roll * F.growthMult(ilvl)))
            : d.scale === 'band' ? Math.max(1, Math.round(roll + ilvl * (d.perIlvl ?? 0)))
                : F.pctOption(roll, d.scale === 'fine');

    /**
     * 퍼센트 채널인가 [2026-09-17 · R111] — 옵션 값이 비율인가 고정값인가를 가른다.
     * 고정값 채널 = 옵션 표의 `growth` · `band` 행 + 옛 무기의 `atk_flat`(R78 에 표에서 빠졌다). **나머지는 전부 퍼센트다**
     */
    //   ~~affixDefs~~ 는 2026-09-21 R127 로 퇴역 — 옛 `affix.csv` 의 고정값 행(`hp_flat` growth)은 장신구 · 신발 표가 같은 이름으로 이어 든다
    const flatStats = new Set([...sinOpts, ...commonOpts, ...armorSinOpts, ...armorCommonOpts, ...accSinOpts, ...accCommonOpts]
        .filter(d => d.scale === 'growth' || d.scale === 'band').map(d => d.stat).concat('atk_flat'));
    const pctStat = stat => !flatStats.has(stat);

    // ~~rollAffixes · affixCount~~ — 2026-09-21 R127 퇴역. 목걸이 · 반지가 마지막 사용자였다 (아래 `accessoryOptions`)

    /**
     * 목걸이 고정 옵션 — **발동 스킬 하나** [2026-09-21 · 사용자 확정 · R127 · item_design §1 「목걸이 고정 옵션」].
     * 발동 조건은 **베이스가 정한다**(`amulet_proc.csv` — rng 0) · 스킬은 `procSkills` 에서 1회 · 값 1회(확률 · 또는 쿨타임 배수 — 0.01 단위).
     * rng 소비(계약 — INTERFACE §5-2): **스킬 1 → 값 1** — 베이스에 행이 없거나 풀이 비어도 2회 그대로다.
     * ⚠ **전투는 이 값을 읽지 않는다**(사용자 지시 — 설명에만) · `affixes` 에 넣지 않아 `computeCombat` 이 합산할 길이 없다
     */
    function amuletProc(rng, baseId) {
        const p = procByBase[baseId] ?? null;
        const sr = rng(), vr = rng();
        if (!p) return null;
        return {
            trigger: p.trigger,
            skill: procSkills.length ? procSkills[Math.floor(sr * procSkills.length)] : null,
            v: F.pctOption(p.min + vr * (p.max - p.min)),
        };
    }

    /**
     * 반지 · 목걸이 옵션 — 죄종 칸 → 공통옵션 [2026-09-21 · 사용자 확정 · R127 · item_design §1 「반지 · 목걸이」] — 순서가 곧 표시 순서다.
     * rng 소비(계약 — INTERFACE §5-2): **방어구와 같은 모양** — 죄종마다 (행 1 → 값 1) → 공통옵션마다 (종류 1 → 변형 1 → 값 1).
     * 고정 층은 반지에 없고 목걸이는 `amuletProc` 가 따로 든다(`affixes` 밖). ⚠ 후보가 비어도 소비 수는 같다
     */
    function accessoryOptions(rng, slot, sins, rarity, ilvl) {
        const out = [];
        // 죄종 칸 — 이름의 죄종마다 하나. 한 칸에 후보가 여럿이면(반지 시기 다섯 · 목걸이 시기 둘 · 탐욕 셋) 그중 하나를 균등으로 굴린다
        for (const sin of sins) {
            const rows = accSinRows(slot, sin);
            const pr = rng(), vr = rng();
            if (!rows.length) continue;
            const d = rows[Math.floor(pr * rows.length)];
            out.push({ stat: d.stat, v: valueOf(d, d.min + vr * (d.max - d.min), ilvl), src: sin });
        }
        // 공통옵션 — 두 부위 한 풀. **종류를 먼저 뽑고 그 안에서 변형**(원소 ×4 · 상태이상 ×4 가 행 수만큼 비중을 먹지 않게) · 같은 종류는 한 번
        const families = [...new Set(accCommonOpts.map(r => r.family))];   // 첫 등장 순 = CSV 행 순서
        const n = byRarity(rarity, B.accessory_common_opt_normal, B.accessory_common_opt_magic, B.accessory_common_opt_rare);
        for (let i = 0; i < n; i++) {
            const fr = rng(), sr = rng(), vr = rng();
            if (!families.length) continue;
            const fam = families.splice(Math.floor(fr * families.length), 1)[0];
            const variants = accCommonOpts.filter(r => r.family === fam);
            const d = variants[Math.floor(sr * variants.length)];
            out.push({ stat: d.stat, v: valueOf(d, d.min + vr * (d.max - d.min), ilvl), src: 'random' });
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
        const out = [{ stat: 'atk_pct', v: F.pctOption(lo + rng() * (hi - lo)), src: 'fixed' }];
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
        const n = byRarity(rarity, B.weapon_common_opt_normal, B.weapon_common_opt_magic, B.weapon_common_opt_rare);
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
     * 방어구 옵션 세 층 [2026-09-18 · 사용자 확정 · item_design §1 「갑옷 옵션」 · 「투구 옵션」 · 네 부위 같은 틀] — 순서가 곧 표시 순서(고정 → 죄종 칸 → 공통).
     * rng 소비(계약 — INTERFACE §5-2): **무기와 같은 모양** — 고정 값 1 → 죄종마다 (행 1 → 값 1) → 공통옵션마다 (종류 1 → 변형 1 → 값 1).
     * ⚠ **후보가 비어도 소비 수는 같다** — 부위 · 갈래 · 표 내용이 소비 수를 바꾸면 같은 시드가 다른 드롭을 낸다.
     *   고정 「방어력 +%」(`armor_def_pct`)는 **그 아이템 자신의 고유 방어력에만** 곱한다 — 합산은 `hero.computeCombat` 이 아이템마다 한다
     */
    function armorOptions(rng, slot, group, sins, rarity, ilvl) {
        const lo = B.armor_fixed_def_pct_min, hi = B.armor_fixed_def_pct_max;
        const out = [{ stat: 'armor_def_pct', v: F.pctOption(lo + rng() * (hi - lo)), src: 'fixed' }];
        // 죄종 칸 — 이름의 죄종마다 하나. 한 칸에 후보가 여럿이면(탐욕 셋 · 투구 시기 원소 넷 · 장갑 시기 넷) 그중 하나를 굴린다
        for (const sin of sins) {
            const rows = armorSinRows(slot, sin);
            const pr = rng(), vr = rng();
            if (!rows.length) continue;
            const d = rows[Math.floor(pr * rows.length)];
            out.push({ stat: d.stat, v: valueOf(d, d.min + vr * (d.max - d.min), ilvl), src: sin });
        }
        // 공통옵션 — **종류를 먼저 뽑고 그 안에서 변형**(원소 ×4 · 종족 ×3 이 행 수만큼 비중을 먹지 않게). 한 아이템에 같은 종류는 한 번
        const rows = armorCommonRows(slot, group);
        const families = [...new Set(rows.map(r => r.family))];      // 첫 등장 순 = CSV 행 순서
        const n = byRarity(rarity, B.armor_common_opt_normal, B.armor_common_opt_magic, B.armor_common_opt_rare);
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
     * 부위 고유값(Implicit) — 방어구만 든다 (무기는 피해 범위 — 파생 `weaponDamage` · 목걸이·반지는 없다).
     * 방어는 **비율 축**이라 곱셈 곡선을 타지 않는다 (§9-0) — ~~ilvl 완만 가산~~ → **10레벨 구간 직선**(2026-09-16 · R107).
     * **부위 배수** [2026-09-16 사용자 확정] — 갑옷 2.0 · 투구 1.0 · 장갑 0.6 · 신발 0.6(`armor_def_slot_*`).
     * **갈래 계수는 부위마다** [개정 2026-09-18 — ~~갑옷군 배수는 갑옷 칸에만~~] — 갑옷 중갑 1.6 · 경갑 1.0 · 로브 0.5 /
     *   투구 플레이트 1 · 가죽 0.4 · 티아라 0.2 / 장갑 · 신발 1 · 가죽 1/3 (`armor_group.csv:def_mult` · 시작 칸은 갈래가 없어 1).
     * ~~개체 편차 1회~~ **2026-09-18 폐지** — 개체차는 고정 옵션 「방어력 +%」가 든다. **rng 를 안 쓴다**.
     * 값은 **정수**다 [2026-09-16 사용자 지시] — 표기 = 계산.
     */
    function implicitFor(slot, ilvl, group = null) {
        if (!isArmor(slot)) return null;
        const slotMult = B[`armor_def_slot_${slot}`];
        if (typeof slotMult !== 'number') throw new Error(`item: balance.csv 에 'armor_def_slot_${slot}' 이 없다`);
        const gm = groupDef(slot, group)?.defMult ?? 1;
        return { stat: 'def_flat', v: Math.max(1, Math.round(F.armorDefense(ilvl, slotMult, gm))) };
    }

    /**
     * base = 무기면 무기군 정의, 아니면 {ko,en} 이름.
     * opts.avoidSkill = (무기) 스킬 풀에서 뺄 id — 시작 무기가 그 영웅의 고유 스킬과 겹치지 않게 (2026-09-14 · R86). 빼도 소비 수는 같다.
     * opts.weaponBase = (무기) 세부 베이스 고정 — 제작이 레벨의 베이스를 넘긴다(2026-09-21 · `weaponBaseAt`). **베이스 굴림은 1회 그대로 소비한다**(값만 안 쓴다).
     * rng 소비 순서(계약 — INTERFACE §5-2): (매직·레어) 접두 죄종 → (레어) 접미 죄종 →
     *   **(무기) 옵션 세 층**(`weaponOptions`) / **(방어구) 옵션 세 층**(`armorOptions` · 2026-09-18) /
 *   **(목걸이 · 반지) 옵션 세 층** [2026-09-21 · R127 — ~~접사 수 → 접사마다 (정의 선택 → 값)~~] — (목걸이) 발동 스킬 1 → 값 1 → `accessoryOptions` →
     *   **(무기) 베이스 1회** [신설 2026-09-10] → **(무기) 스킬 1회** · ~~(방어구) 개체 굴림 1회~~ **2026-09-18 삭제** · ~~(무기) 공격력 개체 굴림~~ **2026-09-14 삭제**(R90)
     *   ~~(마법 무기) 원소~~ 는 **2026-09-11 삭제**(R80) — 마법 무기에서 소비 1회가 빠졌다
     */
    function build(rng, slot, rarity, ilvl, base, opts = {}) {
        // 죄종 수는 희귀도가 정한다 — 일반 0 · 매직 1 · 레어 2 (item_design §1 확정 2026-09-11 · 계승 TheSevenRPG 규칙 채택 · 일반 2026-09-14 R86).
        //   **일반은 접두도 굴리지 않는다** — 레어가 접미를 한 번 더 굴리는 것과 같은 규칙이다(희귀도가 소비 수를 정한다 · INTERFACE §5-2).
        //   ~~레어 접미 확률 판정(suffix_sin_chance_pct)~~ 은 08-25 초반 루프의 임시값이라 걷었다 — 판정 rng 1회가 함께 빠졌다
        //   이름 단어의 단 번호는 같은 굴림의 소수부에서 낸다(`pickSin`) — 소비 수는 그대로다 (2026-09-19)
        const pre = rarity === 'normal' ? null : pickSin(rng, data.sins);
        const prefix = pre?.sin ?? null;
        const suf = rarity === 'rare' ? pickSin(rng, data.sins.filter(s => s !== prefix)) : null;
        const suffix = suf?.sin ?? null;
        const sins = [prefix, suffix].filter(Boolean);
        const words = [pre, suf].filter(Boolean).map(x => x.word);
        // 목걸이 고정 옵션(발동 스킬)은 **죄종 칸보다 앞**에서 굴린다 — 무기 · 방어구의 고정 옵션이 죄종 칸 앞인 것과 같은 자리 (2026-09-21 · R127)
        const proc = slot === 'amulet' ? amuletProc(rng, base?.id) : null;
        const item = {
            uid: null,
            slot, rarity, ilvl,
            up: 0,                             // 강화 단계 — 드롭은 굴리지 않는다. 올리는 것은 upgrade 하나뿐
            name: N.composeName(prefix, base, suffix, words),
            implicit: null,
            // 무기(R78) · 방어구(2026-09-18) · 목걸이 · 반지(2026-09-21 · R127)는 세 층 — 셋 다 베이스 · 스킬 굴림보다 **앞**에서 굴린다 (§5-2)
            affixes: slot === 'weapon' ? weaponOptions(rng, base, sins, rarity, ilvl)
                : isArmor(slot) ? armorOptions(rng, slot, base?.group ?? null, sins, rarity, ilvl)
                    : accessoryOptions(rng, slot, sins, rarity, ilvl),
            sins,
            words,                             // 이름의 죄종 단어 — sins 와 같은 길이 (2026-09-19)
        };
        if (proc) item.proc = proc;            // 목걸이만 — 행이 없는 베이스(검증이 막는다)면 키가 없다
        if (slot === 'weapon') {
            item.group = base.id;
            // 무기 베이스 — 이름이 실제로 갈리는 무기군만 풀이 있다(weapon_base.csv · 지금 본편 열 전부 — 스태프·오브·십자가·성경·석궁 2026-09-14 · 확장 둘은 없다).
            //   드롭되는 레벨·성격(A/B/C)은 아직 안 갈라 **대역 전부에서 균등 굴림**이다(item_design §1 대역 경계 미정).
            // ⚠ **풀이 비어도 1회 소비한다** — 스킬 굴림과 같은 이유로, 소비 수가 무기군에 의존하면 같은 시드가 다른 드롭을 낸다
            const bases = data.weaponBases?.[base.id] ?? [];
            const br = rng();
            // `opts.weaponBase` — 제작이 고른 레벨의 베이스(2026-09-21). 굴림은 위에서 이미 1회 소비했다 — 소비 수가 경로에 의존하지 않게
            const wbase = opts.weaponBase ? bases.find(b => b.id === opts.weaponBase) ?? null
                : bases.length ? bases[Math.floor(br * bases.length)] : null;
            if (wbase) {
                item.baseId = wbase.id;
                item.name = N.composeName(prefix, wbase, suffix, words);  // 이름은 베이스 이름으로 다시 조립 — 무기군 이름을 덮는다
            }
            // ~~무기 공격력 = 밑수 × 성장 곡선 × 개체 편차~~ **2026-09-14 폐지 · R90** (battle_design §9-1) — 무기 피해는 박지 않는다.
            //   범위는 무기군 × ilvl × 강화 단계가 정하고(`weaponDamage` · formula.weaponDamage) **rng 소비 1회가 빠졌다**(INTERFACE §5-2)
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
            // `opts.avoidSkill` — 그 id 를 풀에서 뺀다(시작 무기 ↔ 고유 스킬 · 2026-09-14 사용자 지시 · R86). 빼도 **소비는 1회 그대로**고,
            //   빼서 풀이 비면(한 개짜리 풀) 원래 풀에서 굴린다 — 지금 본편 직업 풀은 전부 여러 개라 이 분기는 안 탄다
            const full = classSkills[base.classes?.[0]] ?? [];
            const kept = opts.avoidSkill ? full.filter(s => s !== opts.avoidSkill) : full;
            const pool = kept.length ? kept : full;
            const sr = rng();
            item.skill = pool.length ? pool[Math.floor(sr * pool.length)] : null;
        } else {
            // 방어구 갈래 — 네 부위가 든다 (item_base.csv:group · 갑옷군 2026-09-16 · 투구 2026-09-17 · 장갑 · 신발 2026-09-18). 시작 칸은 없다.
            //   무기의 `group`(무기군)과 같은 필드를 쓴다 — 슬롯이 둘을 가른다(갈래 id 는 부위마다 겹친다 — `leather`)
            if (base?.group) item.group = base.group;
            // 베이스 id — **무기와 같은 필드**(`baseId`)다 [2026-09-17]. 베이스는 rollGear 가 이미 굴렸고(소비 불변)
            //   여기서는 이름만 쓰던 것을 id 로 같이 남긴다 — 화면이 베이스마다 다른 그림을 고를 수 있게 된다(ui/mock.js:itemArt)
            if (base?.id) item.baseId = base.id;
            item.implicit = implicitFor(slot, ilvl, base?.group ?? null);     // rng 0 — 개체 편차 폐지 (2026-09-18)
        }
        return item;
    }

    /**
     * 그 ilvl 에서 뜨는 베이스 후보 [2026-09-18 · 사용자 확정 · item_design §1 「베이스 — 시작 1 + 갈래 3 × 티어 3」] —
     * 열린(`tierMin ≤ ilvl`) 행 중 **`tierMin` 이 가장 높은 행들**만이다. 방어구는 그 티어의 갈래 셋(투구 · 갑옷) · 둘(장갑 · 신발)이고
     * 시작 칸(클로스 · 부츠)은 ilvl 이 첫 티어 아래일 때만 뜬다. 목걸이 · 반지는 전부 1 이라 전 행이다. **행 순서는 CSV 그대로**(결정론)
     */
    function tierBases(slot, ilvl) {
        const open = (data.itemBases[slot] ?? []).filter(b => (b.tierMin ?? 1) <= ilvl);
        const top = Math.max(...open.map(b => b.tierMin ?? 1));
        return open.filter(b => (b.tierMin ?? 1) === top);
    }

    /**
     * 그 부위 · 그 ilvl 에서 `rollGear` 가 베이스를 굴리는 후보 [신설 2026-09-21 · 제작의 종류 목록 · item_design §7-1] —
     * 무기 = 드롭 무기군(`{id, ko, en}` — id 는 무기군) · 무기 외 = `tierBases`(`{id, ko, en, group}`). **순서는 굴림이 인덱스를 쓰는 순서 그대로**. rng 0
     */
    function basesAt(slot, ilvl) {
        return slot === 'weapon'
            ? dropGroups.map(g => ({ id: g.id, ko: g.ko, en: g.en }))
            : tierBases(slot, ilvl).map(b => ({ id: b.id, ko: b.ko, en: b.en, group: b.group ?? null }));
    }

    /**
     * 그 무기군에서 그 제작 레벨에 나오는 세부 베이스 [신설 2026-09-21 · 사용자 지시 「레벨 바꾸면 그 레벨의 아이템」 · item_design §7-1] —
     * `make_level ≤ level` 인 행 중 **`make_level` 이 가장 높은 것 하나**(`weapon_base.csv:make_level`). 없으면 null. rng 0 · 새 객체.
     * ⚠ 제작만 읽는다 — 드롭은 여전히 무기군 안 7개에서 균등으로 굴린다(`build`)
     */
    function weaponBaseAt(groupId, level) {
        const open = (data.weaponBases?.[groupId] ?? []).filter(b => b.makeLevel <= level);
        if (!open.length) return null;
        const b = open.reduce((a, x) => (x.makeLevel > a.makeLevel ? x : a));
        return { id: b.id, ko: b.ko, en: b.en };
    }

    /**
     * **한 벌** — 주어진 부위마다 아이템 하나 [신설 2026-09-11 · R79 · monster_design §5-1 · item_design §1].
     * 몬스터가 **입고 있는** 장비가 이것이고, 처치 드롭은 그중 하나가 **그대로** 나간다(2단계 = 입은 부위 중 하나).
     * rng 소비 순서(계약 — INTERFACE §5-2): 부위 배열 순서대로 — 베이스(무기는 `weaponGroup` 을 주면 **0회**) → 희귀도 1 → `build`.
     *   ⚠ **부위 배열 순서가 계약이다** — 같은 부위 묶음이라도 순서가 바뀌면 같은 시드가 다른 한 벌을 낸다.
     * @param opts `{slots, ilvl, magicFind?, rareBonusPct?, weaponGroup?, rarityWeights?}`
     *   · `magicFind` 파티 평균(비율) · `rareBonusPct` 등급이 미는 레어 가중(비율 · `spawn_grade.csv:gear_rare_bonus_pct`) — **둘은 같은 채널**이다
     *   · `weaponGroup` 무기군 고정. 몬스터는 제 무기군(`monster.csv:weapon_group`)을 들고, 안 주면 본편 무기군에서 굴린다
     *   · `itemBase` 무기 외 베이스 고정(`itemBases` 의 id — **소비 0**). 제작이 고른 종류를 넘긴다(2026-09-21) · 후보 밖인지는 부르는 쪽이 본다
     *   · `weaponBase` 무기 세부 베이스 고정(`weaponBases` 의 id) — `build` 로 넘긴다. **소비는 그대로**(베이스 굴림 1회를 하고 값만 버린다 · 2026-09-21)
     *   · `rarityWeights` 희귀도 가중치 `{normal, magic, rare}` — 제작이 넘긴다(없으면 드롭 가중치 · 굴림 수 불변 · R96)
     */
    function rollGear(rng, opts) {
        const { slots, ilvl } = opts;
        const rareBonus = (opts.magicFind ?? 0) + (opts.rareBonusPct ?? 0);
        const out = [];
        for (const slot of slots) {
            // 무기군을 지정받으면 굴리지 않는다 — 그 몬스터가 어느 무기를 드는지는 데이터가 정한다(드롭 편향의 단위)
            // 무기 외는 **그 ilvl 의 티어 행**에서 굴린다(2026-09-18) — 후보만 좁고 소비는 1회 그대로다 · `itemBase` 를 받으면 굴리지 않는다(제작 · 2026-09-21)
            const base = slot === 'weapon'
                ? (opts.weaponGroup ? WG[opts.weaponGroup] : pick(rng, dropGroups))
                : opts.itemBase ? (data.itemBases[slot] ?? []).find(b => b.id === opts.itemBase)
                    : pick(rng, tierBases(slot, ilvl));
            if (!base) throw new Error(`item: rollGear 부위 '${slot}' 의 베이스가 없다`);
            out.push(build(rng, slot, rollRarity(rng, rareBonus, opts.rarityWeights), ilvl, base, { weaponBase: opts.weaponBase }));
        }
        return out;
    }

    /**
     * 드롭 1개 — 부위 균등, 희귀도 가중치, ilvl 은 호출자가 준다.
     * `opts.magicFind` = 파티 평균 매직아이템 획득확률(비율) — 레어 가중치에 곱한다(없으면 0 · 굴림 수 불변 · 2026-09-11 R78)
     * ⚠ **게임 경로에서는 더 안 불린다** [2026-09-11 · R79] — 처치 드롭이 「입고 있던 장비」로 바뀌어 부위를 굴리지 않는다.
     *   검증·골든이 파이프라인 전체(부위 → 베이스 → 희귀도 → `build`)를 한 입구로 재는 자리로 남는다. **수열은 종전과 같다.**
     */
    function rollDrop(rng, ilvl, opts = {}) {
        const slot = pick(rng, data.slots);
        return rollGear(rng, { slots: [slot], ilvl, magicFind: opts.magicFind ?? 0 })[0];
    }

    /** 시작 무기 — **그 직업의 스킬이 붙는 무기군**에서 ilvl 1 **일반** 1개 (무기가 밑수라 빈손이면 세기가 성립하지 않는다).
     *  ~~매직~~ → 일반 [2026-09-14 사용자 확정 · R86 · hero_design §1] — 시작 장비는 일반 무기 + 일반 갑옷이다.
     *  `avoidSkill` = 그 영웅의 고유 스킬 — 무기가 **같은 스킬을 담지 않는다**(액티브 두 칸에 한 스킬이 서지 않게). 소비 수는 같다.
     *  09-10 장착 개방 뒤에도 시작만은 자기 직업 무기로 준다 — 첫 무기 칸에 제 직업 스킬이 서야 직업이 무엇인지 읽힌다.
     *  갈아 끼우는 것은 자유다(`canEquip` 은 아무것도 거절하지 않는다). */
    function startingWeapon(rng, cls, avoidSkill = null) {
        const gs = groupsFor(cls);
        return build(rng, 'weapon', 'normal', 1, gs.length ? pick(rng, gs) : pick(rng, dropGroups), { avoidSkill });
    }

    /** 시작 갑옷 — ilvl 1 **일반** 1개 [신설 2026-09-14 사용자 확정 · R86]. 베이스는 **ilvl 1 의 티어 행**에서 1회 → `build`.
     *  ilvl 1 은 첫 티어 아래라 후보가 **클로스 아머 하나**다 [2026-09-18 · 티어 게이트] — 소비는 1회 그대로다.
     *  ⚠ 직업 맞춤이 없다 — 갑옷군(중갑 · 경갑 · 로브)과 직업을 잇는 데이터가 아직 없다(GAME_DESIGN §10 갑옷군) */
    function startingArmor(rng) {
        const base = pick(rng, tierBases('armor', 1));
        if (!base) throw new Error('item: startingArmor — 갑옷 베이스가 없다');
        return build(rng, 'armor', 'normal', 1, base);
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

    // 일반의 반환량은 **기획 보류**(2026-09-14 사용자) — 키를 발행하지 않아 매직 값을 따른다(가루는 제작 재료 — item_design §7-1 · 반환량은 §5-3 미정)
    const salvageDust = item => item.rarity === 'rare' ? B.salvage_dust_rare : B.salvage_dust_magic;

    /* ── 강화 (item_design §7-2 개정 2026-09-15 · R95) ── */

    /**
     * 무기 피해 범위 `{min, max}` — **파생**이다 [신설 2026-09-14 · R90 · battle_design §9-1]. 무기가 아니면 null.
     * 강화 배율까지 든 값이다 — 식은 `formula.weaponDamage` 하나다(전투는 hero.computeCombat 이 같은 함수를 부른다).
     * 무기군을 모르면 전역 폭(`dmg_variance_pct`)으로 낸다 — 전투 쪽과 같은 규칙
     */
    const weaponDamage = item => (item?.slot === 'weapon' ? F.weaponDamage(item.ilvl, WG[item.group] ?? null, item.up) : null);

    /**
     * 무기 피해 범위에 **고정 옵션 「데미지 +%」**(`src: 'fixed'` 의 `atk_pct`)를 먹인 값 [2026-09-23 사용자 지시] — 아이템 툴팁 메인 옵션이 부른다.
     * 양끝마다 곱하고 한 번 반올림한다 — `hero.computeCombat` 의 괄호 곱과 같은 규칙. 다른 % (죄종 칸 · 랜덤 · 마스터리 · 도감)는 안 든다 —
     * 그 합은 영웅이 정하는 괄호라 캐릭터 시트가 든다. 고정 줄이 없는 옛 무기는 `weaponDamage` 그대로
     */
    function weaponDamageFixed(item) {
        const d = weaponDamage(item);
        if (!d) return null;
        const pct = (item.affixes ?? []).reduce((s, a) => s + (a.src === 'fixed' && a.stat === 'atk_pct' ? a.v : 0), 0);
        return pct ? { min: Math.round(d.min * (1 + pct)), max: Math.round(d.max * (1 + pct)) } : d;
    }

    /**
     * 방어구 고유값에 **고정 옵션 「방어력 +%」**(`armor_def_pct`)를 먹인 값 `{stat, v}` [2026-09-23 사용자 지시] — 툴팁 메인 옵션 · 제련소가 부른다.
     * 강화 배율까지 든다(`effective`). 곱한 뒤 정수 — `hero.computeCombat` 이 아이템마다 하는 곱과 **같은 판정 · 같은 반올림**이다
     * (그 아이템의 `armor_def_pct` 를 출처와 무관하게 더한다 — 이 stat 은 고정 줄에만 선다). 고유값이 없으면(무기 · 목걸이 · 반지) null
     */
    function implicitFixed(item) {
        const imp = effective(item)?.implicit;
        if (!imp) return null;
        const pct = (item.affixes ?? []).reduce((s, a) => s + (a.stat === 'armor_def_pct' ? a.v : 0), 0);
        return pct ? { ...imp, v: Math.round(imp.v * (1 + pct)) } : imp;
    }

    const upgradeMax = () => B.equip_upgrade_max;

    /** 베이스 능력치가 있는 부위인가 — 목걸이 · 반지는 강화하지 않는다 (item_design §7-2 · R95). 부위만 본다 */
    const upgradeable = item => !baseless(item?.slot);

    /** 다음 한 단계의 골드. 상한이거나 강화 대상이 아니면 null — 비용은 단계마다 기하로 붙는다.
     *  `max` = 그 세이브의 강화 상한 — 게임은 `state.limitsOf(state).upgrade` 를 넘긴다 · 안 주면 CSV 기본값 [balance.csv:equip_upgrade_max] (2026-09-22) */
    function upgradeCost(item, max = B.equip_upgrade_max) {
        const up = item.up ?? 0;
        if (!upgradeable(item) || up >= max) return null;
        return Math.round(B.equip_upgrade_gold_base * Math.pow(B.equip_upgrade_gold_growth, up));
    }

    /**
     * 강화 1단계 — **in-place**. 상한 · 부위 검사는 호출자(state.js)가 한다.
     * **rng 를 안 쓰고 접사를 건드리지 않는다** — 베이스는 `up` 에서 파생하므로 올릴 것이 `up` 하나뿐이다.
     * ~~3강마다 접사 하나의 값을 올린다~~ 는 2026-09-15 퇴역 (R95 — 옵션 쪽 성장은 크래프트 · item_design §7-3)
     */
    function upgrade(item) {
        item.up = (item.up ?? 0) + 1;
        return { up: item.up };
    }

    /**
     * 읽기용 사본 — **방어구 고유값**에 강화 배율을 먹인다. 접사는 값이 이미 박혀 있어 손대지 않는다.
     * `up` 이 0 이거나 고유값이 없으면(무기 · 목걸이 · 반지) **원본을 그대로** 돌려준다 — 전투·렌더가 매번 부르는 자리라 할당을 아낀다.
     * 무기 피해는 사본에 안 싣는다 — `weaponDamage` 가 `up` 을 받아 따로 낸다 (R90)
     * 강화까지 먹인 값도 **정수**다 [2026-09-16] — 무기 피해 양끝과 같은 규칙(곱을 다 한 뒤 한 번 반올림).
     */
    function effective(item) {
        if (!item || !(item.up > 0) || !item.implicit) return item;
        return { ...item, implicit: { ...item.implicit, v: Math.round(item.implicit.v * F.upgradeMult(item.up)) } };
    }

    return { rollDrop, rollGear, basesAt, weaponBaseAt, startingWeapon, startingArmor, pctStat, canEquip, groupOf, groupsFor, salvageDust, upgradeMax, upgradeable, upgradeCost, upgrade, effective, weaponDamage, weaponDamageFixed, implicitFixed };
}
