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
 * game_logic 이 주입받는데 아직 여기 남은 것 — `CLASSES` · `SLOTS`/`EQUIP_SLOTS` · `SINS` · `ELEMENT_IDS` ·
 * `ITEM_BASES` · `AFFIX_DEFS` · `nm` · `HERO_NAME_POOL` · `HERO_TRAIT_POOL` · `SIN_TRAITS` · `COMMON_TRAITS`
 * (이식 차단 목록 — INTERFACE §7 · DEV_PLAN §5-B).
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

// equip_rarity_config.csv 의 color_hex 그대로 — 4단계, **일반(Normal) 등급 없음**
// item_design.md §1: "일반 등급 없음 — 필드 드롭 전부가 유의미"
// 통제 가능성의 계단: 매직(완전 RNG) → 레어(옵션 수↑) → 크래프트(낙인으로 죄종 지정) → 유니크(고정)
export const RARITY = {
    magic: { ko: '매직', en: 'Magic', color: '#4169E1' },
    rare: { ko: '레어', en: 'Rare', color: '#FFD700' },
    craft: { ko: '크래프트', en: 'Craft', color: '#22C55E' },
    unique: { ko: '유니크', en: 'Unique', color: '#FF8C00' },
};

/**
 * 영웅 2층 구조 (hero_design §1) — 아이템 희귀도 계단의 영웅판.
 * 색상은 RARITY의 같은 등급을 그대로 쓴다 (같은 계단이라는 걸 화면에서 읽히게).
 */
export const HERO_TIER = {
    unique: {
        ko: '유니크', en: 'Unique', color: '#FF8C00',
        desc: {
            ko: '이름·직업·죄종 고정 + 고유 스킬 1개(영웅 전용) · 로스터에 1명만',
            en: 'Fixed name, class & sin + 1 signature skill (hero-exclusive) · one per roster',
        },
    },
    rare: {
        ko: '레어', en: 'Rare', color: '#FFD700',
        desc: {
            ko: '직업·죄종·특성 전부 굴림 · 고유 스킬은 공용 풀 배정 · 죄종×직업 35칸 담당',
            en: 'Class, sin & trait all rolled · signature skill from shared pool · covers all 35 sin×class cells',
        },
    },
};

/**
 * 직업 7종 (hero_design §2) — 본편 5 + 확장 2. 확장 직업은 아직 화면에 등장하지 않는다.
 * i18n 을 위해 **id 로 참조**한다 — HEROES.cls / SKILL_TREES.mastery 키가 이 id 를 쓴다.
 * 무기군은 여기 적지 않는다 — 직업 전속 배정은 **weapon_group.csv 의 classes 열**이 SSOT 다 (2026-08-25 확정).
 *
 * keyAttr = 이 직업을 미는 기본 능력치. hero_attribute.csv 의 combat_stat 열에서 그대로 나온다
 *   (힘→물리 공격력 / 지능→마법 공격력 / 민첩→행동 주기 / 건강→상태이상 회복 속도 / **운→드랍률·골드(전투 밖)** / 통솔·매력→없음).
 *   생성 굴림이 이 축을 밀어 준다 — 지능 7인 마법사가 나오면 플레이어가 인과를 읽을 수 없다.
 *   사제 = 순수 캐스터(마법사와 무기 풀 공유) → 파워 출처는 마법 공격력 = 지능 (battle_design §8, 08-25).
 *   ⚠ 궁수=운은 **이름만 따라간 것**이다 (08-26 감각→운) — 전투 계수가 없는 축이 주력이 됐다.
 *     물리 공격력을 쓰는데 힘이 안 곱해지므로 `str` 재배정이 유력하나 기획 미결 (GAME_DESIGN §10 · hero_design §4-1-1).
 *   ⚠ 기사=건강은 제안 — 건강이 HP 를 떠나 상태이상 회복 속도만 밀게 된 뒤(08-25) 탱커의 주력 축은 미확정.
 *   ⚠ 밀어주는 세기는 제안 — 기획 확정 필요 (2026-08-24)
 */
