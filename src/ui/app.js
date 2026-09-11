/**
 * 화면 렌더러 — DOM만 그린다. 규칙은 game_logic/ 에 있다.
 *
 * 2026-08-25 — 목업에서 **실동작**으로. 이 파일은 상태(G)를 읽고 시스템(SYS)을 부르고 저장(save)할 뿐,
 * 수치를 계산하거나 난수를 굴리지 않는다. 시계(Date.now)는 여기서만 읽어 로직에 `now` 로 넘긴다.
 *
 * i18n 규약 (2026-08-23): **이 파일에 한국어 리터럴을 쓰지 않는다** (주석 제외).
 *   UI 문구 → i18n.js 의 t(key) / 데이터 문자열 → mock.js 의 {ko, en} 쌍을 L() 로 푼다.
 *
 * 화면 흐름: 시작(새 게임 → 프롤로그 5씬 / 이어하기) → 원정(편성 → 관전 → 리포트) ⇄ 캐릭터(+스킬 창) / 강화 / 선술집 / 상점 / 자원 / 탐험 / 연구 / 도감 / 도움말
 *   전투 파티는 한 팀만 운용하므로 원정 탭 하나가 세 상태를 갖는다. 탭 목록·순서의 근거는 TABS 위 주석 (SCREEN_DESIGN §1).
 *
 * 2026-08-26 — **인게임 패널에는 설명 문장을 두지 않는다** (사용자 지시). 숫자·상태·오류·버튼·툴팁만 남기고
 *   규칙 문구는 전부 도움말 탭(renderHelp)으로 옮겼다. 새 안내 문장을 패널에 붙이려면 도움말에 넣는다.
 *
 * 2026-08-27 — **영웅 초상은 네모 박스** (heroFace). 관전 유닛 카드와 같은 규격 · 같은 그림(M.heroFace — 이름이 고른다, 2026-08-30).
 *   영웅의 생김새는 어디서나 같다. 원형(.face)은 몬스터 얼굴 전용으로 남는다 (SCREEN_DESIGN §5).
 *   영웅 띠 카드(heroStrip)는 초상이 카드 전체를 채우고, 글자는 위칸(상태 태그 · 이름) 하나로 초상 위에 얹는다.
 *   캐릭터 탭 4칸은 같은 폭·높이 — 장비 / 기본 옵션(+현재 스킬 정사각 카드) / 세부 옵션 1 / 세부 옵션 2.
 *   옛 핵심 전투치 4 줄은 세부 옵션이 흡수했다 (감쇠율은 물리 방어 행에 병기, SCREEN_DESIGN §6).
 *
 * 2026-09-01 — **세부 옵션의 행 순서는 `combat_stat.csv:sheet_order` 가 정한다** (사용자 지시, SCREEN_DESIGN §6).
 *   카테고리 묶음 순으로 그리던 옛 규칙(`M.COMBAT_CATS` flatMap)은 폐기했고 그 사전도 지웠다 — 카테고리 제목을
 *   안 그리는 화면에서 **순서가 유일한 구조 신호**인데 그 순서가 암묵값(CSV 행 순서)이었다.
 *   머리 3줄(물리 공격력 · 마법 공격력 · 최대 HP)이 대표값이고, 칸은 「피해 감소」 앞에서 갈린다.
 *
 * 2026-08-27 — **원정 편성은 「어디를 갈지 먼저」** (사용자 지시, SCREEN_DESIGN §4-1). 행 클릭은 「지역 선택」이고,
 *   출발 버튼은 스테이지 행이 아니라 그 뒤에 열리는 편성 화면이 든다. **누를 때만** 뜬다 — 자동으로 열지 않는다.
 *
 * 2026-09-10 — **편성은 창이 됐다** (사용자 지시, SCREEN_DESIGN §4-1 · ADR-0084). 접이식 전진 패널(formPanel)이
 *   **탭 위에 겹쳐 뜨는 출정 창**(MODALS.depart · departHead/departBody)으로 옮겨 갔다. 속은 이름 붙은 칸 넷 —
 *   **캐릭터 선택**(영웅 띠가 창 안으로 들어왔다) · 적 구성 · 진형 · 출정 방식. 닫는 길은 창 공통 셋(X · 바깥 · Esc).
 *   같은 날 **탭 최상단의 띠를 걷었다**(ADR-0085) — 원정에서 로스터가 서는 자리는 창 안 하나이고, 탭은 스테이지 목록만 든다.
 *
 * 2026-09-03 — **프롤로그**(renderPrologue · SCREEN_DESIGN §3-1). 새 게임을 확정하면 5씬을 넘긴 뒤 원정 탭으로 들어간다.
 *   세이브는 프롤로그보다 **먼저** 쓰인다(startGame 이 newGame → save 를 끝낸 뒤 화면만 프롤로그로 둔다) — 읽다 닫아도 이어하기로 돌아온다.
 *   본문은 한국어만 있다(사용자 지시) — i18n 의 pro.* 참조. 개발용 경로는 ?dev=prologue 이고 나머지 dev 경로는 프롤로그를 건너뛴다.
 *
 * 2026-09-09 — **진형이 실물이 됐다** (formPanel 안 .fm-box · SCREEN_DESIGN §4-1 · 부채 #37 해소).
 *   ~~⚠ 목업 · 값은 화면 상태(state.expForm)에만 산다~~ **폐기** — 자리는 **세이브 값**(`G.formation`)이고
 *   **전투가 그것을 읽는다**: 「앞에 있는 유닛부터 때린다」의 「앞」이 이 자리다 (battle_design §3-1).
 *   정원·템플릿은 `formation_template.csv`, 규칙은 `game.formationState`/`setFormation`/`placeFormation` 이 든다.
 *   동사는 그대로 갈린다: **클릭은 소속**(로스터 띠 = 파티 넣고 빼기) · **드래그는 자리**(칩).
 *
 * 개발용 URL: ?dev=prologue (프롤로그 첫 씬) / ?dev=newgame (현재 후보로 즉시 시작) / ?dev=battle (첫 스테이지 1회 즉시 정산 → 리포트 · &runs=n 이면 n번 연달아 = 런 목록이 쌓인 상태) / ?dev=live (재생이 도는 채로 리포트 — 기여 표가 실시간으로 찬다 · &at=n 이면 n초부터) / ?dev=play (첫 스테이지 관전 재생 · &bt=log|dmg 면 그 판으로 로그 창이 열린 채 · &lay=split 이면 옛 나눔 배치 · &rep=1 이면 반복 원정을 켠 채) / ?tab=character 등 (탭 바로 열기) / ?dev=offline (반복 켠 채 껐다 켠 상황 — 런 마무리 배너) / ?dev=form (출정 창이 열린 상태 · &open=0 이면 창을 닫은 목록) / ?dev=tactics (연구 탭 — 전술 칸이 전부 열린 상태)
 */

import * as M from './mock.js';
import { t, L, lang, setLang, applyDocumentLang } from './i18n.js';
import { mountBattle } from './battle.js';
import { bindTipNode, hideTip, heroTipCard, skillTipCard, skillLineHtml, stagePoint } from './tip.js';
import { D, SYS, loadData, monsterName, monsterFace, monsterSin, stageName, stageBgOf, chapterOf, codexStages, skillInfo, skillTagName } from './data.js';
import { loadSave, writeSave, clearSave } from './storage.js';
import { makeRng } from '../game_logic/rng.js';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
};

/* ═══════════ 게임 상태 · 저장 ═══════════ */

let G = null;                          // 세이브의 실체. null 이면 시작 화면
const now = () => Date.now();          // 시계는 UI 층에서만 읽는다
function save() { if (G) writeSave(SYS.game.serialize(G, now())); }

const heroById = uid => G?.heroes.find(h => h.uid === uid);
/* 매력 — **수색이 미는 유일한 능력치**다 (base_expedition_design §2-4). 약어는 `hero_attribute.csv` 가 든다 */
const CHA = 'cha';
const chaAbbr = () => D.heroAttributes.find(a => a.id === CHA)?.abbr ?? CHA;
const itemOf = uid => (uid ? G.items[uid] : null) ?? null;
const wornItems = h => SYS.game.heroItems(G, h);
const combatOf = h => SYS.game.heroCombat(G, h);
const cycleOf = h => combatOf(h).action_period;
const xpNext = h => SYS.hero.xpNeeded(h.level);
/* ~~isOut~~ 는 2026-09-08 삭제 — 「출정 아웃」 폐기(GAME_DESIGN §9 09-08). 아웃은 런 안에서만 살고
   런은 출발 순간 통째로 정산되므로, 화면이 그리는 시점에 아웃된 영웅이 존재하지 않는다 */
/* 그 스킬의 **표기 쿨** — 스킬이 가진 값 하나다 (개정 2026-09-08 2차 · SCREEN_DESIGN §4-2).
   ~~실효 쿨(`ceil(쿨 ÷ 주기) × 주기`)~~ 은 폐기 [사용자 지시] — 그건 **주기의 함수**라 공격 속도를 올리면
   쿨 자리의 숫자가 따라 움직였다. 쿨은 주기와 무관하고(`skill_runtime.js` 의 `readyAt` 에 주기가 없다)
   움직인 것은 **다음 차례까지의 대기**였는데, 화면이 그 합을 쿨이라 부르고 있었다.
   **행동 주기를 인자로 안 받는다** — 안 보는 것이 이 개정의 요점이라 넘길 자리 자체를 없앤다 */
const coolSecOf = skillId => SYS.skill.previewOf(SYS.skill.defs[skillId])?.baseSec ?? null;
/* 초 표기 — 7.2 는 그대로, 12.0 은 12 로 (tip.js 와 같은 규칙) */
const secText = v => t('sk.cool', { s: String(Number(Number(v).toFixed(1))) });
/* 액티브 3칸의 출처 — **칸을 정하는 것은 출처다** (skill_design §2). 순서도 이 배열이 정한다 */
const ACTIVE_SOURCES = ['innate', 'weapon_group', 'advance'];
/* 그 영웅의 액티브 — 배정은 game_logic(skill.activesFor), 표시(아이콘·설명)는 skillInfo 가 붙인다.
   배정은 인스턴스 `{id, source}` 라 **출처를 화면이 다시 알아내지 않는다** — 「고유」 표시는 source 가 답이다.
   **칸은 출처 자리다** — 무기를 안 낀 영웅은 「무기」 칸이 비고, 전직 전이면 「전직」 칸이 빈다.
   배정 순서로 채우면 무기 없는 영웅의 전직 스킬이 무기 칸에 앉아 「무엇이 비었나」가 안 읽힌다 */
const activeCells = h => {
    // 무기 칸의 입력은 **무기 개체가 담은 스킬**이다 [개정 2026-09-09 · skill_design §12-1 규칙 3]
    const wg = h && G ? SYS.game.weaponSkillOf(G, h) : null;
    const list = (h ? SYS.skill.activesFor(h, { weaponSkill: wg }) : [])
        .map(a => ({ ...skillInfo(a.id), source: a.source }));
    return ACTIVE_SOURCES.map(src => list.find(a => a.source === src) ?? null);
};
/* 빈 칸의 사유 — 왜 비었는지가 칸 안에서 답해져야 한다 (「빈 칸」만 찍으면 고장으로 읽힌다) */
const emptySlotText = i => t(['sk.emptySlot', 'sk.emptyWeapon', 'sk.emptyAdvance'][i] ?? 'sk.emptySlot');
/* 칸 이름 = 출처 이름. 「고유」는 이미 쓰던 키를 그대로 재사용한다 */
const sourceName = i => t(i === 0 ? 'sk.innate' : `sk.src.${ACTIVE_SOURCES[i]}`);

const sinColor = id => M.SINS[id]?.color ?? 'var(--text-muted)';
const sinName = id => L(M.SINS[id]) || id;
/** 옵션 줄의 출처 태그 (SCREEN_DESIGN §6 · ADR-0100) — `fixed` · 죄종 id(그 죄종 색) · 그 밖은 랜덤(출처 없는 옛 접사 포함) */
const srcTag = src => src === 'fixed' ? `<i class="tip-src">${t('tip.src.fixed')}</i>`
    : M.SINS[src] ? `<i class="tip-src sin" style="color:${sinColor(src)}">${sinName(src)}</i>`
        : `<i class="tip-src">${t('tip.src.random')}</i>`;
const rarity = r => M.RARITY[r] ?? M.RARITY.magic;
// 등급 표기 — SSOT 는 `hero_tier.csv` 다 (2026-09-08 R48 · ~~mock.js:HERO_TIER~~ 대체).
// 3층(매직/레어/유니크) 중 모르는 값이 오면 레어로 떨어뜨린다 — 옛 세이브의 안전망
const tierOf = h => D.heroTiers.find(t => t.id === h.tier) ?? D.heroTiers.find(t => t.id === 'rare') ?? D.heroTiers[0];
const tierChip = h => `<span class="tier-chip" style="color:${tierOf(h).color}" title="${L(tierOf(h).desc)}">${L(tierOf(h))}</span>`;
/* 영웅의 정체성 색 = **등급** (2026-09-03 사용자 지시 · SCREEN_DESIGN §5). 죄종 색이 앉아 있던 자리를 전부 이것이 받는다 —
   죄종은 일곱 갈래라 색이 일곱이고 그 일곱이 화면마다 다른 뜻(챕터의 죄종 · 접사의 죄종 · 영웅의 죄종)으로 읽혔다.
   ⚠ `sinColor` 는 남는다 — 챕터·정예 몬스터·장비 접사의 죄종은 **다른 축**이라 그대로 색을 쓴다 */
const tierColor = h => tierOf(h).color;

/** 남은 시간 표기 — 시/분/초 */
function fmtDuration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return t('time.hm', { h, m });
    if (m > 0) return sec > 0 && m < 10 ? t('time.ms', { m, s: sec }) : t('time.m', { m });
    return t('time.s', { s: sec });
}
/* 직업 7종 — id 로 참조, 표시는 L() (hero_design §2). 무기군 목록은 weapon_group.csv(D.weaponGroupList)에서 파생 */
const classDef = id => D.classes.find(c => c.id === id);
const className = id => L(classDef(id)) || id;
const classWeapons = id => D.weaponGroupList.filter(g => g.classes.includes(id)).map(g => L(g)).join(' / ');
const classLine = id => { const c = classDef(id); return c ? `${L(c.role)} · ${classWeapons(id)}` : t('class.unassigned'); };
const slotDef = id => D.slots.find(s => s.id === id);                                   // 부위
const posDef = pos => slotDef(D.equipSlots.find(s => s.id === pos)?.part);             // 착용 위치 → 부위 정의
const affixText = a => L(M.affixText(a.stat, a.v));

/* 스테이지 표시 — 수치도 이름도 D.stages(stage.csv) · 조립은 data.js:stageName */
const stageTitle = row => `${L(chapterOf(row.chapter)?.name)} — ${L(stageName(row))}`;
/** 예상 소요 = 그 스테이지의 라운드별 목표 전투시간 합 (round_budget.csv) — 라운드 줄은 `battle.stageRounds` (챕터보스 스테이지는 보스 하나 · 2026-09-11) */
function stageMinutes(stage) {
    const sec = SYS.battle.stageRounds(stage).reduce((a, r) => {
        const key = r.round_type === 'boss' ? stage.boss_grade : r.round_type;
        return a + (D.budgets[key]?.time_target_sec ?? 0);
    }, 0);
    return Math.max(1, Math.round(sec / 60));
}

/**
 * 몬스터 얼굴 (src/assets/art/faces/<스타일>/). 아트가 없으면 **빈 원**이다 — 죄종 색 원판만 남고 글자는 없다.
 *
 * **밑에 아무것도 깔지 않는다** (2026-09-06 사용자 지시) — 옛 판은 이름 이니셜을 초상 밑에 깔고 그림을 위에 덮어,
 *   고른 스타일에 그 그림이 없으면 `onerror` 로 img 만 빠지고 글자가 드러나게 했다. 몬스터 그림도 **배경 투명 PNG** 라
 *   그림이 **있어도** 여백 사이로 글자와 색이 비쳐 보였다 — 영웅 초상이 2026-09-03 에 같은 이유로 글리프를 걷은 것과 같다.
 *   이름은 `title` 이 계속 든다(칩에는 글씨가 없으므로 호버가 유일한 길이다).
 */
const faceChip = (id, extraCls = '') => {
    const src = monsterFace(id);
    const name = L(monsterName(id));
    const c = sinColor(monsterSin(id));
    if (src) return `<span class="face ${extraCls}" title="${name}"><img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()"></span>`;
    return `<span class="face none ${extraCls}" title="${t('face.noArt', { name })}"
        style="background:${c}22;border-color:${c}66"></span>`;
};
/**
 * 적 칸 — **정사각**. 전진 패널의 적 구성이 쓴다 (§4-1 · 2026-09-10 사용자 지시).
 * 원형(`faceChip`)이 아닌 이유는 **오른쪽 진형 칸과 같은 크기·같은 모양으로 마주 놓기** 위해서다 —
 * 몬스터를 정사각으로 그리는 자리는 이미 있다(관전 유닛 카드 · ADR-0022 「몬스터 카드 = 영웅 카드」).
 * 원형은 도감·접이식이 계속 쓴다.
 * 이름은 `title` 이 든다 — 칸에는 글씨가 없다 (`faceChip` 과 같은 규칙 · 2026-09-06).
 */
const foeCell = (id, extraCls = '') => {
    const src = monsterFace(id);
    const name = L(monsterName(id));
    const c = sinColor(monsterSin(id));
    return `<span class="foe-cell ${extraCls}" title="${src ? name : t('face.noArt', { name })}"
        ${src ? '' : `style="background:${c}22"`}
        >${src ? `<img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()">` : ''}</span>`;
};
/**
 * 영웅 초상 — 네모 박스. 관전 유닛 카드의 스프라이트와 같은 규격이다: **영웅의 생김새는 어디서나 같다**
 * (2026-08-27, SCREEN_DESIGN §5). 어느 그림인지는 영웅이 **태어날 때 굴려 세이브에 박은 `face`** 가 정한다
 * (2026-09-06 — 옛 판은 이름 해시였다. `mock.heroFace` · DEV_PLAN 부채 #36).
 * 죄종 색은 카드 상단 테두리가 들고 초상은 색을 갖지 않는다. 크기는 담는 카드의 CSS 가 정한다.
 *
 * 글리프를 **밑에 깔고 그림을 그 위에 덮는다** — 고른 얼굴 스타일에 영웅 그림이 없으면 `onerror` 로 img 만
 *   사라지고 밑의 글리프가 드러난다 (몬스터 얼굴과 같은 규칙 · mock.js FACE_STYLES).
 */
// 밑에 아무것도 깔지 않는다 (2026-09-03 사용자 지시) — 옛 판은 직업 글리프를 깔고 그림을 위에 덮었는데,
//   그림이 배경 투명 PNG 라 여백 사이로 이모지가 비쳤다. 그림이 없거나 `onerror` 로 빠지면 **빈 칸**이다
const heroFace = h => {
    const src = M.heroFace(h);
    const name = L(h.name);
    return `<span class="hero-face">${src
        ? `<img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()">` : ''}</span>`;
};
/* 스킬 아이콘 그림 — 어느 그림인지는 `mock.skillIcon` 이 id 에서 정한다 (SCREEN_DESIGN §2 · heroFace 와 같은 문법).
   파일이 없으면 `onerror` 로 img 만 빠지고 칸이 빈다 — 밑에 이모지를 안 깐다(영웅 초상과 같은 이유 · 2026-09-03) */
const skillImg = s => {
    const src = M.skillIcon(s?.id);
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : '';
};
/* 아이템 그림 — 방어구는 **임시로 부위당 한 장** (SCREEN_DESIGN §2 · 규칙은 `mock.itemArt` 한 곳).
   무기는 무기군 그림이되 **양손검·도끼는 베이스 7장 중 하나**를 든다. 개체가 `weapon_base.csv` 로 실제 그 베이스를
   굴렸으면(`item.baseId` · 2026-09-10 · game_logic/item.js) **그 그림**이고, 이름도 같은 베이스로 이미 붙어 있다 —
   그림과 이름이 어긋나지 않는다. `baseId` 가 없는 옛 개체(이 기능 전에 드롭된 것)만 `uid` 해시로 예전처럼 고른다.
   그림이 없는 부위(투구·목걸이)는 부위 이모지로 떨어진다 — 부위는 스킬과 달리 해시 폴백을 안 쓴다(틀린 그림 = 틀린 정보) */
const itemImg = it => {
    const src = M.itemArt(it?.slot, it?.group, it?.uid, it?.baseId);
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : (slotDef(it?.slot)?.icon ?? '');
};

/* ═══════════ 화면 상태 ═══════════ */

// 탭 10 — **이미지 도감이 도감 안으로 들어갔다** (SCREEN_DESIGN §1 개정 2026-09-08 사용자 지시 · §9 · §9-1).
// 탭 둘이 도감 하나가 되고 그 안에서 세그먼트 넷(몬스터 · 캐릭터 · 아이템 · 스킬)으로 갈린다 — **움직인 탭은 없고** 도움말이 한 칸 당겨졌다.
// 그 앞은 탭 11(09-06 이미지 도감 신설) · 탭 10 — 마을이 자원·탐험으로 갈렸다 (§1 개정 2026-09-04). 순서는 그 지도와 같다:
// 원정 → 캐릭터 → 강화가 코어 루프의 **한 동작**이라 앞에 붙어 서고(줍고 → 배분하고 → 올린다 — GAME_DESIGN §3),
// 보충(선술집 · 상점)이 그 뒤, 맡기고 나가는 둘(자원 · 탐험)이 그 뒤, 그 산출을 먹는 연구가 이어지고, 참조 둘(도감 · 도움말)이 끝이다.
// 09-03 순서에서 실제로 움직인 것은 **캐릭터 하나(6번 → 2번)** 다 — 나머지는 상대 순서가 유지된 채 마을 자리에 자원·탐험이 들어갔다.
// 탭 이름은 활동(강화 · 상점)이고 패널 머리는 장소(제련소 · 상단 — `dp.post.*`)로 남는다 (§8-2 · §8-3).
// 의뢰 탭은 폐지 — 게시판은 선술집 탭 안이다(§8-1). 스킬은 캐릭터 안의 **창**(§7).
// 참조는 다시 둘이다 — 도감과 이미지 도감이 둘 다 「결정을 안 받는 조회 화면」이라 탭을 나눌 갈림이 아니었다 (§9).
// `?tab=` 이 죽은 이름(`town` · `commission` · `skill` · `base` · `imagedex`)을 받으면 조용히 무시된다(아래 TABS.includes) — 탭으로는 도달할 자리가 없기 때문
const TABS = ['expedition', 'character', 'forge', 'tavern', 'shop', 'resource', 'explore', 'research', 'codex', 'help'];

/* 파견 목록 — **카드 3** (SCREEN_DESIGN §8 개정 2026-09-04 사용자 지시: 채광 · 채집 · 벌목).
   담당 능력치는 여기 적지 않는다: `hero_attribute.csv:dispatch` 가 능력치 → 파견처를 이미 들고 있어서
   화면이 배정표를 또 가지면 CSV 와 갈린다. `postAttr()` 가 그 열을 거꾸로 읽는다.
   ⚠ 탐험은 기획에서 **파견처가 아니고**(base_expedition §2-2) 「열린 파견처 수 = 동시 파견 상한」에도 안 들어간다 —
   **탭이 되어도 그대로 유효**하다. 09-01 에 「화면에서만 나란히 선다」였던 것이 화면에서도 갈라졌을 뿐이다 (§1 · §8-4).
   셋 다 1인 배치라 `party` 플래그를 쓰는 항목이 없다 — 인원 표기 자체는 계속 찍는다 (§8).
   ⚠ **`mine` 은 옛 장소 id 그대로다** — 화면 라벨만 「채광」(활동)이 됐고, `hero_attribute.csv:dispatch` 가
   `mine` 을 값으로 들고 있어 `postAttr('mine')` 이 그 열을 읽는다. 키 리네임은 CSV 동반 수정이라 별건이다.
   ⚠ **`log`(벌목)는 화면이 기획을 앞서간 자리였다** — 2026-09-10 로 기획이 따라잡았다(base_expedition §2-2).
   `tiers` = 단계 표를 든 `D` 필드 이름. **셋 다 표가 있다** [2026-09-10] — `mine_node` · `gather_node` · `log_node`
   가 같은 모양이고, 조립이 산출물 이름을 `yield*` 한 이름으로 모아 줘서 여기 필드 이름만 적으면 붙는다 (§8) */
const POSTS = [
    { id: 'mine', label: 'dp.post.mine', tiers: 'mineNodes' },
    { id: 'gather', label: 'dp.post.gather', tiers: 'gatherNodes' },
    { id: 'log', label: 'dp.post.log', tiers: 'logNodes' },
];

/* 시작 파티 후보의 기준 시드 — 고정값이라 같은 리롤 횟수면 언제나 같은 3명 (결정론 확인용).
   마스터 시드(전투·드롭)는 확정 시각으로 찍는다 — 플레이마다 다른 전투, 같은 세이브 안에선 같은 전투. */
const ROLL_SEED = 20260824;

/* 진형 템플릿 (⚠ 목업 · SCREEN_DESIGN §4-1) — 키 = 버튼 글자, 값 = 랭크별 정원.
   정원 합은 전부 3(= balance.csv:party_size_max)이라 파티 전원이 언제나 들어간다.
   기획 미확정이라 CSV(SSOT)로 안 간다 — 여기 값이 굳으면 확정으로 읽힌다 */
/* ⚠ Map 이다 — 평범한 객체면 `'3'` 이 **배열 인덱스꼴 키**라 순서가 맨 앞으로 튄다(JS 키 순서 규칙).
   화면의 아이콘 순서가 곧 이 순서라 삽입 순서를 그대로 지키는 그릇이 필요하다 */
// ~~FORM_TPLS~~ 는 2026-09-09 삭제 — 정원은 `formation_template.csv` 가 들고 `game.formationState` 가 준다.
//   진형이 실물이 되면서(battle_design §3-1) 화면이 규칙을 들고 있을 이유가 없어졌다
/* 랭크 수가 라벨을 정한다 — 두 줄이면 전열·후열, **한 줄(3)이면 전열 하나**(뒤가 없으니 나눌 것도 없다).
   랭크 최대가 둘이라 보드 높이는 두 줄분으로 고정된다 (SCREEN_DESIGN §4-1 · 「패널 크기는 상태에 흔들리지 않는다」 2026-08-28) */
const FORM_RANK_LABELS = { 1: ['exp.form.front'], 2: ['exp.form.front', 'exp.form.back'] };

const state = {
    screen: 'start',        // start | game
    tab: 'expedition',
    exp: 'idle',            // idle | battle | report
    btLayout: 'wide',       // 관전 배치 — wide | split (2026-09-03 사용자 지시). 세이브 아님
    heroUid: null,
    codexChapter: 1,
    expChapter: null,       // 원정에서 보고 있는 챕터 — `null` 이면 「다음에 갈 곳」으로 자동 (ADR-0067)
    // 도감 세그먼트 (SCREEN_DESIGN §9) — monster | character | item | skill. 09-08 에 이미지 도감이 흡수되며 값이 둘에서 넷이 됐다.
    // 얼굴 스타일은 여기 안 둔다 — 전역이다(`?face=` · localStorage · mock.js:setFaceStyle)
    codexSeg: 'monster',
    bagTab: 'equip',              // 가방의 최상위 축 — 'equip' | 'material' (ADR-0055)
    roll: 1, candidates: [], confirmOverwrite: false,
    salvageMode: false,
    // 리포트 (SCREEN_DESIGN §4-3 · ADR-0063) — 왼쪽 목록에서 고른 줄(0 = 최신)과 그 화면 전용 분해 모드.
    // 가방의 `salvageMode` 와 **따로 둔다** — 한 쪽을 켜 두고 다른 탭에 갔다가 오클릭하는 사고를 막는다
    repRun: 0, repSalvage: false,
    searchUid: null,             // 수색 칸에서 고른 영웅 — 보내면 비운다 (SCREEN_DESIGN §8-1)
    forgeSeg: 'up',              // 제련소 세그먼트 — craft | up (SCREEN_DESIGN §8-2)
    forgeItem: null,             // 제련소에서 고른 장비 uid
    forgeFilter: null,           // 제련소 목록의 부위 필터 — 캐릭터 탭과 따로 둔다(화면이 다르면 필터도 다르다)
    flash: null,            // {key, params} — 다음 render 한 번만 보인다
    battle: null,           // {result, stageId} — 관전 재생 중인 전투
    // 편성 패널이 연 스테이지 (SCREEN_DESIGN §4-1) — null 이면 패널이 없다. 지역을 눌러야 열린다(자동으로 열지 않는다)
    expStage: null,
    // 반복 의사 — G.run.repeat 은 「진행 중인 런」의 값이라 출발 **전에는** 쓸 곳이 없다. 화면이 들고 있다가 출발할 때 런에 옮긴다
    expRepeat: false,
    // 진형 목업 (SCREEN_DESIGN §4-1) — 템플릿 + 랭크별 uid. 기획 미확정이라 세이브·전투에 안 실린다 (화면 상태뿐)
    // 탭 위에 겹쳐 뜨는 창 (SCREEN_DESIGN §2 창 레이어) — null | 'skill'. 한 번에 한 장만 뜬다
    modal: null,
    // 프롤로그가 보여 주는 씬 번호 (SCREEN_DESIGN §3-1) — 0 부터. 세이브에 안 들어간다
    proScene: 0,
    // 자원 탭에서 열려 있는 파견처 (§8) — 들어오면 첫 칸(광산)이 골라져 있다. 비워 두면 첫 화면이 빈다
    post: 'mine',
};
let stopBattle = null;

const rollCandidates = () => SYS.hero.rollStartParty(makeRng(ROLL_SEED + state.roll), D.balance.party_size_max);
const flash = (key, params) => { state.flash = { key, params }; };

/* ═══════════ 셸 ═══════════ */

function renderShell() {
    // 프롤로그도 시작 화면과 같은 셸이다 (§3-1) — 탭 바도 자원 띠도 없다. 게임 화면은 'game' 하나뿐
    const pre = state.screen !== 'game';
    $('#app').classList.toggle('pregame', pre);

    const nav = $('.nav');
    nav.innerHTML = '';
    if (!pre) for (const id of TABS) {
        const b = el('button', id === state.tab ? 'on' : '', t(`nav.${id}`));
        b.onclick = () => { state.tab = id; render(); };
        nav.appendChild(b);
    }
    if (!pre) {
        // 세이브가 있으면 부팅이 곷장 게임으로 들어오므로, 시작 화면(새 게임·덮어쓰기)으로 돌아가는 문은 여기 하나다
        const nb = el('button', 'b-newgame', t('ng.h'));
        nb.onclick = () => { state.screen = 'start'; state.confirmOverwrite = false; render(); };
        nav.appendChild(nb);
    }

    const r = G?.resources;
    $('.resources').innerHTML = pre || !r ? '' : `
        <span>${t('res.gold')}<b>${r.gold.toLocaleString()}</b></span>
        <span>${t('res.dust')}<b>${r.dust}</b></span>
        <span>${t('res.stigma')}<b>${r.stigma}</b></span>`;

    const langBtn = el('button', 'btn sm lang-btn', t('ui.langBtn'));
    langBtn.onclick = () => { setLang(lang() === 'ko' ? 'en' : 'ko'); render(); };
    $('.resources').appendChild(langBtn);

    $('.crumb').textContent = state.screen === 'prologue' ? t('pro.h') : pre ? t('ng.h') : t(`nav.${state.tab}`);
    $('.tab-seg').innerHTML = '';   // 탭 세그먼트 자리 — 채우는 것은 탭 렌더러다 (§2 · 지금은 원정만)
}

