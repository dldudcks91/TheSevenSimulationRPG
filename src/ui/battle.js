/**
 * 전투 관전 화면 — **재생기**. 전투는 game_logic/battle.js 가 **라운드 단위로** 계산하고(라운드가 시작할 때 그 라운드를 끝까지),
 * 여기서는 그 타임라인을 시간에 맞춰 화면에 옮길 뿐이다 [개정 2026-09-14 · R89].
 *   · 타임라인은 라운드마다 자란다 — 시각을 밀기 전에 `opts.onTime(t)` 을 부르면 앱이 끝난 라운드를 정산하고 다음 라운드를 붙인다.
 *     재생기는 정산하지 않는다 — 배열 끝에 닿으면 다음 라운드가 붙을 때까지 기다린다
 *   · 배속·일시정지는 진행 속도의 문제지 결과의 문제가 아니다. **철수**(옛 건너뛰기)는 결과를 바꾼다 — 그래서 앱(`opts.onRetreat`)이 한다
 *   · 언어를 바꿔도 같은 타임라인을 다시 재생한다
 *
 * 배치: 적(위) / 파티(아래) 상하 대치 — 가로형 카드가 진영마다 한 줄로 나란히 + 아레나 아래 가방(app.js 가 붙인다) (2026-08-27).
 * **배치가 둘이고 컨트롤의 버튼 하나가 오간다** (2026-09-03 사용자 지시, SCREEN_DESIGN §4-2):
 *   · **넓게**(기본) — 아레나가 판 전폭이다. 로그 · 누적은 **없다** — 컨트롤의 두 판 버튼은 흐린 채 안 눌린다 (2026-09-15 · ADR-0130 — 옛 로그 창 폐기)
 *   · **나눔** — 좌 아레나(열을 뺀 폭 · 넓게와 같은 카드) / 우 로그 열 · 두 버튼이 그 열의 판을 고른다 (2026-09-11 · ADR-0093)
 *   판(로그·누적) DOM 은 우측 열 안에 **늘 있다** — 넓게 배치에서는 열만 숨고 줄은 계속 쌓인다(새로 만들면 쌓아 둔 로그와 스크롤이 날아간다).
 *   배치는 재생 위치(resume)가 아니라 **취향**이라 app.js 의 `state.btLayout` 이 들고 `opts.layout`/`opts.onLayout` 으로 오간다 — 런이 바뀌어도 남는다.
 * 로그는 모든 타격을 적는다(누가 → 누구 · 피해 · 쓴 스킬). 로그 판 위의 탭 셋(전체 · 우리 · 적)이 **줄의 주체**로 거른다 — 줄은 다 쌓고 CSS 가 숨긴다 (ADR-0131). 누적 데미지는 이벤트의 dmg 를 더한 표시값이다 — 정산이 아니다.
 * 재렌더에도 재생이 이어진다 — 정리 함수가 재생 위치 {t, speed, running, tab, logf, wall, auto} 를 돌려주고(tab = 우측 열에서 고른 판 · logf = 로그를 거른 주체), 다음 mount 가 opts.resume 으로 받아
 *   그 시각까지 팝업 없이 되감는다 (catchUp).
 * **시각은 실제로 흐른 시간 × 배속이다** (2026-09-11 · ADR-0102) — 눈금 수로 밀지 않는다. 브라우저가 숨긴 탭의 눈금을 늦추기 때문이다.
 *   시계는 `opts.now` 로 읽고(wall = 마지막으로 시각을 민 실제 시각), 공백이 `opts.frozenMs` 를 넘으면 JS 가 멈춰 있었던 것이라 밀지 않는다.
 *   auto = 결과 띠가 다음 런을 세던 중 — 그 도중에 걷히면 앱 시계가 이어서 세운다. 숨긴 탭에서는 앱이 이 재생기를 걷는다.
 * 유닛 카드 = **왼쪽 초상 + 오른쪽 수치 열**뿐이다 [개정 2026-09-03 사용자 지시] — 이름·죄종 칩·정예/보스 태그를 들던 위칸을 통째로 걷었다.
 *   등급은 **테두리 색**이 든다(정예 = 노랑 · 보스 = 빨강). 오른쪽 열은 HP(수치는 바 가운데) / 행동 게이지 / 스킬 쿨 칸.
 *   **몬스터와 영웅의 카드는 이제 같은 물건이다** — 몬스터도 쿨 칸과 창 뱃지 줄을 갖는다 — 칸은 등급이 연 만큼 차고(`round` 이벤트의 `actives` · 2026-09-11 R79 후속) 나머지는 빈 칸이다.
 *   **카드 크기는 몬스터·영웅·보스가 전부 같은 고정값**이다 (2026-08-27, SCREEN_DESIGN §4-2).
 * 스킬 쿨은 **가로 아이콘 칸**이다 — 이름도 % 도 찍지 않고 툴팁이 든다. 남은 쿨은 아이콘을 덮은 판이 걷히며 보여주고,
 *   **발동한 칸은 튀면서 스킬 이름이 초상 위로 떠오른다** (2026-08-27 — 「방금 뭘 썼나」는 게이지가 아니라 팝업이 답한다).
 * 올려놓으면 툴팁 — 영웅 카드는 착용 장비 + Alt 세부 옵션(ADR-0171), 몬스터 카드는 기본 옵션 + Alt 세부 옵션(ADR-0114), 스킬 칸은 그 스킬의 이름 · 표기/실효 쿨 · 설명 (ui/tip.js).
 * 스킬 칸은 **실제 시전을 그린다** (2026-08-30 — 목업 폐기): 켜고 끄는 것은 타임라인의 `skill` 이벤트이고, 남은 쿨은 그 이벤트가
 *   실어 온 `ready`(시뮬이 쓴 실제 쿨)로 걷힌다. 재생기는 쿨을 **계산하지 않는다**. 회복 · 창 · 재생(`heal`·`buff`·`buffEnd`·`regen`)도
 *   같이 그린다 — 무시하면 화면 HP 가 시뮬과 어긋난다. 아이콘 · 설명만 `mock.js` 표시 사전에서 온다.
 * 행동 게이지 = 마지막 행동 이후 경과 ÷ 행동 주기. 행동 이벤트가 온 틱은 **100% 를 먼저 그리고** 다음 틱에
 *   전환 없이(스냅) 비운다 (2026-09-04) — 이벤트가 게이지를 곧장 리셋하면 「꽉 참」 프레임이 화면에 안 나온다.
 * **물리 경직**(`stagger` · R110 · ADR-0154) — 끝 시각까지 창 뱃지 줄 끝에 옅은 빨간 멈춤 칩이 서고, 그동안 행동 게이지가 선다
 *   (경직으로 선 시간을 경과에서 뺀다 — 시뮬이 행동 예약을 그만큼 밀었다). 로그 · 팝업은 없다 — 적이 판마다 수십 번 걸린다.
 *
 * i18n: 표시 문자열은 전부 t()/L() — 이 파일에 한국어 리터럴은 없다 (주석 제외).
 */

import * as M from './mock.js';
import { D, SYS, monsterName, monsterFace, stageName, stageBgOf, chapterOf, skillInfo, potionInfo } from './data.js';
import { t, L } from './i18n.js';
import { bindTipNode, hideTip, heroTipCard, monsterTipCard, skillTipCard, potionTipCard } from './tip.js';

const SPEEDS = [1, 2, 4];
const TICK = 0.1;

const kindLabel = k => t(`kind.${k}`);
/* 스킬 아이콘 그림 — `app.js:skillImg` 와 같은 규칙이다 (SCREEN_DESIGN §2). 두 파일이 서로를 import 하지
   않으므로 한 줄을 각자 든다 — 규칙은 `mock.skillIcon` 한 곳이라 갈릴 자리는 없다 */
const skillImg = s => {
    const src = M.skillIcon(s?.id);
    // 제 그림이 없는 스킬은 **검은 칸** — 남의 그림을 안 빌린다 (2026-09-18 · ADR-0162). 스킬이 없는 칸(`s` 없음)은 그대로 빈다
    return src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : s?.id ? '<i class="sk-noart"></i>' : '';
};
const clamp01 = v => Math.max(0, Math.min(1, v));
/* 물리 경직 (R110 · SCREEN_DESIGN §4-2 · ADR-0154) — 유닛은 마지막 행동 이후의 경직 창 `stalls [{from, to}]` 를 든다(`stagger` 이벤트가 쌓고 행동이 비운다).
   창은 행동을 넘지 않는다 — 시뮬이 행동 예약을 끝 시각 뒤로 밀기 때문이다(INTERFACE §2-6 「경직」). 계산이 아니라 이벤트 시각을 빼는 표시값이다 */
/** 마지막 행동 이후 경직으로 선 시간 — 행동 게이지가 그만큼 덜 찬다 */
const stalledFor = (u, now) => (u.stalls ?? []).reduce((s, w) => s + Math.max(0, Math.min(w.to, now) - Math.max(w.from, u.lastAct)), 0);
/** 지금 경직 중인가 — 창 뱃지 줄의 칩이 이것을 본다 */
const staggered = (u, now) => (u.stalls?.[u.stalls.length - 1]?.to ?? -Infinity) > now;
/** 행동했다 — 게이지를 비우고 경직 창을 걷는다(skill · hit · dodge 가 부른다) */
const markActed = (u, at) => { u.lastAct = at; u.acted = true; u.stalls = []; };

/**
 * @param container  붙일 곳
 * @param opts { result, stageId, heroes: [hero...], repeat: bool, onEnd(auto), onOver(), onTime(t), onRetreat(), now(), frozenMs }
 *   onOver() = 재생이 런의 끝에 닿았다(결과 띠가 선 순간 · 되감기로 선 끝은 안 부른다) — 앱이 상단 세그먼트의 관전 칸을 「전투 종료」로 바꾼다 (ADR-0147)
 *   now = 실제 시각(ms)을 읽는 시계 · frozenMs = 「멈췄다」의 문턱 — 둘 다 앱이 넘긴다 (ADR-0102)
 *   pickedUid = 장착 대상 영웅(그 카드가 파란 겉 테두리) · onPickHero(uid) = 영웅 카드 클릭 — 고르는 것은 앱이다 (ADR-0137)
 *   result = game_logic 전투 결과 (timeline 포함). onEnd 는 재생이 끝나고 사용자가 넘어갈 때 / 반복 자동 진행 시.
 *   onRetry() = 패배한 결과 띠의 [다시 도전] — 같은 스테이지로 다시 보내는 것은 앱이다. 안 넘기면 버튼이 안 선다 (ADR-0138)
 *   onNext() = 반복 없이 이긴 결과 띠의 [다음 스테이지] — 어디가 다음인지 · 보내는 것은 앱이다. 안 넘기면(마지막 스테이지) 버튼이 안 선다 (ADR-0141)
 * @returns 정리 함수
 */
