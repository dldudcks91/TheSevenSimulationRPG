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
export const BALANCE = {
    party_size_max: 3,
    roster_cap: 7,
    concurrent_expedition_parties: 1,
    rounds_per_stage: 9,
    stages_per_chapter: 4,
    wave_monster_max: 3,
    advance_unlock_level: 30,
    hero_attr_min: 1,
    hero_attr_max: 20,
};

/** 스테이지 라운드 구조 (base_expedition_design §1-2) — 구조는 고정, 내용물만 랜덤 */
export const ELITE_ROUNDS = [3, 6];
export const BOSS_ROUND = BALANCE.rounds_per_stage;

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
// item_design.md §2: "일반 등급 없음 — 필드 드롭 전부가 유의미"
// 통제 가능성의 계단: 매직(완전 RNG) → 레어(옵션 수↑) → 크래프트(낙인으로 죄종 지정) → 유니크(고정)
export const RARITY = {
    magic: { ko: '매직', en: 'Magic', color: '#4169E1' },
    rare: { ko: '레어', en: 'Rare', color: '#FFD700' },
    craft: { ko: '크래프트', en: 'Craft', color: '#22C55E' },
    unique: { ko: '유니크', en: 'Unique', color: '#FF8C00' },
};

/**
 * 영웅 2층 구조 (hero_design §2) — 아이템 희귀도 계단의 영웅판.
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
 * 직업 7종 (hero_design §5) — 본편 5 + 확장 2. 확장 직업은 아직 화면에 등장하지 않는다.
 * i18n 을 위해 **id 로 참조**한다 — HEROES.cls / SKILL_TREES.mastery 키가 이 id 를 쓴다.
 */
export const CLASSES = [
    { id: 'warrior', ko: '전사', en: 'Warrior', role: { ko: '근접 물리', en: 'Melee Physical' }, weapons: { ko: '도끼 / 양손검 / 둔기', en: 'Axe / Two-Hander / Mace' }, stage: 'main' },
    { id: 'knight', ko: '기사', en: 'Knight', role: { ko: '탱커 · 수호', en: 'Tank · Guardian' }, weapons: { ko: '한손검+방패 / 창', en: 'Sword+Shield / Spear' }, stage: 'main' },
    { id: 'mage', ko: '마법사', en: 'Mage', role: { ko: '마법', en: 'Magic' }, weapons: { ko: '지팡이', en: 'Staff' }, stage: 'main' },
    { id: 'archer', ko: '궁수', en: 'Archer', role: { ko: '원거리 물리', en: 'Ranged Physical' }, weapons: { ko: '활', en: 'Bow' }, stage: 'main' },
    { id: 'priest', ko: '사제', en: 'Priest', role: { ko: '지원 · 회복', en: 'Support · Healing' }, weapons: { ko: '둔기+방패', en: 'Mace+Shield' }, stage: 'main' },
    { id: 'assassin', ko: '암살자', en: 'Assassin', role: { ko: '치명 · 속도', en: 'Crit · Speed' }, weapons: { ko: '단검', en: 'Dagger' }, stage: 'expansion' },
    { id: 'necromancer', ko: '네크로맨서', en: 'Necromancer', role: { ko: '소환', en: 'Summoning' }, weapons: { ko: '낫 / 지팡이 (미정)', en: 'Scythe / Staff (TBD)' }, stage: 'expansion' },
];

/**
 * 장비 8부위.
 * ⚠ 계승분(equipment_base.csv)은 5부위(weapon/armor/helmet/gloves/boots)뿐이고
 *   접사 매트릭스도 7죄종 × 5부위다. 보조/목걸이/반지 3부위는 계승 데이터가 없다 —
 *   item_design.md §5 미확정 항목. 지금은 화면 확인용 목업.
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

/** 페이퍼돌 배치 — 3열 × 4행, 신체 위치를 따른다 */
export const PAPERDOLL = [
    [null, 'helmet', null],
    ['weapon', 'armor', 'offhand'],
    ['amulet', 'gloves', 'ring'],
    [null, 'boots', null],
];

/**
 * 기본 능력치 7종 — 범위 [balance.csv:hero_attr_min ~ hero_attr_max] (1~20).
 * 최대 HP는 어떤 능력치도 담당하지 않는다 — 전 영웅 [balance.csv:hero_hp_base](100) 시작,
 * 이후 레벨·장비로만 성장한다 (hero_design.md §6-1). 아래 hpMax 값은 그 전제의 예시.
 * 장비가 하나도 없는 영웅(도리안·가웨인·엘로이즈)은 레벨 성장분만 붙어 있다.
 * **장비는 기본 능력치를 주지 않는다** ([balance.csv:attr_equip_bonus] = 0, hero_design.md §6-2).
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

/**
 * 전투 능력치 27종 — src/data/combat_stat.csv 의 화면용 사본.
 * **기본 능력치(STATS)와는 다른 층이다** (CLAUDE.md / hero_design §6):
 *   기본 7종 = 영웅 고유·장비 불변 / 전투 27종 = 장비·스킬이 만든다.
 * attr = 이 전투 능력치를 미는 기본 능력치(계수). '-' 는 장비·스킬 전담.
 * fmt = 표기 단위. 숫자는 데이터로 두고 단위 붙이기는 렌더러가 한 곳에서 한다.
 * CSV 로 이사할 때 stat_kr 옆에 stat_en 컬럼이 붙는다.
 */
export const COMBAT_CATS = [
    { id: 'offense', ko: '공격', en: 'Offense' },
    { id: 'defense', ko: '방어', en: 'Defense' },
    { id: 'sustain', ko: '유지', en: 'Sustain' },
    { id: 'tempo', ko: '템포', en: 'Tempo' },
    { id: 'support', ko: '지원', en: 'Support' },
    { id: 'skill', ko: '스킬', en: 'Skill' },
    { id: 'utility', ko: '유틸', en: 'Utility' },
];

