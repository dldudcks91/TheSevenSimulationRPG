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

/**
 * 스킬 태그 표시 이름 — 사전의 SSOT 는 `game_logic/skill.js:TAGS` 10종이다 (skill_design §11).
 * 파생 3종(광역·단일·다단히트)은 `target`·`hits` 가 답을 갖고 있어 CSV 에 안 적히므로 여기에도 없다.
 * 지금 읽는 곳 — 연구 탭의 전술 조건 (`tactic_option.csv:cond_arg`).
 */
export const SKILL_TAGS = {
    dot: { ko: '도트', en: 'DoT' },
    shout: { ko: '함성', en: 'Shout' },
    blessing: { ko: '축복', en: 'Blessing' },
    boost: { ko: '강화', en: 'Boost' },
    restore: { ko: '회복', en: 'Restore' },
    curse: { ko: '저주', en: 'Curse' },
    control: { ko: '제어', en: 'Control' },
    transform: { ko: '변신', en: 'Transform' },
    summon: { ko: '소환', en: 'Summon' },
    sacrifice: { ko: '희생', en: 'Sacrifice' },
};

/** 피해 종류 — 직업이 아니라 **무기군**이 정한다 (`weapon_group.csv:damage_kind` · battle_design §2-1) */
export const DAMAGE_KINDS = {
    physical: { ko: '물리', en: 'Physical' },
    magic: { ko: '마법', en: 'Magic' },
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
 * 직업 · 장비 부위/위치 · 아이템 베이스 · 접사 정의는 **CSV 로 나갔다** (2026-08-31):
 *   `class.csv` (7행 · CSV 컬럼은 `release`, 로더가 `stage` 로 주입) · `equip_slot.csv` (9행 = 부위 8 + 반지 두 번째 칸)
 *   `item_base.csv` (7부위 × 4 — 무기는 없다. 무기의 베이스는 무기군 자체 = `weapon_group.csv`)
 *   `affix.csv` (19행 · `scale` 3분류 · `per_ilvl` 은 `band` 행만)
 * 읽는 곳은 `ui/data.js`(`D.classes` · `D.slots`/`D.equipSlots` · `D.itemBases` · `D.affixDefs`).
 * ⚠ 접사·베이스 수치는 여전히 프로토타입 임시값이고 계승 접사 매트릭스(7죄종×슬롯)는 미연결이다.
 */

/** 접사 표기 — stat id → 이름 + 단위. **화면 전용 사전**이라 CSV 로 가지 않는다 (COMBAT_CATS 와 같은 성격) */
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

/** 값만 — 부호와 단위는 affixText 와 **같은 규칙**이다 (단위를 붙이는 곳은 이 파일 하나) */
export const statValue = (stat, v, fallback) =>
    `${v >= 0 ? '+' : ''}${v}${statLabel(stat, fallback).fmt === 'pct' ? '%' : ''}`;

/** 페이퍼돌 배치 — 3열 × 4행, 신체 위치를 따른다. 칸은 착용 **위치**(equip_slot.csv:equip_slot_id) — 반지 두 칸.
 *  **화면 레이아웃이지 데이터가 아니라서** CSV 로 가지 않는다 (부위·위치 표는 equip_slot.csv).
 *  2026-08-27 재배치 — 목걸이는 투구 오른쪽 · 장갑은 무기 아래 · 신발은 보조 아래 · 반지는 장갑·신발 아래 (SCREEN_DESIGN §6) */
export const PAPERDOLL = [
    [null, 'helmet', 'amulet'],
    ['weapon', 'armor', 'offhand'],
    ['gloves', null, 'boots'],
    ['ring1', null, 'ring2'],
];

/* ═══════════ 영웅 생성 풀 ═══════════
   굴리는 규칙은 game_logic/hero.js 에 있고, 풀(데이터)은 **CSV 로 나갔다** (2026-08-31):
   `hero_name.csv` 24행(레어 영웅은 무한 생성이라 이름도 풀에서 뽑는다 — 유니크 15명은 고정 명단이라 들어오지 않는다) ·
   `hero_trait.csv` 12행(시작 특성 — ⚠ 효과 미작성, 지금은 이름표만 굴린다. hero_design §3).
   읽는 곳은 `ui/data.js`(`D.heroNamePool` · `D.heroTraitPool`). */

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
 * 영웅 초상 — 몬스터와 같은 자리(`faces/<스타일>/`)에 `hero_<n>.png`. **어느 그림인지는 이름이 정한다.**
 *
 * uid 로는 안 된다 — 시작 화면·선술집의 **후보는 아직 uid 가 없고**(고용할 때 발급된다) 그러면 뽑을 때 본 얼굴과
 *   고용한 뒤의 얼굴이 갈린다. 이름은 굴리는 순간 정해져 끝까지 안 바뀌므로, 후보 카드 · 영웅 띠 · 관전 카드가
 *   **같은 영웅에게 늘 같은 얼굴**을 준다 (SCREEN_DESIGN §5 「영웅의 생김새는 어디서나 같다」).
 * 매 렌더 굴리지 않는 이유도 같다 — 다시 그릴 때마다 얼굴이 바뀌면 그건 초상이 아니라 슬롯머신이다.
 *
 * 장수(`HERO_FACE_MAX`)를 **스타일이 다 갖출 필요는 없다** — 파일이 없으면 렌더러의 `onerror` 로 img 만 빠지고
 *   밑에 깔린 직업 글리프가 드러난다 (몬스터 얼굴과 같은 규칙 · FACE_STYLES 참조).
 * 인자는 `{name}` 을 가진 것이면 된다 — 영웅 객체 · 후보 · 관전 유닛(`battle.js` 가 `h.name` 을 그대로 싣는다).
 */
export const HERO_FACE_MAX = 5;
/** 표시용 안정 해시(FNV-1a) — 같은 문자열이면 언제나 같은 수. **game_logic 의 rng 와 무관하다**(결정론 계약 밖) */
const strHash = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
};
export const heroFace = hero => {
    const key = hero?.name?.ko ?? (typeof hero?.name === 'string' ? hero.name : null);
    if (!key) return null;
    return `${faceDir()}hero_${1 + strHash(key) % HERO_FACE_MAX}.png`;
};
/**
 * 직업 글리프 — 아트가 없는 영웅의 얼굴. **영웅의 생김새는 어디서나 같다** (2026-08-27, SCREEN_DESIGN §5):
 * 영웅 띠 · 후보 카드 · 관전 유닛 카드가 전부 이 표 하나를 읽는다. 표시 사전이라 game_logic 에 주입하지 않는다.
 */
