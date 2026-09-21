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
 *   ~~⚠ 목업 · 값은 화면 상태(state.expForm)에만 산다~~ **폐기** — 자리는 **세이브 값**(편성마다의 진형 · `G.presets[].formation` · R122)이고
 *   **전투가 그것을 읽는다**: 「앞에 있는 유닛부터 때린다」의 「앞」이 이 자리다 (battle_design §3-1).
 *   정원·템플릿은 `formation_template.csv`, 규칙은 `game.formationState`/`setFormation`/`placeFormation` 이 든다.
 *   동사는 그대로 갈린다: **클릭은 소속**(로스터 띠 = 파티 넣고 빼기) · **드래그는 자리**(칩).
 *
 * 2026-09-14 — **계정 · 클라우드 세이브** (SCREEN_DESIGN §2-1 · ADR-0112). 로그인하면 세이브 사본이 Google 계정을 따라간다 —
 *   로컬 저장(save)은 그대로 · 클라우드는 모아서 통째로(cloudPush) · 갈리면 선택 창 · 다른 탭이 쓰면 멈춤 창(freeze).
 *   Firebase 는 cloud.js 만 만진다. 개발용 경로 ?dev=cloud (계정 창 · &c=pick 선택 창 · &c=frozen 멈춤 창)
 *
 * 개발용 URL: ?dev=prologue (프롤로그 첫 씬) / ?dev=newgame (현재 후보로 즉시 시작) / ?dev=battle (첫 스테이지 1회 즉시 정산 → 리포트 · &runs=n 이면 n번 연달아 = 런 목록이 쌓인 상태 · &live=1 이면 그 위에 원정을 하나 더 띄운 채) / ?dev=play (첫 스테이지 관전 재생 · &bt=log|dmg 면 그 판을 고른 채(보이는 것은 나눔 배치뿐) · &lay=split 이면 옛 나눔 배치 · &rep=1 이면 반복 원정을 켠 채 · &logf=party|enemy 면 로그를 그 주체로 거른 채) / ?tab=character 등 (탭 바로 열기) / ?dev=offline (반복 켠 채 껐다 켠 상황 — 런 마무리 배너) / ?dev=form (출정 창이 열린 상태 · &open=0 이면 창을 닫은 목록) / ?dev=tactics (연구 탭 — 전술 칸이 전부 열린 상태) / ?dev=mats (제작 재료를 쥔 제련소)
 */

import * as M from './mock.js';
import { t, L, lang, setLang, applyDocumentLang } from './i18n.js';
import { mountBattle } from './battle.js';
import { bindTipNode, hideTip, heroTipCard, skillTipCard, skillTipSection, skillLineHtml, stagePoint, rangeText, attrRowsHtml, sheetRowsHtml, sheetPages, codexMonsterTipCard } from './tip.js';
import { D, SYS, loadData, monsterName, monsterFace, monsterSin, stageName, stageStory, fillStory, stageBgOf, chapterOf, codexStages, skillInfo, skillTagName, potionInfo } from './data.js';
import { loadSave, writeSave, clearSave, loadCloudLink, writeCloudLink, clearCloudLink, onSaveWrittenElsewhere } from './storage.js';
import * as CLOUD from './cloud.js';
import { makeRng } from '../game_logic/rng.js';
// 개발용 색 피커 — 게임 기능이 아니다 (SCREEN_DESIGN §10). 걷어내려면 이 줄과 devpalette.js 를 지운다
import { mountDevPalette } from './devpalette.js';

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
// 다른 탭이 세이브를 썼다 — 이 탭은 저장 · 원정 시계 · 클라우드 올리기를 멈춘다(멈춤 창 · SCREEN_DESIGN §2-1 · ADR-0112)
let frozen = false;
let authenticated = false;
let unlockBoot = null;
function save() { if (G && !frozen) writeSave(SYS.game.serialize(G, now())); }

const heroById = uid => G?.heroes.find(h => h.uid === uid);
/* 매력 — **수색이 미는 유일한 능력치**다 (base_expedition_design §2-4). 약어는 `hero_attribute.csv` 가 든다 */
const CHA = 'cha';
const chaAbbr = () => D.heroAttributes.find(a => a.id === CHA)?.abbr ?? CHA;
const itemOf = uid => (uid ? G.items[uid] : null) ?? null;
/** 제작 재료 이름 — 산출물 표(mine_node · log_node)가 든다. id 는 `game.makeState` 의 cost 가 준다 (SCREEN_DESIGN §8-2) */
const matName = (kind, id) => { const n = (kind === 'ore' ? D.mineNodes : D.logNodes).find(x => x.yieldId === id); return n ? L({ ko: n.yieldKo, en: n.yieldEn }) : id; };
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
    // 제 그림이 없는 스킬은 **검은 칸** — 남의 그림을 안 빌린다 (2026-09-18 · ADR-0162). 스킬이 없는 칸(`s` 없음)은 그대로 빈다
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : s?.id ? '<i class="sk-noart"></i>' : '';
};
/* 아이템 그림 — 무기 · 방어구 둘 다 **개체가 든 `baseId` 의 그림**이다 (SCREEN_DESIGN §2 · 규칙은 `mock.itemArt` 한 곳 · 방어구 2026-09-17).
   무기는 그 무기군의 베이스 7장 중 하나를 든다. 개체가 `weapon_base.csv` 로 실제 그 베이스를
   굴렸으면(`item.baseId` · 2026-09-10 · game_logic/item.js) **그 그림**이고, 이름도 같은 베이스로 이미 붙어 있다 —
   그림과 이름이 어긋나지 않는다. `baseId` 가 없는 옛 개체(이 기능 전에 드롭된 것)만 `uid` 해시로 예전처럼 고른다.
   그림이 없는 부위·베이스(투구 · 장갑 · 신발 · 장신구)는 부위 이모지로 떨어진다 — 부위는 스킬과 달리 해시 폴백을 안 쓴다(틀린 그림 = 틀린 정보) */
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
// **편성**이 원정 바로 뒤에 선다 [2026-09-21 사용자 지시 · SCREEN_DESIGN §15 · ADR-0192] — 탭 10 → 11.
//   전투 준비(파티 · 진형 · 물약 칸 · 파티 전술)가 여기 하나로 모인다 — 출정 창은 만들어 둔 편성을 고르기만 한다(ADR-0193)
const TABS = ['expedition', 'party', 'character', 'forge', 'tavern', 'shop', 'resource', 'explore', 'research', 'codex', 'help'];

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
    // 도감 몬스터 세그먼트가 그리는 초상의 등급 (SCREEN_DESIGN §9 · ADR-0167) — normal | elite.
    // 고르개 하나가 **전 카드를 한 번에** 뒤집는다 · 정예 전용 초상이 있는 몬스터만 얼굴이 갈린다(`monster.csv:face_elite`) · 세이브 아님
    codexGrade: 'normal',
    // 아이템 세그먼트의 안쪽 분류 (SCREEN_DESIGN §9-1 · ADR-0179) — weapon | armor. 장신구는 armor 쪽 부위 묶음에 든다 · 세이브 아님
    codexItemSeg: 'weapon',
    roll: 1, candidates: [], confirmOverwrite: false,
    // 보관의 「고르는 중」 [2026-09-21 · ADR-0184] — [분해]로 들어가고 [분해하기] · [취소]로 나온다.
    // 고르는 동안 칸 클릭은 **체크를 토글할 뿐**이라 오클릭이 파괴가 되지 않는다 — 옛 `salvageMode` 는 클릭이 곧 분해였다.
    // 「잠그는 중」 [ADR-0207] — [잠금]으로 들어가고 [완료]로 나온다 · 칸 클릭 = 그 칸의 자물쇠 토글.
    // 둘 다 탭을 떠나면 풀린다(`setTab`) — 모드 상태가 화면 밖으로 새지 않는다 · 세이브 아님
    bagSelMode: false, bagSel: new Set(), bagLockMode: false,
    autoArm: false,              // 자동 분해 창 — [지금 인벤토리에도 적용]을 한 번 눌러 확인 줄이 선 상태 (ADR-0203) · 창을 닫으면 풀린다
    repSel: null,                // 리포트에서 고른 런 — null 이면 맨 위를 따라간다 (SCREEN_DESIGN §4-3 · ADR-0063 · ADR-0123)
    searchUid: null,             // 수색 칸에서 고른 영웅 — 보내면 비운다 (SCREEN_DESIGN §8-1)
    forgeItem: null,             // 제련소에서 고른 장비 uid
    forgeFilter: null,           // 제련소 목록의 부위 필터 — 캐릭터 탭과 따로 둔다(화면이 다르면 필터도 다르다)
    makePart: null,              // 제작 칸에서 고른 부위 — 없으면 부위 목록의 첫 칸 (SCREEN_DESIGN §8-2)
    makeBand: null,              // 제작 칸에서 고른 레벨대 — 없으면 첫 레벨대
    forgeTab: 'make',            // 제련소의 작업 탭 — 'make' | 'up' | 'craft' (ADR-0142 · `?fg=` 로도 연다)
    researchLayout: 'col',       // ⚠ 연구 배치 비교 — 'col'(세로) | 'row'(가로). 하나로 정해지면 걷는다 (§13-1 · `?rsl=` 로도 연다)
    researchPick: null,          // 가로 배치에서 고른 노드 id — 없으면 첫 열린 노드 (§13-1)
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
    // 자원 탭에서 열려 있는 파견처 (§8) — 들어오면 첫 칸(채광)이 골라져 있다. 비워 두면 첫 화면이 빈다
    post: 'mine',
    // 선택 창에서 한 번 누른 쪽 — 'cloud' | 'local' | null. 두 번째 누름이 덮어쓰기를 확정한다 (SCREEN_DESIGN §2-1)
    cloudArm: null,
};
let stopBattle = null;
let battleBag = null;       // 관전 아래 보관 칸 — 라운드 정산 때 이것만 갈아 끼운다 (R89 · `refreshBattleSide`)

const rollCandidates = () => SYS.hero.rollStartParty(makeRng(ROLL_SEED + state.roll), D.balance.party_size_max);
/* 플래시 — 상단바 가운데에 내려왔다가 제 시간에 사라지는 한 줄 (SCREEN_DESIGN §2 · ADR-0113).
   render() 를 기다리지 않고 상단바 안의 `#toast` 에 **곧장** 선다 — 탭 내용 밖이라 박스를 밀지 않고, 다시 그려도 안 지워지고, 창 위에 보인다.
   **한 번에 한 줄** — 떠 있는 것을 갈아 끼우고 새로 내려온다(같은 오류를 거푸 눌러도 눌렸다는 게 보인다). 문자열을 직접 받지 않는다 — i18n 키 + 파라미터 */
const TOAST_MS = 3000;   // 내려와서 사라질 때까지 — 화면 연출의 길이라 CSV 가 아니다(FROZEN_GAP_MS 와 같은 선례). 내려오기 · 올라가기의 몫은 style.css `@keyframes toast-drop`
let toastTimer = null;
function flash(key, params) {
    clearTimeout(toastTimer);
    const node = el('div', 'toast', t(key, params));
    node.style.animationDuration = `${TOAST_MS}ms`;
    $('#toast').replaceChildren(node);
    toastTimer = setTimeout(() => node.remove(), TOAST_MS);
}

/* ═══════════ 셸 ═══════════ */

function renderShell() {
    // 프롤로그도 시작 화면과 같은 셸이다 (§3-1) — 탭 바도 자원 띠도 없다. 게임 화면은 'game' 하나뿐
    const pre = state.screen !== 'game';
    $('#app').classList.toggle('pregame', pre);
    $('#app').classList.toggle('login-gate', !authenticated);

    const nav = $('.nav');
    nav.innerHTML = '';
    if (!pre) for (const id of TABS) {
        const b = el('button', id === state.tab ? 'on' : '', t(`nav.${id}`));
        // 탭을 떠나면 **고르는 중 · 잠그는 중이 풀린다** [ADR-0184 · ADR-0207] — 모드 상태가 화면 밖으로 새지 않는다
        b.onclick = () => { state.tab = id; clearBagSel(); render(); };
        nav.appendChild(b);
    }
    if (!pre) {
        // 세이브가 있으면 부팅이 곷장 게임으로 들어오므로, 시작 화면(새 게임·덮어쓰기)으로 돌아가는 문은 여기 하나다
        const nb = el('button', 'b-newgame', t('ng.h'));
        nb.onclick = () => { state.screen = 'start'; state.confirmOverwrite = false; render(); };
        nav.appendChild(nb);
    }

    const r = G?.resources;
    // `data-res` — 관전이 떠 있는 동안 라운드 정산이 **이 숫자만** 갈아 끼운다(재생기를 걷지 않는다 · R89 · `refreshBattleSide`)
    $('.resources').innerHTML = pre || !r ? '' : `
        <span>${t('res.gold')}<b data-res="gold">${r.gold.toLocaleString()}</b></span>
        <span>${t('res.dust')}<b data-res="dust">${r.dust}</b></span>
        <span>${t('res.stigma')}<b data-res="stigma">${r.stigma}</b></span>`;

    if (authenticated) $('.resources').appendChild(cloudBtn());
    const langBtn = el('button', 'btn sm lang-btn', t('ui.langBtn'));
    langBtn.onclick = () => { setLang(lang() === 'ko' ? 'en' : 'ko'); render(); };
    $('.resources').appendChild(langBtn);
    mountDevPalette($('.resources'));   // ⚙ — 배경 · 글자 색을 눈으로 맞추는 개발 장치

    $('.crumb').textContent = !authenticated ? t('cl.signIn') : state.screen === 'prologue' ? t('pro.h') : pre ? t('ng.h') : t(`nav.${state.tab}`);
    $('.tab-seg').innerHTML = '';   // 탭 세그먼트 자리 — 채우는 것은 탭 렌더러다 (§2 · 원정 · 제련소 · 도감)
}