export const COMBAT_STATS = [
    { id: 'atk_physical', ko: '물리 공격력', en: 'Physical Attack', cat: 'offense', attr: 'str', fmt: 'n' },
    { id: 'atk_magic', ko: '마법 공격력', en: 'Magic Attack', cat: 'offense', attr: 'int', fmt: 'n' },
    { id: 'accuracy', ko: '명중', en: 'Accuracy', cat: 'offense', attr: 'sen', fmt: 'n' },
    { id: 'crit_rate', ko: '치명타 확률', en: 'Crit Chance', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'crit_damage', ko: '치명타 피해', en: 'Crit Damage', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'def_ignore', ko: '방어 무시', en: 'Defense Ignore', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'status_chance', ko: '상태이상 적중', en: 'Status Chance', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'vs_type_damage', ko: '타입 특효', en: 'Type Damage', cat: 'offense', attr: null, fmt: 'pct' },
    { id: 'vs_size_damage', ko: '사이즈 특효', en: 'Size Damage', cat: 'offense', attr: null, fmt: 'pct' },

    { id: 'hp_max', ko: '최대 HP', en: 'Max HP', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'defense', ko: '물리 방어', en: 'Physical Defense', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'magic_defense', ko: '마법 방어', en: 'Magic Defense', cat: 'defense', attr: null, fmt: 'n' },
    { id: 'evasion', ko: '회피', en: 'Evasion', cat: 'defense', attr: 'sen', fmt: 'n' },
    { id: 'damage_reduction', ko: '피해 감소', en: 'Damage Reduction', cat: 'defense', attr: null, fmt: 'pct' },
    { id: 'reflect_damage', ko: '반사 피해', en: 'Reflect Damage', cat: 'defense', attr: null, fmt: 'n' },

    { id: 'life_steal', ko: '흡혈', en: 'Life Steal', cat: 'sustain', attr: null, fmt: 'pct' },
    { id: 'hp_regen', ko: 'HP 재생', en: 'HP Regen', cat: 'sustain', attr: null, fmt: 'n' },

    { id: 'action_period', ko: '행동 주기', en: 'Action Period', cat: 'tempo', attr: 'agi', fmt: 'sec' },
    { id: 'fhr', ko: '타격 회복 속도', en: 'Hit Recovery', cat: 'tempo', attr: 'vit', fmt: 'pct' },
    { id: 'cooldown_reduction', ko: '쿨타임 감소', en: 'Cooldown Reduction', cat: 'tempo', attr: null, fmt: 'pct' },
    { id: 'cc_reduction', ko: '상태이상 저항', en: 'Status Resistance', cat: 'tempo', attr: 'vit', fmt: 'pct' },

    { id: 'heal_power', ko: '회복량', en: 'Heal Power', cat: 'support', attr: 'ldr', fmt: 'n' },
    { id: 'party_bonus', ko: '파티 보정', en: 'Party Bonus', cat: 'support', attr: 'ldr', fmt: 'pct' },

    { id: 'skill_level', ko: '스킬 레벨', en: 'Skill Level', cat: 'skill', attr: null, fmt: 'n' },

    { id: 'item_find', ko: '드랍률', en: 'Item Find', cat: 'utility', attr: null, fmt: 'pct' },
    { id: 'gold_find', ko: '골드 획득', en: 'Gold Find', cat: 'utility', attr: null, fmt: 'pct' },
    { id: 'dispatch_speed', ko: '파견 시간 단축', en: 'Dispatch Speed', cat: 'utility', attr: null, fmt: 'pct' },
];

/**
 * 영웅 초상 — 아직 아트가 없다. 몬스터와 같은 자리(faces/)를 쓰되 파일명만 hero_<uid>.png.
 * 지금은 전부 null → 폴백(죄종 색 원판 + 이니셜)이 그려진다. 아트가 들어오면 이 함수 한 줄만 바꾼다.
 */
export const heroFace = uid => null;   // eslint-disable-line no-unused-vars

/* ═══════════ 아이템 빌더 ═══════════ */
/**
 * 접사(AF) / Implicit(IMP) / 이름(nm) 빌더 — 반복 문자열을 구조화한다.
 * 실데이터도 "접사 타입 + 수치 롤" 구조라(equipment_prefix/suffix.csv), 이쪽이 실제에 가깝다.
 * ⚠ 기본 능력치(힘/민첩…) 접사는 만들지 않는다 — 위 STATS 주석의 규칙.
 */
const AF = {
    maxDmg: v => ({ ko: `최대 피해 +${v}`, en: `+${v} Max Damage` }),
    atkPct: v => ({ ko: `공격력 +${v}%`, en: `+${v}% Attack` }),
    critPct: v => ({ ko: `치명타 확률 +${v}%`, en: `+${v}% Crit Chance` }),
    critDmg: v => ({ ko: `치명타 피해 +${v}%`, en: `+${v}% Crit Damage` }),
    deadly: v => ({ ko: `치명타 일격 +${v}%`, en: `+${v}% Deadly Strike` }),
    aspd: v => ({ ko: `공격 속도 +${v}%`, en: `+${v}% Attack Speed` }),
    acc: v => ({ ko: `명중률 +${v}`, en: `+${v} Accuracy` }),
    dodge: v => ({ ko: `회피율 +${v}`, en: `+${v} Evasion` }),
    def: v => ({ ko: `방어력 +${v}`, en: `+${v} Defense` }),
    pierce: v => ({ ko: `방어 무시 +${v}%`, en: `+${v}% Defense Pierce` }),
    hp: v => ({ ko: `체력 +${v}`, en: `+${v} Health` }),
    hpPct: v => ({ ko: `체력 +${v}%`, en: `+${v}% Health` }),
    hpRegen: v => ({ ko: `체력 회복 +${v}`, en: `+${v} Health Regen` }),
    lifesteal: v => ({ ko: `생명력 흡수 +${v}%`, en: `+${v}% Life Steal` }),
    thorns: v => ({ ko: `반사 피해 +${v}`, en: `+${v} Thorns` }),
    allStats: v => ({ ko: `모든 스탯 +${v}`, en: `+${v} All Stats` }),
    slowEnemy: v => ({ ko: `적 공격속도 감소 ${v}%`, en: `-${v}% Enemy Attack Speed` }),
    goldFind: v => ({ ko: `골드 획득 +${v}%`, en: `+${v}% Gold Find` }),
    itemFind: v => ({ ko: `아이템 발견 +${v}%`, en: `+${v}% Item Find` }),
    cdr: v => ({ ko: `스킬 쿨타임 감소 ${v}%`, en: `-${v}% Skill Cooldown` }),
};
const IMP = {
    def: v => ({ ko: `방어력 ${v}`, en: `${v} Defense` }),
    pen: v => ({ ko: `방어구 관통 ${v}%`, en: `${v}% Armor Penetration` }),
    firstStrike: () => ({ ko: '선제공격', en: 'First Strike' }),
    crit: v => ({ ko: `치명타 확률 ${v}%`, en: `${v}% Crit Chance` }),
};
/**
 * 아이템 이름 — ko "분노의 Base — 오만" / en "Wrathful Base of Pride" (D2 매직/레어 명명).
 * base 는 문자열(양 언어 공통, 계승 영문 베이스명) 또는 {ko, en} (한국어 전용 베이스).
 */
