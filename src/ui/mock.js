/**
 * 화면 목업 데이터 — **게임 로직이 아니다.**
 *
 * 이 단계의 목적은 "화면이 어떻게 생겼나"를 먼저 확정하는 것.
 * 수치는 전부 손으로 박은 예시이며 밸런스 근거가 없다.
 * 실데이터가 붙는 시점에 이 파일은 통째로 삭제된다.
 *
 * 단, 이름 / 희귀도 색상 / 죄종 색상은 계승분(src/data/inherited/)의 실제 값을 썼다.
 * 화면 폭과 글자 수 감각을 실제와 맞추기 위함.
 */

export const SINS = {
    wrath: { ko: '분노', color: '#e03030' },
    envy: { ko: '시기', color: '#30b050' },
    greed: { ko: '탐욕', color: '#d0a020' },
    sloth: { ko: '나태', color: '#808898' },
    gluttony: { ko: '폭식', color: '#e07020' },
    lust: { ko: '색욕', color: '#e03080' },
    pride: { ko: '오만', color: '#8040e0' },
};

// equip_rarity_config.csv 의 color_hex 그대로 — 4단계, **일반(Normal) 등급 없음**
// item_design.md §2: "일반 등급 없음 — 필드 드롭 전부가 유의미"
// 통제 가능성의 계단: 매직(완전 RNG) → 레어(옵션 수↑) → 크래프트(낙인으로 죄종 지정) → 유니크(고정)
export const RARITY = {
    magic: { ko: '매직', color: '#4169E1' },
    rare: { ko: '레어', color: '#FFD700' },
    craft: { ko: '크래프트', color: '#22C55E' },
    unique: { ko: '유니크', color: '#FF8C00' },
};

/**
 * 장비 8부위.
 * ⚠ 계승분(equipment_base.csv)은 5부위(weapon/armor/helmet/gloves/boots)뿐이고
 *   접사 매트릭스도 7죄종 × 5부위다. 보조/목걸이/반지 3부위는 계승 데이터가 없다 —
 *   item_design.md 갱신과 접사 추가가 필요하다. 지금은 화면 확인용 목업.
 */
export const SLOTS = [
    { id: 'weapon', ko: '무기', icon: '⚔' },
    { id: 'offhand', ko: '보조', icon: '🛡' },
    { id: 'helmet', ko: '투구', icon: '⛑' },
    { id: 'armor', ko: '갑옷', icon: '🧥' },
    { id: 'gloves', ko: '장갑', icon: '🧤' },
    { id: 'boots', ko: '신발', icon: '👢' },
    { id: 'amulet', ko: '목걸이', icon: '📿' },
    { id: 'ring', ko: '반지', icon: '💍' },
];

/** 페이퍼돌 배치 — 3열 × 4행, 신체 위치를 따른다 */
export const PAPERDOLL = [
    [null, 'helmet', null],
    ['weapon', 'armor', 'offhand'],
    ['amulet', 'gloves', 'ring'],
    [null, 'boots', null],
];

export const STATS = [
    { id: 'str', ko: '힘' },
    { id: 'agi', ko: '민첩' },
    { id: 'int', ko: '지능' },
    { id: 'vit', ko: '건강' },
    { id: 'sen', ko: '감각' },
    { id: 'ldr', ko: '통솔' },
    { id: 'cha', ko: '매력' },
];