export function mountBattle(container, opts) {
    const { result, stageId, heroes, resume, form } = opts;
    const stage = D.stages[stageId];
    const state = {
        combatOf: opts.combatOf ?? null, itemOf: opts.itemOf ?? null, itemTipOf: opts.itemTipOf ?? null,
        monsterItemTipOf: opts.monsterItemTipOf ?? null,   // 몬스터 장비 칸의 아이템 카드 — 세이브 밖 개체라 uid 가 없다 (ADR-0183)
        // 유닛 툴팁의 세부 옵션 · 착용 장비 · 장비 hover 아이템 카드 — 앱이 든다(재생기는 G 를 모른다 · ADR-0171 · ADR-0182 · ADR-0183)
        pickedUid: opts.pickedUid ?? null, onPickHero: opts.onPickHero ?? null,   // 장착 대상 고르기 — 선택은 앱의 화면 상태다 (ADR-0137)
        t: 0, idx: 0, speed: resume?.speed ?? 1, running: resume?.running ?? true, ended: false,
        round: 0, timer: null, timeouts: [],
        // 마지막으로 시각을 민 **실제 시각**(ms) — 눈금 수가 아니라 이것과의 차이가 시각을 민다. 앱 시계와 주고받는다 (ADR-0102)
        wall: resume?.wall ?? opts.now(),
        auto: false,             // 결과 띠가 다음 런을 세는 중 — 걷히면(탭 이동 · 숨김) 앱 시계가 이어서 세운다 (ADR-0102)
        units: new Map(), party: [], enemies: [],
        dmg: new Map(),          // 누적 데미지 — 이벤트의 dmg 를 더할 뿐 (표시값)
        catchUp: false,          // 재개 되감기 중 — 팝업을 띄우지 않는다
        // 우측 열에서 보고 있는 판 — 넓게 배치로 가 있어도 남는다. **둘 중 하나로 못박는다**:
        // ?dev=play&bt=<아무거나> 처럼 모르는 값이 들어오면 두 판이 다 숨어 빈 열이 선다 (2026-09-03)
        tab: resume?.tab === 'dmg' ? 'dmg' : 'log',
        logf: ['party', 'enemy'].includes(resume?.logf) ? resume.logf : 'all',   // 로그를 거른 주체 — all | party | enemy (ADR-0131)
        dmgf: resume?.dmgf === 'taken' ? 'taken' : 'dealt',   // 누적 판이 보여 주는 축 — dealt | taken (ADR-0252)
        // 배치 [2026-09-03 사용자 지시] — 'wide'(아레나 판 전폭 · 로그 · 누적 없음 · ADR-0130) / 'split'(아레나 + 우측 로그 열 · ADR-0093).
        // 재생 위치가 아니라 **취향**이라 resume 이 아니라 app.js 의 화면 상태(state.btLayout)가 든다 — 다음 원정에도 남는다
        layout: opts.layout === 'split' ? 'split' : 'wide',
        // 물약 칸 — **파티가 같이 쓰고 칸 하나에 물약 하나**. 결과가 칸 수와 찬 칸을 싣고(`result.potion`) `potion` 이벤트가 마신 칸 번호(`i`)를 준다 (R104 · ADR-0148).
        //   물약 없이 도는 런도 칸은 전부 빈 채 선다 — 값은 항상 찍는다 (SCREEN_DESIGN §4-1)
        //   칸의 `null` = 빈 채 나간 칸(재고가 모자랐거나 비워 둔 칸 · R124)
        potion: { max: result.potion?.max ?? 0, slots: (result.potion?.slots ?? []).map(s => (s ? { id: s.id, heal: s.heal, full: true } : null)) },
    };

    // 파티 유닛 — 결과의 party 정보 + 로스터의 표시 정보(이름·죄종·직업)
    state.party = result.party.map(p => {
        const h = heroes.find(x => x.uid === p.uid);
        return {
            key: p.key, side: 'party', name: h?.name, sin: h?.sin, cls: h?.cls, hero: h,   // hero — 툴팁이 기본 능력치를 읽는다 (2026-08-28)
            // 진형의 랭크 번호 (0 = 전열) — 카드 자리에만 쓴다 (2026-09-09). 가로 차례는 `layoutRanks` 가 나중에 박는다
            rank: form?.byUid?.[p.uid] ?? 0,
            hp: p.hpMax, hpMax: p.hpMax, period: p.period, lastAct: -p.period, node: null,
            // 액티브 = 시뮬이 들려 보낸 그 목록(result.party[].actives). 전투 시작엔 전부 준비 상태다
            atkMin: p.atkMin, atkMax: p.atkMax, matkMin: p.matkMin, matkMax: p.matkMax, atkType: p.atkType,   // 툴팁 문장의 피해·회복량(범위 · R90) — 전투에는 안 쓴다 (INTERFACE §2-6)
            // 기본 능력치 — **전투 시작 시점 복사본**(결과가 싣는다). 설명창이 스킬 계수의 식을 푼다 (SCREEN_DESIGN §2 · ADR-0089)
            stats: p.stats ?? null,
            // 첫 준비 시각은 결과가 싣는다(`party[].ready`). 스킬은 준비 상태로 출발해 칸은 걷힌 채 선다 (R100)
            // 오오라도 제 칸에 선다 — 켜진 오오라는 준비 `0`(늘 걷힌 칸) · 안 켜진 오오라는 `null`(늘 덮인 칸) (R98 · ADR-0127)
            skills: (p.actives ?? []).map((id, i) => ({ ...skillInfo(id), readyAt: slotReady(p.ready?.[i], 0), firedAt: 0 })),
            buffs: new Map(),   // 켜져 있는 창 {skillId: {until, stat, v}} — buff/buffEnd 이벤트가 켜고 끈다
            stalls: [],         // 마지막 행동 이후의 경직 창 — stagger 이벤트가 쌓는다 (R110 · ADR-0154)
        };
    });
    for (const u of state.party) { state.units.set(u.key, u); dmgEntry(state, u); }   // 파티는 0 이어도 누적 표에 찍는다

    const dom = buildDom(state, stage, stageId);
    container.appendChild(dom);
    bindControls(state, container, opts);
    bindPotionTips(state, container);   // 첫 프레임의 칸도 카드를 든다 — 다시 칠할 때는 `paintPotion` 이 건다
    // t=0 의 이벤트(첫 라운드 편성)를 먼저 적용해서 첫 프레임부터 적이 서 있게 한다.
    // 재개(resume)면 그 시각까지 조용히 되감는다 — 팝업 없이. 로그·게이지·누적은 다시 쌓인다 (2026-08-27)
    if (resume) { state.t = resume.t; state.catchUp = true; }
    drain(state, container, opts);
    state.catchUp = false;
    if (!state.ended) start(state, container, opts);
    renderDmg(state, container);

    // 정리 함수 — 재생 위치를 돌려준다. 렌더러가 state.battle.resume 에 담아 다음 mount 에 넘기면 이어서 재생된다
    return () => {
        clearInterval(state.timer); state.timer = null;
        for (const id of state.timeouts) clearTimeout(id);
        // wall · auto (ADR-0102) — 앱 시계가 이 자리에서 이어 민다: 마지막으로 시각을 민 실제 시각 · 결과 띠가 다음 런을 세던 중이었나
        return { t: state.t, speed: state.speed, running: state.running, tab: state.tab, logf: state.logf, dmgf: state.dmgf, wall: state.wall, auto: state.auto };
    };
}

/* ───────── 구성 ───────── */

function buildDom(state, stage, stageId) {
    const wrap = document.createElement('div');
    wrap.className = 'panel battle-panel';
    const bg = stageBgOf(stageId);
    // 라운드 트랙은 **그 스테이지의 세트**를 그린다 — 챕터보스 스테이지는 보스 칸 하나다 (battle.stageRounds · 2026-09-11)
    const roundRows = SYS.battle.stageRounds(stage);
    const rounds = roundRows.length;
    const kindOf = n => roundRows.find(r => r.round_num === n)?.round_type ?? 'normal';
    /* 헤드는 **한 줄** [재개정 2026-09-04 사용자 지시 · SCREEN_DESIGN §4-2]
         `.bh-top` — 이름 · 라운드 트랙 ─── (밀어내기) ─── `.battle-ctrl`(배속 · 일시정지 · 건너뛰기 │ 배치 · 로그 · 누적)
       화면 전환 세그먼트는 여기 없다 — 상단바에 선다 (2026-09-11 · ADR-0094)
       「라운드 n / 총 · 종류 · 경과 시계」(`.bh-meta`)는 삭제됐고, 컨트롤 줄이 그 자리로 올라와 헤드가 2줄 → 1줄이 됐다.
       아레나와 그 아래 가방이 줄 하나만큼 위로 올라온다(가방이 화면 아래로 잘리던 것) */
    wrap.innerHTML = `
        <div class="battle-head">
            <div class="bh-top">
                <div class="bh-title">${L(chapterOf(stage.chapter)?.name)} — ${L(stageName(stage))}</div>
                <div class="round-track">${
                    Array.from({ length: rounds }, (_, i) => {
                        const n = i + 1, k = kindOf(n);
                        return `<span class="rt ${k}" data-n="${n}" title="${t('bt.rTitle', { n, kind: kindLabel(k) })}">${n}</span>`;
                    }).join('')
                }</div>
                <div class="battle-ctrl">
                    ${SPEEDS.map(s => `<button class="btn sm b-speed" data-s="${s}">${t('bt.speed', { n: s })}</button>`).join('')}
                    <button class="btn sm b-pause">${t('bt.pause')}</button>
                    <button class="btn sm b-skip">${t('bt.retreat')}</button>
                    <span class="ctrl-div"></span>
                    <button class="btn sm b-layout"></button>
                    <button class="btn sm b-pane" data-tab="log">${t('bt.log.h')}</button>
                    <button class="btn sm b-pane" data-tab="dmg">${t('bt.tab.dmg')}</button>
                </div>
            </div>
        </div>
        <div class="battle-body">
            <div class="arena${bg ? ' has-bg' : ''}"${bg
                ? ` style="background-image:linear-gradient(rgba(0,0,0,.42),rgba(0,0,0,.78)),url('${bg}')"`
                : ''}>
                <div class="side side-enemy"></div>
                <div class="divider"><span class="muted">VS</span></div>
                <div class="side side-party"></div>
                <div class="p-belt b-belt">${potionBeltHtml(state.potion)}</div>
                <div class="battle-result"></div>
            </div>
            <div class="battle-side" hidden>
                <div class="segmented log-filter">${['all', 'party', 'enemy'].map(f => `<button class="btn sm b-logf" data-f="${f}">${t(`bt.logf.${f}`)}</button>`).join('')}</div>
                <div class="segmented dmg-filter">${['dealt', 'taken'].map(f => `<button class="btn sm b-dmgf" data-f="${f}">${t(`bt.dmgf.${f}`)}</button>`).join('')}</div>
                <div class="battle-log-wrap pane"><div class="lg-head"><span class="lg-n">${t('bt.logh.name')}</span><span class="lg-ico">${t('bt.logh.skill')}</span><span class="lg-d">${t('bt.logh.target')}</span><b class="lg-v">${t('bt.logh.val')}</b></div><div class="lg-round"></div><ul class="battle-log"></ul></div>
                <div class="battle-dmg-wrap pane" hidden></div>
            </div>
        </div>`;
    return wrap;
}

function bindControls(state, root, opts) {
    root.querySelectorAll('.b-speed').forEach(b => {
        b.onclick = () => {
            step(state, root, opts);   // 지난 눈금 이후 흐른 시간은 옛 배속으로 친다 (ADR-0102)
            state.speed = Number(b.dataset.s);
            root.querySelectorAll('.b-speed').forEach(x => x.classList.toggle('on', x === b));
            if (!state.ended) start(state, root, opts);
        };
    });
    root.querySelector(`.b-speed[data-s="${state.speed}"]`)?.classList.add('on');
    const pause = root.querySelector('.b-pause');
    pause.textContent = state.running ? t('bt.pause') : t('bt.resume');
    pause.onclick = () => {
        step(state, root, opts);       // 세우기 직전까지 흐른 시간은 친다 — 다시 틀 때는 세워 둔 시간이 안 흐른다(step 이 박자를 민다)
        state.running = !state.running;
        pause.textContent = state.running ? t('bt.pause') : t('bt.resume');
    };
    // 배치 토글 — 버튼 하나로 옛 구조(나눔)와 지금 구조(넓게)를 오간다 (2026-09-03 사용자 지시, SCREEN_DESIGN §4-2)
    root.querySelector('.b-layout').onclick = () => {
        state.layout = state.layout === 'split' ? 'wide' : 'split';
        opts.onLayout?.(state.layout);   // 취향이라 화면 상태에 남긴다 — 다음 원정에도 이어진다
        paintLayout(state, root);
    };
    // 판 고르기 — 컨트롤의 두 버튼은 **나눔 배치에서만** 눌린다: 우측 열의 판을 고른다 (ADR-0130).
    //   넓게 배치에서는 `disabled` 로 흐리게 선다 — 판이 없는데 눌릴 것처럼 보이면 거짓 신호다
    root.querySelectorAll('.b-pane').forEach(b => {
        b.onclick = () => {
            if (state.layout !== 'split') return;
            state.tab = b.dataset.tab;
            paintPane(state, root);
        };
    });
    // 로그 거르기 — **줄의 주체**로 전체 · 우리 · 적 (ADR-0131). 줄은 그대로 두고 목록의 `data-f` 만 바꾼다
    root.querySelectorAll('.b-logf').forEach(b => {
        b.onclick = () => { state.logf = b.dataset.f; paintPane(state, root); };
    });
    // 누적 탭 — 가한 피해 · 받은 피해 (ADR-0252). 판을 그 축으로 다시 그린다
    root.querySelectorAll('.b-dmgf').forEach(b => {
        b.onclick = () => { state.dmgf = b.dataset.f; paintPane(state, root); };
    });
    paintLayout(state, root);
    // 철수 [개정 2026-09-14 · R89 — 옛 건너뛰기] — 진행 중이던 라운드를 버리고 원정을 끝낸다. 결과가 바뀌는 일이라 앱이 한다(`state.retreatRun`)
    root.querySelector('.b-skip').onclick = () => { clearInterval(state.timer); opts.onRetreat(); };
}

/**
 * 배치를 다시 칠한다 (2026-09-03) — 넓게 / 나눔.
 *   넓게 → 우측 열이 숨고 판 버튼 둘이 흐려진다 · 나눔 → 우측 열이 서고 버튼이 판을 고른다 (ADR-0130)
 * 판(로그·누적) DOM 은 열 안에 늘 있다 — 숨어 있는 동안에도 줄은 쌓인다
 */