const nm = (preSin, base, sufSin) => {
    const b = typeof base === 'string' ? { ko: base, en: base } : base;
    const p = SINS[preSin];
    return {
        ko: `${p.ko}의 ${b.ko}${sufSin ? ` — ${SINS[sufSin].ko}` : ''}`,
        en: `${p.adj} ${b.en}${sufSin ? ` of ${SINS[sufSin].en}` : ''}`,
    };
};

/**
 * ⚠ 액티브 스킬 이름은 **기획 미작성**이다 (skill_design §5).
 * 슬롯 3개 UI와 실효 쿨 표시를 확인하려고 임시로 붙인 이름이므로 기획에 역수입 금지.
 * cd = 표기 쿨(초). 실효 쿨은 행동 주기에 맞춰 화면에서 계산한다 (battle_design §6).
 */

const PASSIVE_TBD = {
    name: { ko: '(미작성)', en: '(unwritten)' },
    desc: { ko: '고유 패시브 15종 미작성 — hero_design.md §9', en: 'All 15 unique passives unwritten — hero_design.md §9' },
};

export const HEROES = [
    {
        uid: 'h1', name: { ko: '카일런', en: 'Kailen' }, tier: 'unique', sin: 'wrath', cls: 'warrior',
        trait: { ko: '다혈질', en: 'Hot-Blooded' },
        passive: PASSIVE_TBD,
        level: 12, xp: 340, xpNext: 620, hp: 248, hpMax: 248,
        stats: { str: 18, agi: 10, int: 5, vit: 14, sen: 9, ldr: 7, cha: 5 },
        derived: { atk: 214, def: 88, crit: '31.4%', critDmg: '215%', aspd: '1.18', hit: 142, dodge: 61 },
        // 장비 추적: 방어 무시 20 = 츠바이한더 implicit / 반사 31 = 판금갑옷 가시
        combat: { atk_physical: 214, accuracy: 142, crit_rate: 31.4, crit_damage: 215, def_ignore: 20,
                  hp_max: 248, defense: 88, evasion: 61, reflect_damage: 31, action_period: 0.85 },
        actives: [
            { name: { ko: '격노의 일격', en: 'Enraged Strike' }, icon: '⚡', cd: 12 },
            { name: { ko: '회오리 베기', en: 'Whirlwind Slash' }, icon: '🌀', cd: 14 },
            null,
        ],
        equipped: {
            weapon: { uid: 'e1', name: nm('wrath', 'Zweihander', 'pride'), rarity: 'rare', ilvl: 14, twoHanded: true, implicit: IMP.pen(20), affixes: [AF.maxDmg(14), AF.critDmg(38), AF.atkPct(9)], sins: { wrath: 1, pride: 1 } },
            offhand: null,   // 양손검 착용 중 → 보조 슬롯 잠김
            helmet: { uid: 'e2', name: nm('envy', 'Full Helm'), rarity: 'magic', ilvl: 11, implicit: IMP.def(16), affixes: [AF.acc(31)], sins: { envy: 1 } },
            armor: { uid: 'e3', name: nm('wrath', 'Plate Mail'), rarity: 'craft', ilvl: 9, implicit: IMP.def(25), affixes: [AF.thorns(31), AF.hpPct(5.2)], sins: { wrath: 1 } },
            gloves: null,
            boots: { uid: 'e4', name: nm('lust', 'Battle Boots'), rarity: 'magic', ilvl: 12, implicit: IMP.def(4), affixes: [AF.dodge(18)], sins: { lust: 1 } },
            amulet: { uid: 'e13', name: nm('pride', { ko: '부적', en: 'Talisman' }), rarity: 'magic', ilvl: 13, implicit: null, affixes: [AF.allStats(4)], sins: { pride: 1 } },
            ring: null,
        },
        // 장비 접사 1 = 1포인트(양손 무기는 2) + 메인 죄종 +1 — item_design §2 확정분 반영
        // 분노: 양손검 2 + 갑옷 1 + 메인 1 = 4 / 오만: 양손검 2 + 목걸이 1 = 3
        setPoints: { wrath: 4, pride: 3, envy: 1, lust: 1 },
    },
    {
        uid: 'h2', name: { ko: '베르나', en: 'Berna' }, tier: 'rare', sin: 'pride', cls: 'knight',
        trait: { ko: '타고난 지휘관', en: 'Born Commander' },
        passive: null,
        level: 11, xp: 120, xpNext: 560, hp: 290, hpMax: 290,
        injury: { downed: true, healText: { ko: '치료 1시간 12분 남음', en: '1h 12m to recover' } },   // 직전 런에서 전투불능 (REPORT 참조)
        stats: { str: 13, agi: 7, int: 6, vit: 19, sen: 7, ldr: 12, cha: 8 },
        derived: { atk: 141, def: 176, crit: '9.2%', critDmg: '150%', aspd: '0.94', hit: 118, dodge: 40 },
        // 방패·판금 위주 — 공격 축이 비고 방어 축만 찬 전형
        combat: { atk_physical: 141, accuracy: 118, crit_rate: 9.2, crit_damage: 150,
                  hp_max: 290, defense: 176, evasion: 40, action_period: 1.06 },
        actives: [
            { name: { ko: '방어 태세', en: 'Defensive Stance' }, icon: '🛡', cd: 9 },
            { name: { ko: '수호의 강타', en: 'Guardian Smash' }, icon: '🔨', cd: 11 },
            null,
        ],
        equipped: {
            weapon: { uid: 'e5', name: nm('pride', 'Halberd'), rarity: 'magic', ilvl: 13, implicit: IMP.firstStrike(), affixes: [AF.atkPct(11)], sins: { pride: 1 } },
            offhand: { uid: 'e14', name: nm('sloth', { ko: '탑 방패', en: 'Tower Shield' }), rarity: 'craft', ilvl: 12, implicit: IMP.def(28), affixes: [AF.slowEnemy(20), AF.def(25)], sins: { sloth: 1 } },
            helmet: { uid: 'e6', name: nm('pride', 'Winged Helm', 'envy'), rarity: 'rare', ilvl: 14, implicit: IMP.def(10), affixes: [AF.hpPct(8.4), AF.def(22), AF.acc(27)], sins: { pride: 1, envy: 1 } },
            armor: { uid: 'e7', name: nm('pride', 'Archon Plate'), rarity: 'magic', ilvl: 12, implicit: IMP.def(30), affixes: [AF.def(34)], sins: { pride: 1 } },
            gloves: { uid: 'e8', name: nm('pride', 'Gauntlets'), rarity: 'craft', ilvl: 8, implicit: IMP.def(7), affixes: [AF.allStats(3), AF.def(14)], sins: { pride: 1 } },
            boots: null,
            amulet: null,
            ring: { uid: 'e15', name: nm('gluttony', { ko: '인장', en: 'Signet' }), rarity: 'magic', ilvl: 11, implicit: null, affixes: [AF.hp(64)], sins: { gluttony: 1 } },
        },
        // 오만: 무기1 + 투구1 + 갑옷1 + 장갑1 + 메인 1 = 5 (6세트까지 1포인트 남음)
        setPoints: { pride: 5, envy: 1, sloth: 1, gluttony: 1 },
    },
    {
        uid: 'h3', name: { ko: '이졸데', en: 'Isolde' }, tier: 'rare', sin: 'lust', cls: 'warrior',
        trait: { ko: '날렵함', en: 'Nimble' },
        passive: null,
        level: 10, xp: 455, xpNext: 500, hp: 207, hpMax: 207,
        stats: { str: 14, agi: 17, int: 6, vit: 11, sen: 13, ldr: 5, cha: 10 },
        derived: { atk: 178, def: 64, crit: '38.6%', critDmg: '176%', aspd: '1.41', hit: 155, dodge: 92 },
        // 회피 접사 4개(견갑16+갑옷24+신발12+레이피어18)가 회피 92로 모인다
        combat: { atk_physical: 178, accuracy: 155, crit_rate: 38.6, crit_damage: 176,
                  hp_max: 207, defense: 64, evasion: 92, action_period: 0.71 },
        actives: [
            { name: { ko: '연격', en: 'Flurry' }, icon: '🗡', cd: 8 },
            { name: { ko: '흡혈 일격', en: 'Draining Strike' }, icon: '🩸', cd: 13 },
            { name: { ko: '회피 태세', en: 'Evasive Stance' }, icon: '💨', cd: 16 },
        ],
        equipped: {
            weapon: { uid: 'e9', name: nm('lust', 'Rapier', 'envy'), rarity: 'rare', ilvl: 13, implicit: IMP.crit(10), affixes: [AF.aspd(9), AF.critPct(11.4), AF.dodge(18)], sins: { lust: 1, envy: 1 } },
            offhand: { uid: 'e16', name: nm('lust', { ko: '견갑', en: 'Spaulder' }), rarity: 'magic', ilvl: 10, implicit: IMP.def(9), affixes: [AF.dodge(16)], sins: { lust: 1 } },
            helmet: null,
            armor: { uid: 'e10', name: nm('lust', 'Ghost Armor'), rarity: 'magic', ilvl: 10, implicit: IMP.def(12), affixes: [AF.dodge(24)], sins: { lust: 1 } },
            gloves: { uid: 'e11', name: nm('lust', 'Light Gauntlets'), rarity: 'magic', ilvl: 11, implicit: IMP.def(4), affixes: [AF.aspd(6)], sins: { lust: 1 } },
            boots: { uid: 'e12', name: nm('envy', 'Chain Boots'), rarity: 'magic', ilvl: 6, implicit: IMP.def(2), affixes: [AF.dodge(12)], sins: { envy: 1 } },
            amulet: null,
            ring: null,
        },
        // 색욕: 무기1 + 보조1 + 갑옷1 + 장갑1 + 메인 1 = 5
        setPoints: { lust: 5, envy: 2 },
    },
    {
        uid: 'h4', name: { ko: '도리안', en: 'Dorian' }, tier: 'rare', sin: 'greed', cls: 'archer',
        trait: { ko: '언변', en: 'Silver Tongue' },
        passive: null,
        level: 8, xp: 90, xpNext: 400, hp: 156, hpMax: 156,
        stats: { str: 11, agi: 8, int: 7, vit: 15, sen: 6, ldr: 9, cha: 13 },
        derived: { atk: 96, def: 71, crit: '7.4%', critDmg: '150%', aspd: '0.98', hit: 92, dodge: 44 },
        combat: { atk_physical: 96, accuracy: 92, crit_rate: 7.4, crit_damage: 150,
                  hp_max: 156, defense: 71, evasion: 44, action_period: 1.02 },
        actives: [null, null, null],
        equipped: { weapon: null, offhand: null, helmet: null, armor: null, gloves: null, boots: null, amulet: null, ring: null },
        setPoints: { greed: 1 },   // 장비가 없어도 메인 죄종 +1은 붙는다
    },
    {
        uid: 'h5', name: { ko: '가웨인', en: 'Gawain' }, tier: 'rare', sin: 'gluttony', cls: 'priest',
        trait: { ko: '강골', en: 'Sturdy' },
        passive: null,
        level: 7, xp: 210, xpNext: 360, hp: 148, hpMax: 148,
        stats: { str: 12, agi: 6, int: 5, vit: 18, sen: 5, ldr: 15, cha: 4 },
        derived: { atk: 88, def: 79, crit: '6.1%', critDmg: '150%', aspd: '0.91', hit: 85, dodge: 33 },
        combat: { atk_physical: 88, accuracy: 85, crit_rate: 6.1, crit_damage: 150,
                  hp_max: 148, defense: 79, evasion: 33, action_period: 1.10 },
        actives: [null, null, null],
        equipped: { weapon: null, offhand: null, helmet: null, armor: null, gloves: null, boots: null, amulet: null, ring: null },
        setPoints: { gluttony: 1 },
    },
    {
        uid: 'h6', name: { ko: '엘로이즈', en: 'Heloise' }, tier: 'unique', sin: 'envy', cls: 'mage',
        trait: { ko: '탐구심', en: 'Inquisitive' },
        passive: PASSIVE_TBD,
        level: 9, xp: 60, xpNext: 460, hp: 164, hpMax: 164,
        stats: { str: 6, agi: 9, int: 19, vit: 10, sen: 11, ldr: 7, cha: 10 },
        derived: { atk: 121, def: 42, crit: '12.8%', critDmg: '150%', aspd: '1.02', hit: 104, dodge: 51 },
        combat: { atk_magic: 121, atk_physical: 0, accuracy: 104, crit_rate: 12.8, crit_damage: 150,
                  hp_max: 164, defense: 42, evasion: 51, action_period: 0.98 },
        actives: [null, null, null],
        equipped: { weapon: null, offhand: null, helmet: null, armor: null, gloves: null, boots: null, amulet: null, ring: null },
        setPoints: { envy: 1 },
    },
];

