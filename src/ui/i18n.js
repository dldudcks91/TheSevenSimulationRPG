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
    'ng.trait': { ko: '시작 특성', en: 'Starting Trait' },
    'ng.total': { ko: '능력치 합', en: 'Attribute Total' },
    'ng.note': {
        ko: '시작 영웅은 전부 <b>레어</b>다 — 유니크 15명은 고정 명단이라 시작에 소모하지 않는다<br>'
            + '기본 능력치는 축마다 따로 굴리되 <b>합은 [balance.csv:hero_attr_total] 로 고정</b>이다 — '
            + '세 장의 차이는 양이 아니라 <b>모양</b>이다. 장비로는 1도 오르지 않으니 여기서 나온 값은 <b>평생 간다</b><br>'
            + '최대 HP는 굴리지 않는다 — 전 영웅 [balance.csv:hero_hp_base] 공통 시작<br>'
            + '메인 죄종은 죄종 마스터리(탭1)와 파견 적성을 정한다 — 장비 궁합(세트포인트)은 <b>폐기</b> — 전술카드로 이관 (tactic_card_design.md §4)<br>'
            + '리롤은 <b>무제한·무료</b>다 — 시작 선택을 도박으로 만들지 않는다<br>'
            + '<b>미확정</b>: 합 70 자체(제안값) · 특성 효과(이름표만 굴린다) · 직업이 주력 축을 밀어주는 세기 · 죄종·직업 중복 허용 여부',
        en: 'Starting heroes are all <b>Rare</b> — the 15 Uniques are a fixed roster and are not spent at the start<br>'
            + 'Attributes roll per axis but their <b>total is fixed at [balance.csv:hero_attr_total]</b> — '
            + 'the three differ in <b>shape</b>, not in amount. Gear never raises them, so what you roll here <b>lasts forever</b><br>'
            + 'Max HP is not rolled — every hero starts at [balance.csv:hero_hp_base]<br>'
            + 'The main sin decides the sin mastery (tab 1) and dispatch aptitude — gear affinity (set points) is <b>dropped</b> — moved to tactic cards (tactic_card_design.md §4)<br>'
            + 'Rerolling is <b>unlimited and free</b> — the opening choice is not a gamble<br>'
            + '<b>Open</b>: the total itself (a proposed value) · trait effects (only names are rolled) · how strongly class should bias its key attribute · whether duplicate sins/classes are allowed',
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

    /* ── 원정 (실동작) ── */
    'exp.partyFull': { ko: '파티가 찼다', en: 'Party full' },
    'exp.noParty': { ko: '파티가 비어 있다 — 대기 영웅을 넣어라', en: 'Party is empty — add a hero from the bench' },
    'exp.locked': { ko: '이전 스테이지 클리어 필요', en: 'Clear the previous stage first' },
    'exp.stageMeta': { ko: '위험도 {lv} · 약 {m}분', en: 'Danger {lv} · ~{m} min' },
    /* 스테이지 원소 — 어느 저항을 챙겨야 하는지의 신호 (battle_design §9-8) */
    'exp.element': { ko: '원소 {e}', en: 'Element {e}' },
    'exp.repeat': { ko: '반복 원정', en: 'Auto-repeat' },
    'exp.repeat.sub': {
        ko: '승리하면 같은 곳으로 다시 나간다 · <b>게임이 켜져 있는 동안만</b> 돈다 · 부상·패배·가방 가득이면 멈춘다',
        en: 'Re-runs the same stage after a win · <b>only while the game is open</b> · stops on injury, defeat, or a full bag',
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
    'rep.reason.wipe': { ko: '전원 전투불능', en: 'Whole party downed' },
    'rep.reason.timeout': { ko: '제한시간 초과', en: 'Timed out' },
    'rep.reason.retreat': { ko: '전투불능 발생 — 파티 귀환', en: 'Someone went down — party returned' },
    'rep.roundsCleared': { ko: '{n} / {total}', en: '{n} / {total}' },
    'rep.discarded': { ko: '가방이 가득 차 {n}개를 버렸다', en: '{n} dropped — bag was full' },
    'rep.roundLine': { ko: '{list} 처치', en: '{list} slain' },
    'rep.roundNone': { ko: '처치 없음', en: 'No kills' },
    'rep.again': { ko: '같은 곳으로 다시', en: 'Run it again' },
    'rep.toIdle': { ko: '편성으로', en: 'Back to party' },
    'rep.gainsNone': { ko: '능력치 변화 없음', en: 'no attribute change' },
    'rep.cards': { ko: '도감 카드', en: 'Codex cards' },
    'rep.cardsNone': { ko: '없음', en: 'None' },
    'rep.cardLevelUp': { ko: '{name} 도감 Lv.{lv}', en: '{name} codex Lv.{lv}' },
    /* 빗나감 — 레벨 부족의 전용 신호 (battle_design §9-8). 파티 기준 {맞지 않은 타격}/{총 타격} */
    'rep.miss': { ko: '빗나감', en: 'Misses' },
    'rep.missN': { ko: '{m} / {n} ({p}%)', en: '{m} / {n} ({p}%)' },

    /* ── 캐릭터 (실동작) ── */
    'ch.equip.hint': { ko: '아이템 클릭 = 착용 · 착용 칸 클릭 = 해제', en: 'Click an item = equip · click a worn slot = unequip' },
    'ch.salvageMode': { ko: '분해 모드', en: 'Salvage mode' },
    'ch.salvageHint': { ko: '분해 모드: 클릭한 아이템을 가루로 만든다', en: 'Salvage mode: clicking an item turns it to dust' },
    'ch.err.class': { ko: '이 직업의 무기군이 아니다', en: "Not this class's weapon group" },
    'ch.err.twoHanded': { ko: '양손 무기 착용 중 — 보조 불가', en: 'Two-hander equipped — no off-hand' },
    'ch.err.bagFull': { ko: '가방이 가득 찼다', en: 'Bag is full' },
    'ch.err.missing': { ko: '아이템을 찾을 수 없다', en: 'Item not found' },
    'ch.salvaged': { ko: '분해 → 가루 +{n}', en: 'Salvaged → dust +{n}' },
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

    /* ── 시간 표기 ── */
    'time.hm': { ko: '{h}시간 {m}분', en: '{h}h {m}m' },
    'time.m': { ko: '{m}분', en: '{m}m' },
    'time.s': { ko: '{s}초', en: '{s}s' },
    'time.ms': { ko: '{m}분 {s}초', en: '{m}m {s}s' },
    'injury.left': { ko: '치료 {t} 남음', en: '{t} to recover' },

    /* ── 전투 재생 ── */
    'bt.won': { ko: '승리', en: 'Victory' },
    'bt.lost': { ko: '패배', en: 'Defeat' },
    'bt.toReport': { ko: '리포트 보기', en: 'View report' },
    'bt.nextRun': { ko: '다음 원정 {s}초 후', en: 'Next run in {s}s' },
    'log.end.win': { ko: '스테이지 클리어 — 리포트로 정리된다', en: 'Stage clear — see the report' },
    'log.end.lose': { ko: '원정 실패 — 귀환', en: 'Expedition failed — returning' },

    'nav.expedition': { ko: '원정', en: 'Expedition' },
    'nav.character': { ko: '캐릭터', en: 'Character' },
    'nav.skill': { ko: '스킬', en: 'Skills' },
    'nav.research': { ko: '연구', en: 'Research' },
    'nav.tavern': { ko: '선술집', en: 'Tavern' },
    'nav.codex': { ko: '도감', en: 'Codex' },
    'nav.help': { ko: '도움말', en: 'Help' },
    'res.gold': { ko: '골드', en: 'Gold' },
    'res.dust': { ko: '분해 가루', en: 'Dust' },
    'res.stigma': { ko: '낙인', en: 'Stigma' },
    'ui.langBtn': { ko: 'EN', en: '한국어' },   // 버튼에는 "다른 쪽" 언어를 적는다

    /* ── 도움말 탭 (2026-08-26) ──
       설명 문구는 여기서 새로 쓰지 않는다 — 인게임에서 걷어낸 *.note / *.sub / *.hint 를 같은 키로 재사용한다.
       아래 넷은 그 재사용으로 못 덮는 자리만 채운다: 페이지 제목 · 섹션 제목 하나 · 인게임에서 숫자만 남기며 밀려난 원문 둘. */
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
    'exp.cantDepart': {
        ko: '치료 중인 영웅이 있어 이 편성으로는 출발할 수 없다',
        en: 'A hero is still recovering — this party cannot depart',
    },
    'exp.party.note': {
        ko: '귀환하면 깎인 HP는 <b>무료·즉시 회복</b> — 비용은 부상(전투불능)의 치료 타이머뿐이다<br>'
            + '파티 버프는 스탯이 아니라 스킬 효과다 — 통솔의 전투 계수는 없다 (08-25)',
        en: 'Lost HP is restored <b>free and instantly</b> on return — the only cost is the recovery timer on downed heroes<br>'
            + 'Party buffs are skill effects, not a stat — Leadership has no combat coefficient (08-25)',
    },
    'exp.bench.h': { ko: '벤치', en: 'Bench' },
    'exp.bench.note': {
        ko: '파견 화면은 <b>미착수</b> — 파견처 5(영입·교역·연구·제련·채광) + 탐험(파티 단위)은 확정, 화면은 후속 (base_expedition_design §2·§3)',
        en: 'Dispatch screen <b>not started</b> — 5 dispatch posts (recruit · trade · research · smelt · mine) + party-based Exploration are confirmed; the screen comes later (base_expedition_design §2·§3)',
    },
    'exp.zones.h': { ko: '원정 지역', en: 'Expedition Zones' },
    'exp.zones.sub': { ko: '1런 = 스테이지 1개 · {r}라운드', en: '1 run = 1 stage · {r} rounds' },
    'exp.cleared': { ko: '클리어', en: 'Cleared' },
    'exp.deploy': { ko: '보내기', en: 'Deploy' },
    'exp.pick': { ko: '원정', en: 'Expedition' },
    'exp.viewComp': { ko: '구성 보기', en: 'Composition' },
    'exp.eliteR': { ko: 'R{n} 정예', en: 'R{n} Elite' },
    'exp.solo': { ko: ' 단독', en: ' solo' },
    'exp.escorts': { ko: ' + 호위 1~2', en: ' + 1–2 escorts' },
    'exp.zones.note': {
        ko: '지역 죄종은 해당 죄종 접사의 드롭 가중치를 올린다 — 타겟 파밍의 축<br>'
            + '<b>구조는 고정, 내용물은 랜덤</b> — 라운드 배치(정예 {e} / 보스 {b})는 전 스테이지 공통이고, 몬스터 조합·정예 특성만 매 런 새로 굴려진다<br>'
            + '중도 귀환해도 <b>루팅은 전량 보존</b>된다. 비용은 부상 치료 + 미클리어(다음 스테이지 미해금)뿐',
        en: "A zone's sin raises the drop weight of that sin's affixes — the axis of target farming<br>"
            + '<b>Fixed structure, random contents</b> — the round layout (elite {e} / boss {b}) is identical for every stage; only monster mixes and elite traits reroll each run<br>'
            + 'Retreating early <b>keeps all loot</b>. The cost is recovery time plus no-clear (next stage stays locked)',
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
    'rep.injuryHead': { ko: '부상 — 치료 중', en: 'Injured — Recovering' },
    'rep.injuryNote': {
        ko: '치료는 방치·오프라인 중에도 진행된다. HP는 귀환 시 무료로 전부 회복됐다',
        en: 'Recovery keeps running while idle or offline. HP was fully restored for free on return',
    },
    'rep.drops.h': { ko: '획득 장비', en: 'Loot' },
    'rep.drops.sub': { ko: '{n}개', en: '{n} items' },
    'rep.salvage': { ko: '분해', en: 'Salvage' },
    'rep.log.h': { ko: '전투 경과', en: 'Battle Summary' },
    'rep.log.sub': { ko: '정예 {e} / 보스 {b}', en: 'Elite {e} / Boss {b}' },
    'rep.contract': {
        ko: '방치형 계약 — 자리를 비워도 로스터는 파괴되지 않는다. 사건은 리포트 안에서 완결',
        en: 'The idle-game contract — the roster is never destroyed while you are away. Every event resolves inside the report',
    },

    /* ── 영웅 띠 (캐릭터·스킬·선술집 공통 상단, 2026-08-26) — 초상화 + 이름 + 지금 하는 일 ── */
    'hs.doing.idle': { ko: '대기 중', en: 'Idle' },
    'hs.doing.injured': { ko: '치료 중 · {t}', en: 'Recovering · {t}' },

    /* ── 장비 ── */
    'eq.equipped': { ko: '착용 {n} / {cap}', en: 'Equipped {n} / {cap}' },
    'eq.twoHand': { ko: '양손 무기라 보조 슬롯이 잠긴다', en: 'Two-hander locks the off-hand slot' },
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
    'pd.twoHand': { ko: '양손', en: '2H' },

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
    'ch.detail.sub': { ko: '{n} / {total}', en: '{n} / {total}' },
    'ch.detail.hn': { ko: '세부 옵션 {n}', en: 'Detailed Stats {n}' },
    'ch.detail.note': {
        ko: '전투 능력치는 <b>장비와 스킬이 만든다</b>. 값이 <b>—</b> 인 축은 0이 아니라 '
            + '<b>아직 아무것도 그 축을 건드리지 않았다</b>는 뜻이다 — 비어 있는 축이 곧 다음 장비의 자리다.<br>'
            + '괄호 안 약어 = 이 축을 미는 기본 능력치. 표는 src/data/combat_stat.csv 를 그대로 따른다',
        en: 'Combat stats are <b>built by gear and skills</b>. A <b>—</b> is not zero — it means '
            + '<b>nothing has touched that axis yet</b>, and an empty axis is where the next item goes.<br>'
            + 'The abbreviation in parentheses is the attribute that scales it. This table mirrors src/data/combat_stat.csv',
    },
    'ch.skill.h': { ko: '현재 스킬', en: 'Current Skills' },
    'ch.skill.go': { ko: '스킬 트리 열기', en: 'Open skill tree' },
    'ch.items.h': { ko: '아이템', en: 'Items' },
    'ch.items.sub': { ko: '{n} / {cap} 칸', en: '{n} / {cap} slots' },

    /* ── 툴팁 ── */
    'tip.empty': { ko: '비어 있음', en: 'Empty' },
    'tip.equipped': { ko: '착용 중', en: 'Equipped' },
    'tip.this': { ko: '이 아이템', en: 'This Item' },
    'tip.noAffix': { ko: '접사 없음', en: 'No affixes' },
    'tip.ringSlot': { ko: '반지 {n}번 칸에 낀다', en: 'Goes on ring slot {n}' },
    // 영웅 · 스킬 툴팁 (2026-08-28) — 영웅 띠와 관전 유닛 카드가 같이 쓴다 (ui/tip.js)
    'tip.hero.h': { ko: '영웅', en: 'Hero' },
    'tip.hero.lv': { ko: 'Lv.{n}', en: 'Lv.{n}' },
    'tip.skill.h': { ko: '스킬', en: 'Skill' },

    /* ── 스킬 ── */
    /* ── 연구 탭 — 파티 전술 (2026-08-30 · SCREEN_DESIGN §13) ── */
    'rs.h': { ko: '파티 전술', en: 'Party Tactics' },
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
    'rs.cond.always': { ko: '조건 없음', en: 'No condition' },
    'rs.cond.party_size': { ko: '파티 {n}명 이상', en: 'Party of {n}+' },
    'rs.cond.sin_same': { ko: '같은 죄종 {n}명 이상', en: '{n}+ heroes sharing a sin' },
    'rs.cond.sin_kind': { ko: '죄종 {n}종 이상', en: '{n}+ different sins' },
    'rs.cond.class_same': { ko: '같은 직업 {n}명 이상', en: '{n}+ heroes sharing a class' },
    'rs.cond.affix_sin': { ko: '{a} 접사 {n}개 이상', en: '{n}+ {a} affixes' },
    'rs.cond.two_hand': { ko: '양손 무기 {n}명 이상', en: '{n}+ two-handed weapons' },
    'rs.cond.damage_kind': { ko: '{a} 무기 {n}명 이상', en: '{n}+ {a} weapons' },
    'rs.cond.skill_tag': { ko: '{a} 스킬 보유 {n}명 이상', en: '{n}+ heroes with a {a} skill' },

    'sk.points.h': { ko: '스킬 포인트', en: 'Skill Points' },
    'sk.points.note': {
        ko: '죄종 마스터리와 직업 마스터리가 <b>포인트 풀을 공유</b>한다 — 같은 축이 양쪽에 있어도 중복이 아니라 <b>기회비용이 있는 선택</b>이다.<br>'
            + '레벨업마다 받고, <b>초기화는 무료·수시</b>다 — 전액 돌려받으므로 잘못 찍어 영웅 하나를 버리는 일이 없다.<br>'
            + '⚠ 전직 전용 포인트는 별개 풀인데 <b>전직 층이 미구현</b>이라 아직 없다.',
        en: 'Sin mastery and class mastery <b>share one point pool</b> — the same axis appearing on both sides is not redundancy but a <b>choice with opportunity cost</b>.<br>'
            + 'You earn points on level-up, and <b>resetting is free and always available</b> — a full refund, so no hero is ever ruined by a bad pick.<br>'
            + '⚠ Advancement points are a separate pool, absent until the advancement layer exists.',
    },
    'sk.points.left': { ko: '남은 포인트', en: 'Points left' },
    'sk.reset': { ko: '초기화', en: 'Reset' },
    'sk.reset.done': { ko: '{n} 포인트를 돌려받았다', en: 'Refunded {n} points' },
    'sk.needLv': { ko: 'Lv.{lv}', en: 'Lv.{lv}' },
    'sk.err.locked': { ko: 'Lv.{lv} 부터 찍을 수 있다', en: 'Available from Lv.{lv}' },
    'sk.err.maxRank': { ko: '이미 최대 랭크다', en: 'Already at max rank' },
    'sk.err.points': { ko: '스킬 포인트가 없다', en: 'No skill points left' },
    'sk.slots.h': { ko: '액티브', en: 'Actives' },
    'sk.slots.sub': { ko: '3개 — 순서 = 우선순위', en: '3 — order = priority' },
    'sk.cycle': { ko: '행동 주기', en: 'Action Cycle' },
    'sk.cycleSec': { ko: '{s}초', en: '{s}s' },
    'sk.cycle.sub': { ko: '민첩 + 무기군 속도 (물리·마법 단일 축)', en: 'Agility + weapon-group speed (one clock for melee & magic)' },
    'sk.emptySlot': { ko: '빈 칸', en: 'Empty' },
    'sk.base': { ko: '표기 {s}초', en: 'Base {s}s' },
    'sk.eff': { ko: '실효 {s}초', en: 'Eff. {s}s' },
    'sk.aligned': { ko: '(정렬 일치)', en: '(aligned)' },
    'sk.slots.note': {
        ko: '행동 주기가 오면 <b>가장 오래 기다린 스킬</b> → 동률이면 <b>슬롯 순서</b> → 없으면 기본 공격.<br>'
            + '한 차례에 하나. 스킬은 그 차례의 공격을 <b>대체</b>하고 마나는 없다 — 행동 1회가 유일한 비용<br>'
            + '쿨은 실시간으로 돈다. 쿨이 행동 주기의 정수배일 때 손실 0 → <b>쿨감 옵션</b>이 정렬 손잡이<br>'
            + '⚠ 스킬 이름은 <b>기획 미작성</b> — 슬롯 UI 확인용 임시값이다',
        en: 'When your turn comes: <b>the longest-waiting ready skill</b> → ties go to <b>slot order</b> → none ready means a basic attack.<br>'
            + 'One action per turn. A skill <b>replaces</b> that turn\'s attack and there is no mana — the action itself is the only cost<br>'
            + 'Cooldowns run in real time. Zero loss when a cooldown is a whole multiple of the cycle → <b>CDR affixes</b> are the alignment lever<br>'
            + '⚠ Skill names are <b>unwritten design</b> — placeholders to exercise the slot UI',
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
    'cx.h': { ko: '몬스터 도감', en: 'Monster Codex' },
    'cx.sub': { ko: '카드 {pct}% 드롭 · 레벨별 필요 {list}장 — 스테이지 계열 스탯이 오른다', en: 'Cards drop at {pct}% · {list} per level — raises the stage\'s stat line' },
    'cx.chLocked': { ko: '미해금 챕터', en: 'Locked chapter' },
    'cx.chLockedTail': { ko: ' — 도달하면 열린다', en: ' — unlocks when reached' },
    'cx.sinLabel': { ko: '죄종', en: 'Sin' },
    'cx.locked': { ko: '미해금', en: 'Locked' },
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
            + '얼굴 아트는 Ch1 5종만 존재 — 나머지는 죄종 색 원판 + 이니셜로 폴백한다',
        en: 'Slaying a monster has a chance to drop <b>its card</b> ([balance.csv:codex_card_drop_pct], rolled separately from gear). '
            + "Each cumulative card threshold raises the monster's codex level and that stage's stat line — <b>farming pushes the codex</b><br>"
            + 'Cards accumulate and are never spent · kills are only recorded · card requirements live in codex_level.csv (⚠ proposed)<br>'
            + '⚠ Per-level bonus % is a <b>screen-mock placeholder</b> — to be moved into codex_level.csv. Boss-grade scaling comes later<br>'
            + 'Face art exists for 5 Ch1 monsters only — the rest fall back to a sin-colored disc + initial',
    },

    /* ── 전투 관전 ── */
    'bt.round': { ko: '라운드', en: 'Round' },
    'bt.speed': { ko: '{n}배속', en: '×{n}' },
    'bt.pause': { ko: '일시정지', en: 'Pause' },
    'bt.resume': { ko: '재개', en: 'Resume' },
    'bt.skip': { ko: '건너뛰고 리포트만', en: 'Skip to Report' },
    'bt.log.h': { ko: '전투 로그', en: 'Combat Log' },
    'bt.note': {
        ko: '관전은 가능하되 <b>의무가 아니다</b> — 배속은 재생 속도만 바꾼다. 같은 시드면 오프라인 즉시 계산과 결과가 같으므로, 안 봐도 손해가 없다.<br>'
            + '중도 귀환해도 여기까지의 루팅은 <b>전량 보존</b>된다.',
        en: 'Watching is allowed but <b>never required</b> — speed only changes playback. With the same seed the offline instant calculation gives the same result, so skipping loses nothing.<br>'
            + 'Retreating early <b>keeps all loot</b> earned so far.',
    },
    'bt.rTitle': { ko: 'R{n} {kind}', en: 'R{n} {kind}' },
    'bt.actTitle': { ko: '행동 주기 {s}초 — 다 차면 이 유닛이 행동한다', en: 'Action cycle {s}s — acts when the gauge fills' },
    'bt.traitsTitle': { ko: '죄종 고유 1 + 공통 2 — 런타임 랜덤', en: '1 sin trait + 2 common — rolled at runtime' },
    'bt.tab.dmg': { ko: '누적 데미지', en: 'Damage' },
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
    'log.downed': { ko: '{name} <b>전투 불능</b> — 귀환 시 치료 타이머', en: '{name} <b>downed</b> — recovery timer on return' },
    'pop.dodge': { ko: '빗나감', en: 'MISS' },
    'pop.slain': { ko: '처치', en: 'Slain' },
    'pop.downed': { ko: '전투 불능', en: 'Downed' },
};
