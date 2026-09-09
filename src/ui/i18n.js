/**
 * i18n — 한/영 문자열 사전 + 언어 상태.
 *
 * 관리 규칙 (중요):
 *   1. **한 키에 ko/en 이 나란히 붙는다** — 두 언어가 따로 놀며 한쪽만 고치는 사고를 구조로 막는다.
 *      키를 추가할 때 반드시 두 언어를 같이 쓴다. en 누락 시 ko 로 폴백되므로 화면이 깨지진 않는다.
 *   2. **UI 문구는 여기, 데이터 문자열은 mock.js 의 {ko, en} 쌍** — 렌더러(app/battle)에는
 *      한국어 리터럴이 남지 않는다 (주석 제외). 이것이 검증 기준이다.
 *   3. 값 안의 `{x}` 는 t(key, {x: ...}) 로 치환된다. 어순이 언어마다 달라도 템플릿이 흡수한다.
 *
 * CSV 쪽 규약(예고): 데이터 CSV 는 `_kr` / `_en` 컬럼 쌍 (현재 `_kr` 만 존재 — monster.csv 등).
 * `_en` 컬럼이 붙고 로더가 생기면 mock.js 의 {ko, en} 쌍이 그대로 CSV 로 이사한다.
 *
 * 언어 전환: 우측 상단 토글 / URL `?lang=en` / localStorage 유지.
 * (localStorage 는 UI 환경설정이라 세이브 어댑터 규칙과 무관 — 접근은 이 파일 안에서만 한다)
 */

const STORE_KEY = 'thesevensim.lang';
export const LANGS = ['ko', 'en'];

let current = (() => {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    try {
        const saved = localStorage.getItem(STORE_KEY);
        if (LANGS.includes(saved)) return saved;
    } catch { /* 프라이빗 모드 등 — 기본값으로 */ }
    return 'ko';
})();

export const lang = () => current;

export function setLang(l) {
    if (!LANGS.includes(l)) return;
    current = l;
    try { localStorage.setItem(STORE_KEY, l); } catch { /* 저장 실패는 무해 */ }
    applyDocumentLang();
}

/** <html lang> + <title> 동기화 — 모듈 로드 시 1회, 전환 시마다 호출 */
export function applyDocumentLang() {
    document.documentElement.lang = current;
    document.title = t('app.title');
}

/**
 * 데이터 문자열 선택 — mock.js 의 {ko, en} 쌍을 현재 언어로 푼다.
 * 평문 문자열이 오면 그대로 돌려준다 (양 언어 공통 표기: 고유명사·숫자 등).
 */
export const L = v =>
    v == null ? '' : (typeof v === 'string' ? v : (v[current] ?? v.ko ?? ''));

/** UI 문구 조회 — 미등록 키는 키 그대로 노출된다 (누락이 화면에서 바로 보이게) */
/** 그 키가 사전에 있는가 — 어휘가 CSV 에서 오는 자리(버프 `effect_stat`)가 문장을 만들지 말지 고를 때 쓴다 */
export const has = key => Object.prototype.hasOwnProperty.call(STRINGS, key);

export function t(key, params) {
    const e = STRINGS[key];
    let s = e ? (e[current] ?? e.ko) : key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
    return s;
}

/* ═══════════════════ 사전 ═══════════════════ */