export const PARTY = ['h1', 'h2', 'h3'];

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
export const ZONES = [
    {
        id: 'ch1s1', chapter: 1, stage: 1, stageId: 101,
        name: { ko: '파멸의 진영', en: 'Camp of Ruin' }, region: { ko: '불타는 전장', en: 'Burning Battlefield' },
        sin: 'wrath', mlvl: 2, minutes: 4, bg: stageBg(101),
        monsterIds: [1101, 1102, 1103], bossId: 1150, bossKind: 'stage',
        state: 'cleared',
    },
    {
        id: 'ch1s2', chapter: 1, stage: 2, stageId: 102,
        name: { ko: '핏빛 교전지대', en: 'Crimson Battleground' }, region: { ko: '불타는 전장', en: 'Burning Battlefield' },
        sin: 'wrath', mlvl: 5, minutes: 7, bg: stageBg(102),
        monsterIds: [1201, 1202, 1203], bossId: 1250, bossKind: 'stage',
        state: 'cleared',
    },
    {
        id: 'ch1s3', chapter: 1, stage: 3, stageId: 103,
        name: { ko: '원한의 묘지', en: 'Graveyard of Grudges' }, region: { ko: '불타는 전장', en: 'Burning Battlefield' },
        sin: 'wrath', mlvl: 8, minutes: 10, bg: stageBg(103),
        monsterIds: [1301, 1302, 1303], bossId: 1350, bossKind: 'stage',
        state: 'open',
    },
    {
        id: 'ch1s4', chapter: 1, stage: 4, stageId: 104,
        name: { ko: '사탄의 제단', en: "Satan's Altar" }, region: { ko: '불타는 전장', en: 'Burning Battlefield' },
        sin: 'wrath', mlvl: 11, minutes: 13, bg: null,   // 계승분 없음 (원작 미제작)
        monsterIds: [1401, 1402, 1403], bossId: 1900, bossKind: 'chapter',
        state: 'open',
    },
    {
        id: 'ch2s1', chapter: 2, stage: 1, stageId: 201,
        name: { ko: '변형의 경계', en: 'Verge of Mutation' }, region: { ko: '뒤틀린 숲', en: 'Twisted Forest' },
        sin: 'envy', mlvl: 13, minutes: 15, bg: null,
        monsterIds: [], bossId: null, bossKind: 'stage',
        state: 'locked', lockText: { ko: '몰록 처치 필요', en: 'Defeat Moloch first' },
    },
];

