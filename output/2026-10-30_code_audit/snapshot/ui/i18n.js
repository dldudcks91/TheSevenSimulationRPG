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
    /* ── 제목 옆 짧은 도움말 ── */
    'ui.helpFor': { ko: '{name} 도움말', en: 'Help for {name}' },
    'hint.attributes': { ko: '영웅의 기본 능력치입니다. 전투 수치와 연구소 등록 효과의 바탕이 됩니다.', en: 'The hero’s base attributes. These determine combat values and Laboratory assignment effects.' },
    'hint.colosseum': { ko: '상대 팀을 확인하고 선택한 Party로 겨룹니다. 영웅의 장비·스킬과 편성을 함께 준비하세요.', en: 'Inspect the opposing team and fight with your selected Party. Prepare its equipment, skills and formation together.' },
    'hint.arena': { ko: '상대를 고르고 선택한 Party로 결투합니다. 전투 전에 상대 구성과 내 물약·전술을 확인하세요.', en: 'Choose an opponent and duel with the selected Party. Check both teams and your potions and tactics before starting.' },
    'hint.opponents': { ko: '후보를 누르면 상대 팀을 확인할 수 있습니다. 새 상대는 후보 목록을 다시 고릅니다.', en: 'Select a candidate to inspect its team. New opponents refreshes the candidate list.' },
    'hint.team': { ko: '선택한 Party의 영웅과 진형입니다. 편성 탭에서 인원과 자리를 바꿀 수 있습니다.', en: 'The heroes and formation of the selected Party. Change members and positions in Party.' },
    'hint.team_code': { ko: '내 팀 코드를 만들어 공유하거나 받은 코드를 불러와 친선전 상대를 정합니다.', en: 'Create a code to share your team, or load a received code to choose a friendly opponent.' },
    'hint.depart': { ko: '선택한 지역의 적과 출정 준비를 확인합니다. Party와 출정 방식을 고른 뒤 출발하세요.', en: 'Review this area’s enemies and your preparations. Choose a Party and departure mode, then deploy.' },
    'hint.cell': { ko: '같은 지역 안에서 도전할 칸을 고릅니다. 칸마다 적 구성과 진행 조건을 확인하세요.', en: 'Choose a stage within this area. Check its enemies and progression requirements.' },
    'hint.departure': { ko: '한 번 출정할지 반복할지 고릅니다. 출발하면 선택한 Party의 준비 상태가 적용됩니다.', en: 'Choose a single or repeating expedition. Deployment uses the selected Party’s preparation.' },
    'hint.foes': { ko: '이 지역에 등장하는 적입니다. 초상과 스킬에 마우스를 올리면 자세히 볼 수 있습니다.', en: 'The enemies found in this area. Hover their portraits and skills for details.' },
    'hint.story': { ko: '선택한 지역의 배경 이야기입니다.', en: 'The background story of the selected area.' },
    'hint.tactics': { ko: '조건을 만족한 전술 효과가 파티에 적용됩니다. 남길 칸은 잠그고 나머지는 리롤할 수 있습니다.', en: 'A tactic affects the party when its condition is met. Lock slots to keep them and reroll the rest.' },
    'hint.potions': { ko: '이 Party가 함께 쓸 물약과 순서입니다. 재고가 모자란 칸은 빈 채로 출발합니다.', en: 'The potions and drinking order shared by this Party. Slots without enough stock start empty.' },
    'hint.reports': { ko: '지난 원정 결과를 골라 보상과 전투 기록을 확인합니다.', en: 'Select a past expedition to review its rewards and battle record.' },
    'hint.drops': { ko: '이 원정에서 얻은 아이템입니다. 아이템에 마우스를 올리면 옵션을 확인할 수 있습니다.', en: 'Items obtained in this expedition. Hover an item to inspect its options.' },
    'hint.contribution': { ko: '영웅별 전투 기여를 비교합니다. 가한·받은 피해와 처치·전투불능 기록을 함께 살펴보세요.', en: 'Compare each hero’s contribution. Review damage dealt and taken, kills and fallen-hero records together.' },
    'hint.battle_totals': { ko: '현재까지 재생된 전투의 가한·받은 피해 누계입니다. 요약과 스킬별 보기로 비교할 수 있습니다.', en: 'Damage dealt and taken during the battle played so far. Switch between summary and per-skill views to compare.' },
    'hint.equipment': { ko: '선택한 영웅이 착용한 장비입니다. 장비에 마우스를 올리면 옵션과 사용 가능한 조작을 확인할 수 있습니다.', en: 'Equipment worn by the selected hero. Hover an item to inspect its options and available actions.' },
    'hint.sins': { ko: '착용 장비의 죄종 구성입니다. 영웅의 죄종과 장비의 죄종은 별개입니다.', en: 'The Sins of the equipped items. A hero’s Sin and equipment Sins are separate.' },
    'hint.skills': { ko: '이 영웅이 사용하는 스킬입니다. 스킬 그림에 마우스를 올리면 효과를 확인할 수 있습니다.', en: 'Skills used by this hero. Hover a skill icon to inspect its effects.' },
    'hint.combat_stats': { ko: '장비와 스킬 효과가 반영된 전투 수치입니다. 수치 이름에 마우스를 올리면 설명을 볼 수 있습니다.', en: 'Combat values including equipment and skill effects. Hover a stat name for its explanation.' },
    'hint.auto_salvage': { ko: '이 Party의 원정에서 자동 분해할 장비를 정합니다. 남길 부위와 희귀도를 확인하세요.', en: 'Choose which drops this Party automatically salvages. Check the slots and rarities you want to keep.' },
    'hint.salvage': { ko: '고른 장비를 분해합니다. 남길 장비가 포함되지 않았는지 확인하세요.', en: 'Salvage the selected equipment. Check that no items you want to keep are included.' },
    'hint.inventory': { ko: '보유한 아이템을 확인하고 장착하거나 정리합니다. 아이템에 마우스를 올리면 자세히 볼 수 있습니다.', en: 'Inspect, equip and manage owned items. Hover an item for details.' },
    'hint.stash': { ko: '따로 보관할 아이템을 두는 곳입니다. 아이템을 가방과 보관함 사이로 옮길 수 있습니다.', en: 'A place to set items aside. Move items between the bag and stash.' },
    'hint.skill_slots': { ko: '스킬을 얻은 경로별 사용 칸입니다. 빈 칸에는 스킬을 여는 조건이 표시됩니다.', en: 'Skill slots grouped by how the skills are learned. Empty slots show their unlock requirements.' },
    'hint.skill_tree': { ko: '선택한 영웅의 스킬을 배우고 강화합니다. 각 칸에서 효과와 필요한 포인트를 확인하세요.', en: 'Learn and improve the selected hero’s skills. Inspect each node’s effects and required points.' },
    'hint.skill_points': { ko: '스킬을 배우고 강화하는 데 쓰는 포인트입니다. 배분할 트리와 남은 포인트를 확인하세요.', en: 'Points used to learn and improve skills. Check the available trees and remaining points.' },
    'hint.construction': { ko: '건물을 골라 랭크를 올리면 새 기능과 상한이 열립니다. 상세에서 비용과 조건을 확인하세요.', en: 'Select buildings and raise their ranks to unlock features and limits. Check costs and requirements in the details.' },
    'hint.building': { ko: '이 건물이 연 기능과 다음 랭크 정보를 확인합니다. 건설하려면 표시된 조건과 재료가 필요합니다.', en: 'Review this building’s unlocked features and next rank. Construction requires the listed conditions and materials.' },
    'hint.building_ranks': { ko: '각 랭크에서 열리는 기능과 조건입니다. 이미 지은 랭크와 앞으로 지을 랭크를 비교할 수 있습니다.', en: 'Features and requirements for each rank. Compare completed ranks with future upgrades.' },
    'hint.next_rank': { ko: '다음 랭크의 효과·조건·비용입니다. 필요한 재료를 갖추면 건설할 수 있습니다.', en: 'The next rank’s effects, requirements and cost. Build it when the required materials are ready.' },
    'hint.advance': { ko: '조건을 갖춘 영웅의 전직 계열을 고릅니다. 확정하기 전에 계열과 사용할 스킬을 확인하세요.', en: 'Choose an advancement path for an eligible hero. Review the path and its skills before confirming.' },
    'hint.resource': { ko: '각 줄의 생산과 연구를 관리합니다. 줄 카드는 현황을, 연구 칸은 다음 효과와 비용을 보여 줍니다.', en: 'Manage each line’s production and research. Line cards show progress; research nodes show upcoming effects and costs.' },
    'hint.resource_next': { ko: '선택한 연구의 다음 레벨입니다. 비용과 시간을 확인한 뒤 연구를 시작합니다.', en: 'The selected research node’s next level. Review its cost and duration before starting.' },
    'hint.resource_levels': { ko: '이 연구의 레벨별 효과입니다. 현재 효과와 다음 레벨에서 달라지는 값을 비교하세요.', en: 'Effects at each research level. Compare current effects with the changes at the next level.' },
    'hint.resource_lines': { ko: '선택한 줄의 생산·진행 상태입니다. 건설과 연구로 해당 줄의 기능을 넓힐 수 있습니다.', en: 'Production and progress for the selected line. Buildings and research expand its capabilities.' },
    'hint.resource_effects': { ko: '이 줄에 등록한 영웅들의 능력치로 더해지는 효과입니다. 배치를 바꾸면 적용 값도 달라집니다.', en: 'Effects added by the attributes of heroes registered to this line. Changing assignments changes the applied values.' },
    'hint.assignment': { ko: '이 줄에 효과를 더할 영웅을 등록합니다. 등록된 영웅을 다시 누르면 해제할 수 있습니다.', en: 'Register a hero to add effects to this line. Select a registered hero again to remove the assignment.' },
    'hint.minigame': { ko: '선택한 자원 줄의 미니게임입니다. 화면의 조작 안내를 확인하고 시작하세요.', en: 'A minigame for the selected resource line. Review its controls before starting.' },
    'hint.explore': { ko: '탐험할 장소와 Party를 정해 보냅니다. 완료 후 돌아온 편성의 보상을 받을 수 있습니다.', en: 'Choose an exploration location and Party. Claim rewards when the exploring party returns.' },
    'hint.recruit': { ko: '후보 영웅을 확인하고 골드를 내어 고용합니다. 교체하기 전에 남길 후보는 보관할 수 있습니다.', en: 'Inspect candidate heroes and spend gold to hire them. Keep candidates you want to save before refreshing.' },
    'hint.visitors': { ko: '시간이 지나 찾아온 영웅과 보관한 후보입니다. 카드를 골라 고용하거나 떠나보낼 수 있습니다.', en: 'Heroes who arrived over time and candidates you kept. Select a card to hire or dismiss a candidate.' },
    'hint.commissions': { ko: '의뢰를 받아 목표를 채우고 보상을 받습니다. 의뢰 카드에서 조건과 진행도를 확인하세요.', en: 'Accept commissions, complete their objectives and claim rewards. Check each card’s conditions and progress.' },
    'hint.gamble': { ko: '판돈을 고르고 슬롯을 돌립니다. 심볼 조합에 따른 배당은 배당표에서 확인할 수 있습니다.', en: 'Choose a stake and spin the slots. The payout table shows rewards for symbol combinations.' },
    'hint.payouts': { ko: '당첨 조합과 배당입니다. 판돈과 함께 확인하면 한 판의 보상을 비교할 수 있습니다.', en: 'Winning combinations and their payouts. Compare them with your chosen stake.' },
    'hint.forge_make': { ko: '장비 부위나 물약을 골라 제작합니다. 만들 항목의 재료와 골드 비용을 확인하세요.', en: 'Choose an equipment slot or potion to craft. Check its material and gold costs.' },
    'hint.forge_up': { ko: '장비를 골라 강화합니다. 다음 단계의 변화와 필요한 재료를 확인한 뒤 진행하세요.', en: 'Select equipment to upgrade. Review the next step’s changes and required materials.' },
    'hint.forge_synth': { ko: '같은 종류의 아래 단계 재료를 써서 위 단계 재료를 만듭니다. 합성에 쓴 재료는 소모됩니다.', en: 'Combine lower-tier materials into a higher tier of the same material. Combining consumes the input materials.' },
    'hint.forge_craft': { ko: '크래프트는 준비 중입니다. 현재는 제작·강화·합성을 이용할 수 있습니다.', en: 'Craft is in development. Smithing, upgrading and combining are currently available.' },
    'hint.potion_stock': { ko: '현재 가진 물약의 종류와 개수입니다. 편성 탭에서 Party의 물약 칸에 넣을 수 있습니다.', en: 'Potion types and quantities currently in stock. Configure each Party’s potion belt in Party.' },
    'hint.trade': { ko: '교역 기능은 준비 중입니다. 현재 판매 중인 상품은 상단에서 확인할 수 있습니다.', en: 'Trading is in development. Browse currently available goods in the shop.' },
    'hint.special': { ko: '특수 상단 기능은 준비 중입니다.', en: 'The special trader is in development.' },
    'hint.help': { ko: '폴더를 고르거나 궁금한 말을 검색해 조작법과 게임 규칙을 찾아봅니다.', en: 'Choose a folder or search a term to find controls and game rules.' },
    'hint.codex': { ko: '몬스터·아이템·스킬 자료를 살펴봅니다. 각 항목에 마우스를 올리면 자세한 정보를 볼 수 있습니다.', en: 'Browse monster, item and skill references. Hover entries for more information.' },
    'hint.settings': { ko: '그림체와 전투 연출 등 화면 설정을 조절합니다.', en: 'Adjust display preferences such as art style and battle effects.' },
    'hint.mail': { ko: '도착한 보상을 수령합니다. 받은 첨부물은 표시된 Party의 보유 아이템에 추가됩니다.', en: 'Claim delivered rewards. Attachments are added to the items of the indicated Party.' },
    'hint.dismiss': { ko: '선택한 영웅을 로스터에서 해고합니다. 확인 전에 대상 영웅을 다시 살펴보세요.', en: 'Dismiss the selected hero from the roster. Review the chosen hero before confirming.' },
    'hint.skill_order': { ko: '스킬 줄을 드래그해 사용 우선순위를 정합니다. 먼저 쓰고 싶은 스킬을 위에 놓으세요.', en: 'Drag skill rows to set their priority. Place skills you want to use first higher in the list.' },
    'hint.frozen': { ko: '다른 탭에서 저장한 진행을 보호하기 위해 이 탭의 플레이가 멈췄습니다. 안내에 따라 다시 불러오세요.', en: 'Play in this tab has stopped to protect progress saved by another tab. Follow the instructions to reload.' },
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
    /* 능력치 범례 — 첫 카드 왼쪽 일곱 줄 (SCREEN_DESIGN §3 · ADR-0943). 대표 효과만 짧게 — 전부는 `st.desc.*`(올리면 서는 카드) */
    'ng.attrHead': { ko: '능력치가 하는 일', en: 'What each stat does' },
    'ng.attr.str': { ko: '평타 · 물리 스킬 피해', en: 'Physical damage' },
    'ng.attr.agi': { ko: '공격 · 캐스팅 속도', en: 'Attack · casting speed' },
    'ng.attr.int': { ko: '마법 스킬 피해', en: 'Magic skill damage' },
    'ng.attr.vit': { ko: '레벨업 HP · 버프 지속시간', en: 'Level-up HP · buff time' },
    'ng.attr.luck': { ko: '치명타 피해 · 드랍률 · 골드', en: 'Crit damage · loot · gold' },
    'ng.attr.ldr': { ko: '아군 버프 · 리더면 파티 전술', en: 'Buffs · tactics as leader' },
    'ng.attr.cha': { ko: '회복량 · 받는 디버프 시간 감소', en: 'Healing · shorter debuffs' },
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
        ko: '지옥에는 왕이 있었습니다.\n\n'
            + '바알. 대악마.\n'
            + '이 땅의 모든 것은 그의 것이었고,\n'
            + '7개의 감정을 나누어 부하에게 깃들게 했습니다.\n\n'
            + '분노, 시기, 탐욕, 나태, 폭식, 색욕, 오만.\n\n'
            + '그것은 지옥을 유지하는 균형이었습니다.',
        en: 'Hell had a king.\n\n'
            + 'Baal. Archdemon.\n'
            + 'Everything in this land was his,\n'
            + 'and he set seven emotions to dwell in his servants.\n\n'
            + 'Wrath, Envy, Greed, Sloth, Gluttony, Lust, Pride.\n\n'
            + 'That was the balance that held Hell together.',
    },

    'pro.s2.h': { ko: '배신의 밤', en: 'Night of Betrayal' },
    'pro.s2.b': {
        ko: '그 밤, 7개의 칼이 등에 꽂혔습니다.\n\n'
            + '뒤를 돌아봤습니다.\n'
            + '전부 아는 얼굴이었습니다.\n\n'
            + '싸웠습니다.\n'
            + '하지만 힘의 반이 이미 빠져나간 뒤였습니다.\n'
            + '묶여 있던 것이 풀려 있었습니다. 누군가가 열쇠를 넘겼습니다.\n\n'
            + '밀려납니다. 발밑이 무너집니다.',
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
        ko: '떨어졌습니다.\n\n'
            + '지옥의 빛이 멀어집니다.\n'
            + '힘이 빠져나갑니다.\n'
            + '왕좌가, 부하들의 얼굴이, 그 밤의 순서가 — 흐려집니다.\n\n'
            + '누가 칼을 들었는지.\n'
            + '누가 먼저 등을 돌렸는지.\n'
            + '7개였는지, 아니었는지.\n\n'
            + '확실한 건 하나.\n\n'
            + '배신당했습니다.\n\n'
            + '그리고 — 몸에 무언가가 새겨지는 감각.\n'
            + '뜨겁습니다. 살이 타는 것 같습니다.\n'
            + '낙인입니다. 이 추락이 남긴 저주.',
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
        ko: '눈을 떴을 때, 누군가가 물을 먹이고 있었습니다.\n'
            + '늙은 인간입니다.\n\n'
            + '몸이 무겁습니다. 배가 고픕니다. 숨이 가쁩니다.\n'
            + '전부 처음입니다. 전부 불쾌합니다.\n\n'
            + '며칠이 지났습니다.\n'
            + '인간들이 음식을 나눠줬습니다. 자기들도 부족하면서.\n'
            + '다친 곳을 감싸줬습니다. 이름도 모르는 자에게.\n\n'
            + '이해할 수 없습니다.\n'
            + '왜 이들은 저를 살리려 하는 걸까요.\n\n'
            + '지옥에서는 쓰러진 자를 밟고 지나갑니다.\n'
            + '약한 것은 버려집니다. 그것이 당연합니다.\n\n'
            + '이들은 당연한 것을 하지 않습니다.\n\n'
            + '이름은 기억합니다. 바알.\n'
            + '왕이었다는 것도. 빼앗겼다는 것도.\n'
            + '하지만 그 밤이 선명하지 않습니다.\n'
            + '7개의 칼. 아는 얼굴들. 무너지는 발밑.\n'
            + '그 사이의 것들이 — 뒤섞여 있습니다.',
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
        ko: '그 날 밤, 지평선이 붉어졌습니다.\n\n'
            + '불길. 군세. 분노의 기운.\n'
            + '이 기운을 압니다. 잊을 수 없습니다.\n\n'
            + '사탄.\n'
            + '바알이 지옥에서 추방한 자.\n'
            + '왕이 바닥에 있다는 걸 감지한 것입니다.\n\n'
            + '마을이 불탑니다. 인간들이 비명을 지릅니다.\n\n'
            + '바알은 일어섰습니다.\n'
            + '더 이상 직접 싸울 힘은 없습니다.\n'
            + '하지만 지휘하는 법은 잊지 않았습니다.\n\n'
            + '선술집에서 만난 용병들에게 명했습니다.',
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
    'pro.s5.q': { ko: '"저들을 쓸어버리세요. 제가 뒤에서 이끌겠습니다."', en: '"Sweep them away. I will lead from behind."' },
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
    /* 출정 창 머리의 헬 장 디버프 한 줄 [2026-10-28 · SCREEN_DESIGN §4-1 · ADR-0935] — {sin} = 그 장 죄종 이름 · {fx} = 아래 효과 한 마디.
       효과 값은 그 칸의 값(챕터보스 칸은 배수) — {v} = 값 % · {i} = 거는 간격 초 · {d} = 거는 시간 초 · {c} = 폭식 상한 % */
    'exp.debuffLine': { ko: '{sin} — {fx}', en: '{sin} — {fx}' },
    'exp.debuff.taken_pct': { ko: '받는 피해 +{v}%', en: 'Damage taken +{v}%' },
    'exp.debuff.poison': { ko: '{i}초마다 중독 {d}초 · 초당 최대 체력의 {v}%', en: 'Poison for {d}s every {i}s · {v}% of max HP per second' },
    'exp.debuff.heal_cut': { ko: '받는 회복 −{v}%', en: 'Healing received −{v}%' },
    'exp.debuff.freeze': { ko: '{i}초마다 결빙 {d}초 · 행동 속도 −{v}%', en: 'Freeze for {d}s every {i}s · Action speed −{v}%' },
    'exp.debuff.feast': { ko: '몬스터 데미지 초당 +{v}% · 최대 +{c}%', en: 'Monster damage +{v}% per second · up to +{c}%' },
    /* 장소 줄 잔글씨 맨 앞의 레벨 — `Lv23` [2026-10-21 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0710 · ADR-0711]. {lv} = 칸 I 의 고른 난이도 몬스터 레벨(숫자 하나 — ~~범위~~) */
    'exp.placeLv': { ko: 'Lv{lv}', en: 'Lv{lv}' },
    /* 장소 줄 잔글씨의 챕터보스 이름 — 「분노의 사탄」 [2026-10-17 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0649]. {sin} = 죄종 이름 · {name} = 몬스터 이름 */
    'exp.sinBoss': { ko: '{sin}의 {name}', en: '{name} of {sin}' },
    /* 출발 칸 줄의 라벨 — 출정 창 출정 방식 칸 맨 위 [2026-09-29 · SCREEN_DESIGN §4-1 · ADR-0437 — 위험도 줄(ADR-0104)을 걷은 자리] */
    'exp.cell.h': { ko: '출발 칸', en: 'Starting stage' },
    // 원정 중 교체 [2026-09-21 · R130 · SCREEN_DESIGN §4 · ADR-0272] — 교체로 도는 원정의 전술이 꺼졌다(효과 줄을 싣는다)
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
    // 상단바 종 — 다음 할 일과 처리 대기 결과 (ADR-0969). 배지는 안내를 제외한 대기 건수다.
    'nt.h': { ko: '알림', en: 'Notifications' },
    'nt.folder.notifications': { ko: '알림', en: 'Notifications' },
    'nt.folder.missions': { ko: '미션', en: 'Missions' },
    'nt.folder.achievements': { ko: '업적', en: 'Achievements' },
    'nt.achievementsLocked': { ko: '업적 · 준비 중', en: 'Achievements · Coming soon' },
    'nt.missionsEmpty': { ko: '진행 중인 미션 없음', en: 'No active missions' },
    'nt.count': { ko: '알림 · 처리 대기 {n}건', en: { one: 'Notifications · {n} pending task', other: 'Notifications · {n} pending tasks' } },
    'nt.next': { ko: '다음 할 일', en: 'Next step' },
    'nt.empty': { ko: '대기 중인 알림 없음', en: 'No pending tasks' },
    'nt.shortcut': { ko: '바로가기', en: 'Go to' },
    'nt.check': { ko: '확인', en: 'OK' },
    'nt.arrived': { ko: '새 알림 {n}건', en: { one: '{n} new notification', other: '{n} new notifications' } },
    'nt.kind.commission': { ko: '의뢰 목표 달성 · 보상 수령 가능', en: 'Commission goal met · Reward ready' },
    'nt.kind.explore': { ko: '탐험 완료 · 결과 수령 가능', en: 'Exploration complete · Results ready' },
    'nt.kind.join': { ko: '가입 희망 영웅 도착', en: 'Hero awaiting recruitment' },
    'nt.guide.firstExpedition': { ko: '첫 원정 출발', en: 'Start your first expedition' },
    'nt.guide.buildShop': { ko: '상단 건설 · 물품 구매 개방', en: 'Build the Trading House · Unlock purchases' },
    'nt.guide.buildTavern': { ko: '선술집 건설 · 의뢰 게시판 개방', en: 'Build the Tavern · Unlock commissions' },
    'nt.guide.earnGold': { ko: '원정으로 건설 자금 마련', en: 'Earn building funds on an expedition' },
    'nt.guide.acceptCommission': { ko: '첫 의뢰 수락', en: 'Accept your first commission' },
    'nt.guide.progressCommission': { ko: '원정을 진행해 의뢰 목표 달성', en: 'Progress your commission on an expedition' },
    'nt.guide.retryPreparation': { ko: '원정 준비 점검', en: 'Review expedition preparation' },
    'nt.retry.detail': {
        ko: 'Party {party} · {stage} · 최근 {n}회 연속 미클리어. 장비·마스터리·물약을 점검하고, 이전 구간에서 파밍해 보세요.',
        en: 'Party {party} · {stage} · {n} recent runs without a clear. Review gear, mastery and potions, or farm an earlier stage.',
    },
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
    /* 고른 줄 (SCREEN_DESIGN §8 · ADR-0971 — ~~「이 줄」 `dp.line.h` · 「속도 ×{v}」~~) — 머리 아래 하는 일 한 줄 → 지금 내는 것(소제목 = 그 내용의 이름) → 등록 효과 표 */
    'dp.line.desc.res': { ko: '철광석 · 약초 · 목재를 시간마다 생산합니다', en: 'Produces ore, herbs and timber every hour' },
    'dp.line.desc.visit': { ko: '시간마다 영웅 한 명이 선술집에 찾아옵니다', en: 'A hero comes to the tavern every few hours' },
    'dp.line.desc.train': { ko: '등록한 영웅이 시간마다 경험치를 받습니다', en: 'Assigned heroes gain XP every hour' },
    'dp.line.desc.gamble': { ko: '시간마다 골드를 법니다', en: 'Earns gold every hour' },
    'dp.out.h.res': { ko: '시간당 생산', en: 'Per Hour' },
    'dp.out.h.visit': { ko: '영웅 도착', en: 'Hero Arrivals' },
    'dp.out.h.train': { ko: '훈련 상한', en: 'Training Cap' },
    'dp.out.h.gamble': { ko: '시간당 생산', en: 'Per Hour' },
    'dp.out.interval': { ko: '도착 간격', en: 'Interval' },
    'dp.out.hours': { ko: '{h}시간', en: '{h}h' },
    'dp.out.rare': { ko: '레어 확률', en: 'Rare chance' },
    'dp.out.waiting': { ko: '대기 칸', en: 'Waiting slots' },
    'dp.out.cap': { ko: '상한 레벨', en: 'Level cap' },
    'dp.out.gold': { ko: '골드', en: 'Gold' },
    'dp.fx.h': { ko: '등록 효과', en: 'Hero Effects' },   // 고른 줄의 소제목 — 아래 영웅 카드 · 효과 표 (ADR-0700 — ~~Assigned heroes~~ 카드가 서며 영웅 목록 제목처럼 겹쳐 읽혔다)
    // 효과 표의 이름 — 속도는 그 줄이 내는 것의 이름(ADR-0971) · 값은 +n% / −n%
    'dp.fx.speed.res': { ko: '생산량', en: 'Output' },
    'dp.fx.speed.visit': { ko: '도착 속도', en: 'Arrival speed' },
    'dp.fx.speed.train': { ko: '경험치', en: 'XP' },
    'dp.fx.speed.gamble': { ko: '골드', en: 'Gold' },
    'dp.fx.burst': { ko: '대박 확률', en: 'Jackpot chance' },
    'dp.fx.quality': { ko: '레어 확률', en: 'Rare chance' },
    'dp.fx.research': { ko: '연구 속도', en: 'Research speed' },
    'dp.fx.cost': { ko: '연구 비용', en: 'Research cost' },
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
    // 상단 목록 교체 — 고른 영웅의 레벨로 다시 굴린다 · 무료는 선술집처럼 쿨다운 · 유료는 두 배씩 (§8-3 · game.shopReroll · ADR-0648)
    //   버튼은 행동과 값만 · 고른 영웅의 이름({name}) · 레벨({lv})은 버튼 왼쪽 따로 선 글자 (ADR-0965)
    'td.reroll': { ko: '교체 ({g} 골드)', en: 'Refresh ({g} gold)' },
    'td.reroll.free': { ko: '교체 (무료)', en: 'Refresh (free)' },
    'td.reroll.who': { ko: '{name} Lv {lv} 적용', en: 'For {name} Lv {lv}' },
    // 상단 제목 옆 `?` — 올리면 뜨는 두 문장 · {h} = [balance.csv:shop_refresh_hours] (ADR-0464 · ADR-0648)
    'td.reroll.help': { ko: '교체하면 고른 영웅 레벨에 맞춰 다시 들어옵니다. 무료 교체 뒤 {h}시간이 지나면 다시 무료.', en: 'A refresh restocks at the selected hero\'s level. After a free refresh, it is free again in {h} hours.' },
    'td.special': { ko: '특수상단', en: 'Visiting trader' },
    'td.trade': { ko: '교역소', en: 'Trading Post' },
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
       남는 것은 화면 라벨 · **목표 틀**(어휘마다 하나 — `{t}` = 대상 이름 · `{n}` = 목표 수) · 플래시다. `cm.fameLv` · `cm.fameMax` · `cm.claimedUp` = 명성 레벨(게시판 위 막대 줄 · 오른 수령 플래시 — §14 · ADR-0958 · R375) */
    'cm.accept': { ko: '수락', en: 'Accept' },
    'cm.claim': { ko: '수령', en: 'Claim' },
    'cm.drop': { ko: '포기', en: 'Abandon' },
    'cm.dropConfirm': { ko: '정말 포기', en: 'Confirm abandon' },
    'cm.slots': { ko: '받음 {n} / {max}', en: 'Taken {n} / {max}' },
    'cm.fameLv': { ko: '명성 Lv {lv}', en: 'Fame Lv {lv}' },
    'cm.fameMax': { ko: '최고', en: 'Max' },
    'cm.goal.chapter': { ko: '{t}의 몬스터 {n}마리', en: { one: '{n} monster in the {t}', other: '{n} monsters in the {t}' } },
    'cm.goal.race': { ko: '{t} 종족 {n}마리', en: { one: '{n} {t} foe', other: '{n} {t} foes' } },
    'cm.goal.monster': { ko: '{t} {n}마리', en: '{t} ×{n}' },
    'cm.goal.elite': { ko: '정예 {n}마리', en: { one: '{n} elite', other: '{n} elites' } },
    'cm.goal.boss': { ko: '보스 {n}마리', en: { one: '{n} boss', other: '{n} bosses' } },
    'cm.goal.rarity': { ko: '{t} 장비 {n}개', en: { one: '{n} {t} item', other: '{n} {t} items' } },
    'cm.taken': { ko: '의뢰 수락 — {goal}', en: 'Commission taken — {goal}' },
    'cm.claimed': { ko: '의뢰 완료 — {g} G', en: 'Commission complete — {g} G' },
    'cm.claimedUp': { ko: '의뢰 완료 — {g} G · 명성 Lv {lv}', en: 'Commission complete — {g} G · Fame Lv {lv}' },
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
    'fg.stage': { ko: '강화 단계', en: 'Upgrade level' },   // 강화 작업 칸의 눈금 머리 (ADR-0604)
    // 강화 성공 확률 · 실패 [2026-10-14 · R253 · ADR-0626] — 확률 칩(비용 칩 앞) · 실패 플래시 · 연출의 실패 표지
    'fg.chanceLab': { ko: '성공 확률', en: 'Success chance' },   // 강화 작업 칸 비교 줄 아래 「이름 · 값」 줄 (ADR-0973 · ~~`fg.chance` 칩~~)
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

    /* ── 도움말 탭 (2026-08-26 · 전면 정리 2026-10-29) ──
       현재 탭의 조작법과 규칙은 help.<tab>.<topic>에 한/영으로 둔다 (ADR-0946).
       기존 패널 안내 키는 사용하는 화면이 남아 있으면 유지한다. */
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

    // 각 탭의 현재 사용법 — NAV_GROUPS와 같은 순서로 helpSections가 조회합니다 (ADR-0946).
    'help.contents': { ko: '도움말 목차', en: 'Help contents' },
    'help.search.label': { ko: '도움말 검색', en: 'Search help' },
    'help.search.placeholder': { ko: '물약, 스킬, 도안처럼 궁금한 말을 입력하세요', en: 'Try potions, skills, blueprints…' },
    'help.search.clear': { ko: '검색 지우기', en: 'Clear search' },
    'help.search.all': { ko: '전체 {n}개 설명', en: { one: '{n} topic', other: '{n} topics' } },
    'help.search.count': { ko: '검색 결과 {n}개', en: { one: '{n} matching topic', other: '{n} matching topics' } },
    'help.search.empty': { ko: '맞는 설명을 찾지 못했습니다. 다른 말로 검색하거나 검색을 지워 전체 도움말을 확인합니다.', en: 'No matching topics. Try another word or clear the search to view all help.' },
    'help.expedition.first_steps.title': {
        ko: "처음 플레이하는 순서",
        en: "Your first steps",
    },
    'help.expedition.first_steps.body': {
        ko: "목표는 좋은 영웅과 장비를 모아 파티를 키우고 챕터를 진행하는 것입니다. 전투는 자동으로 진행되며, 누구를 데려가고 어떤 장비·스킬·전술을 줄지 준비하는 것이 플레이의 중심입니다.<br><br>새 게임에서 시작 영웅을 확정했다면 왼쪽 <b>[원정]</b> 탭에서 스테이지 목록을 열고 첫 스테이지를 골라 <b>[보내기]</b>로 시작합니다. 인원과 진형은 편성에서, 장비와 마스터리는 캐릭터에서 조정합니다. 전투를 계속 보고 있지 않아도 게임이 켜져 있는 동안 원정은 진행됩니다.<br><br>장비를 얻으면 캐릭터에서 착용품과 비교하고, 다음 스테이지에 도전합니다. 막히면 이미 깬 곳을 돌아 장비·경험치·재료를 모으고, 선술집의 영웅 고용이나 대장간의 제작·강화를 함께 살펴봅니다. 기능이 잠겨 있으면 건설에서 다음 해금 조건을 확인합니다. 여러 곳에서 얻은 성장을 모아 막혔던 스테이지를 넘는 흐름입니다.",
        en: "Your goal is to collect good heroes and equipment, improve the party and progress through chapters. Combat runs automatically. Your main decisions are who to bring and which gear, skills and tactics to give them.<br><br>After confirming your starting heroes, open <b>Expedition</b> in the left navigation, choose the first stage from its list and press <b>Deploy</b>. Adjust members and formation in Party, and equipment and mastery in Character. Expeditions continue while the game is open even when you are not watching.<br><br>Compare newly found gear with equipped items in Character, then try the next stage. When progress slows, revisit cleared areas for equipment, XP and materials, and consider Tavern recruits or Blacksmith crafting and upgrades. Check Construction for the next unlock when a feature is locked. Use progress gained in one activity to try the next stage again.",
    },
    'help.expedition.start.title': {
        ko: "출발과 부대",
        en: "Departure and parties",
    },
    'help.expedition.start.body': {
        ko: "왼쪽 <b>[원정]</b> 탭에서 스테이지 목록을 열고 난이도·챕터·열린 스테이지를 고릅니다. 출정 창에서 적 구성과 보상을 확인하고, 편성을 고른 뒤 <b>[보내기]</b>로 출발합니다. 인원·진형·물약·전술은 편성 탭에서 준비합니다.<br><br>한 파티에는 최대 {party}명이 들어가며, 현재 동시에 원정을 보낼 수 있는 부대는 {expeditions}개입니다. 같은 영웅을 여러 부대에 동시에 보낼 수 없습니다.",
        en: "Open the stage list with <b>Expedition</b> in the left navigation, then choose a difficulty, chapter and unlocked stage. Inspect enemies and rewards in the departure window, choose a Party preset and press <b>Deploy</b>. Prepare members, formation, potions and tactics in Party.<br><br>Each party holds up to <b>{party}</b> heroes, and the current simultaneous expedition limit is <b>{expeditions}</b>. A hero cannot join multiple active expeditions.",
    },
    'help.expedition.rounds.title': {
        ko: "라운드와 한 번의 원정",
        en: "Rounds and a complete run",
    },
    'help.expedition.rounds.body': {
        ko: "한 스테이지를 시작해서 끝낼 때까지가 한 번의 원정이며, 그 안에서 적 무리와 싸우는 단위가 라운드입니다. 라운드를 이기면 그 라운드의 보상을 받고 다음 무리와 싸웁니다. 모든 라운드를 이겨야 스테이지가 클리어됩니다.<br><br>다음 라운드로 넘어가도 깎인 HP가 저절로 가득 차지는 않습니다. 쓰러진 영웅도 그 원정에서는 계속 빠져 있으므로, 앞 라운드를 이겼어도 뒤 라운드에서 파티가 무너질 수 있습니다. 회복·보호·적을 빨리 처치하는 힘을 함께 살펴보는 이유입니다.<br><br>라운드 보상으로 레벨이 오른 영웅은 다음 라운드를 최대 HP로 시작합니다. 원정 자체가 끝나면 승패와 관계없이 모두 회복하며, 다음 원정에는 다시 전원이 출발합니다.",
        en: "A run lasts from entering a stage until that attempt ends. Each fight against a group of enemies is a round. Winning a round grants its rewards and moves on to the next group. Win every round to clear the stage.<br><br>Lost HP does not automatically refill between rounds. Fallen heroes stay out for the rest of that run, so a party that wins early rounds can still fall apart later. This is why healing, protection and killing enemies quickly all matter.<br><br>A hero who levels up from a round's rewards starts the next round at full HP. When the run itself ends, everyone recovers regardless of the result and can join the next departure.",
    },
    'help.expedition.stages.title': {
        ko: "스테이지와 난이도",
        en: "Stages and difficulty",
    },
    'help.expedition.stages.body': {
        ko: "챕터의 일반 장소에는 I·II·III 스테이지가 있으며, 한 번 출발하면 고른 스테이지 하나를 진행합니다. 같은 장소에서도 뒤 스테이지일수록 레벨이 높습니다. I·II에는 정예가 나오고 III의 마지막에는 보스가 나옵니다. 마지막 장소는 챕터보스와 싸우는 단일 라운드입니다.<br><br>노말·나이트메어에서는 이전 스테이지를 클리어하면 다음 스테이지가 열리고, 챕터보스를 클리어하면 다음 챕터가 열립니다. 난이도별 클리어 기록은 따로 관리됩니다. 헬 난이도가 열리면 해금된 챕터의 첫 스테이지를 각각 선택할 수 있고, 챕터 안에서는 순서대로 진행합니다.",
        en: "Regular areas contain stages I, II and III. Each departure runs one selected stage, with higher-level enemies in later stages of the same area. Stages I and II contain elites; stage III ends with a boss. The last area is a single round against the chapter boss.<br><br>On Normal and Nightmare, clearing a stage unlocks the next one, and beating a chapter boss opens the next chapter. Clear records are separate for each difficulty. Once Hell difficulty is unlocked, you can choose the first stage of each available chapter, then clear its stages in order.",
    },
    'help.expedition.repeat.title': {
        ko: "자동 진행과 반복",
        en: "Automatic progress and repeat",
    },
    'help.expedition.repeat.body': {
        ko: "원정은 게임이 켜져 있는 동안 계속 이어집니다. 승리하면 다음 스테이지로 전진하고, 패배하면 같은 스테이지에 다시 도전합니다. [반복 원정]을 켜면 다른 장소로 넘어가지 않고 현재 장소의 I·II·III을 순환합니다. 다음 출발까지 기본 {restart}초를 기다리며, 관전 중 [건너뛰기]로 대기를 줄일 수 있습니다.<br><br>반복을 끄고 현재 난이도의 마지막 챕터보스를 이기면 다음 난이도가 있을 때 그 첫 스테이지로 이어집니다. 원정을 멈추려면 [철수]합니다.",
        en: "Expeditions continue while the game is open. A win advances to the next stage; a defeat retries the same stage. Turn on [Auto-repeat] to cycle through stages I, II and III of the current area instead of moving to another area. The next departure normally waits {restart} seconds; [Skip] in spectate shortens that wait.<br><br>With Auto-repeat off, beating the final chapter boss continues from the first stage of the next difficulty, if one exists. Press [Retreat] to stop.",
    },
    'help.expedition.farming.title': {
        ko: "전진할 때와 반복할 때",
        en: "When to advance or repeat",
    },
    'help.expedition.farming.body': {
        ko: "새 스테이지를 클리어하면 다음 길과 건설 조건을 열 수 있습니다. [반복 원정]은 지금 장소를 더 돌며 장비·스킬 도안·골드·도감 경험치를 모으고 싶을 때 사용합니다. 반복을 켜는 것은 전투를 계속하는 스위치가 아니라, 다음에 갈 장소를 제한하는 선택입니다.<br><br>막힌 곳에 계속 도전할지, 이미 이길 수 있는 장소를 돌지는 필요한 보상으로 정합니다. 원하는 스킬 도안은 스킬 도감의 획득처를 보고, 장비를 바꾸거나 분해 재료가 필요하면 적의 장비와 인벤토리 여유도 확인합니다. 원정에서 모은 재료는 대장간과 도서관의 성장에 다시 쓸 수 있습니다.",
        en: "Clearing a new stage can open the next route and meet building requirements. Use [Auto-repeat] when you want more gear, skill blueprints, gold or Codex EXP from the current area. Repeat controls where the party goes next; expeditions continue even with it turned off.<br><br>Choose between retrying a difficult stage and farming a manageable area based on what you need. Check the Skill Codex for blueprint sources. For new gear or salvage materials, inspect enemy equipment and keep inventory space available. Materials earned through expeditions can fund further growth at the Blacksmith and Library.",
    },
    'help.expedition.spectate.title': {
        ko: "전투 관전과 변경 적용",
        en: "Spectating and changes",
    },
    'help.expedition.spectate.body': {
        ko: "상단의 Party 칸을 눌러 해당 부대의 전투를 봅니다. 다른 탭을 보아도 전투는 진행됩니다. 영웅과 적의 그림에 마우스를 올리면 능력치·스킬·장비를 확인하고, 영웅을 누르면 아래 인벤토리의 장착 대상이 됩니다.<br><br>전투 중 장비와 마스터리를 바꾸면 보스전을 포함해 진행 중인 전투에 즉시 반영됩니다. 승리 후 자동 출정은 출발 당시의 편성을 이어 사용합니다. 바꾼 인원·진형·물약·전술을 확실히 반영하려면 [철수]한 뒤 다시 [보내기]합니다.",
        en: "Select a Party tab at the top to spectate that party. Combat continues when you view other tabs. Hover heroes or enemies to inspect stats, skills and gear. Click a hero to choose the equip target for the inventory below. Equipment and mastery changes apply immediately to combat in progress, including boss fights.<br><br>Automatic departures after wins retain the original preset configuration. To apply changed members, formation, potions or tactics, [Retreat] and [Deploy] again.",
    },
    'help.expedition.controls.title': {
        ko: "배속 · 일시정지 · 전투 정보",
        en: "Speed, pause and battle information",
    },
    'help.expedition.controls.body': {
        ko: "관전 화면의 ×숫자 버튼은 그 부대의 전투가 흐르는 속도를 고릅니다. <b>[일시정지]</b>하면 그 부대의 진행이 멈추고 <b>[재개]</b>로 이어갑니다. 다른 게임 탭으로 이동해도 그 부대에 고른 속도·정지 상태는 이어집니다.<br><br><b>전투 로그</b>는 누가 어떤 행동을 했는지 시간 순서로 보여 주고, <b>누적 데미지</b>는 영웅·스킬별 가한 피해와 받은 피해를 비교하는 판입니다. 해당 버튼을 다시 누르면 그 정보판을 닫고 전투를 넓게 볼 수 있습니다. 쓰러진 이유나 준비한 스킬이 실제로 나가는지 확인할 때 함께 살펴봅니다.",
        en: "The ×number buttons in spectate select how quickly that party's battle progresses. <b>Pause</b> stops that party, and <b>Resume</b> continues it. Its chosen speed and paused state persist when you visit another game tab.<br><br>The <b>Combat Log</b> shows actions in time order, while <b>Damage</b> compares damage dealt and taken by hero and skill. Press the same button again to close its panel and widen the battle view. Use these panels to see why heroes fall or whether the skills you prepared actually activate.",
    },
    'help.expedition.rewards.title': {
        ko: "보상·리포트·회복",
        en: "Loot, reports and recovery",
    },
    'help.expedition.rewards.body': {
        ko: "이긴 라운드의 장비와 보상은 해당 부대의 인벤토리·재고에 들어옵니다. 인벤토리가 가득 차면 넘친 장비는 가루와 부위 재료로 분해됩니다. 자동 분해에서 보존하도록 정한 장비도 공간 부족으로 넘치면 분해될 수 있으므로 빈 칸을 확보합니다.<br><br><b>[Report]</b>는 왼쪽 원정 탭의 스테이지 목록 오른쪽 위에서 엽니다. 원정 기록, 획득 아이템, 영웅별 가한 피해·받은 피해·처치와 쓰러짐을 확인할 수 있습니다. 철수하거나 패배해도 이미 이긴 라운드의 보상은 남고, 끝내지 못한 라운드에서는 보상을 받지 못합니다.<br><br>원정이 끝나면 HP와 전투불능이 무료로 즉시 회복됩니다. 챕터보스를 쓰러뜨린 뒤에는 재등장 대기시간이 있으며, 그동안 같은 난이도의 해당 보스에게는 어느 부대도 다시 출발할 수 없습니다. 첫 클리어 상자는 일반 처치 보상과 다른 별도 보상입니다.",
        en: "Rewards from won rounds enter that party's inventory and your stock. When its inventory is full, overflow gear is salvaged into dust and slot materials. Overflow can consume gear marked to keep by auto-salvage rules, so leave free slots.<br><br>Open <b>Report</b> at the top right of the stage list in Expedition. It shows run history, loot, and each hero's damage dealt, damage taken, kills and falls. Retreating or losing keeps rewards from rounds already won; unfinished rounds grant no rewards.<br><br>At the end of a run, lost HP and fallen heroes recover immediately for free. A defeated chapter boss has a respawn wait. No party can enter that boss stage on the same difficulty until it returns. First-clear chests are separate from ordinary kill rewards.",
    },
    'help.expedition.firstclear.title': {
        ko: "첫 클리어 상자와 우편함",
        en: "First-clear chests and the mailbox",
    },
    'help.expedition.firstclear.body': {
        ko: "보스가 나오는 스테이지를 그 난이도에서 처음 클리어하면 무기 상자 또는 방어구 상자 하나를 받습니다. 일반 장소의 III과 챕터보스 스테이지가 대상이며, I·II나 이미 깬 같은 난이도의 스테이지에서는 다시 받지 않습니다. 리포트의 [클리어 보상]에서 받은 상자를 확인할 수 있습니다.<br><br>상자는 깬 부대의 인벤토리에 들어옵니다. 새 상자 칸을 넣을 공간이 없으면 오른쪽 위 편지봉투의 우편함으로 갑니다. 우편함의 [받기]·[모두 받기]로 원래 부대의 인벤토리에 받을 수 있으며, 공간이 부족한 우편은 그대로 남습니다. 일반 드롭처럼 넘쳐서 분해되지 않습니다.<br><br>장비를 줄 영웅을 먼저 선택한 뒤 상자를 우클릭하고 [사용]합니다. 무기 상자는 그 영웅 직업의 무기, 방어구 상자는 그 직업에 어울리는 투구·갑옷·장갑·신발 중 하나가 나오며, 아이템 레벨은 여는 순간 그 영웅의 레벨입니다. 나온 장비는 상자가 있던 보관함에 들어가며 자동으로 장착되지는 않습니다.<br><br>현재 첫 클리어 보상은 하급 상자이며 매직 또는 레어 장비가 나옵니다. 같은 종류·등급 상자는 한 칸에 쌓입니다. 여러 개 쌓인 상자를 열 때는 새 장비가 들어갈 빈 칸도 필요합니다.",
        en: "The first clear of a boss stage on each difficulty grants one weapon or armor chest. This includes stage III of regular areas and chapter-boss stages. Stages I and II do not grant one, and repeating an already-cleared stage on that difficulty grants no additional chest. Check [Clear Reward] in the report.<br><br>The chest enters the inventory of the party that cleared the stage. If there is no room for a new chest slot, it goes to the envelope mailbox at the top right. [Claim] or [Claim All] sends it to the original party's inventory. Mail that cannot fit stays waiting. Chests are not salvaged by ordinary loot overflow.<br><br>Select the hero you want to equip, then right-click the chest and choose [Use]. Weapon chests give a weapon for that hero's class. Armor chests give a suitable helmet, armor, gloves or boots. The item's level matches the selected hero's level when opened. The new item enters the same container as the chest and is not equipped automatically.<br><br>Current first-clear rewards are Low-Grade chests, containing Magic or Rare gear. Chests of the same kind and grade share one slot. Opening one from a stack also needs a free slot for the new item.",
    },
    'help.expedition.review.title': {
        ko: "막힌 원정을 살펴보는 순서",
        en: "Reading a difficult run",
    },
    'help.expedition.review.body': {
        ko: "[Report]에서 먼저 끝난 이유를 봅니다. 앞에서 버티던 영웅이 일찍 쓰러졌다면 받은 피해와 쓰러짐에 표시된 적을 확인하고, 그 적의 스킬이 물리인지 원소인지 살펴봅니다. 물리 방어·해당 원소 저항·최대 HP·회복 중 부족한 쪽을 바꿔 볼 수 있습니다. 쓰러짐의 적 이름은 그 영웅에게 가장 많은 피해를 준 적입니다.<br><br>영웅이 살아 있는데 제한시간을 넘겼다면 남은 적의 HP와 가한 피해를 봅니다. 무기 세기, 꺼진 스킬, 행동 속도, 스킬 쿨타임, 적의 회복·방어 등을 확인합니다. 물리 공격의 빗나감이 많다면 명중률과 영웅별 레벨 차도 살펴봅니다.<br><br>한 번에 하나씩 바꾸고 다음 리포트와 비교하면 무엇이 부족했는지 읽기 쉽습니다. 같은 장소도 적 구성과 장비가 달라질 수 있으므로, 한 번의 결과만으로 새 장비나 편성이 항상 더 좋다고 단정하지 않습니다.",
        en: "Start with the ending reason in [Report]. If a front-line hero fell early, check damage taken and the enemy named in the fall entry, then inspect whether that enemy's skill deals physical or elemental damage. Consider physical defense, the matching resistance, maximum HP or healing. The enemy named in a fall entry is the one that dealt the most damage to that hero.<br><br>If heroes survive but the timer expires, check the remaining enemies' HP and damage dealt. Review weapon strength, inactive skills, action speed, skill cooldowns and enemy healing or defenses. Frequent physical misses are a reason to check accuracy and each hero's level deficit.<br><br>Change one thing at a time and compare later reports to identify the problem. Enemy groups and equipment can vary within the same area, so a single result does not prove that a new item or formation is always better.",
    },
    'help.expedition.shrines.title': {
        ko: "다음 스테이지를 돕는 신단",
        en: "Shrines for the next stage",
    },
    'help.expedition.shrines.body': {
        ko: "같은 장소의 I을 이기고 II로, II를 이기고 III으로 이어 가면 무작위 신단 하나가 다음 스테이지의 그 부대 전원에게 적용됩니다. 신단은 직접 누르거나 장착하는 물건이 아니며, 보너스만 주는 일시 효과입니다. III에서 I로 순환할 때나 다른 장소로 넘어갈 때는 새 신단을 받지 않습니다.<br><br>신단마다 피해·최대 HP·저항·흡혈·쿨타임·경험치·파밍 보너스 등 돕는 방향이 다릅니다. 관전의 신단 이름에 마우스를 올리거나 [버프] 창을 열면 지금 효과를 확인할 수 있습니다. 앞 스테이지에서 얻은 신단 덕에 평소보다 잘 버티거나 빨리 잡을 수도 있습니다.<br><br>효과는 그 스테이지 한 번에만 적용되며, 이기든 지든 원정이 끝나면 사라집니다. 패배 후 같은 스테이지에 다시 도전할 때는 그 신단을 유지하지 않습니다. 철수하거나 게임을 닫아 원정이 끊겨도 사라집니다.",
        en: "Continuing from stage I to II, or II to III within the same area, grants a random shrine effect to the whole party for the next stage. Shrines are temporary benefits, not items to click or equip. Cycling from III back to I or moving to another area grants no new shrine.<br><br>Shrines can support damage, maximum HP, resistances, life steal, cooldowns, XP or farming. Hover the shrine name during spectate or open [Buffs] to see the current effect. A shrine from the previous stage can explain why a party survives better or defeats enemies faster than usual.<br><br>The effect lasts for that one stage attempt and expires when it ends, whether you win or lose. Retrying after a defeat does not keep that shrine. Retreating or closing the game also removes it.",
    },
    'help.expedition.difficulty.title': {
        ko: "같은 챕터를 더 높은 난이도로",
        en: "Revisiting chapters on higher difficulties",
    },
    'help.expedition.difficulty.body': {
        ko: "노말을 진행한 뒤 나이트메어, 그 뒤 헬로 같은 챕터를 다시 돌아갑니다. 난이도는 이름만 바꾸는 것이 아니라 적의 레벨·체력·피해·착용 장비와 스킬 구성을 바꿉니다. 같은 초상이라도 이전 난이도에서 이겼던 방식이 그대로 통한다고 생각하지 않고 적의 현재 스킬과 장비를 확인합니다.<br><br>일반 원정 드롭에서는 에픽 장비가 나이트메어의 정예·보스부터, 레전더리 장비가 헬의 정예·보스에서 나올 수 있습니다. 일반 몬스터의 장비는 헬에서도 레어까지입니다. 매직아이템 획득 확률을 높여도 그 난이도·몬스터 등급에서 나오지 않는 희귀도가 새로 열리지는 않습니다.<br><br>헬의 몬스터 레벨과 드롭 장비 레벨은 만렙에서 고정되고, 영웅도 레벨 상한을 넘어 자라지는 않습니다. 다른 장의 첫 스테이지를 골라 파티와 보상이 맞는 곳부터 공략할 수 있습니다. 각 장의 디버프가 다르므로 레벨 외의 대응이 중요해집니다.<br><br>정예 카드에 표시되는 죄종·능력치·방어 특성 칩은 현재 표시만 구현되어 있습니다. 면역 이름의 칩이 보이더라도 그 특성으로 실제 원소 면역이 적용되는 기능은 아직 준비 중입니다. 현재 적의 장비·스킬·적용 능력치를 기준으로 판단합니다.",
        en: "After Normal, revisit the chapters on Nightmare and then Hell. Difficulty changes enemy levels, HP, damage, equipment and skill loadouts, not just the name. An enemy with the same portrait may need a different response, so inspect its current skills and gear.<br><br>For ordinary expedition loot, Epic gear can appear from Nightmare elites and bosses, and Legendary gear from Hell elites and bosses. Normal monsters remain limited to Rare gear even in Hell. More Magic Find does not unlock a rarity unavailable to that difficulty and monster grade.<br><br>Hell fixes monster and dropped-equipment levels at the level cap; heroes do not level beyond their cap either. You can choose another chapter's first stage and tackle an area that suits your party and reward needs. Different chapter debuffs make responses beyond leveling important.<br><br>The Sin, attribute and defense trait chips shown on elite cards currently have display implementation only. A chip with an immunity name does not yet grant that trait's actual elemental immunity. Judge enemies by their current gear, skills and applied stats.",
    },
    'help.expedition.hell_debuffs.title': {
        ko: "헬에서 장마다 달라지는 위험",
        en: "Hell chapter hazards",
    },
    'help.expedition.hell_debuffs.body': {
        ko: "헬에서는 출정 창 제목 옆에 그 장의 디버프가 표시됩니다. 같은 장 안에서는 기본 효과가 같고, 챕터보스 스테이지에서는 효과가 더 강합니다. 피해가 갑자기 커지거나 회복이 약해 보일 때 적 스킬과 함께 이 표시도 확인합니다.<br><br>1장 분노는 몬스터의 물리·원소 직격으로 받는 피해를 늘립니다. 2장 시기는 영웅 전원에게 주기적으로 중독을 걸어 독 피해를 줍니다. 독 저항과 중독 지속시간을 줄이는 수단이 서로 다른 방식으로 도움을 줄 수 있습니다.<br><br>3장 탐욕은 받는 회복을 줄이며, 회복 스킬·재생·물약·흡혈에 모두 적용됩니다. 4장 나태는 주기적으로 결빙을 걸어 행동을 느리게 합니다. 결빙은 스킬 쿨타임을 멈추지 않으므로, 단순히 모든 행동이 스턴처럼 멈춘 상황과 구별합니다.<br><br>5장 폭식은 한 라운드가 길어질수록 몬스터가 주는 물리·원소 직격 피해를 상한까지 늘립니다. 다음 라운드에서는 다시 처음부터 증가합니다. 오래 버티는 것만으로 풀리는지, 적을 더 빨리 잡아 위험이 커지는 시간을 줄여야 하는지도 살펴봅니다.",
        en: "On Hell, the departure-window heading shows the chapter's debuff. Its base effect is shared across that chapter, with a stronger effect in the chapter-boss stage. Check it alongside enemy skills when damage rises or healing seems weaker than expected.<br><br>Chapter 1, Wrath, increases Physical and elemental direct-hit damage taken from monsters. Chapter 2, Envy, periodically poisons the whole party. Poison Resistance and shorter Poison duration can help in different ways.<br><br>Chapter 3, Greed, reduces healing received from healing skills, regeneration, potions and life steal. Chapter 4, Sloth, periodically applies Freeze and slows actions. Freeze does not pause skill cooldowns, so distinguish it from Stun.<br><br>Chapter 5, Gluttony, increases monster Physical and elemental direct-hit damage as a round lasts longer, up to a cap. The increase starts over in the next round. Consider whether surviving longer is enough or whether faster kills would reduce time spent facing the stronger effect.",
    },
    'help.expedition.offline.title': {
        ko: "게임을 닫았을 때",
        en: "Closing the game",
    },
    'help.expedition.offline.body': {
        ko: "원정 전투는 오프라인 동안 계속되지 않습니다. 게임을 닫으면 진행하던 부대와 다음 출발을 기다리던 부대가 멈춥니다. 다시 접속하면 알림과 마지막 리포트를 확인하고 원하는 스테이지에 다시 출발합니다. 탐험과 연구소의 오프라인 진행은 각 도움말에서 확인할 수 있습니다.",
        en: "Expedition combat does not continue offline. Closing the game stops parties in combat and parties waiting for their next departure. On return, check the notice and last report, then deploy again to your chosen stage. Exploration and Laboratory offline progress are explained in their own sections.",
    },
    'help.explore.map.title': {
        ko: "지도와 지점",
        en: "Map and spots",
    },
    'help.explore.map.body': {
        ko: "지도의 지점 아이콘을 누르면 출발·진행·결과 창이 열립니다. 닫기 버튼이나 지도 빈 곳을 누르면 닫힙니다. 다음 챕터의 땅은 노말 난이도에서 이전 챕터보스를 클리어하면 열립니다. 동굴은 탐험 건물 첫 랭크에서 열리며, 상단과 폐허 아이콘은 이후 랭크에서 나타납니다.<br><br>현재 보상을 가져오는 탐험은 동굴이고, 상단과 폐허의 행동은 준비 중입니다.",
        en: "Click a spot on the map to open its departure, progress or result window. Close it with its close button or an empty area of the map. Beating a chapter boss on Normal opens the next chapter's land. Caves unlock at the first Exploration building rank; caravan and ruins icons appear at later ranks.<br><br>Caves currently provide exploration rewards; caravan and ruins activities are coming later.",
    },
    'help.explore.purpose.title': {
        ko: "원정과 무엇이 다른가",
        en: "How exploration differs from expeditions",
    },
    'help.explore.purpose.body': {
        ko: "현재 동굴 탐험은 정해진 시간 뒤 장비를 가져오는 방식입니다. 원정처럼 라운드 전투를 관전하거나 경험치를 얻는 기능은 없습니다. 보낸 영웅 수가 장비 수를 정하므로, 당장 원정을 돌릴 편성인지 시간을 맡길 편성인지 고릅니다.<br><br>원정 중인 편성은 먼저 철수해야 하며, 탐험을 보낸 뒤에는 보상을 수령하거나 취소해 돌아올 때까지 그 편성을 원정에 쓸 수 없습니다. 게임을 닫아도 이미 보낸 탐험의 시간은 흐르지만, 자동으로 다음 탐험을 계속 보내지는 않습니다.",
        en: "Current cave exploration returns equipment after a set time. It does not offer spectated round combat or XP like expeditions. The number of heroes sent determines the gear count, so decide whether a preset should fight now or spend time exploring.<br><br>A party on an expedition must retreat first. After sending it to explore, you cannot use that preset for expeditions until claiming its reward or recalling it. An existing trip continues while the game is closed, but new trips do not automatically start afterward.",
    },
    'help.explore.depart.title': {
        ko: "편성으로 출발",
        en: "Sending a preset",
    },
    'help.explore.depart.body': {
        ko: "지점 창에서 보낼 편성을 고르고 [출발]합니다. 한 명만 들어 있는 편성도 보낼 수 있으며 최대 {party}명까지 함께 갑니다. 원정 중인 부대는 먼저 철수해야 합니다. 이미 다른 탐험에 나간 영웅이나 전직 진행 중인 영웅이 있으면 출발할 수 없습니다.<br><br>한 지점에는 한 건만 보낼 수 있고, 현재 동시 탐험 상한은 {slots}건입니다.",
        en: "Choose a preset in the spot window and press [Set out]. A preset with one hero can explore; up to {party} heroes can go together. A party on an expedition must retreat first. A preset cannot depart if a member is already exploring or advancing. Each spot holds one exploration, and the current simultaneous limit is {slots}.",
    },
    'help.explore.time.title': {
        ko: "시간과 이야기",
        en: "Time and story",
    },
    'help.explore.time.body': {
        ko: "탐험은 {hours}시간이 걸리며 게임을 닫아도 시간이 흐릅니다. 진행 막대와 남은 시간으로 귀환 시점을 확인할 수 있습니다. 탐험 도중 이야기 기록이 차례로 열립니다. 완료한 보상은 직접 수령할 때까지 남고, 편성과 영웅도 그때까지 탐험 중 상태를 유지합니다.",
        en: "Exploration lasts {hours}h, including time while the game is closed. The progress bar and remaining time show when it will finish. Story entries open as the trip progresses. Finished rewards wait until you claim them, and the preset and heroes remain busy exploring until then.",
    },
    'help.explore.claim.title': {
        ko: "장비 보상과 수령",
        en: "Gear rewards and claiming",
    },
    'help.explore.claim.body': {
        ko: "동굴은 보낸 영웅 한 명당 장비 {perHero}개를 가져옵니다. 장비 레벨은 해당 챕터의 레벨 범위에서 정해집니다. 완료 아이콘을 눌러 결과 장비를 확인한 뒤 [수령]합니다. 보상은 현재 선택한 부대의 인벤토리로 들어갑니다. 빈 칸이 보상 전체를 담기에 부족하면 수령되지 않으므로 먼저 인벤토리를 정리합니다.",
        en: "Caves return gear in proportion to the number of heroes sent ({perHero} per hero), at levels within that chapter's level range. Open the completed spot, inspect the gear and press [Collect]. Rewards enter the currently selected party inventory. Claiming requires enough free slots for the entire reward; make room in the inventory first if needed.",
    },
    'help.explore.recall.title': {
        ko: "편성 잠금과 취소",
        en: "Preset lock and recall",
    },
    'help.explore.recall.body': {
        ko: "탐험에 나간 편성은 명단을 바꾸거나 원정에 보낼 수 없습니다. 변경하려면 탐험을 취소해 편성 전체를 불러들입니다. [불러들이기]를 누르고 확인 버튼을 한 번 더 누르면 영웅들이 즉시 돌아오며 탐험 보상은 받지 못합니다.",
        en: "A preset that is exploring cannot change members or join an expedition. Recall the whole preset to change it. Press [Call back] and then confirm; the heroes return immediately with no exploration reward.",
    },
    'help.party.members.title': {
        ko: "파티 구성과 리더",
        en: "Members and leader",
    },
    'help.party.members.body': {
        ko: "먼저 Party 번호를 고른 뒤 위의 영웅 카드를 눌러 그 편성에 넣거나 뺍니다. 진형 보드의 영웅을 눌러도 빠집니다. 한 영웅을 다른 편성에 넣으면 이전 편성에서 이동하며, 한 편성에는 최대 {party}명이 들어갑니다. 파티 명단의 첫 영웅이 리더입니다. 진형의 전열·후열 위치와 리더는 별개입니다.",
        en: "Select a Party number, then click heroes in the roster to add or remove them. Clicking a hero on the formation board also removes them. Adding a hero to another preset moves them out of their previous preset. Each party holds up to {party} heroes.<br><br>The first hero in the party list is the leader; leadership is separate from the hero's front or back row position.",
    },
    'help.party.leader.title': {
        ko: "리더와 통솔의 역할",
        en: "The leader and Leadership",
    },
    'help.party.leader.body': {
        ko: "리더는 그 편성 명단의 첫 영웅입니다. 리더의 통솔은 파티 전술 효과의 크기에 영향을 줍니다. 전열의 맨 앞에 서거나 캐릭터 탭에서 영웅을 선택했다고 리더가 바뀌지는 않습니다.<br><br>리더를 바꾸려면 편성 영웅을 모두 뺀 뒤, 원하는 영웅을 먼저 넣고 나머지 인원을 채웁니다. 통솔이 높아도 전술 조건을 만족하지 못하면 그 전술 효과는 적용되지 않으므로, 조건 충족과 리더 효과를 함께 봅니다.",
        en: "The first hero in a preset's member list is its leader. The leader's Leadership affects the strength of Party tactics. Standing in the first front-row seat or selecting a hero in Character does not change the leader.<br><br>To change the leader, remove every hero from the preset, add the intended leader first, then fill the remaining places. High Leadership does not activate a tactic whose condition is unmet, so check both the condition and the leader's contribution.",
    },
    'help.party.formation.title': {
        ko: "전열은 누구를 지키나요",
        en: "What the front row protects",
    },
    'help.party.formation.body': {
        ko: "왼쪽에서 진형을 고르고 영웅을 끌어 전열·후열 칸에 놓습니다. 채워진 칸끼리 끌면 서로 바뀝니다. 일반 공격은 살아 있는 전열 중에서 대상을 고르며, 전열이 모두 쓰러져야 후열이 대상이 됩니다. 전열이 없는 진형에서는 모두가 대상이 됩니다.<br><br>전열 한 명은 후열을 지켜 주지만 공격이 그 한 명에게 집중됩니다. 전열을 늘리면 일반 공격을 여러 영웅이 나눠 받을 수 있습니다. 어느 쪽이 좋은지는 버티는 장비와 회복 수단, 상대 스킬에 따라 달라집니다. 광역처럼 전원에게 닿는 스킬은 후열도 맞힐 수 있습니다.<br><br>전열·후열은 주로 누가 공격받는지를 정합니다. 후열에 서도 기본 공격과 스킬을 사용할 수 있으며, 근접 직업이라 후열에서 공격하지 못하는 규칙은 없습니다. 리더는 파티 명단의 첫 영웅으로, 진형의 위치나 캐릭터 탭의 카드 나열 순서와는 별개입니다.",
        en: "Choose a formation on the left, then drag heroes into front or back seats. Dragging between occupied seats swaps them. Ordinary attacks choose among living front-row targets and reach the back row after the front falls. With no front row, everyone is a target.<br><br>A single front-line hero protects the back row but takes all ordinary attacks. More front-line heroes can share those attacks. The better choice depends on their equipment, healing and opposing skills. Skills that hit everyone can still reach the back row.<br><br>Rows mainly determine who gets attacked. Heroes can use basic attacks and skills from the back row; melee classes do not lose attacks just for standing there. The leader is the first hero in the party list, separate from formation position or the display order of cards in Character.",
    },
    'help.party.potions.title': {
        ko: "파티가 함께 쓰는 물약",
        en: "Potions shared by the party",
    },
    'help.party.potions.body': {
        ko: "물약 칸은 영웅 개인의 칸이 아니라 그 파티가 함께 쓰는 한 줄입니다. HP 기준에 걸린 영웅이 앞의 찬 칸부터 마십니다. 여러 영웅이 동시에 필요하면 HP 비율이 가장 낮은 영웅이 먼저이며, 같으면 파티 명단의 앞 영웅이 먼저입니다. 물약은 쓰러진 영웅을 일으키지는 못합니다.<br><br>가진 물약을 누르면 앞의 빈 칸에 넣고, 채운 칸을 누르면 비웁니다. 물약을 원하는 칸으로 끌어 넣거나 칸끼리 끌어 순서를 바꿀 수 있습니다. 같은 물약을 여러 칸에 넣어도 되며, 넣는 것 자체로 재고가 줄지는 않습니다.<br><br>칸은 라운드마다 출발 당시의 구성과 현재 재고에 맞춰 다시 채워집니다. 한 라운드 안에서는 칸을 다 쓰면 더 마실 수 없지만, 다음 라운드에 다시 채워지므로 한 원정에서 칸 수보다 많이 소비할 수 있습니다. 재고는 모든 부대가 함께 쓰고, 부족한 칸은 빈 채로 시작합니다. 원정 도중 만들거나 산 물약은 다음 라운드부터 보충될 수 있습니다.",
        en: "The potion belt belongs to the whole party, not to individual heroes. A hero below the HP threshold drinks from the first filled slot. If several heroes need one at once, the lowest HP percentage goes first, with ties following party order. Potions cannot revive fallen heroes.<br><br>Click a potion in stock to fill the first empty slot, or click a filled slot to clear it. Drag stock potions to specific slots or drag between slots to change their order. Repeating the same potion in several slots is allowed. Configuring slots does not consume stock.<br><br>Each round refills the belt from the departure configuration and current stock. Once its slots are used within a round, no more can be drunk until the next round. A full run can therefore consume more potions than the belt holds. All parties share the same stock; shortages leave slots empty. Potions bought or brewed during a run can replenish the next round.",
    },
    'help.party.threshold.title': {
        ko: "물약을 일찍 쓸지 아껴 쓸지",
        en: "Choosing when to drink",
    },
    'help.party.threshold.body': {
        ko: "물약 칸 아래 [−]/[+]로 이 편성의 사용 HP 기준을 조절합니다. 살아 있는 영웅의 HP가 그 비율 미만으로 내려가면 자동으로 마시며, 행동 차례는 사용하지 않습니다. 같은 영웅은 사용 뒤 {cooldown}초 동안 다시 마시지 못합니다.<br><br>기준을 높이면 더 일찍 마시지만, 빈 HP보다 회복량이 커서 일부를 낭비할 수 있습니다. 낮추면 한 병을 충분히 쓰기 쉬운 대신 다음 큰 공격 전에 쓰러질 위험이 있습니다. 받은 피해의 크기와 물약 회복량을 보고 정합니다. 기준은 편성마다 따로 저장되며, 원정 중 바꾼 기준을 확실히 적용하려면 철수한 뒤 다시 출발합니다.",
        en: "Use [−]/[+] below the belt to adjust this preset's HP threshold. A living hero drinks automatically when below it, without using an action. That hero cannot drink again for {cooldown} seconds.<br><br>A higher threshold drinks earlier but can waste healing beyond the missing HP. A lower threshold can make fuller use of each bottle, but risks falling to the next heavy hit. Consider incoming hit sizes and the potion's healing amount. Thresholds are saved per preset. Retreat and deploy again to ensure a change applies to an expedition.",
    },
    'help.party.tactics.title': {
        ko: "파티 전술과 리롤",
        en: "Party tactics and rerolls",
    },
    'help.party.tactics.body': {
        ko: "파티 전술은 조건을 만족한 칸의 효과가 파티에 적용되는 기능입니다. 조건 아래의 현재 수치를 보고 어떤 영웅·장비·진형을 맞춰야 할지 확인합니다. 지휘 천막의 랭크를 올리면 더 많은 전술 칸이 열립니다. [리롤]은 열린 칸의 조건·효과를 골드로 다시 뽑습니다.<br><br>남기고 싶은 칸은 자물쇠로 잠그면 리롤되지 않으며, 잠금은 언제든 무료로 풀 수 있습니다. 전술 내용과 잠금은 편성마다 따로 저장됩니다. 잠근 칸이 많을수록 나머지 칸의 리롤 비용이 올라갑니다.",
        en: "A party tactic applies its effect when that slot's condition is met. Use the current values shown with the condition to choose heroes, gear or formation. Higher Command Tent ranks unlock more tactic slots. [Reroll] spends gold to reroll conditions and effects in unlocked slots. Lock a slot to keep it during rerolls; locking and unlocking are free.<br><br>Tactics and locks are stored separately for each preset. Locking more slots raises the cost of rerolling the remaining ones.",
    },
    'help.party.tactic_choices.title': {
        ko: "전술 조건을 맞추는 이유",
        en: "Making tactic conditions work",
    },
    'help.party.tactic_choices.body': {
        ko: "전술은 좋은 효과가 나왔다는 것만으로 적용되지 않습니다. 현재 편성으로 조건을 만족하는지 먼저 봅니다. 예를 들어 영웅의 죄종을 요구하는 전술과 장비의 죄종을 요구하는 전술은 맞추는 대상이 다릅니다. 효과를 지키기 위해 편성을 바꿀지, 지금 파티에 맞는 전술을 다시 뽑을지 선택합니다.<br><br>리롤은 열린 칸 중 잠그지 않은 칸을 한꺼번에 바꾸며, 잠금을 많이 유지할수록 비싸집니다. 한 칸만 완벽하게 맞추려다 골드를 많이 쓰기 전에, 지금 켜져 있는 효과와 건설·강화 등에 필요한 비용도 함께 살펴봅니다. 전술은 전투 중 수동으로 발동하는 버튼이 아닙니다.",
        en: "A promising tactic does nothing unless its condition is met by the current preset. A condition about heroes' Sins and one about equipment Sins ask for different things. Decide whether to change the party to keep an effect or reroll for a tactic that fits the party you have.<br><br>A reroll replaces every open, unlocked slot at once, and keeping more locks makes it more expensive. Before spending heavily to perfect one slot, consider the effects already active and the gold needed for buildings or upgrades. Tactics are not buttons you activate manually during combat.",
    },
    'help.party.changes.title': {
        ko: "원정 중 편성을 바꿨다면",
        en: "Changing a preset during an expedition",
    },
    'help.party.changes.body': {
        ko: "원정 중 편성 인원·진형·물약·전술을 바꿔도 진행 중인 부대에는 출발 당시 구성이 유지됩니다. 승리 후 자동 출정도 그 구성을 이어 쓰므로, 새 구성을 쓰려면 철수한 뒤 다시 보냅니다.<br><br>패배 후 자동 재도전은 변경한 편성으로 출발할 수 있을 때 현재 편성을 반영합니다. 단, 출발 때 켜진 전술의 장비 조건이 전투 중 바뀌면 그 조건의 충족 여부에 따라 효과가 꺼지거나 다시 켜질 수 있습니다. 탐험 중인 편성의 명단은 귀환까지 바꿀 수 없습니다.",
        en: "Changing members, formation, potions or rolled tactics does not replace an active party's departure configuration. Automatic departures after wins keep that configuration; retreat and deploy again to use your changes.<br><br>Retries after defeats use the current preset when it can depart. However, equipment changes can disable or reactivate the gear conditions of tactics active at departure. The roster of an exploring preset stays locked until it returns.",
    },
    'help.character.identity.title': {
        ko: "직업·죄종·등급·고유 스킬",
        en: "Class, Sin, tier and innate skill",
    },
    'help.character.identity.body': {
        ko: "직업은 직업 마스터리와 전직 갈래를, 영웅의 죄종은 죄종 마스터리를 정합니다. 고유 스킬은 그 영웅이 처음부터 가진 액티브이며, 같은 직업이라도 서로 다른 고유 스킬을 가질 수 있습니다. 직업·죄종·고유 스킬은 고용한 뒤 바꾸는 기능이 없습니다.<br><br>일반·매직·레어 영웅은 기본 능력치의 총합 범위와 분포가 다릅니다. 높은 등급이 더 높은 총합을 기대하게 하지만, 필요한 능력치 하나까지 모든 영웅보다 높다는 뜻은 아닙니다. 같은 직업 후보라도 고유 스킬, 힘·민첩·건강 같은 실제 수치와 맡길 자리를 함께 비교합니다.<br><br>영웅의 죄종과 장비의 죄종은 별개이며, 화염·냉기·전기·독 같은 피해 원소와도 다릅니다. 분노 영웅이라고 화염 공격을 하는 것은 아니며, 피해 원소는 사용하는 스킬 설명에서 확인합니다. 영웅 등급과 장비 희귀도, 몬스터의 일반·정예 등급도 서로 다른 분류입니다.",
        en: "Class determines class mastery and advancement paths; a hero's Sin determines Sin mastery. The innate skill is the active the hero starts with, and heroes of the same class can have different ones. There is no feature to change a hired hero's class, Sin or innate skill.<br><br>Normal, Magic and Rare heroes use different attribute-total ranges and distributions. A higher tier offers a higher expected total, not a guarantee that every relevant attribute beats every lower-tier hero. Compare innate skills, actual attributes such as Strength, Agility and Vitality, and the role you want the hero to fill.<br><br>A hero's Sin is separate from equipment Sins and from damage elements such as Fire, Cold, Lightning and Poison. A Wrath hero does not automatically deal Fire damage; inspect the skill to see its element. Hero tiers, equipment rarities and monster Normal/Elite grades are also separate classifications.",
    },
    'help.character.stats.title': {
        ko: "영웅 선택과 능력치",
        en: "Choosing heroes and reading stats",
    },
    'help.character.stats.body': {
        ko: "위의 영웅 카드를 누르면 그 영웅의 장비·기본 옵션·세부 옵션이 표시됩니다. 카드 사이로 끌어 명단 순서를 바꿀 수 있습니다. 기본 능력치 일곱 개는 태어날 때 정해지며 장비나 레벨업으로 직접 오르지 않습니다. 대신 피해·속도·최대 HP·스킬 효과와 리더 전술·연구소 등록 효과의 계산에 쓰입니다.<br><br>능력치 이름에 마우스를 올리면 각 수치가 하는 일을 확인할 수 있습니다. 세부 옵션은 현재 장비와 마스터리 등이 만든 전투 수치입니다.",
        en: "Click a hero card to view that hero's equipment, attributes and detailed stats. Drag between roster cards to reorder them. The seven attributes are fixed when the hero is created; equipment and level-ups do not directly raise them. They scale damage, speed, maximum HP, skill effects, leader tactics and Laboratory registration effects.<br><br>Hover a stat name to read what it does. Detailed stats show the combat values built by current gear, mastery and other effects.",
    },
    'help.character.growth.title': {
        ko: "영웅 레벨과 아이템 레벨",
        en: "Hero levels and item levels",
    },
    'help.character.growth.body': {
        ko: "영웅 레벨이 오르면 최대 HP가 늘고 마스터리 포인트를 받습니다. 스킬북·높은 마스터리 층·전직에는 레벨 조건도 있습니다. 기본 능력치 일곱 개나 무기의 공격력이 레벨업만으로 함께 오르는 것은 아닙니다. 기본 공격과 많은 스킬의 바탕 공격력은 장비에서 가져옵니다.<br><br>아이템 그림의 Lv는 그 장비의 아이템 레벨이며, 선택한 영웅의 레벨과 다른 값입니다. 착용하려면 장비의 요구 레벨을 만족해야 합니다. 같은 아이템 레벨이라도 희귀도·베이스·옵션·강화 단계에 따라 쓰임과 세기가 달라지므로 Lv 숫자만으로 교체하지 않습니다. 스킬 그림의 Lv는 또 다른 값으로, 그 스킬의 성장 단계를 뜻합니다.<br><br>원정 경험치는 라운드를 이긴 순간 살아 있는 영웅에게 들어갑니다. 쓰러진 채로는 그 라운드의 경험치를 받지 못하고, 자신보다 낮은 레벨의 적에게서는 경험치가 줄어듭니다. 영웅 레벨 상한은 {levelCap}이며, 상한 뒤에는 장비·스킬·마스터리 배분과 파티 조합을 더 다듬습니다.",
        en: "Hero levels raise maximum HP and grant mastery points. Skill books, higher mastery tiers and advancement also have level requirements. Leveling alone does not raise the seven attributes or your weapon's attack. Gear supplies the base attack used by basic attacks and many skills.<br><br>Lv on an item icon is that item's level, separate from the selected hero's level. The hero must meet its level requirement to equip it. Even at the same item level, rarity, base type, options and upgrade level change its value. Do not replace gear using the Lv number alone. Lv on a skill icon is another value: that skill's growth level.<br><br>Expedition XP goes to heroes alive when a round is won. Fallen heroes miss that round's XP, and enemies below a hero's level give less XP. The hero level cap is {levelCap}. Beyond it, improve gear, skills, mastery choices and party combinations.",
    },
    'help.character.goblin.title': {
        ko: "시작 영웅 외에 있는 고블린",
        en: "The extra starting goblin",
    },
    'help.character.goblin.body': {
        ko: "새 게임에서는 고른 시작 영웅 외에 성장 등급 고블린 한 명이 로스터에 추가됩니다. 첫 편성에는 고른 시작 영웅만 들어가므로, 로스터에 더 많은 영웅이 보여도 모두 원정에 나가지는 않습니다. 편성 탭에서 누구를 보낼지 바꿀 수 있습니다.<br><br>이 고블린은 낮고 고른 기본 능력치와 미장착 상태로 시작합니다. 초반 전투에 넣으려면 장비와 버티는 힘부터 확인합니다. 현재는 성장 등급이라는 이름과 달리 레벨업마다 기본 능력치가 자라는 기능이 준비 중입니다. 레벨·HP·마스터리 포인트의 성장은 다른 영웅처럼 진행됩니다.",
        en: "A new game adds one Growth-tier goblin to the roster alongside the heroes you selected. Only the selected starting heroes enter the first preset, so a larger roster does not mean everyone is fighting. Choose who goes in the Party tab.<br><br>The goblin starts with low, even attributes and no equipped gear. Check equipment and survivability before placing it in early combat. Despite the Growth tier name, attribute gains on level-up are currently coming later. Levels, HP and mastery points still grow as they do for other heroes.",
    },
    'help.character.equipment.title': {
        ko: "장착 조건과 장비 비교",
        en: "Equipping and comparing gear",
    },
    'help.character.equipment.body': {
        ko: "인벤토리나 창고의 장비를 누르면 선택한 영웅이 착용하고, 착용 칸을 누르면 해제됩니다. 장착을 막는 것은 장비의 요구 레벨입니다. 직업이 달라도 다른 직업의 무기나 갑옷을 직접 착용할 수 있습니다. 다만 착용할 수 있다는 것과 그 무기로 가진 스킬을 쓸 수 있다는 것은 다릅니다.<br><br>장비에 마우스를 올리면 착용품과 나란히 비교됩니다. [Alt]는 착용 후 바뀌는 세부 옵션, [Shift]는 옵션의 수치 범위를 보여 줍니다. 공격을 맡긴 영웅은 무기 공격력·속도·실제로 쓰는 스킬을, 앞에서 버티는 영웅은 HP·물리 방어·상대 스킬의 원소 저항을 함께 살펴봅니다.<br><br>[자동 장착]은 현재 보고 있는 부대 인벤토리에서 그 영웅 직업에 맞는 장비를 고릅니다. 내가 의도한 다른 직업 무기 조합까지 찾아 주는 기능은 아닙니다. (미적용) 표시가 있는 옵션은 아직 전투에 적용되지 않습니다.",
        en: "Click gear in an inventory or the stash to equip it on the selected hero; click an equipped slot to remove it. The equip restriction is its required level. Any class can manually wear another class's weapon or armor. Being able to equip a weapon does not mean every owned skill works with it.<br><br>Hover gear for a side-by-side comparison. [Alt] shows detailed stat changes after equipping; [Shift] shows option roll ranges. For an attacker, compare weapon attack, speed and the skills they actually use. For a front-line hero, also consider HP, physical defense and resistance to the enemy's skill elements.<br><br>[Auto-equip] chooses class-suitable gear from the party inventory you are viewing. It does not search for every off-class weapon build you might intend. Options marked (inactive) do not yet affect combat.",
    },
    'help.character.equipment_slots.title': {
        ko: "장비 부위와 갑옷 갈래",
        en: "Equipment slots and armor types",
    },
    'help.character.equipment_slots.body': {
        ko: "장비는 무기·투구·갑옷·장갑·신발·목걸이·반지 칸에 착용하며, 반지는 두 개를 착용합니다. 무기는 한 개를 사용하고 별도의 방패·보조 무기 칸은 없습니다. 반지와 목걸이도 옵션으로 전투에 보탬이 되는 장비입니다.<br><br>갑옷도 직업 전용이 아닙니다. 중갑은 물리 방어가 높은 대신 물리 공격 속도에 불리하고, 경갑은 물리 공격 속도, 로브는 스킬 쿨타임 감소 쪽에 특징이 있습니다. 어떤 갈래가 좋은지는 현재 버티는 힘과 공격·스킬이 기다리는 이유를 함께 보고 정합니다. 마법 무기에는 물리 공격 속도 옵션이 시전 간격을 줄여 주지 않습니다.<br><br>같은 갈래라도 아이템 레벨·강화·붙은 옵션이 다릅니다. 이름이나 갈래 하나로 결정하지 말고, 장비 비교와 착용 후 바뀌는 능력치로 확인합니다.",
        en: "Equipment slots hold a weapon, helmet, armor, gloves, boots, amulet and two rings. You use one weapon, with no separate shield or off-hand slot. Rings and amulets support combat through their options too.<br><br>Armor is not class-locked either. Heavy Armor offers more Physical Defense at a cost to physical attack speed; Light Armor favors physical attack speed, while Robes favor skill cooldown reduction. Choose according to your survival and what makes attacks or skills wait. Physical Attack Speed options do not shorten casting intervals with magic weapons.<br><br>Items of the same armor type can differ in item level, upgrades and options. Compare the equipment and resulting stats instead of deciding from its name or type alone.",
    },
    'help.character.rarity.title': {
        ko: "희귀도 색과 아이템 레벨은 다릅니다",
        en: "Rarity color and item level differ",
    },
    'help.character.rarity.body': {
        ko: "일반 → 매직 → 레어 → 에픽 → 레전더리는 장비의 희귀도입니다. 높은 등급일수록 붙는 옵션 줄이 늘지만, 지금 영웅에게 필요한 옵션인지도 함께 봅니다. 일반 장비에는 죄종이 없고, 매직에는 한 죄종, 레어 이상에는 서로 다른 두 죄종이 붙습니다. 같은 등급이라도 옵션 조합과 수치는 달라집니다.<br><br>원정의 에픽은 나이트메어부터, 레전더리는 헬에서 나올 수 있습니다. 모든 적이 모든 등급을 주는 것은 아니므로 더 높은 장비를 찾을 때는 난이도와 정예·보스도 살펴봅니다. 유니크·크래프트는 이름만 보고 이 계단의 다음 등급이라고 생각하지 않습니다.<br><br>아이템 레벨은 무기 피해·방어력과 옵션 수치에 영향을 주며, 영웅의 착용 가능 여부에도 관계됩니다. 아이템 레벨이 높다고 옵션 줄이 추가되는 것은 아닙니다. 높은 등급·높은 레벨만 고르기보다 스킬의 필요 무기와 실제로 바뀌는 능력치를 함께 비교합니다.",
        en: "Normal → Magic → Rare → Epic → Legendary are equipment rarities. Higher rarity adds option lines, but the options must still suit your hero. Normal gear has no Sin; Magic has one, and Rare or higher has two different Sins. Items of the same rarity can roll different options and values.<br><br>Expedition drops can include Epic gear from Nightmare onward and Legendary gear in Hell. Not every enemy can provide every rarity, so consider difficulty and elite or boss enemies when seeking better gear. Unique and Crafted items are separate categories, not simply the next steps in that ladder.<br><br>Item level affects weapon damage, defense and option values, as well as whether a hero can equip it. A higher item level does not add option lines. Compare required weapons and actual stat changes alongside rarity and level.",
    },
    'help.character.sins.title': {
        ko: "장비 옵션과 죄종",
        en: "Equipment options and Sins",
    },
    'help.character.sins.body': {
        ko: "장비의 부위·베이스·희귀도·아이템 레벨에 따라 장비 자체의 기본 수치와 붙는 옵션이 달라집니다. 아이템 이름의 접두·접미에는 죄종이 붙을 수 있으며, 편성의 파티 전술이 착용 장비의 죄종 수를 조건으로 셉니다. 영웅 자체의 죄종과 장비에 붙은 죄종은 서로 다른 조건이므로 전술에 표시된 대상을 확인합니다.",
        en: "Slot, base type, rarity and item level determine equipment base stats and options. Prefixes and suffixes in item names can carry Sins, which Party tactics count on worn gear. A hero's own Sin and the Sins on equipment are separate conditions; check which one the tactic requires.",
    },
    'help.character.inventory.title': {
        ko: "부대 인벤토리와 창고",
        en: "Party inventories and the stash",
    },
    'help.character.inventory.body': {
        ko: "인벤토리는 부대마다 따로 있으며, 부대 번호를 눌러 보고 정리할 대상을 고릅니다. 창고는 공용입니다. [Ctrl]+클릭하거나 끌어 놓아 인벤토리와 창고 사이에서 장비를 옮길 수 있습니다. [정렬]은 등급·레벨·부위 기준으로 현재 칸을 한 번 정리하고, 그 뒤 들어오는 장비는 끝에 붙습니다.<br><br>장비 교체 시 벗은 장비는 새 장비를 꺼낸 보관함으로 돌아가며, 직접 해제한 장비는 보고 있는 인벤토리로 들어갑니다. 장비 강화와 제작은 대장간에서 진행합니다.",
        en: "Each party has its own inventory; choose a party number to select which one to view and organize. The stash is shared. Use [Ctrl]+click or drag and drop to move gear between an inventory and the stash. [Sort] organizes the current container once by rarity, level or slot; later arrivals append to the end.<br><br>When swapping equipment, the old item returns to the container the new one came from. Manually removed equipment enters the currently viewed inventory. Upgrade and craft gear at the Blacksmith.",
    },
    'help.character.salvage.title': {
        ko: "분해와 잠금",
        en: "Salvage and locks",
    },
    'help.character.salvage.body': {
        ko: "장비를 우클릭한 뒤 [잠금]으로 분해를 막고, [잠금 해제]로 보호를 풉니다. [분해] 창에서는 장비를 직접 고르거나 등급·레벨·베이스 필터로 선택한 뒤 [분해하기]로 가루와 부위 재료를 얻습니다. 등급·레벨·베이스의 서로 다른 열은 모두 만족해야 하며, 같은 열에서 여러 항목을 고르면 그중 하나에 맞아도 선택됩니다.<br><br>분해한 장비는 돌아오지 않으므로 중요한 장비는 먼저 잠급니다. [자동 분해]에서는 부대별로 부위·등급·레벨·베이스 조건을 정합니다. 원정에서 조건에 맞는 장비를 새로 얻을 때 적용되며, 기존 장비를 정리하려면 [지금 인벤토리에 적용]을 누릅니다. 유니크·크래프트는 자동 분해에서 보존됩니다.<br><br>설정을 프리셋에 저장해 다른 부대에서 불러올 수 있습니다.",
        en: "Right-click equipment and choose [Lock] to protect it from salvage or choose [Unlock] to remove that protection. In [Salvage], select gear manually or with rarity, level and base-option filters, then [Salvage now] to receive dust and slot materials. Gear must match every selected filter column; multiple options within the same column match any one of those options.<br><br>Salvage permanently consumes items, so lock important gear first. [Auto salvage] sets slot, rarity, level and base-option rules per party. It checks newly received Expedition drops; use [Apply to inventory now] to process gear already owned. Unique and crafted items are kept by auto-salvage. Save rules to a preset to load them on another party.",
    },
    'help.character.skills.title': {
        ko: "액티브 스킬과 자동 사용 순서",
        en: "Active skills and automatic priority",
    },
    'help.character.skills.body': {
        ko: "액티브는 영웅 고유·스킬북으로 습득·전직의 세 출처에서 하나씩 옵니다. 레벨만 올려 여러 스킬을 자동으로 배우는 구조는 아닙니다. 스킬 그림에 마우스를 올려 효과·대상·필요 무기를 확인하고, 스킬북을 통한 습득과 업그레이드는 도서관에서 진행합니다.<br><br>차례가 오면 조건을 만족하고 사용할 수 있는 스킬 중 가장 오래 준비된 것을 자동으로 고릅니다. 동시에 준비된 스킬은 [우선순위]에서 정한 순서를 따릅니다. 우선순위 창의 스킬 줄을 끌어 바꿀 수 있지만, 앞에 두었다고 쿨타임이 남은 스킬을 강제로 쓰지는 않습니다.<br><br>물리 무기와 맨손은 보통 차례마다 기본 공격을 하며, 준비된 스킬이 있으면 먼저 씁니다. 공격 스킬이 겨눈 적이 이미 쓰러지면 뒤의 기본 공격은 생략될 수 있습니다. 마법 무기는 기본 공격 없이 충전 칸으로 스킬을 씁니다. 정신 집중 중에는 기본 공격과 다른 스킬을 사용하지 않으며, 오오라와 사건 반응 스킬도 각자의 발동 규칙을 따릅니다. 마나는 없습니다.",
        en: "Active skills come one each from the hero's innate skill, a learned skill book and advancement. Leveling alone does not automatically teach a collection of skills. Hover an icon to check its effect, targets and weapon requirement. Learn and upgrade book skills at the Library.<br><br>On a turn, combat automatically picks the eligible skill that has been ready longest. Skills ready at the same time follow your [Priority] order. Drag rows in that window to change it. Putting a skill first does not force it to cast before its cooldown ends.<br><br>Physical weapons and bare hands normally make a basic attack each turn, using a ready skill first. The following basic attack may be skipped if the attack skill's target has already fallen. Magic weapons have no basic attack and cast using stored charges. Channeling prevents other skills and basic attacks while active; auras and event-triggered skills also follow their own activation rules. There is no mana.",
    },
    'help.character.weapon_skills.title': {
        ko: "배울 수 있는데 왜 스킬이 꺼지나요",
        en: "Why a learned skill may be inactive",
    },
    'help.character.weapon_skills.body': {
        ko: "스킬북은 영웅의 직업과 달라도 배울 수 있습니다. 하지만 타격·회복·소환처럼 무기를 필요로 하는 스킬은 그 스킬 직업의 무기를 들어야 사용합니다. 이 조건은 고유·습득·전직 스킬에 모두 적용되며, 맞지 않는 스킬은 건너뜁니다.<br><br>예를 들어 전사도 마법사 책을 배우고 스태프를 들 수 있습니다. 그러면 마법사 공격 스킬을 쓸 수 있지만, 도끼·둔기가 필요한 전사 공격 스킬은 꺼질 수 있습니다. 반대로 함성·축복·저주처럼 효과만 거는 스킬은 무기를 가리지 않으므로 다른 직업 영웅에게도 조합할 수 있습니다.<br><br>배울 수 있는지, 필요한 무기를 들었는지, 그 스킬의 능력치가 충분한지는 서로 다른 문제입니다. 궁수의 물리 한 방은 힘도 살펴보고, 민첩은 속도와 일부 스킬의 타수·효과를 봅니다. 사제의 대상 회복은 마법 공격력·매력을, 리커버리 같은 자기 회복은 최대 HP·건강을 사용하며 무기를 요구하지 않습니다. 각 스킬의 설명과 [Alt] 수치 내역을 확인합니다.",
        en: "Heroes can learn book skills from another class. However, skills needing a weapon—such as attacks, heals and summons—require a weapon belonging to that skill's class. This applies to innate, learned and advancement skills. Incompatible skills are skipped.<br><br>For example, a Warrior can read a Mage book and equip a staff. The Mage attack can then work, while Warrior attacks requiring an axe or mace may become inactive. Skills that only apply effects, such as shouts, blessings or curses, do not depend on the weapon and can be combined on other classes.<br><br>Being able to learn a skill, having its required weapon and having useful attributes for it are separate questions. An Archer's physical hit strength also depends on Strength; Agility affects speed and some skills' hit counts or effects. Priest heals use magic attack and Charisma. Self-healing such as Recovery uses maximum HP and Vitality without requiring a weapon. Check each skill's description and [Alt] calculations.",
    },
    'help.character.speed.title': {
        ko: "공격 속도·캐스팅 속도·쿨타임",
        en: "Attack speed, casting speed and cooldowns",
    },
    'help.character.speed.body': {
        ko: "공격 속도와 캐스팅 속도는 한 번 행동하는 간격에 영향을 줍니다. 물리 무기와 맨손은 공격 속도 옵션, 마법 무기는 캐스팅 속도 옵션을 사용합니다. 민첩은 양쪽 모두에 영향을 줍니다. 세부 옵션의 속도가 초로 표시될 때는 숫자가 작을수록 빠릅니다.<br><br>쿨타임은 같은 스킬을 쓴 뒤 다시 준비될 때까지의 시간입니다. 쿨타임 감소는 이 대기를 줄이고, 공격·캐스팅 속도는 행동 기회를 더 자주 만듭니다. 서로 대신하는 능력치가 아닙니다. 스킬이 준비됐는데 행동을 기다리는지, 행동할 준비는 됐는데 스킬 쿨이 남았는지 관전에서 살펴봅니다.<br><br>마법 무기는 행동 게이지가 찰 때 시전 칸 하나를 모으며 최대 {castCharges}칸까지 저장합니다. 준비된 스킬을 쓰면 한 칸이 줄고, 쌓인 칸과 준비된 스킬이 여럿이면 연달아 시전할 수 있습니다. 스킬 쿨 때문에 잠시 쉬는 동안 칸을 모으는 것이므로, 서 있다가 연속으로 쓰는 모습이 곧 고장은 아닙니다.",
        en: "Attack Speed and Casting Speed affect the interval between actions. Physical weapons and bare hands use Attack Speed options; magic weapons use Casting Speed. Agility affects both. When detailed stats show the interval in seconds, a lower number is faster.<br><br>A cooldown is the wait after using a skill before it is ready again. Cooldown Reduction shortens that wait; attack or casting speed creates action opportunities more often. They do not replace each other. Watch whether a ready skill is waiting for an action, or a hero ready to act is waiting for skill cooldowns.<br><br>Magic weapons gain one casting charge when the action gauge fills and store up to {castCharges}. Casting a ready skill spends one charge. Several stored charges and ready skills can produce casts in quick succession. Pausing while cooldowns run can build those charges, so waiting and then casting repeatedly is not necessarily a malfunction.",
    },
    'help.character.defenses.title': {
        ko: "물리 방어와 원소 저항",
        en: "Physical defense and elemental resistance",
    },
    'help.character.defenses.body': {
        ko: "물리 방어는 직접 맞는 물리 피해를, 화염·냉기·전기·독 저항은 해당 원소 피해를 줄입니다. 하나의 마법 방어 수치가 모든 원소를 막는 구조가 아닙니다. 방어력이 높은데도 화염 스킬에 크게 다친다면 화염 저항을 따로 봅니다.<br><br>저항 값과 최대 저항도 다릅니다. 저항이 상한에 닿으면 같은 저항을 더 쌓아도 현재 받는 피해가 더 줄지 않을 수 있습니다. 최대 저항 증가는 그 천장을 높이는 옵션으로, 저항 자체를 충분히 갖춰야 높아진 천장을 활용합니다. 적이 저항을 깎는 상황도 함께 살펴봅니다.<br><br>피해 감소·배리어·회복은 물리 방어와 또 다른 수단입니다. 다만 어떤 피해든 똑같이 막는다고 생각하지 않습니다. 사제의 일부 공격은 고정 피해로 방어·저항·피해 감소를 무시하고, 중독이나 반사도 직접 맞는 공격과 다른 규칙을 사용합니다.",
        en: "Physical Defense reduces direct physical hits. Fire, Cold, Lightning and Poison Resistance reduce their matching elemental damage. There is no single magic-defense value covering every element. If a high-defense hero takes heavy Fire damage, check Fire Resistance separately.<br><br>Resistance and maximum resistance are different. Once resistance reaches its cap, adding more may not immediately lower damage taken. Maximum-resistance bonuses raise the ceiling; enough actual resistance is still needed to use it. Also consider enemies that reduce resistance.<br><br>Damage Reduction, barriers and healing offer other forms of protection, but they do not treat every damage source alike. Some Priest attacks deal Fixed damage and bypass defense, resistance and damage reduction. Poison damage over time and reflection also follow different rules from direct hits.",
    },
    'help.character.penetration.title': {
        ko: "방어 무시·방어 감소·저항 감소",
        en: "Defense Ignore, defense reduction and Resist Reduction",
    },
    'help.character.penetration.body': {
        ko: "방어 무시는 내 물리 직격에서 적의 방어 일부를 계산하지 않는 능력치입니다. [타격 시 대상 방어력 감소]는 적에게 효과를 걸어 방어를 낮추므로, 같은 적을 때리는 다른 영웅의 물리 공격도 도움을 받습니다. 둘 다 명중률을 올리는 효과는 아닙니다.<br><br>저항 감소는 내 원소 직격에 적용하며, 화염·냉기처럼 원소가 정해진 옵션은 그 원소에만 적용됩니다. [타격 시 대상 저항 감소]는 적에게 걸린 동안 같은 원소로 공격하는 동료도 활용합니다. 화염 저항을 깎아도 물리·냉기 공격이 함께 강해지는 것은 아닙니다.<br><br>물리 공격이 중심인 파티라면 적의 방어와 방어 감소를, 원소 공격이 중심이라면 실제 쓰는 원소와 저항 감소를 맞춰 봅니다. 고정 피해는 원래 방어·저항을 건너뛰므로 이 옵션으로 그 고정 피해가 더 늘지는 않습니다.",
        en: "Defense Ignore leaves part of the enemy's defense out of your own Physical direct-hit calculation. [Reduce target defense on hit] applies an effect to the enemy, also helping allies who deal Physical hits to that target. Neither effect improves hit chance.<br><br>Resist Reduction applies to your own elemental direct hits. Options naming Fire, Cold or another element apply only to that element. [Reduce target resistance on hit] affects the enemy, so allies attacking with the same element can benefit while it lasts. Reducing Fire Resistance does not also strengthen Physical or Cold attacks.<br><br>For a party focused on Physical hits, examine enemy defense and defense reduction. For elemental attacks, match the options to the elements actually used. Fixed damage already bypasses defense and resistance, so these options do not raise that Fixed damage.",
    },
    'help.character.damage_kinds.title': {
        ko: "직격·지속 피해·반사·경직",
        en: "Direct hits, damage over time, reflection and stagger",
    },
    'help.character.damage_kinds.body': {
        ko: "기본 공격과 스킬의 직접 타격은 직격입니다. 직격에는 물리뿐 아니라 원소·고정 피해도 있습니다. 정신 집중 스킬이 여러 번 때리는 것도 각 타격이 직격일 수 있으므로, 여러 번 피해가 보인다고 모두 지속 피해로 보지는 않습니다.<br><br>중독·주기적으로 들어가는 오오라 피해·반사는 직격이 아닙니다. 이 피해는 다시 치명타·흡혈·반사를 일으키지 않습니다. 중독과 오오라 피해는 해당 원소 저항을 보지만 배리어·물리 방어·일반 피해 감소로 막지 않으며, 반사는 돌아온 피해를 방어·저항·배리어로 다시 줄이지 않습니다. 공격 횟수가 많아 보이는 것만으로 흡혈 회복량을 판단하지 않습니다.<br><br>큰 물리·고정 직격으로 실제 HP를 많이 잃으면 잠깐 경직될 수 있습니다. 경직은 다음 행동을 늦추지만 스턴처럼 스킬 쿨타임까지 멈추지는 않습니다. 타격 회복은 이 경직 시간을 줄이는 능력치이며 HP를 회복하는 효과가 아닙니다.",
        en: "Basic attacks and direct skill strikes are direct hits. These can deal Physical, elemental or Fixed damage. Repeated strikes from a channeled skill can each be direct hits, so a sequence of damage numbers does not always mean damage over time.<br><br>Poison, periodic aura damage and reflection are not direct hits. They do not trigger further critical hits, life steal or reflection. Poison and aura damage check their matching elemental resistance but bypass barriers, physical defense and ordinary Damage Reduction. Reflected damage is not reduced again by defense, resistance or barriers. A rapid-looking effect does not necessarily provide life-steal healing.<br><br>Losing a large amount of actual HP to a Physical or Fixed direct hit can briefly stagger a hero. Stagger delays actions but, unlike Stun, does not pause skill cooldowns. Hit Recovery shortens stagger; it does not restore HP.",
    },
    'help.character.critical_effects.title': {
        ko: "치명타·강타·흡혈·반격",
        en: "Critical hits, Crushing Blow, Life Steal and counters",
    },
    'help.character.critical_effects.body': {
        ko: "치명타 확률은 치명타가 나올 빈도, 치명타 피해는 치명타가 났을 때의 배율입니다. 마법 무기의 직접 타격도 치명타가 나올 수 있습니다. 두 수치 중 하나만 보고 공격 성능 전체를 판단하지 않습니다.<br><br>강타는 타격 직전 적의 현재 HP에 비례한 피해를 더합니다. 최대 HP 기준이 아니므로 같은 적도 HP가 많이 남았을 때 추가량이 큽니다. 강타와 흡혈은 물리 무기·맨손의 직격에 적용되며, 마법 무기를 들면 적용되지 않습니다.<br><br>흡혈은 준 직격 피해에 비례해 HP를 회복합니다. 피해가 잘 나오지 않으면 회복도 작아지며, 강타로 더한 피해나 중독·반사에는 흡혈이 붙지 않습니다. 회복을 늘리려면 흡혈 수치와 실제 타격 피해를 함께 확인합니다.<br><br>반격은 맞았을 때 확률로 공격자에게 기본 공격을 돌려주며, 자기 행동 차례를 사용합니다. 받은 피해를 그대로 되돌리는 반사와 다릅니다. 마법 무기에는 기본 공격이 없어 반격하지 못하며, 경직·스턴 중에도 반격하지 못합니다.",
        en: "Critical Chance controls how often critical hits occur; Critical Damage controls their multiplier. Direct hits with magic weapons can also critically hit. Neither stat alone describes the hero's overall damage output.<br><br>Crushing Blow adds damage based on the enemy's current HP just before the hit. It uses current rather than maximum HP, so the added amount is larger while that enemy has more HP left. Crushing Blow and Life Steal work with direct hits using Physical weapons or bare hands, but do not apply while wielding a magic weapon.<br><br>Life Steal heals in proportion to direct-hit damage dealt. Weak hits also mean little healing. Added Crushing Blow damage, Poison damage over time and reflection provide no Life Steal. Compare the Life Steal value with the damage the hero actually deals.<br><br>A counter has a chance to answer an incoming hit with a basic attack against the attacker, spending the defender's own action turn. This differs from reflection. Magic weapons have no basic attack and cannot counter; staggered or Stunned heroes cannot counter either.",
    },
    'help.character.farming_stats.title': {
        ko: "드랍률·매직아이템 획득·골드·경험치",
        en: "Item Find, Magic Find, Gold Find and EXP",
    },
    'help.character.farming_stats.body': {
        ko: "드랍률은 적을 처치했을 때 장비를 떨어뜨릴 확률을 높입니다. 매직아이템 획득은 장비의 레어 이상 등급이 나올 비중을 높입니다. 이름과 달리 매직 등급만을 위한 옵션이 아니며, 아이템 레벨을 올리거나 아직 나오지 않는 난이도의 등급을 해금하지도 않습니다.<br><br>골드 획득은 적에게서 받는 골드의 양을 늘립니다. 장비의 경험치 증가는 그 장비를 낀 영웅 본인의 전투 경험치를 늘리며, 도감 경험치를 늘리는 옵션은 아닙니다. 장비가 필요한지, 자금이 필요한지, 특정 영웅을 키울지에 따라 비교할 옵션이 달라집니다.<br><br>드랍률·매직아이템 획득·골드 획득은 파티원의 몫을 모아 적용하지만 많이 모을수록 추가분의 효과가 줄어듭니다. 몬스터가 입은 장비를 얻는 구조라 매직아이템 획득은 적의 장비도 좋게 만들 수 있습니다. 파밍 수치를 높인 뒤 클리어가 느려지거나 실패가 늘었다면 실제로 모이는 보상도 함께 비교합니다.",
        en: "Item Find raises the chance that a defeated enemy drops gear. Magic Find raises the share of gear rolls that are Rare or better. Despite its name, it does not only favor Magic rarity. It neither raises item level nor unlocks rarities unavailable at that difficulty.<br><br>Gold Find increases gold earned from enemies. EXP bonuses on gear increase combat XP for the hero wearing it, not Codex EXP. Compare different options depending on whether you need equipment, funds or levels for a particular hero.<br><br>Item Find, Magic Find and Gold Find combine the party's contributions with diminishing returns. Because drops come from gear monsters actually wear, Magic Find can improve enemy equipment too. If higher farming bonuses make clears slower or less reliable, also compare the rewards you actually earn.",
    },
    'help.character.ailments.title': {
        ko: "화상·중독·결빙·스턴",
        en: "Burn, Poison, Freeze and Stun",
    },
    'help.character.ailments.body': {
        ko: "화상은 지속 피해가 아닙니다. 걸린 동안 받는 물리·원소 직격 피해가 늘고 받는 회복이 줄어듭니다. 회복 감소는 회복 스킬뿐 아니라 재생·흡혈·물약에도 적용되므로, 평소 잘 버티던 영웅도 화상 중에는 다르게 보일 수 있습니다.<br><br>중독은 일정 시간마다 독 피해를 줍니다. 공격이 끝난 뒤에도 HP가 줄어드는 이유가 될 수 있으며, 독 저항이 이 피해를 줄입니다. 모든 화염·독 스킬이 저절로 화상·중독을 거는 것은 아니므로 스킬 설명의 부여 효과를 확인합니다.<br><br>결빙은 행동을 느리게 하지만 스킬 쿨타임은 계속 흐릅니다. 스턴은 행동과 스킬 쿨타임을 함께 멈춥니다. 스턴 중에도 물약·재생과 걸린 효과의 시간은 계속 흐릅니다. 같은 모습으로 잠시 서 있어도 원인은 다를 수 있습니다.<br><br>받는 상태이상·디버프의 시간은 매력과 해당 시간 감소 옵션으로 짧아질 수 있습니다. 화염 저항처럼 피해를 줄이는 수치와 화상 시간 감소처럼 지속시간을 줄이는 수치는 하는 일이 다릅니다. 어떤 효과가 오래 남는지와 어떤 피해가 큰지를 나누어 봅니다.",
        en: "Burn is not damage over time. It increases incoming Physical and elemental direct-hit damage and reduces healing received. The healing penalty affects healing skills, regeneration, life steal and potions, so a hero who normally survives well may struggle while burning.<br><br>Poison deals Poison damage at regular intervals. It can keep lowering HP after an attack ends, and Poison Resistance reduces it. Fire or Poison damage does not automatically apply Burn or Poison; check the effects stated on the skill.<br><br>Freeze slows actions while skill cooldowns keep running. Stun pauses both actions and skill cooldowns. Potions, regeneration and effect durations continue during Stun. Heroes standing still can therefore have different causes.<br><br>Charisma and matching duration-reduction options can shorten incoming ailments and debuffs. Fire Resistance reduces damage; Burn Duration Reduction shortens an effect. Check which effects persist and which damage sources hurt rather than treating these stats as interchangeable.",
    },
    'help.character.channeling.title': {
        ko: "정신 집중과 오래 걸리는 스킬",
        en: "Channeling and skills that take time",
    },
    'help.character.channeling.body': {
        ko: "정신 집중 스킬은 시작한 뒤 여러 번에 나누어 공격하거나, 힘을 모은 뒤 한 번 공격합니다. 그동안 다른 스킬과 기본 공격은 기다립니다. 다른 스킬의 쿨타임은 계속 흐르지만, 집중 중인 스킬의 쿨타임은 집중이 끝난 뒤부터 시작합니다.<br><br>공격 속도가 모든 집중 시간을 줄이지는 않습니다. 행동 간격마다 끊어 치는 스킬과 정해진 초 동안 모으는 스킬은 시간 규칙이 다릅니다. 스킬 설명에서 타수·간격·모으는 시간을 함께 확인합니다. 경직이나 스턴은 집중을 늦출 수 있지만, 맞았다는 이유만으로 언제나 취소되는 것은 아닙니다.",
        en: "Channeling skills spread attacks over time or gather power before a single strike. Other skills and basic attacks wait during the channel. Other skill cooldowns keep running, while the channeled skill's own cooldown starts after the channel ends.<br><br>Attack speed does not shorten every channel. Skills striking at action intervals and skills charging for a fixed number of seconds use different timing rules. Check hit counts, intervals and charge time in the skill description. Stagger and Stun can delay a channel; being hit does not always cancel it.",
    },
    'help.character.mastery.title': {
        ko: "마스터리로 바꾸는 영웅의 강점",
        en: "Shaping a hero with mastery",
    },
    'help.character.mastery.body': {
        ko: "[마스터리 열기]에서 죄종·직업 마스터리에 포인트를 투자합니다. 두 마스터리는 모두 패시브 효과이며 같은 포인트를 나누어 씁니다. 공격 스킬 하나를 더 장착하는 기능이 아니라, 가진 영웅의 공격·생존·파밍 등 강점을 고르는 기능입니다.<br><br>칸을 누르면 한 랭크를 올리고 우클릭하면 한 랭크와 포인트를 돌려받습니다. [초기화]도 무료로 모두 환급하므로, 지금 막힌 원인에 맞춰 배분을 바꿔 볼 수 있습니다. 높은 층은 레벨 조건을 확인하고, 특정 무기·갑옷·장비 죄종 수를 요구하는 칸은 현재 조건까지 맞아야 효과가 적용됩니다.<br><br>도서관에서 전직하면 별도 전직 포인트로 전직 스킬 하나를 배우고 레벨을 올립니다. 배운 전직 스킬을 되돌려 같은 갈래의 다른 스킬로 바꿀 수 있지만, 선택한 전직 갈래 자체를 바꾸는 기능은 없습니다. 특수·변형·필살기 가지는 현재 준비 중입니다.",
        en: "[Open Mastery] lets you invest in Sin and Class mastery. Both provide passive effects and share one point pool. They shape the hero's damage, survival or farming strengths rather than adding another equipped active skill.<br><br>Click a node for one rank or right-click to refund one rank and point. [Reset] also refunds everything for free, so you can change allocation to address the problem you face. Check higher-tier level requirements and any matching weapon, armor or equipment-Sin conditions; investing alone does not activate a condition you do not meet.<br><br>After advancing at the Library, use separate Advance Points to learn and level one advancement skill. Refunding it lets you choose another skill within the same path, but the chosen advancement path itself cannot be changed. Special, Variant and Ultimate branches are currently coming later.",
    },
    'help.character.dismiss.title': {
        ko: "영웅 해고와 남는 것",
        en: "Dismissing a hero",
    },
    'help.character.dismiss.body': {
        ko: "캐릭터 탭에서 영웅을 선택하면 카드에 [해고] 버튼이 표시됩니다. 모든 장비를 먼저 해제해야 하며, 원정·탐험·전직 진행 중인 영웅과 로스터의 마지막 한 명은 해고할 수 없습니다.<br><br>확인 뒤 해고하면 그 영웅은 로스터와 편성·연구소 등록에서 사라집니다. 해고는 되돌릴 수 없고 고용비·사용한 책·경험치를 돌려받지 않습니다. 현재 성장 고블린도 해고 경험치 물약이나 재고용 기능이 없으므로, 훈련 대기 영웅을 단순히 빼 두려면 편성에서만 제외하면 됩니다.",
        en: "Select a hero in Character to show [Dismiss] on their card. Remove all equipment first. Heroes on expeditions, exploring or advancing cannot be dismissed, nor can the last hero in the roster.<br><br>Confirming removes the hero from the roster, party presets and Laboratory assignments. This cannot be undone and returns no hiring gold, books or XP. The Growth goblin currently has no dismissal XP potion or rehiring feature either. To keep a hero for later training, remove them from the party rather than dismissing them.",
    },
    'help.research.build.title': {
        ko: "건물 랭크란?",
        en: "What is a building rank?",
    },
    'help.research.build.body': {
        ko: "건물의 <b>랭크</b>는 그 건물이 여는 기능과 칸의 단계입니다. 처음 짓는 것이 랭크 I이며, 이후에는 같은 건물의 랭크를 하나씩 올립니다.<br><br>왼쪽 부지에서 건물을 고르면 오른쪽에 <b>현재 기능 · 다음 랭크 · 전체 랭크 목록</b>이 나옵니다. 다음 랭크에서 무엇이 열리는지 확인하고, 조건과 비용을 갖춘 뒤 <b>[건설]</b>합니다.",
        en: "A building's <b>rank</b> is a step in the features and slots it unlocks. Building it for the first time gives rank I; further construction adds one rank at a time.<br><br>Select a lot on the left to see <b>current features, the next rank and the full rank list</b> on the right. Check what the next rank opens, meet its requirements and cost, then press <b>Build</b>.",
    },
    'help.research.first_steps.title': {
        ko: "처음 마을을 넓히는 순서",
        en: "The first town unlocks",
    },
    'help.research.first_steps.body': {
        ko: "초반 첫 건설은 <b>상단 → 선술집 → 대장간 → 창고 → 지휘 천막</b> 순서로 열립니다. 앞 건물을 지으면 다음 건물의 건설 조건이 갖춰집니다. 필요한 골드는 원정을 진행하고 의뢰를 수령해 마련할 수 있습니다.<br><br>선술집은 <b>의뢰 게시판을 먼저</b> 열며, 고용은 이후 랭크에서 열립니다. 창고를 지으면 연구소의 <b>자원 자동 생산</b>이 시작되고, 지휘 천막을 지으면 편성의 <b>첫 파티 전술 칸</b>이 열립니다. 인벤토리와 공용 창고 칸은 건설 전에도 사용할 수 있습니다.",
        en: "The first buildings unlock in this order: <b>Trading House → Tavern → Blacksmith → Storage → Command Tent</b>. Each building satisfies the requirement for the next one. Expeditions and claimed commissions provide gold for construction.<br><br>The Tavern opens its <b>commission board first</b>; hiring unlocks at a later rank. Building Storage starts the Laboratory's <b>automatic material production</b>. Building the Command Tent opens the <b>first Party tactic slot</b>. Inventory and shared stash spaces can be used before Storage is built.",
    },
    'help.research.requirements.title': {
        ko: "건설 조건과 지불",
        en: "Requirements and payment",
    },
    'help.research.requirements.body': {
        ko: "<b>[다음 랭크]</b>의 조건은 모두 채워야 합니다. 건물에 따라 스테이지·챕터·난이도 클리어, 영웅 레벨, 로스터 합산 레벨, 다른 건물 랭크를 요구합니다. 합산 레벨은 지금까지 달성한 최고치를 사용하므로 영웅을 해고해도 달성한 기록이 사라지지 않습니다.<br><br>비용을 내면 <b>즉시 완료</b>되며 영웅을 배치하거나 기다릴 필요가 없습니다. 지은 랭크와 지불한 비용은 되돌리지 못합니다. 비용 칸의 부족한 재료를 확인한 뒤 연구소 생산이나 장비 분해로 준비합니다.",
        en: "Meet <b>every requirement</b> listed under Next Rank. Depending on the building, these include stage, chapter or difficulty clears, hero levels, total roster levels, and other building ranks. Total roster level uses your highest recorded total, so dismissing a hero does not erase an achieved requirement.<br><br>Construction finishes <b>immediately</b> after payment, with no assigned hero or waiting time. Built ranks and their costs cannot be refunded. Check missing materials in the cost display and obtain them through Laboratory production or salvaging gear.",
    },
    'help.research.unlocks.title': {
        ko: "어떤 건물이 무엇을 여나요?",
        en: "Which building unlocks what?",
    },
    'help.research.unlocks.body': {
        ko: "<b>상단</b>은 물건 구매, <b>선술집</b>은 의뢰·영웅 고용·도박장, <b>대장간</b>은 장비 제작·강화·재료 합성을 엽니다. <b>도서관</b>은 스킬북·전직·도감 단계를 엽니다.<br><br><b>지휘 천막</b>은 파티 전술 칸을 늘립니다. <b>탐험 건물</b>의 뒤 랭크는 Party 수를 늘리고, <b>창고</b>의 뒤 랭크는 물약 칸 등 표시된 기능을 확장합니다. 정확한 내용은 각 건물의 랭크 목록을 확인합니다.<br><br><b>연구소 랭크를 짓는 것</b>과 <b>연구소에서 지점을 연구하는 것</b>은 다릅니다. 건설은 새 지점을 열고, 열린 지점의 생산량·속도 등을 올리는 것은 연구소의 연구입니다.",
        en: "The <b>Trading House</b> opens purchases; the <b>Tavern</b> opens commissions, hiring and gambling; the <b>Blacksmith</b> opens smithing, upgrades and material combining. The <b>Library</b> opens skill books, advancement and Codex levels.<br><br>The <b>Command Tent</b> adds tactic slots. Later <b>Exploration</b> ranks add Parties, while later <b>Storage</b> ranks expand the listed features, including potion slots. Check each building's rank list for exact unlocks.<br><br><b>Building a Laboratory rank</b> differs from <b>researching a Laboratory node</b>. Construction opens new nodes. Research in the Laboratory improves the output, speed and other effects of nodes already open.",
    },
    'help.research.locked.title': {
        ko: "잠긴 기능과 준비 중 기능",
        en: "Locked and coming features",
    },
    'help.research.locked.body': {
        ko: "왼쪽의 자물쇠 탭을 누르면 먼저 필요한 건물을 알려 줍니다. 건설 화면의 <b>[다음 랭크]</b>에서 부족한 조건과 비용을 확인합니다. 기능 안의 잠금은 해당 기능을 여는 건물 랭크를 확인합니다.<br><br><b>잠김</b>은 건설·진행 조건을 채우면 열리는 기능입니다. <b>준비 중</b>은 아직 사용할 수 없는 기능입니다. 한 랭크가 여는 기능이 전부 준비 중이면 그 랭크는 지을 수 없습니다.",
        en: "Click a locked navigation tab to see the building required first. Check <b>Next Rank</b> in Construction for missing requirements and costs. A lock within a feature identifies the building rank that opens it.<br><br>A <b>locked</b> feature opens when its construction or progress requirements are met. A feature marked <b>coming later</b> is not available yet. A rank that only opens coming features cannot be built.",
    },
    'help.tavern.hire.title': {
        ko: "영웅 고용",
        en: "Hiring heroes",
    },
    'help.tavern.hire.body': {
        ko: "고용 기능이 열리면 후보 카드의 능력치와 스킬을 살펴본 뒤 <b>[고용]</b>합니다. 비용은 <b>{hire}G</b>이며 로스터에 빈 자리가 필요합니다. 영웅은 시작 무기와 갑옷을 갖고 들어옵니다.<br><br>고용한 영웅은 <b>로스터에 추가</b>됩니다. 전투에 넣으려면 편성 탭에서 Party에 넣고, 연구소 효과를 받으려면 원하는 줄에 등록합니다. 고용한 후보의 자리는 다음 명단 교체까지 비어 있습니다.",
        en: "Once hiring is unlocked, inspect a candidate's attributes and skill, then press <b>Hire</b>. It costs <b>{hire}G</b> and needs a free roster slot. The hero arrives with a starter weapon and armor.<br><br>Hiring adds the hero to your <b>roster</b>. Add them to a Party in the Party tab to fight, or assign them to a Laboratory line for its bonuses. The hired candidate's slot stays empty until the next refresh.",
    },
    'help.tavern.choosing.title': {
        ko: "후보는 무엇을 보고 고르나요?",
        en: "Choosing a recruit",
    },
    'help.tavern.choosing.body': {
        ko: "등급 색만 보지 말고 <b>필요한 역할 · 고유 스킬 · 그 스킬이 쓰는 능력치</b>를 함께 확인합니다. 일반·매직·레어는 능력치 총합의 범위와 분포가 다릅니다. 레어는 대체로 총합이 높지만, 매직도 필요한 능력치가 높게 나온 후보가 있을 수 있습니다.<br><br>기본 능력치는 생성될 때 정해지고 일반적인 레벨업으로 다시 뽑히지 않습니다. 직업은 같아도 죄종·능력치·고유 스킬이 다르면 맡길 역할이 달라집니다. 현재 명단에서는 일반·매직·레어가 나오며 유니크는 나오지 않습니다.",
        en: "Check the <b>role you need, the innate skill and the attributes that skill uses</b>, alongside the tier color. Normal, Magic and Rare heroes have different attribute-total ranges and spreads. Rare heroes generally have higher totals, but a Magic candidate may roll strongly in the attribute you need.<br><br>Attributes are set when a hero is created and are not rerolled by ordinary level-ups. Heroes of the same class can suit different roles because their Sins, attributes and innate skills differ. The current candidate list generates Normal, Magic and Rare heroes, but no Uniques.",
    },
    'help.tavern.reroll.title': {
        ko: "후보 명단 교체",
        en: "Refreshing the recruit list",
    },
    'help.tavern.reroll.body': {
        ko: "<b>[후보 교체 (무료)]</b> 또는 <b>[교체하기]</b>를 누르면 남아 있는 후보를 포함해 명단 전체가 바뀝니다. 시간이 지나도 후보는 저절로 바뀌지 않습니다. 교체 전에 남겨 둘 후보는 <b>[보관]</b>할 수 있습니다.<br><br>무료 교체 뒤 <b>{refresh}시간</b>이 지나면 다음 교체가 무료가 됩니다. 그 전에는 <b>{reroll}G</b>부터 유료로 바꿀 수 있으며, 유료 비용은 사용할 때마다 두 배가 됩니다. 유료 교체는 무료까지 남은 시간을 늘리지 않고, 무료 교체를 쓰면 유료 비용이 처음으로 돌아갑니다.",
        en: "<b>New candidates (free)</b> or <b>Refresh</b> replaces the entire recruit list, including candidates still present. Time never changes the list automatically. Use <b>Keep</b> before refreshing to save a candidate.<br><br>The next refresh becomes free <b>{refresh}h</b> after the last free one. Earlier refreshes cost gold, starting at <b>{reroll}G</b> and doubling with each paid use. Paid refreshes do not delay the free timer. Using a free refresh resets the paid price.",
    },
    'help.tavern.keep.title': {
        ko: "보관은 고용과 다릅니다",
        en: "Keeping is different from hiring",
    },
    'help.tavern.keep.body': {
        ko: "후보의 <b>[보관]</b>을 누르면 무료로 오른쪽 수색 칸에 옮깁니다. 명단의 그 자리는 비지만 보관한 영웅은 명단을 교체해도 남습니다. 아직 내 로스터에 들어온 것은 아니므로 나중에 <b>고용비를 내고 고용</b>해야 사용할 수 있습니다.<br><br>오른쪽 초상을 눌러 카드를 열고 <b>[고용]</b>하거나 <b>[돌려보내기]</b>합니다. 수색 칸은 시간이 지나 찾아온 영웅과 함께 쓰며, 가득 차면 추가 보관과 새 영웅 도착이 멈춥니다. 보관할 후보와 새 도착을 기다릴 빈 칸을 함께 생각합니다.",
        en: "Use a candidate's <b>Keep</b> button to move them into a waiting slot on the right for free. Their list slot becomes empty, but the saved hero remains when the recruit list is refreshed. They are not in your roster yet: <b>pay the hiring cost later</b> to use them.<br><br>Select the portrait to open the hero's card, then <b>Hire</b> or <b>Send away</b>. Kept candidates share slots with heroes arriving over time. A full waiting area blocks further keeping and pauses new arrivals, so leave space when you want more arrivals.",
    },
    'help.tavern.visitors.title': {
        ko: "기다리면 찾아오는 영웅",
        en: "Heroes who arrive over time",
    },
    'help.tavern.visitors.body': {
        ko: "연구소에서 <b>[수색 → 간격]</b>을 처음 연구해 완료하면 도착 시계가 시작됩니다. 영웅을 내보내지 않아도 후보가 찾아오며, 게임을 닫아도 시간이 흐릅니다. 이 수색으로는 현재 <b>매직 또는 레어</b> 영웅이 옵니다.<br><br>도착한 영웅은 고용하거나 돌려보낼 때까지 떠나지 않습니다. 수색 칸이 가득 찬 동안에는 시계가 멈추고, 자리를 비우면 남은 시간부터 다시 흐릅니다. 연구소에서 <b>간격</b>을 올리면 더 자주 오고, <b>품질</b>은 레어 확률, <b>대기 칸</b>은 보관할 수를 늘립니다.",
        en: "Complete the first <b>Search → Interval</b> research in the Laboratory to start the arrival timer. Candidates arrive without sending a hero out, including while the game is closed. These arrivals currently produce <b>Magic or Rare</b> heroes.<br><br>Arrivals stay until hired or sent away. Full waiting slots pause the timer; freeing a slot resumes it from the remaining time. Laboratory <b>Interval</b> research makes arrivals more frequent, <b>Quality</b> raises the Rare chance, and <b>Waiting Slots</b> adds capacity.",
    },
    'help.tavern.commissions.title': {
        ko: "하던 원정에 의뢰를 얹기",
        en: "Adding a commission to your expeditions",
    },
    'help.tavern.commissions.body': {
        ko: "게시판에서 목표와 골드 보상을 보고 <b>[수락]</b>합니다. 동시에 진행할 수 있는 의뢰는 <b>{slots}개</b>입니다. 별도 파티나 전투를 시작하지 않으며, 수락한 뒤 모든 부대의 <b>승리 라운드</b>가 목표를 함께 채웁니다.<br><br>처치 의뢰는 적힌 지역·종족·몬스터·등급을 맞춰야 합니다. 수집 의뢰는 해당 희귀도의 원정 장비를 셉니다. 자동 분해 규칙으로 분해한 장비도 포함하지만, 가방이 가득 차 넘친 장비와 패배한 라운드는 세지 않습니다. 수락 전에 얻은 장비는 세지 않으며, 상점 구매·탐험 보상·연구소 생산도 현재 수집 목표에 포함되지 않습니다.<br><br>다 채우면 <b>[수령]</b>해야 골드를 받습니다. 기한은 없습니다. <b>[포기]</b>하면 진행도는 사라지지만 벌금은 없고, 수령·포기한 자리는 새 의뢰로 바뀝니다. 현재 돌고 있는 지역이나 앞으로 잡을 적과 맞는 목표를 고르면 원정과 함께 진행할 수 있습니다.",
        en: "Check a card's goal and gold reward, then <b>Accept</b>. Your active limit is <b>{slots}</b>. No extra Party or battle starts: <b>won rounds</b> from all your expeditions contribute after acceptance.<br><br>Kill goals require the stated area, race, monster or enemy grade. Collection goals count expedition gear of the stated rarity. Auto-salvaged drops count, but full-bag overflow and defeated rounds do not. Gear from before acceptance, Shop purchases, Exploration rewards and Laboratory output do not count toward current collection goals.<br><br>Use <b>Claim</b> after completion to receive the gold. There is no deadline. <b>Abandon</b> loses progress without a fee. Claiming or abandoning replaces that card. A goal matching your current farming area or next enemies can progress alongside your expeditions.",
    },
    'help.tavern.fame.title': {
        ko: "카드 등급과 명성 레벨",
        en: "Card grade and Fame level",
    },
    'help.tavern.fame.body': {
        ko: "의뢰의 <b>일반·매직·레어 등급</b>은 카드마다 따로 정해집니다. 높은 등급은 목표 수와 보상이 함께 커지며, 목표 수 대비 골드도 더 좋습니다.<br><br><b>명성</b>은 로스터 전체가 공유하는 의뢰 성장입니다. 완료한 의뢰를 <b>[수령]</b>할 때 경험치가 쌓이고, 명성 레벨이 오르면 새 카드의 목표 수와 골드가 함께 커집니다. 이미 게시판에 있는 카드는 그대로입니다.<br><br>명성은 내려가지 않으며 포기는 경험치를 주지 않습니다. 최고 레벨에 도달한 뒤에도 그 레벨의 의뢰를 계속 받고 보상을 받을 수 있습니다.",
        en: "Each commission rolls its own <b>Normal, Magic or Rare grade</b>. Higher grades increase both the goal and reward, with more gold per unit of the goal.<br><br><b>Fame</b> is shared commission progress for your whole roster. <b>Claiming</b> completed commissions earns XP. Higher Fame levels increase the goals and gold on new cards; cards already on the board stay unchanged.<br><br>Fame never falls, and abandoning grants no XP. At the highest Fame level, you can continue accepting its commissions and earning rewards.",
    },
    'help.tavern.gambling.title': {
        ko: "도박장 슬롯",
        en: "Gambling Den slots",
    },
    'help.tavern.gambling.body': {
        ko: "선술집의 도박장을 열고 판돈 단계를 골라 골드를 걸고 돌립니다. 횟수 제한은 없지만 매 판 판돈을 지불합니다. 판돈은 진행 챕터와 선택 단계에 따라 바뀝니다. <b>{batch}판 돌리기</b>는 판돈이 모자라면 도중에 멈춥니다.<br><br>가로·대각선 <b>{lines}줄</b>에서 같은 심볼 셋이 골드나 재료를 줍니다. 와일드는 다른 심볼을 대신하고, 코인은 일반 라인을 끊습니다. <b>코인 {trigger}개 이상</b>이면 홀드 앤 스핀이 시작됩니다. 코인은 제자리에 붙고, 새 코인이 나올 때마다 남은 횟수가 <b>{respins}회</b>로 돌아갑니다. 판을 다 채우면 그랜드 보상을 받습니다.<br><br>받는 것은 골드와 표시된 재료이며 장비·낙인은 나오지 않습니다. 도박장을 열면 제공되는 판돈 단계를 모두 고를 수 있습니다. 연구소의 <b>도박장 줄</b>은 자동으로 골드를 버는 별도 기능입니다.",
        en: "Open the Tavern's Gambling Den, choose a stake tier and spend gold to spin. There is no spin limit, but each spin costs a stake. Stakes follow your progress chapter and chosen tier. <b>Spin ×{batch}</b> stops early if you cannot afford the next stake.<br><br>Three matching symbols on any of <b>{lines} rows or diagonals</b> pay gold or materials. Wilds substitute for other symbols; coins break ordinary lines. At least <b>{trigger} coins</b> starts Hold & Spin. Coins stick in place, and each new coin resets remaining spins to <b>{respins}</b>. Fill the board for the Grand reward.<br><br>Prizes are gold and the shown materials, with no equipment or stigma. Every provided stake tier is available when the hall opens. The Laboratory's <b>Gambling Den line</b> is a separate source of automatic gold income.",
    },
    'help.shop.buy.title': {
        ko: "비교한 뒤 구매하기",
        en: "Compare, then buy",
    },
    'help.shop.buy.body': {
        ko: "위쪽 영웅 띠에서 비교할 영웅을 고릅니다. 장비 상품에 마우스를 올리면 그 영웅의 착용품과 비교할 수 있습니다. 장비는 레벨이나 등급뿐 아니라 필요한 옵션·스킬·파티 전술과 맞는지도 확인합니다.<br><br>장비 상품을 선택하고 아래 <b>[구매]</b>를 누르면 <b>현재 보고 있는 부대 인벤토리</b>로 들어갑니다. 자동으로 장착되지는 않습니다. 장비 구매에는 골드와 빈 인벤토리 칸이 필요합니다.<br><br><b>스킬 도안은 도안 재고에, 물약은 공동 물약 재고에</b> 쌓입니다. 장비 인벤토리 칸을 차지하지 않으므로 장비 칸이 가득 차 있어도 살 수 있습니다.<br><br>장비와 스킬 도안은 목록의 한 칸마다 한 번 살 수 있습니다. 팔린 칸은 <b>[교체]</b>까지 그대로 남습니다. 필요 없는 장비를 재료로 바꾸는 것은 판매가 아니라 캐릭터·인벤토리의 <b>[분해]</b>입니다.<br><br>자물쇠 칸은 아직 팔지 않는 상품입니다. 처음 지은 상단은 맨 윗줄의 무기·물약만 팔고, 건설에서 상단 랭크를 올리면 방어구·장신구·스킬 도안 줄이 열립니다.",
        en: "Choose a comparison hero in the top strip. Hover an equipment item to compare it with that hero's worn item. Alongside level and rarity, check whether its options suit the skills and Party tactics you use.<br><br>Select an equipment item, then press <b>Buy</b> below. It enters the <b>party inventory you are viewing</b> and is not equipped automatically. Buying equipment requires enough gold and a free inventory slot.<br><br><b>Skill blueprints enter blueprint stock, and potions enter shared potion stock.</b> Neither occupies equipment slots, so a full equipment inventory does not block these purchases.<br><br>Each equipment or skill-blueprint slot can be bought once per list. Sold slots remain until <b>Refresh</b>. To turn unwanted gear into materials, use <b>Salvage</b> in Character or the inventory; there is no selling step.<br><br>Locked slots are goods not yet on sale. A newly built Trading House sells only the top row of weapons and potions; upgrade it in Construction to open the armor, jewelry and skill-blueprint rows.",
    },
    'help.shop.restock.title': {
        ko: "교체 전에 영웅 레벨 확인",
        en: "Check the hero level before refreshing",
    },
    'help.shop.restock.body': {
        ko: "<b>[교체]</b>는 선택한 영웅의 <b>현재 레벨</b>을 기준으로 장비 목록을 다시 만듭니다. 영웅만 바꾸거나 레벨이 올라도 기존 상품은 바뀌지 않습니다. 상품은 기준보다 높거나 낮은 레벨로 나올 수 있으며, 고른 영웅의 직업에 맞는 무기만 나오는 것은 아닙니다.<br><br>무료 교체 뒤 <b>{refresh}시간</b>이 지나면 다시 무료입니다. 대기 중 유료 교체는 <b>{reroll}G</b>부터 시작해 사용할 때마다 두 배가 됩니다. 유료 교체는 무료 시계를 늦추지 않으며, 무료 교체를 쓰면 유료 비용이 처음으로 돌아갑니다.<br><br>교체는 장비와 스킬 도안 목록을 함께 바꾸고 팔린 칸도 새로 채웁니다. 남겨 둔 상품도 사라지므로 구매할 물건을 확인한 뒤 교체합니다. 시간 경과나 특수상인 방문이 일반 목록을 자동으로 바꾸지는 않습니다.",
        en: "<b>Refresh</b> regenerates gear around the selected hero's <b>current level</b>. Selecting another hero or leveling up does not change existing goods. Products may roll above or below the target level, and weapons are not restricted to that hero's class.<br><br>A refresh becomes free <b>{refresh}h</b> after the last free one. Paid refreshes start at <b>{reroll}G</b> and double with each use. They do not delay the free timer. Using a free refresh resets the paid price.<br><br>Refreshing changes both gear and skill blueprints and refills sold slots. Unsold goods also disappear, so check intended purchases first. Time and special-trader visits never refresh the ordinary list automatically.",
    },
    'help.shop.consumables.title': {
        ko: "물약을 여러 개 사기",
        en: "Buying potions in batches",
    },
    'help.shop.consumables.body': {
        ko: "물약을 고르고 수량 버튼으로 총개수와 가격을 확인한 뒤 <b>[구매]</b>합니다. 수량 버튼은 고르기만 하며 즉시 구매하지 않습니다. 고른 수량 버튼을 다시 누르면 한 개로 돌아갑니다.<br><br>물약은 매진되지 않고 공동 재고에 쌓입니다. 총가격이 모자라면 일부만 사지 않고 구매가 취소됩니다. 구입한 물약을 전투에 쓰려면 편성 탭에서 물약 칸의 종류와 순서를 정합니다. 상점 구매는 골드만 쓰고, 대장간 물약 제작은 골드와 약초를 씁니다. 가격은 각 화면에서 비교할 수 있습니다.",
        en: "Select a potion, choose a quantity to check its total price, then press <b>Buy</b>. Quantity buttons only select an amount; they do not purchase it immediately. Click the selected quantity again to return to one.<br><br>Potions never sell out and accumulate in shared stock. If you cannot afford the total, none are purchased. Configure potion types and order in Party to use them in combat. Shop purchases cost gold; brewing at the Blacksmith costs gold and herbs. Compare the prices shown in each place.",
    },
    'help.shop.blueprints.title': {
        ko: "스킬 도안을 샀다면",
        en: "After buying a skill blueprint",
    },
    'help.shop.blueprints.body': {
        ko: "상점의 스킬 그림에 붙은 <b>도안</b>은 영웅에게 바로 쓰는 책이 아닙니다. 도서관에서 도안 한 장과 재료로 스킬북 한 권을 만든 뒤 영웅에게 읽힙니다. 같은 도안을 여러 장 모으면 같은 책을 더 만들 수 있습니다.<br><br>일반 상단은 현재 <b>직업 스킬 1티어 도안</b>을 팝니다. 모든 스킬 도안이 상점에 나오는 것은 아닙니다. 원하는 스킬의 다른 획득처는 도감의 스킬 항목에서 확인합니다.",
        en: "The <b>blueprint</b> badge on a Shop skill icon marks a crafting ingredient, not a book to use directly on a hero. Turn one blueprint and materials into one skill book at the Library, then have a hero read it. More copies let you make more matching books.<br><br>The ordinary Trading House currently sells <b>Tier 1 class-skill blueprints</b>. It does not stock every skill. Check a skill's Codex entry for other sources.",
    },
    'help.shop.special.title': {
        ko: "특수상단은 별도 방문입니다",
        en: "Special visits are separate",
    },
    'help.shop.special.body': {
        ko: "건설에서 상단의 해당 랭크를 올리면 <b>특수상단 방문</b> 기능이 열립니다. 패널에서 도착·출발까지의 남은 시간을 볼 수 있습니다. 이 시계는 일반 상단의 <b>[교체]</b> 무료 대기와 별개입니다.<br><br>현재 특수상단 상품은 <b>준비 중</b>입니다. 물음표 칸에서는 구매할 수 없습니다. 일반 장비·물약·스킬 도안은 왼쪽 일반 상단에서 구매합니다.",
        en: "Upgrading the Trading House to the required rank opens <b>special-trader visits</b>. Its panel shows the time until arrival or departure. This timer is separate from the ordinary Trading House's free <b>Refresh</b> wait.<br><br>Special-trader goods are currently <b>coming later</b>. Question-mark slots cannot be purchased. Buy ordinary gear, potions and skill blueprints from the regular Trading House on the left.",
    },
    'help.forge.overview.title': {
        ko: "제작 · 강화 · 합성의 차이",
        en: "Smithing, upgrades and combining",
    },
    'help.forge.overview.body': {
        ko: "<b>제작</b>은 재료를 써서 <b>새 장비</b>를 만듭니다. <b>강화</b>는 이미 가진 무기·방어구의 <b>기본 성능</b>을 올립니다. <b>합성</b>은 여러 개의 재료를 모아 <b>한 단계 높은 재료</b>로 바꿉니다.<br><br>새 종류의 장비가 필요하면 제작 목록을, 지금 쓰는 장비의 성능을 높이려면 강화 화면을 확인합니다. 합성은 장비를 바꾸거나 장비 옵션을 다시 뽑는 기능이 아닙니다.",
        en: "<b>Smith</b> spends materials to make <b>new gear</b>. <b>Upgrade</b> improves the <b>base performance</b> of a weapon or armor you already own. <b>Combine</b> turns several materials into <b>the next material grade</b>.<br><br>Check Smith when you need a new gear type, or Upgrade to improve gear you already use. Combining does not alter equipment or reroll its options.",
    },
    'help.forge.smith.title': {
        ko: "새 장비 제작",
        en: "Smithing new gear",
    },
    'help.forge.smith.body': {
        ko: "<b>[제작]</b>에서 부위와 열린 제작 레벨을 고릅니다. 목록에서 만들 장비의 종류를 확인한 뒤 그 줄의 <b>[만들기]</b>를 누릅니다. 결과는 현재 보고 있는 부대 인벤토리에 들어가므로 빈 칸이 필요합니다.<br><br>고른 종류와 아이템 레벨로 장비 하나가 나오며, <b>희귀도와 옵션은 새로 정해집니다</b>. 같은 것을 여러 번 만들어도 같은 옵션을 보장하지 않습니다. 현재 제작은 골드·부위 재료·가루를 쓰며 기존 장비를 소모하지 않습니다.<br><br>무기와 장신구 제작은 철광석, 방어구 제작은 목재를 사용합니다. 더 높은 제작 레벨은 대장간 랭크가 엽니다. 필요한 재료와 수량은 제작 줄의 비용 표시에서 확인합니다.",
        en: "In <b>Smith</b>, choose an equipment slot and an unlocked level. Find the gear type you want, then press <b>Make</b> on that row. The result enters the party inventory you are viewing, so it needs a free slot.<br><br>Each craft produces one item of the selected type and level, with <b>newly rolled rarity and options</b>. Repeated crafts do not guarantee identical options. Current smithing consumes gold, the slot's material and dust, without consuming existing equipment.<br><br>Weapons and jewelry use iron ore; armor pieces use timber. Blacksmith ranks unlock higher smithing levels. Check the row's cost display for exact materials and amounts.",
    },
    'help.forge.potions.title': {
        ko: "물약 만들기와 재고",
        en: "Brewing and stocking potions",
    },
    'help.forge.potions.body': {
        ko: "<b>[제작]</b>에서 물약 그림을 누릅니다. 물약별 회복량·보유 재고·골드와 약초 비용을 확인하고 <b>[만들기]</b>하면 그 물약 재고가 하나 늘어납니다. 물약 제작에는 실패나 무작위 옵션이 없습니다.<br><br>만들 수 있는 물약 단계는 대장간 랭크가 엽니다. 재고는 여러 Party가 함께 쓰며, 편성에서 물약 칸을 채워도 그때 바로 소모되지는 않습니다. 전투에서 마신 만큼 줄어드므로 자동 원정을 계속할 때는 재고를 확인합니다. 물약 종류·순서·사용 HP 기준은 편성 탭에서 정합니다.",
        en: "Select the potion icon in <b>Smith</b>. Check healing, owned stock, and gold and herb costs, then use <b>Make</b> to add one potion. Brewing cannot fail and does not roll random options.<br><br>Blacksmith ranks unlock brewable tiers. All Parties share stock. Filling preset slots does not spend it immediately; drinking in combat does. Check supplies when running repeated expeditions. Set potion types, order and drinking HP threshold in Party.",
    },
    'help.forge.upgrade.title': {
        ko: "가진 장비 강화",
        en: "Upgrading owned gear",
    },
    'help.forge.upgrade.body': {
        ko: "왼쪽 착용 장비나 아래 인벤토리·창고의 장비를 눌러 강화 대상을 고릅니다. 대장간에서 장비를 누르는 것은 <b>장착이 아니라 대상 선택</b>입니다. <b>[강화]</b>에서 다음 효과·성공 확률·골드와 재료 비용을 확인합니다.<br><br>강화는 무기의 피해 범위와 방어구의 방어력 같은 <b>기본 성능</b>을 올립니다. 붙어 있던 죄종·옵션 조합을 바꾸거나 옵션 값을 다시 뽑지 않습니다. 목걸이와 반지는 강화할 수 없으며, 상한은 대장간 랭크에 따라 늘어납니다.<br><br>성공하면 강화 단계가 하나 오릅니다. <b>실패해도 골드와 재료는 소모</b>되지만 장비가 파괴되거나 단계가 내려가지는 않습니다. 착용 중인 장비와 창고 장비도 강화할 수 있습니다.",
        en: "Click worn gear on the left, or gear in inventory or stash below, to select a target. Clicking gear here <b>selects it rather than equipping it</b>. In <b>Upgrade</b>, check the next effect, success chance, and gold and material costs.<br><br>Upgrades raise <b>base performance</b>, such as weapon damage or armor defense. They do not change the existing Sins, option combination or rolled option values. Amulets and rings cannot be upgraded. Blacksmith ranks can raise the cap.<br><br>Success adds one upgrade level. <b>Failure still spends gold and materials</b>, but never destroys the item or lowers its level. Both worn and stashed gear can be upgraded.",
    },
    'help.forge.combine.title': {
        ko: "재료를 한 단계 올리는 합성",
        en: "Combining the next material grade",
    },
    'help.forge.combine.body': {
        ko: "<b>[합성]</b>에서는 같은 재료의 바로 아래 단계와 골드를 써서 한 단계 높은 재료를 만듭니다. 예를 들어 최하급 철광석을 모아 하급 철광석으로 바꿉니다. 철광석을 약초로 바꾸는 식의 종류 교환은 아닙니다.<br><br><b>[합성]</b>은 한 개, <b>[최대]</b>는 현재 재료와 골드로 만들 수 있는 최대 수량을 만듭니다. 즉시 완료되고 실패하지 않습니다. 사용한 재료는 소모되며 아래 단계로 되돌리는 기능은 없습니다.<br><br>현재 제작·강화·물약·스킬북·연구가 소비하는 재료는 최하급입니다. 상위 단계 재료의 사용처는 아직 준비 중이므로, 재고를 전부 합성하기 전에 지금 필요한 최하급 재료를 남겨 둡니다.",
        en: "<b>Combine</b> uses the immediately lower grade of the same material and gold to make the next grade. For example, combine lowest-grade iron ore into low-grade iron ore. It does not exchange one material type for another, such as ore for herbs.<br><br><b>Combine</b> makes one; <b>Max</b> makes as many as your current materials and gold allow. Combining is immediate and cannot fail. Inputs are consumed and cannot be converted back to lower grades.<br><br>Smithing, upgrades, potions, skill books and research currently consume lowest-grade materials. Uses for higher grades are still coming later. Keep the lowest-grade materials you currently need before combining your stock.",
    },
    'help.forge.craft.title': {
        ko: "크래프트의 현재 상태",
        en: "Current Craft availability",
    },
    'help.forge.craft.body': {
        ko: "<b>[크래프트]</b>는 현재 준비 중입니다. 사용할 수 있는 작업은 <b>[제작] · [강화] · [합성]</b>입니다.",
        en: "<b>Craft</b> is currently coming later. Available operations are <b>Smith, Upgrade and Combine</b>.",
    },
    'help.library.basics.title': {
        ko: "도안 · 스킬북 · 전직의 차이",
        en: "Blueprints, books and advancement",
    },
    'help.library.basics.body': {
        ko: "<b>스킬 도안</b>은 책을 만드는 재료이고, <b>스킬북</b>은 영웅에게 읽혀 스킬을 배우거나 강화하는 소모품입니다. 흐름은 <b>도안 획득 → 스킬북 제작 → 영웅 선택 → 배우기·업그레이드</b>입니다.<br><br><b>전직</b>은 영웅의 성장 갈래를 정하는 별도 기능입니다. 책으로 채우는 '배운 스킬' 칸과 전직으로 채우는 '전직 스킬' 칸은 서로 다릅니다. 전직한다고 기존 고유 스킬이나 책으로 배운 스킬이 사라지지는 않습니다.",
        en: "A <b>skill blueprint</b> is an ingredient for making a book. A <b>skill book</b> is consumed by a hero to learn or improve a skill. Follow <b>get blueprint → craft book → choose hero → learn or upgrade</b>.<br><br><b>Advancement</b> is a separate choice of growth path for a hero. The learned-skill slot filled by a book and the Advance-skill slot are different. Advancing does not remove the hero's innate or book-learned skill.",
    },
    'help.library.craft.title': {
        ko: "도안으로 스킬북 만들기",
        en: "Turning a blueprint into a book",
    },
    'help.library.craft.body': {
        ko: "스킬 도안은 원정에서 얻거나 상점에서 구매합니다. 도서관의 스킬북 기능을 열면 <b>[스킬 북 제작]</b>에 가진 도안이 표시됩니다. 그림을 골라 비용을 확인하고 <b>[만들기]</b>합니다.<br><br>도안 한 장과 <b>{gold}G · 최하급 가루 {dust}개 · 최하급 약초 {herb}개</b>가 같은 스킬북 한 권이 됩니다. 도안도 소모되므로 한 번 얻었다고 무제한 제작이 열리는 것은 아닙니다. 같은 도안과 책은 여러 개 모을 수 있고, 장비 인벤토리 칸을 차지하지 않습니다.",
        en: "Obtain skill blueprints from Expeditions or the Shop. Once Library book features unlock, owned blueprints appear in <b>Skill Book Crafting</b>. Select an icon, check the cost and press <b>Craft</b>.<br><br>One blueprint plus <b>{gold}G, {dust} lowest-grade dust and {herb} lowest-grade herbs</b> produces one matching book. The blueprint is consumed; finding one does not unlock unlimited crafting. Blueprints and books can stack without taking equipment inventory slots.",
    },
    'help.library.learn.title': {
        ko: "읽힐 영웅을 고르고 배우기",
        en: "Choose a hero, then learn",
    },
    'help.library.learn.body': {
        ko: "위쪽 영웅 띠에서 책을 읽힐 영웅을 고르고, <b>[스킬 업그레이드]</b>에서 보유 책을 누릅니다. 영웅 레벨 <b>{level}</b>부터 사용할 수 있습니다. 새 스킬의 <b>[배우기]</b>는 책 한 권을 쓰고 그 영웅의 '배운 스킬' 칸을 채웁니다. 다른 영웅에게도 주려면 별도 책이 필요합니다.<br><br>이미 다른 스킬을 배웠으면 버튼이 <b>[덮어쓰기]</b>로 바뀝니다. 누르면 이전 스킬과 그 업그레이드는 사라지고 사용했던 책도 돌아오지 않습니다. 새 책의 효과와 필요한 무기를 먼저 확인합니다.<br><br>다른 직업의 책도 읽을 수 있지만, 무기의 힘을 쓰는 타격·회복·소환 스킬은 <b>그 스킬 직업의 무기</b>를 들어야 발동합니다. 배우는 것과 현재 장비로 사용할 수 있는 것은 별개입니다.",
        en: "Choose the hero who will read the book in the top strip, then select an owned book in <b>Skill Upgrade</b>. Heroes can use books from level <b>{level}</b>. <b>Learn</b> spends one book to fill that hero's learned-skill slot. Teaching another hero requires another copy.<br><br>If the hero already learned a different skill, the button becomes <b>Overwrite</b>. It removes the old skill and its upgrades without returning used books. Check the new skill's effect and weapon requirement first.<br><br>A hero can read another class's book, but weapon-powered attack, healing and summoning skills require <b>a weapon belonging to that skill's class</b>. Learning a skill does not guarantee that current equipment can cast it.",
    },
    'help.library.upgrade.title': {
        ko: "같은 스킬북으로 레벨 올리기",
        en: "Using matching books to raise a skill level",
    },
    'help.library.upgrade.body': {
        ko: "선택한 영웅의 <b>고유 스킬이나 이미 배운 스킬</b>과 같은 책을 고르면 새 스킬을 배우는 대신 그 스킬을 업그레이드합니다. 다른 액티브 칸이 추가되지는 않습니다.<br><br>버튼에 표시된 같은 책 수를 내면 레벨이 한 단계 오릅니다. 높은 단계일수록 더 많은 책이 필요하며, 책을 읽힐 때 골드·가루·약초를 다시 내지는 않습니다. 업그레이드는 <b>선택한 영웅의 해당 스킬</b>에만 적용됩니다. 전직 스킬은 책이 아니라 전직 포인트로 올립니다.",
        en: "Choose a book matching the selected hero's <b>innate or already-learned skill</b> to upgrade that skill instead of learning a new one. This does not add another active slot.<br><br>Spend the matching copies shown on the button to add one skill level. Higher steps require more books, without another gold, dust or herb charge for reading them. The upgrade affects <b>that skill on the selected hero</b>. Advance skills use Advance Points rather than books.",
    },
    'help.library.advance.title': {
        ko: "전직 갈래는 신중히 선택",
        en: "Choosing an advancement path",
    },
    'help.library.advance.body': {
        ko: "도서관에서 전직 기능을 열고 레벨 <b>{level}</b> 이상인 영웅을 고릅니다. 해당 직업의 세 갈래와 스킬을 비교한 뒤 하나를 선택하고 <b>[전직]</b>합니다. 현재 비용은 <b>{gold}G</b>이며 지불하면 즉시 완료됩니다.<br><br><b>전직 갈래 자체는 되돌릴 수 없습니다.</b> 같은 갈래 안에서 배운 전직 스킬을 바꾸는 것은 가능하지만 다른 갈래로 전직을 다시 하는 것은 불가능합니다. 원정 중에도 전직할 수 있고, 탐험 중에는 먼저 돌아와야 합니다.<br><br>전직을 마친 뒤에는 <b>캐릭터 → [마스터리 열기] → 전직 트리</b>에서 전직 스킬을 직접 배웁니다. 전직 버튼만 누른 상태와 전직 스킬을 배운 상태는 다릅니다.",
        en: "Unlock advancement in the Library and select a hero of at least level <b>{level}</b>. Compare the class's three paths and their skills, choose one and press <b>Advance</b>. It currently costs <b>{gold}G</b> and completes immediately on payment.<br><br><b>The advancement path cannot be undone.</b> You can change the learned skill within that path, but cannot switch the hero to another path. Heroes can advance during Expeditions; those exploring must return first.<br><br>After advancing, go to <b>Character → Open Mastery → advancement tree</b> and learn an Advance skill. Completing advancement alone does not learn one automatically.",
    },
    'help.library.points.title': {
        ko: "전직 포인트와 스킬 되돌리기",
        en: "Advance Points and skill refunds",
    },
    'help.library.points.body': {
        ko: "전직 포인트는 <b>전직 가능 레벨에서 첫 포인트, 그 뒤 {interval}레벨마다 추가 포인트</b>를 받는 기준입니다. 늦게 전직해도 현재 레벨에 해당하는 포인트를 받습니다. 마스터리 포인트와는 별도로 사용합니다.<br><br>전직 트리의 세 스킬 중 <b>하나</b>를 첫 포인트로 배우면 전직 액티브 칸에 들어갑니다. 남은 포인트로 그 스킬의 레벨을 올릴 수 있습니다.<br><br>배운 전직 스킬을 우클릭해 되돌리면 배우기와 레벨에 투자한 포인트를 모두 돌려받습니다. 같은 갈래의 다른 스킬을 골라 다시 배울 수 있습니다. <b>전직 갈래와 전직할 때 낸 골드는 그대로이고, 스킬에 쓴 포인트만 환급</b>됩니다. 특수·변형·필살기 가지는 현재 준비 중입니다.",
        en: "Advancement points are based on <b>one point at the advancement unlock level, then another every {interval} levels</b>. Advancing later still gives the points due at your current level. These are separate from mastery points.<br><br>Spend the first point to learn <b>one</b> of the three skills in the advancement tree and fill the Advance active slot. Spend remaining points to raise that skill's level.<br><br>Right-click the learned advancement skill to refund every point spent on learning and leveling it. You can then learn another skill in the same path. <b>The advancement path and its gold cost stay in place; only skill points are refunded.</b> Special, Variant and Ultimate branches are currently coming later.",
    },
    'help.resource.lines.title': {
        ko: "줄 · 지점 · 랭크의 차이",
        en: "Lines, nodes and ranks",
    },
    'help.resource.lines.body': {
        ko: "연구소의 <b>줄</b>은 자원·수색·훈련·도박장처럼 자동으로 얻는 것의 분야입니다. <b>지점</b>은 그 줄의 생산량·간격·품질·등록 칸 등을 올리는 연구 항목입니다.<br><br>왼쪽 <b>줄 카드</b>를 누르면 오른쪽에 생산량과 등록 효과가 나옵니다. 동그란 <b>지점</b>을 누르면 현재 값·다음 효과·비용·연구 시간을 볼 수 있습니다. 연구소의 위쪽 영웅 띠는 현황을 보는 자리이며, 실제 등록은 줄 카드의 얼굴이나 <b>+</b>에서 합니다.<br><br>잠긴 지점은 필요한 건물·랭크부터 갖춰야 합니다. <b>건설</b>에서 연구소 랭크를 올리면 새 지점이 열리고, 이 화면의 <b>연구</b>로 열린 지점의 레벨을 올립니다.",
        en: "A Laboratory <b>line</b> is a field of automatic output: Resources, Search, Training or Gambling Den. A <b>node</b> is research that improves a line's output, interval, quality, assignment seats or another property.<br><br>Select a <b>line card</b> on the left to see output and hero bonuses on the right. Select a round <b>node</b> for its current value, next effect, cost and research time. The hero strip at the top shows assignments; open an actual assignment from a line's portrait or <b>+</b>.<br><br>Locked nodes need the shown building or rank first. Raise Laboratory ranks in <b>Construction</b> to open nodes, then use <b>Research</b> here to raise their levels.",
    },
    'help.resource.production.title': {
        ko: "자동 생산과 게임을 닫은 동안",
        en: "Automatic output and time away",
    },
    'help.resource.production.body': {
        ko: "창고를 지으면 연구소의 <b>자원 줄</b>이 열립니다. 영웅을 등록하지 않아도 <b>최하급 철광석·약초·목재를 모두</b> 생산합니다. 등록은 생산을 시작하는 조건이 아니라 더 빠르게 얻는 보너스입니다.<br><br>자원 줄의 <b>채광·채집·벌목</b> 연구는 각각 철광석·약초·목재 생산량을 높입니다. 무기나 건물이 필요하면 철광석, 방어구나 건물이 필요하면 목재, 물약·책·약초 비용 연구가 필요하면 약초를 확인합니다. 생산물은 재고에 자동으로 더해집니다.<br><br>게임을 켜 둔 동안에는 계속 생산합니다. 꺼 둔 동안의 재료·훈련·도박장 수익은 <b>{hours}시간분을 기준으로 제한해 계산</b>하므로, 비운 시간 전부가 무제한 쌓이지 않습니다. 수색의 도착 시계는 이 시간 상한을 받지 않고 대기 칸이 찰 때까지 흐릅니다.",
        en: "Building Storage opens the Laboratory's <b>Resources line</b>. It produces <b>lowest-grade iron ore, herbs and timber together</b> without assigned heroes. Assignment improves output; it is not required to start production.<br><br><b>Mining, Gathering and Logging</b> research raise ore, herb and timber output respectively. Check ore for weapons or buildings, timber for armor or buildings, and herbs for potions, books or research with an herb cost. Output enters stock automatically.<br><br>Production continues while the game is open. Offline materials, Training and Gambling Den income are <b>limited using a {hours}h calculation window</b>; time away does not accumulate without limit. The Search arrival timer has no such time cap and continues until its waiting slots fill.",
    },
    'help.resource.materials.title': {
        ko: "재료는 어디서 얻고 어디에 쓰나요?",
        en: "Where materials come from and go",
    },
    'help.resource.materials.body': {
        ko: "<b>철광석</b>은 연구소 채광과 무기 분해로 얻습니다. 무기·장신구 제작, 무기 강화, 건설에 씁니다. <b>목재</b>는 연구소 벌목과 방어구 분해로 얻으며, 방어구 제작·강화와 건설에 씁니다.<br><br><b>약초</b>는 연구소 채집과 반지·목걸이 분해로 얻습니다. 물약·스킬북 제작과 약초가 표시된 연구에 씁니다. <b>가루</b>는 장비를 분해해 얻고, 장비 제작·강화와 스킬북 제작에 씁니다. 도박장도 표시된 재료를 지급할 수 있습니다.<br><br>원정에서는 적 처치가 재료를 직접 떨어뜨리는 대신, <b>떨어진 장비를 분해</b>해 재료를 얻습니다. 재료는 공용이며 창고의 <b>재료</b> 탭에서 수량을 확인할 수 있습니다.<br><br><b>종류</b>와 <b>단계</b>를 구분합니다. 철광석·목재·약초·가루가 종류이고, 최하급·하급·중급·상급·최상급이 단계입니다. 현재 소비처는 최하급을 쓰며, 높은 단계는 대장간 <b>[합성]</b>으로 만듭니다. 재료가 있어도 요구 단계와 다르면 비용을 채우지 못합니다.",
        en: "<b>Iron ore</b> comes from Laboratory Mining and weapon salvage. It funds weapon and jewelry smithing, weapon upgrades and construction. <b>Timber</b> comes from Logging and armor salvage, and funds armor smithing, upgrades and construction.<br><br><b>Herbs</b> come from Gathering and salvaging rings or amulets. They fund potions, skill books and research that lists an herb cost. <b>Dust</b> comes from salvaged gear and funds smithing, equipment upgrades and skill books. Gambling can also award the materials shown on its paytable.<br><br>Expedition enemies do not directly drop these materials. Obtain them by <b>salvaging the gear they drop</b>. Material stock is shared; view quantities in the stash's <b>Materials</b> tab.<br><br>Distinguish <b>type</b> from <b>grade</b>. Ore, timber, herbs and dust are types. Lowest, low, mid, high and top are grades. Current costs use lowest-grade stock; make higher grades with <b>Combine</b> at the Blacksmith. Owning a different grade does not satisfy a cost.",
    },
    'help.resource.research.title': {
        ko: "연구 시작 · 완료 · 그만두기",
        en: "Starting, finishing and canceling research",
    },
    'help.resource.research.body': {
        ko: "지점을 고르고 <b>현재 → 다음 레벨의 값</b>을 비교합니다. 비용과 시간을 확인해 <b>[연구]</b>하면 골드와 표시된 재료를 먼저 지불합니다. 연구소 전체에서 <b>한 번에 하나</b>만 진행합니다.<br><br>연구는 게임을 닫아도 예정된 시각에 완료되며, 완료 뒤부터 새 효과가 적용됩니다. 다음 연구가 자동으로 예약되지는 않습니다. 진행 중인 생산은 연구 때문에 멈추지 않습니다.<br><br>완료 전 <b>[그만두기]</b>를 누르면 비용을 전부 돌려받고 그 연구의 진행도는 사라집니다. 이미 끝난 지점 레벨은 이 버튼으로 되돌리지 못합니다. 그 줄의 영웅 등록 효과를 먼저 갖추면 <b>연구 시작 시점</b>의 시간과 비용에 반영됩니다.",
        en: "Select a node and compare its <b>current and next-level values</b>. Check the cost and time, then press <b>Research</b> to pay gold and the listed materials up front. The entire Laboratory can run <b>one project at a time</b>.<br><br>Research finishes at its scheduled time even while the game is closed; its new effect applies after completion. No next project is queued automatically. Existing production continues during research.<br><br>Use <b>Cancel</b> before completion to recover the full cost and lose that project's progress. Completed levels cannot be refunded this way. Assigning heroes to that line first affects the cost and duration calculated <b>when research starts</b>.",
    },
    'help.resource.assignment.title': {
        ko: "영웅 등록과 칸의 차이",
        en: "Hero assignment and the two slot types",
    },
    'help.resource.assignment.body': {
        ko: "줄 카드의 영웅 얼굴이나 <b>+</b>를 누르면 등록 창이 열립니다. 영웅을 눌러 그 줄에 등록하고, 같은 영웅을 다시 누르면 해제합니다. 다른 줄에 등록된 영웅을 고르면 이 줄로 이동합니다. <b>한 영웅은 한 줄</b>에만 등록할 수 있습니다.<br><br>연구소 등록은 영웅을 붙잡지 않습니다. 등록한 채로 Party에 넣거나 원정·탐험·전직을 진행할 수 있습니다. 다만 훈련 경험치는 <b>훈련 줄에 등록한 영웅</b>만 받습니다.<br><br><b>등록 칸</b>은 연구소 줄에 효과를 보탤 내 영웅의 자리입니다. <b>대기 칸</b>은 선술집에서 고용을 기다리는 후보의 자리입니다. 수색 줄에 영웅을 더 등록하고 싶을 때와 새 후보를 더 보관하고 싶을 때는 서로 다른 지점을 연구합니다.",
        en: "Select a line's hero portrait or <b>+</b> to open assignments. Click a hero to assign them and click them again to remove them. Selecting a hero assigned elsewhere moves them to this line. <b>Each hero can be assigned to only one line at a time</b>.<br><br>Assignment does not occupy the hero. They can stay assigned while joining a Party, fighting Expeditions, exploring or advancing. Training XP, however, goes only to <b>heroes assigned to Training</b>.<br><br><b>Seats</b> hold your heroes who boost a Laboratory line. <b>Waiting Slots</b> hold candidate heroes awaiting hire in the Tavern. Research different nodes to assign more heroes to Search and to keep more arriving candidates.",
    },
    'help.resource.hero_effects.title': {
        ko: "등록할 영웅을 고르는 기준",
        en: "Choosing heroes to assign",
    },
    'help.resource.hero_effects.body': {
        ko: "<b>힘</b>은 그 줄의 생산·도착·훈련 속도를 높이고, <b>운</b>은 대박 지점이 있는 줄의 추가 지급 확률을 높입니다. <b>지능</b>은 그 줄의 연구 시간을 줄이며, <b>민첩</b>은 연구 비용을 줄입니다. <b>매력</b>은 수색의 레어 후보 확률을 높입니다.<br><br><b>건강</b>은 같은 줄에 오래 등록할수록 쌓이는 숙련 보너스를 키웁니다. <b>통솔</b>은 같은 줄의 다른 등록 영웅 효과를 높이므로 여럿을 등록할 때 의미가 있습니다. 장비·레벨 대신 영웅의 기본 능력치가 이 효과의 재료입니다.<br><br>등록 효과의 현재 수치는 줄 카드를 눌러 확인합니다. 해당 효과를 사용하지 않는 줄에는 적용되지 않습니다. 영웅을 다른 줄로 옮기거나 등록을 풀면 그 영웅의 숙련 시간은 다시 시작하므로, 비교한 뒤 자리를 정합니다.",
        en: "<b>Strength</b> improves that line's production, arrival or training speed. <b>Luck</b> raises extra-output chance on lines with a Jackpot node. <b>Intelligence</b> shortens that line's research time; <b>Agility</b> lowers research costs. <b>Charisma</b> raises Search's Rare-candidate chance.<br><br><b>Vitality</b> strengthens the proficiency bonus that builds while a hero remains assigned to the same line. <b>Leadership</b> boosts other assigned heroes on that line, so it matters with multiple heroes. These effects use the hero's base attributes rather than equipment or level.<br><br>Select the line card to check current hero bonuses. Effects do not apply to lines that have no use for them. Moving or removing a hero resets the time accumulated on that assignment, so compare heroes before settling their positions.",
    },
    'help.resource.jobs.title': {
        ko: "수색 · 훈련 · 자동 골드",
        en: "Search, Training and automatic gold",
    },
    'help.resource.jobs.body': {
        ko: "<b>수색</b>은 [간격] 첫 연구를 완료해야 실제 도착을 시작합니다. 선술집의 대기 칸이 차면 멈추고, 비우면 남은 시간부터 다시 시작합니다. [품질]은 레어 후보 확률, [대기 칸]은 보관할 후보 수를 늘립니다.<br><br><b>훈련</b> 줄에 등록한 영웅은 시간이 흐르면서 경험치를 받아 로스터의 선두 레벨을 따라갑니다. 상한은 <b>로스터 최고 레벨 − [범위]에 표시된 차이</b>입니다. 범위를 연구하면 그 차이가 줄어듭니다. 상한 이상인 영웅은 훈련 경험치를 받지 않으므로, 최고 레벨을 앞서 올리는 일은 원정에서 합니다.<br><br><b>도박장 줄</b>은 선술집의 도박장을 열면 자동으로 골드를 생산합니다. 판돈을 걸거나 스핀을 누를 필요가 없습니다. [수익]은 생산량, [대박]은 한 번 더 지급받을 확률을 높입니다. 선술집 슬롯을 직접 돌리는 것과 별개입니다.",
        en: "<b>Search</b> starts real arrivals after its first Interval research completes. Full Tavern waiting slots pause it; freeing a slot resumes the remaining wait. Quality raises Rare chance, and Waiting Slots adds candidate capacity.<br><br><b>Training</b> helps assigned heroes catch up toward the roster's leading level. Its cap is <b>the highest roster level minus the gap shown by Range</b>. Research Range to reduce that gap. Heroes at or above the cap gain no Training XP, so Expeditions must push the leading level forward.<br><br>The <b>Gambling Den line</b> automatically produces gold once the Tavern's Gambling Den is unlocked. It needs no stake or spin button. Income raises output, while Jackpot raises the chance of an extra payout. This is separate from manually playing Tavern slots.",
    },
    'help.colosseum.prepare.title': {
        ko: "결투장에서 파티 시험하기",
        en: "Testing your party in the Arena",
    },
    'help.colosseum.prepare.body': {
        ko: "결투장은 정해진 영웅 팀을 상대로 한 층씩 도전하는 곳입니다. 원정에서 맞춘 장비와 편성이 영웅 팀끼리의 전투에서는 어떤지 시험할 수 있습니다. 챕터 진행과 별개이므로 원정을 진행하다가 원하는 때 도전해도 됩니다.<br><br>사용할 Party를 고르고 영웅 {duelSize}명을 채운 뒤 열린 층을 선택합니다. [편성 수정]은 편성 탭으로 이동하는 버튼입니다. 거기서 인원·전열/후열·물약·파티 전술을 준비한 뒤 결투장으로 돌아옵니다. 상대 카드에서 장비와 스킬을 살펴보고 [도전]을 누르면 한 판의 자동전투가 시작됩니다.",
        en: "The Arena lets you challenge fixed hero teams one floor at a time. It is a place to test how the equipment and formations you built during Expeditions perform against another hero team. It is separate from chapter progress, so you can challenge it whenever you choose.<br><br>Choose a Party, fill all {duelSize} hero slots and select an open floor. Edit party takes you to the Party tab. Prepare members, front/back rows, potions and tactics there, then return to the Arena. Inspect the enemy cards for gear and skills, and press Challenge to start one automatic battle.",
    },
    'help.colosseum.floors.title': {
        ko: "층과 승급전",
        en: "Floors and promotion bouts",
    },
    'help.colosseum.floors.body': {
        ko: "처음에는 첫 층만 열립니다. 열린 가장 높은 층을 이기면 다음 층이 열리고, 이미 깬 층은 언제든 다시 도전할 수 있습니다. 각 층은 같은 AI 팀을 사용하며 높은 층일수록 상대의 레벨 · 장비 · 스킬이 강해집니다. 등급의 마지막 층은 <b>승급전</b>이며, 이기면 그 등급의 휘장을 받습니다.<br><br>져도 열린 층이나 휘장을 잃지 않습니다.",
        en: "Only the first floor is initially open. Beat the highest open floor to unlock the next; cleared floors remain available to retry. Each floor uses a fixed AI team, with higher floors bringing stronger levels, gear and skills. A tier's last floor is a <b>promotion bout</b>; winning earns its emblem. Losing does not remove unlocked floors or emblems.",
    },
    'help.colosseum.retry.title': {
        ko: "같은 층에서 막혔다면",
        en: "When a floor stops your progress",
    },
    'help.colosseum.retry.body': {
        ko: "같은 층에는 같은 상대 편성이 나옵니다. 관전에서 누가 먼저 쓰러지는지, 어떤 적 스킬에 큰 피해를 받는지 살펴본 뒤 장비나 진형을 바꾸어 다시 도전합니다. 한 가지씩 바꾸면 어떤 준비가 도움이 되었는지 비교하기 쉽습니다.<br><br>빈 영웅 자리 때문에 [도전]이 꺼져 있다면 선택한 Party에 {duelSize}명을 채웁니다. 전술 효과와 물약은 우리 팀 아래에 표시된 내용을 확인합니다. 레벨이나 장비가 부족하다면 원정·고용·제작으로 파티를 키운 뒤 돌아와도 이미 깬 층과 휘장은 남습니다.",
        en: "A floor keeps the same opposing lineup. Watch who falls first and which enemy skills deal the most damage, then change equipment or formation and try again. Changing one thing at a time makes it easier to compare what helped.<br><br>If Challenge is disabled because hero slots are empty, fill the selected Party with {duelSize} heroes. Check the tactics and potions shown below your team. You can return to Expeditions, hiring or crafting to improve the party; cleared floors and earned emblems remain when you come back.",
    },
    'help.colosseum.rules.title': {
        ko: "두 결투 콘텐츠의 공통 규칙",
        en: "Rules shared by both duel modes",
    },
    'help.colosseum.rules.body': {
        ko: "결투장과 콜로세움은 내 영웅의 능력치·장비·스킬에 선택한 Party의 파티 전술과 물약을 더해 한 판을 겨룹니다. 도감 보너스는 적용되지 않아 원정에서 본 전투 수치와 달라질 수 있습니다. 상대 팀은 파티 전술과 물약을 사용하지 않습니다. 제한시간 안에 승부가 나지 않으면 무승부입니다.<br><br>물약은 보유 재고에서 채울 수 있는 만큼 가져가며, 결투 중 마셔도 실제 재고는 줄지 않습니다. 결투에는 골드·재료 비용이 없고 장비나 도감 경험치 보상도 없습니다. 결투장의 층·휘장과 콜로세움의 레이팅·전적이 각각 진행 기록입니다.<br><br>결과는 [도전] 또는 [결투 시작]을 누를 때의 영웅과 장비·편성을 기준으로 정해집니다. 관전은 그 전투를 재생하는 화면입니다. 그 뒤 장비나 편성을 바꾸면 다음 결투부터 반영되며, 관전을 닫아도 이미 기록된 결과는 유지됩니다.",
        en: "Arena and Colosseum duels use your heroes' attributes, gear and skills plus the selected Party's tactics and potions for one battle. Codex bonuses are excluded, so combat values can differ from those seen in Expeditions. Opponents have no party tactics or potions. Reaching the time limit ends in a draw.<br><br>Potions are filled from the stock you own, but drinking them in a duel does not reduce that stock. Duels cost no gold or materials and grant no equipment or Codex EXP. Arena floors and emblems, and Colosseum rating and records, track your progress in each mode.<br><br>The result is determined using the heroes, gear and Party configuration present when you press Challenge or Start duel. Spectating replays that battle. Later equipment or formation changes apply to the next duel, and leaving the replay keeps the result already recorded.",
    },
    'help.arena.rating.title': {
        ko: "레이팅과 리그 이해하기",
        en: "Understanding rating and leagues",
    },
    'help.arena.rating.body': {
        ko: "콜로세움은 승패에 따라 바뀌는 대전 점수인 레이팅을 올리는 곳입니다. 결투장이 층을 차례로 여는 방식이라면, 콜로세움에서는 내 점수 근처의 상대를 골라 겨룹니다. 현재 레이팅 상대는 점수에 맞는 장비와 스킬을 갖춘 AI 팀입니다.<br><br>선택한 Party의 영웅 {duelSize}명으로 겨루며, 승리하면 레이팅이 오르고 패배하면 내려갑니다. 나보다 높은 레이팅의 상대를 이길수록 더 많이 오르고, 그런 상대에게 질 때는 덜 내려갑니다. 무승부도 상대와의 점수 차이에 따라 레이팅이 바뀔 수 있습니다. 예를 들어 나보다 높은 점수의 상대와 비기면 레이팅이 오를 수 있습니다.<br><br>리그는 레이팅 구간의 이름입니다. 왼쪽 리그표에서 다음 등급의 문턱을 확인할 수 있으며, 문턱에 도달하면 표시되는 리그가 바뀝니다. 레이팅과 리그는 이 콘텐츠의 기록이며 영웅의 레벨이나 원정 장비를 직접 올리지는 않습니다.",
        en: "The Colosseum tracks rating: a duel score that changes with wins, draws and losses. The Arena opens floors in order, while the Colosseum lets you choose opponents near your score. Current rated opponents are AI teams with equipment and skills suited to their rating.<br><br>Fight with the {duelSize} heroes in your chosen Party. Wins raise rating and losses lower it. Beating a higher-rated opponent gains more, while losing to one costs less. A draw can also change rating depending on the difference between your scores. For example, drawing against a higher-rated opponent can raise your rating.<br><br>A league is the name of a rating range. Check the league table on the left for the next threshold; crossing it changes your displayed league. Rating and leagues track progress in this mode and do not directly raise hero levels or Expedition equipment.",
    },
    'help.arena.opponents.title': {
        ko: "상대 후보를 고르는 순서",
        en: "Choosing an opponent",
    },
    'help.arena.opponents.body': {
        ko: "왼쪽 후보는 내 레이팅보다 낮은 팀, 비슷한 팀, 높은 팀입니다. 카드의 +는 이겼을 때 오르는 점수이고 −는 졌을 때 잃는 점수입니다. 낮은 상대는 예상 승리 점수가 작고, 높은 상대는 예상 승리 점수가 큽니다. 점수뿐 아니라 상대 직업·스킬과 내 파티가 잘 맞는지도 함께 살펴봅니다.<br><br>후보를 누르면 오른쪽에 그 팀이 나옵니다. 내 Party와 아래 물약·전술을 확인한 뒤 [결투 시작]을 누릅니다. [새 상대]는 후보 목록을 새로 고르는 버튼이며 결투를 시작하지 않습니다. 레이팅 결투를 마치면 후보가 새로 나옵니다. 결과와 레이팅은 전투를 시작하는 순간 기록되므로 관전을 닫아도 바뀐 점수는 남습니다.",
        en: "The candidates on the left are below, near and above your rating. A card's + shows the points gained for a win, and − shows the points lost for a defeat. Lower-rated opponents offer smaller winning gains; higher-rated opponents offer larger ones. Also inspect their classes and skills to judge how your party matches up.<br><br>Select a candidate to reveal that team on the right. Check your Party and the potions and tactics below it, then press Start duel. New opponents refreshes the candidate list without starting a fight. Candidates also refresh after a rated duel. The result and rating are recorded when the fight starts, so leaving the replay keeps the changed score.",
    },
    'help.arena.friendly.title': {
        ko: "친선전과 팀 코드 교환",
        en: "Friendly duels and team codes",
    },
    'help.arena.friendly.body': {
        ko: "친선전은 다른 사람이 공유한 팀 구성을 상대로 연습하는 방식입니다. [친선전] 창에서 [코드 만들기]를 누르면 선택한 Party의 영웅 {duelSize}명과 그때의 장비·스킬·진형을 글자로 된 팀 코드에 담습니다. [복사]로 코드를 공유할 수 있습니다. 이후 장비나 편성을 바꾼 모습을 공유하려면 코드를 다시 만듭니다.<br><br>받은 코드를 오른쪽 칸에 전부 붙여넣고 [불러오기]를 누릅니다. 검사에 통과하면 창이 닫히고 받은 팀이 친선전 상대로 표시됩니다. 그 팀을 확인한 뒤 [결투 시작]으로 겨룹니다. 불러오기에 실패하면 표시된 사유를 확인하고 코드를 빠짐없이 복사했는지 살펴봅니다.<br><br>팀 코드는 연습 상대를 불러오는 것으로, 내 로스터에 영웅이나 장비를 추가하지 않습니다. 코드에는 파티 전술과 물약이 포함되지 않습니다. 친선전 결과는 레이팅과 레이팅 전적에 영향을 주지 않습니다.",
        en: "Friendly duels let you practice against a team shared by someone else. In Friendly, press Make code to package the selected Party's {duelSize} heroes and their current gear, skills and formation as a text team code. Use Copy to share it. Make a new code whenever you want to share later equipment or formation changes.<br><br>Paste the entire received code into the right-hand box and press Load. If it passes the check, the window closes and the imported team appears as a Friendly opponent. Inspect that team, then press Start duel. If loading fails, read the displayed reason and check that the whole code was copied.<br><br>A team code loads a practice opponent; it does not add heroes or equipment to your roster. Codes do not include party tactics or potions. Friendly results do not affect rating or rated win/draw/loss records.",
    },
    'help.arena.results.title': {
        ko: "전적과 원정의 관계",
        en: "Records and Expeditions",
    },
    'help.arena.results.body': {
        ko: "전투 준비와 물약·도감 적용은 결투장의 공통 규칙을 따릅니다. 결투를 해도 원정 스테이지나 도감 경험치가 진행되지는 않으며, 콜로세움에는 별도의 장비·골드 보상이 없습니다.<br><br>현재 레이팅, 최고 레이팅, 레이팅 결투의 승·무·패는 자동 저장됩니다. 이미 고른 상대와 지난 전투 결과의 화면 표시는 다시 접속하면 새로 시작됩니다. 전적이 남는 것과 이전 관전을 다시 여는 것은 서로 다릅니다.",
        en: "Battle preparation, potions and Codex bonuses follow the shared rules in the Arena section. A duel does not advance Expedition stages or Codex EXP, and the Colosseum has no separate equipment or gold rewards.<br><br>Current rating, best rating and rated wins, draws and losses are saved automatically. Selected opponents and the last-battle display reset when you return. A saved record does not mean the previous replay remains available.",
    },
    'help.codex.monsters.title': {
        ko: "몬스터 살펴보기와 도감 경험치",
        en: "Inspecting monsters and Codex EXP",
    },
    'help.codex.monsters.body': {
        ko: "몬스터에서 챕터를 고르면 지역별 몬스터의 모습·분류·스킬과 도감 진행을 살펴볼 수 있습니다. 아직 원정에서 열지 못한 지역도 여기서 미리 볼 수 있습니다. 몬스터 카드를 가리키면 이야기와 단계 보상, 스킬 그림을 가리키면 스킬 효과가 나옵니다. 일반/정예 고르개는 여기서 보는 초상만 바꾸며 같은 몬스터의 도감 경험치를 따로 나누지는 않습니다.<br><br>도감 경험치는 영웅을 레벨업시키는 경험치와 별도로, 몬스터마다 쌓이는 처치 기록입니다. 원정에서 이긴 라운드의 처치가 정산될 때 들어오며 진 라운드나 도중에 철수한 라운드의 처치는 포함되지 않습니다. 처치당 도감 경험치는 {per}입니다.",
        en: "Choose a chapter under Monsters to inspect each area's monsters, classifications, skills and Codex progress. You can preview areas you have not yet unlocked in Expeditions. Hover a monster card for its story and milestone rewards, or a skill icon for its effect. The Normal/Elite selector changes the displayed portrait; it does not split that monster's Codex EXP into separate tracks.<br><br>Codex EXP is a separate record for each monster, apart from the XP that levels up heroes. It is awarded when kills from a won Expedition round are settled. Kills from lost rounds or rounds abandoned partway through do not count. Codex EXP per kill is {per}.",
    },
    'help.codex.classification.title': {
        ko: "종족 · 부류 · 직업 읽기",
        en: "Reading race, family and class",
    },
    'help.codex.classification.body': {
        ko: "몬스터 카드의 분류는 종족·부류·직업을 나타냅니다. 종족은 일반·데몬·언데드, 부류는 군대·부족·거인·수호자·이형이며, 직업은 전사·궁수·기사·마법사·사제처럼 사용하는 스킬과 장비의 계열입니다. 예를 들어 고블린 척후병은 데몬 종족, 부족 부류, 궁수 직업입니다.<br><br>도감 Lv1·Lv2 보너스가 함께 적용되는 범위는 이 중 부류입니다. 부족 몬스터 하나의 보너스를 열면 다른 지역의 부족 몬스터를 상대할 때도 적용됩니다. 같은 데몬도 서로 다른 부류에 속할 수 있으므로 카드의 부류 이름으로 적용 범위를 확인합니다. 보스처럼 Lv1·Lv2 보너스가 없는 몬스터는 그 보너스를 주고받지 않습니다.",
        en: "Monster cards identify race, family and class. Races are Normal, Demon and Undead. Families are Army, Tribe, Giant, Guardian and Aberration. Class describes the monster's skills and equipment, such as Warrior, Archer, Knight, Mage or Priest. For example, a Goblin Scout is a Demon of the Tribe family with the Archer class.<br><br>Codex Lv1 and Lv2 bonuses are shared within a family. Unlocking a bonus from one Tribe monster also helps against Tribe monsters in other areas. Demons can belong to different families, so check the family name on each card for the bonus group. Monsters with no Lv1 or Lv2 bonuses, such as bosses, neither grant nor receive those family bonuses.",
    },
    'help.codex.race_traits.title': {
        ko: "종족에 따른 몸의 차이",
        en: "How race changes a monster's body",
    },
    'help.codex.race_traits.body': {
        ko: "일반 몬스터와 정예는 종족에 따라 기본 몸 특성이 달라집니다. 같은 직업이라도 최대 HP·재생·피해·방어·저항에서 차이가 날 수 있으므로 카드의 전투 수치와 사용하는 스킬을 함께 확인합니다. 이 종족 몸 보정은 보스나 두 결투 콘텐츠의 영웅 팀에는 적용되지 않습니다.<br><br>일반 종족은 물리 방어가 높고 원소 저항이 낮습니다. 물리 공격이 잘 통하지 않는다면 원소 피해를 주는 영웅과 스킬을 살펴봅니다.<br><br>데몬은 최대 HP와 HP 재생이 높지만 물리 방어가 낮습니다. 전투가 길어지며 상대 HP가 차오른다면 물리 화력과 받는 회복을 줄이는 효과를 검토합니다.<br><br>언데드는 최대 HP가 낮고 입히는 피해가 높습니다. 먼저 쓰러뜨릴 화력과 아군을 보호할 방어·피해 감소를 함께 준비합니다.",
        en: "Regular and Elite monsters have body traits determined by race. Even monsters with the same class can differ in maximum HP, regeneration, damage, defense and resistance, so inspect their combat values together with their skills. These racial body adjustments do not apply to bosses or hero teams in either duel mode.<br><br>Normal-race monsters have higher physical defense and lower elemental resistances. If physical attacks are struggling, inspect heroes and skills that deal elemental damage.<br><br>Demons have higher maximum HP and HP regeneration but lower physical defense. If their HP keeps recovering during a long fight, consider physical damage and effects that reduce healing received.<br><br>Undead have lower maximum HP and deal more damage. Prepare both the damage to defeat them quickly and protection such as defense or damage reduction for your heroes.",
    },
    'help.codex.family_formation.title': {
        ko: "군대 · 거인 · 수호자의 대열 효과",
        en: "Army, Giant and Guardian formation effects",
    },
    'help.codex.family_formation.body': {
        ko: "군대는 같은 라운드에 살아 있는 군대 몬스터가 {armyCount}마리 이상일 때 물리·원소 직격 피해가 증가합니다. 직격은 직접 맞히는 기본 공격과 공격 스킬이며, 고정 피해·중독·반사에는 이 증가가 붙지 않습니다. 살아 있는 군대 수를 조건 아래로 줄이면 증가가 끝납니다.<br><br>거인은 같은 라운드에서 다른 적이 모두 쓰러져 자기 혼자 남으면 물리·원소 직격 피해가 증가합니다. 거인이 몇 마리인지가 아니라 전체 적 중 혼자인지를 봅니다. 마지막 거인 한 마리를 상대할 때 더 강한 공격을 버틸 준비가 필요합니다.<br><br>수호자는 자신을 제외한 후열 동료가 받는 물리·원소 직격 피해를 줄입니다. 후열을 공격해도 피해가 잘 들어가지 않는다면 앞뒤에 살아 있는 수호자가 있는지 확인합니다. 후열을 지키는 수호자가 모두 쓰러지면 보호가 끝납니다.",
        en: "Army monsters deal more Physical and elemental direct-hit damage while at least {armyCount} Army monsters remain alive in the round. Direct hits include basic attacks and attacking skills; this increase does not apply to Fixed damage, Poison damage over time or reflection. Bring the living Army count below the requirement to end the increase.<br><br>A Giant deals more Physical and elemental direct-hit damage when every other enemy in the round has fallen and it stands alone. The condition checks all living enemies, not just other Giants. Prepare to withstand stronger attacks when the last enemy is a Giant.<br><br>A Guardian reduces Physical and elemental direct-hit damage taken by back-row allies other than itself. If attacks on the back row deal little damage, look for living Guardians in either row. Protection ends when no Guardian remains to cover those allies.",
    },
    'help.codex.family_pressure.title': {
        ko: "부족의 소환과 이형의 저항 감소",
        en: "Tribe summoners and Aberration resistance loss",
    },
    'help.codex.family_pressure.body': {
        ko: "부족을 상대할 때는 주술사의 소환 스킬을 살펴봅니다. 소환을 쓰는 주술사는 자신이 이끄는 무리에서 아직 나오지 않은 동료를 불러내거나 쓰러진 동료를 다시 일으킬 수 있습니다. 동료를 잡아도 계속 돌아온다면 소환하는 주술사를 확인하고, 그 주술사에게 닿는 공격이나 스킬을 준비합니다. 실제로 다시 부르는지는 카드의 스킬을 기준으로 확인합니다.<br><br>각 이형 몬스터를 그 라운드에서 처음 쓰러뜨릴 때 영웅 전원의 화염·냉기·전기·독 저항이 한 겹씩 낮아집니다. 같은 라운드 안에서 최대 {aberrationCap}겹까지 쌓이며 다음 라운드를 시작하면 사라집니다. 적 한 마리를 잡은 뒤 남은 적의 원소 공격이 더 아플 수 있습니다. 저항과 회복을 준비하고 원소 공격을 하는 적이 남아 있는지 함께 살펴봅니다.<br><br>종족과 부류의 효과는 몬스터의 직업·장비·스킬, 도감에서 얻는 보너스와 함께 작용합니다. 몬스터의 분류와 스킬을 읽어 대응을 고르고, 도감 보너스를 얻는 조건은 별도로 도감 경험치와 도서관 랭크에서 확인합니다.",
        en: "When facing Tribe monsters, inspect the shaman's Summon skill. A shaman using Summon can call in members of its own band that have not yet appeared or bring its fallen band members back. If defeated companions keep returning, identify the summoner and prepare attacks or skills that can reach it. Check its actual skills to see whether it can call the band back.<br><br>The first defeat of each Aberration in a round adds one layer of reduced Fire, Cold, Lightning and Poison resistance to every hero. Layers build to a maximum of {aberrationCap} within that round and clear when the next round begins. Remaining enemies' elemental attacks can hurt more after one enemy falls. Prepare resistance and healing, and watch which elemental attackers remain.<br><br>Race and family traits work alongside a monster's class, equipment and skills, as well as the bonuses you have earned in the Codex. Read classifications and skills to plan your response. Requirements for earning Codex bonuses are tracked separately through Codex EXP and Library rank.",
    },
    'help.codex.milestones.title': {
        ko: "도감 단계가 주는 보너스",
        en: "What Codex milestones grant",
    },
    'help.codex.milestones.body': {
        ko: "몬스터별 누적 도감 경험치가 {list}에 도달하면 차례로 Lv1~Lv4에 해당하는 기록을 채웁니다. 이미 얻은 단계의 효과는 이후 단계에도 유지됩니다.<br><br>Lv1은 같은 부류를 잡을 때 경험치·드롭·골드 등 보상을 늘리는 파밍 옵션을, Lv2는 같은 부류를 상대할 때 적용되는 전투 옵션을 엽니다. 어떤 옵션인지는 몬스터마다 다르며, 같은 부류의 여러 몬스터에서 연 보너스는 함께 적용됩니다. 보스 등 일부 몬스터에는 Lv1·Lv2 보너스가 없습니다.<br><br>Lv3에는 추가 효과가 없습니다. Lv4는 그 몬스터의 전투 옵션 하나를 모든 파티원에게 항상 더합니다. 각 단계의 구체적인 효과와 값은 몬스터 카드에서 확인합니다. 결투장과 콜로세움에는 도감 보너스가 적용되지 않습니다.",
        en: "Each monster fills its Lv1–Lv4 milestones as its cumulative Codex EXP reaches {list}. Effects already unlocked remain in place at later milestones.<br><br>Lv1 unlocks a farming option that improves rewards such as XP, drops or gold from that family. Lv2 unlocks a combat option used against the same family. The option varies by monster, and bonuses unlocked from different members of one family combine. Bosses and some other monsters have no Lv1 or Lv2 bonuses.<br><br>Lv3 adds no effect. Lv4 permanently adds one combat option from that monster to every party member. Inspect its card for the exact effects and values at each milestone. Codex bonuses do not apply in Arena or Colosseum duels.",
    },
    'help.codex.library_unlocks.title': {
        ko: "경험치는 찼는데 단계가 잠겨 있다면",
        en: "When a full milestone is still locked",
    },
    'help.codex.library_unlocks.body': {
        ko: "도감 경험치와 도감 단계 해금은 두 조건입니다. 몬스터를 잡아 필요한 경험치를 모으고, 도서관 랭크로 그 단계까지 열어야 효과가 적용됩니다. 잠긴 단계도 경험치는 계속 쌓이며 카드의 눈금은 회색으로 찰 수 있습니다.<br><br>예를 들어 다음 단계의 경험치를 이미 모았지만 그 단계에 자물쇠가 있다면, 눈금에 마우스를 올려 필요한 도서관 랭크를 확인합니다. 건설에서 그 랭크를 올리면 이미 채운 단계가 바로 적용됩니다. 같은 경험치를 다시 모을 필요는 없습니다.",
        en: "Codex EXP and milestone access are two requirements. You need both the monster's required EXP and the Library rank that opens that milestone before its effect applies. EXP keeps accumulating behind locked milestones, and their markers can fill in grey.<br><br>If you already have the EXP for the next milestone but it still shows a lock, hover its marker to see the required Library rank. Build that rank in Construction to apply the milestone already earned. You do not need to collect the same EXP again.",
    },
    'help.codex.art.title': {
        ko: "캐릭터 · 아이템",
        en: "Characters and items",
    },
    'help.codex.art.body': {
        ko: "<b>캐릭터</b>는 직업별 영웅 초상, <b>아이템</b>은 무기 · 방어구 · 물약의 그림과 목록을 모아 보여줍니다. 물약을 가리키면 효과를 확인할 수 있습니다. 초상 그림체 고르개는 실제 게임의 초상과 배경에도 적용되며 설정의 그림체 선택과 함께 저장됩니다.<br><br>도감에서 그림을 보는 것만으로 영웅이나 장비를 획득하지는 않습니다.",
        en: "<b>Characters</b> collects hero portraits by class, and <b>Items</b> lists weapon, armor and potion artwork. Hover potions to see their effects. The portrait style selector also changes portraits and backgrounds used in the game and shares its saved choice with Settings. Viewing artwork in the Codex does not grant heroes or equipment.",
    },
    'help.codex.skills.title': {
        ko: "배울 스킬과 마스터리 찾아보기",
        en: "Finding skills and mastery to learn",
    },
    'help.codex.skills.body': {
        ko: "스킬 목록은 일반 스킬과 전직 스킬을 직업·전직별로 보여줍니다. 스킬 그림에 마우스를 올려 효과와 필요한 무기를 확인합니다. 스킬북으로 만들 수 있는 일반 스킬에는 획득처와 레벨이 오를 때 좋아지는 항목도 표시됩니다. 원하는 스킬이 있다면 이 목록에서 도안의 획득처를 찾고, 얻은 도안으로 도서관에서 책을 제작할 수 있습니다.<br><br>도감에서는 스킬과 마스터리를 미리 살펴봅니다. 실제 책 제작·습득은 도서관에서, 마스터리 포인트 투자는 캐릭터의 [마스터리 열기]에서 합니다. 도감의 스킬 수치는 특정 영웅을 선택한 상태가 아니므로, 실제 영웅에게 적용되는 피해·회복량은 그 영웅의 스킬 설명에서도 확인합니다. 전직의 특수·변형·필살기 가지는 현재 준비 중입니다.",
        en: "The Skills list groups regular and advancement skills by class and advancement. Hover an icon to read its effect and weapon requirement. Regular skills that can become books also show sources and what improves per level. To pursue a skill, find its blueprint source here, then craft its book at the Library after obtaining the blueprint.<br><br>The Codex lets you preview skills and mastery. Craft and learn books at the Library, and spend mastery points through Open Mastery in Character. Codex skill details have no selected hero context, so check the skill on your actual hero for their damage or healing values. The Special, Variant and Ultimate advancement branches are currently coming later.",
    },
    'help.codex.effects.title': {
        ko: "이펙트 미리 보기",
        en: "Previewing effects",
    },
    'help.codex.effects.body': {
        ko: "<b>이펙트</b>에서 카드를 누르면 해당 스킬의 전투 연출을 재생합니다. 묶음의 ▶는 그 묶음을, <b>[전부 재생]</b>은 모든 효과를 재생합니다. 위쪽에서 그림체를 비교할 수 있으며, 도감의 미리 보기는 설정에서 스킬 이펙트를 꺼 둔 경우에도 재생됩니다.<br><br>도감에서 비교할 그림체를 고르는 것과 실제 전투 그림체를 고르는 설정은 별개입니다.",
        en: "Under <b>Effects</b>, select a card to play that skill's battle effect. A group's ▶ plays that group; <b>Play all</b> plays every effect. Compare art styles at the top. Codex previews play even when skill effects are disabled in Settings. Choosing a preview style here does not change the live battle style in Settings.",
    },
    'help.help.browse.title': {
        ko: "도움말에서 필요한 설명 찾기",
        en: "Finding the explanation you need",
    },
    'help.help.browse.body': {
        ko: "도움말의 주제별 폴더는 왼쪽 메뉴와 같은 순서입니다. 폴더를 누르면 그 주제의 설명만 열리고, 본문을 스크롤해 끝까지 읽을 수 있습니다. 폴더마다 읽던 위치를 기억하며 잠긴 탭의 설명도 미리 볼 수 있습니다.<br><br>검색창에 단어를 띄어 써 넣으면 모든 폴더의 제목·소제목·본문에서 그 단어가 모두 포함된 설명을 찾습니다. 결과가 있는 폴더를 골라 읽으며, 현재 폴더에 결과가 없으면 첫 결과 폴더가 열립니다. 검색어를 지우면 모든 폴더의 설명이 복구됩니다.<br><br>처음 시작했다면 처음 플레이하는 순서와 자주 쓰는 용어부터 읽습니다. 당장 막힌 일이 있다면 막혔을 때 확인할 곳에서 해결할 탭을 찾고, 그 탭의 자세한 설명으로 이어갑니다.",
        en: "Help folders follow the same order as the left menu. Select a folder to open only that topic, then scroll inside its text to read further. Each folder remembers your reading position. You can also read about tabs that are still locked.<br><br>Enter words separated by spaces in Search to find explanations across all folders whose titles, subheadings and text contain every word. Choose a folder with matches to read them. If the current folder has no matches, the first matching folder opens. Clear the search to restore every folder's explanations.<br><br>If you are new, start with Your first steps and Common terms. If something has stopped your progress, use Where to look when stuck to find the relevant tab, then read its detailed explanation.",
    },
    'help.help.common_terms.title': {
        ko: "자주 쓰는 용어",
        en: "Common terms",
    },
    'help.help.common_terms.body': {
        ko: "로스터는 내가 보유한 영웅 전체입니다. Party는 그중 함께 출전하도록 편성한 영웅 묶음이며, Party 번호는 그 편성을 고르는 이름입니다. 한 영웅은 한 편성에만 들어갑니다. 모든 영웅을 보유한 로스터와 실제 출전하는 Party를 구분하면 고용과 편성을 읽기 쉽습니다.<br><br>파밍은 이미 갈 수 있는 곳을 여러 번 돌아 원하는 장비·재료·경험치를 모으는 일입니다. 아이템의 옵션은 공격력·저항·회복 같은 개별 효과를 말합니다. 희귀도는 장비나 영웅의 일반·매직·레어 같은 등급이고, 레벨과는 다른 항목입니다.<br><br>건물의 랭크는 기능과 상한을 여는 단계입니다. 연구소 지점의 레벨은 그 지점의 생산·효과를 올리는 단계입니다. 마스터리는 포인트를 투자해 얻는 패시브 효과이며, 스킬북으로 배우는 액티브 스킬과 별도로 준비합니다.",
        en: "Your roster is every hero you own. A Party is a group from that roster prepared to deploy together; the Party number selects that saved group. A hero can belong to only one Party. Keeping the full roster separate from the deployed Party makes hiring and team preparation easier to follow.<br><br>Farming means repeating accessible content to collect wanted equipment, materials or XP. An item's options are its individual effects, such as damage, resistance or healing. Rarity means grades such as Normal, Magic and Rare for gear or heroes; it is separate from level.<br><br>A building's rank unlocks features and raises limits. A Laboratory node's level improves that node's production or effect. Mastery provides passive effects by spending points and is prepared separately from active skills learned through books.",
    },
    'help.help.controls.title': {
        ko: "마우스 · 키보드 · 터치 조작",
        en: "Mouse, keyboard and touch controls",
    },
    'help.help.controls.body': {
        ko: "영웅·몬스터·장비·스킬 그림에 마우스를 올리면 그 대상의 설명 카드인 툴팁이 뜹니다. 장비를 우클릭하면 잠금·이동·분해처럼 그 칸에서 가능한 행동을 고를 수 있습니다. Alt를 누르면 카드의 세부 능력치·스킬 계산이나 장비 착용 후 변화량을, Shift를 누르면 장비 옵션이 나올 수 있는 수치 범위를 확인합니다.<br><br>터치에서는 그림을 길게 눌러 설명을 엽니다. 카드 아래 [세부]와 [범위]가 나오면 각각 Alt와 Shift 대신 사용할 수 있으며, 장착·이동 같은 행동 버튼도 그 줄에 표시됩니다. 화면을 스크롤하려면 누른 채 움직이고, 설명을 열려면 그 자리에서 길게 누릅니다.<br><br>일반 창은 ×, 창 바깥 영역 클릭, Esc로 닫습니다. 확인이 필요한 창은 그 안의 선택 버튼으로 진행합니다. 휴대기기의 세로 화면에서는 기기를 가로로 돌리면 한 화면의 내용을 더 크게 볼 수 있습니다.",
        en: "Hover hero, monster, equipment or skill artwork to open its information card, called a tooltip. Right-click equipment to choose the available actions, such as locking, moving or salvaging it. Hold Alt for detailed stats, skill calculations or equipment stat changes, and Shift for the possible value ranges of equipment options.<br><br>On touchscreens, hold an image to open its information. Details and Range buttons, when shown below the card, provide the Alt and Shift views. Available actions such as equipping or moving appear there too. Move your finger to scroll, or keep it still while holding to open information.<br><br>Close most windows with ×, an outside click or Esc. Windows requiring a choice use their own buttons. On a phone or tablet held vertically, rotating to landscape makes the full game screen easier to read.",
    },
    'help.help.when_stuck.title': {
        ko: "막혔을 때 확인할 곳",
        en: "Where to look when stuck",
    },
    'help.help.when_stuck.body': {
        ko: "출발할 수 없다면 편성에 영웅이 있는지, 그 영웅이 다른 원정이나 탐험에 나가 있는지, 고른 스테이지가 열려 있는지 확인합니다. 거절될 때 표시되는 사유가 먼저 해결할 조건입니다.<br><br>출발은 되지만 계속 진다면 원정의 Report와 관전에서 쓰러진 순서와 피해를 확인합니다. 캐릭터의 착용 장비와 남은 마스터리 포인트, 편성의 진형·물약·전술 조건을 살펴봅니다. 어떤 부분이 부족한지에 따른 자세한 예시는 원정과 캐릭터 도움말에 있습니다.<br><br>버튼이나 탭이 잠겨 있으면 건설에서 해당 건물·다음 랭크 조건을 봅니다. 재료가 부족하면 연구소 생산과 장비 분해를 확인하고, 골드가 부족하면 원정을 진행하거나 완료한 의뢰를 수령합니다. 재료의 종류와 단계가 비용에 적힌 것과 같은지도 봅니다. 도감 눈금은 찼는데 잠겨 있다면 도서관 랭크를 확인합니다. 지금 필요한 기능의 조건부터 맞추면 다음 목표를 정하기 쉽습니다.",
        en: "If you cannot deploy, check that the Party contains heroes, that they are not away on another Expedition or Exploration, and that the selected stage is open. The displayed rejection reason tells you which requirement to solve first.<br><br>If you can deploy but keep losing, inspect Report and spectate to see who fell first and what dealt damage. Check equipped gear and unspent mastery points in Character, then formation, potions and tactic conditions in Party. Expedition and Character help give more detailed examples for each problem.<br><br>For locked buttons or tabs, check the building and next-rank requirements in Construction. For materials, check Laboratory production and gear salvage. For gold, run Expeditions or claim completed commissions. Match the material type and grade to the cost shown. A filled but locked Codex milestone needs Library ranks. Start with the requirements for the feature you need now.",
    },
    'help.help.settings.title': {
        ko: "화면 설정과 언어",
        en: "Display settings and language",
    },
    'help.help.settings.body': {
        ko: "상단의 EN 또는 한국어 버튼을 누르면 표시 언어가 바뀝니다.<br><br>전투 연출이 복잡하게 느껴지면 스킬 이펙트·기본 공격 이펙트·피격 반응·공격 시 흔들림을 각각 조정할 수 있습니다. 이펙트 투명도는 값이 클수록 스킬 그림을 옅게 만듭니다. 스킬 이펙트가 Off이면 그림체와 투명도 선택이 흐려지고, 피격 반응이 Off이면 피격 시 흔들림 선택이 흐려집니다. 다시 켜면 이전 선택을 사용합니다.<br><br>로그의 칸/문장은 전투 기록을 나누어 볼지 문장으로 읽을지 고르는 표시 방식입니다. 언어와 연출·로그 설정은 전투 승패나 장비 효과를 바꾸지 않으며 이 브라우저에 저장됩니다.",
        en: "Use the language button at the top to switch between Korean and English.<br><br>If combat visuals feel busy, adjust skill effects, basic attack effects, hit reactions and attack movement separately. A higher transparency value makes skill artwork fainter. Turning Skill Effects Off dims its style and transparency controls; turning Hit Reactions Off dims Shake on Hit. Turning them back on restores the previous choices.<br><br>Grid/Text chooses whether battle log entries are divided into columns or read as sentences. Language, visual effects and log settings do not change battle outcomes or equipment effects, and are saved in this browser.",
    },
    'help.help.newgame.title': {
        ko: "새 게임과 첫 영웅",
        en: "New game and starting heroes",
    },
    'help.help.newgame.body': {
        ko: "메뉴의 [새 게임]을 누르면 첫 영웅 {starterCount}명의 직업 · 죄종 · 능력치를 확인할 수 있습니다. [다시 굴리기]는 후보 전원을 다시 뽑으며, 원하는 조합이 나올 때까지 제한 없이 사용할 수 있습니다. 시작을 확정하면 그 영웅들이 첫 파티가 되고 각자 직업에 맞는 무기를 들고 프롤로그를 시작합니다.<br><br>기존 세이브가 있으면 덮어쓰기 버튼을 한 번 더 눌러야 새 게임을 시작합니다. [뒤로가기]로 메뉴에 돌아가면 기존 저장을 불러올 수 있습니다.",
        en: "Choose New Game from the menu to inspect the classes, Sins and attributes of your {starterCount} starting heroes. Reroll replaces every candidate and can be used without limit until you find a team you like. Confirming starts the prologue with those heroes as your first party, each carrying a weapon suited to their class.<br><br>If a save already exists, press the overwrite button again to confirm a new game. Back returns to the menu, where you can load the existing save.",
    },
    'help.help.saving.title': {
        ko: "자동 저장과 이어하기",
        en: "Autosave and continuing",
    },
    'help.help.saving.body': {
        ko: "진행 상황은 현재 브라우저에 자동 저장됩니다. 다시 게임을 열면 메뉴의 [불러오기]로 이어합니다. 저장은 브라우저와 접속 주소를 기준으로 남으므로 다른 브라우저·기기·주소에서는 같은 저장이 자동으로 이어지지 않습니다. 브라우저의 이 사이트 저장 데이터를 지우면 자동 저장도 지워집니다.<br><br>같은 브라우저에서 게임 탭을 여러 개 열면 한 탭이 저장할 때 기존 탭은 멈춤 화면을 표시합니다. 플레이할 탭을 하나 정해 사용합니다. [이 탭에서 이어하기]는 최신 저장을 읽도록 새로고침하는 버튼이며, 메뉴가 나오면 [불러오기]로 계속합니다.<br><br>새 게임 화면에서 후보를 다시 굴리거나 [뒤로가기]로 돌아오는 동안에는 기존 세이브가 유지됩니다. 새 영웅으로 시작하기를 최종 확정하면 기존 자동 저장을 새 게임으로 덮습니다. 설정과 언어 선택은 게임 진행과 별도로 이 브라우저에 남습니다.",
        en: "Progress is saved automatically in this browser. When you reopen the game, continue with Load Game from the menu. Saves belong to the browser and site address, so another browser, device or address does not automatically continue the same save. Clearing this site's browser storage also clears the autosave.<br><br>If multiple game tabs are open in one browser, a tab that saves causes the older tab to show a paused screen. Choose one tab to play in. Continue in this tab reloads the page to read the latest save; if the menu appears, use Load Game to continue.<br><br>Rerolling candidates in New Game or returning with Back keeps the existing save. Final confirmation to start with new heroes replaces the autosave with the new game. Display settings and language are stored in this browser separately from game progress.",
    },
    'help.help.away.title': {
        ko: "다른 화면을 보거나 자리를 비울 때",
        en: "Viewing other screens or stepping away",
    },
    'help.help.away.body': {
        ko: "게임 안에서 도움말·캐릭터·건설 같은 다른 탭을 보는 동안에도 원정과 탐험은 진행됩니다. 관전 중인 팀만 움직이는 방식이 아니므로 장비를 정리하면서 전투를 돌릴 수 있습니다.<br><br>게임을 완전히 닫으면 원정은 멈추며, 다시 접속한 뒤 출발합니다. 보낸 탐험은 꺼 둔 동안에도 남은 시간이 흘러 완료되므로 돌아왔을 때 탐험 탭에서 수령합니다. 연구소의 오프라인 생산·훈련·수익은 {offlineHours}시간분을 기준으로 제한해 계산하며, 수색은 대기 칸이 찰 때까지 진행됩니다.<br><br>PC가 절전 상태에 들어가거나 브라우저가 게임 탭을 오래 정지시키면 원정이 끊길 수 있습니다. 돌아왔을 때 멈춤 알림과 마지막 리포트를 확인하고 [보내기]로 다시 시작합니다. 연구소 생산과 탐험의 완료·수령은 각 탭에서 확인합니다.",
        en: "Expeditions and Exploration continue while you view other in-game tabs such as Help, Character or Construction. Activity is not limited to the team you are spectating, so you can organize equipment while combat runs.<br><br>Closing the game stops Expeditions; deploy again after returning. An exploration already sent can finish while the game is closed; claim it in Exploration when you return. Offline Laboratory production, Training and income use a limited {offlineHours}h calculation window. Search continues until its waiting slots fill.<br><br>If the PC sleeps or the browser suspends the game tab for a long time, Expeditions can stop. On return, check the interruption notice and last report, then Deploy again. Check Laboratory output and Exploration completion or collection in their respective tabs.",
    },
    'help.lab.generator.title': {
        ko: "아이템 생성기",
        en: "Item generator",
    },
    'help.lab.generator.body': {
        ko: "실험실은 개발 환경에서만 보이는 아이템 확인 도구입니다. 챕터와 몬스터를 고른 뒤 일반/정예 등급, 난이도, 스테이지 레벨을 조정합니다. 몬스터를 바꾸면 레벨은 그 장소의 기본값으로 돌아갑니다. 보스는 자기 등급으로 고정됩니다.",
        en: "The Lab is an item inspection tool available only in development environments. Choose a chapter and monster, then adjust Normal/Elite grade, difficulty and stage level. Changing monsters resets the level to that area's default. Bosses keep their own fixed grade.",
    },
    'help.lab.rolling.title': {
        ko: "드롭 조건과 굴리기",
        en: "Drop conditions and rolls",
    },
    'help.lab.rolling.body': {
        ko: "부위 줄에서 항상 착용하는 장비와 확률로 착용하는 장비를 구분할 수 있습니다. 아이템 레벨 범위와 희귀도 가중치는 현재 조건의 실제 드롭 규칙입니다. <b>[굴리기]</b>는 한 번, <b>[×10]</b>은 열 번 생성하며 파티의 매직 아이템 획득 보너스는 적용하지 않습니다.<br><br>가중치는 상대 비중이므로 표시값 자체가 퍼센트 확률은 아닙니다.",
        en: "The slot row distinguishes always-equipped items from optional slots with a wear chance. Item-level ranges and rarity weights show the actual drop rules for your chosen conditions. <b>Roll</b> generates once; <b>×10</b> generates ten times. Party Magic Find is excluded. Weights are relative shares, not direct percentage chances.",
    },
    'help.lab.results.title': {
        ko: "결과와 저장",
        en: "Results and saving",
    },
    'help.lab.results.body': {
        ko: "오른쪽에는 최신 장비의 상세 카드와 최근 결과 목록이 표시됩니다. 결과를 가리키면 장비의 상세 옵션을 확인하고 <b>[비우기]</b>로 기록을 지울 수 있습니다. 생성한 장비는 가방에 들어가지 않고 실제 골드 · 재료 · 세이브에도 영향을 주지 않습니다. 기록은 화면을 다시 불러오면 초기화됩니다.",
        en: "The right side shows the latest item's details and recent results. Hover a result to inspect it and press <b>Clear</b> to erase the list. Generated equipment is not added to inventory and does not affect real gold, materials or saves. The list resets when you reload.",
    },

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
            + '다 채우면 <b>[수령]</b>으로 골드를 받습니다 · <b>[포기]</b>는 벌이 없습니다(진행만 버림) — 비는 자리에는 새 카드가 섭니다<br>'
            + '<b>명성 레벨</b> — [수령]할 때마다 명성이 하나 쌓이고(포기는 0 · 떨어지지 않음) 문턱을 넘으면 레벨이 오릅니다. 레벨이 오르면 <b>새로 서는 카드</b>의 목표와 골드가 같이 커지고 골드가 더 크게 오릅니다 — 이미 선 카드는 그대로입니다',
        en: 'A commission is a <b>goal you take on</b> — no battlefield opens. Pick one from the board and it fills itself <b>on top of what you already do</b><br>'
            + 'There are <b>two kinds</b> — <b>Slay</b> ("kill x" · the battles you already run count it) and <b>Collect</b> ("gather x" · drops and dispatch/exploration yields fill it)<br>'
            + '<b>It advances offline too</b> — the goal moves while you are away. So there is no party to send and no commission-only battlefield<br>'
            + 'Each card rolls a <b>template, grade and target</b> — targets only come from places you can reach now. Grades are <b>Normal · Magic · Rare</b> — higher grades are rarer and pay more gold per goal<br>'
            + '<b>Accepting spends that card</b> — it turns into an active commission in place, and the Tavern rank raises how many you can hold. That is what makes "which one do I take" a decision<br>'
            + 'Only kills in won rounds and drops that come in <b>after you accept</b> count (items salvaged because the bag was full do not) · every party fills it · <b>there is no deadline</b><br>'
            + 'When it is full, <b>[Claim]</b> pays the gold · <b>[Abandon]</b> costs nothing but the progress — a new card takes the empty place<br>'
            + '<b>Fame level</b> — every [Claim] adds one fame (abandoning adds none · it never drops), and passing a threshold raises the level. A higher level makes <b>newly posted cards</b> ask for more and pay more, with gold rising faster — cards already on the board stay as they are',
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
            + '<b>아직 아무 효과도 그 축에 적용되지 않음</b>을 뜻합니다 — 비어 있는 축이 곧 다음 장비의 자리입니다.<br>'
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
    // 스킬 우선순위 — 소제목 오른쪽 끝 버튼 · 그 버튼이 여는 창의 제목 (SCREEN_DESIGN §6 · ADR-0937)
    'ch.skill.order': { ko: '우선순위', en: 'Priority' },
    'ch.skill.orderH': { ko: '스킬 우선순위', en: 'Skill Priority' },
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
    // 레벨당 옵션 줄 — 그 레벨의 합계 + 괄호에 옵션 그대로 「데미지 +40% (레벨당 데미지 +1%)」 (§6 · ADR-0954)
    'tip.perLevel': { ko: '{total} ({per})', en: '{total} ({per})' },
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
    // 기준 줄 — 칸 줄 아래 `−` · 이 글 · `+` (§15 · ADR-0942 · R378) · `{n}` = 고른 편성의 마시는 HP 비율(%)
    'pt.potion.use': { ko: 'HP {n}% 미만에서 마심', en: 'Drink below {n}% HP' },
    'pt.potion.useDown': { ko: '기준 낮추기', en: 'Lower threshold' },
    'pt.potion.useUp': { ko: '기준 올리기', en: 'Raise threshold' },
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
    'cn.t.hire': { ko: '영웅 고용 · 수색', en: 'Hero Hiring · Search' },   // 연구소 수색 줄도 이 랭크가 연다 (2026-10-30 사용자 지시)
    'cn.t.shop': { ko: '상단에서 무기 · 물약 구매', en: 'Buy weapons and potions at the trading house' },
    'cn.t.shop_rows': { ko: '상단에서 방어구 · 장신구 · 스킬 도안 구매', en: 'Buy armor, jewelry and skill blueprints at the trading house' },
    'cn.t.shop_trade': { ko: '교역소에서 재료 교환', en: 'Trade materials at the trading post' },
    'cn.t.shop_special': { ko: '특수상단 방문', en: 'The special merchant starts visiting' },
    'cn.t.craft': { ko: '매직 장비에 전용 옵션 추가', en: 'Add a special option to magic gear' },
    'cn.t.stigma_craft': { ko: '낙인으로 장비 크래프트', en: 'Craft equipment with stigmas' },
    'cn.t.skill_card': { ko: '스킬 카드 합성', en: 'Fuse skill cards' },
    'cn.t.skillbook': { ko: '스킬북으로 스킬 습득', en: 'Learn skills from skill books' },   // 도서관 r1 (R179 · 2026-10-30 R398 · construction_draft §2)
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
    'rs.buff.lead': { ko: '리더 통솔 {n} — 버프 효과 {p}%', en: 'Leader Leadership {n} — Buff Effect {p}%' },   // 배수가 아니라 늘고 준 양 (ADR-0938)
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
        ko: '<b>맨 아랫줄(반응형)은 기획이 방향만 정했습니다</b> — 「~하면 ~하는 효과」는 발동 빈도에 파워가 종속돼 값을 잴 자가 없습니다.',
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
    'tv.h': { ko: '영웅 고용', en: 'Hire Heroes' },
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
    // 레벨 줄이 둘인 스킬(워 오더스 · 2026-10-28 R367)은 「효과」 두 줄이 안 갈려 걸린 효과의 수치 이름을 든다
    'cx.lv.def': { ko: '방어력', en: 'Defense' },   // effect_value · def_pct
    'cx.lv.resAll': { ko: '모든 저항', en: 'All Resistances' },   // effect_value · res_pct
    'cx.lv.cool': { ko: '쿨타임', en: 'Cooldown' },   // cool_sec
    'cx.lv.hitsAt': { ko: 'Lv {l} 에 +1번', en: '+1 at Lv {l}' },   // hits — 단계가 정수가 아니면 한 타가 느는 레벨(러시 · 2026-10-28 R374)
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
        ko: '관전은 가능하되 <b>의무가 아닙니다</b> — 배속은 진행 속도만 바꿉니다. 원정 중에 바꾼 장비 · 스킬 트리는 보스전에서도 <b>그 순간</b> 적용됩니다 · <b>라운드를 이긴 순간 그 보상이 들어옵니다</b>(가방 · 골드 · 경험치 · 도감).<br>'
            + '<b>철수</b>하면 원정이 멈춥니다 — 진행 중이던 라운드는 사라지고 이긴 라운드까지의 보상은 남습니다 · 런이 끝나 다음 런을 세는 동안 누르면 다음 런이 안 나갑니다. 게임을 끄면 원정도 그 자리에서 끊깁니다.',
        en: 'Watching is allowed but <b>never required</b> — speed only changes the pace. Gear and skill-tree changes during a run apply <b>at once</b>, including during boss fights · each round <b>pays out the moment you win it</b> (bag · gold · XP · codex).<br>'
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
    // 적 데미지 감소 디버프 — 최종 피해에 곱 (final_dmg_pct · 2026-10-28 R368)
    'bt.effect.dmg.up': { ko: '데미지 {v}% 증가', en: 'Damage +{v}%' },
    'bt.effect.dmg.down': { ko: '데미지 {v}% 감소', en: 'Damage −{v}%' },
    'bt.effect.basic.up': { ko: '기본 공격 피해 {v}% 증가', en: 'Basic attack damage +{v}%' },
    'bt.effect.basic.down': { ko: '기본 공격 피해 {v}% 감소', en: 'Basic attack damage −{v}%' },
    'bt.effect.frenzy': { ko: '때릴 때마다 공격 속도 {v}% 씩 증가', en: 'Attack Speed +{v}% per hit' },
    'bt.effect.evade': { ko: '받는 공격 {n}번 회피', en: { one: 'Avoids the next {n} attack', other: 'Avoids the next {n} attacks' } },
    'bt.effect.imbue': { ko: '{e} 스킬에 상태이상 추가', en: '{e} skills inflict an ailment' },
    'bt.effect.pulse': { ko: '일정 간격으로 적 전원에게 {e} 피해', en: '{e} damage to every enemy at intervals' },
    'bt.effect.echo': { ko: '공격 스킬이 한 번 더', en: 'Attack skills fire twice' },
    // 장 보스 고유 넷 (2026-10-29 · R380 · ADR-0944)
    'bt.effect.maiden': { ko: '준 직격 피해의 {v} 되받음', en: 'Takes back {v} of its direct damage' },
    'bt.effect.transform': { ko: '변신 — 다른 스킬 봉인', en: 'Transformed — other skills sealed' },
    'bt.effect.delegate': { ko: '차례를 가장 센 아군에게 넘김', en: 'Hands its turns to the strongest ally' },
    'bt.effect.swarm': { ko: '파리 떼로 흩어짐', en: 'Scattered into a swarm' },
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
    'log.v.delegate': { ko: '넘김', en: 'pass' },   // 델리게이트로 넘긴 차례 (2026-10-29 · R380)
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
    // 장 보스 고유 넷 (2026-10-29 · R380) — 아이언 메이든이 되돌린 피해 · 델리게이트 · 스웜이 다시 뭉쳤다
    'log.say.maiden': { ko: '{d|이/가} {ico|으로/로} {v} 피해를 되받음', en: '{d} took {v} back from {ico}' },
    'log.say.delegate': { ko: '{a|이/가} {d}에게 차례를 넘김', en: '{a} passed the turn to {d}' },
    'log.say.regroup': { ko: '{a|이/가} {ico}에서 다시 뭉침 — HP {v}', en: '{a} regrouped from {ico} — HP {v}' },
    'log.say.lvup': { ko: '{a} 레벨 {v} 달성', en: '{a} reached Lv.{v}' },
    'pop.dodge': { ko: '빗나감', en: 'MISS' },
    'pop.counter': { ko: '반격', en: 'COUNTER' },
    'pop.delegate': { ko: '넘김', en: 'PASS' },   // 델리게이트 (2026-10-29 · R380)
    'pop.evade': { ko: '회피', en: 'EVADE' },   // 이베이드 (2026-10-16)
    'pop.echo': { ko: '에코', en: 'ECHO' },     // 에코 (2026-10-16)   // 반격한 카드에 뜬다 (ADR-0158)
    'pop.downed': { ko: '전투 불능', en: 'Downed' },
    // 레벨업 (2026-09-29 · ADR-0435) — 오른 카드의 금색 글자 · 아래 적중 변화 줄(`pop.lvupHit`)은 2026-10-22 삭제 (ADR-0718)
    'pop.lvup': { ko: '레벨 업', en: 'LEVEL UP' },
};