function render() {
    // 숨긴 탭은 그리지 않는다 — 보는 사람이 없다. 시계는 앱이 계속 밀고, 돌아오는 순간 한 번 그린다(`onVisibility` · ADR-0102)
    if (document.hidden) return;
    // 관전 중 재렌더(가방 클릭 · 언어 전환 · 세그먼트 이동)면 재생 위치를 받아 뒀다가 다음 mount 에 넘긴다 — 처음부터 다시 틀지 않는다 (2026-08-27)
    if (stopBattle) { const pos = stopBattle(); if (state.battle) state.battle.resume = pos; stopBattle = null; }
    stopRepLive?.();      // 리포트의 실시간 표도 같은 자리에서 끈다 (재생 위치는 state.battle.resume 에 남는다)
    applyDocumentLang();
    M.applyDocumentFace();
    if (G) {
        if (!heroById(state.heroUid)) state.heroUid = G.heroes[0]?.uid ?? null;
    }
    renderShell();
    const main = $('.main');
    // 박스 안 스크롤 위치 — 다시 그려도 남는다 (SCREEN_DESIGN §2 「박스」 · ADR-0097). 박스는 매번 새로 서므로 `data-keep` 이름으로 되찾는다
    const kept = new Map([...main.querySelectorAll('[data-keep]')].map(n => [n.dataset.keep, n.scrollTop]));
    main.innerHTML = '';
    if (state.screen === 'prologue' && G) renderPrologue(main);
    else if (state.screen === 'start' || !G) renderStart(main);
    else ({
        // 키 순서 = 탭 바 순서 (TABS) — 읽는 사람이 화면과 대조할 수 있게 맞춰 둔다
        expedition: renderExpedition,
        character: renderCharacter,
        forge: renderForge,
        tavern: renderTavern,
        shop: renderShop,
        resource: renderResource,
        explore: renderExplore,
        research: renderResearch,
        codex: renderCodex,
        help: renderHelp,
    })[state.tab](main);
    if (state.flash) {
        main.prepend(el('div', 'flash', t(state.flash.key, state.flash.params)));
        state.flash = null;
    }
    for (const n of main.querySelectorAll('[data-keep]')) if (kept.has(n.dataset.keep)) n.scrollTop = kept.get(n.dataset.keep);
    renderModal();
    hideTip();
}

/**
 * 창 레이어 (SCREEN_DESIGN §2 · §7) — 탭 위에 겹쳐 뜨는 판 하나. 한 번에 한 장만 뜬다.
 * **닫는 길이 셋**인 이유는 창이 화면을 덮기 때문이다: 닫기 버튼 · 판 바깥 클릭 · `Esc`(bindEsc).
 * 창 안에서 랭크를 찍으면 render() 가 통째로 다시 돌지만 `state.modal` 이 남아 있어 **창은 열린 채**다 (§7).
 */
const MODALS = {
    skill: { title: 'nav.skill', body: skillTreeBody },
    // 해고 — 되돌릴 수 없어서 두 번 누르게 한다 (SCREEN_DESIGN §3 · §6). 대상 영웅은 캐릭터 탭이 이미 골랐다
    dismiss: { title: 'ch.dismiss', body: dismissBody },
    /* 출정 — 스테이지를 누르면 뜨는 창 [2026-09-10 사용자 지시 · ADR-0084 · SCREEN_DESIGN §4-1].
       옛 접이식 전진 패널이 통째로 이 창이 됐다. `head` 를 주는 첫 창이다 — 제목이 i18n 키 하나가 아니라
       **고른 스테이지의 신원**(죄종 · Ch-스테이지 이름 · 위험도 · 소요 · 원소)이기 때문이다:
       접이식이 바로 위 행에 붙어 말하던 「어느 지역의 편성인가」를 창에서는 머리가 든다 */
    depart: { head: departHead, body: departBody, cls: 'depart-box' },
};

function renderModal() {
    const layer = $('#modal');
    const m = MODALS[state.modal];
    layer.hidden = !m;
    layer.innerHTML = '';
    if (!m) return;
    // `cls` — 판 크기를 창이 정한다(안 주면 내용 폭). 로그 창(.bw-box)이 같은 자리에서 쓰던 장치다
    const box = el('div', `modal-box${m.cls ? ` ${m.cls}` : ''}`);
    const head = el('div', 'modal-head');
    // `head` 를 주면 제목 줄을 통째로 갈아 끼운다 — 안 주면 i18n 키 하나가 든다(창 대부분이 이쪽이다)
    head.appendChild(m.head ? m.head() : el('h2', '', t(m.title)));
    // 닫기는 **정사각 X 하나**다 — 모든 창에 같은 모양·같은 자리 (2026-09-01 사용자 지시 · SCREEN_DESIGN §2).
    // 글리프는 언어를 안 타므로 `ui.close` 는 title 로 간다 — 문구가 사라진 게 아니라 자리를 옮겼다
    const x = el('button', 'btn modal-x', '×');
    x.title = t('ui.close');
    x.setAttribute('aria-label', t('ui.close'));
    x.onclick = closeModal;
    head.appendChild(x);
    box.appendChild(head);
    box.appendChild(m.body());
    layer.appendChild(box);
    /* 판 **바깥**을 눌렀을 때만 닫는다 — 판 안의 클릭이 올라와도 닫히면 랭크 한 번 찍고 창이 사라진다.
       ⚠ **누른 자리와 뗀 자리가 둘 다 바깥**이어야 한다 [2026-09-10] — 클릭 하나만 보면 **판 안에서 시작한 드래그**가
       바깥에서 끝났을 때 창이 닫힌다(진형 드래그가 빗나가면 창째 사라졌다). 시작점을 기억해 두고 둘을 맞춰 본다 */
    let downOnLayer = false;
    layer.onpointerdown = e => { downOnLayer = e.target === layer; };
    layer.onclick = e => { if (e.target === layer && downOnLayer) closeModal(); };
}

const closeModal = () => { state.modal = null; render(); };
const openModal = id => { state.modal = id; render(); };

/** 세그먼트 버튼 묶음 — items: {id, label, disabled?} */
function segmented(items, current, onPick) {
    const box = el('div', 'segmented');
    for (const it of items) {
        const b = el('button', `btn sm${it.id === current ? ' on' : ''}`, it.label);
        if (it.disabled) b.disabled = true;
        // `color` 를 준 항목만 무채색 기본을 덮는다 [2026-09-09 사용자 지시] — 지금 주는 곳은 **챕터 세그먼트** 둘뿐이고,
        //   「기본은 무채색이되 **챕터 줄**은 죄종 색으로 덮는다」(style.css `.sin-chip` 주 · 2026-09-03)를 그대로 따른 것이다.
        //   고른 칸은 **테두리까지** 그 색이라 「어느 죄종인가」와 「어디를 보고 있나」가 한 칸에서 같이 읽힌다
        if (it.color) {
            b.style.color = it.color;
            if (it.id === current) b.style.borderColor = it.color;
        }
        b.onclick = () => onPick(it.id);
        box.appendChild(b);
    }
    return box;
}

/* ═══════════ 새 게임 · 이어하기 ═══════════
   랜덤 영웅 3명 + 무제한 리롤 → 확정하면 그 셋이 곧 로스터·파티. 세이브가 있으면 이어하기가 먼저 보인다. */

/**
 * 새 게임 — 세이브를 먼저 쓰고, `prologue` 를 주면 화면만 프롤로그에 세운다 (SCREEN_DESIGN §3-1).
 * 기본값이 꺼짐인 이유는 **개발용 경로**다 — ?dev=battle 같은 길이 프롤로그에서 멈추면 헤드리스 검증이 막힌다.
 */
function startGame({ prologue = false } = {}) {
    clearSave();
    G = SYS.game.newGame(now() >>> 0, state.candidates, now());
    save();
    state.screen = prologue ? 'prologue' : 'game';
    state.proScene = 0;
    state.tab = 'expedition'; state.exp = 'idle'; state.confirmOverwrite = false; state.expStage = null;
    render();
}

function continueGame() {
    const saved = loadSave();
    if (!saved) return false;
    try { G = SYS.game.deserialize(saved); }
    catch (e) { console.warn(e); G = null; return false; }
    // 반복 원정은 게임이 켜져 있는 동안만 — 꺼진 사이의 런은 마무리하고, 그것이 곧 귀환이라 전원 회복한다 (08-25 · 09-03)
    if (SYS.game.closeRun(G, now())) save();
    state.screen = 'game'; state.tab = 'expedition'; state.exp = 'idle'; state.expStage = null;
    return true;
}

/** 후보 한 장 — 이 카드가 곧 선택의 전부라 능력치 7종까지 다 편다 */
function candidateCard(h, extra = '') {
    const c = el('div', 'ng-card');
    c.style.borderTopColor = tierColor(h);
    const min = D.balance.hero_attr_min, max = D.balance.hero_attr_max;
    const total = D.heroAttributes.reduce((a, s) => a + h.stats[s.id], 0);
    const bars = D.heroAttributes.map(s => {
        const v = h.stats[s.id];
        const pct = Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
        return `<div class="attr-row">
            <span class="attr-n">${L(s)}<i class="cs-a">${s.abbr}</i></span>
            <span class="attr-bar"><i style="width:${pct}%;background:${tierColor(h)}"></i></span>
            <span class="attr-v">${v}</span>
        </div>`;
    }).join('');
    // 액티브 3칸 중 **고유 하나만** 싣는다 (§3) — 2·3번 칸은 직업이 정하므로 직업 줄이 이미 답한다.
    //   어느 칸이 고유인지는 인스턴스의 `source` 가 말한다 — 화면이 「1번 칸」이라고 판정하지 않는다
    const innate = activeCells(h).find(a => a?.source === 'innate') ?? null;
    c.innerHTML = `
        <div class="ng-head">
            ${heroFace(h)}
            <div class="ng-id">
                <div class="ng-chips">${tierChip(h)}<span class="sin-chip">${sinName(h.sin)}</span></div>
                <div class="ng-name"><b>${L(h.name)}</b></div>
                <div class="ng-cls">${className(h.cls)} · Lv.${h.level}</div>
                <div class="ng-role muted">${classLine(h.cls)}</div>
                ${innate ? `<div class="ng-skill">
                    <span class="ico">${skillImg(innate)}</span>
                    <span class="txt"><i class="tag">${t('sk.innate')}</i><b>${L(innate.name)}</b>
                        <i class="cd">${secText(coolSecOf(innate.id))}</i></span>
                </div>` : ''}
            </div>
        </div>
        <div class="attr-list">${bars}</div>
        <div class="ng-line sep"><span>${t('st.maxhp')}</span><b>${D.balance.hero_hp_base}</b></div>
        <div class="ng-line"><span>${t('ng.total')}</span><b>${total}</b></div>
        ${extra}`;
    // 툴팁은 관전·캐릭터 탭과 **같은 카드**다 (이름 · 표기 쿨 · 설명) — 카드 본문은 아이콘과 이름만 든다.
    //   행동 주기는 안 넘긴다 — 후보는 아직 무기가 없어(시작 무기는 `newGame` 이 준다) 실효 쿨이 뜻을 못 가진다.
    //   시작 화면은 `G` 자체가 없어 `cycleOf` 를 부를 수도 없다 (`heroCombat(G, h)`)
    const skillNode = c.querySelector('.ng-skill');
    // 후보는 아직 무기가 없어 주기도 공격력도 모른다 — 피해 자리가 **식**으로 접힌다. 능력치는 안다 — 슬롯이 미는
    //   나머지 숫자(타수 · 효과값 · 지속 …)는 값을 찍는다 (SCREEN_DESIGN §2 「스킬 설명창 규격」 · ADR-0089)
    if (skillNode) bindTipNode(skillNode, () => skillTipCard(innate, { source: 'innate', stats: h.stats }));
    return c;
}

function renderStart(main) {
    const wrap = el('div', 'ng-wrap');
    const saved = loadSave();

    const head = el('div', 'ng-title');
    head.innerHTML = `<h1>${t('ng.title')}</h1>`;
    wrap.appendChild(head);

    if (saved) {
        const box = el('div', 'ng-continue');
        // 열 수 있는가는 `deserialize` 가 정한다 — 화면이 버전 숫자로 판정하면 이관 가능한 세이브를 거부한다
        const old = !SYS.game.canLoad(saved);
        box.innerHTML = `
            <div class="l">${t('ng.hasSave', { t: new Date(saved.savedAt).toLocaleString() })}
                <small${old ? ' class="down"' : ''}>${old
                    ? t('ng.oldSave', { v: saved.version })
                    : t('ng.saveLine', { h: saved.heroes.length, c: saved.progress.cleared.length, g: saved.resources.gold.toLocaleString() })}</small></div>
            ${old ? '' : `<button class="btn primary b-continue">${t('ng.continue')}</button>`}`;
        const cb = box.querySelector('.b-continue');
        if (cb) cb.onclick = () => { if (continueGame()) render(); };
        wrap.appendChild(box);
    }

    const row = el('div', 'ng-row');
    for (const h of state.candidates) row.appendChild(candidateCard(h));
    wrap.appendChild(row);

    const actions = el('div', 'ng-actions');
    const reroll = el('button', 'btn', t('ng.reroll'));
    reroll.onclick = () => { state.roll++; state.candidates = rollCandidates(); state.confirmOverwrite = false; render(); };
    // 세이브가 있으면 두 번 눌러야 지운다 — 되돌릴 수 없는 행동은 한 번의 오클릭으로 일어나면 안 된다
    const start = el('button', `btn lg ${saved ? 'danger' : 'primary'}`,
        saved ? t(state.confirmOverwrite ? 'ng.overwriteConfirm' : 'ng.overwrite') : t('ng.start'));
    start.onclick = () => {
        if (saved && !state.confirmOverwrite) { state.confirmOverwrite = true; render(); return; }
        // 파티 확정 = 캐릭터 생성. 여기서만 프롤로그를 지난다 (§3-1) — 이어하기는 안 지난다
        startGame({ prologue: true });
    };
    actions.appendChild(el('span', 'ng-count muted', t('ng.roll', { n: state.roll })));
    actions.appendChild(reroll);
    actions.appendChild(start);
    wrap.appendChild(actions);
    main.appendChild(wrap);
}

/* ═══════════ 원정 (편성 · 전투 · 리포트) ═══════════ */

/** 원정 1회 — 정산은 즉시, 관전은 재생. instant 면 재생을 건너뛰고 리포트로 */
/**
 * 출발 — `at` 은 출발 시각(기본 지금), `resume` 은 새 런의 재생 위치.
 * 앱 시계가 반복을 한 눈금 안에서 이어 세울 때 둘을 넘긴다 — 앞 런이 끝난 순간에 출발했고, 배속 · 판 · 창을 잇는다 (ADR-0102)
 */
function runBattle(stageId, { instant = false, tab = null, at = null, resume = null } = {}) {
    const r = SYS.game.resolveBattle(G, stageId, at ?? now());
    if (!r.ok) {
        flash({ locked: 'exp.locked', noParty: 'exp.noParty' }[r.err] ?? 'exp.cantDepart');
        state.exp = 'idle'; render(); return;
    }
    state.repRun = 0;          // 새 런은 목록 맨 위에 들어온다 — 고른 줄을 거기로 옮긴다 (§4-3)
    // 반복 의사를 이번 런에 옮긴다 — resolveBattle 은 같은 스테이지 재출발일 때만 옛 값을 잇는다
    if (G.run && stageId === state.expStage) G.run.repeat = state.expRepeat === true;
    save();
    // instant(개발용)는 관전을 건너뛰므로 onEnd 가 없다 — 귀환 판정을 여기서 같이 한다
    if (instant) {
        save();   // ~~귀환 판정(returnToTown)~~ 은 2026-09-08 삭제 — 귀환이 회복할 것이 없다
        state.battle = null; state.exp = 'report'; render(); return;
    }
    // tab — 개발용 ?dev=play&bt=dmg: 로그 창을 누적 데미지 판으로 **열어** 헤드리스가 클릭 없이 닿게 한다 (2026-09-03: 창이 됐으므로 win 도 같이 넘긴다)
    // form — 진형을 **출발 순간에 찍는다** (2026-09-09). 관전 아레나가 이 값으로 파티 카드를 위아래로 민다
    // 옛 런의 재생기는 여기서 걷는다 — 두면 다음 render() 첫 줄이 **그 재생 위치를 새 런에 덮어써** 새 런이 옛 런이 끝난 시각부터
    //   재생됐다(2026-09-11 실측 — 앞 194초를 건너뛰었다 · ADR-0102). 이어 받을 것(배속 · 판 · 창)은 부르는 쪽이 `resume` 으로 넘긴다
    if (stopBattle) { stopBattle(); stopBattle = null; }
    state.battle = { result: r.result, at: r.report.at, stageId, form: formSnapshot(),
        resume: resume ?? (tab ? { t: 0, speed: 1, running: true, tab, win: true } : undefined) };
    state.exp = 'battle';
    render();
}

function renderExpedition(main) {
    // 화면 전환(편성·지역 / 전투 관전 / 리포트)은 **상단바** crumb 오른쪽에 선다 [2026-09-11 사용자 지시 · ADR-0094 가 ADR-0016 을 대체].
    // 세 화면이 같은 자리를 쓴다. `state.exp` 가 확정된 뒤에 부른다 — 고른 칸 표시가 실제 화면과 어긋나지 않게
    const expNav = () => $('.tab-seg').appendChild(segmented([
        { id: 'idle', label: t('exp.seg.idle') },
        { id: 'battle', label: t('exp.seg.battle'), disabled: !state.battle },
        { id: 'report', label: t('exp.seg.report'), disabled: !G.reports.length },
    ], state.exp, id => { state.exp = id; render(); }));

    if (state.exp === 'battle' && state.battle) {
        expNav();
        const { result, stageId } = state.battle;
        /* 관전 화면 한 장 [2026-09-11 사용자 지시 · ADR-0095 · ADR-0097] — 전투 판 + 가방이 박스(`.page`) 세로를 채운다.
           두 배치 다 아레나가 남는 세로를 먹고 가방 아랫변이 박스 끝(탭 내비 「새 게임」 줄 아랫변)에 붙는다 (style.css `.bt-page`) */
        const page = el('div', 'bt-page page');
        main.appendChild(page);
        stopBattle = mountBattle(page, {
            result, stageId, heroes: G.heroes, repeat: G.run?.repeat === true, resume: state.battle.resume,
            // 진형 (⚠ 목업 · SCREEN_DESIGN §4-1) — 출발 순간에 찍은 스냅샷이다. 재생기는 이 값으로 **자리만** 민다
            form: state.battle.form,
            // 관전 배치 — 'wide'(아레나 전폭 + 로그 창) / 'split'(옛 구조: 좁은 아레나 + 우측 딜미터 열).
            // 재생 위치(resume)가 아니라 **취향**이라 화면 상태가 든다 — 런이 바뀌어도 남고, 세이브에는 안 들어간다
            layout: state.btLayout, onLayout: v => { state.btLayout = v; },
            now, frozenMs: FROZEN_GAP_MS,   // 시각은 실제로 흐른 시간이 민다 · 문턱을 넘은 공백은 밀지 않는다 (ADR-0102)
            onEnd: auto => {
                // 재생기를 먼저 걷는다 — 반복으로 이어지는 런은 배속 · 판 · 창을 잇고 시각만 0 에서 시작한다 (§4 · ADR-0102)
                const pos = stopBattle ? stopBattle() : state.battle?.resume;
                stopBattle = null;
                if (auto && G.run?.repeat && result.won) runBattle(stageId, { resume: { ...pos, t: 0, wall: now(), auto: false } });
                // 반복이 안 이어지면 출정이 끝난 것이다 — ~~아웃된 영웅을 낫게 하는 일~~ 은 2026-09-08 폐기(§1-1 개정)
                else { if (state.battle) state.battle.resume = { ...pos, auto: false }; save(); state.exp = 'report'; render(); }
            },
        });
        // 아레나 아래 가방 — 접속 중 = 원정 전투 + 아이템 정리 (GAME_DESIGN §3). 정산은 출발 순간 끝났으므로 여기서 정리해도 이 전투는 안 바뀐다
        // 칸 · 그림 크기는 캐릭터 탭 가방과 같다 (`.bag` · ADR-0097)
        page.appendChild(itemsPanel(heroById(state.heroUid), { showTarget: true }));
        return;
    }
    if (state.exp === 'report' && G.reports.length) { expNav(); return renderExpReport(main); }
    state.exp = 'idle';
    expNav();
    renderExpIdle(main);
}

/** 파티에 넣고 뺀다 — 편성 화면 영웅 띠의 클릭 (2026-08-27, 옛 파티·벤치 행을 띠가 대신한다) */
const toggleParty = h => {
    const r = SYS.game.toggleParty(G, h.uid, now());
    if (!r.ok) flash({ full: 'exp.partyFull', searching: 'exp.searching' }[r.err] ?? 'exp.partyFull');
    else save();
    render();
};

/** 재접속 알림 — 반복 원정은 게임이 켜져 있는 동안만 돈다. 꺼진 사이의 런은 마무리됐고 결과는 마지막 리포트에 있다 */
function noticeBanner() {
    const n = G.notice;
    if (!n) return null;
    const box = el('div', 'notice-box');
    const stage = D.stages[n.stageId];
    box.innerHTML = `
        <span class="t">${t(`exp.notice.${n.kind}.h`)}</span>
        <span class="b">${t(`exp.notice.${n.kind}.body`, { stage: stage ? `Ch${stage.chapter}-${stage.stage_num} ${L(stageName(stage))}` : '' })}</span>
        ${G.reports.length ? `<button class="btn sm b-report">${t('exp.notice.report')}</button>` : ''}
        <button class="btn sm b-ok">${t('exp.notice.dismiss')}</button>`;
    const rb = box.querySelector('.b-report');
    if (rb) rb.onclick = () => { SYS.game.dismissNotice(G); save(); state.exp = 'report'; render(); };
    box.querySelector('.b-ok').onclick = () => { SYS.game.dismissNotice(G); save(); render(); };
    return box;
}

/** 원정에서 볼 챕터 — 고른 것이 있으면 그것, 없으면 **다음에 갈 곳**(해금됐고 안 깬 첫 스테이지)의 챕터.
 *  그것도 없으면(전부 깼다) **마지막 해금 챕터**다. 탭을 열면 지금 하는 자리에 선다 (ADR-0067) */
function expChapter() {
    const ids = D.chapterList.map(c => c.id);
    if (ids.includes(state.expChapter)) return state.expChapter;
    const unlocked = D.stageList.filter(s => SYS.game.stageUnlocked(G, s.stage_id));
    const next = unlocked.find(s => !G.progress.cleared.includes(s.stage_id));
    return (next ?? unlocked[unlocked.length - 1])?.chapter ?? ids[0];
}

function renderExpIdle(main) {
    const nb = noticeBanner();
    if (nb) main.appendChild(nb);

    /* ⚠ **영웅 띠는 여기 없다** [2026-09-10 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0085 가 ADR-0055 를 대체].
       원정에서 로스터가 서는 자리는 **출정 창 안** 하나다(`departBody`). 탭 최상단에 두던 판을 걷은 이유는
       거기서 **아무 결정도 안 끝나기 때문**이다 — 갈 곳이 안 정해진 편성은 결정이 아니고, 창이 그 둘(누구를 · 어디로)을
       한 판에서 받는다. 걷힌 만큼 이 화면은 **스테이지 목록 하나**가 된다 — 「어디를 갈지 먼저」(2026-08-27)의 원형이다.
       ⚠ 관전·리포트에 안 세우던 옛 규칙은 그대로다 — 그 둘은 전투 화면만 본다.
       스테이지 — **고른 챕터 하나**만 (ADR-0067). 그 안의 잠긴 스테이지도 그린다 */
    // 제목 줄이 없다 [2026-09-11 사용자 지시 · ADR-0094] — 화면 전환은 상단바로 올라갔고, 「원정 지역」은 crumb · 챕터 줄 · 행이 이미 말한다.
    // 패널의 첫 줄은 챕터 세그먼트다 (`exp.zones.h` 는 도움말이 계속 부른다)
    const zp = el('div', 'panel');
    /* 챕터 세그먼트 — **한 챕터가 한 화면**이다 [2026-09-09 사용자 지시 · ADR-0067 · 도감 몬스터 세그먼트와 같은 문법(§9)].
       **전 챕터가 선다** — 잠긴 챕터도 눌러 볼 수 있다. 이 절이 원래부터 잠긴 스테이지를 그리는 근거
       (「어디까지 가야 하는지가 보여야 한다」)를 챕터 단위로 넓힌 것이고, 막는 자리는 **보내기**(`canDepart`) 하나다.
       넘기면 **전진 패널을 닫는다** — 패널은 스테이지 행에 딸려 있어서, 안 닫으면 영웅 띠만 흐린 채 보드가 사라진다 */
    const curCh = expChapter();
    const cb = el('div', 'sub-bar');
    cb.appendChild(segmented(D.chapterList.map(c => ({ id: c.id, label: `Ch${c.id} ${L(c.name)}`, color: sinColor(c.sin) })), curCh,
        id => { state.expChapter = id; state.expStage = null; render(); }));
    zp.appendChild(cb);
    const rows = D.stageList.filter(s => s.chapter === curCh);   // 잠긴 스테이지도 보인다 — 어디까지 가야 하는지가 보여야 한다
    for (const z of rows) {
        const unlocked = SYS.game.stageUnlocked(G, z.stage_id);
        const cleared = G.progress.cleared.includes(z.stage_id);
        const chapterBoss = z.boss_grade === 'chapter_boss';
        const sin = chapterOf(z.chapter)?.sin ?? 'wrath';
        const bg = stageBgOf(z.stage_id);
        const row = el('div', `zone${unlocked ? '' : ' locked'}${chapterBoss ? ' boss' : ''}${z.stage_id === state.expStage ? ' on' : ''}`);
        row.style.borderLeftColor = unlocked ? sinColor(sin) : '';
        if (bg) {
            row.style.backgroundImage = `linear-gradient(90deg, var(--bg-tertiary) 34%, rgba(26,26,42,.55) 68%, rgba(26,26,42,.30)), url('${bg}')`;
            row.classList.add('has-bg');
        }
        /* ⚠ **접이식 「구성 보기」는 없다** [2026-09-10 사용자 지시 · ADR-0080] — 행은 이제 제목 줄과 부제 줄뿐이라
           **모든 행이 같은 높이**이고, 골라도 그 높이가 안 바뀐다(옛 판은 고른 행에서만 접이식이 빠져 행이 줄었다).
           등장 몬스터는 아래로 내려오는 전진 패널의 적 구성 칸이 든다 (ADR-0078) */
        row.innerHTML = `
            <div>
                <div class="title">
                    <span class="sin-chip" style="color:${sinColor(sin)}">${sinName(sin)}</span>
                    <span>Ch${z.chapter}-${z.stage_num} ${L(stageName(z))}</span>
                    ${cleared ? `<span class="muted" style="font-size:var(--fs-xs)">${t('exp.cleared')}</span>` : ''}
                </div>
                <div class="meta">${t('exp.stageMeta', { lv: z.dlvl, m: stageMinutes(z) })} · ${t('exp.element', { e: t(`st.atkType.${SYS.battle.stageElement(z)}`) })}</div>
            </div>
            <div>${unlocked
                ? `<span class="zone-pick">${t('exp.pick')}</span>`
                : `<span class="muted" style="font-size:var(--fs-sm)">${t('exp.locked')}</span>`}</div>`;
        /* 행 클릭 = **출정 창을 연다** [2026-09-10 사용자 지시 · ADR-0084] — 옛 접이식 토글을 걷었다.
           같은 행을 다시 눌러 접던 규칙(2026-08-28)은 창의 **닫는 길 셋**(X · 바깥 · Esc · §2)이 대신하므로
           여기서는 여는 일만 한다. `state.expStage` 는 남는다 — 창을 닫아도 고른 행의 표시(`.zone.on`)가 이어진다 */
        row.onclick = () => {
            if (!unlocked) { flash('exp.locked'); return; }
            state.expStage = z.stage_id;
            // 반복 의사는 그 스테이지의 런에서 읽어 온다 — 런이 없거나 다른 스테이지면 꺼진 채로 시작
            state.expRepeat = G.run?.stageId === z.stage_id && G.run.repeat === true;
            state.modal = 'depart';
            render();
        };
        zp.appendChild(row);
    }
    main.appendChild(zp);
}

/* ═══════════ 진형 (SCREEN_DESIGN §4-1) ═══════════
   ~~⚠ 목업 — 값이 화면 상태에만 산다~~ **폐기 2026-09-09** (부채 #37 해소) — 진형이 확정되면서
   자리는 **세이브 값**(`G.formation`)이 됐고 **전투가 그것을 읽는다**: 「앞에 있는 유닛부터 때린다」의
   「앞」이 이 자리다 (battle_design §3-1). 화면은 이제 규칙을 안 든다 — 고르고 그리기만 한다 */

/** 진형 읽기 — **규칙은 game_logic 이 든다** (`state.js:formationState` · 진형 확정 2026-09-09).
 *  종전의 `reconcileForm` 은 화면이 배치를 계산하던 함수였고, 진형이 세이브 값이 되면서 통째로 옮겨 갔다.
 *  정규화는 상태를 바꾸는 쪽(`toggleParty`·`setFormation`·`placeFormation`)이 하므로 읽기는 순수하다 */
const formState = () => SYS.game.formationState(G);

/** 진형을 관전에 넘길 꼴로 굳힌다 (2026-09-09) — `{byUid: {uid: 랭크 번호}}` 하나뿐이다.
 *  **출발 순간에 한 번** 찍는다: 관전 중에 편성으로 돌아가 템플릿을 바꿔도 재생 중인 전투의 줄은 안 흔들린다
 *  (전투 결과가 출발 순간의 파티를 담은 것과 같은 이유).
 *  ⚠ **자리 계산(가로 차례 · 깊이)은 여기서 안 한다** — 재생기의 `layoutRanks` 가 든다 (2026-09-09 적 진형이 붙으며 합쳤다).
 *    적은 진형을 몬스터 역할에서 뽑으므로 편성 화면이 관여할 수 없고, 규칙이 둘로 갈리면 두 진영이 다른 모양으로 선다.
 *  ⚠ 여전히 화면 상태뿐이다 — 세이브(G)에도 전투 계산(SYS.*)에도 안 실린다. 재생기는 이 값으로 **카드 자리만** 정한다 */
function formSnapshot() {
    return { byUid: { ...formState().byUid } };
}