export const RUNNING = {
    zoneId: 'ch1s3',
    progress: 0.58, round: 6,
    etaText: { ko: '4분 12초 남음', en: '4m 12s left' },
};

/** 런 단위 리포트 — 9라운드 전부 기록 (정예 3·6 / 보스 9) */
export const REPORT = {
    zoneName: { ko: '불타는 전장 — 핏빛 교전지대', en: 'Burning Battlefield — Crimson Battleground' },
    result: 'clear',
    elapsedText: { ko: '7분 12초', en: '7m 12s' },
    gold: 1840,
    dust: 46,
    xpEach: 320,
    levelUps: [{
        name: { ko: '이졸데', en: 'Isolde' }, from: 10, to: 11,
        gains: { ko: '힘 +1, 감각 +1', en: 'STR +1, SEN +1' },
    }],
    // 부상/치료 모델 (base_expedition_design §1-1) — 귀환 시 HP는 무료 회복, 부상만 타이머
    downed: [{ name: { ko: '베르나', en: 'Berna' }, healText: { ko: '치료 1시간 12분 남음', en: '1h 12m to recover' } }],
    rounds: [
        { n: 1, kind: 'normal', text: { ko: '인간 보병 ×2 격파', en: 'Human Footman ×2 down' }, detail: { ko: '무피해', en: 'No damage' } },
        { n: 2, kind: 'normal', text: { ko: '인간 창병 ×3 격파', en: 'Human Spearman ×3 down' }, detail: { ko: '카일런 HP 92%', en: 'Kailen HP 92%' } },
        { n: 3, kind: 'elite', text: { ko: '시기의 인간 창병 추적자 + 인간 보병 ×1', en: 'Envious Human Spearman Stalker + Footman ×1' }, detail: { ko: '베르나 HP 64%', en: 'Berna HP 64%' } },
        { n: 4, kind: 'normal', text: { ko: '트롤 돌격병 ×2 격파', en: 'Troll Charger ×2 down' }, detail: { ko: '베르나 HP 58%', en: 'Berna HP 58%' } },
        { n: 5, kind: 'normal', text: { ko: '인간 보병 ×3 격파', en: 'Human Footman ×3 down' }, detail: { ko: '무피해', en: 'No damage' } },
        { n: 6, kind: 'elite', text: { ko: '분노의 트롤 돌격병 격노자 + 인간 창병 ×2', en: 'Wrathful Troll Charger (Frenzy) + Spearman ×2' }, detail: { ko: '이졸데 치명타 4연타', en: 'Isolde ×4 crit streak' } },
        { n: 7, kind: 'normal', text: { ko: '인간 창병 ×2 격파', en: 'Human Spearman ×2 down' }, detail: { ko: '카일런 HP 71%', en: 'Kailen HP 71%' } },
        { n: 8, kind: 'normal', text: { ko: '트롤 돌격병 ×3 격파', en: 'Troll Charger ×3 down' }, detail: { ko: '베르나 HP 21% — 위험', en: 'Berna HP 21% — danger' } },
        { n: 9, kind: 'boss', text: { ko: '레기온 + 호위 2 격파', en: 'Legion + 2 escorts down' }, detail: { ko: '베르나 전투불능 — 카일런이 마무리', en: 'Berna downed — Kailen finished it' } },
    ],
    drops: [
        { name: nm('wrath', 'Berserker Axe', 'lust'), rarity: 'rare', slot: 'weapon', ilvl: 14, verdict: 'upgrade' },
        { name: nm('greed', 'Chain Gloves', 'sloth'), rarity: 'rare', slot: 'gloves', ilvl: 14, verdict: 'upgrade' },
        { name: nm('gluttony', 'Sacred Armor'), rarity: 'magic', slot: 'armor', ilvl: 13, verdict: 'sidegrade' },
        { name: nm('sloth', 'Bone Helm'), rarity: 'magic', slot: 'helmet', ilvl: 12, verdict: 'sidegrade' },
        { name: nm('envy', 'Heavy Boots', 'lust'), rarity: 'rare', slot: 'boots', ilvl: 11, verdict: 'junk' },
    ],
};

