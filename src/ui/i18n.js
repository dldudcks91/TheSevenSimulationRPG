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
 * 데이터 문자열 선택 — CSV 또는 mock.js 의 {ko, en} 쌍을 현재 언어로 푼다.
 * 평문 문자열이 오면 그대로 돌려준다 (양 언어 공통 표기: 고유명사·숫자 등).
 */
export const L = v =>
    v == null ? '' : (typeof v === 'string' ? v : (v[current] ?? v.ko ?? ''));

/** 그 키가 사전에 있는가 — 어휘가 데이터에서 오는 자리(마스터리 효과 `app.js`)가 제 문구가 있는지 고를 때 쓴다 */
export const has = key => Object.prototype.hasOwnProperty.call(STRINGS, key);
/** 잠김 문구인가 — 항목에 `lock: true` 면 플래시가 글 앞에 자물쇠를 세운다 (SCREEN_DESIGN §13-1 · ADR-0699) */
export const isLock = key => STRINGS[key]?.lock === true;

/** 미등록 키를 화면 글로 낼 때 — 문구는 `innerHTML` 로 들어가므로 키에 든 태그 글자를 글자로 바꾼다 (ADR-0751) */
const escapeKey = key => String(key).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** UI 문구 조회 — 미등록 키는 키 그대로 노출된다(누락이 화면에서 바로 보이게 · HTML 글자는 이스케이프) */
export function t(key, params) {
    const e = has(key) ? STRINGS[key] : null;
    let s = e ? (e[current] ?? e.ko) : escapeKey(key);
    // 단수 · 복수 — 값이 `{one, other}` 면 수가 1 일 때 `one` [2026-10-17 · 「1 items」] · 수는 `{n}`, 없으면 `{v}` (천 단위 쉼표를 단 문자열도 받는다)
    if (s && typeof s === 'object') s = Number(String(params?.n ?? params?.v ?? '').replaceAll(',', '')) === 1 ? s.one : s.other;
    if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
    return s;
}

/* ═══════════════════ 사전 ═══════════════════ */

