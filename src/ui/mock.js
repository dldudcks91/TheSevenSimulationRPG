/**
 * 화면 목업 데이터 — **게임 로직이 아니다.**
 *
 * 이 단계의 목적은 "화면이 어떻게 생겼나"를 먼저 확정하는 것.
 * 수치는 전부 손으로 박은 예시이며 밸런스 근거가 없다.
 * 실데이터가 붙는 시점에 이 파일은 통째로 삭제된다.
 *
 * 단, 이름 / 희귀도 색상 / 죄종 색상은 실데이터(src/data/ + 계승분)의 실제 값을 썼다.
 * 화면 폭과 글자 수 감각을 실제와 맞추기 위함.
 *
 * ── 2026-08-28 CSV 이관 ──
 * 챕터·스테이지·몬스터 이름 · 몬스터 얼굴 유무 · 기본 능력치 7 · 전투 능력치 25 · 도감 레벨 보정·계열이
 * **전부 CSV 로 나갔다** (`chapter` · `stage` · `monster` · `hero_attribute` · `combat_stat` ·
 * `codex_level` · `codex_series`). 이름·얼굴·배경 헬퍼는 `ui/data.js` 에 있다.
 *
 * ── 2026-08-31 CSV 이관 (M7 완료) ──
 * `CLASSES` · `SLOTS`/`EQUIP_SLOTS` · `ITEM_BASES` · `AFFIX_DEFS` · `HERO_NAME_POOL` · `HERO_TRAIT_POOL` 이
 * **CSV 로 나갔다** (`class` · `equip_slot` · `item_base` · `affix` · `hero_name` · `hero_trait` —
 * 로더는 `ui/data.js:D.classes`·`D.slots`/`D.equipSlots`·`D.itemBases`·`D.affixDefs`·`D.heroNamePool`·`D.heroTraitPool`).
 * `ELEMENT_IDS` 는 삭제 — SSOT 는 `game_logic/hero.js:ELEMENTS` 하나다.
 * `nm`(이름 조립)은 CSV 가 아니라 **이식 대상 코드**라 `game_logic/naming.js` 로 갔다 (`eliteName` 도 같이).
 * game_logic 이 주입받는데 아직 여기 남은 것 — `SINS` · `SIN_TRAITS` · `COMMON_TRAITS` 셋뿐
 * (전부 죄종 매핑 미확정에 걸려 있다 — INTERFACE §7 · DEV_PLAN §5-B).
 *
 * ── i18n 규약 (2026-08-23) ──
 * 표시 문자열은 전부 **{ko, en} 쌍**이다. 화면은 i18n.js 의 L() 로 현재 언어를 고른다.
 * 영어는 CSV `_en` 컬럼(예정)의 초안 역할 — 검수 후 CSV 로 이사하면 이 파일과 함께 죽는다.
 * 반복되는 접사·아이템명은 빌더 함수(AF/IMP/nm)로 만든다 — 실데이터도 "접사 타입 + 수치" 구조라
 * 이쪽이 손글씨 문자열보다 실제에 가깝다.
 */

/**
 * 확정 수치 — **SSOT는 src/data/balance.csv**.
 * 아직 CSV 로더가 없어 화면용으로 옮겨 적은 것뿐이다. 로더가 붙으면 이 블록은 통째로 교체된다.
 * 화면 코드는 숫자를 직접 박지 말고 반드시 여기를 참조할 것.
 */

/** 스테이지 라운드 구조 (base_expedition_design §1-2) — 구조는 고정, 내용물만 랜덤 */

/** 죄종 — en 은 chapter_info.csv 의 sin_en 그대로. adj 는 아이템/정예 접두 형용사 */
export const SINS = {
    wrath: { ko: '분노', en: 'Wrath', adj: 'Wrathful', color: '#e03030' },
    envy: { ko: '시기', en: 'Envy', adj: 'Envious', color: '#30b050' },
    greed: { ko: '탐욕', en: 'Greed', adj: 'Greedy', color: '#d0a020' },
    sloth: { ko: '나태', en: 'Sloth', adj: 'Slothful', color: '#808898' },
    gluttony: { ko: '폭식', en: 'Gluttony', adj: 'Gluttonous', color: '#e07020' },
    lust: { ko: '색욕', en: 'Lust', adj: 'Lustful', color: '#e03080' },
    pride: { ko: '오만', en: 'Pride', adj: 'Prideful', color: '#8040e0' },
};

/* 스킬 태그 표시 이름(`SKILL_TAGS`)은 **삭제했다** (2026-09-01) — 어휘·대분류·이름의 SSOT 가
   `src/data/skill_tag.csv`(14행 — 2026-09-08 오오라 추가)로 나갔다 (skill_design §11). 읽는 곳은 `ui/data.js:skillTagName` 하나다. */

// 매직~유니크는 equip_rarity_config.csv 의 color_hex 그대로 — **5단계** [일반 신설 2026-09-14 · 사용자 확정 · R86]
// ~~item_design.md §1: "일반 등급 없음 — 필드 드롭 전부가 유의미"~~ → 일반 = 죄종 태그 없음 · 랜덤옵션은 붙는다 · 색은 거의 흰색에 가까운 회색 — 몬스터 일반(style.css `.foe-cell`) · 영웅 일반(hero_tier.csv)과 같은 값 (2026-09-14 사용자 지시)
// 통제 가능성의 계단: 일반(죄종 없음) → 매직(완전 RNG) → 레어(옵션 수↑) → 크래프트(매직 + 전용 옵션 하나 — 2026-09-15 · ~~낙인으로 죄종 지정~~) → 유니크(고정)
export const RARITY = {
    normal: { ko: '일반', en: 'Normal', color: '#D8D8D8' },
    magic: { ko: '매직', en: 'Magic', color: '#4169E1' },
    rare: { ko: '레어', en: 'Rare', color: '#FFD700' },
    craft: { ko: '크래프트', en: 'Craft', color: '#22C55E' },
    unique: { ko: '유니크', en: 'Unique', color: '#FF8C00' },
};

/* 영웅 등급 표(`HERO_TIER`)는 **`src/data/hero_tier.csv` 로 나갔다** (2026-09-08 · R48) —
   09-07 매직 신설로 2층 → 3층이 되면서 굴림 대역(총합·분포)이 데이터가 됐고, 이름·색만 mock 에 남기면
   SSOT 가 둘로 갈린다. 읽는 곳은 `ui/data.js:D.heroTiers` 하나다. */

/**
 * 직업 · 장비 부위/위치 · 아이템 베이스 · 접사 정의는 **CSV 로 나갔다** (2026-08-31):
 *   `class.csv` (7행 · CSV 컬럼은 `release`, 로더가 `stage` 로 주입) · `equip_slot.csv` (8행 = 부위 7 + 반지 두 번째 칸 — 2026-09-01 보조 폐지)
 *   `item_base.csv` (7부위 × 4 — 무기는 없다. 무기의 베이스는 무기군 자체 = `weapon_group.csv`)
 *   `affix.csv` (19행 · `scale` 3분류 · `per_ilvl` 은 `band` 행만)
 * 읽는 곳은 `ui/data.js`(`D.classes` · `D.slots`/`D.equipSlots` · `D.itemBases` · `D.affixDefs`).
 * ⚠ 접사·베이스 수치는 여전히 프로토타입 임시값이고 계승 접사 매트릭스(7죄종×슬롯)는 미연결이다.
 */

