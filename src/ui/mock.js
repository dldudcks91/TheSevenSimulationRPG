/**
 * 화면 목업 데이터 — **게임 로직이 아니다.**
 *
 * 이 단계의 목적은 "화면이 어떻게 생겼나"를 먼저 확정하는 것.
 * 수치는 전부 손으로 박은 예시이며 밸런스 근거가 없다.
 * 실데이터가 붙는 시점에 이 파일은 통째로 삭제된다.
 *
 * 단, 이름 / 희귀도 색상 / 죄종 색상 / 챕터·스테이지·몬스터 이름은
 * 실데이터(src/data/ + 계승분)의 실제 값을 썼다. 화면 폭과 글자 수 감각을 실제와 맞추기 위함.
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
            ko: '이름·직업·죄종 고정 + 고유 패시브 1개 · 로스터에 1명만',
            en: 'Fixed name, class & sin + 1 unique passive · one per roster',
        },
    },
    rare: {
        ko: '레어', en: 'Rare', color: '#FFD700',
        desc: {
            ko: '직업·죄종·특성 전부 굴림 · 고유 패시브 없음 · 죄종×직업 35칸 담당',
            en: 'Class, sin & trait all rolled · no unique passive · covers all 35 sin×class cells',
        },
    },
};

/**
 * 직업 7종 (hero_design §2) — 본편 5 + 확장 2. 확장 직업은 아직 화면에 등장하지 않는다.
 * i18n 을 위해 **id 로 참조**한다 — HEROES.cls / SKILL_TREES.mastery 키가 이 id 를 쓴다.
 * 무기군은 여기 적지 않는다 — 직업 전속 배정은 **weapon_group.csv 의 classes 열**이 SSOT 다 (2026-08-25 확정).
 *
 * keyAttr = 이 직업을 미는 기본 능력치. hero_attribute.csv 의 combat_stat 열에서 그대로 나온다
 *   (힘→물리 공격력 / 지능→마법 공격력 / 민첩→행동 주기 / 감각→명중·회피 / 건강→상태이상 회복 속도 / 통솔·매력→없음).
 *   생성 굴림이 이 축을 밀어 준다 — 지능 7인 마법사가 나오면 플레이어가 인과를 읽을 수 없다.
 *   사제 = 순수 캐스터(마법사와 무기 풀 공유) → 파워 출처는 마법 공격력 = 지능 (battle_design §8, 08-25).
 *   ⚠ 기사=건강은 제안 — 건강이 HP 를 떠나 상태이상 회복 속도만 밀게 된 뒤(08-25) 탱커의 주력 축은 미확정.
 *   ⚠ 밀어주는 세기는 제안 — 기획 확정 필요 (2026-08-24)
 */