export const CLASSES = [
    { id: 'warrior', keyAttr: 'str', ko: '전사', en: 'Warrior', role: { ko: '근접 물리', en: 'Melee Physical' }, stage: 'main' },
    { id: 'knight', keyAttr: 'vit', ko: '기사', en: 'Knight', role: { ko: '탱커 · 수호', en: 'Tank · Guardian' }, stage: 'main' },
    { id: 'mage', keyAttr: 'int', ko: '마법사', en: 'Mage', role: { ko: '마법', en: 'Magic' }, stage: 'main' },
    { id: 'archer', keyAttr: 'luck', ko: '궁수', en: 'Archer', role: { ko: '원거리 물리', en: 'Ranged Physical' }, stage: 'main' },
    { id: 'priest', keyAttr: 'int', ko: '사제', en: 'Priest', role: { ko: '지원 · 회복', en: 'Support · Healing' }, stage: 'main' },
    { id: 'assassin', keyAttr: 'agi', ko: '암살자', en: 'Assassin', role: { ko: '치명 · 속도', en: 'Crit · Speed' }, stage: 'expansion' },
    { id: 'necromancer', keyAttr: 'int', ko: '네크로맨서', en: 'Necromancer', role: { ko: '소환', en: 'Summoning' }, stage: 'expansion' },
];

/**
 * 장비 — **부위 8종 · 착용 위치 9개** (반지 ×2, 2026-08-25 확정 — item_design §1 / GAME_DESIGN §5).
 * 드롭·접사·필터는 부위(SLOTS) 단위, 페이퍼돌·equipped 는 위치(EQUIP_SLOTS) 단위다.
 * ⚠ 계승분(equipment_base.csv)은 5부위(weapon/armor/helmet/gloves/boots)뿐이고
 *   접사 매트릭스도 7죄종 × 5부위다. 보조/목걸이/반지 3부위는 계승 데이터가 없다 —
 *   신규 3부위의 베이스·접사 데이터는 미작성 (inherited_data_gaps.md G3-b). 지금은 화면 확인용 목업.
 */
export const SLOTS = [
    { id: 'weapon', ko: '무기', en: 'Weapon', icon: '⚔' },
    { id: 'offhand', ko: '보조', en: 'Off-hand', icon: '🛡' },
    { id: 'helmet', ko: '투구', en: 'Helmet', icon: '⛑' },
    { id: 'armor', ko: '갑옷', en: 'Armor', icon: '🧥' },
    { id: 'gloves', ko: '장갑', en: 'Gloves', icon: '🧤' },
    { id: 'boots', ko: '신발', en: 'Boots', icon: '👢' },
    { id: 'amulet', ko: '목걸이', en: 'Amulet', icon: '📿' },
    { id: 'ring', ko: '반지', en: 'Ring', icon: '💍' },
];
/** 착용 위치 9개 — id 는 세이브의 equipped 키, part 는 SLOTS 의 부위 id */
export const EQUIP_SLOTS = [
    { id: 'weapon', part: 'weapon' }, { id: 'offhand', part: 'offhand' },
    { id: 'helmet', part: 'helmet' }, { id: 'armor', part: 'armor' },
    { id: 'gloves', part: 'gloves' }, { id: 'boots', part: 'boots' },
    { id: 'amulet', part: 'amulet' }, { id: 'ring1', part: 'ring' }, { id: 'ring2', part: 'ring' },
];


/**
 * 아이템 베이스 — 부위별 기본 이름 풀. 이름 조립은 nm() (죄종 접두 + 베이스 + 죄종 접미).
 * **무기는 여기 없다** — 무기의 베이스는 무기군 자체이고, 직업 전속·한손/양손·행동 주기·공격 타입 전부 weapon_group.csv 가 SSOT 다.
 * ⚠ 계승 equipment_base.csv(5부위)를 아직 연결하지 않았다 — 보조/목걸이/반지 3부위는 계승 데이터가 없다.
 */