/** 접사 표기 — stat id → 이름 + 단위. **화면 전용 사전**이라 CSV 로 가지 않는다 (`SKILL_DISPLAY` 와 같은 성격) */
export const AFFIX_LABELS = {
    atk_flat: { ko: '데미지', en: 'Damage', fmt: 'n' },
    atk_pct: { ko: '데미지', en: 'Damage', fmt: 'pct' },
    hp_flat: { ko: '최대 HP', en: 'Max HP', fmt: 'n' },
    hp_pct: { ko: '최대 HP', en: 'Max HP', fmt: 'pct' },
    def_flat: { ko: '물리 방어', en: 'Physical Defense', fmt: 'n' },
    res_all: { ko: '모든 원소 저항', en: 'All Resistances', fmt: 'pct' },
    res_fire: { ko: '불 저항', en: 'Fire Resist', fmt: 'pct' },
    res_cold: { ko: '냉기 저항', en: 'Cold Resist', fmt: 'pct' },
    res_lightning: { ko: '전기 저항', en: 'Lightning Resist', fmt: 'pct' },
    res_poison: { ko: '독 저항', en: 'Poison Resist', fmt: 'pct' },
    crit_rate: { ko: '치명타 확률', en: 'Crit Chance', fmt: 'pct' },
    crit_damage: { ko: '치명타 피해', en: 'Crit Damage', fmt: 'pct' },
    aspd_pct: { ko: '공격 속도', en: 'Attack Speed', fmt: 'pct' },
    life_steal: { ko: '흡혈', en: 'Life Steal', fmt: 'pct' },
    def_ignore: { ko: '방어 무시', en: 'Defense Ignore', fmt: 'pct' },
    reflect_damage: { ko: '반사 피해', en: 'Reflect Damage', fmt: 'pct' },
    damage_reduction: { ko: '피해 감소', en: 'Damage Reduction', fmt: 'pct' },
    gold_find: { ko: '골드 획득', en: 'Gold Find', fmt: 'pct' },
    item_find: { ko: '드랍률', en: 'Item Find', fmt: 'pct' },
    // ── 무기 옵션 (item_design §1 「무기 옵션」 · 2026-09-11 R78) — 죄종 칸 · 통합옵션 표가 쓰는 축.
    //    `res_reduction` 은 combat_stat.csv 이름과 같게 둔다 — 마스터리 칸도 이 사전을 먼저 읽는다
    res_reduction: { ko: '저항 감소', en: 'Resist Reduction', fmt: 'pct' },
    atk_down_phys_pct: { ko: '타격 시 대상 물리 데미지 감소', en: 'Physical Damage Down on Hit', fmt: 'pct' },
    atk_down_mag_pct: { ko: '타격 시 대상 마법 데미지 감소', en: 'Magic Damage Down on Hit', fmt: 'pct' },
    dmg_per_level_pct: { ko: '레벨당 데미지', en: 'Damage per Level', fmt: 'pct' },
    crushing_blow_pct: { ko: '강타 (현재 체력)', en: 'Crushing Blow (Current HP)', fmt: 'pct' },
    magic_find: { ko: '매직아이템 획득', en: 'Magic Find', fmt: 'pct' },
    vs_normal_dmg: { ko: '일반 대상 추가 피해', en: 'Damage vs Normal', fmt: 'pct' },
    vs_demon_dmg: { ko: '데몬 대상 추가 피해', en: 'Damage vs Demon', fmt: 'pct' },
    vs_undead_dmg: { ko: '언데드 대상 추가 피해', en: 'Damage vs Undead', fmt: 'pct' },
    vs_elite_dmg: { ko: '정예·보스 대상 추가 피해', en: 'Damage vs Elites & Bosses', fmt: 'pct' },
    vs_front_dmg: { ko: '전열 대상 추가 피해', en: 'Damage vs Front Row', fmt: 'pct' },
    vs_back_dmg: { ko: '후열 대상 추가 피해', en: 'Damage vs Back Row', fmt: 'pct' },
    def_down_pct: { ko: '타격 시 대상 방어력 감소', en: 'Defense Shred on Hit', fmt: 'pct' },
    fire_dmg_pct: { ko: '불 피해', en: 'Fire Damage', fmt: 'pct' },
    cold_dmg_pct: { ko: '냉기 피해', en: 'Cold Damage', fmt: 'pct' },
    lightning_dmg_pct: { ko: '전기 피해', en: 'Lightning Damage', fmt: 'pct' },
    poison_dmg_pct: { ko: '독 피해', en: 'Poison Damage', fmt: 'pct' },
    res_down_pct: { ko: '타격 시 대상 원소 저항 감소', en: 'Resist Shred on Hit', fmt: 'pct' },
    // ── 방어구 옵션 (item_design §1 「갑옷 옵션」 · 「투구 옵션」 · 신발 행 · 2026-09-18) — 고정 · 죄종 칸 · 공통옵션 표가 쓰는 축.
    //    `fhr` · `cooldown_reduction` 은 combat_stat.csv 이름과 같게 둔다(마스터리 칸도 이 사전을 먼저 읽는다)
    armor_def_pct: { ko: '물리 방어', en: 'Physical Defense', fmt: 'pct' },           // 고정 — 그 장비 자신의 고유 방어력에만 곱한다
    fhr: { ko: '타격 회복', en: 'Hit Recovery', fmt: 'pct' },
    cooldown_reduction: { ko: '쿨타임 감소', en: 'Cooldown Reduction', fmt: 'pct' },
    hp_recovery_pct: { ko: '체력 회복', en: 'HP Recovery', fmt: 'pct' },
    def_per_level: { ko: '레벨당 물리 방어', en: 'Physical Defense per Level', fmt: 'n' },
    hp_per_level: { ko: '레벨당 최대 HP', en: 'Max HP per Level', fmt: 'n' },
    aspd_per_level_pct: { ko: '레벨당 공격 속도', en: 'Attack Speed per Level', fmt: 'pct' },
    counter_chance: { ko: '반격 확률', en: 'Counter Chance', fmt: 'pct' },
    res_max_fire: { ko: '최대 불 저항', en: 'Max Fire Resist', fmt: 'pct' },
    res_max_cold: { ko: '최대 냉기 저항', en: 'Max Cold Resist', fmt: 'pct' },
    res_max_lightning: { ko: '최대 전기 저항', en: 'Max Lightning Resist', fmt: 'pct' },
    res_max_poison: { ko: '최대 독 저항', en: 'Max Poison Resist', fmt: 'pct' },
    dr_flat: { ko: '피해 감소 (고정)', en: 'Damage Reduction (Flat)', fmt: 'n' },
    vs_normal_dr: { ko: '일반 적에게 받는 피해 감소', en: 'Damage Reduction vs Normal', fmt: 'pct' },
    vs_demon_dr: { ko: '데몬에게 받는 피해 감소', en: 'Damage Reduction vs Demon', fmt: 'pct' },
    vs_undead_dr: { ko: '언데드에게 받는 피해 감소', en: 'Damage Reduction vs Undead', fmt: 'pct' },
    vs_elite_dr: { ko: '정예·보스에게 받는 피해 감소', en: 'Damage Reduction vs Elites & Bosses', fmt: 'pct' },
    vs_front_dr: { ko: '전열 적에게 받는 피해 감소', en: 'Damage Reduction vs Front Row', fmt: 'pct' },
    vs_back_dr: { ko: '후열 적에게 받는 피해 감소', en: 'Damage Reduction vs Back Row', fmt: 'pct' },
    xp_gain_pct: { ko: '경험치 획득', en: 'Experience Gain', fmt: 'pct' },
    freeze_dur_reduction: { ko: '빙결 시간 감소', en: 'Freeze Duration Reduction', fmt: 'pct' },
    poison_dur_reduction: { ko: '중독 시간 감소', en: 'Poison Duration Reduction', fmt: 'pct' },
};

/**
 * 접사 한 줄 — {ko, en}. 단위(%)와 어순은 **여기서만** 정한다.
 * `fallback` = 접사 풀 밖의 축을 그릴 때 쓰는 `{ko, en, fmt}` — 마스터리 노드가 `combat_stat.csv` 행을 넘긴다.
 *   (접사가 아닌 것을 AFFIX_LABELS 에 밀어 넣지 않으려는 것 — 그러면 접사 사전이 접사 아닌 것을 들게 된다)
 */
export const affixText = (stat, v, fallback) => {
    const d = statLabel(stat, fallback);
    return { ko: `${d.ko} ${statValue(stat, v, fallback)}`, en: `${statValue(stat, v, fallback)} ${d.en}` };
};

/** 축 이름만 — {ko, en, fmt}. 이름과 값을 따로 찍는 화면(마스터리 칸)이 문자열을 되파싱하지 않게 한다 */
export const statLabel = (stat, fallback) => AFFIX_LABELS[stat] ?? fallback ?? { ko: stat, en: stat, fmt: 'n' };

/**
 * 퍼센트 숫자 — 값은 **비율**(0.05)로 오고 **찍을 때만** 100 을 곱한다 [2026-09-17 · R111 · src/data/README.md 단위 규약].
 * 곱한 뒤의 부동소수 꼬리(`7.000000000000001`)는 소수 둘째 자리에서 자른다 — 오만 「레벨당 데미지」(0.3%)가 가장 잘다.
 * 화면 곳곳의 `%` 표기가 이것을 쓴다 (app.js · tip.js)
 */
export const pctNum = v => Number((v * 100).toFixed(2));

/** 값만 — 부호와 단위는 affixText 와 **같은 규칙**이다 (단위를 붙이는 곳은 이 파일 하나) */
export const statValue = (stat, v, fallback) => {
    const pct = statLabel(stat, fallback).fmt === 'pct';
    return `${v >= 0 ? '+' : ''}${pct ? pctNum(v) : v}${pct ? '%' : ''}`;
};

/**
 * 밑수 값만 — `statValue` 와 같되 **부호를 안 붙인다**. 접사의 `+` 는 「얼마를 더한다」라 뜻을 들지만
 * 밑수는 「이 아이템이 가진 값」이라 더할 대상이 없다 (아이템 툴팁의 메인 옵션 줄 — SCREEN_DESIGN §6).
 * 단위(%)는 여전히 이 파일 하나가 붙인다.
 */
export const baseValue = (stat, v, fallback) => {
    const pct = statLabel(stat, fallback).fmt === 'pct';
    return `${pct ? pctNum(v) : v}${pct ? '%' : ''}`;
};

/** 페이퍼돌 배치 — 3열 × 3행, 신체 위치를 따른다. 칸은 착용 **위치**(equip_slot.csv:equip_slot_id) — 반지 두 칸.
 *  **화면 레이아웃이지 데이터가 아니라서** CSV 로 가지 않는다 (부위·위치 표는 equip_slot.csv).
 *  2026-09-01 재배치 — 보조 슬롯 폐지(한손 개념 폐지)로 위치가 9 → 8 이 되어 4행이 3행으로 줄었다.
 *  무기 왼쪽 · 갑옷 가운데 · 장갑 오른쪽, 반지 둘이 신발을 감싼다. ⚠ SCREEN_DESIGN §6 갱신은 `/ui` 몫 */
