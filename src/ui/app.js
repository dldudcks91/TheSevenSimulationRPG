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
 *   머리 4줄(물리 · 마법 데미지 · 행동 주기 · 최대 HP)이 대표값이고, 칸은 「방어 무시」 앞에서 갈린다(2026-09-22 · ADR-0294).
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
 * 2026-10-16 — **플레이 기록** (SCREEN_DESIGN §2-1 · ADR-0633) — Google 로그인을 걷었다. 로컬 저장(save)은 그대로 · 다른 탭이 쓰면 멈춤 창(freeze).
 *   배포 주소에서만 익명 계정으로 진행 요약 + 세이브 사본을 모아서 한 방향으로 올린다(trackPush) — 받는 길은 없다.
 *   Firebase 는 cloud.js 만 만진다. 개발용 경로 ?dev=frozen (멈춤 창)
 *
 * 개발용 URL: ?dev=prologue (프롤로그 첫 씬) / ?dev=newgame (현재 후보로 즉시 시작) / ?dev=battle (첫 스테이지 1회 즉시 정산 → 리포트 · &runs=n 이면 n번 연달아 = 런 목록이 쌓인 상태 · &live=1 이면 그 위에 원정을 하나 더 띄운 채) / ?dev=play (첫 스테이지 관전 재생 · &bt=log|dmg 면 그 판을 고른 채(보이는 것은 나눔 배치뿐) · &lay=split 이면 옛 나눔 배치 · &rep=1 이면 반복 원정을 켠 채 · &logf=party|enemy 면 로그를 그 주체로 거른 채 · &dmgf=taken 이면 누적 판을 받은 피해로 고른 채) / ?tab=character 등 (탭 바로 열기) / ?dev=offline (반복 켠 채 껐다 켠 상황 — 런 마무리 배너) / ?dev=form (출정 창이 열린 상태 · &open=0 이면 창을 닫은 목록) / ?dev=tactics (연구 탭 — 전술 칸이 전부 열린 상태) / ?dev=mats (제작 재료를 쥔 대장간)
 */

import * as M from './mock.js';
import { createNotifications } from './notifications.js';
import { createTutorial } from './tutorial.js';
import { MG_SCENES, MG_SPRITES } from './minigame_art.js';
import { t, L, has, isLock, lang, setLang, applyDocumentLang } from './i18n.js';
import { mountBattle, unitPreview, shrineChip, LOG_STYLES, logStyle, setLogStyle, gravePlaque, graveLeftText, paceOf, arenaBgImage } from './battle.js';
import { paceAt, paceStep } from './pace.js';   // 원정 박자 — 관전 재생기와 같은 걸음으로 안 보는 부대 · 숨긴 탭을 민다(세움 포함 · ADR-0654)
import { bindTipNode, helpMark, headingHelp, hideTip, isTouchInput, isAltHeld, isShiftHeld, heroTipCard, skillTipCard, skillLineHtml, stagePoint, stageRect, rangeText, attrRowsHtml, sheetRowsHtml, sheetDeltaRows, bindStatTips, sheetPages, codexMonsterTipCard, codexSkillTipCard, monsterSkillIcons, potionTipCard } from './tip.js';
import { D, SYS, loadData, monsterName, monsterFace, monsterSin, stageName, placeName, placeKey, placeCells, stageStory, fillStory, stageBgOf, chapterOf, codexStages, codexSlotMonsters, skillInfo, potionInfo } from './data.js';
import { loadSave, writeSave, clearSave, loadTrack, writeTrack, onSaveWrittenElsewhere, loadNotificationDismissed, writeNotificationDismissed, loadTutorialSeen, writeTutorialSeen } from './storage.js';
import * as CLOUD from './cloud.js';
import { makeRng } from '../game_logic/rng.js';
// 개발용 색 피커 — 게임 기능이 아니다 (SCREEN_DESIGN §10). 걷어내려면 이 줄과 devpalette.js 를 지운다
import { mountDevPalette } from './devpalette.js';
import { mountFocusCompare, mountSkinCompare } from './devcompare.js';   // 임시 — 공격자 포커스 · 겉모양 비교 버튼(⚙ 설정 탭 마지막 두 줄). 걷어내려면 이 줄 · settingsBody 의 호출 · devcompare.js
import { skillFxOn, basicFxOn, hitFxOn, lungeFxOn, setFxOn, SHAKE_LEVELS, shakeLevel, setShakeLevel, previewOf, fxPreview, fxPreload, fxArtStyle, setFxArtStyle, FX_ALPHA_STEPS, fxTransparency, setFxTransparency } from './fx.js';   // ⚙ 설정 · 도감 이펙트 세그먼트 (SCREEN_DESIGN §2-2 · §9-1 · ADR-0513 · ADR-0515 · ADR-0561 · ADR-0562)
import { SKILL_ART, ART_STYLES } from './skill_art.js';   // Aura art preview in the codex (ADR-0520) · 이펙트 그림체 — 도감 탭 · 설정 줄 (ADR-0559 · ADR-0561)
import { mountAdmin } from './devadmin.js';   // 개발 장치 — 관리자 모드(고르는 판 · Unlock = 건물로 막힌 것이 열린 척 · SCREEN_DESIGN §10-3). 걷어내려면 이 줄 · 아래 호출 · devadmin.js · data.js 주입
import { saveSlotsTab } from './devsave.js';   // 개발 장치 — ⚙ 판 Save 탭 · 세이브 슬롯 셋(SCREEN_DESIGN §10-4 · ADR-0738). 걷어내려면 이 줄 · mountDevPalette 의 셋째 인자 · devsave.js · storage.js 슬롯 함수
import { DEV_HOST } from './env.js';   // 개발 환경인가 — 아니면(배포판) 개발 장치 · 개발용 URL 이 안 선다 (SCREEN_DESIGN §10 머리 · ADR-0751)

import { createRaidSession, mountRaid } from './raid.js';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
};
// 제목과 보조 정보의 배치는 그대로 두고 제목 글씨 바로 뒤에 공통 도움말을 단다.
const helpHeading = (tag, cls, html, topic, params = {}) => headingHelp(el(tag, cls, html), () => t(`hint.${topic}`, params));
// 문자열 템플릿으로 조립하는 반복 구역 제목도 같은 도움말을 쓴다.
function bindSectionHelp(root) {
    for (const [selector, topic] of [['.sk-title', 'skill_tree'], ['.ix-title', 'codex'], ['.dp-side-n', 'resource']])
        root.querySelectorAll(selector).forEach(title => headingHelp(title, () => t(`hint.${topic}`)));
}

/* ═══════════ 게임 상태 · 저장 ═══════════ */

let G = null;                          // 세이브의 실체. null 이면 시작 화면
const now = () => Date.now();          // 시계는 UI 층에서만 읽는다
// 다른 탭이 세이브를 썼다 — 이 탭은 저장 · 원정 시계 · 기록 올리기를 멈춘다(멈춤 창 · SCREEN_DESIGN §2-1)
let frozen = false;
function save() { if (G && !frozen) writeSave(SYS.game.serialize(G, now())); }

const heroById = uid => G?.heroes.find(h => h.uid === uid);
/* 레벨업 반짝임 [2026-09-29 · SCREEN_DESIGN §4-2 · ADR-0440 · ADR-0463] — 본 레벨(`state.lvSeen`)보다 지금 레벨이 높은가 · 그 영웅 카드를 누르면 지금 레벨을 본 것으로 친다.
   관전을 안 보는 동안(다른 탭 · 숨긴 탭) 오른 레벨도 돌아와 카드가 서면 반짝인다 — 재생기가 아니라 영웅 레벨을 대조하기 때문이다 */
const lvUnseen = h => h.level > (state.lvSeen[h.uid] ?? h.level);
const lvSee = uid => { const h = heroById(uid); if (h) state.lvSeen[uid] = h.level; };
/* 매력 — **수색이 미는 유일한 능력치**다 (base_expedition_design §2-4). 약어는 `hero_attribute.csv` 가 든다 */
const CHA = 'cha';
const chaAbbr = () => D.heroAttributes.find(a => a.id === CHA)?.abbr ?? CHA;
const itemOf = uid => (uid ? G.items[uid] : null) ?? null;
/** 재료 한 행 — 사다리(`game.materialLadder` — 하급 = 연구소 재료 표 · 위 단계 = 합성 표)가 이름 · 줄(`post`) · 단계(`tier`)를 든다 (2026-10-25 · R356 · 2026-10-27 · R359) */
const labMat = id => SYS.game.materialLadder().find(x => x.id === id) ?? null;
/** 재료의 단계 숫자 — 칸 왼쪽 위 로마 숫자(최하급 `I` → 최상급 `V` · 최하급도 단다 · 사다리 밖 재화(골드 등)는 없다 · ADR-0983) */
const TIER_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const matTier = id => { const t = labMat(id)?.tier; return t ? `<span class="mat-tier">${TIER_NUMERALS[t - 1] ?? t}</span>` : ''; };
/** 제작 재료 이름 — 재료 표가 든다. id 는 `game.makeState` 의 cost 가 준다 (SCREEN_DESIGN §8-2) */
const matName = (kind, id) => { const m = labMat(id); return m ? L({ ko: m.ko, en: m.en }) : id; };
const wornItems = h => SYS.game.heroItems(G, h);
// 전투 밖의 시트 · 스킬 · 장비 비교는 영웅의 영구 능력치만. 관전은 원정/결투의 전투 능력치를 따로 넘긴다.
const combatOf = h => SYS.game.heroCombat(G, h, []);
const combatWith = (h, item) => SYS.game.heroCombatWith(G, h, item, []);
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
const ACTIVE_SOURCES = ['innate', 'book', 'advance'];
/* 그 영웅의 액티브 — 배정은 game_logic(skill.activesFor), 표시(아이콘·설명)는 skillInfo 가 붙인다.
   배정은 인스턴스 `{id, source}` 라 **출처를 화면이 다시 알아내지 않는다** — 「고유」 표시는 source 가 답이다.
   **칸은 출처 자리다** — 책을 안 배운 영웅은 「책」 칸이 비고, 전직 전이면 「전직」 칸이 빈다.
   둘째 칸은 **책으로 배운 스킬**이다(`hero.bookSkill` · 2026-09-29 R179 · ADR-0420 — ~~무기가 담은 스킬~~) */
const activeCells = h => {
    // 낀 장비의 특정 스킬 +n 까지 더한 레벨 — 전투와 같은 숫자다(§2 · ADR-0535 · 2026-10-08)
    const plus = h && G ? SYS.item.skillPlusOf(SYS.game.heroItems(G, h)) : {};
    const list = (h ? SYS.skill.activesFor(h, { skillPlus: plus }) : [])
        // 스킬 레벨 [2026-10-06 · R216 · ADR-0529] — `up`(쌓은 단계)을 실어 설명창 · 줄이 레벨을 얹은 정의를 읽게 하고(`tip.js:defOf`) · `lv` 가 그림 오른쪽 아래 `Lv.n` 이다(`skLvTag` · ADR-0576 · ADR-0701)
        .map(a => ({ ...skillInfo(a.id), source: a.source, up: a.up ?? 0, lv: 1 + (a.up ?? 0) }));
    return ACTIVE_SOURCES.map(src => list.find(a => a.source === src) ?? null);
};
/* 스킬 그림 오른쪽 아래의 `Lv.n` — `lv` 를 든 스킬 칸에 선다: 영웅(`activeCells` · `arenaUnit`) · 출정 창 적 구성(바탕 레벨 · `foeSeat`)
   [2026-10-21 사용자 지시 · §2 「스킬 그림」 · ADR-0701 · ADR-0705 — ADR-0576 의 글 그대로 · Lv.1 도 찍는다]. 그림 칸이 `position: relative` 여야 한다 */
const skLvTag = s => (Number.isFinite(s?.lv) ? `<span class="sk-lv">${t('sk.lvTag', { n: s.lv })}</span>` : '');
/* 빈 칸의 사유 — 왜 비었는지가 칸 안에서 답해져야 한다 (「빈 칸」만 찍으면 고장으로 읽힌다).
   둘째 칸(책)은 **막힘이 사유다** — 도서관 전 · 레벨 미달 · 그 밖은 「안 배움」 (`game.bookState` 가 판정한다 · ADR-0420) */
const emptySlotText = (i, h = null, html = false) => {
    if (i !== 1) return t(['sk.emptySlot', 'sk.emptyBook', 'sk.emptyAdvance'][i] ?? 'sk.emptySlot');
    const bs = h && G ? SYS.game.bookState(G, h.uid) : null;
    const err = bs?.hero?.err;
    // 막힘은 잠김 한 줄 — 「도서관 건설」 · 「Lv.10 달성」 · `html` 이면 앞에 자물쇠(`title` 은 글만) (§13-1 · ADR-0699)
    const why = err === 'unbuilt' ? needText('skillbook') : err === 'level' ? t('bk.err.level', { n: bs.need.need }) : null;
    return why === null ? t('sk.emptyBook') : html ? lockLine(why) : why;
};
/* 빈 칸이 **잠겼나** [2026-09-29 사용자 지시 · ADR-0425] — 책 칸 = 영웅 레벨이 배울 문턱 전(`bookState.need` · 관리자 모드도 같다) ·
   전직 칸 = 전직 전(비어 있으면 곧 전직 전이다 — 전직 스킬을 안 고른 전직 영웅도 비지만 그건 잠김이 아니다: `h.advance`) */
const slotLocked = (i, h) => {
    if (!h || !G) return false;
    if (ACTIVE_SOURCES[i] === 'book') { const n = SYS.game.bookState(G, h.uid).need; return n.have < n.need; }
    if (ACTIVE_SOURCES[i] === 'advance') return !h.advance;
    return false;
};
/* 잠긴 칸이 열리는 레벨 — 책 = `skillbook_learn_level` · 전직 = `advance_unlock_level` (툴팁 한 줄 · ADR-0427) */
const slotLockLevel = i => (ACTIVE_SOURCES[i] === 'book' ? D.balance.skillbook_learn_level : D.balance.advance_unlock_level);
/* 칸 이름 = 출처 이름. 「고유」는 이미 쓰던 키를 그대로 재사용한다 */
const sourceName = i => t(i === 0 ? 'sk.innate' : `sk.src.${ACTIVE_SOURCES[i]}`);

const sinColor = id => M.SINS[id]?.color ?? 'var(--text-muted)';
const sinName = id => L(M.SINS[id]) || id;
/** 옵션 줄의 출처 태그 (SCREEN_DESIGN §6 · ADR-0100) — `fixed` · 죄종 id(그 죄종 색) · 그 밖은 랜덤(출처 없는 옛 접사 포함) */
const srcTag = src => src === 'fixed' ? `<i class="tip-src">${t('tip.src.fixed')}</i>`
    : M.SINS[src] ? `<i class="tip-src sin" style="color:${sinColor(src)}">${sinName(src)}</i>`
        : `<i class="tip-src">${t('tip.src.random')}</i>`;
/** 「(미적용)」 표지 — 전투가 아직 안 읽는 옵션 줄 끝 (SCREEN_DESIGN §6 · ADR-0213) */
const inertTag = () => ` <i class="tip-inert">${t('tip.inert')}</i>`;
/** Shift 범위 — 옵션 줄 끝의 `(최소~최대)` (SCREEN_DESIGN §6 · ADR-0617). 값은 `item.optionRange` 가 낸다 · 행을 못 찾는 줄(옛 옵션)은 빈 문자열 */
const rangeTag = (item, i) => {
    const r = SYS.item.optionRange(item, i);
    return r ? ` <i class="tip-range">${t('tip.range', { r: M.rangeValue(item.affixes[i].stat, r.min, r.max) })}</i>` : '';
};
/** 범위를 다는 줄이 하나라도 있나 — 각주 「Shift 범위」 · 카드의 `data-shift` 를 이것이 정한다 */
const hasRanges = item => (item?.affixes ?? []).some((_, i) => SYS.item.optionRange(item, i));
/** 장비 발동 스킬의 실제 레벨 — 특정 스킬 +n 보너스와 별개다. 옛 접사의 레벨 누락은 Lv.1로 읽는다. */
const procSkillName = (id, level) => {
    const def = id ? SYS.skill.defs[id] : null;
    return def ? t('tip.proc.skill', { lv: SYS.item.procSkillLevel(level), skill: L(def.name) }) : '—';
};
/**
 * 목걸이 발동 스킬 줄 — `[베이스]` + 발동 조건 문장 + 「(미적용)」 (§6 · ADR-0213 · item_design §1 「목걸이 베이스 옵션」).
 * `item.proc` 이 없으면(목걸이가 아니다) 빈 문자열. 스킬이 없으면(`null` — 후보 풀이 빈 데이터) 「—」 로 찍는다
 */
const procLine = item => {
    const p = item?.proc;
    if (!p) return '';
    const skill = procSkillName(p.skill, p.skillLv);
    const text = p.trigger === 'interval'
        ? t('tip.proc.interval', { sec: SYS.skill.procIntervalSec(p.skill, p.v) ?? '—', skill })
        : t(`tip.proc.${p.trigger}`, { p: M.pctText(p.v), skill });
    return `<li>${srcTag('fixed')}${text}${inertTag()}</li>`;
};
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
/** 원정 플레이 시간 `H:MM:SS` — 시는 24를 넘어도 일로 안 접는다 (SCREEN_DESIGN §2 · ADR-0356 · ADR-0514) */
function fmtExpTime(ms) {
    const s = Math.floor(Math.max(0, ms ?? 0) / 1000);
    const pad = n => String(n).padStart(2, '0');
    return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
/* 직업 7종 — id 로 참조, 표시는 L() (hero_design §2). 무기군 목록은 weapon_group.csv(D.weaponGroupList)에서 파생 */
const classDef = id => D.classes.find(c => c.id === id);
const className = id => L(classDef(id)) || id;
const classColor = id => classDef(id)?.color ?? null;
/** 직업 칩 — 후보 카드 칩 줄의 셋째(죄종 오른쪽) · 그 직업 색 (SCREEN_DESIGN §3 · ADR-0724) */
const clsChip = id => `<span class="cls-chip"${classColor(id) ? ` style="color:${classColor(id)}"` : ''}>${className(id)}</span>`;
const classWeapons =id => D.weaponGroupList.filter(g => g.classes.includes(id)).map(g => L(g)).join(' / ');
const slotDef = id => D.slots.find(s => s.id === id);                                   // 부위
const posDef = pos => slotDef(D.equipSlots.find(s => s.id === pos)?.part);             // 착용 위치 → 부위 정의
/** 옵션 한 줄 — **발동 옵션**(`AFFIX_LABELS[..].proc` · 2026-10-05 R206)은 목걸이 발동 줄과 같은 문장(`tip.proc.<조건>` · 확률 + 스킬 이름)이다.
 *  이름은 부위가 바꿀 수 있다 — 무기 칸의 데미지 % 는 「무기 데미지」(`M.itemAffixText` · ADR-0628 · 2026-10-15)
 *  `level` = 카드가 가리키는 유닛의 레벨 — 레벨당 옵션은 그 레벨의 합계가 앞에 선다 「데미지 +40% (레벨당 데미지 +1%)」(`hero.levelScaled` · §6 · ADR-0954) */
const affixText = (a, slot, level = null) => {
    if (a.stat === 'skill_tag') {
        const tag = D.skillTagRows.find(r => r.tag_id === a.tag);
        return t(`tip.ring.${a.effect}`, { tag: tag ? L({ ko: tag.name_kr, en: tag.name_en }) : a.tag, p: M.pctText(a.v) });
    }
    const lab = M.statLabel(a.stat);
    const def = a.skill ? SYS.skill.defs[a.skill] : null;
    // 특정 스킬 +n — 「파이어볼 +1」 (§6 · ADR-0535 · 2026-10-08)
    if (lab.skill) return t('tip.skillPlus', { skill: def ? L(def.name) : '—', v: a.v });
    // 합계의 이름은 부위가 안 바꾼다 — 레벨당 데미지는 데미지 % 괄호에 든다(무기 데미지가 아니다)
    const sum = SYS.hero.levelScaled(a.stat, a.v, level);
    if (sum) return t('tip.perLevel', { total: L(M.affixText(sum.stat, sum.v)), per: L(M.itemAffixText(slot, a.stat, a.v)) });
    if (!lab.proc) return L(M.itemAffixText(slot, a.stat, a.v));
    return t(`tip.proc.${lab.proc}`, { p: M.pctText(a.v), skill: procSkillName(a.skill, a.skillLv) });
};

/* 스테이지 표시 — 수치도 이름도 D.stages(stage.csv) · 조립은 data.js:stageName */
const stageTitle = row => `${L(chapterOf(row.chapter)?.name)} — ${L(stageName(row))}`;
/** 두 칸이 **같은 장소**인가 — 장소 = (chapter, stage_num) · 반복 스위치는 장소에 딸린다 (2026-09-29 · SCREEN_DESIGN §4-1 · ADR-0432 · PLAN_stage_segments D8) */
const samePlace = (a, b) => !!D.stages[a] && !!D.stages[b] && placeKey(D.stages[a]) === placeKey(D.stages[b]);
/** 장소 줄의 몬스터 이름 — 일반 풀(`battle.stagePool` — 칸 셋이 같다) 순서 + 그 장소에 보스 라운드가 있으면 **보스 이름을 끝에**(색은 안 바꾼다).
 *  챕터보스 장소는 풀이 비어 보스 하나고, 이름 앞에 죄종이 붙는다(「분노의 사탄」 · `exp.sinBoss`) (SCREEN_DESIGN §4-1 · ADR-0649 — ~~레벨 · 예상 소요 · 원소~~) */
function placeFoes(place) {
    const head = place.cells[0];
    const names = SYS.battle.stagePool(head).map(id => L(monsterName(id)));
    if (place.cells.some(z => SYS.battle.stageRounds(z).some(r => r.round_type === 'boss'))) {
        const id = head.boss_monster_idx, name = L(monsterName(id));
        names.push(head.boss_grade === 'chapter_boss' ? t('exp.sinBoss', { sin: sinName(monsterSin(id)), name }) : name);
    }
    return names.join(' · ');
}
/** 장소 줄 잔글씨 맨 앞의 레벨 — **숫자 하나** = 칸 I 의 **고른 단의** 몬스터 레벨(`stageLv` · `Lv23`) (SCREEN_DESIGN §4-1 · ADR-0711 — ~~칸 셋의 범위 `Lv1~3`~~(ADR-0710) ·
 *  1장은 칸마다 레벨이 오르고 2~5장은 칸 셋이 같아 두 모양이 섞였다). 칸 I = 처음 들어가는 레벨 · 칸마다의 레벨은 출정 창 머리(`departHead`) */
const placeLvText = place => t('exp.placeLv', { lv: stageLv(place.cells[0]) });

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
 * 이름은 **초상 위 띠**가 든다 [2026-10-09 사용자 지시 · §4-1 · ADR-0568 — ~~칸에는 글씨가 없다~~(2026-09-10 · ADR-0078)] —
 *   편성 초상의 위칸과 같은 조각(`.hs-band` · 이름은 오른쪽)이고 칸 폭에서 말줄임된다. 전체 이름은 `title` 이 계속 든다.
 */
const foeCell = (id, extraCls = '') => {
    const src = monsterFace(id);
    const name = L(monsterName(id));
    const c = sinColor(monsterSin(id));
    return `<span class="foe-cell ${extraCls}" title="${src ? name : t('face.noArt', { name })}"
        ${src ? '' : `style="background:${c}22"`}
        ><span class="hs-band"><b class="hs-name">${name}</b></span>${src ? `<img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()">` : ''}</span>`;
};
/** 죽어 있는 챕터보스의 적 칸 — `foeCell` 과 같은 정사각 · 이름 띠이고 초상 자리만 **무덤 명패**다 (§4-1 · §4-2 「무덤 명패」 · ADR-0590) */
const foeGraveCell = (id, extraCls, until) => {
    const name = L(monsterName(id));
    return `<span class="foe-cell grave ${extraCls}"><span class="hs-band"><b class="hs-name">${name}</b></span>${gravePlaque(name, until, now())}</span>`;
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
// 탭 둘이 도감 하나가 되고 그 안에서 세그먼트로 갈린다 — 현재 몬스터 · 캐릭터 · 아이템 · 스킬 · 마스터리 다섯이다.
// 그 앞은 탭 11(09-06 이미지 도감 신설) · 탭 10 — 마을이 자원·탐험으로 갈렸다 (§1 개정 2026-09-04). 순서는 그 지도와 같다:
// 원정 → 캐릭터 → 강화가 코어 루프의 **한 동작**이라 앞에 붙어 서고(줍고 → 배분하고 → 올린다 — GAME_DESIGN §3),
// 보충(선술집 · 상점)이 그 뒤, 맡기고 나가는 둘(자원 · 탐험)이 그 뒤, 그 산출을 먹는 연구가 이어지고, 참조 둘(도감 · 도움말)이 끝이다.
// 09-03 순서에서 실제로 움직인 것은 **캐릭터 하나(6번 → 2번)** 다 — 나머지는 상대 순서가 유지된 채 마을 자리에 자원·탐험이 들어갔다.
// 탭 이름은 활동(강화 · 상점)이고 패널 머리는 장소(대장간 · 상단 — `dp.post.*`)로 남는다 (§8-2 · §8-3).
// 의뢰 탭은 폐지 — 게시판은 선술집 탭 안이다(§8-1). 스킬은 캐릭터 안의 **창**(§7).
// 참조는 다시 둘이다 — 도감과 이미지 도감이 둘 다 「결정을 안 받는 조회 화면」이라 탭을 나눌 갈림이 아니었다 (§9).
// `?tab=` 이 죽은 이름(`town` · `commission` · `skill` · `base` · `imagedex`)을 받으면 조용히 무시된다(아래 TABS.includes) — 탭으로는 도달할 자리가 없기 때문
// **편성**이 원정 바로 뒤에 선다 [2026-09-21 사용자 지시 · SCREEN_DESIGN §15 · ADR-0192] — 탭 10 → 11.
//   전투 준비(파티 · 진형 · 물약 칸 · 파티 전술)가 여기 하나로 모인다 — 출정 창은 만들어 둔 편성을 고르기만 한다(ADR-0193)
// **건설**(옛 연구)이 캐릭터 바로 뒤로 왔다 [2026-09-21 사용자 지시 · SCREEN_DESIGN §13 · ADR-0253] — 위 「산출을 먹는 연구가 이어진다」는 이로써 버려졌다.
//   바뀐 것은 화면 이름과 자리뿐이다 — id `research`(`?tab=research`) · `nav.research` · `rs.*` 키 · `mock.js:RESEARCH` 는 옛 이름 그대로
// **훈련장**이 선다 [2026-09-22 사용자 지시 · SCREEN_DESIGN §16 · ADR-0297] — 탭 11 → 12
// 건설 뒤는 **선술집 · 상점 · 대장간 · 훈련장** 순이다 [2026-09-24 사용자 지시 · ADR-0348] — 건설 부지도 이 순서를 따라간다(`renderResearch`)
// **도서관**가 훈련장 바로 뒤에 선다 [2026-09-29 사용자 지시 · SCREEN_DESIGN §17 · ADR-0422] — 탭 12 → 13. 둘 다 영웅을 키우는 자리다
// **훈련장 탭을 걷는다** [2026-10-09 사용자 지시 「훈련장 없애고 전직 -> 서고」 · ADR-0567] — 탭 14 → 13 · 전직 패널은 도서관 탭 오른쪽으로 갔다
// **결투장**은 도감 바로 앞에 선다 [2026-10-02 사용자 지시] — 처음엔 원정 바로 뒤였다
// 탭은 **묶음**으로 선다 [2026-10-09 사용자 지시 · SCREEN_DESIGN §1 · ADR-0554] — 묶음 머리(`nav.grp.*`)가 순서를 끊어 읽게 할 뿐이다.
//   순서의 SSOT 는 이 표 하나 — `TABS` 는 펴낸 것이라 부지 순서 · crumb · `?tab=` 은 그대로 돈다. 탭이 새로 서면 묶음도 같이 정한다
// **실험실**이 기타 묶음 끝에 선다 [2026-10-10 사용자 지시 · SCREEN_DESIGN §18 · ADR-0580] — 탭 13 → 14 · 개발 장치(건물 없음 · 늘 열림) · 화면 코드는 2026-10-12 에 섰다
// 묶음 넷 → **셋** [2026-10-18 사용자 지시 · ADR-0660] — 탐험은 원정 바로 아래 · 자원은 마을 맨 아래 · 파견 묶음은 걷혔다(부지 순서도 따라간다)
// **콜로세움**이 결투장 바로 앞에 선다 [2026-10-18 사용자 지시 · SCREEN_DESIGN §1 · ADR-0670] — 탭 14 → 15 · 옛 결투장의 오프라인 갈래가 제 탭이 됐다(층 사다리) · 결투장은 온라인 ELO
const NAV_GROUPS = [
    ['battle', ['expedition', 'explore', 'party', 'character']],
    ['town', ['research', 'tavern', 'shop', 'forge', 'library', 'resource']],
    // ⚠ 화면 이름은 2026-10-24 맞바꿨다 — `colosseum` 탭 = 「결투장」(층 사다리) · `arena` 탭 = 「콜로세움」(ELO) · 탭 id · 세이브 · `cs.` / `ar.` 키는 옛 이름 그대로 (ADR-0760)
    ['etc', ['colosseum', 'arena', 'codex', 'help', ...(DEV_HOST ? ['lab'] : [])]],   // 실험실은 개발 환경에서만 (§18 · ADR-0751)
];
const TABS = NAV_GROUPS.flatMap(([, ids]) => ids);

/* 미니게임의 줄 — 채광 · 채집 · 벌목(판 하나 = 재료 하나 — `lab_material.csv` 의 `post` · SCREEN_DESIGN §8) [2026-10-25 · ADR-0788 · R356 — ~~단계 줄 `POSTS` · 단계 표 셋~~].
   연구소 트리에서 이 셋은 「자원」 줄의 지점이다(`LAB_RES`). 영웅은 앉지 않는다 [2026-10-18 · ADR-0665] */
const MG_POSTS = [
    { id: 'mine', label: 'dp.post.mine' },
    { id: 'gather', label: 'dp.post.gather' },
    { id: 'log', label: 'dp.post.log' },
];
/* 연구소의 줄 — **연구 하나 = 줄 하나**(SCREEN_DESIGN §8 · ADR-0669). 줄 목록은 `LAB_LINES` 를 읽는다(순서 = `game` 의 `LAB_LINES` — INTERFACE §5-3).
   「자원」 줄 = 재료 셋을 낸다(`res` · 지점 채광 · 채집 · 벌목 — 2026-10-25 ADR-0788) · 「수색」 · 「훈련」 · 「도박장」(2026-10-19 · 2026-10-21 · ADR-0684).
   전용 줄 그림이 없어 다른 그림을 빌린다(`art` — 연구소 건물 · 선술집 건물 · 옛 훈련장 건물 · 도박장 잭팟 코인 · 사각 `sq`) — 줄 그림이 서면 `icons/lab/<줄>` */
const LAB_RES = { id: 'res', label: 'dp.post.res', res: true, art: M.buildingImg('resource'), sq: true };
const LAB_VISIT = { id: 'visit', label: 'dp.post.visit', visit: true, art: M.buildingImg('tavern'), sq: true };
const LAB_TRAIN = { id: 'train', label: 'dp.post.train', art: `${M.BUILDING_IMG_DIR}training.webp`, sq: true };
const LAB_GAMBLE = { id: 'gamble', label: 'dp.post.gamble', art: `${M.GAMBLE_ART_DIR}jackpot${M.ICON_EXT}` };
const LAB_LIBRARY = { id: 'lib', label: 'dp.post.lib', art: M.buildingImg('library'), sq: true };
const LAB_LINES = [LAB_RES, LAB_VISIT, LAB_TRAIN, LAB_GAMBLE, LAB_LIBRARY];
const labLineIcon = post => post.art ?? M.labIcon(post.id);

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
    screen: 'menu',         // menu | start | prologue | game — 켜면 메뉴 (SCREEN_DESIGN §3 · ADR-0641)
    tab: 'expedition',
    // `unfold` = Party 버튼을 누른 직후 첫 그리기에만 우리 팀 아래 진형 · 물약 · 전술이 차례로 내려오는 연출을 단다(그 그리기가 끈다 · ADR-0497)
    //   콜로세움(`arena`) — `cands` = 상대 후보 셋(`arena.rollRatedCandidates`) · `pick` = 고른 칸(0 · 1 · 2 · 'ghost') · `ghost` = 친선전으로 받은 팀 · `code` · `paste` = 친선전 창의 두 글상자 ·
    //   `problems` · `broken` = 불러오기 결과 · `fresh` = 결투 뒤 돌아오면 후보를 새로 굴린다 · `toast` = 돌아오면 띄울 플래시 —
    //   전부 화면 상태다(세이브 아님 — 레이팅만 세이브 · ADR-0670)
    arena: { owner: null, match: null, last: null, unfold: false, cands: null, pick: 1, ghost: null, code: '', paste: '', problems: null, broken: false, fresh: false, toast: null },
    // 결투장(`colosseum`) — `floor` = 고른 층(null = 다음 층) · `opp` = 그 층 상대의 캐시 `{key, team}`(같은 층은 같은 팀 · 그릴 때마다 다시 굴리지 않는다) · `toast` = 돌아오면 띄울 휘장 플래시 ·
    //   화면 상태다(오른 층만 세이브 · ADR-0670)
    colosseum: { owner: null, match: null, last: null, unfold: false, floor: null, opp: null, toast: null },
    // 도박장 창 (SCREEN_DESIGN §8-1 · ADR-0331) — 고른 판돈 단계 · 마지막 결과 · 재생 위치. 세이브 아님 —
    //   결과는 이미 세이브에 들어가 있고(`gambleSpin`) 이것은 **다시 보여 줄 거리**다
    gb: { step: 1, last: null, anim: null },
    exp: 'idle',            // idle | battle | report
    btLayout: 'wide',       // 관전 배치 — wide | split (2026-09-03 사용자 지시). 세이브 아님
    tdmView: 'rows',        // 결투 관전 아래 두 팀 판의 보기 — rows(요약) | cols(스킬별) (ADR-0772). 세이브 아님 · 다음 결투에도 남는다
    // 레벨업 반짝임의 「본 레벨」 {uid: level} [2026-09-29 · SCREEN_DESIGN §4-2 · ADR-0440] — 지금 레벨이 이보다 높으면 관전 카드의 `Lv` 가 반짝인다.
    //   세이브 아님 — 새로고침하면 걷힌다(사용자 선택) · `lvSeenOf` = 이 표를 연 게임(G) — 새 게임 · 불러오기면 새로 연다(`render`)
    lvSeen: {}, lvSeenOf: null,
    heroUid: null,
    btNoPick: false,        // 관전에서 아레나 빈 곳을 눌러 장착 대상을 비웠다 — 관전 화면에 있는 동안만 · `heroUid` 는 그대로 (ADR-0849)
    codexChapter: 1,
    helpQuery: '',          // 도움말 검색 — 화면 상태이며 세이브에 넣지 않는다 (ADR-0947)
    helpFolder: 'expedition', // 주제별 폴더 — 고른 폴더와 스크롤은 화면 상태다 (ADR-0964)
    helpScroll: {},
    expChapter: null,       // 원정에서 보고 있는 챕터 — `null` 이면 「다음에 갈 곳」으로 자동 (ADR-0067)
    // 도감 세그먼트 (SCREEN_DESIGN §9) — monster | character | item | skill | fx | mastery.
    // 얼굴 스타일은 여기 안 둔다 — 전역이다(`?face=` · localStorage · mock.js:setFaceStyle)
    codexSeg: 'monster',
    // 도감 몬스터 세그먼트가 그리는 초상의 등급 (SCREEN_DESIGN §9 · ADR-0167) — normal | elite.
    // 고르개 하나가 **전 카드를 한 번에** 뒤집는다 · 정예 전용 초상이 있는 몬스터만 얼굴이 갈린다(`monster.csv:face_elite`) · 세이브 아님
    codexGrade: 'normal',
    // 아이템 세그먼트의 안쪽 분류 (SCREEN_DESIGN §9-1 · ADR-0179) — weapon | armor. 장신구는 armor 쪽 부위 묶음에 든다 · 세이브 아님
    codexItemSeg: 'weapon',
    // 스킬 세그먼트의 안쪽 분류 (SCREEN_DESIGN §9-1 · ADR-0335) — basic | adv. 직업은 탭이 아니라 묶음이다 · 세이브 아님
    codexSkillSeg: 'basic',
    // 이펙트 세그먼트의 그림체 탭 (SCREEN_DESIGN §9-1 · ADR-0559) — skill_art.js:ART_STYLES · 처음엔 설정이 고른 관전 그림체(ADR-0561) · 세이브 아님
    codexFxStyle: fxArtStyle(),
    // 마스터리 세그먼트의 안쪽 분류 — 죄종 | 직업 | 전직. 각 분류의 판은 가로 세 개씩 선다 · 세이브 아님
    codexMasterySeg: 'sin',
    // 실험실 아이템 생성기 (SCREEN_DESIGN §18 · ADR-0580 · ADR-0610) — 고른 챕터 · 몬스터(null = 그 챕터 첫 몬스터) · 등급 · 단(null = 첫 단) ·
    //   스테이지 레벨(null = 그 장소 첫 칸의 그 단 레벨 — `game.stageLevel`) · 굴린 드롭(최신순 · `LAB_KEEP` 개까지). **세이브 아님** — 다른 탭에 다녀와도 남고 새로고침이면 빈다
    lab: { tool: 'item', chapter: 1, monster: null, grade: 'normal', diff: null, level: null, rolls: [] },
    roll: 1, candidates: [], confirmOverwrite: false,
    // 보관의 분해함 [2026-09-21 · ADR-0184 · 함 2026-10-20 ADR-0673] — [분해]로 띄우고 [취소] · `Esc` · [분해]로 닫는다.
    // 떠 있는 동안 칸 클릭은 **함에 올릴 뿐**이라 오클릭이 파괴가 되지 않는다 — 옛 `salvageMode` 는 클릭이 곧 분해였다.
    // 도구 줄 [잠금] · 「잠그는 중」은 2026-09-29 걷었다 — 잠금은 우클릭 메뉴가 든다 (ADR-0454).
    // 탭을 떠나면 풀린다(`setTab`) — 모드 상태가 화면 밖으로 새지 않는다 · 세이브 아님
    // 「정렬 펼침」 [ADR-0242 · ADR-0247] — 기준 셋을 펼친 칸('stash' · 'bag') · null 이면 안 펼쳤다.
    //   `bagSortAnim` = 펼친 직후 첫 그리기에만 미끄러지는 움직임을 단다(그 그리기가 끈다)
    bagSelMode: false, bagSel: new Set(), bagSortMode: null, bagSortAnim: false,
    // 분해함 [2026-10-20 · ADR-0673] — `bagSelMode` = 함이 떠 있다 · `bagSel` = 함에 오른 uid(넣은 순서) ·
    //   `cubeF` = 필터 세 열에서 고른 묶음(등급 id · 레벨 구간 번호 · 베이스 구간 번호) — 닫으면 비운다 · 세이브 아님
    cubeF: { rarity: new Set(), ilvl: new Set(), fixed: new Set() },
    //   `cubeAuto` = 함에 오른 것 중 **필터가 올린 것** — 필터를 누를 때마다 이것만 내리고 다시 고른다(손으로 올린 것은 남는다 · 2026-10-21 · ADR-0695)
    cubeAuto: new Set(),
    stashTab: 'equip',           // 창고 칸의 탭 — 'equip' | 'mat' | 'book' (SCREEN_DESIGN §6 · ADR-0379 · 자리 ADR-0524 · 스킬북 ADR-0616) · 인벤토리 칸은 안 갈린다
    invNo: 1,                    // 보고 있는 인벤토리의 부대 번호 — 부대 버튼이 고른다 · 해제 · 꺼내기 · 구매 · 제작이 여기로 간다 (§6 · ADR-0521) · 세이브 아님
    invWatch: 0,                 // 관전이 마지막으로 맞춘 부대 — 보는 부대가 바뀌면 `invNo` 를 그 부대로 옮긴다 (§4-2 · ADR-0521)
    autoArm: false,              // 자동 분해 창 — [지금 인벤토리에도 적용]을 한 번 눌러 확인 줄이 선 상태 (ADR-0203) · 창을 닫으면 풀린다
    bookSel: null,               // 도서관 탭 — 가진 책 칸에서 고른 책 id (§17 · ADR-0573 — ~~`bookArm` 무장~~) · 영웅을 바꿔도 남는다(버튼이 그 영웅 기준으로 바뀐다) · 세이브 아님
    bookCraftSel: null,          // 도서관 탭 — 책 만들기 칸에서 고른 기본 책 id (§17 · ADR-0570) · 만들어도 고른 채 남는다 · 영웅과 무관 · 세이브 아님
    repSel: null,                // 리포트에서 고른 런 — null 이면 맨 위를 따라간다 (SCREEN_DESIGN §4-3 · ADR-0063 · ADR-0123)
    repNo: null,                 // 리포트가 보는 부대 — null 이면 고른 편성 · 탭이 바꾸고 관전 · 철수에서 넘어오면 그 부대 (§4-3 · ADR-0622)
    joinCard: null,              // 선술집 셋째 칸이 카드를 든 수색의 줄 번호(`joins[].no`) — 얼굴을 누를 때마다 켜고 끈다 (SCREEN_DESIGN §8-1 · ADR-0671 · 세이브 아님)
    joinSeen: {},                // 수색 얼굴을 처음 본 때 `{줄 번호: at}` — 스며 나오기를 한 번만 (ADR-0671 · 세이브 아님)
    exSel: null,                 // 탐험 — 고른 지점 {chapter, spot} = **열린 지점 창** · 없으면 창 없이 지도만 · 탭에 들어올 때 · ✕ 로 비운다 (SCREEN_DESIGN §8-4 · ADR-0585 · 세이브 아님)
    exArm: null,                 // 탐험 — 불러들이기 첫 누름이 걸린 지점 키(`장:지점`) · 두 번 누르기 (§3)
    cmArm: null,                 // 의뢰 [포기]를 한 번 누른 카드 번호 — 두 번째 누름이 버린다(§3 · ADR-0352) · 탭을 떠나면 풀린다 · 세이브 아님
    forgeItem: null,             // 대장간에서 직접 고른 장비 uid — 진입 시 비운다
    makePart: null,              // 제작 칸에서 고른 부위 — 없으면 부위 목록의 첫 칸 · 'potion' 이면 물약 칸 (SCREEN_DESIGN §8-2 · ADR-0219)
    makeLevel: null,             // 제작 칸에서 고른 레벨(Lv1 · Lv10 …) — 없으면 첫 레벨 (ADR-0263)
    forgeTab: 'up',              // 대장간의 작업 탭 — 'make' | 'up' | 'synth' | 'craft' (ADR-0142 · 합성 ADR-0856 · `?fg=` 로도 연다) · 탭 버튼은 언제나 강화 (ADR-0962)
    cnPick: null,                // 건설 탭에서 고른 건물 id — null 이면 지금 지을 수 있는 첫 건물 (SCREEN_DESIGN §13-1 · ADR-0304)
    shopPotionN: 1,              // 상단 물약을 한 번에 살 수 — 사기 줄 ×n 이 고른다 (§8-3 · 2026-10-23)
    shopSel: null,               // 상점에서 고른 칸 {src: 'equip'|'mat'|'special', i, cycle} — 상점 전체에서 하나 · `cycle` = 그 격자의 번호(상단 = 목록 번호 `list` · 특수상단 = 방문 회차) · 바뀌면 풀린다
    shopSell: new Set(),         // 상단 판매 목록 — 실제 장비는 [판매]까지 보관 칸에 남는다 · 탭을 떠나면 비운다 · 세이브 아님
advSel: null,                // 도서관 전직 패널에서 고른 갈래 {uid, branch} — 띠에서 다른 영웅을 고르면 안 먹는다 (§17 · ADR-0536 · ADR-0567)
    shopShown: null,             // 상점이 마지막으로 그린 방문 `{cycle, here}` — 앱 시계가 이것과 달라지는 순간 다시 그린다(`shopTick`)
    battle: null,           // {result, stageId} — **보는 부대**의 핸들 (아래 `battles` 의 한 칸을 가리키는 이름이다)
    /* 부대마다 한 핸들 [2026-09-24 · ADR-0316 · 다부대] — 편성 번호 → `{run, result, stageId, form, resume}`.
       `game.departRun` 이 돌려주는 핸들은 **메모리에만** 산다(세이브 칸 `G.runs` 와 다른 물건이다 — 엔진 · rng 를 클로저에 든다).
       자리가 하나면 둘째 부대를 보낼 때 첫째 핸들이 버려져 그 부대가 멈춘다. 보는 부대 하나만 재생기가 몰고 나머지는 앱 시계가 민다(`expTick`) */
    battles: {},
    // 편성 패널이 연 스테이지 (SCREEN_DESIGN §4-1) — null 이면 패널이 없다. 지역을 눌러야 열린다(자동으로 열지 않는다)
    expStage: null,
    // 반복 의사 — G.run.repeat 은 「진행 중인 런」의 값이라 출발 **전에는** 쓸 곳이 없다. 화면이 들고 있다가 출발할 때 런에 옮긴다
    expRepeat: false,
    // 진형 목업 (SCREEN_DESIGN §4-1) — 템플릿 + 랭크별 uid. 기획 미확정이라 세이브·전투에 안 실린다 (화면 상태뿐)
    // 탭 위에 겹쳐 뜨는 창 (SCREEN_DESIGN §2 창 레이어) — null | 'skill'. 한 번에 한 장만 뜬다
    modal: null,
    // 프롤로그가 보여 주는 씬 번호 (SCREEN_DESIGN §3-1) — 0 부터. 세이브에 안 들어간다
    proScene: 0,
    // 다음 프롤로그 렌더를 **암전에서 띄울지** — 챕터가 열리는 씬 하나만 켠다. 한 번 쓰고 렌더러가 끈다
    proFade: false,
    // 연구소 탭에서 골라 둔 줄 (§8) — 들어오면 첫 줄(자원)이 골라져 있다. 비워 두면 오른쪽이 빈다
    post: 'res',
    // 연구소 줄마다 고른 지점 `{줄 id: 지점 id}` (§8 · ADR-0684 — ~~labTier 고른 단계~~) — 없으면 그 줄의 첫 지점. 세이브에 안 들어간다
    labNode: {},
    // 연구소 오른쪽이 고른 줄인가 — 줄 카드를 누르면 true(등록 효과 · 영웅 얼굴) · 노드를 누르면 false(고른 지점) (§8 · ADR-0700). 세이브에 안 들어간다
    labLineView: false,
    itemMenu: null,         // 보관 칸 우클릭 메뉴 — `{uid, hero, x, y}` (x · y = 한 장 좌표) (SCREEN_DESIGN §6 · ADR-0451) · 세이브 아님
};
let stopBattle = null;
let raidSession = null, stopRaid = null;
let stopArena = null;
let stopForgeSelection = null;
let arenaWatching = null;   // 관전 중인 결투의 화면 상태(`state.arena` · `state.colosseum`) — 다시 그릴 때 재생 위치를 그 `match` 에 받아 둔다
let battleBag = null;       // 관전 아래 보관 칸 — 라운드 정산 때 이것만 갈아 끼운다 (R89 · `refreshBattleBag` · ADR-0341)
let invWatchPrev = 0;       // 바로 앞 그리기가 관전 보관 칸을 그린 부대 번호(아니면 0) — 관전에 들어오거나 보는 부대가 바뀔 때만 부대 버튼을 옮긴다 (ADR-0521)
/**
 * 그 부대의 세이브 칸 [v38 · 2026-09-23 다부대] — `G.runs` 는 편성 번호로 색인된다(자리 + 1 = 번호).
 * 번호를 안 주면 **지금 관전 중인 런의 편성**, 그것도 없으면 고른 편성이다 — 화면이 부대 하나만 보던 때의 `G.run` 자리를 그대로 메운다.
 * 부대 탭(여러 부대를 오가며 본다)은 2단계다
 */
const runSlot = (no = state.battle?.run?.preset ?? G?.preset) => (Number.isInteger(no) ? G?.runs?.[no - 1] ?? null : null);

const rollCandidates = () => SYS.hero.rollStartParty(makeRng(ROLL_SEED + state.roll), D.balance.party_size_max);
/* 플래시 — 한 장 오른쪽 아래에서 튀어나왔다가 제 시간에 다시 들어가는 카드 (SCREEN_DESIGN §2 · ADR-0692).
   render() 를 기다리지 않고 한 장 직속 `#toast` 에 **곧장** 선다 — 탭 내용 밖이라 박스를 밀지 않고, 다시 그려도 안 지워지고, 창 위에 보인다.
   **쌓인다** — 새 카드는 맨 아래(모서리)에 붙고 카드마다 수명을 센다 · `TOAST_MAX` 장이 차 있으면 가장 오래된(맨 위) 카드를 곧바로 걷는다 ·
   **같은 문구가 떠 있으면 그 카드를 걷고 새로** 튀어나온다(같은 오류를 거푸 눌러도 눌렸다는 게 보인다). 문자열을 직접 받지 않는다 — i18n 키 + 파라미터 */
const TOAST_MS = 3000;   // 튀어나와서 다시 들어갈 때까지 — 화면 연출의 길이라 CSV 가 아니다(FROZEN_GAP_MS 와 같은 선례). 들고 나기의 몫은 style.css `@keyframes toast-pop`
const TOAST_MAX = 3;     // 한 번에 떠 있는 카드 수 — 화면 연출의 한도라 CSV 가 아니다 (ADR-0692)
const toastTimers = new WeakMap();   // 카드 → 수명 타이머 — 일찍 걷는 카드 · `?flash=` 의 멈춰 서기가 끈다
const dropToast = node => { clearTimeout(toastTimers.get(node)); node.remove(); };
function flash(key, params) {
    const box = $('#toast');
    const node = el('div', 'toast', tLock(key, params));   // 잠김 문구(`lock: true`)는 글 앞에 자물쇠 (§13-1 · ADR-0699)
    [...box.children].filter(n => n.textContent === node.textContent).forEach(dropToast);
    while (box.children.length >= TOAST_MAX) dropToast(box.firstElementChild);
    node.style.animationDuration = `${TOAST_MS}ms`;
    box.appendChild(node);
    toastTimers.set(node, setTimeout(() => node.remove(), TOAST_MS));
}

/* ═══════════ 셸 ═══════════ */

function renderShell() {
    // 프롤로그도 시작 화면과 같은 셸이다 (§3-1) — 탭 바도 자원 띠도 없다. 게임 화면은 'game' 하나뿐
    const pre = state.screen !== 'game';
    $('#app').classList.toggle('pregame', pre);
    $('#app').classList.remove('booting');   // 첫 그리기 전의 셸 — 빈 브랜드 · 상단바 · 내비가 안 비친다 (index.html · ADR-0349)

    const nav = $('.nav');
    nav.innerHTML = '';
    // 안 지은 건물의 탭은 흐리고 **눌러도 안 들어간다** [2026-09-23 · SCREEN_DESIGN §1 · ADR-0311] — 누르면 지을 건물을 플래시로 말한다 · 판정은 `constructionState`
    const cs = !pre && G ? SYS.game.constructionState(G) : null;
    const tabOpen = cs ? cs.tabs : {};
    // 할 일 점 [2026-10-16 · §1 · ADR-0637] — 하면 꺼지는 일이 기다리는 탭 · 흐린 탭엔 안 단다(그 자리는 자물쇠) · 그리기 사이는 `refreshNavTodo`
    const todo = !pre && G ? SYS.game.navTodo(G, now()) : {};
    // 묶음마다 누를 수 없는 머리 한 줄이 먼저 선다 [2026-10-09 · §1 · ADR-0554] — 묶음 사이 간격은 머리의 윗여백(style.css `.nav-grp`)
    if (!pre) for (const [grp, ids] of NAV_GROUPS) {
        nav.appendChild(el('div', 'nav-grp', t(`nav.grp.${grp}`)));
        for (const id of ids) {
            const shut = tabOpen[id] === false;
            // 흐린 탭은 오른쪽 끝에 닫힌 자물쇠(잠김 베일과 같은 그림 · 이름과 같은 회색으로 같이 흐린다) [2026-09-28 사용자 지시 · §1]
            const b = el('button', `${id === state.tab ? 'on' : ''}${shut ? ' dim' : ''}${!shut && todo[id] ? ' todo' : ''}`,
                shut ? `<span class="nav-lbl">${t(`nav.${id}`)}</span><span class="nav-lock">${lockIcon(true)}</span>` : t(`nav.${id}`));
            b.dataset.tab = id;
            // 탭을 떠나면 **분해함이 닫힌다** [ADR-0184 · ADR-0673] — 모드 상태가 화면 밖으로 새지 않는다 · 탐험 지점 창도 닫힌다(들어오면 지도만 · ADR-0585)
            //   **원정 탭 버튼은 언제나 스테이지다** [2026-10-18 사용자 지시 · §4 · ADR-0661] — 관전 · 리포트를 보고 있었어도 · 이미 원정 탭이어도. 관전은 상단바 부대 칸이 연다
            //   **대장간 탭 버튼은 언제나 강화다** [2026-10-30 사용자 지시 · §8-2 · ADR-0962] — 같은 규칙
            b.onclick = shut ? () => flashUnbuilt(cs, id) : () => {
                state.tab = id; clearBagSel(); state.cmArm = null; state.exSel = null; state.exArm = null;
                if (id === 'expedition') state.exp = 'idle';
                if (id === 'forge') { state.forgeTab = 'up'; state.forgeItem = null; }
                render();
            };
            nav.appendChild(b);
        }
    }
    if (!pre) {
        // 세이브가 있으면 부팅이 곷장 게임으로 들어오므로, 시작 화면(새 게임·덮어쓰기)으로 돌아가는 문은 여기 하나다
        const nb = el('button', 'b-newgame', t('ng.h'));
        nb.onclick = () => { state.screen = 'start'; state.confirmOverwrite = false; render(); };
        nav.appendChild(nb);
    }

    const r = G?.resources;
    // `data-res` — 관전이 떠 있는 동안 라운드 정산이 **이 숫자만** 갈아 끼운다(재생기를 걷지 않는다 · R89 · `refreshGold`)
    // 자원은 **골드 하나** — 가루 · 낙인은 상단바에 안 선다 (2026-09-24 사용자 지시 · ADR-0319)
    $('.resources').innerHTML = pre || !r ? '' : `
        <span>${t('res.gold')}<b data-res="gold">${r.gold.toLocaleString()}</b></span>`;

    // 우편함 — 골드 바로 오른쪽 · 게임 화면이면 늘 선다 · 우편이 있으면 개수 배지 (§2 「상단바」 · ADR-0732)
    if (!pre && G) {
        $('.resources').appendChild(mailButton());
        $('.resources').appendChild(notifications.mount());
        notifications.paint();
    } else notifications.reset();
    const langBtn = el('button', 'btn sm lang-btn', t('ui.langBtn'));
    langBtn.onclick = () => { setLang(lang() === 'ko' ? 'en' : 'ko'); render(); };
    $('.resources').appendChild(langBtn);
    // Admin — 누르면 아래에 판이 열린다 · 누르기만으론 안 넣는다 (devadmin.js · SCREEN_DESIGN §10-3 · 2026-10-23 · R332). Unlock(건물로 막힌 것이 열린 척)은 devadmin 이 든다.
    //   [Add] 줄은 세이브를 만진다 — 모자란 만큼 채운다: 골드 `admin_gold` · 재료 `admin_materials`(파견처 산출물 전 단계 + 가루 · 낙인) · 도안 `admin_blueprints`(책이 되는 스킬 전부)
    //   · 영웅 1명(메인 직업 랜덤 · `admin_hero_level` · Unlock 과 무관 — 로스터 자리만 본다). 판이 없으면 흐린다 · 배포 주소에는 안 선다(ADR-0751)
    const top = (bag, k, n) => { if ((bag[k] ?? 0) < n) bag[k] = n; };
    const add = f => G ? () => { f(); save(); } : null;
    const AB = D.balance;
    if (DEV_HOST) mountAdmin($('.resources'), render, {
        gold: { n: AB.admin_gold, run: add(() => top(G.resources, 'gold', AB.admin_gold)) },
        materials: { n: AB.admin_materials, run: add(() => {
            G.materials ??= {};
            for (const { id } of SYS.game.materialsState(G).items) top(G.materials, id, AB.admin_materials);
            top(G.resources, 'stigma', AB.admin_materials);   // 가루는 재료 사다리(위 줄 · v43 · R373)
        }) },
        blueprints: { n: AB.admin_blueprints, run: add(() => {
            G.blueprints ??= {};
            for (const { id } of SYS.skill.list) if (SYS.skill.bookable(id)) top(G.blueprints, id, AB.admin_blueprints);
        }) },
        hero: { n: AB.admin_hero_level, full: !!G && G.heroes.length >= SYS.game.limitsOf(G).roster, run: add(() => SYS.game.adminHero(G, null, AB.admin_hero_level)) },
    });
    // 아트 스타일 고르개는 상단바에 안 선다 — ⚙ 설정 첫 줄 · 도감에 있다 [2026-10-06 사용자 지시 · SCREEN_DESIGN §2-2]
    // 원정 플레이 시간 — ⚙ 바로 왼쪽 · 게임 화면에서만 [2026-09-25 · SCREEN_DESIGN §2 · ADR-0356 · 2026-10-05 · ADR-0514]. `data-exp-time` — 앱 시계가 눈금마다 이 숫자만 갈아 끼운다(`refreshExpTime`)
    if (!pre && G) $('.resources').appendChild(el('span', 'exp-time', `${t('ui.expTime')}<b data-exp-time>${fmtExpTime(G.expMs)}</b>`));
    // ⚙ — 판의 탭 셋: 설정(스킬 이펙트 · 피격 반응 — 속은 여기 `settingsBody`) · Palette(배경 · 글자 색을 눈으로 맞추는 개발 장치)
    //   [2026-09-28 사용자 지시 · SCREEN_DESIGN §2-2 · ADR-0414] · Save(세이브 슬롯 셋 — 개발 장치 · 2026-10-23 · §10-4 · ADR-0738)
    //   Save 의 불러오기 = 이어 하기와 같은 길 + 자동 저장을 그 내용으로 덮는다(거기서부터 자동 저장이 다시 갱신된다) · 못 열면 지금 판을 그대로 둔다
    //   배포 주소는 설정 탭 하나뿐이다 — Palette · Save 는 개발 환경에서만 (§2-2 · ADR-0751)
    mountDevPalette($('.resources'), { label: t('set.h'), body: settingsBody }, !DEV_HOST ? [] : [saveSlotsTab({
        hasGame: () => !!G,
        snapshot: () => SYS.game.serialize(G, now()),
        canLoad: s => SYS.game.canLoad(s),
        restore: s => {
            const prev = G;
            if (!continueGame(s)) { G = prev; return false; }
            save(); render();
            return true;
        },
    })], { palette: DEV_HOST });

    // crumb — 게임 밖 화면 이름만 선다 · 게임 화면엔 없다(지금 탭은 탭 내비의 고른 칸이 든다) — 비면 자리를 안 잡아 원정 세그먼트가 왼쪽 끝에 붙는다
    //   [2026-10-21 사용자 지시 · SCREEN_DESIGN §2 · ADR-0686 — 0353 의 「가장 긴 탭 이름만큼 폭」을 대체 · style.css `.crumb:empty`]
    $('.crumb').textContent = !pre || state.screen === 'menu' ? '' : state.screen === 'prologue' ? t('pro.h') : t('ng.h');
    // 원정 세그먼트 — **모든 탭에 선다** [2026-09-24 사용자 지시 · SCREEN_DESIGN §2 · §4 · ADR-0353] — 다른 일을 하다가도 부대 상태 · 끝난 원정이 보이고 누르면 그리로 간다.
    //   원정 탭이 닫혀 있으면(건물 표) 안 선다 — 갈 곳이 없다
    const seg = $('.tab-seg');
    seg.innerHTML = '';
    if (!pre && G && tabOpen.expedition !== false) seg.appendChild(expNavBox());
}

/* ── 첫 클리어 상자 · 우편함 (SCREEN_DESIGN §2 「상단바」 · §6 · ADR-0731 · ADR-0732 · ADR-0742 · ADR-0743 · R328 · R333) ── */

/** 우편함 카드 자리 — 늘 깔리는 칸 수 · 한 줄의 카드 수(한 줄에 한 장). 빈 자리는 흐린 편지봉투 · 넘치면 판 안에서 스크롤 (ADR-0743 · ADR-0748 · ADR-0989) */
const MAIL_SLOTS = 5, MAIL_COLS = 1;

/** 상자가 어느 칸 · 어느 단의 것인가 — 「1-2 II · 노말」(칸이 하나인 장소는 칸 번호를 안 단다) */
function boxFrom(b) {
    const z = D.stages[b.stageId];
    const one = z && D.stageList.filter(s => s.chapter === z.chapter && s.stage_num === z.stage_num).length === 1;
    const stage = z ? `${z.chapter}-${z.stage_num}${one ? '' : ` ${M.roman(z.cell)}`}` : String(b.stageId);
    return { stage, diff: L(D.difficulties[b.difficulty]?.name ?? D.difficultyList[0]?.name) };
}
/** 상자 그림 — 상자 + 왼쪽 위 부위 표식(무기 · 갑옷 빈 칸 실루엣 — `mock.slotArt` · ADR-0742) */
const boxImg = kind => `<img src="${M.CLEAR_BOX_ART}" alt="" draggable="false">`
    + (M.slotArt(kind) ? `<img class="box-kind" src="${M.slotArt(kind)}" alt="" draggable="false">` : '');
/** 상자 이름 — 등급 낱말 + 종류 「하급 무기 상자」 · 칸 툴팁 · 우편함 카드 · 리포트가 같이 쓴다 · 등급이 없는 옛 리포트는 하급 (ADR-0776) */
const boxName = b => t('box.named', { tier: t(`box.tier.${b.tier ?? 'low'}`), box: t(`box.${b.kind ?? 'weapon'}`) });

/** 상자 하나를 깐다 — **보고 있는 영웅**에게 맞는 장비 하나가 그 영웅의 레벨로 나온다 · 플래시가 장비 이름을 등급 색으로 (ADR-0742) */
function openBoxCell(h, it) {
    const r = SYS.game.openBox(G, it.uid, h?.uid);
    if (!r.ok) { flash(`ch.err.${r.err}`); return; }
    save();
    const got = itemOf(r.item);
    flash('box.opened', { name: `<span style="color:${rarity(got.rarity).color}">${L(got.name)}</span>` });
}

/** 보관 칸의 상자 한 칸 — 상자 그림 + 왼쪽 위 부위 표식 + 오른쪽 아래 `×n`(등급 테두리 · 레벨 · 강화 배지 없음) ·
 *  **까는 길은 우클릭 [사용] 하나** — 칸 클릭은 안 깐다 (§6 · ADR-0731 · ADR-0733 · ADR-0742) */
function boxCell(cell, it, h, where, moding, onPick) {
    const { kind, tier, n } = it.box;
    cell.classList.add('box');
    cell.innerHTML = `<span class="inv-icon">${boxImg(kind)}</span><span class="inv-lv">×${n}</span>`;
    // 툴팁 = 이름 / 선 아래 「{보고 있는 영웅}에게 맞는 Lv {레벨} 무기」 + 나오는 희귀도 「매직 ~ 레어」 — 까면 무엇이 나오나만 ·
    //   물약 카드와 같은 모양 · 같은 폭 (ADR-0742 · ADR-0776 · 툴팁은 효과만 · §6)
    const pair = SYS.game.boxRarities(tier);
    const word = r => `<span style="color:${rarity(r).color}">${L(rarity(r))}</span>`;
    const tip = () => {
        const lines = (h ? `<div class="muted">${t('box.for', { hero: L(h.name), lv: h.level, part: t(`box.part.${kind}`) })}</div>` : '')
            + (pair ? `<div class="muted">${t('box.rarity', { lo: word(pair[0]), hi: word(pair[1]) })}</div>` : '');
        return el('div', 'tip-card box-tip', `<div class="tip-effect-head"><div class="tip-name">${boxName(it.box)}</div></div>`
            + (lines ? `<div class="tip-effect-summary">${lines}</div>` : ''));
    };
    bindTipNode(cell, tip, { actions: moding ? null : () => itemActions(h, it), side: where === 'bag' ? 'left' : null });
    if (!moding) bindCardDrag(cell, where === 'stash' ? '.store-bag' : '.store-stash', () => { sendAcross(where, it); return true; });
    cell.onclick = (e) => {
        if (formDragEnded) return;
        hideTip();
        if (state.bagSelMode) cubeToggle(it);                   // 분해함엔 안 오른다 — 거절 플래시
        else if (e.ctrlKey || e.metaKey) sendAcross(where, it);
        else if (onPick) { flash('ch.err.sealed'); return; }    // 대장간 고르기 — 까기 전엔 장비가 아니다
        else return;                                            // 그냥 클릭은 아무 일도 없다 — 우클릭 [사용]으로 깐다 (ADR-0733)
        render();
    };
    cell.oncontextmenu = e => {
        e.preventDefault();
        if (moding || isTouchInput()) return;
        hideTip();
        const pt = stagePoint(e);
        state.itemMenu = { uid: it.uid, hero: h?.uid ?? null, x: pt.x, y: pt.y };
        render();
    };
    return cell;
}

/** 상단바 편지봉투 — 우편이 있으면 오른쪽 위 개수 배지 · 누르면 우편함 창 (ADR-0732) */
function mailButton() {
    const n = (G.mail ?? []).length;
    const b = el('button', `mail-btn${n ? ' has' : ''}`, `<img src="${M.MAIL_ART}" alt="" draggable="false">${n ? `<span class="mail-n">${n}</span>` : ''}`);
    bindTipNode(b, () => el('div', 'tip-card tip-mini', `<div class="tip-name">${t('mail.h')}</div>`));
    b.setAttribute('aria-label', t('mail.h'));
    b.onclick = () => openModal('mail');
    return b;
}

// 알림은 우편과 다른 버튼이다. 순수 상태 판정은 game.notificationState, 펼침·반짝임만 UI에 산다 (ADR-0969).
const notifications = createNotifications({
    read: () => G && state.screen === 'game' && !frozen
        ? { owner: G, model: SYS.game.notificationState(G, now()) } : null,
    describe: item => {
        if (item.id === 'retryPreparation') return {
            title: t('nt.guide.retryPreparation'),
            detail: t('nt.retry.detail', { party: M.roman(item.target.preset),
                stage: D.stages[item.target.stageId] ? stageTitle(D.stages[item.target.stageId]) : item.target.stageId,
                n: item.target.attempts }),
        };
        if (!item.kind) return { title: t(`nt.guide.${item.id}`) };
        let detail = '';
        if (item.kind === 'commission') {
            const card = SYS.game.commissionState(G).cards.find(c => c.no === item.target.commission);
            if (card) detail = commissionGoal(card);
        } else if (item.kind === 'explore') detail = exSpotName(item.target.chapter, item.target.spot);
        else if (item.kind === 'join') {
            const join = SYS.game.joinState(G, now()).list.find(j => j.no === item.target.join);
            if (join) detail = L(join.hero.name);
        } else if (item.kind === 'mastery') {
            const hero = heroById(item.target.hero);
            if (hero) detail = t('nt.mastery.detail', { hero: L(hero.name), level: hero.level, n: item.points });
        }
        return { title: t(`nt.kind.${item.kind}`), detail };
    },
    navigate: item => {
        if (item.kind === 'mastery') {
            const fresh = SYS.game.notificationState(G, now()).items.find(current => current.id === item.id);
            if (!fresh) { render(); return; }
            item = fresh;
            state.heroUid = item.target.hero;
            state.btNoPick = false;
        }
        if (item.id === 'retryPreparation') {
            const fresh = SYS.game.notificationState(G, now()).guide;
            if (fresh?.id !== item.id || fresh.target.preset !== item.target.preset
                || fresh.target.stageId !== item.target.stageId || fresh.target.difficulty !== item.target.difficulty) {
                render(); return;
            }
            item = fresh;
            state.heroUid = item.target.hero;
            state.invNo = item.target.preset;
            state.btNoPick = false;
        }
        state.tab = item.tab; clearBagSel(); state.cmArm = null; state.exArm = null; state.exSel = null;
        state.modal = null; state.modalBack = null; state.autoArm = false;
        if (item.tab === 'expedition') state.exp = 'idle';
        if (item.target?.building) state.cnPick = item.target.building;
        if (item.target?.join) state.joinCard = item.target.join;
        if (item.target?.chapter) state.exSel = { chapter: item.target.chapter, spot: item.target.spot };
        if (item.kind === 'mastery') state.modal = 'skill';
        render();
        const target = item.target?.commission
            ? document.querySelector(`.cm-card[data-commission="${item.target.commission}"]`)
            : item.target?.building ? document.querySelector('.cn-side')
            : item.target?.join ? document.querySelector('.tv-join-card')
            : item.tab === 'tavern' ? document.querySelector('.cm-board') : null;
        if (target) {
            target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            target.classList.remove('notification-target');
            void target.offsetWidth;
            target.classList.add('notification-target');
            target.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
        }
    },
    hideTip,
    lockIcon: () => lockIcon(true),
    readDismissed: owner => loadNotificationDismissed(`${owner.seed}:${owner.createdAt}`),
    writeDismissed: (owner, ids) => writeNotificationDismissed(`${owner.seed}:${owner.createdAt}`, ids),
});

// 초반 안내는 화면이 제공하는 실제 행동만 설명한다. 진행·보상·난수·게임 세이브는 바꾸지 않는다.
const tutorialOwner = () => `${G.seed}:${G.createdAt}`;
function tutorialState() {
    if (!G || state.screen !== 'game' || frozen || document.hidden) return null;
    const owner = tutorialOwner();
    // 기존 진행 세이브는 설정에서 다시 보기를 고른 경우에만 시작한다.
    if (loadTutorialSeen(owner) === null) return null;
    if (!$('#turn').hidden || state.itemMenu || $('.notification-panel:not([hidden])')
        || document.querySelector('.dp-panel:not([hidden])')) return null;
    const steps = [], add = (id, target) => { if (target) steps.push({ id, target }); };
    const h = heroById(state.heroUid);
    const canLearn = () => h?.masteryPoints > 0 && SYS.game.masteryState(G, h.uid).nodes.some(n => n.canLearn);
    if (state.modal) {
        if (state.modal === 'skill' && canLearn()) add('mastery', $('#modal .sk-cell.can[data-node]'));
        return { owner, context: `modal:${state.modal}`, steps };
    }
    if (state.tab === 'expedition' && expScreen() === 'idle') {
        const departed = (G.counters.battle ?? 0) > 0 || (G.reports ?? []).length > 0
            || (G.progress.cleared ?? []).length > 0
            || Object.values(G.progress.clearedIn ?? {}).some(ids => ids.length > 0);
        if (!departed) add('expedition', $('.zone:not(.locked) .title > span:last-child'));
    }
    if (state.tab === 'character') {
        if (!state.bagSelMode && bagHero() && invBag().some(uid => itemOf(uid) && !itemOf(uid).box))
            add('loot', $('.store-bag .inv-cell.filled:not(.box)'));
        if (canLearn()) add('mastery', $('.go-tree.has-points'));
    }
    if (state.tab === 'party') add('potions', $('.pt-potion'));
    if (state.tab === 'shop' && SYS.game.hasFeature(G, 'shop')) add('potions', $('.td-potions'));
    if (state.tab === 'research' && $('.cn-next .cn-go')) add('construction', $('.cn-next'));
    return { owner, context: state.tab, steps };
}
const tutorial = createTutorial({
    read: tutorialState,
    describe: id => {
        const detailKey = id === 'mastery' && state.modal === 'skill' ? 'masteryTree'
            : id === 'loot' && isTouchInput() ? 'lootTouch'
            : id === 'potions' ? (SYS.game.hasFeature(G, 'shop') ? 'potionsShop' : 'potions') : id;
        return { title: t(`tutorial.${id}.title`), detail: t(`tutorial.${detailKey}.detail`),
            closeLabel: t('tutorial.confirm'), progress: t('tutorial.progress') };
    },
    readSeen: loadTutorialSeen,
    writeSeen: writeTutorialSeen,
});
// 종·설정 패널처럼 본문을 다시 그리지 않는 컨트롤도 열린 순간 안내를 가린다.
document.addEventListener('click', () => tutorial.refresh());
document.addEventListener('visibilitychange', () => tutorial.refresh());

/**
 * 우편함 창 [ADR-0748] — **우편 한 통 = 카드 한 장**: 왼쪽 첨부 칸(인벤토리 칸과 같은 상자 칸 · ×1) · 가운데 상자 이름(굵게) + 「칸 · 난이도 첫 클리어」 ·
 * 오른쪽 받을 부대 + [받기]. 카드 자리는 `MAIL_SLOTS` 칸이 `MAIL_COLS` 줄로 늘 깔리고(빈 자리 = 흐린 편지봉투 · 오래된 우편이 앞 · ADR-0743)
 * 넘치면 판 안에서 스크롤. 맨 아래 띠 = 왼쪽 「우편 n통」 · 오른쪽 [모두 받기](우편이 없으면 흐리다)
 */
function mailBody() {
    const body = el('div', 'mail-body');
    const list = G.mail ?? [];
    const grid = el('div', 'mail-grid');
    grid.style.setProperty('--mail-cols', MAIL_COLS);
    grid.style.setProperty('--mail-rows', Math.ceil(MAIL_SLOTS / MAIL_COLS));
    for (const m of list) {
        const card = el('div', 'mail-card');
        card.appendChild(el('div', 'inv-cell filled box mail-att', `<span class="inv-icon">${boxImg(m.kind)}</span><span class="inv-lv">×1</span>`));
        card.appendChild(el('div', 'mail-info', `<div class="mail-title">${boxName(m)}</div><div class="mail-from">${t('mail.from', boxFrom(m))}</div>`));
        const side = el('div', 'mail-side', `<span class="mail-to">${t('pt.preset', { n: M.roman(m.no) })}</span>`);
        const b = el('button', 'btn sm', t('mail.claim'));
        b.onclick = () => {
            const r = SYS.game.claimMail(G, m.id);
            if (!r.ok) flash(`ch.err.${r.err}`); else save();
            render();
        };
        side.appendChild(b);
        card.appendChild(side);
        grid.appendChild(card);
    }
    for (let i = list.length; i < MAIL_SLOTS; i++) grid.appendChild(el('div', 'mail-card empty', `<img src="${M.MAIL_ART}" alt="" draggable="false">`));
    body.appendChild(grid);
    const foot = el('div', 'mail-foot', `<span class="mail-count">${t('mail.count', { n: list.length })}</span>`);
    const all = el('button', 'btn primary mail-all', t('mail.claimAll'));
    all.disabled = !list.length;
    all.onclick = () => {
        const r = SYS.game.claimAllMail(G);
        if (r.n) { save(); flash('mail.claimed', { n: r.n }); }
        if (r.left) flash('ch.err.bagFull');
        render();
    };
    foot.appendChild(all);
    body.appendChild(foot);
    return body;
}

function render() {
    // 숨긴 탭은 그리지 않는다 — 보는 사람이 없다. 시계는 앱이 계속 밀고, 돌아오는 순간 한 번 그린다(`onVisibility` · ADR-0102)
    if (document.hidden) return;
    if (stopForgeSelection) { stopForgeSelection(); stopForgeSelection = null; }
    if (state.tab !== 'shop' || state.screen !== 'game' || state.bagSelMode) state.shopSell.clear();
    if (stopRaid) { stopRaid(); stopRaid = null; }
    notifications.capture();
    clockRender = false;      // 무엇 때문에 그리든 지금 상태를 그린다 — 미뤄 둔 앱 시계 그리기는 여기서 풀린다 (ADR-0338)
    bagStale = false;         // 관전 보관 칸도 새로 선다 (ADR-0341)
    invWatchPrev = state.invWatch; state.invWatch = 0;   // 이번 그리기가 관전 보관 칸을 그리면 다시 선다 (ADR-0521)
    // 보관 칸 우클릭 메뉴는 탭 본문 밖(한 장 바로 아래)에 선다 — 본문과 함께 안 지워지므로 여기서 걷는다 (`itemMenuPanel` · ADR-0451)
    document.querySelectorAll('#stage > .item-menu, #stage > .item-menu-back').forEach(n => n.remove());
    // 관전 중 재렌더(가방 클릭 · 언어 전환 · 세그먼트 이동)면 재생 위치를 받아 뒀다가 다음 mount 에 넘긴다 — 처음부터 다시 틀지 않는다 (2026-08-27)
    if (stopArena) { const pos = stopArena(); if (arenaWatching?.match) arenaWatching.match.resume = pos; stopArena = null; }
    if (stopBattle) { const pos = stopBattle(); if (state.battle) state.battle.resume = pos; stopBattle = null; }
    applyDocumentLang();
    M.applyDocumentFace();
    M.applyDocumentBg();
    if (G) {
        if (!heroById(state.heroUid)) state.heroUid = G.heroes[0]?.uid ?? null;
        if (!(state.tab === 'expedition' && expScreen() === 'battle')) state.btNoPick = false;   // 비운 장착 대상은 관전을 떠나면 풀린다 (ADR-0849)
        // 레벨업 반짝임의 본 레벨 — 처음 보는 영웅은 지금 레벨을 본 것으로 친다 · 게임이 바뀌면 새로 연다 (ADR-0440).
        //   영웅은 그리기를 거친 뒤에야 파티에 들어 레벨이 오르므로(고용 · 편성은 클릭 → 그리기) 첫 레벨업 전에 여기서 적힌다
        if (state.lvSeenOf !== G) { state.lvSeenOf = G; state.lvSeen = {}; }
        for (const h of G.heroes) state.lvSeen[h.uid] ??= h.level;
    }
    renderShell();
    const main = $('.main');
    // 박스 안 스크롤 위치 — 다시 그려도 남는다 (SCREEN_DESIGN §2 「박스」 · ADR-0097). 박스는 매번 새로 서므로 `data-keep` 이름으로 되찾는다
    const kept = new Map([...main.querySelectorAll('[data-keep]')].map(n => [n.dataset.keep, n.scrollTop]));
    const helpInput = main.querySelector('.help-search-input');
    const helpFocus = helpInput && document.activeElement === helpInput
        ? { start: helpInput.selectionStart, end: helpInput.selectionEnd } : null;
    const helpControl = main.querySelector('.help-tab:focus, .help-body:focus')?.id;
    const helpTabsLeft = main.querySelector('.help-tabs')?.scrollLeft;
    main.innerHTML = '';
    if (state.screen === 'prologue' && G) renderPrologue(main);
    else if (state.screen === 'menu') renderMenu(main);
    else if (state.screen === 'start' || !G) renderStart(main);
    // 안 지은 건물의 탭도 **제 화면**을 편다 — 건설 화면은 건설 탭에만 선다 (§1 · ADR-0308)
    else ({
        // 키 순서 = 탭 바 순서 (TABS) — 읽는 사람이 화면과 대조할 수 있게 맞춰 둔다
        expedition: renderExpedition,
        explore: renderExplore,
        party: renderParty,
        character: renderCharacter,
        research: renderResearch,
        tavern: renderTavern,
        shop: renderShop,
        forge: renderForge,
        library: renderLibrary,
        resource: renderResource,
        colosseum: renderColosseum,
        arena: renderArena,
        codex: renderCodex,
        help: renderHelp,
        lab: renderLab,
    })[state.tab](main);
    bindSectionHelp(main);
    for (const n of main.querySelectorAll('[data-keep]')) if (kept.has(n.dataset.keep)) n.scrollTop = kept.get(n.dataset.keep);
    const helpTabs = main.querySelector('.help-tabs');
    if (helpTabs && helpTabsLeft !== undefined) helpTabs.scrollLeft = helpTabsLeft;
    if (helpFocus) {
        const input = main.querySelector('.help-search-input');
        if (input) { input.focus({ preventScroll: true }); input.setSelectionRange(helpFocus.start, helpFocus.end); }
    } else if (helpControl) {
        const control = document.getElementById(helpControl);
        if (control && !control.hidden && !control.disabled) control.focus({ preventScroll: true });
    }
    if (state.itemMenu && G) itemMenuPanel();   // 보관 칸 우클릭 메뉴 — 본문 뒤에 선다 (ADR-0451)
    renderModal();
    hideTip();
    tutorial.refresh();
    stopForgeSelection = mountForgeSelection();
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
    // 스킬 우선순위 — 「액티브 스킬」 소제목 오른쪽 끝 [우선순위]가 연다 · 줄을 끌어 순서를 바꾼다 (SCREEN_DESIGN §6 · ADR-0937). 대상 영웅은 캐릭터 탭이 이미 골랐다
    skillOrder: { title: 'ch.skill.orderH', body: skillOrderBody, cls: 'sk-order-modal' },
    /* 출정 — 스테이지를 누르면 뜨는 창 [2026-09-10 사용자 지시 · ADR-0084 · SCREEN_DESIGN §4-1].
       옛 접이식 전진 패널이 통째로 이 창이 됐다. `head` 를 주는 첫 창이다 — 제목이 i18n 키 하나가 아니라
       **고른 스테이지의 신원**(죄종 · Ch-스테이지 이름 · 레벨)이기 때문이다:
       접이식이 바로 위 행에 붙어 말하던 「어느 지역의 편성인가」를 창에서는 머리가 든다 */
    //   고른 칸이 사라지면 닫힌다(`gone`) — 다른 부대의 런이 바퀴를 넘어 `runBattle` 이 고른 칸을 걷는다(R354 · DEV_PLAN §4 #90)
    //   `vars` = 판에 거는 CSS 변수 — 고른 칸의 장 색 · 장소 그림(겉모양 `D2 Min` 의 머리 띠가 읽는다 · §10-5 · ADR-0902)
    depart: { head: departHead, body: departBody, cls: 'depart-box', vars: departVars, gone: () => !D.stages[state.expStage] },
    // 출정 확인 — 다른 일을 하던 영웅이 낀 편성을 [보내기] 했을 때만 뜬다 · [취소]는 출정 창으로 돌아간다 (SCREEN_DESIGN §4-1 · ADR-0467)
    //   **머리 줄이 없다**(`bare`) [2026-09-30 사용자 지시 「보내기 글자는 지워」 · 「x버튼삭제」] — 제목도 닫기 X 도 없이 문장과 버튼 둘만 선다 · 바깥 · `Esc` 는 닫는다
    departConfirm: { bare: true, body: departConfirmBody, gone: () => !D.stages[state.expStage] },
    // 멈춤 창 — 다른 탭이 세이브를 썼다 (SCREEN_DESIGN §2-1). `lock` 인 창은 닫는 길이 없다 — 이것 하나뿐인 의도된 예외다:
    //   닫을 수 있으면 멈춘 탭이 다시 저장해 다른 탭의 진행을 덮는다
    frozen: { title: 'cl.frozen.h', body: frozenBody, lock: true },
    // 자동 분해 — 인벤토리 도구 줄 [자동 분해] · 출정 창 자동 분해 칸 [바꾸기]가 연다 (SCREEN_DESIGN §6 · ADR-0717 · item_design §6-5)
    //   머리 = 「자동 분해 · Party I」(부대 하나의 규칙) · `cls` 는 머리 글씨를 줄인다(2026-09-21 사용자 지시) · 출정 창에서 열었으면 닫을 때 돌아간다(`modalBack`)
    autoSalvage: { head: autoSalvageHead, body: autoSalvageBody, cls: 'auto-modal' },
    // 도박장 — 선술집 의뢰 오른쪽 칸의 [입장]이 연다 (SCREEN_DESIGN §8-1 · ADR-0322) · 속은 3×3 슬롯(ADR-0331)
    gamble: { title: 'gb.h', body: gambleBody, cls: 'gb-modal' },
    // ~~가입 희망 창(`join`)~~ — 2026-10-19 걷었다: 수색 얼굴은 출처와 무관하게 선술집 셋째 칸을 그 영웅의 카드로 켠다 (ADR-0671)
    // ~~파견 관전(`dpWatch`)~~ — 2026-10-18 연구소에서 영웅 배치를 걷어 창째 없앴다 (ADR-0665)
    // 자원 미니게임 — 연구소 단의 [미니게임]이 연다 (SCREEN_DESIGN §8 · ADR-0532) · 머리 = 열린 단계마다 탭 · 열린 단계가 없으면 닫힌다(`gone`)
    mg: { head: mgHead, body: mgBody, cls: 'mg-modal', gone: () => !mgCur() },
    // 연구소 줄 등록 — 고른 칸의 등록 자리가 연다 (SCREEN_DESIGN §8 · ADR-0677) · 줄 = 고른 줄 · 그 줄이 닫혀 있으면 닫힌다(`gone`)
    labReg: { head: labRegHead, body: labRegBody, cls: 'lr-modal', gone: () => !G || !SYS.game.labState(G, now()).lines.find(l => l.line === labRegPost().id)?.open },
    // 친선전 — 콜로세움 레일의 [친선전]이 연다 · 팀 코드 글상자 둘(SCREEN_DESIGN §1 · ADR-0670) · 받은 팀이 서면 닫힌다
    arenaCode: { title: 'ar.code.h', body: arenaCodeBody, cls: 'ar-code-modal' },
    // 우편함 — 상단바 골드 오른쪽 편지봉투가 연다 (SCREEN_DESIGN §2 「상단바」 · ADR-0732 · R328)
    mail: { title: 'mail.h', body: mailBody, cls: 'mail-modal' },
};

function renderModal() {
    const layer = $('#modal');
    let m = MODALS[state.modal];
    // 속이 사라진 창은 닫는다 — 파견 관전 창의 앉은 자리가 전부 빈 경우 (ADR-0415)
    if (m?.gone?.()) { state.modal = null; m = null; }
    layer.hidden = !m;
    layer.innerHTML = '';
    if (!m) return;
    // `cls` — 판 크기를 창이 정한다(안 주면 내용 폭). 로그 창(.bw-box)이 같은 자리에서 쓰던 장치다
    const box = el('div', `modal-box${m.cls ? ` ${m.cls}` : ''}`);
    if (m.vars) for (const [k, v] of Object.entries(m.vars())) box.style.setProperty(k, v);
    const head = el('div', 'modal-head');
    // `head` 를 주면 제목 줄을 통째로 갈아 끼운다 — 안 주면 i18n 키 하나가 든다(창 대부분이 이쪽이다)
    const modalHints = { skill: 'skills', dismiss: 'dismiss', skillOrder: 'skill_order', frozen: 'frozen', gamble: 'gamble', arenaCode: 'team_code', mail: 'mail' };
    if (!m.bare) head.appendChild(m.head ? m.head() : helpHeading('h2', '', t(m.title), modalHints[state.modal] ?? 'help'));
    // 이름 하나뿐인 머리 = 패널 제목 크기 + 머리 아래 판 전폭 선 (§2 창 레이어 · ADR-0744) — 갈아 끼우는 머리는 제 규칙을 든다
    if (!m.head) head.classList.add('plain');
    // 닫기는 **정사각 X 하나**다 — 모든 창에 같은 모양·같은 자리 (2026-09-01 사용자 지시 · SCREEN_DESIGN §2).
    // 글리프는 언어를 안 타므로 `ui.close` 는 title 로 간다 — 문구가 사라진 게 아니라 자리를 옮겼다
    if (!m.lock && !m.bare) {
        const x = el('button', 'btn modal-x', '×');
        x.title = t('ui.close');
        x.setAttribute('aria-label', t('ui.close'));
        x.onclick = closeModal;
        head.appendChild(x);
    }
    if (!m.bare) box.appendChild(head);   // `bare` — 머리 줄째 없는 창(출정 확인 창 · ADR-0467)
    box.appendChild(m.body());
    bindSectionHelp(box);
    layer.appendChild(box);
    /* 판 **바깥**을 눌렀을 때만 닫는다 — 판 안의 클릭이 올라와도 닫히면 랭크 한 번 찍고 창이 사라진다.
       ⚠ **누른 자리와 뗀 자리가 둘 다 바깥**이어야 한다 [2026-09-10] — 클릭 하나만 보면 **판 안에서 시작한 드래그**가
       바깥에서 끝났을 때 창이 닫힌다(진형 드래그가 빗나가면 창째 사라졌다). 시작점을 기억해 두고 둘을 맞춰 본다 */
    let downOnLayer = false;
    layer.onpointerdown = e => { downOnLayer = e.target === layer; };
    layer.onclick = e => { if (e.target === layer && downOnLayer && !m.lock) closeModal(); };
}

// 창을 닫으면 자동 분해 창의 [지금 적용] 확인도 풀린다 — 닫았다 열면 처음부터 두 번 눌러야 한다 (ADR-0203)
//   `modalBack` = 닫으면 돌아갈 창 — 출정 창이 자동 분해 창을 열었을 때 출정 창으로 돌아온다 (ADR-0717) · 한 번 쓰면 비운다
const closeModal = () => { const back = state.modalBack ?? null; state.modalBack = null; state.modal = back; state.autoArm = false; render(); };
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

/**
 * `⚙` 판 설정 탭의 속 — 아트 스타일(초상 스타일이 둘 이상일 때만) · 스킬 이펙트 · 이펙트 그림체 · 이펙트 투명도 · 기본 공격 이펙트 · 피격 반응 · 피격 시 흔들림 · 공격 시 흔들림 · 로그 · 닉네임 · Focus(개발용 임시 — devcompare.js).
 * 누르면 **이 속만** 갈아 끼운다 — 연출은 사건마다 켜짐을 읽으므로 화면(도는 관전)은 그대로다. 값은 이 브라우저에만(`fx.js:setFxOn`)
 * 로그 방식은 문서 뿌리 속성 하나라 쌓인 줄까지 한꺼번에 바뀐다(`battle.js:setLogStyle`). 아트 스타일은 전체 렌더로 초상과 스테이지 배경을 함께 바꾼다.
 */
function settingsBody() {
    const box = el('div', 'set-box');
    if (G && state.screen === 'game') {
        const row = el('div', 'set-row');
        row.appendChild(el('span', 'set-k', t('tutorial.settings')));
        const replay = el('button', 'btn sm tutorial-replay', t('tutorial.replay'));
        replay.onclick = () => {
            writeTutorialSeen(tutorialOwner(), []);
            tutorial.reset();
            $('.dp-btn')?.click();
            tutorial.refresh();
        };
        row.appendChild(replay);
        box.appendChild(row);
    }
    // 고를 것이 있을 때만 선다 — 도감 고르개(`faceStylePicker`)와 같은 규칙 (ADR-0986)
    if (M.FACE_STYLES.length > 1) {
        const artRow = el('div', 'set-row');
        artRow.appendChild(el('span', 'set-k', t('set.artStyle')));
        artRow.appendChild(faceStyleButtons());
        box.appendChild(artRow);
    }
    // [Off] [On] 한 줄 — 스킬 이펙트 · 기본 공격 이펙트 · 피격 반응 · 공격 시 흔들림이 같은 틀이다 (`k` = fx.js:setFxOn 의 키)
    const onOffRow = (k, label, isOn) => {
        const row = el('div', 'set-row');
        row.appendChild(el('span', 'set-k', t(label)));
        row.appendChild(segmented([{ id: 'off', label: t('set.off') }, { id: 'on', label: t('set.on') }],
            isOn() ? 'on' : 'off', id => { setFxOn(k, id === 'on'); box.replaceWith(settingsBody()); }));
        box.appendChild(row);
    };
    onOffRow('skill', 'set.skillFx', skillFxOn);
    // 이펙트 그림체 — 관전의 스킬 이펙트 그림을 어느 그림체로 그리나(ADR-0561) · 스킬 이펙트가 꺼져 있으면 먹지 않으므로 흐려져 안 눌린다(값은 남는다)
    const artSet = el('div', 'set-row');
    artSet.appendChild(el('span', 'set-k', t('set.fxArt')));
    artSet.appendChild(segmented(ART_STYLES.map(s => ({ id: s, label: t(`ix.fxs.${s}`), disabled: !skillFxOn() })),
        fxArtStyle(), id => { setFxArtStyle(id); box.replaceWith(settingsBody()); }));
    box.appendChild(artSet);
    // 이펙트 투명도(%) [0] [25] [50] [75] — 스킬 조각만 옅게(ADR-0562) · 단위는 줄 이름이 든다(버튼이 한 줄에 서게) · 스킬 이펙트가 꺼져 있으면 흐린다(값은 남는다)
    const alphaSet = el('div', 'set-row');
    alphaSet.appendChild(el('span', 'set-k', t('set.fxAlpha')));
    alphaSet.appendChild(segmented(FX_ALPHA_STEPS.map(n => ({ id: n, label: String(n), disabled: !skillFxOn() })),
        fxTransparency(), id => { setFxTransparency(id); box.replaceWith(settingsBody()); }));
    box.appendChild(alphaSet);
    onOffRow('basic', 'set.basicFx', basicFxOn);   // 기본 공격 · 반격의 무기 모양 — 스킬 이펙트와 따로 (ADR-0501)
    onOffRow('hit', 'set.hitFx', hitFxOn);
    // 피격 시 흔들림 [0] [1] [2] [3](0 = 번쩍임만) —피격 반응이 꺼져 있으면 먹지 않으므로 흐려져 안 눌린다(값은 남는다 · ADR-0454)
    const row = el('div', 'set-row');
    row.appendChild(el('span', 'set-k', t('set.shake')));
    row.appendChild(segmented(SHAKE_LEVELS.map(n => ({ id: n, label: String(n), disabled: !hitFxOn() })),
        shakeLevel(), id => { setShakeLevel(id); box.replaceWith(settingsBody()); }));
    box.appendChild(row);
    // 공격 시 흔들림 — 때린 카드 튀어나감 · 피격 반응과 따로 켜고 끈다(흐리지 않는다 · ADR-0468)
    onOffRow('lunge', 'set.lunge', lungeFxOn);
    // 로그 [칸] [문장] — 관전 로그 한 줄을 네 칸 격자로 찍나 한 문장으로 찍나 (ADR-0459) · 이 줄의 버튼 글은 언어를 따른다
    const logSet = el('div', 'set-row');
    logSet.appendChild(el('span', 'set-k', t('set.log')));
    logSet.appendChild(segmented(LOG_STYLES.map(s => ({ id: s, label: t(s === 'grid' ? 'set.logGrid' : 'set.logText') })),
        logStyle(), id => { setLogStyle(id); box.replaceWith(settingsBody()); }));
    box.appendChild(logSet);
    // 닉네임 — 퍼널 페이지가 유저를 알아보는 이름 · 게임 안엔 안 찍힌다 · 이 브라우저에만 (§2-1 · §2-2 · ADR-0633).
    //   칸을 떠나거나 Enter 로 정한다 — 다시 그리지 않는다(다음 올리기가 가져간다)
    const nickRow = el('div', 'set-row');
    nickRow.appendChild(el('span', 'set-k', t('set.nick')));
    const nick = el('input', 'set-nick');
    nick.maxLength = NICK_MAX;
    nick.spellcheck = false;
    nick.value = loadTrack().nick;
    nick.onchange = () => {
        const rec = loadTrack();
        rec.nick = nick.value.trim().slice(0, NICK_MAX);
        writeTrack(rec);
        nick.value = rec.nick;
    };
    nick.onkeydown = e => { if (e.key === 'Enter') nick.blur(); };
    nickRow.appendChild(nick);
    box.appendChild(nickRow);
    mountFocusCompare(box);   // 임시 — 마지막 줄 Focus [Off | Stop | Dim] (devcompare.js · SCREEN_DESIGN §10-2) · Card [Before | After] 는 걷었다(ADR-0566)
    mountSkinCompare(box);    // 임시 — 맨 끝 줄 Skin [Now | D2 Min] (devcompare.js · SCREEN_DESIGN §10-5 · ADR-0791)
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
    writeTutorialSeen(tutorialOwner(), []);
    tutorial.reset();
    save();
    state.screen = prologue ? 'prologue' : 'game';
    state.proScene = 0;
    state.tab = 'expedition'; state.exp = 'idle'; state.confirmOverwrite = false; state.expStage = null;
    dropBattles();
    render();
}

/** 부대 핸들을 전부 놓는다 — 다른 세이브로 갈아타는 자리에서 부른다. 안 놓으면 앱 시계가 **새 판을 옛 런으로** 민다 (ADR-0316) */
function dropBattles() {
    if (stopBattle) { stopBattle(); stopBattle = null; }
    state.battles = {};
    state.battle = null;
}

/** 이어 하기 — 자동 저장을 연다. `saved` 를 주면 그 세이브로(⚙ Save 탭의 슬롯 · SCREEN_DESIGN §10-4) */
function continueGame(saved = loadSave()) {
    if (!saved) return false;
    try { G = SYS.game.deserialize(saved); }
    catch (e) { console.warn(e); G = null; return false; }
    // 반복 원정은 게임이 켜져 있는 동안만 — 꺼진 사이의 런은 마무리하고, 그것이 곧 귀환이라 전원 회복한다 (08-25 · 09-03)
    if (SYS.game.closeRun(G, now())) save();
    state.screen = 'game'; state.tab = 'expedition'; state.exp = 'idle'; state.expStage = null;
    dropBattles();
    return true;
}

/** 후보 한 장 — 이 카드가 곧 선택의 전부라 능력치 7종까지 다 편다.
 *  `fresh` = 새 게임의 시작 카드 — 세이브를 지우고 시작하는 자리라 지금 판(`G`)의 도감 보너스를 섞지 않는다 */
function candidateCard(h, extra = '', fresh = false) {
    const c = el('div', 'ng-card');
    c.style.borderTopColor = tierColor(h);
    const total = D.heroAttributes.reduce((a, s) => a + h.stats[s.id], 0);
    // 액티브 3칸 중 **고유 하나만** 싣는다 (§3) — 2·3번 칸은 직업이 정하므로 직업 줄이 이미 답한다.
    //   어느 칸이 고유인지는 인스턴스의 `source` 가 말한다 — 화면이 「1번 칸」이라고 판정하지 않는다
    const innate = activeCells(h).find(a => a?.source === 'innate') ?? null;
    // 최대 HP — **고용하면 캐릭터 탭에 설 값**이다(장비 없음 · 지금 판의 도감 보너스 포함 · `game.heroCombat`). 레벨 1 값이 직업마다 달라
    //   (`class.csv:hp_base` · 10-02) 공통값을 찍으면 첫 전투에서 반이 된다 (DEV_PLAN §4 #74). 시작 카드는 판이 없거나 지울 판이라 영웅 혼자의 값
    const hpMax = (fresh || !G ? SYS.hero.computeCombat(h, []) : SYS.game.heroCombat(G, h)).hp_max;
    // 죄종 칩은 그 죄종 색 · 직업 칩은 그 직업 색이다 (SCREEN_DESIGN §3 · ADR-0155 · ADR-0724) — 윗변 · 막대는 등급 색 그대로(ADR-0023)
    //   직업은 칩 줄 셋째(죄종 오른쪽)로 올라가고(ADR-0724) 레벨은 이름 오른쪽에 선다 (ADR-0727).
    //   이름 아래 줄은 그 직업의 무기군만 — 역할 이름(「근접 물리」)은 안 적는다 (ADR-0730)
    c.innerHTML = `
        <div class="ng-head">
            ${heroFace(h)}
            <div class="ng-id">
                <div class="ng-chips">${tierChip(h)}<span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>${clsChip(h.cls)}</div>
                <div class="ng-name"><b>${L(h.name)}</b><span class="ng-lv">Lv.${h.level}</span></div>
                <div class="ng-role muted">${classDef(h.cls) ? classWeapons(h.cls) : t('class.unassigned')}</div>
                ${innate ? `<div class="ng-skill">
                    <span class="ico">${skillImg(innate)}${skLvTag(innate)}</span>
                    <span class="txt"><b>${L(innate.name)}</b></span>
                </div>` : ''}
            </div>
        </div>
        <div class="attr-list">${attrRowsHtml(h.stats, tierColor(h))}</div>
        <div class="ng-line sep" data-stat="hp_max"><span>${t('st.maxhp')}</span><b>${hpMax.toLocaleString()}</b></div>
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
    // 능력치 줄 · 최대 HP 줄에 올리면 설명 카드 — 캐릭터 탭과 같은 줄 조립 · 같은 카드 (SCREEN_DESIGN §2 「능력치 설명 툴팁 규격」 · ADR-0581)
    bindStatTips(c);
    return c;
}

/** 카드 연장 칸 — **그 카드 영웅의** 직업 · 죄종을 한 줄씩, 어떤 역할을 하나 한 문장 (SCREEN_DESIGN §3 · ADR-0675 ·
 *  사용자 「각 카드 아래로 연장해서 기사 / 분노 이런식으로」 — 카드 밖 안내 띠(ADR-0642)를 대체). 새 게임 카드만 `candidateCard` 의
 *  꼬리 자리로 싣는다 — 선술집 · 수색 카드엔 없다.
 *  직업 = `class.csv:role_text` · 죄종 = `mock.js:SINS.line`. 카드 머리는 역할 이름(「근접 물리」)을 안 적는다 — 역할은 이 문장이 든다 (ADR-0730).
 *  이름은 **칩**이다 [2026-10-21 사용자 「전사 적에게 붙어 … 이게 뭐야」] — 맨 글자로 서면 이름이 문장의 주어로 붙어 읽혔다 */
function startLines(h) {
    const cls = classDef(h.cls);
    const row = (name, color, text) => `<span class="ng-tag"${color ? ` style="color:${color}"` : ''}>${name}</span><span class="ng-tx">${text}</span>`;
    return `<div class="ng-ext">${
        row(className(h.cls), classColor(h.cls), cls ? L(cls.roleText) || L(cls.role) : t('class.unassigned'))
        }${row(sinName(h.sin), sinColor(h.sin), L(M.SINS[h.sin]?.line) || '')}</div>`;
}

/** 메뉴 — 켜면 먼저 선다 · 새 게임이 위 · 불러오기가 아래 (SCREEN_DESIGN §3 · ADR-0641 · 사용자 「처음 시작 화면이 메뉴 느낌으로」).
 *  불러오기는 **열 수 있는 세이브가 있을 때만** 눌린다 — 없으면 흐리고, 못 여는 옛 세이브면 흐린 채 사유를 단다(판정은 `game.canLoad` · ADR-0303).
 *  세이브 요약(저장 시각 · 영웅 · 클리어 · 골드)은 불러오기 아래 — 옛 시작 화면의 이어하기 칸이 이리 왔다 */
/** 뒤로가기 화살표 — 촉 + 몸통 · 색은 버튼 글자색(currentColor)을 따른다 (자물쇠 `lockIcon` 과 같은 그리기) */
const backIcon = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">'
    + '<path d="M13 8H3.5M7.5 4L3.5 8l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function renderMenu(main) {
    const saved = loadSave();
    const live = !!saved && SYS.game.canLoad(saved);
    const wrap = el('div', 'mn-wrap');
    // 워드마크는 브랜드 칸의 것을 그대로 든다 — 화면이 게임 이름을 따로 안 갖는다
    wrap.appendChild(el('div', 'mn-logo', $('.brand').innerHTML));
    const nb = el('button', 'btn lg mn-btn', t('ng.h'));
    nb.onclick = () => { state.screen = 'start'; state.confirmOverwrite = false; render(); };
    const lb = el('button', 'btn lg mn-btn', t('mn.load'));
    lb.disabled = !live;
    lb.onclick = () => { if (continueGame()) render(); };
    wrap.append(nb, lb);
    if (saved) wrap.appendChild(el('div', `mn-save${live ? '' : ' down'}`, live
        ? `${t('ng.hasSave', { t: new Date(saved.savedAt).toLocaleString() })}<small>${t('ng.saveLine', {
            h: saved.heroes.length, c: saved.progress.cleared.length, g: saved.resources.gold.toLocaleString() })}</small>`
        : t('ng.oldSave', { v: saved.version })));
    main.appendChild(wrap);
}

function renderStart(main) {
    const wrap = el('div', 'ng-wrap');
    const saved = loadSave();
    // 열 수 있는 세이브인가 — 판정은 `deserialize` 가 한다(화면이 버전 숫자를 안 본다). v37 전 세이브는 못 연다 (INTERFACE §4 · ADR-0303)
    const live = !!saved && SYS.game.canLoad(saved);

    // 제목(「첫 파티」)은 걷었다 (ADR-0643 · 사용자 「거슬린다 · 아예 없애봐」) — 화면 이름은 상단바 crumb(「새 게임」)이 든다.
    //   키 `ng.title` 은 도움말 「새 게임」 절의 머리가 계속 쓴다
    const row = el('div', 'ng-row');
    for (const h of state.candidates) row.appendChild(candidateCard(h, startLines(h), true));
    // 능력치 범례 — 첫 카드 왼쪽 빈자리에 한 번 (SCREEN_DESIGN §3 · ADR-0943). 첫 카드 능력치 목록 안에 붙어
    //   그 높이를 일곱 등분하므로 줄마다 막대 줄과 같은 높이에 선다 — 좌표를 재지 않는다
    const firstAttrs = row.querySelector('.attr-list');
    if (firstAttrs) {
        const legend = el('div', 'ng-legend', `<div class="ng-lg-h">${t('ng.attrHead')}</div>` + D.heroAttributes.map(s =>
            `<div class="ng-lg-r"><b data-stat="${s.id}">${L(s)}</b><span data-stat="${s.id}">${t(`ng.attr.${s.id}`)}</span></div>`).join(''));
        headingHelp(legend.querySelector('.ng-lg-h'), () => t('hint.attributes'));
        firstAttrs.appendChild(legend);
        bindStatTips(legend);   // 범례 줄에 올려도 카드 줄과 같은 설명 카드 (§2 「능력치 설명 툴팁 규격」)
    }
    wrap.appendChild(row);

    const actions = el('div', 'ng-actions');
    const reroll = el('button', 'btn', t('ng.reroll'));
    reroll.onclick = () => { state.roll++; state.candidates = rollCandidates(); state.confirmOverwrite = false; render(); };
    // 열 수 있는 세이브가 있으면 두 번 눌러야 지운다 — 되돌릴 수 없는 행동은 한 번의 오클릭으로 일어나면 안 된다.
    //   열 수 없는 세이브만 있으면 한 번에 — 지워서 잃을 것이 없다 (SCREEN_DESIGN §3 · ADR-0303)
    const start = el('button', `btn lg ${live ? 'danger' : 'primary'}`,
        live ? t(state.confirmOverwrite ? 'ng.overwriteConfirm' : 'ng.overwrite') : t('ng.start'));
    start.onclick = () => {
        if (live && !state.confirmOverwrite) { state.confirmOverwrite = true; render(); return; }
        // 파티 확정 = 캐릭터 생성. 여기서만 프롤로그를 지난다 (§3-1) — 이어하기는 안 지난다
        startGame({ prologue: true });
    };
    // 뒤로가기 = 메뉴 — 화면 왼쪽 위 · 아이콘 + 글 (ADR-0643 · 사용자 지시). 새 게임을 잘못 눌렀으면 여기서 불러오기로 돌아간다.
    //   버튼 줄에서 뺐다 — 되돌릴 수 없는 [세이브를 지우고 시작] 옆에 서 있었다
    const back = el('button', 'ng-back', `${backIcon}<span>${t('ng.back')}</span>`);
    back.onclick = () => { state.screen = 'menu'; state.confirmOverwrite = false; render(); };
    main.appendChild(back);
    actions.appendChild(el('span', 'ng-count muted', t('ng.roll', { n: state.roll })));
    actions.appendChild(reroll);
    actions.appendChild(start);
    wrap.appendChild(actions);
    main.appendChild(wrap);
}

/* ═══════════ 플레이 기록 (SCREEN_DESIGN §2-1 · ADR-0633) ═══════════
   로그인이 없다. 배포 주소에서 켠 게임만 익명 계정으로 **진행 요약 + 세이브 사본**을 한 방향으로 올린다 — 받는 길은 없다(세이브의 주인은 이 브라우저다).
   개발 환경 · `?dev=` 주소는 안 올린다 — 개발자의 시험 플레이 · 헤드리스 검증이 퍼널(`dev/funnel.html`)을 더럽히지 않게.
   실패는 조용하다 — 게임은 그대로 돌고 다음 간격에 다시 올린다 */

// 올리는 간격 — 로컬은 바뀔 때마다지만 무료 한도는 **쓰기 횟수**라 모아서 올린다. 게임 수치가 아니라 저장소 사정이라 CSV 가 아니다 (ADR-0102 선례)
const TRACK_PUSH_MS = 60 * 1000;
// 닉네임 글자 수 상한 — 퍼널 페이지 표의 한 칸이다. 같은 이유로 CSV 가 아니다
const NICK_MAX = 16;
// 개발 환경은 안 올린다 — 판정은 개발 장치와 같은 `env.js:DEV_HOST` 하나 (ADR-0751)
const TRACK_ON = !DEV_HOST && !new URLSearchParams(location.search).has('dev');
// 이 탭이 마지막으로 올린 것(세이브 저장 시각 + 닉네임) — 같으면 안 올린다. 화면 상태가 아니라서 `state` 밖에 둔다
const track = { sent: null, busy: false };

/** 진행 요약 — 세이브에서 칸을 **고르기만** 한다. 칸의 뜻은 INTERFACE §4 「플레이 기록」 */
function trackSummary(local, rec) {
    const head = { nick: rec.nick, lang: lang(), sessions: rec.sessions, reach: rec.reach, started: !!local };
    if (!local) return head;
    return {
        ...head, version: local.version, createdAt: local.createdAt, savedAt: local.savedAt, expMs: local.expMs ?? 0,
        difficulty: local.difficulty, cleared: local.progress.cleared, clearedIn: local.progress.clearedIn ?? {},
        peakTotal: local.progress.peakTotal ?? 0, heroes: local.heroes.length,
        maxLevel: Math.max(0, ...local.heroes.map(h => h.level)), counters: local.counters,
    };
}

/** 노말 깬 칸마다 처음 본 순간의 원정 플레이 시간(`at`)을 적는다 — 적힌 칸은 안 바뀐다. 적은 것이 있으면 true */
function noteReach(local, rec, at) {
    let added = false;
    for (const id of local?.progress.cleared ?? []) if (!(id in rec.reach)) { rec.reach[id] = at; added = true; }
    return added;
}

/** 켤 때 — 켠 횟수를 하나 올린다. 이 브라우저의 첫 기록이면 이미 깬 칸은 「언제 깼는지 모름」(null)으로 둔다 —
 *  지금 시간을 적으면 퍼널의 걸린 시간이 거짓이 된다 */
function trackSession() {
    if (!TRACK_ON) return;
    const rec = loadTrack();
    if (rec.sessions === 0) noteReach(loadSave(), rec, null);
    rec.sessions++;
    writeTrack(rec);
}

/** 올리기 — 마지막으로 올린 뒤 세이브나 닉네임이 바뀌었을 때만 */
async function trackPush() {
    if (!TRACK_ON || frozen || track.busy) return;
    const local = loadSave();
    const rec = loadTrack();
    if (noteReach(local, rec, local?.expMs ?? 0)) writeTrack(rec);
    const sent = `${local?.savedAt ?? ''}|${rec.nick}`;
    if (sent === track.sent) return;
    track.busy = true;
    const r = await CLOUD.pushTrack(trackSummary(local, rec), local);
    track.busy = false;
    if (r.ok) track.sent = sent;
}

/** 다른 탭이 세이브를 썼다 — 이 탭은 저장 · 원정 시계 · 올리기를 멈추고 멈춤 창만 남긴다. 먼저 쓴 쪽이 남는다 (§2-1) */
function freeze() {
    if (frozen) return;
    frozen = true;
    if (stopBattle) { stopBattle(); stopBattle = null; }
    state.battle = null;
    state.battles = {};          // 부대 핸들도 전부 놓는다 — 이 탭은 더 이상 원정을 안 민다 (ADR-0316)
    if (state.exp === 'battle') state.exp = 'idle';
    state.modal = 'frozen';
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
function runBattle(stageId, { instant = false, tab = null, logf = null, dmgf = null, at = null, resume = null, preset = undefined, focus = true, defer = false, repeat = null, from = null, diff = undefined } = {}) {
    // preset — 나갈 편성 번호. 안 주면 **고른 편성**이고, 이어 달리기는 **도는 원정의 편성**을 넘긴다 (R122)
    // from — 이어 가는 런이면 **앞 런의 핸들**. 그 부대는 처음 나간 편성 그대로 나간다 — 그새 편성을 고쳐도 안 먹는다(철수하고 다시 보내야 먹는다 · 2026-09-29) ·
    //   **진 런의 재도전만** 고친 편성으로 나간다(로직이 가른다 · 지금 편성으로 못 나가면 굳힌 편성 · 2026-10-24)
    // focus — 이 런을 **보는 부대의 런으로 삼을까**. 안 보는 부대의 다음 런일 때만 false 다 (화면을 뺏지 않는다 · ADR-0316)
    // repeat — 출정 창의 반복 스위치(true/false). **창의 보내기로 나갈 때만** 넘긴다 — 이어 가는 런은 부대가 든 값 그대로다
    //   (로직이 같은 장소 동안 잇는다 · 2026-09-29 ADR-0432 — ~~고른 칸과 같은 스테이지면 창의 값을 옮긴다~~: 이어 가는 런이 고른 칸에 닿으면
    //   창을 마지막으로 열었던 값(다른 편성의 것일 수도 있다)이 덮어썼다)
    // diff — 이어 가는 런의 단(`game.nextRepeat` 의 답). 바퀴를 넘는 런이면 다음 단이다 — 안 주면 앞 런의 단 (2026-10-24 · R354)
    const was = G.difficulty;
    const r = instant ? SYS.game.resolveBattle(G, stageId, at ?? now(), preset) : SYS.game.departRun(G, stageId, at ?? now(), preset, from, diff);
    if (!r.ok) {
        // 도는 원정은 거절 사유가 아니다 — `departRun` 이 끊고 나간다 (R92). 거절이면 도는 원정도 그대로다
        // 이어 가는 런이 거절됐다 — 그 부대를 **멈춘다**(나가 있던 영웅이 풀린다). 서 있기만 하면 칸 사이에 붙잡힌 채 남는다 (2026-09-29).
        //   `stopped`(이미 철수 · 끊김 · 새 런이 섰다)면 멈출 것이 없다 — 철수가 `done` 으로 거절될 뿐이다
        if (from) {
            SYS.game.retreatRun(G, from, now()); save();
            if (r.err === 'stopped') { if (focus && !defer) render(); return; }   // 알릴 것이 없다 — 걷힌 재생기 자리만 다시 세운다
        }
        if (!focus) return;                 // 안 보는 부대의 다음 런이 거절됐다 — 보던 화면에 플래시를 얹지 않는다
        if (r.err === 'locked') flashStageLock(D.stages[stageId]);
        else flash({ noParty: 'exp.noParty', exploring: 'exp.departExploring', advancing: 'exp.departAdvancing', respawn: 'exp.departRespawn' }[r.err] ?? 'exp.cantDepart');
        if (defer) { clockRender = true; return; }   // 앱 시계가 낸 다음 런이 거절됐다 — 알리기만 하고 보던 화면은 그대로다 (ADR-0431)
        state.exp = 'idle';
        render(); return;
    }
    // 창의 반복 스위치를 이번 런에 옮긴다 — `departRun` 은 같은 장소를 돌던 부대의 값을 잇는다(v39). 창에서 보낸 출발만 창의 값으로 덮는다 (ADR-0432)
    const slot = runSlot(r.run?.preset ?? preset ?? G.preset);
    if (slot && repeat != null) slot.repeat = repeat === true;
    // 바퀴를 넘은 런이 고른 단을 밀었다 — 단 탭을 누른 것과 같이 보던 장을 걷는다(그 단의 다음에 갈 곳에 선다 · ADR-0586)
    if (G.difficulty !== was) { state.expChapter = null; state.expStage = null; }
    save();
    if (instant) { delete state.battles[r.run?.preset ?? preset ?? G.preset]; state.battle = null; toReport(r.run?.preset ?? preset ?? G.preset); render(); return; }
    // tab — 개발용 ?dev=play&bt=dmg: 우측 열의 판을 누적 데미지로 **골라** 헤드리스가 클릭 없이 닿게 한다(보이는 것은 `&lay=split` 일 때 · ADR-0130)
    // form — 진형을 **출발 순간에 찍는다** (2026-09-09). 관전 아레나가 이 값으로 파티 카드를 위아래로 민다
    // 옛 런의 재생기는 여기서 걷는다 — 두면 다음 render() 첫 줄이 **그 재생 위치를 새 런에 덮어써** 새 런이 옛 런이 끝난 시각부터
    //   재생됐다(2026-09-11 실측 — 앞 194초를 건너뛰었다 · ADR-0102). 이어 받을 것(배속 · 판)은 부르는 쪽이 `resume` 으로 넘긴다
    //   ⚠ 걷는 것은 **보는 부대로 옮겨 갈 때만**이다 — 안 보는 부대의 반복이 남의 재생기를 걷으면 보던 관전이 끊긴다 (ADR-0316)
    if (focus && stopBattle) { stopBattle(); stopBattle = null; }
    const no = r.run.preset;
    // 진형은 **그 부대가 굳힌 것**으로 찍는다 — 안 보는 부대의 반복이 고른 편성의 진형을 쓰면 아레나 줄이 남의 것이 된다 (ADR-0316) ·
    //   이어 가는 런은 처음 나간 편성의 자리 · 재도전은 새로 굳힌 자리다 — 어느 쪽이든 아레나 줄이 전투와 안 어긋난다 (2026-09-29 · 2026-10-24)
    const H = { run: r.run, result: r.run.result, stageId, form: formSnapshot(r.run),
        resume: resume ?? (tab || logf || dmgf ? { t: 0, speed: 1, running: true, tab, logf, dmgf } : undefined) };
    state.battles[no] = H;          // 부대마다 한 핸들 — 안 보는 부대도 앱 시계가 민다
    // 보는 부대의 런으로 삼는다. **화면을 관전으로 옮기는 것은 유저가 보낸 출발 · 떠 있는 띠의 세기뿐이다** — 앱 시계가 낸 다음 런(`defer`)은
    //   보던 화면을 안 뺏는다: 관전을 보고 있었으면 그대로 관전이 새 런이고, 리포트 · 스테이지를 보고 있었으면 남는다 (2026-09-29 · ADR-0431)
    if (focus) { state.battle = H; if (!defer) state.exp = 'battle'; }
    // defer — 앱 시계가 세운 다음 런(`tickBattle`)이다: 그리는 것은 다음 눈금 · 조작이 끝난 뒤 (ADR-0338). 유저가 보낸 런은 곧바로 그린다
    if (defer) clockRender = true;
    else render();
}

/** 보는 부대의 편성 번호 — 관전이 없으면 null */
const watchNo = () => state.battle?.run?.preset ?? null;
/**
 * 그 부대를 본다 [2026-09-24 · ADR-0316] — 재생기를 걷어 **보던 부대의 재생 위치를 받아 두고**(안 그러면 돌아왔을 때 처음부터 선다)
 * 관전을 그 핸들로 옮긴다. 핸들이 없는 칸은 세그먼트가 이미 막아 둔다
 */
function watchBattle(no) {
    const H = state.battles[no];
    if (!H) return;
    // 세던 세기(`auto`)는 **안 끈다** — 다음 런을 세던 부대를 두고 다른 부대로 옮겨 봐도 그 부대는 이어 간다(앱 시계가 세운다).
    //   ~~`auto: false`~~ 는 2026-09-29 걷었다 — 원정이 멈추지 않는데 바꿔 보기만으로 그 부대가 조용히 섰다 (ADR-0430)
    if (stopBattle) { const pos = stopBattle(); if (state.battle) state.battle.resume = pos; stopBattle = null; }
    state.battle = H;
    state.exp = 'battle';
    render();
}

/**
 * 원정 세그먼트 — 화면 전환(스테이지 / 관전 / 리포트). **상단바** crumb 오른쪽에 선다 [2026-09-11 사용자 지시 · ADR-0094 가 ADR-0016 을 대체].
 * **관전 칸은 부대 수의 끝(`balance.csv:concurrent_expedition_parties`)만큼 늘 선다** [2026-09-24 사용자 지시 · ADR-0316 · 2026-10-21 ADR-0691] — 아직 안 열린 부대(`limitsOf.expeditions` 너머)는 자물쇠 + 회색 · 이름만이다.
 *   칸 하나가 부대 하나(「Party I」 … — ko 에서도 영어 · 로마 숫자)이고
 *   글자는 부대 이름 · 상태는 색만 든다(없음 회색 · 도는 중 파랑 · 끝남 빨강 — ADR-0147). **부대가 하나뿐이어도 「Party I」 칸이다** [2026-09-25 사용자 지시 · ADR-0360].
 * `phase` 는 보통 재생 위치로 정한다(`battlePhase`) — 관전이 떠 있는 동안의 위치는 재생기가 들고 있어서, 끝나는 순간만 `onOver` 가 'over' 를 넘긴다.
 *   그 `phase` 는 **보는 부대의 것**이고 다른 칸은 제 핸들에서 읽는다.
 * **모든 탭에 선다** [2026-09-24 사용자 지시 · ADR-0353] — 채우는 것은 셸(`renderShell`)이다. 원정 탭 밖에서는 고른 칸이 없고 누르면 원정 탭의 그 관전으로 간다
 * **부대 칸만 선다** [2026-10-18 사용자 지시 · ADR-0661] — ~~Stages · Report 칸~~ 은 걷혔다: 스테이지는 원정 탭 버튼 · 리포트는 스테이지 화면 오른쪽 위의 [Report](`renderExpIdle`)
 */
function expNavBox(phase = battlePhase(state.battle)) {
    const n = SYS.game.limitsOf(G).expeditions;
    const watching = watchNo();
    const cells = Array.from({ length: D.balance.concurrent_expedition_parties }, (_, i) => {
        const no = i + 1, H = state.battles[no] ?? null;
        // 아직 안 열린 부대 — 자물쇠 + 회색 · 부대 이름만 · 안 눌린다(잠긴 챕터 칸과 같은 `seg-lock` · 무엇이 여는지는 안 적는다 · ADR-0691)
        if (no > n && !H) return { id: `battle${no}`, label: `<span class="lock-ico">${lockIcon(true)}</span>${t('exp.seg.party', { n: M.roman(no) })}`,
            disabled: true, cls: 'seg-party seg-none seg-lock' };
        // 원정이 있는 부대는 이름 뒤에 **그 부대가 있는 스테이지**를 단다(「Party I - 파멸의 진영 II」 · ADR-0517) — 안 나간 부대는 흰 글씨 「Party I - 대기 중」(`seg-idle` · ADR-0912).
        //   상단바가 모자라면 **스테이지 글자만** 줄여 「…」로 끝난다 — 부대 이름은 안 줄인다(style.css `.seg-where`)
        //   **도는 중의 색은 파랑이 아니라 그 스테이지의 챕터 죄종 색**이다 — 글자 · 고른 칸 테두리 전부(스테이지 목록 줄 · 출정 창과 같은 색 · ADR-0519) · 이름 앞에 ▶(`partyGo` · ADR-0689).
        //   **끝나도(져도) 그 색 그대로다** — 빨강으로 안 바뀐다(ADR-0522) · 없음 회색만 갈린다
        const at = H ? D.stages[H.stageId] : null;
        const ph = H && H === state.battle ? phase : battlePhase(H);
        //   **노말이 아닌 단을 도는 부대는 스테이지 앞에 난이도 이름**(`diffTag` — 같은 줄임 안에 든다 · ADR-0586)
        const label = at ? t('exp.seg.partyAt', { n: M.roman(no), where: `<span class="seg-where">${diffTag(runSlot(no)?.difficulty)}${L(stageName(at))}</span>` })
            : t('exp.seg.partyIdle', { n: M.roman(no) });
        return { id: `battle${no}`, label, disabled: !H, cls: `seg-party seg-${H ? ph : 'idle'}`,
            color: at ? sinColor(chapterOf(at.chapter)?.sin ?? 'wrath') : undefined };
    });
    // 고른 칸 — **원정 탭에서 관전을 볼 때만** 선다(밖에서는 보고 있는 원정 화면이 없다 · ADR-0353) · **보는 부대의** 칸이다
    const cur = state.tab === 'expedition' && expScreen() === 'battle' ? `battle${watching}` : null;
    const box = segmented(cells, cur, id => watchParty(Number(id.slice(6))));
    cells.forEach((c, i) => c.color && partyGo(box.children[i], c.color));
    return box;
}

/** 관전으로 가는 버튼 — 칸 모양은 세그먼트 칸 그대로(챕터 죄종 색 글자 · 얇은 테두리) · **이름 앞에 같은 색 ▶ 하나** [2026-10-21 사용자 지시 · SCREEN_DESIGN §4 · ADR-0689 가 0688 의 채운 모양을 대체].
 *  ▶ 가 「누르면 본다」를 든다(style.css `.party-go`) — 상단바 부대 칸과 스테이지 목록 줄의 ▶ 부대 버튼이 같이 쓴다 */
const partyGo = (b, color) => { b.classList.add('party-go'); b.style.color = color; return b; };

/** 그 부대의 관전으로 간다 — 상단바 부대 칸 · 스테이지 목록 줄의 ▶ 부대 버튼 (ADR-0353 · ADR-0688).
 *  다른 탭에서 눌렀으면 원정 탭으로 — 탭 버튼과 같이 분해함이 닫힌다 (ADR-0184 · ADR-0673) */
function watchParty(no) {
    if (state.tab !== 'expedition') { state.tab = 'expedition'; clearBagSel(); }
    if (no === watchNo()) { state.exp = 'battle'; render(); return; }   // 보던 부대 — 관전 그대로 (재생기를 걷지 않는다)
    watchBattle(no);
}

/** 원정 세 화면 중 **지금 설 수 있는 것** — 관전은 볼 핸들이 있을 때 · 리포트는 끝난 리포트가 있을 때 · 아니면 스테이지.
 *  셸의 세그먼트(고른 칸)와 `renderExpedition`(서는 화면)이 같은 답을 쓴다 — 셸이 먼저 그려도 둘이 안 어긋난다 (ADR-0353) */
const expScreen = () => (state.exp === 'battle' && state.battle ? 'battle' : state.exp === 'report' && doneReports().length ? 'report' : 'idle');

/* ═══════════ 결투장(`colosseum` · 층 사다리) · 콜로세움(`arena` · ELO) (SCREEN_DESIGN §1 · ADR-0670 · 이름 맞바꿈 ADR-0760) ═══════════
   두 탭은 뼈대가 같다 — 왼쪽 레일(상대의 출처 · 결과가 움직이는 것)만 다르고 오른쪽 판은 `arenaStage` 하나가 그린다 */

/** 콜로세움(`arena`) 화면 상태를 그 세이브의 처음으로 — 후보는 처음 그릴 때 굴린다 */
const arenaReset = A => Object.assign(A, {
    owner: G, match: null, last: null, unfold: false, cands: null, pick: 1, ghost: null, code: '', paste: '', problems: null, broken: false, fresh: false, toast: null,
});
/** 결투장(`colosseum`) 화면 상태를 그 세이브의 처음으로 — 고른 층은 다음 층부터 */
const colosseumReset = C => Object.assign(C, { owner: G, match: null, last: null, unfold: false, floor: null, opp: null, toast: null });
/** 고른 편성의 영웅 — 판 · 후보 이름 피하기가 같이 쓴다 */
const arenaPicked = () => SYS.game.partyOf(G).map(heroById).filter(Boolean);
/** 결과 한 단어 — 시간이 다 되면 무승부 (`arenaRecord` 의 outcome 어휘) */
const arenaOutcome = result => (result.reason === 'timeout' ? 'draw' : result.won ? 'win' : 'loss');
const ARENA_OUTCOME_KEY = { win: 'bt.won', draw: 'ar.draw', loss: 'bt.lost' };
/** 레이팅 변화 표기 — `+16` · `−8` · `±0` */
const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');
/** 콜로세움 상대 후보 셋을 새로 굴린다 — 내 레이팅 근처 · 이름은 고른 편성과 안 겹친다 · 가운데(비슷)가 골라진다 */
function arenaRollCands(A) {
    A.cands = SYS.arena.rollRatedCandidates(SYS.game.arenaState(G).rating, makeRng(crypto.getRandomValues(new Uint32Array(1))[0]), arenaPicked().map(h => h.name));
    A.pick = A.pick === 'ghost' && A.ghost ? 'ghost' : 1;
}

/** 팀 코드 ↔ 글상자 문자열 — UTF-8 JSON 을 base64 로 싼다. 운반 포장은 화면의 일이다(로직은 엔진 중립 JSON 까지 · INTERFACE §2-17) */
const encodeTeam = payload => {
    let s = '';
    for (const b of new TextEncoder().encode(JSON.stringify(payload))) s += String.fromCharCode(b);
    return btoa(s);
};
/** 못 풀면 null — 사유는 화면이 「코드를 읽을 수 없다」 한 줄로 낸다 */
const decodeTeam = text => {
    try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s+/g, '')), c => c.charCodeAt(0)))); } catch { return null; }
};

/** 결투 관전 — 두 탭이 같은 재생기를 쓴다. 돌아오는 버튼 · 제목 · 배경(싸운 순간 판의 배경 — `match.bg`)만 다르다 · 재생 위치는 `arenaWatching` 이 받아 둔다 */
function arenaWatchPage(main, A, title, backLabel) {
    const page = el('div', 'bt-page page arena-watch');
    main.appendChild(page);
    const all = [...A.match.team, ...A.match.opponent];
    const items = Object.fromEntries(all.flatMap(p => p.gear.map(it => [it.uid, it])));
    const back = () => { A.match = null; render(); };
    arenaWatching = A;
    /* 아레나 아래 = 원정 관전이라면 보관 줄이 설 자리 — 같은 높이로 **두 팀 누적 데미지 판**이 선다 [2026-10-24 사용자 지시 · ADR-0766 · ADR-0769].
       보관 줄 높이는 칸 상한 ÷ 3 열로 정해져 상수가 아니다 — 같은 줄을 안 보이고 안 눌리게 세워 높이만 빌리고, 판은 재생기가 그 위에 그린다(`teamPane` · style.css `.arena-floor`) */
    const floor = el('div', 'arena-floor');
    const ghost = itemsPanel(heroById(state.heroUid));
    ghost.setAttribute('aria-hidden', 'true');
    floor.appendChild(ghost);
    const stop = mountBattle(page, {
        result: A.match.result, heroes: A.match.team.map(p => p.hero), resume: A.match.resume,
        potionLocks: potionLocksOpt(),   // 물약 칸의 잠긴 자리 — 원정 관전과 같다 (§4-2 · ADR-0716)
        title, background: A.match.bg, roundRows: [{ round_num: 1, round_type: 'normal' }],
        form: { byUid: Object.fromEntries(A.match.team.map(p => [p.uid, p.rank])) },
        combatOf: h => all.find(p => p.uid === h.uid)?.combat,
        itemOf: uid => items[uid] ?? null,
        itemTipOf: (h, it) => tipCard(it, t('tip.equipped'), [], all.find(p => p.uid === h.uid)?.combat, { level: h.level }),
        resultLabel: backLabel, returnLabel: backLabel,
        layout: 'split', now, frozenMs: FROZEN_GAP_MS, onEnd: back, onRetreat: back, teamPane: floor,
        teamView: state.tdmView, onTeamView: v => { state.tdmView = v; },   // 두 팀 판의 보기 — 취향 (ADR-0772)
    });
    // 세우는 도중 결과가 끝나 돌아갔다(`back` 이 안에서 다시 그렸다) — 덮어쓰지 않고 옛 재생기만 걷는다 (원정 관전과 같다 · #91)
    if (!page.isConnected) { stop(); return; }
    stopArena = stop;
    page.appendChild(floor);   // 전투 판 아래 — 재생기가 그 안에 두 팀 판을 그렸다
}

/** 관전에서 돌아온 첫 그리기 — 결과를 미리 흘리지 않게 미뤄 둔 플래시를 여기서 띄운다 */
const arenaToast = A => { if (A.toast) { flash(A.toast.key, A.toast.params); A.toast = null; } };

/** 박스 — 머리(탭 그림 + 탭 이름) + 왼쪽 레일 | 오른쪽 판 · `art` = `icons/arena/` 의 장식 그림 — 탭 이름을 따른다(콜로세움 = `colosseum` 건물 · 결투장 = `duel` 칼) */
function arenaShell(main, titleKey, art, rail, stage) {
    const page = el('div', 'panel page arena-page');
    main.appendChild(page);
    page.appendChild(helpHeading('h2', 'arena-h', `${M.arenaArt(art, 'arena-h-ico')}${t(titleKey)}`, titleKey === 'nav.colosseum' ? 'colosseum' : 'arena'));
    const wrap = el('div', 'arena-wrap');
    wrap.append(rail, stage);
    page.appendChild(wrap);
}

function renderColosseum(main) {
    const C = state.colosseum;
    if (C.owner !== G) colosseumReset(C);
    if (C.match) { arenaWatchPage(main, C, t('nav.colosseum'), 'cs.back'); return; }
    arenaToast(C);
    const floors = SYS.arena.floors, cs = SYS.game.colosseumState(G), top = floors.length;
    // 고른 층 — 깬 층 · 다음 층만 고를 수 있다 · 처음엔 다음 층(다 깼으면 마지막 층)
    if (!(C.floor >= 1 && C.floor <= Math.min(cs.next, top))) C.floor = Math.min(cs.next, top);
    const F = floors.find(x => x.no === C.floor), tier = SYS.arena.tiers.find(x => x.id === F.tier);
    // 같은 층은 같은 팀이다 — 이름만 우리 팀을 피하므로 층 · 우리 이름이 같으면 굴린 팀을 다시 쓴다
    const names = arenaPicked().map(h => h.name);
    const key = `${F.no}|${JSON.stringify(names)}`;
    if (C.opp?.key !== key) C.opp = { key, team: SYS.arena.rollFloorOpponent(F.no, names) };
    const last = C.last;
    arenaShell(main, 'nav.colosseum', 'duel', colosseumRail(C, cs), arenaStage(C, {
        bg: M.duelBg(F.tier),   // 결투장 = 고른 층의 등급 그림 (ADR-0761)
        opponent: C.opp.team,
        from: t(F.gate ? 'cs.fromGate' : 'cs.from', { n: F.no, tier: L(tier.name) }),
        fightLabel: t('cs.fight'),
        onFight: result => {
            const outcome = arenaOutcome(result);
            const r = SYS.game.colosseumRecord(G, F.no, outcome === 'win');
            save();
            C.last = { outcome, sec: result.durationSec, opened: r.advanced && F.no < top ? F.no + 1 : null };
            if (r.advanced) {
                C.floor = Math.min(F.no + 1, top);
                if (F.gate) C.toast = { key: 'cs.emblem', params: { tier: L(tier.name) } };
            }
        },
        last: last ? t(last.opened ? 'cs.last.open' : 'cs.last', { result: t(ARENA_OUTCOME_KEY[last.outcome]), sec: last.sec, n: last.opened }) : null,
    }));
}

/**
 * 결투장 레일 — 사다리. 등급마다 한 줄 · **맨 위 = 가장 높은 등급**(올라가는 모양) · 줄 = 휘장 + 이름 · 레벨 대역 + 층 칸.
 * 층 칸: 깬 층 `clear`(채움) · 다음 층 `next`(강조) · 안 열린 층 `locked`(못 누름) · 승급전 `gate`(검투사 투구) · 고른 층 `on`.
 * 휘장은 그 등급의 승급전을 이겼을 때 제 색이고, 아니면 흐린 회색이다 (arena_design §7)
 */
function colosseumRail(C, cs) {
    const floors = SYS.arena.floors, top = floors.length;
    const rail = el('div', 'arena-rail cs-rail');
    rail.appendChild(el('div', 'cs-progress', cs.cleared >= top ? t('cs.progressDone', { total: top }) : t('cs.progress', { n: cs.cleared, total: top })));
    const ladder = el('div', 'cs-ladder');
    for (const tier of [...SYS.arena.tiers].reverse()) {
        const mine = floors.filter(x => x.tier === tier.id);
        const earned = cs.cleared >= mine.at(-1).no;
        const row = el('div', `cs-tier${earned ? ' earned' : ''}${mine.some(x => x.no === cs.next) ? ' current' : ''}`);
        row.appendChild(el('span', 'cs-emblem', M.arenaArt(tier.id)));
        const body = el('div', 'cs-tier-body');
        const lo = mine[0].kit.level, hi = mine.at(-1).kit.level;
        body.appendChild(el('div', 'cs-tier-name', `${L(tier.name)}<small>${lo === hi ? t('cs.lv1', { a: lo }) : t('cs.lv', { a: lo, b: hi })}</small>`));
        const steps = el('div', 'cs-floors');
        for (const x of mine) {
            const st = x.no <= cs.cleared ? 'clear' : x.no === cs.next ? 'next' : 'locked';
            const b = el('button', `cs-floor ${st}${x.gate ? ' gate' : ''}${x.no === C.floor ? ' on' : ''}`,
                `${x.gate ? M.arenaArt('gladiator') : ''}<b>${x.no}</b>`);
            b.disabled = st === 'locked';
            b.onclick = () => { if (C.floor !== x.no) { C.floor = x.no; render(); } };
            steps.appendChild(b);
        }
        body.appendChild(steps);
        row.appendChild(body);
        ladder.appendChild(row);
    }
    rail.appendChild(ladder);
    return rail;
}

function renderArena(main) {
    const A = state.arena;
    if (A.owner !== G) arenaReset(A);
    if (A.match) { arenaWatchPage(main, A, t('nav.arena'), 'ar.back'); return; }
    arenaToast(A);
    // 결투 뒤 돌아오면 후보를 새로 굴린다 — 같은 상대를 되풀이 고르지 않게 (ADR-0670)
    if (!A.cands || A.fresh) { arenaRollCands(A); A.fresh = false; }
    if (A.pick === 'ghost' && !A.ghost) A.pick = 1;
    const ghost = A.pick === 'ghost';
    const cand = ghost ? null : A.cands[A.pick] ?? null;
    const tierName = id => L(SYS.arena.tiers.find(x => x.id === id)?.name ?? { ko: id, en: id });
    const last = A.last;
    arenaShell(main, 'nav.arena', 'colosseum', arenaRail(A), arenaStage(A, {
        bg: M.COLOSSEUM_BG,
        opponent: ghost ? A.ghost : cand?.team ?? null,
        from: ghost ? t('ar.friendlyCard') : cand ? t('ar.from', { tier: tierName(cand.tier), rating: cand.rating }) : null,
        fightLabel: t('ar.fight'),
        onFight: result => {
            const outcome = arenaOutcome(result);
            // 친선전은 레이팅을 안 움직인다 · 랭크전은 **싸운 순간** 적는다 — 관전 중에 창을 닫아도 이미 적혔다 (arena_design §8)
            if (ghost) { A.last = { outcome, sec: result.durationSec, rated: false }; return; }
            const r = SYS.game.arenaRecord(G, cand.rating, outcome);
            save();
            A.last = { outcome, rated: true, after: r.after, delta: r.delta };
            A.fresh = true;
            A.toast = { key: 'ar.ratingFlash', params: { after: r.after, delta: signed(r.delta) } };
        },
        last: !last ? null : last.rated
            ? t('ar.last.rated', { result: t(ARENA_OUTCOME_KEY[last.outcome]), after: last.after, delta: signed(last.delta) })
            : t('ar.last', { result: t(ARENA_OUTCOME_KEY[last.outcome]), sec: last.sec }),
    }));
}

/**
 * 콜로세움 레일 — 리그 카드(휘장 · 리그 · 레이팅 · 다음 리그까지 막대 · 최고 · 전적) + 상대 후보 셋(± 레이팅) + [새 상대] · [친선전].
 * 후보 카드의 + / − 는 `arenaStakes` 그대로 — 고르기 전에 보여야 고르기가 판단이 된다 (arena_design §8)
 */
function arenaRail(A) {
    const s = SYS.game.arenaState(G), tiers = SYS.arena.tiers;
    const i = tiers.findIndex(x => x.id === SYS.arena.tierOfRating(s.rating)), T = tiers[i], N = tiers[i + 1];
    const rail = el('div', 'arena-rail ar-rail');
    const card = el('div', 'ar-league');
    card.appendChild(el('span', 'ar-league-ico', M.arenaArt(T.id)));
    const info = el('div', 'ar-league-info');
    info.appendChild(el('div', 'ar-league-name', L(T.name)));
    info.appendChild(el('div', 'ar-rating', `<b>${s.rating}</b><small>${t('ar.rating')}</small>`));
    // 막대 — 지금 리그 문턱에서 다음 문턱까지 어디쯤인가(마지막 리그면 가득 · 첫 문턱 아래면 빈 채)
    const pct = N ? Math.max(0, Math.min(1, (s.rating - T.ratingMin) / (N.ratingMin - T.ratingMin))) : 1;
    info.appendChild(el('div', 'ar-bar', `<i style="width:${(pct * 100).toFixed(1)}%"></i>`));
    info.appendChild(el('div', 'ar-next muted', N ? t('ar.toNext', { tier: L(N.name), n: N.ratingMin - s.rating }) : t('ar.topLeague')));
    card.appendChild(info);
    rail.appendChild(card);
    rail.appendChild(el('div', 'ar-record muted', `${t('ar.peak', { n: s.peak })} · ${t('ar.record', { w: s.win, d: s.draw, l: s.loss })}`));
    rail.appendChild(helpHeading('h3', 'sub-h ar-cands-h', t('ar.cands'), 'opponents'));
    const list = el('div', 'ar-cands');
    A.cands.forEach((c, k) => {
        const st = SYS.game.arenaStakes(G, c.rating);
        const b = el('button', `ar-cand${A.pick === k ? ' on' : ''}`,
            `${M.arenaArt(c.tier)}<span class="ar-cand-r"><b>${c.rating}</b><small>${t('ar.ai')}</small></span>`
            + `<span class="ar-cand-stake"><em class="up">${signed(st.win)}</em><em class="down">${signed(st.loss)}</em></span>`);
        b.onclick = () => { if (A.pick !== k) { A.pick = k; render(); } };
        list.appendChild(b);
    });
    if (A.ghost) {
        const b = el('button', `ar-cand ghost${A.pick === 'ghost' ? ' on' : ''}`,
            `${M.arenaArt('duel')}<span class="ar-cand-r"><b>${t('ar.friendly')}</b><small>${t('ar.ghostTeam')}</small></span><span class="ar-cand-stake muted">${t('ar.unrated')}</span>`);
        b.onclick = () => { if (A.pick !== 'ghost') { A.pick = 'ghost'; render(); } };
        list.appendChild(b);
    }
    rail.appendChild(list);
    const btns = el('div', 'ar-rail-btns');
    const fresh = el('button', 'btn sm', t('ar.newCands'));
    fresh.onclick = () => { arenaRollCands(A); render(); };
    const friendly = el('button', 'btn sm', t('ar.friendly'));
    friendly.onclick = () => openModal('arenaCode');
    btns.append(fresh, friendly);
    rail.appendChild(btns);
    // 리그 표 — 어느 문턱을 넘으면 무엇이 되는지가 늘 보인다(맨 위 = 가장 높은 리그 · 내 리그 강조 · 위 리그는 흐린 휘장)
    const lgs = el('div', 'ar-leagues');
    tiers.forEach((x, k) => lgs.prepend(el('div', `ar-lg${k === i ? ' on' : k > i ? ' above' : ''}`, `${M.arenaArt(x.id)}<span>${L(x.name)}</span><em>${x.ratingMin}</em>`)));
    rail.appendChild(lgs);
    return rail;
}

/**
 * 오른쪽 판 — 두 탭이 같다 (SCREEN_DESIGN §1 「판」 · ADR-0670 · ADR-0606 · 0497 · 0490).
 * @param o.opponent 선 상대(`snapshotTeam` 모양) · null 이면 점선 카드 · `o.from` = 고르개 줄 오른쪽 끝의 출처 글 · `o.fightLabel` ·
 *        `o.onFight(result)` = 결과를 적는 쪽(세이브 · 결과 줄) · `o.last` = 결과 줄 글
 */
function arenaStage(A, o) {
    const ps = SYS.game.presetState(G);
    const picked = arenaPicked();
    const f = formState(), ranks = f.byUid;
    const page = el('div', 'arena-main');
    const selection = el('div', 'arena-selection');
    // Party 버튼 = 우리 팀을 그 편성으로 바꾼다 — 아래 물약 · 전술이 위에서 아래로 다시 내려온다 (ADR-0497)
    selection.appendChild(presetSeg(ps, no => {
        if (no !== ps.activeNo) { SYS.game.selectPreset(G, no); save(); }
        A.unfold = true;
        render();
    }));
    selection.appendChild(helpHeading('h3', 'sub-h', t('ar.select', { n: picked.length }), 'team'));
    const edit = el('button', 'btn sm', t('ar.edit'));
    edit.onclick = () => { state.tab = 'party'; clearBagSel(); render(); };
    selection.appendChild(edit);
    if (picked.length !== SYS.arena.teamSize) selection.appendChild(el('span', 'muted', tLock('ar.needTeam', { n: SYS.arena.teamSize })));
    // 상대의 출처 — AI 는 AI 라고 적는다(사람인 척하지 않는다 · arena_design §7)
    if (o.from) selection.appendChild(el('span', 'arena-from', o.from));
    page.appendChild(selection);
    const opponent = o.opponent;
    /* 두 팀 = **관전 판 그대로** [2026-10-12 사용자 지시 · ADR-0606] — 위 상대 · VS · 아래 우리 팀, 카드도 관전 카드(`battle.js:unitPreview`).
       진형도 관전과 같다 — 후열만 VS 반대쪽으로 물러서고(칸의 `data-rank` · CSS `.side-*`) 가로 차례는 편성 보드와 같은 식(`formSeats`)이다.
       카드 값은 결투가 쓰는 스냅샷이다(도감 제외 · 고른 편성의 전술 — ADR-0495). 3명이 안 차면 스냅샷을 못 찍어 그 영웅의 지금 값으로 선다 */
    const snap = picked.length === SYS.arena.teamSize ? SYS.arena.snapshotTeam(picked, G.items, ranks, SYS.game.arenaLoadout(G)) : null;
    const all = [...(snap ?? []), ...(opponent ?? [])];
    const gear = Object.fromEntries((opponent ?? []).flatMap(p => p.gear.map(it => [it.uid, it])));
    const tips = {
        combatOf: h => all.find(p => p.uid === h.uid)?.combat ?? SYS.game.heroCombat(G, h),
        itemOf: uid => gear[uid] ?? itemOf(uid),
        itemTipOf: (h, it) => tipCard(it, t('tip.equipped'), [], tips.combatOf(h), { level: h.level }),
    };
    // 배경은 관전 판과 같은 한 장이다 — 싸우는 순간 결투에 실어 관전이 그대로 깐다(이긴 뒤 고른 층이 다음 등급으로 옮아도 관전 배경은 안 바뀐다 · ADR-0761)
    const board = el('div', 'arena arena-prep has-bg');
    board.style.backgroundImage = arenaBgImage(o.bg);
    const enemySide = el('div', 'side side-enemy');
    if (opponent) {
        const byRank = [];
        for (const p of opponent) (byRank[p.rank] ??= []).push(p);
        for (const { r, i } of formSeats(Array.from(byRank, m => m?.length ?? 0))) enemySide.appendChild(unitPreview(arenaUnit(byRank[r][i], 'enemy'), tips));
    } else enemySide.appendChild(arenaVacant('enemy', t('ar.noOpponent')));
    // 우리 팀은 고른 편성의 진형 칸 그대로라 빈자리도 제 칸에 선다
    const partySide = el('div', 'side side-party');
    for (const { r, i } of formSeats(f.caps)) {
        const uid = f.ranks[r][i], h = uid ? heroById(uid) : null;
        partySide.appendChild(h ? unitPreview(arenaUnit(snap?.find(p => p.uid === uid) ?? arenaSolo(h, r), 'party'), tips) : arenaVacant('party', t('ar.empty'), r));
    }
    board.append(enemySide, el('div', 'divider', '<span class="muted">VS</span>'), partySide);
    page.appendChild(board);
    page.appendChild(arenaLoadPanel(A.unfold));
    A.unfold = false;
    const controls = el('div', 'arena-actions');
    const fight = el('button', 'btn primary arena-fight', o.fightLabel);
    fight.disabled = !opponent || picked.length !== SYS.arena.teamSize;
    fight.onclick = () => {
        // 고른 뒤 장비 · 전술 · 물약을 바꿨을 수 있어 출전 순간 다시 찍는다. 상대는 확인한 그대로다.
        //   전술 · 물약은 고른 편성의 것이다 — 물약은 재고에서 채우지만 결투는 재고를 안 줄인다 (ADR-0495)
        const loadout = SYS.game.arenaLoadout(G);
        const team = SYS.arena.snapshotTeam(picked, G.items, ranks, loadout);
        const result = SYS.arena.fight(team, opponent, makeRng(crypto.getRandomValues(new Uint32Array(1))[0]), loadout);
        o.onFight(result);   // 결과는 관전 전에 적힌다 — 레이팅 · 오른 층 (arena_design §7 · §8)
        A.match = { team, opponent, result, resume: null, bg: o.bg };
        render();
    };
    controls.appendChild(fight);
    if (o.last) controls.appendChild(el('span', 'arena-last muted', o.last));
    page.appendChild(controls);
    return page;
}

/** 결투장 스냅샷 한 명(`arena.snapshotTeam`) → **관전 유닛 모양** (`battle.js:unitPreview` · ADR-0606).
 *  관전이 `result.party` 에서 읽는 자리를 스냅샷의 세부 능력치(`combat`)가 채운다 · 스킬 칸은 캐릭터 탭과 같은 레벨을 싣는다(`activeCells`) */
function arenaUnit(p, side) {
    const h = p.hero, cb = p.combat, hpMax = Math.round(cb.hp_max);
    return {
        side, hero: h, name: h.name, sin: h.sin, cls: h.cls, rank: p.rank,
        hp: hpMax, hpMax, period: cb.action_period, noBasic: cb.basic_attack === false,
        ...rangeCtx(cb), atkType: cb.attack_type, stats: h.stats, sheet: cb,
        skills: p.actives.map(a => ({ ...skillInfo(a.id), source: a.source, up: a.up ?? 0, lv: 1 + (a.up ?? 0) })),
    };
}

/** 3명이 안 찬 우리 팀의 한 명 — 스냅샷을 못 찍으니 그 영웅의 지금 값으로 같은 모양을 채운다(결투 시작은 어차피 잠겨 있다) */
const arenaSolo = (h, rank) => ({
    uid: h.uid, hero: h, rank, combat: SYS.game.heroCombat(G, h),
    actives: SYS.skill.activesFor(h, { skillPlus: SYS.item.skillPlusOf(SYS.game.heroItems(G, h)) }),
});

/** 비어 있는 자리 — 관전 카드와 같은 크기의 점선 카드 (우리 팀 빈자리 · 상대를 아직 안 찾음) */
function arenaVacant(side, text, rank = 0) {
    const cell = el('div', 'unit-slot v2');
    cell.dataset.rank = rank;
    cell.appendChild(el('div', `unit ${side} v2 vacant`,
        `<div class="unit-top"><span class="unit-ident"></span></div><div class="unit-body"><span class="muted">${text}</span></div>`));
    return cell;
}

/**
 * 우리 팀 카드 **아래에 늘 서는** 고른 편성의 **물약 → 파티 전술** [2026-10-03 사용자 지시 · ADR-0497 — ~~Party 버튼 아래 겹쳐 뜨는 판~~ ADR-0495].
 * **읽는 자리다** — 고치는 자리는 편성 탭이고, 둘 다 출정 창의 「들고 가는 것」과 같은 그림이다(`potionReadBlock` · `tacticReadBlock`).
 * 진형을 글로 적던 칸은 걷었다 — 위 카드 자리가 진형을 말한다 (ADR-0602)
 * @param unfold Party 버튼을 누른 직후 첫 그리기 — 칸마다 차례로 내려오는 연출을 단다
 */
function arenaLoadPanel(unfold) {
    const panel = el('div', `arena-load${unfold ? ' unfold' : ''}`);
    panel.appendChild(potionReadBlock(SYS.game.presetState(G)));
    panel.appendChild(tacticReadBlock('ar.noTactic'));
    return panel;
}

/**
 * 친선전 창 — 글상자 둘이 나란히 (ADR-0670 · 옛 온라인 갈래의 글상자 줄 ADR-0656). 왼쪽 = 내 팀 코드(고른 편성의 세 영웅 · `exportTeam` → 문자열) · 오른쪽 = 받은 코드(`importTeam` 이 검사한다).
 * 통과하면 창이 닫히고 받은 팀이 「친선전」 칸으로 골라진 채 판에 선다(레이팅 변동 없음).
 * 글상자에 친 글은 다시 그리지 않고 화면 상태에만 담는다(치는 동안 커서를 안 잃는다). ⚠ 서버가 없어 운반은 복사 · 붙여넣기다
 */
function arenaCodeBody() {
    const A = state.arena;
    const picked = arenaPicked(), ranks = formState().byUid;
    const row = el('div', 'arena-code');
    const mine = el('div', 'arena-code-box');
    mine.appendChild(helpHeading('h3', 'sub-h', t('ar.code.mine'), 'team_code'));
    const out = el('textarea', 'arena-code-text');
    out.readOnly = true;
    out.value = A.code;
    mine.appendChild(out);
    const mineBtns = el('div', 'arena-code-btns');
    const make = el('button', 'btn sm', t('ar.code.make'));
    make.disabled = picked.length !== SYS.arena.teamSize;
    make.onclick = () => { A.code = encodeTeam(SYS.arena.exportTeam(picked, G.items, ranks)); render(); };
    const copy = el('button', 'btn sm', t('ar.code.copy'));
    copy.disabled = !A.code;
    // 클립보드가 막힌 환경이면 글을 골라 둔다 — 손으로 복사한다
    copy.onclick = () => navigator.clipboard?.writeText(A.code).then(() => flash('ar.code.copied'), () => out.select()) ?? out.select();
    mineBtns.append(make, copy);
    mine.appendChild(mineBtns);

    const got = el('div', 'arena-code-box');
    got.appendChild(helpHeading('h3', 'sub-h', t('ar.code.paste'), 'team_code'));
    const inp = el('textarea', 'arena-code-text');
    inp.value = A.paste;
    inp.placeholder = t('ar.code.placeholder');
    inp.oninput = () => { A.paste = inp.value; };
    got.appendChild(inp);
    const gotBtns = el('div', 'arena-code-btns');
    const load = el('button', 'btn sm primary', t('ar.code.load'));
    load.onclick = () => {
        const payload = decodeTeam(A.paste);
        Object.assign(A, { problems: null, broken: false });
        if (!payload) A.broken = true;
        else {
            const r = SYS.arena.importTeam(payload);
            if (r.ok) { A.ghost = r.team; A.pick = 'ghost'; state.modal = null; }
            // 사유 줄의 이름은 검사를 통과한 줄에만 싣는다 — 걸린 코드의 문자열은 화면 HTML 에 안 넣는다(`text` 사유)
            //   같은 영웅의 같은 사유는 한 줄로 모은다(옵션 줄이 여럿 걸려도)
            else A.problems = [...new Map(r.problems.map(p => [`${p.hero ?? '-'}:${p.code}`, { code: p.code, hero: p.hero ?? null }])).values()];
        }
        render();
    };
    gotBtns.appendChild(load);
    got.appendChild(gotBtns);
    if (A.broken) got.appendChild(el('div', 'arena-bad', t('ar.code.broken')));
    if (A.problems) {
        const list = el('ul', 'arena-bad');
        for (const p of A.problems) list.appendChild(el('li', '', t('ar.bad.row', {
            who: p.hero === null ? t('ar.bad.team') : t('ar.bad.hero', { n: p.hero + 1 }), why: t(`ar.bad.${p.code}`),
        })));
        got.appendChild(list);
    }
    row.append(mine, got);
    return row;
}

function renderExpedition(main) {
    // 세 화면이 같은 자리를 쓴다 — 세그먼트는 셸이 이미 세웠다(모든 탭 · ADR-0353). 서는 화면은 셸의 고른 칸과 같은 답이다
    state.exp = expScreen();

    if (state.exp === 'battle') {
        const { result, stageId } = state.battle;
        /* 관전 화면 한 장 [2026-09-11 사용자 지시 · ADR-0095 · ADR-0097] — 전투 판 + 가방이 박스(`.page`) 세로를 채운다.
           두 배치 다 아레나가 남는 세로를 먹고 가방 아랫변이 박스 끝(탭 내비 「새 게임」 줄 아랫변)에 붙는다 (style.css `.bt-page`) */
        const page = el('div', 'bt-page page');
        main.appendChild(page);
        const stop = mountBattle(page, {
            result, stageId, heroes: G.heroes, resume: state.battle.resume,
            potionLocks: potionLocksOpt(),   // 물약 칸의 잠긴 자리 — 다 지은 칸 수 · 자물쇠 · 여는 건물 랭크 (§4-2 · ADR-0716)
            shrine: state.battle.run?.report?.shrine ?? null,   // 이 런이 입은 신단 — 독립 헤드용 폴백.
            // 스테이지 띠 — **그 런에 한 번**(핸들에 적는다 · 다시 그려도 안 뜬다) · 재생기는 런의 처음일 때만 띄운다 · 노말이 아닌 단은 이름을 단다 (§4-2 · ADR-0663)
            intro: state.battle.introShown ? null : { diff: introDiff(state.battle.run?.difficulty) },
            // 지속 버프 아이콘 — 신단 · 전술 · 도감 각각에 올리면 그 런의 현재 효과를 묻는다.
            buffsOf: () => SYS.game.runBuffs(G, state.battle?.run),
            // 다음 런 — 어디로(칸) · 언제. 결과 띠가 남은 초와 그 칸 이름을 센다. 출발은 세기가 아니라 이 답이 정한다 (ADR-0300 · ADR-0430) · 부대마다 따로 묻는다 (v38).
            //   원정은 멈추지 않는다 — 이기든 지든 답이 있고, 철수 · 끊김 뒤에만 null 이다 (v39 · PLAN_stage_segments D7)
            upNext: () => SYS.game.nextRepeat(G, state.battle?.endedAt ?? now(), state.battle?.run?.preset ?? G.preset),
            // 이 런의 단 — 다음 런이 바퀴를 넘어 단이 바뀌면 결과 띠가 칸 이름 앞에 그 단 이름을 단다(옛 핸들 = 첫 단 · §4-2 「결과 띠」 · ADR-0779)
            difficulty: state.battle.run?.difficulty ?? D.difficultyList[0]?.id,
            // 이 런의 칸 챕터보스가 돌아오는 시각 — 이겨서 끝났으면 쓰러진 보스 카드의 초상이 무덤 명패다 (SCREEN_DESIGN §4-2 「무덤 명패」 · ADR-0590)
            graveAt: () => { const r = state.battle?.run; return r ? SYS.game.bossRespawnAt(G, r.stageId, r.difficulty) : null; },
            // 영웅 세부 옵션의 바탕 = **그 런의 전투 능력치**(신단 · 출발 때 전술 — 전투가 쓰는 값) · 캐릭터 탭은 영웅이 가진 값만 (SCREEN_DESIGN §2 · ADR-0708)
            combatOf: h => SYS.game.runCombat(G, state.battle?.run, h), itemOf, itemTipOf: (h, it) => equippedItemTipCard(h, it),
            // 몬스터 툴팁의 장비 칸 — 영웅 · 캐릭터 탭과 같은 「착용 중」 카드다 (ADR-0183 · ADR-0312). 스킬 숫자는 그 몬스터의 표시값(`ctx` — 재생기가 싣는다).
            //   세이브 밖 개체(`round` 이벤트의 `gear`)라 uid 로 못 찾는다 — 개체를 그대로 받는다
            monsterItemTipOf: (item, ctx, level) => tipCard(item, t('tip.equipped'), [], ctx, { level }),   // 레벨당 옵션 합계 = 그 몬스터 레벨(ADR-0954)
            // 유닛 툴팁 — 현재 착용 장비 + 캐릭터 탭과 같은 세부 옵션 + Alt 장비 hover의 기존 「착용 중」 아이템 카드 (ADR-0171 · ADR-0182 · ADR-0183)
            // 장착 대상 — 영웅 카드를 누르면 그 영웅으로 바뀐다 [2026-09-15 사용자 지시 · SCREEN_DESIGN §4-2 · ADR-0137].
            //   아래 보관 칸의 장착 · 비교가 그 영웅을 향한다. 다시 그려도 재생은 resume 으로 이어진다(가방 칸 클릭과 같은 길)
            pickedUid: state.btNoPick ? null : state.heroUid, onPickHero: uid => { state.heroUid = uid; state.btNoPick = false; render(); },
            // 아레나 빈 곳 클릭 — 장착 대상을 비운다: 테두리가 걷히고 카드를 다시 누를 때까지 보관 칸이 아무도 안 향한다 (§4-2 · ADR-0849)
            onPickNone: () => { if (state.btNoPick) return; state.btNoPick = true; render(); },
            // 본 적 없는 레벨업 — 카드 신원의 `Lv` 가 반짝이고 그 글자를 누르면 걷힌다 (SCREEN_DESIGN §4-2 · ADR-0440)
            lvUnseen, onLvSeen: lvSee,
            // 진형 (⚠ 목업 · SCREEN_DESIGN §4-1) — 출발 순간에 찍은 스냅샷이다. 재생기는 이 값으로 **자리만** 민다
            form: state.battle.form,
            // 관전 배치 — 'wide'(아레나 전폭 · 로그 · 누적 없음) / 'split'(아레나 + 우측 딜미터 열 · ADR-0130).
            // 재생 위치(resume)가 아니라 **취향**이라 화면 상태가 든다 — 런이 바뀌어도 남고, 세이브에는 안 들어간다
            layout: state.btLayout, onLayout: v => { state.btLayout = v; },
            now, frozenMs: FROZEN_GAP_MS,   // 시각은 실제로 흐른 시간이 민다 · 문턱을 넘은 공백은 밀지 않는다 (ADR-0102)
            // 라운드 넘기기 — 재생기가 시각을 밀기 **전에** 부른다: 그 시각까지 끝난 라운드를 정산하고 다음 라운드를 붙인다 (R89)
            onTime: (tNow, speed) => advanceBattle(state.battle, tNow, now(), speed),
            // 박자 — 런 핸들의 것을 빌려 준다: 앱 시계와 한 벌이라 걷었다 다시 세워도 세움이 이어지고, 보든 안 보든 같은 빠르기다 (ADR-0654) ·
            //   `end` 에 닿은 실제 시각은 결과 띠가 다음 런을 세기 전에 받는다
            pace: paceOfRun(state.battle), onDone: at => noteEnded(state.battle, at),
            // 재생이 런의 끝에 닿았다 — 상단 세그먼트만 갈아 끼워 관전 칸을 「전투 종료」로 (ADR-0147). 재생기를 걷지 않는다 —
            //   다시 그리면 아레나 · 로그 · 결과 띠가 통째로 다시 선다(라운드 정산이 보관 칸만 갈아 끼우는 `refreshBattleBag` 와 같은 길)
            onOver: () => $('.tab-seg')?.replaceChildren(expNavBox('over')),
            // 철수 — 옛 「건너뛰기」 자리 (R89) · **원정을 멈추는 길**이다(나머지 하나는 게임 끄기 · PLAN_stage_segments D7).
            //   도는 런 = 진행 중이던 라운드를 버리고 끝낸다 · **끝나 다음 런을 세던 런 = 이어 가기만 끈다**(리포트는 그대로 · v39 · ADR-0430). 둘 다 리포트로 간다
            onRetreat: () => {
                const B = state.battle;
                if (stopBattle) { const pos = stopBattle(); if (B) B.resume = { ...pos, auto: false }; stopBattle = null; }
                if (B) {
                    const done = B.run.done;
                    noteEnded(B, now());   // 엔진은 끝났는데 박자가 마지막 세움에 서 있던 런 — 끝난 순간을 비워 두지 않는다(챕터보스 재등장 · ADR-0654)
                    SYS.game.retreatRun(G, B.run, now());   // 끝난 런이 이어 가는 중이 아니면(이미 멈췄다) 거절될 뿐이다 — 리포트로 가는 것은 같다
                    if (samePlace(runSlot(B.run.preset)?.stageId, state.expStage)) state.expRepeat = false;   // 철수는 반복도 끈다 — 출정 창의 버튼과 어긋나지 않게
                    if (!done) {
                        delete state.battles[B.run.preset];   // **그 부대만** 놓는다 — 다른 부대는 그대로 돈다 (ADR-0316)
                        state.battle = null;       // 버린 라운드는 다시 볼 것이 없다 · 끝난 런은 결과 띠째 관전에 남는다 (ADR-0140)
                    }
                }
                save(); toReport(B?.run.preset); render();
            },
            onEnd: (auto, skip = false) => {
                // 재생기를 먼저 걷는다 — 이어지는 런은 배속 · 판을 잇고 시각만 0 에서 시작한다 (§4 · ADR-0102)
                const pos = stopBattle ? stopBattle() : state.battle?.resume;
                stopBattle = null;
                // 다음 출발은 `game.nextRepeat` 가 정한다 — 어디로(다음 칸 · 같은 칸) · 끝난 순간 + [balance.csv:repeat_restart_sec] (ADR-0300 · ADR-0430). 세기가 끝나 부른 것(`auto`)일 때만 나간다
                const nx = auto ? SYS.game.nextRepeat(G, state.battle?.endedAt ?? now(), state.battle?.run?.preset ?? G.preset) : null;
                // `skip` = 결과 띠의 [건너뛰기] — 같은 답을 **지금** 내보낸다(출발 시각만 앞당긴다 · SCREEN_DESIGN §4-2 · ADR-0453)
                const at = nx && skip ? Math.min(nx.at, now()) : nx?.at;
                // 챕터보스가 죽어 있는 동안의 [건너뛰기]는 아무것도 안 한다 — 당겨 보내면 출발이 `respawn` 으로 거절돼 그 부대가 멈춘다.
                //   띠가 버튼을 안 세우지만(SCREEN_DESIGN §4-2) 눌린 채 들어오면 세기를 이어 간다 (R240)
                if (nx && at < (nx.respawn ?? -Infinity)) { if (state.battle) state.battle.resume = { ...pos }; save(); render(); return; }
                if (nx) runBattle(nx.stageId, { at, resume: { ...pos, t: 0, wall: at, auto: false }, preset: nx.preset, from: state.battle?.run, diff: nx.difficulty });   // 처음 나간 편성 그대로 · 진 런의 재도전은 고친 편성 (2026-09-29 · 2026-10-24)
                // [리포트 보기](`auto` 가 아니다) — 리포트로 가되 **세기는 안 끊는다**: 세던 것(`pos.auto`)을 앱 시계가 이어 세운다.
                //   멈추는 길은 철수 · 게임 끄기뿐이다 (2026-09-29 · ADR-0430 — ~~[리포트 보기]가 세기를 끊었다~~)
                else {
                    if (state.battle) state.battle.resume = { ...pos };
                    save();
                    if (!auto) toReport(state.battle?.run?.preset);
                    render();
                }
            },
            // ~~onNext [다음 스테이지](ADR-0141) · onRetry [다시 도전](ADR-0138 · ADR-0212)~~ 은 2026-09-29 삭제 — 원정이 멈추지 않아
            //   이긴 런은 다음 칸 · 진 런은 같은 칸으로 저절로 이어진다 (SCREEN_DESIGN §4-2 · ADR-0430)
        });
        // 세우는 도중에 판이 갈렸다 — 결과 띠가 이미 다 센 런을 되살리면 띠가 곧바로 다음 런을 내보내고(`onEnd`) 그 안에서 다시 그린다.
        //   안쪽 그리기가 새 판 · 새 재생기를 세웠으니 바깥은 덮어쓰지 않고 옛 재생기만 걷는다 — 덮으면 보이는 재생기가 고아가 되고
        //   다음 런이 옛 재생 위치(멈춤)를 이어받아 멈춘 채 섰다 · 보관 칸도 떨어진 판에 붙었다 (DEV_PLAN §4 #91)
        if (!page.isConnected) { stop(); return; }
        stopBattle = stop;
        state.battle.introShown = true;
        // 아레나 아래 가방 — 접속 중 = 원정 전투 + 아이템 정리 (GAME_DESIGN §3). 라운드를 이길 때마다 드롭이 들어오고(`refreshBattleBag`)
        //   여기서 바꾼 장비는 보스전에서도 **그 순간** 먹는다. 칸 · 그림 크기는 캐릭터 탭 가방과 같다 (`.bag` · ADR-0097)
        //   인벤토리는 **보는 부대의 것**으로 연다 — 관전에 들어오거나 보는 부대가 바뀔 때만 부대 버튼을 그 부대로 옮긴다.
        //   보는 동안 버튼으로 고른 것은 다시 그려도 그대로다 (§4-2 · ADR-0521)
        const wn = watchNo() ?? 0;
        if (wn && wn !== invWatchPrev) state.invNo = wn;
        state.invWatch = wn;
        battleBag = itemsPanel(bagHero());
        page.appendChild(battleBag);
        return;
    }
    if (state.exp === 'report') return renderExpReport(main);
    renderExpIdle(main);
}

/** 파티에 넣고 뺀다 — 편성 탭 영웅 띠의 클릭 (2026-08-27, 옛 파티·벤치 행을 띠가 대신한다) · **고른 편성**에 작용한다 · 오류는 `pt.err.<코드>` (§15 · R122) */
const toggleParty = h => {
    const r = SYS.game.toggleParty(G, h.uid, now());
    if (!r.ok) flash(`pt.err.${r.err}`);
    else save();
    render();
};

/** 재접속 알림 — 원정은 게임이 켜져 있는 동안만 돈다. 꺼지면 도는 부대 · 다음 런을 기다리던 부대가 멈추고(v39) 결과는 마지막 리포트에 있다 */
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
    if (rb) rb.onclick = () => { SYS.game.dismissNotice(G); save(); toReport(null); render(); };
    box.querySelector('.b-ok').onclick = () => { SYS.game.dismissNotice(G); save(); render(); };
    return box;
}

/** 원정에서 볼 챕터 — 고른 것이 있으면 그것, 없으면 **다음에 갈 곳**(해금됐고 안 깬 첫 스테이지)의 챕터.
 *  그것도 없으면(전부 깼다) **마지막 해금 챕터**다. 탭을 열면 지금 하는 자리에 선다 (ADR-0067) */
function expChapter() {
    const ids = D.chapterList.map(c => c.id);
    if (ids.includes(state.expChapter)) return state.expChapter;
    // 해금 · 깬 기록은 **고른 난이도의 것** — 단을 바꾸면 그 단의 다음에 갈 곳에 선다 (ADR-0586)
    const unlocked = D.stageList.filter(s => SYS.game.stageUnlocked(G, s.stage_id));
    const next = unlocked.find(s => !SYS.game.stageCleared(G, s.stage_id));
    return (next ?? unlocked[unlocked.length - 1])?.chapter ?? ids[0];
}

/** 고른 난이도 단 — 안 열린 단을 든 세이브면 첫 단이다(`game.difficultyState`) · 목록 · 출정 창의 칸 레벨이 이 단을 읽는다 (ADR-0586) */
const curDiff = () => SYS.game.difficultyState(G).cur;
/** 칸 레벨 — **고른 단의** 몬스터 레벨(`game.stageLevel` · 노말은 `stage.csv:dlvl`) */
const stageLv = z => SYS.game.stageLevel(z.stage_id, curDiff());
/** 난이도 이름 조각 — **첫 단(노말)이면 빈 글자**다 · 부대 칸 · 리포트 머리의 스테이지 앞에 선다(옛 리포트 = 단 없음 = 노말 · ADR-0586) */
const diffTag = id => (id && id !== D.difficultyList[0]?.id && D.difficulties[id] ? `<span class="diff-tag">${L(D.difficulties[id].name)}</span> ` : '');
/** 스테이지 띠의 난이도 이름 — 노말이 아닌 단만(노말은 null · `diffTag` 와 같은 규칙 · §4-2 · ADR-0663) */
const introDiff = id => (id && id !== D.difficultyList[0]?.id && D.difficulties[id] ? L(D.difficulties[id].name) : null);

/** 잠긴 장의 한 줄 — 「1장 보스 클리어」(그 장을 여는 앞 장 보스 · `game.chapterGate`) · 여는 칸이 없는 장(`chapter_open_max` 뒤)은 「준비 중」
 *  (SCREEN_DESIGN §4-1 · §8-4 · ADR-0719 — 장은 앞 장 보스를 깨면 저절로 열린다 · R319) */
const chapterNeedArgs = ch => { const g = SYS.game.chapterGate(ch); return g ? ['exp.chNeed', { ch: D.stages[g].chapter }] : ['cn.pending', {}]; };
const chapterNeedText = ch => t(...chapterNeedArgs(ch));
const flashChapterNeed = ch => flash(...chapterNeedArgs(ch));
/** 잠긴 스테이지가 왜 잠겼나 — 그 장이 안 열렸으면 「1장 보스 클리어」 · 장은 열렸으면 「이전 스테이지 클리어」 */
const stageLockText = z => (SYS.game.chapterOpen(G, z.chapter) ? t('exp.locked') : chapterNeedText(z.chapter));
const flashStageLock = z => (SYS.game.chapterOpen(G, z.chapter) ? flash('exp.locked') : flashChapterNeed(z.chapter));
/** 부서진 글자 — 한 자씩 `<i>` 로 감싼다 · 끝 글자들이 무너지는 모양은 CSS(`.seg-crumble`)와 필터(`index.html #fx-crumble`)가 든다 (§4-1 · ADR-0739) */
const crumbleLabel = s => `<span class="crumble">${[...s].map(c => `<i>${c}</i>`).join('')}</span>`;

function renderExpIdle(main) {
    // 재접속 알림은 **맨 위에 떠서** 선다 — 높이 0 의 자리에 넣어 난이도 줄 · 목록을 안 민다 (§4-1 · ADR-0881)
    const nb = noticeBanner();
    if (nb) main.appendChild(el('div', 'notice-float')).appendChild(nb);

    /* ⚠ **영웅 띠는 여기 없다** [2026-09-10 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0085 가 ADR-0055 를 대체].
       원정에서 로스터가 서는 자리는 **출정 창 안** 하나다(`departBody`). 탭 최상단에 두던 판을 걷은 이유는
       거기서 **아무 결정도 안 끝나기 때문**이다 — 갈 곳이 안 정해진 편성은 결정이 아니고, 창이 그 둘(누구를 · 어디로)을
       한 판에서 받는다. 걷힌 만큼 이 화면은 **스테이지 목록 하나**가 된다 — 「어디를 갈지 먼저」(2026-08-27)의 원형이다.
       ⚠ 관전·리포트에 안 세우던 옛 규칙은 그대로다 — 그 둘은 전투 화면만 본다.
       스테이지 — **고른 챕터 하나**만 (ADR-0067). 그 안의 잠긴 스테이지도 그린다 */
    // 제목 줄이 없다 [2026-09-11 사용자 지시 · ADR-0094] — 화면 전환은 상단바로 올라갔고, 「원정 지역」은 crumb · 챕터 줄 · 행이 이미 말한다.
    // 패널 윗변에 난이도 탭이 붙고 · 패널의 첫 줄이 챕터 세그먼트다 (ADR-0596 · `exp.zones.h` 는 도움말이 계속 부른다)
    const zp = el('div', 'panel');
    /* 챕터 세그먼트 — **한 챕터가 한 화면**이다 [2026-09-09 사용자 지시 · ADR-0067 · 도감 몬스터 세그먼트와 같은 문법(§9)].
       **전 챕터가 선다**(숨기지 않는다) — 단 **고른 단에서 칸이 하나도 안 열린 장은 꺼진 버튼**이다 [2026-10-23 사용자 지시 · ADR-0740 이 ADR-0067 의 「잠긴 챕터도 눌러 본다」를 대체].
       판정은 `stageUnlocked`(고른 단) 하나라 노말 · 나이트메어(그 단의 앞 장 보스) · 헬(열린 장마다 첫 칸) · 관리자 모드가 한 줄로 맞는다.
       넘기면 **전진 패널을 닫는다** — 패널은 스테이지 행에 딸려 있어서, 안 닫으면 영웅 띠만 흐린 채 보드가 사라진다.
       꺼진 모양은 둘 — 열릴 장은 자물쇠(ADR-0531 · 기준 ADR-0719) · **그 장을 여는 보스 칸이 없는 장**(`chapterGate(n)` 이 null — `chapter_open_max` 뒤의 장)은
       자물쇠 없이 **글자가 부서져 흩어진다** [2026-10-23 사용자 지시 · ADR-0739 · `crumbleLabel`]. 번호를 박지 않고 `chapter_open_max` 를 읽으므로 그 값을 올리면 저절로 풀린다.
       관리자 모드(`openAll`)도 그 장을 못 열어서 **켜 둬도 부서진 채다** [2026-10-09 사용자 지시 · ADR-0552] */
    /* 난이도 탭 — **패널 윗변에 붙은 폴더 탭 · 챕터 줄 위** [2026-10-12 사용자 「버튼 UI가 구리다」 · SCREEN_DESIGN §4-1 · ADR-0596 이 ADR-0586 의 세그먼트 줄을 대체].
       고른 단이 목록 · 출정 창 · 보내기를 전부 정한다(잠김 · 칸 레벨 · 나가는 단 — `game.stageUnlocked` · `canDepart` · `departRun` 의 기본값이 고른 단이다).
       **패널의 윗선은 이 줄이 긋는다** — 틈(`.dt-gap`) · 남은 자리(`.dt-fill`) · 안 고른 탭의 아랫변이 한 선을 잇고 고른 탭 자리에서만 끊겨 탭 안과 패널 안이 이어진다
       (패널은 `.diff-panel` — 테두리가 없다 · ADR-0785 · 둘 사이에 다른 것을 끼우면 이음이 끊긴다). 안 열린 단은 자물쇠 + 꺼진 탭이고,
       **다음에 열릴 단 하나의 조건**이 탭 바로 옆 글자로 선다 — 꺼진 버튼은 툴팁을 안정적으로 못 받는다(ADR-0531). 바꾸면 고른 챕터 · 칸이 풀린다 · 고른 탭은 클릭이 없다 */
    const ds = SYS.game.difficultyState(G);
    const tabs = el('div', 'diff-tabs');
    tabs.appendChild(el('span', 'dt-gap'));
    ds.list.forEach((d, i) => {
        if (i) tabs.appendChild(el('span', 'dt-gap'));
        const on = d.id === ds.cur;
        const b = el('button', `diff-tab${on ? ' on' : ''}${d.open ? '' : ' locked'}`,
            `<span>${d.open ? '' : `<span class="lock-ico">${lockIcon(true)}</span>`}${L(D.difficulties[d.id].name)}</span>`);
        if (!d.open) b.disabled = true;
        else if (!on) b.onclick = () => {
            if (!SYS.game.selectDifficulty(G, d.id).ok) return;
            save(); state.expChapter = null; state.expStage = null; render();
        };
        tabs.appendChild(b);
    });
    const fill = el('span', 'dt-fill');
    const shut = ds.list.find(d => !d.open);
    if (shut?.gate) {
        const need = el('span', 'zone-lock');
        need.innerHTML = `<span class="lock-ico">${lockIcon(true)}</span>${t('exp.diff.need', { d: L(D.difficulties[shut.gate.from].name), ch: D.stages[shut.gate.stageId].chapter })}`;
        fill.appendChild(need);
    }
    // [Report] — 스테이지 화면 오른쪽 위 · 난이도 탭 줄 끝 [2026-10-18 사용자 지시 · §4-1 · ADR-0661] — 상단바에서 옮겨 왔다.
    //   끝난 리포트가 없으면 꺼진 채 자리를 잡는다 · 고른 부대 탭 · 줄은 그대로 연다
    const rep = el('button', 'btn sm dt-report', t('exp.seg.report'));
    if (!doneReports().length) rep.disabled = true;
    else rep.onclick = () => { state.exp = 'report'; render(); };
    fill.appendChild(rep);
    tabs.appendChild(fill);
    main.appendChild(tabs);
    zp.classList.add('diff-panel');
    const curCh = expChapter();
    // 고른 장의 죄종 색 — 겉모양(`D2 Min`)이 목록 판 · 챕터 탭 · 장소 줄에 장 색을 입힐 때 읽는다(`Now` 는 안 읽는다 · §10-5 · ADR-0902)
    zp.style.setProperty('--ch', sinColor(chapterOf(curCh)?.sin ?? 'wrath'));
    const cb = el('div', 'sub-bar');
    // 잠김 = 고른 단에서 그 장의 칸이 하나도 안 열렸다(ADR-0740) · 그중 여는 칸이 없는 장(`chapterGate` null)은 자물쇠 대신 부서진 글자다(ADR-0739)
    const chShut = id => !D.stageList.some(s => s.chapter === id && SYS.game.stageUnlocked(G, s.stage_id));
    cb.appendChild(segmented(D.chapterList.map(c => {
        const label = `Ch${c.id} ${L(c.name)}`;
        if (!chShut(c.id)) return { id: c.id, label, color: sinColor(c.sin) };
        return SYS.game.chapterGate(c.id)
            ? { id: c.id, label: `<span class="lock-ico">${lockIcon(true)}</span>${label}`, color: sinColor(c.sin), disabled: true, cls: 'seg-lock' }
            : { id: c.id, label: crumbleLabel(label), color: sinColor(c.sin), disabled: true, cls: 'seg-crumble' };
    }), curCh,
        id => { state.expChapter = id; state.expStage = null; render(); }));
    zp.appendChild(cb);
    /* **장소 한 줄 = 버튼 하나** [2026-09-29 사용자 지시 「원정 스테이지는 기존처럼 1-1 1개만 클릭할 수 있게하고 안에서 조정할 수 있게」 ·
       SCREEN_DESIGN §4-1 · ADR-0436 — 같은 날의 칸 버튼 셋(ADR-0429)을 걷었다]. 스테이지는 장소 × 칸(I · II · III)이고,
       목록은 **장소**를 고르고 **칸은 출정 창의 출발 칸 버튼**(`cellRow`)이 고른다. 잠긴 장소도 보인다 — 어디까지 가야 하는지가 보여야 한다 */
    for (const place of D.places.filter(p => p.chapter === curCh)) {
        const head = place.cells[0];
        // 줄의 잠김 = **칸 I** 의 잠김 — 칸 I 이 열리면 그 장소에 들어갈 길이 있다(II · III 의 잠김은 창의 출발 칸 버튼이 든다)
        const unlocked = SYS.game.stageUnlocked(G, head.stage_id);
        const chapterBoss = head.boss_grade === 'chapter_boss';
        const sin = chapterOf(head.chapter)?.sin ?? 'wrath';
        const bg = stageBgOf(head.stage_id);   // 장소 그림 — 칸 셋이 같은 그림이다 (data.js)
        // 고른 줄 = 고른 칸이 이 장소의 칸일 때 — 창을 닫아도 테두리가 남는다
        const on = place.cells.some(z => z.stage_id === state.expStage);
        const row = el('div', `zone${unlocked ? '' : ' locked'}${chapterBoss ? ' boss' : ''}${on ? ' on' : ''}`);
        row.style.borderLeftColor = unlocked ? sinColor(sin) : '';
        if (bg) {
            row.style.backgroundImage = `linear-gradient(90deg, var(--bg-tertiary) 34%, rgba(4,4,4,.55) 68%, rgba(4,4,4,.30)), url('${bg}')`;
            row.classList.add('has-bg');
        }
        /* ⚠ **접이식 「구성 보기」는 없다** [2026-09-10 사용자 지시 · ADR-0080] — 줄 높이는 못박혀 있고(`style.css .zone`) 골라도 안 바뀐다.
           등장 몬스터는 출정 창의 적 구성 칸이 든다 (ADR-0078).
           줄 = 죄종 · `Ch1-1 장소 이름`(로마 숫자 없이) · 잔글씨로 맨 앞에 레벨 범위(`placeLvText` · ADR-0710) + 나오는 몬스터 이름(`placeFoes` · ADR-0649) */
        row.innerHTML = `
            <div>
                <div class="title">
                    <span class="sin-chip" style="color:${sinColor(sin)}">${sinName(sin)}</span>
                    <span>Ch${head.chapter}-${head.stage_num} ${L(placeName(head))}</span>
                </div>
                <div class="meta">${placeLvText(place)} · ${placeFoes(place)}</div>
            </div>
            <div>${unlocked ? '' : `<span class="zone-lock"><span class="lock-ico">${lockIcon(true)}</span>${stageLockText(head)}</span>`}</div>`;
        // ⚠ 클리어 표시 · 「원정」 칩은 없다 [2026-09-15 사용자 지시 · ADR-0151] — 고른 줄의 표시는 테두리(`.zone.on`)가 혼자 든다.
        /* 오른쪽 끝 = 잠긴 줄의 이유 · **부대가 도는 줄의 ▶ 부대 버튼** [2026-10-21 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0688] —
           원정 탭 버튼은 늘 이 목록이라(ADR-0661) 도는 전투로 돌아가는 길을 도착한 화면에도 둔다. 상단바 부대 칸과 같은 모양 · 같은 동작(`watchParty`)이고
           장소 이름은 줄이 말해 부대 이름만 단다. 그 부대의 원정(도는 · 끝나 띠가 선)이 **고른 단에서 이 장소의 칸**에 있을 때만 · 줄 클릭(출정 창)으로 안 번진다 */
        const goes = Array.from({ length: SYS.game.limitsOf(G).expeditions }, (_, i) => i + 1).filter(no => {
            const H = state.battles[no];
            return H && samePlace(H.stageId, head.stage_id) && (H.run?.difficulty ?? D.difficultyList[0].id) === ds.cur;
        });
        if (goes.length) {
            const side = row.lastElementChild;
            side.classList.add('zone-go');
            for (const no of goes) {
                const b = partyGo(el('button', 'btn sm', t('exp.seg.party', { n: M.roman(no) })), sinColor(sin));
                b.onclick = e => { e.stopPropagation(); watchParty(no); };
                side.appendChild(b);
            }
        }
        /* 줄 클릭 = **그 장소의 출정 창을 연다** [2026-09-10 사용자 지시 · ADR-0084 · 2026-09-29 장소 줄 · ADR-0436]. 창의 **닫는 길 셋**(X · 바깥 · Esc · §2)이 닫는다.
           처음 골라진 칸은 `placeStartCell` 이 정한다 · `state.expStage` 는 남는다 — 창을 닫아도 고른 줄의 표시가 이어진다 */
        row.onclick = () => {
            if (!unlocked) { flashStageLock(head); return; }
            state.expStage = placeStartCell(place);
            // 반복 스위치는 **같은 장소**를 도는 부대(고른 편성)에서 읽어 온다 — 스위치는 장소에 딸린다(v39 · ADR-0432). 런이 없거나 다른 장소면 꺼진 채로 시작
            state.expRepeat = samePlace(runSlot()?.stageId, head.stage_id) && runSlot().repeat === true;
            state.modal = 'depart';
            render();
        };
        zp.appendChild(row);
    }
    main.appendChild(zp);
}

/** 장소 줄을 눌렀을 때 **처음 골라진 칸** [2026-09-29 · SCREEN_DESIGN §4-1 · ADR-0436 · PLAN_expedition_window D5] —
 *  ① 그 장소에서 마지막으로 고른 칸(`state.expStage` 가 그 장소의 칸이면) → ② 열렸고 안 깬 첫 칸 → ③ 다 깼으면 칸 I.
 *  ① 은 되돌아온 사람의 자리 · ② 는 진행의 자리 · ③ 은 반복 순환의 처음이다 */
function placeStartCell(place) {
    if (place.cells.some(z => z.stage_id === state.expStage)) return state.expStage;
    const next = place.cells.find(z => SYS.game.stageUnlocked(G, z.stage_id) && !SYS.game.stageCleared(G, z.stage_id));   // 고른 단의 기록 (ADR-0586)
    return (next ?? place.cells[0]).stage_id;
}

/* ═══════════ 진형 (SCREEN_DESIGN §4-1) ═══════════
   ~~⚠ 목업 — 값이 화면 상태에만 산다~~ **폐기 2026-09-09** (부채 #37 해소) — 진형이 확정되면서
   자리는 **세이브 값**(편성마다의 진형 · R122)이 됐고 **전투가 그것을 읽는다**: 「앞에 있는 유닛부터 때린다」의
   「앞」이 이 자리다 (battle_design §3-1). 화면은 이제 규칙을 안 든다 — 고르고 그리기만 한다 */

/** 진형 읽기 — **규칙은 game_logic 이 든다** (`state.js:formationState` · 진형 확정 2026-09-09).
 *  종전의 `reconcileForm` 은 화면이 배치를 계산하던 함수였고, 진형이 세이브 값이 되면서 통째로 옮겨 갔다.
 *  정규화는 상태를 바꾸는 쪽(`toggleParty`·`setFormation`·`placeFormation`)이 하므로 읽기는 순수하다 */
const formState = (no = undefined) => SYS.game.formationState(G, no);   // `no` 를 주면 그 편성의 진형 (다부대 · ADR-0316)

/** 진형의 **자리 차례** — 랭크마다 정원(`caps[r]`)만큼의 칸을 같은 너비에 고르게 펴고(`x = (i + 0.5) / k`) x 로 줄 세운다.
 *  x 가 같으면 앞 랭크가 먼저다 · 정원 0 인 랭크는 자리가 없다(「모두 전열」의 후열). 관전의 `battle.js:layoutRanks` 와 같은 식이다.
 *  편성 보드(`formBox`)와 결투장 두 팀(ADR-0602)이 같이 쓴다 — 둘로 갈리면 같은 편성이 두 모양으로 선다
 *  @returns {{r: number, i: number}[]} 화면 차례대로 */
function formSeats(caps) {
    const seats = [];
    caps.forEach((cap, r) => { for (let i = 0; i < cap; i++) seats.push({ r, i, x: (i + 0.5) / cap }); });
    return seats.sort((a, b) => a.x - b.x || a.r - b.r);
}

/** 진형을 관전에 넘길 꼴로 굳힌다 (2026-09-09) — `{byUid: {uid: 랭크 번호}}` 하나뿐이다.
 *  **출발 순간에 한 번** 찍는다: 관전 중에 편성으로 돌아가 템플릿을 바꿔도 재생 중인 전투의 줄은 안 흔들린다
 *  (전투 결과가 출발 순간의 파티를 담은 것과 같은 이유).
 *  ⚠ **자리 계산(가로 차례 · 깊이)은 여기서 안 한다** — 재생기의 `layoutRanks` 가 든다 (2026-09-09 적 진형이 붙으며 합쳤다).
 *    적은 진형을 몬스터 역할에서 뽑으므로 편성 화면이 관여할 수 없고, 규칙이 둘로 갈리면 두 진영이 다른 모양으로 선다.
 *  ⚠ 여전히 화면 상태뿐이다 — 세이브(G)에도 전투 계산(SYS.*)에도 안 실린다. 재생기는 이 값으로 **카드 자리만** 정한다 */
function formSnapshot(run) {
    return { byUid: { ...run.fixed.byUid } };   // 출발이 굳힌 자리 — 전투(`partyUnits`)가 읽은 그 값이다 (2026-09-29 · ~~그 편성의 지금 진형~~)
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
 * 카드 드래그 — 진형(위)과 캐릭터 탭 띠의 순서 옮기기(ADR-0571)가 **같은 손**을 쓴다. `sel` = 놓을 수 있는 칸 · `onDrop(칸, 놓은 포인터)` 이 true 면 다시 그린다.
 * `onMove(포인터)` — 끄는 동안 매번 부른다(띠의 삽입선 · ADR-0571). 끝나면 `onMove(null)` 한 번 — 그 표시를 걷는다.
 * 4px 를 넘어야 드래그로 친다 — 임계 미만이면 **클릭(파티 넣고 빼기 · 영웅 고르기)이 그대로 산다.**
 * **카드 안의 버튼(해고)에서 누른 것은 드래그로 잡지 않는다** — 버튼의 클릭은 버튼의 것이다 (2026-09-15).
 * 고스트는 **감싸개 + 클론 하나**(원본은 자리에 남고 `.drag` 로 흐려진다 · 왜 감싸개인지는 아래 ①②) · 놓을 자리는 elementFromPoint 로 찾는다.
 * **고스트는 한 장(`#stage`) 안에 선다** (ADR-0087) — 크기 · 위치 · 잡은 점 오프셋은 **한 장 단위**(`stagePoint`)다.
 * 4px 임계와 elementFromPoint 는 **창 좌표 그대로**다 — 손이 움직인 거리와 브라우저의 판정이라 배율로 바꾸지 않는다.
 */
function bindCardDrag(node, sel, onDrop, onMove = null) {
    node.onpointerdown = ev => {
        if (ev.button || ev.target.closest('button')) return;
        const x0 = ev.clientX, y0 = ev.clientY;
        // 카드 사각형(한 장 단위) — 툴팁 자리와 같은 함수다: 한 장의 transform · 옛 `zoom` 방식(Chrome 127 이하)을 거기서 푼다
        const r0 = stageRect(node);
        const n0 = { x: r0.left, y: r0.top }, nw = r0.right - r0.left;
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
            onMove?.(e);
        };
        const up = e => {
            node.onpointermove = null; node.onpointerup = null; node.onpointercancel = null;
            if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
            if (!ghost) return;                       // 임계 미만 — 누르기만 했다(띠면 클릭이 이어받는다)
            ghost.remove();
            node.classList.remove('drag');
            onMove?.(null);                           // 끄는 동안의 표시(삽입선)를 걷는다 — 띠 밖에 놓아 다시 안 그려도 남지 않게
            formDragEnded = true;                     // 뒤따라 오는 클릭 한 번을 삼킨다
            setTimeout(() => { formDragEnded = false; }, 0);
            const tgt = document.elementFromPoint(e.clientX, e.clientY)?.closest(sel);
            if (!tgt || tgt === node) return;
            if (onDrop(tgt, e)) render();
        };
        node.setPointerCapture(ev.pointerId);
        node.onpointermove = move;
        node.onpointerup = up;
        node.onpointercancel = up;
        ev.preventDefault();
    };
}

/** 소제목 + `?` 표시 — 글씨 바로 오른쪽에 서고 **올리면** 설명 툴팁이 선다 (SCREEN_DESIGN §15 · ADR-0464). 누르는 자리가 아니다.
 *  카드는 물약 카드와 같은 모양이다 — 첫 줄 그 칸 이름 · 선 아래 설명 한두 문장 (`tip.js:potionTipCard` 의 클래스 그대로)
 *  폭은 **오른쪽 구분선(파티 전술의 왼쪽 선)까지** 편다 [2026-10-03 사용자 지시] — 커서 옆 16px 에서 시작하므로 `?` 오른변부터 선까지에서 그만큼 뺀다.
 *  선을 못 찾으면(전술 칸이 없는 배치) CSS 의 기본 폭(`.q-tip` max-width)에 맡긴다
 *  @param text () => string — 설명 문장 (올릴 때 짓는다) */
function subHelp(key, text) {
    return headingHelp(el('div', 'sub-h', t(key)), text);
}

/**
 * 진형 박스 — 왼쪽에 **정사각 템플릿 아이콘 3개를 가로로**(모양을 점으로 그린다 — 글자가 없어 언어 중립이다),
 * 오른쪽에 **보드**(랭크 줄 = 라벨 + 칸 · 칸은 영웅 띠 카드와 같은 크기).
 * 랭크 최대가 둘이라 보드 높이가 두 줄분으로 고정된다 — 한 줄짜리(3)는 가운데에 서고 패널 크기는 안 흔들린다.
 * @param pick 이름과 템플릿 아이콘 사이에 끼울 노드 — 편성 탭의 **편성 고르개**(ADR-0229)
 */
function formBox() {
    const f = formState();
    const caps = f.caps;
    /* 머리(「진형」)가 **돌아왔다** [2026-09-10 사용자 지시 · ADR-0079 가 ADR-0060 을 대체].
       걷었던 근거(「아이콘과 전열/후열 라벨이 이미 말한다」)는 이 상자가 패널의 유일한 내용이던 시절 것이다 —
       패널이 세 칸(적 구성 · 진형 · 출발)이 된 지금은 **칸마다 이름이 서야 어디까지가 무엇인지** 읽힌다.
       ⚠ 이름은 **제 줄에 서고 밑줄을 단다** [2026-09-21 사용자 지시 · ADR-0240 — ~~왼쪽 열 맨 위~~ ADR-0080 폐기].
         옛 자리는 이 상자가 **출정 창** 안에 있어 세로가 빠듯하던 시절 것이다(이름 줄이 창 높이에 그대로 더해졌다).
         편성 탭으로 옮겨 오고 보드가 한 줄이 된 지금은(ADR-0192 · ADR-0234) 세로가 남고,
         같은 줄에 서면 **보드의 전열 칸이 이름 줄을 침범한 것처럼** 보였다. 밑줄이 「여기부터 진형이다」를 말한다 */
    const box = el('div', 'fm-box');
    box.appendChild(subHelp('exp.form.h', () => t('pt.help.form')));       // 이름 + 밑줄 — 상자의 첫 줄 (ADR-0240) · 소제목 모양 (ADR-0256) · 옆에 `?` (ADR-0464)
    const main = el('div', 'fm-main');

    /* 왼쪽 열 — **모양 버튼 셋을 세로로**, 버튼마다 **그 모양의 이름을 글로** [2026-09-21 사용자 지시 · ADR-0267 — 점 아이콘 가로 줄을 걷었다].
       이름은 표(`formation_template.csv` 의 name_kr · name_en)가 든다 — 새 문구가 없다. 순서는 표의 행 순서이고 첫 행이 새 편성의 기본값이다.
       보드 **옆**에 두어 버튼 셋의 높이가 보드(칸 + 한 단) 안에 든다.
       셋 중 하나를 고르는 것이라 .toggle(초록 ON/OFF)이 아니라 .on(고른 것)을 쓴다 */
    const side = el('div', 'fm-side');
    const tpls = el('div', 'fm-tpls');
    for (const key of f.templates) {
        const b = el('button', `btn fm-tpl${key === f.tpl ? ' on' : ''}`, L(D.formationTemplates?.[key]) || key);
        b.onclick = () => { SYS.game.setFormation(G, key); save(); render(); };   // 자리는 세이브 값이다 (2026-09-09) · 원정 중에도 바꾼다 (R92)
        tpls.appendChild(b);
    }
    side.appendChild(tpls);
    main.appendChild(side);

    /* 보드 — **칸 하나 높이의 한 줄**이다 [2026-09-21 사용자 지시 · ADR-0234]. 랭크는 줄이 아니라 **한 단 어긋남**이 말한다:
       관전 아레나와 같은 그림이라(`ui/battle.js:layoutRanks` · ADR-0053 · ADR-0045) 편성이 전투의 예고편으로 읽힌다.
       가로 차례도 같은 식 — k 칸짜리 랭크의 i 번째가 `x = (i + 0.5) / k` 이고 x 가 같으면 앞 랭크가 먼저다.
       2·1 이면 **앞 · 뒤 · 앞** 차례라 뒤 칸이 저절로 가운데에 서고, 칸끼리는 가로로 안 겹쳐 초상이 다 보인다(끌어다 놓는 자리다).
       빈 칸은 영웅 얼굴과 같은 크기라 「여기에 끌어다 놓는다」가 크기로 읽힌다. 내려가는 단은 CSS 가 `data-rank` 로 준다.
       **랭크 이름(전열 · 후열)은 칸마다 그 칸 바로 아래**다 [2026-09-21 사용자 지시 · ADR-0269 — 왼쪽 라벨 열을 걷었다] —
       칸과 라벨을 자리 감싸개(`.fm-seat`) 하나에 넣어 뒤 랭크가 한 단 내려가면 라벨도 같이 내려간다. 빈 칸도 단다(놓기 전에 읽힌다).
       드래그 목적지는 여전히 칸(`.fm-cell` · rank/idx)이다 */
    const board = el('div', 'fm-board');
    const labels = FORM_RANK_LABELS[caps.length] ?? [];
    const line = el('div', 'fm-line');
    const seats = formSeats(caps);
    {
        for (const { r, i } of seats) {
            const uid = f.ranks[r][i];
            const h = uid ? heroById(uid) : null;
            const seat = el('div', 'fm-seat');
            seat.dataset.rank = r;
            const cell = el('div', `fm-cell${h ? ' filled' : ''}`);
            cell.dataset.rank = r;
            cell.dataset.idx = i;
            if (h) {
                /* 칸은 **띠 카드와 같은 얼굴**이다 [2026-09-21 사용자 지시 · ADR-0280] — 위칸(왼쪽 하는 일 · 오른쪽 이름) + 오른쪽 아래 레벨.
                   조각도 띠 카드의 것을 그대로 쓴다 — 같은 크기의 카드가 드래그로 오가므로 같은 영웅이 두 얼굴로 읽히면 안 된다.
                   리더 태그는 띠와 같은 키를 쓴다 — 리더는 파티의 첫 영웅(`partyOf(G)[0]`)이지 진형의 자리가 아니다 */
                cell.innerHTML = heroCardHtml(h, { leader: uid === SYS.game.partyOf(G)[0] });
                cell.style.borderTopColor = tierColor(h);
                // 툴팁 = 편성 띠와 같은 카드 — 첫 장은 스위치(`PARTY_TIP_STATS`)가 정한다 (ADR-0284 · ADR-0318). 끌기 시작하면 `bindFormDrag` 가 닫는다
                bindTipNode(cell, () => heroTipCard(h, combatOf(h), itemOf, it => equippedItemTipCard(h, it), partyTipOpts(h)), { anchor: true, holdOnAlt: true });
                bindFormDrag(cell, { uid });
                /* 클릭 = **파티에서 뺀다** [2026-09-11 사용자 지시 · §4-1 · ADR-0096] — 띠 카드를 다시 누른 것과 같은 문(`toggleParty`)이다.
                   빼는 길이 띠에만 있던 판은 **교체가 막혔다** — 파티가 차 있으면 새 영웅의 클릭은 「파티 정원」으로 거절되는데,
                   보드의 영웅을 눌러도 아무 일이 없었다. 끈 뒤의 클릭은 띠와 같이 삼킨다 */
                cell.onclick = () => { if (!formDragEnded) toggleParty(h); };
            }
            seat.appendChild(cell);
            seat.appendChild(el('div', 'fm-label', labels[r] ? t(labels[r]) : ''));
            line.appendChild(seat);
        }
    }
    board.appendChild(line);
    main.appendChild(board);
    box.appendChild(main);
    return box;
}

/* ═══════════ 편성 탭 (SCREEN_DESIGN §15 · ADR-0192 ~ 0195) ═══════════
   전투에 나가기 전에 정하는 넷이 한 탭에 있다 — 누구(파티) · 어디에(진형) · 무엇을 들고(물약 칸) · 어떤 조건으로(파티 전술).
   편성은 늘 `limitsOf(G).presets` 개가 서 있고(탐험 r1 · r5 가 연다 · 2026-10-30) **박스 맨 위의 고르개**가 어느 편성을 펼지 정한다(출정 창과 같은 값 · ADR-0251).
   파티 · 진형 · 물약 칸 · 파티 전술 칸이 전부 **고른 편성의 것**이다(ADR-0250) — 열린 전술 칸 수만 계정이라 모든 편성이 같다.
   **판정은 전부 game_logic 이 낸다** — 모자람(`presetState`) · 카운터 · 켜짐(`tacticState`). 화면은 고르고 그리기만 한다 */

/** 편성 고르개 — **박스 맨 위 한 줄**이다 [2026-09-21 사용자 지시 · ADR-0251 — 진형 칸 안(ADR-0229)에서 올렸다].
 *  전술 칸까지 편성마다가 되어(ADR-0250) 아래 셋(진형 · 물약 · 전술)을 전부 가르므로 셋 모두의 위에 선다. 도는 원정의 편성은 「원정 중」을 단다 */
//   `onPick` 을 주면 누름을 그쪽이 받는다 — 결투장은 고르면서 판을 펼친다 (ADR-0495)
//   `locked` 면 다 열렸을 때의 편성 수(`presetFull`)까지 **안 열린 편성도 자물쇠 + 회색 · 이름만** 세운다 — 안 눌린다 ·
//     상단바 부대 칸과 같은 `seg-lock` · 무엇이 여는지는 안 적는다(ADR-0691) · 편성 탭만 켠다 (ADR-0868)
function presetSeg(ps, onPick = no => { SYS.game.selectPreset(G, no); save(); render(); }, { locked = false } = {}) {
    const cells = ps.presets.map(p => ({ id: p.no, label: presetLabel(p.no, ps) }));
    if (locked) for (let no = cells.length + 1; no <= presetFull(); no++)
        cells.push({ id: no, label: `<span class="lock-ico">${lockIcon(true)}</span>${t('pt.preset', { n: M.roman(no) })}`, disabled: true, cls: 'seg-lock' });
    const seg = segmented(cells, ps.activeNo, onPick);
    seg.classList.add('pt-pick');
    return seg;
}

function renderParty(main) {
    const ps = SYS.game.presetState(G);
    // 캐릭터 탭과 같은 짜임 [2026-09-21 사용자 지시 · §15 · ADR-0221] — 띠 패널이 박스 밖 맨 위에 따로 서고, 박스가 남는 세로를 받는다
    const page = el('div', 'page page-stack');
    // 띠 — 캐릭터 탭과 같은 패널(칸 이름 없음). `deployed` — 아래에 진형 보드가 늘 있으므로 파티 카드의 반투명(「보드에 들어가 있다」 · ADR-0056 · 0058)이 늘 참이다
    page.appendChild(heroStrip(toggleParty, { leaderUid: SYS.game.partyOf(G)[0] ?? null, partyMode: true, deployed: true }));
    const body = el('div', 'panel fill pt-body');
    body.dataset.keep = 'party';
    body.appendChild(presetSeg(ps, undefined, { locked: true }));   // 편성 고르개 — 박스의 첫 줄 (ADR-0251) · 안 열린 편성도 자물쇠로 (ADR-0868)
    // 두 열 [2026-09-21 사용자 지시 · ADR-0260] — 왼쪽 열(내용 폭) = 진형 · 그 아래 물약 · 오른쪽 열(남는 폭 전부) = 파티 전술(칸이 세로 목록)
    const mid = el('div', 'pt-mid');
    const left = el('div', 'pt-left');
    left.appendChild(formBox());
    left.appendChild(potionBox(ps));
    mid.appendChild(left);
    mid.appendChild(tacticsBlock());
    body.appendChild(mid);
    page.appendChild(body);
    main.appendChild(page);
}

/** 물약 한 칸의 그림 — 관전 아레나 칸과 같은 그림 · 없으면 병 실루엣 (`battle.js:potionBeltHtml` 과 같은 규칙) */
const potionImg = id => {
    const src = id ? M.potionArt(id) : null;
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">`
        : `<img class="p-bg" src="${M.POTION_SLOT_ART}" alt="" loading="lazy" onerror="this.remove()">`;
};
/** 안 열린 물약 칸의 한 줄 — 그 칸을 여는 건물 랭크(「창고 2랭크」 · ADR-0699). `i` = 칸 자리(0 부터) · 기본 칸 수 위로 몇째 칸인가를 묻는다 (§15 · ADR-0716) */
const potionLockText = i => needText('potionSlots', i + 1 - D.balance.potion_slot_max);
/** 안 열린 물약 칸 — 칸 안에 닫힌 자물쇠 · 올리면 여는 건물 랭크 한 줄(잠긴 스킬 칸과 같은 `tip-mini`) · 편성 탭 · 출정 창이 같이 쓴다 (§15 · §4-1 · ADR-0716) */
function potionLockSlot(cls, i) {
    const txt = potionLockText(i);
    const c = el('span', `${cls} locked`, lockIcon(true));
    bindTipNode(c, () => el('div', 'tip-card tip-mini', `<div class="tip-name">${txt}</div>`));
    c.setAttribute('aria-label', txt);
    return c;
}
/** 관전 물약 칸의 잠긴 자리 — 재생기는 G 를 모르므로 앱이 다 지은 칸 수 · 자물쇠 그림 · 한 줄을 넘긴다 (§4-2 · ADR-0716) */
const potionLocksOpt = () => ({ cap: SYS.game.presetState(G).slotCap, icon: lockIcon(true), text: potionLockText });

/**
 * 물약 — 왼쪽 **칸**(이 편성의 구성) · 오른쪽 **가진 물약**(그림 + 개수) [2026-09-21 · §15 · ADR-0195].
 * 손 — **가진 물약 클릭 = 앞의 빈 칸에** · **칸 클릭 = 비우기** · **드래그**: 가진 물약 → 칸(그 칸에 넣는다) · 칸 → 칸(맞바꾼다 — 앞 칸부터 마시므로 순서가 결정이다).
 * 진형과 같은 손(`bindCardDrag`)이라 끈 뒤의 클릭 한 번은 삼킨다. **재고보다 많이 넣어도 막지 않는다** — 모자란 칸은 흐리게 선다(`short` · 런에서 빈다)
 */
function potionBox(ps) {
    const cur = ps.presets[ps.activeNo - 1];
    const box = el('div', 'pt-potion');
    // 소제목 모양 (ADR-0256) · 옆에 `?` (ADR-0464) — 문턱은 **이 편성의 기준**(`potionUse.hpPct`)을 % 로만 바꿔 찍는다 (R378)
    const usePct = Math.round(cur.potionUse.hpPct * 100);
    box.appendChild(subHelp('pt.potion.h', () => t('pt.help.potion', { n: usePct })));
    const row = el('div', 'pt-potion-row');
    const act = r => { if (!r.ok) flash(`pt.err.${r.err}`); else save(); return true; };
    const belt = el('div', 'p-belt');
    cur.potionSlots.forEach((s, i) => {
        const c = el('span', `p-slot pt-slot${s ? ' full' : ''}${s?.short ? ' short' : ''}`, s ? potionImg(s.id) : potionImg(null));
        c.dataset.slot = i;
        // 올리면 **물약 카드**(이름 + 효과) — 빈 칸도 제 카드를 세운다 · 모자란 칸은 칸이 흐린 점선으로 말한다 (§2 「물약 툴팁 규격」 · ADR-0315)
        bindTipNode(c, () => potionTipCard(s?.id));
        if (s) {
            c.onclick = () => { if (formDragEnded) return; act(SYS.game.setPotionSlot(G, i, null)); render(); };
            bindCardDrag(c, '.pt-slot', tgt => act(SYS.game.swapPotionSlot(G, i, Number(tgt.dataset.slot))));
        }
        belt.appendChild(c);
    });
    // 안 열린 칸 — 다 지은 칸 수까지 자물쇠로 선다 · 누르면 여는 건물 랭크를 플래시로(전술 잠긴 칸과 같다) · 넣기 · 드래그는 안 받는다 (`.pt-slot` 이 아니다 · ADR-0716)
    for (let i = cur.potionSlots.length; i < ps.slotCap; i++) {
        const c = potionLockSlot('p-slot pt-lock', i);
        c.onclick = () => { if (formDragEnded) return; flashNeed('potionSlots', i + 1 - D.balance.potion_slot_max); };
        belt.appendChild(c);
    }
    // 기준 줄 — 칸 줄 바로 아래 `−` · 「HP n% 미만에서 마심」 · `+` · 끝이면 그쪽 버튼이 꺼진다(`potionUse.down` · `up` — 칸 셈은 state 가 한다 · §15 · ADR-0942)
    const use = el('div', 'pt-use');
    const mk = (dir, can, key) => {
        const b = el('button', 'btn sm pt-use-btn', dir > 0 ? '+' : '−');
        b.disabled = !can;
        b.title = t(key);
        b.onclick = () => { act(SYS.game.stepPotionHp(G, dir)); render(); };
        return b;
    };
    use.append(mk(-1, cur.potionUse.down, 'pt.potion.useDown'), el('span', 'pt-use-val', t('pt.potion.use', { n: usePct })), mk(1, cur.potionUse.up, 'pt.potion.useUp'));
    const left = el('div', 'pt-potion-left');
    left.append(belt, use);
    row.appendChild(left);
    // 가진 물약 — **가진 것과 만들 수 있는 것만** 선다(0 개는 흐리게 · 잠긴 단계는 안 선다 — 대장간이 든다)
    const stock = el('div', 'pt-stock');
    stock.appendChild(el('span', '', t('pt.potion.stock')));
    const rows = SYS.game.potionState(G).list.filter(r => r.have > 0 || r.craftable);
    for (const r of rows) {
        const c = el('span', `p-stock${r.have ? '' : ' zero'}`, `<span class="p-slot full">${potionImg(r.id)}</span><b>×${r.have}</b>`);
        bindTipNode(c, () => potionTipCard(r.id, { heal: r.heal }));
        c.onclick = () => { if (formDragEnded) return; act(SYS.game.setPotionSlot(G, null, r.id)); render(); };
        bindCardDrag(c, '.pt-slot', tgt => act(SYS.game.setPotionSlot(G, Number(tgt.dataset.slot), r.id)));
        stock.appendChild(c);
    }
    if (!rows.length) stock.appendChild(el('span', 'fg-ptag muted', t('fg.potion.none')));
    row.appendChild(stock);
    box.appendChild(row);
    return box;
}

/** 파티 전술 — 칸 이름 · 진척 줄 · 칸 격자 (§15 · ADR-0194). 칸은 **고른 편성의 것**이고 카운터 · 켜짐도 그 편성의 파티로 센다(`tacticState` 기본값 · ADR-0250)
 *  칸은 **세로 목록**이다 — 칸 하나가 한 행이고 행 수는 칸 수(`tactic_slot.csv` 행 수)다. 행 안의 네 칸(번호 · 등급 · 켜짐 | 조건 | 효과 | 리롤)이
 *  모든 행에서 같은 세로줄에 서는 것은 CSS 가 편성 탭 안에서만 준다(`.pt-tactics` · subgrid) — `tacticCell` 은 그대로다 (ADR-0260) */
function tacticsBlock() {
    const ts = SYS.game.tacticState(G);
    const next = ts.slots.find(s => !s.open);
    /** 전체 리롤 — 열렸고 안 잠긴 칸을 한 번에 (tactic_card_design §5-6 · R28). 거절 사유는 state 가 코드로 낸다 (INTERFACE §3) */
    const reroll = () => {
        const r = SYS.game.rerollTactic(G);
        if (r.ok) { flash('rs.reroll.done', { n: r.rolled.length }); save(); }
        else flash(`pt.err.${r.err}`);
        render();
    };
    /** 잠금 — 무료 · 언제든 푼다. 결과는 자물쇠 버튼과 리롤 비용이 말하므로 플래시가 없다 */
    const lock = no => {
        const r = SYS.game.toggleTacticLock(G, no);
        if (r.ok) save(); else if (r.err === 'locked') flashNeed('tactic_slots', no); else flash(`pt.err.${r.err}`);   // 안 열린 칸 = 그 칸을 여는 지휘 천막 랭크 (ADR-0699)
        render();
    };
    const box = el('div', 'pt-tactics');     // 오른쪽 열 — 왼쪽 열과는 세로 가림선 하나 (ADR-0260)
    const head = helpHeading('div', 'sub-h', t('rs.h'), 'tactics');
    head.appendChild(buffMark(ts));          // 오른쪽 끝 「추가 버프」 — 올리면 받는 보너스 (ADR-0757)
    box.appendChild(head);
    const progress = el('div', 'rs-head', `
        <span>${t('rs.total')} <b>${ts.totalLevel}</b></span>
        <span>${t('rs.open')} <b>${ts.open}</b> <span class="muted">/ ${ts.count}</span></span>
        <span>${t('rs.lockedN')} <b>${ts.lockedCount}</b></span>
        <span class="muted">${next
            ? lockLine(needText('tactic_slots', next.no))       // 다음 칸 — 지을 지휘 천막 랭크 (R137 · ~~합산 레벨까지 남은 양~~)
            : t('rs.allOpen')}</span>`);
    // 전체 리롤 — 진척 줄 오른쪽 끝 (ADR-0763 · ~~진척 줄 아래 리롤 줄~~). 비용은 잠근 칸 수가 정하고 버튼에 적는다.
    //   굴릴 칸이 없으면(전부 잠금) 꺼진다 — 골드 부족은 눌러서 사유를 듣는다 (§15)
    const b = el('button', 'btn sm rs-roll', t('rs.reroll', { g: ts.rerollCost.toLocaleString() }));
    b.disabled = !ts.slots.some(s => s.open && !s.locked);
    b.onclick = reroll;
    progress.appendChild(b);
    box.appendChild(progress);
    const grid = el('div', 'rs-grid');
    // 열 이름 줄 — 칸 목록과 같은 격자(subgrid)라 글자가 각 세로줄의 왼쪽 끝에 맞는다 · 잠금만 오른쪽 끝 (ADR-0763)
    grid.appendChild(el('div', 'rs-colh', ['state', 'cond', 'prog', 'buff', 'extra', 'lock'].map(k => `<span class="c-${k}">${t(`rs.col.${k}`)}</span>`).join('')));
    for (const slot of ts.slots) grid.appendChild(tacticCell(slot, lock));
    box.appendChild(grid);
    return box;
}

/* ═══════════ 출정 창 (SCREEN_DESIGN §4-1 · ADR-0084 · ADR-0088) ═══════════
   스테이지 행을 누르면 **탭 위에 겹쳐 뜨는 창**이다 — 옛 접이식 전진 패널(2026-08-28~2026-09-10)이 통째로 옮겨 왔다.
   속은 **이름 붙은 칸 넷이 2×2** 로 선다 (ADR-0088):
     위 줄   = **적 구성 ↔ 이야기** — 어떤 곳인가. **읽는 자리 둘**이라 클릭이 없다
     아래 줄 = **편성 ↔ 출정 방식** — 누구를 보내나 ↔ 갈까. **누르는 자리 둘** (창은 편성을 **고르기만** 한다 — ADR-0193 · 진형은 편성 탭 — ADR-0192)
   **줄이 곧 동사다** [2026-09-21 사용자 지시 · ADR-0214] — 왼쪽 열은 초상(몬스터 넷 ↔ 영웅 셋이 위아래로 마주 선다) · 오른쪽 열은 글과 버튼이다.
   **크기는 상태에 흔들리지 않는다** — 넷이 전부 항상 있는 부품이고, 판 폭은 `.depart-box` 가 못박는다. */

/** 창 머리 — **고른 칸의 신원**. 접이식이던 시절엔 바로 위 행이 말하던 것이라 패널에 머리가 없었는데
 *  (2026-08-28 「머리 통째로 삭제」), 창은 목록에서 떨어져 뜨므로 **여기가 그 자리를 이어받는다** (ADR-0084).
 *  줄 하나에 죄종 칩 · Ch-칸 이름 · 잔글씨로 레벨(소요 · 원소는 걷었다 · 몬스터는 아래 적 구성이 든다 — ADR-0649). 레벨은 **고른 난이도의 몬스터 레벨**(`game.stageLevel` · ADR-0586 — 보기만) —
 *  위험도가 폐지돼 바꾸는 조작이 없다 [2026-09-29 사용자 「위험도 없어 이제」 · ADR-0437 · ~~`stageLevelState` 의 지금 레벨~~] */
function departHead() {
    const z = D.stages[state.expStage];
    const sin = chapterOf(z.chapter)?.sin ?? 'wrath';
    const h = el('h2', 'dw-title');
    h.innerHTML = `
        <span class="sin-chip" style="color:${sinColor(sin)}">${sinName(sin)}</span>
        <span>Ch${z.chapter}-${z.stage_num} ${L(stageName(z))}</span>
        <small>${t('exp.stageMeta', { lv: stageLv(z) })}</small>${departDebuff(z)}`;
    headingHelp(h, () => t('hint.depart'), h.querySelectorAll('span')[1]);
    const diff = D.difficulties[curDiff()];
    if (diff) h.appendChild(el('small', 'dw-difficulty', t('exp.diff.stats', { hp: diff.monsterHpMult, dmg: diff.monsterDmgMult })));
    return h;
}
/** 머리의 장 디버프 한 줄 — 그 단 · 그 칸의 `battle.debuffOf`(챕터보스 칸은 배수가 곱해진 값) · 그 장 죄종 색 · 없는 단은 빈 글자 [2026-10-28 · ADR-0935] */
function departDebuff(z) {
    const d = SYS.battle.debuffOf(z.stage_id, curDiff());
    if (!d) return '';
    const pc = v => +(Math.abs(v) * 100).toFixed(1);   // 비율 → % 글자(부동소수 꼬리를 자른다)
    const fx = t(`exp.debuff.${d.effect}`, { v: pc(d.value), i: d.intervalSec, d: d.durationSec, c: pc(d.cap) });
    return `<small style="color:${sinColor(d.sin)}">${t('exp.debuffLine', { sin: sinName(d.sin), fx })}</small>`;
}
/** 창 판에 거는 변수 — `--ch` 장 색 · `--dw-bg` 장소 그림(목록 줄과 같은 그림 · 없으면 안 건다). `Now` 는 안 읽고 `D2 Min` 의 머리 띠가 읽는다 (§10-5 · ADR-0902) */
function departVars() {
    const z = D.stages[state.expStage];
    const bg = stageBgOf(z.stage_id);
    // 그림 주소는 문서 기준 절대 주소로 — 변수 안의 상대 주소는 그 변수를 쓰는 style.css 기준으로 풀릴 수 있다
    return { '--ch': sinColor(chapterOf(z.chapter)?.sin ?? 'wrath'), ...(bg ? { '--dw-bg': `url('${new URL(bg, document.baseURI).href}')` } : {}) };
}

/** 출발 칸 줄 — **출정 방식 칸의 맨 위** [2026-09-29 사용자 지시 「위험도를 삭제하고 버튼 3개 넣어서 어디에서 출발할지 정하도록」 ·
 *  SCREEN_DESIGN §4-1 · ADR-0437 — 위험도 줄(ADR-0104)을 걷은 자리]. 윗줄 = 잔글씨 「출발 칸」 · 아랫줄 = 칸 버튼 셋 `I` `II` `III`(같은 폭).
 *  고른 칸은 `on` · 잠긴 칸은 흐리고 자물쇠 + 이유 툴팁 한 줄(목록의 잠긴 줄과 같은 문장 · 잠긴 스킬 칸 툴팁과 같은 모양 · ADR-0427).
 *  칸이 하나인 장소(챕터보스)는 첫 자리에 「챕터보스」 하나 + 빈 자리 둘 — 자리를 늘 셋 잡아 버튼 폭이 장소마다 안 흔들린다(ADR-0098 과 같은 규칙).
 *  누르면 **창이 그 칸으로 바뀐다** — 고른 칸(`state.expStage`)만 바꾸고 다시 그린다. 반복 스위치는 장소에 딸려 그대로다 (ADR-0432) */
function cellRow(z) {
    const cells = placeCells(z);
    const box = el('div', 'cp-box');
    box.appendChild(helpHeading('div', 'cp-h', t('exp.cell.h'), 'cell'));
    const row = el('div', 'cp-row');
    for (let i = 0; i < 3; i++) {
        const c = cells[i];
        if (!c) { row.appendChild(el('span', 'cp-void')); continue; }   // 칸이 하나인 장소의 빈 자리 — 자리만 잡는다
        const open = SYS.game.stageUnlocked(G, c.stage_id);
        const label = cells.length > 1 ? M.roman(c.cell) : t('kind.chapterBoss');
        const b = el('button', `btn sm cp-btn${c.stage_id === z.stage_id ? ' on' : ''}${open ? '' : ' locked'}`,
            open ? label : `<span class="lock-ico">${lockIcon(true)}</span>${label}`);
        if (!open) {
            const txt = stageLockText(c);
            bindTipNode(b, () => el('div', 'tip-card tip-mini', `<div class="tip-name">${txt}</div>`));
            b.setAttribute('aria-label', txt);
        }
        b.onclick = () => {
            if (!open) { flashStageLock(c); return; }
            if (c.stage_id === state.expStage) return;
            state.expStage = c.stage_id;
            render();
        };
        row.appendChild(b);
    }
    box.appendChild(row);
    return box;
}

/** 출정 방식 — **출발 칸 줄**(`cellRow` · 2026-09-29 · ADR-0437) + 경고 줄 + 같은 크기 버튼 둘. 반복 원정은 별도 줄이 아니라 **버튼**이다 (2026-08-28 사용자 지시):
 *  옛 줄은 「런의 스테이지일 때만」 붙어서 칸 크기가 흔들렸다. 버튼은 항상 있으므로 크기가 고정된다. */
function goBox(z) {
    const side = el('div', 'fp-side');
    side.appendChild(helpHeading('div', 'sub-h', t('exp.go.h'), 'departure'));
    side.appendChild(cellRow(z));   // 출발 칸 — 칸 이름 바로 아래 · 보내기보다 위 (위험도 줄이 서던 자리 · ADR-0437)
    // 경고는 있을 때만 글자가 뜨지만 **줄은 항상 잡는다** — 안 그러면 칸이 상태에 따라 커졌다 작아진다 (2026-08-28)
    // 상태 경고는 없다 [2026-09-03] — 전투 밖에 쓰러져 있는 영웅이 없으므로 막히는 경우가 파티 0 하나뿐이다
    //   고른 편성으로 나가므로 판정도 그 편성의 것이다 — 빈 파티 · 수색 나간 영웅(`presetState` 의 `err` · 2026-09-21 · R122)
    const pst = SYS.game.presetState(G), perr = pst.presets[pst.activeNo - 1]?.err;
    //   챕터보스가 죽어 있는 칸이면 그 줄이 먼저다 — 편성과 무관하게 아무도 못 나간다 (ADR-0590)
    const waiting = (SYS.game.bossRespawnAt(G, z.stage_id) ?? -Infinity) > now();
    side.appendChild(el('div', 'down exp-warn', waiting ? t('exp.departRespawn') : { noParty: tLock('exp.noParty'), exploring: t('exp.departExploring'), advancing: t('exp.departAdvancing') }[perr] ?? ''));

    const actions = el('div', 'form-actions');
    // 반복 원정은 처음부터 열려 있다 (2026-09-24 · R152 · ~~원정 건물 랭크가 연다 — 흐린 버튼~~)
    // 뜻 [개정 2026-09-29 · ADR-0432 — PLAN_stage_segments D8] = **켬 · 장소 안 순환(I → II → III → I) / 끔 · 이길 때마다 다음 칸** — 어느 쪽이든 멈추지 않는다.
    //   글자는 기획 용어 그대로 · 뜻 한 줄은 툴팁이 든다
    const rep = el('button', `btn lg toggle${state.expRepeat ? ' on' : ''}`, t('exp.repeat'));
    rep.title = t('exp.repeat.tip');
    rep.onclick = () => {
        state.expRepeat = !state.expRepeat;
        // 고른 편성의 부대가 **이 장소**를 돌고 있으면 곧바로 그 부대에도 옮긴다 — 다음 런의 칸(`game.nextRepeat`)이 이 값을 읽는다
        { const s = runSlot(); if (samePlace(s?.stageId, z.stage_id)) { s.repeat = state.expRepeat; save(); } }
        render();
    };
    const go = el('button', 'btn lg primary', t('exp.deploy'));
    // 출발하면 창은 할 일이 끝났다 — 안 닫으면 관전 화면 위에 편성 창이 그대로 떠 있는다 · 창의 반복 스위치를 새 런에 싣는다 (ADR-0432)
    //   **다른 일을 하던 영웅이 끼어 있으면 먼저 묻는다** [2026-09-30 사용자 지시 · ADR-0467] — 나갈 수 있는 편성일 때만이다(거절될 출발은 묻지 않고 지금처럼 플래시)
    //   **원정 중인 제 부대를 끊을 때도 묻는다** [2026-10-15 · ADR-0629 — ~~묻지 않고 끊는다~~(ADR-0111)]
    go.onclick = () => {
        if (departPulls(z.stage_id) || departCuts(z.stage_id)) { openModal('departConfirm'); return; }
        state.modal = null; runBattle(z.stage_id, { repeat: state.expRepeat });
    };
    actions.appendChild(rep);
    actions.appendChild(go);
    side.appendChild(actions);
    return side;
}
/** 적 구성 — 창의 **위 줄 왼쪽 · 편성 초상 위** [2026-09-21 사용자 지시 · §4-1 · ADR-0214 · 옛 자리는 ADR-0088].
 *  이 스테이지에서 기다리는 것들을 **정사각 칸으로 가로 한 줄** 편다 — 칸 크기는 **진형 칸과 같은 `--fm-slot`** 이고,
 *  이름은 칸 위 띠가 들고(`foeCell` · ADR-0568) · 칸 아래에 **스킬 칸 줄**이 선다(`seatSkills` — 몬스터는 고른 단의 칸 · 보스의 굴리는 칸은 「?」 · ADR-0664).
 *  **클릭이 없는 읽는 자리**다 — 고르는 것은 목록의 장소 줄과 출발 칸 버튼이 이미 했다.
 *  「이건 적이다」를 글자로 안 써도 되는 것은 **원형이 몬스터**이기 때문이지만(§5), 칸 이름 한 줄은 둔다:
 *  진형 상자가 제목을 안 다는 근거(아이콘·전열/후열 라벨이 이미 말한다 · ADR-0060)가 여기엔 없다.
 *  ⚠ 칸 **수**는 칸마다 같지 않다 — 칸 III 은 일반 셋 + 보스 하나, **칸 I · II 는 일반 셋뿐**(마지막 라운드가 정예라 보스가 안 나온다 · 2026-09-29 · ADR-0432),
 *  **챕터보스 칸은 보스 하나뿐**이다(2026-09-11). 보스가 나오나는 그 칸의 라운드 세트(`battle.stageRounds`)가 말한다 — `boss_monster_idx` 는 칸 I · II 도 장소의 보스를 든다.
 *  칸은 늘 같은 정사각이고 자리는 넷만큼 잡으므로(`.foe-list` · ADR-0098) **크기는 안 흔들린다** — 보스 없는 칸은 넷째 자리가 빈다 */
function foeBox(z) {
    const box = el('div', 'foe-box');
    const hasBoss = SYS.battle.stageRounds(z).some(r => r.round_type === 'boss');
    box.appendChild(helpHeading('div', 'sub-h', t('exp.foes'), 'foes'));
    const list = el('div', 'foe-list');
    // 칸은 **고른 난이도로 설 때의 칸**이다 — 칸 규칙은 전투와 같은 `battle.monsterSkillSlots` 가 답한다(나이트메어부터 2칸 · 보스의 한 칸 더 = 「?」 · ADR-0664)
    const diff = curDiff();
    for (const id of SYS.battle.stagePool(z)) list.appendChild(foeSeat(id, 'normal', diff));
    //   챕터보스가 죽어 있으면 그 칸의 초상이 무덤 명패다 — 그 칸 × 고른 난이도 · 돌아오는 순간 앱 시계가 다시 그린다(`respawnTick` · ADR-0590)
    const back = hasBoss ? SYS.game.bossRespawnAt(G, z.stage_id) : null;
    if (hasBoss) list.appendChild(foeSeat(z.boss_monster_idx, z.boss_grade, diff, 'boss', back != null && back > now() ? back : null));
    box.appendChild(list);
    return box;
}

/** 적 칸 하나 = 초상(이름 띠) + 스킬 칸 줄 [2026-10-09 사용자 지시 · §4-1 · ADR-0568].
 *  스킬은 **그 등급 · 그 단으로 설 때의 칸**이다 — `battle.monsterSkillSlots`(정해진 칸 · `rolled` = 보스의 굴리는 칸 「?」 · ADR-0664) */
const foeSeat = (id, grade, diff, cls = '', grave = null) => {
    // `grave` = 죽어 있는 챕터보스가 돌아오는 시각 — 있으면 초상 대신 무덤 명패(이름 띠 · 스킬 칸 줄은 그대로 · ADR-0590)
    const seat = el('div', 'dw-seat', grave != null ? foeGraveCell(id, cls, grave) : foeCell(id, cls));
    const sl = SYS.battle.monsterSkillSlots(id, grade, diff) ?? { fixed: [], rolled: false };
    // 칸마다 바탕 레벨 `Lv.n` — 장비 몫(특정 스킬 +n)은 스폰 때 굴려져 여기서는 모른다 (§4-1 · ADR-0705)
    const fixed = sl.fixed.map(a => ({ ...a, lv: 1 + (a.up ?? 0) }));
    seat.appendChild(seatSkills(sl.rolled ? [...fixed, 'rolled'] : fixed));
    return seat;
};

/**
 * 초상 아래 **스킬 칸 줄** — 출정 창의 적 구성 · 편성 초상마다 선다 [2026-10-09 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0568].
 * 관전 유닛 카드의 쿨 칸 줄과 같은 문법이다 — 칸 수는 `active_slots` · **받은 차례대로** 차고(출처 자리가 아니다) 남는 칸 · null 칸은 점선 빈 칸.
 * 영웅은 `seatOrder` 가 전직 스킬을 맨 오른쪽으로 보내 넘긴다 (ADR-0591).
 * 칸에 올리면 스킬 카드 · 「?」 칸은 한 줄. **읽는 자리다 — 클릭이 없다**
 * @param skills 칸에 앉을 것 — 스킬 인스턴스(`{id, source, up}`) 또는 `'rolled'`(보스가 스폰 때 굴리는 칸)
 * @param ctx    스킬 카드의 숫자 재료(`skillTipCard` 의 ctx) — 몬스터는 비운다(레벨 · 장비가 판마다 굴려져 숫자 자리가 식으로 접힌다)
 * @param ghost  빈 편성 자리 — 칸을 안 보이게 세워 **높이만** 잡는다(창이 편성마다 안 흔들린다)
 */
function seatSkills(skills, ctx = {}, ghost = false) {
    const row = el('div', `dw-sk${ghost ? ' ghost' : ''}`);
    for (let i = 0; i < Math.max(D.balance.active_slots, skills.length); i++) {
        const s = skills[i];
        // 칸은 그림 오른쪽 아래에 `Lv.n` — 편성 = 영웅의 레벨 · 적 구성 = 바탕 레벨(`foeSeat` 가 싣는다) · 「?」 칸은 안 선다 (ADR-0701 · ADR-0705)
        const c = el('span', `dw-sk-cell${s ? '' : ' empty'}${s === 'rolled' ? ' rolled' : ''}`, s === 'rolled' ? '?' : s ? skillImg(s) + skLvTag(s) : '');
        if (s === 'rolled') {
            const txt = t('exp.foe.rolled');
            bindTipNode(c, () => el('div', 'tip-card tip-mini', `<div class="tip-name">${txt}</div>`));
            c.setAttribute('aria-label', txt);
        } else if (s) bindTipNode(c, () => skillTipCard(s, { ...ctx, source: s.source }));
        row.appendChild(c);
    }
    return row;
}
/** 영웅 스킬 칸 줄의 배치 — 전직 스킬(`source = advance`)은 늘 맨 오른쪽 칸 · 나머지는 앞에서부터 · 사이 빈 칸은 null
 *  [2026-10-12 사용자 지시 · §4-1 · ADR-0591 — 관전 카드 `battle.js:cdSlots`(ADR-0572)와 같은 배치] */
const seatOrder = list => {
    const adv = list.filter(s => s.source === 'advance');
    const rest = list.filter(s => s.source !== 'advance');
    return [...rest, ...Array(Math.max(0, D.balance.active_slots - list.length)).fill(null), ...adv];
};

/** 이야기 — 창의 **위 줄 오른쪽 · 적 구성 옆** [2026-09-21 사용자 지시 · §4-1 · ADR-0214 · 칸의 속은 ADR-0105].
 *  이 스테이지의 **이야기 글**(`stage.csv:story_kr/_en`)을 찍는 **읽는 자리**다 — 클릭이 없다.
 *  **글이 열을 안 넓힌다** — 칸이 **가로만** 크기 격리(`.dw-story`)라 폭은 왼쪽 열이 쓰고 남는 폭이고, **줄 높이는 글이 정한다**(ADR-0214).
 *  글은 데이터라 `textContent` 로 넣는다. 이름 자리(`{m:…}` · `{leader}`)는 `data.js:fillStory` 가 푼다 — 리더 = 파티 첫 슬롯 [2026-09-15] */
function storyBox(z) {
    const box = el('div', 'dw-story');
    box.appendChild(helpHeading('div', 'sub-h', t('exp.story.h'), 'story'));
    const p = el('p', 'dw-story-text');
    const leader = heroById(SYS.game.partyOf(G)[0]);   // 고른 편성의 리더 — 편성 고르개를 바꾸면 따라 바뀐다 (§4-1 · R122)
    p.textContent = fillStory(L(stageStory(z)), lang(), { leader: leader ? leader.name : null, fallback: t('exp.story.noLeader') });
    box.appendChild(p);
    return box;
}

/** 편성 번호의 이름 — 도는 원정의 편성이면 「원정 중」을 붙인다(영웅 띠의 「원정 중」과 같은 말 · 색) (§15 · §4-1) */
const presetLabel = (no, ps) => t('pt.preset', { n: M.roman(no) })
    + (ps.runNos.includes(no) ? `<span class="pt-run">${t('hs.doing.expedition')}</span>`
        : ps.presets[no - 1]?.exploring ? `<span class="pt-run">${t('hs.doing.explore')}</span>` : '');   // 탐험에 나간 편성 — 명단이 잠긴다 (2026-10-10 · ADR-0582)

/** 편성이 **다 열렸을 때의 개수** — 건물을 다 지은 판의 상한을 `limitsOf` 에 묻는다(상한 함수는 `state.buildings` 만 읽는다 ·
 *  기본값 + 더하기를 렌더러가 따로 셈하지 않는다). 출정 창 편성 버튼의 높이가 이 수로 나뉜다 (§4-1 · ADR-0442) */
const presetFull = () => SYS.game.limitsOf({ buildings: Object.fromEntries(SYS.construction.list.map(b => [b.id, b.maxRank])) }).presets;

/**
 * 창의 **편성** 칸 — 아래 줄 왼쪽 · 적 구성 아래 [2026-09-21 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0193 · 자리는 ADR-0214].
 * 왼쪽에 편성 버튼이 세로로 · 오른쪽에 **고른 편성의 영웅 셋이 초상으로**. 초상은 **읽기 전용**이다 — 고치려면 편성 탭으로 간다.
 * 초상은 **셋만큼 자리를 늘 잡는다**(덜 찬 자리는 점선 빈 칸) — 편성마다 인원이 달라도 창이 안 흔들린다(적 구성이 넷을 잡는 것과 같다).
 * 고른 값은 편성 탭 고르개와 **하나다**(`selectPreset`).
 */
function presetPick() {
    const ps = SYS.game.presetState(G);
    const cur = ps.presets[ps.activeNo - 1];
    const hb = el('div', 'dw-block');
    hb.appendChild(helpHeading('div', 'sub-h', t('nav.party'), 'team'));
    const row = el('div', 'pk-row');
    const btns = el('div', 'pk-btns');
    btns.style.setProperty('--pk-n', presetFull());   // 버튼 높이 = 기둥 ÷ 다 열렸을 때의 개수 — 덜 열렸으면 위에서부터 서고 아래가 빈다 (ADR-0442)
    for (const p of ps.presets) {
        const b = el('button', `btn sm${p.no === ps.activeNo ? ' on' : ''}`, presetLabel(p.no, ps));
        b.onclick = () => { SYS.game.selectPreset(G, p.no); save(); render(); };
        btns.appendChild(b);
    }
    row.appendChild(btns);
    const faces = el('div', 'pk-faces');
    for (let i = 0; i < SYS.game.limitsOf(G).party; i++) {
        const h = heroById(cur.party[i]);
        const c = el('div', `pk-face${h ? '' : ' empty'}`);
        if (h) {
            c.style.borderTopColor = tierColor(h);
            // 띠 카드와 같은 얼굴 — 위칸(지금 하는 일 · 이름) · 오른쪽 아래 레벨 · 첫 자리는 리더 [2026-09-24 사용자 지시 · ADR-0317].
            //   보내기 직전이라 「이 영웅이 지금 다른 부대로 나가 있나 · 수색 중인가」를 여기서 읽는다
            c.innerHTML = heroCardHtml(h, { leader: i === 0 });
            bindTipNode(c, () => heroTipCard(h, combatOf(h), itemOf, it => equippedItemTipCard(h, it)), { anchor: true, holdOnAlt: true });
        }
        // 초상 아래 스킬 칸 줄 [2026-10-09 사용자 지시 · ADR-0568] — 그 영웅의 액티브를 **앞에서부터** ·
        //   **전직 스킬은 늘 맨 오른쪽 칸**(책 칸이 비어도 안 당겨진다 — 관전 카드 `battle.js:cdSlots` 와 같은 배치 · ADR-0591) ·
        //   카드의 숫자 재료는 캐릭터 탭 스킬 칸과 같다(밑수 셋 + 능력치) · 빈 자리는 높이만 잡는다
        const cb = h ? combatOf(h) : null;
        const seat = el('div', 'dw-seat');
        seat.append(c, h
            ? seatSkills(seatOrder(activeCells(h).filter(Boolean)), { period: cycleOf(h), ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats, cdr: cb.cooldown_reduction, skillTags: cb.option_fx?.skillTags, atkPct: cb.atk_pct_sum, healOut: cb.option_fx?.healOut })
            : seatSkills([], {}, true));
        faces.appendChild(seat);
    }
    row.appendChild(faces);
    hb.appendChild(row);
    return hb;
}

/**
 * 창의 **들고 가는 것** — 아래 줄 오른쪽 칸의 **왼쪽 묶음** [2026-09-21 사용자 지시 · §4-1 · ADR-0216].
 * 고른 편성이 **무엇을 들고 가는지**(물약 칸)와 **어떤 조건이 켜져 있는지**(파티 전술)를 보내기 바로 옆에서 읽는다 —
 * 출발은 되돌릴 수 없고(ADR-0111) 둘 다 **파티에 따라 달라지는 값**이라, 확인할 마지막 지점이 여기다.
 * **읽는 자리다 — 클릭도 드래그도 없다.** 고치는 자리는 편성 탭(§15) 하나다 (ADR-0193 · ADR-0192).
 * 문구는 **편성 탭이 쓰던 키를 그대로** 부른다 — 새 i18n 키가 없다.
 */
function loadBox() {
    const box = el('div', 'dw-load');
    const ps = SYS.game.presetState(G);
    box.appendChild(tacticReadBlock());
    // 물약 칸 아래에 자동 분해 — 고른 편성의 격자 + [바꾸기] (ADR-0717). 한 줄에 넷을 세우면 출정 방식 칸을 민다(창 폭 ADR-0441 은 물약 넉 칸 기준)
    const col = el('div', 'dw-col');
    col.append(potionReadBlock(ps), salvReadBlock(ps.activeNo));
    box.appendChild(col);
    return box;
}

/** 전술 읽기 칸 — 열린 칸의 **효과 줄**만. 조건 문장은 툴팁이 들고(칸이 좁다), 조건을 못 채운 칸은 흐리다.
 *  값은 `tacticState` 가 **고른 편성의 칸 · 파티**로 센다 (§15 · ADR-0250). 출정 창과 결투장 판(ADR-0495)이 같이 쓴다
 *  @param emptyKey 열린 칸이 없을 때 찍을 문구 키 — 없으면 아무것도 안 찍는다(출정 창) */
function tacticReadBlock(emptyKey = null) {
    const tac = el('div', 'dw-block dw-tac');
    tac.appendChild(helpHeading('div', 'sub-h', t('rs.h'), 'tactics'));
    for (const s of SYS.game.tacticState(G).slots) {
        if (!s.open || !s.option) continue;
        const row = el('div', `dw-tac-row${s.active ? ' on' : ''}`,
            `<span class="rs-eff">${optionEffect(s.option, s.value)}</span>`
            + condCounter(s.option, s.have, s.need));
        row.title = `${condText(s.option)} · ${t(s.active ? 'rs.on' : 'rs.off')}`;
        tac.appendChild(row);
    }
    if (emptyKey && tac.childElementCount === 1) tac.appendChild(el('span', 'muted', t(emptyKey)));
    return tac;
}

/** 물약 읽기 칸 — 고른 편성의 칸. 편성 탭과 같은 칸이고 **모자란 칸은 흐린 점선**이다(그 칸은 빈 채로 나간다) · 출정 창과 결투장 판이 같이 쓴다 */
function potionReadBlock(ps) {
    const pot = el('div', 'dw-block dw-pot');
    pot.appendChild(helpHeading('div', 'sub-h', t('pt.potion.h'), 'potions'));
    const belt = el('div', 'p-belt');
    const slots = ps.presets[ps.activeNo - 1].potionSlots;
    for (const s of slots) {
        const c = el('span', `p-slot${s ? ' full' : ''}${s?.short ? ' short' : ''}`, s ? potionImg(s.id) : potionImg(null));
        // 읽는 자리라 손은 없지만 카드는 편성 탭과 같은 것이 선다 (§2 「물약 툴팁 규격」 · ADR-0315)
        bindTipNode(c, () => potionTipCard(s?.id));
        belt.appendChild(c);
    }
    // 안 열린 칸 — 편성 탭과 같은 자물쇠 칸 (ADR-0716)
    for (let i = slots.length; i < ps.slotCap; i++) belt.appendChild(potionLockSlot('p-slot', i));
    pot.appendChild(belt);
    return pot;
}

/**
 * 창의 속 — **이름 붙은 칸 넷이 격자 하나에 2×2** 로 선다 (ADR-0088). 갈 곳은 위 목록에서 이미 골랐고, 여기서 **어느 편성을** 보낼지 고른다.
 *   위 줄   ① **적 구성** ↔ ② **이야기** — 어떤 곳인가. **읽는 자리 둘**(클릭 없음)
 *   아래 줄 ③ **편성** ↔ ④ **들고 가는 것(전술 · 물약) + 출정 방식** — 누구를 보내나 ↔ 무엇을 들고 · 갈까. **누르는 자리 둘**
 *   [2026-09-21 사용자 지시 · ADR-0216] ④ 는 한 칸에 셋이다 — 왼쪽에 전술 효과 · 물약 칸(읽기 전용), **칸 오른쪽 끝**에 출정 방식.
 *   [2026-09-21 사용자 지시 · ADR-0214] **줄이 곧 동사다** — 왼쪽 열은 초상끼리(적 넷 ↔ 영웅 셋) 위아래로 마주 서고, 오른쪽 열은 글(이야기)과 버튼(출정 방식)이다.
 *   [2026-09-21 사용자 지시 · ADR-0193] 창은 **편성을 짜지 않는다** — 영웅 띠와 진형 보드는 편성 탭(§15)으로 갔고, ③은 편성 고르개 + 초상 셋이다.
 *   칸 넷이 **격자의 직접 자식**이다 — 줄마다 감싸면 두 줄의 열 폭이 따로 잡혀 파티 전술이 이야기와 같은 세로줄에 안 선다.
 *   가림막은 클래스가 세운다 — 오른쪽 열 `dw-c2` · 아래 줄 `dw-r2` (style.css `.dw-body`).
 *   [2026-09-22 사용자 지시 · ADR-0292] 세로 구분선은 **줄마다 하나** — 위 줄은 이야기 왼쪽, 아래 줄은 **출정 방식 왼쪽**(`.fp-side`)이다.
 */
function departBody() {
    const z = D.stages[state.expStage];
    const body = el('div', 'dw-body');
    const story = storyBox(z), pick = presetPick(), prep = el('div', 'dw-prep');
    body.appendChild(foeBox(z));              // ① 적 구성 — 위 줄 왼쪽 · 읽는 자리다(클릭 없음)
    story.classList.add('dw-c2');             // ② 이야기 — 위 줄 오른쪽 · 남는 열 폭을 받는다 · 읽는 자리다(클릭 없음)
    pick.classList.add('dw-r2');              // ③ 편성 — 아래 줄 왼쪽 · 적 구성 아래 · 고르개 + 초상 셋(읽기 전용)
    prep.classList.add('dw-c2', 'dw-r2');     // ④ 아래 줄 오른쪽 — 칸(가림막)은 열 폭 전체이고 속이 양끝으로 갈린다(`.dw-prep` 의 space-between) · 칸 왼쪽 선은 없다(ADR-0292)
    prep.appendChild(loadBox());              //    왼쪽 — 전술 효과 + 물약 칸(읽기 전용 · ADR-0216)
    prep.appendChild(goBox(z));               //    오른쪽 끝 — 출발 칸 + 경고 + 반복 원정 + 보내기(제 폭을 든다 · 왼쪽에 이 줄의 세로선 · `.fp-side`)
    body.appendChild(story);
    body.appendChild(pick);
    body.appendChild(prep);
    return body;
}

/** 이 출발이 **다른 일을 하던 영웅을 데려가나** — 고른 편성이 나갈 수 있고(`game.canDepart`) 그 안에 하던 일이 있는 영웅이 있을 때 참이다.
 *  판정은 `game.heroBusy` 가 낸다 · `'run'` 은 여기서 안 센다 — 나갈 수 있는 편성에서 그것은 **제 부대**이고 끊는 일은 `departCuts` 가 따로 묻는다(ADR-0629) */
const departPulls = stageId => SYS.game.canDepart(G, stageId, now()) === null
    && SYS.game.partyOf(G).some(uid => { const busy = SYS.game.heroBusy(G, uid); return busy !== null && busy !== 'run'; });
/** 이 출발이 **원정 중인 제 부대를 끊나** — 고른 편성이 나갈 수 있고 그 안에 지금 원정에서 싸우는 영웅이 있을 때 참이다
 *  [2026-10-15 · PLAN_user_review 2-5 · ADR-0629 — ~~묻지 않고 끊는다~~(ADR-0111)]. 끊는 일 자체는 그대로다(철수와 같다) */
const departCuts = stageId => SYS.game.canDepart(G, stageId, now()) === null
    && SYS.game.partyOf(G).some(uid => SYS.game.heroBusy(G, uid) === 'run');

/** 출정 확인 창 — 문장 하나 + [확인] · [취소] [2026-09-30 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0467]. 해고 창과 같은 상자다(`.dismiss-box`).
 *  [확인] = 출정 창의 [보내기]가 하던 일 그대로 · [취소] = 출정 창으로 돌아간다(고른 칸 · 편성 · 반복 스위치는 화면 상태라 그대로다) */
function departConfirmBody() {
    const box = el('div', 'dismiss-box');
    // 창이 섰을 때의 칸 — [확인]이 이 칸으로 보낸다(출정 창의 [보내기]와 같다). 그새 바퀴를 넘어 고른 칸이 걷혀도 빈 칸으로 출발하지 않는다 (#90)
    const sid = state.expStage;
    // 문장은 까닭마다 한 줄 — 제 부대를 끊는다(ADR-0629) · 다른 일을 하던 영웅을 데려간다(ADR-0467). 둘 다면 둘 다 선다
    if (departCuts(sid)) box.appendChild(el('div', '', t('exp.departCut')));
    if (departPulls(sid)) box.appendChild(el('div', '', t('exp.departBusy')));
    const actions = el('div', 'dismiss-actions');
    const ok = el('button', 'btn primary', t('ui.ok'));
    ok.onclick = () => { state.modal = null; runBattle(sid, { repeat: state.expRepeat }); };
    const no = el('button', 'btn', t('ui.cancel'));
    no.onclick = () => openModal('depart');
    actions.appendChild(ok);
    actions.appendChild(no);
    box.appendChild(actions);
    return box;
}

/* ═══════════ 리포트 — 왼쪽 런 목록 · 오른쪽 상세 (SCREEN_DESIGN §4-3 · ADR-0063) ═══════════
   반복 원정은 이기는 동안 런을 잇고, 끝난 런은 `G.reports` 맨 앞에 쌓인다(세이브 v21 · 상한 balance:report_keep).
   왼쪽은 **고르는 자리**(한 줄 = 한 런) · 오른쪽은 **읽는 자리**다. 고른 줄은 `state.repSel`(화면 상태 — `null` 이면 맨 위를 따라간다). */

/** 리포트 목록은 **끝난 원정만** 든다 (§4-3 · ADR-0123) — 도는 원정의 리포트도 `G.reports` 맨 앞에 서서 라운드마다 차지만
 *  (끊기면 그 값으로 선다 · INTERFACE §2-7) 목록에는 안 선다. 지금 도는 것은 관전이 든다 */
const runningReport = R => { const s = G.runs?.[(R.preset ?? 0) - 1]; return R.reason == null && s?.active === true && R.at === s.lastAt; };
const doneReports = () => G.reports.filter(R => !runningReport(R));
/** 리포트가 보는 부대 — 부대 탭이 고른 것 · 아직 안 골랐으면 고른 편성 · 열린 편성 수 안으로 자른다 (§4-3 · ADR-0622) */
const repNo = () => Math.min(Math.max(1, state.repNo ?? G.preset ?? 1), G.presets.length);
/** 그 리포트의 부대 — 부대 번호가 없는 옛 리포트(v38 전)는 1부대 (INTERFACE §2-7) */
const repPresetOf = R => R.preset ?? 1;
/** 리포트로 간다 — 맨 위를 따라간다 · `no` 를 주면 그 부대의 탭을 연다(관전 · 철수에서 넘어온 부대) · 안 주면 마지막으로 본 부대 (ADR-0622) */
const toReport = no => { if (no) state.repNo = no; state.repSel = null; state.exp = 'report'; };

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

/** 런 목록 — 최신이 맨 위. 줄 클릭이 오른쪽 상세를 바꾼다. 화면 전환 세그먼트는 상단바에 선다 (ADR-0094) ·
 *  맨 위에 부대 탭 — `list` 는 이미 그 부대(`no`)의 런만이다 (§4-3 · ADR-0622) */
function runListPanel(list, idx, no) {
    const p = el('div', 'panel rep-runs');     // 높이는 박스가 정한다 — 목록은 받은 높이를 채우고 안에서 스크롤 (ADR-0097)
    p.appendChild(helpHeading('h2', '', `${t('rep.list.h')} <small>${t('rep.list.sub', { n: list.length })}</small>`, 'reports'));
    // 부대 탭 — 이름은 인벤토리 부대 버튼과 같다 · 「전체」는 없다 · 누르면 그 부대의 맨 위를 따라간다 (ADR-0622)
    const tabs = segmented(G.presets.map((_, i) => ({ id: i + 1, label: t('pt.preset', { n: M.roman(i + 1) }) })), no,
        n => { state.repNo = n; state.repSel = null; render(); });
    tabs.classList.add('rep-party');
    p.appendChild(tabs);
    const box = el('div', 'rep-list');
    box.dataset.keep = `rep-list-${no}`;     // 줄을 눌러 다시 그려도 목록 스크롤이 남는다 (ADR-0097) · 부대마다 따로
    if (!list.length) box.appendChild(el('div', 'rep-empty muted', t('rep.list.empty')));
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
                <div class="s muted">${t('rep.drops.sub', { n: dropCount(R) })}</div>
            </div>`;
        row.onclick = () => { state.repSel = i === 0 ? null : R; render(); };   // 맨 위를 고르면 따라가기로 돌아간다 (ADR-0123)
        box.appendChild(row);
    });
    p.appendChild(box);
    return p;
}

/** 처치 재료 칸 — 재료 하나가 칸 하나 · 광석 → 목재 → 약초 순 (§4-3 · ADR-0530 · 옛 리포트는 `materials` 가 없다) */
const DROP_KIND_ORDER = ['ore', 'wood', 'herb'];
const dropMats = R => Object.entries(R.materials ?? {}).filter(([, n]) => n > 0)
    .sort(([a], [b]) => DROP_KIND_ORDER.indexOf(resKind(a)) - DROP_KIND_ORDER.indexOf(resKind(b)));
/** 획득 아이템 수 = 격자의 칸 수(장비 + 스킬북 + 도안 + 재료). 상세와 원정 기록이 같은 셈을 쓴다. */
const dropCount = R => R.drops.length + (R.books ?? []).length + (R.blueprints ?? []).length + dropMats(R).length;
/** 스킬 도안 칸의 왼쪽 위 배지 — 리포트 획득 격자 · 상단 도안 칸이 같은 것을 단다(그림이 책과 같은 스킬 그림이라 갈린다 · ADR-0680) */
const bpTag = () => `<span class="inv-check bp-tag">${t('rep.blueprint')}</span>`;

/** 획득 아이템 — **가방 칸과 같은 그림 · 같은 테두리 · 같은 비교 툴팁**(§6).
 *  **리포트는 보기 전용이다** [2026-09-21 · ADR-0186] — 분해 · 장착 · 이동은 전부 캐릭터 탭(§6)이 든다.
 *  **자리가 런마다 같다** (ADR-0086) — 격자는 한 줄 높이로 못박히고 「없음」도 그 안에 선다. 넘쳐 분해한 수는 머리 줄 안으로 (ADR-0625) */
function dropSection(p, R) {
    // 떨어진 스킬 도안도 이 격자에 선다 — 장비 칸 뒤에 이어서 (§4-3 · ADR-0420 · ADR-0680 · 옛 리포트는 `blueprints` 가 없다)
    const bps = R.blueprints ?? [];
    const books = R.books ?? [];
    const mats = dropMats(R);
    const head = helpHeading('h2', '', `<span>${t('rep.drops.h')} <small>${t('rep.drops.sub', { n: dropCount(R) })}</small></span>`, 'drops');
    p.appendChild(head);
    const tail = el('span', 'rep-h-tail');
    if (R.discarded) tail.appendChild(el('small', 'down', t('rep.discarded', { n: R.discarded })));
    head.appendChild(tail);
    const box = el('div', 'rep-drops rep-cut');
    p.appendChild(box);
    if (!R.drops.length && !books.length && !bps.length && !mats.length) { box.appendChild(el('div', 'muted rep-note', t('rep.drops.none'))); return; }
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
    // 첫 레벨 보상은 완성된 스킬북이다 — 도안과 구분하는 배지로 표시한다.
    for (const b of books) {
        const cell = el('div', 'inv-cell filled book-cell');
        cell.innerHTML = `<span class="inv-icon">${skillImg(skillInfo(b.id))}</span><span class="inv-check bp-tag">${t('rep.book')}</span>`;
        bindTipNode(cell, () => skillTipCard({ id: b.id }, {}));
        grid.appendChild(cell);
    }
    // 스킬 도안 칸 — 스킬 그림 + 왼쪽 위 「도안」 배지 · 흐려지지 않는다(떨어진 도안은 전부 재고에 쌓인다 · ADR-0680) · 올리면 설명창(주인 없음 — 식만)
    for (const b of bps) {
        const cell = el('div', 'inv-cell filled book-cell');
        cell.innerHTML = `<span class="inv-icon">${skillImg(skillInfo(b.id))}</span>${bpTag()}`;
        bindTipNode(cell, () => skillTipCard({ id: b.id }, {}));
        grid.appendChild(cell);
    }
    // 처치 재료 칸 — 창고 재료 탭(§6)과 같은 그림 · 같은 오른쪽 아래 숫자(이 런이 준 수) · 흐려지지 않는다(전부 재고에 든다) · 올리면 이름 + 획득 수 (ADR-0530)
    for (const [id, n] of mats) {
        const icon = M.materialIcon(id);
        const kind = resKind(id);
        const cell = el('div', 'inv-cell filled mat-cell');
        cell.innerHTML = `<span class="inv-icon res-${kind}">${icon ? `<img src="${icon}" alt="" draggable="false">` : M.RES_ART[kind] ?? ''}</span>`
            + `<span class="inv-lv">${n.toLocaleString()}</span>`;
        bindTipNode(cell, () => el('div', 'tip-card', `<div class="tip-name">${resName(id)}</div><div class="tip-sub">${t('rep.matGot', { n: n.toLocaleString() })}</div>`));
        grid.appendChild(cell);
    }
    box.appendChild(grid);
}

/**
 * 기여 표 한 판의 마크업 — **정산본이든 재생 중 누계든 같은 함수가 그린다** (숫자의 출처만 다르다).
 * 영웅 한 줄에 다섯 칸(`영웅 / 가한 / 받은 / 처치 / 쓰러짐`) — **견주는 값이라 칸으로 세운다.** 쓰러짐은 진 런의 사실이다(`report.fall` · ADR-0623)
 * 왼쪽 칸은 **초상 + 이름** — 상세가 넓어 이름만 두면 칸이 빈다(영웅의 생김새는 어디서나 같다 · §5).
 * 「가한」·「받은」은 **같은 폭 · 같은 모양**이고, **막대 폭이 곧 점유율**이다 — 칸 전체가 100%(= 파티 합계).
 *   최대값을 기준으로 그리면 1등이 언제나 꽉 차서 **막대와 옆의 숫자가 서로 다른 말을 한다**(41%인데 가득 찬 막대).
 * 정렬은 가한 피해 내림차순 — 재생 중에는 앞서는 순서가 그대로 뒤바뀐다(누가 앞서나가 보인다).
 * **영웅에게 일어난 일도 이름 칸이 든다** (ADR-0086) — 이름 아래 레벨업 `▲ Lv.a → b` · 쓰러졌으면 초상이 회색.
 *   줄 높이는 초상이 정하므로 표시가 붙어도 표가 안 자란다. `marks` = `{ up: Map(uid → {from, to}), down: Set(uid), xp: Map(uid → 받은 경험치) }`
 *   **받은 경험치도 이름 아래**다 (R89) — 쓰러진 영웅은 그 뒤 라운드 몫이 없어 영웅마다 다르다.
 *   레벨업 · 경험치는 **한 줄씩 쌓는다**(위 레벨업 · 아래 경험치) — 한 줄에 이으면 이름 칸이 좁아 레벨업이 잘렸다 [2026-10-17 · ADR-0653]
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
        <span>${t('rep.contrib.kills')}</span>
        <span>${t('rep.fall.h')}</span></div>`;
    const body = rows.map(c => {
        const h = heroById(c.uid);
        const lu = marks.up.get(c.uid), down = marks.down.has(c.uid), xp = marks.xp?.get(c.uid);
        const up = lu ? t('rep.contrib.levelUp', { a: lu.from, b: lu.to }) : '';
        // 이름 아래 — 레벨업 한 줄(오른 영웅만) · 그 아래 받은 경험치 한 줄. 경험치가 없는 옛 표시(`xp` 없음)는 레벨업만 (ADR-0086 · ADR-0653)
        const sub = (up ? `<em class="up">${up}</em>` : '')
            + (xp != null ? `<em class="xp">${t('rep.contrib.xp', { n: xp.toLocaleString() })}</em>` : '');
        return `<div class="ct-row">
            <span class="n${down ? ' dead' : ''}"${down ? ` title="${t('rep.downed')}"` : ''}>${h ? heroFace(h) : ''}<span class="nm"><b>${h ? L(h.name) : '—'}</b>${sub}</span></span>
            ${cell('dealt', Math.round(c.dealt), sumD)}
            ${cell('taken', Math.round(c.taken), sumT)}
            <span class="v">${c.kills}</span>
            <span class="f">${fallText(marks.fall?.get(c.uid))}</span></div>`;
    }).join('');
    // 합계 — 「이 파티가 이 판에서 몇을 때렸고 몇을 맞았나」. 다음 판과 견주는 기준선이라 눈이 더하게 두지 않는다
    const total = `<div class="ct-row total">
        <span class="n"><b>${t('rep.contrib.total')}</b></span>
        <span class="d"><b>${sumD.toLocaleString()}</b></span>
        <span class="d"><b>${sumT.toLocaleString()}</b></span>
        <span class="v">${sum('kills')}</span>
        <span></span></div>`;
    // 빈자리 — 파티 정원까지 **줄만 잡는다**. 인원이 적은 런만 표가 짧아지면 상세가 런마다 흔들린다 (ADR-0086)
    const pad = `<div class="ct-row pad"><span class="n"><span class="hero-face"></span></span><span></span><span></span><span></span><span></span></div>`
        .repeat(Math.max(0, SYS.game.limitsOf(G).party - rows.length));
    return head + body + pad + total;
}

/** 영웅 줄에 붙는 표시 — 정산본에서 읽는다. 레벨업은 uid → {from, to} · 전투불능은 uid 집합 (ADR-0086) */
const marksOf = R => ({
    up: new Map((R.levelUps ?? []).map(lu => [lu.uid, lu])),
    down: new Set(R.downed ?? []),
    xp: new Map(Object.entries(R.xp ?? {})),     // 영웅별 받은 경험치 (R89)
    // 쓰러짐 — uid → 쓰러진 기록(다시 쓰러졌으면 마지막 것) · 진 런의 `fall.downs` (ADR-0623) · 클리어 · 옛 리포트는 비어 `—`
    fall: new Map((R.fall?.downs ?? []).map(f => [f.uid, f])),
});
/** 런 시각 `m:ss` — 쓰러진 순간 (리포트 쓰러짐 칸 · ADR-0623) */
const clockText = sec => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** 쓰러짐 칸 — `시각 ← 가장 많이 때린 몬스터 그 몫 %` · 기록이 없으면 `—` (§4-3 · ADR-0623) */
const fallText = f => (!f ? '—' : f.by
    ? t('rep.fall.cell', { t: clockText(f.t), who: L(monsterName(f.by)), p: f.taken ? Math.round(100 * f.dmg / f.taken) : 0 })
    : clockText(f.t));
/**
 * 남은 적 줄 — 기여 표 아래 · **모든 런이 자리를 잡는다**(클리어 · 철수 · 옛 리포트는 `—`) (§4-3 · ADR-0623).
 * 끝난 순간 서 있던 적 `이름 HP%` — 같은 몬스터 · 같은 % 는 `×n` 으로 묶는다(서 있던 순서) · 레벨 차가 있으면 `레벨 차 n → 명중 −p%`(p = `formula.hitLevelMult`)
 */
function foesLine(R) {
    const f = R.fall;
    const groups = [];
    for (const e of f?.foes ?? []) {
        const p = e.max ? Math.round(100 * e.hp / e.max) : 0;
        const g = groups.find(x => x.id === e.id && x.p === p);
        if (g) g.n += 1; else groups.push({ id: e.id, p, n: 1 });
    }
    const parts = groups.map(g => t(g.n > 1 ? 'rep.foes.many' : 'rep.foes.one', { name: L(monsterName(g.id)), p: g.p, n: g.n }));
    if (f?.gap > 0) parts.push(t('rep.gap', { n: f.gap, p: M.pctNum(1 - SYS.formula.hitLevelMult(1, 1 + f.gap)) }));
    return el('div', 'rep-foes', `<span>${t('rep.foes')}</span><b>${parts.length ? parts.join(' · ') : '—'}</b>`);
}
/** 리포트 윗줄의 경험치 = 파티가 받은 **합** — 영웅마다 다르므로(쓰러진 영웅은 그 뒤 라운드 몫이 없다) 각자 몫은 기여 표가 든다 (R89) */
const xpSum = R => Object.values(R.xp ?? {}).reduce((a, b) => a + b, 0);

/** 기여 — 끝난 원정의 집계(`report.contrib`)를 그린다. 도는 원정의 누계는 관전의 누적 데미지 판이 든다 (§4-2 · ADR-0123)
 *  집계가 아예 없는 옛 리포트(v20 이하 이관본)는 **자리만 잡고 안 그린다** — 0 을 지어내면 「못 때렸다」로 읽히고,
 *  상자를 빼면 그 런만 상세가 짧아진다 (ADR-0086) */
function contribSection(p, R) {
    const has = !!R.contrib?.length;
    p.appendChild(helpHeading('h2', has ? '' : 'void', `<span>${t('rep.contrib.h')}</span>`, 'contribution'));
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
/* 앱 시계가 부른 그리기 [2026-09-24 · SCREEN_DESIGN §4 · ADR-0338] — 관전 밖의 라운드 정산 · 런 끝 · 앱 시계가 세운 다음 런은 곧바로 안 그리고
   **다음 눈금에 한 번** 그린다(같은 눈금의 여럿은 한 번). 툴팁이 떠 있거나 누르고 있으면(카드를 끄는 중) 풀릴 때까지 미룬다 —
   곧바로 그리면 정산마다 떠 있던 툴팁이 꺼지고, 끌던 카드가 DOM 에서 빠져 고스트가 한 장 위에 남았다.
   다른 까닭(클릭 · 탭 이동)으로 그렸으면 `render()` 가 이 표시를 지운다 — 그 그리기가 이미 지금 상태를 그렸다 */
let clockRender = false;
/* 관전 화면의 보관 칸 갈아 끼우기도 같은 길이다 [ADR-0341] — 관전이 떠 있으면 전체를 다시 그리지 않고(재생기를 안 걷는다) 보관 칸만 바꾸는데,
   그것도 다음 눈금 · 손이 빈 뒤다. 곧바로 바꾸면 칸 위의 툴팁이 주인을 잃어 접혔다(4배속이면 몇 초마다) */
let bagStale = false;
let pointerHeld = false;      // 누르고 있는 중 — `startClocks` 가 창 전체에서 잰다
// 자원 미니게임이 도는 동안도 손이 바쁘다 — 미뤄 둔 그리기가 판 도중에 창을 다시 세우지 않게 (§8 · ADR-0532)
const handBusy = () => pointerHeld || !!$('#tooltip')?.classList.contains('show') || mgRun?.phase === 'play'
    || !!$('.help-search-input:focus');   // 검색 중에는 시계 갱신이 한글 조합 입력을 끊지 않는다 (ADR-0947)

/** 런이 끝나는 시각 — **마지막 라운드가 계산되기 전엔 모른다**(무한대). 계산되면 결과의 `reason` 이 서고 그 끝이 곧 런의 끝이다 (R89) */
const runEnd = B => (B.result.reason != null ? B.result.durationSec : Infinity);
/** 원정 세그먼트의 관전 칸 상태 — 'none'(관전할 원정 없음) · 'live'(도는 중) · 'over'(**재생 위치가 런의 끝에 닿았다** — 결과 띠가 서는 순간) (ADR-0147).
 *  관전이 떠 있으면 위치는 재생기가 들고, `render()` 첫 줄이 `resume` 에 받아 둔 뒤 이것을 읽는다 */
const battlePhase = B => (!B ? 'none' : (B.resume?.t ?? 0) + 1e-9 >= runEnd(B) ? 'over' : 'live');

/* ═══ 원정 중 교체 [2026-09-21 · R130 · SCREEN_DESIGN §4 · ADR-0272] ═══
   바꾼 장비 · 스킬 트리는 보스전에서도 그 순간 전투에 먹는다(다음 눈금의 `game.stepRun` 첫머리).
   교체로 도는 원정의 전술이 꺼졌으면 그 효과 줄을 알린다 — 판정은 `game.runTactics` 가 낸다(렌더러는 세지 않는다) */
const liveRun = () => (state.battle?.run && !state.battle.run.done ? state.battle.run : null);
/** 바꾸기 전의 도는 원정 전술 — 교체 뒤 `runChangeFlash` 에 넘긴다 (원정이 없으면 빈 목록) */
const runTacticsNow = () => { const run = liveRun(); return run ? SYS.game.runTactics(G, run) : []; };
/** 교체 뒤 플래시 — 바꾼 영웅(`uid`)이 도는 원정의 인원이고 교체로 전술이 꺼졌을 때 그 효과 줄을 알린다 */
function runChangeFlash(uid, before = []) {
    const run = liveRun();
    if (!run || !run.party.includes(uid)) return;        // 벤치 영웅의 교체는 도는 원정과 무관하다
    const off = SYS.game.runTactics(G, run).filter((m, i) => before[i]?.active && !m.active);
    if (off.length) flash('exp.tactic.off', { eff: off.map(m => optionEffect(m.option, m.value)).join(' · ') });
}
/** 가방 툴팁의 「끼우면 꺼지는 전술」 줄 — 장착 대상이 도는 원정의 인원이고 끼우면 그 원정의 전술이 꺼질 때만 (§6 · R130) */
function runTacticHint(h, it) {
    const run = liveRun();
    // 원정 인원이 아니면 말할 것이 없다 — 쓰러진 영웅도 전술 조건에는 든다(나간 인원 전원을 센다 · R176)
    if (!run || !h || !run.party.includes(h.uid)) return '';
    const now = SYS.game.runTactics(G, run);
    if (!now.some(m => m.active)) return '';            // 켜진 전술이 없으면 꺼질 것도 없다 — 칸마다 사본을 안 만든다
    const off = SYS.game.runTacticsIf(G, run, h.uid, it.uid).filter((m, i) => now[i]?.active && !m.active);
    return off.length ? t('tip.tacticOff', { eff: off.map(m => optionEffect(m.option, m.value)).join(' · ') }) : '';
}

/**
 * 걸음 [2026-09-14 · R89 · **2026-09-21 · R130** · SCREEN_DESIGN §4] — 원정을 진행 시각까지 계산한다(`game.stepRun`). 끝난 라운드는
 * 정산하고(이긴 라운드만 보상) 다음 라운드를 연다 · 원정 중 바꾼 장비 · 스킬 트리는 이 걸음의 첫머리에 먹는다. 한 번에 여러 라운드를 넘을 수 있다(숨긴 탭).
 * **시각을 미는 쪽 둘**(관전 재생기의 `onTime` · 앱 시계 `expTick`)이 시각을 밀기 전에 부른다 — 정산을 부르는 곳은 여기 한 곳이다
 * @returns 정산한 라운드 수
 */
function advanceBattle(B, tNow, at, speed = 1) {
    if (!B?.run || B.run.done) return 0;
    // 걸음 — 엔진을 이 시각까지만 민다. 첫머리가 그 순간의 장비 · 스킬 트리로 갈아입히므로 원정 중 교체가 **바꾼 시각에** 먹는다 (R130)
    const n = SYS.game.stepRun(G, B.run, tNow).rounds ?? 0;
    // 원정 플레이 시간 — 이 걸음에 재생 시각이 나아간 만큼을 부대별로 모은다(런의 끝에서 자른다 · 되감기는 안 나아간다) · 더하는 것은 `expTimeTick` (ADR-0514)
    const reach = Math.min(tNow, runEnd(B)), from = B.expT ?? B.resume?.t ?? 0;
    if (reach > from) { const k = B.run.preset ?? 0; expPend[k] = (expPend[k] ?? 0) + (reach - from); B.expT = reach; }
    if (n) { save(); onRoundsSettled(); }
    return n;
}

/**
 * 런이 끝난 순간 [2026-09-22 · ADR-0300 · **개정 2026-10-17 · ADR-0654**] — 박자(`pace.js`)가 `end` 에 닿은 실제 시각을 적는다.
 * 엔진이 끝난 순간이 아니다 — 엔진은 박자가 내다보는 만큼 앞서 가고, 그 사이 세움(마지막 행동의 ①)이 남아 있을 수 있다.
 * 반복의 다음 출발(`game.nextRepeat`) · 챕터보스 재등장(`noteRunEnd` · R240)이 이 값에서 센다 — 관전 재생기(`onDone`)와 앱 시계(`tickBattle`)가 같이 부른다
 */
function noteEnded(B, at) {
    if (!B?.run?.done || B.endedAt != null) return;
    B.endedAt = at;
    SYS.game.noteRunEnd(G, B.run, B.endedAt);
}

/** 그 부대의 박자 — 런 핸들이 든다(새 런 = 새 핸들 = 새 박자). 없으면 재생 위치에서 연다 */
const paceOfRun = B => (B.pace ??= paceAt(B.result.timeline, B.resume?.t ?? 0));

/** 라운드가 정산됐다 — 가방 · 골드 · 레벨 · 리포트가 바뀌었다. 관전이 떠 있으면 재생기를 걷지 않고 **골드는 곧바로 · 보관 칸은 다음 눈금에**,
 *  아니면 보던 화면을 **다음 앱 시계 눈금에** 다시 그린다 — 둘 다 조작(툴팁 · 누름) 중이면 끝날 때까지 미룬다 (ADR-0338 · ADR-0341) */
function onRoundsSettled() {
    if (document.hidden || !G || state.screen !== 'game') return;
    if (stopBattle) { refreshGold(); bagStale = true; return; }
    clockRender = true;
}

/** 자원 띠의 골드 숫자만 — 글자 하나를 바꿀 뿐 아무것도 걷지 않아 미룰 까닭이 없다 (R89 · ADR-0341) */
function refreshGold() {
    const gold = $('.resources [data-res="gold"]');
    if (gold) gold.textContent = G.resources.gold.toLocaleString();
}

/* 원정 플레이 시간 [2026-10-05 · SCREEN_DESIGN §2 · ADR-0514] — 원정이 전투를 진행한 **게임 속 시간**이다(배속을 탄다).
   시각을 미는 두 쪽(관전 재생기 · 앱 시계)이 함께 지나는 `advanceBattle` 이 부대마다 나아간 재생 시각을 모으고, 앱 시계 눈금 끝에
   **가장 많이 나아간 부대**의 몫을 더한다 — 부대를 합치지 않는다. 일시정지 · 다음 런 대기 · 라운드 사이 섬 · 절전 공백은 재생 시각이 안 나아가 저절로 빠진다.
   **저장은 따로 안 건다** — 다른 저장(정산 · 조작)에 실려 간다. 세이브를 한 번 더 쓰면 같은 게임을 연 다른 탭이 멈춘다(`freeze` · §2-1 · ADR-0356). 마지막 저장 뒤의 몫은 버려진다 */
let expPend = {};             // 이 눈금에 부대(편성 번호)마다 나아간 재생 시각(초) — `advanceBattle` 이 모은다
function expTimeTick() {
    const sec = Math.max(0, ...Object.values(expPend));
    expPend = {};
    if (sec > 0) SYS.game.addExpTime(G, sec * 1000);
    if (!document.hidden) refreshExpTime();
}

/* 탭 할 일 점 [2026-10-16 · SCREEN_DESIGN §1 · ADR-0637] — 탭 바는 그리기 때 서고, 그 사이 상태가 바뀌면(탐험이 끝났다 · 상인이 왔다)
   앱 시계가 **점만** 갈아 끼운다 — 골드 숫자(`refreshGold`)와 같은 길이라 관전 재생기를 안 걷는다. 판정이 상태 함수 넷을 부르므로 1초에 한 번 */
const NAV_TODO_MS = 1000;
let navTodoAt = 0;
function refreshNavTodo(at) {
    if (at - navTodoAt < NAV_TODO_MS) return;
    navTodoAt = at;
    const todo = SYS.game.navTodo(G, at);
    notifications.refresh();
    tutorial.refresh();
    for (const b of document.querySelectorAll('.nav button[data-tab]'))
        b.classList.toggle('todo', !b.classList.contains('dim') && !!todo[b.dataset.tab]);
}

/** 상단바의 원정 플레이 시간 숫자만 — 글자가 바뀔 때만 쓴다(1초에 한 번) · 골드(`refreshGold`)와 같은 길 */
function refreshExpTime() {
    const n = $('.resources [data-exp-time]');
    if (!n) return;
    const txt = fmtExpTime(G.expMs);
    if (n.textContent !== txt) n.textContent = txt;
}

/** 관전이 떠 있을 때 아레나 아래 보관 칸만 갈아 끼운다(재생기 · 로그 · 스크롤은 그대로) — 앱 시계가 손이 빈 눈금에 부른다 (ADR-0341) */
function refreshBattleBag() {
    bagStale = false;
    if (!battleBag?.isConnected) return;
    hideTip();                        // 갈아 끼울 칸 위에 떠 있던 툴팁이 주인을 잃는다 — 손이 빈 눈금에만 오므로 대개 빈 손이다
    const fresh = itemsPanel(bagHero());
    battleBag.replaceWith(fresh);
    battleBag = fresh;
}

// Background settlements must not tear down an unrelated live raid battlefield.
function renderClock() {
    const keepRaid = stopRaid && raidSession?.owner === G && raidSession.run && !raidSession.run.ended
        && state.screen === 'game' && state.tab === 'lab' && state.lab.tool === 'raid' && !state.modal && !frozen;
    if (!keepRaid) { render(); return; }
    if (document.hidden) return;
    notifications.capture(); clockRender = false; bagStale = false;
    renderShell(); hideTip();
}

function expTick() {
    if (frozen) return;          // 다른 탭이 세이브를 썼다 — 이 탭의 원정은 더 흐르지 않는다 (SCREEN_DESIGN §2-1)
    const at = now();
    const gap = beatAt == null ? 0 : at - beatAt;
    beatAt = at;
    // 멈췄다 깨어났다 — 게임을 껐다 켠 것과 같이 본다 (ADR-0102). 재생기가 먼저 깨어나도 그쪽은 공백을 밀지 않고 여기로 미룬다
    if (gap > FROZEN_GAP_MS) { closeFrozenRun(at); return; }
    if (!G || state.screen !== 'game') return;
    // 수색 [2026-10-19 · base_expedition §2-4] — 시계가 지난 사람을 칸에 세운다(꺼져 있던 시간도 · 칸이 차면 멈춘다).
    //   누가 오면 선술집 칸 · 탭 할 일 점이 바뀌므로 다시 그린다(손이 바쁘면 다음 빈 눈금) · 연구소 정산보다 먼저 — 정산 안에서 오면 이 신호를 못 받는다
    if (SYS.game.visitSettle(G, at).arrived.length) { save(); if (handBusy()) clockRender = true; else renderClock(); }
    // 연구소 [2026-09-27 · base_expedition §3-3 · **2026-10-21 R298 — 연구 · 도박장 · 훈련**] — 켜 둔 동안 눈금마다 정산한다(재료 · 골드 · 경험치).
    //   껐다 켠 첫 정산만 오프라인 상한에 걸린다 · 연구가 끝나거나 레벨이 오르면 화면이 바뀌므로 다시 그린다
    const lab = SYS.game.labSettle(G, at);
    if (lab.done) flash('dp.lvDone', { name: labNodeLabel(lab.done.line, lab.done.node), n: lab.done.lv });
    if (lab.done || lab.xp.length || Object.keys(lab.blueprints).length) { save(); if (handBusy()) clockRender = true; else renderClock(); }
    else if (lab.gold || Object.keys(lab.gained).length) save();
    if (lab.gold) refreshGold();      // 도박장 골드 — 자원 띠의 숫자만 곧바로 (원정 골드와 같은 길 · R89)
    // 전직 — 끝난 것을 확정한다 (2026-09-28 · R16 · SCREEN_DESIGN §16). 끝나면 카드 · 띠가 바뀌므로 다시 그린다
    if (SYS.game.advanceSettle(G, at).done.length) { save(); renderClock(); }
    else if (state.tab === 'library' && !document.hidden) refreshAdvanceBars(at);
    if (state.tab === 'resource' && !document.hidden) refreshDispatchBars(at);
    // 상점 탭 — 상인이 오고 가는 순간을 화면이 따라간다 (SCREEN_DESIGN §8-3 · ADR-0223)
    if (state.tab === 'shop' && !document.hidden) shopTick(at);
    // 선술집 탭 — 무료까지 남은 시간 글자만 갈고, 무료가 열리는 순간 다시 그린다 (SCREEN_DESIGN §8-1 · 2026-09-30)
    if (state.tab === 'tavern' && !document.hidden) tavernTick(at);
    // 탐험 탭 — 진행 테두리 · 남은 시간만 갈고, 탐험이 끝나는 순간 다시 그린다 (SCREEN_DESIGN §8-4 · 2026-10-09)
    if (state.tab === 'explore' && !document.hidden) exploreTick(at);
    // 원정 탭 — 출정 창 적 구성의 무덤 명패: 남은 시간 글자만 갈고 보스가 돌아오는 순간 다시 그린다 (SCREEN_DESIGN §4-1 · ADR-0590)
    if (state.tab === 'expedition' && !document.hidden) respawnTick(at);
    // 탭 할 일 점 — 다른 탭에서 탐험이 끝나거나 상인이 온 순간을 탭 바가 따라간다 (SCREEN_DESIGN §1 · ADR-0637)
    if (!document.hidden) refreshNavTodo(at);
    /* **부대마다 민다** [2026-09-24 · ADR-0316] — 보는 부대는 관전이 떠 있으면 **재생기가 시계다**(애니메이션이 그 눈금 위에 산다 ·
       브라우저 탭이 숨으면 재생기를 걷으므로(`onVisibility`) 숨긴 탭의 시계는 언제나 이쪽이다) — 그 하나만 건너뛰고,
       안 보는 부대는 여기서 배속 1 로 실제 흐른 시간만큼 간다. 목록을 먼저 뜬다 — `tickBattle` 이 반복으로 핸들을 갈아 끼운다 */
    for (const H of Object.values(state.battles)) {
        if (H === state.battle && stopBattle) continue;
        tickBattle(H, at);
    }
    expTimeTick();               // 원정 플레이 시간 — 이 눈금까지 나아간 몫(관전 재생기가 민 것 포함)을 더한다 (ADR-0514)
    // 앱 시계가 미뤄 둔 그리기 — 손이 빈 첫 눈금에 한 번 (SCREEN_DESIGN §4 · ADR-0338) · 관전 화면이면 보관 칸만 (ADR-0341)
    if ((clockRender || bagStale) && !document.hidden && !handBusy()) {
        if (clockRender) renderClock();
        else if (stopBattle) refreshBattleBag();
        else bagStale = false;        // 관전이 걷혔다 — 다음 그리기가 보관 칸을 새로 세운다
    }
}

/**
 * 한 부대를 이 시각까지 민다 [2026-09-24 · ADR-0316 — `expTick` 의 옛 본문] — 한 눈금에 런이 끝나면 **남은 시간을 다음 런으로 넘긴다**
 * (숨긴 탭은 1분에 한 번 깨므로 안 넘기면 런마다 그만큼 샌다). 다음 런은 앞 런이 끝난 순간에 출발한 것으로 친다(`runBattle` 의 `at`)
 */
function tickBattle(H, at) {
    const watching = H === state.battle;   // 보는 부대의 다음 런만 관전 핸들을 이어 간다 — 화면은 둘 다 안 뺏는다 (ADR-0316 · ADR-0431)
    for (;;) {
        const B = H;
        if (!B) return;
        const r = B.resume ?? { t: 0, speed: 1, running: true, tab: 'log' };
        // 유저가 세워 둔 것 — 시계를 멈추는 것은 이것 하나다. 세워 둔 동안에도 박자는 민다(다시 틀 때 그 시간이 한꺼번에 흐르지 않게)
        if (r.running === false) { B.resume = { ...r, wall: at }; return; }
        const p = paceOfRun(B);
        if (p.done && !r.auto) return;   // 끝난 런. `auto` = 결과 띠가 다음 런을 세던 도중에 걷혔다 — 이어서 세운다
        const speed = r.speed ?? 1;
        if (!p.done) {
            // 박자로 민다 — 관전 재생기와 **같은 걸음**이라 세움(라운드 숨 · Focus 의 행동 세움)이 여기서도 먹는다 [2026-10-17 사용자 지시 · ADR-0654].
            //   내다보는 시각까지 엔진을 먼저 민다 — 끝난 라운드를 정산하고 다음 라운드를 붙인다 · 한 눈금에 여러 라운드를 넘을 수 있다(숨긴 탭은 1분에 한 번 깬다 · R89)
            const left = paceStep(p, B.result.timeline, Math.max(0, at - (r.wall ?? at)), paceOf(speed), s => advanceBattle(B, s, at, speed));
            B.resume = { ...r, t: p.t, wall: at, auto: false };
            if (!p.done) return;
            noteEnded(B, at - left);   // 끝난 순간 = 이 눈금에서 박자가 쓰고 남긴 시간만큼 앞
        } else B.resume = { ...r, wall: at, auto: false };
        // 끝 — 다음 런은 `game.nextRepeat` 가 정한 칸 · 시각(끝난 순간 + [balance.csv:repeat_restart_sec])에 나간다 — 멈춘 부대(철수 · 끊김)만 null 이다 (v39 · ADR-0430).
        //   관전 결과 띠의 세기와 **같은 답**이다 — 어느 탭에서 끝났든 같은 시각이다 (ADR-0300)
        const nx = SYS.game.nextRepeat(G, B.endedAt ?? at, B.run?.preset ?? G.preset);
        if (nx) {
            // 그 시각 전이면 끝난 런을 붙든 채 기다린다 — `auto` 가 다음 눈금에 이 자리로 다시 데려온다. 기다리는 동안 멈춤이 오면 `closeFrozenRun` 이 반복만 끈다
            if (at < nx.at) { B.resume = { ...B.resume, auto: true }; return; }
            runBattle(nx.stageId, { at: nx.at, resume: { ...r, t: 0, wall: nx.at, auto: false }, preset: nx.preset, focus: watching, defer: true, from: B.run, diff: nx.difficulty });   // 처음 나간 편성 그대로 · 진 런의 재도전은 고친 편성 (2026-09-29 · 2026-10-24)
            // 관전이 섰으면 재생기가 시계다 · 출발이 거절됐으면 멈춘다. 새 런은 라운드마다 시각을 먹으므로(한 틱 이상) 이어 돌아도 끝없이 돌지 않는다 (R89)
            if (watching && stopBattle) return;
            const next = state.battles[nx.preset];
            if (!next || next === B) return;      // 출발이 거절됐다 — 핸들이 안 바뀐다
            H = next;                             // 이 부대의 새 런으로 이어 민다 (ADR-0316)
            continue;
        }
        save();
        // 보고 있던 화면을 뺏지 않는다 — 끝나도 원정 세그먼트는 **안 바뀐다** [2026-09-15 사용자 지시 · ADR-0140].
        //   관전을 보다 떠났으면 원정 탭으로 돌아올 때 결과 띠가 선 그 관전이, 편성을 열어 뒀으면 편성이 서 있다. 리포트는 띠의 [리포트 보기]로 간다
        clockRender = true;     // 그리는 것은 다음 눈금 · 조작이 끝난 뒤다 (ADR-0338)
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
    const all = Object.values(state.battles);
    if (!all.length) return;
    const mounted = !!stopBattle;
    // 관전이 떠 있었으면 그 자리가 곧 멈춘 자리다 — 받아 두는 것은 **보던 부대** 하나다
    if (mounted) { const pos = stopBattle(); if (state.battle) state.battle.resume = pos; stopBattle = null; }
    // 이미 다 끝난 판 — 걷은 관전만 다시 세운다 (끝난 런이 다음 런을 세던 중(`auto`)이면 아래에서 반복만 끈다)
    if (all.every(H => H.run.done && !(H.resume?.auto))) { if (mounted) render(); return; }
    // 진행 중이던 원정은 **끊는다** [개정 2026-09-14 · R89] — 멈춘 공백을 따라잡아 마무리하지 않는다(진행 중 라운드는 버린다).
    //   **도는 부대를 전부** 끊는다(`closeRun`) — 핸들도 부대마다 정리한다 (2026-09-24 · ADR-0316)
    SYS.game.closeRun(G, at);
    for (const [no, H] of Object.entries(state.battles)) {
        if (H.run.done) {
            H.resume = { ...(H.resume ?? { t: 0, speed: 1 }), t: H.result.durationSec, wall: at, auto: false };
            // 박자도 끝에 세운다 — 마지막 세움에 서 있던 런이 깨어난 뒤 남은 세움을 마저 돌지 않게 (ADR-0654)
            H.pace = { ...paceAt(H.result.timeline, H.result.durationSec), i: H.result.timeline.length, done: true };
            noteEnded(H, at);
        }
        else {
            delete state.battles[no];                              // 버린 라운드는 다시 볼 것이 없다
            if (H === state.battle) state.battle = null;
        }
        if (samePlace(runSlot(H.run?.preset)?.stageId, state.expStage)) state.expRepeat = false;   // 출정 창의 반복 버튼과 어긋나지 않게 — 스위치는 장소에 딸린다 (ADR-0432)
    }
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
        trackPush();   // 숨길 때 올린다 — 이대로 닫힐 수도 있다 (SCREEN_DESIGN §2-1)
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
            <span>${diffTag(R.difficulty)}${stage ? stageTitle(stage) : R.stageId}</span>
            <span class="muted">${fmtDuration(R.durationSec * 1000)}${R.won || R.reason == null ? '' : ` · ${t(`rep.reason.${R.reason}`)}`}</span>
        </div>
        <div class="gain-row rep-cut">
            <div><span>${t('res.gold')}</span>${R.gold.toLocaleString()}</div>
            <div><span>${t('rep.xp')}</span>${xpSum(R).toLocaleString()}</div>
            <div><span>${t('rep.rounds')}</span>${t('rep.roundsCleared', { n: roundsDone, total: stage ? SYS.battle.stageRounds(stage).length : R.rounds.length })}</div>
            <div><span>${t('rep.downed')}</span>${R.downed.length ? `<span class="down">${t('rep.downedN', { n: R.downed.length })}</span>` : t('rep.none')}</div>
            <div><span>${t('rep.miss')}</span>${missText}</div>
            ${R.shrine ? `<div><span>${t('rep.shrine')}</span>${shrineChip(R.shrine)}</div>` : ''}
            ${R.clearBox ? `<div><span>${t('rep.clearBox')}</span>${t(R.clearBox.mail ? 'rep.clearBoxMail' : 'rep.clearBoxBag', { box: boxName(R.clearBox) })}</div>` : ''}
        </div>`;

    dropSection(p, R);
    // 기여 — 레벨업 · 전투불능도 **이 표의 영웅 줄**이 든다 (ADR-0086). 상세 아래에 따로 서던 줄과 상자는
    //   런마다 상세 높이를 흔들었다. 레벨업은 **레벨만** 적는다(ADR-0073 — 오른 능력치는 체감이 없어 보상으로 읽히면 안 된다)
    contribSection(p, R);
    p.appendChild(foesLine(R));   // 남은 적 — 진 런의 「왜 졌나」 · 모든 런이 자리를 잡는다 (§4-3 · ADR-0623)
    // ~~도감 카드 줄~~ 은 2026-09-21 삭제 — 도감 카드를 걷었다(레벨은 처치 수 · monster_design §8 · SCREEN_DESIGN §4-3)
    // 버튼은 없다 — 리포트는 확인용이다 (ADR-0210). 다시 보내기는 출정 창 · 결과 띠, 반복은 출정 창이 든다
    return p;
}

function renderExpReport(main) {
    // 부대마다 탭 — 그 부대의 런만 (§4-3 · ADR-0622)
    const no = repNo();
    const list = doneReports().filter(R => repPresetOf(R) === no);
    // 고른 줄 — `null` 이면 맨 위를 따라간다. 옛 줄을 골라 뒀으면 끝난 원정이 위에 들어와도 그 줄에 남는다(보던 것을 뺏지 않는다 · ADR-0123).
    //   그 줄이 상한에 밀려 나갔거나 세이브를 다시 불러와 없어졌으면 맨 위로
    const idx = Math.max(0, list.indexOf(state.repSel));
    const R = list[idx];
    const cols = el('div', 'cols c-side page');
    cols.appendChild(runListPanel(list, idx, no));
    // 런이 없는 부대는 상세가 빈 칸이다 — 자리는 그대로 잡는다
    cols.appendChild(R ? reportDetail(R) : el('div', 'panel rep-detail'));
    main.appendChild(cols);
}
/* ═══════════ 프롤로그 (SCREEN_DESIGN §3-1) ═══════════
   새 게임 직후 한 번. 5씬을 순서대로 넘기고 마지막에 원정 탭으로 들어간다.
   이 화면은 SYS 를 부르지 않는다 — 상태는 state.proScene 하나뿐이고 세이브에 안 들어간다.
   본문 줄바꿈은 문자열이 들고 CSS(.pro-body { white-space: pre-line })가 편다. */

const PRO_SCENES = ['s1', 's2', 's3', 's4', 's5'];
/** **Chapter 1 이 열리는 씬** (0부터 · 지금은 씬 4 「마을」) — 여기서부터 맨 윗줄이 챕터 이름이고 쪽 번호를 새로 센다.
 *  앞 씬에서 이 씬으로 가는 문 **하나만** 암전을 지난다 — 프롤로그 안의 넘김 · 챕터 안의 넘김은 그냥 그린다.
 *  이 값 하나가 프롤로그와 챕터의 경계다 — 옮기면 제목 줄 · 진행 표시 · 암전이 같이 따라온다 (§3-1) */
const PRO_CHAPTER_AT = 3;
/** 챕터가 열리는 암전이 머무는 시간 — `style.css` 의 `pro-out` 과 **같은 값이어야 한다** (여기가 끝나야 다음 씬을 그린다) */
const PRO_FADE_MS = 450;

/** 프롤로그를 닫고 게임으로 — 건너뛰기와 마지막 씬이 같은 문을 쓴다 */
const enterGame = () => { state.screen = 'game'; render(); };

/**
 * 씬 4 를 어둠에 묻고 챕터를 연다 (§3-1) — 마지막 씬은 프롤로그가 아니라 **Chapter 1 이 열리는 자리**라
 * 그냥 넘기지 않고 한 번 꺼졌다 켜진다. 암전 동안 버튼은 안 눌린다(CSS `.pro-out`).
 * 어둠이 걷히기 전에 화면을 떠났으면(건너뛰기) 아무것도 하지 않는다 — 늦게 오는 타이머가 게임 화면을 뺏지 않는다.
 */
function fadeToChapter(wrap) {
    wrap.classList.add('pro-out');
    setTimeout(() => {
        if (state.screen !== 'prologue') return;
        state.proScene = PRO_CHAPTER_AT;
        state.proFade = true;
        render();
    }, PRO_FADE_MS);
}

function renderPrologue(main) {
    const i = Math.min(Math.max(state.proScene, 0), PRO_SCENES.length - 1);
    const key = PRO_SCENES[i];
    const last = i === PRO_SCENES.length - 1;
    const chapter = i >= PRO_CHAPTER_AT;        // Chapter 1 에 속한 씬인가 — 맨 윗줄 · 쪽 번호가 이것 하나로 갈린다

    const wrap = el('div', 'pro-wrap');
    // 암전에서 떠오르는 것은 챕터가 열리는 씬뿐이다 — 플래그는 한 번 쓰고 끈다(새로고침 · `?dev=prologue&s=n` 은 그냥 선다)
    if (state.proFade) { wrap.classList.add('pro-in'); state.proFade = false; }
    // 맨 윗줄이 **지금 어디인지**를 든다 — 프롤로그 씬은 제목, 챕터 씬은 챕터 이름이다.
    //   인용은 마지막 씬에만 선다 — 본문과 층이 다르다 (§3-1)
    wrap.innerHTML = `
        <div class="pro-top">${t(chapter ? 'pro.end' : 'pro.title')}</div>
        <h1 class="pro-h">${t(`pro.${key}.h`)}</h1>
        <div class="pro-body">${t(`pro.${key}.b`)}</div>
        ${last ? `<div class="pro-q">${t('pro.s5.q')}</div>` : ''}`;

    // 버튼 셋 — 뒤로 · 건너뛰기 · 다음, **크기가 같다** [2026-09-24 사용자 지시]. 첫 씬의 뒤로는 자리를 지키고 흐리게 선다(버튼이 안 밀린다)
    const actions = el('div', 'pro-actions');
    const back = el('button', 'btn lg', t('pro.back'));
    back.disabled = i === 0;
    back.onclick = () => { state.proScene = i - 1; render(); };   // 되돌아가는 길은 암전을 안 지난다
    const skip = el('button', 'btn lg', t('pro.skip'));
    skip.onclick = enterGame;
    const next = el('button', 'btn lg primary', t(last ? 'pro.begin' : 'pro.next'));
    // 챕터가 열리는 문 하나만 암전을 지난다 — 나머지 넘김은 지금처럼 바로 그린다
    next.onclick = () => {
        if (last) enterGame();
        else if (i + 1 === PRO_CHAPTER_AT) fadeToChapter(wrap);
        else { state.proScene = i + 1; render(); }
    };
    actions.appendChild(back);
    actions.appendChild(skip);
    actions.appendChild(next);
    // 쪽 번호는 **제 묶음 안에서** 센다 [2026-09-24 사용자 지시] — 프롤로그 1~3 / 3 · Chapter 1 은 1~2 / 2
    const [n, m] = chapter ? [i - PRO_CHAPTER_AT + 1, PRO_SCENES.length - PRO_CHAPTER_AT] : [i + 1, PRO_CHAPTER_AT];
    wrap.appendChild(el('div', 'pro-step muted', t('pro.step', { n, m })));
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
    // 판정은 `game.heroBusy` 하나다 — 편성 · 해고 · 출발이 막는 판정과 같은 답이다 (2026-09-22 · ~~수색~~ 2026-10-19 삭제)
    const busy = SYS.game.heroBusy(G, h.uid);
    if (busy === 'advance') return { cls: 'exp', text: t('hs.doing.advance') };   // 도서관에서 전직하는 중 (2026-09-28 · R16 · 도서관 2026-10-09)
    if (busy === 'explore') return { cls: 'exp', text: t('hs.doing.explore') };   // 탐험 나감 — 받을 때까지 (2026-10-09 · SCREEN_DESIGN §8-4)
    // ~~자원 자리 「채광 2」~~ — 2026-10-18 연구소에 영웅이 안 앉는다 (ADR-0665)
    return busy === 'run' ? { cls: 'exp', text: t('hs.doing.expedition') } : { cls: 'idle', text: t('hs.doing.idle') };
}

/**
 * 영웅 카드 위칸 왼쪽 — **속한 파티** [2026-10-27 사용자 지시 · SCREEN_DESIGN §5 · ADR-0907 — 연구소 밖 모든 카드의 기본 2026-10-30 · ADR-0956].
 * 나가 있는 부대가 먼저(`runOf` — 원정 도중 편성에서 뺀 영웅은 그 원정이 끝날 때까지 그 부대다) · 아니면 든 편성(한 영웅은 한 편성에만).
 * 색은 「지금 하는 일」과 같다 — 나가 있으면 주황 · 마을이면 회색. 어느 파티에도 없으면 「지금 하는 일」 그대로
 */
function partyDoing(h) {
    const no = SYS.game.runOf(G, h.uid) ?? (G.presets.findIndex(p => p.party.includes(h.uid)) + 1 || null);
    if (!no) return heroDoing(h);
    return { cls: SYS.game.heroBusy(G, h.uid) ? 'exp' : 'idle', text: t('pt.preset', { n: M.roman(no) }) };
}

/**
 * 편성 탭(띠 카드 · 진형 칸) 영웅 툴팁의 첫 장 — **스위치 하나** [2026-09-24 사용자 지시 · ADR-0318].
 * `false` = 관전 · 출정 창과 같은 카드(착용 장비 첫 장 · Alt 세부 옵션 — ADR-0171) ·
 * `true` = 기본 옵션 첫 장(능력치 막대 + 액티브 스킬 그림) · Alt 동안 옆에 장비 + 세부 옵션(ADR-0287).
 * 끄고 켜는 것은 이 한 줄이다 — 기본 옵션 카드(`tip.js:statsFirstCard`)와 그 CSS(`.stats-first`)는 지우지 않고 둔다
 */
const PARTY_TIP_STATS = false;
const partyTipOpts = h => (PARTY_TIP_STATS ? { statsFirst: true, skills: activeCells(h) } : {});

/**
 * 영웅 카드의 얼굴 — **위칸**(왼쪽 속한 파티 · 오른쪽 이름) + 초상 + 오른쪽 아래 **레벨** + (리더면) 왼쪽 아래 **리더** (SCREEN_DESIGN §5).
 * 같은 크기의 같은 영웅은 어디서나 같은 얼굴이다 — 캐릭터 · 편성 탭 띠(`heroStrip`) · 진형 보드 칸(`formBox` · ADR-0280) ·
 * 출정 창 초상(`presetPick` · ADR-0317)이 이 한 벌을 쓴다. 자리 규칙(위칸 한 줄 · 레벨 오른쪽 아래 · 리더 왼쪽 아래)은 CSS 조각이 든다(ADR-0197 · ADR-0278)
 */
function heroCardHtml(h, { leader = false, doing = partyDoing(h) } = {}) {
    // `doing` — 위칸 왼쪽을 그 탭의 말로 갈아 끼운다(연구소 띠 · 등록 창 = 등록한 줄 · ADR-0677) · 안 주면 속한 파티(ADR-0956)
    return `<div class="hs-band"><span class="hs-doing ${doing.cls}">${doing.text}</span><b class="hs-name">${L(h.name)}</b></div>`
        + heroFace(h)
        + `<span class="hs-lv">${t('ch.lv', { n: h.level })}</span>`
        + (leader ? `<span class="hs-leader">${t('exp.leader')}</span>` : '');
}

/**
 * 영웅 띠 패널 — 편성 · 캐릭터 · 상점 공통 (SCREEN_DESIGN §5). onPick(hero) 가 카드 클릭.
 * **파란 겉 테두리는 띠마다 뜻이 다르다** [개정 2026-09-09 사용자 지시 · SCREEN_DESIGN §5]:
 *   편성 띠(`partyMode`)에서는 **파티에 든 영웅**(`party`) · 그 밖의 띠에서는 **지금 클릭한 영웅**(`on`).
 *   한 띠에 한 뜻만 선다 — 편성에서는 클릭이 곧 편성이라 「본 영웅」 표시가 설 자리가 없고,
 *   09-08 판은 그 자리에 `heroUid` 를 그려서 **눌러도 아무 변화가 없는 화면**이 돼 있었다.
 * 카드 = 초상(카드 전체) + 위칸(왼쪽 지금 하는 일 · 오른쪽 이름) — SCREEN_DESIGN §5 (2026-08-27)
 * 올려놓으면 기본 옵션 + 장비 툴팁(원정과 같은 카드), Alt 동안 세부 옵션 (ui/tip.js heroTipCard · ADR-0498) — `tip: false` 면 안 뜬다(캐릭터 탭 · 2026-09-15 · ADR-0116)
 * leaderUid — 편성 화면만 준다. 파티 첫 슬롯 = 리더 (옛 파티 행의 리더 표시를 띠가 이어받았다)
 * flat — 편성 패널처럼 이미 패널 안에 들어갈 때. 패널 껍데기(테두리·배경·여백)를 벗는다
 * reorder — 카드를 끌어 카드 사이 틈에 놓으면 그 영웅이 그리로 들어간다 · 사이는 한 칸씩 밀리고 당겨진다 (캐릭터 탭 · 2026-10-09 · ADR-0571)
 */
function heroStrip(onPick, { leaderUid = null, flat = false, partyMode = false, dismissable = false, deployed = false, tip = true, reorder = false, view = false, doing = null } = {}) {
    const p = el('div', flat ? 'hs-panel flat' : 'panel hs-panel');
    // `doing(h)` — 카드 위칸 왼쪽을 그 탭의 말로(연구소 띠 = 등록한 줄 · ADR-0677) · 안 주면 「지금 하는 일」(`heroBusy`)
    // `view` — **보기 전용** 띠(자원 탭 · ADR-0369). 카드는 「지금 하는 일」만 보여 주고 클릭도 고른 표시도 없다 —
    //   누른 뒤 일어날 일(배치)이 아직 없다. 배치가 서면 그때 클릭을 붙인다
    // partyMode — 클릭이 파티 넣고 빼기인 띠(편성). ~~출정 아웃인 카드는 안 눌리는 티를 낸다~~ 는 2026-09-08 폐기(못 넣는 영웅이 없다)
    // `deployed` — **아래에 전진 패널이 열려 있나** (2026-09-09 사용자 지시 · ADR-0058). 파티 카드의 반투명은
    //   「이 영웅은 아래 진형 보드에 내려가 있다」는 뜻이라, 패널이 닫혀 내려갈 곳이 없으면 흐림도 걷힌다
    const strip = el('div', `hero-strip${partyMode ? ' party-mode' : ''}${deployed ? ' deployed' : ''}${view ? ' view-only' : ''}`);
    for (const h of G.heroes) {
        // 편성 띠면 **파티 소속**이, 아니면 **클릭한 영웅**이 파란 테두리를 든다 (2026-09-09 · SCREEN_DESIGN §5).
        //   둘을 한 띠에 같이 걸지 않는다 — 같은 표시가 두 뜻을 겸하면 무엇을 골랐는지 못 읽는다
        const mark = view ? ''
            : partyMode
            ? (SYS.game.partyOf(G).includes(h.uid) ? ' party' : '')
            : (h.uid === state.heroUid ? ' on' : '');
        const c = el('div', `hs-card${mark}${h.tier === 'unique' ? ' unique' : ''}`);
        c.style.borderTopColor = tierColor(h);
        c.dataset.uid = h.uid;   // 순서 옮기기가 틈을 재는 카드 — 빈 칸(+)은 uid 가 없어 안 잰다(그 쪽에 놓으면 맨 뒤 · ADR-0571)
        // 옛 title 한 줄(직업·Lv·죄종·등급)을 툴팁 카드가 대신한다 (2026-08-28) — 영웅 툴팁: 착용 장비 · Alt 로 세부 옵션 (ADR-0171)
        //   `tip: false` 면 안 건다 — 캐릭터 탭은 같은 값이 바로 아래 네 칸에 있고 뜬 카드가 그 칸을 덮는다 (2026-09-15 사용자 지시 · ADR-0116)
        //   유닛 툴팁은 **카드 옆**에 선다 — 관전 카드와 같은 규칙 (2026-09-15 · ADR-0120)
        //   편성 띠(`partyMode`)의 첫 장은 스위치(`PARTY_TIP_STATS`)가 정한다 — 꺼져 있으면 관전 · 출정 창과 같은 카드다 (2026-09-24 사용자 지시 · ADR-0318)
        if (tip) bindTipNode(c, () => heroTipCard(h, combatOf(h), itemOf, it => equippedItemTipCard(h, it), partyMode ? partyTipOpts(h) : {}), { anchor: true, holdOnAlt: true });
        // 위칸 오른쪽은 **이름 하나**다 — 카드 오른쪽 끝에 붙는다 [2026-09-21 사용자 지시 · ADR-0197 — 0165 의 이름 뒤 `Lv.n` 을 걷었다].
        //   줄어드는 쪽은 여전히 「하는 일」 하나다
        // 레벨은 초상 **오른쪽 아래**(아이템 칸과 같은 구석) · 리더는 왼쪽 아래 [2026-09-21 사용자 지시 · ADR-0278 — 0202 와 구석을 맞바꿨다].
        //   왼쪽 아래는 해고(캐릭터 탭 띠)와 리더(편성 띠)가 나눠 쓰고, 레벨은 어느 카드에서도 안 가린다
        c.innerHTML = heroCardHtml(h, { leader: h.uid === leaderUid, doing: doing ? doing(h) : undefined });   // 얼굴 한 벌 — 진형 칸 · 출정 창 초상과 같다 (ADR-0317)
        /* 해고 — **고른 카드에만** 왼쪽 아래에 뜬다 [2026-09-09 사용자 지시 · SCREEN_DESIGN §5 · §6 · 자리는 ADR-0278].
           `dismissable` 을 준 띠(캐릭터 탭)에서만이다 — 편성 띠는 클릭이 파티 넣고 빼기라 여기에 파괴적 버튼을
           같이 두면 파티 빼려다 해고하는 사고가 난다. 리더 뱃지도 왼쪽 아래지만 편성 띠에만 서서 한 카드에서 안 만난다.
           카드 클릭(선택)까지 올라가지 않게 전파를 끊는다 */
        if (dismissable && h.uid === state.heroUid) {
            const out = el('button', 'btn hs-dismiss', t('ch.dismiss'));
            out.onclick = ev => { ev.stopPropagation(); openModal('dismiss'); };
            c.appendChild(out);
        }
        // 편성 띠에서는 카드를 **진형 보드로 끌어다 놓을 수 있다** (2026-09-09 · SCREEN_DESIGN §4-1).
        //   동사가 갈린다: 클릭은 소속(넣고 빼기) · 드래그는 자리. 끌면 그 뒤의 클릭 한 번을 삼켜 둘이 겹치지 않는다
        if (partyMode) bindFormDrag(c, { uid: h.uid });
        // 캐릭터 탭 띠는 끌어서 **카드 사이 틈에 끼워 넣는다** [2026-10-09 사용자 지시 · SCREEN_DESIGN §5 · ADR-0571 — 0136 의 맞바꾸기를 대체].
        //   순서는 세이브 값(`G.heroes`)이라 출정 창 띠도 같은 순서로 선다. 동사는 편성 띠와 같게 갈린다 — 클릭은 고르기 · 드래그는 자리
        else if (reorder) bindRosterDrag(c, strip, h.uid);
        if (!view) c.onclick = () => { if (!formDragEnded) onPick(h); };
        strip.appendChild(c);
    }
    // 빈 칸은 지금 상한까지 `+` · 그 뒤는 선술집을 다 지었을 때의 칸 수까지 **잠긴 칸** (§5 · ADR-0913 · R363)
    const cap = SYS.game.limitsOf(G).roster;
    for (let i = G.heroes.length; i < cap; i++) strip.appendChild(el('div', 'hs-card empty', '<span>+</span>'));
    for (let i = Math.max(cap, G.heroes.length); SYS.game.needOf('roster', i + 1 - D.balance.roster_cap); i++) strip.appendChild(rosterLockCard(i));
    p.appendChild(strip);
    return p;
}
/** 안 열린 영웅 칸 — 칸 안에 닫힌 자물쇠 · 올리면 그 칸을 여는 건물 랭크 한 줄(물약 칸과 같은 `tip-mini` · 연구소 영웅 칸과 같은 `lock` 그림) ·
 *  `i` = 칸 자리(0 부터) · 기본 칸 수 위로 몇째 칸인가를 묻는다 (§5 · ADR-0913) */
function rosterLockCard(i) {
    const txt = needText('roster', i + 1 - D.balance.roster_cap);
    const c = el('div', 'hs-card empty lock', lockIcon(true));
    bindTipNode(c, () => el('div', 'tip-card tip-mini', `<div class="tip-name">${txt}</div>`));
    c.setAttribute('aria-label', txt);
    return c;
}
const pickHero = h => { state.heroUid = h.uid; render(); };
/**
 * 띠 순서 옮기기 — 캐릭터 탭 띠의 드래그 [2026-10-09 사용자 지시 · SCREEN_DESIGN §5 · ADR-0571 — 0136 의 맞바꾸기를 대체].
 * 놓을 곳은 카드가 아니라 **틈**이다 — 커서에 가장 가까운 카드의 왼쪽 반이면 그 앞 틈, 오른쪽 반이면 그 뒤 틈.
 * 끄는 동안 그 틈에 **삽입선**(`.hs-insert`)이 서고, 놓으면 그 영웅이 그리로 들어가 사이가 한 칸씩 밀리거나 당겨진다.
 * 제 양옆 틈은 놓아도 그대로라 선을 안 세운다 · 띠 패널 밖이면 선도 놓기도 없다.
 * 틈 → 옮긴 뒤 자리(`to`)는 화면이 바꿔 넘긴다 — 계약(`game.moveHero`)은 「몇 번째에 서나」만 받는다.
 * 고른 영웅은 uid 로 들고 있어 자리가 바뀌어도 그대로 따라간다
 */
function bindRosterDrag(node, strip, uid) {
    const cards = () => [...strip.querySelectorAll('.hs-card[data-uid]')];   // 띠 카드 순서 = `G.heroes` 순서
    /** 포인터 아래의 틈 번호(0 = 맨 앞 … n = 맨 뒤) — 띠 패널 밖이거나 제 양옆 틈이면 -1 */
    const gapAt = e => {
        const panel = strip.closest('.hs-panel');
        if (document.elementFromPoint(e.clientX, e.clientY)?.closest('.hs-panel') !== panel) return -1;
        const cs = cards();
        let near = 0, best = Infinity;
        cs.forEach((c, k) => {
            const r = c.getBoundingClientRect();
            const d = Math.hypot(Math.max(r.left - e.clientX, 0, e.clientX - r.right), Math.max(r.top - e.clientY, 0, e.clientY - r.bottom));
            if (d < best) { best = d; near = k; }
        });
        const r = cs[near].getBoundingClientRect();
        const gap = near + (e.clientX > (r.left + r.right) / 2 ? 1 : 0);
        const from = cs.indexOf(node);
        return gap === from || gap === from + 1 ? -1 : gap;
    };
    // 삽입선 — 틈 한가운데 · 카드 높이. **고스트와 같은 층(`#stage` 직속 · 한 장 단위)에 그 위로** 선다 —
    //   띠 안에 두면 카드 가운데를 잡고 틈으로 간 고스트가 바로 그 틈을 덮어 선이 안 보였다
    const showLine = e => {
        const gap = e ? gapAt(e) : -1;
        let line = $('#stage > .hs-insert');
        if (gap < 0) { line?.remove(); return; }
        const cs = cards(), half = (parseFloat(getComputedStyle(strip).columnGap) || 0) / 2;
        const r = stageRect(cs[Math.min(gap, cs.length - 1)]);
        if (!line) line = $('#stage').appendChild(el('div', 'hs-insert'));
        line.style.left = `${gap < cs.length ? r.left - half : r.right + half}px`;
        line.style.top = `${r.top}px`;
        line.style.height = `${r.bottom - r.top}px`;
    };
    bindCardDrag(node, '.hs-panel', (_, e) => {
        const gap = gapAt(e);
        if (gap < 0) return false;
        const from = G.heroes.findIndex(x => x.uid === uid);
        return moveRoster(uid, gap > from ? gap - 1 : gap);   // 뒤로 가면 제가 빠진 한 칸만큼 당겨진다
    }, showLine);
}
const moveRoster = (uid, to) => {
    const r = SYS.game.moveHero(G, uid, to);
    if (!r.ok) flash(`ch.err.${r.err}`); else save();
    return true;
};

/* ═══════════ 캐릭터 ═══════════
   세로 3단: ① 영웅 띠 ② 같은 폭·높이의 4칸 — 장비 / 기본 옵션(+현재 스킬 카드) / 세부 옵션 1 / 세부 옵션 2 (2026-08-27) ③ 아이템(가로 전폭).
   장착·해제·분해가 여기서 실제로 일어난다. */

/** 페이퍼돌 — 신체 위치대로 착용 위치 8개(부위 7종, 반지 ×2). 착용 칸을 누르면 벗는다.
 *  잠기는 칸은 없다 — 보조 슬롯 폐지(2026-09-01)로 양손 배타가 사라졌다.
 *  빈 칸은 **부위 실루엣**을 배경으로 깔고 이모지를 안 그린다 — 둘을 겹치면 투명 PNG 사이로 비친다.
 *  2026-09-17 로 **부위 7종이 다 찼다** — 빈 칸이 이모지로 떨어지는 일은 이제 없다 (SCREEN_DESIGN §6 · 규칙은 `mock.slotArt` 한 곳)
 *  `onPick` 을 주면 찬 칸 클릭이 벗기기가 아니라 **고르기**다 — 대장간 강화 (§8-2 · ADR-0364) · `selUid` 칸은 강조 테두리 */
function paperdoll(h, { onPick = null, selUid = null } = {}) {
    const box = el('div', 'paperdoll');
    for (const row of M.PAPERDOLL) {
        for (const pos of row) {
            if (!pos) { box.appendChild(el('div', 'pd-gap')); continue; }
            const def = posDef(pos);
            const it = itemOf(h.equipped[pos]);
            const art = it ? null : M.slotArt(def.id);
            const cell = el('div', `pd-cell${it ? ' filled' : ''}${art ? ' art' : ''}${it && it.uid === selUid ? ' sel' : ''}`);
            if (it) cell.style.borderColor = rarity(it.rarity).color;
            // 칸에는 글자가 없다 [2026-09-15 사용자 지시 · ADR-0122] — 부위는 실루엣이, 찬 칸은 그림과 툴팁이 말한다.
            //   부위 이름은 **빈 칸만** `title` 로 든다 — 찬 칸에 달면 아이템 툴팁 위에 브라우저 기본 툴팁이 겹친다
            //   **예외 — 찬 칸은 가방 칸과 같은 모서리 배지 둘**을 든다 [2026-09-18 사용자 지시]: 오른쪽 위 강화 `+n`(ADR-0169 · 0 이면 안 선다) ·
            //   오른쪽 아래 아이템 레벨(ADR-0168). 둘 다 그림도 칸 자리도 대신 말해 주지 못하는 개체값이라, 가방 칸과 견주려면 여기도 들어야 한다
            const us = it ? { up: upShown(it) } : null;
            cell.innerHTML = (art ? `<span class="pd-art"><img src="${art}" alt="" loading="lazy" onerror="this.remove()"></span>`
                : `<div class="pd-icon">${it ? itemImg(it) : def.icon}</div>`)
                + (us && us.up > 0 ? `<span class="pd-up">+${us.up}</span>` : '')
                + (it ? `<span class="pd-lv">${t('ch.itemLv', { n: it.ilvl })}</span>` : '');
            cell.setAttribute('aria-label', L(def));
            if (!it) cell.title = L(def);
            if (it) {
                // 실제로 착용 중이라 담은 스킬 줄도 **h 의 실제 능력치 기준**으로 낸다 (2026-09-11 사용자 지시)
                bindTip(cell, it, { head: 'tip.equipped', ctx: heroSkillCtx(h), level: h.level });   // 이 칸의 것은 실제로 착용 중이다 (§6 머리글)
                cell.onclick = () => {
                    if (onPick) { onPick(it); return; }
                    const before = runTacticsNow();
                    const r = SYS.game.unequip(G, h.uid, pos, invNo());   // 벗긴 것은 보고 있는 인벤토리로 (ADR-0521)
                    if (!r.ok) flash(`ch.err.${r.err}`); else { save(); runChangeFlash(h.uid, before); }   // 원정 중 교체 — 꺼진 전술 (R130)
                    render();
                };
            }
            box.appendChild(cell);
        }
    }
    return box;
}

/** 장비 패널 — 캐릭터 탭 · 상점 · 대장간이 같이 쓴다. `pick` 은 페이퍼돌로 넘긴다(대장간 — 칸 클릭 = 고르기 · ADR-0366)
 *  제목은 이름뿐 — [자동 장착]은 인벤토리 도구 줄에 선다 (§6 · ADR-0041 · ADR-0721) */
function gearPanel(h, pick = {}) {
    const p = el('div', 'panel');
    const worn = wornItems(h);
    p.appendChild(helpHeading('h2', '', t('ch.gear.h'), 'equipment'));
    p.appendChild(paperdoll(h, pick));

    // 접사 죄종 — 세트포인트가 아니라 **태그**다 (세트효과 보류, item_design §4). 수는 "죄종 접사 수" — 접사 시너지 노드의 축
    const counts = {};
    for (const it of worn) for (const s of it.sins ?? []) counts[s] = (counts[s] ?? 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    p.appendChild(helpHeading('div', 'sub-h sins-h', t('eq.sins.h'), 'sins'));
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

/** [자동 장착] — 고른 영웅에게 보고 있는 인벤토리에서 (`game.autoEquip` 이 고른다 · 화면은 결과만 · §6 · ADR-0712 · 자리 ADR-0721).
 *  원정 중이면 손으로 낄 때와 같은 교체 플래시(꺼진 전술 — R130)가 뒤따른다 */
function autoEquipHero(h) {
    const before = runTacticsNow();
    const r = SYS.game.autoEquip(G, h.uid, invNo());
    if (!r.ok) flash(`ch.err.${r.err}`);
    else if (!r.changes.length) flash('ch.autoEq.none');
    else { save(); flash('ch.autoEq.done', { n: r.changes.length }); runChangeFlash(h.uid, before); }
    render();
}

/** ②-2 기본 옵션 — 맨 위 레벨 · 경험치 + 기본 능력치 7 막대 + 그 아래 현재 스킬(액티브 3, 정사각 카드). 옛 핵심 전투치 4 줄은 세부 옵션이 흡수했다 (2026-08-27) */
function attrPanel(h) {
    const p = el('div', 'panel');
    // 제목 오른쪽 끝에 **등급 → 죄종 → 직업 칩** [2026-10-24 사용자 지시 · ADR-0750 — ~~죄종 칩 하나~~ ADR-0166] — 후보 카드 칩 줄과 같은 순서 · 색(ADR-0724).
    //   `.panel > h2` 가 이미 space-between 이라 제목을 span 으로 감싸면 칩 묶음이 오른쪽 끝에 선다
    const ids = `${tierChip(h)}<span class="sin-chip" style="color:${sinColor(h.sin)}">${sinName(h.sin)}</span>${clsChip(h.cls)}`;
    p.appendChild(helpHeading('h2', '', `<span>${t('ch.attr.h')}</span><span class="attr-ids">${ids}</span>`, 'attributes', { max: D.balance.hero_attr_roll_max }));
    p.appendChild(xpBlock(h));
    const box = el('div', 'attr-list');
    // 줄 조립은 유닛 툴팁과 같은 함수다 — 두 자리가 따로 짜면 한쪽만 고쳐진다 (tip.js · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0114)
    box.innerHTML = attrRowsHtml(h.stats, tierColor(h));
    bindStatTips(box);   // 줄에 올리면 설명 카드 (SCREEN_DESIGN §2 「능력치 설명 툴팁 규격」 · ADR-0581)
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
    const tipCtx = { period: cycle, ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats, cdr: cb.cooldown_reduction, skillTags: cb.option_fx?.skillTags, atkPct: cb.atk_pct_sum, healOut: cb.option_fx?.healOut };
    const wrap = el('div', 'sk-cards-wrap');
    // 소제목은 이름뿐이다 (2026-09-08 사용자 지시) — 공격 속도는 **세부 옵션 1 의 제 행**이 든다
    // (`combat_stat.csv:action_period` — 세부 옵션 1 대표값). §4-1 「값은 항상 찍는다」는 그 행이 지킨다
    // 소제목 오른쪽 끝 [우선순위] — 스킬 우선순위 창을 연다 (2026-10-28 사용자 지시 · §6 · ADR-0937) · 찬 칸이 둘 미만이면 바꿀 순서가 없어 못 누른다
    const head = helpHeading('div', 'sub-h sk-head', `<span>${t('ch.skill.h')}</span>`, 'skills');
    const order = el('button', 'btn sm sk-order-btn', t('ch.skill.order'));
    order.disabled = SYS.skill.activesFor(h).length < 2;
    order.onclick = () => openModal('skillOrder');
    head.appendChild(order);
    wrap.appendChild(head);
    wrap.appendChild(skillCardGrid(h, tipCtx));
    const go = el('button', 'btn sm go-tree', t('ch.skill.go'));
    go.classList.toggle('has-points', (h.masteryPoints ?? 0) > 0);
    // 탭 이동이 아니라 **창**이다 (SCREEN_DESIGN §7 개정 2026-09-01) — 대상 영웅은 이 탭이 이미 골랐다
    // ~~해고 버튼~~ 은 2026-09-09 에 **영웅 띠의 고른 카드**로 옮겼다(사용자 지시 · §5) — 이 줄은 다시 버튼 하나다
    go.onclick = () => openModal('skill');
    wrap.appendChild(go);
    return wrap;
}

/** 액티브 셋 카드 줄 — 캐릭터 탭 「액티브 스킬」(§6)과 도서관 배우기 머리(§17 · ADR-0578)가 **같은 함수**를 그린다 —
 *  고유 · 습득 · 전직 칸이 늘 셋 · 찬 칸은 그림 · 빈 칸은 점선 · 잠긴 칸은 자물쇠 · 칸 아래 출처 글자 · 꺼진 칸은 흑백.
 *  찬 칸 그림 오른쪽 아래에 `Lv.n` — 캐릭터 탭 · 도서관 머리 둘 다 (ADR-0576 · 2026-10-21 ADR-0701 — ~~캐릭터 탭은 그림 하나뿐이라 안 단다~~) */
function skillCardGrid(h, tipCtx) {
    // 꺼진 칸 [2026-09-29 · R187 · §6 · ADR-0446] — **무기가 필요한 스킬**(타격 · 회복 · 소환)이 든 무기의 무기군과 안 맞으면 전투에서 안 나간다 ·
    //   칸을 가리지 않는다(2026-10-03 · R204 — ~~배운 칸만~~ R197). 판정은 `skill.fitsWeapon`(맨손 = 무기군 없음) 하나 — 전투(`battle.slotOf`)와 같다
    const worn = G?.items?.[h.equipped?.weapon] ?? null;
    const classes = worn ? D.weaponGroups[worn.group]?.classes ?? null : null;
    const isOff = a => !SYS.skill.fitsWeapon(SYS.skill.resolve(a), classes);
    // 꺼진 칸의 설명창 — 이름 줄 맨 오른쪽의 필요 무기 칩이 위험색이 된다(`ctx.off` · 2026-10-03 · ADR-0496 — ~~맨 위 한 줄 `.tip-need`~~ ADR-0446)
    const needTip = a => skillTipCard(a, { ...tipCtx, off: true });
    const grid = el('div', 'sk-cards');
    activeCells(h).forEach((a, i) => {
        const off = !!a && isOff(a);
        const c = el('div', `sk-card${a ? '' : ' vacant'}${off ? ' off' : ''}`);
        // 찬 칸은 **그림 하나** — 이름 · 초 · 효과 문장은 툴팁이 말한다 (화면에 두면 툴팁과 두 번 찍힌다).
        // 빈 칸 안은 **글자를 안 넣는다**: 칸이 아이콘 크기라 `Not advanced` 가 물리적으로 안 들어간다
        // (9px 로 낮추고 여백을 걷어도 잘렸다 — ko 만 통과하는 칸은 통과가 아니다). 사유는 `title` 이 든다.
        // ⚠ 사유를 **찍는** 자리는 스킬 트리 창 목록(activeSlots)이다 — 거기는 가로줄이라 글자 자리가 있다
        // 잠긴 빈 칸은 가운데에 닫힌 자물쇠 [2026-09-29 사용자 지시 · §6 · ADR-0425] — 둘째 칸 = 배울 레벨 전 · 셋째 칸 = 전직 전
        const locked = !a && slotLocked(i, h);
        c.innerHTML = a ? `<span class="ico">${skillImg(a)}</span>${skLvTag(a)}` : locked ? `<span class="sk-lock">${lockIcon(true)}</span>` : '';
        if (locked) c.classList.add('locked');
        // 출처는 **칸 아래 글자**가 말한다 [2026-09-15 사용자 지시 · ADR-0121] — 그래서 툴팁에 `source` 를 안 넘긴다(출처 칩이 안 선다)
        if (a) bindTipNode(c, () => (off ? needTip(a) : skillTipCard(a, tipCtx)));
        // 잠긴 칸의 툴팁은 **한 줄** — 칸마다의 문장(책 = 도서관에서 · 전직 = 전직 후) [2026-09-30 사용자 지시 · ADR-0466] · 값은 표(`skillbook_learn_level` · `advance_unlock_level`)
        else if (locked) { const txt = t(`sk.lock.${ACTIVE_SOURCES[i]}`, { n: slotLockLevel(i) }); bindTipNode(c, () => el('div', 'tip-card tip-mini', `<div class="tip-name">${txt}</div>`)); c.setAttribute('aria-label', txt); }
        else { c.title = emptySlotText(i, h); c.setAttribute('aria-label', emptySlotText(i, h)); }
        // ~~둘째 칸을 누르면 스킬북 창~~ — 2026-09-29 사용자 지시로 걷었다(ADR-0426). 칸은 누를 수 없고 배우기 · 만들기는 도서관 탭(§17)에만 선다
        const slot = el('div', 'sk-slot');
        slot.append(c, el('span', 'sk-src', sourceName(i)));
        grid.appendChild(slot);
    });
    return grid;
}

/**
 * 스킬 우선순위 창의 속 [2026-10-28 사용자 지시 · SCREEN_DESIGN §6 · ADR-0937] — 찬 칸의 스킬을 **지금 우선순위대로 위에서 아래로**
 * (`skill.activesFor` 의 배열 순서 = 전투의 동률 결정자). 줄 = 순번 · 그림(`Lv.n`) · 이름. 줄을 끌어 다른 줄 사이에 놓으면 그리로 들어간다
 */
function skillOrderBody() {
    const h = heroById(state.heroUid);
    const list = el('div', 'sk-order-list');
    if (!h) return list;
    const plus = SYS.item.skillPlusOf(SYS.game.heroItems(G, h));
    const actives = SYS.skill.activesFor(h, { skillPlus: plus });
    const ids = actives.map(a => a.id);
    actives.forEach((a, i) => {
        const s = { ...skillInfo(a.id), lv: 1 + (a.up ?? 0) };
        const row = el('div', 'sk-order-row',
            `<span class="sk-order-no">${i + 1}</span><span class="sk-order-ico">${skillImg(s)}${skLvTag(s)}</span><span class="sk-order-name">${L(s.name)}</span>`);
        bindSkillOrderDrag(row, list, h.uid, ids);
        list.appendChild(row);
    });
    return list;
}

/**
 * 우선순위 줄 옮기기 — 영웅 띠 순서 옮기기(`bindRosterDrag` · ADR-0571)와 **같은 손**이다. 놓을 곳은 줄이 아니라 **틈** —
 * 커서에 가장 가까운 줄의 위 반이면 그 위 틈, 아래 반이면 그 아래 틈 · 끄는 동안 그 틈에 가로 삽입선(`.sk-order-insert`) ·
 * 제 위아래 틈과 목록 밖은 선도 놓기도 없다. 놓으면 옮긴 순서 전체를 `game.setSkillOrder` 에 넘긴다(계약은 순열을 받는다)
 */
function bindSkillOrderDrag(node, list, uid, ids) {
    const rows = () => [...list.querySelectorAll('.sk-order-row')];
    /** 포인터 아래의 틈 번호(0 = 맨 위 … n = 맨 아래) — 목록 밖이거나 제 위아래 틈이면 -1 */
    const gapAt = e => {
        if (document.elementFromPoint(e.clientX, e.clientY)?.closest('.sk-order-list') !== list) return -1;
        const rs = rows();
        let near = 0, best = Infinity;
        rs.forEach((r0, k) => {
            const r = r0.getBoundingClientRect();
            const d = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
            if (d < best) { best = d; near = k; }
        });
        const r = rs[near].getBoundingClientRect();
        const gap = near + (e.clientY > (r.top + r.bottom) / 2 ? 1 : 0);
        const from = rs.indexOf(node);
        return gap === from || gap === from + 1 ? -1 : gap;
    };
    // 삽입선 — 틈 한가운데 · 줄 폭. 띠의 선과 같은 까닭으로 고스트와 같은 층(`#stage` 직속 · 한 장 단위)에 그 위로 선다
    const showLine = e => {
        const gap = e ? gapAt(e) : -1;
        let line = $('#stage > .sk-order-insert');
        if (gap < 0) { line?.remove(); return; }
        const rs = rows(), half = (parseFloat(getComputedStyle(list).rowGap) || 0) / 2;
        const r = stageRect(rs[Math.min(gap, rs.length - 1)]);
        if (!line) line = $('#stage').appendChild(el('div', 'sk-order-insert'));
        line.style.top = `${gap < rs.length ? r.top - half : r.bottom + half}px`;
        line.style.left = `${r.left}px`;
        line.style.width = `${r.right - r.left}px`;
    };
    bindCardDrag(node, '.sk-order-list', (_, e) => {
        const gap = gapAt(e);
        if (gap < 0) return false;
        const from = rows().indexOf(node);
        const next = ids.slice();
        next.splice(gap > from ? gap - 1 : gap, 0, ...next.splice(from, 1));   // 아래로 가면 제가 빠진 한 칸만큼 당겨진다
        if (SYS.game.setSkillOrder(G, uid, next).ok) save();
        return true;
    }, showLine);
}

/**
 * 해고 창의 속 — 상태 셋을 한 창이 든다 (SCREEN_DESIGN §6).
 * **버튼이 상태를 말한다** [개정 2026-09-09 사용자 지시] — 문장은 한 줄, 답하는 길은 버튼이다:
 *   ① 장비를 걸치고 있다 → 「모든 장비를 해제해야 합니다」 + **[확인] 하나** (할 수 있는 게 닫는 것뿐이라 고를 것이 없다)
 *   ② 마지막 한 명이다 → 같은 꼴(막힘 + [확인] 하나) — 0명이 되면 복구가 막힌다 (INTERFACE §2-7)
 *   ③ 다 벗었다 → 「영웅을 해고합니다」 + **[확인] [취소]** (되돌릴 수 없어서 취소가 눈에 보여야 한다 — §3)
 * ⚠ 옛 판은 막힘 상태에 **버튼이 아예 없어** 창을 X 로만 닫을 수 있었고, 확인 상태에도 취소가 없었다.
 * **판정은 `game.dismissState` 가 낸다** [2026-09-22 · 부채 #56] — 화면이 규칙을 다시 쓰지 않는다. 막힘은 ①② 말고도
 *   원정에서 싸우는 중 · 수색 나가 있음 둘이 더 있고, 문장은 결과 코드의 키(`ch.err.<코드>`)다. 옛 판은 장비 · 마지막 한 명만 직접 세어
 *   원정 · 수색 중인 영웅에게 ③ 을 띄웠고 [확인] 을 누른 뒤에야 거절 플래시가 떴다
 */
function dismissBody() {
    const h = heroById(state.heroUid);
    const box = el('div', 'dismiss-box');
    if (!h) return box;
    const { err } = SYS.game.dismissState(G, h.uid);
    const actions = el('div', 'dismiss-actions');
    if (err) {
        // 막힘 — 문장 하나 + 닫는 버튼 하나. 장비만 사용자 지시 문구(`ch.dismiss.blocked`)이고 나머지는 플래시와 같은 키를 그대로 쓴다(같은 말을 두 키에 두지 않는다)
        box.appendChild(el('div', 'down', err === 'equipped' ? t('ch.dismiss.blocked') : tLock(`ch.err.${err}`)));
        const ok = el('button', 'btn', t('ui.ok'));
        ok.onclick = closeModal;
        actions.appendChild(ok);
    } else {
        box.appendChild(el('div', '', t('ch.dismiss.confirm')));
        // 확인이 파괴적인 쪽이라 위험 색은 여기 남는다 — 취소는 평범한 버튼이다
        const ok = el('button', 'btn danger', t('ui.ok'));
        ok.onclick = () => {
            const name = L(h.name);
            const r = SYS.game.dismiss(G, h.uid, now());
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

/* 스킬북 — 도서관 탭(§17) 오른쪽 열 두 카드의 속. ~~캐릭터 탭 스킬북 창(`bookBody`)~~ 은 2026-09-29 사용자 지시로 걷었다(ADR-0426).
   **판정은 `game.bookState` 가 낸다** — 화면이 규칙을 다시 쓰지 않는다. 두 카드 다 **아이콘 칸 + 위 줄**이다(ADR-0570 · ADR-0573):
   칸을 눌러 고르고(파란 겉 테두리 — 상단의 `.td-picked`) 위 줄의 버튼을 누른다 — 고르기 + 누르기가 두 번 누름이다(§3).
   덮어쓰기는 고를 때 버튼이 이미 [덮어쓰기](위험 색)로 서 있다 — ~~첫 누름이 `state.bookArm` 으로 무장~~(ADR-0420 · 2026-10-09 걷음) */

/** 책 아이콘 칸 하나 — 스킬 그림 · (있으면) 오른쪽 아래 글자 · 고르면 파란 겉 테두리 · 올리면 설명창 · 누르면 고르기 / 풀기 */
function bookCell(id, picked, tip, onPick, corner = '') {
    const cell = el('div', `inv-cell filled${picked ? ' td-picked' : ''}`, `<span class="inv-icon">${skillImg(skillInfo(id))}</span>${corner}`);
    bindTipNode(cell, tip);
    cell.onclick = onPick;
    return cell;
}

/** 스킬 업그레이드 = 도서관 탭 오른쪽 위 카드(가진 책을 읽는 자리) — 제목(「스킬 업그레이드」 `bk.up.h`)은 카드가 든다 (§17 · ADR-0422 · ADR-0595 · ADR-0597) */
function bookLearnInto(box, h, bs) {
    const tipCtx = heroSkillCtx(h);
    const err = bs.hero.err;
    const errText = err && err !== 'unbuilt' ? tLock(`bk.err.${err}`, { n: bs.need.need }) : '';   // 안 열림(`unbuilt`)은 카드의 잠김 베일이 말한다 (ADR-0928)
    const cur = bs.hero.skill;   // 배운 칸 — 차 있으면 새 책은 덮어쓰기다(아래 버튼이 [덮어쓰기])
    // 막힘 — 카드 맨 위 한 줄(레벨 미달 · 쓰러짐). **지금 가진 스킬 카드 셋은 전직 패널 이름 줄 아래다**(`advanceBody`)
    //   [2026-10-12 사용자 지시 「가진책에있는 기본스킬을 전직쪽의 영웅 이름아래로」 · ADR-0595 — ~~배우기 카드 머리~~ ADR-0567 · ADR-0589]
    if (errText) box.appendChild(el('div', 'down bk-err', errText));
    // **읽기 줄**(고른 책의 이름 · 지금 `Lv.n` · 버튼) · **아이콘 칸**(그림 · 오른쪽 아래 권수 `×n` — 1권도 찍는다 · 상단 물약 칸과 같은 자리) · 소제목은 없다(카드 제목이 곧 머리 · ADR-0595)
    //   [2026-10-09 사용자 지시 「내가 가진 책도 아이콘 형태로 해서 오른쪽아래에 xn으로」 · ADR-0573 — ~~책마다 한 줄 · 이름 뒤 권수~~(ADR-0460)]
    const own = el('div', 'bk-sec');
    if (!bs.books.length) { own.appendChild(el('div', 'muted bk-empty', t('bk.none'))); box.appendChild(own); return; }
    const sel = bs.books.find(b => b.id === state.bookSel) ?? null;
    // 이 영웅이 이 책을 읽으면 — `learn`(새로 배운다 · 배운 칸이 차 있으면 덮어쓴다) | `upgrade`(이미 가진 스킬 — 고유 · 배운 칸) (`game.bookState` · R216 · ADR-0529)
    const p = sel?.plan;
    const up = p?.act === 'upgrade';
    const over = !!sel && !up && !!cur;   // 덮어쓰기 — 앞의 스킬과 그 레벨이 사라지고 책으로 안 돌아온다(§3) · 누르기 전에 버튼이 위험 색으로 말한다
    const bar = el('div', 'td-buy bk-buy', sel
        ? `<span class="td-buy-n">${L(skillInfo(sel.id).name)}${up ? `<span class="bk-lv">${t('sk.lvTag', { n: p.lv + 1 })}</span>` : ''}</span>`
        : '<span class="td-buy-n muted">—</span>');
    // 업그레이드는 드는 책 수를 버튼이 말한다(피보나치라 단계마다 다르다) · 상한(끝 하나 — `skillbook_upgrade_max`)이면 「최대」
    //   (2026-10-20 · R293 · ADR-0680 — ~~스킬 도감이 연 상한 「도감 Lv.n」~~ ADR-0640)
    const label = up ? (p.err === 'maxUp' ? t('bk.max') : t('bk.upgrade', { n: p.need }))
        : t(over ? 'bk.overwrite' : 'bk.learn');
    const btn = el('button', `btn sm ${over ? 'danger' : 'primary'}`, label);
    btn.disabled = !sel || !!err || (up && !!p.err);
    btn.onclick = () => {
        const res = SYS.game.learnBook(G, h.uid, sel.id, now());
        if (!res.ok) flashErr('bk', res.err, 'skillbook', { n: bs.need.need });
        else { save(); flash(res.upgraded ? 'bk.upgraded' : 'bk.learned', { name: L(h.name), skill: L(skillInfo(sel.id).name), n: (res.lv ?? 0) + 1 }); }
        render();   // 그 책이 남아 있으면 고른 채 남는다 — 다 읽어 없어지면 `find` 가 못 찾아 저절로 풀린다
    };
    bar.appendChild(btn);
    own.appendChild(bar);
    const grid = el('div', 'bk-grid');
    for (const b of bs.books) {
        const bu = b.plan?.act === 'upgrade' ? b.plan.lv : null;   // 이미 가진 스킬이면 지금 레벨의 설명창 (R216)
        grid.appendChild(bookCell(b.id, sel === b,
            () => skillTipCard(bu === null ? { id: b.id } : { id: b.id, up: bu, lv: bu + 1 }, tipCtx),
            () => { state.bookSel = sel === b ? null : b.id; render(); },
            `<span class="inv-lv">×${b.n}</span>`));
    }
    own.appendChild(grid);
    box.appendChild(own);
}

/** 기본 책 만들기 = 도서관 탭 오른쪽 아래 카드 — 제목은 카드가 든다 (§17).
 *  **맨 위 만들기 줄 + 그 아래 아이콘 칸**(그림만) — 칸을 눌러 고르면 줄에 이름 · 비용 · [만들기]가 선다 · 만들어도 고른 채 남는다
 *  [2026-10-09 사용자 지시 「스킬북 만들기를 그냥 아이콘만 보이게 하고 눌렀을때 위에 가격이 얼만지 보이도록」 · ADR-0570 — ~~책마다 한 줄~~ ·
 *  칸 · 고른 표시 · 줄은 상단의 것(`.inv-cell` · `.td-picked` · `.td-buy` — §8-3 「고르고 산다」)을 빌린다] */
function bookCraftInto(box, h, bs) {
    const tipCtx = heroSkillCtx(h);
    // 칸 = **가진 스킬 도안**(`bookState.craft` — 한 장 이상 · 모든 책이 도안을 요구한다) · 하나도 없으면 한 줄 [2026-10-12 사용자 지시 · ADR-0600 — ~~기본 책~~ ADR-0570 ·
    //   2026-10-20 R293 도안은 쌓이는 소모품 — 만들면 한 장 준다 · 다 쓰면 칸이 빠져 고른 것이 저절로 풀린다 · ADR-0680]
    if (!bs.craft.length) { box.appendChild(el('div', 'muted bk-empty', t('bk.craft.none'))); return; }
    const sel = bs.craft.find(c => c.id === state.bookCraftSel) ?? null;
    const herbId = D.labMaterials.find(m => m.post === 'gather')?.id;
    // 만들기 줄 — 고른 책의 이름 · 비용(모자란 재화만 붉다) · [만들기]. 고른 것이 없으면 `—` 와 꺼진 [만들기]
    const part = (res, need, have) => `<span class="${have < need ? 'down' : ''}"><b>${need.toLocaleString()}</b> ${resName(res)}</span>`;
    const bar = el('div', 'td-buy bk-buy', sel
        ? `<span class="td-buy-n">${L(skillInfo(sel.id).name)}</span><span class="bk-cost">${part('gold', sel.gold, G.resources.gold)}${part('dust', sel.dust, G.materials?.dust ?? 0)}${sel.herb && herbId ? part(herbId, sel.herb, G.materials?.[herbId] ?? 0) : ''}</span>`
        : '<span class="td-buy-n muted">—</span>');
    const btn = el('button', 'btn sm primary', t('bk.make'));   // 가진 책도 만든다 — 쌓인다 (ADR-0460)
    btn.disabled = !sel || !!sel.err;
    btn.onclick = () => {
        const res = SYS.game.craftBook(G, sel.id);
        if (!res.ok) flashErr('bk', res.err, 'book_craft', { n: bs.need.need });
        else { save(); flash('bk.crafted', { skill: L(skillInfo(sel.id).name) }); }
        render();
    };
    bar.appendChild(btn);
    box.appendChild(bar);
    // 아이콘 칸 — 그림 + 오른쪽 아래 장수 `×n`(가진 책 칸의 권수와 같은 자리 · 1장도 찍는다 · ADR-0680) · `skill.csv` 행 순서 · 올리면 스킬 설명창 · 누르면 고르기(다시 누르면 풀린다)
    const grid = el('div', 'bk-grid');
    for (const c of bs.craft) grid.appendChild(bookCell(c.id, sel === c, () => skillTipCard({ id: c.id }, tipCtx), () => { state.bookCraftSel = sel === c ? null : c.id; render(); },
        `<span class="inv-lv">×${c.n}</span>`));
    box.appendChild(grid);
}

/* 세부 옵션의 표기 규칙(감쇠율 · 저항 상한 · 단위 · 대표 3줄)과 줄 조립은 `tip.js` 에 산다 [2026-09-14] — 유닛 툴팁도 같은 행을 그리게 되어
   한 곳으로 모았다 (`sheetPages` · `sheetRowsHtml` · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0114) */

/** 설명창 맥락의 밑수 범위 — 공격력은 무기군이 정한 채널 하나 · 회복 밑수는 마법 공격력 (R90 — 둘 다 `{min, max}` · INTERFACE §2-8) */
const rangeCtx = cb => {
    const atk = cb.atk_physical ?? cb.atk_magic;
    return { atkMin: atk?.min, atkMax: atk?.max, matkMin: cb.atk_magic?.min, matkMax: cb.atk_magic?.max };
};

/** 「착용 중」 카드의 스킬 칸 맥락 — 그 영웅의 **지금 값** (§6 · ADR-0139). 페이퍼돌 · 가방 비교 · 유닛 툴팁 장비 hover 가 같이 쓴다 */
const heroSkillCtx = h => {
    const cb = combatOf(h);
    return { period: cycleOf(h), ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats, cdr: cb.cooldown_reduction, skillTags: cb.option_fx?.skillTags, atkPct: cb.atk_pct_sum, healOut: cb.option_fx?.healOut };
};

/**
 * 영웅 툴팁 장비 hover도 캐릭터 탭 페이퍼돌과 **같은** 「착용 중」 아이템 카드 한 장이다 (ADR-0182) — 스킬 칸까지 같다 [2026-09-23 사용자 지시 · ADR-0312].
 * 이 카드는 Alt 를 누른 채로만 뜨므로 스킬 칸은 식이 선 모양으로 선다 — 캐릭터 탭에서 Alt 를 누른 것과 같다. 몬스터 장비 카드(`monsterItemTipOf`)도 같다
 */
function equippedItemTipCard(h, item) {
    if (!h || !item) return null;
    return tipCard(item, t('tip.equipped'), [], heroSkillCtx(h), { level: h.level });
}

/** ②-3·4 세부 옵션 1·2 — 1 = 늘 먹는 것 · 2 = 조건부, 묶음 사이 간격 · 스크롤 없이 (2026-09-27 · ADR-0381). 물리 방어 행은 감쇠율을 병기한다 */
function detailPanels(h) {
    const c = combatOf(h);
    // 두 쪽 · 묶음 · 행 목록 · 줄 조립은 유닛 툴팁의 두 열과 같은 함수다 (tip.js:sheetPages · SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0115)
    return sheetPages().map((rows, pi) => {
        const p = el('div', 'panel');
        p.appendChild(helpHeading('h2', '', t('ch.detail.hn', { n: pi + 1 }), 'combat_stats'));
        const list = el('div', 'cs-scroll');
        list.dataset.sheet = String(pi);   // 보관 칸 미리보기가 이 목록을 그 자리에서 다시 쓴다 (ADR-0619)
        list.innerHTML = sheetRowsHtml(rows, c);
        bindStatTips(list);   // 값이 `—` 인 줄도 — 비어 있는 축이 다음 장비의 자리다 (ADR-0581)
        p.appendChild(list);
        return p;
    });
}

/**
 * 세부 옵션 미리보기 [2026-10-14 · SCREEN_DESIGN §6 「세부 옵션 1 · 2」 · ADR-0619] — 보관 칸에 올린 동안 두 목록을 「끼면」 시트로 **그 자리에서** 다시 쓴다.
 * 바뀐 줄은 방향 색(`sheetRowsHtml` 의 견줄 시트 · `formula.statBetter`) · `it` 이 없으면 지금 값으로 되돌린다.
 * 「통째로 다시 그린다」의 예외다 — 올린 동안의 표시라 상태가 아니고(Alt 카드를 그 자리에서 다시 짓는 것과 같은 종류) 다음 `render()` 가 지운다.
 * 목록(`.cs-scroll[data-sheet]`)이 없는 화면은 할 일이 없다
 */
function previewSheet(h, it) {
    const lists = document.querySelectorAll('.cs-scroll[data-sheet]');
    if (!lists.length || !h) return;
    const now = combatOf(h);
    const shown = it ? combatWith(h, it) : now;
    const pages = sheetPages();
    lists.forEach(list => {
        list.innerHTML = sheetRowsHtml(pages[+list.dataset.sheet], shown, it ? now : null);
        bindStatTips(list);
    });
}

/* ── 보관 (③ 아이템) ── */

/** 보고 있는 인벤토리의 부대 번호 — 부대 버튼이 고른 것(ADR-0521) · 열린 편성 수 안으로 자른다 */
const invNo = () => Math.min(Math.max(1, state.invNo), G.presets.length);
/** 보고 있는 인벤토리 — 읽기만 한다 */
const invBag = () => SYS.game.bagOf(G, invNo()) ?? [];

/** 분해함을 닫는다 [ADR-0184 · ADR-0673] — 탭을 떠날 때와 [취소] · `Esc` 뒤에 부른다. 함에 오른 것은 제자리(아무것도 안 사라졌다) · 필터도 비운다 */
function clearBagSel() {
    state.bagSelMode = false;
    state.bagSortMode = null;
    state.bagSel.clear();
    state.cubeAuto.clear();
    for (const s of Object.values(state.cubeF)) s.clear();
    state.itemMenu = null;   // 우클릭 메뉴도 탭 밖으로 안 샌다 (ADR-0451)
}

/** 보관 칸이 향하는 영웅 — 관전에서 아레나 빈 곳을 눌러 비웠으면 없다(카드를 다시 누를 때까지 · ADR-0849) · 그 밖은 고른 영웅 */
const bagHero = () => (state.btNoPick ? null : heroById(state.heroUid));

const BAG_ROWS = 3;   // 보관 격자의 줄 수 — 가방 높이가 원정 화면과 같고 안 줄어든다(ADR-0384)
/** 보관 — **왼쪽 창고 / 오른쪽 인벤토리 두 칸** [2026-09-11 사용자 확정 · SCREEN_DESIGN §6 · item_design §1].
 *  **갈래 탭은 없다 — 장비만 든다** [2026-09-21 · ADR-0188]. 재료(가루 · 낙인)는 셸 머리의 자원 줄이 이미 찍고 있어
 *  같은 값을 두 번 보여주던 칸이었다. 드롭이 쌓이는 곳은 인벤토리 하나뿐이고(압력은 그쪽이 든다) 창고는 **유저가 옮긴 것만** 든다 */
function itemsPanel(h, { onPick = null, selUid = null, selUids = null } = {}) {
    const row = el('div', 'bag-row');
    // **줄은 3 으로 박고 열은 칸 수가 정한다** — 열 = 상한 ÷ 3 · 두 칸이 열 수만큼 폭을 나눠 가져 칸 크기가 같다(style.css `.bag-row`)
    const lim = SYS.game.limitsOf(G);
    for (const where of ['stash', 'bag']) {
        const p = storagePanel(h, where, { onPick, selUid, selUids });
        p.style.setProperty('--cols', String(Math.ceil(lim[where] / BAG_ROWS)));
        row.appendChild(p);
    }
    // 분해함은 보관 줄 바로 위 가운데에 뜬다 — 보관 칸을 안 덮는다(칸을 눌러 올리는 손짓이 본체다 · ADR-0673)
    if (state.bagSelMode) row.appendChild(salvageCube(h));
    return row;
}

const CUBE_COLS = 6, CUBE_ROWS = 4;   // 분해함 격자 — 가로 6 × 세로 4 [2026-10-27 사용자 지시 · ADR-0934 — 옛 4 × 4 ADR-0673] · 한 번에 이만큼만 오른다(통째 정리는 자동 분해의 몫)
const cubeCap = () => CUBE_COLS * CUBE_ROWS;

/** 베이스 옵션의 굴린 값(비율) — 무기 「무기 데미지 +%」 · 방어구 「방어력 +%」 줄. 베이스 줄이 없으면(반지 · 목걸이) null */
const fixedOf = it => (it.affixes ?? []).find(a => a.src === 'fixed' && (a.stat === 'atk_pct' || a.stat === 'armor_def_pct'))?.v ?? null;

/**
 * 분해함 필터 세 열 — **등급 · 레벨 · 베이스** [2026-10-20 · SCREEN_DESIGN §6 · ADR-0673]. 묶음 하나 = `{key, label, has}`.
 * 레벨 = 아이템 구간 폭(무기 피해 · 방어구 방어력이 오르는 구간)으로 만렙까지 · 그 위(등급 보정으로 넘는 ilvl)는 하나로 (ADR-0447 의 구간 그대로).
 * 베이스 = 베이스 옵션 값을 `salvage_pick_fixed_step` 폭으로 두 베이스 옵션의 위끝까지 — 베이스 줄이 없는 것은 어느 구간에도 안 든다
 */
function cubeCols() {
    const B = D.balance;
    const lv = [];
    for (let lo = 1; lo <= B.hero_level_cap; lo += B.weapon_atk_band_levels) {
        const hi = Math.min(lo + B.weapon_atk_band_levels - 1, B.hero_level_cap);
        lv.push({ label: `${lo}~${hi}`, has: it => it.ilvl >= lo && it.ilvl <= hi });
    }
    lv.push({ label: `${B.hero_level_cap + 1}+`, has: it => it.ilvl > B.hero_level_cap });
    const top = Math.max(B.weapon_fixed_atk_pct_max, B.armor_fixed_def_pct_max), step = B.salvage_pick_fixed_step;
    const fx = [];
    for (let k = 0; k * step < top - 1e-9; k++) {
        const lo = k * step, hi = Math.min(lo + step, top), last = hi >= top - 1e-9;
        fx.push({ label: `~${Math.round(hi * 100)}%`, has: it => { const v = fixedOf(it); return v != null && (k === 0 || v > lo + 1e-9) && (last || v <= hi + 1e-9); } });
    }
    return [
        { id: 'rarity', head: t('ch.sel.byRarity'), opts: Object.entries(M.RARITY).map(([id, r]) => ({ key: id, label: L(r), color: r.color, has: it => it.rarity === id })) },
        { id: 'ilvl', head: t('ch.sel.byLevel'), opts: lv.map((o, i) => ({ key: i, ...o })) },
        { id: 'fixed', head: t('ch.sel.byFixed'), opts: fx.map((o, i) => ({ key: i, ...o })) },
    ];
}

/** 필터가 함에 올릴 것(`cubeSync` · ~~[올리기]~~ ADR-0695) — 보고 있는 인벤토리(창고는 안 건드린다 · ADR-0521)의 잠기지 않은 것 중 필터에 맞고 아직 함에 없는 것을 **낮은 것부터**.
 *  열 안은 「또는」 · 열끼리는 「그리고」 · 안 고른 열은 조건 없음. 낮은 것 = 등급(`mock.js:RARITY` 순서) → 아이템 레벨 → 베이스 옵션 값 */
function cubeCandidates(cols) {
    const order = Object.keys(M.RARITY);
    const hit = it => cols.every(c => {
        const on = state.cubeF[c.id];
        return !on.size || c.opts.some(o => on.has(o.key) && o.has(it));
    });
    return invBag().map(itemOf).filter(it => it && !it.locked && !it.box && !state.bagSel.has(it.uid) && hit(it))
        .sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity) || a.ilvl - b.ilvl || (fixedOf(a) ?? -1) - (fixedOf(b) ?? -1));
}

/**
 * 필터를 누르면 함이 바로 따라온다 [2026-10-21 사용자 「일반/매직 이런거 클릭하면 거기에 해당하는 아이템들이 위 상자에 보이도록」 · SCREEN_DESIGN §6 · ADR-0695] —
 * 필터가 올렸던 것(`cubeAuto`)을 내리고 지금 필터에 맞는 것을 낮은 것부터 남은 칸만큼 올린다. 매번 처음부터 고르므로 **누른 순서와 무관**하다.
 * 손으로 올린 것은 그대로 · 고른 묶음이 하나도 없으면 아무것도 안 올린다(안 고른 열 = 조건 없음이라 그대로면 인벤토리 전부가 걸린다)
 */
function cubeSync(cols) {
    for (const uid of state.cubeAuto) state.bagSel.delete(uid);
    state.cubeAuto.clear();
    if (!Object.values(state.cubeF).some(s => s.size)) return;
    for (const it of cubeCandidates(cols).slice(0, cubeCap() - state.bagSel.size)) {
        state.bagSel.add(it.uid);
        state.cubeAuto.add(it.uid);
    }
}

/** 함에서 내린다 — 제자리로 돌아간다. 필터가 올린 것이었으면 그 표시도 뗀다 */
function cubeDrop(uid) {
    state.bagSel.delete(uid);
    state.cubeAuto.delete(uid);
}

/** 함에 올린다 · 이미 올라 있으면 내린다 — 보관 칸 클릭이 부른다. 잠긴 것 · 찬 함은 플래시만 (ADR-0673) */
function cubeToggle(it) {
    if (state.bagSel.has(it.uid)) { cubeDrop(it.uid); return; }
    if (it.box) { flash('ch.err.sealed'); return; }   // 열지 않은 상자는 분해함에 안 오른다 (ADR-0731)
    if (it.locked) { flash('ch.sel.lockedNo'); return; }
    if (state.bagSel.size >= cubeCap()) { flash('ch.sel.full'); return; }
    state.bagSel.add(it.uid);
}

/**
 * 분해함 [2026-10-20 사용자 지시 「호라드림함같은 창 · 4x4 · 화면 가운데 · 아이템창 방해 x · 고정수치가 높은 값들을 살리는 로직」 · SCREEN_DESIGN §6 · ADR-0673].
 * 왼쪽 = 필터 세 열 · 오른쪽 = 6×4 격자(ADR-0934) + 가루 미리보기 · [분해하기] · [취소].
 * 필터 버튼은 체크 토글이고 **누르면 함이 바로 따라온다**(`cubeSync` · 2026-10-21 · ADR-0695 — ~~함을 바로 안 바꾸고 [올리기]가 적용~~ ADR-0673).
 * [분해하기] 뒤에는 함이 비고 **필터도 풀린다** — 켜 두면 다음 한 함이 저절로 차 [분해하기] 두 번 누름에 안 본 묶음이 녹는다. 잠긴 것은 처음부터 안 오른다(건너뛸 일이 없다)
 */
const salvageMaterialText = mats => Object.entries(mats ?? {}).filter(([, n]) => n > 0).map(([id, n]) => `${resName(id)} +${n.toLocaleString()}`).join(' · ');
function salvageCube(h) {
    const box = el('div', 'salv-cube');
    box.appendChild(helpHeading('div', 'salv-title', t('ch.sel.title'), 'salvage'));
    const body = el('div', 'salv-body');

    const left = el('div', 'salv-left');
    const cols = cubeCols();
    const open = invBag().map(itemOf).filter(it => it && !it.locked && !it.box);   // 꺼진 채 서는 판정 — 그 묶음에 올릴 것이 하나도 없나 · 열지 않은 상자는 안 센다
    const fl = el('div', 'salv-filters');
    for (const c of cols) {
        const col = el('div', 'salv-col');
        col.appendChild(el('span', 'salv-k', c.head));
        for (const o of c.opts) {
            const on = state.cubeF[c.id].has(o.key);
            const b = el('button', `btn sm toggle${on ? ' on' : ''}`, o.label);
            b.disabled = !on && !open.some(o.has);
            // 등급 색 — 크래프트엔 `--rarity-*` 토큰이 없어 인라인이다 · 꺼진 버튼엔 안 칠한다(밝은 등급 색이 흐림을 덮어 켜진 것처럼 읽혔다)
            if (o.color && !b.disabled) b.style.color = o.color;
            b.onclick = () => {
                if (on) state.cubeF[c.id].delete(o.key); else state.cubeF[c.id].add(o.key);
                cubeSync(cols);   // 함이 바로 따라온다 (ADR-0695)
                render();
            };
            col.appendChild(b);
        }
        fl.appendChild(col);
    }
    left.appendChild(fl);
    body.appendChild(left);

    const right = el('div', 'salv-right');
    const grid = el('div', 'salv-grid');
    const inCube = [...state.bagSel].map(itemOf).filter(Boolean);
    for (let i = 0; i < cubeCap(); i++) {
        const it = inCube[i];
        const cell = el('div', `inv-cell${it ? ' filled' : ''}`);
        if (it) {
            cell.style.borderColor = rarity(it.rarity).color;
            const up = upShown(it);
            cell.innerHTML = `<span class="inv-icon">${itemImg(it)}</span>`
                + (up > 0 ? `<span class="inv-up">+${up}</span>` : '')
                + `<span class="inv-lv">${t('ch.itemLv', { n: it.ilvl })}</span>`;
            if (it.rarity === 'unique') cell.classList.add('shine');
            // 장착 대상이 없으면(관전에서 비웠다 · ADR-0849) 비교 없이 그 아이템 카드만 — 보관 칸과 같다
            bindTip(cell, it, h ? { compare: itemOf(h.equipped[SYS.game.equipTarget(h, it)]), hero: h } : {});
            cell.onclick = () => { hideTip(); cubeDrop(it.uid); render(); };   // 제자리로 돌아간다
        }
        grid.appendChild(cell);
    }
    right.appendChild(grid);

    const foot = el('div', 'salv-foot');
    const preview = SYS.game.salvagePreview(G, inCube.map(it => it.uid));
    foot.appendChild(el('span', 'salv-dust', salvageMaterialText(preview.mats)));
    const go = el('button', 'btn sm primary', t('ch.sel.go'));
    go.disabled = !inCube.length;
    go.onclick = () => {
        let n = 0;
        for (const it of inCube) {
            const r = SYS.game.salvage(G, it.uid);
            if (r.ok) n++;
        }
        if (n) { flash('ch.sel.salvagedMats', { n, mats: salvageMaterialText(preview.mats) }); save(); }
        // 함은 열린 채 비고 **필터도 풀린다** — 다음 묶음은 필터를 다시 누른다(두 번째 [분해하기]는 빈 함이다 · ADR-0695)
        state.bagSel.clear();
        state.cubeAuto.clear();
        for (const s of Object.values(state.cubeF)) s.clear();
        render();
    };
    const cx = el('button', 'btn sm', t('ch.sel.cancel'));
    cx.onclick = () => { clearBagSel(); render(); };
    foot.appendChild(go);
    foot.appendChild(cx);
    right.appendChild(foot);
    body.appendChild(right);
    box.appendChild(body);
    return box;
}

/**
 * 자동 분해 창 [2026-09-21 · SCREEN_DESIGN §6 · **2026-10-22 개편 ADR-0717** · item_design §6-5 · R316] — **부대 하나의 규칙**.
 * 속은 넷 — ① 프리셋 줄(칸 고르개 · [불러오기] · [저장] — 둘 다 복사) ② 레벨 조건([안 봄] · 단계 버튼 · 지금 기준 레벨)
 * ③ 등급 × 부위 격자(칸 = 보존 · 베이스 · 분해 · 줄 · 열 머리 = 일괄 · 문턱 줄) ④ 미리보기(걸리는 장비 그림 · [지금 인벤토리에 적용] 두 번) · 최근 분해.
 * 전부 **누르는 즉시 먹는다**(저장 버튼 없음 · 인벤토리의 것은 그대로 · 다음 드롭부터). 부대 = `state.salvNo`(여는 쪽이 정한다 — 인벤토리 = 보고 있는 부대 · 출정 창 = 고른 편성).
 * 규칙 문장(「모두 만족해야 보존」 · 「유니크 · 크래프트는 언제나 보존」)은 창에 없다 — 도움말(`ch.salvageHint`)이 든다.
 * 인벤토리 칸을 흐리게 하는 미리보기는 없다 — 창 바탕이 인벤토리를 덮는다. 걸리는 것은 창 안 그림 줄이 보여 준다
 */
const SALV_NEXT = { keep: 'base', base: 'salvage', salvage: 'keep' };   // 칸을 누를 때의 다음 모드 — 베이스가 없는 부위는 base 를 건너뛴다
const SALV_TH_STEP = 0.1;   // 문턱 −/+ 한 번 = 10%p — 칸이 일곱 열이라 단계 버튼을 하나씩만 둔다 (ADR-0717)
const SALV_SHOW = 12;       // 미리보기 그림 줄에 세우는 수 — 넘치면 끝에 `+k` (창 폭 소관)
const salvNoOf = () => state.salvNo ?? invNo();
const salvNext = (mode, hasBase) => { const n = SALV_NEXT[mode ?? 'salvage']; return n === 'base' && !hasBase ? SALV_NEXT[n] : n; };
const salvGapText = g => (g === 0 ? t('ch.auto.lvGap0') : t('ch.auto.lvGap', { g: -g }));

/** 창 머리 — 「자동 분해 · Party I」 (§6 · ADR-0717) */
function autoSalvageHead() {
    return helpHeading('h2', '', t('ch.auto.hNo', { p: t('pt.preset', { n: M.roman(salvNoOf()) }) }), 'auto_salvage');
}

/** 장비 그림 칸 — 가방 칸과 같은 그림 · 테두리 · 레벨 배지 · 툴팁(탐험 완료 칸과 같은 조립 · `exploreDoneBody`) */
function salvItemCell(it) {
    const cell = el('div', 'inv-cell filled');
    cell.style.borderColor = rarity(it.rarity).color;
    cell.innerHTML = `<span class="inv-icon">${itemImg(it)}</span><span class="inv-lv">${t('ch.itemLv', { n: it.ilvl })}</span>`;
    if (it.rarity === 'unique') cell.classList.add('shine');
    bindTip(cell, it);
    return cell;
}

function autoSalvageBody() {
    const no = salvNoOf();
    const v = SYS.game.salvageView(G, no);
    const box = el('div', 'asv-box');
    if (!v) return box;
    const done = () => { state.autoArm = false; save(); render(); };

    // ① 프리셋 — 칸 고르개(빈 칸은 흐리다) + [불러오기](빈 칸이면 꺼짐) · [저장] — 결과는 플래시
    const pRow = el('div', 'asv-row');
    pRow.appendChild(el('span', 'auto-k', t('ch.auto.preset')));
    const cur = Math.min(Math.max(1, state.salvSlot ?? 1), v.slots.length);
    pRow.appendChild(segmented(v.slots.map(s => ({ id: s.slot, label: String(s.slot), cls: s.empty ? 'asv-empty' : '' })), cur,
        id => { state.salvSlot = id; render(); }));
    const ld = el('button', 'btn sm', t('ch.auto.load'));
    ld.disabled = !!v.slots[cur - 1]?.empty;
    ld.onclick = () => { if (SYS.game.loadSalvageSlot(G, no, cur).ok) flash('ch.auto.loaded', { n: cur }); done(); };
    const sv = el('button', 'btn sm', t('ch.auto.save'));
    sv.onclick = () => { if (SYS.game.saveSalvageSlot(G, no, cur).ok) flash('ch.auto.saved', { n: cur }); done(); };
    pRow.append(el('span', 'tools-push'), ld, sv);   // 버튼 둘은 줄 오른쪽 끝 — 빈 칸이 민다(보관 도구 줄과 같은 장치)
    box.appendChild(pRow);

    // ② 레벨 조건 — [안 봄] + `−5` `−1` 값 `+1` `+5` + 지금 기준 레벨. 안 봄일 때 단계 버튼은 첫 값(CSV)으로 켠다
    const lRow = el('div', 'asv-row');
    lRow.appendChild(el('span', 'auto-k', t('ch.auto.lv')));
    const lv = el('div', 'lv-row');
    const off = el('button', `btn sm toggle${v.lvGap === null ? ' on' : ''}`, t('ch.auto.lvOff'));
    off.onclick = () => { SYS.game.setSalvageLevel(G, no, null); done(); };
    lv.appendChild(off);
    const step = d => {
        const b = el('button', 'btn sm lv-btn', d > 0 ? `+${d}` : `−${-d}`);
        const next = v.lvGap === null ? D.balance.auto_salvage_lv_gap_default : Math.max(-D.balance.hero_level_cap, Math.min(0, v.lvGap + d));
        b.disabled = v.lvGap !== null && next === v.lvGap;
        b.onclick = () => { SYS.game.setSalvageLevel(G, no, next); done(); };
        return b;
    };
    lv.append(step(-5), step(-1));
    lv.appendChild(el('span', `lv-val auto-val${v.lvGap !== null ? ' up' : ''}`, v.lvGap === null ? t('ch.auto.lvOff') : salvGapText(v.lvGap)));
    lv.append(step(1), step(5));
    if (v.lvGap !== null) lv.appendChild(el('span', 'asv-at', v.keepFrom === null ? '—' : t('ch.itemLv', { n: Math.max(1, v.keepFrom) })));
    lRow.appendChild(lv);
    box.appendChild(lRow);

    // ③ 격자 — 열 머리 = 부위(그 열 전부) · 문턱 줄 · 줄 머리 = 등급(그 줄 전부 · 등급 색) · 칸 = 보존 · 베이스 · 분해(누를 때마다 돈다)
    //   머리는 그 줄 · 열의 **첫 칸의 다음 모드**로 맞춘다 — 저장되는 것은 격자 하나뿐이다(공통 층이 따로 없다 · ADR-0717)
    const grid = el('div', 'asv-grid');
    grid.style.setProperty('--asv-cols', v.parts.length);
    grid.appendChild(el('span', 'asv-corner'));
    const slotName = id => L(D.slots.find(s => s.id === id) ?? { ko: id, en: id });
    for (const p of v.parts) {
        const first = v.rows.map(r => v.cells[p.part][r]).find(m => m !== null);
        const b = el('button', 'btn sm asv-head', slotName(p.part));
        b.onclick = () => { SYS.game.setSalvageCells(G, no, { part: p.part }, salvNext(first, p.hasBase)); done(); };
        grid.appendChild(b);
    }
    grid.appendChild(el('span', 'asv-k', t('ch.auto.th')));
    for (const p of v.parts) {
        const c = el('div', 'asv-th');
        if (!p.hasBase) { c.appendChild(el('span', 'asv-none', '—')); grid.appendChild(c); continue; }
        const mk = d => {
            const b = el('button', 'btn sm asv-th-btn', d > 0 ? '+' : '−');
            const next = Math.max(0, Math.min(p.max, p.base + d * SALV_TH_STEP));
            b.disabled = Math.abs(next - p.base) < SALV_TH_STEP / 2;
            b.onclick = () => { SYS.game.setSalvageBase(G, no, p.part, next); done(); };
            return b;
        };
        c.append(mk(-1), el('span', 'asv-th-val', `${Math.round(p.base * 100)}%`), mk(1));
        grid.appendChild(c);
    }
    for (const r of v.rows) {
        const first = v.parts.map(p => v.cells[p.part][r]).find(m => m !== null);
        const h = el('button', 'btn sm asv-head asv-rh', L(rarity(r)));
        h.style.color = rarity(r).color;
        h.onclick = () => { SYS.game.setSalvageCells(G, no, { rarity: r }, salvNext(first, true)); done(); };
        grid.appendChild(h);
        for (const p of v.parts) {
            const m = v.cells[p.part][r];
            if (m === null) { grid.appendChild(el('span', 'asv-cell none', '—')); continue; }   // 반지 · 목걸이의 일반 — 없는 칸
            const b = el('button', `btn sm asv-cell ${m}`, t(`ch.auto.m.${m}`));
            b.onclick = () => { SYS.game.setSalvageCell(G, no, p.part, r, salvNext(m, p.hasBase)); done(); };
            grid.appendChild(b);
        }
    }
    box.appendChild(grid);

    // ④ 미리보기 — 걸리는 장비 그림 줄 + [지금 인벤토리에 적용]. 첫 누름이 그 자리를 확인 줄로 바꾼다 · 걸리는 것이 없으면 꺼진다 · 이 부대만 · 잠근 것 제외
    const pv = SYS.game.autoSalvagePreview(G, no);
    const prev = el('div', 'asv-sec');
    prev.appendChild(el('div', 'asv-sub', t('ch.auto.previewMats', { n: pv.n, mats: salvageMaterialText(pv.mats) })));
    const strip = el('div', 'inv-cells asv-strip');
    for (const uid of pv.uids.slice(0, SALV_SHOW)) strip.appendChild(salvItemCell(G.items[uid]));
    if (pv.uids.length > SALV_SHOW) strip.appendChild(el('span', 'asv-more', `+${pv.uids.length - SALV_SHOW}`));
    if (pv.uids.length) prev.appendChild(strip);
    const act = el('div', 'auto-act');
    if (state.autoArm && pv.n > 0) {
        act.appendChild(el('span', 'auto-confirm', t('ch.auto.confirm', { n: pv.n })));
        const ok = el('button', 'btn sm primary', t('ch.auto.ok'));
        ok.onclick = () => {
            const r = SYS.game.applyAutoSalvage(G, no);
            if (r.n) { flash('ch.sel.salvagedMats', { n: r.n, mats: salvageMaterialText(r.mats) }); save(); }
            state.autoArm = false;
            render();
        };
        const cx = el('button', 'btn sm', t('ch.sel.cancel'));
        cx.onclick = () => { state.autoArm = false; render(); };
        act.append(ok, cx);
    } else {
        const ap = el('button', 'btn sm', t('ch.auto.apply'));
        ap.disabled = pv.n === 0;
        ap.onclick = () => { state.autoArm = true; render(); };
        act.appendChild(ap);
    }
    prev.appendChild(act);
    box.appendChild(prev);

    // 최근 분해 — 이 부대에서 드롭 순간에 녹은 것의 사본 · 최신이 왼쪽 · 읽는 자리
    const log = el('div', 'asv-sec');
    log.appendChild(el('div', 'asv-sub', t('ch.auto.log')));
    if (!v.log.length) log.appendChild(el('span', 'muted', t('ch.auto.logNone')));
    else {
        const ls = el('div', 'inv-cells asv-strip');
        for (const it of v.log) ls.appendChild(salvItemCell(it));
        log.appendChild(ls);
    }
    box.appendChild(log);
    return box;
}

/**
 * 출정 창 「들고 가는 것」의 자동 분해 칸 [2026-10-22 · §4-1 · ADR-0717] — 고른 편성의 격자를 **작은 칸 색**으로(창의 칸과 같은 색 · 없는 칸은 빈자리)
 * + 레벨 조건이 섰으면 짧은 글 + **[바꾸기]** — 그 편성의 자동 분해 창을 열고, 닫으면 출정 창으로 돌아온다(`state.modalBack`).
 * 「들고 가는 것」에서 누를 수 있는 것은 이것 하나다(ADR-0216 의 「클릭도 드래그도 없다」를 이 버튼만 대체)
 */
function salvReadBlock(no) {
    const v = SYS.game.salvageView(G, no);
    const b = el('div', 'dw-block dw-salv');
    b.appendChild(helpHeading('div', 'sub-h', t('ch.auto.h'), 'auto_salvage'));
    if (!v) return b;
    const row = el('div', 'asv-read');
    const mini = el('div', 'asv-mini');
    mini.style.setProperty('--asv-cols', v.parts.length);
    for (const r of v.rows) for (const p of v.parts) {
        const m = v.cells[p.part][r];
        mini.appendChild(el('span', `asv-dot ${m ?? 'none'}`));
    }
    const ed = el('button', 'btn sm', t('ex.salvEdit'));
    ed.onclick = () => { state.salvNo = no; state.modalBack = state.modal; state.autoArm = false; openModal('autoSalvage'); };
    row.append(mini, ed);
    b.appendChild(row);
    // 레벨 조건은 그 아래 줄 — 칸 폭은 위 물약 칸이 정한다(`.dw-col > .dw-salv`) · 넘치면 줄을 바꾼다
    if (v.lvGap !== null) b.appendChild(el('div', 'asv-mini-lv', salvGapText(v.lvGap)));
    return b;
}

/**
 * [정렬] + 펼친 기준 셋 — 칸마다 제 것 [2026-09-21 · ADR-0242 · ADR-0247]. 누르면 **[정렬] 오른쪽으로 [등급순] · [레벨순] · [부위순]이
 * 차례로 미끄러져 나오고**, [정렬]을 다시 누르면 접힌다. 기준을 고르면 그 칸을 **한 번** 줄 세우고 접힌다.
 * 펼치면 한 번에 한 모드라 다른 칸의 펼침 · 분해함은 닫힌다.
 * 움직임은 **펼친 직후 한 번만** 단다(`bagSortAnim`) — 통째로 다시 그리는 화면이라 그냥 두면 관전 갱신마다 다시 미끄러진다.
 * **창고는 탭마다 기준이 다르다** [2026-10-14 사용자 지시 · ADR-0620] — 장비 = 등급 · 레벨 · 부위 / 스킬북 = 개수 · 직업 · 티어(`game.sortBooks`) /
 * 재료 = **꺼진 채 선다**(줄 세울 것이 없다 — 숨기지 않아 탭을 바꿔도 버튼이 같은 자리다)
 */
function sortTools(where, tab = 'equip') {
    const off = tab === 'mat';
    const open = state.bagSortMode === where && !off;
    const wrap = el('div', 'sort-tools');
    const b = el('button', `btn sm toggle${open ? ' on' : ''}`, t('ch.sort.start'));
    b.disabled = off;
    b.onclick = () => {
        clearBagSel();
        if (!open) { state.bagSortMode = where; state.bagSortAnim = true; }
        render();
    };
    wrap.appendChild(b);
    if (open) {
        const fold = el('div', `sort-fold${state.bagSortAnim ? ' anim' : ''}`);
        state.bagSortAnim = false;
        const book = tab === 'book';
        for (const key of book ? ['count', 'class', 'tier'] : ['rarity', 'ilvl', 'slot']) {
            const k = el('button', 'btn sm', t(`ch.sort.${key}`));
            k.onclick = () => {
                if ((book ? SYS.game.sortBooks(G, key) : SYS.game.sortStorage(G, where, key, invNo())).ok) save();
                clearBagSel();
                render();
            };
            fold.appendChild(k);
        }
        wrap.appendChild(fold);
    }
    return wrap;
}

/** 도구 줄 — 이름 + (인벤토리 쪽에만) 부대 버튼 ─ 오른쪽 끝으로 창고는 [장비|재료|스킬북] · [정렬] / 인벤토리는 ([자동 장착] — 캐릭터 탭 · 원정 관전만 · ADR-0721 · ADR-0722) · [분해] · [자동 분해] 또는 그 모드의 줄 + [정렬].
 *  장착 대상 글자는 없다 — 아레나에서 고른 카드가 든다 (§6 · §4-2 · ADR-0523 · ADR-0524 · ADR-0616) */
function storageTools(where) {
    const tools = el('div', 'items-tools');
    tools.appendChild(helpHeading('span', 'items-name', t(where === 'stash' ? 'ch.bag.stash' : 'ch.bag.inv'), where === 'stash' ? 'stash' : 'inventory'));
    // 분해 · 자동 분해는 **한 벌만** 둔다 — 두 칸에 같이 걸리는 축이라 칸마다 두면 어느 쪽 것인지 읽을 수 없다 (ADR-0184).
    //   [정렬]만 칸마다다 — 누른 칸 하나만 줄 세운다 (ADR-0242). 분해함이 떠 있는 동안 두 칸 다 안 선다
    // 창고 칸에만 장비 · 재료 · 스킬북 탭 [2026-09-27 · ADR-0379 · 자리 2026-10-06 ADR-0524 · 스킬북 2026-10-14 ADR-0616] — 재료 · 책은 부대가 나눠 갖지 않는다(창고처럼 하나다).
    //   [정렬]은 세 탭 모두 맨 오른쪽 같은 자리 — 기준은 탭이 정하고 재료 탭에서는 꺼진 채다(ADR-0620) · 탭을 바꾸면 분해함 · 정렬 펼침이 풀린다
    const tab = where === 'stash' && ['mat', 'book'].includes(state.stashTab) ? state.stashTab : 'equip';
    // 부대 버튼은 인벤토리 이름 바로 오른쪽 · 버튼은 둘 다 오른쪽 끝으로 — 빈 칸(`.tools-push`)이 민다 [2026-10-06 사용자 지시 · ADR-0523 · ADR-0524]
    if (where === 'bag') tools.appendChild(bagPartyTools());
    tools.appendChild(el('span', 'tools-push'));
    if (where === 'stash') {
        const seg = segmented([{ id: 'equip', label: t('ch.bag.equip') }, { id: 'mat', label: t('ch.bag.mat') }, { id: 'book', label: t('ch.bag.book') }], tab,
            id => { clearBagSel(); state.stashTab = id; render(); });
        seg.classList.add('bag-tabs');
        tools.appendChild(seg);
        if (!state.bagSelMode) tools.appendChild(sortTools('stash', tab));
    } else {
        // 도구 줄 [잠금]은 없다 — 잠금은 우클릭 메뉴가 든다 [2026-09-29 사용자 지시 · ADR-0454]
        // [분해] · [자동 분해]는 건물이 막지 않는다 — 처음부터 열려 있다 (R140)
        // [분해] = 분해함을 띄운다 · 떠 있으면 켜진 모양이고 다시 누르면 [취소]와 같다 — 함이 떠 있는 동안 줄엔 이것 하나만 선다 (ADR-0673)
        const open = state.bagSelMode;
        // [자동 장착] — **캐릭터 탭 · 원정 관전**에서 [분해] 바로 왼쪽 · 분해함이 떠 있는 동안은 안 선다 [2026-10-22 사용자 지시 · §6 · ADR-0721 · ADR-0722].
        //   대상은 칸 클릭이 끼우는 영웅과 같다 — 캐릭터 탭 = 영웅 띠 · 원정 = 아레나의 고른 카드(둘 다 `state.heroUid`)
        if (!open && (state.tab === 'character' || state.tab === 'expedition')) {
            const ae = el('button', 'btn sm', t('ch.autoEq'));
            const ah = bagHero();   // 관전에서 대상을 비웠으면 꺼진 버튼 (ADR-0849)
            if (!ah) ae.disabled = true;
            else ae.onclick = () => autoEquipHero(ah);
            tools.appendChild(ae);
        }
        const sv = el('button', `btn sm toggle${open ? ' on' : ''}`, t('ch.sel.start'));
        sv.onclick = () => { clearBagSel(); if (!open) state.bagSelMode = true; render(); };
        tools.appendChild(sv);
        if (!open) {
            // 자동 분해 — **보고 있는 부대의 규칙**이 무엇이든 녹일 수 있으면 **켜진 모양**이다: 인벤토리가 왜 덜 차는지가 같은 줄에서 읽힌다 (ADR-0203 · ADR-0717)
            const au = el('button', `btn sm toggle${SYS.game.salvageView(G, invNo())?.on ? ' on' : ''}`, t('ch.auto.btn'));
            au.onclick = () => { state.salvNo = invNo(); state.modalBack = null; state.autoArm = false; openModal('autoSalvage'); };
            tools.appendChild(au);
            tools.appendChild(sortTools('bag'));           // 맨 오른쪽 — 펼치면 그 위로 기준이 뜬다 (ADR-0242 · ADR-0247 · ADR-0523)
        }
    }
    // 칸 수 글자 · 장착 대상 글자는 없다 — 빈 칸까지 격자가 상한만큼 그리고, 장착 대상은 아레나의 고른 카드가 든다 [2026-10-06 사용자 지시 · ADR-0521 · ADR-0523]
    return tools;
}

/**
 * 부대 버튼 — 인벤토리 도구 줄의 이름 바로 오른쪽 [2026-10-06 사용자 지시 · ADR-0521 · 자리 ADR-0523]. 인벤토리는 부대마다 하나고 누른 부대의 것이 격자에 선다.
 * 열린 편성 수만큼 선다(이름은 편성 탭 · 관전 칸과 같은 「Party n」). 분해함이 떠 있는 동안 꺼진다 — 함에 오른 것이 안 보이는 인벤토리로 숨지 않게
 */
function bagPartyTools() {
    const items = G.presets.map((_, i) => ({ id: i + 1, label: t('pt.preset', { n: M.roman(i + 1) }), disabled: state.bagSelMode }));
    const seg = segmented(items, invNo(), no => { clearBagSel(); state.invNo = no; render(); });
    seg.classList.add('bag-party');
    return seg;
}

/** 재료 칸 하나 — 창고 재료 탭 · 대장간 합성 사다리가 같이 쓴다. 그림(없으면 종류 실루엣) + 왼쪽 위 단계 숫자(ADR-0983) + 오른쪽 아래 보유 수량 · 올리면 이름 · 보유 (ADR-0857 · ADR-0856) */
const matCell = x => {
    const icon = M.materialIcon(x.id), kind = resKind(x.id);
    const cell = el('div', `inv-cell filled mat-cell${x.have ? '' : ' zero'}`);
    cell.innerHTML = `<span class="inv-icon res-${kind}">${icon ? `<img src="${icon}" alt="" draggable="false">` : M.RES_ART[kind] ?? ''}</span>${matTier(x.id)}`
        + `<span class="inv-lv">${x.have.toLocaleString()}</span>`;
    bindTipNode(cell, () => el('div', 'tip-card', `<div class="tip-name">${resName(x.id)}</div><div class="tip-sub">${t('cn.owned', { n: x.have.toLocaleString() })}</div>`));
    return cell;
};

/**
 * 창고 재료 탭 — 줄(철광석 · 약초 · 목재 · 가루)마다 단계 칸이 이어진 묶음 · **한 행에 묶음을 열 수가 담는 만큼 나란히** (SCREEN_DESIGN §6 · ADR-0982 · 단계 숫자 ADR-0983 · 자리 ADR-0524).
 * 어느 칸이 서는지는 `materialsState` 가 정한다(줄 × 단계 · 0 개여도). 칸 = `matCell` · 조회만.
 * 칸 자리는 격자 행 · 열을 박는다(`--r` · `--c`) — 묶음 수 = 열 수 ÷ 단계 수라 행이 보관 격자 줄 수(`BAG_ROWS`)를 안 넘는다(넘으면 아이템창이 위로 커진다 · 2026-10-30 사용자 「양옆으로」).
 * 남는 빈 칸이 그 뒤 구멍을 앞에서부터 메운다.
 * **장비 격자와 같은 격자 · 같은 칸 수다** [2026-09-27 사용자 지시 「아이템 아이콘과 같은 크기 · 인벤토리나 창고 크기가 바뀌면 안 돼」] —
 * 줄 머리 글자는 없다(사용자 지시 「왼쪽에 채광 채집 벌목 글씨 삭제」) — 재료 칸은 첫 칸부터 선다. 남는 칸은 빈 칸으로 메워 탭을 바꿔도 패널 높이가 같다
 */
function materialGrid() {
    const grid = el('div', 'inv-cells wide mat-grid');
    const cap = SYS.game.limitsOf(G).stash;
    const total = Math.max(cap, (G.stash ?? []).length);   // 창고 장비 격자와 같은 칸 수 (storagePanel · ADR-0524)
    const items = SYS.game.materialsState(G).items;
    const tiers = Math.max(1, ...items.map(x => x.tier));
    const perRow = Math.max(1, Math.floor(Math.ceil(cap / BAG_ROWS) / tiers));   // 한 행의 묶음 수 — 열 수는 itemsPanel 의 `--cols` 와 같은 식 (ADR-0982)
    let used = 0, line = -1, post = null;
    for (const x of items) {
        if (x.post !== post) { post = x.post; line++; }
        const cell = matCell(x);
        cell.style.setProperty('--r', Math.floor(line / perRow) + 1);
        cell.style.setProperty('--c', (line % perRow) * tiers + x.tier);
        grid.appendChild(cell);
        used++;
    }
    // 스킬북은 여기 안 선다 — 제 탭(`bookStashGrid`)이 있다 [2026-09-30 사용자 지시 · ADR-0460 · 2026-10-14 ADR-0616]
    // 빈 칸 — 자리가 정해진 칸들 사이의 구멍을 앞에서부터 메운다(격자 자동 배치)
    for (let i = used; i < total; i++) grid.appendChild(el('div', 'inv-cell'));
    return grid;
}

/**
 * 창고 스킬북 탭 — **가진 책만** [2026-10-14 사용자 지시 「창고의 재료 오른쪽에 스킬북 탭 만들고 거기에 내가 보유한 스킬북 나오도록」 · SCREEN_DESIGN §6 · ADR-0616].
 * 격자는 재료 탭과 같다(장비 격자 · 창고 칸 수) · 순서는 도서관 스킬 업그레이드 칸과 같다(`game.bookState` — 영웅 없이 부르면 `books` 만 읽힌다).
 * 칸 = 스킬 그림 + 오른쪽 아래 `×n`(도서관 칸과 같은 글자) · 올리면 주인 없는 설명창(리포트 책 칸과 같다) · 조회만 — 배우기는 도서관(§17)
 */
function bookStashGrid() {
    const grid = el('div', 'inv-cells wide stash-books');
    const books = SYS.game.bookState(G).books;
    for (const b of books) {
        const cell = el('div', 'inv-cell filled book-cell', `<span class="inv-icon">${skillImg(skillInfo(b.id))}</span><span class="inv-lv">×${b.n}</span>`);
        bindTipNode(cell, () => skillTipCard({ id: b.id }, {}));
        grid.appendChild(cell);
    }
    // 빈 칸 — 창고 장비 격자와 같은 칸 수 · 넘친 책도 그린다(장비 격자의 넘침과 같다)
    const total = Math.max(SYS.game.limitsOf(G).stash, (G.stash ?? []).length);
    for (let i = books.length; i < total; i++) grid.appendChild(el('div', 'inv-cell'));
    return grid;
}

/** 반대편으로 보낸다 — `Ctrl`+클릭 · 끌어 놓기가 같이 쓴다(같은 함수라 거절 코드도 같다 · ADR-0187). 인벤토리로는 보고 있는 부대의 것으로(ADR-0521).
 *  창고로 보냈는데 창고가 재료 · 스킬북 탭이면 **장비 탭으로 돌려** 들어간 것을 보인다 (ADR-0524 · ADR-0616) */
function sendAcross(where, it) {
    const r = where === 'stash' ? SYS.game.moveToBag(G, it.uid, invNo()) : SYS.game.moveToStash(G, it.uid);
    if (!r.ok) { flash(`ch.err.${r.err}`); return; }   // 창고 칸은 건물이 막지 않는다 — `unbuilt` 가 없다 (R361)
    if (where !== 'stash') state.stashTab = 'equip';
    save();
}

/** 보관 한 칸 — `where` 가 'stash' 면 창고, 'bag' 이면 인벤토리. 칸 수는 그 칸의 상한이 정한다.
 *  `onPick` 을 주면 모드 밖의 칸 클릭이 장착이 아니라 **고르기**다 — 대장간 강화 (§8-2 · ADR-0364) · `selUid` 칸은 강조 테두리 */
function storagePanel(h, where, { onPick = null, selUid = null, selUids = null } = {}) {
    const p = el('div', `panel bag ${where === 'stash' ? 'store-stash' : 'store-bag'}`);
    p.appendChild(storageTools(where));
    if (where === 'stash' && state.stashTab === 'mat') { p.appendChild(materialGrid()); return p; }   // 재료 탭은 창고 칸 (ADR-0524)
    if (where === 'stash' && state.stashTab === 'book') { p.appendChild(bookStashGrid()); return p; }   // 스킬북 탭도 창고 칸 (ADR-0616)
    const uids = where === 'stash' ? (G.stash ?? []) : invBag();   // 인벤토리는 부대 버튼이 고른 부대의 것 (ADR-0521)
    const items = uids.map(itemOf).filter(Boolean);
    const cap = SYS.game.limitsOf(G)[where === 'stash' ? 'stash' : 'bag'];
    // 분해함이 떠 있으면 파선 테두리 — 「지금 칸을 누르면 장착이 아니다」 (ADR-0184 · ADR-0673)
    const moding = state.bagSelMode;
    const grid = el('div', `inv-cells wide${moding ? ' picking' : ''}`);
    // 상한보다 많이 들고 있으면(상한이 줄어든 옛 세이브) **넘친 것도 그린다** — 가방 · 창고는 넘친 채 둔다 (R137 · 새 드롭만 막힌다)
    for (let i = 0; i < Math.max(cap, items.length); i++) {
        const it = items[i];
        if (it && moding && state.bagSel.has(it.uid)) {
            // 함에 오른 것 — 흐린 빈 칸으로 자리만 남는다 · 누르면 돌아온다 (ADR-0673)
            const out = el('div', 'inv-cell gone cube-out');
            out.onclick = () => { cubeDrop(it.uid); render(); };
            grid.appendChild(out);
            continue;
        }
        const cell = el('div', `inv-cell${it ? ' filled' : ''}${it && it.uid === selUid ? ' sel' : ''}${it && selUids?.has(it.uid) ? ' td-picked' : ''}`);
        // 첫 클리어 상자 — 종류마다 한 칸 · 우클릭 [사용]이 보고 있는 영웅의 장비를 깐다 (§6 · ADR-0742)
        if (it?.box) { grid.appendChild(boxCell(cell, it, h, where, moding, onPick)); continue; }
        if (it) {
            cell.style.borderColor = rarity(it.rarity).color;
            const us = { up: upShown(it) };
            // 모서리 배지 셋 [2026-09-21 · ADR-0168 · ADR-0185 · 왼쪽 위 체크는 2026-10-20 걷음 — 분해함 ADR-0673] —
            //   오른쪽 위 = 유저가 쌓은 강화(0 이면 안 선다) · 왼쪽 아래 = 자물쇠(잠근 것만) · 오른쪽 아래 = 태어날 때 박힌 ilvl(언제나 선다)
            //   ilvl 배지는 **장착 대상이 못 끼면 빨강**(요구 레벨 미달 · R215 · ADR-0525) — 칸 클릭이 장착인 자리에서만(대장간 고르기는 그대로)
            const noLv = !onPick && h && SYS.item.canEquip(h, it) === 'level';
            cell.innerHTML = `<span class="inv-icon">${itemImg(it)}</span>`
                + (us && us.up > 0 ? `<span class="inv-up">+${us.up}</span>` : '')
                + (it.locked ? '<span class="inv-lock">🔒</span>' : '')
                + `<span class="inv-lv${noLv ? ' no' : ''}">${t('ch.itemLv', { n: it.ilvl })}</span>`;
            if (it.rarity === 'unique') cell.classList.add('shine');
            // 비교 상대 = 실제로 교체될 위치의 착용품 (반지는 빈 칸 우선, 없으면 1번 칸) · 장착 대상이 없으면(관전에서 비웠다 · ADR-0849) 비교 없이 그 아이템 카드만
            const target = h ? SYS.game.equipTarget(h, it) : null;
            const selling = state.tab === 'shop';
            const ringHint = !selling && h && it.slot === 'ring' ? t('tip.ringSlot', { n: target === 'ring2' ? 2 : 1 }) : '';
            const vs = h ? { compare: itemOf(h.equipped[target]), compareHints: [ringHint], hero: h } : {};
            // 원정 중이면 「끼우면 꺼지는 전술」 줄이 선다 — 끼우기 전에 말한다 (§6 · ADR-0272)
            //   ~~스킬 칸의 맥락(`heroCombatIf`)~~ 은 2026-09-29 걷었다 — 아이템 툴팁에 스킬 칸이 없다(ADR-0421)
            //   반지 칸 줄은 비교의 줄이라 전술 줄 아래에 선다 (ADR-0658)
            //   손가락 툴팁의 버튼 줄 = 우클릭 메뉴와 같은 둘 (ADR-0374 · ADR-0451) — 분해함이 떠 있는 동안 안 선다
            //   인벤토리 칸은 툴팁이 커서 왼쪽에 먼저 선다 — 화면 오른쪽 절반이라 칸마다 쪽이 안 갈린다 (§6 · ADR-0693) · 창고는 기본(오른쪽)
            bindTip(cell, it, { ...vs, hints: selling ? [] : [runTacticHint(h, it)],
                actions: moding ? null : () => itemActions(h, it), side: where === 'bag' ? 'left' : null });
            // 캐릭터 탭이면 세부 옵션 1 · 2 가 「끼면」 값을 미리 보인다 — 올린 동안만 (§6 · ADR-0619). 목록이 없는 화면(관전 · 대장간)은 할 일이 없다
            cell.addEventListener('mouseenter', () => { if (!isTouchInput()) previewSheet(h, it); });
            cell.addEventListener('mouseleave', () => previewSheet(h, null));
            // **끌어서 반대편 격자에 놓아도 옮겨진다** [2026-09-21 · ADR-0187] — `Ctrl`+클릭과 **같은 함수**라 거절 코드도 같다.
            //   분해함이 떠 있는 동안 안 건다 — 함에 올리는 손짓과 끄는 손짓이 같은 칸에서 싸운다 (ADR-0184 · ADR-0673)
            if (!moding) bindCardDrag(cell, where === 'stash' ? '.store-bag' : '.store-stash', () => { sendAcross(where, it); return true; });
            cell.onclick = (e) => {
                if (formDragEnded) return;              // 방금 끌어 놓은 손짓의 클릭 한 번은 삼킨다
                if (state.bagSelMode) {
                    // 분해함이 떠 있다 — **함에 올릴 뿐** 아무것도 사라지지 않는다 (ADR-0184 · ADR-0673)
                    hideTip();
                    cubeToggle(it);
                } else if (e.ctrlKey || e.metaKey) {
                    // **Ctrl + 클릭 = 반대편으로** [2026-09-11 사용자 확정] — 창고 ↔ 인벤토리. Mac 은 Cmd 가 같은 자리다
                    sendAcross(where, it);
                } else if (onPick) {
                    onPick(it);   // 대장간 — 고르기만 한다 (ADR-0364) · 다시 그리기는 onPick 이 한다
                    return;
                } else if (h) {
                    // 창고에서도 **바로** 장착된다 — 꺼내는 단계가 없다 (item_design §1)
                    equipFromStorage(h, it);
                } else return;   // 장착 대상이 없다(관전에서 비웠다) — 아무 일도 없다 (ADR-0849)
                render();
            };
            // **우클릭 = [착용] · [잠금] 버튼** [2026-09-29 사용자 지시 · §6 「우클릭 메뉴」 · ADR-0451] — 커서 자리(한 장 좌표)에 선다.
            //   분해함이 떠 있는 동안 안 뜬다(칸 누르기가 함에 올리기다) · 손가락이 낸 contextmenu 는 길게 누르기(툴팁)라 무시한다 (ADR-0374)
            cell.oncontextmenu = e => {
                e.preventDefault();
                if (moding || isTouchInput()) return;
                hideTip();
                const pt = stagePoint(e);
                state.itemMenu = { uid: it.uid, hero: h?.uid ?? null, x: pt.x, y: pt.y };
                render();
            };
        }
        grid.appendChild(cell);
    }
    p.appendChild(grid);
    return p;
}

/** 보관 칸 장비를 장착한다 — 칸 클릭 · 우클릭 메뉴 [착용] · 손가락 버튼 줄이 같이 부른다. 원정 중 교체면 꺼진 전술 플래시 (R130) */
function equipFromStorage(h, it) {
    const before = runTacticsNow();
    const r = SYS.game.equip(G, h.uid, it.uid);
    if (!r.ok) flash(`ch.err.${r.err}`); else { save(); runChangeFlash(h.uid, before); }
}

/** 자물쇠 하나를 켜고 끈다 — 우클릭 메뉴 · 손가락 버튼 줄의 [잠금] 이 부른다. 결과는 칸의 배지가 든다 · 플래시 없음 (ADR-0207) */
function toggleItemLock(it) {
    if (SYS.game.setItemLock(G, it.uid, !it.locked).ok) save();
}

/** 우클릭 메뉴 · 손가락 버튼 줄의 행동 — [착용] · [잠금]/[잠금 해제] (§6 「우클릭 메뉴」 · ADR-0451). `run` 이 다시 그리기까지 한다 */
function itemActions(h, it) {
    // 상자 칸은 [사용] 하나 — 보고 있는 영웅의 장비를 하나 깐다 · 상자를 까는 유일한 길이다(칸 클릭은 안 깐다 · ADR-0733 · ADR-0742)
    //   장착 대상이 없으면(관전에서 비웠다 · ADR-0849) 상자는 행동이 없고 장비는 [잠금] 하나
    if (it.box) return h ? [{ label: t('ch.menu.open'), run: () => { openBoxCell(h, it); render(); } }] : [];
    const lock = { label: t(it.locked ? 'ch.menu.unlock' : 'ch.menu.lock'), run: () => { toggleItemLock(it); render(); } };
    if (state.tab === 'shop') return [{ label: t(state.shopSell.has(it.uid) ? 'td.sell.remove' : 'td.sell.add'), run: () => toggleShopSell(it) }, lock];
    return h ? [{ label: t('ch.menu.equip'), run: () => { equipFromStorage(h, it); render(); } }, lock] : [lock];
}

/**
 * 보관 칸 우클릭 메뉴 (§6 「우클릭 메뉴」 · ADR-0451) — 옛 자원 자리의 선택 창(ADR-0373 · 2026-10-18 걷음)과 같은 틀:
 * 상태(`state.itemMenu`)가 들고 그리기마다 **한 장 바로 아래**에 다시 선다 · 깔개가 바깥 클릭 · 우클릭을 받아 닫기만 한다 · `Esc` 도 닫는다.
 * 자리는 커서(한 장 좌표) — 왼쪽 위를 대고, 한 장 밖으로 넘치면 커서 반대쪽으로 접는다.
 * 장비가 보관 칸에 없으면(장착 · 분해로 사라졌다) 조용히 닫힌다
 */
function itemMenuPanel() {
    const { uid, hero, x, y } = state.itemMenu;
    // 영웅 없이 연 메뉴(관전에서 장착 대상을 비웠다 · ADR-0849)는 [잠금] 하나 · 상자는 행동이 없어 안 선다
    const it = itemOf(uid), h = hero == null ? null : heroById(hero);
    const acts = it && (hero == null || h) && SYS.game.holderOf(G, uid) ? itemActions(h, it) : [];
    if (!acts.length) { state.itemMenu = null; return; }
    const close = () => { state.itemMenu = null; render(); };
    const back = el('div', 'item-menu-back');
    back.onclick = close;
    back.oncontextmenu = e => { e.preventDefault(); close(); };
    const box = el('div', 'item-menu');
    for (const a of acts) {
        const b = el('button', 'btn sm', a.label);
        b.onclick = () => { state.itemMenu = null; a.run(); };
        box.appendChild(b);
    }
    const st = document.querySelector('#stage');
    st.append(back, box);
    const bw = box.offsetWidth, bh = box.offsetHeight, W = st.offsetWidth, H = st.offsetHeight;
    box.style.left = `${Math.max(8, x + bw > W - 8 ? x - bw : x)}px`;
    box.style.top = `${Math.max(8, y + bh > H - 8 ? y - bh : y)}px`;
}

function renderCharacter(main) {
    const h = heroById(state.heroUid);
    const stack = el('div', 'char-stack page');
    // 해고 버튼은 이 띠에만 뜬다 — 고른 카드의 오른쪽 아래 (SCREEN_DESIGN §5 · 2026-09-09 사용자 지시)
    // 툴팁은 안 건다 — 고른 영웅의 값은 바로 아래 네 칸이 든다 (2026-09-15 사용자 지시 · ADR-0116)
    // 끌어서 카드 사이 틈에 놓으면 그리로 들어간다 — 사이는 한 칸씩 밀리고 당겨진다 (2026-10-09 사용자 지시 · ADR-0571)
    // 위칸 왼쪽은 속한 파티다 — 연구소 밖 모든 카드의 기본이라 따로 안 넘긴다 (ADR-0907 · ADR-0956)
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
 * 아이템 카드 한 장 — 줄 순서는 **머리글(오른쪽 끝 Lv) / 이름 / 메인 옵션 / 옵션 / 힌트**
 * (SCREEN_DESIGN §6 · ADR-0081 · 소속 줄은 머리글로 올라갔다 — ADR-0473).
 * @param hints 하단 힌트. 문자열 하나든 배열이든 받는다 — 반지 칸 · 「착용 중 없음」이 함께 설 수 있다
 * @param skCtx 스킬 칸의 계산 맥락(`{period,atkMin,atkMax,matkMin,matkMax,hpMax,atkType,stats}`) — 착용 중 카드 = 그 영웅의 `game.heroCombat` ·
 *   「이 아이템」 카드 = `game.heroCombatIf`(장착 대상 영웅이 그 무기를 낀 것으로 · ADR-0139) · 몬스터 장비 카드 = 그 몬스터의 표시값(ADR-0312).
 *   생략하면 식이 접힌 채 나온다.
 * @param opts.ranges Shift 동안 옵션 줄 끝에 굴림 범위(ADR-0617) · `opts.delta` = 착용 델타 블록 HTML — 옵션 아래 · 힌트 위에 선다(ADR-0618)
 */
function tipCard(item, headText, hints = [], skCtx, { ranges = false, delta = '', level = null } = {}) {
    if (!item) return null;                      // 빈 카드는 안 세운다 (§6 개정 2026-09-08 — 아래 bindTip)
    const c = el('div', 'tip-card');
    // 죄종은 **이름이 든다** — `composeName` 이 「격노와 찬탈의 둔기」로 죄종 단어를 다 싣는다. 이름은 희귀도 한 색이고 죄종 색은 옵션 줄 태그가 든다 (2026-09-08 사용자 지시 · 2026-09-19 ADR-0175).
    // 하단 죄종 칩은 같은 값을 카드 안에서 두 번 찍던 자리라 걷었다 (SCREEN_DESIGN §6). 장비 패널의 죄종 집계는 별개다
    const g = SYS.item.groupOf(item);            // 무기군 — 직업 전속·행동 주기·공격 타입의 출처 (weapon_group.csv)
    // 머리글 오른쪽 끝 = 종류 + 아이템 레벨 [2026-10-02 · ADR-0473 자리 · 2026-10-06 사용자 지시 · ADR-0526 종류] — 레벨은 가방 칸 배지와 같은 글(`ch.itemLv`)이다.
    //   종류 = 무기군 · 갑옷군 · 투구 · 장갑 · 신발은 갈래 + 부위(갈래 id 가 부위마다 겹친다 — `leather`) · 갈래가 없으면(목걸이 · 반지 · 시작 장비) 부위 이름
    const part = slotDef(item.slot);
    const ag = item.slot === 'weapon' ? null : D.armorGroups?.[item.slot]?.[item.group];
    const kind = g ? L(g) : !ag ? (part ? L(part) : '') : item.slot === 'armor' ? L(ag) : t('tip.kindPart', { group: L(ag), part: L(part) });
    const meta = `${kind ? `<span class="tip-kind">${kind}</span>` : ''}${t('ch.itemLv', { n: item.ilvl })}`;
    // **강화 줄은 없다** (2026-09-08 사용자 지시 · §6) — 단계는 이름 앞의 `+n` 이 이미 들고, 비용·상한은 대장간(§8-2)의 값이다.
    // 그래서 여기서 `game.upgradeState` 를 안 부른다 — 가방 칸의 `+n` 배지와 대장간은 그대로 부른다
    // ~~스킬 칸~~ — 2026-09-29 걷었다(R179 · ADR-0421): 무기가 스킬을 안 담는다(skill_design §2-1). 카드는 다섯 줄이다
    const hintTags = [].concat(hints).filter(Boolean).map(x => `<span class="muted">${x}</span>`).join('');
    // 「착용 중」은 배지다 — 좌우가 뒤집히는 두 장(ADR-0337)에서 착용품을 가르는 표지가 머리글 하나라서 (§6 · ADR-0659). 그 글이 서는 카드 전부 같다
    const worn = headText === t('tip.equipped');
    c.innerHTML = `
        <div class="tip-head tip-head-row"><span${worn ? ' class="tip-worn"' : ''}>${headText}</span><span class="tip-meta">${meta}</span></div>
        <div class="tip-name" style="color:${rarity(item.rarity).color}">${item.up > 0 ? `+${item.up} ` : ''}${L(item.name)}</div>
        ${itemBodyHtml(item, { ranges, level })}
        ${delta}
        ${hintTags ? `<div class="tip-sins">${hintTags}</div>` : ''}`;
    return c;
}

/**
 * 아이템 카드의 **몸** — 메인 옵션 행 + 옵션 줄(출처 태그 · 목걸이 발동 줄 · 「(미적용)」).
 * 툴팁 카드(`tipCard`)와 대장간 강화 칸의 옵션 열(SCREEN_DESIGN §8-2 · ADR-0605)이 **같은 함수**를 부른다 — 두 자리의 옵션 표기가 갈리면 안 된다.
 * 클래스는 `.tip-card` 안의 규칙을 탄다 — 강화 칸은 열에 `tip-card` 를 같이 단다
 * @param opts.ranges Shift 동안 — 옵션 줄 끝에 굴림 범위 `(최소~최대)`(`item.optionRange` · ADR-0617). 강화 칸은 안 넘긴다(툴팁이 아니다)
 * @param opts.level  카드가 가리키는 유닛의 레벨 — 레벨당 옵션 줄 앞에 그 레벨의 합계(ADR-0954) · 없으면 옵션 그대로
 */
function itemBodyHtml(item, { ranges = false, level = null } = {}) {
    const g = SYS.item.groupOf(item);            // 무기군 — 직업 전속·행동 주기·공격 타입의 출처 (weapon_group.csv)
    // 메인 옵션은 **먹인 값**을 찍는다 — 강화 배율 · 그 아이템의 베이스 옵션까지. 툴팁 숫자가 캐릭터 시트와 갈리면 안 된다 (SCREEN_DESIGN §6 · ADR-0309)
    const imp = SYS.item.implicitFixed(item);
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
        // 값은 **피해 범위** `최소~최대` — 강화 배율 · **베이스 옵션 「무기 데미지 +%」**까지 든 파생값이다(`item.weaponDamageFixed` · ADR-0108 · ADR-0307)
        baseRows.push(baseRow(atkStat ? L(atkStat) : t('st.atk'), rangeText(SYS.item.weaponDamageFixed(item)),
            item.element ? t(`st.atkType.${item.element}`) : ''));
        // 속도 줄 = **공격 속도**, 값은 초 / 1회 [2026-09-25 사용자 지시 · ADR-0357 초 · ADR-0358 이름 — 초당 공격속도(ADR-0081)를 걷었다].
        //   이름 · 값 꼴이 세부 옵션 머리의 그 행과 같다(`combat_stat.csv:action_period` · `sk.cycleSec`) — 값은 무기군 밑수(민첩 · 공격 속도 % 전)
        //   마법 무기는 이름이 「캐스팅 속도」다 — 같은 주기 · 이름만 [2026-10-03 · R202 · ADR-0492]
        const cycleStat = statRow('action_period');
        const cycleName = g.damageKind === 'magic' ? t('sk.castSpeed') : cycleStat ? L(cycleStat) : t('sk.cycle');
        baseRows.push(baseRow(cycleName, t('sk.cycleSec', { s: g.period.toFixed(2) })));
    }
    // 방어구 고유값 — 베이스 옵션 「방어력 +%」를 먹인 값(`item.implicitFixed` · ADR-0309)
    if (imp) baseRows.push(baseRow(L(M.statLabel(imp.stat)), M.baseValue(imp.stat, imp.v)));
    const srcs = SYS.item.optionSources(item);   // 옵션 줄 출처 태그 — 죄종은 메인 죄종 줄만 (ADR-0518)
    const lines = (item.affixes ?? []).map((a, i) => `<li>${srcTag(srcs[i])}${affixText(a, item.slot, level)}${ranges ? rangeTag(item, i) : ''}${M.statInert(a.stat) ? inertTag() : ''}</li>`);
    // 갑옷군 고정값 — 베이스 「방어력 +%」 줄 바로 다음에 `[베이스]` 줄로 선다(공격 속도 · 쿨타임 감소 — `armor_group.csv` 그대로 · 0 은 안 선다 ·
    //   Shift 범위 없음 · §6 · ADR-0685). 아이템이 든 접사가 아니라 갈래가 든 값이다(값이 있는 것은 갑옷군뿐).
    //   투구 · 장갑 · 신발의 갈래 특성은 **아이템의 `[베이스]` 줄**이라 위 접사 목록에 이미 선다(굴림 · Shift 범위 있음 · R303).
    //   자리는 앞에서부터 이어진 베이스 줄의 끝 — 정렬하지 않는다
    const ag = item.slot === 'weapon' ? null : D.armorGroups?.[item.slot]?.[item.group];
    if (ag) {
        const traits = [['aspd_pct', ag.aspdPct], ['cooldown_reduction', ag.cdrPct]].filter(([, v]) => v)
            .map(([stat, v]) => `<li>${srcTag('fixed')}${L(M.itemAffixText(item.slot, stat, v))}</li>`);
        let at = 0;
        while (srcs[at] === 'fixed') at++;
        lines.splice(at, 0, ...traits);
    }
    return `
        ${baseRows.length ? `<div class="tip-base">${baseRows.join('')}</div>` : ''}
        ${/* 출처 태그 셋 — 베이스 옵션 · 죄종 이름(그 죄종 색) · 랜덤 (SCREEN_DESIGN §6 · ADR-0100). **죄종 이름은 메인 죄종 줄만** — 계열 굴림의 랜덤 줄도
              `src` 에 계열 죄종을 들지만 태그는 랜덤이다. 어느 줄이 메인인지는 `item.optionSources` 가 낸다 — 줄 자리로 세지 않는다 (2026-10-06 사용자 지시 · ADR-0518).
              순서도 아이템이 든 순서 그대로다 — 렌더러가 정렬하지 않는다. 출처가 없는 옛 접사는 랜덤으로 찍는다 */''}
        ${/* 목걸이는 **첫 줄이 발동 스킬**이다 — 베이스 옵션 자리(`[베이스]`) · 문장은 발동 조건마다 하나 · 간격 초는 `skill.procIntervalSec` 가 낸다.
              전투가 아직 안 읽는 줄은 끝에 「(미적용)」 — 발동 줄과 `inert` 표지가 붙은 stat (SCREEN_DESIGN §6 · ADR-0213) */''}
        <ul>${procLine(item)}${lines.join('') || `<li class="tip-empty">${t('tip.noAffix')}</li>`}</ul>`;
}

/**
 * 표시·위치·넘침 보정은 tip.js 가 든다 (2026-08-28). 여기 남은 건 아이템 카드의 **내용**뿐이다.
 *
 * **머리글은 부르는 자리가 정한다** (§6 개정 2026-09-08) — 종전엔 「비교 상대가 없으면 착용 중」으로 **추론**해서,
 * 리포트의 획득 장비 줄(방금 주운 드롭)에 「착용 중」이 붙어 있었다.
 * @param opts.head    머리글 키. 기본은 「이 아이템」 — 「착용 중」은 페이퍼돌만 넘긴다
 * @param opts.compare 비교 상대. **`null`(교체될 자리가 빔)이면 둘째 카드를 안 세우고** 하단 힌트 한 줄로 접는다 —
 *                     「비어 있음」 넉 자에 툴팁 폭의 절반이 빈 상자로 서 있었다. `undefined` 면 비교 자체를 안 한다
 * @param opts.hints   하단 힌트 — 두 상태 모두 선다(끼우면 꺼지는 전술 — 클릭이 곧 장착이라 누르기 전에 봐야 한다)
 * @param opts.compareHints 비교의 힌트 — 비교 상대가 있는 자리에만 · 전술 줄 아래(반지 칸 · ADR-0658)
 * @param opts.ctx        `item` 카드의 스킬 칸 계산 맥락 — 페이퍼돌은 그 영웅의 `heroCombat` · 가방 · 창고는 `heroCombatIf`(그 무기를 낀 것으로 · ADR-0139)
 * @param opts.compareCtx `compare` 카드의 계산 맥락 — `compare` 는 언제나 착용 중인 것이라(§6) 있으면 준다(itemsPanel)
 * @param opts.actions    손가락 툴팁 버튼 줄의 행동(`tip.js:bindTipNode` 그대로) — 보관 칸의 [착용] · [잠금] (ADR-0451)
 * @param opts.hero       장착 대상 영웅 — 주면 Alt 동안 「이 아이템」 카드 옵션 아래에 착용 델타 「{영웅} 착용 시」가 선다(§6 · ADR-0618 · ADR-0658)
 * @param opts.side       툴팁의 먼저 쪽(`tip.js:bindTipNode` 그대로) — 인벤토리 칸만 `'left'`(커서 왼쪽 먼저 · §6 · ADR-0693)
 *
 * **Shift 범위** [2026-10-14 · §6 · ADR-0617] — 범위를 다는 줄이 있는 카드만 `data-shift` 를 달아 `tip.js:setShift` 가 다시 짓고, 각주에 「Shift 범위」가 더해진다
 *
 * **두 장이면 사이에 `VS`** — 원정 관전의 두 진영 사이와 같은 글자다. DOM 은 늘 `[착용 중, VS, 이 아이템]` 이고
 * 툴팁이 커서 왼쪽으로 접혀도 뒤집지 않는다 — 「착용 중」이 언제나 왼쪽이다(2026-10-21 · §6 · ADR-0690 — ~~「이 아이템」이 커서 쪽~~ ADR-0337)
 *
 * **비교 두 장이 기본 · Alt 동안 착용 델타** [2026-10-18 사용자 지시 · §6 · ADR-0658] — 비교 상대가 있는 자리(`compare !== undefined`)는
 * 묶음(`.tip-compare`) 하나를 세운다 · 델타가 서는 자리면 `data-alt` 를 달아 `tip.js:setAlt` 가 그 묶음을 `_rebuild` 로 다시 짓는다.
 * 묶음은 `display: contents` 라 두 장 · VS 는 여전히 툴팁 줄의 항목이다(style.css).
 * **Alt 로 툴팁이 안 뛴다** — 기본 상태엔 Alt 때 모양의 「이 아이템」 카드를 숨은 사본(`.tip-ghost` · 툴팁 줄 밖)으로 같이 짓고,
 * 아래 넘침 보정(`moveTip`)이 그 키까지 잰다. 카드 바닥은 전술 · 비교 줄 위 · **각주 「Alt 변화」** 맨 아래 — 각주는 Alt 동안에도 선다(ADR-0456)
 */
function bindTip(node, item, { head = 'tip.this', compare, hints = [], compareHints = [], ctx, compareCtx, actions = null, hero = null, side = null, level = hero?.level ?? null } = {}) {
    // 「이 아이템」 카드 — Shift 동안 옵션 줄 범위(ADR-0617) · `withDelta` 면 옵션 아래에 착용 델타(ADR-0618 · Alt 동안만 — ADR-0658)
    //   `level` = 레벨당 옵션 합계의 레벨(ADR-0954) — 장착 대상(`hero`)이 있으면 그 영웅 · 비교 카드도 같은 영웅이 낀 것이라 같은 레벨
    const ranged = hasRanges(item);
    const card = (lines, withDelta = false) => tipCard(item, t(head), lines, ctx, { ranges: ranged && isShiftHeld(), delta: withDelta ? deltaHtml(hero, item) : '', level });
    if (compare === undefined) {
        // 비교가 없는 자리(리포트 드롭 · 페이퍼돌 · 탐험 결과) — 범위를 다는 줄이 있으면 각주 「Shift 범위」 한 줄
        const one = () => {
            const c = card(hints);
            if (c && ranged) {
                c.appendChild(el('div', 'tip-foot', t('tip.item.shiftHint')));
                c.dataset.shift = '1';
                c._rebuild = one;
            }
            return c;
        };
        bindTipNode(node, one, { actions, side });
        return;
    }
    // 비교 줄(반지 칸 · 착용 중 없음)은 기본 상태의 줄이다 — 전술 줄 아래 (ADR-0658)
    const lines = [].concat(hints, compareHints, compare === null ? t('tip.noneEquipped') : []);
    const shiftable = ranged || hasRanges(compare);
    // 각주 — Alt 가 할 일(착용 델타)이 있을 때만 「Alt 변화」 · 범위를 다는 줄이 있으면 「Shift 범위」
    const keys = hero ? (shiftable ? 'tip.item.keysHint' : 'tip.item.altHint') : shiftable ? 'tip.item.shiftHint' : null;
    const thisCard = withDelta => {
        const c = card(lines, withDelta);
        if (keys) c.appendChild(el('div', 'tip-foot', t(keys)));
        return c;
    };
    const build = () => {
        const w = el('div', 'tip-compare');
        if (hero) w.dataset.alt = '1';
        if (shiftable) w.dataset.shift = '1';
        w._rebuild = build;
        const alt = !!hero && isAltHeld();
        // 「착용 중」이 언제나 왼쪽 — `착용 중 | VS | 이 아이템` · 툴팁이 접혀도 같다 (2026-10-21 · §6 · ADR-0690)
        if (compare) {
            w.appendChild(tipCard(compare, t('tip.equipped'), [], compareCtx, { ranges: isShiftHeld(), level }));
            w.appendChild(el('div', 'tip-vs', '<span>VS</span>'));
        }
        w.appendChild(thisCard(alt));
        // Alt 때 모양의 「이 아이템」 카드 — 안 보이고 툴팁 줄에도 안 낀다. 아래 넘침 보정(`tip.js:moveTip`)이 이 키까지 재서
        //   Alt 로 델타가 서도 툴팁이 위로 안 뛴다 (ADR-0658 · 취지는 ADR-0450). Alt 동안엔 실제 카드가 그 키라 안 짓는다
        if (hero && !alt) w.appendChild(thisCard(true)).classList.add('tip-ghost');
        return w;
    };
    bindTipNode(node, build, { actions, side });
}

/**
 * 착용 델타 블록 — 머리 「{영웅} 착용 시」 + **바뀌는 세부 옵션 줄만** `이름 · 지금 → 낀 뒤 · ▲/▼` [2026-10-14 · SCREEN_DESIGN §6 · ADR-0618].
 * 값은 `game.heroCombat` ↔ `game.heroCombatWith`(가방에 없는 상점 물건도) · 줄 조립 · 방향은 `tip.js:sheetDeltaRows`(세부 옵션 1 · 2 와 같은 글자 · `formula.statBetter`).
 * 화살표는 좋아짐 ▲ · 나빠짐 ▼ — 섞인 줄은 비운다 · 바뀌는 줄이 없으면 「변화 없음」. 「총합 더 좋음」은 없다(item_design §6-3)
 */
function deltaHtml(h, item) {
    // 켜지고 꺼지는 스킬 줄이 맨 위 [2026-10-16 · §6 · ADR-0639] — 세부 옵션 줄과 같은 꼴이라 한 목록으로 잇는다
    const rows = [...skillFlipRows(h, item), ...sheetDeltaRows(combatOf(h), combatWith(h, item))];
    const arrow = d => (d > 0 ? '<b class="up">▲</b>' : d < 0 ? '<b class="down">▼</b>' : '<b></b>');
    const body = rows.length
        ? rows.map(r => `<div class="r"><span class="n">${r.name}</span><span class="v">${r.from} → ${r.to}</span>${arrow(r.dir)}</div>`).join('')
        : `<div class="r none">${t('tip.delta.none')}</div>`;
    return `<div class="tip-delta"><div class="tip-delta-h">${t('tip.delta.h', { name: L(h.name) })}</div>${body}</div>`;
}

/**
 * 착용 델타의 스킬 줄 [2026-10-16 · SCREEN_DESIGN §6 · ADR-0639] — 그 영웅의 액티브 칸 셋 가운데 **이 물건을 끼면 켜짐 ↔ 꺼짐이 바뀌는 스킬**만
 * `{name, from, to, dir}`(`sheetDeltaRows` 와 같은 꼴). 판정은 액티브 칸 흑백(`skillCardGrid` · ADR-0446)과 같은 `skill.fitsWeapon` 을
 * 지금 든 무기군 · 낀 뒤 무기군으로 두 번 부를 뿐이다. 무기가 아닌 물건은 무기군이 안 바뀌어 빈 목록이다
 */
function skillFlipRows(h, item) {
    if (item?.slot !== 'weapon') return [];
    const classesOf = it => (it ? D.weaponGroups[it.group]?.classes ?? null : null);
    const now = classesOf(G?.items?.[h.equipped?.weapon] ?? null), next = classesOf(item);
    const word = on => t(on ? 'tip.delta.on' : 'tip.delta.off');
    return activeCells(h).filter(Boolean).flatMap(a => {
        const def = SYS.skill.resolve(a);
        const was = SYS.skill.fitsWeapon(def, now), will = SYS.skill.fitsWeapon(def, next);
        return was === will ? [] : [{ name: L(a.name), from: word(was), to: word(will), dir: will ? 1 : -1 }];
    });
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
    const tipCtx = { period: cycle, ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats, cdr: cb.cooldown_reduction, skillTags: cb.option_fx?.skillTags, atkPct: cb.atk_pct_sum, healOut: cb.option_fx?.healOut };
    const p = el('div', 'panel');
    // 공격 주기는 **제목 줄 오른쪽**에 선다 [2026-09-27 사용자 지시 「탭 높이를 줄여」] — 옛 자리(제목 아래 한 줄)가 창 높이를 먹었다
    p.appendChild(helpHeading('h2', '', `<span>${title ?? t('sk.slots.h')}</span>
        <small class="cycle-line">${t(cb.basic_attack === false ? 'sk.castSpeed' : 'sk.cycle')} <b>${t('sk.cycleSec', { s: cycle.toFixed(2) })}</b></small>`, 'skill_slots'));
    const box = el('div', 'slot-list');
    activeCells(h).forEach((a, i) => {
        const innate = ACTIVE_SOURCES[i] === 'innate';
        const row = el('div', `act-slot${a ? '' : ' empty'}${innate ? ' innate' : ''}`);
        // 칸 이름 = **출처 하나**다 [2026-09-08 사용자 지시] — ~~`1 · 영웅`~~ 의 번호를 뺐다.
        // 순서는 이미 ACTIVE_SOURCES 가 정하고 줄이 위에서 아래로 서므로 번호가 더 말해 주는 것이 없다
        const no = sourceName(i);
        // 빈 칸은 **사유 한 줄**뿐 — 스킬이 없으니 설명도 없다 (SCREEN_DESIGN §7)
        if (!a) row.innerHTML = `<span class="no">${no}</span><span class="muted">${emptySlotText(i, h, true)}</span>`;
        else {
            // 셋째 열은 **두 줄**이다 (개정 2026-09-08 5차 사용자 지시 · SCREEN_DESIGN §7):
            //   이름 + 표기 쿨 / **문장**(hover 와 같은 것 — `tip.js:skillLineHtml` 이 툴팁과 같은 함수로 낸다).
            // ⚠ `skill.csv:desc_*` 고정 설명 줄은 **뺐다** — 문장이 이미 같은 말을 더 정확히 한다(그건 툴팁만 든다)
            const line = skillLineHtml(a, { ...tipCtx, source: ACTIVE_SOURCES[i] });
            row.innerHTML = `
                <span class="no">${no}</span><span class="ico">${skillImg(a)}<span class="sk-lv">${t('sk.lvTag', { n: a.lv })}</span></span>
                <span class="nm"><span class="t">${L(a.name)}</span>
                    <span class="cd">${secText(SYS.skill.resolve(a)?.cool ?? coolSecOf(a.id))}</span>
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
 * 마스터리 노드 이름은 CSV 의 name_kr/name_en(직업 공통 무기 노드의 {group}은 직업별 무기군),
 * 효과의 축 이름·단위는 **`stat` 에서 파생**한다 (SCREEN_DESIGN §7).
 * 접사와 같은 채널이면 접사 이름이 그대로 맞고(공격 속도 · 최대 HP · 모든 원소 저항),
 *   접사 풀 밖(HP 재생 · 쿨타임 감소 · 최대 저항 증가)이면 `combat_stat.csv` 행이 이름과 단위를 든다.
 * 화면이 노드 이름 사전을 따로 갖지 않는다 — 가지면 CSV 와 갈린다.
 */
const statRow = stat => D.combatStats.find(s => s.id === stat);
const masteryAccent = ({ sin, cls }) => sin ? sinColor(sin) : cls ? classColor(cls) : null;
// 죄종 · 직업 판 모두 **회색 단색 실루엣**(`icons/mastery/<sin|class>/<node_id>.webp`)이고 화면이 판 색으로 칠한다 —
//   직업 공통 노드(`owner_id = *` · 무기군 마스터리)만 직업마다 제 무기를 그린 `<node_id>_<class_id>` 를 읽는다 (SCREEN_DESIGN §7 · ADR-0555)
const masteryIconPath = (id, owner = {}) => {
    const row = D.masteryNodes.find(r => r.node_id === id);
    if (row?.tree_kind !== 'class') return `./assets/art/icons/mastery/sin/${id}${M.ICON_EXT}`;
    const stem = row.owner_id === '*' && owner.cls ? `${id}_${owner.cls}` : id;
    return `./assets/art/icons/mastery/class/${stem}${M.ICON_EXT}`;
};
// 전직 트리 가지 칸 그림 — `icons/mastery/advance/<skill_id>_<slot>.webp` · 전직 스킬 그림과 같은 투톤(회백 실루엣 + 강조색 하나)이라 **칠하지 않는다** ·
//   보류 칸(`advance_node.csv:hold = 1`)은 그림이 없다 (2026-10-08 · ADR-0547)
const advanceNodeIconPath = (skillId, slot) => `./assets/art/icons/mastery/advance/${skillId}_${slot}${M.ICON_EXT}`;
/** 칸 · 툴팁의 노드 그림 — 회색 실루엣을 **판 색 마스크**로 칠한다. 판 주인이 없는 자리(색을 못 정함)는 회색 그대로 */
const masteryIconHtml = (id, owner, cls) => {
    const src = masteryIconPath(id, owner);
    const color = masteryAccent(owner);
    return color
        ? `<i class="${cls} sk-icon-mask" aria-hidden="true" style="background:${color};-webkit-mask-image:url('${src}');mask-image:url('${src}')"></i>`
        : `<img class="${cls}" src="${src}" alt="" aria-hidden="true">`;
};

/** T2 장비 조건 — 공통 무기 노드는 현재 직업이 실제로 들 수 있는 무기군만 보여준다. */
function masteryGateGroups(gate, cls) {
    if (!gate || gate.slot === 'sin_gear') return [];   // 죄종 T2-1 은 갈래가 아니라 장비 수가 켠다 (2026-10-05)
    const table = gate.slot === 'weapon' ? D.weaponGroups : D.armorGroups?.armor;
    const usable = gate.slot === 'weapon' && cls
        ? gate.groups.filter(id => table?.[id]?.classes.includes(cls))
        : gate.groups;
    return (usable.length ? usable : gate.groups).map(id => table?.[id] ?? id);
}

function masteryGateText(gate, cls, owner = {}) {
    if (!gate) return '';
    // 죄종 T2-1 — 「분노 장비 3개 이상일 때 (2/3)」 · 지금 낀 수는 masteryState.sinGear (2026-10-05 · skill_design §3-2)
    if (gate.slot === 'sin_gear')
        return t('sk.gate.sin_gear', { sin: owner.sin ? sinName(owner.sin) : '', n: owner.sinGear ?? 0, need: gate.need });
    const groups = masteryGateGroups(gate, cls).map(L).join(' · ');
    return t(`sk.gate.${gate.slot}`, { groups });
}

/** 죄종 T2-2 · T2-3 의 조건 한 줄 — 문턱 · 겹 값은 balance 에서 읽는다(화면이 숫자를 안 든다) · 조건 없는 칸은 빈 문자열 (2026-10-05) */
function masteryCondText(cond, rank = 1) {
    if (!cond) return '';
    const B = D.balance;
    const pct = v => `${Math.round((v ?? 0) * 100)}%`;
    // 랭크가 한계를 넓히는 칸(분노 · 폭식 T3 · R343) — 지금 랭크(안 찍었으면 1랭크)의 문턱 · 상한은 로직이 낸다 · 랭크당 폭은 balance 그대로
    const w = SYS.hero.masteryWiden(cond, Math.max(1, rank));
    return t(`sk.cond.${cond}`, {
        pct: pct(w?.thr ?? B.mastery_t2_hp_threshold_pct),
        sec: B.mastery_sloth_t2_tick_sec, max: B.mastery_sloth_t2_max_stack,
        step: pct(B.mastery_wrath_t3_hp_step_pct), cap: w?.cap, per: B.mastery_gluttony_t3_stack_per_rank,
    });
}

function masteryDisplayName(node, cls) {
    const name = L(node.name);
    if (!name.includes('{group}')) return name;
    const groups = masteryGateGroups(node.gate, cls).map(L).join(' · ');
    return name.replace('{group}', groups);
}

function masteryTipCard(node, rankLabel = t('sk.tip.rank', { n: node.rank, max: node.maxRank }), owner = {}) {
    const fb = statRow(node.stat) ?? M.MASTERY_LABELS[node.stat];   // 마스터리에만 있는 축(탐욕 T3)은 mock 이 단위를 든다
    const name = masteryDisplayName(node, owner.cls);
    // 효과 = 「무엇이 n 증가한다」 — 축마다 통째인 문장 · 값은 부호 없이(동사가 방향을 든다 · SCREEN_DESIGN §7 · ADR-0332)
    const key = `sk.masteryEffect.${node.stat}`;
    // 랭크가 한계를 넓히는 칸(분노 · 폭식 T3 · R343)은 값이 하나라 「(랭크당 n)」을 안 붙인다 — 랭크당 폭은 조건 줄이 든다 · 겹이면 「겹당」
    const widen = SYS.hero.masteryWiden(node.cond, 1);
    const body = t(has(key) ? key : 'sk.masteryEffect', {
        stat: L(M.statLabel(node.stat, fb)),
        v: `<span class="tip-hl">${M.baseValue(node.stat, widen ? node.value : node.total, fb)}</span>`,
    });
    const effect = widen
        ? ('cap' in widen ? t('sk.tip.perStack', { effect: body }) : body)
        : t('sk.tip.effect', { effect: body, perRank: `<span class="tip-hl">${M.baseValue(node.stat, node.value, fb)}</span>` });
    const card = el('div', 'tip-card skill mastery');
    const color = masteryAccent(owner);
    if (color) card.style.borderTopColor = color;
    const gate = masteryGateText(node.gate, owner.cls, owner);
    // 「지금 장비로는 꺼짐」 꼬리는 뺐다 [2026-09-27 사용자 지시] · 꺼진 칸도 흐리지 않는다 [2026-10-06 · ADR-0516]
    const gateLine = gate ? `<div class="tip-line tip-gate">${gate}</div>` : '';
    // 조건부 칸(죄종 T2-2 · T2-3)은 조건이 효과의 일부다 — 장비 조건과 같은 자리 · 같은 모양 한 줄 (2026-10-05)
    const cond = masteryCondText(node.cond, node.rank);
    const condLine = cond ? `<div class="tip-line tip-gate">${cond}</div>` : '';
    card.innerHTML = `<div class="tip-name">
            <span class="tip-title"><span class="tip-sk-ico">${masteryIconHtml(node.id, owner, 'tip-sk-img')}</span>${name}</span>
            <span class="tip-rank">${rankLabel}</span>
        </div>
        <div class="tip-line">${effect}</div>${condLine}${gateLine}`;
    return card;
}

/**
 * 확정된 모든 마스터리 칸은 노드 ID별 아이콘을 표시한다. 세부 정보는 hover 툴팁이 보여준다.
 * 잠긴 칸은 필요 레벨, 모든 칸은 현재 랭크를 그림 위에 별도로 표시한다.
 * 낀 장비가 안 켠 칸(`on === false`)은 그림이 흐리다(2026-10-30 복원 · ADR-0972) — 찍기는 그대로 된다(랭크는 캐릭터에 쌓인다 · skill_design §3-5) ·
 * 전투가 판정하는 조건 칸(`cond`)은 그릴 때 켜졌는지 몰라 흐리지 않는다
 */
function masteryCell(node, owner = {}) {
    if (!node) return `<div class="sk-cell empty"></div>`;
    const taken = node.rank > 0;
    const cls = `sk-cell icon-only${taken ? ' taken' : ''}${node.rank >= node.maxRank ? ' full' : ''}`
        + `${node.unlocked ? '' : ' locked'}${node.canLearn ? ' can' : ' dim'}${node.gate && node.on === false ? ' off' : ''}`;
    const label = masteryDisplayName(node, owner.cls);
    const gate = masteryGateText(node.gate, owner.cls, owner);
    return `<div class="${cls}" data-node="${node.id}"
                 aria-label="${label} ${node.rank}/${node.maxRank}${gate ? `, ${gate}` : ''}">
                ${masteryIconHtml(node.id, owner, 'sk-icon-art')}
                ${node.unlocked ? '' : `<span class="sk-icon-lock" aria-hidden="true">${t('sk.needLv', { lv: node.unlockLevel })}</span>`}
                <span class="sk-icon-rank" aria-hidden="true">${node.rank}/${node.maxRank}</span>
            </div>`;
}

/**
 * 마스터리 판 하나 — **위에서 아래로 쌓는다** (2026-08-28 사용자 지시 · SCREEN_DESIGN §7).
 * 마스터리는 가지가 갈리는 트리가 아니라 쌓는 구조라(skill_design §3-4) **줄 하나가 한 단계**다.
 * 윗줄이 먼저 열리고 아랫줄일수록 늦게 열린다 — **단계 번호(T1·T2·T3)는 화면에 쓰지 않는다**(내부 어휘다).
 *   잠금은 칸이 필요 레벨로 말하고, 빈 줄은 점선 프레임이 말한다(설명 문구는 도움말 탭 — ui 원칙 4).
 * 프레임(3줄 × 3칸)은 CSV 행 수와 무관하게 고정 — 비어 있어도 그려야 어디까지 갈 수 있는지가 보인다.
 * 죄종·직업 판은 프레임 아래에 빈 칸 하나를 더 둔다.
 */
function masteryBox({ tag, title, sub, nodes, onLearn, onUnlearn, locked, extraSlot = false, preview = false, sin = null, cls = null, sinGear = null }) {
    const owner = { sin, cls, sinGear };   // sinGear = 낀 죄종 장비 수 — 죄종 T2-1 의 「2/3」 (2026-10-05)
    const color = masteryAccent(owner);
    // `locked` — true = 흐린 판(도감의 미기획 판) · 문자열 = 격자 위 잠김 베일 + 그 한 줄(스킬 창의 전직 판)
    const box = el('div', `sk-box${locked === true ? ' locked' : ''}${color ? ' mastery-colored' : ''}`);
    if (color) box.style.setProperty('--mastery-color', color);
    const { tiers, nodes: perTier } = M.MASTERY_GRID;
    const rows = [];
    for (let ti = 1; ti <= tiers; ti++) {
        const mine = nodes.filter(n => n.tier === ti);
        const cells = [];
        for (let i = 0; i < perTier; i++) cells.push(masteryCell(mine[i] ?? null, owner));
        rows.push(`<div class="sk-row">${cells.join('')}</div>`);
    }
    // 추가 칸 줄 — 다른 줄과 같은 간격으로 격자 넷째 줄에 선다
    if (extraSlot) rows.push('<div class="sk-row extra"><div class="sk-cell empty"></div></div>');
    // 죄종 판은 죄종 아이콘 · 직업 판은 직업 아이콘을 제목 앞에 — 판 색으로 칠한 마스크다 (SCREEN_DESIGN §7 · ADR-0368 · ADR-0375)
    const headArt = sin ? M.sinIcon(sin) : cls ? M.classIcon(cls) : null;
    box.innerHTML = `
        <div class="sk-box-head">
            ${tag ? `<span class="sk-tag">${tag}</span>` : ''}${headArt ? `<i class="sk-head-icon" aria-hidden="true" style="-webkit-mask-image:url('${headArt}');mask-image:url('${headArt}')"></i>` : ''}<span class="sk-title">${title}</span>
            ${sub ? `<span class="muted sk-sub">${sub}</span>` : ''}
        </div>
        <div class="sk-grid">${rows.join('')}</div>`;
    // 잠긴 판은 격자 위에 잠김 베일 (§7 · §13-1) — 한 줄은 부르는 쪽이 준다(전직 판 = 「전직 필요」)
    if (typeof locked === 'string') { const g = box.querySelector('.sk-grid'); g.classList.add('lock-host'); g.appendChild(lockVeilText(locked)); }
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    box.querySelectorAll('.sk-cell[data-node]').forEach(c =>
        bindTipNode(c, () => {
            const node = nodeById.get(c.dataset.node);
            return preview
                ? masteryTipCard({ ...node, rank: 1, total: node.value }, t('ix.mastery.previewRank', { max: node.maxRank }), owner)
                : masteryTipCard(node, undefined, owner);
        }, {
            // 손가락은 우클릭이 없다 — 길게 눌러 뜬 툴팁 아래 [되돌리기] 가 1랭크를 되돌린다 (SCREEN_DESIGN §2 「터치 조작」 · ADR-0374)
            actions: onUnlearn && !preview
                ? () => (nodeById.get(c.dataset.node)?.rank > 0 ? [{ label: t('sk.unlearn'), run: () => onUnlearn(c.dataset.node) }] : [])
                : null,
        }));
    // 좌클릭 = 1랭크 · 우클릭 = 1랭크 되돌리기 (SCREEN_DESIGN §7 개정 2026-09-08 사용자 지시).
    // 브라우저 메뉴는 막는다 — 뜨면 되돌린 칸을 메뉴가 가려 결과가 안 보인다.
    // 손가락이 낸 contextmenu(안드로이드 길게 누르기)는 되돌리지 않는다 — 길게 누르기는 툴팁이다 (ADR-0374)
    if (onLearn) box.querySelectorAll('.sk-cell[data-node]').forEach(c => {
        c.onclick = () => onLearn(c.dataset.node);
        c.oncontextmenu = e => { e.preventDefault(); if (!isTouchInput()) onUnlearn?.(c.dataset.node); };
    });
    return box;
}

/**
 * 스킬 창 전직 판 — **윗줄 = 고른 갈래의 전직 스킬 셋 · 그 아래 세 줄 = 스킬마다 제 열에 가지 셋(② · ③ · ④)이 세로로 · 칸 사이를 세로 선이 잇는다**
 *   [2026-10-06 · R216 · 개정 2026-10-08 · SCREEN_DESIGN §7 · ADR-0542 · 열 · 선 ADR-0544].
 *   **전직하면 판이 열린다** — 전직 스킬은 여기서 배운다(도서관은 갈래만 고른다 · 2026-10-08 사용자 지시 「전직스킬은 마스터리에서 배우는거야」).
 *   스킬 칸 = 그림(배운 것은 `Lv.n`) · 안 배운 칸 누르기 = 첫 전직 포인트로 배우기(`game.advanceLearn` — 하나만) · 배운 칸 누르기 = +1(`game.advanceLevelUp`) ·
 *   배운 칸 우클릭(손가락은 길게 눌러 뜬 툴팁의 [되돌리기]) = 되돌리기 — 쓴 전직 포인트 전부 환급(`game.advanceForget`) · 올리면 스킬 설명창(레벨을 얹은 숫자).
 *   가지 셋 = ② 특수 · ③ 변형 · ④ 필살기 — 효과가 없어(`advance_node.csv` · 설명만) 누를 수 없다 · 올리면 칸 이름 + 설명 + 「준비 중」 · 배우기 전에도 셋 다 선다(스킬마다 무엇이 이어지나를 견준다).
 *   판정(레벨 · 포인트 · 가지)은 `game.advanceState` 가 낸다 — 화면은 그리기만 한다
 */
const ADV_SLOT_MARK = { 2: '②', 3: '③', 4: '④' };
/** 가지 칸 하나 — 스킬 창 · 도감 공용 (ADR-0557). 그 스킬의 열 · 위 칸과 세로 선으로 잇는다(`.adv-node::before`) · `on` = 배운 스킬의 열(선이 밝다) · 표에 없는 칸은 빈 프레임 */
const advBranchCell = (n, id, slot, on = false) => {
    if (!n) return '<div class="sk-cell empty"></div>';
    // 그림이 선 칸은 번호가 오른쪽 아래 작은 꼬리표로 물러난다 · 보류 칸은 번호만 가운데 (ADR-0547)
    const art = n.hold ? '' : `<img class="adv-node-art" src="${advanceNodeIconPath(id, slot)}" alt="" aria-hidden="true">`;
    return `<div class="sk-cell icon-only locked adv-node${on ? ' on' : ''}${art ? ' has-art' : ''}" data-skill="${id}" data-slot="${slot}">${art}<span class="adv-slot" aria-hidden="true">${ADV_SLOT_MARK[slot] ?? slot}</span></div>`;
};
/** 가지 칸 툴팁 — 그 가지의 효과만 · 보류 칸은 「보류」 · 아래 한 줄이 「준비 중」 (CLAUDE.md 규칙 7) */
const bindAdvNodeTips = (box, nodeOf) => box.querySelectorAll('.adv-node').forEach(c => {
    const n = nodeOf(c.dataset.skill, Number(c.dataset.slot));
    const name = `${ADV_SLOT_MARK[n.slot] ?? n.slot} ${t(`sk.adv.slot.${n.slot}`)}`;
    bindTipNode(c, () => el('div', 'tip-card tip-mini', `<div class="tip-name">${name}</div><div class="tip-line">${n.desc ? L(n.desc) : t('sk.adv.hold')}</div><div class="tip-line muted">${t('sk.adv.pending')}</div>`));
    c.setAttribute('aria-label', name);
});
function advanceBoard(h, adv) {
    const learned = adv.hero.skill;
    const lv = adv.hero.lv;
    const free = adv.hero.points.free;
    const skills = adv.branches.find(b => b.id === adv.hero.advance)?.skills ?? [];
    const nodeOf = (id, slot) => (adv.nodes[id] ?? []).find(x => x.slot === slot) ?? null;
    const box = el('div', 'sk-box adv-board');
    // 칸이 눌리나 — 배운 칸은 레벨을 올릴 포인트 · 안 배운 칸은 아직 하나도 안 배웠고 첫 포인트가 있어야 한다
    const cell = id => {
        const mine = id === learned;
        const can = mine ? free > 0 : !learned && free > 0;
        const lvTag = mine ? t('sk.lvTag', { n: lv }) : '';
        return `<div class="sk-cell icon-only${mine ? ' taken' : ''}${can ? ' can' : ' dim'}" data-advskill="${id}" aria-label="${L(skillInfo(id).name)}${mine ? ` ${lvTag}` : ''}">`
            + `<span class="adv-ico" aria-hidden="true">${skillImg({ id })}</span>${mine ? `<span class="sk-lv" aria-hidden="true">${lvTag}</span>` : ''}</div>`;
    };
    // 가지 칸 — 배운 스킬의 열은 선이 밝다(`.on`)
    const branch = (id, slot) => advBranchCell(nodeOf(id, slot), id, slot, id === learned);
    box.innerHTML = `
        <div class="sk-box-head"><span class="sk-title">${t('sk.advTree')}</span></div>
        <div class="sk-grid">
            <div class="sk-row">${skills.map(cell).join('')}</div>
            ${[2, 3, 4].map(slot => `<div class="sk-row">${skills.map(id => branch(id, slot)).join('')}</div>`).join('')}
        </div>`;
    const cb = combatOf(h);
    const tipCtx = { period: cycleOf(h), ...rangeCtx(cb), hpMax: cb.hp_max, atkType: cb.attack_type, stats: h.stats, cdr: cb.cooldown_reduction, skillTags: cb.option_fx?.skillTags, atkPct: cb.atk_pct_sum, healOut: cb.option_fx?.healOut };
    const done = r => { if (r.ok) { save(); runChangeFlash(h.uid); } else if (r.err === 'points') flash('sk.err.advPoints'); else flashErr('tr', r.err, 'advance'); render(); };
    /** 되돌리기 — 무료 · 전부 환급이라 확인을 묻지 않는다(마스터리 우클릭과 같은 문법 · §7) */
    const forget = () => done(SYS.game.advanceForget(G, h.uid));
    box.querySelectorAll('[data-advskill]').forEach(sc => {
        const id = sc.dataset.advskill;
        const mine = id === learned;
        // 설명창 — 배운 것은 레벨을 얹은 숫자다(`up` = 배운 뒤 더 넣은 포인트 · tip.js `defOf`) · 안 배운 것은 Lv.1 · 맥락은 액티브 줄과 같다
        bindTipNode(sc, () => skillTipCard(mine ? { id, up: lv - 1, lv } : { id }, tipCtx),
            { actions: () => (mine ? [{ label: t('sk.unlearn'), run: forget }] : []) });   // 손가락은 우클릭이 없다 (ADR-0374)
        sc.onclick = () => {
            if (!mine) {
                const r = SYS.game.advanceLearn(G, h.uid, id);   // 첫 전직 포인트 — 이미 하나를 배웠으면 `learned`(먼저 되돌린다)
                if (r.ok) flash('sk.adv.leveled', { skill: L(skillInfo(id).name), n: 1 });
                done(r);
                return;
            }
            const r = SYS.game.advanceLevelUp(G, h.uid);
            if (r.ok) flash('sk.adv.leveled', { skill: L(skillInfo(id).name), n: r.lv });
            done(r);
        };
        sc.oncontextmenu = e => { e.preventDefault(); if (mine && !isTouchInput()) forget(); };
    });
    bindAdvNodeTips(box, nodeOf);
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
        if (r.ok) { save(); runChangeFlash(h.uid); }           // 쓰러진 영웅도 받는다 (R300)
        else if (r.err === 'locked') flash('sk.err.locked', { lv: ms.nodes.find(n => n.id === id)?.unlockLevel ?? 0 });
        else if (r.err === 'maxRank') flash('sk.err.maxRank');
        else if (r.err === 'points') flash('sk.err.points');
        render();
    };

    /** 1랭크 무르기 — 우클릭. 무료·수시라 확인을 묻지 않는다 (SCREEN_DESIGN §7) */
    const unlearn = id => {
        const r = SYS.game.unlearnMastery(G, h.uid, id);
        if (r.ok) { save(); runChangeFlash(h.uid); }
        else if (r.err === 'noRank') flash('sk.err.noRank');
        render();
    };

    const c1 = el('div');
    const pp = el('div', 'panel');
    // 초기화 버튼은 **제목 줄 오른쪽**에 선다 [2026-09-27 사용자 지시 「높이를 줄여」] — 옛 자리(숫자 아래 한 줄)가 창 높이를 정하고 있었다
    const ph = helpHeading('h2', '', `<span>${t('sk.points.h')}</span>`, 'skill_points');
    pp.appendChild(ph);
    pp.appendChild(el('div', '', `
        <div style="font-size:var(--fs-xl);text-align:center">${ms.points}
            <span class="muted" style="font-size:var(--fs-sm)">/ ${ms.points + spent}</span>
            <span class="muted" style="font-size:var(--fs-xs);margin-left:6px">${t('sk.points.left')}</span></div>`));
    // 전직 포인트 — 전직했으면 둘째 줄 `남은 / 받은` (마스터리와 따로 · 2026-10-06 · R216 · SCREEN_DESIGN §7 · ADR-0529)
    const adv = SYS.game.advanceState(G, h.uid, now());
    if (h.advance) pp.appendChild(el('div', 'sk-adv-pts', `<b>${adv.hero.points.free}</b> <span class="muted">/ ${adv.hero.points.have}</span> <span class="muted sk-adv-pts-l">${t('sk.advPoints')}</span>`));
    // 초기화는 **한 번 클릭** — 무료·수시이고 전액 환급이라 되돌릴 수 없는 행동이 아니다 (SCREEN_DESIGN §7)
    const reset = el('button', 'btn sm', t('sk.reset'));
    reset.disabled = spent === 0;
    reset.onclick = () => {
        const r = SYS.game.resetMastery(G, h.uid);
        if (r.ok) { save(); flash('sk.reset.done', { n: r.refunded }); }
        render();
    };
    ph.appendChild(reset);
    c1.appendChild(pp);
    c1.appendChild(activeSlots(h));
    wrap.appendChild(c1);

    const sin = sinName(h.sin);
    const cls = className(h.cls);
    // 판 셋이 나란히 — 옛 화면은 셋을 세로로 쌓아 한 화면에 안 들어왔다 (2026-08-28, SCREEN_DESIGN §7)
    // 판 머리는 **제목 한 줄**이다 — 부제(공유 · 직업 줄 · 전직 해금)는 뺐다 [2026-09-27 사용자 지시]
    wrap.appendChild(masteryBox({
        title: t('sk.sinTree', { sin }),
        nodes: ms.nodes.filter(n => n.treeKind === 'sin'), onLearn: learn, onUnlearn: unlearn, extraSlot: true, sin: h.sin, sinGear: ms.sinGear,
    }));
    wrap.appendChild(masteryBox({
        title: t('sk.mastery', { cls }),
        nodes: ms.nodes.filter(n => n.treeKind === 'class'), onLearn: learn, onUnlearn: unlearn, extraSlot: true, cls: h.cls,
    }));
    // 전직 판 [2026-10-06 · R216 · 개정 2026-10-08 · SCREEN_DESIGN §7 · ADR-0542] — 전직 전이면 **같은 프레임의 빈 판 + 잠김 베일** ·
    //   **전직하면 열린다** — 갈래의 전직 스킬 셋을 여기서 배운다(스킬을 안 배운 채로도 판이 선다)
    wrap.appendChild(h.advance ? advanceBoard(h, adv) : masteryBox({
        title: t('sk.advTree'),
        nodes: [], locked: t('sk.advNeed'),
    }));
    return wrap;
}

/* ═══════════ 파티 전술 칸 (SCREEN_DESIGN §15) ═══════════
   칸은 **획득물이 아니다**: 지휘 천막 랭크가 칸을 열고(R137), 칸에 든 옵션은 골드로 다시 굴린다 (tactic_card_design §5).
   판정(열림 · 조건 카운터 · 비용)은 전부 `game.tacticState` 가 실어 온다 — 렌더러는 파티를 세지 않는다. */

/** 조건의 인자 — 죄종 · 스킬 태그 둘 중 하나다. 스킬 태그 이름은 CSV(skill_tag.csv), 문장 틀은 i18n */
/** 조건의 인자 — 장비 죄종은 죄종 이름 · 리더 · 진형은 직업 이름 (CSV 이름을 쓴다 — 조건 사전 §5-8) */
const condArgName = o => !o.condArg ? '' : o.condKind === 'gear_sin' ? sinName(o.condArg) : className(o.condArg);
/** 조건 문장 — 문구 키는 조건 어휘(`test`)이고 「없으면」은 `.not` 이 붙는다 (§5-8) */
const condText = o => t(`rs.cond.${o.condKind}${o.polarity === 'not' ? '.not' : ''}`, { n: o.condN, a: condArgName(o) });
/** 조건 카운터 「지금 / 필요」 — 무조건은 안 단다(§4 「안 보이면 함정」). 「없으면」은 필요가 0 이다 */
const condCounter = (o, have, need) => (o.condKind === 'none' ? '' : `<b class="rs-cnt">${have} / ${need}</b>`);
/** 효과 한 줄 — 축 이름·단위는 `stat` 에서 파생한다 (마스터리 칸과 같은 규칙 · §13).
 *  `v` = 찍을 값 — 칸 · 잰 결과의 **리더 보너스를 탄 값**(`value` · §15 · ADR-0753)을 넘긴다. 안 주면 등급 값 */
const optionEffect = (o, v = o.value) => L(M.affixText(o.stat, v, statRow(o.stat)));

/** 자물쇠 — 닫힘 · 열림 두 모양(몸통은 같고 고리만 다르다) · 색은 버튼 글자색(currentColor)을 따른다 (§15 · 2026-09-27) */
const lockIcon = M.lockIcon;
/** 잠김 한 줄 — 자물쇠 + 여는 조건 한 토막(「도서관 건설」) · 글 줄 안에 서는 자물쇠라 `.lock-inl` (§13-1 · ADR-0699) ·
 *  `.lock-line` = 빨간 막힘 줄 안에서도 회색 (ADR-0925) */
const lockLine = text => `<span class="lock-line"><span class="lock-inl">${lockIcon(true)}</span>${text}</span>`;
/** 키를 푼다 — 잠김 문구(i18n `lock: true`)면 앞에 자물쇠 */
const tLock = (key, params) => (isLock(key) ? lockLine(t(key, params)) : t(key, params));

/** 리더 보너스 칸 — 행의 효과 오른쪽 세로줄(§15 · ADR-0757). 값은 `tacticState` 가 낸 리더 몫(`bonus`)이고 단위는 효과와 같다(`statValue`).
 *  더하면 `.up` · 빼면 `.down` · 0 이면 흐림 · 곡선을 안 받는 칸(`leaderBonus` 0 — 리더 통솔 칸)은 「—」 */
function leadCell(slot) {
    const o = slot.option;
    if (!(o.leaderBonus > 0)) return '<div class="rs-lead muted">—</div>';
    const b = slot.bonus;
    return `<div class="rs-lead${b > 0 ? ' up' : b < 0 ? ' down' : ' muted'}">${M.statValue(o.stat, b, statRow(o.stat))}</div>`;
}

/** 「추가 버프」 — 「파티 전술」 소제목 줄 오른쪽 끝(§15 · ADR-0757). 올리면 **전술에 걸리는 출처마다 한 줄**(ADR-0758 — 칸마다 안 적는다):
 *  지금은 리더 통솔 → 버프 효과 ±n%(`tacticState.leader` 배수에서 1 을 뺀 정수 % · ADR-0938) 하나. 도감 옵션은 안 적는다(능력치마다라 수십 줄 — 관전 「버프」 창의 몫) */
function buffMark(ts) {
    const b = el('span', 'rs-buff-btn', t('rs.buff'));
    bindTipNode(b, () => {
        const lines = [ts.leader ? t('rs.buff.lead', { n: ts.leader.ldr, p: signed(Math.round((ts.leader.curve - 1) * 100)) }) : t('rs.buff.noLead')];
        return el('div', 'tip-card q-tip',
            `<div class="tip-effect-head"><div class="tip-name">${t('rs.buff')}</div></div>`
            + `<div class="tip-effect-summary">${lines.map(x => `<div>${x}</div>`).join('')}</div>`);
    });
    return b;
}

/** 칸 하나 — 안 열린 칸도 그린다(어디까지 열리는지가 보여야 한다 · §13). 무조건 옵션은 카운터를 달지 않는다.
 *  열린 칸의 여섯째 칸은 **잠금 토글**이다(§15 · R28) — 안 열린 칸의 `.locked` 와 헷갈리지 않게 잠근 칸은 `.held` 로 단다.
 *  칸은 등급 · 켜짐 | 조건 | 카운터 | 효과(등급 값) | 리더 보너스 | 잠금 — 카운터는 제 세로줄이다(왼쪽 정렬 · ADR-0757) */
function tacticCell(slot, onLock) {
    const c = el('div', `rs-cell${slot.open ? (slot.active ? ' on' : ' off') + (slot.locked ? ' held' : '') : ' locked'}`);
    // 칸 번호는 안 적는다 [2026-09-21 사용자 지시 · ADR-0261] — 세로 목록에서는 행의 순서가 번호다. 잠긴 행은 **지을 지휘 천막 랭크** 한 줄뿐 (R137)
    if (!slot.open) {
        c.innerHTML = `<div class="rs-lock">${lockIcon(true)}<span>${needText('tactic_slots', slot.no)}</span></div>`;
        return c;
    }
    const o = slot.option;
    const counter = condCounter(o, slot.have, slot.need);
    // 켜짐/꺼짐이 **맨 왼쪽** [2026-09-27 사용자 지시 · §15] — 그 옆이 등급(값만 가르므로 조건·효과 칸이 아니라 행 머리 · ADR-0261 · tactic_card_design §5-5)
    c.innerHTML = `
        <div class="rs-top"><span class="rs-state">${t(slot.active ? 'rs.on' : 'rs.off')}</span>
            <span class="rs-grade ${o.grade}">${t(`rs.grade.${o.grade}`)}</span></div>
        <div class="rs-cond">${condText(o)}</div>
        <div class="rs-cnt-c">${counter}</div>
        <div class="rs-eff">${optionEffect(o)}</div>
        ${leadCell(slot)}`;
    // 자물쇠 아이콘 [2026-09-27 사용자 지시 · §15] — 잠긴 칸 = 닫힌 자물쇠 · 안 잠긴 칸 = 열린 자물쇠.
    //   누르면 일어날 일(잠그기 / 풀기)은 hover 제목이 말한다 — 잠근 상태는 버튼 강조와 행의 `.held` 도 말한다
    const b = el('button', `btn sm rs-pin${slot.locked ? ' on' : ''}`, lockIcon(slot.locked));
    b.title = t(slot.locked ? 'rs.unlock' : 'rs.lock');
    b.setAttribute('aria-label', b.title);
    b.onclick = () => onLock(slot.no);
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
    p.appendChild(helpHeading('h2', '', `${t(titleKey)} <small class="todo-badge">${t('todo.badge')}</small>`, 'construction'));
    p.appendChild(el('div', 'note-body muted', t('todo.lead')));
    p.appendChild(el('div', 'note-body', t(noteKey)));
    return p;
}
const renderTodo = (main, titleKey, noteKey) => main.appendChild(todoPanel(titleKey, noteKey));

/**
 * 건설 — **부지 격자 | 상세** [2026-09-23 사용자 지시 · ADR-0304 — ADR-0302 의 가로 카드 줄을 대체] (SCREEN_DESIGN §13-1).
 * 왼쪽 = 건물 하나가 **큰 네모 하나**(부지) · 누르면 오른쪽 상세가 그 건물의 랭크를 위에서 아래로 편다. 고른 건물은 `state.cnPick`(세이브 아님).
 * 판정(조건 · 비용 · 지을 수 있나)은 전부 `game.constructionState` 가 낸다 — 렌더러는 고르고 적기만 한다. 짓기는 `game.construct`
 * **영웅은 안 쓴다** — 띠도 건설 인력 칸도 없고 박스가 한 장을 다 쓴다 · 짓기는 즉시 [2026-09-24 사용자 지시 · ADR-0354]
 */
const CN_LOT_SLOTS = 12;   // 부지 격자 칸 수 — 3열 × 4줄 · 네모 148 · 칸 사이 · 줄 사이 22(style.css `.cn-box` 의 `--cn-gap` · ADR-0745 · ADR-0747)
function renderResearch(main) {
    const cs = SYS.game.constructionState(G);
    // 부지 순서 = **표 순서**(`building.csv:sort_order` — `constructionState` 가 그 순서로 낸다 · 2026-10-29 사용자 지시 「창고를 3번쨰칸으로」 · ADR-0941)
    //   탭에 붙었든 안 붙었든 같다 · 탭 바를 옮겨도 부지는 저절로 안 따라간다 (~~왼쪽 탭 바 순서 · 탭 없는 건물은 맨 뒤~~ 2026-09-23)
    const order = [...cs.buildings];
    // 안 골랐으면 지금 지을 수 있는 첫 건물 · 없으면 첫 부지 — 지으면 그 건물에 고정된다(`rankCell`)
    const pick = order.find(b => b.id === state.cnPick) ?? order.find(b => !b.next.err) ?? order[0];
    // 박스 하나가 한 장을 다 쓴다 — 영웅 띠는 없다 (ADR-0354)
    const page = el('div', 'page page-stack');
    // 진척 줄(「지은 랭크 n / 전체」)은 없다 — 박스가 곧바로 두 열이다 (2026-09-24 사용자 지시 · ADR-0345)
    const p = el('div', 'panel fill cn-box');
    const work = el('div', 'cn-work');
    // 부지 판 — 맨 위 제목 띠 「건설」 + 격자(제 안에서 스크롤) · 상세 판 띠와 높이 · 아래 틈이 같다 (SCREEN_DESIGN §13-1 · ADR-0919)
    const lotBox = el('div', 'cn-lotbox');
    lotBox.appendChild(helpHeading('div', 'sub-h cn-title', `<span class="cn-title-name">${t('nav.research')}</span>`, 'construction'));
    const lots = el('div', 'cn-lots');
    lots.dataset.keep = 'cn-lots';
    for (const b of order) lots.appendChild(buildingLot(b, b === pick));
    // 빈 부지 — 격자는 늘 3 × 4 = 12칸(2026-10-24 사용자 지시 · SCREEN_DESIGN §13-1 · ADR-0745). 건물이 넘치면 줄 끝까지만 채운다
    for (let i = order.length; i < Math.max(CN_LOT_SLOTS, Math.ceil(order.length / 3) * 3); i++) lots.appendChild(el('div', 'cn-lot empty'));
    lotBox.appendChild(lots);
    work.appendChild(lotBox);
    if (pick) work.appendChild(buildingSide(pick));
    p.appendChild(work);
    page.appendChild(p);
    main.appendChild(page);
}


/** 부지 한 칸 — 그림 · 이름 · 진행 막대(랭크 눈금 — 숫자 n / 최대는 안 찍는다 · 막대가 대신한다 · 2026-09-23 사용자 지시).
 *  **그림이 네모를 꽉 채우고**(`M.buildingImg` — 없으면 단색 실루엣) 이름 · 막대는 아래 어두운 띠 위에 선다 (2026-09-23 사용자 지시).
 *  지었나(실선 · 그림 그대로) · 안 지었나(점선 · 그림이 어둡다) · 지금 지을 수 있나(모서리 점) · 준비 중(흐림) — 글 없이 모양이 말한다 */
function buildingLot(b, picked) {
    const img = M.buildingImg(b.id);
    const cls = [b.rank > 0 ? 'on' : '', !b.next.err ? 'ready' : '', b.rank === 0 && b.next.err === 'pending' ? 'locked' : '', picked ? 'pick' : '', img ? 'has-img' : ''];
    const lot = el('button', `cn-lot ${cls.filter(Boolean).join(' ')}`);
    // 변수에 담긴 상대 url() 은 **스타일시트(ui/) 기준**으로 풀린다 — 페이지 기준 절대 경로로 넘긴다
    if (img) lot.style.setProperty('--lot-img', `url("${new URL(img, location.href).href}")`);
    else lot.appendChild(el('div', 'rs-art', M.BUILDING_ART[b.id] ?? ''));   // 그림이 없는 건물 — 단색 실루엣
    const foot = el('div', 'cn-lot-foot');
    foot.appendChild(el('div', 'cn-lot-name', L(b.name)));
    foot.appendChild(rankPips(b));
    lot.appendChild(foot);
    lot.onclick = () => { state.cnPick = b.id; render(); };   // 고르기만 한다 — 되돌릴 수 있어 한 번 누름
    return lot;
}

/** 랭크 눈금 — 최대 랭크만큼 칸 · 지은 만큼 찬다 */
function rankPips(b) {
    const row = el('div', 'cn-pips');
    for (let i = 1; i <= b.maxRank; i++) row.appendChild(el('span', i <= b.rank ? 'on' : ''));
    return row;
}

/**
 * 상세 — 고른 건물 하나 (ADR-0326). 머리(그림 + 아래 눈금 | 이름 · 상태 + 기능 목록 — ADR-0383 · ADR-0386)가 폭 전체에 서고 그 아래가 **반으로 갈린다** —
 * **왼쪽 = 「다음 랭크」**(여는 것 · 조건 전부 · 재료 칸 · [건설]) · **오른쪽 = 「{건물} 랭크」 목록**. 반쪽마다 제 안에서 스크롤한다.
 * 건설 탭에만 선다 — 흐린 탭은 제 화면을 편다(§1 · ADR-0308)
 */
function buildingSide(b) {
    const side = el('div', 'cn-side');
    // 맨 위 제목 띠 — 건물 이름 · 오른쪽 끝 상태(미건설 · n랭크 · 최대 랭크) (ADR-0919 — 머리의 이름 줄이 여기로 올라왔다)
    const status = b.rank === 0 ? t('cn.state.none') : b.rank >= b.maxRank ? t('cn.state.max') : t('cn.rank.no', { n: M.roman(b.rank) });
    side.appendChild(helpHeading('div', `sub-h cn-title${b.rank > 0 ? ' on' : ''}`, `<span class="cn-title-name">${L(b.name)}</span><small class="cn-title-state">${status}</small>`, 'building'));
    const img = M.buildingImg(b.id);
    const head = el('div', `cn-head${b.rank > 0 ? ' on' : ''}`);
    const pic = el('div', 'cn-thumb');
    if (img) pic.style.backgroundImage = `url("${img}")`;
    else pic.appendChild(el('div', 'rs-art', M.BUILDING_ART[b.id] ?? ''));
    const picCol = el('div', 'cn-thumb-col');   // 눈금은 그림 바로 아래 (ADR-0383)
    picCol.appendChild(pic);
    picCol.appendChild(rankPips(b));
    head.appendChild(picCol);
    // 그림 오른쪽은 기능 목록 (ADR-0386 · 이름 · 상태는 위 띠 — ADR-0919)
    const info = el('div', 'cn-head-info');
    info.appendChild(nowBox(b));
    head.appendChild(info);
    side.appendChild(head);
    // 머리 아래는 한 열 — 「다음 랭크」 위 · 랭크 목록 아래(남은 세로를 채우고 제 안에서 스크롤) (ADR-0388)
    side.appendChild(nextRankBox(b));
    side.appendChild(helpHeading('div', 'sub-h cn-sub', t('cn.ranks.h', { b: L(b.name) }), 'building_ranks'));
    const ranks = el('div', 'cn-ranks');
    ranks.dataset.keep = `cn-ranks-${b.id}`;    // 건물마다 자리가 따로다 — 다른 건물을 골랐다가 돌아와도 제자리
    for (const r of b.ranks) ranks.appendChild(rankCell(b, r));
    side.appendChild(ranks);
    return side;
}

/**
 * 기능 목록 — 머리의 이름 줄 아래 · 소제목 · 테두리 없이 두 단 (ADR-0383 · ADR-0386). 지은 랭크까지 연 것 전부를 설명 문장으로 (ADR-0326). 순서는 표 순서(처음 연 랭크) · **더하기는 합친 값** —
 * 합은 `construction.opened`(그 건물 하나의 지은 랭크까지)가 내고 렌더러는 적기만 한다. 안 지었으면 「아직 지은 랭크가 없다」
 */
function nowBox(b) {
    const box = el('div', 'cn-cur');
    box.dataset.keep = `cn-cur-${b.id}`;   // 넘치면 제 안에서 스크롤한다 — 다시 그려도 제자리
    const got = SYS.construction.opened({ [b.id]: b.rank });
    const seen = new Set(), list = [];
    for (const r of b.ranks.filter(x => x.built)) for (const e of r.effects) {
        if (seen.has(e.target)) continue;
        seen.add(e.target);
        list.push(e.kind === 'add' ? { ...e, value: got.adds[e.target], total: got.adds[e.target] } : e);
    }
    box.appendChild(el('div', 'cn-eff-t', list.length ? effectText(list, false) : `<div class="cn-desc soon">${t('cn.now.none')}</div>`));
    return box;
}

/**
 * 「다음 랭크」 — 짓는 결정에 필요한 것이 한 자리에 모인다 (ADR-0323): 「n랭크」 + 여는 것 글 · 조건 전부(선 것 ✓ 초록 · 모자란 것 ✗ 경고색) ·
 * 재료 칸(필요 수량 · 보유 — 머리글 없이 조건 아래에 바로 선다) · 폭을 꽉 채운 [건설]. 다 지었으면 「최대 랭크」 · 여는 것이 전부 준비 중이면 재료 칸 · 버튼 대신 「준비 중」.
 * 글은 상자에 가두지 않는다 — 버튼 모양은 [건설] 하나뿐이다 (ADR-0324)
 */
function nextRankBox(b) {
    const box = el('div', 'cn-next');
    box.appendChild(helpHeading('div', 'sub-h cn-sub', t('cn.next.h'), 'next_rank'));
    const r = b.next.rank ? b.ranks[b.next.rank - 1] : null;
    if (!r) { box.appendChild(el('div', 'cn-next-end', t('cn.state.max'))); return box; }
    const pending = r.pending;
    // 두 열 — 왼쪽 여는 것 · 조건 글 · 오른쪽 재료 칸 + [건설] (ADR-0391)
    const body = el('div', 'cn-next-body');
    const main = el('div', 'cn-next-main');
    const top = el('div', `cn-next-top${pending ? ' pending' : ''}`);
    top.appendChild(rankLabel(r));
    top.appendChild(el('div', 'cn-eff-t', effectText(r.effects, pending)));
    main.appendChild(top);
    if (r.require.length) main.appendChild(el('div', 'cn-reqs',
        r.require.map(x => `<span class="cn-req ${x.ok ? 'ok' : 'no'}">${x.ok ? '✓' : '✗'} ${reqText(x)}</span>`).join('')));
    body.appendChild(main);
    box.appendChild(body);
    if (pending) { main.appendChild(el('div', 'cn-next-end', t('cn.pending'))); return box; }
    // 재료 칸 줄 — 글 오른쪽 · 오른쪽 끝에 [건설] (ADR-0388 · ADR-0391)
    const act = el('div', 'cn-act');
    act.appendChild(el('div', 'cn-mats', b.next.cost.map(matTile).join('') || `<span class="cn-next-end">${t('cn.free')}</span>`));
    // 한 번 누름 — 사는 일이라 고용 · 강화와 같다(되돌릴 수 없는 파괴가 아니다 · §3) · 모양은 [만들기] · [고용]과 같은 주 버튼 · 안 맞으면 흐린 채 선다
    const go = el('button', 'btn primary cn-go', t('rs.rs.go'));
    go.disabled = !!b.next.err;
    go.onclick = () => {
        const res = SYS.game.construct(G, b.id, now());
        state.cnPick = b.id;    // 지은 건물에 머문다 — 안 고른 채 지으면 기본 고르기가 다음 건물로 넘어간다
        if (res.ok) { flash('cn.built', { b: L(b.name), n: res.rank }); save(); }
        else flash(`cn.err.${res.err}`);
        render();
    };
    act.appendChild(go);
    body.appendChild(act);
    return box;
}

/** 「랭크 I」 — 글자다(상자 없음 · ADR-0324). 상태는 묶음의 글자색이 말한다. 번호는 로마 숫자이고 제 자리(`.cn-rn`)에 서서 폭이 줄끼리 같다 (SCREEN_DESIGN §13-1) */
const rankLabel = r => el('span', 'cn-rno', t('cn.rank.no', { n: `<span class="cn-rn">${M.roman(r.rank)}</span>` }));

/**
 * 랭크 목록 한 묶음 (ADR-0323 · ADR-0324). 왼쪽 「n랭크」 · 가운데 여는 것 글 · 오른쪽 끝 「✓」 / 「준비 중」 글자 — **효과만 적는다.**
 * 조건은 안 지은 랭크(준비 중 제외)에 **올리면 뜨는 툴팁**이 든다 — 「다음 랭크」 와 같은 ✓ / ✗ 표기 (2026-09-24 사용자 지시 · ADR-0347 — ~~아랫줄 주황 글씨 · ADR-0328~~).
 * **상자 없이 글이다.** **[건설]과 비용은 「다음 랭크」 가 든다** — 목록에 또 두면 같은 버튼이 두 곳에 선다.
 * 여는 것이 전부 준비 중이면 「준비 중」(지을 수 없다 · construction_draft §11-5). 여는 것 문장은 표의 줄에서 만든다(§11-6)
 */
function rankCell(b, r) {
    const next = r.rank === b.rank + 1;
    const pending = r.pending;
    const c = el('div', `cn-rank ${r.built ? 'on' : pending ? 'pending' : next ? 'next' : 'later'}`);
    c.appendChild(rankLabel(r));
    c.appendChild(el('div', 'cn-eff-t', effectText(r.effects, pending)));
    c.appendChild(el('div', 'cn-state', r.built ? '✓' : pending ? t('cn.pending') : ''));   // 지음은 ✓ 하나 — 「완료」 글자는 뺐다 (2026-09-27 사용자 지시)
    if (!r.built && !pending && r.require.length) bindTipNode(c, () => rankReqTipCard(r));
    return c;
}
/** 랭크 조건 툴팁 — 조건 줄뿐이다(제목 · 설명 없음 · CLAUDE.md 규칙 7). 표기는 「다음 랭크」 의 `.cn-req` 그대로 — 선 것 초록 ✓ · 모자란 것 경고색 ✗ (ADR-0347) */
const rankReqTipCard = r => el('div', 'tip-card cn-req-tip',
    r.require.map(x => `<span class="cn-req ${x.ok ? 'ok' : 'no'}">${x.ok ? '✓' : '✗'} ${reqText(x)}</span>`).join(''));

/** 재료 칸 — 재화 그림 칸 · 오른쪽 아래 **골드는 필요 수량 · 다른 재료는 「보유/필요」** · 칸 아래 이름 · 모자라면 칸 테 · 수량이 붉다
 *  (ADR-0323 · 보유 줄은 ADR-0397 이 구석으로 당겼다 — 골드 보유는 상단바가 든다).
 *  그림은 제작 재료면 그 단계의 재료 아이콘(`mock.js:materialIcon` — 재료 탭과 같은 그림) · 재화는 `mock.js:RES_ART` */
const matTile = c => {
    const no = c.have < c.need;
    const n = c.res === 'gold' ? c.need.toLocaleString() : `${c.have.toLocaleString()}/${c.need.toLocaleString()}`;
    const icon = M.materialIcon(c.res);
    return `<span class="cn-matw${no ? ' no' : ''}"><span class="cn-mat res-${resKind(c.res)}">${icon ? `<img src="${icon}" alt="" draggable="false">` : M.RES_ART[resKind(c.res)] ?? ''}${matTier(c.res)}<b class="cn-mat-n">${n}</b></span>`
        + `<span class="cn-mat-name">${resName(c.res)}</span></span>`;
};
/** 재화 종류 — 그림 · 색을 가른다. 자원 셋은 제 이름 · 연구소 재료는 그 재료를 내는 지점(채광 ore · 벌목 wood · 채집 herb — `lab_material.csv:post`) */
const RES_KIND_OF_POST = { mine: 'ore', log: 'wood', gather: 'herb', dust: 'dust' };   // 가루 줄의 열쇠는 뿌리 id(`dust` · R373)
const resKind = id => (['gold', 'dust', 'stigma'].includes(id) ? id : RES_KIND_OF_POST[labMat(id)?.post] ?? 'ore');

/** 여는 것 설명 — 여는 것 하나마다 「무엇을 할 수 있게 되나」 한 문장을 한 줄에 하나씩(`cn.t.<대상>` — 대상마다 한 키 · ADR-0325). 더하기는 문장이 아니라 「대상 +{n}」(ADR-0329 · 「증가」 꼬리는 ADR-0351 이 걷음).
 *  준비 중인 것은 흐린 문장 + 꼬리표(랭크 전체가 준비 중이면 꼬리 없이 — 오른쪽 끝 글자가 말한다) */
const effectText = (effects, whole) => effects.map(e => {
    // `{n}` = 그 줄의 값 · `{total}` = 그 랭크까지의 합(「파티 전술 레벨 n 해금」 — `constructionState` 가 싣는다)
    // 연구소 랭크 I 은 줄을 안 연다 — 「연구소 개방」(누적 1 · 2026-10-27 사용자 지시 · R361) · II 부터는 누적 번호 문장 그대로
    const key = e.target === 'resource_tier' && e.total === 1 ? 'cn.t.lab_open' : `cn.t.${e.target}`;
    const s = t(key, { n: e.value, total: e.total ?? e.value });
    return e.live || whole ? `<div class="cn-desc">${s}</div>` : `<div class="cn-desc soon">${s} ${t('cn.soon')}</div>`;
}).join('');
/** 조건 한 줄 — 스테이지 「1-5 클리어」 · 장 「챕터 1 클리어」 · 단을 적은 장 「나이트메어 챕터 1 클리어」(R363) · 난이도 「노말 클리어」(ADR-0909) · 합산 「합산 레벨 12 / 15」 · 영웅 ·
 *  다른 건물 랭크(첫 랭크는 「상단 건설」 · R363). 지금 값은 `constructionState` 가 실어 온다 */
const reqText = x => x.kind === 'stage' ? t('cn.req.stage', { s: stageTag(x.ref) })
    : x.kind === 'chapter' ? (x.diff ? t('cn.req.chapterIn', { d: L(D.difficulties[x.diff].name), n: x.ref }) : t('cn.req.chapter', { n: x.ref }))
    : x.kind === 'difficulty' ? t('cn.req.difficulty', { d: L(D.difficulties[x.ref].name) })
    : x.kind === 'total' ? t('cn.req.total', { have: x.have, need: x.need })
    : x.kind === 'hero' ? t('cn.req.hero', { have: x.have, need: x.need })
    : t(x.need > 1 ? 'cn.req.building' : 'cn.req.built', { b: buildingName(x.ref), n: x.need });
const stageTag = id => { const z = D.stages[id]; return z ? `${z.chapter}-${z.stage_num}` : String(id); };
const buildingName = id => { const b = SYS.construction.list.find(x => x.id === id); return b ? L(b.name) : id; };
/** 비용 한 칸 — 모자란 재화는 붉다. 재화 이름 = 자원 셋 또는 제작 재료(파견처 산출물) */
const costText = c => `<span class="${c.have < c.need ? 'no' : ''}">${resName(c.res)} ${c.need.toLocaleString()}</span>`;
const resName = id => ({ gold: t('res.gold'), stigma: t('res.stigma') })[id]   // 가루는 사다리 이름(최하급 가루 · R373)
    ?? (() => { const m = labMat(id); return m ? L({ ko: m.ko, en: m.en }) : id; })();

/** 무엇을 지어야 열리나 — `{b, n}`(건물 이름 · 랭크) · 표에 없으면 null. 판정은 `game.needOf` (§13 · R137) */
const needArgs = (target, n) => { const w = SYS.game.needOf(target, n); return w && { b: L(w.name), n: w.rank }; };
/** 잠긴 자리의 한 줄 — 첫 랭크 「선술집 건설」 · 뒤 랭크 「선술집 2랭크」 · 표에 없는 대상은 「준비 중」 (자물쇠는 그리는 쪽 · ADR-0699) */
const needKey = a => (!a ? 'cn.pending' : a.n > 1 ? 'cn.need' : 'cn.needBuild');
const needText = (target, n) => { const a = needArgs(target, n); return t(needKey(a), a ?? {}); };
/** 통째로 잠긴 칸의 베일 — 내용물 위에 검은 반투명 막 + 자물쇠(`lockIcon` 닫힘) + 한 줄. 부모가 `.lock-host`(기준 상자)여야 한다 (§13-1) */
const lockVeilText = text => el('div', 'lock-veil', `<span class="lock-ico">${lockIcon(true)}</span><span>${text}</span>`);
/** 건물 랭크가 여는 자리 — 한 줄은 「선술집 n랭크」 */
const lockVeil = (target, n) => lockVeilText(needText(target, n));
/** 잠긴 버튼을 누르면 — 같은 문장을 플래시로 */
const flashNeed = (target, n) => { const a = needArgs(target, n); flash(needKey(a), a ?? {}); };
/** 거절 플래시 — 건물이 안 열어 막힌 것(`unbuilt`)은 그 기능을 여는 건물 · 랭크를 말한다(상단 · 도박장과 같다) · 나머지는 `<탭>.err.<코드>` (ADR-0699) */
const flashErr = (pre, err, target, params) => (err === 'unbuilt' ? flashNeed(target) : flash(`${pre}.err.${err}`, params));
/** 흐린 탭을 누르면 — 그 탭에 붙은 건물 중 표 순서가 앞인 것을 말한다. 첫 랭크가 전부 준비 중이면 지을 수 없으니 「준비 중」 (§1 · ADR-0311) */
const flashUnbuilt = (cs, tab) => {
    const b = cs.buildings.find(x => x.tabIds.includes(tab));   // 한 건물이 탭 여럿을 연다 — 도서관 = 도서관 · 도감 (ADR-0762)
    if (b) flash(b.next.err === 'pending' ? 'nav.pending' : 'cn.needBuild', { b: L(b.name) });
};

/* ═══════════ 도서관 — 영웅 띠 · 전직 | 가진 책 · 책 만들기 (SCREEN_DESIGN §17 · ADR-0422 · ADR-0567 · ADR-0595) ═══════════ */

/**
 * 도서관 탭 — 맨 위 영웅 띠(§5 — 캐릭터 탭 · 상점 · 대장간과 같은 「고른 영웅」) · 그 아래 **두 열**(왼쪽 3 : 오른쪽 2 — 전직이 넓다 · ADR-0538).
 *   왼쪽 = 전직 패널(`advancePanel`) — 고른 영웅 줄 · 지금 가진 스킬 · 갈래 · 판정은 `game.advanceState` 하나 · 전직은 도서관의 뒤 랭크가 연다
 *   오른쪽 열 = 스킬 업그레이드(위 · 남는 세로) · 스킬 북 제작(아래 · 제 내용 높이 — ADR-0573 · 제목 ADR-0597) — 속은 `bookLearnInto` · `bookCraftInto` · 판정은 `game.bookState` 하나
 *   [2026-10-12 사용자 지시 「전직을 왼쪽, 가진책 기본 책 만들기를 오른쪽으로」 · ADR-0595 — ~~왼쪽 배우기 · 책 만들기 | 오른쪽 전직~~ ADR-0567]
 *   [2026-10-09 사용자 지시 「훈련장 없애고 전직 -> 서고」 · ADR-0567 — ~~훈련장 탭 · `renderTraining` · `trainingCard`~~ 은 걷었다]
 */
function renderLibrary(main) {
    const page = el('div', 'char-stack page c-train');
    // 고른 책(`bookSel` · `bookCraftSel`)은 영웅을 바꿔도 남는다 · 고른 갈래(`advSel`)는 영웅을 들고 있어 다른 영웅에겐 안 먹는다
    page.appendChild(heroStrip(pickHero));
    const h = heroById(state.heroUid);
    const bs = h ? SYS.game.bookState(G, h.uid) : null;
    const band = el('div', 'cols c-train-band');
    band.appendChild(advancePanel());
    const right = el('div', 'lib-col');
    // 박스 (ADR-0097) — 카드마다 제목은 서 있고 본문이 스크롤한다 · 스크롤 자리를 따로 든다
    //   `help` 를 주면 제목 바로 오른쪽에 `?`(편성 탭 소제목과 같은 표시 · 제목 줄이 양 끝으로 밀어도 글씨에 붙게 한 덩이로 · ADR-0600)
    //   `lock` 을 주면 그 기능이 안 열렸을 때 몸을 잠김 베일로 덮는다 — 제목 줄 · `?` 는 베일 밖(ADR-0635 · 열렸나는 `hasFeature` 하나)
    const card = (title, keep, fill, help = null, lock = null) => {
        const p = el('div', 'panel');
        const head = el('h2', '', `<span>${t(title)}</span>`);
        if (help) head.firstChild.appendChild(helpMark(title, help));
        p.appendChild(head);
        const body = el('div', 'box-body bk-box lib-body');
        body.dataset.keep = keep;
        if (bs) fill(body);
        if (lock && !SYS.game.hasFeature(G, lock)) { body.classList.add('lock-host'); body.appendChild(lockVeil(lock)); }
        p.appendChild(body);
        right.appendChild(p);
    };
    card('bk.up.h', 'library-learn', body => bookLearnInto(body, h, bs), () => t('bk.up.help'), 'skillbook');   // 제목 옆 `?` (ADR-0603) · 책 배우기 = 도서관 r1 (R398 · ADR-0928)
    card('bk.craft.h', 'library-craft', body => bookCraftInto(body, h, bs), () => t('bk.craft.help'), 'book_craft');   // 책 제작 = 도서관 r2 (2026-10-16)
    band.appendChild(right);
    page.appendChild(band);
    main.appendChild(page);
}

/** 전직 패널 — 제목 · 전직 카드 속 (§17 · R16 · 옛 훈련장 패널 그대로 — ADR-0567).
 *  건물 줄은 없다 — 전직이 안 열렸으면 갈래 자리를 잠김 베일로 덮는다(ADR-0404 · ADR-0595 · §13-1 · 열렸나는 `hasFeature` 하나) */
function advancePanel() {
    const p = el('div', 'panel');
    const head = helpHeading('h2', '', t('tr.seg.adv'), 'advance');
    p.appendChild(head);
    const body = el('div', 'box-body tr-adv-body');   // 세로 플렉스 — 갈래 카드 셋이 남는 세로를 나눠 채운다 (ADR-0607)
    body.dataset.keep = 'library-advance';
    advanceBody(body, !SYS.game.hasFeature(G, 'advance'));
    p.appendChild(body);
    return p;
}

/** 전직 카드의 속 — 띠에서 고른 영웅 하나 (§17 · R16). 판정은 전부 `game.advanceState` 가 낸다.
 *  위에서 아래로 = 고른 영웅 줄 · **지금 가진 스킬**(왼쪽) + 골드 · [전직](오른쪽 끝, 같은 높이 · ADR-1000) · 갈래 자리(`.tr-adv-main`). **잠김 베일은 갈래 자리만 덮는다** —
 *  영웅 줄 · 카드 셋은 전직이 안 열려도 읽힌다(책을 읽을지 볼 때 쓰는 줄이다) [2026-10-12 사용자 지시 「기본스킬을 전직쪽의 영웅 이름아래로」 · ADR-0595 — ~~배우기 카드 머리~~ ADR-0567] */
function advanceBody(body, locked = false) {
    const veil = host => { if (locked) { host.classList.add('lock-host'); host.appendChild(lockVeil('advance')); } };
    const h = heroById(state.heroUid);
    if (!h) { veil(body); return; }
    const A = SYS.game.advanceState(G, h.uid, now());
    const lvOk = A.need.have >= A.need.need;
    // 전직했으면 줄 오른쪽에 전직 포인트 `남은 / 받은` (2026-10-06 · R216 · SCREEN_DESIGN §17 · ADR-0529)
    const pts = A.hero.advance ? `<span class="muted tr-adv-pts">${t('tr.adv.points', A.hero.points)}</span>` : '';
    body.appendChild(el('div', 'tr-adv-hero', `<b>${L(h.name)}</b><span class="${lvOk ? 'muted' : 'no'}">${t('tr.adv.level', A.need)}</span>${pts}`));
    // 지금 가진 스킬 — 캐릭터 탭 「액티브 스킬」과 **같은 카드 셋**(`skillCardGrid` — 고유 · 습득 · 전직 칸이 늘 셋 · 빈 칸 · 자물쇠 · 칸 아래 출처) ·
    //   찬 칸 그림 오른쪽 아래 `Lv.n`(ADR-0576) · 소제목이 없다 (ADR-0578 · ADR-0589)
    const cur = el('div', 'tr-adv-cur');
    cur.appendChild(skillCardGrid(h, heroSkillCtx(h)));
    const actions = el('div', 'tr-adv-actions');
    if (!A.hero.advance && !A.hero.working) {
        actions.appendChild(el('div', 'cn-mats', matTile({ res: 'gold', need: A.gold.need, have: A.gold.have })));
        cur.appendChild(actions);
    }
    body.appendChild(cur);
    // 갈래 자리 — 전직 전 · 하는 중 · 후 하나. 베일은 여기에만 (ADR-0595)
    const main = el('div', 'tr-adv-main');
    veil(main);
    body.appendChild(main);
    const branchName = id => L(A.branches.find(b => b.id === id)?.name ?? { ko: id, en: id });
    // 스킬 한 줄 — 그림 · 이름 · 문장(`skill.csv:desc_*` 틀을 채운 것 — 캐릭터 탭 액티브 줄과 같은 `skillLineHtml` · 효과만) · 올리면 스킬 설명창(캐릭터 탭 · 도감과 같은 카드) (ADR-0402)
    //   틀을 그대로 찍으면 `{n}초마다` 가 샌다 (2026-10-24 사용자 지시) · 줄과 설명창이 같은 맥락(그 영웅 · 배운 레벨)으로 센다
    //   배운 스킬이면(`lv`) 그림 오른쪽 아래에 `Lv.n` — 아이템 칸과 같은 글 (ADR-0576)
    //   **설명은 한 줄** — 추가 피해 문장도 줄을 안 바꾸고 ` · ` 로 잇는다 (2026-10-27 사용자 지시 · ADR-0852)
    const tipCtx = { ...heroSkillCtx(h), source: 'advance' };
    const skillRow = (id, tail = null, lv = null) => {
        const r = el('div', 'tr-adv-sk');
        const s = { id, up: lv ? lv - 1 : 0 };
        r.innerHTML = `<span class="tr-adv-ico">${skillImg({ id })}${lv ? `<span class="sk-lv">${t('sk.lvTag', { n: lv })}</span>` : ''}</span>`
            + `<span class="tr-adv-tx"><b class="tr-adv-nm">${L(skillInfo(id).name)}</b><span class="tr-adv-desc">${skillLineHtml(s, tipCtx, ' · ')}</span></span>`;
        bindTipNode(r, () => skillTipCard(s, tipCtx));
        if (tail) r.appendChild(tail);
        return r;
    };
    // 갈래 카드 — 왼쪽 칸 = 갈래 이름 + 갈래를 상징하는 설명(`advance.csv:desc_*`) · 오른쪽 = 스킬 셋이 한 줄씩 (가로로 긴 카드 · ADR-0402 · ADR-0403)
    //   `done` = 전직한 갈래 — 주황 테두리 (ADR-0592)
    const branchCard = (br, rows, done = false) => {
        const box = el('div', `tr-adv-branch${done ? ' done' : ''}`);
        box.appendChild(el('div', 'tr-adv-bh', `<b>${L(br.name)}</b><span class="tr-adv-bdesc">${L(br.desc)}</span>`));
        const list = el('div', 'tr-adv-sks');
        for (const r of rows) list.appendChild(r);
        box.appendChild(list);
        return box;
    };
    // 전직하는 중 — 갈래 이름 · 막대 · 남은 시간 (앱 시계가 폭 · 글자만 갈아 끼운다 — `refreshAdvanceBars`)
    if (A.hero.working) {
        const w = A.hero.working;
        const box = el('div', 'tr-adv-work');
        box.innerHTML = `<b>${branchName(w.branch)}</b><i class="tr-adv-bar"><b data-advbar="${h.uid}" style="width:${(w.frac * 100).toFixed(1)}%"></b></i>`
            + `<span class="muted" data-advleft="${h.uid}">${t('tr.adv.left', { t: fmtDuration(Math.max(0, w.until - now())) })}</span>`;
        main.appendChild(box);
        return;
    }
    // 전직 후 — 전직 전과 같은 갈래 셋이 서고 **전직한 갈래만 주황 테두리**(나머지 둘은 평소 카드 · `can-pick` 이 없어 누를 것이 없다 · 2026-10-12 사용자 지시 · ADR-0592)
    //   전직한 갈래의 배운 줄 끝에 「배움」 · 그 그림 오른쪽 아래에 `Lv.n`(상태만 · ADR-0576). **배우기 · 되돌리기는 마스터리 창 전직 판이다** — 버튼이 없다 (2026-10-08 사용자 지시 · ADR-0542)
    if (A.hero.advance) {
        const row = el('div', 'tr-adv-row');
        for (const br of A.branches) {
            const done = br.id === A.hero.advance;
            const rows = br.skills.map(id => done && A.hero.skill === id
                ? skillRow(id, el('span', 'tr-adv-act', `<span class="tr-adv-got">${t('tr.adv.learned')}</span>`), A.hero.lv)
                : skillRow(id));
            row.appendChild(branchCard(br, rows, done));
        }
        main.appendChild(row);
        return;
    }
    // 전직 전 — 그 직업의 갈래 셋이 세로로 쌓인다(ADR-0402). **카드를 누르면 그 갈래가 골라지고**(파란 겉 테두리 · 하나만 · 다시 누르면 풀린다)
    //   스킬 줄 오른쪽 끝 [전직] 이 켜진다 — 고르기 + 누르기가 두 번 누름이다(§3 · 상점 「고르고 산다」와 같은 문법 · ADR-0536 · 자리 ADR-1000)
    const pick = state.advSel?.uid === h.uid && A.branches.some(b => b.id === state.advSel.branch) ? state.advSel.branch : null;
    const row = el('div', 'tr-adv-row');
    for (const br of A.branches) {
        const card = branchCard(br, br.skills.map(id => skillRow(id)));
        card.classList.add('can-pick');
        if (br.id === pick) card.classList.add('pick');
        card.onclick = () => { state.advSel = br.id === pick ? null : { uid: h.uid, branch: br.id }; render(); };
        row.appendChild(card);
    }
    main.appendChild(row);
    // [전직] — 거절(레벨 · 탐험)은 플래시로 말하고 고른 채 둔다 · 원정에서 싸우는 중이어도 된다(2026-10-24) · 전직이 안 열렸으면(도서관 r3 전 — 2026-10-16) 잠김 베일이 갈래 자리를 덮으니 버튼을 안 세운다
    if (!A.open) return;
    const b = el('button', 'btn sm primary tr-adv-go', t('tr.adv.go'));
    b.disabled = !pick;
    b.onclick = () => {
        const r = SYS.game.advanceStart(G, h.uid, pick, now());
        if (!r.ok) { flashErr('tr', r.err, 'advance'); return; }
        state.advSel = null;
        flash('tr.adv.started', { name: L(h.name), b: branchName(pick) });
        save();
        render();
    };
    actions.appendChild(b);
}

/** 전직 막대 · 남은 시간만 — 앱 시계가 도서관 탭이 보일 때 눈금마다 부른다(자원 게이지와 같은 길 · 전체 다시 그림이 아니다) */
function refreshAdvanceBars(at) {
    for (const n of document.querySelectorAll('[data-advbar]')) {
        const w = SYS.game.advanceState(G, n.dataset.advbar, at).hero.working;
        if (w) n.style.width = `${(w.frac * 100).toFixed(1)}%`;
    }
    for (const n of document.querySelectorAll('[data-advleft]')) {
        const w = SYS.game.advanceState(G, n.dataset.advleft, at).hero.working;
        if (w) n.textContent = t('tr.adv.left', { t: fmtDuration(Math.max(0, w.until - at)) });
    }
}

/* ═══════════ 선술집 ═══════════ */

/* ═══════════ 연구소 — 한눈에 보는 트리 · 지점 · 연구 (SCREEN_DESIGN §8 · ADR-0684 · 짜임 ADR-0681 · 고른 칸 ADR-0674) ═══════════
   왼쪽 = 트리(행 = 줄 하나: 줄 카드 + 영웅 칸 → 지점 노드 일자) · 오른쪽 = 고른 지점(다음 레벨 · [연구] / [그만두기] · 이 줄).
   **줄 하나 = 지점 몇 개**(`lab_node.csv` · base_expedition §2-1) — 새 줄은 `LAB_LINES` 에 한 줄 · 새 지점은 표에 한 행으로 선다.
   **선은 줄 카드 → 지점 → 지점으로만** 잇는다 — 줄 사이를 잇지 않는다(지점을 여는 것은 연구소 랭크 하나).
   **지점 레벨 올리기 = 연구** — 연구소 전체에 하나(기획) · 시작하는 자리는 고른 지점 하나다(노드마다 버튼을 세우면 훑는 손짓과 사는 손짓이 겹친다).
   값 · 비용 · 시간 · 거절 · 등록 효과는 `game.labState` 가 낸다(화면은 계산하지 않는다 — 찍는 모양만 고른다).
   `dp.*` 키 · `.dp-*` 클래스 · 탭 id `resource` 는 옛 이름 그대로 둔다 */

/** 다음 1개 게이지 — 다음 1개까지 찬 비율 [base_expedition §3-3]. 앱 시계가 폭만 갈아 끼운다(`refreshDispatchBars`) */
const dpGauge = postId => {
    const p = SYS.game.dispatchProgress(G, postId, now());
    return p ? `<i class="dp-gauge"><b data-dpbar="${postId}" style="width:${(p.frac * 100).toFixed(1)}%"></b></i>` : '';
};
const dpRateNumber = n => String(Math.round(n * 10) / 10);
const dpRate = n => t('dp.perHour', { n: dpRateNumber(n) });
/** 게이지 · 연구 막대 · 남은 시간 글자만 — 앱 시계가 연구소 탭이 보일 때 눈금마다 부른다(골드 · 플레이 시간과 같은 길 · 전체 다시 그림이 아니다) */
function refreshDispatchBars(at) {
    for (const b of document.querySelectorAll('[data-dpbar]')) {
        const p = SYS.game.dispatchProgress(G, b.dataset.dpbar, at);
        if (p) b.style.width = `${(p.frac * 100).toFixed(1)}%`;
    }
    const lib = SYS.game.labState(G, at).lines.find(l => l.line === 'lib');
    for (const b of document.querySelectorAll('[data-libbar]')) {
        const p = lib?.production?.find(p => p.uid === b.dataset.libbar);
        if (p) b.style.width = `${(p.frac * 100).toFixed(1)}%`;
    }
    const R = G.labResearch ? SYS.game.labState(G, at).research : null;
    if (!R) return;
    for (const b of document.querySelectorAll('[data-labbar]')) b.style.width = `${(R.frac * 100).toFixed(1)}%`;
    for (const n of document.querySelectorAll('[data-lableft]')) n.textContent = t('dp.res.left', { t: fmtDuration(Math.max(0, R.until - at)) });
}

/** 지점 · 줄 이름 — 「자원 · 채광」 */
const labNodeName = node => t(`dp.node.${node}`);
const labPostOf = id => LAB_LINES.find(p => p.id === id);
const labNodeLabel = (line, node) => `${t(labPostOf(line)?.label ?? 'nav.resource')} · ${labNodeName(node)}`;
/** 지점 값을 찍는 모양 — 계산이 아니라 모양만(배수 `×` · 확률 `%` · 수 · 거리) */
const labNum = v => String(Math.round(v * 100) / 100);
function labValText(node, v) {
    if (node === 'seats') return t('dp.val.seats', { n: v });
    if (node === 'waiting') return t('dp.val.slots', { n: v });
    if (node === 'range') return t('dp.val.range', { n: v });
    if (node === 'burst' || node === 'quality') return `+${M.pctNum(v)}%`;
    return `×${labNum(v)}`;
}
/** 그 줄의 화면 덩어리 · 고른 지점 — `state.labNode = {줄: 지점}`(화면 상태 · 세이브에 안 든다) · 처음엔 그 줄의 첫 지점 */
const labLineOf = (S, post) => S.lines.find(l => l.line === post.id);
const dpPickNode = line => line.nodes.find(n => n.node === state.labNode?.[line.line]) ?? line.nodes[0];

/** Lv 눈금 — 칸 수 = 지점 상한 · 찬 칸 = 레벨 */
const dpPips = (lv, max) => `<span class="dp-pips">${Array.from({ length: max }, (_, i) => `<i${i < lv ? ' class="on"' : ''}></i>`).join('')}</span>`;
/** 연구소 랭크 말고 다른 건물이 여는 줄 — 그 켜기 대상(`game` 의 `labLineOpen` · 도박장 = 선술집 r3(R363) · 자원 = 창고 r1 · R361 · 수색 = 선술집 영웅 고용 · 2026-10-30) */
const DP_LINE_GATE = { gamble: 'gamble', res: 'lab_res', visit: 'hire', lib: 'book_craft' };
/** 그 줄이 연구소가 선 뒤에도 닫혀 있다 — 다른 건물을 기다린다(그 켜기 대상 · 아니면 null) */
const dpGateWait = line => (DP_LINE_GATE[line.line] && !line.open && SYS.game.limitsOf(G).resourceTiers >= 1 ? DP_LINE_GATE[line.line] : null);
/** 잠긴 지점이 무엇을 기다리나 — 「선술집 n랭크 필요」(도박장 줄) · 「창고 건설」(자원 줄) · 「연구소 n랭크 필요」 */
const dpNeedFull = (line, n) => { const g = dpGateWait(line); return g ? needText(g) : needText('resource_tier', n.unlockRank); };
/** 같은 판정을 플래시로 — 막힌 연구 · 등록을 눌렀을 때 (ADR-0699) */
const flashDpNeed = (line, n) => { const g = dpGateWait(line); return g ? flashNeed(g) : flashNeed('resource_tier', n.unlockRank); };
// ~~dpNeedShort~~ — 노드 아래 「n랭크」 · 「닫힘」 (2026-10-21 ADR-0696 — 노드 아래 글을 걷었다 · `title` 과 고른 지점이 든다)

/**
 * 트리 (ADR-0681 · 노드 ADR-0684) — 칸마다 격자 자리를 박는다: 행 = 줄 하나 · 열 = 줄 카드 | 지점 1 → n. 열 수는 가장 긴 줄의 지점 수(CSV 표)를 CSS 변수로 넘긴다.
 * 선은 노드 칸 한가운데를 지나는 반쪽 선 둘(`in` · `out` — 밝으면 열린 노드끼리)이 긋는다 · 행 사이에는 선이 없다.
 * 머리(`h2`) = 연구소 이름 · 오른쪽에 지금 랭크 · 오프라인 최대 · 연구 중이면 무엇을 · 남은 시간
 */
function dpTree(S) {
    const tree = el('div', 'panel dp-tree');
    const b = SYS.game.constructionState(G).buildings.find(x => x.id === 'resource');
    const R = S.research;
    const res = R ? ` · <span class="dp-res-h">${t('dp.res.busy', { name: labNodeLabel(R.line, R.node) })} ${t('dp.lv', { n: R.lv })} · <span data-lableft="1">${t('dp.res.left', { t: fmtDuration(Math.max(0, R.until - now())) })}</span></span>` : '';
    tree.appendChild(helpHeading('h2', '', `<span>${b ? L(b.name) : t('nav.resource')}</span><small>${b?.rank ? t('cn.rank', { n: b.rank }) : lockLine(needText('resource_tier', 1))} · ${t('dp.offline', { h: D.balance.dispatch_offline_cap_hours })}${res}</small>`, 'resource'));
    const grid = el('div', 'dp-tree-grid');
    // 열 수 = 가장 긴 줄의 지점 수 · 행 높이는 줄 수와 무관하게 격자의 1/7(CSS `--dp-fit` · ADR-0682) — 넘치면 격자만 스크롤한다
    grid.style.setProperty('--dp-tiers', Math.max(1, ...S.lines.map(l => l.nodes.length)));
    const at = (node, row, col) => { node.style.gridRow = row; node.style.gridColumn = col; return node; };
    LAB_LINES.forEach((post, i) => {
        const line = labLineOf(S, post);
        if (!line) return;
        grid.appendChild(at(dpTreeLine(post, line), i + 1, 1));
        line.nodes.forEach((n, k) => grid.appendChild(at(dpTreeNode(post, line, n, k, R), i + 1, 2 + k)));
    });
    tree.appendChild(grid);
    return tree;
}
/** 줄 카드 (ADR-0681 · ADR-0684 · ADR-0788) — 줄 그림 · 이름 · 잠긴 줄은 자물쇠 + 여는 조건(「선술집 3랭크」 · ADR-0959 — ~~「닫힘」~~) · 오른쪽 끝 영웅 칸.
 *  클릭 = 그 줄(마지막에 고른 지점) · 고른 줄은 왼쪽 강조선. ~~[미니게임]~~ — 2026-10-21 숨김(ADR-0682) · 창(`mgOpen`)은 남아 개발용 `?dev=mg` 만 연다 */
function dpTreeLine(post, line) {
    const cell = el('div', 'dp-tree-line');
    const card = el('div', `dp-card${line.open ? ' open' : ''}${labPost() === post ? ' on' : ''}${state.labLineView && labPost() === post ? ' pick' : ''}`);
    card.innerHTML = `<div class="dp-card-h"><img class="dp-card-ico${post.sq ? ' sq' : ''}" src="${labLineIcon(post)}" alt="" draggable="false"><span class="dp-card-n">${t(post.label)}</span></div>`;
    if (!line.open) card.firstElementChild.appendChild(el('span', 'dp-card-lv', lockLine(dpNeedFull(line, line.nodes[0]))));
    // 영웅 칸 — 이름 오른쪽 같은 줄 · 카드 오른쪽 끝 (ADR-0683)
    const reg = dpRegRow(post, line);
    if (reg) card.firstElementChild.appendChild(reg);
    // 클릭 = 그 줄을 고른다 — 오른쪽이 「고른 줄」(등록 효과 · 영웅 얼굴 · ADR-0700 — ~~그 줄에서 마지막에 고른 지점~~ ADR-0681)
    card.onclick = () => { state.post = post.id; state.labLineView = true; render(); };
    cell.appendChild(card);
    return cell;
}
/** 지점 노드 (ADR-0684 · ADR-0696) — 지점 그림 원(회색 실루엣) 하나 · 원 오른쪽 아래 `Lv.n`(레벨 1 이상 — 스킬 · 아이템 칸과 같은 배지) · 아래 글 없음 /
 *  연구 중 = 주황 테두리 + 원 아래 막대 / 잠긴 노드 = 흐린 원 + 자물쇠. 이름 · 지금 값 · 무엇이 여는지는 `title` 과 고른 지점이 든다 */
function dpTreeNode(post, line, n, k, R) {
    const nodes = line.nodes;
    const sel = !state.labLineView && labPost() === post && dpPickNode(line) === n;   // 고른 줄을 보는 동안은 노드를 안 고른다 (ADR-0700)
    const doing = R?.line === post.id && R.node === n.node;
    const c = el('div', `dp-tree-cell${n.open ? ' open in' : ''}${nodes[k + 1]?.open ? ' out' : ''}${k === nodes.length - 1 ? ' end' : ''}${sel ? ' on' : ''}${doing ? ' doing' : ''}`);
    c.title = `${labNodeName(n.node)} · ${labValText(n.node, n.value)}${n.open ? '' : ` — ${dpNeedFull(line, n)}`}`;
    c.innerHTML = `<span class="dp-tree-orb dp-node-orb"><img src="${M.labNodeIcon(n.node)}" alt="" draggable="false">${n.open ? '' : `<span class="lock-ico">${lockIcon(true)}</span>`}${n.open && n.lv > 0 ? `<span class="dp-lv-tag">${t('dp.lvTag', { n: n.lv })}</span>` : ''}</span>`
        + (doing ? `<i class="dp-gauge res dp-tree-bar"><b data-labbar="1" style="width:${(R.frac * 100).toFixed(1)}%"></b></i>` : '');
    c.onclick = () => { state.post = post.id; state.labLineView = false; state.labNode = { ...(state.labNode ?? {}), [post.id]: n.node }; render(); };
    return c;
}

/** 고른 지점의 머리 — 큰 지점 그림 원 · 지점 이름 · 줄 이름 · Lv 눈금(잠겼으면 없다) */
const dpSideHead = (img, name, sub, info) => {
    const head = el('div', `dp-side-h${info ? '' : ' locked'}`,
        `<span class="dp-side-orb dp-node-orb">${img ? `<img src="${img}" alt="" draggable="false">` : ''}</span>
        <span class="dp-side-t"><span class="dp-side-n">${name}</span><span class="dp-side-y">${sub}</span>
        ${info ? `<span class="dp-side-lv"><span>${t('dp.lvOf', { n: info.lv, max: info.max })}</span>${dpPips(info.lv, info.max)}</span>` : ''}</span>`);
    headingHelp(head.querySelector('.dp-side-n'), () => t('hint.resource'));
    return head;
};
/** 연구 버튼의 결과 — 거절은 플래시 · 됐으면 저장하고 다시 그린다 */
function dpResearchDone(r, okKey, args) {
    if (!r.ok) { flash(`dp.err.${r.err}`); render(); return; }
    flash(okKey, args);
    save();
    render();
}
/**
 * 고른 지점 (ADR-0684 · 문법 ADR-0674) — 오른쪽 열 · 위에서부터: 머리 → 「다음 레벨」(지금 값 → 올린 뒤 · 비용 칸 · 걸리는 시간 + [연구] /
 * 이 지점을 연구 중이면 막대 · 남은 시간 + [그만두기] / 다른 연구 중이면 [연구] 꺼짐 + 무엇이 도는지 / 상한 · 잠김) → 레벨 목록.
 * 「이 줄」은 여기 없다 — 줄 카드를 누른 고른 줄(`dpLineSide`)만 든다 (2026-10-27 · ADR-0889)
 */
function dpSide(post, line, S) {
    const box = el('div', 'dp-side');
    const n = line && dpPickNode(line);
    if (!n) { box.appendChild(el('span', 'muted', '—')); return box; }
    box.appendChild(dpSideHead(M.labNodeIcon(n.node), labNodeName(n.node), t(post.label), n.open ? n : null));
    const next = el('div', 'dp-side-next');
    next.appendChild(helpHeading('div', 'sub-h dp-side-sub', t('dp.next.h'), 'resource_next'));
    box.appendChild(next);
    const R = S.research;
    if (!n.open) next.insertAdjacentHTML('beforeend', `<span class="dp-side-end"><span class="lock-ico">${lockIcon(true)}</span><span>${dpNeedFull(line, n)}</span></span>`);
    else if (R && R.line === post.id && R.node === n.node) {
        // 이 지점을 연구 중 — 막대 · 남은 시간 + [그만두기](낸 비용을 전부 돌려받아 되돌릴 수 있어 한 번 누른다 — §3)
        if (n.next) next.appendChild(el('div', 'dp-side-rate', `<b>${labValText(n.node, n.value)}</b><span class="dp-side-arrow">→</span><b class="up">${labValText(n.node, n.next.value)}</b>`));
        const w = el('div', 'dp-side-res', `<i class="dp-gauge res"><b data-labbar="1" style="width:${(R.frac * 100).toFixed(1)}%"></b></i><span class="muted" data-lableft="1">${t('dp.res.left', { t: fmtDuration(Math.max(0, R.until - now())) })}</span>`);
        const stop = el('button', 'btn dp-side-go', t('dp.res.cancel'));
        stop.onclick = () => dpResearchDone(SYS.game.labResearchCancel(G, now()), 'dp.res.canceled', {});
        w.appendChild(stop);
        next.appendChild(w);
    } else if (!n.next) next.appendChild(el('div', 'dp-side-end', t('dp.lvTop')));
    else {
        // 걸리는 시간 — 「지금 → 올린 뒤」 줄의 오른쪽 끝(재료 칸 · 버튼 줄에 끼우면 재료 칸이 세로로 접힌다 · 따로 한 줄이면 아래 레벨 목록이 세로를 잃는다 — ADR-0694)
        next.appendChild(el('div', 'dp-side-rate', `<b>${labValText(n.node, n.value)}</b><span class="dp-side-arrow">→</span><b class="up">${labValText(n.node, n.next.value)}</b><span class="dp-side-time muted">${t('dp.res.time', { t: fmtDuration(n.next.ms) })}</span>`));
        const act = el('div', 'dp-side-act');
        const mats = [{ res: 'gold', need: n.next.gold, have: G.resources.gold ?? 0 }];
        if (n.next.mat) mats.push({ res: n.next.mat.id, need: n.next.mat.n, have: G.materials?.[n.next.mat.id] ?? 0 });
        act.appendChild(el('div', 'cn-mats', mats.map(matTile).join('')));
        const go = el('button', 'btn primary dp-side-go', t('dp.res.go'));
        go.disabled = !!n.err;
        go.onclick = () => {
            const r = SYS.game.labResearchStart(G, post.id, n.node, now());
            // 막힌 연구는 여는 조건을 말한다 — 안 열린 지점 = 연구소 랭크 (ADR-0699)
            if (r.err === 'locked') { flashDpNeed(line, n); render(); return; }
            dpResearchDone(r, 'dp.res.started', { name: labNodeLabel(post.id, n.node) });
        };
        act.appendChild(go);
        next.appendChild(act);
        // 왜 못 누르나 — 다른 연구가 돈다(연구소 전체에 하나)
        if (R) next.appendChild(el('div', 'dp-side-busy muted', t('dp.res.busy', { name: labNodeLabel(R.line, R.node) })));
    }
    box.appendChild(dpLvList(n));
    return box;
}
/**
 * 레벨 목록 (ADR-0694) — 소제목 「{지점} 레벨」 + 레벨 1 ~ 최대 한 줄에 하나: `Lv n` · 그 레벨의 값 · 오른쪽 끝 「✓」.
 * 건설 랭크 목록(`rankCell`)의 글 문법 — 오른 레벨 흰 글 + ✓ · 다음 레벨 굵게 + 옅은 붉은 바탕 · 그 뒤 흐림. 한 줄 높이 · 두 단(단마다 위에서 아래로)
 */
function dpLvList(n) {
    const wrap = el('div', 'dp-lvl');
    wrap.appendChild(helpHeading('div', 'sub-h dp-side-sub', t('dp.lvList.h', { name: labNodeName(n.node) }), 'resource_levels'));
    const list = el('div', 'dp-lvs');
    list.style.setProperty('--dp-lv-rows', Math.ceil(n.levels.length / 2));
    n.levels.forEach((v, i) => {
        const lv = i + 1;
        const c = el('div', `dp-lv ${lv <= n.lv ? 'on' : lv === n.lv + 1 ? 'next' : 'later'}`);
        c.innerHTML = `<span class="dp-lv-no">${t('dp.lv', { n: lv })}</span><span class="dp-lv-v">${labValText(n.node, v)}</span><span class="dp-lv-ok">${lv <= n.lv ? '✓' : ''}</span>`;
        list.appendChild(c);
    });
    wrap.appendChild(list);
    return wrap;
}
/** 이름 | (출처) | 값 한 줄 — 고른 줄의 「지금 내는 것」 · 효과 표 (ADR-0971) · `dim` = 흐림(0 인 효과) */
const dpKv = (name, val, src = '', dim = false) => `<div class="dp-kv${dim ? ' dim' : ''}"><span class="dp-kv-n">${name}</span><span class="dp-kv-s">${src}</span><b class="dp-kv-v">${val}</b></div>`;
/** 지금 내는 것 (ADR-0684 · ADR-0788 · ADR-0971 — ~~소제목 「이 줄」~~) — 소제목 = 그 내용의 이름(`dp.out.h.<줄>`) ·
 *  자원 = 재료 셋마다 그림 · 이름 · 시간당 + 다음 1개 게이지 / 수색 = 도착 간격 · 레어 확률 · 대기 칸 / 훈련 = 상한 레벨 / 도박장 = 골드.
 *  **고른 줄에만 선다**(줄 카드를 눌렀을 때 · 2026-10-27 · ADR-0889) */
function dpSideLine(post, line) {
    const box = el('div', 'dp-side-line');
    box.appendChild(helpHeading('div', 'sub-h dp-side-sub', t(`dp.out.h.${post.id}`), 'resource_lines'));
    if (post.res) {
        const list = el('div', 'dp-tiers');
        for (const m of D.labMaterials ?? []) {
            const p = SYS.game.dispatchProgress(G, m.post, now());
            list.appendChild(el('div', 'dp-tier', `<img src="${M.materialIcon(m.id)}" alt="" draggable="false"><span class="dp-tier-n">${L({ ko: m.ko, en: m.en })}</span><b>${p ? dpRate(p.perHour) : '—'}</b>${p ? dpGauge(m.post) : ''}`));
        }
        box.appendChild(list);
    } else if (post.visit) {
        const v = SYS.game.visitState(G, now());
        // 줄은 열렸고 「간격」을 아직 안 올렸다 — 올릴 지점 (ADR-0959)
        box.insertAdjacentHTML('beforeend', v.open
            ? dpKv(t('dp.out.interval'), t('dp.out.hours', { h: dpRateNumber(v.hours) })) + dpKv(t('dp.out.rare'), `${M.pctNum(v.rarePct)}%`) + dpKv(t('dp.out.waiting'), `${v.used} / ${v.slots}`)
            : `<div class="dp-side-end">${lockLine(`${labNodeName('interval')} ${t('dp.lv', { n: 1 })}`)}</div>`);
    } else if (post.id === 'train') {
        // 상한 = 로스터 최고 레벨 − 「범위」 — 1 아래면 아무도 못 받는다(「—」 · 음수 레벨을 안 찍는다) · 아래 줄이 그 차이
        const range = line.nodes.find(n => n.node === 'range');
        box.insertAdjacentHTML('beforeend', dpKv(t('dp.out.cap'), line.cap >= 1 ? t('dp.lv', { n: line.cap }) : '—')
            + (range ? dpKv(labNodeName('range'), labValText('range', range.value)) : ''));
    }
    else if (post.id === 'gamble') box.insertAdjacentHTML('beforeend', dpKv(t('dp.out.gold'), dpRate(line.perHour)));
    else if (post.id === 'lib') {
        for (const p of line.production ?? []) {
            const h = G.heroes.find(x => x.uid === p.uid);
            box.insertAdjacentHTML('beforeend', dpKv(L(h?.name), dpRate(p.perHour))
                + `<div class="dp-tier-n">${p.skills.map(id => L(SYS.skill.defs[id].name)).join(' · ')}</div>`
                + `<i class="dp-gauge"><b data-libbar="${p.uid}" style="width:${p.frac * 100}%"></b></i>`);
        }
        if (!line.production?.length) box.appendChild(el('div', 'dp-side-end', t('dp.lib.empty')));
    }
    return box;
}

/**
 * 고른 줄 (ADR-0700 · ADR-0971) — 줄 카드를 눌렀을 때 오른쪽 열 · 위에서부터: 머리(큰 줄 그림 · 줄 이름 · **하는 일 한 줄**) → 지금 내는 것 → 「등록 효과」(등록한 영웅 카드 + 빈 칸 `+` · 효과 표).
 * 닫힌 줄은 하는 일 아래 무엇이 여는지(`dpNeedFull` — 그 줄의 첫 지점)
 */
function dpLineSide(post, line) {
    const box = el('div', 'dp-side');
    if (!line) { box.appendChild(el('span', 'muted', '—')); return box; }
    // 머리 — 큰 줄 그림 + 하는 일 한 줄 · 줄 이름은 판 제목(`renderResource` 의 h2)이 든다 · 상태 글은 없다(잠겼으면 아래 자물쇠 + 여는 조건 한 줄 · ADR-0959)
    box.appendChild(el('div', `dp-side-h${line.open ? '' : ' locked'}`,
        `<span class="dp-side-orb${post.sq ? ' sq' : ''}"><img src="${labLineIcon(post)}" alt="" draggable="false"></span>
        <span class="dp-side-t"><span class="dp-line-desc">${t(`dp.line.desc.${post.id}`)}</span></span>`));
    if (!line.open) {
        box.insertAdjacentHTML('beforeend', `<span class="dp-side-end"><span class="lock-ico">${lockIcon(true)}</span><span>${dpNeedFull(line, line.nodes[0])}</span></span>`);
        return box;
    }
    box.appendChild(dpSideLine(post, line));
    box.appendChild(dpFxBox(post, line));
    return box;
}
/** 「등록 효과」 (ADR-0700 · ADR-0702) — 등록한 영웅 카드(띠와 같은 얼굴 · 올리면 영웅 툴팁) + 열린 빈 칸 `+`(클릭 = 그 줄의 등록 창) + 안 열린 칸 자물쇠(클릭 = 「등록 칸」 지점) ·
 *  아래 효과 표 — 그 줄에 걸리는 효과는 0 이어도 다 선다(0 은 흐림) · 한 줄 = 이름 | 미는 능력치 | +n% (ADR-0971 — ~~0 이 아닌 것만 · 속도 ×n~~) ·
 *  능력치 1 당 몇 % 같은 규칙 문장은 도움말의 몫(CLAUDE.md 규칙 7) */
function dpFxBox(post, line) {
    const box = el('div', 'dp-side-fx');
    box.appendChild(helpHeading('div', 'sub-h dp-side-sub', t('dp.fx.h'), 'resource_effects'));
    const go = () => { state.labRegLine = post.id; openModal('labReg'); };
    const faces = el('div', 'hero-strip dp-fx-heroes');
    for (const uid of line.seats.uids) {
        const h = G.heroes.find(x => x.uid === uid);
        if (!h) continue;
        const c = el('div', `hs-card${h.tier === 'unique' ? ' unique' : ''}`);
        c.style.borderTopColor = tierColor(h);
        c.innerHTML = heroCardHtml(h, { doing: labDoing(h) });
        bindTipNode(c, () => heroTipCard(h, combatOf(h), itemOf, it => equippedItemTipCard(h, it)), { anchor: true, holdOnAlt: true });
        c.onclick = go;
        faces.appendChild(c);
    }
    for (let i = line.seats.uids.length; i < line.seats.cap; i++) {
        const add = el('div', 'hs-card empty', '<span>+</span>');
        add.onclick = go;
        faces.appendChild(add);
    }
    // 안 열린 칸 — 자물쇠 · 누르면 「등록 칸」 지점 (ADR-0702 — 줄 카드의 영웅 칸과 같다)
    const seat = dpSeatSlots(post, line);
    for (let k = line.seats.cap + 1; k <= seat.max; k++) {
        const lock = el('div', 'hs-card empty lock', lockIcon(true));
        lock.title = seat.lockTitle(k);
        lock.onclick = seat.pick;
        faces.appendChild(lock);
    }
    box.appendChild(faces);
    // 효과 표 — [이름, 미는 능력치, 비율(0 = 효과 없음), 깎는 쪽인가] · 대박 · 레어는 그 지점이 있는 줄에만(`labState` 가 다른 줄엔 0 을 낸다 · INTERFACE §5-3)
    const fx = line.effects, has = node => line.nodes.some(n => n.node === node);
    const attr = id => { const a = D.heroAttributes.find(x => x.id === id); return a ? L(a) : id; };
    const rows = [[t(`dp.fx.speed.${post.id}`), 'str', fx.speed - 1, false],
        ...(has('burst') ? [[t('dp.fx.burst'), 'luck', fx.burst, false]] : []),
        ...(has('quality') ? [[t('dp.fx.quality'), 'cha', fx.quality, false]] : []),
        [t('dp.fx.research'), 'int', fx.research - 1, false],
        [t('dp.fx.cost'), 'agi', fx.costCut, true]];
    box.insertAdjacentHTML('beforeend', `<div class="dp-fx">${rows.map(([name, src, v, cut]) =>
        dpKv(name, `${cut ? '−' : '+'}${M.pctNum(Math.max(0, v))}%`, attr(src), !(v > 1e-9))).join('')}</div>`);
    return box;
}

function renderResource(main) {
    const S = SYS.game.labState(G, now());
    const post = labPost();
    const page = el('div', 'page page-stack');
    // 영웅 띠 — 탐험 탭과 같은 **보기 전용** 띠 [2026-10-21 사용자 「일단 연구소 위에 영웅 얼굴 좀 넣어봐」 · ADR-0676] ·
    //   위칸 왼쪽은 **연구소 안에서 하는 일**(등록한 줄 · ADR-0677) · 등록은 띠가 아니라 줄 카드의 영웅 칸에서(ADR-0681)
    page.appendChild(heroStrip(() => {}, { view: true, doing: labDoing }));
    const wrap = el('div', 'dp-wrap fill');
    // 왼쪽 — 한눈에 보는 트리: 줄마다 한 행(줄 카드 + 영웅 칸 → 지점 일자) (ADR-0681 · ADR-0684)
    wrap.appendChild(dpTree(S));
    // 오른쪽 — 고른 지점(노드를 눌렀을 때) / 고른 줄(줄 카드를 눌렀을 때 · ADR-0700) · 머리 위에 줄 이름
    const side = state.labLineView ? dpLineSide(post, labLineOf(S, post)) : dpSide(post, labLineOf(S, post), S);
    side.classList.add('panel');
    side.prepend(helpHeading('h2', '', t(post.label), 'resource'));
    wrap.appendChild(side);
    page.appendChild(wrap);
    main.appendChild(page);
}

/* ── 연구소 줄 등록 (SCREEN_DESIGN §8 · ADR-0677 · ADR-0684) — 영웅을 줄에 **등록**한다 · 한 영웅은 한 줄 · 줄마다 「등록 칸」만큼 · 편성 · 원정과 겸직 ·
   **효과 = 그 영웅의 능력치 일곱**(「이 줄」이 숫자로 든다). 띠 위칸 = 등록한 줄 · 줄 카드의 영웅 칸 → 그 줄의 등록 창(ADR-0681).
   판정 · 옮기기는 `game.labRegister` 가 한다(화면은 결과만 그린다) */
/** 고른 줄 — 트리에서 고른 것(`state.post`) · 처음엔 첫 줄 */
const labPost = () => LAB_LINES.find(p => p.id === state.post) ?? LAB_LINES[0];
/** 등록 창의 줄 — 누른 영웅 칸의 줄(`state.labRegLine` · 화면 상태) · 없으면 고른 줄. 고른 줄을 안 바꿔 오른쪽 고른 지점이 그대로다 (ADR-0681) */
const labRegPost = () => LAB_LINES.find(p => p.id === state.labRegLine) ?? labPost();
/** 연구소 띠 · 등록 창의 위칸 왼쪽 — 등록한 줄 이름(주황) / 미등록(회색). 원정 · 탐험은 안 센다(겸직 — 다른 탭이 말한다) */
function labDoing(h) {
    const line = labPostOf(SYS.game.labRegOf(G, h.uid));
    return line ? { cls: 'exp', text: t(line.label) } : { cls: 'idle', text: t('dp.reg.none') };
}
/**
 * 영웅 칸 수의 끝 · 잠긴 칸 (ADR-0702) — 칸은 늘 「등록 칸」 지점의 최대 값만큼 선다(그 지점의 레벨별 값 `levels` 의 끝 — 칸 수를 코드에 안 둔다).
 * `openLv(k)` = k 번째 칸을 여는 「등록 칸」 레벨 · `pick` = 잠긴 칸 클릭 — 그 줄의 「등록 칸」 지점을 고른다(무엇이 · 얼마에 여는지가 바로 보인다)
 */
function dpSeatSlots(post, line) {
    const n = line.nodes.find(x => x.node === 'seats');
    const max = Math.max(line.seats.cap, Math.floor(n?.levels.at(-1) ?? line.seats.cap));
    const openLv = k => (n ? n.levels.findIndex(v => v >= k) + 1 : 0);
    const pick = e => { e?.stopPropagation(); state.post = post.id; state.labLineView = false; state.labNode = { ...(state.labNode ?? {}), [post.id]: 'seats' }; render(); };
    return { max, lockTitle: k => `${labNodeName('seats')} ${t('dp.lvTag', { n: openLv(k) })}`, pick };
}
/** 영웅 칸 (ADR-0681 · ADR-0684 · ADR-0702) — 그 줄에 등록한 영웅의 얼굴(로스터 순서) + 열린 빈 칸 `+` + **안 열린 칸은 자물쇠**(늘 최대 칸 수만큼) ·
 *  얼굴 · `+` 를 누르면 **그 줄의** 등록 창 · 자물쇠를 누르면 「등록 칸」 지점(카드 고르기로 새지 않는다). 줄이 안 열렸으면 없다 */
function dpRegRow(post, line) {
    if (!line.open) return null;
    const row = el('div', 'dp-reg-row');
    const go = e => { e.stopPropagation(); state.labRegLine = post.id; openModal('labReg'); };
    for (const uid of line.seats.uids) {
        const h = G.heroes.find(x => x.uid === uid);
        const b = el('button', 'dp-reg-face', heroFace(h));
        b.title = L(h.name);
        b.onclick = go;
        row.appendChild(b);
    }
    for (let i = line.seats.uids.length; i < line.seats.cap; i++) {
        const add = el('button', 'dp-reg-face empty', '<span>+</span>');
        add.onclick = go;
        row.appendChild(add);
    }
    const S = dpSeatSlots(post, line);
    for (let k = line.seats.cap + 1; k <= S.max; k++) {
        const lock = el('button', 'dp-reg-face empty lock', lockIcon(true));
        lock.title = S.lockTitle(k);
        lock.onclick = S.pick;
        row.appendChild(lock);
    }
    return row;
}
/** 등록 창 머리 — 「{줄} — 영웅 등록」 · 함수 선언이라 위 `MODALS` 가 먼저 읽어도 된다 */
function labRegHead() { return helpHeading('h2', '', t('dp.reg.modal', { line: t(labRegPost().label) }), 'assignment'); }
/** 등록 창 속 — 로스터 카드(띠와 같은 얼굴 · 위칸 = 등록한 줄) · 이 줄의 카드 = 파란 겉 테두리. 클릭 = 등록 · 이 줄이면 해제 · 다른 줄이면 옮긴다 · 칸이 찼으면 `full` 플래시 */
function labRegBody() {
    const post = labRegPost();
    const grid = el('div', 'hero-strip lr-grid');
    for (const h of G.heroes) {
        const mine = SYS.game.labRegOf(G, h.uid) === post.id;
        const c = el('div', `hs-card${mine ? ' on' : ''}${h.tier === 'unique' ? ' unique' : ''}`);
        c.style.borderTopColor = tierColor(h);
        c.innerHTML = heroCardHtml(h, { doing: labDoing(h) });
        c.onclick = () => {
            const r = mine ? SYS.game.labUnregister(G, h.uid, now()) : SYS.game.labRegister(G, h.uid, post.id, now());
            if (r.err === 'locked') { const ln = SYS.game.labState(G, now()).lines.find(l => l.line === post.id); if (ln) flashDpNeed(ln, ln.nodes[0]); render(); return; }   // 안 열린 줄 (ADR-0699)
            if (!r.ok) { flash(`dp.err.${r.err}`); render(); return; }
            save();
            render();
        };
        grid.appendChild(c);
    }
    return grid;
}

/* ═══════════ 자원 미니게임 — 2026-10-16 전면 개편 ═══════════
   규칙·채점·보상은 game_logic. 화면은 활성 플레이 시간과 입력만 모은다. */
const MG_STEP_MS = 100;
const MG_TRUNK_SHOW = 6;
let mgRun = null;
// 판 하나 = 재료 하나 — 그 줄(채광 · 채집 · 벌목)의 재료(`lab_material.csv` · 2026-10-25 ADR-0788 — ~~고른 단계~~)
const mgMatOf = post => (D.labMaterials ?? []).find(m => m.post === post) ?? null;
const mgCur = () => {
    if (!G || !state.mg) return null;
    const mat = mgMatOf(state.mg.post);
    return mat ? { post: state.mg.post, mat } : null;
};
const mgItem = mat => L({ ko: mat.ko, en: mat.en });
const mgArt = (post, rare = false) => MG_SPRITES[post === 'mine' ? (rare ? 'rare' : 'ore') : post === 'gather' ? (rare ? 'herb_rare' : 'herb') : 'jack'];
function mgOpen(post) {
    if (mgRun?.phase !== 'play') mgRun = null;
    state.mg = { post };
    openModal('mg');
}
function mgHead() {
    const cur = mgCur();
    const wrap = el('div', 'mg-head');
    wrap.appendChild(helpHeading('h2', '', t('mg.title', { post: t(MG_POSTS.find(p => p.id === cur.post).label) }), 'minigame'));
    return wrap;
}
function mgBody() {
    const cur = mgCur(), field = el('div', `mg-field mg-${cur.post}`);
    field.dataset.mg = cur.post;
    field.style.setProperty('--mg-scene', `url("${new URL(MG_SCENES[cur.post], document.baseURI).href}")`);
    const run = mgRun?.post === cur.post ? mgRun : null;
    if (run?.phase === 'play') { mgBind(field, run); return field; }
    const res = run?.result, icon = M.materialIcon(cur.mat.id);
    field.classList.add('mg-cover');
    const card = el('div', 'mg-card', `<div class="mg-eyebrow">${t(res ? 'mg.finished' : 'mg.eyebrow')}</div>`
        + `<div class="mg-cover-art">${mgArt(cur.post, !!res && res.items > 0)}</div>`
        + `<h3>${res ? t('mg.result') : t(`mg.name.${cur.post}`)}</h3>`
        + (res ? `<div class="mg-got">${icon ? `<img src="${icon}" alt="">` : ''}<b>+${res.items}</b><span>${mgItem(cur.mat)}</span></div><div class="mg-sub">${t(`mg.why.${res.why}`)}</div><div class="mg-best">${t('mg.best', { n: res.best })}</div>`
            : `<div class="mg-sub">${t(`mg.hint.${cur.post}`)}</div><div class="mg-rule-badges"><span>${t(`mg.rule.${cur.post}`)}</span><span>${t('mg.direct')}</span></div>`));
    const go = el('button', 'btn mg-go', `${t(res ? 'mg.again' : 'mg.start')} <span aria-hidden="true">↗</span>`);
    go.onclick = () => mgStart(cur.post);
    card.appendChild(go);
    field.append(card, el('div', 'mg-reward-line', `${t('mg.reward')} <b>${mgItem(cur.mat)}</b>`));
    return field;
}
function mgStart(post) {
    const r = SYS.game.mgRound(G, post);
    // 막힌 판 = 연구소가 안 섰다(연구소 1랭크 — ADR-0699 의 문법) · 그 밖은 결과 코드 문구
    if (!r.ok) { if (r.err === 'locked') flashNeed('resource_tier', 1); else flash(`mg.err.${r.err}`); render(); return; }
    save();
    mgRun = { key: post, post, round: r.round, input: [], t: -2400, at: null, raf: 0, phase: 'play', snap: null, field: null, hold: null, result: null };
    render();
    mgRun.raf = requestAnimationFrame(mgFrame);
}
function mgActivePlant(run) {
    return run.round.plants.findIndex((p, i) => p.at <= run.t && run.t < p.at + p.life && !run.snap?.plants[i]);
}
function mgHoldStart(run, source) {
    if (run.phase !== 'play' || run.t < 0 || run.hold) return;
    const i = mgActivePlant(run);
    if (i < 0) return;
    if (run.round.plants[i].kind === 'bad') { run.input.push({ t: run.t, plant: i, held: 0 }); return; }
    run.hold = { plant: i, t: run.t, source };
}
function mgHoldEnd(run, source, cancel = false) {
    if (!run.hold || run.hold.source !== source) return;
    if (!cancel && run.phase === 'play') run.input.push({ t: run.t, plant: run.hold.plant, held: Math.max(0, run.t - run.hold.t) });
    run.hold = null;
}
function mgBind(field, run) {
    field.oncontextmenu = ev => ev.preventDefault();
    field.onpointerdown = ev => {
        if (ev.button !== 0 || run.phase !== 'play' || run.t < 0) return;
        if (run.round.kind === 'tap' && ev.target.closest('.mg-wall')) {
            ev.preventDefault();
            const cell = ev.target.closest('[data-cell]');
            run.input.push({ t: run.t, cell: cell ? Number(cell.dataset.cell) : -1 });
        }
        if (run.round.kind === 'pluck' && ev.target.closest('.mg-pluck-action')) {
            ev.preventDefault();
            field.setPointerCapture(ev.pointerId);
            mgHoldStart(run, ev.pointerId);
        }
        if (run.round.kind === 'chop' && ev.target.closest('.mg-chop-area, .mg-chop-control')) {
            ev.preventDefault();
            const box = field.getBoundingClientRect();
            mgChop(run, ev.clientX - box.left < box.width / 2 ? 'L' : 'R');
        }
    };
    field.onpointerup = ev => mgHoldEnd(run, ev.pointerId);
    field.onpointercancel = ev => mgHoldEnd(run, ev.pointerId, true);
    field.onlostpointercapture = ev => mgHoldEnd(run, ev.pointerId, true);
}
// 브라우저 밖에서 뗀 키·취소된 터치는 수확 입력으로 만들지 않는다.
window.addEventListener('blur', () => { if (mgRun) mgRun.hold = null; });
document.addEventListener('visibilitychange', () => {
    if (mgRun && document.hidden) { mgRun.hold = null; mgRun.at = null; }
});
const mgChop = (run, side) => { if (run.phase === 'play' && run.t >= 0) run.input.push({ t: run.t, side }); };
function mgKey(e, down) {
    const run = mgRun;
    if (run?.phase !== 'play' || state.modal !== 'mg') return;
    if (run.round.kind === 'pluck' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (down && !e.repeat) mgHoldStart(run, 'key');
        if (!down) mgHoldEnd(run, 'key');
        return;
    }
    const side = { ArrowLeft: 'L', ArrowRight: 'R', a: 'L', d: 'R', A: 'L', D: 'R' }[e.key];
    if (side && run.round.kind === 'chop') { e.preventDefault(); if (down && !e.repeat) mgChop(run, side); }
}
function mgFrame(ts) {
    const run = mgRun;
    if (!run || run.phase !== 'play') return;
    const field = document.querySelector('.mg-field');
    if (!field || state.modal !== 'mg' || field.dataset.mg !== run.key) { mgFinish(run, false); return; }
    const dt = run.at == null || document.hidden ? 0 : Math.min(MG_STEP_MS, Math.max(0, ts - run.at));
    run.at = document.hidden ? null : ts;
    run.t += dt;
    if (run.hold) {
        const h = run.hold, p = run.round.plants[h.plant];
        if (run.t >= p.at + p.life) run.hold = null;
        else if (run.t - h.t > p.power) mgHoldEnd(run, h.source);
    }
    const snap = SYS.game.mgJudge(run.round, run.input, Math.max(0, run.t));
    if (field !== run.field) mgBuild(field, run);
    mgDraw(field, run, snap);
    run.snap = snap;
    if (snap.over) { mgFinish(run, true); return; }
    run.raf = requestAnimationFrame(mgFrame);
}
function mgFinish(run, shown) {
    if (run.phase !== 'play') return;
    cancelAnimationFrame(run.raf);
    run.phase = 'done';
    run.hold = null;
    const res = SYS.game.mgClaim(G, run.input);
    if (res.ok) save();
    const items = res.ok ? res.items : 0;
    run.result = { items, best: run.snap?.best ?? 0, why: run.snap?.over ? run.snap.why : 'quit' };
    if (shown) { render(); return; }
    mgRun = null;
    const mat = mgMatOf(run.post);
    if (items > 0 && mat) flash('dp.watch.gain', { n: items, item: mgItem(mat) });
}
function mgBuild(field, run) {
    const r = run.round, icon = M.materialIcon(mgMatOf(run.post)?.id);
    run.field = field;
    field.innerHTML = `<div class="mg-hud"><div class="mg-hud-title"><small>${t(`mg.name.${run.post}`)}</small><span class="mg-lives"></span></div><div class="mg-combo"></div><div class="mg-items">${icon ? `<img src="${icon}" alt="">` : ''}<b>0</b><small>${t('mg.harvest')}</small></div><div class="mg-clock"></div></div><div class="mg-time"><b></b></div>`;
    if (r.kind === 'tap') {
        const wall = el('div', 'mg-wall');
        wall.style.gridTemplateColumns = `repeat(${r.cols}, 1fr)`;
        wall.style.gridTemplateRows = `repeat(${r.rows}, 1fr)`;
        for (let i = 0; i < r.cols * r.rows; i++) {
            const c = el('button', 'mg-cell');
            c.type = 'button'; c.dataset.cell = i;
            c.setAttribute('aria-label', t('mg.cell', { n: i + 1 }));
            wall.appendChild(c);
        }
        field.appendChild(wall);
    }
    if (r.kind === 'pluck') {
        field.appendChild(el('div', 'mg-pluck-stage', `<div class="mg-plant-halo"></div><button class="mg-pluck-action" type="button" aria-label="${t('mg.hold')}"><span class="mg-plant-art"></span></button><div class="mg-plant-label"></div><div class="mg-pull-panel"><div class="mg-pull-label"><span>${t('mg.power')}</span><b>${t('mg.hold')}</b></div><div class="mg-pull-track"><i class="mg-pull-zone"></i><i class="mg-pull-perfect"></i><b class="mg-pull-needle"></b></div><div class="mg-plant-life"><b></b></div></div>`));
    }
    if (r.kind === 'chop') {
        field.appendChild(el('div', 'mg-chop-area', '<div class="mg-tree"></div><div class="mg-jack L">' + MG_SPRITES.jack + '</div>'));
        for (const side of ['L', 'R']) field.appendChild(el('button', `mg-chop-control ${side}`, `<kbd>${side === 'L' ? '← / A' : 'D / →'}</kbd><span>${t(side === 'L' ? 'mg.left' : 'mg.right')}</span>`));
    }
    field.append(el('div', 'mg-instruction', t(`mg.controls.${run.post}`)), el('div', 'mg-fx'), el('div', 'mg-ready', '<b></b><span>' + t('mg.ready') + '</span>'));
}
const mgReplay = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
function mgPopAt(field, x, y, cls, text) {
    const f = el('span', `mg-pop ${cls}`, text);
    f.style.left = `${x * 100}%`; f.style.top = `${y * 100}%`;
    f.onanimationend = () => f.remove();
    field.querySelector('.mg-fx')?.appendChild(f);
}
const mgPop = (field, node, cls, text) => {
    const a = field.getBoundingClientRect(), b = node.getBoundingClientRect();
    mgPopAt(field, (b.left + b.width / 2 - a.left) / a.width, (b.top + b.height / 2 - a.top) / a.height, cls, text);
};
function mgDraw(field, run, snap) {
    const r = run.round, prev = run.snap;
    field.querySelector('.mg-lives').textContent = r.kind === 'tap' ? t('mg.onechance') : '♥ '.repeat(Math.max(0, snap.lives)) + '♡ '.repeat(Math.max(0, r.lives - snap.lives));
    field.querySelector('.mg-combo').innerHTML = snap.combo ? `<b>×${snap.mult.toFixed(1)}</b><small>${t('mg.comboCount', { n: snap.combo })}</small>` : `<small>${t('mg.comboWait')}</small>`;
    field.querySelector('.mg-items b').textContent = snap.items;
    const left = r.kind === 'chop' ? snap.bar : Math.max(0, 1 - Math.max(0, run.t) / r.ms);
    field.querySelector('.mg-time b').style.width = `${left * 100}%`;
    field.querySelector('.mg-clock').textContent = r.kind === 'chop' ? `${snap.cut} / ${r.segs.length}` : `${Math.ceil(Math.max(0, r.ms - Math.max(0, run.t)) / 1000)}s`;
    field.classList.toggle('mg-urgent', left < 0.2);
    const ready = field.querySelector('.mg-ready');
    ready.hidden = run.t >= 0;
    if (run.t < 0) ready.querySelector('b').textContent = Math.ceil(-run.t / 800);
    if (r.kind === 'tap') mgDrawTap(field, run, snap, prev);
    if (r.kind === 'pluck') mgDrawPluck(field, run, snap, prev);
    if (r.kind === 'chop') mgDrawChop(field, run, snap, prev);
}
function mgDrawTap(field, run, snap, prev) {
    const r = run.round, cells = field.querySelectorAll('.mg-cell'), live = new Map();
    r.spawns.forEach((s, i) => { if (!snap.spawns[i].done && s.at <= run.t && run.t < s.at + s.life) live.set(s.cell, i); });
    cells.forEach((c, k) => {
        const i = live.get(k), key = i == null ? '' : String(i);
        if (c.dataset.on !== key) {
            c.dataset.on = key;
            const s = i == null ? null : r.spawns[i];
            c.className = `mg-cell${s ? ` on ${s.kind}` : ''}`;
            c.innerHTML = s ? `<span class="mg-vein">${MG_SPRITES[s.kind === 'bad' ? 'hazard' : s.kind === 'rare' ? 'rare' : 'ore']}</span><span class="mg-target-tag">${t(`mg.target.${s.kind}`)}</span><i class="mg-left"></i>` : '<i class="mg-empty-mark"></i>';
            c.setAttribute('aria-label', s ? t(`mg.target.${s.kind}`) : t('mg.empty'));
        }
        if (i != null) c.style.setProperty('--left', 1 - (run.t - r.spawns[i].at) / r.spawns[i].life);
    });
    snap.spawns.forEach((x, i) => {
        if (!x.done || x.done === prev?.spawns[i].done) return;
        if (x.done === 'broke') {
            const cell = cells[r.spawns[i].cell];
            mgPop(field, cell, 'good', `+${r.spawns[i].kind === 'rare' ? r.score.rare : 1}`);
            mgReplay(cell, 'collected');
        }
    });
}
function mgDrawPluck(field, run, snap, prev) {
    const r = run.round, stage = field.querySelector('.mg-pluck-stage'), i = mgActivePlant({ ...run, snap }), p = r.plants[i];
    const key = String(i);
    if (stage.dataset.plant !== key) {
        stage.dataset.plant = key;
        stage.className = `mg-pluck-stage${p ? ` ${p.kind}` : ' waiting'}`;
        stage.querySelector('.mg-plant-art').innerHTML = p ? MG_SPRITES[p.kind === 'bad' ? 'poison' : p.kind === 'rare' ? 'herb_rare' : 'herb'] : '';
        stage.querySelector('.mg-plant-label').textContent = p ? t(`mg.plant.${p.kind}`) : t('mg.next');
        stage.querySelector('.mg-pluck-action').disabled = !p;
        if (p) for (const [cls, left, width] of [['.mg-pull-zone', p.from, p.to - p.from], ['.mg-pull-perfect', (p.from + p.to - r.perfect) / 2, r.perfect]]) {
            const zone = stage.querySelector(cls); zone.style.left = `${left * 100}%`; zone.style.width = `${width * 100}%`;
        }
    }
    const holding = !!run.hold && run.hold.plant === i;
    const power = holding && p ? Math.min(1, (run.t - run.hold.t) / p.power) : 0;
    stage.classList.toggle('holding', holding);
    stage.classList.toggle('sweet', !!p && power >= p.from && power <= p.to);
    stage.style.setProperty('--pull', power);
    stage.querySelector('.mg-pull-needle').style.left = `${power * 100}%`;
    stage.querySelector('.mg-pull-label b').textContent = p?.kind === 'bad' ? t('mg.leave') : holding ? t(power >= p.from && power <= p.to ? 'mg.release' : 'mg.keepHolding') : t('mg.hold');
    stage.querySelector('.mg-plant-life b').style.width = `${p ? Math.max(0, 1 - (run.t - p.at) / p.life) * 100 : 0}%`;
    snap.plants.forEach((x, k) => {
        if (!x || x === prev?.plants[k]) return;
        if (x === 'got' || x === 'perfect') mgPopAt(field, 0.5, 0.43, 'good', x === 'perfect' ? t('mg.perfect') : `+${r.plants[k].kind === 'rare' ? r.score.rare : 1}`);
        if (x === 'hit') { mgPopAt(field, 0.5, 0.43, 'bad', t('mg.failed')); mgReplay(field, 'shake'); }
    });
}
function mgDrawChop(field, run, snap, prev) {
    const r = run.round, tree = field.querySelector('.mg-tree'), key = `${snap.cut}:${snap.hit.length}`;
    if (tree.dataset.k !== key) {
        tree.dataset.k = key;
        const broke = new Set(snap.hit);
        tree.innerHTML = Array.from({ length: MG_TRUNK_SHOW }, (_, k) => {
            const i = snap.cut + k, s = r.segs[i];
            if (!s) return '<div class="mg-seg gone"></div>';
            const b = broke.has(i) ? null : s.b;
            return `<div class="mg-seg${s.rare ? ' rare' : ''}">${MG_SPRITES.trunk}${s.rare ? '<i class="mg-amber-knot">✦</i>' : ''}${b ? `<i class="mg-branch ${b}">${MG_SPRITES.branch}</i>` : ''}</div>`;
        }).join('');
    }
    const jack = field.querySelector('.mg-jack');
    jack.classList.toggle('L', snap.side === 'L'); jack.classList.toggle('R', snap.side === 'R');
    if (prev && snap.cut > prev.cut) { mgReplay(jack, 'swing'); mgPopAt(field, snap.side === 'L' ? 0.6 : 0.4, 0.75, 'good', `+${r.segs[snap.cut - 1].rare ? r.score.rare : 1}`); }
    if (prev && snap.hit.length > prev.hit.length) { mgPopAt(field, snap.side === 'L' ? 0.3 : 0.7, 0.65, 'bad', '−♥'); mgReplay(field, 'shake'); }
}


/* ═══════════ 탐험 — 지도 위 지점 아이콘 → 지점 패널 (SCREEN_DESIGN §8-4) ═══════════
   2026-09-04 사용자 지시 — 마을의 마지막 칸에서 자기 탭이 됐다. 가르는 것은 **인원**이다: 자원 탭은 1인 배치, 여기는 파티.

   **세계지도 한 장 + 잠긴 챕터 구간**(2026-10-08 · ADR-0537) 위에 **지점 아이콘**이 선다 [2026-10-09 사용자 지시 · ADR-0553] —
   열린 장마다 그림 속 동굴 · 폐허 · 마차 자리(`EXPLORE_REGIONS[장].spots`)에 원형 아이콘 · 테두리는 그 땅의 색(`ring`) · 지은 지점만(`built` — 마차 r3 · 폐허 r4 · ADR-0908).
   아이콘을 누르면 그 지점을 고르고 **아이콘 옆 지점 창**이 속을 편다(목록 → 고른 것의 속 · §4-1 과 같은 문법) · 보낼 영웅은 **위 영웅 띠**에서 고른다
      [같은 날 사용자 「맨 아래 카드를 없애고 지도를 키워」 · ADR-0558 — 지도 아래 패널을 걷었다].
   판정은 전부 `game.exploreState` · `exploreErr` 가 낸다 — 렌더러는 고르고 그리고 부르기만 한다 (ui 원칙 2).
   잠긴 장은 빛 바랜 막 + 자물쇠 + 한 줄(`chapterNeedText(n)` — 「1장 보스 클리어」 · ADR-0719)이고 아이콘이 안 선다 */
const exKey = (ch, spot) => `${ch}:${spot}`;
/** 지점 이름 · 두 줄 이야기 — 장마다 다르다(`explore_spot.csv` · ADR-0563). 표가 모든 장 × 지점을 덮는 것은 단정이 지킨다 */
const exSpotRow = (ch, spot) => D.exploreSpots?.[exKey(ch, spot)] ?? null;
const exSpotName = (ch, spot) => { const r = exSpotRow(ch, spot); return r ? L(r.name) : spot; };
/** 고른 지점 = 열린 창 — 안 골랐거나 고른 장이 닫혔으면 `null`(창 없이 지도만) [2026-10-10 사용자 「탐험 누르면 정해진 게 계속 켜진다」 · ADR-0585 — ~~가장 뒤의 열린 장의 동굴을 저절로 고른다~~] */
const exploreSel = S => (state.exSel && S.spots.find(s => s.open && s.built && s.chapter === state.exSel.chapter && s.spot === state.exSel.spot)) ?? null;

/** 지점 창 닫기 — 머리 ✕ · 지도의 빈 자리 클릭이 같이 쓴다 · **고른 것을 비운다**(아이콘을 누르면 다시 연다 · 세이브 아님 · ADR-0558 · ADR-0574 · ADR-0585) */
const exploreShut = () => { state.exSel = null; state.exArm = null; render(); };

function renderExplore(main) {
    const S = SYS.game.exploreState(G, now());
    const sel = exploreSel(S);
    // 박스 (ADR-0097) — 지도 칸이 남는 세로를 다 받고(.fill) 지도는 그 칸 안에서 제 비로 가장 크게 선다 · 영웅 띠는 제 높이 · 지점 창은 지도 위에 뜬다
    const page = el('div', 'page page-stack');
    // 영웅 띠 — 자원 탭과 같은 **보기 전용** 띠 [2026-10-09 · ADR-0556] · 보낼 사람은 지점 창의 편성이 정한다
    //   [2026-10-10 사용자 「탐험은 무조건 편성으로」 · ADR-0582 — ~~대기 지점에서 띠가 고르개가 된다~~(ADR-0558) 를 걷었다]
    page.appendChild(heroStrip(() => {}, { view: true }));
    const wrap = el('div', 'ex-map-wrap fill');
    const map = el('div', 'ex-map');
    const [w, h] = M.EXPLORE_WORLD_SIZE;
    map.style.backgroundImage = `url('${M.EXPLORE_WORLD_MAP}')`;
    map.style.setProperty('--ex-ar', w / h);
    // 지점 아이콘 — 열린 장 · 지은 지점만(마차 r3 · 폐허 r4 — ADR-0908) · 그림 속 자리 그대로 (§8-4)
    for (const s of S.spots) {
        const r = M.EXPLORE_REGIONS[s.chapter];
        if (s.open && s.built && r?.spots?.[s.spot]) map.appendChild(exploreSpotBtn(s, r, sel));
    }
    // 잠긴 구간 막 — 장마다 **미리 구운 「빛 바랜 땅」 조각 한 장**을 제자리(`tile`)에 얹는다(`scripts/build_explore_locked.py`).
    //   실행 중에 필터 · 마스크를 안 돌린다 [2026-10-09 실측 — 지도 전체에 거는 필터 + 1536×714 마스크 여러 장은 탭을 열 때마다 큰 층을 다시 구워 늦게 켜졌다 ·
    //   그 전엔 `backdrop-filter` 막이 아이콘이 빛날 때마다 다시 돌아 초당 10프레임 안팎]
    const locked = Object.keys(M.EXPLORE_REGIONS).map(Number).filter(ch => !SYS.game.chapterOpen(G, ch));
    for (const ch of locked) {
        const r = M.EXPLORE_REGIONS[ch];
        if (r.tile) {
            const [tx, ty, tw, th] = r.tile;
            const veil = el('img', 'ex-veil');
            veil.src = M.exploreLocked(ch);
            veil.alt = '';
            veil.draggable = false;
            Object.assign(veil.style, { left: `${tx}%`, top: `${ty}%`, width: `${tw}%`, height: `${th}%` });
            map.appendChild(veil);
        }
        const lock = el('div', 'ex-lock', `<span class="lock-ico">${lockIcon(true)}</span><span>${chapterNeedText(ch)}</span>`);
        lock.style.left = `${r.at[0]}%`;
        lock.style.top = `${r.at[1]}%`;
        map.appendChild(lock);
    }
    // 지점 창 — 고른 아이콘 바로 옆에 뜬다 · 고른 것이 없으면 안 선다 (ADR-0558 — 옛 지도 아래 패널을 대신한다 · ADR-0585)
    if (sel && M.EXPLORE_REGIONS[sel.chapter]?.spots?.[sel.spot]) {
        map.appendChild(explorePop(S, sel));
        /* 지도의 빈 자리 클릭도 닫는다 [2026-10-09 사용자 「X표가 아니라 밖에 배경클릭해도」 · ADR-0574] — 창 · 지점 아이콘 밖이면 바깥이다.
           위 영웅 띠는 지도 칸 밖이라 안 닫는다(보낼 영웅을 고르는 자리). 누른 자리 · 뗀 자리가 **둘 다** 바깥이어야 한다 — 창 레이어와 같은 드래그 가드 */
        const outside = e => !e.target.closest('.ex-pop, .ex-spot');
        let downOut = false;
        wrap.onpointerdown = e => { downOut = outside(e); };
        wrap.onclick = e => { if (downOut && outside(e)) exploreShut(); };
    }
    wrap.appendChild(map);
    page.appendChild(wrap);
    main.appendChild(page);
}

/**
 * 지점 아이콘 하나 — 그림 원판 + 땅 색 테두리(`--ring`). 상태가 테두리에 선다:
 * 나가 있으면 진행 막대(`--p` · conic) · 끝났으면 빛 + 「!」 · 산출이 없는 지점은 회색 · 고른 지점은 흰 겹테 (§8-4)
 */
function exploreSpotBtn(s, r, sel) {
    const on = !!sel && sel.chapter === s.chapter && sel.spot === s.spot;
    const st = !s.live ? ' pending' : s.out?.done ? ' done' : s.out ? ' out' : '';
    const b = el('button', `ex-spot${st}${on ? ' on' : ''}`, `<img src="${M.exploreIcon(s.spot)}" alt="" draggable="false" onerror="this.remove()">`);
    const [x, y] = r.spots[s.spot];
    b.style.left = `${x}%`;
    b.style.top = `${y}%`;
    b.style.setProperty('--ring', r.ring);
    if (s.out && !s.out.done) b.style.setProperty('--p', s.out.frac.toFixed(4));
    b.dataset.exspot = exKey(s.chapter, s.spot);
    b.setAttribute('aria-label', exSpotName(s.chapter, s.spot));
    b.onclick = () => {
        if (!on) { state.exSel = { chapter: s.chapter, spot: s.spot }; state.exArm = null; }   // 고르면 창이 열린다 · 닫힌 창도 아이콘으로 다시 연다
        render();
    };
    return b;
}

/**
 * 지점 창 — 고른 아이콘 바로 옆에 지도 위로 뜬다 [2026-10-09 사용자 「맨 아래 카드를 없애고 지도를 키워」 · ADR-0558 — 옛 지도 아래 패널을 대신한다].
 * 자리 = 아이콘 오른쪽(지도 오른쪽 40% 안의 아이콘이면 왼쪽) · 위아래는 지도 안. 머리(지점 · 땅 · ✕) + 상태 넷 중 하나 (§8-4)
 * **설명 글줄은 없다** — 소요 · 동시 n/m · 장비 n개 · 보낼 영웅 n/m 은 얼굴 · 빈 자리 · 장비 칸이 말하고 고정 규칙은 도움말이 든다 [같은 날 사용자 「장비 0개 같은 쓸데없는 설명 모두 제거」 · ADR-0560]
 */
function explorePop(S, sel) {
    const r = M.EXPLORE_REGIONS[sel.chapter];
    const [x, y] = r.spots[sel.spot];
    const pop = el('div', 'ex-pop');
    // 가로 = 아이콘 반폭(지도 폭의 2.1% — `.ex-spot`) + 틈 · 세로는 지도 밖으로 안 나가게 위 · 가운데 · 아래로 붙인다
    if (x > 60) pop.style.right = `${(100 - x + 3.2).toFixed(1)}%`; else pop.style.left = `${(x + 3.2).toFixed(1)}%`;
    if (y < 35) pop.style.top = `${Math.max(2, y - 8).toFixed(1)}%`;
    else if (y > 65) pop.style.bottom = `${Math.max(2, 100 - y - 8).toFixed(1)}%`;
    else { pop.style.top = `${y}%`; pop.classList.add('mid'); }
    const head = el('div', 'ex-head');
    head.innerHTML = `<span class="ex-head-ico" style="--ring:${r.ring}"><img src="${M.exploreIcon(sel.spot)}" alt="" onerror="this.remove()"></span>`
        + `<b class="ex-head-name">${exSpotName(sel.chapter, sel.spot)}</b>`;   // 지점 이름만 — 어느 땅인지는 아이콘 테두리 색 · 자리가 말한다 (ADR-0565)
    headingHelp(head.querySelector('.ex-head-name'), () => t('hint.explore'));
    // 닫기 = 창들과 같은 정사각 ×(`.modal-x` — 창마다 모양이 다르면 닫는 법을 다시 배운다)
    const shut = el('button', 'btn modal-x', '×');
    shut.title = t('ui.close');
    shut.setAttribute('aria-label', t('ui.close'));
    shut.onclick = exploreShut;
    head.appendChild(shut);
    pop.appendChild(head);
    // 두 줄 이야기 — 그 자리의 사연(값이 아니다 · 출정 창 「이야기」 칸과 같은 몫) · 상태와 무관하게 늘 같다 · 줄은 표가 끊는다(`\n` → `.ex-story` pre-line) (ADR-0563)
    const story = L(exSpotRow(sel.chapter, sel.spot)?.story);
    if (story) { const p = el('div', 'ex-story'); p.textContent = story; pop.appendChild(p); }
    const body = el('div', 'ex-body');
    pop.appendChild(body);
    if (!S.open) body.appendChild(el('div', 'ex-note muted', lockLine(needText('explore'))));
    else if (!sel.live) body.appendChild(el('div', 'ex-note muted', t('cn.pending')));
    else if (sel.out?.done) exploreDoneBody(body, sel);
    else if (sel.out) exploreOutBody(body, sel);
    else exploreIdleBody(body, S, sel);
    return pop;
}

/** 보낸 영웅 얼굴 줄 — 나가 있음 · 완료가 같이 쓴다 */
const exploreFaces = uids => el('div', 'ex-faces', uids.map(heroById).filter(Boolean)
    .map(h => `<span class="ex-face" style="border-color:${tierColor(h)}">${heroFace(h)}</span>`).join(''));

/**
 * 대기 — **편성 버튼 줄** + 고른 편성의 얼굴(파티 인원만큼 자리 · 편성 순서 그대로라 첫 자리가 리더 · 빈 자리 · **읽기 전용**)과 [출발] [2026-10-10 사용자 「탐험은 무조건 편성으로」 · ADR-0582].
 * 버튼 이름은 출정 창 편성 칸과 같다(`presetLabel` — 「원정 중」 · 「탐험 중」 꼬리표) · 고른 값은 편성 탭 · 출정 창과 하나다(`selectPreset`)
 */
function exploreIdleBody(body, S, sel) {
    const ps = SYS.game.presetState(G);
    const no = ps.activeNo;
    const pick = el('div', 'ex-squads');
    for (const p of ps.presets) {
        const b = el('button', `btn sm${p.no === no ? ' on' : ''}`, presetLabel(p.no, ps));
        b.onclick = () => { SYS.game.selectPreset(G, p.no); save(); render(); };
        pick.appendChild(b);
    }
    body.appendChild(pick);
    const party = S.squads[no - 1]?.party ?? [];
    const foot = el('div', 'ex-foot');
    const seats = el('div', 'ex-faces');
    for (let i = 0; i < S.partyMax; i++) {
        const h = heroById(party[i]);
        const seat = el('span', `ex-face${h ? '' : ' empty'}`, h ? heroFace(h) : '');
        if (h) seat.style.borderColor = tierColor(h);
        seats.appendChild(seat);
    }
    foot.appendChild(seats);
    const err = SYS.game.exploreErr(G, sel.chapter, sel.spot, no);
    // 못 보내면 흐리지만 눌리면 사유를 말한다(흐린 버튼 규약)
    const go = el('button', `btn primary ex-go${err ? ' dim' : ''}`, t('ex.go'));
    go.onclick = () => {
        const r = SYS.game.exploreSend(G, sel.chapter, sel.spot, no, now());
        if (!r.ok) { if (r.err === 'locked') flashChapterNeed(sel.chapter); else flashErr('ex', r.err, 'explore', { n: S.slots }); return; }   // 안 열린 장 = 그 장을 여는 앞 장 보스 (ADR-0719)
        flash('ex.sent', { spot: exSpotName(sel.chapter, sel.spot) });
        save();
        render();
    };
    foot.appendChild(go);
    body.appendChild(foot);
}

/**
 * 이야기 줄 — 그 안에서 일어나는 일 · 막마다 한 줄 · **열린 줄만** 위에서부터 쌓는다 [2026-10-10 사용자 「선술집 보내는 것처럼」 · ADR-0583].
 * 안 열린 줄의 자리를 미리 잡지 않는다(잡으면 이야기가 아니라 진행 막대가 된다 — 옛 수색 칸과 같은 이유) · 말투도 수색과 같다(`.tv-story`).
 * 문장은 i18n 이 아니라 `explore_story.csv` 에서 온다 — `beats[].text` 를 `L()` 로 풀 뿐이다. 열린 수(`data-n`)는 탐험 시계가 잰다
 */
function exploreLog(out, key) {
    const open = (out.beats ?? []).filter(b => b.open);
    const log = el('div', 'tv-story ex-log');
    for (const b of open) log.appendChild(el('p', '', L(b.text)));
    log.dataset.exlog = key;
    log.dataset.n = open.length;
    return log;
}

/** 나가 있음 — 보낸 영웅 · 진행 막대 · 남은 시간 · [불러들이기](두 번 누르기 — 결과 없이 돌아온다 · §3) · 그 아래 이야기 줄 (ADR-0583) */
function exploreOutBody(body, sel) {
    const key = exKey(sel.chapter, sel.spot);
    body.appendChild(exploreFaces(sel.out.heroes));
    const bar = el('div', 'ex-bar', '<i></i>');
    bar.firstChild.style.width = `${(sel.out.frac * 100).toFixed(1)}%`;
    bar.dataset.exbar = key;
    body.appendChild(bar);
    const foot = el('div', 'ex-foot');
    const leftTxt = el('span', 'ex-sub muted', t('ex.left', { t: fmtDuration(sel.out.remainMs) }));
    leftTxt.dataset.exleft = key;
    foot.appendChild(leftTxt);
    const armed = state.exArm === key;
    const stop = el('button', `btn ex-cancel${armed ? ' danger' : ''}`, t(armed ? 'ex.cancelConfirm' : 'ex.cancel'));
    stop.onclick = () => {
        if (!armed) { state.exArm = key; render(); return; }
        state.exArm = null;
        if (SYS.game.exploreDrop(G, sel.chapter, sel.spot).ok) { flash('ex.canceled'); save(); }
        render();
    };
    foot.appendChild(stop);
    body.appendChild(foot);
    body.appendChild(exploreLog(sel.out, key));
}

/** 완료 — 가져온 장비 칸(가방 칸과 같은 그림 · 올리면 아이템 툴팁) · [수령](보고 있는 인벤토리로) · 그 아래 이야기 줄 전부 (ADR-0583) */
function exploreDoneBody(body, sel) {
    const items = sel.out.items ?? [];
    const grid = el('div', 'inv-cells ex-loot');
    for (const it of items) {
        const cell = el('div', 'inv-cell filled');
        cell.style.borderColor = rarity(it.rarity).color;
        cell.innerHTML = `<span class="inv-icon">${itemImg(it)}</span><span class="inv-lv">${t('ch.itemLv', { n: it.ilvl })}</span>`;
        if (it.rarity === 'unique') cell.classList.add('shine');
        bindTip(cell, it);                 // 아직 가방에 없는 것 = 「이 아이템」(맥락 없음 — 상단 장비 칸과 같다)
        grid.appendChild(cell);
    }
    body.appendChild(grid);
    const foot = el('div', 'ex-foot');
    foot.appendChild(exploreFaces(sel.out.heroes));
    const take = el('button', 'btn primary ex-take', t('ex.take'));
    take.onclick = () => {
        const r = SYS.game.exploreTake(G, sel.chapter, sel.spot, now(), invNo());
        if (!r.ok) { flash(`ex.err.${r.err}`, { n: items.length }); return; }
        flash('ex.taken', { n: r.items.length });
        save();
        render();
    };
    foot.appendChild(take);
    body.appendChild(foot);
    body.appendChild(exploreLog(sel.out, exKey(sel.chapter, sel.spot)));
}

/** 탐험 시계 — 보이는 진행 막대 · 남은 시간 · 아이콘 테두리만 갈고, 탐험이 끝나는 순간 · **이야기 줄이 새로 열리는 순간**(ADR-0583) 다시 그린다(손이 바쁘면 다음 빈 눈금) (`tavernTick` 과 같은 장치) */
function exploreTick(at) {
    const S = SYS.game.exploreState(G, at);
    const out = new Map(S.spots.filter(s => s.out).map(s => [exKey(s.chapter, s.spot), s.out]));
    for (const n of document.querySelectorAll('[data-exspot].out')) {
        const o = out.get(n.dataset.exspot);
        if (!o || o.done) { if (handBusy()) clockRender = true; else render(); return; }
        n.style.setProperty('--p', o.frac.toFixed(4));
    }
    for (const n of document.querySelectorAll('[data-exbar]')) {
        const o = out.get(n.dataset.exbar);
        if (o) n.firstChild.style.width = `${(o.frac * 100).toFixed(1)}%`;
    }
    for (const n of document.querySelectorAll('[data-exleft]')) {
        const o = out.get(n.dataset.exleft);
        if (o) n.textContent = t('ex.left', { t: fmtDuration(o.remainMs) });
    }
    for (const n of document.querySelectorAll('[data-exlog]')) {
        const o = out.get(n.dataset.exlog);
        if (o && o.beats.filter(b => b.open).length !== Number(n.dataset.n)) { if (handBusy()) clockRender = true; else render(); return; }
    }
}

/* ═══════════ 선술집 탭 — 명단 · 고용 · 의뢰 게시판 (SCREEN_DESIGN §8-1) ═══════════
   2026-09-03 사용자 지시 — 마을의 첫 칸에서 자기 탭이 됐다. 09-01 「선술집을 접는 대가」(고용이 한 단계
   깊어진다)가 이 승격으로 청산됐다. 판정은 전부 game_logic 이 낸다 */
/** 무료 리롤까지 남은 시간 — 시:분:초 두 자리씩 · 앱 시계가 **이 글자만** 갈아 끼운다(`tavernTick`) */
function tavernWaitText(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const p = n => String(n).padStart(2, '0');
    return t('tv.reroll.wait', { t: `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` });
}
/** 선술집 시계 — 무료가 열리는 순간 다시 그리고(버튼이 무료로 바뀐다 · 손이 바쁘면 다음 빈 눈금), 그 밖에는 남은 시간 글자만 간다 (`shopTick` 과 같은 장치) */
/** 출정 창 적 구성의 무덤 명패 — 남은 시간 글자만 간다 · 보스가 돌아오는 순간 다시 그린다(초상으로 돌아온다 · 경고 줄이 걷힌다) (ADR-0590).
 *  관전 카드의 명패는 결과 띠의 세기가 간다 — 여기는 적 칸(`.foe-cell.grave`)만 본다 */
function respawnTick(at) {
    for (const n of document.querySelectorAll('.foe-cell.grave [data-respawn]')) {
        const left = Number(n.dataset.respawn) - at;
        if (left <= 0) { if (handBusy()) clockRender = true; else render(); return; }
        const s = graveLeftText(left), g = n.querySelector('.grave-left');
        if (g && g.textContent !== s) g.textContent = s;
    }
}

function tavernTick(at) {
    // 수색 — 다음 도착까지 남은 시간 글자만 간다. 도착은 앱 시계의 `visitSettle` 이 세우고 다시 그린다 (SCREEN_DESIGN §8-1 · ADR-0671)
    for (const n of document.querySelectorAll('[data-visitnext]')) {
        const s = visitNextText(Number(n.dataset.visitnext) - at);
        if (n.textContent !== s) n.textContent = s;
    }
    // 무료 시각은 리롤로만 바뀌고 리롤은 다시 그린다 — 그린 순간 받아 둔 값을 쓴다(`tavernState` 는 명단을 굴려 눈금마다 부르기엔 무겁다)
    const { freeAt, free } = state.tavernShown ?? {};
    if (freeAt == null) return;
    if ((at >= freeAt) !== free) { if (handBusy()) clockRender = true; else render(); return; }
    const txt = tavernWaitText(freeAt - at);
    for (const n of document.querySelectorAll('.tv-wait')) if (n.textContent !== txt) n.textContent = txt;
}

/* ═══ 수색 — 명단 셋째 칸(안내 · 고른 얼굴의 카드) + 오른쪽 열 2×2 (SCREEN_DESIGN §8-1 · ADR-0671 · base_expedition §2-4) ═══
   판정은 전부 `game.visitState` · `joinState` · `joinHire` · `joinDrop` 이 낸다 — 화면은 안내 · 초상 · 출처를 그리고 카드를 켜고 끌 뿐이다.
   출처(시간 · 마차)를 가리지 않고 같은 길로 고른다 — 마차에서 오는 길(탐험 마차의 승리)은 아직 없다(`?dev=join` 이 채운다) */
/** 다음 도착까지 — 시:분:초 두 자리씩(`tavernWaitText` 와 같은 모양) · 앱 시계가 **이 글자만** 갈아 끼운다(`tavernTick`) */
function visitNextText(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const p = n => String(n).padStart(2, '0');
    return t('tv.visit.next', { t: `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` });
}
/** 얼굴이 스며 나오는 시간 (ms) — `.tv-join-slot.fresh` 의 애니메이션 길이와 같다 */
const JOIN_FRESH_MS = 900;
/** 이보다 먼저 와 있던 얼굴은 처음 그려도 스며 나오지 않는다 (ms) — 꺼져 있던 동안 · 탭 밖에서 온 사람. 앱 시계 눈금(1초)보다 넉넉하다 */
const JOIN_FRESH_WINDOW_MS = 5000;
/**
 * 수색 패널의 칸 — 열린 칸 `slots` 개(찬 칸 = 초상 + 출처 띠 · 빈 칸 = 점선) 뒤에 안 열린 칸(`locked` — 자물쇠) · 도착 순 (ADR-0671 · ADR-0976 · ADR-0978 — 제목은 패널 머리).
 * 얼굴을 누르면 셋째 칸이 그 영웅의 카드가 됐다 돌아왔다 한다(켜진 동안 `.on` · 줄 번호로 가른다).
 * **막 온 얼굴만 처음 보일 때 한 번** 스며 나온다: 처음 본 시각을 받아 두고 흐른 만큼 애니메이션을 당겨(음수 지연) 다시 그려도 되풀이하지 않는다
 */
function joinColumn(J) {
    const col = el('div', 'tv-join');
    const grid = el('div', 'tv-join-grid');
    for (const j of J.list) {
        const shown = state.joinCard === j.no;
        const b = el('button', `tv-join-slot${shown ? ' on' : ''}`, `${heroFace(j.hero)}<span class="tv-join-left">${t(`tv.visit.src.${j.src}`)}</span>`);
        b.style.borderColor = tierColor(j.hero);
        b.title = L(j.hero.name);
        state.joinSeen[j.no] ??= now() - j.arrivedAt > JOIN_FRESH_WINDOW_MS ? 0 : now();
        const age = now() - state.joinSeen[j.no];
        if (age < JOIN_FRESH_MS) { b.classList.add('fresh'); b.style.animationDelay = `${-age}ms`; }
        b.onclick = () => { state.joinCard = shown ? null : j.no; render(); };
        grid.appendChild(b);
    }
    for (let i = grid.childElementCount; i < J.slots; i++) grid.appendChild(el('div', 'tv-join-slot empty'));
    // 안 열린 칸 — 점선 칸 가운데 자물쇠만 · 누르지 않는다 (SCREEN_DESIGN §8-1 · ADR-0976 · ADR-0978)
    for (let i = 0; i < J.locked.length; i++) grid.appendChild(el('div', 'tv-join-slot locked', `<span class="lock-ico">${lockIcon(true)}</span>`));
    col.appendChild(grid);
    return col;
}
/**
 * 수색 패널 첫 칸 — **안내**(얼굴을 안 켰을 때) · 후보 카드와 같은 크기(숨긴 카드 위에 선다 — `renderTavern`)라 윗줄이 안 흔들린다.
 * 사양(n시간마다 한 명 · 칸 m) + 레어 확률 + 상태 한 줄(제목은 패널 머리 · ADR-0981): 흐르는 중 = 다음 도착까지(`data-visitnext` — 앱 시계가 글자만 간다) ·
 * 칸이 다 차 멈춤 = 그 사실 + 멈춘 남은 시간 · 줄이 닫혔다 = 「연구소에서 연다」 · 연구소 전 = 지을 랭크 한 줄. 값은 전부 `visitState` 가 낸다
 */
function visitCell(V) {
    const c = el('div', 'ng-card tv-visit');
    c.appendChild(el('div', 'tv-visit-spec muted', t('tv.visit.spec', { h: V.hours, n: V.slots })));
    // 수색 줄이 닫혔다 — 연구소가 섰으면 선술집 영웅 고용을 기다린다(2026-10-30) · 아니면 연구소
    if (!V.labOpen) { c.appendChild(el('div', 'tv-visit-state muted', lockLine(SYS.game.limitsOf(G).resourceTiers >= 1 ? needText('hire') : needText('resource_tier', 1)))); return c; }
    if (!V.open) { c.appendChild(el('div', 'tv-visit-state muted', t('tv.visit.closed'))); return c; }
    c.appendChild(el('div', 'tv-visit-odds', t('tv.visit.odds', { r: M.pctNum(V.rarePct) })));
    if (V.paused) {
        // 칸이 다 차 시계가 멈췄다 — 돌려보내거나 고용하면 그때부터 이 남은 시간 뒤에 온다 (기획 §2-4)
        c.appendChild(el('div', 'tv-visit-state warn', t('tv.visit.full')));
        c.appendChild(el('div', 'tv-visit-next muted', visitNextText(V.remainMs)));
        return c;
    }
    const next = el('div', 'tv-visit-next', visitNextText(V.remainMs));
    next.dataset.visitnext = V.nextAt;
    c.appendChild(next);
    return c;
}
/**
 * 수색 패널 첫 칸 — **고른 얼굴의 카드**: 명단과 같은 후보 카드 + [고용](명단과 같은 값) · [돌려보내기]가 한 줄 (ADR-0624 모양 · ADR-0671 — 출처 무관).
 * 고용이 안 열렸으면 패널 본문이 잠김 베일이라 여기까지 손이 안 닿는다 (ADR-0953) · 버튼은 **그 줄에만** 걸린다(줄 번호로 집는다)
 */
function joinCardBox(J, j) {
    const card = candidateCard(j.hero, `<div class="tv-res-btns">
        <button class="btn primary sm b-take"${J.err ? ' disabled' : ''}>${t('tv.hire', { g: J.cost.toLocaleString() })}</button>
        <button class="btn sm b-drop">${t('tv.visit.drop')}</button>
    </div>`);
    card.classList.add('tv-join-card');
    card.querySelector('.b-take').onclick = () => {
        const r = SYS.game.joinHire(G, j.no, now());
        if (r.ok) { flash('tv.hired', { name: L(r.hero.name) }); state.joinCard = null; save(); }
        else flash({ roster: 'tv.err.roster', gold: 'tv.err.gold' }[r.err] ?? 'tv.visit.gone', { cap: SYS.game.limitsOf(G).roster });
        render();
    };
    card.querySelector('.b-drop').onclick = () => {
        const name = L(j.hero.name);
        if (SYS.game.joinDrop(G, j.no, now()).ok) { flash('tv.visit.dropped', { name }); state.joinCard = null; save(); }
        render();
    };
    return card;
}
function renderTavern(main) {
    const B = D.balance;
    const full = G.heroes.length >= SYS.game.limitsOf(G).roster;
    // 줄 둘이 위아래로 쌓인다 — 윗줄 영웅 고용 | 수색(제 높이) · 아랫줄 의뢰 | 도박장(남는 세로) (SCREEN_DESIGN §2 박스 규격 · ADR-0248 · ADR-0978)
    const page = el('div', 'page page-stack c-tavern');
    const top = el('div', 'tv-top');
    const p = el('div', 'panel tv-hire');
    p.appendChild(helpHeading('h2', '', t('tv.h'), 'recruit'));
    // 박스 (ADR-0097) — 제목은 서 있고 명단 · 도구가 본문으로 스크롤한다(박스가 모자랄 때만 — 의뢰는 안 줄어든다)
    const body = el('div', 'box-body');
    body.dataset.keep = 'tavern';
    p.appendChild(body);

    // 명단 판정은 전부 game_logic 이 낸다 (SCREEN_DESIGN §8) — 화면은 빈 칸과 쿨다운을 그리기만 한다
    const T = SYS.game.tavernState(G, now());
    // 수색 칸 — 셋째 칸 · 오른쪽 열이 그리고, 후보 카드의 [보관]이 칸이 찼나를 본다 (ADR-0897)
    const V = SYS.game.visitState(G, now());
    const J = SYS.game.joinState(G, now());
    const joinFull = J.list.length >= J.slots;
    // 후보 카드 바닥 줄 — [고용] · [보관] 한 줄 (수색 카드의 [고용] · [돌려보내기]와 같은 줄 모양 · ADR-0897)
    const candBtns = (hireAttr = '', keepAttr = '') => `<div class="tv-res-btns">
        <button class="btn primary sm b-hire"${hireAttr}>${t('tv.hire', { g: B.tavern_hire_cost.toLocaleString() })}</button>
        <button class="btn sm b-keep"${keepAttr}>${t('tv.keep')}</button>
    </div>`;
    const grid = el('div', 'tv-cands');
    T.candidates.forEach((c, i) => {
        // 고용한 칸은 빈 채로 남는다 — 다음 리롤에 채워진다 (base_expedition_design §2-4)
        //   빈 칸은 **후보 카드와 같은 높이**다 — 카드 한 장을 숨긴 채 깔아 자리를 잡는다. 글자 높이로 두면 후보가 다 고용됐을 때
        //   줄 높이를 수색 칸이 정해 영웅 고용 패널이 줄고 의뢰 줄이 늘어난다 (SCREEN_DESIGN §8-1). 로스터가 비면 깔 카드가 없다
        if (!c) {
            const ghost = G.heroes[0];
            const cell = ghost ? candidateCard(ghost, candBtns()) : el('div', 'ng-card');
            cell.classList.add('tv-empty');
            cell.style.borderTopColor = '';
            cell.appendChild(el('div', 'tv-empty-l', t(T.kept.includes(i) ? 'tv.empty.kept' : 'tv.empty')));   // 보관한 칸은 「보관함」 (ADR-0897)
            grid.appendChild(cell);
            return;
        }
        const card = candidateCard(c, candBtns(full || G.resources.gold < B.tavern_hire_cost ? ' disabled' : '', joinFull ? ' disabled' : ''));
        card.querySelector('.b-hire').onclick = () => {
            const r = SYS.game.hire(G, i);
            if (r.ok) { flash('tv.hired', { name: L(r.hero.name) }); save(); }
            else flash(r.err === 'roster' ? 'tv.err.roster' : 'tv.err.gold', { cap: SYS.game.limitsOf(G).roster });
            render();
        };
        // 보관 — 그 후보를 수색 칸 끝에 넣는다 · 무료 · 칸이 차면 거절 (game.tavernKeep · ADR-0897)
        card.querySelector('.b-keep').onclick = () => {
            const r = SYS.game.tavernKeep(G, i, now());
            if (r.ok) { flash('tv.kept', { name: L(c.name) }); save(); }
            else flash(r.err === 'full' ? 'tv.err.joinFull' : 'tv.visit.gone', { n: J.slots });
            render();
        };
        grid.appendChild(card);
    });
    const row = el('div', 'tv-row');
    row.appendChild(grid);
    body.appendChild(row);

    const tools = el('div', 'tv-tools');
    const rr = el('button', 'btn', T.free
        ? t('tv.reroll.free')
        : t('tv.reroll', { g: T.cost.toLocaleString() }));
    rr.disabled = !T.free && G.resources.gold < T.cost;
    rr.onclick = () => {
        const r = SYS.game.tavernReroll(G, now()); if (!r.ok) flash('tv.err.gold'); else save(); render();
    };
    tools.appendChild(rr);
    // 무료까지 남은 시간 — 버튼 오른쪽에 따로 선다 · 앱 시계가 1초마다 글자만 간다(`tavernTick`) (SCREEN_DESIGN §8-1 · 2026-09-30)
    if (!T.free) tools.appendChild(el('span', 'tv-wait', tavernWaitText(T.freeAt - now())));
    state.tavernShown = { freeAt: T.freeAt, free: T.free };
    body.appendChild(tools);
    // 고용이 안 열렸으면(선술집 랭크 · `hire`) 본문을 잠김 베일로 덮는다 — 제목은 베일 밖 · 뒤의 명단 · 수색은 그대로 서 높이가 안 바뀐다 (§8-1 · §13-1 · ADR-0953)
    if (!T.open) { body.classList.add('lock-host'); body.appendChild(lockVeil('hire')); }
    top.appendChild(p);

    // 수색 — 영웅 고용 옆에 따로 선 패널 · 칸 크기 = 명단 초상(같은 식 · `.tv-top` 의 `--tv-face`) · 고용이 안 열렸으면 본문을 잠김 베일 (SCREEN_DESIGN §8-1 · ADR-0978)
    const sp = el('div', 'panel tv-search');
    sp.appendChild(helpHeading('h2', '', t('tv.visit.h'), 'visitors'));
    const sBody = el('div', 'box-body');
    // 첫 칸 — 얼굴을 켰으면 그 영웅의 카드 · 아니면 안내(켠 줄이 고용 · 돌려보내기로 사라졌으면 안내로) · 오른쪽 = 얼굴 칸 (§8-1 · ADR-0671 · ADR-0981)
    const picked = J.list.find(j => j.no === state.joinCard) ?? null;
    if (!picked) state.joinCard = null;
    const sRow = el('div', 'tv-search-row');
    const sCell = el('div', 'tv-search-cell');
    // 안내는 후보 카드와 같은 높이 — 숨긴 후보 카드 한 장이 자리를 잡고 안내가 그 위에 선다(명단 빈 칸과 같은 수) · 로스터가 비면 깔 카드가 없다
    if (!picked && G.heroes[0]) { const ghost = candidateCard(G.heroes[0], candBtns()); ghost.classList.add('tv-ghost'); sCell.appendChild(ghost); }
    sCell.appendChild(picked ? joinCardBox(J, picked) : visitCell(V));
    sRow.appendChild(sCell);
    sRow.appendChild(joinColumn(J));
    sBody.appendChild(sRow);
    if (!T.open) { sBody.classList.add('lock-host'); sBody.appendChild(lockVeil('hire')); }
    sp.appendChild(sBody);
    top.appendChild(sp);
    page.appendChild(top);

    /* 의뢰 게시판 — **영웅 고용 아래 따로 선 패널**이다 (SCREEN_DESIGN §8-1 · 규격은 §14 · ADR-0248).
       후보 카드와 다른 일이라 같은 패널에 두면 영입의 한 칸으로 읽힌다(명단 격자 밖에 두던 이유를 패널 단위로 민 것).
       제목은 옛 탭 라벨(`nav.commission`)이 패널 제목으로 내려온 것뿐이라 문구를 새로 쓰지 않는다.
       **아랫줄은 의뢰 | 도박장 나란히** [2026-09-24 사용자 지시 · ADR-0322] — 게시판은 `commission_board_cards` 자리다.
       **그릴 때 채운다** — 빈 자리만 굴리고(차 있으면 아무것도 안 바뀐다) 굴렸으면 저장한다. 판정은 전부 `commissionState` (§14 · ADR-0352) */
    const low = el('div', 'tv-low');
    const cm = el('div', 'panel tv-cm');
    if (SYS.game.commissionFill(G).rolled) save();
    const CS = SYS.game.commissionState(G);
    cm.appendChild(helpHeading('h2', '', `${t('nav.commission')} <small class="cm-slots">${t('cm.slots', { n: CS.taken, max: CS.slots })}</small>`, 'commissions'));
    // 몸 = 명성 막대 한 줄 + 게시판 — 안 열렸으면 둘 다 잠김 베일 아래 (§14 · §13-1 · ADR-0958)
    const cmBody = el('div', `cm-body${CS.open ? '' : ' lock-host'}`);
    // 명성 — 「명성 Lv n」 · 막대 가운데에 이번 레벨 기준 「센 수 / 드는 수」(막대와 같은 비율 — 누적에서 그 레벨 문턱을 뺀다) · 최고면 가득 · 「최고」 (§14 · ADR-0958 · ADR-0961 · R375)
    const F = CS.fame;
    const fameN = F.max ? null : { n: F.xp - F.total, need: F.next - F.total };
    const famePct = fameN ? Math.max(0, Math.min(100, fameN.n / fameN.need * 100)) : 100;
    cmBody.appendChild(el('div', 'cm-fame', `<span class="cm-fame-lv">${t('cm.fameLv', { lv: F.level })}</span>`
        + `<div class="bar xp"><i style="width:${famePct}%"></i>`
        + `<span class="cm-fame-n">${fameN ? `${fameN.n.toLocaleString()} / ${fameN.need.toLocaleString()}` : t('cm.fameMax')}</span></div>`));
    const board = el('div', 'cm-board');
    for (const c of CS.cards) board.appendChild(commissionCard(c, CS));
    // 안 열렸으면 빈 카드 틀을 깔고 그 위에 잠김 베일 (§14 · §13-1)
    if (!CS.open) {
        for (let i = CS.cards.length; i < D.balance.commission_board_cards; i++) board.appendChild(el('div', 'cm-card ghost'));
        cmBody.appendChild(lockVeil('commission_board'));
    }
    cmBody.appendChild(board);
    cm.appendChild(cmBody);
    low.appendChild(cm);
    low.appendChild(gamblePanel());
    page.appendChild(low);

    main.appendChild(page);
}

/* ═══ 도박장 — 3×3 슬롯 (SCREEN_DESIGN §8-1 · ADR-0322 자리 · ADR-0331 슬롯) ═══
   **판정은 하나도 안 한다** — 판 · 홀드 · 지급은 `gambleSpin` 이 누르는 순간 다 정하고 저장한다. 여기는 그 결과를 **재생**할 뿐이다:
   릴마다 한 줄 띠가 흘러 왼쪽부터 멈춤(띠의 끝이 결과 · ADR-0333) → 멈춘 판(맞은 라인이 밝아진다) → 홀드면 리스핀 한 걸음씩 → 결과 줄.
   재생 도중 창을 닫아도 결과는 이미 들어가 있다. 재생 상태는 `state.gb` 하나다(세이브 아님) */

/** 재생 박자 — 연출 전용이라 결과를 안 바꾼다. 첫 릴이 도는 시간 · 다음 릴마다 더 도는 시간 · 마지막 릴이 멈춘 뒤 숨 · 리스핀 한 걸음 (ms) */
const GB_REEL_MS = 1000, GB_REEL_STAGGER_MS = 380, GB_SETTLE_MS = 150, GB_STEP_MS = 450;
/** 띠의 채움 칸 수 — 첫 릴 · 다음 릴마다 더하는 칸(뒤 릴일수록 길게 돈다 — 속도는 비슷하다) */
const GB_FILL = 16, GB_FILL_STEP = 7;
const gbReelMs = reel => GB_REEL_MS + reel * GB_REEL_STAGGER_MS;
let gbAnimSeq = 0;

/**
 * 도박장 칸 (SCREEN_DESIGN §8-1 · ADR-0322) — 의뢰 오른쪽에 따로 선 패널 하나. 할 일은 창(`MODALS.gamble`)이 든다.
 * 가운데 심볼 일곱(= 죄종 일곱) 띠 · 바닥 버튼 위에 「한 판 n G부터」(가장 낮은 판돈 · ADR-0334 — 의뢰 카드의 보상 줄과 같은 자리 · ADR-0601).
 * 안 열렸어도 칸은 열린 모양 그대로 서고 잠김 베일(`lockVeil`)이 덮는다
 */
function gamblePanel() {
    const S = SYS.game.gambleState(G, state.gb.step);
    const p = el('div', 'panel tv-gb');
    p.appendChild(helpHeading('h2', '', t('gb.h'), 'gamble'));
    // 안 열렸어도 칸은 열린 모양 그대로 그리고 그 위에 잠김 베일을 덮는다 (§8-1 · §13-1)
    const cell = el('div', `gb-cell${S.open ? '' : ' lock-host'}`);
    cell.appendChild(el('div', 'gb-sins', SYS.gamble.symbols.map(s => `<span class="gb-art">${M.gambleArt(s.id)}</span>`).join('')));
    cell.appendChild(el('div', 'gb-from', t('gb.from', { g: `<b class="gb-gold">${S.stakes[0].gold.toLocaleString()}</b>` })));
    const b = el('button', 'btn sm gb-go', t('gb.enter'));
    b.onclick = () => openModal('gamble');
    cell.appendChild(b);
    if (!S.open) cell.appendChild(lockVeil('gamble'));
    p.appendChild(cell);
    return p;
}

/** 거절 코드 → 플래시 — 안 열린 것은 「무엇을 지어야 하나」, 골드는 판돈과 함께 (INTERFACE §3) */
function gambleErr(err, S) {
    if (err === 'unbuilt') return flashNeed('gamble');
    if (err === 'locked') return flashNeed('gambleStakes', S.stakes.findIndex(s => s.step === S.step) + 1 - D.balance.gamble_stake_steps);
    if (err === 'gold') return flash('gb.err.gold', { g: S.stake.toLocaleString() });
}

/** [스핀] · [n판 돌리기] — 로직이 먼저 다 정하고 저장한다. 한 판이면 재생하고, n판 돌리기는 합계만 보인다(연출 없음 · ADR-0331 · ADR-0334) */
function gambleGo(all) {
    if (state.gb.anim) return;   // 재생 중 — 다음 판은 멈춘 뒤에
    const S = SYS.game.gambleState(G, state.gb.step);
    const r = all ? SYS.game.gambleSpinBatch(G, S.step) : SYS.game.gambleSpin(G, S.step);
    if (!r.ok) { gambleErr(r.err, S); render(); return; }
    save();
    if (all) { state.gb.last = { kind: 'all', ...r }; render(); return; }
    state.gb.last = { kind: 'one', spin: r.spin };
    gamblePlay();
}

/** 재생 — 도는 판 → 멈춘 판 → (홀드면) 리스핀 한 걸음씩. 창을 닫으면 멈춘다(결과는 이미 들어가 있다) */
function gamblePlay() {
    const id = ++gbAnimSeq;
    const steps = state.gb.last.spin.hold?.steps.length ?? 0;
    const later = (fn, ms) => setTimeout(() => {
        if (state.gb.anim?.id !== id) return;
        if (state.modal !== 'gamble') { state.gb.anim = null; return; }
        fn();
    }, ms);
    const hold = k => {
        state.gb.anim = k >= steps ? null : { id, phase: 'hold', k: k + 1 };
        render();
        if (state.gb.anim) later(() => hold(k + 1), GB_STEP_MS);
    };
    // `t0` — 도는 도중에 다시 그려져도 흐른 시간만큼 이어서 돌게(음수 지연 · ADR-0333)
    state.gb.anim = { id, phase: 'spin', t0: now() };
    render();
    later(() => {
        // 멈춘 판을 먼저 보인다 — 홀드면 선 코인이 보인 뒤에 리스핀이 돈다
        state.gb.anim = steps ? { id, phase: 'stop' } : null;
        render();
        if (steps) later(() => hold(0), GB_STEP_MS * 2);
    }, gbReelMs(SYS.gamble.reels - 1) + GB_SETTLE_MS);
}

/** 보여 줄 판 — 한 판이면 그 판 · n판 돌리기면 마지막 판 */
const gbShown = () => { const L0 = state.gb.last; return !L0 ? null : L0.kind === 'one' ? L0.spin : L0.spins[L0.spins.length - 1]; };

/** 한 판에서 **받은** 잭팟 id — 홀드 앤 스핀에 붙은 잭팟 코인(붙은 수만큼) + 판이 다 차면 그 행.
 *  홀드가 안 선 판의 코인은 값을 버리므로(`gamble.js` `spin`) 판에 잭팟 코인이 서 있어도 없다 (ADR-0609) */
function gbJackpotsOf(sp) {
    const GB = SYS.gamble;
    if (!sp?.hold) return [];
    const isJp = id => GB.coins.find(c => c.id === id)?.kind === 'jackpot';
    return [...sp.hold.held.filter(id => id && isJp(id)), ...(sp.hold.full ? [GB.fill] : [])];
}

/** 받은 잭팟 → 표지 조각 — 잭팟 띠 순서 · 같은 것이 둘 이상이면 「이름 ×n」 (§8-1 「계기판」 · ADR-0609) */
const gbJackpotTags = ids => SYS.gamble.coins.filter(c => c.kind === 'jackpot')
    .map(c => ({ c, n: ids.filter(id => id === c.id).length })).filter(x => x.n)
    .map(({ c, n }) => n > 1 ? t('gb.jpN', { name: L(c.name), n }) : L(c.name));

/** 심볼 칸의 속 — **그림만** (이름은 배당표가 든다 · ADR-0601) */
const gbSymHtml = s => `<span class="gb-art">${M.gambleArt(s.id)}</span>`;

/** 결과 칸 하나의 모양 — `{cls, html}`. 멈춘 판과 도는 띠의 끝이 **같은 칸**을 그려야 멈추는 순간 그림이 안 튄다 (ADR-0333).
 *  코인 칸만 글을 든다 — 값(골드) · 잭팟이면 그 위에 이름 */
function gbCell(spin, i, held) {
    const GB = SYS.gamble;
    const coinId = held ? held[i] : spin.coinAt[i];
    if (coinId) {
        const coin = GB.coins.find(c => c.id === coinId);
        return {
            cls: ['coin', `k-${coin.kind}`],
            html: `<span class="gb-art">${M.gambleArt(coin.kind === 'jackpot' ? 'jackpot' : 'coin')}</span>${coin.name ? `<span class="gb-cname">${L(coin.name)}</span>` : ''}<span class="gb-cval">${(spin.coinGold[coinId] ?? 0).toLocaleString()} G</span>`,
        };
    }
    const s = GB.symbols.find(x => x.id === spin.cells[i]);
    return { cls: [`s-${s.id}`], html: gbSymHtml(s) };
}

/**
 * 도는 릴 하나 — **한 줄 띠**가 아래로 흐르다 멈춘다 (ADR-0333). 띠 = [결과 칸(행 수) · 채움 칸] 위에서 아래 순이고,
 * 채움 끝을 창에 걸고 시작해 결과 칸이 창에 닿으면 멈춘다 — **멈추는 곳이 결과**다. 채움은 심볼 표를 도는 **고정 순서**(난수 없음).
 * 뒤 릴일수록 띠가 길고 오래 돈다(왼쪽부터 멈춘다). `--delay` 는 흐른 시간 — 도는 도중에 다시 그려져도 이어서 돈다
 */
function gbReel(spin, reel, elapsed) {
    const GB = SYS.gamble;
    const fill = GB_FILL + reel * GB_FILL_STEP;
    const cells = [];
    for (let row = 0; row < GB.rows; row++) {
        const c = gbCell(spin, reel * GB.rows + row, null);
        cells.push(`<div class="gb-c ${c.cls.join(' ')}">${c.html}</div>`);
    }
    for (let k = 0; k < fill; k++) {
        const s = GB.symbols[(k * 3 + reel * 2 + 1) % GB.symbols.length];
        cells.push(`<div class="gb-c s-${s.id}">${gbSymHtml(s)}</div>`);
    }
    const col = el('div', 'gb-reel', `<div class="gb-reel-strip">${cells.join('')}</div>`);
    col.style.gridColumn = reel + 1;
    col.style.gridRow = `1 / span ${GB.rows}`;
    col.style.setProperty('--n', fill);
    col.style.setProperty('--dur', `${gbReelMs(reel)}ms`);
    col.style.setProperty('--delay', `${-Math.max(0, elapsed)}ms`);
    return col;
}

/** 홀드 걸음 — 재생 중이면 그 걸음(0 = 선 코인만) · 재생이 끝났으면 마지막 걸음까지 · 홀드가 아니거나 아직 돌거나 멈춘 판을 보이는 중이면 null */
const gbHoldK = (spin, anim) => !spin?.hold ? null : anim?.phase === 'hold' ? anim.k : anim ? null : spin.hold.steps.length;

/**
 * 판 — 칸 번호 = 릴 × 행 + 행(릴 먼저 · INTERFACE §2-15). 도는 동안은 **릴마다 띠 한 줄**(`gbReel` · ADR-0333).
 * 멈추면 맞은 라인의 칸이 밝아지고(나머지는 그림이 흐려진다) 칸 중심을 잇는 선이 그어진다 · 홀드면 코인 아닌 칸이 흐려지고 그 걸음까지 선 코인만 선다.
 * 양옆은 라인 표지 — 왼쪽 = 라인의 시작 행 · 오른쪽 = 끝 행(`slot_line.csv`) · 맞은 라인은 금색으로 찬다 (§8-1 「판」 · ADR-0601)
 */
function gambleBoard() {
    const GB = SYS.gamble, spin = gbShown(), anim = state.gb.anim;
    const rolling = anim?.phase === 'spin';
    const holdK = gbHoldK(spin, anim);
    const held = holdK == null ? null : spin.hold.steps.slice(0, holdK).reduce((acc, st) => { for (const x of st.landed) acc[x.i] = x.coin; return acc; }, spin.coinAt.slice());
    // 새로 선 코인 — 리스핀을 재생하는 동안만 튀어 오른다(끝난 판을 다시 그릴 때는 안 튄다)
    const fresh = anim?.phase === 'hold' && holdK ? new Set(spin.hold.steps[holdK - 1].landed.map(x => x.i)) : new Set();
    const won = !spin || rolling || held ? [] : spin.lines.map(h => GB.lines.find(l => l.id === h.line)).filter(Boolean);
    const winCells = new Set(won.flatMap(l => l.cells));

    const board = el('div', `gb-board${rolling ? ' rolling' : ''}${held ? ' holding' : ''}${spin ? '' : ' idle'}${winCells.size ? ' has-win' : ''}${anim?.freeze ? ' freeze' : ''}`);
    board.style.setProperty('--reels', GB.reels);
    board.style.setProperty('--rows', GB.rows);
    if (rolling) {
        for (let reel = 0; reel < GB.reels; reel++) board.appendChild(gbReel(spin, reel, now() - anim.t0));
    } else for (let i = 0; i < GB.reels * GB.rows; i++) {
        const reel = Math.floor(i / GB.rows), row = i % GB.rows;
        const c = el('div', 'gb-c');
        c.style.gridColumn = reel + 1;
        c.style.gridRow = row + 1;
        if (!spin) {
            // 아직 안 돌린 판 — 심볼 표를 차례로 늘어놓는다(흐리게 · 결과가 아니다)
            c.innerHTML = gbSymHtml(GB.symbols[i % GB.symbols.length]);
        } else {
            const cell = gbCell(spin, i, held);
            c.classList.add(...cell.cls);
            c.innerHTML = cell.html;
            if (winCells.has(i)) c.classList.add('win');
            if (fresh.has(i)) c.classList.add('fresh');
        }
        board.appendChild(c);
    }
    // 판 + 맞은 라인 선 — 선의 좌표는 칸 단위(릴 · 행)라 판 크기를 몰라도 칸 중심을 지난다 · 양 끝은 판 가장자리(표지 쪽)까지
    const reels = el('div', 'gb-reels');
    reels.appendChild(board);
    if (won.length) {
        const mid = r => r + .5;
        const lines = won.map(l => `<polyline points="0,${mid(l.rows[0])} ${l.rows.map((r, k) => `${mid(k)},${mid(r)}`).join(' ')} ${GB.reels},${mid(l.rows[l.rows.length - 1])}"/>`).join('');
        reels.insertAdjacentHTML('beforeend', `<svg class="gb-lines" viewBox="0 0 ${GB.reels} ${GB.rows}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>`);
    }
    // 라인 표지 — 행마다 그 행에서 시작(왼쪽) · 끝나는(오른쪽) 라인의 번호
    const winIds = new Set(won.map(l => l.id));
    const gutter = side => {
        const g = el('div', `gb-gut ${side}`);
        for (let row = 0; row < GB.rows; row++) {
            const at = GB.lines.filter(l => (side === 'l' ? l.rows[0] : l.rows[l.rows.length - 1]) === row);
            g.appendChild(el('div', 'gb-gut-row', at.map(l => `<span class="gb-mk${winIds.has(l.id) ? ' on' : ''}">${l.id}</span>`).join('')));
        }
        return g;
    };
    const win = el('div', 'gb-window');
    win.appendChild(gutter('l'));
    win.appendChild(reels);
    win.appendChild(gutter('r'));
    return win;
}

/** 잭팟 띠 (§8-1 「잭팟 띠」 · ADR-0601) — 잭팟 넷의 **지금 판돈** 골드. 판이 다 차야 주는 것(그랜드)은 칸이 넓고 그 말을 함께 든다.
 *  재생이 끝난 한 판에서 **받은** 잭팟만 그 칸이 금빛으로 찬다 — 홀드가 안 선 판의 코인은 값을 버리므로 안 켠다 (ADR-0609) */
function gambleJackpots(S) {
    const GB = SYS.gamble, L0 = state.gb.last;
    const sp = L0?.kind === 'one' && !state.gb.anim ? L0.spin : null;
    const hit = new Set(gbJackpotsOf(sp));
    const box = el('div', 'gb-jp');
    for (const c of GB.coins.filter(x => x.kind === 'jackpot')) {
        const gold = S.pays.coins.find(x => x.id === c.id).gold;
        box.appendChild(el('div', `gb-jp-c${c.onFill ? ' fill' : ''}${hit.has(c.id) ? ' hit' : ''}`,
            `<span class="gb-jp-k">${L(c.name)}${c.onFill ? `<small>${t('gb.pay.fill')}</small>` : ''}</span><b class="gb-jp-v">${gold.toLocaleString()} G</b>`));
    }
    return box;
}

/**
 * 계기판 (§8-1 「계기판」 · ADR-0601) — 왼쪽 표지 + 판돈 · 받음 · 순손익(위 라벨 · 아래 큰 숫자). 칸은 늘 서고,
 * 아직 안 돌렸거나 도는 중이면 받음 · 순손익이 「—」다. 받음이 금색으로 밝아지는 것은 순손익이 + 일 때뿐 — 판돈보다 적게 받은 판을 당첨처럼 꾸미지 않는다 (ADR-0331)
 */
function gambleMeter() {
    const L0 = state.gb.last, anim = state.gb.anim;
    // 합계(n판)든 한 판이든 gold · mats · stake · net 이 같은 모양이다
    const res = !L0 || anim ? null : L0.kind === 'all' ? L0 : L0.spin;
    const spin = L0?.kind === 'one' ? L0.spin : null;
    let tag = '';
    if (anim && spin?.hold && anim.phase !== 'spin') {
        // 홀드를 재생하는 동안 — 남은 리스핀 (멈춘 판을 보이는 걸음은 처음 값)
        const k = gbHoldK(spin, anim);
        tag = `${t('gb.hold')} · ${t('gb.respins', { n: k ? spin.hold.steps[k - 1].left : D.balance.gamble_hold_respins })}`;
    } else if (res && L0.kind === 'all') {
        // n판 — 판 수 뒤에 그 판들에서 받은 잭팟 (ADR-0609)
        tag = [t('gb.spins', { n: L0.spins.length }), ...gbJackpotTags(L0.spins.flatMap(gbJackpotsOf))].join(' · ');
    } else if (res) {
        tag = [...res.lines.map(h => t('gb.line', { n: h.line })), ...(res.hold ? [t('gb.hold')] : []),
            ...gbJackpotTags(gbJackpotsOf(res))].join(' · ');
    }
    const stake = res ? res.stake : anim && spin ? spin.stake : null;
    const g = n => `${n.toLocaleString()} G`;
    const mats = res ? Object.entries(res.mats).map(([id, n]) => `${resName(id)} +${n.toLocaleString()}`).join(' · ') : '';
    const net = res?.net ?? null;
    const cell = (k, v, cls = '', sub = null) => `<div class="gb-m${cls}"><span class="gb-m-k">${t(k)}</span><b class="gb-m-v">${v}</b>${sub == null ? '' : `<span class="gb-m-sub">${sub || '&nbsp;'}</span>`}</div>`;
    return el('div', `gb-meter${net > 0 ? ' won' : ''}`,
        `<div class="gb-tag">${tag}</div>`
        + cell('gb.stake', stake == null ? '—' : g(stake))
        + cell('gb.won', res ? g(res.gold) : '—', ' got', mats)
        + cell('gb.net', net == null ? '—' : `${net > 0 ? '+' : net < 0 ? '−' : ''}${g(Math.abs(net))}`, net > 0 ? ' up' : net < 0 ? ' down' : ''));
}

/** 배당표 — **지금 판돈에서** 받는 것(`gambleState.pays`) · 코인 줄 (§8-1 「배당표」). 잭팟은 잭팟 띠가 든다 · 규칙 문장은 도움말이 든다 */
function gamblePaytable(S) {
    const GB = SYS.gamble;
    const box = el('div', 'gb-pay');
    box.appendChild(helpHeading('div', 'gb-pay-h', t('gb.pay.h'), 'payouts'));
    for (const p of S.pays.symbols) {
        const s = GB.symbols.find(x => x.id === p.id);
        const got = p.mat ? `${resName(p.mat.id)} ${p.mat.n.toLocaleString()}` : `<span class="gb-gold">${p.gold.toLocaleString()} G</span>`;
        box.appendChild(el('div', `gb-pay-row s-${s.id}`, `<span class="gb-art">${M.gambleArt(s.id)}</span><span class="gb-pname">${L(s.name)}<small>×${GB.reels}</small></span><b>${got}</b>`));
    }
    box.appendChild(el('div', 'gb-pay-row coin', `<span class="gb-art">${M.gambleArt('coin')}</span><span class="gb-pname">${t('gb.pay.hold', { n: GB.trigger })}</span>`));
    return box;
}

/** 도박장 창의 속 — 왼쪽 기계(잭팟 띠 · 판 · 계기판) + 조작 줄(판돈 · 버튼) | 오른쪽 배당표 (§8-1 · ADR-0601) */
function gambleBody() {
    const S = SYS.game.gambleState(G, state.gb.step);
    const box = el('div', 'gb-box');
    const main = el('div', 'gb-main');
    const machine = el('div', 'gb-machine');
    machine.appendChild(gambleJackpots(S));
    machine.appendChild(gambleBoard());
    machine.appendChild(gambleMeter());
    main.appendChild(machine);
    const ctl = el('div', 'gb-ctl');
    // 판돈 — 안 열린 단계는 흐리고 누르면 「선술집 n랭크 필요」
    const stakes = el('div', 'gb-stakes');
    stakes.appendChild(el('span', 'gb-k', t('gb.stake')));
    S.stakes.forEach((s, i) => {
        const b = el('button', `btn sm gb-stake${s.step === S.step ? ' on' : ''}${s.open ? '' : ' dim'}`, `<small>×${s.mult}</small>${s.gold.toLocaleString()} G`);
        b.onclick = () => {
            if (!s.open) { flashNeed('gambleStakes', i + 1 - D.balance.gamble_stake_steps); return; }
            if (state.gb.anim) return;
            state.gb.step = s.step;
            render();
        };
        stakes.appendChild(b);
    });
    ctl.appendChild(stakes);
    // 버튼 — 못 돌리면 흐리지만 눌리면 사유를 말한다(흐린 버튼 규약) · 횟수 제한은 없다 — 막는 것은 판돈뿐 (ADR-0334) · 주 버튼([스핀])이 줄 끝
    const can = S.open && G.resources.gold >= S.stake && !state.gb.anim;
    const acts = el('div', 'gb-acts');
    const all = el('button', `btn gb-all${can ? '' : ' dim'}`, t('gb.spinN', { n: S.batch }));
    all.onclick = () => gambleGo(true);
    const one = el('button', `btn primary gb-spin${can ? '' : ' dim'}`, t('gb.spin', { g: S.stake.toLocaleString() }));
    one.onclick = () => gambleGo(false);
    acts.appendChild(all);
    acts.appendChild(one);
    ctl.appendChild(acts);
    main.appendChild(ctl);
    box.appendChild(main);
    box.appendChild(gamblePaytable(S));
    return box;
}

/**
 * 대장간 탭 — 제작 · 강화 · 크래프트 (SCREEN_DESIGN §8-2 · 기획 item_design §7 · base_expedition_design §2-5).
 * 2026-09-03 사용자 지시로 마을의 칸에서 자기 탭이 됐다. **탭 이름이 장소 「대장간」이다**(`nav.forge` · ADR-0190) —
 * 패널 제목은 고른 작업 이름이다. 작업 탭은 **패널 박스 바로 위**에 서고(ADR-0281 — 상단바에서 내려왔다 · 도감과 같은 자리) 고른 하나만 편다(ADR-0142).
 * **지금 실제로 도는 것은 제작 · 강화 둘**이다 — 크래프트(R97)는 `game_logic` 에 없어 미착수 안내를 띄운다.
 * 배치 줄은 없다(ADR-0191) — 영웅은 작업할 때 배치되는 쪽으로 간다. 없는 기능에 가짜 수치를 그리지 않는다.
 */
function renderForge(main) {
    // 상점과 같은 세로 3단 [2026-09-27 사용자 지시 「상점처럼」 · §8-2 · ADR-0366] — 띠 / 왼쪽 영웅 장비 · 오른쪽 대장간 열(작업 탭 + 패널) / 아이템창.
    //   장비 · 아이템창은 세 작업 탭 모두에 서고, 칸 클릭은 장착이 아니라 강화 대상 고르기다(ADR-0364)
    const h = heroById(state.heroUid);
    forgeTarget();   // 고른 대상을 먼저 맞춘다 — 장비 · 아이템창의 강조 테두리가 같은 값을 본다
    const page = el('div', 'char-stack page c-forge');
    // 영웅 띠 (ADR-0363) — 상점 띠와 같은 옵션 · 같은 「고른 영웅」(`pickHero`)
    page.appendChild(heroStrip(pickHero));
    const band = el('div', 'cols c-forge-band');
    band.appendChild(gearPanel(h, { onPick: forgePick, selUid: state.forgeItem }));
    const col = el('div', 'page-stack c-forge-col');
    /* 작업 탭 — **패널 박스 바로 위**다 [사용자 지시 2026-09-21 · ADR-0281 — ~~상단바의 탭 세그먼트 자리(ADR-0190)~~]. 박스 밖이라 스크롤하지 않는다.
       세 작업을 한 화면에 나란히 두지 않는다 — 고른 하나가 박스 끝까지 편다 (ADR-0142)
       **패널 윗변에 붙은 폴더 탭 · 강화가 맨 왼쪽** [2026-10-30 사용자 「폴더에서 선택하듯이」 · §8-2 · ADR-0963] — 원정 난이도 탭과 같은 길:
       틈(`.fg-gap`) · 남은 자리 · 안 고른 탭의 아랫변이 패널 윗선을 잇고 고른 탭 자리에서만 끊긴다(패널 `.fg-panel` 은 윗변이 없다) · 고른 탭은 클릭이 없다 */
    const TABS = [['up', 'fg.seg.up'], ['make', 'fg.seg.make'], ['synth', 'fg.seg.synth'], ['craft', 'fg.seg.craft']];   // 합성 2026-10-27 · ADR-0856
    const tab = TABS.some(([id]) => id === state.forgeTab) ? state.forgeTab : 'up';
    const tabs = el('div', 'fg-tabs');
    tabs.appendChild(el('span', 'fg-gap'));
    TABS.forEach(([id, key], i) => {
        if (i) tabs.appendChild(el('span', 'fg-gap'));
        const b = el('button', `fg-tab${id === tab ? ' on' : ''}`, t(key));
        if (id !== tab) b.onclick = () => { state.forgeTab = id; render(); };
        tabs.appendChild(b);
    });
    tabs.appendChild(el('span', 'fg-gap fg-fill'));
    col.appendChild(tabs);

    const p = el('div', 'panel page fill fg-panel');
    // 제목 = 고른 작업 이름 — 다른 탭과 같은 패널 제목(`.panel > h2`)이라 서 있고 본문만 스크롤한다
    p.appendChild(helpHeading('h2', '', tab === 'craft'
        ? `${t('fg.seg.craft')} <small class="todo-badge">${t('todo.badge')}</small>`
        : t(`fg.seg.${tab}`), `forge_${tab}`));

    // 박스 (ADR-0097) — 고른 작업이 박스 끝까지 서며 넘치면 스크롤한다
    const body = el('div', 'fg-split box-body');
    body.dataset.keep = `forge-${tab}`;   // 탭마다 따로 되찾는다 — 강화 목록 스크롤이 제작 탭에 묻어가지 않게

    const box = el('div', 'fg-box');
    if (tab === 'make') forgeMake(box);   // 제작은 한 칸이다 — 고르개 줄(부위 · 물약) 아래에 고른 하나만 편다 (ADR-0219)
    else if (tab === 'up') forgeUpgrade(box);
    else if (tab === 'synth') forgeSynth(box);   // 합성 — 재료 줄마다 네 칸 사다리 (ADR-0856 · R359)
    else box.appendChild(el('div', 'note-body muted', t('todo.lead')));   // 크래프트 — 로직이 없다 (R97)
    body.appendChild(box);

    p.appendChild(body);
    col.appendChild(p);
    band.appendChild(col);
    page.appendChild(band);
    // 아이템창 — 캐릭터 탭 것 그대로(도구 줄까지) · 칸 클릭만 고르기다 (ADR-0364 · ADR-0366)
    page.appendChild(itemsPanel(h, { onPick: forgePick, selUid: state.forgeItem }));
    main.appendChild(page);
}

/**
 * 합성 — 재료 줄마다 네 칸 사다리 (SCREEN_DESIGN §8-2 · ADR-0856 · 기획 item_design §5-2 · R359).
 * 행 = 줄(`materialsState` 순서) · 칸 = `matCell` · 위 단계 칸 앞에 **그 칸 하나를 만드는 단**(필요 수 · 골드 · [합성] · [최대 ×n]).
 * 판정 · 최대 개수는 `game.synthState` 가 낸다 — 렌더러는 세지 않는다. 대장간을 안 지었으면 버튼이 흐리고 누르면 지을 랭크를 말한다(제작 레벨과 같다)
 */
function forgeSynth(p) {
    const by = Object.fromEntries(SYS.game.synthState(G).list.map(r => [r.id, r]));
    const col = el('div', 'fg-col sy-ladder');
    let row = null, post = null;
    for (const x of SYS.game.materialsState(G).items) {
        if (x.post !== post) { post = x.post; row = el('div', 'sy-row'); col.appendChild(row); }
        if (by[x.id]) row.appendChild(synthStep(by[x.id]));
        row.appendChild(matCell(x));
    }
    p.appendChild(col);
}
/** 합성 단 하나 — 위 줄 `×필요` · 골드(모자란 쪽이 붉다) · 아래 줄 [합성](하나) · [최대 ×n](지금 되는 만큼 · ADR-0856) */
function synthStep(r) {
    const shut = r.err === 'unbuilt';
    const step = el('div', 'sy-step', `<div class="sy-cost"><span class="${r.have < r.need ? 'no' : ''}">×${r.need}</span>`
        + `${r.gold ? `<span class="${G.resources.gold < r.gold ? 'no' : ''}">${r.gold.toLocaleString()} G</span>` : ''}</div>`);
    const act = el('div', 'sy-act');
    const go = (n, label, cls) => {
        const b = el('button', `btn sm ${cls}${shut ? ' dim' : ''}`, label);
        b.disabled = !shut && r.max < Math.max(1, n);
        b.onclick = () => {
            if (shut) { flashNeed('synth', 1); return; }
            const res = SYS.game.synthesize(G, r.id, n);
            if (!res.ok) flashErr('fg', res.err, 'synth');
            else { flash('fg.synthed', { name: resName(r.id), n: res.n }); save(); }
            render();
        };
        act.appendChild(b);
    };
    go(1, t('fg.synth.go'), 'primary');
    go(r.max, t('fg.synth.max', { n: r.max }), '');
    step.appendChild(act);
    return step;
}

/** 강화 대상 고르기 — 대장간의 장비 · 아이템창이 같이 쓴다 (ADR-0364). 다른 작업 탭에서 눌렀으면 강화 탭으로 넘어간다 (ADR-0366) */
const forgePick = it => { state.forgeItem = it.uid; state.forgeTab = 'up'; render(); };

/** 선택선을 인벤토리 위의 별도 층에 그린다 — 칸 밖의 선도 보이며 클릭은 원래 UI가 받는다. */
function mountForgeSelection() {
    const cell = $('.c-forge .pd-cell.sel, .c-forge .inv-cell.sel');
    if (!cell || !$('#modal').hidden) return null;
    const stage = $('#stage'), main = cell.closest('.main');
    const outline = el('div', 'forge-selection-outline');
    outline.setAttribute('aria-hidden', 'true');
    stage.appendChild(outline);
    let frame = 0;
    const sync = () => {
        frame = 0;
        if (!cell.isConnected) { outline.hidden = true; return; }
        let { left, right, top, bottom } = cell.getBoundingClientRect();
        // 칸 자체가 스크롤 밖으로 완전히 나가면 숨긴다. 칸 바깥 선택선은 자르지 않는다.
        for (let p = cell.parentElement; p && p !== stage; p = p.parentElement) {
            const style = getComputedStyle(p), box = p.getBoundingClientRect();
            if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
                left = Math.max(left, box.left); right = Math.min(right, box.right);
            }
            if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
                top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom);
            }
        }
        outline.hidden = right <= left || bottom <= top;
        if (outline.hidden) return;
        const r = stageRect(cell), zoom = parseFloat(getComputedStyle(main).zoom) || 1;
        // 한 장 좌표에는 이미 메인 zoom이 반영됐다. 같은 zoom으로 기존 선 굵기도 유지한다.
        Object.assign(outline.style, { zoom: String(zoom), left: `${r.left / zoom}px`, top: `${r.top / zoom}px`,
            width: `${(r.right - r.left) / zoom}px`, height: `${(r.bottom - r.top) / zoom}px` });
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(sync); };
    const resize = new ResizeObserver(queue);
    resize.observe(cell);
    const skin = new MutationObserver(queue);
    skin.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin', 'data-skin-parts'] });
    document.addEventListener('scroll', queue, { capture: true, passive: true });
    window.addEventListener('resize', queue);
    sync();
    return () => {
        cancelAnimationFrame(frame);
        resize.disconnect(); skin.disconnect();
        document.removeEventListener('scroll', queue, true);
        window.removeEventListener('resize', queue);
        outline.remove();
    };
}

/** 강화 대상 맞추기 — 누구의 것이든 된다(착용품 · 인벤토리 · 창고). 직접 고른 장비만 유지하고, 사라졌으면 비운다 */
function forgeTarget() {
    const owned = new Set([...G.bags.flat(), ...(G.stash ?? [])]);   // 부대 인벤토리 전부 (v40)
    for (const x of G.heroes) for (const uid of Object.values(x.equipped ?? {})) if (uid) owned.add(uid);
    if (!owned.has(state.forgeItem)) state.forgeItem = null;
}

/** 부위 고르개의 칸 그림 — 장비칸 빈 칸과 같은 부위 실루엣 (SCREEN_DESIGN §8-2 · 규칙은 `mock.slotArt` 한 곳).
 *  제작의 부위 줄이 쓴다. 그림이 없는 부위만 이모지로 떨어진다 */
const slotPickHtml = s => {
    const art = M.slotArt(s.id);
    return art ? `<img class="seg-slot" src="${art}" alt="" loading="lazy" onerror="this.remove()">` : s.icon;
};

/**
 * 제작 칸 — 위 고르개 줄(부위 칸 전부 + 끝에 물약 칸)에서 하나를 고르고, 고른 것만 아래에 편다
 * (SCREEN_DESIGN §8-2 · ADR-0219 · ADR-0230 — 강화의 부위 필터와 같은 가로 줄이다. 왼쪽 세로 탭(ADR-0226)은 되돌렸다).
 * 부위면 레벨(Lv1 · Lv10 …)을 고르고, 그 아래 **종류 목록**의 줄마다 만든다 — 줄 = 그림 · 이름 · 필요 재료 칸 · [만들기]
 * (기획 item_design §7-1 개정 2026-09-21 · ADR-0263) · 물약이면 `forgePotion`.
 * 판정(재료 모자람 · 인벤토리 가득)과 종류 목록은 `game.makeState` 가 낸다 — 렌더러는 세지 않는다. 희귀도는 굴림이라 미리보기가 없다
 */
function forgeMake(p) {
    const potion = state.makePart === 'potion';
    const part = potion ? 'potion' : D.slots.some(s => s.id === state.makePart) ? state.makePart : D.slots[0]?.id;
    const col = el('div', 'fg-col fg-make');
    p.appendChild(col);

    const parts = el('div', 'segmented');
    const pick = (id, html, name) => {
        const b = el('button', `btn sm${part === id ? ' on' : ''}`, html);
        b.title = name;
        b.setAttribute('aria-label', name);
        b.onclick = () => { state.makePart = id; render(); };
        parts.appendChild(b);
    };
    for (const s of D.slots) pick(s.id, slotPickHtml(s), L(s));
    // 물약 칸 — 그림은 물약 빈 칸의 병 실루엣 (관전 아레나 · 편성 탭의 빈 물약 칸과 같은 한 장)
    pick('potion', `<img class="seg-slot" src="${M.POTION_SLOT_ART}" alt="" loading="lazy" onerror="this.remove()">`, t('fg.make.potion'));
    col.appendChild(parts);

    if (potion) { forgePotion(col); return; }

    // 레벨은 **대장간 랭크가 앞에서부터 연다**(`open` · R137) — 안 열린 레벨은 흐리고 누르면 지을 랭크를 말한다 · 고른 레벨이 닫혀 있으면 첫 열린 레벨
    const levels = SYS.game.makeLevels(G);
    const level = levels.some(l => l.level === state.makeLevel && l.open) ? state.makeLevel : (levels.find(l => l.open) ?? levels[0])?.level;
    const lv = el('div', 'segmented');   // 칸 폭 = 위 부위 칸 폭 (`.fg-make > .segmented > .btn`)
    levels.forEach((l, i) => {
        const btn = el('button', `btn sm${level === l.level ? ' on' : ''}${l.open ? '' : ' dim'}`, t('fg.make.lv', { n: l.level }));
        btn.onclick = () => { if (!l.open) { flashNeed('make_level', i + 1); return; } state.makeLevel = l.level; render(); };
        lv.appendChild(btn);
    });
    col.appendChild(lv);

    const ms = SYS.game.makeState(G, part, level, invNo());   // 만든 것은 보고 있는 인벤토리로 — 가득 판정도 그것으로 (ADR-0521)
    if (!ms) return;
    // 필요 재료 칸 셋 — 그림 자리에 **재료 이름 글자**(재료 아트가 없다 · 상점 재료 칸과 같은 규칙) · 칸 아래 `보유/필요`.
    //   필요량은 부위마다 한 줄이라 모든 줄이 같은 칸을 든다 (ADR-0263)
    const mats = ms.cost.map(c => {
        const name = c.kind === 'gold' ? t('res.gold') : matName(c.kind, c.id);   // 골드 · 부위 재료 · 가루(재료 사다리) — R373
        return `<span class="fg-kmat${c.have < c.need ? ' no' : ''}" title="${name} ${c.have} / ${c.need}"><span class="fg-kmat-ic">${name}</span><b>${c.have}/${c.need}</b></span>`;
    }).join('');
    const list = el('div', 'fg-kinds');
    // 줄 높이 — 목록이 패널 맨 아래에 닿게 가르는 줄 수 = 이 레벨에서 줄이 가장 많은 부위의 줄 수 (부위를 바꿔도 줄 높이가 같다 · style.css `.fg-kinds`)
    list.style.setProperty('--kind-rows', Math.max(...D.slots.map(s => SYS.game.makeState(G, s.id, level)?.kinds.length ?? 0)));
    for (const k of ms.kinds) {
        // 그림 · 이름 = **만들어질 베이스** — 인벤토리 칸과 같은 규칙(`itemImg`). 무기는 그 레벨의 세부 베이스다(레벨을 바꾸면 바뀐다 · `makeState` 의 `baseId`)
        const look = { slot: part, group: k.group, baseId: k.baseId };
        const row = el('div', 'fg-kind', `<span class="fg-ic">${itemImg(look)}</span><span class="fg-kname">${L(k)}</span><span class="fg-kmats">${mats}</span>`);
        // 안 열린 레벨(대장간을 안 지었다)이면 흐리고(눌린다) 누르면 지을 랭크를 말한다 — 레벨 버튼과 같은 문장 (§13-1 잠긴 자리 · ADR-0308)
        const shut = ms.err === 'unbuilt';
        const go = el('button', `btn primary sm${shut ? ' dim' : ''}`, t('fg.make.go'));
        go.disabled = !shut && !ms.canMake;
        go.onclick = () => {
            if (shut) { flashNeed('make_level', levels.findIndex(l => l.level === level) + 1); return; }
            const r = SYS.game.makeItem(G, part, level, k.id, invNo());
            if (!r.ok) { if (r.err === 'unbuilt') flashNeed('make_level', levels.findIndex(l => l.level === level) + 1); else flash(`fg.err.${r.err}`); }
            else { flash('fg.made', { name: L(G.items[r.uid].name) }); save(); }
            render();
        };
        row.appendChild(go);
        list.appendChild(row);
    }
    col.appendChild(list);
    if (ms.err === 'bagFull') col.appendChild(el('div', 'fg-kerr', t('fg.err.bagFull')));
}

/**
 * 물약 — 제작 고르개 줄의 물약 칸을 고르면 제작 칸 안에 편다 (SCREEN_DESIGN §8-2 · ADR-0219 · 기획 item_design §7-4 · R103 · 개수 R124).
 * 판정(개수 · 잠김 · 골드 부족)은 `game.potionState` 가 낸다 — 렌더러는 세지 않는다.
 * 머리 줄은 **재고**다 — 가진 물약이 그림 + 개수(0 개는 안 선다 · 하나도 없으면 「없음」). **칸은 여기 없다** — 편성마다라 편성 탭이 든다 (ADR-0195).
 * 그림은 관전 아레나 칸과 같은 그림이고 없으면 병 실루엣이 깔린다 — 규칙은 `battle.js:potionBeltHtml` 과 같다 (2026-09-17)
 */
function forgePotion(p) {
    const ps = SYS.game.potionState(G);
    const col = el('div', 'fg-potion');
    // 재고 칩 · 제작 행 둘 다 **물약 카드**를 띄운다 (§2 「물약 툴팁 규격」 · ADR-0315) — 그래서 칩이 문자열이 아니라 노드다
    const head = helpHeading('div', 'fg-poth', `<span>${t('fg.potion.stock')}</span>`, 'potion_stock');
    const belt = el('span', 'p-belt');
    for (const row of ps.list.filter(r => r.have > 0)) {
        const src = M.potionArt(row.id);
        const img = src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">`
            : `<img class="p-bg" src="${M.POTION_SLOT_ART}" alt="" loading="lazy" onerror="this.remove()">`;
        const chip = el('span', 'p-stock', `<span class="p-slot full">${img}</span><b>×${row.have}</b>`);
        bindTipNode(chip, () => potionTipCard(row.id, { heal: row.heal }));
        belt.appendChild(chip);
    }
    if (!belt.childElementCount) belt.appendChild(el('span', 'fg-ptag muted', t('fg.potion.none')));
    head.appendChild(belt);
    col.appendChild(head);
    for (const row of ps.list) {
        const info = potionInfo(row.id);
        const line = el('div', `fg-prow${row.have ? ' has' : ''}${!row.have && !row.craftable ? ' locked' : ''}`,
            `<span class="fg-pn">${L(info.name)}</span><span class="fg-ph">${t('fg.potion.heal', { n: row.heal })}</span>`);
        bindTipNode(line, () => potionTipCard(row.id, { heal: row.heal }));
        const act = el('span', 'fg-pact');
        // 가진 것은 개수 · **가진 뒤에도 [만들기]가 선다** — 거듭 만든다 (R124)
        if (row.have) act.appendChild(el('span', 'fg-ptag', `×${row.have}`));
        // 안 열린 단계는 **지을 대장간 랭크**를 찍는다 (R137 · ~~「잠김」~~)
        if (!row.craftable) { if (!row.have) act.appendChild(el('span', 'fg-ptag muted', lockLine(needText('potion_tier', row.tier)))); }
        else {
            const go = el('button', 'btn primary sm', t('fg.make.go'));
            go.disabled = !row.canMake;
            go.onclick = () => {
                const r = SYS.game.makePotion(G, row.id);
                if (!r.ok) { if (r.err === 'locked') flashNeed('potion_tier', row.tier); else flash(`fg.err.${r.err}`); }   // 못 만드는 단계 = 여는 대장간 랭크 (ADR-0699)
                else { flash('fg.made', { name: L(info.name) }); save(); }
                render();
            };
            act.appendChild(go);
            act.appendChild(el('span', `fg-cost${row.err === 'gold' ? ' no' : ''}`, `${row.cost.toLocaleString()} G`));
            if (row.herb) act.appendChild(el('span', `fg-cost${row.herb.have < row.herb.need ? ' no' : ''}`,
                `${row.herb.need.toLocaleString()} ${resName(row.herb.id)}`));
        }
        line.appendChild(act);
        col.appendChild(line);
    }
    p.appendChild(col);
}

/** 칸 배지에 찍을 강화 단계 — 장비칸 · 아이템창의 `+n` */
function upShown(it) { return SYS.game.upgradeState(G, it.uid)?.up ?? 0; }

/** [강화] — 굴려 저장하고 그 자리에서 결과를 말한다. 연출 · 기다림이 없다 (SCREEN_DESIGN §8-2 · ADR-0737) */
function forgeUpgradeGo(it) {
    const r = SYS.game.upgradeItem(G, it.uid);
    if (!r.ok) { flashErr('ch', r.err, 'upgrade_item'); render(); return; }
    save();
    flash(r.success ? 'ch.upgraded' : 'fg.upFail', { n: r.up, g: r.cost });
    render();
}

/**
 * 강화 칸 — 고른 대상의 작업 패널 (SCREEN_DESIGN §8-2). 대상은 왼쪽 장비 패널 · 아래 아이템창에서 고른다(`forgePick` · ADR-0364 · ADR-0366)
 * 세 칸이다 — 왼쪽 **아이템 칸**(작은 그림 + hover 툴팁 꼴의 옵션 나열 — `tipCard` 의 내용 · 툴팁과 같은 폭 · ADR-0979) | 가운데 **빈 칸**(⚠ 시험 중) |
 * 오른쪽 **작업**(단계 눈금 · 「지금 › 다음」 · 성공 확률 · 재료 칸 + [강화] · ADR-0973).
 * 다음 값은 `upgradeState.next` 가 낸다 — 렌더러는 강화 배율 · 반올림을 모른다 (ui 원칙 2)
 */
function forgeUpgrade(p) {
    const it = itemOf(state.forgeItem);
    if (!it) { p.appendChild(el('div', 'fg-up-empty', t('fg.pick'))); return; }
    const us = SYS.game.upgradeState(G, it.uid);
    // 아이템 칸 — 옵션을 hover 툴팁과 **같은 꼴로 나열**한다(같은 함수 `tipCard` 의 내용 · 툴팁 창의 테두리 · 그림자는 안 입는다) · 툴팁과 같은 폭 ·
    //   그림은 왼쪽 위에 작게(희귀도 색 테두리) — 머리글 · 이름이 그 오른쪽 [2026-10-30 사용자 지시 · ADR-0979].
    //   머리글 줄은 종류 · 레벨만 — 「착용 중」 · 「이 아이템」 글은 안 단다(2026-10-30 사용자 「착용중표시를 빼버려」) · 레벨당 옵션 합계 = 낀 영웅(없으면 고른 영웅)의 레벨(ADR-0954)
    const holder = G.heroes.find(x => Object.values(x.equipped ?? {}).includes(it.uid));
    const wrap = el('div', 'fg-up');
    const card = tipCard(it, '', [], null, { level: (holder ?? heroById(state.heroUid))?.level ?? null });
    card.classList.add('fg-up-card');
    const hd = el('div', 'fg-up-hd');
    // 그림 오른쪽 아래 = 아이템 레벨 — 가방 칸과 같은 배지(`.inv-lv`) [2026-10-30 사용자 「그림에 레벨 넣어줘」]
    const ic = el('span', 'fg-up-ic', `${itemImg(it)}<span class="inv-lv">${t('ch.itemLv', { n: it.ilvl })}</span>`);
    ic.style.borderColor = rarity(it.rarity).color;
    const tx = el('div', 'fg-up-hdtx');
    // 그림 오른쪽 = 위에 종류 · 레벨(오른쪽 위) · 아래에 이름(그림 아랫변에 맞춘다) [2026-10-30 사용자 지시]
    tx.append(card.querySelector('.tip-head'), card.querySelector('.tip-name'));
    hd.append(ic, tx);
    card.prepend(hd);
    const col = el('div', 'fg-up-tipcol');
    col.appendChild(card);
    wrap.appendChild(col);
    // 가운데 — 비운다 [2026-10-30 사용자 「가운데를 비워볼래 아무것도 안보이게 일단」 · ⚠ 시험 중] — 자리는 남긴다(작업 칸이 오른쪽에 그대로 선다)
    wrap.appendChild(el('div', 'fg-up-mid'));

    const work = el('div', 'fg-up-work');
    // 목걸이 · 반지 — 눈금 · 값 · 버튼 대신 한 줄 (ADR-0125)
    if (!us.upgradeable) work.appendChild(el('div', 'fg-up-none', t('fg.noBase')));
    else {
        // ① 단계 눈금 — 찬 칸 = 지금 · 다음 칸은 테두리만 밝다(누르면 찰 칸)
        //   칸은 `slots` 개를 언제나 그리고 지금 상한(`max`) 너머는 잠긴 칸이다 — 회색 자물쇠 (ADR-0968 · ADR-0925)
        const pips = Array.from({ length: us.slots }, (_, i) => i >= us.max ? `<i class="lock">${lockIcon(true)}</i>`
            : `<i class="${i < us.up ? 'on' : i === us.up && us.next ? 'next' : ''}"></i>`).join('');
        work.appendChild(el('div', 'fg-up-track', `
            <div class="fg-up-th"><span>${t('fg.stage')}</span><b>+${us.up}<small> / ${us.max}</small></b></div>
            <div class="fg-up-pips">${pips}</div>`));
        // ② 지금 › 다음 — 먹인 값(강화 · 베이스 옵션)이라 툴팁·캐릭터 시트와 같은 숫자다 (§6 · ADR-0309) · 상한이면 다음 열이 빈다
        //   이름은 가운데 옵션 열의 메인 옵션 행과 같다(물리 ↔ 마법 데미지 — `combat_stat.csv` · `itemBodyHtml`)
        const n = us.next, imp = SYS.item.implicitFixed(it), grp = SYS.item.groupOf(it);
        const atkStat = grp && statRow(grp.damageKind === 'physical' ? 'atk_physical' : 'atk_magic');
        const [lab, now, next] = grp
            ? [atkStat ? L(atkStat) : t('st.atk'), rangeText(SYS.item.weaponDamageFixed(it)), n?.dmg && rangeText(n.dmg)]
            : [imp ? L(M.statLabel(imp.stat)) : t('fg.base'), imp ? M.statValue(imp.stat, imp.v) : '—', n?.imp && M.statValue(n.imp.stat, n.imp.v)];
        //   다음이 지금과 같으면(작은 값에서 반올림이 한 단계를 먹는다) 초록이 아니라 흐리게 — 오른다고 읽히면 거짓 신호다
        const rows = el('div', 'fg-up-rows');
        rows.appendChild(el('div', 'fg-up-cmp', `<span class="lab">${lab}</span><b>${now}</b>${next ? `<i>›</i><b class="nx${next === now ? ' same' : ''}">${next}</b>` : ''}`));
        // ③ 성공 확률 — 비교 줄 아래 같은 「이름 · 값」 줄(칩이 아니다 — 누를 수 있는 것만 버튼 꼴 · ADR-0973) · `upgradeState.chance`(비율)를 정수 % 로 찍기만 한다 (R253)
        if (us.chance != null) rows.appendChild(el('div', 'fg-up-cmp', `<span class="lab">${t('fg.chanceLab')}</span><b>${Math.round(us.chance * 100)}%</b>`));
        work.appendChild(rows);
        // ④ 비용 = 건설 · 연구소와 같은 재료 칸(`matTile` — 골드는 필요 수 · 재료는 보유/필요 · 모자라면 붉다) · 줄 오른쪽 끝 [강화] (ADR-0973)
        //   상한이면 칸이 빠지고 버튼이 상한 문구로 잠긴다
        const act = el('div', 'fg-up-act');
        if (us.cost != null) act.appendChild(el('div', 'cn-mats', [{ res: 'gold', need: us.cost, have: us.gold },
            ...us.mats.map(m => ({ res: m.id, need: m.need, have: m.have }))].map(matTile).join('')));
        // 대장간을 안 지었으면 흐리고(눌린다) 누르면 지을 랭크를 말한다 (§13-1 잠긴 자리 · ADR-0308)
        const go = el('button', `btn primary lg${us.open ? '' : ' dim'}`, us.cost == null ? t('fg.upMax', { up: us.up }) : t('fg.go'));
        go.disabled = us.open && !us.canUpgrade;
        go.onclick = () => {
            if (!us.open) { flashNeed('upgrade_item'); return; }
            forgeUpgradeGo(it);
        };
        act.appendChild(go);
        work.appendChild(act);
    }
    wrap.appendChild(work);
    p.appendChild(wrap);
}

/**
 * 상점 탭 — 상단 · 교역소 · 특수상단 (SCREEN_DESIGN §8-3 · 기획 base_expedition_design §2-6).
 * **탭 이름은 「상점」(활동), 패널 머리는 「상단」(장소 — `dp.post.trade`)** 으로 갈린다 — 대장간(§8-2)는 탭 이름도 장소다(ADR-0190).
 * **맨 위에 영웅 띠**(캐릭터 탭과 같은 패널 · 같은 「고른 영웅」 — ADR-0359) · 가운데 단 = 구매 | 판매 | 교역소 위 · 특수상단 아래 · 맨 아래 아이템창.
 * 방문 시계 · 장비 목록 · 무엇이 열렸나는 `game.shopState` 가 낸다 — 화면은 판정을 하나도 안 한다(ui 원칙 2).
 * ⚠ 교역소 교환 · 특수상단 물건은 미정이라 `?` 칸 셋만 선다(ADR-0782 · ADR-0960) · 상인 이름 · 칸 수는 `mock.js:TRADE`(거짓).
 */
/** 판매 목록에 올리고 내린다 — 선택만 바꾸며 골드·재고는 [판매]에서 정산한다. */
function toggleShopSell(it) {
    hideTip();
    if (state.shopSell.has(it.uid)) state.shopSell.delete(it.uid);
    else {
        const v = SYS.game.shopSellPreview(G, [it.uid]);
        if (v.err === 'unbuilt') { flashNeed('shop'); return; }
        if (v.err) { flash(`td.sell.err.${v.err}`); return; }
        state.shopSell.add(it.uid);
    }
    render();
}

/** 구매 오른쪽 판매 패널 — 선택한 장비·개별 가격, 총액과 실행 버튼. */
function shopSellPanel() {
    const p = el('div', 'panel td-sale');
    const head = helpHeading('h2', '', t('td.sell'), 'shop_sell');
    const clear = el('button', 'btn sm', t('td.sell.clear'));
    clear.disabled = !state.shopSell.size;
    clear.onclick = () => { state.shopSell.clear(); render(); };
    head.appendChild(clear);
    p.appendChild(head);
    const v = SYS.game.shopSellPreview(G, [...state.shopSell]);
    const body = el('div', 'box-body td-sale-body');
    body.dataset.keep = 'shop-sell';
    if (!v.n) body.appendChild(el('div', 'td-sale-empty muted', t('td.sell.empty')));
    else {
        const grid = el('div', 'td-sale-grid');
        for (const x of v.items) {
            const it = itemOf(x.uid);
            const slot = el('div', 'td-slot');
            const cell = el('button', 'inv-cell filled');
            cell.type = 'button';
            cell.dataset.sellUid = it.uid;
            cell.style.borderColor = rarity(it.rarity).color;
            cell.setAttribute('aria-label', `${t('td.sell.remove')}: ${L(it.name)}`);
            const up = upShown(it);
            cell.innerHTML = `<span class="inv-icon">${itemImg(it)}</span>`
                + (up ? `<span class="inv-up">+${up}</span>` : '')
                + `<span class="inv-lv">${t('ch.itemLv', { n: it.ilvl })}</span>`;
            bindTip(cell, it);
            cell.onclick = () => toggleShopSell(it);
            slot.append(cell, el('div', 'td-price', `${x.gold.toLocaleString()} G`));
            grid.appendChild(slot);
        }
        body.appendChild(grid);
    }
    p.appendChild(body);
    const bar = el('div', 'td-buy td-sale-total', `<span class="td-buy-n">${t('td.sell.count', { n: v.n })}</span><span class="td-price">${v.gold.toLocaleString()} G</span>`);
    const open = SYS.game.hasFeature(G, 'shop');
    const sell = el('button', `btn sm primary${open ? '' : ' dim'}`, t('td.sell'));
    sell.disabled = !v.n;
    sell.onclick = () => {
        const r = SYS.game.shopSell(G, [...state.shopSell]);
        if (r.ok) { state.shopSell.clear(); save(); flash('td.sell.done', { n: r.n, g: r.gold.toLocaleString() }); }
        else if (r.err === 'unbuilt') flashNeed('shop');
        else flash(`td.sell.err.${r.err}`);
        render();
    };
    bar.appendChild(sell);
    p.appendChild(bar);
    return p;
}

function renderShop(main) {
    const S = SYS.game.shopState(G, now());
    // 앱 시계가 이것과 비교해 다시 그릴 순간을 잰다(`shopTick`) — 특수상단이 오고 가는 순간 · 상단 무료 교체가 열리는 순간
    state.shopShown = { cycle: S.cycle, here: S.here, freeAt: S.freeAt, free: S.free };
    // 고른 칸은 **그 목록의 것**이다 — 목록 번호(`list` — [교체]마다 바뀐다 · ADR-0648)가 바뀌면 풀린다 (§8-3)
    if (state.shopSel && state.shopSel.cycle !== S.list) state.shopSel = null;
    // 원정 정산·분해·잠금 뒤에도 실제로 보관 중이며 팔 수 있는 장비만 목록에 남긴다.
    const stored = new Set([...(G.stash ?? []), ...G.bags.flat()]);
    for (const uid of state.shopSell) {
        const it = itemOf(uid);
        if (!stored.has(uid) || !it || it.locked || SYS.game.shopSellGold(it) === null) state.shopSell.delete(uid);
    }

    // 세로 3단 — 영웅 띠 / 구매 · 판매 · 교역소와 특수상단 / 아이템창 (§8-3).
    const h = heroById(state.heroUid);
    const page = el('div', 'char-stack page c-shop');
    // 영웅 띠 [2026-09-25 사용자 지시 · §8-3 · §5 · ADR-0359] — 클릭은 캐릭터 탭과 같은 「고른 영웅」이고, 그 영웅이 상단 장비 칸 툴팁의 비교 상대다.
    //   툴팁은 켠다 — 캐릭터 탭 띠가 끈 이유(아래 칸이 같은 값을 든다 · ADR-0116)가 여기엔 없다. 해고 · 순서 바꾸기는 캐릭터 탭 띠에만(§5)
    page.appendChild(heroStrip(pickHero));
    const band = el('div', 'cols c-shop-band');
    const p = el('div', 'panel td-stock');
    // 제목 「구매」 바로 오른쪽 `?` — 교체 규칙 두 문장(편성 탭 소제목 `?` 와 같은 표시 · ADR-0464 · ADR-0648)
    const head = el('h2', '', `<span>${t('td.buy')}</span>`);
    head.firstChild.appendChild(helpMark('td.buy', () => t('td.reroll.help', { h: D.balance.shop_refresh_hours })));
    // 제목 줄 오른쪽 끝 [교체] — **고른 영웅의 레벨**로 다시 굴린다 · 무료는 선술집처럼 쿨다운 · 유료는 두 배씩 (§8-3 · ADR-0648).
    //   버튼은 행동과 값만 · 바로 왼쪽에 고른 영웅의 이름 · 레벨 글자(ADR-0965) · 무료가 닫혀 있으면 그 왼쪽에 남은 시간 — 앱 시계가 글자만 간다(`shopTick` · 선술집 `tv-wait` 와 같은 글자)
    const roll = el('span', 'td-roll');
    if (!S.free) roll.appendChild(el('span', 'tv-wait', tavernWaitText(S.freeAt - now())));
    if (h) roll.appendChild(el('span', 'td-roll-who', t('td.reroll.who', { name: L(h.name), lv: h.level })));
    const rr = el('button', `btn sm${S.open ? '' : ' dim'}`, S.rerollCost ? t('td.reroll', { g: S.rerollCost.toLocaleString() }) : t('td.reroll.free'));
    rr.disabled = S.open && G.resources.gold < S.rerollCost;
    rr.onclick = () => {
        if (!S.open) { flashNeed('shop'); return; }
        const r = SYS.game.shopReroll(G, S.list, now(), h?.uid);
        if (r.ok) { state.shopSel = null; save(); } else flash('td.err.' + (r.err === 'missing' ? 'stale' : r.err));
        render();
    };
    roll.appendChild(rr);
    head.appendChild(roll);
    p.appendChild(head);
    // 박스 (ADR-0097) — 제목은 서 있고 본문이 스크롤한다. 두 패널이 스크롤 자리를 따로 든다
    const body = el('div', 'box-body td-body');   // 목록이 패널 가운데에 선다 (§8-3 · 2026-09-30)
    body.dataset.keep = 'shop';

    // 탭 없이 장비 목록 하나 [2026-09-30 사용자 지시 「장비와 재료 탭 삭제」] — 오른쪽 열 맨 위에 정해진 물약 셋(2026-09-28) ·
    //   그 아래 스킬 도안 셋 [2026-09-29 사용자 지시 · §8-3 · 2026-10-20 ~~스킬북~~ → 도안 · ADR-0680 · 물약 ↔ 도안 2026-10-30 · ADR-0952]
    body.appendChild(shopGoods(S.equip.map(equipGood), 'equip', S.list, S.potions.map(potionGood), S.blueprints.map(blueprintGood)));

    p.appendChild(body);
    band.append(p, shopSellPanel());

    // 상점 열 오른쪽 반 — 위 교역소 · 아래 특수상단이 높이를 반씩 나눈다 (2026-10-30 사용자 「특수상단자리를 위아래 반으로 나눠서 위에다가 교역소」 · §8-3 · ADR-0960)
    const side = el('div', 'c-shop-stack');
    /* 교역소 — 재료끼리 바꾸는 창구(상단 랭크가 연다 · 기획 §2-6 「교환」). 교환 비율이 미정이라 `?` 만 든 빈 네모만 선다 — 특수상단 물건 칸과 같은 칸 ·
       고를 수 없고 가격 · 툴팁 · 사기 줄이 없다 · 칸 수는 `mock.js:TRADE.post`(거짓) · 안 열렸으면 잠김 베일(특수상단과 같다) */
    const tp = el('div', 'panel');
    tp.appendChild(helpHeading('h2', '', `${t('td.trade')} <small class="todo-badge">${t('todo.badge')}</small>`, 'trade'));
    const tpBody = el('div', 'box-body td-body');
    tpBody.dataset.keep = 'shop-tr';
    if (!S.trade) {
        tpBody.classList.add('lock-host');
        tpBody.appendChild(lockVeil('shop_trade'));
    } else {
        const goods = el('div', 'td-goods');
        const unk = el('div', 'td-grid td-post');
        for (let i = 0; i < M.TRADE.post.slots; i++) unk.appendChild(el('div', 'td-slot', '<div class="inv-cell td-unknown">?</div>'));
        goods.appendChild(unk);
        tpBody.appendChild(goods);
    }
    tp.appendChild(tpBody);
    side.appendChild(tp);

    /* 특수상단 — **따로 선 패널**이다(ADR-0243) · 상점 열 오른쪽 반의 아래(ADR-0960). 상인이 **와 있을 때만** 카드가 선다. 없으면 「다음 상인까지」 한 줄이
       자리를 지킨다(§4-1 「값은 항상 찍는다」). ⚠ 남은 시간은 정보다 — 빨강 · 깜빡임 같은 재촉 연출을 안 붙이고
       지나간 상인도 세지 않는다 (기획 §2-6 의 방치형 계약) */
    const sp = el('div', 'panel');
    sp.appendChild(helpHeading('h2', '', `${t('td.special')} <small class="todo-badge">${t('todo.badge')}</small>`, 'special'));
    const spBody = el('div', 'box-body');
    spBody.dataset.keep = 'shop-sp';
    // 특수상단 방문은 상단 랭크가 연다 — 안 열렸으면 본문 위에 잠김 베일(자물쇠 + 「상단 n랭크 필요」) · 선술집 의뢰 · 도박장과 같다 (R137 · §13-1)
    if (!S.special) {
        spBody.classList.add('lock-host');
        spBody.appendChild(lockVeil('shop_special'));
    }
    else if (S.here) {
        const card = el('div', 'td-card');
        card.appendChild(el('div', 'td-card-h', `<b>${L(M.TRADE.special.who)}</b>${shopClock(S)}`));
        // 물건 칸 — 물건이 정해지지 않아 `?` 만 든 빈 네모다 · 고를 수 없고 가격 · 툴팁 · 사기 줄이 없다 (§8-3 · ADR-0782)
        const unk = el('div', 'td-grid');
        for (let i = 0; i < M.TRADE.special.slots; i++) unk.appendChild(el('div', 'td-slot', '<div class="inv-cell td-unknown">?</div>'));
        card.appendChild(unk);
        spBody.appendChild(card);
    } else spBody.appendChild(el('div', 'td-away', shopClock(S)));
    sp.appendChild(spBody);
    side.appendChild(sp);
    band.appendChild(side);
    page.appendChild(band);
    // 상단의 보관 칸은 클릭하면 판매 목록에 올린다. Ctrl 이동·분해함은 공통 조작을 따른다.
    page.appendChild(itemsPanel(h, { onPick: toggleShopSell, selUids: state.shopSell }));
    main.appendChild(page);
}

/**
 * 상점 탭의 시계 (SCREEN_DESIGN §8-3 · ADR-0223) — 앱 시계(`expTick`)가 이 탭을 보는 동안 부른다.
 * 방문이 바뀌는 순간(상인이 오거나 떠남 — 회차가 넘어가면 장비 목록도 갈린다) **다시 그리고**, 그 밖에는
 * 남은 시간 **글자만** 갈아 끼운다 — 계정 버튼 · 관전 중 자원 숫자와 같은 장치다(통째로 다시 그리면 올려 둔 툴팁이 걷힌다)
 */
function shopTick(at) {
    const v = SYS.game.shopVisit(G, at);
    const shown = state.shopShown;
    if (!shown || shown.cycle !== v.cycle || shown.here !== v.here) { render(); return; }
    // 상단 무료 교체가 열리는 순간 — 버튼이 무료로 바뀐다(손이 바쁘면 다음 빈 눈금 · `tavernTick` 과 같다 · ADR-0648)
    if ((at >= shown.freeAt) !== shown.free) { if (handBusy()) clockRender = true; else render(); return; }
    const txt = shopClockText(v);
    for (const n of document.querySelectorAll('.td-clock')) if (n.textContent !== txt) n.textContent = txt;
    const wait = tavernWaitText(shown.freeAt - at);
    for (const n of document.querySelectorAll('.td-roll .tv-wait')) if (n.textContent !== wait) n.textContent = wait;
}

/** 남은 시간 글자 — 와 있으면 떠나기까지, 없으면 다음 상인까지. 앱 시계가 **이 글자만** 갈아 끼운다(`shopTick`) */
const shopClockText = v => t(v.here ? 'td.leave' : 'td.next', { t: fmtDuration(v.remainMs) });
const shopClock = v => `<span class="td-clock">${shopClockText(v)}</span>`;

/** 칸 하나가 드는 것 — 장비는 굴린 아이템(`shopState.equip`) · `locked` = 안 열린 줄의 칸(상단 랭크 · ADR-0952) */
const equipGood = ({ item, gold, sold, locked }) => ({ item, gold, sold, locked, name: L(item.name), color: rarity(item.rarity).color });
/** 물약 칸 — `shopState.potions`(정해진 셋 · 매진 없음) · 이름은 `potion.csv` */
const potionGood = x => { const p = D.potions.find(r => r.id === x.id); return { potion: x, gold: x.gold, name: p ? L({ ko: p.ko, en: p.en }) : x.id, color: null }; };
/** 스킬 도안 칸 — `shopState.blueprints`(목록마다 굴린 도안 · 한 장씩 매진 · 가진 도안도 산다 — 쌓인다 · ADR-0460 · ADR-0680) · 이름은 스킬 이름 (ADR-0423) */
const blueprintGood = x => ({ blueprint: x, gold: x.gold, sold: x.sold, locked: x.locked, name: L(skillInfo(x.id).name), color: null });
/** 안 열린 줄의 칸 — 빈 칸 + 회색 닫힌 자물쇠 · 올리면 그 칸을 여는 건물 랭크 한 줄(영웅 띠 잠긴 칸과 같은 `tip-mini` · ADR-0913) · 고를 수 없다 ·
 *  그림 · ilvl · 가격은 안 선다 — 가격 자리는 비워 줄 높이를 지킨다 (§8-3 · ADR-0952) */
function shopLockSlot() {
    const txt = needText('shop_rows');
    const slot = el('div', 'td-slot');
    const c = el('div', 'inv-cell td-lock', lockIcon(true));
    bindTipNode(c, () => el('div', 'tip-card tip-mini', `<div class="tip-name">${txt}</div>`));
    c.setAttribute('aria-label', txt);
    slot.appendChild(c);
    slot.appendChild(el('div', 'td-price', '&nbsp;'));
    return slot;
}

/**
 * 의뢰 목표 한 줄 — **어휘마다 틀 하나**(`cm.goal.<axis>` · 몬스터 등급은 `cm.goal.elite|boss`)에 대상 이름과 수를 채운다 (§14).
 * 대상 이름은 데이터다 — 챕터(`chapter.csv`) · 종족(`monster_type.csv` — 검증을 지난 `SYS.commission.races`) · 몬스터 · 희귀도(`M.RARITY`)
 */
function commissionGoal(c) {
    const name = c.axis === 'chapter' ? chapterOf(c.ref)?.name
        : c.axis === 'race' ? SYS.commission.races.find(r => r.id === c.ref)?.name
        : c.axis === 'monster' ? monsterName(c.ref)
        : c.axis === 'rarity' ? M.RARITY[c.ref]
        : null;
    return t(c.axis === 'grade' ? `cm.goal.${c.ref}` : `cm.goal.${c.axis}`, { t: name ? L(name) : '', n: c.need.toLocaleString() });
}

/**
 * 의뢰 카드 — 종류 배지가 첫인상이고 옆이 **의뢰 등급 칩**(일반 · 매직 · 레어 — 아이템 희귀도 색), 그 아래가 목표 · 골드다.
 * 설명 줄은 달지 않는다 — 무엇이 목표를 채우는지는 도움말(`exp.commission.note`)이 든다 (§14 · ADR-0225).
 * **받은 카드는 제자리에서 진행 중이 된다** [2026-09-24 · ADR-0352] — 진행 막대 + 센 수 / 목표 · 다 채웠으면 [수령] · 아니면 [포기](두 번 — §3).
 * 판정(받을 수 있나 · 다 채웠나)은 `commissionState` 가 낸다 — 카드는 `canTake` · `done` 을 읽기만 한다. 명성은 안 찍는다(보류).
 * **종류 · 등급 이름은 CSV 의 `_kr`/`_en` 쌍**이라 `L()` 로 푼다
 */
function commissionCard(c, CS) {
    const k = D.commissionKinds[c.kind];
    const grade = SYS.commission.gradeById.get(c.grade);
    const card = el('div', `cm-card k-${c.kind}${c.taken ? ' taken' : ''}${c.done ? ' done' : ''}`);
    card.dataset.commission = c.no;
    card.appendChild(el('div', 'cm-kind', `${L(k)} <span class="cm-grade g-${c.grade}">${grade ? L(grade.name) : ''}</span>`));
    const goal = commissionGoal(c);
    card.appendChild(el('div', 'cm-goal', goal));
    if (c.taken) {
        const pct = Math.min(100, Math.round((c.have / c.need) * 100));
        card.appendChild(el('div', 'cm-prog', `<div class="bar"><i style="width:${pct}%"></i></div><span>${c.have.toLocaleString()} / ${c.need.toLocaleString()}</span>`));
    }
    card.appendChild(el('div', 'cm-rew', `<span class="cm-gold">${c.gold.toLocaleString()} G</span>`));

    const done = () => { state.cmArm = null; save(); render(); };
    if (!c.taken) {
        // 받을 칸이 없으면 흐리고(눌린다) 누르면 사유 — 안 열렸으면 지을 랭크 (§13-1 잠긴 자리 · 도박장 칸과 같은 문법)
        const b = el('button', `btn sm cm-go${c.canTake ? '' : ' dim'}`, t('cm.accept'));
        b.onclick = () => {
            if (!CS.open) { flashNeed('commission_board'); return; }
            const r = SYS.game.commissionTake(G, c.no);
            if (r.ok) { flash('cm.taken', { goal }); done(); }
            else flash(r.err === 'full' ? 'cm.err.full' : 'todo.lead', { n: CS.slots });
        };
        card.appendChild(b);
    } else if (c.done) {
        const b = el('button', 'btn sm primary cm-go', t('cm.claim'));
        b.onclick = () => {
            const r = SYS.game.commissionClaim(G, c.no);
            if (r.ok) { flash(r.fameUp ? 'cm.claimedUp' : 'cm.claimed', { g: r.gold.toLocaleString(), lv: r.fame.level }); done(); }
            else flash(r.err === 'notDone' ? 'cm.err.notDone' : 'todo.lead');
        };
        card.appendChild(b);
    } else {
        // [포기] — 쌓인 진행도를 버리므로 두 번 누른다(§3). 첫 누름은 「정말 포기」로 바꾸기만 한다
        const armed = state.cmArm === c.no;
        const b = el('button', `btn sm cm-go cm-drop${armed ? ' danger armed' : ''}`, t(armed ? 'cm.dropConfirm' : 'cm.drop'));
        b.onclick = () => {
            if (!armed) { state.cmArm = c.no; render(); return; }
            if (SYS.game.commissionDrop(G, c.no).ok) flash('cm.dropped');
            done();
        };
        card.appendChild(b);
    }
    return card;
}

/**
 * 아이콘 칸 격자 + 사기 줄 (SCREEN_DESIGN §8-3 · ADR-0223) — 칸은 인벤토리 칸(`.inv-cell`)과 같은 모양이고 **아래에 가격**이 선다.
 * **칸 누르기 = 고르기**(다시 누르면 풀림) · 사는 것은 사기 줄의 [사기] — 골드를 내는 되돌릴 수 없는 일이라 두 번 누른다(§3).
 * 고른 것은 상점 전체에서 하나다(`state.shopSel` — `src` 가 어느 격자인지 가른다).
 * @param src 'equip' — 특수상단 물건 칸은 이 격자를 안 쓴다(`?` 칸 · ADR-0782)
 */
function shopGoods(list, src, cycle, potions = [], bps = []) {
    const box = el('div', 'td-goods');
    const grid = el('div', `td-grid${src === 'equip' ? ' grouped' : ''}`);
    // 고른 것 — 물약 · 도안은 따로 든 목록이라 `src` 가 'potion' · 'blueprint' 이다 (2026-09-28 · 09-29 · 도안 2026-10-20)
    const sel = state.shopSel?.src === src ? list[state.shopSel.i] ?? null
        : state.shopSel?.src === 'potion' && src === 'equip' ? potions[state.shopSel.i] ?? null
        : state.shopSel?.src === 'blueprint' && src === 'equip' ? bps[state.shopSel.i] ?? null : null;
    // 장비 탭은 두 열 — 왼쪽 장비 3 × 3(무기 줄 + 방어구 두 줄) · 오른쪽 열 맨 위 물약 셋 · 그 아래 스킬 도안 셋
    //   [2026-09-29 사용자 지시 · ADR-0424 · 2026-10-30 사용자 「맨윗줄 … 무기3종이랑 물약 3종」 · §8-3 · ADR-0952] — 맨 윗줄(무기 · 물약)이 상단 r1 의 줄이다
    const side = src === 'equip' ? el('div', 'td-side') : null;
    const poor = g => G.resources.gold < g.gold;
    const h = heroById(state.heroUid);   // 띠에서 고른 영웅 — 장비 칸의 비교 상대 (ADR-0359)
    let group = null;
    list.forEach((g, i) => {
        // 장비는 **같은 부위끼리 붙여** 한 묶음으로 세운다 [사용자 지시] — 목록이 부위 순서로 오므로 부위가 바뀌는 자리에서 새 묶음을 연다 (§8-3).
        //   부위 하나가 묶음 하나다 — 무기 묶음은 맨 윗줄을 혼자 쓴다(CSS · ADR-0362)
        if (src === 'equip' && group?.dataset.part !== g.item.slot) {
            group = el('div', 'td-group');
            group.dataset.part = g.item.slot;
            grid.appendChild(group);
        }
        const host = src === 'equip' ? group : grid;
        // 안 열린 줄의 칸 — 자물쇠 칸이 제자리를 지킨다(묶음 · 격자는 열렸을 때와 같다 · ADR-0952)
        if (g.locked) { host.appendChild(shopLockSlot()); return; }
        const slot = el('div', 'td-slot');
        // 팔린 칸 — 그 자리에 흐리게 남고 가격 자리에 `팔림` · 고를 수 없다 (§8-3 · 2026-09-27)
        const cell = el('div', `inv-cell filled${sel === g ? ' td-picked' : ''}${g.sold ? ' gone' : ''}`);
        // 장비 — 인벤토리 칸과 같은 그림 · 희귀도 테두리 · 오른쪽 아래 ilvl.
        //   툴팁은 캐릭터 탭 가방 칸과 같은 VS 카드 — 상대는 **고른 영웅이 그 아이템을 끼울 자리**의 착용품이다 (§8-3 · ADR-0359).
        //   「이 아이템」 카드는 맥락이 없다(식으로 선다) — `heroCombatIf` 가 가진 아이템의 uid 만 받는다.
        //   착용 델타는 선다 — `heroCombatWith` 가 가방에 없는 물건도 받는다 (§6 · ADR-0618)
        //   반지 칸 힌트 · 「끼우면 꺼지는 전술」 줄은 안 단다 — 사는 것은 끼우는 것이 아니다
        cell.style.borderColor = g.color;
        cell.innerHTML = `<span class="inv-icon">${itemImg(g.item)}</span><span class="inv-lv">${t('ch.itemLv', { n: g.item.ilvl })}</span>`;
        bindTip(cell, g.item, h ? { compare: itemOf(h.equipped[SYS.game.equipTarget(h, g.item)]), compareCtx: heroSkillCtx(h), hero: h } : {});
        if (!g.sold) cell.onclick = () => { state.shopSel = sel === g ? null : { src, i, cycle }; render(); };
        slot.appendChild(cell);
        slot.appendChild(g.sold ? el('div', 'td-price muted', t('td.sold'))
            : el('div', `td-price${poor(g) ? ' no' : ''}`, `${g.gold.toLocaleString()} G`));
        host.appendChild(slot);
    });
    // 물약 묶음 — 오른쪽 열 맨 위(무기 줄 옆 · 상단 r1 의 줄) · 그림 · 오른쪽 아래 가진 개수 · 아래 가격 · 매진 없음 (§8-3 · ADR-0952)
    if (side && potions.length) {
        const pg = el('div', 'td-group td-potions');
        potions.forEach((g, i) => {
            const slot = el('div', 'td-slot');
            const cell = el('div', `inv-cell filled${sel === g ? ' td-picked' : ''}`);
            cell.innerHTML = `<span class="inv-icon">${potionImg(g.potion.id)}</span><span class="inv-lv">×${g.potion.have}</span>`;
            bindTipNode(cell, () => potionTipCard(g.potion.id, { heal: g.potion.heal }));
            cell.onclick = () => { state.shopSel = sel === g ? null : { src: 'potion', i, cycle }; render(); };
            slot.appendChild(cell);
            slot.appendChild(el('div', `td-price${poor(g) ? ' no' : ''}`, `${g.gold.toLocaleString()} G`));
            pg.appendChild(slot);
        });
        side.appendChild(pg);
    }
    // 스킬 도안 묶음 — 오른쪽 열 물약 아래 · 스킬 그림 + 왼쪽 위 「도안」 배지(리포트 도안 칸과 같다) · 아래 가격 · 산 칸은 「팔림」 · 안 열렸으면 자물쇠 칸 ·
    //   가진 도안도 고른다(쌓인다 · 장수는 안 단다 — ADR-0460) (§8-3 · ADR-0424 · ADR-0680 · ADR-0952) · 칸 클래스 `td-books` 는 자리 이름이라 그대로
    if (side && bps.length) {
        const bg = el('div', 'td-group td-books');
        bps.forEach((g, i) => {
            if (g.locked) { bg.appendChild(shopLockSlot()); return; }
            const slot = el('div', 'td-slot');
            const cell = el('div', `inv-cell filled${sel === g ? ' td-picked' : ''}${g.sold ? ' gone' : ''}`);
            cell.innerHTML = `<span class="inv-icon">${skillImg(skillInfo(g.blueprint.id))}</span>${bpTag()}`;
            bindTipNode(cell, () => skillTipCard({ id: g.blueprint.id }, h ? heroSkillCtx(h) : {}));
            if (!g.sold) cell.onclick = () => { state.shopSel = sel === g ? null : { src: 'blueprint', i, cycle }; render(); };
            slot.appendChild(cell);
            slot.appendChild(g.sold ? el('div', 'td-price muted', t('td.sold'))
                : el('div', `td-price${poor(g) ? ' no' : ''}`, `${g.gold.toLocaleString()} G`));
            bg.appendChild(slot);
        });
        side.appendChild(bg);
    }
    if (side) {
        const split = el('div', 'td-split');
        split.appendChild(grid);
        split.appendChild(side);
        box.appendChild(split);
    } else box.appendChild(grid);

    // 물약 수 — 사기 줄의 ×n 이 고른다(`state.shopPotionN` · 기본 1) · 가격은 그 수의 값이다 (§8-3 · 2026-10-23 사용자 「클릭하면 가격이 바뀌고 buy를 눌러야 사지도록」)
    const pn = sel?.potion ? state.shopPotionN ?? 1 : 1;
    const cost = sel?.potion ? SYS.game.shopPotionGold(sel.potion.id, pn) : sel?.gold;
    // 사기 줄 — 고른 것의 이름(희귀도 색) · 가격 · [사기]. 고른 것이 없으면 `—` 와 꺼진 [사기] (§8-3)
    const bar = el('div', 'td-buy', sel
        ? `<span class="td-buy-n"${sel.color ? ` style="color:${sel.color}"` : ''}>${sel.name}</span>
           <span class="td-price${poor({ gold: cost }) ? ' no' : ''}">${cost.toLocaleString()} G</span>`
        : '<span class="td-buy-n muted">—</span>');
    // 상단을 안 지었으면 흐리고 누르면 지을 랭크를 말한다 (§13-1 잠긴 자리 · ADR-0308)
    const open = SYS.game.hasFeature(G, 'shop');
    // 물약을 골랐으면 [구매] 왼쪽에 수 고르기 셋 — 누르면 그 수를 고른다(가격이 바뀐다) · 고른 것을 다시 누르면 1개로 · 사는 것은 [구매]
    //   수는 `[balance.csv:shop_potion_bulk_*]` · 사도 · 다른 물약을 골라도 고른 수는 남는다
    if (sel?.potion) for (const n of [1, 2, 3].map(k => D.balance[`shop_potion_bulk_${k}`])) {
        const m = el('button', `btn sm${pn === n ? ' on' : ''}`, `×${n}`);
        m.onclick = () => { state.shopPotionN = pn === n ? 1 : n; render(); };
        bar.appendChild(m);
    }
    const b = el('button', `btn sm primary${open ? '' : ' dim'}`, t('td.buy'));
    b.disabled = !sel;
    // 장비는 `game.shopBuy` 가 정산한다 — 골드를 내고 인벤토리 끝에 넣는다 (§8-3 · 2026-09-27)
    b.onclick = () => {
        if (!open) { flashNeed('shop'); return; }
        // 물약 — `game.shopPotionBuy` · 고른 수만큼(골드가 모자라면 하나도 안 산다) · 사도 고른 채 둔다(거듭 산다 · 매진 없음)
        if (sel?.potion) {
            const r = SYS.game.shopPotionBuy(G, sel.potion.id, pn);
            if (r.ok) { flash(pn > 1 ? 'td.boughtN' : 'td.bought', { name: sel.name, n: pn, g: r.gold.toLocaleString() }); save(); }
            else if (r.err === 'unbuilt') { flashNeed('shop'); return; }
            else flash(`td.err.${r.err === 'missing' ? 'stale' : r.err}`);
            render();
            return;
        }
        // 스킬 도안 — `game.shopBlueprintBuy` · 사면 고른 칸이 풀린다(한 장씩 매진) · 골드가 모자라면 고른 채 둔다 (ADR-0423 · ADR-0680)
        if (sel?.blueprint) {
            const r = SYS.game.shopBlueprintBuy(G, state.shopSel.i, state.shopSel.cycle, now());
            if (r.ok) { flash('td.bought', { name: sel.name, g: r.gold.toLocaleString() }); save(); }
            else if (r.err === 'unbuilt') { flashNeed('shop'); return; }
            else flash(`td.err.${r.err === 'missing' ? 'stale' : r.err}`);
            if (r.ok || r.err !== 'gold') state.shopSel = null;
            render();
            return;
        }
        const r = SYS.game.shopBuy(G, state.shopSel.i, state.shopSel.cycle, now(), invNo());   // 산 것은 보고 있는 인벤토리로 (ADR-0521)
        if (r.ok) { flash('td.bought', { name: sel.name, g: r.gold.toLocaleString() }); save(); }
        else if (r.err === 'unbuilt') { flashNeed('shop'); return; }
        else flash(`td.err.${r.err === 'missing' ? 'stale' : r.err}`);
        // 고른 칸은 사고 나면 풀린다 — 골드 · 인벤토리가 모자란 거절은 채우고 다시 누르도록 고른 채 둔다
        if (r.ok || !['gold', 'bagFull'].includes(r.err)) state.shopSel = null;
        render();
    };
    bar.appendChild(b);
    box.appendChild(bar);
    return box;
}

/* ═══════════ 도감 — 도감 경험치 모델 (monster_design §8 · 2026-10-10 처치 수 → 도감 경험치 · ADR-0587) ═══════════
   레벨 계산은 SYS.game(codex_level.csv). 여기는 누적 도감 경험치를 읽어 그리기만 한다 */

const codexLv = exp => SYS.game.codexLevel(exp);
/** 도서관이 안 연 도감 단계의 잠금 글 `{레벨: 「도서관 n랭크」}` — 연 단계 위만 선다 · 핍 작은 툴팁 · 몬스터 툴팁 단계 줄이 읽는다 (§9 · ADR-0762 · R339) */
const codexLocks = () => {
    const cap = SYS.game.limitsOf(G).codexLevel;
    return Object.fromEntries(D.codexLevels.map((_, i) => i + 1).filter(lv => lv > cap).map(lv => [lv, needText('codex_level', lv)]));
};
/** 카드 · 툴팁이 읽는 한 마리 — 누적 도감 경험치 · **먹는 레벨**(도서관이 연 단계에서 자른다 — `game.codexLevelOf`) · 잠금 글 */
const codexEntry = (m, locks) => ({
    ...m, exp: G.codexExp[m.id] ?? 0, lv: SYS.game.codexLevelOf(G, m.id), locks,
    lockHtml: Object.fromEntries(Object.entries(locks).map(([lv, text]) => [lv, lockLine(text)])),   // 몬스터 툴팁의 단계 줄 — tip.js 는 자물쇠 그림을 모른다
});

/** 카드 하나 — `grade` 는 초상만 가른다(수치는 몬스터 하나의 집계다 · ADR-0167) */
function monsterCard(m, grade) {
    const cum = D.codexLevels;                 // 레벨별 **누적 도감 경험치 문턱** 그대로 (codex_level.csv:exp_total)
    const lv = m.lv ?? codexLv(m.exp);         // 먹는 레벨 — 다 차고 테두리도 주황인 핍 (ADR-0762 · ADR-0931)
    const maxLv = cum.length;
    const src = monsterFace(m.id, grade);
    const name = L(monsterName(m.id));
    const c = sinColor(monsterSin(m.id));
    // 초상 밑에 아무것도 깔지 않는다 — 아트가 없으면 빈 원이다 (2026-09-06 사용자 지시 · faceChip 과 같은 규칙).
    // **툴팁은 파일명**이다 (2026-09-08 · §9) — 옛 이미지 도감의 「몬스터 초상」 타일이 들고 있던 한 줄이 여기로 왔다.
    // 같은 그림을 한 탭에서 두 번 그리지 않으면서 「어느 파일이 안 들어왔나」는 남긴다
    const faceHtml = src
        ? `<span class="face${m.boss ? ' boss' : ''}" title="${src.split('/').pop()}"><img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()"></span>`
        : `<span class="face none${m.boss ? ' boss' : ''}" style="background:${c}22;border-color:${c}66" title="${t('face.noArt', { name })}"></span>`;
    // 핍 하나 = 그 레벨 구간(앞 문턱 → 그 문턱)의 경험치가 차는 칸 — 카드 맨 아래 진행 막대는 없다 (§9 · ADR-0931)
    // 채움 색 = 그 단계가 열렸나 — 연 단계는 그 몬스터의 죄종 색(`--sin` · ADR-0932) · 안 연 단계는 회색으로 찬다 · 그 핍의 작은 툴팁 끝에 「도서관 n랭크」 (ADR-0762 · ADR-0925)
    const pips = Array.from({ length: maxLv }, (_, i) => {
        const lo = i > 0 ? cum[i - 1] : 0;
        const pct = Math.max(0, Math.min(100, (m.exp - lo) / (cum[i] - lo) * 100));
        const lock = m.locks?.[i + 1] ? ` · ${m.locks[i + 1]}` : '';
        return `<span class="pip${i < lv ? ' on' : lock ? ' locked' : ''}" title="${t('cx.lvTitle', { lv: i + 1 })} · ${t('cx.exp', { n: cum[i].toLocaleString() })}${lock}"><i style="width:${pct}%"></i></span>`;
    }).join('');
    // 분류 셋 `종족 · 부류 · 직업` 칩 = 본문 위끝 오른쪽(`.mon-kinds`) — 윗줄 칸(`.mon-top`)은 빈 칸으로 남아 이름 · 핍 자리를 지킨다 (ADR-0932 · 0929 · 0922 · ADR-0615 · 0588 이 비워 둔 줄)
    //   이름은 표 그대로 · 종족 칩은 그 종족 색(`monster_type.csv:color_hex` · ADR-0933) · 부류 칩은 무채색 · 직업 칩은 그 직업 색
    // 이름 · 핍 두 줄 오른쪽 = 스킬 아이콘 — 두 줄 높이로 크게 · 올리지 않아도 늘 보인다 · 카드엔 보상 글자가 없다
    // (ADR-0668 · 0666 — 칸은 `tip.js:monsterSkillIcons` 가 로직에 묻는다)
    const row = D.monsters[m.id];
    const cls = row?.cls;
    const race = SYS.commission?.races?.find(x => x.id === row?.monster_type);   // 종족 — `monster_type.csv`(관전 신원 · 툴팁 칩과 같은 이름)
    const raceHex = D.monsterTypeRows.find(r => r.type_id === row?.monster_type)?.color_hex;
    const base = D.codexRaces[row?.monster_base];                                 // 부류 — `monster_base.csv`(도감 Lv1 · Lv2 의 범위)
    const kinds = [
        race ? `<span class="base-chip"${raceHex ? ` style="color:${raceHex}"` : ''}>${L(race.name)}</span>` : '',
        base ? `<span class="base-chip">${L(base)}</span>` : '',
    ];
    const clsHtml = cls ? `<span class="cls-chip"${classColor(cls) ? ` style="color:${classColor(cls)}"` : ''}>${className(cls)}</span>` : '';
    // `data-mid` — 그린 뒤 몬스터 툴팁을 거는 손잡이 (`codexMonster` · ADR-0206)
    return `
        <div class="mon-card${m.boss ? ' boss' : ''}${lv === maxLv ? ' maxed' : ''}" data-mid="${m.id}">
            ${faceHtml}
            <div class="mon-body">
                <span class="mon-top"><span class="mon-kinds">${[...kinds, clsHtml].join('')}</span></span>
                <div class="mon-main">
                    <span class="mon-name">${name}${m.boss ? `<span class="b-tag">${t('kind.boss')}</span>` : ''}</span>
                    <span class="pips" style="--sin:${c}">${pips}</span>
                    ${monsterSkillIcons(m.id, 'mon-sk', 'sk-ico')}
                </div>
            </div>
        </div>`;
}

/* 세그먼트 다섯 — 몬스터는 수집 카드, 마스터리는 인게임 판, 나머지는 자산 목록이다(§9-1) */
const CODEX_SEGS = ['monster', 'character', 'item', 'skill', 'fx', 'mastery'];   // fx = 이펙트 (§9-1 · ADR-0559 — 0513 의 스킬 안쪽 탭에서 올라왔다)
/** 몬스터 카드의 초상 등급 — 라벨은 관전 카드가 쓰는 `kind.*` 를 그대로 부른다 (ADR-0167 · 문구를 새로 안 쓴다) */
const CODEX_GRADES = ['normal', 'elite'];
/** 아이템 안쪽 분류 — 무기와 비무기 장비(방어구 · 장신구)를 가르고, 소모품인 물약이 셋째다 (ADR-0179 · 물약 ADR-0314) */
const CODEX_ITEM_SEGS = ['weapon', 'armor', 'potion'];
const CODEX_SKILL_SEGS = ['basic', 'adv'];
const CODEX_MASTERY_SEGS = ['sin', 'class', 'adv'];
/** 챕터보스 카드가 차지하는 격자 칸 수 — 보스라서 두 칸이다 (ADR-0257). 남은 칸은 `???` 자리가 채운다 */
const CX_BOSS_SPAN = 2;

/**
 * 도감 (SCREEN_DESIGN §9 · 개정 2026-09-08 사용자 지시 — 「이미지 도감」 탭 흡수).
 * 세그먼트는 원정과 같은 **상단바**의 crumb 오른쪽에 선다(ADR-0174). 패널 안에는 중복 제목 줄이 없고,
 * 몬스터의 챕터 세그먼트부터 각 화면의 도구 줄이 시작한다.
 */
function renderCodex(main) {
    // 세그먼트는 패널 박스 바로 위에 선다 — 상단바가 아니다 (ADR-0273 · 0174 대체)
    const tabs = segmented(CODEX_SEGS.map(id => ({ id, label: t(`cx.seg.${id}`) })), state.codexSeg,
        id => { state.codexSeg = id; render(); });
    tabs.classList.add('cx-tabs');
    main.appendChild(tabs);
    // 박스 (ADR-0097) — 도구 줄은 서 있고 목록 · 묶음이 본문으로 스크롤한다 · `cx-box` = `D2 Min` 이 도구 줄을 판 위 폴더 탭으로 올리는 손잡이(§10-5 · ADR-0904)
    const p = el('div', 'panel page cx-box');
    ({ monster: codexMonster, character: codexCharacter, item: codexItem, skill: codexSkill, fx: codexFx, mastery: codexMastery })[state.codexSeg](p);
    main.appendChild(p);
}

/** 얼굴 스타일 고르개 — 몬스터 · 캐릭터 세그먼트가 같이 쓴다. 전환은 **전역**이다(`?face=` · localStorage 와 같은 자리 — §9-1).
 *  스타일이 하나면 고르개를 생략한다. 설정 판과 같은 고르개를 쓴다. */
function faceStylePicker(box) {
    if (M.FACE_STYLES.length < 2) return box;
    box.appendChild(el('span', 'muted', t('ix.style')));
    box.appendChild(faceStyleButtons());
    return box;
}

/** 설정 · 도감이 같은 아트 묶음(초상·스테이지 배경)과 저장값을 공유한다. */
function faceStyleButtons() {
    const buttons = segmented(M.FACE_STYLES.map(id => ({ id, label: id })), M.faceStyle(),
        id => { M.setFaceStyle(id); render(); });
    for (const [i, button] of [...buttons.children].entries()) {
        button.setAttribute('aria-pressed', String(M.FACE_STYLES[i] === M.faceStyle()));
    }
    return buttons;
}

/** 몬스터 세그먼트 — 도감 경험치 (§9). 레벨의 출처는 누적 도감 경험치(G.codexExp · 2026-10-10 처치 수 → 도감 경험치 · ADR-0587) */
function codexMonster(p) {
    // 장은 **이번 버전이 여는 장까지만** — 그 뒤(6 · 7장)는 버튼도 행도 없다 (§9 · ADR-0741) · 고른 장이 그 밖이면 첫 장
    const chs = D.chapterList.filter(c => c.id <= D.balance.chapter_open_max);
    const ch = chs.find(c => c.id === state.codexChapter) ?? chs[0];
    // **해금은 안 본다** — 그 안의 전 챕터·전 몬스터를 그대로 그린다 (SCREEN_DESIGN §9, 2026-09-06)
    const locks = codexLocks();   // 도서관이 안 연 단계 — 카드 · 툴팁이 같은 한 벌을 읽는다 (ADR-0762)
    const stages = codexStages().filter(st => st.chapter === ch.id).map(st => ({
        ...st, monsters: st.monsters.map(m => codexEntry(m, locks)),
    }));

    const bar = el('div', 'sub-bar');
    // 챕터 버튼은 상단바 탭 세그먼트와 같은 크기다 — `.cx-ch-seg` 가 메인 배율을 되돌린다 (§9 · 2026-09-21 사용자 지시)
    const chSeg = segmented(chs.map(c => ({ id: c.id, label: `Ch${c.id} ${L(c.name)}`, color: sinColor(c.sin) })), ch.id,
        id => { state.codexChapter = id; render(); });
    chSeg.classList.add('cx-ch-seg');
    bar.appendChild(chSeg);
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
    // 스테이지 행이 본문 높이를 똑같이 나눠 갖는다 — 늘어난 세로는 초상이 먹는다 (§9) · 마지막 행은 새 게임 줄 윗선 바로 위에서 끝난다 (ADR-0264)
    const body = el('div', 'box-body cx-mon');
    body.dataset.keep = 'codex:monster';
    // 카드 칸 격자 — 열 수는 그 챕터 스테이지의 최대 몬스터 수다. 모든 행의 카드 폭이 이 격자 하나를 따른다 (ADR-0255)
    const cols = Math.max(...stages.map(st => st.monsters.length));
    body.style.setProperty('--cx-cols', cols);
    p.appendChild(body);

    const last = stages.at(-1);
    for (const stage of stages) {
        const row = codexStageRow(stage);
        if (stage !== last || stage.monsters.length >= cols) { body.appendChild(row); continue; }
        // 마지막 행 — 챕터보스 스테이지 옆에 다음 번호의 `???` 자리가 남은 칸을 채운다 (ADR-0255 · 데이터가 없는 화면 자리).
        //   챕터보스 카드는 격자 두 칸이다(ADR-0257) — 몬스터가 칸보다 많으면 제 수만큼
        const span = Math.min(cols - 1, Math.max(CX_BOSS_SPAN, stage.monsters.length));
        const pair = el('div', 'cs-pair');
        row.style.setProperty('--k', span);
        pair.append(row, codexUnknownRow(ch.id, stage.num + 1, cols - span));
        body.appendChild(pair);
    }
}

/** 스테이지 한 행 — 이름 줄은 상자 밖 위, 상자는 몬스터 카드 줄만 감싼다 (ADR-0254) · 이름 줄은 번호 · 이름만이다 — 보상이 몬스터마다라 장소 합이 없다 (ADR-0667) */
function codexStageRow(stage) {
    const row = el('div', 'codex-stage');
    row.innerHTML = `
        <div class="cs-head">
            <div class="cs-title"><span class="muted">${M.roman(stage.num)}</span> ${L(stage.name)}</div>
        </div>
        <div class="mon-strip">${stage.monsters.map(m => monsterCard(m, state.codexGrade)).join('')}</div>`;
    // 몬스터 툴팁 — 초상 옆 이야기 · 아래 처치 단계 · **카드 옆에 붙는다**(읽는 카드라 커서를 따라가면 흔들린다 · ADR-0206 · ADR-0120).
    //   초상 · 핍의 작은 툴팁(파일명 · 문턱)은 그대로 둔다 — 사용자 지시 「나중에 수정」
    for (const node of row.querySelectorAll('.mon-card[data-mid]')) {
        const m = stage.monsters.find(x => String(x.id) === node.dataset.mid);
        if (m) bindTipNode(node, () => codexMonsterTipCard(m, state.codexGrade), { anchor: true });
    }
    bindMonSkillTips(row);
    return row;
}

/** 카드 안 스킬 아이콘마다 스킬 설명창 — 바탕 레벨의 숫자 · 출처 칩 없음 · 올린 동안 몬스터 툴팁 대신 선다(카드로 돌아오면 `bindTipNode` 가 되살린다)
 *  · 이름 한 줄(`title`)은 걷는다 (SCREEN_DESIGN §9 · ADR-0709 — 출정 창 적 구성 칸과 같은 레벨 · ADR-0705) */
function bindMonSkillTips(row) {
    for (const c of row.querySelectorAll('.mon-card .mon-sk [data-sk]')) {
        const up = Number(c.dataset.up) || 0;
        c.removeAttribute('title');
        bindTipNode(c, () => skillTipCard({ id: c.dataset.sk, up, lv: 1 + up }));
    }
}

/** `???` 자리 — 스테이지 표에 없는 다음 번호의 행 (ADR-0255). 앞 카드는 그 번호로 적힌 몬스터가 채우고(전투에 안 나온다 · ADR-0361)
 *  남은 칸은 이름 · 초상 없는 `???` 카드다 — 그 칸엔 툴팁이 없다 */
function codexUnknownRow(chapter, num, n) {
    const row = el('div', 'codex-stage unknown');
    const found = codexSlotMonsters(chapter, num).slice(0, n).map(m => codexEntry(m, codexLocks()));
    const card = `
        <div class="mon-card unknown">
            <span class="face none"></span>
            <div class="mon-body">
                <span class="mon-top"></span>
                <div class="mon-main">
                    <span class="mon-name">???</span>
                    <span class="pips">${'<span class="pip"></span>'.repeat(D.codexLevels.length)}</span>
                </div>
            </div>
        </div>`;
    row.innerHTML = `
        <div class="cs-head">
            <div class="cs-title"><span class="muted">${M.roman(num)}</span> ???</div>
        </div>
        <div class="mon-strip">${found.map(m => monsterCard(m, state.codexGrade)).join('')}${card.repeat(n - found.length)}</div>`;
    for (const node of row.querySelectorAll('.mon-card[data-mid]')) {
        const m = found.find(x => String(x.id) === node.dataset.mid);
        if (m) bindTipNode(node, () => codexMonsterTipCard(m, state.codexGrade), { anchor: true });
    }
    bindMonSkillTips(row);
    return row;
}

/* ═══════════ 도감의 자산 세그먼트 — 캐릭터 · 아이템 · 스킬 · 마스터리 (SCREEN_DESIGN §9-1) ═══════════
   신설 2026-09-06 「이미지 도감」 탭 · 도감으로 흡수 2026-09-08 (둘 다 사용자 지시).
   게임이 부르는 그림을 묶음별로 전부 펼친다. 아트를 넣고 확인하려면 그 그림이 나오는 화면까지 가야 하기 때문이다 —
   영웅 초상은 제 직업 풀이 뽑혀야 하고, 아이템은 그 부위가 드롭돼야 보고, 스킬 아이콘은 그 스킬을 배워야 뜬다.

   ⚠ **폴더를 읽는 화면이 아니다.** 목록의 SSOT 는 `mock.js` 의 경로 조립 상수(HERO_FACES ·
   WEAPON_BASE_STEMS · ITEM_BASE_ART_IDS · SKILL_ICON_FILES)와 `skill.csv` 다 — 렌더는 동기라
   파일 유무를 물을 수 없다(`skillIcon` 주석과 같은 이유). 코드가 안 부르는 파일(`faces/source/` · 아이콘 원본 폴더 `icons_source/` 전체 — 원본 PNG · 시트 · 여분)은 게임이 안 쓰므로 여기에도 안 뜬다. 파일이 없으면 `onerror` 로 img 만 빠져
   **빈 칸 + 파일명**이 남고, 그 빈 칸이 「이 자산이 비었다」는 신호다 (스타일마다 갖춘 장수가 다르다).

   ⚠ **몬스터 초상 묶음은 09-08 삭제** — 몬스터 세그먼트의 카드가 전 챕터·전 몬스터를 큰 초상으로 그린다(§9).
   타일이 들고 있던 파일명 한 줄만 그 카드 초상의 툴팁으로 옮겼다. */

/**
 * 타일 하나 — 그림 · 쓰임 이름 · 파일명. 게임에서 쓰는 그림을 그대로 넣는다(마스터리의 원형 문양도 PNG 자체에 든다).
 * `attr` 은 타일에 얹을 여분 속성(`data-skill` · `data-potion` · `data-mastery`). 격자를 문자열로 짓기 때문에 노드가 없어서,
 * 툴팁은 DOM 이 선 뒤에 이 속성을 찾아 건다.
 * `stem` 이면 파일명에서 확장자를 뗀다 — **조밀 격자(스킬)만 쓴다**(ADR-0075). 칸이 좁아 `.webp` 가 두 줄을 만들고,
 * 전부 webp 라 그 다섯 자가 말해 주는 것이 없다. 비교 대상은 어차피 스킬 id 와 **줄기**다
 */
const artTile = (src, name, shape, attr = '', stem = false) => `
    <div class="ix-tile" ${attr}>
        <span class="ix-art ${shape}">${src ? `<img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()">` : ''}</span>
        <span class="ix-name">${name}</span>
        <span class="ix-file muted">${src ? (f => stem ? f.replace(/\.[^.]+$/, '') : f)(src.split('/').pop()) : '—'}</span>
    </div>`;

/** 그룹 하나 — 머리(이름 · 폴더 경로 · 장수) + 타일 격자. `body` 를 주면 격자 대신 그것을 편다(일반 스킬의 티어 칸 · ADR-0475) — 장수는 `tiles` 가 센다 */
const artGroup = (title, dir, tiles, body = null) => `
    <div class="ix-group">
        <div class="ix-head">
            <span class="ix-title">${title}</span>
            <span class="ix-dir muted">${dir}</span>
            <span class="muted">${t('ix.count', { n: tiles.length })}</span>
        </div>
        ${body ?? `<div class="ix-grid">${tiles.join('')}</div>`}
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
    //   ⚠ 번호가 사라지는 것이 아니다 — 셋째 열의 파일명(`warrior_1.webp`)이 그 번호를 계속 든다
    const box = el('div', 'ix-body box-body');
    box.dataset.keep = 'codex:character';
    box.innerHTML = (D.classes ?? []).map(c => {
        const n = M.HERO_FACES[c.id] ?? 0;
        const tiles = Array.from({ length: n }, (_, i) =>
            artTile(M.facePath(`hero/${c.id}_${i + 1}.webp`), L(M.HERO_FACE_NAMES[`${c.id}_${i + 1}`]) || `${i + 1}`, 'box'));
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

/** 아이템 세그먼트 — 무기/방어구/물약을 한 번 더 가르고, 방어구는 장비 부위별로 · 물약은 종류별로 묶는다 (§9-1 · ADR-0179 · 0314) */
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
    } else if (state.codexItemSeg === 'potion') {
        // 물약 — **종류 하나가 묶음 하나**(`potion.csv:kind`)고 묶음 안의 순서는 CSV 행 순(= 단계 순)이다 (§9-1 · ADR-0314).
        // 이름은 **CSV 가 든다**(`L(row)`) — 무기 베이스처럼 i18n 에 같은 이름을 두 벌 두지 않는다.
        // 그림이 등록된 id 만 편다(방어구 베이스와 같은 규칙) · 칸 배경 `slot.webp` 는 어느 물약도 아니라 안 싣는다(ADR-0181 과 같은 이유)
        const rows = (D.potions ?? []).filter(row => M.POTION_ART_IDS.includes(row.id));
        box.innerHTML = [...new Set(rows.map(row => row.kind))].map(kind =>
            artGroup(t('ix.g.potion', { kind: t(`ix.pk.${kind}`) }), M.POTION_ART_DIR,
                rows.filter(row => row.kind === kind).map(row => artTile(M.potionArt(row.id), L(row), 'box', `data-potion="${row.id}"`, true)))
        ).join('');
    } else {
        // 비무기 베이스 — `equip_slot.csv` 의 부위 순서를 따르고, 각 부위가 소유한 `item_base.csv` id 로 그림 목록을 나눈다.
        // `ITEM_BASE_ART_IDS` 에 실제로 등록된 그림만 편다는 기존 규칙은 그대로다.
        box.innerHTML = D.slots.filter(slot => slot.id !== 'weapon').map(slot => {
            const baseIds = new Set((D.itemBases?.[slot.id] ?? []).map(base => base.id));
            const artIds = M.ITEM_BASE_ART_IDS.filter(id => baseIds.has(id));
            return artIds.length ? artGroup(L(slot), M.ITEM_BASE_ART_DIR,
                artIds.map(id => artTile(`${M.ITEM_BASE_ART_DIR}${id}${M.ICON_EXT}`, itemBaseName(id), 'box', '', true))) : '';
        }).join('');
    }
    p.appendChild(box);
    // 툴팁은 DOM 이 선 **뒤에** 건다 — 격자가 문자열이라 노드가 없다(스킬 세그먼트와 같은 문법 · `codexSkill`).
    //   카드는 게임이 쓰는 그것 그대로다 — 도감 전용 문구를 새로 쓰지 않는다 (§12 · tip.js:potionTipCard)
    for (const n of box.querySelectorAll('[data-potion]')) bindTipNode(n, () => potionTipCard(n.dataset.potion));
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
 *
 * **일반 스킬 탭은 스킬 도감이다** [2026-10-20 · ADR-0680 — ~~레벨 핍 · 진행 막대~~ ADR-0650] — 레벨 없는 목록이다. 타일 = 그림 · 이름
 * (파일명은 그림의 작은 툴팁 — 몬스터 초상과 같은 자리), 툴팁은 스킬 카드 + 획득처 · 레벨이 오르면 두 장이다(`tip.js:codexSkillTipCard`).
 */
function codexSkill(p) {
    const rows = D.skillRows ?? [];
    // 출처 칩은 안 단다 — 그룹 머리가 이미 직업을 말하고, `owner_kind` 는 이제 전부 `job` 이라 더 말해 주는 것이 없다
    // 일반 스킬 타일 = 그림 · 이름. 책이 안 되는 스킬(`skill.bookable` — 사제 소환)은 도안이 없어 툴팁이 스킬 카드 한 장이다 ·
    //   `data-codex` = 두 장 툴팁을 거는 손잡이
    const tile = r => {
        const id = r.skill_id, src = M.skillIcon(id), name = L(skillInfo(id).name);
        const file = src ? src.split('/').pop().replace(/\.[^.]+$/, '') : '';
        const art = `<span class="ix-art box"${file ? ` title="${file}"` : ''}>${src ? `<img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()">` : ''}</span>`;
        return `<div class="ix-tile ix-codex" data-skill="${id}"${SYS.skill.bookable(id) ? ' data-codex="1"' : ''}>${art}<span class="ix-name">${name}</span></div>`;
    };

    // 안쪽 탭 — **일반 스킬 · 전직 스킬** (ADR-0335 — ADR-0299 의 직업 탭 다섯 대체). 직업은 탭이 아니라 묶음이다.
    //   아이템 안쪽 세그먼트(ADR-0179)와 같은 자리 · 같은 모양
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(CODEX_SKILL_SEGS.map(id => ({ id, label: t(`ix.seg.${id}`) })), state.codexSkillSeg,
        id => { state.codexSkillSeg = id; render(); }));
    p.appendChild(bar);

    // **조밀 격자** (ADR-0075) — 그림만 작아지고 묶는 문법 · 타일이 든 것은 그대로다
    const box = el('div', 'ix-body dense box-body');
    box.dataset.keep = `codex:skill:${state.codexSkillSeg}`;
    const classes = D.classes ?? [];
    if (state.codexSkillSeg === 'adv') {
        // 전직 스킬 — **전직 하나가 묶음 하나**(ADR-0299)이고 순서는 직업(`class.csv` 행) 순 → `advance.csv:sort_order` 순이다.
        //   묶음 안은 `skill.csv` 의 `owner_kind=advance` 행(CSV 순) — 일반 탭과 같은 타일 · 같은 툴팁이다 [2026-10-02 · ADR-0472].
        //   그림 칸만 `adv` — 바탕이 전직 색이다(§2 「스킬 그림」 · ADR-0301)
        //   **직업 하나가 한 줄**이고 그 직업의 전직 박스가 줄에 나란히 선다(ADR-0336) — 줄 머리는 없다(전직 이름이 직업을 말한다)
        const advTile = r => artTile(M.skillIcon(r.skill_id), L(skillInfo(r.skill_id).name), 'box adv', `data-skill="${r.skill_id}"`, true);
        const advs = D.advanceRows ?? [];
        box.innerHTML = classes.map(c => advs.filter(a => a.class_id === c.id)
            .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
            .map(a => [a, rows.filter(r => r.owner_kind === 'advance' && r.owner_id === a.advance_id)])
            .filter(([, rs]) => rs.length))
            .filter(groups => groups.length)
            .map(groups => `<div class="ix-row">${groups.map(([a, rs]) =>
                artGroup(L({ ko: a.name_kr, en: a.name_en }), M.SKILL_ICON_DIR, rs.map(advTile))).join('')}</div>`).join('');
    } else {
        // 일반 스킬 — **직업 하나가 묶음 하나**로 다섯 직업이 한 화면에 선다(ADR-0075 · 0335). 그룹 안의 순서는 CSV 순(= priority 순).
        //   **스킬이 0개인 직업은 묶음이 안 선다** — 확장 직업(`release=expansion`)은 `class.csv` 에 행만 있고 스킬이 없다
        //   카드 안은 **칸 없이 같은 간격**(ADR-0478 — 0475 의 티어 칸 셋 대체) — 1 → 2 → 3티어(`skill.csv:tier`) · 티어 안은 CSV 순.
        //   열 폭은 **고정**(조밀 격자 칸 폭)이고 왼쪽부터 붙여 선다 — 그림이 직업 사이에서도 세로로 줄을 맞춘다.
        //   티어가 시작하는 그림 위에 「{n}티어」 · 2 · 3티어 시작 자리는 열 틈에 구분선(`.tier-start`)
        const ownOf = c => rows.filter(r => r.owner_kind === 'job' && r.owner_id === c.id)
            .sort((a, b) => a.tier - b.tier);   // 안정 정렬 — 티어 안은 CSV 순 그대로
        box.innerHTML = classes.map(c => {
            const own = ownOf(c);
            const cells = own.map((r, i) => {
                const first = i === 0 || own[i - 1].tier !== r.tier;
                return `<div class="ix-cell${first && i > 0 ? ' tier-start' : ''}">` +
                    `<span class="ix-tier-head muted">${first ? t('ix.tier', { n: r.tier }) : ''}</span>${tile(r)}</div>`;
            });
            const body = `<div class="ix-flat">${cells.join('')}</div>`;
            return own.length ? artGroup(t('ix.g.skillCls', { cls: className(c.id) }), M.SKILL_ICON_DIR, cells, body) : '';
        }).join('');
    }
    p.appendChild(box);

    // 툴팁은 DOM 이 선 **뒤에** 건다 (격자가 문자열이라 노드가 없다). 카드는 캐릭터 탭 · 관전과 같은 것을 그대로 부른다 —
    // 화면 전용 문구를 새로 쓰지 않는다 (§12 · tip.js:skillTipCard). 전투 맥락(주기 · 공격력)은 없으므로 문장이 그 조각을 접는다
    //   책이 되는 일반 스킬은 **두 장 · 카드 옆에 붙는다**(스킬 카드 + 획득처 · 레벨이 오르면 — ADR-0680 · 몬스터 툴팁과 같은 이유 · ADR-0206)
    for (const n of box.querySelectorAll('[data-skill]')) {
        const id = n.dataset.skill;
        if (n.dataset.codex) bindTipNode(n, () => codexSkillTipCard(id), { anchor: true });
        else bindTipNode(n, () => skillTipCard({ id }, { source: n.dataset.src }));
    }
}

/**
 * **이펙트 세그먼트** [2026-10-05 사용자 지시 · §9-1 · ADR-0513 · 세그먼트로 올라옴 ADR-0559] — 관전의 유닛 카드와 같은 카드를 스킬 하나에 한 장씩 깔고,
 * 카드를 누르면 그 스킬의 관전 이펙트가 그 카드에 선다(연출은 fx.js 가 관전 그대로 그린다 · 설정의 켜고 끄기와 상관없이 선다).
 * 첫 줄 = **그림체 탭**(`ART_STYLES`) + [▶ 전부 재생] — 탭은 그림 파일 하나만 바꾼다(관전은 늘 실전 그림체 · ADR-0559).
 * 묶음 = 기본 공격 → 직업(`class.csv` 행 순 · 안은 티어 → CSV 순 — 일반 탭과 같다) → 전직(직업 순 → `advance.csv:sort_order`) → 몬스터.
 * 그림이 준비된 오오라는 도감에서만 미리 본다(전투의 상시 오오라 제외는 유지). 사건이 둘인 스킬은 한 박자씩 차례로 선다
 */
let fxPreviewN = 0;   // 몇 번째 재생인가 — 흩어짐이 매번 달라진다(관전에서 사건마다 다른 것과 같다)
function codexFx(p) {
    const style = state.codexFxStyle;
    fxPreload(style);
    // 그림체 탭 — 아이템 · 스킬 안쪽 세그먼트와 같은 자리 · 같은 모양. 실전 그림체에는 「실전」이 붙는다
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(ART_STYLES.map(id => ({ id, label: id === fxArtStyle() ? t('ix.fxs.live', { name: t(`ix.fxs.${id}`) }) : t(`ix.fxs.${id}`) })), style,
        id => { state.codexFxStyle = id; render(); }));
    p.appendChild(bar);
    const rows = (D.skillRows ?? []).filter(r => r.cast !== 'aura' || SKILL_ART[r.skill_id]), effs = D.skillEffectRows ?? [];
    const groups = [{ title: t('bt.basicAttack'), cards: [{ id: null, kinds: ['basic'], ty: 'physical' }] }];
    const add = (title, rs) => {
        if (rs.length) groups.push({ title, cards: rs.map(r => ({ id: r.skill_id, ...previewOf(r.skill_id, effs.filter(e => e.skill_id === r.skill_id), r.target) })) });
    };
    const classes = D.classes ?? [], advs = D.advanceRows ?? [];
    for (const c of classes) add(t('ix.g.skillCls', { cls: className(c.id) }),
        rows.filter(r => r.owner_kind === 'job' && r.owner_id === c.id).sort((a, b) => a.tier - b.tier));
    for (const c of classes) for (const a of advs.filter(a => a.class_id === c.id).sort((x, y) => Number(x.sort_order) - Number(y.sort_order)))
        add(L({ ko: a.name_kr, en: a.name_en }), rows.filter(r => r.owner_kind === 'advance' && r.owner_id === a.advance_id));
    add(t('cx.seg.monster'), rows.filter(r => r.owner_kind === 'monster'));

    // 카드 = 관전 카드(`.unit` — 초상 칸 + 오른쪽 칸 · 팝업 층)를 그대로 쓰고 오른쪽 칸만 스킬 그림 · 이름이다. 맞는 쪽은 몬스터 카드
    const card = (c, gi, ci) => {
        const icon = c.id ? M.skillIcon(c.id) : null, name = c.id ? L(skillInfo(c.id).name) : t('bt.basicAttack');
        return `<div class="unit-slot cx-fx-card"><div class="unit enemy" data-g="${gi}" data-c="${ci}"${c.id ? ` data-skill="${c.id}"` : ''}>` +
            `<div class="unit-body"><div class="sprite"></div><div class="cx-fx-info">` +
            `${icon ? `<img src="${icon}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span>${name}</span></div></div>` +
            `<div class="pop-layer"></div></div></div>`;
    };
    const box = el('div', 'ix-body box-body cx-fx');
    box.dataset.keep = 'codex:fx';   // 그림체가 바뀌어도 스크롤은 그 자리 — 같은 스킬을 견준다
    box.innerHTML = groups.map((g, gi) => `<div class="ix-group"><div class="ix-head"><span class="ix-title">${g.title}</span>` +
        `<button class="btn sm cx-fx-play" data-g="${gi}">▶</button></div>` +
        `<div class="cx-fx-grid">${g.cards.map((c, ci) => card(c, gi, ci)).join('')}</div></div>`).join('');
    p.appendChild(box);

    // 카드 하나 재생 — 다시 그리지 않는다(카드 안에 조각만 붙었다 스스로 걷힌다)
    const play = c => c.kinds.forEach((k, i) => setTimeout(() => fxPreview(++fxPreviewN, c.u, c.id, k, c.ty, style), i * 600));
    for (const n of box.querySelectorAll('.unit[data-g]')) {
        const c = groups[+n.dataset.g].cards[+n.dataset.c];
        c.u = { key: c.id ?? 'basic', side: 'enemy', node: n };
        n.onclick = () => play(c);
        if (c.id) bindTipNode(n, () => skillTipCard({ id: c.id }, {}));
    }
    for (const b of box.querySelectorAll('.cx-fx-play')) b.onclick = () => groups[+b.dataset.g].cards.forEach(play);
    const all = el('button', 'btn sm cx-fx-all', t('ix.fx.playAll'));
    all.onclick = () => groups.forEach(g => g.cards.forEach(play));
    bar.appendChild(all);
}

/** 마스터리 세그먼트 — 죄종 · 직업 · 전직별로 인게임 판을 세 개씩 편다. 실제 랭크·영웅 소속은 읽지 않는다. */
function codexMastery(p) {
    const rows = D.masteryNodes ?? [];
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(CODEX_MASTERY_SEGS.map(id => ({ id, label: t(`ix.mastery.${id}`) })), state.codexMasterySeg,
        id => { state.codexMasterySeg = id; render(); }));
    p.appendChild(bar);

    const previewNode = row => {
        const unlockLevel = row.unlock_key === '-' ? 1 : D.balance[row.unlock_key];
        const gate = SYS.hero.masteryById[row.node_id]?.gate ?? null;
        return {
            id: row.node_id, stat: row.stat, name: { ko: row.name_kr, en: row.name_en }, tier: row.tier,
            value: D.balance[row.value_key], maxRank: D.balance[row.max_rank_key],
            rank: 0, total: 0, unlockLevel, unlocked: unlockLevel <= 1,
            canLearn: false, gate, on: true,
            cond: SYS.hero.masteryById[row.node_id]?.cond ?? null,   // 조건부 칸의 조건 한 줄 (2026-10-05)
        };
    };
    const nodesFor = (tree, owner) => rows
        .filter(row => row.tree_kind === tree && (row.owner_id === '*' || row.owner_id === owner))
        .map(previewNode);
    const classes = (D.classes ?? []).filter(c => rows.some(row => row.tree_kind === 'class' && row.owner_id === c.id));
    const box = el('div', 'codex-mastery-grid box-body');
    box.dataset.keep = `codex:mastery:${state.codexMasterySeg}`;
    if (state.codexMasterySeg === 'sin') {
        for (const id of Object.keys(M.SINS)) box.appendChild(masteryBox({
            tag: t('ix.mastery.sin'), title: t('sk.sinTree', { sin: sinName(id) }),
            nodes: nodesFor('sin', id), extraSlot: true, preview: true, sin: id,
        }));
    } else if (state.codexMasterySeg === 'class') {
        for (const c of classes) box.appendChild(masteryBox({
            tag: t('ix.mastery.class'), title: t('sk.mastery', { cls: className(c.id) }),
            nodes: nodesFor('class', c.id), extraSlot: true, preview: true, cls: c.id,
        }));
    } else {
        // 전직 — **갈래 하나가 판 하나** · 직업 하나가 한 줄(갈래 셋 · `class.csv` 행 → `advance.csv:sort_order`) (§9-1 · ADR-0557)
        const nodesBy = new Map();
        for (const r of D.advanceNodeRows ?? []) {
            const hold = Number(r.hold) === 1;
            if (!nodesBy.has(r.skill_id)) nodesBy.set(r.skill_id, []);
            nodesBy.get(r.skill_id).push({ slot: Number(r.slot), hold, desc: hold ? null : { ko: r.desc_kr, en: r.desc_en } });
        }
        const nodeOf = (id, slot) => (nodesBy.get(id) ?? []).find(x => x.slot === slot) ?? null;
        const skillsOf = a => (D.skillRows ?? []).filter(r => r.owner_kind === 'advance' && r.owner_id === a.advance_id)
            .sort((x, y) => Number(x.priority) - Number(y.priority)).map(r => r.skill_id);
        for (const c of D.classes ?? []) for (const a of (D.advanceRows ?? []).filter(a => a.class_id === c.id)
            .sort((x, y) => Number(x.sort_order) - Number(y.sort_order))) {
            const skills = skillsOf(a);
            if (skills.length) box.appendChild(codexAdvanceBoard(a, c, skills, nodeOf));
        }
    }
    p.appendChild(box);
}

/**
 * 도감 전직 판 — 스킬 창의 전직 판(`advanceBoard`)과 같은 격자를 **읽기 전용**으로 편다 (§9-1 · ADR-0557).
 * 윗줄 = 갈래의 전직 스킬 셋(툴팁 = 스킬 카드 Lv.1) · 아래 세 줄 = 스킬마다 제 열에 가지 ② · ③ · ④. 누를 수 없다
 */
function codexAdvanceBoard(a, c, skills, nodeOf) {
    const box = el('div', 'sk-box adv-board');
    const cell = id => `<div class="sk-cell icon-only" data-advskill="${id}" aria-label="${L(skillInfo(id).name)}"><span class="adv-ico" aria-hidden="true">${skillImg({ id })}</span></div>`;
    box.innerHTML = `
        <div class="sk-box-head">
            <span class="sk-tag">${t('ix.mastery.adv')}</span><span class="sk-title">${L({ ko: a.name_kr, en: a.name_en })}</span>
            <span class="muted sk-sub">${className(c.id)}</span>
        </div>
        <div class="sk-grid">
            <div class="sk-row">${skills.map(cell).join('')}</div>
            ${[2, 3, 4].map(slot => `<div class="sk-row">${skills.map(id => advBranchCell(nodeOf(id, slot), id, slot)).join('')}</div>`).join('')}
        </div>`;
    box.querySelectorAll('[data-advskill]').forEach(sc => bindTipNode(sc, () => skillTipCard({ id: sc.dataset.advskill }, {})));
    bindAdvNodeTips(box, nodeOf);
    return box;
}

/* ═══════════ 도움말 ═══════════
   2026-08-26 사용자 지시 — 인게임 패널에는 설명 문장을 두지 않는다. 규칙·근거·미구현 안내는 전부 이 탭으로 모았다.
   실제 탭의 사용법과 규칙을 한/영 문구로 정리하고, 수치는 같은 시스템과 CSV에서 조회한다 (SCREEN_DESIGN §12 · ADR-0946).
   주제마다 독립된 폴더 탭을 두고, 고른 폴더 본문만 박스 안에서 스크롤한다 (ADR-0964). */

/** 왼쪽 탭 순서와 같은 목차. 잠긴 탭도 안내하며, 개발 전용 탭은 NAV_GROUPS가 가릅니다.
 * 문구는 i18n의 help.<tab>.<topic>에, 값은 실제 시스템/CSV 조회 결과에 둡니다 (ADR-0946). */
function helpSections() {
    const B = D.balance;
    const limits = SYS.game.limitsOf(G);
    const topics = {
        expedition: ['first_steps', 'start', 'rounds', 'stages', 'repeat', 'farming', 'spectate', 'controls', 'rewards', 'firstclear', 'review', 'shrines', 'difficulty', 'hell_debuffs', 'offline'],
        explore: ['map', 'purpose', 'depart', 'time', 'claim', 'recall'],
        party: ['members', 'leader', 'formation', 'potions', 'threshold', 'tactics', 'tactic_choices', 'changes'],
        character: ['identity', 'stats', 'growth', 'goblin', 'equipment', 'equipment_slots', 'rarity', 'sins', 'inventory', 'salvage', 'skills', 'weapon_skills', 'speed', 'defenses', 'penetration', 'damage_kinds', 'critical_effects', 'farming_stats', 'ailments', 'channeling', 'mastery', 'dismiss'],
        research: ['build', 'first_steps', 'requirements', 'unlocks', 'locked'],
        tavern: ['hire', 'choosing', 'reroll', 'keep', 'visitors', 'commissions', 'fame', 'gambling'],
        shop: ['buy', 'restock', 'consumables', 'blueprints', 'special'],
        forge: ['overview', 'smith', 'potions', 'upgrade', 'combine', 'craft'],
        library: ['basics', 'craft', 'learn', 'upgrade', 'advance', 'points'],
        resource: ['lines', 'production', 'materials', 'research', 'assignment', 'hero_effects', 'jobs'],
        colosseum: ['prepare', 'floors', 'retry', 'rules'],
        arena: ['rating', 'opponents', 'friendly', 'results'],
        codex: ['monsters', 'classification', 'race_traits', 'family_formation', 'family_pressure', 'milestones', 'library_unlocks', 'art', 'skills', 'effects'],
        help: ['browse', 'common_terms', 'controls', 'when_stuck', 'settings', 'newgame', 'saving', 'away'],
        lab: ['generator', 'rolling', 'results', 'raid_overview', 'raid_patterns', 'raid_trial'],
    };
    const common = {
        party: limits.party, expeditions: limits.expeditions, restart: B.repeat_restart_sec,
        hours: B.explore_hours, slots: limits.exploreSlots, perHero: B.explore_cave_items_per_hero,
        cooldown: B.potion_cooldown_sec, duelSize: SYS.arena.teamSize,
        starterCount: B.party_size_max,
        levelCap: B.hero_level_cap, castCharges: B.cast_charge_max, offlineHours: B.dispatch_offline_cap_hours,
        armyCount: D.monsterBaseRows.find(r => r.base_id === 'Army').gimmick_n,
        aberrationCap: D.monsterBaseRows.find(r => r.base_id === 'Aberration').gimmick_n,
    };
    const args = {
        'tavern.hire': { hire: B.tavern_hire_cost.toLocaleString() },
        'tavern.reroll': { refresh: B.tavern_refresh_hours, reroll: B.tavern_reroll_cost.toLocaleString() },
        'tavern.commissions': { slots: limits.commissionSlots },
        'tavern.gambling': {
            lines: SYS.gamble.lines.length, trigger: B.gamble_hold_trigger,
            respins: B.gamble_hold_respins, batch: B.gamble_batch_spins,
        },
        'shop.restock': { refresh: B.shop_refresh_hours, reroll: B.shop_reroll_cost.toLocaleString() },
        'library.craft': { gold: B.book_craft_gold.toLocaleString(), dust: B.book_craft_dust, herb: B.book_craft_herb },
        'library.learn': { level: B.skillbook_learn_level },
        'library.advance': { level: B.advance_unlock_level, gold: B.advance_gold.toLocaleString() },
        'library.points': { interval: B.advance_point_interval },
        'resource.production': { hours: B.dispatch_offline_cap_hours },
        'codex.monsters': { per: D.difficultyList.map(d => `${L(d.name)} ${d.codexExp}`).join(' · ') },
        'codex.milestones': { list: D.codexLevels.map(n => n.toLocaleString()).join(' · ') },
    };
    return NAV_GROUPS.flatMap(([, ids]) => ids).map(id => ({
        id,
        title: t(`nav.${id}`),
        groups: topics[id].map(topic => {
            const raidTopic = id === 'lab' && topic.startsWith('raid_');
            const key = raidTopic ? `help.raid.${topic.slice(5)}` : `help.${id}.${topic}`;
            const body = [t(`${key}.body`, { ...common, ...args[`${id}.${topic}`] })];
            // 기본 능력치 설명은 카드와 같은 사전 — 도움말에서도 일곱 효과를 바로 읽습니다.
            if (id === 'character' && topic === 'stats') {
                body.push(...D.heroAttributes.map(a => `<b>${L(a)}</b> — ${t(`st.desc.${a.id}`).replaceAll('<br>', ' · ')}`));
            }
            return { id: topic, h: raidTopic ? `${t('lab.tool.raid')} · ${t(`${key}.title`)}` : t(`${key}.title`), body };
        }),
    }));
}

/* ═══════════ 실험실 (SCREEN_DESIGN §18 · ADR-0580 · ADR-0610) ═══════════
   **개발 장치다** — 게임의 굴림을 손으로 돌려 본다. 굴림은 로직이 한다(`battle.rollMonsterDrop` — 스폰 · 처치와 같은 함수) ·
   조건 줄도 로직이 낸다(`battle.monsterGearSpec` · `game.stageLevel`). 렌더러는 고른 값과 씨앗만 넘긴다.
   **세이브와 무관하다** — 굴린 것은 `state.lab.rolls` 에만 산다(인벤토리에 안 들어간다).
   걷어내려면 `NAV_GROUPS` 의 `lab` · 이 묶음 · `?lab=` 분기 · style.css 「실험실」 섹션 · i18n `nav.lab` · `lab.*` (§18) */

/** 도구 순서 — 아이템 생성기 오른쪽에 레이드 연습을 둔다. */
const LAB_TOOLS = ['item', 'raid'];
/** 기록 칸 상한 — 넘치면 오래된 것부터 빠진다 · 화면 상수다(CSV 가 아니다 · §18) */
const LAB_KEEP = 60;

/** 지금 고른 것 — 챕터 · 그 챕터 장소들 · 몬스터 · 등급 · 단 · 스테이지 레벨. 고른 값이 사라졌으면 첫 것으로 떨어진다 */
function labPick() {
    const L0 = state.lab;
    const ch = chapterOf(L0.chapter) ?? D.chapterList[0];
    // 장소마다 일반몹(idx 순) + 보스 — 도감 몬스터 목록과 같은 몬스터 · 전투에 안 나오는 `???` 자리는 없다 (§18)
    const places = codexStages().filter(st => st.chapter === ch.id);
    const all = places.flatMap(st => st.monsters.map(m => ({ ...m, place: st })));
    const pick = all.find(m => m.id === L0.monster) ?? all[0];
    // 보스는 제 등급 하나(누를 수 없다) · 일반몹은 일반 · 정예
    const grade = pick.boss ? D.monsters[pick.id].spawn_grade : L0.grade === 'elite' ? 'elite' : 'normal';
    const diff = D.difficulties[L0.diff] ? L0.diff : D.difficultyList[0].id;
    // 스테이지 레벨 — 안 정했으면 그 장소 첫 칸의 그 단 레벨이다 (§18 · ADR-0610)
    const level = L0.level ?? SYS.game.stageLevel(pick.place.id, diff);
    return { ch, places, pick, grade, diff, level };
}

/** n 번 굴린다 — 한 번 = 그 몬스터 한 마리에 차림을 입히고 하나를 떨어뜨린다. 씨앗은 결투장과 같은 무작위 · 파티가 없어 매직찬스 0 */
function labRoll(n) {
    const { pick, grade, level, diff } = labPick();
    for (let i = 0; i < n; i++) {
        const r = SYS.battle.rollMonsterDrop(makeRng(crypto.getRandomValues(new Uint32Array(1))[0]), pick.id, grade, level, 0, diff);
        if (r?.drop) state.lab.rolls.unshift(r.drop);
    }
    state.lab.rolls.length = Math.min(state.lab.rolls.length, LAB_KEEP);
}

function renderLab(main) {
    // 도구 탭 줄 — 도감 세그먼트와 같은 자리(박스 바로 위 · ADR-0580)
    const selected = LAB_TOOLS.includes(state.lab.tool) ? state.lab.tool : LAB_TOOLS[0];
    const tabs = segmented(LAB_TOOLS.map(id => ({ id, label: t(`lab.tool.${id}`) })), selected,
        id => { state.lab.tool = id; render(); });
    tabs.classList.add('cx-tabs');
    tabs.dataset.labTools = '';
    main.appendChild(tabs);
    if (selected === 'raid') { renderRaid(main); return; }
    const p = el('div', 'panel page lab');
    labItem(p);
    main.appendChild(p);
}

/** 아이템 생성기 — 왼쪽 조건 · 오른쪽 결과 (§18) */
function labItem(p) {
    const cur = labPick();
    const body = el('div', 'box-body lab-item');
    body.appendChild(labCond(cur));
    body.appendChild(labOut());
    p.appendChild(body);
}

/** 조건 패널 — 챕터 · 몬스터 · 등급 · 난이도 · 스테이지 레벨 · 조건 줄 · [굴리기] [×10] */
function labCond({ ch, places, pick, grade, diff, level }) {
    const col = el('div', 'lab-cond');
    col.dataset.keep = 'lab:cond';
    const row = (key, node) => {
        const r = el('div', 'lab-row');
        r.appendChild(el('span', 'lab-h', t(key)));
        r.appendChild(node);
        col.appendChild(r);
        return r;
    };
    // 챕터 — 도감 몬스터와 같은 줄 · 죄종 색 · 표에 있는 전부(6 · 7장도 · §18)
    const chSeg = segmented(D.chapterList.map(c => ({ id: c.id, label: `Ch${c.id} ${L(c.name)}`, color: sinColor(c.sin) })), ch.id,
        id => { Object.assign(state.lab, { chapter: id, monster: null, level: null }); render(); });
    row('lab.h.chapter', chSeg);
    // 몬스터 — 장소마다 한 줄: 장소 이름 + 칩(얼굴 + 이름 · 일반몹 뒤에 보스). 고르면 레벨은 그 장소 첫 칸으로 돌아간다
    const mons = el('div', 'lab-places');
    for (const st of places) {
        const line = el('div', 'lab-place');
        line.appendChild(el('span', 'lab-place-name', `<span class="muted">${M.roman(st.num)}</span> ${L(st.name)}`));
        const chips = el('div', 'lab-chips');
        for (const m of st.monsters) {
            const b = el('button', `lab-mon${m.id === pick.id ? ' on' : ''}${m.boss ? ' boss' : ''}`,
                `${faceChip(m.id)}<span class="lab-mon-name">${L(monsterName(m.id))}</span>`);
            b.onclick = () => { Object.assign(state.lab, { monster: m.id, level: null }); render(); };
            chips.appendChild(b);
        }
        line.appendChild(chips);
        mons.appendChild(line);
    }
    row('lab.h.monster', mons).classList.add('top');
    // 등급 — 보스는 제 등급 하나(누를 수 없다) · 등급을 바꿔도 레벨은 그대로다
    const grades = pick.boss ? [{ id: grade, label: t('kind.boss'), disabled: true }]
        : ['normal', 'elite'].map(id => ({ id, label: t(`kind.${id}`) }));
    row('lab.h.grade', segmented(grades, grade, id => { state.lab.grade = id; render(); }));
    // 난이도 — 원정 난이도 탭과 같은 이름 · 바꾸면 레벨이 그 단으로 돌아간다 (ADR-0610)
    row('lab.h.diff', segmented(D.difficultyList.map(d => ({ id: d.id, label: L(d.name) })), diff,
        id => { Object.assign(state.lab, { diff: id, level: null }); render(); }));
    // 스테이지 레벨 — `−` 숫자 `+` · 1 ~ 만렙
    const lv = el('div', 'lab-lv');
    const step = d => { state.lab.level = Math.max(1, Math.min(D.balance.hero_level_cap, level + d)); render(); };
    const minus = el('button', 'btn sm', '−'); minus.onclick = () => step(-1); minus.disabled = level <= 1;
    const plus = el('button', 'btn sm', '+'); plus.onclick = () => step(1); plus.disabled = level >= D.balance.hero_level_cap;
    lv.append(minus, el('b', 'lab-lv-n', String(level)), plus);
    row('lab.h.level', lv);

    // 조건 줄 — 로직이 낸 값 그대로 (`monsterGearSpec`) · 언제나 입는 부위는 밝게 · 확률로 입는 부위는 흐리게 + 그 단의 확률 (ADR-0610)
    const sp = SYS.battle.monsterGearSpec(pick.id, grade, level, diff);
    const cond = el('div', 'lab-spec');
    const part = (id, opt) => {
        const def = slotDef(id), art = M.slotArt(id);
        return `<span class="lab-part${opt ? ' opt' : ''}" title="${L(def)}">${art ? `<img src="${art}" alt="" loading="lazy" onerror="this.remove()">` : def?.icon ?? ''}</span>`;
    };
    const chance = sp.optional.length ? `<span class="lab-chance">${Math.round(sp.wearChance * 100)}%</span>` : '';
    cond.innerHTML = `
        <div class="lab-row"><span class="lab-h">${t('lab.h.slots')}</span><span class="lab-parts">${sp.fixed.map(id => part(id, false)).join('')}${sp.optional.map(id => part(id, true)).join('')}${chance}</span></div>
        <div class="lab-row"><span class="lab-h">${t('lab.h.ilvl')}</span><b>${sp.ilvlMin} ~ ${sp.ilvlMax}</b></div>
        <div class="lab-row"><span class="lab-h">${t('lab.h.weights')}</span><span>${SYS.item.rarities.slice(0, SYS.item.rarities.indexOf(sp.rarityMax) + 1)   // 그 단이 여는 위 끝까지만 (R342 · ADR-0767)
            .map(r => `<span style="color:${rarity(r).color}">${L(rarity(r))} ${sp.rarityWeights[r]}</span>`).join(' · ')}</span></div>`;
    col.appendChild(cond);

    // [굴리기] · [×10]
    const foot = el('div', 'lab-foot');
    for (const [key, n] of [['lab.roll', 1], ['lab.roll10', 10]]) {
        const b = el('button', `btn${n === 1 ? ' primary' : ''}`, t(key));
        b.onclick = () => { labRoll(n); render(); };
        foot.appendChild(b);
    }
    col.appendChild(foot);
    return col;
}

/** 결과 패널 — 마지막 드롭의 아이템 카드(펼친 채) · 기록 칸(최신순 · 인벤토리 칸 모양 · 올리면 카드) · 머리 줄 개수 · [비우기] */
function labOut() {
    const col = el('div', 'lab-out');
    col.dataset.keep = 'lab:out';         // 다시 그려도 스크롤을 되찾는다 (ADR-0097) — 열이 따로 스크롤한다
    const rolls = state.lab.rolls;
    const card = el('div', 'lab-card');
    const last = tipCard(rolls[0], t('tip.this'));
    if (last) card.appendChild(last); else card.appendChild(el('span', 'muted', '—'));
    col.appendChild(card);

    const head = el('div', 'lab-log-head');
    const by = Object.keys(M.RARITY).map(r => [r, rolls.filter(it => it.rarity === r).length]).filter(([, n]) => n);
    head.appendChild(el('span', 'lab-log-count', `${t('lab.count', { n: rolls.length })}${by.length ? ` · ${by
        .map(([r, n]) => `<span style="color:${rarity(r).color}">${L(rarity(r))} ${n}</span>`).join(' · ')}` : ''}`));
    // 비우기 — 한 번 누름(화면 상태뿐이라 잃는 것이 없다 · §18)
    const clear = el('button', 'btn sm', t('lab.clear'));
    clear.disabled = !rolls.length;
    clear.onclick = () => { state.lab.rolls = []; render(); };
    head.appendChild(clear);
    col.appendChild(head);

    const grid = el('div', 'inv-cells lab-log');
    for (const it of rolls) {
        const cell = el('div', 'inv-cell filled');
        cell.style.borderColor = rarity(it.rarity).color;
        cell.innerHTML = `<span class="inv-icon">${itemImg(it)}</span><span class="inv-lv">${t('ch.itemLv', { n: it.ilvl })}</span>`;
        if (it.rarity === 'unique') cell.classList.add('shine');
        bindTip(cell, it);                 // 가방에 없는 것 = 「이 아이템」(탐험 결과 칸과 같다)
        grid.appendChild(cell);
    }
    col.appendChild(grid);
    return col;
}

function renderRaid(main) {
    if (!raidSession || raidSession.owner !== G) raidSession = createRaidSession(G);
    if (!raidSession.run && raidSession.source === 'own') raidSession.teams = null;
    stopRaid = mountRaid(main, { session: raidSession, system: SYS.raid, game: G, canPlay: () => !frozen && !state.modal,
        onHelp: () => {
            state.tab = 'help'; state.helpFolder = 'lab'; state.helpQuery = ''; render();
            $('#help-lab-raid_overview')?.scrollIntoView({ block: 'start' });
        } });
}

function renderHelp(main) {
    const secs = helpSections();
    // 대장간과 같은 공용 폴더 탭 + 패널. 스킨별 모양도 같은 규칙을 따른다 (ADR-0967).
    const wrap = el('div', 'page-stack page help');
    const panel = el('div', 'panel page fill fg-panel help-panel');
    const heading = el('h2', '', t('help.title'));
    panel.appendChild(heading);
    const search = el('div', 'help-search');
    const label = el('label', '', t('help.search.label'));
    label.htmlFor = 'help-search';
    const input = el('input', 'help-search-input');
    input.id = 'help-search';
    input.type = 'search';
    input.placeholder = t('help.search.placeholder');
    input.value = state.helpQuery;
    input.autocomplete = 'off';
    input.spellcheck = false;
    const clear = el('button', 'btn sm', t('help.search.clear'));
    const count = el('span', 'help-search-count');
    count.id = 'help-search-count';
    count.setAttribute('role', 'status');
    count.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', count.id);
    input.setAttribute('aria-controls', 'help-content');
    search.append(label, input, clear, count);
    panel.appendChild(search);
    const sections = [];
    const contents = el('div', 'fg-tabs help-tabs');
    contents.setAttribute('role', 'tablist');
    contents.setAttribute('aria-label', t('help.contents'));
    contents.appendChild(el('span', 'fg-gap'));
    const content = el('div', 'help-content');
    content.id = 'help-content';
    panel.appendChild(content);
    wrap.append(contents, panel);
    const select = id => {
        const previous = sections.find(s => !s.body.hidden);
        if (previous) state.helpScroll[previous.id] = previous.body.scrollTop;
        if (id) state.helpFolder = id;
        heading.textContent = sections.find(s => s.id === id)?.button.textContent ?? t('help.title');
        headingHelp(heading, () => t('hint.help'));
        for (const s of sections) {
            const on = s.id === id;
            s.button.classList.toggle('on', on);
            s.button.setAttribute('aria-selected', String(on));
            s.button.tabIndex = on ? 0 : -1;
            s.body.hidden = !on;
            if (on) s.body.scrollTop = state.helpScroll[id] ?? 0;
        }
    };
    for (const s of secs) {
        if (sections.length) contents.appendChild(el('span', 'fg-gap'));
        const button = el('button', 'fg-tab help-tab', s.title);
        button.id = `help-tab-${s.id}`;
        button.type = 'button';
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', `help-${s.id}`);
        button.onclick = () => { if (state.helpFolder !== s.id) select(s.id); };
        contents.appendChild(button);
        // 폴더마다 독립된 본문과 복원 키를 둔다. 다른 폴더의 스크롤이 넘어오지 않는다.
        const body = el('div', 'box-body help-body');
        body.id = `help-${s.id}`;
        body.dataset.keep = `help:${s.id}`;
        body.tabIndex = 0;
        body.hidden = true;
        body.setAttribute('role', 'tabpanel');
        body.setAttribute('aria-labelledby', button.id);
        body.addEventListener('scroll', () => {
            if (!body.hidden) state.helpScroll[s.id] = body.scrollTop;
        }, { passive: true });
        content.appendChild(body);
        const section = { id: s.id, body, button, groups: [] };
        sections.push(section);
        for (const g of s.groups) {
            const title = el('h3', '', g.h);
            title.id = `help-${s.id}-${g.id}`;
            const nodes = [title, ...g.body.map(line => el('div', 'note-body', line))];
            body.append(...nodes);
            const text = `${s.title} ${nodes.map(n => n.textContent).join(' ')}`.normalize('NFKC').toLocaleLowerCase();
            section.groups.push({ nodes, text, compact: text.replace(/\s+/g, '') });
        }
    }
    contents.appendChild(el('span', 'fg-gap fg-fill'));
    const empty = el('div', 'note-body help-empty', t('help.search.empty'));
    content.appendChild(empty);
    contents.onkeydown = e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const available = sections.filter(s => !s.button.disabled);
        if (!available.length) return;
        const current = available.findIndex(s => s.button === document.activeElement);
        if (current < 0) return;
        e.preventDefault();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? available.length - 1
            : (current + (e.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
        const folder = available[next];
        select(folder.id);
        folder.button.focus({ preventScroll: true });
        folder.button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const filter = (reset = false) => {
        const words = state.helpQuery.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
        let found = 0;
        sections.forEach(s => {
            let visible = 0;
            for (const g of s.groups) {
                const show = words.every(word => g.text.includes(word) || g.compact.includes(word));
                for (const n of g.nodes) n.hidden = !show;
                if (show) visible++;
            }
            s.button.disabled = !visible;
            found += visible;
        });
        empty.hidden = found !== 0;
        clear.disabled = !state.helpQuery;
        count.textContent = t(words.length ? 'help.search.count' : 'help.search.all', { n: found });
        if (reset) {
            state.helpScroll = {};
            for (const s of sections) s.body.scrollTop = 0;
        }
        const current = sections.find(s => s.id === state.helpFolder && !s.button.disabled)
            ?? sections.find(s => !s.button.disabled);
        // 결과가 없어도 선택은 기억해, 검색을 지우면 마지막 폴더를 다시 연다.
        select(current?.id ?? null);
    };
    input.oninput = () => { state.helpQuery = input.value; filter(true); };
    clear.onclick = () => { state.helpQuery = ''; input.value = ''; filter(true); input.focus(); };
    main.appendChild(wrap);
    filter();
}

/* ═══════════ 한 장 ═══════════ */

/** 화면은 1600×800 한 장이다 — 창에 맞춰 **통째로** 줄이고 늘린다 (SCREEN_DESIGN §2 · ADR-0087).
 *  한 장의 크기는 CSS(`#stage`)가 든다 — 여기는 읽기만 한다.
 *  **터치 기기에서 창이 세로로 길면 「가로로 돌려 주세요」 막을 세운다** (ADR-0371) — 한 장은 눕히지 않는다. PC 는 창을 세로로 좁혀도 안 선다.
 *  **창은 보이는 만큼이다** (ADR-0153) — 모바일 브라우저 바가 덮은 자리를 뺀 `visualViewport` 로 잰다. 배율도 막 판정도 그 값 하나다.
 *  좌표를 되돌리는 쪽(`tip.js:stagePoint`)은 여기서 건 행렬을 그대로 뒤집는다 — 공식을 두 벌 두지 않는다 */
function fitStage() {
    const st = document.getElementById('stage');
    if (!st) return;
    // 맞추기 전엔 숨어 있다(style.css `#stage:not(.fit)` · ADR-0349) — transform 도 이 태스크 안에서 서므로 원배율이 그려질 틈이 없다
    st.classList.add('fit');
    // 창은 **보이는 만큼**이다 (ADR-0153) — `innerWidth/Height` 는 모바일 브라우저 바가 덮어도 안 줄고 창 resize 도 안 온다
    const vv = window.visualViewport;
    const w = st.offsetWidth, h = st.offsetHeight;
    const W = vv ? vv.width : window.innerWidth, H = vv ? vv.height : window.innerHeight;
    const portrait = H > W && matchMedia('(pointer: coarse)').matches;
    // 가로가 되면 걷은 기억을 잊는다 — 다시 세로가 되면 막이 또 선다
    if (!portrait) turnSkipped = false;
    renderTurnGate(portrait && !turnSkipped);
    const s = Math.min(W / w, H / h);
    const x = Math.round((W - w * s) / 2), y = Math.round((H - h * s) / 2);
    st.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}

/** 세로 창 막을 걷었나 (ADR-0371) — 「이대로 계속하기」 · 「전체 화면」을 누르면 선다. 세이브에 안 든다 */
let turnSkipped = false;

/** 세로 창 막 (SCREEN_DESIGN §2 · ADR-0371) — `#turn` 은 한 장 밖이라 배율을 안 탄다.
 *  전체 화면 · 방향 고정은 사용자 입력 안에서만 허락된다 — 그래서 버튼이다. 전체 화면 API 가 없는 브라우저(아이폰 사파리)엔 그 버튼을 안 그린다 */
function renderTurnGate(show) {
    const gate = document.getElementById('turn');
    if (!gate) return;
    gate.hidden = !show;
    if (!show) { gate.replaceChildren(); return; }
    // 이미 서 있다 — 브라우저 바가 오르내릴 때마다 다시 그리지 않는다
    if (gate.childElementCount) return;
    gate.appendChild(el('div', 'turn-icon', '⟳'));
    gate.appendChild(el('div', 'turn-title', t('app.turn.title')));
    const root = document.documentElement;
    if (root.requestFullscreen) {
        const full = el('button', 'turn-full', t('app.turn.full'));
        full.onclick = async () => {
            try {
                await root.requestFullscreen({ navigationUI: 'hide' });
                await screen.orientation?.lock?.('landscape');
            } catch { /* 거절 · 미지원 — 막만 걷는다 */ }
            turnSkipped = true;
            fitStage();
        };
        gate.appendChild(full);
    }
    const skip = el('button', 'turn-skip', t('app.turn.skip'));
    skip.onclick = () => { turnSkipped = true; fitStage(); };
    gate.appendChild(skip);
}

/* ═══════════ 부팅 ═══════════ */

/** 브라우저 확대/축소 단축키 (ADR-0344) — 글자(`key`)와 자리(`code`) 둘 다 본다: 한글 입력 상태 · 숫자 패드에서도 걸린다. `0` 은 안 넣는다 */
const ZOOM_KEYS = new Set(['+', '-', '=', '_']);
const ZOOM_CODES = new Set(['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract']);

async function boot() {
    // 한 장을 창에 맞춘다 — **G 가 없어도** 먼저(시작 화면도 한 장이다) · 창 크기가 바뀔 때마다 다시 (ADR-0087)
    fitStage();
    window.addEventListener('resize', fitStage);
    // 브라우저 바가 오르내리면 보이는 창만 바뀌고 창 resize 는 안 온다 (ADR-0153)
    window.visualViewport?.addEventListener('resize', fitStage);
    // 브라우저 확대/축소 입력을 삼킨다 — 한 장이 창을 채워 화면은 그대로고 테두리만 굵어진다 (ADR-0344).
    // 휠은 `passive: false` 여야 취소된다(문서의 wheel 은 기본 passive) · Ctrl + 0 은 메뉴 · 저장된 배율을 되돌리는 길이라 둔다
    window.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    window.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (ZOOM_KEYS.has(e.key) || ZOOM_CODES.has(e.code))) e.preventDefault();
    });
    await loadData();
    state.candidates = rollCandidates();
    // 켜면 메뉴가 선다 — 세이브는 [불러오기]를 눌러야 연다 (`renderMenu` · ADR-0641). 플레이 기록은 네트워크를 기다리지 않는다(`startClocks` · SCREEN_DESIGN §2-1 · ADR-0633).
    //   개발용 경로(`?dev=` · `?tab=`)만 예전처럼 세이브가 있으면 곧장 이어 하고 없으면 시작 화면이다 — 헤드리스 검증이 메뉴에서 멈추지 않게
    const boot = new URLSearchParams(location.search);
    if (DEV_HOST && (boot.has('dev') || boot.has('tab'))) { state.screen = 'start'; if (loadSave()) continueGame(); }
    // 같은 브라우저의 다른 탭이 세이브를 쓰면 이 탭은 멈춘다 (§2-1)
    onSaveWrittenElsewhere(freeze);
    // 창을 닫는 셋째 길 — 닫기 버튼 · 판 바깥 클릭 · 여기 (SCREEN_DESIGN §2 창 레이어). 한 번만 건다 · 닫는 길이 없는 창(`lock`)은 뺀다
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.modal && !MODALS[state.modal]?.lock) closeModal(); });
    // 자원 미니게임의 방향키 (§8 · ADR-0532) — 판이 도는 동안만 먹는다
    document.addEventListener('keydown', e => mgKey(e, true));
    document.addEventListener('keyup', e => mgKey(e, false));
    // 보관 칸 우클릭 메뉴도 Esc 로 닫는다 (ADR-0451)
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.itemMenu && !state.modal) { state.itemMenu = null; render(); } });
    // 분해함도 Esc 로 닫는다 — 함에 오른 것은 제자리로 (ADR-0673)
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.bagSelMode && !state.modal && !state.itemMenu) { clearBagSel(); render(); } });
    // 브라우저 메뉴를 안 띄운다 — 우클릭 · 길게 누르기 둘 다 (style.css 게임 화면 기본기 ⑤ · SCREEN_DESIGN §2). 우클릭을 쓰는 칸(스킬 창)은 제 핸들러가 먼저 돈다
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 배포 주소는 여기서 끝난다 — 아래는 전부 개발용 URL(§10 표)이라 배포판에서는 안 먹는다(아무것도 없는 주소와 같다 · ADR-0751)
    if (!DEV_HOST) { render(); startClocks(); return; }

    // 개발용 — 헤드리스 검증에서 클릭 없이 흐름을 태운다
    const dev = new URLSearchParams(location.search).get('dev');
    const rawTab = new URLSearchParams(location.search).get('tab');
    const tab = rawTab === 'raid' ? 'lab' : rawTab;
    if (rawTab === 'raid') state.lab.tool = 'raid';
    if (new URLSearchParams(location.search).get('screen') === 'start') state.screen = 'start';
    // 관전 배치 — 버튼으로만 바뀌므로 헤드리스가 닿을 길을 따로 낸다 (2026-09-03 · SCREEN_DESIGN §10)
    if (new URLSearchParams(location.search).get('lay') === 'split') state.btLayout = 'split';
    if (new URLSearchParams(location.search).get('tdm') === 'cols') state.tdmView = 'cols';   // 두 팀 판 스킬별 보기로 연다 (ADR-0772)
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
    // 스킬 안쪽 분류(일반 · 전직)도 같다 (SCREEN_DESIGN §9-1 · ADR-0335)
    const cxs = new URLSearchParams(location.search).get('cxs');
    if (CODEX_SKILL_SEGS.includes(cxs)) state.codexSkillSeg = cxs;
    // 이펙트 세그먼트의 그림체 탭도 같다 (SCREEN_DESIGN §9-1 · §10 · ADR-0559)
    const cxf = new URLSearchParams(location.search).get('cxf');
    if (ART_STYLES.includes(cxf)) state.codexFxStyle = cxf;
    const cxm = new URLSearchParams(location.search).get('cxm');
    if (CODEX_MASTERY_SEGS.includes(cxm)) state.codexMasterySeg = cxm;
    // 프롤로그는 새 게임 확정 버튼으로만 닿는 화면이라 헤드리스가 들어올 길을 따로 낸다 (SCREEN_DESIGN §10).
    //   `&s=n` 은 n번째 씬 — 마지막 씬에만 인용·챕터 줄이 서므로 그 상태에도 길이 있어야 한다
    if (dev === 'prologue') {
        if (!G) startGame();
        state.screen = 'prologue';
        state.proScene = Math.max(0, (Number(new URLSearchParams(location.search).get('s')) || 1) - 1);
    }
    if (dev === 'newgame' || (dev === 'battle' && !G)) startGame();
    if (dev === 'raid') {
        if (!G) startGame();
        state.screen = 'game'; state.tab = 'lab'; state.lab.tool = 'raid';
    }
    // 새 게임은 **파티가 비어 있다** [2026-09-09 사용자 지시 · SCREEN_DESIGN §5] — 전투를 바로 도는 개발용 경로는
    //   편성을 대신 해 준다. 유저 흐름에서는 편성 패널이 그 일을 한다(§4-1). 로스터 순서라 리더도 첫 영웅이다
    // `&ps=n` 을 먼저 고른다 — 채우는 것은 **고른 편성**이다(`toggleParty` · R122) · `?dev=form&party=full&ps=2` 가 편성 2 를 채운다
    const wantPs = Number(new URLSearchParams(location.search).get('ps'));
    /* 건물을 끝까지 지은 채로 — 문턱 · 비용을 건너뛴다(개발용 · R137). 물약 칸 수가 같이 늘도록 세이브를 한 번 돌려 불러온다(`deserialize` 가 상한에 맞춘다) */
    const devBuild = (...ids) => {
        if (!G) return;
        for (const b of SYS.construction.list) if (!ids.length || ids.includes(b.id)) G.buildings[b.id] = b.maxRank;
        G = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(G, now()))));
    };
    /* 장을 n장까지 연 채로 — 앞 장 보스 칸(`game.chapterGate`)을 첫 단 기록에 넣는다 (장은 앞 장 보스가 연다 — 건물을 지어도 안 열린다 · R319) */
    const devOpenChapters = (n = D.balance.chapter_open_max) => {
        if (!G) return;
        for (let ch = 2; ch <= n; ch++) { const s = SYS.game.chapterGate(ch); if (s != null && !G.progress.cleared.includes(s)) G.progress.cleared.push(s); }
    };
    // `&cn=max` — **모든 건물을 끝까지 지은** 판 [2026-09-22 · R137 · SCREEN_DESIGN §10] — 새 게임은 대장간 · 선술집이 안 지어져 있어 그 탭들에 곧장 못 닿는다
    if (new URLSearchParams(location.search).get('cn') === 'max') { if (!G) startGame(); devBuild(); }
    // `&cn=<건물>:<랭크>` — 그 건물 하나를 그 랭크로 두고 건설 탭에서 고른 채 (2026-09-28 — 「다음 랭크」 높이를 건물 · 랭크마다 잰다)
    {
        const m = /^(\w+):(\d+)$/.exec(new URLSearchParams(location.search).get('cn') ?? '');
        if (m && SYS.construction.list.some(b => b.id === m[1])) {
            if (!G) startGame();
            G.buildings[m[1]] = +m[2];
            G = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(G, now()))));
            state.cnPick = m[1];
        }
    }
    // `&diff=<단>` — **그 난이도를 연 채 고른** 판 [2026-10-10 · R236 · ADR-0586] — 앞 단마다 여는 칸(`gate`)을 그 단의 기록에 넣고 고른다.
    //   다음 단은 5장 보스를 깨야 열려서 새 게임으로는 난이도 줄의 열린 모습 · 다른 단을 도는 부대 칸 · 리포트 머리에 못 닿는다
    {
        const want = new URLSearchParams(location.search).get('diff');
        if (want && D.difficulties[want]) {
            if (!G) startGame();
            const list = SYS.game.difficultyState(G).list;
            for (const d of list) {
                if (d.gate) {
                    const rec = d.gate.from === list[0].id ? G.progress.cleared : (G.progress.clearedIn[d.gate.from] ??= []);
                    if (!rec.includes(d.gate.stageId)) rec.push(d.gate.stageId);
                }
                if (d.id === want) break;
            }
            SYS.game.selectDifficulty(G, want);
        }
    }
    // `&ps=n` — 편성 수는 기본값에 탐험 랭크가 더 연다(r1 · r5 · 2026-10-30 · R161) — 지금 편성보다 크면 **그 건물을 편성 n 이 열리는 랭크까지** 짓는다
    //   `needOf` 는 기본값 위로 센다 — 편성 n = `n − party_preset_count` 번째 더하기
    const pickPs = () => {
        if (!G || !wantPs) return;
        const w = wantPs > SYS.game.limitsOf(G).presets ? SYS.game.needOf('presets', wantPs - D.balance.party_preset_count) : null;
        if (w && (G.buildings[w.id] ?? 0) < w.rank) {
            G.buildings[w.id] = w.rank;
            G = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(G, now()))));
        }
        SYS.game.selectPreset(G, wantPs);
    };
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
        // `&rep=1` — **반복 원정(장소 안 순환)을 켠 채** 출발한다 [2026-09-10 · 뜻은 2026-09-29 ADR-0432]. 반복은 출정 창의 토글로만 켜진다
        //   (§10 · ?dev=form 과 같은 장치) · 반복은 처음부터 열려 있다(R152) · 런이 끝나면 반복을 안 켜도 다음 런이 선다(v39)
        if (new URLSearchParams(location.search).get('rep') === '1') state.expRepeat = true;
        // `&lv=n` — 파티 영웅을 레벨 n 으로(만렙에서 자른다) — 시작 파티로는 챕터보스를 못 이겨 이긴 끝의 화면(무덤 명패 · ADR-0590)에 못 닿는다
        const wantLv = Number(new URLSearchParams(location.search).get('lv'));
        if (wantLv > 0) for (const uid of SYS.game.partyOf(G)) { const h = SYS.game.heroById(G, uid); if (h) h.level = Math.min(wantLv, D.balance.hero_level_cap); }
        // `&stage=<id>` — **그 스테이지의 관전** [2026-09-15 · §10] — 오오라를 든 기사 몬스터는 2장부터라(ADR-0127) 첫 스테이지로는 못 본다.
        //   후반 스테이지는 해금 전이라 출발이 거절되므로 앞 스테이지를 순서대로 클리어 처리하고 보낸다
        const wantPlay = Number(new URLSearchParams(location.search).get('stage'));
        const playId = D.stages[wantPlay] ? wantPlay : D.stageOrder[0];
        //   장은 앞 장 보스가 연다 — 앞 칸을 다 깬 것으로 두면 그 장도 열린다 (R319)
        for (const id of D.stageOrder) { if (id === playId) break; if (!G.progress.cleared.includes(id)) G.progress.cleared.push(id); }
        // 고른 칸을 그 칸으로 채운다 — 목록 · 창이 그 칸을 고른 채 선다(유저 흐름은 칸 클릭이 채운다) · 반복 스위치는 `repeat` 옵션이 싣는다 (ADR-0432)
        state.expStage = playId;
        const playOpts = { tab: new URLSearchParams(location.search).get('bt'), logf: new URLSearchParams(location.search).get('logf'), dmgf: new URLSearchParams(location.search).get('dmgf') };
        /* `&parties=n` — **부대 n 개가 동시에 도는 관전** [2026-09-24 · ADR-0316 · §10] — 부대마다 선 관전 칸과 「안 보는 부대도 앱 시계가 민다」는
           클릭으로는 편성마다 영웅을 넣고 하나씩 보내야 닿는다. **부대마다 다른 영웅 한 명씩** 넣는다 — 한 영웅은 한 편성에만 들고(v38),
           다른 부대에서 싸우는 영웅이 든 편성은 `busy` 로 막히므로 나눠 담지 않으면 둘째 부대가 안 나간다.
           보는 부대는 **1부대로 되돌린다**(안 보는 부대가 도는 화면이 기본값이라야 그 규칙에 닿는다). 상한은 `limitsOf.expeditions` · 로스터 */
        const wantParties = Math.min(Math.max(1, Number(new URLSearchParams(location.search).get('parties')) || 1), SYS.game.limitsOf(G).expeditions, G.heroes.length);
        if (wantParties > 1) {
            const uids = G.heroes.map(h => h.uid).slice(0, wantParties);
            for (let no = 1; no <= wantParties; no++) {
                SYS.game.selectPreset(G, no);
                for (const uid of SYS.game.partyOf(G, no)) SYS.game.toggleParty(G, uid, now());   // 비우고
                SYS.game.toggleParty(G, uids[no - 1], now());                                     // 한 명만 넣는다
            }
            for (let no = 1; no <= wantParties; no++) runBattle(playId, { ...playOpts, preset: no, repeat: state.expRepeat });
            SYS.game.selectPreset(G, 1);
            watchBattle(1);
        } else runBattle(playId, { ...playOpts, repeat: state.expRepeat });   // `&rep=1` — 창의 보내기와 같이 반복 스위치를 싣는다 (ADR-0432)
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
                // `&eq=n` — Alt 로 붙든 툴팁의 **n번째 찬 장비 칸**에 올린 채 — 「착용 중」 아이템 카드가 선다(ADR-0182). 칸 hover 도 Alt 동안만이라 헤드리스가 못 닿았다
                const eq = +new URLSearchParams(location.search).get('eq');
                if (eq > 0) document.querySelectorAll('#tooltip [data-equip-i]')[eq - 1]?.onmouseenter?.();
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
        // `&open=0` — **창을 닫은 채** 목록만 본다. 창이 화면을 덮으므로 뒤의 스테이지 목록(§4-1)에 닿을 길이 따로 필요하다
        if (new URLSearchParams(location.search).get('open') === '0') state.modal = null;
        // 파티는 **기본으로 안 채운다** — 새 게임은 빈 편성이고 그것이 이 화면의 첫 상태다 (2026-09-09).
        //   `&party=full` 이면 채운다: 파티 테두리·리더 표시는 **클릭으로만** 만들어져 헤드리스가 못 닿는다 (§10)
        if (new URLSearchParams(location.search).get('party') === 'full') devParty();
        // `&grave=1` — 고른 칸의 챕터보스가 **막 죽은** 상태 — 적 구성의 무덤 명패 · 경고 줄 · 보내기 거절에 닿는 길 (ADR-0590).
        //   보스는 이겨서 끝난 런만 죽이므로 클릭으로는 그 런을 이겨야 닿는다 · 기록의 키 모양은 INTERFACE §4 `bossDown`
        if (new URLSearchParams(location.search).get('grave') === '1') G.bossDown = { ...G.bossDown, [`${G.difficulty}|${state.expStage}`]: now() };
        // ~~`&busy=1` 자원 자리에 앉힌 영웅의 출정 확인 창~~ — 2026-10-18 연구소 자리가 걷혀 데려갈 「하던 일」이 없다 (ADR-0665)
        // `&adv=1` — 편성 첫 영웅을 전직시키고 전직 스킬만 배운 채(책은 안 배움) — 스킬 칸 줄의 맨 오른쪽 전직 칸에 닿는 길 (ADR-0591).
        //   전직은 시간이 걸려 헤드리스가 못 닿는다 · 전직시키는 방식은 `?dev=tree&adv=1` 과 같다
        if (new URLSearchParams(location.search).get('adv') === '1') {
            const h = heroById(SYS.game.partyOf(G)[0]);
            if (h) {
                h.level = Math.max(h.level, Math.min(D.balance.hero_level_cap, D.balance.advance_unlock_level + D.balance.advance_point_interval));
                const br = SYS.game.advanceState(G, h.uid, now()).branches[0];
                if (br) { h.advance = br.id; SYS.game.advanceLearn(G, h.uid, br.skills[0]); }
            }
        }
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
        // `&adv=1` — 전직 판이 서게 영웅 0 을 전직시키고 스킬을 배워 한 단계 올려 둔다 · 전직 포인트 하나가 남아 스킬 칸이 눌린다 (2026-10-06 · R216 · ADR-0529)
        if (new URLSearchParams(location.search).get('adv') === '1') {
            h0.level = Math.max(h0.level, Math.min(D.balance.hero_level_cap, D.balance.advance_unlock_level + D.balance.advance_point_interval * 2));
            const br = SYS.game.advanceState(G, h0.uid, now()).branches[0];
            if (br) { h0.advance = br.id; SYS.game.advanceLearn(G, h0.uid, br.skills[0]); SYS.game.advanceLevelUp(G, h0.uid); }
        }
    }
    if (dev === 'book') {   // 책을 쥔 **도서관 탭** (§17 · §10 · ADR-0422 · ADR-0426) — 도서관 · 레벨 10 · 책이 있어야 버튼이 산다.
        if (!G) startGame();
        devBuild('library');             // 도서관 끝까지 — 책 배우기(r1) · 책 제작(r2) · 전직(r3)이 함께 열린다 · 문턱을 건너뛴다 (ADR-0567 · 2026-10-16)
        const h0 = G.heroes[0];
        h0.level = Math.max(h0.level, D.balance.skillbook_learn_level);
        // 책 셋 — 제 직업 기본기 둘 · 남의 직업 하나 · 그중 하나를 이미 배운 채로(덮어쓰기 줄이 보이게). 골드 · 가루는 만들기 줄이 켜지게
        //   제 직업 책은 두 권씩 — 배운 책은 한 권이 남아 「배움」 줄에도 권수가 서고 둘째 책은 `×2` (책은 쌓인다 · ADR-0460)
        //   고유와 같은 책은 업그레이드라(R216) 배우기 표본에서 빼고 **고유 책 한 권**을 따로 쥐여 업그레이드 줄이 둘 서게 한다(배운 책 남은 한 권 · 고유 책 · ADR-0529)
        const own = SYS.skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === h0.cls).map(d => d.id).filter(id => id !== h0.innate);
        const other = SYS.skill.list.find(d => d.ownerKind === 'job' && d.ownerId !== h0.cls)?.id;
        for (const [id, n] of [[own[0], 2], [own[1], 2], [other, 1], [h0.innate, 1]]) if (id) G.books[id] = n;
        SYS.game.learnBook(G, h0.uid, own[0]);
        G.resources.gold = Math.max(G.resources.gold, D.balance.book_craft_gold * 3);
        G.materials.dust = Math.max(G.materials.dust ?? 0, D.balance.book_craft_dust * 3);   // 가루 · 약초는 재료 사다리 (R373)
        G.materials.herb = Math.max(G.materials.herb ?? 0, D.balance.book_craft_herb * 3);
        state.heroUid = h0.uid;
        // 스킬 도안 — 1장 몬스터의 고유 스킬마다 한 장: 그 책들이 제작 칸에 선다 · 같은 고유를 든 몬스터가 여럿이면 `×n`
        //   (새 게임엔 도안이 없다 · R241 · ADR-0600 · 2026-10-20 R293 — 도안은 쌓이는 소모품 · ADR-0680)
        for (const m of Object.values(D.monsters)) {
            const sk = m.innate_skill;
            if (Number(m.chapter) === 1 && SYS.skill.bookable(sk)) G.blueprints[sk] = (G.blueprints[sk] ?? 0) + 1;
        }
        // 책 만들기 첫 칸 · 가진 책 둘째 책(배운 칸이 차 있어 [덮어쓰기]가 선다)을 고른 채 — 두 위 줄이 다 서게 (ADR-0570 · ADR-0573)
        state.bookCraftSel = SYS.game.bookState(G, h0.uid).craft[0]?.id ?? null;
        state.bookSel = own[1] ?? null;
        // `&adv=1` — 영웅 0 을 첫 갈래로 전직시키고 첫 전직 스킬을 배운 채 — 전직 후 갈래 셋 · 주황 테두리에 닿는 길 (ADR-0592).
        //   전직은 시간이 걸려 헤드리스가 못 닿는다 · 전직시키는 방식은 `?dev=tree&adv=1` 과 같다
        if (new URLSearchParams(location.search).get('adv') === '1') {
            h0.level = Math.max(h0.level, Math.min(D.balance.hero_level_cap, D.balance.advance_unlock_level + D.balance.advance_point_interval));
            const br = SYS.game.advanceState(G, h0.uid, now()).branches[0];
            if (br) { h0.advance = br.id; SYS.game.advanceLearn(G, h0.uid, br.skills[0]); }
        }
        // 책은 도서관 탭에서만 보인다(ADR-0426 · ADR-0460) — 옛 `&lib=1` · `&mat=1` 은 읽지 않는다
        state.tab = 'library';
    }
    if (dev === 'arena' || dev === 'colosseum') {   // 콜로세움(`arena`) · 결투장(`colosseum`) — 레이팅 · 오른 층을 꽂은 채 (ADR-0602 · ADR-0670)
        if (!G) startGame();
        const q = new URLSearchParams(location.search);
        // `&tpl=<formation_template.csv:tpl_id>` — 고른 편성의 진형 (`2-1` · `1-2` · `0-3`)
        if (q.get('tpl')) SYS.game.setFormation(G, q.get('tpl'));
        state.tab = dev;
        const picked = SYS.game.partyOf(G).map(heroById).filter(Boolean), ranks = formState().byUid;
        // `&lv=n` — 고른 편성 영웅을 레벨 n 까지(XP 를 게임 길로 받는다 · 이긴 쪽 화면을 헤드리스로 보는 개발 장치)
        if (Number(q.get('lv')) > 1) for (const h of picked) {
            let xp = 0;
            for (let l = h.level; l < Math.min(Number(q.get('lv')), D.balance.hero_level_cap); l++) xp += SYS.hero.xpNeeded(l);
            SYS.hero.grantXp(h, xp);
        }
        if (dev === 'colosseum') {
            // `&cleared=n` 오른 층 · `&floor=n` 고른 층(깬 층 · 다음 층만 — 아니면 다음 층) · 세이브에 적는다(개발 장치)
            const C = colosseumReset(state.colosseum);
            if (q.has('cleared')) G.colosseum = { cleared: Math.max(0, Math.min(SYS.arena.floors.length, Number(q.get('cleared')) || 0)) };
            if (q.has('floor')) C.floor = Number(q.get('floor')) || null;
        } else {
            // `&rating=n` 레이팅(세이브에 적는다 · 개발 장치) · 후보는 시드 1 로 굴린다(헤드리스 재현)
            const A = arenaReset(state.arena);
            if (q.has('rating') && Number.isFinite(Number(q.get('rating')))) G.arena = { ...SYS.game.arenaState(G), rating: Number(q.get('rating')), peak: Math.max(SYS.game.arenaState(G).peak, Number(q.get('rating'))) };
            A.cands = SYS.arena.rollRatedCandidates(SYS.game.arenaState(G).rating, makeRng(1), picked.map(h => h.name));
            // `&friendly=1` 친선전 창 — 내 팀 코드를 만들고 그 코드를 불러온 채(자기 팀과 붙는다) · `&bad=1` 첫 영웅 레벨을 만렙 위로(사유 줄)
            if (q.get('friendly') === '1' && picked.length === SYS.arena.teamSize) {
                const payload = SYS.arena.exportTeam(picked, G.items, ranks);
                A.code = encodeTeam(payload);
                if (q.get('bad') === '1') payload.heroes[0].hero.level = D.balance.hero_level_cap + 1;
                A.paste = encodeTeam(payload);
                const r = SYS.arena.importTeam(decodeTeam(A.paste));
                if (r.ok) Object.assign(A, { ghost: r.team, pick: 'ghost' });
                else { A.problems = r.problems.map(p => ({ code: p.code, hero: p.hero ?? null })); state.modal = 'arenaCode'; }
            }
            if (q.get('modal') === '1') state.modal = 'arenaCode';
        }
    }
    if (dev === 'tactics') {   // 전술 칸이 전부 열린 상태 — 칸은 지휘 천막 랭크로만 열리므로 헤드리스가 닿을 길을 따로 낸다
        if (!G) startGame();
        devBuild('command');             // 지휘 천막을 끝까지 — 문턱(합산 레벨)을 건너뛴다 (R137)
        state.tab = 'party';             // 전술 칸은 편성 탭에 선다 (§15 · ADR-0194)
    }
    if (dev === 'mats') {   // 제작 재료를 쥔 대장간 — 광석 · 목재는 파견이 채우는데 파견이 아직 없어 [만들기]가 늘 잠긴다 (SCREEN_DESIGN §8-2 · §10 · R96)
        if (!G) startGame();
        devBuild('forge');               // 대장간을 끝까지 — 제작 레벨이 전부 열린다 (R137)
        // 양은 레시피 표가 정한다 — 부위 전부를 레벨마다 한 번씩 만들 만큼(Lv1 · Lv10 은 같은 단계라 둘 몫). 화면이 수량을 지어내지 않는다
        const rs = Object.values(D.makeRecipes), levels = SYS.game.makeLevels();
        const per = {};
        for (const r of rs) { per[r.mat] = (per[r.mat] ?? 0) + r.matUnits * levels.length; per.dust = (per.dust ?? 0) + r.dust * levels.length; }   // 부위 재료 · 가루 (R373)
        Object.assign(G.materials, per);
        G.resources.gold = Math.max(G.resources.gold, rs.reduce((a, r) => a + r.gold, 0) * levels.length);
        state.tab = 'forge';
    }
    // ~~`?dev=watch` 파견 관전 창~~ — 2026-10-18 창째 걷었다 (ADR-0665)
    if (dev === 'mg') {   // 자원 미니게임 창 (§8 · §10 · ADR-0532) — 판은 연구소가 서면 연다 · `&mg=<줄>` · `&go=1` 이면 판을 연 채 · `&open=0` 이면 창 없이
        if (!G) startGame();
        devBuild('resource');
        const q = new URLSearchParams(location.search);
        const post = MG_POSTS.some(p => p.id === q.get('mg')) ? q.get('mg') : MG_POSTS[0].id;
        state.mg = { post };
        state.post = LAB_RES.id;   // 연구소 트리는 「자원」 줄을 고른 채
        // `&line=<줄>` — 창고 · 선술집도 지어 줄 넷을 다 열고 그 줄을 고른 채(`&lview=1` 과 함께 — 고른 줄 판 · ADR-0971)
        if (LAB_LINES.some(p => p.id === q.get('line'))) { devBuild('storage', 'tavern'); state.post = q.get('line'); }
        state.tab = 'resource';
        // `&lv=n` — 모든 지점을 레벨 n 으로(지점마다 상한에서 자른다) + 골드 · 재료를 채워 [연구]가 산다 · `&node=<지점>` — 고른 줄의 그 지점을 고른 채 ·
        //   `&res=1` — 고른 지점의 연구를 시작한 채(진행 막대 · [그만두기]) (§8 · ADR-0684 — 헤드리스가 Lv · 값 · 켜진 버튼 · 연구 중을 본다. 지점 키 `줄:지점` 은 INTERFACE §4 `labNodes`)
        // `&rk=n` — 연구소를 n랭크로(끝까지 지은 판 대신 · 잠긴 지점이 섞인 트리를 본다)
        const rk = Number(q.get('rk'));
        if (Number.isInteger(rk) && rk >= 1) { G.buildings.resource = rk; G = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(G, now())))); }
        const lv = Number(q.get('lv')), pickNode = q.get('node');
        if (Number.isInteger(lv) && lv > 0) {
            for (const l of SYS.game.labState(G, now()).lines) for (const n of l.nodes) {
                const v = Math.min(lv, n.max);
                if (v > 0) G.labNodes = { ...(G.labNodes ?? {}), [`${l.line}:${n.node}`]: v };
            }
            for (const m of SYS.game.materialsState(G).items) G.materials[m.id] = 9999;   // 줄 × 단계 전부 (R359)
            G.resources.gold = 999999;
            SYS.game.labSettle(G, now());
        }
        if (pickNode) state.labNode = { [LAB_RES.id]: pickNode };
        // `&lview=1` — 오른쪽을 고른 줄로(줄 카드를 누른 판 · 등록 효과 · 영웅 얼굴 · ADR-0700)
        if (q.get('lview') === '1') state.labLineView = true;
        if (q.get('res') === '1') { G.resources.gold = Math.max(G.resources.gold, 999999); SYS.game.labResearchStart(G, LAB_RES.id, pickNode ?? 'mine', now() - 60000); }
        // `&reg=1` — 로스터 앞 영웅들을 줄마다 하나씩 등록한 채(남은 영웅은 미등록) · `&lr=1` — 고른 줄의 등록 창을 연 채
        //   (§8 · ADR-0677 — 등록은 클릭으로만 서서 헤드리스가 띠 위칸 · 등록 자리 · 창에 못 닿는다)
        if (q.get('reg') === '1') G.heroes.slice(0, LAB_LINES.length).forEach((h, i) => SYS.game.labRegister(G, h.uid, LAB_LINES[i].id, now()));
        // `&open=0` — 창을 닫은 채 연구소 탭만(단계가 다 열린 판 · 옛 `?dev=watch&open=0` 의 자리 · ADR-0665)
        if (q.get('lr') === '1') state.modal = 'labReg';
        else if (q.get('open') !== '0') state.modal = 'mg';
        save();
        if (q.get('go') === '1') setTimeout(() => { if (state.modal === 'mg') mgStart(post, 1); }, 0);
    }
    // `&fg=` — 대장간의 작업 탭을 고른 채 연다 (§10 · ADR-0142). 탭은 클릭으로만 바뀌어 헤드리스가 못 닿는다
    const fg = new URLSearchParams(location.search).get('fg');
    if (['make', 'up', 'synth', 'craft'].includes(fg)) state.forgeTab = fg;
    // `&hero=n` — 로스터 n 번째 영웅(1 부터)을 고른 채 연다 (§10 · 2026-09-28). 띠의 고르기는 클릭으로만 바뀌어 헤드리스가 못 닿는다
    const heroNo = Number(new URLSearchParams(location.search).get('hero'));
    if (Number.isInteger(heroNo) && G?.heroes?.[heroNo - 1]) state.heroUid = G.heroes[heroNo - 1].uid;
    // 인벤토리 칸의 탭 — 탭은 클릭으로만 바뀐다(SCREEN_DESIGN §10 · §6 · ADR-0379)
    const bg = new URLSearchParams(location.search).get('bag');
    if (['equip', 'mat', 'book'].includes(bg)) state.stashTab = bg;   // 창고 칸의 탭 (ADR-0524 · 스킬북 ADR-0616)
    // `&bag=sort` · `sort:stash` — 인벤토리 · 창고 [정렬]을 펼친 채 · `&bag=sel` · `sel:fill` — 분해함을 띄운 채(`fill` = 보고 있는 인벤토리의 낮은 것부터 함을 채운 채) (§10 · ADR-0523 · ADR-0673 — 클릭으로만 열려 헤드리스가 못 닿는다)
    if (bg?.startsWith('sort')) state.bagSortMode = bg === 'sort:stash' ? 'stash' : 'bag';
    if (bg?.startsWith('sel')) {
        state.bagSelMode = true;
        if (bg === 'sel:fill') for (const it of cubeCandidates(cubeCols()).slice(0, cubeCap())) state.bagSel.add(it.uid);
    }
    // `&inv=n` — 부대 n 의 인벤토리를 본 채 (§10 · ADR-0521)
    const invQ = Number(new URLSearchParams(location.search).get('inv'));
    if (Number.isInteger(invQ) && invQ >= 1) state.invNo = invQ;
    // `&bld=<건물 id>` — 건설 탭에서 그 건물을 고른 채 연다 (§10 · §13-1 · ADR-0354). 부지는 클릭으로만 골라져 헤드리스가 못 닿는다
    const bld = new URLSearchParams(location.search).get('bld');
    if (bld) state.cnPick = bld;
    // `&td=away` — 특수상단이 **떠나 있는** 상점 (§10 · §8-3). 방문은 시간으로만 갈리고 새 게임은 상인이 와 있는 채로 시작하므로
    //   게임을 만든 시각을 체류 시간(+1분)만큼 과거로 당긴다 — `?dev=visit` 이 줄을 연 시각을 당기는 것과 같은 장치
    if (G && new URLSearchParams(location.search).get('td') === 'away')
        G.createdAt = now() - D.balance.trade_stay_hours * 3600000 - 60000;
    // `&ps=n` — 편성 n 을 고른 채 연다 (§10 · §15). 고르개는 클릭으로만 바뀌어 헤드리스가 못 닿는다 — 편성 탭 · 출정 창이 같은 값을 든다
    pickPs();
    // `?dev=forge` · `?dev=trade` 는 삭제됐다 (2026-09-03 · SCREEN_DESIGN §10) — 강화·상점이 탭이 되어
    // `?tab=forge` · `?tab=shop` 이 바로 닿는다. `?dev=*` 는 클릭으로만 만들어지는 상태에 길을 내는 장치다
    /* 수색 칸의 마차 영웅 — 영웅이 오는 길(탐험 마차의 승리)이 아직 없어 헤드리스가 닿을 길을 낸다 (SCREEN_DESIGN §8-1 · §10 · ADR-0671).
       선술집만 지은 판에 `&n=`(기본 3 · 칸 수까지) 명이 와 있다 — 영웅은 명단 후보와 같은 굴림(`hero.rollCandidates`)이고 시드가 고정이라 매번 같은 사람이다 */
    if (dev === 'join') {
        if (!G) startGame();
        devBuild('tavern');
        const n = Math.max(0, Math.min(D.balance.tavern_join_slots, Number(new URLSearchParams(location.search).get('n') ?? 3)));
        SYS.hero.rollCandidates(makeRng(0x4A01), n).forEach((h, i) => SYS.game.joinAdd(G, h, now() - (n - i) * 60000, 'caravan'));
        state.tab = 'tavern'; save();
    }
    /* 수색 — 시간으로만 오므로 헤드리스가 닿을 길을 낸다 (SCREEN_DESIGN §8-1 · §10 · ADR-0671).
       선술집 · 연구소를 지은 판에 「간격」 연구가 `visit_hours × n`(+1분) 전에 끝나게 해 두고 지금까지 정산한다(R298 — ~~줄 레벨 1~~) —
       `&n=`(기본 2 · 칸 수까지 · 칸 수면 다 차 시계가 멈춘 상태). 연구 값만큼 골드를 얹어 판의 골드는 그대로 남는다 */
    if (dev === 'visit') {
        if (!G) startGame();
        devBuild('tavern', 'resource');
        const n = Math.max(0, Math.min(D.balance.tavern_join_slots, Number(new URLSearchParams(location.search).get('n') ?? 2)));
        const done = now() - n * D.balance.visit_hours * 3600000 - 60000;
        const iv = SYS.game.labState(G, done).lines.find(l => l.line === 'visit')?.nodes.find(x => x.node === 'interval')?.next;
        if (iv) {
            G.resources.gold += iv.gold;
            SYS.game.labResearchStart(G, 'visit', 'interval', done - iv.ms);
            SYS.game.labSettle(G, done);
        }
        SYS.game.visitSettle(G, now());
        state.tab = 'tavern'; save();
    }
    /* 탐험 — 지점 패널의 상태(대기 · 나가 있음 · 완료 · 준비 중)가 **시간으로만** 갈리므로 헤드리스가 닿을 길을 낸다 (SCREEN_DESIGN §8-4 · §10).
       다 지은 판(장 · 동시 건수가 열린다) · 1장 동굴 = 완료(첫 영웅) · 2장 동굴 = 나가 있음(절반 · 둘째 영웅) · `&s=idle` 이면 아무도 안 보낸다.
       `&sel=<장>:<지점>` 이면 그 지점을 고른 채 — 기본은 1장 동굴 */
    if (dev === 'explore') {
        if (!G) startGame();
        devBuild();
        devOpenChapters();   // 지도의 장이 다 열린 판 — 편성 II 가 2장 동굴로 간다 (R319)
        if (new URLSearchParams(location.search).get('s') !== 'idle') {
            // 편성으로 보낸다 (ADR-0582) — 둘째 영웅을 편성 II 로 옮기고 편성 I 은 1장 동굴(끝남) · 편성 II 는 2장 동굴(가는 중)
            const span = D.balance.explore_hours * 3600000;
            const b = G.heroes[1]?.uid;
            if (b && SYS.game.selectPreset(G, 2).ok) SYS.game.toggleParty(G, b, now());
            SYS.game.exploreSend(G, 1, 'cave', 1, now() - Math.round(span * 1.2));
            SYS.game.exploreSend(G, 2, 'cave', 2, now() - Math.round(span * 0.5));
            SYS.game.selectPreset(G, Math.min(3, SYS.game.limitsOf(G).presets));   // 대기 창은 빈 편성 III 을 편다
        }
        const m = /^(\d+):(\w+)$/.exec(new URLSearchParams(location.search).get('sel') ?? '');
        state.exSel = m ? { chapter: +m[1], spot: m[2] } : { chapter: 1, spot: 'cave' };
        state.tab = 'explore'; save();
    }
    if (dev === 'gamble') {   // 도박장 창이 열린 선술집 (§8-1 · §10 · ADR-0322 · ADR-0331) — 창은 클릭으로만 열리고 도박장은 선술집 랭크가 연다
        if (!G) startGame();
        devBuild('tavern');
        state.tab = 'tavern';
        const q = new URLSearchParams(location.search);
        // 판을 돌리는 길은 판돈이 있어야 한다 — n판 돌리기를 다 돌 만큼 준다
        if (q.get('spin') === '1' || q.get('hold') === '1' || q.get('all') === '1') {
            const S = SYS.game.gambleState(G, 1);
            G.resources.gold = Math.max(G.resources.gold, S.stake * S.batch);
        }
        // `&hold=1` — **홀드가 서는 판까지 판 번호를 민다**. 같은 번호면 같은 판이라(INTERFACE §5-1) 사본에서 굴려 보고 본판의 번호를 맞춘다.
        //   사본은 판이 바꾸는 칸(자원 · 재료 · 판 수)만 떼어 낸다 — 나머지는 읽기만 한다
        if (q.get('hold') === '1') {
            for (let k = 0; k < 5000; k++) {
                const trial = { ...G, counters: { ...G.counters }, resources: { ...G.resources }, materials: { ...G.materials } };
                if (SYS.game.gambleSpin(trial, 1).spin?.hold) break;
                G.counters.gamble += 1;
            }
        }
        // `&spin=1` · `&hold=1` — 한 판을 돌려 **멈춘 판**을 낸다(재생 없이) · `&all=1` — 「n판 돌리기」의 합계
        if (q.get('spin') === '1' || q.get('hold') === '1') {
            const r = SYS.game.gambleSpin(G, 1);
            if (r.ok) state.gb.last = { kind: 'one', spin: r.spin };
        } else if (q.get('all') === '1') {
            const r = SYS.game.gambleSpinBatch(G, 1);
            if (r.ok) state.gb.last = { kind: 'all', ...r };
        }
        // `&roll=ms` — **도는 판을 그 순간에 세운 채**(`&spin=1` · `&hold=1` 과 겹쳐 쓴다 · ADR-0333). 재생은 클릭으로만 서고
        //   헤드리스는 흐르는 순간을 못 잡는다 — 흐른 시간만큼 음수 지연을 주고 애니메이션을 멈춰 그 한 장면을 낸다
        const roll = Number(q.get('roll'));
        if (roll > 0 && state.gb.last?.kind === 'one') state.gb.anim = { id: 0, phase: 'spin', t0: now() - roll, freeze: true };
        // `&open=0` — 창을 닫은 채 **열린 칸**을 본다 (새 게임의 `?tab=tavern` 은 잠긴 칸이다)
        if (q.get('open') !== '0') state.modal = 'gamble';
        save();
    }
    /* 의뢰 게시판 — **받아 둔 카드가 선** 선술집 (§14 · §10 · ADR-0352). 받기는 클릭 · 진행은 전투로만 서서 헤드리스가 못 닿는다.
       선술집을 끝까지 짓고 받을 수만큼 앞 카드를 받는다 — 첫 장은 반쯤 · 둘째 장은 다 채운 채([수령]). `&arm=1` 이면 첫 장의 [포기]를 한 번 누른 채 */
    if (dev === 'commission') {
        if (!G) startGame();
        devBuild('tavern');
        state.tab = 'tavern';
        SYS.game.commissionFill(G);
        const S = SYS.game.commissionState(G);
        // 둘째 장은 다 채운 채([수령]) — 받을 수가 하나뿐이면 둘째 장이 없으니 `&done=1` 이 첫 장을 채운다 (R162 — 선술집이 받을 수를 안 늘린다)
        const done = new URLSearchParams(location.search).get('done') === '1';
        S.cards.slice(0, S.slots).forEach((c, i) => {
            if (!SYS.game.commissionTake(G, c.no).ok) return;
            const held = G.commissions.cards.find(x => x.no === c.no);
            held.have = i === 1 || (done && i === 0) ? held.need : Math.floor(held.need / 2);
        });
        if (new URLSearchParams(location.search).get('arm') === '1') state.cmArm = G.commissions.cards[0]?.no ?? null;
        save();
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
        for (const iuid of G.bags.flat()) SYS.game.equip(G, uid0, iuid);   // 거절되는 것(요구 레벨 미달 · R215)은 가방에 남는다
        runBattle(D.stageOrder[0], { instant: true });
        // `&t=potion` 은 **물약 카드**를 본다 — 칸이 편성 탭에 있으므로 이 길만 탭이 갈린다 (§2 「물약 툴팁 규격」 · ADR-0315)
        //   `&t=hero` 는 **편성 띠의 영웅 툴팁** — 관전 밖 영웅 카드도 관전과 같은 카드인지 본다 (§2 「유닛 툴팁 규격」 · ADR-0498)
        state.tab = ['potion', 'hero'].includes(new URLSearchParams(location.search).get('t')) ? 'party' : 'character';
    }
    if (dev === 'offline') {   // 반복을 켠 채 게임을 껐다 다시 켠 것처럼 — 런 마무리 배너 확인용
        if (!G) startGame();
        devParty();
        if (!runSlot(G.preset)) SYS.game.resolveBattle(G, D.stageOrder[0], now() - 31 * 60000);
        runSlot(G.preset).repeat = true;
        runSlot(G.preset).auto = true;   // v39 — 「이어 가던 부대」는 `auto` 가 가른다(`closeRun`) · repeat 만으로는 알림이 안 섰다 (ADR-0881)
        SYS.game.closeRun(G, now()); save();
    }
    // 멈춤 창 — 다른 탭이 세이브를 써야만 닿는 화면이라 길을 따로 낸다 (SCREEN_DESIGN §2-1 · §10)
    if (dev === 'frozen') {
        if (!G) startGame();
        frozen = true;
        state.modal = 'frozen';
    }
    // 첫 클리어 상자 · 우편함 — 상자는 처음 깬 칸에서만 와 헤드리스가 못 닿는다 (SCREEN_DESIGN §2 · §6 · §10 · ADR-0742 · ADR-0743).
    //   인벤토리 1 앞에 무기 상자 ×3 · 방어구 상자 ×1 · 우편 셋 · `&open=mail` 이면 우편함 창 · `&t=box` 면 첫 상자 칸 툴팁(아래 render 뒤)
    if (dev === 'box') {
        if (!G) startGame();
        // `&tier=mid|high` 면 그 등급 상자 — 첫 클리어 상자는 하급만 와 다른 등급에 닿을 길이 없다 (ADR-0776 · R349)
        const qt = new URLSearchParams(location.search).get('tier'), tier = SYS.game.boxRarities(qt) ? qt : 'low';
        const put = (kind, n) => { const uid = `i${++G.counters.item}`; G.items[uid] = { uid, box: { kind, tier, n } }; G.bags[0].unshift(uid); };
        put('armor', 1); put('weapon', 3);
        G.mail = [1011, 1012, 1021].map((stageId, i) => ({ id: ++G.counters.mail, kind: i % 2 ? 'armor' : 'weapon', tier, no: 1, stageId, difficulty: G.difficulty }));
        state.tab = 'character';
        if (new URLSearchParams(location.search).get('open') === 'mail') state.modal = 'mail';
    }
    // ?tab= 은 dev 분기 **뒤에** 건다 — startGame() 이 탭을 원정으로 되돌리므로 앞에 두면 먹히지 않는다
    if (TABS.includes(tab)) state.tab = tab;
    // 실험실 — 고르기 · 굴리기는 클릭으로만 돼 헤드리스가 못 닿는다 (SCREEN_DESIGN §10 · §18 · ADR-0580 · ADR-0610).
    //   `&lab=<monster_idx>` 그 몬스터(챕터도 옮긴다 · 레벨은 그 장소 첫 칸) · `&labg=elite` · `&labd=<단 id>` · `&labn=n` n 번 굴린 채 · 모르는 값이면 무시
    const lq = new URLSearchParams(location.search);
    if (LAB_TOOLS.includes(lq.get('lab'))) state.lab.tool = lq.get('lab');
    const labId = Number(lq.get('lab'));
    if (D.monsters[labId]) Object.assign(state.lab, { chapter: D.monsters[labId].chapter, monster: labId, level: null });
    if (lq.get('labg') === 'elite') state.lab.grade = 'elite';
    if (D.difficulties[lq.get('labd')]) state.lab.diff = lq.get('labd');
    const labN = Number(lq.get('labn'));
    if (labN > 0) labRoll(Math.min(labN, LAB_KEEP));
    // `&cxlv=<n>` — 모든 몬스터의 도감이 n 레벨에 닿은 채 (SCREEN_DESIGN §10 · ADR-0667) — 켜진 단계 · 켜진 추가옵션을 보는 길이다
    //   (도감 경험치는 이긴 라운드의 처치로만 쌓여 헤드리스가 못 닿는다) · 세이브하지 않는다 · 모르는 값이면 무시
    const cxlv = Math.min(Number(lq.get('cxlv')) || 0, D.codexLevels.length);
    if (G && cxlv > 0) {
        for (const id of Object.keys(D.monsters)) G.codexExp[id] = D.codexLevels[cxlv - 1];
        // 도감 단계는 도서관이 연다(ADR-0762) — `&cn=` 이 없으면 그 레벨을 여는 랭크까지 도서관을 둔다 · `&cn=library:1` 과 겹치면 막힌 단계(회색으로 찬 핍 · 자물쇠 줄)를 본다
        const need = SYS.game.needOf('codex_level', cxlv);
        if (need && !lq.get('cn') && (G.buildings[need.id] ?? 0) < need.rank) G.buildings[need.id] = need.rank;
    }
    render();
    /* 플래시 — 클릭으로만 뜨고 제 시간에 다시 들어가 헤드리스가 못 닿는다 (SCREEN_DESIGN §2 · §10 · ADR-0692).
       `?flash=<i18n 키>` 는 `?dev=` · `?tab=` 에 겹쳐 쓴다 — 창 위에 서는지는 `?dev=tree&flash=sk.err.points`. `{name}` 에는 로스터 첫 영웅.
       **쉼표로 키를 여럿 주면 그 차례대로 쌓인다**(`?flash=tv.hired,ch.err.bagFull`).
       기본은 **튀어나온 자리에 멈춰 선다**(수명 타이머와 움직임을 걷는다 — 스크린샷용) · `&hold=0` 이면 제 시간에 다시 들어간다(덤프로 걷힘 확인) */
    const flashKeys = new URLSearchParams(location.search).get('flash');
    if (flashKeys) {
        for (const k of flashKeys.split(',')) flash(k, { name: G?.heroes[0] ? L(G.heroes[0].name) : '' });
        if (new URLSearchParams(location.search).get('hold') !== '0') {
            for (const n of $('#toast').children) { clearTimeout(toastTimers.get(n)); n.style.animation = 'none'; }
        }
    }
    /* 툴팁은 **hover 로만** 뜬다 — 헤드리스가 못 닿는 상태라 길을 따로 낸다 (SCREEN_DESIGN §10 · §6 툴팁 규격).
       `render()` **뒤에** 걸린다: 카드는 `bindTipNode` 가 붙인 `mouseenter` 가 만들고, 그 핸들러는 render 마다 새로 붙는다.
       기본은 **가방 첫 칸**(비교 두 장 — 이 툴팁의 가장 넓은 모양) · `&t=doll` 이면 페이퍼돌 무기 칸(한 장) ·
       `&t=skill` 이면 **액티브 카드의 스킬 설명창**(출처 · 태그 · 능력치 칩 — ADR-0118) ·
       `&t=potion` 이면 **편성 탭 물약 칸의 물약 카드**(위 setup 이 탭을 편성으로 돌린다 · ADR-0315) ·
       `&t=hero` 면 **편성 띠 첫 영웅의 유닛 툴팁**(ADR-0498) */
    if (dev === 'box' && new URLSearchParams(location.search).get('t') === 'box')
        document.querySelector('.inv-cell.box')?.onmouseenter?.(new MouseEvent('mouseenter', { clientX: 40, clientY: 40 }));
    if (dev === 'tip') {
        const q = new URLSearchParams(location.search);
        // `&i=n` — n번째 찬 칸(1부터). 가방에 무엇이 떨어질지는 시드가 정하므로 **무기 칸을 골라 잡는 유일한 길**이다
        const cell = { doll: '.pd-cell.filled', skill: '.sk-card', potion: '.pt-slot', hero: '.hs-card' }[q.get('t')] ?? '.inv-cell.filled';
        const list = document.querySelectorAll(`${cell}[data-tip]`);
        const node = list[Math.max(1, Number(q.get('i')) || 1) - 1];
        // 커서 자리는 왼쪽 위 — 카드 두 장(최대 640px)이 접힘 보정 없이 그대로 펴진다
        node?.onmouseenter?.(new MouseEvent('mouseenter', { clientX: 40, clientY: 40 }));
        // `&alt=1` — 올린 뒤 **Alt 를 누른 채** — 아이템 툴팁의 착용 델타도 누르는 동안만 선다(ADR-0658 · `?dev=play` 의 `&alt=1` 과 같다)
        if (q.get('alt') === '1') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    }
    // `&cxtip=<skill_id>` — 도감 스킬 타일의 툴팁이 뜬 채 (§9-1 · §10 · ADR-0650) · 카드 옆에 붙는 툴팁이라 커서 자리는 상관없다
    //   숫자면 몬스터 idx — 도감 몬스터 카드의 툴팁(§9 · 2칸 줄을 보는 길 · ADR-0664)
    const cxtip = new URLSearchParams(location.search).get('cxtip');
    const cxSel = /^\d+$/.test(cxtip ?? '') ? `.mon-card[data-mid="${cxtip}"]` : `.ix-tile[data-skill="${CSS.escape(cxtip ?? '')}"]`;
    if (cxtip) document.querySelector(cxSel)?.onmouseenter?.(new MouseEvent('mouseenter', { clientX: 40, clientY: 40 }));
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
    // 누르고 있는 동안은 앱 시계가 그리지 않는다 — 끄는 카드가 DOM 에서 빠지지 않게 (ADR-0338).
    //   캡처 단계라 포인터 캡처가 걸린 노드(카드 드래그)의 손짓도 여기를 지난다 · 창을 떠나면(blur) 뗀 것으로 친다
    window.addEventListener('pointerdown', () => { pointerHeld = true; }, true);
    for (const ev of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(ev, () => { pointerHeld = false; }, true);
    // 브라우저 탭을 숨기고 돌아올 때 — 숨긴 탭의 시계는 앱 시계 하나다 (ADR-0102)
    document.addEventListener('visibilitychange', onVisibility);
    // 플레이 기록 — 켠 횟수를 세고 · 모아서 올린다 · 닫힐 때 한 번 더 (SCREEN_DESIGN §2-1 · ADR-0633)
    trackSession();
    setInterval(trackPush, TRACK_PUSH_MS);
    window.addEventListener('pagehide', () => trackPush());
    trackPush();
}

boot().catch(e => {
    console.error(e);
    $('.main').innerHTML = `<div class="panel"><div class="down">${String(e)}</div></div>`;
});