function paintLayout(state, root) {
    const split = state.layout === 'split';
    root.querySelector('.battle-body').classList.toggle('split', split);
    root.querySelector('.battle-side').hidden = !split;
    root.querySelectorAll('.b-pane').forEach(b => { b.disabled = !split; });
    // 버튼은 **바꿀 배치의 이름**을 든다 — 지금 상태를 적으면 누르면 무엇이 되는지가 안 읽힌다
    root.querySelector('.b-layout').textContent = t(split ? 'bt.layout.toWide' : 'bt.layout.toSplit');
    paintPane(state, root);
}

/** 판을 다시 칠한다 — 어느 판 · 버튼의 눌린 표시 · 로그 탭(거른 주체). 넓게 배치에서는 둘 다 숨고 눌린 표시도 없다 */
function paintPane(state, root) {
    const split = state.layout === 'split';
    root.querySelectorAll('.b-pane').forEach(b => b.classList.toggle('on', split && b.dataset.tab === state.tab));
    const log = root.querySelector('.battle-log-wrap'), dmg = root.querySelector('.battle-dmg-wrap');
    log.hidden = !(split && state.tab === 'log');
    dmg.hidden = !(split && state.tab === 'dmg');
    if (!dmg.hidden) renderDmg(state, root);
    // 판마다 제 탭 — 로그는 주체(전체 · 우리 · 적) · 누적은 축(가한 · 받은 · ADR-0252). 보이는 판의 탭만 선다
    root.querySelector('.log-filter').hidden = log.hidden;
    root.querySelector('.dmg-filter').hidden = dmg.hidden;
    root.querySelectorAll('.b-logf').forEach(b => b.classList.toggle('on', b.dataset.f === state.logf));
    root.querySelectorAll('.b-dmgf').forEach(b => b.classList.toggle('on', b.dataset.f === state.dmgf));
    root.querySelector('.battle-log').dataset.f = state.logf;
    // 숨어 있는 동안에도 줄은 쌓인다 — display:none 에서는 scrollTop 이 안 잡히므로 보일 때 맨 아래로 맞춘다.
    //   스크롤하는 것은 판이 아니라 **목록**이다 — 머리 줄은 판에 서서 안 움직인다 (ADR-0201)
    if (!log.hidden) { const ul = root.querySelector('.battle-log'); ul.scrollTop = ul.scrollHeight; }
}

/* 라운드 표시는 **트랙 하나**가 든다 [2026-09-04 사용자 지시] — 「라운드 n / 총 · 종류」 수치와 경과 시계는 삭제됐다.
   지금 몇 번째인가는 `.now` 강조가, 종류는 칸의 색(정예·보스)이 답한다 (SCREEN_DESIGN §4-2) */
/**
 * 물약 칸 한 줄 (R104 · ADR-0148) — 아레나 왼쪽 아래 구석. 찬 칸 = 그 물약 그림(`mock.potionArt`) · 빈 칸 = 점선.
 * **그림이 없는 칸은 병 실루엣이 깔린다** [2026-09-17 사용자 지시] — 칸 넷이 같은 한 장(`mock.POTION_SLOT_ART`)이고
 *   티어를 안 가린다(「여기에 물약이 들어간다」는 칸의 말이다). 찬 칸은 진하게 · 빈 칸은 옅게 — 진하기는 CSS 가 든다.
 * 재생기는 세지 않는다 — 어느 칸이 비었나는 이벤트의 `i` 가 준다
 */
function potionBeltHtml(p) {
    return Array.from({ length: p.max }, (_, i) => {
        const s = p.slots[i];
        const info = s?.full ? potionInfo(s.id) : null;
        const src = info ? M.potionArt(s.id) : null;
        const img = src ? `<img src="${src}" alt="" onerror="this.remove()">`
            : `<img class="p-bg" src="${M.POTION_SLOT_ART}" alt="" onerror="this.remove()">`;
        return `<span class="p-slot${info ? ' full' : ''}" data-i="${i}">${img}</span>`;
    }).join('');
}
/**
 * 칸마다 **물약 카드**를 건다 (SCREEN_DESIGN §2 「물약 툴팁 규격」 · ADR-0315 · ~~`title` 한 줄~~) — 칸이 문자열로 서므로
 * 그린 **뒤에** 건다. 회복량은 **그 런이 싣고 나간 값**(`slots[i].heal`)이다 — 재생기는 CSV 를 다시 읽지 않는다
 */
function bindPotionTips(state, root) {
    for (const n of root.querySelectorAll('.b-belt .p-slot')) {
        const s = state.potion.slots[Number(n.dataset.i)];
        bindTipNode(n, () => potionTipCard(s?.full ? s.id : null, { heal: s?.heal }));
    }
}
/** 물약 칸을 다시 칠한다 — `fired` = 방금 마신 칸이면 한 번 번쩍인다(되감기 중에는 안 번쩍인다 · 스킬 칸의 `fire` 와 같은 520ms) */
function paintPotion(state, root, fired = -1) {
    const belt = root.querySelector('.b-belt');
    if (!belt) return;
    belt.innerHTML = potionBeltHtml(state.potion);
    bindPotionTips(state, root);
    if (fired < 0 || state.catchUp) return;
    const slot = belt.querySelector(`.p-slot[data-i="${fired}"]`);
    if (!slot) return;
    slot.classList.add('fire');
    state.timeouts.push(setTimeout(() => slot.classList.remove('fire'), 520));
}

function paintRound(state, root) {
    root.querySelectorAll('.rt').forEach(n => {
        const v = Number(n.dataset.n);
        n.classList.toggle('done', v < state.round);
        n.classList.toggle('now', v === state.round);
    });
}

/* ───────── 렌더 ───────── */

/* 정예의 죄종 접두 이름(「나태의 고블린 전사」)은 관전에서 안 쓴다 (2026-09-03 사용자 지시) —
   정예임은 라벨·노란 테두리가 이미 말하고, 접두가 붙으면 같은 몬스터가 다른 이름으로 로그·누적에 흩어진다.
   조립 규칙(`naming.js:eliteName`)은 살아 있다 — 화면이 안 부를 뿐이다 */
const enemyName = e => monsterName(e.monsterId);
const enemyList = state => state.enemies.map(e => L(e.name)).join(', ');
/* 띠 왼쪽의 신원 한 조각 (2026-09-03 사용자 지시 · SCREEN_DESIGN §4-2) — 영웅은 레벨·직업, 몬스터는 정예/보스 라벨.
   일반 몬스터는 빈 채다(테두리 색이 이미 말한다). 라벨은 라운드 종류와 같은 `kind.*` 키를 재사용한다 */
const clsName = id => { const c = D.classes.find(x => x.id === id); return c ? L(c) : (id ?? ''); };
const gradeLabel = u => u.grade === 'elite' ? t('kind.elite')
    : u.grade === 'stage_boss' ? t('kind.boss')
    : u.grade === 'chapter_boss' ? t('kind.chapterBoss') : '';
const identOf = u => u.side === 'party' ? `Lv.${u.hero?.level ?? 1} · ${clsName(u.cls)}` : gradeLabel(u);
/* 개편판 신원 — **양 진영 같은** `Lv.n · 직업` [2026-09-21 사용자 지시 · ADR-0275]. 정예 · 보스 라벨은 띠 오른쪽(`gradeLabel`)으로 간다.
   몬스터 레벨 = 결과가 싣는 세부 능력치의 레벨(`sheet.level` — 이번 런의 스테이지 레벨 · 몬스터도 영웅과 같은 computeCombat 을 지난다) ·
   직업 = `monster.csv:cls`(영웅과 같은 다섯 직업). 값이 없으면 그 조각만 빠진다 — 지어내지 않는다 */
const identV2 = u => {
    const lv = u.side === 'party' ? (u.hero?.level ?? 1) : u.sheet?.level;
    const cls = u.side === 'party' ? u.cls : D.monsters?.[u.monsterId]?.cls;
    return [lv != null ? `Lv.${lv}` : '', cls ? clsName(cls) : ''].filter(Boolean).join(' · ');
};

/* ───────── 진형 (⚠ 목업 · SCREEN_DESIGN §4-1 · §4-2) ─────────
   두 진영이 **같은 규칙**으로 선다 (2026-09-09 사용자 지시 — 적도 파티처럼).
   랭크가 어디서 오는지만 다르다: 파티는 편성 화면이 찍어 보낸 진형, 적은 **몬스터 역할**(`monster.csv:role`). */

/** 적의 랭크 — **`monster_role.csv` 가 SSOT 다** [2026-09-09 진형 확정으로 CSV 이관].
 *  ~~화면이 `ENEMY_BACK_ROLES` 집합을 들고 있던 것~~ 은 폐기: 같은 규칙을 전투(`battle.js:rankOfRole`)도 읽으므로
 *  두 곳에 적으면 화면과 계산이 갈린다. 모르는 역할은 전열(0) — 계산 쪽과 같은 낙하 규칙이다. */
const enemyRank = id => D.monsterRoles?.[D.monsters?.[id]?.role]?.rank ?? 0;

/**
 * 진영 하나의 자리를 정한다 — 각 유닛에 **가로 차례**(`u.order`)를 박고 **깊이**(랭크 수)를 돌려준다.
 *
 * 가로 차례는 「각 랭크를 같은 너비에 고르게 편다」로 나온다 [2026-09-09 사용자 지시] — k 명짜리 랭크의 i 번째가
 * `x = (i + 0.5) / k` 에 서고, 전원을 그 x 로 줄 세운 것이 화면 차례다. **수가 적은 랭크가 저절로 가운데로 온다**:
 *   · 2·1 → 앞 0.25 · **뒤 0.5** · 앞 0.75  = 앞 둘이 양옆, 뒤 하나가 그 사이 (삼각)
 *   · 1·2 → 뒤 0.25 · **앞 0.5** · 뒤 0.75  = 그 뒤집힌 꼴
 * 랭크를 **줄이 아니라 세로 어긋남**으로 그리는 화면이라(카드가 진영마다 한 줄에 선다 — 두 줄은 1280 에서 세로가 모자란다)
 * 가로 차례까지 정해야 진형이 모양으로 읽힌다.
 *
 * ⚠ **깊이는 정원이 아니라 실제로 찬 랭크 수**다 — 한 랭크에 다 몰리면(전원 근접인 적 · 템플릿 3) 1 이 되고,
 *   그러면 CSS 규칙이 하나도 안 걸려 **아무도 안 밀린다.** 있지도 않은 후열 때문에 전열이 올라가 있는 그림을 막는다.
 */
function layoutRanks(list) {
    const byRank = new Map();
    for (const u of list) {
        const r = u.rank ?? 0;
        if (!byRank.has(r)) byRank.set(r, []);
        byRank.get(r).push(u);
    }
    if (byRank.size <= 1) { list.forEach((u, i) => { u.order = i; }); return 1; }
    const spread = [];
    for (const [r, members] of byRank) members.forEach((u, i) => spread.push({ u, r, x: (i + 0.5) / members.length }));
    // x 가 같으면 앞 랭크가 먼저다 — 결정적이어야 같은 편성이 늘 같은 그림으로 선다
    spread.sort((a, b) => a.x - b.x || a.r - b.r);
    spread.forEach((e, n) => { e.u.order = n; });
    return Math.max(...byRank.keys()) + 1;
}

/* 관전 카드 개편판 [2026-09-21 사용자 지시 · ADR-0262] — 이름 띠(신원 · 이름이 카드 맨 위 전폭 띠로)와 **뒤따르는 카드 개편 전부**가
   이 스위치 하나 아래에 선다: JS 는 `cardV2()` 로 가르고 CSS 는 `.unit.v2` 아래에만 둔다 — 그래야 한 번에 개편 전으로 돌아간다.
   **되돌림** — `CARD_V2 = false` 한 줄이면 모든 브라우저에서 개편 전 카드(ADR-0017 모양)다.
   개발용 전/후 버튼(devcompare.js — 상단바 · 임시)이 `<html data-card="v1|v2">` 로 **이 브라우저에서만** 덮어쓴다 */
const CARD_V2 = true;
export const cardV2 = () => { const v = document.documentElement.dataset.card; return v ? v === 'v2' : CARD_V2; };