export const PAPERDOLL = [
    [null, 'helmet', 'amulet'],
    ['weapon', 'armor', 'gloves'],
    ['ring1', 'boots', 'ring2'],
];

/* ═══════════ 영웅 생성 풀 ═══════════
   굴리는 규칙은 game_logic/hero.js 에 있고, 풀(데이터)은 **CSV 로 나갔다** (2026-08-31):
   `hero_name.csv` 24행(레어 영웅은 무한 생성이라 이름도 풀에서 뽑는다 — 유니크 15명은 고정 명단이라 들어오지 않는다) ·
   `hero_trait.csv` 12행(시작 특성 — ⚠ 효과 미작성, 지금은 이름표만 굴린다. hero_design §3).
   읽는 곳은 `ui/data.js`(`D.heroNamePool` · `D.heroTraitPool`). */

/* 전투 능력치 — 25종(id·이름·카테고리·계수·단위·`impl`·`sheet_order`)은 `combat_stat.csv` 가 SSOT 고
   로더(`ui/data.js:D.combatStats`)가 읽는다. 시트는 `impl=1` 행을 **`sheet_order` 순**으로 그린다 (SCREEN_DESIGN §6).
   ⚠ **카테고리 라벨 사전 `COMBAT_CATS` 는 2026-09-01 에 삭제했다** — 캐릭터 탭이 카테고리 제목을 안 그리기로 한
   08-26 결정 이후 라벨이 화면에 나온 적이 없고, 마지막 용도였던 시트 정렬마저 `sheet_order` 로 넘어가 읽는 곳이 0이 됐다.
   카테고리 자체는 CSV 의 `category` 컬럼에 남아 있다 — 라벨이 다시 필요해지면 그때 이름을 붙인다.
   **기본 능력치와는 다른 층이다** (CLAUDE.md / hero_design §4) — 기본 7종 = 영웅 고유·장비 불변 /
   전투 25종 = 장비·스킬이 만든다. */

/**
 * 영웅 초상 — 몬스터와 같은 스타일 폴더(`faces/<스타일>/`)의 `hero/<직업id>_<k>.png` (2026-09-07 직업 분류 · 하위 폴더 2026-09-14).
 * **어느 그림인지는 영웅이 태어날 때 굴려 세이브에 박은 `face` 가 정한다** (2026-09-06 사용자 지시).
 *
 * 옛 판은 **이름 해시**였다 — 저장할 자리가 없어서 매번 다시 계산한 것이고, 그래서 두 가지가 따라왔다:
 *   ① 해시가 몰리면 아예 안 나오는 얼굴이 생긴다(실제로 hero_1·3·7 이 그랬다 — DEV_PLAN 부채 #36)
 *   ② 장수를 바꾸면 나머지가 달라져 **기존 영웅 얼굴이 전원 재배정**된다
 * 저장으로 바꾸면서 둘 다 없어졌다. 굴림은 `game_logic/hero.js:rollStartParty` 가 **맨 마지막에 1회**,
 *   저장은 세이브(v13)가, 파일 이름만 여기가 만든다.
 *
 * 인자는 `{face}` 를 가진 것이면 된다 — 영웅 객체 · 후보(굴리는 순간 face 가 박힌다) · 관전 유닛은 `u.hero`.
 * **`face` 가 없으면 null 이다** — 빈 칸으로 두고 아무것도 안 깐다(직업 글리프 폐지 2026-09-03).
 * 장수를 줄여 저장값이 범위를 넘으면 접어서 쓴다 — 없는 파일을 부르느니 있는 얼굴로 떨어진다.
 */
/* 이 값은 **새로 태어나는 영웅**의 굴림 범위다 (2026-09-06 저장형 전환) — 세이브에 이미 박힌 얼굴은 안 바뀐다.
   ⚠ **줄일 때만** 영향이 있다: 범위를 넘은 저장값은 접어서 쓴다(`heroFace`). 늘리는 쪽은 기존 영웅에 무해하다.
   옛 판(이름 해시)에서는 이 값을 바꿀 때마다 **전원 재배정**이었다 — 그 비용은 사라졌다.
   기록은 남긴다: 5 → 14 는 2026-09-03 사용자 지시로 올린 것이다 (다인종 흉상 9종 추가).
   2026-09-04 는 사용자 지시로 여러 번 갈았다: 14 → 1(검투사) → 3(바바리안 변주) → 2 → 5.
   2026-09-05 사용자 지시로 5 → 7 (Gem 기사 시트의 위 두 타일만 채택 · 아래 두 장은 안 썼다).
   2026-09-06 사용자 지시로 7 → 8 (인간 궁수 1종 추가 — 세트에서 처음으로 원거리 직업이 읽히는 얼굴이다),
   같은 날 8 → 9 (외치는 기사 1종 추가). 같은 날 9 → 11 로 올렸다가 **사용자 지시로 되돌렸다** —
   「레인저는 `hero_8` 하나만」이 지시였는데 궁수 시트의 갈색·청회 후드 2타일이 `hero_10..11` 로 더 들어가 있었다.
   게임 사본만 지웠고 원본 타일은 `faces/source/hero/archer_hood_brown · archer_hood_slate` 로 남는다.
   ⚠ 그 시트의 카키(우하단)는 ✦ 워터마크가 **인물 위에** 얹혀 있어 애초에 버린 타일이다. 배경이 아니라
   후드 안쪽 검정 + 카키 테두리를 가로질러서 깨끗한 복원이 안 된다.
   ⚠ **줄이는 방향이라 위 경고가 걸린다** — 세이브에 `face = 10·11` 이 박힌 영웅은 `heroFace` 가 접어서 1·2 를 준다.
   2026-09-07 사용자 지시로 9 → 10 (사제 1종 추가 — `source_sheet_priest.png` 2번 타일 · 세트 첫 사제 얼굴.
   늘리는 방향이라 기존 영웅 얼굴은 안 바뀐다).
   2026-09-07 사용자 지시로 **직업 분류 전환** — 정수 하나(`HERO_FACE_MAX`)를 **직업별 장수 객체(`HERO_FACES`)**로 갈고
   파일명을 `hero_<직업id>_<k>.png` 로 리네임했다. 세이브의 `face` 도 정수에서 `'<직업id>_<k>'` 문자열이 됐다(v13 —
   전 영웅 전면 재굴림). 이력은 남긴다: 위 번호(1~10)는 **구 파일명**이고 아래가 새 이름이다.
   지금은 warrior_1 검투사(구 1) · warrior_2 바바리안(구 2) · warrior_3 백발백염(구 7) ·
   knight_1~3 무안면 로마군(구 3~5) · knight_4 민머리 기사(구 6) · knight_5 외치는 기사(구 9) ·
   archer_1 궁수(구 8) · priest_1~4 사제(구 10 반삭 + 09-07 저녁 신규 셋: 후드 룬 · 흰 두건 · 역병 의사) ·
   mage_1 마법사(수정구 예언자 — 09-07 밤, 마지막 직업 공백이 닫혔다) ·
   mage_2 포세이돈(청록 장발·수염 노인) · mage_3 노스트라다무스(황도 기호 로브 · 회백 장발 노인)
   — 2026-09-16 사용자 지시로 mage 1 → 3. 늘리는 방향이라 기존 영웅 얼굴은 안 바뀐다(faces/cartoon/README).
   ⚠ **드디어 직업 대응이다** — 영웅은 제 직업 풀에서만 굴리므로 궁수 얼굴이 전사에게 가지 않는다.
   풀이 0장인 직업(지금은 확장 직업만)은 `face = null` 이고 화면은 **빈 칸**으로 둔다 (자리표시를 안 깐다). */
export const HERO_FACES = { warrior: 3, knight: 5, mage: 3, archer: 1, priest: 4 };

/**
 * 초상 이름 — `'<직업id>_<k>'` → `{ko, en}` (2026-09-10 사용자 지시 · ADR-0081).
 * **그림 한 장의 이름이지 영웅의 이름이 아니다** — 굴려서 이 얼굴을 받은 평범한 영웅은 제 이름(`hero_name.csv` 풀)을
 *   그대로 쓴다. 이 이름이 읽히는 자리는 지금 **도감 캐릭터 세그먼트의 타일 하나**뿐이다.
 * **왜 이름을 붙이나** — 나중에 **유니크가 이 얼굴을 가져가기 위해서**다. 이름이 붙은 초상은 「굴려서 나오는 얼굴」이 아니라
 *   정해진 개체의 얼굴이 된다. 그 개체 테이블(유니크 영웅)은 아직 없다 — 이름만 먼저 박아 둔 것이다.
 * **없으면 없는 대로다** — 이름이 안 붙은 초상은 여기 줄이 없고, 도감 타일은 **풀 번호**로 남는다 (`codexCharacter`).
 * ⚠ **`hero_name.csv` 와 다른 층이다** — 그쪽은 영웅이 태어날 때 굴리는 **이름 풀**(n01…)이고 얼굴과 아무 관계가 없다.
 *   같은 이름이 양쪽에 있으면 안 된다는 규칙은 없지만, 지금은 겹치지 않는다.
 * ⚠ **목록의 SSOT 는 위 `HERO_FACES` 다** — 여기 줄이 그 장수를 넘어도 도감은 안 그린다(범위 안만 돈다).
 *   영어가 원본이고 한글이 음역인 넷(Maximus · Barbarian · Odysseus · Hannibal)과 **한국어가 원본인 하나**(검황 —
 *   영어 `Sword Emperor` 가 직역)가 섞여 있다.
 */