/** 어느 자리에 있나 — `[랭크, 칸]` 또는 못 찾으면 null */
function formSlotOf(uid) {
    const ranks = formState().ranks;
    for (let r = 0; r < ranks.length; r++) { const i = ranks[r].indexOf(uid); if (i >= 0) return [r, i]; }
    return null;
}

/**
 * 놓았다 — 출발지가 둘이라 규칙도 둘이다. 바뀐 게 있으면 true. **목적지는 놓은 그 칸이다** [2026-09-11 사용자 지시 · §4-1 · ADR-0096]
 *   ① **이미 파티인 영웅**(자리 → 자리 · 띠에서 끌어도 같다) — 빈 칸이면 그 랭크로 이동, 주인이 있으면 **그 주인과** 자리 맞바꿈(같은 랭크 안에서도)
 *   ② **벤치 영웅**(띠 → 자리) — 주인이 있으면 그 영웅이 **파티에서 나가고**(교체) 그 칸을 차지한다
 * 소속도 자리도 **세이브 값**이라(진형 확정 2026-09-09) 둘 다 `SYS.game` 을 부르고 `save()` 한다 —
 * 종전엔 자리가 화면 상태라 여기서 배열을 직접 splice 했다. 맞바꿈 규칙은 `placeFormation` 이 든다.
 * ⚠ 칸 번호(`ti`)를 안 넘기던 판(~2026-09-11)은 랭크만 넘겨서, 후열을 전열 첫 칸에 끌어도 전열 **마지막**과 바뀌었고
 *   같은 랭크 안의 드래그는 아무 일도 안 했다
 */
function formDrop(src, tr, ti) {
    const ranks = formState().ranks;
    const target = ranks[tr]?.[ti];                  // undefined = 빈 칸
    if (target === src.uid) return false;
    if (G.party.includes(src.uid)) {
        if (!SYS.game.placeFormation(G, src.uid, tr, ti).ok) return false;
        save();
        return true;
    }
    // 벤치에서 왔다 — 자리 주인을 먼저 내보내야 정원이 빈다
    if (target !== undefined && !SYS.game.toggleParty(G, target, now()).ok) return false;
    const r = SYS.game.toggleParty(G, src.uid, now());
    if (!r.ok) { flash({ full: 'exp.partyFull', searching: 'exp.searching' }[r.err] ?? 'exp.partyFull'); return true; }
    // 넣은 다음 **놓은 칸**으로 옮긴다 — 주인이 빠지며 같은 랭크의 뒤가 당겨졌으므로, 칸을 안 주면 새 영웅이 랭크 끝에 앉는다
    SYS.game.placeFormation(G, src.uid, tr, ti);
    save();
    return true;
}

/** 드래그가 방금 끝났나 — 띠 카드와 보드 칸은 클릭(소속)도 겸하므로 드래그 뒤의 클릭 한 번을 삼킨다 */
let formDragEnded = false;

/**
 * 진형 드래그 = **자리**를 정한다. 잡는 곳이 둘이다 — 로스터 띠 카드(`rank: null`) · 보드에 놓인 영웅.
 * 4px 를 넘어야 드래그로 친다 — 임계 미만이면 **클릭(파티 넣고 빼기 · 띠 카드와 보드 칸 둘 다)이 그대로 산다.**
 * 고스트는 **감싸개 + 클론 하나**(원본은 자리에 남고 `.drag` 로 흐려진다 · 왜 감싸개인지는 아래 ①②) · 놓을 자리는 elementFromPoint 로 찾는다.
 * **고스트는 한 장(`#stage`) 안에 선다** (ADR-0087) — 크기 · 위치 · 잡은 점 오프셋은 **한 장 단위**(`stagePoint`)다.
 * 4px 임계와 elementFromPoint 는 **창 좌표 그대로**다 — 손이 움직인 거리와 브라우저의 판정이라 배율로 바꾸지 않는다.
 */
function bindFormDrag(node, src) {
    node.onpointerdown = ev => {
        if (ev.button) return;
        const x0 = ev.clientX, y0 = ev.clientY;
        const r0 = node.getBoundingClientRect();
        const p0 = stagePoint(ev), n0 = stagePoint({ clientX: r0.left, clientY: r0.top });
        const dx = p0.x - n0.x, dy = p0.y - n0.y;       // 잡은 점 − 카드 왼쪽 위 (한 장 단위)
        let ghost = null;
        const move = e => {
            if (!ghost) {
                if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) < 4) return;
                // 드래그가 시작되면 툴팁을 접는다 [2026-09-10] — 포인터 캡처가 걸린 동안에도 `onmousemove`(moveTip)가
                // 캡처 노드로 되돌아와 카드가 끌리는 내내 툴팁이 커서를 따라다녔다. 끄는 손이 읽을 것을 달고 다닐 이유가 없다
                hideTip();
                /* 고스트 = **감싸개 하나 + 그 안의 클론** [2026-09-11 · ADR-0099]
                   ① 위치는 규칙이 없는 감싸개(`.fm-ghost`)가 든다 — 클론에 직접 달면 클론이 원래 입은 규칙과 싸운다:
                      뒤에 선언된 `.hs-card { position: relative }` 가 `fixed` 를 이겨 **띠에서 끈 고스트가 한 장 아래(+800)로 떨어져 안 보였다**
                      (진형 칸 `.fm-cell` 은 앞에 선언돼 멀쩡했다 · DEV_PLAN §4 #41)
                   ② 크기는 클론이 **레이아웃 크기 그대로 · 보이는 폭 ÷ 레이아웃 폭만큼 zoom** 으로 든다 — 출정 창은 배율이 걸려
                      (`.depart-box` zoom) `offsetWidth` 가 보이는 폭보다 크다. 한 장 직속인 고스트가 그 폭으로 서면 원본보다 커진다 */
                const n1 = stagePoint({ clientX: r0.right, clientY: r0.bottom });
                const face = node.cloneNode(true);
                face.style.width = `${node.offsetWidth}px`;
                face.style.height = `${node.offsetHeight}px`;
                face.style.zoom = (n1.x - n0.x) / node.offsetWidth;
                ghost = el('div', 'fm-ghost');
                ghost.appendChild(face);
                $('#stage').appendChild(ghost);
                node.classList.add('drag');
            }
            const p = stagePoint(e);
            ghost.style.left = `${p.x - dx}px`;
            ghost.style.top = `${p.y - dy}px`;
        };
        const up = e => {
            node.onpointermove = null; node.onpointerup = null; node.onpointercancel = null;
            if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
            if (!ghost) return;                       // 임계 미만 — 누르기만 했다(띠면 클릭이 이어받는다)
            ghost.remove();
            node.classList.remove('drag');
            formDragEnded = true;                     // 뒤따라 오는 클릭 한 번을 삼킨다
            setTimeout(() => { formDragEnded = false; }, 0);
            const tgt = document.elementFromPoint(e.clientX, e.clientY)?.closest('.fm-cell');
            if (!tgt || tgt === node) return;
            if (formDrop(src, Number(tgt.dataset.rank), Number(tgt.dataset.idx))) render();
        };
        node.setPointerCapture(ev.pointerId);
        node.onpointermove = move;
        node.onpointerup = up;
        node.onpointercancel = up;
        ev.preventDefault();
    };
}

/**
 * 진형 박스 — 왼쪽에 **정사각 템플릿 아이콘 3개를 가로로**(모양을 점으로 그린다 — 글자가 없어 언어 중립이다),
 * 오른쪽에 **보드**(랭크 줄 = 라벨 + 칸 · 칸은 영웅 띠 카드와 같은 크기).
 * 랭크 최대가 둘이라 보드 높이가 두 줄분으로 고정된다 — 한 줄짜리(3)는 가운데에 서고 패널 크기는 안 흔들린다.
 */
function formBox() {
    const f = formState();
    const caps = f.caps;
    /* 머리(「진형」)가 **돌아왔다** [2026-09-10 사용자 지시 · ADR-0079 가 ADR-0060 을 대체].
       걷었던 근거(「아이콘과 전열/후열 라벨이 이미 말한다」)는 이 상자가 패널의 유일한 내용이던 시절 것이다 —
       패널이 세 칸(적 구성 · 진형 · 출발)이 된 지금은 **칸마다 이름이 서야 어디까지가 무엇인지** 읽힌다.
       ⚠ 이름은 상자 **위**가 아니라 **왼쪽 열의 맨 위**에 얹는다 [2026-09-10 사용자 지시 · ADR-0080] —
         위에 얹으면 그 줄 높이가 패널에 그대로 더해져 창이 세로로 커졌다. 왼쪽 열(아이콘 셋)은 보드보다
         한참 짧아 **위쪽이 비어 있으므로**, 거기에 얹으면 세로 비용이 0 이고 보드와 같은 줄에 선다 */
    const box = el('div', 'fm-box');
    const main = el('div', 'fm-main');

    /* 왼쪽 열 — **이름 + 템플릿 아이콘**. 아이콘은 **가로로** 나란히 (2026-09-09 사용자 지시 — 옛 세로 기둥 폐기).
       보드 **옆**에 두는 이유는 세로다: 머리줄로 올리면 아이콘 높이가 그대로 패널에 더해져
       보내기 버튼이 화면 밖으로 나간다(실측). 보드 옆이면 세로 비용이 0 이다.
       셋 중 하나를 고르는 것이라 .toggle(초록 ON/OFF)이 아니라 .on(고른 것)을 쓴다.
       아이콘은 정원 배열 그대로 점을 찍은 것이라 템플릿을 늘리면 그림도 저절로 따라온다 */
    const side = el('div', 'fm-side');
    side.appendChild(el('div', 'fm-h', t('exp.form.h')));
    const tpls = el('div', 'fm-tpls');
    for (const key of f.templates) {
        const shape = f.shapes[key] ?? [];
        const b = el('button', `btn fm-tpl${key === f.tpl ? ' on' : ''}`,
            // 정원 0 인 랭크는 점을 안 찍는다 — 「모두 앞」의 아이콘이 빈 줄을 달고 있으면 안 된다
            shape.filter(n => n > 0).map(n => `<i>${'<b></b>'.repeat(n)}</i>`).join(''));
        b.onclick = () => { SYS.game.setFormation(G, key); save(); render(); };   // 자리는 세이브 값이다 (2026-09-09)
        tpls.appendChild(b);
    }
    side.appendChild(tpls);
    main.appendChild(side);

    /* 보드. 빈 칸은 영웅 얼굴과 같은 크기라 「여기에 끌어다 놓는다」가 크기로 읽힌다.
       줄은 랭크 수만큼만 그린다 — 보드 높이가 CSS 에서 고정이라 빈 줄을 예약하지 않아도 패널이 안 흔들린다 */
    const board = el('div', 'fm-board');
    const labels = FORM_RANK_LABELS[caps.length] ?? [];
    for (let r = 0; r < caps.length; r++) {
        const cap = caps[r];
        if (!cap) continue;                          // 정원 0 인 랭크는 줄을 안 그린다 (「모두 앞」의 후열)
        const row = el('div', 'fm-row');
        row.appendChild(el('div', 'fm-label', labels[r] ? t(labels[r]) : ''));
        const cells = el('div', 'fm-cells');
        for (let i = 0; i < cap; i++) {
            const uid = f.ranks[r][i];
            const h = uid ? heroById(uid) : null;
            const cell = el('div', `fm-cell${h ? ' filled' : ''}`);
            cell.dataset.rank = r;
            cell.dataset.idx = i;
            if (h) {
                // 리더 태그는 띠와 같은 키를 쓴다 — 리더는 G.party[0] 이지 진형의 자리가 아니다
                cell.innerHTML = `<div class="fm-nm">${L(h.name)}</div>${heroFace(h)}`
                    + (uid === G.party[0] ? `<span class="hs-leader">${t('exp.leader')}</span>` : '');
                cell.style.borderTopColor = tierColor(h);
                bindFormDrag(cell, { uid });
                /* 클릭 = **파티에서 뺀다** [2026-09-11 사용자 지시 · §4-1 · ADR-0096] — 띠 카드를 다시 누른 것과 같은 문(`toggleParty`)이다.
                   빼는 길이 띠에만 있던 판은 **교체가 막혔다** — 파티가 차 있으면 새 영웅의 클릭은 「파티 정원」으로 거절되는데,
                   보드의 영웅을 눌러도 아무 일이 없었다. 끈 뒤의 클릭은 띠와 같이 삼킨다 */
                cell.onclick = () => { if (!formDragEnded) toggleParty(h); };
            }
            cells.appendChild(cell);
        }
        row.appendChild(cells);
        board.appendChild(row);
    }
    main.appendChild(board);
    box.appendChild(main);
    return box;
}

/* ═══════════ 출정 창 (SCREEN_DESIGN §4-1 · ADR-0084 · ADR-0088) ═══════════
   스테이지 행을 누르면 **탭 위에 겹쳐 뜨는 창**이다 — 옛 접이식 전진 패널(2026-08-28~2026-09-10)이 통째로 옮겨 왔다.
   속은 **이름 붙은 칸 넷이 2×2** 로 선다 (ADR-0088):
     위 줄   = **캐릭터 선택 ↔ 적 구성** — 누구를 보내나 ↔ 누구와 싸우나(마주 선다)
     아래 줄 = **진형 → 출정 방식** — 어떻게 세우나 → 갈까
   **크기는 상태에 흔들리지 않는다** — 넷이 전부 항상 있는 부품이고, 판 폭은 `.depart-box` 가 못박는다. */

/** 창 머리 — **고른 스테이지의 신원**. 접이식이던 시절엔 바로 위 행이 말하던 것이라 패널에 머리가 없었는데
 *  (2026-08-28 「머리 통째로 삭제」), 창은 목록에서 떨어져 뜨므로 **여기가 그 자리를 이어받는다** (ADR-0084).
 *  줄 하나에 죄종 칩 · Ch-스테이지 이름 · 잔글씨로 위험도/소요/원소 — **스테이지 행이 찍던 것과 같은 값**이다. */
function departHead() {
    const z = D.stages[state.expStage];
    const sin = chapterOf(z.chapter)?.sin ?? 'wrath';
    const h = el('h2', 'dw-title');
    h.innerHTML = `
        <span class="sin-chip" style="color:${sinColor(sin)}">${sinName(sin)}</span>
        <span>Ch${z.chapter}-${z.stage_num} ${L(stageName(z))}</span>
        <small>${t('exp.stageMeta', { lv: z.dlvl, m: stageMinutes(z) })} · ${t('exp.element', { e: t(`st.atkType.${SYS.battle.stageElement(z)}`) })}</small>`;
    return h;
}

/** 출정 방식 — 경고 줄 + 같은 크기 버튼 둘. 반복 원정은 별도 줄이 아니라 **버튼**이다 (2026-08-28 사용자 지시):
 *  옛 줄은 「런의 스테이지일 때만」 붙어서 칸 크기가 흔들렸다. 버튼은 항상 있으므로 크기가 고정된다. */
function goBox(z) {
    const side = el('div', 'fp-side');
    side.appendChild(el('div', 'dw-h', t('exp.go.h')));
    // 경고는 있을 때만 글자가 뜨지만 **줄은 항상 잡는다** — 안 그러면 칸이 상태에 따라 커졌다 작아진다 (2026-08-28)
    // 상태 경고는 없다 [2026-09-03] — 전투 밖에 쓰러져 있는 영웅이 없으므로 막히는 경우가 파티 0 하나뿐이다
    side.appendChild(el('div', 'down exp-warn', G.party.length === 0 ? t('exp.noParty') : ''));

    const actions = el('div', 'form-actions');
    const rep = el('button', `btn lg toggle${state.expRepeat ? ' on' : ''}`, t('exp.repeat'));
    rep.onclick = () => {
        state.expRepeat = !state.expRepeat;
        // 이 스테이지가 지금 도는 런이면 곧바로 런에도 옮긴다 — 관전의 자동 진행이 이 값을 읽는다
        if (G.run?.stageId === z.stage_id) { G.run.repeat = state.expRepeat; save(); }
        render();
    };
    const go = el('button', 'btn lg primary', t('exp.deploy'));
    // 출발하면 창은 할 일이 끝났다 — 안 닫으면 관전 화면 위에 편성 창이 그대로 떠 있는다
    go.onclick = () => { state.modal = null; runBattle(z.stage_id); };
    actions.appendChild(rep);
    actions.appendChild(go);
    side.appendChild(actions);
    return side;
}
/** 적 구성 — 창의 **위 줄 오른쪽 · 파티 띠 오른쪽** [2026-09-10 사용자 지시 · §4-1 · ADR-0088].
 *  이 스테이지에서 기다리는 것들을 **정사각 칸으로 가로 한 줄** 편다 — 칸 크기는 **진형 칸과 같은 `--fm-slot`** 이고,
 *  이름은 안 적고 `title` 이 든다 (「칸에는 글씨가 없으므로 호버가 유일한 길이다」 · 2026-09-06 규칙 그대로).
 *  **클릭이 없는 읽는 자리**다 — 고르는 것은 위 스테이지 행이 이미 했다.
 *  「이건 적이다」를 글자로 안 써도 되는 것은 **원형이 몬스터**이기 때문이지만(§5), 칸 이름 한 줄은 둔다:
 *  진형 상자가 제목을 안 다는 근거(아이콘·전열/후열 라벨이 이미 말한다 · ADR-0060)가 여기엔 없다.
 *  ⚠ 칸 **수**는 스테이지마다 같지 않다 — 보통은 일반 셋 + 보스 하나, **챕터보스 스테이지는 보스 하나뿐**이다(2026-09-11).
 *  칸은 늘 같은 정사각이라 **높이는 안 흔들린다.** */
function foeBox(z) {
    const box = el('div', 'foe-box');
    box.innerHTML = `
        <div class="foe-h">${t('exp.foes')}</div>
        <div class="foe-list">
            ${SYS.battle.stagePool(z).map(id => foeCell(id)).join('')}
            ${foeCell(z.boss_monster_idx, 'boss')}
        </div>`;
    return box;
}

/**
 * 창의 속 — **이름 붙은 칸 넷이 격자 하나에 2×2** 로 선다 (ADR-0088). 갈 곳은 위 목록에서 이미 골랐고, 여기서 **누구를 · 어떻게** 보낼지 정한다.
 *   위 줄   ① **캐릭터 선택** ↔ ② **적 구성** — 누구를 보내나 ↔ 누구와 싸우나(마주 선다)
 *   아래 줄 ③ **진형** → ④ **출정 방식** — 어떻게 세우나 → 갈까. 진형이 띠 **바로 아래**라 띠 카드를 끌어내리는 거리가 짧다
 *   ① 영웅 띠가 **창 안으로 들어왔다** [2026-09-10 사용자 지시 · ADR-0084 · ADR-0085 가 ADR-0055 를 대체].
 *      원정에서 띠가 서는 자리는 **여기 하나다** — 탭 최상단에 두던 판은 걷었다(거기서는 아무 결정도 안 끝난다 · ADR-0085).
 *      `deployed: true` — 바로 아래에 진형 보드가 있으므로 파티 카드의 반투명(「내려가 있다」 · ADR-0058)이 참이 된다.
 *   칸 넷이 **격자의 직접 자식**이다 — 줄마다 감싸면 세로 구분선이 두 줄을 관통하지 못한다.
 *   가림막은 클래스가 세운다 — 오른쪽 열 `dw-c2` · 아래 줄 `dw-r2` (style.css `.dw-body`).
 */
function departBody() {
    const z = D.stages[state.expStage];
    const body = el('div', 'dw-body');

    /* ① 캐릭터 선택 — 클릭은 소속(파티에 넣고 빼기) · 드래그는 자리(아래 보드로 끌어다 놓는다) */
    const hb = el('div', 'dw-block');
    hb.appendChild(el('div', 'dw-h', t('exp.heroes.h')));
    hb.appendChild(heroStrip(toggleParty, {
        leaderUid: G.party[0] ?? null, flat: true, partyMode: true, deployed: true,
    }));
    body.appendChild(hb);

    const foe = foeBox(z), form = formBox(), go = goBox(z);
    foe.classList.add('dw-c2');               // ② 적 구성 — 위 줄 오른쪽 · 읽는 자리다(클릭 없음)
    form.classList.add('dw-r2');              // ③ 진형 — 아래 줄 왼쪽 · 자리는 세이브 값이고 전투가 읽는다 (2026-09-09)
    go.classList.add('dw-c2', 'dw-r2');       // ④ 출정 방식 — 아래 줄 오른쪽 · 경고 + 반복 원정 + 보내기
    body.appendChild(foe);
    body.appendChild(form);
    body.appendChild(go);
    return body;
}

/** 반복 원정 토글 — 마지막으로 간 스테이지에 붙는다 */
function repeatRow() {
    const row = el('div', 'repeat-row');
    const on = G.run?.repeat === true;
    const stage = D.stages[G.run.stageId];
    row.innerHTML = `
        <button class="btn sm toggle${on ? ' on' : ''}">${t('exp.repeat')}</button>
        <span class="sub">${stage ? `Ch${stage.chapter}-${stage.stage_num} ${L(stageName(stage))}` : ''}</span>`;
    row.querySelector('button').onclick = ev => {
        ev.stopPropagation();
        G.run.repeat = !on;
        if (G.run.stageId === state.expStage) state.expRepeat = G.run.repeat;   // 편성 패널의 버튼과 어긋나지 않게
        save(); render();
    };
    return row;
}

/* ═══════════ 리포트 — 왼쪽 런 목록 · 오른쪽 상세 (SCREEN_DESIGN §4-3 · ADR-0063) ═══════════
   반복 원정은 이기는 동안 런을 잇고, 끝난 런은 `G.reports` 맨 앞에 쌓인다(세이브 v21 · 상한 balance:report_keep).
   왼쪽은 **고르는 자리**(한 줄 = 한 런) · 오른쪽은 **읽는 자리**다. 고른 줄은 `state.repRun`(화면 상태). */

/** 지난 시간 — 분 · 시간 · 일 중 **하나로만**. 줄이 좁아 두 단위를 못 쓴다 */
function agoText(at) {
    const m = Math.max(0, Math.floor((now() - at) / 60000));
    if (m < 1) return t('rep.ago.now');
    if (m < 60) return t('rep.ago.m', { n: m });
    const h = Math.floor(m / 60);
    return h < 24 ? t('rep.ago.h', { n: h }) : t('rep.ago.d', { n: Math.floor(h / 24) });
}

/** 판정 — 철수(전투불능 · 시간 초과)는 패배(전멸)와 **색을 가른다**. 루팅이 전량 남으므로 실패가 아니다 (§4-3) */
const verdictOf = R => {
    const withdrew = R.reason === 'timeout' || R.reason === 'retreat';
    return {
        cls: R.won ? 'clear' : withdrew ? 'retreat' : 'lose',
        text: R.won ? t('rep.clear') : withdrew ? t('rep.retreat') : t('rep.defeat'),
    };
};

/** 런 목록 — 최신이 맨 위. 줄 클릭이 오른쪽 상세를 바꾼다. 화면 전환 세그먼트는 상단바에 선다 (ADR-0094) */
function runListPanel(list, idx) {
    const p = el('div', 'panel rep-runs');     // 높이는 박스가 정한다 — 목록은 받은 높이를 채우고 안에서 스크롤 (ADR-0097)
    p.innerHTML = `<h2>${t('rep.list.h')} <small>${t('rep.list.sub', { n: list.length })}</small></h2>`;
    const box = el('div', 'rep-list');
    box.dataset.keep = 'rep-list';     // 줄을 눌러 다시 그려도 목록 스크롤이 남는다 (ADR-0097)
    list.forEach((R, i) => {
        const v = verdictOf(R);
        const stage = D.stages[R.stageId];
        const row = el('div', `rep-run${i === idx ? ' on' : ''}`);
        row.innerHTML = `
            <span class="dot ${v.cls}"></span>
            <div class="m">
                <div class="n">${stage ? `Ch${stage.chapter}-${stage.stage_num} ${L(stageName(stage))}` : R.stageId}</div>
                <div class="s muted">${fmtDuration(R.durationSec * 1000)} · ${agoText(R.at)}</div>
            </div>
            <div class="r">
                <div class="g">${R.gold.toLocaleString()}</div>
                <div class="s muted">${t('rep.drops.sub', { n: R.drops.length })}</div>
            </div>`;
        row.onclick = () => { state.repRun = i; render(); };
        box.appendChild(row);
    });
    p.appendChild(box);
    return p;
}

/** 획득 장비 — **가방 칸과 같은 그림 · 같은 테두리 · 같은 비교 툴팁**(§6). 분해는 모드를 켜야 먹는다 (§3)
 *  **자리가 런마다 같다** (ADR-0086) — 격자는 한 줄 높이로 못박히고 「없음」도 그 안에 선다. 버린 수는 머리 줄 안으로 */
function dropSection(p, R) {
    const head = el('h2', '', `<span>${t('rep.drops.h')} <small>${t('rep.drops.sub', { n: R.drops.length })}</small></span>`);
    p.appendChild(head);
    const tail = el('span', 'rep-h-tail');
    if (R.discarded) tail.appendChild(el('small', 'down', t('rep.discarded', { n: R.discarded })));
    // 분해 모드 — 되돌릴 수 없는 행동이라 클릭 하나로는 안 되게 한다 (§3 · 가방과 같은 문법).
    //   장비가 없는 런에도 **자리는 잡는다**(안 보일 뿐) — 버튼 높이만큼 머리 줄이 흔들리지 않게
    const sv = el('button', `btn sm toggle${state.repSalvage ? ' on' : ''}${R.drops.length ? '' : ' void'}`, t('ch.salvageMode'));
    sv.onclick = () => { state.repSalvage = !state.repSalvage; render(); };
    tail.appendChild(sv);
    head.appendChild(tail);
    const box = el('div', 'rep-drops rep-cut');
    p.appendChild(box);
    if (!R.drops.length) { box.appendChild(el('div', 'muted rep-note', t('rep.drops.none'))); return; }
    const grid = el('div', `inv-cells wide${state.repSalvage ? ' salvage' : ''}`);
    for (const uid of R.drops) {
        const d = itemOf(uid);
        // 가방을 떠난 것은 **흐리게** 남는다 — 분해했으면 빈 칸(정의가 사라졌다) · 착용 중이면 그림째 흐리게.
        // 「그 런이 준 것」은 지난 사실이라 목록에서 빼지 않는다 (§4-3)
        if (!d) { grid.appendChild(el('div', 'inv-cell gone')); continue; }
        // 창고도 「가지고 있다」다 [2026-09-11 v24] — 옮겼을 뿐인 것을 흐린 칸으로 찍으면 거짓말이 된다
        const inBag = !!SYS.game.holderOf(G, uid);
        const cell = el('div', `inv-cell filled${inBag ? '' : ' gone'}`);
        cell.style.borderColor = rarity(d.rarity).color;
        const us = SYS.game.upgradeState(G, uid);
        cell.innerHTML = `<span class="inv-icon">${itemImg(d)}</span>`
            + (us && us.up > 0 ? `<span class="inv-up">+${us.up}</span>` : '');
        if (d.rarity === 'unique') cell.classList.add('shine');
        bindTip(cell, d);                        // 방금 주운 것 = 「이 아이템」(기본값). ⚠ 「착용 중」이 아니다 (§6 머리글)
        if (inBag && state.repSalvage) cell.onclick = () => {
            const r = SYS.game.salvage(G, uid);
            if (r.ok) { flash('ch.salvaged', { n: r.dust }); save(); }
            render();
        };
        grid.appendChild(cell);
    }
    box.appendChild(grid);
}

/**
 * 기여 표 한 판의 마크업 — **정산본이든 재생 중 누계든 같은 함수가 그린다** (숫자의 출처만 다르다).
 * 영웅 한 줄에 네 칸(`영웅 / 가한 / 받은 / 처치`) — **견주는 값이라 칸으로 세운다.**
 * 왼쪽 칸은 **초상 + 이름** — 상세가 넓어 이름만 두면 칸이 빈다(영웅의 생김새는 어디서나 같다 · §5).
 * 「가한」·「받은」은 **같은 폭 · 같은 모양**이고, **막대 폭이 곧 점유율**이다 — 칸 전체가 100%(= 파티 합계).
 *   최대값을 기준으로 그리면 1등이 언제나 꽉 차서 **막대와 옆의 숫자가 서로 다른 말을 한다**(41%인데 가득 찬 막대).
 * 정렬은 가한 피해 내림차순 — 재생 중에는 앞서는 순서가 그대로 뒤바뀐다(누가 앞서나가 보인다).
 * **영웅에게 일어난 일도 이름 칸이 든다** (ADR-0086) — 이름 아래 레벨업 `▲ Lv.a → b` · 쓰러졌으면 초상이 회색.
 *   줄 높이는 초상이 정하므로 표시가 붙어도 표가 안 자란다. `marks` = `{ up: Map(uid → {from, to}), down: Set(uid) }`
 */
function contribRowsHtml(list, marks) {
    const rows = [...list].sort((a, b) => b.dealt - a.dealt);
    const sum = k => rows.reduce((a, c) => a + Math.round(c[k]), 0);
    const sumD = sum('dealt'), sumT = sum('taken');
    /** 값 한 칸 — **칸 전체가 100%(파티 합계)** 이고 막대 폭이 곧 점유율이다. 그래서 막대와 숫자가 같은 말을 한다 */
    const cell = (cls, v, total) => {
        const pct = total ? v / total * 100 : 0;
        return `<span class="d ${cls}"><i style="width:${pct}%"></i>`
            + `<b>${v.toLocaleString()}</b><em>${Math.round(pct)}%</em></span>`;
    };
    const head = `<div class="ct-row head">
        <span>${t('rep.contrib.hero')}</span>
        <span>${t('rep.contrib.dealt')}</span>
        <span>${t('rep.contrib.taken')}</span>
        <span>${t('rep.contrib.kills')}</span></div>`;
    const body = rows.map(c => {
        const h = heroById(c.uid);
        const lu = marks.up.get(c.uid), down = marks.down.has(c.uid);
        return `<div class="ct-row">
            <span class="n${down ? ' dead' : ''}"${down ? ` title="${t('rep.downed')}"` : ''}>${h ? heroFace(h) : ''}<span class="nm"><b>${h ? L(h.name) : '—'}</b>${lu ? `<em class="up">${t('rep.contrib.levelUp', { a: lu.from, b: lu.to })}</em>` : ''}</span></span>
            ${cell('dealt', Math.round(c.dealt), sumD)}
            ${cell('taken', Math.round(c.taken), sumT)}
            <span class="v">${c.kills}</span></div>`;
    }).join('');
    // 합계 — 「이 파티가 이 판에서 몇을 때렸고 몇을 맞았나」. 다음 판과 견주는 기준선이라 눈이 더하게 두지 않는다
    const total = `<div class="ct-row total">
        <span class="n"><b>${t('rep.contrib.total')}</b></span>
        <span class="d"><b>${sumD.toLocaleString()}</b></span>
        <span class="d"><b>${sumT.toLocaleString()}</b></span>
        <span class="v">${sum('kills')}</span></div>`;
    // 빈자리 — 파티 정원까지 **줄만 잡는다**. 인원이 적은 런만 표가 짧아지면 상세가 런마다 흔들린다 (ADR-0086)
    const pad = `<div class="ct-row pad"><span class="n"><span class="hero-face"></span></span><span></span><span></span><span></span></div>`
        .repeat(Math.max(0, D.balance.party_size_max - rows.length));
    return head + body + pad + total;
}