export const CLASS_GLYPH = { warrior: '⚔', knight: '⛨', mage: '✦', archer: '🏹', priest: '✚', assassin: '🗡', necromancer: '☠' };
export const classGlyph = cls => CLASS_GLYPH[cls] ?? '⚔';
/**
 * 액티브의 **표시 사전** (2026-08-30 — `MOCK_ACTIVES` 목업 폐기).
 * 이름 · 표기 쿨 · 배율 같은 게임 데이터는 `skill.csv` 가 SSOT 이고, 여기 남는 것은 **화면 전용**인 둘뿐이다:
 *   · `i` 아이콘 — CSV 에 아이콘 컬럼이 없다(자산 경로와 같은 자리라 표시 사전이 든다)
 *   · `d` 설명 ko/en — `skill.csv:description_kr` 은 **설계 노트**(「전사 ③ 은 기획 미정」처럼)라 플레이어에게 내보낼 문장이 아니다
 * 설명은 **수치를 적지 않는다** — 수치의 SSOT 는 CSV 다. 아이콘 세트가 흑백 글리프와 컬러 이모지로 섞여 있는 문제는 그대로 남아 있다 (DEV_PLAN 부채 #13).
 */
export const SKILL_DISPLAY = {
    war_warcry: { i: '📣', d: { ko: '외침으로 파티 전원의 공격을 한동안 끌어올린다', en: 'A shout that lifts the whole party’s attack for a while' } },
    war_bash: { i: '⚔', d: { ko: '한 대상을 크게 내리친다', en: 'A heavy blow on a single target' } },
    kni_bulwark: { i: '⛨', d: { ko: '파티 전원에게 피해를 대신 먹는 방벽을 두른다', en: 'Wraps the party in a shield that soaks damage first' } },
    kni_taunt: { i: '💢', d: { ko: '적의 시선을 자신에게 끌어온다', en: 'Pulls enemy attention onto yourself' } },
    kni_rush: { i: '🐎', d: { ko: '적들 사이를 돌며 정해진 타수를 나눠 꽂는다', en: 'Rides through the enemies, splitting a fixed number of blows' } },
    mag_fireball: { i: '🔥', d: { ko: '불덩이를 던진다 — 불 피해', en: 'Hurls a ball of flame — fire damage' } },
    mag_chain: { i: '⚡', d: { ko: '번개가 적을 타고 옮겨 간다 — 뒤로 갈수록 약해진다', en: 'Lightning leaps from foe to foe, weakening as it goes' } },
    mag_iceblast: { i: '❄', d: { ko: '한 대상을 얼려 붙인다 — 냉기 피해', en: 'Freezes a single target — cold damage' } },
    arc_snipe: { i: '🎯', d: { ko: '한 대상을 노려 크게 쏜다', en: 'A single aimed shot for heavy damage' } },
    arc_multishot: { i: '🏹', d: { ko: '화살을 흩뿌려 적 전원을 맞힌다', en: 'Scatters arrows across every enemy' } },
    arc_rapid: { i: '💨', d: { ko: '한 대상에게 화살을 연달아 박는다', en: 'Pours repeated arrows into one target' } },
    pri_haste: { i: '🌬', d: { ko: '파티 전원의 손을 한동안 빠르게 한다', en: 'Quickens the whole party for a while' } },
    pri_heal: { i: '✚', d: { ko: '파티 전원의 HP 를 되돌린다', en: 'Restores HP to the whole party' } },
    pri_judgment: { i: '⚖', d: { ko: '한 대상에게 심판을 내린다', en: 'Brings judgment down on one target' } },
};
/** 없는 id 는 빈 칸이 아니라 기본 글리프로 — 스킬이 늘어도 화면이 비지 않는다 */
export const skillDisplay = id => SKILL_DISPLAY[id] ?? { i: '✦', d: null };

