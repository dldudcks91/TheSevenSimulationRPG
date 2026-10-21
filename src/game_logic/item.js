/**
 * 아이템 시스템 — 드롭 굴림 / 시작 장비(무기 · 갑옷) / 착용 규칙 / 분해 / 강화.
 *
 * 순수 모듈. 데이터는 생성자 주입, 난수는 rng 인자.
 *
 * 아이템 = { uid, slot, rarity, ilvl, up(강화 단계), name:{ko,en}, implicit:{stat,v}|null, affixes:[{stat,v,src}], sins:[sin...],
 *            words:[단 번호...](이름에 쓴 죄종 단어 — sins 와 같은 길이 · 2026-09-19),
 *            group?(무기군 id — weapon_group.csv),
 *            ~~skill?~~(무기가 담은 액티브 id — 2026-09-29 R179 삭제 · 스킬북),
 *            baseId?(베이스 id — 무기는 weapon_base.csv(그 무기군에 풀이 있을 때만 · 2026-09-10) · 방어구 · 장신구는 item_base.csv(2026-09-17)),
 *            proc?(목걸이 고정 옵션 = 발동 스킬 `{trigger, skill, v}` — 목걸이만 · 2026-09-21 · ⚠ 전투는 안 읽는다) }
 *   표시 문자열은 name 하나뿐이다 — 접사는 stat id + 숫자로 들고 다니고 단위 붙이기는 렌더러가 한다.
 *   name 은 `sins` · `words` · 베이스로 조립한 **결과**다 — 죄종 단어의 자리는 `words` 와 naming.sinPhrase 가 다시 낸다.
 *   (CSV 로 이사할 때 stat id 가 곧 combat_stat.csv 의 키가 된다)
 *   무기의 행동 주기·공격 타입·착용 직업은 아이템에 박지 않는다 — 매번 무기군(group)에서 읽는다. SSOT 는 weapon_group.csv.
 *
 * **접사는 출처(`src`)를 든다** [2026-09-11 · R78 · item_design §1 「무기 옵션」] — `fixed`(고정 옵션) · 죄종 id(죄종 칸) · `random`(통합옵션).
 *   **무기 · 갑옷은 죄종 계열표로 받는다** [2026-10-05 · 사용자 확정 · R206 · R208 · R209 · R210 · item_design §1 「무기 옵션 — 죄종 계열」 — ~~세 층(고정 · 죄종 칸 · 통합)~~] —
 *   고정 1 + **메인 줄**(이름의 죄종마다 그 계열 셋 중 하나 — 반드시 · 일반 0 · 매직 1 · 레어 2) + **랜덤 줄**(계열표 21 옵션 중 아직 안 붙은 것에서 ·
 *   같은 계열이 겹쳐도 된다). 대역은 하나 · **발동은 아이템당 하나**.
 *   **랜덤 줄은 칸마다 붙을지 굴린다** [2026-10-20 · 사용자 확정 · R291 · item_design §1 희귀도 — ~~줄 수 `item_lines_*` · 반지는 랜덤 하나 더~~(10-18 R285)] —
 *   일반 · 매직 · 레어 모두 랜덤 칸 [balance.csv:item_random_slots] · 전 부위 같다(`randomSlots` · ~~일반 0~~ 2026-10-21 R297).
 *   앞의 [balance.csv:item_random_min] 칸은 늘 붙고(R297) 나머지 칸마다 붙을 확률은 아이템 레벨 따라 오른다(`slotChance` · `slotOn`).
 *   **값 굴림은 아이템 레벨 따라 치우친다 — 범위는 그대로** [2026-10-20 · R291 · item_design §2-1 — ~~매직 고점 `magic_option_max_mult`~~ 퇴역] —
 *   1레벨 = 낮은 쪽 · 만렙 = 높은 쪽(`lean` · [balance.csv:item_roll_skew]). **반지 · 목걸이는 일반이 없다**(`rollGear` 가 매직으로 올린다).
 *   두 줄 모두 `src` 에 그 옵션의 죄종 id 를 든다. 무기 표 `weapon_sin_option.csv` · 갑옷 표 `armor_sin_option.csv` 의 갑옷 행. ~~`weapon_common_option.csv`~~ 퇴역.
 *   **발동 옵션**(`proc_*`)은 `affixes` 줄에 스킬 id(`skill`)를 함께 든다 — ⚠ 목걸이 `proc` 처럼 **전투는 안 읽는다**(설명에만 · GAME_DESIGN §10).
 *   **방어구 넷 모두 죄종 계열표다** [투구 2026-10-21 R299 · 장갑 · 신발 2026-10-21 R303 · item_design §1 「10-21 방어구 개정」 — ~~투구 · 장갑 · 신발 세 층 ·
 *   공통옵션 `armor_common_option.csv`~~(09-18 · 파일째 퇴역)] — 부위마다 표 하나 · 갈래가 표를 가르지 않는다.
 *   **갈래는 방어 계수 + 굴리는 고정 특성**(`armor_group.csv:trait_*` · 투구 · 장갑 · 신발) — 특성은 고정 「방어력 +%」 바로 뒤에 `src: 'fixed'` 줄로 박힌다(R303).
 *   **오만은 부위마다 한 칸 · 장갑 시기도 한 칸**(`singleOption`) · **특정 스킬 +n 은 장비에서 뺐다**(2026-10-21 — 표에 서면 로드가 던진다 · 옛 아이템의 줄은 `skillPlusOf` 가 그대로 읽는다).
 *   **목걸이 · 반지도 세 층이다** [2026-09-21 · 사용자 확정 · R127 · item_design §1 「반지 · 목걸이」] — 죄종 칸 `accessory_sin_option.csv` +
 *   공통옵션 `accessory_common_option.csv`(두 부위 한 풀 · 랜덤 칸 — 위). 반지는 고정이 없고(~~그만큼 랜덤 줄이 하나 더~~ 2026-10-20 — 칸 수는 같다),
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
 *   **단계마다 성공 확률이 있다** [2026-10-14 사용자 · R253] — `upgradeChance` 가 `upgrade_chance.csv` 에서 답한다. 굴림은 여기가 아니라
 *   `state.upgradeItem` 이 한다(제 스트림) — 실패하면 비용만 나가고 `up` 은 그대로다(파괴 · 하락 없음).
 *
 * ⚠ 접사 종류·수치 범위·희귀도 가중치는 전부 프로토타입 임시값 — balance.csv ⚠제안 키와
 *   주입된 무기 · 방어구 · 장신구 옵션 표에서 온다.
 *   ⚠ 장갑의 공통옵션 풀은 옛 `affix.csv` 장갑 풀을 옮긴 임시다(기획 미정 · 2026-09-18 사용자 보류) · 장갑 갈래 고정값도 보류다.
 *   ⚠ **발동 스킬(`item.proc` · 무기 · 갑옷의 `proc_*` 줄)은 설명에만 나온다** [사용자 지시 2026-09-21 · 2026-10-05] — 세기 · 내부 쿨타임이 미정이라 전투가 읽지 않는다(GAME_DESIGN §10).
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
 *   ~~classSkills · starterSkills~~ — 2026-09-29 R179 퇴역(무기가 스킬을 안 담는다 — skill_design §2-1 스킬북)
 *   ~~affixDefs~~ — 2026-09-21 R127 퇴역(`affix.csv` 삭제 — 마지막 사용자였던 목걸이 · 반지가 아래 세 표로 옮겼다)
 *   accessorySinOptions    — [{slot, sin, stat, scale, min, max, perIlvl?}] ← accessory_sin_option.csv — 반지 · 목걸이 죄종 칸 후보 (2026-09-21).
 *                            한 부위 · 한 죄종에 행이 여럿이면 그중 하나를 굴린다(반지 시기 다섯 · 목걸이 시기 둘 · 탐욕 셋) · **행 순서가 결정론 계약**
 *   accessoryCommonOptions — [{family, stat, scale, min, max, perIlvl?}] ← accessory_common_option.csv — **두 부위 한 풀** (2026-09-21) · **행 순서가 결정론 계약**
 *   amuletProcs  — [{baseId, trigger, min, max}] ← amulet_proc.csv — 목걸이 베이스마다 발동 조건 하나(`hit` · `struck` · `interval`)
 *   procSkills   — [skillId] ← skill.csv:amulet_pool = 1 — 목걸이 발동 스킬 후보(직업을 안 가리는 한 풀) · **행 순서가 결정론 계약**
 *   weaponSinOptions    — [{sin, option, appliesTo, stat, scale, min, max}] ← weapon_sin_option.csv — **죄종 계열표** (2026-09-11 · R78 · 계열표 2026-10-05 · R206).
 *                         `appliesTo` = `all` · 무기군 `damageKind`(physical/magic) · 직업 id(그 무기군의 classes 에 있으면).
 *                         옵션 = (죄종, `option`) · 같은 옵션에서 그 무기군에 붙는 행 여럿 = 변형 · **행 순서가 결정론 계약**
 *   ~~weaponCommonOptions~~ — 2026-10-05 R206 퇴역(`weapon_common_option.csv` 삭제 — 무기 옵션은 전부 죄종 계열 중 하나다)
 *   procSkillDefs — [{id, cls, tier, tags, target, …}] ← skill.csv 의 직업 스킬 — **발동 옵션**의 스킬 풀을 여기서 짓는다 (2026-10-05 · R206) · **행 순서가 결정론 계약**.
 *                  ~~특정 스킬 +n 풀(`armorPool` · `buffPool`)~~ — 2026-10-21 R303 장비에서 뺐다(유니크 논의 대기 · 안 읽는다)
 *   armorGroups  — {slot: {groupId: {defMult, aspdPct, cdrPct, trait, …}}} ← armor_group.csv — **부위 → 갈래** (갑옷군 2026-09-16 · 투구 · 장갑 · 신발 2026-09-18).
 *                  고유 방어력의 갈래 계수(`defMult`)를 여기서 읽는다 — 갈래 id 는 부위마다 겹친다(`leather`).
 *                  `trait` = `{stats:[stat…], scale, min, max}` | null — **굴리는 고정 특성**(2026-10-21 R303) · `stats` 가 둘 이상이면 드롭 때 하나
 *   armorSinOptions    — [{slot, sin, option, stat, scale, min, max, perIlvl?}] ← armor_sin_option.csv — **방어구 넷의 죄종 계열표** (2026-09-18 · `option` 2026-10-05 ·
 *                         네 부위 2026-10-21 R303). 같은 (부위, 죄종, option) 의 행 여럿 = 변형 · **행 순서가 결정론 계약**
 *   ~~armorCommonOptions~~ — 2026-10-21 R303 퇴역(`armor_common_option.csv` 삭제 — 방어구 넷이 계열표다)
 *   naming       — game_logic/naming.js 의 조립기 — `composeName(prefixSin, base, suffixSin|null, words)` · `wordCount(sin)`
 *   upgradeChances — [{step, chance}] ← upgrade_chance.csv — 강화 단계마다 성공 확률(비율) (2026-10-14 · R253).
 *                    단계는 1 부터 이어지고 `0 < chance ≤ 1` — 어기면 생성 때 던진다
 */
