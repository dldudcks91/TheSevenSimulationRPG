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
 * 2026-08-27 — **원정 편성은 「어디를 갈지 먼저」** (사용자 지시, SCREEN_DESIGN §4-1). 영웅 띠를 상시 노출에서 내리고,
 *   지역을 누르면 목록 위에 열리는 **편성 패널**(formPanel) 안에 넣었다. 출발 버튼도 스테이지 행에서 그 패널로 옮겼다 —
 *   행 클릭은 이제 「지역 선택」이다. 패널은 **누를 때만** 뜬다 — 자동으로 열지 않는다 (state.expStage = null 이면 없다).
 *
 * 2026-09-03 — **프롤로그**(renderPrologue · SCREEN_DESIGN §3-1). 새 게임을 확정하면 5씬을 넘긴 뒤 원정 탭으로 들어간다.
 *   세이브는 프롤로그보다 **먼저** 쓰인다(startGame 이 newGame → save 를 끝낸 뒤 화면만 프롤로그로 둔다) — 읽다 닫아도 이어하기로 돌아온다.
 *   본문은 한국어만 있다(사용자 지시) — i18n 의 pro.* 참조. 개발용 경로는 ?dev=prologue 이고 나머지 dev 경로는 프롤로그를 건너뛴다.
 *
 * 개발용 URL: ?dev=prologue (프롤로그 첫 씬) / ?dev=newgame (현재 후보로 즉시 시작) / ?dev=battle (첫 스테이지 1회 즉시 정산 → 리포트) / ?dev=play (첫 스테이지 관전 재생 · &bt=log|dmg 면 그 판으로 로그 창이 열린 채 · &lay=split 이면 옛 나눔 배치) / ?tab=character 등 (탭 바로 열기) / ?dev=offline (반복 켠 채 껐다 켠 상황 — 런 마무리 배너) / ?dev=form (편성 패널이 열린 상태) / ?dev=tactics (연구 탭 — 전술 칸이 전부 열린 상태)
 */

import * as M from './mock.js';
import { t, L, lang, setLang, applyDocumentLang } from './i18n.js';
import { mountBattle } from './battle.js';
import { bindTipNode, hideTip, heroTipCard, skillTipCard } from './tip.js';
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
const itemOf = uid => (uid ? G.items[uid] : null) ?? null;
const wornItems = h => SYS.game.heroItems(G, h);
const combatOf = h => SYS.game.heroCombat(G, h);
const cycleOf = h => combatOf(h).action_period;
const xpNext = h => SYS.hero.xpNeeded(h.level);
/* 이번 출정에서 아웃됐는가 — 치료 타이머가 없어져 시계를 안 본다 (base_expedition_design §1-1, 2026-09-03) */
const isOut = h => G != null && SYS.game.isOut(G, h.uid);
/* 실효 쿨 = ceil(표기 쿨 ÷ 행동 주기) × 행동 주기 (battle_design §6) — 공식은 game_logic 소유다 (부채 #3) */
const effectiveCd = (cd, cycle) => SYS.formula.effectiveCd(cd, cycle);
/* 액티브 3칸의 출처 — **칸을 정하는 것은 출처다** (skill_design §2). 순서도 이 배열이 정한다 */
const ACTIVE_SOURCES = ['innate', 'weapon_group', 'advance'];
/* 그 영웅의 액티브 — 배정은 game_logic(skill.activesFor), 표시(아이콘·설명)는 skillInfo 가 붙인다.
   배정은 인스턴스 `{id, source}` 라 **출처를 화면이 다시 알아내지 않는다** — 「고유」 표시는 source 가 답이다.
   **칸은 출처 자리다** — 무기를 안 낀 영웅은 「무기」 칸이 비고, 전직 전이면 「전직」 칸이 빈다.
   배정 순서로 채우면 무기 없는 영웅의 전직 스킬이 무기 칸에 앉아 「무엇이 비었나」가 안 읽힌다 */
const activeCells = h => {
    const wg = h && G ? SYS.game.weaponGroupOf(G, h) : null;
    const list = (h ? SYS.skill.activesFor(h, { weaponGroup: wg }) : [])
        .map(a => ({ ...skillInfo(a.id), source: a.source }));
    return ACTIVE_SOURCES.map(src => list.find(a => a.source === src) ?? null);
};
/* 빈 칸의 사유 — 왜 비었는지가 칸 안에서 답해져야 한다 (「빈 칸」만 찍으면 고장으로 읽힌다) */
const emptySlotText = i => t(['sk.emptySlot', 'sk.emptyWeapon', 'sk.emptyAdvance'][i] ?? 'sk.emptySlot');
/* 칸 이름 = 출처 이름. 「고유」는 이미 쓰던 키를 그대로 재사용한다 */
const sourceName = i => t(i === 0 ? 'sk.innate' : `sk.src.${ACTIVE_SOURCES[i]}`);

const sinColor = id => M.SINS[id]?.color ?? 'var(--text-muted)';
const sinName = id => L(M.SINS[id]) || id;
const rarity = r => M.RARITY[r] ?? M.RARITY.magic;
const tierOf = h => M.HERO_TIER[h.tier] ?? M.HERO_TIER.rare;
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
const injuryChip = h => isOut(h) ? `<span class="injury-chip">${t('injury.out')}</span>` : '';

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
/** 예상 소요 = 라운드별 목표 전투시간 합 (round_budget.csv) */
function stageMinutes(stage) {
    const sec = D.roundTypes.reduce((a, r) => {
        const key = r.round_type === 'boss' ? stage.boss_grade : r.round_type;
        return a + (D.budgets[key]?.time_target_sec ?? 0);
    }, 0);
    return Math.max(1, Math.round(sec / 60));
}

/**
 * 몬스터 얼굴 (src/assets/art/faces/<스타일>/). 폴백은 죄종 색 원판 + 이름 이니셜 (faces/README 규격).
 * 이미지가 있어도 **이니셜을 함께 깐다** — 고른 스타일에 그 몬스터 그림이 없으면 `onerror` 로 img 만 사라지고
 * 밑의 이니셜이 드러난다 (스타일을 그리는 중에도 화면이 안 빈다, mock.js FACE_STYLES).
 */
/** 이미지 밑에 까는 폴백 — 테두리·배경은 건드리지 않는다(아트가 있는 동안 초상은 색을 갖지 않는다). 드러나는 건 img 가 빠졌을 때뿐 */
const faceInit = (name, c) => `<span class="face-init" style="color:${c};background:${c}22">${name.charAt(0)}</span>`;
const faceChip = (id, extraCls = '') => {
    const src = monsterFace(id);
    const name = L(monsterName(id));
    const c = sinColor(monsterSin(id));
    if (src) return `<span class="face ${extraCls}" title="${name}">${faceInit(name, c)}<img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()"></span>`;
    return `<span class="face none ${extraCls}" title="${t('face.noArt', { name })}"
        style="color:${c};background:${c}22;border-color:${c}66">${name.charAt(0)}</span>`;
};
/**
 * 영웅 초상 — 네모 박스. 관전 유닛 카드의 스프라이트와 같은 규격이다: **영웅의 생김새는 어디서나 같다**
 * (2026-08-27, SCREEN_DESIGN §5). 어느 그림인지는 `mock.heroFace` 가 **이름에서** 정한다 — 후보는 uid 가 없다.
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
/* 아이템 그림 — 무기는 무기군, 방어구는 **임시로 부위당 한 장** (SCREEN_DESIGN §2 · 규칙은 `mock.itemArt` 한 곳).
   그림이 없는 부위(투구·목걸이)는 부위 이모지로 떨어진다 — 스킬과 달리 해시 폴백을 안 쓴다(틀린 그림 = 틀린 정보) */
const itemImg = it => {
    const src = M.itemArt(it?.slot, it?.group);
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : (slotDef(it?.slot)?.icon ?? '');
};

/* ═══════════ 화면 상태 ═══════════ */