/** 영웅 줄에 붙는 표시 — 정산본에서 읽는다. 레벨업은 uid → {from, to} · 전투불능은 uid 집합 (ADR-0086) */
const marksOf = R => ({
    up: new Map((R.levelUps ?? []).map(lu => [lu.uid, lu])),
    down: new Set(R.downed ?? []),
});

/** 기여 — `live` 면 표가 재생 시각을 따라 찬다 (§4-3 · ADR-0072)
 *  집계가 아예 없는 옛 리포트(v20 이하 이관본)는 **자리만 잡고 안 그린다** — 0 을 지어내면 「못 때렸다」로 읽히고,
 *  상자를 빼면 그 런만 상세가 짧아진다 (ADR-0086) */
function contribSection(p, R, live) {
    const has = !!R.contrib?.length;
    p.appendChild(el('h2', has ? '' : 'void', `<span>${t('rep.contrib.h')}</span><span class="rep-live"></span>`));
    const box = el('div', `rep-ct rep-cut${has ? '' : ' void'}`);
    box.innerHTML = contribRowsHtml(R.contrib ?? [], marksOf(R));
    p.appendChild(box);
    if (has && live) startReportLive(box, p.querySelector('.rep-live'), R);
}

/* ═══ 진행 중인 런 — **리포트가 곧 관전이다** (SCREEN_DESIGN §4-3 · ADR-0072) ═══
   정산은 출발 순간 끝났고 최종값은 이미 `report.contrib` 에 있다. 여기서 하는 일은 그 값을 가려 두었다가
   **재생 시각까지의 누계**만 드러내는 것 — 관전 아레나가 HP 바로 하는 일과 같은 종류의 **연출**이다.
   더하는 규칙은 정산과 같아서(직격·반사는 때린 쪽/맞은 쪽 · 처치는 적이 쓰러진 것만) 재생이 끝나면 한 자리도 안 어긋난다.
   시계는 **앱이 든다**(`expTick` · ADR-0074) — 이 표는 그것이 민 `state.battle.resume` 을 **읽기만** 하므로
   두 화면을 오가도, 다른 탭에 가 있어도 이어진다. */

let stopRepLive = null;
let repLivePaint = null;      // 앱 시계가 부르는 다시 그리기 — 리포트가 떠 있을 때만 걸린다 (ADR-0074)

function startReportLive(box, badge, R) {
    const B = state.battle, res = B.result, tl = res.timeline, end = res.durationSec;
    const uidOf = Object.fromEntries(res.party.map(u => [u.key, u.uid]));
    const tally = new Map(res.party.map(u => [u.uid, { uid: u.uid, dealt: 0, taken: 0, kills: 0 }]));
    const lastHit = {};        // 유닛 키 → 마지막으로 그를 때린 유닛 키. `down` 이벤트에는 킬러가 없다
    // 영웅 줄의 표시도 재생 시각을 따른다 (ADR-0086) — 회색은 **그 영웅이 쓰러지는 이벤트를 지난 순간**,
    //   레벨업은 **재생 끝**(정산이 런 끝에 준다). 끝나기 전부터 최종값을 걸면 표가 재생보다 앞서 말한다
    const final = marksOf(R), downNow = new Set();
    let i = 0, cur = B.resume?.t ?? 0;      // 재생 시각. 이름을 `t` 로 두면 i18n 의 `t()` 를 가린다

    const apply = ev => {
        if (ev.e === 'hit' || ev.e === 'reflect') {
            // 반사도 `a` 가 되받은 쪽이다 — 정산의 규칙과 같은 방향 (INTERFACE §2-6)
            const a = tally.get(uidOf[ev.a]), d = tally.get(uidOf[ev.d]);
            if (a) a.dealt += ev.dmg;
            if (d) d.taken += ev.dmg;
            lastHit[ev.d] = ev.a;
        } else if (ev.e === 'down') {
            if (uidOf[ev.u]) { downNow.add(uidOf[ev.u]); return; }   // 파티가 쓰러졌다 — 초상이 회색이 되고 처치로는 안 센다
            const k = tally.get(uidOf[lastHit[ev.u]]);                // **적이 쓰러진 것만** 처치로 센다
            if (k) k.kills += 1;
        }
    };
    const consumeTo = until => { while (i < tl.length && tl[i].t <= until) apply(tl[i++]); };
    const paint = () => {
        box.innerHTML = contribRowsHtml([...tally.values()], { up: cur < end ? new Map() : final.up, down: downNow });
        if (badge) badge.textContent = cur < end
            ? t('rep.live', { a: fmtDuration(cur * 1000), b: fmtDuration(end * 1000) }) : '';
    };

    consumeTo(cur);            // 관전에서 넘어왔으면 그 시각의 누계에서 시작한다 (되감기는 조용히)
    paint();

    /* 이 표는 **시각을 전진시키지 않는다** — 앱 시계(`expTick`)가 민 시각을 읽어 그 자리까지 채울 뿐이다 (ADR-0074).
       끝 처리(반복 이음)도 앱 시계 한 곳이 한다: 「누가 시각을 전진시키나」의 답은 하나여야 한다 */
    repLivePaint = () => {
        const to = Math.min(end, state.battle === B ? (B.resume?.t ?? 0) : end);
        if (to === cur) return;
        cur = to; consumeTo(cur); paint();
    };
    stopRepLive = () => { repLivePaint = null; stopRepLive = null; };
}

/* ═══ 원정 시계 — **화면이 아니라 앱이 든다** (SCREEN_DESIGN §4 · ADR-0074 · ADR-0102) ═══
   출발한 런은 어느 탭에 있든 — 브라우저 탭을 숨겨 둬도 — 계속 간다. 옛 구조는 시계를 관전 재생기가 들고 있어서 `render()` 가 재생기를
   걷으면(다른 탭으로 이동) 시각도 같이 멈췄다 — 캐릭터 탭에서 장비를 갈아입히는 동안 원정이 얼었다.
   정산은 출발 순간 끝났으므로(resolveBattle) 여기서 흐르는 것은 **연출의 시각**뿐이다 — 결과는 안 바뀐다.
   시각은 **실제로 흐른 시간 × 배속**이다 (ADR-0102) — 눈금 수로 밀면 브라우저가 숨긴 탭의 눈금을 늦출 때(1분에 한 번까지) 원정도 같이 멎는다. */
const EXP_TICK_MS = 200;      // 5fps — 백그라운드에서 미는 것은 숫자 하나(재생 시각)뿐이다. 간격은 그리는 빈도지 시각의 단위가 아니다
/* 「멈췄다」의 문턱 — 앱 시계가 이만큼 넘게 한 번도 안 불렸으면 그 사이 JS 가 통째로 멈춰 있었다(PC 절전 · 브라우저 절전 탭).
   크롬이 숨긴 탭의 눈금을 늦추는 최대 간격이 1분이라 그 두 배를 둔다 — **게임 수치가 아니라 브라우저 사정**이라 CSV 가 아니다 (ADR-0102) */
const FROZEN_GAP_MS = 2 * 60 * 1000;
let beatAt = null;            // 앱 시계가 마지막으로 불린 실제 시각 — 멈춤은 이 박동의 공백으로 잰다

function expTick() {
    const at = now();
    const gap = beatAt == null ? 0 : at - beatAt;
    beatAt = at;
    // 멈췄다 깨어났다 — 게임을 껐다 켠 것과 같이 본다 (ADR-0102). 재생기가 먼저 깨어나도 그쪽은 공백을 밀지 않고 여기로 미룬다
    if (gap > FROZEN_GAP_MS) { closeFrozenRun(at); return; }
    // 관전이 떠 있으면 **재생기가 시계다** — 애니메이션이 그 눈금 위에 산다. 브라우저 탭이 숨으면 재생기를 걷으므로(`onVisibility`)
    //   숨긴 탭의 시계는 언제나 이쪽이다
    if (!G || state.screen !== 'game' || stopBattle) return;
    // 한 눈금에 런이 끝나면 **남은 시간을 다음 런으로 넘긴다** — 숨긴 탭은 1분에 한 번 깨므로 안 넘기면 런마다 그만큼 샌다.
    //   다음 런은 앞 런이 끝난 순간에 출발한 것으로 친다(`runBattle` 의 `at`)
    for (;;) {
        const B = state.battle;
        if (!B) return;
        const end = B.result.durationSec;
        const r = B.resume ?? { t: 0, speed: 1, running: true, tab: 'log', win: false };
        // 유저가 세워 둔 것 — 시계를 멈추는 것은 이것 하나다. 세워 둔 동안에도 박자는 민다(다시 틀 때 그 시간이 한꺼번에 흐르지 않게)
        if (r.running === false) { B.resume = { ...r, wall: at }; return; }
        if (r.t >= end && !r.auto) return;   // 끝난 런. `auto` = 결과 띠가 다음 런을 세던 도중에 걷혔다 — 이어서 세운다
        const speed = r.speed ?? 1;
        const tNow = r.t + Math.max(0, at - (r.wall ?? at)) / 1000 * speed;
        B.resume = { ...r, t: Math.min(end, tNow), wall: at, auto: false };
        repLivePaint?.();                    // 리포트를 보고 있으면 기여 표가 그만큼 찬다 (§4-3)
        if (tNow < end) return;
        // 끝 — 관전의 `onEnd` 와 **같은 규칙**이다. 어느 탭에서 끝났든 반복 원정이면 다음 런이 출발한다
        if (G.run?.repeat && B.result.won) {
            const endedAt = at - (tNow - end) / speed * 1000;   // 이 런이 실제로 끝난 순간 = 다음 런이 출발한 순간
            runBattle(B.stageId, { at: endedAt, resume: { ...r, t: 0, wall: endedAt, auto: false } });
            // 관전이 섰으면 재생기가 시계다 · 출발이 거절됐으면 멈춘다 · 길이 0 인 런은 한 눈금에 하나만(끝없이 돌지 않게)
            if (stopBattle || state.battle === B || !(state.battle?.result.durationSec > 0)) return;
            continue;
        }
        save();
        // 보고 있던 화면을 뺏지 않는다 — 리포트로 옮기는 것은 **관전을 보고 있었을 때만**이다.
        // 편성을 열어 둔 사람은 편성에 남는다 (닫힌 원정 탭이면 다음에 들어올 때 리포트가 서 있다)
        if (state.exp === 'battle') state.exp = 'report';
        render();
        return;
    }
}

/**
 * 멈췄다 깨어났다 — 앱 시계가 `FROZEN_GAP_MS` 넘게 안 불렸다. 그 사이 JS 가 통째로 멈춰 있었다(PC 절전 · 브라우저 절전 탭).
 * **게임을 껐다 켠 것과 같이 본다** [2026-09-11 사용자 승인 · ADR-0102] — 진행 중이던 런까지만 마무리하고 반복을 끈다
 * (`closeRun` · 재접속 알림). 공백을 따라잡아 런을 몰아 돌리지 않는다. 진행 중인 런이 없으면 할 일이 없다
 */
function closeFrozenRun(at) {
    if (!G || state.screen !== 'game') return;
    const B = state.battle;
    if (!B) return;
    const mounted = !!stopBattle;
    if (mounted) { B.resume = stopBattle(); stopBattle = null; }   // 관전이 떠 있었으면 그 자리가 곧 멈춘 자리다
    const r = B.resume ?? { t: 0, speed: 1, running: true, tab: 'log', win: false };
    const end = B.result.durationSec;
    if (r.t >= end && !r.auto) { if (mounted) render(); return; }  // 이미 끝난 런 — 걷은 관전만 다시 세운다
    B.resume = { ...r, t: end, wall: at, auto: false };            // 진행 중이던 런은 끝난 것으로 — 정산은 출발 순간 끝났다
    SYS.game.closeRun(G, at);
    if (G.run?.stageId === state.expStage) state.expRepeat = false;   // 편성 창의 반복 버튼과 어긋나지 않게 (repeatRow 와 같은 규칙)
    save();
    // 관전을 보고 있었으면 재접속처럼 **편성**으로 — 부재 중 알림이 거기 선다. 다른 화면은 뺏지 않는다
    if (state.exp === 'battle') state.exp = 'idle';
    render();
}

/* 브라우저 탭을 숨기고 돌아올 때 (SCREEN_DESIGN §4 · ADR-0102) — 숨으면 관전 재생기를 걷어 앱 시계에 넘기고, 돌아오면 시계를 먼저
   따라잡힌 뒤 한 번 그린다. 따라잡은 뒤에 그려야 관전이 그 시각까지 **조용히** 되감아 선다 — 먼저 그리면 첫 눈금이 밀린 사건을 팝업째 쏟는다 */
function onVisibility() {
    if (document.hidden) {
        if (stopBattle) { const pos = stopBattle(); if (state.battle) state.battle.resume = pos; stopBattle = null; }
        return;
    }
    expTick();
    render();
}

/** 상세 — 고른 런 하나를 편다 */
function reportDetail(R, live) {
    const stage = D.stages[R.stageId];
    const v = verdictOf(R);
    // 깬 라운드 수는 정산이 실어 보낸다 — 옛 리포트(v4 이전)에는 없어서 그때만 짐작한다
    const roundsDone = R.roundsCleared ?? (R.won ? R.rounds.length : Math.max(0, R.rounds.length - 1));
    const cardEntries = Object.entries(R.cards ?? {});
    const cardTotal = cardEntries.reduce((a, [, n]) => a + n, 0);
    // 빗나감 — 파티 기준. 옛 리포트(v2 이관본)에는 strikes 가 없다
    const ms = R.strikes?.party;
    // 0 이어도 숫자를 찍는다 — 칸이 비면 "안 재고 있다"로 읽힌다 (SCREEN_DESIGN §4-3). "없음"은 strikes 가 아예 없는 옛 리포트뿐
    const missText = ms
        ? t('rep.missN', { m: ms.miss, n: ms.n, p: ms.n ? Math.round(100 * ms.miss / ms.n) : 0 })
        : t('rep.none');

    const p = el('div', 'panel rep-detail');
    p.dataset.keep = 'rep-detail';      // 박스 끝까지 서고 넘치면 상세 안에서 스크롤한다 (ADR-0097)
    p.innerHTML = `
        <div class="report-head">
            <span class="verdict ${v.cls}">${v.text}</span>
            <span>${stage ? stageTitle(stage) : R.stageId}</span>
            <span class="muted">${fmtDuration(R.durationSec * 1000)}${R.won ? '' : ` · ${t(`rep.reason.${R.reason}`)}`}</span>
        </div>
        <div class="gain-row rep-cut">
            <div><span>${t('res.gold')}</span>${R.gold.toLocaleString()}</div>
            <div><span>${t('rep.xp')}</span>${t('rep.xpEach', { n: R.xpEach.toLocaleString() })}</div>
            <div><span>${t('rep.rounds')}</span>${t('rep.roundsCleared', { n: roundsDone, total: stage ? SYS.battle.stageRounds(stage).length : R.rounds.length })}</div>
            <div><span>${t('rep.downed')}</span>${R.downed.length ? `<span class="down">${t('rep.downedN', { n: R.downed.length })}</span>` : t('rep.none')}</div>
            <div><span>${t('rep.miss')}</span>${missText}</div>
            <div><span>${t('rep.cards')}</span>${cardTotal ? t('cx.cards', { n: cardTotal }) : t('rep.cardsNone')}</div>
        </div>`;

    dropSection(p, R);
    // 기여 — 레벨업 · 전투불능도 **이 표의 영웅 줄**이 든다 (ADR-0086). 상세 아래에 따로 서던 줄과 상자는
    //   런마다 상세 높이를 흔들었다. 레벨업은 **레벨만** 적는다(ADR-0073 — 오른 능력치는 체감이 없어 보상으로 읽히면 안 된다)
    contribSection(p, R, live);

    // 도감 카드 — 루팅 리포트에 찍히는 사건 (monster_design §8). 이번 카드로 레벨이 올랐으면 같이 알린다.
    //   **줄은 늘 선다**(없으면 「없음」) · 한 줄에서 끊고 전체는 호버가 든다 — 종류가 많은 런만 두 줄이 되면 상세가 흔들린다 (ADR-0086)
    const cards = cardEntries.map(([id, n]) => {
        const total = G.codexCards[id] ?? 0;
        const lv = SYS.game.codexLevel(total);
        const name = L(monsterName(Number(id)));
        const head = `${name}${n > 1 ? ` ×${n}` : ''}`;
        const up = lv > SYS.game.codexLevel(total - n) ? `▲ ${t('rep.cardLevelUp', { name, lv })}` : '';
        return { html: up ? `${head} <span class="up">${up}</span>` : head, text: up ? `${head} ${up}` : head };
    });
    const cardLine = el('div', 'rep-cards',
        `<span class="muted">${t('rep.cards')}</span> &nbsp;${cards.length ? cards.map(c => c.html).join(', ') : t('rep.cardsNone')}`);
    if (cards.length) cardLine.title = cards.map(c => c.text).join(', ');
    p.appendChild(cardLine);

    // 액션 — **고른 줄의 스테이지로** 다시 나간다 (§4-3)
    const actions = el('div', 'report-actions');
    const again = el('button', 'btn primary', t('rep.again'));
    again.onclick = () => runBattle(R.stageId);
    const back = el('button', 'btn', t('rep.toIdle'));
    back.onclick = () => { state.exp = 'idle'; render(); };
    actions.appendChild(again); actions.appendChild(back);
    p.appendChild(actions);
    if (G.run) p.appendChild(repeatRow());
    return p;
}

function renderExpReport(main) {
    const list = G.reports;
    // 고른 줄 — 목록이 줄면(상한에 밀려 나가면) 맨 위로 되돌린다
    const idx = Math.min(Math.max(0, state.repRun ?? 0), list.length - 1);
    const R = list[idx];
    /* 재생이 안 끝난 **그 런의 리포트를 보고 있을 때만** 표가 살아 움직인다 (§4-3 · ADR-0072).
       옛 줄을 고르면 그냥 정산본이다 — 지나간 런에는 흐를 시계가 없다 */
    const live = !!state.battle && state.battle.at === R.at
        && (state.battle.resume?.t ?? 0) < state.battle.result.durationSec;
    const cols = el('div', 'cols c-side page');
    cols.appendChild(runListPanel(list, idx));
    cols.appendChild(reportDetail(R, live));
    main.appendChild(cols);
}
/* ═══════════ 프롤로그 (SCREEN_DESIGN §3-1) ═══════════
   새 게임 직후 한 번. 5씬을 순서대로 넘기고 마지막에 원정 탭으로 들어간다.
   이 화면은 SYS 를 부르지 않는다 — 상태는 state.proScene 하나뿐이고 세이브에 안 들어간다.
   본문 줄바꿈은 문자열이 들고 CSS(.pro-body { white-space: pre-line })가 편다. */

const PRO_SCENES = ['s1', 's2', 's3', 's4', 's5'];

/** 프롤로그를 닫고 게임으로 — 건너뛰기와 마지막 씬이 같은 문을 쓴다 */
const enterGame = () => { state.screen = 'game'; render(); };

function renderPrologue(main) {
    const i = Math.min(Math.max(state.proScene, 0), PRO_SCENES.length - 1);
    const key = PRO_SCENES[i];
    const last = i === PRO_SCENES.length - 1;

    const wrap = el('div', 'pro-wrap');
    // 인용과 챕터 줄은 마지막 씬에만 선다 — 본문과 층이 다르다 (§3-1)
    wrap.innerHTML = `
        <div class="pro-step muted">${t('pro.step', { n: i + 1, m: PRO_SCENES.length })}</div>
        <h1 class="pro-h">${t(`pro.${key}.h`)}</h1>
        <div class="pro-body">${t(`pro.${key}.b`)}</div>
        ${last ? `<div class="pro-q">${t('pro.s5.q')}</div>
                 <div class="pro-end">${t('pro.end')}</div>` : ''}`;

    const actions = el('div', 'pro-actions');
    const skip = el('button', 'btn', t('pro.skip'));
    skip.onclick = enterGame;
    const next = el('button', 'btn lg primary', t(last ? 'pro.begin' : 'pro.next'));
    next.onclick = () => { if (last) enterGame(); else { state.proScene = i + 1; render(); } };
    actions.appendChild(skip);
    actions.appendChild(next);
    wrap.appendChild(actions);
    main.appendChild(wrap);
}

/* ═══════════ 공통: 영웅 띠 (캐릭터 · 스킬 · 선술집 상단) ═══════════
   초상화가 주인공 — 그 아래 이름과 "지금 뭘 하는가"만 적는다. 직업·레벨·죄종은 마우스를 올리면 나온다.
   세 탭이 같은 띠를 쓰므로 어느 탭에서든 로스터가 같은 자리, 같은 순서로 보인다. */

/**
 * 영웅이 지금 하는 일 — **원정 중 / 대기** 둘 [개정 2026-09-08 사용자 지시 · SCREEN_DESIGN §5].
 * 「원정 중」은 **원정이 실제로 도는 동안**만이다 — 파티에 편성만 해 둔 상태는 대기다.
 * 판정은 화면 상태 하나로 읽는다(계산 없음): `state.exp === 'battle'` 이 곧 「런이 돌고 있다」이고,
 * 탭을 옮겨도 그 상태는 남으므로 캐릭터 탭에서도 같은 답을 준다. 리포트·편성 화면이면 런은 끝났다.
 * 파견은 미구현이라 아직 대기로 뭉뚱그린다. ~~출정 아웃~~ 은 2026-09-08 폐기(아웃이 런을 넘지 않는다).
 */
function heroDoing(h) {
    // 수색이 먼저다 — 나가 있으면 원정에 못 들어가므로(state.js:toggleParty) 두 상태가 겹칠 수 없다
    if (G.search?.heroUid === h.uid) return { cls: 'exp', text: t('hs.doing.search') };
    const out = state.exp === 'battle' && G.party.includes(h.uid);
    return out ? { cls: 'exp', text: t('hs.doing.expedition') } : { cls: 'idle', text: t('hs.doing.idle') };
}

/**
 * 영웅 띠 패널 — 원정(편성)·캐릭터·스킬·선술집 공통. onPick(hero) 가 카드 클릭.
 * **파란 겉 테두리는 띠마다 뜻이 다르다** [개정 2026-09-09 사용자 지시 · SCREEN_DESIGN §5]:
 *   편성 띠(`partyMode`)에서는 **파티에 든 영웅**(`party`) · 그 밖의 띠에서는 **지금 클릭한 영웅**(`on`).
 *   한 띠에 한 뜻만 선다 — 편성에서는 클릭이 곧 편성이라 「본 영웅」 표시가 설 자리가 없고,
 *   09-08 판은 그 자리에 `heroUid` 를 그려서 **눌러도 아무 변화가 없는 화면**이 돼 있었다.
 * 카드 = 초상(카드 전체) + 위칸(왼쪽 지금 하는 일 · 오른쪽 이름) — SCREEN_DESIGN §5 (2026-08-27)
 * 올려놓으면 기본 능력치 툴팁 (2026-08-28, ui/tip.js heroTipCard)
 * leaderUid — 편성 화면만 준다. 파티 첫 슬롯 = 리더 (옛 파티 행의 리더 표시를 띠가 이어받았다)
 * flat — 편성 패널처럼 이미 패널 안에 들어갈 때. 패널 껍데기(테두리·배경·여백)를 벗는다
 */
function heroStrip(onPick, { leaderUid = null, flat = false, partyMode = false, dismissable = false, deployed = false } = {}) {
    const p = el('div', flat ? 'hs-panel flat' : 'panel hs-panel');
    // partyMode — 클릭이 파티 넣고 빼기인 띠(편성). ~~출정 아웃인 카드는 안 눌리는 티를 낸다~~ 는 2026-09-08 폐기(못 넣는 영웅이 없다)
    // `deployed` — **아래에 전진 패널이 열려 있나** (2026-09-09 사용자 지시 · ADR-0058). 파티 카드의 반투명은
    //   「이 영웅은 아래 진형 보드에 내려가 있다」는 뜻이라, 패널이 닫혀 내려갈 곳이 없으면 흐림도 걷힌다
    const strip = el('div', `hero-strip${partyMode ? ' party-mode' : ''}${deployed ? ' deployed' : ''}`);
    for (const h of G.heroes) {
        const doing = heroDoing(h);
        // 편성 띠면 **파티 소속**이, 아니면 **클릭한 영웅**이 파란 테두리를 든다 (2026-09-09 · SCREEN_DESIGN §5).
        //   둘을 한 띠에 같이 걸지 않는다 — 같은 표시가 두 뜻을 겸하면 무엇을 골랐는지 못 읽는다
        const mark = partyMode
            ? (G.party.includes(h.uid) ? ' party' : '')
            : (h.uid === state.heroUid ? ' on' : '');
        const c = el('div', `hs-card${mark}${h.tier === 'unique' ? ' unique' : ''}`);
        c.style.borderTopColor = tierColor(h);
        // 옛 title 한 줄(직업·Lv·죄종·등급)을 툴팁 카드가 대신한다 — 기본 능력치 7 이 함께 뜬다 (2026-08-28)
        bindTipNode(c, () => heroTipCard(h));
        c.innerHTML = `
            <div class="hs-band">
                <span class="hs-doing ${doing.cls}">${doing.text}</span>
                <b class="hs-name">${L(h.name)}</b>
            </div>
            ${heroFace(h)}
            ${h.uid === leaderUid ? `<span class="hs-leader">${t('exp.leader')}</span>` : ''}`;
        /* 해고 — **고른 카드에만** 오른쪽 아래에 뜬다 [2026-09-09 사용자 지시 · SCREEN_DESIGN §5 · §6].
           `dismissable` 을 준 띠(캐릭터 탭)에서만이다 — 편성 띠는 클릭이 파티 넣고 빼기라 여기에 파괴적 버튼을
           같이 두면 파티 빼려다 해고하는 사고가 난다. 리더 뱃지는 왼쪽 아래라 자리가 안 겹친다.
           카드 클릭(선택)까지 올라가지 않게 전파를 끊는다 */
        if (dismissable && h.uid === state.heroUid) {
            const out = el('button', 'btn hs-dismiss', t('ch.dismiss'));
            out.onclick = ev => { ev.stopPropagation(); openModal('dismiss'); };
            c.appendChild(out);
        }
        // 편성 띠에서는 카드를 **진형 보드로 끌어다 놓을 수 있다** (2026-09-09 · SCREEN_DESIGN §4-1).
        //   동사가 갈린다: 클릭은 소속(넣고 빼기) · 드래그는 자리. 끌면 그 뒤의 클릭 한 번을 삼켜 둘이 겹치지 않는다
        if (partyMode) bindFormDrag(c, { uid: h.uid });
        c.onclick = () => { if (!formDragEnded) onPick(h); };
        strip.appendChild(c);
    }
    for (let i = G.heroes.length; i < D.balance.roster_cap; i++) strip.appendChild(el('div', 'hs-card empty', '<span>+</span>'));
    p.appendChild(strip);
    return p;
}
const pickHero = h => { state.heroUid = h.uid; render(); };

/* ═══════════ 캐릭터 ═══════════
   세로 3단: ① 영웅 띠 ② 같은 폭·높이의 4칸 — 장비 / 기본 옵션(+현재 스킬 카드) / 세부 옵션 1 / 세부 옵션 2 (2026-08-27) ③ 아이템(가로 전폭).
   장착·해제·분해가 여기서 실제로 일어난다. */

/** 페이퍼돌 — 신체 위치대로 착용 위치 8개(부위 7종, 반지 ×2). 착용 칸을 누르면 벗는다.
 *  잠기는 칸은 없다 — 보조 슬롯 폐지(2026-09-01)로 양손 배타가 사라졌다.
 *  빈 칸은 **부위 실루엣**을 배경으로 깔고 이모지를 안 그린다 — 둘을 겹치면 투명 PNG 사이로 비친다.
 *  그림이 없는 부위(투구·목걸이)만 예전대로 이모지다 (SCREEN_DESIGN §6 · 규칙은 `mock.slotArt` 한 곳) */