export const HERO_FACE_NAMES = {
    warrior_1: { ko: '막시무스', en: 'Maximus' },          // 검투사
    warrior_2: { ko: '바바리안', en: 'Barbarian' },        // 바바리안
    warrior_3: { ko: '검황', en: 'Sword Emperor' },        // 백발백염
    knight_1: { ko: '오디세우스', en: 'Odysseus' },        // 무안면 로마군 1
    knight_5: { ko: '한니발', en: 'Hannibal' },            // 외치는 기사
    mage_2: { ko: '포세이돈', en: 'Poseidon' },            // 청록 장발·수염 노인
    mage_3: { ko: '노스트라다무스', en: 'Nostradamus' },   // 황도 기호 로브 노인
    // knight_2 · knight_3 · knight_4 는 이름 없이 번호로 둔다 (2026-09-10 사용자 지시 — 「나중에 안 쓸 듯」)
};
/** 표시용 안정 해시(FNV-1a + 마무리 섞기) — 같은 문자열이면 언제나 같은 수. **game_logic 의 rng 와 무관하다**(결정론 계약 밖).
 *
 * ⚠ **마무리 섞기(murmur3 finalizer)를 빼면 안 된다** (2026-09-06 버그 수정) — 쓰는 쪽이 전부 `% 개수` 라
 *   개수가 **2의 거듭제곱**이면 해시의 **아래 몇 비트만** 쓰인다. FNV-1a 의 곱수 16777619 는 8 로 나눈 나머지가 3 이라
 *   아래 3비트가 거의 안 섞이고, 그러면 **닿지 않는 값이 생긴다.**
 *   실제로 `HERO_FACE_MAX` 를 7 → 8 로 올린 날 이름 24개가 얼굴 5종에만 몰렸다(hero_1·3·7 은 어떤 이름으로도 안 나왔다).
 *   홀수 개수(5·7)에서는 나머지가 32비트 전체를 끌어써서 안 드러나던 결함이다 — 개수에 기대지 않도록 해시 쪽을 고쳤다.
 * ⚠ **영웅 얼굴은 더 이상 이 해시를 안 쓴다** (2026-09-06 저장형 전환) · **스킬 그림도 안 쓴다** (2026-09-18 · ADR-0162 — 그림 없는 스킬은 검은 칸).
 *   지금 쓰는 곳은 `itemArt` 의 옛 무기 개체(`baseId` 없음) 하나다. 마무리 섞기는 그대로 필요하다 — 나머지를 가르는 개수가 무엇이든 아래 비트만 쓰이지 않게. */
const strHash = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
};
export const heroFace = hero => {
    const id = hero?.face;
    if (typeof id !== 'string') return null;            // null·옛 정수 → 빈 칸 (v13 이관이 정수를 남기지 않는다 — 방어)
    const i = id.lastIndexOf('_');
    const cls = id.slice(0, i), k = Math.floor(+id.slice(i + 1));
    const m = HERO_FACES[cls] ?? 0;
    if (!(m >= 1) || !(k >= 1)) return null;
    return `${faceDir()}hero/${cls}_${1 + (k - 1) % m}.png`;   // 장수를 줄여 범위를 넘은 저장값은 접는다 (기존 규칙 유지)
};

/**
 * 스킬 아이콘 그림 — `src/assets/art/icons/skills/<skill_id>.png` (2026-09-03 · SCREEN_DESIGN §2).
 *
 * 제 그림이 있는 스킬은 그것, **없는 스킬은 `null`** — 그리는 쪽(`skillImg` 셋)이 **검은 칸**을 깐다 [2026-09-18 사용자 지시 · ADR-0162].
 *   ~~id 안정 해시로 목록에서 하나~~ 는 폐기 — 남의 그림은 틀린 정보다(부위 실루엣 `slotArt` 와 같은 이유). 자산이 늘면 이 목록에 파일명만 더한다.
 * 파일 유무를 fetch 로 묻지 않는 이유도 같다 — 렌더는 동기다. 목록이 실제 폴더와 갈리면 img 가
 *   `onerror` 로 빠지고 칸이 빈다 — 밑에 이모지를 안 까는 이유는 영웅 초상과 같다(투명 PNG 사이로 비친다).
 * 얼굴 스타일(`faceDir`)을 안 타는 이유 — 스킬 아이콘은 스타일 폴더가 없는 단일 세트다.
 */
export const SKILL_ICON_DIR = './assets/art/icons/skills/';
// [전사 세트 2026-09-09] **전사 7 이 제 그림을 갖는다** — 단색 실루엣 시트 한 장에서 잘라 설치했다
//   (발주·타일 문장은 `.claude/skills/icon-prompt/skill_tiles.md` §3). 09-09 오전의 개명 셋(`war_warcry`·`wg_axe`·
//   `wg_sword2h` → `war_taunt`·`war_doubleswing`·`war_quake`)은 **그림째 교체**돼 옛 컬러 자산이 남아 있지 않다.
//   목록에 없는 스킬은 검은 칸이다(2026-09-18 · ADR-0162 — 해시 폴백 폐기)
export const SKILL_ICON_FILES = [
    'war_bash', 'war_doubleswing', 'war_quake', 'war_leap', 'war_taunt', 'war_shout', 'war_battleorders',
    'kni_smite', 'kni_charge', 'kni_rush', 'kni_duel', 'kni_enchant',
    'kni_might', 'kni_fanaticism', 'kni_defiance',
    'arc_snipe', 'arc_rapid', 'arc_guided', 'arc_multishot', 'arc_pierce', 'arc_poison',
    'mag_fireball', 'mag_iceblast', 'mag_frostnova', 'mag_lightning',
    'mag_chain', 'mag_focus', 'mag_frozenwall', 'mag_inferno',
    'pri_judgment', 'pri_heal', 'pri_grace', 'pri_cure', 'pri_regen',
    'pri_penitence', 'pri_bind', 'pri_haste',
];
export const skillIcon = id => {
    if (!id) return null;
    const key = String(id);
    return SKILL_ICON_FILES.includes(key) ? SKILL_ICON_DIR + key + '.png' : null;
};
/**
 * 미장착 착용 칸의 부위 실루엣 — `src/assets/art/icons/items/empty/<part>.png` (2026-09-03 · SCREEN_DESIGN §6).
 *
 * 축은 **부위**(`equip_slot.csv:part`)라 반지 두 칸(`ring1`·`ring2`)이 같은 그림을 든다.
 * `skillIcon` 과 달리 **해시 폴백이 없다** — 스킬은 「제 그림은 아니어도 늘 같은 그림」이면 되지만
 *   부위는 **틀린 그림이 곧 틀린 정보**다(투구 칸에 장화가 뜨면 그 칸을 잘못 읽는다).
 * 목록에 없는 부위는 `null` 이고, 그 칸은 옛 이모지(`equip_slot.csv:icon`)로 남는다 —
 *   2026-09-17 로 **부위 7종이 다 찼다**(투구·목걸이가 이모지에서 그림으로).
 */
export const SLOT_ART_DIR = './assets/art/icons/items/empty/';
export const SLOT_ART_PARTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'amulet', 'ring'];
export const slotArt = part => SLOT_ART_PARTS.includes(part) ? `${SLOT_ART_DIR}${part}.png` : null;
/**
 * 물약 그림 — `src/assets/art/icons/items/potion/<potion_id>.png` (2026-09-15 · R104 · SCREEN_DESIGN §4-2 · §8-2 · ADR-0148).
 *
 * 축은 `potion.csv:potion_id` 다. **그림은 사용자가 준다** — 받으면 id 를 목록에 한 줄. 목록에 없는 물약은 `null` 이고 칸은 테두리만 선다.
 * `slotArt` 와 같은 이유로 해시 폴백이 없다 — 틀린 그림이 곧 틀린 정보다(마이너 칸에 슈퍼 병이 뜨면 회복량을 잘못 읽는다).
 */
export const POTION_ART_DIR = './assets/art/icons/items/potion/';
export const POTION_ART_IDS = [];
export const potionArt = id => POTION_ART_IDS.includes(id) ? `${POTION_ART_DIR}${id}.png` : null;
/**
 * 물약 **칸**의 배경 실루엣 — 칸 넷 전부가 같은 한 장을 든다 [2026-09-17 사용자 지시].
 *
 * `potionArt` 와 축이 다르다 — 저쪽은 **어느 물약인가**(id 마다 제 그림 · 틀리면 회복량을 잘못 읽는다),
 *   이쪽은 **여기에 물약이 들어간다**는 칸의 말이라 티어를 안 가린다. `slotArt` 의 부위 실루엣과 같은 자리다.
 * 그래서 파일명이 id 가 아니다 — `potion.csv` 에 `slot` 이라는 id 는 없고, 앞으로도 겹치지 않는다.
 */