// 탭 10 — 마을이 자원·탐험으로 갈렸다 (SCREEN_DESIGN §1 개정 2026-09-04 사용자 지시). 순서는 그 지도와 같다:
// 원정 → 캐릭터 → 강화가 코어 루프의 **한 동작**이라 앞에 붙어 서고(줍고 → 배분하고 → 올린다 — GAME_DESIGN §3),
// 보충(선술집 · 상점)이 그 뒤, 맡기고 나가는 둘(자원 · 탐험)이 그 뒤, 그 산출을 먹는 연구가 이어지고, 참조 둘(도감 · 도움말)이 끝이다.
// 09-03 순서에서 실제로 움직인 것은 **캐릭터 하나(6번 → 2번)** 다 — 나머지는 상대 순서가 유지된 채 마을 자리에 자원·탐험이 들어갔다.
// 탭 이름은 활동(강화 · 상점)이고 패널 머리는 장소(제련소 · 상단 — `dp.post.*`)로 남는다 (§8-2 · §8-3).
// 의뢰 탭은 폐지 — 게시판은 선술집 탭 안이다(§8-1). 스킬은 캐릭터 안의 **창**(§7).
// `?tab=` 이 죽은 이름(`town` · `commission` · `skill` · `base`)을 받으면 조용히 무시된다(아래 TABS.includes) — 탭으로는 도달할 자리가 없기 때문
const TABS = ['expedition', 'character', 'forge', 'tavern', 'shop', 'resource', 'explore', 'research', 'codex', 'help'];

/* 파견 목록 — **카드 3** (SCREEN_DESIGN §8 개정 2026-09-04 사용자 지시: 채광 · 채집 · 벌목).
   담당 능력치는 여기 적지 않는다: `hero_attribute.csv:dispatch` 가 능력치 → 파견처를 이미 들고 있어서
   화면이 배정표를 또 가지면 CSV 와 갈린다. `postAttr()` 가 그 열을 거꾸로 읽는다.
   ⚠ 탐험은 기획에서 **파견처가 아니고**(base_expedition §2-2) 「열린 파견처 수 = 동시 파견 상한」에도 안 들어간다 —
   **탭이 되어도 그대로 유효**하다. 09-01 에 「화면에서만 나란히 선다」였던 것이 화면에서도 갈라졌을 뿐이다 (§1 · §8-4).
   셋 다 1인 배치라 `party` 플래그를 쓰는 항목이 없다 — 인원 표기 자체는 계속 찍는다 (§8).
   ⚠ **`mine` 은 옛 장소 id 그대로다** — 화면 라벨만 「채광」(활동)이 됐고, `hero_attribute.csv:dispatch` 가
   `mine` 을 값으로 들고 있어 `postAttr('mine')` 이 그 열을 읽는다. 키 리네임은 CSV 동반 수정이라 별건이다.
   ⚠ **`log`(벌목)는 기획에 없는 신규 파견처다** — 화면이 기획을 앞서갔다(의도된 역방향 · 사용자 지시 · §8).
   `tiers` = 단계 표를 든 `D` 필드 이름. **채광만 표가 있다**(`mine_node.csv`) — 채집 · 벌목은 산출물이 기획 백지라
   표를 지어내지 않고 줄만 그린다(`—`). 표가 생기면 여기 필드 이름만 적으면 붙는다 (§8) */
const POSTS = [
    { id: 'mine', label: 'dp.post.mine', tiers: 'mineNodes' },
    { id: 'gather', label: 'dp.post.gather' },
    { id: 'log', label: 'dp.post.log' },
];

/* 시작 파티 후보의 기준 시드 — 고정값이라 같은 리롤 횟수면 언제나 같은 3명 (결정론 확인용).
   마스터 시드(전투·드롭)는 확정 시각으로 찍는다 — 플레이마다 다른 전투, 같은 세이브 안에선 같은 전투. */
const ROLL_SEED = 20260824;

const state = {
    screen: 'start',        // start | game
    tab: 'expedition',
    exp: 'idle',            // idle | battle | report
    btLayout: 'wide',       // 관전 배치 — wide | split (2026-09-03 사용자 지시). 세이브 아님
    heroUid: null,
    codexChapter: 1,
    slotFilter: null,
    roll: 1, candidates: [], confirmOverwrite: false,
    salvageMode: false,
    forgeSeg: 'up',              // 제련소 세그먼트 — craft | up (SCREEN_DESIGN §8-2)
    forgeItem: null,             // 제련소에서 고른 장비 uid
    forgeFilter: null,           // 제련소 목록의 부위 필터 — 캐릭터 탭과 따로 둔다(화면이 다르면 필터도 다르다)
    flash: null,            // {key, params} — 다음 render 한 번만 보인다
    battle: null,           // {result, stageId} — 관전 재생 중인 전투
    // 편성 패널이 연 스테이지 (SCREEN_DESIGN §4-1) — null 이면 패널이 없다. 지역을 눌러야 열린다(자동으로 열지 않는다)
    expStage: null,
    // 반복 의사 — G.run.repeat 은 「진행 중인 런」의 값이라 출발 **전에는** 쓸 곳이 없다. 화면이 들고 있다가 출발할 때 런에 옮긴다
    expRepeat: false,
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
}

function render() {
    // 관전 중 재렌더(가방 클릭 · 언어 전환 · 세그먼트 이동)면 재생 위치를 받아 뒀다가 다음 mount 에 넘긴다 — 처음부터 다시 틀지 않는다 (2026-08-27)
    if (stopBattle) { const pos = stopBattle(); if (state.battle) state.battle.resume = pos; stopBattle = null; }
    applyDocumentLang();
    M.applyDocumentFace();
    if (G) {
        if (!heroById(state.heroUid)) state.heroUid = G.heroes[0]?.uid ?? null;
    }
    renderShell();
    const main = $('.main');
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
    renderModal();
    hideTip();
}

/**
 * 창 레이어 (SCREEN_DESIGN §2 · §7) — 탭 위에 겹쳐 뜨는 판 하나. 한 번에 한 장만 뜬다.
 * **닫는 길이 셋**인 이유는 창이 화면을 덮기 때문이다: 닫기 버튼 · 판 바깥 클릭 · `Esc`(bindEsc).
 * 창 안에서 랭크를 찍으면 render() 가 통째로 다시 돌지만 `state.modal` 이 남아 있어 **창은 열린 채**다 (§7).
 */
const MODALS = { skill: { title: 'nav.skill', body: skillTreeBody } };

function renderModal() {
    const layer = $('#modal');
    const m = MODALS[state.modal];
    layer.hidden = !m;
    layer.innerHTML = '';
    if (!m) return;
    const box = el('div', 'modal-box');
    const head = el('div', 'modal-head');
    head.appendChild(el('h2', '', t(m.title)));
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
    // 판 **바깥**을 눌렀을 때만 닫는다 — 판 안의 클릭이 올라와도 닫히면 랭크 한 번 찍고 창이 사라진다
    layer.onclick = e => { if (e.target === layer) closeModal(); };
}

const closeModal = () => { state.modal = null; render(); };
const openModal = id => { state.modal = id; render(); };