function render() {
    // 숨긴 탭은 그리지 않는다 — 보는 사람이 없다. 시계는 앱이 계속 밀고, 돌아오는 순간 한 번 그린다(`onVisibility` · ADR-0102)
    if (document.hidden) return;
    // 관전 중 재렌더(가방 클릭 · 언어 전환 · 세그먼트 이동)면 재생 위치를 받아 뒀다가 다음 mount 에 넘긴다 — 처음부터 다시 틀지 않는다 (2026-08-27)
    if (stopBattle) { const pos = stopBattle(); if (state.battle) state.battle.resume = pos; stopBattle = null; }
    applyDocumentLang();
    M.applyDocumentFace();
    M.applyDocumentBg();
    if (G) {
        if (!heroById(state.heroUid)) state.heroUid = G.heroes[0]?.uid ?? null;
    }
    renderShell();
    const main = $('.main');
    // 박스 안 스크롤 위치 — 다시 그려도 남는다 (SCREEN_DESIGN §2 「박스」 · ADR-0097). 박스는 매번 새로 서므로 `data-keep` 이름으로 되찾는다
    const kept = new Map([...main.querySelectorAll('[data-keep]')].map(n => [n.dataset.keep, n.scrollTop]));
    main.innerHTML = '';
    if (!authenticated) renderLogin(main);
    else if (state.screen === 'prologue' && G) renderPrologue(main);
    else if (state.screen === 'start' || !G) renderStart(main);
    else ({
        // 키 순서 = 탭 바 순서 (TABS) — 읽는 사람이 화면과 대조할 수 있게 맞춰 둔다
        expedition: renderExpedition,
        party: renderParty,
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
    // 계정 · 클라우드 세이브 (SCREEN_DESIGN §2-1 · ADR-0112). `lock` 인 창은 닫는 길이 없다 — 멈춤 창 하나뿐인 의도된 예외다:
    //   닫을 수 있으면 멈춘 탭이 다시 저장해 다른 탭의 진행을 덮는다
    cloud: { title: 'cl.h', body: cloudBody },
    cloudPick: { title: 'cl.pick.h', body: cloudPickBody },
    frozen: { title: 'cl.frozen.h', body: frozenBody, lock: true },
    // 자동 분해 — 보관 도구 줄 [자동 분해]가 연다 (SCREEN_DESIGN §6 · ADR-0203 · item_design §6-5)
    //   `cls` 는 머리 글씨를 줄이는 데만 쓴다 — 작은 창이라 기본 h2 가 속보다 두 단 넘게 컸다(2026-09-21 사용자 지시)
    autoSalvage: { title: 'ch.auto.h', body: autoSalvageBody, cls: 'auto-modal' },
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
    if (!m.lock) {
        const x = el('button', 'btn modal-x', '×');
        x.title = t('ui.close');
        x.setAttribute('aria-label', t('ui.close'));
        x.onclick = closeModal;
        head.appendChild(x);
    }
    box.appendChild(head);
    box.appendChild(m.body());
    layer.appendChild(box);
    /* 판 **바깥**을 눌렀을 때만 닫는다 — 판 안의 클릭이 올라와도 닫히면 랭크 한 번 찍고 창이 사라진다.
       ⚠ **누른 자리와 뗀 자리가 둘 다 바깥**이어야 한다 [2026-09-10] — 클릭 하나만 보면 **판 안에서 시작한 드래그**가
       바깥에서 끝났을 때 창이 닫힌다(진형 드래그가 빗나가면 창째 사라졌다). 시작점을 기억해 두고 둘을 맞춰 본다 */
    let downOnLayer = false;
    layer.onpointerdown = e => { downOnLayer = e.target === layer; };
    layer.onclick = e => { if (e.target === layer && downOnLayer && !m.lock) closeModal(); };
}

// 창을 닫으면 선택 창의 「한 번 누름」도 풀린다 — 다시 열었을 때 한 번에 덮어쓰지 않게 (SCREEN_DESIGN §2-1)
// 자동 분해 창의 [지금 적용] 확인도 같다 — 닫았다 열면 처음부터 두 번 눌러야 한다 (ADR-0203)
const closeModal = () => { state.modal = null; state.cloudArm = null; state.autoArm = false; render(); };
const openModal = id => { state.modal = id; render(); };

/** 세그먼트 버튼 묶음 — items: {id, label, disabled?, color?, cls?} · `cls` = 그 칸의 상태 클래스(원정 관전 칸의 `seg-live` 등 · ADR-0147) */
function segmented(items, current, onPick) {
    const box = el('div', 'segmented');
    for (const it of items) {
        const b = el('button', `btn sm${it.id === current ? ' on' : ''}${it.cls ? ` ${it.cls}` : ''}`, it.label);
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
    if (!authenticated) return;
    clearSave();
    G = SYS.game.newGame(now() >>> 0, state.candidates, now());
    save();
    state.screen = prologue ? 'prologue' : 'game';
    state.proScene = 0;
    state.tab = 'expedition'; state.exp = 'idle'; state.confirmOverwrite = false; state.expStage = null;
    render();
}

function continueGame() {
    if (!authenticated) return false;
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
    // 죄종 칩만 그 죄종 색이다 (SCREEN_DESIGN §3 · ADR-0155) — 윗변 · 막대는 등급 색 그대로(ADR-0023)
    c.innerHTML = `
        <div class="ng-head">
            ${heroFace(h)}
            <div class="ng-id">
                <div class="ng-chips">${tierChip(h)}<span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span></div>
                <div class="ng-name"><b>${L(h.name)}</b></div>
                <div class="ng-cls">${className(h.cls)} · Lv.${h.level}</div>
                <div class="ng-role muted">${classLine(h.cls)}</div>
                ${innate ? `<div class="ng-skill">
                    <span class="ico">${skillImg(innate)}</span>
                    <span class="txt"><b>${L(innate.name)}</b></span>
                </div>` : ''}
            </div>
        </div>
        <div class="attr-list">${bars}</div>
        <div class="ng-line sep"><span>${t('st.maxhp')}</span><b>${D.balance.hero_hp_base}</b></div>
        <div class="ng-line"><span>${t('ng.total')}</span><b>${total}</b></div>
        ${extra}`;
    // 툴팁은 관전·캐릭터 탭과 **같은 카드**다 (이름 · 칩 · 문장) — 카드 본문은 아이콘과 이름만 든다.
    //   `source` 는 안 넘긴다 — 후보 카드는 출처를 글자로도 칩으로도 안 적는다(카드에 서는 스킬은 고유 하나뿐이라
    //   영웅 스킬로 읽힌다 · ADR-0159 — ADR-0121 의 「글자로 안 선 자리엔 칩」의 예외).
    //   행동 주기는 안 넘긴다 — 후보는 아직 무기가 없어(시작 무기는 `newGame` 이 준다) 실효 쿨이 뜻을 못 가진다.
    //   시작 화면은 `G` 자체가 없어 `cycleOf` 를 부를 수도 없다 (`heroCombat(G, h)`)
    const skillNode = c.querySelector('.ng-skill');
    // 후보는 아직 무기가 없어 주기도 공격력도 모른다 — 피해 자리가 **식**으로 접힌다. 능력치는 안다 — 슬롯이 미는
    //   나머지 숫자(타수 · 효과값 · 지속 …)는 값을 찍는다 (SCREEN_DESIGN §2 「스킬 설명창 규격」 · ADR-0089)
    if (skillNode) bindTipNode(skillNode, () => skillTipCard(innate, { stats: h.stats }));
    return c;
}

function renderLogin(main) {
    const page = el('section', 'login-page');
    const card = el('div', 'login-card');
    card.appendChild(el('h1', 'login-logo', 'THE<b>SEVEN</b>'));
    if (cloud.err) card.appendChild(el('div', 'login-error', t(`cl.err.${cloud.err}`)));
    const button = el('button', 'login-google login-required');
    button.innerHTML = `<span class="login-google-mark">G</span><span>${t(cloud.busy ? 'cl.st.checking' : 'cl.signIn')}</span>`;
    button.disabled = cloud.busy;
    button.setAttribute('aria-busy', String(cloud.busy));
    button.onpointerenter = () => CLOUD.warm();
    button.onclick = cloudSignIn;
    card.appendChild(button);
    page.appendChild(card);
    main.appendChild(page);
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

/* ═══════════ 계정 · 클라우드 세이브 (SCREEN_DESIGN §2-1 · ADR-0112) ═══════════
   로그인하면 세이브 사본이 Google 계정을 따라간다. 로컬 저장(`save`)은 그대로이고, 클라우드는 모아서 **통째로** 올린다.
   이 브라우저가 마지막으로 맞춘 사본은 `storage.js` 의 연결 기록 `{uid, rev, savedAt}` 이 든다 —
   「이 브라우저가 바뀌었나」는 세이브의 `savedAt` 으로, 「클라우드가 먼저 바뀌었나」는 저장 번호 `rev` 로 가른다(기기마다 시계가 달라서). */

// 올리는 간격 — 로컬은 바뀔 때마다지만 클라우드 무료 한도는 **쓰기 횟수**라 모아서 올린다. 게임 수치가 아니라 저장소 사정이라 CSV 가 아니다 (ADR-0102 선례)
const CLOUD_PUSH_MS = 60 * 1000;
// 켤 때 계정 복원 + 받기를 기다리는 상한 — 넘으면 이 브라우저 세이브로 켜고 다음 간격에 다시 붙는다. 같은 이유로 CSV 가 아니다
const CLOUD_BOOT_WAIT_MS = 8 * 1000;
// 이 탭의 연결 — 화면 상태가 아니라서 `state` 밖에 둔다. status: off · checking · on · saving · error · conflict
const cloud = { status: 'off', user: null, remote: null, err: null, busy: false };

/** 계정 버튼 — 글자가 곧 상태다 */
function cloudBtn() {
    const s = cloud.status;
    const b = el('button', `btn sm cloud-btn cl-${s}`, t(s === 'off' ? 'cl.signIn' : `cl.st.${s}`));
    if (cloud.user) b.title = cloud.user.email;
    // 로그인 창은 클릭 직후에 떠야 브라우저가 막지 않는다 — 마우스가 올라오면 SDK 를 미리 불러 둔다
    b.onpointerenter = () => { if (s === 'off') CLOUD.warm(); };
    b.onclick = () => {
        if (frozen || s === 'checking') return;
        if (s === 'off' || (s === 'error' && !cloud.user)) cloudSignIn();
        else if (s === 'conflict') openModal('cloudPick');
        else openModal('cloud');
    };
    return b;
}

/** 상태가 바뀌었다 — **버튼만** 갈아 끼운다(관전을 걷지 않는다 · `refreshBattleSide` 와 같은 장치). 계정 · 선택 창이 떠 있으면 창도 */
function setCloud(status) {
    cloud.status = status;
    if (status !== 'error') cloud.err = null;
    if (!authenticated) { render(); return; }
    $('.cloud-btn')?.replaceWith(cloudBtn());
    if (state.modal === 'cloud' || state.modal === 'cloudPick') renderModal();
}

/** 선택 창을 띄운다 — 켤 때는 첫 render 가 그리고, 도중이면 다른 창이 없을 때만(창을 두 장 겹치지 않는다 — 버튼이 「세이브 선택」을 든다) */
function askPick(remote, { booting }) {
    cloud.remote = remote;
    setCloud('conflict');
    if (booting) state.modal = 'cloudPick';
    else if (!state.modal || state.modal === 'cloud') openModal('cloudPick');
}

/** 받는다 — 로컬 세이브와 연결 기록을 클라우드 사본으로 맞춘다. 열 수 없는 사본은 조용히 받지 않는다(선택 창이 사유를 보여준다) */
function adoptRemote(remote, { booting }) {
    if (!SYS.game.canLoad(remote.save)) { askPick(remote, { booting }); return; }
    // 도중이면 새로고침까지 이 탭이 옛 상태를 다시 저장하지 않게 먼저 멈춘다
    if (!booting) frozen = true;
    writeSave(remote.save);
    writeCloudLink({ uid: cloud.user.uid, rev: remote.rev, savedAt: remote.savedAt });
    setCloud('on');
    // 도는 원정 · 재생기 · 화면 상태를 새 세이브에 맞추는 가장 짧은 길 — 켜는 길을 한 번 더 탄다. 받은 세이브의 원정은 거기서 끊긴다(§4)
    if (!booting) location.reload();
}

/**
 * 계정과 이 브라우저를 잇는다 — 켤 때(`booting`)와 로그인 버튼이 **같은 규칙**을 탄다 (SCREEN_DESIGN §2-1 「언제 올리고 받나」).
 * ① 클라우드가 비었다 → 올린다 ② 마지막으로 맞춘 사본 그대로다 → 그대로 ③ 두 세이브가 같다 → 기록만 맞춘다
 * ④ 이 브라우저가 맞춘 뒤 안 바뀌었거나 세이브가 없다 → 묻지 않고 받는다 ⑤ 둘 다 따로 바뀌었다 → 선택 창
 */
function linkAccount(remote, { booting }) {
    const uid = cloud.user.uid;
    const link = loadCloudLink();
    const local = loadSave();
    const mine = link?.uid === uid;
    if (!remote) {
        writeCloudLink({ uid, rev: 0, savedAt: null });
        setCloud('on');
        if (!booting) cloudPush();          // 켤 때는 부팅 끝의 `cloudPush` 가 올린다
        return;
    }
    if (mine && remote.rev === link.rev) { setCloud('on'); return; }
    if (local && local.savedAt === remote.savedAt) {
        writeCloudLink({ uid, rev: remote.rev, savedAt: local.savedAt });
        setCloud('on');
        return;
    }
    if (!local || (mine && local.savedAt === link.savedAt)) { adoptRemote(remote, { booting }); return; }
    askPick(remote, { booting });
}

/** 켤 때 — 전에 로그인해 둔 브라우저면 계정을 복원하고 클라우드와 맞춘 **뒤에** 세이브를 연다 */
async function cloudResume() {
    cloud.busy = true;
    setCloud('checking');
    const steps = (async () => {
        const u = await CLOUD.restoreUser();
        if (!u.ok || !u.user) return u;
        return { ...(await CLOUD.pullSave(u.user.uid)), user: u.user };
    })();
    // 상한을 넘으면 늦게 온 결과는 버린다 — 이미 연 세이브 위에 받은 사본을 쓰면 옛 상태가 클라우드를 덮는다
    const late = new Promise(res => setTimeout(() => res({ ok: false, err: 'network' }), CLOUD_BOOT_WAIT_MS));
    const result = await Promise.race([steps, late]);
    cloud.busy = false;
    applyResume(result, { booting: true });
    if (result.ok && result.user) authenticated = true;
    render();
}

/** 복원 결과를 건다 — 켤 때 · 다시 붙을 때(`cloudTick`) · 로그인 버튼이 같이 쓴다 */
function applyResume(r, { booting }) {
    if (r.user) cloud.user = r.user;
    if (!r.ok) { cloud.err = r.err; setCloud('error'); return; }
    // 로그아웃된 채다 — 세션이 끝났거나 다른 곳에서 로그아웃했다. 이 브라우저 세이브는 그대로 둔다
    if (!r.user) { clearCloudLink(); cloud.user = null; setCloud('off'); return; }
    linkAccount(r.remote, { booting });
}

/** 간격마다 — 끊겼으면 다시 붙고, 붙어 있으면 바뀐 것을 올린다 */
async function cloudTick() {
    if (frozen || cloud.busy) return;
    if (cloud.status !== 'error' || !(cloud.user || loadCloudLink())) { cloudPush(); return; }
    cloud.busy = true;
    const u = cloud.user ? { ok: true, user: cloud.user } : await CLOUD.restoreUser();
    const r = u.ok && u.user ? { ...(await CLOUD.pullSave(u.user.uid)), user: u.user } : u;
    cloud.busy = false;
    if (!frozen) applyResume(r, { booting: false });
}

/** 올리기 — 마지막으로 맞춘 뒤 바뀐 것이 있을 때만. 클라우드가 먼저 바뀌었으면 덮어쓰지 않고 선택 창 */
async function cloudPush({ manual = false } = {}) {
    const link = loadCloudLink();
    if (frozen || cloud.busy || cloud.status !== 'on' || !cloud.user || !link) return;
    const local = loadSave();
    if (!local || local.savedAt === link.savedAt) {
        if (manual) { flash('cl.upToDate'); render(); }
        return;
    }
    const uid = cloud.user.uid;
    cloud.busy = true;
    setCloud('saving');
    const r = await CLOUD.pushSave(uid, local, link.rev);
    cloud.busy = false;
    if (cloud.user?.uid !== uid) return;      // 올리는 사이 로그아웃했다
    if (r.ok) {
        writeCloudLink({ uid, rev: r.rev, savedAt: local.savedAt });
        setCloud('on');
        if (manual) { flash('cl.pushed'); render(); }
    } else if (r.err === 'conflict') askPick(r.remote, { booting: false });
    else { cloud.err = r.err; setCloud('error'); }
}

/** 로그인 버튼 — Google 창 → 받기 → 잇기 */
async function cloudSignIn() {
    if (cloud.busy) return;
    cloud.busy = true;
    setCloud('checking');
    const s = await CLOUD.signIn();
    if (!s.ok) {
        cloud.busy = false;
        setCloud('off');
        flash(`cl.err.${s.err}`);
        render();
        return;
    }
    const p = await CLOUD.pullSave(s.user.uid);
    cloud.busy = false;
    if (!frozen) {
        applyResume({ ...p, user: s.user }, { booting: !authenticated });
        if (p.ok && s.user && !authenticated) {
            authenticated = true;
            unlockBoot?.();
        }
    }
}

/** 로그아웃 — 이 브라우저 세이브는 남는다 */
async function cloudSignOut() {
    if (cloud.busy) return;
    cloud.busy = true;
    const result = await CLOUD.signOut();
    cloud.busy = false;
    if (!result.ok) { flash(`cl.err.${result.err}`); return; }
    clearCloudLink();
    Object.assign(cloud, { user: null, remote: null, err: null });
    state.modal = null;
    setCloud('off');
    leaveSession();
}

function leaveSession() {
    authenticated = false;
    frozen = true;
    if (stopBattle) { stopBattle(); stopBattle = null; }
    G = null;
    state.screen = 'start';
    state.modal = null;
    render();
    location.reload();
}

/** 다른 탭이 세이브를 썼다 — 이 탭은 저장 · 원정 시계 · 올리기를 멈추고 멈춤 창만 남긴다. 먼저 쓴 탭이 남는다 (ADR-0112) */
function freeze() {
    if (frozen) return;
    frozen = true;
    if (stopBattle) { stopBattle(); stopBattle = null; }
    state.battle = null;
    if (state.exp === 'battle') state.exp = 'idle';
    state.modal = 'frozen';
    render();
}

/** 계정 창 — 계정 · 클라우드 사본의 저장 시각 · 오류 한 줄 · 지금 올리기 · 로그아웃 */
function cloudBody() {
    const box = el('div', 'cl-account');
    const link = loadCloudLink();
    const row = (key, value) => {
        const r = el('div', 'cl-row', `<span>${t(key)}</span>`);
        const b = el('b');
        b.textContent = value;               // 이메일은 바깥에서 온 글자라 innerHTML 에 넣지 않는다
        r.appendChild(b);
        return r;
    };
    box.appendChild(row('cl.account', cloud.user?.email ?? '—'));
    box.appendChild(row('cl.cloudAt', link?.savedAt ? new Date(link.savedAt).toLocaleString() : t('cl.never')));
    if (cloud.err) box.appendChild(el('div', 'down', t(`cl.err.${cloud.err}`)));
    const actions = el('div', 'cl-actions');
    const push = el('button', 'btn sm primary', t('cl.pushNow'));
    push.disabled = cloud.busy || frozen || cloud.status === 'checking';
    // 연결 실패 중이면 다시 붙기부터 한다 (§2-1)
    push.onclick = () => (cloud.status === 'error' ? cloudTick() : cloudPush({ manual: true }));
    const out = el('button', 'btn sm', t('cl.signOut'));
    out.disabled = cloud.busy;
    out.onclick = cloudSignOut;
    actions.append(push, out);
    box.appendChild(actions);
    return box;
}

/** 선택 창 — 카드 둘. 고르면 다른 쪽이 덮이므로 두 번 누른다 (§3 새 게임 덮어쓰기와 같은 규칙) */
function cloudPickBody() {
    const box = el('div', 'cl-pick');
    const card = (which, save, use) => {
        const c = el('div', 'cl-card', `<h3>${t(`cl.pick.${which}`)}</h3>`);
        const ok = !!save && SYS.game.canLoad(save);
        if (!save) c.appendChild(el('small', 'muted', t('cl.pick.none')));
        else {
            c.appendChild(el('div', '', t('cl.pick.at', { t: new Date(save.savedAt).toLocaleString() })));
            c.appendChild(el('small', ok ? '' : 'down', ok
                ? t('ng.saveLine', { h: save.heroes.length, c: save.progress.cleared.length, g: save.resources.gold.toLocaleString() })
                : t('ng.oldSave', { v: save.version })));
        }
        const armed = state.cloudArm === which;
        const b = el('button', `btn ${armed ? 'danger' : 'primary'}`, t(armed ? 'cl.pick.confirm' : 'cl.pick.use'));
        b.disabled = !ok || cloud.busy;
        b.onclick = () => { if (armed) use(); else { state.cloudArm = which; renderModal(); } };
        c.appendChild(b);
        return c;
    };
    box.appendChild(card('cloud', cloud.remote?.save, () => adoptRemote(cloud.remote, { booting: false })));
    box.appendChild(card('local', loadSave(), useLocalSave));
    return box;
}

/** 「이 브라우저」를 골랐다 — 번호를 안 보고 클라우드를 덮어쓴다 */
async function useLocalSave() {
    const local = loadSave();
    if (!local || cloud.busy || !cloud.user) return;
    const uid = cloud.user.uid;
    cloud.busy = true;
    setCloud('saving');
    const r = await CLOUD.pushSave(uid, local, null);
    cloud.busy = false;
    state.cloudArm = null;
    if (!r.ok) { cloud.err = r.err; setCloud('error'); return; }
    writeCloudLink({ uid, rev: r.rev, savedAt: local.savedAt });
    cloud.remote = null;
    state.modal = null;
    setCloud('on');
    flash('cl.pushed');
    render();
}

/** 멈춤 창 — 닫는 길이 없다(`lock`). 새로고침이 이 탭을 다른 탭이 쓴 세이브 위에 다시 세운다 */
function frozenBody() {
    const box = el('div', 'cl-frozen');
    const b = el('button', 'btn primary', t('cl.frozen.reload'));
    b.onclick = () => location.reload();
    box.appendChild(b);
    return box;
}

/* ═══════════ 원정 (편성 · 전투 · 리포트) ═══════════ */

/**
 * 출발 — **라운드 단위로 진행한다** [2026-09-14 · R89 · SCREEN_DESIGN §4]. `departRun` 이 첫 라운드를 계산하고 보상은 아직 없다 —
 * 라운드가 끝나는 시각에 시각을 미는 쪽(관전 재생기 · 앱 시계)이 `advanceBattle` 로 정산한다. instant(개발용)는 재생 없이 끝까지 계산하고 리포트로.
 * `at` 은 출발 시각(기본 지금), `resume` 은 새 런의 재생 위치.
 * 앱 시계가 반복을 한 눈금 안에서 이어 세울 때 둘을 넘긴다 — 앞 런이 끝난 순간에 출발했고, 배속 · 판을 잇는다 (ADR-0102)
 */
function runBattle(stageId, { instant = false, tab = null, logf = null, at = null, resume = null, preset = undefined } = {}) {
    // preset — 나갈 편성 번호. 안 주면 **고른 편성**이고, 이어 달리기(반복 · 다음 스테이지 · 다시 도전)는 **도는 원정의 편성**을 넘긴다 (R122)
    const r = instant ? SYS.game.resolveBattle(G, stageId, at ?? now(), preset) : SYS.game.departRun(G, stageId, at ?? now(), preset);
    if (!r.ok) {
        // 도는 원정은 거절 사유가 아니다 — `departRun` 이 끊고 나간다 (R92). 거절이면 도는 원정도 그대로다
        flash({ locked: 'exp.locked', noParty: 'exp.noParty', searching: 'exp.departSearching' }[r.err] ?? 'exp.cantDepart');
        state.exp = 'idle';
        render(); return;
    }
    // 반복 의사를 이번 런에 옮긴다 — departRun 은 같은 스테이지 재출발일 때만 옛 값을 잇는다
    if (G.run && stageId === state.expStage) G.run.repeat = state.expRepeat === true;
    save();
    if (instant) { state.battle = null; state.repSel = null; state.exp = 'report'; render(); return; }
    // tab — 개발용 ?dev=play&bt=dmg: 우측 열의 판을 누적 데미지로 **골라** 헤드리스가 클릭 없이 닿게 한다(보이는 것은 `&lay=split` 일 때 · ADR-0130)
    // form — 진형을 **출발 순간에 찍는다** (2026-09-09). 관전 아레나가 이 값으로 파티 카드를 위아래로 민다
    // 옛 런의 재생기는 여기서 걷는다 — 두면 다음 render() 첫 줄이 **그 재생 위치를 새 런에 덮어써** 새 런이 옛 런이 끝난 시각부터
    //   재생됐다(2026-09-11 실측 — 앞 194초를 건너뛰었다 · ADR-0102). 이어 받을 것(배속 · 판)은 부르는 쪽이 `resume` 으로 넘긴다
    if (stopBattle) { stopBattle(); stopBattle = null; }
    state.battle = { run: r.run, result: r.run.result, stageId, form: formSnapshot(),
        resume: resume ?? (tab || logf ? { t: 0, speed: 1, running: true, tab, logf } : undefined) };
    state.exp = 'battle';
    render();
}

/**
 * 원정 세그먼트 — 화면 전환(편성·지역 / 전투 관전 / 리포트). **상단바** crumb 오른쪽에 선다 [2026-09-11 사용자 지시 · ADR-0094 가 ADR-0016 을 대체].
 * 관전 칸은 원정 상태를 든다 — 없음 회색 「전투 관전」 · 도는 중 파랑 「전투 중」 · 끝남 빨강 「전투 종료」 [2026-09-15 사용자 지시 · ADR-0147].
 * `phase` 는 보통 재생 위치로 정한다(`battlePhase`) — 관전이 떠 있는 동안의 위치는 재생기가 들고 있어서, 끝나는 순간만 `onOver` 가 'over' 를 넘긴다
 */
function expNavBox(phase = battlePhase(state.battle)) {
    return segmented([
        { id: 'idle', label: t('exp.seg.idle') },
        { id: 'battle', label: t({ none: 'exp.seg.battle', live: 'exp.seg.live', over: 'exp.seg.over' }[phase]), disabled: !state.battle, cls: `seg-${phase}` },
        { id: 'report', label: t('exp.seg.report'), disabled: !doneReports().length },
    ], state.exp, id => { state.exp = id; render(); });
}

function renderExpedition(main) {
    // 세 화면이 같은 자리를 쓴다. `state.exp` 가 확정된 뒤에 부른다 — 고른 칸 표시가 실제 화면과 어긋나지 않게
    const expNav = () => $('.tab-seg').appendChild(expNavBox());

    if (state.exp === 'battle' && state.battle) {
        expNav();
        const { result, stageId } = state.battle;
        const nextStage = D.stageOrder[D.stageOrder.indexOf(stageId) + 1] ?? null;   // 결과 띠의 [다음 스테이지] — 마지막 스테이지면 없다 (ADR-0141)
        /* 관전 화면 한 장 [2026-09-11 사용자 지시 · ADR-0095 · ADR-0097] — 전투 판 + 가방이 박스(`.page`) 세로를 채운다.
           두 배치 다 아레나가 남는 세로를 먹고 가방 아랫변이 박스 끝(탭 내비 「새 게임」 줄 아랫변)에 붙는다 (style.css `.bt-page`) */
        const page = el('div', 'bt-page page');
        main.appendChild(page);
        stopBattle = mountBattle(page, {
            result, stageId, heroes: G.heroes, repeat: G.run?.repeat === true, resume: state.battle.resume,
            combatOf, itemOf, itemTipOf: (h, it) => equippedItemTipCard(h, it),
            // 몬스터 툴팁의 장비 칸 — 같은 「착용 중」 카드이되 숫자는 **그 몬스터 기준**이라 재생기가 문맥을 넘긴다 (ADR-0183).
            //   세이브 밖 개체(`round` 이벤트의 `gear`)라 uid 로 못 찾는다 — 개체를 그대로 받는다
            monsterItemTipOf: (item, ctx) => tipCard(item, t('tip.equipped'), [], ctx),
            // 유닛 툴팁 — 현재 착용 장비 + 캐릭터 탭과 같은 세부 옵션 + Alt 장비 hover의 기존 「착용 중」 아이템 카드 (ADR-0171 · ADR-0182 · ADR-0183)
            // 장착 대상 — 영웅 카드를 누르면 그 영웅으로 바뀐다 [2026-09-15 사용자 지시 · SCREEN_DESIGN §4-2 · ADR-0137].
            //   아래 보관 칸의 장착 · 비교가 그 영웅을 향한다. 다시 그려도 재생은 resume 으로 이어진다(가방 칸 클릭과 같은 길)
            pickedUid: state.heroUid, onPickHero: uid => { state.heroUid = uid; render(); },
            // 진형 (⚠ 목업 · SCREEN_DESIGN §4-1) — 출발 순간에 찍은 스냅샷이다. 재생기는 이 값으로 **자리만** 민다
            form: state.battle.form,
            // 관전 배치 — 'wide'(아레나 전폭 · 로그 · 누적 없음) / 'split'(아레나 + 우측 딜미터 열 · ADR-0130).
            // 재생 위치(resume)가 아니라 **취향**이라 화면 상태가 든다 — 런이 바뀌어도 남고, 세이브에는 안 들어간다
            layout: state.btLayout, onLayout: v => { state.btLayout = v; },
            now, frozenMs: FROZEN_GAP_MS,   // 시각은 실제로 흐른 시간이 민다 · 문턱을 넘은 공백은 밀지 않는다 (ADR-0102)
            // 라운드 넘기기 — 재생기가 시각을 밀기 **전에** 부른다: 그 시각까지 끝난 라운드를 정산하고 다음 라운드를 붙인다 (R89)
            onTime: tNow => advanceBattle(state.battle, tNow, now()),
            // 재생이 런의 끝에 닿았다 — 상단 세그먼트만 갈아 끼워 관전 칸을 「전투 종료」로 (ADR-0147). 재생기를 걷지 않는다 —
            //   다시 그리면 아레나 · 로그 · 결과 띠가 통째로 다시 선다(라운드 정산이 보관 칸만 갈아 끼우는 `refreshBattleSide` 와 같은 길)
            onOver: () => $('.tab-seg')?.replaceChildren(expNavBox('over')),
            // 철수 — 옛 「건너뛰기」 자리 (R89). 진행 중이던 라운드는 버리고 리포트로 간다 · 이미 끝난 런이면 그냥 리포트로
            onRetreat: () => {
                const B = state.battle;
                if (stopBattle) { const pos = stopBattle(); if (B) B.resume = { ...pos, auto: false }; stopBattle = null; }
                if (B && !B.run.done) {
                    SYS.game.retreatRun(G, B.run, now());
                    if (G.run?.stageId === state.expStage) state.expRepeat = false;   // 철수는 반복도 끈다 — 편성 창의 버튼과 어긋나지 않게
                    state.battle = null;       // 버린 라운드는 다시 볼 것이 없다
                }
                save(); state.repSel = null; state.exp = 'report'; render();
            },
            onEnd: auto => {
                // 재생기를 먼저 걷는다 — 반복으로 이어지는 런은 배속 · 판을 잇고 시각만 0 에서 시작한다 (§4 · ADR-0102)
                const pos = stopBattle ? stopBattle() : state.battle?.resume;
                stopBattle = null;
                if (auto && G.run?.repeat && result.won) runBattle(stageId, { resume: { ...pos, t: 0, wall: now(), auto: false }, preset: G.run.preset });
                // 반복이 안 이어지면 출정이 끝난 것이다 — ~~아웃된 영웅을 낫게 하는 일~~ 은 2026-09-08 폐기(§1-1 개정).
                //   리포트로 가는 것은 띠의 [리포트 보기](`auto` 가 아니다)뿐이다 — 세던 도중 반복을 껐으면 관전에 남는다 [2026-09-15 사용자 지시 · ADR-0140]
                else {
                    if (state.battle) state.battle.resume = { ...pos, auto: false };
                    save();
                    if (!auto) { state.repSel = null; state.exp = 'report'; }
                    render();
                }
            },
            // 다음 스테이지 — 반복 없이 이긴 결과 띠의 버튼 [2026-09-15 사용자 지시 · SCREEN_DESIGN §4-2 · ADR-0141]. 스테이지 순서의 다음 곳으로 지금 파티 · 진형을 보낸다.
            //   다른 스테이지라 반복은 꺼진 채 나간다(`departRun`) — 편성 창의 반복 의사도 끈다: 고른 지역을 그리로 옮기면 `runBattle` 이 그 의사를 새 런에 옮긴다.
            //   마지막 스테이지면 안 넘긴다(버튼이 안 선다)
            onNext: nextStage == null ? null : () => {
                const pos = stopBattle ? stopBattle() : state.battle?.resume;
                stopBattle = null;
                if (state.battle) state.battle.resume = { ...pos, auto: false };   // 거절돼 남는 관전이 걷힌 자리에서 다시 서게
                state.expStage = nextStage; state.expChapter = D.stages[nextStage].chapter; state.expRepeat = false;
                runBattle(nextStage, { resume: { ...pos, t: 0, wall: now(), auto: false }, preset: G.run?.preset });
            },
            // 다시 도전 — 결과 띠의 버튼 · 이겨도 선다(반복이 세는 띠만 빼고) [2026-09-15 · 09-21 사용자 지시 · SCREEN_DESIGN §4-2 · ADR-0138 · ADR-0212]. 같은 스테이지로 지금 파티 · 진형을 곧바로 보낸다.
            //   반복 원정의 이어 달리기와 같은 길이다 — 배속 · 판은 잇고 시각만 0 에서. 출발이 거절되면 `runBattle` 이 플래시 후 편성으로 간다
            onRetry: () => {
                const pos = stopBattle ? stopBattle() : state.battle?.resume;
                stopBattle = null;
                if (state.battle) state.battle.resume = { ...pos, auto: false };   // 거절돼 남는 관전이 걷힌 자리에서 다시 서게
                runBattle(stageId, { resume: { ...pos, t: 0, wall: now(), auto: false }, preset: G.run?.preset });
            },
        });
        // 아레나 아래 가방 — 접속 중 = 원정 전투 + 아이템 정리 (GAME_DESIGN §3). 라운드를 이길 때마다 드롭이 들어오고(`refreshBattleSide`)
        //   여기서 바꾼 장비는 **다음에 계산되는 라운드부터** 먹는다 (R89). 칸 · 그림 크기는 캐릭터 탭 가방과 같다 (`.bag` · ADR-0097)
        battleBag = itemsPanel(heroById(state.heroUid), { showTarget: true });
        page.appendChild(battleBag);
        return;
    }
    if (state.exp === 'report' && doneReports().length) { expNav(); return renderExpReport(main); }
    state.exp = 'idle';
    expNav();
    renderExpIdle(main);
}

/** 파티에 넣고 뺀다 — 편성 탭 영웅 띠의 클릭 (2026-08-27, 옛 파티·벤치 행을 띠가 대신한다) · **고른 편성**에 작용한다 · 오류는 `pt.err.<코드>` (§15 · R122) */
const toggleParty = h => {
    const r = SYS.game.toggleParty(G, h.uid, now());
    if (!r.ok) flash(`pt.err.${r.err}`);
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
        ${doneReports().length ? `<button class="btn sm b-report">${t('exp.notice.report')}</button>` : ''}
        <button class="btn sm b-ok">${t('exp.notice.dismiss')}</button>`;
    const rb = box.querySelector('.b-report');
    if (rb) rb.onclick = () => { SYS.game.dismissNotice(G); save(); state.repSel = null; state.exp = 'report'; render(); };
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
        const chapterBoss = z.boss_grade === 'chapter_boss';
        const sin = chapterOf(z.chapter)?.sin ?? 'wrath';
        const bg = stageBgOf(z.stage_id);
        const row = el('div', `zone${unlocked ? '' : ' locked'}${chapterBoss ? ' boss' : ''}${z.stage_id === state.expStage ? ' on' : ''}`);
        row.style.borderLeftColor = unlocked ? sinColor(sin) : '';
        if (bg) {
            row.style.backgroundImage = `linear-gradient(90deg, var(--bg-tertiary) 34%, rgba(4,4,4,.55) 68%, rgba(4,4,4,.30)), url('${bg}')`;
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
                </div>
                <div class="meta">${t('exp.stageMeta', { lv: levelMark(z.stage_id), m: stageMinutes(z) })} · ${t('exp.element', { e: t(`st.atkType.${SYS.battle.stageElement(z)}`) })}</div>
            </div>
            <div>${unlocked ? '' : `<span class="muted" style="font-size:var(--fs-sm)">${t('exp.locked')}</span>`}</div>`;
        // ⚠ 클리어 표시 · 「원정」 칩은 없다 [2026-09-15 사용자 지시 · ADR-0151] — 오른쪽 끝은 잠긴 행의 안내만 든다.
        //   고른 행의 표시는 테두리(`.zone.on`)가 혼자 든다
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
   자리는 **세이브 값**(편성마다의 진형 · R122)이 됐고 **전투가 그것을 읽는다**: 「앞에 있는 유닛부터 때린다」의
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
    if (SYS.game.partyOf(G).includes(src.uid)) {
        if (!SYS.game.placeFormation(G, src.uid, tr, ti).ok) return false;
        save();
        return true;
    }
    // 벤치에서 왔다 — 자리 주인을 먼저 내보내야 정원이 빈다
    if (target !== undefined && !SYS.game.toggleParty(G, target, now()).ok) return false;
    const r = SYS.game.toggleParty(G, src.uid, now());
    if (!r.ok) { flash(`pt.err.${r.err}`); return true; }
    // 넣은 다음 **놓은 칸**으로 옮긴다 — 주인이 빠지며 같은 랭크의 뒤가 당겨졌으므로, 칸을 안 주면 새 영웅이 랭크 끝에 앉는다
    SYS.game.placeFormation(G, src.uid, tr, ti);
    save();
    return true;
}

/** 드래그가 방금 끝났나 — 띠 카드와 보드 칸은 클릭(소속)도 겸하므로 드래그 뒤의 클릭 한 번을 삼킨다 */
let formDragEnded = false;

/** 진형 드래그 = **자리**를 정한다. 잡는 곳이 둘이다 — 로스터 띠 카드(`rank: null`) · 보드에 놓인 영웅. 놓을 곳은 보드 칸이다 */
function bindFormDrag(node, src) {
    bindCardDrag(node, '.fm-cell', tgt => formDrop(src, Number(tgt.dataset.rank), Number(tgt.dataset.idx)));
}

/**
 * 카드 드래그 — 진형(위)과 캐릭터 탭 띠의 순서 맞바꾸기(ADR-0136)가 **같은 손**을 쓴다. `sel` = 놓을 수 있는 칸 · `onDrop(칸)` 이 true 면 다시 그린다.
 * 4px 를 넘어야 드래그로 친다 — 임계 미만이면 **클릭(파티 넣고 빼기 · 영웅 고르기)이 그대로 산다.**
 * **카드 안의 버튼(해고)에서 누른 것은 드래그로 잡지 않는다** — 버튼의 클릭은 버튼의 것이다 (2026-09-15).
 * 고스트는 **감싸개 + 클론 하나**(원본은 자리에 남고 `.drag` 로 흐려진다 · 왜 감싸개인지는 아래 ①②) · 놓을 자리는 elementFromPoint 로 찾는다.
 * **고스트는 한 장(`#stage`) 안에 선다** (ADR-0087) — 크기 · 위치 · 잡은 점 오프셋은 **한 장 단위**(`stagePoint`)다.
 * 4px 임계와 elementFromPoint 는 **창 좌표 그대로**다 — 손이 움직인 거리와 브라우저의 판정이라 배율로 바꾸지 않는다.
 */
function bindCardDrag(node, sel, onDrop) {
    node.onpointerdown = ev => {
        if (ev.button || ev.target.closest('button')) return;
        const x0 = ev.clientX, y0 = ev.clientY;
        const r0 = node.getBoundingClientRect();
        // 카드 사각형 — 모서리 둘을 한 장 좌표로 바꿔 작은 쪽 · 큰 쪽을 고른다. 눕힌 한 장(ADR-0109)에서는 창의 왼쪽 위가 카드의 왼쪽 위가 아니다
        const c0 = stagePoint({ clientX: r0.left, clientY: r0.top }), c1 = stagePoint({ clientX: r0.right, clientY: r0.bottom });
        const n0 = { x: Math.min(c0.x, c1.x), y: Math.min(c0.y, c1.y) }, nw = Math.abs(c1.x - c0.x);
        const p0 = stagePoint(ev);
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
                const face = node.cloneNode(true);
                face.style.width = `${node.offsetWidth}px`;
                face.style.height = `${node.offsetHeight}px`;
                face.style.zoom = nw / node.offsetWidth;
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
            const tgt = document.elementFromPoint(e.clientX, e.clientY)?.closest(sel);
            if (!tgt || tgt === node) return;
            if (onDrop(tgt)) render();
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
        b.onclick = () => { SYS.game.setFormation(G, key); save(); render(); };   // 자리는 세이브 값이다 (2026-09-09) · 원정 중에도 바꾼다 (R92)
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
                // 리더 태그는 띠와 같은 키를 쓴다 — 리더는 파티의 첫 영웅(`partyOf(G)[0]`)이지 진형의 자리가 아니다
                cell.innerHTML = `<div class="fm-nm">${L(h.name)}</div>${heroFace(h)}`
                    + (uid === SYS.game.partyOf(G)[0] ? `<span class="hs-leader">${t('exp.leader')}</span>` : '');
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

/* ═══════════ 편성 탭 (SCREEN_DESIGN §15 · ADR-0192 ~ 0195) ═══════════
   전투에 나가기 전에 정하는 넷이 한 탭에 있다 — 누구(파티) · 어디에(진형) · 무엇을 들고(물약 칸) · 어떤 조건으로(파티 전술).
   편성은 늘 `[balance.csv:party_preset_count]` 개가 서 있고 **상단바 고르개**가 어느 편성을 펼지 정한다(출정 창과 같은 값).
   파티 · 진형 · 물약 칸은 **고른 편성의 것**이고, 파티 전술은 모든 편성이 같이 쓴다 — 카운터 · 켜짐만 고른 편성의 파티로 다시 센다.
   **판정은 전부 game_logic 이 낸다** — 모자람(`presetState`) · 카운터 · 켜짐(`tacticState`). 화면은 고르고 그리기만 한다 */

/** 상단바 고르개 — 원정 · 제련소 · 도감과 같은 자리(§2 탭 세그먼트). 도는 원정의 편성은 「원정 중」을 단다 */
function presetSeg(ps) {
    return segmented(ps.presets.map(p => ({ id: p.no, label: presetLabel(p.no, ps) })), ps.activeNo,
        no => { SYS.game.selectPreset(G, no); save(); render(); });
}

function renderParty(main) {
    const ps = SYS.game.presetState(G);
    $('.tab-seg').appendChild(presetSeg(ps));
    const page = el('div', 'panel page pt-page');
    const body = el('div', 'box-body pt-body');
    body.dataset.keep = 'party';
    // ① 파티 · 진형 — 한 줄에 나란히. 왼쪽 파티가 남는 폭 · 오른쪽 진형이 내용 폭 (§15)
    const top = el('div', 'pt-top');
    const pb = el('div', 'pt-party');
    pb.appendChild(el('div', 'pt-h', t('pt.party.h')));
    // `deployed` — 옆에 진형 보드가 늘 있으므로 파티 카드의 반투명(「보드에 들어가 있다」 · ADR-0056 · 0058)이 늘 참이다
    pb.appendChild(heroStrip(toggleParty, { leaderUid: SYS.game.partyOf(G)[0] ?? null, flat: true, partyMode: true, deployed: true }));
    top.appendChild(pb);
    top.appendChild(formBox());
    body.appendChild(top);
    body.appendChild(potionBox(ps));          // ② 물약 칸
    body.appendChild(tacticsBlock());         // ③ 파티 전술
    page.appendChild(body);
    main.appendChild(page);
}

/** 물약 한 칸의 그림 — 관전 아레나 칸과 같은 그림 · 없으면 병 실루엣 (`battle.js:potionBeltHtml` 과 같은 규칙) */
const potionImg = id => {
    const src = id ? M.potionArt(id) : null;
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">`
        : `<img class="p-bg" src="${M.POTION_SLOT_ART}" alt="" loading="lazy" onerror="this.remove()">`;
};

/**
 * 물약 — 왼쪽 **칸**(이 편성의 구성) · 오른쪽 **가진 물약**(그림 + 개수) [2026-09-21 · §15 · ADR-0195].
 * 손 — **가진 물약 클릭 = 앞의 빈 칸에** · **칸 클릭 = 비우기** · **드래그**: 가진 물약 → 칸(그 칸에 넣는다) · 칸 → 칸(맞바꾼다 — 앞 칸부터 마시므로 순서가 결정이다).
 * 진형과 같은 손(`bindCardDrag`)이라 끈 뒤의 클릭 한 번은 삼킨다. **재고보다 많이 넣어도 막지 않는다** — 모자란 칸은 흐리게 선다(`short` · 런에서 빈다)
 */
function potionBox(ps) {
    const cur = ps.presets[ps.activeNo - 1];
    const box = el('div', 'pt-sec pt-potion');
    box.appendChild(el('div', 'pt-h', t('pt.potion.h')));
    const row = el('div', 'pt-potion-row');
    const act = r => { if (!r.ok) flash(`pt.err.${r.err}`); else save(); return true; };
    const belt = el('div', 'p-belt');
    cur.potionSlots.forEach((s, i) => {
        const info = s ? potionInfo(s.id) : null;
        const c = el('span', `p-slot pt-slot${s ? ' full' : ''}${s?.short ? ' short' : ''}`, s ? potionImg(s.id) : potionImg(null));
        c.dataset.slot = i;
        c.title = !s ? t('pt.potion.empty')
            : `${t('fg.potion.tip', { name: L(info?.name ?? s.id), n: info?.heal ?? 0 })}${s.short ? ` · ${t('pt.potion.short')}` : ''}`;
        if (s) {
            c.onclick = () => { if (formDragEnded) return; act(SYS.game.setPotionSlot(G, i, null)); render(); };
            bindCardDrag(c, '.pt-slot', tgt => act(SYS.game.swapPotionSlot(G, i, Number(tgt.dataset.slot))));
        }
        belt.appendChild(c);
    });
    row.appendChild(belt);
    // 가진 물약 — **가진 것과 만들 수 있는 것만** 선다(0 개는 흐리게 · 잠긴 단계는 안 선다 — 제련소가 든다)
    const stock = el('div', 'pt-stock');
    stock.appendChild(el('span', '', t('pt.potion.stock')));
    const rows = SYS.game.potionState(G).list.filter(r => r.have > 0 || r.craftable);
    for (const r of rows) {
        const info = potionInfo(r.id);
        const c = el('span', `p-stock${r.have ? '' : ' zero'}`, `<span class="p-slot full">${potionImg(r.id)}</span><b>×${r.have}</b>`);
        c.title = t('fg.potion.tip', { name: L(info.name), n: r.heal });
        c.onclick = () => { if (formDragEnded) return; act(SYS.game.setPotionSlot(G, null, r.id)); render(); };
        bindCardDrag(c, '.pt-slot', tgt => act(SYS.game.setPotionSlot(G, Number(tgt.dataset.slot), r.id)));
        stock.appendChild(c);
    }
    if (!rows.length) stock.appendChild(el('span', 'fg-ptag muted', t('fg.potion.none')));
    row.appendChild(stock);
    box.appendChild(row);
    return box;
}

/** 파티 전술 — 칸 이름 옆 잔글씨 「모든 편성이 같이 쓴다」 · 진척 줄 · 칸 격자 (§15 · ADR-0194). 카운터 · 켜짐은 **고른 편성의 파티**로 센다(`tacticState` 기본값) */
function tacticsBlock() {
    const ts = SYS.game.tacticState(G);
    const next = ts.slots.find(s => !s.open);
    /** 리롤 — 거절 사유는 state 가 코드로 낸다 (INTERFACE §3) */
    const reroll = no => {
        const r = SYS.game.rerollTactic(G, no);
        if (r.ok) { flash('rs.reroll.done', { o: `${condText(r.option)} → ${optionEffect(r.option)}` }); save(); }
        else flash(`pt.err.${r.err}`);
        render();
    };
    const box = el('div', 'pt-sec pt-tactics');
    box.appendChild(el('div', 'pt-h', `${t('rs.h')}<small>${t('pt.tactic.shared')}</small>`));
    box.appendChild(el('div', 'rs-head', `
        <span>${t('rs.total')} <b>${ts.totalLevel}</b></span>
        <span>${t('rs.open')} <b>${ts.open}</b> <span class="muted">/ ${ts.count}</span></span>
        <span class="muted">${next
            ? t('rs.next', { no: next.no, n: next.unlockTotalLevel - ts.totalLevel })
            : t('rs.allOpen')}</span>`));
    const grid = el('div', 'rs-grid');
    for (const slot of ts.slots) grid.appendChild(tacticCell(slot, reroll));
    box.appendChild(grid);
    return box;
}

/* ═══════════ 출정 창 (SCREEN_DESIGN §4-1 · ADR-0084 · ADR-0088) ═══════════
   스테이지 행을 누르면 **탭 위에 겹쳐 뜨는 창**이다 — 옛 접이식 전진 패널(2026-08-28~2026-09-10)이 통째로 옮겨 왔다.
   속은 **이름 붙은 칸 넷이 2×2** 로 선다 (ADR-0088):
     위 줄   = **편성 ↔ 적 구성** — 누구를 보내나 ↔ 누구와 싸우나(마주 선다) · 창은 편성을 **고르기만** 한다 (ADR-0193)
     아래 줄 = **출정 방식** ↔ **이야기** — 갈까 ↔ 어떤 곳인가 (ADR-0105 · 진형은 편성 탭으로 갔다 — ADR-0192)
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
        <small>${t('exp.stageMeta', { lv: levelMark(z.stage_id), m: stageMinutes(z) })} · ${t('exp.element', { e: t(`st.atkType.${SYS.battle.stageElement(z)}`) })}</small>`;
    return h;
}

/** 위험도 — **지금 레벨**(올렸으면 올린 레벨)을 찍는다. 올린 스테이지는 숫자가 강조색이다
 *  [2026-09-14 · SCREEN_DESIGN §4-1 · ADR-0104]. 스테이지 행 부제와 창 머리가 같은 값을 쓴다 — 범위 · 판정은 `stageLevelState` 가 낸다 */
function levelMark(stageId) {
    const s = SYS.game.stageLevelState(G, stageId);
    return s.level > s.base ? `<b class="lv-up">${s.level}</b>` : String(s.level);
}

/** 위험도 줄 — **출정 방식 칸의 맨 위** [2026-09-14 제안 후 승인 · SCREEN_DESIGN §4-1 · ADR-0104].
 *  윗줄 = 「위험도」 + 잔글씨 범위 · 아랫줄 = `«` `‹` 지금 레벨 `›` `»`. **범위와 판정은 `stageLevelState` 가 낸다** —
 *  화면은 끝에 닿은 버튼을 흐리게 할 뿐이다. 못 올리는 상태(아무것도 안 깬 초반)에서도 **줄은 선다** — 창 크기는
 *  상태에 흔들리지 않는다(2026-08-28). 누르는 즉시 저장 — 반복 원정이 도는 스테이지면 **다음 런부터** 먹는다
 *  (지금 재생 중인 런은 출발 때 이미 정산됐다) */
function levelRow(z) {
    const s = SYS.game.stageLevelState(G, z.stage_id);
    const box = el('div', 'lv-box');
    const head = el('div', 'lv-head');
    const label = el('span', 'lv-h', t('exp.level.h'));
    label.title = t('exp.level.tip');
    head.appendChild(label);
    head.appendChild(el('span', 'lv-range', t('exp.level.range', { min: s.base, max: s.max })));
    box.appendChild(head);
    const set = lv => {
        const r = SYS.game.setStageLevel(G, z.stage_id, lv);
        if (!r.ok) flash(`exp.err.${r.err}`); else save();
        render();
    };
    const btn = (glyph, key, lv, off) => {
        const b = el('button', 'btn sm lv-btn', glyph);
        b.title = t(key);
        b.disabled = off;
        b.onclick = () => set(lv);
        return b;
    };
    const atBase = s.level <= s.base, atMax = s.level >= s.max;
    const row = el('div', 'lv-row');
    row.appendChild(btn('«', 'exp.level.base', s.base, atBase));
    row.appendChild(btn('‹', 'exp.level.down', s.level - 1, atBase));
    const val = el('span', `lv-val${s.level > s.base ? ' up' : ''}`, String(s.level));
    val.title = t('exp.level.tip');
    row.appendChild(val);
    row.appendChild(btn('›', 'exp.level.up', s.level + 1, atMax));
    row.appendChild(btn('»', 'exp.level.max', s.max, atMax));
    box.appendChild(row);
    return box;
}

/** 출정 방식 — **위험도 줄**(`levelRow` · 2026-09-14 · ADR-0104) + 경고 줄 + 같은 크기 버튼 둘. 반복 원정은 별도 줄이 아니라 **버튼**이다 (2026-08-28 사용자 지시):
 *  옛 줄은 「런의 스테이지일 때만」 붙어서 칸 크기가 흔들렸다. 버튼은 항상 있으므로 크기가 고정된다. */
function goBox(z) {
    const side = el('div', 'fp-side');
    side.appendChild(el('div', 'dw-h', t('exp.go.h')));
    side.appendChild(levelRow(z));   // 위험도 — 칸 이름 바로 아래 · 보내기보다 위 (ADR-0104)
    // 경고는 있을 때만 글자가 뜨지만 **줄은 항상 잡는다** — 안 그러면 칸이 상태에 따라 커졌다 작아진다 (2026-08-28)
    // 상태 경고는 없다 [2026-09-03] — 전투 밖에 쓰러져 있는 영웅이 없으므로 막히는 경우가 파티 0 하나뿐이다
    //   고른 편성으로 나가므로 판정도 그 편성의 것이다 — 빈 파티 · 수색 나간 영웅(`presetState` 의 `err` · 2026-09-21 · R122)
    const pst = SYS.game.presetState(G), perr = pst.presets[pst.activeNo - 1]?.err;
    side.appendChild(el('div', 'down exp-warn', { noParty: t('exp.noParty'), searching: t('exp.departSearching') }[perr] ?? ''));

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

/** 이야기 — 창의 **아래 줄 오른쪽 · 적 구성 아래** [2026-09-14 사용자 지시 · §4-1 · ADR-0105].
 *  이 스테이지의 **이야기 글**(`stage.csv:story_kr/_en`)을 찍는 **읽는 자리**다 — 클릭이 없다.
 *  **글 길이가 창을 흔들지 않는다** — 칸이 크기 격리(`.dw-story`)라 열 폭은 적 구성이, 줄 높이는 진형이 정한다.
 *  글은 데이터라 `textContent` 로 넣는다. 이름 자리(`{m:…}` · `{leader}`)는 `data.js:fillStory` 가 푼다 — 리더 = 파티 첫 슬롯 [2026-09-15] */
function storyBox(z) {
    const box = el('div', 'dw-story');
    box.appendChild(el('div', 'dw-h', t('exp.story.h')));
    const p = el('p', 'dw-story-text');
    const leader = heroById(SYS.game.partyOf(G)[0]);   // 고른 편성의 리더 — 편성 고르개를 바꾸면 따라 바뀐다 (§4-1 · R122)
    p.textContent = fillStory(L(stageStory(z)), lang(), { leader: leader ? leader.name : null, fallback: t('exp.story.noLeader') });
    box.appendChild(p);
    return box;
}

/** 편성 번호의 이름 — 도는 원정의 편성이면 「원정 중」을 붙인다(영웅 띠의 「원정 중」과 같은 말 · 색) (§15 · §4-1) */
const presetLabel = (no, ps) => t('pt.preset', { n: no })
    + (no === ps.runNo ? `<span class="pt-run">${t('hs.doing.expedition')}</span>` : '');

/**
 * 창의 **편성** 칸 — 위 줄 왼쪽 [2026-09-21 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0193].
 * 왼쪽에 편성 버튼이 세로로 · 오른쪽에 **고른 편성의 영웅 셋이 초상으로**. 초상은 **읽기 전용**이다 — 고치려면 편성 탭으로 간다.
 * 초상은 **셋만큼 자리를 늘 잡는다**(덜 찬 자리는 점선 빈 칸) — 편성마다 인원이 달라도 창이 안 흔들린다(적 구성이 넷을 잡는 것과 같다).
 * 고른 값은 편성 탭 고르개와 **하나다**(`selectPreset`).
 */
function presetPick() {
    const ps = SYS.game.presetState(G);
    const cur = ps.presets[ps.activeNo - 1];
    const hb = el('div', 'dw-block');
    hb.appendChild(el('div', 'dw-h', t('nav.party')));
    const row = el('div', 'pk-row');
    const btns = el('div', 'pk-btns');
    for (const p of ps.presets) {
        const b = el('button', `btn sm${p.no === ps.activeNo ? ' on' : ''}`, presetLabel(p.no, ps));
        b.onclick = () => { SYS.game.selectPreset(G, p.no); save(); render(); };
        btns.appendChild(b);
    }
    row.appendChild(btns);
    const faces = el('div', 'pk-faces');
    for (let i = 0; i < D.balance.party_size_max; i++) {
        const h = heroById(cur.party[i]);
        const c = el('div', `pk-face${h ? '' : ' empty'}`);
        if (h) {
            c.style.borderTopColor = tierColor(h);
            // 위칸이 없다 — 이름은 툴팁이 든다. 첫 자리는 리더(띠 · 진형 칸과 같은 뱃지)
            c.innerHTML = heroFace(h) + (i === 0 ? `<span class="hs-leader">${t('exp.leader')}</span>` : '');
            bindTipNode(c, () => heroTipCard(h, combatOf(h), itemOf, it => equippedItemTipCard(h, it)), { anchor: true, holdOnAlt: true });
        }
        faces.appendChild(c);
    }
    row.appendChild(faces);
    hb.appendChild(row);
    return hb;
}

/**
 * 창의 속 — **이름 붙은 칸 넷이 격자 하나에 2×2** 로 선다 (ADR-0088). 갈 곳은 위 목록에서 이미 골랐고, 여기서 **어느 편성을** 보낼지 고른다.
 *   위 줄   ① **편성** ↔ ② **적 구성** — 누구를 보내나 ↔ 누구와 싸우나(마주 선다)
 *   아래 줄 ③ **출정 방식** ↔ ④ **이야기** — 갈까 ↔ 어떤 곳인가
 *   [2026-09-21 사용자 지시 · ADR-0193] 창은 **편성을 짜지 않는다** — 영웅 띠와 진형 보드는 편성 탭(§15)으로 갔고, ①은 편성 고르개 + 초상 셋이다.
 *   칸 넷이 **격자의 직접 자식**이다 — 줄마다 감싸면 세로 구분선이 두 줄을 관통하지 못한다.
 *   가림막은 클래스가 세운다 — 오른쪽 열 `dw-c2` · 아래 줄 `dw-r2` (style.css `.dw-body`).
 */
function departBody() {
    const z = D.stages[state.expStage];
    const body = el('div', 'dw-body');
    body.appendChild(presetPick());           // ① 편성 — 고르개 + 초상 셋(읽기 전용)
    const foe = foeBox(z), prep = el('div', 'dw-prep'), story = storyBox(z);
    foe.classList.add('dw-c2');               // ② 적 구성 — 위 줄 오른쪽 · 읽는 자리다(클릭 없음)
    prep.classList.add('dw-r2');              // ③ 아래 줄 왼쪽 — 출정 방식 하나. 칸(가림막)은 열 폭 전체이고 출정 방식은 제 폭을 든다(`.fp-side` 폭 못박음)
    prep.appendChild(goBox(z));               //    위험도 + 경고 + 반복 원정 + 보내기
    story.classList.add('dw-c2', 'dw-r2');    // ④ 이야기 — 아래 줄 오른쪽 · 적 구성 아래 · 읽는 자리다(클릭 없음)
    body.appendChild(foe);
    body.appendChild(prep);
    body.appendChild(story);
    return body;
}

/* ═══════════ 리포트 — 왼쪽 런 목록 · 오른쪽 상세 (SCREEN_DESIGN §4-3 · ADR-0063) ═══════════
   반복 원정은 이기는 동안 런을 잇고, 끝난 런은 `G.reports` 맨 앞에 쌓인다(세이브 v21 · 상한 balance:report_keep).
   왼쪽은 **고르는 자리**(한 줄 = 한 런) · 오른쪽은 **읽는 자리**다. 고른 줄은 `state.repSel`(화면 상태 — `null` 이면 맨 위를 따라간다). */

/** 리포트 목록은 **끝난 원정만** 든다 (§4-3 · ADR-0123) — 도는 원정의 리포트도 `G.reports` 맨 앞에 서서 라운드마다 차지만
 *  (끊기면 그 값으로 선다 · INTERFACE §2-7) 목록에는 안 선다. 지금 도는 것은 관전이 든다 */
const runningReport = R => R.reason == null && G.run?.active === true && R.at === G.run.lastAt;
const doneReports = () => G.reports.filter(R => !runningReport(R));

/** 지난 시간 — 분 · 시간 · 일 중 **하나로만**. 줄이 좁아 두 단위를 못 쓴다 */
function agoText(at) {
    const m = Math.max(0, Math.floor((now() - at) / 60000));
    if (m < 1) return t('rep.ago.now');
    if (m < 60) return t('rep.ago.m', { n: m });
    const h = Math.floor(m / 60);
    return h < 24 ? t('rep.ago.h', { n: h }) : t('rep.ago.d', { n: Math.floor(h / 24) });
}

/** 판정 — 철수(시간 초과 · 철수 버튼 · 게임이 꺼져 끊김)는 패배(전멸)와 **색을 가른다**. 이긴 라운드의 보상이 남으므로 실패가 아니다 (§4-3) */
const verdictOf = R => {
    const withdrew = R.reason === 'timeout' || R.reason === 'retreat' || R.reason === 'closed';
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
        row.onclick = () => { state.repSel = i === 0 ? null : R; render(); };   // 맨 위를 고르면 따라가기로 돌아간다 (ADR-0123)
        box.appendChild(row);
    });
    p.appendChild(box);
    return p;
}

/** 획득 장비 — **가방 칸과 같은 그림 · 같은 테두리 · 같은 비교 툴팁**(§6).
 *  **리포트는 보기 전용이다** [2026-09-21 · ADR-0186] — 분해 · 장착 · 이동은 전부 캐릭터 탭(§6)이 든다.
 *  **자리가 런마다 같다** (ADR-0086) — 격자는 한 줄 높이로 못박히고 「없음」도 그 안에 선다. 버린 수는 머리 줄 안으로 */
function dropSection(p, R) {
    const head = el('h2', '', `<span>${t('rep.drops.h')} <small>${t('rep.drops.sub', { n: R.drops.length })}</small></span>`);
    p.appendChild(head);
    const tail = el('span', 'rep-h-tail');
    if (R.discarded) tail.appendChild(el('small', 'down', t('rep.discarded', { n: R.discarded })));
    head.appendChild(tail);
    const box = el('div', 'rep-drops rep-cut');
    p.appendChild(box);
    if (!R.drops.length) { box.appendChild(el('div', 'muted rep-note', t('rep.drops.none'))); return; }
    const grid = el('div', 'inv-cells wide');
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
            + (us && us.up > 0 ? `<span class="inv-up">+${us.up}</span>` : '')
            + `<span class="inv-lv">${t('ch.itemLv', { n: d.ilvl })}</span>`;   // 가방 칸과 같은 배지 (§4-3 · ADR-0168)
        if (d.rarity === 'unique') cell.classList.add('shine');
        bindTip(cell, d);                        // 방금 주운 것 = 「이 아이템」(기본값). ⚠ 「착용 중」이 아니다 (§6 머리글) · 맥락을 안 넘긴다 — 주인이 없어 스킬 숫자가 식으로 선다 (ADR-0139)
        grid.appendChild(cell);                  // 클릭은 안 건다 — 보기 전용이다 (ADR-0186)
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
 *   줄 높이는 초상이 정하므로 표시가 붙어도 표가 안 자란다. `marks` = `{ up: Map(uid → {from, to}), down: Set(uid), xp: Map(uid → 받은 경험치) }`
 *   **받은 경험치도 이름 아래**다 (R89) — 쓰러진 영웅은 그 뒤 라운드 몫이 없어 영웅마다 다르다. 레벨업은 그 줄 끝에 붙는다
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
        const lu = marks.up.get(c.uid), down = marks.down.has(c.uid), xp = marks.xp?.get(c.uid);
        const up = lu ? t('rep.contrib.levelUp', { a: lu.from, b: lu.to }) : '';
        // 이름 아랫줄 — 받은 경험치(+ 레벨업). 경험치 칸이 없는 옛 표시(`xp` 없음)는 레벨업만 (ADR-0086)
        const sub = xp != null
            ? `<em class="xp">${t('rep.contrib.xp', { n: xp.toLocaleString() })}${up ? ` <span class="up">${up}</span>` : ''}</em>`
            : (up ? `<em class="up">${up}</em>` : '');
        return `<div class="ct-row">
            <span class="n${down ? ' dead' : ''}"${down ? ` title="${t('rep.downed')}"` : ''}>${h ? heroFace(h) : ''}<span class="nm"><b>${h ? L(h.name) : '—'}</b>${sub}</span></span>
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
    xp: new Map(Object.entries(R.xp ?? {})),     // 영웅별 받은 경험치 (R89)
});
/** 리포트 윗줄의 경험치 = 파티가 받은 **합** — 영웅마다 다르므로(쓰러진 영웅은 그 뒤 라운드 몫이 없다) 각자 몫은 기여 표가 든다 (R89) */
const xpSum = R => Object.values(R.xp ?? {}).reduce((a, b) => a + b, 0);

/** 기여 — 끝난 원정의 집계(`report.contrib`)를 그린다. 도는 원정의 누계는 관전의 누적 데미지 판이 든다 (§4-2 · ADR-0123)
 *  집계가 아예 없는 옛 리포트(v20 이하 이관본)는 **자리만 잡고 안 그린다** — 0 을 지어내면 「못 때렸다」로 읽히고,
 *  상자를 빼면 그 런만 상세가 짧아진다 (ADR-0086) */
function contribSection(p, R) {
    const has = !!R.contrib?.length;
    p.appendChild(el('h2', has ? '' : 'void', `<span>${t('rep.contrib.h')}</span>`));
    const box = el('div', `rep-ct rep-cut${has ? '' : ' void'}`);
    box.innerHTML = contribRowsHtml(R.contrib ?? [], marksOf(R));
    p.appendChild(box);
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
let clocksOn = false;         // 부팅 꼬리(`startClocks`)를 이미 걸었나 — 출구가 여럿이라 두 번 걸리지 않게 막는다 (부채 #51)

/** 런이 끝나는 시각 — **마지막 라운드가 계산되기 전엔 모른다**(무한대). 계산되면 결과의 `reason` 이 서고 그 끝이 곧 런의 끝이다 (R89) */
const runEnd = B => (B.result.reason != null ? B.result.durationSec : Infinity);
/** 원정 세그먼트의 관전 칸 상태 — 'none'(관전할 원정 없음) · 'live'(도는 중) · 'over'(**재생 위치가 런의 끝에 닿았다** — 결과 띠가 서는 순간) (ADR-0147).
 *  관전이 떠 있으면 위치는 재생기가 들고, `render()` 첫 줄이 `resume` 에 받아 둔 뒤 이것을 읽는다 */
const battlePhase = B => (!B ? 'none' : (B.resume?.t ?? 0) + 1e-9 >= runEnd(B) ? 'over' : 'live');

/**
 * 라운드 넘기기 [2026-09-14 · R89 · SCREEN_DESIGN §4] — 진행 시각이 지금 계산된 라운드의 끝(`run.segEnd`)을 지났으면
 * 그 라운드를 정산하고(이긴 라운드만 보상) 다음 라운드를 **그 순간의 장비 · 레벨로** 붙인다. 한 번에 여러 라운드를 넘을 수 있다(숨긴 탭).
 * **시각을 미는 쪽 둘**(관전 재생기의 `onTime` · 앱 시계 `expTick`)이 시각을 밀기 전에 부른다 — 정산을 부르는 곳은 여기 한 곳이다
 * @returns 정산한 라운드 수
 */
function advanceBattle(B, tNow, at) {
    let n = 0;
    while (B?.run && !B.run.done && tNow >= B.run.segEnd) {
        SYS.game.advanceRun(G, B.run, at);
        n++;
    }
    if (n) { save(); onRoundsSettled(); }
    return n;
}

/** 라운드가 정산됐다 — 가방 · 골드 · 레벨 · 리포트가 바뀌었다. 관전이 떠 있으면 재생기를 걷지 않고 **옆 칸만**, 아니면 보던 화면을 다시 그린다 */
function onRoundsSettled() {
    if (document.hidden || !G || state.screen !== 'game') return;
    if (stopBattle) { refreshBattleSide(); return; }
    render();
}

/** 관전이 떠 있을 때의 라운드 정산 — 자원 띠 숫자와 아레나 아래 보관 칸만 갈아 끼운다(재생기 · 로그 · 스크롤은 그대로) */
function refreshBattleSide() {
    const r = G.resources;
    for (const [k, v] of Object.entries({ gold: r.gold.toLocaleString(), dust: r.dust, stigma: r.stigma })) {
        const b = $(`.resources [data-res="${k}"]`);
        if (b) b.textContent = v;
    }
    if (!battleBag?.isConnected) return;
    hideTip();                        // 갈아 끼울 칸 위에 떠 있던 툴팁이 주인을 잃는다
    const fresh = itemsPanel(heroById(state.heroUid), { showTarget: true });
    battleBag.replaceWith(fresh);
    battleBag = fresh;
}

function expTick() {
    if (frozen) return;          // 다른 탭이 세이브를 썼다 — 이 탭의 원정은 더 흐르지 않는다 (SCREEN_DESIGN §2-1)
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
        const r = B.resume ?? { t: 0, speed: 1, running: true, tab: 'log' };
        // 유저가 세워 둔 것 — 시계를 멈추는 것은 이것 하나다. 세워 둔 동안에도 박자는 민다(다시 틀 때 그 시간이 한꺼번에 흐르지 않게)
        if (r.running === false) { B.resume = { ...r, wall: at }; return; }
        if (r.t >= runEnd(B) && !r.auto) return;   // 끝난 런. `auto` = 결과 띠가 다음 런을 세던 도중에 걷혔다 — 이어서 세운다
        const speed = r.speed ?? 1;
        const tNow = r.t + Math.max(0, at - (r.wall ?? at)) / 1000 * speed;
        // 그 시각까지 끝난 라운드를 정산하고 다음 라운드를 붙인다 — 한 눈금에 여러 라운드를 넘을 수 있다(숨긴 탭은 1분에 한 번 깬다 · R89)
        advanceBattle(B, tNow, at);
        const end = runEnd(B);               // 마지막 라운드가 계산되기 전엔 끝을 모른다(무한대)
        B.resume = { ...r, t: Math.min(end, tNow), wall: at, auto: false };
        if (tNow < end) return;
        // 끝 — 관전의 `onEnd` 와 **같은 규칙**이다. 어느 탭에서 끝났든 반복 원정이면 다음 런이 출발한다
        if (G.run?.repeat && B.result.won) {
            const endedAt = at - (tNow - end) / speed * 1000;   // 이 런이 실제로 끝난 순간 = 다음 런이 출발한 순간
            runBattle(B.stageId, { at: endedAt, resume: { ...r, t: 0, wall: endedAt, auto: false }, preset: G.run.preset });
            // 관전이 섰으면 재생기가 시계다 · 출발이 거절됐으면 멈춘다. 새 런은 라운드마다 시각을 먹으므로(한 틱 이상) 이어 돌아도 끝없이 돌지 않는다 (R89)
            if (stopBattle || state.battle === B) return;
            continue;
        }
        save();
        // 보고 있던 화면을 뺏지 않는다 — 끝나도 원정 세그먼트는 **안 바뀐다** [2026-09-15 사용자 지시 · ADR-0140].
        //   관전을 보다 떠났으면 원정 탭으로 돌아올 때 결과 띠가 선 그 관전이, 편성을 열어 뒀으면 편성이 서 있다. 리포트는 띠의 [리포트 보기]로 간다
        render();
        return;
    }
}

/**
 * 멈췄다 깨어났다 — 앱 시계가 `FROZEN_GAP_MS` 넘게 안 불렸다. 그 사이 JS 가 통째로 멈춰 있었다(PC 절전 · 브라우저 절전 탭).
 * **게임을 껐다 켠 것과 같이 본다** [2026-09-11 사용자 승인 · ADR-0102] — 진행 중이던 원정은 **끊고**(진행 중 라운드를 버린다 · R89) 반복을 끈다
 * (`closeRun` · 재접속 알림). 공백을 따라잡아 런을 몰아 돌리지 않는다. 진행 중인 런이 없으면 할 일이 없다
 */
function closeFrozenRun(at) {
    if (!G || state.screen !== 'game') return;
    const B = state.battle;
    if (!B) return;
    const mounted = !!stopBattle;
    if (mounted) { B.resume = stopBattle(); stopBattle = null; }   // 관전이 떠 있었으면 그 자리가 곧 멈춘 자리다
    const r = B.resume ?? { t: 0, speed: 1, running: true, tab: 'log' };
    if (B.run.done && !r.auto) { if (mounted) render(); return; }  // 이미 끝난 런 — 걷은 관전만 다시 세운다
    // 진행 중이던 원정은 **끊는다** [개정 2026-09-14 · R89] — 멈춘 공백을 따라잡아 마무리하지 않는다(진행 중 라운드는 버린다).
    //   끝난 런이 다음 런을 세던 중(`auto`)이었으면 반복만 끈다
    const cut = !B.run.done;
    SYS.game.closeRun(G, at);
    if (cut) state.battle = null;                                  // 버린 라운드는 다시 볼 것이 없다
    else B.resume = { ...r, t: B.result.durationSec, wall: at, auto: false };
    if (G.run?.stageId === state.expStage) state.expRepeat = false;   // 편성 창의 반복 버튼과 어긋나지 않게
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
        cloudPush();   // 숨길 때 올린다 — 이대로 닫힐 수도 있다 (SCREEN_DESIGN §2-1)
        return;
    }
    expTick();
    render();
}

/** 상세 — 고른 런 하나를 편다 */
function reportDetail(R) {
    const stage = D.stages[R.stageId];
    const v = verdictOf(R);
    // 깬 라운드 수는 정산이 실어 보낸다 — 옛 리포트(v4 이전)에는 없어서 그때만 짐작한다
    const roundsDone = R.roundsCleared ?? (R.won ? R.rounds.length : Math.max(0, R.rounds.length - 1));
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
            <span class="muted">${fmtDuration(R.durationSec * 1000)}${R.won || R.reason == null ? '' : ` · ${t(`rep.reason.${R.reason}`)}`}</span>
        </div>
        <div class="gain-row rep-cut">
            <div><span>${t('res.gold')}</span>${R.gold.toLocaleString()}</div>
            <div><span>${t('rep.xp')}</span>${xpSum(R).toLocaleString()}</div>
            <div><span>${t('rep.rounds')}</span>${t('rep.roundsCleared', { n: roundsDone, total: stage ? SYS.battle.stageRounds(stage).length : R.rounds.length })}</div>
            <div><span>${t('rep.downed')}</span>${R.downed.length ? `<span class="down">${t('rep.downedN', { n: R.downed.length })}</span>` : t('rep.none')}</div>
            <div><span>${t('rep.miss')}</span>${missText}</div>
        </div>`;

    dropSection(p, R);
    // 기여 — 레벨업 · 전투불능도 **이 표의 영웅 줄**이 든다 (ADR-0086). 상세 아래에 따로 서던 줄과 상자는
    //   런마다 상세 높이를 흔들었다. 레벨업은 **레벨만** 적는다(ADR-0073 — 오른 능력치는 체감이 없어 보상으로 읽히면 안 된다)
    contribSection(p, R);
    // ~~도감 카드 줄~~ 은 2026-09-21 삭제 — 도감 카드를 걷었다(레벨은 처치 수 · monster_design §8 · SCREEN_DESIGN §4-3)
    // 버튼은 없다 — 리포트는 확인용이다 (ADR-0210). 다시 보내기는 출정 창 · 결과 띠, 반복은 출정 창이 든다
    return p;
}

function renderExpReport(main) {
    const list = doneReports();
    // 고른 줄 — `null` 이면 맨 위를 따라간다. 옛 줄을 골라 뒀으면 끝난 원정이 위에 들어와도 그 줄에 남는다(보던 것을 뺏지 않는다 · ADR-0123).
    //   그 줄이 상한에 밀려 나갔거나 세이브를 다시 불러와 없어졌으면 맨 위로
    const idx = Math.max(0, list.indexOf(state.repSel));
    const R = list[idx];
    const cols = el('div', 'cols c-side page');
    cols.appendChild(runListPanel(list, idx));
    cols.appendChild(reportDetail(R));
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
   초상화가 주인공 — 그 아래 이름과 "지금 뭘 하는가"만 적는다. 직업·레벨·죄종은 마우스를 올리면 나온다(캐릭터 탭 띠는 안 뜬다 · ADR-0116).
   세 탭이 같은 띠를 쓰므로 어느 탭에서든 로스터가 같은 자리, 같은 순서로 보인다. */

/**
 * 영웅이 지금 하는 일 — **원정 중 / 대기** 둘 [개정 2026-09-08 사용자 지시 · SCREEN_DESIGN §5].
 * 「원정 중」은 **지금 싸우는 영웅**이다 — 도는 원정이 나갈 때의 인원(`game.runParty`) · 파티에 편성만 해 둔 상태는 대기다.
 * 원정 중에도 편성을 바꾸므로(R92) 편성이 아니라 원정을 읽는다 — 파티에서 뺀 영웅도 그 원정이 끝날 때까지 원정 중이다.
 * 어느 탭 · 어느 원정 화면(편성 · 관전 · 리포트)에서든 같은 답이다.
 * 파견은 미구현이라 아직 대기로 뭉뚱그린다. ~~출정 아웃~~ 은 2026-09-08 폐기(아웃이 런을 넘지 않는다).
 */
function heroDoing(h) {
    // 수색이 먼저다 — 나가 있으면 원정에 못 들어가고 싸우는 영웅은 수색에 못 나가므로(state.js:toggleParty · searchSend) 두 상태가 겹칠 수 없다
    if (G.search?.heroUid === h.uid) return { cls: 'exp', text: t('hs.doing.search') };
    const out = SYS.game.runParty(G).includes(h.uid);
    return out ? { cls: 'exp', text: t('hs.doing.expedition') } : { cls: 'idle', text: t('hs.doing.idle') };
}

/**
 * 영웅 띠 패널 — 원정(편성)·캐릭터·스킬·선술집 공통. onPick(hero) 가 카드 클릭.
 * **파란 겉 테두리는 띠마다 뜻이 다르다** [개정 2026-09-09 사용자 지시 · SCREEN_DESIGN §5]:
 *   편성 띠(`partyMode`)에서는 **파티에 든 영웅**(`party`) · 그 밖의 띠에서는 **지금 클릭한 영웅**(`on`).
 *   한 띠에 한 뜻만 선다 — 편성에서는 클릭이 곧 편성이라 「본 영웅」 표시가 설 자리가 없고,
 *   09-08 판은 그 자리에 `heroUid` 를 그려서 **눌러도 아무 변화가 없는 화면**이 돼 있었다.
 * 카드 = 초상(카드 전체) + 위칸(왼쪽 지금 하는 일 · 오른쪽 이름) — SCREEN_DESIGN §5 (2026-08-27)
 * 올려놓으면 착용 장비 툴팁, Alt 동안 세부 옵션 (ui/tip.js heroTipCard · ADR-0171) — `tip: false` 면 안 뜬다(캐릭터 탭 · 2026-09-15 · ADR-0116)
 * leaderUid — 편성 화면만 준다. 파티 첫 슬롯 = 리더 (옛 파티 행의 리더 표시를 띠가 이어받았다)
 * flat — 편성 패널처럼 이미 패널 안에 들어갈 때. 패널 껍데기(테두리·배경·여백)를 벗는다
 * reorder — 카드를 끌어 다른 카드에 놓으면 두 영웅의 로스터 자리를 맞바꾼다 (캐릭터 탭 · 2026-09-15 · ADR-0136)
 */
function heroStrip(onPick, { leaderUid = null, flat = false, partyMode = false, dismissable = false, deployed = false, tip = true, reorder = false } = {}) {
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
            ? (SYS.game.partyOf(G).includes(h.uid) ? ' party' : '')
            : (h.uid === state.heroUid ? ' on' : '');
        const c = el('div', `hs-card${mark}${h.tier === 'unique' ? ' unique' : ''}`);
        c.style.borderTopColor = tierColor(h);
        c.dataset.uid = h.uid;   // 순서 맞바꾸기의 놓을 곳 — 빈 칸(+)은 uid 가 없어 놓을 곳이 아니다 (ADR-0136)
        // 옛 title 한 줄(직업·Lv·죄종·등급)을 툴팁 카드가 대신한다 (2026-08-28) — 영웅 툴팁: 착용 장비 · Alt 로 세부 옵션 (ADR-0171)
        //   `tip: false` 면 안 건다 — 캐릭터 탭은 같은 값이 바로 아래 네 칸에 있고 뜬 카드가 그 칸을 덮는다 (2026-09-15 사용자 지시 · ADR-0116)
        //   유닛 툴팁은 **카드 옆**에 선다 — 관전 카드와 같은 규칙 (2026-09-15 · ADR-0120)
        if (tip) bindTipNode(c, () => heroTipCard(h, combatOf(h), itemOf, it => equippedItemTipCard(h, it)), { anchor: true, holdOnAlt: true });
        // 위칸 오른쪽은 **이름 하나**다 — 카드 오른쪽 끝에 붙는다 [2026-09-21 사용자 지시 · ADR-0197 — 0165 의 이름 뒤 `Lv.n` 을 걷었다].
        //   줄어드는 쪽은 여전히 「하는 일」 하나다
        // 레벨은 초상 **왼쪽 아래** · 리더는 오른쪽 아래 [2026-09-21 사용자 지시 · ADR-0202 — 0199 의 오른쪽 아래를 비교 후 옮겼다].
        //   오른쪽 아래는 해고(캐릭터 탭 띠)와 리더(편성 띠)가 나눠 쓰고, 레벨은 어느 카드에서도 안 가린다
        c.innerHTML = `
            <div class="hs-band">
                <span class="hs-doing ${doing.cls}">${doing.text}</span>
                <b class="hs-name">${L(h.name)}</b>
            </div>
            ${heroFace(h)}
            <span class="hs-lv">${t('ch.lv', { n: h.level })}</span>
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
        // 캐릭터 탭 띠는 끌어서 **다른 카드에 놓으면 두 영웅의 자리를 맞바꾼다** [2026-09-15 사용자 지시 · SCREEN_DESIGN §5 · ADR-0136].
        //   순서는 세이브 값(`G.heroes`)이라 출정 창 띠도 같은 순서로 선다. 동사는 편성 띠와 같게 갈린다 — 클릭은 고르기 · 드래그는 자리
        else if (reorder) bindCardDrag(c, '.hs-card[data-uid]', tgt => swapRoster(h.uid, tgt.dataset.uid));
        c.onclick = () => { if (!formDragEnded) onPick(h); };
        strip.appendChild(c);
    }
    for (let i = G.heroes.length; i < D.balance.roster_cap; i++) strip.appendChild(el('div', 'hs-card empty', '<span>+</span>'));
    p.appendChild(strip);
    return p;
}
const pickHero = h => { state.heroUid = h.uid; render(); };
/** 띠 순서 맞바꾸기 — 캐릭터 탭 띠의 드래그 (ADR-0136). 고른 영웅은 uid 로 들고 있어 자리가 바뀌어도 그대로 따라간다 */
const swapRoster = (a, b) => {
    const r = SYS.game.swapHeroes(G, a, b);
    if (!r.ok) flash(`ch.err.${r.err}`); else save();
    return true;
};

/* ═══════════ 캐릭터 ═══════════
   세로 3단: ① 영웅 띠 ② 같은 폭·높이의 4칸 — 장비 / 기본 옵션(+현재 스킬 카드) / 세부 옵션 1 / 세부 옵션 2 (2026-08-27) ③ 아이템(가로 전폭).
   장착·해제·분해가 여기서 실제로 일어난다. */

/** 페이퍼돌 — 신체 위치대로 착용 위치 8개(부위 7종, 반지 ×2). 착용 칸을 누르면 벗는다.
 *  잠기는 칸은 없다 — 보조 슬롯 폐지(2026-09-01)로 양손 배타가 사라졌다.
 *  빈 칸은 **부위 실루엣**을 배경으로 깔고 이모지를 안 그린다 — 둘을 겹치면 투명 PNG 사이로 비친다.
 *  2026-09-17 로 **부위 7종이 다 찼다** — 빈 칸이 이모지로 떨어지는 일은 이제 없다 (SCREEN_DESIGN §6 · 규칙은 `mock.slotArt` 한 곳) */
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
            // 칸에는 글자가 없다 [2026-09-15 사용자 지시 · ADR-0122] — 부위는 실루엣이, 찬 칸은 그림과 툴팁이 말한다.
            //   부위 이름은 **빈 칸만** `title` 로 든다 — 찬 칸에 달면 아이템 툴팁 위에 브라우저 기본 툴팁이 겹친다
            //   **예외 — 찬 칸은 가방 칸과 같은 모서리 배지 둘**을 든다 [2026-09-18 사용자 지시]: 오른쪽 위 강화 `+n`(ADR-0169 · 0 이면 안 선다) ·
            //   오른쪽 아래 아이템 레벨(ADR-0168). 둘 다 그림도 칸 자리도 대신 말해 주지 못하는 개체값이라, 가방 칸과 견주려면 여기도 들어야 한다
            const us = it ? SYS.game.upgradeState(G, it.uid) : null;
            cell.innerHTML = (art ? `<span class="pd-art"><img src="${art}" alt="" loading="lazy" onerror="this.remove()"></span>`
                : `<div class="pd-icon">${it ? itemImg(it) : def.icon}</div>`)
                + (us && us.up > 0 ? `<span class="pd-up">+${us.up}</span>` : '')
                + (it ? `<span class="pd-lv">${t('ch.itemLv', { n: it.ilvl })}</span>` : '');
            cell.setAttribute('aria-label', L(def));
            if (!it) cell.title = L(def);
            if (it) {
                // 실제로 착용 중이라 담은 스킬 줄도 **h 의 실제 능력치 기준**으로 낸다 (2026-09-11 사용자 지시)
                const cb = combatOf(h);
                const skCtx = { period: cycleOf(h), ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
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

/** ②-2 기본 옵션 — 맨 위 레벨 · 경험치 + 기본 능력치 7 막대 + 그 아래 현재 스킬(액티브 3, 정사각 카드). 옛 핵심 전투치 4 줄은 세부 옵션이 흡수했다 (2026-08-27) */
function attrPanel(h) {
    const p = el('div', 'panel');
    // 제목 오른쪽 끝에 **죄종 칩** [2026-09-18 사용자 지시 · ADR-0166] — 글자 · 테두리가 그 죄종 색(후보 카드 칩과 같은 문법 · ADR-0155).
    //   `.panel > h2` 가 이미 space-between 이라 제목을 span 으로 감싸면 칩이 오른쪽 끝에 선다
    p.appendChild(el('h2', '', `<span>${t('ch.attr.h')}</span><span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>`));
    p.appendChild(xpBlock(h));
    const box = el('div', 'attr-list');
    // 줄 조립은 유닛 툴팁과 같은 함수다 — 두 자리가 따로 짜면 한쪽만 고쳐진다 (tip.js · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0114)
    box.innerHTML = attrRowsHtml(h.stats, tierColor(h));
    p.appendChild(box);
    p.appendChild(skillCards(h));
    return p;
}

/**
 * 레벨 · 경험치 — 기본 옵션 칸 맨 위, 능력치 막대 위 (2026-09-15 · SCREEN_DESIGN §6 · ADR-0129).
 * 막대 폭은 `현재 / 필요` 의 표시 비율이다(능력치 막대와 같은 종류 — 전투 계산이 아니다).
 * **만렙이면 숫자 대신 MAX · 막대는 가득** — 줄을 걷으면 만렙 영웅을 고를 때만 아래 막대 · 스킬이 한 줄 올라가 칸이 흔들린다
 */
function xpBlock(h) {
    const atCap = h.level >= D.balance.hero_level_cap;
    const need = xpNext(h);
    const pct = atCap ? 100 : Math.max(0, Math.min(100, h.xp / need * 100));
    const text = atCap ? t('ch.xp.max') : t('ch.xp', { a: h.xp.toLocaleString(), b: need.toLocaleString() });
    const box = el('div', 'ch-xp');
    box.innerHTML = `<div class="ch-xp-line"><span class="ch-lv">${t('ch.lv', { n: h.level })}</span><span class="ch-xp-n">${text}</span></div>`
        + `<div class="bar xp"><i style="width:${pct}%"></i></div>`;
    return box;
}

/**
 * 현재 스킬 — 액티브 3 을 정사각 카드로. 행동 주기는 소제목 오른쪽. 슬롯 데이터를 읽는 법은 activeSlots 와 같다.
 * **찬 칸은 그림 하나뿐**이다 (2026-09-08 사용자 지시 · SCREEN_DESIGN §6) — 이름 · 초 · 효과 문장은 툴팁이 든다.
 * 출처는 **칸 아래 글자**다 (2026-09-15 사용자 지시 · ADR-0121) — 그래서 이 칸의 툴팁은 출처 칩을 안 단다.
 * 칸 순서는 여전히 ACTIVE_SOURCES 가 정한다(화면이 판정하지 않는다) — 보이지 않을 뿐 자리는 출처가 든 그대로다.
 */
function skillCards(h) {
    const cycle = cycleOf(h);
    const cb = combatOf(h);
    // 설명창의 숫자 자리 재료 — 밑수 셋(공격 · 회복 · 벽)과 **능력치**(스킬 계수 · ADR-0089). 전투가 시전 순간 읽는 것과 같은 `h.stats` 다
    const tipCtx = { period: cycle, ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
    const wrap = el('div', 'sk-cards-wrap');
    // 소제목은 이름뿐이다 (2026-09-08 사용자 지시) — 행동 주기는 **세부 옵션 2 의 제 행**이 든다
    // (`combat_stat.csv:action_period` · sheet_order 20). §4-1 「값은 항상 찍는다」는 그 행이 지킨다
    wrap.appendChild(el('div', 'sub-h', t('ch.skill.h')));
    const grid = el('div', 'sk-cards');
    activeCells(h).forEach((a, i) => {
        const c = el('div', `sk-card${a ? '' : ' vacant'}`);
        // 찬 칸은 **그림 하나** — 이름 · 초 · 효과 문장은 툴팁이 말한다 (화면에 두면 툴팁과 두 번 찍힌다).
        // 빈 칸 안은 **글자를 안 넣는다**: 칸이 아이콘 크기라 `Not advanced` 가 물리적으로 안 들어간다
        // (9px 로 낮추고 여백을 걷어도 잘렸다 — ko 만 통과하는 칸은 통과가 아니다). 사유는 `title` 이 든다.
        // ⚠ 사유를 **찍는** 자리는 스킬 트리 창 목록(activeSlots)이다 — 거기는 가로줄이라 글자 자리가 있다
        c.innerHTML = a ? `<span class="ico">${skillImg(a)}</span>` : '';
        // 출처는 **칸 아래 글자**가 말한다 [2026-09-15 사용자 지시 · ADR-0121] — 그래서 툴팁에 `source` 를 안 넘긴다(출처 칩이 안 선다)
        if (a) bindTipNode(c, () => skillTipCard(a, tipCtx));
        else { c.title = emptySlotText(i); c.setAttribute('aria-label', emptySlotText(i)); }
        const slot = el('div', 'sk-slot');
        slot.append(c, el('span', 'sk-src', sourceName(i)));
        grid.appendChild(slot);
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

/* 세부 옵션의 표기 규칙(감쇠율 · 저항 상한 · 단위 · 대표 3줄)과 줄 조립은 `tip.js` 에 산다 [2026-09-14] — 유닛 툴팁도 같은 행을 그리게 되어
   한 곳으로 모았다 (`sheetStats` · `sheetRowsHtml` · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0114) */

/** 설명창 맥락의 밑수 범위 — 공격력은 무기군이 정한 채널 하나 · 회복 밑수는 마법 공격력 (R90 — 둘 다 `{min, max}` · INTERFACE §2-8) */
const rangeCtx = cb => {
    const atk = cb.atk_physical ?? cb.atk_magic;
    return { atkMin: atk?.min, atkMax: atk?.max, matkMin: cb.atk_magic?.min, matkMax: cb.atk_magic?.max };
};

/** 영웅 툴팁 장비 hover도 캐릭터 탭 페이퍼돌과 같은 「착용 중」 아이템 카드 한 장을 쓴다 (ADR-0182). */
function equippedItemTipCard(h, item) {
    if (!h || !item) return null;
    const cb = combatOf(h);
    const skCtx = { period: cb.action_period, ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
    return tipCard(item, t('tip.equipped'), [], skCtx);
}

/** ②-3·4 세부 옵션 1·2 — 전투 능력치 22(impl=1 · 09-17 타격 회복 추가)를 두 칸에 나눠 스크롤 없이. 물리 방어 행은 감쇠율을 병기한다 */
function detailPanels(h) {
    const c = combatOf(h);
    // 두 쪽으로 끊는 자리(피해 감소 앞) · 행 목록 · 줄 조립은 유닛 툴팁의 두 열과 같은 함수다 (tip.js:sheetPages · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0115)
    return sheetPages().map((rows, pi) => {
        const p = el('div', 'panel');
        p.appendChild(el('h2', '', t('ch.detail.hn', { n: pi + 1 })));
        const list = el('div', 'cs-scroll');
        list.innerHTML = sheetRowsHtml(rows, c);
        p.appendChild(list);
        return p;
    });
}

/* ── 보관 (③ 아이템) ── */

/** 고르는 중 · 잠그는 중을 푼다 [ADR-0184 · ADR-0207] — 탭을 떠날 때와 실행 · 취소 · 완료 뒤에 부른다 */
function clearBagSel() {
    state.bagSelMode = false;
    state.bagLockMode = false;
    state.bagSel.clear();
}

/** 보관 — **왼쪽 창고 / 오른쪽 인벤토리 두 칸** [2026-09-11 사용자 확정 · SCREEN_DESIGN §6 · item_design §1].
 *  **갈래 탭은 없다 — 장비만 든다** [2026-09-21 · ADR-0188]. 재료(가루 · 낙인)는 셸 머리의 자원 줄이 이미 찍고 있어
 *  같은 값을 두 번 보여주던 칸이었다. 드롭이 쌓이는 곳은 인벤토리 하나뿐이고(압력은 그쪽이 든다) 창고는 **유저가 옮긴 것만** 든다 */
function itemsPanel(h, { showTarget = false } = {}) {
    const row = el('div', 'bag-row');
    row.appendChild(storagePanel(h, 'stash', {}));
    row.appendChild(storagePanel(h, 'bag', { showTarget }));
    return row;
}

/**
 * 고르는 중 줄 — **[분해하기] · [취소]** [2026-09-21 · ADR-0184]. [잠그기]는 여기서 빠져 도구 줄의 [잠금]이 됐다 (ADR-0207).
 * 체크가 하나도 없으면 [분해하기]가 꺼진다 — 빈 손으로 누를 수 있는 파괴 버튼을 두지 않는다.
 */
function bagSelectBar() {
    const bar = el('div', 'segmented');
    const picked = [...state.bagSel];

    const go = el('button', 'btn sm primary', t('ch.sel.go'));
    go.disabled = !picked.length;
    go.onclick = () => {
        // 잠긴 것은 `salvage` 가 `locked` 로 거절한다 — 통째로 물리지 않고 **건너뛴 수만 센다** (ADR-0185)
        let n = 0, d = 0, s = 0;
        for (const uid of picked) {
            const r = SYS.game.salvage(G, uid);
            if (r.ok) { n++; d += r.dust; } else if (r.err === 'locked') s++;
        }
        if (n) { flash(s ? 'ch.sel.salvagedSkip' : 'ch.sel.salvaged', { n, d, s }); save(); }
        else if (s) flash('ch.sel.allLocked');
        clearBagSel();
        render();
    };

    const cx = el('button', 'btn sm', t('ch.sel.cancel'));
    cx.onclick = () => { clearBagSel(); render(); };

    for (const b of [go, cx]) bar.appendChild(b);
    return bar;
}

/**
 * 자동 분해 창 [2026-09-21 · SCREEN_DESIGN §6 · ADR-0203 · item_design §6-5] — 선 둘 + [지금 인벤토리에도 적용].
 * 선은 **누르는 즉시 먹는다**(저장 버튼 없음 · 가방의 것은 그대로 · 다음 드롭부터). [지금 적용]만 **두 번 누른다** —
 * 체크 단계가 없어 **걸릴 개수가 유일한 확인**이다(§3). 규칙 문장(「하나라도 걸리면」 · 「새 드롭만」)은 창에 없다 — 도움말(`ch.salvageHint`)이 든다
 */
function autoSalvageBody() {
    const rule = G.autoSalvage ?? { rarity: null, ilvlBelow: 0 };
    const set = patch => { SYS.game.setAutoSalvage(G, patch); state.autoArm = false; save(); render(); };
    const box = el('div', 'auto-box');

    const rRow = el('div', 'auto-row');
    rRow.appendChild(el('span', 'auto-k', t('ch.auto.rarity')));
    rRow.appendChild(segmented(
        [{ id: 'none', label: t('ch.auto.r.none') }, { id: 'normal', label: t('ch.auto.r.normal') }, { id: 'magic', label: t('ch.auto.r.magic') }],
        rule.rarity ?? 'none',
        id => set({ rarity: id === 'none' ? null : id })));
    box.appendChild(rRow);

    // 레벨 선 — 위험도 줄(§4-1)과 같은 버튼 줄. 값은 「Lv.n 미만」, 0 이면 「안 봄」 · 0 에서 내림은 꺼진다
    const lRow = el('div', 'auto-row');
    lRow.appendChild(el('span', 'auto-k', t('ch.auto.ilvl')));
    const n = rule.ilvlBelow;
    const steps = el('div', 'lv-row');
    const step = d => {
        const b = el('button', 'btn sm lv-btn', d > 0 ? `+${d}` : `−${-d}`);
        b.disabled = d < 0 && n <= 0;
        b.onclick = () => set({ ilvlBelow: Math.max(0, n + d) });
        return b;
    };
    steps.appendChild(step(-10));
    steps.appendChild(step(-1));
    steps.appendChild(el('span', `lv-val auto-val${n > 0 ? ' up' : ''}`, n > 0 ? t('ch.auto.ilvlBelow', { n }) : t('ch.auto.ilvlOff')));
    steps.appendChild(step(1));
    steps.appendChild(step(10));
    lRow.appendChild(steps);
    box.appendChild(lRow);

    // [지금 인벤토리에도 적용] — 첫 누름이 그 자리를 확인 줄로 바꾼다. 걸리는 것이 없으면 꺼진다 · 인벤토리만 · 잠근 것 제외
    const pv = SYS.game.autoSalvagePreview(G);
    const act = el('div', 'auto-act');
    if (state.autoArm && pv.n > 0) {
        act.appendChild(el('span', 'auto-confirm', t('ch.auto.confirm', { n: pv.n })));
        const ok = el('button', 'btn sm primary', t('ch.auto.ok'));
        ok.onclick = () => {
            const r = SYS.game.applyAutoSalvage(G);
            if (r.n) { flash('ch.sel.salvaged', { n: r.n, d: r.dust }); save(); }
            state.autoArm = false;
            render();
        };
        const cx = el('button', 'btn sm', t('ch.sel.cancel'));
        cx.onclick = () => { state.autoArm = false; render(); };
        act.appendChild(ok);
        act.appendChild(cx);
    } else {
        const ap = el('button', 'btn sm', t('ch.auto.apply'));
        ap.disabled = pv.n === 0;
        ap.onclick = () => { state.autoArm = true; render(); };
        act.appendChild(ap);
    }
    box.appendChild(act);
    return box;
}

/** 도구 줄 — 이름 + (인벤토리 쪽에만) [잠금] · [분해] · [자동 분해] 또는 그 모드의 줄 + 칸 수. 관전에서는 장착 대상도 (§6 · §4-2) */
function storageTools(h, where, { showTarget = false } = {}) {
    const tools = el('div', 'items-tools');
    tools.appendChild(el('span', 'items-name', t(where === 'stash' ? 'ch.bag.stash' : 'ch.bag.inv')));
    // 버튼은 **한 벌만** 둔다 — 두 칸에 같이 걸리는 축이라 칸마다 두면 어느 쪽 것인지 읽을 수 없다 (ADR-0184)
    if (where === 'bag') {
        if (state.bagSelMode) tools.appendChild(bagSelectBar());
        else if (state.bagLockMode) {
            // 잠그는 중 — 누른 칸이 이미 먹었으므로 나오는 버튼은 [취소]가 아니라 [완료]다 (ADR-0207)
            const done = el('button', 'btn sm primary', t('ch.lock.done'));
            done.onclick = () => { clearBagSel(); render(); };
            tools.appendChild(done);
        } else {
            // [잠금]은 [분해] 왼쪽의 제 버튼 [2026-09-21 사용자 지시 · ADR-0207]
            const lk = el('button', 'btn sm', t('ch.lock.start'));
            lk.onclick = () => { clearBagSel(); state.bagLockMode = true; render(); };
            tools.appendChild(lk);
            const sv = el('button', 'btn sm', t('ch.sel.start'));
            sv.onclick = () => { state.bagSelMode = true; state.bagSel.clear(); render(); };
            tools.appendChild(sv);
            // 자동 분해 — 선이 하나라도 서 있으면 **켜진 모양**이다: 가방이 왜 덜 차는지가 같은 줄에서 읽힌다 (ADR-0203)
            const rule = G.autoSalvage ?? {};
            const au = el('button', `btn sm toggle${rule.rarity || rule.ilvlBelow > 0 ? ' on' : ''}`, t('ch.auto.btn'));
            au.onclick = () => openModal('autoSalvage');
            tools.appendChild(au);
        }
    }
    const n = where === 'stash' ? (G.stash ?? []).length : G.bag.length;
    const cap = where === 'stash' ? D.balance.stash_cap : D.balance.inventory_cap;
    tools.appendChild(el('span', 'items-meta muted',
        `${t('ch.items.sub', { n, cap })}${showTarget ? ` · ${t('bt.items.target', { name: L(h.name) })}` : ''}`));
    return tools;
}

/** 보관 한 칸 — `where` 가 'stash' 면 창고, 'bag' 이면 인벤토리. 칸 수는 그 칸의 상한이 정한다 */
function storagePanel(h, where, { showTarget = false } = {}) {
    const p = el('div', `panel bag ${where === 'stash' ? 'store-stash' : 'store-bag'}`);
    p.appendChild(storageTools(h, where, { showTarget }));
    const uids = where === 'stash' ? (G.stash ?? []) : G.bag;
    const items = uids.map(itemOf).filter(Boolean);
    const cap = where === 'stash' ? D.balance.stash_cap : D.balance.inventory_cap;
    // 고르는 중 · 잠그는 중은 같은 파선 테두리를 쓴다 — 「지금 칸을 누르면 장착이 아니다」가 같은 뜻이다 (ADR-0207)
    const moding = state.bagSelMode || state.bagLockMode;
    const grid = el('div', `inv-cells wide${moding ? ' picking' : ''}`);
    for (let i = 0; i < cap; i++) {
        const it = items[i];
        const picked = it && state.bagSel.has(it.uid);
        const cell = el('div', `inv-cell${it ? ' filled' : ''}${picked ? ' picked' : ''}`);
        if (it) {
            cell.style.borderColor = rarity(it.rarity).color;
            const us = SYS.game.upgradeState(G, it.uid);
            // 모서리 배지 넷 [2026-09-21 · ADR-0168 · ADR-0184 · ADR-0185] — 왼쪽 위 = 체크(고르는 중에만) ·
            //   오른쪽 위 = 유저가 쌓은 강화(0 이면 안 선다) · 왼쪽 아래 = 자물쇠(잠근 것만) · 오른쪽 아래 = 태어날 때 박힌 ilvl(언제나 선다)
            cell.innerHTML = `<span class="inv-icon">${itemImg(it)}</span>`
                + (picked ? '<span class="inv-check">✓</span>' : '')
                + (us && us.up > 0 ? `<span class="inv-up">+${us.up}</span>` : '')
                + (it.locked ? '<span class="inv-lock">🔒</span>' : '')
                + `<span class="inv-lv">${t('ch.itemLv', { n: it.ilvl })}</span>`;
            if (it.rarity === 'unique') cell.classList.add('shine');
            // 비교 상대 = 실제로 교체될 위치의 착용품 (반지는 빈 칸 우선, 없으면 1번 칸)
            const target = SYS.game.equipTarget(h, it);
            const ringHint = it.slot === 'ring' ? t('tip.ringSlot', { n: target === 'ring2' ? 2 : 1 }) : '';
            const cb = combatOf(h);
            const skCtx = { period: cycleOf(h), ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
            // 「이 아이템」 카드의 스킬 숫자는 **h 가 이 아이템으로 바꿔 꼈을 때** 값이다 — 주기 · 피해 범위 · 공격 타입이 그 무기의 것이어야 한다 (ADR-0139).
            //   스킬 칸이 서는 아이템(스킬을 담은 무기)만 계산한다 — 나머지 칸은 맥락을 안 읽는다
            const ifCb = it.skill ? SYS.game.heroCombatIf(G, h, it.uid) : null;
            const ifCtx = ifCb && { period: ifCb.action_period, ...rangeCtx(ifCb), hpMax: ifCb.hp_max, atkType: ifCb.attack_type, stats: h.stats };
            bindTip(cell, it, { compare: itemOf(h.equipped[target]), hints: ringHint, ctx: ifCtx ?? undefined, compareCtx: skCtx });
            // **끌어서 반대편 격자에 놓아도 옮겨진다** [2026-09-21 · ADR-0187] — `Ctrl`+클릭과 **같은 함수**라 거절 코드도 같다.
            //   고르는 중 · 잠그는 중에는 안 건다 — 체크 · 자물쇠를 붙이는 손짓과 끄는 손짓이 같은 칸에서 싸운다 (ADR-0184)
            if (!moding) bindCardDrag(cell, where === 'stash' ? '.store-bag' : '.store-stash', () => {
                const r = where === 'stash' ? SYS.game.moveToBag(G, it.uid) : SYS.game.moveToStash(G, it.uid);
                if (!r.ok) flash(`ch.err.${r.err}`); else save();
                return true;
            });
            cell.onclick = (e) => {
                if (formDragEnded) return;              // 방금 끌어 놓은 손짓의 클릭 한 번은 삼킨다
                if (state.bagLockMode) {
                    // 잠그는 중 — **누른 칸의 자물쇠를 바로 토글**한다. 결과는 왼쪽 아래 배지가 든다 · 플래시 없음 (ADR-0207)
                    if (SYS.game.setItemLock(G, it.uid, !it.locked).ok) save();
                } else if (state.bagSelMode) {
                    // 고르는 중 — **체크를 토글할 뿐** 아무것도 사라지지 않는다 (ADR-0184)
                    if (state.bagSel.has(it.uid)) state.bagSel.delete(it.uid); else state.bagSel.add(it.uid);
                } else if (e.ctrlKey || e.metaKey) {
                    // **Ctrl + 클릭 = 반대편으로** [2026-09-11 사용자 확정] — 창고 ↔ 인벤토리. Mac 은 Cmd 가 같은 자리다
                    const r = where === 'stash' ? SYS.game.moveToBag(G, it.uid) : SYS.game.moveToStash(G, it.uid);
                    if (!r.ok) flash(`ch.err.${r.err}`); else save();
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
    // 툴팁은 안 건다 — 고른 영웅의 값은 바로 아래 네 칸이 든다 (2026-09-15 사용자 지시 · ADR-0116)
    // 끌어서 다른 카드에 놓으면 두 영웅의 자리를 맞바꾼다 (2026-09-15 사용자 지시 · ADR-0136)
    stack.appendChild(heroStrip(pickHero, { dismissable: true, tip: false, reorder: true }));
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
 * 아이템 카드 한 장 — 줄 순서는 **머리글 / 이름 / 소속 / 메인 옵션 / 옵션 / 스킬 / 힌트**
 * (SCREEN_DESIGN §6 · 개정 2026-09-10 [ADR-0081] — 메인 옵션이 커지고 담은 스킬이 카드 바닥으로 내려갔다).
 * @param hints 하단 힌트. 문자열 하나든 배열이든 받는다 — 반지 칸 · 「착용 중 없음」이 함께 설 수 있다
 * @param skCtx 스킬 칸의 계산 맥락(`{period,atkMin,atkMax,matkMin,matkMax,hpMax,atkType,stats}`) — 착용 중 카드 = 그 영웅의 `game.heroCombat` ·
 *   「이 아이템」 카드 = `game.heroCombatIf`(장착 대상 영웅이 그 무기를 낀 것으로 · ADR-0139). 생략하면 식이 접힌 채 나온다.
 */
function tipCard(item, headText, hints = [], skCtx) {
    if (!item) return null;                      // 빈 카드는 안 세운다 (§6 개정 2026-09-08 — 아래 bindTip)
    const c = el('div', 'tip-card');
    // 죄종은 **이름이 든다** — `composeName` 이 「격노와 찬탈의 둔기」로 죄종 단어를 다 싣는다. 이름은 희귀도 한 색이고 죄종 색은 옵션 줄 태그가 든다 (2026-09-08 사용자 지시 · 2026-09-19 ADR-0175).
    // 하단 죄종 칩은 같은 값을 카드 안에서 두 번 찍던 자리라 걷었다 (SCREEN_DESIGN §6). 장비 패널의 죄종 집계는 별개다
    const g = SYS.item.groupOf(item);            // 무기군 — 직업 전속·행동 주기·공격 타입의 출처 (weapon_group.csv)
    // 강화한 아이템은 **먹인 값**을 찍는다 — 툴팁 숫자가 캐릭터 시트와 갈리면 안 된다 (SCREEN_DESIGN §6)
    const eff = SYS.item.effective(item);
    const sub = [`ilvl ${item.ilvl}`];
    if (g) sub.push(L(g));
    // **강화 줄은 없다** (2026-09-08 사용자 지시 · §6) — 단계는 이름 앞의 `+n` 이 이미 들고, 비용·상한은 제련소(§8-2)의 값이다.
    // 그래서 여기서 `game.upgradeState` 를 안 부른다 — 가방 칸의 `+n` 배지와 제련소는 그대로 부른다
    // **스킬 칸** — 무기가 액티브 한 칸을 통째로 정한다 [신설 2026-09-09 · skill_design §12-1 규칙 3].
    //   칸은 스킬 설명창의 **몸통 그대로**다(`tip.js:skillTipSection` — 칩 · 문장 · Alt 각주) [2026-09-15 사용자 지시 · ADR-0139] —
    //   문장만 빌려 쓰던 옛 칸은 설명창이 바뀔 때마다 혼자 뒤처졌다. 머리글 · 라벨 · 따로 찍던 쿨은 없다.
    //   숫자는 **영웅 기준**이다 — 부르는 자리가 `skCtx` 를 싣는다(착용 중 = `game.heroCombat` · 「이 아이템」 = `game.heroCombatIf`).
    //   정의 유무는 `skill.defs` 로 판정한다 — `skillInfo` 는 없는 id 에도 객체를 준다(빈 칸 방지 규칙)
    const hasSkill = !!(g && item.skill && SYS.skill.defs[item.skill]);
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
        // 값은 **피해 범위** `최소~최대` — 강화 배율까지 든 파생값이다(`item.weaponDamage` · R90 · ADR-0108)
        baseRows.push(baseRow(atkStat ? L(atkStat) : t('st.atk'), rangeText(SYS.item.weaponDamage(item)),
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
        ${/* **스킬 칸은 카드 바닥이다** [개정 2026-09-10 사용자 지시 · ADR-0081] — 옛 자리(밑수 바로 아래)에서는
              문장 한 줄이 접사 목록을 아래로 밀어 「이 아이템의 수치」가 카드 중간부터 시작했다. 스킬이 든 칸은 아래에서 노드로 끼운다 */''}
        ${g && !hasSkill ? `<div class="tip-skill empty">${t('tip.noSkill')}</div>` : ''}
        ${hintTags ? `<div class="tip-sins">${hintTags}</div>` : ''}`;
    // 칸은 문자열이 아니라 **노드**다 — Alt 를 누르면 제 인자로 이 칸만 다시 선다(`data-alt` · ADR-0139). 힌트 줄 위에 끼운다
    if (hasSkill) c.insertBefore(skillTipSection({ id: item.skill }, skCtx ?? {}), c.querySelector('.tip-sins'));
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
 * @param opts.ctx        `item` 카드의 스킬 칸 계산 맥락 — 페이퍼돌은 그 영웅의 `heroCombat` · 가방 · 창고는 `heroCombatIf`(그 무기를 낀 것으로 · ADR-0139)
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
    const tipCtx = { period: cycle, ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats };
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
        //   `source` 는 안 넘긴다 — 줄 첫 열이 출처를 글자로 이미 든다(출처 칩이 같은 말을 두 번 한다 · ADR-0121)
        if (a) bindTipNode(row, () => skillTipCard(a, tipCtx));
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
    // 위쪽 탭은 걷었다 [2026-09-21 · ADR-0192 — ADR-0145 의 위쪽 탭을 대체] — 파티 전술은 편성 탭(§15)으로 갔고 연구 탭은 연구 하나다
    const p = el('div', 'panel page');
    researchBody(p);
    main.appendChild(p);
}

/**
 * 연구 — 가지 8 열 · **⚠ 노드는 통째로 목업이다** (SCREEN_DESIGN §13-1 · ADR-0145, 2026-09-15 사용자 지시).
 * 가지 구조만 섰고 노드의 내용 · 비용 · 여는 조건은 기획이 안 정했다 — 값은 `mock.js:RESEARCH` 에서 오고 `SYS.*` 를 하나도 부르지 않는다.
 * **가지 사이에는 선이 없다** — 가지끼리 서로 잠그지 않는다. 선행은 같은 열의 바로 위 노드뿐이고 CSS 이음선(`.rs-node`)이 그것을 보인다.
 * 노드 생김새는 파티 전술 칸과 **같은 것**을 쓴다: 한 탭 안의 두 작업이 다른 카드 문법을 쓰면 같은 화면으로 안 읽힌다.
 * 기획이 확정되면 이 두 함수와 `mock.js:RESEARCH` 를 함께 지우고 상태 함수로 갈아탄다 (DEV_PLAN §4 #27).
 */
function researchBody(p) {
    const R = M.RESEARCH;
    const nodes = R.branches.flatMap(b => b.nodes.map(n => ({ ...n, branch: b })));
    const done = list => list.filter(n => n.state === 'done').length;
    // 이름이 안 정해진 노드는 「가지 이름 + 번호」 자리표시로 선다 — 조립은 템플릿이 한다(어순은 i18n 이 흡수)
    const nameOf = n => n.name ? L(n.name) : t('rs.rs.slot', { b: t(n.branch.key), n: n.n });
    const byId = id => nodes.find(n => n.id === id);

    const layout = state.researchLayout === 'row' ? 'row' : 'col';
    const head = el('div', 'rs-head', `
        <span>${t('rs.rs.progress', { n: done(nodes) })} <span class="muted">/ ${nodes.length}</span></span>
        <span>${t('rs.rs.mat')} <b>${R.material}</b></span>
        <small class="todo-badge">${t('todo.badge')}</small>`);
    // ⚠ 배치 비교 토글 — 세로 · 가로 중 하나로 정하기 전까지만 선다. 정해지면 토글과 버린 배치를 함께 걷는다 (§13-1 · 2026-09-15 사용자 지시)
    const seg = el('div', 'segmented rs-layout');
    for (const [id, key] of [['col', 'rs.rs.layout.col'], ['row', 'rs.rs.layout.row']]) {
        const b = el('button', `btn sm${layout === id ? ' on' : ''}`, t(key));
        b.onclick = () => { state.researchLayout = id; render(); };
        seg.appendChild(b);
    }
    head.appendChild(seg);
    p.appendChild(head);

    const body = el('div', 'box-body');
    body.dataset.keep = `research-${layout}`;
    p.appendChild(body);

    if (layout === 'col') {
        const tree = el('div', 'rs-tree');
        for (const b of R.branches) {
            // 가지 하나가 카드 하나다 — 머리에 건물 그림(⚠ 단색 실루엣 목업) · 이름 · 완료 수, 그 아래 노드 (§13-1 · ADR-0146)
            const col = el('div', 'rs-branch');
            const own = nodes.filter(n => n.branch === b);
            col.appendChild(el('div', 'rs-art', b.art ?? ''));
            col.appendChild(el('div', 'rs-branch-h',
                `<span>${t(b.key)}</span><span class="muted">${done(own)} / ${own.length}</span>`));
            for (const n of own) col.appendChild(researchNode(n, nameOf, byId));
            tree.appendChild(col);
        }
        body.appendChild(tree);
        return;
    }

    // 가로 — 가지 한 줄이 카드 하나 · 노드 칸은 이름 · 상태만 · 나머지는 아래 상세 줄 (§13-1 배치 비교)
    const pick = byId(state.researchPick) ?? nodes.find(n => n.state === 'open') ?? nodes[0];
    const rows = el('div', 'rs-rows');
    for (const b of R.branches) {
        const own = nodes.filter(n => n.branch === b);
        const row = el('div', 'rs-row');
        row.appendChild(el('div', 'rs-row-h', `<div class="rs-art">${b.art ?? ''}</div>
            <div class="rs-row-name"><span>${t(b.key)}</span><span class="muted">${done(own)} / ${own.length}</span></div>`));
        const track = el('div', 'rs-track');
        for (const n of own) {
            const cls = n.state === 'done' ? ' on' : n.state === 'locked' ? ' locked' : '';
            const c = el('div', `rs-cell rs-node rs-mini${cls}${n.id === pick.id ? ' pick' : ''}`);
            // 상태 한 줄 — 잠긴 노드에는 비용을 안 찍는다 (§13-1)
            const s = n.state === 'done' ? `<span class="rs-state">${t('rs.rs.done')}</span>`
                : n.state === 'open' ? t('rs.rs.cost', { m: n.mat, g: n.gold.toLocaleString() })
                : t('rs.rs.locked');
            c.innerHTML = `<div class="rs-no">${nameOf(n)}</div><div class="rs-mini-s">${s}</div>`;
            c.onclick = () => { state.researchPick = n.id; render(); };
            track.appendChild(c);
        }
        row.appendChild(track);
        rows.appendChild(row);
    }
    body.appendChild(rows);
    p.appendChild(researchDetail(pick, nameOf, byId));
}

/** 가로 배치의 상세 줄 — 고른 노드 하나. 세로 배치의 노드 칸이 드는 것을 한 줄로 편다 (§13-1 배치 비교) */
function researchDetail(n, nameOf, byId) {
    const d = el('div', 'rs-detail');
    d.appendChild(el('b', '', nameOf(n)));
    d.appendChild(el('span', 'rs-eff', n.gain ? L(n.gain) : t('rs.rs.tbd')));
    if (n.state === 'done') {
        d.appendChild(el('span', 'rs-state', t('rs.rs.done')));
    } else if (n.state === 'locked') {
        // 잠긴 노드에는 비용 대신 선행 노드를 찍는다 (§13-1)
        d.appendChild(el('span', 'rs-lock', t('rs.rs.need', { name: nameOf(byId(n.need)) })));
    } else {
        d.appendChild(el('span', 'rs-cond', t('rs.rs.cost', { m: n.mat, g: n.gold.toLocaleString() })));
        const go = el('button', 'btn sm', t('rs.rs.go'));
        go.onclick = () => { flash('todo.lead'); render(); };   // 목업이라 안내만 — 문구는 기존 키 재사용
        d.appendChild(go);
    }
    return d;
}

/** 노드 하나 — 파티 전술 칸과 같은 생김새 (§13-1) */
function researchNode(n, nameOf, byId) {
    const c = el('div', `rs-cell rs-node${n.state === 'done' ? ' on' : n.state === 'locked' ? ' locked' : ''}`);
    c.appendChild(el('div', 'rs-top',
        `<span class="rs-no">${nameOf(n)}</span>${n.state === 'done' ? `<span class="rs-state">${t('rs.rs.done')}</span>` : ''}`));
    // 여는 것이 안 정해졌으면 「미정」 — 빈 줄은 「아무것도 안 여는 노드」로 읽힌다 (§4-1)
    c.appendChild(el('div', 'rs-eff', n.gain ? L(n.gain) : t('rs.rs.tbd')));
    // 잠긴 노드에는 비용을 안 찍는다 — 아직 굴려지지 않은 값이라 찍으면 확정으로 읽힌다 (§13-1).
    // 대신 선행 노드를 찍는다: 그게 잠긴 노드가 답해야 할 질문이다
    if (n.state === 'locked') {
        c.appendChild(el('div', 'rs-lock', t('rs.rs.need', { name: nameOf(byId(n.need)) })));
    } else if (n.state === 'open') {
        c.appendChild(el('div', 'rs-cond', `<span>${t('rs.rs.cost', { m: n.mat, g: n.gold.toLocaleString() })}</span>`));
        const go = el('button', 'btn sm rs-roll', t('rs.rs.go'));
        go.onclick = () => { flash('todo.lead'); render(); };   // 목업이라 안내만 — 문구는 기존 키 재사용
        c.appendChild(go);
    }
    return c;
}

/* ═══════════ 선술집 ═══════════ */

/* ═══════════ 자원 — 보내 놓고 기다리는 채취 (SCREEN_DESIGN §8) ═══════════
   2026-09-04 사용자 지시 — 탭 이름이 「마을」(장소) → 「자원」(얻는 것)이 되고 탐험이 자기 탭으로 나갔다(§8-4).
   **같은 날 두 번째 개정 — 가로 칸 목록이 세로 카드 3장(채광 · 채집 · 벌목)이 되고 카드마다 단계 7줄이 선다.**
   문법은 §4-1 원정 탭과 **같다**: 카드를 누르면 그 아래에 속이 열린다. 3열 격자도 새로 만들지 않는다 —
   시작 화면(§3)·선술집 명단(§8-1)이 쓰는 `.ng-row`(같은 무게 3열)를 그대로 쓴다.
   ⚠ **탭 이름만 바뀌고 그 안의 칸은 여전히 「파견처」(활동)다** — 그래서 `dp.*` 키와 `.dp-*` 클래스는 이름을 그대로 둔다.
   오프라인 활동의 이름도 여전히 「파견」이다 */

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
    const p = el('div', 'panel page');
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
    // 완료면 이야기 · 만남은 격자 오른쪽 남는 자리(`side`)로 비킨다 — 결과 영웅이 후보와 같은 윗선에 선다 (ADR-0144)
    const row = el('div', 'tv-row');
    const side = el('div', 'tv-side');
    grid.appendChild(searchCell(side));
    row.appendChild(grid);
    if (side.childElementCount) row.appendChild(side);
    body.appendChild(row);

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
            S.discountPct >= 1 ? t('tv.search.cutAll')             // 할인은 비율 — 1 = 전액 (R111)
                : S.discountPct > 0 ? t('tv.search.cut', { n: M.pctNum(S.discountPct) })
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

function searchCell(side) {
    const B = D.balance;
    const S = SYS.game.searchState(G, now());

    /* 완료 — **버튼이 카드가 된다.** ADR-0011 이 「구현되면 이 자리를 그대로 쓴다」고 비워 둔 자리다 */
    if (S.done && S.result) {
        const last = S.beats[S.beats.length - 1];
        const card = candidateCard(S.result, `
            <button class="btn primary sm b-take"${S.canHire ? '' : ' disabled'}>${S.discountPct >= 1 ? t('tv.search.cutAll') : t('tv.hire', { g: S.cost.toLocaleString() })}</button>
            <button class="btn sm b-drop">${t('tv.search.drop')}</button>`);
        // ⚠ `.tv-search`(flex + gap) 를 붙이면 카드 안쪽 간격이 벌어 같은 행의 후보 카드까지 높이가 밀린다
        card.classList.add('tv-search-res');
        // 이야기 · 만남은 카드가 아니라 **오른쪽 여백**에 선다 (ADR-0144) — 카드 위에 이면 결과 영웅이
        // 후보 카드보다 한참 아래에서 시작해 초상 · 능력치 줄이 옆 카드와 안 맞는다
        side.appendChild(el('div', 'tv-story done',
            `<i>${t('tv.search.done')}</i>${last ? `<span>${L(last.text)}</span>` : ''}`));
        // 아직 답을 안 했으면 결과가 와 있어도 만남은 열려 있다 — 답할 기회를 수령 전까지 남긴다
        if (S.rumor && S.meetOpen) side.appendChild(meetBlock(S));
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
        c.appendChild(el('div', 'tv-search-odds muted', t('tv.search.odds', { r: M.pctNum(S.rarePct), e: M.pctNum(S.echoPct) })));
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
 * 제련소 탭 — 제작 · 강화 · 크래프트 (SCREEN_DESIGN §8-2 · 기획 item_design §7 · base_expedition_design §2-5).
 * 2026-09-03 사용자 지시로 마을의 칸에서 자기 탭이 됐다. **탭 이름이 장소 「제련소」다**(`nav.forge` · ADR-0190) —
 * 탭 이름이 곧 crumb 라 패널에 제목 줄을 두지 않는다. 작업 탭은 **상단바의 탭 세그먼트 자리**에 서고 고른 하나만 편다(ADR-0142).
 * **지금 실제로 도는 것은 제작 · 강화 둘**이다 — 크래프트(R97)는 `game_logic` 에 없어 미착수 안내를 띄운다.
 * 배치 줄은 없다(ADR-0191) — 영웅은 작업할 때 배치되는 쪽으로 간다. 없는 기능에 가짜 수치를 그리지 않는다.
 */
function renderForge(main) {
    const p = el('div', 'panel page');

    /* 작업 탭 — 상단바의 탭 세그먼트 자리 (원정 ADR-0094 · 도감 ADR-0174 와 같은 자리 · ADR-0190).
       세 작업을 한 화면에 나란히 두지 않는다 — 고른 하나가 박스 끝까지 편다 (ADR-0142) */
    const TABS = [['make', 'fg.seg.make'], ['up', 'fg.seg.up'], ['craft', 'fg.seg.craft']];
    const tab = TABS.some(([id]) => id === state.forgeTab) ? state.forgeTab : 'make';
    $('.tab-seg').appendChild(segmented(TABS.map(([id, key]) => ({ id, label: t(key) })), tab,
        id => { state.forgeTab = id; render(); }));

    // 제목 = 고른 작업 이름 — 다른 탭과 같은 패널 제목(`.panel > h2`)이라 서 있고 본문만 스크롤한다
    p.appendChild(el('h2', '', tab === 'craft'
        ? `${t('fg.seg.craft')} <small class="todo-badge">${t('todo.badge')}</small>`
        : t(tab === 'make' ? 'fg.seg.make' : 'fg.seg.up')));

    // 박스 (ADR-0097) — 고른 작업이 박스 끝까지 서며 넘치면 스크롤한다
    const body = el('div', 'fg-split box-body');
    body.dataset.keep = `forge-${tab}`;   // 탭마다 따로 되찾는다 — 강화 목록 스크롤이 제작 탭에 묻어가지 않게

    const box = el('div', 'fg-box');
    if (tab === 'make') {
        // 제작은 두 갈래다 — 왼쪽 장비(부위 · 레벨대 · 재료) · 오른쪽 물약(단계 목록 · R103)
        const two = el('div', 'fg-work');
        forgeMake(two);
        forgePotion(two);
        box.appendChild(two);
    } else if (tab === 'up') forgeUpgrade(box);
    else box.appendChild(el('div', 'note-body muted', t('todo.lead')));   // 크래프트 — 로직이 없다 (R97)
    body.appendChild(box);

    p.appendChild(body);
    main.appendChild(p);
}

/**
 * 제작 칸 — 부위 · 레벨대를 고르고 재료 `보유 / 필요` 를 보고 만든다 (SCREEN_DESIGN §8-2 · 기획 item_design §7-1 · R96).
 * 판정(재료 모자람 · 인벤토리 가득)은 `game.makeState` 가 낸다 — 렌더러는 세지 않는다. 결과는 희귀도 굴림이라 미리보기가 없다
 */
function forgeMake(p) {
    const bands = SYS.game.makeBands();
    const part = D.slots.some(s => s.id === state.makePart) ? state.makePart : D.slots[0]?.id;
    const band = bands.some(b => b.band === state.makeBand) ? state.makeBand : bands[0]?.band;
    const col = el('div', 'fg-col fg-make');

    const parts = el('div', 'segmented');
    for (const s of D.slots) {
        const b = el('button', `btn sm${part === s.id ? ' on' : ''}`, s.icon);
        b.title = L(s);
        b.onclick = () => { state.makePart = s.id; render(); };
        parts.appendChild(b);
    }
    col.appendChild(parts);

    const lv = el('div', 'segmented');
    for (const b of bands) {
        const btn = el('button', `btn sm${band === b.band ? ' on' : ''}`, t('fg.make.band', { lo: b.lo, hi: b.hi }));
        btn.onclick = () => { state.makeBand = b.band; render(); };
        lv.appendChild(btn);
    }
    col.appendChild(lv);

    const ms = SYS.game.makeState(G, part, band);
    if (ms) {
        const blk = el('div', 'fg-block');
        for (const c of ms.cost)
            blk.appendChild(el('div', `fg-mat${c.have < c.need ? ' no' : ''}`,
                `<span>${c.kind === 'dust' ? t('res.dust') : matName(c.kind, c.id)}</span><b>${c.have} / ${c.need}</b>`));
        const act = el('div', 'fg-act');
        const go = el('button', 'btn primary sm', t('fg.make.go'));
        go.disabled = !ms.canMake;
        go.onclick = () => {
            const r = SYS.game.makeItem(G, part, band);
            if (!r.ok) flash(`fg.err.${r.err}`);
            else { flash('fg.made', { name: L(G.items[r.uid].name) }); save(); }
            render();
        };
        act.appendChild(go);
        if (ms.err === 'bagFull') act.appendChild(el('span', 'fg-cost no', t('fg.err.bagFull')));
        blk.appendChild(act);
        col.appendChild(blk);
    }
    p.appendChild(col);
}

/**
 * 물약 — 제작 탭의 오른쪽 갈래 (SCREEN_DESIGN §8-2 · 기획 item_design §7-4 · R103 · 개수 R124).
 * 판정(개수 · 잠김 · 골드 부족)은 `game.potionState` 가 낸다 — 렌더러는 세지 않는다.
 * 머리 줄은 **재고**다 — 가진 물약이 그림 + 개수(0 개는 안 선다 · 하나도 없으면 「없음」). **칸은 여기 없다** — 편성마다라 편성 탭이 든다 (ADR-0195).
 * 그림은 관전 아레나 칸과 같은 그림이고 없으면 병 실루엣이 깔린다 — 규칙은 `battle.js:potionBeltHtml` 과 같다 (2026-09-17)
 */
function forgePotion(p) {
    const ps = SYS.game.potionState(G);
    const col = el('div', 'fg-col fg-potion');
    const stock = ps.list.filter(row => row.have > 0).map(row => {
        const info = potionInfo(row.id);
        const src = M.potionArt(row.id);
        const img = src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">`
            : `<img class="p-bg" src="${M.POTION_SLOT_ART}" alt="" loading="lazy" onerror="this.remove()">`;
        return `<span class="p-stock" title="${t('fg.potion.tip', { name: L(info.name), n: row.heal })}"><span class="p-slot full">${img}</span><b>×${row.have}</b></span>`;
    }).join('');
    col.appendChild(el('div', 'fg-poth', `<span>${t('fg.potion.stock')}</span><span class="p-belt">${stock || `<span class="fg-ptag muted">${t('fg.potion.none')}</span>`}</span>`));
    for (const row of ps.list) {
        const info = potionInfo(row.id);
        const line = el('div', `fg-prow${row.have ? ' has' : ''}${!row.have && !row.craftable ? ' locked' : ''}`,
            `<span class="fg-pn">${L(info.name)}</span><span class="fg-ph">${t('fg.potion.heal', { n: row.heal })}</span>`);
        const act = el('span', 'fg-pact');
        // 가진 것은 개수 · **가진 뒤에도 [만들기]가 선다** — 거듭 만든다 (R124)
        if (row.have) act.appendChild(el('span', 'fg-ptag', `×${row.have}`));
        if (!row.craftable) { if (!row.have) act.appendChild(el('span', 'fg-ptag muted', t('fg.potion.locked'))); }
        else {
            const go = el('button', 'btn primary sm', t('fg.make.go'));
            go.disabled = !row.canMake;
            go.onclick = () => {
                const r = SYS.game.makePotion(G, row.id);
                if (!r.ok) flash(`fg.err.${r.err}`);
                else { flash('fg.made', { name: L(info.name) }); save(); }
                render();
            };
            act.appendChild(go);
            act.appendChild(el('span', `fg-cost${row.err === 'gold' ? ' no' : ''}`, `${row.cost.toLocaleString()} G`));
        }
        line.appendChild(act);
        col.appendChild(line);
    }
    p.appendChild(col);
}

/** 강화 칸 — 목록(착용 + 인벤토리 + 창고) · 작업 패널 (SCREEN_DESIGN §8-2) */
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
        // 목걸이 · 반지는 빼지 않고 「강화 없음」으로 선다 — 상한과 섞지 않고, 판정은 upgradeable 이 낸다 (ADR-0125)
        const row = el('div', `fg-row${state.forgeItem === x.uid ? ' on' : ''}`, `
            <span class="fg-ic">${itemImg(x)}</span>
            <span class="fg-n" style="color:${rarity(x.rarity).color}">${u.up > 0 ? `+${u.up} ` : ''}${L(x.name)}
                <small class="fg-sub">${L(slotDef(x.slot))} · ilvl ${x.ilvl} · ${worn.has(x.uid) ? t('fg.worn') : t('fg.bag')}</small></span>
            <span class="fg-up">${!u.upgradeable ? t('fg.noBase') : u.cost == null ? t('fg.upMax', { up: u.up }) : `+${u.up}`}</span>`);
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

        /* 강화 — 핍이 진행을, 버튼 옆 수치가 다음 비용을 든다. 목걸이 · 반지는 핍 · 값 · 버튼 대신 한 줄이다 (ADR-0125).
           ⚠ 「베이스 능력치 현재 → 다음」은 아직 못 그린다: `upgradeState` 가 다음 값을 안 주고
              렌더러는 공식을 갖지 않는다 (ui 원칙 2). 현재 값만 찍는다 */
        const plus = el('div', 'fg-block');
        if (!us.upgradeable) plus.appendChild(el('div', 'fg-val muted', `<span>${t('fg.noBase')}</span>`));
        else {
            const pips = el('div', 'fg-pips');
            for (let i = 0; i < us.max; i++) pips.appendChild(el('i', `fg-pip${i < us.up ? ' on' : ''}`));
            plus.appendChild(pips);
            plus.appendChild(el('div', 'fg-val', grp
                ? `<span>${t('st.atk')}</span><b>${rangeText(SYS.item.weaponDamage(it))}</b>`
                : `<span>${t('fg.base')}</span><b>${eff.implicit ? affixText(eff.implicit) : '—'}</b>`));
            const act = el('div', 'fg-act');
            const go = el('button', 'btn primary sm', us.cost == null ? t('fg.upMax', { up: us.up }) : t('fg.go'));
            go.disabled = !us.canUpgrade;
            go.onclick = () => {
                const r = SYS.game.upgradeItem(G, it.uid);
                if (!r.ok) flash(`ch.err.${r.err}`);
                else { flash('ch.upgraded', { n: r.up, g: r.cost }); save(); }
                render();
            };
            act.appendChild(go);
            act.appendChild(el('span', `fg-cost${us.cost != null && us.gold < us.cost ? ' no' : ''}`,
                us.cost == null ? '' : `${us.cost.toLocaleString()} G`));
            plus.appendChild(act);
        }
        right.appendChild(plus);
    }
    work.appendChild(right);
    p.appendChild(work);
}

/**
 * 상점 탭 — 상단 · 기본상단 · 특수상단 (SCREEN_DESIGN §8-3 · 기획 base_expedition_design §2-6).
 * 2026-09-03 사용자 지시로 마을의 칸에서 자기 탭이 됐다 — **탭 이름은 「상점」(활동), 패널 머리는
 * 「상단」(장소 — `dp.post.trade`)** 으로 갈린다 — 제련소(§8-2)는 탭 이름도 장소다(ADR-0190).
 * ⚠ **통째로 목업이다** — 방문 주기 · 체류 · 가격 · 재고가 기획에 하나도 없어서(GAME_DESIGN §10)
 * 데이터는 `mock.js:TRADE` 가 들고, 버튼은 누르면 미착수 안내만 낸다. 확정되면 상수와 이 함수를 함께 지운다.
 *
 * **세로 2단인 이유** — 둘은 배타가 아니다(기본상단은 늘 열려 있고 특수상단이 그 위에 얹힌다).
 * 세그먼트로 가르면 상주하는 창구가 클릭 뒤로 숨는다. 제련소(§8-2)가 세그먼트인 것과 갈리는 지점이다.
 */
function renderShop(main) {
    const p = el('div', 'panel page');
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

/* ═══════════ 도감 — 처치 수 모델 (monster_design §8 · 2026-09-21 카드 → 처치 수) ═══════════
   레벨 계산은 SYS.game(codex_level.csv). 여기는 처치 수를 읽어 그리기만 한다 */

const codexLv = kills => SYS.game.codexLevel(kills);
function stageBonus(stage) {
    const total = stage.monsters.reduce((a, m) => a + SYS.game.codexBonusAt(codexLv(m.kills)), 0);
    const complete = stage.monsters.every(m => codexLv(m.kills) === SYS.game.codexMaxLevel());
    return { total, complete };
}

/** 카드 하나 — `grade` 는 초상만 가른다(수치는 몬스터 하나의 집계다 · ADR-0167) */
function monsterCard(m, grade) {
    const cum = D.codexLevels;                 // 레벨별 **누적 처치 문턱** 그대로 (codex_level.csv:kills_total)
    const lv = codexLv(m.kills);
    const maxLv = cum.length;
    const next = SYS.game.codexNext(m.kills);
    const prev = lv > 0 ? cum[lv - 1] : 0;
    const pct = next ? Math.min(100, (m.kills - prev) / (next - prev) * 100) : 100;
    const src = monsterFace(m.id, grade);
    const name = L(monsterName(m.id));
    const c = sinColor(monsterSin(m.id));
    // 초상 밑에 아무것도 깔지 않는다 — 아트가 없으면 빈 원이다 (2026-09-06 사용자 지시 · faceChip 과 같은 규칙).
    // **툴팁은 파일명**이다 (2026-09-08 · §9) — 옛 이미지 도감의 「몬스터 초상」 타일이 들고 있던 한 줄이 여기로 왔다.
    // 같은 그림을 한 탭에서 두 번 그리지 않으면서 「어느 파일이 안 들어왔나」는 남긴다
    const faceHtml = src
        ? `<span class="face${m.boss ? ' boss' : ''}" title="${src.split('/').pop()}"><img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()"></span>`
        : `<span class="face none${m.boss ? ' boss' : ''}" style="background:${c}22;border-color:${c}66" title="${t('face.noArt', { name })}"></span>`;
    const pips = Array.from({ length: maxLv }, (_, i) =>
        `<span class="pip${i < lv ? ' on' : ''}" title="${t('cx.lvTitle', { lv: i + 1 })} · ${t('cx.kills', { n: cum[i].toLocaleString() })}"></span>`).join('');
    // `data-mid` — 그린 뒤 몬스터 툴팁을 거는 손잡이 (`codexMonster` · ADR-0206)
    return `
        <div class="mon-card${m.boss ? ' boss' : ''}${lv === maxLv ? ' maxed' : ''}" data-mid="${m.id}">
            ${faceHtml}
            <div class="mon-body">
                <span class="mon-name">${name}${m.boss ? `<span class="b-tag">${t('kind.boss')}</span>` : ''}</span>
                <div class="mon-mid">
                    <span class="pips">${pips}</span>
                    <span class="mon-next muted">${t('cx.kills', { n: m.kills.toLocaleString() })} · ${next
                        ? `${t('cx.next', { n: next.toLocaleString() })} <span class="up">+${M.pctNum(D.codexBonus[lv] ?? 0)}%</span>`
                        : `<span class="up">${t('cx.max')}</span>`}</span>
                </div>
                <div class="bar"><i style="width:${pct}%"></i></div>
            </div>
        </div>`;
}

/* 세그먼트 넷 — 순서는 SCREEN_DESIGN §9 의 표와 같다. 몬스터만 수집 화면이고 나머지 셋은 자산 훑기다(§9-1) */
const CODEX_SEGS = ['monster', 'character', 'item', 'skill'];
/** 몬스터 카드의 초상 등급 — 라벨은 관전 카드가 쓰는 `kind.*` 를 그대로 부른다 (ADR-0167 · 문구를 새로 안 쓴다) */
const CODEX_GRADES = ['normal', 'elite'];
/** 아이템 안쪽 분류 — 무기와 비무기 장비(방어구 · 장신구)를 가른다 (ADR-0179) */
const CODEX_ITEM_SEGS = ['weapon', 'armor'];

/**
 * 도감 (SCREEN_DESIGN §9 · 개정 2026-09-08 사용자 지시 — 「이미지 도감」 탭 흡수).
 * 세그먼트는 원정과 같은 **상단바**의 crumb 오른쪽에 선다(ADR-0174). 패널 안에는 중복 제목 줄이 없고,
 * 몬스터의 챕터 세그먼트부터 각 화면의 도구 줄이 시작한다.
 */
function renderCodex(main) {
    $('.tab-seg').appendChild(segmented(CODEX_SEGS.map(id => ({ id, label: t(`cx.seg.${id}`) })), state.codexSeg,
        id => { state.codexSeg = id; render(); }));
    const p = el('div', 'panel page');     // 박스 (ADR-0097) — 도구 줄은 서 있고 목록 · 묶음이 본문으로 스크롤한다
    ({ monster: codexMonster, character: codexCharacter, item: codexItem, skill: codexSkill })[state.codexSeg](p);
    main.appendChild(p);
}

/** 얼굴 스타일 고르개 — 몬스터 · 캐릭터 세그먼트가 같이 쓴다. 전환은 **전역**이다(`?face=` · localStorage 와 같은 자리 — §9-1).
 *  **스타일이 하나면 안 선다** [2026-09-17] — `pixel16` 폴더가 사라져 목록이 `cartoon` 하나가 됐고,
 *  고를 것이 없는 세그먼트는 누를 수 없는 버튼 하나로 남는다. 폴더를 더하면 저절로 다시 선다 */
function faceStylePicker(box) {
    if (M.FACE_STYLES.length < 2) return box;
    box.appendChild(el('span', 'muted', t('ix.style')));
    box.appendChild(segmented(M.FACE_STYLES.map(f => ({ id: f, label: f })), M.faceStyle(),
        id => { M.setFaceStyle(id); render(); }));
    return box;
}

/** 몬스터 세그먼트 — 처치 도감 (§9). 레벨의 출처는 처치 수 실집계(G.codexKills · 2026-09-21 카드 → 처치 수) */
function codexMonster(p) {
    const ch = chapterOf(state.codexChapter) ?? D.chapterList[0];
    // **해금은 안 본다** — 전 챕터·전 몬스터를 그대로 그린다 (SCREEN_DESIGN §9, 2026-09-06)
    const stages = codexStages().filter(st => st.chapter === ch.id).map(st => ({
        ...st, stat: M.CX_STAT[st.num], completion: M.CX_DONE[st.num],
        monsters: st.monsters.map(m => ({ ...m, kills: G.codexKills[m.id] ?? 0 })),
    }));

    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(D.chapterList.map(c => ({ id: c.id, label: `Ch${c.id} ${L(c.name)}`, color: sinColor(c.sin) })), ch.id,
        id => { state.codexChapter = id; render(); }));
    // 오른쪽에 죄종 + 얼굴 스타일 — 여기가 몬스터 초상을 가장 크게 그리는 화면이라 스타일 고르개가 같이 선다 (§9)
    const right = el('div', 'ix-style');
    right.appendChild(el('span', 'muted', `${t('cx.sinLabel')} <b style="color:${sinColor(ch.sin)}">${sinName(ch.sin)}</b>`));
    // 일반 / 정예 — **전 카드가 한 번에** 갈리고, 바뀌는 것은 초상뿐이다 (ADR-0167).
    //   전용 초상이 없는 몬스터 · 보스는 두 쪽이 같은 얼굴이다(`monsterFace` 가 기본으로 떨어뜨린다)
    right.appendChild(segmented(CODEX_GRADES.map(id => ({ id, label: t(`kind.${id}`) })), state.codexGrade,
        id => { state.codexGrade = id; render(); }));
    faceStylePicker(right);
    bar.appendChild(right);
    p.appendChild(bar);
    // 스테이지 행이 박스 높이를 똑같이 나눠 갖고 **맨 아래까지** 선다 — 늘어난 세로는 초상이 먹는다 (§9)
    const body = el('div', 'box-body cx-mon');
    body.dataset.keep = 'codex:monster';
    p.appendChild(body);

    for (const stage of stages) {
        const { total, complete } = stageBonus(stage);
        const row = el('div', 'codex-stage');
        // 계열이 없는 스테이지(챕터보스 단독 5스테이지)는 보정 칸이 **빈 칸**이다 — 계열 배정이 기획 미정이라(GAME_DESIGN §10)
        //   라벨을 지어내지 않는다. 합산도 안 되므로(`codexBonus` 가 그 스테이지 번호를 건너뛴다) 숫자도 안 찍는다 (2026-09-11)
        const gain = stage.stat
            ? `<span class="up">${L(stage.stat)} +${(total * 100).toFixed(1)}%</span>
                    <span class="muted"> · ${t('cx.completion')} ${complete ? `<span class="up">${L(stage.completion)}</span>` : L(stage.completion)}</span>`
            : '<span class="muted">—</span>';
        row.innerHTML = `
            <div class="cs-head">
                <div class="cs-title"><span class="muted">${stage.num}</span> ${L(stage.name)}</div>
                <div class="cs-gain">${gain}</div>
            </div>
            <div class="mon-strip">${stage.monsters.map(m => monsterCard(m, state.codexGrade)).join('')}</div>`;
        // 몬스터 툴팁 — 초상 옆 이야기 · 아래 처치 단계 · **카드 옆에 붙는다**(읽는 카드라 커서를 따라가면 흔들린다 · ADR-0206 · ADR-0120).
        //   초상 · 핍의 작은 툴팁(파일명 · 문턱)은 그대로 둔다 — 사용자 지시 「나중에 수정」
        for (const node of row.querySelectorAll('.mon-card[data-mid]')) {
            const m = stage.monsters.find(x => String(x.id) === node.dataset.mid);
            if (m) bindTipNode(node, () => codexMonsterTipCard(m, state.codexGrade, stage.stat), { anchor: true });
        }
        body.appendChild(row);
    }
}

/* ═══════════ 도감의 자산 세그먼트 — 캐릭터 · 아이템 · 스킬 (SCREEN_DESIGN §9-1) ═══════════
   신설 2026-09-06 「이미지 도감」 탭 · 도감으로 흡수 2026-09-08 (둘 다 사용자 지시).
   게임이 부르는 그림을 묶음별로 전부 펼친다. 아트를 넣고 확인하려면 그 그림이 나오는 화면까지 가야 하기 때문이다 —
   영웅 초상은 제 직업 풀이 뽑혀야 하고, 아이템은 그 부위가 드롭돼야 보고, 스킬 아이콘은 그 스킬을 배워야 뜬다.

   ⚠ **폴더를 읽는 화면이 아니다.** 목록의 SSOT 는 `mock.js` 의 경로 조립 상수(HERO_FACES ·
   WEAPON_BASE_STEMS · ITEM_BASE_ART_IDS · SKILL_ICON_FILES)와 `skill.csv` 다 — 렌더는 동기라
   파일 유무를 물을 수 없다(`skillIcon` 주석과 같은 이유). 코드가 안 부르는 파일(`faces/source/` · `icons/items/source/` · `icons/skills/source/` 원본 시트 ·
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
    // 고르개가 비면 줄을 아예 안 세운다 [2026-09-17] — `.sub-bar` 는 비어 있어도 `margin-bottom` 을 먹는다
    const styleBox = faceStylePicker(el('div', 'ix-style'));
    if (styleBox.childNodes.length) {
        const bar = el('div', 'sub-bar');
        bar.appendChild(styleBox);
        p.appendChild(bar);
    }
    const dir = M.faceDir();
    // 영웅 초상은 **직업 풀**이다 (2026-09-07) — 목록의 SSOT 는 `mock.js:HERO_FACES`.
    // **직업 하나가 묶음 하나**다 (ADR-0066) — 순서는 `class.csv` 행 순이고 **빈 묶음은 안 그린다**.
    //   스킬 세그먼트(`codexSkill`)와 **같은 문법**이다: 한 화면에서 두 세그먼트가 다르게 묶이지 않는다.
    //   타일 이름은 **초상 이름**(`mock.js:HERO_FACE_NAMES`)이고, 이름이 안 붙은 초상만 **풀 번호**로 남는다
    //   (ADR-0081). 직업은 어느 쪽이든 안 적는다 — 그룹 머리가 이미 말한다(스킬 타일이 출처 칩을 뗀 것과 같은 이유).
    //   ⚠ 번호가 사라지는 것이 아니다 — 셋째 열의 파일명(`warrior_1.png`)이 그 번호를 계속 든다
    const box = el('div', 'ix-body box-body');
    box.dataset.keep = 'codex:character';
    box.innerHTML = (D.classes ?? []).map(c => {
        const n = M.HERO_FACES[c.id] ?? 0;
        const tiles = Array.from({ length: n }, (_, i) =>
            artTile(`${dir}hero/${c.id}_${i + 1}.png`, L(M.HERO_FACE_NAMES[`${c.id}_${i + 1}`]) || `${i + 1}`, 'box'));
        return tiles.length ? artGroup(t('ix.g.heroCls', { cls: className(c.id) }), `${dir}hero/`, tiles) : '';
    }).join('');
    p.appendChild(box);
}

/** 베이스 id → 이름 — `item_base.csv` 행에서 찾는다 (도감 방어구 묶음 · 2026-09-17) */
const itemBaseName = id => {
    for (const rows of Object.values(D.itemBases ?? {})) {
        const row = rows.find(b => b.id === id);
        if (row) return L(row);
    }
    return id;
};

/** 아이템 세그먼트 — 무기/방어구를 한 번 더 가르고, 방어구는 장비 부위별로 묶는다 (§9-1 · ADR-0179) */
function codexItem(p) {
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(CODEX_ITEM_SEGS.map(id => ({ id, label: t(`ix.seg.${id}`) })), state.codexItemSeg,
        id => { state.codexItemSeg = id; render(); }));
    p.appendChild(bar);

    const box = el('div', 'ix-body box-body');
    box.dataset.keep = `codex:item:${state.codexItemSeg}`;
    if (state.codexItemSeg === 'weapon') {
        // ~~무기군 그림 묶음~~ 은 2026-09-17 삭제 — 무기군 그림 8장이 사라졌다(베이스 그림이 그 자리를 든다)
        // 무기 베이스 — **여기는 재고를 보는 자리**라 무기군마다 전부 편다(uid 가 없으니 `weaponBaseArt` 를 직접 부른다).
        // 실제 드롭은 개체마다 이 중 하나를 든다 (mock.js:itemArt · uid 해시 · §9-1). 무기군 하나 = 묶음 하나(ADR-0066 문법과 동일)
        box.innerHTML = Object.keys(M.WEAPON_BASE_STEMS).map(g =>
            artGroup(t('ix.g.weaponBase', { group: L(D.weaponGroups?.[g] ?? g) }), `${M.WEAPON_BASE_DIR}${g}/`,
                //    확장자를 뗀다 — 베이스 이름이 길어 `.png` 가 붙으면 칸에서 두 줄이 된다 (스킬 세그먼트와 같은 처방 · ADR-0075)
                M.WEAPON_BASE_STEMS[g].map(s => artTile(M.weaponBaseArt(g, s), t(`ix.b.${s}`), 'box', '', true)))
        ).join('');
    } else {
        // 비무기 베이스 — `equip_slot.csv` 의 부위 순서를 따르고, 각 부위가 소유한 `item_base.csv` id 로 그림 목록을 나눈다.
        // `ITEM_BASE_ART_IDS` 에 실제로 등록된 그림만 편다는 기존 규칙은 그대로다.
        box.innerHTML = D.slots.filter(slot => slot.id !== 'weapon').map(slot => {
            const baseIds = new Set((D.itemBases?.[slot.id] ?? []).map(base => base.id));
            const artIds = M.ITEM_BASE_ART_IDS.filter(id => baseIds.has(id));
            return artIds.length ? artGroup(L(slot), M.ITEM_BASE_ART_DIR,
                artIds.map(id => artTile(`${M.ITEM_BASE_ART_DIR}${id}.png`, itemBaseName(id), 'box', '', true))) : '';
        }).join('');
    }
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
                { h: t('exp.level.h'), body: [t('exp.level.tip')] },   // 위험도 — 인게임 툴팁 키 재사용 (§12 · ADR-0104)
                { h: t('exp.repeat'), body: [t('exp.repeat.sub')] },
                { h: t('exp.seg.battle'), body: [t('bt.note')] },
                { h: t('exp.seg.report'), sub: t('rep.log.sub', rounds), body: [t('rep.contract'), t('rep.injuryNote')] },
            ],
        },
        {
            // 편성 — 파티 전술 묶음이 연구 섹션에서 이사 왔다(칸을 굴리는 자리가 편성 탭이다 · §12 · §15 · 2026-09-21)
            title: t('nav.party'),
            groups: [
                { h: t('rs.h'), sub: t('rs.open'), body: [t('rs.note'), t('rs.note.cond')] },
            ],
        },
        {
            title: t('nav.character'),
            groups: [
                { h: t('ch.gear.h'), body: [t('eq.slots')] },
                { h: t('eq.sins.h'), body: [t('eq.sins.note')] },
                { h: t('ch.attr.h'), sub: t('ch.attr.sub'), body: [t('ch.attr.note')] },
                { h: t('ch.detail.h'), body: [t('ch.detail.note')] },
                { h: t('ch.items.h'), body: [t('ch.equip.hint'), t('ch.salvageHint'), t('ch.upgradeHint'), t('eq.inv.note')] },
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
                { h: t('rs.research.h'), body: [t('rs.research.note')] },
            ],
        },
        {
            title: t('nav.codex'),
            groups: [
                { h: t('cx.h'), sub: t('cx.sub', { list: D.codexLevels.map(n => n.toLocaleString()).join(' · ') }), body: [t('cx.note')] },
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
    // panel — 다른 탭과 같은 바탕. 전역 거점 아트(#stage::before)가 글자 뒤로 비치면 본문을 읽을 수 없다
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
 *  한 장의 크기는 CSS(`#stage`)가 든다 — 여기는 읽기만 한다.
 *  **터치 기기에서 창이 세로로 길면 시계 방향 90° 눕힌다** (ADR-0109) — 폰을 가로로 돌려 본다. PC 는 창을 세로로 좁혀도 안 눕는다.
 *  **창은 보이는 만큼이다** (ADR-0153) — 모바일 브라우저 바가 덮은 자리를 뺀 `visualViewport` 로 잰다. 배율도 눕힘 판정도 그 값 하나다.
 *  좌표를 되돌리는 쪽(`tip.js:stagePoint`)은 여기서 건 행렬을 그대로 뒤집는다 — 공식을 두 벌 두지 않는다 */
function fitStage() {
    const st = document.getElementById('stage');
    if (!st) return;
    // 창은 **보이는 만큼**이다 (ADR-0153) — `innerWidth/Height` 는 모바일 브라우저 바가 덮어도 안 줄고 창 resize 도 안 온다
    const vv = window.visualViewport;
    const w = st.offsetWidth, h = st.offsetHeight;
    const W = vv ? vv.width : window.innerWidth, H = vv ? vv.height : window.innerHeight;
    if (H > W && matchMedia('(pointer: coarse)').matches) {
        const s = Math.min(W / h, H / w);
        // rotate(90deg) 는 한 장을 원점 왼쪽으로 넘긴다 — 눕힌 폭(h × s)만큼 오른쪽으로 되민다
        const x = Math.round((W - h * s) / 2 + h * s), y = Math.round((H - w * s) / 2);
        st.style.transform = `translate(${x}px, ${y}px) rotate(90deg) scale(${s})`;
        return;
    }
    const s = Math.min(W / w, H / h);
    const x = Math.round((W - w * s) / 2), y = Math.round((H - h * s) / 2);
    st.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}

/* ═══════════ 부팅 ═══════════ */

async function boot() {
    // 한 장을 창에 맞춘다 — **G 가 없어도** 먼저(시작 화면도 한 장이다) · 창 크기가 바뀔 때마다 다시 (ADR-0087)
    fitStage();
    window.addEventListener('resize', fitStage);
    // 브라우저 바가 오르내리면 보이는 창만 바뀌고 창 resize 는 안 온다 (ADR-0153)
    window.visualViewport?.addEventListener('resize', fitStage);
    await loadData();
    state.candidates = rollCandidates();
    // 전에 로그인해 둔 브라우저면 클라우드와 먼저 맞춘다 — 받은 사본이 있으면 그것을 연다 (SCREEN_DESIGN §2-1 · ADR-0112)
    await cloudResume();
    if (!authenticated) await new Promise(resolve => { unlockBoot = resolve; });
    unlockBoot = null;
    const sessionUid = cloud.user.uid;
    await CLOUD.watchUser(user => {
        if (user?.uid !== sessionUid) leaveSession();
    });
    if (!authenticated) return;
    if (loadSave()) continueGame();
    // 같은 브라우저의 다른 탭이 세이브를 쓰면 이 탭은 멈춘다 (§2-1)
    onSaveWrittenElsewhere(freeze);
    // 창을 닫는 셋째 길 — 닫기 버튼 · 판 바깥 클릭 · 여기 (SCREEN_DESIGN §2 창 레이어). 한 번만 건다 · 닫는 길이 없는 창(`lock`)은 뺀다
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.modal && !MODALS[state.modal]?.lock) closeModal(); });
    // 브라우저 메뉴를 안 띄운다 — 우클릭 · 길게 누르기 둘 다 (style.css 게임 화면 기본기 ⑤ · SCREEN_DESIGN §2). 우클릭을 쓰는 칸(스킬 창)은 제 핸들러가 먼저 돈다
    document.addEventListener('contextmenu', e => e.preventDefault());

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
    // 초상 등급도 고르개(클릭)로만 바뀐다 — 같은 이유로 길을 낸다 (ADR-0167)
    const cxg = new URLSearchParams(location.search).get('cxg');
    if (CODEX_GRADES.includes(cxg)) state.codexGrade = cxg;
    // 아이템 안쪽 분류도 클릭으로만 바뀌므로 점검용 진입로를 둔다 (SCREEN_DESIGN §9-1 · ADR-0179)
    const cxi = new URLSearchParams(location.search).get('cxi');
    if (CODEX_ITEM_SEGS.includes(cxi)) state.codexItemSeg = cxi;
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
    // `&ps=n` 을 먼저 고른다 — 채우는 것은 **고른 편성**이다(`toggleParty` · R122) · `?dev=form&party=full&ps=2` 가 편성 2 를 채운다
    const wantPs = Number(new URLSearchParams(location.search).get('ps'));
    const pickPs = () => { if (G && wantPs) SYS.game.selectPreset(G, wantPs); };
    const devParty = () => { pickPs(); if (G && SYS.game.partyOf(G).length === 0) for (const h of G.heroes) SYS.game.toggleParty(G, h.uid, now()); };
    // `&runs=n` 이면 **연달아 n번** 정산한다 [2026-09-09] — 리포트의 런 목록(§4-3)은 줄이 하나면 고르는 결정이 없다.
    //   반복 원정이 만드는 상태(줄이 여럿 쌓인 목록)에 클릭 없이 닿는 유일한 길이다. 상한은 balance:report_keep
    if (dev === 'battle') {
        devParty();
        const runs = Math.min(Math.max(1, Number(new URLSearchParams(location.search).get('runs')) || 1), D.balance.report_keep);
        for (let i = 0; i < runs; i++) runBattle(D.stageOrder[0], { instant: true });
        // `&live=1` — 끝난 런 위에 **원정을 하나 더 띄운 채** 리포트에 선다 [2026-09-15 · ADR-0123]. 도는 원정의 줄이
        //   목록에 안 서는지는 이 상태로만 본다(클릭으로는 출발 → 세그먼트 이동). 아레나는 걷고 런은 앱 시계가 민다 (ADR-0074)
        if (new URLSearchParams(location.search).get('live') === '1') {
            runBattle(D.stageOrder[0]);
            if (stopBattle) { stopBattle(); stopBattle = null; }
            state.exp = 'report';
        }
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
        // `&stage=<id>` — **그 스테이지의 관전** [2026-09-15 · §10] — 오오라를 든 기사 몬스터는 2장부터라(ADR-0127) 첫 스테이지로는 못 본다.
        //   후반 스테이지는 해금 전이라 출발이 거절되므로 앞 스테이지를 순서대로 클리어 처리하고 보낸다(`?dev=form&lvl` 과 같은 장치)
        const wantPlay = Number(new URLSearchParams(location.search).get('stage'));
        const playId = D.stages[wantPlay] ? wantPlay : D.stageOrder[0];
        for (const id of D.stageOrder) { if (id === playId) break; if (!G.progress.cleared.includes(id)) G.progress.cleared.push(id); }
        // 고른 지역을 그 스테이지로 채운다 — `runBattle` 은 고른 지역으로 나갈 때만 반복 의사(`&rep=1`)를 런에 옮긴다.
        //   안 채우면 반복이 늘 꺼진 채 나갔다(DEV_PLAN §4 #49 · 유저 흐름은 행 클릭이 채운다)
        state.expStage = playId;
        runBattle(playId, { tab: new URLSearchParams(location.search).get('bt'), logf: new URLSearchParams(location.search).get('logf') });
        // `&tip=e|p` — **첫 적 카드 / 첫 영웅 카드의 툴팁**이 뜬 관전 [2026-09-14 · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · §10]. 툴팁은 hover 로만 뜨고,
        //   적 카드는 `round` 이벤트가 재생기에 들어간 뒤에 서므로 여기서는 아직 없다 — 설 때까지 기다렸다 한 번 올린다.
        //   `&alt=1` 이면 올린 뒤 **Alt 를 누른 채**로 둔다 — 세부 옵션 열도 누르는 동안만 서서 헤드리스가 못 닿는다(tip.js 의 keydown 을 그대로 탄다)
        const tipSide = { e: 'enemy', p: 'party' }[new URLSearchParams(location.search).get('tip')];
        if (tipSide) {
            const wait = setInterval(() => {
                const node = document.querySelector(`.unit.${tipSide}[data-tip]`);
                if (!node) return;
                clearInterval(wait);
                node.onmouseenter(new MouseEvent('mouseenter', { clientX: 40, clientY: 40 }));
                if (new URLSearchParams(location.search).get('alt') === '1') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
            }, 100);
        }
        // 꼬리를 건너뛰되 **시계는 건다** [2026-09-21 · 부채 #51] — 여기서 그냥 나가면 `expTick` 이 안 돌아
        //   멈춤 문턱(ADR-0102)을 재는 자리가 사라진다. `?dev=` 가 일반 주소와 다르게 굴면 QA 가 못 믿는다
        if (!TABS.includes(tab)) { startClocks(); return; }
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
        /* `&lvl=n` — **위험도를 n 으로 올린 창** (2026-09-14 · ADR-0104 · §10). 조절은 클리어 기록이 있어야 살아나므로
           새 게임에서는 버튼이 전부 흐리다 — 상한이 n 에 닿을 때까지 앞 스테이지를 순서대로 클리어 처리하고 올린다 */
        const wantLvl = Number(new URLSearchParams(location.search).get('lvl'));
        if (wantLvl) {
            for (const id of D.stageOrder) {
                if (SYS.game.stageLevelState(G, state.expStage).max >= wantLvl) break;
                if (!G.progress.cleared.includes(id)) G.progress.cleared.push(id);
            }
            SYS.game.setStageLevel(G, state.expStage, wantLvl);
        }
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
        state.tab = 'party';             // 전술 칸은 편성 탭에 선다 (§15 · ADR-0194)
    }
    if (dev === 'mats') {   // 제작 재료를 쥔 제련소 — 광석 · 목재는 파견이 채우는데 파견이 아직 없어 [만들기]가 늘 잠긴다 (SCREEN_DESIGN §8-2 · §10 · R96)
        if (!G) startGame();
        // 양은 레시피 표가 정한다 — 부위 전부를 레벨대마다 한 번씩 만들 만큼. 화면이 수량을 지어내지 않는다
        const rs = Object.values(D.makeRecipes), sum = k => rs.reduce((a, r) => a + r[k], 0), bands = SYS.game.makeBands();
        for (const b of bands) { G.materials[b.ore] = sum('ore'); G.materials[b.timber] = sum('timber'); }
        G.resources.dust = sum('dust') * bands.length;
        state.tab = 'forge';
    }
    // `&fg=` — 제련소의 작업 탭을 고른 채 연다 (§10 · ADR-0142). 탭은 클릭으로만 바뀌어 헤드리스가 못 닿는다
    const fg = new URLSearchParams(location.search).get('fg');
    if (['make', 'up', 'craft'].includes(fg)) state.forgeTab = fg;
    // `&ps=n` — 편성 n 을 고른 채 연다 (§10 · §15). 고르개는 클릭으로만 바뀌어 헤드리스가 못 닿는다 — 편성 탭 · 출정 창이 같은 값을 든다
    pickPs();
    // `&rsl=` — ⚠ 연구 배치 비교(세로 · 가로)를 고른 채 연다 (§13-1). 토글은 클릭으로만 바뀌어 헤드리스가 못 닿는다
    const rsLayout = new URLSearchParams(location.search).get('rsl');
    if (['col', 'row'].includes(rsLayout)) state.researchLayout = rsLayout;
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
    // 계정 · 선택 · 멈춤 창 — 로그인 · 다른 기기 · 다른 탭으로만 닿는 화면이라 길을 따로 낸다 (SCREEN_DESIGN §2-1 · §10).
    //   가짜 계정이고 연결 기록을 안 쓰므로 `cloudPush` 가 네트워크를 안 탄다
    if (dev === 'cloud') {
        if (!G) startGame();
        const c = new URLSearchParams(location.search).get('c');
        if (c === 'frozen') { frozen = true; state.modal = 'frozen'; }
        else if (c === 'pick') {
            const s = JSON.parse(JSON.stringify(SYS.game.serialize(G, now())));
            s.savedAt = now() - 60 * 60000;
            s.resources.gold += 1234;
            cloud.remote = { rev: 3, savedAt: s.savedAt, save: s };
            cloud.status = 'conflict';
            state.modal = 'cloudPick';
        } else { cloud.status = 'on'; state.modal = 'cloud'; }
    }
    // ?tab= 은 dev 분기 **뒤에** 건다 — startGame() 이 탭을 원정으로 되돌리므로 앞에 두면 먹히지 않는다
    if (TABS.includes(tab)) state.tab = tab;
    render();
    /* 플래시 — 클릭으로만 뜨고 제 시간에 사라져 헤드리스가 못 닿는다 (SCREEN_DESIGN §2 · §10 · ADR-0113).
       `?flash=<i18n 키>` 는 `?dev=` · `?tab=` 에 겹쳐 쓴다 — 창 위에 서는지는 `?dev=tree&flash=sk.err.points`. `{name}` 에는 로스터 첫 영웅.
       기본은 **내려온 자리에 멈춰 선다**(수명 타이머와 움직임을 걷는다 — 스크린샷용) · `&hold=0` 이면 제 시간에 사라진다(덤프로 사라짐 확인) */
    const flashKey = new URLSearchParams(location.search).get('flash');
    if (flashKey) {
        flash(flashKey, { name: G?.heroes[0] ? L(G.heroes[0].name) : '' });
        if (new URLSearchParams(location.search).get('hold') !== '0') {
            clearTimeout(toastTimer);
            $('#toast .toast').style.animation = 'none';
        }
    }
    /* 툴팁은 **hover 로만** 뜬다 — 헤드리스가 못 닿는 상태라 길을 따로 낸다 (SCREEN_DESIGN §10 · §6 툴팁 규격).
       `render()` **뒤에** 걸린다: 카드는 `bindTipNode` 가 붙인 `mouseenter` 가 만들고, 그 핸들러는 render 마다 새로 붙는다.
       기본은 **가방 첫 칸**(비교 두 장 — 이 툴팁의 가장 넓은 모양) · `&t=doll` 이면 페이퍼돌 무기 칸(한 장) ·
       `&t=skill` 이면 **액티브 카드의 스킬 설명창**(출처 · 태그 · 능력치 칩 — ADR-0118) */
    if (dev === 'tip') {
        const q = new URLSearchParams(location.search);
        // `&i=n` — n번째 찬 칸(1부터). 가방에 무엇이 떨어질지는 시드가 정하므로 **무기 칸을 골라 잡는 유일한 길**이다
        const cell = { doll: '.pd-cell.filled', skill: '.sk-card' }[q.get('t')] ?? '.inv-cell.filled';
        const list = document.querySelectorAll(`${cell}[data-tip]`);
        const node = list[Math.max(1, Number(q.get('i')) || 1) - 1];
        // 커서 자리는 왼쪽 위 — 카드 두 장(최대 640px)이 접힘 보정 없이 그대로 펴진다
        node?.onmouseenter?.(new MouseEvent('mouseenter', { clientX: 40, clientY: 40 }));
    }
    startClocks();
}

/**
 * 부팅의 마지막 — **화면과 무관하게 도는 것들**. `boot()` 의 어느 출구로 나가든 반드시 걸려야 한다 [2026-09-21 · 부채 #51].
 * 특히 **앱 시계가 멈춤 문턱을 재는 유일한 자리다**(`expTick` → `closeFrozenRun` · ADR-0102) — 재생기는 문턱을 넘은 공백을
 *   **밀지 않을 뿐** 런을 끊지 않는다(끊는 판단은 앱 시계 한 곳). 그래서 이것을 건너뛴 경로에서는 절전에서 깨어난 원정이
 *   판정도 알림도 없이 그 자리에서 이어졌다 — `?dev=play` 가 꼬리 앞에서 `return` 하고 있었다
 */
function startClocks() {
    if (clocksOn) return;
    clocksOn = true;
    // 원정 시계 — 화면과 무관하게 앱이 든다 (ADR-0074). render() 가 걷는 것들과 달리 **끄지 않는다**
    setInterval(expTick, EXP_TICK_MS);
    // 브라우저 탭을 숨기고 돌아올 때 — 숨긴 탭의 시계는 앱 시계 하나다 (ADR-0102)
    document.addEventListener('visibilitychange', onVisibility);
    // 클라우드 — 모아서 올린다 · 끊겼으면 다시 붙는다 · 닫힐 때 한 번 더 (SCREEN_DESIGN §2-1 · ADR-0112)
    setInterval(cloudTick, CLOUD_PUSH_MS);
    window.addEventListener('pagehide', () => cloudPush());
    cloudPush();
}

boot().catch(e => {
    console.error(e);
    $('.main').innerHTML = `<div class="panel"><div class="down">${String(e)}</div></div>`;
});