/* 원소 4종 표시 사전(`ELEMENT_LABELS`)은 **삭제했다** (2026-08-31) — `ELEMENT_IDS` 가 유일한 소비자였고
   그것이 `game_logic/hero.js:ELEMENTS` 로 통합되면서 참조가 0이 됐다. 화면이 원소 이름을 그리게 되면
   그때 다시 만든다(4줄이다). id 목록의 SSOT 는 `hero.js:ELEMENTS` 하나다. */

/* 아이템 이름 조립(`nm`)은 **이식 대상 코드**라 `game_logic/naming.js:createNaming` 으로 갔다 (2026-08-31).
   죄종 표시명(SINS)만 여기서 주입된다 — `ui/data.js:NAMING`. */

/**
 * 배경 이미지 — TheSevenRPG 계승분 (src/assets/art/backgrounds/).
 * 파일명이 계승 스테이지 id(101/102/103)를 그대로 쓰므로 stage_id ↔ 배경이 1:1로 붙는다.
 * 원본 PNG는 32bit RGBA라 4장 18MB였다 → **WebP q88로 변환해 888KB** (해상도 무손실, 상세는 같은 폴더 README).
 * ⚠ 104(사탄의 제단)와 챕터 2 이후는 원작에도 없다 — 없는 스테이지는 기존 그라디언트로 폴백한다.
 * 경로는 문서(src/index.html) 기준 상대경로 — JS가 인라인 스타일로 넣기 때문이다.
 */
export const BG_DIR = './assets/art/backgrounds/';
/** ⚠ 아직 아무 화면도 안 읽는다 — 자산(`town.webp`)은 실재하고 거점 화면이 생기면 여기가 쓰인다 */
export const TOWN_BG = BG_DIR + 'town.webp';
export const stageBg = id => BG_DIR + `background_stage_${id}.webp`;

/**
 * 몬스터 얼굴 — `src/assets/art/faces/<스타일>/monster_<idx>.png`.
 *
 * **스타일 하나 = 폴더 하나** (2026-08-30). 새 스타일을 넣는 방법은 둘뿐이다:
 *   ① `faces/` 아래 폴더를 만들고 같은 파일명 규칙(`monster_<idx>.png`)으로 그림을 넣는다
 *   ② 아래 `FACE_STYLES` 에 그 폴더 이름을 더한다
 * 코드의 다른 곳은 스타일을 모른다 — 경로를 조립하는 곳이 `faceDir()` 하나뿐이라서다.
 * 고르는 순서는 언어와 같다: URL `?face=<스타일>` → localStorage → 목록의 **첫 항목**.
 * **한 스타일이 전 몬스터를 다 갖출 필요는 없다** — 파일이 없으면 그 자리는 죄종 색 원판 + 이니셜로 떨어진다
 * (렌더러가 `<img onerror>` 로 받는다). 그리는 중인 스타일로도 게임이 돈다.
 *
 * **어느 몬스터가 얼굴을 갖는가는 `monster.csv:face` 가 SSOT** — 여기 남는 것은 경로 조립뿐이다
 * (이름 ko/en 도 `monster_name_kr`/`_en` 으로 이사했다 — ui/data.js:monsterName·monsterFace).
 */
export const FACE_STYLES = ['cartoon', 'pixel16'];      // **첫 항목이 기본값이다** — 2026-08-31 cartoon 으로 교체 (사용자 지시)
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
}
export const faceDir = () => `./assets/art/faces/${faceStyleCur}/`;

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