export const HEROES = [
    {
        uid: 'h1', name: '카일런', sin: 'wrath', cls: '전사', trait: '다혈질',
        level: 12, xp: 340, xpNext: 620, hp: 486, hpMax: 486,
        stats: { str: 31, agi: 18, int: 9, vit: 24, sen: 16, ldr: 12, cha: 8 },
        derived: { atk: 214, def: 88, crit: '31.4%', critDmg: '215%', aspd: '1.18', hit: 142, dodge: 61 },
        equipped: {
            weapon: { uid: 'e1', name: '분노의 Zweihander — 오만', rarity: 'rare', ilvl: 14, twoHanded: true, implicit: '방어구 관통 20%', affixes: ['최대 피해 +14', '치명타 피해 +38%', '공격력 +9%'], sins: { wrath: 1, pride: 1 } },
            offhand: null,   // 양손검 착용 중 → 보조 슬롯 잠김
            helmet: { uid: 'e2', name: '시기의 Full Helm', rarity: 'magic', ilvl: 11, implicit: '방어력 16', affixes: ['명중률 +31'], sins: { envy: 1 } },
            armor: { uid: 'e3', name: '분노의 Plate Mail', rarity: 'craft', ilvl: 9, implicit: '방어력 25', affixes: ['반사 피해 +31', '체력 +5.2%'], sins: { wrath: 1 } },
            gloves: null,
            boots: { uid: 'e4', name: '색욕의 Battle Boots', rarity: 'magic', ilvl: 12, implicit: '방어력 4', affixes: ['회피율 +18'], sins: { lust: 1 } },
            amulet: { uid: 'e13', name: '오만의 부적', rarity: 'magic', ilvl: 13, implicit: null, affixes: ['모든 스탯 +4'], sins: { pride: 1 } },
            ring: null,
        },
        setPoints: { wrath: 2, pride: 2, envy: 1, lust: 1 },
    },
    {
        uid: 'h2', name: '베르나', sin: 'pride', cls: '기사', trait: '타고난 지휘관',
        level: 11, xp: 120, xpNext: 560, hp: 612, hpMax: 612,
        stats: { str: 22, agi: 12, int: 11, vit: 34, sen: 13, ldr: 21, cha: 14 },
        derived: { atk: 141, def: 176, crit: '9.2%', critDmg: '150%', aspd: '0.94', hit: 118, dodge: 40 },
        equipped: {
            weapon: { uid: 'e5', name: '오만의 Halberd', rarity: 'magic', ilvl: 13, implicit: '선제공격', affixes: ['공격력 +11%'], sins: { pride: 1 } },
            offhand: { uid: 'e14', name: '나태의 탑 방패', rarity: 'craft', ilvl: 12, implicit: '방어력 28', affixes: ['적 공격속도 감소 20%', '방어력 +25'], sins: { sloth: 1 } },
            helmet: { uid: 'e6', name: '오만의 Winged Helm — 시기', rarity: 'rare', ilvl: 14, implicit: '방어력 10', affixes: ['체력 +8.4%', '방어력 +22', '명중률 +27'], sins: { pride: 1, envy: 1 } },
            armor: { uid: 'e7', name: '오만의 Archon Plate', rarity: 'magic', ilvl: 12, implicit: '방어력 30', affixes: ['방어력 +34'], sins: { pride: 1 } },
            gloves: { uid: 'e8', name: '오만의 Gauntlets', rarity: 'craft', ilvl: 8, implicit: '방어력 7', affixes: ['모든 스탯 +3', '방어력 +14'], sins: { pride: 1 } },
            boots: null,
            amulet: null,
            ring: { uid: 'e15', name: '폭식의 인장', rarity: 'magic', ilvl: 11, implicit: null, affixes: ['체력 +64'], sins: { gluttony: 1 } },
        },
        setPoints: { pride: 4, envy: 1, sloth: 1, gluttony: 1 },
    },
    {
        uid: 'h3', name: '이졸데', sin: 'lust', cls: '전사', trait: '날렵함',
        level: 10, xp: 455, xpNext: 500, hp: 388, hpMax: 388,
        stats: { str: 24, agi: 29, int: 10, vit: 19, sen: 22, ldr: 9, cha: 17 },
        derived: { atk: 178, def: 64, crit: '38.6%', critDmg: '176%', aspd: '1.41', hit: 155, dodge: 92 },
        equipped: {
            weapon: { uid: 'e9', name: '색욕의 Rapier — 시기', rarity: 'rare', ilvl: 13, implicit: '치명타 확률 10%', affixes: ['공격 속도 +9%', '치명타 확률 +11.4%', '민첩 +12'], sins: { lust: 1, envy: 1 } },
            offhand: { uid: 'e16', name: '색욕의 견갑', rarity: 'magic', ilvl: 10, implicit: '방어력 9', affixes: ['회피율 +16'], sins: { lust: 1 } },
            helmet: null,
            armor: { uid: 'e10', name: '색욕의 Ghost Armor', rarity: 'magic', ilvl: 10, implicit: '방어력 12', affixes: ['회피율 +24'], sins: { lust: 1 } },
            gloves: { uid: 'e11', name: '색욕의 Light Gauntlets', rarity: 'magic', ilvl: 11, implicit: '방어력 4', affixes: ['공격 속도 +6%'], sins: { lust: 1 } },
            boots: { uid: 'e12', name: '시기의 Chain Boots', rarity: 'magic', ilvl: 6, implicit: '방어력 2', affixes: ['회피율 +12'], sins: { envy: 1 } },
            amulet: null,
            ring: null,
        },
        setPoints: { lust: 4, envy: 2 },
    },
    {
        uid: 'h4', name: '도리안', sin: 'greed', cls: '기사', trait: '언변',
        level: 8, xp: 90, xpNext: 400, hp: 402, hpMax: 402,
        stats: { str: 19, agi: 14, int: 12, vit: 27, sen: 11, ldr: 15, cha: 23 },
        derived: { atk: 96, def: 71, crit: '7.4%', critDmg: '150%', aspd: '0.98', hit: 92, dodge: 44 },
        equipped: { weapon: null, offhand: null, helmet: null, armor: null, gloves: null, boots: null, amulet: null, ring: null },
        setPoints: {},
    },
    {
        uid: 'h5', name: '가웨인', sin: 'gluttony', cls: '기사', trait: '강골',
        level: 7, xp: 210, xpNext: 360, hp: 455, hpMax: 455,
        stats: { str: 21, agi: 10, int: 8, vit: 31, sen: 9, ldr: 11, cha: 7 },
        derived: { atk: 88, def: 79, crit: '6.1%', critDmg: '150%', aspd: '0.91', hit: 85, dodge: 33 },
        equipped: { weapon: null, offhand: null, helmet: null, armor: null, gloves: null, boots: null, amulet: null, ring: null },
        setPoints: {},
    },
];