function renderUnits(state, root) {
    const v2 = cardV2();
    for (const [sel, list] of [['.side-enemy', state.enemies], ['.side-party', state.party]]) {
        const side = root.querySelector(sel);
        side.innerHTML = '';
        // 진형 — **양 진영 같다** (2026-09-09 사용자 지시). 깊이와 랭크만 넘기고 미는 폭·방향은 CSS 가 든다
        // (수치가 스타일에 산다). 방향은 진영이 정한다 — 전열은 언제나 VS 쪽이라 위 진영과 아래 진영이 서로 뒤집힌다
        side.dataset.depth = layoutRanks(list);
        for (const u of list) {
            const n = document.createElement('div');
            const boss = u.grade === 'stage_boss' || u.grade === 'chapter_boss';
            // 등급이 카드의 색을 정한다 — 몬스터는 스폰 등급(정예·보스), 영웅은 **영웅 등급**(`hero_tier.csv:color_hex`).
            // 죄종은 색을 갖지 않는다 (2026-09-03 사용자 지시 · SCREEN_DESIGN §5) — 몬스터 등급 색은 CSS 가 클래스로 든다.
            // 영웅 등급 색은 **CSV 에서 읽어 변수(`--tier-line`)로 건다** (2026-09-15) — CSS 에 등급마다 줄을 박아 뒀더니 09-14 에 생긴 `normal`
            //   (그리고 `magic`)은 줄이 없어 진영색 파랑으로 떨어졌다. 띠 카드(app.js `tierColor`) · 유닛 툴팁(tip.js `--unit-line`)과 같은 출처다
            //   모르는 등급은 `rare` 로 — 두 곳의 `tierOf` 와 같은 폴백이다(영웅이 없는 파티 유닛도 옛 `tier-rare` 그대로)
            const tierLine = u.side === 'party' ? heroTierColor(u.hero) : null;
            // `click` = 누르면 장착 대상이 되는 영웅 카드 · `on` = 지금 장착 대상 (ADR-0137)
            const pick = u.hero && state.onPickHero ? ` click${u.hero.uid === state.pickedUid ? ' on' : ''}` : '';
            n.className = `unit ${u.side}${u.grade === 'elite' ? ' elite' : ''}${boss ? ' boss' : ''}${pick}${u.hp <= 0 ? ' dead' : ''}${v2 ? ' v2' : ''}`;
            if (tierLine) n.style.setProperty('--tier-line', tierLine);   // ⚠ 색은 데이터 값이라 인라인이다 — 규칙(어느 변을 칠하나)은 CSS 가 든다
            // ⚠ **죄종 테두리색은 걷었다** (2026-09-03 사용자 지시) — 정예의 윗변을 죄종 색으로 칠하던 인라인 스타일이다.
            // 「죄종인지 정예인지 안 보이게」와 정면으로 부딪히고, 인라인이라 정예의 노란 테두리(.unit.elite)를 **윗변에서만 이겨** 테두리가 두 색이 됐다.
            // 이제 카드의 테두리는 등급만 말한다: 일반 = 진영색 윗변 / 정예 = 노랑 / 보스 = 빨강
            const name = L(u.name);
            const face = u.side === 'enemy' ? monsterFace(u.monsterId, u.grade) : M.heroFace(u.hero);   // 얼굴 id 는 영웅 객체가 든다 (세이브 v13)
            // **양쪽 다 밑에 아무것도 안 깐다** — 아트가 없거나 `onerror` 로 빠지면 빈 네모다.
            // ⚠ 영웅은 2026-09-03 (직업 글리프가 배경 투명 PNG 사이로 비쳤다), **몬스터는 2026-09-06** 사용자 지시다.
            //   몬스터에 남아 있던 것은 이름 **이니셜 글자 하나**였고, 같은 이유로 그림 위에 비쳤다.
            //   09-03 에 죄종 색 원판을 이미 걷었으므로(「카드 형태를 똑같이」·「죄종 안 보이게」) 이제 폴백은 완전히 빈 칸이다
            const sprite = face
                ? `<div class="sprite has-face"><img src="${face}" alt="${name}" loading="lazy" onerror="this.remove()"></div>`
                : `<div class="sprite"></div>`;
            // 가로형 본문 하나 — 왼쪽 초상 / 오른쪽 HP · 행동 게이지 · 스킬 쿨 칸 (2026-09-03 위칸 폐기) — SCREEN_DESIGN §4-2
            // 쿨 칸은 아이콘뿐이다 — 이름 · 표기/실효 쿨 · 설명은 툴팁이 든다. 남은 쿨은 아이콘을 덮은 판(.cd-mask)이 위에서부터 걷히며 보여준다
            // 칸 수는 언제나 active_slots — 스킬이 둘인 영웅도 셋째 칸이 **빈 채로** 남는다 (SCREEN_DESIGN §4-2 개정 2026-08-31).
            // 칸이 사라지면 카드마다 줄 길이가 달라져 같은 격자로 안 읽히고, 「스킬이 둘」과 「셋째가 미정」이 구분되지 않는다
            // [개정 2026-09-03 사용자 지시] **몬스터도 같은 줄을 그린다** — 옛 규칙(「몬스터는 액티브가 없어 쿨 칸도 없다」)을 폐기한다.
            // 진영마다 줄이 있고 없으면 카드가 다른 물건으로 읽힌다. 몬스터 칸은 등급이 연 만큼(`spawn_grade.csv:skill_slots`) 차고 나머지가 빈 칸이다 [2026-09-11 R79 후속 — 그 전엔 전부 비어 있었다]
            const slots = Array.from({ length: Math.max(D.balance.active_slots, u.skills?.length ?? 0) }, (_, i) => u.skills?.[i] ?? null);
            // 칸이 드는 것은 **그림**이다 (2026-09-03 · SCREEN_DESIGN §2) — 어느 그림인지는 `mock.skillIcon` 이 id 에서 정한다.
            // 파일이 없으면 `onerror` 로 img 만 빠지고 칸이 빈 채 남는다(밑에 이모지를 안 깐다 — 영웅 초상과 같은 이유)
            const skills = `<div class="cd-list">${slots.map(s => s
                ? `<div class="cd-slot"><span class="cd-g">${skillImg(s)}</span><i class="cd-mask"></i></div>`
                : `<div class="cd-slot empty"></div>`).join('')}</div>`;
            // 이름 띠 — **양 진영 같다** (2026-09-03 사용자 지시 · SCREEN_DESIGN §4-2). 같은 날 아침에 걷었던 위칸의 재도입이고,
            // 걷은 이유(이름·죄종 칩·정예 태그가 한 줄에 뒤엉킴)는 **이름만 남기는 것**으로 푼다 — 「무엇인가」는 띠 색(등급)이 든다.
            // 몬스터가 카드에서 이름을 되찾는 자리이기도 하다 — 위칸이 없던 동안은 초상으로만 어느 몬스터인지 구분해야 했다
            // 이름·신원은 **두 줄**이다 (개정 2026-09-07 사용자 지시 — 09-03 「첫 줄 하나」 폐기 · SCREEN_DESIGN §4-2) —
            // 윗줄 = 무채색 신원(`Lv.n · 직업` / 정예·보스 라벨) · 아랫줄 = 이름, 둘 다 **오른쪽 정렬**(재개정 2026-09-07 사용자 지시 — 정렬만 뒤집었다).
            // 한 줄 합침은 좁은 열(~104px)에서 신원(고정 조각)이 줄을 먼저 먹어 이름이 짜부라졌다.
            // 일반 몬스터는 윗줄이 **빈 채**로 자리만 잡는다 — 줄 위치·카드 높이가 카드마다 같아야 격자로 읽힌다
            const ident = identOf(u);
            // 개편판(cardV2) — 맨 위 띠가 신원을 들고, HP 바 바로 위 이름 줄이 **왼쪽 죄종 칩 · 오른쪽 이름**이다 (ADR-0262 · ADR-0270 · ADR-0274).
            //   죄종 칩은 다른 화면과 같은 `sin-chip`(죄종 색 글씨) · 몬스터는 죄종을 가진 정예만 — 일반 · 보스는 `sin` 이 없다
            const sin = v2 && u.sin && M.SINS[u.sin] ? `<span class="sin-chip" style="color:${M.SINS[u.sin].color}">${L(M.SINS[u.sin])}</span>` : '';
            const grade = v2 ? gradeLabel(u) : '';
            const top = v2 ? `<div class="unit-top"><span class="unit-ident">${identV2(u)}</span>${grade ? `<span class="unit-grade">${grade}</span>` : ''}</div>` : '';
            const idRow = v2
                ? `<div class="unit-id">${sin}<span class="unit-name">${name}</span></div>`
                : `<div class="unit-id"><span class="unit-ident">${ident}</span><span class="unit-name">${name}</span></div>`;
            n.innerHTML = `
                ${top}
                <div class="unit-body">
                    ${sprite}
                    <div class="unit-info">
                        ${idRow}
                        <div class="hp-row">
                            <div class="bar hp"><i style="width:${u.hp / u.hpMax * 100}%"></i></div>
                            <span class="hp-text">${Math.max(0, Math.round(u.hp))} / ${u.hpMax}</span>
                        </div>
                        <div class="act-row" title="${t('bt.actTitle', { s: u.period.toFixed(2) })}">
                            <i class="act-fill"></i>
                        </div>
                        ${skills}
                    </div>
                </div>
                <div class="pop-layer"></div>`;
            // 올려놓으면 뜬다 — **양 진영이 같은 카드다**: 착용 장비 첫 장 + Alt 세부 옵션 (SCREEN_DESIGN §2 · ADR-0171 · 몬스터 ADR-0183). 스킬 칸은 그 스킬.
            // 세부 옵션은 영웅이 앱이 넘긴 `combatOf`(= game.heroCombat) · 몬스터가 `round` 이벤트의 `sheet`,
            //   한 벌은 영웅이 `itemOf` 로 푼 `equipped` · 몬스터가 같은 이벤트의 `gear` 다. 소환물(벽)은 둘 다 아니라 안 뜬다.
            // 옛 title 속성은 걷었다: 같은 자리에 브라우저 기본 툴팁이 겹쳐 뜬다
            // 카드의 툴팁은 커서가 아니라 **카드 옆**에 선다 — 크고 오래 읽는 카드라 따라다니면 흔들린다 (2026-09-15 · ADR-0120). 스킬 칸은 커서를 따른다
            // Alt 동안 카드 밖으로 나가도 유지 — 장비 칸 hover 로 아이템 카드를 여는 규칙이 양 진영 같다 (ADR-0176 · ADR-0182 · ADR-0183)
            if (u.hero) bindTipNode(n, () => heroTipCard(u.hero, state.combatOf?.(u.hero) ?? null, state.itemOf,
                it => state.itemTipOf?.(u.hero, it) ?? null), { anchor: true, holdOnAlt: true });
            // 몬스터 장비의 아이템 카드도 영웅 · 캐릭터 탭과 같다 — 스킬 칸의 숫자는 그 몬스터의 표시값이다 (ADR-0183 · ADR-0312)
            else if (u.side === 'enemy') bindTipNode(n, () => monsterTipCard(u,
                it => state.monsterItemTipOf?.(it, unitSkillCtx(u)) ?? null), { anchor: true, holdOnAlt: true });
            // 영웅 카드 클릭 = **장착 대상 고르기** [2026-09-15 사용자 지시 · SCREEN_DESIGN §4-2 · ADR-0137] — 아래 보관 칸이 그 영웅을 향한다. 몬스터 · 소환물은 클릭이 없다
            if (u.hero && state.onPickHero) n.onclick = () => state.onPickHero(u.hero.uid);
            if (u.skills) n.querySelectorAll('.cd-slot').forEach((slot, i) => {
                // 문장이 「몇 초마다 얼마나」를 말하려면 주기·공격력·공격 타입이 필요하다 (SCREEN_DESIGN §4-2)
                // 회복량의 밑수 `matkMin`~`matkMax` · 벽의 `hpMax` · 스킬 계수의 `stats` 도 결과가 싣는다 (SCREEN_DESIGN §4-2 호출 · 범위 R90)
                if (u.skills[i]) bindTipNode(slot, () => skillTipCard(u.skills[i],
                    { ...unitSkillCtx(u), source: u.skills[i].source }));
            });
            u.node = n;
            // 창 뱃지 줄은 **카드 밖**이다 (2026-08-31 사용자 지시) — 카드 안에 두면 그만큼 박스가 커져서
            // 「몬스터·영웅·보스가 전부 같은 고정 크기」의 그 크기가 달라진다. 칸(.unit-slot)이 카드와 줄을 세로로 물고,
            // 카드는 창이 걸리든 말든 옛 크기 그대로다 (SCREEN_DESIGN §4-2)
            const cell = document.createElement('div');
            cell.className = `unit-slot${v2 ? ' v2' : ''}`;   // 개편판은 칸이 카드 폭을 넓힌다 (ADR-0265)
            // 진형의 자리는 **칸**이 든다 (2026-09-09) — 카드가 아니라 칸을 밀어야 창 뱃지 줄이 카드를 따라간다.
            // 세로(어긋남)는 `data-rank` 를 보고 CSS 가, 가로(차례)는 flex `order` 가 든다 — DOM 순서는 진영 배열 그대로 남는다
            // (로그·누적 데미지가 읽는 순서와 갈리지 않게). ⚠ `order` 는 색·크기 같은 디자인 상수가 아니라 **유닛마다 다른 값**이라 인라인이다
            cell.dataset.rank = u.rank ?? 0;
            cell.style.order = u.order ?? 0;
            cell.appendChild(n);
            cell.insertAdjacentHTML('beforeend', '<div class="buff-row"></div>');
            u.buffRow = cell.lastElementChild;
            side.appendChild(cell);
        }
    }
}