export const POTION_SLOT_ART = `${POTION_ART_DIR}slot.png`;
/**
 * 방어구 · 장신구 그림 — `icons/items/item_base/<base_id>.png` (2026-09-03 · **베이스 축으로 개정 2026-09-17** · SCREEN_DESIGN §2).
 *
 * 축은 `item_base.csv:base_id` 다 — 개체가 드롭 때 그 id 를 들고(`item.js:build` · INTERFACE 「item 객체」) 화면은 그대로 읽는다.
 *   그래서 퀼티드와 더스크 슈라우드가 **다른 그림**이다. 옛 「부위당 한 장」 표(`ITEM_ART_BY_SLOT`)와
 *   무기군 그림(`<group_id>.png` · `ITEM_ART_GROUPS`)은 2026-09-17 에 걷었다 — 파일 12장도 같이 지웠다(사용자 지시).
 * 목록에 없는 베이스(투구 · 장갑 · 신발 · 장신구 전부)는 `null` 이고 그 칸은 부위 이모지(`equip_slot.csv:icon`)로 떨어진다 —
 *   해시 폴백을 안 쓰는 이유는 `slotArt` · `potionArt` 와 같다(틀린 그림 = 틀린 정보).
 * ⚠ **옛 세이브의 방어구는 `baseId` 가 없다** — 그 개체들도 이모지로 떨어진다(새로 먹는 것부터 그림이 붙는다).
 */
export const ITEM_BASE_ART_DIR = './assets/art/icons/items/item_base/';   // 파일명 = item_base.csv:base_id
/** 그림이 있는 베이스 id — 그림이 오면 여기 한 줄 (`POTION_ART_IDS` 와 같은 문법) */
export const ITEM_BASE_ART_IDS = ['armor_cloth', 'armor_robe_1', 'armor_robe_2', 'armor_robe_3',
    'armor_light_1', 'armor_light_2', 'armor_light_3', 'armor_heavy_1', 'armor_heavy_2', 'armor_heavy_3',
    // 투구 10 [2026-09-17] — 갈래 3(티아라 · 가죽 · 플레이트) × 티어 3 + 시작 하나 (item_design 「투구 갈래」)
    'helmet_cloth', 'helmet_tiara_1', 'helmet_tiara_2', 'helmet_tiara_3',
    'helmet_leather_1', 'helmet_leather_2', 'helmet_leather_3',
    'helmet_plate_1', 'helmet_plate_2', 'helmet_plate_3',
    // 장갑 7 · 신발 7 [2026-09-18] — 갈래 2(가죽 · 건틀릿 / 가죽 · 그리브스) × 티어 3 + 시작 하나 (item_design 「장갑 갈래」 · 「신발 갈래」)
    'gloves_cloth', 'gloves_leather_1', 'gloves_leather_2', 'gloves_leather_3',
    'gloves_gauntlet_1', 'gloves_gauntlet_2', 'gloves_gauntlet_3',
    'boots_start', 'boots_leather_1', 'boots_leather_2', 'boots_leather_3',
    'boots_greaves_1', 'boots_greaves_2', 'boots_greaves_3',
    // 장신구 6 [2026-09-18] — 반지 3 · 목걸이 3 (베이스 이름은 아직 옛 임시 풀이다 — item_design 장신구 갈래 미정)
    'ring_1', 'ring_2', 'ring_3', 'amulet_1', 'amulet_2', 'amulet_3'];
/**
 * 무기 베이스 그림 — `icons/items/weapon_base/<group>/` (2026-09-10 · SCREEN_DESIGN §2 · §9-1). 지금은 본편 열 전부.
 *   열 모두 `weapon_base.csv` 행이 서서 새 개체는 `baseId` 를 들고(아래 `itemArt`) 이름도 그 베이스다 (둔기 · 창 · 활 2026-09-11 · 스태프 · 오브 · 십자가 · 성경 · 석궁 2026-09-14).
 *   아래 문단(uid 해시)은 **`baseId` 없는 옛 개체의 폴백**으로만 산다.
 *
 * ⚠ **파일명이 id 가 아니다.** 무기 베이스는 기획 확정(무기군당 7 · `item_design.md` §1)이지만 `weapon_base` CSV 가
 *   아직 없다(DEV_PLAN R62 — 대역 경계 · 수치 미발행). 그래서 **개체가 어느 베이스인지는 아무 데도 안 적혀 있다.**
 * 그런데도 그림은 고를 수 있다 — **uid 해시**로 그 무기군의 7장 중 하나를 잡는다(`itemArt`). 스킬 아이콘의 해시
 *   폴백과 같은 문법이고, 계약도 같다: **uid 는 세이브에 남으므로 한 개체는 평생 같은 무기로 보인다** (다시 그려도 · 껐다 켜도 안 바뀐다).
 * ⚠ **rng 를 한 발도 안 쓴다** — 그리는 시각의 해시라 `game_logic` 의 난수 수열에 안 닿는다(골든 스냅샷 불변).
 *   「랜덤하게 보이게」를 `Math.random()` 으로 하면 **다시 그릴 때마다 무기가 바뀐다** — 그래서 안 쓴다.
 * ⚠ **이름은 안 따라온다** — 아이템 이름 · 툴팁은 여전히 무기군 이름이다(`item.js:build` 가 무기군을 그대로 base 로 쓴다).
 *   그림과 이름이 어긋나는 것을 **알고 켠 것**이고, `weapon_base` 가 서면 굴림이 `game_logic` 으로 옮겨 가며 둘이 붙는다.
 * 이름 표시(도감)는 `i18n:ix.b.<stem>` 이 든다 — CSV 가 없어 `L()` 로 읽을 데이터 행이 없기 때문이고, 이것도 **임시**다.
 * 목록 순서 = 대역 순(기본 → ①-A · ①-B → ②-A · ②-B → ③-A · ③-B) — `item_design.md` §1 「이름 — 9군」 표의 행 순서다.
 */
export const WEAPON_BASE_DIR = './assets/art/icons/items/weapon_base/';
/** 베이스 그림이 있는 무기군 → 그 7장의 파일 stem. 키 순서는 도감의 묶음 순서다(활 다음 석궁 · ADR-0180). 늘어나면 `<group>/` 폴더를 파고 여기 한 줄 */
export const WEAPON_BASE_STEMS = {
    sword2h: ['long_sword', 'claymore', 'highland_blade', 'bastard_sword', 'balrog_blade', 'zweihander', 'colossus_blade'],
    axe: ['hatchet', 'axe', 'tomahawk', 'great_axe', 'berserker_axe', 'battle_axe', 'decapitator'],
    // ⚠ 무기군마다 id · 순서가 `weapon_base.csv` 와 같아야 한다 — 두 벌이라, 어긋난 베이스는 제 그림 대신 uid 해시 그림을 들어 이름과 갈린다 (단정: dev/test.js)
    mace: ['club', 'flanged_mace', 'reinforced_mace', 'battle_hammer', 'legendary_mallet', 'war_club', 'ogre_maul'],
    spear: ['pike', 'thresher', 'giant_thresher', 'halberd', 'cryptic_axe', 'lance', 'war_pike'],
    bow: ['short_bow', 'long_bow', 'great_bow', 'rune_bow', 'diamond_bow', 'gothic_bow', 'hydra_bow'],
    crossbow: ['crossbow', 'light_crossbow', 'chu_ko_nu', 'heavy_crossbow', 'ballista', 'demon_crossbow', 'colossus_crossbow'],
    staff: ['short_staff', 'long_staff', 'gnarled_staff', 'gothic_staff', 'elder_staff', 'rune_staff', 'archon_staff'],
    orb: ['eagle_orb', 'heavenly_stone', 'demon_heart', 'sacred_globe', 'eldritch_orb', 'swirling_crystal', 'dimensional_shard'],
    crucifix: ['scepter', 'divine_scepter', 'caduceus', 'rune_scepter', 'mighty_scepter', 'grand_scepter', 'seraph_rod'],
    bible: ['psalter', 'breviary', 'missal', 'lectern_bible', 'great_bible', 'wicked_bible', 'apocrypha'],
};
export const weaponBaseArt = (group, stem) => WEAPON_BASE_STEMS[group]?.includes(stem) ? `${WEAPON_BASE_DIR}${group}/${stem}.png` : null;
/**
 * `baseId` 가 있으면(2026-09-10 · `weapon_base.csv` 로 실제 굴린 개체 — `item.baseId`) **그 그림을 그대로** 쓴다 —
 * 이름과 그림이 같은 베이스를 가리키게 된다. 없으면(구 세이브 · 베이스 풀이 아직 없는 무기군) **uid 해시**로 옛날처럼 고른다.
 */