export const PARTY = ['h1', 'h2', 'h3'];

export const ZONES = [
    {
        id: 'ch1s1', chapter: 1, name: '파멸의 진영', region: '불타는 전장',
        sin: 'wrath', mlvl: 2, waves: 3, minutes: 4,
        monsters: ['고블린 척후병', '고블린 전사', '오크 전사'],
        state: 'cleared',
    },
    {
        id: 'ch1s2', chapter: 1, name: '잿더미 능선', region: '불타는 전장',
        sin: 'wrath', mlvl: 5, waves: 4, minutes: 7,
        monsters: ['오크 전사', '아바돈'],
        state: 'open',
    },
    {
        id: 'ch1s3', chapter: 1, name: '몰록의 제단', region: '불타는 전장',
        sin: 'wrath', mlvl: 8, waves: 5, minutes: 12,
        monsters: ['아바돈', '몰록 (챕터 보스)'],
        state: 'open', boss: true,
    },
    {
        id: 'ch2s1', chapter: 2, name: '뒤엉킨 덤불', region: '뒤틀린 숲',
        sin: 'envy', mlvl: 11, waves: 4, minutes: 15,
        monsters: ['???'],
        state: 'locked', lockText: '몰록 처치 필요',
    },
];

export const RUNNING = {
    zoneId: 'ch1s2', zoneName: '불타는 전장 — 잿더미 능선',
    progress: 0.62, wave: 3, waves: 4, etaText: '2분 41초 남음',
};