function refreshUnit(state, u) {
    if (!u.node) return;
    const pct = Math.max(0, u.hp / u.hpMax * 100);
    u.node.querySelector('.bar.hp > i').style.width = pct + '%';
    u.node.querySelector('.hp-text').textContent = `${Math.max(0, Math.round(u.hp))} / ${u.hpMax}`;
    u.node.classList.toggle('dead', u.hp <= 0);
    // 행동 게이지 — 마지막 행동 이후 경과가 주기에 닿으면 가득 찬다 (SCREEN_DESIGN §4-2 재개정 2026-09-04).
    // 행동한 틱(u.acted — apply 의 skill/hit/dodge 가 세우고 start 의 틱 루프가 눕힌다)은 **100% 를 그린다** —
    // 이벤트가 lastAct 를 곧장 리셋하면 「꽉 참」 프레임이 화면에 한 번도 안 나온다(옛 85% 발광이 때우던 구멍).
    // 리셋(내려가는 변화)은 전환 없이 스냅 — 전환이 걸리면 「비워짐」이 「흘러내림」으로 보인다.
    // **경직된 동안은 선다** (R110 · ADR-0154) — 경직으로 선 시간을 경과에서 뺀다. 시뮬이 행동 예약을 그만큼 밀었으므로 다시 차오른 끝에 행동한다
    const act = u.node.querySelector('.act-fill');
    if (act) {
        const fill = u.hp <= 0 ? 0 : u.acted ? 1 : clamp01((state.t - u.lastAct - stalledFor(u, state.t)) / u.period);
        act.style.transition = fill < u.actFill ? 'none' : '';
        act.style.width = fill * 100 + '%';
        u.actFill = fill;
    }
    // 스킬 쿨 게이지 — 시뮬이 실제로 쓴 쿨(`skill` 이벤트의 firedAt → ready)로 걷는다. 재생기는 쿨을 계산하지 않는다
    if (u.skills?.length) u.node.querySelectorAll('.cd-slot').forEach((slot, i) => {
        const s = u.skills[i];
        if (!s) return;                 // 빈 칸 — 걷을 쿨이 없다 (SCREEN_DESIGN §4-2)
        // 오오라 칸 (R98 · ADR-0127) — 켜진 오오라는 준비 `0` 이라 아래 식이 늘 걷힌 칸을 낸다 · 안 켜진 오오라는 `Infinity` 라 늘 덮는다
        const span = Math.max(1e-6, s.readyAt - s.firedAt);
        const pct = u.hp <= 0 || s.readyAt === Infinity ? 0 : clamp01(1 - (s.readyAt - state.t) / span);
        slot.querySelector('.cd-mask').style.height = (1 - pct) * 100 + '%';   // 남은 쿨만큼 위에서 덮는다
        // 준비 강조(`ready` 파란 테두리)는 2026-09-03 사용자 지시로 삭제 — 마스크가 다 걷힌 것 자체가 준비다
    });
    // 켜져 있는 창 — 카드 전체가 「무언가 걸려 있다」를, 카드 밖 아래 뱃지 줄이 「무엇이 걸려 있나」를 든다 (SCREEN_DESIGN §4-2)
    u.node.classList.toggle('buffed', u.hp > 0 && u.buffs?.size > 0);
    refreshBuffs(u, state.t);
}

/** 남은 시간 표기 — 전투 시각은 0.1초 눈금이라 그 자리까지만 보인다. 12.0은 12로 접는다. */
const effectTimeText = (until, now) => t('time.s', { s: String(Number(Math.max(0, until - now).toFixed(1))) });

/** 떠 있는 창/경직 툴팁의 남은 시간을 재생 시각에 맞춰 갱신한다. */
function refreshEffectTipTime(now) {
    document.querySelectorAll('#tooltip [data-effect-until]').forEach(n => {
        n.textContent = effectTimeText(Number(n.dataset.effectUntil), now);
    });
}

/**
 * 창이 **지금 적용하는 값** 한 줄 — 스킬 설명을 재사용하지 않는다.
 * `value`는 CSV 원값이 아니라 전투가 능력치 계수까지 적용해 `buff` 이벤트에 실은 실효값이다.
 */
function effectSummaryText(stat, value = 0, element = null) {
    const v = Number(value) || 0;
    const pct = String(M.pctNum(Math.abs(v)));
    const key = (() => {
        switch (stat) {
            case 'atk_pct': return v < 0 ? 'bt.effect.atk.down' : 'bt.effect.atk.up';
            case 'period_pct': return v < 0 ? 'bt.effect.period.up' : 'bt.effect.period.down';
            case 'barrier_pct': return 'bt.effect.barrier';
            case 'guard_pct': return v < 0 ? 'bt.effect.guard.down' : 'bt.effect.guard.up';
            case 'def_pct': return v < 0 ? 'bt.effect.def.down' : 'bt.effect.def.up';
            case 'res_elem': return v < 0 ? 'bt.effect.res.down' : 'bt.effect.res.up';
            case 'hp_max_pct': return v < 0 ? 'bt.effect.hp.down' : 'bt.effect.hp.up';
            case 'regen_pct': return v < 0 ? 'bt.effect.regen.down' : 'bt.effect.regen.up';
            case 'dr_pct': return v < 0 ? 'bt.effect.taken.up' : 'bt.effect.taken.down';
            case 'onhit_element': return 'bt.effect.onhit';
            case 'attack_splash': return 'bt.effect.splash';
            case 'duel': return 'bt.effect.duel';
            case 'taunt': return 'bt.effect.taunt';
            default: return 'bt.effect.active';
        }
    })();
    const elem = element ? t(`st.atkType.${element}`) : t('bt.effect.element');
    return t(key, { v: pct, e: elem });
}

/**
 * 창 뱃지 툴팁 — 이름 + **실제 적용 효과** + 남은 시간. 스킬의 대상·쿨·원문 설명은 되풀이하지 않는다.
 * `until === null`인 오오라는 상시, 경직은 스킬 그림 대신 뱃지와 같은 멈춤 표시를 쓴다.
 */
function effectTipCard({ owner, info = null, name = '', stat = null, value = 0, element = null, until = null, now = 0, stagger = false }) {
    const c = document.createElement('div');
    c.className = 'tip-card effect-tip';
    c.dataset.effectOwner = String(owner ?? '');
    const icon = stagger ? '<i class="tip-effect-stagger"></i>' : skillImg(info);
    const summary = stagger ? t('bt.effect.stagger') : effectSummaryText(stat, value, element);
    c.innerHTML = `
        <div class="tip-effect-head">
            <div class="tip-name"><span class="tip-sk-ico">${icon}</span>${name}</div>
            <b class="tip-effect-duration"${until == null ? '' : ` data-effect-until="${until}"`}>${until == null ? t('bt.effect.permanent') : effectTimeText(until, now)}</b>
        </div>
        <div class="tip-effect-summary">${summary}</div>`;
    return c;
}

/**
 * 창 뱃지 줄 — 걸려 있는 창 하나 = 칩 하나. 칩은 그 창을 만든 스킬의 아이콘이고 이름·실제 적용 효과·남은 시간은 전용 툴팁이 든다.
 * **이로운 창은 초록 · 해로운 창은 빨강** 테두리 — 가르는 것은 창의 값 부호다(`buff` 이벤트의 `v`).
 * ⚠ 지금 도는 창 4종은 전부 이로워서 빨강은 아직 안 켜진다 (skill.csv · SCREEN_DESIGN §4-2).
 * 자리는 **카드 밖 · 카드 바로 아래**(`.unit-slot` 의 둘째 줄) — 카드 크기를 건드리지 않는다 (2026-08-31 사용자 지시).
 * 줄은 창이 없어도 **자리를 지킨다** — 높이가 창 개수를 따라 흔들리면 카드가 위아래로 흔들린다.
 * **물리 경직**도 칩 하나다 (R110 · ADR-0154) — 옅은 빨간 테두리 + 멈춤 표시(그림 없음 · CSS 가 그린다) · 끝 시각까지.
 *   **줄 끝**에 선다 — 0.5초씩 켜졌다 꺼지므로 앞에 두면 스킬 칩들이 그때마다 옆으로 밀린다.
 */
function refreshBuffs(u, now) {
    const row = u.buffRow;   // 카드 밖(.unit-slot 의 둘째 줄)이라 u.node 아래서는 못 찾는다
    if (!row) return;
    u.buffTipNow = now;
    refreshEffectTipTime(now);
    const live = u.hp > 0 ? [...(u.buffs ?? new Map())] : [];
    const stag = u.hp > 0 && staggered(u, now);
    const stagUntil = stag ? u.stalls?.[u.stalls.length - 1]?.to ?? now : null;
    // 끝 시각도 지문이다 — 같은 창이 갱신되면 칩 노드와 툴팁의 `until`도 새 값으로 갈아야 한다.
    const sig = live.map(([id, b]) => `${id}:${b?.stat ?? ''}:${b?.v ?? 0}:${b?.until ?? 'always'}`).join('|')
        + (stag ? `|stagger:${stagUntil}` : '');
    if (row.dataset.sig === sig) return;      // 안 바뀌었으면 손대지 않는다 — 매 틱 다시 그리는 자리다
    row.dataset.sig = sig;
    // 이 유닛의 칩을 갈아 끼우면 떠 있던 툴팁의 앵커가 DOM에서 빠진다. 유령 툴팁으로 남기지 않는다.
    const open = document.querySelector('#tooltip .effect-tip');
    if (open?.dataset.effectOwner === String(u.key)) hideTip();
    row.innerHTML = live.map(([id, b]) => {
        const info = skillInfo(id);
        return `<span class="buff-chip ${(b?.v ?? 0) < 0 ? 'bad' : 'good'}" data-effect="${id}">${skillImg(info)}</span>`;
    }).join('') + (stag ? '<span class="buff-chip stagger" data-stagger="1"></span>' : '');

    const byId = new Map(live);
    row.querySelectorAll('[data-effect]').forEach(chip => {
        const id = chip.dataset.effect;
        const b = byId.get(id);
        const info = skillInfo(id);
        // 창의 원소 — 그 창을 건 스킬이 거는 걸린 효과가 든다(`skill_status.csv` · 1단계는 줄이 하나 · 2026-09-22). 무기 옵션 창(`wx:`)은 스킬이 아니라 null
        const element = SYS.skill?.statuses?.[SYS.skill.defs?.[id]?.effects[0].status]?.element ?? null;
        chip.setAttribute('aria-label', `${L(info.name)} — ${effectSummaryText(b?.stat, b?.v, element)}`);
        bindTipNode(chip, () => effectTipCard({
            owner: u.key, info, name: L(info.name), stat: b?.stat, value: b?.v, element,
            until: b?.until ?? null, now: u.buffTipNow,
        }));
    });
    const staggerChip = row.querySelector('[data-stagger]');
    if (staggerChip) {
        staggerChip.setAttribute('aria-label', t('bt.stagger'));
        bindTipNode(staggerChip, () => effectTipCard({ owner: u.key, name: t('bt.stagger'), until: stagUntil, now: u.buffTipNow, stagger: true }));
    }
}

/**
 * 시전 연출 — `skill` 이벤트가 왔을 때만 돈다 (2026-08-30 — 재생기가 스스로 쿨을 리셋하던 목업 폐기).
 * 쓴 칸이 한 번 튀고 스킬 이름이 초상 위로 떠오른다: 「무엇이 준비됐나」는 상태라 게이지가 답하지만
 * 「방금 뭘 썼나」는 사건이라 게이지로는 안 보인다 — 피해 숫자와 같은 팝업 층이 답한다.
 */