/** 세그먼트 버튼 묶음 — items: {id, label, disabled?} */
function segmented(items, current, onPick) {
    const box = el('div', 'segmented');
    for (const it of items) {
        const b = el('button', `btn sm${it.id === current ? ' on' : ''}`, it.label);
        if (it.disabled) b.disabled = true;
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
                <div class="ng-name"><b>${L(h.name)}</b>${tierChip(h)}<span class="sin-chip">${sinName(h.sin)}</span></div>
                <div class="ng-cls">${className(h.cls)} · Lv.${h.level}</div>
                <div class="ng-role muted">${classLine(h.cls)}</div>
                ${innate ? `<div class="ng-skill">
                    <span class="ico">${skillImg(innate)}</span>
                    <span class="txt"><i class="tag">${t('sk.innate')}</i><b>${L(innate.name)}</b></span>
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
    if (skillNode) bindTipNode(skillNode, () => skillTipCard(innate));
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
function runBattle(stageId, { instant = false, tab = null } = {}) {
    const r = SYS.game.resolveBattle(G, stageId, now());
    if (!r.ok) {
        flash({ locked: 'exp.locked', noParty: 'exp.noParty' }[r.err] ?? 'exp.cantDepart');
        state.exp = 'idle'; render(); return;
    }
    // 반복 의사를 이번 런에 옮긴다 — resolveBattle 은 같은 스테이지 재출발일 때만 옛 값을 잇는다
    if (G.run && stageId === state.expStage) G.run.repeat = state.expRepeat === true;
    save();
    // instant(개발용)는 관전을 건너뛰므로 onEnd 가 없다 — 귀환 판정을 여기서 같이 한다
    if (instant) {
        if (!(G.run?.repeat && r.result.won)) SYS.game.returnToTown(G);
        save();
        state.battle = null; state.exp = 'report'; render(); return;
    }
    // tab — 개발용 ?dev=play&bt=dmg: 로그 창을 누적 데미지 판으로 **열어** 헤드리스가 클릭 없이 닿게 한다 (2026-09-03: 창이 됐으므로 win 도 같이 넘긴다)
    state.battle = { result: r.result, stageId, resume: tab ? { t: 0, speed: 1, running: true, tab, win: true } : undefined };
    state.exp = 'battle';
    render();
}

function renderExpedition(main) {
    // 화면 전환(편성·지역 / 전투 관전 / 리포트) — 패널 **위**의 줄이 아니라 **첫 패널 안** 왼쪽 위에 선다 (2026-09-03 사용자 지시).
    // 줄 하나가 통째로 사라지므로 아래 패널이 그만큼 올라온다
    const expNav = () => segmented([
        { id: 'idle', label: t('exp.seg.idle') },
        { id: 'battle', label: t('exp.seg.battle'), disabled: !state.battle },
        { id: 'report', label: t('exp.seg.report'), disabled: !G.lastReport },
    ], state.exp, id => { state.exp = id; render(); });

    if (state.exp === 'battle' && state.battle) {
        const { result, stageId } = state.battle;
        stopBattle = mountBattle(main, {
            result, stageId, heroes: G.heroes, repeat: G.run?.repeat === true, resume: state.battle.resume,
            // 관전 배치 — 'wide'(아레나 전폭 + 로그 창) / 'split'(옛 구조: 좁은 아레나 + 우측 딜미터 열).
            // 재생 위치(resume)가 아니라 **취향**이라 화면 상태가 든다 — 런이 바뀌어도 남고, 세이브에는 안 들어간다
            layout: state.btLayout, onLayout: v => { state.btLayout = v; },
            nav: expNav(),   // 재생기가 자기 헤드 왼쪽 위(.bh-nav)에 꽂는다
            onEnd: auto => {
                if (auto && G.run?.repeat && result.won) runBattle(stageId);
                // 반복이 안 이어지면 파티가 마을로 돌아온 것이다 — 아웃된 영웅이 전부 낫는다 (§1-1, 2026-09-03)
                else { SYS.game.returnToTown(G); save(); state.exp = 'report'; render(); }
            },
        });
        // 아레나 아래 가방 — 접속 중 = 원정 전투 + 아이템 정리 (GAME_DESIGN §3). 정산은 출발 순간 끝났으므로 여기서 정리해도 이 전투는 안 바뀐다
        main.appendChild(itemsPanel(heroById(state.heroUid), { showTarget: true }));
        return;
    }
    if (state.exp === 'report' && G.lastReport) return renderExpReport(main, expNav());
    state.exp = 'idle';
    renderExpIdle(main, expNav());
}

/** 파티에 넣고 뺀다 — 편성 화면 영웅 띠의 클릭 (2026-08-27, 옛 파티·벤치 행을 띠가 대신한다) */
const toggleParty = h => {
    const r = SYS.game.toggleParty(G, h.uid, now());
    if (!r.ok) flash({ full: 'exp.partyFull' }[r.err] ?? 'exp.partyFull');
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
        ${G.lastReport ? `<button class="btn sm b-report">${t('exp.notice.report')}</button>` : ''}
        <button class="btn sm b-ok">${t('exp.notice.dismiss')}</button>`;
    const rb = box.querySelector('.b-report');
    if (rb) rb.onclick = () => { SYS.game.dismissNotice(G); save(); state.exp = 'report'; render(); };
    box.querySelector('.b-ok').onclick = () => { SYS.game.dismissNotice(G); save(); render(); };
    return box;
}

function renderExpIdle(main, nav) {
    const nb = noticeBanner();
    if (nb) main.appendChild(nb);

    /* 스테이지 — 해금된 챕터까지 보여주고, 다음 챕터 첫 스테이지는 잠긴 채로 예고 */
    const zp = el('div', 'panel');
    // 첫 줄 = 왼쪽 화면 전환 · 오른쪽 제목 (2026-09-03) — 옛 제목 줄 자리를 그대로 쓰므로 세로가 안 늘어난다
    const zh = el('div', 'panel-nav');
    if (nav) zh.appendChild(nav);
    zh.appendChild(el('h2', '', t('exp.zones.h')));
    zp.appendChild(zh);
    const firstLocked = D.stageList.find(s => !SYS.game.stageUnlocked(G, s.stage_id));
    const maxCh = firstLocked ? firstLocked.chapter : D.stageList[D.stageList.length - 1].chapter;
    const rows = D.stageList.filter(s => s.chapter <= maxCh);   // 해금된 챕터는 잠긴 스테이지까지 다 보인다 — 어디까지 가야 하는지가 보여야 한다
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
        const pool = SYS.battle.stagePool(z);
        const bossLabel = chapterBoss ? t('kind.chapterBoss') : t('kind.boss');
        const bossTail = chapterBoss ? t('exp.solo') : t('exp.escorts');
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
                : `<span class="muted" style="font-size:var(--fs-sm)">${t('exp.locked')}</span>`}</div>
            <details class="zone-more">
                <summary>${t('exp.viewComp')}</summary>
                <div class="note-body">
                    <div class="face-row">
                        ${pool.map(id => faceChip(id)).join('')}
                        <span class="face-sep">·</span>${faceChip(z.boss_monster_idx, 'boss')}
                        <span class="muted">${pool.map(id => L(monsterName(id))).join(', ')}</span>
                    </div>
                    <div class="round-plan">
                        ${D.eliteRounds.map(n => `<span class="rk elite">${t('exp.eliteR', { n })}</span>`).join('')}
                        <span class="rk boss">R${D.bossRound} ${bossLabel} · ${L(monsterName(z.boss_monster_idx))}${bossTail}</span>
                    </div>
                </div>
            </details>`;
        // 행 클릭 = 고른다 → 위에 편성 패널이 열린다. 접이식 「구성 보기」는 선택과 별개다
        row.querySelector('.zone-more').onclick = ev => ev.stopPropagation();
        row.onclick = () => {
            if (!unlocked) { flash('exp.locked'); return; }
            // 접이식이라 여는 자리와 닫는 자리가 같다 — 같은 지역을 다시 누르면 접힌다 (2026-08-28, 닫기 버튼을 대신한다)
            if (state.expStage === z.stage_id) { state.expStage = null; render(); return; }
            state.expStage = z.stage_id;
            // 반복 의사는 그 스테이지의 런에서 읽어 온다 — 런이 없거나 다른 스테이지면 꺼진 채로 시작
            state.expRepeat = G.run?.stageId === z.stage_id && G.run.repeat === true;
            render();
        };
        zp.appendChild(row);
        // 고른 행 **바로 아래**로 펼쳐진다 (2026-08-28) — 목록 위에 따로 뜨면 어느 지역의 편성인지 눈이 잇지 못한다
        if (z.stage_id === state.expStage) zp.appendChild(formPanel(z, sin));
    }
    main.appendChild(zp);
}

/**
 * 편성 패널 — 지역을 골랐을 때 **그 행 바로 아래**로 펼쳐진다 (2026-08-28, SCREEN_DESIGN §4-1).
 * 갈 곳이 정해진 뒤에 누구를 보낼지 정한다: 영웅 띠(클릭 = 파티 토글) + 경고 줄 + 액션 버튼 둘(반복 원정 · 보내기).
 * 머리도 닫기 버튼도 없다 — 무엇에 딸린 패널인지는 위 행이 말하고, 닫는 것은 그 행을 다시 누르는 것이다.
 * **크기는 상태에 흔들리지 않는다** — 위 셋이 전부 항상 있는 부품이다.
 */
function formPanel(z, sin) {
    const p = el('div', 'form-panel');
    p.style.borderLeftColor = sinColor(sin);

    // 머리(제목 · 닫기 버튼)는 두지 않는다 (2026-08-28) — 무엇에 딸린 패널인지는 바로 위 행이 말하고,
    // 닫는 것은 그 행을 다시 누르는 것이다. 머리가 없으니 패널 높이를 흔들 것도 하나 줄었다
    /* 파티 = 영웅 띠 (2026-08-27 — 옛 파티·벤치 두 패널을 걷어내고 띠 하나가 그 결정을 든다).
       클릭 = 파티에 넣고 뺀다(출정 아웃은 거절 → 플래시) · 파티는 **카드 겉 테두리**로 보이고 위칸 글씨는 대기/출정 아웃만 (2026-08-28).
       전투 관전·리포트에는 띠를 두지 않는다 — 전투 화면만 본다 */
    // 리더 = G.party[0] = **제일 먼저 넣은 영웅** (toggleParty 가 클릭 순서로 push 한다)
    const strip = heroStrip(toggleParty, { leaderUid: G.party[0] ?? null, flat: true, partyMode: true });
    // 경고는 있을 때만 글자가 뜨지만 **줄은 항상 잡는다** — 안 그러면 패널이 상태에 따라 커졌다 작아진다 (2026-08-28)
    // 부상 경고는 없어졌다 [2026-09-03] — 마을에 부상자가 없으므로 편성이 막히는 경우가 파티 0 하나뿐이다
    const warn = G.party.length === 0 ? t('exp.noParty') : '';
    strip.appendChild(el('div', 'down exp-warn', warn));
    p.appendChild(strip);

    /* 액션 — 같은 크기 버튼 둘. 반복 원정이 옛 별도 줄(repeatRow)에서 여기로 내려왔다 (2026-08-28 사용자 지시):
       그 줄이 런의 스테이지일 때만 붙어서 패널 크기가 흔들렸다. 버튼은 항상 있으므로 크기가 고정된다 */
    const actions = el('div', 'form-actions');
    const rep = el('button', `btn lg toggle${state.expRepeat ? ' on' : ''}`, t('exp.repeat'));
    rep.onclick = () => {
        state.expRepeat = !state.expRepeat;
        // 이 스테이지가 지금 도는 런이면 곧바로 런에도 옮긴다 — 관전의 자동 진행이 이 값을 읽는다
        if (G.run?.stageId === z.stage_id) { G.run.repeat = state.expRepeat; save(); }
        render();
    };
    const go = el('button', 'btn lg primary', t('exp.deploy'));
    go.onclick = () => runBattle(z.stage_id);
    actions.appendChild(rep);
    actions.appendChild(go);
    p.appendChild(actions);
    return p;
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

function renderExpReport(main, nav) {
    const R = G.lastReport;
    const stage = D.stages[R.stageId];
    // 철수(전투불능 발생 · 시간 초과)와 패배(전멸)를 색으로 가른다 — 철수는 루팅 전량 보존이라 실패가 아니다 (SCREEN_DESIGN §4-3)
    const withdrew = R.reason === 'timeout' || R.reason === 'retreat';
    const verdictCls = R.won ? 'clear' : withdrew ? 'retreat' : 'lose';
    const verdictText = R.won ? t('rep.clear') : withdrew ? t('rep.retreat') : t('rep.defeat');
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

    const p = el('div', 'panel');
    p.innerHTML = `
        <div class="panel-nav"></div>
        <div class="report-head">
            <span class="verdict ${verdictCls}">${verdictText}</span>
            <span>${stageTitle(stage)}</span>
            <span class="muted">${fmtDuration(R.durationSec * 1000)}${R.won ? '' : ` · ${t(`rep.reason.${R.reason}`)}`}</span>
        </div>
        <div class="gain-row">
            <div><span>${t('res.gold')}</span>${R.gold.toLocaleString()}</div>
            <div><span>${t('res.dust')}</span>${R.dust}</div>
            <div><span>${t('rep.xp')}</span>${t('rep.xpEach', { n: R.xpEach.toLocaleString() })}</div>
            <div><span>${t('rep.rounds')}</span>${t('rep.roundsCleared', { n: roundsDone, total: D.balance.rounds_per_stage })}</div>
            <div><span>${t('rep.downed')}</span>${R.downed.length ? `<span class="down">${t('rep.downedN', { n: R.downed.length })}</span>` : t('rep.none')}</div>
            <div><span>${t('rep.miss')}</span>${missText}</div>
            <div><span>${t('rep.cards')}</span>${cardTotal ? t('cx.cards', { n: cardTotal }) : t('rep.cardsNone')}</div>
        </div>`;
    for (const lu of R.levelUps) {
        const h = heroById(lu.uid);
        const gains = Object.entries(lu.gains).map(([id, n]) => `${L(D.heroAttributes.find(s => s.id === id))} +${n}`).join(', ') || t('rep.gainsNone');
        p.appendChild(el('div', '', `<div class="up" style="font-size:var(--fs-sm);margin-bottom:8px">
            ${t('rep.levelUp', { name: L(h?.name), a: lu.from, b: lu.to })} &nbsp;<span class="muted">${gains}</span></div>`));
    }
    // 도감 카드 — 루팅 리포트에 찍히는 사건 (monster_design §8). 이번 카드로 레벨이 올랐으면 같이 알린다
    if (cardEntries.length) {
        const lines = cardEntries.map(([id, n]) => {
            const total = G.codexCards[id] ?? 0;
            const up = SYS.game.codexLevel(total) > SYS.game.codexLevel(total - n);
            const name = L(monsterName(Number(id)));
            return `${name}${n > 1 ? ` ×${n}` : ''}${up ? ` <span class="up">▲ ${t('rep.cardLevelUp', { name, lv: SYS.game.codexLevel(total) })}</span>` : ''}`;
        });
        p.appendChild(el('div', '', `<div style="font-size:var(--fs-sm);margin-bottom:8px"><span class="muted">${t('rep.cards')}</span> &nbsp;${lines.join(', ')}</div>`));
    }
    if (R.downed.length) {
        const inj = el('div', 'injury-box');
        inj.innerHTML = `
            <div class="t">${t('rep.injuryHead')}</div>
            ${R.downed.map(uid => { const h = heroById(uid); return `<div class="r"><span>${L(h?.name)}</span><span class="down">${isOut(h ?? {}) ? t('injury.out') : t('rep.healed')}</span></div>`; }).join('')}`;
        p.appendChild(inj);
    }
    const actions = el('div', 'report-actions');
    const again = el('button', 'btn primary', t('rep.again'));
    again.onclick = () => runBattle(R.stageId);
    const back = el('button', 'btn', t('rep.toIdle'));
    back.onclick = () => { state.exp = 'idle'; render(); };
    actions.appendChild(again); actions.appendChild(back);
    p.appendChild(actions);
    if (G.run) p.appendChild(repeatRow());
    if (nav) p.querySelector('.panel-nav').appendChild(nav);
    main.appendChild(p);

    const cols = el('div', 'cols c2');

    const dp = el('div', 'panel');
    dp.appendChild(el('h2', '', `${t('rep.drops.h')} <small>${t('rep.drops.sub', { n: R.drops.length })}</small>`));
    if (R.discarded) dp.appendChild(el('div', 'down', `<div style="font-size:var(--fs-xs);margin-bottom:8px">${t('rep.discarded', { n: R.discarded })}</div>`));
    for (const uid of R.drops) {
        const d = itemOf(uid);
        if (!d) continue;                          // 이미 분해했거나 착용했다
        const row = el('div', 'drop-row');
        row.innerHTML = `
            <div>
                <div style="color:${rarity(d.rarity).color};font-size:var(--fs-sm)">${L(d.name)}</div>
                <div class="muted" style="font-size:var(--fs-xs)">${L(rarity(d.rarity))} · ${L(slotDef(d.slot))} · ilvl ${d.ilvl}</div>
            </div>
            ${G.bag.includes(uid) ? `<button class="btn sm b-salvage">${t('rep.salvage')}</button>` : ''}`;
        bindTip(row, d);
        const sv = row.querySelector('.b-salvage');
        if (sv) sv.onclick = ev => { ev.stopPropagation(); const r = SYS.game.salvage(G, uid); if (r.ok) { flash('ch.salvaged', { n: r.dust }); save(); } render(); };
        dp.appendChild(row);
    }
    cols.appendChild(dp);

    const wp = el('div', 'panel');
    wp.appendChild(el('h2', '', `${t('rep.log.h')} <small>${t('rep.log.sub', { e: D.eliteRounds.join('·'), b: D.bossRound })}</small>`));
    const ul = el('ul', 'wave-log');
    for (const w of R.rounds) {
        const kindTag = w.kind !== 'normal' ? ` <b class="rk ${w.kind === 'normal' ? '' : (w.kind.includes('boss') ? 'boss' : w.kind)}">${t(`kind.${w.kind === 'stage_boss' || w.kind === 'chapter_boss' ? 'boss' : w.kind}`)}</b>` : '';
        const counts = {};
        for (const id of w.killed) counts[id] = (counts[id] ?? 0) + 1;
        const list = Object.entries(counts).map(([id, n]) => `${L(monsterName(Number(id)))}${n > 1 ? ` ×${n}` : ''}`).join(', ');
        ul.appendChild(el('li', `r-${w.kind.includes('boss') ? 'boss' : w.kind}`, `
            <span>R${w.n}${kindTag}</span>
            <span>${list ? t('rep.roundLine', { list }) : t('rep.roundNone')}</span>
            <span>${w.eliteSin ? `<span class="sin-chip" style="color:${sinColor(w.eliteSin)}">${sinName(w.eliteSin)}</span>` : ''}</span>`));
    }
    wp.appendChild(ul);
    cols.appendChild(wp);
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
 * 영웅이 지금 하는 일 — 출정 아웃 > 대기. 파견은 미구현이라 아직 대기로 뭉뚱그린다.
 * **전투 파티는 여기 안 적는다** (2026-08-28 사용자 지시) — 파티는 「하는 일」이 아니라 **고른 것**이라 카드 겉 테두리가 든다.
 * 그래야 클릭이 고른 티가 나고, 이 줄은 「보낼 수 있는가(대기) / 없는가(출정 아웃)」만 말하게 된다.
 */
function heroDoing(h) {
    if (isOut(h)) return { cls: 'down', text: t('hs.doing.out') };
    return { cls: 'idle', text: t('hs.doing.idle') };
}

/**
 * 영웅 띠 패널 — 원정(편성)·캐릭터·스킬·선술집 공통. onPick(hero) 가 카드 클릭.
 * 표시 둘 — `on` = 지금 보고 있는 영웅(안쪽 하이라이트) · `party` = 전투 파티(겉 테두리, 2026-08-28).
 * 카드 = 초상(카드 전체) + 위칸(왼쪽 지금 하는 일 · 오른쪽 이름) — SCREEN_DESIGN §5 (2026-08-27)
 * 올려놓으면 기본 능력치 툴팁 (2026-08-28, ui/tip.js heroTipCard)
 * leaderUid — 편성 화면만 준다. 파티 첫 슬롯 = 리더 (옛 파티 행의 리더 표시를 띠가 이어받았다)
 * flat — 편성 패널처럼 이미 패널 안에 들어갈 때. 패널 껍데기(테두리·배경·여백)를 벗는다
 */
function heroStrip(onPick, { leaderUid = null, flat = false, partyMode = false } = {}) {
    const p = el('div', flat ? 'hs-panel flat' : 'panel hs-panel');
    // partyMode — 클릭이 파티 넣고 빼기인 띠(편성). 보낼 수 있는 건 **대기**뿐이라 출정 아웃인 카드는 안 눌리는 티를 낸다
    const strip = el('div', `hero-strip${partyMode ? ' party-mode' : ''}`);
    for (const h of G.heroes) {
        const doing = heroDoing(h);
        // on = 지금 보고 있는 영웅(안쪽 하이라이트) · party = 전투 파티(겉 테두리). 두 표시는 뜻이 달라 겹쳐도 된다
        const c = el('div', `hs-card${h.uid === state.heroUid ? ' on' : ''}${G.party.includes(h.uid) ? ' party' : ''}${h.tier === 'unique' ? ' unique' : ''}${isOut(h) ? ' downed' : ''}`);
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
        c.onclick = () => onPick(h);
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
                bindTip(cell, it);
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
    p.appendChild(el('h2', '', `${t('ch.gear.h')} <small>${t('eq.equipped', { n: worn.length, cap: D.equipSlots.length })}</small>`));
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
 * **고유 스킬**이 실린 칸에는 번호 옆에 표시한다 — 어느 칸인지는 인스턴스의 `source` 가 말한다(화면이 판정하지 않는다).
 */
function skillCards(h) {
    const wrap = el('div', 'sk-cards-wrap');
    wrap.appendChild(el('div', 'sub-h', `${t('ch.skill.h')}<span class="muted">${t('sk.cycle')} <b>${t('sk.cycleSec', { s: cycleOf(h).toFixed(2) })}</b></span>`));
    const grid = el('div', 'sk-cards');
    activeCells(h).forEach((a, i) => {
        const innate = ACTIVE_SOURCES[i] === 'innate';
        const c = el('div', `sk-card${a ? '' : ' vacant'}${innate ? ' innate' : ''}`);
        // 칸 이름은 **출처**다 — 번호만 찍으면 「2번이 왜 비었나」에 화면이 답을 못 한다 (skill_design §2)
        c.innerHTML = `<span class="no">${i + 1} · ${sourceName(i)}</span>${a ? `<span class="ico">${skillImg(a)}</span>` : ''}<span class="nm">${a ? L(a.name) : emptySlotText(i)}</span>`;
        grid.appendChild(c);
    });
    wrap.appendChild(grid);
    const go = el('button', 'btn sm go-tree', t('ch.skill.go'));
    // 탭 이동이 아니라 **창**이다 (SCREEN_DESIGN §7 개정 2026-09-01) — 대상 영웅은 이 탭이 이미 골랐다
    go.onclick = () => openModal('skill');
    wrap.appendChild(go);
    return wrap;
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
        const filled = rows.filter(s => c[s.id] !== undefined).length;
        const p = el('div', 'panel');
        p.appendChild(el('h2', '', `${t('ch.detail.hn', { n: pi + 1 })} <small>${t('ch.detail.sub', { n: filled, total: rows.length })}</small>`));
        const list = el('div', 'cs-scroll');
        list.innerHTML = rows.map(s => {
            const has = c[s.id] !== undefined;
            const a = s.attr ? D.heroAttributes.find(x => x.id === s.attr) : null;
            const extra = RES_ROWS.includes(s.id) ? ` <span class="muted">${t('st.resCap', { cap: resCap })}</span>`
                : s.id === 'defense' && has ? ` <span class="muted">${t('st.mitigation', { p: mitigationPct(c.defense) })}</span>` : '';
            return `<div class="cs-row${has ? '' : ' off'}${s.sheetOrder <= DETAIL_LEAD ? ' lead' : ''}">
                <span class="cs-n">${L(s)}${a ? `<i class="cs-a" title="${L(a)}">${a.abbr}</i>` : ''}</span>
                <span class="cs-v">${fmtCombat(s, c[s.id])}${extra}</span></div>`;
        }).join('');
        p.appendChild(list);
        return p;
    });
}

/** ③ 아이템 — 가방. 클릭 = 착용(분해 모드면 분해 · 강화 모드면 강화). 열 수는 창 폭이 정한다 */
function itemsPanel(h, { showTarget = false } = {}) {
    const p = el('div', 'panel');
    const bagItems = G.bag.map(itemOf).filter(Boolean);
    const items = bagItems.filter(i => !state.slotFilter || i.slot === state.slotFilter);
    // **제목 줄이 없다** (2026-09-01 사용자 지시) — 아래 가방이 화면 밖으로 밀려 있었고, 「아이템」이라는 글자는
    // 칸 격자가 이미 말하고 있었다. 다만 **수치는 안 지운다**: 칸 수와 (관전에서는) 장착 대상을 도구 줄 오른쪽이 든다
    // (SCREEN_DESIGN §6 · §4-1 「값은 항상 찍는다」). showTarget — 영웅 띠가 없는 관전 화면에서 대상 영웅을 적는다
    const tools = el('div', 'items-tools');
    const filter = el('div', 'segmented');
    for (const f of [{ id: null, label: t('eq.filter.all') }, ...D.slots.map(s => ({ id: s.id, label: s.icon, title: L(s) }))]) {
        const b = el('button', `btn sm${state.slotFilter === f.id ? ' on' : ''}`, f.label);
        if (f.title) b.title = f.title;
        b.onclick = () => { state.slotFilter = f.id; render(); };
        filter.appendChild(b);
    }
    tools.appendChild(filter);
    // 두 모드는 배타다 — 클릭 한 번이 「분해」와 「강화」 둘 중 무엇인지 화면에서 하나로 읽혀야 한다
    const sv = el('button', `btn sm toggle${state.salvageMode ? ' on' : ''}`, t('ch.salvageMode'));
    sv.onclick = () => { state.salvageMode = !state.salvageMode; render(); };
    tools.appendChild(sv);
    // 강화 모드 토글은 2026-09-03 에 없앴다 — 강화의 자리는 **제련소**(§8-2)다. 갈래가 둘(`+`강화·옵션강화)이라
    // 모드 토글 하나로는 어느 갈래인지 못 고른다. 가방에서 바로 여는 길(우클릭 → 강화)은 나중에 (SCREEN_DESIGN §6)
    tools.appendChild(el('span', 'items-meta muted',
        `${t('ch.items.sub', { n: G.bag.length, cap: D.balance.inventory_cap })}${showTarget ? ` · ${t('bt.items.target', { name: L(h.name) })}` : ''}`));
    p.appendChild(tools);

    const grid = el('div', `inv-cells wide${state.salvageMode ? ' salvage' : ''}`);
    for (let i = 0; i < D.balance.inventory_cap; i++) {
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
            bindTip(cell, it, itemOf(h.equipped[target]), ringHint);
            cell.onclick = () => {
                if (state.salvageMode) {
                    const r = SYS.game.salvage(G, it.uid);
                    if (r.ok) { flash('ch.salvaged', { n: r.dust }); save(); }
                } else {
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
    const stack = el('div', 'char-stack');
    stack.appendChild(heroStrip(pickHero));
    const band = el('div', 'cols c-char');
    band.appendChild(gearPanel(h));
    band.appendChild(attrPanel(h));
    for (const p of detailPanels(h)) band.appendChild(p);
    stack.appendChild(band);
    stack.appendChild(itemsPanel(h));
    main.appendChild(stack);
}

/* ── 비교 툴팁 ── */

function tipCard(item, headText, hint = '') {
    const c = el('div', 'tip-card');
    if (!item) {
        c.innerHTML = `<div class="tip-head">${headText}</div><div class="tip-empty">${t('tip.empty')}</div>`;
        return c;
    }
    const sins = item.sins ?? [];
    const g = SYS.item.groupOf(item);            // 무기군 — 직업 전속·행동 주기·공격 타입의 출처 (weapon_group.csv)
    // 강화한 아이템은 **먹인 값**을 찍는다 — 툴팁 숫자가 캐릭터 시트와 갈리면 안 된다 (SCREEN_DESIGN §6)
    const eff = SYS.item.effective(item);
    const us = item.uid ? SYS.game.upgradeState(G, item.uid) : null;
    const sub = [L(rarity(item.rarity)), L(slotDef(item.slot)), `ilvl ${item.ilvl}`];
    if (g) sub.push(t('ch.weaponGroup', { group: L(g), cls: g.classes.map(className).join('/') }));
    c.innerHTML = `
        <div class="tip-head">${headText}</div>
        <div class="tip-name" style="color:${rarity(item.rarity).color}">${item.up > 0 ? `+${item.up} ` : ''}${L(item.name)}</div>
        <div class="tip-sub">${sub.join(' · ')}</div>
        ${g ? `<div class="tip-implicit">${t('st.atk')} ${eff.watk} (${t(`st.atkType.${item.element ?? g.damageKind}`)}) · ${t('sk.cycleSec', { s: g.period.toFixed(2) })}</div>` : ''}
        ${eff.implicit ? `<div class="tip-implicit">${affixText(eff.implicit)}</div>` : ''}
        ${us ? `<div class="tip-up">${us.cost == null ? t('tip.up.max', { up: us.up })
            : `${t('tip.up.next', { up: us.up, g: us.cost })}${us.optionAt ? ` · ${t('tip.up.option', { n: us.optionAt })}` : ''}`}</div>` : ''}
        <ul>${(item.affixes ?? []).map(a => `<li>${affixText(a)}</li>`).join('') || `<li class="tip-empty">${t('tip.noAffix')}</li>`}</ul>
        <div class="tip-sins">${sins.map(s => `<span class="sin-tag" style="color:${sinColor(s)};margin-right:4px">${sinName(s)}</span>`).join('')}
            ${hint ? `<span class="muted">${hint}</span>` : ''}</div>`;
    return c;
}

// 표시·위치·넘침 보정은 tip.js 가 든다 (2026-08-28). 여기 남은 건 아이템 카드의 **내용**뿐이다
function bindTip(node, item, equipped, hint) {
    bindTipNode(node, () => [
        tipCard(item, equipped === undefined ? t('tip.equipped') : t('tip.this'), hint),
        equipped !== undefined ? tipCard(equipped, t('tip.equipped')) : null,
    ]);
}

/* ═══════════ 스킬 ═══════════ */

/**
 * 액티브 슬롯 3개 (skill_design §3 / battle_design §5).
 * **고유 스킬**(`source === 'innate'`)만 따로 표시한다 — 나머지 칸은 직업 액티브가 임시로 메운 것이라 이름표가 없다 (§9-0).
 */
function activeSlots(h, title) {
    const cycle = cycleOf(h);
    const p = el('div', 'panel');
    p.appendChild(el('h2', '', title ?? t('sk.slots.h')));
    p.appendChild(el('div', 'cycle-line', `
        ${t('sk.cycle')} <b>${t('sk.cycleSec', { s: cycle.toFixed(2) })}</b>`));
    const box = el('div', 'slot-list');
    activeCells(h).forEach((a, i) => {
        const innate = ACTIVE_SOURCES[i] === 'innate';
        const row = el('div', `act-slot${a ? '' : ' empty'}${innate ? ' innate' : ''}`);
        const no = `${i + 1} · ${sourceName(i)}`;
        if (!a) row.innerHTML = `<span class="no">${no}</span><span class="muted">${emptySlotText(i)}</span>`;
        else {
            const eff = effectiveCd(a.cd, cycle);
            const loss = (eff - a.cd) / a.cd * 100;
            row.innerHTML = `
                <span class="no">${no}</span><span class="ico">${skillImg(a)}</span>
                <span class="nm">${L(a.name)}
                    <span class="cd">${t('sk.base', { s: a.cd })} · <b class="${loss > 0.5 ? 'down' : 'up'}">${t('sk.eff', { s: eff.toFixed(1) })}</b>
                        ${loss > 0.5 ? `<span class="muted">(+${loss.toFixed(0)}%)</span>` : `<span class="muted">${t('sk.aligned')}</span>`}</span>
                </span>`;
        }
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
             title="${L(M.affixText(node.stat, node.total, fb))} — ${node.rank} / ${node.maxRank}${node.unlocked ? '' : t('sk.lockedSuffix')}">
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
function masteryBox({ tag, title, sub, nodes, accent, onLearn, locked }) {
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
    if (onLearn) box.querySelectorAll('.sk-cell[data-node]').forEach(c => { c.onclick = () => onLearn(c.dataset.node); });
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
        nodes: ms.nodes.filter(n => n.treeKind === 'sin'), accent, onLearn: learn,
    }));
    wrap.appendChild(masteryBox({
        tag: t('sk.tab2'), title: t('sk.mastery', { cls }), sub: classLine(h.cls),
        nodes: ms.nodes.filter(n => n.treeKind === 'class'), onLearn: learn,
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
    main.appendChild(researchPanel());

    const p = el('div', 'panel');
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
    main.appendChild(p);
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
 * 지금 있는 표는 그 하나뿐이라 세 카드가 같은 길이로 선다 — 채집·벌목은 이름 자리에 `—` 만 찍는다.
 * **셋 다 그리는 이유**: 트랙을 지우면 「이 파견처는 단계가 없다」로 읽힌다. 구조가 같다는 것이 읽혀야 한다 (§8).
 * 해금 조건(`unlock_chapter`)은 그리지 않는다 — 무엇으로 여는지가 기획 백지라 문턱 키가 없다 (§4-1).
 * 채집·벌목의 표가 생기면 `post.tiers` 가 그걸 가리키고 이 함수는 그대로 돈다.
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
            <span class="dp-t-name">${n ? L({ ko: n.ko, en: n.en }) : '—'}</span>`;
        list.appendChild(li);
    });
    box.appendChild(list);
    return box;
}