export function createItemSystem(data) {
    const B = data.balance;
    // 랜덤 칸 · 굴림 치우침 키 (R291 · R297) — 칸 수는 0 이상 정수 · 늘 붙는 칸은 0 ~ 칸 수 정수 · 확률은 0 ≤ 아래 ≤ 위 ≤ 1 · 치우침 1 이상(1 = 균등) · 만렙 > 1(레벨 자리의 분모)
    if (!(Number.isInteger(B.item_random_slots) && B.item_random_slots >= 0)) throw new Error(`item: balance.csv item_random_slots '${B.item_random_slots}'`);
    if (!(Number.isInteger(B.item_random_min) && B.item_random_min >= 0 && B.item_random_min <= B.item_random_slots))
        throw new Error(`item: balance.csv item_random_min '${B.item_random_min}' — 0 ~ item_random_slots(${B.item_random_slots}) 정수`);
    if (!(B.item_random_chance_min >= 0 && B.item_random_chance_min <= B.item_random_chance_max && B.item_random_chance_max <= 1))
        throw new Error(`item: balance.csv item_random_chance_min ~ max '${B.item_random_chance_min}' ~ '${B.item_random_chance_max}'`);
    if (!(B.item_roll_skew >= 1)) throw new Error(`item: balance.csv item_roll_skew '${B.item_roll_skew}' — 1 이상이어야 한다`);
    if (!(B.hero_level_cap > 1)) throw new Error(`item: balance.csv hero_level_cap '${B.hero_level_cap}'`);
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
    /** 방어구 네 부위(갑옷 · 투구 · 장갑 · 신발) — 고유 방어력을 갖고 고정 「방어력 +%」 + 죄종 계열을 받는 부위 (2026-09-18 · 계열 2026-10-21 R303) */
    const isArmor = slot => !!slot && slot !== 'weapon' && !baseless(slot);
    // ~~SIN_FROM_WEAPON = ['gloves']~~ — 2026-10-05 R206 퇴역. 무기 표가 계열표로 바뀌어 장갑은 옛 무기 행 13개를 `armor_sin_option.csv` 의 장갑 행으로 그대로 든다
    /**
     * **죄종 계열표로 굴리는 부위** [2026-10-05 · R206 · R209 · item_design §1 「무기 옵션 — 죄종 계열」 · 「갑옷 옵션 — 죄종 계열」] — 메인 줄 + 랜덤 줄(`familyOptions`).
     * **방어구 넷 전부** [투구 2026-10-21 R299 · 장갑 · 신발 R303 · item_design §1 「10-21 방어구 개정」]. 장신구만 장신구 세 층이다.
     * 구조 상수라 CSV 가 아니라 여기 둔다(INTERFACE §5-3)
     */
    const FAMILY_SLOTS = new Set(['weapon', 'armor', 'helmet', 'gloves', 'boots']);
    /** 계열마다 옵션 셋 — 옵션 번호(`option`)가 1 · 2 · 3 이다. 로드 검증이 계열표 부위 · 무기군마다 이 셋을 다 요구한다(아래 한 칸 예외만 1 하나) (구조 상수 · INTERFACE §5-3) */
    const FAMILY_OPTIONS = [1, 2, 3];
    /**
     * **한 칸뿐인 계열** [2026-10-21 · 사용자 · R303 · item_design §1 「10-21 방어구 개정」 · INTERFACE §5-3] — 옵션이 1 하나다(변형은 여럿일 수 있다).
     *   오만 — 모든 부위(「오만은 1 · 2 · 3 중 하나만 남기고 모두 삭제」) · 장갑 시기 — 다섯 변형 한 칸(「다섯 중에 1개가 나오는거야」). 구조 상수
     */
    const singleOption = (slot, sin) => sin === 'pride' || (slot === 'gloves' && sin === 'envy');
    const optionsOf = (slot, sin) => (singleOption(slot, sin) ? [1] : FAMILY_OPTIONS);
    /**
     * 발동 옵션 → 스킬 풀 [2026-10-05 · R206 · R208 · R209 · INTERFACE §5-3 `PROC_POOL`] — 구조 어휘라 CSV 가 아니라 여기 둔다(`PROC_TRIGGERS` 와 같은 자리).
     * ⚠ `proc_struck_buff`(갑옷 오만 ③)는 「방어 쪽으로 한정」 목록이 미정이라 `buff` 그대로다(⚠임시)
     */
    const PROC_POOL = {
        proc_hit_attack: 'attack', proc_cast_attack: 'attack',
        proc_hit_buff: 'buff', proc_cast_buff: 'buff', proc_struck_buff: 'buff',
        proc_cast_debuff: 'curse', proc_struck_debuff: 'curse',
    };
    const isProc = stat => String(stat).startsWith('proc_');
    // 발동 스킬 풀 — `skill.csv` 의 직업 스킬에서 짓는다(행 순서 = CSV 순서 · 결정론 계약 · INTERFACE §2-5 「죄종 계열 옵션」).
    //   attack = 그 무기군 직업의 **1티어 · 태그 없음 · 적 대상** 스킬 / buff = shout · boost · blessing 이 있고 control(도발) · aura · curse 가 없다 / curse = curse 태그
    const procDefs = data.procSkillDefs ?? [];
    const BUFF_TAGS = ['shout', 'boost', 'blessing'], NOT_BUFF = ['control', 'aura', 'curse'];
    const tagsOf = s => s.tags ?? [];
    const procAttack = cls => procDefs.filter(s => s.cls === cls && Number(s.tier) === 1 && !tagsOf(s).length && String(s.target ?? '').startsWith('enemy')).map(s => s.id);
    const PROC_BUFF = procDefs.filter(s => tagsOf(s).some(t => BUFF_TAGS.includes(t)) && !tagsOf(s).some(t => NOT_BUFF.includes(t))).map(s => s.id);
    const PROC_CURSE = procDefs.filter(s => tagsOf(s).includes('curse')).map(s => s.id);
    /** 그 발동 stat 의 스킬 후보 — `classes` = 무기군 직업(공격 풀만 읽는다 · 갑옷은 []) */
    const procPool = (stat, classes = []) => {
        const kind = PROC_POOL[stat];
        return kind === 'attack' ? [...new Set(classes.flatMap(procAttack))]
            : kind === 'buff' ? PROC_BUFF : kind === 'curse' ? PROC_CURSE : [];
    };
    /**
     * 특정 스킬 +n [2026-10-08 · R225 · item_design §1 「10-07 옵션 개정」 · INTERFACE §5-3 `SKILL_PLUS`] — 줄이 `skill` 을 박고 값은 단계 수(정수)다.
     * 전투 능력치가 아니라 스킬 레벨이다 — `skillPlusOf` 가 모아 `skill.activesFor` 의 `ctx.skillPlus` 로 넘어간다.
     * **장비 옵션 표에서 뺐다** [2026-10-21 · 사용자 「오만은 … 1개씩만 남기고 모두삭제」 · R303] — 표에 서면 로드가 던진다(풀을 안 줘서 조용히 죽은 줄이 된다).
     *   굴림(`familyOptions` 의 `plusPool`)과 합산(`skillPlusOf`)은 남는다 — 옛 아이템의 줄 · 유니크 논의(GAME_DESIGN §10 「유니크 아이템의 남은 칸」 ⑧)
     */
    const SKILL_PLUS = 'skill_plus';
    /** 랜덤 줄에 안 뜨는 죄종 — 이름에 뜰 때 메인 줄로만 붙는다 [2026-10-06 오만 규칙 · R225 · INTERFACE §5-3 `MAIN_ONLY_SINS`] (구조 상수) */
    const MAIN_ONLY_SINS = new Set(['pride']);

    /** 드롭·시작 무기에 쓰는 무기군 = 본편(release=main)뿐 — 확장 직업의 무기는 아직 아무도 못 드니 굴리지 않는다 */
    // ~~classSkills · starterSkills~~ 는 2026-09-29 걷었다(R179) — 무기가 스킬을 안 담는다
    const dropGroups = Object.values(WG).filter(g => g.release === 'main');
    /** 그 직업의 **스킬이 붙는** 무기군들 — 09-10 장착 개방 뒤로는 착용 제한이 아니라 시작 무기 선정에만 쓴다 */
    const groupsFor = cls => dropGroups.filter(g => g.classes.includes(cls));

    /* ── 무기 옵션 표 — 죄종 계열표 (item_design §1 「무기 옵션 — 죄종 계열」 · 2026-09-11 · R78 · 계열표 2026-10-05 · R206 · R208) ── */
    const sinOpts = data.weaponSinOptions ?? [];
    // `wdmg` — 무기 피해 가운데 값에 대한 비율(정수 · 무기 피해와 같이 자란다) · `tenth` — 0.1 단위 고정값(ilvl 무관) [2026-10-05 · INTERFACE §2-5 접사 값 규칙]
    const SCALES = ['growth', 'band', 'flat', 'fine', 'wdmg', 'tenth'];
    /** 고정값(퍼센트가 아닌) 스케일 — `pctStat` 이 가른다 */
    const FIXED_SCALES = new Set(['growth', 'band', 'wdmg', 'tenth']);
    /** 그 무기군에 이 행이 붙는가 — `all` · damageKind · 직업 id 중 하나가 맞으면. 물리 / 마법 / 마법사 / 사제로 갈리는 자리다 */
    const appliesTo = (row, g) => row.appliesTo === 'all' || row.appliesTo === g.damageKind || (g.classes ?? []).includes(row.appliesTo);
    // 로드 검증 — 어휘 밖의 값이 조용히 새면 굴림이 빈 후보를 만들고 아무도 모른다. 즉시 던진다.
    //   **드롭 무기군마다 죄종마다 옵션 1 · 2 · 3 이 다 있어야 한다**(오만은 1 하나 — `optionsOf`) — 한 칸이 비면 메인 줄이 그 계열에서 덜 고르고(소비는 그대로) 아무도 모른다
    {
        const classIds = new Set(Object.values(WG).flatMap(g => g.classes ?? []));
        const okTarget = t => t === 'all' || t === 'physical' || t === 'magic' || classIds.has(t);
        for (const r of sinOpts) {
            if (!SCALES.includes(r.scale)) throw new Error(`item: weapon_sin_option ${r.stat} scale '${r.scale}'`);
            if (!okTarget(r.appliesTo)) throw new Error(`item: weapon_sin_option ${r.stat} applies_to '${r.appliesTo}'`);
            if (!(r.max >= r.min)) throw new Error(`item: weapon_sin_option ${r.stat} 범위 ${r.min}~${r.max}`);
            if (!data.sins.includes(r.sin)) throw new Error(`item: weapon_sin_option 죄종 '${r.sin}'`);
            if (!optionsOf('weapon', r.sin).includes(r.option)) throw new Error(`item: weapon_sin_option ${r.sin} ${r.stat} option '${r.option}'`);
            if (isProc(r.stat) && !PROC_POOL[r.stat]) throw new Error(`item: weapon_sin_option 발동 '${r.stat}' 의 풀이 없다 (PROC_POOL)`);
            if (r.stat === SKILL_PLUS) throw new Error(`item: weapon_sin_option ${r.sin} 의 ${SKILL_PLUS} — 2026-10-21 장비에서 뺐다(R303)`);
        }
        if (sinOpts.length) for (const g of dropGroups) for (const sin of data.sins) {
            const have = new Set(sinOpts.filter(r => r.sin === sin && appliesTo(r, g)).map(r => r.option));
            for (const o of optionsOf('weapon', sin)) if (!have.has(o)) throw new Error(`item: weapon_sin_option — 무기군 ${g.id} 의 ${sin} 옵션 ${o} 이 없다`);
        }
    }

    /* ── 방어구 옵션 표 (item_design §1 「갑옷 옵션」 · 「10-21 방어구 개정」 · 2026-09-18 · 네 부위 계열표 2026-10-21 R303) ── */
    const armorSinOpts = data.armorSinOptions ?? [];
    const ARMOR_SLOTS = (data.slots ?? []).filter(isArmor);
    // 로드 검증 — 무기 표와 같은 이유로 즉시 던진다. 게다가 **부위마다 일곱 죄종이 다 차 있어야 한다** — 한 칸이 비면
    //   그 죄종을 굴린 방어구의 칸이 조용히 비고(소비는 그대로) 아무도 모른다. **죄종마다 옵션 1 · 2 · 3**(한 칸 계열은 1 하나 — `optionsOf`)
    //   ~~공통옵션 행이 없어야 한다~~ — `armor_common_option.csv` 는 2026-10-21 R303 퇴역
    {
        for (const r of armorSinOpts) {
            if (!ARMOR_SLOTS.includes(r.slot)) throw new Error(`item: armor_sin_option ${r.stat} slot '${r.slot}' 은 방어구 부위가 아니다`);
            if (!SCALES.includes(r.scale)) throw new Error(`item: armor_sin_option ${r.stat} scale '${r.scale}'`);
            if (!(r.max >= r.min)) throw new Error(`item: armor_sin_option ${r.stat} 범위 ${r.min}~${r.max}`);
            if (r.scale === 'band' && typeof r.perIlvl !== 'number') throw new Error(`item: armor_sin_option ${r.stat} band 행에 per_ilvl 이 없다`);
            if (!data.sins.includes(r.sin)) throw new Error(`item: armor_sin_option 죄종 '${r.sin}'`);
            if (!optionsOf(r.slot, r.sin).includes(r.option)) throw new Error(`item: armor_sin_option ${r.slot} ${r.sin} ${r.stat} option '${r.option}'`);
            if (isProc(r.stat) && !PROC_POOL[r.stat]) throw new Error(`item: armor_sin_option 발동 '${r.stat}' 의 풀이 없다 (PROC_POOL)`);
            if (r.stat === SKILL_PLUS) throw new Error(`item: armor_sin_option ${r.slot} ${r.sin} 의 ${SKILL_PLUS} — 2026-10-21 장비에서 뺐다(R303)`);
            // 반격은 반격을 부른다(평타와 같은 규칙 · INTERFACE §2-6) — 한 출처가 1 이면 양쪽이 끝없이 되받아 친다
            if (r.stat === 'counter_chance' && !(r.max < 1)) throw new Error(`item: armor_sin_option counter_chance max ${r.max} — 1 미만이어야 한다`);
        }
        for (const slot of ARMOR_SLOTS) {
            for (const sin of data.sins) {
                const have = new Set(armorSinOpts.filter(r => r.slot === slot && r.sin === sin).map(r => r.option));
                for (const o of optionsOf(slot, sin))
                    if (!have.has(o)) throw new Error(`item: armor_sin_option 에 ${slot} · ${sin} 옵션 ${o} 행이 없다`);
            }
        }
        // 굴리는 고정 특성 [2026-10-21 · R303] — 어휘 · 범위 · **그 부위 표에 같은 능력치가 없다**(한 아이템에 같은 줄이 두 번 서지 않게 · item_design §1 「10-21 방어구 개정」 규칙)
        for (const [slot, groups] of Object.entries(AG)) for (const g of Object.values(groups)) {
            const tr = g.trait;
            if (!tr) continue;
            if (!ARMOR_SLOTS.includes(slot)) throw new Error(`item: armor_group ${slot}/${g.id} 특성 — 방어구 부위가 아니다`);
            if (!tr.stats?.length || !SCALES.includes(tr.scale) || tr.scale === 'band' || !(tr.max >= tr.min) || !(tr.min > 0))
                throw new Error(`item: armor_group ${slot}/${g.id} 특성 ${tr.stats} ${tr.scale} ${tr.min}~${tr.max}`);
            for (const st of tr.stats)
                if (armorSinOpts.some(r => r.slot === slot && r.stat === st)) throw new Error(`item: armor_group ${slot}/${g.id} 특성 '${st}' 이 ${slot} 표에도 있다 — 한 아이템에 두 번 선다`);
        }
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

    // ~~armorSinRows · armorCommonRows~~ — 2026-10-21 R303 퇴역(방어구 넷이 계열표 — `familyOptions` 가 그 부위의 행을 받는다)

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

    /**
     * 랜덤 칸 수 — **일반 · 매직 · 레어 모두** `item_random_slots` [2026-10-20 · 사용자 확정 · R291 · 개정 2026-10-21 · R297 — ~~일반 0~~ ·
     * item_design §1 희귀도 · INTERFACE §2-5 — ~~줄 수 `item_lines_*` − 고정 − 죄종 수 · 반지는 고정이 없어 하나 더~~(10-18 R285)].
     * **전 부위 같다** — 반지도 칸을 더 받지 않는다. 희귀도는 칸 수를 안 바꾼다(부르는 곳이 넘기는 인자는 쓰지 않는다)
     */
    const randomSlots = _rarity => B.item_random_slots;

    /** 아이템 레벨의 자리 — 1 → 0 · 만렙(`hero_level_cap`) → 1 · 그 위는 1 (칸 확률 · 굴림 치우침이 같이 쓴다 · R291) */
    const levelT = ilvl => Math.min(1, Math.max(0, (ilvl - 1) / (B.hero_level_cap - 1)));

    /** 랜덤 칸 하나가 붙을 확률 — `item_random_chance_min` → `_max` 를 아이템 레벨 따라 선형으로 [2026-10-20 · R291] */
    const slotChance = ilvl => B.item_random_chance_min + levelT(ilvl) * (B.item_random_chance_max - B.item_random_chance_min);

    /**
     * 랜덤 칸 `i`(0 부터)가 붙나 — **앞의 `item_random_min` 칸은 늘 붙고** 나머지는 붙나 굴림 `hr` < `p`(`slotChance`)
     * [2026-10-21 · 사용자 「노말/매직/레어/유니크 모두 랜덤옵션이 최소 1개」 · R297 · item_design §1 희귀도].
     * 굴림은 늘 붙는 칸에서도 부르는 쪽이 소비한다 — 소비 수가 칸 번호에 의존하지 않는다(INTERFACE §5-2)
     */
    const slotOn = (i, hr, p) => i < B.item_random_min || hr < p;

    /**
     * 균등 굴림 `u` → 아이템 레벨이 치우친 굴림 [2026-10-20 · 사용자 「좌로치우친분포에서 우로치우친분포」 · R291 · item_design §2-1 · INTERFACE §2-5].
     * `s = 2t − 1` · `a = 1 + |s| × (item_roll_skew − 1)` — 1레벨 = 낮은 쪽 삼각(`1 − (1−u)^(1/a)`) · 가운데 = 균등 · 만렙 = 높은 쪽 삼각(`u^(1/a)`).
     * 양끝은 그대로(0 → 0 · 1 → 1) · 같은 `u` 면 레벨이 높을수록 크다 · 소비는 부르는 쪽의 `u` 하나 그대로다
     */
    const lean = (u, ilvl) => {
        const s = 2 * levelT(ilvl) - 1;
        const a = 1 + Math.abs(s) * (B.item_roll_skew - 1);
        return s >= 0 ? u ** (1 / a) : 1 - (1 - u) ** (1 / a);
    };

    /**
     * 옵션 줄의 굴림값 `min + lean(u, ilvl) × (max − min)` — 희귀도는 범위를 안 바꾼다 [2026-10-20 · R291 — ~~매직은 위끝 × `magic_option_max_mult`~~(10-18 R285) 퇴역].
     * `optionRange` 가 `u` = 0 · 1 로 양끝을 낸다
     */
    const rollOf = (d, u, ilvl) => d.min + lean(u, ilvl) * (d.max - d.min);

    /**
     * 값 하나 — 정의의 `scale` 이 정한다 (item_design §2-1):
     *   growth — 굴림 × growthMult(ilvl), 정수 [2026-09-16 사용자 지시 — 장비 옵션은 소수를 두지 않는다]
     *   band   — 굴림 + ilvl × perIlvl, 정수 (비율 축은 완만하게만 오른다)
     *   flat   — 굴림 그대로, **1% 단위**(비율 · `formula.pctOption`). **ilvl 무관** — % 접사가 곡선을 타면 곱셈층이 두 번 자라 후반이 폭주한다
     *            [2026-09-17 · R111] ~~정수~~ — 퍼센트가 비율로 옮겨 가며 「정수」가 「1% 단위」가 됐다(플레이어가 보는 눈금은 같다)
     *   fine   — flat 과 같되 **0.1% 단위**. 1% 보다 작은 값이 본질인 자리다 — 레벨당 %(오만 데미지 · 공격 속도 · 캐스팅 속도),
     *            1% 단위로 올리면 만렙 기여가 2~5배로 뛰어 값 대역부터 다시 정해야 한다 (2026-09-16 보류 · 09-17 사용자 대기 · GAME_DESIGN §10)
     *   wdmg   — 굴림 × **무기 피해 가운데 값(ilvl)**, 정수 [2026-10-05 · R206] — 색욕 최소 · 최대 데미지가 「무기 피해와 같이 자란다」(item_design §1)
     *   tenth  — 굴림을 **0.1 단위**로 자른 고정값, ilvl 무관 [2026-10-05 · R206 · R209] — 레벨당 최대 데미지(× 영웅 레벨) · 갑옷 체력 재생(초당)
     */
    const TENTH = 10;   // `tenth` 스케일의 눈금 — 1 / 0.1 (INTERFACE §2-5 접사 값 규칙)
    const valueOf = (d, roll, ilvl) =>
        d.scale === 'growth' ? Math.max(1, Math.round(roll * F.growthMult(ilvl)))
            : d.scale === 'band' ? Math.max(1, Math.round(roll + ilvl * (d.perIlvl ?? 0)))
                : d.scale === 'wdmg' ? Math.max(1, Math.round(roll * F.weaponMid(ilvl)))
                    : d.scale === 'tenth' ? Math.max(1, Math.round(roll * TENTH)) / TENTH
                        : F.pctOption(roll, d.scale === 'fine');

    /**
     * 퍼센트 채널인가 [2026-09-17 · R111] — 옵션 값이 비율인가 고정값인가를 가른다.
     * 고정값 채널 = 옵션 표의 `growth` · `band` 행 + 옛 무기의 `atk_flat`(R78 에 표에서 빠졌다). **나머지는 전부 퍼센트다**
     */
    //   ~~affixDefs~~ 는 2026-09-21 R127 로 퇴역 — 옛 `affix.csv` 의 고정값 행(`hp_flat` growth)은 장신구 · 신발 표가 같은 이름으로 이어 든다
    //   갈래 특성(R303)도 같은 규칙 — 고정값 스케일의 특성(그리브스 절대값 피해 감소 `growth`)은 고정값 채널이다
    const traitDefs = Object.values(AG).flatMap(gs => Object.values(gs)).map(g => g.trait).filter(Boolean);
    const flatStats = new Set([...sinOpts, ...armorSinOpts, ...accSinOpts, ...accCommonOpts].filter(d => FIXED_SCALES.has(d.scale)).map(d => d.stat)
        .concat(traitDefs.filter(t => FIXED_SCALES.has(t.scale)).flatMap(t => t.stats), 'atk_flat'));
    const pctStat = stat => !flatStats.has(stat);

    // ~~rollAffixes · affixCount~~ — 2026-09-21 R127 퇴역. 목걸이 · 반지가 마지막 사용자였다 (아래 `accessoryOptions`)

    /**
     * 목걸이 고정 옵션 — **발동 스킬 하나** [2026-09-21 · 사용자 확정 · R127 · item_design §1 「목걸이 고정 옵션」].
     * 발동 조건은 **베이스가 정한다**(`amulet_proc.csv` — rng 0) · 스킬은 `procSkills` 에서 1회 · 값 1회(확률 · 또는 쿨타임 배수 — 0.01 단위).
     * rng 소비(계약 — INTERFACE §5-2): **스킬 1 → 값 1** — 베이스에 행이 없거나 풀이 비어도 2회 그대로다.
     * 값은 아이템 레벨이 치우친다(`lean` · R291) — **`interval`(쿨타임 배수 — 낮을수록 좋다)만 균등 그대로**다(방향 미정 · 사용자 10-20 「나중에」)
     * ⚠ **전투는 이 값을 읽지 않는다**(사용자 지시 — 설명에만) · `affixes` 에 넣지 않아 `computeCombat` 이 합산할 길이 없다
     */
    function amuletProc(rng, baseId, ilvl) {
        const p = procByBase[baseId] ?? null;
        const sr = rng(), vr = rng();
        if (!p) return null;
        return {
            trigger: p.trigger,
            skill: procSkills.length ? procSkills[Math.floor(sr * procSkills.length)] : null,
            v: F.pctOption(p.min + (p.trigger === 'interval' ? vr : lean(vr, ilvl)) * (p.max - p.min)),
        };
    }

    /**
     * 반지 · 목걸이 옵션 — 죄종 칸 → 공통옵션 [2026-09-21 · 사용자 확정 · R127 · item_design §1 「반지 · 목걸이」] — 순서가 곧 표시 순서다.
     * rng 소비(계약 — INTERFACE §5-2): **방어구와 같은 모양** — 죄종마다 (행 1 → 값 1) → 공통 칸마다 (붙나 1 → 종류 1 → 변형 1 → 값 1 · R291).
     * 고정 층은 반지에 없고 목걸이는 `amuletProc` 가 따로 든다(`affixes` 밖). ⚠ 후보가 비어도 · 칸이 안 붙어도 소비 수는 같다
     */
    function accessoryOptions(rng, slot, sins, rarity, ilvl) {
        const out = [];
        // 죄종 칸 — 이름의 죄종마다 하나. 한 칸에 후보가 여럿이면(반지 시기 다섯 · 목걸이 시기 둘 · 탐욕 셋) 그중 하나를 균등으로 굴린다
        for (const sin of sins) {
            const rows = accSinRows(slot, sin);
            const pr = rng(), vr = rng();
            if (!rows.length) continue;
            const d = rows[Math.floor(pr * rows.length)];
            out.push({ stat: d.stat, v: valueOf(d, rollOf(d, vr, ilvl), ilvl), src: sin });
        }
        // 공통옵션 — 두 부위 한 풀. **종류를 먼저 뽑고 그 안에서 변형**(원소 ×4 · 상태이상 ×4 가 행 수만큼 비중을 먹지 않게) · 같은 종류는 한 번
        //   칸마다 붙을지 먼저 굴린다(R291 · 앞의 `item_random_min` 칸은 늘 붙는다 — R297) — 안 붙은 칸은 종류를 안 뺀다 · 반지도 칸 수가 같다
        const families = [...new Set(accCommonOpts.map(r => r.family))];   // 첫 등장 순 = CSV 행 순서
        const n = randomSlots(rarity), p = slotChance(ilvl);
        for (let i = 0; i < n; i++) {
            const hr = rng(), fr = rng(), sr = rng(), vr = rng();
            if (!slotOn(i, hr, p) || !families.length) continue;
            const fam = families.splice(Math.floor(fr * families.length), 1)[0];
            const variants = accCommonOpts.filter(r => r.family === fam);
            const d = variants[Math.floor(sr * variants.length)];
            out.push({ stat: d.stat, v: valueOf(d, rollOf(d, vr, ilvl), ilvl), src: 'random' });
        }
        return out;
    }

    /**
     * 죄종 계열 옵션 — 메인 줄 → 랜덤 줄 [2026-10-05 · 사용자 확정 · R206 · R208 · R209 · R210 · item_design §1 「무기 옵션 — 죄종 계열」 · INTERFACE §2-5].
     * 옵션 = (죄종, `option`) — `rows` 는 **그 아이템에 붙는 행만** 받는다(무기 = `appliesTo` · 갑옷 = 그 부위). 같은 옵션의 행 여럿은 변형(종족 셋 · 원소 셋)이다.
     *   메인 줄 — `sins` 마다 그 죄종의 옵션 중 아직 안 붙은 것에서 하나(**반드시**) · 랜덤 줄 — 칸 `n` 개 · 칸마다 붙을지 굴려(R291 · 앞의 `item_random_min` 칸은 늘 — R297) 붙으면 계열표 옵션 중 아직 안 붙은 것에서(계열 무관 — 겹쳐도 된다)
     *   **같은 옵션은 한 번** · **발동은 아이템당 하나**(발동 옵션이 붙으면 다른 발동 옵션이 후보에서 빠진다) · **대역은 하나**(메인 · 랜덤 같은 범위 · 희귀도 무관 — `rollOf`)
     *   **오만(`MAIN_ONLY_SINS`)은 랜덤 줄 후보가 아니다** — 이름에 오만이 뜰 때 메인 줄 하나로만 붙는다(2026-10-06 오만 규칙 · R225)
     *   **풀이 빈 특정 스킬 +n 옵션은 후보가 아니다**(갈래 없는 시작 갑옷 · 방어 관련 스킬이 없는 갑옷군 — R225)
     *   두 줄 모두 `src` 에 그 옵션의 죄종 id 를 든다 — 메인 줄은 `sins` 순서대로 앞에 선다
     * rng 소비(계약 — INTERFACE §5-2): 메인 줄마다 **옵션 1 → 변형 1 → 값 1 → 스킬 1** · 랜덤 칸마다 **붙나 1** → 같은 넷(R291) —
     *   스킬은 발동 · 특정 스킬 +n 이 아니어도 소비하고, 후보가 비어도 · 칸이 안 붙어도 소비 수는 그대로다
     * @param n 랜덤 칸 수(`randomSlots`) — 칸마다 붙을 확률은 `slotChance(ilvl)`
     * @param classes 발동 공격 풀의 직업(무기 = 무기군 직업 · 갑옷 = [])
     * @param plusPool 특정 스킬 +n 의 스킬 후보 — 비면 그 옵션이 안 뜬다 · **장비는 안 준다**(2026-10-21 R303 — ~~무기 `plusPoolWeapon` · 갑옷 `plusPoolArmor` · 투구 버프 풀~~ · 유니크 논의 대기)
     */
    function familyOptions(rng, rows, sins, n, ilvl, classes, plusPool = []) {
        const options = [], byKey = {};
        for (const r of rows) {                                       // 첫 등장 순 = CSV 행 순서
            const key = `${r.sin}:${r.option}`;
            if (!byKey[key]) options.push(byKey[key] = { key, sin: r.sin, rows: [], proc: false, plus: false });
            byKey[key].rows.push(r);
            if (isProc(r.stat)) byKey[key].proc = true;
            if (r.stat === SKILL_PLUS) byKey[key].plus = true;
        }
        const out = [], used = new Set();
        let procTaken = false;
        const open = o => !used.has(o.key) && !(procTaken && o.proc) && !(o.plus && !plusPool.length);
        // `on` = 그 줄이 붙나 — 메인 줄은 언제나 · 랜덤 칸은 `slotOn`(늘 붙는 앞 칸 · 붙나 굴림)이 정한다. 안 붙어도 넷은 소비한다(R291 · R297)
        const line = (cands, on = true) => {
            const or = rng(), sr = rng(), vr = rng(), kr = rng();
            if (!on || !cands.length) return;
            const o = cands[Math.floor(or * cands.length)];
            used.add(o.key);
            const d = o.rows[Math.floor(sr * o.rows.length)];
            const a = { stat: d.stat, v: valueOf(d, rollOf(d, vr, ilvl), ilvl), src: o.sin };
            if (isProc(d.stat)) {
                procTaken = true;
                const pool = procPool(d.stat, classes);
                a.skill = pool.length ? pool[Math.floor(kr * pool.length)] : null;
            }
            if (d.stat === SKILL_PLUS) a.skill = plusPool[Math.floor(kr * plusPool.length)];   // 풀이 비면 `open` 이 이미 뺐다
            out.push(a);
        };
        for (const sin of sins) line(options.filter(o => o.sin === sin && open(o)));
        const p = slotChance(ilvl);
        for (let i = 0; i < n; i++) {
            const hr = rng();                                          // 붙나 1 — 옵션 굴림보다 먼저 (R291)
            line(options.filter(o => open(o) && !MAIN_ONLY_SINS.has(o.sin)), slotOn(i, hr, p));
        }
        return out;
    }

    /**
     * 무기 옵션 — 고정 1 + 죄종 계열 [2026-10-05 · R206 · R208 · R210 — ~~세 층(고정 · 죄종 칸 · 통합)~~ 2026-09-11 R78 대체] — 아이템이 드는 **순서가 곧 표시 순서**다(고정 → 메인 → 랜덤).
     * rng 소비(계약 — INTERFACE §5-2): 고정 값 1 → `familyOptions`.
     * ⚠ **후보가 비어도 소비 수는 같다** — 무기군 · 표 내용이 소비 수를 바꾸면 같은 시드가 다른 드롭을 낸다(베이스 굴림과 같은 규칙)
     */
    function weaponOptions(rng, g, sins, rarity, ilvl) {
        const lo = B.weapon_fixed_atk_pct_min, hi = B.weapon_fixed_atk_pct_max;
        // 고정 옵션 — 무기면 무조건 「공격력 +%」 하나. 붙는 것은 규칙이고 값만 굴린다 (item_design §1 고정 옵션) · 값도 아이템 레벨이 치우친다(R291)
        const out = [{ stat: 'atk_pct', v: F.pctOption(lo + lean(rng(), ilvl) * (hi - lo)), src: 'fixed' }];
        // 특정 스킬 +n 풀은 안 준다 — 2026-10-21 장비에서 뺐다(R303 · 표에 서면 로드가 던진다)
        return out.concat(familyOptions(rng, sinOpts.filter(r => appliesTo(r, g)), sins, randomSlots(rarity), ilvl, g.classes ?? []));
    }

    /**
     * 방어구 옵션 [2026-09-18 · 사용자 확정 · item_design §1 「투구 옵션」 · **네 부위 계열표 2026-10-21 R303** · 「10-21 방어구 개정」] — 순서가 곧 표시 순서.
     *   고정 「방어력 +%」 1 → **갈래 특성** 1(굴림 · 갈래에 특성이 있을 때만 줄이 선다 — 투구 · 장갑 · 신발) → 죄종 계열(`familyOptions` — 무기와 같다)
     *   ~~장갑 · 신발 세 층(고정 → 죄종 칸 → 공통)~~ — R303 퇴역
     * rng 소비(계약 — INTERFACE §5-2): 고정 값 1 → **특성 변형 1 → 특성 값 1**(R303) → `familyOptions`.
     * ⚠ **후보가 비어도 · 칸이 안 붙어도 소비 수는 같다** — 특성이 없는 갈래(갑옷군 · 시작 칸)도 특성 둘을 소비한다. 부위 · 갈래 · 표 내용이 소비 수를 바꾸면 같은 시드가 다른 드롭을 낸다.
     *   고정 「방어력 +%」(`armor_def_pct`)는 **그 아이템 자신의 고유 방어력에만** 곱한다 — 합산은 `hero.computeCombat` 이 아이템마다 한다.
     *   특성 줄은 다른 접사와 같은 채널이다(`src: 'fixed'` · 공속 · 쿨감 · 최대 체력 % · 명중률 · 피해 감소 · 행동 게이지 · 절대값 피해 감소)
     */
    function armorOptions(rng, slot, group, sins, rarity, ilvl) {
        const lo = B.armor_fixed_def_pct_min, hi = B.armor_fixed_def_pct_max;
        const out = [{ stat: 'armor_def_pct', v: F.pctOption(lo + lean(rng(), ilvl) * (hi - lo)), src: 'fixed' }];
        const tr = groupDef(slot, group)?.trait ?? null;
        const kr = rng(), vr = rng();
        if (tr) out.push({ stat: tr.stats[Math.floor(kr * tr.stats.length)], v: valueOf(tr, rollOf(tr, vr, ilvl), ilvl), src: 'fixed' });
        // 특정 스킬 +n 풀은 안 준다 — 2026-10-21 장비에서 뺐다(R303)
        return out.concat(familyOptions(rng, armorSinOpts.filter(r => r.slot === slot), sins, randomSlots(rarity), ilvl, []));
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
     * opts.weaponBase = (무기) 세부 베이스 고정 — 제작이 레벨의 베이스를 넘긴다(2026-09-21 · `weaponBaseAt`). **베이스 굴림은 1회 그대로 소비한다**(값만 안 쓴다).
     * rng 소비 순서(계약 — INTERFACE §5-2): (매직·레어) 접두 죄종 → (레어) 접미 죄종 →
     *   **(무기 · 방어구 넷) 고정 1 + 죄종 계열**(`weaponOptions` · `armorOptions` → `familyOptions` — 줄마다 옵션 1 → 변형 1 → 값 1 → 스킬 1 · 2026-10-05 · 랜덤 칸은 그 앞에 붙나 1 — 2026-10-20 R291 ·
     *   **방어구는 고정 뒤에 갈래 특성 변형 1 → 값 1** — 2026-10-21 R303 · ~~(투구 · 장갑 · 신발) 옵션 세 층~~ R303 퇴역) /
 *   **(목걸이 · 반지) 옵션 세 층** [2026-09-21 · R127 — ~~접사 수 → 접사마다 (정의 선택 → 값)~~] — (목걸이) 발동 스킬 1 → 값 1 → `accessoryOptions` →
     *   **(무기) 베이스 1회** [신설 2026-09-10] · ~~(무기) 스킬 1회~~ **2026-09-29 삭제**(R179) · ~~(방어구) 개체 굴림 1회~~ **2026-09-18 삭제** · ~~(무기) 공격력 개체 굴림~~ **2026-09-14 삭제**(R90)
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
        const proc = slot === 'amulet' ? amuletProc(rng, base?.id, ilvl) : null;
        const item = {
            uid: null,
            slot, rarity, ilvl,
            up: 0,                             // 강화 단계 — 드롭은 굴리지 않는다. 올리는 것은 upgrade 하나뿐
            name: N.composeName(prefix, base, suffix, words),
            implicit: null,
            // 무기(R78) · 방어구(2026-09-18) · 목걸이 · 반지(2026-09-21 · R127)는 세 층 — 셋 다 베이스 굴림보다 **앞**에서 굴린다 (§5-2)
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
            // ⚠ **풀이 비어도 1회 소비한다** — 소비 수가 무기군에 의존하면 같은 시드가 다른 드롭을 낸다
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
            //   원소는 **스킬의 원소 태그만** 낸다 [2026-10-02 · R198 — ~~관련 옵션이 붙었을 때만~~] — 마법 무기는 평타가 없다(`hero.computeCombat:basic_attack`).
            //   그래서 `element` 키가 아예 없고 **마법 무기에서 rng 소비 1회가 빠졌다**(INTERFACE §5-2).
            //   ⚠ 옛 세이브의 `item.element` 는 읽는 곳이 없어져 **죽은 필드**로 남는다(세이브 버전 무변경 · R77 선례).
            // ~~무기가 담는 액티브 — 개체가 든다(`item.skill` · 그 무기군의 직업 풀에서 1회)~~ **2026-09-29 폐지 · R179** (skill_design §2-1 스킬북) —
            //   무기는 스킬을 담지 않는다. 둘째 액티브 칸은 영웅이 책으로 배운 것(`hero.bookSkill`)이고 **무기에서 rng 소비 1회가 빠졌다**(INTERFACE §5-2)
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
     * rng 소비 순서(계약 — INTERFACE §5-2): 부위 배열 순서대로 — (`ilvlSpread > 0` 이면) 아이템 레벨 1 → 베이스(무기는 `weaponGroup` 을 주면 **0회**) → 희귀도 1 → `build`.
     *   ⚠ **부위 배열 순서가 계약이다** — 같은 부위 묶음이라도 순서가 바뀌면 같은 시드가 다른 한 벌을 낸다.
     * @param opts `{slots, ilvl, ilvlSpread?, magicFind?, rareBonusPct?, weaponGroup?, rarityWeights?}`
     *   · `ilvlSpread` 아이템 레벨의 반폭(정수) — 부위마다 `ilvl ± ilvlSpread` 에서 균등 1회 · 하한 1 [2026-10-06 · item_design §1 3단계].
     *     몬스터 장비만 넘긴다(`battle.spawnRound`) — 없거나 0 이면 굴리지 않아 제작 · 상단 · 시작 장비의 수열이 그대로다
     *   · `magicFind` 파티 평균(비율) · `rareBonusPct` 등급이 미는 레어 가중(비율 · `spawn_grade.csv:gear_rare_bonus_pct`) — **둘은 같은 채널**이다
     *   · `weaponGroup` 무기군 고정. 몬스터는 제 무기군(`monster.csv:weapon_group`)을 들고, 안 주면 본편 무기군에서 굴린다
     *   · `itemBase` 무기 외 베이스 고정(`itemBases` 의 id — **소비 0**). 제작이 고른 종류를 넘긴다(2026-09-21) · 후보 밖인지는 부르는 쪽이 본다
     *   · `weaponBase` 무기 세부 베이스 고정(`weaponBases` 의 id) — `build` 로 넘긴다. **소비는 그대로**(베이스 굴림 1회를 하고 값만 버린다 · 2026-09-21)
     *   · `rarityWeights` 희귀도 가중치 `{normal, magic, rare}` — 제작이 넘긴다(없으면 드롭 가중치 · 굴림 수 불변 · R96)
     */
    function rollGear(rng, opts) {
        const { slots } = opts;
        const spread = opts.ilvlSpread ?? 0;
        const rareBonus = (opts.magicFind ?? 0) + (opts.rareBonusPct ?? 0);
        const out = [];
        for (const slot of slots) {
            // 아이템 레벨 — 반폭을 받으면 **부위마다** 가운데 ± 반폭에서 균등 1회 (2026-10-06 · item_design §1 3단계).
            //   레벨 1 은 아이템 레벨의 바닥이라 그 아래로 굴러가면 1 로 세운다(INTERFACE §5-3) · 반폭이 없으면 굴리지 않는다
            const ilvl = spread > 0 ? Math.max(1, opts.ilvl - spread + Math.floor(rng() * (2 * spread + 1))) : opts.ilvl;
            // 무기군을 지정받으면 굴리지 않는다 — 그 몬스터가 어느 무기를 드는지는 데이터가 정한다(드롭 편향의 단위)
            // 무기 외는 **그 ilvl 의 티어 행**에서 굴린다(2026-09-18) — 후보만 좁고 소비는 1회 그대로다 · `itemBase` 를 받으면 굴리지 않는다(제작 · 2026-09-21)
            const base = slot === 'weapon'
                ? (opts.weaponGroup ? WG[opts.weaponGroup] : pick(rng, dropGroups))
                : opts.itemBase ? (data.itemBases[slot] ?? []).find(b => b.id === opts.itemBase)
                    : pick(rng, tierBases(slot, ilvl));
            if (!base) throw new Error(`item: rollGear 부위 '${slot}' 의 베이스가 없다`);
            // 반지 · 목걸이는 **일반이 없다** [2026-10-18 · 사용자 확정 · R285 · item_design §1 희귀도] — 일반이 나온 자리는 매직이다(굴림 1회 그대로 · 레어 확률 불변)
            const rolled = rollRarity(rng, rareBonus, opts.rarityWeights);
            const rarity = rolled === 'normal' && baseless(slot) ? 'magic' : rolled;
            out.push(build(rng, slot, rarity, ilvl, base, { weaponBase: opts.weaponBase }));
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

    /** 시작 무기 — **그 직업의 무기군**에서 ilvl 1 **일반** 1개 (무기가 밑수라 빈손이면 세기가 성립하지 않는다).
     *  ~~매직~~ → 일반 [2026-09-14 사용자 확정 · R86 · hero_design §1] — 시작 장비는 일반 무기 + 일반 갑옷이다.
     *  ~~스킬은 직업 기본기 풀에서 굴린다 · `avoidSkill`~~ 은 **2026-09-29 폐지**(R179 — 무기가 스킬을 안 담는다) —
     *  첫 파티의 딜 · 힐 보장은 **고유 스킬**로 옮겨 갔다(`hero.rollStartParty` · hero_design §1).
     *  09-10 장착 개방 뒤에도 시작만은 자기 직업 무기로 준다. 갈아 끼우는 것은 자유다(`canEquip` 은 직업을 안 가린다 — 요구 레벨만 · R215). */
    function startingWeapon(rng, cls) {
        const gs = groupsFor(cls);
        return build(rng, 'weapon', 'normal', 1, gs.length ? pick(rng, gs) : pick(rng, dropGroups));
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

    /** 착용 요구 레벨 = 아이템 레벨 · **만렙에서 멈춘다** [2026-10-06 사용자 확정 · R215 · item_design §2] —
     *  아이템 레벨은 등급 가산(`spawn_grade.csv:gear_ilvl_add`)만큼 만렙 위로 올라가므로, 상한이 없으면 그 드롭은 영원히 못 낀다 */
    const reqLevel = item => Math.min(item.ilvl, B.hero_level_cap);

    /** 착용 가능 판정 — **거절 사유는 요구 레벨 하나** [2026-10-06 · R215] — 영웅 레벨이 `reqLevel` 미만이면 `level`.
     *  ~~무기는 직업 전속 무기군뿐~~ 폐기(2026-09-10): 어느 직업이든 어느 무기든 낀다 — `class` 는 그때 사라졌다.
     *  **착용할 때만 본다** — 이미 낀 장비는 레벨이 모자라도 벗기지 않는다(옛 세이브 · 방치형 계약) · 몬스터 장비는 여기를 안 지난다 */
    function canEquip(hero, item) {
        return hero.level < reqLevel(item) ? 'level' : null;
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
     * 무기 피해 범위에 **고정 옵션 「무기 데미지 +%」**(`src: 'fixed'` 의 `atk_pct` — 화면 이름 2026-10-15)를 먹인 값 [2026-09-23 사용자 지시] — 아이템 툴팁 메인 옵션이 부른다.
     * 양끝마다 곱하고 한 번 반올림한다 — `hero.computeCombat` 의 괄호 곱과 같은 규칙. 다른 % (죄종 칸 · 랜덤 · 마스터리 · 도감)는 안 든다 —
     * 그 합은 영웅이 정하는 괄호라 캐릭터 시트가 든다. 고정 줄이 없는 옛 무기는 `weaponDamage` 그대로.
     * **색욕 최소 · 최대 데미지**(`dmg_min_flat` · `dmg_max_flat` · 고정 수치)는 무기 % 를 곱한 양끝 **뒤에** 더하고, 최소가 최대를 넘으면 최대 = 최소 + 1 이다
     *   [2026-10-05 · R206 · item_design §1 — D2 방식]. 레벨당 최대 데미지는 영웅 레벨이 정해 여기 안 든다(시트가 든다) — `hero.computeCombat` 과 같은 순서
     */
    function weaponDamageFixed(item) {
        const d = weaponDamage(item);
        if (!d) return null;
        let pct = 0, lo = 0, hi = 0;
        for (const a of item.affixes ?? []) {
            if (a.src === 'fixed' && a.stat === 'atk_pct') pct += a.v;
            else if (a.stat === 'dmg_min_flat') lo += a.v;
            else if (a.stat === 'dmg_max_flat') hi += a.v;
        }
        if (!pct && !lo && !hi) return d;
        const min = Math.round(d.min * (1 + pct)) + lo;
        const max = Math.round(d.max * (1 + pct)) + hi;
        return { min, max: min > max ? min + 1 : max };
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

    /**
     * 옵션 줄의 출처 태그 — `affixes` 와 같은 길이 · 순서로 `'fixed'` · 죄종 id · `'random'` [2026-10-06 사용자 지시 · SCREEN_DESIGN §6 · ADR-0518].
     * **죄종 id 는 메인 죄종 줄만** — `src` 가 `item.sins` 의 죄종이고 그 죄종의 **첫 줄**일 때(메인 줄은 `sins` 순서대로 랜덤 줄보다 앞에 선다 — `familyOptions`).
     * 죄종 계열 굴림의 랜덤 줄도 `src` 에 계열 죄종을 들지만(메인과 같은 계열이어도) 태그는 `'random'` 이다. `src` 가 없는 옛 접사도 `'random'`.
     * 접사는 안 바꾼다 — `src` 와 `sins` 만 읽으므로 옛 세이브에도 맞는다
     */
    function optionSources(item) {
        const main = new Set(item?.sins ?? []);
        return (item?.affixes ?? []).map(a => {
            if (a.src === 'fixed') return 'fixed';
            if (main.delete(a.src)) return a.src;
            return 'random';
        });
    }

    /**
     * 옵션 줄 하나가 **굴릴 수 있었던 범위** `{min, max}` [신설 2026-10-14 · SCREEN_DESIGN §6 「비교 툴팁 규격」 Shift 범위 · ADR-0617 · INTERFACE §2-5].
     * 그 줄의 표 행을 **굴림이 고른 것과 같은 표**에서 찾는다 — `stat` · `src`(죄종 id · `fixed` · `random`) · 부위 · 무기군(`appliesTo`) · 방어구 갈래.
     * 양끝은 굴림과 **같은 규칙**(`valueOf` — 그 아이템 레벨 · 고정 옵션은 `pctOption` · `rollOf` 의 `u` = 0 · 1 — 치우침 `lean` 은 양끝을 안 바꾼다 · R291)이라 표기 = 굴릴 수 있었던 값이다. 순수 · rng 0.
     * 행을 못 찾으면(표에서 빠진 옛 옵션 · `src` 가 없는 줄 · 옛 무기의 `random` 줄) `null`. 목걸이 `proc` 은 `affixes` 밖이라 안 든다
     */
    function optionRange(item, i) {
        const a = item?.affixes?.[i];
        if (!a) return null;
        if (a.src === 'fixed') {
            const lohi = a.stat === 'atk_pct' ? [B.weapon_fixed_atk_pct_min, B.weapon_fixed_atk_pct_max]
                : a.stat === 'armor_def_pct' ? [B.armor_fixed_def_pct_min, B.armor_fixed_def_pct_max] : null;
            if (lohi) return { min: F.pctOption(lohi[0]), max: F.pctOption(lohi[1]) };
            // 갈래 특성 줄(R303) — 그 아이템 갈래의 특성 범위 · 굴림과 같은 `valueOf`
            const tr = groupDef(item.slot, item.group)?.trait;
            return tr?.stats.includes(a.stat) ? { min: valueOf(tr, rollOf(tr, 0, item.ilvl), item.ilvl), max: valueOf(tr, rollOf(tr, 1, item.ilvl), item.ilvl) } : null;
        }
        const slot = item.slot, src = a.src;
        const g = slot === 'weapon' ? WG[item.group] ?? null : null;
        // 굴림이 읽은 표 — 무기 · 방어구 넷은 죄종 계열표(`familyOptions` · 투구 R299 · 장갑 · 신발 R303) / 목걸이 · 반지는 죄종 칸 / 공통 한 풀
        //   (그 전에 굴린 방어구의 옛 줄 — `random` 공통옵션 · 지금 표에 없는 stat — 은 null · 범위 꼬리가 안 붙는다)
        const rows = slot === 'weapon' ? (g ? sinOpts.filter(r => r.sin === src && appliesTo(r, g)) : [])
            : FAMILY_SLOTS.has(slot) ? armorSinOpts.filter(r => r.slot === slot && r.sin === src)
                : baseless(slot) ? (src === 'random' ? accCommonOpts : accSinRows(slot, src)) : [];
        const d = rows.find(r => r.stat === a.stat);
        return d ? { min: valueOf(d, rollOf(d, 0, item.ilvl), item.ilvl), max: valueOf(d, rollOf(d, 1, item.ilvl), item.ilvl) } : null;
    }

    /**
     * 특정 스킬 +n 합 `{skillId: n}` [2026-10-08 · R225 · INTERFACE §2-5] — 낀 장비의 `skill_plus` 줄을 스킬별로 **더한다**(⚠ 여러 부위 더하기 — 제안).
     * `skill` 이 없는 줄은 건너뛴다 · 순수 · rng 0. 받는 쪽은 `skill.activesFor(hero, {skillPlus})`
     */
    function skillPlusOf(items) {
        const out = {};
        for (const it of items ?? []) for (const a of it?.affixes ?? [])
            if (a.stat === SKILL_PLUS && a.skill) out[a.skill] = (out[a.skill] ?? 0) + a.v;
        return out;
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

    /** 강화 단계마다 성공 확률 — 인덱스 = 단계 − 1 (R253). 단계는 1 부터 이어지고 확률은 0 초과 1 이하 — 어기면 생성 때 던진다 */
    const UP_CHANCE = (data.upgradeChances ?? []).map((r, i) => {
        if (r.step !== i + 1) throw new Error(`upgrade_chance: ${i + 1}번째 줄의 step 이 ${r.step} — 단계는 1 부터 이어져야 한다`);
        if (!(r.chance > 0 && r.chance <= 1)) throw new Error(`upgrade_chance: 단계 ${r.step} 의 chance ${r.chance} — 0 초과 1 이하여야 한다`);
        return r.chance;
    });

    /** 다음 한 단계의 성공 확률(비율) [2026-10-14 · R253]. `upgradeCost` 가 null 이면(상한 · 강화 대상 아님) null · `max` 도 같다.
     *  표에 그 단계가 없으면 **던진다** — 조용히 막으면 강화가 이유 없이 잠긴다(표가 상한을 덮는지는 단정이 본다) */
    function upgradeChance(item, max = B.equip_upgrade_max) {
        if (upgradeCost(item, max) == null) return null;
        const step = (item.up ?? 0) + 1;
        if (UP_CHANCE[step - 1] == null) throw new Error(`upgrade_chance: 단계 ${step} 줄이 없다`);
        return UP_CHANCE[step - 1];
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

    return { rollDrop, rollGear, basesAt, weaponBaseAt, startingWeapon, startingArmor, pctStat, reqLevel, canEquip, groupOf, groupsFor, salvageDust, upgradeMax, upgradeable, upgradeCost, upgradeChance, upgrade, effective, weaponDamage, weaponDamageFixed, implicitFixed, optionSources, optionRange, skillPlusOf };
}