export const INVENTORY = [
    { uid: 'i1', name: nm('wrath', 'Berserker Axe', 'lust'), rarity: 'rare', slot: 'weapon', ilvl: 14,
      implicit: null, affixes: [AF.maxDmg(18), AF.critPct(14.2), AF.aspd(7), AF.pierce(11)], sins: { wrath: 1, lust: 1 } },
    { uid: 'i2', name: nm('gluttony', 'Sacred Armor'), rarity: 'magic', slot: 'armor', ilvl: 13,
      implicit: IMP.def(40), affixes: [AF.hp(72), AF.def(31)], sins: { gluttony: 1 } },
    { uid: 'i3', name: nm('greed', 'Chain Gloves', 'sloth'), rarity: 'rare', slot: 'gloves', ilvl: 14,
      implicit: IMP.def(2), affixes: [AF.goldFind(21), AF.itemFind(18), AF.slowEnemy(12)], sins: { greed: 1, sloth: 1 } },
    { uid: 'i4', name: nm('sloth', 'Bone Helm'), rarity: 'magic', slot: 'helmet', ilvl: 12,
      implicit: IMP.def(5), affixes: [AF.slowEnemy(20)], sins: { sloth: 1 } },
    { uid: 'i5', name: nm('envy', 'Demonhead', 'sloth'), rarity: 'rare', slot: 'helmet', ilvl: 15,
      implicit: IMP.def(8), affixes: [AF.acc(44), AF.hpPct(9.1), AF.def(26)], sins: { envy: 1, sloth: 1 } },
    { uid: 'i6', name: nm('greed', 'Heavy Boots'), rarity: 'craft', slot: 'boots', ilvl: 11,
      implicit: IMP.def(5), affixes: [AF.goldFind(17), AF.dodge(15)], sins: { greed: 1 } },
    { uid: 'i7', name: nm('sloth', 'Mesh Armor'), rarity: 'magic', slot: 'armor', ilvl: 12,
      implicit: IMP.def(18), affixes: [AF.slowEnemy(20)], sins: { sloth: 1 } },
    { uid: 'i8', name: nm('pride', 'Colossus Blade'), rarity: 'magic', slot: 'weapon', ilvl: 13, twoHanded: true,
      implicit: IMP.pen(20), affixes: [AF.atkPct(12)], sins: { pride: 1 } },
    { uid: 'i9', name: nm('envy', 'Crusader Gauntlets', 'gluttony'), rarity: 'rare', slot: 'gloves', ilvl: 15,
      implicit: IMP.def(6), affixes: [AF.deadly(9), AF.hp(64), AF.def(19)], sins: { envy: 1, gluttony: 1 } },
    { uid: 'i10', name: { ko: '피를 마시는 검', en: 'Blooddrinker Blade' }, rarity: 'unique', slot: 'weapon', ilvl: 18, fixed: true,
      implicit: null, affixes: [AF.maxDmg(22), AF.critDmg(40), AF.lifesteal(6)], sins: {} },
    { uid: 'i11', name: nm('wrath', { ko: '원형 방패', en: 'Round Shield' }), rarity: 'magic', slot: 'offhand', ilvl: 12,
      implicit: IMP.def(14), affixes: [AF.thorns(22)], sins: { wrath: 1 } },
    { uid: 'i12', name: nm('pride', { ko: '문장 방패', en: 'Crest Shield' }, 'envy'), rarity: 'rare', slot: 'offhand', ilvl: 15,
      implicit: IMP.def(22), affixes: [AF.def(30), AF.allStats(5), AF.hpPct(6.8)], sins: { pride: 1, envy: 1 } },
    { uid: 'i13', name: nm('greed', { ko: '금목걸이', en: 'Gold Necklace' }), rarity: 'craft', slot: 'amulet', ilvl: 14,
      implicit: null, affixes: [AF.goldFind(28), AF.itemFind(14)], sins: { greed: 1 } },
    { uid: 'i14', name: nm('envy', { ko: '눈 목걸이', en: 'Eye Pendant' }, 'wrath'), rarity: 'rare', slot: 'amulet', ilvl: 16,
      implicit: null, affixes: [AF.critPct(8.2), AF.acc(36), AF.critDmg(24)], sins: { envy: 1, wrath: 1 } },
    { uid: 'i15', name: nm('lust', { ko: '은반지', en: 'Silver Ring' }), rarity: 'magic', slot: 'ring', ilvl: 10,
      implicit: null, affixes: [AF.aspd(5)], sins: { lust: 1 } },
    { uid: 'i16', name: nm('gluttony', { ko: '대식 반지', en: 'Glutton Ring' }, 'sloth'), rarity: 'rare', slot: 'ring', ilvl: 15,
      implicit: null, affixes: [AF.hp(88), AF.hpRegen(12), AF.def(17)], sins: { gluttony: 1, sloth: 1 } },
    { uid: 'i17', name: nm('wrath', 'Katana'), rarity: 'magic', slot: 'weapon', ilvl: 11, twoHanded: true,
      implicit: IMP.pen(20), affixes: [AF.critPct(9.4)], sins: { wrath: 1 } },
    { uid: 'i18', name: nm('sloth', 'Bone Boots', 'gluttony'), rarity: 'rare', slot: 'boots', ilvl: 13,
      implicit: IMP.def(7), affixes: [AF.def(21), AF.hpPct(7.2), AF.dodge(19)], sins: { sloth: 1, gluttony: 1 } },
    // 쿨감 = 신규 옵션 축 (item_design §3) — 실효 쿨 정렬을 맞추는 손잡이
    { uid: 'i19', name: nm('sloth', { ko: '시간 반지', en: 'Hourglass Ring' }, 'pride'), rarity: 'rare', slot: 'ring', ilvl: 16,
      implicit: null, affixes: [AF.cdr(8), AF.slowEnemy(14), AF.def(18)], sins: { sloth: 1, pride: 1 } },
    { uid: 'i20', name: nm('pride', { ko: '시계추 목걸이', en: 'Pendulum Amulet' }), rarity: 'craft', slot: 'amulet', ilvl: 15,
      implicit: null, affixes: [AF.cdr(5), AF.allStats(4)], sins: { pride: 1 } },
];

