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
            + '메인 죄종은 <b>세트포인트 +1</b>의 출처다 — 장비가 하나도 없어도 붙는다<br>'
            + '리롤은 <b>무제한·무료</b>다 — 시작 선택을 도박으로 만들지 않는다<br>'
            + '<b>미확정</b>: 합 70 자체(제안값) · 특성 효과(이름표만 굴린다) · 직업이 주력 축을 밀어주는 세기 · 죄종·직업 중복 허용 여부 · '
            + '확정한 3명을 실제 로스터로 넘기는 연결(세이브 없음 — 지금은 목업 데이터로 이어진다)',
        en: 'Starting heroes are all <b>Rare</b> — the 15 Uniques are a fixed roster and are not spent at the start<br>'
            + 'Attributes roll per axis but their <b>total is fixed at [balance.csv:hero_attr_total]</b> — '
            + 'the three differ in <b>shape</b>, not in amount. Gear never raises them, so what you roll here <b>lasts forever</b><br>'
            + 'Max HP is not rolled — every hero starts at [balance.csv:hero_hp_base]<br>'
            + 'The main sin is where <b>Set Point +1</b> comes from — it applies with no gear at all<br>'
            + 'Rerolling is <b>unlimited and free</b> — the opening choice is not a gamble<br>'
            + '<b>Open</b>: the total itself (a proposed value) · trait effects (only names are rolled) · how strongly class should bias its key attribute · whether duplicate sins/classes are allowed · '
            + 'handing the confirmed three to the real roster (no save yet — for now it continues into the mock data)',
    },

    /* ── 새 게임 · 세이브 (2026-08-25) ── */
    'ng.continue': { ko: '이어하기', en: 'Continue' },
    'ng.hasSave': { ko: '저장된 게임이 있다 — {t}', en: 'A saved game exists — {t}' },
    'ng.saveLine': { ko: '영웅 {h}명 · 클리어 {c} · 골드 {g}', en: '{h} heroes · {c} cleared · {g} gold' },
    'ng.overwrite': { ko: '세이브를 지우고 이 셋으로 시작', en: 'Delete save & start with these' },
    'ng.overwriteConfirm': { ko: '정말? 한 번 더 누르면 지운다', en: 'Really? Click again to delete' },
    'ng.startWeapon': { ko: '직업 무기 1개를 쥐고 시작한다', en: 'Starts with one class weapon' },

    /* ── 원정 (실동작) ── */
    'exp.toParty': { ko: '파티에', en: 'To party' },
    'exp.fromParty': { ko: '빼기', en: 'Remove' },
    'exp.partyFull': { ko: '파티가 찼다', en: 'Party full' },
    'exp.noParty': { ko: '파티가 비어 있다 — 대기 영웅을 넣어라', en: 'Party is empty — add a hero from the bench' },
    'exp.locked': { ko: '이전 스테이지 클리어 필요', en: 'Clear the previous stage first' },
    'exp.stageMeta': { ko: '위험도 {lv} · 약 {m}분', en: 'Danger {lv} · ~{m} min' },
    'exp.repeat': { ko: '반복 원정', en: 'Auto-repeat' },
    'exp.repeat.sub': { ko: '승리하면 같은 곳으로 다시 나간다 · 부상·패배·가방 가득이면 멈춘다', en: 'Re-runs the same stage after a win · stops on injury, defeat, or a full bag' },
    'exp.offline.h': { ko: '부재중 원정', en: 'While you were away' },
    'exp.offline.body': { ko: '{n}회 원정 ({w}승) · 골드 +{g} · 가루 +{d} · XP +{x} · 아이템 {i}개', en: '{n} runs ({w} won) · gold +{g} · dust +{d} · XP +{x} · {i} items' },
    'exp.offline.stop.defeat': { ko: '패배해서 멈췄다', en: 'Stopped after a defeat' },
    'exp.offline.stop.injured': { ko: '부상자가 생겨 멈췄다', en: 'Stopped — a hero was injured' },
    'exp.offline.stop.bagFull': { ko: '가방이 가득 차 멈췄다', en: 'Stopped — bag is full' },
    'exp.offline.stop.limit': { ko: '정산 상한 {h}시간에 닿았다', en: 'Hit the {h}h catch-up cap' },
    'exp.offline.dismiss': { ko: '확인', en: 'OK' },

    /* ── 리포트 (실동작) ── */
    'rep.defeat': { ko: '패배', en: 'Defeat' },
    'rep.retreat': { ko: '철수', en: 'Retreat' },
    'rep.reason.wipe': { ko: '전원 전투불능', en: 'Whole party downed' },
    'rep.reason.timeout': { ko: '제한시간 초과', en: 'Timed out' },
    'rep.roundsCleared': { ko: '{n} / {total}', en: '{n} / {total}' },
    'rep.discarded': { ko: '가방이 가득 차 {n}개를 버렸다', en: '{n} dropped — bag was full' },
    'rep.roundLine': { ko: '{list} 처치', en: '{list} slain' },
    'rep.roundNone': { ko: '처치 없음', en: 'No kills' },
    'rep.again': { ko: '같은 곳으로 다시', en: 'Run it again' },
    'rep.toIdle': { ko: '편성으로', en: 'Back to party' },
    'rep.gainsNone': { ko: '능력치 변화 없음', en: 'no attribute change' },

    /* ── 캐릭터 (실동작) ── */
    'ch.equip.hint': { ko: '아이템 클릭 = 착용 · 착용 칸 클릭 = 해제', en: 'Click an item = equip · click a worn slot = unequip' },
    'ch.salvageMode': { ko: '분해 모드', en: 'Salvage mode' },
    'ch.salvageHint': { ko: '분해 모드: 클릭한 아이템을 가루로 만든다', en: 'Salvage mode: clicking an item turns it to dust' },
    'ch.err.class': { ko: '이 직업의 무기가 아니다', en: "Not this class's weapon" },
    'ch.err.twoHanded': { ko: '양손 무기 착용 중 — 보조 불가', en: 'Two-hander equipped — no off-hand' },
    'ch.err.bagFull': { ko: '가방이 가득 찼다', en: 'Bag is full' },
    'ch.salvaged': { ko: '분해 → 가루 +{n}', en: 'Salvaged → dust +{n}' },
    'ch.weaponOf': { ko: '{cls} 무기', en: '{cls} weapon' },
    'ch.noTrees': { ko: '스킬 트리는 아직 목업이다', en: 'Skill trees are still a mockup' },

    /* ── 선술집 (실동작) ── */
    'tv.hire': { ko: '고용 ({g} 골드)', en: 'Hire ({g} gold)' },
    'tv.reroll': { ko: '후보 교체 ({g} 골드)', en: 'New candidates ({g} gold)' },
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
    'nav.tavern': { ko: '선술집', en: 'Tavern' },
    'nav.codex': { ko: '도감', en: 'Codex' },
    'res.gold': { ko: '골드', en: 'Gold' },
    'res.dust': { ko: '분해 가루', en: 'Dust' },
    'res.stigma': { ko: '낙인', en: 'Stigma' },
    'ui.note': { ko: '설명', en: 'Details' },
    'ui.langBtn': { ko: 'EN', en: '한국어' },   // 버튼에는 "다른 쪽" 언어를 적는다

    /* ── 공통 ── */
    'injury.short': { ko: ' · 부상', en: ' · Injured' },
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
    'exp.party.sub': { ko: '전투 {n}인 — 동시 원정 {m}팀', en: '{n} fighters — {m} expedition at a time' },
    'exp.emptySlot': { ko: '+ 빈 자리', en: '+ Empty' },
    'exp.leader': { ko: '리더', en: 'Leader' },
    'exp.cantDepart': {
        ko: '치료 중인 영웅이 있어 이 편성으로는 출발할 수 없다',
        en: 'A hero is still recovering — this party cannot depart',
    },
    'exp.party.note': {
        ko: '리더의 통솔이 파티 전원에게 적용된다<br>귀환하면 깎인 HP는 <b>무료·즉시 회복</b> — 비용은 부상(전투불능)의 치료 타이머뿐이다',
        en: "The leader's Leadership applies to the whole party<br>Lost HP is restored <b>free and instantly</b> on return — the only cost is the recovery timer on downed heroes",
    },
    'exp.bench.h': { ko: '벤치', en: 'Bench' },
    'exp.bench.sub': { ko: '파견 대기 · 로스터 {n} / {cap}', en: 'Awaiting dispatch · Roster {n} / {cap}' },
    'exp.bench.note': {
        ko: '파견 화면은 <b>미착수</b> — 파견 유형 목록이 미정이다 (base_expedition_design §6)',
        en: 'Dispatch screen <b>not started</b> — the dispatch type list is undecided (base_expedition_design §6)',
    },
    'exp.zones.h': { ko: '원정 지역', en: 'Expedition Zones' },
    'exp.zones.sub': { ko: '1런 = 스테이지 1개 · {r}라운드', en: '1 run = 1 stage · {r} rounds' },
    'exp.cleared': { ko: '클리어', en: 'Cleared' },
    'exp.deploy': { ko: '보내기', en: 'Deploy' },
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

    /* ── 영웅 선택 ── */
    'hp.h': { ko: '영웅', en: 'Heroes' },

    /* ── 장비 ── */
    'eq.passive.h': { ko: '고유 패시브', en: 'Unique Passive' },
    'eq.equipped': { ko: '착용 {n} / 8', en: 'Equipped {n} / 8' },
    'eq.twoHand': { ko: '양손 무기라 보조 슬롯이 잠긴다', en: 'Two-hander locks the off-hand slot' },
    'st.atk': { ko: '공격력', en: 'Attack' },
    'st.def': { ko: '방어력', en: 'Defense' },
    'st.maxhp': { ko: '최대 HP', en: 'Max HP' },
    'eq.set.h': { ko: '세트포인트', en: 'Set Points' },
    'eq.set.sub': { ko: '{list} — 상한 {max}', en: '{list} — cap {max}' },
    'eq.mainSin': { ko: '메인 죄종 +1', en: 'Main sin +1' },
    'eq.set.note': {
        ko: '접사 1개 = 1포인트 · <b>양손 무기는 2포인트</b> (보조 슬롯 잠금 보상)<br>'
            + '<b>★ 메인 죄종 +1</b> — 장비가 없어도 붙는다. {max}세트(각성) 도달의 필수 경로<br>'
            + '상한 {max} = 장비 8부위 + 메인 죄종 1 → 각성은 한 죄종에만 성립한다',
        en: '1 affix = 1 point · <b>two-handers count 2</b> (compensation for the locked off-hand)<br>'
            + '<b>★ main sin +1</b> — applies even with no gear. The required path to the {max}-set Awakening<br>'
            + 'Cap {max} = 8 gear slots + 1 main sin → Awakening can only exist in one sin',
    },
    'eq.filter.all': { ko: '전체', en: 'All' },
    'eq.inv.note': {
        ko: '칸에 마우스를 올리면 <b>착용 중인 장비와 나란히</b> 비교된다. 테두리 색 = 희귀도',
        en: 'Hover a cell to compare it <b>side by side with the equipped item</b>. Border color = rarity',
    },
    'pd.twoHand': { ko: '양손', en: '2H' },

    /* ── 캐릭터 탭 (2026-08-23 개편) — 영웅 띠 / 장비·전체·세부·스킬 4칸 / 아이템 가로 ── */
    'ch.roster.h': { ko: '영웅', en: 'Heroes' },
    'ch.roster.sub': { ko: '보유 {n} / {cap}', en: '{n} / {cap} owned' },
    'ch.gear.h': { ko: '장비', en: 'Equipment' },
    'ch.attr.h': { ko: '전체 능력치', en: 'Attributes' },
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
    'ch.detail.h': { ko: '세부 능력치', en: 'Combat Stats' },
    'ch.detail.sub': { ko: '{n} / {total}', en: '{n} / {total}' },
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
    'tip.zeroSet': { ko: '세트포인트 0', en: '0 set points' },

    /* ── 스킬 ── */
    'sk.points.h': { ko: '스킬 포인트', en: 'Skill Points' },
    'sk.points.note': {
        ko: '3탭이 <b>포인트 풀을 공유</b>한다. 3택1 같은 선택은 없고, 개성은 "선택"이 아니라 <b>"배분"</b>에서 나온다.',
        en: 'All 3 tabs <b>share one point pool</b>. No pick-one-of-three — identity comes from <b>allocation</b>, not selection.',
    },
    'sk.slots.h': { ko: '액티브 슬롯', en: 'Active Slots' },
    'sk.slots.sub': { ko: '3개 — 순서 = 우선순위', en: '3 — order = priority' },
    'sk.cycle': { ko: '행동 주기', en: 'Action Cycle' },
    'sk.cycleSec': { ko: '{s}초', en: '{s}s' },
    'sk.cycle.sub': { ko: '민첩 + 무기 속도 (물리·마법 단일 축)', en: 'Agility + weapon speed (one clock for melee & magic)' },
    'sk.emptySlot': { ko: '빈 슬롯', en: 'Empty slot' },
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
    'sk.sinTree': { ko: '{sin} 트리', en: '{sin} Tree' },
    'sk.sinTree.sub': { ko: '죄종에서 옴 — 모든 {sin} 영웅 공유', en: 'From the sin — shared by all {sin} heroes' },
    'sk.sinTree.missing': {
        ko: '{sin} 트리 <b>미작성</b> — 죄종 트리 7종은 sin_mapping.md 에서 접사·세트와 함께 확정된다',
        en: '{sin} tree <b>unwritten</b> — all 7 sin trees are finalized in sin_mapping.md alongside affixes and sets',
    },
    'sk.mastery': { ko: '{cls} 마스터리', en: '{cls} Mastery' },
    'sk.mastery.missing': {
        ko: '{cls} 마스터리 <b>미작성</b> — 본편 5직업 × (마스터리+전직) = 트리 10개가 최대 콘텐츠 부채',
        en: '{cls} mastery <b>unwritten</b> — 5 launch classes × (mastery + advancement) = 10 trees, the largest content debt',
    },
    'sk.advTree': { ko: '전직 트리', en: 'Advancement Tree' },
    'sk.advLocked': { ko: 'Lv.{lv} 해금 — 현재 Lv.{cur}', en: 'Unlocks at Lv.{lv} — now Lv.{cur}' },
    'sk.advOpen': { ko: '해금됨', en: 'Unlocked' },
    'sk.lockedSuffix': { ko: ' (잠김)', en: ' (locked)' },
    'sk.grid.note': {
        ko: '트리 하나 = <b>3행 × 5열</b>. 열은 깊이(왼→오), 행은 병렬 분기 — <b>선이 있으면 왼쪽 칸이 선행 조건</b>이고, 선이 없으면 독립 노드다<br>'
            + '빈 칸은 기획 미작성 자리다. 노드 이름은 skill_design.md 에 적힌 컨셉만 올렸다',
        en: 'One tree = <b>3 rows × 5 columns</b>. Columns are depth (left→right), rows are parallel branches — <b>a line means the left node is a prerequisite</b>; no line means independent<br>'
            + 'Empty cells are unwritten design. Node names only use concepts already in skill_design.md',
    },

    /* ── 선술집 ── */
    'tv.h': { ko: '영입 후보', en: 'Recruits' },
    'tv.sub': { ko: '레어 층 — 직업 × 죄종 × 시작특성이 등장 시 굴려진다', en: 'Rare tier — class × sin × trait rolled on arrival' },
    'tv.trait': { ko: '특성', en: 'Trait' },
    'tv.reroll.note': {
        ko: '선술집 리롤 = <b>아이템 파밍의 영웅판</b> — 굴림 루프는 <b>레어 층</b>에 산다. 죄종 × 직업 35칸을 전부 여기서 공급한다',
        en: 'Tavern rerolls are <b>item farming for heroes</b> — the rolling loop lives in the <b>rare tier</b>, which supplies all 35 sin × class combinations',
    },
    'tv.uniqueTodo.h': { ko: '유니크 영웅 — 선술집 희귀 등장', en: 'Unique heroes — rare tavern appearances' },
    'tv.uniqueTodo.b': {
        ko: '명단 주기 갱신에 희귀 등장 — 매력 영웅 배치가 등장 확률·품질을 올린다 (hero_design.md §1)',
        en: 'Appears rarely on the periodic roster refresh — stationing a high-Charisma hero raises the odds and quality (hero_design.md §1)',
    },
    'tv.roster.h': { ko: '보유 로스터', en: 'Roster' },
    'tv.roster.sub': { ko: '{n} / {cap} — 소수 정예 · 유니크 {u}명', en: '{n} / {cap} — small and elite · {u} unique' },
    'tv.inParty': { ko: '전투 파티', en: 'In Party' },
    'tv.noPassive': { ko: '없음 (레어)', en: 'None (Rare)' },
    'tv.tiers.note': {
        ko: '<b>유니크</b> — 이름·직업·죄종 고정 + 고유 패시브 1개, 로스터에 1명만. 본편 15명(직업별 3)이 상한<br>'
            + '<b>레어</b> — 전부 굴림, 고유 패시브 없음. 죄종 × 직업 35칸 커버리지를 전담한다',
        en: '<b>Unique</b> — fixed name, class, and sin + 1 unique passive; one copy per roster. Capped at 15 in the base game (3 per class)<br>'
            + '<b>Rare</b> — everything rolled, no unique passive. Covers all 35 sin × class cells',
    },

    /* ── 도감 ── */
    'cx.h': { ko: '몬스터 도감', en: 'Monster Codex' },
    'cx.sub': { ko: '처치 수 문턱 {list} — 스테이지 계열 스탯이 오른다', en: 'Kill thresholds {list} — raises the stage\'s stat line' },
    'cx.chLocked': { ko: '미해금 챕터', en: 'Locked chapter' },
    'cx.chLockedTail': { ko: ' — 도달하면 열린다', en: ' — unlocks when reached' },
    'cx.sinLabel': { ko: '죄종', en: 'Sin' },
    'cx.locked': { ko: '미해금', en: 'Locked' },
    'cx.completion': { ko: '완주', en: 'Completion' },
    'cx.next': { ko: '다음 {n}', en: 'Next {n}' },
    'cx.max': { ko: '최종', en: 'Max' },
    'cx.killsTitle': { ko: '{n}회 처치', en: '{n} kills' },
    'cx.note': {
        ko: '몬스터마다 처치 수가 문턱을 넘을 때마다 그 스테이지의 계열 스탯이 오른다 — <b>파밍이 도감을 민다</b><br>'
            + '⚠ 문턱·수치는 <b>화면 확인용 임시값</b> (balance.csv 미등재). 계승 collection_group_bonus.csv 는 트리거가 발견 → 처치 수로 바뀌어 <b>신규 도감 CSV로 교체 필요</b><br>'
            + '얼굴 아트는 Ch1 5종만 존재 — 나머지는 죄종 색 원판 + 이니셜로 폴백한다',
        en: "Each kill-count threshold a monster crosses raises that stage's stat line — <b>farming pushes the codex</b><br>"
            + '⚠ Thresholds and values are <b>screen-mock placeholders</b> (not in balance.csv). The inherited collection_group_bonus.csv no longer fits (trigger changed from discovery to kills) — <b>a new codex CSV is needed</b><br>'
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
    'log.roundStart': { ko: '<b>라운드 {n} ({kind})</b> — {list}', en: '<b>Round {n} ({kind})</b> — {list}' },
    'log.crit': { ko: '{name} → {target} <b class="crit-t">{dmg}</b> 치명타!', en: '{name} → {target} <b class="crit-t">{dmg}</b> critical!' },
    'log.slain': { ko: '{name} 처치 — 드롭 판정', en: '{name} slain — rolling drops' },
    'log.downed': { ko: '{name} <b>전투 불능</b> — 귀환 시 치료 타이머', en: '{name} <b>downed</b> — recovery timer on return' },
    'pop.dodge': { ko: '회피', en: 'MISS' },
    'pop.slain': { ko: '처치', en: 'Slain' },
    'pop.downed': { ko: '전투 불능', en: 'Downed' },
};