export const CLASSES = [
    { id: 'warrior', keyAttr: 'str', ko: '전사', en: 'Warrior', role: { ko: '근접 물리', en: 'Melee Physical' }, stage: 'main' },
    { id: 'knight', keyAttr: 'vit', ko: '기사', en: 'Knight', role: { ko: '탱커 · 수호', en: 'Tank · Guardian' }, stage: 'main' },
    { id: 'mage', keyAttr: 'int', ko: '마법사', en: 'Mage', role: { ko: '마법', en: 'Magic' }, stage: 'main' },
    { id: 'archer', keyAttr: 'sen', ko: '궁수', en: 'Archer', role: { ko: '원거리 물리', en: 'Ranged Physical' }, stage: 'main' },
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
 * 접사 정의 — stat id + 범위. 수치는 임시(⚠) — 계승 접사 매트릭스(7죄종×슬롯)는 미연결.
 * **여기 있는 축은 전부 전투에 실제로 걸린다** — 안 걸리는 접사는 넣지 않는다 (거짓 선택지 금지).
 * slots 가 없으면 전 부위.
 * res_all = 원소 저항 4종(전기·불·냉기·독, 08-25 마법 방어 대체)에 같은 값으로 펴지는 프로토타입 접사 —
 *   공격의 원소 배정이 정해지면 res_lightning/res_fire/res_cold/res_poison 으로 쪼갠다.
 */
export const AFFIX_DEFS = [
    { stat: 'atk_flat', min: 2, max: 6, perIlvl: 0.8, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
    { stat: 'atk_pct', min: 3, max: 8, perIlvl: 0.3, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
    { stat: 'hp_flat', min: 8, max: 20, perIlvl: 2, slots: ['armor', 'helmet', 'boots', 'offhand', 'amulet', 'ring'] },
    { stat: 'hp_pct', min: 2, max: 5, perIlvl: 0.2, slots: ['armor', 'helmet', 'amulet'] },
    { stat: 'def_flat', min: 2, max: 6, perIlvl: 0.8, slots: ['armor', 'helmet', 'gloves', 'boots', 'offhand'] },
    { stat: 'res_all', min: 2, max: 6, perIlvl: 0.8, slots: ['armor', 'helmet', 'gloves', 'boots', 'offhand', 'amulet'] },
    { stat: 'crit_rate', min: 2, max: 5, perIlvl: 0.2, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
    { stat: 'crit_damage', min: 8, max: 18, perIlvl: 0.8, slots: ['weapon', 'ring', 'amulet'] },
    { stat: 'aspd_pct', min: 2, max: 5, perIlvl: 0.15, slots: ['weapon', 'gloves', 'boots'] },
    { stat: 'life_steal', min: 1, max: 3, perIlvl: 0.1, slots: ['weapon', 'ring'] },
    { stat: 'evasion', min: 3, max: 8, perIlvl: 0.5, slots: ['boots', 'armor', 'offhand'] },
    { stat: 'accuracy', min: 3, max: 8, perIlvl: 0.5, slots: ['gloves', 'helmet', 'ring'] },
    { stat: 'def_ignore', min: 3, max: 8, perIlvl: 0.2, slots: ['weapon', 'gloves'] },
    { stat: 'reflect_damage', min: 3, max: 8, perIlvl: 0.3, slots: ['armor', 'offhand'] },
    { stat: 'gold_find', min: 5, max: 12, perIlvl: 0.5, slots: ['boots', 'gloves', 'ring', 'amulet'] },
    { stat: 'item_find', min: 4, max: 10, perIlvl: 0.4, slots: ['boots', 'gloves', 'ring', 'amulet'] },
];

/** 접사 표기 — stat id → 이름 + 단위. 단위 붙이기는 렌더러 한 곳(affixText)에서만 */
export const AFFIX_LABELS = {
    atk_flat: { ko: '공격력', en: 'Attack', fmt: 'n' },
    atk_pct: { ko: '공격력', en: 'Attack', fmt: 'pct' },
    hp_flat: { ko: '최대 HP', en: 'Max HP', fmt: 'n' },
    hp_pct: { ko: '최대 HP', en: 'Max HP', fmt: 'pct' },
    def_flat: { ko: '물리 방어', en: 'Physical Defense', fmt: 'n' },
    res_all: { ko: '모든 원소 저항', en: 'All Resistances', fmt: 'n' },
    crit_rate: { ko: '치명타 확률', en: 'Crit Chance', fmt: 'pct' },
    crit_damage: { ko: '치명타 피해', en: 'Crit Damage', fmt: 'pct' },
    aspd_pct: { ko: '공격 속도', en: 'Attack Speed', fmt: 'pct' },
    life_steal: { ko: '흡혈', en: 'Life Steal', fmt: 'pct' },
    evasion: { ko: '회피', en: 'Evasion', fmt: 'n' },
    accuracy: { ko: '명중', en: 'Accuracy', fmt: 'n' },
    def_ignore: { ko: '방어 무시', en: 'Defense Ignore', fmt: 'pct' },
    reflect_damage: { ko: '반사 피해', en: 'Reflect Damage', fmt: 'pct' },
    gold_find: { ko: '골드 획득', en: 'Gold Find', fmt: 'pct' },
    item_find: { ko: '드랍률', en: 'Item Find', fmt: 'pct' },
};

/** 접사 한 줄 — {ko, en}. 단위(%)와 어순은 여기서만 정한다 */
export const affixText = (stat, v) => {
    const d = AFFIX_LABELS[stat] ?? { ko: stat, en: stat, fmt: 'n' };
    const num = `${v >= 0 ? '+' : ''}${v}${d.fmt === 'pct' ? '%' : ''}`;
    return { ko: `${d.ko} ${num}`, en: `${num} ${d.en}` };
};

/** 페이퍼돌 배치 — 3열 × 4행, 신체 위치를 따른다. 칸은 착용 **위치**(EQUIP_SLOTS.id) — 반지 두 칸 */
export const PAPERDOLL = [
    [null, 'helmet', null],
    ['weapon', 'armor', 'offhand'],
    ['amulet', 'gloves', 'ring1'],
    [null, 'boots', 'ring2'],
];

/**
 * 기본 능력치 7종 — 범위 [balance.csv:hero_attr_min ~ hero_attr_max] (1~20).
 * 최대 HP는 어떤 능력치도 담당하지 않는다 — 전 영웅 [balance.csv:hero_hp_base](100) 시작,
 * 이후 레벨·장비로만 성장한다 (hero_design.md §4-1). 아래 hpMax 값은 그 전제의 예시.
 * 장비가 하나도 없는 영웅(도리안·가웨인·엘로이즈)은 레벨 성장분만 붙어 있다.
 * **장비는 기본 능력치를 주지 않는다** ([balance.csv:attr_equip_bonus] = 0, hero_design.md §4-2).
 * 따라서 아래 어떤 접사 목록에도 '힘 +n' 류가 등장해선 안 된다 — 장비는 전투 능력치만 준다.
 * abbr 은 영문 한 줄 요약(로스터 카드)용 — 한국어는 이름이 이미 짧아 abbr 불요.
 */
export const STATS = [
    { id: 'str', ko: '힘', en: 'Strength', abbr: 'STR' },
    { id: 'agi', ko: '민첩', en: 'Agility', abbr: 'AGI' },
    { id: 'int', ko: '지능', en: 'Intelligence', abbr: 'INT' },
    { id: 'vit', ko: '건강', en: 'Vitality', abbr: 'VIT' },
    { id: 'sen', ko: '감각', en: 'Sense', abbr: 'SEN' },
    { id: 'ldr', ko: '통솔', en: 'Leadership', abbr: 'LDR' },
    { id: 'cha', ko: '매력', en: 'Charisma', abbr: 'CHA' },
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
 * 전투 능력치 24종 — src/data/combat_stat.csv 의 화면용 사본 (2026-08-25 27→24: 상태이상 적중·저항 · 회복량 ·
 * 파티 보정 · 스킬 레벨 · 파견 시간 단축 · 마법 방어 삭제, 원소 저항 4종 추가).
 * **기본 능력치(STATS)와는 다른 층이다** (CLAUDE.md / hero_design §4):
 *   기본 7종 = 영웅 고유·장비 불변 / 전투 24종 = 장비·스킬이 만든다.
 * attr = 이 전투 능력치를 미는 기본 능력치(계수). null 은 장비·스킬 전담. 계수가 붙는 것은 6종뿐이다.
 * fmt = 표기 단위. 숫자는 데이터로 두고 단위 붙이기는 렌더러가 한 곳에서 한다.
 * CSV 로 이사할 때 stat_kr 옆에 stat_en 컬럼이 붙는다.
 */
export const COMBAT_CATS = [
    { id: 'offense', ko: '공격', en: 'Offense' },
    { id: 'defense', ko: '방어', en: 'Defense' },
    { id: 'sustain', ko: '유지', en: 'Sustain' },
    { id: 'tempo', ko: '템포', en: 'Tempo' },
    { id: 'utility', ko: '유틸', en: 'Utility' },
];

export const COMBAT_STATS = [
    { id: 'atk_physical', ko: '물리 공격력', en: 'Physical Attack', cat: 'offense', attr: 'str', fmt: 'n' },
    { id: 'atk_magic', ko: '마법 공격력', en: 'Magic Attack', cat: 'offense', attr: 'int', fmt: 'n' },
    { id: 'accuracy', ko: '명중', en: 'Accuracy', cat: 'offense', attr: 'sen', fmt: 'n' },
    { id: 'crit_rate', ko: '치명타 확률', en: 'Crit Chance', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'crit_damage', ko: '치명타 피해', en: 'Crit Damage', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'def_ignore', ko: '방어 무시', en: 'Defense Ignore', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'vs_type_damage', ko: '타입 특효', en: 'Type Damage', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'vs_size_damage', ko: '사이즈 특효', en: 'Size Damage', cat: 'offense', attr: null, fmt: 'pct' },

    { id: 'hp_max', ko: '최대 HP', en: 'Max HP', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'defense', ko: '물리 방어', en: 'Physical Defense', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'res_lightning', ko: '전기 저항', en: 'Lightning Resist', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'res_fire', ko: '불 저항', en: 'Fire Resist', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'res_cold', ko: '냉기 저항', en: 'Cold Resist', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'res_poison', ko: '독 저항', en: 'Poison Resist', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'evasion', ko: '회피', en: 'Evasion', cat: 'defense', attr: 'sen', fmt: 'n' },
    { id: 'damage_reduction', ko: '피해 감소', en: 'Damage Reduction', cat: 'defense', attr: null, fmt: 'pct' },
    { id: 'reflect_damage', ko: '반사 피해', en: 'Reflect Damage', cat: 'defense', attr: null, fmt: 'n' },

    { id: 'life_steal', ko: '흡혈', en: 'Life Steal', cat: 'sustain', attr: null, fmt: 'pct' },
    { id: 'hp_regen', ko: 'HP 재생', en: 'HP Regen', cat: 'sustain', attr: null, fmt: 'n' },

    { id: 'action_period', ko: '행동 주기', en: 'Action Period', cat: 'tempo', attr: 'agi', fmt: 'sec' },
    { id: 'fhr', ko: '상태이상 회복 속도', en: 'Status Recovery', cat: 'tempo', attr: 'vit', fmt: 'pct' },
    { id: 'cooldown_reduction', ko: '쿨타임 감소', en: 'Cooldown Reduction', cat: 'tempo', attr: null, fmt: 'pct' },

    { id: 'item_find', ko: '드랍률', en: 'Item Find', cat: 'utility', attr: null, fmt: 'pct' },
    { id: 'gold_find', ko: '골드 획득', en: 'Gold Find', cat: 'utility', attr: null, fmt: 'pct' },
];

/**
 * 영웅 초상 — 아직 아트가 없다. 몬스터와 같은 자리(faces/)를 쓰되 파일명만 hero_<uid>.png.
 * 지금은 전부 null → 폴백(죄종 색 원판 + 이니셜)이 그려진다. 아트가 들어오면 이 함수 한 줄만 바꾼다.
 */
export const heroFace = uid => null;   // eslint-disable-line no-unused-vars

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
const stageBg = id => BG_DIR + `background_stage_${id}.webp`;

/**
 * 몬스터 — ko 는 src/data/monster.csv 의 monster_name_kr 그대로 (112종).
 * en 은 CSV `monster_name_en` 컬럼(예정)의 **초안** — 검수 후 CSV 로 이사한다.
 * `face: true` 인 것만 얼굴 이미지가 있다 (src/assets/inherited/faces/face_<idx>.png).
 */
export const FACE_DIR = './assets/inherited/faces/';
export const MONSTERS = {
    // Ch1 불타는 전장 Burning Battlefield
    1101: { ko: '고블린 척후병', en: 'Goblin Scout', face: true },
    1102: { ko: '고블린 전사', en: 'Goblin Warrior', face: true },
    1103: { ko: '오크 전사', en: 'Orc Warrior' },
    1150: { ko: '아바돈', en: 'Abaddon' },
    1201: { ko: '인간 보병', en: 'Human Footman' },
    1202: { ko: '인간 창병', en: 'Human Spearman' },
    1203: { ko: '트롤 돌격병', en: 'Troll Charger' },
    1250: { ko: '레기온', en: 'Legion' },
    1301: { ko: '스켈레톤 전사', en: 'Skeleton Warrior', face: true },
    1302: { ko: '스켈레톤 궁수', en: 'Skeleton Archer' },
    1303: { ko: '스켈레톤 기사', en: 'Skeleton Knight', face: true },
    1350: { ko: '둘라한', en: 'Dullahan', face: true },
    1401: { ko: '제단의 화염마', en: 'Altar Flamefiend' },
    1402: { ko: '몰록의 제물관', en: "Moloch's Sacrificer" },
    1403: { ko: '몰록의 심판관', en: "Moloch's Judge" },
    1900: { ko: '몰록', en: 'Moloch' },
    // Ch2 뒤틀린 숲 Twisted Forest
    2101: { ko: '독늑대 척후', en: 'Venomwolf Scout' },
    2102: { ko: '도마뱀 저주사', en: 'Lizardman Curser' },
    2103: { ko: '도마뱀 돌격병', en: 'Lizardman Charger' },
    2150: { ko: '사마엘', en: 'Samael' },
    2201: { ko: '서큐버스 유혹마', en: 'Succubus Temptress' },
    2202: { ko: '서큐버스 독술사', en: 'Succubus Poisoner' },
    2203: { ko: '오크 탈취자', en: 'Orc Plunderer' },
    2250: { ko: '아비주', en: 'Abyzou' },
    2301: { ko: '수목 원혼', en: 'Tree Wraith' },
    2302: { ko: '울부짖는 유령', en: 'Wailing Ghost' },
    2303: { ko: '뿌리 좀비', en: 'Root Zombie' },
    2350: { ko: '밴시', en: 'Banshee' },
    2401: { ko: '심연의 유혹마', en: 'Abyssal Temptress' },
    2402: { ko: '심연 오크 병사', en: 'Abyssal Orc Soldier' },
    2403: { ko: '오크 심연장', en: 'Orc Abyss Warden' },
    2900: { ko: '레비아탄', en: 'Leviathan' },
    // Ch3 황금의 사막 Golden Desert
    3101: { ko: '사막 도마뱀 약탈자', en: 'Desert Lizardman Raider' },
    3102: { ko: '사막 도마뱀 주술사', en: 'Desert Lizardman Shaman' },
    3103: { ko: '사암 골렘', en: 'Sandstone Golem' },
    3150: { ko: '다곤', en: 'Dagon' },
    3201: { ko: '해골 수호병', en: 'Skeleton Guard' },
    3202: { ko: '해골 석궁병', en: 'Skeleton Arbalist' },
    3203: { ko: '뱀파이어 귀족', en: 'Vampire Noble' },
    3250: { ko: '카론', en: 'Charon' },
    3301: { ko: '황금 임프', en: 'Golden Imp' },
    3302: { ko: '고블린 약탈병', en: 'Goblin Looter' },
    3303: { ko: '고블린 금고지기', en: 'Goblin Vaultkeeper' },
    3350: { ko: '메피스토펠레스', en: 'Mephistopheles' },
    3401: { ko: '황금궁 임프', en: 'Palace Imp' },
    3402: { ko: '금위 고블린', en: 'Gilded Guard Goblin' },
    3403: { ko: '고블린 근위대장', en: 'Goblin Guard Captain' },
    3900: { ko: '맘몬', en: 'Mammon' },
    // Ch4 망각의 동토 Frozen Tundra
    4101: { ko: '서리 원혼', en: 'Frost Wraith' },
    4102: { ko: '동결 곡성귀', en: 'Frozen Wailer' },
    4103: { ko: '빙결 좀비', en: 'Frostbitten Zombie' },
    4150: { ko: '유키온나', en: 'Yuki-onna' },
    4201: { ko: '서리 고블린 병사', en: 'Frost Goblin Soldier' },
    4202: { ko: '얼음 임프', en: 'Ice Imp' },
    4203: { ko: '고블린 빙하대장', en: 'Goblin Glacier Chief' },
    4250: { ko: '아스타로스', en: 'Astaroth' },
    4301: { ko: '예티 척후', en: 'Yeti Scout' },
    4302: { ko: '예티 투석병', en: 'Yeti Slinger' },
    4303: { ko: '트롤 빙하거인', en: 'Troll Glacier Giant' },
    4350: { ko: '파주주', en: 'Pazuzu' },
    4401: { ko: '동결 임프', en: 'Frozen Imp' },
    4402: { ko: '왕좌 고블린 위병', en: 'Throne Goblin Sentry' },
    4403: { ko: '고블린 동결기사', en: 'Goblin Frost Knight' },
    4900: { ko: '벨페고르', en: 'Belphegor' },
    // Ch5 심연의 동굴 Caverns of the Abyss
    5101: { ko: '부식 좀비', en: 'Corroded Zombie' },
    5102: { ko: '리치 수행자', en: 'Lich Acolyte' },
    5103: { ko: '부식 리치', en: 'Corroded Lich' },
    5150: { ko: '오르쿠스', en: 'Orcus' },
    5201: { ko: '동굴 예티', en: 'Cave Yeti' },
    5202: { ko: '바위 골렘', en: 'Rock Golem' },
    5203: { ko: '거대 골렘', en: 'Giant Golem' },
    5250: { ko: '탈로스', en: 'Talos' },
    5301: { ko: '가고일 주술사', en: 'Gargoyle Shaman' },
    5302: { ko: '오크 포식자', en: 'Orc Devourer' },
    5303: { ko: '악마 가고일', en: 'Demon Gargoyle' },
    5350: { ko: '베히모스', en: 'Behemoth' },
    5401: { ko: '연회장 가고일', en: 'Banquet Gargoyle' },
    5402: { ko: '오크 대식가', en: 'Orc Glutton' },
    5403: { ko: '대가고일 집사', en: 'Grand Gargoyle Butler' },
    5900: { ko: '바알제붑', en: 'Beelzebub' },
    // Ch6 타락한 궁전 Corrupted Palace
    6101: { ko: '서큐버스 유혹자', en: 'Succubus Seductress' },
    6102: { ko: '화염 임프', en: 'Flame Imp' },
    6103: { ko: '대임프 사제', en: 'Grand Imp Priest' },
    6150: { ko: '릴리스', en: 'Lilith' },
    6201: { ko: '뱀파이어 후작', en: 'Vampire Marquis' },
    6202: { ko: '유혹의 유령', en: 'Ghost of Temptation' },
    6203: { ko: '뱀파이어 백작', en: 'Vampire Count' },
    6250: { ko: '카밀라', en: 'Carmilla' },
    6301: { ko: '도마뱀 근위병', en: 'Lizardman Guard' },
    6302: { ko: '트롤 집행자', en: 'Troll Executioner' },
    6303: { ko: '도마뱀 대장', en: 'Lizardman Captain' },
    6350: { ko: '그렌델', en: 'Grendel' },
    6401: { ko: '침실의 서큐버스', en: 'Chamber Succubus' },
    6402: { ko: '시종 임프', en: 'Attendant Imp' },
    6403: { ko: '대서큐버스 시녀장', en: 'Grand Succubus Matron' },
    6900: { ko: '아스모데우스', en: 'Asmodeus' },
    // Ch7 신의 폐허 Ruins of God
    7101: { ko: '가고일 천상병', en: 'Gargoyle Celestial' },
    7102: { ko: '오크 성기사', en: 'Orc Paladin' },
    7103: { ko: '가고일 대장', en: 'Gargoyle Captain' },
    7150: { ko: '아자젤', en: 'Azazel' },
    7201: { ko: '신전 골렘', en: 'Temple Golem' },
    7202: { ko: '예티 순례자', en: 'Yeti Pilgrim' },
    7203: { ko: '고대 골렘', en: 'Ancient Golem' },
    7250: { ko: '골리앗', en: 'Goliath' },
    7301: { ko: '리치 왕', en: 'Lich King' },
    7302: { ko: '뱀파이어 공작', en: 'Vampire Duke' },
    7303: { ko: '대리치', en: 'Archlich' },
    7350: { ko: '아스클레피오스', en: 'Asclepius' },
    7401: { ko: '옥좌의 주문석상', en: 'Throne Spellstone' },
    7402: { ko: '타락 오크 근위', en: 'Fallen Orc Guard' },
    7403: { ko: '대가고일 옥좌지기', en: 'Grand Gargoyle Thronekeeper' },
    7900: { ko: '루시퍼', en: 'Lucifer' },
};

/** 챕터 죄종 (chapter_info.csv) — 얼굴 없는 몬스터의 폴백 원판 색으로 쓴다 */
export const CHAPTER_SIN = {
    1: 'wrath', 2: 'envy', 3: 'greed', 4: 'sloth', 5: 'gluttony', 6: 'lust', 7: 'pride',
};

/** {ko, en} 이름 쌍을 돌려준다 — 화면은 i18n.L() 로 푼다. 이니셜도 L() 결과의 첫 글자를 쓴다 */
export const monsterName = id => MONSTERS[id] ?? { ko: '???', en: '???' };
export const monsterFace = id => MONSTERS[id]?.face ? `${FACE_DIR}face_${id}.png` : null;
/** 몬스터 id 앞자리 = 챕터 (1101 → 1챕터) */
export const monsterSin = id => CHAPTER_SIN[Math.floor(id / 1000)] ?? 'wrath';

/**
 * 정예 특성 — 계승 elite_trait.csv. en 은 CSV 의 trait_name(영문) 그대로.
 * 죄종 고유 1 + 공통 2 로 정예가 조립된다 (840 변형).
 */
/**
 * 정예 이름 조립 — ko "분노의 스켈레톤 기사" / en "Wrathful Skeleton Knight".
 * 언어별 어순·조사가 다르므로 조립 규칙은 렌더러가 아니라 **데이터 층**에 둔다 (nm() 과 같은 자리).
 */
export const eliteName = (sin, baseId) => {
    const s = SINS[sin], b = monsterName(baseId);
    return { ko: `${s.ko}의 ${b.ko}`, en: `${s.adj} ${b.en}` };
};

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
/**
 * 스테이지 표시 사전 — 수치(dlvl·보스·타입)는 stage.csv 가 SSOT 다. 여기는 영문 이름·배경만.
 * 없는 스테이지는 stage_name_kr 을 양쪽에 쓴다 (영문명 미작성 — CSV 에 stage_name_en 이 붙으면 이 표는 사라진다).
 */
export const STAGE_META = {
    101: { name: { ko: '파멸의 진영', en: 'Camp of Ruin' }, bg: stageBg(101) },
    102: { name: { ko: '핏빛 교전지대', en: 'Crimson Battleground' }, bg: stageBg(102) },
    103: { name: { ko: '원한의 묘지', en: 'Graveyard of Grudges' }, bg: stageBg(103) },
    104: { name: { ko: '사탄의 제단', en: "Satan's Altar" }, bg: null },   // 계승분 없음 (원작 미제작)
    201: { name: { ko: '변형의 경계', en: 'Verge of Mutation' }, bg: null },
    202: { name: { ko: '독무의 심림', en: 'Miasma Deepwood' }, bg: null },
    203: { name: { ko: '부패한 뿌리', en: 'Rotten Roots' }, bg: null },
};
export const stageName = row => STAGE_META[row.stage_id]?.name ?? { ko: row.stage_name_kr, en: row.stage_name_kr };
export const stageBgOf = id => STAGE_META[id]?.bg ?? null;
/** 챕터 이름·죄종 — CODEX_CHAPTERS 가 이미 들고 있다 */
export const chapterOf = ch => CODEX_CHAPTERS.find(c => c.id === ch);

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
 * 도감 레벨이 오른다 — 레벨별 필요 장수는 **codex_level.csv**(SSOT, data.js 가 읽는다). 처치 수는 기록만.
 * 레벨이 주는 것은 스테이지 계열 스탯 보정 — 계열 배정은 계승 bonus 테이블 유지 (1=공격, 2=체력, 3=명중, 4=피해).
 * ⚠ 레벨별 보정 %(아래)는 아직 **화면 확인용 자리표시** — codex_level.csv 컬럼으로 이관 예정.
 */
export const CODEX_LEVEL_BONUS = [0.5, 0.5, 1, 1];       // 레벨 1..4 도달 시 얻는 % (누적) — codex_level.csv 행 수와 맞춘다
/** 스테이지 번호 → 전투 보너스 키 (1 공격 / 2 체력 / 3 명중 / 4 피해 — 계승 collection_group_bonus 배정) */
export const CODEX_STAT_BY_NUM = { 1: 'atk_pct', 2: 'hp_pct', 3: 'acc_pct', 4: 'dmg_pct' };

/** 챕터 이름 = chapter_info.csv 의 region_kr / region_en 그대로 */
export const CODEX_CHAPTERS = [
    { id: 1, name: { ko: '불타는 전장', en: 'Burning Battlefield' }, sin: 'wrath', locked: false },
    { id: 2, name: { ko: '뒤틀린 숲', en: 'Twisted Forest' }, sin: 'envy', locked: true },
    { id: 3, name: { ko: '황금의 사막', en: 'Golden Desert' }, sin: 'greed', locked: true },
    { id: 4, name: { ko: '망각의 동토', en: 'Frozen Tundra' }, sin: 'sloth', locked: true },
    { id: 5, name: { ko: '심연의 동굴', en: 'Caverns of the Abyss' }, sin: 'gluttony', locked: true },
    { id: 6, name: { ko: '타락한 궁전', en: 'Corrupted Palace' }, sin: 'lust', locked: true },
    { id: 7, name: { ko: '신의 폐허', en: 'Ruins of God' }, sin: 'pride', locked: true },
];

/** 스테이지별 계열 스탯 (스테이지 번호 고정 배정 — 계승 collection_group_bonus 유지) */
const CX_STAT = {
    1: { ko: '공격력', en: 'Attack' },
    2: { ko: '체력', en: 'Health' },
    3: { ko: '명중률', en: 'Accuracy' },
    4: { ko: '피해량', en: 'Damage' },
};
const CX_DONE = {
    1: { ko: '치명률 +2%', en: '+2% Crit Rate' },
    2: { ko: '방어력 +2%', en: '+2% Defense' },
    3: { ko: '회피율 +2%', en: '+2% Evasion' },
    4: { ko: '공격 속도 +2%', en: '+2% Attack Speed' },
};
/** 스테이지 행 빌더 — 이름은 stage.csv 의 stage_name_kr + en 초안 */
const cxStage = (id, chapter, num, name, monsters, locked) => ({
    id, chapter, num, name, stat: CX_STAT[num], completion: CX_DONE[num],
    ...(locked ? { locked: true } : {}),
    monsters,
});
const mons = (a, b, c, boss) => [{ id: a }, { id: b }, { id: c }, { id: boss, boss: true }];

export const CODEX_STAGES = [
    cxStage(101, 1, 1, { ko: '파멸의 진영', en: 'Camp of Ruin' }, mons(1101, 1102, 1103, 1150)),
    cxStage(102, 1, 2, { ko: '핏빛 교전지대', en: 'Crimson Battleground' }, mons(1201, 1202, 1203, 1250)),
    cxStage(103, 1, 3, { ko: '원한의 묘지', en: 'Graveyard of Grudges' }, mons(1301, 1302, 1303, 1350)),
    cxStage(104, 1, 4, { ko: '사탄의 제단', en: "Satan's Altar" }, mons(1401, 1402, 1403, 1900)),
    cxStage(201, 2, 1, { ko: '변형의 경계', en: 'Verge of Mutation' }, mons(2101, 2102, 2103, 2150), true),
    cxStage(202, 2, 2, { ko: '독무의 심림', en: 'Miasma Thicket' }, mons(2201, 2202, 2203, 2250), true),
    cxStage(203, 2, 3, { ko: '부패한 뿌리', en: 'Rotten Roots' }, mons(2301, 2302, 2303, 2350), true),
    cxStage(204, 2, 4, { ko: '레비아탄의 심연', en: "Leviathan's Abyss" }, mons(2401, 2402, 2403, 2900), true),
    cxStage(301, 3, 1, { ko: '모래에 묻힌 폐허', en: 'Sand-Buried Ruins' }, mons(3101, 3102, 3103, 3150), true),
    cxStage(302, 3, 2, { ko: '저주받은 지하묘지', en: 'Cursed Catacombs' }, mons(3201, 3202, 3203, 3250), true),
    cxStage(303, 3, 3, { ko: '황금 보물고', en: 'Golden Vault' }, mons(3301, 3302, 3303, 3350), true),
    cxStage(304, 3, 4, { ko: '맘몬의 황금궁', en: "Mammon's Golden Palace" }, mons(3401, 3402, 3403, 3900), true),
    cxStage(401, 4, 1, { ko: '얼어붙은 평원', en: 'Frozen Plains' }, mons(4101, 4102, 4103, 4150), true),
    cxStage(402, 4, 2, { ko: '빙하 요새', en: 'Glacier Fortress' }, mons(4201, 4202, 4203, 4250), true),
    cxStage(403, 4, 3, { ko: '영구동결의 심부', en: 'Permafrost Depths' }, mons(4301, 4302, 4303, 4350), true),
    cxStage(404, 4, 4, { ko: '벨페고르의 동결왕좌', en: "Belphegor's Frozen Throne" }, mons(4401, 4402, 4403, 4900), true),
    cxStage(501, 5, 1, { ko: '탐식의 입구', en: 'Maw of Gluttony' }, mons(5101, 5102, 5103, 5150), true),
    cxStage(502, 5, 2, { ko: '맥동하는 미로', en: 'Pulsing Labyrinth' }, mons(5201, 5202, 5203, 5250), true),
    cxStage(503, 5, 3, { ko: '소화의 심연', en: 'Digestive Abyss' }, mons(5301, 5302, 5303, 5350), true),
    cxStage(504, 5, 4, { ko: '바알제붑의 연회장', en: "Beelzebub's Banquet Hall" }, mons(5401, 5402, 5403, 5900), true),
    cxStage(601, 6, 1, { ko: '부패한 정원', en: 'Decayed Garden' }, mons(6101, 6102, 6103, 6150), true),
    cxStage(602, 6, 2, { ko: '유혹의 회랑', en: 'Corridor of Temptation' }, mons(6201, 6202, 6203, 6250), true),
    cxStage(603, 6, 3, { ko: '욕망의 왕좌', en: 'Throne of Desire' }, mons(6301, 6302, 6303, 6350), true),
    cxStage(604, 6, 4, { ko: '아스모데우스의 침실', en: "Asmodeus's Chamber" }, mons(6401, 6402, 6403, 6900), true),
    cxStage(701, 7, 1, { ko: '천상의 계단', en: 'Celestial Stairs' }, mons(7101, 7102, 7103, 7150), true),
    cxStage(702, 7, 2, { ko: '무너진 신전', en: 'Fallen Temple' }, mons(7201, 7202, 7203, 7250), true),
    cxStage(703, 7, 3, { ko: '오만의 왕좌', en: 'Throne of Pride' }, mons(7301, 7302, 7303, 7350), true),
    cxStage(704, 7, 4, { ko: '루시퍼의 빈 옥좌', en: "Lucifer's Empty Throne" }, mons(7401, 7402, 7403, 7900), true),
];