function paperdoll(h) {
    const box = el('div', 'paperdoll');
    for (const row of M.PAPERDOLL) {
        for (const pos of row) {
            if (!pos) { box.appendChild(el('div', 'pd-gap')); continue; }
            const def = posDef(pos);
            const it = itemOf(h.equipped[pos]);
            const art = it ? null : M.slotArt(def.id);
            const cell = el('div', `pd-cell${it ? ' filled' : ''}${art ? ' art' : ''}`);
            if (it) cell.style.borderColor = rarity(it.rarity).color;
            cell.innerHTML = `${art ? `<span class="pd-art"><img src="${art}" alt="" loading="lazy" onerror="this.remove()"></span>`
                : `<div class="pd-icon">${it ? itemImg(it) : def.icon}</div>`}<div class="pd-label">${L(def)}</div>`;
            if (it) {
                // 실제로 착용 중이라 담은 스킬 줄도 **h 의 실제 능력치 기준**으로 낸다 (2026-09-11 사용자 지시)
                const cb = combatOf(h);
                const skCtx = { period: cycleOf(h), atk: cb.atk_physical ?? cb.atk_magic, matk: cb.atk_magic, hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
                bindTip(cell, it, { head: 'tip.equipped', ctx: skCtx });   // 이 칸의 것은 실제로 착용 중이다 (§6 머리글)
                cell.onclick = () => {
                    const r = SYS.game.unequip(G, h.uid, pos);
                    if (!r.ok) flash(`ch.err.${r.err}`); else save();
                    render();
                };
            }
            box.appendChild(cell);
        }
    }
    return box;
}

function gearPanel(h) {
    const p = el('div', 'panel');
    const worn = wornItems(h);
    p.appendChild(el('h2', '', t('ch.gear.h')));
    p.appendChild(paperdoll(h));

    // 접사 죄종 — 세트포인트가 아니라 **태그**다 (세트효과 보류, item_design §4). 수는 "죄종 접사 수" — 접사 시너지 노드의 축
    const counts = {};
    for (const it of worn) for (const s of it.sins ?? []) counts[s] = (counts[s] ?? 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    p.appendChild(el('div', 'sub-h', t('eq.sins.h')));
    const chips = el('div', 'sin-tags');
    if (!entries.length) chips.appendChild(el('span', 'muted', t('eq.sins.none')));
    for (const [sin, n] of entries) {
        const chip = el('span', 'sin-tag');
        chip.style.color = sinColor(sin);
        chip.innerHTML = `${sinName(sin)}${n > 1 ? ` <b>×${n}</b>` : ''}`;
        chips.appendChild(chip);
    }
    p.appendChild(chips);
    return p;
}

/** ②-2 기본 옵션 — 기본 능력치 7 막대 + 그 아래 현재 스킬(액티브 3, 정사각 카드). 옛 핵심 전투치 4 줄은 세부 옵션이 흡수했다 (2026-08-27) */
function attrPanel(h) {
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', t('ch.attr.h')));
    const min = D.balance.hero_attr_min, max = D.balance.hero_attr_max;
    const box = el('div', 'attr-list');
    box.innerHTML = D.heroAttributes.map(s => {
        const v = h.stats[s.id];
        const pct = Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
        return `<div class="attr-row">
            <span class="attr-n">${L(s)}<i class="cs-a">${s.abbr}</i></span>
            <span class="attr-bar"><i style="width:${pct}%;background:${tierColor(h)}"></i></span>
            <span class="attr-v">${v}</span></div>`;
    }).join('') + `<div class="attr-range muted">${t('ch.attr.range', { min, max })}</div>`;
    p.appendChild(box);
    p.appendChild(skillCards(h));
    return p;
}

/**
 * 현재 스킬 — 액티브 3 을 정사각 카드로. 행동 주기는 소제목 오른쪽. 슬롯 데이터를 읽는 법은 activeSlots 와 같다.
 * **찬 칸은 그림 하나뿐**이다 (2026-09-08 사용자 지시 · SCREEN_DESIGN §6) — 이름 · 초 · 출처는 툴팁이 든다.
 * 칸 순서는 여전히 ACTIVE_SOURCES 가 정한다(화면이 판정하지 않는다) — 보이지 않을 뿐 자리는 출처가 든 그대로다.
 */
function skillCards(h) {
    const cycle = cycleOf(h);
    const cb = combatOf(h);
    // 설명창의 숫자 자리 재료 — 밑수 셋(공격 · 회복 · 벽)과 **능력치**(스킬 계수 · ADR-0089). 전투가 시전 순간 읽는 것과 같은 `h.stats` 다
    const tipCtx = { period: cycle, atk: cb.atk_physical ?? cb.atk_magic, matk: cb.atk_magic, hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
    const wrap = el('div', 'sk-cards-wrap');
    // 소제목은 이름뿐이다 (2026-09-08 사용자 지시) — 행동 주기는 **세부 옵션 2 의 제 행**이 든다
    // (`combat_stat.csv:action_period` · sheet_order 21). §4-1 「값은 항상 찍는다」는 그 행이 지킨다
    wrap.appendChild(el('div', 'sub-h', t('ch.skill.h')));
    const grid = el('div', 'sk-cards');
    activeCells(h).forEach((a, i) => {
        const c = el('div', `sk-card${a ? '' : ' vacant'}`);
        // 찬 칸은 **그림 하나** — 이름 · 초 · 출처는 아래 툴팁이 전부 말한다 (화면에 두면 툴팁과 두 번 찍힌다).
        // 빈 칸은 **글자를 안 넣는다**: 칸이 아이콘 크기라 `Not advanced` 가 물리적으로 안 들어간다
        // (9px 로 낮추고 여백을 걷어도 잘렸다 — ko 만 통과하는 칸은 통과가 아니다). 사유는 `title` 이 든다.
        // ⚠ 사유를 **찍는** 자리는 스킬 트리 창 목록(activeSlots)이다 — 거기는 가로줄이라 글자 자리가 있다
        c.innerHTML = a ? `<span class="ico">${skillImg(a)}</span>` : '';
        if (a) bindTipNode(c, () => skillTipCard(a, { ...tipCtx, source: ACTIVE_SOURCES[i] }));
        else { c.title = emptySlotText(i); c.setAttribute('aria-label', emptySlotText(i)); }
        grid.appendChild(c);
    });
    wrap.appendChild(grid);
    const go = el('button', 'btn sm go-tree', t('ch.skill.go'));
    // 탭 이동이 아니라 **창**이다 (SCREEN_DESIGN §7 개정 2026-09-01) — 대상 영웅은 이 탭이 이미 골랐다
    // ~~해고 버튼~~ 은 2026-09-09 에 **영웅 띠의 고른 카드**로 옮겼다(사용자 지시 · §5) — 이 줄은 다시 버튼 하나다
    go.onclick = () => openModal('skill');
    wrap.appendChild(go);
    return wrap;
}

/**
 * 해고 창의 속 — 상태 셋을 한 창이 든다 (SCREEN_DESIGN §6).
 * **버튼이 상태를 말한다** [개정 2026-09-09 사용자 지시] — 문장은 한 줄, 답하는 길은 버튼이다:
 *   ① 장비를 걸치고 있다 → 「모든 장비를 해제해야 합니다」 + **[확인] 하나** (할 수 있는 게 닫는 것뿐이라 고를 것이 없다)
 *   ② 마지막 한 명이다 → 같은 꼴(막힘 + [확인] 하나) — 0명이 되면 복구가 막힌다 (INTERFACE §2-7)
 *   ③ 다 벗었다 → 「영웅을 해고합니다」 + **[확인] [취소]** (되돌릴 수 없어서 취소가 눈에 보여야 한다 — §3)
 * ⚠ 옛 판은 막힘 상태에 **버튼이 아예 없어** 창을 X 로만 닫을 수 있었고, 확인 상태에도 취소가 없었다.
 * 판정은 `game_logic` 의 규칙과 **같은 값을 읽는다** — 화면이 규칙을 다시 쓰지 않는다.
 */
function dismissBody() {
    const h = heroById(state.heroUid);
    const box = el('div', 'dismiss-box');
    if (!h) return box;
    const worn = Object.values(h.equipped ?? {}).filter(Boolean).length;
    const last = G.heroes.length <= 1;
    const actions = el('div', 'dismiss-actions');
    if (worn || last) {
        // 막힘 — 문장 하나 + 닫는 버튼 하나. `ch.err.last` 는 플래시와 같은 키를 그대로 쓴다(같은 말을 두 키에 두지 않는다)
        box.appendChild(el('div', 'down', t(worn ? 'ch.dismiss.blocked' : 'ch.err.last')));
        const ok = el('button', 'btn', t('ui.ok'));
        ok.onclick = closeModal;
        actions.appendChild(ok);
    } else {
        box.appendChild(el('div', '', t('ch.dismiss.confirm')));
        // 확인이 파괴적인 쪽이라 위험 색은 여기 남는다 — 취소는 평범한 버튼이다
        const ok = el('button', 'btn danger', t('ui.ok'));
        ok.onclick = () => {
            const name = L(h.name);
            const r = SYS.game.dismiss(G, h.uid);
            if (!r.ok) { flash(`ch.err.${r.err}`); render(); return; }
            // 지운 영웅이 이 탭의 선택이었으므로 선택을 비운다 — 다음 render 가 첫 영웅으로 되돌린다
            state.heroUid = null;
            state.modal = null;
            save();
            flash('ch.dismissed', { name });
            render();
        };
        const no = el('button', 'btn', t('ui.cancel'));
        no.onclick = closeModal;
        actions.appendChild(ok);
        actions.appendChild(no);
    }
    box.appendChild(actions);
    return box;
}

/**
 * 방어 소재값 → 감쇠율(%) — 소재값만 보이면 "방어 +10 이 얼마인가"를 못 읽는다 (battle_design §9-8).
 * 같은 곡선을 두 번 구현하지 않도록 formula.js 를 그대로 쓴다.
 */
const mitigationPct = D => Math.round(SYS.formula.mitigation(D) * 100);

/** 상한이 걸리는 저항 4행 — 값만으로는 "몇 %까지 의미가 있나"를 못 읽는다 (battle_design §9-5) */
const RES_ROWS = ['res_fire', 'res_cold', 'res_lightning', 'res_poison'];

/** 전투 능력치 표기 — 단위 붙이기는 여기 한 곳에서만 */
const fmtCombat = (def, v) => v === undefined ? '—'
    : def.fmt === 'pct' ? `${Math.round(v * 10) / 10}%`
    : def.fmt === 'sec' ? t('sk.cycleSec', { s: v.toFixed(2) })
    : String(v);

/**
 * 세부 옵션 머리 — 대표값 몇 줄을 굵게 찍고 그 아래 구분선을 둔다 (`sheet_order` 1..N).
 * 물리·마법 공격력 중 **하나는 늘 꺼져 있다**(무기 종류가 정한다) — 지우지 않는 것이 결정이다: 회색으로 남은
 * 그 자리가 「내 빌드가 어느 쪽인가」를 말한다 (SCREEN_DESIGN §6, 2026-09-01).
 */
const DETAIL_LEAD = 3;

/**
 * 세부 옵션을 두 칸으로 가르는 자리 — '피해 감소' 앞에서 끊는다 (SCREEN_DESIGN §6, 2026-09-01).
 * 1 = 대표 3 + 공격 + 물리 방어 + 저항 4 + 최대 저항 증가(때리고 막는 밑수) / 2 = 피해 감소부터 끝(부가 효과).
 * 저항 4행과 그 상한을 움직이는 `res_max_bonus` 는 한 칸에 둔다 — 값 뒤에 같은 상한이 붙는 묶음이라 갈리면 상한이 두 번 나온다.
 */
const DETAIL_SPLIT_AT = 'damage_reduction';

/** ②-3·4 세부 옵션 1·2 — 전투 능력치 21(impl=1)을 두 칸에 나눠 스크롤 없이. 물리 방어 행은 감쇠율을 병기한다 */
function detailPanels(h) {
    const c = combatOf(h);
    const resCap = SYS.formula.resCap(c.res_max_bonus ?? 0);
    // impl=0 은 computeCombat 이 내지 않는 축이라 시트가 그리지 않는다 · 순서는 sheet_order 하나가 정한다 (combat_stat.csv)
    const ordered = D.combatStats.filter(s => s.impl).sort((a, b) => a.sheetOrder - b.sheetOrder);
    const cut = ordered.findIndex(s => s.id === DETAIL_SPLIT_AT);
    const pages = [ordered.slice(0, cut), ordered.slice(cut)];
    return pages.map((rows, pi) => {
        const p = el('div', 'panel');
        p.appendChild(el('h2', '', t('ch.detail.hn', { n: pi + 1 })));
        const list = el('div', 'cs-scroll');
        list.innerHTML = rows.map(s => {
            const has = c[s.id] !== undefined;
            const extra = RES_ROWS.includes(s.id) ? ` <span class="muted">${t('st.resCap', { cap: resCap })}</span>`
                : s.id === 'defense' && has ? ` <span class="muted">${t('st.mitigation', { p: mitigationPct(c.defense) })}</span>` : '';
            return `<div class="cs-row${has ? '' : ' off'}${s.sheetOrder <= DETAIL_LEAD ? ' lead' : ''}">
                <span class="cs-n">${L(s)}</span>
                <span class="cs-v">${fmtCombat(s, c[s.id])}${extra}</span></div>`;
        }).join('');
        p.appendChild(list);
        return p;
    });
}

/**
 * 재료 격자 — 한 종류가 칸 하나다. 개체가 아니라 **수량**이라 `inventory_cap` 을 안 먹는다 (ADR-0055).
 * 지금 서는 것은 가루 · 낙인 둘뿐이다 — 광석 · 약초 · 목재는 이름조차 미정이고
 * 기획의 「크래프트 경제 전부 — 백지」(GAME_DESIGN §10)가 닫혀야 이 격자가 찬다.
 * 골드는 화폐라 여기 안 선다 — 셸 머리의 자원 줄이 든다.
 */
function materialGrid() {
    const grid = el('div', 'inv-cells wide');
    const mats = [{ id: 'dust', glyph: '✦' }, { id: 'stigma', glyph: '✥' }];
    for (const m of mats) {
        const n = G.resources?.[m.id] ?? 0;
        const cell = el('div', 'inv-cell filled mat-cell');
        cell.title = `${t(`res.${m.id}`)} — ${t('ch.bag.count', { n })}`;
        cell.innerHTML = `<span class="inv-icon">${m.glyph}</span><span class="inv-up">${n}</span>`;
        grid.appendChild(cell);
    }
    return grid;
}

/** ③ 아이템 — 가방. 클릭 = 착용(분해 모드면 분해 · 강화 모드면 강화). 열 수는 창 폭이 정한다 */
/** 보관 — **왼쪽 창고 / 오른쪽 인벤토리 두 칸** [2026-09-11 사용자 확정 · SCREEN_DESIGN §6 · item_design §1].
 *  장비 탭이면 두 칸이 나란히 서고, **재료 탭이면 한 칸**이 전폭을 쓴다 — 재료는 수량이라 창고 개념이 없다 (ADR-0055).
 *  드롭이 쌓이는 곳은 인벤토리 하나뿐이고(압력은 그쪽이 든다) 창고는 **유저가 옮긴 것만** 든다 */
function itemsPanel(h, { showTarget = false } = {}) {
    if (state.bagTab === 'material') {
        const p = el('div', 'panel bag');
        p.appendChild(storageTools(h, 'bag', { showTarget, material: true }));
        p.appendChild(materialGrid());
        return p;
    }
    const row = el('div', 'bag-row');
    row.appendChild(storagePanel(h, 'stash', {}));
    row.appendChild(storagePanel(h, 'bag', { showTarget }));
    return row;
}

/** 도구 줄 — 이름 + (인벤토리 쪽에만) 갈래 탭 · 분해 모드 + 칸 수. 관전에서는 장착 대상도 (§6 · §4-2) */
function storageTools(h, where, { showTarget = false, material = false } = {}) {
    const tools = el('div', 'items-tools');
    tools.appendChild(el('span', 'items-name', t(where === 'stash' ? 'ch.bag.stash' : 'ch.bag.inv')));
    // 갈래(장비/재료)와 분해 모드는 **한 벌만** 둔다 — 두 칸에 같이 걸리는 축이라 칸마다 두면 어느 쪽 것인지 읽을 수 없다
    if (where === 'bag') {
        const filter = el('div', 'segmented');
        for (const f of [{ id: 'equip', label: t('ch.bag.equip') }, { id: 'material', label: t('ch.bag.material') }]) {
            const b = el('button', `btn sm${state.bagTab === f.id ? ' on' : ''}`, f.label);
            b.onclick = () => { state.bagTab = f.id; render(); };
            filter.appendChild(b);
        }
        tools.appendChild(filter);
        if (!material) {
            const sv = el('button', `btn sm toggle${state.salvageMode ? ' on' : ''}`, t('ch.salvageMode'));
            sv.onclick = () => { state.salvageMode = !state.salvageMode; render(); };
            tools.appendChild(sv);
        }
    }
    const n = where === 'stash' ? (G.stash ?? []).length : G.bag.length;
    const cap = where === 'stash' ? D.balance.stash_cap : D.balance.inventory_cap;
    tools.appendChild(el('span', 'items-meta muted',
        `${material ? '' : t('ch.items.sub', { n, cap })}${showTarget ? `${material ? '' : ' · '}${t('bt.items.target', { name: L(h.name) })}` : ''}`));
    return tools;
}

/** 보관 한 칸 — `where` 가 'stash' 면 창고, 'bag' 이면 인벤토리. 칸 수는 그 칸의 상한이 정한다 */
function storagePanel(h, where, { showTarget = false } = {}) {
    const p = el('div', `panel bag ${where === 'stash' ? 'store-stash' : 'store-bag'}`);
    p.appendChild(storageTools(h, where, { showTarget }));
    const uids = where === 'stash' ? (G.stash ?? []) : G.bag;
    const items = uids.map(itemOf).filter(Boolean);
    const cap = where === 'stash' ? D.balance.stash_cap : D.balance.inventory_cap;
    const grid = el('div', `inv-cells wide${state.salvageMode ? ' salvage' : ''}`);
    for (let i = 0; i < cap; i++) {
        const it = items[i];
        const cell = el('div', `inv-cell${it ? ' filled' : ''}`);
        if (it) {
            cell.style.borderColor = rarity(it.rarity).color;
            const us = SYS.game.upgradeState(G, it.uid);
            cell.innerHTML = `<span class="inv-icon">${itemImg(it)}</span>`
                + (us && us.up > 0 ? `<span class="inv-up">+${us.up}</span>` : '');
            if (it.rarity === 'unique') cell.classList.add('shine');
            // 비교 상대 = 실제로 교체될 위치의 착용품 (반지는 빈 칸 우선, 없으면 1번 칸)
            const target = SYS.game.equipTarget(h, it);
            const ringHint = it.slot === 'ring' ? t('tip.ringSlot', { n: target === 'ring2' ? 2 : 1 }) : '';
            const cb = combatOf(h);
            const skCtx = { period: cycleOf(h), atk: cb.atk_physical ?? cb.atk_magic, matk: cb.atk_magic, hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
            bindTip(cell, it, { compare: itemOf(h.equipped[target]), hints: ringHint, compareCtx: skCtx });
            cell.onclick = (e) => {
                // **Ctrl + 클릭 = 반대편으로** [2026-09-11 사용자 확정] — 창고 ↔ 인벤토리. Mac 은 Cmd 가 같은 자리다
                if (e.ctrlKey || e.metaKey) {
                    const r = where === 'stash' ? SYS.game.moveToBag(G, it.uid) : SYS.game.moveToStash(G, it.uid);
                    if (!r.ok) flash(`ch.err.${r.err}`); else save();
                } else if (state.salvageMode) {
                    const r = SYS.game.salvage(G, it.uid);
                    if (r.ok) { flash('ch.salvaged', { n: r.dust }); save(); }
                } else {
                    // 창고에서도 **바로** 장착된다 — 꺼내는 단계가 없다 (item_design §1)
                    const r = SYS.game.equip(G, h.uid, it.uid);
                    if (!r.ok) flash(`ch.err.${r.err}`); else save();
                }
                render();
            };
        }
        grid.appendChild(cell);
    }
    p.appendChild(grid);
    return p;
}

function renderCharacter(main) {
    const h = heroById(state.heroUid);
    const stack = el('div', 'char-stack page');
    // 해고 버튼은 이 띠에만 뜬다 — 고른 카드의 오른쪽 아래 (SCREEN_DESIGN §5 · 2026-09-09 사용자 지시)
    stack.appendChild(heroStrip(pickHero, { dismissable: true }));
    const band = el('div', 'cols c-char');
    band.appendChild(gearPanel(h));
    band.appendChild(attrPanel(h));
    for (const p of detailPanels(h)) band.appendChild(p);
    stack.appendChild(band);
    stack.appendChild(itemsPanel(h));
    main.appendChild(stack);
}

/* ── 비교 툴팁 ── */

/**
 * 아이템 카드 한 장 — 줄 순서는 **머리글 / 이름 / 소속 / 메인 옵션 / 옵션 / 담은 스킬 / 힌트**
 * (SCREEN_DESIGN §6 · 개정 2026-09-10 [ADR-0081] — 메인 옵션이 커지고 담은 스킬이 카드 바닥으로 내려갔다).
 * @param hints 하단 힌트. 문자열 하나든 배열이든 받는다 — 반지 칸 · 「착용 중 없음」이 함께 설 수 있다
 * @param skCtx 담은 스킬 줄의 계산 맥락(`{period,atk,matk,hpMax,atkType,stats}`) — **실제로 착용 중인 카드에만** 넘긴다.
 *   생략하면 식이 접힌 채 나온다(주인이 없는 아이템 — 방금 주운 드롭 · 아직 안 낀 후보). 2026-09-11 사용자 지시.
 */
function tipCard(item, headText, hints = [], skCtx) {
    if (!item) return null;                      // 빈 카드는 안 세운다 (§6 개정 2026-09-08 — 아래 bindTip)
    const c = el('div', 'tip-card');
    // 죄종은 **이름이 든다** — `composeName` 이 「분노의 둔기 — 오만」으로 접두·접미를 다 싣는다 (2026-09-08 사용자 지시).
    // 하단 죄종 칩은 같은 값을 카드 안에서 두 번 찍던 자리라 걷었다 (SCREEN_DESIGN §6). 장비 패널의 죄종 집계는 별개다
    const g = SYS.item.groupOf(item);            // 무기군 — 직업 전속·행동 주기·공격 타입의 출처 (weapon_group.csv)
    // 강화한 아이템은 **먹인 값**을 찍는다 — 툴팁 숫자가 캐릭터 시트와 갈리면 안 된다 (SCREEN_DESIGN §6)
    const eff = SYS.item.effective(item);
    const sub = [L(rarity(item.rarity)), L(slotDef(item.slot)), `ilvl ${item.ilvl}`];
    if (g) sub.push(t('ch.weaponGroup', { group: L(g), cls: g.classes.map(className).join('/') }));
    // **강화 줄은 없다** (2026-09-08 사용자 지시 · §6) — 단계는 이름 앞의 `+n` 이 이미 들고, 비용·상한은 제련소(§8-2)의 값이다.
    // 그래서 여기서 `game.upgradeState` 를 안 부른다 — 가방 칸의 `+n` 배지와 제련소는 그대로 부른다
    // **담은 스킬** — 무기가 액티브 한 칸을 통째로 정한다 [신설 2026-09-09 · skill_design §12-1 규칙 3].
    //   `watk`·`element` 와 같은 **개체 굴림 결과**라 밑수 묶음에 붙고 접사 목록과는 층이 다르다.
    //   문장은 액티브 줄·스킬 툴팁과 **같은 함수**가 낸다 — 화면이 문장을 만들지 않는다 (부채 #3 을 안 늘린다).
    //   전투 맥락(주기·공격력)은 **착용 중인 카드에만** 넘긴다(`skCtx`) — 그 밖(드롭·후보)은 주인이 없어
    //   그 조각을 문장이 접는다 [2026-09-09 원 결정 · 2026-09-11 「착용 중이면 실제값」으로 개정 · 사용자 지시]
    //   `skillInfo` 는 없는 id 에도 객체를 주므로(빈 칸 방지 규칙) **정의 유무는 `skill.defs` 로 판정한다** —
    //   안 그러면 스킬 없는 무기가 이름 자리에 `null` 을 찍는다
    const sk = g && item.skill && SYS.skill.defs[item.skill] ? skillInfo(item.skill) : null;
    const skLine = sk ? skillLineHtml({ id: item.skill }, skCtx ?? {}) : '';
    const hintTags = [].concat(hints).filter(Boolean).map(x => `<span class="muted">${x}</span>`).join('');
    // **메인 옵션 — 밑수 하나가 한 행이다** [개정 2026-09-10 사용자 지시 · ADR-0081].
    //   이름 왼쪽 · 값 오른쪽이라 두 카드(이 아이템 ↔ 착용 중)의 값이 **같은 x 에 선다** — 비교가 이 툴팁의 일이다.
    //   부호는 안 붙인다(`M.baseValue`) — 접사의 `+` 는 「얼마를 더한다」지만 밑수는 더할 대상이 없다.
    const baseRow = (name, value, note) =>
        `<div class="r"><span class="n">${name}${note ? `<i>${note}</i>` : ''}</span><b>${value}</b></div>`;
    const baseRows = [];
    if (g) {
        // 공격력의 **이름은 무기군이 정한다**(물리 ↔ 마법) — 그 이름의 SSOT 는 `combat_stat.csv` 다.
        // 원소는 마법 무기 **개체**가 든 값이라 이름 옆 주석으로 붙인다 — 「마법 공격력 (마법)」은 같은 말을 두 번 한다
        const atkStat = statRow(g.damageKind === 'physical' ? 'atk_physical' : 'atk_magic');
        baseRows.push(baseRow(atkStat ? L(atkStat) : t('st.atk'), eff.watk,
            item.element ? t(`st.atkType.${item.element}`) : ''));
        // 주기(초/1회)는 **클수록 느려** 이름과 방향이 거꾸로 읽힌다 → **초당 공격속도**로 뒤집어 낸다.
        // 축은 여전히 `combat_stat.csv:action_period` 하나고(세부 옵션 2 가 그 행을 그대로 든다) 변환은 `formula` 가 한다
        baseRows.push(baseRow(t('st.atkSpeed'), SYS.formula.attacksPerSec(g.period).toFixed(2)));
    }
    if (eff.implicit) baseRows.push(baseRow(L(M.statLabel(eff.implicit.stat)),
        M.baseValue(eff.implicit.stat, eff.implicit.v)));
    c.innerHTML = `
        <div class="tip-head">${headText}</div>
        <div class="tip-name" style="color:${rarity(item.rarity).color}">${item.up > 0 ? `+${item.up} ` : ''}${L(item.name)}</div>
        <div class="tip-sub">${sub.join(' · ')}</div>
        ${baseRows.length ? `<div class="tip-base">${baseRows.join('')}</div>` : ''}
        ${/* 출처 태그 셋 — **데이터가 든 `src` 를 그대로 읽는다** (SCREEN_DESIGN §6 · ADR-0100): 고정 · 죄종 이름(그 죄종 색) · 랜덤.
              순서도 아이템이 든 순서 그대로다 — 렌더러가 정렬하지 않는다. 출처가 없는 옛 접사는 랜덤으로 찍는다 */''}
        <ul>${(item.affixes ?? []).map(a => `<li>${srcTag(a.src)}${affixText(a)}</li>`).join('')
            || `<li class="tip-empty">${t('tip.noAffix')}</li>`}</ul>
        ${/* **담은 스킬은 카드 바닥이다** [개정 2026-09-10 사용자 지시 · ADR-0081] — 옛 자리(밑수 바로 아래)에서는
              문장 한 줄이 접사 목록을 아래로 밀어 「이 아이템의 수치」가 카드 중간부터 시작했다 */''}
        ${g ? (sk ? `<div class="tip-skill">
            <div class="hd"><span class="ico">${skillImg({ id: item.skill })}</span>
                <b>${L(sk.name)}</b><i class="cd">${secText(coolSecOf(item.skill))}</i>
                <i class="lb">${t('tip.skill')}</i></div>
            ${skLine ? `<div class="ln">${skLine}</div>` : ''}</div>`
            : `<div class="tip-skill empty">${t('tip.noSkill')}</div>`) : ''}
        ${hintTags ? `<div class="tip-sins">${hintTags}</div>` : ''}`;
    return c;
}

/**
 * 표시·위치·넘침 보정은 tip.js 가 든다 (2026-08-28). 여기 남은 건 아이템 카드의 **내용**뿐이다.
 *
 * **머리글은 부르는 자리가 정한다** (§6 개정 2026-09-08) — 종전엔 「비교 상대가 없으면 착용 중」으로 **추론**해서,
 * 리포트의 획득 장비 줄(방금 주운 드롭)에 「착용 중」이 붙어 있었다.
 * @param opts.head    머리글 키. 기본은 「이 아이템」 — 「착용 중」은 페이퍼돌만 넘긴다
 * @param opts.compare 비교 상대. **`null`(교체될 자리가 빔)이면 둘째 카드를 안 세우고** 하단 힌트 한 줄로 접는다 —
 *                     「비어 있음」 넉 자에 툴팁 폭의 절반이 빈 상자로 서 있었다. `undefined` 면 비교 자체를 안 한다
 * @param opts.hints   하단 힌트(반지 칸 등)
 * @param opts.ctx        `item` 카드의 담은 스킬 계산 맥락 — **`item` 이 실제로 착용 중일 때만** 준다(paperdoll)
 * @param opts.compareCtx `compare` 카드의 계산 맥락 — `compare` 는 언제나 착용 중인 것이라(§6) 있으면 준다(itemsPanel)
 */
function bindTip(node, item, { head = 'tip.this', compare, hints = [], ctx, compareCtx } = {}) {
    const foot = [].concat(hints, compare === null ? t('tip.noneEquipped') : []);
    bindTipNode(node, () => [
        tipCard(item, t(head), foot, ctx),
        compare ? tipCard(compare, t('tip.equipped'), [], compareCtx) : null,
    ]);
}

/* ═══════════ 스킬 ═══════════ */

/**
 * 액티브 슬롯 3개 (skill_design §3 / battle_design §5).
 * **고유 스킬**(`source === 'innate'`)만 따로 표시한다 — 나머지 칸은 직업 액티브가 임시로 메운 것이라 이름표가 없다 (§9-0).
 */
function activeSlots(h, title) {
    const cycle = cycleOf(h);
    // 툴팁 문장이 「몇 초마다 얼마나」를 말하려면 주기·공격력·공격 타입이 필요하다 (SCREEN_DESIGN §4-2).
    // 공격력 키는 무기군이 정한다(물리 ↔ 마법) — 둘 중 있는 쪽을 그대로 넘긴다
    const cb = combatOf(h);
    // 밑수 셋 + 능력치 — 캐릭터 탭 카드와 같은 맥락이다 (SCREEN_DESIGN §2 「스킬 설명창 규격」 · ADR-0089)
    const tipCtx = { period: cycle, atk: cb.atk_physical ?? cb.atk_magic, matk: cb.atk_magic, hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', title ?? t('sk.slots.h')));
    p.appendChild(el('div', 'cycle-line', `
        ${t('sk.cycle')} <b>${t('sk.cycleSec', { s: cycle.toFixed(2) })}</b>`));
    const box = el('div', 'slot-list');
    activeCells(h).forEach((a, i) => {
        const innate = ACTIVE_SOURCES[i] === 'innate';
        const row = el('div', `act-slot${a ? '' : ' empty'}${innate ? ' innate' : ''}`);
        // 칸 이름 = **출처 하나**다 [2026-09-08 사용자 지시] — ~~`1 · 영웅`~~ 의 번호를 뺐다.
        // 순서는 이미 ACTIVE_SOURCES 가 정하고 줄이 위에서 아래로 서므로 번호가 더 말해 주는 것이 없다
        const no = sourceName(i);
        // 빈 칸은 **사유 한 줄**뿐 — 스킬이 없으니 설명도 없다 (SCREEN_DESIGN §7)
        if (!a) row.innerHTML = `<span class="no">${no}</span><span class="muted">${emptySlotText(i)}</span>`;
        else {
            // 셋째 열은 **두 줄**이다 (개정 2026-09-08 5차 사용자 지시 · SCREEN_DESIGN §7):
            //   이름 + 표기 쿨 / **문장**(hover 와 같은 것 — `tip.js:skillLineHtml` 이 툴팁과 같은 함수로 낸다).
            // ⚠ `skill.csv:desc_*` 고정 설명 줄은 **뺐다** — 문장이 이미 같은 말을 더 정확히 한다(그건 툴팁만 든다)
            const line = skillLineHtml(a, { ...tipCtx, source: ACTIVE_SOURCES[i] });
            row.innerHTML = `
                <span class="no">${no}</span><span class="ico">${skillImg(a)}</span>
                <span class="nm"><span class="t">${L(a.name)}</span>
                    <span class="cd">${secText(coolSecOf(a.id))}</span>
                    ${line ? `<span class="ln">${line}</span>` : ''}
                </span>`;
        }
        // 2026-09-08 — 이 목록에는 툴팁이 없었다. 관전·후보 카드와 **같은 카드**를 붙인다 (SCREEN_DESIGN §4-2)
        if (a) bindTipNode(row, () => skillTipCard(a, { ...tipCtx, source: ACTIVE_SOURCES[i] }));
        box.appendChild(row);
    });
    p.appendChild(box);
    return p;
}

/**
 * 마스터리 칸의 축 이름·단위는 **`stat` 에서 파생**한다 (SCREEN_DESIGN §7).
 * 접사와 같은 채널이면 접사 이름이 그대로 맞고(공격 속도 · 최대 HP · 모든 원소 저항),
 *   접사 풀 밖(HP 재생 · 쿨타임 감소 · 최대 저항 증가)이면 `combat_stat.csv` 행이 이름과 단위를 든다.
 * 화면이 노드 이름 사전을 따로 갖지 않는다 — 가지면 CSV 와 갈린다.
 */
const statRow = stat => D.combatStats.find(s => s.id === stat);

/**
 * 칸 하나 — **랭크 0 이어도 값을 찍는다** (§4-1 "값은 항상 찍는다"). 누르면 1랭크.
 * 잠긴 칸은 랭크 대신 **필요 레벨**을 찍는다 — 잠금은 칸이 설명한다(화면에 티어 어휘를 쓰지 않으므로 그 자리가 없다).
 */
function masteryCell(node, accent) {
    if (!node) return `<div class="sk-cell empty"></div>`;
    const fb = statRow(node.stat);
    const taken = node.rank > 0;
    const cls = `sk-cell${taken ? ' taken' : ''}${node.rank >= node.maxRank ? ' full' : ''}`
        + `${node.unlocked ? '' : ' locked'}${node.canLearn ? ' can' : ' dim'}`;
    const meta = node.unlocked
        ? `<span class="sk-v">${M.statValue(node.stat, node.total, fb)}</span><span class="sk-r">${node.rank} / ${node.maxRank}</span>`
        : `<span class="lv">${t('sk.needLv', { lv: node.unlockLevel })}</span>`;
    return `
        <div class="${cls}" data-node="${node.id}"${taken && accent ? ` style="border-color:${accent}"` : ''}
             title="${L(M.affixText(node.stat, node.total, fb))} — ${node.rank} / ${node.maxRank}${node.unlocked ? '' : t('sk.lockedSuffix')}${taken ? t('sk.unlearnHint') : ''}">
            <div class="sk-n">${L(M.statLabel(node.stat, fb))}</div>
            <div class="sk-meta">${meta}</div>
        </div>`;
}

/**
 * 마스터리 판 하나 — **위에서 아래로 쌓는다** (2026-08-28 사용자 지시 · SCREEN_DESIGN §7).
 * 마스터리는 가지가 갈리는 트리가 아니라 쌓는 구조라(skill_design §3-4) **줄 하나가 한 단계**다.
 * 윗줄이 먼저 열리고 아랫줄일수록 늦게 열린다 — **단계 번호(T1·T2·T3)는 화면에 쓰지 않는다**(내부 어휘다).
 *   잠금은 칸이 필요 레벨로 말하고, 빈 줄은 점선 프레임이 말한다(설명 문구는 도움말 탭 — ui 원칙 4).
 * 프레임(3줄 × 3칸)은 CSV 행 수와 무관하게 고정 — 비어 있어도 그려야 어디까지 갈 수 있는지가 보인다.
 */
function masteryBox({ tag, title, sub, nodes, accent, onLearn, onUnlearn, locked }) {
    const box = el('div', `sk-box${locked ? ' locked' : ''}`);
    const { tiers, nodes: perTier } = M.MASTERY_GRID;
    const rows = [];
    for (let ti = 1; ti <= tiers; ti++) {
        const mine = nodes.filter(n => n.tier === ti);
        const cells = [];
        for (let i = 0; i < perTier; i++) cells.push(masteryCell(mine[i] ?? null, accent));
        rows.push(`<div class="sk-row">${cells.join('')}</div>`);
    }
    box.innerHTML = `
        <div class="sk-box-head">
            <span class="sk-tag">${tag}</span><span class="sk-title">${title}</span>
            ${sub ? `<span class="muted sk-sub">${sub}</span>` : ''}
        </div>
        <div class="sk-grid">${rows.join('')}</div>`;
    // 좌클릭 = 1랭크 · 우클릭 = 1랭크 되돌리기 (SCREEN_DESIGN §7 개정 2026-09-08 사용자 지시).
    // 브라우저 메뉴는 막는다 — 뜨면 되돌린 칸을 메뉴가 가려 결과가 안 보인다
    if (onLearn) box.querySelectorAll('.sk-cell[data-node]').forEach(c => {
        c.onclick = () => onLearn(c.dataset.node);
        c.oncontextmenu = e => { e.preventDefault(); onUnlearn?.(c.dataset.node); };
    });
    return box;
}

/**
 * 스킬 트리 — **창 본문**이다 (SCREEN_DESIGN §7 개정 2026-09-01 사용자 지시).
 * 옛 스킬 탭에서 옮겨 왔고, 옮기며 **영웅 띠 한 벌이 사라졌다** — 대상 영웅은 캐릭터 탭이 이미 골랐다.
 * 배치·규칙(판 셋이 나란히 · 판 안에서 단계가 세로)은 탭이던 시절 그대로다.
 */
function skillTreeBody() {
    const h = heroById(state.heroUid);
    const wrap = el('div', 'cols c-skill');

    // 판정(해금·상한·포인트)은 전부 여기서 온다 — 렌더러는 그리기만 한다 (SCREEN_DESIGN §7)
    const ms = SYS.game.masteryState(G, h.uid);
    const spent = ms.nodes.reduce((a, n) => a + n.rank, 0);

    /** 1랭크 찍기 — 거절 사유는 state 가 코드로 낸다 (INTERFACE §3) */
    const learn = id => {
        const r = SYS.game.learnMastery(G, h.uid, id);
        if (r.ok) save();
        else if (r.err === 'locked') flash('sk.err.locked', { lv: ms.nodes.find(n => n.id === id)?.unlockLevel ?? 0 });
        else if (r.err === 'maxRank') flash('sk.err.maxRank');
        else if (r.err === 'points') flash('sk.err.points');
        render();
    };

    /** 1랭크 무르기 — 우클릭. 무료·수시라 확인을 묻지 않는다 (SCREEN_DESIGN §7) */
    const unlearn = id => {
        const r = SYS.game.unlearnMastery(G, h.uid, id);
        if (r.ok) save();
        else if (r.err === 'noRank') flash('sk.err.noRank');
        render();
    };

    const c1 = el('div');
    const pp = el('div', 'panel');
    pp.appendChild(el('h2', '', t('sk.points.h')));
    pp.appendChild(el('div', '', `
        <div style="font-size:var(--fs-xl);text-align:center;padding:4px 0">${ms.points}
            <span class="muted" style="font-size:var(--fs-sm)">/ ${ms.points + spent}</span></div>
        <div class="muted" style="text-align:center;font-size:var(--fs-xs)">${t('sk.points.left')}</div>`));
    // 초기화는 **한 번 클릭** — 무료·수시이고 전액 환급이라 되돌릴 수 없는 행동이 아니다 (SCREEN_DESIGN §7)
    const reset = el('button', 'btn sm', t('sk.reset'));
    reset.disabled = spent === 0;
    reset.onclick = () => {
        const r = SYS.game.resetMastery(G, h.uid);
        if (r.ok) { flash('sk.reset.done', { n: r.refunded }); save(); }
        render();
    };
    const tools = el('div', 'sk-tools');
    tools.appendChild(reset);
    pp.appendChild(tools);
    c1.appendChild(pp);
    c1.appendChild(activeSlots(h));
    wrap.appendChild(c1);

    const accent = tierColor(h);
    const advLocked = h.level < D.balance.advance_unlock_level;
    const sin = sinName(h.sin);
    const cls = className(h.cls);
    // 판 셋이 나란히 — 옛 화면은 셋을 세로로 쌓아 한 화면에 안 들어왔다 (2026-08-28, SCREEN_DESIGN §7)
    wrap.appendChild(masteryBox({
        tag: t('sk.tab1'), title: t('sk.sinTree', { sin }), sub: t('sk.sinTree.sub', { sin }),
        nodes: ms.nodes.filter(n => n.treeKind === 'sin'), accent, onLearn: learn, onUnlearn: unlearn,
    }));
    wrap.appendChild(masteryBox({
        tag: t('sk.tab2'), title: t('sk.mastery', { cls }), sub: classLine(h.cls),
        nodes: ms.nodes.filter(n => n.treeKind === 'class'), onLearn: learn, onUnlearn: unlearn,
    }));
    // 전직 층은 구현이 없다 — **같은 프레임의 빈 판**으로 자리만 남긴다. 생김새가 갈리면 같은 층으로 안 읽힌다
    wrap.appendChild(masteryBox({
        tag: t('sk.tab3'), title: t('sk.advTree'),
        sub: advLocked ? t('sk.advLocked', { lv: D.balance.advance_unlock_level, cur: h.level }) : t('sk.advOpen'),
        nodes: [], locked: true,
    }));
    return wrap;
}

/* ═══════════ 연구 — 파티 전술 (SCREEN_DESIGN §13) ═══════════
   칸은 **획득물이 아니다**: 합산 레벨이 칸을 열고, 칸에 든 옵션은 골드로 다시 굴린다 (tactic_card_design §5).
   판정(열림 · 조건 카운터 · 비용)은 전부 `game.tacticState` 가 실어 온다 — 렌더러는 파티를 세지 않는다. */

/** 조건의 인자 — 죄종 · 스킬 태그 둘 중 하나다. 스킬 태그 이름은 CSV(skill_tag.csv), 문장 틀은 i18n */
const condArgName = o =>
    o.condKind === 'affix_sin' ? sinName(o.condArg)
        : o.condKind === 'skill_tag' ? L(skillTagName(o.condArg)) : '';
const condText = o => t(`rs.cond.${o.condKind}`, { n: o.condN, a: condArgName(o) });
/** 효과 한 줄 — 축 이름·단위는 `stat` 에서 파생한다 (마스터리 칸과 같은 규칙 · §13) */
const optionEffect = o => L(M.affixText(o.stat, o.value, statRow(o.stat)));

/** 칸 하나 — 잠긴 칸도 그린다(어디까지 열리는지가 보여야 한다 · §13). 무조건 옵션은 카운터를 달지 않는다 */
function tacticCell(slot, onReroll) {
    const c = el('div', `rs-cell${slot.open ? (slot.active ? ' on' : ' off') : ' locked'}`);
    const no = t('rs.slot', { n: slot.no });
    if (!slot.open) {
        c.innerHTML = `<div class="rs-top"><span class="rs-no">${no}</span></div>
            <div class="rs-lock">${t('rs.needLv', { lv: slot.unlockTotalLevel })}</div>`;
        return c;
    }
    const o = slot.option;
    const counter = o.condKind === 'always' ? '' : `<b class="rs-cnt">${slot.have} / ${slot.need}</b>`;
    // 등급은 **값만** 가르므로 조건·효과 줄이 아니라 칸 머리에 선다 (§13-2 · tactic_card_design §5-5)
    c.innerHTML = `
        <div class="rs-top"><span class="rs-no">${no}</span>
            <span class="rs-grade ${o.grade}">${t(`rs.grade.${o.grade}`)}</span>
            <span class="rs-state">${t(slot.active ? 'rs.on' : 'rs.off')}</span></div>
        <div class="rs-cond">${condText(o)}${counter}</div>
        <div class="rs-eff">${optionEffect(o)}</div>`;
    const b = el('button', 'btn sm rs-roll', t('rs.reroll', { g: slot.cost.toLocaleString() }));
    b.disabled = G.resources.gold < slot.cost;
    b.onclick = () => onReroll(slot.no);
    c.appendChild(b);
    return c;
}

/**
 * 미착수 탭 — 기획이 확정한 화면인데 아직 안 만든 자리 (SCREEN_DESIGN §1 탭 10).
 * **안내가 유일한 내용인 탭**이라 §12「설명 문구는 도움말 탭 전용」의 의도된 예외다 — 여기서 안내를 빼면 빈 화면만 남는다.
 * 같은 문구를 도움말도 쓴다(키를 재사용한다 — 도움말은 문구를 새로 쓰지 않는다).
 */
function todoPanel(titleKey, noteKey) {
    const p = el('div', 'panel todo');
    p.appendChild(el('h2', '', `${t(titleKey)} <small class="todo-badge">${t('todo.badge')}</small>`));
    p.appendChild(el('div', 'note-body muted', t('todo.lead')));
    p.appendChild(el('div', 'note-body', t(noteKey)));
    return p;
}
const renderTodo = (main, titleKey, noteKey) => main.appendChild(todoPanel(titleKey, noteKey));

function renderResearch(main) {
    const ts = SYS.game.tacticState(G);
    const next = ts.slots.find(s => !s.open);

    /** 리롤 — 거절 사유는 state 가 코드로 낸다 (INTERFACE §3) */
    const reroll = no => {
        const r = SYS.game.rerollTactic(G, no);
        if (r.ok) { flash('rs.reroll.done', { o: `${condText(r.option)} → ${optionEffect(r.option)}` }); save(); }
        else flash(`rs.err.${r.err}`);
        render();
    };

    // 두 섹션이 **한 화면에 세로로** 선다 — 세그먼트가 아니다 (SCREEN_DESIGN §13 개정 2026-09-01).
    // 파티전술은 칸이 전부 열려도 화면의 절반만 써서 연구가 들어갈 자리가 이미 있다
    // 박스 (ADR-0097) — 연구는 제 높이로 서고 파티 전술이 남는 세로를 받는다(넘치면 그 안에서 스크롤)
    const page = el('div', 'page page-stack');
    main.appendChild(page);
    page.appendChild(researchPanel());

    const p = el('div', 'panel fill');
    p.dataset.keep = 'research';
    p.appendChild(el('h2', '', t('rs.h')));
    p.appendChild(el('div', 'rs-head', `
        <span>${t('rs.total')} <b>${ts.totalLevel}</b></span>
        <span>${t('rs.open')} <b>${ts.open}</b> <span class="muted">/ ${ts.count}</span></span>
        <span class="muted">${next
            ? t('rs.next', { no: next.no, n: next.unlockTotalLevel - ts.totalLevel })
            : t('rs.allOpen')}</span>`));
    const grid = el('div', 'rs-grid');
    for (const slot of ts.slots) grid.appendChild(tacticCell(slot, reroll));
    p.appendChild(grid);
    page.appendChild(p);
}

/**
 * 연구 섹션 — **⚠ 통째로 목업이다** (SCREEN_DESIGN §13-1, 2026-09-01 사용자 지시).
 * 기획이 이름도 비용 곡선도 해금 순서도 안 정해서(GAME_DESIGN §10) **자리와 읽는 법만 먼저 세운 것**이고,
 * 값은 `mock.js:RESEARCH` 에서 온다 — `SYS.*` 를 하나도 부르지 않는다(부를 계약이 없다).
 * 칸 생김새는 파티전술과 **같은 것**을 쓴다: 한 탭 안의 두 섹션이 다른 카드 문법을 쓰면 같은 화면으로 안 읽힌다.
 * 기획이 확정되면 이 함수와 `mock.js:RESEARCH` 를 함께 지우고 상태 함수로 갈아탄다 (DEV_PLAN 부채).
 */
function researchPanel() {
    const R = M.RESEARCH;
    const nameOf = id => L(R.nodes.find(n => n.id === id)?.name ?? { ko: id, en: id });
    const done = R.nodes.filter(n => n.state === 'done').length;

    const p = el('div', 'panel');
    p.appendChild(el('h2', '', `${t('rs.research.h')} <small class="todo-badge">${t('todo.badge')}</small>`));
    p.appendChild(el('div', 'rs-head', `
        <span>${t('rs.rs.progress', { n: done })} <span class="muted">/ ${R.nodes.length}</span></span>
        <span>${t('rs.rs.mat')} <b>${R.material}</b></span>`));

    const grid = el('div', 'rs-grid');
    for (const n of R.nodes) {
        const c = el('div', `rs-cell${n.state === 'done' ? ' on' : n.state === 'locked' ? ' locked' : ''}`);
        c.appendChild(el('div', 'rs-top',
            `<span class="rs-no">${L(n.name)}</span>${n.state === 'done' ? `<span class="rs-state">${t('rs.rs.done')}</span>` : ''}`));
        c.appendChild(el('div', 'rs-eff', L(n.gain)));
        // 잠긴 칸에는 비용을 안 찍는다 — 아직 굴려지지 않은 값이라 찍으면 확정으로 읽힌다 (SCREEN_DESIGN §13-1).
        // 대신 선행 조건을 찍는다: 그게 잠긴 칸이 답해야 할 질문이다
        if (n.state === 'locked') {
            c.appendChild(el('div', 'rs-lock', t('rs.rs.need', { name: nameOf(n.need) })));
        } else if (n.state === 'open') {
            c.appendChild(el('div', 'rs-cond', `<span>${t('rs.rs.cost', { m: n.mat, g: n.gold.toLocaleString() })}</span>`));
            const go = el('button', 'btn sm rs-roll', t('rs.rs.go'));
            go.onclick = () => { flash('todo.lead'); render(); };   // 목업이라 안내만 — 문구는 기존 키 재사용
            c.appendChild(go);
        }
        grid.appendChild(c);
    }
    p.appendChild(grid);
    return p;
}

/* ═══════════ 선술집 ═══════════ */

/* ═══════════ 자원 — 보내 놓고 기다리는 채취 (SCREEN_DESIGN §8) ═══════════
   2026-09-04 사용자 지시 — 탭 이름이 「마을」(장소) → 「자원」(얻는 것)이 되고 탐험이 자기 탭으로 나갔다(§8-4).
   **같은 날 두 번째 개정 — 가로 칸 목록이 세로 카드 3장(채광 · 채집 · 벌목)이 되고 카드마다 단계 7줄이 선다.**
   문법은 §4-1 원정 탭과 **같다**: 카드를 누르면 그 아래에 속이 열린다. 3열 격자도 새로 만들지 않는다 —
   시작 화면(§3)·선술집 명단(§8-1)이 쓰는 `.ng-row`(같은 무게 3열)를 그대로 쓴다.
   ⚠ **탭 이름만 바뀌고 그 안의 칸은 여전히 「파견처」(활동)다** — 그래서 `dp.*` 키와 `.dp-*` 클래스는 이름을 그대로 둔다.
   오프라인 활동의 이름도 여전히 「파견」이고, `.town-bg` 는 여러 탭이 공유하는 배경 클래스라 이름을 안 바꾼다 */

/** 담당 능력치 — `hero_attribute.csv:dispatch` 를 거꾸로 읽는다. 화면은 배정표를 갖지 않는다 (§8) */
const postAttr = postId => D.heroAttributes.filter(a => (a.dispatch ?? '').split('|').includes(postId));

/**
 * 단계 트랙 — **줄 수를 정하는 것은 CSV 표**다 (`mine_node.csv` = 채광의 단계). 코드에 개수를 박지 않는다.
 * 트랙의 길이·번호는 계속 채광 표가 정한다 — 셋이 같은 7단계라 그중 하나를 기준으로 삼는 것이고,
 * 어느 표가 짧으면 모자란 칸에 `—` 가 선다(값은 항상 찍는다 · §4-1).
 * **셋 다 그리는 이유**: 트랙을 지우면 「이 파견처는 단계가 없다」로 읽힌다. 구조가 같다는 것이 읽혀야 한다 (§8).
 * 해금 조건(`unlock_chapter`)은 그리지 않는다 — 무엇으로 여는지가 기획 백지라 문턱 키가 없다 (§4-1).
 * 채집·벌목의 표가 생기면 `post.tiers` 가 그걸 가리키고 이 함수는 그대로 돈다.
 *
 * [개정 2026-09-09 사용자 지시] 한 단계가 **상자**다 — 얇은 줄이 아니라 두 줄(이름 · 산출물)을 든 칸이고,
 * 상자 일곱이 단의 남은 세로를 균등 분할한다(높이 배분은 CSS `.dp-tier-list`).
 * 산출물은 각 표의 산출물 컬럼(`ore_*` / `herb_*` / `timber_*` → 조립이 `yield*` 로 모은다) — **이름만** 찍는다.
 * 시간당 산출(`yield_per_hour`)은 안 찍는다:
 * 표가 스스로 「구조 검증용 자리채움」이라 적은 ⚠임시 수치라 화면에 서면 확정으로 읽힌다 (§8-2 「없는 기능에 가짜 수치를 그리지 않는다」).
 */
function tierTrack(post) {
    const own = D[post.tiers] ?? [];         // 이 파견처의 표 — 없으면 빈 배열
    const shape = D.mineNodes ?? [];         // 트랙의 길이·번호를 정하는 표
    const box = el('div', 'dp-tiers');
    box.appendChild(el('div', 'dp-tier-h', t('dp.tier', { n: shape.length })));
    const list = el('ol', 'dp-tier-list');
    shape.forEach((s, i) => {
        const n = own[i];
        const li = el('li', `dp-tier${n ? '' : ' empty'}`);
        li.innerHTML = `<i class="dp-t-n">${n?.tier ?? s.tier}</i>
            <span class="dp-t-body">
                <span class="dp-t-name">${n ? L({ ko: n.ko, en: n.en }) : '—'}</span>
                <span class="dp-t-ore">${n ? L({ ko: n.yieldKo, en: n.yieldEn }) : '—'}</span>
            </span>`;
        list.appendChild(li);
    });
    box.appendChild(list);
    return box;
}

function renderResource(main) {
    // `1fr auto` — 단 3개가 남는 세로를 갖고 안내 패널은 제 높이만 쓴다 (`.res-stack` · 개정 2026-09-09 사용자 지시)
    const stack = el('div', 'res-stack page');
    // ⚠ 영웅 띠는 두지 않는다 (2026-09-01 사용자 지시 · SCREEN_DESIGN §8) — 로스터 전원이 목록 위에 한 줄로 서면
    // 정작 고를 것(파견처)이 화면 아래로 밀린다. 영웅을 고르는 자리는 파견처를 연 **다음**이다(배치 화면 — 미착수)

    // 파견처 카드 3 — 미착수 카드도 그린다. 어디까지 열리는지가 보여야 하고, 누르면 안내가 뜨므로 「고장」이 아니다 (§8)
    const row = el('div', 'ng-row');
    for (const post of POSTS) {
        const c = el('div', `dp-cell${post.id === state.post ? ' on' : ''}${post.live ? '' : ' todo'}`);
        const attrs = postAttr(post.id);
        // 담당 능력치가 미정인 카드(채집 · 벌목)도 자리를 지킨다 — 빈 칸은 "안 재고 있다"로 읽힌다 (§4-1)
        const attr = attrs.length ? attrs.map(a => a.abbr).join(' · ') : '—';
        // 미착수 배지는 **이름 줄 안**이다 (개정 2026-09-09) — 카드 바닥에 따로 서면 단계 상자 7개와 세로를 다툰다
        c.innerHTML = `<span class="dp-n">${t(post.label)}${post.live ? '' : ` <small class="todo-badge">${t('todo.badge')}</small>`}</span>
            <span class="dp-meta"><i class="dp-attr" title="${t('dp.attrTitle')}">${attr}</i>
            <i class="dp-size">${t(post.party ? 'dp.party' : 'dp.solo')}</i></span>`;
        c.appendChild(tierTrack(post));
        c.onclick = () => { state.post = post.id; render(); };
        row.appendChild(c);
    }
    stack.appendChild(row);

    // 셋(채광 · 채집 · 벌목) 다 미착수다 (§8 개정 2026-09-04) — 실동작 패널이 나가면서 분기가 없어졌다.
    // 안내는 **기존 키를 재사용**한다 — 도움말이 쓰던 문구 그대로다 (§11 · ui 원칙 4)
    const open = POSTS.find(x => x.id === state.post) ?? POSTS[0];
    stack.appendChild(todoPanel(open.label, open.note ?? 'exp.bench.note'));
    main.appendChild(stack);
}

/* ═══════════ 탐험 — 파티 파견 (SCREEN_DESIGN §8-4) ═══════════
   2026-09-04 사용자 지시 — 마을의 마지막 칸에서 자기 탭이 됐다. 가르는 것은 **인원**이다: 자원 탭은 1인 배치, 여기는 파티.

   **지도 아트 한 장 + 미착수 안내** [개정 2026-09-04 사용자 지시] — 같은 날의 「지도를 안 그린다」를 뒤집는다.
   ⚠ **뒤집힌 것은 그림 한 장뿐이다** — 노드 · 경로 · 판정 4축 · 보상은 여전히 기획 백지라 **아무것도 얹지 않고**,
      **클릭도 안 받는다**(`.ex-map` 에 핸들러가 없다). 「없는 기능에 가짜 수치를 그리지 않는다」(§8-2)는 그대로 유효하다.
   **챕터 1 고정** — 자산이 그 하나뿐이다(`mock.js:EXPLORE_MAP_CHAPTERS`). 진행 챕터를 따라가는 규칙은
      지도의 알맹이와 함께 정해진다 — 렌더러가 진행도로 챕터를 **계산하지 않는다** (ui 원칙 2).
   문구는 기존 키(`nav.explore` · `ex.todo`)를 그대로 부른다 — 도움말이 쓰던 그 문구다 (§11 · ui 원칙 4) */
function renderExplore(main) {
    // 박스 (ADR-0097) — 지도는 제 비로 서고 안내가 남는 세로를 받는다
    const page = el('div', 'page page-stack');
    const map = M.exploreMap(1);
    if (map) {
        const box = el('div', 'ex-map');
        box.style.backgroundImage = `url('${map}')`;
        page.appendChild(box);
    }
    const todo = todoPanel('nav.explore', 'ex.todo');
    todo.classList.add('fill');
    todo.dataset.keep = 'explore';
    page.appendChild(todo);
    main.appendChild(page);
}

/* ═══════════ 선술집 탭 — 명단 · 고용 · 의뢰 게시판 (SCREEN_DESIGN §8-1) ═══════════
   2026-09-03 사용자 지시 — 마을의 첫 칸에서 자기 탭이 됐다. 09-01 「선술집을 접는 대가」(고용이 한 단계
   깊어진다)가 이 승격으로 청산됐다. 판정은 전부 game_logic 이 낸다 */
function renderTavern(main) {
    const B = D.balance;
    const full = G.heroes.length >= B.roster_cap;
    const p = el('div', 'panel town-bg page');
    p.appendChild(el('h2', '', t('tv.h')));
    // 박스 (ADR-0097) — 제목은 서 있고 명단 · 도구 · 의뢰가 본문으로 스크롤한다
    const body = el('div', 'box-body');
    body.dataset.keep = 'tavern';
    p.appendChild(body);

    // 명단 판정은 전부 game_logic 이 낸다 (SCREEN_DESIGN §8) — 화면은 빈 칸과 쿨다운을 그리기만 한다
    const T = SYS.game.tavernState(G, now());
    const grid = el('div', 'tv-cands');
    T.candidates.forEach((c, i) => {
        // 고용한 칸은 빈 채로 남는다 — 다음 리롤에 채워진다 (base_expedition_design §2-4)
        if (!c) { grid.appendChild(el('div', 'ng-card tv-empty', t('tv.empty'))); return; }
        const card = candidateCard(c, `<button class="btn primary sm b-hire" ${full || G.resources.gold < B.tavern_hire_cost ? 'disabled' : ''}>${t('tv.hire', { g: B.tavern_hire_cost.toLocaleString() })}</button>`);
        card.querySelector('.b-hire').onclick = () => {
            const r = SYS.game.hire(G, i);
            if (r.ok) { flash('tv.hired', { name: L(r.hero.name) }); save(); }
            else flash(r.err === 'roster' ? 'tv.err.roster' : 'tv.err.gold', { cap: B.roster_cap });
            render();
        };
        grid.appendChild(card);
    });
    // 수색 칸 — 명단 **오른쪽 셋째 칸**. 격자는 원래 3열이었고(후보 2 + 수색 1 = base_expedition §2-4)
    // 그동안 비어 있던 자리다. **2026-09-09 실동작** — 대기 / 수색 중 / 완료 셋이 이 한 칸에 선다 (SCREEN_DESIGN §8-1)
    grid.appendChild(searchCell());
    body.appendChild(grid);

    const tools = el('div', 'tv-tools');
    const rr = el('button', 'btn', T.free
        ? t('tv.reroll.free')
        : t('tv.reroll', { g: T.cost.toLocaleString(), t: fmtDuration(T.freeAt - now()) }));
    rr.disabled = !T.free && G.resources.gold < T.cost;
    rr.onclick = () => { const r = SYS.game.tavernReroll(G, now()); if (!r.ok) flash('tv.err.gold'); else save(); render(); };
    tools.appendChild(rr);
    body.appendChild(tools);

    /* 의뢰 게시판 (SCREEN_DESIGN §8-1 이동 2026-09-03 사용자 지시 · 규격은 §14) — 도구 줄 다음, 패널 맨 아래.
       의뢰 탭이 폐지되면서 게시판이 여기로 들어왔고, 자리는 같은 날 아침 삭제된 도박장 줄의 자리다.
       명단 격자 밖인 이유는 그 줄과 같다 — 후보 카드와 다른 것이라 같은 격자에 세우면 「후보」로 읽힌다.
       제목은 옛 탭 라벨(`nav.commission`)이 섹션 제목으로 내려온 것뿐이라 문구를 새로 쓰지 않는다 */
    const cm = el('div', 'tv-cm');
    cm.appendChild(el('h3', 'tv-cm-h', `${t('nav.commission')} <small class="todo-badge">${t('todo.badge')}</small>`));
    const board = el('div', 'cm-board');
    for (const c of D.commissionList) board.appendChild(commissionCard(c));
    cm.appendChild(board);
    body.appendChild(cm);

    main.appendChild(p);
}

/**
 * 수색 칸 (SCREEN_DESIGN §8-1 · 자리는 ADR-0011 · **실동작 ADR-0062**) — 후보 카드와 **같은 크기**의 칸 하나.
 * 상태 셋이 같은 자리에 선다: **대기**(영웅 칩 격자) · **수색 중**(남은 시간 + 이야기) · **완료**(결과 카드).
 * 판정은 하나도 안 한다 — `searchState` 가 낸 것을 그리기만 한다 (ui 원칙 2).
 * 이야기 문장은 i18n 이 아니라 `search_story.csv` 에서 온다 — `beats[].text` 를 `L()` 로 풀 뿐이다.
 */
/**
 * 소문 한 줄 — **만날 사람의 죄종을 숨기지 않는다** (ADR-0068). 이걸 읽고 누굴 보낼지 정하는 것이 결정이라
 * 화제를 화면에 그대로 띄운다(삼국지 11 설전이 화제를 중앙에 띄운 자리와 같다). 문장은 `search_meeting.csv`.
 */
function rumorLine(rumor) {
    const box = el('div', 'tv-rumor');
    box.innerHTML = `<i class="sin-chip">${sinName(rumor.sin)}</i><span>${L(rumor.rumor)}</span>`;
    return box;
}

/**
 * 만남 — 질문 하나 + 답 몇 개. **답은 고용비만 깎는다**(결과 영웅은 이미 시드가 정했다).
 * 시간 제한이 없다 — 만난 뒤 **수령할 때까지** 언제든 고를 수 있고, 안 골라도 정가일 뿐이다 (방치형 계약 ③).
 * `key` 가 붙은 답은 **보낸 영웅의 죄종이 연 것**이라, 왜 열렸는지를 그 줄이 직접 말한다.
 */
function meetBlock(S) {
    const box = el('div', `tv-meet${S.answer ? ' done' : ''}`);
    box.appendChild(el('div', 'tv-meet-h', `${t('tv.search.met')} <i class="sin-chip">${sinName(S.rumor.sin)}</i>`));
    box.appendChild(el('div', 'tv-meet-q', L(S.rumor.prompt)));
    if (S.answer) {
        box.appendChild(el('div', 'tv-ans picked', L(S.answer.text)));
        box.appendChild(el('div', `tv-meet-cut${S.discountPct ? ' up' : ' muted'}`,
            S.discountPct >= 100 ? t('tv.search.cutAll')
                : S.discountPct > 0 ? t('tv.search.cut', { n: S.discountPct })
                    : t('tv.search.cutNone')));
        return box;
    }
    for (const a of S.answers) {
        const b = el('button', `tv-ans${a.key ? ' key' : ''}`);
        // 열린 이유를 그 줄이 든다 — 열렸다는 사실만으로는 인과가 안 읽힌다 (ADR-0068)
        b.innerHTML = `${a.key ? `<i class="why">${t('tv.search.key', { sin: sinName(S.sent.sin) })}</i>` : ''}<span>${L(a.text)}</span>`;
        b.onclick = () => {
            const r = SYS.game.searchAnswer(G, a.id, now());
            if (r.ok) save(); else flash(`tv.err.${r.err}`);
            render();
        };
        box.appendChild(b);
    }
    return box;
}

function searchCell() {
    const B = D.balance;
    const S = SYS.game.searchState(G, now());

    /* 완료 — **버튼이 카드가 된다.** ADR-0011 이 「구현되면 이 자리를 그대로 쓴다」고 비워 둔 자리다 */
    if (S.done && S.result) {
        const last = S.beats[S.beats.length - 1];
        const card = candidateCard(S.result, `
            <button class="btn primary sm b-take"${S.canHire ? '' : ' disabled'}>${S.discountPct >= 100 ? t('tv.search.cutAll') : t('tv.hire', { g: S.cost.toLocaleString() })}</button>
            <button class="btn sm b-drop">${t('tv.search.drop')}</button>`);
        // ⚠ `.tv-search`(flex + gap) 를 붙이면 카드 안쪽 간격이 벌어 같은 행의 후보 카드까지 높이가 밀린다
        card.classList.add('tv-search-res');
        // 아직 답을 안 했으면 결과가 와 있어도 만남은 열려 있다 — 답할 기회를 수령 전까지 남긴다
        if (S.rumor && S.meetOpen) card.prepend(meetBlock(S));
        card.prepend(el('div', 'tv-story done',
            `<i>${t('tv.search.done')}</i>${last ? `<span>${L(last.text)}</span>` : ''}`));
        card.querySelector('.b-take').onclick = () => {
            const r = SYS.game.searchTake(G, now());
            if (r.ok) { flash('tv.hired', { name: L(r.hero.name) }); save(); }
            else flash(`tv.err.${r.err}`, { cap: B.roster_cap });
            render();
        };
        card.querySelector('.b-drop').onclick = () => {
            const name = L(S.result.name);
            if (SYS.game.searchDrop(G).ok) { flash('tv.search.dropped', { name }); save(); }
            render();
        };
        return card;
    }

    const c = el('div', 'ng-card tv-search');
    c.appendChild(el('div', 'tv-search-h', t('tv.search.h')));

    /* 수색 중 — 누가 · 얼마나 남았나 · **이 선택이 산 것** · 열린 이야기 줄 */
    if (S.out) {
        c.appendChild(el('div', 'tv-search-who', t('tv.search.out', { name: S.hero ? L(S.hero.name) : '—' })));
        c.appendChild(el('div', 'tv-search-spec muted', t('tv.search.left', { t: fmtDuration(S.remainMs) })));
        // 보내고 나면 왜 그 사람을 보냈는지가 화면에서 사라지는 것을 막는다 (§4-1 「값은 항상 찍는다」)
        c.appendChild(el('div', 'tv-search-odds muted', t('tv.search.odds', { r: S.rarePct, e: S.echoPct })));
        const log = el('div', 'tv-story');
        // **열린 막만 그린다** — 안 열린 줄의 자리를 미리 잡으면 이야기가 아니라 진행 막대가 된다
        for (const b of S.beats) if (b.open) log.appendChild(el('p', '', L(b.text)));
        c.appendChild(log);
        if (S.meetOpen) c.appendChild(meetBlock(S));
        const stop = el('button', 'btn sm b-search', t('tv.search.cancel'));
        stop.onclick = () => { if (SYS.game.searchDrop(G).ok) { flash('tv.search.canceled'); save(); } render(); };
        c.appendChild(stop);
        return c;
    }

    /* 대기 — 사양 + 대기 영웅 칩. **고르는 자리에 결정 입력이 함께 선다**(매력 → 레어 확률 · 죄종 → 같은 죄종) */
    c.appendChild(el('div', 'tv-search-spec muted', t('tv.search.spec', { n: S.slots, h: S.hours })));
    // 소문 — **보내기 전에** 만날 사람의 죄종을 말한다. 맞는 죄종을 보내면 만남에서 답 하나가 더 열린다
    if (S.rumor) c.appendChild(rumorLine(S.rumor));
    if (!S.ready.length) {
        c.appendChild(el('div', 'tv-story muted', `<p>${t('tv.search.noHero')}</p>`));
        return c;
    }
    c.appendChild(el('div', 'tv-search-odds muted', t('tv.search.pick')));
    const pick = el('div', 'tv-pick');
    for (const uid of S.ready) {
        const h = heroById(uid);
        if (!h) continue;
        const chip = el('button', `tv-chip${uid === state.searchUid ? ' on' : ''}`);
        chip.style.borderTopColor = tierColor(h);
        chip.innerHTML = `${heroFace(h)}<span class="tv-chip-b">
            <b class="n">${L(h.name)}</b>
            <span class="m"><i class="sin-chip">${sinName(h.sin)}</i><i class="cha">${chaAbbr()} ${h.stats[CHA]}</i></span>
        </span>`;
        chip.onclick = () => { state.searchUid = uid; render(); };
        pick.appendChild(chip);
    }
    c.appendChild(pick);
    const go = el('button', 'btn primary b-search', t('tv.search.go'));
    go.disabled = !state.searchUid || !S.ready.includes(state.searchUid);
    go.onclick = () => {
        const h = heroById(state.searchUid);
        const r = SYS.game.searchSend(G, state.searchUid, now());
        if (r.ok) { flash('tv.search.sent', { name: L(h.name) }); state.searchUid = null; save(); }
        else flash(`tv.err.${r.err}`);
        render();
    };
    c.appendChild(go);
    return c;
}

/**
 * 강화 탭 — 제련소 · 제작 · 강화 (SCREEN_DESIGN §8-2 · 기획 base_expedition_design §2-5).
 * 2026-09-03 사용자 지시로 마을의 칸에서 자기 탭이 됐다. **탭 이름은 「강화」(활동)이고
 * 패널 머리는 「제련소」(장소 — `dp.post.forge`)** 로 남는다 — 시설 어휘 변경은 기획 소관이다.
 * 배치 줄 + 세그먼트 2. **지금 실제로 도는 것은 `+`강화 하나**다 — 옵션강화 · 제작 · 배치는
 * `game_logic` 에 없어 미착수 안내를 띄운다 (DEV_PLAN R34). 없는 기능에 가짜 수치를 그리지 않는다.
 */
function renderForge(main) {
    const p = el('div', 'panel town-bg page');
    p.appendChild(el('h2', '', t('dp.post.forge')));

    /* 배치 줄 — 배치가 아직 없다. 자리와 담당 능력치는 그리되(「값은 항상 찍는다」 §4-1)
       품질 계수는 **발행된 CSV 키가 없어서** `—` 를 찍는다. 지어낸 값을 찍으면 확정으로 읽힌다 */
    const attr = postAttr('forge').map(a => a.abbr).join(' · ') || '—';
    const as = el('div', 'fg-assign', `
        <span class="fg-who"><b>${t('fg.none')}</b><small>${t('fg.assign')}</small></span>
        <span class="fg-stat" title="${t('dp.attrTitle')}">${attr}</span>
        <span class="fg-stat">${t('fg.quality')} <b>—</b></span>
        <span class="fg-sp"></span><span class="todo-badge">${t('todo.badge')}</span>`);
    const re = el('button', 'btn sm', t('fg.reassign'));
    re.onclick = () => { flash('todo.lead'); render(); };
    as.appendChild(re);
    p.appendChild(as);

    /* ⚠ 시안 2026-09-03 — 세그먼트 2 를 **좌우 두 박스**로 바꿔 본다 (사용자 요청).
       둘을 한 화면에 같이 놓는 대신 각자 폭이 절반이 되므로, 강화 안쪽 「목록 | 작업 패널」 2단은
       박스 안에서 **세로로 접힌다**(`.fg-box .fg-work`) */
    // 박스 (ADR-0097) — 제목 · 배치 줄은 서 있고 두 칸 영역이 박스 끝까지 서며 넘치면 스크롤한다
    const split = el('div', 'fg-split box-body');
    split.dataset.keep = 'forge';

    const craft = el('div', 'fg-box');
    craft.appendChild(el('h3', 'fg-boxh', `${t('fg.seg.craft')} <small class="todo-badge">${t('todo.badge')}</small>`));
    craft.appendChild(el('div', 'note-body muted', t('todo.lead')));
    split.appendChild(craft);

    const up = el('div', 'fg-box');
    up.appendChild(el('h3', 'fg-boxh', t('fg.seg.up')));
    forgeUpgrade(up);
    split.appendChild(up);

    p.appendChild(split);
    main.appendChild(p);
}

/** 강화 세그먼트 — 왼쪽 목록(착용 + 가방) · 오른쪽 작업 패널 (SCREEN_DESIGN §8-2) */
function forgeUpgrade(p) {
    // 착용 판정 — 어느 영웅이든 끼고 있으면 착용이다. 강화는 **소유물에 하는 일**이라 둘 다 대상이다
    const worn = new Set();
    for (const h of G.heroes) for (const uid of Object.values(h.equipped ?? {})) if (uid) worn.add(uid);
    // 창고 것도 강화 대상이다 [2026-09-11 v24 · item_design §1] — 창고에서 바로 장착되는 이상 강화도 같아야 한다
    const owned = [...new Set([...worn, ...G.bag, ...(G.stash ?? [])])].map(itemOf).filter(Boolean)
        .filter(x => !state.forgeFilter || x.slot === state.forgeFilter);

    const work = el('div', 'fg-work');

    const left = el('div', 'fg-col');
    const tools = el('div', 'items-tools');
    const filter = el('div', 'segmented');
    for (const f of [{ id: null, label: t('eq.filter.all') }, ...D.slots.map(x => ({ id: x.id, label: x.icon, title: L(x) }))]) {
        const b = el('button', `btn sm${state.forgeFilter === f.id ? ' on' : ''}`, f.label);
        if (f.title) b.title = f.title;
        b.onclick = () => { state.forgeFilter = f.id; render(); };
        filter.appendChild(b);
    }
    tools.appendChild(filter);
    tools.appendChild(el('span', 'items-meta muted', t('fg.count', { n: owned.length })));
    left.appendChild(tools);

    const list = el('div', 'fg-list');
    list.dataset.keep = 'forge-list';   // 줄을 눌러 다시 그려도 목록 스크롤이 남는다 (ADR-0097)
    if (!owned.length) list.appendChild(el('div', 'fg-pick', t('fg.empty')));
    for (const x of owned) {
        const u = SYS.game.upgradeState(G, x.uid);
        const row = el('div', `fg-row${state.forgeItem === x.uid ? ' on' : ''}`, `
            <span class="fg-ic">${itemImg(x)}</span>
            <span class="fg-n" style="color:${rarity(x.rarity).color}">${u.up > 0 ? `+${u.up} ` : ''}${L(x.name)}
                <small class="fg-sub">${L(slotDef(x.slot))} · ilvl ${x.ilvl} · ${worn.has(x.uid) ? t('fg.worn') : t('fg.bag')}</small></span>
            <span class="fg-up">${u.cost == null ? t('fg.upMax', { up: u.up }) : `+${u.up}`}</span>`);
        row.onclick = () => { state.forgeItem = x.uid; render(); };
        list.appendChild(row);
    }
    left.appendChild(list);
    work.appendChild(left);

    const right = el('div', 'fg-col');
    const it = owned.find(x => x.uid === state.forgeItem) ?? owned[0];
    if (!it) right.appendChild(el('div', 'fg-pick', t('fg.pick')));
    else {
        const us = SYS.game.upgradeState(G, it.uid);
        const eff = SYS.item.effective(it);        // 먹인 값 — 툴팁·캐릭터 시트와 같은 숫자여야 한다 (§6)
        const grp = SYS.item.groupOf(it);
        right.appendChild(el('div', 'fg-head', `
            <span class="fg-ic">${itemImg(it)}</span>
            <span><span class="fg-title" style="color:${rarity(it.rarity).color}">${us.up > 0 ? `+${us.up} ` : ''}${L(it.name)}</span>
            <span class="fg-meta">${L(rarity(it.rarity))} · ${L(slotDef(it.slot))} · ilvl ${it.ilvl} · ${worn.has(it.uid) ? t('fg.worn') : t('fg.bag')}</span></span>`));

        /* `+`강화 — 핍이 진행을, 버튼 옆 수치가 다음 비용을 든다.
           ⚠ 「베이스 능력치 현재 → 다음」은 아직 못 그린다: `upgradeState` 가 다음 값을 안 주고
              렌더러는 공식을 갖지 않는다 (ui 원칙 2 · DEV_PLAN R34). 현재 값만 찍는다 */
        const plus = el('div', 'fg-block');
        plus.appendChild(el('h3', '', t('fg.plus.h')));
        const pips = el('div', 'fg-pips');
        for (let i = 0; i < us.max; i++) pips.appendChild(el('i', `fg-pip${i < us.up ? ' on' : ''}`));
        plus.appendChild(pips);
        plus.appendChild(el('div', 'fg-val', grp
            ? `<span>${t('st.atk')}</span><b>${eff.watk}</b>`
            : `<span>${t('fg.base')}</span><b>${eff.implicit ? affixText(eff.implicit) : '—'}</b>`));
        const act = el('div', 'fg-act');
        const go = el('button', 'btn primary sm', us.cost == null ? t('fg.upMax', { up: us.up }) : t('fg.go'));
        go.disabled = !us.canUpgrade;
        go.onclick = () => {
            const r = SYS.game.upgradeItem(G, it.uid);
            if (!r.ok) flash(`ch.err.${r.err}`);
            else {
                // 어느 옵션이 올랐는지는 굴림이라, 말해 주지 않으면 목록을 눈으로 대조해야 한다 (§8-2)
                if (r.affix) flash('ch.upgraded.affix', {
                    n: r.up, g: r.cost, a: L(M.statLabel(r.affix.stat)),
                    from: M.statValue(r.affix.stat, r.affix.from), to: M.statValue(r.affix.stat, r.affix.to),
                });
                else flash('ch.upgraded', { n: r.up, g: r.cost });
                save();
            }
            render();
        };
        act.appendChild(go);
        act.appendChild(el('span', `fg-cost${us.cost != null && us.gold < us.cost ? ' no' : ''}`,
            us.cost == null ? '' : `${us.cost.toLocaleString()} G`));
        plus.appendChild(act);
        right.appendChild(plus);

        /* 옵션강화 — `game_logic` 에 없다. 옵션 목록은 **실제 접사**를 그대로 그리고(거짓 수치 금지),
           「올린 횟수」는 세이브가 안 들고 있어 아직 못 찍는다 (DEV_PLAN R34) */
        const opt = el('div', 'fg-block');
        opt.appendChild(el('h3', '', `${t('fg.opt.h')} <small class="todo-badge">${t('todo.badge')}</small>`));
        const ol = el('div', 'fg-opts');
        const affs = it.affixes ?? [];
        if (!affs.length) ol.appendChild(el('div', 'muted', t('fg.noAffix')));
        for (const a of affs) ol.appendChild(el('div', '', affixText(a)));
        opt.appendChild(ol);
        const oact = el('div', 'fg-act');
        const ogo = el('button', 'btn sm', t('fg.optGo'));
        ogo.onclick = () => { flash('todo.lead'); render(); };
        oact.appendChild(ogo);
        opt.appendChild(oact);
        right.appendChild(opt);
    }
    work.appendChild(right);
    p.appendChild(work);
}

/**
 * 상점 탭 — 상단 · 기본상단 · 특수상단 (SCREEN_DESIGN §8-3 · 기획 base_expedition_design §2-6).
 * 2026-09-03 사용자 지시로 마을의 칸에서 자기 탭이 됐다 — **탭 이름은 「상점」(활동), 패널 머리는
 * 「상단」(장소 — `dp.post.trade`)** 으로 강화 탭(§8-2)과 같은 갈림이다.
 * ⚠ **통째로 목업이다** — 방문 주기 · 체류 · 가격 · 재고가 기획에 하나도 없어서(GAME_DESIGN §10)
 * 데이터는 `mock.js:TRADE` 가 들고, 버튼은 누르면 미착수 안내만 낸다. 확정되면 상수와 이 함수를 함께 지운다.
 *
 * **세로 2단인 이유** — 둘은 배타가 아니다(기본상단은 늘 열려 있고 특수상단이 그 위에 얹힌다).
 * 세그먼트로 가르면 상주하는 창구가 클릭 뒤로 숨는다. 제련소(§8-2)가 세그먼트인 것과 갈리는 지점이다.
 */
function renderShop(main) {
    const p = el('div', 'panel town-bg page');
    // 박스 (ADR-0097) — 제목은 서 있고 기본상단 · 특수상단 · 각주가 본문으로 스크롤한다
    const body = el('div', 'box-body');
    body.dataset.keep = 'shop';
    p.appendChild(el('h2', '', `${t('dp.post.trade')} <small class="todo-badge">${t('todo.badge')}</small>`));

    /* 기본상단 — 상주라 **타이머를 안 그린다**. 「언제 가도 같다」가 이 층의 전부다 */
    const basic = el('div', 'td-sec');
    basic.appendChild(el('h3', 'td-h', t('td.basic')));
    basic.appendChild(tradeRows(M.TRADE.basic));
    body.appendChild(basic);

    /* 특수상단 — 방문 상태 줄이 머리에 선다. **비어 있어도 자리를 지킨다**(§4-1 「값은 항상 찍는다」).
       ⚠ 재촉 연출을 붙이지 않는다 — 남은 시간은 정보이지 압박이 아니다. 지나간 상인도 세지 않는다
       (기획 §2-6 의 방치형 계약 규칙 셋이 화면에 걸리는 자리) */
    const sp = M.TRADE.special;
    const spec = el('div', 'td-sec');
    spec.appendChild(el('h3', 'td-h', t('td.special')));
    spec.appendChild(el('div', `td-state${sp.here ? ' on' : ''}`,
        sp.here ? `<b>${L(sp.who)}</b><span>${t('td.here', { t: sp.t })}</span>`
            : `<b>—</b><span>${t('td.away', { t: sp.t })}</span>`));
    if (sp.here) spec.appendChild(tradeRows(sp.stock));
    body.appendChild(spec);

    body.appendChild(el('div', 'td-note muted', t('td.noEquip')));
    p.appendChild(body);
    main.appendChild(p);
}

/**
 * 의뢰 카드 — 종류 배지가 첫인상이고, 그 아래 「어떻게 도는가」 한 줄이 시간축을 든다 (§14).
 * 게시판이 서는 자리는 **선술집 탭**이다 (§8-1 이동 2026-09-03) — 옛 의뢰 탭은 폐지됐고
 * `renderCommission` 도 같이 지웠다. 데이터는 **CSV 두 표**다 — `commission_kind.csv`(유형 둘 ·
 * 확정 기획)와 `commission.csv`(게시판 행 · ⚠임시 자리채움). **칸 수 = 행 수**로 `tactic_slot` 과
 * 같은 문법이라 화면이 개수를 박지 않는다.
 * ⚠ 기능은 아직 없다 — 굴림 · 수락/진행 · 처치 카운터 · 명성 정산이 `game_logic` 에 없어 누르면 안내만 뜬다.
 * **의뢰는 열리지 않는다 — 받아 두는 목표다** [전면 개정 2026-09-07] — ~~넷(사냥·파견·약탈·보호)~~ → **둘**:
 * 처치(전투가 센다) · 수집(드롭·파견·탐험 산출이 채운다). 「파티를 보내는」 가는 형은 폐지됐고
 * 약탈·보호는 **탐험**으로 이관됐다 (base_expedition_design §1-3 · DEV_PLAN R45).
 * 그래도 종류가 이름보다 먼저 읽혀야 한다 — 무엇이 목표를 채우는지가 카드의 첫인상이다.
 * **이름·설명은 CSV 의 `_kr`/`_en` 쌍**이라 `L()` 로 푼다.
 */
function commissionCard(c) {
    const k = D.commissionKinds[c.kind];
    const card = el('div', `cm-card k-${c.kind}`);
    card.appendChild(el('div', 'cm-kind', L(k)));
    card.appendChild(el('div', 'cm-how', L(k.how)));
    card.appendChild(el('div', 'cm-goal', L(c.goal)));

    const rew = el('div', 'cm-rew', `
        <span class="cm-gold">${c.gold.toLocaleString()} G</span>
        <span class="cm-fame">${t('cm.fame')} +${c.fame}</span>`);
    card.appendChild(rew);

    const b = el('button', 'btn sm cm-go', t('cm.accept'));
    // 미착수 안내는 새 문구가 아니라 도움말·미착수 화면이 쓰던 키 그대로다 (ui 원칙 4 · §11)
    b.onclick = () => { flash('todo.lead'); render(); };
    card.appendChild(b);
    return card;
}

/** 품목 줄 — 이름 · 수량 · 가격 · [사기]. 살 수 없으면 가격이 빨강 (SCREEN_DESIGN §8-3) */
function tradeRows(list) {
    const box = el('div', 'td-list');
    for (const it of list) {
        const poor = G.resources.gold < it.gold;
        const row = el('div', 'td-row', `
            <span class="td-n">${L(it.name)}<small>${t('td.stock', { n: it.n })}</small></span>
            <span class="td-gold${poor ? ' no' : ''}">${it.gold.toLocaleString()} G</span>`);
        const b = el('button', 'btn sm', t('td.buy'));
        // 미착수 안내는 새 문구가 아니라 도움말·미착수 화면이 쓰던 키 그대로다 (ui 원칙 4 · §11)
        b.onclick = () => { flash('todo.lead'); render(); };
        row.appendChild(b);
        box.appendChild(row);
    }
    return box;
}

/* ═══════════ 도감 — 몬스터 카드 모델 (monster_design §8) ═══════════
   레벨·필요 장수 계산은 SYS.game(codex_level.csv). 여기는 카드 수를 읽어 그리기만 한다 */

const codexLv = cards => SYS.game.codexLevel(cards);
/** 레벨별 누적 문턱 — 진행 막대용 (codex_level.csv 의 cards_to_next 는 레벨당 장수라 누적한다) */
const codexCum = () => D.codexLevels.reduce((a, r) => (a.push((a[a.length - 1] ?? 0) + r), a), []);
function stageBonus(stage) {
    const total = stage.monsters.reduce((a, m) => a + SYS.game.codexBonusAt(codexLv(m.cards)), 0);
    const complete = stage.monsters.every(m => codexLv(m.cards) === SYS.game.codexMaxLevel());
    return { total, complete };
}

function monsterCard(m) {
    const cum = codexCum();
    const lv = codexLv(m.cards);
    const maxLv = cum.length;
    const next = cum[lv] ?? null;
    const prev = lv > 0 ? cum[lv - 1] : 0;
    const pct = next ? Math.min(100, (m.cards - prev) / (next - prev) * 100) : 100;
    const src = monsterFace(m.id);
    const name = L(monsterName(m.id));
    const c = sinColor(monsterSin(m.id));
    // 초상 밑에 아무것도 깔지 않는다 — 아트가 없으면 빈 원이다 (2026-09-06 사용자 지시 · faceChip 과 같은 규칙).
    // **툴팁은 파일명**이다 (2026-09-08 · §9) — 옛 이미지 도감의 「몬스터 초상」 타일이 들고 있던 한 줄이 여기로 왔다.
    // 같은 그림을 한 탭에서 두 번 그리지 않으면서 「어느 파일이 안 들어왔나」는 남긴다
    const faceHtml = src
        ? `<span class="face${m.boss ? ' boss' : ''}" title="${src.split('/').pop()}"><img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()"></span>`
        : `<span class="face none${m.boss ? ' boss' : ''}" style="background:${c}22;border-color:${c}66" title="${t('face.noArt', { name })}"></span>`;
    const pips = Array.from({ length: maxLv }, (_, i) =>
        `<span class="pip${i < lv ? ' on' : ''}" title="${t('cx.lvTitle', { lv: i + 1 })} · ${t('cx.cards', { n: cum[i] })}"></span>`).join('');
    return `
        <div class="mon-card${m.boss ? ' boss' : ''}${lv === maxLv ? ' maxed' : ''}">
            ${faceHtml}
            <div class="mon-body">
                <div class="mon-top">
                    <span class="mon-name">${name}${m.boss ? `<span class="b-tag">${t('kind.boss')}</span>` : ''}</span>
                    <span class="mon-kills" title="${t('cx.lvTitle', { lv })}"><b>${t('cx.cards', { n: m.cards })}</b></span>
                </div>
                <div class="mon-mid">
                    <span class="pips">${pips}</span>
                    <span class="mon-next muted">${t('cx.kills', { n: m.kills.toLocaleString() })} · ${next
                        ? `${t('cx.next', { n: next })} <span class="up">+${D.codexBonus[lv] ?? 0}%</span>`
                        : `<span class="up">${t('cx.max')}</span>`}</span>
                </div>
                <div class="bar"><i style="width:${pct}%"></i></div>
            </div>
        </div>`;
}

/* 세그먼트 넷 — 순서는 SCREEN_DESIGN §9 의 표와 같다. 몬스터만 수집 화면이고 나머지 셋은 자산 훑기다(§9-1) */
const CODEX_SEGS = ['monster', 'character', 'item', 'skill'];

/**
 * 도감 (SCREEN_DESIGN §9 · 개정 2026-09-08 사용자 지시 — 「이미지 도감」 탭 흡수).
 * 세그먼트는 **제목 줄 자리를 같이 쓴다**(`.panel-nav` — §2): 탭 둘을 하나로 합치면서 세로가 한 줄도 안 늘게 하는 자리다.
 * 챕터 세그먼트는 종전대로 그 아래 서브 바에 선다.
 */
function renderCodex(main) {
    const p = el('div', 'panel page');     // 박스 (ADR-0097) — 세그먼트 줄 · 도구 줄은 서 있고 목록 · 묶음이 본문으로 스크롤한다
    const nav = el('div', 'panel-nav');
    nav.appendChild(segmented(CODEX_SEGS.map(id => ({ id, label: t(`cx.seg.${id}`) })), state.codexSeg,
        id => { state.codexSeg = id; render(); }));
    nav.appendChild(el('h2', '', t('nav.codex')));
    p.appendChild(nav);
    ({ monster: codexMonster, character: codexCharacter, item: codexItem, skill: codexSkill })[state.codexSeg](p);
    main.appendChild(p);
}

/** 얼굴 스타일 고르개 — 몬스터 · 캐릭터 세그먼트가 같이 쓴다. 전환은 **전역**이다(`?face=` · localStorage 와 같은 자리 — §9-1) */
function faceStylePicker(box) {
    box.appendChild(el('span', 'muted', t('ix.style')));
    box.appendChild(segmented(M.FACE_STYLES.map(f => ({ id: f, label: f })), M.faceStyle(),
        id => { M.setFaceStyle(id); render(); }));
    return box;
}

/** 몬스터 세그먼트 — 카드 수집 (§9). 카드·처치 수는 실집계(G.codexCards / G.codexKills) */
function codexMonster(p) {
    const ch = chapterOf(state.codexChapter) ?? D.chapterList[0];
    // **해금은 안 본다** — 전 챕터·전 몬스터를 그대로 그린다 (SCREEN_DESIGN §9, 2026-09-06)
    const stages = codexStages().filter(st => st.chapter === ch.id).map(st => ({
        ...st, stat: M.CX_STAT[st.num], completion: M.CX_DONE[st.num],
        monsters: st.monsters.map(m => ({ ...m, cards: G.codexCards[m.id] ?? 0, kills: G.codexKills[m.id] ?? 0 })),
    }));

    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(D.chapterList.map(c => ({ id: c.id, label: `Ch${c.id} ${L(c.name)}`, color: sinColor(c.sin) })), ch.id,
        id => { state.codexChapter = id; render(); }));
    // 오른쪽에 죄종 + 얼굴 스타일 — 여기가 몬스터 초상을 가장 크게 그리는 화면이라 스타일 고르개가 같이 선다 (§9)
    const right = el('div', 'ix-style');
    right.appendChild(el('span', 'muted', `${t('cx.sinLabel')} <b style="color:${sinColor(ch.sin)}">${sinName(ch.sin)}</b>`));
    faceStylePicker(right);
    bar.appendChild(right);
    p.appendChild(bar);
    const body = el('div', 'box-body');
    body.dataset.keep = 'codex:monster';
    p.appendChild(body);

    for (const stage of stages) {
        const { total, complete } = stageBonus(stage);
        const row = el('div', 'codex-stage');
        // 계열이 없는 스테이지(챕터보스 단독 5스테이지)는 보정 칸이 **빈 칸**이다 — 계열 배정이 기획 미정이라(GAME_DESIGN §10)
        //   라벨을 지어내지 않는다. 합산도 안 되므로(`codexBonus` 가 그 스테이지 번호를 건너뛴다) 숫자도 안 찍는다 (2026-09-11)
        const gain = stage.stat
            ? `<span class="up">${L(stage.stat)} +${total.toFixed(1)}%</span>
                    <span class="muted"> · ${t('cx.completion')} ${complete ? `<span class="up">${L(stage.completion)}</span>` : L(stage.completion)}</span>`
            : '<span class="muted">—</span>';
        row.innerHTML = `
            <div class="cs-head">
                <div class="cs-title"><span class="muted">${stage.num}</span> ${L(stage.name)}</div>
                <div class="cs-gain">${gain}</div>
            </div>
            <div class="mon-strip">${stage.monsters.map(m => monsterCard(m)).join('')}</div>`;
        body.appendChild(row);
    }
}

/* ═══════════ 도감의 자산 세그먼트 — 캐릭터 · 아이템 · 스킬 (SCREEN_DESIGN §9-1) ═══════════
   신설 2026-09-06 「이미지 도감」 탭 · 도감으로 흡수 2026-09-08 (둘 다 사용자 지시).
   게임이 부르는 그림을 묶음별로 전부 펼친다. 아트를 넣고 확인하려면 그 그림이 나오는 화면까지 가야 하기 때문이다 —
   영웅 초상은 제 직업 풀이 뽑혀야 하고, 아이템은 그 부위가 드롭돼야 보고, 스킬 아이콘은 그 스킬을 배워야 뜬다.

   ⚠ **폴더를 읽는 화면이 아니다.** 목록의 SSOT 는 `mock.js` 의 경로 조립 상수(HERO_FACES ·
   ITEM_ART_GROUPS · ITEM_ART_BY_SLOT · SLOT_ART_PARTS · SKILL_ICON_FILES)와 `skill.csv` 다 — 렌더는 동기라
   파일 유무를 물을 수 없다(`skillIcon` 주석과 같은 이유). 코드가 안 부르는 파일(`faces/example/` 시트 ·
   `icons/items/unused/`)은 게임이 안 쓰므로 여기에도 안 뜬다. 파일이 없으면 `onerror` 로 img 만 빠져
   **빈 칸 + 파일명**이 남고, 그 빈 칸이 「이 자산이 비었다」는 신호다 (스타일마다 갖춘 장수가 다르다).

   ⚠ **몬스터 초상 묶음은 09-08 삭제** — 몬스터 세그먼트의 카드가 전 챕터·전 몬스터를 큰 초상으로 그린다(§9).
   타일이 들고 있던 파일명 한 줄만 그 카드 초상의 툴팁으로 옮겼다. */

/**
 * 타일 하나 — 그림 · 쓰임 이름 · 파일명. 마스크는 **게임에서 쓰는 것 그대로**다(네모 = 영웅·아이템·스킬 / 원형 = 몬스터 · §5 · §9).
 * `attr` 은 타일에 얹을 여분 속성 — **스킬만 쓴다**(`data-skill`). 격자를 문자열로 짓기 때문에 노드가 없어서,
 * 툴팁은 DOM 이 선 뒤에 이 속성을 찾아 건다 (`codexSkill`).
 * `stem` 이면 파일명에서 확장자를 뗀다 — **조밀 격자(스킬)만 쓴다**(ADR-0075). 칸이 좁아 `.png` 가 두 줄을 만들고,
 * 전부 png 라 그 넉 자가 말해 주는 것이 없다. 비교 대상은 어차피 스킬 id 와 **줄기**다
 */
const artTile = (src, name, shape, attr = '', stem = false) => `
    <div class="ix-tile" ${attr}>
        <span class="ix-art ${shape}">${src ? `<img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()">` : ''}</span>
        <span class="ix-name">${name}</span>
        <span class="ix-file muted">${src ? (f => stem ? f.replace(/\.[^.]+$/, '') : f)(src.split('/').pop()) : '—'}</span>
    </div>`;

/** 그룹 하나 — 머리(이름 · 폴더 경로 · 장수) + 타일 격자 */
const artGroup = (title, dir, tiles) => `
    <div class="ix-group">
        <div class="ix-head">
            <span class="ix-title">${title}</span>
            <span class="ix-dir muted">${dir}</span>
            <span class="muted">${t('ix.count', { n: tiles.length })}</span>
        </div>
        <div class="ix-grid">${tiles.join('')}</div>
    </div>`;

/** 캐릭터 세그먼트 — 영웅 초상. 얼굴 스타일 고르개가 여기와 몬스터 세그먼트에 선다 (§9-1) */
function codexCharacter(p) {
    const bar = el('div', 'sub-bar');
    bar.appendChild(faceStylePicker(el('div', 'ix-style')));
    p.appendChild(bar);
    const dir = M.faceDir();
    // 영웅 초상은 **직업 풀**이다 (2026-09-07) — 목록의 SSOT 는 `mock.js:HERO_FACES`.
    // **직업 하나가 묶음 하나**다 (ADR-0066) — 순서는 `class.csv` 행 순이고 **빈 묶음은 안 그린다**.
    //   스킬 세그먼트(`codexSkill`)와 **같은 문법**이다: 한 화면에서 두 세그먼트가 다르게 묶이지 않는다.
    //   타일 이름은 **초상 이름**(`mock.js:HERO_FACE_NAMES`)이고, 이름이 안 붙은 초상만 **풀 번호**로 남는다
    //   (ADR-0081). 직업은 어느 쪽이든 안 적는다 — 그룹 머리가 이미 말한다(스킬 타일이 출처 칩을 뗀 것과 같은 이유).
    //   ⚠ 번호가 사라지는 것이 아니다 — 셋째 열의 파일명(`hero_warrior_1.png`)이 그 번호를 계속 든다
    const box = el('div', 'ix-body box-body');
    box.dataset.keep = 'codex:character';
    box.innerHTML = (D.classes ?? []).map(c => {
        const n = M.HERO_FACES[c.id] ?? 0;
        const tiles = Array.from({ length: n }, (_, i) =>
            artTile(`${dir}hero_${c.id}_${i + 1}.png`, L(M.HERO_FACE_NAMES[`${c.id}_${i + 1}`]) || `${i + 1}`, 'box'));
        return tiles.length ? artGroup(t('ix.g.heroCls', { cls: className(c.id) }), dir, tiles) : '';
    }).join('');
    p.appendChild(box);
}

/** 아이템 세그먼트 — 무기 · 방어구/장신구 · 빈 칸 실루엣 (§9-1) */
function codexItem(p) {
    const box = el('div', 'ix-body box-body');
    box.dataset.keep = 'codex:item';
    box.innerHTML = artGroup(t('ix.g.weapon'), M.ITEM_ART_DIR,
        M.ITEM_ART_GROUPS.map(g => artTile(M.itemArt('weapon', g), L(D.weaponGroups?.[g] ?? g), 'box')))
        // 무기 베이스 — **여기는 재고를 보는 자리**라 무기군마다 7장을 전부 편다(uid 가 없으니 `weaponBaseArt` 를 직접 부른다).
        //    실제 드롭은 개체마다 이 중 하나를 든다 (mock.js:itemArt · uid 해시 · §9-1). 무기군 하나 = 묶음 하나(ADR-0066 문법과 동일)
        + Object.keys(M.WEAPON_BASE_STEMS).map(g =>
            artGroup(t('ix.g.weaponBase', { group: L(D.weaponGroups?.[g] ?? g) }), `${M.WEAPON_BASE_DIR}${g}/`,
                //    확장자를 뗀다 — 베이스 이름이 길어 `.png` 가 붙으면 칸에서 두 줄이 된다 (스킬 세그먼트와 같은 처방 · ADR-0075)
                M.WEAPON_BASE_STEMS[g].map(s => artTile(M.weaponBaseArt(g, s), t(`ix.b.${s}`), 'box', '', true)))
          ).join('')
        // ⚠ 부위 하나에 그림 하나 — 개체가 베이스 id 를 안 들고 다녀서다 (mock.js:itemArt · 임시)
        + artGroup(t('ix.g.armor'), M.ITEM_ART_DIR,
            Object.keys(M.ITEM_ART_BY_SLOT).map(sl => artTile(M.itemArt(sl), L(slotDef(sl) ?? sl), 'box')))
        + artGroup(t('ix.g.empty'), M.SLOT_ART_DIR,
            M.SLOT_ART_PARTS.map(sl => artTile(M.slotArt(sl), L(slotDef(sl) ?? sl), 'box')));
    p.appendChild(box);
}

/**
 * 스킬 세그먼트 — `skill.csv` 전 행을 **직업으로 묶는다** (§9-1 개정 2026-09-08 사용자 지시).
 * **[개정 2026-09-09 — 1스킬 = 1직업]** 묶는 일이 `owner_id` 하나로 끝난다. ~~무기군 액티브를 그 직업 그룹에
 * 함께 세우던 갈래~~ 는 무기군 고정 폐기(skill_design §12-1 규칙 2)로 사라졌다 — 무기는 이제 **직업 풀의 스킬을
 * 담는 그릇**이라 도감에 따로 설 것이 없다(어느 스킬이 어느 무기에 붙었는지는 그 무기의 툴팁이 답한다).
 * 행이 0개인 직업은 그룹째 안 선다 — 「0장인 직업은 타일이 없다」(영웅 초상)와 같은 규칙이다.
 *
 * 아이콘은 **게임이 부르는 그림 그대로**다: `skillIcon` 은 제 파일이 없으면 해시 폴백으로 남의 그림을 잡는다
 * (`slotArt`·`itemArt` 와 다르다 — 스킬은 「제 그림은 아니어도 늘 같은 그림」이면 되기 때문).
 * 그래서 여기서 빈 칸 신호는 그림이 아니라 **파일명 줄**이다 — 파일명이 스킬 id 와 다르면 아직 제 그림이 없다 (§9-1).
 */
function codexSkill(p) {
    const rows = D.skillRows ?? [];
    // 출처 칩은 안 단다 — 그룹 머리가 이미 직업을 말하고, `owner_kind` 는 이제 전부 `job` 이라 더 말해 주는 것이 없다
    const tile = r => artTile(M.skillIcon(r.skill_id), L(skillInfo(r.skill_id).name), 'box', `data-skill="${r.skill_id}"`, true);

    // **조밀 격자** — 직업 다섯이 한 화면에 다 선다 (ADR-0075). 그림만 작아지고 묶는 문법 · 타일이 든 것은 그대로다
    const box = el('div', 'ix-body dense box-body');
    box.dataset.keep = 'codex:skill';
    box.innerHTML = (D.classes ?? []).map(c => {
        // 그룹 안의 순서는 CSV 순(= priority 순)을 그대로 쓴다
        const tiles = rows.filter(r => r.owner_kind === 'job' && r.owner_id === c.id).map(r => tile(r));
        return tiles.length ? artGroup(t('ix.g.skillCls', { cls: className(c.id) }), M.SKILL_ICON_DIR, tiles) : '';
    }).join('');
    p.appendChild(box);

    // 툴팁은 DOM 이 선 **뒤에** 건다 (격자가 문자열이라 노드가 없다). 카드는 캐릭터 탭 · 관전과 같은 것을 그대로 부른다 —
    // 화면 전용 문구를 새로 쓰지 않는다 (§12 · tip.js:skillTipCard). 전투 맥락(주기 · 공격력)은 없으므로 문장이 그 조각을 접는다
    for (const n of box.querySelectorAll('[data-skill]'))
        bindTipNode(n, () => skillTipCard({ id: n.dataset.skill }, { source: n.dataset.src }));
}

/* ═══════════ 도움말 ═══════════
   2026-08-26 사용자 지시 — 인게임 패널에는 설명 문장을 두지 않는다. 규칙·근거·미구현 안내는 전부 이 탭으로 모았다.
   문구를 **새로 쓰지 않는다**: 각 패널이 쓰던 i18n 키를 같은 파라미터로 그대로 렌더한다 (SCREEN_DESIGN §12).
   본문은 박스 안에서 스크롤(ADR-0097) + 섹션마다 점프 버튼 하나. 그 외 장식 없음. */

/** 섹션 — {title, lead?, groups:[{h, sub?, body:[]}]}. **순서는 탭 순서를 따른다** (§12 개정 2026-09-04):
    원정 · 캐릭터 · 스킬 · 선술집 · 자원 · 탐험 · 연구 · 도감 · 새 게임.
    강화 · 상점은 탭이지만 섹션이 없고(옮겨 둔 문구가 없다), 스킬 · 새 게임은 탭이 아니지만 섹션이 있다 */
function helpSections() {
    const h = heroById(state.heroUid);
    const B = D.balance;
    const sin = sinName(h.sin);
    const cls = className(h.cls);
    const rounds = { e: D.eliteRounds.join('·'), b: D.bossRound };
    return [
        {
            title: t('nav.expedition'),
            lead: t('exp.oneParty'),
            groups: [
                { h: t('exp.party.h'), sub: t('help.exp.party', { n: B.party_size_max, m: B.concurrent_expedition_parties }), body: [t('exp.party.note')] },
                { h: t('exp.bench.h'), sub: t('help.exp.bench', { n: G.heroes.length, cap: B.roster_cap }), body: [t('exp.bench.note')] },
                { h: t('exp.zones.h'), sub: t('exp.zones.sub', { r: SYS.battle.stageRounds(D.stageList[0]).length }), body: [t('exp.zones.note', rounds)] },
                { h: t('exp.repeat'), body: [t('exp.repeat.sub')] },
                { h: t('exp.seg.battle'), body: [t('bt.note')] },
                { h: t('exp.seg.report'), sub: t('rep.log.sub', rounds), body: [t('rep.contract'), t('rep.injuryNote')] },
            ],
        },
        {
            title: t('nav.character'),
            groups: [
                { h: t('ch.gear.h'), body: [t('eq.slots')] },
                { h: t('eq.sins.h'), body: [t('eq.sins.note')] },
                { h: t('ch.attr.h'), sub: t('ch.attr.sub'), body: [t('ch.attr.note')] },
                { h: t('ch.detail.h'), body: [t('ch.detail.note')] },
                { h: t('ch.items.h'), body: [t('ch.equip.hint'), t('ch.salvageHint'), t('ch.upgradeHint', { n: B.equip_upgrade_option_interval }), t('eq.inv.note')] },
            ],
        },
        {
            // 스킬은 탭을 잃고도 섹션으로 남는다 — 게임의 개념이지 탭 이름이 아니고, 여는 자리가 캐릭터 탭 안이라 바로 뒤에 선다 (§12)
            title: t('nav.skill'),
            lead: t('sk.grid.note'),
            groups: [
                { h: t('sk.points.h'), body: [t('sk.points.note'), t('ch.noTrees')] },
                { h: t('sk.slots.h'), sub: t('sk.slots.sub'), body: [t('sk.cycle.sub'), t('sk.slots.note')] },
                { h: t('sk.sinTree', { sin }), sub: t('sk.sinTree.sub', { sin }), body: [t('sk.sinTree.missing', { sin })] },
                { h: t('sk.mastery', { cls }), body: [t('sk.mastery.missing', { cls })] },
                { h: t('sk.advTree'), body: [t('sk.advTree.missing')] },
            ],
        },
        {
            // 선술집 = 마을에서 갈라져 나온 섹션 (탭을 되찾았으므로 · SCREEN_DESIGN §12 개정 2026-09-03).
            // 의뢰 묶음도 원정 섹션에서 여기로 이사했다 — 게시판이 이 탭 안에 서기 때문이다 (§8-1)
            title: t('nav.tavern'),
            groups: [
                { h: t('tv.h'), sub: t('tv.sub'), body: [t('tv.tiers.note')] },
                { h: t('tv.reroll.free'), body: [t('tv.reroll.note')] },
                { h: t('tv.uniqueTodo.h'), body: [t('tv.uniqueTodo.b')] },
                { h: t('exp.commission.h'), body: [t('exp.commission.note')] },
            ],
        },
        {
            // 자원 = 옛 마을 섹션에서 탐험이 빠진 나머지다 (§12 개정 2026-09-04). 남은 것은 벤치(파견 대기) 하나.
            // 강화 · 상점 탭은 여전히 섹션이 없다 — 도움말로 옮겨 둔 문구가 아직 없다(패널의 미착수 배지가 그 일을 한다)
            title: t('nav.resource'),
            groups: [
                { h: t('exp.bench.h'), body: [t('exp.bench.note')] },
            ],
        },
        {
            // 탐험이 탭이 되면서 섹션도 갈라져 나왔다 (§8-4 · §12 신설 2026-09-04). 문구는 옛 마을 섹션이 쓰던 키 그대로다
            title: t('nav.explore'),
            groups: [
                { h: t('ex.h'), body: [t('ex.todo')] },
            ],
        },
        {
            title: t('nav.research'),
            groups: [
                { h: t('rs.h'), sub: t('rs.open'), body: [t('rs.note'), t('rs.note.cond')] },
                { h: t('rs.research.h'), body: [t('rs.research.note')] },
            ],
        },
        {
            title: t('nav.codex'),
            groups: [
                { h: t('cx.h'), sub: t('cx.sub', { pct: B.codex_card_drop_pct, list: D.codexLevels.join(' · ') }), body: [t('cx.note')] },
            ],
        },
        {
            title: t('help.newgame'),
            groups: [
                { h: t('ng.title'), sub: t('ng.sub', { n: B.party_size_max }), body: [t('ng.startWeapon'), t('ng.note')] },
            ],
        },
    ];
}

function renderHelp(main) {
    const secs = helpSections();
    // panel — 다른 탭과 같은 바탕. 전역 거점 아트(body::before)가 글자 뒤로 비치면 본문을 읽을 수 없다
    const wrap = el('div', 'panel help page');
    wrap.appendChild(el('h1', '', t('help.title')));
    const heads = [];
    wrap.appendChild(segmented(secs.map((s, i) => ({ id: i, label: s.title })), null,
        i => heads[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
    // 박스 (ADR-0097) — 제목 · 점프 세그먼트는 서 있고 본문만 스크롤한다. 점프는 본문 안에서 움직인다
    const body = el('div', 'box-body help-body');
    body.dataset.keep = 'help';
    wrap.appendChild(body);
    for (const s of secs) {
        const head = el('h2', '', s.title);
        heads.push(head);
        body.appendChild(head);
        if (s.lead) body.appendChild(el('div', 'note-body', s.lead));
        for (const g of s.groups) {
            body.appendChild(el('h3', '', `${g.h}${g.sub ? ` <small>${g.sub}</small>` : ''}`));
            for (const line of g.body) body.appendChild(el('div', 'note-body', line));
        }
    }
    main.appendChild(wrap);
}

/* ═══════════ 한 장 ═══════════ */

/** 화면은 1600×800 한 장이다 — 창에 맞춰 **통째로** 줄이고 늘린다 (SCREEN_DESIGN §2 · ADR-0087).
 *  한 장의 크기는 CSS(`#stage`)가 든다 — 여기는 읽기만 한다 */
function fitStage() {
    const st = document.getElementById('stage');
    if (!st) return;
    const w = st.offsetWidth, h = st.offsetHeight;
    const s = Math.min(window.innerWidth / w, window.innerHeight / h);
    const x = Math.round((window.innerWidth - w * s) / 2), y = Math.round((window.innerHeight - h * s) / 2);
    st.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}

/* ═══════════ 부팅 ═══════════ */

async function boot() {
    // 한 장을 창에 맞춘다 — **G 가 없어도** 먼저(시작 화면도 한 장이다) · 창 크기가 바뀔 때마다 다시 (ADR-0087)
    fitStage();
    window.addEventListener('resize', fitStage);
    await loadData();
    state.candidates = rollCandidates();
    if (loadSave()) continueGame();
    // 창을 닫는 셋째 길 — 닫기 버튼 · 판 바깥 클릭 · 여기 (SCREEN_DESIGN §2 창 레이어). 한 번만 건다
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.modal) closeModal(); });

    // 개발용 — 헤드리스 검증에서 클릭 없이 흐름을 태운다
    const dev = new URLSearchParams(location.search).get('dev');
    const tab = new URLSearchParams(location.search).get('tab');
    if (new URLSearchParams(location.search).get('screen') === 'start') state.screen = 'start';
    // 관전 배치 — 버튼으로만 바뀌므로 헤드리스가 닿을 길을 따로 낸다 (2026-09-03 · SCREEN_DESIGN §10)
    if (new URLSearchParams(location.search).get('lay') === 'split') state.btLayout = 'split';
    // 도감 세그먼트 — 세그먼트는 클릭으로만 바뀌므로 헤드리스가 닿을 길을 따로 낸다 (SCREEN_DESIGN §9 · §10).
    // 옛 이름 `?ix=character|item` 은 이미지 도감 탭과 함께 죽었다 (2026-09-08)
    const cx = new URLSearchParams(location.search).get('cx');
    if (CODEX_SEGS.includes(cx)) state.codexSeg = cx;
    // 프롤로그는 새 게임 확정 버튼으로만 닿는 화면이라 헤드리스가 들어올 길을 따로 낸다 (SCREEN_DESIGN §10).
    //   `&s=n` 은 n번째 씬 — 마지막 씬에만 인용·챕터 줄이 서므로 그 상태에도 길이 있어야 한다
    if (dev === 'prologue') {
        if (!G) startGame();
        state.screen = 'prologue';
        state.proScene = Math.max(0, (Number(new URLSearchParams(location.search).get('s')) || 1) - 1);
    }
    if (dev === 'newgame' || (dev === 'battle' && !G)) startGame();
    // 새 게임은 **파티가 비어 있다** [2026-09-09 사용자 지시 · SCREEN_DESIGN §5] — 전투를 바로 도는 개발용 경로는
    //   편성을 대신 해 준다. 유저 흐름에서는 편성 패널이 그 일을 한다(§4-1). 로스터 순서라 리더도 첫 영웅이다
    const devParty = () => { if (G && G.party.length === 0) for (const h of G.heroes) SYS.game.toggleParty(G, h.uid, now()); };
    // `&runs=n` 이면 **연달아 n번** 정산한다 [2026-09-09] — 리포트의 런 목록(§4-3)은 줄이 하나면 고르는 결정이 없다.
    //   반복 원정이 만드는 상태(줄이 여럿 쌓인 목록)에 클릭 없이 닿는 유일한 길이다. 상한은 balance:report_keep
    if (dev === 'battle') {
        devParty();
        const runs = Math.min(Math.max(1, Number(new URLSearchParams(location.search).get('runs')) || 1), D.balance.report_keep);
        for (let i = 0; i < runs; i++) runBattle(D.stageOrder[0], { instant: true });
    }
    // `&tab=` 을 같이 주면 **관전을 켠 채 그 탭**을 연다 [2026-09-08] — 런이 도는 동안의 다른 탭 화면(예: 영웅 띠의
    // 「원정 중」 라벨 · SCREEN_DESIGN §5)은 이 길이 없으면 헤드리스가 못 닿는다.
    // 아레나는 안 뜨지만 **런은 계속 간다** — 시계를 앱이 들기 때문이다 (ADR-0074)
    if (dev === 'play') {
        if (!G) startGame();
        devParty();
        // `&rep=1` — **반복 원정을 켠 채** 출발한다 [2026-09-10]. 반복은 전진 패널의 토글로만 켜져서
        //   「런이 끝나면 다음 런이 저절로 선다」(ADR-0074)에 헤드리스가 못 닿았다 (§10 · ?dev=form 과 같은 장치)
        if (new URLSearchParams(location.search).get('rep') === '1') state.expRepeat = true;
        runBattle(D.stageOrder[0], { tab: new URLSearchParams(location.search).get('bt') });
        if (!TABS.includes(tab)) return;
    }
    if (dev === 'form') {   // **출정 창**이 열린 상태 — 창은 클릭으로만 열리므로 헤드리스가 닿을 길을 따로 낸다 (2026-09-10 · ADR-0084)
        if (!G) startGame();
        state.expStage = D.stageOrder[0];
        state.modal = 'depart';
        /* `&stage=<id>` — **다른 챕터의 패널**에 닿는 길 (2026-09-10 · §10). 후반 스테이지는 해금 전이라
           클릭이 거절되는데, 적 구성 칸(ADR-0078)의 몬스터 이름은 챕터마다 길어져
           **폭이 넘치는지는 그 화면에서만 보인다**(가장 긴 이름은 Ch7-4). 챕터도 같이 옮겨야 그 행이 그려진다 */
        const want = Number(new URLSearchParams(location.search).get('stage'));
        if (D.stages[want]) { state.expStage = want; state.expChapter = D.stages[want].chapter; }
        // `&open=0` — **창을 닫은 채** 목록만 본다. 창이 화면을 덮으므로 뒤의 스테이지 목록(§4-1)에 닿을 길이 따로 필요하다
        if (new URLSearchParams(location.search).get('open') === '0') state.modal = null;
        // 파티는 **기본으로 안 채운다** — 새 게임은 빈 편성이고 그것이 이 화면의 첫 상태다 (2026-09-09).
        //   `&party=full` 이면 채운다: 파티 테두리·리더 표시는 **클릭으로만** 만들어져 헤드리스가 못 닿는다 (§10)
        if (new URLSearchParams(location.search).get('party') === 'full') devParty();
    }
    if (dev === 'tree') {   // 스킬 창이 열린 캐릭터 탭 — 창은 버튼으로만 열린다 (SCREEN_DESIGN §7 · §10)
        if (!G) startGame();
        state.tab = 'character';
        state.modal = 'skill';
        // 새 게임의 영웅은 포인트가 0 이라 **창의 결정 둘 다**(찍기 · 우클릭 되돌리기)에 못 닿는다 — 칸이 전부 0/최대로 선다.
        // 한 칸을 상한까지 채울 만큼 주고 하나를 미리 찍어 둔다: 찍힌 칸과 안 찍힌 칸이 같이 보여야 화면을 읽을 수 있다
        const h0 = G.heroes[0];
        h0.masteryPoints = D.balance.mastery_t1_max_rank;
        const first = SYS.game.masteryState(G, h0.uid).nodes.find(n => n.canLearn);
        if (first) SYS.game.learnMastery(G, h0.uid, first.id);
    }
    if (dev === 'tactics') {   // 전술 칸이 전부 열린 상태 — 칸은 합산 레벨로만 열리므로 헤드리스가 닿을 길을 따로 낸다
        if (!G) startGame();
        // 마지막 칸의 문턱을 한 영웅에게 몰아 준다(문턱은 로스터 합산이라 이 한 줄이면 전부 열린다)
        G.heroes[0].level = SYS.tactic.slotList[SYS.tactic.slotCount - 1].unlockTotalLevel;
        state.tab = 'research';
    }
    /* 리포트의 **실시간 표**(§4-3 · ADR-0072) — 재생이 도는 채로 리포트를 연다.
       클릭으로 만들려면 출발 → 세그먼트 이동을 거쳐야 해서 헤드리스가 못 닿는다.
       `&at=n` 이면 그 초부터 — 표가 차 있는 상태를 바로 본다(0 이면 빈 표에서 시작) */
    if (dev === 'live') {
        if (!G) startGame();
        devParty();
        runBattle(D.stageOrder[0]);
        // 방금 뜬 아레나를 여기서 걷는다 — 안 걷으면 다음 render() 의 `stopBattle()` 이 재생 위치를 0 으로 덮어써 `&at=` 이 안 먹는다
        if (stopBattle) { stopBattle(); stopBattle = null; }
        const at = Number(new URLSearchParams(location.search).get('at'));
        if (at > 0 && state.battle) state.battle.resume = { t: at, speed: 1, running: true, tab: 'log', win: false };
        state.exp = 'report';
    }
    // `?dev=forge` · `?dev=trade` 는 삭제됐다 (2026-09-03 · SCREEN_DESIGN §10) — 강화·상점이 탭이 되어
    // `?tab=forge` · `?tab=shop` 이 바로 닿는다. `?dev=*` 는 클릭으로만 만들어지는 상태에 길을 내는 장치다
    /* 수색 — 세 상태(대기 · 수색 중 · 완료)가 **시간으로만** 갈리므로 헤드리스가 닿을 길을 낸다 (SCREEN_DESIGN §10).
       `&s=out` 은 갓 보낸 상태(첫 막만 열림) · `&s=mid` 는 중간 막까지 · 기본은 **완료**(결과 카드).
       보내는 사람은 로스터 첫 영웅이고, 시작 시각을 과거로 당겨 상태를 만든다 — `searchSend` 는 `now` 를 받는다 */
    if (dev === 'search') {
        if (!G) startGame();
        const span = D.balance.tavern_search_hours * 3600000;
        const back = { out: 0.05, mid: 0.5 }[new URLSearchParams(location.search).get('s')] ?? 1.2;
        // `&key=1` — 보내는 영웅의 죄종을 **소문에 맞춘다**. 열쇠 답이 열린 화면은 죄종이 맞아야만 나오므로
        //   헤드리스가 닿을 길이 따로 필요하다 (§10 · 클릭으로만 만들어지는 상태와 같은 취급)
        if (new URLSearchParams(location.search).get('key') === '1')
            G.heroes[0].sin = SYS.game.searchState(G, now()).rumor.sin;
        SYS.game.searchSend(G, G.heroes[0].uid, now() - Math.round(span * back));
        // `&ans=n` — n번째 열린 답을 미리 고른 상태 (답은 클릭으로만 만들어져 헤드리스가 못 닿는다 · §10)
        const ai = Number(new URLSearchParams(location.search).get('ans'));
        if (ai >= 1) {
            const list = SYS.game.searchState(G, now()).answers;
            if (list[ai - 1]) SYS.game.searchAnswer(G, list[ai - 1].id, now());
        }
        state.tab = 'tavern'; save();
    }
    /* 툴팁 확인용 — **가방도 몸도 찬 캐릭터 탭**. 새 게임은 가방이 비어 있고 몸에는 무기 하나뿐이라
       이 툴팁의 가장 넓은 모양(**비교 두 장**)에 닿을 수가 없다 — 교체될 자리가 비면 둘째 카드를 안 세운다 (§6).
       한 런을 정산해 **주운 것을 다 입히고**, 한 번 더 정산해 **가방에 비교 상대가 있는 물건**을 남긴다.
       카드를 실제로 띄우는 것은 render() 뒤다 — 툴팁은 hover 로만 뜬다 */
    if (dev === 'tip') {
        if (!G) startGame();
        devParty();
        const uid0 = G.heroes[0].uid;
        runBattle(D.stageOrder[0], { instant: true });
        for (const iuid of [...G.bag]) SYS.game.equip(G, uid0, iuid);   // 거절되는 것(직업 전속 등)은 가방에 남는다
        runBattle(D.stageOrder[0], { instant: true });
        state.tab = 'character';
    }
    if (dev === 'offline') {   // 반복을 켠 채 게임을 껐다 다시 켠 것처럼 — 런 마무리 배너 확인용
        if (!G) startGame();
        devParty();
        if (!G.run) SYS.game.resolveBattle(G, D.stageOrder[0], now() - 31 * 60000);
        G.run.repeat = true;
        SYS.game.closeRun(G, now()); save();
    }
    // ?tab= 은 dev 분기 **뒤에** 건다 — startGame() 이 탭을 원정으로 되돌리므로 앞에 두면 먹히지 않는다
    if (TABS.includes(tab)) state.tab = tab;
    render();
    /* 툴팁은 **hover 로만** 뜬다 — 헤드리스가 못 닿는 상태라 길을 따로 낸다 (SCREEN_DESIGN §10 · §6 툴팁 규격).
       `render()` **뒤에** 걸린다: 카드는 `bindTipNode` 가 붙인 `mouseenter` 가 만들고, 그 핸들러는 render 마다 새로 붙는다.
       기본은 **가방 첫 칸**(비교 두 장 — 이 툴팁의 가장 넓은 모양) · `&t=doll` 이면 페이퍼돌 무기 칸(한 장) */
    if (dev === 'tip') {
        const q = new URLSearchParams(location.search);
        // `&i=n` — n번째 찬 칸(1부터). 가방에 무엇이 떨어질지는 시드가 정하므로 **무기 칸을 골라 잡는 유일한 길**이다
        const list = document.querySelectorAll(q.get('t') === 'doll' ? '.pd-cell.filled[data-tip]' : '.inv-cell.filled[data-tip]');
        const node = list[Math.max(1, Number(q.get('i')) || 1) - 1];
        // 커서 자리는 왼쪽 위 — 카드 두 장(최대 640px)이 접힘 보정 없이 그대로 펴진다
        node?.onmouseenter?.(new MouseEvent('mouseenter', { clientX: 40, clientY: 40 }));
    }
    // 원정 시계 — 화면과 무관하게 앱이 든다 (ADR-0074). render() 가 걷는 것들과 달리 **끄지 않는다**
    setInterval(expTick, EXP_TICK_MS);
    // 브라우저 탭을 숨기고 돌아올 때 — 숨긴 탭의 시계는 앱 시계 하나다 (ADR-0102)
    document.addEventListener('visibilitychange', onVisibility);
}

boot().catch(e => {
    console.error(e);
    $('.main').innerHTML = `<div class="panel"><div class="down">${String(e)}</div></div>`;
});