export const REPORT = {
    zoneName: '불타는 전장 — 잿더미 능선',
    result: 'clear',
    elapsedText: '7분 12초',
    gold: 1840,
    dust: 46,
    xpEach: 320,
    levelUps: [{ name: '이졸데', from: 10, to: 11, gains: '힘 +2, 민첩 +1, 감각 +1' }],
    waves: [
        { n: 1, text: '오크 전사 ×3 격파', detail: '무피해' },
        { n: 2, text: '오크 전사 ×2 · 아바돈 ×1 격파', detail: '베르나 HP 71%' },
        { n: 3, text: '아바돈 ×2 격파', detail: '카일런 HP 44% — 위험' },
        { n: 4, text: '정예 아바돈 격파', detail: '이졸데 치명타 3연타' },
    ],
    drops: [
        { name: '분노의 Berserker Axe — 색욕', rarity: 'rare', slot: 'weapon', ilvl: 14, verdict: 'upgrade' },
        { name: '탐욕의 Chain Gloves — 나태', rarity: 'rare', slot: 'gloves', ilvl: 14, verdict: 'upgrade' },
        { name: '폭식의 Sacred Armor', rarity: 'magic', slot: 'armor', ilvl: 13, verdict: 'sidegrade' },
        { name: '나태의 Bone Helm', rarity: 'magic', slot: 'helmet', ilvl: 12, verdict: 'sidegrade' },
        { name: '시기의 Heavy Boots — 색욕', rarity: 'rare', slot: 'boots', ilvl: 11, verdict: 'junk' },
    ],
};

export const INVENTORY = [
    { uid: 'i1', name: '분노의 Berserker Axe — 색욕', rarity: 'rare', slot: 'weapon', ilvl: 14,
      implicit: null, affixes: ['최대 피해 +18', '치명타 확률 +14.2%', '공격 속도 +7%', '힘 +11'], sins: { wrath: 1, lust: 1 } },
    { uid: 'i2', name: '폭식의 Sacred Armor', rarity: 'magic', slot: 'armor', ilvl: 13,
      implicit: '방어력 40', affixes: ['체력 +72', '방어력 +31'], sins: { gluttony: 1 } },
    { uid: 'i3', name: '탐욕의 Chain Gloves — 나태', rarity: 'rare', slot: 'gloves', ilvl: 14,
      implicit: '방어력 2', affixes: ['골드 획득 +21%', '아이템 발견 +18%', '적 공격속도 감소 12%'], sins: { greed: 1, sloth: 1 } },
    { uid: 'i4', name: '나태의 Bone Helm', rarity: 'magic', slot: 'helmet', ilvl: 12,
      implicit: '방어력 5', affixes: ['적 공격속도 감소 20%'], sins: { sloth: 1 } },
    { uid: 'i5', name: '시기의 Demonhead — 나태', rarity: 'rare', slot: 'helmet', ilvl: 15,
      implicit: '방어력 8', affixes: ['명중률 +44', '체력 +9.1%', '방어력 +26'], sins: { envy: 1, sloth: 1 } },
    { uid: 'i6', name: '탐욕의 Heavy Boots', rarity: 'craft', slot: 'boots', ilvl: 11,
      implicit: '방어력 5', affixes: ['골드 획득 +17%', '회피율 +15'], sins: { greed: 1 } },
    { uid: 'i7', name: '나태의 Mesh Armor', rarity: 'magic', slot: 'armor', ilvl: 12,
      implicit: '방어력 18', affixes: ['적 공격속도 감소 20%'], sins: { sloth: 1 } },
    { uid: 'i8', name: '오만의 Colossus Blade', rarity: 'magic', slot: 'weapon', ilvl: 13, twoHanded: true,
      implicit: '방어구 관통 20%', affixes: ['공격력 +12%'], sins: { pride: 1 } },
    { uid: 'i9', name: '시기의 Crusader Gauntlets — 폭식', rarity: 'rare', slot: 'gloves', ilvl: 15,
      implicit: '방어력 6', affixes: ['치명타 일격 +9%', '체력 +64', '방어력 +19'], sins: { envy: 1, gluttony: 1 } },
    { uid: 'i10', name: '피를 마시는 검', rarity: 'unique', slot: 'weapon', ilvl: 18, fixed: true,
      implicit: null, affixes: ['최대 피해 +22', '치명타 피해 +40%', '생명력 흡수 +6%'], sins: {} },
    { uid: 'i11', name: '분노의 원형 방패', rarity: 'magic', slot: 'offhand', ilvl: 12,
      implicit: '방어력 14', affixes: ['반사 피해 +22'], sins: { wrath: 1 } },
    { uid: 'i12', name: '오만의 문장 방패 — 시기', rarity: 'rare', slot: 'offhand', ilvl: 15,
      implicit: '방어력 22', affixes: ['방어력 +30', '모든 스탯 +5', '체력 +6.8%'], sins: { pride: 1, envy: 1 } },
    { uid: 'i13', name: '탐욕의 금목걸이', rarity: 'craft', slot: 'amulet', ilvl: 14,
      implicit: null, affixes: ['골드 획득 +28%', '아이템 발견 +14%'], sins: { greed: 1 } },
    { uid: 'i14', name: '시기의 눈 목걸이 — 분노', rarity: 'rare', slot: 'amulet', ilvl: 16,
      implicit: null, affixes: ['치명타 확률 +8.2%', '명중률 +36', '치명타 피해 +24%'], sins: { envy: 1, wrath: 1 } },
    { uid: 'i15', name: '색욕의 은반지', rarity: 'magic', slot: 'ring', ilvl: 10,
      implicit: null, affixes: ['공격 속도 +5%'], sins: { lust: 1 } },
    { uid: 'i16', name: '폭식의 대식 반지 — 나태', rarity: 'rare', slot: 'ring', ilvl: 15,
      implicit: null, affixes: ['체력 +88', '체력 회복 +12', '방어력 +17'], sins: { gluttony: 1, sloth: 1 } },
    { uid: 'i17', name: '분노의 Katana', rarity: 'magic', slot: 'weapon', ilvl: 11, twoHanded: true,
      implicit: '방어구 관통 20%', affixes: ['치명타 확률 +9.4%'], sins: { wrath: 1 } },
    { uid: 'i18', name: '나태의 Bone Boots — 폭식', rarity: 'rare', slot: 'boots', ilvl: 13,
      implicit: '방어력 7', affixes: ['방어력 +21', '체력 +7.2%', '회피율 +19'], sins: { sloth: 1, gluttony: 1 } },
];