export const itemArt = (slot, group, uid, baseId) => {
    if (slot === 'weapon') {
        // 그 무기군에 베이스 그림이 있으면 **베이스 그림**, 아니면 무기군 그림.
        // 도감의 「무기」 묶음은 uid 없이 부르므로 거기서는 무기군 그림 그대로다 (재고를 보는 자리다 · §9-1)
        const stems = WEAPON_BASE_STEMS[group];
        if (stems) {
            if (baseId && stems.includes(baseId)) return `${WEAPON_BASE_DIR}${group}/${baseId}.png`;
            if (uid)
                // 해시 키에 무기군을 섞는다 — uid 만 쓰면 `i1`·`i2` 같은 **짧은 키**라 7 로 나눈 나머지가 쏠린다
                //   (실측 60개: 발록 17 · 츠바이핸더 3). `<uid>:<group>` 이면 고르게 퍼지고, 무기군이 늘어도 서로 독립이다
                return `${WEAPON_BASE_DIR}${group}/${stems[strHash(`${uid}:${group}`) % stems.length]}.png`;
        }
        return null;   // 무기군 그림 8장은 2026-09-17 삭제 — 베이스 풀이 없는 무기군은 부위 이모지로 떨어진다
    }
    // 방어구 · 장신구 — 개체가 든 베이스의 그림. 그림이 없는 베이스는 `null` → 부위 이모지 (2026-09-17)
    return baseId && ITEM_BASE_ART_IDS.includes(baseId) ? `${ITEM_BASE_ART_DIR}${baseId}.png` : null;
};
/* 직업 글리프 표(`CLASS_GLYPH`·`classGlyph`)는 **삭제했다** (2026-09-03 사용자 지시) — 아트가 없는 영웅의
   자리표시로 이모지(⚔ ⛨ ✦ 🏹 …)를 초상 **밑에 깔던** 방식이다. 영웅 그림이 배경 투명 PNG 이고
   `object-fit: contain` 이라 그림이 있어도 여백 사이로 이모지가 비쳐 보였다 — 「캐릭터 그림 뒤에 활 같은 이모지」.
   지금은 아트가 없으면 **빈 칸**이다 (SCREEN_DESIGN §5). 자리표시를 되살리려면 이모지가 아닌 것으로 한다. */
/* 액티브의 표시 사전(`SKILL_DISPLAY`·`skillDisplay`)은 **삭제했다** (2026-09-01) — 아이콘과 설명 ko/en 이
   `skill.csv` 의 `icon`·`desc_kr`·`desc_en` 컬럼으로 나갔고, 옛 `description_kr`(설계 노트)은 `note` 로 개명했다.
   읽는 곳은 `ui/data.js:skillInfo` 하나다. 아이콘 이모지가 흑백 글리프와 컬러로 섞여 있던 문제는
   2026-09-03 화면이 그림(`skillIcon` — 위)으로 갈아타며 화면에서는 닫혔다 — 컬럼은 데이터로 남는다. */

/* 원소 4종 표시 사전(`ELEMENT_LABELS`)은 **삭제했다** (2026-08-31) — `ELEMENT_IDS` 가 유일한 소비자였고
   그것이 `game_logic/hero.js:ELEMENTS` 로 통합되면서 참조가 0이 됐다. 화면이 원소 이름을 그리게 되면
   그때 다시 만든다(4줄이다). id 목록의 SSOT 는 `hero.js:ELEMENTS` 하나다. */

/* 아이템 이름 조립(`nm`)은 **이식 대상 코드**라 `game_logic/naming.js:createNaming` 으로 갔다 (2026-08-31).
   죄종 표시명(SINS)만 여기서 주입된다 — `ui/data.js:NAMING`. */

/**
 * 배경 이미지 — `src/assets/art/backgrounds/<스타일>/background_stage_<id>.webp`.
 * 파일이름이 스테이지 id(101/102/…)를 그대로 쓰므로 stage_id ↔ 배경이 1:1로 붙는다.
 *
 * **스타일 하나 = 폴더 하나** [2026-09-16 사용자 지시 · `faces/` 와 같은 규칙]. 새 스타일을 넣는 방법은 둘뿐이다:
 *   ① `backgrounds/` 아래 폴더를 만들고 같은 이름 규칙(`background_stage_<id>.webp`)으로 그림을 넣는다
 *   ② 아래 `BG_STYLES` 에 그 폴더 이름을 더한다
 * 코드의 다른 곳은 스타일을 모른다 — 경로를 조립하는 곳이 `bgDir()` 하나뿐이라서다.
 * 고르는 순서는 얼굴과 같다: URL `?bg=<스타일>` → localStorage → 목록의 **첫 항목**.
 * **한 스타일이 전 스테이지를 다 갖출 필요는 없다** — 그림이 없으면 그 자리는 그라디언트로 떨어진다.
 *   그리는 중인 스타일로도 게임이 돈다 (⚠ 자리를 여는 것은 `stage.csv:bg` 지 폴더 재고가 아니다 — `ui/data.js:stageBgOf`.
 *   `bg=1` 인데 그 스타일에 파일이 없으면 404 가 한 번 난다).
 *
 * ⚠ **읽는 것은 워터마크 띠를 잘라 낸 사본이다** [2026-09-11 사용자 지시] — 원본 오른쪽 아래에 생성기 ✦ 가 박혀 있어
 *   아레나 비율에 따라 드러났다. 손 안 댄 원본은 `backgrounds/source/<스타일>/` 이고 레시피는 `assets/art/README.md`.
 * 경로는 문서(src/index.html) 기준 상대경로 — JS가 인라인 스타일로 넣기 때문이다.
 */
export const BG_DIR = './assets/art/backgrounds/';
export const BG_STYLES = ['illustrate', 'pixel'];   // **첫 항목이 기본값이다** — 정식 배경은 일러스트다 [2026-09-16 사용자 지시 · ADR-0152]
const BG_STORE_KEY = 'thesevensim.bgStyle';

let bgStyleCur = (() => {
    const q = new URLSearchParams(location.search).get('bg');
    // `?face=` 와 같이 **그 자리에서 저장한다** — 스타일에는 UI 스위치가 없어서, 저장하지 않으면 매번 다시 붙여야 한다
    if (BG_STYLES.includes(q)) {
        try { localStorage.setItem(BG_STORE_KEY, q); } catch { /* 저장 실패는 무해 — 이번 판만 그 스타일 */ }
        return q;
    }
    try {
        const saved = localStorage.getItem(BG_STORE_KEY);
        if (BG_STYLES.includes(saved)) return saved;
    } catch { /* 프라이빗 모드 등 — 기본값으로 */ }
    return BG_STYLES[0];
})();

export const bgStyle = () => bgStyleCur;
/** 스타일 전환 — 배경은 매 렌더에 경로를 다시 만들므로 호출한 쪽이 render() 하면 그대로 갈린다 */
export function setBgStyle(id) {
    if (!BG_STYLES.includes(id)) return;
    bgStyleCur = id;
    try { localStorage.setItem(BG_STORE_KEY, id); } catch { /* 저장 실패는 무해 */ }
    applyDocumentBg();
}
/** `<html data-bg>` 동기화 — CSS 가 **배경 축소 보간**을 스타일별로 가르는 유일한 신호다
 *  (도트는 끄고 일러스트는 켠다 — `style.css` 의 `--bg-render`). `applyDocumentFace` 와 같은 패턴이고 같은 자리(`app.js render()`)에서 불린다.
 *  안 불려도 안전한 쪽으로 떨어진다 — 속성이 없으면 `:root` 의 기본값(`auto`)이 먹어 정식 배경(일러스트)의 선이 안 끊긴다. */
export function applyDocumentBg() {
    document.documentElement.dataset.bg = bgStyleCur;
}
export const bgDir = () => `${BG_DIR}${bgStyleCur}/`;
/** ⚠ 아직 아무 화면도 안 읽는다 — 자산(`town.webp`)은 실재하고 거점 화면이 생기면 여기가 쓰인다.
 *  **거점 그림은 스타일을 안 탄다** — 도트 한 벌뿐이라 `pixel/` 을 박았다 (CSS `#stage::before` 도 같은 경로를 직접 건다).
 *  ⚠ 정식 배경이 일러스트가 된 뒤로 **거점만 도트로 남아 있다** — 거점 일러스트가 나오면 `bgDir()` 로 돌린다 (ADR-0152 「열린 것」) */
export const TOWN_BG = BG_DIR + 'pixel/town.webp';
export const stageBg = id => bgDir() + `background_stage_${id}.webp`;

/**
 * 탐험 지도 — 챕터 하나에 한 장 (SCREEN_DESIGN §8-4 · 2026-09-04 사용자 지시).
 *
 * ⚠ 위 넷과 달리 **계승이 아니라 신규 아트**다 — 같은 폴더에 섞여 있을 뿐이고, **픽셀아트가 아니다.**
 *   `image-rendering: pixelated` 를 걸면 뭉갠다 (`.ex-map` 이 안 거는 이유 — style.css).
 * **가진 챕터가 SSOT 를 안 갖는다** — `stage.csv:bg` 같은 열이 없으므로 여기 목록이 자산 재고다
 *   (`HERO_FACES` 와 같은 문법). 없는 챕터는 null 이라 화면이 지도 칸째로 빠진다 — 빈 액자를 안 그린다.
 */
export const EXPLORE_MAP_CHAPTERS = [1];
export const exploreMap = ch => (EXPLORE_MAP_CHAPTERS.includes(ch) ? BG_DIR + `explore_chapter_${ch}.webp` : null);