function renderResource(main) {
    const stack = el('div', 'char-stack');
    // ⚠ 영웅 띠는 두지 않는다 (2026-09-01 사용자 지시 · SCREEN_DESIGN §8) — 로스터 전원이 목록 위에 한 줄로 서면
    // 정작 고를 것(파견처)이 화면 아래로 밀린다. 영웅을 고르는 자리는 파견처를 연 **다음**이다(배치 화면 — 미착수)

    // 파견처 카드 3 — 미착수 카드도 그린다. 어디까지 열리는지가 보여야 하고, 누르면 안내가 뜨므로 「고장」이 아니다 (§8)
    const row = el('div', 'ng-row');
    for (const post of POSTS) {
        const c = el('div', `dp-cell${post.id === state.post ? ' on' : ''}${post.live ? '' : ' todo'}`);
        const attrs = postAttr(post.id);
        // 담당 능력치가 미정인 카드(채집 · 벌목)도 자리를 지킨다 — 빈 칸은 "안 재고 있다"로 읽힌다 (§4-1)
        const attr = attrs.length ? attrs.map(a => a.abbr).join(' · ') : '—';
        c.innerHTML = `<span class="dp-n">${t(post.label)}</span>
            <span class="dp-meta"><i class="dp-attr" title="${t('dp.attrTitle')}">${attr}</i>
            <i class="dp-size">${t(post.party ? 'dp.party' : 'dp.solo')}</i></span>`;
        c.appendChild(tierTrack(post));
        if (!post.live) c.appendChild(el('span', 'todo-badge', t('todo.badge')));
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
    const map = M.exploreMap(1);
    if (map) {
        const box = el('div', 'ex-map');
        box.style.backgroundImage = `url('${map}')`;
        main.appendChild(box);
    }
    main.appendChild(todoPanel('nav.explore', 'ex.todo'));
}

/* ═══════════ 선술집 탭 — 명단 · 고용 · 의뢰 게시판 (SCREEN_DESIGN §8-1) ═══════════
   2026-09-03 사용자 지시 — 마을의 첫 칸에서 자기 탭이 됐다. 09-01 「선술집을 접는 대가」(고용이 한 단계
   깊어진다)가 이 승격으로 청산됐다. 판정은 전부 game_logic 이 낸다 */
function renderTavern(main) {
    const B = D.balance;
    const full = G.heroes.length >= B.roster_cap;
    const p = el('div', 'panel town-bg');
    p.appendChild(el('h2', '', t('tv.h')));

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
    // 그동안 비어 있던 자리를 채운다. `game_logic` 에 수색이 없어 **동작은 아직 없다** (SCREEN_DESIGN §8-1)
    grid.appendChild(searchCell());
    p.appendChild(grid);

    const tools = el('div', 'tv-tools');
    const rr = el('button', 'btn', T.free
        ? t('tv.reroll.free')
        : t('tv.reroll', { g: T.cost.toLocaleString(), t: fmtDuration(T.freeAt - now()) }));
    rr.disabled = !T.free && G.resources.gold < T.cost;
    rr.onclick = () => { const r = SYS.game.tavernReroll(G, now()); if (!r.ok) flash('tv.err.gold'); else save(); render(); };
    tools.appendChild(rr);
    p.appendChild(tools);

    /* 의뢰 게시판 (SCREEN_DESIGN §8-1 이동 2026-09-03 사용자 지시 · 규격은 §14) — 도구 줄 다음, 패널 맨 아래.
       의뢰 탭이 폐지되면서 게시판이 여기로 들어왔고, 자리는 같은 날 아침 삭제된 도박장 줄의 자리다.
       명단 격자 밖인 이유는 그 줄과 같다 — 후보 카드와 다른 것이라 같은 격자에 세우면 「후보」로 읽힌다.
       제목은 옛 탭 라벨(`nav.commission`)이 섹션 제목으로 내려온 것뿐이라 문구를 새로 쓰지 않는다 */
    const cm = el('div', 'tv-cm');
    cm.appendChild(el('h3', 'tv-cm-h', `${t('nav.commission')} <small class="todo-badge">${t('todo.badge')}</small>`));
    const board = el('div', 'cm-board');
    for (const c of D.commissionList) board.appendChild(commissionCard(c));
    cm.appendChild(board);
    p.appendChild(cm);

    main.appendChild(p);
}

/**
 * 수색 칸 (SCREEN_DESIGN §8-1 신설 2026-09-01 사용자 지시) — 후보 카드와 **같은 크기**의 칸 하나.
 * 옛 규칙(「칸을 미리 그리지 않는다 — 누를 수 없는 칸은 고장으로 읽힌다」)을 뒤집은 자리라, 「고장」이 아니라
 * 「아직」으로 읽히게 하는 장치가 둘이다: **미착수 배지** · 눌러도 오류가 아니라 **안내**(파견 목록의 미착수 칸과 같은 문법).
 * 확정 수치 둘(인원 · 소요)은 미착수라도 찍는다 — 빈 칸은 「안 정해졌다」로 읽힌다 (§4-1).
 * 구현되면 이 자리를 그대로 쓴다: 버튼이 수색 결과 카드로 바뀐다.
 */
function searchCell() {
    const B = D.balance;
    const c = el('div', 'ng-card tv-search');
    c.appendChild(el('div', 'tv-search-h', `${t('tv.search.h')}<small class="todo-badge">${t('todo.badge')}</small>`));
    c.appendChild(el('div', 'tv-search-spec muted',
        t('tv.search.spec', { n: B.tavern_search_slots, h: B.tavern_search_hours })));
    const go = el('button', 'btn b-search', t('tv.search.go'));
    // 미착수 안내는 새 문구가 아니라 도움말·미착수 화면이 쓰던 키 그대로다 (ui 원칙 4 · §11)
    go.onclick = () => { flash('todo.lead'); render(); };
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
    const p = el('div', 'panel town-bg');
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
    const split = el('div', 'fg-split');

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
    const owned = [...new Set([...worn, ...G.bag])].map(itemOf).filter(Boolean)
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
    if (!owned.length) list.appendChild(el('div', 'fg-pick', t('fg.empty')));
    for (const x of owned) {
        const u = SYS.game.upgradeState(G, x.uid);
        const row = el('div', `fg-row${state.forgeItem === x.uid ? ' on' : ''}`, `
            <span class="fg-ic">${itemImg(x)}</span>
            <span class="fg-n" style="color:${rarity(x.rarity).color}">${u.up > 0 ? `+${u.up} ` : ''}${L(x.name)}
                <small class="fg-sub">${L(slotDef(x.slot))} · ilvl ${x.ilvl} · ${worn.has(x.uid) ? t('fg.worn') : t('fg.bag')}</small></span>
            <span class="fg-up">${u.cost == null ? t('tip.up.max', { up: u.up }) : `+${u.up}`}</span>`);
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
        const go = el('button', 'btn primary sm', us.cost == null ? t('tip.up.max', { up: us.up }) : t('fg.go'));
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
    const p = el('div', 'panel town-bg');
    p.appendChild(el('h2', '', `${t('dp.post.trade')} <small class="todo-badge">${t('todo.badge')}</small>`));

    /* 기본상단 — 상주라 **타이머를 안 그린다**. 「언제 가도 같다」가 이 층의 전부다 */
    const basic = el('div', 'td-sec');
    basic.appendChild(el('h3', 'td-h', t('td.basic')));
    basic.appendChild(tradeRows(M.TRADE.basic));
    p.appendChild(basic);

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
    p.appendChild(spec);

    p.appendChild(el('div', 'td-note muted', t('td.noEquip')));
    main.appendChild(p);
}

/**
 * 의뢰 카드 — 종류 배지가 첫인상이고, 그 아래 「어떻게 도는가」 한 줄이 시간축을 든다 (§14).
 * 게시판이 서는 자리는 **선술집 탭**이다 (§8-1 이동 2026-09-03) — 옛 의뢰 탭은 폐지됐고
 * `renderCommission` 도 같이 지웠다. 데이터는 **CSV 두 표**다 — `commission_kind.csv`(종류 4종 ·
 * 확정 기획)와 `commission.csv`(게시판 행 · ⚠임시 자리채움). **칸 수 = 행 수**로 `tactic_slot` 과
 * 같은 문법이라 화면이 개수를 박지 않는다.
 * ⚠ 기능은 아직 없다 — 굴림 · 수락/진행 · 처치 카운터 · 명성 정산이 `game_logic` 에 없어 누르면 안내만 뜬다.
 * 넷은 하는 일이 완전히 달라서(세는 형 = 받아두면 저절로 / 가는 형 = 파티를 보낸다)
 * 이름보다 종류가 먼저 읽혀야 한다. **이름·설명은 CSV 의 `_kr`/`_en` 쌍**이라 `L()` 로 푼다.
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

function monsterCard(m, stage) {
    const cum = codexCum();
    const lv = codexLv(m.cards);
    const maxLv = cum.length;
    const next = cum[lv] ?? null;
    const prev = lv > 0 ? cum[lv - 1] : 0;
    const pct = next ? Math.min(100, (m.cards - prev) / (next - prev) * 100) : 100;
    const src = monsterFace(m.id);
    const name = stage.locked ? '???' : L(monsterName(m.id));
    const c = sinColor(monsterSin(m.id));
    // 이미지가 있어도 이니셜을 깔아 둔다 — 스타일에 그 그림이 없으면 img 만 빠지고 이니셜이 드러난다 (faceChip 과 같은 규칙)
    const faceHtml = stage.locked
        ? `<span class="face unfound">·</span>`
        : src
            ? `<span class="face${m.boss ? ' boss' : ''}">${faceInit(name, c)}<img src="${src}" alt="${name}" loading="lazy" onerror="this.remove()"></span>`
            : `<span class="face none${m.boss ? ' boss' : ''}" style="color:${c};background:${c}22;border-color:${c}66">${name.charAt(0)}</span>`;
    const pips = Array.from({ length: maxLv }, (_, i) =>
        `<span class="pip${i < lv ? ' on' : ''}" title="${t('cx.lvTitle', { lv: i + 1 })} · ${t('cx.cards', { n: cum[i] })}"></span>`).join('');
    return `
        <div class="mon-card${m.boss ? ' boss' : ''}${lv === maxLv ? ' maxed' : ''}${stage.locked ? ' locked' : ''}">
            ${faceHtml}
            <div class="mon-body">
                <div class="mon-top">
                    <span class="mon-name">${name}${m.boss ? `<span class="b-tag">${t('kind.boss')}</span>` : ''}</span>
                    <span class="mon-kills" title="${t('cx.lvTitle', { lv })}"><b>${t('cx.cards', { n: m.cards })}</b></span>
                </div>
                <div class="mon-mid">
                    <span class="pips">${pips}</span>
                    <span class="mon-next muted">${stage.locked ? '' : `${t('cx.kills', { n: m.kills.toLocaleString() })} · ${next
                        ? `${t('cx.next', { n: next })} <span class="up">+${D.codexBonus[lv] ?? 0}%</span>`
                        : `<span class="up">${t('cx.max')}</span>`}`}</span>
                </div>
                <div class="bar"><i style="width:${pct}%"></i></div>
            </div>
        </div>`;
}

function renderCodex(main) {
    const ch = chapterOf(state.codexChapter) ?? D.chapterList[0];
    // 카드·처치 수는 실집계(G.codexCards / G.codexKills), 잠금은 스테이지 해금 상태에서 온다
    const stages = codexStages().filter(st => st.chapter === ch.id).map(st => ({
        ...st, stat: M.CX_STAT[st.num], completion: M.CX_DONE[st.num], locked: !SYS.game.stageUnlocked(G, st.id),
        monsters: st.monsters.map(m => ({ ...m, cards: G.codexCards[m.id] ?? 0, kills: G.codexKills[m.id] ?? 0 })),
    }));
    const chLocked = stages.every(st => st.locked);

    const p = el('div', 'panel');
    p.appendChild(el('h2', '', t('cx.h')));
    const bar = el('div', 'sub-bar');
    bar.appendChild(segmented(D.chapterList.map(c => ({ id: c.id, label: `Ch${c.id} ${L(c.name)}` })), ch.id,
        id => { state.codexChapter = id; render(); }));
    bar.appendChild(el('div', 'muted', `<span style="font-size:var(--fs-xs)">
        ${chLocked
            ? `<span class="down">${t('cx.chLocked')}</span>${t('cx.chLockedTail')}`
            : `${t('cx.sinLabel')} <b style="color:${sinColor(ch.sin)}">${sinName(ch.sin)}</b>`}</span>`));
    p.appendChild(bar);

    for (const stage of stages) {
        const { total, complete } = stageBonus(stage);
        const row = el('div', `codex-stage${stage.locked ? ' locked' : ''}`);
        row.innerHTML = `
            <div class="cs-head">
                <div class="cs-title"><span class="muted">${stage.num}</span> ${L(stage.name)}</div>
                <div class="cs-gain">${stage.locked
                    ? `<span class="muted">${t('cx.locked')}</span>`
                    : `<span class="up">${L(stage.stat)} +${total.toFixed(1)}%</span>
                       <span class="muted"> · ${t('cx.completion')} ${complete ? `<span class="up">${L(stage.completion)}</span>` : L(stage.completion)}</span>`}</div>
            </div>
            <div class="mon-strip">${stage.monsters.map(m => monsterCard(m, stage)).join('')}</div>`;
        p.appendChild(row);
    }
    main.appendChild(p);
}

/* ═══════════ 도움말 ═══════════
   2026-08-26 사용자 지시 — 인게임 패널에는 설명 문장을 두지 않는다. 규칙·근거·미구현 안내는 전부 이 탭으로 모았다.
   문구를 **새로 쓰지 않는다**: 각 패널이 쓰던 i18n 키를 같은 파라미터로 그대로 렌더한다 (SCREEN_DESIGN §12).
   한 페이지 스크롤 + 섹션마다 점프 버튼 하나. 그 외 장식 없음. */

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
                { h: t('exp.zones.h'), sub: t('exp.zones.sub', { r: B.rounds_per_stage }), body: [t('exp.zones.note', rounds)] },
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
    const wrap = el('div', 'panel help');
    wrap.appendChild(el('h1', '', t('help.title')));
    const heads = [];
    wrap.appendChild(segmented(secs.map((s, i) => ({ id: i, label: s.title })), null,
        i => heads[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
    for (const s of secs) {
        const head = el('h2', '', s.title);
        heads.push(head);
        wrap.appendChild(head);
        if (s.lead) wrap.appendChild(el('div', 'note-body', s.lead));
        for (const g of s.groups) {
            wrap.appendChild(el('h3', '', `${g.h}${g.sub ? ` <small>${g.sub}</small>` : ''}`));
            for (const line of g.body) wrap.appendChild(el('div', 'note-body', line));
        }
    }
    main.appendChild(wrap);
}

/* ═══════════ 부팅 ═══════════ */

async function boot() {
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
    // 프롤로그는 새 게임 확정 버튼으로만 닿는 화면이라 헤드리스가 들어올 길을 따로 낸다 (SCREEN_DESIGN §10).
    //   `&s=n` 은 n번째 씬 — 마지막 씬에만 인용·챕터 줄이 서므로 그 상태에도 길이 있어야 한다
    if (dev === 'prologue') {
        if (!G) startGame();
        state.screen = 'prologue';
        state.proScene = Math.max(0, (Number(new URLSearchParams(location.search).get('s')) || 1) - 1);
    }
    if (dev === 'newgame' || (dev === 'battle' && !G)) startGame();
    if (dev === 'battle') runBattle(D.stageOrder[0], { instant: true });
    if (dev === 'play') { if (!G) startGame(); runBattle(D.stageOrder[0], { tab: new URLSearchParams(location.search).get('bt') }); return; }
    if (dev === 'form') {   // 편성 패널이 열린 상태 — 패널은 클릭으로만 열리므로 헤드리스가 닿을 길을 따로 낸다
        if (!G) startGame();
        state.expStage = D.stageOrder[0];
    }
    if (dev === 'tree') {   // 스킬 창이 열린 캐릭터 탭 — 창은 버튼으로만 열린다 (SCREEN_DESIGN §7 · §10)
        if (!G) startGame();
        state.tab = 'character';
        state.modal = 'skill';
    }
    if (dev === 'tactics') {   // 전술 칸이 전부 열린 상태 — 칸은 합산 레벨로만 열리므로 헤드리스가 닿을 길을 따로 낸다
        if (!G) startGame();
        // 마지막 칸의 문턱을 한 영웅에게 몰아 준다(문턱은 로스터 합산이라 이 한 줄이면 전부 열린다)
        G.heroes[0].level = SYS.tactic.slotList[SYS.tactic.slotCount - 1].unlockTotalLevel;
        state.tab = 'research';
    }
    // `?dev=forge` · `?dev=trade` 는 삭제됐다 (2026-09-03 · SCREEN_DESIGN §10) — 강화·상점이 탭이 되어
    // `?tab=forge` · `?tab=shop` 이 바로 닿는다. `?dev=*` 는 클릭으로만 만들어지는 상태에 길을 내는 장치다
    if (dev === 'offline') {   // 반복을 켠 채 게임을 껐다 다시 켠 것처럼 — 런 마무리 배너 확인용
        if (!G) startGame();
        if (!G.run) SYS.game.resolveBattle(G, D.stageOrder[0], now() - 31 * 60000);
        G.run.repeat = true;
        SYS.game.closeRun(G, now()); save();
    }
    // ?tab= 은 dev 분기 **뒤에** 건다 — startGame() 이 탭을 원정으로 되돌리므로 앞에 두면 먹히지 않는다
    if (TABS.includes(tab)) state.tab = tab;
    render();
}

boot().catch(e => {
    console.error(e);
    $('.main').innerHTML = `<div class="panel"><div class="down">${String(e)}</div></div>`;
});