export const INV_GRID = { cols: 7, rows: 10 };

// 세트 브레이크포인트 — equipment_set_bonus.csv 의 실제 효과명
export const SET_BONUSES = {
    wrath: { 2: '화상 — 적 체력회복 감소', 4: '잃은 체력 비례 공격력', 6: '최후의 저항 — 사망 시 1회 생존' },
    envy: { 2: '중독 — 매 초 고정 데미지', 4: '버프 박탈', 6: '약자멸시 — 체력 30% 이하 방어 무시' },
    greed: { 2: '스턴', 4: '탐욕의 감정 — 상위 굴림 확률 증가', 6: '약탈왕 — 보스 처치 시 2개 드롭' },
    sloth: { 2: '빙결 — 적 공격속도 감소', 4: '(미확정)', 6: '(미확정)' },
    gluttony: { 2: '과식 패널티 — 모든 스탯 감소', 4: '(미작성)', 6: '(미작성)' },
    lust: { 2: '매혹 — 적 명중률 감소', 4: '갈취', 6: '지배 — 피해 일부 마법 변환' },
    pride: { 2: '(미작성)', 4: '(미작성)', 6: '완전무결 — 상태이상 면역' },
};

export const RESOURCES = { gold: 12480, dust: 214, stigma: 3 };

/* ═══════════ 선술집 ═══════════ */
// 영웅 = 죄종(7) × 직업(3) × 시작특성 랜덤 조합 — 등장 시 굴려짐 (hero_design §2)