/**
 * 인벤토리 — 데이터는 **용량**이고 배치는 화면이 정한다 (2026-08-23 캐릭터 탭 개편).
 * 아이템 칸이 가로 전폭으로 내려가면서 열 수는 창 폭에 따라 흐른다(CSS auto-fill).
 * cols/rows 는 용량 산식의 근거로만 남긴다 — 실제 열 수를 결정하지 않는다.
 */
const INV_COLS = 7, INV_ROWS = 10;
export const INV_GRID = { cols: INV_COLS, rows: INV_ROWS, cap: INV_COLS * INV_ROWS };

/**
 * 세트 브레이크포인트 — **3/6/9** (item_design §2 확정, 2026-08-21).
 * 8부위 확장으로 한 죄종 상한이 6 → 9(장비 8 + 메인 죄종 1)가 되면서 원작 2/4/6에서 이동.
 * 효과 자체는 계승분 equipment_set_bonus.csv 를 그대로 옮겼다 (2→3, 4→6, 6→9 대응).
 * 3=상태이상 / 6=조건부 패시브 / 9=각성
 */
const TBD = { ko: '(미확정)', en: '(TBD)' };
const UNWRITTEN = { ko: '(미작성)', en: '(unwritten)' };
export const SET_BONUSES = {
    wrath: {
        3: { ko: '화상 — 적 체력회복 감소', en: 'Burn — cuts enemy health regen' },
        6: { ko: '잃은 체력 비례 공격력', en: 'Attack per missing health' },
        9: { ko: '최후의 저항 — 사망 시 1회 생존', en: 'Last Stand — survive death once' },
    },
    envy: {
        3: { ko: '중독 — 매 초 고정 데미지', en: 'Poison — flat damage per second' },
        6: { ko: '버프 박탈', en: 'Buff Strip' },
        9: { ko: '약자멸시 — 체력 30% 이하 방어 무시', en: 'Execution — ignore defense under 30% HP' },
    },
    greed: {
        3: { ko: '스턴', en: 'Stun' },
        6: { ko: '탐욕의 감정 — 상위 굴림 확률 증가', en: "Greed's Favor — better affix rolls" },
        9: { ko: '약탈왕 — 보스 처치 시 2개 드롭', en: 'Plunder King — bosses drop twice' },
    },
    sloth: {
        3: { ko: '빙결 — 적 공격속도 감소', en: 'Freeze — slows enemy attacks' },
        6: TBD, 9: TBD,
    },
    gluttony: {
        3: { ko: '과식 패널티 — 모든 스탯 감소', en: 'Overeating — all stats reduced' },
        6: UNWRITTEN, 9: UNWRITTEN,
    },
    lust: {
        3: { ko: '매혹 — 적 명중률 감소', en: 'Charm — cuts enemy accuracy' },
        6: { ko: '갈취', en: 'Siphon' },
        9: { ko: '지배 — 피해 일부 마법 변환', en: 'Domination — part of damage becomes magic' },
    },
    pride: {
        3: UNWRITTEN, 6: UNWRITTEN,
        9: { ko: '완전무결 — 상태이상 면역', en: 'Perfection — immune to status effects' },
    },
};