function castSkill(state, u, ev) {
    // 같은 스킬이 두 칸이면 **준비된 앞 칸**이 쓴 칸이다 — 시뮬의 발동 선택(칸 순서 · 준비된 것)과 같다. 칸마다 쿨 표시를 지킨다 (R130)
    const at = x => x.id === ev.s;
    let i = u.skills?.findIndex(x => at(x) && (x.readyAt ?? 0) <= ev.t + 0.05) ?? -1;
    if (i < 0) i = u.skills?.findIndex(at) ?? -1;
    if (i < 0) return;
    const s = u.skills[i];
    s.firedAt = ev.t;
    s.readyAt = ev.ready ?? ev.t;   // 준비 시각은 시뮬이 실어 보낸다 (INTERFACE §2-6)
    if (!state.catchUp && u.node) {   // 되감기 중에는 연출을 태우지 않는다
        const slot = u.node.querySelectorAll('.cd-slot')[i];
        if (slot) {
            slot.classList.remove('fire');
            void slot.offsetWidth;    // 연속 발동에도 애니메이션이 다시 돈다
            slot.classList.add('fire');
            state.timeouts.push(setTimeout(() => slot.classList.remove('fire'), 520));
        }
    }
    popup(state, u, L(s.name), 'skill-tag');
}
/** 타격 라벨(`strikeLabel`) — 이벤트가 들고 온 스킬 id(`s`) 의 이름, 없으면 기본 공격. 로그가 쓴다 — 누적 데미지는 id 로 쌓고 그릴 때 같은 이름을 붙인다 */
/** 칸의 첫 준비 시각 — 시뮬이 실은 값 그대로 · `null` 은 안 켜진 오오라라 **늘 덮는다**(Infinity) · 값이 없으면 `dflt` (INTERFACE §2-6 · R98) */
const slotReady = (r, dflt) => r === null ? Infinity : (r ?? dflt);
const strikeLabel = id => id ? L(skillInfo(id).name) : t('bt.basicAttack');

/* ───────── 누적 데미지 — 이벤트의 dmg 를 더할 뿐이다. 재생기는 계산하지 않는다 (정산은 game_logic) ───────── */

/** **영웅만** 쌓는다 — 판이 영웅만 든다 (SCREEN_DESIGN §4-2 · ADR-0149). 항목은 **장부 둘** — 가한 피해(`dealt`) · 받은 피해(`taken`) (ADR-0252).
    가한 피해 줄의 키는 **id** 다 — 스킬 id · 기본 공격 `basic` · 반사 `reflect`. 받은 피해 줄의 키는 **때린 몬스터 id** 다(정예도 같은 줄 — 적 이름이 등급을 안 가른다).
    이름은 그릴 때 붙인다 — 칸 순서로 줄을 세우려면 스킬 id 가 있어야 한다. 항목이 유닛을 들어 그 영웅의 스킬 칸을 읽는다(갈아입기 `refit` 는 같은 유닛에 덮어쓴다) */
const dmgLedger = () => ({ total: 0, kind: { phys: 0, magic: 0, etc: 0 }, by: new Map() });
function dmgEntry(state, u) {
    if (!state.dmg.has(u.key)) state.dmg.set(u.key, { name: u.name, unit: u, dealt: dmgLedger(), taken: dmgLedger() });
    return state.dmg.get(u.key);
}
/* 막대 조각 — 물리 · 마법(원소 전부 — 저항으로 깎이는 쪽) · 기타(종류를 안 싣는 반사 · 자폭) (ADR-0252) */
const dmgKind = ty => !ty ? 'etc' : ty === 'physical' ? 'phys' : 'magic';
function tally(g, key, dmg, kind) {
    g.total += dmg;
    g.kind[kind] += dmg;
    g.by.set(key, (g.by.get(key) ?? 0) + dmg);
}
/** 한 번의 피해 — 때린 쪽(`a`)이 영웅이면 가한 피해, 맞은 쪽(`d`)이 영웅이면 받은 피해에 쌓는다. `ty` = 이벤트가 실어 온 피해 종류(타격만 · 없으면 기타) */
function addDmg(state, a, d, id, dmg, ty) {
    const kind = dmgKind(ty);
    if (a.side === 'party') tally(dmgEntry(state, a).dealt, id, dmg, kind);
    if (d.side === 'party') tally(dmgEntry(state, d).taken, a.monsterId ?? a.key, dmg, kind);
}
/** 누적 데미지 판 — 영웅 한 덩어리 = 왼쪽 초상 + 오른쪽 열(ADR-0211). 열은 머리 줄(합계 · 파티 합 안 % · 막대는 파티 안 최대 기준) 아래에 한 줄씩(아이콘 · 이름 · 피해).
    탭(`state.dmgf`)이 장부를 고른다 — 덩어리 모양은 같고 값의 축만 바뀐다 (ADR-0252). 보이는 동안만 그린다 */
function renderDmg(state, root) {
    const box = root.querySelector('.battle-dmg-wrap');
    if (!box || box.hidden) return;
    const f = state.dmgf;
    const rows = [...state.dmg.values()].sort((a, b) => b[f].total - a[f].total);
    const sum = rows.reduce((a, e) => a + e[f].total, 0);
    const max = rows[0]?.[f].total || 1;
    box.innerHTML = rows.length ? rows.map(e => `
        <div class="dmg-row">${dmgFace(e.unit)}<div class="dmg-body">
            <div class="dmg-head"><span class="dmg-n">${L(e.name)}</span>
                <span class="dmg-v">${e[f].total.toLocaleString()} <span class="muted">${sum ? Math.round(e[f].total / sum * 100) : 0}%</span></span></div>
            ${dmgBar(e[f], max)}
            <div class="dmg-sks">${(f === 'dealt' ? dmgLines(e) : [...e.taken.by.entries()]).map(([id, v]) => `
                <div class="dmg-sk"><i class="dmg-ico">${f === 'dealt' ? dmgIcon(id) : foeIcon(id)}</i><span class="dmg-skn">${f === 'dealt' ? dmgName(id) : L(monsterName(id))}</span><span class="dmg-skv">${v.toLocaleString()}</span></div>`).join('')}</div>
        </div></div>`).join('') : `<div class="dmg-row"><span class="muted">—</span></div>`;
}
/** 머리 줄 막대 — 조각 셋을 왼쪽부터 물리 → 마법 → 기타로 쌓는다. 조각 폭 = 그 값 / 파티 안 최대라 합이 곧 막대 길이다 · 올리면 세 값(기타는 있을 때만) */
function dmgBar(g, max) {
    const ks = ['phys', 'magic', 'etc'];
    const tip = ks.filter(k => k !== 'etc' || g.kind.etc).map(k => t(`bt.dmgk.${k}`, { n: g.kind[k].toLocaleString() })).join(' · ');
    return `<div class="bar dmg" title="${tip}">${ks.map(k => g.kind[k] ? `<i class="k-${k}" style="width:${g.kind[k] / max * 100}%"></i>` : '').join('')}</div>`;
}
/** 줄 순서 — 기본 공격 → 그 영웅 카드의 스킬 칸 순(칸에서 빠진 스킬은 그 뒤) → 반사. 피해 큰 순이면 숫자가 오를 때마다 줄이 자리를 바꾼다.
    받은 피해는 처음 때린 순서(Map 의 넣은 순서) 그대로다 — 같은 이유 */