export const ITEM_BASES = {
    offhand: [
        { ko: '원형 방패', en: 'Round Shield' }, { ko: '탑 방패', en: 'Tower Shield' },
        { ko: '견갑', en: 'Spaulder' }, { ko: '버클러', en: 'Buckler' },
    ],
    helmet: [
        { ko: '풀 헬름', en: 'Full Helm' }, { ko: '날개 투구', en: 'Winged Helm' },
        { ko: '뼈 투구', en: 'Bone Helm' }, { ko: '가죽 모자', en: 'Leather Cap' },
    ],
    armor: [
        { ko: '판금 갑옷', en: 'Plate Mail' }, { ko: '사슬 갑옷', en: 'Chain Mail' },
        { ko: '가죽 갑옷', en: 'Leather Armor' }, { ko: '유령 갑옷', en: 'Ghost Armor' },
    ],
    gloves: [
        { ko: '건틀릿', en: 'Gauntlets' }, { ko: '사슬 장갑', en: 'Chain Gloves' },
        { ko: '경장갑', en: 'Light Gauntlets' }, { ko: '가죽 장갑', en: 'Leather Gloves' },
    ],
    boots: [
        { ko: '전투화', en: 'Battle Boots' }, { ko: '사슬 장화', en: 'Chain Boots' },
        { ko: '중장화', en: 'Heavy Boots' }, { ko: '경장화', en: 'Light Boots' },
    ],
    amulet: [
        { ko: '부적', en: 'Talisman' }, { ko: '금목걸이', en: 'Gold Necklace' },
        { ko: '눈 목걸이', en: 'Eye Pendant' }, { ko: '시계추 목걸이', en: 'Pendulum Amulet' },
    ],
    ring: [
        { ko: '은반지', en: 'Silver Ring' }, { ko: '인장', en: 'Signet' },
        { ko: '대식 반지', en: 'Glutton Ring' }, { ko: '시간 반지', en: 'Hourglass Ring' },
    ],
};

/**
 * 접사 정의 — stat id + 굴림 범위 + **스케일 분류**. 수치는 임시(⚠) — 계승 접사 매트릭스(7죄종×슬롯)는 미연결.
 * **여기 있는 축은 전부 전투에 실제로 걸린다** — 안 걸리는 접사는 넣지 않는다 (거짓 선택지 금지).
 * slots 가 없으면 전 부위.
 *
 * `scale` (item_design §2-1 · battle_design §9-0) — ilvl 로 어떻게 커지는가:
 *   `growth` 굴림 × power_growth_per_level^(ilvl−1) — 성장 축(공격력·HP flat). 소수 1자리
 *   `band`   굴림 + ilvl × perIlvl — 비율 축(물리 방어). **`perIlvl` 은 여기에만 남는다**
 *   `flat`   굴림 그대로, **ilvl 무관** — % 접사·치명·공속·흡혈·방어 무시·저항·유틸 전부
 *
 * 저항은 소재값이 아니라 **직접 %**(상한형)라 자랄 이유가 없다 (battle_design §9-5) —
 *   전 원소 공통 `res_all` + 원소별 4종이 같은 항에 더해진다.
 * `damage_reduction` 은 **원천별 곱**이라 실효 체력이 개수에 지수로 자란다 — 값을 낮게 유지한다 (item_design §2 주의문).
 * `res_max_bonus` · `res_reduction` 은 축은 살아 있지만 **드롭 접사 풀에 넣지 않는다** — 유니크·크래프트·낙인의 자리.
 */