export const BREAKPOINTS = [3, 6, 9];

export const RESOURCES = { gold: 12480, dust: 214, stigma: 3 };

/* ═══════════ 선술집 ═══════════ */
// 선술집 후보는 전부 **레어 층** — 직업·죄종·시작특성이 등장 시 굴려진다 (hero_design §4)
// 유니크 영웅의 획득 경로는 미확정 (hero_design §9) → 화면에도 자리만 비워둔다

export const TAVERN = {
    rerollCost: 800,
    candidates: [
        { name: { ko: '아셀린', en: 'Aselin' }, tier: 'rare', sin: 'envy', cls: 'archer', trait: { ko: '매의 눈', en: 'Hawk Eye' }, cost: 2400, discount: 12,
          stats: { str: 15, agi: 12, int: 5, vit: 11, sen: 14, ldr: 6, cha: 9 } },
        { name: { ko: '그리모', en: 'Grimmo' }, tier: 'rare', sin: 'sloth', cls: 'priest', trait: { ko: '강골', en: 'Sturdy' }, cost: 2100, discount: 12,
          stats: { str: 11, agi: 6, int: 9, vit: 17, sen: 7, ldr: 8, cha: 5 } },
        { name: { ko: '유디트', en: 'Judith' }, tier: 'rare', sin: 'greed', cls: 'mage', trait: { ko: '언변', en: 'Silver Tongue' }, cost: 3050, discount: 12,
          stats: { str: 13, agi: 14, int: 7, vit: 10, sen: 11, ldr: 6, cha: 15 } },
    ],
};

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
            [_, _, { n: { ko: '분노 세트포인트당 치명타', en: 'Crit per Wrath Set Point' }, r: 0, max: 3, locked: true }, _, _],
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
    // 키는 CLASSES 의 id — 무기군 배정은 hero_design §5 표 그대로, 무기군마다 독립 분기라 행을 하나씩 쓴다
    mastery: {
        warrior: [
            [{ n: { ko: '도끼 숙련', en: 'Axe Mastery' }, r: 3, max: 5 }, _, _, _, _],
            [{ n: { ko: '양손검 숙련', en: 'Two-Hander Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [{ n: { ko: '둔기 숙련', en: 'Mace Mastery' }, r: 0, max: 5 }, { n: { ko: '방어구 숙련', en: 'Armor Mastery' }, r: 2, max: 5 }, _, _, _],
        ],
        knight: [
            [{ n: { ko: '한손검+방패 숙련', en: 'Sword & Shield Mastery' }, r: 4, max: 5 }, _, _, _, _],
            [{ n: { ko: '창 숙련', en: 'Spear Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [{ n: { ko: '방어구 숙련', en: 'Armor Mastery' }, r: 3, max: 5 }, _, _, _, _],
        ],
        mage: [
            [{ n: { ko: '지팡이 숙련', en: 'Staff Mastery' }, r: 2, max: 5 }, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ],
        archer: [
            [{ n: { ko: '활 숙련', en: 'Bow Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ],
        priest: [
            [{ n: { ko: '둔기+방패 숙련', en: 'Mace & Shield Mastery' }, r: 0, max: 5 }, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ],
    },
    // 전직 트리는 정체 자체가 미정 — 프레임만 잠긴 채로 보여준다
    advance: {
        note: {
            ko: '전직 트리 — 정체 추후 결정 (skill_design §5)',
            en: 'Advancement tree — identity to be decided (skill_design §5)',
        },
    },
};

export const SKILL_POINTS = { total: 24, spent: 21 };

/* ═══════════ 도감 ═══════════ */
/**
 * 몬스터 도감 — **처치 수 기반** (2026-08-22 방향 전환, GAME_DESIGN 결정 로그).
 *
 * 몬스터마다 처치 수가 문턱을 넘을 때마다 그 스테이지의 스탯 계열이 조금씩 오른다.
 * 스탯 계열은 계승 bonus 테이블의 배정을 유지 (1=공격, 2=체력, 3=명중, 4=피해).
 * ⚠ 문턱·수치는 전부 **화면 확인용 임시값** — 확정 시 balance.csv / 신규 도감 CSV로 나가야 한다.
 */
export const CODEX_MILESTONES = [10, 50, 200, 1000];        // 처치 수 문턱
export const CODEX_MILESTONE_BONUS = [0.5, 0.5, 1, 1];      // 문턱별 획득 % (누적)

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
const mons = (a, b, c, boss, kills = [0, 0, 0, 0]) => [
    { id: a, kills: kills[0] }, { id: b, kills: kills[1] }, { id: c, kills: kills[2] },
    { id: boss, kills: kills[3], boss: true },
];

export const CODEX_STAGES = [
    cxStage(101, 1, 1, { ko: '파멸의 진영', en: 'Camp of Ruin' }, mons(1101, 1102, 1103, 1150, [1240, 860, 410, 64])),
    cxStage(102, 1, 2, { ko: '핏빛 교전지대', en: 'Crimson Battleground' }, mons(1201, 1202, 1203, 1250, [220, 180, 95, 31])),
    cxStage(103, 1, 3, { ko: '원한의 묘지', en: 'Graveyard of Grudges' }, mons(1301, 1302, 1303, 1350, [64, 41, 22, 3])),
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