/**
 * 몬스터 얼굴 — `src/assets/art/faces/<스타일>/monster/<idx>.png` · 영웅 초상은 같은 스타일 폴더의 `hero/<직업id>_<k>.png`.
 *
 * **스타일 하나 = 폴더 하나** (2026-08-30). 새 스타일을 넣는 방법은 둘뿐이다:
 *   ① `faces/` 아래 폴더를 만들고 같은 경로 규칙(`monster/<idx>.png` · `hero/<직업id>_<k>.png`)으로 그림을 넣는다
 *   ② 아래 `FACE_STYLES` 에 그 폴더 이름을 더한다
 * 코드의 다른 곳은 스타일을 모른다 — 경로를 조립하는 곳이 `faceDir()` 하나뿐이라서다.
 * 고르는 순서는 언어와 같다: URL `?face=<스타일>` → localStorage → 목록의 **첫 항목**.
 * **한 스타일이 전 몬스터를 다 갖출 필요는 없다** — 파일이 없으면 그 자리는 죄종 색 원판 + 이니셜로 떨어진다
 * (렌더러가 `<img onerror>` 로 받는다). 그리는 중인 스타일로도 게임이 돈다.
 *
 * **어느 몬스터가 얼굴을 갖는가는 `monster.csv:face` 가 SSOT** — 여기 남는 것은 경로 조립뿐이다
 * (이름 ko/en 도 `monster_name_kr`/`_en` 으로 이사했다 — ui/data.js:monsterName·monsterFace).
 */
export const FACE_STYLES = ['cartoon'];      // **첫 항목이 기본값이다**. ~~`pixel16`~~ 은 폴더째 사라져 2026-09-17 에 뺐다 —
// 목록이 하나면 도감의 고르개가 안 선다(app.js:faceStylePicker). 폴더를 새로 채우면 여기에 한 줄 더하는 것으로 되살아난다
const FACE_STORE_KEY = 'thesevensim.faceStyle';

let faceStyleCur = (() => {
    const q = new URLSearchParams(location.search).get('face');
    // URL 로 고르면 **그 자리에서 저장한다** — 스타일에는 언어 토글 같은 UI 스위치가 없어서, 저장하지 않으면
    //   `?face=` 를 매번 다시 붙여야 한다(문서는 「한 번 걸면 계속 그 스타일로 돈다」고 적고 있었다). 2026-08-30 수정
    if (FACE_STYLES.includes(q)) {
        try { localStorage.setItem(FACE_STORE_KEY, q); } catch { /* 저장 실패는 무해 — 이번 판만 그 스타일 */ }
        return q;
    }
    try {
        const saved = localStorage.getItem(FACE_STORE_KEY);
        if (FACE_STYLES.includes(saved)) return saved;
    } catch { /* 프라이빗 모드 등 — 기본값으로 */ }
    return FACE_STYLES[0];
})();

export const faceStyle = () => faceStyleCur;
/** 스타일 전환 — 얼굴은 매 렌더에 경로를 다시 만들므로 호출한 쪽이 render() 하면 그대로 갈린다 */
export function setFaceStyle(id) {
    if (!FACE_STYLES.includes(id)) return;
    faceStyleCur = id;
    try { localStorage.setItem(FACE_STORE_KEY, id); } catch { /* 저장 실패는 무해 */ }
    applyDocumentFace();
}
/** `<html data-face>` 동기화 — CSS 가 **초상 축소 보간**을 스타일별로 가르는 유일한 신호다
 *  (도트는 끄고 손그림은 켠다 — `style.css` 의 `--face-render` · [SCREEN_DESIGN §5]).
 *  `i18n.js:applyDocumentLang` 과 같은 패턴이고 같은 자리(`app.js render()`)에서 불린다.
 *  안 불려도 안전한 쪽으로 떨어진다 — 속성이 없으면 `:root` 의 기본값(보간 켬)이 먹는다. */
export function applyDocumentFace() {
    document.documentElement.dataset.face = faceStyleCur;
}
export const faceDir = () => `./assets/art/faces/${faceStyleCur}/`;

/**
 * 정예 특성 — 계승 elite_trait.csv. en 은 CSV 의 trait_name(영문) 그대로.
 * 죄종 고유 1 + 공통 2 로 정예가 조립된다 — ⚠ 공통은 계승 16 중 10 만 옮겼고(840 변형은 기획의 16 기준) 효과는 아직 없다 · 이름표만 굴린다 (monster_design §6).
 */
export const SIN_TRAITS = {
    wrath: { ko: '격분', en: 'Frenzy' },
    sloth: { ko: '태만', en: 'Apathy' },
    lust: { ko: '유혹', en: 'Temptation' },
    envy: { ko: '박탈', en: 'Deprivation' },
    pride: { ko: '불가침', en: 'Inviolable' },
    gluttony: { ko: '탐식', en: 'Gorging' },
    greed: { ko: '도박', en: 'Gamble' },
};
export const COMMON_TRAITS = [
    { ko: '강인한', en: 'Vigorous' },
    { ko: '단단한', en: 'Durable' },
    { ko: '날랜', en: 'Swift' },
    { ko: '흉포한', en: 'Ferocious' },
    { ko: '민첩한', en: 'Nimble' },
    { ko: '정확한', en: 'Precise' },
    { ko: '치명적인', en: 'Deadly' },
    { ko: '가시의', en: 'Thorny' },
    { ko: '선제의', en: 'Preemptive' },
    { ko: '흡혈의', en: 'Vampiric' },
];

/**
 * 원정 = 스테이지 런 (base_expedition_design §1-2).
 * 챕터 1 = 스테이지 4개, 각 스테이지 9라운드. 이름·몬스터·보스는 실데이터(stage.csv) 그대로.
 */

/*
 * 죄종 세트효과 — **보류** (item_design.md §4, 2026-08-25). 세트포인트·브레이크포인트 3/6/9·세트 보너스 표는
 * 화면에서 내렸다. 설계안은 문서에, 원본 값은 계승 equipment_set_bonus.csv 에 그대로 남아 있다.
 * 접사의 죄종은 이름(nm)과 태그로만 보인다 — 파티 전술이 세는 축이다 (~~지역 드롭 편향~~ 2026-08-27 폐기 · ~~낙인 지정~~ 2026-09-15 소멸).
 */


/* ═══════════ 스킬 ═══════════ */
// 화면은 프레임만 갖고 내용은 전부 실데이터다 — 마스터리 노드는 mastery_node.csv,
//   당하는 값은 balance.csv, 찍은 랭크는 세이브다 (2026-08-28 목업 폐기)

export const MASTERY_GRID = { tiers: 3, nodes: 3 };
/* ═══════════ 도감 ═══════════ */
/**
 * 몬스터 도감 — **몬스터 카드 모델** (2026-08-25 확정, monster_design §8). 처치 수 문턱(08-22)을 대체한다.
 *
 * 처치마다 확률로 그 몬스터의 카드가 떨어지고([balance.csv:codex_card_drop_pct]), 카드가 누적 문턱을 넘을 때마다
 * 도감 레벨이 오른다. 레벨별 필요 장수(`codex_level.csv:cards_to_next`) · 레벨별 보정 %(`bonus_pct`) ·
 * 계열 배정(`codex_series.csv`) 는 전부 CSV 다 — 여기 남은 것은 **화면 전용 라벨**뿐이다.
 * 챕터 이름·죄종은 `chapter.csv` (ui/data.js:D.chapterList · chapterOf).
 */

/** 스테이지 번호별 계열 라벨 — 계열 자체는 codex_series.csv, 여기는 표시 문구뿐. 스테이지 목록은 ui/data.js:codexStages() 가 stage.csv 에서 만든다.
 *  **5(챕터보스 단독 스테이지)는 키가 없다** — codex_series.csv 에도 행이 없고 배정은 기획 미정이다(GAME_DESIGN §10). 화면이 빈 칸으로 그린다 (2026-09-11) */
export const CX_STAT = {
    1: { ko: '데미지', en: 'Damage' },
    2: { ko: '체력', en: 'Health' },
    // ⚠ 계열 3 은 **미정**이다 — 08-26 명중·회피 폐지로 `codex_series.csv:acc_pct` 가 갈 곳을 잃었고,
    //    재배정은 GAME_DESIGN §10 대기다. 폐기된 스탯 이름을 유저에게 그리지 않는다 (2026-09-08)
    3: { ko: '미정', en: 'TBD' },
    4: { ko: '피해량', en: 'Damage' },
};
/** 완성 보상 라벨 — 표시 전용(보상 효과 미구현) */
export const CX_DONE = {
    1: { ko: '치명률 +2%', en: '+2% Crit Rate' },
    2: { ko: '방어력 +2%', en: '+2% Defense' },
    3: { ko: '미정', en: 'TBD' },                    // ⚠ 회피율도 08-26 폐지분 — 계열 3 과 같은 자리에서 대기 (§10)
    4: { ko: '공격 속도 +2%', en: '+2% Attack Speed' },
};

/**
 * 상단 목업 — ⚠ **여기 숫자는 전부 거짓이다** (SCREEN_DESIGN §8-3 · base_expedition_design §2-6).
 * 기획이 방문 주기 · 체류 · 가격 · 재고를 하나도 안 정했으므로(GAME_DESIGN §10 「상단의 수치 전부」)
 * **CSV 로 가지 않는다** — 확정 전에 SSOT 를 만들면 그 CSV 가 기획을 앞질러 굳는다.
 * 연구 목업(RESEARCH)이 걸어 둔 길과 같고, 확정되면 통째로 지우고 `game_logic` 의 상태 함수로 갈아탄다.
 *
 * ⚠ **장비는 목록에 없다** — 기획이 「장비는 안 판다」로 닫아 둔 자리다(§5 스코프 가드).
 */