const STRINGS = {
    /* ── 셸 ── */
    'app.title': { ko: 'The Seven Simulation RPG — 화면 목업', en: 'The Seven Simulation RPG — Screen Mockup' },
    /* ── 새 게임 (2026-08-24) ── */
    'ng.h': { ko: '새 게임', en: 'New Game' },
    'ng.title': { ko: '첫 파티', en: 'Your First Party' },
    'ng.sub': {
        ko: '이 {n}명이 그대로 시작 로스터가 된다 — 마음에 들 때까지 다시 굴려도 된다',
        en: 'These {n} become your starting roster — reroll as many times as you like',
    },
    'ng.roll': { ko: '{n}번째 굴림', en: 'Roll {n}' },
    'ng.reroll': { ko: '다시 굴리기', en: 'Reroll' },
    'ng.start': { ko: '이 셋으로 시작', en: 'Start with these' },
    /* ⚠ 부르는 곳 0 (2026-09-01) — 후보 카드에서 시작 특성 줄을 걷었다 (SCREEN_DESIGN §3).
       값(`hero.trait`)은 살아 있고 화면에만 없다. 다시 보이게 할 자리는 영웅 툴팁(§5)이 1순위라 키는 남긴다 */
    'ng.trait': { ko: '시작 특성', en: 'Starting Trait' },
    'ng.total': { ko: '능력치 합', en: 'Attribute Total' },
    'ng.note': {
        ko: '첫 파티는 <b>레어 1 + 매직 2</b>다 — 첫 화면부터 로스터에 <b>층</b>이 보인다. 유니크 15명은 고정 명단이라 시작에 소모하지 않는다<br>'
            + '기본 능력치는 축마다 따로 굴리되 <b>합은 등급이 정하는 대역</b> 안이다 ([hero_tier.csv:attr_total_min/max] — 매직과 레어의 대역은 <b>겹치지 않는다</b>) — '
            + '세 장의 차이는 양과 <b>모양</b> 둘이다: 레어는 고르게 나고, 매직은 <b>한 축이 크게 튄다</b>. 장비로는 1도 오르지 않으니 여기서 나온 값은 <b>평생 간다</b><br>'
            + '<b>등급은 출발선이지 천장이 아니다</b> — 상한은 [balance.csv:hero_attr_max] 하나로 전 영웅 공통이라 <b>키우면 매직도 같은 곳에 도달한다</b><br>'
            + '최대 HP는 굴리지 않는다 — 전 영웅 [balance.csv:hero_hp_base] 공통 시작<br>'
            + '메인 죄종은 죄종 마스터리(탭1)와 파견 적성을 정한다 — 장비 궁합(세트포인트)은 <b>폐기</b> — 전술카드로 이관 (tactic_card_design.md §4)<br>'
            + '리롤은 <b>무제한·무료</b>다 — 시작 선택을 도박으로 만들지 않는다<br>'
            + '<b>미확정</b>: 등급 대역·분포 모양·등장 비중(전부 제안값) · 특성 효과(이름표만 굴린다) · 직업이 주력 축을 밀어주는 세기 · 죄종·직업 중복 허용 여부',
        en: 'Your first party is <b>1 Rare + 2 Magic</b> — the roster shows its <b>tiers</b> from the first screen. The 15 Uniques are a fixed roster and are not spent at the start<br>'
            + 'Attributes roll per axis but their <b>total lands in the band its tier sets</b> ([hero_tier.csv:attr_total_min/max] — the Magic and Rare bands <b>never overlap</b>) — '
            + 'the three differ in amount and in <b>shape</b>: Rare rolls evenly, Magic can <b>spike on one axis</b>. Gear never raises them, so what you roll here <b>lasts forever</b><br>'
            + '<b>A tier is a starting line, not a ceiling</b> — the cap is a single [balance.csv:hero_attr_max] shared by every hero, so <b>a Magic hero you raise gets to the same place</b><br>'
            + 'Max HP is not rolled — every hero starts at [balance.csv:hero_hp_base]<br>'
            + 'The main sin decides the sin mastery (tab 1) and dispatch aptitude — gear affinity (set points) is <b>dropped</b> — moved to tactic cards (tactic_card_design.md §4)<br>'
            + 'Rerolling is <b>unlimited and free</b> — the opening choice is not a gamble<br>'
            + '<b>Open</b>: the tier bands, spread shapes and appearance weights (all proposed values) · trait effects (only names are rolled) · how strongly class should bias its key attribute · whether duplicate sins/classes are allowed',
    },

    /* ── 새 게임 · 세이브 (2026-08-25) ── */
    'ng.continue': { ko: '이어하기', en: 'Continue' },
    'ng.hasSave': { ko: '저장된 게임이 있다 — {t}', en: 'A saved game exists — {t}' },
    'ng.saveLine': { ko: '영웅 {h}명 · 클리어 {c} · 골드 {g}', en: '{h} heroes · {c} cleared · {g} gold' },
    'ng.oldSave': {
        ko: '이전 형식(v{v})의 세이브다 — 무기군·슬롯·도감이 바뀌어 이어할 수 없다. 새 게임으로 시작한다',
        en: 'This save is an older format (v{v}) — weapon groups, slots and the codex changed, so it cannot continue. Start a new game',
    },
    'ng.overwrite': { ko: '세이브를 지우고 이 셋으로 시작', en: 'Delete save & start with these' },
    'ng.overwriteConfirm': { ko: '정말? 한 번 더 누르면 지운다', en: 'Really? Click again to delete' },
    'ng.startWeapon': { ko: '직업 전속 무기군의 무기 1개를 쥐고 시작한다', en: 'Starts with one weapon from a class-exclusive weapon group' },

    /* ── 프롤로그 (2026-09-03 · SCREEN_DESIGN §3-1) ──
       본문·씬 제목은 **한국어만** 넣는다 (사용자 지시 2026-09-03) — `en` 이 없으면 t() 가 ko 로 폴백하므로
       영어에서도 한국어 본문이 나온다. 「ko/en 나란히」의 의도된 예외이고 번역은 나중에 채운다 (DEV_PLAN 부채 #30).
       조작 문구(다음 · 건너뛰기 · 시작한다 · 진행)는 ko/en 둘 다 있다.
       원문은 docs/game_design/story/prologue.md — 화면이 문장을 새로 쓰지 않는다.
       줄바꿈은 이스케이프로 들어가고, 펴는 것은 CSS(.pro-body { white-space: pre-line }) 다. */
    'pro.h': { ko: '프롤로그', en: 'Prologue' },
    'pro.step': { ko: '{n} / {m}', en: '{n} / {m}' },
    'pro.next': { ko: '다음', en: 'Next' },
    'pro.skip': { ko: '건너뛰기', en: 'Skip' },
    'pro.begin': { ko: '시작한다', en: 'Begin' },

    'pro.s1.h': { ko: '왕좌' },
    'pro.s1.b': {
        ko: '지옥에는 왕이 있었다.\n\n'
            + '바알. 대악마.\n'
            + '이 땅의 모든 것은 그의 것이었고,\n'
            + '7개의 감정을 나누어 부하에게 깃들게 했다.\n\n'
            + '분노, 시기, 탐욕, 나태, 폭식, 색욕, 오만.\n\n'
            + '그것은 지옥을 유지하는 균형이었다.',
    },

    'pro.s2.h': { ko: '배신의 밤' },
    'pro.s2.b': {
        ko: '그 밤, 7개의 칼이 등에 꽂혔다.\n\n'
            + '뒤를 돌아봤다.\n'
            + '전부 아는 얼굴이었다.\n\n'
            + '싸웠다.\n'
            + '하지만 힘의 반이 이미 빠져나간 뒤였다.\n'
            + '묶여있던 것이 풀려있었다. 누군가가 열쇠를 넘겼다.\n\n'
            + '밀려난다. 발밑이 무너진다.',
    },

    'pro.s3.h': { ko: '추락' },
    'pro.s3.b': {
        ko: '떨어졌다.\n\n'
            + '지옥의 빛이 멀어진다.\n'
            + '힘이 빠져나간다.\n'
            + '왕좌가, 부하들의 얼굴이, 그 밤의 순서가 — 흐려진다.\n\n'
            + '누가 칼을 들었는지.\n'
            + '누가 먼저 등을 돌렸는지.\n'
            + '7개였는지, 아니었는지.\n\n'
            + '확실한 건 하나.\n\n'
            + '배신당했다.\n\n'
            + '그리고 — 몸에 무언가가 새겨지는 감각.\n'
            + '뜨겁다. 살이 타는 것 같다.\n'
            + '낙인이다. 이 추락이 남긴 저주.',
    },

    'pro.s4.h': { ko: '마을' },
    'pro.s4.b': {
        ko: '눈을 떴을 때, 누군가가 물을 먹이고 있었다.\n'
            + '늙은 인간이다.\n\n'
            + '몸이 무겁다. 배가 고프다. 숨이 가쁘다.\n'
            + '전부 처음이다. 전부 불쾌하다.\n\n'
            + '며칠이 지났다.\n'
            + '인간들이 음식을 나눠줬다. 자기들도 부족하면서.\n'
            + '다친 곳을 감싸줬다. 이름도 모르는 자에게.\n\n'
            + '이해할 수 없다.\n'
            + '왜 이것들은 나를 살리려 하는가.\n\n'
            + '지옥에서는 쓰러진 자를 밟고 지나간다.\n'
            + '약한 것은 버려진다. 그것이 당연하다.\n\n'
            + '이것들은 당연한 것을 하지 않는다.\n\n'
            + '이름은 기억한다. 바알.\n'
            + '왕이었다는 것도. 빼앗겼다는 것도.\n'
            + '하지만 그 밤이 선명하지 않다.\n'
            + '7개의 칼. 아는 얼굴들. 무너지는 발밑.\n'
            + '그 사이의 것들이 — 뒤섞여 있다.',
    },

    'pro.s5.h': { ko: '불길' },
    'pro.s5.b': {
        ko: '그 날 밤, 지평선이 붉어졌다.\n\n'
            + '불길. 군세. 분노의 기운.\n'
            + '이 기운을 안다. 잊을 수 없다.\n\n'
            + '사탄.\n'
            + '바알이 지옥에서 추방한 놈.\n'
            + '왕이 바닥에 있다는 걸 감지한 것이다.\n\n'
            + '마을이 불탄다. 인간들이 비명을 지른다.\n\n'
            + '바알은 일어섰다.\n'
            + '마을을 지키려는 게 아니다.\n'
            + '저놈이 자기를 죽이러 왔으니까 싸우는 것이다.\n\n'
            + '적어도, 그렇게 생각했다.',
    },
    /* 마지막 씬에만 선다 — 본문과 층이 다른 두 줄 (SCREEN_DESIGN §3-1) */
    'pro.s5.q': { ko: '"꺼져라. 여긴 네 전장이 아니다."' },
    'pro.end': { ko: 'Chapter 1. 분노 / 불타는 전장' },

    /* ── 원정 (실동작) ── */
    'exp.partyFull': { ko: '파티가 찼다', en: 'Party full' },
    'exp.searching': { ko: '수색 나가 있다 — 돌아와야 편성한다', en: 'Out on a search — needs to return first' },
    'exp.noParty': { ko: '파티가 비어 있다 — 대기 영웅을 넣어라', en: 'Party is empty — add a hero from the bench' },
    'exp.locked': { ko: '이전 스테이지 클리어 필요', en: 'Clear the previous stage first' },
    'exp.stageMeta': { ko: '위험도 {lv} · 약 {m}분', en: 'Danger {lv} · ~{m} min' },
    /* 스테이지 원소 — 어느 저항을 챙겨야 하는지의 신호 (battle_design §9-8) */
    'exp.element': { ko: '원소 {e}', en: 'Element {e}' },
    'exp.repeat': { ko: '반복 원정', en: 'Auto-repeat' },
    'exp.repeat.sub': {
        ko: '승리하면 같은 곳으로 다시 나간다 · <b>게임이 켜져 있는 동안만</b> 돈다 · 쓰러진 영웅은 빠진 채로 이어진다 · 패배하면 멈추고 전원 회복한다',
        en: 'Re-runs the same stage after a win · <b>only while the game is open</b> · anyone who went down sits out the rest · a defeat ends it and everyone recovers',
    },
    'exp.notice.runClosed.h': { ko: '부재 중', en: 'While you were away' },
    'exp.notice.runClosed.body': {
        ko: '반복 원정은 게임이 켜져 있을 때만 돈다 — {stage} 런은 진행 중이던 전투까지 정산하고 마무리됐다. 결과는 마지막 리포트에 있다',
        en: 'Auto-repeat only runs while the game is open — the {stage} run settled up to the battle in progress and ended. The result is in the last report',
    },
    'exp.notice.report': { ko: '리포트 보기', en: 'View report' },
    'exp.notice.dismiss': { ko: '확인', en: 'OK' },

    /* ── 리포트 (실동작) ── */
    'rep.defeat': { ko: '패배', en: 'Defeat' },
    'rep.retreat': { ko: '철수', en: 'Retreat' },
    /* ~~'rep.healed'(귀환 — 전원 회복)~~ 은 2026-09-08 삭제 — 전투불능 상자가 **이름만** 적는다 (SCREEN_DESIGN §4-3) */
    'rep.reason.wipe': { ko: '전원 전투불능', en: 'Whole party downed' },
    'rep.reason.timeout': { ko: '제한시간 초과', en: 'Timed out' },

    'rep.roundsCleared': { ko: '{n} / {total}', en: '{n} / {total}' },
    'rep.discarded': { ko: '가방이 가득 차 {n}개를 버렸다', en: '{n} dropped — bag was full' },
    'rep.again': { ko: '같은 곳으로 다시', en: 'Run it again' },
    'rep.toIdle': { ko: '편성으로', en: 'Back to party' },
    'rep.cards': { ko: '도감 카드', en: 'Codex cards' },
    'rep.cardsNone': { ko: '없음', en: 'None' },
    'rep.cardLevelUp': { ko: '{name} 도감 Lv.{lv}', en: '{name} codex Lv.{lv}' },
    /* 빗나감 — 레벨 부족의 전용 신호 (battle_design §9-8). 파티 기준 {맞지 않은 타격}/{총 타격} */
    'rep.miss': { ko: '빗나감', en: 'Misses' },
    'rep.missN': { ko: '{m} / {n} ({p}%)', en: '{m} / {n} ({p}%)' },

    /* ── 캐릭터 (실동작) ── */
    'ch.equip.hint': { ko: '아이템 클릭 = 착용 · 착용 칸 클릭 = 해제', en: 'Click an item = equip · click a worn slot = unequip' },
    // 가방의 최상위 축 — 부위가 아니라 갈래다. 「전체」는 없다 (ADR-0055)
    'ch.bag.equip': { ko: '장비', en: 'Gear' },
    'ch.bag.material': { ko: '재료', en: 'Materials' },
    'ch.bag.count': { ko: '{n}개', en: '×{n}' },
    'ch.salvageMode': { ko: '분해 모드', en: 'Salvage mode' },
    'ch.salvageHint': { ko: '분해 모드: 클릭한 아이템을 가루로 만든다', en: 'Salvage mode: clicking an item turns it to dust' },
    'ch.err.class': { ko: '이 직업의 무기군이 아니다', en: "Not this class's weapon group" },
    'ch.err.bagFull': { ko: '가방이 가득 찼다', en: 'Bag is full' },
    'ch.err.missing': { ko: '아이템을 찾을 수 없다', en: 'Item not found' },
    'ch.salvaged': { ko: '분해 → 가루 +{n}', en: 'Salvaged → dust +{n}' },
    // 툴팁이 걷은 「{n}강에서 옵션 상승」이 앉는 자리다 (SCREEN_DESIGN §6 개정 2026-09-08 — 조건·규칙 주석은 도움말의 몫).
    // ⚠ 「강화 모드」는 09-03 에 폐기됐는데 문구만 남아 있었다 — 없는 토글을 찾게 만든다. 자리는 제련소(§8-2) · 간격은 CSV 가 든다
    'ch.upgradeHint': { ko: '강화는 제련소에서 한다 — 골드로 한 단계씩 올리고, {n}강마다 옵션 하나의 값이 오른다',
        en: 'Upgrading happens at the forge — one step at a time for gold, and every +{n} one option gains value' },
    'ch.err.maxUp': { ko: '더는 강화할 수 없다', en: 'Already fully upgraded' },
    /* 해고 (SCREEN_DESIGN §6 · 2026-09-09) — 창 하나가 세 상태를 든다: 막힘(장비) · 막힘(마지막) · 확인.
       규칙 설명이 아니라 **상태와 확인**이라 패널이 아닌 창에 선다 (ui 원칙 4) */
    'ch.dismiss': { ko: '해고', en: 'Dismiss' },
    /* 문구는 **사용자 지시 그대로**다 [개정 2026-09-09] — 옛 판(「장비를 모두 벗어야 해고할 수 있다 — 착용 {n}」)의
       착용 수 `{n}` 은 걷었다. 창은 「무엇을 해야 하나」만 말하고, 몇 개가 걸쳐 있는지는 창 뒤 페이퍼돌이 이미 보여 준다.
       ⚠ 이 두 줄만 **합니다체**다 — 지시 문구를 손대지 않는다. 나머지 문구의 평서체와 갈리는 것은 알고 둔 것이다 */
    'ch.dismiss.blocked': {
        ko: '영웅을 해고하려면 모든 장비를 해제해야 합니다.',
        en: 'All equipment must be unequipped before dismissing this hero.',
    },
    /* 오류 키는 결과 코드와 짝을 맞춘다(`<탭>.err.<코드>`) — 창이 미리 막으므로 플래시로는 잘 안 뜨지만,
       코드가 있으면 문구도 있어야 한다. `last` 는 창 본문도 이 키를 그대로 쓴다(같은 말을 두 키에 두지 않는다) */
    'ch.err.equipped': { ko: '장비를 모두 벗어야 한다', en: 'Unequip everything first' },
    'ch.err.searching': { ko: '수색 나간 영웅이다', en: 'That hero is out on a search' },
    'ch.err.last': { ko: '마지막 영웅은 해고할 수 없다', en: "Can't dismiss your last hero" },
    /* 확인 문구도 **사용자 지시 그대로** [개정 2026-09-09] — 옛 판(「{name} — 해고하면 되돌릴 수 없다」)의 `{name}` 은 걷었다.
       누구를 해고하는지는 창을 연 카드가 이미 말하고, 되돌릴 수 없다는 것은 **[취소] 버튼이 눈에 보이는 것**이 든다 */
    'ch.dismiss.confirm': { ko: '영웅을 해고합니다.', en: 'This hero will be dismissed.' },
    'ch.dismissed': { ko: '{name} 해고', en: '{name} dismissed' },
    'ch.err.gold': { ko: '골드가 모자란다', en: 'Not enough gold' },
    'ch.upgraded': { ko: '강화 +{n} · {g}G', en: 'Upgraded to +{n} · {g}G' },
    'ch.upgraded.affix': { ko: '강화 +{n} · {g}G · {a} {from} → {to}', en: 'Upgraded to +{n} · {g}G · {a} {from} → {to}' },
    'ch.weaponGroup': { ko: '{group} · {cls} 전용', en: '{group} · {cls} only' },
    'ch.noTrees': { ko: '마스터리는 실동작 · 전직 층은 미구현이다', en: 'Mastery is live; the advancement layer is not built yet' },

    /* ── 선술집 (실동작) ── */
    'tv.hire': { ko: '고용 ({g} 골드)', en: 'Hire ({g} gold)' },
    'tv.reroll': { ko: '즉시 교체 ({g} 골드 · 무료까지 {t})', en: 'Refresh now ({g} gold · free in {t})' },
    'tv.reroll.free': { ko: '후보 교체 (무료)', en: 'New candidates (free)' },
    'tv.empty': { ko: '고용함 — 다음 교체에 채워진다', en: 'Hired — refills on next refresh' },
    'tv.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'tv.err.roster': { ko: '로스터가 가득 찼다 ({cap})', en: 'Roster full ({cap})' },
    'tv.hired': { ko: '{name} 고용', en: 'Hired {name}' },
    /* 수색 칸 [신설 2026-09-01 · **실동작 2026-09-09** — SCREEN_DESIGN §8-1 · ADR-0062].
       ⚠ 진행 중 이야기 문장은 여기 없다 — `search_story.csv` 가 든다(막 수·죄종 필터가 굴림의 입력이라
       표시 문구가 아니라 게임 데이터다). 화면은 `searchState().beats[].text` 를 `L()` 로 풀 뿐이다 */
    'tv.search.h': { ko: '수색', en: 'Search' },
    'tv.search.go': { ko: '수색 보내기', en: 'Send search' },
    'tv.search.spec': { ko: '{n}명 · {h}시간', en: '{n} hero · {h}h' },
    'tv.search.pick': { ko: '보낼 영웅', en: 'Who goes' },
    'tv.search.noHero': { ko: '대기 중인 영웅이 없다 — 원정 파티는 못 보낸다', en: 'Nobody on the bench — party members stay home' },
    'tv.search.out': { ko: '수색 중 · {name}', en: 'Searching · {name}' },
    'tv.search.left': { ko: '남은 시간 {t}', en: '{t} left' },
    'tv.search.odds': { ko: '레어 {r}% · 같은 죄종 {e}%', en: 'Rare {r}% · same sin {e}%' },
    'tv.search.done': { ko: '수색 완료', en: 'Search complete' },
    'tv.search.cancel': { ko: '취소', en: 'Cancel' },
    'tv.search.drop': { ko: '돌려보내기', en: 'Send away' },
    'tv.search.sent': { ko: '{name} 수색 출발', en: '{name} sets out' },
    'tv.search.canceled': { ko: '수색을 취소했다', en: 'Search called off' },
    'tv.search.dropped': { ko: '{name} 을(를) 돌려보냈다', en: 'Sent {name} away' },
    'tv.err.busy': { ko: '이미 수색 중이다', en: 'A search is already out' },
    'tv.err.party': { ko: '원정 파티는 보낼 수 없다', en: "Party members can't be sent" },
    'tv.err.missing': { ko: '영웅을 찾을 수 없다', en: 'Hero not found' },
    'tv.err.none': { ko: '나간 수색이 없다', en: 'No search is out' },
    'tv.err.notDone': { ko: '아직 안 돌아왔다', en: 'Not back yet' },
    /* 만남 [신설 2026-09-09 · ADR-0068] — 소문 · 질문 · 답 문장은 전부 `search_meeting.csv`·`search_answer.csv` 다.
       여기 있는 것은 **그 문장을 감싸는 라벨**뿐이다 (문구가 굴림의 입력이라 사전이 아니라 게임 데이터다) */
    'tv.search.rumor': { ko: '소문', en: 'Word going around' },
    'tv.search.met': { ko: '만났다', en: 'You meet someone' },
    'tv.search.key': { ko: '{sin} 전용 — 보내서 열렸다', en: '{sin} only — opened by who you sent' },
    'tv.search.picked': { ko: '이렇게 답했다', en: 'You answered' },
    'tv.search.cut': { ko: '고용비 {n}% 깎았다', en: 'Hire cost cut {n}%' },
    'tv.search.cutAll': { ko: '고용비를 안 받는다', en: 'They ask for nothing' },
    'tv.search.cutNone': { ko: '값은 그대로다', en: 'Full price' },
    'tv.err.answered': { ko: '이미 답했다', en: 'Already answered' },
    'tv.err.notOpen': { ko: '아직 만나지 않았다', en: 'You have not met them yet' },
    /* ── 시간 표기 ── */
    'time.hm': { ko: '{h}시간 {m}분', en: '{h}h {m}m' },
    'time.m': { ko: '{m}분', en: '{m}m' },
    'time.s': { ko: '{s}초', en: '{s}s' },
    'time.ms': { ko: '{m}분 {s}초', en: '{m}m {s}s' },
    /* ~~'injury.out'(출정 아웃)~~ 은 2026-09-08 삭제 — 「출정 아웃」 폐기(GAME_DESIGN §9 09-08 · SCREEN_DESIGN §4-3).
       아웃이 런을 넘지 않으므로 화면이 그릴 수 있는 시점에 아웃된 영웅이 없다 */

    /* ── 전투 재생 ── */
    'bt.won': { ko: '승리', en: 'Victory' },
    'bt.lost': { ko: '패배', en: 'Defeat' },
    'bt.toReport': { ko: '리포트 보기', en: 'View report' },
    'bt.nextRun': { ko: '다음 원정 {s}초 후', en: 'Next run in {s}s' },
    'log.end.win': { ko: '스테이지 클리어 — 리포트로 정리된다', en: 'Stage clear — see the report' },
    'log.end.lose': { ko: '원정 실패 — 귀환', en: 'Expedition failed — returning' },

    /* 탭 10 [개정 2026-09-08 사용자 지시] — 원정 · 캐릭터 · 강화 · 선술집 · 상점 · 자원 · 탐험 · 연구 · 도감 · 도움말 (SCREEN_DESIGN §1).
       09-08 에 **이미지 도감이 도감 안으로 들어가며** `nav.imagedex` 가 삭제됐다 — 탭이 아니라 도감의 **세그먼트 넷 중 셋**이다 (`cx.seg.*` · §9 · §9-1).
       그래서 이 목록의 탭 수만 11 → 10 으로 줄고 **움직인 탭은 없다** — 도움말이 한 칸 당겨졌을 뿐이다.
       [개정 2026-09-06 사용자 지시] 탭 11 — 도감 뒤에 이미지 도감이 서던 자리. 09-08 에 되물렸다.
       [개정 2026-09-04 사용자 지시] 탭 10 — 원정 · 캐릭터 · 강화 · 선술집 · 상점 · 자원 · 탐험 · 연구 · 도감 · 도움말.
       마을 탭이 **자원**(1인 배치 — 광산 · 채집)과 **탐험**(파티)으로 갈리면서 `nav.town` 은 삭제됐다.
       `nav.explore` 는 값이 그대로인 채 **파견처 칸 라벨에서 탭 라벨로 승격**됐다 (§8-4) — `nav.tavern` 과 같은 사례다.
       탭 이름이 **활동**(강화 · 상점)이고 패널 머리가 **장소**(`dp.post.forge` 제련소 · `dp.post.trade` 상단)인 것은 그대로 (§8-2 · §8-3).
       nav.commission 은 탭에서 빠졌지만 **지우지 않는다** — 선술집 탭 안 의뢰 게시판의 섹션 제목이다 (§8-1).
       nav.skill 도 탭이 아니라 **창 제목**이다 (§7). nav.base(거점)는 여전히 유일한 미사용 키다.
       아래 나열 순서는 탭 바 순서와 같다 — 읽는 사람이 화면과 대조할 수 있게. */
    'nav.expedition': { ko: '원정', en: 'Expedition' },
    'nav.character': { ko: '캐릭터', en: 'Character' },
    'nav.forge': { ko: '강화', en: 'Upgrade' },
    'nav.tavern': { ko: '선술집', en: 'Tavern' },
    'nav.shop': { ko: '상점', en: 'Shop' },
    'nav.resource': { ko: '자원', en: 'Resources' },
    'nav.explore': { ko: '탐험', en: 'Exploration' },
    'nav.research': { ko: '연구', en: 'Research' },
    'nav.codex': { ko: '도감', en: 'Codex' },
    'nav.help': { ko: '도움말', en: 'Help' },
    'nav.commission': { ko: '의뢰', en: 'Commissions' },
    'nav.skill': { ko: '스킬', en: 'Skills' },
    'nav.base': { ko: '거점', en: 'Base' },
    'res.gold': { ko: '골드', en: 'Gold' },
    'res.dust': { ko: '분해 가루', en: 'Dust' },
    'res.stigma': { ko: '낙인', en: 'Stigma' },
    'ui.langBtn': { ko: 'EN', en: '한국어' },   // 버튼에는 "다른 쪽" 언어를 적는다
    'ui.close': { ko: '닫기', en: 'Close' },        // 창 레이어 — 닫는 길 셋 중 눈에 보이는 하나 (SCREEN_DESIGN §2)
    /* 창 안에서 답하는 버튼 둘 (2026-09-09) — 어느 창이든 같은 말을 쓴다. 「확인」은 **읽었다/한다**,
       「취소」는 **안 한다**. 창을 그냥 닫는 길(X · 바깥 · Esc)은 그대로 있고, 이 둘은 그것을 **눈에 보이게** 한다 */
    'ui.ok': { ko: '확인', en: 'OK' },
    'ui.cancel': { ko: '취소', en: 'Cancel' },

    /* ── 자원 탭 [개정 2026-09-04] — 파견처는 **카드 3**: 채광 · 채집 · 벌목 (SCREEN_DESIGN §8) ──
       탐험은 자기 탭(§8-4)으로 나가 이 목록에 없다 — 셋 다 1인 배치라 `dp.party` 를 쓰는 칸이 없다.
       그래도 **`dp.party` 를 지우지 않는다**: 인원 표기 자체는 계속 찍히고(§8 — 값이 하나뿐이라고 지우면 「안 재고 있다」로 읽힌다),
       배치가 구현되면 탐험 탭이 같은 문구를 쓴다.
       `dp.post.forge`(제련소) · `dp.post.trade`(상단)는 파견처 칸에서 빠졌지만 **지우지 않는다** —
       강화 · 상점 탭의 패널 머리다(탭 이름은 활동, 패널 머리는 장소 — §8-2 · §8-3).
       담당 능력치는 문구가 아니라 `hero_attribute.csv:dispatch` 에서 온다 — 화면이 배정표를 따로 갖지 않는다.
       ⚠ **`dp.post.mine` 은 값만 「채광」(활동)으로 바뀌고 키는 옛 장소 id 그대로다** [2026-09-04 사용자 지시] —
       `hero_attribute.csv:dispatch` 가 `mine` 을 값으로 들고 있어 `postAttr('mine')` 이 그 열을 읽는다.
       키를 바꾸면 CSV 도 같이 바꿔야 하고, 그건 public 이름 변경이라 별도 승인 사항이다 (CLAUDE.md).
       ⚠ **`dp.post.log`(벌목)는 기획에 없는 신규 파견처다** — 화면이 기획을 앞서간 의도된 역방향이고 사용자 지시다 (§8) */
    'dp.post.trade': { ko: '상단', en: 'Trading House' },
    'dp.post.forge': { ko: '제련소', en: 'Smeltery' },
    'dp.post.mine': { ko: '채광', en: 'Mining' },
    'dp.post.gather': { ko: '채집', en: 'Gathering' },
    'dp.post.log': { ko: '벌목', en: 'Logging' },
    'dp.solo': { ko: '1인', en: 'Solo' },
    'dp.party': { ko: '파티', en: 'Party' },
    'dp.attrTitle': { ko: '담당 능력치', en: 'Governing attribute' },
    // 단계 트랙의 머리 — **라벨 + 개수**뿐이다. 개수는 `D.mineNodes.length` 에서 온다(코드에 7 을 박지 않는다).
    // 무엇으로 여는가(해금 조건)는 기획 백지라 문구도 만들지 않는다 (§8)
    'dp.tier': { ko: '단계 {n}', en: '{n} Tiers' },

    /* 상단 (SCREEN_DESIGN §8-3) — 제목은 `dp.post.trade` 재사용. ⚠ 수치는 전부 목업이라
       문구도 「무엇을 읽는 자리인가」만 말한다 (base_expedition_design §2-6) */
    'td.basic': { ko: '기본상단', en: 'Standing traders' },
    'td.special': { ko: '특수상단', en: 'Visiting trader' },
    'td.here': { ko: '와 있다 · 체류 {t}', en: 'Here · {t} left' },
    'td.away': { ko: '지금은 아무도 없다 · 다음 방문 {t}', en: 'Nobody here · next visit in {t}' },
    'td.buy': { ko: '사기', en: 'Buy' },
    'td.stock': { ko: '수량 {n}', en: '{n} in stock' },
    'td.noEquip': { ko: '장비는 팔지 않는다', en: 'No gear for sale here' },

    /* 의뢰 게시판 (SCREEN_DESIGN §14 · 자리는 선술집 탭 §8-1) — 제목은 `nav.commission` 재사용(옛 탭 라벨이 섹션 제목으로 내려왔다).
       ⚠ **종류 이름과 「어떻게 도는가」 줄은 여기 없다** — `commission_kind.csv` 의 `_kr`/`_en` 쌍이고
       화면은 `L()` 로 푼다. 목표·보상도 `commission.csv` 가 든다 (mock 과 CSV 가 겹치면 CSV 만 둔다).
       남는 것은 데이터가 아닌 **화면 라벨 둘**뿐이다 */
    'cm.fame': { ko: '명성', en: 'Fame' },
    'cm.accept': { ko: '수락', en: 'Accept' },

    /* 제련소 (SCREEN_DESIGN §8-2) — 제목은 `dp.post.forge` 를 그대로 쓴다(파견 목록의 칸 이름과 같은 자리다).
       `+`강화의 결과 문구는 캐릭터 탭이 쓰던 `ch.upgraded*` 를 재사용한다 — 같은 사건이라 문구를 새로 쓰지 않는다 */
    'fg.assign': { ko: '배치', en: 'Assigned' },
    'fg.none': { ko: '배치 없음', en: 'None' },
    'fg.quality': { ko: '품질', en: 'Quality' },
    'fg.reassign': { ko: '배치 변경', en: 'Reassign' },
    'fg.seg.craft': { ko: '제작', en: 'Craft' },
    'fg.seg.up': { ko: '강화', en: 'Upgrade' },
    'fg.plus.h': { ko: '+ 강화', en: 'Plus upgrade' },
    'fg.opt.h': { ko: '옵션강화', en: 'Option upgrade' },
    'fg.go': { ko: '강화', en: 'Upgrade' },
    // 옛 `tip.up.max` — 2026-09-08 에 툴팁의 강화 줄이 죽으면서 **제련소 전용**이 되어 접두를 옮겼다 (문구·인자 동일)
    'fg.upMax': { ko: '강화 +{up} · 상한', en: 'Upgrade +{up} · max' },
    'fg.optGo': { ko: '옵션강화', en: 'Upgrade option' },
    'fg.base': { ko: '베이스 능력치', en: 'Base stat' },
    'fg.worn': { ko: '착용 중', en: 'Equipped' },
    'fg.bag': { ko: '가방', en: 'Bag' },
    'fg.count': { ko: '장비 {n}', en: '{n} items' },
    'fg.empty': { ko: '가진 장비가 없다', en: 'You own no gear' },
    'fg.pick': { ko: '왼쪽에서 장비를 고른다', en: 'Pick an item on the left' },
    'fg.noAffix': { ko: '붙은 옵션이 없다', en: 'No options on this item' },

    /* ── 도움말 탭 (2026-08-26) ──
       설명 문구는 여기서 새로 쓰지 않는다 — 인게임에서 걷어낸 *.note / *.sub / *.hint 를 같은 키로 재사용한다.
       아래 넷은 그 재사용으로 못 덮는 자리만 채운다: 페이지 제목 · 섹션 제목 하나 · 인게임에서 숫자만 남기며 밀려난 원문 둘. */
    'todo.badge': { ko: '미착수', en: 'Not started' },
    'todo.lead': { ko: '기획은 확정됐고 화면이 아직 없다 — 지금 여기서 할 수 있는 일은 없다', en: 'The design is settled; the screen is not built yet — there is nothing to do here yet' },
    'ex.h': { ko: '탐험', en: 'Exploration' },
    'ex.todo': {
        ko: '탐험은 <b>미착수</b> — 1인 배치가 아니라 <b>파티를 꾸려 보내는</b> 활동이다. 원정의 문법(편성 → 출발 → 리포트)을 빌리되 <b>전투가 아니라서 오프라인</b> 쪽에 든다<br>'
            + '인원 · 산출 · 판정(민첩·건강·통솔)이 미정이다 (base_expedition_design §3-1)',
        en: 'Exploration is <b>not started</b> — you send <b>a whole party</b>, not one hero to a post. It borrows the expedition grammar (form up → depart → report) but is <b>not combat</b>, so it runs offline<br>'
            + 'Party size, yield and the checks (Agility · Vitality · Leadership) are undecided (base_expedition_design §3-1)',
    },
    'help.title': { ko: '도움말', en: 'Help' },
    'help.newgame': { ko: '새 게임', en: 'New Game' },
    'help.exp.party': { ko: '전투 {n}인 — 동시 원정 {m}팀', en: '{n} fighters — {m} expedition at a time' },
    'help.exp.bench': { ko: '파견 대기 · 로스터 {n} / {cap}', en: 'Awaiting dispatch · Roster {n} / {cap}' },

    /* ── 공통 ── */
    'face.noArt': { ko: '{name} — 원작 아트 없음', en: '{name} — no source art' },
    'class.unassigned': { ko: '역할 미배정', en: 'Role unassigned' },
    'kind.normal': { ko: '일반', en: 'Normal' },
    'kind.elite': { ko: '정예', en: 'Elite' },
    'kind.boss': { ko: '보스', en: 'Boss' },
    'kind.chapterBoss': { ko: '챕터보스', en: 'Chapter Boss' },

    /* ── 원정: 편성 · 지역 ── */
    'exp.seg.idle': { ko: '편성 · 지역', en: 'Party · Zones' },
    'exp.seg.battle': { ko: '전투 관전', en: 'Spectate' },
    'exp.seg.report': { ko: '리포트', en: 'Report' },
    'exp.oneParty': {
        ko: '전투 파티는 한 팀 — 원정이 곧 전투다. 세 상태가 한 탭 안에서 이어진다',
        en: 'One battle party — the expedition is the battle. Three states flow within one tab',
    },
    'exp.party.h': { ko: '파티', en: 'Party' },
    /* 패널 부제는 숫자만 — 설명은 도움말 탭으로 갔다 (원문은 help.exp.party) */
    'exp.leader': { ko: '리더', en: 'Leader' },
    /* 진형 (⚠ 목업 · SCREEN_DESIGN §4-1) — **랭크 라벨 둘뿐**이다. 템플릿은 **점 아이콘**이라 글자가 없고 키도 없다.
       ~~중열~~ 은 2026-09-09 에 삭제 — 3랭크 템플릿(1·1·1)이 「한 줄에 셋」으로 바뀌어 가운데 랭크가 사라졌다.
       ~~`exp.form.h`(「진형」)~~ 도 2026-09-09 삭제 [사용자 지시 · ADR-0060] — 제목 줄을 걷어 상자를 내용에 맞췄다 */
    'exp.form.front': { ko: '전열', en: 'Front' },
    'exp.form.back': { ko: '후열', en: 'Back' },
    'exp.cantDepart': {
        ko: '이 편성으로는 출발할 수 없다',
        en: 'This party cannot depart',
    },
    'exp.party.note': {
        ko: '런이 끝나면 깎인 HP도 <b>전투불능도 무료·즉시 회복</b> — 비용은 <b>그 런이 얇아지는 것</b>이다 (개정 2026-09-08 — ~~그 출정 동안~~)<br>'
            + '파티 버프는 스탯이 아니라 스킬 효과다 — 통솔의 전투 계수는 없다 (08-25)',
        en: 'Lost HP <b>and downed heroes are restored free and instantly</b> when the run ends — the cost is <b>a thinner party for the rest of that run</b><br>'
            + 'Party buffs are skill effects, not a stat — Leadership has no combat coefficient (08-25)',
    },
    'exp.bench.h': { ko: '벤치', en: 'Bench' },
    'exp.bench.note': {
        ko: '파견 화면은 <b>미착수</b> — 파견처 6(영입·교역·제련·채광·채집·<b>벌목</b>) + 탐험(파티 단위)은 확정, 화면은 후속 (base_expedition_design §2·§3)<br>'
            + '<b>연구는 파견이 아니다</b> — 영웅을 보내지 않고 진행하는 별도 시스템이라 연구 탭이 든다 (2026-08-31 연구소 삭제)<br>'
            + '보낸 영웅은 잠기지 않는다 — 언제든 불러들이고 <b>흐른 만큼 비례해 받는다</b> (§3-2)',
        en: 'Dispatch screen <b>not started</b> — 6 posts (recruit · trade · smelt · mining · gathering · <b>logging</b>) + party-based Exploration are confirmed; the screen comes later (base_expedition_design §2·§3)<br>'
            + '<b>Research is not a dispatch</b> — it runs without sending heroes, so the Research tab owns it (the Lab post was removed 2026-08-31)<br>'
            + 'Dispatched heroes are never locked — recall any time and receive <b>pro rata for the time elapsed</b> (§3-2)',
    },
    'exp.commission.h': { ko: '의뢰', en: 'Commissions' },
    'exp.commission.note': {
        ko: '의뢰는 <b>받아 두는 목표</b>다 — 전장이 열리지 않는다. 게시판에서 골라 받아 두면 <b>평소 활동 위에 얹혀</b> 저절로 진행된다 (2026-09-07 확정)<br>'
            + '유형은 <b>둘</b> — <b>처치</b>(「x를 잡아라」 · 돌던 전투가 저절로 센다) · <b>수집</b>(「x를 모아라」 · 드롭과 파견·탐험 산출이 채운다)<br>'
            + '<b>오프라인에도 진행된다</b> — 자리를 비운 사이에도 목표가 나아간다. 그래서 따로 나갈 파티도, 의뢰만의 전장도 없다<br>'
            + '<b>수락하면 그 회차가 소진된다</b> — 그래서 「어느 의뢰를 받을까」가 결정이 된다. 명성은 <b>성공했을 때만</b> 오르고 떨어지지 않는다<br>'
            + '동시에 받을 수 있는 수 · 보상 · 명성 폭은 미정이라 <b>화면의 숫자는 전부 임시</b>다 (base_expedition_design §1-3)',
        en: 'A commission is a <b>goal you take on</b> — no battlefield opens. Pick one from the board and it fills itself <b>on top of what you already do</b> (settled 2026-09-07)<br>'
            + 'There are <b>two kinds</b> — <b>Slay</b> ("kill x" · the battles you already run count it) and <b>Collect</b> ("gather x" · drops and dispatch/exploration yields fill it)<br>'
            + '<b>It advances offline too</b> — the goal moves while you are away. So there is no party to send and no commission-only battlefield<br>'
            + '<b>Accepting spends that slot</b> — which is what makes "who do I take on" a decision. Fame rises <b>only on success</b> and never falls<br>'
            + 'How many you can hold at once, the rewards and the fame swings are undecided, so <b>every figure on the screen is placeholder</b> (base_expedition_design §1-3)',
    },
    'exp.zones.h': { ko: '원정 지역', en: 'Expedition Zones' },
    'exp.zones.sub': { ko: '1런 = 스테이지 1개 · {r}라운드', en: '1 run = 1 stage · {r} rounds' },
    'exp.cleared': { ko: '클리어', en: 'Cleared' },
    'exp.deploy': { ko: '보내기', en: 'Deploy' },
    'exp.pick': { ko: '원정', en: 'Expedition' },
    'exp.viewComp': { ko: '구성 보기', en: 'Composition' },
    'exp.foes': { ko: '적 구성', en: 'Enemies' },
    'exp.eliteR': { ko: 'R{n} 정예', en: 'R{n} Elite' },
    'exp.solo': { ko: ' 단독', en: ' solo' },
    'exp.escorts': { ko: ' + 호위 1~2', en: ' + 1–2 escorts' },
    'exp.zones.note': {
        ko: '지역 죄종은 해당 죄종 접사의 드롭 가중치를 올린다 — 타겟 파밍의 축<br>'
            + '<b>구조는 고정, 내용물은 랜덤</b> — 라운드 배치(정예 {e} / 보스 {b})는 전 스테이지 공통이고, 몬스터 조합·정예 특성만 매 런 새로 굴려진다<br>'
            + '중도 귀환해도 <b>루팅은 전량 보존</b>된다. 비용은 <b>그 출정 동안 파티가 얇아지는 것</b> + 미클리어(다음 스테이지 미해금)뿐',
        en: "A zone's sin raises the drop weight of that sin's affixes — the axis of target farming<br>"
            + '<b>Fixed structure, random contents</b> — the round layout (elite {e} / boss {b}) is identical for every stage; only monster mixes and elite traits reroll each run<br>'
            + 'Retreating early <b>keeps all loot</b>. The cost is <b>a thinner party for the rest of the run</b> plus no-clear (next stage stays locked)',
    },

    /* ── 원정: 리포트 ── */
    'rep.clear': { ko: '클리어', en: 'Cleared' },
    'rep.xp': { ko: '경험치', en: 'XP' },
    'rep.xpEach': { ko: '각 {n}', en: '{n} each' },
    'rep.rounds': { ko: '라운드', en: 'Rounds' },
    'rep.downed': { ko: '전투 불능', en: 'Downed' },
    'rep.none': { ko: '없음', en: 'None' },
    'rep.downedN': { ko: '{n}명', en: '{n}' },
    'rep.levelUp': { ko: '▲ {name} 레벨 {a} → {b}', en: '▲ {name} Level {a} → {b}' },
    /* 상자 머리는 **상태가 아니라 기록**이다 [개정 2026-09-08] — 뒤에 붙던 「이 출정 동안 아웃」이 폐기됐다 */
    'rep.injuryHead': { ko: '전투불능', en: 'Downed' },
    'rep.injuryNote': {
        ko: '기다릴 것이 없다 — <b>런이 끝나는 순간</b> 전투불능도 깎인 HP도 전원 무료로 회복된다. 다음 런에는 전원이 다시 나간다',
        en: 'Nothing to wait for — <b>the moment the run ends</b> both downed heroes and lost HP are restored, free. Everyone goes out again on the next run',
    },
    'rep.drops.h': { ko: '획득 장비', en: 'Loot' },
    'rep.drops.sub': { ko: '{n}개', en: '{n} items' },
    'rep.drops.none': { ko: '떨어진 장비 없음', en: 'No loot' },
    'rep.salvage': { ko: '분해', en: 'Salvage' },

    /* ── 런 목록 · 기여 (리포트 개편 2026-09-09 · SCREEN_DESIGN §4-3 · ADR-0063) ── */
    'rep.list.h': { ko: '원정 기록', en: 'Runs' },
    'rep.list.sub': { ko: '{n}판', en: '{n} runs' },
    'rep.ago.now': { ko: '방금', en: 'just now' },
    'rep.ago.m': { ko: '{n}분 전', en: '{n}m ago' },
    'rep.ago.h': { ko: '{n}시간 전', en: '{n}h ago' },
    'rep.ago.d': { ko: '{n}일 전', en: '{n}d ago' },
    'rep.contrib.h': { ko: '기여', en: 'Contribution' },
    'rep.contrib.hero': { ko: '영웅', en: 'Hero' },
    'rep.contrib.dealt': { ko: '가한 피해', en: 'Damage dealt' },
    'rep.contrib.taken': { ko: '받은 피해', en: 'Damage taken' },
    'rep.contrib.kills': { ko: '처치', en: 'Kills' },
    'rep.contrib.total': { ko: '합계', en: 'Total' },
    'rep.live': { ko: '재생 중 {a} / {b}', en: 'Playing {a} / {b}' },
    'rep.log.sub': { ko: '정예 {e} / 보스 {b}', en: 'Elite {e} / Boss {b}' },
    'rep.contract': {
        ko: '방치형 계약 — 자리를 비워도 로스터는 파괴되지 않는다. 사건은 리포트 안에서 완결',
        en: 'The idle-game contract — the roster is never destroyed while you are away. Every event resolves inside the report',
    },

    /* ── 영웅 띠 (캐릭터·스킬·선술집 공통 상단, 2026-08-26) — 초상화 + 이름 + 지금 하는 일 ── */
    'hs.doing.idle': { ko: '대기 중', en: 'Idle' },
    /* 원정이 **실제로 도는 동안**만 뜬다 [신설 2026-09-08 사용자 지시] — 파티에 편성만 해 둔 상태는 대기다 (SCREEN_DESIGN §5) */
    'hs.doing.expedition': { ko: '원정 중', en: 'On expedition' },
    /* 수색 중 [신설 2026-09-09] — 나가 있으면 편성이 막히므로(state.js:toggleParty) 띠가 그 이유를 든다 */
    'hs.doing.search': { ko: '수색 중', en: 'On a search' },
    /* ~~'hs.doing.out'(출정 아웃)~~ 은 2026-09-08 삭제 — 띠의 「지금 하는 일」은 **대기 하나**다 (SCREEN_DESIGN §5) */

    /* ── 장비 ── */
    'eq.slots': { ko: '장비는 8칸 — 무기 · 투구 · 갑옷 · 장갑 · 신발 · 목걸이 · 반지 2. 모든 무기는 양손이라 잠기는 칸이 없다', en: '8 gear slots — weapon, helm, armor, gloves, boots, amulet, 2 rings. Every weapon is two-handed, so no slot is ever locked' },
    'st.atk': { ko: '공격력', en: 'Attack' },
    'st.atkType.physical': { ko: '물리', en: 'Physical' },
    'st.atkType.magic': { ko: '마법', en: 'Magic' },
    'st.atkType.fire': { ko: '불', en: 'Fire' },
    'st.atkType.cold': { ko: '냉기', en: 'Cold' },
    'st.atkType.lightning': { ko: '전기', en: 'Lightning' },
    'st.atkType.poison': { ko: '독', en: 'Poison' },
    'st.mitigation': { ko: '감쇠 {p}%', en: '{p}% mitigated' },
    'st.resCap': { ko: '/ 상한 {cap}%', en: '/ cap {cap}%' },
    'log.reflect': { ko: '{name} 의 반사 — {target} 에게 {dmg}', en: '{name} reflects {dmg} to {target}' },
    'st.maxhp': { ko: '최대 HP', en: 'Max HP' },
    'eq.sins.h': { ko: '접사 죄종', en: 'Affix Sins' },
    'eq.sins.note': {
        ko: '착용 장비에 붙은 접사의 죄종 — 접사 카테고리 · 지역 드롭 편향 · 낙인 지정의 축이다<br>'
            + '<b>죄종 세트효과는 폐기</b> — 전술카드로 이관됐다 (tactic_card_design.md §4, 08-26)',
        en: 'Sins of the affixes on worn gear — the axis of affix categories, zone drop bias, and stigma targeting<br>'
            + '<b>Sin set effects are dropped</b> — they moved to tactic cards (tactic_card_design.md §4, 08-26)',
    },
    'eq.sins.none': { ko: '접사 없음', en: 'No affixes' },
    'eq.filter.all': { ko: '전체', en: 'All' },
    'eq.inv.note': {
        ko: '칸에 마우스를 올리면 <b>착용 중인 장비와 나란히</b> 비교된다. 테두리 색 = 희귀도',
        en: 'Hover a cell to compare it <b>side by side with the equipped item</b>. Border color = rarity',
    },

    /* ── 캐릭터 탭 (2026-08-23 개편) — 영웅 띠 / 장비·전체·세부·스킬 4칸 / 아이템 가로 ── */
    'ch.gear.h': { ko: '장비', en: 'Equipment' },
    'ch.attr.h': { ko: '기본 옵션', en: 'Basic Stats' },
    'ch.attr.sub': { ko: '장비 불변', en: 'Gear-immutable' },
    'ch.attr.range': { ko: '{min} ~ {max}', en: '{min} ~ {max}' },
    'ch.attr.note': {
        ko: '기본 능력치 7종은 <b>영웅이 갖고 태어난다</b> — 장비는 단 1도 올리지 않는다 '
            + '([balance.csv:attr_equip_bonus] = 0).<br>'
            + '하는 일은 둘뿐이다: <b>전투 능력치의 계수</b>(오른쪽 칸의 괄호 표기)와 <b>파견 판정</b>.<br>'
            + '최대 HP는 어떤 능력치도 담당하지 않는다 — 전 영웅 같은 값에서 시작해 레벨·장비로만 자란다',
        en: 'The 7 attributes are <b>innate to the hero</b> — gear never raises them by even 1 '
            + '([balance.csv:attr_equip_bonus] = 0).<br>'
            + 'They do exactly two things: <b>scale combat stats</b> (shown in parentheses on the right) '
            + 'and <b>decide dispatch outcomes</b>.<br>'
            + 'No attribute governs Max HP — every hero starts at the same value and grows it only by level and gear',
    },
    'ch.detail.h': { ko: '세부 옵션', en: 'Detailed Stats' },
    'ch.detail.hn': { ko: '세부 옵션 {n}', en: 'Detailed Stats {n}' },
    'ch.detail.note': {
        ko: '전투 능력치는 <b>장비와 스킬이 만든다</b>. 값이 <b>—</b> 인 축은 0이 아니라 '
            + '<b>아직 아무것도 그 축을 건드리지 않았다</b>는 뜻이다 — 비어 있는 축이 곧 다음 장비의 자리다.<br>'
            + '괄호 안 약어 = 이 축을 미는 기본 능력치. 표는 src/data/combat_stat.csv 를 그대로 따른다',
        en: 'Combat stats are <b>built by gear and skills</b>. A <b>—</b> is not zero — it means '
            + '<b>nothing has touched that axis yet</b>, and an empty axis is where the next item goes.<br>'
            + 'The abbreviation in parentheses is the attribute that scales it. This table mirrors src/data/combat_stat.csv',
    },
    'ch.skill.h': { ko: '액티브 스킬', en: 'Active Skills' },
    'ch.skill.go': { ko: '스킬 트리 열기', en: 'Open skill tree' },
    'ch.items.h': { ko: '아이템', en: 'Items' },
    'ch.items.sub': { ko: '{n} / {cap} 칸', en: '{n} / {cap} slots' },

    /* ── 툴팁 ── */
    'tip.equipped': { ko: '착용 중', en: 'Equipped' },
    'tip.this': { ko: '이 아이템', en: 'This Item' },
    // 교체될 자리가 빈 경우 — 옛 판의 「비어 있음」 빈 카드 한 장을 대신하는 하단 힌트 한 줄 (SCREEN_DESIGN §6 개정 2026-09-08)
    'tip.noneEquipped': { ko: '착용 중 없음', en: 'Nothing equipped' },
    'tip.noAffix': { ko: '접사 없음', en: 'No affixes' },
    /* 담은 스킬 [신설 2026-09-09 · §6] — 무기가 액티브 한 칸을 통째로 정하므로(skill_design §12-1 규칙 3)
       공격력만 보고 무기를 고르지 않게 툴팁이 그것을 말한다. 문장은 액티브 줄과 **같은 함수**가 낸다 */
    'tip.skill': { ko: '담은 스킬', en: 'Skill' },
    'tip.noSkill': { ko: '담은 스킬 없음', en: 'No skill' },
    // 옵션 출처 태그 (2026-09-08 · SCREEN_DESIGN §6) — `affix.csv` 가 통합옵션 풀로 확정돼(GAME_DESIGN §9 09-08)
    // 지금 뜨는 접사는 전부 이것이다. 죄종 칸 풀이 서는 날 `[분노]` 같은 태그가 같은 자리에 들어간다
    'tip.src.random': { ko: '랜덤', en: 'Random' },
    'tip.ringSlot': { ko: '반지 {n}번 칸에 낀다', en: 'Goes on ring slot {n}' },
    // ~~`tip.up.first`·`tip.up.next`~~ 는 2026-09-08 삭제 [사용자 지시] — 툴팁의 강화 줄이 통째로 죽었다.
    // 단계는 이름 앞의 `+n` 이 들고, 비용·상한은 제련소(SCREEN_DESIGN §8-2)의 값이다. `tip.up.option` 은 09-08 에 먼저 죽었다.
    // ⚠ 옛 `tip.up.max` 는 **안 죽었다** — 제련소가 쓰고 있어 `fg.` 접두로 옮겼다(툴팁 전용이 아니게 됐으므로)
    // 영웅 · 스킬 툴팁 (2026-08-28) — 영웅 띠와 관전 유닛 카드가 같이 쓴다 (ui/tip.js)
    'tip.hero.h': { ko: '영웅', en: 'Hero' },
    'tip.hero.lv': { ko: 'Lv.{n}', en: 'Lv.{n}' },
    'tip.skill.h': { ko: '스킬', en: 'Skill' },

    /* ── 스킬 ── */
    /* ── 연구 탭 — 파티 전술 (2026-08-30 · SCREEN_DESIGN §13) ── */
    'rs.h': { ko: '파티 전술', en: 'Party Tactics' },
    'rs.research.h': { ko: '연구', en: 'Research' },
    'rs.research.note': {
        ko: '연구 탭은 <b>「연구」와 「파티전술」 두 섹션</b>이다 (2026-08-31 개정) — 지금 그리는 것은 파티전술 하나<br>'
            + '<b>연구</b>는 스킬 노드·레시피 해금을 맡고 채집이 물어온 재료를 쓴다. <b>영웅 파견은 하지 않는다</b> — 옛 연구소(파견처)를 대체한다<br>'
            + '비용 곡선·해금 순서가 미정이라 미착수 (GAME_DESIGN §9 · skill_design §5)',
        en: 'The Research tab holds <b>two sections — Research and Party Tactics</b> (revised 2026-08-31); only Party Tactics is drawn today<br>'
            + '<b>Research</b> unlocks skill nodes and recipes and spends materials brought back by gathering. <b>It sends no heroes</b> — it replaces the old Lab dispatch post<br>'
            + 'Cost curve and unlock order are undecided, so the section is not started (GAME_DESIGN §9 · skill_design §5)',
    },
    /* 연구 섹션 [신설 2026-09-01] — ⚠ 내용은 목업이다 (ui/mock.js:RESEARCH · SCREEN_DESIGN §13-1).
       칸 안의 이름·해금 내용은 데이터 문자열이라 mock 의 {ko,en} 을 L() 이 푼다. 여기 있는 것은 **라벨뿐**.
       누를 때의 안내는 새로 쓰지 않고 `todo.lead` 를 그대로 부른다 (§11 · 수색 버튼과 같은 처리) */
    'rs.rs.done': { ko: '완료', en: 'Done' },
    'rs.rs.progress': { ko: '완료 {n}', en: 'Done {n}' },
    'rs.rs.mat': { ko: '재료', en: 'Materials' },
    'rs.rs.cost': { ko: '재료 {m} · {g}G', en: '{m} mat · {g}G' },
    'rs.rs.go': { ko: '연구', en: 'Research' },
    'rs.rs.need': { ko: '{name} 먼저', en: 'Needs {name}' },
    'rs.total': { ko: '합산 레벨', en: 'Total Level' },
    'rs.open': { ko: '열린 칸', en: 'Slots Open' },
    'rs.next': { ko: '{no}번 칸까지 {n}', en: '{n} more to slot {no}' },
    'rs.allOpen': { ko: '전부 열렸다', en: 'All slots open' },
    'rs.slot': { ko: '{n}번 칸', en: 'Slot {n}' },
    'rs.needLv': { ko: '합산 Lv.{lv}', en: 'Total Lv.{lv}' },
    'rs.on': { ko: '켜짐', en: 'On' },
    'rs.off': { ko: '꺼짐', en: 'Off' },
    'rs.reroll': { ko: '리롤 {g}G', en: 'Reroll {g}G' },
    'rs.reroll.done': { ko: '{o}', en: '{o}' },
    'rs.err.gold': { ko: '골드가 모자란다', en: 'Not enough gold' },
    'rs.err.locked': { ko: '아직 열리지 않은 칸이다', en: 'That slot is not open yet' },
    'rs.err.missing': { ko: '없는 칸이다', en: 'No such slot' },
    'rs.note': {
        ko: '칸은 <b>줍는 것이 아니다</b> — 로스터 전원의 레벨 합이 문턱을 넘을 때마다 하나씩 열리고, '
            + '칸에 든 옵션은 골드로 다시 굴린다. 리롤에는 <b>지금 든 것과 다른 칸에 든 것이 나오지 않는다</b>.',
        en: 'Slots are <b>not looted</b> — one opens each time the summed level of your whole roster crosses a threshold, '
            + 'and the option inside is rerolled with gold. A reroll never returns what this slot or another slot already holds.',
    },
    'rs.note.cond': {
        ko: '조건은 <b>편성에서 확정되는 것</b>만 센다 — 죄종·직업·무기·접사·스킬 태그. '
            + '전투 중에 변하는 값(현재 HP · 남은 적)은 쓰지 않는다. 효과는 <b>파티에 든 영웅</b>에게만 붙는다.',
        en: 'Conditions read only what the formation fixes — sins, classes, weapons, affixes, skill tags. '
            + 'Nothing that changes mid-battle (current HP, enemies left). Effects apply only to heroes in the party.',
    },
    // 전술 옵션 등급 — ⚠ 아이템 희귀도(`mock.js:RARITY`)와 **별개 축**이고 이름만 같다 (tactic_card_design §5-5)
    'rs.grade.common': { ko: '일반', en: 'Common' },
    'rs.grade.magic': { ko: '매직', en: 'Magic' },
    'rs.grade.rare': { ko: '레어', en: 'Rare' },
    'rs.cond.always': { ko: '조건 없음', en: 'No condition' },
    'rs.cond.sin_same': { ko: '같은 죄종 {n}명 이상', en: '{n}+ heroes sharing a sin' },
    'rs.cond.sin_kind': { ko: '죄종 {n}종 이상', en: '{n}+ different sins' },
    'rs.cond.class_same': { ko: '같은 직업 {n}명 이상', en: '{n}+ heroes sharing a class' },
    'rs.cond.affix_sin': { ko: '{a} 접사 {n}개 이상', en: '{n}+ {a} affixes' },
    'rs.cond.skill_tag': { ko: '{a} 스킬 보유 {n}명 이상', en: '{n}+ heroes with a {a} skill' },

    'sk.points.h': { ko: '스킬 포인트', en: 'Skill Points' },
    'sk.points.note': {
        ko: '죄종 마스터리와 직업 마스터리가 <b>포인트 풀을 공유</b>한다 — 같은 축이 양쪽에 있어도 중복이 아니라 <b>기회비용이 있는 선택</b>이다.<br>'
            + '레벨업마다 받고, <b>초기화는 무료·수시</b>다 — 전액 돌려받으므로 잘못 찍어 영웅 하나를 버리는 일이 없다.<br>'
            + '한 칸만 물리려면 그 칸을 <b>우클릭</b>한다 — 랭크가 1 줄고 포인트가 1 돌아온다. 잠긴 칸에 찍어 둔 것도 그렇게 뺀다.<br>'
            + '⚠ 전직 전용 포인트는 별개 풀인데 <b>전직 층이 미구현</b>이라 아직 없다.',
        en: 'Sin mastery and class mastery <b>share one point pool</b> — the same axis appearing on both sides is not redundancy but a <b>choice with opportunity cost</b>.<br>'
            + 'You earn points on level-up, and <b>resetting is free and always available</b> — a full refund, so no hero is ever ruined by a bad pick.<br>'
            + 'To undo just one node, <b>right-click</b> it — one rank comes off and one point comes back. Works on locked nodes you had already invested in.<br>'
            + '⚠ Advancement points are a separate pool, absent until the advancement layer exists.',
    },
    'sk.points.left': { ko: '남은 포인트', en: 'Points left' },
    'sk.reset': { ko: '초기화', en: 'Reset' },
    'sk.reset.done': { ko: '{n} 포인트를 돌려받았다', en: 'Refunded {n} points' },
    'sk.needLv': { ko: 'Lv.{lv}', en: 'Lv.{lv}' },
    'sk.err.locked': { ko: 'Lv.{lv} 부터 찍을 수 있다', en: 'Available from Lv.{lv}' },
    'sk.err.maxRank': { ko: '이미 최대 랭크다', en: 'Already at max rank' },
    'sk.err.points': { ko: '스킬 포인트가 없다', en: 'No skill points left' },
    'sk.err.noRank': { ko: '아직 찍지 않은 칸이다', en: 'Nothing invested here yet' },
    // 찍은 칸의 툴팁 꼬리 — 우클릭이 있다는 것 자체가 안 보이면 못 쓴다 (SCREEN_DESIGN §7)
    'sk.unlearnHint': { ko: ' · 우클릭 = 1랭크 되돌리기', en: ' · Right-click to refund 1 rank' },
    'sk.slots.h': { ko: '액티브', en: 'Actives' },
    'sk.slots.sub': { ko: '3개 — 순서 = 우선순위', en: '3 — order = priority' },
    'sk.cycle': { ko: '행동 주기', en: 'Action Cycle' },
    'sk.cycleSec': { ko: '{s}초', en: '{s}s' },
    'sk.cycle.sub': { ko: '민첩 + 무기군 속도 (물리·마법 단일 축)', en: 'Agility + weapon-group speed (one clock for melee & magic)' },
    'sk.emptySlot': { ko: '빈 칸', en: 'Empty' },
    // 출처 셋은 **영웅 / 무기 / 전직** 이다 [2026-09-08 사용자 지시] — ~~고유~~. 액티브 줄·후보 카드·툴팁 칩이 같은 키를 쓴다
    'sk.innate': { ko: '영웅', en: 'Hero' },
    // 액티브 3칸의 출처 라벨 — 칸은 출처가 정한다 (skill_design §2)
    'sk.src.weapon_group': { ko: '무기', en: 'Weapon' },
    'sk.src.advance': { ko: '전직', en: 'Advance' },
    'sk.emptyWeapon': { ko: '무기 없음', en: 'No weapon' },
    'sk.emptyAdvance': { ko: '전직 전', en: 'Not advanced' },
    /* 스킬 툴팁 문장 [전면 개정 2026-09-08 사용자 지시 · SCREEN_DESIGN §4-2]
       ~~`표기 6초 · 실효 7.2초 (+20%)`~~ 를 버리고 **데이터로 조립한 한 문장**을 낸다.
       틀은 `kind` × `target` 이 고르고 숫자만 강조색으로 뽑는다. **조각을 이어붙이지 않는다** —
       ko/en 이 어순이 달라 각 틀이 제 문장을 통째로 든다. {d} 는 아래 수량 구절이 들어가는 자리. */
    'sk.line.single': {
        ko: '{n}초마다 적 하나를 강하게 공격해 {d}를 가한다',
        en: 'Every {n}s, strikes one enemy hard for {d}',
    },
    'sk.line.singleN': {
        ko: '{n}초마다 적 하나를 {h}번 때려 매번 {d}를 가한다',
        en: 'Every {n}s, hits one enemy {h} times for {d} each',
    },
    'sk.line.all': {
        ko: '{n}초마다 적 전원에게 {d}를 가한다',
        en: 'Every {n}s, deals {d} to every enemy',
    },
    'sk.line.rotate': {
        ko: '{n}초마다 대상을 옮겨 가며 {h}번 공격해 매번 {d}를 가한다',
        en: 'Every {n}s, attacks {h} times moving between targets, {d} each',
    },
    'sk.line.chain': {
        ko: '{n}초마다 줄지어 선 적을 꿰뚫어 {d}를 가한다 — 뒤 대상일수록 {k}% 씩 줄어든다',
        en: 'Every {n}s, pierces enemies in a line for {d} — falling off {k}% per target',
    },
    'sk.line.heal': {
        ko: '{n}초마다 파티 전원의 HP 를 {d} 되돌린다',
        en: 'Every {n}s, restores {d} to the whole party',
    },
    /* ⚠ ko 는 **서술어를 틀에 두지 않는다** — 한국어 조사(을/를)가 앞말 받침을 타는데 {e} 가 무엇으로
       끝날지 틀이 모른다(「+25%」 → 를 · 「보호막」 → 을). 그래서 ko 효과 구절이 서술어까지 들고,
       en 은 반대로 틀이 `grants` 를 든다. 언어마다 문장을 쪼개는 자리가 다른 것이 정상이다 */
    'sk.line.buffParty': {
        ko: '{n}초마다 파티 전원에게 {s}초간 {e}',
        en: 'Every {n}s, grants the whole party {e} for {s}s',
    },
    'sk.line.buffSelf': {
        ko: '{n}초마다 {s}초간 자신에게 {e}',
        en: 'Every {n}s, grants yourself {e} for {s}s',
    },
    'sk.line.taunt': {
        ko: '{n}초마다 {s}초간 적의 공격을 자신에게 끌어모은다',
        en: 'Every {n}s, draws enemy attacks to yourself for {s}s',
    },
    /* 2026-09-09 신설 — 직업 스킬 풀 37 이 다 발행되면서 생긴 틀 일곱 (skill_design §12 · DEV_PLAN R61).
       ⚠ `sk.line.aura` 만 `{n}`(쿨)을 안 든다 — 오오라는 쿨이 없다(§1-5) */
    'sk.line.healOne': {
        ko: '{n}초마다 가장 위태로운 아군의 HP 를 {d} 되돌린다',
        en: 'Every {n}s, restores {d} to the most wounded ally',
    },
    'sk.line.guided': {
        ko: '{n}초마다 방어가 가장 두꺼운 적을 {h}번 때려 매번 {d}를 가한다',
        en: 'Every {n}s, hits the best-armored enemy {h} times for {d} each',
    },
    'sk.line.buffAdjacent': {
        ko: '{n}초마다 양 옆의 아군에게 {s}초간 {e}',
        en: 'Every {n}s, grants the allies beside you {e} for {s}s',
    },
    'sk.line.debuffAll': {
        ko: '{n}초마다 적 전원에게 {s}초간 {e}',
        en: 'Every {n}s, inflicts {e} on every enemy for {s}s',
    },
    'sk.line.duel': {
        ko: '{n}초마다 적 하나를 지목해 라운드가 끝날 때까지 자신만 노리게 한다',
        en: 'Every {n}s, marks one enemy to attack only you until the round ends',
    },
    'sk.line.aura': {
        ko: '항상 켜져 있다 — 파티 전원에게 {e}',
        en: 'Always on — {e} for the whole party',
    },
    'sk.line.summon': {
        ko: '{n}초마다 자신의 최대 HP 의 {h}% 를 가진 벽을 세워 적의 공격을 나눠 받는다',
        en: 'Every {n}s, raises a wall worth {h}% of your max HP that soaks enemy attacks',
    },
    /* 수량 구절 — 공격력을 아는 자리는 **실제 수치**, 모르는 자리(후보 카드)는 **배율**로 접는다.
       ⚠ 감소·치명 전의 값이다 (game_logic/skill.js:previewOf) */
    'sk.amt.physical': { ko: '{v} 의 물리 피해', en: '{v} physical damage' },
    'sk.amt.magic': { ko: '{v} 의 마법 피해', en: '{v} magic damage' },
    'sk.amt.mult': { ko: '공격력의 {m}% 만큼 피해', en: 'damage equal to {m}% of Attack' },
    'sk.amt.heal': { ko: '{v} 만큼', en: '{v} HP' },
    'sk.amt.healMult': { ko: '공격력의 {m}% 만큼', en: 'HP equal to {m}% of Attack' },
    /* 버프 효과 구절 — **이름 + 값**만 (원칙 4). 키는 `skill.csv:effect_stat` 어휘 그대로 */
    'sk.eff.atk_pct': { ko: '공격력 +{v}% 를 건다', en: '+{v}% Attack' },
    'sk.eff.period_pct': { ko: '행동 주기 −{v}% 를 건다', en: '−{v}% action cycle' },
    'sk.eff.barrier_pct': { ko: '최대 HP {v}% 짜리 보호막을 씌운다', en: 'a shield worth {v}% of max HP' },
    /* 2026-09-09 신설. `.neg` 는 **같은 창을 음수로 쓴 디버프**의 틀이다 — 값은 절댓값으로 들어온다(tip.js) */
    'sk.eff.guard_pct': { ko: '방어력과 모든 저항 +{v}% 를 건다', en: '+{v}% defense and all resistances' },
    'sk.eff.hp_max_pct': { ko: '최대 HP +{v}% 를 건다', en: '+{v}% max HP' },
    'sk.eff.regen_pct': { ko: 'HP 재생 +{v}% 를 건다', en: '+{v}% HP regen' },
    'sk.eff.dr_pct': { ko: '받는 피해 −{v}% 를 건다', en: '−{v}% damage taken' },
    'sk.eff.onhit_element': { ko: '기본 공격마다 {v}% 의 추가 피해를 얹는다', en: 'adds a {v}% extra hit on every basic attack' },
    'sk.eff.attack_splash': { ko: '기본 공격이 적 전원에게 {v}% 로 퍼진다', en: 'basic attacks spread to all enemies at {v}%' },
    'sk.eff.atk_pct.neg': { ko: '공격력 −{v}% 를 건다', en: '−{v}% Attack' },
    'sk.eff.period_pct.neg': { ko: '행동 주기 +{v}% 를 건다', en: '+{v}% action cycle' },
    /* 그 스킬의 **표기 쿨** [개정 2026-09-08 2차 사용자 지시] — 어느 영웅이 들든 같은 수다.
       ~~`sk.base`·`sk.eff`·`sk.aligned`~~ (1차 폐기) → ~~`sk.every`(`{s}초마다`)~~ → **`sk.cool`**.
       **말까지 바꾼 이유는 값이 바뀌었기 때문**이다 — 「{s}초마다」는 빈도의 약속인데 표기 쿨은 빈도가 아니다
       (정렬 대기만큼 뒤에 나간다). 쿨이라고 적으면 참이 된다 */
    'sk.cool': { ko: '쿨 {s}초', en: 'Cooldown {s}s' },
    'sk.slots.note': {
        ko: '행동 주기가 오면 <b>가장 오래 기다린 스킬</b> → 동률이면 <b>슬롯 순서</b> → 없으면 기본 공격.<br>'
            + '한 차례에 하나. 스킬은 그 차례의 공격을 <b>대체</b>하고 마나는 없다 — 행동 1회가 유일한 비용<br>'
            + '쿨은 실시간으로 돈다. 쿨이 행동 주기의 정수배일 때 손실 0 → <b>쿨감 옵션</b>이 정렬 손잡이<br>'
            + '스킬은 <b>직업에 귀속</b>된다 — 한 스킬은 한 직업에만 있고, <b>영웅 칸과 무기 칸이 같은 직업 풀</b>에서 하나씩 온다<br>'
            + '⚠ 이름과 형태는 확정이지만 <b>배율 · 타수 · 쿨 · 지속은 미발행</b>이다 — 지금 값은 임시다',
        en: 'When your turn comes: <b>the longest-waiting ready skill</b> → ties go to <b>slot order</b> → none ready means a basic attack.<br>'
            + 'One action per turn. A skill <b>replaces</b> that turn\'s attack and there is no mana — the action itself is the only cost<br>'
            + 'Cooldowns run in real time. Zero loss when a cooldown is a whole multiple of the cycle → <b>CDR affixes</b> are the alignment lever<br>'
            + 'Skills belong to a <b>class</b> — each skill sits in exactly one class, and the hero slot and the weapon slot both draw from that class pool<br>'
            + '⚠ Names and shapes are settled, but <b>multipliers, hits, cooldowns and durations are not published</b> — the current numbers are placeholders',
    },
    'sk.tab1': { ko: '탭1', en: 'Tab 1' },
    'sk.tab2': { ko: '탭2', en: 'Tab 2' },
    'sk.tab3': { ko: '탭3', en: 'Tab 3' },
    'sk.sinTree': { ko: '{sin} 마스터리', en: '{sin} Mastery' },
    'sk.sinTree.sub': { ko: '죄종에서 옴 — 모든 {sin} 영웅 공유', en: 'Shared by all {sin} heroes' },
    'sk.sinTree.missing': {
        ko: '<b>맨 윗줄은 7죄종이 전부 같다</b> — 죄종마다 다르게 주면 파워가 갈려 약한 죄종 영웅이 로스터에서 버려진다. 바닥을 통일하고 <b>죄종의 개성은 그 아랫줄부터</b> 준다.<br>'
            + '둘째 줄이 {sin} 만의 축이고, <b>맨 아랫줄(반응형)은 기획이 방향만 정했다</b> — 「~하면 ~한다」는 발동 빈도에 파워가 종속돼 값을 잴 자가 없다.',
        en: '<b>The top row is identical for all 7 sins</b> — differing power there would strand heroes of the weaker sins on the bench. The floor is shared and <b>each sin\'s identity starts one row down</b>.<br>'
            + 'The second row is {sin}\'s own axis. <b>The bottom row (reactive) has direction but no numbers</b> — "when X, then Y" scales with trigger frequency, and there is no yardstick for that yet.',
    },
    'sk.mastery': { ko: '{cls} 마스터리', en: '{cls} Mastery' },
    'sk.mastery.missing': {
        ko: '죄종 마스터리와 <b>같은 구조</b>다. <b>전사의 맨 윗줄만 확정</b>(체력 · 모든 저항력 · 공격력)이고 기사·마법사·궁수·사제는 첫 줄부터 비어 있다 — 죄종은 7종이 성격으로 갈리는데 직업 5종이 무엇으로 갈릴지가 먼저다.<br>'
            + '<b>모든 저항력</b>은 죄종 어디에도 없는 유일한 축이다.',
        en: 'Same structure as sin mastery. <b>Only the Warrior\'s top row is settled</b> (health · all resistances · attack); Knight, Mage, Archer and Priest are empty from the first row — the 7 sins split by temperament, but what splits 5 classes is still an open question.<br>'
            + '<b>All resistances</b> is the one axis no sin mastery offers.',
    },
    'sk.advTree': { ko: '전직 트리', en: 'Advancement Tree' },
    'sk.advTree.missing': {
        ko: '<b>액티브를 주는 층은 전직 하나</b>다 — 두 마스터리는 전부 패시브다. 전직 3갈래 중 하나를 고르면 그 전직이 액티브 3을 주고, <b>그중 1개를 찍은 것만</b> 칸에 올라 트리의 뿌리가 된다.<br>'
            + '⚠ 미구현 — 뿌리 45개가 필요해졌고 <b>트리 형태(깊은 트리 vs 얕은 티어)</b>가 미정이라 총량을 못 정한다. 본 프로젝트 최대의 콘텐츠 부채다.',
        en: '<b>Advancement is the only layer that grants actives</b> — both masteries are purely passive. Picking one of three advancements grants three actives, and <b>only the one you invest in</b> takes the slot and becomes a tree root.<br>'
            + '⚠ Not built — 45 roots are now required and the <b>tree shape (deep tree vs shallow tiers)</b> is undecided, so the total is unbounded. The project\'s largest content debt.',
    },
    'sk.advLocked': { ko: 'Lv.{lv} 해금 — 현재 Lv.{cur}', en: 'Unlocks at Lv.{lv} — now Lv.{cur}' },
    'sk.advOpen': { ko: '해금됨', en: 'Unlocked' },
    'sk.lockedSuffix': { ko: ' (잠김)', en: ' (locked)' },
    'sk.grid.note': {
        ko: '마스터리는 가지가 갈리는 트리가 아니라 <b>위에서 아래로 쌓는</b> 구조다 — <b>윗줄이 먼저 열리고 아랫줄일수록 늦게</b> 열린다<br>'
            + '칸을 누르면 1랭크 오른다. 아직 못 여는 칸에는 <b>필요한 레벨</b>이 적힌다. <b>빈 칸은 기획 미작성 자리</b>이고, 점선 프레임을 남겨 두는 것은 어디까지 갈 수 있는지를 보여주기 위해서다',
        en: 'Mastery is not a branching tree but <b>stacks from top to bottom</b> — <b>the top row opens first, lower rows later</b><br>'
            + 'Click a cell to add a rank. Cells you cannot open yet show <b>the level they need</b>. <b>Empty cells are unwritten design</b>; the dashed frame stays so you can see how far this can go',
    },

    /* ── 선술집 ── */
    'tv.h': { ko: '영입 후보', en: 'Recruits' },
    'tv.sub': { ko: '레어 층 — 직업 × 죄종 × 시작특성이 등장 시 굴려진다', en: 'Rare tier — class × sin × trait rolled on arrival' },
    'tv.reroll.note': {
        ko: '선술집 리롤 = <b>아이템 파밍의 영웅판</b> — 굴림 루프는 <b>레어 층</b>에 산다. 죄종 × 직업 35칸을 전부 여기서 공급한다',
        en: 'Tavern rerolls are <b>item farming for heroes</b> — the rolling loop lives in the <b>rare tier</b>, which supplies all 35 sin × class combinations',
    },
    'tv.uniqueTodo.h': { ko: '유니크 영웅 — 선술집 희귀 등장', en: 'Unique heroes — rare tavern appearances' },
    'tv.uniqueTodo.b': {
        ko: '명단·수색 어느 쪽에서도 희귀 등장 — 매력 영웅 배치가 등장 확률·품질을 올린다 (hero_design.md §1)',
        en: 'Appears rarely in both the roster and searches — stationing a high-Charisma hero raises the odds and quality (hero_design.md §1)',
    },
    'tv.tiers.note': {
        ko: '<b>유니크</b> — 이름·직업·죄종 고정 + 고유 스킬 1개(영웅 전용), 로스터에 1명만. 본편 15명(직업별 3)이 상한<br>'
            + '<b>레어</b> — 전부 굴림, 고유 스킬은 공용 풀에서 배정. 죄종 × 직업 35칸 커버리지를 전담한다',
        en: '<b>Unique</b> — fixed name, class, and sin + 1 signature skill (hero-exclusive); one copy per roster. Capped at 15 in the base game (3 per class)<br>'
            + '<b>Rare</b> — everything rolled; signature skill assigned from the shared pool. Covers all 35 sin × class cells',
    },

    /* ── 도감 ── */
    /* 세그먼트 넷 [신설 2026-09-08 사용자 지시 — SCREEN_DESIGN §9] — 몬스터(카드 수집)만 이 블록이 든다.
       나머지 셋(캐릭터 · 아이템 · 스킬)의 문구는 아래 「도감 — 자산 세그먼트」(`ix.*`) 블록이다.
       `cx.h`(몬스터 도감)는 화면 제목 자리를 `nav.codex` 에 내주고 **도움말 섹션 제목으로만** 남는다 (§12). */
    'cx.seg.monster': { ko: '몬스터', en: 'Monsters' },
    'cx.seg.character': { ko: '캐릭터', en: 'Characters' },
    'cx.seg.item': { ko: '아이템', en: 'Items' },
    'cx.seg.skill': { ko: '스킬', en: 'Skills' },
    'cx.h': { ko: '몬스터 도감', en: 'Monster Codex' },
    'cx.sub': { ko: '카드 {pct}% 드롭 · 레벨별 필요 {list}장 — 스테이지 계열 스탯이 오른다', en: 'Cards drop at {pct}% · {list} per level — raises the stage\'s stat line' },
    /* 잠금 문구 셋(cx.chLocked · cx.chLockedTail · cx.locked)은 2026-09-06 삭제 — 도감이 해금을 안 본다 (SCREEN_DESIGN §9) */
    'cx.sinLabel': { ko: '죄종', en: 'Sin' },
    'cx.completion': { ko: '완주', en: 'Completion' },
    'cx.cards': { ko: '{n}장', en: '{n} cards' },
    'cx.next': { ko: '다음 {n}장', en: 'Next at {n}' },
    'cx.max': { ko: '최종', en: 'Max' },
    'cx.kills': { ko: '처치 {n}', en: '{n} kills' },
    'cx.lvTitle': { ko: '도감 Lv.{lv}', en: 'Codex Lv.{lv}' },
    'cx.note': {
        ko: '몬스터를 잡으면 확률로 <b>그 몬스터의 카드</b>가 떨어진다 ([balance.csv:codex_card_drop_pct], 장비 드롭과 별개 판정). '
            + '카드가 누적 문턱을 넘을 때마다 도감 레벨이 오르고 그 스테이지의 계열 스탯이 오른다 — <b>파밍이 도감을 민다</b><br>'
            + '카드는 누적이고 소모되지 않는다 · 처치 수는 기록만 · 필요 장수는 codex_level.csv(⚠제안값)<br>'
            + '⚠ 레벨별 보정 %는 <b>화면 확인용 자리표시</b> — codex_level.csv 로 이관 예정. 보스 등급별 차등은 후속<br>'
            + '얼굴 아트는 Ch1 5종만 존재 — 나머지는 이니셜 한 글자로 폴백한다',
        en: 'Slaying a monster has a chance to drop <b>its card</b> ([balance.csv:codex_card_drop_pct], rolled separately from gear). '
            + "Each cumulative card threshold raises the monster's codex level and that stage's stat line — <b>farming pushes the codex</b><br>"
            + 'Cards accumulate and are never spent · kills are only recorded · card requirements live in codex_level.csv (⚠ proposed)<br>'
            + '⚠ Per-level bonus % is a <b>screen-mock placeholder</b> — to be moved into codex_level.csv. Boss-grade scaling comes later<br>'
            + 'Face art exists for 5 Ch1 monsters only — the rest fall back to a single initial',
    },

    /* ── 도감 — 자산 세그먼트 (SCREEN_DESIGN §9-1 · 신설 2026-09-06 · 탭 흡수 2026-09-08) ──
       타일에 붙는 것은 **이름과 파일명뿐**이다 — 「무기는 제 그림이고 방어구는 임시다」 같은 규칙은
       화면 문구가 아니라 §9-1 과 `mock.js` 주석의 내용이다 (§12 설명 문구는 도움말 탭 전용).
       **`ix.` 접두를 그대로 둔다** — 옛 「이미지 도감」 탭이 도감의 세그먼트 셋이 됐을 뿐 이 문구 묶음은 그대로라,
       접두를 `cx.` 로 갈면 몬스터 카드 문구와 한 이름 공간에 섞여 오히려 어느 세그먼트의 것인지가 안 읽힌다.
       09-08 삭제 — `ix.h`(탭 제목 · `nav.codex` 가 받는다) · `ix.seg.*`(세그먼트 · `cx.seg.*` 가 받는다) ·
       `ix.g.monster`(몬스터 초상 묶음 · 몬스터 세그먼트의 카드가 그 일을 한다 — §9). */
    'ix.g.heroCls': { ko: '{cls} 초상', en: '{cls} Portraits' },   // 직업 하나가 묶음 하나 (ADR-0066) — ~~ix.g.hero~~ 대체
    'ix.g.weapon': { ko: '무기', en: 'Weapons' },
    'ix.g.armor': { ko: '방어구 · 장신구', en: 'Armor & Accessories' },
    'ix.g.empty': { ko: '빈 칸 실루엣', en: 'Empty Slot Silhouettes' },
    /* 스킬은 **직업으로 묶는다** [개정 2026-09-08 사용자 지시 — §9-1]. 그룹 하나가 한 직업이고 그 안에
       그 직업의 스킬 전부가 선다 — **1스킬 = 1직업**이라 묶는 일이 `owner_id` 하나로 끝난다(2026-09-09).
       삭제된 키 셋 — `ix.g.skillClass`·`ix.g.skillWeapon`(09-08 · `owner_kind` 를 그대로 묶던 이름) ·
       **`ix.skillFrom`**(09-09 · 무기군 액티브의 이름표였는데 무기군 고정 폐기로 이름표 자체가 사라졌다) */
    'ix.g.skillCls': { ko: '{cls} 스킬', en: '{cls} Skills' },
    'ix.count': { ko: '{n}장', en: '{n} images' },
    'ix.style': { ko: '얼굴 스타일', en: 'Face style' },
    'ix.hero': { ko: '영웅 {n}', en: 'Hero {n}' },

    /* ── 전투 관전 ── */
    /* `bt.round`(「라운드」 접두)는 2026-09-04 헤드에서 라운드 수치가 삭제되며 부르는 곳이 없어져 지웠다 */
    /* 배속·건너뛰기 문구는 2026-09-04 헤드 한 줄 개정에서 줄였다 (옛 `{n}배속` · `건너뛰고 리포트만` — SCREEN_DESIGN §4-2) */
    'bt.speed': { ko: '×{n}', en: '×{n}' },
    'bt.pause': { ko: '일시정지', en: 'Pause' },
    'bt.resume': { ko: '재개', en: 'Resume' },
    'bt.skip': { ko: '건너뛰기', en: 'Skip' },
    'bt.log.h': { ko: '전투 로그', en: 'Combat Log' },
    'bt.note': {
        ko: '관전은 가능하되 <b>의무가 아니다</b> — 배속은 재생 속도만 바꾼다. 같은 시드면 오프라인 즉시 계산과 결과가 같으므로, 안 봐도 손해가 없다.<br>'
            + '중도 귀환해도 여기까지의 루팅은 <b>전량 보존</b>된다.',
        en: 'Watching is allowed but <b>never required</b> — speed only changes playback. With the same seed the offline instant calculation gives the same result, so skipping loses nothing.<br>'
            + 'Retreating early <b>keeps all loot</b> earned so far.',
    },
    'bt.rTitle': { ko: 'R{n} {kind}', en: 'R{n} {kind}' },
    'bt.actTitle': { ko: '행동 주기 {s}초 — 다 차면 이 유닛이 행동한다', en: 'Action cycle {s}s — acts when the gauge fills' },
    'bt.tab.dmg': { ko: '누적 데미지', en: 'Damage' },
    // 배치 토글 — 버튼은 **바꿀 배치의 이름**을 든다 (2026-09-03 · SCREEN_DESIGN §4-2)
    'bt.layout.toSplit': { ko: '나눠 보기', en: 'Split view' },
    'bt.layout.toWide': { ko: '넓게 보기', en: 'Wide view' },
    'bt.basicAttack': { ko: '기본 공격', en: 'Basic attack' },
    'bt.reflectLabel': { ko: '반사', en: 'Reflect' },
    'bt.dmg.party': { ko: '파티', en: 'Party' },
    'bt.dmg.enemy': { ko: '적', en: 'Enemies' },
    'bt.items.target': { ko: '장착 대상 {name}', en: 'equip target {name}' },
    'log.hit': { ko: '{name} → {target} <b>{dmg}</b> · {skill}', en: '{name} → {target} <b>{dmg}</b> · {skill}' },
    'log.dodge': { ko: '{name} → {target} <b>빗나감</b> · {skill}', en: '{name} → {target} <b>miss</b> · {skill}' },
    'log.roundStart': { ko: '<b>라운드 {n} ({kind})</b> — {list}', en: '<b>Round {n} ({kind})</b> — {list}' },
    'log.heal': { ko: '{name} → {target} <b class="heal-t">+{amt}</b> · {skill}', en: '{name} → {target} <b class="heal-t">+{amt}</b> · {skill}' },
    'log.buff': { ko: '{name} — <b>{skill}</b> 발동', en: '{name} — <b>{skill}</b> up' },
    'log.barrier': { ko: '{name} — <b>{skill}</b> 방벽 {amt}', en: '{name} — <b>{skill}</b> barrier {amt}' },
    'log.buffEnd': { ko: '{name} — {skill} 종료', en: '{name} — {skill} ended' },
    'log.crit': { ko: '{name} → {target} <b class="crit-t">{dmg}</b> 치명타! · {skill}', en: '{name} → {target} <b class="crit-t">{dmg}</b> critical! · {skill}' },
    'log.slain': { ko: '{name} 처치 — 드롭 판정', en: '{name} slain — rolling drops' },
    'log.card': { ko: '<b>{name} 카드</b> 획득 — 도감', en: '<b>{name} card</b> found — codex' },
    'pop.card': { ko: '카드', en: 'Card' },
    'log.downed': { ko: '{name} <b>전투 불능</b>', en: '{name} <b>downed</b>' },   // ~~「이 출정 동안 아웃」~~ 2026-09-08 삭제
    'pop.dodge': { ko: '빗나감', en: 'MISS' },
    'pop.slain': { ko: '처치', en: 'Slain' },
    'pop.downed': { ko: '전투 불능', en: 'Downed' },
};