export const AFFIX_DEFS = [
    { stat: 'atk_flat', scale: 'growth', min: 0.3, max: 0.9, slots: ['weapon'] },
    { stat: 'atk_pct', scale: 'flat', min: 3, max: 8, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
    { stat: 'hp_flat', scale: 'growth', min: 8, max: 20, slots: ['armor', 'helmet', 'boots', 'offhand', 'amulet', 'ring'] },
    { stat: 'hp_pct', scale: 'flat', min: 2, max: 5, slots: ['armor', 'helmet', 'amulet'] },
    { stat: 'def_flat', scale: 'band', min: 2, max: 6, perIlvl: 0.3, slots: ['armor', 'helmet', 'gloves', 'boots', 'offhand'] },
    { stat: 'res_all', scale: 'flat', min: 3, max: 10, slots: ['armor', 'helmet', 'gloves', 'boots', 'offhand', 'amulet'] },
    { stat: 'res_fire', scale: 'flat', min: 6, max: 20, slots: ['armor', 'helmet', 'gloves', 'boots', 'offhand', 'amulet', 'ring'] },
    { stat: 'res_cold', scale: 'flat', min: 6, max: 20, slots: ['armor', 'helmet', 'gloves', 'boots', 'offhand', 'amulet', 'ring'] },
    { stat: 'res_lightning', scale: 'flat', min: 6, max: 20, slots: ['armor', 'helmet', 'gloves', 'boots', 'offhand', 'amulet', 'ring'] },
    { stat: 'res_poison', scale: 'flat', min: 6, max: 20, slots: ['armor', 'helmet', 'gloves', 'boots', 'offhand', 'amulet', 'ring'] },
    { stat: 'crit_rate', scale: 'flat', min: 2, max: 5, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
    { stat: 'crit_damage', scale: 'flat', min: 8, max: 18, slots: ['weapon', 'ring', 'amulet'] },
    { stat: 'aspd_pct', scale: 'flat', min: 2, max: 5, slots: ['weapon', 'gloves', 'boots'] },
    { stat: 'life_steal', scale: 'flat', min: 1, max: 3, slots: ['weapon', 'ring'] },
    { stat: 'def_ignore', scale: 'flat', min: 3, max: 8, slots: ['weapon', 'gloves'] },
    { stat: 'reflect_damage', scale: 'flat', min: 3, max: 8, slots: ['armor', 'offhand'] },
    { stat: 'damage_reduction', scale: 'flat', min: 2, max: 5, slots: ['armor', 'helmet', 'offhand'] },
    { stat: 'gold_find', scale: 'flat', min: 5, max: 12, slots: ['boots', 'gloves', 'ring', 'amulet'] },
    { stat: 'item_find', scale: 'flat', min: 4, max: 10, slots: ['boots', 'gloves', 'ring', 'amulet'] },
];

/** 접사 표기 — stat id → 이름 + 단위. 단위 붙이기는 렌더러 한 곳(affixText)에서만 */
export const AFFIX_LABELS = {
    atk_flat: { ko: '공격력', en: 'Attack', fmt: 'n' },
    atk_pct: { ko: '공격력', en: 'Attack', fmt: 'pct' },
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
};

/** 접사 한 줄 — {ko, en}. 단위(%)와 어순은 여기서만 정한다 */
export const affixText = (stat, v) => {
    const d = AFFIX_LABELS[stat] ?? { ko: stat, en: stat, fmt: 'n' };
    const num = `${v >= 0 ? '+' : ''}${v}${d.fmt === 'pct' ? '%' : ''}`;
    return { ko: `${d.ko} ${num}`, en: `${num} ${d.en}` };
};

/** 페이퍼돌 배치 — 3열 × 4행, 신체 위치를 따른다. 칸은 착용 **위치**(EQUIP_SLOTS.id) — 반지 두 칸.
 *  2026-08-27 재배치 — 목걸이는 투구 오른쪽 · 장갑은 무기 아래 · 신발은 보조 아래 · 반지는 장갑·신발 아래 (SCREEN_DESIGN §6) */
export const PAPERDOLL = [
    [null, 'helmet', 'amulet'],
    ['weapon', 'armor', 'offhand'],
    ['gloves', null, 'boots'],
    ['ring1', null, 'ring2'],
];

/* ═══════════ 영웅 생성 풀 ═══════════
   굴리는 규칙은 game_logic/hero.js 에 있다. 여기는 풀(데이터)만 — CSV 로 이사하면 _kr/_en 컬럼 쌍이 된다. */

/**
 * 이름 풀 — 레어 영웅은 무한 생성이므로 이름도 풀에서 뽑는다 (hero_design §1).
 * 유니크 15명은 고정 명단이라 이 풀에 들어오지 않는다.
 * CSV 로 이사하면 name_kr / name_en 컬럼 쌍이 된다.
 */
export const HERO_NAME_POOL = [
    { ko: '아르덴', en: 'Arden' }, { ko: '브리엔', en: 'Brienne' }, { ko: '케이든', en: 'Caden' },
    { ko: '델피네', en: 'Delphine' }, { ko: '에드릭', en: 'Edric' }, { ko: '피오나', en: 'Fiona' },
    { ko: '그레이엄', en: 'Graham' }, { ko: '하이델', en: 'Haidel' }, { ko: '이언', en: 'Ian' },
    { ko: '유디트', en: 'Judith' }, { ko: '키어런', en: 'Kieran' }, { ko: '리오넬', en: 'Lionel' },
    { ko: '마르고', en: 'Margot' }, { ko: '노엘', en: 'Noel' }, { ko: '오르윈', en: 'Orwin' },
    { ko: '페린', en: 'Perrin' }, { ko: '퀜틴', en: 'Quentin' }, { ko: '로웨나', en: 'Rowena' },
    { ko: '세드릭', en: 'Cedric' }, { ko: '테오도르', en: 'Theodore' }, { ko: '우르술라', en: 'Ursula' },
    { ko: '발렌', en: 'Valen' }, { ko: '위넬', en: 'Wynnel' }, { ko: '이베인', en: 'Yvaine' },
];

/**
 * 시작 특성 — 영웅 1명당 1개, 반고정 생성의 세 번째 축 (이름 + 메인 죄종 + 시작 특성).
 * ⚠ **효과는 아직 미작성이다** — 지금은 이름표만 굴린다 (hero_design §3 시작특성).
 */
export const HERO_TRAIT_POOL = [
    { ko: '다혈질', en: 'Hot-Blooded' }, { ko: '날렵함', en: 'Nimble' }, { ko: '강골', en: 'Sturdy' },
    { ko: '언변', en: 'Silver Tongue' }, { ko: '탐구심', en: 'Inquisitive' }, { ko: '타고난 지휘관', en: 'Born Commander' },
    { ko: '침착함', en: 'Composed' }, { ko: '억척스러움', en: 'Tenacious' }, { ko: '예리한 눈', en: 'Keen Eye' },
    { ko: '무쇠 팔', en: 'Iron Arm' }, { ko: '잔꾀', en: 'Cunning' }, { ko: '신실함', en: 'Devout' },
];

/**
 * 전투 능력치 카테고리 라벨 — **화면 전용 사전**이라 CSV 로 가지 않는다.
 * 능력치 자체(25종 · id·이름·카테고리·계수·단위·`impl`)는 `combat_stat.csv` 가 SSOT 고
 * 로더(`ui/data.js:D.combatStats`)가 읽는다 — 시트는 `impl=1` 행만 그린다.
 * **기본 능력치와는 다른 층이다** (CLAUDE.md / hero_design §4) — 기본 7종 = 영웅 고유·장비 불변 /
 * 전투 25종 = 장비·스킬이 만든다.
 */
export const COMBAT_CATS = [
    { id: 'offense', ko: '공격', en: 'Offense' },
    { id: 'defense', ko: '방어', en: 'Defense' },
    { id: 'sustain', ko: '유지', en: 'Sustain' },
    { id: 'tempo', ko: '템포', en: 'Tempo' },
    { id: 'utility', ko: '유틸', en: 'Utility' },
];

/**
 * 영웅 초상 — 아직 아트가 없다. 몬스터와 같은 자리(faces/)를 쓰되 파일명만 hero_<uid>.png.
 * 지금은 전부 null → 폴백(네모 박스 + 직업 글리프)이 그려진다. 아트가 들어오면 이 함수 한 줄만 바꾼다.
 */
export const heroFace = uid => null;   // eslint-disable-line no-unused-vars
/**
 * 직업 글리프 — 아트가 없는 영웅의 얼굴. **영웅의 생김새는 어디서나 같다** (2026-08-27, SCREEN_DESIGN §5):
 * 영웅 띠 · 후보 카드 · 관전 유닛 카드가 전부 이 표 하나를 읽는다. 표시 사전이라 game_logic 에 주입하지 않는다.
 */
export const CLASS_GLYPH = { warrior: '⚔', knight: '⛨', mage: '✦', archer: '🏹', priest: '✚', assassin: '🗡', necromancer: '☠' };
export const classGlyph = cls => CLASS_GLYPH[cls] ?? '⚔';
/**
 * 관전 스킬 쿨 게이지 **목업** (2026-08-27, DEV_PLAN 부채 #13) — 스킬이 미작성이라 타임라인에 스킬 이벤트가 없다.
 * 직업별 액티브 3 자리표시: 이름 ko/en · 표기 쿨(초) · 아이콘 `i`(관전 쿨 칸이 이름 대신 찍는다) · 설명 `d` ko/en(툴팁 — SCREEN_DESIGN §4-2).
 * 설명은 **수치를 적지 않는다** — 수치의 SSOT 는 CSV 이고 이 표는 지워질 자리표시다. 재생기(battle.js mockUseSkill)가 영웅의 실제 행동 이벤트마다
 * 슬롯 순으로 준비된 것 하나를 "쓴" 것처럼 리셋만 한다 — 결과에 아무 영향이 없다. 스킬 이벤트가 생기면 이 표는 지운다.
 */
export const MOCK_ACTIVES = {
    warrior: [
        { n: { ko: '강타', en: 'Heavy Strike' }, cd: 6, i: '⚔', d: { ko: '단일 대상을 세게 내리친다', en: 'A heavy blow on one target' } },
        { n: { ko: '회전 베기', en: 'Whirlwind' }, cd: 12, i: '🌀', d: { ko: '몸을 돌려 적 전원을 벤다', en: 'Spin and cut every enemy' } },
        { n: { ko: '전투 함성', en: 'Battle Cry' }, cd: 20, i: '📣', d: { ko: '한동안 아군의 기세를 올린다', en: 'Raises the party for a while' } }],
    knight: [
        { n: { ko: '방패 치기', en: 'Shield Bash' }, cd: 8, i: '🛡', d: { ko: '방패로 밀쳐 대상의 다음 행동을 늦춘다', en: 'Shove with the shield, delaying the target' } },
        { n: { ko: '도발', en: 'Taunt' }, cd: 12, i: '💢', d: { ko: '적의 시선을 자신에게 끌어온다', en: 'Pulls enemy attention onto yourself' } },
        { n: { ko: '철벽', en: 'Iron Wall' }, cd: 24, i: '⛨', d: { ko: '한동안 받는 피해를 크게 줄인다', en: 'Cuts incoming damage for a while' } }],
    mage: [
        { n: { ko: '화염구', en: 'Fireball' }, cd: 5, i: '🔥', d: { ko: '불덩이를 던진다 — 불 피해', en: 'Hurls a ball of flame — fire damage' } },
        { n: { ko: '냉기 파동', en: 'Frost Wave' }, cd: 10, i: '❄', d: { ko: '적 전원을 얼려 느리게 만든다 — 냉기 피해', en: 'Freezes and slows every enemy — cold damage' } },
        { n: { ko: '번개 폭풍', en: 'Lightning Storm' }, cd: 18, i: '⚡', d: { ko: '벼락을 연달아 떨어뜨린다 — 전기 피해', en: 'Calls down repeated bolts — lightning damage' } }],
    archer: [
        { n: { ko: '속사', en: 'Quick Shot' }, cd: 4, i: '💨', d: { ko: '짧은 쿨로 화살을 빠르게 쏜다', en: 'A fast shot on a short cooldown' } },
        { n: { ko: '관통 화살', en: 'Piercing Arrow' }, cd: 9, i: '🎯', d: { ko: '적의 방어를 뚫고 꽂힌다', en: 'Punches through the target’s armour' } },
        { n: { ko: '화살비', en: 'Arrow Rain' }, cd: 16, i: '🏹', d: { ko: '화살을 쏟아부어 적 전원을 때린다', en: 'Rains arrows on every enemy' } }],
    priest: [
        { n: { ko: '치유', en: 'Heal' }, cd: 8, i: '✚', d: { ko: '가장 다친 아군의 HP 를 회복한다', en: 'Restores HP to the most wounded ally' } },
        { n: { ko: '축복', en: 'Bless' }, cd: 14, i: '✨', d: { ko: '한동안 아군의 공격을 강화한다', en: 'Strengthens allied attacks for a while' } },
        { n: { ko: '정화', en: 'Purify' }, cd: 20, i: '💧', d: { ko: '아군에게 걸린 나쁜 효과를 걷어낸다', en: 'Strips harmful effects from allies' } }],
    assassin: [
        { n: { ko: '급습', en: 'Ambush' }, cd: 5, i: '🗡', d: { ko: '허를 찔러 치명타로 꽂는다', en: 'Strikes from surprise for a critical hit' } },
        { n: { ko: '독 바르기', en: 'Envenom' }, cd: 10, i: '☠', d: { ko: '무기에 독을 발라 지속 피해를 남긴다', en: 'Coats the weapon, leaving damage over time' } },
        { n: { ko: '은신', en: 'Vanish' }, cd: 18, i: '🌑', d: { ko: '모습을 감춰 적의 표적에서 벗어난다', en: 'Slips out of sight and off enemy targets' } }],
    necromancer: [
        { n: { ko: '해골 소환', en: 'Raise Skeleton' }, cd: 10, i: '💀', d: { ko: '해골을 불러 대신 싸우게 한다', en: 'Raises a skeleton to fight for you' } },
        { n: { ko: '생명력 흡수', en: 'Life Drain' }, cd: 8, i: '🩸', d: { ko: '적의 생명을 빨아 자신을 회복한다', en: 'Drains the enemy to heal yourself' } },
        { n: { ko: '저주', en: 'Curse' }, cd: 15, i: '🕸', d: { ko: '대상을 약하게 만들어 더 아프게 한다', en: 'Weakens the target so it takes more' } }],
};
export const mockActives = cls => MOCK_ACTIVES[cls] ?? MOCK_ACTIVES.warrior;

/* ═══════════ 아이템 빌더 ═══════════ */
/**
 * 아이템 이름 — ko "분노의 Base — 오만" / en "Wrathful Base of Pride" (D2 매직/레어 명명).
 * base 는 문자열(양 언어 공통, 계승 영문 베이스명) 또는 {ko, en} (한국어 전용 베이스).
 */
/** 원소 4종 표시 — id 는 monster.csv:attack_type · combat_stat.csv:res_* 와 같은 어휘 (battle_design §9-5) */
export const ELEMENT_LABELS = {
    fire: { ko: '불', en: 'Fire' },
    cold: { ko: '냉기', en: 'Cold' },
    lightning: { ko: '전기', en: 'Lightning' },
    poison: { ko: '독', en: 'Poison' },
};
export const ELEMENT_IDS = Object.keys(ELEMENT_LABELS);

export const nm = (preSin, base, sufSin) => {
    const b = typeof base === 'string' ? { ko: base, en: base } : base;
    const p = SINS[preSin];
    return {
        ko: `${p.ko}의 ${b.ko}${sufSin ? ` — ${SINS[sufSin].ko}` : ''}`,
        en: `${p.adj} ${b.en}${sufSin ? ` of ${SINS[sufSin].en}` : ''}`,
    };
};


/**
 * 배경 이미지 — TheSevenRPG 계승분 (src/assets/inherited/backgrounds/).
 * 파일명이 계승 스테이지 id(101/102/103)를 그대로 쓰므로 stage_id ↔ 배경이 1:1로 붙는다.
 * 원본 PNG는 32bit RGBA라 4장 18MB였다 → **WebP q88로 변환해 888KB** (해상도 무손실, 상세는 같은 폴더 README).
 * ⚠ 104(사탄의 제단)와 챕터 2 이후는 원작에도 없다 — 없는 스테이지는 기존 그라디언트로 폴백한다.
 * 경로는 문서(src/index.html) 기준 상대경로 — JS가 인라인 스타일로 넣기 때문이다.
 */
export const BG_DIR = './assets/inherited/backgrounds/';
export const TOWN_BG = BG_DIR + 'town.webp';
export const stageBg = id => BG_DIR + `background_stage_${id}.webp`;

/**
 * 몬스터 얼굴 — 계승 자산(src/assets/inherited/faces/face_<idx>.png).
 * **어느 몬스터가 얼굴을 갖는가는 `monster.csv:face` 가 SSOT** — 여기 남는 것은 경로 조립뿐이다
 * (이름 ko/en 도 `monster_name_kr`/`_en` 으로 이사했다 — ui/data.js:monsterName·monsterFace).
 */
export const FACE_DIR = './assets/inherited/faces/';

/**
 * 정예 특성 — 계승 elite_trait.csv. en 은 CSV 의 trait_name(영문) 그대로.
 * 죄종 고유 1 + 공통 2 로 정예가 조립된다 (840 변형).
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
 * 접사의 죄종은 이름(nm)과 태그로만 보인다 — 접사 카테고리 · 지역 드롭 편향 · 낙인 지정의 축.
 */


/* ═══════════ 스킬 ═══════════ */
// 독립 트리 3탭, 포인트 풀 공유 (skill_design §1)
// 노드 이름은 skill_design §2에 적힌 컨셉만 사용. 미작성분은 (미정) 표기 — 기획 선점 금지

/**
 * 트리 하나 = **3행 × 5열 그리드** (2026-08-22 확정).
 * 열 = 깊이(왼→오 진행), 행 = 병렬 분기. 노드는 정사각형, 왼쪽 칸과 이어질 때만 선을 긋는다.
 *
 * `link: true` = 왼쪽 칸이 선행 조건 (선을 긋는다) / 없으면 독립 노드 (선 없음)
 * `null` = 미작성 칸 — 프레임만 보여주고 비워둔다 (화면이 기획을 선점하지 않는다)
 */
export const SKILL_GRID = { rows: 3, cols: 5 };
const _ = null;   // 빈 칸을 짧게

export const SKILL_TREES = {
    sin: {
        wrath: [
            [{ n: { ko: '격노', en: 'Enrage' }, r: 3, max: 5 }, { n: { ko: '치명 강화', en: 'Lethality' }, r: 5, max: 5, link: true }, _, _, _],
            [{ n: { ko: '잃은 체력 비례 공격력', en: 'Attack per Missing Health' }, r: 2, max: 5 }, _, _, _, _],
            [_, _, { n: { ko: '분노 접사 수당 치명타 보정', en: 'Crit per Wrath Affix' }, r: 0, max: 3, locked: true }, _, _],
        ],
        pride: [
            [{ n: { ko: '증폭', en: 'Amplify' }, r: 4, max: 5 }, _, _, _, _],
            [{ n: { ko: '상태이상 면역', en: 'Status Immunity' }, r: 1, max: 3 }, _, _, _, _],
            [_, _, _, _, _],
        ],
        lust: [
            [{ n: { ko: '흡혈', en: 'Lifesteal' }, r: 5, max: 5 }, { n: { ko: '공속 강화', en: 'Attack Speed Up' }, r: 3, max: 5, link: true }, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ],
    },
    // 마스터리는 **직업별**로 따로 있다 (7 + 2N 덧셈 구조, skill_design §4)
    // 키는 CLASSES 의 id — 무기군 배정은 weapon_group.csv(2026-08-25 직업 전속) 그대로, 무기군마다 독립 분기라 행을 하나씩 쓴다
    mastery: {
        warrior: [
            [{ n: { ko: '둔기 숙련', en: 'Mace Mastery' }, r: 3, max: 5 }, _, _, _, _],
            [{ n: { ko: '도끼 숙련', en: 'Axe Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [{ n: { ko: '창 숙련', en: 'Spear Mastery' }, r: 0, max: 5 }, { n: { ko: '방어구 숙련', en: 'Armor Mastery' }, r: 2, max: 5 }, _, _, _],
        ],
        knight: [
            [{ n: { ko: '한손검 숙련', en: 'Longsword Mastery' }, r: 4, max: 5 }, _, _, _, _],
            [{ n: { ko: '양손검 숙련', en: 'Greatsword Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [{ n: { ko: '방어구 숙련', en: 'Armor Mastery' }, r: 3, max: 5 }, _, _, _, _],
        ],
        mage: [
            [{ n: { ko: '완드 숙련', en: 'Wand Mastery' }, r: 2, max: 5 }, _, _, _, _],
            [{ n: { ko: '스태프 숙련', en: 'Staff Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [_, _, _, _, _],
        ],
        archer: [
            [{ n: { ko: '활 숙련', en: 'Bow Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [{ n: { ko: '석궁 숙련', en: 'Crossbow Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [_, _, _, _, _],
        ],
        priest: [
            [{ n: { ko: '완드 숙련', en: 'Wand Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [{ n: { ko: '스태프 숙련', en: 'Staff Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [_, _, _, _, _],
        ],
    },
    // 전직 트리는 정체 자체가 미정 — 프레임만 잠긴 채로 보여준다
    advance: {
        note: {
            ko: '전직 트리 — 정체 미작성',
            en: 'Advancement tree — not yet designed',
        },
    },
};

export const SKILL_POINTS = { total: 24, spent: 21 };

/* ═══════════ 도감 ═══════════ */
/**
 * 몬스터 도감 — **몬스터 카드 모델** (2026-08-25 확정, monster_design §8). 처치 수 문턱(08-22)을 대체한다.
 *
 * 처치마다 확률로 그 몬스터의 카드가 떨어지고([balance.csv:codex_card_drop_pct]), 카드가 누적 문턱을 넘을 때마다
 * 도감 레벨이 오른다. 레벨별 필요 장수(`codex_level.csv:cards_to_next`) · 레벨별 보정 %(`bonus_pct`) ·
 * 계열 배정(`codex_series.csv`) 는 전부 CSV 다 — 여기 남은 것은 **화면 전용 라벨**뿐이다.
 * 챕터 이름·죄종은 `chapter.csv` (ui/data.js:D.chapterList · chapterOf).
 */

/** 스테이지 번호별 계열 라벨 — 계열 자체는 codex_series.csv, 여기는 표시 문구뿐. 스테이지 목록은 ui/data.js:codexStages() 가 stage.csv 에서 만든다 */
export const CX_STAT = {
    1: { ko: '공격력', en: 'Attack' },
    2: { ko: '체력', en: 'Health' },
    3: { ko: '명중률', en: 'Accuracy' },
    4: { ko: '피해량', en: 'Damage' },
};
/** 완성 보상 라벨 — 표시 전용(보상 효과 미구현) */
export const CX_DONE = {
    1: { ko: '치명률 +2%', en: '+2% Crit Rate' },
    2: { ko: '방어력 +2%', en: '+2% Defense' },
    3: { ko: '회피율 +2%', en: '+2% Evasion' },
    4: { ko: '공격 속도 +2%', en: '+2% Attack Speed' },
};