export const TAVERN = {
    rerollCost: 800,
    candidates: [
        { name: '아셀린', sin: 'envy', cls: '전사', trait: '매의 눈', cost: 2400, discount: 12,
          stats: { str: 26, agi: 21, int: 8, vit: 20, sen: 24, ldr: 10, cha: 15 } },
        { name: '그리모', sin: 'sloth', cls: '기사', trait: '강골', cost: 2100, discount: 12,
          stats: { str: 20, agi: 11, int: 16, vit: 30, sen: 12, ldr: 14, cha: 9 } },
        { name: '유디트', sin: 'greed', cls: '전사', trait: '언변', cost: 3050, discount: 12,
          stats: { str: 23, agi: 24, int: 12, vit: 18, sen: 19, ldr: 11, cha: 27 } },
    ],
};

/* ═══════════ 스킬 ═══════════ */
// 독립 트리 3탭, 포인트 풀 공유 (skill_design §1)
// 노드 이름은 skill_design §2에 적힌 컨셉만 사용. 미작성분은 (미정) 표기 — 기획 선점 금지

export const SKILL_TREES = {
    sin: {
        wrath: [
            { tier: 1, nodes: [{ n: '격노', r: 3, max: 5 }, { n: '치명 강화', r: 5, max: 5 }, { n: '(미정)', r: 0, max: 5 }] },
            { tier: 2, nodes: [{ n: '잃은 체력 비례 공격력', r: 2, max: 5 }, { n: '(미정)', r: 0, max: 5 }] },
            { tier: 3, nodes: [{ n: '분노 세트포인트당 치명타', r: 0, max: 3, locked: true }] },
        ],
        pride: [
            { tier: 1, nodes: [{ n: '증폭', r: 4, max: 5 }, { n: '(미정)', r: 0, max: 5 }] },
            { tier: 2, nodes: [{ n: '상태이상 면역', r: 1, max: 3 }, { n: '(미정)', r: 0, max: 5 }] },
            { tier: 3, nodes: [{ n: '(미정)', r: 0, max: 3, locked: true }] },
        ],
        lust: [
            { tier: 1, nodes: [{ n: '흡혈', r: 5, max: 5 }, { n: '공속 강화', r: 3, max: 5 }] },
            { tier: 2, nodes: [{ n: '(미정)', r: 0, max: 5 }] },
            { tier: 3, nodes: [{ n: '(미정)', r: 0, max: 3, locked: true }] },
        ],
    },
    mastery: [
        { tier: 1, nodes: [{ n: '도끼 숙련', r: 3, max: 5 }, { n: '양손검 숙련', r: 0, max: 5 }, { n: '둔기 숙련', r: 0, max: 5 }] },
        { tier: 2, nodes: [{ n: '방어구 숙련', r: 2, max: 5 }, { n: '(미정)', r: 0, max: 5 }] },
    ],
    advance: { unlockLevel: 30, note: '전직 트리 — 정체 추후 결정 (skill_design §4)' },
};

export const SKILL_POINTS = { total: 24, spent: 21 };

/* ═══════════ 도감 ═══════════ */
// 계승분 collection_group.csv / collection_group_bonus.csv 기반
// 그룹 = 스테이지, 멤버 3 + 보스. 수집 단계별로 파티 전역 보너스

export const CODEX_GROUPS = [
    { id: 101, name: '파멸의 진영', chapter: 1, found: 4, total: 4, bonus: '공격력 +3% · 치명률 +2%' },
    { id: 102, name: '핏빛 교전지대', chapter: 1, found: 3, total: 4, bonus: '공격력 +3%', next: '보스 처치 시 치명률 +2%' },
    { id: 103, name: '원한의 묘지', chapter: 1, found: 1, total: 4, bonus: '공격력 +1%', next: '2종 더 발견 시 공격력 +3%' },
    { id: 104, name: '사탄의 제단', chapter: 1, found: 0, total: 4, bonus: null, next: '미발견' },
    { id: 201, name: '뒤엉킨 덤불', chapter: 2, found: 0, total: 4, bonus: null, locked: true },
];

export const CODEX_ITEMS = {
    unique: { found: 1, total: 0, note: '계승분 equipment_unique.csv 가 0행 — 유니크 목록 미작성 (G1)' },
    base: { found: 22, total: 39 },
    setBreakpoints: { found: 6, total: 21, note: '21칸 중 17칸만 작성됨 (G4)' },
};