function dmgLines(e) {
    const slots = (e.unit.skills ?? []).map(s => s.id);
    const rank = id => id === 'basic' ? -1 : id === 'reflect' ? Infinity : (slots.includes(id) ? slots.indexOf(id) : slots.length);
    return [...e.dealt.by.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
}
/* 기본 공격은 스킬 그림이 없어 **무기 칸 실루엣**을 든다 · 반사는 그림이 없다 */
const dmgIcon = id => id === 'reflect' ? '' : id === 'basic' ? `<img src="${M.slotArt('weapon')}" alt="">` : skillImg(skillInfo(id));
const dmgName = id => id === 'basic' ? t('bt.basicAttack') : id === 'reflect' ? t('bt.reflectLabel') : L(skillInfo(id).name);
/* 받은 피해 줄의 그림 — 때린 몬스터의 초상. 없으면 빈 칸이다(초상 칸과 같다) */
const foeIcon = id => { const src = monsterFace(id); return src ? `<img src="${src}" alt="" onerror="this.remove()">` : ''; };
/* 영웅 등급 색(`hero_tier.csv:color_hex`) — 아레나 카드 윗변과 누적 판 초상 윗변이 같이 읽는다. 모르는 등급 · 영웅이 없는 파티 유닛은 `rare` */
const heroTierColor = hero => (D.heroTiers.find(r => r.id === (hero?.tier ?? 'rare')) ?? D.heroTiers.find(r => r.id === 'rare'))?.color;
/* 덩어리 왼쪽 초상 — 그 영웅 카드와 같은 얼굴 그림(공통 조각 `.hero-face`). 아트가 없으면 빈 칸이다 — 밑에 아무것도 안 깐다 (ADR-0211).
   윗변 = 영웅 등급 색 — 카드와 같은 변수(`--tier-line`)를 인라인으로 건다(색은 데이터 · 어느 변을 칠하나는 CSS) */
const dmgFace = u => {
    const src = M.heroFace(u.hero), line = heroTierColor(u.hero);
    return `<span class="hero-face dmg-face"${line ? ` style="--tier-line:${line}"` : ''}>${src ? `<img src="${src}" alt="" onerror="this.remove()">` : ''}</span>`;
};
/* 로그의 물약 줄 그림 — 그 물약의 그림 하나. 없으면 빈 칸이다(칸의 병 실루엣은 「여기에 물약이 들어간다」는 칸의 말이라 로그에 안 빌린다) */
const potionIcon = id => { const src = id ? M.potionArt(id) : null; return src ? `<img src="${src}" alt="" onerror="this.remove()">` : ''; };

/**
 * 떠오르는 한 줄. `skillId` 를 주면 **텍스트 왼쪽에 그 스킬 아이콘**이 붙는다 (SCREEN_DESIGN §4 · 2026-09-08).
 * 기본 공격은 `s` 가 없어 아이콘도 없다 — **아이콘의 유무가 「스킬이 나갔다」는 신호**다.
 * 아이콘만 innerHTML 이고 본문은 텍스트 노드다 — 유닛 이름·수치가 마크업으로 새지 않게 한다.
 */
function popup(state, u, text, cls, skillId = null) {
    if (!u?.node || state.catchUp) return;   // 되감기 중에는 팝업을 띄우지 않는다
    const layer = u.node.querySelector('.pop-layer');
    const p = document.createElement('span');
    p.className = `pop ${cls}`;
    const img = skillId ? skillImg(skillInfo(skillId)) : '';
    if (img) {
        const ico = document.createElement('i');
        ico.className = 'pop-ico';
        ico.innerHTML = img;
        p.appendChild(ico);
    }
    p.appendChild(document.createTextNode(text));
    layer.appendChild(p);
    state.timeouts.push(setTimeout(() => p.remove(), 900));
}

/* 로그 한 줄 = **네 칸 격자** — 주체 이름 · 스킬 그림 · 대상 이름 · 값 (SCREEN_DESIGN §4-2 · ADR-0189).
   칸 폭은 목록 하나의 격자가 정하고 줄이 물려받는다(CSS `subgrid`) — 그래서 모든 줄이 세로로 선다. 넘치는 이름은 `…` · 올리면 전체 이름.
   이름 · 대상 · 값은 **텍스트 노드**다 — 유닛 이름이 마크업으로 새지 않게 한다(`popup` 과 같다). 그림만 마크업이다.
   `side` = 그 줄의 **주체**(party / enemy · 라운드 시작 · 종료는 sys). 로그 탭(전체 · 우리 · 적)이 이 값으로 거른다 (ADR-0131).
   줄은 다 쌓고 목록의 `data-f` 에 따라 CSS 가 숨긴다 — 탭을 바꿔도 다시 그리지 않아 스크롤과 쌓인 줄이 남는다.
   남기는 줄 수는 **주체마다** 센다 — 한 목록에서 세면 파티 셋의 줄이 적의 줄을 밀어내 「적」 탭에 몇 줄만 남는다 */
const LOG_KEEP = 60;
/** 네 칸 한 줄. `ico` = 그림 마크업(`dmgIcon` — 누적 판과 같은 규칙) · `skill` = 그림에 올리면 뜨는 이름 · `vcls` = 값 칸 색(피해 종류 · 회복) */
function logRow(name, ico, skill, target, val, vcls = '') {
    const li = document.createElement('li');
    li.className = 'lg-row';
    const cell = (tag, cls, text) => {
        const n = document.createElement(tag);
        n.className = cls;
        if (text) { n.textContent = text; n.title = text; }
        return n;
    };
    const i = cell('i', 'lg-ico');
    i.innerHTML = ico;
    if (skill) i.title = skill;
    const v = cell('b', vcls ? `lg-v ${vcls}` : 'lg-v');
    v.textContent = val ?? '';
    li.append(cell('span', 'lg-n', name), i, cell('span', 'lg-d', target), v);
    return li;
}
/** 머리 줄 아래 고정 칸 — 지금 라운드 줄(가장 최근 `round` 의 글). 스크롤 목록 밖이라 제자리다 · 넘치면 `…` · 올리면 전체 (ADR-0204) */
function pinRound(root, html) {
    const pin = root.querySelector('.lg-round');
    if (!pin) return;
    pin.innerHTML = html;
    pin.title = pin.textContent;
}
/** 격자 밖 전폭 한 줄 — 라운드 시작 · 종료. 넘치면 `…` · 올리면 전체 */
function wideRow(html) {
    const li = document.createElement('li');
    li.className = 'lg-wide';
    li.innerHTML = html;
    li.title = li.textContent;
    return li;
}
function pushLog(state, root, li, side = 'sys') {
    const ul = root.querySelector('.battle-log');
    li.dataset.side = side;
    ul.appendChild(li);
    const same = ul.querySelectorAll(`li[data-side="${side}"]`);
    for (let i = 0; i < same.length - LOG_KEEP; i++) same[i].remove();
    ul.scrollTop = ul.scrollHeight;   // 목록이 스크롤한다 — 머리 줄은 목록 밖이다 (ADR-0201)
}

/* ───────── 재생 ───────── */

function start(state, root, opts) {
    clearInterval(state.timer);
    state.timer = setInterval(() => step(state, root, opts), TICK * 1000 / state.speed);
}

/**
 * 한 눈금 — 지난 눈금 이후 **실제로 흐른 시간 × 배속**만큼 시각을 민다 (SCREEN_DESIGN §4 · ADR-0102).
 * 눈금 수로 밀면 브라우저가 눈금을 늦출 때 시각도 같이 느려진다 — 눈금 간격(TICK)은 그리는 빈도일 뿐이다.
 * 공백이 문턱(`opts.frozenMs`)을 넘으면 JS 가 멈춰 있었던 것이다 — 그 공백은 **밀지 않는다**.
 * 꺼진 것으로 마무리하는 판단은 앱 시계 한 곳이 한다(`app.js:closeFrozenRun`)
 */
function step(state, root, opts) {
    const at = opts.now(), gap = at - state.wall;
    state.wall = at;   // 세워 둔 동안에도 민다 — 다시 틀 때 세워 둔 시간이 한꺼번에 흐르지 않게
    if (!state.running || state.ended || !(gap > 0) || gap > opts.frozenMs) return;
    state.t += gap / 1000 * state.speed;
    opts.onTime?.(state.t, state.speed);    // 끝난 라운드를 정산하고 다음 라운드를 붙인다 — 붙은 뒤에 적용해야 경계 너머 사건이 한 눈금 늦지 않는다 (R89)
    drain(state, root, opts);
    // acted 는 이 틱의 렌더까지만 산다 — 다음 틱에 눕혀야 게이지가 100% 에서 스냅으로 비워진다 (refreshUnit)
    for (const u of [...state.party, ...state.enemies]) { if (u.hp > 0) refreshUnit(state, u); u.acted = false; }
}

/** 현재 시각까지의 이벤트를 전부 적용한다 */
function drain(state, root, opts) {
    const tl = opts.result.timeline;
    while (state.idx < tl.length && tl[state.idx].t <= state.t + 1e-9) {
        apply(state, root, opts, tl[state.idx]);
        state.idx += 1;
        if (state.ended) break;
    }
}

/**
 * 스킬 문장의 재료 — 그 유닛의 **표시값** (INTERFACE §2-6 · SCREEN_DESIGN §4-2).
 * 문장이 「몇 초마다 얼마나」를 말하려면 주기 · 공격력 · 공격 타입이 필요하고, 회복량의 밑수 `matkMin`~`matkMax` ·
 * 벽의 `hpMax` · 스킬 계수의 `stats` 도 결과가 싣는다(범위 R90). 카드의 스킬 칸과 **몬스터 장비의 아이템 카드**가 같이 쓴다 (ADR-0183).
 * 몬스터도 영웅과 같이 능력치 계수를 탄다 — 전투(`battle.makeEnemy`)와 같은 규칙 (SCREEN_DESIGN §2 · ADR-0298)
 */
const unitSkillCtx = u => ({
    period: u.period, atkMin: u.atkMin, atkMax: u.atkMax, matkMin: u.matkMin, matkMax: u.matkMax,
    hpMax: u.hpMax, atkType: u.atkType, stats: u.stats,
});

/** 적 카드 한 장의 상태 — `round` 의 `enemies` 와 `call`(불러내기 · ADR-0161)의 `units` 가 **같은 모양**이라 한 곳에서 만든다 (INTERFACE §2-6).
 *  @param at 그 카드가 선 시각 — 행동 게이지의 기준 · 스킬 칸의 첫 준비 시각 */
const enemyEntry = (e, at) => ({
    key: e.key, side: 'enemy', monsterId: e.monsterId, grade: e.grade, sin: e.sin, traits: e.traits,
    name: enemyName(e), hp: e.hpMax, hpMax: e.hpMax, period: e.period, lastAct: at, node: null,
    rank: enemyRank(e.monsterId),   // 진형 — 몬스터 **역할**이 정한다 (`monster_role.csv`)
    // 영웅과 **같은 자리**를 갖는다 (2026-09-03 사용자 지시 · SCREEN_DESIGN §4-2) — 카드 형태를 진영 무관 하나로 만든 결과다.
    //   skills      → **시뮬이 실어 온 그 목록**(`round` 이벤트의 `actives` — 파티의 `result.party[].actives` 와 같은 모양) [개정 2026-09-11 R79 후속 · 사용자 지적].
    //                 ⚠ 옛 판은 `skills: []` 로 비웠다(「몬스터 액티브는 아직 없다」) — R79 로 몬스터가 스킬을 쓰게 된 뒤에도 남아 칸이 빈 채였고,
    //                 `castSkill` 이 칸에서 못 찾아 적의 `skill` 이벤트(칸 번쩍임 · 이름 팝업)를 **조용히 흘렸다**
    //   buffs: Map  → ⚠ **이게 없어서 적의 창이 화면에 안 떴다**: buff 이벤트가 `u.buffs?.set` 이라 조용히 흘렸다
    atkMin: e.atkMin, atkMax: e.atkMax, matkMin: e.matkMin, matkMax: e.matkMax, atkType: e.atkType, stats: e.stats ?? null,   // 툴팁 문장의 피해·회복량(범위 · R90) · 스킬 계수 — 파티와 같다 (INTERFACE §2-6)
    sheet: e.sheet ?? null,   // 세부 능력치 — 유닛 툴팁이 Alt 로 편다 (R94 · SCREEN_DESIGN §2 「유닛 툴팁 규격」)
    gear: e.gear ?? null,     // 입고 있는 한 벌 — 유닛 툴팁의 첫 장(장비 3×3)이 읽는다 (R119 · ADR-0183)
    // 첫 준비 시각 = 등장 시각 + 쿨 — 시뮬이 실어 온다(`ready` · R89). 칸은 덮인 채로 선다
    skills: (e.actives ?? []).map((id, i) => ({ ...skillInfo(id), readyAt: slotReady(e.ready?.[i], at), firedAt: at })),
    buffs: new Map(),
    stalls: [],   // 경직 창 (R110 · ADR-0154)
});

function apply(state, root, opts, ev) {
    const U = k => state.units.get(k);
    switch (ev.e) {
        case 'round': {
            state.round = ev.n;
            for (const e of state.enemies) state.units.delete(e.key);
            state.enemies = ev.enemies.map(e => enemyEntry(e, ev.t));
            for (const e of state.enemies) state.units.set(e.key, e);
            renderUnits(state, root);
            paintRound(state, root);
            // 라운드 줄 — 목록에는 경계로 쌓고(지난 라운드를 거슬러 읽을 때), 머리 줄 아래 고정 칸에는 「지금」으로 건다 (ADR-0204)
            //   종류는 글 왼쪽의 칩이다(라운드 트랙과 같은 색) · 첫 라운드는 목록에 안 쌓는다 — 빈 목록 맨 위에서 고정 줄과 같은 글이 두 번 섰다.
            //   목록 줄은 2라운드부터 경계로 선다 (ADR-0205)
            const roundLine = `<span class="lg-kind ${ev.kind}">${kindLabel(ev.kind)}</span>`
                + t('log.roundStart', { n: ev.n, list: enemyList(state) });
            if (root.querySelector('.battle-log').childElementCount) pushLog(state, root, wideRow(roundLine));
            pinRound(root, roundLine);
            break;
        }
        case 'call': {   // 불러내기 (2026-09-18 · ADR-0161) — 처음 부른 무리는 카드로 서고, 쓰러졌던 무리는 **제 카드가 다시 산다**(새 카드 없음)
            let grew = false;
            for (const e of ev.units) {
                const old = U(e.key);
                if (!old) {
                    const u = enemyEntry(e, ev.t);
                    state.enemies.push(u);
                    state.units.set(u.key, u);
                    grew = true;
                    continue;
                }
                // 되살아남 — 시뮬과 같다: HP 가득 · 창은 오오라(`until: null`)만 남는다 · 경직 창 비움 · 스킬은 부른 시각에 준비 (INTERFACE §2-6 `call`)
                Object.assign(old, { hp: e.hpMax, hpMax: e.hpMax, lastAct: ev.t, stalls: [] });
                for (const [id, b] of [...old.buffs]) if (b.until !== null) old.buffs.delete(id);
                old.skills = (e.actives ?? []).map((id, i) => ({ ...skillInfo(id), readyAt: slotReady(e.ready?.[i], ev.t), firedAt: ev.t }));
                refreshUnit(state, old);
            }
            // 카드가 늘었으면 진형 줄을 다시 세운다(라운드 시작과 같은 함수) — 되살아남만이면 자리 그대로다
            if (grew) renderUnits(state, root);
            const a = U(ev.u);
            // 대상 칸 = 불린 무리(쉼표) — 처음 선 것과 되살아난 것을 가르지 않는다 · 값 칸은 빈다 (ADR-0189)
            if (a) pushLog(state, root, logRow(L(a.name), ev.s ? dmgIcon(ev.s) : '', strikeLabel(ev.s), ev.units.map(e => L(U(e.key)?.name ?? enemyName(e))).join(', '), ''), a.side);
            break;
        }
        case 'skill': {   // 시전 — 그 차례의 사건. 뒤따르는 hit/dodge/heal/buff 가 같은 s 를 단다
            const u = U(ev.u);
            if (u) { markActed(u, ev.t); castSkill(state, u, ev); }
            break;
        }
        case 'hit': {
            const a = U(ev.a), d = U(ev.d);
            const skill = strikeLabel(ev.s);
            if (a) { markActed(a, ev.t); if (ev.ahp !== undefined) { a.hp = ev.ahp; refreshUnit(state, a); } }
            if (d) {
                d.hp = ev.dhp;
                popup(state, d, `-${ev.dmg}`, ev.crit ? 'crit' : (a?.side === 'party' ? 'dmg' : 'dmg-in'), ev.s);
                refreshUnit(state, d);
            }
            if (a && d) {
                // 모든 타격을 적는다 — 공격자 · 스킬 그림 · 대상 · 피해 (ADR-0189)
                // 피해 숫자는 **피해 종류 색**(`ty` — 시뮬이 싣는다) · 치명은 로그에 따로 표시하지 않는다 (ADR-0150)
                pushLog(state, root, logRow(L(a.name), dmgIcon(ev.s ?? 'basic'), skill, L(d.name), ev.dmg, ev.ty ? `dt-${ev.ty}` : ''), a.side);
                addDmg(state, a, d, ev.s ?? 'basic', ev.dmg, ev.ty);
                renderDmg(state, root);
            }
            break;
        }
        case 'reflect': {
            // 반사 — 비직격. 공격자 HP 만 줄고 아무것도 유발하지 않는다 (battle_design §9-6)
            const a = U(ev.a), d = U(ev.d);
            if (d) { d.hp = ev.ahp; popup(state, d, `-${ev.dmg}`, 'dmg-in'); refreshUnit(state, d); }
            if (a && d) {
                pushLog(state, root, logRow(L(a.name), dmgIcon('reflect'), t('bt.reflectLabel'), L(d.name), ev.dmg), a.side);   // 반사의 주체는 되받아 친 쪽 · 그림 없음 · 칠하지 않는다(종류가 없다)
                addDmg(state, a, d, 'reflect', ev.dmg);
                renderDmg(state, root);
            }
            break;
        }
        case 'blast': {
            // 자폭 — 비직격 **고정 피해** (battle_design §9-6 · skill_design §12-9 · 2026-09-21). 배리어를 안 보고 HP 만 줄이며 아무것도 유발하지 않는다.
            //   적 전원이 대상이라 한 번 터질 때 이벤트가 대상 수만큼 잇따른다 — 광역 스킬의 `hit` 과 같은 모양이다
            const a = U(ev.a), d = U(ev.d);
            if (d) { d.hp = ev.dhp; popup(state, d, `-${ev.dmg}`, 'dmg-in'); refreshUnit(state, d); }
            if (a && d) {
                pushLog(state, root, logRow(L(a.name), ev.s ? dmgIcon(ev.s) : '', strikeLabel(ev.s), L(d.name), ev.dmg), a.side);   // 주체는 터진 쪽 (반사와 같은 자리)
                addDmg(state, a, d, ev.s, ev.dmg);
                renderDmg(state, root);
            }
            break;
        }
        case 'counter': {   // 반격 (2026-09-18 · ADR-0158) — 맞은 쪽(u)이 때린 쪽(d)에게 되받아 친다. 뒤에 그 타격 이벤트(기본 공격)가 잇는다
            const u = U(ev.u), d = U(ev.d);
            if (u) popup(state, u, t('pop.counter'), 'counter');
            // 주체는 반격한 쪽 (반사와 같은 자리) · 반격은 기본 공격이라 무기 칸 실루엣 · 값 칸은 「반격」
            if (u && d) pushLog(state, root, logRow(L(u.name), dmgIcon('basic'), t('bt.basicAttack'), L(d.name), t('log.v.counter')), u.side);
            break;
        }
        case 'dodge': {
            const a = U(ev.a), d = U(ev.d);
            const skill = strikeLabel(ev.s);
            if (a) markActed(a, ev.t);
            if (d) popup(state, d, t('pop.dodge'), 'miss');
            if (a && d) pushLog(state, root, logRow(L(a.name), dmgIcon(ev.s ?? 'basic'), skill, L(d.name), t('log.v.miss')), a.side);
            break;
        }
        case 'stagger': {   // 물리 경직 (R110) — 끝 시각까지 창 뱃지 줄에 칩 하나 · 그동안 행동 게이지가 선다. 로그 · 팝업은 없다 (SCREEN_DESIGN §4-2 · ADR-0154)
            const u = U(ev.u);
            if (!u) break;
            // 경직 중에 또 걸리면 **끝만 새로** — 시뮬이 행동 예약을 미는 방식과 같다 (INTERFACE §2-6 「경직」)
            u.stalls = u.stalls ?? [];
            const w = u.stalls[u.stalls.length - 1];
            if (w && ev.t < w.to) w.to = ev.until;
            else u.stalls.push({ from: ev.t, to: ev.until });
            refreshUnit(state, u);
            break;
        }
        case 'down': {
            const u = U(ev.u);
            if (!u) break;
            u.hp = 0;
            refreshUnit(state, u);
            const enemy = u.side === 'enemy';
            // 쓰러짐에는 친 쪽이 없다 — 적이 쓰러진 것은 우리 타격의 결과, 파티가 쓰러진 것은 적 타격의 결과로 거른다 (ADR-0131)
            pushLog(state, root, logRow(L(u.name), '', '', '', t(enemy ? 'log.v.slain' : 'log.v.downed')), enemy ? 'party' : 'enemy');
            popup(state, u, t(enemy ? 'pop.slain' : 'pop.downed'), 'dead-tag');
            break;
        }
        case 'heal': {   // 회복 — 시전자(a)가 대상(d)의 HP 를 올린다. 부호가 반대일 뿐 타격과 같은 자리에 뜬다
            const a = U(ev.a), d = U(ev.d);
            if (d) { d.hp = ev.dhp; popup(state, d, `+${ev.amt}`, 'heal'); refreshUnit(state, d); }
            if (a && d) pushLog(state, root, logRow(L(a.name), dmgIcon(ev.s ?? 'basic'), strikeLabel(ev.s), L(d.name), `+${ev.amt}`, 'heal-t'), a.side);
            break;
        }
        case 'potion': {   // 물약 — 앞의 찬 칸(`i`)이 비고 그 영웅 HP 가 오른다 (R104 · ADR-0148).
            //   **자동이라 앞에 `skill` 이벤트가 없다** — 회복과 같은 자리 · 같은 색으로 팝업을 띄우고 로그 한 줄을 남긴다
            const u = U(ev.u);
            if (u) { u.hp = ev.dhp; popup(state, u, `+${ev.amt}`, 'heal'); refreshUnit(state, u); }
            const slot = state.potion.slots[ev.i];
            if (slot) slot.full = false;
            paintPotion(state, root, ev.i);
            // 대상 칸은 빈다 · 남은 칸 수는 안 적는다 — 아레나의 물약 칸이 든다 (ADR-0189)
            if (u) pushLog(state, root, logRow(L(u.name), potionIcon(slot?.id), slot ? L(potionInfo(slot.id)?.name ?? '') : '', '', `+${ev.amt}`, 'heal-t'), u.side);
            break;
        }
        case 'regen': {   // HP 재생 — 조용히 오른다(팝업 없음). 정수 1 이상 쌓인 틱에만 온다
            const u = U(ev.u);
            if (u) { u.hp = ev.dhp; refreshUnit(state, u); }
            break;
        }
        case 'buff': {   // 창 적용 · 갱신. 배리어면 총량(amt)도, 최대 HP 를 민 창이면 새 최대치(hpMax·dhp)도 온다
            const u = U(ev.u);
            if (!u) break;
            u.buffs?.set(ev.s, { until: ev.until, stat: ev.stat, v: ev.v });
            // 최대 HP 를 민 창 — 시뮬이 민 값을 그대로 받는다. 재생기는 계산하지 않는다 (INTERFACE §6 · 부채 #50)
            if (ev.hpMax !== undefined) { u.hpMax = ev.hpMax; u.hp = ev.dhp; }
            refreshUnit(state, u);
            // 팝업은 띄우지 않는다 — 시전은 `skill` 이벤트가 이미 알렸고, 파티 창이면 대상마다 같은 이름이 세 번 뜬다.
            // 「지금 걸려 있다」는 상태라 카드 테두리가 든다 (SCREEN_DESIGN §4-2)
            // 오오라(`until: null`)는 로그에 안 적는다 — 전투 시작 · 적의 라운드마다 받는 유닛 수만큼 같은 줄이 쌓인다. 뱃지가 든다 (R98 · ADR-0127)
            // 배리어인지는 `stat` 으로 가른다 [2026-09-21 · 부채 #50 곁가지] — `amt` 는 최대 HP 창(`hp_max_pct`)도 실어서
            //   `amt != null` 로 가르면 배틀오더스가 「방벽 21」로 찍혔다
            if (ev.until !== null) pushLog(state, root, logRow(L(u.name), ev.s ? dmgIcon(ev.s) : '', strikeLabel(ev.s), '',
                ev.stat === 'barrier_pct' ? t('log.v.barrier', { amt: ev.amt }) : t('log.v.up')), u.side);
            break;
        }
        case 'buffEnd': {
            const u = U(ev.u);
            if (!u) break;
            const aura = u.buffs?.get(ev.s)?.until === null;   // 오오라 창이 닫힐 때도 로그를 안 쓴다 (R98)
            u.buffs?.delete(ev.s);
            // 최대 HP 를 밀던 창이 닫혔다 — 줄어든 최대치와 **잘린** 현재 HP 를 그대로 받는다 (INTERFACE §6 · 부채 #50)
            if (ev.hpMax !== undefined) { u.hpMax = ev.hpMax; u.hp = ev.dhp; }
            refreshUnit(state, u);
            if (!aura) pushLog(state, root, logRow(L(u.name), ev.s ? dmgIcon(ev.s) : '', strikeLabel(ev.s), '', t('log.v.ended')), u.side);
            break;
        }
        // ~~`card`(도감 카드 팝업 · 로그)~~ 는 2026-09-14 삭제 — 카드는 라운드를 이기면 조용히 들어온다 (R89 · 사용자 지시)
        case 'refit': {   // 갈아입었다 — 라운드 경계 또는 **라운드 도중**(원정 중 교체 · R89 · R130) — 최대 HP · 스킬 칸 · 표시값을 새로 받는다. 남은 스킬은 쿨 표시를 잇는다
            const u = U(ev.u);
            if (!u) break;
            const had = u.skills ?? [];
            Object.assign(u, { hp: ev.dhp, hpMax: ev.hpMax, period: ev.period, atkMin: ev.atkMin, atkMax: ev.atkMax, matkMin: ev.matkMin, matkMax: ev.matkMax, atkType: ev.atkType, stats: ev.stats ?? null });
            // 오오라 칸(준비 `0` · `null`)은 갈아입기로 켜짐 · 꺼짐이 바뀔 수 있어 옛 칸을 잇지 않고 새로 받는다 (R98).
            //   잇는 것은 **같은 자리의 같은 스킬**뿐이다 — 같은 스킬이 고유 · 무기 두 칸에 앉아도 칸마다 제 쿨 표시를 지킨다 (R130 · 시뮬의 칸마다 쿨과 같은 규칙)
            u.skills = (ev.actives ?? []).map((id, i) => {
                const r = ev.ready?.[i];
                const old = had[i]?.id === id ? had[i] : null;
                return (r !== 0 && r !== null && old) || { ...skillInfo(id), readyAt: slotReady(r, ev.t), firedAt: ev.t };
            });
            renderUnits(state, root);
            break;
        }
        case 'end': {
            state.ended = true;
            clearInterval(state.timer);
            pushLog(state, root, wideRow(t(ev.won ? 'log.end.win' : 'log.end.lose')));
            showResult(state, root, opts, ev.won);
            // 재생이 끝에 닿았다고 앱에 알린다 — 상단 세그먼트의 관전 칸이 「전투 종료」로 바뀐다 (ADR-0147).
            //   되감아 선 끝(재개 mount)은 알리지 않는다 — 앱은 넘긴 재생 위치로 이미 안다
            if (!state.catchUp) opts.onOver?.();
            break;
        }
    }
}

/** 재생이 끝나면 아레나 위에 결과 띠 — 반복이 켜져 있으면 잠깐 세고 다음 원정으로 · 반복 없이 이기면 [다음 스테이지](ADR-0141) · [다시 도전]은 이기든 지든 선다 (ADR-0138 · ADR-0212) */
function showResult(state, root, opts, won) {
    const box = root.querySelector('.battle-result');
    const auto = won && opts.repeat === true;
    // 반복이 세는 띠에는 둘 다 안 단다 — 세는 동안 누를 버튼이 늘고, 세기가 끝나면 같은 곳으로 저절로 나간다 (ADR-0141 · ADR-0212)
    const retry = !auto && typeof opts.onRetry === 'function';
    const next = won && !auto && typeof opts.onNext === 'function';
    box.innerHTML = `
        <span class="${won ? 'up' : 'down'} verdict">${t(won ? 'bt.won' : 'bt.lost')}</span>
        ${auto ? `<span class="muted b-next"></span>` : ''}
        <button class="btn primary sm b-report">${t('bt.toReport')}</button>
        ${next ? `<button class="btn sm b-stage-next">${t('bt.nextStage')}</button>` : ''}
        ${retry ? `<button class="btn sm b-retry">${t('bt.retry')}</button>` : ''}`;
    box.classList.add('show');
    box.querySelector('.b-report').onclick = () => opts.onEnd(false);
    // 같은 스테이지로 곧바로 다시 보낸다 — 출발은 앱이 한다(재생기는 계산하지 않는다)
    if (retry) box.querySelector('.b-retry').onclick = () => opts.onRetry();
    // 다음 스테이지로 곧바로 보낸다 — 어디가 다음인지도 출발도 앱이 정한다
    if (next) box.querySelector('.b-stage-next').onclick = () => opts.onNext();
    if (auto) {
        state.auto = true;       // 세는 중 — 여기서 걷히면(탭 이동 · 숨김) 앱 시계가 이어서 세운다 (ADR-0102)
        // 세는 초 = 다음 런이 나가는 시각까지 남은 초 — 그 시각(끝난 순간 + [balance.csv:repeat_restart_sec])은 앱이 준다(`game.nextRepeat` · ADR-0300).
        //   끝난 뒤에 관전을 다시 열었으면 이미 흐른 만큼 덜 센다 — 출발 시각은 세기가 아니라 그 답이 정한다
        const restartAt = opts.restartAt?.() ?? opts.now() + D.balance.repeat_restart_sec * 1000;
        let left = Math.max(0, Math.ceil((restartAt - opts.now()) / 1000)), beat = opts.now();
        const tick = () => {
            // 멈췄다 깨어났으면 다음 런을 세우지 않는다 — 꺼져 있던 것이다. 마무리는 앱 시계가 한다 (ADR-0102)
            const at = opts.now();
            if (at - beat > opts.frozenMs) return;
            beat = at;
            box.querySelector('.b-next').textContent = t('bt.nextRun', { s: left });
            if (left <= 0) { opts.onEnd(true); return; }
            left -= 1;
            state.timeouts.push(setTimeout(tick, 1000));
        };
        tick();
    }
}