/* ⚠ **`ore_*` 의 이름은 `mine_node.csv` 가 SSOT 다** [2026-09-10] — 여기 이름이 갈리면 같은 id 가 화면 두 곳에서
   다르게 불린다(실제로 `ore_t5` 가 「흑철」로 남아 있었다). 재고 구성·가격만 목업이고 **이름은 표에서 베낀다.**
   상단 재고가 CSV 로 나가면 이 주의는 사라진다 (「mock 과 CSV 가 겹치면 CSV 만」 — DEV_PLAN §5-B) */
export const TRADE = {
    /** 기본상단 — 상주 · 고정 목록. 「언제 가도 같다」가 요점이라 타이머가 없다 */
    basic: [
        { id: 'ore_t1', name: { ko: '구리', en: 'Copper' }, n: 20, gold: 120 },
        { id: 'ore_t2', name: { ko: '철', en: 'Iron' }, n: 12, gold: 380 },
        { id: 'dust', name: { ko: '분해 가루', en: 'Salvage Dust' }, n: 40, gold: 60 },
    ],
    /** 특수상단 — 방문마다 굴린다. `here` 가 false 면 `t` 는 다음 방문까지 남은 시간이다 */
    special: {
        here: true,
        t: '1시간 12분',
        who: { ko: '떠돌이 광물상', en: 'Wandering Ore Dealer' },
        stock: [
            { id: 'ore_t5', name: { ko: '수은', en: 'Quicksilver' }, n: 4, gold: 2400 },
            { id: 'brand', name: { ko: '낙인', en: 'Brand' }, n: 1, gold: 5000 },
        ],
    },
};

/* 의뢰 게시판(`COMMISSIONS`)은 **CSV 로 나갔다** (2026-09-03 사용자 지시) — `commission_kind.csv`(종류 2종 ·
   확정 기획 — 09-07 목표형 개정으로 4종 → 2종, DEV_PLAN R45)와 `commission.csv`(게시판 행 · ⚠임시 자리채움) 두 표이고 로더는 `ui/data.js:D.commissionKinds`·
   `D.commissionList` 다. 목업으로 시작했다가 같은 날 옮겼다 — 상단(TRADE)·연구(RESEARCH)와 갈리는 지점이고,
   근거는 「mock 과 CSV 가 겹치면 CSV 만 둔다」(SCREEN_DESIGN §14 · DEV_PLAN §5-B). */

/* ═══════════ 연구 — ⚠ 목업 (SCREEN_DESIGN §13-1 · ADR-0145, 2026-09-15 사용자 지시) ═══════════
 * **가지 8 구조만 섰다** — 원정 · 탐험 · 제련소 · 선술집 · 상단 · 자원 · 도감 · 파티 전술. 가지끼리 서로 잠그지 않는다.
 * 노드의 이름 · 여는 것 · 비용 · 여는 조건은 기획이 안 정했다 → **노드는 자리표시**다(이름 = 가지 이름 + 번호 · 여는 것 = 「미정」).
 * 그래서 **CSV 로 가지 않는다** — 확정 전에 SSOT 를 만들면 그 CSV 가 기획을 앞질러 굳는다.
 * 기획이 확정되면 이 상수는 통째로 지우고 `game_logic` 의 상태 함수로 갈아탄다 (DEV_PLAN §4 #27).
 *
 * branches[].key — 가지 이름의 i18n 키. 탭 · 파견처 이름을 그대로 빌린다(제련소 · 상단은 탭 이름이 아니라 시설 이름 — §13-1)
 * nodes          — 위에서 아래로. 선행(`need`)은 같은 가지의 **바로 위 노드**뿐이다
 * state          — done(완료) | open(살 수 있다) | locked(위 노드가 남았다)
 * name · gain    — 없으면 화면이 자리표시(「가지 이름 + 번호」 · 「미정」)를 찍는다
 * mat · gold     — ⚠ 지어낸 값
 */
const RS_COST = [{ mat: 20, gold: 400 }, { mat: 35, gold: 900 }, { mat: 60, gold: 1600 }];
/* 카드 머리의 건물 그림 — ⚠ **단색 실루엣 목업**이다(가지마다 그릴 아트가 없다 · SCREEN_DESIGN §13-1 · ADR-0146).
   viewBox 64×48 · 채움은 CSS 의 currentColor(글자색을 따라 테마를 탄다). 아트가 오면 이 표만 이미지로 갈아 끼운다 */
const rsSvg = body => `<svg viewBox="0 0 64 48" aria-hidden="true">${body}</svg>`;
const RS_ART = {
    // 원정 — 성문(탑 둘 · 아치 문 · 깃발)
    expedition: rsSvg('<path fill-rule="evenodd" d="M6 46V12h4v4h3v-4h4v4h3v-4h4v10h16V12h4v4h3v-4h4v4h3v-4h4v34ZM26 46V36a6 6 0 0 1 12 0v10Z"/><path d="M50 12V1h1.4v11ZM51.4 1.2 60 4l-8.6 2.8Z"/>'),
    // 탐험 — 언덕 위 망루
    explore: rsSvg('<path d="M2 46c8-8 18-12 30-12s22 4 30 12Z"/><path d="M27 35 29 15h6l2 20Z"/><path d="M24 15h16l-8-9Z"/><path d="M31.4 6V0h1.2v6ZM32.6 .4 39 2.2l-6.4 1.8Z"/>'),
    // 제련소 — 작업장 + 굴뚝 + 화로 입
    forge: rsSvg('<path fill-rule="evenodd" d="M4 46V26l15-10 15 10v20ZM14 46v-9h10v9Z"/><path d="M44 30V8h7v22Z"/><path fill-rule="evenodd" d="M36 46V28h24v18ZM42 46v-6a6 6 0 0 1 12 0v6Z"/><circle cx="47" cy="4" r="2.6"/><circle cx="53" cy="1.8" r="1.8"/>'),
    // 선술집 — 박공집 + 매단 간판
    tavern: rsSvg('<path fill-rule="evenodd" d="M6 46V24L24 10l18 14v22ZM19 46V35h10v11Z"/><path d="M42 20h16v2H42Z"/><path d="M47 22h1.2v3H47ZM54 22h1.2v3H54ZM45 25h12v9H45Z"/>'),
    // 상단 — 짐마차
    trade: rsSvg('<path d="M12 33V21c0-6 8-10 19-10s19 4 19 10v12Z"/><path d="M8 33h46v4H8Z"/><path fill-rule="evenodd" d="M18 36a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11Zm0 3.8a1.7 1.7 0 1 0 0 3.4a1.7 1.7 0 1 0 0-3.4Z"/><path fill-rule="evenodd" d="M44 36a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11Zm0 3.8a1.7 1.7 0 1 0 0 3.4a1.7 1.7 0 1 0 0-3.4Z"/><path d="M54 34h9v2h-9Z"/>'),
    // 자원 — 산 + 갱도 입구(버팀목)
    resource: rsSvg('<path fill-rule="evenodd" d="M1 46 22 13l8 10 9-9 24 32ZM24 46V37a8 8 0 0 1 16 0v9Z"/><path d="M22.5 46V34h2.5v12ZM39 46V34h2.5v12ZM21.5 32h21v2.5h-21Z"/>'),
    // 도감 — 기둥 선 서고
    codex: rsSvg('<path d="M4 17 32 4l28 13Z"/><path d="M6 19h52v3H6Z"/><path d="M10 23h5v18h-5ZM22 23h5v18h-5ZM37 23h5v18h-5ZM49 23h5v18h-5Z"/><path d="M4 42h56v4H4Z"/>'),
    // 파티 전술 — 작전 천막 + 깃발
    tactics: rsSvg('<path fill-rule="evenodd" d="M4 46 32 11l28 35ZM26 46l6-13 6 13Z"/><path d="M31.3 11V1h1.4v10ZM32.7 1.2 42 4l-9.3 2.8Z"/>'),
};
const rsBranch = (id, key, first = {}) => {
    const nodes = [];
    RS_COST.forEach((cost, i) => {
        const up = nodes[i - 1];
        nodes.push({
            id: `${id}_${i + 1}`, n: i + 1, ...cost,
            state: !up || up.state === 'done' ? 'open' : 'locked',
            need: up?.id,
            ...(up ? {} : first),
        });
    });
    return { id, key, art: RS_ART[id], nodes };
};

export const RESEARCH = {
    /** ⚠ 지어낸 보유량 — 채집 재료(약초)는 자원 칸(G.resources)에 아직 없다 */
    material: 42,
    branches: [
        // 원정 1 만 내용이 섰다 — 던전 레벨 조절(GAME_DESIGN §9 09-14 「나중에 연구로 옮긴다」). 화면 이름은 출정 창의 「위험도」를 따른다.
        // 지금 처음부터 열려 있으므로 완료로 선다
        rsBranch('expedition', 'nav.expedition', {
            state: 'done',
            name: { ko: '위험도 조절', en: 'Danger Level' },
            gain: { ko: '스테이지마다 위험도를 올린다', en: 'Raise the danger of each stage' },
        }),
        rsBranch('explore', 'nav.explore'),
        rsBranch('forge', 'dp.post.forge'),
        rsBranch('tavern', 'nav.tavern'),
        rsBranch('trade', 'dp.post.trade'),
        rsBranch('resource', 'nav.resource'),
        rsBranch('codex', 'nav.codex'),
        rsBranch('tactics', 'rs.h'),
    ],
};