const STRINGS = {
    /* ── 셸 ── */
    'app.title': { ko: 'The Seven Simulation RPG — 화면 목업', en: 'The Seven Simulation RPG — Screen Mockup' },
    // 세로 창 막 (SCREEN_DESIGN §2 · ADR-0371)
    'app.turn.title': { ko: '기기를 가로로 돌려 주세요', en: 'Rotate your device to landscape' },
    'app.turn.full': { ko: '전체 화면 + 가로 고정', en: 'Fullscreen + lock landscape' },
    'app.turn.skip': { ko: '이대로 계속하기', en: 'Continue as is' },
    // 손가락 툴팁 버튼 줄 — [세부] = Alt 를 누른 것과 같다 (SCREEN_DESIGN §2 「터치 조작」 · ADR-0374)
    'tip.touch.alt': { ko: '세부', en: 'Details' },
    // [범위] = Shift 를 누른 것과 같다 — 아이템 툴팁의 옵션 줄 범위 (SCREEN_DESIGN §2 「터치 조작」 · ADR-0617)
    'tip.touch.range': { ko: '범위', en: 'Range' },
    /* ── 새 게임 (2026-08-24) ── */
    'ng.h': { ko: '새 게임', en: 'New Game' },
    'ng.title': { ko: '첫 파티', en: 'Your First Party' },
    'ng.sub': {
        ko: '이 {n}명이 그대로 시작 영웅 로스터가 됩니다 — 마음에 들 때까지 다시 굴려도 됩니다',
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
        ko: '첫 파티는 <b>레어 1 + 매직 1 + 일반 1</b>입니다 — 첫 화면부터 영웅 로스터에 <b>층</b>이 보입니다. 유니크 15명은 고정 명단이라 시작에 소모하지 않습니다<br>'
            + '기본 능력치는 축마다 따로 굴리되 <b>합은 등급이 정하는 대역</b> 안입니다 (등급끼리 대역이 <b>겹칠 수 있습니다</b>) — '
            + '세 장의 차이는 양과 <b>모양</b> 둘입니다: 레어 · 일반은 고르게 나고, 매직은 <b>한 축이 크게 튈 수 있습니다</b>. 장비로도 레벨업으로도 오르지 않으니 여기서 나온 값은 <b>평생 갑니다</b><br>'
            + '<b>등급 차이는 끝까지 갑니다</b> — 상한은 전 영웅 공통이지만 레벨업으로 능력치가 안 올라 <b>굴린 모양이 곧 그 영웅의 끝</b>입니다<br>'
            + '메인 죄종은 죄종 마스터리(탭1)와 파견 적성을 정합니다 — 장비 궁합(세트포인트)은 <b>폐기</b> — 파티 전술로 이관<br>'
            + '리롤은 <b>무제한·무료</b>입니다 — 시작 선택을 도박으로 만들지 않습니다<br>'
            + '<b>미확정</b>: 등급 대역·분포 모양·등장 비중(전부 제안값) · 특성 효과(이름표만 굴림) · 직업이 주력 축을 밀어주는 세기 · 죄종·직업 중복 허용 여부',
        en: 'Your first party is <b>1 Rare + 1 Magic + 1 Normal</b> — the roster shows its <b>tiers</b> from the first screen. The 15 Uniques are a fixed roster and are not spent at the start<br>'
            + 'Attributes roll per axis but their <b>total lands in the band its tier sets</b> (tier bands <b>may overlap</b>) — '
            + 'the three differ in amount and in <b>shape</b>: Rare and Normal roll evenly, Magic can <b>spike on one axis</b>. Neither gear nor level-ups raise them, so what you roll here <b>lasts forever</b><br>'
            + '<b>The tier gap lasts to the end</b> — the cap is shared by every hero, but level-ups never raise attributes, so <b>the shape you roll is where that hero ends</b><br>'
            + 'The main sin decides the sin mastery (tab 1) and dispatch aptitude — gear affinity (set points) is <b>dropped</b> — moved to party tactics<br>'
            + 'Rerolling is <b>unlimited and free</b> — the opening choice is not a gamble<br>'
            + '<b>Open</b>: the tier bands, spread shapes and appearance weights (all proposed values) · trait effects (only names are rolled) · how strongly class should bias its key attribute · whether duplicate sins/classes are allowed',
    },

    /* ── 새 게임 · 세이브 (2026-08-25) ── */
    // 메뉴 — 켜면 먼저 선다 · 새 게임(`ng.h`) 아래 (SCREEN_DESIGN §3 · ADR-0641 · app.js:renderMenu) · 뒤로가기(ADR-0643)
    'mn.load': { ko: '불러오기', en: 'Load Game' },
    'ng.back': { ko: '뒤로가기', en: 'Back' },
    'ng.hasSave': { ko: '저장된 게임 있음 — {t}', en: 'A saved game exists — {t}' },
    'ng.saveLine': { ko: '영웅 {h}명 · 클리어 {c} · 골드 {g}', en: '{h} heroes · {c} cleared · {g} gold' },
    'ng.oldSave': {
        ko: '이전 형식(v{v})의 세이브입니다 — 이 버전에서는 이어할 수 없습니다. 새 게임으로 시작합니다',
        en: 'This save is an older format (v{v}) and cannot continue in this version. Start a new game',
    },
    'ng.overwrite': { ko: '세이브를 지우고 이 셋으로 시작', en: 'Delete save & start with these' },
    'ng.overwriteConfirm': { ko: '정말 지울까요? 한 번 더 누르면 지웁니다', en: 'Really? Click again to delete' },
    'ng.startWeapon': { ko: '직업 전속 무기군의 무기 1개를 쥐고 시작', en: 'Starts with one weapon from a class-exclusive weapon group' },

    // 멈춤 창 — 같은 브라우저의 다른 탭이 세이브를 썼다 (SCREEN_DESIGN §2-1)
    'cl.frozen.h': { ko: '다른 탭에서 게임 실행 중', en: 'The game is open in another tab' },
    'cl.frozen.reload': { ko: '이 탭에서 이어하기', en: 'Continue in this tab' },

    /* ── 프롤로그 (2026-09-03 · SCREEN_DESIGN §3-1) ──
       원문은 docs/game_design/story/prologue.md(정본 2026-09-14) — 화면이 문장을 새로 쓰지 않는다. `en` 은 그 직역이다 (2026-10-16 · ADR-0646).
       줄바꿈은 이스케이프로 들어간다 — **빈 줄(`\n\n`)이 문단을 가르고**(app.js:renderPrologue 가 `<p>` 로 접는다) 한 줄 바꿈은 CSS(pre-line)가 편다 */
    'pro.h': { ko: '프롤로그', en: 'Prologue' },
    /* 맨 윗줄 — 프롤로그 씬(1~3)이 든다. Chapter 1 씬(4~5)은 그 자리를 `pro.end` 가 가져간다 (SCREEN_DESIGN §3-1) */
    'pro.title': { ko: 'Prologue. 그날 밤', en: 'Prologue. That Night' },
    'pro.step': { ko: '{n} / {m}', en: '{n} / {m}' },
    'pro.back': { ko: '뒤로', en: 'Back' },
    'pro.next': { ko: '다음', en: 'Next' },
    'pro.skip': { ko: '건너뛰기', en: 'Skip' },
    'pro.begin': { ko: '시작', en: 'Begin' },

    'pro.s1.h': { ko: '왕좌', en: 'The Throne' },
    'pro.s1.b': {
        ko: '지옥에는 왕이 있었다.\n\n'
            + '바알. 대악마.\n'
            + '이 땅의 모든 것은 그의 것이었고,\n'
            + '7개의 감정을 나누어 부하에게 깃들게 했다.\n\n'
            + '분노, 시기, 탐욕, 나태, 폭식, 색욕, 오만.\n\n'
            + '그것은 지옥을 유지하는 균형이었다.',
        en: 'Hell had a king.\n\n'
            + 'Baal. Archdemon.\n'
            + 'Everything in this land was his,\n'
            + 'and he set seven emotions to dwell in his servants.\n\n'
            + 'Wrath, Envy, Greed, Sloth, Gluttony, Lust, Pride.\n\n'
            + 'That was the balance that held Hell together.',
    },

    'pro.s2.h': { ko: '배신의 밤', en: 'Night of Betrayal' },
    'pro.s2.b': {
        ko: '그 밤, 7개의 칼이 등에 꽂혔다.\n\n'
            + '뒤를 돌아봤다.\n'
            + '전부 아는 얼굴이었다.\n\n'
            + '싸웠다.\n'
            + '하지만 힘의 반이 이미 빠져나간 뒤였다.\n'
            + '묶여있던 것이 풀려있었다. 누군가가 열쇠를 넘겼다.\n\n'
            + '밀려난다. 발밑이 무너진다.',
        en: 'That night, seven blades sank into his back.\n\n'
            + 'He looked back.\n'
            + 'Every face was one he knew.\n\n'
            + 'He fought.\n'
            + 'But half his power had already drained away.\n'
            + 'What had been bound was undone. Someone had handed over the key.\n\n'
            + 'Pushed back. The ground gives way beneath him.',
    },

    'pro.s3.h': { ko: '추락', en: 'The Fall' },
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
        en: 'He fell.\n\n'
            + 'The light of Hell grows distant.\n'
            + 'His strength drains away.\n'
            + 'The throne, his servants’ faces, the order of that night — all of it blurs.\n\n'
            + 'Who raised a blade.\n'
            + 'Who turned their back first.\n'
            + 'Whether there were seven, or not.\n\n'
            + 'One thing is certain.\n\n'
            + 'He was betrayed.\n\n'
            + 'And then — the feeling of something carved into his body.\n'
            + 'It burns. As if his flesh were on fire.\n'
            + 'A brand. The curse this fall left behind.',
    },

    'pro.s4.h': { ko: '마을', en: 'The Village' },
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
        en: 'When he opened his eyes, someone was giving him water.\n'
            + 'An old human.\n\n'
            + 'His body is heavy. He is hungry. His breath is short.\n'
            + 'All of it is new. All of it is unpleasant.\n\n'
            + 'Days passed.\n'
            + 'The humans shared their food. Though they had too little themselves.\n'
            + 'They bound his wounds. For one whose name they did not know.\n\n'
            + 'He cannot understand it.\n'
            + 'Why do these things try to keep me alive?\n\n'
            + 'In Hell, you step over those who fall.\n'
            + 'The weak are cast aside. That is only natural.\n\n'
            + 'These things do not do what is natural.\n\n'
            + 'He remembers his name. Baal.\n'
            + 'That he was a king. That it was taken from him.\n'
            + 'But that night is not clear.\n'
            + 'Seven blades. Familiar faces. The ground giving way.\n'
            + 'What lies between — is tangled.',
    },

    'pro.s5.h': { ko: '불길', en: 'Flames' },
    'pro.s5.b': {
        ko: '그 날 밤, 지평선이 붉어졌다.\n\n'
            + '불길. 군세. 분노의 기운.\n'
            + '이 기운을 안다. 잊을 수 없다.\n\n'
            + '사탄.\n'
            + '바알이 지옥에서 추방한 놈.\n'
            + '왕이 바닥에 있다는 걸 감지한 것이다.\n\n'
            + '마을이 불탄다. 인간들이 비명을 지른다.\n\n'
            + '바알은 일어섰다.\n'
            + '더 이상 직접 싸울 힘은 없다.\n'
            + '하지만 지휘하는 법은 잊지 않았다.\n\n'
            + '선술집에서 만난 용병들에게 명했다.',
        en: 'That night, the horizon turned red.\n\n'
            + 'Flames. An army. The air of wrath.\n'
            + 'He knows this air. He cannot forget it.\n\n'
            + 'Satan.\n'
            + 'The one Baal had banished from Hell.\n'
            + 'He had sensed that the king lay in the dirt.\n\n'
            + 'The village burns. The humans scream.\n\n'
            + 'Baal rose.\n'
            + 'He no longer had the strength to fight himself.\n'
            + 'But he had not forgotten how to command.\n\n'
            + 'He gave his order to the mercenaries he had met at the tavern.',
    },
    /* 마지막 씬에만 선다 — 본문과 층이 다르다 (SCREEN_DESIGN §3-1) */
    'pro.s5.q': { ko: '"저놈들을 쓸어라. 내가 뒤에서 이끈다."', en: '"Sweep them away. I will lead from behind."' },
    'pro.end': { ko: 'Chapter 1. 분노 / 불타는 전장', en: 'Chapter 1. Wrath / Burning Battlefield' },

    /* ── 원정 (실동작) ── */
    'exp.noParty': { ko: '영웅 편성', en: 'Assign heroes', lock: true },
    'exp.departAdvancing': { ko: '편성에 전직 중인 영웅 있음', en: 'A hero in this party is advancing' },
    'exp.departExploring': { ko: '편성에 탐험 나간 영웅 있음', en: 'A hero in this party is out exploring' },
    'exp.departRespawn': { ko: '보스가 아직 돌아오지 않음', en: 'The boss has not returned yet' },   // 챕터보스 재등장 대기 (R240 · ADR-0590)
    // 출정 확인 창의 문장 — 문구는 사용자 지시 그대로다 (SCREEN_DESIGN §4-1 · ADR-0467)
    'exp.departBusy': { ko: '파티 내에 다른 행동을 실행중인 영웅이 있습니다. 그래도 출격할까요?', en: 'A hero in this party is busy with another task. Deploy anyway?' },
    'exp.departCut': { ko: '이 파티는 지금 원정 중입니다. 진행 중인 원정을 접고 새로 출격할까요?', en: 'This party is on an expedition. End the current run and deploy anew?' },
    'exp.locked': { ko: '이전 스테이지 클리어', en: 'Clear the previous stage', lock: true },
    // 잠긴 장의 한 줄 — 그 장을 여는 앞 장 보스 (SCREEN_DESIGN §4-1 · §8-4 · ADR-0719 · R319). {ch} = 보스 칸의 장(`game.chapterGate`)
    'exp.chNeed': { ko: '{ch}장 보스 클리어', en: 'Clear the Ch{ch} boss', lock: true },
    // 난이도 탭 바로 옆 — 다음에 열릴 단의 조건 (SCREEN_DESIGN §4-1 · ADR-0586 · ADR-0596). {d} = 앞 단 이름 · {ch} = `balance.csv:difficulty_unlock_chapter`
    'exp.diff.need': { ko: '{d} {ch}장 보스 클리어', en: 'Clear the {d} Ch{ch} boss', lock: true },
    /* 칸 한 줄 — 출정 창 머리의 잔글씨 [개정 2026-10-17 · SCREEN_DESIGN §4-1 · ADR-0649 — 소요 · 원소를 걷어 레벨만]. {lv} = 고른 난이도의 몬스터 레벨 */
    'exp.stageMeta': { ko: '레벨 {lv}', en: 'Level {lv}' },
    /* 장소 줄 잔글씨 맨 앞의 레벨 — `Lv23` [2026-10-21 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0710 · ADR-0711]. {lv} = 칸 I 의 고른 난이도 몬스터 레벨(숫자 하나 — ~~범위~~) */
    'exp.placeLv': { ko: 'Lv{lv}', en: 'Lv{lv}' },
    /* 장소 줄 잔글씨의 챕터보스 이름 — 「분노의 사탄」 [2026-10-17 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0649]. {sin} = 죄종 이름 · {name} = 몬스터 이름 */
    'exp.sinBoss': { ko: '{sin}의 {name}', en: '{name} of {sin}' },
    /* 출발 칸 줄의 라벨 — 출정 창 출정 방식 칸 맨 위 [2026-09-29 · SCREEN_DESIGN §4-1 · ADR-0437 — 위험도 줄(ADR-0104)을 걷은 자리] */
    'exp.cell.h': { ko: '출발 칸', en: 'Starting stage' },
    // 원정 중 교체 [2026-09-21 · R130 · SCREEN_DESIGN §4 · ADR-0272] — 보스전 중이면 다음 런부터 · 교체로 도는 원정의 전술이 꺼졌다(효과 줄을 싣는다)
    'exp.lock.boss': { ko: '보스전 중 — 바꾼 것은 다음 런부터 적용', en: 'Boss fight — changes apply next run' },
    'exp.tactic.off': { ko: '전술 꺼짐 — {eff}', en: 'Tactic off — {eff}' },
    // 반복 원정 [개정 2026-09-29 · SCREEN_DESIGN §4-1 · ADR-0432 — PLAN_stage_segments D8] — 켬 = 장소 안 순환 · 끔 = 이길 때마다 다음 칸. 어느 쪽이든 원정은 멈추지 않는다.
    //   버튼 글자는 기획 용어(반복 켬 · 끔)라 그대로다 — 뜻은 툴팁(`exp.repeat.tip`)과 도움말(`exp.repeat.sub`)이 든다
    'exp.repeat': { ko: '반복 원정', en: 'Auto-repeat' },
    'exp.repeat.tip': {
        ko: '켜면 이 장소의 칸을 돌아가며 싸웁니다 · 끄면 이길 때마다 다음 칸으로 나아갑니다',
        en: "On: loop through this area's stages · Off: move on to the next stage after each win",
    },
    'exp.repeat.sub': {
        ko: '원정은 <b>멈추지 않습니다</b> — 런이 끝나면 곧 다음 런이 나가고, 멈추는 길은 <b>철수</b>와 <b>게임 끄기</b> 둘뿐입니다 · <b>게임이 켜져 있는 동안만</b> 돕니다<br>'
            + '이기면 다음 칸 · 지면(전원 전투불능 · 제한시간 초과) 같은 칸을 다시 돕니다 · <b>반복을 켜면</b> 그 장소의 칸 I → II → III → I 을 돌고, <b>끄면</b> 순서의 다음 칸으로 나아갑니다(다음 칸이 잠겼으면 같은 칸 · 다음 난이도를 여는 보스를 이기면 다음 난이도의 1-1) · 칸마다 새 런이라 전원 회복한 채 나갑니다',
        en: 'Expeditions <b>never stop on their own</b> — when a run ends the next one heads out shortly; only <b>Retreat</b> or <b>closing the game</b> stops them · they run <b>only while the game is open</b><br>'
            + 'A win moves on to the next stage · a loss (whole party downed · timed out) runs the same stage again · <b>with repeat on</b> the party loops through the area\'s stages I → II → III → I; <b>with it off</b> it moves on to the next stage in order (the same stage again if the next is locked · beating the boss that unlocks the next difficulty moves on to that difficulty\'s 1-1) · every stage is a new run, so everyone heads out recovered',
    },
    'exp.notice.runClosed.h': { ko: '부재 중', en: 'While you were away' },
    'exp.notice.runClosed.body': {
        ko: '원정은 게임이 켜져 있을 때만 돕니다 — {stage} 원정이 멈췄습니다. 진행 중이던 라운드는 사라졌고, 이긴 라운드까지의 보상은 마지막 리포트에 있습니다',
        en: 'Expeditions only run while the game is open — the {stage} expedition stopped. The round in progress was lost; rewards from the rounds you won are in the last report',
    },
    'exp.notice.report': { ko: '리포트 보기', en: 'View report' },
    'exp.notice.dismiss': { ko: '확인', en: 'OK' },

    /* ── 리포트 (실동작) ── */
    'rep.defeat': { ko: '패배', en: 'Defeat' },
    'rep.retreat': { ko: '철수', en: 'Retreat' },
    /* ~~'rep.healed'(귀환 — 전원 회복)~~ 은 2026-09-08 삭제 — 전투불능은 **기록**이라 뒤에 붙일 말이 없다 (SCREEN_DESIGN §4-3) */
    'rep.reason.wipe': { ko: '전원 전투불능', en: 'Whole party downed' },
    'rep.reason.timeout': { ko: '제한시간 초과', en: 'Timed out' },
    'rep.reason.retreat': { ko: '철수', en: 'Retreated' },
    'rep.reason.closed': { ko: '게임이 꺼져 끊김', en: 'Cut off — the game was closed' },

    'rep.roundsCleared': { ko: '{n} / {total}', en: '{n} / {total}' },
    'rep.discarded': { ko: '가방이 가득 차 {n}개 분해', en: '{n} salvaged — bag was full' },   // 넘친 드롭은 가루가 된다 (ADR-0625 · 2026-10-14)
    /* 도감 카드 줄 셋(rep.cards · rep.cardsNone · rep.cardLevelUp)은 2026-09-21 삭제 — 도감 카드를 걷었다 (monster_design §8 · SCREEN_DESIGN §4-3) */
    /* 빗나감 — 레벨 · 명중 부족의 신호 (battle_design §9-8 · 마법 무기는 안 빗나간다 — R219). 파티 기준 {맞지 않은 타격}/{총 타격} */
    'rep.miss': { ko: '빗나감', en: 'Misses' },
    'rep.missN': { ko: '{m} / {n} ({p}%)', en: '{m} / {n} ({p}%)' },

    /* ── 캐릭터 (실동작) ── */
    'ch.equip.hint': { ko: '아이템 클릭 = 착용 · 우클릭 = [착용] · [잠금] 버튼 · 착용 칸 클릭 = 해제 · Ctrl+클릭이나 끌어 놓기 = 창고 ↔ 인벤토리',
        en: 'Click an item = equip · right-click = [Equip] · [Lock] buttons · click a worn slot = unequip · Ctrl+click or drag = move between stash and inventory' },
    // 보관 칸 우클릭 메뉴 — 커서 자리에 버튼 둘 · 손가락은 길게 누른 툴팁 버튼 줄 (SCREEN_DESIGN §6 「우클릭 메뉴」 · ADR-0451)
    'ch.menu.equip': { ko: '착용', en: 'Equip' },
    'ch.menu.lock': { ko: '잠금', en: 'Lock' },
    'ch.menu.unlock': { ko: '잠금 해제', en: 'Unlock' },
    'ch.menu.open': { ko: '사용', en: 'Use' },   // 상자 칸에만 서는 버튼 — 상자를 여는 유일한 길(칸 클릭은 안 연다 · ADR-0733)
    // 첫 클리어 상자 칸 · 툴팁 · 까는 플래시 (SCREEN_DESIGN §6 · ADR-0731 · ADR-0742 · R328 · R333)
    'box.weapon': { ko: '무기 상자', en: 'Weapon Chest' },
    'box.armor': { ko: '방어구 상자', en: 'Armor Chest' },
    'box.part.weapon': { ko: '무기', en: 'Weapon' },
    'box.part.armor': { ko: '방어구', en: 'Armor' },
    // 상자 등급 — 이름 앞 낱말 · 툴팁의 희귀도 줄 (base_expedition_design §1-6 「등급」 · ADR-0776 · R349)
    'box.named': { ko: '{tier} {box}', en: '{tier} {box}' },
    'box.tier.low': { ko: '하급', en: 'Low-Grade' },
    'box.tier.mid': { ko: '중급', en: 'Mid-Grade' },
    'box.tier.high': { ko: '고급', en: 'High-Grade' },
    'box.rarity': { ko: '{lo} ~ {hi}', en: '{lo} – {hi}' },
    'box.for': { ko: '{hero}에게 맞는 Lv {lv} {part}', en: '{part} for {hero} · Lv {lv}' },
    'box.opened': { ko: '상자 개봉 — {name}', en: 'Chest opened — {name}' },
    // 우편함 — 상단바 편지봉투 · 창 (SCREEN_DESIGN §2 「상단바」 · ADR-0732 · R328)
    'mail.h': { ko: '우편함', en: 'Mailbox' },
    'mail.from': { ko: '{stage} · {diff} 첫 클리어', en: '{stage} · {diff} First Clear' },   // 우편 카드의 둘째 줄 — 어디서 받았나 (ADR-0748)
    'mail.count': { ko: '우편 {n}통', en: 'Mail {n}' },
    'mail.claim': { ko: '받기', en: 'Claim' },
    'mail.claimAll': { ko: '모두 받기', en: 'Claim All' },
    'mail.claimed': { ko: '우편 {n}통 수령', en: 'Claimed {n} mail' },
    // 도움말이 받는 힌트 — 인게임 패널에는 규칙 문구를 안 둔다 (SCREEN_DESIGN §12)
    'ch.salvageHint': { ko: '장비를 우클릭해 [잠금]을 누르면 잠기거나 풀립니다. 잠근 장비는 분해되지 않습니다. [분해]를 누르면 분해함이 뜹니다. 장비를 눌러 함에 올리거나 등급 · 레벨 · 베이스 열에서 고르면 맞는 장비가 바로 함에 오르고, [분해하기]로 가루를 얻으면 필터가 풀립니다. 열을 여럿 고르면 모든 열에 맞는 것만 오르니, 베이스 옵션이 높은 장비는 베이스 열로 남길 수 있습니다. [자동 분해]는 부대마다 따로 정합니다. 등급 × 부위 칸마다 보존 · 베이스 · 분해를 고르고, 레벨 조건을 켜면 부대에서 가장 낮은 영웅 레벨보다 많이 낮은 장비를 분해합니다. 레벨 조건과 그 칸을 모두 만족해야 보존하고, [베이스] 칸은 베이스 옵션이 그 부위 문턱 이상인 것만 보존합니다. 유니크 · 크래프트는 언제나 보존합니다. 새로 들어오는 장비에만 걸리니 이미 가진 것은 [지금 인벤토리에 적용]을 눌러야 분해됩니다. 지금 규칙을 프리셋에 저장해 두면 다른 부대에서 불러올 수 있습니다',
        en: 'Right-click gear and press [Lock] to lock or unlock it. Locked gear is never salvaged. Press [Salvage] to open the Salvage Box: click gear to put it in, or pick from the rarity, level and base columns and the matching gear goes in at once — [Salvage now] turns it to dust and clears the picks. With several columns picked, only gear matching every column goes in, so you can keep high base-option gear out with the base column. [Auto salvage] is set per party. For each rarity × slot cell choose Keep, Base or Salvage, and turn on the level condition to salvage gear far below the party’s lowest hero level. Gear is kept only when it meets both the level condition and its cell; a Base cell keeps only gear whose base option is at or above that slot’s threshold. Uniques and crafted gear are always kept. Only new gear is checked — press [Apply to inventory now] to salvage what you already hold. Save the rules to a preset to load them on another party' },
    // 보관 두 칸의 이름 — 왼쪽 창고 / 오른쪽 인벤토리 (2026-09-11 · item_design §1 · SCREEN_DESIGN §6)
    'ch.bag.stash': { ko: '창고', en: 'Stash' },
    'ch.bag.inv': { ko: '인벤토리', en: 'Inventory' },
    'ch.bag.equip': { ko: '장비', en: 'Gear' },
    'ch.bag.mat': { ko: '재료', en: 'Materials' },
    'ch.bag.book': { ko: '스킬북', en: 'Skill Books' },   // 창고 셋째 탭 — 가진 책 (2026-10-14 사용자 지시 · SCREEN_DESIGN §6 · ADR-0616)
    // 정렬 — 칸마다 제 [정렬] · 누르면 그 오른쪽으로 기준 셋이 나온다 (ADR-0242 · ADR-0247).
    //   영어는 「By」를 뺀다 — [Sort] 바로 옆에 서서 뜻이 이미 서고, 펼친 채로 도구 줄 한 줄에 들어가야 한다
    'ch.sort.start': { ko: '정렬', en: 'Sort' },
    'ch.sort.rarity': { ko: '등급순', en: 'Rarity' },
    'ch.sort.ilvl': { ko: '레벨순', en: 'Level' },
    'ch.sort.slot': { ko: '부위순', en: 'Slot' },
    // 창고 스킬북 탭의 기준 셋 (2026-10-14 사용자 지시 · SCREEN_DESIGN §6 · ADR-0620)
    'ch.sort.count': { ko: '개수순', en: 'Count' },
    'ch.sort.class': { ko: '직업순', en: 'Class' },
    'ch.sort.tier': { ko: '티어순', en: 'Tier' },
    'ch.sortHint': { ko: '[정렬]은 누른 칸을 한 번 줄 세웁니다 — 등급순 · 레벨순 · 부위순 중 하나를 고르고, 높은 것이 앞에 섭니다. 그 뒤 들어오는 장비는 끝에 붙습니다',
        en: '[Sort] lines up that panel once — pick by rarity, by level or by slot, highest first. Gear that arrives afterwards goes to the end' },
    // 분해함 — [분해]로 띄우고 [취소] · Esc 로 닫는다 · 필터 세 열(누르면 바로 함에 오른다) · 가루 미리보기 (ADR-0184 · ADR-0673 · ADR-0695)
    'ch.sel.start': { ko: '분해', en: 'Salvage' },
    'ch.sel.go': { ko: '분해하기', en: 'Salvage now' },
    'ch.sel.cancel': { ko: '취소', en: 'Cancel' },
    // 분해함 필터의 열 머리 (ADR-0673)
    'ch.sel.byRarity': { ko: '등급', en: 'Rarity' },
    'ch.sel.byLevel': { ko: '레벨', en: 'Level' },
    'ch.sel.byFixed': { ko: '베이스', en: 'Base' },
    'ch.sel.title': { ko: '분해함', en: 'Salvage Box' },
    // ~~'ch.sel.lift'~~ 는 2026-10-21 삭제 — 필터를 누르면 바로 함에 오른다 (ADR-0695)
    'ch.sel.dust': { ko: '가루 +{d}', en: 'Dust +{d}' },
    'ch.sel.full': { ko: '분해함 가득 참', en: 'The Salvage Box is full' },
    'ch.sel.lockedNo': { ko: '잠긴 장비는 분해함에 올릴 수 없음', en: 'Locked gear cannot go in the Salvage Box' },
    // 자동 분해 창 — 부대 하나의 규칙 · 프리셋 · 레벨 조건 · 등급 × 부위 격자 · 미리보기 · 최근 분해 (item_design §6-5 · SCREEN_DESIGN §6 · ADR-0717 — ~~선 둘~~ ADR-0203)
    'ch.auto.btn': { ko: '자동 분해', en: 'Auto salvage' },
    'ch.auto.h': { ko: '자동 분해', en: 'Auto Salvage' },
    'ch.auto.hNo': { ko: '자동 분해 · {p}', en: 'Auto Salvage · {p}' },
    'ch.auto.preset': { ko: '프리셋', en: 'Preset' },
    'ch.auto.load': { ko: '불러오기', en: 'Load' },
    'ch.auto.save': { ko: '저장', en: 'Save' },
    'ch.auto.loaded': { ko: '프리셋 {n}에서 불러왔습니다', en: 'Loaded preset {n}' },
    'ch.auto.saved': { ko: '프리셋 {n}에 저장했습니다', en: 'Saved to preset {n}' },
    'ch.auto.lv': { ko: '레벨', en: 'Level' },
    'ch.auto.lvOff': { ko: '안 봄', en: 'Off' },
    'ch.auto.lvGap': { ko: '부대 최저 Lv −{g} 이상', en: 'Party min Lv −{g}+' },
    'ch.auto.lvGap0': { ko: '부대 최저 Lv 이상', en: 'Party min Lv+' },
    'ch.auto.th': { ko: '문턱', en: 'Min' },
    'ch.auto.m.keep': { ko: '보존', en: 'Keep' },
    'ch.auto.m.base': { ko: '베이스', en: 'Base' },
    'ch.auto.m.salvage': { ko: '분해', en: 'Salvage' },
    'ch.auto.preview': { ko: '지금 인벤토리 기준 분해 {n}개 · 가루 +{d}', en: 'Inventory now: salvage {n} · dust +{d}' },
    'ch.auto.log': { ko: '최근 분해', en: 'Recently salvaged' },
    'ch.auto.logNone': { ko: '없음', en: 'None' },
    'ch.auto.apply': { ko: '지금 인벤토리에 적용', en: 'Apply to inventory now' },
    'ch.auto.confirm': { ko: '인벤토리의 장비 {n}개를 분해합니다', en: { one: '{n} item in the inventory will be salvaged', other: '{n} items in the inventory will be salvaged' } },
    'ch.auto.ok': { ko: '확인', en: 'Confirm' },
    // 출정 창 「들고 가는 것」의 자동 분해 칸 — 그 편성의 자동 분해 창을 연다 (SCREEN_DESIGN §4-1 · ADR-0717)
    'ex.salvEdit': { ko: '바꾸기', en: 'Edit' },
    // ~~'ch.err.class'~~ 은 2026-10-06 삭제 — 09-10 장착 개방 뒤로 내는 곳이 없다. 거절 사유는 요구 레벨 하나 (R215 · ADR-0525)
    'ch.err.level': { ko: '레벨 부족', en: 'Level too low to equip' },
    'ch.err.bagFull': { ko: '인벤토리 가득 참', en: 'Inventory is full' },
    'ch.err.stashFull': { ko: '창고 가득 참', en: 'Stash is full' },
    'ch.err.missing': { ko: '아이템을 찾을 수 없음', en: 'Item not found' },
    'ch.err.sealed': { ko: '열지 않은 상자', en: 'Open the chest first' },   // 첫 클리어 상자 칸 — 장착 · 분해 · 강화 거절 (R328)
    // 결과 플래시 — 문장을 조각내 잇지 않는다. 건너뛴 것이 있으면 키째 다른 줄을 쓴다
    'ch.sel.salvaged': { ko: '{n}개 분해 → 가루 +{d}', en: 'Salvaged {n} → dust +{d}' },
    // ~~'ch.sel.salvagedSkip'~~ · ~~'ch.sel.allLocked'~~ 는 2026-10-20 삭제 — 잠긴 것은 분해함에 안 올라가 건너뛸 일이 없다 (ADR-0673)
    // 툴팁이 걷은 강화 규칙 문구가 앉는 자리다 (SCREEN_DESIGN §6 개정 2026-09-08 — 조건·규칙 주석은 도움말의 몫).
    // ⚠ 「강화 모드」는 09-03 에 폐기됐는데 문구만 남아 있었다 — 없는 토글을 찾게 만든다. 자리는 대장간(§8-2).
    // 2026-09-15 — 옵션 계단이 퇴역해(R95) 「{n}강마다 옵션」을 걷고 목걸이 · 반지의 강화 없음을 넣었다 (ADR-0125)
    'ch.upgradeHint': { ko: '강화는 대장간에서 합니다 — 골드로 한 단계씩 베이스 능력치를 올립니다. 목걸이 · 반지는 강화하지 않습니다',
        en: 'Upgrading happens at the Blacksmith — one step at a time for gold, raising the base stat. Amulets and rings cannot be upgraded' },
    'ch.err.maxUp': { ko: '더 이상 강화할 수 없음', en: 'Already fully upgraded' },
    'ch.err.noBase': { ko: '베이스 능력치가 없어 강화할 수 없음', en: 'Nothing to upgrade — this item has no base stat' },
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
    'ch.err.equipped': { ko: '장비 모두 해제', en: 'Unequip all gear', lock: true },
    'ch.err.advancing': { ko: '전직 중인 영웅', en: 'That hero is advancing' },
    'ch.err.exploring': { ko: '탐험 나간 영웅', en: 'That hero is out exploring' },
    'ch.err.running': { ko: '원정 철수', en: 'Retreat from the expedition', lock: true },   // 원정은 저절로 안 끝난다 — 철수가 풀어 준다 (2026-09-29 · ADR-0433)
    'ch.err.last': { ko: '마지막 영웅은 해고할 수 없음', en: "Can't dismiss your last hero" },
    /* ~~'ch.err.downed'~~ 은 2026-09-28 삭제 — 쓰러진 영웅도 장비를 바꾼다 (R176 · ADR-0400) */
    /* 확인 문구도 **사용자 지시 그대로** [개정 2026-09-09] — 옛 판(「{name} — 해고하면 되돌릴 수 없다」)의 `{name}` 은 걷었다.
       누구를 해고하는지는 창을 연 카드가 이미 말하고, 되돌릴 수 없다는 것은 **[취소] 버튼이 눈에 보이는 것**이 든다 */
    'ch.dismiss.confirm': { ko: '영웅을 해고합니다.', en: 'This hero will be dismissed.' },
    'ch.dismissed': { ko: '{name} 해고', en: '{name} dismissed' },
    'ch.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'ch.upgraded': { ko: '강화 +{n} · {g}G', en: 'Upgraded to +{n} · {g}G' },
    'ch.noTrees': { ko: '마스터리는 실동작 · 전직 층은 미구현', en: 'Mastery is live; the advancement layer is not built yet' },

    /* ── 선술집 (실동작) ── */
    'tv.hire': { ko: '고용 ({g} 골드)', en: 'Hire ({g} gold)' },
    // 보관 — 후보를 수색 칸에 넣는다(무료 · `game.tavernKeep` · ADR-0897)
    'tv.keep': { ko: '보관', en: 'Keep' },
    'tv.kept': { ko: '{name} 보관 — 수색 칸', en: 'Kept {name} in Search' },
    'tv.empty.kept': { ko: '보관함 — 다음 교체 때 채워짐', en: 'Kept — refills on next refresh' },
    'tv.err.joinFull': { ko: '수색 칸 가득 참 ({n})', en: 'Search full ({n})' },
    'tv.reroll': { ko: '교체하기 ({g} 골드)', en: 'Refresh ({g} gold)' },
    'tv.reroll.wait': { ko: '무료까지 {t}', en: 'Free in {t}' },
    'tv.reroll.free': { ko: '후보 교체 (무료)', en: 'New candidates (free)' },
    'tv.empty': { ko: '고용함 — 다음 교체 때 채워짐', en: 'Hired — refills on next refresh' },
    'tv.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'tv.err.roster': { ko: '영웅 로스터 가득 참 ({cap})', en: 'Hero roster full ({cap})' },
    'tv.hired': { ko: '{name} 고용', en: 'Hired {name}' },
    /* 수색 [2026-10-19 · SCREEN_DESIGN §8-1 · ADR-0671 — ~~수색 · 영웅 보내기 · 가입 희망~~ 대체] — 명단 셋째 칸(안내 · 고른 얼굴의 카드) · 오른쪽 열 2×2 */
    'tv.visit.h': { ko: '수색', en: 'Search' },
    'tv.visit.spec': { ko: '{h}시간마다 한 명 · {n}칸', en: 'One every {h}h · {n} slots' },
    'tv.visit.odds': { ko: '레어 {r}%', en: 'Rare {r}%' },
    'tv.visit.next': { ko: '다음 도착까지 {t}', en: 'Next arrival in {t}' },
    'tv.visit.full': { ko: '칸이 다 참 — 돌려보내야 새로 옴', en: 'Slots full — send someone away' },
    'tv.visit.closed': { ko: '연구소에서 열림', en: 'Opened at the Laboratory' },
    'tv.visit.drop': { ko: '돌려보내기', en: 'Send away' },
    'tv.visit.dropped': { ko: '{name} 을(를) 돌려보냄', en: 'Sent {name} away' },
    'tv.visit.gone': { ko: '이미 칸에 없음', en: 'No longer here' },
    // 칸 띠 — 어떻게 왔나(출처 · `state.js:JOIN_SRC`). 찾아오는 방식이 늘면 한 줄씩 는다
    'tv.visit.src.visit': { ko: '찾아옴', en: 'Visitor' },
    'tv.visit.src.caravan': { ko: '마차', en: 'Caravan' },
    'tv.visit.src.tavern': { ko: '보관', en: 'Kept' },
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
    /* 결과 띠의 세기 [2026-09-29 · SCREEN_DESIGN §4-2 · ADR-0430] — 언제나 다음 런을 센다. {name} = **다음 런의 칸**(`Ch1-1 이름` 태그).
       갈 칸이 바뀌면 「다음 칸」 · 같은 칸이면 「다시」. ~~bt.retry · bt.nextStage · bt.nextRun~~ 은 같은 날 삭제 — 두 버튼을 걷었다 */
    'bt.nextCell': { ko: '{s}초 뒤 다음 칸 — {name}', en: 'Next stage in {s}s — {name}' },
    'bt.again': { ko: '{s}초 뒤 다시 — {name}', en: 'Again in {s}s — {name}' },
    'bt.respawnWait': { ko: '보스 재등장까지 {s}초 — {name}', en: 'Boss returns in {s}s — {name}' },   // 챕터보스 재등장 대기 (R240 · ADR-0590)
    // 신단 (SCREEN_DESIGN §4-2 「신단」 · ADR-0445) — 효과 줄은 `shrine.csv` 의 능력치마다 한 키 · {v} = %
    'bt.shrineGot': { ko: '신단 획득', en: 'Shrine blessing' },
    'bt.shrineKeep': { ko: '신단 유지', en: 'Shrine kept' },
    // 결과 띠의 [건너뛰기] — 세기를 걷고 다음 런을 곧바로 보낸다 (SCREEN_DESIGN §4-2 · ADR-0453)
    'bt.skipWait': { ko: '건너뛰기', en: 'Skip' },
    'bt.skipRetry': { ko: '재도전', en: 'Retry' },   // 같은 버튼의 진 런 글자 — 졌으면 다음 런이 같은 칸이다 (ADR-0698)
    'rep.shrine': { ko: '신단', en: 'Shrine' },
    // 처음 깬 런의 요약 칸 — 상자가 어디로 갔나 (SCREEN_DESIGN §4-3 · ADR-0731)
    'rep.clearBox': { ko: '클리어 보상', en: 'Clear Reward' },
    'rep.clearBoxBag': { ko: '{box} · 인벤토리', en: '{box} · Inventory' },
    'rep.clearBoxMail': { ko: '{box} · 우편함', en: '{box} · Mailbox' },
    'shrine.fx.atk_pct': { ko: '데미지 +{v}%', en: 'Damage +{v}%' },
    'shrine.fx.cooldown_reduction': { ko: '쿨타임 감소 {v}%', en: 'Cooldown Reduction {v}%' },
    'shrine.fx.life_steal': { ko: '흡혈 {v}%', en: 'Life Steal {v}%' },
    'shrine.fx.res_all': { ko: '모든 원소 저항 +{v}%', en: 'All Resistances +{v}%' },
    'shrine.fx.hp_pct': { ko: '최대 HP +{v}%', en: 'Max HP +{v}%' },
    'shrine.fx.xp_gain_pct': { ko: '경험치 +{v}%', en: 'Experience +{v}%' },
    'shrine.fx.item_find': { ko: '드랍률 +{v}%', en: 'Item Find +{v}%' },
    'shrine.fx.gold_find': { ko: '골드 획득 +{v}%', en: 'Gold Find +{v}%' },
    'log.end.win': { ko: '스테이지 클리어 — 리포트로 정리', en: 'Stage clear — see the report' },
    'log.end.lose': { ko: '원정 실패 — 귀환', en: 'Expedition failed — returning' },

    /* [개정 2026-10-18 사용자 지시 · ADR-0660] 탐험은 원정 바로 아래 · 자원은 마을 맨 아래 — 파견 묶음(`nav.grp.dispatch`)은 걷혔다.
       탭 13 [개정 2026-10-09 사용자 지시 · ADR-0567] — 훈련장이 빠졌다 · 순서와 묶음은 `app.js:NAV_GROUPS` 가 든다 (SCREEN_DESIGN §1).
       [개정 2026-09-24 사용자 지시 · ADR-0348] 탭 12 — 원정 · 편성 · 캐릭터 · 건설 · 선술집 · 상점 · 대장간 · 훈련장 · 자원 · 탐험 · 도감 · 도움말.
       [개정 2026-09-21 사용자 지시 · ADR-0253] 탭 11 — 원정 · 편성 · 캐릭터 · 건설 · 대장간 · 선술집 · 상점 · 자원 · 탐험 · 도감 · 도움말.
       연구가 「건설」이 되어 캐릭터 바로 뒤로 왔다 — 키(`nav.research`)는 옛 이름 그대로다.
       [개정 2026-09-08 사용자 지시] 탭 10 — 원정 · 캐릭터 · 대장간 · 선술집 · 상점 · 자원 · 탐험 · 연구 · 도감 · 도움말.
       09-08 에 **이미지 도감이 도감 안으로 들어가며** `nav.imagedex` 가 삭제됐다 — 탭이 아니라 도감의 **세그먼트 넷 중 셋**이다 (`cx.seg.*` · §9 · §9-1).
       그래서 이 목록의 탭 수만 11 → 10 으로 줄고 **움직인 탭은 없다** — 도움말이 한 칸 당겨졌을 뿐이다.
       [개정 2026-09-06 사용자 지시] 탭 11 — 도감 뒤에 이미지 도감이 서던 자리. 09-08 에 되물렸다.
       [개정 2026-09-04 사용자 지시] 탭 10 — 원정 · 캐릭터 · 강화 · 선술집 · 상점 · 자원 · 탐험 · 연구 · 도감 · 도움말.
       마을 탭이 **자원**(1인 배치 — 광산 · 채집)과 **탐험**(파티)으로 갈리면서 `nav.town` 은 삭제됐다.
       `nav.explore` 는 값이 그대로인 채 **파견처 칸 라벨에서 탭 라벨로 승격**됐다 (§8-4) — `nav.tavern` 과 같은 사례다.
       상점은 탭 이름이 **활동**이고 패널 머리가 **장소**(`dp.post.trade` 상단)다 (§8-3) — 대장간은 [2026-09-21 사용자 지시] 탭 이름도 장소다(`nav.forge` · §8-2 · ADR-0190).
       nav.commission 은 탭에서 빠졌지만 **지우지 않는다** — 선술집 탭 의뢰 패널의 제목이다 (§8-1 · ADR-0248).
       nav.skill 도 탭이 아니라 **창 제목**이다 (§7). nav.base(거점)는 여전히 유일한 미사용 키다.
       아래 나열 순서는 탭 바 순서와 같다 — 읽는 사람이 화면과 대조할 수 있게. */
    'nav.expedition': { ko: '원정', en: 'Expedition' },
    'nav.explore': { ko: '탐험', en: 'Exploration' },
    // 결투장(탭 id `colosseum`) [2026-10-18 사용자 지시 · SCREEN_DESIGN §1 · ADR-0670 · 이름 맞바꿈 2026-10-24 ADR-0760] — 콜로세움 바로 앞 · 오프라인 층 사다리 · 레일(사다리) | 판
    'nav.colosseum': { ko: '결투장', en: 'Arena' },
    'cs.progress': { ko: '{n} / {total}층', en: 'Floor {n} / {total}' },
    'cs.progressDone': { ko: '{total}층 완주', en: 'All {total} floors cleared' },
    'cs.lv': { ko: 'Lv.{a}~{b}', en: 'Lv.{a}–{b}' },
    'cs.lv1': { ko: 'Lv.{a}', en: 'Lv.{a}' },
    'cs.from': { ko: '{n}층 · {tier} · AI 팀', en: 'Floor {n} · {tier} · AI team' },
    'cs.fromGate': { ko: '{n}층 · {tier} 승급전 · AI 팀', en: 'Floor {n} · {tier} promotion bout · AI team' },
    'cs.fight': { ko: '도전', en: 'Challenge' },
    'cs.back': { ko: '결투장으로', en: 'Back to Arena' },
    'cs.last': { ko: '지난 도전: {result} · {sec}초', en: 'Last challenge: {result} · {sec}s' },
    'cs.last.open': { ko: '지난 도전: {result} · {sec}초 · {n}층 열림', en: 'Last challenge: {result} · {sec}s · Floor {n} unlocked' },
    'cs.emblem': { ko: '{tier} 휘장 획득', en: '{tier} emblem earned' },
    'cs.help': {
        ko: '결투장은 한 층씩 올라가는 사다리입니다. 처음엔 첫 층만 열려 있고, 열린 가장 높은 층을 이기면 다음 층이 열립니다. 깬 층은 다시 도전할 수 있고, 져도 잃는 것이 없습니다.<br>층마다 상대 AI 팀이 정해져 있습니다 — 같은 층은 언제 가도 같은 팀입니다. 위층일수록 상대의 레벨 · 장비 · 강화 · 스킬이 오릅니다.<br>등급의 마지막 층은 승급전입니다. 이기면 그 등급의 휘장을 얻습니다.',
        en: 'The Arena is a ladder you climb one floor at a time. Only the first floor is open at the start; beat the highest open floor to unlock the next. You can challenge cleared floors again, and losing costs nothing.<br>Each floor has a fixed AI team — the same floor always fields the same team. Higher floors bring higher level, gear, upgrades and skills.<br>The last floor of each tier is a promotion bout. Win it to earn that tier’s emblem.',
    },
    'nav.arena': { ko: '콜로세움', en: 'Colosseum' },
    // 콜로세움(탭 id `arena`) = 온라인 ELO [2026-10-18 · ADR-0670 · 이름 맞바꿈 2026-10-24 ADR-0760 — ~~오프라인 | 온라인 갈래~~ ADR-0656] — 리그 카드 · 상대 후보 셋 · 친선전 창 · 검사 사유(INTERFACE §2-17 의 코드마다 하나)
    'ar.rating': { ko: '레이팅', en: 'Rating' },
    'ar.peak': { ko: '최고 {n}', en: 'Best {n}' },
    'ar.record': { ko: '{w}승 {d}무 {l}패', en: '{w}W {d}D {l}L' },
    'ar.toNext': { ko: '{tier}까지 {n}', en: '{n} to {tier}' },
    'ar.topLeague': { ko: '최고 리그', en: 'Top league' },
    'ar.cands': { ko: '상대 후보', en: 'Opponents' },
    'ar.ai': { ko: 'AI 팀', en: 'AI team' },
    'ar.from': { ko: 'AI 팀 · {tier} · {rating}', en: 'AI team · {tier} · {rating}' },
    'ar.newCands': { ko: '새 상대', en: 'New opponents' },
    'ar.friendly': { ko: '친선전', en: 'Friendly' },
    'ar.friendlyCard': { ko: '친선전 · 받은 팀', en: 'Friendly · received team' },
    'ar.unrated': { ko: '레이팅 변동 없음', en: 'Unrated' },
    'ar.ratingFlash': { ko: '레이팅 {after} ({delta})', en: 'Rating {after} ({delta})' },
    'ar.last.rated': { ko: '지난 결투: {result} · 레이팅 {after} ({delta})', en: 'Last duel: {result} · Rating {after} ({delta})' },
    'ar.ghostTeam': { ko: '받은 팀', en: 'Received team' },
    'ar.code.h': { ko: '친선전 — 팀 코드', en: 'Friendly — team codes' },
    'ar.code.mine': { ko: '내 팀 코드', en: 'My team code' },
    'ar.code.make': { ko: '코드 만들기', en: 'Make code' },
    'ar.code.copy': { ko: '복사', en: 'Copy' },
    'ar.code.copied': { ko: '팀 코드 복사 완료', en: 'Team code copied' },
    'ar.code.paste': { ko: '받은 코드', en: 'Received code' },
    'ar.code.placeholder': { ko: '여기에 팀 코드 붙여넣기', en: 'Paste a team code here' },
    'ar.code.load': { ko: '불러오기', en: 'Load' },
    'ar.code.broken': { ko: '코드를 읽을 수 없음', en: 'This code cannot be read' },
    'ar.bad.row': { ko: '{who} — {why}', en: '{who} — {why}' },
    'ar.bad.team': { ko: '팀', en: 'Team' },
    'ar.bad.hero': { ko: '영웅 {n}', en: 'Hero {n}' },
    'ar.bad.format': { ko: '코드 모양이 맞지 않음', en: 'The code is malformed' },
    'ar.bad.text': { ko: '쓸 수 없는 글자가 들어 있음', en: 'Contains characters that are not allowed' },
    'ar.bad.class': { ko: '없는 직업', en: 'Unknown class' },
    'ar.bad.level': { ko: '레벨이 범위를 벗어남', en: 'Level is out of range' },
    'ar.bad.stats': { ko: '기본 능력치가 상한을 넘음', en: 'Base attributes exceed the cap' },
    'ar.bad.mastery': { ko: '찍을 수 없는 마스터리가 있음', en: 'Contains mastery that cannot be learned' },
    'ar.bad.masteryPoints': { ko: '마스터리 포인트를 레벨보다 많이 씀', en: 'Spent more mastery points than the level gives' },
    'ar.bad.innate': { ko: '고유 스킬이 그 직업의 것이 아님', en: 'The innate skill does not belong to the class' },
    'ar.bad.book': { ko: '배울 수 없는 책 스킬', en: 'The book skill cannot be learned' },
    'ar.bad.skillLv': { ko: '스킬 업그레이드가 상한을 넘음', en: 'Skill upgrades exceed the cap' },
    'ar.bad.advance': { ko: '전직이 규칙에 맞지 않음', en: 'The advancement breaks the rules' },
    'ar.bad.slot': { ko: '장비 자리가 맞지 않음', en: 'Gear is in the wrong slot' },
    'ar.bad.reqLevel': { ko: '레벨이 모자라 낄 수 없는 장비가 있음', en: 'Wears gear above its level' },
    'ar.bad.up': { ko: '강화 단계가 상한을 넘음', en: 'Upgrade level exceeds the cap' },
    'ar.bad.option': { ko: '옵션 수치가 범위를 벗어남', en: 'An option value is out of range' },
    'ar.rules': { ko: '결투 규칙', en: 'Duel rules' },
    'ar.help.rating': {
        ko: '콜로세움은 레이팅으로 겨룹니다. 이기면 오르고 지면 내려가며, 센 상대를 이길수록 많이 오르고 센 상대에게 질수록 적게 내려갑니다. 레이팅이 문턱을 넘으면 리그가 오릅니다.<br>상대 후보 셋은 내 레이팅의 아래 · 비슷 · 위에서 나옵니다. 카드의 + / − 가 이기고 질 때 바뀔 레이팅입니다. 결투가 끝나면 후보가 새로 섭니다.<br>레이팅은 결투를 시작하는 순간 정해집니다 — 관전을 닫아도 결과는 그대로입니다. 서버가 열리기 전까지 상대는 그 레이팅에 맞춰 갖춘 AI 팀입니다.',
        en: 'The Colosseum is ranked by rating. Wins raise it and losses lower it; beating stronger opponents gains more, and losing to them costs less. Cross a threshold to move up a league.<br>Three opponents are drawn from below, near and above your rating. The + / − on each card is how much your rating changes if you win or lose. New opponents appear after each duel.<br>Your rating is settled the moment the duel starts — closing the replay does not change the result. Until the server opens, opponents are AI teams equipped for their rating.',
    },
    'ar.help.friendly': {
        ko: '친선전 창에서 코드 만들기로 고른 편성의 세 영웅을 팀 코드로 만듭니다. 다른 사람의 코드를 붙여넣고 불러오면 규칙에 맞는지 검사한 뒤 그 팀이 그대로 상대로 나옵니다. 친선전은 레이팅이 바뀌지 않습니다.',
        en: 'In the Friendly window, Make code turns the chosen party’s three heroes into a team code. Paste someone else’s code and load it; once it passes the rule check, that team appears as your opponent exactly as it is. Friendly duels do not change your rating.',
    },
    'ar.select': { ko: '출전 인원 {n} / 3', en: 'Team members {n} / 3' },
    'ar.edit': { ko: '편성 수정', en: 'Edit party' },
    'ar.needTeam': { ko: '영웅 {n}명 편성', en: 'Assign {n} heroes', lock: true },
    'ar.empty': { ko: '빈 자리', en: 'Empty slot' },
    'ar.noOpponent': { ko: '상대를 고르면 팀이 나타납니다', en: 'Pick an opponent to reveal their team' },
    'ar.noTactic': { ko: '열린 전술 칸 없음', en: 'No tactic slots open' },   // Party 판의 전술 칸이 빌 때 (ADR-0495)
    'ar.fight': { ko: '결투 시작', en: 'Start duel' },
    'ar.back': { ko: '콜로세움으로', en: 'Back to Colosseum' },
    'ar.draw': { ko: '무승부', en: 'Draw' },
    'ar.last': { ko: '지난 결투: {result} · {sec}초', en: 'Last duel: {result} · {sec}s' },
    'ar.help': {
        ko: '저장된 편성을 고르면 그 편성의 영웅과 전열·후열이 그대로 출전합니다. 인원과 진형은 편성 탭에서 수정합니다. 영웅 3명을 채워야 결투를 시작할 수 있습니다.<br>개인 능력치·장비·스킬에 고른 편성의 파티 전술·물약을 더해 단판 전투를 합니다. 도감 보너스는 적용하지 않고, 상대는 파티 전술·물약이 없습니다. 제한시간이 지나면 무승부입니다.<br>결투는 원정과 독립되어 보상·도감 처치·자원 소모가 없습니다. 마신 물약도 재고에서 줄지 않습니다. 콜로세움 레이팅과 결투장에서 오른 층은 저장되고, 고른 상대와 지난 결과는 재접속하면 초기화됩니다.',
        en: 'Choose a saved party to use its heroes and front or back ranks. Edit members and formation in the Party tab. Assign three heroes to start a duel.<br>A single round uses individual stats, gear and skills plus the chosen party’s tactics and potions. Codex bonuses do not apply, and opponents have no tactics or potions. Reaching the time limit ends in a draw.<br>Duels run independently of expeditions, with no rewards, codex kills or resource costs. Potions drunk are not taken from your stock. Your Colosseum rating and Arena progress are saved; the picked opponent and last result reset when you reload.',
    },
    'nav.party': { ko: '편성', en: 'Party' },
    'nav.character': { ko: '캐릭터', en: 'Character' },
    // 건설 [2026-09-21 사용자 지시 · ADR-0253] — 옛 「연구」. 화면 이름과 자리(캐릭터 바로 뒤)만 바뀌었고 키는 옛 이름 그대로다
    'nav.research': { ko: '건설', en: 'Construction' },
    'nav.tavern': { ko: '선술집', en: 'Tavern' },
    'nav.shop': { ko: '상점', en: 'Shop' },
    'nav.forge': { ko: '대장간', en: 'Blacksmith' },
    // 도서관 [2026-09-29 사용자 지시 · SCREEN_DESIGN §17 · ADR-0422 · 이름 2026-10-10 ~~서고~~] — 대장간 뒤 · 건물 이름(`building.csv`)과 같은 말 · ~~`nav.training`~~ 은 2026-10-09 훈련장 탭과 함께 걷혔다(ADR-0567)
    'nav.library': { ko: '도서관', en: 'Library' },
    'nav.resource': { ko: '연구소', en: 'Laboratory' },   // 건물 이름(`building.csv:resource`)과 같은 말 · 키는 옛 이름 그대로 (2026-10-18 · ADR-0665)
    'nav.codex': { ko: '도감', en: 'Codex' },
    'nav.help': { ko: '도움말', en: 'Help' },
    'nav.lab': { ko: '실험실', en: 'Lab' },   // 개발 장치 — 기타 묶음 끝 (SCREEN_DESIGN §18 · ADR-0580)
    // 탭 묶음 머리 — 누를 수 없는 작은 회색 글씨 (SCREEN_DESIGN §1 · ADR-0554). 순서 = `app.js:NAV_GROUPS`
    'nav.grp.battle': { ko: '전투', en: 'Combat' },
    'nav.grp.town': { ko: '마을', en: 'Town' },
    'nav.grp.etc': { ko: '기타', en: 'Other' },
    // 흐린 탭을 누르면 — 탭은 안 바뀌고 플래시가 선다 (SCREEN_DESIGN §1 · ADR-0311). 지을 수 있으면 「{b} 건설」(`cn.needBuild`) · 첫 랭크가 준비 중이면 이 줄 (ADR-0699)
    'nav.pending': { ko: '{b} 준비 중', en: '{b}: coming later', lock: true },
    'nav.commission': { ko: '의뢰', en: 'Commissions' },
    'nav.skill': { ko: '스킬', en: 'Skills' },
    'nav.base': { ko: '거점', en: 'Base' },
    'res.gold': { ko: '골드', en: 'Gold' },
    'res.dust': { ko: '분해 가루', en: 'Dust' },
    'res.stigma': { ko: '낙인', en: 'Stigma' },
    'ui.langBtn': { ko: 'EN', en: '한국어' },   // 버튼에는 "다른 쪽" 언어를 적는다
    'ui.close': { ko: '닫기', en: 'Close' },        // 창 레이어 — 닫는 길 셋 중 눈에 보이는 하나 (SCREEN_DESIGN §2)
    'ui.expTime': { ko: '원정 플레이 시간', en: 'Expedition Playtime' },   // 상단바 ⚙ 왼쪽 — 누적 원정 플레이 시간(배속을 탄다)의 라벨 (SCREEN_DESIGN §2 · ADR-0514)
    /* 창 안에서 답하는 버튼 둘 (2026-09-09) — 어느 창이든 같은 말을 쓴다. 「확인」은 **읽었다/한다**,
       「취소」는 **안 한다**. 창을 그냥 닫는 길(X · 바깥 · Esc)은 그대로 있고, 이 둘은 그것을 **눈에 보이게** 한다 */
    'ui.ok': { ko: '확인', en: 'OK' },
    'ui.cancel': { ko: '취소', en: 'Cancel' },
    /* 설정 [2026-09-28 사용자 지시 · SCREEN_DESIGN §2-2 · ADR-0413 · ADR-0414] — 상단바 오른쪽 끝 `⚙` 판의 설정 탭 (`set.h` = 탭 이름 · ⚙ 의 title).
       버튼 글은 한국어도 On / Off 그대로(2026-09-27 사용자 지시 「한글이어도 무조건 On Off」 — 파티 전술 칸 `rs.on` 과 같다) */
    'set.h': { ko: '설정', en: 'Settings' },
    'set.artStyle': { ko: '아트 스타일', en: 'Art Style' },
    'set.skillFx': { ko: '스킬 이펙트', en: 'Skill Effects' },
    'set.fxArt': { ko: '이펙트 그림체', en: 'Effect Style' },   // 관전 스킬 이펙트의 그림체 — 버튼 글은 ix.fxs.* (2026-10-09 · ADR-0561)
    'set.fxAlpha': { ko: '이펙트 투명도(%)', en: 'Transparency (%)' },   // 영어는 짧게 — 이름 칸이 넓어지면 다른 줄 버튼까지 접힌다   // 스킬 조각만 옅게 — 버튼 글은 0 · 25 · 50 · 75 (단위는 이 이름이 든다 · 2026-10-09 · ADR-0562)
    'set.basicFx': { ko: '기본 공격 이펙트', en: 'Basic Attack Effects' },   // 기본 공격 · 반격의 대각선 베기 한 줄(무채색) (2026-10-03 · ADR-0501 · ADR-0505)
    'set.hitFx': { ko: '피격 반응', en: 'Hit Reactions' },
    'set.shake': { ko: '피격 시 흔들림', en: 'Shake on Hit' },
    'set.lunge': { ko: '공격 시 흔들림', en: 'Shake on Attack' },
    'set.on': { ko: 'On', en: 'On' },
    'set.off': { ko: 'Off', en: 'Off' },
    // 로그 방식 — 네 칸 격자 · 한 문장 (2026-09-30 · ADR-0459). 이 줄의 버튼 글은 언어를 따른다
    'set.log': { ko: '로그', en: 'Log' },
    'set.logGrid': { ko: '칸', en: 'Grid' },
    'set.logText': { ko: '문장', en: 'Text' },
    'set.nick': { ko: '닉네임', en: 'Nickname' },   // 퍼널 페이지가 유저를 알아보는 이름 — 게임 안엔 안 찍힌다 (§2-1 · ADR-0633)

    /* ── 연구소 탭(옛 자원 탭 · 키 `dp.*` 는 옛 이름 그대로) — 줄은 넷: 자원 · 수색 · 훈련 · 도박장 (SCREEN_DESIGN §8) ──
       채광 · 채집 · 벌목은 「자원」 줄의 지점이다(`dp.node.mine` · `gather` · `log` — 2026-10-25 · ADR-0788 · R356) · `dp.post.mine` · `gather` · `log` 는 미니게임 창 제목이 쓴다.
       영웅은 앉지 않는다 [2026-10-18 · ADR-0665] — ~~자리 칸의 선택 창 · 회수 · `dp.err.*` · 담당 능력치(`dp.attrTitle`)~~ 를 걷었다.
       `dp.solo` · `dp.party` 는 참조가 0 이지만 **지우지 않는다**: 탐험 탭이 같은 문구를 쓸 수 있다.
       `dp.post.forge`(대장간) · `dp.post.trade`(상단)는 줄에서 빠졌지만 **지우지 않는다** —
       `dp.post.forge` 는 연구의 가지 이름(`mock.js` rsBranch)이, `dp.post.trade` 는 상점 탭의 패널 머리가 쓴다(§8-3).
       ⚠ **`dp.post.mine` 은 값만 「채광」(활동)으로 바뀌고 키는 옛 장소 id 그대로다** [2026-09-04 사용자 지시] — 지점 id(`lab_material.csv:post`)와 같은 글자다 */
    'dp.post.res': { ko: '자원', en: 'Resources' },
    'dp.post.trade': { ko: '상단', en: 'Trading House' },
    'dp.post.forge': { ko: '대장간', en: 'Blacksmith' },
    'dp.post.mine': { ko: '채광', en: 'Mining' },
    'dp.post.gather': { ko: '채집', en: 'Gathering' },
    'dp.post.log': { ko: '벌목', en: 'Logging' },
    // 연구소 줄 「수색」 — 단계 없는 칸 하나 (SCREEN_DESIGN §8 · ADR-0672 · 2026-10-19)
    'dp.post.visit': { ko: '수색', en: 'Search' },
    'dp.visit.every': { ko: '{h}시간마다 한 명', en: 'One every {h}h' },
    'dp.visit.rare': { ko: '레어 {r}%', en: 'Rare {r}%' },
    'dp.visit.closed': { ko: '닫힘', en: 'Closed' },
    'dp.visit.slots': { ko: '칸 {n}', en: '{n} slots' },
    // 연구소 줄 · 지점 · 연구 (2026-10-21 · SCREEN_DESIGN §8 · ADR-0684 · R298)
    'dp.post.train': { ko: '훈련', en: 'Training' },
    'dp.post.gamble': { ko: '도박장', en: 'Gambling Den' },
    'dp.node.mine': { ko: '채광', en: 'Mining' },
    'dp.node.gather': { ko: '채집', en: 'Gathering' },
    'dp.node.log': { ko: '벌목', en: 'Logging' },
    'dp.node.burst': { ko: '대박', en: 'Jackpot' },
    'dp.node.seats': { ko: '등록 칸', en: 'Seats' },
    'dp.node.interval': { ko: '간격', en: 'Interval' },
    'dp.node.quality': { ko: '품질', en: 'Quality' },
    'dp.node.waiting': { ko: '대기 칸', en: 'Waiting Slots' },
    'dp.node.speed': { ko: '속도', en: 'Speed' },
    'dp.node.range': { ko: '범위', en: 'Range' },
    'dp.node.income': { ko: '수익', en: 'Income' },
    'dp.val.seats': { ko: '{n}명', en: '{n}' },
    'dp.val.slots': { ko: '+{n}칸', en: '+{n}' },
    'dp.val.range': { ko: '최고 −{n}', en: 'Top −{n}' },
    'dp.res.go': { ko: '연구', en: 'Research' },
    'dp.res.cancel': { ko: '그만두기', en: 'Cancel' },
    'dp.res.time': { ko: '{t} 걸림', en: 'Takes {t}' },
    'dp.res.left': { ko: '{t} 남음', en: '{t} left' },
    'dp.res.busy': { ko: '연구 중 {name}', en: 'Researching {name}' },
    'dp.res.started': { ko: '{name} 연구 시작', en: 'Started {name}' },
    'dp.res.canceled': { ko: '연구 취소 — 비용 반환', en: 'Research canceled — cost refunded' },
    'dp.line.h': { ko: '이 줄', en: 'This Line' },
    'dp.train.cap': { ko: '상한 Lv {n}', en: 'Cap Lv {n}' },
    'dp.gamble.rate': { ko: '골드 {n}/시간', en: 'Gold {n}/h' },
    'dp.fx.h': { ko: '등록 효과', en: 'Hero Effects' },   // 고른 줄의 소제목 — 아래 영웅 카드 · 효과 숫자 (ADR-0700 — ~~Assigned heroes~~ 카드가 서며 영웅 목록 제목처럼 겹쳐 읽혔다)
    'dp.fx.none': { ko: '등록한 영웅 없음', en: 'No heroes assigned' },
    'dp.fx.zero': { ko: '효과 없음', en: 'No effect' },
    'dp.fx.speed': { ko: '속도 ×{v}', en: 'Speed ×{v}' },
    'dp.fx.burst': { ko: '대박 +{v}%', en: 'Jackpot +{v}%' },
    'dp.fx.research': { ko: '연구 속도 ×{v}', en: 'Research ×{v}' },
    'dp.fx.quality': { ko: '품질 +{v}%', en: 'Quality +{v}%' },
    'dp.fx.cost': { ko: '연구 비용 −{v}%', en: 'Research cost −{v}%' },
    // 도움말 연구소 섹션 (SCREEN_DESIGN §12 · 2026-10-21 R298 — ~~벤치(파견 대기)~~ 문장 대체) — 탐험 `ex.help` · 결투장 `cs.help` 와 같은 도움말 전용 문장
    'dp.help': {
        ko: '줄은 <b>영웅이 없어도</b> 시간마다 생산합니다 — 게임을 꺼 둔 동안에도(최대 {h}시간 · 수색은 칸이 찰 때까지)<br>'
            + '지점을 골라 <b>연구</b>하면 레벨이 오릅니다 — 시간이 걸리고 연구소 전체에 <b>한 번에 하나</b> · 그만두면 비용을 전부 돌려받습니다 · 연구소 랭크가 새 지점을 엽니다<br>'
            + '영웅을 줄에 <b>등록</b>하면 능력치가 그 줄에 효과를 줍니다 — 힘 속도 · 운 대박 · 지능 연구 시간 · 매력 품질 · 건강 숙련(오래 등록할수록) · 통솔 같은 줄 동료 · 민첩 연구 비용. 등록은 원정 · 탐험과 겸합니다<br>'
            + '<b>훈련</b> 줄은 등록한 영웅이 경험치를 받습니다(로스터 최고 레벨까지) · <b>도박장</b> 줄은 선술집의 도박장이 열리면 같이 열립니다',
        en: 'Lines produce over time <b>without heroes</b> — even while the game is closed (up to {h}h · Search until the slots fill)<br>'
            + 'Pick a node and <b>Research</b> it to raise its level — it takes time and the Laboratory runs <b>one at a time</b> · cancelling refunds the full cost · Laboratory rank opens new nodes<br>'
            + 'Heroes <b>assigned</b> to a line lend it their stats — Strength speed · Luck jackpot · Intelligence research time · Charisma quality · Vitality mastery (the longer assigned) · Leadership peers on the line · Agility research cost. Assignment does not stop expeditions or exploring<br>'
            + 'The <b>Training</b> line gives XP to its assigned heroes (up to the roster\'s top level) · the <b>Gambling Den</b> line opens along with the Tavern\'s Gambling Den',
    },
    'dp.solo': { ko: '1인', en: 'Solo' },
    /* ── 탐험 탭 — 지도 위 지점 아이콘 → 아이콘 옆 지점 창 (SCREEN_DESIGN §8-4 · ADR-0553 · ADR-0558 · 2026-10-09) ──
       거절은 `game.exploreErr` · `exploreTake` · `exploreDrop` 의 결과 코드와 짝 (`ex.err.<code>`) · 규칙 문장은 도움말(`ex.help`) · 창엔 설명 글줄이 없다(ADR-0560) */
    // 지점 이름은 장마다 다르다 — 화면 문구가 아니라 데이터라 `explore_spot.csv` 가 든다 (ADR-0563)
    'ex.go': { ko: '출발', en: 'Set out' },
    'ex.left': { ko: '남은 시간 {t}', en: '{t} left' },
    'ex.take': { ko: '수령', en: 'Collect' },
    'ex.cancel': { ko: '불러들이기', en: 'Call back' },
    'ex.cancelConfirm': { ko: '정말 불러들일까요? 한 번 더 누르면 불러들입니다', en: 'Really? Click again to call back' },
    'ex.sent': { ko: '{spot} 탐험 출발', en: 'Off to the {spot}' },
    'ex.taken': { ko: '장비 {n}개 수령', en: 'Collected {n} gear' },
    'ex.canceled': { ko: '탐험 불러들임', en: 'Exploration called back' },
    'ex.err.missing': { ko: '없는 지점', en: 'No such spot' },
    'ex.err.pending': { ko: '준비 중', en: 'Coming later' },
    'ex.err.busy': { ko: '이미 탐험 중인 지점', en: 'Someone is already out there' },
    'ex.err.slots': { ko: '동시 탐험은 {n}건까지', en: 'Up to {n} exploration(s) at a time' },
    // 편성 쪽 거절 — 탐험은 편성으로 보낸다 (2026-10-10 · ADR-0582 · ~~`ex.err.full`~~ 은 편성이 인원을 못 넘어 걷었다)
    'ex.err.noParty': { ko: '빈 편성', en: 'That party is empty' },
    'ex.err.running': { ko: '원정 철수', en: 'Retreat from the expedition', lock: true },
    'ex.err.exploring': { ko: '이미 탐험 중', en: 'Already out exploring' },
    'ex.err.advancing': { ko: '전직 중인 영웅 있음', en: 'Someone in it is advancing' },
    'ex.err.none': { ko: '나간 탐험 없음', en: 'Nobody is out there' },
    'ex.err.notDone': { ko: '아직 안 돌아옴', en: 'Not back yet' },
    'ex.err.bagFull': { ko: '인벤토리 {n}칸 비우기', en: { one: 'Free {n} inventory slot', other: 'Free {n} inventory slots' }, lock: true },
    'dp.party': { ko: '파티', en: 'Party' },
    // 단계 트랙은 머리 줄이 없다 [2026-09-21 사용자 지시 · ADR-0228] — 개수는 상자의 순서 번호가 말한다.
    // 무엇으로 여는가(해금 조건)는 기획 백지라 문구도 만들지 않는다 (§8)

    /* 상점 (SCREEN_DESIGN §8-3 · ADR-0223) — 패널 머리는 `dp.post.trade`(상단) 재사용. 상단은 탭 없이 장비 목록 하나(2026-09-30),
       오른쪽 특수상단 카드. 남은 시간은 **정보**다 — 재촉하는 말을 안 쓴다 (base_expedition_design §2-6) */
    // 상단 목록 교체 — 고른 영웅의 레벨({lv})로 다시 굴린다 · 무료는 선술집처럼 쿨다운 · 유료는 두 배씩 (§8-3 · game.shopReroll · ADR-0648)
    'td.reroll': { ko: '교체 · Lv {lv} ({g} 골드)', en: 'Refresh · Lv {lv} ({g} gold)' },
    'td.reroll.free': { ko: '교체 · Lv {lv} (무료)', en: 'Refresh · Lv {lv} (free)' },
    // 상단 제목 옆 `?` — 올리면 뜨는 두 문장 · {h} = [balance.csv:shop_refresh_hours] (ADR-0464 · ADR-0648)
    'td.reroll.help': { ko: '교체하면 고른 영웅 레벨에 맞춰 다시 들어옵니다. 무료 교체 뒤 {h}시간이 지나면 다시 무료.', en: 'A refresh restocks at the selected hero\'s level. After a free refresh, it is free again in {h} hours.' },
    'td.special': { ko: '특수상단', en: 'Visiting trader' },
    'td.leave': { ko: '떠나기까지 {t}', en: 'Leaves in {t}' },
    'td.next': { ko: '다음 상인까지 {t}', en: 'Next trader in {t}' },
    'td.buy': { ko: '구매', en: 'Buy' },
    // 상단 장비 구매 (SCREEN_DESIGN §8-3 · game.shopBuy · 2026-09-27) — 거절은 결과 코드와 짝이다(unbuilt 는 flashNeed · missing 은 stale 과 같은 뜻)
    'td.sold': { ko: '팔림', en: 'Sold' },
    'td.bought': { ko: '{name} 구매 (−{g} G)', en: 'Bought {name} (−{g} G)' },
    'td.boughtN': { ko: '{name} ×{n} 구매 (−{g} G)', en: 'Bought {name} ×{n} (−{g} G)' },   // 물약 묶음 구매 (§8-3 · 2026-10-23)
    'td.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'td.err.bagFull': { ko: '인벤토리 가득 참', en: 'Inventory is full' },
    'td.err.sold': { ko: '이미 팔린 물건', en: 'Already sold' },
    'td.err.stale': { ko: '목록이 바뀜', en: 'The stock has changed' },   // 그리는 사이 다른 탭에서 [교체]했다 (ADR-0648 — 상단 목록은 방문 회차와 무관)

    /* 의뢰 게시판 (SCREEN_DESIGN §14 · 자리는 선술집 탭 §8-1 · ADR-0352) — 제목은 `nav.commission` 재사용(옛 탭 라벨이 패널 제목으로 내려왔다).
       ⚠ **종류 · 등급 이름은 여기 없다** — `commission_kind.csv` · `commission_grade.csv` 의 `_kr`/`_en` 쌍이고 화면은 `L()` 로 푼다.
       남는 것은 화면 라벨 · **목표 틀**(어휘마다 하나 — `{t}` = 대상 이름 · `{n}` = 목표 수) · 플래시다. ~~`cm.fame`~~ 은 명성 보류로 걷었다 */
    'cm.accept': { ko: '수락', en: 'Accept' },
    'cm.claim': { ko: '수령', en: 'Claim' },
    'cm.drop': { ko: '포기', en: 'Abandon' },
    'cm.dropConfirm': { ko: '정말 포기', en: 'Confirm abandon' },
    'cm.slots': { ko: '받음 {n} / {max}', en: 'Taken {n} / {max}' },
    'cm.goal.chapter': { ko: '{t}의 몬스터 {n}마리', en: { one: '{n} monster in the {t}', other: '{n} monsters in the {t}' } },
    'cm.goal.race': { ko: '{t} 종족 {n}마리', en: { one: '{n} {t} foe', other: '{n} {t} foes' } },
    'cm.goal.monster': { ko: '{t} {n}마리', en: '{t} ×{n}' },
    'cm.goal.elite': { ko: '정예 {n}마리', en: { one: '{n} elite', other: '{n} elites' } },
    'cm.goal.boss': { ko: '보스 {n}마리', en: { one: '{n} boss', other: '{n} bosses' } },
    'cm.goal.rarity': { ko: '{t} 장비 {n}개', en: { one: '{n} {t} item', other: '{n} {t} items' } },
    'cm.taken': { ko: '의뢰 수락 — {goal}', en: 'Commission taken — {goal}' },
    'cm.claimed': { ko: '의뢰 완료 — {g} G', en: 'Commission complete — {g} G' },
    'cm.dropped': { ko: '의뢰 포기', en: 'Commission abandoned' },
    'cm.err.full': { ko: '의뢰는 {n}개까지 받아 둘 수 있음', en: { one: 'You can hold up to {n} commission', other: 'You can hold up to {n} commissions' } },
    'cm.err.notDone': { ko: '목표 달성', en: 'Meet the goal', lock: true },
    /* 도박장 (SCREEN_DESIGN §8-1 · ADR-0322 자리 · ADR-0331 슬롯) — 의뢰 오른쪽 칸이 창을 연다. 창은 3×3 슬롯이다.
       심볼 · 잭팟 이름은 여기 없다 — `slot_symbol.csv` · `slot_coin.csv` 의 `_kr`/`_en` 쌍을 `L()` 로 푼다. 규칙 문장은 도움말(`gb.help`)만 든다 */
    'gb.h': { ko: '도박장', en: 'Gambling Den' },
    'gb.enter': { ko: '입장', en: 'Enter' },
    'gb.from': { ko: '한 판 {g} G부터', en: 'From {g} G a spin' },
    'gb.stake': { ko: '판돈', en: 'Stake' },
    'gb.spin': { ko: '스핀 · {g} G', en: 'Spin · {g} G' },
    'gb.spinN': { ko: '{n}판 돌리기', en: 'Spin ×{n}' },
    'gb.won': { ko: '받음', en: 'Won' },
    'gb.net': { ko: '순손익', en: 'Net' },
    'gb.spins': { ko: '{n}판', en: { one: '{n} spin', other: '{n} spins' } },
    'gb.line': { ko: '라인 {n}', en: 'Line {n}' },
    'gb.hold': { ko: '홀드 앤 스핀', en: 'Hold & Spin' },
    'gb.respins': { ko: '리스핀 {n}', en: 'Respins {n}' },
    'gb.jpN': { ko: '{name} ×{n}', en: '{name} ×{n}' },   // 받은 잭팟이 둘 이상 — 계기판 표지 (ADR-0609)
    'gb.pay.h': { ko: '배당표', en: 'Paytable' },
    'gb.pay.hold': { ko: '코인 {n}개 이상 → 홀드 앤 스핀', en: '{n}+ coins → Hold & Spin' },
    'gb.pay.fill': { ko: '판이 다 차면', en: 'Full board' },
    'gb.err.gold': { ko: '판돈 부족 ({g} G)', en: 'Not enough gold for the stake ({g} G)' },
    // 도움말 전용 — 규칙은 인게임 창에 안 적는다 (SCREEN_DESIGN §12 · 원칙 4). 값은 부르는 쪽이 balance 에서 넣는다
    'gb.help': {
        ko: '선술집이 엽니다. 횟수 제한은 없습니다 — 판돈만 있으면 돕니다. {n}판 돌리기는 한 번에 {n}판을 돌리고, 도중에 판돈이 떨어지면 거기서 멈춥니다<br>'
            + '판돈을 걸고 돌리면 가로 · 대각 {lines}라인에서 같은 심볼 셋이 골드나 재료를 줍니다. 와일드가 다른 심볼 대신 섭니다 · 코인은 라인을 끊습니다<br>'
            + '코인이 {trig}개 이상 서면 홀드 앤 스핀 — 코인은 제자리에 붙고, 새 코인이 설 때마다 리스핀이 {re}번으로 돌아갑니다. 판이 다 차면 그랜드<br>'
            + '판돈은 진행 중인 챕터를 따릅니다. 윗단계 판돈은 선술집 랭크가 엽니다. 장비 · 낙인은 안 나옵니다',
        en: 'The Tavern opens it. There is no spin limit — spin as long as you can pay the stake. Spin ×{n} plays {n} spins at once and stops early if you run out of gold<br>'
            + 'Stake gold and spin: three matching symbols on any of the {lines} rows or diagonals pay gold or materials. Wilds stand in for other symbols · coins break a line<br>'
            + 'Land {trig}+ coins for Hold & Spin — coins stick, and each new coin resets the respins to {re}. Fill the board for the Grand<br>'
            + 'Stakes follow your current chapter. Higher stakes unlock with Tavern ranks. No equipment or stigma comes out',
    },

    /* 대장간 (SCREEN_DESIGN §8-2) — 제목 줄이 없다: 탭 이름(`nav.forge`)이 crumb 에 서고 작업 탭은 상단바에 선다 (ADR-0190).
       작업 탭 셋 = 제작 · 강화 · 크래프트 (ADR-0142) · 배치 줄은 걷었다 (ADR-0191). 강화의 결과 문구는 캐릭터 탭이 쓰던 `ch.upgraded` 를 재사용한다 — 같은 사건이라 문구를 새로 쓰지 않는다 */
    'fg.seg.make': { ko: '제작', en: 'Smith' },
    'fg.seg.up': { ko: '강화', en: 'Upgrade' },
    'fg.seg.craft': { ko: '크래프트', en: 'Craft' },
    'fg.seg.synth': { ko: '합성', en: 'Combine' },   // 재료 합성 — 바로 아래 단계를 모아 위 단계 하나 (2026-10-27 · ADR-0856)
    'fg.synth.go': { ko: '합성', en: 'Combine' },
    'fg.synth.max': { ko: '최대 ×{n}', en: 'Max ×{n}' },
    'fg.go': { ko: '강화', en: 'Upgrade' },
    // 옛 `tip.up.max` — 2026-09-08 에 툴팁의 강화 줄이 죽으면서 **대장간 전용**이 되어 접두를 옮겼다 (문구·인자 동일)
    'fg.upMax': { ko: '강화 +{up} · 상한', en: 'Upgrade +{up} · max' },
    'fg.base': { ko: '베이스 능력치', en: 'Base stat' },
    // 강화 진열의 메타 — 누가 끼고 있나 · 안 끼었으면 있는 곳(`ch.bag.inv` · `ch.bag.stash`) (ADR-0604 · ~~`fg.worn` 착용 중 · `fg.bag` 가방~~)
    'fg.wornBy': { ko: '{name} 착용', en: 'Worn by {name}' },
    'fg.stage': { ko: '강화 단계', en: 'Upgrade level' },   // 강화 작업 칸의 눈금 머리 (ADR-0604)
    // 강화 성공 확률 · 실패 [2026-10-14 · R253 · ADR-0626] — 확률 칩(비용 칩 앞) · 실패 플래시 · 연출의 실패 표지
    'fg.chance': { ko: '성공 {p}%', en: '{p}% success' },
    'fg.upFail': { ko: '강화 실패 · +{n} 그대로 · {g}G', en: 'Upgrade failed · still +{n} · {g}G' },
    'fg.failMark': { ko: '실패', en: 'Failed' },
    'fg.pick': { ko: '장비 선택', en: 'Pick an item' },   // 장비칸 · 아이템창 어디서든 고른다 (ADR-0364)
    'fg.noBase': { ko: '강화 없음', en: 'No upgrade' },
    // 제작 칸 (R96) — 오류 키는 결과 코드와 짝을 맞춘다(`fg.err.<코드>` — game.makeItem)
    'fg.make.lv': { ko: 'Lv{n}', en: 'Lv{n}' },   // 제작 레벨 버튼 — 대역이 아니라 레벨 하나다 (ADR-0263)
    'fg.make.go': { ko: '만들기', en: 'Make' },
    'fg.make.potion': { ko: '물약', en: 'Potions' },   // 제작 고르개 줄 끝의 물약 칸 이름 — 올리면 뜬다 (ADR-0219)
    'fg.made': { ko: '제작 — {name}', en: 'Made — {name}' },
    'fg.synthed': { ko: '합성 — {name} ×{n}', en: 'Combined — {name} ×{n}' },
    'fg.err.materials': { ko: '재료 부족', en: 'Not enough materials' },
    'fg.err.bagFull': { ko: '인벤토리 가득 참', en: 'Inventory is full' },
    'fg.err.missing': { ko: '없는 부위 · 레벨 · 종류', en: 'Unknown slot, level or type' },
    // 물약 (R103 · ADR-0142 · 개수 R124) — 이름 · 회복량은 `potion.csv` · 판정은 `game.potionState` · 칸은 편성 탭이 든다
    'fg.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'fg.potion.stock': { ko: '재고', en: 'Stock' },
    'fg.potion.none': { ko: '없음', en: 'None' },
    // ~~`fg.potion.tip`~~ (대장간 · 편성 탭의 `title` 한 줄) 은 2026-09-24 삭제 — 물약은 어디서나 **물약 카드**를 띄운다 (ADR-0315)
    'fg.potion.heal': { ko: '회복 {n}', en: 'Heals {n}' },

    /* ── 도움말 탭 (2026-08-26) ──
       설명 문구는 여기서 새로 쓰지 않는다 — 인게임에서 걷어낸 *.note / *.sub / *.hint 를 같은 키로 재사용한다.
       아래 넷은 그 재사용으로 못 덮는 자리만 채운다: 페이지 제목 · 섹션 제목 하나 · 인게임에서 숫자만 남기며 밀려난 원문 둘. */
    'todo.badge': { ko: '미착수', en: 'Not started' },
    'todo.lead': { ko: '기획은 확정됐고 화면이 아직 없습니다 — 지금 여기서 할 수 있는 일은 없습니다', en: 'The design is settled; the screen is not built yet — there is nothing to do here yet' },
    'ex.h': { ko: '탐험', en: 'Exploration' },
    // 탐험 규칙 — 도움말 탐험 절 (2026-10-09 · 옛 `ex.todo`(미착수 안내)를 대체 · 지점 패널은 규칙 문장을 안 든다 · SCREEN_DESIGN §8-4)
    'ex.help': {
        ko: '지도에서 <b>열린 땅의 지점</b>(동굴 · 폐허 · 마차)을 누르고 보낼 <b>편성</b>을 고릅니다 — 한 명짜리 편성도 됩니다(최대 {n}명) · 원정 중인 편성은 철수가 먼저입니다<br>'
            + '<b>{h}시간</b> 뒤 돌아오고 오프라인에도 흐릅니다 · 결과는 받아 갈 때까지 남습니다 · 동시 탐험 {s}건 · 한 지점에 한 건<br>'
            + '<b>동굴</b>은 장비를 가져옵니다 — 보낸 영웅 1명당 {k}개 · 그 땅의 레벨대 · 폐허 · 마차는 준비 중<br>'
            + '탐험 나간 편성은 받을 때까지 사람을 바꿀 수 없고 원정에 못 나갑니다 · 불러들이면 편성째 결과 없이 돌아옵니다',
        en: 'Click a <b>spot in an open land</b> (cave · ruins · caravan) and pick which <b>party</b> goes — a one-hero party works too (up to {n}) · a party on an expedition must withdraw first<br>'
            + 'They return after <b>{h}h</b>, offline too · the haul waits until you collect it · {s} exploration(s) at a time · one per spot<br>'
            + 'The <b>cave</b> brings back gear — {k} per hero sent · at that land\'s level band · ruins and caravan are coming later<br>'
            + 'A party out exploring can\'t change members or join expeditions until collected · calling it back returns the whole party empty-handed',
    },
    'help.title': { ko: '도움말', en: 'Help' },
    'help.newgame': { ko: '새 게임', en: 'New Game' },
    'help.exp.party': { ko: '전투 {n}인 — 동시 원정 {m}팀', en: '{n} fighters — {m} expedition at a time' },
    'help.exp.bench': { ko: '파견 대기 · 영웅 로스터 {n} / {cap}', en: 'Awaiting dispatch · Hero roster {n} / {cap}' },

    /* ── 공통 ── */
    'face.noArt': { ko: '{name} — 원작 아트 없음', en: '{name} — no source art' },
    'class.unassigned': { ko: '역할 미배정', en: 'Role unassigned' },
    'kind.normal': { ko: '일반', en: 'Normal' },
    'kind.elite': { ko: '정예', en: 'Elite' },
    'kind.boss': { ko: '보스', en: 'Boss' },
    'kind.chapterBoss': { ko: '챕터보스', en: 'Chapter Boss' },

    /* ── 원정: 편성 · 지역 ── */
    /* 부대 칸 · [Report] 는 **ko 에서도 영어 그대로** [2026-09-24 사용자 지시 · SCREEN_DESIGN §4] — 부대 `{n}` 은 로마 숫자(`M.roman`).
       ~~`exp.seg.idle`(Stages)~~ 은 2026-10-18 걷혔다 — 스테이지는 원정 탭 버튼이 연다 (ADR-0661) */
    /* 관전 칸의 이름 — 부대 수가 몇이든 이름은 부대고 상태는 색만 든다 — `exp.seg.party` (SCREEN_DESIGN §4 · ADR-0316 · 하나여도 ADR-0360).
       `exp.seg.battle` 은 도움말 제목으로만 산다 */
    'exp.seg.battle': { ko: '전투 관전', en: 'Spectate' },
    'exp.seg.party': { ko: 'Party {n}', en: 'Party {n}' },
    /* 원정이 있는 부대 칸 — 이름 뒤에 그 부대가 있는 스테이지(`data.js:stageName`) [2026-10-06 사용자 지시 · ADR-0517] */
    'exp.seg.partyAt': { ko: 'Party {n} - {where}', en: 'Party {n} - {where}' },
    // 원정이 없는 열린 부대 칸 — 흰 글씨 [2026-10-27 사용자 지시 · ADR-0912] · 자물쇠 칸은 `exp.seg.party`
    'exp.seg.partyIdle': { ko: 'Party {n} - 대기 중', en: 'Party {n} - Idle' },
    // 스테이지 화면 오른쪽 위 버튼 · 도움말 소제목 (§4-1 · ADR-0661)
    'exp.seg.report': { ko: 'Report', en: 'Report' },
    'exp.oneParty': {
        ko: '전투 파티는 한 팀 — 원정이 곧 전투입니다. 세 상태가 한 탭 안에서 이어집니다',
        en: 'One battle party — the expedition is the battle. Three states flow within one tab',
    },
    'exp.party.h': { ko: '파티', en: 'Party' },
    /* 패널 부제는 숫자만 — 설명은 도움말 탭으로 갔다 (원문은 help.exp.party) */
    'exp.leader': { ko: '리더', en: 'Leader' },
    /* 진형 (SCREEN_DESIGN §4-1) — 칸 이름 + **랭크 라벨 둘**. 템플릿은 **점 아이콘**이라 글자가 없고 키도 없다.
       ~~중열~~ 은 2026-09-09 에 삭제 — 3랭크 템플릿(1·1·1)이 「한 줄에 셋」으로 바뀌어 가운데 랭크가 사라졌다.
       `exp.form.h` 는 2026-09-09 에 지웠다가 **2026-09-10 되살렸다** [사용자 지시 · ADR-0079 가 ADR-0060 을 대체] —
       패널이 세 칸이 되면서 칸마다 이름이 서야 어디까지가 무엇인지 읽힌다 */
    'exp.form.h': { ko: '진형', en: 'Formation' },
    'exp.form.front': { ko: '전열', en: 'Front' },
    'exp.form.back': { ko: '후열', en: 'Back' },
    'exp.cantDepart': {
        ko: '이 편성으로는 출발할 수 없음',
        en: 'This party cannot depart',
    },
    'exp.party.note': {
        ko: '런이 끝나면 깎인 HP도 <b>전투불능도 무료·즉시 회복</b> — 비용은 <b>그 런이 얇아지는 것</b>입니다<br>'
            + '파티 버프는 스탯이 아니라 스킬 효과입니다 — 통솔의 전투 계수는 없습니다',
        en: 'Lost HP <b>and downed heroes are restored free and instantly</b> when the run ends — the cost is <b>a thinner party for the rest of that run</b><br>'
            + 'Party buffs are skill effects, not a stat — Leadership has no combat coefficient',
    },
    'exp.bench.h': { ko: '벤치', en: 'Bench' },
    'exp.bench.note': {
        ko: '<b>건설은 파견이 아닙니다</b> — 영웅을 보내지 않고 진행하는 별도 시스템이라 건설 탭이 듭니다<br>'
            + '보낸 영웅은 잠기지 않습니다 — 언제든 불러들이고 <b>흐른 만큼 비례해 받습니다</b>',
        en: '<b>Construction is not a dispatch</b> — it runs without sending heroes, so the Construction tab owns it<br>'
            + 'Dispatched heroes are never locked — recall any time and receive <b>pro rata for the time elapsed</b>',
    },
    'exp.commission.h': { ko: '의뢰', en: 'Commissions' },
    'exp.commission.note': {
        ko: '의뢰는 <b>받아 두는 목표</b>입니다 — 전장이 열리지 않습니다. 게시판에서 골라 받아 두면 <b>평소 활동 위에 얹혀</b> 저절로 진행됩니다<br>'
            + '유형은 <b>둘</b> — <b>처치</b>(「x를 잡아라」 · 돌던 전투가 저절로 셈) · <b>수집</b>(「x를 모아라」 · 드롭과 파견·탐험 산출로 채움)<br>'
            + '<b>오프라인에도 진행됩니다</b> — 자리를 비운 사이에도 목표가 나아갑니다. 그래서 따로 나갈 파티도, 의뢰만의 전장도 없습니다<br>'
            + '카드는 <b>틀 · 등급 · 대상</b>을 굴려 섭니다 — 대상은 지금 갈 수 있는 곳에서만 나옵니다. 등급은 <b>일반 · 매직 · 레어</b> — 윗 등급일수록 드물고 목표당 골드가 좋습니다<br>'
            + '<b>수락하면 그 카드가 소진됩니다</b> — 받은 카드는 그 자리에서 진행 중이 되고, 받아 둘 수 있는 수는 선술집 랭크가 늘립니다. 그래서 「어느 의뢰를 받을까」가 결정이 됩니다<br>'
            + '<b>받은 뒤</b> 이긴 라운드의 처치와 들어온 드롭만 셉니다(가방이 차서 넘쳐 분해된 것은 빼고) · 모든 부대가 같이 채웁니다 · <b>기한은 없습니다</b><br>'
            + '다 채우면 <b>[수령]</b>으로 골드를 받습니다 · <b>[포기]</b>는 벌이 없습니다(진행만 버림) — 비는 자리에는 새 카드가 섭니다. 명성은 보류입니다',
        en: 'A commission is a <b>goal you take on</b> — no battlefield opens. Pick one from the board and it fills itself <b>on top of what you already do</b><br>'
            + 'There are <b>two kinds</b> — <b>Slay</b> ("kill x" · the battles you already run count it) and <b>Collect</b> ("gather x" · drops and dispatch/exploration yields fill it)<br>'
            + '<b>It advances offline too</b> — the goal moves while you are away. So there is no party to send and no commission-only battlefield<br>'
            + 'Each card rolls a <b>template, grade and target</b> — targets only come from places you can reach now. Grades are <b>Normal · Magic · Rare</b> — higher grades are rarer and pay more gold per goal<br>'
            + '<b>Accepting spends that card</b> — it turns into an active commission in place, and the Tavern rank raises how many you can hold. That is what makes "which one do I take" a decision<br>'
            + 'Only kills in won rounds and drops that come in <b>after you accept</b> count (items salvaged because the bag was full do not) · every party fills it · <b>there is no deadline</b><br>'
            + 'When it is full, <b>[Claim]</b> pays the gold · <b>[Abandon]</b> costs nothing but the progress — a new card takes the empty place. Fame is on hold',
    },
    'exp.zones.h': { ko: '원정 지역', en: 'Expedition Zones' },
    // 원정 지역 [개정 2026-09-29 · PLAN_stage_segments D1] — 챕터 = 장소 {p} · 장소마다 칸 I · II · III · 칸 하나가 한 런이다(도움말 · SCREEN_DESIGN §12)
    'exp.zones.sub': {
        ko: '챕터 = 장소 {p}곳 · 장소마다 칸 I · II · III — 1런 = 칸 하나 · {r}라운드 (마지막 장소는 챕터보스 단독 1라운드 한 칸)',
        en: 'A chapter = {p} areas · each area has stages I · II · III — 1 run = 1 stage · {r} rounds (the last area is a single stage: one round against the chapter boss alone)',
    },
    'exp.deploy': { ko: '보내기', en: 'Deploy' },
    'exp.foes': { ko: '적 구성', en: 'Enemies' },
    /* 적 구성 초상 아래 스킬 칸 줄의 「?」 칸 — 보스가 스폰 때 직업 풀에서 굴리는 셋째 칸 (§4-1 · ADR-0568) */
    'exp.foe.rolled': { ko: '전투마다 바뀌는 직업 스킬', en: 'Class skill — changes every fight' },
    'exp.foe.grave': { ko: '{name} — 재등장까지 {t}', en: '{name} — returns in {t}' },   // 무덤 명패의 읽는 이름 (R240 · ADR-0590)
    /* 출정 창의 칸 이름 둘 [2026-09-10 사용자 지시 · ADR-0084] — 「적 구성」·「진형」과 **같은 규격**으로 선다.
       `exp.heroes.h` 는 창 안으로 들어온 영웅 띠의 이름이다 — 탭 최상단에 있던 시절엔 이름이 없었다(패널의 첫 줄이라
       무엇인지 물을 것이 없었다). 창 안에서는 네 칸이 나란히 서므로 칸마다 이름이 있어야 경계가 읽힌다.
       `exp.go.h` 는 반복 원정 · 보내기 두 버튼이 든 칸의 이름이다 */
    'exp.go.h': { ko: '출정 방식', en: 'Departure' },
    /* 출정 창 아래 줄 오른쪽 칸의 이름 [2026-09-14 사용자 지시 · ADR-0105] — 이 스테이지의 입장 텍스트가 든다(stage.csv:story_kr/_en) */
    'exp.story.h': { ko: '이야기', en: 'Story' },
    /* 이야기 글의 `{leader}` 가 빈 파티에서 받는 대체 문구 [2026-09-15] — 괄호 없이 들어가고 뒤 조사는 이 말의 받침을 탄다 · en 은 문장 첫머리에 온다 */
    'exp.story.noLeader': { ko: '용병 하나', en: 'A mercenary' },
    'exp.zones.note': {
        ko: '지역 죄종은 해당 죄종 접사의 드롭 가중치를 올립니다 — 타겟 파밍의 축<br>'
            + '<b>구조는 고정, 내용물은 랜덤</b> — 라운드 배치는 칸 III 이 정예 {e} / 보스 {b} · <b>칸 I · II 는 {b}라운드째도 정예</b>(보스 없음)이고, 몬스터 조합·정예 특성만 매 런 새로 굴려집니다. 몬스터 · 배경 · 원소는 장소의 칸 셋이 같고 레벨은 칸마다 오릅니다. <b>마지막 장소는 챕터보스 하나와 싸우는 1라운드</b>입니다<br>'
            + '중도 귀환해도 <b>루팅은 전량 보존</b>됩니다. 비용은 <b>그 출정 동안 파티가 얇아지는 것</b> + 미클리어(다음 칸 미해금)뿐입니다',
        en: "A zone's sin raises the drop weight of that sin's affixes — the axis of target farming<br>"
            + '<b>Fixed structure, random contents</b> — stage III lays out elite {e} / boss {b}; <b>stages I · II have an elite in round {b} too</b> (no boss); only monster mixes and elite traits reroll each run. Monsters, backdrop and element are shared by an area\'s three stages, and the level rises stage by stage. <b>The last area is a single round against the chapter boss</b><br>'
            + 'Retreating early <b>keeps all loot</b>. The cost is <b>a thinner party for the rest of the run</b> plus no-clear (next stage stays locked)',
    },

    /* ── 원정: 리포트 ── */
    'rep.clear': { ko: '클리어', en: 'Cleared' },
    'rep.xp': { ko: '경험치', en: 'XP' },
    'rep.rounds': { ko: '라운드', en: 'Rounds' },
    'rep.downed': { ko: '전투 불능', en: 'Downed' },
    'rep.none': { ko: '없음', en: 'None' },
    'rep.downedN': { ko: '{n}명', en: '{n}' },
    /* ~~'rep.levelUp'~~ · ~~'rep.injuryHead'~~ 은 2026-09-10 삭제 — 레벨업과 전투불능이 **기여 표의 영웅 줄**로 들어갔다 (ADR-0086) */
    'rep.injuryNote': {
        ko: '기다릴 것이 없습니다 — <b>런이 끝나는 순간</b> 전투불능도 깎인 HP도 전원 무료로 회복됩니다. 다음 런에는 전원이 다시 나갑니다',
        en: 'Nothing to wait for — <b>the moment the run ends</b> both downed heroes and lost HP are restored, free. Everyone goes out again on the next run',
    },
    'rep.drops.h': { ko: '획득 아이템', en: 'Loot' },   // 책 · 재료도 이 격자에 선다 (ADR-0625)
    'rep.drops.sub': { ko: '{n}개', en: { one: '{n} item', other: '{n} items' } },
    'rep.drops.none': { ko: '떨어진 아이템 없음', en: 'No loot' },
    'rep.blueprint': { ko: '도안', en: 'Plan' },   // 스킬 도안 칸 배지 — 리포트 획득 격자 · 상단 도안 칸 (R293 · ADR-0680 — ~~`rep.book` 「책」~~ ADR-0420)
    'rep.matGot': { ko: '획득 {n}', en: 'Gained {n}' },   // 획득 격자의 처치 재료 칸 툴팁 아래 줄 (2026-10-06 · ADR-0530)

    /* ── 런 목록 · 기여 (리포트 개편 2026-09-09 · SCREEN_DESIGN §4-3 · ADR-0063) ── */
    'rep.list.h': { ko: '원정 기록', en: 'Runs' },
    'rep.list.sub': { ko: '{n}판', en: { one: '{n} run', other: '{n} runs' } },
    'rep.list.empty': { ko: '기록 없음', en: 'No runs' },   // 런이 없는 부대 탭 (SCREEN_DESIGN §4-3 · ADR-0622)
    // 진 런의 「왜 졌나」 — 기여 표 쓰러짐 칸 · 그 아래 남은 적 줄 (SCREEN_DESIGN §4-3 · ADR-0623). 판정 문구는 없다 — 사실만
    'rep.fall.h': { ko: '쓰러짐', en: 'Fell' },
    'rep.fall.cell': { ko: '{t} ← {who} {p}%', en: '{t} ← {who} {p}%' },
    'rep.foes': { ko: '남은 적', en: 'Enemies left' },
    'rep.foes.one': { ko: '{name} {p}%', en: '{name} {p}%' },
    'rep.foes.many': { ko: '{name} {p}% ×{n}', en: '{name} {p}% ×{n}' },
    'rep.gap': { ko: '레벨 차 {n} → 명중 −{p}%', en: 'Level gap {n} → Hit −{p}%' },
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
    /* 영웅 줄의 레벨업 — 초상 오른쪽 이름 아래 (ADR-0086). 이름은 그 줄이 이미 들어서 안 적는다 */
    'rep.contrib.levelUp': { ko: '▲ Lv.{a} → {b}', en: '▲ Lv.{a} → {b}' },
    'rep.contrib.xp': { ko: '경험치 {n}', en: '{n} XP' },
    'rep.log.sub': { ko: '정예 {e} / 보스 {b}', en: 'Elite {e} / Boss {b}' },
    'rep.contract': {
        ko: '방치형 계약 — 자리를 비워도 영웅 로스터는 파괴되지 않습니다. 사건은 리포트 안에서 완결',
        en: 'The idle-game contract — the roster is never destroyed while you are away. Every event resolves inside the report',
    },

    /* ── 영웅 띠 (캐릭터·스킬·선술집 공통 상단, 2026-08-26) — 초상화 + 이름 + 지금 하는 일 ── */
    'hs.doing.idle': { ko: '대기 중', en: 'Idle' },
    /* 원정이 **실제로 도는 동안**만 뜬다 [신설 2026-09-08 사용자 지시] — 파티에 편성만 해 둔 상태는 대기다 (SCREEN_DESIGN §5) */
    'hs.doing.expedition': { ko: '원정 중', en: 'On expedition' },
    /* 수색 중 [신설 2026-09-09] — 나가 있으면 편성이 막히므로(state.js:toggleParty) 띠가 그 이유를 든다 */
    'hs.doing.advance': { ko: '전직 중', en: 'Advancing' },
    'hs.doing.explore': { ko: '탐험 중', en: 'Exploring' },
    /* ~~'hs.doing.out'(출정 아웃)~~ 은 2026-09-08 삭제 — 띠의 「지금 하는 일」은 **대기 하나**다 (SCREEN_DESIGN §5) */

    /* ── 장비 ── */
    'eq.slots': { ko: '장비는 8칸 — 무기 · 투구 · 갑옷 · 장갑 · 신발 · 목걸이 · 반지 2. 모든 무기는 양손이라 잠기는 칸이 없습니다', en: '8 gear slots — weapon, helm, armor, gloves, boots, amulet, 2 rings. Every weapon is two-handed, so no slot is ever locked' },
    'st.atk': { ko: '데미지', en: 'Damage' },
    // 범위 표기 — 무기 피해 · 스킬 피해 · 회복량 (R90 · SCREEN_DESIGN §2 · §6 · ADR-0108). 양끝이 같으면 이 틀을 안 쓰고 한 수만 찍는다
    'st.range': { ko: '{a}~{b}', en: '{a}–{b}' },
    'st.atkType.physical': { ko: '물리', en: 'Physical' },
    'st.atkType.magic': { ko: '마법', en: 'Magic' },
    'st.atkType.fire': { ko: '화염', en: 'Fire' },
    'st.atkType.cold': { ko: '냉기', en: 'Cold' },
    'st.atkType.lightning': { ko: '전기', en: 'Lightning' },
    'st.atkType.poison': { ko: '독', en: 'Poison' },
    // 고정 피해 — 사제의 직격(skill_effect 원소 칸 `fixed` · 2026-10-06 R221 · battle_design §9). 설명창 「{v} 의 고정 피해」 · 종류 칩이 이 이름을 쓴다
    'st.atkType.fixed': { ko: '고정', en: 'True' },
    'st.mitigation': { ko: '감쇠 {p}%', en: '{p}% mitigated' },
    // 세부 옵션 — 옵션이 여는 축 줄 (combat_stat 행이 아니다 · SCREEN_DESIGN §6 · ADR-0291). 한 줄짜리는 아이템 옵션 줄 이름(`M.AFFIX_LABELS`)을 그대로 쓴다
    'st.fx.part': { ko: '{n} {v}', en: '{n} {v}' },
    'st.fx.vsTarget': { ko: '정예 · 열별 추가 데미지', en: 'Damage vs Elite & Row' },   // 「별」 — 받는 피해 감소 줄과 짝 (2026-09-28 사용자 지시)
    'st.fx.drType': { ko: '타입별 받는 피해 감소', en: 'Damage Reduction vs Type' },
    'st.fx.drTarget': { ko: '정예 · 열별 받는 피해 감소', en: 'Damage Reduction vs Elite & Row' },
    'st.fx.normal': { ko: '일반', en: 'Normal' },
    'st.fx.demon': { ko: '데몬', en: 'Demon' },
    'st.fx.undead': { ko: '언데드', en: 'Undead' },
    'st.fx.ele': { ko: '원소 피해량 증가', en: 'Elemental Damage Increase' },
    'st.fx.resRed': { ko: '적 원소 저항 감소', en: 'Enemy Resist Reduction' },   // 화염/냉기/전기/독 네 값 (2026-09-28 사용자 지시) · 영어는 「Elemental」을 뺐다 — 두 줄로 꺾여 칸 바닥에 닿았다(저항은 원소뿐이다)
    'st.fx.fire': { ko: '화염', en: 'Fire' },
    'st.fx.cold': { ko: '냉기', en: 'Cold' },
    'st.fx.lightning': { ko: '전기', en: 'Lightning' },
    'st.fx.poison': { ko: '독', en: 'Poison' },
    'st.resCap': { ko: '/ 상한 {cap}%', en: '/ cap {cap}%' },
    'st.maxhp': { ko: '최대 HP', en: 'Max HP' },
    /* 능력치 설명 카드 — 줄에 올리면 이름 / 선 아래 **효과** (2026-10-10 사용자 지시 · SCREEN_DESIGN §2 「능력치 설명 툴팁 규격」 · ADR-0581).
       키 = 줄 id(기본 능력치 `hero_attribute.csv:attr_id` · 세부 옵션 `tip.js:DETAIL_LAYOUT`). 효과만 · 수치 없음 (CLAUDE.md 규칙 7) · 효과가 여럿이면 `<br>` 로 한 줄에 하나 */
    // 힘 · 지능 · 건강의 「채광 · 채집 · 벌목이 빨라진다」 줄은 2026-10-18 걷었다 — 연구소에 영웅이 안 앉는다 (ADR-0665)
    'st.desc.str': { ko: '평타 · 물리 스킬 피해 증가', en: 'Increases basic attack and physical skill damage' },
    'st.desc.agi': { ko: '공격 속도 · 캐스팅 속도 증가<br>일부 스킬의 타수 · 효과 증가', en: 'Faster attack and casting speed<br>More hits and stronger effects for some skills' },
    'st.desc.int': { ko: '마법 스킬 피해 증가', en: 'Increases magic skill damage' },
    'st.desc.vit': { ko: '레벨업마다 오르는 최대 HP 증가<br>버프 지속시간 증가', en: 'More Max HP per level-up<br>Longer-lasting buffs' },
    'st.desc.luck': { ko: '치명타 피해 · 드랍률 · 골드 획득 증가<br>일부 스킬의 추가 피해 증가', en: 'Increases Crit Damage, Item Find and Gold Find<br>Boosts bonus damage of some skills' },
    'st.desc.ldr': { ko: '아군에게 거는 버프 강화 · 리더면 파티 전술 효과 증가', en: 'Strengthens the buffs you give allies · As leader, strengthens party tactics' },
    'st.desc.cha': { ko: '회복량 · 적에게 거는 효과 증가 · 받는 상태이상 · 디버프 시간 감소', en: 'Increases healing and the effects you put on enemies · Shortens ailments and debuffs on you' },
    'st.desc.atk_physical': { ko: '평타와 물리 스킬 피해의 바탕이 되는 값', en: 'The base of basic attack and physical skill damage' },
    'st.desc.atk_magic': { ko: '마법 스킬 피해와 회복량의 바탕이 되는 값', en: 'The base of magic skill damage and healing' },
    'st.desc.action_period': { ko: '한 번 행동하는 데 걸리는 시간 — 짧을수록 자주 행동', en: 'Time per action — the lower, the more often you act' },
    'st.desc.hp_max': { ko: 'HP 의 최대치 — 0 이 되면 쓰러짐', en: 'Maximum HP — the hero falls at 0' },
    'st.desc.crit_rate': { ko: '공격이 치명타로 들어갈 확률', en: 'Chance for an attack to be a critical hit' },
    'st.desc.crit_damage': { ko: '치명타가 주는 피해 배율', en: 'Damage multiplier of critical hits' },
    'st.desc.def_ignore': { ko: '적의 물리 방어를 이 비율만큼 무시', en: "Ignores this share of the enemy's Physical Defense" },
    'st.desc.cooldown_reduction': { ko: '스킬 쿨타임을 이 비율만큼 감소', en: 'Shortens skill cooldowns by this %' },
    'st.desc.defense': { ko: '받는 물리 피해 감소 — 옆의 감쇠 % 만큼 덜 받음', en: 'Reduces physical damage taken — by the mitigation % beside it' },
    'st.desc.damage_reduction': { ko: '받는 피해를 % 만큼 줄이고 고정값만큼 더 뺌 (고정 / %)', en: 'Cuts damage taken by the %, then subtracts the flat amount (flat / %)' },
    'st.desc.fhr': { ko: '물리 공격에 맞아 경직되는 시간 감소', en: 'Shortens the stagger from physical hits' },
    // 매력이 낸다 (2026-10-24 · R346 · ADR-0770) — 음수면 늘어난다
    'st.desc.debuff_dur_reduction': { ko: '받는 상태이상 · 디버프 시간 감소', en: 'Shortens ailments and debuffs on you' },
    'st.desc.res_fire': { ko: '받는 화염 피해를 이 % 만큼 감소 — 옆의 상한까지', en: 'Reduces Fire damage taken by this % — up to the cap beside it' },
    'st.desc.res_cold': { ko: '받는 냉기 피해를 이 % 만큼 감소 — 옆의 상한까지', en: 'Reduces Cold damage taken by this % — up to the cap beside it' },
    'st.desc.res_lightning': { ko: '받는 전기 피해를 이 % 만큼 감소 — 옆의 상한까지', en: 'Reduces Lightning damage taken by this % — up to the cap beside it' },
    'st.desc.res_poison': { ko: '받는 독 피해를 이 % 만큼 감소 — 옆의 상한까지', en: 'Reduces Poison damage taken by this % — up to the cap beside it' },
    'st.desc.fx_ele': { ko: '원소마다 화염 · 냉기 · 전기 · 독 피해 증가', en: 'Increases Fire / Cold / Lightning / Poison damage, each on its own' },
    'st.desc.fx_res_red': { ko: '그 원소로 때릴 때 적의 저항을 이만큼 감소', en: "Lowers the enemy's resistance when you hit with that element" },
    'st.desc.fx_vs_type': { ko: '일반 · 데몬 · 언데드 적에게 주는 피해 증가', en: 'More damage to Normal, Demon and Undead enemies' },
    'st.desc.fx_dr_type': { ko: '일반 · 데몬 · 언데드 적에게 받는 피해 감소', en: 'Less damage taken from Normal, Demon and Undead enemies' },
    'st.desc.fx_vs_target': { ko: '정예 · 보스와 전열 · 후열 적에게 주는 피해 증가', en: 'More damage to Elites & Bosses and to front / back row enemies' },
    'st.desc.fx_dr_target': { ko: '정예 · 보스와 전열 · 후열 적에게 받는 피해 감소', en: 'Less damage taken from Elites & Bosses and from front / back row enemies' },
    'st.desc.fx_crush': { ko: '맞힐 때 대상의 현재 HP 에 비례한 피해 추가', en: "Hits add damage based on the target's current HP" },
    'st.desc.fx_hit': { ko: '공격이 맞을 확률 증가', en: 'Raises the chance for attacks to hit' },
    'st.desc.fx_counter': { ko: '맞으면 이 확률로 때린 적에게 기본 공격으로 반격', en: 'Chance to strike back with a basic attack when hit' },
    'st.desc.reflect_damage': { ko: '받은 피해의 이 % 를 때린 적에게 반사', en: 'Returns this % of damage taken to the attacker' },
    'st.desc.life_steal': { ko: '준 피해의 이 % 만큼 HP 회복', en: 'Heals for this % of damage dealt' },
    'st.desc.hp_regen': { ko: '초마다 HP 를 이만큼 회복', en: 'Restores this much HP every second' },
    'st.desc.fx_recv': { ko: '받는 회복량 증가', en: 'Increases healing received' },
    'st.desc.fx_buff_dur': { ko: '내가 거는 버프와 적에게 거는 효과의 지속시간 증가', en: 'Your buffs and the effects you put on enemies last longer' },
    'st.desc.item_find': { ko: '적이 떨어뜨리는 아이템 증가', en: 'Enemies drop more items' },
    'st.desc.fx_magic_find': { ko: '더 높은 등급의 아이템이 나올 확률 증가', en: 'Higher-rarity items drop more often' },
    'st.desc.gold_find': { ko: '적에게서 얻는 골드 증가', en: 'More gold from enemies' },
    'st.desc.fx_xp': { ko: '얻는 경험치 증가', en: 'More experience gained' },
    'eq.sins.h': { ko: '접사 죄종', en: 'Affix Sins' },
    'eq.sins.note': {
        ko: '착용 장비의 죄종 — 아이템 이름에 붙은 죄종 태그(접두 · 접미)입니다. <b>파티 전술</b>이 이 수를 셉니다<br>'
            + '<b>죄종 세트효과는 폐기</b> — 파티 전술로 이관',
        en: 'Sins on worn gear — the sin tags in item names (prefix and suffix). <b>Party tactics</b> count them<br>'
            + '<b>Sin set effects are dropped</b> — they moved to party tactics',
    },
    'eq.sins.none': { ko: '접사 없음', en: 'No affixes' },
    'eq.filter.all': { ko: '전체', en: 'All' },
    'eq.inv.note': {
        ko: '칸에 마우스를 올리면 <b>착용 중인 장비와 나란히</b> 비교됩니다. 테두리 색 = 희귀도',
        en: 'Hover a cell to compare it <b>side by side with the equipped item</b>. Border color = rarity',
    },

    /* ── 캐릭터 탭 (2026-08-23 개편) — 영웅 띠 / 장비·전체·세부·스킬 4칸 / 아이템 가로 ── */
    'ch.gear.h': { ko: '장비', en: 'Equipment' },
    // 장비 칸 제목 오른쪽 끝 [자동 장착] (§6 · ADR-0712 · 2026-10-22) — `ch.auto.*` 는 자동 분해 창의 것이라 접두를 가른다
    'ch.autoEq': { ko: '자동 장착', en: 'Auto-equip' },
    'ch.autoEq.done': { ko: '장비 {n}개 장착', en: { one: 'Equipped {n} item', other: 'Equipped {n} items' } },
    'ch.autoEq.none': { ko: '더 나은 장비 없음', en: 'No better gear' },
    'ch.attr.h': { ko: '기본 옵션', en: 'Basic Stats' },
    'ch.attr.sub': { ko: '장비 불변', en: 'Gear-immutable' },
    'ch.attr.note': {
        ko: '기본 능력치 7종은 <b>영웅이 갖고 태어납니다</b> — 장비는 단 1도 올리지 않습니다.<br>'
            + '하는 일은 둘뿐입니다: <b>전투 능력치의 계수</b>(오른쪽 칸의 괄호 표기)와 <b>파견 판정</b>.',
        en: 'The 7 attributes are <b>innate to the hero</b> — gear never raises them by even 1.<br>'
            + 'They do exactly two things: <b>scale combat stats</b> (shown in parentheses on the right) '
            + 'and <b>decide dispatch outcomes</b>.',
    },
    'ch.detail.h': { ko: '세부 옵션', en: 'Detailed Stats' },
    'ch.detail.hn': { ko: '세부 옵션 {n}', en: 'Detailed Stats {n}' },
    'ch.detail.note': {
        ko: '전투 능력치는 <b>장비와 스킬이 만듭니다</b>. 값이 <b>—</b> 인 축은 0이 아니라 '
            + '<b>아직 아무것도 그 축을 건드리지 않았다</b>는 뜻입니다 — 비어 있는 축이 곧 다음 장비의 자리입니다.<br>'
            + '괄호 안 약어 = 이 축을 미는 기본 능력치. 표는 src/data/combat_stat.csv 를 그대로 따릅니다',
        en: 'Combat stats are <b>built by gear and skills</b>. A <b>—</b> is not zero — it means '
            + '<b>nothing has touched that axis yet</b>, and an empty axis is where the next item goes.<br>'
            + 'The abbreviation in parentheses is the attribute that scales it. This table mirrors src/data/combat_stat.csv',
    },
    // 기본 옵션 칸 맨 위 — 레벨 · 경험치 한 줄 (2026-09-15 · SCREEN_DESIGN §6 · ADR-0129)
    'ch.lv': { ko: 'Lv.{n}', en: 'Lv.{n}' },
    'ch.xp': { ko: '경험치 {a} / {b}', en: 'XP {a} / {b}' },
    'ch.xp.max': { ko: 'MAX', en: 'MAX' },
    // 아이템 칸 오른쪽 아래 배지 — **아이템** 레벨이다 (2026-09-18 · SCREEN_DESIGN §6 · ADR-0168).
    //   위의 `ch.lv`(영웅 레벨)와 글자가 같아도 가리키는 것이 달라 키를 나눈다
    'ch.itemLv': { ko: 'Lv.{n}', en: 'Lv.{n}' },
    'ch.skill.h': { ko: '액티브 스킬', en: 'Active Skills' },
    'ch.skill.go': { ko: '마스터리 열기', en: 'Open Mastery' },
    'ch.items.h': { ko: '아이템', en: 'Items' },

    /* ── 툴팁 ── */
    'tip.equipped': { ko: '착용 중', en: 'Equipped' },
    'tip.this': { ko: '이 아이템', en: 'This Item' },
    // 교체될 자리가 빈 경우 — 옛 판의 「비어 있음」 빈 카드 한 장을 대신하는 하단 힌트 한 줄 (SCREEN_DESIGN §6 개정 2026-09-08)
    'tip.noneEquipped': { ko: '착용 중 없음', en: 'Nothing equipped' },
    'tip.noAffix': { ko: '접사 없음', en: 'No affixes' },
    // 머리글 오른쪽 끝 종류 — 투구 · 장갑 · 신발은 갈래 + 부위(`가죽 장갑`) · 갈래 id 가 부위마다 겹쳐 갈래만으론 못 읽는다 (§6 · ADR-0526)
    'tip.kindPart': { ko: '{group} {part}', en: '{group} {part}' },
    /* 목걸이 발동 스킬 줄 [신설 2026-09-21 · §6 · ADR-0213] — 발동 조건은 베이스가 정한다(amulet_proc.csv). {p} = 확률(% 포함) · {sec} = 간격 초 · {skill} = 스킬 이름.
       ⚠ 발동은 전투에 아직 안 걸린다 — 줄 끝에 `tip.inert` 가 붙는다 */
    'tip.proc.hit': { ko: '타격 시 {p} 확률로 {skill} 발동', en: '{p} chance to cast {skill} on hit' },
    'tip.proc.struck': { ko: '피격 시 {p} 확률로 {skill} 발동', en: '{p} chance to cast {skill} when struck' },
    'tip.proc.cast': { ko: '시전 시 {p} 확률로 {skill} 발동', en: '{p} chance to cast {skill} on cast' },   // 마법 무기 발동 옵션 (2026-10-05 · R208)
    'tip.proc.interval': { ko: '{sec}초마다 {skill} 발동', en: 'Casts {skill} every {sec}s' },
    'tip.inert': { ko: '(미적용)', en: '(inactive)' },
    /* 특정 스킬 +n 줄 [신설 2026-10-08 · §6 · ADR-0535 · R225] — {skill} = 스킬 이름 · {v} = 단계 수 */
    'tip.skillPlus': { ko: '{skill} +{v}', en: '+{v} to {skill}' },
    /* 스킬 칸 [신설 2026-09-09 · §6] — 무기가 액티브 한 칸을 통째로 정하므로(skill_design §12-1 규칙 3)
       공격력만 보고 무기를 고르지 않게 툴팁이 그것을 말한다. 칸은 스킬 설명창 몸통 그대로라 문구도 설명창 키를 쓴다.
       ~~`tip.skill`~~(「담은 스킬」 라벨)은 2026-09-15 삭제 [사용자 지시 · ADR-0139] */
    // 옵션 출처 태그 (SCREEN_DESIGN §6 · ADR-0100) — 셋이다: 베이스 옵션(그 부위면 무조건) · 죄종 이름(죄종 칸 — 문구는 `mock.js:SINS`) · 랜덤(통합옵션).
    // 출처가 없는 옛 접사는 랜덤으로 찍는다 (2026-09-08 신설 · 2026-09-11 셋으로 — R78)
    'tip.src.random': { ko: '랜덤', en: 'Random' },
    'tip.src.fixed': { ko: '베이스', en: 'Base' },
    'tip.ringSlot': { ko: '반지 {n}번 칸에 착용', en: 'Goes on ring slot {n}' },
    'tip.tacticOff': { ko: '끼우면 전술 꺼짐 — {eff}', en: 'Equipping turns a tactic off — {eff}' },
    // 아이템 툴팁 각주 — 기본은 착용품과 비교 두 장이고 Alt 동안 「이 아이템」 카드에 착용 델타가 선다 (SCREEN_DESIGN §6 · 2026-10-18 · ADR-0658)
    'tip.item.altHint': { ko: 'Alt 변화', en: 'Alt: changes' },
    // Shift 범위 각주 — 비교가 있는 카드는 둘을 한 줄에 · 범위를 다는 줄이 없는 카드엔 안 선다 (SCREEN_DESIGN §6 · ADR-0617)
    'tip.item.shiftHint': { ko: 'Shift 범위', en: 'Shift: range' },
    'tip.item.keysHint': { ko: 'Alt 변화 · Shift 범위', en: 'Alt: changes · Shift: range' },
    'tip.range': { ko: '({r})', en: '({r})' },
    // 착용 델타 — 「이 아이템」 카드의 옵션 아래 (SCREEN_DESIGN §6 · ADR-0618). 조사가 받침에 따라 갈리지 않게 「착용 시」
    'tip.delta.h': { ko: '{name} 착용 시', en: 'If {name} equips' },
    'tip.delta.none': { ko: '변화 없음', en: 'No change' },
    // 착용 델타 맨 위의 스킬 줄 값 — 「라이트닝 · 켜짐 → 꺼짐 ▼」 (SCREEN_DESIGN §6 · ADR-0639)
    'tip.delta.on': { ko: '켜짐', en: 'On' },
    'tip.delta.off': { ko: '꺼짐', en: 'Off' },
    // ~~`tip.up.first`·`tip.up.next`~~ 는 2026-09-08 삭제 [사용자 지시] — 툴팁의 강화 줄이 통째로 죽었다.
    // 단계는 이름 앞의 `+n` 이 들고, 비용·상한은 대장간(SCREEN_DESIGN §8-2)의 값이다. `tip.up.option` 은 09-08 에 먼저 죽었다.
    // ⚠ 옛 `tip.up.max` 는 **안 죽었다** — 대장간이 쓰고 있어 `fg.` 접두로 옮겼다(툴팁 전용이 아니게 됐으므로)
    // 영웅 · 스킬 툴팁 (2026-08-28) — 영웅 띠와 관전 유닛 카드가 같이 쓴다 (ui/tip.js)
    // ~~tip.hero.h · tip.monster.h~~ (「영웅」 · 「몬스터」 머리글) 는 2026-09-15 삭제 — 유닛 툴팁은 머리글이 없다 (ADR-0115)
    'tip.unit.altHint': { ko: 'Alt 세부 옵션', en: 'Alt: detailed stats' },   // 유닛 툴팁 각주 — 열 이름은 캐릭터 탭 키(ch.attr.h · ch.detail.h) 재사용 (ADR-0114)
    'tip.unit.altHintGear': { ko: 'Alt 장비 · 세부 옵션', en: 'Alt: gear & detailed stats' },   // 편성 탭 영웅 툴팁 각주 — 첫 장이 기본 옵션이라 Alt 가 장비까지 연다 (ADR-0284)
    /* 물약 카드 [신설 2026-09-24 · SCREEN_DESIGN §2 「물약 툴팁 규격」 · ADR-0315] — 창 뱃지 툴팁과 같은 모양: 그림 + 이름 / 효과 한 줄 (CLAUDE.md 규칙 7).
       이름은 `potion.csv` · 빈 칸은 `pt.potion.empty` · 효과 줄이 이 키 하나다 — 창 뱃지의 `bt.effect.*` 와 같은 말투 */
    'tip.potion.heal': { ko: 'HP {n} 회복', en: 'Restores {n} HP' },

    /* ── 스킬 ── */
    /* ── 연구 탭 — 파티 전술 (2026-08-30 · SCREEN_DESIGN §13) ── */
    /* ── 편성 탭 (SCREEN_DESIGN §15 · 2026-09-21) — 오류는 결과 코드와 짝을 맞춘다(`pt.err.<코드>` — toggleParty · setPotionSlot · swapPotionSlot · rerollTactic · toggleTacticLock) ── */
    'pt.preset': { ko: 'Party {n}', en: 'Party {n}' },   // 원정 세그먼트의 부대 칸과 같은 이름 — ko 에서도 영어 · `{n}` 은 로마 숫자 [2026-09-24 사용자 지시 · §15]
    'pt.potion.h': { ko: '물약', en: 'Potions' },
    'pt.potion.stock': { ko: '가진 물약', en: 'In stock' },
    'pt.potion.empty': { ko: '빈 칸', en: 'Empty slot' },
    // 소제목 옆 `?` 에 올리면 서는 설명 툴팁의 본문 — 한두 문장만 · 자세한 규칙은 도움말 탭 (§15 · ADR-0464)
    'pt.help.form': { ko: '적은 전열부터 공격합니다. 전열이 모두 쓰러져야 후열이 공격받습니다.', en: 'Enemies attack the front row first. The back row is attacked only after the whole front row has fallen.' },
    'pt.help.potion': { ko: 'HP가 {n}% 아래로 떨어진 영웅이 자동으로 물약을 마십니다.', en: 'A hero whose HP falls below {n}% drinks a potion automatically.' },
    // ~~`pt.potion.short`~~ (「모자람 — 런에서 빈 채 시작한다」) 는 2026-09-24 삭제 — 툴팁은 효과만 든다(CLAUDE.md 규칙 7). 모자란 칸은 칸이 흐린 점선으로 말한다
    'pt.err.full': { ko: '파티 가득 참', en: 'Party full' },
    'pt.err.exploring': { ko: '탐험 귀환', en: 'Return from exploring', lock: true },
    'pt.err.missing': { ko: '없는 칸', en: 'No such slot' },
    'pt.err.slotsFull': { ko: '물약 칸 가득 참', en: 'All potion slots are full' },
    'pt.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'pt.err.allLocked': { ko: '굴릴 칸 없음 — 전부 잠김', en: 'Nothing to reroll — every slot is locked' },
    'rs.h': { ko: '파티 전술', en: 'Party Tactics' },
    /* 건설 [2026-09-22 · R137 · SCREEN_DESIGN §13 · ADR-0302] — 표 넷을 그대로 그린다. 여는 것 문장은 **대상마다 한 키**(`cn.t.<대상>` —
       어휘는 `game_logic/construction.js:TARGETS`) · 더하기는 `+{n}`. 조건 · 비용 · 잠긴 자리의 「무엇을 지어야 하나」도 여기 */
    'cn.rank': { ko: '{n}랭크', en: 'Rank {n}' },
    'cn.rank.no': { ko: '랭크 {n}', en: 'Rank {n}' },   // 상세 머리 상태 · 「다음 랭크」 · 랭크 목록의 번호 — `{n}` 은 로마 숫자(`M.roman`) · SCREEN_DESIGN §13-1
    'cn.need': { ko: '{b} {n}랭크', en: '{b} rank {n}', lock: true },   // 잠긴 자리의 한 줄 — 자물쇠 + 여는 조건 한 토막 (§13-1 · ADR-0699) · 첫 랭크는 아래 「건설」
    'cn.needBuild': { ko: '{b} 건설', en: 'Build {b}', lock: true },   // 첫 랭크 = 짓기 — 「도서관 건설」 · 흐린 탭을 누를 때도 이 키 (§1 · ADR-0699 — ~~`nav.unbuilt`~~)
    'cn.pending': { ko: '준비 중', en: 'Coming later', lock: true },
    'cn.soon': { ko: '(준비 중)', en: '(later)' },
    'cn.free': { ko: '무료', en: 'Free' },
    // 상세의 세 절 — 머리 상태 한 줄 · 「다음 랭크」 · 「{건물} 랭크」 목록 [2026-09-24 · SCREEN_DESIGN §13-1 · ADR-0323]
    'cn.state.none': { ko: '미건설', en: 'Not built' },
    'cn.state.max': { ko: '최대 랭크', en: 'Max rank' },
    'cn.next.h': { ko: '다음 랭크', en: 'Next Rank' },
    'cn.now.none': { ko: '아직 지은 랭크 없음', en: 'Nothing built yet' },
    'cn.ranks.h': { ko: '{b} 랭크', en: '{b} Ranks' },
    'cn.owned': { ko: '보유 {n}', en: 'Owned {n}' },
    'cn.built': { ko: '{b} {n}랭크 건설 완료', en: 'Built {b} rank {n}' },
    'cn.req.stage': { ko: '스테이지 {s} 클리어', en: 'Clear Stage {s}' },   // 「스테이지」 를 앞에 명시 (2026-09-27 사용자 지시)
    // 장 · 난이도 클리어 — 탐험 건물 [2026-10-27 사용자 「챕터 1 클리어」 · 「노말 클리어」 · ADR-0909] · {d} = 난이도 이름(difficulty_tier.csv)
    'cn.req.chapter': { ko: '챕터 {n} 클리어', en: 'Clear Chapter {n}' },
    'cn.req.difficulty': { ko: '{d} 클리어', en: 'Clear {d}' },
    // 단을 적은 장 — 선술집 r4 ~ r7 [2026-10-27 사용자 「나이트메어 챕터1~나이트메어챕터4」 · R363]
    'cn.req.chapterIn': { ko: '{d} 챕터 {n} 클리어', en: 'Clear {d} Chapter {n}' },
    'cn.req.total': { ko: '합산 레벨 {have} / {need}', en: 'Total level {have} / {need}' },
    'cn.req.hero': { ko: '최고 영웅 Lv.{have} / {need}', en: 'Top hero Lv.{have} / {need}' },
    'cn.req.building': { ko: '{b} {n}랭크', en: '{b} rank {n}' },
    'cn.req.built': { ko: '{b} 건설', en: 'Build {b}' },   // 다른 건물의 첫 랭크 — 선술집 r1 「상단 건설」 (2026-10-27 사용자 「영웅고용 - 상단 건설 필요」 · R363)
    // 거절 코드 — construct 의 err (INTERFACE §3)
    'cn.err.missing': { ko: '없는 건물', en: 'Unknown building' },
    'cn.err.maxRank': { ko: '최대 랭크', en: 'Fully built' },
    'cn.err.pending': { ko: '아직 여는 기능 없음', en: 'Nothing to open yet' },
    'cn.err.locked': { ko: '조건 미달', en: 'Requirements not met', lock: true },
    'cn.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'cn.err.materials': { ko: '재료 부족', en: 'Not enough materials' },
    // 여는 것 설명 — 「무엇을 할 수 있게 되나」 한 문장 · 대상마다 한 키 · 효과만(조건 · 절차는 안 적는다) [2026-09-24 사용자 지시 · ADR-0325 — 옛 값은 기능 이름]
    // 대장간 랭크 I 의 둘은 문장이 아니라 이름 토막 [2026-09-24 사용자 지시 「장비 강화, 장비 제작 이렇게만」 · 시험 중 — SCREEN_DESIGN §13-1]
    'cn.t.upgrade_item': { ko: '장비 강화', en: 'Equipment Upgrade' },
    'cn.t.make': { ko: '장비 제작', en: 'Equipment Smithing' },
    'cn.t.synth': { ko: '재료 합성', en: 'Material Combining' },
    'cn.t.potion': { ko: '물약 제작', en: 'Potion Brewing' },   // 대장간 r2 — 물약 1단계를 함께 연다 (2026-09-24 사용자 지시)
    // ~~'cn.t.storage'~~ 은 2026-10-27 삭제 — 가방 · 창고 칸은 건물 밖이다(처음부터 열림 · R361)
    'cn.t.lab_res': { ko: '연구소 자원 생산', en: 'Laboratory resource production' },   // 창고 r1 — 연구소 「자원」 줄을 연다 (R361)
    'cn.t.codex': { ko: '만난 몬스터를 도감에 기록', en: 'Record monsters you meet in the codex' },
    // 선술집의 켜기도 이름 토막 [2026-09-25 사용자 지시 「영웅고용, 영웅수색」 · 「의뢰오픈」 · 대장간과 같은 시험 중 — SCREEN_DESIGN §13-1]
    'cn.t.hire': { ko: '영웅 고용', en: 'Hero Hiring' },
    'cn.t.shop': { ko: '상단에서 장비 · 재료 구매', en: 'Buy gear and materials at the trading house' },
    'cn.t.shop_special': { ko: '특수상단 방문', en: 'The special merchant starts visiting' },
    'cn.t.craft': { ko: '매직 장비에 전용 옵션 추가', en: 'Add a special option to magic gear' },
    'cn.t.stigma_craft': { ko: '낙인으로 장비 크래프트', en: 'Craft equipment with stigmas' },
    'cn.t.skill_card': { ko: '스킬 카드 합성', en: 'Fuse skill cards' },
    'cn.t.skillbook': { ko: '스킬북으로 스킬 습득', en: 'Learn skills from skill books' },   // 도서관 r2 (R179 · 2026-10-27 R364 · construction_draft §2)
    'cn.t.book_craft': { ko: '스킬북 제작', en: 'Craft skill books' },   // 도서관 r2 (2026-10-16 · R263 — 도안이 열린 책 · ~~기본 책~~ 10-12)
    'cn.t.explore': { ko: '파티를 탐험에 파견', en: 'Send a party to explore' },
    // 탐험 r2 · r3 — 지도에 그 지점 아이콘이 생긴다 [2026-10-27 사용자 「상단 오픈」 · 「폐허 오픈」 · ADR-0908]
    'cn.t.explore_caravan': { ko: '상단 오픈', en: 'Unlocks Caravan' },
    'cn.t.explore_ruins': { ko: '폐허 오픈', en: 'Unlocks Ruins' },
    'cn.t.raid': { ko: '목표를 털어 전리품 획득', en: 'Raid a target for loot' },
    'cn.t.escort': { ko: '의뢰인의 상단 호위', en: "Escort a client's caravan" },
    'cn.t.gear_set': { ko: '장비 한 벌을 저장해 바로 갈아입기', en: 'Save a gear loadout and swap instantly' },
    'cn.t.monster_card': { ko: '몬스터 카드 수집', en: 'Collect monster cards' },
    'cn.t.commission_board': { ko: '의뢰 게시판', en: 'Commission Board' },   // 선술집 r2 (이름 토막 — 위 선술집 줄과 같다 · 2026-09-25)
    'cn.t.gamble': { ko: '도박장', en: 'Gambling Hall' },   // 선술집 r3 — 2026-10-27 R363 (이름 토막 — 위 선술집 줄과 같다 · 2026-09-27 사용자 지시)
    'cn.t.advance': { ko: '영웅 전직', en: "Advance a hero's class" },
    'cn.t.skill_depth': { ko: '영웅 스킬에 포인트 추가', en: 'Invest more points into hero skills' },
    // 더하기는 「대상 +n」 한 토막 — 서술형 문장으로 늘리지 않는다 (ADR-0329) · 「증가」 도 안 붙인다 — 「+」 가 이미 말한다 (ADR-0351)
    'cn.t.bag': { ko: '가방 칸 +{n}', en: 'Bag slots +{n}' },
    'cn.t.stash': { ko: '창고 칸 +{n}', en: 'Stash slots +{n}' },
    'cn.t.roster': { ko: '영웅 로스터 +{n}', en: 'Hero roster +{n}' },
    'cn.t.presets': { ko: 'Party +{n}', en: 'Party +{n}' },   // 모든 언어에서 「Party」 (2026-10-27 사용자 지시 · ADR-0910)
    'cn.t.potionSlots': { ko: '원정 물약 칸 +{n}', en: 'Expedition potion slots +{n}' },
    'cn.t.upgrade': { ko: '강화 상한 +{n}', en: 'Upgrade cap +{n}' },
    'cn.t.shopPerSlot': { ko: '상단 부위별 품목 +{n}', en: 'Wares per slot +{n}' },
    'cn.t.shopWeapon': { ko: '상단 무기 품목 +{n}', en: 'Weapon wares +{n}' },
    'cn.t.make_level': { ko: '제작 레벨 +{n}', en: 'Smithing level +{n}' },
    'cn.t.potion_tier': { ko: '물약 단계 +{n}', en: 'Potion tier +{n}' },
    // 전술 칸도 장처럼 누적 번호 — `{total}` = 그 랭크까지 연 칸 수 (SCREEN_DESIGN §13-1 · 2026-09-27 사용자 지시 「파티 전술 레벨1 해금」)
    'cn.t.tactic_slots': { ko: '파티 전술 레벨 {total} 해금', en: 'Unlocks Party Tactics Level {total}' },
    'cn.t.codex_level': { ko: '도감 Lv{total} 해금', en: 'Unlocks Codex Level {total}' },   // 도서관 r4 · r5 · r6 — {total} = 그 랭크까지 연 도감 단계(r1 의 도감이 Lv1 을 심는다 · 2026-10-24 · R339)
    'cn.t.make_kinds': { ko: '제작 종류 +{n}', en: 'Craftable types +{n}' },
    // 연구소 랭크 — `{total}` = 그 랭크(랭크마다 1 · 그 랭크의 지점이 열린다 · 2026-10-25 R356 — ~~채광 · 채집 · 벌목 n단계~~ 재료에 단계가 없다)
    'cn.t.resource_tier': { ko: '연구소 {total}랭크 지점 해금 · 자동 생산', en: 'Unlocks Laboratory Rank {total} nodes · Automatic production' },
    'cn.t.lab_open': { ko: '연구소 개방', en: 'Laboratory Opens' },   // 연구소 랭크 I — 줄을 안 연다(줄은 관련 건물이 연다 · 2026-10-27 사용자 지시 · R361)
    'cn.t.shop_layers': { ko: '상단 품목 층 +{n}', en: 'Ware tiers +{n}' },
    'cn.t.explore_regions': { ko: '탐험 지역 +{n}', en: 'Exploration regions +{n}' },
    'cn.t.explore_slots': { ko: '동시 탐험 +{n}', en: 'Parallel explorations +{n}' },
    'cn.t.gear_sets': { ko: '장비 세트 +{n}', en: 'Gear sets +{n}' },
    'cn.t.commission_slots': { ko: '동시 의뢰 +{n}', en: 'Parallel commissions +{n}' },
    'cn.t.recruit_quality': { ko: '고용 · 수색 품질 +{n}', en: 'Hire and search quality +{n}' },
    'cn.t.research': { ko: '연구 상한 +{n}', en: 'Research cap +{n}' },
    // 건설 [2026-09-21 ADR-0253] — 옛 「연구」. 본문은 위쪽 탭(ADR-0192 로 걷힘)을 설명하던 것을 지금 화면 기준으로 다시 썼다
    'rs.research.h': { ko: '건설', en: 'Construction' },
    'rs.research.note': {
        ko: '<b>건설</b>은 건물마다 <b>랭크를 하나씩 지어</b> 기능 · 칸을 엽니다. 무엇을 여는지는 랭크 칸에 적혀 있습니다<br>'
            + '다음 랭크는 <b>조건</b>(스테이지 클리어 · 영웅 로스터 합산 레벨의 최고치 · 영웅 레벨 · 다른 건물의 랭크)을 채우면 <b>비용</b>을 내고 짓습니다. 지은 것은 되돌리지 않습니다<br>'
            + '안 지은 건물의 탭은 흐립니다 — 눌러도 들어가지 않고 지을 건물을 알려 줍니다. 짓는 곳은 이 탭 하나입니다. <b>준비 중</b>인 랭크는 여는 기능이 아직 없어 지을 수 없습니다',
        en: '<b>Construction</b> opens features and slots <b>one building rank at a time</b>. Each rank lists what it opens<br>'
            + 'Meet the next rank\'s <b>requirements</b> (a stage clear · the highest total roster level reached · a hero level · another building\'s rank), then pay its <b>cost</b>. Built ranks are never undone<br>'
            + 'Tabs of unbuilt buildings are dimmed — they stay closed until built, and clicking one names the building to build. Build here, in this tab. Ranks marked <b>coming later</b> open nothing yet and cannot be built',
    },
    /* 건설 버튼 · 완료 표시 — 탭 이름 키(`rs.research.h`)와 같은 옛 접두를 그대로 쓴다. 나머지 건설 문구는 `cn.*` (2026-09-22 · R137) */
    'rs.rs.done': { ko: '완료', en: 'Done' },
    'rs.rs.go': { ko: '건설', en: 'Build' },   // 탭 이름은 명사(Construction) · 버튼은 동작(Build) — ADR-0253
    /* 전직 패널 — 도서관 탭 오른쪽 [2026-10-09 · SCREEN_DESIGN §17 · ADR-0567 — 옛 훈련장 탭의 전직 카드 · 접두 `tr.` 은 그대로 둔다].
       ~~`tr.seg.train` · `tr.slot*` · `tr.train.todo`~~ 는 훈련장과 함께 걷혔다. 전직 안내(`tr.adv.todo`)는 도움말이 같은 키로 부른다 */
    'tr.seg.adv': { ko: '전직', en: 'Advance' },
    // 전직 카드 (2026-09-28 · R16 · SCREEN_DESIGN §17) — 거절은 `tr.err.<코드>`(game.advanceStart · 마스터리 전직 트리의 advanceLearn · advanceForget — ADR-0542)
    'tr.adv.level': { ko: 'Lv.{have} / {need}', en: 'Lv.{have} / {need}' },
    'tr.adv.go': { ko: '전직', en: 'Advance' },   // 패널 제목 오른쪽 버튼 — 갈래를 골라야 켜진다 (ADR-0536 · ADR-0539)
    'tr.adv.started': { ko: '{name} — {b} 전직 시작', en: '{name} — started advancing to {b}' },
    'tr.adv.left': { ko: '{t} 남음', en: '{t} left' },
    'tr.adv.learned': { ko: '배움', en: 'Learned' },
    'tr.adv.points': { ko: '전직 포인트 {free} / {have}', en: 'Advance Points {free} / {have}' },   // 고른 영웅 줄 오른쪽 — 남은 / 받은 (R216)
    'tr.err.missing': { ko: '없는 영웅', en: 'No such hero' },
    'tr.err.class': { ko: '이 직업의 갈래가 아님', en: 'Not a path of this class' },
    'tr.err.done': { ko: '이미 전직 완료', en: 'Already advanced' },
    'tr.err.working': { ko: '전직 중', en: 'Already advancing' },
    'tr.err.level': { ko: '레벨 부족', en: 'Level too low' },
    'tr.err.exploring': { ko: '탐험 나가 있음', en: 'Out exploring' },
    'tr.err.none': { ko: '전직', en: 'Advance', lock: true },
    'tr.err.learned': { ko: '배운 스킬 되돌리기', en: 'Refund the learned skill', lock: true },
    'tr.err.skill': { ko: '이 갈래의 스킬이 아님', en: 'Not a skill of this path' },
    'tr.err.empty': { ko: '배운 전직 스킬 없음', en: 'No advancement skill learned' },
    'tr.err.points': { ko: '전직 포인트 없음', en: 'No Advance Points left' },   // advanceLearn — 첫 전직 포인트로 배운다 (R216)
    'tr.adv.todo': {
        ko: '<b>{b} {n}랭크</b>부터 여기서 전직할 수 있습니다. 직업마다 세 갈래 중 하나를 고르며, 한 번 고르면 <b>되돌릴 수 없습니다</b>. 전직에는 시간이 걸리고, 그동안 그 영웅은 원정이나 탐험에 나갈 수 없습니다.<br>'
            + '전직하면 <b>마스터리</b>에 전직 트리가 열립니다. 갈래의 전직 스킬 셋 중 하나를 <b>첫 전직 포인트</b>로 배우면 그 스킬이 액티브 전직 칸에 들어갑니다. 배운 스킬을 되돌리면 쓴 전직 포인트를 전부 돌려받습니다.',
        en: 'Advancement opens here at <b>{b} rank {n}</b>. Each class picks one of three paths, and <b>the choice cannot be undone</b>. Advancing takes time, and meanwhile the hero cannot go on expeditions or explorations.<br>'
            + 'Advancing opens the Advancement Tree in <b>Mastery</b>. Learn one of the path\'s three advancement skills with your <b>first Advance Point</b> and it fills the Advance active slot. Unlearning refunds every Advance Point spent.',
    },
    'rs.total': { ko: '합산 레벨', en: 'Total Level' },
    'rs.open': { ko: '열린 칸', en: 'Slots Open' },
    'rs.allOpen': { ko: '전부 열림', en: 'All slots open' },
    // 한국어도 On / Off 그대로 [2026-09-27 사용자 지시 「한글이어도 무조건 On Off」 · SCREEN_DESIGN §15]
    // 연구소 단계 상자 — 산출물 옆 시간당 생산량 (SCREEN_DESIGN §8 · ADR-0665 — ~~기본 · 현재 · 효율 +n%~~ 는 영웅 배치와 함께 걷었다)
    'dp.perHour': { ko: '{n}/시간', en: '{n}/h' },
    // 지점 레벨 — 트리 노드의 Lv / 최대 · 고른 지점의 Lv 눈금 · 상한 · 연구가 끝난 플래시 · 트리 머리의 오프라인 최대 (SCREEN_DESIGN §8 · ADR-0684 · ~~칸 레벨 · [레벨 올리기]~~ R288 → [연구] `dp.res.go`)
    'dp.lv': { ko: 'Lv {n}', en: 'Lv {n}' },
    'dp.lvTag': { ko: 'Lv.{n}', en: 'Lv.{n}' },   // 트리 노드 원 오른쪽 아래 배지 — 스킬 `sk.lvTag` · 아이템 칸과 같은 글 (ADR-0696 · ADR-0576)
    'dp.lvOf': { ko: 'Lv {n} / {max}', en: 'Lv {n} / {max}' },
    'dp.lvTop': { ko: '최대 레벨', en: 'Max Level' },
    'dp.next.h': { ko: '다음 레벨', en: 'Next Level' },   // 고른 칸의 소제목 — 건설 「다음 랭크」(`cn.next.h`)와 같은 자리 (ADR-0674)
    'dp.lvList.h': { ko: '{name} 레벨', en: '{name} Levels' },   // 고른 지점의 레벨 목록 소제목 — 건설 「{건물} 랭크」(`cn.ranks.h`)와 같은 자리 (ADR-0694)
    'dp.lvDone': { ko: '{name} Lv {n}', en: '{name} Lv {n}' },
    'dp.offline': { ko: '오프라인 최대 {h}시간', en: 'Offline up to {h}h' },
    'dp.err.maxUp': { ko: '최대 레벨', en: 'Already at max level' },
    'dp.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'dp.err.materials': { ko: '재료 부족', en: 'Not enough materials' },
    'dp.err.busy': { ko: '다른 연구 진행 중', en: 'Another research is in progress' },
    'dp.err.full': { ko: '등록 칸 가득 참', en: 'No free seats' },
    'dp.err.empty': { ko: '진행 중인 연구 없음', en: 'No research in progress' },
    'dp.err.missing': { ko: '없는 영웅', en: 'Hero not found' },
    // 줄 등록 — 연구소 띠 위칸의 「등록 안 함」 · 등록 창 머리 (SCREEN_DESIGN §8 · ADR-0677) · ~~`dp.reg.h`(고른 칸의 등록 자리 소제목)~~ 는 영웅 칸이 줄 카드로 가며 걷었다 (ADR-0681)
    'dp.reg.none': { ko: '미등록', en: 'Unassigned' },
    'dp.reg.modal': { ko: '{line} — 영웅 등록', en: '{line} — Assign Heroes' },
    // 얻은 재료 플래시 — 미니게임이 쓴다(옛 파견 관전 창의 떨어지는 재료 · 창은 2026-10-18 걷었다)
    'dp.watch.gain': { ko: '+{n} {item}', en: '+{n} {item}' },
    // 자원 미니게임 — 창 머리 · 시작 / 결과 판 · 판 위 머리 (2026-10-06 · SCREEN_DESIGN §8 · ADR-0532) · ~~`mg.play`(연구소의 [미니게임] 버튼)~~ 은 2026-10-21 숨김으로 걷었다 — 창은 개발용 `?dev=mg` 만 연다 (ADR-0682)
    'mg.title': { ko: '{post} 미니게임', en: '{post} Minigame' },
    'mg.start': { ko: '플레이', en: 'Play' },
    'mg.again': { ko: '한 판 더', en: 'Play again' },
    'mg.hint.mine': { ko: '잠깐 반짝이는 광맥을 한 번에. 위험한 바위와 빈 곳은 피하세요.', en: 'One click for each fleeting vein. Avoid unstable rocks and empty spots.' },
    'mg.hint.gather': { ko: '약초를 꾹 잡고, 초록 구간에서 놓으세요. 독초는 그대로 두세요.', en: 'Hold the herb, release in the green zone. Leave poison plants alone.' },
    'mg.hint.log': { ko: '왼쪽 · 오른쪽을 눌러 베기 · 내 쪽 가지 피하기', en: 'Chop from the left or right · Dodge branches on your side' },
    'mg.combo': { ko: '콤보 {n} ×{m}', en: 'Combo {n} ×{m}' },
    'mg.best': { ko: '최고 콤보 {n}', en: 'Best combo {n}' },
    'mg.name.mine': { ko: '찰나의 광맥', en: 'Fleeting Veins' },
    'mg.name.gather': { ko: '약초의 숨결', en: 'Herbal Rhythm' },
    'mg.name.log': { ko: '숲의 박자', en: 'Timber Rhythm' },
    'mg.eyebrow': { ko: '손끝으로 모으는 작은 모험', en: 'A LITTLE HANDS-ON ADVENTURE' },
    'mg.finished': { ko: '오늘의 수확', en: 'YOUR HARVEST' },
    'mg.result': { ko: '수확을 마쳤어요', en: 'Harvest complete' },
    'mg.rule.mine': { ko: '30초 · 오클릭 한 번이면 종료', en: '30 seconds · One mistake ends the run' },
    'mg.rule.gather': { ko: '30초 · 중앙에 놓으면 추가 수확', en: '30 seconds · Center release earns a bonus' },
    'mg.rule.log': { ko: '40마디 · 가지를 피해 좌우로', en: '40 logs · Switch sides to dodge branches' },
    'mg.direct': { ko: '캔 만큼 바로 획득', en: 'Keep everything you harvest' },
    'mg.reward': { ko: '이번 수확', en: 'HARVESTING' },
    'mg.harvest': { ko: '수확', en: 'harvested' },
    'mg.onechance': { ko: '오클릭 시 종료', en: 'One mistake ends the run' },
    'mg.comboCount': { ko: '{n} 연속', en: '{n} streak' },
    'mg.comboWait': { ko: '콤보를 이어보세요', en: 'Build your streak' },
    'mg.controls.mine': { ko: '광맥 = 한 번 클릭  ·  붉은 경고 바위·빈 곳 = 종료  ·  놓쳐도 계속', en: 'Vein: click once  ·  Red warning rock / empty spot: run ends  ·  Missing a vein is safe' },
    'mg.controls.gather': { ko: '약초를 꾹 누르기 → 초록 구간에 놓기  ·  스페이스키도 가능  ·  독초는 건너뛰기', en: 'Hold herb → release in green  ·  Or hold Space  ·  Skip poison plants' },
    'mg.controls.log': { ko: '왼쪽·오른쪽 클릭 또는 ← → / A D  ·  내려올 가지를 보고 반대쪽에서 베기', en: 'Click left / right or use ← → / A D  ·  Chop opposite the incoming branch' },
    'mg.ready': { ko: '준비하세요', en: 'GET READY' },
    'mg.cell': { ko: '채광 지점 {n}', en: 'Mining spot {n}' },
    'mg.target.good': { ko: '광맥', en: 'VEIN' },
    'mg.target.rare': { ko: '희귀 +3', en: 'RARE +3' },
    'mg.target.bad': { ko: '위험', en: 'DANGER' },
    'mg.empty': { ko: '빈 곳 · 누르면 종료', en: 'Empty spot · clicking ends the run' },
    'mg.hold': { ko: '꾹 누르세요', en: 'HOLD' },
    'mg.power': { ko: '당기는 힘', en: 'PULL STRENGTH' },
    'mg.release': { ko: '지금 놓으세요!', en: 'RELEASE NOW!' },
    'mg.keepHolding': { ko: '초록 구간까지…', en: 'Aim for green…' },
    'mg.leave': { ko: '손대지 마세요', en: 'DO NOT PICK' },
    'mg.plant.good': { ko: '싱싱한 약초', en: 'FRESH HERB' },
    'mg.plant.rare': { ko: '희귀 약초 · 수확 3배', en: 'RARE HERB · TRIPLE HARVEST' },
    'mg.plant.bad': { ko: '독초 · 건드리지 않기', en: 'POISON · LEAVE IT ALONE' },
    'mg.next': { ko: '다음 약초를 찾는 중…', en: 'Finding the next herb…' },
    'mg.perfect': { ko: '완벽! +1', en: 'PERFECT! +1' },
    'mg.failed': { ko: '실패 −♥', en: 'MISSED −♥' },
    'mg.left': { ko: '왼쪽 베기', en: 'Chop left' },
    'mg.right': { ko: '오른쪽 베기', en: 'Chop right' },
    'mg.why.mistake': { ko: '잘못된 곳을 눌렀어요 · 지금까지 캔 재료는 받았어요', en: 'Wrong target · Your harvest is safe' },
    'mg.why.quit': { ko: '수확을 마무리했어요', en: 'Harvest collected' },
    'mg.why.time': { ko: '시간 끝', en: "Time's up" },
    'mg.why.lives': { ko: '목숨 소진', en: 'Out of lives' },
    'mg.why.done': { ko: '나무를 모두 벰', en: 'Tree felled' },
    'mg.err.post': { ko: '미니게임이 없는 곳', en: 'No minigame here' },
    'rs.on': { ko: 'On', en: 'On' },
    'rs.off': { ko: 'Off', en: 'Off' },
    // 전체 리롤 + 잠금 [2026-09-22 · R28 · tactic_card_design §5-6] — 버튼 하나가 안 잠근 칸을 전부 굴리고, 비용은 잠근 칸 수가 정한다
    'rs.reroll': { ko: '전체 리롤 {g}G', en: 'Reroll All {g}G' },
    'rs.reroll.done': { ko: '{n}칸 다시 굴림', en: 'Rerolled {n} slot(s)' },
    'rs.lockedN': { ko: '잠근 칸', en: 'Locked' },
    'rs.lock': { ko: '잠그기', en: 'Lock' },
    'rs.unlock': { ko: '풀기', en: 'Unlock' },
    'rs.note': {
        ko: '칸은 <b>줍는 것이 아닙니다</b> — <b>지휘 천막</b>의 랭크를 지을 때마다 하나씩 열리고(영웅 로스터 전원의 레벨 합이 그 랭크의 문턱입니다), '
            + '칸에 든 옵션은 골드로 다시 굴립니다. 리롤은 <b>안 잠근 칸을 한 번에 전부</b> 굴립니다 — 지킬 칸은 <b>잠급니다</b>. '
            + '잠그는 것은 무료지만 <b>잠근 칸이 많을수록 리롤이 비싸집니다</b>. 새로 나오는 것은 <b>지금 판에 든 것과 겹치지 않습니다</b>.',
        en: 'Slots are <b>not looted</b> — one opens with each <b>Command Tent</b> rank you build (the summed level of your whole roster is that rank\'s requirement), '
            + 'and the options inside are rerolled with gold. A reroll rolls <b>every unlocked slot at once</b> — <b>lock</b> the ones you want to keep. '
            + 'Locking is free, but <b>each locked slot makes the reroll pricier</b>. A reroll never returns an option already on the board.',
    },
    'rs.note.cond': {
        ko: '조건은 <b>편성에서 확정되는 것</b>만 셉니다 — 죄종 · 직업 · 장비의 죄종 · 리더 · 진형 · 이 파티로 나간 횟수. <b>어려운 조건일수록</b>(난이도) 굴려서 나올 수 있는 값이 높습니다. '
            + '전투 중에 변하는 값(현재 HP · 남은 적)은 쓰지 않습니다. 효과는 <b>파티에 든 영웅</b>에게만 붙습니다.',
        en: 'Conditions read only what the formation fixes — sins, classes, gear sins, the leader, the formation and runs taken as this party. <b>The harder the condition</b> (Difficulty), the higher a roll can go. '
            + 'Nothing that changes mid-battle (current HP, enemies left). Effects apply only to heroes in the party.',
    },
    // 열 이름 줄 — 칸 목록 위 · 행의 여섯 세로줄 (ADR-0763) · 진행 = 조건 카운터 「지금 / 필요」 · 리더 = 리더 보너스 양
    'rs.col.state': { ko: '상태', en: 'State' },
    'rs.col.cond': { ko: '조건', en: 'Condition' },
    'rs.col.prog': { ko: '진행', en: 'Progress' },
    // 버프 = 칸의 효과(등급 값) · 추가 버프 = 그 위에 더해지는 양 — 오른쪽 위 「추가 버프」 칸과 같은 이름 (ADR-0764)
    'rs.col.buff': { ko: '버프', en: 'Buff' },
    'rs.col.extra': { ko: '추가 버프', en: 'Extra Buff' },
    'rs.col.lock': { ko: '잠금', en: 'Lock' },
    // 「추가 버프」 — 「파티 전술」 소제목 줄 오른쪽 끝 · 올리면 **출처마다 한 줄** [2026-10-24 · ADR-0757 · ADR-0758 — 칸마다 안 적는다]
    'rs.buff': { ko: '추가 버프', en: 'Extra Buffs' },
    'rs.buff.lead': { ko: '리더 통솔 {n} — 전술 ×{m}', en: 'Leader Leadership {n} — Tactics ×{m}' },
    'rs.buff.noLead': { ko: '리더 없음', en: 'No leader' },
    // 리더 보너스 — 도움말 파티 전술 묶음 전용 [2026-10-24 · ADR-0753 · tactic_card_design §5-10] · 수치는 balance.csv 다섯 키
    'rs.note.lead': {
        ko: '<b>리더</b>(편성 첫 칸)의 <b>통솔</b>이 전술 효과의 크기를 바꿉니다 — 통솔 {pivot}에서 그대로이고, {min}이면 ×{lo} · {max}이면 ×{hi}입니다. 그 사이는 고르게 변합니다. '
            + '리더의 통솔을 조건으로 보는 칸은 그대로입니다.',
        en: 'The <b>leader</b>\'s (first slot) <b>Leadership</b> scales tactic effects — unchanged at {pivot}, ×{lo} at {min} and ×{hi} at {max}, evenly in between. '
            + 'Slots whose condition is the leader\'s Leadership are unaffected.',
    },
    // 전술 옵션 등급 — ⚠ 아이템 희귀도(`mock.js:RARITY`)와 **별개 축**이고 이름만 같다 (tactic_card_design §5-5)
    'rs.grade.common': { ko: '일반', en: 'Common' },
    'rs.grade.magic': { ko: '매직', en: 'Magic' },
    'rs.grade.rare': { ko: '레어', en: 'Rare' },
    // 조건 문장 — 키 = 조건 어휘(`tactic_condition.csv:test`) · 「없으면」은 `.not` [2026-09-22 · tactic_card_design §5-8 · R134]
    //   ~~always · class_same · affix_sin · skill_tag~~ 는 조건 사전으로 바뀌며 걷었다(스킬 태그 조건은 삭제)
    'rs.cond.none': { ko: '조건 없음', en: 'No condition' },
    'rs.cond.sin_same': { ko: '같은 죄종 {n}명 이상', en: '{n}+ heroes sharing a sin' },
    'rs.cond.sin_kind': { ko: '죄종 {n}종 이상', en: '{n}+ different sins' },
    'rs.cond.cls_same': { ko: '같은 직업 {n}명 이상', en: '{n}+ heroes sharing a class' },
    'rs.cond.gear_sin': { ko: '{a} 장비 {n}개 이상', en: '{n}+ {a} gear' },
    'rs.cond.gear_sin.not': { ko: '{a} 장비 없음', en: 'No {a} gear at all' },
    'rs.cond.leader_cls': { ko: '리더가 {a}', en: 'Leader: {a}' },
    'rs.cond.leader_cls.not': { ko: '리더가 {a} 아님', en: 'Leader is not {a}' },
    'rs.cond.front_cls': { ko: '전열에 {a}', en: '{a} in the front row' },
    'rs.cond.front_cls.not': { ko: '전열에 {a} 없음', en: 'No {a} in the front row' },
    'rs.cond.together': { ko: '이 파티로 스테이지 {n}회 이상 클리어', en: '{n}+ stage clears as this party' },   // 이긴 칸마다 +1 (2026-09-29 · ~~{n}회 이상 출정~~)
    'rs.cond.leader_ldr': { ko: '리더의 통솔 {n} 이상', en: "Leader's Leadership {n}+" },   // 2026-09-27 — 칸 3(칸 = 상황)

    'sk.points.h': { ko: '스킬 포인트', en: 'Skill Points' },
    'sk.points.note': {
        ko: '죄종 마스터리와 직업 마스터리가 <b>포인트 풀을 공유</b>합니다 — 같은 축이 양쪽에 있어도 중복이 아니라 <b>기회비용이 있는 선택</b>입니다.<br>'
            + '레벨업마다 받고, <b>초기화는 무료·수시</b>입니다 — 전액 돌려받으므로 잘못 찍어 영웅 하나를 버리는 일이 없습니다.<br>'
            + '한 칸만 물리려면 그 칸을 <b>우클릭</b>합니다 — 랭크가 1 줄고 포인트가 1 돌아옵니다. 잠긴 칸에 찍어 둔 것도 그렇게 뺍니다.',
        en: 'Sin mastery and class mastery <b>share one point pool</b> — the same axis appearing on both sides is not redundancy but a <b>choice with opportunity cost</b>.<br>'
            + 'You earn points on level-up, and <b>resetting is free and always available</b> — a full refund, so no hero is ever ruined by a bad pick.<br>'
            + 'To undo just one node, <b>right-click</b> it — one rank comes off and one point comes back. Works on locked nodes you had already invested in.',
    },
    'sk.points.left': { ko: '남은 포인트', en: 'Points left' },
    'sk.tip.rank': { ko: 'Rank {n}/{max}', en: 'Rank {n}/{max}' },
    'sk.tip.effect': { ko: '{effect} (랭크당 {perRank})', en: '{effect}. (Per rank {perRank})' },
    'sk.gate.weapon': { ko: '착용 무기: {groups}일 때 효과 적용', en: 'Active with weapon: {groups}' },
    'sk.gate.armor': { ko: '착용 갑옷: {groups}일 때 효과 적용', en: 'Active with armor: {groups}' },
    // 죄종 T2-1 — 그 죄종 장비 수가 켠다 [2026-10-05 · skill_design §3-2] · {n} = 지금 낀 수 · {need} = 문턱
    'sk.gate.sin_gear': { ko: '{sin} 장비 {need}개 이상일 때 효과 적용 ({n}/{need})', en: 'Active with {need}+ {sin} items ({n}/{need})' },
    // 죄종 T2-2 · T2-3 조건 [2026-10-05 · skill_design §3-2] — 효과 문장 위 한 줄. 판정은 전투가 타격마다 한다
    'sk.cond.wounded': { ko: '내 HP 가 {pct} 미만일 때', en: 'While below {pct} HP' },
    'sk.cond.sated': { ko: '내 HP 가 {pct} 이상일 때', en: 'While at {pct} HP or more' },
    'sk.cond.stronger': { ko: '상대의 HP 가 나보다 많을 때', en: 'When the foe has more HP than you' },
    'sk.cond.weaker': { ko: '상대의 HP 가 나보다 적을 때', en: 'When the foe has less HP than you' },
    'sk.cond.elite': { ko: '정예 · 보스에게', en: 'Against elites and bosses' },
    'sk.cond.ailing': { ko: '상태이상에 걸린 대상에게', en: 'Against ailing targets' },
    'sk.cond.tick': { ko: '라운드 {sec}초마다 한 겹 · 최대 {max}겹', en: 'One stack per {sec}s in a round · up to {max}' },
    // 분노 · 폭식 T3 — 랭크가 한계(문턱 · 겹 상한)를 넓힌다 [2026-10-24 · R343 · skill_design §3-3] · {pct} · {cap} = 지금 랭크(안 찍었으면 1랭크)의 값
    'sk.cond.fury': { ko: '내 HP 가 {pct} 미만일 때 (랭크당 문턱 +{step})', en: 'While below {pct} HP (threshold +{step} per rank)' },
    'sk.cond.feast': { ko: '라운드 동안 직격이 맞을 때마다 한 겹 · 최대 {cap}겹 (랭크당 +{per}겹)', en: 'One stack per landed direct hit in a round · up to {cap} (+{per} per rank)' },
    'sk.tip.perStack': { ko: '겹당 {effect}', en: '{effect} per stack' },
    /* 마스터리 효과 문장 — 「무엇이 n 증가한다」 (SCREEN_DESIGN §7 · ADR-0332). 축마다 **통째로** 든다 — 조사(이/가)와
       동사(증가/감소)를 렌더러가 고르지 않는다. 이름이 「감소」인 축은 줄어드는 것이 주어다. {v} 는 부호 없는 값.
       사전에 없는 축은 맨 위 틀로 떨어진다 */
    'sk.masteryEffect': { ko: '{stat} {v} 증가', en: '{stat} increases by {v}' },
    'sk.masteryEffect.aspd_pct': { ko: '공격 속도 {v} 증가', en: 'Attack Speed increases by {v}' },
    'sk.masteryEffect.atk_pct': { ko: '데미지 {v} 증가', en: 'Damage increases by {v}' },
    'sk.masteryEffect.buff_dur_pct': { ko: '버프 지속시간 {v} 증가', en: 'Buff Duration increases by {v}' },
    'sk.masteryEffect.cast_speed_pct': { ko: '캐스팅 속도 {v} 증가', en: 'Casting Speed increases by {v}' },
    'sk.masteryEffect.cooldown_reduction': { ko: '쿨타임 {v} 감소', en: 'Cooldowns are reduced by {v}' },
    'sk.masteryEffect.crit_damage': { ko: '치명타 피해 {v} 증가', en: 'Crit Damage increases by {v}' },
    'sk.masteryEffect.crit_rate': { ko: '치명타 확률 {v} 증가', en: 'Crit Chance increases by {v}' },
    'sk.masteryEffect.crushing_blow_pct': { ko: '강타 {v} 증가', en: 'Crushing Blow increases by {v}' },
    'sk.masteryEffect.damage_reduction': { ko: '받는 피해 {v} 감소', en: 'Damage taken is reduced by {v}' },
    'sk.masteryEffect.def_flat': { ko: '물리 방어 {v} 증가', en: 'Physical Defense increases by {v}' },
    'sk.masteryEffect.def_ignore': { ko: '방어 무시 {v} 증가', en: 'Defense Ignore increases by {v}' },
    'sk.masteryEffect.fhr': { ko: '타격 회복 {v} 증가', en: 'Hit Recovery increases by {v}' },
    'sk.masteryEffect.gold_find': { ko: '골드 획득 {v} 증가', en: 'Gold Find increases by {v}' },
    'sk.masteryEffect.hit_bonus': { ko: '명중률 {v} 증가', en: 'Hit Bonus increases by {v}' },
    'sk.masteryEffect.hp_pct': { ko: '최대 HP {v} 증가', en: 'Max HP increases by {v}' },
    'sk.masteryEffect.hp_flat': { ko: '최대 HP {v} 증가', en: 'Max HP increases by {v}' },
    'sk.masteryEffect.hp_recovery_pct': { ko: '체력 회복 {v} 증가', en: 'HP Recovery increases by {v}' },
    'sk.masteryEffect.hp_regen': { ko: 'HP 재생 {v} 증가', en: 'HP Regen increases by {v}' },
    'sk.masteryEffect.item_find': { ko: '드랍률 {v} 증가', en: 'Item Find increases by {v}' },
    'sk.masteryEffect.life_steal': { ko: '흡혈 {v} 증가', en: 'Life Steal increases by {v}' },
    'sk.masteryEffect.magic_find': { ko: '매직아이템 획득 {v} 증가', en: 'Magic Find increases by {v}' },
    // 탐욕 T3 — 「탐욕 합에 비례」가 효과의 일부라 한 토막에 같이 든다 (SCREEN_DESIGN §7 · R325)
    'sk.masteryEffect.atk_pct_per_greed': { ko: '골드 획득 · 드랍률 · 매직아이템 획득 합의 {v}만큼 데미지 증가', en: 'Damage increases by {v} of your total Gold Find, Item Find and Magic Find' },
    'sk.masteryEffect.hp_pct_per_greed': { ko: '골드 획득 · 드랍률 · 매직아이템 획득 합의 {v}만큼 최대 HP 증가', en: 'Max HP increases by {v} of your total Gold Find, Item Find and Magic Find' },
    'sk.masteryEffect.cdr_per_greed': { ko: '골드 획득 · 드랍률 · 매직아이템 획득 합의 {v}만큼 쿨타임 감소', en: 'Cooldowns are reduced by {v} of your total Gold Find, Item Find and Magic Find' },
    'sk.masteryEffect.reflect_damage': { ko: '반사 피해 {v} 증가', en: 'Reflect Damage increases by {v}' },
    'sk.masteryEffect.res_all': { ko: '모든 원소 저항 {v} 증가', en: 'All Resistances increase by {v}' },
    'sk.masteryEffect.res_max_bonus': { ko: '최대 원소 저항 {v} 증가', en: 'Max Resistances increase by {v}' },
    'sk.masteryEffect.res_reduction': { ko: '적의 원소 저항 {v} 감소', en: 'Enemy resistances are reduced by {v}' },
    'sk.reset': { ko: '초기화', en: 'Reset' },
    'sk.unlearn': { ko: '되돌리기', en: 'Refund' },
    'sk.reset.done': { ko: '{n} 포인트 반환', en: { one: 'Refunded {n} point', other: 'Refunded {n} points' } },
    'sk.needLv': { ko: 'Lv.{lv}', en: 'Lv.{lv}' },
    'sk.err.locked': { ko: 'Lv.{lv} 달성', en: 'Reach Lv.{lv}', lock: true },
    'sk.err.maxRank': { ko: '이미 최대 랭크', en: 'Already at max rank' },
    'sk.err.points': { ko: '스킬 포인트 없음', en: 'No skill points left' },
    'sk.err.noRank': { ko: '아직 찍지 않은 칸', en: 'Nothing invested here yet' },
    /* ~~'sk.err.downed'~~ · ~~'tr.err.downed'~~ · ~~'bk.err.downed'~~ 은 2026-10-21 삭제 — 쓰러짐은 원정 밖 행동을 막지 않는다 (R300 · ADR-0687) */
    // 찍은 칸의 툴팁 꼬리 — 우클릭이 있다는 것 자체가 안 보이면 못 쓴다 (SCREEN_DESIGN §7)
    'sk.unlearnHint': { ko: ' · 우클릭 = 1랭크 되돌리기', en: ' · Right-click to refund 1 rank' },
    // 낀 장비가 켜는 칸 (직업 T2 · 2026-09-22 R138) — 갈래 이름은 CSV 에서
    'sk.slots.h': { ko: '액티브', en: 'Actives' },
    'sk.slots.sub': { ko: '3개 — 순서 = 우선순위', en: '3 — order = priority' },
    // 인게임 이름은 「공격 속도」 하나다 — 값은 초 / 1회 그대로 (2026-09-25 사용자 지시 · ADR-0358)
    'sk.cycle': { ko: '공격 속도', en: 'Attack Speed' },
    // 마법 무기를 든 유닛은 같은 주기를 「캐스팅 속도」라 부른다 — 이름만 · 값 그대로 (2026-10-03 사용자 지시 · R202 · ADR-0492)
    'sk.castSpeed': { ko: '캐스팅 속도', en: 'Casting Speed' },
    'sk.cycleSec': { ko: '{s}초', en: '{s}s' },
    'sk.cycle.sub': { ko: '민첩 + 무기군 속도 (물리·마법 단일 축)', en: 'Agility + weapon-group speed (one clock for melee & magic)' },
    'sk.emptySlot': { ko: '빈 칸', en: 'Empty' },
    // 출처 셋은 **영웅 / 습득 / 전직** 이다 [2026-09-08 사용자 지시 · 2026-09-29 ~~무기~~ → 책 — R179 · ADR-0420 · 2026-10-02 ~~책~~ → 습득 — ADR-0484] — ~~고유~~. 액티브 줄·후보 카드·툴팁 칩이 같은 키를 쓴다
    'sk.innate': { ko: '영웅', en: 'Hero' },
    // 액티브 3칸의 출처 라벨 — 칸은 출처가 정한다 (skill_design §2)
    'sk.src.book': { ko: '습득', en: 'Learned' },
    'sk.src.advance': { ko: '전직', en: 'Advance' },
    'sk.emptyBook': { ko: '배운 스킬 없음', en: 'No skill learned' },
    'sk.emptyAdvance': { ko: '전직 전', en: 'Not advanced' },
    'sk.lvTag': { ko: 'Lv.{n}', en: 'Lv.{n}' },   // 스킬 레벨 — 그림 오른쪽 아래 `.sk-lv` (설명창 · 액티브 줄 · 도서관 · 전직 판 · R216 · ADR-0576) · 그림이 없는 도서관 읽기 줄만 이름 뒤
    'sk.advPoints': { ko: '전직 포인트', en: 'Advance Points' },   // 포인트 패널 둘째 줄 — 마스터리와 따로 (R216)
    'sk.err.advPoints': { ko: '전직 포인트 없음', en: 'No Advance Points left' },
    'sk.adv.leveled': { ko: '{skill} Lv.{n}', en: '{skill} Lv.{n}' },   // 전직 판 스킬 칸을 눌러 레벨이 올랐다 (R216)
    // 잠긴 액티브 칸의 툴팁 한 줄 [2026-09-30 사용자 지시 · SCREEN_DESIGN §6 · ADR-0466 — ~~`sk.lockLv` 「Level n+」~~(ADR-0428) 를 칸마다의 문장으로] · {n} = 책 `skillbook_learn_level` · 전직 `advance_unlock_level`
    'sk.lock.book': { ko: 'Lv{n}이 되면 도서관에서 스킬을 배울 수 있습니다.', en: 'At Lv{n}, skills can be learned at the Library.' },
    'sk.lock.advance': { ko: 'Lv{n}이 되면 전직 후 스킬을 배울 수 있습니다.', en: 'At Lv{n}, skills can be learned after advancing.' },
    // ~~`sk.needWeapon`~~(꺼진 칸 툴팁 맨 위 한 줄 · ADR-0446) — 2026-10-03 걷었다: 필요 무기는 설명창 이름 줄의 칩이 무기군 이름만으로 든다(ADR-0496)
    /* 스킬북 [2026-09-29 · R179 · 도서관 탭 SCREEN_DESIGN §17 · ADR-0422] — 규칙 문장은 없다(덮어쓰기는 도움말의 몫) · 권수 `×n` 은 물약 칸처럼 기호라 키가 없다(ADR-0460) */
    'bk.up.h': { ko: '스킬 업그레이드', en: 'Skill Upgrade' },   // 도서관 오른쪽 위 카드 제목 (2026-10-12 사용자 지시 · ADR-0597 — ~~`bk.own.h` 「가진 책」~~)
    'bk.up.help': { ko: '보유한 스킬북을 통해 스킬 레벨을 업그레이드 할 수 있습니다.', en: 'Use the skill books you own to upgrade skill levels.' },   // 제목 옆 `?` 툴팁 · 도움말 도서관 섹션도 이 키 (2026-10-12 사용자 지시 · ADR-0603)
    'bk.none': { ko: '가진 책 없음', en: 'No books' },
    'bk.learn': { ko: '배우기', en: 'Learn' },
    'bk.overwrite': { ko: '덮어쓰기', en: 'Overwrite' },
    'bk.upgrade': { ko: '업그레이드 · {n}권', en: 'Upgrade · {n}' },   // 같은 책 — 이번에 드는 책 수 (2026-10-06 · R216 · ADR-0529 — ~~`bk.same` 「배움」~~ 퇴역)
    'bk.max': { ko: '최대', en: 'Max' },
    'bk.craft.h': { ko: '스킬 북 제작', en: 'Skill Book Crafting' },   // 도서관 오른쪽 아래 카드 제목 (2026-10-12 사용자 지시 · ADR-0597)
    'bk.make': { ko: '만들기', en: 'Craft' },
    'bk.craft.help': { ko: '스킬 도안 한 장으로 그 스킬북 한 권을 만들 수 있습니다.', en: 'Use one skill blueprint to craft one copy of that skill book.' },   // 제목 옆 `?` 툴팁 · 도움말 도서관 섹션도 이 키 (2026-10-12 사용자 지시 · ADR-0600 · 도안이 소모된다 2026-10-20 R293)
    'bk.craft.none': { ko: '스킬 도안 없음', en: 'No skill blueprints' },   // 제작 칸이 하나도 없을 때 (ADR-0600)
    'bk.learned': { ko: '{name} — {skill} 배움', en: '{name} learned {skill}' },
    'bk.crafted': { ko: '{skill} 스킬북 제작 완료', en: 'Crafted a {skill} book' },
    'bk.upgraded': { ko: '{name} — {skill} Lv.{n}', en: '{name} — {skill} Lv.{n}' },   // 같은 책 업그레이드 (R216)
    // 결과 코드 — `game.learnBook` · `game.craftBook` · `game.bookState` (INTERFACE §3)
    'bk.err.level': { ko: 'Lv.{n} 달성', en: 'Reach Lv.{n}', lock: true },
    'bk.err.missing': { ko: '배울 수 없는 스킬', en: 'Cannot be learned' },
    'bk.err.book': { ko: '책 부족', en: 'Not enough books' },   // 없거나 업그레이드에 드는 권수보다 적다 (R216)
    'bk.err.maxUp': { ko: '이미 최대 레벨', en: 'Already at max level' },   // 업그레이드 상한 (R216 — ~~`bk.err.same`~~ 퇴역)
    'bk.err.gold': { ko: '골드 부족', en: 'Not enough gold' },
    'bk.err.materials': { ko: '가루 부족', en: 'Not enough dust' },
    'bk.err.blueprint': { ko: '스킬 도안 없음', en: 'No skill blueprint' },   // craftBook — 그 스킬의 도안이 아직 없다 (R241)
    /* 스킬 툴팁 문장은 **스킬마다 제 틀**이다 — `skill.csv:desc_kr` · `desc_en` [2026-10-21 사용자 지시 · ADR-0679 — ~~`sk.line.*` 공용 틀 · `sk.eff.*` 효과 구절~~].
       여기 남는 것은 공격이 같이 쓰는 둘째 문장(추가 피해)과 숫자 자리 안에 드는 구절(수량 · 단위)이다 — 자리 이름은 `tip.js:descSlots`.
       확률로 터지는 추가 피해 [2026-09-10 · ADR-0089] — 공격 문장 **뒤에 서는 완결된 둘째 문장**이다. {c} = 확률 · {x} = 배수(%) */
    'sk.line.proc': {
        ko: '타격마다 {c} 확률로 피해가 {x} 가 됨',
        en: 'Each hit has a {c} chance to deal {x} damage',
    },
    /* 수량 구절 — 값을 아는 자리는 **실제 수치**(`{v}`), 모르는 자리(도감 · 후보 카드)는 **식**(`{f}`)으로 접는다 [식 2026-09-10 · ADR-0089].
       `{v}` 에는 Alt 를 누르는 동안 괄호 식이 따라 붙는다 — 틀은 그걸 모른다. ⚠ 감소·치명·추가 피해 전의 값이다 (game_logic/skill.js:previewOf)
       ~~`sk.amt.mult` · `sk.amt.healMult`(「공격력의 {m}%」)~~ → 식 모양 `sk.amt.*Fx` · `sk.amt.healFx` — 회복의 밑수는 마법 공격력이라 옛 문구가 틀렸었다.
       피해는 식이어도 **종류를 말한다** (2026-10-02 · ADR-0477 — ~~`sk.amt.fx`(「{f} 만큼 피해」)~~) */
    'sk.amt.physical': { ko: '{v} 의 물리 피해', en: '{v} physical damage' },
    'sk.amt.elem': { ko: '{v} 의 {e} 피해', en: '{v} {e} damage' },   // {e} = 원소 이름 `st.atkType.*` — 「마법 피해」는 없다(마법 공격은 반드시 원소를 갖는다 · battle_design §2-1)
    'sk.amt.physicalFx': { ko: '{f} 의 물리 피해', en: 'physical damage equal to {f}' },   // ko 는 값 자리와 같은 꼴 — ~~「{f} 만큼의」~~ (2026-10-02 사용자 지시)
    'sk.amt.elemFx': { ko: '{f} 의 {e} 피해', en: '{e} damage equal to {f}' },
    'sk.amt.heal': { ko: '{v} 만큼', en: '{v} HP' },
    'sk.amt.healFx': { ko: '{f} 만큼', en: 'HP equal to {f}' },
    /* 숫자 자리의 단위 — 틀이 아니라 **자리 안에** 든다(Alt 의 괄호 식이 값 바로 뒤에 서게). 초는 `time.s` · % 는 기호 그대로 */
    'sk.u.times': { ko: '{v}번', en: { one: '{v} time', other: '{v} times' } },
    // ~~`sk.altHint`(「Alt 계산식」 각주)~~ 는 2026-10-03 삭제 [사용자 지시 · ADR-0499]
    /* 그 스킬의 **표기 쿨** [개정 2026-09-08 2차 사용자 지시] — 어느 영웅이 들든 같은 수다.
       ~~`sk.base`·`sk.eff`·`sk.aligned`~~ (1차 폐기) → ~~`sk.every`(`{s}초마다`)~~ → **`sk.cool`**.
       **말까지 바꾼 이유는 값이 바뀌었기 때문**이다 — 「{s}초마다」는 빈도의 약속인데 표기 쿨은 빈도가 아니다
       (정렬 대기만큼 뒤에 나간다). 쿨이라고 적으면 참이 된다 */
    'sk.cool': { ko: '쿨 {s}초', en: 'Cooldown {s}s' },
    // 설명창 Alt 쿨 식 `(18 − 쿨감 10%)` 의 이름 — 문장 한가운데 끼어서 줄인다 (2026-10-21 · ADR-0706 · 세부 옵션 줄은 combat_stat.csv 이름 그대로)
    'sk.cdrShort': { ko: '쿨감', en: 'Cooldown Reduction' },
    'sk.slots.note': {
        ko: '차례가 오면 <b>가장 오래 기다린 스킬</b> → 동률이면 <b>칸 순서</b> → 없으면 기본 공격. <b>마법 무기는 기본 공격이 없습니다</b> — 준비된 스킬이 없으면 게이지가 찬 채로 기다렸다가 스킬이 준비되는 순간 시전합니다<br>'
            + '한 차례에 하나. 스킬은 그 차례의 공격을 <b>대체</b>하고 마나는 없습니다 — 행동 1회가 유일한 비용<br>'
            + '쿨은 실시간으로 돕니다<br>'
            + '기본 공격은 언제나 <b>물리</b>입니다 — 원소 피해는 스킬만 냅니다<br>'
            + '스킬은 <b>직업에 귀속</b>됩니다 — 한 스킬은 한 직업에만 있고, 영웅 칸은 <b>영웅의 직업 풀</b>에서 · 습득 칸은 <b>배운 책</b>에서 옵니다. <b>타격 · 회복 · 소환</b> 스킬은 어느 칸에 있든 그 스킬 직업의 무기를 들어야 나가고, 함성 · 오오라 · 축복 같은 <b>버프 · 디버프</b>는 무기를 안 봅니다<br>'
            + '⚠ 이름과 형태는 확정이지만 <b>배율 · 타수 · 쿨 · 지속은 미발행</b>입니다 — 지금 값은 임시입니다',
        en: 'When your turn comes: <b>the longest-waiting ready skill</b> → ties go to <b>slot order</b> → none ready means a basic attack. <b>Magic weapons have no basic attack</b> — with nothing ready, the gauge waits full and casts the moment a skill is ready<br>'
            + 'One action per turn. A skill <b>replaces</b> that turn\'s attack and there is no mana — the action itself is the only cost<br>'
            + 'Cooldowns run in real time<br>'
            + 'Basic attacks are always <b>physical</b> — only skills deal elemental damage<br>'
            + 'Skills belong to a <b>class</b> — each skill sits in exactly one class; the hero slot draws from <b>the hero class pool</b> and the learned slot from <b>the book you read</b>. <b>Attack, heal and summon</b> skills need a weapon of that skill\'s class in any slot; <b>buffs and debuffs</b> such as shouts, auras and blessings work with any weapon<br>'
            + '⚠ Names and shapes are settled, but <b>multipliers, hits, cooldowns and durations are not published</b> — the current numbers are placeholders',
    },
    'sk.sinTree': { ko: '{sin} 마스터리', en: '{sin} Mastery' },
    'sk.sinTree.sub': { ko: '모든 {sin} 영웅 공유', en: 'Shared by all {sin} heroes' },
    'sk.sinTree.missing': {
        ko: '<b>맨 아랫줄(반응형)은 기획이 방향만 정했습니다</b> — 「~하면 ~한다」는 발동 빈도에 파워가 종속돼 값을 잴 자가 없습니다.',
        en: '<b>The bottom row (reactive) has direction but no numbers</b> — "when X, then Y" scales with trigger frequency, and there is no yardstick for that yet.',
    },
    'sk.mastery': { ko: '{cls} 마스터리', en: '{cls} Mastery' },
    'sk.mastery.missing': {
        ko: '죄종 마스터리와 <b>같은 구조</b>입니다. <b>맨 윗줄 3칸은 직업마다 확정</b>돼 있습니다.<br>'
            + '<b>그 아래 3칸은 낀 장비가 효과를 켭니다.</b> 빠른 무기는 데미지 %, 느린 무기는 공격 속도, 자기 직업의 갑옷군은 갑옷 마스터리를 켭니다. 랭크는 장비가 안 맞아도 찍어 둘 수 있지만 효과는 꺼집니다.<br>'
            + '맨 아랫줄의 반응형 노드는 아직 기획 중입니다.',
        en: 'The class mastery uses the <b>same structure</b> as sin mastery. <b>Each class has three confirmed nodes in the top row.</b><br>'
            + '<b>Equipped gear activates the three nodes below.</b> Fast weapons activate Damage %, slow weapons activate Attack Speed, and the class armor type activates Armor Mastery. You can invest ranks without matching gear, but the effect stays inactive.<br>'
            + 'The reactive bottom row is still being designed.',
    },
    'sk.advTree': { ko: '전직 트리', en: 'Advancement Tree' },
    'sk.advNeed': { ko: '전직', en: 'Advance', lock: true },   // 전직 판의 잠김 베일 (§7 · §13-1)
    'sk.adv.slot.2': { ko: '특수', en: 'Special' },   // 전직 가지 칸 이름 — ② · ③ · ④ (skill_design §4)
    'sk.adv.slot.3': { ko: '변형', en: 'Variant' },
    'sk.adv.slot.4': { ko: '필살기', en: 'Ultimate' },
    'sk.adv.pending': { ko: '준비 중', en: 'Coming later' },   // 가지 칸 — 효과 미구현 (R216)
    'sk.adv.hold': { ko: '보류', en: 'On hold' },   // 기획이 보류 · 미정으로 둔 가지 칸
    'sk.advTree.missing': {
        ko: '<b>액티브를 주는 층은 전직 하나</b>입니다 — 두 마스터리는 전부 패시브입니다. 전직 3갈래 중 하나를 고르면 그 전직이 액티브 3을 주고, <b>그중 1개를 배운 것만</b> 칸에 오릅니다.<br>'
            + '<b>전직 포인트</b>는 마스터리와 따로입니다 — 전직할 때 1점, 그 뒤 일정 레벨마다 1점을 받습니다. 첫 포인트로 스킬을 배우고 나머지로 <b>스킬 레벨</b>을 올립니다. 가지 셋(특수 · 변형 · 필살기)은 아직 찍을 수 없습니다.',
        en: '<b>Advancement is the only layer that grants actives</b> — both masteries are purely passive. Picking one of three advancements grants three actives, and <b>only the one you learn</b> takes the slot.<br>'
            + '<b>Advance Points</b> are separate from mastery — 1 when you advance and 1 more every few levels. The first point learns the skill and the rest raise its <b>skill level</b>. The three branches (Special · Variant · Ultimate) cannot be taken yet.',
    },
    'sk.lockedSuffix': { ko: ' (잠김)', en: ' (locked)' },
    'sk.grid.note': {
        ko: '마스터리는 가지가 갈리는 트리가 아니라 <b>위에서 아래로 쌓는</b> 구조입니다 — <b>윗줄이 먼저 열리고 아랫줄일수록 늦게</b> 열립니다<br>'
            + '칸을 누르면 1랭크 오릅니다. 아직 못 여는 칸에는 <b>필요한 레벨</b>이 적힙니다. <b>빈 칸은 기획 미작성 자리</b>이고, 점선 프레임을 남겨 두는 것은 어디까지 갈 수 있는지를 보여주기 위해서입니다',
        en: 'Mastery is not a branching tree but <b>stacks from top to bottom</b> — <b>the top row opens first, lower rows later</b><br>'
            + 'Click a cell to add a rank. Cells you cannot open yet show <b>the level they need</b>. <b>Empty cells are unwritten design</b>; the dashed frame stays so you can see how far this can go',
    },

    /* ── 선술집 ── */
    'tv.h': { ko: '영입 후보', en: 'Recruits' },
    'tv.sub': { ko: '레어 층 — 직업 × 죄종 × 시작특성을 등장 시 굴림', en: 'Rare tier — class × sin × trait rolled on arrival' },
    'tv.reroll.note': {
        ko: '선술집 리롤 = <b>아이템 파밍의 영웅판</b> — 굴림 루프는 <b>레어 층</b>에 있습니다. 죄종 × 직업 35칸을 전부 여기서 공급합니다',
        en: 'Tavern rerolls are <b>item farming for heroes</b> — the rolling loop lives in the <b>rare tier</b>, which supplies all 35 sin × class combinations',
    },
    'tv.tiers.note': {
        ko: '<b>유니크</b> — 이름·직업·죄종 고정 + 고유 스킬 1개(영웅 전용), 영웅 로스터에 1명만. 본편 15명(직업별 3)이 상한<br>'
            + '<b>레어</b> — 전부 굴림, 고유 스킬은 공용 풀에서 배정. 죄종 × 직업 35칸 커버리지를 전담합니다',
        en: '<b>Unique</b> — fixed name, class, and sin + 1 signature skill (hero-exclusive); one copy per roster. Capped at 15 in the base game (3 per class)<br>'
            + '<b>Rare</b> — everything rolled; signature skill assigned from the shared pool. Covers all 35 sin × class cells',
    },

    /* ── 실험실 (SCREEN_DESIGN §18 · ADR-0580 · ADR-0610) — 개발 장치 · 패널에 규칙 문장이 없다(숫자 · 이름 · 버튼만) ── */
    'lab.tool.item': { ko: '아이템 생성기', en: 'Item Generator' },
    'lab.h.chapter': { ko: '챕터', en: 'Chapter' },
    'lab.h.monster': { ko: '몬스터', en: 'Monster' },
    'lab.h.grade': { ko: '등급', en: 'Grade' },
    'lab.h.diff': { ko: '난이도', en: 'Difficulty' },
    'lab.h.level': { ko: '스테이지 레벨', en: 'Stage Level' },
    'lab.h.slots': { ko: '부위', en: 'Slots' },
    'lab.h.ilvl': { ko: '아이템 레벨', en: 'Item Level' },
    'lab.h.weights': { ko: '희귀도 가중치', en: 'Rarity Weights' },
    'lab.roll': { ko: '굴리기', en: 'Roll' },
    'lab.roll10': { ko: '×10', en: '×10' },
    'lab.clear': { ko: '비우기', en: 'Clear' },
    'lab.count': { ko: '{n}개', en: { one: '{n} item', other: '{n} items' } },

    /* ── 도감 ── */
    /* 세그먼트 다섯 [마스터리 추가 2026-09-24 — SCREEN_DESIGN §9] — 몬스터(카드 수집)만 이 블록이 든다.
       나머지 넷(캐릭터 · 아이템 · 스킬 · 마스터리)의 문구는 아래 「도감 — 자산 세그먼트」(`ix.*`) 블록이다.
       `cx.h`(몬스터 도감)는 화면 제목 자리를 `nav.codex` 에 내주고 **도움말 섹션 제목으로만** 남는다 (§12). */
    'cx.seg.monster': { ko: '몬스터', en: 'Monsters' },
    'cx.seg.character': { ko: '캐릭터', en: 'Characters' },
    'cx.seg.item': { ko: '아이템', en: 'Items' },
    'cx.seg.skill': { ko: '스킬', en: 'Skills' },
    'cx.seg.fx': { ko: '이펙트', en: 'Effects' },
    'cx.seg.mastery': { ko: '마스터리', en: 'Masteries' },
    'cx.h': { ko: '몬스터 도감', en: 'Monster Codex' },
    'cx.sub': { ko: '도감 경험치 {list}에서 레벨이 오릅니다 — 처치 하나에 {per} · Lv1 · Lv2 의 보너스 효과는 그 몬스터와 같은 부류 전체에 붙습니다', en: 'Levels up at {list} codex EXP — each kill gives {per} · Lv1 and Lv2 bonus effects apply to every monster of the same family' },   // 부류 = monster_base(군대 · 부족 · 거인 · 수호자 · 이형 — 2026-10-24)
    /* 잠금 문구 셋(cx.chLocked · cx.chLockedTail · cx.locked)은 2026-09-06 삭제 — 도감이 해금을 안 본다 (SCREEN_DESIGN §9) */
    'cx.sinLabel': { ko: '죄종', en: 'Sin' },
    'cx.exp': { ko: '경험치 {n}', en: '{n} EXP' },   // 그 몬스터의 누적 도감 경험치 — 카드 진행 줄 · 핍 툴팁 (ADR-0587 · ~~cx.kills 처치 {n}~~)
    'cx.lvTitle': { ko: '도감 Lv.{lv}', en: 'Codex Lv.{lv}' },
    // 몬스터 툴팁 — 초상 옆 이야기 · 아래 처치 단계 (SCREEN_DESIGN §9 · ADR-0206)
    'cx.tip.lv': { ko: 'Lv.{lv}', en: 'Lv.{lv}' },
    'cx.tip.story': { ko: '스토리', en: 'Story' },
    'cx.tip.effects': { ko: '보너스 효과', en: 'Bonus Effects' },
    // 단계표의 Lv1 · Lv2 — **그 몬스터 한 마리의 몫** 앞에 부류 이름(`{race}` — monster_base.csv · 군대 · 부족 · 거인 · 수호자 · 이형 — 2026-10-24)을 단다 · Lv2 는 「상대」 · `{line}` = 줄 한 줄(파밍 = 아래 다섯 ·
    //   전투 = 장비 옵션 줄 표기) · `{v}` = 부호 붙은 값 (SCREEN_DESIGN §9 · ADR-0715 · monster_design §8 — ~~그 몬스터에게만 · cx.rw.vs_dmg~~ ADR-0667)
    'cx.rw.farm': { ko: '{race} {line}', en: '{line} from {race}' },
    'cx.rw.fight': { ko: '{race} 상대 {line}', en: '{line} vs {race}' },
    'cx.rw.xp': { ko: '처치 경험치 {v}', en: '{v} Kill EXP' },
    'cx.rw.drop': { ko: '드롭 확률 {v}', en: '{v} Drop Chance' },
    'cx.rw.magic': { ko: '매직 아이템 획득 {v}', en: '{v} Magic Find' },
    'cx.rw.gold': { ko: '골드 획득 {v}', en: '{v} Gold Find' },
    'cx.rw.material': { ko: '재료 획득 {v}', en: '{v} Material Find' },
    // 스킬 도감 툴팁의 둘째 장 — 획득처 작은 초상 · 레벨이 오르면 (SCREEN_DESIGN §9-1 · ADR-0680 — ~~단계~~ ADR-0650) · 「상단」 머리는 건물 이름 데이터(building.csv)
    'cx.tip.source': { ko: '획득처', en: 'Found On' },
    'cx.tip.roll': { ko: '보스 · 무작위 칸', en: 'Bosses · random slot' },   // 셋째 칸(직업 풀 굴림)에서 나올 수 있는 보스 — 고정 칸 몬스터와 따로 묶는다
    'cx.tip.at': { ko: '{c}-{s}', en: '{c}-{s}' },   // 초상 아래 장-장소
    'cx.tip.lvUp': { ko: '레벨이 오르면', en: 'Per Level' },   // 아랫칸 머리글 — 그 스킬의 레벨 줄 하나 (skill_effect.csv:level_field · level_step)
    // 레벨 줄의 칸 이름 — `level_field` 하나에 하나 · 값(`level_step`)은 오른쪽 칸이 든다. 피해 배율 · 감쇠는 하는 일 · 대상이 가른다
    'cx.lv.mult': { ko: '피해 배율', en: 'Damage multiplier' },   // mult_pct — 때린다
    'cx.lv.heal': { ko: '회복 배율', en: 'Healing multiplier' },   // mult_pct — 회복 · 자기 회복
    'cx.lv.hits': { ko: '타수', en: 'Hits' },   // hits
    'cx.lv.decay': { ko: '감쇠', en: 'Falloff' },   // decay_pct — 뒤 대상일수록 줄어드는 비율
    'cx.lv.strip': { ko: '방어 깎기', en: 'Defense strip' },   // decay_pct — 가이디드(방어가 가장 두꺼운 적)는 그 적의 방어를 깎는 비율이다
    'cx.lv.dur': { ko: '지속 시간', en: 'Duration' },   // duration_sec
    'cx.lv.value': { ko: '효과', en: 'Effect' },   // effect_value — 걸린 효과의 값(왼쪽 장의 문장이 그 효과를 말한다 · ADR-0680)
    'cx.lv.cool': { ko: '쿨타임', en: 'Cooldown' },   // cool_sec
    'cx.note': {
        ko: '그 몬스터에게서 모은 도감 경험치가 누적 문턱을 넘을 때마다 <b>그 몬스터의 도감 레벨</b>이 오르고 보너스 효과가 하나씩 열립니다 — 앞 단계(처치 경험치 · 상대 피해 · 드롭 확률)는 <b>그 몬스터에게만</b> · 마지막 단계는 <b>그 몬스터의 전투 옵션 하나가 파티 전원에게</b> 늘 붙습니다 — <b>파밍이 도감을 밉니다</b><br>'
            + '처치 하나의 도감 경험치는 그 원정의 난이도가 정합니다 — 높은 난이도일수록 빨리 찹니다 · 이긴 라운드의 처치만 셉니다 · 보스 등급별 차등은 후속<br>'
            + '카드에 마우스를 올리면 그 몬스터의 이야기와 레벨 단계가 뜹니다',
        en: "Each time the codex EXP gathered from a monster passes a cumulative threshold, <b>its codex level</b> rises and opens one more bonus effect — the early ones (kill EXP · damage to it · drop chance) apply <b>to that monster only</b> · the last one adds <b>that monster's combat option to your whole party</b> for good — <b>farming pushes the codex</b><br>"
            + "Each kill's codex EXP is set by the expedition's difficulty — higher difficulties fill it faster · only kills from rounds you win count · boss-grade scaling comes later<br>"
            + "Hover a card to see the monster's story and level milestones",
    },

    /* ── 도감 — 자산 세그먼트 (SCREEN_DESIGN §9-1 · 신설 2026-09-06 · 탭 흡수 2026-09-08) ──
       타일에 붙는 것은 **이름과 파일명뿐**이다 — 「무기는 제 그림이고 방어구는 임시다」 같은 규칙은
       화면 문구가 아니라 §9-1 과 `mock.js` 주석의 내용이다 (§12 설명 문구는 도움말 탭 전용).
       **`ix.` 접두를 그대로 둔다** — 옛 「이미지 도감」 탭이 도감의 세그먼트 셋이 됐을 뿐 이 문구 묶음은 그대로라,
       접두를 `cx.` 로 갈면 몬스터 카드 문구와 한 이름 공간에 섞여 오히려 어느 세그먼트의 것인지가 안 읽힌다.
       09-08 삭제 — `ix.h`(탭 제목 · `nav.codex` 가 받는다) · `ix.seg.*`(세그먼트 · `cx.seg.*` 가 받는다) ·
       `ix.g.monster`(몬스터 초상 묶음 · 몬스터 세그먼트의 카드가 그 일을 한다 — §9). */
    'ix.g.heroCls': { ko: '{cls} 초상', en: '{cls} Portraits' },   // 직업 하나가 묶음 하나 (ADR-0066) — ~~ix.g.hero~~ 대체
    // 아이템 세그먼트의 안쪽 분류 (ADR-0179) — 장신구도 비무기 장비이므로 방어구 쪽 부위 묶음에 든다
    // 물약은 셋째 탭이다 [2026-09-23 · ADR-0314] — 장비가 아니라 소모품이라 방어구 쪽에 못 든다
    'ix.seg.weapon': { ko: '무기', en: 'Weapons' },
    'ix.seg.armor': { ko: '방어구', en: 'Armor' },
    'ix.seg.potion': { ko: '물약', en: 'Potions' },
    /* 물약 묶음 — **종류 하나가 묶음 하나**이고 머리가 종류 이름이다 (§9-1 · ADR-0314).
       **물약 이름은 여기 없다** — `potion.csv:name_kr`/`name_en` 을 `L()` 로 푼다(무기 베이스 `ix.b.*` 와 다르다 ·
       그쪽은 묶음이 CSV 행을 아직 안 읽어서 생긴 임시다). `kind` 만 CSV 에 라벨 컬럼이 없어 이 줄이 든다. */
    'ix.g.potion': { ko: '{kind} 포션', en: '{kind} Potions' },
    'ix.pk.heal': { ko: '회복', en: 'Healing' },
    /* 무기 베이스 — 도감 타일 이름 (2026-09-10 · 둔기 · 창 · 활 2026-09-11 · 스태프 · 오브 · 십자가 · 성경 · 석궁 2026-09-14). ⚠ **`weapon_base.csv` 와 같은 이름이 두 벌이다** —
       본편 열 무기군 전부 CSV 행이 섰으므로 도감이 `L(row)` 로 읽게 되면 이 줄들은 걷는다. 그때까지 CSV 와 **글자까지 같게** 둔다.
       **영어가 원본이고 한글은 직역**이다 (CLAUDE.md 규칙 6). */
    'ix.g.weaponBase': { ko: '{group} 베이스', en: '{group} Bases' },
    'ix.b.long_sword': { ko: '롱 소드', en: 'Long Sword' },
    'ix.b.claymore': { ko: '클레이모어', en: 'Claymore' },
    'ix.b.highland_blade': { ko: '하이랜드 블레이드', en: 'Highland Blade' },
    'ix.b.bastard_sword': { ko: '바스타드 소드', en: 'Bastard Sword' },
    'ix.b.balrog_blade': { ko: '발록 블레이드', en: 'Balrog Blade' },
    'ix.b.zweihander': { ko: '츠바이핸더', en: 'Zweihander' },
    'ix.b.colossus_blade': { ko: '콜로서스 블레이드', en: 'Colossus Blade' },
    'ix.b.hatchet': { ko: '해칫', en: 'Hatchet' },
    'ix.b.axe': { ko: '액스', en: 'Axe' },
    'ix.b.tomahawk': { ko: '토마호크', en: 'Tomahawk' },
    'ix.b.great_axe': { ko: '그레이트 액스', en: 'Great Axe' },
    'ix.b.berserker_axe': { ko: '버서커 액스', en: 'Berserker Axe' },
    'ix.b.battle_axe': { ko: '배틀 액스', en: 'Battle Axe' },
    'ix.b.decapitator': { ko: '데카피테이터', en: 'Decapitator' },
    'ix.b.club': { ko: '클럽', en: 'Club' },
    'ix.b.flanged_mace': { ko: '플랜지드 메이스', en: 'Flanged Mace' },
    'ix.b.reinforced_mace': { ko: '리인포스드 메이스', en: 'Reinforced Mace' },
    'ix.b.battle_hammer': { ko: '배틀 해머', en: 'Battle Hammer' },
    'ix.b.legendary_mallet': { ko: '레전더리 맬릿', en: 'Legendary Mallet' },
    'ix.b.war_club': { ko: '워 클럽', en: 'War Club' },
    'ix.b.ogre_maul': { ko: '오우거 몰', en: 'Ogre Maul' },
    'ix.b.pike': { ko: '파이크', en: 'Pike' },
    'ix.b.thresher': { ko: '스레셔', en: 'Thresher' },
    'ix.b.giant_thresher': { ko: '자이언트 스레셔', en: 'Giant Thresher' },
    'ix.b.halberd': { ko: '할버드', en: 'Halberd' },
    'ix.b.cryptic_axe': { ko: '크립틱 액스', en: 'Cryptic Axe' },
    'ix.b.lance': { ko: '랜스', en: 'Lance' },
    'ix.b.war_pike': { ko: '워 파이크', en: 'War Pike' },
    'ix.b.short_bow': { ko: '숏 보우', en: 'Short Bow' },
    'ix.b.long_bow': { ko: '롱 보우', en: 'Long Bow' },
    'ix.b.great_bow': { ko: '그레이트 보우', en: 'Great Bow' },
    'ix.b.rune_bow': { ko: '룬 보우', en: 'Rune Bow' },
    'ix.b.diamond_bow': { ko: '다이아몬드 보우', en: 'Diamond Bow' },
    'ix.b.gothic_bow': { ko: '고딕 보우', en: 'Gothic Bow' },
    'ix.b.hydra_bow': { ko: '하이드라 보우', en: 'Hydra Bow' },
    'ix.b.short_staff': { ko: '숏 스태프', en: 'Short Staff' },
    'ix.b.long_staff': { ko: '롱 스태프', en: 'Long Staff' },
    'ix.b.gnarled_staff': { ko: '날드 스태프', en: 'Gnarled Staff' },
    'ix.b.gothic_staff': { ko: '고딕 스태프', en: 'Gothic Staff' },
    'ix.b.elder_staff': { ko: '엘더 스태프', en: 'Elder Staff' },
    'ix.b.rune_staff': { ko: '룬 스태프', en: 'Rune Staff' },
    'ix.b.archon_staff': { ko: '아콘 스태프', en: 'Archon Staff' },
    'ix.b.eagle_orb': { ko: '이글 오브', en: 'Eagle Orb' },
    'ix.b.heavenly_stone': { ko: '헤븐리 스톤', en: 'Heavenly Stone' },
    'ix.b.demon_heart': { ko: '데몬 하트', en: 'Demon Heart' },
    'ix.b.sacred_globe': { ko: '세이크리드 글로브', en: 'Sacred Globe' },
    'ix.b.eldritch_orb': { ko: '엘드리치 오브', en: 'Eldritch Orb' },
    'ix.b.swirling_crystal': { ko: '스월링 크리스탈', en: 'Swirling Crystal' },
    'ix.b.dimensional_shard': { ko: '디멘셔널 샤드', en: 'Dimensional Shard' },
    'ix.b.scepter': { ko: '셉터', en: 'Scepter' },
    'ix.b.divine_scepter': { ko: '디바인 셉터', en: 'Divine Scepter' },
    'ix.b.caduceus': { ko: '카두케우스', en: 'Caduceus' },
    'ix.b.rune_scepter': { ko: '룬 셉터', en: 'Rune Scepter' },
    'ix.b.mighty_scepter': { ko: '마이티 셉터', en: 'Mighty Scepter' },
    'ix.b.grand_scepter': { ko: '그랜드 셉터', en: 'Grand Scepter' },
    'ix.b.seraph_rod': { ko: '세라프 로드', en: 'Seraph Rod' },
    'ix.b.psalter': { ko: '솔터', en: 'Psalter' },
    'ix.b.breviary': { ko: '브리비어리', en: 'Breviary' },
    'ix.b.missal': { ko: '미설', en: 'Missal' },
    'ix.b.lectern_bible': { ko: '렉턴 바이블', en: 'Lectern Bible' },
    'ix.b.great_bible': { ko: '그레이트 바이블', en: 'Great Bible' },
    'ix.b.wicked_bible': { ko: '위키드 바이블', en: 'Wicked Bible' },
    'ix.b.apocrypha': { ko: '아포크리파', en: 'Apocrypha' },
    'ix.b.crossbow': { ko: '크로스보우', en: 'Crossbow' },
    'ix.b.light_crossbow': { ko: '라이트 크로스보우', en: 'Light Crossbow' },
    'ix.b.chu_ko_nu': { ko: '추코누', en: 'Chu-Ko-Nu' },
    'ix.b.heavy_crossbow': { ko: '헤비 크로스보우', en: 'Heavy Crossbow' },
    'ix.b.ballista': { ko: '발리스타', en: 'Ballista' },
    'ix.b.demon_crossbow': { ko: '데몬 크로스보우', en: 'Demon Crossbow' },
    'ix.b.colossus_crossbow': { ko: '콜로서스 크로스보우', en: 'Colossus Crossbow' },
    /* 스킬은 **직업으로 묶는다** [개정 2026-09-08 사용자 지시 — §9-1]. 그룹 하나가 한 직업이고 그 안에
       그 직업의 스킬 전부가 선다 — **1스킬 = 1직업**이라 묶는 일이 `owner_id` 하나로 끝난다(2026-09-09).
       삭제된 키 셋 — `ix.g.skillClass`·`ix.g.skillWeapon`(09-08 · `owner_kind` 를 그대로 묶던 이름) ·
       **`ix.skillFrom`**(09-09 · 무기군 액티브의 이름표였는데 무기군 고정 폐기로 이름표 자체가 사라졌다) */
    'ix.g.skillCls': { ko: '{cls} 스킬', en: '{cls} Skills' },
    'ix.mastery.sin': { ko: '죄종', en: 'Sin' },
    'ix.mastery.class': { ko: '직업', en: 'Class' },
    'ix.mastery.adv': { ko: '전직', en: 'Advancement' },
    'ix.mastery.previewRank': { ko: '1/{max}랭크 예시', en: 'Rank 1/{max} preview' },
    // 스킬 세그먼트의 안쪽 분류 [2026-09-24 · §9-1 · ADR-0335] — 직업은 탭이 아니라 일반 탭의 묶음이다(0299 의 직업 탭 대체)
    'ix.seg.basic': { ko: '일반 스킬', en: 'Basic Skills' },
    'ix.seg.adv': { ko: '전직 스킬', en: 'Advanced Skills' },
    // 이펙트 세그먼트 [2026-10-05 · §9-1 · ADR-0513 · 세그먼트로 2026-10-09 ADR-0559] — 스킬마다 관전 이펙트를 띄운다 · 맨 위 버튼이 전부를 띄운다
    'ix.fx.playAll': { ko: '▶ 전부 재생', en: '▶ Play All' },
    // 이펙트 세그먼트의 그림체 탭 [2026-10-09 · §9-1 · ADR-0559] — 키 = skill_art.js:ART_STYLES · 실전 그림체에는 live 가 이름을 감싼다
    'ix.fxs.darktoon': { ko: '다크 카툰', en: 'Dark Cartoon' },
    'ix.fxs.foil': { ko: '금속박', en: 'Metal Foil' },
    'ix.fxs.live': { ko: '{name} · 실전', en: '{name} · In Battle' },
    // 일반 스킬 묶음 안의 티어 칸 머리 [2026-10-02 · §9-1 · ADR-0475 · `skill.csv:tier`]
    'ix.tier': { ko: '{n}티어', en: 'Tier {n}' },
    /* 전직 스킬 묶음의 이름 — `ix.adv.*`(전직) · `ix.sk.*`(스킬) 11 키는 2026-10-02 삭제. 묶음 머리는 `advance.csv`,
       타일 이름은 `skill.csv` 가 든다(§9-1 · ADR-0472) */
    'ix.count': { ko: '{n}장', en: { one: '{n} image', other: '{n} images' } },
    'ix.style': { ko: '얼굴 스타일', en: 'Face style' },
    'ix.hero': { ko: '영웅 {n}', en: 'Hero {n}' },

    /* ── 전투 관전 ── */
    /* `bt.round`(「라운드」 접두)는 2026-09-04 헤드에서 라운드 수치가 삭제되며 부르는 곳이 없어져 지웠다 */
    /* 배속·건너뛰기 문구는 2026-09-04 헤드 한 줄 개정에서 줄였다 (옛 `{n}배속` · `건너뛰고 리포트만` — SCREEN_DESIGN §4-2) */
    'bt.speed': { ko: '×{n}', en: '×{n}' },
    'bt.pause': { ko: '일시정지', en: 'Pause' },
    'bt.resume': { ko: '재개', en: 'Resume' },
    'bt.retreat': { ko: '철수', en: 'Retreat' },
    // ~~`bt.potion.empty` · `bt.potion.slot`~~ (아레나 칸의 `title` 한 줄 · R104 · ADR-0148) 는 2026-09-24 삭제 —
    //   칸도 **물약 카드**를 띄운다(ADR-0315). 빈 칸 이름은 `pt.potion.empty` 한 벌로 합쳤다   // ~~건너뛰기~~ 2026-09-14 — 진행 중 라운드를 버리고 원정을 끝낸다 (R89)
    'bt.log.h': { ko: '전투 로그', en: 'Combat Log' },
    // [버프] — 아레나 왼쪽 위 구석 버튼 · 그 런의 버프를 출처별 세 줄로 (SCREEN_DESIGN §4-2 「버프」 · ADR-0461 · ADR-0462)
    'bt.buff': { ko: '버프', en: 'Buffs' },
    'bt.buff.shrine': { ko: '신단', en: 'Shrine' },
    'bt.buff.tactic': { ko: '전술', en: 'Tactics' },
    'bt.buff.codex': { ko: '도감', en: 'Codex' },
    'bt.buff.none': { ko: '없음', en: 'None' },
    'bt.note': {
        ko: '관전은 가능하되 <b>의무가 아닙니다</b> — 배속은 진행 속도만 바꿉니다. 원정 중에 바꾼 장비 · 스킬 트리는 <b>그 순간</b> 적용됩니다(보스전 중이면 다음 런부터) · <b>라운드를 이긴 순간 그 보상이 들어옵니다</b>(가방 · 골드 · 경험치 · 도감).<br>'
            + '<b>철수</b>하면 원정이 멈춥니다 — 진행 중이던 라운드는 사라지고 이긴 라운드까지의 보상은 남습니다 · 런이 끝나 다음 런을 세는 동안 누르면 다음 런이 안 나갑니다. 게임을 끄면 원정도 그 자리에서 끊깁니다.',
        en: 'Watching is allowed but <b>never required</b> — speed only changes the pace. Gear and skill-tree changes during a run apply <b>at once</b> (from the next run during a boss fight) · each round <b>pays out the moment you win it</b> (bag · gold · XP · codex).<br>'
            + '<b>Retreat</b> stops the expedition — it drops the round in progress and keeps what the won rounds gave · pressed while the next run is counting down, the next run does not head out. Closing the game cuts the expedition off on the spot.',
    },
    'bt.rTitle': { ko: 'R{n} {kind}', en: 'R{n} {kind}' },
    'bt.actTitle': { ko: '공격 속도 {s}초 — 다 차면 이 유닛 행동', en: 'Attack Speed {s}s — acts when the gauge fills' },
    'bt.castTitle': { ko: '캐스팅 속도 {s}초 — 다 차면 칸 하나 충전', en: 'Casting Speed {s}s — stores a charge when the gauge fills' },
    'bt.tab.dmg': { ko: '누적 데미지', en: 'Damage' },
    'bt.basicAttack': { ko: '기본 공격', en: 'Basic attack' },
    'bt.reflectLabel': { ko: '반사', en: 'Reflect' },
    // 물리 경직 칩의 이름 — 칩에 올리면 뜬다 (R110 · SCREEN_DESIGN §4-2 · ADR-0154)
    'bt.stagger': { ko: '경직', en: 'Stagger' },
    // 창 뱃지 툴팁 — 스킬 설명이 아니라 `buff` 이벤트의 실제 stat·v 를 짧게 말한다
    'bt.effect.active': { ko: '효과 적용 중', en: 'Effect active' },
    'bt.effect.atk.up': { ko: '공격력 {v}% 증가', en: 'Attack +{v}%' },
    'bt.effect.atk.down': { ko: '공격력 {v}% 감소', en: 'Attack −{v}%' },
    // 키 이름은 **주기**의 방향이다 — 주기가 늘면(up) 느려져 공격 속도 감소 · 줄면(down) 증가 (ADR-0358)
    'bt.effect.period.up': { ko: '공격 속도 {v}% 감소', en: 'Attack Speed −{v}%' },
    'bt.effect.period.down': { ko: '공격 속도 {v}% 증가', en: 'Attack Speed +{v}%' },
    'bt.effect.barrier': { ko: '최대 HP의 {v}% 보호막', en: 'Shield equal to {v}% max HP' },
    'bt.effect.guard.up': { ko: '방어력·모든 저항 {v}% 증가', en: 'Defense and all resistances +{v}%' },
    'bt.effect.guard.down': { ko: '방어력·모든 저항 {v}% 감소', en: 'Defense and all resistances −{v}%' },
    'bt.effect.def.up': { ko: '방어력 {v}% 증가', en: 'Defense +{v}%' },
    'bt.effect.def.down': { ko: '방어력 {v}% 감소', en: 'Defense −{v}%' },
    'bt.effect.res.up': { ko: '{e} 저항 {v}% 증가', en: '{e} resistance +{v}%' },
    'bt.effect.res.down': { ko: '{e} 저항 {v}% 감소', en: '{e} resistance −{v}%' },
    'bt.effect.resAll.up': { ko: '모든 원소 저항 {v}% 증가', en: 'All resistances +{v}%' },
    'bt.effect.resAll.down': { ko: '모든 원소 저항 {v}% 감소', en: 'All resistances −{v}%' },
    'bt.effect.hp.up': { ko: '최대 HP {v}% 증가', en: 'Max HP +{v}%' },
    'bt.effect.hp.down': { ko: '최대 HP {v}% 감소', en: 'Max HP −{v}%' },
    'bt.effect.regen.up': { ko: 'HP 재생 {v}% 증가', en: 'HP regeneration +{v}%' },
    'bt.effect.regen.down': { ko: 'HP 재생 {v}% 감소', en: 'HP regeneration −{v}%' },
    'bt.effect.taken.up': { ko: '받는 피해 {v}% 증가', en: 'Damage taken +{v}%' },
    'bt.effect.taken.down': { ko: '받는 피해 {v}% 감소', en: 'Damage taken −{v}%' },
    'bt.effect.onhit': { ko: '기본 공격 시 {e} 추가 피해 {v}%', en: '+{v}% {e} damage on basic attacks' },
    'bt.effect.splash': { ko: '기본 공격이 적 전원에게 {v}% 피해', en: 'Basic attacks deal {v}% damage to all enemies' },
    'bt.effect.duel': { ko: '시전자만 공격', en: 'Can only attack the caster' },
    'bt.effect.taunt': { ko: '적의 공격 대상을 자신으로 고정', en: 'Forces enemies to target this unit' },
    // 기본 스킬 50 의 창 [2026-10-16] — {v} = % · {n} = 횟수 · {e} = 원소
    'bt.effect.phys.up': { ko: '물리 데미지 {v}% 증가', en: 'Physical damage +{v}%' },
    'bt.effect.phys.down': { ko: '물리 데미지 {v}% 감소', en: 'Physical damage −{v}%' },
    'bt.effect.basic.up': { ko: '기본 공격 피해 {v}% 증가', en: 'Basic attack damage +{v}%' },
    'bt.effect.basic.down': { ko: '기본 공격 피해 {v}% 감소', en: 'Basic attack damage −{v}%' },
    'bt.effect.frenzy': { ko: '때릴 때마다 공격 속도 {v}% 씩 증가', en: 'Attack Speed +{v}% per hit' },
    'bt.effect.evade': { ko: '받는 공격 {n}번 회피', en: { one: 'Avoids the next {n} attack', other: 'Avoids the next {n} attacks' } },
    'bt.effect.imbue': { ko: '{e} 스킬에 상태이상 추가', en: '{e} skills inflict an ailment' },
    'bt.effect.pulse': { ko: '일정 간격으로 적 전원에게 {e} 피해', en: '{e} damage to every enemy at intervals' },
    'bt.effect.echo': { ko: '공격 스킬이 한 번 더', en: 'Attack skills fire twice' },
    'bt.effect.stagger': { ko: '행동 게이지 정지', en: 'Action gauge stopped' },
    // 상태이상 (2026-09-28 · R178 · ADR-0405) — 칩 이름 · 로그 이름 · 툴팁 적용값
    'bt.ail.freeze': { ko: '결빙', en: 'Freeze' },
    'bt.ail.burn': { ko: '화상', en: 'Burn' },
    'bt.ail.poison': { ko: '중독', en: 'Poison' },
    'bt.ail.stun': { ko: '스턴', en: 'Stun' },
    'bt.effect.burn': { ko: '받는 피해 {v}% 증가 · 받는 회복 {c}% 감소', en: 'Damage taken +{v}% · Healing received −{c}%' },
    'bt.effect.poison': { ko: '초당 독 피해 {n}', en: '{n} poison damage per second' },
    'bt.effect.stun': { ko: '행동 · 쿨타임 정지', en: 'Actions and cooldowns stopped' },
    'bt.effect.element': { ko: '원소', en: 'elemental' },
    // 현재 창의 시간 상태 — 이름 오른쪽에 값만 선다
    'bt.effect.permanent': { ko: '상시', en: 'Permanent' },
    // 로그 탭 — 줄의 **주체**(그 일을 한 쪽)로 거른다 (2026-09-15 · SCREEN_DESIGN §4-2)
    'bt.logf.all': { ko: '전체', en: 'All' },
    'bt.logf.party': { ko: '우리', en: 'Party' },
    'bt.logf.enemy': { ko: '적', en: 'Enemies' },
    // 누적 데미지 탭 — 값의 **축**을 고른다 (2026-09-21 · ADR-0252)
    'bt.dmgf.dealt': { ko: '가한 피해', en: 'Dealt' },
    'bt.dmgf.taken': { ko: '받은 피해', en: 'Taken' },
    // 두 팀 누적 데미지 판 — 결투 관전 아래 칸의 판 이름 (SCREEN_DESIGN §1 「판」 · ADR-0769) · 열 이름은 위 `bt.dmgf.*` 를 다시 쓴다
    'bt.team.party': { ko: '우리 팀', en: 'Our team' },
    'bt.team.enemy': { ko: '상대 팀', en: 'Opponents' },
    'bt.tdmView.rows': { ko: '요약', en: 'Summary' },     // 두 팀 판 보기 버튼 (ADR-0772)
    'bt.tdmView.cols': { ko: '스킬별', en: 'By skill' },
    // 누적 데미지 막대의 조각 — 막대에 올리면 뜬다 (ADR-0252). 기타 = 종류 없는 피해(반사 · 자폭)
    'bt.dmgk.phys': { ko: '물리 {n}', en: 'Physical {n}' },
    'bt.dmgk.magic': { ko: '마법 {n}', en: 'Magic {n}' },
    'bt.dmgk.etc': { ko: '기타 {n}', en: 'Other {n}' },
    // 로그 칸 머리 줄 (2026-09-21 · ADR-0196 · ADR-0198) — 탭 바로 아래 · 「스킬」은 그림 칸 왼쪽 끝에서 시작 · 그림 칸 폭은 그림과 이 라벨 중 넓은 쪽
    'bt.logh.name': { ko: '이름', en: 'Name' },
    'bt.logh.skill': { ko: '스킬', en: 'Skill' },
    'bt.logh.target': { ko: '대상', en: 'Target' },
    'bt.logh.val': { ko: '데미지', en: 'Damage' },
    // 라운드 줄 — 종류(일반 · 정예 · 보스)는 괄호가 아니라 글 왼쪽의 칩이다(렌더러가 `kind.*` 로 붙인다 · 2026-09-21 · ADR-0205)
    'log.roundStart': { ko: '<b>라운드 {n}</b> — {list}', en: '<b>Round {n}</b> — {list}' },
    // 로그 값 칸 (2026-09-21 · ADR-0189) — 격자 방식의 한 줄은 네 칸(주체 이름 · 스킬 그림 · 대상 이름 · 값)이다. 문장 방식의 틀은 아래 `log.say.*`.
    //   글자로 서는 값만 여기 든다 — 피해 · 회복량은 숫자 그대로다. 팝업(`pop.*`)은 영어가 대문자라 따로 든다
    'log.v.miss': { ko: '빗나감', en: 'miss' },
    'log.v.counter': { ko: '반격', en: 'counter' },
    'log.v.evade': { ko: '회피', en: 'evaded' },     // 이베이드로 피한 직격 (2026-10-16)
    'log.v.echo': { ko: '한 번 더', en: 'again' },   // 에코 (2026-10-16)
    'log.v.slain': { ko: '처치', en: 'slain' },
    'log.v.downed': { ko: '전투 불능', en: 'downed' },
    'log.v.up': { ko: '발동', en: 'up' },
    'log.v.barrier': { ko: '방벽 {amt}', en: 'barrier {amt}' },
    'log.v.ended': { ko: '종료', en: 'ended' },
    'log.v.lvup': { ko: '▲ Lv.{n}', en: '▲ Lv.{n}' },   // 레벨업 — 오른 영웅의 줄 · 새 레벨 (2026-09-29 · ADR-0435)
    /* 로그 문장 틀 — `⚙` 설정의 「로그」가 `문장` 일 때 (2026-09-30 · SCREEN_DESIGN §4-2 · ADR-0459). 줄 종류마다 하나.
       **끝말을 줄인 축약형이다** — 「~습니다」 · 마침표 없이 명사로 끝낸다(좁은 열에서 한 줄에 들게 · 2026-09-30 사용자 지시 「문장줄이자 한글일경우에 특히」).
       자리: `{a}` 주체 · `{d}` 대상 · `{ico}` 스킬 그림(올리면 이름) · `{k}` 상태이상 이름 · `{v}` 값.
       `{a|이/가}` 처럼 조사 쌍(받침 있을 때/없을 때)을 달면 앞말 받침을 보고 고른다 — 그림 뒤는 **가려진 스킬 이름**의 받침(`data.js:pickJosa`).
       그림이 없는 줄(스킬 없이 걸린 상태이상 등)은 그림과 그 조사가 같이 빠진다 */
    'log.say.hit': { ko: '{a|이/가} {d}에게 {ico|으로/로} {v} 피해', en: '{a} hit {d} with {ico} for {v}' },
    'log.say.miss': { ko: '{a|이/가} {d}에게 {ico} 빗나감', en: '{a} missed {d} with {ico}' },
    'log.say.reflect': { ko: '{a|이/가} {d}에게 {v} 반사', en: '{a} reflected {v} to {d}' },
    'log.say.counter': { ko: '{a|이/가} {d}에게 반격', en: '{a} countered {d}' },
    'log.say.dot': { ko: '{d|이/가} {ico} {k|으로/로} {v} 피해', en: '{d} took {v} from {ico} {k}' },
    'log.say.heal': { ko: '{a|이/가} {ico|으로/로} {d} HP {v} 회복', en: '{a} healed {d} for {v} with {ico}' },
    'log.say.healSelf': { ko: '{a|이/가} {ico|으로/로} HP {v} 회복', en: '{a} healed {v} with {ico}' },
    'log.say.potion': { ko: '{a|이/가} {ico|으로/로} HP {v} 회복', en: '{a} drank {ico} for {v} HP' },
    'log.say.buff': { ko: '{a}에게 {ico} 발동', en: '{ico} on {a}' },
    'log.say.ail': { ko: '{a|이/가} {ico} {k}에 걸림', en: '{a} afflicted with {ico} {k}' },
    'log.say.barrier': { ko: '{a|이/가} {ico|으로/로} 방벽 {v}', en: '{a} gained {v} barrier from {ico}' },
    'log.say.buffEnd': { ko: '{a}의 {ico} 종료', en: '{ico} on {a} ended' },
    'log.say.ailEnd': { ko: '{a}의 {ico} {k} 해제', en: '{ico} {k} on {a} ended' },
    'log.say.slain': { ko: '{a} 처치', en: '{a} slain' },
    'log.say.downed': { ko: '{a} 전투 불능', en: '{a} downed' },
    'log.say.call': { ko: '{a|이/가} {ico|으로/로} {d} 소환', en: '{a} summoned {d} with {ico}' },
    'log.say.lvup': { ko: '{a} 레벨 {v} 달성', en: '{a} reached Lv.{v}' },
    'pop.dodge': { ko: '빗나감', en: 'MISS' },
    'pop.counter': { ko: '반격', en: 'COUNTER' },
    'pop.evade': { ko: '회피', en: 'EVADE' },   // 이베이드 (2026-10-16)
    'pop.echo': { ko: '에코', en: 'ECHO' },     // 에코 (2026-10-16)   // 반격한 카드에 뜬다 (ADR-0158)
    'pop.downed': { ko: '전투 불능', en: 'Downed' },
    // 레벨업 (2026-09-29 · ADR-0435) — 오른 카드의 금색 글자 · 아래 적중 변화 줄(`pop.lvupHit`)은 2026-10-22 삭제 (ADR-0718)
    'pop.lvup': { ko: '레벨 업', en: 'LEVEL UP' },
};
