/** UI text and language preferences. Additional languages are loaded on demand
 * from ui/locales. CSV and saved names are resolved by their original text pair. */
import { LANGUAGE_NAMES, catalogFor, needsCatalog, loadCatalog, dataText } from './locales.js';
export { LANGUAGE_NAMES };
const STORE_KEY = 'thesevensim.lang';
export const LANGS = Object.keys(LANGUAGE_NAMES);
const LANG_TAG = { zh: 'zh-CN', es: 'es-ES' };
function normLang(value) {
    const tag = String(value ?? '').replaceAll('_', '-').toLowerCase();
    if (/^zh-(hant|tw|hk|mo)(-|$)/.test(tag)) return 'zh-TW';
    if (/^zh($|-(hans|cn|sg)(-|$))/.test(tag)) return 'zh';
    if (/^pt($|-br$)/.test(tag)) return 'pt-BR';
    return tag.split('-')[0];
}

let current = (() => {
    const q = normLang(new URLSearchParams(location.search).get('lang'));
    if (LANGS.includes(q)) return q;
    try {
        const saved = normLang(localStorage.getItem(STORE_KEY));
        if (LANGS.includes(saved)) return saved;
    } catch { /* 프라이빗 모드 등 — 기본값으로 */ }
    return 'ko';
})();

if (needsCatalog(current)) {
    try { await loadCatalog(current); } catch { current = 'en'; }
}
export const lang = () => current;
export const langTag = () => LANG_TAG[current] ?? current;
let languageRequest = 0;

export async function setLang(value) {
    const code = normLang(value);
    if (!LANGS.includes(code)) return;
    const request = ++languageRequest;
    if (needsCatalog(code)) await loadCatalog(code);
    if (request !== languageRequest) return;
    current = code;
    try { localStorage.setItem(STORE_KEY, code); } catch { /* private browsing */ }
    applyDocumentLang();
}

/** <html lang> + <title> 동기화 — 모듈 로드 시 1회, 전환 시마다 호출 */
export function applyDocumentLang() {
    document.documentElement.lang = langTag();
    document.title = t('app.title');
}

export const L = value => dataText(value, current);

/** 그 키가 사전에 있는가 — 어휘가 데이터에서 오는 자리(마스터리 효과 `app.js`)가 제 문구가 있는지 고를 때 쓴다 */
export const has = key => Object.prototype.hasOwnProperty.call(STRINGS, key);
/** 잠김 문구인가 — 항목에 `lock: true` 면 플래시가 글 앞에 자물쇠를 세운다 (SCREEN_DESIGN §13-1 · ADR-0699) */
export const isLock = key => STRINGS[key]?.lock === true;
/** 사전 항목 전부 `[key, {ko, en, zh?}]` — 검증용(`dev/test.js` 의 간체 그물 · `scripts/zh_missing.py` 와 같은 범위). 화면 코드는 `t()` 만 쓴다 */
export const dictEntries = () => Object.entries(STRINGS);

/** 미등록 키를 화면 글로 낼 때 — 문구는 `innerHTML` 로 들어가므로 키에 든 태그 글자를 글자로 바꾼다 (ADR-0751) */
const escapeKey = key => String(key).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** UI 문구 조회 — 미등록 키는 키 그대로 노출된다(누락이 화면에서 바로 보이게 · HTML 글자는 이스케이프) */
const pluralRules = Object.fromEntries(LANGS.map(code => [code, new Intl.PluralRules(LANG_TAG[code] ?? code)]));

export function t(key, params) {
    const e = has(key) ? STRINGS[key] : null;
    let s = e ? (e[current] ?? catalogFor(current)?.ui[key] ?? e.en ?? e.ko) : escapeKey(key);
    if (s && typeof s === 'object') {
        const count = Number(String(params?.n ?? params?.v ?? '').replaceAll(',', ''));
        const form = pluralRules[current].select(count);
        s = s[form] ?? s.other;
    }
    if (params) s = s.replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(params, name) ? params[name] : token);
    return s;
}

/* ═══════════════════ 사전 ═══════════════════ */

const STRINGS = {
    'mobile.menu': { ko: '전체 메뉴', en: 'All menus', zh: '全部菜单' },
    'mobile.more': { ko: '메뉴', en: 'Menu', zh: '菜单' },
    'mobile.close': { ko: '메뉴 닫기', en: 'Close menu', zh: '关闭菜单' },
    'mobile.navigation': { ko: '빠른 이동', en: 'Quick navigation', zh: '快速跳转' },
    'mobile.inventory': { ko: '가방 함께 보기', en: 'Show inventory', zh: '同时查看背包' },
    'mobile.battleDetails': { ko: '두 팀 전투 통계 보기', en: 'Show both teams’ statistics', zh: '查看双方战斗统计' },
    'mobile.battleTools': { ko: '전투 도구와 통계', en: 'Battle tools and statistics', zh: '战斗工具与统计' },
    'mobile.battle': { ko: '전장 크게 보기', en: 'Expand battlefield', zh: '放大战场' },
    'mobile.sections': { ko: '화면 기능', en: 'Screen sections', zh: '画面功能' },
    'mobile.swipe.position': { ko: '밀어서 보기 · {n}/{total}', en: 'Swipe · {n}/{total}', zh: '滑动查看 · {n}/{total}' },
    'mobile.swipe.help': { ko: '본문을 좌우로 밀어 넘기거나 위의 항목을 누르세요.', en: 'Swipe the content left or right, or select a section above.', zh: '左右滑动正文翻页，或点击上方的项目。' },
    'mobile.swipe.edge': { ko: '마지막 화면', en: 'End of pages', zh: '最后一页' },
    'mobile.swipe.first': { ko: '처음 화면', en: 'First page', zh: '第一页' },
    'mobile.page.gear': { ko: '장비', en: 'Gear', zh: '装备' },
    'mobile.page.basic': { ko: '능력치', en: 'Stats', zh: '属性' },
    'mobile.page.detail1': { ko: '상세 1', en: 'Detail 1', zh: '详情1' },
    'mobile.page.detail2': { ko: '상세 2', en: 'Detail 2', zh: '详情2' },
    'mobile.page.stash': { ko: '창고', en: 'Stash', zh: '仓库' },
    'mobile.page.bag': { ko: '가방', en: 'Bag', zh: '背包' },
    'mobile.page.formation': { ko: '진형', en: 'Formation', zh: '阵型' },
    'mobile.page.potions': { ko: '물약', en: 'Potions', zh: '药水' },
    'mobile.page.tactics': { ko: '전술', en: 'Tactics', zh: '战术' },
    'mobile.page.town': { ko: '부지', en: 'Town', zh: '用地' },
    'mobile.page.building': { ko: '건물 상세', en: 'Building', zh: '建筑详情' },
    'mobile.page.hire': { ko: '고용', en: 'Hire', zh: '雇佣' },
    'mobile.page.search': { ko: '수색', en: 'Search', zh: '搜寻' },
    'mobile.page.quests': { ko: '의뢰', en: 'Quests', zh: '委托' },
    'mobile.page.gamble': { ko: '도박장', en: 'Casino', zh: '赌坊' },
    'mobile.page.buy': { ko: '구매', en: 'Buy', zh: '购买' },
    'mobile.page.sell': { ko: '판매', en: 'Sell', zh: '出售' },
    'mobile.page.trade': { ko: '교역', en: 'Trade', zh: '交易' },
    'mobile.page.merchant': { ko: '상단', en: 'Merchant', zh: '商会' },
    'mobile.page.work': { ko: '작업', en: 'Workshop', zh: '工作台' },
    'mobile.page.advance': { ko: '전직', en: 'Advance', zh: '转职' },
    'mobile.page.upgrade': { ko: '업그레이드', en: 'Upgrade', zh: '升级' },
    'mobile.page.books': { ko: '책 제작', en: 'Books', zh: '制作书' },   // 도서관 본판 오른쪽 구역 — 스킬 북 제작 (ADR-1262)
    'mobile.page.temper': { ko: '담금질', en: 'Quench', zh: '淬火' },
    'mobile.page.mats': { ko: '재료', en: 'Materials', zh: '材料' },   // 대장간 합성 — 왼쪽 재료 판 (ADR-1309)
    'mobile.page.synth': { ko: '합성', en: 'Combine', zh: '合成' },   // 대장간 합성 — 오른쪽 합성 판 (ADR-1309)
    'mobile.page.research': { ko: '연구판', en: 'Research', zh: '研究面板' },
    'mobile.page.researchDetail': { ko: '연구 상세', en: 'Details', zh: '研究详情' },
    'mobile.page.opponent': { ko: '상대 선택', en: 'Opponent', zh: '选择对手' },
    'mobile.page.prepare': { ko: '출전 준비', en: 'Prepare', zh: '出战准备' },
    'mobile.page.generate': { ko: '조건', en: 'Generate', zh: '条件' },
    'mobile.page.result': { ko: '결과', en: 'Result', zh: '结果' },
    'mobile.page.battle': { ko: '전장으로', en: 'Back to battle', zh: '返回战场' },
    'mobile.page.hero1': { ko: '영웅 I', en: 'Hero I', zh: '英雄 I' },
    'mobile.page.hero2': { ko: '영웅 II', en: 'Hero II', zh: '英雄 II' },
    'mobile.page.hero3': { ko: '영웅 III', en: 'Hero III', zh: '英雄 III' },
    'mobile.page.guide': { ko: '안내', en: 'Guide', zh: '指引' },
    'mobile.page.skills': { ko: '스킬', en: 'Skills', zh: '技能' },
    'mobile.page.field': { ko: '전장', en: 'Battle', zh: '战场' },
    'mobile.page.setup': { ko: '설정', en: 'Setup', zh: '设置' },
    'mobile.page.log': { ko: '기록', en: 'Log', zh: '记录' },
    'mobile.page.reports': { ko: '원정 기록', en: 'Runs', zh: '远征记录' },
    'mobile.page.reportDetail': { ko: '전투 결과', en: 'Results', zh: '战斗结果' },
    'mobile.page.party1': { ko: '부대 I', en: 'Party I', zh: '小队 I' },
    'mobile.page.party2': { ko: '부대 II', en: 'Party II', zh: '小队 II' },
    'mobile.page.party3': { ko: '부대 III', en: 'Party III', zh: '小队 III' },
    'nav.raid': { ko: '레이드', en: 'Raid', zh: '突袭' },
    'raid.eyebrow': { ko: 'RAID · 분노의 전장', en: 'RAID · FIELD OF WRATH', zh: '突袭 · 愤怒之战场' },
    'raid.trial': { ko: '전투 연습 · 보상 없음', en: 'Combat trial · No rewards', zh: '战斗练习 · 无奖励' },
    'raid.practice': { ko: '랜덤 편성', en: 'Random parties', zh: '随机编队' },
    'raid.reroll': { ko: '편성 다시 뽑기', en: 'Reroll parties', zh: '重新抽取编队' },
    'raid.own': { ko: '내 편성', en: 'My parties', zh: '我的编队' },
    'raid.pause': { ko: '일시 정지', en: 'Pause', zh: '暂停' },
    'raid.retreat': { ko: '철수', en: 'Retreat', zh: '撤退' },
    'raid.retreated': { ko: '공격대 철수', en: 'RAID WITHDRAWN', zh: '突袭队撤退' },
    'raid.resume': { ko: '계속', en: 'Resume', zh: '继续' },
    'raid.paused': { ko: '일시 정지 중', en: 'Paused', zh: '已暂停' },
    'raid.speed': { ko: '{n}배속', en: '{n}× speed', zh: '{n}倍速' },
    'raid.expand': { ko: '전장 확대', en: 'Expand', zh: '放大战场' },
    'raid.shrink': { ko: '메뉴 표시', en: 'Show menu', zh: '显示菜单' },
    'raid.help': { ko: '레이드 도움말', en: 'Raid help', zh: '突袭帮助' },
    'raid.lane.1': { ko: '좌익 · Party I', en: 'Left · Party I', zh: '左翼 · Party I' },
    'raid.lane.2': { ko: '중앙 · Party II', en: 'Center · Party II', zh: '中央 · Party II' },
    'raid.lane.3': { ko: '우익 · Party III', en: 'Right · Party III', zh: '右翼 · Party III' },
    'raid.front': { ko: '전열', en: 'Front', zh: '前排' },
    'raid.rear': { ko: '후열', en: 'Rear', zh: '后排' },
    'raid.bossOnly': { ko: '단일 보스 · 3개 편성', en: 'Single boss · Three parties', zh: '单一首领 · 3个编队' },
    'raid.practiceReady': { ko: '랜덤 영웅 9명 · 세이브 소모 없음', en: '9 random heroes · No save resources used', zh: '随机英雄9名 · 不消耗存档资源' },
    'raid.ownReady': { ko: '편성 I · II · III 출전 준비', en: 'Parties I · II · III ready', zh: '编队 I · II · III 准备出战' },
    'raid.err.level': { ko: '보유 영웅 최고 레벨 {need} 필요 · 현재 {have}', en: 'Highest hero level {need} required · Current level {have}', lock: true, zh: '需要已有英雄的最高等级达到{need} · 当前{have}' },
    'raid.err.locked': { ko: '잠김 · 헬 {chapter}장 챕터보스 처치 필요', en: 'Locked · Defeat the Hell chapter {chapter} boss', zh: '未解锁 · 需击败地狱第{chapter}章章节首领' },
    'raid.err.party': { ko: '각 편성에 영웅 3명 필요', en: 'Each party needs three heroes', zh: '每个编队需要3名英雄' },
    'raid.err.running': { ko: '원정 중인 편성', en: 'Party on an expedition', zh: '编队正在远征' },
    'raid.err.exploring': { ko: '탐험 중인 편성', en: 'Party exploring', zh: '编队正在探索' },
    'raid.err.advancing': { ko: '전직 중인 영웅', en: 'Hero changing class', zh: '英雄正在转职' },
    'raid.err.missing': { ko: '편성 영웅 확인 필요', en: 'Party member missing', zh: '需检查编队英雄' },
    'raid.err.duplicate': { ko: '영웅 중복 편성', en: 'Duplicate party member', zh: '英雄重复编入' },
    'raid.log': { ko: '레이드 주요 전황', en: 'Raid events', zh: '突袭主要战况' },
    'raid.start': { ko: '레이드 시작', en: 'Start raid', zh: '开始突袭' },
    'raid.fighting': { ko: '전투 중', en: 'In combat', zh: '战斗中' },
    'raid.retry': { ko: '다시 도전', en: 'Try again', zh: '再次挑战' },
    'raid.started': { ko: '세 파티 출전 · 전투 시작', en: 'Three parties deployed · Battle started', zh: '三支队伍出战 · 战斗开始' },
    'raid.phase': { ko: 'PHASE {n}', en: 'PHASE {n}', zh: '第{n}阶段' },
    'raid.phaseChange': { ko: 'PHASE {n} · 보스 격화', en: 'PHASE {n} · Boss intensifies', zh: '第{n}阶段 · 首领狂暴' },
    'raid.exposed': { ko: '약점 노출', en: 'EXPOSED', zh: '弱点暴露' },
    'raid.enraged': { ko: '최종 공세', en: 'FINAL ASSAULT', zh: '最终攻势' },
    'raid.awaiting': { ko: '출전 대기', en: 'Awaiting deployment', zh: '等待出战' },
    'raid.nextAttack': { ko: '다음 공격 준비', en: 'Preparing next attack', zh: '准备下一次攻击' },
    'raid.finished': { ko: '전투 종료', en: 'Encounter complete', zh: '战斗结束' },
    'raid.threeParties': { ko: 'Party I + II + III', en: 'Party I + II + III', zh: 'Party I + II + III' },
    'raid.target': { ko: '공격 대상 · Party {parties}', en: 'Target · Party {parties}', zh: '攻击目标 · Party {parties}' },
    'raid.targeted': { ko: '공격 예고', en: 'INCOMING', zh: '攻击预警' },
    'raid.ready': { ko: '준비', en: 'Ready', zh: '就绪' },
    'raid.partySize': { ko: '3인 편성', en: 'Three heroes', zh: '3人编队' },
    'raid.breakProgress': { ko: '시전 파괴 {n} / {max}', en: 'Cast break {n} / {max}', zh: '打断施法{n} / {max}' },
    'raid.breakSuccess': { ko: '시전 파괴 · 약점 노출', en: 'Cast broken · Weak point exposed', zh: '打断施法 · 弱点暴露' },
    'raid.breakFail': { ko: '시전 파괴 실패 · 전면 충격', en: 'Cast break failed · Full impact', zh: '打断施法失败 · 全面冲击' },
    'raid.downed': { ko: '전투불능', en: 'DOWN', zh: '倒下' },
    'raid.victory': { ko: '레이드 승리', en: 'RAID CLEARED', zh: '突袭胜利' },
    'raid.defeat': { ko: '공격대 전멸', en: 'RAID DEFEATED', zh: '突袭队全灭' },
    'raid.timeout': { ko: '제한 시간 초과', en: 'TIME LIMIT REACHED', zh: '超出时间限制' },
    'raid.resultSummary': { ko: '{time} · 생존 {n}/9 · 파괴 성공 {breaks}회 / 실패 {failed}회', en: '{time} · {n}/9 survivors · Cast breaks: {breaks} / Failed: {failed}', zh: '{time} · 存活{n}/9 · 打断成功{breaks}次 / 失败{failed}次' },
    'raid.damageValue': { ko: '피해 {n}', en: 'Damage {n}', zh: '伤害{n}' },
    'raid.healValue': { ko: '회복 {n}', en: 'Healing {n}', zh: '治疗{n}' },
    'raid.aliveValue': { ko: '생존 {n}/3', en: 'Alive {n}/3', zh: '存活{n}/3' },
    'raid.reviewField': { ko: '전장 확인', en: 'View battlefield', zh: '查看战场' },
    'raid.results': { ko: '레이드 결과', en: 'Raid results', zh: '突袭结果' },
    'help.raid.overview.title': { ko: '세 파티의 공동 전투', en: 'Three parties, one encounter', zh: '三支队伍的联合作战' },
    'help.raid.overview.body': { ko: '좌익·중앙·우익의 세 편성이 하나의 보스를 상대합니다. 해당 장의 헬 챕터보스를 처치하면 내 편성으로 연습할 수 있습니다. 서로 다른 영웅 세 명씩 필요하며 원정·탐험 중인 편성은 사용할 수 없습니다.<br><br>기존 장비·스킬·진형·전술을 출전 순간 복사합니다. 회복·강화·오오라는 자기 편성에 적용되고 보스에게 건 약화는 공통으로 작동합니다. 한 편성이 쓰러져도 나머지는 계속 전투합니다.', en: 'The left, center and right parties fight one shared boss. Defeat that chapter’s Hell boss to try your own parties. Each needs three distinct heroes and must be free of expeditions and exploration.<br><br>Equipment, skills, formation and tactics are copied at deployment. Healing, buffs and auras stay within their party. Debuffs on the shared boss benefit everyone. Surviving parties keep fighting if another falls.', zh: '左翼、中路、右翼三个编队共同对抗一个首领。击败该章的地狱难度章节首领后，即可用自己的编队进行练习。每个编队需要三名不同的英雄，正在远征或探索的编队无法使用。<br><br>出战瞬间会复制现有的装备、技能、阵型与战术。治疗、增益与光环只作用于各自的编队，施加在首领身上的减益则对所有编队共同生效。即使一个编队倒下，其余编队也会继续战斗。' },
    'help.raid.patterns.title': { ko: '공격 예고와 시전 파괴', en: 'Warnings and cast breaks', zh: '攻击预警与施法打断' },
    'help.raid.patterns.body': { ko: '보스 아래에 공격 이름·대상 편성·남은 시간이 표시됩니다. 맞을 편성의 테두리도 켜집니다. 철퇴는 대상 편성의 전열을 우선 공격하고 휩쓸기와 광역은 해당 편성 전원에게 피해를 줍니다. 지목과 도발도 지정 편성 안에서 적용합니다.<br><br>시전 파괴 게이지가 나타난 강공격은 예고 중 보스 체력을 깎아 중단할 수 있습니다. 성공하면 약점 노출 시간이 생깁니다. 실패하면 전 편성에 큰 공격이 들어옵니다. 체력이 줄면 단계가 오르며 공격이 빨라지고 강해집니다. 예정된 패턴은 일반 행동 경직으로 취소되지 않습니다.', en: 'Warnings show the attack, targeted parties and time to impact, with matching lane borders. Hammer prioritizes the targeted front rank. Cleaves and waves hit everyone in their targeted lanes. Marks and taunts apply within the selected lane.<br><br>Dealing real HP damage fills a heavy attack’s cast-break bar. Breaking the cast exposes the boss; failure causes a heavy raid-wide impact. Lower boss HP triggers faster, stronger phases. Scripted patterns are not cancelled by ordinary action stun.', zh: '首领下方会显示攻击名称、目标编队与剩余时间，将要受击的编队边框也会亮起。铁锤会优先攻击目标编队的前排，横扫与范围攻击会对该编队全员造成伤害。标记与嘲讽也只在指定编队内生效。<br><br>出现施法打断槽的重击，可以在预警期间削减首领生命来打断。成功后会出现弱点暴露时间；失败则所有编队都会受到一次强力攻击。首领生命降低后会进入更高阶段，攻击变得更快、更强。预定的招式不会被普通的行动僵直取消。' },
    'help.raid.trial.title': { ko: '전투 연습의 범위', en: 'Combat trial', zh: '战斗练习的范围' },
    'help.raid.trial.body': { ko: '현재는 보상 없는 전투 연습입니다. 훈련 편성은 샘플 영웅 아홉 명으로 누구나 체험할 수 있습니다. 내 편성도 스냅샷으로 전투하며 영웅·장비·재고·진행 기록을 소모하거나 변경하지 않습니다. 이번 연습에는 물약을 사용하지 않습니다.<br><br>탭을 떠나거나 창이 숨겨지면 연습 시계가 멈춥니다. 돌아오면 같은 판을 이어 보며 새로고침하면 초기화됩니다. 결과에서 피해·회복·생존·시전 파괴를 확인하고 다시 도전할 수 있습니다. 정식 보상·반복·추가 몬스터는 아직 정해지지 않았습니다.', en: 'This is a combat trial without rewards. Training parties provide nine sample heroes for anyone to try. Your parties also fight as snapshots, without consuming or changing heroes, equipment, inventory or progress. Potions are not used.<br><br>The trial pauses when you leave the tab or hide the window. Returning resumes it; refreshing resets it. Review damage, healing, survivors and cast breaks in the results and retry. Live rewards, repeat rules and additional monsters remain undecided.', zh: '目前这是没有奖励的战斗练习。训练编队提供九名示范英雄，任何人都可以体验。你的编队也以快照形式参战，不会消耗或改变英雄、装备、库存与进度记录。本次练习不使用药水。<br><br>离开标签页或窗口被隐藏时，练习计时会暂停。回来后会继续同一场战斗，刷新页面则会重置。可以在结果中查看伤害、治疗、存活与施法打断，并再次挑战。正式奖励、重复挑战与追加怪物尚未确定。' },
    /* ── 제목 옆 짧은 도움말 ── */
    'ui.helpFor': { ko: '{name} 도움말', en: 'Help for {name}', zh: '{name}帮助' },
    'hint.attributes': { ko: '영웅 생성 시 각 기본 능력치는 최대 {max}까지 붙습니다. 전투 수치와 연구소 등록 효과의 바탕이 됩니다.', en: 'Each base attribute can roll up to {max} when a hero is created. Attributes determine combat values and Laboratory assignment effects.', zh: '创建英雄时，每项基础属性最多为{max}。属性是战斗数值与研究所派驻效果的基础。' },
    'hint.colosseum': { ko: '상대 팀을 확인하고 선택한 Party로 겨룹니다. 영웅의 장비·스킬과 편성을 함께 준비하세요.', en: 'Inspect the opposing team and fight with your selected Party. Prepare its equipment, skills and formation together.', zh: '查看对手队伍，以所选Party进行较量。请一并准备英雄的装备、技能与编队。' },
    'hint.endless': { ko: '그 층의 몬스터를 확인하고 선택한 Party로 도전합니다. 같은 층에는 언제나 같은 몬스터가 나옵니다.', en: 'Inspect the floor’s monsters and challenge them with your selected Party. The same floor always fields the same monsters.', zh: '查看该层的怪物，以所选Party进行挑战。同一层出现的怪物始终相同。' },
    'hint.arena': { ko: '상대를 고르고 선택한 Party로 결투합니다. 전투 전에 상대 구성과 내 물약·전술을 확인하세요.', en: 'Choose an opponent and duel with the selected Party. Check both teams and your potions and tactics before starting.', zh: '选择对手，以所选Party进行决斗。开战前请确认对手阵容以及我方的药水与战术。' },
    'hint.opponents': { ko: '후보를 누르면 상대 팀을 확인할 수 있습니다. 새 상대는 후보 목록을 다시 고릅니다.', en: 'Select a candidate to inspect its team. New opponents refreshes the candidate list.', zh: '点击候选即可查看对手队伍。“新对手”会重新挑选候选名单。' },
    'hint.defense': { ko: '다른 플레이어가 상대로 만나는 Party입니다. 영웅 3명이 찬 편성만 올라갑니다.', en: 'The Party other players face as your defense. Only a party with 3 heroes is listed.', zh: '其他玩家作为对手遇到的Party。只有满3名英雄的编队才会被列入。' },
    'hint.reg_name': { ko: '다른 플레이어에게 이름과 태그가 보입니다. 이름은 설정에서 바꿀 수 있습니다.', en: 'Other players see your name and tag. You can change the name in Settings.', zh: '其他玩家可以看到你的名字和标签。名字可在设置中修改。' },
    'hint.users': { ko: '이름이나 태그로 다른 플레이어를 찾아 친선전 상대로 고릅니다. 친선전은 레이팅이 바뀌지 않습니다.', en: 'Find other players by name or tag and pick one as a friendly opponent. Friendly duels do not change rating.', zh: '按名字或标签查找其他玩家，选为友谊赛对手。友谊赛不会改变积分。' },
    'hint.team': { ko: '선택한 Party의 영웅과 진형입니다. 편성 탭에서 인원과 자리를 바꿀 수 있습니다.', en: 'The heroes and formation of the selected Party. Change members and positions in Party.', zh: '所选Party的英雄与阵型。可在编队标签页中更改人员与位置。' },
    'hint.depart': { ko: '선택한 지역의 적과 출정 준비를 확인합니다. Party와 출정 방식을 고른 뒤 출발하세요.', en: 'Review this area’s enemies and your preparations. Choose a Party and departure mode, then deploy.', zh: '确认所选区域的敌人与出征准备。选择Party和出征方式后出发。' },
    'hint.cell': { ko: '같은 지역 안에서 도전할 칸을 고릅니다. 칸마다 적 구성과 진행 조건을 확인하세요.', en: 'Choose a stage within this area. Check its enemies and progression requirements.', zh: '在同一区域内选择要挑战的关卡。请确认每个关卡的敌人构成与推进条件。' },
    'hint.departure': { ko: '한 번 출정할지 반복할지 고릅니다. 출발하면 선택한 Party의 준비 상태가 적용됩니다.', en: 'Choose a single or repeating expedition. Deployment uses the selected Party’s preparation.', zh: '选择出征一次还是循环出征。出发时将沿用所选Party的准备状态。' },
    'hint.foes': { ko: '이 지역에 등장하는 적입니다. 초상과 스킬에 마우스를 올리면 자세히 볼 수 있습니다.', en: 'The enemies found in this area. Hover their portraits and skills for details.', zh: '此区域出现的敌人。将鼠标移到头像和技能上可查看详情。' },
    'hint.story': { ko: '선택한 지역의 배경 이야기입니다.', en: 'The background story of the selected area.', zh: '所选区域的背景故事。' },
    'hint.tactics': { ko: '칸마다 작전 카드 한 장 — 전투 규칙 하나와 옵션 줄 둘을 듭니다. 카드를 누르면 가방의 카드를 장착하거나 분해합니다.', en: 'Each slot holds one tactic card with a battle rule and two option lines. Select a slot to open the card bag, where you can equip or dismantle cards.', zh: '每个栏位可装备一张战术卡。每张卡有一条战斗规则和两条词条。点击卡槽即可打开卡包，装备或分解卡牌。' },   // 2026-11-26 R586
    'hint.potions': { ko: '이 Party가 함께 쓸 물약과 순서입니다. 재고가 모자란 칸은 빈 채로 출발합니다.', en: 'The potions and drinking order shared by this Party. Slots without enough stock start empty.', zh: '此Party共用的药水及饮用顺序。库存不足的格子将空着出发。' },
    'hint.reports': { ko: '지난 원정 결과를 골라 보상과 전투 기록을 확인합니다.', en: 'Select a past expedition to review its rewards and battle record.', zh: '选择过去的远征结果，查看奖励与战斗记录。' },
    'hint.drops': { ko: '이 원정에서 얻은 아이템입니다. 아이템에 마우스를 올리면 옵션을 확인할 수 있습니다.', en: 'Items obtained in this expedition. Hover an item to inspect its options.', zh: '此次远征获得的物品。将鼠标移到物品上可查看词条。' },
    'hint.contribution': { ko: '영웅별 전투 기여를 비교합니다. 가한·받은 피해와 처치·전투불능 기록을 함께 살펴보세요.', en: 'Compare each hero’s contribution. Review damage dealt and taken, kills and fallen-hero records together.', zh: '比较每名英雄的战斗贡献。请一并查看造成与受到的伤害，以及击杀与倒下记录。' },
    'hint.battle_totals': { ko: '현재까지 재생된 전투의 가한·받은 피해 누계입니다. 요약과 스킬별 보기로 비교할 수 있습니다.', en: 'Damage dealt and taken during the battle played so far. Switch between summary and per-skill views to compare.', zh: '截至目前已回放战斗中造成与受到的伤害累计。可切换总览与按技能查看进行比较。' },
    'hint.equipment': { ko: '선택한 영웅이 착용한 장비입니다. 장비에 마우스를 올리면 옵션을 확인할 수 있습니다.', en: 'Equipment worn by the selected hero. Hover an item to see its options.', zh: '所选英雄穿戴的装备。将鼠标移到装备上可查看词条。' },
    'hint.sins': { ko: '착용 장비의 죄종 구성입니다. 영웅의 죄종과 장비의 죄종은 별개입니다.', en: 'The Sins of the equipped items. A hero’s Sin and equipment Sins are separate.', zh: '所穿戴装备的罪宗构成。英雄的罪宗与装备的罪宗彼此独立。' },
    'hint.skills': { ko: '이 영웅이 사용하는 스킬입니다. 스킬 그림에 마우스를 올리면 효과를 확인할 수 있습니다.', en: 'Skills used by this hero. Hover a skill icon to inspect its effects.', zh: '此英雄使用的技能。将鼠标移到技能图标上可查看效果。' },
    'hint.auto_salvage': { ko: '이 Party의 원정에서 자동 분해할 장비를 정합니다. 남길 희귀도와 단어를 확인하세요.', en: 'Choose which drops this Party automatically salvages. Check the rarities and words you want to keep.', zh: '设定此Party远征时自动分解的装备。请确认要保留的稀有度与词。' },
    'hint.salvage': { ko: '고른 장비를 분해합니다. 남길 장비가 포함되지 않았는지 확인하세요.', en: 'Salvage the selected equipment. Check that no items you want to keep are included.', zh: '分解所选装备。请确认其中没有要保留的装备。' },
    'hint.inventory': { ko: '보유한 아이템을 확인하고 장착하거나 정리합니다. 아이템에 마우스를 올리면 자세히 볼 수 있습니다.', en: 'Inspect, equip and manage owned items. Hover an item for details.', zh: '查看持有的物品，进行装备或整理。将鼠标移到物品上可查看详情。' },
    'hint.stash': { ko: '따로 보관할 아이템을 두는 곳입니다. 아이템을 가방과 보관함 사이로 옮길 수 있습니다.', en: 'A place to set items aside. Move items between the bag and stash.', zh: '另行存放物品的地方。物品可在背包与仓库之间移动。' },
    'hint.skill_slots': { ko: '스킬을 얻은 경로별 사용 칸입니다. 빈 칸에는 스킬을 여는 조건이 표시됩니다.', en: 'Skill slots grouped by how the skills are learned. Empty slots show their unlock requirements.', zh: '按技能获得途径划分的技能栏。空栏会显示开启技能的条件。' },
    'hint.skill_points': { ko: '스킬을 배우고 강화하는 데 쓰는 포인트입니다. 배분할 트리와 남은 포인트를 확인하세요.', en: 'Points used to learn and improve skills. Check the available trees and remaining points.', zh: '用于学习和提升技能的点数。请确认可分配的技能树与剩余点数。' },
    'hint.construction': { ko: '건물을 골라 랭크를 올리면 새 기능과 상한이 열립니다. 상세에서 비용과 조건을 확인하세요.', en: 'Select buildings and raise their ranks to unlock features and limits. Check costs and requirements in the details.', zh: '选择建筑并升阶，即可开启新功能与上限。请在详情中确认费用与条件。' },
    'hint.building': { ko: '이 건물이 연 기능과 다음 랭크 정보를 확인합니다. 건설하려면 표시된 조건과 재료가 필요합니다.', en: 'Review this building’s unlocked features and next rank. Construction requires the listed conditions and materials.', zh: '查看此建筑已开启的功能与下一阶信息。建设需要满足所示条件并备齐材料。' },
    'hint.building_ranks': { ko: '각 랭크에서 열리는 기능과 조건입니다. 이미 지은 랭크와 앞으로 지을 랭크를 비교할 수 있습니다.', en: 'Features and requirements for each rank. Compare completed ranks with future upgrades.', zh: '各阶开启的功能与条件。可比较已建成的阶与之后要建的阶。' },
    'hint.next_rank': { ko: '다음 랭크의 효과·조건·비용입니다. 필요한 재료를 갖추면 건설할 수 있습니다.', en: 'The next rank’s effects, requirements and cost. Build it when the required materials are ready.', zh: '下一阶的效果、条件与费用。备齐所需材料即可建设。' },
    'hint.advance': { ko: '조건을 갖춘 영웅의 전직 계열을 고릅니다. 확정하기 전에 계열과 사용할 스킬을 확인하세요.', en: 'Choose an advancement path for an eligible hero. Review the path and its skills before confirming.', zh: '为满足条件的英雄选择转职分支。确定前请确认分支与将使用的技能。' },
    'hint.resource': { ko: '각 줄의 생산과 연구를 관리합니다. 줄 카드는 현황을, 연구 칸은 다음 효과와 비용을 보여 줍니다.', en: 'Manage each line’s production and research. Line cards show progress; research nodes show upcoming effects and costs.', zh: '管理每条线的生产与研究。线卡片显示当前状况，研究节点显示下一级效果与费用。' },
    'hint.resource_next': { ko: '선택한 연구의 다음 레벨입니다. 비용과 시간을 확인한 뒤 연구를 시작합니다.', en: 'The selected research node’s next level. Review its cost and duration before starting.', zh: '所选研究的下一级。确认费用与时间后开始研究。' },
    'hint.resource_levels': { ko: '이 연구의 레벨별 효과입니다. 현재 효과와 다음 레벨에서 달라지는 값을 비교하세요.', en: 'Effects at each research level. Compare current effects with the changes at the next level.', zh: '此研究各等级的效果。请比较当前效果与下一级中变化的数值。' },
    'hint.resource_lines': { ko: '선택한 줄의 생산·진행 상태입니다. 건설과 연구로 해당 줄의 기능을 넓힐 수 있습니다.', en: 'Production and progress for the selected line. Buildings and research expand its capabilities.', zh: '所选线的生产与进度状态。可通过建设与研究扩展该线的功能。' },
    'hint.resource_effects': { ko: '이 줄에 등록한 영웅들의 능력치로 더해지는 효과입니다. 배치를 바꾸면 적용 값도 달라집니다.', en: 'Effects added by the attributes of heroes registered to this line. Changing assignments changes the applied values.', zh: '按派驻到此线的英雄属性追加的效果。调整派驻后，生效数值也会改变。' },
    'hint.assignment': { ko: '이 줄에 효과를 더할 영웅을 등록합니다. 등록된 영웅을 다시 누르면 해제할 수 있습니다.', en: 'Register a hero to add effects to this line. Select a registered hero again to remove the assignment.', zh: '派驻英雄为此线追加效果。再次点击已派驻的英雄可取消派驻。' },
    'hint.minigame': { ko: '선택한 자원 줄의 미니게임입니다. 화면의 조작 안내를 확인하고 시작하세요.', en: 'A minigame for the selected resource line. Review its controls before starting.', zh: '所选资源线的小游戏。请确认画面上的操作说明后开始。' },
    'hint.explore': { ko: '탐험권 한 장과 편성을 골라 보냅니다. 판을 끝까지 깨면 모은 것을 받습니다.', en: 'Send a party with one exploration ticket. Clear the whole run to receive the haul.', zh: '选择一支编队，消耗一张探索票券即可出发。完成整趟探索才能领取途中收集的战利品。' },
    'hint.recruit': { ko: '후보 영웅을 확인하고 골드를 내어 고용합니다.', en: 'Inspect candidate heroes and spend gold to hire them.', zh: '查看候选英雄，支付金币雇佣。' },
    'hint.visitors': { ko: '수색 영웅이 찾아온 영웅입니다. 카드를 골라 고용하거나 떠나보낼 수 있습니다.', en: 'Heroes your searchers brought back. Select a card to hire or dismiss a candidate.', zh: '搜寻英雄带回的英雄。选择卡片即可雇佣或送走。' },
    'hint.commissions': { ko: '의뢰를 받아 목표를 채우고 보상을 받습니다. 의뢰 카드에서 조건과 진행도를 확인하세요.', en: 'Accept commissions, complete their objectives and claim rewards. Check each card’s conditions and progress.', zh: '接受委托，完成目标后领取奖励。请在委托卡片上确认条件与进度。' },
    'hint.gamble': { ko: '판돈을 고르고 슬롯을 돌립니다. 심볼 조합에 따른 배당은 배당표에서 확인할 수 있습니다.', en: 'Choose a stake and spin the slots. The payout table shows rewards for symbol combinations.', zh: '选择赌注并转动老虎机。各符号组合的赔付可在赔率表中查看。' },
    'hint.payouts': { ko: '당첨 조합과 배당입니다. 판돈과 함께 확인하면 한 판의 보상을 비교할 수 있습니다.', en: 'Winning combinations and their payouts. Compare them with your chosen stake.', zh: '中奖组合与赔付。结合赌注查看，可比较每次的奖励。' },
    'hint.forge_up': { ko: '장비를 골라 강화합니다. 다음 단계의 변화와 필요한 재료를 확인한 뒤 진행하세요. 낮은 단계는 실패해도 비용만 나가고, 중간 단계는 실패하면 한 단계 내려갈 수 있으며, 높은 단계는 장비가 부서질 수 있습니다. 부서진 장비는 분해한 것과 같은 재료를 남깁니다. 등급이 높을수록 성공 확률이 낮고, 성공의 일부는 대성공으로 더 크게 오릅니다.', en: 'Select equipment to upgrade. Review the next step’s changes and required materials. At low levels a failure only spends the cost; at middle levels it can drop the item one level; at high levels the item can break. A broken item leaves the same materials as salvaging it. Higher grades have lower success chances, and some successes are great successes that raise more.', zh: '选择装备进行强化。请确认下一级的变化与所需材料后再进行。低阶段失败只消耗费用；中阶段失败可能下降1级；高阶段装备可能损毁。损毁的装备会留下与分解相同的材料。稀有度越高，成功几率越低；部分成功会成为大成功，提升更多。' },
    'hint.forge_ench': { ko: '레어 이상 장비에 옵션 한 줄을 더합니다. 다시 하면 새 줄과 원래 줄 중 하나를 고릅니다.', en: 'Adds one option line to a Rare or better item. Enchanting again lets you keep either the new line or the current one.', zh: '为稀有及以上装备附加一条词条。再次附魔时可在新词条与原有词条中选择其一。' },
    'hint.forge_synth': { ko: '같은 종류의 아래 단계 재료를 써서 위 단계 재료를 만듭니다. 합성에 쓴 재료는 소모됩니다.', en: 'Combine lower-tier materials into a higher tier of the same material. Combining consumes the input materials.', zh: '用同类低一级别的材料合成高一级别的材料。合成所用的材料会被消耗。' },
    'hint.forge_craft': { ko: '크래프트는 준비 중입니다. 현재는 제작·강화·합성을 이용할 수 있습니다.', en: 'Craft is in development. Smithing, upgrading and combining are currently available.', zh: '打造功能尚未开放。目前可使用制作、强化与合成。' },
    'hint.temper': { ko: '셋 중 하나를 골라 재료를 내면 다음 강화 한 번에 효과가 붙습니다. 달구기는 성공 확률, 덧대기는 대성공 비율을 올리고, 막기는 강등이나 파괴를 막을 확률을 줍니다. 막기는 강등이나 파괴가 있는 단계에서만 쓸 수 있습니다. 재료 단계는 장비 레벨과 등급이 정하며, 높을수록 효과가 큽니다.', en: 'Pick one of three and spend its material to boost your next upgrade. Heat raises the success chance, Reinforce raises the great-success share, and Guard gives a chance to prevent a downgrade or break. Guard can only be used at steps where a downgrade or break is possible. The material tier is set by the item level and grade; higher tiers give bigger effects.', zh: '三选一并支付材料，下一次强化即获得效果。加热提高成功几率，加固提高大成功比例，防护提供防止降级或损毁的几率。防护只能在可能降级或损毁的阶段使用。材料级别由装备等级与稀有度决定，级别越高效果越大。' },
    'hint.trade': { ko: '받을 최하급 재료를 선택한 뒤 다른 재료 또는 골드로 구매합니다. 지불 수단별 가격과 보유량을 확인할 수 있습니다.', en: 'Choose a lowest-grade material to receive, then buy it with another material or gold. Each payment option shows its cost and available stock.', zh: '选择要获得的最低级材料，再用其他材料或金币购买。可查看各支付方式的价格与持有量。' },
    'hint.special': { ko: '특수 상단 기능은 준비 중입니다.', en: 'The special trader is in development.', zh: '行商功能尚未开放。' },
    'hint.help': { ko: '폴더를 고르거나 궁금한 말을 검색해 조작법과 게임 규칙을 찾아봅니다.', en: 'Choose a folder or search a term to find controls and game rules.', zh: '选择文件夹或搜索想了解的词语，查找操作方法与游戏规则。' },
    'hint.settings': { ko: '그림체와 전투 연출 등 화면 설정을 조절합니다.', en: 'Adjust display preferences such as art style and battle effects.', zh: '调整画风、战斗演出等画面设置。' },
    'hint.mail': { ko: '도착한 보상을 수령합니다. 받은 첨부물은 표시된 Party의 보유 아이템에 추가됩니다.', en: 'Claim delivered rewards. Attachments are added to the items of the indicated Party.', zh: '领取送达的奖励。领取的附件会加入所示Party的持有物品。' },
    'hint.dismiss': { ko: '선택한 영웅을 로스터에서 해고합니다. 확인 전에 대상 영웅을 다시 살펴보세요.', en: 'Dismiss the selected hero from the roster. Review the chosen hero before confirming.', zh: '将所选英雄从名册中解雇。确认前请再次查看该英雄。' },
    'hint.frozen': { ko: '다른 탭에서 저장한 진행을 보호하기 위해 이 탭의 플레이가 멈췄습니다. 안내에 따라 다시 불러오세요.', en: 'Play in this tab has stopped to protect progress saved by another tab. Follow the instructions to reload.', zh: '为保护其他标签页保存的进度，此标签页的游戏已停止。请按提示重新载入。' },
    /* ── 셸 ── */
    'app.title': { ko: 'The Seven Simulation RPG — 화면 목업', en: 'The Seven Simulation RPG — Screen Mockup', zh: 'The Seven Simulation RPG——画面样稿' },
    // 세로 창 막 (SCREEN_DESIGN §2 · ADR-0371)
    'app.turn.title': { ko: '기기를 가로로 돌려 주세요', en: 'Rotate your device to landscape', zh: '请将设备横置' },
    'app.turn.full': { ko: '전체 화면 + 가로 고정', en: 'Fullscreen + lock landscape', zh: '全屏 + 锁定横屏' },
    'app.turn.skip': { ko: '이대로 계속하기', en: 'Continue as is', zh: '保持现状继续' },
    // 손가락 툴팁 버튼 줄 — [세부] = Alt 를 누른 것과 같다 (SCREEN_DESIGN §2 「터치 조작」 · ADR-0374)
    'tip.touch.alt': { ko: '세부', en: 'Details', zh: '详情' },
    // [범위] = Shift 를 누른 것과 같다 — 아이템 툴팁의 옵션 줄 범위 (SCREEN_DESIGN §2 「터치 조작」 · ADR-0617)
    'tip.touch.range': { ko: '범위', en: 'Range', zh: '范围' },
    /* ── 새 게임 (2026-08-24) ── */
    'ng.h': { ko: '새 게임', en: 'New Game', zh: '新游戏' },
    'ng.title': { ko: '첫 파티', en: 'Your First Party', zh: '初始队伍' },   // 화면 제목 그림(「FIRST PARTY」)의 대체 글 + 도움말 「새 게임」 절 머리 (SCREEN_DESIGN §3 · ADR-1241)
    /* Tip 줄 — 판 안 맨 위 한 줄 · 굴릴 때마다 다음 팁 (SCREEN_DESIGN §3 · ADR-1237). 목록은 `app.js:NG_TIPS` — 초반에 쓸모 있는 문장만 */
    'ng.tipLabel': { ko: 'Tip.', en: 'Tip.', zh: '提示' },
    'ng.tip.tavern': { ko: '영웅은 나중에 선술집에서 더 고용할 수 있습니다', en: 'You can hire more heroes at the Tavern later', zh: '之后可以在酒馆雇佣更多英雄' },
    'ng.sub': {
        ko: '이 {n}명이 그대로 시작 영웅 로스터가 됩니다 — 마음에 들 때까지 다시 굴려도 됩니다',
        en: 'These {n} become your starting roster — reroll as many times as you like',
        zh: '这{n}名英雄将直接成为初始英雄名册——可以反复重掷，直到满意为止',
    },
    'ng.roll': { ko: '{n}번째 굴림', en: 'Roll {n}', zh: '第{n}次掷骰' },
    'ng.reroll': { ko: '다시 굴리기', en: 'Reroll', zh: '重掷' },
    'ng.start': { ko: '이 셋으로 시작', en: 'Start with these', zh: '以这三人开始' },
    /* ⚠ 부르는 곳 0 (2026-09-01) — 후보 카드에서 시작 특성 줄을 걷었다 (SCREEN_DESIGN §3).
       값(`hero.trait`)은 살아 있고 화면에만 없다. 다시 보이게 할 자리는 영웅 툴팁(§5)이 1순위라 키는 남긴다 */
    'ng.trait': { ko: '시작 특성', en: 'Starting Trait', zh: '初始特性' },
    'ng.total': { ko: '능력치 합', en: 'Attribute Total', zh: '属性总和' },
    /* 능력치 범례 — 첫 카드 왼쪽 일곱 줄 (SCREEN_DESIGN §3 · ADR-0943). 대표 효과만 짧게 — 전부는 `st.desc.*`(올리면 서는 카드) */
    'ng.attrHead': { ko: '능력치가 하는 일', en: 'What each stat does', zh: '属性的作用' },
    'ng.attr.str': { ko: '평타 · 물리 스킬 피해', en: 'Physical damage', zh: '普攻 · 物理技能伤害' },
    'ng.attr.agi': { ko: '공격 · 캐스팅 속도', en: 'Attack · casting speed', zh: '攻击 · 施法速度' },
    'ng.attr.int': { ko: '마법 스킬 피해', en: 'Magic skill damage', zh: '魔法技能伤害' },
    'ng.attr.vit': { ko: '레벨업 HP · 버프 지속시간', en: 'Level-up HP · buff time', zh: '升级生命 · 增益持续时间' },
    'ng.attr.luck': { ko: '치명타 피해 · 드랍률 · 골드', en: 'Crit damage · loot · gold', zh: '暴击伤害 · 掉落率 · 金币' },
    'ng.attr.ldr': { ko: '아군 버프 · 리더면 파티 전술', en: 'Buffs · tactics as leader', zh: '友方增益 · 任队长时的队伍战术' },
    'ng.attr.cha': { ko: '회복량 · 받는 디버프 시간 감소', en: 'Healing · shorter debuffs', zh: '治疗量 · 缩短所受减益时间' },
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
        zh: '初始队伍为<b>稀有1 + 魔法1 + 普通1</b>——从第一个画面起，英雄名册就能看出<b>层次</b>。15名唯一英雄是固定名单，不会在开局消耗<br>基础属性按各轴分别掷骰，但<b>总和落在稀有度决定的区间</b>内（各稀有度的区间<b>可能重叠</b>）——三张卡的差异有数量与<b>形状</b>两方面：稀有 · 普通分布均匀，魔法则<b>可能在某一轴上大幅突出</b>。装备和升级都不会提高属性，所以这里掷出的数值<b>伴随一生</b><br><b>稀有度的差距会持续到最后</b>——上限对所有英雄相同，但升级不会提高属性，所以<b>掷出的形状就是该英雄的终点</b><br>主罪宗决定罪宗专精（标签1）与派遣适性——装备契合（套装点数）<b>已废弃</b>——移至队伍战术<br>重掷<b>无限且免费</b>——不让开局选择变成赌博<br><b>未确定</b>：稀有度区间 · 分布形状 · 出现比重（均为提案值）· 特性效果（只掷出名称）· 职业对主力轴的偏向强度 · 是否允许罪宗 · 职业重复',
    },

    /* ── 새 게임 · 세이브 (2026-08-25) ── */
    // 메뉴 — 켜면 먼저 선다 · 새 게임(`ng.h`) 아래 (SCREEN_DESIGN §3 · ADR-0641 · app.js:renderMenu) · 뒤로가기(ADR-0643)
    'mn.load': { ko: '불러오기', en: 'Load Game', zh: '读取' },
    'mn.loading': { ko: '그림 불러오는 중 {p}%', en: 'Loading art {p}%', zh: '正在加载图像{p}%' },   // 켤 때 그림 미리 받기 막대 (SCREEN_DESIGN §3 · ADR-1080)
    'ng.back': { ko: '뒤로가기', en: 'Back', zh: '返回' },
    'ng.hasSave': { ko: '저장된 게임 있음 — {t}', en: 'A saved game exists — {t}', zh: '已有存档——{t}' },
    'ng.saveLine': { ko: '영웅 {h}명 · 클리어 {c} · 골드 {g}', en: '{h} heroes · {c} cleared · {g} gold', zh: '英雄{h}名 · 通关{c} · 金币{g}' },
    'ng.oldSave': {
        ko: '이전 형식(v{v})의 세이브입니다 — 이 버전에서는 이어할 수 없습니다. 새 게임으로 시작합니다',
        en: 'This save is an older format (v{v}) and cannot continue in this version. Start a new game',
        zh: '此存档为旧格式（v{v}），无法在此版本中继续。将开始新游戏',
    },
    'ng.overwrite': { ko: '게임 시작', en: 'Start Game', zh: '开始游戏' },   // 열 수 있는 세이브가 있을 때의 시작 버튼 — 누르면 확인 창(`ng.overwriteAsk`) (SCREEN_DESIGN §3 · ADR-1437)
    'ng.overwriteAsk': { ko: '저장된 게임이 삭제됩니다.', en: 'Your saved game will be deleted.', zh: '已保存的游戏将被删除。' },
    // 계정으로 불러오기 창의 두 번 누름 첫 누름 (§2-1) — 새 게임 시작은 확인 창으로 옮겼다(ADR-1437)
    'ng.overwriteConfirm': { ko: '정말 지울까요? 한 번 더 누르면 지웁니다', en: 'Really? Click again to delete', zh: '确定要删除吗？再按一次即删除' },
    'ng.startWeapon': { ko: '직업 전속 무기군의 무기 1개를 쥐고 시작', en: 'Starts with one weapon from a class-exclusive weapon group', zh: '开局手持1把职业专属武器类别的武器' },

    // 멈춤 창 — 같은 브라우저의 다른 탭이 세이브를 썼다 (SCREEN_DESIGN §2-1)
    'cl.frozen.h': { ko: '다른 탭에서 게임 실행 중', en: 'The game is open in another tab', zh: '游戏正在其他标签页中运行' },
    'cl.frozen.reload': { ko: '이 탭에서 이어하기', en: 'Continue in this tab', zh: '在此标签页继续' },
    // 아이디 계정 (SCREEN_DESIGN §2-1 「계정」 · §2-2 · §3 · ADR-1263) — 계정 멈춤 창 · 메뉴 · 계정 창 둘 · 오류는 `acct.err.<결과 코드>`
    'cl.frozen.acctH': { ko: '다른 곳에서 이 계정으로 게임을 열었습니다', en: 'This account is already in use elsewhere', zh: '此账号已在别处打开游戏' },
    'mn.checking': { ko: '확인 중…', en: 'Checking…', zh: '正在检查…' },
    'mn.acctLoad': { ko: '계정으로 불러오기', en: 'Load from Account', zh: '读取账号存档' },
    'mn.acctOn': { ko: '계정 {id}', en: 'Account {id}', zh: '账号 {id}' },
    'acct.newH': { ko: '계정 만들기', en: 'Create Account', zh: '创建账号' },
    'acct.loginH': { ko: '계정으로 불러오기', en: 'Load from Account', zh: '读取账号存档' },
    'acct.id': { ko: '아이디', en: 'ID', zh: '账号名' },
    'acct.pw': { ko: '비밀번호', en: 'Password', zh: '密码' },
    'acct.pw2': { ko: '비밀번호 확인', en: 'Confirm password', zh: '确认密码' },
    'acct.idPh': { ko: '영문 소문자 · 숫자 · _ (3~16자)', en: '3–16 characters: a–z, 0–9 or _', zh: '3–16 个字符，可用小写英文字母、数字和下划线' },
    'acct.note': { ko: '비밀번호를 잊으면 게임 안에서는 찾을 수 없습니다', en: 'A forgotten password can\'t be recovered in-game', zh: '忘记密码后，无法在游戏内找回' },
    'acct.create': { ko: '만들기', en: 'Create', zh: '创建' },
    'acct.load': { ko: '불러오기', en: 'Load', zh: '读取' },
    'acct.loadOver': { ko: '이 브라우저 세이브를 지우고 불러오기', en: 'Replace this browser\'s save with the account save', zh: '删除此浏览器的存档并读取账号存档' },
    'acct.busy': { ko: '확인 중…', en: 'Checking…', zh: '正在检查…' },
    'acct.made': { ko: '계정 {id} 을(를) 만들었습니다', en: 'Account {id} created', zh: '账号 {id} 已创建' },
    'acct.err.badId': { ko: '아이디는 영문 소문자 · 숫자 · _ 3~16자입니다', en: 'ID: 3–16 lowercase letters, digits or _', zh: '账号名须为 3–16 个字符，只能使用小写英文字母、数字和下划线' },
    'acct.err.weak': { ko: '비밀번호는 6자 이상입니다', en: 'Password must be at least 6 characters', zh: '密码至少需要 6 个字符' },
    'acct.err.mismatch': { ko: '두 비밀번호가 다릅니다', en: 'The passwords don\'t match', zh: '两次输入的密码不一致' },
    'acct.err.taken': { ko: '이미 쓰는 아이디입니다', en: 'That ID is already taken', zh: '该账号名已被使用' },
    'acct.err.linked': { ko: '이미 계정에 묶여 있습니다', en: 'Already linked to an account', zh: '已绑定账号' },
    'acct.err.wrong': { ko: '아이디나 비밀번호가 틀렸습니다', en: 'Wrong ID or password', zh: '账号名或密码错误' },
    'acct.err.busy': { ko: '시도가 너무 많습니다 — 잠시 뒤에 다시 하세요', en: 'Too many attempts — try again later', zh: '尝试次数过多，请稍后再试' },
    'acct.err.off': { ko: '계정 기능이 아직 꺼져 있습니다', en: 'Accounts aren\'t enabled yet', zh: '账号功能尚未启用' },
    'acct.err.network': { ko: '연결하지 못했습니다', en: 'Couldn\'t connect', zh: '连接失败' },
    'acct.err.read': { ko: '세이브를 받지 못했습니다', en: 'Couldn\'t load the save', zh: '无法读取存档' },
    'acct.err.dev': { ko: '개발 환경에서는 계정을 쓰지 않습니다', en: 'Accounts are off in development', zh: '开发环境中未启用账号功能' },

    /* ── 프롤로그 (2026-09-03 · SCREEN_DESIGN §3-1) ──
       원문은 docs/game_design/story/prologue.md의 다섯 씬이다. 영어 · 중국어는 같은 문단 구성을 따른다.
       줄바꿈은 이스케이프로 들어간다 — **빈 줄(`\n\n`)이 문단을 가르고**(app.js:renderPrologue 가 `<p>` 로 접는다) 한 줄 바꿈은 CSS(pre-line)가 편다 */
    'pro.h': { ko: '프롤로그', en: 'Prologue', zh: '序章' },
    /* 맨 윗줄 — 프롤로그 씬(1~3)이 든다. Chapter 1 씬(4~5)은 그 자리를 `pro.end` 가 가져간다 (SCREEN_DESIGN §3-1) */
    'pro.title': { ko: 'Prologue. 그날 밤', en: 'Prologue. That Night', zh: '序章 · 那一夜' },
    'pro.step': { ko: '{n} / {m}', en: '{n} / {m}', zh: '{n} / {m}' },
    'pro.back': { ko: '뒤로', en: 'Back', zh: '返回' },
    'pro.next': { ko: '다음', en: 'Next', zh: '下一步' },
    'pro.skip': { ko: '건너뛰기', en: 'Skip', zh: '跳过' },
    'pro.begin': { ko: '시작', en: 'Begin', zh: '开始' },

    'pro.s1.h': { ko: '왕좌', en: 'The Throne', zh: '王座' },
    'pro.s1.b': {
        ko: '지옥에는 왕이 있었다. 대악마 바알이었다.\n\n'
            + '이 땅의 모든 것이 그의 것이었다.\n바알은 자신의 일곱 감정을 나누어 부하들에게 깃들게 했다.\n분노, 시기, 탐욕, 나태, 폭식, 색욕, 오만.\n\n'
            + '왕좌 아래 일곱 부하는 그의 명을 기다렸다.',
        en: 'Hell had a king. His name was Baal, the archdemon.\n\n'
            + 'Everything in this land was his.\nBaal divided his seven emotions among his servants.\nWrath, Envy, Greed, Sloth, Gluttony, Lust, Pride.\n\n'
            + 'At the foot of the throne, the seven servants waited for his command.',
        zh: '地狱曾有一位王。他便是大恶魔巴尔。\n\n'
            + '这片土地上的一切都属于他。\n巴尔将自己的七种情感分给了部下。\n愤怒、嫉妒、贪婪、怠惰、暴食、色欲、傲慢。\n\n'
            + '王座之下，七名部下等候他的命令。',
    },

    'pro.s2.h': { ko: '배신의 밤', en: 'Night of Betrayal', zh: '背叛之夜' },
    'pro.s2.b': {
        ko: '유난히 어두웠던 어느 날 밤, 일곱 개의 칼이 바알의 등에 꽂혔다.\n\n'
            + '돌아본 자리에는 낯익은 얼굴들이 서있었다.\n맞서 싸우려 했으나, 이미 힘을 뺏긴 뒤였다.\n\n'
            + '누군가 열쇠를 넘겼다. 바알은 뒤로 밀려났다. 발밑이 무너졌다.\n왕좌가, 그를 내려보는 얼굴들이, 지옥의 붉은 빛이 위로 멀어져 갔다.',
        en: 'One unusually dark night, seven blades sank into Baal’s back.\n\n'
            + 'He turned and saw familiar faces.\nHe tried to fight back, but his power had already been taken from him.\n\n'
            + 'Someone had handed over the key. Baal was forced back. The ground gave way beneath him.\nThe throne, the faces looking down at him, the red light of Hell all receded above him.',
        zh: '在一个格外漆黑的夜晚，七把刀刺进了巴尔的后背。\n\n'
            + '他回过头，看见一张张熟悉的面孔。\n他想还击，力量却早已被夺走。\n\n'
            + '有人交出了钥匙。巴尔被逼得连连后退。脚下的地面塌了。\n王座、俯视他的那些脸，还有地狱的红光，都在他上方渐渐远去。',
    },

    'pro.s3.h': { ko: '추락', en: 'The Fall', zh: '坠落' },
    'pro.s3.b': {
        ko: '돌아보았을 때 본 얼굴들이 하나씩 흐려졌다.\n칼이 정말 일곱이었는지조차 알 수 없었다.\n\n'
            + '살을 태우는 통증이 밀려왔다. 바알의 몸에 낙인이 새겨지고 있었다.\n\n'
            + '다시 싸우려면 그의 명을 따라 칼을 들 자들이 필요했다.\n\n'
            + '<em>내 등에 칼을 꽂은 놈들을 하나씩 찾아내겠다.</em>',
        en: 'The faces he had seen when he turned began to fade, one by one.\nHad there really been seven blades? He could no longer tell.\n\n'
            + 'Pain seared his flesh. A brand was being burned into his body.\n\n'
            + 'To fight again, he would need people who would take up arms at his command.\n\n'
            + '<em>I’ll find the ones who put their blades in my back, one by one.</em>',
        zh: '回头时看见的面孔一张张模糊了。\n就连那些刀是不是真有七把，他都说不准。\n\n'
            + '灼烧般的剧痛袭来。巴尔身上正被刻下一道烙印。\n\n'
            + '要再战一场，他就得找到肯听他号令、为他举刀的人。\n\n'
            + '<em>那些在我背后捅刀的家伙，我要一个个找出来。</em>',
    },

    'pro.s4.h': { ko: '마을', en: 'The Village', zh: '村庄' },
    'pro.s4.b': {
        ko: '눈을 떴을 때, 늙은 인간이 그의 입에 물을 흘려 넣고 있었다.\n인간이 된 바알은 제 힘으로 고개조차 들 수 없었다.\n\n'
            + '며칠 동안 마을 사람들은 제 몫의 빵을 떼어 그에게 먹였다.\n\n'
            + '<em>왜 이것들은 나를 살리려 하는가.</em>',
        en: 'When he opened his eyes, an old human was trickling water into his mouth.\nNow human, Baal could not even lift his head on his own.\n\n'
            + 'For days the villagers broke pieces off their own bread to feed him.\n\n'
            + '<em>Why are these creatures trying to keep me alive?</em>',
        zh: '他睁开眼时，一个年迈的人类正往他嘴里喂水。\n如今巴尔成了人，连自己抬起头都做不到。\n\n'
            + '一连几天，村民们都从自己的面包上掰下一块喂给他。\n\n'
            + '<em>这些东西为什么要救我？</em>',
    },

    'pro.s5.h': { ko: '불길', en: 'Flames', zh: '烈焰' },
    'pro.s5.b': {
        ko: '마을에 불길이 치솟았다. 사탄의 군세였다.\n바알이 지옥에서 추방한 자가 여기까지 쫓아왔다.\n\n'
            + '바알은 마을에서 모은 용병들을 향해 손을 들었다.',
        en: 'Flames rose over the village. Satan’s army had come.\nThe one Baal had banished from Hell had pursued him all the way here.\n\n'
            + 'Baal raised his hand to the mercenaries he had gathered in the village.',
        zh: '村里燃起了大火。撒旦的大军来了。\n那个被巴尔逐出地狱的家伙一路追到了这里。\n\n'
            + '巴尔朝他在村中召集的佣兵举起了手。',
    },
    /* 마지막 씬에만 선다 — 본문과 층이 다르다 (SCREEN_DESIGN §3-1) */
    'pro.s5.q': { ko: '“길을 열어라. 사탄에게 간다.”', en: '“Clear a path. We’re going after Satan.”', zh: '“开路。我们去找撒旦。”' },
    'pro.end': { ko: 'Chapter 1. 분노 / 불타는 전장', en: 'Chapter 1. Wrath / Burning Battlefield', zh: '第1章 · 愤怒 / 燃烧战场' },

    /* ── 원정 (실동작) ── */
    'exp.noParty': { ko: '영웅 편성', en: 'Assign heroes', lock: true, zh: '编入英雄' },
    'exp.departAdvancing': { ko: '편성에 전직 중인 영웅 있음', en: 'A hero in this party is advancing', zh: '编队中有正在转职的英雄' },
    'exp.departExploring': { ko: '편성에 탐험 나간 영웅 있음', en: 'A hero in this party is out exploring', zh: '编队中有外出探索的英雄' },
    'exp.departRespawn': { ko: '보스가 아직 돌아오지 않음', en: 'The boss has not returned yet', zh: '首领尚未重新出现' },   // 챕터보스 재등장 대기 (R240 · ADR-0590)
    // 출정 확인 창의 문장 — 문구는 사용자 지시 그대로다 (SCREEN_DESIGN §4-1 · ADR-0467)
    'exp.departBusy': { ko: '파티 내에 다른 행동을 실행중인 영웅이 있습니다. 그래도 출격할까요?', en: 'A hero in this party is busy with another task. Deploy anyway?', zh: '队伍中有英雄正在执行其他行动。仍要出击吗？' },
    'exp.departLevelGap': { ko: '파티 평균 Lv.{avg} · 전장 Lv.{level} — 레벨 차이 {gap}. 그래도 출격할까요?', en: 'Party average Lv.{avg}, battlefield Lv.{level}: a gap of {gap}. Deploy anyway?', zh: '队伍平均Lv.{avg} · 战场Lv.{level}——等级差{gap}。仍要出击吗？' },   // 출정 확인 창 (R418 · ADR-1025)
    'exp.departCut': { ko: '이 파티는 지금 원정 중입니다. 진행 중인 원정을 접고 새로 출격할까요?', en: 'This party is on an expedition. End the current run and deploy anew?', zh: '此队伍正在远征。要中止当前远征并重新出击吗？' },
    // 탐험에 나가 있는 제 편성을 보낸다 — 진행 중 = 불러들인다 · 끝났다 = 결과를 받는다 · 다 안 들면 거절 (SCREEN_DESIGN §4-1 · ADR-1182)
    'exp.departRecall': { ko: '이 파티는 지금 탐험 중입니다. 진행 중인 탐험을 불러들이고 출격할까요? 모은 것과 탐험권를 잃습니다.', en: 'This party is out exploring. Call the run back and deploy? The haul and the ticket will be lost.', zh: '这支编队正在探索。要召回并派去远征吗？已收集的战利品和探索票券都会损失。' },
    'exp.departBagFull': { ko: '탐험 결과를 받을 인벤토리 칸 부족', en: 'Not enough inventory space for the exploration haul', zh: '背包空位不足，无法收取探索结果' },
    'exp.locked': { ko: '이전 스테이지 클리어', en: 'Clear the previous stage', lock: true, zh: '需通关上一关卡' },
    // 잠긴 장의 한 줄 — 그 장을 여는 앞 장 보스 (SCREEN_DESIGN §4-1 · §8-4 · ADR-0719 · R319). {ch} = 보스 칸의 장(`game.chapterGate`)
    'exp.chNeed': { ko: '{ch}장 보스 클리어', en: 'Clear the Ch{ch} boss', lock: true, zh: '需击败第{ch}章首领' },
    // 난이도 탭 바로 옆 — 다음에 열릴 단의 조건 (SCREEN_DESIGN §4-1 · ADR-0586 · ADR-0596). {d} = 앞 단 이름 · {ch} = `balance.csv:difficulty_unlock_chapter`
    'exp.diff.need': { ko: '{d} {ch}장 보스 클리어', en: 'Clear the {d} Ch{ch} boss', lock: true, zh: '需击败{d}第{ch}章首领' },
    /* 칸 한 줄 — 출정 창 머리의 잔글씨 [개정 2026-10-17 · SCREEN_DESIGN §4-1 · ADR-0649 — 소요 · 원소를 걷어 레벨만]. {lv} = 고른 난이도의 몬스터 레벨 */
    'exp.stageMeta': { ko: '레벨 {lv}', en: 'Level {lv}', zh: '等级{lv}' },
    /* 출정 창 머리의 헬 장 디버프 한 줄 [2026-10-28 · SCREEN_DESIGN §4-1 · ADR-0935] — {sin} = 그 장 죄종 이름 · {fx} = 아래 효과 한 마디.
       효과 값은 그 칸의 값(챕터보스 칸은 배수) — {v} = 값 % · {i} = 거는 간격 초 · {d} = 거는 시간 초 · {c} = 폭식 상한 % */
    'exp.debuffLine': { ko: '{sin} — {fx}', en: '{sin} — {fx}', zh: '{sin}——{fx}' },
    'exp.debuff.taken_pct': { ko: '받는 피해 +{v}%', en: 'Damage taken +{v}%', zh: '受到伤害+{v}%' },
    'exp.debuff.poison': { ko: '{i}초마다 중독 {d}초 · 초당 최대 체력의 {v}%', en: 'Poison for {d}s every {i}s · {v}% of max HP per second', zh: '每{i}秒中毒，持续{d}秒 · 每秒扣除最大生命的{v}%' },
    'exp.debuff.heal_cut': { ko: '받는 회복 −{v}%', en: 'Healing received −{v}%', zh: '受到治疗−{v}%' },
    'exp.debuff.freeze': { ko: '{i}초마다 결빙 {d}초 · 행동 속도 −{v}%', en: 'Freeze for {d}s every {i}s · Action speed −{v}%', zh: '每{i}秒冻结，持续{d}秒 · 行动速度−{v}%' },
    'exp.debuff.feast': { ko: '몬스터 데미지 초당 +{v}% · 최대 +{c}%', en: 'Monster damage +{v}% per second · up to +{c}%', zh: '怪物伤害每秒+{v}% · 最多+{c}%' },
    /* 장소 줄 잔글씨 맨 앞의 레벨 — `Lv23` [2026-10-21 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0710 · ADR-0711]. {lv} = 칸 I 의 고른 난이도 몬스터 레벨(숫자 하나 — ~~범위~~) */
    'exp.placeLv': { ko: 'Lv{lv}', en: 'Lv{lv}', zh: 'Lv{lv}' },
    /* 장소 줄 잔글씨의 챕터보스 이름 — 「분노의 사탄」 [2026-10-17 사용자 지시 · SCREEN_DESIGN §4-1 · ADR-0649]. {sin} = 죄종 이름 · {name} = 몬스터 이름 */
    'exp.sinBoss': { ko: '{sin}의 {name}', en: '{name} of {sin}', zh: '{sin}之{name}' },
    /* 출발 칸 줄의 라벨 — 출정 창 출정 방식 칸 맨 위 [2026-09-29 · SCREEN_DESIGN §4-1 · ADR-0437 — 위험도 줄(ADR-0104)을 걷은 자리] */
    'exp.cell.h': { ko: '출발 칸', en: 'Starting stage', zh: '出发关卡' },
    // 반복 원정 [개정 2026-09-29 · SCREEN_DESIGN §4-1 · ADR-0432 — PLAN_stage_segments D8] — 켬 = 장소 안 순환 · 끔 = 이길 때마다 다음 칸. 어느 쪽이든 원정은 멈추지 않는다.
    //   버튼 글자는 기획 용어(반복 켬 · 끔)라 그대로다 — 뜻은 툴팁(`exp.repeat.tip`)과 도움말(`exp.repeat.sub`)이 든다
    'exp.repeat': { ko: '반복 원정', en: 'Auto-repeat', zh: '自动循环' },
    'exp.repeat.tip': {
        ko: '켜면 이 장소의 칸을 돌아가며 싸웁니다 · 끄면 이길 때마다 다음 칸으로 나아갑니다',
        en: "On: loop through this area's stages · Off: move on to the next stage after each win",
        zh: '开启后在此区域的关卡间轮流战斗 · 关闭后每次胜利都前进到下一关',
    },
    'exp.repeat.sub': {
        ko: '원정은 <b>멈추지 않습니다</b> — 런이 끝나면 곧 다음 런이 나가고, 멈추는 길은 <b>철수</b>와 <b>게임 끄기</b> 둘뿐입니다 · <b>게임이 켜져 있는 동안만</b> 돕니다<br>'
            + '이기면 다음 칸 · 지면(전원 전투불능 · 제한시간 초과) 같은 칸을 다시 돕니다 · 챕터보스에게 지면 바로 앞 칸으로 돌아갑니다 · <b>반복을 켜면</b> 그 장소의 칸 I → II → III → I 을 돌고, <b>끄면</b> 순서의 다음 칸으로 나아갑니다(다음 칸이 잠겼으면 같은 칸 · 다음 난이도를 여는 보스를 이기면 다음 난이도의 1-1) · 칸마다 새 런이라 전원 회복한 채 나갑니다',
        en: 'Expeditions <b>never stop on their own</b> — when a run ends the next one heads out shortly; only <b>Retreat</b> or <b>closing the game</b> stops them · they run <b>only while the game is open</b><br>'
            + 'A win moves on to the next stage · a loss (whole party downed · timed out) runs the same stage again · a loss to a chapter boss goes back to the previous stage · <b>with repeat on</b> the party loops through the area\'s stages I → II → III → I; <b>with it off</b> it moves on to the next stage in order (the same stage again if the next is locked · beating the boss that unlocks the next difficulty moves on to that difficulty\'s 1-1) · every stage is a new run, so everyone heads out recovered',
        zh: '远征<b>不会自行停止</b>——一场结束后，下一场很快就会出发，停止的方法只有<b>撤退</b>与<b>关闭游戏</b>两种 · <b>仅在游戏开启期间</b>运行<br>胜利则前进到下一关 · 失败（全员倒下 · 超时）则重打同一关 · 败给章节首领则退回前一关 · <b>开启自动循环</b>时在该区域的关卡 I → II → III → I 间轮转，<b>关闭</b>时按顺序前进到下一关（下一关未解锁则重打同一关 · 击败开启下一难度的首领后进入下一难度的1-1）· 每关都是新的一场，全员恢复后出发',
    },
    // 재접속 알림(`exp.notice.*` — 「부재 중」)은 2026-11-15 삭제 — 다시 켜도 안 뜬다 (ADR-1178)

    /* ── 리포트 (실동작) ── */
    'rep.defeat': { ko: '패배', en: 'Defeat', zh: '失败' },
    'rep.retreat': { ko: '철수', en: 'Retreat', zh: '撤退' },
    /* ~~'rep.healed'(귀환 — 전원 회복)~~ 은 2026-09-08 삭제 — 전투불능은 **기록**이라 뒤에 붙일 말이 없다 (SCREEN_DESIGN §4-3) */
    'rep.reason.wipe': { ko: '전원 전투불능', en: 'Whole party downed', zh: '全员倒下' },
    'rep.reason.timeout': { ko: '제한시간 초과', en: 'Timed out', zh: '超时' },
    'rep.reason.retreat': { ko: '철수', en: 'Retreated', zh: '撤退' },
    'rep.reason.closed': { ko: '게임이 꺼져 끊김', en: 'Cut off — the game was closed', zh: '游戏关闭导致中断' },

    'rep.roundsCleared': { ko: '{n} / {total}', en: '{n} / {total}', zh: '{n} / {total}' },
    'rep.discarded': { ko: '가방이 가득 차 {n}개 분해', en: '{n} salvaged — bag was full', zh: '背包已满，分解了{n}件' },   // 넘친 드롭은 가루가 된다 (ADR-0625 · 2026-10-14)
    /* 도감 카드 줄 셋(rep.cards · rep.cardsNone · rep.cardLevelUp)은 2026-09-21 삭제 — 도감 카드를 걷었다 (monster_design §8 · SCREEN_DESIGN §4-3) */
    /* 빗나감 — 레벨 · 명중 부족의 신호 (battle_design §9-8 · 마법 무기는 안 빗나간다 — R219). 파티 기준 {맞지 않은 타격}/{총 타격} */
    'rep.miss': { ko: '빗나감', en: 'Misses', zh: '未命中' },
    'rep.missN': { ko: '{m} / {n} ({p}%)', en: '{m} / {n} ({p}%)', zh: '{m} / {n}（{p}%）' },

    /* ── 캐릭터 (실동작) ── */
    'ch.equip.hint': { ko: '클릭 = 고르기 · 우클릭 = [착용] · [잠금] 버튼 · 착용 칸 우클릭 = 해제 · Ctrl+클릭이나 끌어 놓기 = 창고 ↔ 인벤토리',
        zh: '点击 = 选择 · 右键 = [装备] · [锁定]按钮 · 右键已装备的栏位 = 卸下 · Ctrl+点击或拖放 = 仓库 ↔ 背包',
        en: 'Click = select · right-click = [Equip] · [Lock] buttons · right-click a worn slot = unequip · Ctrl+click or drag = move between stash and inventory' },
    // 보관 칸 우클릭 메뉴 — 커서 자리에 버튼 둘 · 손가락은 길게 누른 툴팁 버튼 줄 (SCREEN_DESIGN §6 「우클릭 메뉴」 · ADR-0451)
    'ch.menu.equip': { ko: '착용', en: 'Equip', zh: '装备' },
    'ch.menu.unequip': { ko: '해제', en: 'Unequip', zh: '卸下' },   // 착용 칸 손가락 툴팁의 버튼 — 우클릭과 같은 해제 (ADR-1306)
    'ch.menu.lock': { ko: '잠금', en: 'Lock', zh: '锁定' },
    'ch.menu.unlock': { ko: '잠금 해제', en: 'Unlock', zh: '解锁' },
    'ch.menu.open': { ko: '사용', en: 'Use', zh: '使用' },   // 상자 칸에만 서는 버튼 — 상자를 여는 유일한 길(칸 클릭은 안 연다 · ADR-0733)
    // 첫 클리어 상자 칸 · 툴팁 · 까는 플래시 (SCREEN_DESIGN §6 · ADR-0731 · ADR-0742 · R328 · R333)
    'box.weapon': { ko: '무기 상자', en: 'Weapon Chest', zh: '武器宝箱' },
    'box.armor': { ko: '방어구 상자', en: 'Armor Chest', zh: '防具宝箱' },
    'box.part.weapon': { ko: '무기', en: 'Weapon', zh: '武器' },
    'box.part.armor': { ko: '방어구', en: 'Armor', zh: '防具' },
    // 상자 등급 — 이름 앞 낱말 · 툴팁의 희귀도 줄 (base_expedition_design §1-6 「등급」 · ADR-0776 · R349)
    'box.named': { ko: '{tier} {box}', en: '{tier} {box}', zh: '{tier}{box}' },
    'box.tier.low': { ko: '하급', en: 'Low-Grade', zh: '低级' },
    'box.tier.mid': { ko: '중급', en: 'Mid-Grade', zh: '中级' },
    'box.tier.high': { ko: '고급', en: 'High-Grade', zh: '高级' },
    'box.rarity': { ko: '{lo} ~ {hi}', en: '{lo} – {hi}', zh: '{lo}～{hi}' },
    'box.for': { ko: '{hero}에게 맞는 Lv {lv} {part}', en: '{part} for {hero} · Lv {lv}', zh: '适合{hero}的Lv {lv}{part}' },
    'box.opened': { ko: '상자 개봉 — {name}', en: 'Chest opened — {name}', zh: '宝箱已开启——{name}' },
    // 우편함 — 상단바 편지봉투 · 창 (SCREEN_DESIGN §2 「상단바」 · ADR-0732 · R328)
    'mail.h': { ko: '우편함', en: 'Mailbox', zh: '邮箱' },
    'mail.from': { ko: '{stage} · {diff} 첫 클리어', en: '{stage} · {diff} First Clear', zh: '{stage} · {diff}首通' },   // 우편 카드의 둘째 줄 — 어디서 받았나 (ADR-0748)
    'mail.count': { ko: '우편 {n}통', en: 'Mail {n}', zh: '{n}封邮件' },
    // 메인미션 — 상단바 골드 오른쪽 두루마리 판 (SCREEN_DESIGN §2 「메인미션」 · ADR-1232 · R524) · 받기 · 모두 받기 · 바로가기는 mail.claim · mail.claimAll · nt.shortcut
    'mm.h': { ko: '메인미션', en: 'Main Missions', zh: '主线任务' },
    'mm.count': { ko: '메인미션 · 받을 보상 {n}', en: { one: 'Main Missions · {n} reward to claim', other: 'Main Missions · {n} rewards to claim' }, zh: '主线任务 · 待领取奖励{n}个' },
    'mm.new': { ko: '메인미션 · 새 미션', en: 'Main Missions · new mission', zh: '主线任务 · 新任务' },   // 안 본 다음 미션의 빨간 점이 섰을 때 아이콘 이름 (ADR-1245)
    'mm.have': { ko: '{have} / {need}', en: '{have} / {need}', zh: '{have} / {need}' },
    'mm.done': { ko: '메인미션을 모두 마쳤습니다', en: 'All main missions are complete', zh: '主线任务已全部完成' },
    'mm.none': { ko: '보상 없음', en: 'No reward', zh: '无奖励' },
    'mm.book': { ko: '스킬북', en: 'Skill Book', zh: '技能书' },
    'mm.bubble': { ko: '미션 완료 — {name}', en: 'Mission complete — {name}', zh: '任务完成 — {name}' },
    'mm.bubbleN': { ko: '미션 {n}개 완료', en: { one: '{n} mission complete', other: '{n} missions complete' }, zh: '完成{n}个任务' },
    'mm.claimed': { ko: '보상을 받았습니다', en: 'Reward claimed', zh: '已领取奖励' },
    'mm.claimedMail': { ko: '보상을 받았습니다 — 창고가 차서 상자는 우편함으로 갔습니다', en: 'Reward claimed — the stash is full, so the chest went to the mailbox', zh: '已领取奖励 — 仓库已满，宝箱已送往邮箱' },
    'mm.err.notMet': { ko: '아직 채우지 않은 미션입니다', en: 'This mission is not complete yet', zh: '该任务尚未完成' },
    'mm.err.claimed': { ko: '이미 받은 보상입니다', en: 'Already claimed', zh: '奖励已领取' },
    'mm.err.missing': { ko: '없는 미션입니다', en: 'Unknown mission', zh: '不存在的任务' },
    // 미션 이름 = 「{where}에서 {무엇을} 하기」 — {where} = 그 미션을 하는 탭의 메뉴 이름(`app.js:mmLabel` 이 `nav.<탭>` 을 넣는다 · 2026-11-26 · ADR-1420)
    'mm.c.battle': { ko: '{where}에서 파티 보내기', en: 'Send a party out in {where}', zh: '在{where}派出队伍' },
    'mm.c.build': { ko: '{where}에서 {building} 짓기', en: 'Build the {building} in {where}', zh: '在{where}建造{building}' },
    'mm.c.buildRank': { ko: '{where}에서 {building} {n}랭크 짓기', en: 'Build {building} rank {n} in {where}', zh: '在{where}将{building}建到{n}级' },
    'mm.c.clear': { ko: '{where}에서 {place} 보스 처치하기', en: 'Defeat the {place} boss in {where}', zh: '在{where}击败{place}的首领' },
    'mm.c.fame': { ko: '{where}에서 의뢰 보상 받기', en: 'Claim a commission reward at the {where}', zh: '在{where}领取委托奖励' },
    'mm.c.research': { ko: '{where}에서 연구 시작하기', en: 'Start a research in the {where}', zh: '在{where}开始研究' },
    'mm.c.runs': { ko: '{where}에서 {n}부대 동시에 보내기', en: 'Run {n} parties at once in {where}', zh: '在{where}同时派出{n}支队伍' },
    'mm.c.reg': { ko: '{where}에서 {line} 줄에 영웅 등록하기', en: 'Register a hero to {line} in the {where}', zh: '在{where}为{line}登记英雄' },
    'mm.c.count.upgrade': { ko: '{where}에서 장비 강화하기', en: 'Upgrade a piece of gear at the {where}', zh: '在{where}强化装备' },
    'mm.c.count.gamble': { ko: '{where}에서 도박장 한 판 하기', en: 'Play a round of gambling at the {where}', zh: '在{where}的赌坊玩一局' },
    'mm.c.count.explore': { ko: '{where}에서 파티 보내기', en: 'Send a party out in {where}', zh: '在{where}派出队伍' },
    'mm.c.count.tacticEquip': { ko: '{where}에서 작전 카드 장착하기', en: 'Equip a tactic card in {where}', zh: '在{where}装备一张战术卡' },   // 1장 「처음 한 번」 줄 (R583 · 2026-11-26 R586 — 옛 「전술 리롤」)
    'mm.c.event.mastery': { ko: '{where}에서 마스터리 포인트 찍기', en: 'Spend a mastery point in {where}', zh: '在{where}分配一点专精点数' },
    'mm.c.event.take': { ko: '{where}에서 의뢰 받기', en: 'Take a commission at the {where}', zh: '在{where}接取一项委托' },
    'mm.c.event.sell': { ko: '{where}에서 장비 판매하기', en: 'Sell a piece of gear at the {where}', zh: '在{where}出售一件装备' },
    'mm.c.event.potion': { ko: '{where}에서 물약 구매하기', en: 'Buy a potion at the {where}', zh: '在{where}购买一瓶药水' },
    'mm.c.event.salvage': { ko: '{where}에서 장비 분해하기', en: 'Salvage a piece of gear in {where}', zh: '在{where}分解一件装备' },
    // 1장 튜토리얼 — 두루마리 아래 팻말 머리 · 길 안내 단계마다 설명 말풍선 `mm.tut.<미션>.<단계>` (2026-11-25 · SCREEN_DESIGN §2 「메인미션」 · ADR-1381 · `app.js:MM_TUTORIAL`)
    'mm.tut': { ko: '튜토리얼', en: 'Tutorial', zh: '新手教学' },
    'mm.tut.c1_depart.tab': { ko: '원정은 파티를 장소에 보내 싸우게 하는 곳입니다. 전투는 알아서 진행되고, 주운 장비와 재료는 인벤토리에 쌓입니다.', en: 'Expeditions send your party out to fight. Battles play out on their own, and the gear and materials they find pile up in your inventory.', zh: '在远征中，你可以派出编队前往各地战斗。战斗自动进行，找到的装备和材料会放入背包。' },
    'mm.tut.c1_depart.place': { ko: '싸울 장소를 고릅니다. 장소마다 칸이 이어져 있어 이기면 다음 칸으로 넘어가고, 마지막 칸에서는 그 장소의 보스가 기다립니다.', en: "Choose an area to fight in. Win a stage to advance to the next one. The area boss awaits in the final stage.", zh: '先选一个战斗地点。每个地点都有相连的关卡，获胜就能进入下一关，最后一关有该地点的首领。' },
    'mm.tut.c1_depart.send': { ko: '보내면 파티가 알아서 싸웁니다. 원정은 게임이 켜져 있는 동안에만 진행됩니다. 꺼 둔 동안에는 연구소가 일합니다.', en: 'Once deployed, your party fights automatically. Expeditions progress while the game is open. The Laboratory keeps working while you are away.', zh: '派出编队后，英雄会自动战斗。远征只在游戏开启时推进。关闭游戏期间，研究所仍会工作。' },
    'mm.tut.c1_storage.tab': { ko: '건설은 골드로 건물을 짓는 곳입니다. 건물을 지으면 잠겨 있던 기능이 하나씩 열립니다.', en: 'Spend gold in Construction to build facilities and unlock new features.', zh: '在建设页可以花费金币建造建筑。每建好一座建筑，都会解锁新的功能。' },
    'mm.tut.c1_storage.lot': { ko: '건물을 고르면 오른쪽에 그 건물이 여는 기능이 나옵니다. 창고를 지으면 연구소의 자원 줄이 열립니다.', en: "Select a building to see its unlocks in the panel on the right. Building Storage opens the Laboratory's Resources line.", zh: '选中建筑即可在右侧查看它能解锁哪些功能。建造仓库会解锁研究所的资源线。' },
    'mm.tut.c1_storage.build': { ko: '창고를 지으면 연구소의 자원 줄이 열리고, 자원 줄은 게임을 꺼 둔 동안에도 재료를 모읍니다. 비용을 내면 바로 지어집니다.', en: "Building Storage opens the Laboratory's Resources line, which keeps gathering materials even while the game is closed. Pay the cost and it is built at once.", zh: '建造仓库即可解锁研究所的资源线，关闭游戏后也能继续收集材料。支付费用后，仓库立即建成。' },
    'mm.tut.c1_reg.tab': { ko: '연구소는 게임을 꺼 둔 동안에도 일하는 곳입니다. 줄마다 영웅을 등록해야 그 줄이 돌아갑니다.', en: 'The Laboratory keeps working while the game is closed. Assign at least one hero to each line you want to run.', zh: '关闭游戏后，研究所也会继续工作。每条线都要派驻至少一名英雄才会开始运作。' },
    'mm.tut.c1_reg.line': { ko: '빈 칸을 눌러 자원 줄에서 일할 영웅을 고릅니다.', en: 'Click the empty slot to choose a hero for the Resources line.', zh: '点击空栏位，选择要派驻到资源线的英雄。' },
    'mm.tut.c1_reg.hero': { ko: '등록한 영웅도 원정에는 그대로 나갈 수 있습니다. 자원 줄은 영웅이 많을수록 빨리 모입니다.', en: 'Assigned heroes can still go on expeditions. Each hero on the Resources line helps gather materials faster.', zh: '派驻的英雄仍可参加远征。派驻的英雄越多，资源线收集材料就越快。' },
    'mm.tut.c1_reg.apply': { ko: '적용하면 등록이 끝나고 줄이 돌기 시작합니다. 꺼 둔 동안 모인 재료는 다시 접속하면 들어와 있습니다.', en: 'Select [Apply] to assign the hero and start production. Materials gathered while you are away will be in stock when you return.', zh: '点击应用，英雄就会进驻，产线随即开始运作。下次回来时，离线期间收集的材料已存入库存。' },
    'mm.c.event.hire': { ko: '{where}에서 영웅 고용하기', en: 'Hire a hero at the {where}', zh: '在{where}雇佣英雄' },
    'mm.c.event.book': { ko: '{where}에서 스킬북 배우기', en: 'Learn from a skill book in the {where}', zh: '在{where}学习技能书' },
    'mm.c.event.equip': { ko: '{where}에서 장비 장착하기', en: 'Equip a piece of gear in {where}', zh: '在{where}穿戴装备' },
    'mm.c.spot.ruins': { ko: '{where}에서 폐허로 파티 보내기', en: 'Send a party to the Ruins in {where}', zh: '在{where}向废墟派出队伍' },
    'mail.fromMission': { ko: '메인미션', en: 'Main Missions', zh: '主线任务' },   // 메인미션 상자가 창고에 못 들어가 온 우편 (R524)
    'mail.claim': { ko: '받기', en: 'Claim', zh: '领取' },
    'mail.claimAll': { ko: '모두 받기', en: 'Claim All', zh: '全部领取' },
    'mail.claimed': { ko: '우편 {n}통 수령', en: 'Claimed {n} mail', zh: '已领取{n}封邮件' },
    // 상단바 종 — 다음 할 일과 처리 대기 결과. 배지는 미확인 알림 + 미션이다(ADR-0998).
    'nt.h': { ko: '알림', en: 'Notifications', zh: '通知' },
    'nt.folder.notifications': { ko: '알림', en: 'Notifications', zh: '通知' },
    'nt.folder.achievements': { ko: '업적', en: 'Achievements', zh: '成就' },
    'nt.achievementsLocked': { ko: '업적 · 준비 중', en: 'Achievements · Coming soon', zh: '成就 · 准备中' },
    'nt.count': { ko: '알림 · {n}건', en: { one: 'Notifications · {n} item', other: 'Notifications · {n} items' }, zh: '通知 · {n}条' },   // 「미션」 폴더를 걷었다 — 원정 준비 점검도 알림 한 건 (ADR-1425)
    'nt.empty': { ko: '대기 중인 알림 없음', en: 'No pending tasks', zh: '没有待处理的通知' },
    'nt.shortcut': { ko: '바로가기', en: 'Go to', zh: '前往' },
    'nt.check': { ko: '확인', en: 'OK', zh: '确定' },
    'nt.arrived': { ko: '새 알림 {n}건', en: { one: '{n} new notification', other: '{n} new notifications' }, zh: '{n}条新通知' },
    'nt.kind.commission': { ko: '의뢰 목표 달성 · 보상 수령 가능', en: 'Commission goal met · Reward ready', zh: '委托目标达成 · 可领取奖励' },
    'nt.kind.explore': { ko: '탐험 판 끝 · 결과 보기', en: 'Exploration run over · View result', zh: '探索结束 · 查看结果' },
    'nt.kind.join': { ko: '가입 희망 영웅 도착', en: 'Hero awaiting recruitment', zh: '希望加入的英雄已到达' },
    'nt.kind.mastery': { ko: '스킬 포인트 사용 가능', en: 'Skill points available', zh: '有可用的技能点' },
    'nt.kind.offline': { ko: '오프라인 생산분 입고', en: 'Offline Production Received', zh: '离线产出已入库' },
    'nt.offline.gain': { ko: '{name} +{n}', en: '{name} +{n}', zh: '{name} +{n}' },
    'nt.offline.away': { ko: '미접속 {away}', en: 'Away for {away}', zh: '离线 {away}' },
    'nt.offline.capped': { ko: '미접속 {away} · 생산 최대 {time} 반영', en: 'Away for {away} · Up to {time} of production counted', zh: '离线 {away} · 最多计入 {time} 的产出' },
    'nt.offline.split': { ko: '미접속 {away} · 재료 {material} · 기타 {time} 반영', en: 'Away for {away} · Materials {material} · Other rewards {time} counted', zh: '离线 {away} · 材料计入 {material} · 其他奖励计入 {time}' },
    'nt.mastery.detail': { ko: '{hero} · Lv.{level} · 사용 가능 {n}포인트', en: { one: '{hero} · Lv.{level} · {n} point available', other: '{hero} · Lv.{level} · {n} points available' }, zh: '{hero} · Lv.{level} · 可用{n}点' },
    'nt.guide.retryPreparation': { ko: '원정 준비 점검', en: 'Review expedition preparation', zh: '检查远征准备' },
    'nt.retry.detail': {
        ko: 'Party {party} · {stage} · 최근 {n}회 연속 미클리어. 장비·마스터리·물약을 점검하고, 이전 구간에서 파밍해 보세요.',
        en: 'Party {party} · {stage} · {n} recent runs without a clear. Review gear, mastery and potions, or farm an earlier stage.',
        zh: 'Party {party} · {stage} · 最近连续{n}次未通关。请检查装备、专精与药水，或到之前的关卡刷装备。',
    },
    // 도움말이 받는 힌트 — 인게임 패널에는 규칙 문구를 안 둔다 (SCREEN_DESIGN §12)
    'ch.salvageHint': { ko: '장비를 우클릭해 [잠금]을 누르면 잠기거나 풀립니다. 잠근 장비는 분해되지 않습니다. [분해]를 누르면 분해함이 뜹니다. 장비를 눌러 함에 올리거나 등급 · 레벨 · 베이스 열에서 고르면 맞는 장비가 바로 함에 오르고, [분해하기]로 가루를 얻으면 필터가 풀립니다. 열을 여럿 고르면 모든 열에 맞는 것만 오르니, 베이스 옵션이 높은 장비는 베이스 열로 남길 수 있습니다. [자동 분해]는 부대마다 따로 정합니다. 등급 × 부위 칸마다 보존 · 베이스 · 분해를 고르고, 레벨 조건을 켜면 부대에서 가장 낮은 영웅 레벨보다 많이 낮은 장비를 분해합니다. 레벨 조건과 그 칸을 모두 만족해야 보존하고, [베이스] 칸은 베이스 옵션이 그 부위 문턱 이상인 것만 보존합니다. 유니크 · 크래프트는 언제나 보존합니다. 새로 들어오는 장비에만 걸리니 이미 가진 것은 [지금 인벤토리에 적용]을 눌러야 분해됩니다. 지금 규칙을 프리셋에 저장해 두면 다른 부대에서 불러올 수 있습니다',
        zh: '右键点击装备并按[锁定]，即可锁定或解锁。锁定的装备不会被分解。按[分解]会打开分解箱。点击装备放入箱中，或在稀有度 · 等级 · 基底列中挑选，符合的装备会立即放入箱中；用[执行分解]获得粉尘后，筛选会被清除。同时选择多列时，只有符合所有列的装备才会放入，因此基底词条高的装备可以借基底列保留下来。[自动分解]按小队分别设定。为每个稀有度 × 部位格选择保留 · 基底 · 分解；开启等级条件后，会分解远低于小队最低英雄等级的装备。须同时满足等级条件与该格设定才会保留；[基底]格只保留基底词条达到该部位门槛以上的装备。暗金 · 手工装备始终保留。只对新获得的装备生效，已持有的装备需点击[立即应用于背包]才会分解。将当前规则保存为预设后，可在其他小队读取',
        en: 'Right-click gear and press [Lock] to lock or unlock it. Locked gear is never salvaged. Press [Salvage] to open the Salvage Box: click gear to put it in, or pick from the rarity, level and base columns and the matching gear goes in at once — [Salvage now] turns it to dust and clears the picks. With several columns picked, only gear matching every column goes in, so you can keep high base-option gear out with the base column. [Auto salvage] is set per party. For each rarity × slot cell choose Keep, Base or Salvage, and turn on the level condition to salvage gear far below the party’s lowest hero level. Gear is kept only when it meets both the level condition and its cell; a Base cell keeps only gear whose base option is at or above that slot’s threshold. Uniques and crafted gear are always kept. Only new gear is checked — press [Apply to inventory now] to salvage what you already hold. Save the rules to a preset to load them on another party' },
    // 보관 두 칸의 이름 — 왼쪽 창고 / 오른쪽 인벤토리 (2026-09-11 · item_design §1 · SCREEN_DESIGN §6)
    'ch.bag.stash': { ko: '창고', en: 'Stash', zh: '仓库' },
    'ch.bag.inv': { ko: '인벤토리', en: 'Inventory', zh: '背包' },
    'ch.bag.equip': { ko: '장비', en: 'Gear', zh: '装备' },
    'ch.bag.mat': { ko: '재료', en: 'Materials', zh: '材料' },
    'ch.bag.book': { ko: '스킬북', en: 'Skill Books', zh: '技能书' },   // 창고 셋째 탭 — 가진 책 (2026-10-14 사용자 지시 · SCREEN_DESIGN §6 · ADR-0616)
    // 정렬 — 칸마다 제 [정렬] · 누르면 그 오른쪽으로 기준 셋이 나온다 (ADR-0242 · ADR-0247).
    //   영어는 「By」를 뺀다 — [Sort] 바로 옆에 서서 뜻이 이미 서고, 펼친 채로 도구 줄 한 줄에 들어가야 한다
    'ch.sort.start': { ko: '정렬', en: 'Sort', zh: '排序' },
    'ch.sort.rarity': { ko: '등급순', en: 'Rarity', zh: '按稀有度' },
    'ch.sort.ilvl': { ko: '레벨순', en: 'Level', zh: '按等级' },
    'ch.sort.slot': { ko: '부위순', en: 'Slot', zh: '按部位' },
    // 창고 스킬북 탭의 기준 셋 (2026-10-14 사용자 지시 · SCREEN_DESIGN §6 · ADR-0620)
    'ch.sort.count': { ko: '개수순', en: 'Count', zh: '按数量' },
    'ch.sort.class': { ko: '직업순', en: 'Class', zh: '按职业' },
    'ch.sort.tier': { ko: '티어순', en: 'Tier', zh: '按层级' },
    'ch.sortHint': { ko: '[정렬]은 누른 칸을 한 번 줄 세웁니다 — 등급순 · 레벨순 · 부위순 중 하나를 고르고, 높은 것이 앞에 섭니다. 그 뒤 들어오는 장비는 끝에 붙습니다',
        zh: '[排序]会将所点的面板排列一次——从按稀有度 · 按等级 · 按部位中选一项，高的排在前面。之后获得的装备会排在末尾',
        en: '[Sort] lines up that panel once — pick by rarity, by level or by slot, highest first. Gear that arrives afterwards goes to the end' },
    // 분해함 — [분해]로 띄우고 [취소] · Esc 로 닫는다 · 필터 세 열(누르면 바로 함에 오른다) · 가루 미리보기 (ADR-0184 · ADR-0673 · ADR-0695)
    'ch.sel.start': { ko: '분해', en: 'Salvage', zh: '分解' },
    'ch.sel.go': { ko: '분해하기', en: 'Salvage now', zh: '执行分解' },
    'ch.sel.cancel': { ko: '취소', en: 'Cancel', zh: '取消' },
    // 분해함 필터의 열 머리 (ADR-0673)
    'ch.sel.byRarity': { ko: '등급', en: 'Rarity', zh: '稀有度' },
    'ch.sel.byLevel': { ko: '레벨', en: 'Level', zh: '等级' },
    'ch.sel.byFixed': { ko: '베이스', en: 'Base', zh: '基底' },
    'ch.sel.title': { ko: '분해함', en: 'Salvage Box', zh: '分解箱' },
    // ~~'ch.sel.lift'~~ 는 2026-10-21 삭제 — 필터를 누르면 바로 함에 오른다 (ADR-0695)
    'ch.sel.dust': { ko: '가루 +{d}', en: 'Dust +{d}', zh: '粉尘+{d}' },
    'ch.sel.salvagedMats': { ko: '{n}개 분해 → {mats}', en: 'Salvaged {n} → {mats}', zh: '分解{n}个 → {mats}' },
    'ch.auto.previewMats': { ko: '지금 인벤토리 기준 분해 {n}개 · {mats}', en: 'Inventory now: salvage {n} · {mats}', zh: '按当前背包分解{n}个 · {mats}' },
    'ch.sel.full': { ko: '분해함 가득 참', en: 'The Salvage Box is full', zh: '分解箱已满' },
    'ch.sel.lockedNo': { ko: '잠긴 장비는 분해함에 올릴 수 없음', en: 'Locked gear cannot go in the Salvage Box', zh: '锁定的装备无法放入分解箱' },
    // 자동 분해 창 — 부대 하나의 규칙 · 프리셋 · 레벨 조건 · 등급 줄 · 문턱(베이스 · 단어) · 미리보기 · 최근 분해 (item_design §6-5 · SCREEN_DESIGN §6 · ADR-0717 · ADR-1207)
    'ch.auto.btn': { ko: '자동 분해', en: 'Auto salvage', zh: '自动分解' },
    'ch.auto.h': { ko: '자동 분해', en: 'Auto Salvage', zh: '自动分解' },
    'ch.auto.hNo': { ko: '자동 분해 · {p}', en: 'Auto Salvage · {p}', zh: '自动分解 · {p}' },
    'ch.auto.preset': { ko: '프리셋', en: 'Preset', zh: '预设' },
    'ch.auto.load': { ko: '불러오기', en: 'Load', zh: '读取' },
    'ch.auto.save': { ko: '저장', en: 'Save', zh: '保存' },
    'ch.auto.loaded': { ko: '프리셋 {n}에서 불러왔습니다', en: 'Loaded preset {n}', zh: '已从预设{n}读取' },
    'ch.auto.saved': { ko: '프리셋 {n}에 저장했습니다', en: 'Saved to preset {n}', zh: '已保存到预设{n}' },
    'ch.auto.lv': { ko: '레벨', en: 'Level', zh: '等级' },
    'ch.auto.lvOff': { ko: '안 봄', en: 'Off', zh: '不限' },
    'ch.auto.lvGap': { ko: '부대 최저 Lv −{g} 이상', en: 'Party min Lv −{g}+', zh: '小队最低Lv −{g}以上' },
    'ch.auto.lvGap0': { ko: '부대 최저 Lv 이상', en: 'Party min Lv+', zh: '小队最低Lv以上' },
    'ch.auto.th': { ko: '문턱', en: 'Min', zh: '门槛' },
    'ch.auto.m.keep': { ko: '보존', en: 'Keep', zh: '保留' },
    'ch.auto.m.base': { ko: '베이스', en: 'Base', zh: '基底' },
    'ch.auto.m.word': { ko: '단어', en: 'Word', zh: '词' },
    // 단어 문턱 고르개 — 어디까지(위 · 가운데 이상) × 몇 줄(하나라도 · 모두) (ADR-1207)
    'ch.auto.wTop': { ko: '위', en: 'Top', zh: '上' },
    'ch.auto.wMid': { ko: '가운데 이상', en: 'Middle+', zh: '中以上' },
    'ch.auto.wAny': { ko: '하나라도', en: 'Any line', zh: '任一条' },
    'ch.auto.wAll': { ko: '모두', en: 'All lines', zh: '全部' },
    'ch.auto.m.salvage': { ko: '분해', en: 'Salvage', zh: '分解' },
    'ch.auto.preview': { ko: '지금 인벤토리 기준 분해 {n}개 · 가루 +{d}', en: 'Inventory now: salvage {n} · dust +{d}', zh: '按当前背包分解{n}个 · 粉尘+{d}' },
    'ch.auto.log': { ko: '최근 분해', en: 'Recently salvaged', zh: '最近分解' },
    'ch.auto.logNone': { ko: '없음', en: 'None', zh: '无' },
    'ch.auto.apply': { ko: '지금 인벤토리에 적용', en: 'Apply to inventory now', zh: '立即应用于背包' },
    'ch.auto.confirm': { ko: '인벤토리의 장비 {n}개를 분해합니다', en: { one: '{n} item in the inventory will be salvaged', other: '{n} items in the inventory will be salvaged' }, zh: '将分解背包中的{n}件装备' },
    'ch.auto.ok': { ko: '확인', en: 'Confirm', zh: '确认' },
    // 출정 창 「들고 가는 것」의 자동 분해 칸 — 그 편성의 자동 분해 창을 연다 (SCREEN_DESIGN §4-1 · ADR-0717)
    'ex.salvEdit': { ko: '바꾸기', en: 'Edit', zh: '修改' },
    // ~~'ch.err.class'~~ 은 2026-10-06 삭제 — 09-10 장착 개방 뒤로 내는 곳이 없다. 거절 사유는 요구 레벨 하나 (R215 · ADR-0525)
    'ch.err.level': { ko: '레벨 부족', en: 'Level too low to equip', zh: '等级不足' },
    'ch.err.bagFull': { ko: '인벤토리 가득 참', en: 'Inventory is full', zh: '背包已满' },
    'ch.err.stashFull': { ko: '창고 가득 참', en: 'Stash is full', zh: '仓库已满' },
    'ch.err.missing': { ko: '아이템을 찾을 수 없음', en: 'Item not found', zh: '找不到物品' },
    'ch.err.sealed': { ko: '열지 않은 상자', en: 'Open the chest first', zh: '宝箱尚未开启' },   // 첫 클리어 상자 칸 — 장착 · 분해 · 강화 거절 (R328)
    // 결과 플래시 — 문장을 조각내 잇지 않는다. 건너뛴 것이 있으면 키째 다른 줄을 쓴다
    'ch.sel.salvaged': { ko: '{n}개 분해 → 가루 +{d}', en: 'Salvaged {n} → dust +{d}', zh: '分解{n}个 → 粉尘+{d}' },
    // ~~'ch.sel.salvagedSkip'~~ · ~~'ch.sel.allLocked'~~ 는 2026-10-20 삭제 — 잠긴 것은 분해함에 안 올라가 건너뛸 일이 없다 (ADR-0673)
    // 툴팁이 걷은 강화 규칙 문구가 앉는 자리다 (SCREEN_DESIGN §6 개정 2026-09-08 — 조건·규칙 주석은 도움말의 몫).
    // ⚠ 「강화 모드」는 09-03 에 폐기됐는데 문구만 남아 있었다 — 없는 토글을 찾게 만든다. 자리는 대장간(§8-2).
    // 2026-09-15 — 옵션 계단이 퇴역해(R95) 「{n}강마다 옵션」을 걷고 목걸이 · 반지의 강화 없음을 넣었다 (ADR-0125)
    'ch.upgradeHint': { ko: '강화는 대장간에서 합니다 — 골드로 한 단계씩 베이스 능력치를 올립니다. 목걸이 · 반지는 강화하지 않습니다',
        zh: '强化在铁匠铺进行——花费金币逐级提升基底属性。项链 · 戒指无法强化',
        en: 'Upgrading happens at the Blacksmith — one step at a time for gold, raising the base stat. Amulets and rings cannot be upgraded' },
    'ch.err.maxUp': { ko: '더 이상 강화할 수 없음', en: 'Already fully upgraded', zh: '已无法继续强化' },
    'ch.err.noBase': { ko: '베이스 능력치가 없어 강화할 수 없음', en: 'Nothing to upgrade — this item has no base stat', zh: '没有基底属性，无法强化' },
    /* 해고 (SCREEN_DESIGN §6 · 2026-09-09) — 창 하나가 세 상태를 든다: 막힘(장비) · 막힘(마지막) · 확인.
       규칙 설명이 아니라 **상태와 확인**이라 패널이 아닌 창에 선다 (ui 원칙 4) */
    'ch.dismiss': { ko: '해고', en: 'Dismiss', zh: '解雇' },
    /* 문구는 **사용자 지시 그대로**다 [개정 2026-09-09] — 옛 판(「장비를 모두 벗어야 해고할 수 있다 — 착용 {n}」)의
       착용 수 `{n}` 은 걷었다. 창은 「무엇을 해야 하나」만 말하고, 몇 개가 걸쳐 있는지는 창 뒤 페이퍼돌이 이미 보여 준다.
       ⚠ 이 두 줄만 **합니다체**다 — 지시 문구를 손대지 않는다. 나머지 문구의 평서체와 갈리는 것은 알고 둔 것이다 */
    'ch.dismiss.blocked': {
        ko: '영웅을 해고하려면 모든 장비를 해제해야 합니다.',
        en: 'All equipment must be unequipped before dismissing this hero.',
        zh: '解雇英雄前需卸下其全部装备。',
    },
    /* 오류 키는 결과 코드와 짝을 맞춘다(`<탭>.err.<코드>`) — 창이 미리 막으므로 플래시로는 잘 안 뜨지만,
       코드가 있으면 문구도 있어야 한다. `last` 는 창 본문도 이 키를 그대로 쓴다(같은 말을 두 키에 두지 않는다) */
    'ch.err.equipped': { ko: '장비 모두 해제', en: 'Unequip all gear', lock: true, zh: '卸下全部装备' },
    'ch.err.advancing': { ko: '전직 중인 영웅', en: 'That hero is advancing', zh: '英雄正在转职' },
    'ch.err.exploring': { ko: '탐험 나간 영웅', en: 'That hero is out exploring', zh: '英雄正在探索' },
    'ch.err.running': { ko: '원정 철수', en: 'Retreat from the expedition', lock: true, zh: '从远征撤退' },   // 원정은 저절로 안 끝난다 — 철수가 풀어 준다 (2026-09-29 · ADR-0433)
    'ch.err.last': { ko: '마지막 영웅은 해고할 수 없음', en: "Can't dismiss your last hero", zh: '无法解雇最后一名英雄' },
    /* ~~'ch.err.downed'~~ 은 2026-09-28 삭제 — 쓰러진 영웅도 장비를 바꾼다 (R176 · ADR-0400) */
    /* 확인 문구도 **사용자 지시 그대로** [개정 2026-09-09] — 옛 판(「{name} — 해고하면 되돌릴 수 없다」)의 `{name}` 은 걷었다.
       누구를 해고하는지는 창을 연 카드가 이미 말하고, 되돌릴 수 없다는 것은 **[취소] 버튼이 눈에 보이는 것**이 든다 */
    'ch.dismiss.confirm': { ko: '영웅을 해고합니다.', en: 'This hero will be dismissed.', zh: '将解雇该英雄。' },
    'ch.dismissed': { ko: '{name} 해고', en: '{name} dismissed', zh: '已解雇{name}' },
    'ch.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    'ch.upgraded': { ko: '강화 +{n} · {g}G', en: 'Upgraded to +{n} · {g}G', zh: '强化+{n} · {g}G' },
    'ch.noTrees': { ko: '마스터리는 실동작 · 전직 층은 미구현', en: 'Mastery is live; the advancement layer is not built yet', zh: '专精已可用 · 转职层尚未实装' },

    /* ── 선술집 (실동작) ── */
    'tv.hire': { ko: '고용 ({g} 골드)', en: 'Hire ({g} gold)', zh: '雇佣（{g}金币）' },
    'tv.roster.count': { ko: '보유 영웅 {n} / {cap}', en: 'Heroes {n} / {cap}', zh: '英雄 {n} / {cap}' },
    'tv.roster.buy': { ko: '보유 칸 +1 ({g} 골드)', en: 'Roster slot +1 ({g} gold)', zh: '名册栏位 +1（{g}金币）' },
    'tv.roster.bought': { ko: '영웅 보유 한도 {cap}명', en: 'Roster capacity increased to {cap}', zh: '英雄名册上限已增至 {cap}' },
    'tv.roster.lock': { ko: '선술집에서 보유 칸 구매', en: 'Buy a roster slot at the Tavern', zh: '在酒馆购买名册栏位' },
    // 보관한 명단 칸 — 2026-11-16 보관 삭제(R519) 뒤엔 옛 세이브의 다음 교체 전까지만 보인다
    'tv.empty.kept': { ko: '보관함 — 다음 교체 때 채워짐', en: 'Kept — refills on next refresh', zh: '已保留——下次刷新时补上' },
    'tv.reroll.wait': { ko: '교체까지 {t}', en: 'Refresh in {t}', zh: '{t}后刷新' },
    'tv.reroll.free': { ko: '후보 교체 (무료)', en: 'New candidates (free)', zh: '刷新候选（免费）' },
    'tv.err.cooldown': { ko: '후보 교체 대기 중', en: 'Candidate refresh is on cooldown', zh: '候选刷新冷却中' },
    'tv.empty': { ko: '고용함 — 다음 교체 때 채워짐', en: 'Hired — refills on next refresh', zh: '已雇佣——下次刷新时补上' },
    'tv.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    'tv.err.roster': { ko: '영웅 로스터 가득 참 ({cap})', en: 'Hero roster full ({cap})', zh: '英雄名册已满（{cap}）' },
    'tv.hired': { ko: '{name} 고용', en: 'Hired {name}', zh: '已雇佣{name}' },
    /* 수색 [2026-10-19 · SCREEN_DESIGN §8-1 · ADR-0671 — ~~수색 · 영웅 보내기 · 가입 희망~~ 대체] — 명단 셋째 칸(안내 · 고른 얼굴의 카드) · 오른쪽 열 2×2 */
    'tv.visit.h': { ko: '수색', en: 'Search', zh: '搜寻' },
    'tv.visit.full': { ko: '칸이 다 참 — 돌려보내야 새로 옴', en: 'Slots full — send someone away', zh: '等候位已满——送走一名才会有新人到来' },
    'tv.visit.drop': { ko: '돌려보내기', en: 'Send away', zh: '送走' },
    'tv.visit.dropped': { ko: '{name} 을(를) 돌려보냄', en: 'Sent {name} away', zh: '已送走{name}' },
    // 밖에서 기다리는 찾은 영웅 — 수색 영웅 몫 마지막 줄 · 카드 버튼 · 플래시 (SCREEN_DESIGN §8-1 · ADR-1201)
    'tv.visit.found': { ko: '찾았다! {name}', en: 'Found {name}!', zh: '找到了！{name}' },
    // 그 줄이 꽉 차 선술집에서 쉰다 — 이야기 대신 한 줄 (ADR-1256)
    'tv.visit.rest': { ko: '선술집에서 쉬는 중...', en: 'Resting at the tavern...', zh: '正在酒馆休息……' },
    // 거르기 — 수색이 데려올 최저 등급 · 수색 패널 제목 줄 세그먼트 · 연구소 레벨 목록의 기능 이름 (ADR-1257)
    'tv.visit.filter': { ko: '거르기', en: 'Filter', zh: '筛选' },
    'tv.visit.filter.normal': { ko: '일반 이상', en: 'Normal+', zh: '普通以上' },
    'tv.visit.filter.magic': { ko: '매직 이상', en: 'Magic+', zh: '魔法以上' },
    'tv.visit.filter.rare': { ko: '레어만', en: 'Rare only', zh: '仅稀有' },
    'tv.visit.ignore': { ko: '무시', en: 'Pass', zh: '忽略' },
    'tv.visit.ignored': { ko: '{name} 을(를) 두고 다시 수색', en: 'Passed on {name} — searching again', zh: '放过{name}，重新搜寻' },
    'tv.visit.gone': { ko: '이미 칸에 없음', en: 'No longer here', zh: '已不在等候位' },
    // 칸 띠 — 어떻게 왔나(출처 · `state.js:JOIN_SRC`). 찾아오는 방식이 늘면 한 줄씩 는다
    'tv.visit.src.visit': { ko: '방문', en: 'Visitor', zh: '来访' },
    'tv.visit.src.caravan': { ko: '마차', en: 'Caravan', zh: '马车' },
    // 안 열린 수색 칸의 툴팁 한 줄 — 그 칸을 여는 연구소 지점 레벨 「연구소 수색 · 대기소 Lv.2」 (§8-1 · §13-1 · ADR-1181)
    'tv.join.need': { ko: '{b} {line} · {node} Lv.{n}', en: '{b} {line} · {node} Lv.{n}', lock: true, zh: '{b} {line} · {node} Lv.{n}' },
    'tv.visit.src.tavern': { ko: '보관', en: 'Kept', zh: '保留' },
    // 안내 칸 = 수색 줄 등록 영웅 (SCREEN_DESIGN §8-1 · ADR-1125) — 이야기 문구는 `visit_story.csv` · 전직 상태 · 빈 줄
    'tv.visit.away.advance': { ko: '도서관에서 전직하는 중...', en: 'Advancing at the library...', zh: '正在图书馆转职……' },
    'tv.visit.reg.add': { ko: '연구소에서 등록', en: 'Assign in the Laboratory', zh: '在研究所派驻' },
    /* ── 시간 표기 ── */
    'time.hm': { ko: '{h}시간 {m}분', en: '{h}h {m}m', zh: '{h}小时{m}分钟' },
    'time.h': { ko: '{h}시간', en: '{h}h', zh: '{h}小时' },
    'time.m': { ko: '{m}분', en: '{m}m', zh: '{m}分钟' },
    'time.s': { ko: '{s}초', en: '{s}s', zh: '{s}秒' },
    'time.ms': { ko: '{m}분 {s}초', en: '{m}m {s}s', zh: '{m}分{s}秒' },
    /* ~~'injury.out'(출정 아웃)~~ 은 2026-09-08 삭제 — 「출정 아웃」 폐기(GAME_DESIGN §9 09-08 · SCREEN_DESIGN §4-3).
       아웃이 런을 넘지 않으므로 화면이 그릴 수 있는 시점에 아웃된 영웅이 없다 */

    /* ── 전투 재생 ── */
    'bt.won': { ko: '승리', en: 'Victory', zh: '胜利' },
    'bt.lost': { ko: '패배', en: 'Defeat', zh: '失败' },
    'bt.toReport': { ko: '리포트 보기', en: 'View report', zh: '查看报告' },
    /* 결과 띠의 세기 [2026-09-29 · SCREEN_DESIGN §4-2 · ADR-0430] — 언제나 다음 런을 센다. {name} = **다음 런의 칸**(`Ch1-1 이름` 태그).
       갈 칸이 바뀌면 「다음 칸」 · 같은 칸이면 「다시」. ~~bt.retry · bt.nextStage · bt.nextRun~~ 은 같은 날 삭제 — 두 버튼을 걷었다 */
    'bt.nextCell': { ko: '{s}초 뒤 다음 칸 — {name}', en: 'Next stage in {s}s — {name}', zh: '{s}秒后进入下一关——{name}' },
    'bt.again': { ko: '{s}초 뒤 다시 — {name}', en: 'Again in {s}s — {name}', zh: '{s}秒后重来——{name}' },
    'bt.backCell': { ko: '{s}초 뒤 앞 칸으로 — {name}', en: 'Back a stage in {s}s — {name}', zh: '{s}秒后退回上一关——{name}' },   // 챕터보스에게 졌다 — 다음 런이 바로 앞 칸이다 (ADR-1022)
    'bt.respawnWait': { ko: '보스 재등장까지 {s}초 — {name}', en: 'Boss returns in {s}s — {name}', zh: '首领{s}秒后重新出现——{name}' },   // 챕터보스 재등장 대기 (R240 · ADR-0590)
    // 신단 (SCREEN_DESIGN §4-2 「신단」 · ADR-0445) — 효과 줄은 `shrine.csv` 의 능력치마다 한 키 · {v} = %
    'bt.shrineGot': { ko: '신단 획득', en: 'Shrine blessing', zh: '获得圣坛' },
    'bt.shrineKeep': { ko: '신단 유지', en: 'Shrine kept', zh: '保留圣坛' },
    // 결과 띠의 [건너뛰기] — 세기를 걷고 다음 런을 곧바로 보낸다 (SCREEN_DESIGN §4-2 · ADR-0453)
    'bt.skipWait': { ko: '건너뛰기', en: 'Skip', zh: '跳过' },
    'bt.skipRetry': { ko: '재도전', en: 'Retry', zh: '重新挑战' },   // 같은 버튼의 진 런 글자 — 다음 런이 같은 칸일 때 (ADR-0698 · ADR-1022)
    'rep.shrine': { ko: '신단', en: 'Shrine', zh: '圣坛' },
    // 처음 깬 런의 요약 칸 — 상자가 어디로 갔나 (SCREEN_DESIGN §4-3 · ADR-0731)
    'shrine.fx.atk_pct': { ko: '데미지 +{v}%', en: 'Damage +{v}%', zh: '伤害+{v}%' },
    'shrine.fx.cooldown_reduction': { ko: '쿨타임 감소 {v}%', en: 'Cooldown Reduction {v}%', zh: '冷却缩减{v}%' },
    'shrine.fx.life_steal': { ko: '흡혈 {v}%', en: 'Life Steal {v}%', zh: '吸血{v}%' },
    'shrine.fx.res_all': { ko: '모든 원소 저항 +{v}%', en: 'All Resistances +{v}%', zh: '所有元素抗性+{v}%' },
    'shrine.fx.hp_pct': { ko: '최대 HP +{v}%', en: 'Max HP +{v}%', zh: '最大生命+{v}%' },
    'shrine.fx.xp_gain_pct': { ko: '파티 경험치 획득 +{v}%', en: 'Party Experience Gain +{v}%', zh: '队伍经验获取+{v}%' },
    'shrine.fx.item_find': { ko: '드랍률 +{v}%', en: 'Item Find +{v}%', zh: '掉落率+{v}%' },
    'shrine.fx.gold_find': { ko: '파티 골드 획득 +{v}%', en: 'Party Gold Find +{v}%', zh: '队伍金币获取+{v}%' },
    'log.end.win': { ko: '스테이지 클리어 — 리포트로 정리', en: 'Stage clear — see the report', zh: '关卡通关——详见报告' },
    'log.end.lose': { ko: '원정 실패 — 귀환', en: 'Expedition failed — returning', zh: '远征失败——返回' },

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
    'nav.expedition': { ko: '원정', en: 'Expedition', zh: '远征' },
    'nav.explore': { ko: '탐험', en: 'Exploration', zh: '探索' },
    'nav.battlefields': { ko: '특수전장', en: 'Special Battlefields', zh: '特殊战场' },
    'et.from': { ko: '{n}층 · Lv.{lv} · {kind}', en: 'Floor {n} · Lv.{lv} · {kind}', zh: '第{n}层 · Lv.{lv} · {kind}' },   // 판 머리 — 층 · 상대 레벨 · 정예 / 보스
    'et.fromDiff': { ko: '{n}층 · Lv.{lv} · {kind} · {diff}', en: 'Floor {n} · Lv.{lv} · {kind} · {diff}', zh: '第{n}层 · Lv.{lv} · {kind} · {diff}' },   // 노말이 아닌 규칙의 층 — 뒤에 단 이름
    // 시련의 탑(탭 id `colosseum`) [2026-10-18 사용자 지시 · SCREEN_DESIGN §1 · ADR-0670 · 이름 2026-11-13 ADR-1071] — 결투장(`arena`) 바로 앞 · 오프라인 층 사다리 · 레일(사다리) | 판
    'nav.colosseum': { ko: '시련의 탑', en: 'Tower of Trials', zh: '试炼之塔' },
    'cs.progress': { ko: '{n} / {total}층', en: 'Floor {n} / {total}', zh: '{n} / {total}层' },
    'cs.progressDone': { ko: '{total}층 완주', en: 'All {total} floors cleared', zh: '{total}层全部通关' },
    'cs.row': { ko: '{a}–{b}층', en: 'F{a}–{b}', zh: '{a}–{b}层' },   // 사다리 줄 머리 — 10층씩 한 줄 (ADR-1292)
    'cs.fight': { ko: '도전', en: 'Challenge', zh: '挑战' },
    'cs.rival': { ko: '먼저 도착한 라이벌 파티', en: 'Rival adventuring party', zh: '先行抵达的对手队伍' },
    'cs.monsterDifficulty': { ko: '{n}층부터 몬스터전에 {diff} 규칙이 적용됩니다.', en: 'Monster battles use {diff} rules from floor {n}.', zh: '从第{n}层起，怪物战采用{diff}规则。' },
    'cs.back': { ko: '시련의 탑으로', en: 'Back to the Tower', zh: '返回试炼之塔' },
    'cs.last': { ko: '지난 도전: {result} · {sec}초', en: 'Last challenge: {result} · {sec}s', zh: '上次挑战：{result} · {sec}秒' },
    'cs.last.open': { ko: '지난 도전: {result} · {sec}초 · {n}층 열림', en: 'Last challenge: {result} · {sec}s · Floor {n} unlocked', zh: '上次挑战：{result} · {sec}秒 · 已开启第{n}层' },
    'cs.help': {
        ko: '시련의 탑은 1층부터 시작합니다. 열린 가장 높은 층에서 이기면 다음 층이 열립니다. 패배해도 진행 기록은 유지되며, 깬 층에는 다시 도전할 수 있습니다.<br>층마다 상대가 정해져 있습니다. 정예 무리와 스테이지 보스를 거쳐 라이벌 영웅 파티와 장 보스를 만나며, 층 번호는 적의 기본 레벨입니다.',
        en: 'Start on the first floor of the Tower of Trials. Win on the highest open floor to unlock the next. You keep your progress after a loss and can replay cleared floors.<br>Each floor has a fixed opponent. You face elite packs and stage bosses, then a rival party and a chapter boss. The floor number sets the enemy base level.',
        zh: '试炼之塔从第一层开始。击败已开放的最高层即可解锁下一层。挑战失败也会保留进度，已通关的楼层可以再次挑战。<br>每层对手固定。你将先对战精英怪群和关卡首领，再与对手英雄队伍和章节首领交锋。层数决定敌人的基础等级。',
    },
    'nav.arena': { ko: '결투장', en: 'Arena', zh: '决斗场' },
    'nav.tagMatch': { ko: '콜로세움', en: 'Colosseum', zh: '斗兽场', ja: 'コロッセオ', 'zh-TW': '競技場', es: 'Coliseo', 'pt-BR': 'Coliseu', ru: 'Колизей', de: 'Kolosseum', fr: 'Colisée' },
    'hint.tagMatch': { ko: '세 파티를 방어 순서대로 등록하세요. 공격할 때는 상대의 진형·리더·스킬·작전 카드를 보고 대진을 정합니다. 두 판을 먼저 이기면 승리하며, 세 판 뒤 양쪽 모두 2승 미만이면 무승부입니다.', en: 'Register three parties in defense order. On attack, inspect enemy ranks, leaders, skills and tactic cards to choose your matchups. Two wins take the series. If neither side reaches two wins in three rounds, the series is drawn.', zh: '按防守顺序登记三支队伍。进攻时查看敌方阵型、队长、技能和战术卡并安排对阵。先胜两局者获胜，三局后双方均未满两胜则平局。', ja: "3つのパーティーを防衛順に登録します。攻撃時は相手の隊列、リーダー、スキル、戦術カードを確認して対戦順を決めます。2勝先取で、3戦で双方2勝未満なら引き分けです。", 'zh-TW': "按防守順序登錄三支隊伍。進攻時查看敵方陣型、隊長、技能與戰術卡，決定對戰順序。先勝兩局者獲勝，三局後雙方皆未滿兩勝則平手。", es: "Registra tres grupos en orden de defensa. Al atacar, consulta las filas, líderes, habilidades y cartas tácticas rivales antes de elegir los cruces. Gana quien consiga dos victorias. Si nadie lo logra en tres rondas, hay empate.", 'pt-BR': "Registre três grupos em ordem de defesa. Ao atacar, confira as fileiras, os líderes, as habilidades e as cartas táticas rivais antes de escolher os confrontos. Vence quem ganhar duas rodadas. Se ninguém conseguir em três, a partida empata.", ru: "Зарегистрируйте три отряда в порядке защиты. В атаке изучите ряды, лидеров, умения и тактические карты соперника, затем расставьте отряды. Побеждает сторона, первой выигравшая два раунда. Иначе после трёх раундов объявляется ничья.", de: "Melde drei Gruppen in Verteidigungsreihenfolge an. Prüfe beim Angriff die Reihen, Anführer, Fähigkeiten und Taktikkarten des Gegners und wähle die Paarungen. Zwei Siege entscheiden das Match. Erreicht niemand zwei Siege in drei Runden, endet es unentschieden.", fr: "Inscrivez trois groupes dans leur ordre de défense. En attaque, examinez les rangs, les chefs, les compétences et les cartes tactiques adverses avant de choisir les duels. Deux victoires assurent la série. Si personne ne les atteint en trois manches, il y a égalité." },
    'tag.defOrder': { ko: '방어 순서', en: 'Defense order', zh: '防守顺序', ja: "防衛順", 'zh-TW': "防守順序", es: "Orden de defensa", 'pt-BR': "Ordem de defesa", ru: "Порядок защиты", de: "Verteidigungsreihenfolge", fr: "Ordre de défense" },
    'tag.attackOrder': { ko: '공격 대진', en: 'Attack matchups', zh: '进攻对阵', ja: "攻撃の組み合わせ", 'zh-TW': "進攻對陣", es: "Cruces de ataque", 'pt-BR': "Confrontos de ataque", ru: "Пары атаки", de: "Angriffspaarungen", fr: "Duels en attaque" },
    'tag.orderSlot': { ko: '{n}세트 출전 파티', en: 'Party for round {n}', zh: '第{n}局出战队伍', ja: "第{n}戦のパーティー", 'zh-TW': "第{n}局出戰隊伍", es: "Grupo para la ronda {n}", 'pt-BR': "Grupo da rodada {n}", ru: "Отряд на раунд {n}", de: "Gruppe für Runde {n}", fr: "Groupe pour la manche {n}" },
    'tag.round': { ko: '{n}세트', en: 'Round {n}', zh: '第{n}局', ja: "第{n}戦", 'zh-TW': "第{n}局", es: "Ronda {n}", 'pt-BR': "Rodada {n}", ru: "Раунд {n}", de: "Runde {n}", fr: "Manche {n}" },
    'tag.locked': { ko: '노말 5장을 클리어해 세 번째 편성을 열면 등록할 수 있습니다.', en: 'Clear Normal Chapter 5 to unlock your third party and register.', zh: '通关普通第5章，解锁第三支队伍后即可登记。', ja: "ノーマル第5章をクリアして第3パーティーを解放すると登録できます。", 'zh-TW': "通關普通第5章，解鎖第三支隊伍後即可登錄。", es: "Completa el capítulo 5 en Normal para desbloquear el tercer grupo e inscribirte.", 'pt-BR': "Conclua o capítulo 5 no Normal para liberar o terceiro grupo e se inscrever.", ru: "Пройдите главу 5 на обычной сложности, чтобы открыть третий отряд и зарегистрироваться.", de: "Schließe Kapitel 5 auf Normal ab, um die dritte Gruppe freizuschalten und dich anzumelden.", fr: "Terminez le chapitre 5 en difficulté normale pour débloquer le troisième groupe et vous inscrire." },
    'tag.needNine': { ko: '편성 I·II·III에 영웅을 세 명씩 배치하세요.', en: 'Assign three heroes to each of parties I, II and III.', zh: '请在编队 I、II、III 中各安排三名英雄。', ja: "パーティーI・II・IIIに3人ずつ編成してください。", 'zh-TW': "請在編隊 I、II、III 中各安排三名英雄。", es: "Asigna tres héroes a cada grupo I, II y III.", 'pt-BR': "Atribua três heróis a cada grupo I, II e III.", ru: "Назначьте по три героя в отряды I, II и III.", de: "Weise den Gruppen I, II und III jeweils drei Helden zu.", fr: "Affectez trois héros à chacun des groupes I, II et III." },
    'tag.mine': { ko: '내 파티', en: 'My party', zh: '我方队伍', ja: "自分のパーティー", 'zh-TW': "我方隊伍", es: "Mi grupo", 'pt-BR': "Meu grupo", ru: "Мой отряд", de: "Meine Gruppe", fr: "Mon groupe" },
    'tag.fight': { ko: '태그매치 시작', en: 'Start tag match', zh: '开始团体赛', ja: "タッグマッチ開始", 'zh-TW': "開始團體賽", es: "Iniciar combate por equipos", 'pt-BR': "Iniciar partida em equipes", ru: "Начать командный бой", de: "Teamkampf starten", fr: "Lancer le match par équipes" },
    'tag.next': { ko: '다음 세트', en: 'Next round', zh: '下一局', ja: "次の対戦", 'zh-TW': "下一局", es: "Siguiente ronda", 'pt-BR': "Próxima rodada", ru: "Следующий раунд", de: "Nächste Runde", fr: "Manche suivante" },
    'tag.result': { ko: '대결 결과', en: 'Match result', zh: '比赛结果', ja: "対戦結果", 'zh-TW': "比賽結果", es: "Resultado", 'pt-BR': "Resultado", ru: "Итог матча", de: "Matchergebnis", fr: "Résultat du match" },
    'tag.replay': { ko: '다시 보기', en: 'Replay', zh: '重播', ja: "リプレイ", 'zh-TW': "重播", es: "Ver repetición", 'pt-BR': "Ver replay", ru: "Посмотреть повтор", de: "Wiederholung", fr: "Revoir" },
    'tag.back': { ko: '대진으로', en: 'Back to matchups', zh: '返回对阵', ja: "対戦表に戻る", 'zh-TW': "返回對陣", es: "Volver a los cruces", 'pt-BR': "Voltar aos confrontos", ru: "К парам", de: "Zurück zu den Paarungen", fr: "Retour aux duels" },
    'tag.refresh': { ko: '새로고침', en: 'Refresh', zh: '刷新', ja: "更新", 'zh-TW': "重新整理", es: "Actualizar", 'pt-BR': "Atualizar", ru: "Обновить", de: "Aktualisieren", fr: "Actualiser" },
    'tag.readFail': { ko: '상대 목록을 받지 못했습니다. 새로고침으로 다시 시도하세요.', en: 'Could not load opponents. Refresh to retry.', zh: '未能加载对手，请刷新重试。', ja: "対戦相手を読み込めませんでした。更新して再試行してください。", 'zh-TW': "無法載入對手，請重新整理。", es: "No se han podido cargar los rivales. Actualiza para reintentar.", 'pt-BR': "Falha ao carregar oponentes. Atualize para tentar de novo.", ru: "Не удалось загрузить соперников. Обновите список.", de: "Gegner konnten nicht geladen werden. Bitte aktualisieren.", fr: "Chargement des adversaires impossible. Actualisez pour réessayer." },
    'tag.writeFail': { ko: '방어 편성을 올리지 못했습니다. 새로고침으로 다시 시도하세요.', en: 'Could not publish your defense. Refresh to retry.', zh: '未能上传防守阵容，请刷新重试。', ja: "防衛編成を公開できませんでした。更新して再試行してください。", 'zh-TW': "無法上傳防守陣容，請重新整理。", es: "No se ha podido publicar la defensa. Actualiza para reintentar.", 'pt-BR': "Falha ao publicar a defesa. Atualize para tentar de novo.", ru: "Не удалось опубликовать защиту. Обновите список.", de: "Verteidigung konnte nicht veröffentlicht werden. Bitte aktualisieren.", fr: "Publication de la défense impossible. Actualisez pour réessayer." },
    'tag.pending': { ko: '방어 편성 동기화 중', en: 'Syncing defense', zh: '正在同步防守阵容', ja: "防衛編成を同期中", 'zh-TW': "正在同步防守陣容", es: "Sincronizando defensa", 'pt-BR': "Sincronizando defesa", ru: "Синхронизация защиты", de: "Verteidigung wird synchronisiert", fr: "Synchronisation de la défense" },
    // 결투장(탭 id `arena`) = 온라인 ELO [2026-10-18 · ADR-0670 · 이름 2026-11-13 ADR-1071 — ~~오프라인 | 온라인 갈래~~ ADR-0656] — 리그 카드 · 상대 후보 셋 · 친선전 창 · 검사 사유(INTERFACE §2-17 의 코드마다 하나)
    'ar.rating': { ko: '레이팅', en: 'Rating', zh: '积分' },
    'ar.peak': { ko: '최고 {n}', en: 'Best {n}', zh: '最高{n}' },
    'ar.record': { ko: '{w}승 {d}무 {l}패', en: '{w}W {d}D {l}L', zh: '{w}胜{d}平{l}负' },
    'ar.toNext': { ko: '{tier}까지 {n}', en: '{n} to {tier}', zh: '距{tier}还差{n}' },
    'ar.topLeague': { ko: '최고 리그', en: 'Top league', zh: '最高段位' },
    'ar.cands': { ko: '상대 후보', en: 'Opponents', zh: '对手候选' },
    // 결투장 데모 — 고스트 · 방어 편성 · 방어 기록 (ADR-1040 · arena_design §9 · 2026-11-11)
    'ar.fromGhost': { ko: '{name} · {tier} · {rating}', en: '{name} · {tier} · {rating}', zh: '{name} · {tier} · {rating}' },
    'ar.noName': { ko: '이름 없음', en: 'No name', zh: '无名' },
    'ar.def': { ko: '방어 편성', en: 'Defense party', zh: '防守编队' },
    'ar.def.need': { ko: '3명을 채워야 올라감', en: 'Needs 3 heroes to be listed', zh: '需满3人才会被列入' },
    'ar.def.local': { ko: '배포판에서만 올라감', en: 'Listed only on the live build', zh: '仅在正式版中列入' },
    'ar.def.up': { ko: '상대 목록에 올라감', en: 'Listed for other players', zh: '已列入对手列表' },
    'ar.log': { ko: '방어 기록', en: 'Defense log', zh: '防守记录' },
    'ar.log.none': { ko: '기록 없음', en: 'No records', zh: '无记录' },
    'ar.log.win': { ko: '방어 성공', en: 'Defense won', zh: '防守成功' },
    'ar.log.loss': { ko: '방어 실패', en: 'Defense lost', zh: '防守失败' },
    'ar.log.draw': { ko: '무승부', en: 'Draw', zh: '平局' },
    'ar.newCands': { ko: '새 상대', en: 'New opponents', zh: '新对手' },
    'ar.friendly': { ko: '친선전', en: 'Friendly', zh: '友谊赛' },
    'ar.unrated': { ko: '레이팅 변동 없음', en: 'Unrated', zh: '积分不变' },
    // 등록 판 · 친구와 전투 목록 · 친선전 출처 (ADR-1042 · 2026-11-11)
    'ar.fromFriend': { ko: '친선전 · {name} · {rating}', en: 'Friendly · {name} · {rating}', zh: '友谊赛 · {name} · {rating}' },
    'ar.reg.name': { ko: '이름', en: 'Name', zh: '名字' },
    'ar.reg.namePh': { ko: '이름 입력', en: 'Enter a name', zh: '输入名字' },
    'ar.reg.noParty': { ko: '영웅 {n}명을 채운 편성이 필요합니다', en: 'You need a party with {n} heroes', lock: true, zh: '需要满{n}名英雄的编队' },
    'ar.reg.go': { ko: '등록', en: 'Register', zh: '报名' },
    'ar.users': { ko: '친구와 전투', en: 'Fight a friend', zh: '与好友战斗' },
    'ar.leagues': { ko: '전체 리그', en: 'Leagues', zh: '全部段位' },   // 리그 카드 버튼 · 리그 창 제목 (ADR-1046)
    'ar.cands.none': { ko: '아직 상대가 없습니다', en: 'No opponents yet', zh: '暂无对手' },
    'ar.users.ph': { ko: '이름 또는 #1234', en: 'Name or #1234', zh: '名字或#1234' },
    'ar.users.find': { ko: '찾기', en: 'Search', zh: '查找' },
    'ar.users.more': { ko: '더 보기', en: 'More', zh: '更多' },
    'ar.users.loading': { ko: '불러오는 중', en: 'Loading', zh: '加载中' },
    'ar.users.none': { ko: '찾은 사람 없음', en: 'No players found', zh: '未找到玩家' },
    'ar.users.local': { ko: '배포판에서만', en: 'Live build only', zh: '仅限正式版' },
    'ar.ratingFlash': { ko: '레이팅 {after} ({delta})', en: 'Rating {after} ({delta})', zh: '积分{after}（{delta}）' },
    'ar.last.rated': { ko: '지난 결투: {result} · 레이팅 {after} ({delta})', en: 'Last duel: {result} · Rating {after} ({delta})', zh: '上次决斗：{result} · 积分{after}（{delta}）' },
    'ar.rules': { ko: '결투 규칙', en: 'Duel rules', zh: '决斗规则' },
    'ar.help.rating': {
        ko: '결투장은 레이팅으로 겨룹니다. 이기면 오르고 지면 내려가며, 센 상대를 이길수록 많이 오르고 센 상대에게 질수록 적게 내려갑니다. 레이팅이 문턱을 넘으면 리그가 오릅니다.<br>상대 후보는 내 레이팅의 아래 · 비슷 · 위에 고르게 나옵니다. 카드의 + / − 가 이기고 질 때 바뀔 레이팅입니다. 결투가 끝나면 후보가 새로 섭니다.<br>레이팅은 결투를 시작하는 순간 정해집니다 — 관전을 닫아도 결과는 그대로입니다. 상대는 방어 편성을 등록한 다른 플레이어입니다.',
        en: 'The Arena is ranked by rating. Wins raise it and losses lower it; beating stronger opponents gains more, and losing to them costs less. Cross a threshold to move up a league.<br>Opponents are spread below, near and above your rating. The + / − on each card is how much your rating changes if you win or lose. New opponents appear after each duel.<br>Your rating is settled the moment the duel starts — closing the replay does not change the result. Opponents are defense parties registered by other players.',
        zh: '决斗场以积分进行较量。获胜积分上升，失败积分下降；击败的对手越强上升越多，输给的对手越强下降越少。积分越过门槛后段位提升。<br>对手候选会均匀分布在你的积分之下、相近与之上。卡片上的 + / − 是胜负时积分的变化量。决斗结束后会出现新的候选。<br>积分在决斗开始的瞬间就已确定——关闭观战也不会改变结果。对手是报名了防守编队的其他玩家。',
    },
    'ar.select': { ko: '출전 인원 {n} / 3', en: 'Team members {n} / 3', zh: '出战人数{n} / 3' },
    'ar.edit': { ko: '편성 수정', en: 'Edit party', zh: '修改编队' },
    'ar.needTeam': { ko: '영웅 {n}명 편성', en: 'Assign {n} heroes', lock: true, zh: '编入{n}名英雄' },
    'ar.empty': { ko: '빈 자리', en: 'Empty slot', zh: '空位' },
    'ar.noOpponent': { ko: '상대를 고르면 팀이 나타납니다', en: 'Pick an opponent to reveal their team', zh: '选择对手后将显示其队伍' },
    'ar.noTactic': { ko: '작전 카드 없음', en: 'No tactic cards', zh: '无战术卡' },   // 2026-11-26 R586 — 든 카드가 없을 때   // Party 판의 전술 칸이 빌 때 (ADR-0495)
    'ar.fight': { ko: '결투 시작', en: 'Start duel', zh: '开始决斗' },
    'ar.back': { ko: '결투장으로', en: 'Back to Arena', zh: '返回决斗场' },
    'ar.draw': { ko: '무승부', en: 'Draw', zh: '平局' },
    'ar.last': { ko: '지난 결투: {result} · {sec}초', en: 'Last duel: {result} · {sec}s', zh: '上次决斗：{result} · {sec}秒' },
    'ar.help': {
        ko: '저장된 편성을 고르면 그 편성의 영웅과 전열·후열이 그대로 출전합니다. 인원과 진형은 편성 탭에서 수정합니다. 영웅 3명을 채워야 결투를 시작할 수 있습니다.<br>개인 능력치·장비·스킬에 고른 편성의 파티 전술·물약과 내 도감 보너스를 더해 단판 전투를 합니다. 상대도 자기 파티 전술·물약을 씁니다. 제한시간이 지나면 무승부입니다.<br>결투는 원정과 독립되어 보상·도감 처치·자원 소모가 없습니다. 마신 물약도 재고에서 줄지 않습니다. 결투장 레이팅과 시련의 탑에서 오른 층은 저장되고, 고른 상대와 지난 결과는 재접속하면 초기화됩니다.',
        en: 'Choose a saved party to use its heroes and front or back ranks. Edit members and formation in the Party tab. Assign three heroes to start a duel.<br>A single round uses individual stats, gear and skills plus the chosen party’s tactics and potions and your Codex bonuses. Opponents use their own tactics and potions. Reaching the time limit ends in a draw.<br>Duels run independently of expeditions, with no rewards, codex kills or resource costs. Potions drunk are not taken from your stock. Your Arena rating and Tower of Trials progress are saved; the picked opponent and last result reset when you reload.',
        zh: '选择已保存的编队后，该编队的英雄与前排 · 后排会原样出战。人数与阵型在编队标签页中修改。需满3名英雄才能开始决斗。<br>以个人属性 · 装备 · 技能，加上所选编队的队伍战术 · 药水与我方的图鉴加成，进行单场战斗。对手也会使用自己的队伍战术 · 药水。超过时间限制即为平局。<br>决斗独立于远征，没有奖励 · 图鉴击杀 · 资源消耗。喝下的药水也不会从库存中扣除。决斗场积分与试炼之塔已登上的楼层会被保存，所选对手与上次结果会在重新进入游戏后重置。',
    },
    'nav.party': { ko: '편성', en: 'Party', zh: '编队' },
    'nav.character': { ko: '캐릭터', en: 'Character', zh: '角色' },
    // 건설 [2026-09-21 사용자 지시 · ADR-0253] — 옛 「연구」. 화면 이름과 자리(캐릭터 바로 뒤)만 바뀌었고 키는 옛 이름 그대로다
    'nav.research': { ko: '건설', en: 'Construction', zh: '建设' },
    'nav.tavern': { ko: '선술집', en: 'Tavern', zh: '酒馆' },
    'nav.shop': { ko: '상점', en: 'Shop', zh: '商店' },
    'nav.forge': { ko: '대장간', en: 'Blacksmith', zh: '铁匠铺' },
    // 도서관 [2026-09-29 사용자 지시 · SCREEN_DESIGN §17 · ADR-0422 · 이름 2026-10-10 ~~서고~~] — 대장간 뒤 · 건물 이름(`building.csv`)과 같은 말 · ~~`nav.training`~~ 은 2026-10-09 훈련장 탭과 함께 걷혔다(ADR-0567)
    'nav.library': { ko: '도서관', en: 'Library', zh: '图书馆' },
    'nav.resource': { ko: '연구소', en: 'Laboratory', zh: '研究所' },   // 건물 이름(`building.csv:resource`)과 같은 말 · 키는 옛 이름 그대로 (2026-10-18 · ADR-0665)
    'nav.codex': { ko: '도감', en: 'Codex', zh: '图鉴' },
    'nav.help': { ko: '도움말', en: 'Help', zh: '帮助' },
    'nav.lab': { ko: '실험실', en: 'Lab', zh: '实验室' },   // 개발 장치 — 기타 묶음 끝 (SCREEN_DESIGN §18 · ADR-0580)
    // 탭 묶음 머리 — 누를 수 없는 작은 회색 글씨 (SCREEN_DESIGN §1 · ADR-0554). 순서 = `app.js:NAV_GROUPS`
    'nav.grp.battle': { ko: '전투', en: 'Combat', zh: '战斗' },
    'nav.grp.town': { ko: '마을', en: 'Town', zh: '城镇' },
    'nav.grp.etc': { ko: '기타', en: 'Other', zh: '其他' },
    // 흐린 탭을 누르면 — 탭은 안 바뀌고 플래시가 선다 (SCREEN_DESIGN §1 · ADR-0311). 지을 수 있으면 「{b} 건설」(`cn.needBuild`) · 첫 랭크가 준비 중이면 이 줄 (ADR-0699)
    'nav.pending': { ko: '{b} 준비 중', en: '{b}: coming later', lock: true, zh: '{b}准备中' },
    'nav.commission': { ko: '의뢰', en: 'Commissions', zh: '委托' },
    'nav.skill': { ko: '스킬', en: 'Skills', zh: '技能' },
    'nav.base': { ko: '거점', en: 'Base', zh: '据点' },
    'res.gold': { ko: '골드', en: 'Gold', zh: '金币' },
    'res.dust': { ko: '분해 가루', en: 'Dust', zh: '分解粉尘' },
    'res.stigma': { ko: '낙인', en: 'Stigma', zh: '烙印' },
    'ui.langBtn': { ko: '언어', en: 'Language', zh: '语言' },
    'ui.langError': { ko: '언어 파일을 불러올 수 없습니다. 다시 선택해 주세요.', en: 'Unable to load this language. Please select it again.', zh: '无法读取语言文件，请重新选择。' },
    'ui.close': { ko: '닫기', en: 'Close', zh: '关闭' },        // 창 레이어 — 닫는 길 셋 중 눈에 보이는 하나 (SCREEN_DESIGN §2)
    'ui.expTime': { ko: '원정 플레이 시간', en: 'Expedition Playtime', zh: '远征游戏时长' },   // 상단바 ⚙ 왼쪽 — 누적 원정 플레이 시간(배속을 탄다)의 라벨 (SCREEN_DESIGN §2 · ADR-0514)
    /* 창 안에서 답하는 버튼 둘 (2026-09-09) — 어느 창이든 같은 말을 쓴다. 「확인」은 **읽었다/한다**,
       「취소」는 **안 한다**. 창을 그냥 닫는 길(X · 바깥 · Esc)은 그대로 있고, 이 둘은 그것을 **눈에 보이게** 한다 */
    'ui.ok': { ko: '확인', en: 'OK', zh: '确定' },
    'ui.cancel': { ko: '취소', en: 'Cancel', zh: '取消' },
    /* 설정 [2026-09-28 사용자 지시 · SCREEN_DESIGN §2-2 · ADR-0413 · ADR-0414] — 상단바 오른쪽 끝 `⚙` 판의 설정 탭 (`set.h` = 탭 이름 · ⚙ 의 title).
       버튼 글은 한국어도 On / Off 그대로(2026-09-27 사용자 지시 「한글이어도 무조건 On Off」 — 파티 전술 칸 `rs.on` 과 같다) */
    'set.h': { ko: '설정', en: 'Settings', zh: '设置' },
    'set.artStyle': { ko: '아트 스타일', en: 'Art Style', zh: '美术风格' },
    // 설정 탭의 하위 탭 셋 (2026-11-12 · SCREEN_DESIGN §2-2 · ADR-1050)
    'set.pane.game': { ko: '게임', en: 'Game', zh: '游戏' },
    'set.pane.screen': { ko: '화면', en: 'Display', zh: '画面' },
    'set.layout': { ko: '화면 배치', en: 'Screen layout', zh: '画面布局' },
    'set.layout.auto': { ko: '자동', en: 'Auto', zh: '自动' },
    'set.layout.desktop': { ko: 'PC', en: 'PC', zh: 'PC' },
    'set.layout.mobile': { ko: '모바일', en: 'Mobile', zh: '移动端' },
    'set.layout.preview': { ko: '모바일 미리보기 · 390 × 844 · 세로 고정', en: 'Mobile preview · 390 × 844 · Fixed portrait', zh: '移动端预览 · 390 × 844 · 固定竖屏' },
    'mobile.chapter': { ko: '챕터', en: 'Chapter', zh: '章' },
    'mobile.party': { ko: '부대', en: 'Party', zh: '小队' },
    'mobile.selection': { ko: '선택', en: 'Selection', zh: '选择' },
    'mobile.freeSlots': { ko: '빈자리 {n}', en: '{n} free', zh: '空位{n}' },
    'mobile.page.cards': { ko: '작전 카드', en: 'Cards', zh: '战术卡' },
    'mobile.page.bonuses': { ko: '추가 효과', en: 'Bonuses', zh: '额外效果' },
    'mobile.page.ranks': { ko: '랭크 목록', en: 'Ranks', zh: '各阶列表' },
    'mobile.page.levels': { ko: '레벨 목록', en: 'Levels', zh: '等级列表' },
    'mobile.page.researchAction': { ko: '연구', en: 'Research', zh: '研究' },
    'mobile.page.production': { ko: '생산 현황', en: 'Production', zh: '生产状况' },
    'mobile.page.registration': { ko: '영웅 등록', en: 'Heroes', zh: '派驻英雄' },
    'set.pane.fx': { ko: '연출', en: 'Effects', zh: '演出' },
    'set.skillFx': { ko: '스킬 이펙트', en: 'Skill Effects', zh: '技能特效' },
    'set.fxArt': { ko: '이펙트 그림체', en: 'Effect Style', zh: '特效画风' },   // 관전 스킬 이펙트의 그림체 — 버튼 글은 ix.fxs.* (2026-10-09 · ADR-0561)
    'set.fxAlpha': { ko: '이펙트 투명도(%)', en: 'Transparency (%)', zh: '特效透明度（%）' },   // 영어는 짧게 — 이름 칸이 넓어지면 다른 줄 버튼까지 접힌다   // 스킬 조각만 옅게 — 버튼 글은 0 · 25 · 50 · 75 (단위는 이 이름이 든다 · 2026-10-09 · ADR-0562)
    'set.basicFx': { ko: '기본 공격 이펙트', en: 'Basic Attack Effects', zh: '普通攻击特效' },   // 기본 공격 · 반격의 대각선 베기 한 줄(무채색) (2026-10-03 · ADR-0501 · ADR-0505)
    'set.hitFx': { ko: '피격 반응', en: 'Hit Reactions', zh: '受击反馈' },
    'set.shake': { ko: '피격 시 흔들림', en: 'Shake on Hit', zh: '受击时震动' },
    'set.lunge': { ko: '공격 시 흔들림', en: 'Shake on Attack', zh: '攻击时震动' },
    'set.on': { ko: 'On', en: 'On', zh: '开' },
    'set.off': { ko: 'Off', en: 'Off', zh: '关' },
    // 로그 방식 — 네 칸 격자 · 한 문장 (2026-09-30 · ADR-0459). 이 줄의 버튼 글은 언어를 따른다
    'set.log': { ko: '로그', en: 'Log', zh: '日志' },
    'set.logGrid': { ko: '칸', en: 'Grid', zh: '格' },
    'set.logText': { ko: '문장', en: 'Text', zh: '文字' },
    'set.nick': { ko: '닉네임', en: 'Nickname', zh: '昵称' },
    'set.acct': { ko: '계정', en: 'Account', zh: '账号' },   // 아이디 계정 줄 — 배포 주소에서만 (§2-2 · ADR-1263)
    'set.acctNew': { ko: '계정 만들기', en: 'Create Account', zh: '创建账号' },
    'set.acctOut': { ko: '로그아웃', en: 'Log Out', zh: '退出登录' },
    'set.acctOutConfirm': { ko: '세이브를 지우고 로그아웃 — 한 번 더', en: 'Delete save & log out — click again', zh: '再次点击以删除存档并退出登录' },   // 퍼널 페이지가 유저를 알아보는 이름 — 게임 안엔 안 찍힌다 (§2-1 · ADR-0633)
    'set.rclickSalvage': { ko: '우클릭 분해', en: 'Right-click Salvage', zh: '右键分解' },
    'set.mmDim': { ko: '바로가기 어둡게', en: 'Dim Mission Background', zh: '使用快捷跳转时调暗背景' },   // 첫 장 메인미션 [바로가기]의 탭 단계에서 화면을 어둡게 (2026-11-25 · §2-2 · ADR-1378)   // 켜면 보관 칸 장비 우클릭 = 바로 분해 · 메뉴는 Shift+우클릭 (2026-11-15 · §2-2 · ADR-1188)

    /* ── 연구소 탭(옛 자원 탭 · 키 `dp.*` 는 옛 이름 그대로) — 줄은 넷: 자원 · 수색 · 훈련 · 도박장 (SCREEN_DESIGN §8) ──
       채광 · 채집 · 벌목은 「자원」 줄의 지점이다(`dp.node.mine` · `gather` · `log` — 2026-10-25 · ADR-0788 · R356) · `dp.post.mine` · `gather` · `log` 는 미니게임 창 제목이 쓴다.
       영웅은 앉지 않는다 [2026-10-18 · ADR-0665] — ~~자리 칸의 선택 창 · 회수 · `dp.err.*` · 담당 능력치(`dp.attrTitle`)~~ 를 걷었다.
       `dp.solo` · `dp.party` 는 참조가 0 이지만 **지우지 않는다**: 탐험 탭이 같은 문구를 쓸 수 있다.
       `dp.post.forge`(대장간) · `dp.post.trade`(상단)는 줄에서 빠졌지만 **지우지 않는다** —
       `dp.post.forge` 는 연구의 가지 이름(`mock.js` rsBranch)이, `dp.post.trade` 는 상점 탭의 패널 머리가 쓴다(§8-3).
       ⚠ **`dp.post.mine` 은 값만 「채광」(활동)으로 바뀌고 키는 옛 장소 id 그대로다** [2026-09-04 사용자 지시] — 지점 id(`lab_material.csv:post`)와 같은 글자다 */
    'dp.post.res': { ko: '자원', en: 'Resources', zh: '资源' },
    'dp.post.trade': { ko: '상단', en: 'Trading House', zh: '商会' },
    'dp.post.mine': { ko: '채광', en: 'Mining', zh: '采矿' },
    'dp.post.gather': { ko: '채집', en: 'Gathering', zh: '采集' },
    'dp.post.log': { ko: '벌목', en: 'Logging', zh: '伐木' },
    // 연구소 줄 「수색」 — 단계 없는 칸 하나 (SCREEN_DESIGN §8 · ADR-0672 · 2026-10-19)
    'dp.post.visit': { ko: '수색', en: 'Search', zh: '搜寻' },
    // 연구소 줄 · 지점 · 연구 (2026-10-21 · SCREEN_DESIGN §8 · ADR-0684 · R298)
    'dp.post.train': { ko: '훈련', en: 'Training', zh: '训练' },
    'dp.post.gamble': { ko: '도박장', en: 'Gambling Den', zh: '赌坊' },
    'dp.post.lib': { ko: '도서관', en: 'Library', zh: '图书馆' },
    'dp.post.forge': { ko: '대장간', en: 'Blacksmith', zh: '铁匠铺' },   // 연구소 여섯째 줄 — 제작 레벨 (2026-11-24 · R565)
    'tip.ring.cooldown': { ko: '[{tag}] 쿨타임 {p} 감소', en: '[{tag}] Cooldown −{p}', zh: '[{tag}] 冷却缩减{p}' },
    'tip.ring.damage': { ko: '[{tag}] 스킬 데미지 +{p}', en: '[{tag}] Skill Damage +{p}', zh: '[{tag}] 技能伤害+{p}' },
    'tip.ring.extra_hit': { ko: '[{tag}] {p} 확률로 한 타 추가', en: '[{tag}] {p} chance of an extra hit', zh: '[{tag}] {p}几率追加一击' },
    'tip.ring.duration': { ko: '[{tag}] 지속시간 +{p}', en: '[{tag}] Duration +{p}', zh: '[{tag}] 持续时间+{p}' },
    'tip.ring.value': { ko: '[{tag}] 효과 수치 +{p}', en: '[{tag}] Effect Strength +{p}', zh: '[{tag}] 效果数值+{p}' },
    'tip.ring.heal': { ko: '[{tag}] 회복량 +{p}', en: '[{tag}] Healing +{p}', zh: '[{tag}] 治疗量+{p}' },
    'dp.node.mine': { ko: '채광', en: 'Mining', zh: '采矿' },
    'dp.node.gather': { ko: '채집', en: 'Gathering', zh: '采集' },
    'dp.node.log': { ko: '벌목', en: 'Logging', zh: '伐木' },
    'dp.node.burst': { ko: '대박', en: 'Jackpot', zh: '大丰收' },
    'dp.node.offline': { ko: '오프라인 생산 시간 연장', en: 'Offline Production Time', zh: '离线生产时长' },
    'dp.node.relief': { ko: '비상 보급', en: 'Emergency Supplies', zh: '应急补给' },
    'dp.relief.max': { ko: '최대 +{n}%', en: 'Up to +{n}%', zh: '最多 +{n}%' },
    'dp.relief.rate': { ko: '{rate} (+{n}%)', en: '{rate} (+{n}%)', zh: '{rate} (+{n}%)' },
    /* 고른 지점 머리 아래 설명 — 그 지점이 하는 일 · 값은 안 적는다 (§8 · ADR-1305 — ~~`dp.relief.desc`~~ 비상 보급만 · ADR-1298).
       키 = `dp.desc.<줄>.<지점>` — 같은 지점 id 가 줄마다 다른 일을 한다(수색 · 도서관 `interval` · 도박장 · 도서관 `burst`) */
    'dp.desc.res.mine': { ko: '철광석을 더 많이 생산합니다.', en: 'Produces more Iron Ore.', zh: '生产更多铁矿石。' },
    'dp.desc.res.gather': { ko: '약초를 더 많이 생산합니다.', en: 'Produces more Herbs.', zh: '生产更多草药。' },
    'dp.desc.res.log': { ko: '목재를 더 많이 생산합니다.', en: 'Produces more Timber.', zh: '生产更多木材。' },
    'dp.desc.res.offline': { ko: '게임을 끈 동안 철광석 · 약초 · 목재가 쌓이는 시간을 늘립니다.', en: 'Extends how long Iron Ore, Herbs and Timber keep piling up while the game is off.', zh: '延长关闭游戏期间铁矿石、草药、木材的累积时间。' },
    'dp.desc.res.relief': { ko: '보유량이 가장 적은 재료를 더 빨리 생산합니다. 가장 많은 재료와의 보유 비율 차이가 클수록 가속률이 높습니다.', en: 'Speeds up production of your least-stocked material. The bonus grows as its stock falls further below your largest stock.', zh: '加快库存最少的材料的生产速度。它与库存最多的材料之间的比例差越大，加速幅度越高。' },
    'dp.desc.visit.interval': { ko: '영웅이 선술집에 더 자주 찾아옵니다.', en: 'Heroes arrive at the Tavern more often.', zh: '英雄更频繁地来到酒馆。' },
    'dp.desc.visit.quality': { ko: '찾아오는 영웅이 레어일 확률을 높입니다.', en: 'Raises the chance that an arriving hero is Rare.', zh: '提高来访英雄为稀有的几率。' },
    'dp.desc.visit.commission': { ko: '새로 서는 의뢰 카드의 목표와 보상이 커집니다.', en: 'New commission cards ask for more and pay more.', zh: '新出现的委托卡目标与奖励都会增加。' },   // 의뢰 레벨 (R592 · ADR-1411)
    'dp.desc.visit.waiting': { ko: '찾아온 영웅이 기다리는 선술집 칸을 늘립니다. 마지막 레벨은 데려올 최저 등급을 고르는 거르기를 엽니다.', en: 'Adds Tavern slots where arriving heroes wait. The last level unlocks Filter, which sets the lowest grade to bring in.', zh: '增加来访英雄在酒馆等候的格子。最后一级开启筛选，可选择带来的最低品级。' },
    'dp.desc.train.speed': { ko: '훈련에 등록한 영웅이 시간마다 받는 경험치를 늘립니다.', en: 'Increases the XP each registered hero gains per hour.', zh: '增加登记训练的英雄每小时获得的经验。' },
    'dp.desc.train.range': { ko: '훈련으로 오를 수 있는 레벨 상한을 높입니다. 상한은 로스터 최고 레벨보다 이 값만큼 낮습니다.', en: 'Raises the level cap Training can reach. The cap sits this many levels below your highest-level hero.', zh: '提高训练可达到的等级上限。上限比名册中的最高等级低该数值。' },
    'dp.desc.gamble.income': { ko: '도박장이 시간마다 버는 골드를 늘립니다.', en: 'Increases the Gold the Gambling Den earns per hour.', zh: '增加赌坊每小时赚取的金币。' },
    'dp.desc.gamble.burst': { ko: '골드가 들어올 때 한 번 더 들어올 확률을 높입니다.', en: 'Raises the chance that Gold comes in twice.', zh: '提高金币额外再入账一次的几率。' },
    'dp.desc.lib.interval': { ko: '스킬 조각을 더 빨리 생산합니다.', en: 'Produces Skill Shards faster.', zh: '更快地生产技能碎片。' },
    'dp.desc.lib.burst': { ko: '스킬 조각이 완성될 때 등록한 영웅의 스킬북을 함께 얻을 확률을 높입니다.', en: 'Raises the chance of also getting a registered hero’s skill book when a Skill Shard is completed.', zh: '提高完成技能碎片时同时获得登记英雄技能书的几率。' },
    'dp.node.interval': { ko: '간격', en: 'Interval', zh: '间隔' },
    'dp.node.quality': { ko: '품질', en: 'Quality', zh: '品质' },
    'dp.node.waiting': { ko: '대기소', en: 'Waiting Room', zh: '等候所' },
    'dp.node.commission': { ko: '의뢰', en: 'Commissions', zh: '委托' },   // 수색 줄 — 의뢰 레벨 (R592)
    'dp.node.speed': { ko: '속도', en: 'Speed', zh: '速度' },
    'dp.val.trainXp': { ko: '+{n} XP/시간', en: '+{n} XP/h', zh: '+{n} 经验/小时' },
    'dp.node.range': { ko: '범위', en: 'Range', zh: '范围' },
    'dp.node.income': { ko: '수익', en: 'Income', zh: '收益' },
    'dp.node.make': { ko: '제작', en: 'Crafting', zh: '制作' },   // 대장간 줄 — 레어 가중치 (R576 — ~~제작 레벨~~ R565)
    'dp.node.upgrade': { ko: '강화', en: 'Upgrade', zh: '强化' },   // 대장간 줄 — 강화 상한 (R566)
    'dp.node.potion': { ko: '물약', en: 'Potion', zh: '药水' },   // 대장간 줄 — 물약 단계 (R566)
    'dp.node.enchant': { ko: '인챈트', en: 'Enchant', zh: '附魔' },   // 대장간 줄 — 인챈트 굴림 바닥 (R576 D13)
    'dp.node.salvage': { ko: '분해', en: 'Salvage', zh: '分解' },   // 대장간 줄 — 분해량 (R576 D13)
    'dp.val.upgrade': { ko: '+{n}강', en: '+{n}', zh: '+{n}' },   // 「강화」 지점 값 = 강화 상한 (R566)
    'dp.desc.forge.upgrade': { ko: '장비를 더 높은 단계까지 강화할 수 있습니다.', en: 'Lets gear be upgraded to higher steps.', zh: '装备可以强化到更高阶段。' },
    'dp.desc.forge.potion': { ko: '더 높은 단계의 물약을 만들 수 있습니다.', en: 'Lets the Blacksmith brew higher-tier potions.', zh: '可以制作更高阶的药水。' },
    'dp.desc.forge.make': { ko: '대장간 줄이 만드는 장비가 레어로 나올 확률이 오릅니다.', en: 'Gear made here is more likely to be Rare.', zh: '提高铁匠铺线制出稀有装备的几率。' },   // R576 D5 · D13
    'dp.desc.forge.enchant': { ko: '인챈트로 붙는 옵션 값이 더 높게 나옵니다.', en: 'Raises the minimum value of an enchanted option.', zh: '提高附魔词条的数值下限。' },   // 굴림 바닥이 오른다 · 위 끝 그대로 (R576 D13)
    'dp.desc.forge.salvage': { ko: '장비를 분해할 때 가루와 재료를 더 얻습니다.', en: 'Salvaging gear yields more dust and materials.', zh: '分解装备时可获得更多粉尘和材料。' },   // R576 D13
    'dp.val.slots': { ko: '+{n}칸', en: '+{n}', zh: '+{n}格' },
    'dp.val.range': { ko: '최고 −{n}', en: 'Top −{n}', zh: '最高−{n}' },
    // 레벨 값이 무엇을 미는가 — 레벨 목록 줄 · 「다음 레벨」 값 변화 줄 앞에 선다(「철광석 생산 +10%」 · ADR-1362)
    'dp.lvVal': { ko: '{what} {v}', en: '{what} {v}', zh: '{what} {v}' },
    'dp.col.lv': { ko: '레벨', en: 'Level', zh: '等级' },   // 레벨 목록 열 이름 — 레벨 | {무엇} | 상태(`rs.col.state`) (편성 전술 표와 같은 열 이름 줄 · ADR-1362)
    'dp.col.val': { ko: '값', en: 'Value', zh: '数值' },   // 무엇(`dp.what.*`)이 없는 지점의 값 열 이름
    'dp.what.res.mine': { ko: '철광석 생산', en: 'Iron Ore output', zh: '铁矿石产量' },
    'dp.what.res.gather': { ko: '약초 생산', en: 'Herb output', zh: '草药产量' },
    'dp.what.res.log': { ko: '목재 생산', en: 'Timber output', zh: '木材产量' },
    'dp.what.res.offline': { ko: '오프라인 생산', en: 'Offline production', zh: '离线产量' },
    'dp.what.res.relief': { ko: '부족 재료 가속', en: 'Low-stock boost', zh: '短缺材料生产加速' },
    'dp.what.visit.interval': { ko: '영웅 도착 속도', en: 'Hero arrival speed', zh: '英雄到达速度' },
    'dp.what.visit.quality': { ko: '레어 확률', en: 'Rare chance', zh: '稀有英雄几率' },
    'dp.what.visit.commission': { ko: '의뢰 카드', en: 'Commission cards', zh: '委托卡' },   // R592
    'dp.val.cmMult': { ko: '목표 ×{n} · 골드 ×{g}', en: 'Goal ×{n} · Gold ×{g}', zh: '目标×{n} · 金币×{g}' },   // 의뢰 지점 값 = 그 레벨의 배수 (R592 · ADR-1411)
    'dp.need.claims': { ko: '의뢰 완료 {have} / {need}', en: 'Commissions completed {have} / {need}', zh: '已完成委托 {have} / {need}' },   // 의뢰 지점 다음 레벨의 문턱 — 잠긴 자리의 한 토막(「~ 필요」 금지 · ADR-0699 · R592 · ADR-1411)
    'dp.what.visit.waiting': { ko: '선술집 대기', en: 'Tavern waiting slots', zh: '酒馆等候位' },
    'dp.what.train.speed': { ko: '훈련 경험치', en: 'Training XP', zh: '训练经验' },
    'dp.what.train.range': { ko: '훈련 상한', en: 'Training cap', zh: '训练等级上限' },
    'dp.what.gamble.income': { ko: '골드 수익', en: 'Gold income', zh: '金币收益' },
    'dp.what.gamble.burst': { ko: '대박 확률', en: 'Jackpot chance', zh: '大丰收几率' },
    'dp.what.lib.interval': { ko: '스킬 조각 생산', en: 'Skill Shard output', zh: '技能碎片产量' },
    'dp.what.lib.burst': { ko: '스킬북 확률', en: 'Skill Book chance', zh: '技能书几率' },
    'dp.what.forge.make': { ko: '레어 가중치', en: 'Rare weight', zh: '稀有装备权重' },   // R576 — ~~제작~~
    'dp.what.forge.enchant': { ko: '인챈트 바닥', en: 'Minimum enchant value', zh: '附魔数值下限' },
    'dp.what.forge.salvage': { ko: '분해량', en: 'Salvage yield', zh: '分解产量' },
    'dp.res.go': { ko: '연구', en: 'Research', zh: '研究' },
    'dp.res.cancel': { ko: '그만두기', en: 'Cancel', zh: '中止' },
    'dp.res.time': { ko: '{t} 걸림', en: 'Takes {t}', zh: '耗时{t}' },
    'dp.res.left': { ko: '{t} 남음', en: '{t} left', zh: '剩余{t}' },
    'dp.res.busy': { ko: '연구 중 {name}', en: 'Researching {name}', zh: '正在研究{name}' },
    'dp.res.started': { ko: '{name} 연구 시작', en: 'Started {name}', zh: '开始研究{name}' },
    'dp.res.canceled': { ko: '연구 취소 — 비용 반환', en: 'Research canceled — cost refunded', zh: '研究已取消——费用已返还' },
    /* 고른 줄 (SCREEN_DESIGN §8 · ADR-0971 — ~~「이 줄」 `dp.line.h` · 「속도 ×{v}」~~) — 머리 아래 하는 일 한 줄 → 지금 내는 것(소제목 = 그 내용의 이름) → 등록 효과 표 */
    'dp.line.desc.res': { ko: '철광석 · 약초 · 목재를 시간마다 생산합니다', en: 'Produces ore, herbs and timber every hour', zh: '每小时生产铁矿石、草药、木材' },
    'dp.line.desc.visit': { ko: '등록한 영웅이 시간마다 한 명씩 선술집에 데려옵니다', en: 'Each assigned hero brings one hero to the tavern every few hours', zh: '派驻的英雄每隔一段时间带一名英雄到酒馆' },
    'dp.line.desc.train': { ko: '등록한 영웅이 시간마다 경험치를 받습니다', en: 'Assigned heroes gain XP every hour', zh: '派驻的英雄每小时获得经验' },
    'dp.line.desc.gamble': { ko: '시간마다 골드를 법니다', en: 'Earns gold every hour', zh: '每小时赚取金币' },
    'dp.line.desc.lib': { ko: '스킬 조각을 시간마다 생산합니다', en: 'Produces skill shards every hour', zh: '每小时生产技能碎片' },   // R546 · ADR-1273
    'dp.out.h.res': { ko: '시간당 생산', en: 'Per Hour', zh: '每小时产量' },
    'dp.out.h.visit': { ko: '영웅 도착', en: 'Hero Arrivals', zh: '英雄到达' },
    'dp.out.h.train': { ko: '훈련 상한', en: 'Training Cap', zh: '训练上限' },
    'dp.out.h.gamble': { ko: '시간당 생산', en: 'Per Hour', zh: '每小时产量' },
    'dp.out.h.lib': { ko: '시간당 생산', en: 'Per Hour', zh: '每小时产量' },   // R546 — 자원 · 도박장과 같은 소제목
    'dp.line.desc.forge': { ko: '등록한 영웅이 시간마다 장비 · 물약을 만듭니다', en: 'Assigned heroes craft gear and brew potions at regular intervals', zh: '派驻的英雄会定时制作装备或药水' },   // R574
    'dp.out.h.forge': { ko: '지금 만드는 것', en: 'In Production', zh: '正在制作' },   // R574 — 장비 칸 · 영웅마다 만드는 것 · 강화 상한 (ADR-1375)
    'dp.out.slots': { ko: '장비 칸', en: 'Gear slots', zh: '装备栏位' },   // 대장간 줄 공용 장비 칸 `n / 칸 수` (R574 D8)
    'dp.out.upMax': { ko: '강화 상한', en: 'Upgrade cap', zh: '强化上限' },   // 대장간 줄 「지금 만드는 것」 — 강화 상한 (R566)
    'dp.out.needHero': { ko: '생산하려면 영웅을 등록해야 합니다', en: 'Assign a hero to start production', zh: '派驻英雄后即可开始生产' },   // 영웅이 있어야 도는 줄 — 등록한 영웅이 없을 때 (R574 D16 · ADR-1375)
    'fg.needLab': { ko: '{b} · {node} Lv{n}', en: '{b} · {node} Lv{n}', lock: true, zh: '{b} · {node} Lv{n}' },   // 대장간 탭 잠긴 제작 레벨 — 그 레벨을 여는 연구소 지점 레벨 (R565)
    'dp.out.shard': { ko: '스킬 조각', en: 'Skill Shards', zh: '技能碎片' },   // 도서관 줄 「지금 내는 것」 첫 줄 (R546 · ADR-1273)
    'dp.out.bookChance': { ko: '스킬북 확률', en: 'Skill book chance', zh: '技能书几率' },   // 조각 하나마다 등록 영웅 스킬 책 (R546)
    'dp.out.cand': { ko: '후보 스킬', en: 'Candidate skills', zh: '候选技能' },   // 등록 영웅의 고유 · 배운 칸 (R546)
    'dp.out.hero': { ko: '영웅', en: 'Heroes', zh: '英雄' },
    'dp.out.rare': { ko: '레어 확률', en: 'Rare chance', zh: '稀有几率' },
    'dp.out.waiting': { ko: '대기소', en: 'Waiting room', zh: '等候所' },
    'dp.out.cap': { ko: '상한 레벨', en: 'Level cap', zh: '等级上限' },
    'dp.out.gold': { ko: '골드', en: 'Gold', zh: '金币' },
    'dp.fx.h': { ko: '등록 효과', en: 'Hero Effects', zh: '派驻效果' },   // 고른 줄의 소제목 — 아래 영웅 카드 · 효과 표 (ADR-0700 — ~~Assigned heroes~~ 카드가 서며 영웅 목록 제목처럼 겹쳐 읽혔다)
    // 효과 표의 이름 — 속도는 그 줄이 내는 것의 이름(ADR-0971) · 값은 +n% / −n%
    'dp.fx.speed.res': { ko: '생산량', en: 'Output', zh: '产量' },
    'dp.fx.speed.visit': { ko: '도착 속도', en: 'Arrival speed', zh: '到达速度' },
    'dp.fx.speed.train': { ko: '경험치', en: 'XP', zh: '经验' },
    'dp.fx.speed.gamble': { ko: '골드', en: 'Gold', zh: '金币' },
    'dp.fx.speed.lib': { ko: '조각 생산 속도', en: 'Shard production speed', zh: '碎片生产速度' },   // R546
    'dp.fx.speed.forge': { ko: '제작 속도', en: 'Crafting speed', zh: '制作速度' },   // 대장간 줄 — 힘 덤이 영웅마다 간격을 줄인다 (R574 D4)
    'dp.fx.burst': { ko: '대박 확률', en: 'Jackpot chance', zh: '大丰收几率' },
    'dp.fx.quality': { ko: '레어 확률', en: 'Rare chance', zh: '稀有几率' },
    'dp.fx.research': { ko: '연구 속도', en: 'Research speed', zh: '研究速度' },
    'dp.fx.cost': { ko: '연구 비용', en: 'Research cost', zh: '研究费用' },
    // 인원 줄 — 자원 · 도박장만 · 가운데 칸 = 등록한 수 (ADR-1132)
    'dp.fx.heads': { ko: '인원', en: 'Heroes', zh: '人数' },
    'dp.fx.headsN': { ko: '{n}명', en: '{n} registered', zh: '{n}名' },
    // 도움말 연구소 섹션 (SCREEN_DESIGN §12 · 2026-10-21 R298 — ~~벤치(파견 대기)~~ 문장 대체) — 탐험 `ex.help` · 시련의 탑 `cs.help` 와 같은 도움말 전용 문장
    'dp.help': {
        ko: '줄은 <b>등록한 영웅이 있어야</b> 시간마다 생산합니다 — 게임을 꺼 둔 동안에도(최대 {h}시간 · 수색은 칸이 찰 때까지)<br>'
            + '지점을 골라 <b>연구</b>하면 레벨이 오릅니다 — 시간이 걸리고 연구소 전체에 <b>한 번에 하나</b> · 그만두면 비용을 전부 돌려받습니다 · 연구소 랭크가 새 지점을 엽니다<br>'
            + '영웅을 줄에 <b>등록</b>하면 자원 · 도박장은 <b>한 명마다 한 몫</b>을 생산하고(1명 100% · 2명 200% · 3명 300%) 수색은 <b>영웅마다 시계가 하나씩</b> 돌며, 능력치가 덤을 줍니다 — 운 대박 · 지능 연구 시간 · 매력 품질 · 건강 숙련(오래 등록할수록) · 통솔 같은 줄 동료 · 민첩 연구 비용. 등록은 원정 · 탐험과 겸합니다<br>'
            + '<b>훈련</b> 줄은 등록한 영웅이 경험치를 받습니다(로스터 최고 레벨까지) · <b>도박장</b> 줄은 선술집의 도박장이 열리면 같이 열립니다',
        en: 'Lines produce over time <b>only with a hero assigned</b> — even while the game is closed (up to {h}h · Search until the slots fill)<br>'
            + 'Pick a node and <b>Research</b> it to raise its level — it takes time and the Laboratory runs <b>one at a time</b> · cancelling refunds the full cost · Laboratory rank opens new nodes<br>'
            + 'Each hero <b>assigned</b> to Resources or the Gambling Den produces <b>one share</b> (1 hero 100% · 2 200% · 3 300%), each hero on Search runs <b>a clock of their own</b>, and stats add a bonus on top — Luck jackpot · Intelligence research time · Charisma quality · Vitality mastery (the longer assigned) · Leadership peers on the line · Agility research cost. Assignment does not stop expeditions or exploring<br>'
            + 'The <b>Training</b> line gives XP to its assigned heroes (up to the roster\'s top level) · the <b>Gambling Den</b> line opens along with the Tavern\'s Gambling Den',
        zh: '线<b>需要派驻英雄</b>才会随时间生产——游戏关闭期间也一样（最多{h}小时 · 搜寻则直到等候位填满）<br>选择节点进行<b>研究</b>即可提升等级——需要花费时间，整个研究所<b>同时只能进行一项</b> · 中止可全额返还费用 · 研究所升阶会开启新节点<br>将英雄<b>派驻</b>到线上后，资源 · 赌坊<b>每名英雄产出一份</b>（1名100% · 2名200% · 3名300%），搜寻则<b>每名英雄各跑一个计时器</b>，属性还会额外加成——幸运：大丰收 · 智力：研究时间 · 魅力：品质 · 体力：熟练（派驻越久越高）· 统率：同线同伴 · 敏捷：研究费用。派驻可与远征 · 探索兼任<br><b>训练</b>线让派驻的英雄获得经验（最高至名册中的最高等级）· <b>赌坊</b>线在酒馆的赌坊开放时一同开放',
    },
    'dp.solo': { ko: '1인', en: 'Solo', zh: '单人' },
    /* ── 탐험 탭 — 지도 위 지점 아이콘 → 아이콘 옆 지점 창 · 판 관전 · 결과 카드 (SCREEN_DESIGN §8-4 · 2026-11-26 R590 · ADR-1400 ~ ADR-1404) ──
       거절은 `game.exploreErr` 의 결과 코드와 짝 (`ex.err.<code>` — `unbuilt` 는 탐험 건설 한 줄 `flashNeed`) · 규칙 문장은 도움말(`help.explore.*`) · 창엔 설명 글줄이 없다(ADR-0560)
       ~~`ex.take` · `ex.cancel*` · `ex.taken*` · `ex.canceled` · `ex.err.pending` · `busy` · `slots` · `notDone` · `bagFull`~~ 옛 시간제와 함께 걷음 */
    // 지점 이름은 장마다 다르다 — 화면 문구가 아니라 데이터라 `explore_spot.csv` 가 든다 (ADR-0563)
    'ex.map.cave': { ko: "동굴", en: "Cave", zh: "洞穴" },
    'ex.map.ruins': { ko: "폐허", en: "Ruins", zh: "废墟" },
    'ex.map.caravan': { ko: "상단 의뢰", en: "Caravan escort", zh: "商队委托" },
    'ex.map.chapter': { ko: "{n}장", en: "Ch. {n}", zh: "第{n}章" },
    'ex.map.special': { ko: "특별 지점 · {name}", en: "Special site · {name}", zh: "特殊地点 · {name}" },
    'ex.map.refresh': { ko: "다음 갱신까지 {n}분", en: "Next refresh in {n} min", zh: "距下次刷新还有{n}分钟" },
    'ex.map.bonus.cave': { ko: "숨은 보스 출현 확률 ×{mult}", en: "Hidden boss chance ×{mult}", zh: "隐藏首领出现概率 ×{mult}" },
    'ex.map.bonus.ruins': { ko: "드문 만남 가중치 ×{mult}", en: "Rare encounter weight ×{mult}", zh: "罕见遭遇权重 ×{mult}" },
    'ex.map.bonus.caravan': { ko: "가입 희망 확률 ×{mult}", en: "Recruitment chance ×{mult}", zh: "申请加入概率 ×{mult}" },
    'ex.err.expired': { ko: "특별 지점이 갱신됐습니다", en: "This special site has expired", zh: "特殊地点已刷新" },
    'ex.tickets': { ko: '탐험권', en: 'Tickets', zh: '探索票券' },
    'ex.noTicket': { ko: '표 없음', en: 'No tickets', zh: '无票券' },
    'ex.tk': { ko: '{diff} · {grade}', en: '{diff} · {grade}', zh: '{diff} · {grade}' },   // 표 한 종류 — 난이도 · 등급(아이템 희귀도 이름)
    'ex.tkN': { ko: '×{n}', en: '×{n}', zh: '×{n}' },
    'ex.repeat': { ko: '이어 돌기', en: 'Repeat', zh: '连续探索' },
    'ex.stopLoss': { ko: '지면 멈춤', en: 'Stop on loss', zh: '失败时停止' },
    'ex.go': { ko: '보내기', en: 'Send', zh: '出发' },
    'ex.left': { ko: '남은 시간 {t}', en: '{t} left', zh: '剩余时间{t}' },
    'ex.step': { ko: '{n} / {total}', en: '{n} / {total}', zh: '{n} / {total}' },
    'ex.watch': { ko: '보기', en: 'Watch', zh: '观战' },
    'ex.recall': { ko: '부르기', en: 'Call back', zh: '召回' },
    'ex.recallAsk': { ko: '이 파티를 불러들일까요? 모은 것과 탐험권를 잃습니다.', en: 'Call this party back? The haul and the ticket will be lost.', zh: '要召回这支编队吗？已收集的战利品和探索票券都会损失。' },
    'ex.recalled': { ko: '탐험을 불러들였습니다', en: 'Exploration called back', zh: '已召回探索编队' },
    'ex.sent': { ko: '{spot} 탐험 출발', en: 'Off to the {spot}', zh: '出发探索{spot}' },
    // 판이 끝났다 — 오른쪽 아래 알림(ADR-0692 · ADR-1404) · 부름은 유저가 누른 일이라 안 띄운다
    'ex.end.won': { ko: '{spot} 완수', en: '{spot} completed', zh: '已完成{spot}' },
    'ex.end.lost': { ko: '{spot} 실패', en: '{spot} failed', zh: '{spot}探索失败' },
    // 결과 — 지점 창 결과 줄 · 결과 카드 (ADR-1404)
    'ex.res.won': { ko: '완수', en: 'Completed', zh: '已完成' },
    'ex.res.lost': { ko: '실패', en: 'Failed', zh: '失败' },
    'ex.res.recalled': { ko: '부름', en: 'Called back', zh: '已召回' },
    'ex.res.open': { ko: '결과 보기', en: 'View result', zh: '查看结果' },
    'ex.res.got': { ko: '받은 것', en: 'Received', zh: '获得物品' },
    'ex.res.lostAll': { ko: '모은 것과 탐험권를 잃었습니다', en: 'The haul and the ticket were lost', zh: '已损失收集的战利品和探索票券' },
    'ex.res.thanks': { ko: '감사인사', en: 'Thanks', zh: '致谢' },
    'ex.res.join': { ko: '가입 희망', en: 'Wants to join', zh: '申请加入' },
    'ex.res.joinFull': { ko: '자리 없음', en: 'No room', zh: '无空位' },
    // 관전 — 지도 · 정보 카드 · 전투 머리 (ADR-1401 ~ ADR-1403)
    'ex.w.back': { ko: '탐험 지도', en: 'Exploration Map', zh: '探索地图' },
    'ex.w.toMap': { ko: '지도로', en: 'Back to map', zh: '返回地图' },
    'ex.w.raids': { ko: '습격', en: 'Ambushes', zh: '伏击' },
    'ex.w.events': { ko: '이벤트', en: 'Events', zh: '事件' },
    'ex.w.fights': { ko: '전투', en: 'Fights', zh: '战斗' },
    'ex.w.leftH': { ko: '남은 시간', en: 'Time left', zh: '剩余时间' },
    'ex.w.bank': { ko: '모은 것', en: 'Haul', zh: '已收集的战利品' },
    'ex.w.bankV': { ko: '골드 {g} · 장비 {i} · 책 {b} · 카드 {c}', en: 'Gold {g} · Gear {i} · Books {b} · Cards {c}', zh: '金币 {g} · 装备 {i} · 技能书 {b} · 卡牌 {c}' },
    'ex.w.ambush': { ko: '습격!', en: 'Ambush!', zh: '遭遇伏击！' },
    'ex.w.raidN': { ko: '습격 {n} / {total}', en: 'Ambush {n} / {total}', zh: '伏击 {n} / {total}' },
    'ex.w.cell': { ko: '{spot} — {cell}', en: '{spot} — {cell}', zh: '{spot} — {cell}' },
    'ex.w.elite': { ko: '정예', en: 'Elite', zh: '精英' },
    'ex.w.unknown': { ko: '???', en: '???', zh: '???' },
    'ex.w.next': { ko: '다음 전투까지 {t}', en: 'Next fight in {t}', zh: '距下场战斗还有 {t}' },
    'ex.w.waitEnd': { ko: '판이 끝날 때까지 {t}', en: 'Run ends in {t}', zh: '距探索结束还有 {t}' },   // 기다림 — 다시 켰을 때 결과를 계산해 둔 판 (11-26 「끝 시각 유지」)
    'ex.w.ev.monster': { ko: '몬스터', en: 'Monsters', zh: '怪物' },
    'ex.w.ev.trap': { ko: '함정', en: 'Trap', zh: '陷阱' },
    'ex.w.ev.rare': { ko: '드문 만남', en: 'Rare encounter', zh: '罕见遭遇' },
    'ex.w.ev.item': { ko: '물건', en: 'A find', zh: '发现物品' },
    'ex.w.ev.empty': { ko: '빈 방', en: 'Empty room', zh: '空房间' },
    'ex.err.missing': { ko: '없는 표', en: 'No such ticket', zh: '找不到这张票券' },
    'ex.err.noTicket': { ko: '표 없음', en: 'No tickets left', zh: '探索票券已用完' },
    // 편성 쪽 거절 — 탐험은 편성으로 보낸다 (2026-10-10 · ADR-0582) · `full` = 원정 + 탐험이 편성 수만큼 나가 있다 (R590 D14)
    'ex.err.noParty': { ko: '빈 편성', en: 'That party is empty', zh: '空编队' },
    'ex.err.running': { ko: '원정 철수', en: 'Retreat from the expedition', lock: true, zh: '从远征撤退' },
    'ex.err.exploring': { ko: '이미 탐험 중', en: 'Already out exploring', zh: '已在探索中' },
    'ex.err.advancing': { ko: '전직 중인 영웅 있음', en: 'Someone in it is advancing', zh: '有英雄正在转职' },
    'ex.err.full': { ko: '나갈 수 있는 부대가 모두 나가 있습니다', en: 'All available parties are already deployed', zh: '可派出的编队都已出发' },
    'ex.err.none': { ko: '나간 탐험 없음', en: 'Nobody is out there', zh: '没有外出的探索' },
    'dp.party': { ko: '파티', en: 'Party', zh: '队伍' },
    // 단계 트랙은 머리 줄이 없다 [2026-09-21 사용자 지시 · ADR-0228] — 개수는 상자의 순서 번호가 말한다.
    // 무엇으로 여는가(해금 조건)는 기획 백지라 문구도 만들지 않는다 (§8)

    /* 상점 (SCREEN_DESIGN §8-3) — 구매 · 판매 패널이 나란히 선다. 상단은 탭 없이 장비 목록 하나(2026-09-30),
       오른쪽 특수상단 카드. 남은 시간은 **정보**다 — 재촉하는 말을 안 쓴다 (base_expedition_design §2-6) */
    // 상단 목록 무료 교체 — 고른 영웅의 레벨로 다시 굴린다 · 쿨다운 동안 비활성 (§8-3 · ADR-1016)
    //   버튼은 행동과 값만 · 고른 영웅의 이름({name}) · 레벨({lv})은 버튼 왼쪽 따로 선 글자 (ADR-0965)
    'td.reroll.free': { ko: '교체 (무료)', en: 'Refresh (free)', zh: '刷新（免费）' },
    'td.err.cooldown': { ko: '목록 교체 대기 중', en: 'Stock refresh is on cooldown', zh: '商品刷新冷却中' },
    'td.reroll.who': { ko: '{name} Lv {lv} 적용', en: 'For {name} Lv {lv}', zh: '适用：{name} Lv {lv}' },
    // 상단 제목 옆 `?` — 올리면 뜨는 두 문장 · {h} = [balance.csv:shop_refresh_hours] (ADR-0464 · ADR-0648)
    'td.reroll.help': { ko: '교체하면 고른 영웅 레벨에 맞춰 다시 들어옵니다. 교체는 무료이며 {h}시간마다 가능합니다.', en: 'A refresh restocks at the selected hero\'s level. Refreshing is free and available every {h} hours.', zh: '刷新后将按所选英雄的等级重新进货。刷新免费，每{h}小时可刷新一次。' },
    'td.special': { ko: '특수상단', en: 'Visiting trader', zh: '行商' },
    'td.trade': { ko: '교역소', en: 'Trading Post', zh: '交易所' },
    'td.trade.cost': { ko: '필요 {cost} · 보유 {have}', en: 'Cost {cost} · Owned {have}', zh: '需要{cost} · 持有{have}' },
    'td.trade.buy': { ko: '{pay}(으)로 {name} 구매', en: 'Buy {name} with {pay}', zh: '用{pay}购买{name}' },
    'td.trade.bought': { ko: '{name} ×{n} 구매 (−{pay} ×{cost})', en: 'Bought {name} ×{n} (−{pay} ×{cost})', zh: '购买{name} ×{n}（−{pay} ×{cost}）' },
    'td.trade.boughtGold': { ko: '{name} ×{n} 구매 (−{cost} G)', en: 'Bought {name} ×{n} (−{cost} G)', zh: '购买{name} ×{n}（−{cost} G）' },
    'td.trade.err.materials': { ko: '지불할 재료 부족', en: 'Not enough payment materials', zh: '用于支付的材料不足' },
    'td.trade.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    'td.trade.err.missing': { ko: '교환할 재료를 다시 선택하세요.', en: 'Select the trading materials again.', zh: '请重新选择要交换的材料。' },
    'td.leave': { ko: '떠나기까지 {t}', en: 'Leaves in {t}', zh: '{t}后离开' },
    'td.next': { ko: '다음 상인까지 {t}', en: 'Next trader in {t}', zh: '{t}后下一位商人到来' },
    'td.buy': { ko: '구매', en: 'Buy', zh: '购买' },
    'td.sell': { ko: '판매', en: 'Sell', zh: '出售' },
    'td.sell.add': { ko: '판매 목록에 추가', en: 'Add to sale', zh: '加入出售列表' },
    'td.sell.remove': { ko: '판매 목록에서 제외', en: 'Remove from sale', zh: '移出出售列表' },
    'td.sell.clear': { ko: '선택 해제', en: 'Clear selection', zh: '取消选择' },
    'td.sell.empty': { ko: '판매할 장비를 선택하세요.', en: 'Select equipment to sell.', zh: '请选择要出售的装备。' },
    'td.sell.count': { ko: '선택 {n}개', en: '{n} selected', zh: '已选{n}件' },
    'td.sell.done': { ko: '장비 {n}개 판매 (+{g} G)', en: 'Sold {n} items (+{g} G)', zh: '出售了{n}件装备（+{g} G）' },
    'td.sell.err.missing': { ko: '판매할 장비를 다시 선택하세요.', en: 'Select the equipment to sell again.', zh: '请重新选择要出售的装备。' },
    'td.sell.err.locked': { ko: '잠긴 장비는 판매할 수 없습니다.', en: 'Locked equipment cannot be sold.', zh: '锁定的装备无法出售。' },
    'td.sell.err.sealed': { ko: '미개봉 상자는 판매할 수 없습니다.', en: 'Unopened boxes cannot be sold.', zh: '未开启的宝箱无法出售。' },
    'td.sell.err.rarity': { ko: '판매 가격이 없는 장비입니다.', en: 'This equipment has no sale price.', zh: '该装备没有售价。' },
    'hint.shop_sell': { ko: '아래 인벤토리·창고의 장비를 눌러 판매 목록에 올립니다. 판매가는 같은 레벨·등급 상점가의 1/3이며 소수점은 버립니다. [판매]를 누르기 전에는 장비가 사라지지 않습니다.', en: 'Click equipment in the inventory or stash below to add it to the sale. Its sale price is one third of the shop price for its level and rarity, rounded down. Equipment stays in storage until you press Sell.', zh: '点击下方背包 · 仓库中的装备，将其加入出售列表。售价为同等级 · 同稀有度商店价格的1/3，小数部分舍去。按下[出售]之前，装备不会消失。' },
    // 상단 장비 구매 (SCREEN_DESIGN §8-3 · game.shopBuy · 2026-09-27) — 거절은 결과 코드와 짝이다(unbuilt 는 flashNeed · missing 은 stale 과 같은 뜻)
    'td.sold': { ko: '팔림', en: 'Sold', zh: '已售出' },
    'td.bought': { ko: '{name} 구매 (−{g} G)', en: 'Bought {name} (−{g} G)', zh: '购买{name}（−{g} G）' },
    'td.boughtN': { ko: '{name} ×{n} 구매 (−{g} G)', en: 'Bought {name} ×{n} (−{g} G)', zh: '购买{name} ×{n}（−{g} G）' },   // 물약 묶음 구매 (§8-3 · 2026-10-23)
    'td.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    'td.err.bagFull': { ko: '인벤토리 가득 참', en: 'Inventory is full', zh: '背包已满' },
    'td.err.sold': { ko: '이미 팔린 물건', en: 'Already sold', zh: '该商品已售出' },
    'td.err.stale': { ko: '목록이 바뀜', en: 'The stock has changed', zh: '商品列表已变动' },   // 그리는 사이 다른 탭에서 [교체]했다 (ADR-0648 — 상단 목록은 방문 회차와 무관)

    /* 의뢰 게시판 (SCREEN_DESIGN §14 · 자리는 선술집 탭 §8-1 · ADR-0352) — 제목은 `nav.commission` 재사용(옛 탭 라벨이 패널 제목으로 내려왔다).
       ⚠ **종류 · 등급 이름은 여기 없다** — `commission_kind.csv` · `commission_grade.csv` 의 `_kr`/`_en` 쌍이고 화면은 `L()` 로 푼다.
       남는 것은 화면 라벨 · **목표 틀**(종류 × 어휘마다 하나 `cm.goal.<kind>.<axis>` — `{t}` = 대상 이름 · `{n}` = 목표 수 · R457 · ADR-1068) · 부위 갈래 이름 · 플래시다.
       `cm.goal.kill.monster` · `kill.grade.*` · `collect.rarity` = 옛 카드(R457 이전에 받은 것)만. 의뢰 레벨은 게시판에 안 적는다 — 연구소 수색 줄 「의뢰」 지점에서만(§14 · ADR-1435) */
    'cm.accept': { ko: '수락', en: 'Accept', zh: '接受' },
    'cm.claim': { ko: '수령', en: 'Claim', zh: '领取' },
    'cm.drop': { ko: '포기', en: 'Abandon', zh: '放弃' },
    'cm.dropConfirm': { ko: '정말 포기', en: 'Confirm abandon', zh: '确认放弃' },
    'cm.slots': { ko: '받음 {n} / {max}', en: 'Taken {n} / {max}', zh: '已接{n} / {max}' },
    // 목표 문장 = 퀘스트 목표 — 미션이 동사로 든다(처치 · 분해 · 획득 · 강화 · 제작) · 카드 첫 줄에 미션 이름이 없다 [2026-11-14 사용자 「미션이름을 빼라고 … 아래설명에쓰고」 · 「rpg처럼」 · ADR-1083]
    'cm.goal.kill.any': { ko: '몬스터 {n}마리 처치', en: { one: 'Slay {n} monster', other: 'Slay {n} monsters' }, zh: '击杀{n}只怪物' },
    'cm.goal.kill.chapter': { ko: '{t}에서 몬스터 {n}마리 처치', en: { one: 'Slay {n} monster in the {t}', other: 'Slay {n} monsters in the {t}' }, zh: '在{t}击杀{n}只怪物' },
    'cm.goal.kill.race': { ko: '{t} 종족 {n}마리 처치', en: { one: 'Slay {n} {t} foe', other: 'Slay {n} {t} foes' }, zh: '击杀{n}只{t}种族敌人' },
    'cm.goal.kill.place': { ko: '{t}에서 몬스터 {n}마리 처치', en: { one: 'Slay {n} monster at {t}', other: 'Slay {n} monsters at {t}' }, zh: '在{t}击杀{n}只怪物' },
    'cm.goal.kill.monster': { ko: '{t} {n}마리 처치', en: 'Slay {t} ×{n}', zh: '击杀{n}只{t}' },
    'cm.goal.kill.grade.elite': { ko: '정예 몬스터 {n}마리 처치', en: { one: 'Slay {n} elite monster', other: 'Slay {n} elite monsters' }, zh: '击杀{n}只精英怪物' },
    'cm.goal.kill.grade.boss': { ko: '보스 {n}마리 처치', en: { one: 'Slay {n} boss', other: 'Slay {n} bosses' }, zh: '击杀{n}只首领' },
    'cm.goal.elite.any': { ko: '정예 몬스터 {n}마리 처치', en: { one: 'Slay {n} elite monster', other: 'Slay {n} elite monsters' }, zh: '击杀{n}只精英怪物' },
    'cm.goal.elite.chapter': { ko: '{t}에서 정예 몬스터 {n}마리 처치', en: { one: 'Slay {n} elite monster in the {t}', other: 'Slay {n} elite monsters in the {t}' }, zh: '在{t}击杀{n}只精英怪物' },
    'cm.goal.elite.place': { ko: '{t}에서 정예 몬스터 {n}마리 처치', en: { one: 'Slay {n} elite monster at {t}', other: 'Slay {n} elite monsters at {t}' }, zh: '在{t}击杀{n}只精英怪物' },
    // 분노 레어 「보스 토벌」 · 시기 「스킬 수련」 · 「영입」 [2026-11-16 · R513 · 사용자 「분노는 처치 · 시기는 선술집에서 영웅수집하거나 스킬 배우는거」]
    'cm.goal.boss.any': { ko: '보스 {n}마리 처치', en: { one: 'Slay {n} boss', other: 'Slay {n} bosses' }, zh: '击杀{n}只首领' },
    'cm.goal.book.any': { ko: '스킬북 {n}권 읽기', en: { one: 'Read {n} skill book', other: 'Read {n} skill books' }, zh: '阅读{n}本技能书' },
    'cm.goal.hire.any': { ko: '영웅 {n}명 고용', en: { one: 'Hire {n} hero', other: 'Hire {n} heroes' }, zh: '雇佣{n}名英雄' },
    'cm.goal.salvage.any': { ko: '장비 {n}개 분해', en: { one: 'Salvage {n} item', other: 'Salvage {n} items' }, zh: '分解{n}件装备' },
    'cm.goal.salvage.part': { ko: '{t} {n}개 분해', en: 'Salvage {t} ×{n}', zh: '分解{n}件{t}' },
    'cm.goal.salvage.rarity_min': { ko: '{t} 이상 장비 {n}개 분해', en: { one: 'Salvage {n} {t}+ item', other: 'Salvage {n} {t}+ items' }, zh: '分解{n}件{t}以上的装备' },
    'cm.goal.material.any': { ko: '재료 {n}개 획득', en: { one: 'Gather {n} material', other: 'Gather {n} materials' }, zh: '获得{n}个材料' },
    'cm.goal.material.mat': { ko: '{t} {n}개 획득', en: 'Gather {t} ×{n}', zh: '获得{n}个{t}' },
    'cm.goal.upgrade.any': { ko: '장비 강화 {n}회', en: { one: 'Enhance gear {n} time', other: 'Enhance gear {n} times' }, zh: '强化装备{n}次' },
    'cm.goal.upgrade.up_min': { ko: '+{t} 이상 강화 {n}회', en: { one: 'Enhance to +{t} or higher {n} time', other: 'Enhance to +{t} or higher {n} times' }, zh: '强化至+{t}以上{n}次' },
    'cm.goal.craft.any': { ko: '장비 {n}개 제작', en: { one: 'Craft {n} item', other: 'Craft {n} items' }, zh: '制作{n}件装备' },
    'cm.goal.collect.rarity': { ko: '{t} 장비 {n}개 획득', en: { one: 'Collect {n} {t} item', other: 'Collect {n} {t} items' }, zh: '获得{n}件{t}装备' },
    // 탐욕 매직 「매직 이상 장비 n개 획득」 — 이긴 라운드에 들어온 드롭 (R513)
    'cm.goal.collect.rarity_min': { ko: '{t} 이상 장비 {n}개 획득', en: { one: 'Collect {n} {t}+ item', other: 'Collect {n} {t}+ items' }, zh: '获得{n}件{t}以上的装备' },
    'cm.part.weapon': { ko: '무기', en: 'Weapon', zh: '武器' },
    'cm.part.armor': { ko: '방어구', en: 'Armor', zh: '防具' },
    'cm.part.accessory': { ko: '장신구', en: 'Accessory', zh: '饰品' },
    'cm.taken': { ko: '의뢰 수락 — {goal}', en: 'Commission taken — {goal}', zh: '已接受委托——{goal}' },
    'cm.claimed': { ko: '의뢰 완료 — {g} G', en: 'Commission complete — {g} G', zh: '委托完成——{g} G' },
    'cm.dropped': { ko: '의뢰 포기', en: 'Commission abandoned', zh: '已放弃委托' },
    'cm.err.full': { ko: '의뢰는 {n}개까지 받아 둘 수 있음', en: { one: 'You can hold up to {n} commission', other: 'You can hold up to {n} commissions' }, zh: '最多可同时接取{n}个委托' },
    'cm.err.notDone': { ko: '목표 달성', en: 'Meet the goal', lock: true, zh: '需达成目标' },
    /* 도박장 (SCREEN_DESIGN §8-1 · ADR-0322 자리 · ADR-0331 슬롯) — 의뢰 오른쪽 칸이 창을 연다. 창은 3×3 슬롯이다.
       심볼 · 잭팟 이름은 여기 없다 — `slot_symbol.csv` · `slot_coin.csv` 의 `_kr`/`_en` 쌍을 `L()` 로 푼다. 규칙 문장은 도움말(`gb.help`)만 든다 */
    'gb.h': { ko: '도박장', en: 'Gambling Den', zh: '赌坊' },
    'gb.enter': { ko: '입장', en: 'Enter', zh: '进入' },
    'gb.from': { ko: '한 판 {g} G부터', en: 'From {g} G a spin', zh: '每次{g} G起' },
    'gb.stake': { ko: '판돈', en: 'Stake', zh: '赌注' },
    'gb.spin': { ko: '스핀 · {g} G', en: 'Spin · {g} G', zh: '旋转 · {g} G' },
    'gb.spinN': { ko: '{n}판 돌리기', en: 'Spin ×{n}', zh: '连转{n}次' },
    'gb.won': { ko: '받음', en: 'Won', zh: '赢得' },
    'gb.net': { ko: '순손익', en: 'Net', zh: '净盈亏' },
    'gb.spins': { ko: '{n}판', en: { one: '{n} spin', other: '{n} spins' }, zh: '{n}次' },
    'gb.line': { ko: '라인 {n}', en: 'Line {n}', zh: '第{n}条线' },
    'gb.hold': { ko: '홀드 앤 스핀', en: 'Hold & Spin', zh: '锁定重转' },
    'gb.respins': { ko: '리스핀 {n}', en: 'Respins {n}', zh: '重转{n}' },
    'gb.jpN': { ko: '{name} ×{n}', en: '{name} ×{n}', zh: '{name} ×{n}' },   // 받은 잭팟이 둘 이상 — 계기판 표지 (ADR-0609)
    'gb.spinOf': { ko: '{k} / {n}판', en: 'Spin {k} / {n}', zh: '第{k} / {n}次' },   // n판 돌리기를 재생하는 동안 계기판 표지 맨 앞 (ADR-1147)
    'gb.skip': { ko: '건너뛰기', en: 'Skip', zh: '跳过' },                 // n판 돌리기 재생 중 [n판 돌리기] 자리 — 합계로 간다 (ADR-1147)
    'gb.pay.h': { ko: '배당표', en: 'Paytable', zh: '赔率表' },
    'gb.pay.hold': { ko: '코인 {n}개 이상 → 홀드 앤 스핀', en: '{n}+ coins → Hold & Spin', zh: '{n}个以上硬币 → 锁定重转' },
    'gb.pay.fill': { ko: '판이 다 차면', en: 'Full board', zh: '盘面填满时' },
    'gb.err.gold': { ko: '판돈 부족 ({g} G)', en: 'Not enough gold for the stake ({g} G)', zh: '赌注不足（{g} G）' },
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
        zh: '由酒馆开放。没有次数限制——只要付得起赌注就能转。“连转{n}次”会一次转{n}次，途中赌注不足则就此停止<br>下注后转动，横向 · 斜向共{lines}条线上出现三个相同符号即可获得金币或材料。百搭可替代其他符号 · 硬币会截断线<br>出现{trig}个以上硬币即触发锁定重转——硬币固定在原位，每出现一枚新硬币，重转次数就恢复为{re}次。盘面填满即为巨奖<br>赌注随当前进行的章而定。更高档的赌注由酒馆升阶开启。不会出现装备 · 烙印',
    },

    /* 대장간 (SCREEN_DESIGN §8-2) — 제목 줄이 없다: 탭 이름(`nav.forge`)이 crumb 에 서고 작업 탭은 상단바에 선다 (ADR-0190).
       작업 탭 = 강화 · 인챈트 · 합성 · 크래프트 (ADR-0142 · 제작 탭은 ADR-1374 가 걷었다) · 배치 줄은 걷었다 (ADR-0191). 강화의 결과 문구는 캐릭터 탭이 쓰던 `ch.upgraded` 를 재사용한다 — 같은 사건이라 문구를 새로 쓰지 않는다 */
    'fg.seg.up': { ko: '강화', en: 'Upgrade', zh: '强化' },
    'fg.seg.craft': { ko: '크래프트', en: 'Craft', zh: '打造' },
    'fg.seg.synth': { ko: '합성', en: 'Combine', zh: '合成' },   // 재료 합성 — 바로 아래 단계를 모아 위 단계 하나 (2026-10-27 · ADR-0856)
    'fg.synth.go': { ko: '합성', en: 'Combine', zh: '合成' },
    'fg.synth.all': { ko: '최대', en: 'Max', zh: '最多' },   // 개수 고르기 — 지금 만들 수 있는 최대로 맞춘다 (ADR-1318)
    'fg.synth.qty': { ko: '개수', en: 'Quantity', zh: '数量' },   // 개수 칸 이름(aria · 올리면 뜬다) (ADR-1318)
    'fg.synth.out': { ko: '{name} ×{n}', en: '{name} ×{n}', zh: '{name} ×{n}' },   // 식의 만들 재료 이름 + 고른 개수 (ADR-1318)
    'fg.go': { ko: '강화', en: 'Upgrade', zh: '强化' },
    // 옛 `tip.up.max` — 2026-09-08 에 툴팁의 강화 줄이 죽으면서 **대장간 전용**이 되어 접두를 옮겼다 (문구·인자 동일)
    'fg.upMax': { ko: '강화 +{up} · 상한', en: 'Upgrade +{up} · max', zh: '强化+{up} · 上限' },
    'fg.base': { ko: '베이스 능력치', en: 'Base stat', zh: '基底属性' },
    // 강화 진열의 메타 — 누가 끼고 있나 · 안 끼었으면 있는 곳(`ch.bag.inv` · `ch.bag.stash`) (ADR-0604 · ~~`fg.worn` 착용 중 · `fg.bag` 가방~~)
    // 강화 성공 확률 · 실패 [2026-10-14 · R253 · ADR-0626] — 확률 칩(비용 칩 앞) · 실패 플래시 · 연출의 실패 표지
    'fg.chanceLab': { ko: '성공 확률', en: 'Success chance', zh: '成功几率' },   // 강화 작업 칸 비교 줄 아래 「이름 · 값」 줄 (ADR-0973 · ~~`fg.chance` 칩~~)
    'fg.upFail': { ko: '강화 실패 · +{n} 그대로 · {g}G', en: 'Upgrade failed · still +{n} · {g}G', zh: '强化失败 · 保持+{n} · {g}G' },
    // 담금질(옛 「손질」 · 2026-11-24 사용자 「그냥 담금질이라고 이름지어 전체를」 · R571 · ADR-1369) — 강화 칸 가운데 (SCREEN_DESIGN §8-2 · ADR-1134 · ADR-1200 · R486 · R505)
    'fg.temper': { ko: '담금질', en: 'Quench', zh: '淬火' },
    'fg.board.gear': { ko: '장비', en: 'Equipment', zh: '装备' },   // 강화 칸 왼쪽 판 제목 띠 (ADR-1140)
    'fg.board.up': { ko: '강화', en: 'Upgrade', zh: '强化' },   // 강화 칸 오른쪽 판 제목 띠 (ADR-1140)
    'fg.board.mats': { ko: '재료', en: 'Materials', zh: '材料' },   // 합성 칸 왼쪽 판 제목 띠 (ADR-1309)
    'fg.board.synth': { ko: '합성', en: 'Combine', zh: '合成' },   // 합성 칸 오른쪽 판 제목 띠 (ADR-1309)
    'fg.act.heat': { ko: '달구기', en: 'Heat', zh: '加热' },   // 손질 셋 — `temper_action.csv:action` (item_design §7-2)
    'fg.act.reinforce': { ko: '덧대기', en: 'Reinforce', zh: '加固' },
    'fg.act.quench': { ko: '막기', en: 'Guard', zh: '防护' },   // 묶음 이름(담금질)과 겹쳐 「막기」 (2026-11-24 · R571 · ADR-1369)
    'fg.eff.chance': { ko: '확률 +{n}%', en: 'Chance +{n}%', zh: '几率+{n}%' },   // 손질 카드 효과 줄 · 플래시 — effect 마다
    'fg.eff.great': { ko: '대성공 +{n}%', en: 'Great +{n}%', zh: '大成功+{n}%' },
    'fg.eff.guard': { ko: '강등 · 파괴 막기 {n}%', en: 'Guard {n}%', zh: '防护{n}%' },   // 담금질 — 강등 · 파괴를 막을 확률 (R530 · ADR-1254)
    'fg.noRisk': { ko: '강등 · 파괴가 없는 단계', en: 'No downgrade or break at this step', zh: '此阶段不会降级或损毁' },   // 안전 구간 — 잠긴 담금질 카드에 올리면 (ADR-1254)
    'fg.applied': { ko: '적용됨', en: 'Applied', zh: '已应用' },
    'fg.temper.done': { ko: '담금질됨', en: 'Quenched', zh: '已淬火' },
    'fg.tempered': { ko: '{name} · 다음 강화 {eff}', en: '{name} · next upgrade {eff}', zh: '{name} · 下次强化{eff}' },
    'fg.greatLab': { ko: '대성공', en: 'Great success', zh: '大成功' },   // 강화 작업 판 확률 줄 아래 (ADR-1200)
    'fg.downLab': { ko: '강등', en: 'Downgrade', zh: '降级' },   // 강화 작업 판 확률 줄 — 다음 도전의 강등 · 파괴 (R530 · ADR-1254)
    'fg.breakLab': { ko: '파괴', en: 'Break', zh: '损毁' },
    'fg.greatTip': { ko: '대성공이면 {v}', en: 'On great success: {v}', zh: '大成功时：{v}' },
    'fg.upGreat': { ko: '대성공! +{n} · {g}G', en: 'Great success! +{n} · {g}G', zh: '大成功！+{n} · {g}G' },
    'fg.upDown': { ko: '강등 · +{n} · {g}G', en: 'Downgraded · +{n} · {g}G', zh: '降级 · +{n} · {g}G' },   // 강화 결과 플래시 — 강등 · 파괴 · 막힘 (R530 · ADR-1254)
    'fg.upBroken': { ko: '장비 파괴 · {loot} · {g}G', en: 'Item broken · {loot} · {g}G', zh: '装备损毁 · {loot} · {g}G' },   // {loot} = 받은 분해 산출(가루 · 부위 재료)
    'fg.upGuarded': { ko: '강화 실패 · 막기로 보호 · +{n} 그대로 · {g}G', en: 'Upgrade failed · Guard held · still +{n} · {g}G', zh: '强化失败 · 淬火防护 · 保持+{n} · {g}G' },
    'fg.err.noRisk': { ko: '막을 강등 · 파괴가 없음', en: 'Nothing to guard at this step', zh: '此阶段无需防护' },
    'fg.err.tempered': { ko: '이미 담금질했다 · 강화하면 다시 할 수 있다', en: 'Already quenched · upgrade first', zh: '已淬火 · 强化后可再次淬火' },
    'fg.err.action': { ko: '없는 담금질', en: 'Unknown quench', zh: '无效的淬火' },
    'fg.err.tier': { ko: '이 장비에 맞는 재료 단계가 없음', en: 'No material tier for this item', zh: '没有适合此装备的材料级别' },
    'fg.failMark': { ko: '실패', en: 'Failed', zh: '失败' },
    'fg.pick': { ko: '장비 선택', en: 'Pick an item', zh: '选择装备' },   // 장비칸 · 아이템창 어디서든 고른다 (ADR-0364)
    'fg.noBase': { ko: '강화 없음', en: 'No upgrade', zh: '不可强化' },
    // 인챈트 — 대장간 강화 옆 탭 (SCREEN_DESIGN §8-2 · ADR-1293 · item_design §8 · R553) · 오류 키는 결과 코드와 짝(`fg.err.<코드>` — game.enchantItem · enchantPick)
    'fg.seg.ench': { ko: '인챈트', en: 'Enchant', zh: '附魔' },
    'fg.board.ench': { ko: '인챈트', en: 'Enchant', zh: '附魔' },   // 인챈트 칸 오른쪽 판(옵션 카드 · 작업) 제목 띠 (ADR-1314)
    'fg.ench.current': { ko: '현재 옵션', en: 'Current Option', zh: '当前词条' },
    'fg.ench.none': { ko: '없음', en: 'None', zh: '无' },
    'fg.ench.new': { ko: '새 옵션', en: 'New Option', zh: '新词条' },
    'fg.ench.keep': { ko: '유지', en: 'Keep', zh: '保留' },
    'fg.ench.pick': { ko: '선택', en: 'Choose', zh: '选择' },
    'fg.ench.go': { ko: '인챈트', en: 'Enchant', zh: '附魔' },
    'fg.ench.wait': { ko: '선택 대기', en: 'Choose first', zh: '等待选择' },   // 고르기 대기 중 [인챈트] 자리
    'fg.ench.options': { ko: '후보 옵션', en: 'Possible options', zh: '候选词条' },
    'fg.ench.rareOnly': { ko: '레어 이상만', en: 'Rare or better only', zh: '仅限稀有及以上' },
    'fg.ench.added': { ko: '인챈트 · {line}', en: 'Enchanted · {line}', zh: '附魔 · {line}' },
    'fg.ench.kept': { ko: '현재 옵션 유지', en: 'Kept the current option', zh: '已保留当前词条' },
    'fg.ench.took': { ko: '새 옵션으로 교체', en: 'Switched to the new option', zh: '已换成新词条' },
    'fg.err.noEnchant': { ko: '레어 이상 장비만 가능', en: 'Rare or better items only', zh: '仅限稀有及以上装备' },
    'fg.err.undecided': { ko: '새 줄 선택 대기 중', en: 'Choose a line first', zh: '请先选择词条' },
    'fg.err.noOption': { ko: '붙을 옵션 없음', en: 'No options left to add', zh: '没有可附加的词条' },
    'fg.err.noPending': { ko: '선택할 줄 없음', en: 'Nothing to choose', zh: '没有可选择的词条' },
    // ~~제작 칸 `fg.make.*` · `fg.made` · `fg.err.bagFull` · 물약 `fg.potion.*`~~ — 대장간 제작 탭과 함께 걷었다(2026-11-24 · R574 · ADR-1374)
    'fg.synthed': { ko: '합성 — {name} ×{n}', en: 'Combined — {name} ×{n}', zh: '已合成——{name} ×{n}' },
    // 합성 · 인챈트 · 담금질 거절 — 결과 코드와 짝(`fg.err.<코드>` · `flashErr`)
    'fg.err.materials': { ko: '재료 부족', en: 'Not enough materials', zh: '材料不足' },
    'fg.err.missing': { ko: '없는 장비 · 재료', en: 'Unknown item or material', zh: '找不到这件装备或材料' },
    'fg.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },

    /* ── 연구소 「대장간」 줄 등록 창 — 제작 줄 · 장비 칸 · 창고 판 (SCREEN_DESIGN §8 · ADR-1373 · R574) ── */
    'lf.h.make': { ko: '제작', en: 'Crafting', zh: '制作' },
    'lf.h.slots': { ko: '장비 칸 {n} / {cap}', en: 'Gear Slots {n} / {cap}', zh: '装备栏位 {n} / {cap}' },
    'lf.h.stash': { ko: '창고 {n} / {cap}', en: 'Stash {n} / {cap}', zh: '仓库 {n} / {cap}' },
    'lf.take': { ko: '창고로', en: 'To Stash', zh: '移入仓库' },
    'lf.takeAll': { ko: '모두 창고로', en: 'All to Stash', zh: '全部移入仓库' },
    'lf.salvage': { ko: '분해', en: 'Salvage', zh: '分解' },
    'lf.rest.full': { ko: '칸 가득 참', en: 'Slots full', zh: '栏位已满' },
    'lf.rest.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    'lf.rest.materials': { ko: '재료 부족', en: 'Not enough materials', zh: '材料不足' },
    'lf.rest.none': { ko: '목표 없음', en: 'No target', zh: '尚未选择制作目标' },
    'lf.every': { ko: '{h}시간마다', en: 'Every {h}h', zh: '每 {h} 小时' },
    'lf.gear': { ko: '장비', en: 'Gear', zh: '装备' },   // 재접속 알림 「장비 +n」 — 대장간 줄이 칸에 넣은 수 (ADR-1296 · R574)
    'lf.err.notRegistered': { ko: '대장간 줄에 등록 안 된 영웅', en: 'Hero is not assigned to the Blacksmith', zh: '该英雄未派驻到铁匠铺线' },

    /* ── 도움말 탭 (2026-08-26 · 전면 정리 2026-10-29) ──
       현재 탭의 조작법과 규칙은 help.<tab>.<topic>에 한/영으로 둔다 (ADR-0946).
       기존 패널 안내 키는 사용하는 화면이 남아 있으면 유지한다. */
    'todo.badge': { ko: '미착수', en: 'Not started', zh: '未开工' },
    'todo.lead': { ko: '기획은 확정됐고 화면이 아직 없습니다 — 지금 여기서 할 수 있는 일은 없습니다', en: 'The design is settled; the screen is not built yet — there is nothing to do here yet', zh: '设计已确定，画面尚未制作——目前这里无事可做' },
    'ex.h': { ko: '탐험', en: 'Exploration', zh: '探索' },
    'help.title': { ko: '도움말', en: 'Help', zh: '帮助' },
    'help.newgame': { ko: '새 게임', en: 'New Game', zh: '新游戏' },
    'help.exp.party': { ko: '전투 {n}인 — 동시 원정 {m}팀', en: '{n} fighters — {m} expedition at a time', zh: '出战{n}人——同时远征{m}队' },
    'help.exp.bench': { ko: '파견 대기 · 영웅 로스터 {n} / {cap}', en: 'Awaiting dispatch · Hero roster {n} / {cap}', zh: '待派遣 · 英雄名册{n} / {cap}' },

    // 각 탭의 현재 사용법 — NAV_GROUPS와 같은 순서로 helpSections가 조회합니다 (ADR-0946).
    'help.contents': { ko: '도움말 목차', en: 'Help contents', zh: '帮助目录' },
    'help.search.label': { ko: '도움말 검색', en: 'Search help', zh: '搜索帮助' },
    'help.search.placeholder': { ko: '물약, 스킬, 스킬북처럼 궁금한 말을 입력하세요', en: 'Try potions, skills, books…', zh: '输入想查询的词，例如药水、技能、技能书' },
    'help.search.clear': { ko: '검색 지우기', en: 'Clear search', zh: '清除搜索' },
    'help.search.all': { ko: '전체 {n}개 설명', en: { one: '{n} topic', other: '{n} topics' }, zh: '共{n}条说明' },
    'help.search.count': { ko: '검색 결과 {n}개', en: { one: '{n} matching topic', other: '{n} matching topics' }, zh: '搜索结果{n}条' },
    'help.search.empty': { ko: '맞는 설명을 찾지 못했습니다. 다른 말로 검색하거나 검색을 지워 전체 도움말을 확인합니다.', en: 'No matching topics. Try another word or clear the search to view all help.', zh: '未找到匹配的说明。请换个词搜索，或清除搜索查看全部帮助。' },
    'help.expedition.first_steps.title': {
        ko: "처음 플레이하는 순서",
        en: "Your first steps",
        zh: '新手入门顺序',
    },
    'help.expedition.first_steps.body': {
        ko: "시작 영웅을 확정하면 상단 두루마리 아래에 메인미션 팻말이 뜹니다. 팻말을 눌러 안내 테두리를 따라가세요. 원정에서 첫 스테이지를 골라 [보내기], 건설에서 창고 짓기, 연구소 자원 줄에 영웅을 등록하기까지 차례로 안내합니다. 완료 판의 [받기]를 누르면 그 자리에서 보상을 받고 다음 안내를 볼 수 있습니다.<br><br>원정 전투는 자동으로 진행됩니다. 편성에서 인원·진형·물약·작전 카드를 준비하고, 캐릭터에서 장비와 마스터리를 바꿉니다. 다음 스테이지가 어렵다면 이미 깬 장소를 반복 원정해 장비·경험치를 모으고, 연구소 생산과 선술집 의뢰로 건설·강화에 쓸 재료와 골드를 마련합니다.",
        en: "Once you confirm your starting heroes, a Main Mission sign appears under the scroll at the top. Select the sign and follow the highlight. It guides you through sending a party to the first Expedition stage, building Storage, and assigning a hero to the Resources line in the Laboratory. Select [Claim] on the completion card to collect the reward and see the next step.<br><br>Expedition combat is automatic. Set up heroes, formation, potions and Tactic Cards in Party, then manage gear and masteries in Character. If the next stage is tough, repeat an area you have cleared for gear and XP. Laboratory production and Tavern commissions provide materials and gold for construction and upgrades.",
        zh: "确认初始英雄后，顶部卷轴下会出现主线任务提示牌。点击提示牌并跟随高亮指引，依次派队前往远征的第一个关卡、建造仓库，再向研究所的资源线派驻英雄。点击完成卡上的【领取】，即可当场领取奖励并查看下一步。<br><br>远征战斗自动进行。在编队中设置英雄、阵型、药水和战术卡，在角色页调整装备和专精。如果下一关过不去，可以重复远征已通关的地点来积累装备和经验，再通过研究所生产与酒馆委托筹集建造和强化所需的材料及金币。",
    },
    'help.expedition.start.title': {
        ko: "출발과 부대",
        en: "Departure and parties",
        zh: '出发与小队',
    },
    'help.expedition.start.body': {
        ko: "왼쪽 <b>[원정]</b> 탭에서 스테이지 목록을 열고 난이도·챕터·열린 스테이지를 고릅니다. 출정 창에서 적 구성과 보상을 확인하고, 편성을 고른 뒤 <b>[보내기]</b>로 출발합니다. 인원·진형·물약·전술은 편성 탭에서 준비합니다.<br><br>한 파티에는 최대 {party}명이 들어가며, 현재 동시에 원정을 보낼 수 있는 부대는 {expeditions}개입니다. 같은 영웅을 여러 부대에 동시에 보낼 수 없습니다.",
        en: "Open the stage list with <b>Expedition</b> in the left navigation, then choose a difficulty, chapter and unlocked stage. Inspect enemies and rewards in the departure window, choose a Party preset and press <b>Deploy</b>. Prepare members, formation, potions and tactics in Party.<br><br>Each party holds up to {party} heroes. You can send {expeditions} parties on expeditions at once. A hero cannot join multiple active expeditions.",
        zh: '在左侧<b>[远征]</b>标签页打开关卡列表，选择难度、章与已开放的关卡。在出征窗口中确认敌人构成与奖励，选择编队后按<b>[派遣]</b>出发。成员、阵型、药水与战术在编队标签页中准备。<br><br>一支队伍最多容纳{party}名英雄，目前可同时派出远征的小队为{expeditions}个。同一名英雄不能同时派往多个小队。',
    },
    'help.expedition.rounds.title': {
        ko: "라운드와 한 번의 원정",
        en: "Rounds and a complete run",
        zh: '回合与一次远征',
    },
    'help.expedition.rounds.body': {
        ko: "한 스테이지를 시작해서 끝낼 때까지가 한 번의 원정이며, 그 안에서 적 무리와 싸우는 단위가 라운드입니다. 라운드를 이기면 그 라운드의 보상을 받고 다음 무리와 싸웁니다. 모든 라운드를 이겨야 스테이지가 클리어됩니다.<br><br>철수·패배·게임 종료 뒤에도 아직 이기지 못한 라운드의 적과 장비는 다시 만납니다. 이미 이긴 라운드는 다음 출발에 새 무리로 바뀝니다. 여러 부대가 같은 스테이지에 가면 서로 다른 무리를 맡고, 미완료 무리는 다음 부대에게 돌아갑니다. 파티 매직아이템 획득확률을 높이면 같은 적의 장비 희귀도가 좋아질 수 있습니다.<br><br>다음 라운드로 넘어가도 깎인 HP가 저절로 가득 차지는 않습니다. 쓰러진 영웅도 그 원정에서는 계속 빠져 있으므로, 앞 라운드를 이겼어도 뒤 라운드에서 파티가 무너질 수 있습니다. 회복·보호·적을 빨리 처치하는 힘을 함께 살펴보는 이유입니다.<br><br>라운드 보상으로 레벨이 오른 영웅은 다음 라운드를 최대 HP로 시작합니다. 원정 자체가 끝나면 승패와 관계없이 모두 회복하며, 다음 원정에는 다시 전원이 출발합니다.",
        en: "A run lasts from entering a stage until that attempt ends. Each fight against a group of enemies is a round. Winning a round grants its rewards and moves on to the next group. Win every round to clear the stage.<br><br>After retreat, defeat or closing the game, unfinished rounds keep their enemies and equipment. Rounds already won bring new groups on the next departure. Multiple parties take different groups at the same stage, and unfinished groups return for the next party. Raising Party Magic Find can improve the same enemies' equipment rarity.<br><br>Lost HP does not automatically refill between rounds. Fallen heroes stay out for the rest of that run, so a party that wins early rounds can still fall apart later. This is why healing, protection and killing enemies quickly all matter.<br><br>A hero who levels up from a round's rewards starts the next round at full HP. When the run itself ends, everyone recovers regardless of the result and can join the next departure.",
        zh: "从开始一个关卡到结束为止是一次远征，其中与一群敌人战斗的单位是回合。赢下一个回合即可获得该回合的奖励，并继续与下一群敌人战斗。必须赢下所有回合才算通关该关卡。<br><br>撤退、战败或关闭游戏后，尚未赢下的回合中的敌人与装备不会改变，下次还会遇到。已赢下的回合在下次出发时会换成新的敌群。多个小队前往同一关卡时会各自负责不同的敌群，未完成的敌群会留给下一个小队。提高队伍魔法物品获取率，同一批敌人的装备稀有度可能会变好。<br><br>进入下一回合时，损失的生命不会自动回满。倒下的英雄在该次远征中也会一直缺席，因此即使赢下了前面的回合，队伍也可能在后面的回合崩溃。这就是要同时关注治疗、保护与快速击杀敌人能力的原因。<br><br>因回合奖励而升级的英雄会以最大生命开始下一回合。远征本身结束后，无论胜负全员都会恢复，下次远征时全员再次出发。",
    },
    'help.expedition.stages.title': {
        ko: "스테이지와 난이도",
        en: "Stages and difficulty",
        zh: '关卡与难度',
    },
    'help.expedition.stages.body': {
        ko: "챕터의 일반 장소에는 I·II·III 스테이지가 있으며, 한 번 출발하면 고른 스테이지 하나를 진행합니다. 같은 장소에서도 뒤 스테이지일수록 레벨이 높습니다. I·II에는 정예가 나오고 III의 마지막에는 보스가 나옵니다. 마지막 장소는 챕터보스와 싸우는 단일 라운드입니다.<br><br>노말·나이트메어에서는 이전 스테이지를 클리어하면 다음 스테이지가 열리고, 챕터보스를 클리어하면 다음 챕터가 열립니다. 난이도별 클리어 기록은 따로 관리됩니다. 헬 난이도가 열리면 해금된 챕터의 첫 스테이지를 각각 선택할 수 있고, 챕터 안에서는 순서대로 진행합니다.",
        en: "Regular areas contain stages I, II and III. Each departure runs one selected stage, with higher-level enemies in later stages of the same area. Stages I and II contain elites; stage III ends with a boss. The last area is a single round against the chapter boss.<br><br>On Normal and Nightmare, clearing a stage unlocks the next one, and beating a chapter boss opens the next chapter. Clear records are separate for each difficulty. Once Hell difficulty is unlocked, you can choose the first stage of each available chapter, then clear its stages in order.",
        zh: '章中的普通区域有I、II、III三个关卡，每次出发只进行所选的一个关卡。即使在同一区域，越靠后的关卡等级越高。I、II会出现精英，III的最后会出现首领。最后一个区域是与章节首领对战的单回合。<br><br>在普通与噩梦难度下，通关上一个关卡会开放下一个关卡，通关章节首领会开放下一章。各难度的通关记录分别保存。地狱难度开放后，可以分别选择已解锁各章的第一个关卡，章内仍按顺序推进。',
    },
    'help.expedition.repeat.title': {
        ko: "자동 진행과 반복",
        en: "Automatic progress and repeat",
        zh: '自动推进与自动循环',
    },
    'help.expedition.repeat.body': {
        ko: "원정은 게임이 켜져 있는 동안 계속 이어집니다. 승리하면 다음 스테이지로 전진하고, 패배하면 같은 스테이지에 다시 도전합니다. 챕터보스에게 패배하면 바로 앞 스테이지로 돌아가고(반복 원정도 꺼집니다), 그 스테이지를 이기면 다시 챕터보스로 갑니다. [반복 원정]을 켜면 다른 장소로 넘어가지 않고 현재 장소의 I·II·III을 순환합니다. 다음 출발까지 기본 {restart}초를 기다리며, 관전 중 [건너뛰기]로 대기를 줄일 수 있습니다.<br><br>반복을 끄고 현재 난이도의 마지막 챕터보스를 이기면 다음 난이도가 있을 때 그 첫 스테이지로 이어집니다. 원정을 멈추려면 [철수]합니다.",
        en: "Expeditions continue while the game is open. A win advances to the next stage; a defeat retries the same stage. A defeat by a chapter boss goes back to the previous stage (and turns off Auto-repeat); winning there heads back to the boss. Turn on [Auto-repeat] to cycle through stages I, II and III of the current area instead of moving to another area. The next departure normally waits {restart} seconds; [Skip] in spectate shortens that wait.<br><br>With Auto-repeat off, beating the final chapter boss continues from the first stage of the next difficulty, if one exists. Press [Retreat] to stop.",
        zh: '只要游戏开着，远征就会一直持续。胜利则前进到下一个关卡，战败则重新挑战同一关卡。败给章节首领时会退回前一个关卡（自动循环也会关闭），赢下该关卡后再次挑战章节首领。开启[自动循环]后，不会前往其他区域，而是在当前区域的I、II、III之间循环。到下次出发前默认等待{restart}秒，观战时可用[跳过]缩短等待。<br><br>关闭自动循环并击败当前难度的最后一个章节首领后，如果存在下一难度，会接着进入该难度的第一个关卡。要停止远征，请按[撤退]。',
    },
    'help.expedition.farming.title': {
        ko: "전진할 때와 반복할 때",
        en: "When to advance or repeat",
        zh: '何时前进，何时循环',
    },
    'help.expedition.farming.body': {
        ko: "새 스테이지를 클리어하면 다음 길과 건설 조건을 열 수 있습니다. [반복 원정]은 지금 장소를 더 돌며 장비·스킬북·골드·도감 경험치를 모으고 싶을 때 사용합니다. 반복을 켜는 것은 전투를 계속하는 스위치가 아니라, 다음에 갈 장소를 제한하는 선택입니다.<br><br>막힌 곳에 계속 도전할지, 이미 이길 수 있는 장소를 돌지는 필요한 보상으로 정합니다. 원하는 스킬북은 스킬 도감의 획득처를 보고, 장비를 바꾸거나 분해 재료가 필요하면 적의 장비와 인벤토리 여유도 확인합니다. 원정에서 모은 재료는 대장간과 도서관의 성장에 다시 쓸 수 있습니다.",
        en: "Clearing a new stage can open the next route and meet building requirements. Use [Auto-repeat] when you want more gear, skill books, gold or Codex EXP from the current area. Repeat controls where the party goes next; expeditions continue even with it turned off.<br><br>Choose between retrying a difficult stage and farming a manageable area based on what you need. Check the Skill Codex for book sources. For new gear or salvage materials, inspect enemy equipment and keep inventory space available. Materials earned through expeditions can fund further growth at the Blacksmith and Library.",
        zh: '通关新关卡可以开放下一条路线，并满足建设条件。想在当前区域多刷一些装备、技能书、金币与图鉴经验时，使用[自动循环]。开启自动循环并不是让战斗继续的开关，而是限制下一个目的地的选择。<br><br>是继续挑战卡住的关卡，还是刷已经能赢的区域，取决于你需要的奖励。想要的技能书可在技能图鉴中查看获取途径；需要更换装备或需要分解材料时，也要查看敌人的装备和背包剩余空间。远征中收集的材料可以再用于铁匠铺与图书馆的成长。',
    },
    'help.expedition.spectate.title': {
        ko: "전투 관전과 변경 적용",
        en: "Spectating and changes",
        zh: '观战与变更生效',
    },
    'help.expedition.spectate.body': {
        ko: "상단의 Party 칸을 눌러 해당 부대의 전투를 봅니다. 다른 탭을 보아도 전투는 진행됩니다. 영웅과 적의 그림에 마우스를 올리면 능력치·스킬·장비를 확인하고, 영웅을 누르면 아래 인벤토리의 장착 대상이 됩니다.<br><br>전투 중 장비와 마스터리를 바꾸면 보스전을 포함해 진행 중인 전투에 즉시 반영됩니다. 승리 후 자동 출정은 출발 당시의 편성을 이어 사용합니다. 바꾼 인원·진형·물약·전술을 확실히 반영하려면 [철수]한 뒤 다시 [보내기]합니다.",
        en: "Select a Party tab at the top to spectate that party. Combat continues when you view other tabs. Hover heroes or enemies to inspect stats, skills and gear. Click a hero to choose the equip target for the inventory below. Equipment and mastery changes apply immediately to combat in progress, including boss fights.<br><br>Automatic departures after wins retain the original preset configuration. To apply changed members, formation, potions or tactics, [Retreat] and [Deploy] again.",
        zh: '点击顶部的Party栏即可观看该小队的战斗。查看其他标签页时，战斗仍会进行。将鼠标悬停在英雄或敌人的图像上可查看属性、技能与装备，点击英雄则会将其设为下方背包的装备对象。<br><br>战斗中更换装备与专精，会立即反映到进行中的战斗，包括首领战。胜利后的自动出征会沿用出发时的编队配置。要确保更改后的成员、阵型、药水与战术生效，请先[撤退]，再重新[派遣]。',
    },
    'help.expedition.controls.title': {
        ko: "배속 · 일시정지 · 전투 정보",
        en: "Speed, pause and battle information",
        zh: '倍速 · 暂停 · 战斗信息',
    },
    'help.expedition.controls.body': {
        ko: "관전 화면의 ×숫자 버튼은 그 부대의 전투가 흐르는 속도를 고릅니다. <b>[일시정지]</b>하면 그 부대의 진행이 멈추고 <b>[재개]</b>로 이어갑니다. 다른 게임 탭으로 이동해도 그 부대에 고른 속도·정지 상태는 이어집니다.<br><br><b>전투 로그</b>는 누가 어떤 행동을 했는지 시간 순서로 보여 주고, <b>누적 데미지</b>는 영웅·스킬별 가한 피해와 받은 피해를 비교하는 판입니다. 해당 버튼을 다시 누르면 그 정보판을 닫고 전투를 넓게 볼 수 있습니다. 쓰러진 이유나 준비한 스킬이 실제로 나가는지 확인할 때 함께 살펴봅니다.",
        en: "The ×number buttons in spectate select how quickly that party's battle progresses. <b>Pause</b> stops that party, and <b>Resume</b> continues it. Its chosen speed and paused state persist when you visit another game tab.<br><br>The <b>Combat Log</b> shows actions in time order, while <b>Damage</b> compares damage dealt and taken by hero and skill. Press the same button again to close its panel and widen the battle view. Use these panels to see why heroes fall or whether the skills you prepared actually activate.",
        zh: '观战画面中的×数字按钮用于选择该小队战斗的流速。按<b>[暂停]</b>会停止该小队的进程，按<b>[继续]</b>则恢复。切换到游戏的其他标签页后，该小队所选的速度与暂停状态依然保留。<br><br><b>战斗记录</b>按时间顺序显示谁做了什么行动；<b>累计伤害</b>面板则按英雄与技能比较造成的伤害和受到的伤害。再次按下对应按钮即可关闭该信息面板，扩大战斗画面。想确认英雄倒下的原因，或准备的技能是否真的施放时，可以一并查看。',
    },
    'help.expedition.rewards.title': {
        ko: "보상·리포트·회복",
        en: "Loot, reports and recovery",
        zh: '奖励、报告与恢复',
    },
    'help.expedition.rewards.body': {
        ko: "이긴 라운드의 장비와 보상은 해당 부대의 인벤토리·재고에 들어옵니다. 인벤토리가 가득 차면 넘친 장비는 가루와 부위 재료로 분해됩니다. 자동 분해에서 보존하도록 정한 장비도 공간 부족으로 넘치면 분해될 수 있으므로 빈 칸을 확보합니다. 처치 골드는 원정 전체의 합을 기준으로 반올림하며, 이긴 라운드마다 이번 라운드에서 늘어난 몫을 받습니다.<br><br><b>[Report]</b>는 왼쪽 원정 탭의 스테이지 목록 오른쪽 위에서 엽니다. 원정 기록, 획득 아이템, 영웅별 가한 피해·받은 피해·처치와 쓰러짐을 확인할 수 있습니다. 철수하거나 패배해도 이미 이긴 라운드의 보상은 남고, 끝내지 못한 라운드에서는 보상을 받지 못합니다.<br><br>원정이 끝나면 HP와 전투불능이 무료로 즉시 회복됩니다. 챕터보스를 쓰러뜨린 뒤에는 재등장 대기시간이 있으며, 그동안 같은 난이도의 해당 보스에게는 어느 부대도 다시 출발할 수 없습니다. 첫 클리어 상자는 일반 처치 보상과 다른 별도 보상입니다.",
        en: "Rewards from won rounds enter that party's inventory and your stock. When its inventory is full, overflow gear is salvaged into dust and slot materials. Overflow can consume gear marked to keep by auto-salvage rules, so leave free slots. Kill gold is rounded across the whole Expedition, and each won round pays its share.<br><br>Open <b>Report</b> at the top right of the stage list in Expedition. It shows run history, loot, and each hero's damage dealt, damage taken, kills and falls. Retreating or losing keeps rewards from rounds already won; unfinished rounds grant no rewards.<br><br>At the end of a run, lost HP and fallen heroes recover immediately for free. A defeated chapter boss has a respawn wait. No party can enter that boss stage on the same difficulty until it returns. First-clear chests are separate from ordinary kill rewards.",
        zh: "已赢回合的装备与奖励会进入该小队的背包与库存。背包满后，溢出的装备会被分解为粉尘与部位材料。即使是在自动分解中设为保留的装备，也可能因空间不足溢出而被分解，所以要留出空格。 击杀金币按整趟远征的累计总额四舍五入，每个获胜回合发放该回合新增的金币。<br><br><b>[报告]</b>在左侧远征标签页关卡列表的右上角打开。可以查看远征记录、获得的物品，以及每名英雄造成的伤害、受到的伤害、击杀与倒下。即使撤退或战败，已赢回合的奖励也会保留；未完成的回合则得不到奖励。<br><br>远征结束后，生命与倒下状态会立即免费恢复。击败章节首领后会有重生等待时间，在此期间，任何小队都无法再次出发挑战同一难度的该首领。首通宝箱是独立于普通击杀奖励的额外奖励。",
    },
    'help.expedition.firstclear.title': {
        ko: "메인미션과 첫 클리어 상자",
        en: "Main Missions and first-clear chests",
        zh: "主线任务与首通宝箱",
    },
    'help.expedition.firstclear.body': {
        ko: "상단의 두루마리를 누르면 메인미션에서 다음 목표와 받을 보상을 볼 수 있습니다. [바로가기]를 누르면 필요한 탭이나 행동에 안내 테두리가 표시됩니다. 1장의 네 번째 목표인 첫 연구까지는 두루마리 아래 팻말에서도 안내를 열 수 있습니다. 1장에서 완료한 미션은 두루마리 아래 완료 판에서 [받기]를 누르거나 미션 창에서 수령합니다.<br><br>장소 보스를 처음 쓰러뜨리는 메인미션의 보상에는 장비 상자가 있습니다. 상자는 창고로 들어가고, 창고가 차 있으면 우편함으로 갑니다. 장비를 받을 영웅을 고르고 창고에서 상자를 우클릭한 뒤 [사용]을 누르면 그 영웅의 직업과 레벨에 맞는 장비가 나옵니다.",
        en: "Select the scroll at the top to see the next Main Mission and any rewards ready to claim. [Go to] highlights the relevant tab or action. The sign below the scroll also opens guidance through Chapter 1's fourth objective, starting your first research. Claim completed Chapter 1 missions from the card below the scroll or from the mission window.<br><br>Main Mission rewards for defeating certain bosses for the first time include gear chests. A chest goes to the stash, or to the mailbox if the stash is full. Select the hero you want to give gear to, then right-click the chest and select [Use] to get gear for that hero's class and level.",
        zh: "点击顶部卷轴，可查看主线任务的下一目标和待领取奖励。点击【前往】会高亮相关页签或操作。第 1 章的第四个目标是首次研究，到这一步为止，也可以从卷轴下方的提示牌打开指引。第 1 章已完成的任务可在卷轴下方的完成卡上点击【领取】，也可在任务窗口领取。<br><br>首次击败指定地点首领的主线任务会奖励装备宝箱。宝箱会进入仓库，仓库已满时会寄到邮箱。选中要领取装备的英雄，在仓库中右键点击宝箱并选择【使用】，即可获得符合该英雄职业和等级的装备。",
    },
    'help.expedition.review.title': {
        ko: "막힌 원정을 살펴보는 순서",
        en: "Reading a difficult run",
        zh: '分析卡关远征的顺序',
    },
    'help.expedition.review.body': {
        ko: "[Report]에서 먼저 끝난 이유를 봅니다. 앞에서 버티던 영웅이 일찍 쓰러졌다면 받은 피해와 쓰러짐에 표시된 적을 확인하고, 그 적의 스킬이 물리인지 원소인지 살펴봅니다. 물리 방어·해당 원소 저항·최대 HP·회복 중 부족한 쪽을 바꿔 볼 수 있습니다. 쓰러짐의 적 이름은 그 영웅에게 가장 많은 피해를 준 적입니다.<br><br>영웅이 살아 있는데 제한시간을 넘겼다면 남은 적의 HP와 가한 피해를 봅니다. 무기 세기, 꺼진 스킬, 행동 속도, 스킬 쿨타임, 적의 회복·방어 등을 확인합니다. 물리 공격의 빗나감이 많다면 명중률과 영웅별 레벨 차도 살펴봅니다.<br><br>한 번에 하나씩 바꾸고 다음 리포트와 비교하면 무엇이 부족했는지 읽기 쉽습니다. 같은 장소도 적 구성과 장비가 달라질 수 있으므로, 한 번의 결과만으로 새 장비나 편성이 항상 더 좋다고 단정하지 않습니다.",
        en: "Start with the ending reason in [Report]. If a front-line hero fell early, check damage taken and the enemy named in the fall entry, then inspect whether that enemy's skill deals physical or elemental damage. Consider physical defense, the matching resistance, maximum HP or healing. The enemy named in a fall entry is the one that dealt the most damage to that hero.<br><br>If heroes survive but the timer expires, check the remaining enemies' HP and damage dealt. Review weapon strength, inactive skills, action speed, skill cooldowns and enemy healing or defenses. Frequent physical misses are a reason to check accuracy and each hero's level deficit.<br><br>Change one thing at a time and compare later reports to identify the problem. Enemy groups and equipment can vary within the same area, so a single result does not prove that a new item or formation is always better.",
        zh: '先在[报告]中查看结束的原因。如果在前排顶住的英雄过早倒下，就查看受到的伤害与倒下记录中标注的敌人，再看该敌人的技能是物理还是元素。可以针对物理防御、对应元素抗性、最大生命、治疗中不足的一项进行调整。倒下记录中的敌人名称，是对该英雄造成伤害最多的敌人。<br><br>如果英雄还活着却超过了时限，就查看剩余敌人的生命与造成的伤害。检查武器强度、失效的技能、行动速度、技能冷却，以及敌人的治疗与防御等。如果物理攻击经常落空，也要查看命中率与每名英雄的等级差。<br><br>每次只改一项，再与下一份报告比较，就更容易看出缺少的是什么。同一区域的敌人构成与装备也可能变化，所以不要只凭一次结果就断定新装备或新编队一定更好。',
    },
    'help.expedition.shrines.title': {
        ko: "다음 스테이지를 돕는 신단",
        en: "Shrines for the next stage",
        zh: '助力下一关卡的圣坛',
    },
    'help.expedition.shrines.body': {
        ko: "같은 장소의 I을 이기고 II로, II를 이기고 III으로 이어 가면 무작위 신단 하나가 다음 스테이지의 그 부대 전원에게 적용됩니다. 신단은 직접 누르거나 장착하는 물건이 아니며, 보너스만 주는 일시 효과입니다. III에서 I로 순환할 때나 다른 장소로 넘어갈 때는 새 신단을 받지 않습니다.<br><br>신단마다 피해·최대 HP·저항·흡혈·쿨타임·경험치·파밍 보너스 등 돕는 방향이 다릅니다. 관전의 신단 이름에 마우스를 올리거나 [버프] 창을 열면 지금 효과를 확인할 수 있습니다. 앞 스테이지에서 얻은 신단 덕에 평소보다 잘 버티거나 빨리 잡을 수도 있습니다.<br><br>효과는 그 스테이지 한 번에만 적용되며, 이기든 지든 원정이 끝나면 사라집니다. 패배 후 같은 스테이지에 다시 도전할 때는 그 신단을 유지하지 않습니다. 철수하거나 게임을 닫아 원정이 끊겨도 사라집니다.",
        en: "Continuing from stage I to II, or II to III within the same area, grants a random shrine effect to the whole party for the next stage. Shrines are temporary benefits, not items to click or equip. Cycling from III back to I or moving to another area grants no new shrine.<br><br>Shrines can support damage, maximum HP, resistances, life steal, cooldowns, XP or farming. Hover the shrine name during spectate or open [Buffs] to see the current effect. A shrine from the previous stage can explain why a party survives better or defeats enemies faster than usual.<br><br>The effect lasts for that one stage attempt and expires when it ends, whether you win or lose. Retrying after a defeat does not keep that shrine. Retreating or closing the game also removes it.",
        zh: '在同一区域赢下I后接着进入II、赢下II后接着进入III时，会有一个随机圣坛在下一个关卡中作用于该小队全员。圣坛不是需要点击或装备的物品，而是只提供加成的临时效果。从III循环回I或前往其他区域时，不会获得新的圣坛。<br><br>每个圣坛的助力方向不同，包括伤害、最大生命、抗性、吸血、冷却、经验、刷宝加成等。将鼠标悬停在观战画面的圣坛名称上，或打开[增益]窗口，即可查看当前效果。得益于前一关卡获得的圣坛，队伍可能比平时更耐打，或更快击杀敌人。<br><br>效果只在该关卡的这一次挑战中生效，无论胜负，远征结束后即消失。战败后再次挑战同一关卡时，不会保留该圣坛。撤退或关闭游戏导致远征中断时，效果同样消失。',
    },
    'help.expedition.difficulty.title': {
        ko: "같은 챕터를 더 높은 난이도로",
        en: "Revisiting chapters on higher difficulties",
        zh: '以更高难度重温同一章',
    },
    'help.expedition.difficulty.body': {
        ko: "노말을 진행한 뒤 나이트메어, 그 뒤 헬로 같은 챕터를 다시 돌아갑니다. 난이도는 이름만 바꾸는 것이 아니라 적의 레벨·체력·피해·착용 장비와 스킬 구성을 바꿉니다. 같은 초상이라도 이전 난이도에서 이겼던 방식이 그대로 통한다고 생각하지 않고 적의 현재 스킬과 장비를 확인합니다.<br><br>일반 원정 드롭에서는 에픽 장비가 나이트메어의 정예·보스부터, 레전더리 장비가 헬의 정예·보스에서 나올 수 있습니다. 일반 몬스터의 장비는 헬에서도 레어까지입니다. 파티 매직아이템 획득확률을 높여도 그 난이도·몬스터 등급에서 나오지 않는 희귀도가 새로 열리지는 않습니다.<br><br>헬의 몬스터 레벨과 드롭 장비 레벨은 만렙에서 고정되고, 영웅도 레벨 상한을 넘어 자라지는 않습니다. 다른 장의 첫 스테이지를 골라 파티와 보상이 맞는 곳부터 공략할 수 있습니다. 각 장의 디버프가 다르므로 레벨 외의 대응이 중요해집니다.<br><br>나이트메어와 헬의 일반·정예 라운드에서는 장소별 적 작전 카드가 적용됩니다. 라운드 시작 전투 로그에서 카드 이름을 확인할 수 있습니다. 정예 카드의 특성 칩은 그 정예에게 붙은 죄종·강화·방어 효과를 보여 줍니다.",
        en: "After Normal, revisit the chapters on Nightmare and then Hell. Difficulty changes enemy levels, HP, damage, equipment and skill loadouts, not just the name. An enemy with the same portrait may need a different response, so inspect its current skills and gear.<br><br>For ordinary expedition loot, Epic gear can appear from Nightmare elites and bosses, and Legendary gear from Hell elites and bosses. Normal monsters remain limited to Rare gear even in Hell. More Party Magic Find does not unlock a rarity unavailable to that difficulty and monster grade.<br><br>Hell fixes monster and dropped-equipment levels at the level cap; heroes do not level beyond their cap either. You can choose another chapter's first stage and tackle an area that suits your party and reward needs. Different chapter debuffs make responses beyond leveling important.<br><br>In Nightmare and Hell, enemies in Normal and Elite rounds use the area's Tactic Card. Its name appears in the battle log when the round begins. Trait chips show the Sin, enchantment and defensive effects on an Elite.",
        zh: "通关普通难度后，依次在噩梦、地狱难度下重新挑战同样的章。难度改变的不只是名称，还有敌人的等级、生命、伤害、穿戴的装备与技能构成。即使头像相同，也不要以为之前难度中获胜的方法依然有效，要查看敌人当前的技能与装备。<br><br>在普通远征掉落中，史诗装备从噩梦难度起可能由精英、首领掉落，传奇装备可能由地狱难度的精英、首领掉落。普通怪物的装备即使在地狱难度也最多为稀有。即使提高队伍魔法物品获取率，也不会开放该难度与怪物级别本不掉落的稀有度。<br><br>地狱难度的怪物等级与掉落装备等级固定为满级，英雄也不会超过等级上限继续成长。可以选择其他章的第一个关卡，从适合队伍与所需奖励的地方开始攻略。各章的减益不同，因此等级以外的应对变得重要。<br><br>在噩梦和地狱难度中，普通与精英回合的敌人会使用该地点的战术卡。回合开始时可在战斗日志中看到卡名。精英的特性标记显示其罪宗、强化与防御效果。",
    },
    'help.expedition.hell_debuffs.title': {
        ko: "헬에서 장마다 달라지는 위험",
        en: "Hell chapter hazards",
        zh: '地狱难度中每章不同的危险',
    },
    'help.expedition.hell_debuffs.body': {
        ko: "헬에서는 출정 창 제목 옆에 그 장의 디버프가 표시됩니다. 같은 장 안에서는 기본 효과가 같고, 챕터보스 스테이지에서는 효과가 더 강합니다. 피해가 갑자기 커지거나 회복이 약해 보일 때 적 스킬과 함께 이 표시도 확인합니다.<br><br>1장 분노는 몬스터의 물리·원소 직격으로 받는 피해를 늘립니다. 2장 시기는 영웅 전원에게 주기적으로 중독을 걸어 독 피해를 줍니다. 독 저항과 중독 지속시간을 줄이는 수단이 서로 다른 방식으로 도움을 줄 수 있습니다.<br><br>3장 탐욕은 받는 회복을 줄이며, 회복 스킬·재생·물약·흡혈에 모두 적용됩니다. 4장 나태는 주기적으로 결빙을 걸어 행동을 느리게 합니다. 결빙은 스킬 쿨타임을 멈추지 않으므로, 단순히 모든 행동이 스턴처럼 멈춘 상황과 구별합니다.<br><br>5장 폭식은 한 라운드가 길어질수록 몬스터가 주는 물리·원소 직격 피해를 상한까지 늘립니다. 다음 라운드에서는 다시 처음부터 증가합니다. 오래 버티는 것만으로 풀리는지, 적을 더 빨리 잡아 위험이 커지는 시간을 줄여야 하는지도 살펴봅니다.",
        en: "On Hell, the departure-window heading shows the chapter's debuff. Its base effect is shared across that chapter, with a stronger effect in the chapter-boss stage. Check it alongside enemy skills when damage rises or healing seems weaker than expected.<br><br>Chapter 1, Wrath, increases Physical and elemental direct-hit damage taken from monsters. Chapter 2, Envy, periodically poisons the whole party. Poison Resistance and shorter Poison duration can help in different ways.<br><br>Chapter 3, Greed, reduces healing received from healing skills, regeneration, potions and life steal. Chapter 4, Sloth, periodically applies Freeze and slows actions. Freeze does not pause skill cooldowns, so distinguish it from Stun.<br><br>Chapter 5, Gluttony, increases monster Physical and elemental direct-hit damage as a round lasts longer, up to a cap. The increase starts over in the next round. Consider whether surviving longer is enough or whether faster kills would reduce time spent facing the stronger effect.",
        zh: '在地狱难度中，出征窗口标题旁会显示该章的减益。同一章内基础效果相同，章节首领关卡中的效果更强。当伤害突然变大或治疗显得变弱时，除了敌人的技能，也要查看这一显示。<br><br>第1章“愤怒”会提高英雄受到的怪物物理、元素直击伤害。第2章“嫉妒”会周期性地使全体英雄中毒，造成毒素伤害。毒素抗性与缩短中毒持续时间的手段，能以不同的方式提供帮助。<br><br>第3章“贪婪”会降低受到的治疗，对治疗技能、再生、药水、吸血全部生效。第4章“怠惰”会周期性地施加冻结，使行动变慢。冻结不会让技能冷却停止，所以要与眩晕那样所有行动完全停止的情况区分开。<br><br>第5章“暴食”会随一个回合持续得越久，使怪物造成的物理、元素直击伤害不断提高，直至上限。进入下一回合后会从头开始重新增加。也要考虑是仅靠长时间坚持就能解决，还是需要更快击杀敌人，以缩短危险加剧的时间。',
    },
    'help.expedition.offline.title': {
        ko: "게임을 닫았을 때",
        en: "Closing the game",
        zh: '关闭游戏时',
    },
    'help.expedition.offline.body': {
        ko: "원정 전투는 오프라인 동안 계속되지 않습니다. 게임을 닫으면 진행하던 부대와 다음 출발을 기다리던 부대가 멈춥니다. 다시 접속하면 마지막 리포트를 확인하고 원하는 스테이지에 다시 출발합니다. 탐험과 연구소의 오프라인 진행은 각 도움말에서 확인할 수 있습니다.",
        en: "Expedition combat does not continue offline. Closing the game stops parties in combat and parties waiting for their next departure. On return, check the last report, then deploy again to your chosen stage. Exploration and Laboratory offline progress are explained in their own sections.",
        zh: '离线期间远征战斗不会继续。关闭游戏后，正在战斗的小队与等待下次出发的小队都会停止。重新上线后，查看最后一份报告，再向想去的关卡重新出发。探索与研究所的离线进度可在各自的帮助中查看。',
    },
    // 탐험 — 표 · 끝이 있는 판 · 다 깨야 받음 · 지거나 부르면 잃음 · 꺼진 동안은 시작한 판만 (SCREEN_DESIGN §12 · 2026-11-26 R590 — ~~purpose · time · claim~~ 옛 시간제 주제 걷음)
    'help.explore.map.title': { ko: '지도와 지점', en: 'Map and spots', zh: '地图与地点' },
    'help.explore.map.body': {
        ko: "탐험 건물을 올리면 동굴, 상단 의뢰, 폐허가 차례로 열립니다. 각 종류의 입구는 지도 전체에 하나씩 있고, 어느 챕터로 갈지는 탐험권으로 고릅니다.<br><br>매시 정각에 열린 지역 중 한 곳에 ★ 특별 지점이 나타날 수 있습니다. 그 챕터의 표로 출발하면 보너스가 판이 끝날 때까지 적용됩니다. 지점이 닫히면 이어 돌기도 멈춥니다.",
        en: "Exploration ranks unlock the cave, caravan escort and ruins. Each has one permanent entrance. Choose a ticket to set the chapter and difficulty.<br><br>On the hour, a ★ special site may appear in an unlocked chapter. Use a ticket for that chapter to keep the bonus for the whole run. Repeat stops when the site expires.",
        zh: "探索建筑升阶后依次开放洞穴、商队委托和废墟。每种地点在地图上都有一个常驻入口。票券决定章节和难度。<br><br>每逢整点，已开放章节中可能出现一个 ★ 特殊地点。使用对应章节的票券出发后，加成会持续到本次探索结束。地点到期后，连续探索也会停止。",
    },
    'help.explore.tickets.title': { ko: '탐험권', en: 'Exploration tickets', zh: '探索票券' },
    'help.explore.tickets.body': {
        ko: '탐험은 표 한 장을 내고 갑니다. 표는 원정에서 정예를 쓰러뜨리면 {elite}%, 스테이지보스를 쓰러뜨리면 {boss}% 확률로 나오고, 지점이 새로 열릴 때 공통 탐험권 {first}장을 받습니다. 열린 상시 지점 어디서든 쓸 수 있고, 챕터와 난이도는 표를 주운 원정 칸을 따릅니다. 탐험 판에서는 표가 나오지 않습니다.<br><br>표에는 등급(일반 · 매직 · 레어)이 있습니다. 등급이 높을수록 판이 길어지고(동굴 끝 정예 라운드 · 상단 의뢰 습격 · 폐허 이벤트가 늘어납니다) 보상 배수와 특별한 일이 일어날 확률이 올라갑니다. 표는 인벤토리 칸을 쓰지 않습니다.',
        en: 'Each run spends one ticket. Tickets drop on expeditions — {elite}% per elite and {boss}% per stage boss you defeat — and a newly opened spot gives {first} shared ticket(s). Tickets inherit their expedition stage’s chapter and difficulty and can be spent at any unlocked permanent entrance. Exploration runs never drop tickets.<br><br>Tickets have a grade (Normal · Magic · Rare). Higher grades make the run longer (more elite rounds at the end of the cave, more raids on the caravan escort, more events in the ruins) and raise the reward multiplier and the chance of something special. Tickets don\'t take inventory slots.',
        zh: '每次探索消耗一张票券。远征中每击败一名精英或关卡首领，分别有 {elite}% 和 {boss}% 的概率掉落票券。新地点开放时会赠送 {first} 张通用探索票券。票券继承掉落关卡的章节和难度，可用于任一已开放的常驻入口。<br><br>票券分普通、魔法和稀有三档。高品质票券会增加洞穴的精英回合、商队的伏击次数或废墟事件，同时提高奖励和特殊事件概率。票券不占背包格。',
    },
    'help.explore.depart.title': { ko: '표와 편성으로 보내기', en: 'Sending a party with a ticket', zh: '使用票券派队出发' },
    'help.explore.depart.body': {
        ko: '지점 창에서 표 하나와 편성 하나를 고르고 [보내기]를 누릅니다. 한 명만 든 편성도 갈 수 있고 최대 {party}명까지 함께 갑니다. 편성 하나는 원정이든 탐험이든 한 판만 돌고, 원정과 탐험을 합쳐 {expeditions}개 부대까지 동시에 나갑니다.<br><br>[이어 돌기]를 켜면 판이 끝날 때 같은 챕터·난이도·등급의 탐험권이 남아 있으면 같은 지점으로 다시 출발합니다. [지면 멈춤]까지 켜면 진 판 뒤에는 멈춥니다. 둘 다 보낼 때 정하고 판 중에는 바꾸지 않습니다.',
        en: 'In a spot window, pick a ticket and a party, then press [Send]. A one-hero party can go; up to {party} heroes go together. A party runs one thing at a time — an expedition or an exploration — and expeditions and explorations together can have {expeditions} parties out at once.<br><br>With [Repeat] on, your party returns to the same spot while a ticket of the same chapter, difficulty and grade remains. Add [Stop on loss] to halt after a lost run. Both are set when sending and can\'t be changed mid-run.',
        zh: '在地点窗口选择一张票券和一支编队，再点击【出发】。一名英雄即可出发，最多可带 {party} 名。每支编队同一时间只能进行一趟远征或探索。远征和探索合计最多可同时派出 {expeditions} 支队伍。<br><br>开启【连续探索】后，只要仍有相同章节、难度和品质的票券，编队就会返回同一地点继续探索。勾选【失败时停止】可在战败后停下。请在出发前确定这些选项。',
    },
    'help.explore.run.title': { ko: '판의 진행과 관전', en: 'How a run plays', zh: '探索进程与观战' },
    'help.explore.run.body': {
        ko: '탐험 판은 정해진 단계를 차례로 지나는 끝이 있는 전투입니다. 동굴은 원정 장소 하나의 칸 I · II · III을 원정과 같은 규칙으로 싸우고, 등급에 따라 끝에 정예 라운드가 붙습니다. 상단 의뢰는 마차가 길을 가다 적 영웅 셋에게 습격당하며, 습격 자리는 미리 보이지 않습니다. 폐허는 안개 낀 유적을 지나며 몬스터 · 함정 · 드문 만남 · 물건 · 빈 방을 만납니다. 함정은 우리 편에 헬 난이도의 챕터 디버프를 겁니다.<br><br>나간 부대는 위쪽 부대 칸에 지점 이름으로 서고, 누르면 판을 관전합니다. 장비와 스킬 트리는 판 중에도 바꿀 수 있고 다음 라운드부터 적용됩니다.',
        en: 'An exploration run is a finite battle that goes through set steps in order. The cave fights stages I · II · III of one expedition location under expedition rules, with extra elite rounds at the end depending on the grade. On a caravan escort the wagon travels the road until three enemy heroes ambush it — where they strike stays hidden until it happens. The ruins lead through a fog-covered ruin with monsters, traps, rare encounters, finds and empty rooms; a trap puts that chapter\'s Hell debuff on your party.<br><br>A party that is out shows in the top party bar under the spot\'s name — click it to watch. You can change gear and skill trees mid-run; changes apply from the next round.',
        zh: '探索按阶段推进。洞穴按远征规则挑战同一地点的 I、II、III 关，票券品质可增加末尾的精英回合。护送商队时，马车会遇到三名敌方英雄的突袭，伏击位置到事发时才会显示。迷雾废墟中会遇到怪物、陷阱、稀有遭遇、物品或空房间。陷阱会对队伍施加该章地狱难度的减益。<br><br>点击顶部队伍栏里的地点名称即可观战。探索中更换装备或调整技能树，会从下一回合开始生效。',
    },
    'help.explore.rewards.title': { ko: '보상', en: 'Rewards', zh: '奖励' },
    'help.explore.rewards.body': {
        ko: "탐험에서 모은 경험치·골드·장비·스킬북·작전 카드는 <b>탐험을 끝까지 클리어하면</b> 자동으로 받습니다. 높은 등급의 표는 골드와 경험치를 늘리고, 처치 시 장비나 스킬북을 얻을 확률을 높입니다. 경험치로 인한 레벨업은 결과를 받을 때 적용됩니다.<br><br>동굴에서는 마지막 보스 자리에 드물게 「???」가 나오며, 쓰러뜨리면 도감에 기록됩니다. 상단 의뢰를 마치면 최하급 철광석과 목재를 받고, 자리가 있으면 마지막 습격의 적 한 명이 선술집에 가입을 희망할 수 있습니다. 폐허에서는 장비나 스킬북이 든 물건을 발견할 수 있습니다. 결과는 알림이나 탐험 지점 창에서 확인합니다.",
        en: "The XP, gold, gear, skill books and Tactic Cards collected during a run are awarded automatically <b>when you clear the whole run</b>. Higher ticket grades increase XP and gold and improve the chance of gear or a skill book from a kill. Heroes level up when the rewards are awarded.<br><br>A rare “???” can take the final boss's place in the cave. Defeating it records it in the Codex. Completing a caravan escort awards lowest-grade iron ore and timber. One raider from the final ambush may ask to join at the Tavern if there is room. In the Ruins, you can find gear or a skill book. Check the notification or the spot window for the result.",
        zh: "探索中积攒的经验、金币、装备、技能书和战术卡，会在<b>完成整趟探索后</b>自动发放。高品质票券提高经验与金币收益，也提高击杀后获得装备或技能书的概率。英雄在结算奖励时升级。<br><br>洞穴的最终首领偶尔会被「???」替代，击败后会录入图鉴。完成商队委托会获得最低级铁矿石和木材。酒馆有空位时，最后一波伏击中的一名敌人可能会申请加入。废墟中可能发现装备或技能书。可在通知或探索地点窗口查看结果。",
    },
    'help.explore.recall.title': { ko: '패배와 귀환', en: 'Defeat and recall', zh: '战败与召回' },
    'help.explore.recall.body': {
        ko: "패배하거나 [부르기]를 누르면 탐험이 끝나고, 사용한 표와 그 판에 모아 둔 전리품을 잃습니다. 탐험 중에는 편성 명단이 잠깁니다. 같은 편성을 원정에 보내려면 확인 창에서 탐험을 끝낸 뒤 출발합니다.<br><br>게임을 닫았다가 돌아오면 이미 시작한 탐험의 남은 전투가 자동으로 계산됩니다. 종료 시각이 지났다면 바로 결과가 나오고, 아직 남았다면 그 시각까지 기다립니다. [이어 돌기]는 접속 중에만 다음 판을 엽니다.",
        en: "A loss or [Call back] ends the run and forfeits the spent ticket and the loot collected for that run. The party roster is locked while exploring. To send that party on an Expedition, confirm the recall and then depart.<br><br>On reopening the game, the remaining fights of an active exploration run are resolved automatically. The result appears immediately if its finish time has passed, or when that time arrives. [Repeat] starts another run only while the game stays open.",
        zh: "战败或点击【召回】会结束探索，已消耗的票券和本次积攒的战利品都会失去。探索期间队员名单锁定。若要派同一编队去远征，需在确认窗口结束探索后再出发。<br><br>重新打开游戏时，已开始的探索会自动计算剩余战斗。若结束时间已到，会立即显示结果；否则需等到结束时间。【连续探索】只会在游戏保持开启时启动下一次探索。",
    },
    'help.party.members.title': {
        ko: "파티 구성과 리더",
        en: "Members and leader",
        zh: '队伍构成与队长',
    },
    'help.party.members.body': {
        ko: "먼저 Party 번호를 고른 뒤 위의 영웅 카드를 눌러 그 편성에 넣거나 뺍니다. 진형 보드의 영웅을 눌러도 빠집니다. 한 영웅을 다른 편성에 넣으면 이전 편성에서 이동하며, 한 편성에는 최대 {party}명이 들어갑니다. 파티 명단의 첫 영웅이 리더입니다. 진형의 전열·후열 위치와 리더는 별개입니다.",
        en: "Select a Party number, then click heroes in the roster to add or remove them. Clicking a hero on the formation board also removes them. Adding a hero to another preset moves them out of their previous preset. Each party holds up to {party} heroes. The first hero in the list leads the party from either row.",
        zh: '先选择Party编号，再点击上方的英雄卡，将其加入或移出该编队。点击阵型面板上的英雄也会将其移出。把一名英雄加入其他编队时，他会从原来的编队移过去；每个编队最多容纳{party}名。队伍名单中的第一名英雄是队长。阵型中的前排、后排位置与队长无关。',
    },
    'help.party.leader.title': {
        ko: "리더와 통솔의 역할",
        en: "The leader and Leadership",
        zh: '队长与统率的作用',
    },
    'help.party.leader.body': {
        // 2026-11-26 R586 — 작전 카드에는 조건이 없다 · 통솔은 옵션 줄 값만 키운다
        ko: "리더는 그 편성 명단의 첫 영웅입니다. 리더의 통솔은 파티 전술 효과의 크기에 영향을 줍니다. 전열의 맨 앞에 서거나 캐릭터 탭에서 영웅을 선택했다고 리더가 바뀌지는 않습니다.<br><br>리더를 바꾸려면 편성 영웅을 모두 뺀 뒤, 원하는 영웅을 먼저 넣고 나머지 인원을 채웁니다. 리더의 통솔은 작전 카드 옵션 줄의 값을 키우거나 줄이며, 카드 규칙의 수치는 바꾸지 않습니다.",
        en: "The first hero in a preset's member list is its leader. The leader's Leadership affects the strength of Party tactics. Standing in the first front-row seat or selecting a hero in Character does not change the leader.<br><br>To change the leader, remove every hero from the preset, add the intended leader first, then fill the remaining places. The leader's Leadership raises or lowers the values of tactic cards' option lines; it does not change the numbers in a card's rule.",
        zh: '编队名单中的第一名英雄就是队长。队长的统率会影响队伍战术的效果。将英雄放在前排首位，或在角色页选中英雄，都不会更换队长。<br><br>要更换队长，请先移除编队中的所有英雄，再把新队长第一个加入，最后补齐队员。队长的统率会提高或降低战术卡的词条数值，卡牌战斗规则中的数值保持固定。',
    },
    'help.party.formation.title': {
        ko: "전열은 누구를 지키나요",
        en: "What the front row protects",
        zh: '前排在保护谁',
    },
    'help.party.formation.body': {
        ko: "왼쪽에서 진형을 고르고 영웅을 끌어 전열·후열 칸에 놓습니다. 채워진 칸끼리 끌면 서로 바뀝니다. 일반 공격은 살아 있는 전열 중에서 대상을 고르며, 전열이 모두 쓰러져야 후열이 대상이 됩니다. 전열이 없는 진형에서는 모두가 대상이 됩니다.<br><br>전열 한 명은 후열을 지켜 주지만 공격이 그 한 명에게 집중됩니다. 전열을 늘리면 일반 공격을 여러 영웅이 나눠 받을 수 있습니다. 어느 쪽이 좋은지는 버티는 장비와 회복 수단, 상대 스킬에 따라 달라집니다. 광역처럼 전원에게 닿는 스킬은 후열도 맞힐 수 있습니다.<br><br>전열·후열은 주로 누가 공격받는지를 정합니다. 후열에 서도 기본 공격과 스킬을 사용할 수 있으며, 근접 직업이라 후열에서 공격하지 못하는 규칙은 없습니다. 리더는 파티 명단의 첫 영웅으로, 진형의 위치나 캐릭터 탭의 카드 나열 순서와는 별개입니다.",
        en: "Choose a formation on the left, then drag heroes into front or back seats. Dragging between occupied seats swaps them. Ordinary attacks choose among living front-row targets and reach the back row after the front falls. With no front row, everyone is a target.<br><br>A single front-line hero protects the back row but takes all ordinary attacks. More front-line heroes can share those attacks. The better choice depends on their equipment, healing and opposing skills. Skills that hit everyone can still reach the back row.<br><br>Rows mainly determine who gets attacked. Heroes can use basic attacks and skills from the back row; melee classes do not lose attacks just for standing there. The leader is the first hero in the party list, separate from formation position or the display order of cards in Character.",
        zh: '在左侧选择阵型，再把英雄拖到前排或后排的格子中。在已占用的格子之间拖动会互换位置。普通攻击会在存活的前排英雄中选择目标，前排全部倒下后，后排才会成为目标。没有前排的阵型中，所有人都是目标。<br><br>只有一名前排时，他能保护后排，但攻击会集中在他一人身上。增加前排人数，普通攻击可以由多名英雄分担。哪种更好，取决于用来抗伤的装备、治疗手段与对手的技能。群体技能等能命中全员的技能也会打到后排。<br><br>前排、后排主要决定谁会受到攻击。站在后排也能使用普通攻击与技能，并没有近战职业在后排就无法攻击的规则。队长是队伍名单中的第一名英雄，与阵型位置及角色标签页中卡片的排列顺序无关。',
    },
    'help.party.potions.title': {
        ko: "파티가 함께 쓰는 물약",
        en: "Potions shared by the party",
        zh: '全队共用的药水',
    },
    'help.party.potions.body': {
        ko: "물약 칸은 영웅 개인의 칸이 아니라 그 파티가 함께 쓰는 한 줄입니다. HP 기준에 걸린 영웅이 앞의 찬 칸부터 마십니다. 여러 영웅이 동시에 필요하면 HP 비율이 가장 낮은 영웅이 먼저이며, 같으면 파티 명단의 앞 영웅이 먼저입니다. 물약은 쓰러진 영웅을 일으키지는 못합니다.<br><br>가진 물약을 누르면 앞의 빈 칸에 넣고, 채운 칸을 누르면 비웁니다. 물약을 원하는 칸으로 끌어 넣거나 칸끼리 끌어 순서를 바꿀 수 있습니다. 같은 물약을 여러 칸에 넣어도 되며, 넣는 것 자체로 재고가 줄지는 않습니다.<br><br>칸은 라운드마다 출발 당시의 구성과 현재 재고에 맞춰 다시 채워집니다. 한 라운드 안에서는 칸을 다 쓰면 더 마실 수 없지만, 다음 라운드에 다시 채워지므로 한 원정에서 칸 수보다 많이 소비할 수 있습니다. 재고는 모든 부대가 함께 쓰고, 부족한 칸은 빈 채로 시작합니다. 원정 도중 만들거나 산 물약은 다음 라운드부터 보충될 수 있습니다.",
        en: "The potion belt belongs to the whole party, not to individual heroes. A hero below the HP threshold drinks from the first filled slot. If several heroes need one at once, the lowest HP percentage goes first, with ties following party order. Potions cannot revive fallen heroes.<br><br>Click a potion in stock to fill the first empty slot, or click a filled slot to clear it. Drag stock potions to specific slots or drag between slots to change their order. Repeating the same potion in several slots is allowed. Configuring slots does not consume stock.<br><br>Each round refills the belt from the departure configuration and current stock. Once its slots are used within a round, no more can be drunk until the next round. A full run can therefore consume more potions than the belt holds. All parties share the same stock; shortages leave slots empty. Potions bought or brewed during a run can replenish the next round.",
        zh: '药水栏不是英雄个人的栏位，而是整个队伍共用的一排。触及生命阈值的英雄会从靠前的已装填格开始饮用。多名英雄同时需要时，生命比例最低的英雄优先；比例相同时，队伍名单中靠前的英雄优先。药水无法让倒下的英雄复活。<br><br>点击持有的药水会放入靠前的空格，点击已装填的格子则会清空。可以把药水拖到想要的格子里，也可以在格子之间拖动来调整顺序。同一种药水可以放入多个格子，放入本身不会减少库存。<br><br>每回合都会按照出发时的配置与当前库存重新装填药水栏。在一个回合内用完所有格子后就不能再喝，但下一回合会重新装填，所以一次远征中消耗的药水可以多于格子数。库存由所有小队共用，库存不足的格子会以空格开始。远征途中制作或购买的药水，可以从下一回合起补充进来。',
    },
    'help.party.threshold.title': {
        ko: "물약 자동 사용 기준",
        en: "When potions are used",
        zh: '药水的自动饮用条件',
    },
    'help.party.threshold.body': {
        ko: "편성의 물약 제목 옆 [?]에서 현재 사용 HP 기준을 확인합니다. 살아 있는 영웅의 HP가 그 비율 아래로 떨어지면 행동 차례를 쓰지 않고 자동으로 마십니다. 한 명이 마시면 {cooldown}초 동안 파티 전체가 물약을 다시 마실 수 없습니다.",
        en: "Check the [?] next to Potions in Party for the current HP threshold. A living hero who falls below it drinks automatically without spending an action. Once one hero drinks, the whole party waits {cooldown} seconds before anyone can drink again.",
        zh: "点击编队中药水标题旁的【?】，可查看当前饮用的生命值门槛。存活英雄的生命值低于门槛时会自动喝药，无需消耗行动。一名英雄喝药后，全队需等待 {cooldown} 秒才能再次喝药。",
    },
    // 작전 카드 장착 · 태그 · 보관 · 줄 인챈트 (SCREEN_DESIGN §15)
    'help.party.tactics.title': {
        ko: "파티 전술과 작전 카드",
        en: "Party tactics and tactic cards",
        zh: "队伍战术与战术卡",
    },
    'help.party.tactics.body': {
        ko: "지휘 천막을 1·2·3랭크로 올릴 때마다 작전 카드 칸 하나가 열리고 첫 카드 한 장을 받습니다. 카드는 어느 열린 칸에나 장착할 수 있고, 한 편성에서는 같은 카드나 같은 태그를 중복으로 쓸 수 없습니다. 가방에서 장착할 수 없는 카드를 선택하면, 충돌하는 장착 카드의 칸이 빨간색으로 표시됩니다.<br><br>정예와 스테이지보스가 떨어뜨린 카드는 편성 공용 가방에 들어갑니다. 편성에서 카드 칸을 눌러 가방을 열고 [장착]합니다. 새 카드를 장착하면 가방에서 한 장을 쓰고 옵션 두 줄이 정해집니다. 각 카드는 그 옵션과 함께 전투 규칙 하나를 적용합니다. 카드 등급이 옵션 줄 등급의 상한입니다.<br><br>교체한 카드는 옵션을 유지한 채 가방 위쪽의 사용한 카드에 보관됩니다. 보관 공간은 모든 편성이 공유하며 최대 {usedCap}장입니다. 가득 차면 사용한 카드끼리 교체하거나, 사용한 카드를 분해해 자리를 비운 뒤 새 카드로 교체합니다. 원정·탐험 중인 편성은 빈 칸에 장착할 수 있으며, 차 있는 칸의 교체는 귀환 후 가능합니다.",
        en: "Command Tent ranks 1, 2 and 3 each unlock a Tactic Card slot and grant a starter card. Any card fits any open slot. A party can use each card and each tag once. Select a blocked card in the bag to highlight the conflicting equipped card's slot in red.<br><br>Elites and stage bosses drop cards into the shared bag. Select a card slot in Party to open the bag, then select [Equip]. Equipping a new card spends one copy and rolls two option lines. Each card applies one combat rule along with its options. The card's grade caps the grade of its option lines.<br><br>A replaced card keeps its options and goes into the used-card area at the top of the bag. All parties share space for {usedCap} used cards. When full, swap in another used card or dismantle one to make room for a new card. An active Expedition or Exploration party can fill an empty slot. To replace an equipped card, wait until the party returns.",
        zh: "指挥营帐升到 1、2、3 阶时，每阶开放一个战术卡槽并赠送一张初始卡。任意卡都可放进任意已开卡槽。同一编队内，同名卡或同标签的卡只能装一张。在卡包中选中无法装备的卡时，冲突的已装卡槽会以红色标出。<br><br>精英和关卡首领掉落的卡会进入共用卡包。点击编队中的卡槽打开卡包，再点击【装备】。装备新卡会消耗一张库存并随机生成两条词条。每张卡还会应用一条战斗规则。词条品质最高可达到该卡的品质。<br><br>换下的卡会保留词条，存放在卡包上方的已使用区域。所有编队共用 {usedCap} 个存放位。存满后，可以用另一张已使用的卡换装，或分解一张腾出位置再换新卡。正在远征或探索的编队仍可装入空槽，已装卡需等归队后才能更换。",
    },
    'help.party.tactic_choices.title': {
        ko: "인챈트와 카드 조각",
        en: "Enchanting and card shards",
        zh: "附魔与卡牌碎片",
    },
    'help.party.tactic_choices.body': {
        ko: "옵션 줄 옆의 [인챈트]를 누르면 골드와 카드 조각을 써서 그 줄의 종류·등급·수치를 다시 굴립니다. 등급은 한 단계 오르거나 내리거나 유지되며, 카드 등급까지 오를 수 있습니다. 새 결과는 즉시 저장됩니다.<br><br>가방의 새 카드와 사용한 카드를 분해하면 카드 조각을 얻습니다. 등급이 높을수록 조각을 더 많이 줍니다. 옵션 줄의 적용 수치는 리더의 통솔과 같은 죄종의 영웅·장비에서 얻는 죄종 점수에 따라 달라집니다. 카드 아래에서 두 보정의 출처를 확인합니다.",
        en: "Select [Enchant] next to an option line to spend gold and card shards on a fresh option, grade and value for that line. Its grade may move one step up or down, or stay the same, up to the card's grade. The new roll is saved immediately.<br><br>Dismantle new or used cards in the bag for card shards. Higher-grade cards give more shards. The applied value of each line depends on the leader's Leadership and the Sin score from heroes and gear matching the line's Sin. The area below the cards shows where those bonuses come from.",
        zh: "点击词条旁的【附魔】，可花费金币与卡牌碎片重新随机生成该条的类型、品质和数值。词条品质可以升降一阶或保持不变，上限为卡牌品质。新结果会立即保存。<br><br>分解卡包中的新卡或已使用卡可获得碎片，卡牌品质越高，碎片越多。词条的实际数值受队长的统率和同罪宗英雄、装备提供的罪宗分数影响。可在卡牌下方查看加成来源。",
    },
    'help.party.changes.title': {
        ko: "원정 중 편성을 바꿨다면",
        en: "Changing a preset during an expedition",
        zh: '远征中更改了编队时',
    },
    'help.party.changes.body': {
        ko: "원정·탐험 중인 편성의 명단은 귀환까지 잠깁니다. 원정은 출발할 때 정한 진형·물약·작전 카드를 사용하며, 승리 후 자동 출정에서도 그 구성을 이어 씁니다. 편성에서 바꾼 구성이나 카드 옵션을 적용하려면 [철수]한 다음 다시 [보내기]합니다.<br><br>원정에서 패배해 자동 재도전할 때는 출발할 수 있으면 현재 편성을 반영합니다. 원정 중 장비 교체는 바로 적용되며, 출발할 때 장착한 작전 카드 옵션의 장비 죄종 몫도 함께 바뀝니다.",
        en: "The roster of a party on an Expedition or Exploration is locked until it returns. An Expedition uses the formation, potions and Tactic Cards set at departure and retains that setup when it advances after a win. To apply changes to your setup or card options, [Retreat] and send the party out again.<br><br>An automatic retry after an Expedition loss uses the current party setup if it can depart. Gear changes during an Expedition apply immediately and also update the equipment contribution to the Sin score of the cards taken at departure.",
        zh: "编队在远征或探索中时，名单会锁定至归队。远征采用出发时的阵型、药水与战术卡，胜利后自动前往下一关时也会沿用这些设置。要应用更改后的配置或卡牌词条，请先【撤退】再派出。<br><br>远征战败后自动重试时，如果当前编队可以出发，就会采用当前设置。远征中的装备更换会立即生效，并同步更新出发时所带战术卡的装备罪宗分数。",
    },
    'help.character.identity.title': {
        ko: "직업·죄종·등급·고유 스킬",
        en: "Class, Sin, tier and innate skill",
        zh: '职业、罪宗、稀有度与固有技能',
    },
    'help.character.identity.body': {
        ko: "직업은 직업 마스터리와 전직 갈래를, 영웅의 죄종은 죄종 마스터리를 정합니다. 고유 스킬은 그 영웅이 처음부터 가진 액티브이며, 같은 직업이라도 서로 다른 고유 스킬을 가질 수 있습니다. 직업·죄종·고유 스킬은 고용한 뒤 바꾸는 기능이 없습니다.<br><br>일반·매직·레어 영웅은 기본 능력치의 총합 범위와 분포가 다릅니다. 높은 등급이 더 높은 총합을 기대하게 하지만, 필요한 능력치 하나까지 모든 영웅보다 높다는 뜻은 아닙니다. 같은 직업 후보라도 고유 스킬, 힘·민첩·건강 같은 실제 수치와 맡길 자리를 함께 비교합니다.<br><br>영웅의 죄종과 장비의 죄종은 별개이며, 화염·냉기·전기·독 같은 피해 원소와도 다릅니다. 분노 영웅이라고 화염 공격을 하는 것은 아니며, 피해 원소는 사용하는 스킬 설명에서 확인합니다. 영웅 등급과 장비 희귀도, 몬스터의 일반·정예 등급도 서로 다른 분류입니다.",
        en: "Class determines class mastery and advancement paths; a hero's Sin determines Sin mastery. The innate skill is the active the hero starts with, and heroes of the same class can have different ones. There is no feature to change a hired hero's class, Sin or innate skill.<br><br>Normal, Magic and Rare heroes use different attribute-total ranges and distributions. A higher tier offers a higher expected total, not a guarantee that every relevant attribute beats every lower-tier hero. Compare innate skills, actual attributes such as Strength, Agility and Vitality, and the role you want the hero to fill.<br><br>A hero's Sin is separate from equipment Sins and from damage elements such as Fire, Cold, Lightning and Poison. A Wrath hero does not automatically deal Fire damage; inspect the skill to see its element. Hero tiers, equipment rarities and monster Normal/Elite grades are also separate classifications.",
        zh: '职业决定职业专精与转职分支，英雄的罪宗决定罪宗专精。固有技能是该英雄一开始就拥有的主动技能，即使职业相同，固有技能也可能不同。职业、罪宗与固有技能在雇佣后无法更改。<br><br>普通、魔法、稀有英雄的基础属性总和范围与分布各不相同。稀有度越高，总和的期望值越高，但这并不意味着连某一项所需属性也比所有英雄都高。即使是同职业的候选，也要一并比较固有技能、力量、敏捷、体力等实际数值，以及想让他担任的位置。<br><br>英雄的罪宗与装备的罪宗是两回事，也不同于火焰、冰霜、闪电、毒素等伤害元素。愤怒英雄并不一定进行火焰攻击，伤害元素请在所用技能的说明中确认。英雄稀有度、装备稀有度、怪物的普通/精英级别，也是彼此不同的分类。',
    },
    'help.character.stats.title': {
        ko: "영웅 선택과 능력치",
        en: "Choosing heroes and reading stats",
        zh: '选择英雄与属性',
    },
    'help.character.stats.body': {
        ko: "위의 영웅 카드를 누르면 그 영웅의 장비·기본 스탯·세부 스탯이 표시됩니다. 카드 사이로 끌어 명단 순서를 바꿀 수 있습니다. 기본 능력치 일곱 개는 태어날 때 정해지며 장비나 레벨업으로 직접 오르지 않습니다. 대신 피해·속도·최대 HP·스킬 효과와 리더 전술·연구소 등록 효과의 계산에 쓰입니다.<br><br>능력치 이름에 마우스를 올리면 각 수치가 하는 일을 확인할 수 있습니다. 세부 스탯은 현재 장비와 마스터리 등이 만든 전투 수치입니다.",
        en: "Click a hero card to view that hero's equipment, attributes and detailed stats. Drag between roster cards to reorder them. The seven attributes are fixed when the hero is created; equipment and level-ups do not directly raise them. They scale damage, speed, maximum HP, skill effects, leader tactics and Laboratory registration effects.<br><br>Hover a stat name to read what it does. Detailed stats show the combat values built by current gear, mastery and other effects.",
        zh: '点击上方的英雄卡，会显示该英雄的装备、基础属性与详细属性。在卡片之间拖动可以调整名单顺序。七项基础属性在英雄诞生时就已确定，不会因装备或升级而直接提升。它们会用于计算伤害、速度、最大生命、技能效果，以及队长战术与研究所派驻效果。<br><br>将鼠标悬停在属性名称上，可以查看各项数值的作用。详细属性是由当前装备、专精等形成的战斗数值。',
    },
    'help.character.growth.title': {
        ko: "영웅 레벨과 아이템 레벨",
        en: "Hero levels and item levels",
        zh: '英雄等级与物品等级',
    },
    'help.character.growth.body': {
        ko: "영웅 레벨이 오르면 최대 HP가 늘고 공용 스킬 포인트를 받습니다. 스킬북·높은 마스터리 층·전직에는 레벨 조건도 있습니다. 기본 능력치 일곱 개나 무기의 공격력이 레벨업만으로 함께 오르는 것은 아닙니다. 기본 공격과 많은 스킬의 바탕 공격력은 장비에서 가져옵니다.<br><br>아이템 그림의 Lv는 그 장비의 아이템 레벨이며, 선택한 영웅의 레벨과 다른 값입니다. 착용하려면 장비의 요구 레벨을 만족해야 합니다. 같은 아이템 레벨이라도 희귀도·베이스·옵션·강화 단계에 따라 쓰임과 세기가 달라지므로 Lv 숫자만으로 교체하지 않습니다. 스킬 그림의 Lv는 또 다른 값으로, 그 스킬의 성장 단계를 뜻합니다.<br><br>원정 경험치는 라운드를 이긴 순간 살아 있는 영웅에게 들어갑니다. 쓰러진 채로는 그 라운드의 경험치를 받지 못하고, 자신보다 낮은 레벨의 적에게서는 경험치가 줄어듭니다. 영웅 레벨 상한은 {levelCap}이며, 상한 뒤에는 장비·스킬·마스터리 배분과 파티 조합을 더 다듬습니다.",
        en: "Hero levels raise maximum HP and grant shared skill points. Skill books, higher mastery tiers and advancement also have level requirements. Leveling alone does not raise the seven attributes or your weapon's attack. Gear supplies the base attack used by basic attacks and many skills.<br><br>Lv on an item icon is that item's level, separate from the selected hero's level. The hero must meet its level requirement to equip it. Even at the same item level, rarity, base type, options and upgrade level change its value. Do not replace gear using the Lv number alone. Lv on a skill icon is another value: that skill's growth level.<br><br>Expedition XP goes to heroes alive when a round is won. Fallen heroes miss that round's XP, and enemies below a hero's level give less XP. The hero level cap is {levelCap}. Beyond it, improve gear, skills, mastery choices and party combinations.",
        zh: '英雄等级提升后，最大生命会增加，并获得共用技能点。技能书、高层级专精与转职也有等级条件。七项基础属性和武器的攻击力并不会仅凭升级而一同提升。普通攻击与许多技能的基础攻击力来自装备。<br><br>物品图标上的Lv是该装备的物品等级，与所选英雄的等级是不同的数值。要穿戴装备，必须满足其需求等级。即使物品等级相同，用途与强度也会因稀有度、基底、词条与强化程度而不同，所以不要只看Lv数字就更换。技能图标上的Lv又是另一个数值，表示该技能的成长阶段。<br><br>远征经验在赢下回合的那一刻发给存活的英雄。处于倒下状态时得不到该回合的经验；从等级低于自己的敌人身上获得的经验会减少。英雄等级上限为{levelCap}，达到上限后，就要进一步打磨装备、技能、专精分配与队伍搭配。',
    },
    'help.character.goblin.title': {
        ko: "시작 영웅 외에 있는 고블린",
        en: "The extra starting goblin",
        zh: '初始英雄之外的哥布林',
    },
    'help.character.goblin.body': {
        ko: "새 게임에서는 고른 시작 영웅 외에 성장 등급 고블린 한 명이 로스터에 추가됩니다. 첫 편성에는 고른 시작 영웅만 들어가므로, 로스터에 더 많은 영웅이 보여도 모두 원정에 나가지는 않습니다. 편성 탭에서 누구를 보낼지 바꿀 수 있습니다.<br><br>이 고블린은 낮고 고른 기본 능력치와 미장착 상태로 시작합니다. 초반 전투에 넣으려면 장비와 버티는 힘부터 확인합니다. 현재는 성장 등급이라는 이름과 달리 레벨업마다 기본 능력치가 자라는 기능이 준비 중입니다. 레벨·HP·스킬 포인트의 성장은 다른 영웅처럼 진행됩니다.",
        en: "A new game adds one Growth-tier goblin to the roster alongside the heroes you selected. Only the selected starting heroes enter the first preset, so a larger roster does not mean everyone is fighting. Choose who goes in the Party tab.<br><br>The goblin starts with low, even attributes and no equipped gear. Check equipment and survivability before placing it in early combat. Despite the Growth tier name, attribute gains on level-up are currently coming later. Levels, HP and skill points still grow as they do for other heroes.",
        zh: '新游戏中，除了所选的初始英雄，名册中还会加入一名稀有度为“成长”的哥布林。第一个编队只包含所选的初始英雄，所以即使名册中显示更多英雄，也不是所有人都会去远征。可以在编队标签页中更改派谁出战。<br><br>这名哥布林以偏低且均衡的基础属性、未穿戴装备的状态开始。想让它参加早期战斗，先要检查装备与生存能力。目前，与“成长”这一稀有度名称不同，每次升级时基础属性成长的功能仍在开发中。等级、生命与技能点的成长与其他英雄相同。',
    },
    'help.character.equipment.title': {
        ko: "장착 조건과 장비 비교",
        en: "Equipping and comparing gear",
        zh: '穿戴条件与装备比较',
    },
    'help.character.equipment.body': {
        ko: "인벤토리나 창고에서 장비를 클릭해 고릅니다. 장착하려면 장비를 우클릭한 뒤 [착용]을 누르고, 벗으려면 착용 칸을 우클릭합니다. 장비의 요구 레벨을 충족하면 다른 직업의 무기나 갑옷도 착용할 수 있습니다. 스킬에 필요한 무기는 스킬 설명에서 확인합니다.<br><br>마우스를 올리면 현재 착용품과 비교합니다. [Alt]는 장착하면 바뀌는 세부 스탯을, [Shift]는 옵션의 수치 범위를 보여 줍니다. [자동 장착]은 현재 부대 인벤토리에서 선택한 영웅의 직업에 맞는 장비를 고르며, 무기는 최종 데미지, 방어구는 방어력을 우선합니다.",
        en: "Click gear in a party inventory or the stash to select it. To equip it, right-click it and select [Equip]. Right-click a worn slot to unequip it. A hero can wear another class's weapon or armor if they meet its level requirement. Each skill lists the weapon it requires.<br><br>Hover gear to compare it with the worn item. Hold [Alt] to see the detailed stat changes from equipping it and [Shift] to see option ranges. [Auto-equip] looks in the current party's inventory for gear that fits the selected hero's class. It prioritizes final damage for weapons and defense for armor.",
        zh: "点击背包或仓库中的装备可选中。要穿戴，请右键点击装备并选择【装备】。右键点击已穿戴的格子可卸下。达到等级要求后，英雄也能穿戴其他职业的武器或护甲。技能所需武器可在技能说明中查看。<br><br>悬停于装备上可与当前穿戴的装备比较。按住【Alt】查看穿戴后的详细属性变化，按住【Shift】查看词条数值范围。【自动装备】会在当前队伍背包里挑选适合所选英雄职业的装备，武器优先考虑最终伤害，护甲优先考虑防御力。",
    },
    'help.character.equipment_slots.title': {
        ko: "장비 부위와 갑옷 갈래",
        en: "Equipment slots and armor types",
        zh: '装备部位与铠甲类型',
    },
    'help.character.equipment_slots.body': {
        ko: "장비는 무기·투구·갑옷·장갑·신발·목걸이·반지 칸에 착용하며, 반지는 두 개를 착용합니다. 무기는 한 개를 사용하고 별도의 방패·보조 무기 칸은 없습니다. 반지와 목걸이도 옵션으로 전투에 보탬이 되는 장비입니다.<br><br>갑옷도 직업 전용이 아닙니다. 중갑은 물리 방어가 높은 대신 물리 공격 속도에 불리하고, 경갑은 물리 공격 속도, 로브는 스킬 쿨타임 감소 쪽에 특징이 있습니다. 어떤 갈래가 좋은지는 현재 버티는 힘과 공격·스킬이 기다리는 이유를 함께 보고 정합니다. 마법 무기에는 물리 공격 속도 옵션이 시전 간격을 줄여 주지 않습니다.<br><br>같은 갈래라도 아이템 레벨·강화·붙은 옵션이 다릅니다. 이름이나 갈래 하나로 결정하지 말고, 장비 비교와 착용 후 바뀌는 능력치로 확인합니다.",
        en: "Equipment slots hold a weapon, helmet, armor, gloves, boots, amulet and two rings. You use one weapon, with no separate shield or off-hand slot. Rings and amulets support combat through their options too.<br><br>Armor is not class-locked either. Heavy Armor offers more Physical Defense at a cost to physical attack speed; Light Armor favors physical attack speed, while Robes favor skill cooldown reduction. Choose according to your survival and what makes attacks or skills wait. Physical Attack Speed options do not shorten casting intervals with magic weapons.<br><br>Items of the same armor type can differ in item level, upgrades and options. Compare the equipment and resulting stats instead of deciding from its name or type alone.",
        zh: '装备穿戴在武器、头盔、铠甲、手套、靴子、项链、戒指栏位上，戒指可以戴两枚。武器只使用一把，没有单独的盾牌或副手栏位。戒指与项链也是能通过词条为战斗提供帮助的装备。<br><br>铠甲同样不限职业。重甲物理防御高，但不利于物理攻击速度；轻甲的特点在物理攻击速度，法袍的特点在技能冷却缩减。哪种类型更好，要结合当前的生存能力，以及攻击、技能在等待的原因来决定。使用魔法武器时，物理攻击速度词条不会缩短施法间隔。<br><br>即使类型相同，物品等级、强化与附带的词条也各不相同。不要只凭名称或类型决定，请通过装备比较与穿戴后的属性变化来确认。',
    },
    'help.character.rarity.title': {
        ko: "희귀도 색과 아이템 레벨은 다릅니다",
        en: "Rarity color and item level differ",
        zh: '稀有度颜色与物品等级不同',
    },
    'help.character.rarity.body': {
        ko: "일반 → 매직 → 레어 → 에픽 → 레전더리는 장비의 희귀도입니다. 높은 등급일수록 붙는 옵션 줄이 늘지만, 지금 영웅에게 필요한 옵션인지도 함께 봅니다. 일반 장비에는 메인 죄종이 없고, 매직에는 하나, 레어부터 레전더리까지는 보통 두 개가 붙습니다. 오만은 레어부터 등장하며, 오만 장비는 두 번째 메인 죄종 자리에 랜덤 옵션이 붙습니다. 같은 등급이라도 옵션 조합과 수치는 달라집니다.<br><br>원정의 에픽은 나이트메어부터, 레전더리는 헬에서 나올 수 있습니다. 모든 적이 모든 등급을 주는 것은 아니므로 더 높은 장비를 찾을 때는 난이도와 정예·보스도 살펴봅니다. 유니크·크래프트는 이름만 보고 이 계단의 다음 등급이라고 생각하지 않습니다.<br><br>아이템 레벨은 무기 피해·방어력과 옵션 수치에 영향을 주며, 영웅의 착용 가능 여부에도 관계됩니다. 아이템 레벨이 높다고 옵션 줄이 추가되는 것은 아닙니다. 높은 등급·높은 레벨만 고르기보다 스킬의 필요 무기와 실제로 바뀌는 능력치를 함께 비교합니다.",
        en: "Normal → Magic → Rare → Epic → Legendary are equipment rarities. Higher rarity adds option lines, but the options must still suit your hero. Normal gear has no main Sin, Magic has one, and Rare through Legendary gear usually has two. Pride appears from Rare onward. Pride gear has a random option in place of its second main Sin. Items of the same rarity can roll different options and values.<br><br>Expedition drops can include Epic gear from Nightmare onward and Legendary gear in Hell. Not every enemy can provide every rarity, so consider difficulty and elite or boss enemies when seeking better gear. Unique and Crafted items are separate categories, not simply the next steps in that ladder.<br><br>Item level affects weapon damage, defense and option values, as well as whether a hero can equip it. A higher item level does not add option lines. Compare required weapons and actual stat changes alongside rarity and level.",
        zh: '普通 → 魔法 → 稀有 → 史诗 → 传奇是装备的稀有度。稀有度越高，附带的词条越多，但也要看这些词条是否是当前英雄需要的。普通装备没有主罪宗，魔法装备有一个，稀有至传奇装备通常有两个。傲慢从稀有装备开始出现。傲慢装备的第二个主罪宗位置会改为随机词条。即使稀有度相同，词条组合与数值也会不同。<br><br>远征中，史诗装备从噩梦难度起、传奇装备在地狱难度中才可能掉落。并非所有敌人都会掉落所有稀有度，所以寻找更好的装备时，也要考虑难度以及精英、首领。暗金与手工装备，不要只看名称就以为是这条阶梯的下一个稀有度。<br><br>物品等级会影响武器伤害、防御力与词条数值，也关系到英雄能否穿戴。物品等级高并不会增加词条数量。与其只挑高稀有度、高等级，不如一并比较技能所需的武器与实际变化的属性。',
    },
    'help.character.sins.title': {
        ko: "장비 옵션과 죄종",
        en: "Equipment options and Sins",
        zh: '装备词条与罪宗',
    },
    'help.character.sins.body': {
        // 2026-11-26 R586 — 장비 죄종은 조건이 아니라 죄종 점수(작전 카드 옵션 줄의 버프 몫)다
        ko: "장비의 부위·베이스·희귀도·아이템 레벨에 따라 장비 자체의 기본 수치와 붙는 옵션이 달라집니다. 아이템 이름의 접두·접미에는 죄종이 붙을 수 있으며, 파티가 착용한 장비의 죄종 수는 영웅의 죄종과 함께 죄종 점수가 되어 같은 죄종 작전 카드의 옵션 줄 값을 키웁니다. 점수는 편성 탭의 카드 아래 판에서 확인합니다.",
        en: "Slot, base type, rarity and item level determine equipment base stats and options. Prefixes and suffixes in item names can carry Sins. Together with heroes' own Sins, the Sins on the party's worn gear add up to Sin scores that boost the option lines of tactic cards of the same Sin. Check the scores in the panel below the cards in the Party tab.",
        zh: '装备的部位、基底、稀有度和物品等级决定基础属性与可出现的词条。装备名称的前缀和后缀可以带有罪宗。队伍所穿装备的罪宗与英雄自身的罪宗共同计入罪宗分数，分数越高，同罪宗战术卡的词条效果就越强。可在编队页的卡牌下方查看分数。',
    },
    'help.character.inventory.title': {
        ko: "부대 인벤토리와 창고",
        en: "Party inventories and the stash",
        zh: '小队背包与仓库',
    },
    'help.character.inventory.body': {
        ko: "인벤토리는 부대마다 따로 있고 창고는 공용입니다. 부대 번호를 눌러 인벤토리를 고릅니다. [Ctrl]+클릭하거나 반대편 칸으로 끌어 놓으면 인벤토리와 창고 사이에서 장비를 옮길 수 있습니다. [정렬]은 현재 칸을 등급·레벨·부위 기준으로 정리합니다.<br><br>장비를 교체하면 벗은 장비는 새 장비를 꺼낸 곳으로 돌아갑니다. 착용 칸에서 장비만 해제하면 현재 보고 있는 인벤토리로 들어갑니다.",
        en: "Each party has its own inventory and all parties share the stash. Select a party number to view its inventory. [Ctrl]+click or drag gear to the other grid to move it between the inventory and stash. [Sort] orders the current storage by rarity, level and slot.<br><br>When you replace an item, the old item goes to the storage you took the new one from. When you unequip an item from a worn slot, it goes to the inventory you are viewing.",
        zh: "每支队伍有独立背包，仓库由所有队伍共用。点击队伍编号可查看其背包。按住【Ctrl】点击，或将装备拖到另一侧，可在背包与仓库之间移动装备。【排序】按品质、等级和部位整理当前容器。<br><br>更换装备时，旧装备会回到新装备取出的地方。直接卸下装备时，装备会进入当前查看的背包。",
    },
    'help.character.salvage.title': {
        ko: "분해와 잠금",
        en: "Salvage and locks",
        zh: '分解与锁定',
    },
    'help.character.salvage.body': {
        ko: "보관 중인 장비의 우클릭 메뉴에서 [잠금]을 누르면 분해를 막을 수 있습니다. 설정에서 [우클릭 분해]를 켰다면 [Shift]+우클릭으로 메뉴를 엽니다. [분해] 창에서는 직접 고르거나 등급·레벨·베이스 필터로 장비를 고른 뒤 [분해하기]를 누릅니다. 서로 다른 필터 열은 모두 일치해야 하고 같은 열에서는 하나만 일치해도 됩니다.<br><br>장비를 분해하면 가루와 부위 재료를 받습니다. 장비의 등급과 아이템 레벨 구간에 따라 양이 달라지며, 연구소 대장간 줄의 [분해] 지점으로 더 늘릴 수 있습니다.<br><br>창고 3랭크에서 [자동 분해]가 열립니다. 부대별로 등급마다 보존·분해를 정하고, 일반 장비는 [베이스], 매직 이상은 [단어] 조건을 고를 수 있습니다. 레벨 조건도 함께 적용할 수 있습니다. 이미 보유한 장비에는 [지금 인벤토리에 적용]을 사용합니다. 유니크와 크래프트는 자동 분해에서 보존됩니다. 부대 간에는 설정을 프리셋으로 옮길 수 있습니다.",
        en: "Use [Lock] in the right-click menu to protect stored gear from salvage. If [Right-click Salvage] is enabled in Settings, use [Shift]+right-click to open the menu. In [Salvage], select gear by hand or with rarity, level and base filters, then select [Salvage now]. Items must match each selected column and can match any of the selected choices within a column.<br><br>Salvaging gear gives dust and slot materials. The amount depends on rarity and the item's level band. Research the Salvage node on the Laboratory's Blacksmith line for more.<br><br>Storage rank 3 unlocks [Auto salvage]. Set keep or salvage by rarity for each party. Use [Base] to keep Normal gear by base roll and [Word] to keep Magic and higher gear by the rank of the Sin word in its name. You can also set a level rule. Use [Apply to inventory now] for gear you already have. Auto salvage keeps Unique and Crafted gear. Save rules to a preset to reuse them across parties.",
        zh: "在保管中的装备上右键选择【锁定】可防止分解。如果开启了【右键分解】，请按住【Shift】再右键打开菜单。在【分解】窗口可手动选择装备，也可按品质、等级和基础词条筛选，再点击【执行分解】。不同筛选栏的条件都须满足，同一栏满足任一已选条件即可。<br><br>分解装备可获得粉尘和部位材料。数量取决于装备品质和物品等级区间。研究所铁匠铺线的【分解】节点可进一步提高产量。<br><br>仓库升到 3 阶可开启【自动分解】。可为每支队伍按品质设置保留或分解。普通装备可按【基础】词条数值保留，魔法及以上装备可按名称中罪宗【词缀】的档位保留，也可加上等级条件。已持有的装备可用【立即应用于背包】处理。自动分解会保留暗金和手工装备。可保存预设供其他队伍使用。",
    },
    'help.character.skills.title': {
        ko: "액티브 스킬과 자동 사용 순서",
        en: "Active skills and automatic use order",
        zh: '主动技能与自动使用顺序',
    },
    'help.character.skills.body': {
        ko: "액티브는 영웅 고유·스킬북으로 습득·전직의 세 출처에서 하나씩 옵니다. 레벨만 올려 여러 스킬을 자동으로 배우는 구조는 아닙니다. 스킬 그림에 마우스를 올려 효과·대상·필요 무기를 확인하고, 스킬북을 통한 습득과 업그레이드는 도서관에서 진행합니다.<br><br>전투가 시작될 때 모든 스킬은 준비된 상태입니다. 그래서 첫 차례들에는 [우선순위]에서 정한 순서대로 스킬을 씁니다. [순위 적용]을 누르면 순번이 서고, 스킬 그림을 다른 그림 위에 끌어 놓으면 두 스킬의 순서가 바뀝니다. [랜덤 적용]을 누르면 정한 순서가 지워집니다. 순번이 「–」인 영웅은 아직 순서를 정하지 않은 것이라 전투마다 순서가 무작위로 정해지고, 몬스터는 버프·디버프를 먼저 겁니다. 그 뒤로는 차례가 오면 조건을 만족하고 사용할 수 있는 스킬 중 가장 오래 준비된 것을 자동으로 고르며, 동시에 준비된 스킬은 같은 순서를 따릅니다. 같은 스테이지의 다음 라운드로는 남은 쿨타임을 그대로 이어 가고, 다음 스테이지는 다시 모두 준비된 상태로 시작합니다.<br><br>물리 무기와 맨손은 보통 차례마다 기본 공격을 하며, 준비된 스킬이 있으면 먼저 씁니다. 공격 스킬이 겨눈 적이 이미 쓰러지면 뒤의 기본 공격은 생략될 수 있습니다. 마법 무기는 기본 공격 없이 충전 칸으로 스킬을 씁니다. 정신 집중 중에는 기본 공격과 다른 스킬을 사용하지 않으며, 오오라와 사건 반응 스킬도 각자의 발동 규칙을 따릅니다. 마나는 없습니다.",
        en: "Active skills come one each from the hero's innate skill, a learned skill book and advancement. Leveling alone does not automatically teach a collection of skills. Hover an icon to check its effect, targets and weapon requirement. Learn and upgrade book skills at the Library.<br><br>Every skill is ready when a battle starts, so the first turns use skills in your [Priority] order. [Set Order] fixes it, then drop one skill icon onto another to swap them; [Randomize] clears it. A hero showing “–” instead of numbers has no set order and shuffles it every battle, and monsters cast buffs and debuffs first. After that, combat picks the eligible skill that has been ready longest; skills ready at the same time follow the same order. Remaining cooldowns carry over into the next round of the same stage, and the next stage starts with everything ready again.<br><br>Physical weapons and bare hands normally make a basic attack each turn, using a ready skill first. The following basic attack may be skipped if the attack skill's target has already fallen. Magic weapons have no basic attack and cast using stored charges. Channeling prevents other skills and basic attacks while active; auras and event-triggered skills also follow their own activation rules. There is no mana.",
        zh: '主动技能来自三个来源，各一个：英雄固有、通过技能书习得、转职。并不是只靠升级就会自动学会多个技能。将鼠标悬停在技能图标上可查看效果、目标与所需武器；通过技能书习得与升级技能在图书馆进行。<br><br>战斗开始时，所有技能都处于就绪状态。因此最初几次行动会按照[优先级]中设定的顺序使用技能。按[设定顺序]会排出序号，把技能图标拖到另一个图标上，两个技能的顺序就会互换。按[随机顺序]则会清除已设定的顺序。序号显示为“–”的英雄尚未设定顺序，每场战斗会随机决定顺序；怪物则会先施放增益与减益。此后，每次轮到行动时，会从满足条件且可使用的技能中自动选择就绪时间最长的一个；同时就绪的技能遵循相同的顺序。进入同一关卡的下一回合时，剩余冷却会原样延续；下一个关卡则会再次以全部就绪的状态开始。<br><br>物理武器与空手通常每次行动都会进行普通攻击，若有就绪的技能则先使用技能。如果攻击技能瞄准的敌人已经倒下，随后的普通攻击可能会被省略。魔法武器没有普通攻击，而是用充能格施放技能。引导期间不会使用普通攻击和其他技能；光环与事件触发技能也遵循各自的发动规则。本游戏没有法力。',
    },
    'help.character.weapon_skills.title': {
        ko: "배울 수 있는데 왜 스킬이 꺼지나요",
        en: "Why a learned skill may be inactive",
        zh: '能学会，技能为何却失效',
    },
    'help.character.weapon_skills.body': {
        ko: "스킬북은 영웅의 직업과 달라도 배울 수 있습니다. 하지만 타격·회복·소환처럼 무기를 필요로 하는 스킬은 그 스킬 직업의 무기를 들어야 사용합니다. 이 조건은 고유·습득·전직 스킬에 모두 적용되며, 맞지 않는 스킬은 건너뜁니다.<br><br>예를 들어 전사도 마법사 책을 배우고 스태프를 들 수 있습니다. 그러면 마법사 공격 스킬을 쓸 수 있지만, 도끼·둔기가 필요한 전사 공격 스킬은 꺼질 수 있습니다. 반대로 함성·축복·저주처럼 효과만 거는 스킬은 무기를 가리지 않으므로 다른 직업 영웅에게도 조합할 수 있습니다.<br><br>배울 수 있는지, 필요한 무기를 들었는지, 그 스킬의 능력치가 충분한지는 서로 다른 문제입니다. 궁수의 물리 한 방은 힘도 살펴보고, 민첩은 속도와 일부 스킬의 타수·효과를 봅니다. 사제의 대상 회복은 마법 공격력·매력을, 리커버리 같은 자기 회복은 최대 HP·건강을 사용하며 무기를 요구하지 않습니다. 각 스킬의 설명과 [Alt] 수치 내역을 확인합니다.",
        en: "Heroes can learn book skills from another class. However, skills needing a weapon—such as attacks, heals and summons—require a weapon belonging to that skill's class. This applies to innate, learned and advancement skills. Incompatible skills are skipped.<br><br>For example, a Warrior can read a Mage book and equip a staff. The Mage attack can then work, while Warrior attacks requiring an axe or mace may become inactive. Skills that only apply effects, such as shouts, blessings or curses, do not depend on the weapon and can be combined on other classes.<br><br>Being able to learn a skill, having its required weapon and having useful attributes for it are separate questions. An Archer's physical hit strength also depends on Strength; Agility affects speed and some skills' hit counts or effects. Priest heals use magic attack and Charisma. Self-healing such as Recovery uses maximum HP and Vitality without requiring a weapon. Check each skill's description and [Alt] calculations.",
        zh: '即使技能书与英雄的职业不同，也可以学习。但攻击、治疗、召唤等需要武器的技能，必须手持该技能所属职业的武器才能使用。这一条件对固有、习得、转职技能全部适用，不符合条件的技能会被跳过。<br><br>例如，战士也可以学习法师的书并手持法杖。这样就能使用法师的攻击技能，但需要斧或钝器的战士攻击技能可能会失效。反之，战吼、祝福、诅咒等只施加效果的技能不挑武器，因此也可以搭配给其他职业的英雄。<br><br>能否学习、是否手持所需武器、该技能所需的属性是否足够，是彼此不同的问题。弓箭手的物理单发伤害也要看力量，敏捷则影响速度以及部分技能的攻击次数与效果。牧师的目标治疗使用魔法攻击力与魅力；“复原”这类自我治疗使用最大生命与体力，且不需要武器。请查看各技能的说明与[Alt]数值明细。',
    },
    'help.character.speed.title': {
        ko: "공격 속도·캐스팅 속도·쿨타임",
        en: "Attack speed, casting speed and cooldowns",
        zh: '攻击速度、施法速度与冷却',
    },
    'help.character.speed.body': {
        ko: "공격 속도와 캐스팅 속도는 한 번 행동하는 간격에 영향을 줍니다. 물리 무기와 맨손은 공격 속도 옵션, 마법 무기는 캐스팅 속도 옵션을 사용합니다. 민첩은 양쪽 모두에 영향을 줍니다. 세부 스탯의 속도가 초로 표시될 때는 숫자가 작을수록 빠릅니다.<br><br>쿨타임은 같은 스킬을 쓴 뒤 다시 준비될 때까지의 시간입니다. 쿨타임 감소는 이 대기를 줄이고, 공격·캐스팅 속도는 행동 기회를 더 자주 만듭니다. 서로 대신하는 능력치가 아닙니다. 스킬이 준비됐는데 행동을 기다리는지, 행동할 준비는 됐는데 스킬 쿨이 남았는지 관전에서 살펴봅니다.<br><br>마법 무기는 행동 게이지가 찰 때 시전 칸 하나를 모으며 최대 {castCharges}칸까지 저장합니다. 준비된 스킬을 쓰면 한 칸이 줄고, 쌓인 칸과 준비된 스킬이 여럿이면 연달아 시전할 수 있습니다. 스킬 쿨 때문에 잠시 쉬는 동안 칸을 모으는 것이므로, 서 있다가 연속으로 쓰는 모습이 곧 고장은 아닙니다.",
        en: "Attack Speed and Casting Speed affect the interval between actions. Physical weapons and bare hands use Attack Speed options; magic weapons use Casting Speed. Agility affects both. When detailed stats show the interval in seconds, a lower number is faster.<br><br>A cooldown is the wait after using a skill before it is ready again. Cooldown Reduction shortens that wait; attack or casting speed creates action opportunities more often. They do not replace each other. Watch whether a ready skill is waiting for an action, or a hero ready to act is waiting for skill cooldowns.<br><br>Magic weapons gain one casting charge when the action gauge fills and store up to {castCharges}. Casting a ready skill spends one charge. Several stored charges and ready skills can produce casts in quick succession. Pausing while cooldowns run can build those charges, so waiting and then casting repeatedly is not necessarily a malfunction.",
        zh: '攻击速度与施法速度影响每次行动的间隔。物理武器与空手使用攻击速度词条，魔法武器使用施法速度词条。敏捷对两者都有影响。详细属性中的速度以秒显示时，数字越小越快。<br><br>冷却是使用某个技能后到它再次就绪所需的时间。冷却缩减会缩短这段等待，攻击速度与施法速度则让行动机会更频繁。它们不能互相替代。请在观战中观察：是技能已就绪却在等待行动，还是已准备好行动却还在等技能冷却。<br><br>魔法武器在行动槽充满时积攒一格施法充能，最多储存{castCharges}格。使用就绪的技能会消耗一格；积攒了多格且有多个就绪技能时，可以接连施放。这是在因技能冷却而暂停期间积攒充能，所以站着不动后连续施法并不意味着出了故障。',
    },
    'help.character.defenses.title': {
        ko: "물리 방어와 원소 저항",
        en: "Physical defense and elemental resistance",
        zh: '物理防御与元素抗性',
    },
    'help.character.defenses.body': {
        ko: "물리 방어는 직접 맞는 물리 피해를, 화염·냉기·전기·독 저항은 해당 원소 피해를 줄입니다. 하나의 마법 방어 수치가 모든 원소를 막는 구조가 아닙니다. 방어력이 높은데도 화염 스킬에 크게 다친다면 화염 저항을 따로 봅니다.<br><br>저항 값과 최대 저항도 다릅니다. 저항이 상한에 닿으면 같은 저항을 더 쌓아도 현재 받는 피해가 더 줄지 않을 수 있습니다. 최대 저항 증가는 그 천장을 높이는 옵션으로, 저항 자체를 충분히 갖춰야 높아진 천장을 활용합니다. 적이 저항을 깎는 상황도 함께 살펴봅니다.<br><br>피해 감소·배리어·회복은 물리 방어와 또 다른 수단입니다. 다만 어떤 피해든 똑같이 막는다고 생각하지 않습니다. 사제의 일부 공격은 고정 피해로 방어·저항·피해 감소를 무시하고, 중독이나 반사도 직접 맞는 공격과 다른 규칙을 사용합니다.",
        en: "Physical Defense reduces direct physical hits. Fire, Cold, Lightning and Poison Resistance reduce their matching elemental damage. There is no single magic-defense value covering every element. If a high-defense hero takes heavy Fire damage, check Fire Resistance separately.<br><br>Resistance and maximum resistance are different. Once resistance reaches its cap, adding more may not immediately lower damage taken. Maximum-resistance bonuses raise the ceiling; enough actual resistance is still needed to use it. Also consider enemies that reduce resistance.<br><br>Damage Reduction, barriers and healing offer other forms of protection, but they do not treat every damage source alike. Some Priest attacks deal Fixed damage and bypass defense, resistance and damage reduction. Poison damage over time and reflection also follow different rules from direct hits.",
        zh: '物理防御减少直接受到的物理伤害，火焰、冰霜、闪电、毒素抗性减少对应元素的伤害。并没有一个能抵御所有元素的魔法防御数值。如果防御力很高却被火焰技能重创，就要单独查看火焰抗性。<br><br>抗性数值与最大抗性也不同。抗性达到上限后，即使继续堆同一种抗性，当前受到的伤害也可能不再减少。最大抗性提高是抬高这一上限的词条，只有抗性本身足够，才能利用提高后的上限。也要留意敌人削减抗性的情况。<br><br>伤害减免、屏障与治疗是不同于物理防御的另一类手段，但不要以为它们对任何伤害都一视同仁。牧师的部分攻击造成真实伤害，会无视防御、抗性与伤害减免；中毒和反射也采用与直接命中的攻击不同的规则。',
    },
    'help.character.penetration.title': {
        ko: "방어력 관통·원소 관통·감소",
        en: "Defense Penetration, Elemental Penetration and reductions",
        zh: '防御穿透、元素穿透与降低',
    },
    'help.character.penetration.body': {
        ko: "방어력 관통은 내 물리 직격에서 적의 방어 일부를 계산하지 않는 능력치입니다. 스킬이 거는 방어력 감소는 적의 방어를 낮추므로, 같은 적을 때리는 다른 영웅의 물리 공격도 도움을 받습니다. 둘 다 명중률을 올리는 효과는 아닙니다.<br><br>원소 관통은 내 원소 직격에 적용하며, 화염·냉기처럼 원소가 정해진 옵션은 그 원소에만 적용됩니다. 스킬이 거는 저항 감소는 적에게 걸린 동안 같은 원소로 공격하는 동료도 활용합니다. 화염 저항을 깎아도 물리·냉기 공격이 함께 강해지는 것은 아닙니다.<br><br>장비 옵션은 관통이고, 적에게 거는 감소는 스킬에서 나옵니다. 물리 공격이 중심인 파티라면 방어력 관통과 방어를 깎는 스킬을, 원소 공격이 중심이라면 실제 쓰는 원소의 관통과 저항을 깎는 스킬을 맞춰 봅니다. 고정 피해는 원래 방어·저항을 건너뛰므로 이 옵션으로 그 고정 피해가 더 늘지는 않습니다.",
        en: "Defense Penetration leaves part of the enemy's defense out of your own Physical direct-hit calculation. Defense reduction applied by skills lowers the enemy's defense, also helping allies who deal Physical hits to that target. Neither effect improves hit chance.<br><br>Elemental Penetration applies to your own elemental direct hits. Options naming Fire, Cold or another element apply only to that element. Resistance reduction applied by skills affects the enemy, so allies attacking with the same element can benefit while it lasts. Reducing Fire Resistance does not also strengthen Physical or Cold attacks.<br><br>Gear options give penetration; reductions placed on enemies come from skills. For a party focused on Physical hits, pair Defense Penetration with skills that lower defense. For elemental attacks, match penetration and resistance-lowering skills to the elements actually used. Fixed damage already bypasses defense and resistance, so these options do not raise that Fixed damage.",
        zh: '防御穿透是在自己的物理直击中，不计算敌人部分防御的属性。技能施加的防御降低会降低敌人的防御，因此攻击同一敌人的其他英雄的物理攻击也会受益。两者都不是提高命中率的效果。<br><br>元素穿透作用于自己的元素直击；像火焰、冰霜这样指定了元素的词条，只对该元素生效。技能施加的抗性降低在作用于敌人期间，用同一元素攻击的队友也能利用。即使削减了火焰抗性，物理与冰霜攻击也不会一同变强。<br><br>装备词条提供穿透，施加在敌人身上的降低来自技能。以物理攻击为主的队伍，要搭配防御穿透与降低防御的技能；以元素攻击为主的队伍，则要让穿透与降低抗性的技能匹配实际使用的元素。真实伤害本来就会跳过防御与抗性，因此这些词条不会让真实伤害进一步增加。',
    },
    'help.character.damage_kinds.title': {
        ko: "직격·지속 피해·반사·경직",
        en: "Direct hits, damage over time, reflection and stagger",
        zh: '直击、持续伤害、反射与僵直',
    },
    'help.character.damage_kinds.body': {
        ko: "기본 공격과 스킬의 직접 타격은 직격입니다. 직격에는 물리뿐 아니라 원소·고정 피해도 있습니다. 정신 집중 스킬이 여러 번 때리는 것도 각 타격이 직격일 수 있으므로, 여러 번 피해가 보인다고 모두 지속 피해로 보지는 않습니다.<br><br>중독·주기적으로 들어가는 오오라 피해·반사는 직격이 아닙니다. 이 피해는 다시 치명타·흡혈·반사를 일으키지 않습니다. 중독과 오오라 피해는 해당 원소 저항을 보지만 배리어·물리 방어·일반 피해 감소로 막지 않으며, 반사는 돌아온 피해를 방어·저항·배리어로 다시 줄이지 않습니다. 공격 횟수가 많아 보이는 것만으로 흡혈 회복량을 판단하지 않습니다.<br><br>큰 물리·고정 직격으로 실제 HP를 많이 잃으면 잠깐 경직될 수 있습니다. 경직은 다음 행동을 늦추지만 스턴처럼 스킬 쿨타임까지 멈추지는 않습니다. 타격 회복은 이 경직 시간을 줄이는 능력치이며 HP를 회복하는 효과가 아닙니다.",
        en: "Basic attacks and direct skill strikes are direct hits. These can deal Physical, elemental or Fixed damage. Repeated strikes from a channeled skill can each be direct hits, so a sequence of damage numbers does not always mean damage over time.<br><br>Poison, periodic aura damage and reflection are not direct hits. They do not trigger further critical hits, life steal or reflection. Poison and aura damage check their matching elemental resistance but bypass barriers, physical defense and ordinary Damage Reduction. Reflected damage is not reduced again by defense, resistance or barriers. A rapid-looking effect does not necessarily provide life-steal healing.<br><br>Losing a large amount of actual HP to a Physical or Fixed direct hit can briefly stagger a hero. Stagger delays actions but, unlike Stun, does not pause skill cooldowns. Hit Recovery shortens stagger; it does not restore HP.",
        zh: '普通攻击与技能的直接打击属于直击。直击不只有物理伤害，也有元素伤害与真实伤害。引导技能的多次打击，每一次也可能是直击，所以不要看到多次伤害就都当作持续伤害。<br><br>中毒、周期性的光环伤害与反射都不是直击。这些伤害不会再触发暴击、吸血或反射。中毒与光环伤害会计算对应的元素抗性，但不会被屏障、物理防御或普通伤害减免抵挡；反射回来的伤害也不会再被防御、抗性或屏障减少。不要只因攻击次数看起来多，就判断吸血的治疗量。<br><br>因强力的物理或真实伤害直击而损失大量实际生命时，可能会短暂僵直。僵直会延后下一次行动，但不会像眩晕那样连技能冷却也一起停止。受击恢复是缩短僵直时间的属性，并不是恢复生命的效果。',
    },
    'help.character.critical_effects.title': {
        ko: "치명타·강타·흡혈·반격",
        en: "Critical hits, Crushing Blow, Life Steal and counters",
        zh: '暴击、压碎性打击、吸血与反击',
    },
    'help.character.critical_effects.body': {
        ko: "치명타 확률은 치명타가 나올 빈도이고, 치명타 피해는 치명타가 났을 때의 피해 배율입니다. 마법 무기의 직격에도 치명타가 나올 수 있습니다.<br><br>강타는 타격 직전 적의 현재 HP에 비례한 물리 피해를 더합니다. 적의 물리 방어와 공격자의 방어력 관통이 이 피해에 적용됩니다. 물리 무기 또는 맨손으로 가한 직격에서 발동하며, 일반·정예 언데드에게는 통하지 않습니다.<br><br>흡혈은 준 직격 피해에 비례합니다. 물리 피해로는 HP를 회복하고, 원소 피해로는 최대 HP의 일정 비율까지 잠깐 유지되는 보호막을 얻습니다. 고정 피해, 강타로 더한 피해, 중독, 반사는 흡혈을 일으키지 않습니다.",
        en: "Critical Chance determines how often a hit is critical. Critical Damage determines how much damage a critical hit deals. Direct hits with magic weapons can also crit.<br><br>Crushing Blow adds Physical damage based on the target's current HP just before the hit. The target's Physical Defense and the attacker's Defense Penetration apply to that damage. It works on direct hits with a physical weapon or bare hands. Normal and Elite Undead are immune.<br><br>Life Steal scales with direct-hit damage dealt. Physical damage restores HP. Elemental damage grants a short-lived shield capped at a share of max HP. Fixed damage, the extra damage from Crushing Blow, poison and reflected damage do not provide Life Steal.",
        zh: "暴击率决定暴击出现的频率，暴击伤害决定暴击时的伤害倍率。魔法武器的直击也能暴击。<br><br>重击按命中前目标的当前生命值附加物理伤害。这部分伤害会计算目标的物理防御和攻击者的防御穿透。物理武器或空手造成的直击可触发重击，普通和精英亡灵对其免疫。<br><br>吸血随造成的直击伤害增加。物理伤害恢复生命，元素伤害提供短暂护盾，护盾上限取决于最大生命值的一定比例。固定伤害、重击附加伤害、中毒和反射都不会触发吸血。",
    },
    'help.character.farming_stats.title': {
        ko: "드랍률과 파티 획득 보너스",
        en: "Item Find and Party Reward Bonuses",
        zh: '掉落率与队伍奖励加成',
    },
    'help.character.farming_stats.body': {
        ko: "드랍률은 적을 처치했을 때 장비를 떨어뜨릴 확률을 높입니다. 파티 매직아이템 획득확률은 장비의 레어 이상 등급이 나올 비중을 높입니다. 이름과 달리 매직 등급만을 위한 옵션이 아니며, 아이템 레벨을 올리거나 아직 나오지 않는 난이도의 등급을 해금하지도 않습니다.<br><br>파티 골드 획득은 적에게서 받는 골드의 양을 늘립니다. 장비와 마스터리의 파티 경험치 획득은 해당 영웅의 전투 경험치를 늘리며, 도감 경험치를 늘리는 옵션은 아닙니다. 장비가 필요한지, 자금이 필요한지, 특정 영웅을 키울지에 따라 비교할 옵션이 달라집니다.<br><br>드랍률·파티 매직아이템 획득확률·파티 골드 획득은 파티원의 몫을 모아 적용하지만 많이 모을수록 추가분의 효과가 줄어듭니다. 몬스터가 입은 장비를 얻는 구조라 파티 매직아이템 획득확률은 적의 장비도 좋게 만들 수 있습니다. 파밍 수치를 높인 뒤 클리어가 느려지거나 실패가 늘었다면 실제로 모이는 보상도 함께 비교합니다.",
        en: "Item Find raises the chance that a defeated enemy drops gear. Party Magic Find raises the share of gear rolls that are Rare or better. Despite its name, it does not only favor Magic rarity. It neither raises item level nor unlocks rarities unavailable at that difficulty.<br><br>Party Gold Find increases gold earned from enemies. Party Experience Gain from gear or mastery increases the hero’s combat XP, not Codex EXP. Compare different options depending on whether you need equipment, funds or levels for a particular hero.<br><br>Item Find, Party Magic Find and Party Gold Find combine the party's contributions with diminishing returns. Because drops come from gear monsters actually wear, Party Magic Find can improve enemy equipment too. If higher farming bonuses make clears slower or less reliable, also compare the rewards you actually earn.",
        zh: '掉落率会提高击败敌人时掉落装备的几率。队伍魔法物品获取率会提高装备以稀有及以上稀有度出现的比重。与名称不同，它并不是只针对魔法稀有度的词条，也不会提高物品等级，或解锁该难度尚不会掉落的稀有度。<br><br>队伍金币获取会增加从敌人处获得的金币数量。装备与专精提供的队伍经验获取会增加该英雄的战斗经验，并不是增加图鉴经验的词条。根据你需要的是装备、资金，还是培养特定英雄，要比较的词条也会不同。<br><br>掉落率、队伍魔法物品获取率、队伍金币获取会汇总队员各自的数值后生效，但汇总得越多，追加部分的效果越低。由于获得的是怪物身上穿戴的装备，队伍魔法物品获取率也会让敌人的装备变好。如果提高刷宝数值后通关变慢或失败增多，也要一并比较实际获得的奖励。',
    },
    'help.character.ailments.title': {
        ko: "화상·중독·결빙·스턴",
        en: "Burn, Poison, Freeze and Stun",
        zh: '燃烧、中毒、冻结与眩晕',
    },
    'help.character.ailments.body': {
        ko: "화상은 지속 피해가 아닙니다. 걸린 동안 받는 물리·원소 직격 피해가 늘고 받는 회복이 줄어듭니다. 회복 감소는 회복 스킬뿐 아니라 재생·흡혈·물약에도 적용되므로, 평소 잘 버티던 영웅도 화상 중에는 다르게 보일 수 있습니다.<br><br>중독은 일정 시간마다 독 피해를 줍니다. 공격이 끝난 뒤에도 HP가 줄어드는 이유가 될 수 있으며, 독 저항이 이 피해를 줄입니다. 모든 화염·독 스킬이 저절로 화상·중독을 거는 것은 아니므로 스킬 설명의 부여 효과를 확인합니다.<br><br>결빙은 행동을 느리게 하지만 스킬 쿨타임은 계속 흐릅니다. 스턴은 행동과 스킬 쿨타임을 함께 멈춥니다. 스턴 중에도 물약·재생과 걸린 효과의 시간은 계속 흐릅니다. 같은 모습으로 잠시 서 있어도 원인은 다를 수 있습니다.<br><br>받는 상태이상·디버프의 시간은 매력과 해당 시간 감소 옵션으로 짧아질 수 있습니다. 화염 저항처럼 피해를 줄이는 수치와 화상 시간 감소처럼 지속시간을 줄이는 수치는 하는 일이 다릅니다. 어떤 효과가 오래 남는지와 어떤 피해가 큰지를 나누어 봅니다.",
        en: "Burn is not damage over time. It increases incoming Physical and elemental direct-hit damage and reduces healing received. The healing penalty affects healing skills, regeneration, life steal and potions, so a hero who normally survives well may struggle while burning.<br><br>Poison deals Poison damage at regular intervals. It can keep lowering HP after an attack ends, and Poison Resistance reduces it. Fire or Poison damage does not automatically apply Burn or Poison; check the effects stated on the skill.<br><br>Freeze slows actions while skill cooldowns keep running. Stun pauses both actions and skill cooldowns. Potions, regeneration and effect durations continue during Stun. Heroes standing still can therefore have different causes.<br><br>Charisma and matching duration-reduction options can shorten incoming ailments and debuffs. Fire Resistance reduces damage; Burn Duration Reduction shortens an effect. Check which effects persist and which damage sources hurt rather than treating these stats as interchangeable.",
        zh: '燃烧不是持续伤害。处于燃烧状态期间，受到的物理与元素直击伤害提高，受到的治疗降低。治疗降低不仅作用于治疗技能，也作用于再生、吸血与药水，所以平时很耐打的英雄在燃烧时也可能表现不同。<br><br>中毒每隔一段时间造成毒素伤害。它可能是攻击结束后生命仍在减少的原因，毒素抗性可以减少这部分伤害。并非所有火焰、毒素技能都会自动施加燃烧或中毒，请查看技能说明中的附加效果。<br><br>冻结会让行动变慢，但技能冷却会继续计时。眩晕会同时停止行动与技能冷却。眩晕期间，药水、再生以及身上效果的持续时间仍会继续流逝。即使同样是暂时站着不动，原因也可能不同。<br><br>受到的异常状态与减益的持续时间，可以通过魅力和对应的时间缩短词条来缩短。像火焰抗性这样减少伤害的数值，与像燃烧时间缩短这样缩短持续时间的数值，作用并不相同。请把“哪种效果持续得久”与“哪种伤害大”分开来看。',
    },
    'help.character.channeling.title': {
        ko: "정신 집중과 오래 걸리는 스킬",
        en: "Channeling and skills that take time",
        zh: '引导与耗时较长的技能',
    },
    'help.character.channeling.body': {
        ko: "정신 집중 스킬은 시작한 뒤 여러 번에 나누어 공격하거나, 힘을 모은 뒤 한 번 공격합니다. 그동안 다른 스킬과 기본 공격은 기다립니다. 다른 스킬의 쿨타임은 계속 흐르지만, 집중 중인 스킬의 쿨타임은 집중이 끝난 뒤부터 시작합니다.<br><br>공격 속도가 모든 집중 시간을 줄이지는 않습니다. 행동 간격마다 끊어 치는 스킬과 정해진 초 동안 모으는 스킬은 시간 규칙이 다릅니다. 스킬 설명에서 타수·간격·모으는 시간을 함께 확인합니다. 경직이나 스턴은 집중을 늦출 수 있지만, 맞았다는 이유만으로 언제나 취소되는 것은 아닙니다.",
        en: "Channeling skills spread attacks over time or gather power before a single strike. Other skills and basic attacks wait during the channel. Other skill cooldowns keep running, while the channeled skill's own cooldown starts after the channel ends.<br><br>Attack speed does not shorten every channel. Skills striking at action intervals and skills charging for a fixed number of seconds use different timing rules. Check hit counts, intervals and charge time in the skill description. Stagger and Stun can delay a channel; being hit does not always cancel it.",
        zh: '引导技能在开始后会分多次攻击，或蓄力后进行一次攻击。在此期间，其他技能与普通攻击会等待。其他技能的冷却会继续计时，而正在引导的技能的冷却在引导结束后才开始。<br><br>攻击速度并不会缩短所有引导时间。每个行动间隔打击一次的技能，与持续蓄力固定秒数的技能，时间规则不同。请在技能说明中一并查看攻击次数、间隔与蓄力时间。僵直或眩晕可能会推迟引导，但并不会仅仅因为受到攻击就一定被取消。',
    },
    'help.character.mastery.title': {
        ko: "마스터리로 바꾸는 영웅의 강점",
        en: "Shaping a hero with mastery",
        zh: '用专精塑造英雄的强项',
    },
    'help.character.mastery.body': {
        ko: "캐릭터의 [마스터리 열기]에서 죄종·직업 마스터리에 공용 스킬 포인트를 투자합니다. 칸을 클릭해 한 랭크를 올리고, 우클릭해 한 랭크와 포인트를 돌려받습니다. [마스터리 초기화]를 누르면 투자한 포인트를 무료로 환급합니다.<br><br>높은 티어를 열려면 표시된 레벨과 포인트 조건을 확인합니다. 특정 무기·갑옷·장비 죄종 수를 요구하는 효과는 해당 조건을 만족할 때 적용됩니다. 죄종 마스터리 T3는 영웅과 같은 죄종 장비를 {sinGear}부위 착용해야 적용됩니다.<br><br>전직 후에는 같은 공용 스킬 포인트를 전직 마스터리에도 쓸 수 있습니다. 스킬을 고르고 포인트를 배분하는 방법은 도서관 도움말에서 확인합니다.",
        en: "Select [Open Mastery] in Character to spend shared skill points on Sin and class masteries. Click a node to raise it one rank or right-click it to refund one rank and its point. [Reset Mastery] refunds invested points for free.<br><br>Check the displayed level and point requirements to unlock higher tiers. Effects that require a weapon, armor, or a number of matching Sin pieces apply when those conditions are met. Sin mastery T3 requires {sinGear} pieces of gear matching the hero's Sin.<br><br>After advancement, the same pool of skill points can be spent on Advancement Mastery. See the Library help for selecting a skill and allocating points.",
        zh: "在角色页点击【打开专精】，可将共用技能点投入罪宗和职业专精。点击节点可提升一阶，右键点击可退回一阶及对应点数。点击【重置专精】可免费返还已投入的点数。<br><br>解锁更高层级时，请查看显示的等级和技能点要求。要求特定武器、护甲或罪宗装备件数的效果，在满足条件时生效。罪宗专精 T3 需要穿戴 {sinGear} 件与英雄同罪宗的装备。<br><br>转职后，共用技能点也可用于转职专精。技能选择和加点方法可查看图书馆帮助。",
    },
    'help.character.dismiss.title': {
        ko: "영웅 해고와 남는 것",
        en: "Dismissing a hero",
        zh: '解雇英雄会留下什么',
    },
    'help.character.dismiss.body': {
        ko: "캐릭터 탭에서 영웅을 선택하면 카드에 [해고] 버튼이 표시됩니다. 모든 장비를 먼저 해제해야 하며, 원정·탐험·전직 진행 중인 영웅과 로스터의 마지막 한 명은 해고할 수 없습니다.<br><br>확인 뒤 해고하면 그 영웅은 로스터와 편성·연구소 등록에서 사라집니다. 해고는 되돌릴 수 없고 고용비·사용한 책·경험치를 돌려받지 않습니다. 현재 성장 고블린도 해고 경험치 물약이나 재고용 기능이 없으므로, 훈련 대기 영웅을 단순히 빼 두려면 편성에서만 제외하면 됩니다.",
        en: "Select a hero in Character to show [Dismiss] on their card. Remove all equipment first. Heroes on expeditions, exploring or advancing cannot be dismissed, nor can the last hero in the roster.<br><br>Confirming removes the hero from the roster, party presets and Laboratory assignments. This cannot be undone and returns no hiring gold, books or XP. The Growth goblin currently has no dismissal XP potion or rehiring feature either. To keep a hero for later training, remove them from the party rather than dismissing them.",
        zh: '在角色标签页中选择英雄后，卡片上会显示[解雇]按钮。必须先卸下所有装备；正在远征、探索或转职的英雄，以及名册中的最后一名英雄无法解雇。<br><br>确认解雇后，该英雄会从名册、编队与研究所派驻中消失。解雇无法撤销，也不会返还雇佣费、已使用的书与经验。目前成长哥布林同样没有解雇后获得经验药水或重新雇佣的功能，所以如果只是想让等待培养的英雄暂时不出战，只需将其从编队中移出即可。',
    },
    'help.research.build.title': {
        ko: "건물 랭크란?",
        en: "What is a building rank?",
        zh: '什么是建筑的阶？',
    },
    'help.research.build.body': {
        ko: "건물의 <b>랭크</b>는 그 건물이 여는 기능과 칸의 단계입니다. 처음 짓는 것이 랭크 I이며, 이후에는 같은 건물의 랭크를 하나씩 올립니다.<br><br>왼쪽 부지에서 건물을 고르면 오른쪽에 <b>현재 기능 · 다음 랭크 · 전체 랭크 목록</b>이 나옵니다. 다음 랭크에서 무엇이 열리는지 확인하고, 조건과 비용을 갖춘 뒤 <b>[건설]</b>합니다.",
        en: "A building's <b>rank</b> is a step in the features and slots it unlocks. Building it for the first time gives rank I; further construction adds one rank at a time.<br><br>Select a lot on the left to see <b>current features, the next rank and the full rank list</b> on the right. Check what the next rank opens, meet its requirements and cost, then press <b>Build</b>.",
        zh: '建筑的<b>阶</b>表示该建筑所开放功能与格子的阶段。首次建造即为I阶，之后同一建筑的阶会逐一提升。<br><br>在左侧地块中选择建筑后，右侧会显示<b>当前功能 · 下一阶 · 全部阶列表</b>。确认下一阶会开放什么，备齐条件与费用后，按<b>[建设]</b>。',
    },
    'help.research.first_steps.title': {
        ko: "처음 마을을 넓히는 순서",
        en: "The first town unlocks",
        zh: '初期扩建城镇的顺序',
    },
    'help.research.first_steps.body': {
        ko: "창고와 선술집은 처음부터 지을 수 있습니다. 창고를 지으면 지휘 천막을 지을 수 있고, 연구소의 자원 줄이 열립니다. 자원 줄에 영웅을 등록하면 철광석·약초·목재 생산이 시작됩니다. 인벤토리와 공용 창고 칸은 건설 전에도 이용할 수 있습니다.<br><br>선술집을 지으면 의뢰 게시판이 열리고 상단을 지을 수 있습니다. 상단을 지으면 대장간을 지을 수 있습니다. 선술집의 영웅 고용은 2랭크에서 열립니다.",
        en: "Storage and the Tavern can be built from the start. Building Storage lets you build the Command Tent and opens the Laboratory's Resources line. Assign a hero to that line to start producing iron ore, herbs and timber. The party inventories and shared stash are available before construction.<br><br>Building the Tavern opens the commission board and lets you build the Trading House. Once the Trading House is built, you can build the Blacksmith. Hero hiring opens at Tavern rank 2.",
        zh: "仓库和酒馆从一开始就可以建造。建造仓库后，可建造指挥营帐，并开启研究所的资源线。派驻英雄后，就会开始生产铁矿石、草药和木材。队伍背包和共用仓库格在建造前即可使用。<br><br>建造酒馆后会开启委托板，并可建造商会。建成商会后可建造铁匠铺。酒馆升到 2 阶后可雇用英雄。",
    },
    'help.research.requirements.title': {
        ko: "건설 조건과 지불",
        en: "Requirements and payment",
        zh: '建设条件与支付',
    },
    'help.research.requirements.body': {
        ko: "<b>[다음 랭크]</b>의 조건은 모두 채워야 합니다. 건물에 따라 스테이지·챕터·난이도 클리어, 영웅 레벨, 다른 건물 랭크를 요구합니다.<br><br>비용을 내면 <b>즉시 완료</b>되며 영웅을 배치하거나 기다릴 필요가 없습니다. 지은 랭크와 지불한 비용은 되돌리지 못합니다. 비용 칸의 부족한 재료를 확인한 뒤 연구소 생산이나 장비 분해로 준비합니다.",
        en: "Meet <b>every requirement</b> listed under Next Rank. Depending on the building, these include stage, chapter or difficulty clears, hero levels and other building ranks.<br><br>Construction finishes <b>immediately</b> after payment, with no assigned hero or waiting time. Built ranks and their costs cannot be refunded. Check missing materials in the cost display and obtain them through Laboratory production or salvaging gear.",
        zh: '<b>[下一阶]</b>中的条件必须全部满足。根据建筑不同，会要求通关关卡、章或难度，英雄等级，以及其他建筑的阶。<br><br>支付费用后<b>立即完成</b>，无需安排英雄或等待。已建成的阶与支付的费用无法退还。请在费用栏中确认缺少的材料，再通过研究所生产或分解装备来准备。',
    },
    'help.research.unlocks.title': {
        ko: "어떤 건물이 무엇을 여나요?",
        en: "Which building unlocks what?",
        zh: '哪座建筑开放什么？',
    },
    'help.research.unlocks.body': {
        ko: "대장간은 랭크 순서대로 강화, 연구소 대장간 줄의 제작, 합성, 담금질, 장비 인챈트를 엽니다. 창고는 자원 줄과 추가 물약 칸, 자동 분해를 열고 지휘 천막은 작전 카드 칸을 엽니다.<br><br>도서관은 스킬북 학습과 도감부터 시작해 연구소 도서관 줄, 스킬북 제작·분해, 전직, 추가 도감 구간을 차례로 엽니다. 탐험 건물은 동굴·상단 의뢰·폐허를 순서대로 엽니다.<br><br>연구소의 건물 랭크를 올리면 새 지점과 지점의 다음 레벨이 열립니다. 열린 지점은 연구소 탭에서 연구해 실제 효과를 올립니다. 각 건물이 여는 기능은 건설의 랭크 목록에서 확인합니다.",
        en: "The Blacksmith unlocks upgrades, crafting on the Laboratory's Blacksmith line, combining, quenching and gear enchanting in rank order. Storage unlocks the Resources line, extra potion slots and Auto Salvage. The Command Tent opens Tactic Card slots.<br><br>The Library starts with skill-book learning and the Codex, then unlocks the Laboratory's Library line, book crafting and salvage, advancement and further Codex sections. The Exploration building opens the cave, Caravan jobs and Ruins in order.<br><br>Higher Laboratory ranks open new nodes and higher node levels. Research those levels in the Laboratory tab to improve their effects. Each building's rank list in Construction shows its unlocks.",
        zh: "铁匠铺按阶依次开启强化、研究所铁匠铺线的制作、合成、淬火和装备附魔。仓库开启资源线、额外药水格及自动分解。指挥营帐开启战术卡槽。<br><br>图书馆先开启技能书学习和图鉴，再依次开启研究所图书馆线、技能书制作与分解、转职和更多图鉴区间。探索建筑依次开启洞穴、商队委托与废墟。<br><br>提高研究所建筑阶数可开放新节点和更高的节点等级。在研究所页进行研究即可提升相应效果。各建筑开放的功能可在建造页的阶数列表查看。",
    },
    'help.research.locked.title': {
        ko: "잠긴 기능과 준비 중 기능",
        en: "Locked and coming features",
        zh: '未解锁功能与准备中功能',
    },
    'help.research.locked.body': {
        ko: "왼쪽의 자물쇠 탭을 누르면 먼저 필요한 건물을 알려 줍니다. 건설 화면의 <b>[다음 랭크]</b>에서 부족한 조건과 비용을 확인합니다. 기능 안의 잠금은 해당 기능을 여는 건물 랭크를 확인합니다.<br><br><b>잠김</b>은 건설·진행 조건을 채우면 열리는 기능입니다. <b>준비 중</b>은 아직 사용할 수 없는 기능입니다. 한 랭크가 여는 기능이 전부 준비 중이면 그 랭크는 지을 수 없습니다.",
        en: "Click a locked navigation tab to see the building required first. Check <b>Next Rank</b> in Construction for missing requirements and costs. A lock within a feature identifies the building rank that opens it.<br><br>A <b>locked</b> feature opens when its construction or progress requirements are met. A feature marked <b>coming later</b> is not available yet. A rank that only opens coming features cannot be built.",
        zh: '点击左侧带锁的标签页，会提示需要先建造的建筑。在建设画面的<b>[下一阶]</b>中确认缺少的条件与费用。功能内部的锁定，请确认开放该功能的建筑阶。<br><br><b>未解锁</b>表示满足建设或进度条件后即可开放的功能。<b>准备中</b>表示目前尚无法使用的功能。如果某一阶开放的功能全部处于准备中，则无法建造该阶。',
    },
    'help.tavern.hire.title': {
        ko: "영웅 고용",
        en: "Hiring heroes",
        zh: '雇佣英雄',
    },
    'help.tavern.hire.body': {
        ko: "고용 기능이 열리면 후보 카드의 능력치와 스킬을 살펴본 뒤 <b>[고용]</b>합니다. 비용은 <b>{hire}G</b>이며 로스터에 빈 자리가 필요합니다. <b>[보유 칸 +1]</b>을 누르면 표시된 골드로 한 칸을 즉시 엽니다. 영웅은 시작 무기와 갑옷을 갖고 들어옵니다.<br><br>고용한 영웅은 <b>로스터에 추가</b>됩니다. 전투에 넣으려면 편성 탭에서 Party에 넣고, 연구소 효과를 받으려면 원하는 줄에 등록합니다. 고용한 후보의 자리는 다음 명단 교체까지 비어 있습니다.",
        en: "Once hiring is unlocked, inspect a candidate's attributes and skill, then press <b>Hire</b>. It costs <b>{hire}G</b> and needs a free roster slot. Use <b>Roster slot +1</b> to unlock one slot immediately for the displayed gold price. The hero arrives with a starter weapon and armor.<br><br>Hiring adds the hero to your <b>roster</b>. Add them to a Party in the Party tab to fight, or assign them to a Laboratory line for its bonuses. The hired candidate's slot stays empty until the next refresh.",
        zh: '雇佣功能开放后，查看候选卡片上的属性与技能，再按<b>[雇佣]</b>。费用为<b>{hire}G</b>，且名册中需要有空位。可按<b>[名册栏位 +1]</b>，支付显示的金币立即解锁一格。英雄会携带初始武器与铠甲加入。<br><br>雇佣的英雄会<b>加入名册</b>。要让其参战，请在编队标签页中将其加入Party；要获得研究所效果，请将其派驻到想要的线上。已雇佣候选的位置会一直空着，直到下次名单刷新。',
    },
    'help.tavern.choosing.title': {
        ko: "후보는 무엇을 보고 고르나요?",
        en: "Choosing a recruit",
        zh: '挑选候选时该看什么？',
    },
    'help.tavern.choosing.body': {
        ko: "등급 색만 보지 말고 <b>필요한 역할 · 고유 스킬 · 그 스킬이 쓰는 능력치</b>를 함께 확인합니다. 일반·매직·레어는 능력치 총합의 범위와 분포가 다릅니다. 레어는 대체로 총합이 높지만, 매직도 필요한 능력치가 높게 나온 후보가 있을 수 있습니다.<br><br>기본 능력치는 생성될 때 정해지고 일반적인 레벨업으로 다시 뽑히지 않습니다. 직업은 같아도 죄종·능력치·고유 스킬이 다르면 맡길 역할이 달라집니다. 현재 명단에서는 일반·매직·레어가 나오며 유니크는 나오지 않습니다.",
        en: "Check the <b>role you need, the innate skill and the attributes that skill uses</b>, alongside the tier color. Normal, Magic and Rare heroes have different attribute-total ranges and spreads. Rare heroes generally have higher totals, but a Magic candidate may roll strongly in the attribute you need.<br><br>Attributes are set when a hero is created and are not rerolled by ordinary level-ups. Heroes of the same class can suit different roles because their Sins, attributes and innate skills differ. The current candidate list generates Normal, Magic and Rare heroes, but no Uniques.",
        zh: '不要只看稀有度颜色，还要一并确认<b>所需定位、固有技能，以及该技能使用的属性</b>。普通、魔法、稀有的属性总和范围与分布各不相同。稀有通常总和较高，但魔法中也可能有所需属性很高的候选。<br><br>基础属性在英雄生成时决定，普通的升级不会重新随机。即使职业相同，只要罪宗、属性、固有技能不同，适合担任的定位也会不同。当前名单会出现普通、魔法、稀有，不会出现唯一。',
    },
    'help.tavern.reroll.title': {
        ko: "후보 명단 교체",
        en: "Refreshing the recruit list",
        zh: '刷新候选名单',
    },
    'help.tavern.reroll.body': {
        ko: "<b>[후보 교체 (무료)]</b>를 누르면 남아 있는 후보를 포함해 명단 전체가 바뀝니다. 시간이 지나도 후보는 저절로 바뀌지 않습니다. <br><br>교체는 항상 무료입니다. 교체 뒤 <b>{refresh}분</b>이 지나야 다시 교체할 수 있으며, 대기 중에는 버튼이 비활성화되고 남은 시간이 표시됩니다. 대기 시간은 오프라인에도 흐릅니다.",
        en: "<b>New candidates (free)</b> replaces the entire recruit list, including candidates still present. Time never changes the list automatically. <br><br>Refreshing is always free. After each refresh, wait <b>{refresh} min</b> before refreshing again. The button is disabled during the cooldown and shows the remaining time beside it. The cooldown continues offline.",
        zh: '点击<b>[刷新候选（免费）]</b>后，包括剩余候选在内的整个名单都会更换。候选不会随时间自动更换。<br><br>刷新始终免费。刷新后需经过<b>{refresh}分钟</b>才能再次刷新，等待期间按钮不可用，并显示剩余时间。等待时间在离线时也会流逝。',
    },
    'help.tavern.visitors.title': {
        ko: "기다리면 찾아오는 영웅",
        en: "Heroes who arrive over time",
        zh: '等待就会来访的英雄',
    },
    'help.tavern.visitors.body': {
        ko: "연구소 <b>수색</b> 줄에 등록한 영웅이 시간마다 한 명씩 데려옵니다. 아무도 등록하지 않으면 찾아오는 영웅이 없고, 영웅은 영웅 고용 후보로만 얻습니다. 등록한 영웅도 원정과 편성에 그대로 쓸 수 있고, 게임을 닫아도 시간이 흐릅니다. 이 수색으로는 <b>일반 · 매직 · 레어</b> 영웅이 옵니다. 로스터와 대기소에 성장 고블린이 없으면 가끔 고블린이 대신 옵니다.<br><br>도착한 영웅은 고용하거나 돌려보낼 때까지 떠나지 않습니다. 찾아온 영웅은 데려온 수색 영웅 줄의 오른쪽 칸에 섭니다. 그 줄 칸이 가득 차면 수색 영웅은 수색을 나가지 않고 선술집에서 쉬다가, 칸을 비우는 즉시 다음 수색을 나갑니다. 수색 중에 그 줄이 차 버리면 찾은 영웅은 자리가 날 때까지 밖에서 기다렸다가, 자리를 비우면 바로 들어옵니다. 기다리는 영웅은 데려온 수색 영웅 칸에 <b>찾았다!</b>로 보이며, 눌러서 바로 고용하거나 무시할 수 있습니다. 연구소에서 <b>간격</b>을 올리면 더 자주 오고, <b>품질</b>은 레어 확률을 올리고, <b>대기소</b>는 줄마다 둘째 칸을 연 뒤 <b>거르기</b>를 엽니다. 거르기로 데려올 최저 등급을 고르면 그보다 낮은 영웅은 돌려보내고, 수색 영웅은 바로 다시 나갑니다.",
        en: "Each hero assigned to the Laboratory's <b>Search</b> line brings back one candidate per interval. With no one assigned, nobody arrives and heroes come only from the hiring candidates. Assigned heroes can still join expeditions and formations, and time keeps passing while the game is closed. These arrivals can be <b>Normal, Magic or Rare</b> heroes. If there is no Growth goblin in your roster or Waiting Room, a goblin sometimes arrives instead.<br><br>Arrivals stay until hired or sent away, in the slots to the right of the searcher who brought them. While that searcher's slots are full, the searcher rests at the Tavern instead of searching and sets out again as soon as you free a slot. If the row fills up during a search, the hero found waits outside for room and enters as soon as you free a slot there. A waiting hero shows as <b>Found!</b> under the searcher who brought them; click it to hire them right away or pass. Laboratory <b>Interval</b> research makes arrivals more frequent, <b>Quality</b> raises the Rare chance, and the <b>Waiting Room</b> opens a second slot in each row and then <b>Filter</b>. Set a minimum grade with Filter and lower-grade heroes are turned away while the searcher sets out again at once.",
        zh: '派驻在研究所<b>搜寻</b>线上的英雄，每隔一段时间会带回一名英雄。没有派驻任何人时，就不会有英雄来访，英雄只能从雇佣候选中获得。派驻的英雄照样可以参加远征和编队，关闭游戏时时间也会流逝。这项搜寻会带来<b>普通、魔法或稀有</b>英雄。若名册和等候所中都没有成长哥布林，有时会改为来一只哥布林。<br><br>到来的英雄在你雇佣或打发走之前不会离开。来访的英雄站在带回他的搜寻英雄那一行右侧的格子里。那一行的格子满了时，搜寻英雄不会出发，而是在酒馆休息，你一腾出位置就立刻出发进行下一次搜寻。若在搜寻途中那一行已满，找到的英雄会在外面等到有空位，你一腾出位置就立刻进入。等候的英雄会在带回他的搜寻英雄格子上显示为<b>找到了！</b>，点击即可直接雇佣或忽略。在研究所提升<b>间隔</b>会让英雄来得更频繁，<b>品质</b>提高稀有几率，<b>等候所</b>为每一行开启第二格，之后开启<b>筛选</b>。用筛选设定最低等级后，低于该等级的英雄会被送回，搜寻英雄立刻再次出发。',
    },
    'help.tavern.commissions.title': {
        ko: "하던 원정에 의뢰를 얹기",
        en: "Adding a commission to your expeditions",
        zh: '在现有远征上附加委托',
    },
    'help.tavern.commissions.body': {
        ko: "선술집 게시판에서 목표와 골드 보상을 보고 [수락]합니다. 동시에 {slots}개까지 진행할 수 있습니다. 수락한 뒤 모든 부대의 활동 중 목표에 맞는 기록을 합산합니다.<br><br>토벌·현상금은 카드에 적힌 장·종족·장소에 맞는 처치를 셉니다. 분해 의뢰는 직접 분해하거나 자동 분해 규칙으로 분해한 장비를 셉니다. 재료 의뢰에는 분해와 연구소에서 얻은 철광석·약초·목재가 들어갑니다. 강화는 시도 횟수, 제작은 연구소 대장간 줄에서 만든 장비 수를 셉니다. 스킬북과 고용은 학습·업그레이드와 고용이 완료될 때, 장비 획득은 원정에서 승리한 라운드의 장비가 인벤토리에 들어올 때 셉니다.<br><br>목표를 채우면 [수령]을 눌러 골드를 받습니다. [포기]하면 그 의뢰의 진행도가 사라집니다. 수령하거나 포기한 자리에는 새 의뢰가 들어오며, 수락한 의뢰에는 기한이 없습니다.",
        en: "Check the objective and gold reward on the Tavern board, then select [Accept]. You can have up to {slots} active commissions. Matching progress from all parties counts after you accept.<br><br>Hunts and bounties count kills matching the chapter, species or area shown. Salvage commissions count gear salvaged by hand or by Auto Salvage rules. Gathering counts iron ore, herbs and timber from salvage or the Laboratory. Upgrading counts attempts, while crafting counts gear made on the Laboratory's Blacksmith line. Skill-book and hiring commissions advance when a skill is learned or upgraded or a hero is hired. Gear collection counts gear added to inventory from won Expedition rounds.<br><br>Once the objective is complete, select [Claim] to collect the gold. [Abandon] clears that commission's progress. Claiming or abandoning replaces the card. Accepted commissions have no deadline.",
        zh: "在酒馆委托板查看目标及金币奖励后点击【接受】。最多可同时进行 {slots} 项委托。接受后，所有队伍符合条件的进度会合并计算。<br><br>讨伐和悬赏统计符合卡片所列章节、种族或地点的击杀。分解委托统计手动分解或按自动分解规则处理的装备。采集委托统计通过分解或研究所获得的铁矿石、草药和木材。强化统计尝试次数，制作统计研究所铁匠铺线制作的装备。学习或升级技能、雇用英雄完成后会计入相应委托。装备收集统计远征获胜回合中入包的装备。<br><br>达成目标后，点击【领取】获得金币。点击【放弃】会清除该委托进度。领取或放弃后会换上新委托。已接受的委托没有期限。",
    },
    'help.tavern.fame.title': {
        ko: "카드 등급과 의뢰 레벨",
        en: "Card grade and Commission level",
        zh: '卡牌稀有度与委托等级',
    },
    'help.tavern.fame.body': {
        ko: "카드 등급은 일반·매직·레어로 나뉩니다. 등급이 높을수록 목표 수와 골드가 커지고, 목표 수 대비 골드도 더 많습니다.<br><br>의뢰 레벨은 연구소 수색 줄의 [의뢰] 지점에서 확인하고 올립니다. 보상을 정해진 횟수만큼 수령하면 다음 레벨을 연구할 수 있습니다. 연구를 마치면 아직 수락하지 않은 카드가 새 레벨로 갱신되며 목표 수와 골드가 올라갑니다. 받아 둔 의뢰의 목표와 진행도는 유지됩니다.",
        en: "Each card is Normal, Magic or Rare. Higher grades increase the target count, total gold and gold per target.<br><br>Check and raise Commission Level at the [Commissions] node on the Laboratory's Search line. Claim the required number of rewards to research the next level. Finishing the research refreshes unaccepted cards at the new level with higher targets and gold rewards. Active commissions keep their objectives and progress.",
        zh: "委托卡分为普通、魔法和稀有。品质越高，目标数量、金币总额及每个目标对应的金币越多。<br><br>可在研究所搜寻线的【委托】节点查看并提升委托等级。领取指定次数的奖励后即可研究下一等级。研究完成后，未接受的卡会按新等级刷新，目标数量和金币奖励都会提高。已接受委托的目标和进度会保留。",
    },
    'help.tavern.gambling.title': {
        ko: "도박장 슬롯",
        en: "Gambling Den slots",
        zh: '赌坊老虎机',
    },
    'help.tavern.gambling.body': {
        ko: "선술집의 도박장을 열고 판돈 단계를 골라 골드를 걸고 돌립니다. 횟수 제한은 없지만 매 판 판돈을 지불합니다. 판돈은 진행 챕터와 선택 단계에 따라 바뀝니다. <b>{batch}판 돌리기</b>는 판돈이 모자라면 도중에 멈춥니다.<br><br>가로·대각선 <b>{lines}줄</b>에서 같은 심볼 셋이 골드나 재료를 줍니다. 와일드는 다른 심볼을 대신하고, 코인은 일반 라인을 끊습니다. <b>코인 {trigger}개 이상</b>이면 홀드 앤 스핀이 시작됩니다. 코인은 제자리에 붙고, 새 코인이 나올 때마다 남은 횟수가 <b>{respins}회</b>로 돌아갑니다. 판을 다 채우면 그랜드 보상을 받습니다.<br><br>받는 것은 골드와 표시된 재료이며 장비·낙인은 나오지 않습니다. 도박장을 열면 제공되는 판돈 단계를 모두 고를 수 있습니다. 연구소의 <b>도박장 줄</b>은 자동으로 골드를 버는 별도 기능입니다.",
        en: "Open the Tavern's Gambling Den, choose a stake tier and spend gold to spin. There is no spin limit, but each spin costs a stake. Stakes follow your progress chapter and chosen tier. <b>Spin ×{batch}</b> stops early if you cannot afford the next stake.<br><br>Three matching symbols on any of <b>{lines} rows or diagonals</b> pay gold or materials. Wilds substitute for other symbols; coins break ordinary lines. At least <b>{trigger} coins</b> starts Hold & Spin. Coins stick in place, and each new coin resets remaining spins to <b>{respins}</b>. Fill the board for the Grand reward.<br><br>Prizes are gold and the shown materials, with no equipment or stigma. Every provided stake tier is available when the hall opens. The Laboratory's <b>Gambling Den line</b> is a separate source of automatic gold income.",
        zh: '打开酒馆的赌坊，选择赌注档位，押上金币后旋转。没有次数限制，但每次旋转都要支付赌注。赌注随你推进到的章和所选档位而变化。<b>连转{batch}次</b>在赌注不足时会中途停止。<br><br>横向和对角线共<b>{lines}条线</b>上出现三个相同图案时，给予金币或材料。百搭可以替代其他图案，硬币会打断普通连线。出现<b>{trigger}个以上硬币</b>时开始锁定重转。硬币固定在原位，每出现一枚新硬币，剩余次数都会重置为<b>{respins}次</b>。填满整个盘面即可获得巨奖。<br><br>获得的是金币和所示材料，不会出现装备和烙印。打开赌坊后，所有提供的赌注档位都可以选择。研究所的<b>赌坊线</b>是自动赚取金币的另一项功能。',
    },
    'help.shop.buy.title': {
        ko: "비교한 뒤 구매하기",
        en: "Compare, then buy",
        zh: '比较后再购买',
    },
    'help.shop.buy.body': {
        ko: "위쪽 영웅 띠에서 비교할 영웅을 고릅니다. 장비 상품에 마우스를 올리면 그 영웅의 착용품과 비교할 수 있습니다. 장비는 레벨이나 등급뿐 아니라 필요한 옵션·스킬·파티 전술과 맞는지도 확인합니다.<br><br>장비 상품을 선택하고 아래 <b>[구매]</b>를 누르면 <b>현재 보고 있는 부대 인벤토리</b>로 들어갑니다. 자동으로 장착되지는 않습니다. 장비 구매에는 골드와 빈 인벤토리 칸이 필요합니다.<br><br><b>스킬북은 책 재고에, 물약은 공동 물약 재고에</b> 쌓입니다. 장비 인벤토리 칸을 차지하지 않으므로 장비 칸이 가득 차 있어도 살 수 있습니다.<br><br>장비와 스킬북은 목록의 한 칸마다 한 번 살 수 있습니다. 팔린 칸은 <b>[교체]</b>까지 그대로 남습니다.<br><br>상단 화면에서 아래 인벤토리·창고의 장비를 누르면 장착 대신 <b>판매 목록</b>에 오릅니다. 다시 누르면 선택을 풀고, <b>[판매]</b>를 눌러야 장비가 사라지고 골드를 받습니다. 판매가는 <b>같은 레벨·등급 상점가의 1/3</b>이며 소수점은 버립니다. 잠근 장비와 미개봉 상자는 팔 수 없습니다. 재료가 필요하면 인벤토리의 <b>[분해]</b>를 사용합니다.<br><br>자물쇠 칸은 아직 팔지 않는 상품입니다. 처음 지은 상단은 맨 윗줄의 무기·물약만 팔고, 건설에서 상단 랭크를 올리면 방어구·장신구·스킬북 줄이 열립니다.",
        en: "Choose a comparison hero in the top strip. Hover an equipment item to compare it with that hero's worn item. Alongside level and rarity, check whether its options suit the skills and Party tactics you use.<br><br>Select an equipment item, then press <b>Buy</b> below. It enters the <b>party inventory you are viewing</b> and is not equipped automatically. Buying equipment requires enough gold and a free inventory slot.<br><br><b>Skill books enter book stock, and potions enter shared potion stock.</b> Neither occupies equipment slots, so a full equipment inventory does not block these purchases.<br><br>Each equipment or skill-book slot can be bought once per list. Sold slots remain until <b>Refresh</b>.<br><br>In the Shop, clicking equipment in the inventory or stash below adds it to the <b>sale list</b>. Click it again to deselect it. Only pressing <b>Sell</b> removes the equipment and credits gold. Sale prices are <b>one third of the shop price for the same level and rarity</b>, rounded down. Locked equipment and unopened boxes cannot be sold. Use <b>Salvage</b> in the inventory when you need materials.<br><br>Locked slots are goods not yet on sale. A newly built Trading House sells only the top row of weapons and potions; upgrade it in Construction to open the armor, jewelry and skill-book rows.",
        zh: '在上方的英雄栏中选择要比较的英雄。把鼠标移到装备商品上，就能与该英雄身上的装备比较。装备不只看等级或稀有度，还要确认是否符合所需的词条、技能和队伍战术。<br><br>选中装备商品后点击下方<b>[购买]</b>，装备会进入<b>当前查看的小队背包</b>，不会自动装备。购买装备需要金币和背包空格。<br><br><b>技能书进入书籍库存，药水进入共用药水库存</b>。它们不占背包的装备格，所以装备格已满时也能购买。<br><br>装备和技能书在列表中每格只能购买一次。售出的格子会保留到<b>[刷新]</b>为止。<br><br>在商会画面点击下方背包或仓库中的装备，不会装备，而是加入<b>出售列表</b>。再次点击会取消选择，必须点击<b>[出售]</b>，装备才会消失并获得金币。出售价格为<b>同等级、同稀有度商店价格的1/3</b>，小数部分舍去。锁定的装备和未开启的宝箱无法出售。需要材料时，使用背包中的<b>[分解]</b>。<br><br>带锁的格子是尚未开售的商品。刚建成的商会只出售最上面一行的武器和药水，在建设中提升商会的阶后，会开放防具、饰品、技能书这几行。',
    },
    'help.shop.restock.title': {
        ko: "교체 전에 영웅 레벨 확인",
        en: "Check the hero level before refreshing",
        zh: '刷新前先确认英雄等级',
    },
    'help.shop.restock.body': {
        ko: "<b>[교체]</b>는 선택한 영웅의 <b>현재 레벨</b>을 기준으로 장비 목록을 다시 만듭니다. 영웅만 바꾸거나 레벨이 올라도 기존 상품은 바뀌지 않습니다. 상품은 기준보다 높거나 낮은 레벨로 나올 수 있으며, 고른 영웅의 직업에 맞는 무기만 나오는 것은 아닙니다.<br><br>교체는 항상 무료입니다. 교체 뒤 <b>{refresh}시간</b>이 지나야 다시 교체할 수 있으며, 대기 중에는 버튼이 비활성화되고 남은 시간이 표시됩니다. 대기 시간은 오프라인에도 흐릅니다.<br><br>교체는 장비와 스킬북 목록을 함께 바꾸고 팔린 칸도 새로 채웁니다. 남겨 둔 상품도 사라지므로 구매할 물건을 확인한 뒤 교체합니다. 시간 경과나 특수상인 방문이 일반 목록을 자동으로 바꾸지는 않습니다.",
        en: "<b>Refresh</b> regenerates gear around the selected hero's <b>current level</b>. Selecting another hero or leveling up does not change existing goods. Products may roll above or below the target level, and weapons are not restricted to that hero's class.<br><br>Refreshing is always free. After each refresh, wait <b>{refresh}h</b> before refreshing again. The button is disabled during the cooldown and shows the remaining time beside it. The cooldown continues offline.<br><br>Refreshing changes both gear and skill books and refills sold slots. Unsold goods also disappear, so check intended purchases first. Time and special-trader visits never refresh the ordinary list automatically.",
        zh: '<b>[刷新]</b>以所选英雄的<b>当前等级</b>为基准重新生成装备列表。只更换英雄或英雄升级，现有商品都不会改变。商品可能高于或低于基准等级，也并非只出现适合所选英雄职业的武器。<br><br>刷新始终免费。刷新后需经过<b>{refresh}小时</b>才能再次刷新，等待期间按钮不可用，并显示剩余时间。等待时间在离线时也会流逝。<br><br>刷新会同时更换装备和技能书列表，售出的格子也会重新补满。留着没买的商品也会消失，所以先确认要买的东西再刷新。时间流逝或行商来访都不会自动更换普通列表。',
    },
    'help.shop.consumables.title': {
        ko: "물약을 여러 개 사기",
        en: "Buying potions in batches",
        zh: '批量购买药水',
    },
    'help.shop.consumables.body': {
        ko: "물약과 수량을 고른 뒤 총가격을 확인하고 [구매]합니다. 구매한 물약은 공용 재고에 들어갑니다. 편성의 [보유 물약]에서 전투에 가져갈 물약과 순서를 정합니다.<br><br>상점에서는 골드로 물약을 삽니다. 연구소 대장간 줄에서 만들 때는 골드와 약초를 씁니다.",
        en: "Select a potion and quantity, check the total, then select [Buy]. Purchased potions enter shared stock. Use [In Stock] in Party to choose which potions to take and in what order.<br><br>Buy potions in the Shop with gold, or make them with gold and herbs on the Laboratory's Blacksmith line.",
        zh: "选择药水和数量，确认总价后点击【购买】。买来的药水进入共用库存。在编队的【持有药水】中选择带入战斗的药水及顺序。<br><br>可在商店花金币购买药水，也可在研究所的铁匠铺线用金币和草药制作。",
    },
    'help.shop.books.title': {
        ko: "스킬북을 샀다면",
        en: "After buying a skill book",
        zh: '买了技能书之后',
    },
    'help.shop.books.body': {
        ko: "상단 3랭크에서 스킬북 판매가 열립니다. 일반 상단에서는 1티어 직업 스킬북을 살 수 있고, 사들인 책은 도서관의 [보유 스킬북]에서 확인합니다. 영웅을 고른 뒤 도서관 위쪽 [스킬정보]에서 배우거나 업그레이드합니다. 다른 스킬북의 획득처는 스킬 도감에서 확인합니다.",
        en: "Trading House rank 3 unlocks skill-book sales. The regular Shop sells Tier 1 class skill books. Purchased books appear in [Owned Skill Books] in the Library. Select a hero and use [Skill Info] at the top to learn or upgrade a skill. Check the Skill Codex for sources of other books.",
        zh: "商会升到 3 阶后可购买技能书。普通商店出售一阶职业技能书，买到的书可在图书馆的【持有的技能书】中查看。选择英雄后，在顶部【技能信息】中学习或升级技能。其他技能书的来源可查阅技能图鉴。",
    },
    'help.shop.trade.title': {
        ko: '재료 또는 골드로 구매하기',
        en: 'Buy with materials or gold',
        zh: '用材料或金币购买',
    },
    'help.shop.trade.body': {
        ko: '건설에서 <b>상단 2랭크</b>를 올리면 교역소가 열립니다. 재료 칸 아래에 한 번 구매의 골드 가격이 적혀 있습니다. <b>받을 최하급 재료</b>를 누르면 아래 다섯 칸에 재료별 필요 수·보유량과 골드 가격이 나타납니다. 낼 칸을 고르고 오른쪽 <b>[구매]</b>를 누르면 선택한 재료 {receive}개를 받습니다.<br><br>철광석·약초·목재·가루의 최하급끼리 교환합니다. 어느 재료로 내든 값은 같습니다. 선택만으로는 재료가 소모되지 않으며, 지불할 재료가 부족하면 구매할 수 없습니다. 재료로 지불할 때는 골드가 들지 않습니다. 골드 구매는 골드만 소모합니다. 약초는 재료로도 골드로도 더 비쌉니다. 재고 제한은 없습니다.<br><br>{hours}시간마다 재료 하나를 무작위로 골라 싸게 팝니다. 위 단계 재료는 대장간의 합성으로 만듭니다.<br><br>상단 3랭크는 방어구·장신구·스킬북 판매 줄을 엽니다.',
        en: 'Build <b>Trading House rank 2</b> to open the Trading Post. The gold price of one purchase is shown under each material. Select the <b>lowest-grade material to receive</b> to see the required and owned amounts in the five payment slots below. Pick what to pay with, then press <b>Buy</b> on the right to receive {receive} of your selection.<br><br>Trade lowest-grade iron ore, herbs, timber and dust. The price is the same whichever material you pay with. Selecting a material spends nothing. Choose a material payment or gold. Only the selected currency is spent, and you must have enough of it. Herbs cost more in both materials and gold. There is no stock limit.<br><br>Every {hours} hours, one random material goes on sale. Make higher grades by combining materials at the Smithy.<br><br>Trading House rank 3 opens armor, jewelry and skill-book sales.',
        zh: '在建设中将<b>商会提升到2阶</b>后开放交易所。每种材料下方标有一次购买的金币价格。点击<b>要获得的最低级材料</b>，下方五个格子会显示各支付材料的所需数量、持有量以及金币价格。选择要支付的格子后点击右侧的<b>[购买]</b>，即可获得{receive}个所选材料。<br><br>铁矿石、草药、木材、粉尘的最低级之间可以互换。无论用哪种材料支付，价格都相同。仅选择不会消耗材料，支付材料不足时无法购买。用材料支付时不花金币。用金币购买只消耗金币。草药无论用材料还是金币都更贵。没有库存限制。<br><br>每{hours}小时会随机选一种材料降价出售。更高级别的材料在铁匠铺通过合成制作。<br><br>商会3阶会开放防具、饰品、技能书的出售行。',
    },
    'help.shop.special.title': {
        ko: "특수상단은 별도 방문입니다",
        en: "Special visits are separate",
        zh: '行商另行来访',
    },
    'help.shop.special.body': {
        ko: "건설에서 상단의 해당 랭크를 올리면 <b>특수상단 방문</b> 기능이 열립니다. 패널에서 도착·출발까지의 남은 시간을 볼 수 있습니다. 이 시계는 일반 상단의 <b>[교체]</b> 무료 대기와 별개입니다.<br><br>현재 특수상단 상품은 <b>준비 중</b>입니다. 물음표 칸에서는 구매할 수 없습니다. 일반 장비·물약·스킬북은 왼쪽 일반 상단에서 구매합니다.",
        en: "Upgrading the Trading House to the required rank opens <b>special-trader visits</b>. Its panel shows the time until arrival or departure. This timer is separate from the ordinary Trading House's free <b>Refresh</b> wait.<br><br>Special-trader goods are currently <b>coming later</b>. Question-mark slots cannot be purchased. Buy ordinary gear, potions and skill books from the regular Trading House on the left.",
        zh: '在建设中将商会提升到相应的阶后，会开放<b>行商来访</b>功能。面板上可查看距离到达或离开的剩余时间。这个计时与普通商会<b>[刷新]</b>的免费等待时间无关。<br><br>行商商品目前<b>准备中</b>。问号格无法购买。普通装备、药水、技能书请在左侧的普通商会购买。',
    },
    // 2026-11-24 — 장비 · 물약 제작이 연구소 대장간 줄로 옮겨 세 주제의 문장을 고쳤다(R574 · ADR-1374)
    'help.forge.overview.title': {
        ko: "강화 · 인챈트 · 합성의 차이",
        en: "Upgrades, enchants and combining",
        zh: '强化、附魔与合成的区别',
    },
    'help.forge.overview.body': {
        ko: "대장간에서는 장비를 골라 [강화]하거나 [인챈트]하고, [합성]에서 재료의 단계를 올립니다. 강화는 무기 피해나 방어력을 올리고, 인챈트는 전용 옵션을 추가하거나 바꿉니다.<br><br>새 장비와 물약을 만들려면 대장간 2랭크에서 열리는 연구소 대장간 줄에 영웅을 등록합니다.",
        en: "Select gear at the Blacksmith to [Upgrade] or [Enchant] it. Use [Combine] to make higher-grade materials. Upgrading improves weapon damage or armor defense. Enchanting adds or replaces an enchantment option.<br><br>To make new gear and potions, assign a hero to the Laboratory's Blacksmith line, which opens at Blacksmith rank 2.",
        zh: "在铁匠铺选中装备后可【强化】或【附魔】，在【合成】中可提升材料品阶。强化提高武器伤害或护甲防御，附魔则添加或更换附魔词条。<br><br>要制作新装备和药水，请向铁匠铺 2 阶开启的研究所铁匠铺线派驻英雄。",
    },
    'help.forge.smith.title': {
        ko: "새 장비는 연구소 대장간 줄에서",
        en: "Crafting gear on the Laboratory’s Blacksmith line",
        zh: '在研究所铁匠铺线制作新装备',
    },
    'help.forge.smith.body': {
        ko: "연구소의 <b>대장간 줄</b>에 영웅을 등록하고, 등록 창에서 영웅마다 <b>무엇을 만들지</b>(장비 부위 일곱 또는 열린 물약 단계)를 고릅니다. 고르는 즉시 그 영웅의 시계가 돌고 정해진 시간마다 하나씩 만듭니다.<br><br>장비는 <b>그 영웅의 레벨</b>로 나오며 드롭과 같이 베이스·희귀도·옵션을 전부 새로 정합니다. 비용(골드·부위 재료·가루)은 하나가 완성되는 순간 냅니다. 모자라면 그 영웅은 쉬다가 비용이 생기면 다시 만듭니다.<br><br>만든 장비는 <b>줄 공용 장비 칸</b>에 쌓입니다. 칸이 가득 차면 장비를 만드는 시계가 모두 쉬므로, 등록 창의 장비 칸에서 <b>[창고로]</b> 옮기거나 <b>[분해]</b>합니다. 게임을 끈 동안에도 칸이 찰 때까지 만듭니다.",
        en: "Assign heroes to the <b>Blacksmith line</b> in the Laboratory, then pick <b>what each hero makes</b> (one of seven gear slots or an unlocked potion tier) in the assignment window. The hero's clock starts at once and makes one item per interval.<br><br>Gear comes out at <b>that hero's level</b> and rolls base, rarity and options like a drop. The cost (gold, slot material and dust) is paid when an item is finished. If you cannot pay, the hero waits and resumes once you can.<br><br>Finished gear goes into the line's <b>shared gear slots</b>. When they are full, every gear clock pauses, so use <b>To Stash</b> or <b>Salvage</b> in the assignment window. Gear keeps being made while the game is closed until the slots fill.",
        zh: '向研究所的<b>铁匠铺线</b>派驻英雄，然后在派驻窗口为每名英雄选择<b>要制作的物品</b>，可选七个装备部位之一或已解锁级别的药水。选好后立即开始计时，此后每隔一段时间制成一件。<br><br>装备的物品等级等于<b>制作英雄的等级</b>，基底、稀有度和词条与掉落装备一样随机生成。每件装备完成时才扣除金币、对应部位的材料和粉尘。费用不足时，英雄会暂停制作，等资源充足后继续。<br><br>制成的装备会放入<b>该产线共用的装备栏位</b>。栏位满后，所有装备制作都会暂停。请在派驻窗口选择<b>【移入仓库】</b>或<b>【分解】</b>腾出空间。关闭游戏后也会继续制作，直到栏位填满。',
    },
    'help.forge.potions.title': {
        ko: "물약 만들기와 재고",
        en: "Brewing and stocking potions",
        zh: '制作药水与管理库存',
    },
    'help.forge.potions.body': {
        ko: "물약도 연구소 <b>대장간 줄</b>이 만듭니다. 등록 창에서 영웅의 목표로 물약을 고르면 정해진 시간마다 하나씩 재고에 들어오고, 비용은 골드와 약초입니다. 상점에서도 살 수 있습니다.<br><br>만들 수 있는 물약 단계는 대장간 랭크와 연구소 「물약」 지점이 엽니다. 재고는 여러 Party가 함께 쓰며, 편성에서 물약 칸을 채워도 그때 바로 소모되지는 않습니다. 전투에서 마신 만큼 줄어드므로 자동 원정을 계속할 때는 재고를 확인합니다. 물약 종류·순서·사용 HP 기준은 편성 탭에서 정합니다.",
        en: "Potions are also made by the <b>Blacksmith line</b> in the Laboratory. Pick a potion as a hero's target in the assignment window and one enters your stock per interval, costing gold and herbs. Shops also sell potions.<br><br>The Blacksmith rank and the Laboratory's Potion node unlock brewable tiers. All Parties share stock. Filling preset slots does not spend it immediately; drinking in combat does. Check supplies when running repeated expeditions. Set potion types, order and drinking HP threshold in Party.",
        zh: '药水也由研究所的<b>铁匠铺线</b>制作。在派驻窗口为英雄选择一种药水，之后每隔一段时间就会消耗金币和草药，制成一瓶并放入库存。也可直接在商店购买药水。<br><br>铁匠铺的阶数和研究所的「药水」节点决定可制作的药水级别。所有编队共用库存，在编队页配置药水时不会扣除，战斗中喝下才会消耗。连续远征时请留意库存。在编队页可以设置药水种类、使用顺序和触发喝药的生命值阈值。',
    },
    'help.forge.upgrade.title': {
        ko: "가진 장비 강화",
        en: "Upgrading owned gear",
        zh: '强化已有装备',
    },
    'help.forge.upgrade.body': {
        ko: "착용 장비나 인벤토리·창고의 장비를 눌러 강화 대상을 고릅니다. [강화]에서 다음 단계의 효과·성공 확률·비용을 확인합니다. 무기와 방어구를 강화할 수 있습니다. 더 높은 강화 단계는 연구소 대장간 줄의 [강화] 지점에서 엽니다.<br><br>성공하면 한 단계 오르고, 대성공이면 더 오릅니다. 실패해도 골드와 재료가 소모됩니다. 높은 단계에서는 강등되거나 파괴될 수 있으며, 파괴된 장비는 분해 재료를 남깁니다. 다음 시도의 결과별 확률은 강화 화면에서 확인합니다.",
        en: "Select worn gear or gear in the inventory or stash to upgrade. [Upgrade] shows the effect, odds and cost of the next attempt. Weapons and armor can be upgraded. Research the [Upgrade] node on the Laboratory's Blacksmith line to raise the cap.<br><br>A success adds one upgrade level and a great success adds more. A failed attempt still spends gold and materials. At higher levels the gear can downgrade or break. Broken gear leaves salvage materials. The Upgrade screen shows the odds for the next attempt.",
        zh: "点击已穿戴的装备，或背包、仓库里的装备来选定强化目标。可在【强化】中查看下一次尝试的效果、概率与费用。武器和护甲可强化。研究所铁匠铺线的【强化】节点可提高上限。<br><br>成功时提升一阶，大成功时额外提升。失败也会消耗金币和材料。高阶时装备可能降级或损毁，损毁会留下分解材料。下次尝试的各项概率可在强化界面查看。",
    },
    'help.forge.temper.title': {
        ko: "담금질",
        en: "Quench",
        zh: "淬火",
    },
    'help.forge.temper.body': {
        ko: "대장간 4랭크에서 [강화] 화면의 담금질을 사용할 수 있습니다. [달구기]는 강화 성공 확률, [덧대기]는 대성공 확률을 높입니다. [막기]는 강등이나 파괴 결과를 막을 확률을 높입니다. 담금질 효과는 바로 다음 강화 시도에서 소모됩니다.",
        en: "Blacksmith rank 4 opens Quench on the [Upgrade] screen. [Heat] raises the success chance, [Reinforce] raises the great success chance, and [Guard] gives a chance to prevent a downgrade or break. The next upgrade attempt consumes the quench effect.",
        zh: "铁匠铺升到 4 阶后可在【强化】界面淬火。【加热】提高强化成功率，【加固】提高大成功率，【防护】有机会阻止降级或损毁。淬火效果会在下一次强化尝试中消耗。",
    },
    'help.forge.enchant.title': {
        ko: "장비 인챈트",
        en: "Gear enchanting",
        zh: "装备附魔",
    },
    'help.forge.enchant.body': {
        ko: "대장간 5랭크에서 [인챈트]가 열립니다. 레어 이상 장비를 고르고 골드와 가루를 내면 인챈트 옵션 한 줄이 붙습니다. 이미 인챈트한 장비에 다시 시도하면 [선택]으로 새 옵션을 적용하거나 [유지]로 기존 줄을 남깁니다. 연구소 대장간 줄의 [인챈트] 지점은 굴림의 최저 수치를 높입니다.",
        en: "Blacksmith rank 5 opens [Enchant]. Select Rare or higher gear and pay gold and dust to add an enchantment option. When enchanting the item again, select [Choose] to apply the new roll or [Keep] to retain the current line. The [Enchant] node on the Laboratory's Blacksmith line raises the minimum value an enchantment can roll.",
        zh: "铁匠铺升到 5 阶后开启【附魔】。选中稀有及以上装备并支付金币和粉尘，可添加一条附魔词条。再次附魔时，点击【选择】应用新词条，或点击【保留】留下原词条。研究所铁匠铺线的【附魔】节点可提高附魔数值的下限。",
    },
    'help.forge.combine.title': {
        ko: "재료를 한 단계 올리는 합성",
        en: "Combining the next material grade",
        zh: '将材料提升一级的合成',
    },
    'help.forge.combine.body': {
        ko: "대장간 3랭크에서 [합성]이 열립니다. 같은 재료의 바로 아래 단계와 골드를 써서 한 단계 높은 재료를 만듭니다. 철광석·약초·목재·가루를 합성할 수 있습니다. 예를 들어 최하급 철광석을 모아 하급 철광석을 만듭니다.<br><br>[합성]으로 한 개를, [최대]로 현재 재고와 골드로 만들 수 있는 최대 수량을 만듭니다. 결과는 즉시 들어옵니다. 담금질에 필요한 재료 단계는 장비를 고른 뒤 비용에서 확인합니다.",
        en: "Blacksmith rank 3 opens [Combine]. Use gold and the immediately lower grade of iron ore, herbs, timber or dust to make the next grade of that material. For example, combine lowest-grade iron ore into low-grade iron ore.<br><br>[Combine] makes one, and [Max] makes as many as your current stock and gold allow. The result arrives immediately. To see the material grade needed for a quench, select the gear and check its cost.",
        zh: "铁匠铺升到 3 阶后开启【合成】。消耗金币和低一阶的铁矿石、草药、木材或粉尘，可制作同种材料的下一品阶。例如，可用最低级铁矿石合成低级铁矿石。<br><br>点击【合成】制作一个，点击【最大】按现有库存和金币制作尽可能多的数量。产物会立即到账。要查看淬火所需的材料品阶，请先选择装备，再查看费用。",
    },
    'help.forge.craft.title': {
        ko: "크래프트의 현재 상태",
        en: "Current Craft availability",
        zh: '打造的现状',
    },
    'help.forge.craft.body': {
        ko: "<b>[크래프트]</b>는 현재 준비 중입니다. 사용할 수 있는 작업은 <b>[강화] · [인챈트] · [합성]</b>입니다.",
        en: "<b>Craft</b> is not available yet. You can currently <b>Upgrade, Enchant or Combine</b>.",
        zh: '<b>【打造】</b>尚未开放。目前可以进行<b>【强化】、【附魔】和【合成】</b>。',
    },
    'help.library.basics.title': {
        ko: "스킬북 · 전직의 차이",
        en: "Books and advancement",
        zh: '技能书与转职的区别',
    },
    'help.library.basics.body': {
        ko: "<b>스킬북</b>은 영웅에게 읽혀 스킬을 배우거나 강화하는 소모품입니다. 흐름은 <b>책 획득 → 영웅 선택 → 배우기·업그레이드</b>입니다.<br><br><b>전직</b>은 영웅의 성장 갈래를 정하는 별도 기능입니다. 책으로 채우는 '배운 스킬' 칸과 전직으로 채우는 '전직 스킬' 칸은 서로 다릅니다. 전직한다고 기존 고유 스킬이나 책으로 배운 스킬이 사라지지는 않습니다.",
        en: "A <b>skill book</b> is consumed by a hero to learn or improve a skill. Follow <b>get a book → choose hero → learn or upgrade</b>.<br><br><b>Advancement</b> is a separate choice of growth path for a hero. The learned-skill slot filled by a book and the Advance-skill slot are different. Advancing does not remove the hero's innate or book-learned skill.",
        zh: '<b>技能书</b>是让英雄阅读，用来学习或强化技能的消耗品。流程是<b>获得书 → 选择英雄 → 学习或升级</b>。<br><br><b>转职</b>是决定英雄成长分支的另一项功能。用书填入的“习得技能”栏与通过转职填入的“转职技能”栏互不相同。转职不会让原有的固有技能或用书学会的技能消失。',
    },
    'help.library.sources.title': {
        ko: "스킬북 얻기와 분해",
        en: "Getting and salvaging books",
        zh: '获得与分解技能书',
    },
    'help.library.sources.body': {
        ko: "스킬북은 원정과 탐험, 연구소 도서관 줄, 상단 구매, 영웅의 첫 책 사용 레벨 보상에서 얻습니다. 몬스터별 획득처는 스킬 도감에서 확인합니다. 얻은 책은 공용 책 재고에 쌓입니다.<br><br>도서관 2랭크에서 열리는 연구소 도서관 줄에 영웅을 등록하면 스킬 조각을 생산합니다. 조각이 나올 때 [대박]이 터지면 그 영웅의 고유 또는 습득 스킬의 책도 나옵니다. 도서관 4랭크에서 [분해]를 사용할 수 있고, 책 한 권을 분해하면 스킬 조각 {shard}개를 얻습니다.",
        en: "Find skill books in Expeditions and Exploration, from the Laboratory's Library line, in the Shop, or as a reward when a hero first reaches the level for reading books. Check the Skill Codex for monster drop sources. Books go to shared book stock.<br><br>Assign heroes to the Laboratory's Library line, which opens at Library rank 2, to produce skill shards. A [Jackpot] on a shard payout also gives a book for that hero's innate or learned skill. Library rank 4 opens [Salvage], which gives {shard} skill shards per book.",
        zh: "可通过远征、探索、研究所图书馆线、商店购买，或英雄首次达到读书等级时的奖励获得技能书。各怪物的掉落来源可在技能图鉴查看。技能书进入共用库存。<br><br>图书馆升到 2 阶后，可向研究所的图书馆线派驻英雄来生产技能碎片。发放碎片时若触发【大奖】，还会获得该英雄的固有或已学技能书。图书馆 4 阶开启【分解】，每本书可分解为 {shard} 个技能碎片。",
    },
    'help.library.craft.title': {
        ko: "스킬 조각으로 스킬북 만들기",
        en: "Crafting books from skill shards",
        zh: '用技能碎片制作技能书',
    },
    'help.library.craft.body': {
        ko: "모든 <b>직업 스킬</b>의 책은 도서관 <b>[스킬 북 제작]</b>에서 만들 수 있습니다. 칸을 골라 비용을 확인하고 <b>[만들기]</b>를 누르면 그 책 한 권이 책 재고에 쌓입니다.<br><br>한 권에 1티어는 <b>스킬 조각 {shards}개</b>, 2티어는 <b>스킬 조각 {shards2}개</b>가 들고, 골드는 티어와 상관없이 <b>{gold}G</b>입니다. 몬스터 · 챕터 보스의 고유 스킬과 전직 스킬의 책은 만들 수 없습니다.",
        en: "Books for every <b>class skill</b> can be crafted in the Library's <b>Skill Book Crafting</b>. Select an icon, check the cost and press <b>Craft</b> to add one copy to your book stock.<br><br>A Tier 1 book costs <b>{shards} skill shards</b> and a Tier 2 book <b>{shards2} skill shards</b>; every book also costs <b>{gold}G</b>. Books of monster or chapter-boss innate skills and advancement skills cannot be crafted.",
        zh: '所有<b>职业技能</b>书都可以在图书馆的<b>[技能书制作]</b>中制作。选中格子、确认费用后点击<b>[制作]</b>，该书就会有一本进入书籍库存。<br><br>每本1阶需要<b>{shards}个技能碎片</b>，2阶需要<b>{shards2}个技能碎片</b>，金币与阶级无关，均为<b>{gold}G</b>。怪物、章节首领的固有技能书和转职技能书无法制作。',
    },
    'help.library.learn.title': {
        ko: "읽힐 영웅을 고르고 배우기",
        en: "Choose a hero, then learn",
        zh: '选择读书的英雄并学习',
    },
    'help.library.learn.body': {
        ko: "도서관에서 영웅을 고르고 [보유 스킬북]에서 읽힐 책을 선택합니다. 영웅 레벨 {level}부터 위쪽 [스킬정보]의 습득 줄에서 [배우기]를 누를 수 있습니다. 책 한 권을 써서 그 영웅의 습득 칸을 채웁니다.<br><br>이미 다른 스킬을 배웠다면 [덮어쓰기]로 교체합니다. 확인하면 이전 스킬과 그 업그레이드 단계가 사라집니다. 다른 직업의 책도 배울 수 있습니다. 전투에서 사용할 수 있는 무기는 각 스킬 설명에서 확인합니다.",
        en: "Choose a hero in the Library and select a book in [Owned Skill Books]. At hero level {level}, [Learn] becomes available in the learned skill row of [Skill Info]. Learning spends one book and fills that hero's learned slot.<br><br>If the hero already learned another skill, use [Overwrite] to replace it. Confirming removes the old learned skill and its upgrades. Heroes can learn books from other classes. Each skill description shows which weapon lets the hero use it in combat.",
        zh: "在图书馆选定英雄，再从【持有的技能书】中选择一本书。英雄达到 {level} 级后，可以在【技能信息】的已学技能栏点击【学习】。学习会消耗一本书，并填入该英雄的已学技能槽。<br><br>若英雄已学了另一技能，可用【覆盖】更换。确认后，旧的已学技能及其升级等级会消失。也可学习其他职业的技能书。技能说明会列出在战斗中使用该技能所需的武器。",
    },
    'help.library.upgrade.title': {
        ko: "같은 스킬북으로 레벨 올리기",
        en: "Using matching books to raise a skill level",
        zh: '用同名技能书提升等级',
    },
    'help.library.upgrade.body': {
        ko: "도서관 [스킬정보]의 고유·습득 줄에서 같은 스킬북을 써 [업그레이드]합니다. 필요한 책 수와 업그레이드 단계를 줄마다 확인할 수 있습니다. 고유 스킬의 업그레이드는 책을 갖추면 영웅 레벨과 관계없이 할 수 있습니다.<br><br>스킬 설명 아래 계산 줄에서 기본 수치, 능력치 보정, 쿨타임 등이 선택한 영웅에게 어떻게 적용되는지 확인합니다. 전직 스킬은 전직 마스터리에서 공용 스킬 포인트로 강화합니다.",
        en: "Use matching books to [Upgrade] an innate or learned skill in its [Skill Info] row in the Library. Each row shows its upgrade level and book cost. Innate skills can be upgraded at any hero level if you have the required books.<br><br>The calculations below the skill description show how base values, attributes and cooldowns apply to the selected hero. Improve advancement skills with shared skill points in Advancement Mastery.",
        zh: "在图书馆【技能信息】的固有或已学技能栏中，使用相同的技能书点击【升级】。每一栏会显示升级等级及所需书本。备齐所需技能书后，固有技能可在任意英雄等级升级。<br><br>技能说明下方的计算栏会显示基础数值、属性修正和冷却时间如何作用于当前英雄。转职技能在转职专精中用共用技能点强化。",
    },
    'help.library.advance.title': {
        ko: "전직 갈래는 신중히 선택",
        en: "Choosing an advancement path",
        zh: '谨慎选择转职分支',
    },
    'help.library.advance.body': {
        ko: "도서관에서 영웅을 고르고 [전직의 방]의 [입장]을 누릅니다. 갈래를 고르면 마스터리와 전직 스킬을 미리 볼 수 있습니다. 도서관 5랭크에서 기능을 열고 영웅이 레벨 {level}에 도달하면, 원하는 갈래를 골라 {gold}G를 내고 [전직]합니다. 정한 갈래는 이후 바꿀 수 없습니다.<br><br>전직을 마치면 [마스터리 열기]에서 그 갈래의 스킬을 골라 배웁니다. 같은 갈래 안에서는 전직 스킬을 교체할 수 있습니다. 원정 중에는 전직할 수 있고, 탐험 중인 영웅은 귀환 후 전직할 수 있습니다.",
        en: "Select a hero in the Library and use [Enter] on the Chamber of Advancement. Select a path to preview its mastery and skills. Once the Library reaches rank 5 and the hero reaches level {level}, choose a path and pay {gold}G to [Advance]. The chosen path is permanent.<br><br>After advancing, use [Open Mastery] to select a skill in that path. You can swap skills within the chosen path. Heroes can advance during an Expedition. Heroes who are exploring can advance after returning.",
        zh: "在图书馆选择英雄，并在转职房间点击【进入】。选择分支可预览其专精与转职技能。图书馆升到 5 阶且英雄达到 {level} 级后，选定分支并支付 {gold} 金币即可【转职】。已选分支以后无法更换。<br><br>转职后，从【打开专精】中选择该分支的技能来学习。同一分支内可以更换转职技能。远征中的英雄可以转职，探索中的英雄需归队后再转职。",
    },
    'help.library.points.title': { ko: "공용 스킬 포인트와 전직 트리", en: "Shared skill points and the Advancement Tree", zh: '共用技能点与转职树' },
    'help.library.points.body': { ko: "영웅은 <b>레벨 1 부터 레벨마다 스킬 포인트</b>를 받습니다. 죄종·직업 마스터리와 전직 트리는 같은 포인트를 나누어 씁니다.<br><br>전직하면 갈래의 전직 스킬 셋 중 <b>하나</b>를 배웁니다 — 스킬 포인트를 쓰지 않습니다. 전직 트리에는 줄이 둘 있습니다. <b>공통 줄</b>은 갈래 전체에 닿고, <b>스킬 줄</b>(크기 · 변형 1 · 변형 2)은 배운 스킬에 닿습니다. 줄마다 칸 셋에 합 <b>{row}</b>까지 자유롭게 나눠 찍고, 한 칸에 {row}을 모두 넣으면 그 칸의 덤이 켜집니다.<br><br>칸을 우클릭하면 1랭크가, 배운 전직 스킬을 우클릭하면 스킬 줄 전체가 <b>공용 스킬 포인트로 환급</b>됩니다. 다른 전직 스킬을 누르면 바로 갈아끼웁니다 — 스킬 줄은 환급되고 공통 줄은 그대로입니다. 갈래와 전직 비용은 그대로입니다.", en: "Heroes earn <b>skill points at every level, starting at Lv1</b>. Sin mastery, Class mastery and the Advancement Tree share this pool.<br><br>After advancing, learn <b>one</b> of the path's three skills — it costs no skill points. The tree has two rows. The <b>common row</b> affects the whole path; the <b>skill row</b> (Power · Variant 1 · Variant 2) affects the learned skill. Split up to <b>{row}</b> ranks per row freely across its three cells; putting all {row} into one cell turns on its bonus.<br><br>Right-click a cell to refund one rank, or the learned skill to refund its whole skill row to the <b>shared skill-point pool</b>. Click another advancement skill to swap to it — the skill row is refunded and the common row stays. The chosen path and gold cost remain.", zh: '英雄<b>从1级起每升一级都会获得技能点</b>。罪宗专精、职业专精与转职树共用同一批技能点。<br><br>转职后学会该分支三个转职技能中的<b>一个</b>——不消耗技能点。转职树有两行。<b>通用行</b>作用于整个分支，<b>技能行</b>（威力、变体1、变体2）作用于学会的技能。每行三格合计最多<b>{row}</b>，可自由分配；一格投满{row}时，该格的额外效果就会启用。<br><br>右键点击格子会把1阶返还为<b>共用技能点</b>；右键点击已学会的转职技能，则返还整条技能行。点击其他转职技能会立即替换——技能行返还，通用行保持不变。分支和转职费用保持不变。' },
    'help.resource.lines.title': {
        ko: "줄 · 지점 · 랭크의 차이",
        en: "Lines, nodes and ranks",
        zh: '线、节点、阶的区别',
    },
    'help.resource.lines.body': {
        ko: "연구소에는 자원·수색·훈련·도박장·도서관·대장간 줄이 있습니다. 줄 카드를 누르면 생산과 등록 효과를, 동그란 지점을 누르면 현재 효과와 다음 레벨의 비용·시간을 볼 수 있습니다.<br><br>각 줄은 필요한 건물을 지은 뒤 영웅을 등록하면 가동됩니다. 줄 카드의 빈 등록 칸에서 영웅을 고르고 [적용]합니다. 연구소 랭크를 올리면 새 지점과 더 높은 지점 레벨이 열리며, 지점마다 자체 상한까지 올릴 수 있습니다.",
        en: "The Laboratory has Resources, Search, Training, Gambling Den, Library and Blacksmith lines. Select a line card to see its output and assignment bonuses. Select a round node to see its current effect and the cost and time of its next level.<br><br>Build the required facility and assign a hero to start a line. Use an empty assignment slot on the line card, choose a hero, and select [Apply]. Laboratory ranks unlock nodes and higher research levels, up to each node's own cap.",
        zh: "研究所包含资源、搜寻、训练、赌坊、图书馆和铁匠铺生产线。点击生产线卡片可查看产出与派驻加成。点击圆形节点可查看当前效果以及升到下一级的费用和时间。<br><br>建好所需设施并派驻英雄后，产线才会运行。点击产线卡片中的空派驻位，选择英雄并点击【应用】。提高研究所阶数可开放新节点和更高的研究等级，每个节点都有各自的上限。",
    },
    'help.resource.production.title': {
        ko: "자동 생산과 게임을 닫은 동안",
        en: "Automatic output and time away",
        zh: '自动生产与关闭游戏期间',
    },
    'help.resource.production.body': {
        ko: "창고를 지으면 연구소의 <b>자원 줄</b>이 열립니다. 영웅을 등록하면 <b>최하급 철광석·약초·목재를 모두</b> 생산합니다. 연구소의 모든 줄은 <b>등록한 영웅이 있어야</b> 돌고, 등록한 영웅이 많을수록 더 빨리 얻습니다.<br><br>자원 줄의 <b>채광·채집·벌목</b> 연구는 각각 철광석·약초·목재 생산량을 높입니다. 무기나 건물이 필요하면 철광석, 방어구나 건물이 필요하면 목재, 물약·책·약초 비용 연구가 필요하면 약초를 확인합니다. 생산물은 재고에 자동으로 더해집니다.<br><br>게임을 켜 둔 동안에는 계속 생산합니다. 오프라인 생산은 <b>기본 {hours}시간</b>까지 쌓입니다. 자원 줄의 <b>오프라인 생산 시간 연장</b>을 연구하면 철광석·약초·목재가 더 오래 쌓입니다. 수색의 도착 시계는 이 시간 상한을 받지 않고 대기소가 찰 때까지 흐르고, 대장간 줄의 장비는 장비 칸이 찰 때까지 만듭니다.",
        en: "Building Storage opens the Laboratory's <b>Resources line</b>. With heroes assigned it produces <b>lowest-grade iron ore, herbs and timber together</b>. Every Laboratory line <b>needs at least one assigned hero</b> to run, and more heroes produce faster.<br><br><b>Mining, Gathering and Logging</b> research raise ore, herb and timber output respectively. Check ore for weapons or buildings, timber for armor or buildings, and herbs for potions, books or research with an herb cost. Output enters stock automatically.<br><br>Production continues while the game is open. Offline output accumulates for <b>up to {hours}h by default</b>. Research <b>Offline Production Time</b> in Resources to extend the cap for ore, herbs and timber. The Search arrival timer has no such time cap and continues until its Waiting Room fills, and the Blacksmith line keeps making gear until its gear slots fill.",
        zh: '建造仓库后即可解锁研究所的<b>资源线</b>。派驻英雄后，可<b>同时生产最低级的铁矿石、草药和木材</b>。研究所的每条线都<b>至少要派驻一名英雄</b>才能运作，派驻的英雄越多，生产越快。<br><br>资源线的<b>采矿、采集和伐木</b>研究分别提高铁矿石、草药和木材的产量。制作武器或建造建筑时请留意铁矿石，制作护甲或建造建筑时留意木材，制作药水、技能书或进行消耗草药的研究时留意草药。产出会自动存入库存。<br><br>游戏开启时会持续生产。离线产出<b>默认最多累积 {hours} 小时</b>。在资源线研究<b>离线生产时长</b>，铁矿石、草药和木材就能累积更久。搜寻的到达计时不受这个上限影响，会持续到等候位满。铁匠铺线也会继续制作装备，直到装备栏位填满。',
    },
    'help.resource.materials.title': {
        ko: "재료는 어디서 얻고 어디에 쓰나요?",
        en: "Where materials come from and go",
        zh: '材料从哪里获得，用在哪里？',
    },
    'help.resource.materials.body': {
        ko: "연구소 자원 줄에서 최하급 철광석·목재·약초를 생산합니다. 장비를 분해하면 가루와 부위 재료가 나옵니다. 무기는 철광석, 방어구는 목재, 장신구는 약초를 줍니다. 창고의 [재료]에서 공용 재고를 확인합니다.<br><br>장비 제작에는 골드·가루·해당 부위 재료를 씁니다. 물약 제작과 재료를 요구하는 연구에는 약초가 쓰이고, 스킬북 제작에는 스킬 조각과 골드가 필요합니다. 교역소에서 최하급 재료를 사거나 교환하고, 대장간 [합성]에서 위 단계 재료를 만듭니다.",
        en: "The Laboratory's Resources line produces lowest-grade iron ore, timber and herbs. Salvaging gear gives dust and a slot material: iron ore for weapons, timber for armor, and herbs for jewelry. Check shared stock in the stash's [Materials] tab.<br><br>Gear crafting uses gold, dust and the slot material. Potion crafting and research that requires materials use herbs. Skill-book crafting uses skill shards and gold. Buy or trade lowest-grade materials at the Trade Post, and make higher grades with [Combine] at the Blacksmith.",
        zh: "研究所的资源线生产最低级铁矿石、木材和草药。分解装备会获得粉尘和部位材料：武器出铁矿石，护甲出木材，饰品出草药。共用库存可在仓库的【材料】页查看。<br><br>制作装备消耗金币、粉尘和对应的部位材料。制作药水和需要材料的研究会消耗草药。制作技能书使用技能碎片与金币。可在贸易站购买或交换最低级材料，并在铁匠铺通过【合成】制作更高品阶的材料。",
    },
    'help.resource.research.title': {
        ko: "연구 시작 · 완료 · 그만두기",
        en: "Starting, finishing and canceling research",
        zh: '研究的开始、完成与中止',
    },
    'help.resource.research.body': {
        ko: "지점을 고르고 <b>현재 → 다음 레벨의 값</b>을 비교합니다. 비용과 시간을 확인해 <b>[연구]</b>하면 골드와 표시된 재료를 먼저 지불합니다. 연구소 전체에서 <b>한 번에 하나</b>만 진행합니다.<br><br>연구는 게임을 닫아도 예정된 시각에 완료되며, 완료 뒤부터 새 효과가 적용됩니다. 다음 연구가 자동으로 예약되지는 않습니다. 진행 중인 생산은 연구 때문에 멈추지 않습니다.<br><br>완료 전 <b>[그만두기]</b>를 누르면 비용을 전부 돌려받고 그 연구의 진행도는 사라집니다. 이미 끝난 지점 레벨은 이 버튼으로 되돌리지 못합니다. 그 줄의 영웅 등록 효과를 먼저 갖추면 <b>연구 시작 시점</b>의 시간과 비용에 반영됩니다.",
        en: "Select a node and compare its <b>current and next-level values</b>. Check the cost and time, then press <b>Research</b> to pay gold and the listed materials up front. The entire Laboratory can run <b>one project at a time</b>.<br><br>Research finishes at its scheduled time even while the game is closed; its new effect applies after completion. No next project is queued automatically. Existing production continues during research.<br><br>Use <b>Cancel</b> before completion to recover the full cost and lose that project's progress. Completed levels cannot be refunded this way. Assigning heroes to that line first affects the cost and duration calculated <b>when research starts</b>.",
        zh: '选择节点，比较<b>当前 → 下一级的数值</b>。确认费用和时间后点击<b>[研究]</b>，会先支付金币和所示材料。整个研究所<b>同时只能进行一项</b>研究。<br><br>即使关闭游戏，研究也会在预定时间完成，完成后新效果开始生效。不会自动预约下一项研究。进行中的生产不会因研究而停止。<br><br>完成前点击<b>[中止]</b>会全额返还费用，该研究的进度清零。已完成的节点等级无法用这个按钮撤回。先把该线的英雄派驻效果准备好，就会反映到<b>研究开始时</b>的时间和费用上。',
    },
    'help.resource.assignment.title': {
        ko: "영웅 등록과 칸의 차이",
        en: "Hero assignment and the two slot types",
        zh: '英雄派驻与两种位置的区别',
    },
    'help.resource.assignment.body': {
        ko: "줄 카드의 영웅 얼굴이나 <b>+</b>를 누르면 등록 창이 열립니다. 그 줄에 둘 영웅을 고르고 <b>[적용]</b>을 누르면 바뀝니다. 다시 누르면 고르기가 풀리고, 다른 줄에 등록된 영웅을 고르면 이 줄로 이동합니다. 옮기거나 빼면 쌓인 숙련과 수색 시계가 처음부터 다시 시작되며, 창 아래에 빨간 글씨로 표시됩니다. <b>한 영웅은 한 줄</b>에만 등록할 수 있습니다.<br><br>연구소 등록은 영웅을 붙잡지 않습니다. 등록한 채로 Party에 넣거나 원정·탐험·전직을 진행할 수 있습니다. 다만 훈련 경험치는 <b>훈련 줄에 등록한 영웅</b>만 받습니다.<br><br><b>등록 칸</b>은 연구소 줄에 효과를 보탤 내 영웅의 자리이며, 모든 줄의 칸 수가 같습니다. <b>대기소</b>는 선술집에서 고용을 기다리는 후보의 자리입니다. 새 후보를 더 보관하려면 수색 줄의 대기소 지점을 연구해야 합니다.",
        en: "Select a line's hero portrait or <b>+</b> to open assignments. Select the heroes for this line and press <b>[Apply]</b>. Click again to deselect; selecting a hero assigned elsewhere moves them to this line. Moving or removing a hero restarts their Mastery and Search clock, shown in red at the bottom of the window. <b>Each hero can be assigned to only one line at a time</b>.<br><br>Assignment does not occupy the hero. They can stay assigned while joining a Party, fighting Expeditions, exploring or advancing. Training XP, however, goes only to <b>heroes assigned to Training</b>.<br><br><b>Seats</b> hold your heroes who boost a Laboratory line, and every line has the same number of seats. <b>Waiting Room</b> slots hold candidate heroes awaiting hire in the Tavern. To keep more arriving candidates, research the Waiting Room node on the Search line.",
        zh: '点击线卡片上的英雄头像或<b>+</b>会打开派驻窗口。选择要放在该线上的英雄，点击<b>[应用]</b>即可更改。再次点击会取消选择；选择派驻在其他线上的英雄，会把他移到这条线上。移动或撤下英雄时，累积的熟练和搜寻计时会从头开始，并在窗口下方以红字显示。<b>一名英雄只能派驻在一条线上</b>。<br><br>研究所派驻不会占用英雄。派驻状态下也可以编入Party，或进行远征、探索、转职。不过，只有<b>派驻在训练线上的英雄</b>才能获得训练经验。<br><br><b>派驻位</b>是为研究所的线提供效果的己方英雄的位置，所有线的位数相同。<b>等候所</b>是酒馆中等待雇佣的候选的位置。要保留更多新候选，需要研究搜寻线的等候所节点。',
    },
    'help.resource.hero_effects.title': {
        ko: "등록할 영웅을 고르는 기준",
        en: "Choosing heroes to assign",
        zh: '挑选派驻英雄的标准',
    },
    'help.resource.hero_effects.body': {
        ko: "자원·도박장 줄은 등록한 영웅 한 명마다 기본 산출 한 몫이 더해집니다. 수색·대장간은 영웅마다 따로 다음 도착이나 제작까지의 시간을 셉니다. 훈련 경험치는 등록한 영웅에게만 들어가며, 도서관은 스킬 조각과 스킬북을 공용 재고에 보탭니다.<br><br><b>운</b>은 대박 지점이 있는 줄의 추가 지급 확률을 높입니다. <b>지능</b>은 그 줄의 연구 시간을 줄이며, <b>민첩</b>은 연구 비용을 줄입니다. <b>매력</b>은 수색의 레어 후보 확률을 높입니다.<br><br><b>건강</b>은 같은 줄에 오래 등록할수록 쌓이는 숙련 보너스를 키웁니다. <b>통솔</b>은 같은 줄의 다른 등록 영웅 효과를 높이므로 여럿을 등록할 때 의미가 있습니다. 장비·레벨 대신 영웅의 기본 능력치가 이 효과의 재료입니다.<br><br>등록 효과의 현재 수치는 줄 카드를 눌러 확인합니다. 해당 효과를 사용하지 않는 줄에는 적용되지 않습니다. 영웅을 다른 줄로 옮기거나 등록을 풀면 그 영웅의 숙련 시간은 다시 시작하므로, 비교한 뒤 자리를 정합니다.",
        en: "Each assigned hero adds one share of base output on the Resources and Gambling Den lines. Search and Blacksmith track each hero’s next arrival or craft separately. Training XP goes to assigned heroes. The Library adds skill shards and books to shared stock.<br><br><b>Luck</b> raises extra-output chance on lines with a Jackpot node. <b>Intelligence</b> shortens that line's research time; <b>Agility</b> lowers research costs. <b>Charisma</b> raises Search's Rare-candidate chance.<br><br><b>Vitality</b> strengthens the proficiency bonus that builds while a hero remains assigned to the same line. <b>Leadership</b> boosts other assigned heroes on that line, so it matters with multiple heroes. These effects use the hero's base attributes rather than equipment or level.<br><br>Select the line card to check current hero bonuses. Effects do not apply to lines that have no use for them. Moving or removing a hero resets the time accumulated on that assignment, so compare heroes before settling their positions.",
        zh: "资源线和赌坊线每派驻一名英雄，就增加一份基础产出。搜寻线和铁匠铺线分别计算每名英雄下一次带回候选人或完成制作的时间。训练经验发给对应英雄，图书馆则将技能碎片和技能书加入共用库存。<br><br><b>幸运</b>提高有大奖节点的产线额外发放的概率。<b>智力</b>缩短该产线的研究时间，<b>敏捷</b>降低研究费用，<b>魅力</b>提高搜索带回稀有候选人的概率。<br><br><b>体质</b>提高长期派驻累积的熟练加成，<b>统率</b>提高同一产线其他派驻英雄的效果。这些效果取决于英雄的基础属性。<br><br>点击产线卡片可查看当前派驻效果。更换产线或解除派驻会重置该英雄的熟练时间。",
    },
    'help.resource.jobs.title': {
        ko: "수색 · 훈련 · 자동 골드",
        en: "Search, Training and automatic gold",
        zh: '搜寻、训练与自动金币',
    },
    'help.resource.jobs.body': {
        ko: "<b>수색</b>은 이 줄에 등록한 영웅마다 시간마다 한 명씩 선술집에 데려옵니다. 아무도 등록하지 않으면 돌지 않습니다. [간격]은 도착을 더 빠르게 합니다. 그 영웅 줄의 선술집 칸이 가득 차 있으면 그 영웅은 쉬다가 그 줄 칸을 비우는 즉시 다시 나갑니다. [품질]은 레어 후보 확률, [대기소]는 줄마다 둘째 칸과 거르기, [로스터]는 거느릴 수 있는 영웅 수를 늘립니다.<br><br><b>훈련</b> 줄에 등록한 영웅은 시간이 흐르면서 경험치를 받아 로스터의 선두 레벨을 따라갑니다. 상한은 <b>로스터 최고 레벨 − [범위]에 표시된 차이</b>입니다. 범위를 연구하면 그 차이가 줄어듭니다. 상한 이상인 영웅은 훈련 경험치를 받지 않으므로, 최고 레벨을 앞서 올리는 일은 원정에서 합니다.<br><br><b>도박장 줄</b>은 선술집의 도박장을 열면 자동으로 골드를 생산합니다. 판돈을 걸거나 스핀을 누를 필요가 없습니다. [수익]은 생산량, [대박]은 한 번 더 지급받을 확률을 높입니다. 선술집 슬롯을 직접 돌리는 것과 별개입니다.",
        en: "<b>Search</b> brings one candidate to the Tavern per interval for each hero assigned to this line, and does nothing with no one assigned. Interval makes arrivals faster. While that searcher's Tavern slots are full, the searcher rests and sets out again as soon as you free one of them. Quality raises Rare chance, Waiting Room opens a second slot per searcher and then Filter, and Roster raises how many heroes you can keep.<br><br><b>Training</b> helps assigned heroes catch up toward the roster's leading level. Its cap is <b>the highest roster level minus the gap shown by Range</b>. Research Range to reduce that gap. Heroes at or above the cap gain no Training XP, so Expeditions must push the leading level forward.<br><br>The <b>Gambling Den line</b> automatically produces gold once the Tavern's Gambling Den is unlocked. It needs no stake or spin button. Income raises output, while Jackpot raises the chance of an extra payout. This is separate from manually playing Tavern slots.",
        zh: '<b>搜寻</b>线上每位派驻英雄每隔一段时间就带一名候选到酒馆。没有派驻任何人时不会运作。[间隔]让到达更快。该英雄那一行的酒馆格子已满时，该英雄会休息，你一腾出该行格子就立刻再次出发。[品质]提高稀有候选几率，[等候所]为每一行开启第二格并开启筛选，[名册]增加可拥有的英雄数量。<br><br>派驻在<b>训练</b>线上的英雄会随时间获得经验，追赶名册中领先的等级。上限为<b>名册最高等级 − [范围]所示的差距</b>。研究范围可缩小这个差距。等级在上限以上的英雄不会获得训练经验，因此要靠远征来推高最高等级。<br><br><b>赌坊线</b>在开放酒馆的赌坊后会自动生产金币，无需下注或点击旋转。[收益]提高产量，[大丰收]提高额外再发放一次的几率。这与亲手玩酒馆老虎机是两回事。',
    },
    'help.colosseum.prepare.title': {
        ko: "시련의 탑에서 파티 시험하기",
        en: "Testing your party in the Tower of Trials",
        zh: '在试炼之塔中检验队伍',
    },
    'help.colosseum.prepare.body': {
        ko: "원정에서 준비한 파티로 시련의 탑을 오릅니다. 영웅 {duelSize}명을 편성하고 열린 층을 선택하세요. 상대 카드에서 장비와 스킬을 확인하고 [도전]을 누르면 자동전투가 시작됩니다.",
        en: "Bring {duelSize} heroes from your expedition party and choose an open floor. Inspect the enemy cards for gear and skills, then press Challenge to start the battle.",
        zh: "编入{duelSize}名英雄后选择已开放的楼层。查看敌方卡牌上的装备与技能，再点击挑战开始自动战斗。",
    },
    'help.colosseum.floors.title': {
        ko: "층 오르기",
        en: "Climbing floors",
        zh: '逐层攀登',
    },
    'help.colosseum.floors.body': {
        ko: "현재 {total}층까지 도전할 수 있습니다. 장마다 첫 여덟 층에서는 정예 무리와 스테이지보스를 차례로 상대합니다. 아홉째 층에는 먼저 도착한 라이벌 영웅 셋, 열째 층에는 챕터보스와 호위가 기다립니다. 층 번호가 기준 레벨입니다. {difficulty}",
        en: "There are {total} floors. The first eight floors of each chapter alternate between elite packs and stage bosses. Three rival heroes wait on the ninth, and the chapter boss and its escorts on the tenth. The floor number sets the base level. {difficulty}",
        zh: "当前可挑战{total}层。每章前八层交替出现精英队伍与关卡首领。第九层是先到的三名对手英雄，第十层是章节首领与护卫。楼层数即基础等级。{difficulty}",
    },
    'help.colosseum.retry.title': {
        ko: "같은 층에서 막혔다면",
        en: "When a floor stops your progress",
        zh: '卡在同一层时',
    },
    'help.colosseum.retry.body': {
        ko: "같은 층에는 같은 상대 편성이 나옵니다. 관전에서 누가 먼저 쓰러지는지, 어떤 적 스킬에 큰 피해를 받는지 살펴본 뒤 장비나 진형을 바꾸어 다시 도전합니다. 한 가지씩 바꾸면 어떤 준비가 도움이 되었는지 비교하기 쉽습니다.<br><br>빈 영웅 자리 때문에 [도전]이 꺼져 있다면 선택한 Party에 {duelSize}명을 채웁니다. 전술 효과와 물약은 우리 팀 아래에 표시된 내용을 확인합니다. 레벨이나 장비가 부족하다면 원정·고용·제작으로 파티를 키운 뒤 돌아와도 이미 깬 층은 남습니다.",
        en: "A floor keeps the same opposing lineup. Watch who falls first and which enemy skills deal the most damage, then change equipment or formation and try again. Changing one thing at a time makes it easier to compare what helped.<br><br>If Challenge is disabled because hero slots are empty, fill the selected Party with {duelSize} heroes. Check the tactics and potions shown below your team. You can return to Expeditions, hiring or crafting to improve the party; cleared floors remain when you come back.",
        zh: '同一层出现的对手编队相同。在观战中观察谁先倒下、被哪个敌方技能打出大量伤害，然后更换装备或阵型再次挑战。一次只改一处，更容易比较是哪项准备起了作用。<br><br>如果因为英雄位空缺而[挑战]不可用，请为所选Party填满{duelSize}名英雄。战术效果和药水请查看我方队伍下方显示的内容。如果等级或装备不足，可以通过远征、雇佣、制作培养队伍后再回来，已通关的层都会保留。',
    },
    'help.colosseum.rules.title': {
        ko: "전투와 최고층 기록",
        en: "Battles and floor progress",
        zh: "战斗与楼层进度",
    },
    'help.colosseum.rules.body': {
        ko: "몬스터는 원정 규칙으로 한 라운드를 싸웁니다. 라이벌은 장비·스킬·물약·작전 카드를 갖추고 결투 규칙으로 싸웁니다. 내 도감과 파티 전술은 두 전투에 모두 적용됩니다.<br><br>열린 최고층에서 시간 안에 승리하면 다음 층이 열립니다. 패배하거나 무승부여도 다시 도전할 수 있습니다. 최고층 기록만 저장하며 물약 재고는 소모하지 않습니다.",
        en: "Monster encounters use one expedition round. Rival heroes fight a duel with gear, skills, potions and tactic cards. Your Codex and party tactics apply to both.<br><br>Win on the highest open floor within the time limit to unlock the next. You can retry after a loss or draw. Only floor progress is saved and potion stock is preserved.",
        zh: "怪物战按远征规则进行一个回合。对手英雄携带装备、技能、药水与战术卡，按决斗规则作战。你的图鉴与队伍战术在两种战斗中均生效。<br><br>在最高开放层限时内获胜即可开启下一层。落败或平局后可重试。仅记录通关进度，药水库存不会减少。",
    },
    'help.arena.rating.title': {
        ko: "레이팅과 리그 이해하기",
        en: "Understanding rating and leagues",
        zh: '了解积分与段位',
    },
    'help.arena.rating.body': {
        ko: "결투장은 승패에 따라 바뀌는 대전 점수인 레이팅을 올리는 곳입니다. 시련의 탑이 층을 차례로 여는 방식이라면, 결투장에서는 내 점수 근처의 상대를 골라 겨룹니다. 상대는 다른 플레이어가 등록한 방어 편성이며, 내 점수 근처의 플레이어가 없으면 후보가 적거나 비어 있습니다.<br><br>선택한 Party의 영웅 {duelSize}명으로 겨루며, 승리하면 레이팅이 오르고 패배하면 내려갑니다. 나보다 높은 레이팅의 상대를 이길수록 더 많이 오르고, 그런 상대에게 질 때는 덜 내려갑니다. 무승부도 상대와의 점수 차이에 따라 레이팅이 바뀔 수 있습니다. 예를 들어 나보다 높은 점수의 상대와 비기면 레이팅이 오를 수 있습니다.<br><br>리그는 레이팅 구간의 이름입니다. 왼쪽 리그표에서 다음 등급의 문턱을 확인할 수 있으며, 문턱에 도달하면 표시되는 리그가 바뀝니다. 레이팅과 리그는 이 콘텐츠의 기록이며 영웅의 레벨이나 원정 장비를 직접 올리지는 않습니다.",
        en: "The Arena tracks rating: a duel score that changes with wins, draws and losses. The Tower of Trials opens floors in order, while the Arena lets you choose opponents near your score. Opponents are defense parties registered by other players; if few players are near your score, the list is short or empty.<br><br>Fight with the {duelSize} heroes in your chosen Party. Wins raise rating and losses lower it. Beating a higher-rated opponent gains more, while losing to one costs less. A draw can also change rating depending on the difference between your scores. For example, drawing against a higher-rated opponent can raise your rating.<br><br>A league is the name of a rating range. Check the league table on the left for the next threshold; crossing it changes your displayed league. Rating and leagues track progress in this mode and do not directly raise hero levels or Expedition equipment.",
        zh: '决斗场是提升积分的地方，积分是随胜负变化的对战分数。试炼之塔是依次开放层数，而在决斗场则是挑选分数与你相近的对手对战。对手是其他玩家报名的防守编队，如果没有分数与你相近的玩家，候选会很少或为空。<br><br>使用所选Party的{duelSize}名英雄对战，胜利则积分上升，失败则下降。击败积分比你高的对手时上升更多，输给这样的对手时下降更少。平局也可能根据双方的分数差改变积分。例如，与分数比你高的对手打平，积分可能上升。<br><br>段位是积分区间的名称。可在左侧段位表中查看下一段位的门槛，达到门槛后显示的段位会改变。积分和段位是这项内容的记录，不会直接提升英雄等级或远征装备。',
    },
    'help.arena.opponents.title': {
        ko: "상대 후보를 고르는 순서",
        en: "Choosing an opponent",
        zh: '挑选对手候选的顺序',
    },
    'help.arena.opponents.body': {
        ko: "왼쪽 후보는 내 레이팅보다 낮은 팀, 비슷한 팀, 높은 팀입니다. 카드의 +는 이겼을 때 오르는 점수이고 −는 졌을 때 잃는 점수입니다. 낮은 상대는 예상 승리 점수가 작고, 높은 상대는 예상 승리 점수가 큽니다. 점수뿐 아니라 상대 직업·스킬과 내 파티가 잘 맞는지도 함께 살펴봅니다.<br><br>후보를 누르면 오른쪽에 그 팀이 나옵니다. 내 Party와 아래 물약·전술을 확인한 뒤 [결투 시작]을 누릅니다. [새 상대]는 후보 목록을 새로 고르는 버튼이며 결투를 시작하지 않습니다. 레이팅 결투를 마치면 후보가 새로 나옵니다. 결과와 레이팅은 전투를 시작하는 순간 기록되므로 관전을 닫아도 바뀐 점수는 남습니다.",
        en: "The candidates on the left are below, near and above your rating. A card's + shows the points gained for a win, and − shows the points lost for a defeat. Lower-rated opponents offer smaller winning gains; higher-rated opponents offer larger ones. Also inspect their classes and skills to judge how your party matches up.<br><br>Select a candidate to reveal that team on the right. Check your Party and the potions and tactics below it, then press Start duel. New opponents refreshes the candidate list without starting a fight. Candidates also refresh after a rated duel. The result and rating are recorded when the fight starts, so leaving the replay keeps the changed score.",
        zh: '左侧的候选分别是积分比你低、相近、比你高的队伍。卡片上的+是获胜时上升的分数，−是失败时损失的分数。低积分对手的预计胜利得分较少，高积分对手的预计胜利得分较多。除了分数，还要一并查看对手的职业、技能与你的队伍是否对路。<br><br>点击候选，右侧会显示该队伍。确认你的Party以及下方的药水、战术后，点击[开始决斗]。[新对手]是重新挑选候选列表的按钮，不会开始决斗。积分决斗结束后也会出现新的候选。结果和积分在战斗开始的瞬间就已记录，因此关闭观战后变化的分数也会保留。',
    },
    'help.arena.defense.title': {
        ko: "방어 편성과 방어 기록",
        en: "Defense party and defense log",
        zh: '防守编队与防守记录',
    },
    'help.arena.defense.body': {
        ko: "결투장에 처음 들어오면 이름과 방어 편성을 등록합니다. 영웅 {duelSize}명이 찬 Party만 고를 수 있고, [등록]을 누르면 그 편성이 바로 다른 플레이어의 상대 후보와 [친구와 전투] 목록에 올라갑니다. 이름 뒤에는 계정마다 정해진 네 자리 태그가 붙어 같은 이름을 구별합니다. 이름은 설정에서 바꿀 수 있고 비워 둘 수는 없습니다.<br><br>방어 편성은 왼쪽 [방어 편성]에서 다른 Party로 바꿀 수 있으며 등록을 풀 수는 없습니다. 장비나 진형을 바꾸면 바뀐 모습이 다시 올라가고, 레이팅도 함께 보입니다. 결투를 하러 나가는 편성은 오른쪽 판에서 고르는 Party이며, 방어 편성과 같아도 됩니다.<br><br>다른 플레이어가 내 방어 편성과 싸우면 [방어 기록]에 언제 · 누가 · 그 레이팅 · 결과가 남고, 친선전이면 「친선전」이 붙습니다. 방어 결과는 내 레이팅을 바꾸지 않습니다. 등록과 받기는 배포판에서만 동작하고, 상대 목록과 기록은 게임을 켤 때 · 결투장에 들어올 때 · [새 상대]를 누를 때 새로 받습니다. 바로 앞에 받았다면 받아 둔 목록을 씁니다. 다른 플레이어의 팀은 규칙 검사를 통과한 것만 나오고, 올린 편성의 파티 전술과 물약을 씁니다.",
        en: "The first time you enter the Arena, register a name and a defense party. Only a Party with {duelSize} heroes can be chosen, and pressing Register lists it right away in other players' opponents and in Fight a friend. A four-digit tag fixed to your account follows your name so players with the same name can be told apart. You can change the name in Settings, but it cannot be left empty.<br><br>Switch your defense to another Party under Defense party on the left; it cannot be unregistered. Changing its gear or formation uploads the new version, and your rating is shown with it. The party you attack with is the one chosen on the right, and it may be the same as your defense party.<br><br>When another player fights your defense party, the Defense log records when, who, their rating and the result, marked Friendly for friendly duels. Defense results do not change your rating. Registering and receiving work only on the live build; opponents and records are refreshed when the game starts, when you enter the Arena and when you press New opponents. If they were just received, the stored list is used. Other players' teams appear only if they pass the rule check, and they use the party tactics and potions of the uploaded party.",
        zh: '第一次进入决斗场时，需要设定名字并报名防守编队。只能选择已满{duelSize}名英雄的Party，点击[报名]后，该编队会立即出现在其他玩家的对手候选和[与好友战斗]列表中。名字后会附上每个账号固定的四位数标签，用来区分同名玩家。名字可以在设置中修改，但不能留空。<br><br>防守编队可以在左侧[防守编队]中换成其他Party，但无法取消报名。更换装备或阵型后，变化后的样子会重新上传，积分也会一起显示。出战决斗的编队是右侧面板中选择的Party，与防守编队相同也可以。<br><br>其他玩家与你的防守编队交战时，[防守记录]中会留下时间、对手、其积分和结果，友谊赛则会标注“友谊赛”。防守结果不会改变你的积分。报名和数据接收仅在正式版中可用，对手列表和记录会在启动游戏时、进入决斗场时、点击[新对手]时重新获取。如果刚刚获取过，就使用已获取的列表。其他玩家的队伍只有通过规则检查的才会出现，并使用其上传编队的队伍战术和药水。',
    },
    'help.arena.friendly.title': {
        ko: "친구와 전투",
        en: "Fight a friend",
        zh: '与好友战斗',
    },
    'help.arena.friendly.body': {
        ko: "[친구와 전투]를 누르면 방어 편성을 등록한 플레이어가 최근에 올라온 순서로 나옵니다. 찾기 칸에 이름의 앞 글자를 넣으면 그 글자로 시작하는 이름을, #1234처럼 태그를 넣으면 그 태그를, 이름#1234를 넣으면 그 사람을 찾습니다. 이름은 대소문자를 가립니다. 한 번에 한 쪽씩 나오며 [더 보기]로 이어서 봅니다.<br><br>목록에서 한 사람을 고르면 창이 닫히고 그 팀이 친선전 상대로 표시됩니다. 그 팀을 확인한 뒤 [결투 시작]으로 겨룹니다. 상대 팀은 그 사람이 마지막으로 올린 모습이며, 그 편성의 파티 전술과 물약도 함께 씁니다.<br><br>친선전은 연습입니다. 결과가 레이팅과 레이팅 전적에 영향을 주지 않고, 상대의 방어 기록에는 「친선전」으로 남습니다.",
        en: "Press Fight a friend to list players who registered a defense party, most recently updated first. Type the start of a name to find names beginning with it, a tag such as #1234 to find that tag, or Name#1234 to find that player. Names are case-sensitive. Results come one page at a time; press More to continue.<br><br>Pick a player to close the window and show their team as your friendly opponent. Inspect that team, then press Start duel. The team is as that player last uploaded it, including its party tactics and potions.<br><br>Friendly duels are practice. Results do not affect rating or rated records; the other player's defense log shows them marked Friendly.",
        zh: '点击[与好友战斗]，会按最近上传的顺序列出已报名防守编队的玩家。在搜索栏输入名字的开头文字，可查找以该文字开头的名字；输入#1234这样的标签，可查找该标签；输入名字#1234，可查找那个人。名字区分大小写。每次显示一页，点击[更多]继续查看。<br><br>在列表中选择一个人后，窗口会关闭，该队伍会显示为友谊赛对手。确认该队伍后，点击[开始决斗]对战。对手队伍是那个人最后上传的样子，也会一并使用该编队的队伍战术和药水。<br><br>友谊赛是练习。结果不影响积分和积分战绩，在对手的防守记录中会标为“友谊赛”。',
    },
    'help.arena.results.title': {
        ko: "전적과 원정의 관계",
        en: "Records and Expeditions",
        zh: '战绩与远征的关系',
    },
    'help.arena.results.body': {
        ko: "전투 준비와 물약·도감 적용은 시련의 탑 묶음의 공통 규칙을 따릅니다. 결투를 해도 원정 스테이지나 도감 경험치가 진행되지는 않으며, 결투장에는 별도의 장비·골드 보상이 없습니다.<br><br>현재 레이팅, 최고 레이팅, 레이팅 결투의 승·무·패는 자동 저장됩니다. 이미 고른 상대와 지난 전투 결과의 화면 표시는 다시 접속하면 새로 시작됩니다. 전적이 남는 것과 이전 관전을 다시 여는 것은 서로 다릅니다.",
        en: "Battle preparation, potions and Codex bonuses follow the shared rules in the Tower of Trials section. A duel does not advance Expedition stages or Codex EXP, and the Arena has no separate equipment or gold rewards.<br><br>Current rating, best rating and rated wins, draws and losses are saved automatically. Selected opponents and the last-battle display reset when you return. A saved record does not mean the previous replay remains available.",
        zh: '战斗准备以及药水、图鉴的适用，遵循试炼之塔部分的通用规则。进行决斗不会推进远征关卡或图鉴经验，决斗场也没有额外的装备、金币奖励。<br><br>当前积分、最高积分，以及积分决斗的胜、平、负会自动保存。已选择的对手和上一场战斗结果的画面显示，在重新进入游戏后会重置。保留战绩与重新打开之前的观战是两回事。',
    },
    'help.codex.monsters.title': {
        ko: "몬스터 살펴보기와 도감 경험치",
        en: "Inspecting monsters and Codex EXP",
        zh: '查看怪物与图鉴经验',
    },
    'help.codex.monsters.body': {
        ko: "몬스터 도감에서 챕터를 고르면 지역별 몬스터의 분류·스킬·도감 진행도를 볼 수 있습니다. 카드를 가리키면 이야기와 구간 보상을, 스킬 그림을 가리키면 그 효과를 확인합니다. 일반·정예 초상은 같은 몬스터의 도감 기록을 공유합니다.<br><br>도감 경험치는 몬스터마다 쌓입니다. 원정에서 이긴 라운드의 처치와 탐험 전투에서 정산된 처치가 기록됩니다. 난이도별 처치당 경험치는 {per}이며, 정예·보스에는 등급 배율이 적용됩니다({grade}).",
        en: "Choose a chapter in the Monster Codex to view each area's monsters, skills, classification and Codex progress. Hover a monster card for its story and section rewards, or a skill icon for its effect. Normal and Elite portraits share one Codex entry.<br><br>Codex EXP accumulates for each monster. Kills from won Expedition rounds and settled Exploration fights count. EXP per kill by difficulty is {per}. Elites and bosses apply their grade multipliers ({grade}).",
        zh: "在怪物图鉴中选择章节，可查看各区域怪物的分类、技能和图鉴进度。悬停于怪物卡片可查看故事与区间奖励，悬停于技能图标可查看效果。普通和精英头像共用一个图鉴记录。<br><br>图鉴经验按怪物累积。远征获胜回合的击杀和探索战斗中已结算的击杀都会记录。各难度每次击杀的经验是 {per}，精英与首领另乘品质倍率（{grade}）。",
    },
    'help.codex.classification.title': {
        ko: "종족 · 직업 읽기",
        en: "Reading race and class",
        zh: '解读种族与职业',
    },
    'help.codex.classification.body': {
        ko: "몬스터 카드의 분류는 종족·직업을 나타냅니다. 종족은 생물·데몬·언데드이며, 직업은 전사·궁수·기사·마법사·사제처럼 사용하는 스킬과 장비의 계열입니다. 예를 들어 고블린 척후병은 데몬 종족, 궁수 직업입니다.<br><br>도감 Lv1~40(파밍·전투 구간) 보너스가 함께 적용되는 범위는 종족입니다. 데몬 몬스터 하나의 레벨을 올리면 다른 지역의 데몬 몬스터를 상대할 때도 적용됩니다. 보스처럼 이 두 구간의 보너스가 없는 몬스터는 그 보너스를 주고받지 않습니다.",
        en: "Monster cards identify race and class. Races are Creature, Demon and Undead. Class describes the monster's skills and equipment, such as Warrior, Archer, Knight, Mage or Priest. For example, a Goblin Scout is a Demon with the Archer class.<br><br>Codex Lv1–40 bonuses (the farming and combat tiers) are shared within a race. Leveling one Demon monster also helps against Demon monsters in other areas. Monsters with no bonuses in these two tiers, such as bosses, neither grant nor receive those race bonuses.",
        zh: '怪物卡片的分类表示种族与职业。种族有生物、恶魔、亡灵，职业则是战士、弓箭手、骑士、法师、牧师这类所用技能与装备的系别。例如，哥布林斥候是恶魔种族、弓箭手职业。<br><br>图鉴Lv1~40（刷宝、战斗区间）加成共同生效的范围是种族。提升一只恶魔怪物的等级后，与其他区域的恶魔怪物交战时也会生效。首领这类没有这两个区间加成的怪物，既不提供也不接受这些加成。',
    },
    'help.codex.race_traits.title': {
        ko: "종족에 따른 몸의 차이",
        en: "How race changes a monster's body",
        zh: '种族带来的身体差异',
    },
    'help.codex.race_traits.body': {
        ko: "일반 몬스터와 정예는 종족에 따라 기본 몸 특성이 달라집니다. 같은 직업이라도 최대 HP·재생·피해·방어·저항에서 차이가 날 수 있으므로 카드의 전투 수치와 사용하는 스킬을 함께 확인합니다. 이 종족 몸 보정은 보스나 두 결투 콘텐츠의 영웅 팀에는 적용되지 않습니다.<br><br>생물 종족은 물리 방어가 높고 원소 저항이 낮습니다. 물리 공격이 잘 통하지 않는다면 원소 피해를 주는 영웅과 스킬을 살펴봅니다.<br><br>데몬은 최대 HP와 HP 재생이 높지만 물리 방어가 낮고, 결빙이 통하지 않습니다. 전투가 길어지며 상대 HP가 차오른다면 물리 화력과 받는 회복을 줄이는 효과를 검토합니다.<br><br>언데드는 최대 HP가 낮고 입히는 피해가 높으며, 강타와 흡혈이 통하지 않습니다. 먼저 쓰러뜨릴 화력과 아군을 보호할 방어·피해 감소, 흡혈 대신 회복을 함께 준비합니다.",
        en: "Regular and Elite monsters have body traits determined by race. Even monsters with the same class can differ in maximum HP, regeneration, damage, defense and resistance, so inspect their combat values together with their skills. These racial body adjustments do not apply to bosses or hero teams in either duel mode.<br><br>Creature monsters have higher physical defense and lower elemental resistances. If physical attacks are struggling, inspect heroes and skills that deal elemental damage.<br><br>Demons have higher maximum HP and HP regeneration, lower physical defense, and are immune to Freeze. If their HP keeps recovering during a long fight, consider physical damage and effects that reduce healing received.<br><br>Undead have lower maximum HP, deal more damage, and are immune to Crushing Blow and Life Steal. Prepare the damage to defeat them quickly, protection such as defense or damage reduction, and healing in place of Life Steal.",
        zh: '普通怪物和精英的基础身体特性因种族而异。即使职业相同，最大生命、再生、伤害、防御、抗性也可能有差异，所以要一并确认卡片上的战斗数值和所用技能。这种种族身体修正不适用于首领，也不适用于两种决斗内容中的英雄队伍。<br><br>生物种族物理防御高、元素抗性低。如果物理攻击效果不佳，可以考虑造成元素伤害的英雄和技能。<br><br>恶魔最大生命和生命再生高，但物理防御低，且免疫冻结。如果战斗拖长、对方生命不断回满，可以考虑物理火力以及降低受到治疗的效果。<br><br>亡灵最大生命低，造成的伤害高，压碎性打击和吸血对其无效。要同时准备尽快击倒它们的火力、保护己方的防御与伤害减免，并以治疗代替吸血。',
    },
    'help.codex.milestones.title': {
        ko: "도감 단계가 주는 보너스",
        en: "What Codex milestones grant",
        zh: '图鉴阶段给予的加成',
    },
    'help.codex.milestones.body': {
        ko: "도감 레벨은 몬스터마다 Lv1부터 Lv60까지 오르며, 20레벨씩 세 구간으로 나뉩니다. 구간마다 끝의 누적 도감 경험치는 {list}입니다. 구간 안에서는 레벨이 하나 오를 때마다 그 구간 효과의 1/{seg}이 붙고, 구간을 다 채우면 카드에 적힌 값이 모두 적용됩니다. 이미 오른 레벨은 내려가지 않습니다.<br><br>Lv1~20은 같은 종족을 잡을 때 경험치·드롭·골드 등 보상을 늘리는 파밍 옵션, Lv21~40은 같은 종족을 상대할 때 적용되는 전투 옵션입니다. 어떤 옵션인지는 몬스터마다 다르며, 같은 종족의 여러 몬스터에서 쌓은 보너스는 함께 적용됩니다. 보스 등 일부 몬스터에는 이 두 구간의 보너스가 없습니다.<br><br>Lv41~60은 그 몬스터의 전투 옵션 하나를 모든 파티원에게 항상 더합니다. 각 구간의 효과와 지금 채운 레벨은 몬스터 카드에서 확인합니다. Lv41~60 옵션은 시련의 탑과 결투장에서도 내 팀에 적용됩니다.",
        en: "Each monster's Codex level rises from Lv1 to Lv60 in three tiers of 20 levels. The cumulative Codex EXP at the end of each tier is {list}. Each level within a tier adds 1/{seg} of that tier's effect, and a full tier grants the whole value shown on the card. Levels never go down.<br><br>Lv1–20 is a farming option that improves rewards such as XP, drops or gold from that race. Lv21–40 is a combat option used against the same race. The option varies by monster, and bonuses built from different members of one race combine. Bosses and some other monsters have no bonuses in these two tiers.<br><br>Lv41–60 permanently adds one combat option from that monster to every party member. Inspect the monster card for each tier's effect and how many levels you have filled. The Lv41–60 options also apply to your team in Tower of Trials and Arena duels.",
        zh: '每种怪物的图鉴等级从Lv1升到Lv60，每20级为一个区间，共三个区间。各区间末尾的累计图鉴经验为{list}。区间内每升一级，获得该区间效果的1/{seg}；填满区间后，卡片上的数值全部生效。已升的等级不会下降。<br><br>Lv1~20是击杀同种族时提高经验、掉落、金币等奖励的刷宝词条，Lv21~40是与同种族交战时生效的战斗词条。具体是什么词条因怪物而异，从同一种族的多只怪物积累的加成会一并生效。首领等部分怪物没有这两个区间的加成。<br><br>Lv41~60会把该怪物的一条战斗词条始终加给所有队员。各区间的效果和当前已填满的等级请在怪物卡片中确认。Lv41~60的词条在试炼之塔和决斗场中也会加给我方队伍。',
    },
    'help.codex.library_unlocks.title': {
        ko: "경험치는 찼는데 단계가 잠겨 있다면",
        en: "When a full milestone is still locked",
        zh: '经验已满但阶段仍锁定时',
    },
    'help.codex.library_unlocks.body': {
        ko: "도감 경험치와 도감 단계 해금은 두 조건입니다. 몬스터를 잡아 필요한 경험치를 모으고, 도서관 랭크로 그 단계까지 열어야 효과가 적용됩니다. 잠긴 단계도 경험치는 계속 쌓이며 카드의 눈금은 회색으로 찰 수 있습니다.<br><br>예를 들어 다음 단계의 경험치를 이미 모았지만 그 단계에 자물쇠가 있다면, 눈금에 마우스를 올려 필요한 도서관 랭크를 확인합니다. 건설에서 그 랭크를 올리면 이미 채운 단계가 바로 적용됩니다. 같은 경험치를 다시 모을 필요는 없습니다.",
        en: "Codex EXP and milestone access are two requirements. You need both the monster's required EXP and the Library rank that opens that milestone before its effect applies. EXP keeps accumulating behind locked milestones, and their markers can fill in grey.<br><br>If you already have the EXP for the next milestone but it still shows a lock, hover its marker to see the required Library rank. Build that rank in Construction to apply the milestone already earned. You do not need to collect the same EXP again.",
        zh: '图鉴经验和图鉴阶段解锁是两个条件。必须击杀怪物攒够所需经验，并靠图书馆的阶开放到该阶段，效果才会生效。锁定的阶段也会继续累积经验，卡片上的刻度可能以灰色填满。<br><br>例如，已经攒够下一阶段的经验，但该阶段仍有锁，就把鼠标移到刻度上，确认所需的图书馆阶。在建设中提升到该阶后，已填满的阶段会立即生效。无需重新攒同样的经验。',
    },
    'help.codex.art.title': {
        ko: "캐릭터 · 아이템",
        en: "Characters and items",
        zh: '角色与物品',
    },
    'help.codex.art.body': {
        ko: "<b>캐릭터</b>는 직업별 영웅 초상, <b>아이템</b>은 무기 · 방어구 · 물약의 그림과 목록을 모아 보여줍니다. 물약을 가리키면 효과를 확인할 수 있습니다. 초상 그림체 고르개는 실제 게임의 초상과 배경에도 적용되며 설정의 그림체 선택과 함께 저장됩니다.<br><br>도감에서 그림을 보는 것만으로 영웅이나 장비를 획득하지는 않습니다.",
        en: "<b>Characters</b> collects hero portraits by class, and <b>Items</b> lists weapon, armor and potion artwork. Hover potions to see their effects. The portrait style selector also changes portraits and backgrounds used in the game and shares its saved choice with Settings.<br><br>Viewing artwork in the Codex does not grant heroes or equipment.",
        zh: '<b>角色</b>汇集展示各职业的英雄肖像，<b>物品</b>汇集展示武器、防具、药水的图片和列表。指向药水可查看效果。肖像画风切换也会应用到实际游戏中的肖像和背景，并与设置中的画风选择一同保存。<br><br>仅在图鉴中查看图片并不会获得英雄或装备。',
    },
    'help.codex.skills.title': {
        ko: "배울 스킬과 마스터리 찾아보기",
        en: "Finding skills and mastery to learn",
        zh: '查找可学的技能与专精',
    },
    'help.codex.skills.body': {
        ko: "스킬 목록은 일반 스킬과 전직 스킬을 직업·전직별로 보여줍니다. 스킬 그림에 마우스를 올려 효과와 필요한 무기를 확인합니다. 스킬북이 있는 일반 스킬에는 획득처와 레벨이 오를 때 좋아지는 항목도 표시됩니다. 원하는 스킬이 있다면 이 목록에서 그 스킬북의 획득처를 찾습니다.<br><br>도감에서는 스킬과 마스터리를 미리 살펴봅니다. 실제 책 습득은 도서관에서, 스킬 포인트 투자는 캐릭터의 [마스터리 열기]에서 합니다. 도감의 스킬 수치는 특정 영웅을 선택한 상태가 아니므로, 실제 영웅에게 적용되는 피해·회복량은 그 영웅의 스킬 설명에서도 확인합니다.",
        en: "The Skills list groups regular and advancement skills by class and advancement. Hover an icon to read its effect and weapon requirement. Regular skills that can become books also show sources and what improves per level. To pursue a skill, find where its book comes from here.<br><br>The Codex lets you preview skills and mastery. Learn books at the Library, and spend skill points through Open Mastery in Character. Codex skill details have no selected hero context, so check the skill on your actual hero for their damage or healing values.",
        zh: "技能列表按职业、转职分类显示普通技能和转职技能。把鼠标移到技能图标上可查看效果和所需武器。有技能书的普通技能还会显示获取途径，以及等级提升时变强的项目。如果有想要的技能，就在这个列表中查找其技能书的获取途径。<br><br>图鉴用于预先查看技能和专精。实际学习书籍在图书馆进行，投入技能点则在角色的[打开专精]中进行。图鉴中的技能数值并未选定特定英雄，因此实际作用于英雄的伤害、治疗量也要在该英雄的技能说明中确认。",
    },
    'help.codex.effects.title': {
        ko: "이펙트 미리 보기",
        en: "Previewing effects",
        zh: '预览特效',
    },
    'help.codex.effects.body': {
        ko: "<b>이펙트</b>에서 그림체를 고르고 카드를 누르면 해당 스킬의 연출을 볼 수 있습니다. 묶음 옆의 ▶는 그 묶음, [전부 재생]은 전체를 재생합니다. [나란히 보기]에서 스킬을 고르면 여러 그림체를 동시에 볼 수 있습니다.<br><br>실제 전투에 적용할 그림체는 설정에서 고릅니다. 도감 미리 보기는 설정에서 스킬 이펙트를 꺼 둔 상태에서도 재생됩니다.",
        en: "In <b>Effects</b>, choose a style and select a card to play its skill animation. The ▶ next to a group plays that group, and [Play All] plays every effect. Choose a skill in [Side by Side] to see its styles play together.<br><br>Choose the style for live combat in Settings. Codex previews play even if skill effects are disabled.",
        zh: '在<b>特效</b>中选择画风，再点击卡片即可播放该技能的动画。分组旁的 ▶ 会播放该组，【全部播放】则播放所有特效。在【并排对比】中选择技能，可同时查看多种画风。<br><br>实战画风在设置中选择。即使关闭了技能特效，图鉴预览仍可播放。',
    },
    'help.help.browse.title': {
        ko: "도움말에서 필요한 설명 찾기",
        en: "Finding the explanation you need",
        zh: '在帮助中查找所需说明',
    },
    'help.help.browse.body': {
        ko: "도움말의 주제별 폴더는 왼쪽 메뉴와 같은 순서입니다. 폴더를 누르면 그 주제의 설명만 열리고, 본문을 스크롤해 끝까지 읽을 수 있습니다. 폴더마다 읽던 위치를 기억하며 잠긴 탭의 설명도 미리 볼 수 있습니다.<br><br>검색창에 단어를 띄어 써 넣으면 모든 폴더의 제목·소제목·본문에서 그 단어가 모두 포함된 설명을 찾습니다. 결과가 있는 폴더를 골라 읽으며, 현재 폴더에 결과가 없으면 첫 결과 폴더가 열립니다. 검색어를 지우면 모든 폴더의 설명이 복구됩니다.<br><br>처음 시작했다면 처음 플레이하는 순서와 자주 쓰는 용어부터 읽습니다. 당장 막힌 일이 있다면 막혔을 때 확인할 곳에서 해결할 탭을 찾고, 그 탭의 자세한 설명으로 이어갑니다.",
        en: "Help folders follow the same order as the left menu. Select a folder to open only that topic, then scroll inside its text to read further. Each folder remembers your reading position. You can also read about tabs that are still locked.<br><br>Enter words separated by spaces in Search to find explanations across all folders whose titles, subheadings and text contain every word. Choose a folder with matches to read them. If the current folder has no matches, the first matching folder opens. Clear the search to restore every folder's explanations.<br><br>If you are new, start with Your first steps and Common terms. If something has stopped your progress, use Where to look when stuck to find the relevant tab, then read its detailed explanation.",
        zh: '帮助按主题分成的文件夹与左侧菜单顺序相同。点击文件夹只会打开该主题的说明，可以滚动正文读到最后。每个文件夹都会记住阅读位置，也可以预览尚未解锁页面的说明。<br><br>在搜索框中输入以空格分隔的词语，会在所有文件夹的标题、小标题、正文中查找同时包含这些词的说明。选择有结果的文件夹阅读；当前文件夹没有结果时，会打开第一个有结果的文件夹。清除搜索词后，所有文件夹的说明都会恢复。<br><br>如果你刚开始游戏，先读“初次游玩的顺序”和“常用术语”。如果眼下卡住了，就在“卡住时该看哪里”中找到需要处理的页面，再接着读该页面的详细说明。',
    },
    'help.help.common_terms.title': {
        ko: "자주 쓰는 용어",
        en: "Common terms",
        zh: '常用术语',
    },
    'help.help.common_terms.body': {
        ko: "로스터는 내가 보유한 영웅 전체입니다. Party는 그중 함께 출전하도록 편성한 영웅 묶음이며, Party 번호는 그 편성을 고르는 이름입니다. 한 영웅은 한 편성에만 들어갑니다. 모든 영웅을 보유한 로스터와 실제 출전하는 Party를 구분하면 고용과 편성을 읽기 쉽습니다.<br><br>파밍은 이미 갈 수 있는 곳을 여러 번 돌아 원하는 장비·재료·경험치를 모으는 일입니다. 아이템의 옵션은 공격력·저항·회복 같은 개별 효과를 말합니다. 희귀도는 장비나 영웅의 일반·매직·레어 같은 등급이고, 레벨과는 다른 항목입니다.<br><br>건물의 랭크는 기능과 상한을 여는 단계입니다. 연구소 지점의 레벨은 그 지점의 생산·효과를 올리는 단계입니다. 마스터리는 포인트를 투자해 얻는 패시브 효과이며, 스킬북으로 배우는 액티브 스킬과 별도로 준비합니다.",
        en: "Your roster is every hero you own. A Party is a group from that roster prepared to deploy together; the Party number selects that saved group. A hero can belong to only one Party. Keeping the full roster separate from the deployed Party makes hiring and team preparation easier to follow.<br><br>Farming means repeating accessible content to collect wanted equipment, materials or XP. An item's options are its individual effects, such as damage, resistance or healing. Rarity means grades such as Normal, Magic and Rare for gear or heroes; it is separate from level.<br><br>A building's rank unlocks features and raises limits. A Laboratory node's level improves that node's production or effect. Mastery provides passive effects by spending points and is prepared separately from active skills learned through books.",
        zh: '名册是你拥有的全部英雄。Party是从中编成、一同出战的英雄组合，Party编号是选择该编队的名称。一名英雄只能加入一个编队。把拥有全部英雄的名册与实际出战的Party区分开，雇佣和编队就更容易理解。<br><br>刷宝是指反复去已经能去的地方，收集想要的装备、材料、经验。物品的词条是指伤害、抗性、治疗这类单独的效果。稀有度是装备或英雄的普通、魔法、稀有这类分级，与等级是不同的项目。<br><br>建筑的阶是开放功能和上限的阶段。研究所节点的等级是提升该节点生产、效果的阶段。专精是投入点数获得的被动效果，与用技能书学习的主动技能分开准备。',
    },
    'help.help.controls.title': {
        ko: "마우스 · 키보드 · 터치 조작",
        en: "Mouse, keyboard and touch controls",
        zh: '鼠标、键盘、触屏操作',
    },
    'help.help.controls.body': {
        ko: "영웅·몬스터·장비·스킬에 마우스를 올리면 툴팁이 뜹니다. [Alt]를 누르면 세부 스탯·계산 또는 착용 전후 차이를, [Shift]를 누르면 장비 옵션의 수치 범위를 확인합니다.<br><br>보관 중인 장비는 클릭으로 선택하고 우클릭으로 [착용]·[잠금] 메뉴를 엽니다. [우클릭 분해]를 켰다면 [Shift]+우클릭으로 메뉴를 열 수 있습니다. 터치에서는 그림을 길게 눌러 툴팁을 열고, 카드 아래 [세부]·[범위]와 해당 행동 버튼을 사용합니다.<br><br>일반 창은 ×, 창 바깥 클릭, [Esc]로 닫습니다. 모바일에서는 [메뉴]로 전체 탭을 열고, 위쪽 부대 상태를 눌러 관전으로 돌아갑니다. 전장 오른쪽 아래 버튼으로 가방을 펼치거나 접습니다.",
        en: "Hover heroes, monsters, gear or skills to see their tooltips. Hold [Alt] for detailed stats, calculations or changes from equipping gear. Hold [Shift] for equipment option ranges.<br><br>Click stored gear to select it and right-click to open the [Equip] and [Lock] menu. If [Right-click Salvage] is on, use [Shift]+right-click for the menu. On touch screens, press and hold an icon and use the [Details], [Ranges] and action buttons below the tooltip.<br><br>Close ordinary windows with ×, a click outside the window, or [Esc]. On mobile, use [Menu] to open the full list of tabs and tap a party status at the top to return to its battle. Use the lower-right battlefield button to open or close the inventory.",
        zh: "将鼠标移到英雄、怪物、装备或技能上可查看提示。按住【Alt】可查看详细属性、计算或穿戴前后的变化；按住【Shift】可查看装备词条的数值范围。<br><br>点击保管中的装备可选中，右键可打开【装备】与【锁定】菜单。开启【右键分解】后，可按住【Shift】再右键打开菜单。触屏上长按图标可打开提示，再使用下方的【详情】、【范围】与操作按钮。<br><br>普通窗口可用 ×、点击窗口外部或按【Esc】关闭。手机上可用【菜单】打开完整页签列表，点击顶部队伍状态可返回观战。战场右下按钮可展开或收起背包。",
    },
    'help.help.when_stuck.title': {
        ko: "막혔을 때 확인할 곳",
        en: "Where to look when stuck",
        zh: '卡住时该看哪里',
    },
    'help.help.when_stuck.body': {
        ko: "출발할 수 없다면 편성에 영웅이 있는지, 그 영웅이 다른 원정이나 탐험에 나가 있는지, 고른 스테이지가 열려 있는지 확인합니다. 거절될 때 표시되는 사유가 먼저 해결할 조건입니다.<br><br>출발은 되지만 계속 진다면 원정의 Report와 관전에서 쓰러진 순서와 피해를 확인합니다. 캐릭터의 착용 장비와 남은 스킬 포인트, 편성의 진형·물약·작전 카드를 살펴봅니다. 어떤 부분이 부족한지에 따른 자세한 예시는 원정과 캐릭터 도움말에 있습니다.<br><br>버튼이나 탭이 잠겨 있으면 건설에서 해당 건물·다음 랭크 조건을 봅니다. 재료가 부족하면 연구소 생산과 장비 분해를 확인하고, 골드가 부족하면 원정을 진행하거나 완료한 의뢰를 수령합니다. 재료의 종류와 단계가 비용에 적힌 것과 같은지도 봅니다. 도감 눈금은 찼는데 잠겨 있다면 도서관 랭크를 확인합니다. 지금 필요한 기능의 조건부터 맞추면 다음 목표를 정하기 쉽습니다.",
        en: "If you cannot deploy, check that the Party contains heroes, that they are not away on another Expedition or Exploration, and that the selected stage is open. The displayed rejection reason tells you which requirement to solve first.<br><br>If you can deploy but keep losing, inspect Report and spectate to see who fell first and what dealt damage. Check equipped gear and unspent skill points in Character, then formation, potions and equipped Tactic Cards in Party. Expedition and Character help give more detailed examples for each problem.<br><br>For locked buttons or tabs, check the building and next-rank requirements in Construction. For materials, check Laboratory production and gear salvage. For gold, run Expeditions or claim completed commissions. Match the material type and grade to the cost shown. A filled but locked Codex milestone needs Library ranks. Start with the requirements for the feature you need now.",
        zh: "如果无法出发，请确认编队中是否有英雄，该英雄是否正在进行其他远征或探索，所选关卡是否已开放。被拒绝时显示的原因，就是要先解决的条件。<br><br>如果能出发却一直失败，请在远征的报告和观战中查看倒下的顺序和所受伤害。检查角色的已穿戴装备和剩余技能点，以及编队的阵型、药水、战术卡。针对各种不足之处的详细示例，见远征和角色的帮助。<br><br>按钮或页面被锁定时，请在建设中查看相应建筑及下一阶的条件。材料不足时，查看研究所的生产和装备分解；金币不足时，推进远征或领取已完成的委托。还要确认材料的种类和级别是否与费用上写的一致。图鉴刻度已满却仍锁定时，请确认图书馆的阶。先满足眼下所需功能的条件，就更容易确定下一个目标。",
    },
    'help.help.settings.title': {
        ko: "화면 설정과 언어",
        en: "Display settings and language",
        zh: '画面设置与语言',
    },
    'help.help.settings.body': {
        ko: "상단 언어 목록에서 원하는 언어를 고르세요.<br><br>설정에서 스킬 이펙트 그림체와 투명도, 기본 공격 이펙트, 피격 반응과 흔들림, 전투 로그 표시 방식을 바꿀 수 있습니다. [바로가기 어둡게]는 첫 메인미션의 안내 위치 주변을 어둡게 표시합니다.",
        en: "Choose your language from the list at the top.<br><br>In Settings you can change the style and transparency of skill effects, basic attack effects, hit reactions and shake, and the battle log format. [Dim Mission Background] darkens the area around the highlights for the first Main Missions.",
        zh: "在顶部的语言列表中选择语言。<br><br>在设置中可调整技能特效的风格和透明度、普攻特效、受击反应与震动，以及战斗日志的显示方式。【使用快捷跳转时调暗背景】会调暗早期主线任务指引高亮位置的周围区域。",
    },
    'help.help.newgame.title': {
        ko: "새 게임과 첫 영웅",
        en: "New game and starting heroes",
        zh: '新游戏与初始英雄',
    },
    'help.help.newgame.body': {
        ko: "메뉴에서 [새 게임]을 누르면 프롤로그가 시작됩니다. 앞부분을 본 뒤 시작 영웅 {starterCount}명의 직업·죄종·능력치를 확인합니다. [다시 굴리기]는 후보 전원을 다시 뽑으며 횟수 제한 없이 사용할 수 있습니다. 시작 파티를 확정하면 프롤로그의 나머지 장면을 거쳐 1장 원정과 메인미션 안내로 이어집니다.<br><br>기존 세이브는 시작 파티를 최종 확정할 때 덮어씁니다. 그 전에는 [뒤로가기]로 메뉴에 돌아가 기존 게임을 불러올 수 있습니다.",
        en: "Select [New Game] in the menu to start the prologue. After its opening scenes, review the classes, Sins and attributes of your {starterCount} starting heroes. [Reroll] replaces all candidates and can be used as often as you want. Confirm your starting party to see the rest of the prologue and enter the Chapter 1 Expedition and Main Mission guidance.<br><br>Final confirmation of the starting party overwrites the existing save. Until then, use [Back] to return to the menu and load the existing game.",
        zh: "在菜单中点击【新游戏】会开始序章。看过开场后，可查看 {starterCount} 名初始英雄的职业、罪宗及属性。【重新随机】会重选所有候选人，次数不限。确认初始编队后会播放剩余序章场景，然后进入第 1 章远征与主线任务指引。<br><br>最终确认初始编队时会覆盖已有存档。在此之前，可以点击【返回】回到菜单并加载原来的游戏。",
    },
    'help.help.saving.title': {
        ko: "자동 저장과 이어하기",
        en: "Autosave and continuing",
        zh: '自动保存与继续游戏',
    },
    'help.help.saving.body': {
        ko: "진행 상황은 현재 브라우저에 자동 저장됩니다. 메뉴의 [불러오기]로 이어합니다. 계정을 연결하지 않은 저장은 현재 브라우저와 접속 주소에 남습니다. 이 사이트의 저장 데이터를 지우면 로컬 저장도 삭제됩니다.<br><br>배포판에서는 설정의 [계정 만들기]로 진행을 계정에 연결할 수 있습니다. 다른 브라우저나 기기에서는 메뉴의 [계정으로 불러오기]로 로그인해 이어합니다. 그 브라우저에 이미 세이브가 있으면 덮어쓰기를 확인합니다.<br><br>같은 저장을 여러 탭에서 열면 이전 탭에 멈춤 화면이 뜨고 새로 연 탭에서 이어서 플레이합니다. 이전 탭으로 돌아가려면 [이 탭에서 이어하기]로 최신 저장을 불러옵니다.",
        en: "Progress is saved automatically in this browser. Select [Load Game] in the menu to continue. Saves without a linked account stay with the current browser and site address. Clearing this site's data removes the local save.<br><br>In the live build, use [Create Account] in Settings to link your progress to an account. On another browser or device, sign in from [Load from Account] in the menu. If that browser already has a save, you will be asked to confirm the overwrite.<br><br>If you open the same save in more than one tab, the earlier tab pauses and play continues in the newly opened one. To return to the earlier tab, select [Continue in this tab] to load the latest save.",
        zh: "游戏进度会自动保存在当前浏览器。可从菜单点击【读取】继续。未绑定账号的存档保存在当前浏览器与访问地址下。清除该网站的数据也会删除本地存档。<br><br>在正式版本中，可在设置里点击【创建账号】将进度关联到账号。换用浏览器或设备时，可在菜单中选择【读取账号存档】并登录。如该浏览器已有存档，会要求确认覆盖。<br><br>若在多个标签页打开同一存档，较早的标签页会暂停，可在新打开的标签页继续游戏。要回到较早的标签页，可点击【在此标签页继续】加载最新存档。",
    },
    'help.help.away.title': {
        ko: "다른 화면을 보거나 자리를 비울 때",
        en: "Viewing other screens or stepping away",
        zh: '查看其他画面或离开时',
    },
    'help.help.away.body': {
        ko: "게임 안에서 도움말이나 장비를 보는 동안에도 원정·탐험은 진행됩니다. 게임을 닫으면 원정은 멈춥니다. 돌아와서 마지막 Report를 확인하고 원하는 스테이지에 다시 [보내기]합니다.<br><br>이미 시작한 탐험은 다시 접속할 때 남은 전투를 계산합니다. 종료 시각이 지나면 결과가 나오고, 성공 보상은 자동으로 들어옵니다. 이어 돌기는 게임을 다시 켜도 이어지지 않습니다.<br><br>연구소에 등록한 영웅은 오프라인에도 생산합니다. 기본 생산 상한은 {offlineHours}시간이며, 자원 줄의 연구로 재료 생산 시간을 늘릴 수 있습니다. 수색은 대기소가 찰 때까지, 장비 제작은 보관 칸이 차거나 재료가 모자랄 때까지 진행됩니다.",
        en: "Expeditions and Exploration continue while you read Help or manage gear. Closing the game stops Expeditions. When you return, check the last Report and [Deploy] again on the stage you want.<br><br>Reopening the game resolves the remaining fights of a run already started. Its result appears when the finish time has passed, and a successful run pays out automatically. The repeat queue stops when you close the game.<br><br>Assigned Laboratory heroes produce while you are offline. The default production cap is {offlineHours} hours, and Resources research can extend material production. Search runs until waiting slots fill, and gear crafting continues until its gear slots fill or supplies run short.",
        zh: "在游戏中查看帮助或整理装备时，远征与探索会继续进行。关闭游戏会中止远征。回来后可查看上次报告，再将队伍派往想去的关卡。<br><br>重新打开游戏时，已开始的探索会结算剩余战斗。到达结束时间后会显示结果，成功奖励会自动发放。关闭游戏会停止连续探索。<br><br>派驻到研究所的英雄在离线期间仍会生产。默认生产上限为 {offlineHours} 小时，资源线研究可延长材料生产时间。搜索会持续至候选等候位满，装备制作则会持续至装备存放位满或材料不足。",
    },
    // 왼쪽 탭 아이콘의 출처 — CC BY 3.0 의 표기 조건 (SCREEN_DESIGN §1 · §12 · ADR-1028)
    'help.help.credits.title': {
        ko: "아이콘 출처",
        en: "Icon credits",
        zh: '图标来源',
    },
    'help.help.credits.body': {
        ko: "왼쪽 탭 아이콘 일부는 game-icons.net에서 Lorc · sbed가 만든 그림입니다. CC BY 3.0 라이선스(creativecommons.org/licenses/by/3.0)로 사용합니다.",
        en: "Some of the left tab icons are by Lorc and sbed from game-icons.net, used under the CC BY 3.0 license (creativecommons.org/licenses/by/3.0).",
        zh: '左侧页面图标中有一部分是Lorc、sbed在game-icons.net上制作的图片，按CC BY 3.0许可协议（creativecommons.org/licenses/by/3.0）使用。',
    },
    'help.lab.generator.title': {
        ko: "아이템 생성기",
        en: "Item generator",
        zh: '物品生成器',
    },
    'help.lab.generator.body': {
        ko: "실험실의 [아이템 생성기]에서는 챕터와 몬스터, 일반·정예 등급, 난이도, 스테이지 레벨을 골라 드롭을 미리 확인합니다. 몬스터를 바꾸면 레벨은 그 장소의 기본값으로 돌아갑니다. 보스는 자신의 등급을 사용합니다.",
        en: "In the developer lab's [Item Generator], select a chapter, monster, Normal or Elite grade, difficulty and stage level to preview drops. Changing the monster resets the level to the area's default. Bosses use their own grade.",
        zh: "在开发专用实验室的【物品生成器】中，可选择章节、怪物、普通或精英品阶、难度与关卡等级来预览掉落。更换怪物会将等级恢复为该地点的默认值。首领使用自身的品阶。",
    },
    'help.lab.rolling.title': {
        ko: "드롭 조건과 굴리기",
        en: "Drop conditions and rolls",
        zh: '掉落条件与随机',
    },
    'help.lab.rolling.body': {
        ko: "부위 줄에서 항상 착용하는 장비와 확률로 착용하는 장비를 구분할 수 있습니다. 아이템 레벨 범위와 희귀도 가중치는 현재 조건의 실제 드롭 규칙입니다. <b>[굴리기]</b>는 한 번, <b>[×10]</b>은 열 번 생성하며 파티 매직아이템 획득 확률은 적용하지 않습니다.<br><br>가중치는 상대 비중이므로 표시값 자체가 퍼센트 확률은 아닙니다.",
        en: "The slot row distinguishes always-equipped items from optional slots with a wear chance. Item-level ranges and rarity weights show the actual drop rules for your chosen conditions. <b>Roll</b> generates once; <b>×10</b> generates ten times. Party Magic Find does not affect these rolls.<br><br>Each weight is relative to the sum of the weights.",
        zh: '在部位行中，可以区分必定穿戴的装备与按几率穿戴的装备。物品等级范围和稀有度权重是当前条件下的实际掉落规则。<b>[随机生成]</b>生成一次，<b>[×10]</b>生成十次，不计入队伍魔法物品获取率。<br><br>权重是相对比重，所示数值本身并不是百分比几率。',
    },
    'help.lab.duel.title': {
        ko: "결투 연습",
        en: "Duel practice",
        zh: "决斗练习",
    },
    'help.lab.duel.body': {
        ko: "실험실의 [결투]는 샘플 영웅 파티끼리 싸우는 개발용 연습입니다. [편성 수정]에서 아래 팀의 직업·죄종·작전 카드와 옵션을 정합니다. [조합 돌리기]는 새 팀 조합을 만들고, [다시 싸우기]는 현재 조합으로 새 전투를 엽니다. 실제 편성과 결투장 전적에는 반영되지 않습니다.",
        en: "[Duel] in the developer lab pits sample hero teams against each other. Use [Edit Party] to set the lower team's classes, Sins, Tactic Cards and options. [Reroll Teams] makes a new matchup. [Fight Again] starts another battle with the current teams. Practice leaves your real parties and Arena record intact.",
        zh: "开发实验室中的【决斗】让两支示例英雄队伍交战。可用【编辑编队】设置下方队伍的职业、罪宗、战术卡和词条。【随机组合】会生成新的对阵，【再战一次】则用当前阵容再打一场。练习不会改变实际编队或决斗场战绩。",
    },
    'help.lab.results.title': {
        ko: "결과와 저장",
        en: "Results and saving",
        zh: '结果与保存',
    },
    'help.lab.results.body': {
        ko: "오른쪽에는 최신 장비의 상세 카드와 최근 결과 목록이 표시됩니다. 결과를 가리키면 장비의 상세 옵션을 확인하고 <b>[비우기]</b>로 기록을 지울 수 있습니다. 생성한 장비는 가방에 들어가지 않고 실제 골드 · 재료 · 세이브에도 영향을 주지 않습니다. 기록은 화면을 다시 불러오면 초기화됩니다.",
        en: "The right side shows the latest item's details and recent results. Hover a result to inspect it and press <b>Clear</b> to erase the list. Generated equipment is not added to inventory and does not affect real gold, materials or saves. The list resets when you reload.",
        zh: '右侧显示最新装备的详细卡片和最近结果列表。指向结果可查看装备的详细词条，用<b>[清空]</b>可清除记录。生成的装备不会进入背包，也不会影响实际的金币、材料、存档。重新加载画面后记录会被重置。',
    },

    /* ── 공통 ── */
    'face.noArt': { ko: '{name} — 원작 아트 없음', en: '{name} — no source art', zh: '{name}——无原作美术' },
    'class.unassigned': { ko: '역할 미배정', en: 'Role unassigned', zh: '未分配职责' },
    'kind.normal': { ko: '일반', en: 'Normal', zh: '普通' },
    'kind.elite': { ko: '정예', en: 'Elite', zh: '精英' },
    'kind.boss': { ko: '보스', en: 'Boss', zh: '首领' },
    'kind.chapterBoss': { ko: '챕터보스', en: 'Chapter Boss', zh: '章节首领' },

    /* ── 원정: 편성 · 지역 ── */
    /* 부대 칸 · [Report] 는 **ko 에서도 영어 그대로** [2026-09-24 사용자 지시 · SCREEN_DESIGN §4] — 부대 `{n}` 은 로마 숫자(`M.roman`).
       ~~`exp.seg.idle`(Stages)~~ 은 2026-10-18 걷혔다 — 스테이지는 원정 탭 버튼이 연다 (ADR-0661) */
    /* 관전 칸의 이름 — 부대 수가 몇이든 이름은 부대고 상태는 색만 든다 — `exp.seg.party` (SCREEN_DESIGN §4 · ADR-0316 · 하나여도 ADR-0360).
       `exp.seg.battle` 은 도움말 제목으로만 산다 */
    'exp.seg.battle': { ko: '전투 관전', en: 'Spectate', zh: '观战' },
    'exp.seg.party': { ko: 'Party {n}', en: 'Party {n}', zh: 'Party {n}' },
    /* 원정이 있는 부대 칸 — 이름 뒤에 그 부대가 있는 스테이지(`data.js:stageName`) [2026-10-06 사용자 지시 · ADR-0517] */
    'exp.seg.partyAt': { ko: 'Party {n} - {where}', en: 'Party {n} - {where}', zh: 'Party {n} - {where}' },
    // 원정이 없는 열린 부대 칸 — 흰 글씨 [2026-10-27 사용자 지시 · ADR-0912] · 자물쇠 칸은 `exp.seg.party`
    'exp.seg.partyIdle': { ko: 'Party {n} - 대기 중', en: 'Party {n} - Idle', zh: 'Party {n} - 待命' },
    // 스테이지 화면 오른쪽 위 버튼 · 도움말 소제목 (§4-1 · ADR-0661)
    'exp.seg.report': { ko: 'Report', en: 'Report', zh: '报告' },
    'exp.oneParty': {
        ko: '전투 파티는 한 팀 — 원정이 곧 전투입니다. 세 상태가 한 탭 안에서 이어집니다',
        en: 'One battle party — the expedition is the battle. Three states flow within one tab',
        zh: '战斗队伍只有一支——远征即战斗。三种状态在同一标签页内衔接',
    },
    'exp.party.h': { ko: '파티', en: 'Party', zh: '队伍' },
    /* 패널 부제는 숫자만 — 설명은 도움말 탭으로 갔다 (원문은 help.exp.party) */
    'exp.leader': { ko: '리더', en: 'Leader', zh: '队长' },
    /* 진형 (SCREEN_DESIGN §4-1) — 칸 이름 + **랭크 라벨 둘**. 템플릿은 **점 아이콘**이라 글자가 없고 키도 없다.
       ~~중열~~ 은 2026-09-09 에 삭제 — 3랭크 템플릿(1·1·1)이 「한 줄에 셋」으로 바뀌어 가운데 랭크가 사라졌다.
       `exp.form.h` 는 2026-09-09 에 지웠다가 **2026-09-10 되살렸다** [사용자 지시 · ADR-0079 가 ADR-0060 을 대체] —
       패널이 세 칸이 되면서 칸마다 이름이 서야 어디까지가 무엇인지 읽힌다 */
    'exp.form.h': { ko: '진형', en: 'Formation', zh: '阵型' },
    'exp.form.front': { ko: '전열', en: 'Front', zh: '前排' },
    'exp.form.back': { ko: '후열', en: 'Back', zh: '后排' },
    'exp.cantDepart': {
        ko: '이 편성으로는 출발할 수 없음',
        en: 'This party cannot depart',
        zh: '此编队无法出发',
    },
    'exp.party.note': {
        ko: '런이 끝나면 깎인 HP도 <b>전투불능도 무료·즉시 회복</b> — 비용은 <b>그 런이 얇아지는 것</b>입니다<br>'
            + '파티 버프는 스탯이 아니라 스킬 효과입니다 — 통솔의 전투 계수는 없습니다',
        en: 'Lost HP <b>and downed heroes are restored free and instantly</b> when the run ends — the cost is <b>a thinner party for the rest of that run</b><br>'
            + 'Party buffs are skill effects, not a stat — Leadership has no combat coefficient',
        zh: '一场结束后，损失的生命与<b>倒下状态都会免费 · 立即恢复</b>——代价是<b>该场的队伍变薄</b><br>队伍增益是技能效果而非属性——统率没有战斗系数',
    },
    'exp.bench.h': { ko: '벤치', en: 'Bench', zh: '替补' },
    'exp.bench.note': {
        ko: '<b>건설은 파견이 아닙니다</b> — 영웅을 보내지 않고 진행하는 별도 시스템이라 건설 탭이 듭니다<br>'
            + '보낸 영웅은 잠기지 않습니다 — 언제든 불러들이고 <b>흐른 만큼 비례해 받습니다</b>',
        en: '<b>Construction is not a dispatch</b> — it runs without sending heroes, so the Construction tab owns it<br>'
            + 'Dispatched heroes are never locked — recall any time and receive <b>pro rata for the time elapsed</b>',
        zh: '<b>建设不是派遣</b>——它是无需派出英雄即可推进的独立系统，因此归建设标签页管理<br>派出的英雄不会被锁定——随时可以召回，并<b>按经过的时间比例获得</b>',
    },
    'exp.commission.h': { ko: '의뢰', en: 'Commissions', zh: '委托' },
    'exp.commission.note': {
        ko: '의뢰는 <b>받아 두는 목표</b>입니다 — 전장이 열리지 않습니다. 게시판에서 골라 받아 두면 <b>평소 활동 위에 얹혀</b> 저절로 진행됩니다<br>'
            + '카드마다 <b>죄종 하나</b>가 미션을 정합니다 — 분노 처치(몬스터 · 정예 · 보스) · 시기 스킬북 읽기 · 영웅 고용 · 탐욕 분해 · 장비 획득 · 나태 재료 획득 · 폭식 강화 · 제작. <b>그 일을 할 수 있게 되면</b> 그 죄종 카드가 섞입니다<br>'
            + '<b>재료 획득은 오프라인에도 진행됩니다</b> — 연구소 생산이 채웁니다. 따로 나갈 파티도, 의뢰만의 전장도 없습니다<br>'
            + '등급은 <b>일반 · 매직 · 레어</b> — 윗 등급일수록 대상이 좁고(한 장 · 한 장소 · 한 갈래) 드물며 골드가 많습니다. 대상은 지금 갈 수 있는 곳에서만 나옵니다<br>'
            + '<b>수락하면 그 카드가 소진됩니다</b> — 받은 카드는 그 자리에서 진행 중이 되고, 받아 둘 수 있는 수는 정해져 있습니다. 그래서 「어느 의뢰를 받을까」가 결정이 됩니다<br>'
            + '<b>받은 뒤</b>에 일어난 것만 셉니다 — 이긴 라운드의 처치 · 직접 하거나 알아서 분해로 한 분해(가방이 차서 녹은 것은 빼고) · 분해와 연구소에서 얻은 재료 · 강화 시도(실패 포함) · 제작 · 스킬북 읽기 · 영웅 고용 · 이긴 라운드에 들어온 장비 · 모든 부대가 같이 채웁니다 · <b>기한은 없습니다</b><br>'
            + '[수령]할 때마다 도감의 그 <b>죄종 칸</b>에 수령 횟수가 하나씩 쌓입니다<br>'
            + '다 채우면 <b>[수령]</b>으로 골드를 받습니다 · <b>[포기]</b>는 벌이 없습니다(진행만 버림) — 비는 자리에는 새 카드가 섭니다<br>'
            + '<b>의뢰 레벨</b> — 연구소 수색 줄의 <b>의뢰</b> 지점을 연구해 올립니다(다음 레벨은 의뢰를 정해진 횟수만큼 완료해야 연구할 수 있습니다). 레벨이 오르면 <b>새로 서는 카드</b>의 목표와 골드가 같이 커지고 골드가 더 크게 오릅니다 — 연구가 끝나는 순간 받지 않은 카드는 모두 새 레벨로 다시 서고, 받아 둔 의뢰는 진행도 그대로입니다',
        en: 'A commission is a <b>goal you take on</b> — no battlefield opens. Pick one from the board and it fills itself <b>on top of what you already do</b><br>'
            + 'Each card carries <b>one Sin</b> that sets its mission — Wrath slaying (monsters · elites · bosses) · Envy reading skill books · hiring heroes · Greed salvaging · collecting gear · Sloth gathering · Gluttony enhancing · crafting. <b>Once you can do that activity</b>, cards of that Sin join the board<br>'
            + '<b>Gathering advances offline too</b> — Laboratory output fills it. There is no party to send and no commission-only battlefield<br>'
            + 'Grades are <b>Normal · Magic · Rare</b> — higher grades narrow the target (one chapter · one place · one group), appear less often and pay more gold. Targets only come from places you can reach now<br>'
            + '<b>Accepting spends that card</b> — it turns into an active commission in place, and you can only hold a set number. That is what makes "which one do I take" a decision<br>'
            + 'Only what happens <b>after you accept</b> counts — kills in won rounds · salvage you do by hand or by auto-salvage (not full-bag overflow) · materials from salvage and the Laboratory · enhance attempts (failures too) · crafting · skill books read · heroes hired · gear that arrives from won rounds · every party fills it · <b>there is no deadline</b><br>'
            + 'Each [Claim] adds one to that <b>Sin</b> in the Codex<br>'
            + 'When it is full, <b>[Claim]</b> pays the gold · <b>[Abandon]</b> costs nothing but the progress — a new card takes the empty place<br>'
            + '<b>Commission level</b> — raise it by researching the <b>Commissions</b> node on the Laboratory Search line (each next level needs a set number of completed commissions). A higher level makes <b>newly posted cards</b> ask for more and pay more, with gold rising faster — when the research finishes, every card you have not accepted is rerolled at the new level, while accepted commissions keep their progress',
        zh: '委托是<b>接下后搁着的目标</b>——不会开启战场。从委托板上挑选并接下后，它会<b>叠加在平常的活动之上</b>自动推进<br>每张卡片由<b>一种罪宗</b>决定任务——愤怒：击杀（怪物 · 精英 · 首领）· 嫉妒：阅读技能书 · 雇佣英雄 · 贪婪：分解 · 获得装备 · 怠惰：材料获取 · 暴食：强化 · 制作。<b>能够进行该活动后</b>，该罪宗的卡片就会混入<br><b>材料获取在离线时也会推进</b>——由研究所的生产填充。既没有需要另外派出的队伍，也没有委托专属的战场<br>稀有度分为<b>普通 · 魔法 · 稀有</b>——稀有度越高，目标越窄（一章 · 一个区域 · 一个类别），出现越少，金币越多。目标只会来自当前能去的地方<br><b>接受即消耗该卡片</b>——接下的卡片会在原位变为进行中，可同时接取的数量是固定的。因此“接哪个委托”就成了一个决策<br>只计算<b>接受之后</b>发生的事——胜利回合中的击杀 · 手动或自动分解进行的分解（不含背包满而熔掉的）· 从分解与研究所获得的材料 · 强化尝试（含失败）· 制作 · 阅读技能书 · 雇佣英雄 · 胜利回合中获得的装备 · 所有小队共同推进 · <b>没有期限</b><br>每次[领取]，图鉴中该<b>罪宗格</b>的领取次数就会累加一次<br>完成后用<b>[领取]</b>获得金币 · <b>[放弃]</b>没有惩罚（只舍弃进度）——空出的位置会出现新卡片<br><b>委托等级</b>——通过研究研究所搜寻线的<b>委托</b>节点提升（研究下一级需要完成规定次数的委托）。等级提升后，<b>新出现的卡片</b>的目标与金币会一同增加，且金币增幅更大——研究完成的瞬间，所有未接受的卡片都会按新等级重新出现，已接受的委托则保留进度',
    },
    'exp.zones.h': { ko: '원정 지역', en: 'Expedition Zones', zh: '远征区域' },
    // 원정 지역 [개정 2026-09-29 · PLAN_stage_segments D1] — 챕터 = 장소 {p} · 장소마다 칸 I · II · III · 칸 하나가 한 런이다(도움말 · SCREEN_DESIGN §12)
    'exp.zones.sub': {
        ko: '챕터 = 장소 {p}곳 · 장소마다 칸 I · II · III — 1런 = 칸 하나 · {r}라운드 (마지막 장소는 챕터보스 단독 1라운드 한 칸)',
        en: 'A chapter = {p} areas · each area has stages I · II · III — 1 run = 1 stage · {r} rounds (the last area is a single stage: one round against the chapter boss alone)',
        zh: '一章 = {p}个区域 · 每个区域有关卡 I · II · III——1场 = 1个关卡 · {r}回合（最后一个区域只有一关：与章节首领单独进行1回合）',
    },
    'exp.deploy': { ko: '보내기', en: 'Deploy', zh: '派遣' },
    'exp.foes': { ko: '적 구성', en: 'Enemies', zh: '敌人构成' },
    /* 적 구성 초상 아래 스킬 칸 줄의 「?」 칸 — 보스가 스폰 때 직업 풀에서 굴리는 셋째 칸 (§4-1 · ADR-0568) */
    'exp.foe.rolled': { ko: '전투마다 바뀌는 직업 스킬', en: 'Class skill — changes every fight', zh: '每场战斗都会变化的职业技能' },
    'exp.foe.grave': { ko: '{name} — 재등장까지 {t}', en: '{name} — returns in {t}', zh: '{name}——{t}后重新出现' },   // 무덤 명패의 읽는 이름 (R240 · ADR-0590)
    /* 출정 창의 칸 이름 둘 [2026-09-10 사용자 지시 · ADR-0084] — 「적 구성」·「진형」과 **같은 규격**으로 선다.
       `exp.heroes.h` 는 창 안으로 들어온 영웅 띠의 이름이다 — 탭 최상단에 있던 시절엔 이름이 없었다(패널의 첫 줄이라
       무엇인지 물을 것이 없었다). 창 안에서는 네 칸이 나란히 서므로 칸마다 이름이 있어야 경계가 읽힌다.
       `exp.go.h` 는 반복 원정 · 보내기 두 버튼이 든 칸의 이름이다 */
    'exp.go.h': { ko: '출정 방식', en: 'Departure', zh: '出征方式' },
    /* 출정 창 아래 줄 오른쪽 칸의 이름 [2026-09-14 사용자 지시 · ADR-0105] — 이 스테이지의 입장 텍스트가 든다(stage.csv:story_kr/_en) */
    'exp.story.h': { ko: '이야기', en: 'Story', zh: '故事' },
    /* 이야기 글의 `{leader}` 가 빈 파티에서 받는 대체 문구 [2026-09-15] — 괄호 없이 들어가고 뒤 조사는 이 말의 받침을 탄다 · en 은 문장 첫머리에 온다 */
    'exp.story.noLeader': { ko: '용병 하나', en: 'A mercenary', zh: '一名佣兵' },
    'exp.zones.note': {
        ko: '지역 죄종은 해당 죄종 접사의 드롭 가중치를 올립니다 — 타겟 파밍의 축<br>'
            + '<b>구조는 고정, 내용물은 랜덤</b> — 라운드 배치는 칸 III 이 정예 {e} / 보스 {b} · <b>칸 I · II 는 {b}라운드째도 정예</b>(보스 없음)이고, 몬스터 조합·정예 특성만 매 런 새로 굴려집니다. 몬스터 · 배경 · 원소는 장소의 칸 셋이 같고 레벨은 칸마다 오릅니다. <b>마지막 장소는 챕터보스 하나와 싸우는 1라운드</b>입니다<br>'
            + '중도 귀환해도 <b>루팅은 전량 보존</b>됩니다. 비용은 <b>그 출정 동안 파티가 얇아지는 것</b> + 미클리어(다음 칸 미해금)뿐입니다',
        en: "A zone's sin raises the drop weight of that sin's affixes — the axis of target farming<br>"
            + '<b>Fixed structure, random contents</b> — stage III lays out elite {e} / boss {b}; <b>stages I · II have an elite in round {b} too</b> (no boss); only monster mixes and elite traits reroll each run. Monsters, backdrop and element are shared by an area\'s three stages, and the level rises stage by stage. <b>The last area is a single round against the chapter boss</b><br>'
            + 'Retreating early <b>keeps all loot</b>. The cost is <b>a thinner party for the rest of the run</b> plus no-clear (next stage stays locked)',
        zh: '区域罪宗会提高该罪宗词缀的掉落权重——这是定向刷宝的轴心<br><b>结构固定，内容随机</b>——回合配置上，关卡 III 为精英{e} / 首领{b} · <b>关卡 I · II 在第{b}回合也是精英</b>（无首领），只有怪物组合与精英特性每场重新随机。同一区域的三个关卡共用怪物 · 背景 · 元素，等级逐关提高。<b>最后一个区域是与一只章节首领交战的1回合</b><br>中途返回也会<b>完整保留战利品</b>。代价只有<b>该次出征期间队伍变薄</b> + 未通关（下一关不解锁）',
    },

    /* ── 원정: 리포트 ── */
    'rep.clear': { ko: '클리어', en: 'Cleared', zh: '通关' },
    'rep.xp': { ko: '경험치', en: 'XP', zh: '经验' },
    'rep.rounds': { ko: '라운드', en: 'Rounds', zh: '回合' },
    'rep.downed': { ko: '전투 불능', en: 'Downed', zh: '倒下' },
    'rep.none': { ko: '없음', en: 'None', zh: '无' },
    'rep.downedN': { ko: '{n}명', en: '{n}', zh: '{n}名' },
    /* ~~'rep.levelUp'~~ · ~~'rep.injuryHead'~~ 은 2026-09-10 삭제 — 레벨업과 전투불능이 **기여 표의 영웅 줄**로 들어갔다 (ADR-0086) */
    'rep.injuryNote': {
        ko: '기다릴 것이 없습니다 — <b>런이 끝나는 순간</b> 전투불능도 깎인 HP도 전원 무료로 회복됩니다. 다음 런에는 전원이 다시 나갑니다',
        en: 'Nothing to wait for — <b>the moment the run ends</b> both downed heroes and lost HP are restored, free. Everyone goes out again on the next run',
        zh: '无需等待——<b>一场结束的瞬间</b>，倒下状态与损失的生命都会全员免费恢复。下一场全员会再次出发',
    },
    'rep.drops.h': { ko: '획득 아이템', en: 'Loot', zh: '获得物品' },   // 책 · 재료도 이 격자에 선다 (ADR-0625)
    'rep.drops.sub': { ko: '{n}개', en: { one: '{n} item', other: '{n} items' }, zh: '{n}个' },
    'rep.drops.none': { ko: '떨어진 아이템 없음', en: 'No loot', zh: '没有掉落物品' },
    'rep.book': { ko: '스킬북', en: 'Book', zh: '技能书' },
    'rep.tactic': { ko: '카드', en: 'Card', zh: '卡牌' },   // 획득 격자의 작전 카드 칸 배지 (2026-11-26 · R586 · ADR-1386)
    'rep.matGot': { ko: '획득 {n}', en: 'Gained {n}', zh: '获得{n}' },   // 획득 격자의 처치 재료 칸 툴팁 아래 줄 (2026-10-06 · ADR-0530)

    /* ── 런 목록 · 기여 (리포트 개편 2026-09-09 · SCREEN_DESIGN §4-3 · ADR-0063) ── */
    'rep.list.h': { ko: '원정 기록', en: 'Runs', zh: '远征记录' },
    'rep.list.sub': { ko: '{n}판', en: { one: '{n} run', other: '{n} runs' }, zh: '{n}场' },
    'rep.list.empty': { ko: '기록 없음', en: 'No runs', zh: '无记录' },   // 런이 없는 부대 탭 (SCREEN_DESIGN §4-3 · ADR-0622)
    // 진 런의 「왜 졌나」 — 기여 표 쓰러짐 칸 · 그 아래 남은 적 줄 (SCREEN_DESIGN §4-3 · ADR-0623). 판정 문구는 없다 — 사실만
    'rep.fall.h': { ko: '쓰러짐', en: 'Fell', zh: '倒下' },
    'rep.fall.cell': { ko: '{t} ← {who} {p}%', en: '{t} ← {who} {p}%', zh: '{t} ← {who} {p}%' },
    'rep.foes': { ko: '남은 적', en: 'Enemies left', zh: '剩余敌人' },
    'rep.foes.one': { ko: '{name} {p}%', en: '{name} {p}%', zh: '{name} {p}%' },
    'rep.foes.many': { ko: '{name} {p}% ×{n}', en: '{name} {p}% ×{n}', zh: '{name} {p}% ×{n}' },
    'rep.gap': { ko: '레벨 차 {n} → 명중 −{p}%', en: 'Level gap {n} → Hit −{p}%', zh: '等级差{n} → 命中−{p}%' },
    'rep.ago.now': { ko: '방금', en: 'just now', zh: '刚刚' },
    'rep.ago.m': { ko: '{n}분 전', en: '{n}m ago', zh: '{n}分钟前' },
    'rep.ago.h': { ko: '{n}시간 전', en: '{n}h ago', zh: '{n}小时前' },
    'rep.ago.d': { ko: '{n}일 전', en: '{n}d ago', zh: '{n}天前' },
    'rep.contrib.h': { ko: '기여', en: 'Contribution', zh: '贡献' },
    'rep.contrib.hero': { ko: '영웅', en: 'Hero', zh: '英雄' },
    'rep.contrib.dealt': { ko: '가한 피해', en: 'Damage dealt', zh: '造成伤害' },
    'rep.contrib.taken': { ko: '받은 피해', en: 'Damage taken', zh: '受到伤害' },
    'rep.contrib.kills': { ko: '처치', en: 'Kills', zh: '击杀' },
    'rep.contrib.total': { ko: '합계', en: 'Total', zh: '合计' },
    /* 영웅 줄의 레벨업 — 초상 오른쪽 이름 아래 (ADR-0086). 이름은 그 줄이 이미 들어서 안 적는다 */
    'rep.contrib.levelUp': { ko: '▲ Lv.{a} → {b}', en: '▲ Lv.{a} → {b}', zh: '▲ Lv.{a} → {b}' },
    'rep.contrib.xp': { ko: '경험치 {n}', en: '{n} XP', zh: '经验{n}' },
    'rep.log.sub': { ko: '정예 {e} / 보스 {b}', en: 'Elite {e} / Boss {b}', zh: '精英{e} / 首领{b}' },
    'rep.contract': {
        ko: '방치형 계약 — 자리를 비워도 영웅 로스터는 파괴되지 않습니다. 사건은 리포트 안에서 완결',
        en: 'The idle-game contract — the roster is never destroyed while you are away. Every event resolves inside the report',
        zh: '放置约定——即使你离开，英雄名册也不会被摧毁。事件都在报告中完结',
    },

    /* ── 영웅 띠 (캐릭터·스킬·선술집 공통 상단, 2026-08-26) — 초상화 + 이름 + 지금 하는 일 ── */
    'hs.doing.idle': { ko: '대기 중', en: 'Idle', zh: '待命中' },
    /* 원정이 **실제로 도는 동안**만 뜬다 [신설 2026-09-08 사용자 지시] — 파티에 편성만 해 둔 상태는 대기다 (SCREEN_DESIGN §5) */
    'hs.doing.expedition': { ko: '원정 중', en: 'On expedition', zh: '远征中' },
    /* 수색 중 [신설 2026-09-09] — 나가 있으면 편성이 막히므로(state.js:toggleParty) 띠가 그 이유를 든다 */
    'hs.doing.advance': { ko: '전직 중', en: 'Advancing', zh: '转职中' },
    'hs.doing.explore': { ko: '탐험 중', en: 'Exploring', zh: '探索中' },
    /* ~~'hs.doing.out'(출정 아웃)~~ 은 2026-09-08 삭제 — 띠의 「지금 하는 일」은 **대기 하나**다 (SCREEN_DESIGN §5) */

    /* ── 장비 ── */
    'eq.slots': { ko: '장비는 8칸 — 무기 · 투구 · 갑옷 · 장갑 · 신발 · 목걸이 · 반지 2. 모든 무기는 양손이라 잠기는 칸이 없습니다', en: '8 gear slots — weapon, helm, armor, gloves, boots, amulet, 2 rings. Every weapon is two-handed, so no slot is ever locked', zh: '装备共8格——武器、头盔、铠甲、手套、靴子、项链、两枚戒指。所有武器都是双手武器，不会有被锁住的格' },
    'st.atk': { ko: '데미지', en: 'Damage', zh: '伤害' },
    // 범위 표기 — 무기 피해 · 스킬 피해 · 회복량 (R90 · SCREEN_DESIGN §2 · §6 · ADR-0108). 양끝이 같으면 이 틀을 안 쓰고 한 수만 찍는다
    'st.range': { ko: '{a}~{b}', en: '{a}–{b}', zh: '{a}~{b}' },
    'st.atkType.physical': { ko: '물리', en: 'Physical', zh: '物理' },
    'st.atkType.magic': { ko: '마법', en: 'Magic', zh: '魔法' },
    'st.atkType.fire': { ko: '화염', en: 'Fire', zh: '火焰' },
    'st.atkType.cold': { ko: '냉기', en: 'Cold', zh: '冰霜' },
    'st.atkType.lightning': { ko: '전기', en: 'Lightning', zh: '闪电' },
    'st.atkType.poison': { ko: '독', en: 'Poison', zh: '毒素' },
    // 고정 피해 — 사제의 직격(skill_effect 원소 칸 `fixed` · 2026-10-06 R221 · battle_design §9). 설명창 「{v} 의 고정 피해」 · 종류 칩이 이 이름을 쓴다
    'st.atkType.fixed': { ko: '고정', en: 'True', zh: '真实' },
    'st.mitigation': { ko: '감쇠 {p}%', en: '{p}% mitigated', zh: '减免{p}%' },
    // 세부 스탯 — 옵션이 여는 축 줄 (combat_stat 행이 아니다 · SCREEN_DESIGN §6 · ADR-0291). 한 줄짜리는 아이템 옵션 줄 이름(`M.AFFIX_LABELS`)을 그대로 쓴다
    'st.fx.part': { ko: '{n} {v}', en: '{n} {v}', zh: '{n}{v}' },
    'st.fx.vsTarget': { ko: '정예 · 열별 추가 데미지', en: 'Damage vs Elite & Row', zh: '对精英、各排额外伤害' },   // 「별」 — 받는 피해 감소 줄과 짝 (2026-09-28 사용자 지시)
    'st.fx.drType': { ko: '타입별 받는 피해 감소', en: 'Damage Reduction vs Type', zh: '按类型伤害减免' },
    'st.fx.drTarget': { ko: '정예 · 열별 받는 피해 감소', en: 'Damage Reduction vs Elite & Row', zh: '精英、各排伤害减免' },
    'st.fx.normal': { ko: '생물', en: 'Creature', zh: '生物' },
    'st.fx.demon': { ko: '데몬', en: 'Demon', zh: '恶魔' },
    'st.fx.undead': { ko: '언데드', en: 'Undead', zh: '亡灵' },
    'st.fx.ele': { ko: '원소 피해량 증가', en: 'Elemental Damage Increase', zh: '元素伤害提高' },
    'st.fx.resRed': { ko: '원소 관통', en: 'Elemental Penetration', zh: '元素穿透' },   // 화염/냉기/전기/독 네 값 (2026-09-28 사용자 지시) · 영어는 「Elemental」을 뺐다 — 두 줄로 꺾여 칸 바닥에 닿았다(저항은 원소뿐이다)
    'st.fx.fire': { ko: '화염', en: 'Fire', zh: '火焰' },
    'st.fx.cold': { ko: '냉기', en: 'Cold', zh: '冰霜' },
    'st.fx.lightning': { ko: '전기', en: 'Lightning', zh: '闪电' },
    'st.fx.poison': { ko: '독', en: 'Poison', zh: '毒素' },
    'st.resCap': { ko: '/ 상한 {cap}%', en: '/ cap {cap}%', zh: '/ 上限{cap}%' },
    'st.maxhp': { ko: '최대 HP', en: 'Max HP', zh: '最大生命' },
    /* 능력치 설명 카드 — 줄에 올리면 이름 / 선 아래 **효과** (2026-10-10 사용자 지시 · SCREEN_DESIGN §2 「능력치 설명 툴팁 규격」 · ADR-0581).
       키 = 줄 id(기본 능력치 `hero_attribute.csv:attr_id` · 세부 스탯 `tip.js:DETAIL_LAYOUT`). 효과만 · 수치 없음 (CLAUDE.md 규칙 7) · 효과가 여럿이면 `<br>` 로 한 줄에 하나 */
    // 힘 · 지능 · 건강의 「채광 · 채집 · 벌목이 빨라진다」 줄은 2026-10-18 걷었다 — 연구소에 영웅이 안 앉는다 (ADR-0665)
    'st.desc.str': { ko: '평타 · 물리 스킬 피해 증가', en: 'Increases basic attack and physical skill damage', zh: '提高普通攻击、物理技能伤害' },
    'st.desc.agi': { ko: '공격 속도 · 캐스팅 속도 증가<br>일부 스킬의 타수 · 효과 증가', en: 'Faster attack and casting speed<br>More hits and stronger effects for some skills', zh: '提高攻击速度、施法速度<br>增加部分技能的攻击次数与效果' },
    'st.desc.int': { ko: '마법 스킬 피해 증가', en: 'Increases magic skill damage', zh: '提高魔法技能伤害' },
    'st.desc.vit': { ko: '레벨업마다 오르는 최대 HP 증가<br>버프 지속시간 증가', en: 'More Max HP per level-up<br>Longer-lasting buffs', zh: '提高每次升级增加的最大生命<br>延长增益持续时间' },
    'st.desc.luck': { ko: '치명타 피해 · 드랍률 · 파티 골드 획득 증가<br>일부 스킬의 추가 피해 증가', en: 'Increases Crit Damage, Item Find and Party Gold Find<br>Boosts bonus damage of some skills', zh: '提高暴击伤害、掉落率、队伍金币获取<br>提高部分技能的额外伤害' },
    'st.desc.ldr': { ko: '아군에게 거는 버프 강화 · 리더면 파티 전술 효과 증가', en: 'Strengthens the buffs you give allies · As leader, strengthens party tactics', zh: '增强对友方施加的增益；担任队长时提高队伍战术效果' },
    'st.desc.cha': { ko: '회복량 · 적에게 거는 효과 증가 · 받는 상태이상 · 디버프 시간 감소', en: 'Increases healing and the effects you put on enemies · Shortens ailments and debuffs on you', zh: '提高治疗量与对敌人施加的效果；缩短自身受到的异常状态、减益时间' },
    'st.desc.atk_physical': { ko: '평타와 물리 스킬 피해의 바탕이 되는 값', en: 'The base of basic attack and physical skill damage', zh: '普通攻击与物理技能伤害的基础值' },
    'st.desc.atk_magic': { ko: '마법 스킬 피해와 회복량의 바탕이 되는 값', en: 'The base of magic skill damage and healing', zh: '魔法技能伤害与治疗量的基础值' },
    'st.desc.action_period': { ko: '한 번 행동하는 데 걸리는 시간 — 짧을수록 자주 행동', en: 'Time per action — the lower, the more often you act', zh: '行动一次所需的时间——越短行动越频繁' },
    'st.desc.hp_max': { ko: 'HP 의 최대치 — 0 이 되면 쓰러짐', en: 'Maximum HP — the hero falls at 0', zh: '生命的最大值——降到0时倒下' },
    'st.desc.crit_rate': { ko: '공격이 치명타로 들어갈 확률', en: 'Chance for an attack to be a critical hit', zh: '攻击成为暴击的几率' },
    'st.desc.crit_damage': { ko: '치명타가 주는 피해 배율', en: 'Damage multiplier of critical hits', zh: '暴击造成的伤害倍率' },
    'st.desc.def_ignore': { ko: '적의 물리 방어를 이 비율만큼 무시', en: "Ignores this share of the enemy's Physical Defense", zh: '按此比例无视敌人的物理防御' },
    'st.desc.cooldown_reduction': { ko: '스킬 쿨타임을 이 비율만큼 감소', en: 'Shortens skill cooldowns by this %', zh: '按此比例缩短技能冷却' },
    'st.desc.defense': { ko: '받는 물리 피해 감소 — 옆의 감쇠 % 만큼 덜 받음', en: 'Reduces physical damage taken — by the mitigation % beside it', zh: '降低受到的物理伤害——按旁边的减免%少受伤害' },
    'st.desc.damage_reduction': { ko: '받는 피해를 % 만큼 줄이고 고정값만큼 더 뺌 (고정 / %)', en: 'Cuts damage taken by the %, then subtracts the flat amount (flat / %)', zh: '受到的伤害先按%降低，再减去固定值（固定 / %）' },
    'st.desc.fhr': { ko: '물리 공격에 맞아 경직되는 시간 감소', en: 'Shortens the stagger from physical hits', zh: '缩短被物理攻击击中后的僵直时间' },
    // 매력이 낸다 (2026-10-24 · R346 · ADR-0770) — 음수면 늘어난다
    'st.desc.debuff_dur_reduction': { ko: '받는 상태이상 · 디버프 시간 감소', en: 'Shortens ailments and debuffs on you', zh: '缩短自身受到的异常状态、减益时间' },
    'st.desc.res_fire': { ko: '받는 화염 피해를 이 % 만큼 감소 — 옆의 상한까지', en: 'Reduces Fire damage taken by this % — up to the cap beside it', zh: '受到的火焰伤害降低此%——最多到旁边的上限' },
    'st.desc.res_cold': { ko: '받는 냉기 피해를 이 % 만큼 감소 — 옆의 상한까지', en: 'Reduces Cold damage taken by this % — up to the cap beside it', zh: '受到的冰霜伤害降低此%——最多到旁边的上限' },
    'st.desc.res_lightning': { ko: '받는 전기 피해를 이 % 만큼 감소 — 옆의 상한까지', en: 'Reduces Lightning damage taken by this % — up to the cap beside it', zh: '受到的闪电伤害降低此%——最多到旁边的上限' },
    'st.desc.res_poison': { ko: '받는 독 피해를 이 % 만큼 감소 — 옆의 상한까지', en: 'Reduces Poison damage taken by this % — up to the cap beside it', zh: '受到的毒素伤害降低此%——最多到旁边的上限' },
    'st.desc.fx_ele': { ko: '원소마다 화염 · 냉기 · 전기 · 독 피해 증가', en: 'Increases Fire / Cold / Lightning / Poison damage, each on its own', zh: '分别提高火焰、冰霜、闪电、毒素伤害' },
    'st.desc.fx_res_red': { ko: '그 원소로 때릴 때 적의 저항을 이만큼 감소', en: "Lowers the enemy's resistance when you hit with that element", zh: '以该元素攻击时，使敌人的抗性降低此数值' },
    'st.desc.fx_vs_type': { ko: '생물 · 데몬 · 언데드 적에게 주는 피해 증가', en: 'More damage to Creature, Demon and Undead enemies', zh: '提高对生物、恶魔、亡灵敌人造成的伤害' },
    'st.desc.fx_dr_type': { ko: '생물 · 데몬 · 언데드 적에게 받는 피해 감소', en: 'Less damage taken from Creature, Demon and Undead enemies', zh: '降低受到生物、恶魔、亡灵敌人的伤害' },
    'st.desc.fx_vs_target': { ko: '정예 · 보스와 전열 · 후열 적에게 주는 피해 증가', en: 'More damage to Elites & Bosses and to front / back row enemies', zh: '提高对精英、首领以及前排、后排敌人造成的伤害' },
    'st.desc.fx_dr_target': { ko: '정예 · 보스와 전열 · 후열 적에게 받는 피해 감소', en: 'Less damage taken from Elites & Bosses and from front / back row enemies', zh: '降低受到精英、首领以及前排、后排敌人的伤害' },
    'st.desc.fx_crush': { ko: '맞힐 때 대상의 현재 HP 에 비례한 피해 추가', en: "Hits add damage based on the target's current HP", zh: '命中时追加与目标当前生命成比例的伤害' },
    'st.desc.fx_hit': { ko: '공격이 맞을 확률 증가', en: 'Raises the chance for attacks to hit', zh: '提高攻击命中的几率' },
    'st.desc.fx_counter': { ko: '맞으면 이 확률로 때린 적에게 기본 공격으로 반격', en: 'Chance to strike back with a basic attack when hit', zh: '被击中时有此几率以普通攻击反击攻击者' },
    'st.desc.life_steal': { ko: '준 피해의 이 % 만큼 HP 회복', en: 'Heals for this % of damage dealt', zh: '按造成伤害的此%恢复生命' },
    'st.desc.hp_regen': { ko: '초마다 HP 를 이만큼 회복', en: 'Restores this much HP every second', zh: '每秒恢复此数值的生命' },
    'st.desc.fx_recv': { ko: '받는 회복량 증가', en: 'Increases healing received', zh: '提高受到的治疗量' },
    'st.desc.fx_buff_dur': { ko: '내가 거는 버프와 적에게 거는 효과의 지속시간 증가', en: 'Your buffs and the effects you put on enemies last longer', zh: '延长自身施加的增益与对敌人施加效果的持续时间' },
    'st.desc.item_find': { ko: '적이 떨어뜨리는 아이템 증가', en: 'Enemies drop more items', zh: '敌人掉落更多物品' },
    'st.desc.fx_magic_find': { ko: '파티가 얻는 장비 중 레어 이상이 나오는 비중 증가', en: 'A greater share of the party’s gear drops are Rare or better', zh: '提高队伍获得的装备中稀有及以上装备的比重' },
    'st.desc.gold_find': { ko: '파티가 적에게서 얻는 골드 증가', en: 'The party earns more gold from enemies', zh: '提高队伍从敌人处获得的金币' },
    'st.desc.fx_xp': { ko: '이 영웅이 받는 전투 경험치 증가', en: 'This hero gains more combat experience', zh: '提高该英雄获得的战斗经验' },
    'eq.sins.h': { ko: '접사 죄종', en: 'Affix Sins', zh: '词缀罪宗' },
    'eq.sins.note': {
        ko: '착용 장비의 죄종 — 아이템 이름에 붙은 죄종 태그(접두 · 접미)입니다. <b>파티 전술</b>이 이 수를 셉니다<br>'
            + '<b>죄종 세트효과는 폐기</b> — 파티 전술로 이관',
        en: 'Sins on worn gear — the sin tags in item names (prefix and suffix). <b>Party tactics</b> count them<br>'
            + '<b>Sin set effects are dropped</b> — they moved to party tactics',
        zh: '已穿戴装备的罪宗——即物品名称上的罪宗标签（前缀、后缀）。<b>队伍战术</b>会计算这个数量<br><b>罪宗套装效果已废除</b>——已移至队伍战术',
    },
    'eq.sins.none': { ko: '접사 없음', en: 'No affixes', zh: '无词缀' },
    'eq.filter.all': { ko: '전체', en: 'All', zh: '全部' },
    'eq.inv.note': {
        ko: '칸에 마우스를 올리면 <b>착용 중인 장비와 나란히</b> 비교됩니다. 테두리 색 = 희귀도',
        en: 'Hover a cell to compare it <b>side by side with the equipped item</b>. Border color = rarity',
        zh: '鼠标悬停在格子上，会与<b>当前装备并排</b>比较。边框颜色=稀有度',
    },

    /* ── 캐릭터 탭 (2026-08-23 개편) — 영웅 띠 / 장비·전체·세부·스킬 4칸 / 아이템 가로 ── */
    'ch.gear.h': { ko: '장비', en: 'Equipment', zh: '装备' },
    // 장비 칸 제목 오른쪽 끝 [자동 장착] (§6 · ADR-0712 · 2026-10-22) — `ch.auto.*` 는 자동 분해 창의 것이라 접두를 가른다
    'ch.autoEq': { ko: '자동 장착', en: 'Auto-equip', zh: '自动装备' },
    'ch.autoEq.done': { ko: '장비 {n}개 장착', en: { one: 'Equipped {n} item', other: 'Equipped {n} items' }, zh: '已装备{n}件' },
    'ch.autoEq.none': { ko: '더 나은 장비 없음', en: 'No better gear', zh: '没有更好的装备' },
    'ch.attr.h': { ko: '기본 스탯', en: 'Basic Stats', zh: '基础属性' },
    'ch.attr.sub': { ko: '장비 불변', en: 'Gear-immutable', zh: '不受装备影响' },
    'ch.attr.note': {
        ko: '기본 능력치 7종은 <b>영웅이 갖고 태어납니다</b> — 장비는 단 1도 올리지 않습니다.<br>'
            + '하는 일은 둘뿐입니다: <b>전투 능력치의 계수</b>(오른쪽 칸의 괄호 표기)와 <b>파견 판정</b>.',
        en: 'The 7 attributes are <b>innate to the hero</b> — gear never raises them by even 1.<br>'
            + 'They do exactly two things: <b>scale combat stats</b> (shown in parentheses on the right) '
            + 'and <b>decide dispatch outcomes</b>.',
        zh: '7种基础属性是<b>英雄与生俱来的</b>——装备连1点也不会提高。<br>它们只做两件事：<b>战斗属性的系数</b>（右栏括号内的标记）和<b>派遣判定</b>。',
    },
    'ch.detail.h': { ko: '세부 스탯', en: 'Detailed Stats', zh: '详细属性' },
    'ch.detail.hn': { ko: '세부 스탯 {n}', en: 'Detailed Stats {n}', zh: '详细属性{n}' },
    'ch.detail.note': {
        ko: '전투 능력치는 <b>장비와 스킬이 만듭니다</b>. 값이 <b>—</b> 인 축은 0이 아니라 '
            + '<b>아직 아무 효과도 그 축에 적용되지 않음</b>을 뜻합니다 — 비어 있는 축이 곧 다음 장비의 자리입니다.<br>'
            + '괄호 안 약어 = 이 축을 미는 기본 능력치. 표는 src/data/combat_stat.csv 를 그대로 따릅니다',
        en: 'Combat stats are <b>built by gear and skills</b>. A <b>—</b> is not zero — it means '
            + '<b>nothing has touched that axis yet</b>, and an empty axis is where the next item goes.<br>'
            + 'The abbreviation in parentheses is the attribute that scales it. This table mirrors src/data/combat_stat.csv',
        zh: '战斗属性<b>由装备和技能构成</b>。数值为<b>—</b>的项不是0，而是表示<b>尚无任何效果作用于该项</b>——空着的项正是下一件装备的位置。<br>括号内缩写=推动该项的基础属性。此表完全依照src/data/combat_stat.csv',
    },
    // 기본 스탯 칸 맨 위 — 레벨 · 경험치 한 줄 (2026-09-15 · SCREEN_DESIGN §6 · ADR-0129)
    'ch.lv': { ko: 'Lv.{n}', en: 'Lv.{n}', zh: 'Lv.{n}' },
    'ch.xp': { ko: 'XP {a} / {b}', en: 'XP {a} / {b}', zh: 'XP {a} / {b}' },   // 모든 언어 `XP` 고정 — 경험치 막대 가운데 글자 (2026-11-24 사용자 지시 · ADR-1354)
    'ch.xp.max': { ko: 'MAX', en: 'MAX', zh: 'MAX' },
    // 만렙 뒤 별 — 레벨 오른쪽 별 칸 툴팁 · 능력치 줄 [+] · 확인 창 (2026-11-11 · SCREEN_DESIGN §6 · ADR-1043)
    'ch.star.name': { ko: '별', en: 'Stars', zh: '星' },   // 별 칸 설명 카드 — 능력치 줄과 같은 모양(이름 / 선 아래 효과 · SCREEN_DESIGN §2 「능력치 설명 툴팁 규격」)
    'ch.star.desc': { ko: '별 하나마다 고른 능력치 +1', en: '+1 to a chosen attribute per star', zh: '每颗星使一项所选属性+1' },
    'ch.star.add': { ko: '별 하나로 {stat} +1', en: 'Spend a star: +1 {stat}', zh: '消耗一颗星：{stat}+1' },
    'ch.star.what': { ko: '{stat} {a} → {b}', en: '{stat} {a} → {b}', zh: '{stat}{a} → {b}' },
    'ch.star.warn': { ko: '별 하나를 씁니다. 되돌릴 수 없습니다.', en: 'This uses one star and cannot be undone.', zh: '将消耗一颗星，无法撤销。' },
    // 아이템 칸 오른쪽 아래 배지 — **아이템** 레벨이다 (2026-09-18 · SCREEN_DESIGN §6 · ADR-0168).
    //   위의 `ch.lv`(영웅 레벨)와 글자가 같아도 가리키는 것이 달라 키를 나눈다
    'ch.itemLv': { ko: 'Lv.{n}', en: 'Lv.{n}', zh: 'Lv.{n}' },
    // 페이퍼돌 왼쪽 위의 잠긴 칸 — 이름은 영어가 원본 · 한글은 직역 · 툴팁은 열리는 길 한 줄 (2026-11-12 · SCREEN_DESIGN §6 · ADR-1058)
    'ch.seal': { ko: '죄종 인장', en: 'Sin Seal', zh: '罪宗印章' },
    'ch.seal.lock': { ko: '죄종 인장은 레이드에서 얻을 수 있습니다.', en: 'Sin Seals can be obtained from Raids.', zh: '罪宗印章可在突袭中获得。' },
    'ch.skill.h': { ko: '액티브 스킬', en: 'Active Skills', zh: '主动技能' },
    // 스킬 우선순위 — 소제목 오른쪽 끝 버튼 · 판 칸 줄 오른쪽 끝 버튼 하나(정한 순서 = [랜덤 적용] · 안 정함 = [순위 적용])
    //   (2026-11-16 · SCREEN_DESIGN §6 · ADR-1213 · ADR-1215 — 창 제목 `ch.skill.orderH` 는 판이 되며 걷었다 · 2026-11-17 ADR-1224 — ~~맨 아래 [랜덤으로]~~)
    'ch.skill.order': { ko: '우선순위', en: 'Priority', zh: '优先级' },
    'ch.skill.orderRandom': { ko: '랜덤 적용', en: 'Randomize', zh: '随机顺序' },
    'ch.skill.orderFix': { ko: '순위 적용', en: 'Set Order', zh: '设定顺序' },
    // 우선순위 판 맨 위 설명 한 줄 (§6 · ADR-1221 — §12 「패널에 설명 문장 없음」의 예외 · 사용자가 쓴 문장 그대로)
    'ch.skill.orderDesc': { ko: '첫 스킬 사용 시 우선순위를 설정합니다.', en: 'Sets the priority for first skill use.', zh: '设置首次使用技能时的优先级。' },
    'ch.skill.go': { ko: '마스터리', en: 'Mastery', zh: '专精' },   // 2026-11-24 사용자 「마스터리 열기가 뭐냐 마스터리로」 — 캐릭터 탭 · 전직의 방 버튼
    'ch.items.h': { ko: '아이템', en: 'Items', zh: '物品' },

    /* ── 툴팁 ── */
    'tip.equipped': { ko: '착용 중', en: 'Equipped', zh: '已装备' },
    'tip.this': { ko: '이 아이템', en: 'This Item', zh: '此物品' },
    // 교체될 자리가 빈 경우 — 옛 판의 「비어 있음」 빈 카드 한 장을 대신하는 하단 힌트 한 줄 (SCREEN_DESIGN §6 개정 2026-09-08)
    'tip.noneEquipped': { ko: '착용 중 없음', en: 'Nothing equipped', zh: '未装备' },
    'tip.noAffix': { ko: '접사 없음', en: 'No affixes', zh: '无词缀' },
    // 머리글 오른쪽 끝 종류 — 투구 · 장갑 · 신발은 갈래 + 부위(`가죽 장갑`) · 갈래 id 가 부위마다 겹쳐 갈래만으론 못 읽는다 (§6 · ADR-0526)
    'tip.kindPart': { ko: '{group} {part}', en: '{group} {part}', zh: '{group}{part}' },
    /* 장비 발동 스킬 줄 (§6) — {p} = 확률(% 포함) · {sec} = 옛 목걸이 간격 초 · {skill} = Lv.n + 스킬 이름.
       장비 접사의 타격 · 시전 · 피격 발동은 전투에 적용한다. 퇴역한 옛 목걸이 발동만 `tip.inert` 가 붙는다 */
    'tip.proc.skill': { ko: 'Lv.{lv} {skill}', en: 'Lv.{lv} {skill}', zh: 'Lv.{lv} {skill}' },
    'tip.proc.hit': { ko: '타격 시 {p} 확률로 {skill} 발동', en: '{p} chance to cast {skill} on hit', zh: '命中时有{p}几率触发{skill}' },
    'tip.proc.struck': { ko: '피격 시 {p} 확률로 {skill} 발동', en: '{p} chance to cast {skill} when struck', zh: '被击中时有{p}几率触发{skill}' },
    'tip.proc.cast': { ko: '시전 시 {p} 확률로 {skill} 발동', en: '{p} chance to cast {skill} on cast', zh: '施法时有{p}几率触发{skill}' },   // 마법 무기 발동 옵션 (2026-10-05 · R208)
    'tip.proc.interval': { ko: '{sec}초마다 {skill} 발동', en: 'Casts {skill} every {sec}s', zh: '每{sec}秒触发{skill}' },
    'tip.inert': { ko: '(미적용)', en: '(inactive)', zh: '（未生效）' },
    /* 특정 스킬 +n 줄 [신설 2026-10-08 · §6 · ADR-0535 · R225] — {skill} = 스킬 이름 · {v} = 단계 수 */
    'tip.skillPlus': { ko: '{skill} +{v}', en: '+{v} to {skill}', zh: '{skill}+{v}' },
    // 레벨당 옵션 줄 — 그 레벨의 합계 + 괄호에 옵션 그대로 「데미지 +40% (레벨당 데미지 +1%)」 (§6 · ADR-0954)
    'tip.perLevel': { ko: '{total} ({per})', en: '{total} ({per})', zh: '{total}（{per}）' },
    /* 스킬 칸 [신설 2026-09-09 · §6] — 무기가 액티브 한 칸을 통째로 정하므로(skill_design §12-1 규칙 3)
       공격력만 보고 무기를 고르지 않게 툴팁이 그것을 말한다. 칸은 스킬 설명창 몸통 그대로라 문구도 설명창 키를 쓴다.
       ~~`tip.skill`~~(「담은 스킬」 라벨)은 2026-09-15 삭제 [사용자 지시 · ADR-0139] */
    // 옵션 출처 태그 (SCREEN_DESIGN §6 · ADR-0100) — 셋이다: 베이스 옵션(그 부위면 무조건) · 죄종 이름(죄종 칸 — 문구는 `mock.js:SINS`) · 랜덤(통합옵션).
    // 출처가 없는 옛 접사는 랜덤으로 찍는다 (2026-09-08 신설 · 2026-09-11 셋으로 — R78)
    'tip.src.random': { ko: '랜덤', en: 'Random', zh: '随机' },
    'tip.src.fixed': { ko: '베이스', en: 'Base', zh: '基底' },
    'tip.src.enchant': { ko: '인챈트', en: 'Enchant', zh: '附魔' },   // 인챈트 줄 — 맨 뒤 · 죄종으로 안 센다 (ADR-1293 · R553)
    // 무기군 특성 — 성경의 버프 · 디버프 수치(태그 다섯에 같은 값)를 한 줄로 (§6 · ADR-1052 · R443) · 나머지 특성은 옵션 이름 그대로(`mock.itemAffixText`)
    'tip.weaponTrait.tagValue': { ko: '버프 · 디버프 효과 수치 +{p}', en: 'Buff & Debuff Effect Strength +{p}', zh: '增益、减益效果数值+{p}' },
    'tip.ringSlot': { ko: '반지 {n}번 칸에 착용', en: 'Goes on ring slot {n}', zh: '装备于{n}号戒指位' },
    // 아이템 툴팁 각주 — 기본은 착용품과 비교 두 장이고 Alt 동안 「이 아이템」 카드에 착용 델타가 선다 (SCREEN_DESIGN §6 · 2026-10-18 · ADR-0658)
    'tip.item.altHint': { ko: 'Alt 변화', en: 'Alt: changes', zh: 'Alt：变化' },
    // Shift 범위 각주 — 비교가 있는 카드는 둘을 한 줄에 · 범위를 다는 줄이 없는 카드엔 안 선다 (SCREEN_DESIGN §6 · ADR-0617)
    'tip.item.shiftHint': { ko: 'Shift 범위', en: 'Shift: range', zh: 'Shift：范围' },
    'tip.item.keysHint': { ko: 'Alt 변화 · Shift 범위', en: 'Alt: changes · Shift: range', zh: 'Alt：变化 · Shift：范围' },
    'tip.range': { ko: '({r})', en: '({r})', zh: '({r})' },
    'tip.lvRange': { ko: 'Lv.{r}', en: 'Lv.{r}', zh: 'Lv.{r}' },   // 발동 레벨 줄의 범위 — Shift 범위 · 도감 옵션 칸 (R567 · ADR-1368)
    // 착용 델타 — 「이 아이템」 카드의 옵션 아래 (SCREEN_DESIGN §6 · ADR-0618). 조사가 받침에 따라 갈리지 않게 「착용 시」
    'tip.delta.h': { ko: '{name} 착용 시', en: 'If {name} equips', zh: '{name}装备时' },
    'tip.delta.none': { ko: '변화 없음', en: 'No change', zh: '无变化' },
    // 착용 델타 맨 위의 스킬 줄 값 — 「라이트닝 · 켜짐 → 꺼짐 ▼」 (SCREEN_DESIGN §6 · ADR-0639)
    'tip.delta.on': { ko: '켜짐', en: 'On', zh: '开启' },
    'tip.delta.off': { ko: '꺼짐', en: 'Off', zh: '关闭' },
    // ~~`tip.up.first`·`tip.up.next`~~ 는 2026-09-08 삭제 [사용자 지시] — 툴팁의 강화 줄이 통째로 죽었다.
    // 단계는 이름 앞의 `+n` 이 들고, 비용·상한은 대장간(SCREEN_DESIGN §8-2)의 값이다. `tip.up.option` 은 09-08 에 먼저 죽었다.
    // ⚠ 옛 `tip.up.max` 는 **안 죽었다** — 대장간이 쓰고 있어 `fg.` 접두로 옮겼다(툴팁 전용이 아니게 됐으므로)
    // 영웅 · 스킬 툴팁 (2026-08-28) — 영웅 띠와 관전 유닛 카드가 같이 쓴다 (ui/tip.js)
    // ~~tip.hero.h · tip.monster.h~~ (「영웅」 · 「몬스터」 머리글) 는 2026-09-15 삭제 — 유닛 툴팁은 머리글이 없다 (ADR-0115)
    'tip.unit.altHint': { ko: 'Alt 세부 스탯', en: 'Alt: detailed stats', zh: 'Alt：详细属性' },   // 유닛 툴팁 각주 — 열 이름은 캐릭터 탭 키(ch.attr.h · ch.detail.h) 재사용 (ADR-0114)
    'tip.unit.altHintGear': { ko: 'Alt 장비 · 세부 스탯', en: 'Alt: gear & detailed stats', zh: 'Alt：装备、详细属性' },   // 편성 탭 영웅 툴팁 각주 — 첫 장이 기본 스탯이라 Alt 가 장비까지 연다 (ADR-0284)
    /* 물약 카드 [신설 2026-09-24 · SCREEN_DESIGN §2 「물약 툴팁 규격」 · ADR-0315] — 창 뱃지 툴팁과 같은 모양: 그림 + 이름 / 효과 한 줄 (CLAUDE.md 규칙 7).
       이름은 `potion.csv` · 빈 칸은 `pt.potion.empty` · 효과 줄이 이 키 하나다 — 창 뱃지의 `bt.effect.*` 와 같은 말투 */
    'tip.potion.heal': { ko: 'HP {n} 회복', en: 'Restores {n} HP', zh: '恢复{n}点生命' },

    /* ── 스킬 ── */
    /* ── 연구 탭 — 파티 전술 (2026-08-30 · SCREEN_DESIGN §13) ── */
    /* ── 편성 탭 (SCREEN_DESIGN §15 · 2026-09-21) — 오류는 결과 코드와 짝을 맞춘다(`pt.err.<코드>` — toggleParty · setPotionSlot · swapPotionSlot · rerollTactic · toggleTacticLock) ── */
    'pt.preset': { ko: 'Party {n}', en: 'Party {n}', zh: 'Party {n}' },   // 원정 세그먼트의 부대 칸과 같은 이름 — ko 에서도 영어 · `{n}` 은 로마 숫자 [2026-09-24 사용자 지시 · §15]
    'pt.potion.h': { ko: '물약', en: 'Potions', zh: '药水' },
    'pt.potion.belt': { ko: '전투 물약', en: 'Battle Potions', zh: '战斗药水' },   // 칸 줄 위 이름 — 아래 「보유 물약」과 짝 (§15 · 2026-11-24 사용자)
    'pt.potion.stock': { ko: '보유 물약', en: 'In Stock', zh: '持有药水' },   // 2026-11-24 사용자 「가진 물약 -> 보유 물약」
    'pt.potion.cfg': { ko: '물약 설정', en: 'Potion settings', zh: '药水设置' },   // 소제목 오른쪽 끝 톱니의 hover 제목 (§15 · ADR-1346)
    'pt.potion.empty': { ko: '빈 칸', en: 'Empty slot', zh: '空位' },
    // 기준 줄 — 칸 줄 아래 `−` · 이 글 · `+` (§15 · ADR-0942 · R378) · `{n}` = 고른 편성의 마시는 HP 비율(%)
    'pt.potion.use': { ko: 'HP {n}% 미만에서 마심', en: 'Drink below {n}% HP', zh: '生命低于{n}%时饮用' },
    'pt.potion.useDown': { ko: '기준 낮추기', en: 'Lower threshold', zh: '降低阈值' },
    'pt.potion.useUp': { ko: '기준 올리기', en: 'Raise threshold', zh: '提高阈值' },
    // 진형 칸 초상 아래 체력 막대의 글 (§15 · ADR-1119) · `{n}` = 최대 HP
    'pt.form.hp': { ko: 'HP {n}', en: 'HP {n}', zh: '生命{n}' },
    // 진형 칸 체력 옆 왕관 버튼에 올리면 서는 한 줄 — 리더가 아닌 영웅 (리더는 `exp.leader`) (§15 · ADR-1132)
    'pt.leader.set': { ko: '리더로 지정', en: 'Make leader', zh: '设为队长' },
    // 소제목 옆 `?` 에 올리면 서는 설명 툴팁의 본문 — 한두 문장만 · 자세한 규칙은 도움말 탭 (§15 · ADR-0464)
    'pt.help.form': { ko: '적은 전열부터 공격합니다. 전열이 모두 쓰러져야 후열이 공격받습니다.', en: 'Enemies attack the front row first. The back row is attacked only after the whole front row has fallen.', zh: '敌人会先攻击前排。前排全部倒下后，后排才会受到攻击。' },
    'pt.help.potion': { ko: 'HP가 {n}% 아래로 떨어진 영웅이 자동으로 물약을 마십니다.', en: 'A hero whose HP falls below {n}% drinks a potion automatically.', zh: '生命低于{n}%的英雄会自动饮用药水。' },
    // ~~`pt.potion.short`~~ (「모자람 — 런에서 빈 채 시작한다」) 는 2026-09-24 삭제 — 툴팁은 효과만 든다(CLAUDE.md 규칙 7). 모자란 칸은 칸이 흐린 점선으로 말한다
    'pt.err.full': { ko: '파티 가득 참', en: 'Party full', zh: '队伍已满' },
    'pt.err.exploring': { ko: '탐험 귀환', en: 'Return from exploring', lock: true, zh: '召回探索' },
    // 원정 중인 편성 · 다른 부대에서 싸우는 영웅 — 명단이 잠긴다 · 철수가 풀어 준다 (2026-11-14 · R491 — `ch.err.running` · `ex.err.running` 과 같은 글)
    'pt.err.running': { ko: '원정 철수', en: 'Retreat from the expedition', lock: true, zh: '从远征撤退' },
    'pt.err.missing': { ko: '없는 칸', en: 'No such slot', zh: '不存在的位置' },
    'pt.err.slotsFull': { ko: '물약 칸 가득 참', en: 'All potion slots are full', zh: '药水位已满' },
    'pt.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    // 작전 카드 거절 (2026-11-26 · R586 · INTERFACE §3) — equipTactic · enchantTactic · dismantleTactic
    'pt.err.slotClosed': { ko: '안 열린 칸', en: 'Slot not open', zh: '栏位尚未解锁' },
    'pt.err.noCard': { ko: '카드 없음', en: 'No such card', zh: '找不到这张卡' },
    'pt.err.sameCard': { ko: '같은 카드가 다른 칸에 있음', en: 'Same card in another slot', zh: '其他栏位已装备同名卡' },   // 한 편성에 같은 카드 한 장 (2026-11-27 · PLAN_tactic_tags D3)
    'pt.err.sameTag': { ko: '같은 태그 카드가 다른 칸에 있음', en: 'Same tag in another slot', zh: '其他栏位已装备相同标签的卡' },   // 한 편성에 같은 태그 카드 한 장
    'pt.err.storeFull': { ko: '보관 칸 가득 참', en: 'Storage full', zh: '存放位已满' },   // 사용한 카드 보관이 가득 차 새 카드로 못 바꾼다 (R589)
    'pt.err.shard': { ko: '카드 조각 부족', en: 'Not enough Card Shards', zh: '卡牌碎片不足' },
    'pt.err.invalid': { ko: '잘못된 장수', en: 'Invalid count', zh: '卡牌数量无效' },
    'rs.h': { ko: '파티 전술', en: 'Party Tactics', zh: '队伍战术' },
    /* 건설 [2026-09-22 · R137 · SCREEN_DESIGN §13 · ADR-0302] — 표 넷을 그대로 그린다. 여는 것 문장은 **대상마다 한 키**(`cn.t.<대상>` —
       어휘는 `game_logic/construction.js:TARGETS`) · 더하기는 `+{n}`. 조건 · 비용 · 잠긴 자리의 「무엇을 지어야 하나」도 여기 */
    'cn.rank': { ko: '{n}랭크', en: 'Rank {n}', zh: '{n}阶' },
    'cn.rank.no': { ko: '랭크 {n}', en: 'Rank {n}', zh: '{n}阶' },   // 상세 머리 상태 · 「다음 랭크」 · 랭크 목록의 번호 — `{n}` 은 로마 숫자(`M.roman`) · SCREEN_DESIGN §13-1
    'cn.need': { ko: '{b} {n}랭크', en: '{b} rank {n}', lock: true, zh: '{b}{n}阶' },   // 잠긴 자리의 한 줄 — 자물쇠 + 여는 조건 한 토막 (§13-1 · ADR-0699) · 첫 랭크는 아래 「건설」
    'cn.needBuild': { ko: '{b} 건설', en: 'Build {b}', lock: true, zh: '建设{b}' },   // 첫 랭크 = 짓기 — 「도서관 건설」 · 흐린 탭을 누를 때도 이 키 (§1 · ADR-0699 — ~~`nav.unbuilt`~~)
    'cn.pending': { ko: '준비 중', en: 'Coming later', lock: true, zh: '准备中' },
    'cn.soon': { ko: '(준비 중)', en: '(later)', zh: '（准备中）' },
    'cn.free': { ko: '무료', en: 'Free', zh: '免费' },
    // 상세의 세 절 — 머리 상태 한 줄 · 「다음 랭크」 · 「{건물} 랭크」 목록 [2026-09-24 · SCREEN_DESIGN §13-1 · ADR-0323]
    'cn.state.none': { ko: '미건설', en: 'Not built', zh: '未建设' },
    'cn.state.max': { ko: '최대 랭크', en: 'Max rank', zh: '最高阶' },
    'cn.next.h': { ko: '다음 랭크', en: 'Next Rank', zh: '下一阶' },
    'cn.now.none': { ko: '아직 지은 랭크 없음', en: 'Nothing built yet', zh: '尚未建设任何一阶' },
    'cn.ranks.h': { ko: '{b} 랭크', en: '{b} Ranks', zh: '{b}各阶' },
    'cn.owned': { ko: '보유 {n}', en: 'Owned {n}', zh: '持有{n}' },
    'cn.built': { ko: '{b} {n}랭크 건설 완료', en: 'Built {b} rank {n}', zh: '{b}{n}阶建设完成' },
    'cn.req.stage': { ko: '스테이지 {s} 클리어', en: 'Clear Stage {s}', zh: '通关关卡{s}' },   // 「스테이지」 를 앞에 명시 (2026-09-27 사용자 지시)
    // 장 · 난이도 클리어 — 탐험 건물 [2026-10-27 사용자 「챕터 1 클리어」 · 「노말 클리어」 · ADR-0909] · {d} = 난이도 이름(difficulty_tier.csv)
    'cn.req.chapter': { ko: '챕터 {n} 클리어', en: 'Clear Chapter {n}', zh: '通关第{n}章' },
    'cn.req.difficulty': { ko: '{d} 클리어', en: 'Clear {d}', zh: '通关{d}' },
    // 단을 적은 장 — 선술집 r4 ~ r7 [2026-10-27 사용자 「나이트메어 챕터1~나이트메어챕터4」 · R363]
    'cn.req.chapterIn': { ko: '{d} 챕터 {n} 클리어', en: 'Clear {d} Chapter {n}', zh: '通关{d}第{n}章' },
    'cn.req.hero': { ko: '최고 영웅 Lv.{have} / {need}', en: 'Top hero Lv.{have} / {need}', zh: '最高英雄Lv.{have} / {need}' },
    'cn.req.building': { ko: '{b} {n}랭크', en: '{b} rank {n}', zh: '{b}{n}阶' },
    'cn.req.built': { ko: '{b} 건설', en: 'Build {b}', zh: '建设{b}' },   // 다른 건물의 첫 랭크 — 선술집 r1 「상단 건설」 (2026-10-27 사용자 「영웅고용 - 상단 건설 필요」 · R363)
    // 거절 코드 — construct 의 err (INTERFACE §3)
    'cn.err.missing': { ko: '없는 건물', en: 'Unknown building', zh: '不存在的建筑' },
    'cn.err.maxRank': { ko: '최대 랭크', en: 'Fully built', zh: '已达最高阶' },
    'cn.err.pending': { ko: '아직 여는 기능 없음', en: 'Nothing to open yet', zh: '尚无可开启的功能' },
    'cn.err.locked': { ko: '조건 미달', en: 'Requirements not met', lock: true, zh: '条件未满足' },
    'cn.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    'cn.err.materials': { ko: '재료 부족', en: 'Not enough materials', zh: '材料不足' },
    // 여는 것 설명 — 「무엇을 할 수 있게 되나」 한 문장 · 대상마다 한 키 · 효과만(조건 · 절차는 안 적는다) [2026-09-24 사용자 지시 · ADR-0325 — 옛 값은 기능 이름]
    // 대장간 랭크 I 의 둘은 문장이 아니라 이름 토막 [2026-09-24 사용자 지시 「장비 강화, 장비 제작 이렇게만」 · 시험 중 — SCREEN_DESIGN §13-1]
    'cn.t.upgrade_item': { ko: '장비 강화', en: 'Equipment Upgrade', zh: '装备强化' },
    'cn.t.make': { ko: '장비 제작', en: 'Equipment Smithing', zh: '装备制作' },
    'cn.t.synth': { ko: '재료 합성', en: 'Material Combining', zh: '材料合成' },
    'cn.t.potion': { ko: '물약 제작', en: 'Potion Brewing', zh: '药水制作' },   // 대장간 r2 — 물약 1단계를 함께 연다 (2026-09-24 사용자 지시)
    // ~~'cn.t.storage'~~ 은 2026-10-27 삭제 — 가방 · 창고 칸은 건물 밖이다(처음부터 열림 · R361)
    'cn.t.lab_res': { ko: '연구소 자원 생산', en: 'Laboratory resource production', zh: '研究所资源生产' },   // 창고 r1 — 연구소 「자원」 줄을 연다 (R361)
    'cn.t.codex': { ko: '만난 몬스터를 도감에 기록', en: 'Record monsters you meet in the codex', zh: '将遇到的怪物记录到图鉴' },
    // 선술집의 켜기도 이름 토막 [2026-09-25 사용자 지시 「영웅고용, 영웅수색」 · 「의뢰오픈」 · 대장간과 같은 시험 중 — SCREEN_DESIGN §13-1]
    'cn.t.hire': { ko: '영웅 고용', en: 'Hero Hiring', zh: '雇佣英雄' },   // 선술집 r2 — 명단 (수색 줄 · 수색 칸은 r3 · 2026-11-16 · R516 · R519 · ADR-1216)
    'cn.t.lab_visit': { ko: '연구소 영웅 수색', en: 'Laboratory hero search', zh: '研究所英雄搜寻' },   // 선술집 r3 — 연구소 「수색」 줄을 연다 (2026-11-16 · R516 · ADR-1216)
    'cn.t.shop': { ko: '상단에서 무기 · 물약 구매', en: 'Buy weapons and potions at the trading house', zh: '在商会购买武器、药水' },
    'cn.t.shop_rows': { ko: '상단에서 방어구 · 장신구 · 스킬북 구매', en: 'Buy armor, jewelry and skill books at the trading house', zh: '在商会购买防具、饰品、技能书' },
    'cn.t.shop_trade': { ko: '교역소에서 재료 교환', en: 'Trade materials at the trading post', zh: '在交易所交换材料' },
    'cn.t.shop_special': { ko: '특수상단 방문', en: 'The special merchant starts visiting', zh: '行商来访' },
    'cn.t.craft': { ko: '매직 장비에 전용 옵션 추가', en: 'Add a special option to magic gear', zh: '为魔法装备添加专属词条' },
    'cn.t.stigma_craft': { ko: '낙인으로 장비 크래프트', en: 'Craft equipment with stigmas', zh: '用烙印打造装备' },
    'cn.t.skill_card': { ko: '스킬 카드 합성', en: 'Fuse skill cards', zh: '技能卡合成' },
    'cn.t.skillbook': { ko: '스킬북으로 스킬 습득', en: 'Learn skills from skill books', zh: '通过技能书习得技能' },   // 도서관 r1 (R179 · 2026-10-30 R398 · construction_draft §2)
    'cn.t.lab_library': { ko: '연구소 스킬북 생산', en: 'Laboratory skill book production', zh: '研究所技能书生产' },   // 도서관 r2 — 연구소 「도서관」 줄을 연다 (2026-11-15 · R504 · ADR-1198 — 옛 「스킬북 제작」)
    'cn.t.lab_forge': { ko: '연구소 대장간 연구', en: 'Laboratory blacksmith research', zh: '研究所铁匠研究' },
    'cn.t.temper': { ko: '담금질 달구기 · 덧대기', en: 'Quench: Heat · Reinforce', zh: '淬火：加热 · 加固' },   // 대장간 r4 (2026-11-24 · R571)
    'cn.t.temper_guard': { ko: '담금질 막기', en: 'Quench: Guard', zh: '淬火：防护' },   // 대장간 r4 (2026-11-24 · R571 · 옛 r5 R566)
    'cn.t.enchant': { ko: '인챈트', en: 'Enchant', zh: '附魔' },   // 대장간 r5 (2026-11-24 · R571 · 옛 r6 R566)   // 대장간 r3 — 연구소 「대장간」 줄을 연다 (2026-11-24 · R565)
    'cn.t.explore': { ko: '파티를 탐험에 파견', en: 'Send a party to explore', zh: '派遣队伍去探索' },
    // 탐험 r2 · r3 — 지도에 그 지점 아이콘이 생긴다 [2026-10-27 사용자 「상단 오픈」 · 「폐허 오픈」 · ADR-0908]
    'cn.t.explore_caravan': { ko: '상단 오픈', en: 'Unlocks Caravan', zh: '开放商队' },
    'cn.t.explore_ruins': { ko: '폐허 오픈', en: 'Unlocks Ruins', zh: '开放废墟' },
    'cn.t.raid': { ko: '목표를 털어 전리품 획득', en: 'Raid a target for loot', zh: '洗劫目标，获取战利品' },
    'cn.t.escort': { ko: '의뢰인의 상단 호위', en: "Escort a client's caravan", zh: '护送委托人的商队' },
    'cn.t.auto_salvage': { ko: '자동 분해', en: 'Auto Salvage', zh: '自动分解' },   // 창고 r3 (2026-11-24 · R571 · 옛 장비 세트 저장 자리)
    'cn.t.monster_card': { ko: '몬스터 카드 수집', en: 'Collect monster cards', zh: '收集怪物卡' },
    'cn.t.commission_board': { ko: '의뢰 게시판', en: 'Commission Board', zh: '委托告示板' },   // 선술집 r2 (이름 토막 — 위 선술집 줄과 같다 · 2026-09-25)
    'cn.t.gamble': { ko: '도박장', en: 'Gambling Hall', zh: '赌坊' },   // 선술집 r4 — 2026-11-16 R516 · 옛 r3 (이름 토막 — 위 선술집 줄과 같다 · 2026-09-27 사용자 지시)
    'cn.t.advance': { ko: '영웅 전직', en: "Advance a hero's class", zh: '英雄转职' },   // 도서관 r5 (2026-11-24 · R571)
    'cn.t.skill_craft': { ko: '스킬 북 제작', en: 'Skill Book Crafting', zh: '技能书制作' },   // 도서관 r3 (2026-11-24 · R571)
    'cn.t.book_salvage': { ko: '스킬북 분해', en: 'Skill Book Salvage', zh: '技能书分解' },   // 도서관 r4 (2026-11-24 · R571)
    // 더하기는 「대상 +n」 한 토막 — 서술형 문장으로 늘리지 않는다 (ADR-0329) · 「증가」 도 안 붙인다 — 「+」 가 이미 말한다 (ADR-0351)
    'cn.t.bag': { ko: '가방 칸 +{n}', en: 'Bag slots +{n}', zh: '背包格+{n}' },
    'cn.t.stash': { ko: '창고 칸 +{n}', en: 'Stash slots +{n}', zh: '仓库格+{n}' },
    'cn.t.roster': { ko: '영웅 로스터 +{n}', en: 'Hero roster +{n}', zh: '英雄名册+{n}' },
    'cn.t.presets': { ko: 'Party +{n}', en: 'Party +{n}', zh: 'Party +{n}' },   // 모든 언어에서 「Party」 (2026-10-27 사용자 지시 · ADR-0910)
    'cn.t.potionSlots': { ko: '원정 물약 칸 +{n}', en: 'Expedition potion slots +{n}', zh: '远征药水位+{n}' },
    'cn.t.upgrade': { ko: '강화 상한 +{n}', en: 'Upgrade cap +{n}', zh: '强化上限+{n}' },
    'cn.t.shopPerSlot': { ko: '상단 부위별 품목 +{n}', en: 'Wares per slot +{n}', zh: '商会各部位商品+{n}' },
    'cn.t.shopWeapon': { ko: '상단 무기 품목 +{n}', en: 'Weapon wares +{n}', zh: '商会武器商品+{n}' },
    'cn.t.make_level': { ko: '제작 레벨 +{n}', en: 'Smithing level +{n}', zh: '制作等级+{n}' },
    'cn.t.potion_tier': { ko: '물약 단계 +{n}', en: 'Potion tier +{n}', zh: '药水阶段+{n}' },
    // 전술 칸도 장처럼 누적 번호 — `{total}` = 그 랭크까지 연 칸 수 (SCREEN_DESIGN §13-1 · 2026-09-27 사용자 지시 「파티 전술 레벨1 해금」)
    'cn.t.tactic_slots': { ko: '파티 전술 레벨 {total} 해금', en: 'Unlocks Party Tactics Level {total}', zh: '解锁队伍战术等级{total}' },
    'cn.t.codex_level': { ko: '도감 Lv{total} 해금', en: 'Unlocks Codex Level {total}', zh: '解锁图鉴Lv{total}' },   // 도서관 r4 · r5 — {total} = 그 랭크까지 연 구간의 끝 레벨(표는 구간 수를 센다 · r1 의 도감이 첫 구간을 심는다 · `game.codexCapOf` · 2026-10-24 · R339 · 2026-11-18 R539)
    'cn.t.make_kinds': { ko: '제작 종류 +{n}', en: 'Craftable types +{n}', zh: '制作种类+{n}' },
    // 연구소 랭크 — `{total}` = 그 랭크(랭크마다 1 · 그 랭크의 지점이 열린다 · 2026-10-25 R356 — ~~채광 · 채집 · 벌목 n단계~~ 재료에 단계가 없다)
    'cn.t.resource_tier': { ko: '연구소 {total}랭크 지점 해금 · 자동 생산', en: 'Unlocks Laboratory Rank {total} nodes · Automatic production', zh: '解锁研究所{total}阶节点 · 自动生产' },
    'cn.t.lab_open': { ko: '연구소 개방', en: 'Laboratory Opens', zh: '研究所开放' },   // 연구소 랭크 I — 줄을 안 연다(줄은 관련 건물이 연다 · 2026-10-27 사용자 지시 · R361)
    'cn.t.shop_layers': { ko: '상단 품목 층 +{n}', en: 'Ware tiers +{n}', zh: '商会商品层数+{n}' },
    'cn.t.explore_regions': { ko: '탐험 지역 +{n}', en: 'Exploration regions +{n}', zh: '探索区域+{n}' },
    'cn.t.explore_slots': { ko: '동시 탐험 +{n}', en: 'Parallel explorations +{n}', zh: '同时探索+{n}' },
    'cn.t.commission_slots': { ko: '동시 의뢰 +{n}', en: 'Parallel commissions +{n}', zh: '同时委托+{n}' },
    'cn.t.recruit_quality': { ko: '고용 · 수색 품질 +{n}', en: 'Hire and search quality +{n}', zh: '雇佣、搜寻品质+{n}' },
    // 건설 [2026-09-21 ADR-0253] — 옛 「연구」. 본문은 위쪽 탭(ADR-0192 로 걷힘)을 설명하던 것을 지금 화면 기준으로 다시 썼다
    'rs.research.h': { ko: '건설', en: 'Construction', zh: '建设' },
    'rs.research.note': {
        ko: '<b>건설</b>은 건물마다 <b>랭크를 하나씩 지어</b> 기능 · 칸을 엽니다. 무엇을 여는지는 랭크 칸에 적혀 있습니다<br>'
            + '다음 랭크는 <b>조건</b>(스테이지 클리어 · 영웅 레벨 · 다른 건물의 랭크)을 채우면 <b>비용</b>을 내고 짓습니다. 지은 것은 되돌리지 않습니다<br>'
            + '안 지은 건물의 탭은 흐립니다 — 눌러도 들어가지 않고 지을 건물을 알려 줍니다. 짓는 곳은 이 탭 하나입니다. <b>준비 중</b>인 랭크는 여는 기능이 아직 없어 지을 수 없습니다',
        en: '<b>Construction</b> opens features and slots <b>one building rank at a time</b>. Each rank lists what it opens<br>'
            + 'Meet the next rank\'s <b>requirements</b> (a stage clear · a hero level · another building\'s rank), then pay its <b>cost</b>. Built ranks are never undone<br>'
            + 'Tabs of unbuilt buildings are dimmed — they stay closed until built, and clicking one names the building to build. Build here, in this tab. Ranks marked <b>coming later</b> open nothing yet and cannot be built',
        zh: '<b>建设</b>是在每座建筑上<b>逐阶建造</b>，以开启功能和格位。各阶开启什么，写在阶格里<br>下一阶需满足<b>条件</b>（关卡通关、英雄等级、其他建筑的阶）后支付<b>费用</b>建造。建好的不会撤销<br>未建设建筑的标签页会变暗——点击也进不去，只会提示需要建造的建筑。建造只在这个标签页进行。<b>准备中</b>的阶尚无可开启的功能，无法建造',
    },
    /* 건설 버튼 · 완료 표시 — 탭 이름 키(`rs.research.h`)와 같은 옛 접두를 그대로 쓴다. 나머지 건설 문구는 `cn.*` (2026-09-22 · R137) */
    'rs.rs.done': { ko: '완료', en: 'Done', zh: '完成' },
    'rs.rs.go': { ko: '건설', en: 'Build', zh: '建设' },   // 탭 이름은 명사(Construction) · 버튼은 동작(Build) — ADR-0253
    /* 전직 패널 — 도서관 탭 오른쪽 [2026-10-09 · SCREEN_DESIGN §17 · ADR-0567 — 옛 훈련장 탭의 전직 카드 · 접두 `tr.` 은 그대로 둔다].
       ~~`tr.seg.train` · `tr.slot*` · `tr.train.todo`~~ 는 훈련장과 함께 걷혔다. 전직 안내(`tr.adv.todo`)는 도움말이 같은 키로 부른다 */
    'tr.seg.adv': { ko: '전직', en: 'Advance', zh: '转职' },
    // 전직 카드 (2026-09-28 · R16 · SCREEN_DESIGN §17) — 거절은 `tr.err.<코드>`(game.advanceStart · 마스터리 전직 트리의 advanceLearn · advanceForget — ADR-0542)
    'tr.adv.level': { ko: 'Lv.{have} / {need}', en: 'Lv.{have} / {need}', zh: 'Lv.{have} / {need}' },
    'tr.adv.go': { ko: '전직', en: 'Advance', zh: '转职' },   // 전직의 방 창 [전직] — 고른 갈래가 없을 때의 이름 (ADR-0536 · ADR-1189)
    // 전직의 방 칸 · 창 (SCREEN_DESIGN §17 · ADR-1179 · 1189 — 2026-11-18 되살림 ADR-1262) — 칸의 상태 줄 · [입장] · 창 바닥 [<갈래> 전직] · 계기판 칸 이름(위 작은 글)
    'tr.room.title': { ko: '전직의 방', en: 'Chamber of Advancement', zh: '转职之间' },
    'tr.room.paths': { ko: '전직 갈래', en: 'Advancement paths', zh: '转职分支' },
    'tr.room.ready': { ko: '전직 가능', en: 'Ready to advance', zh: '可以转职' },
    'tr.room.level': { ko: 'Lv.{n}부터 전직 가능', en: 'Advancement available at Lv.{n}', zh: 'Lv.{n}起可以转职' },
    'tr.room.done': { ko: '{name} · 전직 완료', en: '{name} · Advancement complete', zh: '{name} · 转职完成' },
    'tr.room.instant': { ko: '즉시', en: 'Instant', zh: '立即' },   // 계기판 「소요 시간」 값 — 걸리는 시간이 0 일 때 (ADR-1179)
    'tr.room.irreversible': { ko: '전직 갈래는 변경할 수 없습니다.', en: 'The advancement path cannot be changed.', zh: '转职分支无法更改。' },
    'tr.room.enter': { ko: '입장', en: 'Enter', zh: '进入' },
    'tr.room.go': { ko: '{b} 전직', en: 'Advance to {b}', zh: '转职为{b}' },
    'tr.room.m.hero': { ko: '영웅', en: 'Hero', zh: '英雄' },
    'tr.room.m.skills': { ko: '스킬', en: 'Skills', zh: '技能' },   // 그 영웅의 지금 가진 스킬 카드 셋 (ADR-1189)
    'tr.room.m.level': { ko: '필요 레벨', en: 'Required Level', zh: '所需等级' },
    'tr.room.m.unlock': { ko: '해금', en: 'Unlock', zh: '解锁' },
    'tr.room.m.gold': { ko: '비용', en: 'Cost', zh: '费用' },
    'tr.room.m.time': { ko: '소요 시간', en: 'Time', zh: '所需时间' },
    'tr.room.m.path': { ko: '전직', en: 'Advancement', zh: '转职' },
    'tr.room.gold': { ko: '{g} G', en: '{g} G', zh: '{g} G' },
    // 전직 플래시 · 진행 — 시작 · 완료 · 남은 시간 · 배움 · 스킬 포인트
    'tr.adv.started': { ko: '{name} — {b} 전직 시작', en: '{name} — started advancing to {b}', zh: '{name}——开始转职为{b}' },
    'tr.adv.done': { ko: '{name} — {b} 전직 완료', en: '{name} — advanced to {b}', zh: '{name}——已转职为{b}' },   // 걸리는 시간이 0 이라 [전직] 한 번에 끝났다 (§17 · ADR-1197)
    'tr.adv.left': { ko: '{t} 남음', en: '{t} left', zh: '剩余{t}' },
    'tr.adv.learned': { ko: '배움', en: 'Learned', zh: '已学会' },
    'tr.adv.points': { ko: "스킬 포인트 {free} / {have}", en: "Skill points {free} / {have}", zh: '技能点{free} / {have}' },
    'tr.err.missing': { ko: '없는 영웅', en: 'No such hero', zh: '不存在的英雄' },
    'tr.err.class': { ko: '이 직업의 갈래가 아님', en: 'Not a path of this class', zh: '不是该职业的路线' },
    'tr.err.done': { ko: '이미 전직 완료', en: 'Already advanced', zh: '已完成转职' },
    'tr.err.working': { ko: '전직 중', en: 'Already advancing', zh: '转职中' },
    'tr.err.level': { ko: '레벨 부족', en: 'Level too low', zh: '等级不足' },
    'tr.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    'tr.err.exploring': { ko: '탐험 나가 있음', en: 'Out exploring', zh: '正在探索' },
    'tr.err.none': { ko: '전직', en: 'Advance', lock: true, zh: '转职' },
    'tr.err.learned': { ko: '배운 스킬 되돌리기', en: 'Refund the learned skill', lock: true, zh: '撤回已学技能' },
    'tr.err.skill': { ko: '이 갈래의 스킬이 아님', en: 'Not a skill of this path', zh: '不是该路线的技能' },
    'tr.err.empty': { ko: '배운 전직 스킬 없음', en: 'No advancement skill learned', zh: '未学习转职技能' },
    'tr.err.points': { ko: "스킬 포인트 없음", en: "No skill points left", zh: '没有技能点' },
    // 전직 트리 칸 ±1 의 거절 (game.advanceRank · 2026-11-13 R471)
    'tr.err.cellMax': { ko: '이 칸은 최대 랭크', en: 'This cell is at max rank', zh: '此格已达最高阶' },
    'tr.err.rowMax': { ko: '이 줄의 랭크 합이 가득 참', en: 'This row is full', zh: '此行的阶数总和已满' },
    'tr.err.zero': { ko: '되돌릴 랭크 없음', en: 'No rank to refund', zh: '没有可撤回的阶' },
    'tr.err.line': { ko: '없는 줄', en: 'No such row', zh: '不存在的行' },
    'tr.err.slot': { ko: '없는 칸', en: 'No such cell', zh: '不存在的格' },
    'tr.adv.todo': { ko: "<b>{b} {n}랭크</b>부터 전직할 수 있습니다. 세 갈래 중 하나를 고르며 갈래는 되돌릴 수 없습니다. 전직 후 <b>마스터리 → 전직 트리</b>에서 공용 스킬 포인트로 메인을 배웁니다. 메인 강화는 영웅 레벨 조건을 만족해야 하며, 되돌리면 투자 포인트를 공용 지갑에 돌려받습니다.", en: "Advancement opens at <b>{b} rank {n}</b>. Choose one of three paths; the path cannot be undone. Then learn a main skill in <b>Mastery → Advancement Tree</b> using shared skill points. Further main ranks require the corresponding hero level. Refunding returns invested points to the shared pool.", zh: '<b>{b}{n}阶</b>起可以转职。从三条路线中选择一条，路线无法撤销。转职后在<b>专精 → 转职树</b>中用共用技能点学习主技能。提升主技能需满足英雄等级条件；撤回时，投入的点数会返还到共用点数池。' },
    'rs.open': { ko: '열린 칸', en: 'Slots Open', zh: '已开启格' },
    'rs.allOpen': { ko: '전부 열림', en: 'All slots open', zh: '全部开启' },
    // 연구소 단계 상자 — 산출물 옆 시간당 생산량 (SCREEN_DESIGN §8 · ADR-0665 — ~~기본 · 현재 · 효율 +n%~~ 는 영웅 배치와 함께 걷었다)
    'dp.perHour': { ko: '{n}/시간', en: '{n}/h', zh: '{n}/小时' },
    // 지점 레벨 — 트리 노드의 Lv / 최대 · 고른 지점의 Lv 눈금 · 상한 · 연구가 끝난 플래시 · 트리 머리의 오프라인 최대 (SCREEN_DESIGN §8 · ADR-0684 · ~~칸 레벨 · [레벨 올리기]~~ R288 → [연구] `dp.res.go`)
    'dp.lv': { ko: 'Lv {n}', en: 'Lv {n}', zh: 'Lv {n}' },
    'dp.lvTag': { ko: 'Lv.{n}', en: 'Lv.{n}', zh: 'Lv.{n}' },   // 트리 노드 원 오른쪽 아래 배지 — 스킬 `sk.lvTag` · 아이템 칸과 같은 글 (ADR-0696 · ADR-0576)
    'dp.lvOf': { ko: 'Lv {n} / {max}', en: 'Lv {n} / {max}', zh: 'Lv {n} / {max}' },
    'dp.lvTop': { ko: '최대 레벨', en: 'Max Level', zh: '最高等级' },
    'dp.next.h': { ko: '다음 레벨', en: 'Next Level', zh: '下一级' },   // 고른 칸의 소제목 — 건설 「다음 랭크」(`cn.next.h`)와 같은 자리 (ADR-0674)
    'dp.lvList.h': { ko: '{name} 레벨', en: '{name} Levels', zh: '{name}等级' },   // 고른 지점의 레벨 목록 소제목 — 건설 「{건물} 랭크」(`cn.ranks.h`)와 같은 자리 (ADR-0694)
    'dp.lvDone': { ko: '{name} Lv {n}', en: '{name} Lv {n}', zh: '{name} Lv {n}' },
    'dp.offline': { ko: '재료 오프라인 최대 {h}시간', en: 'Offline materials up to {h}h', zh: '离线材料最多累计{h}小时' },
    'dp.err.maxUp': { ko: '최대 레벨', en: 'Already at max level', zh: '已达最高等级' },
    'dp.err.rank': { ko: '연구소 랭크 부족', en: 'Laboratory rank too low', zh: '研究所阶不足' },
    'dp.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },
    'dp.err.materials': { ko: '재료 부족', en: 'Not enough materials', zh: '材料不足' },
    'dp.err.busy': { ko: '다른 연구 진행 중', en: 'Another research is in progress', zh: '其他研究进行中' },
    'dp.err.full': { ko: '등록 칸 가득 참', en: 'No free seats', zh: '派驻位已满' },
    'dp.err.empty': { ko: '진행 중인 연구 없음', en: 'No research in progress', zh: '没有进行中的研究' },
    'dp.err.missing': { ko: '없는 영웅', en: 'Hero not found', zh: '不存在的英雄' },
    // 줄 등록 — 연구소 띠 위칸의 「등록 안 함」 · 등록 창 머리 (SCREEN_DESIGN §8 · ADR-0677) · ~~`dp.reg.h`(고른 칸의 등록 자리 소제목)~~ 는 영웅 칸이 줄 카드로 가며 걷었다 (ADR-0681)
    'dp.reg.none': { ko: '미등록', en: 'Unassigned', zh: '未派驻' },
    'dp.reg.modal': { ko: '{line} — 영웅 등록', en: '{line} — Assign Heroes', zh: '{line}——派驻英雄' },
    // 등록 창 — 고른 카드 위칸(지금 줄 → 이 줄) · 아래 바뀌는 것 한 줄씩 + 사라지는 것(빨강) · 고른 수 / 칸 · [적용] (SCREEN_DESIGN §8 · ADR-1154)
    'dp.reg.change': { ko: '{from} → {to}', en: '{from} → {to}', zh: '{from} → {to}' },
    'dp.reg.lose.in': { ko: '{name} · {to} 등록', en: '{name} · join {to}', zh: '{name} · 派驻到{to}' },
    'dp.reg.lose.move': { ko: '{name} · {from} → {to}', en: '{name} · {from} → {to}', zh: '{name} · {from} → {to}' },
    'dp.reg.lose.out': { ko: '{name} · {from} 등록 해제', en: '{name} · leave {from}', zh: '{name} · 撤出{from}' },
    'dp.reg.lose.skill': { ko: '숙련 {p}%', en: 'Mastery {p}%', zh: '熟练度{p}%' },
    'dp.reg.lose.visit': { ko: '수색 시계 {t}', en: 'Search clock {t}', zh: '搜寻计时{t}' },
    'dp.reg.lose.held': { ko: '찾아 둔 {name} 잃음', en: 'Loses found {name}', zh: '失去已找到的{name}' },
    'dp.reg.lose.reset': { ko: '{what} 처음부터', en: '{what} reset', zh: '{what}从头开始' },
    'dp.reg.count': { ko: '{n} / {cap}', en: '{n} / {cap}', zh: '{n} / {cap}' },
    'dp.reg.apply': { ko: '적용', en: 'Apply', zh: '应用' },
    // 얻은 재료 플래시 — 미니게임이 쓴다(옛 파견 관전 창의 떨어지는 재료 · 창은 2026-10-18 걷었다)
    'dp.watch.gain': { ko: '+{n} {item}', en: '+{n} {item}', zh: '+{n} {item}' },
    // 자원 미니게임 — 창 머리 · 시작 / 결과 판 · 판 위 머리 (2026-10-06 · SCREEN_DESIGN §8 · ADR-0532) · ~~`mg.play`(연구소의 [미니게임] 버튼)~~ 은 2026-10-21 숨김으로 걷었다 — 창은 개발용 `?dev=mg` 만 연다 (ADR-0682)
    'mg.title': { ko: '{post} 미니게임', en: '{post} Minigame', zh: '{post}小游戏' },
    'mg.start': { ko: '플레이', en: 'Play', zh: '开始' },
    'mg.again': { ko: '한 판 더', en: 'Play again', zh: '再来一局' },
    'mg.hint.mine': { ko: '잠깐 반짝이는 광맥을 한 번에. 위험한 바위와 빈 곳은 피하세요.', en: 'One click for each fleeting vein. Avoid unstable rocks and empty spots.', zh: '一下点中转瞬闪光的矿脉。避开危险的岩石和空地。' },
    'mg.hint.gather': { ko: '약초를 꾹 잡고, 초록 구간에서 놓으세요. 독초는 그대로 두세요.', en: 'Hold the herb, release in the green zone. Leave poison plants alone.', zh: '按住草药，在绿色区间松开。毒草不要碰。' },
    'mg.hint.log': { ko: '왼쪽 · 오른쪽을 눌러 베기 · 내 쪽 가지 피하기', en: 'Chop from the left or right · Dodge branches on your side', zh: '点击左侧或右侧砍伐 · 躲开自己这一侧的树枝' },
    'mg.combo': { ko: '콤보 {n} ×{m}', en: 'Combo {n} ×{m}', zh: '连击{n} ×{m}' },
    'mg.best': { ko: '최고 콤보 {n}', en: 'Best combo {n}', zh: '最高连击{n}' },
    'mg.name.mine': { ko: '찰나의 광맥', en: 'Fleeting Veins', zh: '刹那矿脉' },
    'mg.name.gather': { ko: '약초의 숨결', en: 'Herbal Rhythm', zh: '草药之息' },
    'mg.name.log': { ko: '숲의 박자', en: 'Timber Rhythm', zh: '林间节拍' },
    'mg.eyebrow': { ko: '손끝으로 모으는 작은 모험', en: 'A LITTLE HANDS-ON ADVENTURE', zh: '指尖上的小冒险' },
    'mg.finished': { ko: '오늘의 수확', en: 'YOUR HARVEST', zh: '今日收获' },
    'mg.result': { ko: '수확을 마쳤어요', en: 'Harvest complete', zh: '收获完成' },
    'mg.rule.mine': { ko: '30초 · 오클릭 한 번이면 종료', en: '30 seconds · One mistake ends the run', zh: '30秒 · 点错一次即结束' },
    'mg.rule.gather': { ko: '30초 · 중앙에 놓으면 추가 수확', en: '30 seconds · Center release earns a bonus', zh: '30秒 · 在中央松开可额外收获' },
    'mg.rule.log': { ko: '40마디 · 가지를 피해 좌우로', en: '40 logs · Switch sides to dodge branches', zh: '40段 · 左右移动躲避树枝' },
    'mg.direct': { ko: '캔 만큼 바로 획득', en: 'Keep everything you harvest', zh: '采多少，得多少' },
    'mg.reward': { ko: '이번 수확', en: 'HARVESTING', zh: '本次收获' },
    'mg.harvest': { ko: '수확', en: 'harvested', zh: '收获' },
    'mg.onechance': { ko: '오클릭 시 종료', en: 'One mistake ends the run', zh: '点错即结束' },
    'mg.comboCount': { ko: '{n} 연속', en: '{n} streak', zh: '{n}连击' },
    'mg.comboWait': { ko: '콤보를 이어보세요', en: 'Build your streak', zh: '保持连击吧' },
    'mg.controls.mine': { ko: '광맥 = 한 번 클릭  ·  붉은 경고 바위·빈 곳 = 종료  ·  놓쳐도 계속', en: 'Vein: click once  ·  Red warning rock / empty spot: run ends  ·  Missing a vein is safe', zh: '矿脉=点击一次  ·  红色警告岩石、空地=结束  ·  错过也可继续' },
    'mg.controls.gather': { ko: '약초를 꾹 누르기 → 초록 구간에 놓기  ·  스페이스키도 가능  ·  독초는 건너뛰기', en: 'Hold herb → release in green  ·  Or hold Space  ·  Skip poison plants', zh: '按住草药 → 在绿色区间松开  ·  也可用空格键  ·  跳过毒草' },
    'mg.controls.log': { ko: '왼쪽·오른쪽 클릭 또는 ← → / A D  ·  내려올 가지를 보고 반대쪽에서 베기', en: 'Click left / right or use ← → / A D  ·  Chop opposite the incoming branch', zh: '点击左侧、右侧或按← → / A D  ·  看清落下的树枝，在另一侧砍伐' },
    'mg.ready': { ko: '준비하세요', en: 'GET READY', zh: '准备' },
    'mg.cell': { ko: '채광 지점 {n}', en: 'Mining spot {n}', zh: '采矿点{n}' },
    'mg.target.good': { ko: '광맥', en: 'VEIN', zh: '矿脉' },
    'mg.target.rare': { ko: '희귀 +3', en: 'RARE +3', zh: '稀有+3' },
    'mg.target.bad': { ko: '위험', en: 'DANGER', zh: '危险' },
    'mg.empty': { ko: '빈 곳 · 누르면 종료', en: 'Empty spot · clicking ends the run', zh: '空地 · 点击即结束' },
    'mg.hold': { ko: '꾹 누르세요', en: 'HOLD', zh: '按住' },
    'mg.power': { ko: '당기는 힘', en: 'PULL STRENGTH', zh: '拉力' },
    'mg.release': { ko: '지금 놓으세요!', en: 'RELEASE NOW!', zh: '现在松开！' },
    'mg.keepHolding': { ko: '초록 구간까지…', en: 'Aim for green…', zh: '坚持到绿色区间……' },
    'mg.leave': { ko: '손대지 마세요', en: 'DO NOT PICK', zh: '不要碰' },
    'mg.plant.good': { ko: '싱싱한 약초', en: 'FRESH HERB', zh: '新鲜草药' },
    'mg.plant.rare': { ko: '희귀 약초 · 수확 3배', en: 'RARE HERB · TRIPLE HARVEST', zh: '稀有草药 · 收获3倍' },
    'mg.plant.bad': { ko: '독초 · 건드리지 않기', en: 'POISON · LEAVE IT ALONE', zh: '毒草 · 不要碰' },
    'mg.next': { ko: '다음 약초를 찾는 중…', en: 'Finding the next herb…', zh: '正在寻找下一株草药……' },
    'mg.perfect': { ko: '완벽! +1', en: 'PERFECT! +1', zh: '完美！+1' },
    'mg.failed': { ko: '실패 −♥', en: 'MISSED −♥', zh: '失败 −♥' },
    'mg.left': { ko: '왼쪽 베기', en: 'Chop left', zh: '向左砍' },
    'mg.right': { ko: '오른쪽 베기', en: 'Chop right', zh: '向右砍' },
    'mg.why.mistake': { ko: '잘못된 곳을 눌렀어요 · 지금까지 캔 재료는 받았어요', en: 'Wrong target · Your harvest is safe', zh: '点错了地方 · 已采到的材料都已收下' },
    'mg.why.quit': { ko: '수확을 마무리했어요', en: 'Harvest collected', zh: '收获结束了' },
    'mg.why.time': { ko: '시간 끝', en: "Time's up", zh: '时间到' },
    'mg.why.lives': { ko: '목숨 소진', en: 'Out of lives', zh: '机会用尽' },
    'mg.why.done': { ko: '나무를 모두 벰', en: 'Tree felled', zh: '树已全部砍完' },
    'mg.err.post': { ko: '미니게임이 없는 곳', en: 'No minigame here', zh: '此处没有小游戏' },
    // 작전 카드 세 칸 [2026-11-26 · R586 · SCREEN_DESIGN §15 · ADR-1383 · ADR-1384] — 행 = 카드 + 옵션 줄 둘 · 줄마다 [인챈트] · 카드를 누르면 가방 창(어느 칸이든 같은 가방 · 2026-11-27)
    'rs.slotNo': { ko: '칸 {n}', en: 'Slot {n}', zh: '栏位 {n}' },   // 실험실 결투 편성의 칸 이름 — 갈래가 없어 번호만 (2026-11-27 · PLAN_tactic_tags D1)
    // 작전 카드 태그 — 한 편성에 태그당 한 장
    'tc.tag.formation': { ko: '진형', en: 'Formation', zh: '阵型' },
    'tc.tag.support': { ko: '지원', en: 'Support', zh: '支援' },
    'tc.tag.attack': { ko: '공격', en: 'Attack', zh: '攻击' },
    'tc.tag.stratagem': { ko: '계략', en: 'Stratagem', zh: '计谋' },
    'tc.tag.morale': { ko: '사기', en: 'Morale', zh: '士气' },
    'rs.shards': { ko: '카드 조각 {n}', en: 'Card Shards {n}', zh: '卡牌碎片 {n}' },   // 진척 줄 오른쪽 끝 · 가방 창 머리
    'rs.enchant': { ko: '인챈트 {g}G · 조각 {s}', en: 'Enchant {g}G · Shard ×{s}', zh: '附魔 {g}G · 碎片 ×{s}' },   // 줄마다 — 비용을 버튼에 적는다
    'rs.ench.done': { ko: '인챈트 — {grade} {eff}', en: 'Enchanted — {grade} {eff}', zh: '附魔完成 · {grade} {eff}' },
    'rs.tip.sub': { ko: '{tag} · {sin} · {grade}', en: '{tag} · {sin} · {grade}', zh: '{tag} · {sin} · {grade}' },   // 카드 툴팁 둘째 줄 — 태그 · 죄종 · 등급
    'rs.bag.h': { ko: '작전 카드', en: 'Tactic Cards', zh: '战术卡' },   // 가방 창 머리 — 어느 칸을 눌러도 같은 가방 (2026-11-27)
    'rs.bag.equip': { ko: '장착', en: 'Equip', zh: '装备' },
    // 가방 창 두 덩어리 — 위 사용한 카드 · 아래 새 카드 (§15 · ADR-1390 · R589)
    'rs.bag.inUse': { ko: '사용 중인 카드', en: 'Equipped Cards', zh: '已装备的卡' },   // 가방 창 맨 위 덩어리 — 편성마다 칸 셋에 든 카드 (ADR-1428 · ADR-1430 · 2026-11-27)
    'rs.bag.used': { ko: '사용한 카드', en: 'Used Cards', zh: '使用过的卡' },
    'rs.bag.new': { ko: '새 카드', en: 'New Cards', zh: '新卡' },
    // 등급 탭 · 고른 카드 줄 (§15 · ADR-1399)
    'rs.bag.all': { ko: '전체', en: 'All', zh: '全部' },
    'rs.bag.lock.running': { ko: '원정 중에는 카드를 뺄 수 없습니다', en: "Cards can't be removed during an expedition", zh: '远征期间无法卸下卡牌' },
    'rs.bag.lock.exploring': { ko: '탐험 중에는 카드를 뺄 수 없습니다', en: "Cards can't be removed while exploring", zh: '探索期间无法卸下卡牌' },
    'rs.bag.dis': { ko: '분해 (조각 +{n})', en: { one: 'Dismantle (+{n} Shard)', other: 'Dismantle (+{n} Shards)' }, zh: '分解（碎片 +{n}）' },
    'rs.bag.disConfirm': { ko: '정말 분해 (조각 +{n})', en: { one: 'Confirm (+{n} Shard)', other: 'Confirm (+{n} Shards)' }, zh: '确认分解（碎片 +{n}）' },
    'rs.equip.done': { ko: '{card} 장착', en: '{card} equipped', zh: '已装备{card}' },
    'rs.dis.done': { ko: '카드 조각 +{n} — 가진 조각 {total}', en: { one: '+{n} Card Shard — {total} owned', other: '+{n} Card Shards — {total} owned' }, zh: '卡牌碎片 +{n} · 现有 {total}' },
    // 열 이름 줄 — 카드 목록 위 · 행의 세로줄 (ADR-1383) · `rs.col.state` · `rs.col.sin` 은 연구 탭 · 실험실이 쓴다
    'rs.col.state': { ko: '상태', en: 'State', zh: '状态' },
    'rs.col.sin': { ko: '죄종', en: 'Sin', zh: '罪宗' },
    'rs.col.card': { ko: '카드', en: 'Card', zh: '卡牌' },
    'rs.col.opt': { ko: '옵션', en: 'Options', zh: '词条' },
    // 버프 몫 = 리더 통솔 + 그 줄 죄종 점수가 더한 % — 출처는 카드 아래 판 (ADR-1048 · ADR-1383)
    'rs.col.extra': { ko: '버프 몫', en: 'Buff Share', zh: '增益加成' },
    'rs.col.ench': { ko: '인챈트', en: 'Enchant', zh: '附魔' },
    // 카드 이름 — **영어가 원본 · 한글은 직역**(CLAUDE.md 규칙 6) · 한글 여덟은 사용자가 고른 역사 전술 이름 · 독화살 · 불화살 · 치중대와 영어 열하나는 ⚠임시(tactic_card_design §4)
    'tc.name.duel': { ko: '일기토', en: 'Single Combat', zh: '单挑' },
    'tc.name.wedge': { ko: '쐐기진', en: 'Wedge Formation', zh: '楔形阵' },
    'tc.name.trojan': { ko: '트로이 목마', en: 'Trojan Horse', zh: '特洛伊木马' },
    'tc.name.charge': { ko: '기사 돌격', en: "Knight's Charge", zh: '骑士冲锋' },
    'tc.name.shieldwall': { ko: '방패벽', en: 'Shield Wall', zh: '盾墙' },
    'tc.name.guard': { ko: '친위대', en: 'Royal Guard', zh: '近卫队' },
    'tc.name.turtle': { ko: '거북 진형', en: 'Tortoise Formation', zh: '龟甲阵' },
    'tc.name.retreat': { ko: '거짓 후퇴', en: 'Feigned Retreat', zh: '佯退' },
    'tc.name.poison_arrow': { ko: '독화살', en: 'Poison Arrow', zh: '毒箭' },
    'tc.name.fire_arrow': { ko: '불화살', en: 'Fire Arrow', zh: '火箭' },
    'tc.name.guardian': { ko: '수호자', en: 'Guardian', zh: '守护者' },
    'tc.desc.guardian': { ko: '전열에 살아 있는 아군 영웅이 리더 한 명뿐이면 아군 후열이 받는 피해가 {p1} 감소한다.', en: 'While your leader is the only living allied hero in the front row, allies in the back row take {p1} less damage.', zh: '我方领袖是前排唯一存活的我方英雄时，我方后排受到的伤害降低 {p1}。' },
    'tc.name.unity': { ko: '일치단결', en: 'United Front', zh: '众志成城' },
    'tc.desc.unity': { ko: '아군 영웅이 {p2}명 이상 살아 있는 동안 아군 영웅의 직격 피해가 {p1} 증가한다.', en: 'While at least {p2} allied heroes are alive, allied heroes deal {p1} more direct damage.', zh: '至少有 {p2} 名我方英雄存活时，我方英雄的直接伤害提高 {p1}。' },
    'tc.name.dying_curse': { ko: '최후의 저주', en: 'Dying Curse', zh: '临终诅咒' },
    'tc.desc.dying_curse': { ko: '아군 영웅이 쓰러질 때마다 적의 양수 방어력과 모든 양수 원소 저항이 현재 값에서 {p1}씩 감소한다. 라운드당 최대 {p2}회.', en: 'Whenever an allied hero falls, enemies lose {p1} of their current positive defense and each positive elemental resistance. Stacks up to {p2} times per round.', zh: '每当一名我方英雄倒下，敌方当前为正的防御力和各项元素抗性降低 {p1}，每回合最多叠加 {p2} 次。' },
    'tc.name.giant': { ko: '거인', en: 'Giant', zh: '巨人' },
    'tc.name.desperate_charge': { ko: '결사돌진', en: 'Desperate Charge', zh: '决死冲锋' },
    'tc.name.mutual_cover': { ko: '방패진', en: 'Shield Formation', zh: '盾阵' },
    'tc.desc.mutual_cover': { ko: '전열 2명·후열 1명으로 배치하면, 전열 영웅 한 명이 받는 피해의 {p1}를 다른 전열 영웅이 대신 받는다.', en: 'Deploy two heroes in front and one in back. When either front hero takes damage, the other takes {p1} of it instead.', zh: '部署为前排两人、后排一人时，一名前排英雄受到伤害，另一名前排英雄会代其承受其中的 {p1}。' },
    'tc.name.open_order': { ko: '산개 대형', en: 'Open Order', zh: '散开阵形' },
    'tc.name.iron_line': { ko: '배수진', en: 'Last Stand', zh: '背水阵' },
    'tc.desc.iron_line': { ko: '출전 영웅이 모두 전열에 위치하면, 처음으로 쓰러질 피해를 받는 아군 영웅이 체력 1로 버틴다. 전투당 한 번 발동한다.', en: 'Deploy all heroes in front. Once per battle, the first ally who would fall survives with 1 HP.', zh: '出战英雄全部部署在前排时，首名受到致命伤害的友方英雄会保留 1 点生命。每场战斗触发一次。' },
    'tc.name.pursuit': { ko: '추격진', en: 'Pursuit Formation', zh: '追击阵' },
    'tc.desc.pursuit': { ko: '출전영웅이 모두 전열에 위치하면 단일 공격은 노릴 수 있는 적 중 남은 체력 비율이 가장 낮은 적을 우선한다.', en: 'If all heroes deploy in front, single-target attacks prioritize the eligible enemy with the lowest percentage of HP remaining.', zh: '出战英雄全部部署在前排时，单体攻击优先选择可攻击目标中剩余生命比例最低的敌人。' },
    'tc.name.hammer_anvil': { ko: '학익진', en: 'Crane Wing Formation', zh: '鹤翼阵' },
    'tc.desc.hammer_anvil': { ko: '전열 2명·후열 1명으로 배치하면, 적 전열 유닛이 받는 피해의 {p1}를 적 후열 유닛들이 나눠 받는다.', en: 'Deploy two heroes in front and one in back. Enemy back-row units share {p1} of the damage an enemy front-row unit would take.', zh: '部署为前排两人、后排一人时，敌方前排单位所受伤害的 {p1} 由敌方后排单位平摊。' },
    'tc.name.field_medics': { ko: '후방 의무대', en: 'Field Medics', zh: '后方医疗队' },
    'tc.desc.field_medics': { ko: '전열 2명·후열 1명으로 배치하면 전열 두 영웅이 받는 회복량이 {p1}증가한다.', en: 'Deploy two heroes in front and one in back. Both front heroes receive {p1} more healing.', zh: '部署为前排两人、后排一人时，两名前排英雄受到的治疗量提高 {p1}。' },
    'tc.name.vanguard_barrier': { ko: '선봉 방벽', en: 'Vanguard Bulwark', zh: '先锋壁垒' },
    'tc.desc.vanguard_barrier': { ko: '전열 1명·후열 2명으로 배치하면 라운드 시작 시 전열 영웅이 자신의 최대 체력 {p1}만큼 보호막을 얻는다.', en: 'Deploy one hero in front and two in back. At the start of each round, the front hero gains a barrier equal to {p1} of their maximum HP.', zh: '部署为前排一人、后排两人时，每回合开始，前排英雄获得相当于自身最大生命值 {p1} 的护盾。' },
    'tc.name.aimed_fire': { ko: '정밀 사격', en: 'Aimed Fire', zh: '精准射击' },
    'tc.desc.aimed_fire': { ko: '전열 1명·후열 2명으로 배치하면 후열 두 영웅의 단일 공격 치명타 확률이 {p1}p 증가한다.', en: 'Deploy one hero in front and two in back. Both rear heroes gain +{p1} critical strike chance on single-target attacks.', zh: '部署为前排一人、后排两人时，两名后排英雄的单体攻击暴击率额外增加 {p1}。' },
    'tc.name.volley': { ko: '집중포화', en: 'Focused Fire', zh: '集中火力' },
    'tc.desc.volley': { ko: '출전 영웅이 모두 후열에 위치하면 적 전열 유닛에게 입히는 피해가 {p1} 증가한다.', en: 'If all heroes deploy in the back row, your side deals {p1} more damage to enemy front-row units.', zh: '出战英雄全部部署在后排时，对敌方前排单位造成的伤害提高 {p1}。' },
    'tc.name.rapid_deployment': { ko: '신속 전개', en: 'Rapid Deployment', zh: '快速展开' },
    'tc.desc.rapid_deployment': { ko: '출전영웅이 모두 후열에 위치하면 라운드 시작 시 각 영웅의 행동 게이지가 {p1} 찬다.', en: 'If all heroes deploy in back, each hero fills {p1} of their action gauge at the start of each round.', zh: '出战英雄全部部署在后排时，每回合开始，各英雄的行动条增加 {p1}。' },
    'tc.desc.open_order': { ko: '출전 영웅이 모두 후열에 위치하면 광역 공격으로 받는 피해가 {p1} 감소한다.', en: 'If you deploy all your heroes in the back row, your side takes {p1} less damage from area attacks.', zh: '出战英雄全部部署在后排时，受到的范围攻击伤害降低 {p1}。' },
    'tc.desc.desperate_charge': { ko: '출전영웅이 모두 전열에 위치하면 적에게 입히는 피해가 {p1}증가한다.', en: 'If you deploy all your heroes in the front row, your side deals {p1} more damage to enemies throughout the battle.', zh: '出战英雄全部部署在前排时，整场战斗对敌人造成的伤害提高 {p1}。' },
    'tc.desc.giant': { ko: '살아 있는 아군 영웅이 한 명이면 그 영웅의 일곱 기본 능력치가 {p1} 증가한다.', en: 'While exactly one allied hero is alive, all seven of that hero’s attributes increase by {p1}.', zh: '我方仅剩一名英雄存活时，其七项基础属性提高 {p1}。' },
    'tc.name.baggage': { ko: '치중대', en: 'Baggage Train', zh: '辎重队' },
    // 카드 효과 한 문장 — 툴팁 전용 · 효과만(CLAUDE.md 규칙 7) · {p1} ~ {p3} = 카드 규칙의 수치(초는 수 · 몫은 「30%」 — `tactic.RULE_PARAMS`)
    'tc.desc.duel': { ko: '우리 리더의 단일 공격은 적 리더만 노린다. 적 리더가 쓰러지면 평소대로 고른다.', en: "Your leader's single-target attacks aim only at the enemy leader. Once the enemy leader falls, targeting returns to normal.", zh: '我方队长的单体攻击只以敌方队长为目标。敌方队长倒下后，按常规规则选择目标。' },
    'tc.desc.wedge': { ko: '리더가 단일 공격으로 맞힌 적에 {p1}초 동안 표식. 동료의 단일 공격은 표식이 있는 적부터 노린다.', en: "Enemies hit by your leader's single-target attacks are marked for {p1}s. Allies' single-target attacks aim at the marked enemy first.", zh: '我方队长的单体攻击命中后，会标记目标 {p1} 秒。队友的单体攻击优先攻击被标记的敌人。' },
    'tc.desc.trojan': { ko: '라운드 시작 {p1}초 동안 우리 후열은 행동하지 않는다. 그 뒤 후열의 단일 공격은 적 후열을 노린다.', en: 'Your back row does not act for the first {p1}s of each round. After that, its single-target attacks aim at the enemy back row.', zh: '每回合开始后的 {p1} 秒内，我方后排无法行动。此后，我方后排的单体攻击优先瞄准敌方后排。' },
    'tc.desc.charge': { ko: '라운드가 시작되면 우리 전열이 곧바로 행동한다. 후열의 첫 행동은 {p1}초 늦는다.', en: "When a round starts, your front row acts immediately. Your back row's first action comes {p1}s later.", zh: '每回合开始时，我方前排立即行动，后排的首次行动延后 {p1} 秒。' },
    'tc.desc.shieldwall': { ko: '우리 후열이 맞는 직격 피해의 {p1}를 살아 있는 전열이 나눠 받는다.', en: 'Living front-row allies share {p1} of the direct-hit damage your back row takes.', zh: '我方后排受到直击伤害时，由存活的前排队友分摊其中的 {p1}。' },
    'tc.desc.guard': { ko: '우리 리더가 맞는 단일 직격 피해의 {p1}를 체력이 가장 많은 동료가 대신 받는다.', en: 'The ally with the most HP takes {p1} of the single-target direct-hit damage aimed at your leader.', zh: '我方队长受到单体直击伤害时，由当前生命值最高的队友代为承受其中的 {p1}。' },
    'tc.desc.turtle': { ko: '라운드 시작 {p1}초 동안 우리 편이 받는 피해 −{p2} · 공격 속도 −{p3}.', en: 'For the first {p1}s of each round, your side takes {p2} less damage and loses {p3} attack speed.', zh: '每回合开始后的 {p1} 秒内，我方所受伤害降低 {p2}，攻击速度降低 {p3}。' },
    'tc.desc.retreat': { ko: '우리 전열 영웅의 체력이 라운드 중 처음 {p1} 아래로 내려가면 후열에서 남은 체력 비율이 가장 높은 동료를 찾는다. 그 동료의 체력 비율이 더 높으면 둘이 자리를 바꾸고, 라운드가 끝나면 돌아온다.', en: 'The first time a front-row hero drops below {p1} HP in a round, they look for the back-row ally with the highest percentage of HP remaining. If that ally has a higher HP percentage, the two swap places until the round ends.', zh: '每回合中，我方前排英雄的生命值比例首次低于 {p1} 时，会寻找剩余生命值比例最高的后排队友。若该队友的生命值比例更高，双方便交换位置，回合结束后归位。' },
    'tc.desc.poison_arrow': { ko: '우리 편 물리 피해의 {p1}를 독 피해로 입힌다.', en: 'Converts {p1} of your party\'s physical damage to Poison damage.', zh: '将我方物理伤害的 {p1} 转化为毒素伤害。' },
    'tc.desc.fire_arrow': { ko: '우리 편 물리 피해의 {p1}를 화염 피해로 입히고 {p2} 확률로 화상을 건다.', en: 'Converts {p1} of your party\'s physical damage to Fire damage, with a {p2} chance to inflict Burn.', zh: '将我方物理伤害的 {p1} 转化为火焰伤害，并有 {p2} 几率使目标燃烧。' },
    'tc.desc.baggage': { ko: '우리 편이 물약을 마시면 회복량의 {p1}를 살아 있는 다른 동료가 나눠 받는다.', en: 'When an ally drinks a potion, the other living allies share {p1} of its healing.', zh: '我方英雄喝下药水时，其他存活的队友平分相当于其治疗量 {p1} 的治疗。' },
    // 카드 아래 판 — 맨 위 리더 통솔 · 죄종 일곱의 장비 수 · 줄마다 이름 · 수 · 20칸 막대 · 버프 몫 % [2026-11-24 · ADR-1334 — ADR-1048 의 두 열 글 줄 대체]
    'rs.board.leadName': { ko: '통솔', en: 'Leadership', zh: '统率' },   // 2026-11-24 사용자 「리더통솔 그냥 통솔로」
    'rs.board.noLead': { ko: '리더 없음', en: 'No leader', zh: '无队长' },
    // 효과 이름 — 시기 둘만 대상 쪽 말 [2026-11-11 · tactic_card_design §5-14 · ADR-1048] · 계산은 파티 전원의 방어력 관통 · 원소 관통 · {v} = 부호 · 단위 붙은 값
    'rs.eff.def_ignore': { ko: '적 방어력 감소 {v}', en: '{v} Enemy Defense Reduction', zh: '敌人防御降低{v}' },
    'rs.eff.res_reduction_fire': { ko: '적 화염 저항 감소 {v}', en: '{v} Enemy Fire Resist Reduction', zh: '敌人火焰抗性降低{v}' },
    'rs.eff.res_reduction_cold': { ko: '적 냉기 저항 감소 {v}', en: '{v} Enemy Cold Resist Reduction', zh: '敌人冰霜抗性降低{v}' },
    'rs.eff.res_reduction_lightning': { ko: '적 전기 저항 감소 {v}', en: '{v} Enemy Lightning Resist Reduction', zh: '敌人闪电抗性降低{v}' },
    'rs.eff.res_reduction_poison': { ko: '적 독 저항 감소 {v}', en: '{v} Enemy Poison Resist Reduction', zh: '敌人毒素抗性降低{v}' },
    // 리더 보너스 — 도움말 파티 전술 묶음 전용 [2026-10-24 · ADR-0753 · tactic_card_design §5-10] · 수치는 balance.csv 다섯 키
    'rs.note.lead': {
        ko: '<b>리더</b>(편성 첫 칸)의 <b>통솔</b>이 전술 효과의 크기를 바꿉니다 — 통솔 {pivot}에서 그대로이고, {min}이면 ×{lo} · {max}이면 ×{hi}입니다. 그 사이는 고르게 변합니다.',
        en: 'The <b>leader</b>\'s (first slot) <b>Leadership</b> scales tactic effects — unchanged at {pivot}, ×{lo} at {min} and ×{hi} at {max}, evenly in between.',
        zh: '<b>队长</b>（编队第一格）的<b>统率</b>会改变战术效果的大小——统率为{pivot}时不变，为{min}时×{lo}，为{max}时×{hi}。其间均匀变化。',
    },
    // 작전 카드 · 옵션 줄 등급 다섯 — ⚠ 아이템 희귀도(`mock.js:RARITY`)와 **별개 축**이고 이름만 같다 (tactic_card_design §3-3)
    'rs.grade.common': { ko: '일반', en: 'Common', zh: '普通' },
    'rs.grade.magic': { ko: '매직', en: 'Magic', zh: '魔法' },
    'rs.grade.rare': { ko: '레어', en: 'Rare', zh: '稀有' },
    'rs.grade.epic': { ko: '에픽', en: 'Epic', zh: '史诗' },
    'rs.grade.legendary': { ko: '레전더리', en: 'Legendary', zh: '传奇' },

    'sk.points.h': { ko: '스킬 포인트', en: 'Skill Points', zh: '技能点' },
    'sk.points.note': { ko: "레벨마다 받는 <b>스킬 포인트</b>를 죄종·직업 마스터리와 전직 메인·꼬리에 나누어 씁니다. 전직해도 별도 포인트를 지급하지 않습니다. 메인 단계만 5레벨 간격으로 열립니다.", en: "<b>Skill points</b> earned on each level-up are shared by Sin mastery, Class mastery and advancement main skills and branches. Advancing grants no separate points. Only main-skill ranks unlock at five-level intervals.", zh: '每次升级获得的<b>技能点</b>分配给罪宗、职业专精以及转职主技能、分支。转职不会另外发放点数。只有主技能的阶段以5级为间隔开启。' },
    'sk.points.left': { ko: '남은 포인트', en: 'Points left', zh: '剩余点数' },
    'sk.points.adv': { ko: '전직 포인트', en: 'Advancement Points', zh: '转职点数' },   // 스킬 창 포인트 칸 — 전직 스킬 배우기 몫 (2026-11-14 · ADR-1104)
    'sk.tip.rank': { ko: 'Rank {n}/{max}', en: 'Rank {n}/{max}', zh: '{n}/{max}阶' },
    'sk.gate.weapon': { ko: '착용 무기: {groups}일 때 효과 적용', en: 'Active with weapon: {groups}', zh: '装备武器为{groups}时生效' },
    'sk.gate.armor': { ko: '착용 갑옷: {groups}일 때 효과 적용', en: 'Active with armor: {groups}', zh: '装备铠甲为{groups}时生效' },
    // 죄종 T2 — 그 죄종 장비 수가 켠다(3 · 6 · 9 단 — 2026-11-12) · {n} = 지금 낀 수 · {need} = 그 칸의 문턱
    'sk.gate.sin_gear': { ko: '{sin} 장비 {need}개 이상일 때 효과 적용 ({n}/{need})', en: 'Active with {need}+ {sin} items ({n}/{need})', zh: '{sin}装备{need}件以上时生效（{n}/{need}）' },
    // 죄종 T3 조건 [2026-11-13 R468 — 죄종마다 조건 하나 · 랭크가 조건을 넓힌다 · PLAN_mastery_tiers §0-1] — 효과 문장 위 한 줄 · 판정은 전투가 한다.
    //   {pct} · {sec} = 지금 랭크(안 찍었으면 1랭크)의 문턱 · 랭크당 폭 · 다음 랭크 값은 안 적는다(ADR-1337) · 문턱이 끝(차이 0 · 가득)이면 `_any` · `_full`
    'sk.cond.hurt': { ko: '내 HP 가 {pct} 미만일 때', en: 'While below {pct} HP', zh: '自身生命低于{pct}时' },
    'sk.cond.higher': { ko: '상대의 HP 비율이 나보다 {pct} 이상 높을 때', en: "When the foe's HP % is {pct} or more above yours", zh: '对手的生命比例比自己高{pct}以上时' },
    'sk.cond.higher_any': { ko: '상대의 HP 비율이 나보다 높을 때', en: "When the foe's HP % is higher than yours", zh: '对手的生命比例高于自己时' },
    'sk.cond.lower': { ko: '상대의 HP 비율이 나보다 {pct} 이상 낮을 때', en: "When the foe's HP % is {pct} or more below yours", zh: '对手的生命比例比自己低{pct}以上时' },
    'sk.cond.lower_any': { ko: '상대의 HP 비율이 나보다 낮을 때', en: "When the foe's HP % is lower than yours", zh: '对手的生命比例低于自己时' },
    'sk.cond.fresh': { ko: '상대의 HP 가 {pct} 이상일 때', en: 'Against foes at {pct} HP or more', zh: '对手生命在{pct}以上时' },
    'sk.cond.fresh_full': { ko: '상대의 HP 가 가득 찼을 때', en: 'Against foes at full HP', zh: '对手生命全满时' },
    'sk.cond.opening': { ko: '라운드 시작 후 {sec}초 동안', en: 'For the first {sec}s of a round', zh: '回合开始后持续{sec}秒' },
    'sk.cond.late': { ko: '라운드 시작 후 {sec}초부터', en: 'From {sec}s into a round', zh: '回合开始{sec}秒后起' },
    /* 마스터리 효과 문장 — 「무엇이 n 증가한다」 (SCREEN_DESIGN §7 · ADR-0332). 축마다 **통째로** 든다 — 조사(이/가)와
       동사(증가/감소)를 렌더러가 고르지 않는다. 이름이 「감소」인 축은 줄어드는 것이 주어다. {v} 는 부호 없는 값.
       사전에 없는 축은 맨 위 틀로 떨어진다 */
    'sk.masteryEffect': { ko: '{stat} {v} 증가', en: '{stat} increases by {v}', zh: '{stat}提高{v}' },
    'sk.masteryEffect.aspd_pct': { ko: '공격 속도 {v} 증가', en: 'Attack Speed increases by {v}', zh: '攻击速度提高{v}' },
    'sk.masteryEffect.atk_pct': { ko: '데미지 {v} 증가', en: 'Damage increases by {v}', zh: '伤害提高{v}' },
    'sk.masteryEffect.buff_dur_pct': { ko: '버프 지속시간 {v} 증가', en: 'Buff Duration increases by {v}', zh: '增益持续时间提高{v}' },
    'sk.masteryEffect.cast_speed_pct': { ko: '캐스팅 속도 {v} 증가', en: 'Casting Speed increases by {v}', zh: '施法速度提高{v}' },
    'sk.masteryEffect.cooldown_reduction': { ko: '쿨타임 {v} 감소', en: 'Cooldowns are reduced by {v}', zh: '冷却缩短{v}' },
    // 초 단위 칸 — 직업 T1-2 쿨타임 −n초 · 궁수 공격 속도 −n초 (2026-11-09 · R432 · skill_design §3-4)
    'sk.masteryEffect.cool_minus_sec': { ko: '쿨타임 {v}초 감소', en: 'Cooldowns are {v}s shorter', zh: '冷却缩短{v}秒' },
    // 직업 마스터리 T4 — 셋 중 하나 (2026-11-14 · R437 · skill_design §3-5 「새 T4」)
    'sk.masteryEffect.basic_cleave': { ko: '기본 공격이 같은 줄 옆 적에게 {v}로 튑니다', en: 'Basic attacks also strike enemies in the same row at {v}', zh: '普通攻击会以{v}溅射到同排相邻的敌人' },
    'sk.masteryEffect.skill_repeat_chance': { ko: '공격 스킬이 {v} 확률로 한 번 더 나갑니다', en: 'Attack skills have a {v} chance to fire once more', zh: '攻击技能有{v}几率再释放一次' },
    'sk.masteryEffect.elem_to_phys': { ko: '받는 원소 피해의 {v}를 물리 피해로 받습니다', en: 'Takes {v} of elemental damage as physical damage', zh: '受到元素伤害的{v}转为物理伤害承受' },
    'sk.masteryEffect.hit_stun_chance': { ko: '맞힐 때 {v} 확률로 적을 스턴시킵니다', en: 'Hits have a {v} chance to stun', zh: '命中时有{v}几率使敌人眩晕' },
    'sk.masteryEffect.aura_guard_share': { ko: '오오라가 켜져 있으면 팀원이 받는 피해의 {v}를 대신 받습니다', en: 'While your aura is on, takes {v} of the damage dealt to teammates', zh: '光环开启时，代替队友承受其所受伤害的{v}' },
    'sk.masteryEffect.crit_taken_cut': { ko: '치명타로 더 받는 피해가 {v} 줄어듭니다', en: 'Extra damage taken from critical hits is reduced by {v}', zh: '因暴击额外受到的伤害降低{v}' },
    'sk.masteryEffect.skill_fixed_share': { ko: '스킬 피해의 {v}가 고정 피해로 들어갑니다', en: '{v} of skill damage is dealt as fixed damage', zh: '技能伤害的{v}以真实伤害造成' },
    'sk.masteryEffect.cast_refill_chance': { ko: '스킬을 쓰면 {v} 확률로 시전 칸 하나가 찹니다', en: 'Casting a skill has a {v} chance to fill one cast charge', zh: '使用技能时有{v}几率充满一个施法格' },
    'sk.masteryEffect.round_barrier': { ko: '라운드 시작 때 최대 HP {v}의 보호막을 얻습니다', en: 'Gains a shield worth {v} of max HP at the start of each round', zh: '回合开始时获得最大生命{v}的护盾' },
    'sk.masteryEffect.sin_vuln': { ko: '디버프 · 공격 스킬이 적이 받는 피해를 {v} 늘립니다', en: 'Debuffs and attack skills make the enemy take {v} more damage', zh: '减益、攻击技能使敌人受到的伤害提高{v}' },
    'sk.masteryEffect.overheal_shield': { ko: '넘친 회복의 {v}가 보호막으로 남습니다', en: '{v} of overhealing remains as a shield', zh: '溢出治疗的{v}转为护盾保留' },
    'sk.masteryEffect.last_prayer': { ko: 'HP가 낮아지면 라운드에 한 번 최대 HP {v}를 회복합니다', en: 'Once per round at low HP, restores {v} of max HP', zh: '生命降低时，每回合一次恢复最大生命的{v}' },
    'sk.masteryEffect.extra_shot_chance': { ko: '기본 공격이 {v} 확률로 한 발 더 나갑니다', en: 'Basic attacks have a {v} chance to fire an extra shot', zh: '普通攻击有{v}几率多射一发' },
    'sk.masteryEffect.basic_cd_tick': { ko: '기본 공격마다 스킬 쿨타임이 {v}초 돕니다', en: 'Each basic attack advances skill cooldowns by {v}s', zh: '每次普通攻击使技能冷却推进{v}秒' },
    'sk.masteryEffect.dodge_chance': { ko: '맞을 때 {v} 확률로 피합니다', en: 'Has a {v} chance to dodge a hit', zh: '被攻击时有{v}几率闪避' },
    // 죄종 마스터리 T4 — 셋 중 하나 · 조건 = 그 죄종 T3 조건 (2026-11-14 · skill_design §3-3 「죄종 T4」)
    'sk.masteryEffect.wrath_blood': { ko: '공격 스킬이 HP를 조금 쓰고 스킬 데미지가 {v} 증가', en: 'Attack skills spend a little HP and deal {v} more damage', zh: '攻击技能消耗少量生命，技能伤害提高{v}' },
    'sk.masteryEffect.wrath_party_crit': { ko: 'HP가 낮은 동안 같은 편 전원 치명 확률 {v} 증가', en: 'While your HP is low, all allies gain {v} Critical Chance', zh: '自身生命低时，我方全员暴击率提高{v}' },
    'sk.masteryEffect.wrath_steady': { ko: 'HP가 낮은 동안 받는 스턴 · 경직 시간 {v} 감소', en: 'While your HP is low, stuns and staggers on you are {v} shorter', zh: '自身生命低时，受到的眩晕、僵直时间缩短{v}' },
    'sk.masteryEffect.envy_strip': { ko: '나보다 성한 적을 맞히면 {v} 확률로 버프 하나를 지웁니다', en: 'Hitting an enemy healthier than you has a {v} chance to remove one of its buffs', zh: '命中生命比例高于自己的敌人时，有{v}几率移除其一个增益' },
    'sk.masteryEffect.envy_party_pierce': { ko: '나보다 성한 적을 치는 같은 편 전원 방어력 관통 {v}', en: 'Allies gain {v} Defense Penetration against enemies healthier than you', zh: '我方全员攻击生命比例高于自己的敌人时，防御穿透{v}' },
    'sk.masteryEffect.envy_return': { ko: '내게 걸린 디버프가 {v} 확률로 건 적에게도 걸립니다', en: 'Debuffs on you have a {v} chance to also afflict their caster', zh: '自身所中的减益有{v}几率同样施加给施放者' },
    'sk.masteryEffect.greed_mark': { ko: '라운드 시작 때 HP가 가장 많은 적을 정예로 표시하고 그 적에게 데미지 {v} 증가', en: 'Marks the enemy with the most HP as elite each round and deals {v} more damage to it', zh: '回合开始时将生命最多的敌人标记为精英，对其伤害提高{v}' },
    'sk.masteryEffect.greed_reroll': { ko: '드롭이 없던 처치에서 {v} 확률로 한 번 더 굴립니다', en: 'Kills without a drop have a {v} chance to roll again', zh: '未掉落物品的击杀有{v}几率再随机一次' },
    'sk.masteryEffect.greed_barrier': { ko: '라운드 시작 때 탐욕 합에 비례한 보호막(최대 HP × {v} × 탐욕 합)', en: 'Gains a shield each round worth max HP × {v} × your Greed total', zh: '回合开始时获得与贪婪总和成比例的护盾（最大生命 × {v} × 贪婪总和）' },
    'sk.masteryEffect.sloth_heavy': { ko: '공격 · 캐스팅이 느려지는 대신 데미지 {v} 증가', en: 'Attacks and casts are slower but deal {v} more damage', zh: '攻击、施法变慢，但伤害提高{v}' },
    'sk.masteryEffect.sloth_party_cdr': { ko: '라운드 초반 동안 같은 편 전원 쿨타임 {v} 감소', en: 'Early in each round, all allies gain {v} Cooldown Reduction', zh: '回合前期，我方全员冷却缩短{v}' },
    'sk.masteryEffect.sloth_defer': { ko: '라운드 초반 동안 받는 피해의 {v}를 나눠 받습니다', en: 'Early in each round, {v} of damage taken is spread over time', zh: '回合前期，受到伤害的{v}分摊到之后承受' },
    'sk.masteryEffect.glut_cull': { ko: 'HP가 {v} 이하인 일반 몬스터를 바로 쓰러뜨립니다', en: 'Normal monsters at or below {v} HP are slain outright', zh: '直接击倒生命在{v}以下的普通怪物' },
    'sk.masteryEffect.glut_party_dmg': { ko: '라운드 후반 동안 같은 편 전원 데미지 {v} 증가', en: 'Late in each round, all allies deal {v} more damage', zh: '回合后期，我方全员伤害提高{v}' },
    'sk.masteryEffect.glut_absorb': { ko: '받는 원소 피해의 {v}를 회복으로 바꿉니다', en: 'Converts {v} of elemental damage taken into healing', zh: '受到元素伤害的{v}转化为治疗' },
    'sk.masteryEffect.lust_crit_vuln': { ko: 'HP가 높은 적에게 치명이 터지면 그 적이 받는 피해 {v} 증가', en: 'Critical hits on healthy enemies make them take {v} more damage', zh: '对生命高的敌人打出暴击时，该敌人受到的伤害提高{v}' },
    'sk.masteryEffect.lust_share_heal': { ko: '받은 회복의 {v}가 HP가 가장 낮은 아군에게도 갑니다', en: '{v} of healing you receive also goes to the most wounded ally', zh: '自身受到治疗的{v}也会分给生命最低的友方' },
    'sk.masteryEffect.lust_charm': { ko: '나를 때린 적이 {v} 확률로 홀려 데미지가 깎입니다', en: 'Attackers have a {v} chance to be beguiled, dealing less damage', zh: '攻击自己的敌人有{v}几率被魅惑，伤害降低' },
    'sk.masteryEffect.pride_nth': { ko: '나보다 약한 상대에게 몇 번째 공격마다 확정 치명(간격 {v} 단축)', en: 'Every few attacks on weaker foes are certain critical hits (interval −{v})', zh: '对比自己弱的对手每隔数次攻击必定暴击（间隔缩短{v}）' },
    'sk.masteryEffect.pride_party_haste': { ko: '라운드 시작 때 같은 편 전원 공격 · 캐스팅 속도 {v} 증가', en: 'At the start of each round, all allies gain {v} Attack and Casting Speed', zh: '回合开始时，我方全员攻击、施法速度提高{v}' },
    'sk.masteryEffect.pride_cap': { ko: '큰 한 방의 넘친 피해를 {v} 덜 받습니다', en: 'Takes {v} less of the excess from very large hits', zh: '受到巨大单次伤害时，溢出部分少受{v}' },
    'sk.masteryEffect.period_minus_sec': { ko: '공격 속도 {v}초 단축', en: 'Attacks come {v}s sooner', zh: '攻击速度缩短{v}秒' },
    'sk.masteryEffect.crit_damage': { ko: '치명타 피해 {v} 증가', en: 'Crit Damage increases by {v}', zh: '暴击伤害提高{v}' },
    'sk.masteryEffect.crit_rate': { ko: '치명타 확률 {v} 증가', en: 'Crit Chance increases by {v}', zh: '暴击率提高{v}' },
    'sk.masteryEffect.crushing_blow_pct': { ko: '강타 +{v}', en: 'Crushing Blow +{v}', zh: '压碎性打击 +{v}' },
    'sk.masteryEffect.damage_reduction': { ko: '받는 피해 {v} 감소', en: 'Damage taken is reduced by {v}', zh: '受到的伤害降低{v}' },
    'sk.masteryEffect.def_flat': { ko: '물리 방어 {v} 증가', en: 'Physical Defense increases by {v}', zh: '物理防御提高{v}' },
    'sk.masteryEffect.def_ignore': { ko: '방어력 관통 {v} 증가', en: 'Defense Penetration increases by {v}', zh: '防御穿透提高{v}' },
    'sk.masteryEffect.fhr': { ko: '타격 회복 {v} 증가', en: 'Hit Recovery increases by {v}', zh: '受击恢复提高{v}' },
    'sk.masteryEffect.gold_find': { ko: '파티 골드 획득 {v} 증가', en: 'Party Gold Find increases by {v}', zh: '队伍金币获取提高{v}' },
    'sk.masteryEffect.hit_bonus': { ko: '명중률 {v} 증가', en: 'Hit Bonus increases by {v}', zh: '命中率提高{v}' },
    'sk.masteryEffect.hp_pct': { ko: '최대 HP {v} 증가', en: 'Max HP increases by {v}', zh: '最大生命提高{v}' },
    'sk.masteryEffect.hp_flat': { ko: '최대 HP {v} 증가', en: 'Max HP increases by {v}', zh: '最大生命提高{v}' },
    'sk.masteryEffect.hp_recovery_pct': { ko: '받는 HP 회복량 {v} 증가 (물약 포함)', en: 'HP recovery received increases by {v} (including potions)', zh: '受到的生命恢复提高{v}（包括药剂）' },
    'sk.masteryEffect.dmg_max_per_level': { ko: '영웅 레벨당 최대 데미지 {v} 증가', en: 'Maximum Damage increases by {v} per hero level', zh: '英雄每级最大伤害提高{v}' },
    'sk.masteryEffect.skill_dmg_pct': { ko: '스킬 데미지 {v} 증가', en: 'Skill Damage increases by {v}', zh: '技能伤害提高{v}' },
    'sk.masteryEffect.heal_out_pct': { ko: '내가 쓰는 회복 스킬의 회복량 {v} 증가', en: 'Your healing skills restore {v} more HP', zh: '自身治疗技能造成的治疗量提高{v}' },
    'sk.masteryEffect.skill_tag_value': { ko: '버프 · 디버프 수치 {v} 증가', en: 'Buff and debuff strength increases by {v}', zh: '增益与减益强度提高{v}' },
    'sk.masteryEffect.debuff_dur_reduction': { ko: '받는 상태이상 · 디버프 지속시간 {v} 감소', en: 'Ailments and debuffs on you last {v} less time', zh: '自身受到的异常状态和减益持续时间缩短{v}' },
    'sk.masteryEffect.hp_regen': { ko: 'HP 재생 {v} 증가', en: 'HP Regen increases by {v}', zh: '生命再生提高{v}' },
    'sk.masteryEffect.item_find': { ko: '드랍률 {v} 증가', en: 'Item Find increases by {v}', zh: '掉落率提高{v}' },
    'sk.masteryEffect.life_steal': { ko: '흡혈 {v} 증가', en: 'Life Steal increases by {v}', zh: '吸血提高{v}' },
    'sk.masteryEffect.magic_find': { ko: '파티 매직아이템 획득확률 {v} 증가', en: 'Party Magic Find increases by {v}', zh: '队伍魔法物品获取率提高{v}' },
    'sk.masteryEffect.xp_gain_pct': { ko: '파티 경험치 획득 {v} 증가 (이 영웅의 전투 경험치에 적용)', en: 'Party Experience Gain increases by {v} for this hero’s combat experience', zh: '队伍经验获取提高{v}（适用于该英雄的战斗经验）' },
    // 탐욕 T3 — 「탐욕 합에 비례」가 효과의 일부라 한 토막에 같이 든다 (SCREEN_DESIGN §7 · R325)
    'sk.masteryEffect.atk_pct_per_greed': { ko: '이 영웅의 파티 골드 획득 · 드랍률 · 파티 매직아이템 획득확률 합의 {v}만큼 데미지 증가', en: 'Damage increases by {v} of your contributions to Party Gold Find, Item Find and Party Magic Find', zh: '按该英雄贡献的队伍金币获取、掉落率和队伍魔法物品获取率之和的{v}提高伤害' },
    'sk.masteryEffect.hp_pct_per_greed': { ko: '이 영웅의 파티 골드 획득 · 드랍률 · 파티 매직아이템 획득확률 합의 {v}만큼 최대 HP 증가', en: 'Max HP increases by {v} of your contributions to Party Gold Find, Item Find and Party Magic Find', zh: '按该英雄贡献的队伍金币获取、掉落率和队伍魔法物品获取率之和的{v}提高最大生命' },
    'sk.masteryEffect.cdr_per_greed': { ko: '이 영웅의 파티 골드 획득 · 드랍률 · 파티 매직아이템 획득확률 합의 {v}만큼 쿨타임 감소', en: 'Cooldowns are reduced by {v} of your contributions to Party Gold Find, Item Find and Party Magic Find', zh: '按该英雄贡献的队伍金币获取、掉落率和队伍魔法物品获取率之和的{v}缩短冷却' },
    'sk.masteryEffect.res_all': { ko: '모든 원소 저항 {v} 증가', en: 'All Resistances increase by {v}', zh: '所有元素抗性提高{v}' },
    'sk.masteryEffect.res_max_bonus': { ko: '최대 원소 저항 {v} 증가', en: 'Max Resistances increase by {v}', zh: '最大元素抗性提高{v}' },
    'sk.masteryEffect.res_reduction': { ko: '원소 관통 {v} 증가', en: 'Elemental Penetration increases by {v}', zh: '元素穿透提高{v}' },
    'sk.reset': { ko: '마스터리 초기화', en: 'Reset Mastery', zh: '重置专精' },
    'sk.unlearn': { ko: '되돌리기', en: 'Refund', zh: '撤回' },
    'sk.reset.done': { ko: '{n} 포인트 반환', en: { one: 'Refunded {n} point', other: 'Refunded {n} points' }, zh: '返还{n}点' },
    'sk.needLv': { ko: 'Lv.{lv}', en: 'Lv.{lv}', zh: 'Lv.{lv}' },
    'sk.err.locked': { ko: 'Lv.{lv} 달성', en: 'Reach Lv.{lv}', lock: true, zh: '达到Lv.{lv}' },
    'sk.err.maxRank': { ko: '이미 최대 랭크', en: 'Already at max rank', zh: '已达最高阶' },
    'sk.err.points': { ko: '스킬 포인트 없음', en: 'No skill points left', zh: '没有技能点' },
    'sk.err.rowFull': { ko: '이 줄에는 {n}점까지 찍을 수 있습니다', en: 'This row holds up to {n} points', zh: '此行最多可投入{n}点' },   // 마스터리 줄마다 점수 합 (R473)
    'sk.err.pickOne': { ko: '이 줄은 한 칸만 찍을 수 있습니다', en: 'Only one node in this row can be learned', zh: '此行只能投入一格' },   // 마스터리 T4 셋 중 하나 (R437)
    'sk.err.prevRow': { ko: '{tier}에 {n}점을 다 찍어야 합니다', en: 'Spend all {n} points in {tier} first', zh: '需先在{tier}投满{n}点' },   // 마스터리 윗줄을 다 채워야 아랫줄 (R502) · {tier} = sk.tier
    'sk.err.nextRow': { ko: '{tier}의 점수를 먼저 되돌려야 합니다', en: 'Refund the points in {tier} first', zh: '需先撤回{tier}的点数' },   // 아랫줄이 있으면 윗줄을 못 무른다 (R502)
    'sk.tier': { ko: 'Tier {n}', en: 'Tier {n}', zh: 'Tier {n}' },   // 스킬 창 마스터리 줄 머리 — ko 에서도 영어 · `{n}` 은 로마 숫자 (2026-11-14 사용자 지시 · ADR-1082)
    'sk.err.noRank': { ko: '아직 찍지 않은 칸', en: 'Nothing invested here yet', zh: '尚未投点的格' },
    /* ~~'sk.err.downed'~~ · ~~'tr.err.downed'~~ · ~~'bk.err.downed'~~ 은 2026-10-21 삭제 — 쓰러짐은 원정 밖 행동을 막지 않는다 (R300 · ADR-0687) */
    // 찍은 칸의 툴팁 꼬리 — 우클릭이 있다는 것 자체가 안 보이면 못 쓴다 (SCREEN_DESIGN §7)
    'sk.unlearnHint': { ko: ' · 우클릭 = 1랭크 되돌리기', en: ' · Right-click to refund 1 rank', zh: ' · 右键=撤回1阶' },
    // 낀 장비가 켜는 칸 (직업 T2 · 2026-09-22 R138) — 갈래 이름은 CSV 에서
    'sk.slots.h': { ko: '액티브', en: 'Actives', zh: '主动' },
    // 인게임 이름은 「공격 속도」 하나다 — 값은 초 / 1회 그대로 (2026-09-25 사용자 지시 · ADR-0358)
    'sk.cycle': { ko: '공격 속도', en: 'Attack Speed', zh: '攻击速度' },
    // 마법 무기를 든 유닛은 같은 주기를 「캐스팅 속도」라 부른다 — 이름만 · 값 그대로 (2026-10-03 사용자 지시 · R202 · ADR-0492)
    'sk.castSpeed': { ko: '캐스팅 속도', en: 'Casting Speed', zh: '施法速度' },
    'sk.cycleSec': { ko: '{s}초', en: '{s}s', zh: '{s}秒' },
    'sk.cycle.sub': { ko: '민첩 + 무기군 속도 (물리·마법 단일 축)', en: 'Agility + weapon-group speed (one clock for melee & magic)', zh: '敏捷+武器类别速度（物理、魔法共用一条轴）' },
    'sk.emptySlot': { ko: '빈 칸', en: 'Empty', zh: '空位' },
    // 출처 셋은 **영웅 / 습득 / 전직** 이다 [2026-09-08 사용자 지시 · 2026-09-29 ~~무기~~ → 책 — R179 · ADR-0420 · 2026-10-02 ~~책~~ → 습득 — ADR-0484] — ~~고유~~. 액티브 줄·후보 카드·툴팁 칩이 같은 키를 쓴다
    'sk.innate': { ko: '영웅', en: 'Hero', zh: '英雄' },
    // 액티브 3칸의 출처 라벨 — 칸은 출처가 정한다 (skill_design §2)
    'sk.src.book': { ko: '습득', en: 'Learned', zh: '习得' },
    'sk.src.advance': { ko: '전직', en: 'Advance', zh: '转职' },
    'sk.emptyBook': { ko: '배운 스킬 없음', en: 'No skill learned', zh: '未学习技能' },
    'sk.emptyAdvance': { ko: '전직 전', en: 'Not advanced', zh: '未转职' },
    // 빈 전직 칸 — 전직 전은 자물쇠 + 안내 문장(레벨 전 · 후) · 전직했는데 안 배웠으면 습득 칸과 같은 꼴 (2026-11-14 사용자 지시 · ADR-1122)
    'sk.advLock': { ko: 'Lv.{lv}이 되면 도서관에서 전직이 가능합니다', en: 'Advance at the Library at Lv.{lv}', lock: true, zh: '达到Lv.{lv}后可在图书馆转职' },
    'sk.advLockReady': { ko: '도서관에서 전직이 가능합니다', en: 'Advance at the Library', lock: true, zh: '可在图书馆转职' },
    'sk.emptyAdvanceSkill': { ko: '배운 전직 스킬 없음', en: 'No advanced skill learned', zh: '未学习转职技能' },
    'sk.lvTag': { ko: 'Lv.{n}', en: 'Lv.{n}', zh: 'Lv.{n}' },   // 스킬 레벨 — 그림 오른쪽 아래 `.sk-lv` (설명창 · 액티브 줄 · 도서관 · R216 · ADR-0576 · 전직 스킬은 안 단다 ADR-1190) · 그림이 없는 도서관 읽기 줄만 이름 뒤
    'tr.err.maxLevel': { ko: '메인 최대 레벨입니다', en: 'Main skill is at its maximum level', zh: '主技能已达最高等级' },
    'sk.adv.leveled': { ko: '{skill} Lv.{n}', en: '{skill} Lv.{n}', zh: '{skill} Lv.{n}' },   // 전직 판 스킬 칸을 눌러 레벨이 올랐다 (R216)
    // 잠긴 액티브 칸의 툴팁 한 줄 [2026-09-30 사용자 지시 · SCREEN_DESIGN §6 · ADR-0466 — ~~`sk.lockLv` 「Level n+」~~(ADR-0428) 를 칸마다의 문장으로] · {n} = 책 `skillbook_learn_level` · 전직 `advance_unlock_level`
    'sk.lock.book': { ko: 'Lv{n}이 되면 도서관에서 스킬을 배울 수 있습니다.', en: 'At Lv{n}, skills can be learned at the Library.', zh: '达到Lv{n}后可在图书馆学习技能。' },
    'sk.lock.advance': { ko: 'Lv{n}이 되면 도서관에서 전직 후 스킬을 배울 수 있습니다.', en: 'At Lv{n}, skills can be learned after advancing at the Library.', zh: '达到Lv{n}后，可在图书馆转职并学习技能。' },
    // 자물쇠만 선 빈 칸(편성 진형 칸 스킬 열 · 잠긴 칸 아님)의 툴팁 — 배우는 곳 (§15 · ADR-1181) · 같은 칸의 `sk.lock.*` 문장 꼴
    'sk.learnAt.book': { ko: '도서관에서 스킬을 배울 수 있습니다.', en: 'Skills can be learned at the Library.', zh: '可在图书馆学习技能。' },
    'sk.learnAt.advance': { ko: '도서관에서 전직 스킬을 배울 수 있습니다.', en: 'Advanced skills can be learned at the Library.', zh: '可在图书馆学习转职技能。' },
    // ~~`sk.needWeapon`~~(꺼진 칸 툴팁 맨 위 한 줄 · ADR-0446) — 2026-10-03 걷었다: 필요 무기는 설명창 이름 줄의 칩이 무기군 이름만으로 든다(ADR-0496)
    /* 스킬북 [2026-09-29 · R179 · 도서관 탭 SCREEN_DESIGN §17 · ADR-0422] — 규칙 문장은 없다(덮어쓰기는 도움말의 몫) · 권수 `×n` 은 물약 칸처럼 기호라 키가 없다(ADR-0460) */
    'bk.hero.h': { ko: '스킬정보', en: 'Skill Info', zh: '技能信息' },   // 도서관 윗줄 왼쪽 패널 제목 — 지금 가진 스킬 카드 셋 (§17 · ADR-1179 · ADR-1262)
    'bk.up.help': { ko: '보유한 스킬북을 통해 스킬 레벨을 업그레이드 할 수 있습니다.', en: 'Use the skill books you own to upgrade skill levels.', zh: '可使用持有的技能书提升技能等级。' },   // 제목 옆 `?` 툴팁 · 도움말 도서관 섹션도 이 키 (2026-10-12 사용자 지시 · ADR-0603)
    'bk.none': { ko: '가진 책 없음', en: 'No books', zh: '没有书' },
    'bk.cls.all': { ko: '전체', en: 'All', zh: '全部' },   // 보유 스킬북 직업 줄 첫 칸 (§17 · ADR-1206 · ADR-1291) — 스킬 북 제작 직업 줄에는 없다
    'bk.owned.h': { ko: '보유 스킬북', en: 'Owned Skill Books', zh: '持有的技能书' },   // 도서관 아랫줄 왼쪽 아래 패널 제목 — 가진 책 칸 · `?` 없음 (§17 · ADR-1291)
    'bk.tier': { ko: '{n}티어', en: 'Tier {n}', zh: '第{n}层' },   // 스킬 북 제작 칸 줄 머리 — 티어마다 한 줄 (§17 · ADR-1291)
    'bk.learn': { ko: '배우기', en: 'Learn', zh: '学习' },
    'bk.overwrite': { ko: '덮어쓰기', en: 'Overwrite', zh: '覆盖' },
    'bk.overwrite.what': { ko: '{name}: {old} Lv.{n} → {skill}', en: '{name}: {old} Lv.{n} → {skill}', zh: '{name}：{old} Lv.{n} → {skill}' },   // 덮어쓰기 확인 창 첫 줄 (ADR-1020)
    'bk.overwrite.warn': { ko: '기존 스킬과 레벨은 사라지고 책으로 돌아오지 않습니다.', en: 'The current skill and its level are lost. Books are not returned.', zh: '原有的技能与等级将会消失，书也不会返还。' },   // 덮어쓰기 확인 창 둘째 줄 (ADR-1020)
    'bk.upgrade': { ko: '업그레이드', en: 'Upgrade', zh: '升级' },   // 같은 책 — 버튼은 행동 이름만 · 드는 책 수는 읽기 줄 아랫줄 `bk.need` (ADR-1208 · R216)
    'bk.lvUp': { ko: 'Lv.{a} → Lv.{b}', en: 'Lv.{a} → Lv.{b}', zh: 'Lv.{a} → Lv.{b}' },   // 읽기 줄 아랫줄 — 지금 → 읽은 뒤 (§17 · ADR-1208)
    'bk.books': { ko: '책 {have}/{need}', en: 'Books {have}/{need}', zh: '技能书 {have}/{need}' },   // 도서관 스킬정보 칸 줄 아랫줄 — 가진 / 드는 같은 책 · 모자라면 붉다 (§17 · ADR-1308)
    'bk.swap': { ko: '{a} → {b}', en: '{a} → {b}', zh: '{a} → {b}' },   // 습득 줄 윗줄 — 앞 스킬 Lv.n → 새 책(덮어쓰기) (ADR-1308) · 레벨 줄의 지금 → 다음 값 (ADR-1312 · 1317)
    'bk.weaponAny': { ko: '자유', en: 'Any weapon', zh: '不限武器' },
    // 스킬정보 계산 줄 — 설명의 숫자마다 `이름 값 = 식` (§17 · 2026-11-24) · 밑수 이름은 `st.atk` · 능력치 표 · 쿨감은 `sk.cdrShort` 를 쓴다
    'bk.calc.dmg': { ko: '피해', en: 'Hit', zh: '伤害' },   // en 은 밑수 이름(`st.atk` = Damage)과 겹치지 않게 한 타
    'bk.calc.heal': { ko: '회복', en: 'Heal', zh: '治疗' },
    'bk.calc.hp': { ko: 'HP', en: 'HP', zh: 'HP' },
    'bk.calc.cool': { ko: '쿨타임', en: 'CD', zh: '冷却' },   // en 은 짧게 — 계산 줄 이름 칸이 가장 긴 이름에 맞춰 선다 (ADR-1364)
    'bk.calc.tag': { ko: '태그', en: 'Tag', zh: '标签' },
    'bk.calc.weaponDmg': { ko: '무기 데미지', en: 'Weapon Damage', zh: '武器伤害' },   // 계산 줄의 무기 밑수(atk) 이름 — 이 줄만 · 다른 자리의 「데미지」는 `st.atk` (ADR-1432)
    'bk.calc.tagDur': { ko: '지속 +{p}%', en: 'Duration +{p}%', zh: '持续时间 +{p}%' },
    'bk.calc.tagVal': { ko: '효과 +{p}%', en: 'Effect +{p}%', zh: '效果 +{p}%' },   // 스킬정보 줄 오른쪽 위 칩 — 무기가 필요 없는 스킬 (§17 · ADR-1321)
    'bk.weaponClash': { ko: '{name} 스킬과 필요 무기가 달라 함께 쓸 수 없습니다', en: 'Different weapon than {name} — can’t use both', zh: '与{name}所需的武器不同，无法同时使用' },   // 스킬정보 습득 줄 붉은 한 줄 — 고유 칸 스킬과 맞는 무기군이 없다 (§17 · ADR-1319)
    'bk.lvMax': { ko: 'Lv.{n} · 최대 레벨', en: 'Lv.{n} · Max level', zh: 'Lv.{n} · 最高等级' },   // 읽기 줄 아랫줄 — 상한 (ADR-1208)
    'bk.max': { ko: '최대', en: 'Max', zh: '最高' },
    // 스킬 북 제작 — 도서관 아랫줄 오른쪽 구역 (2026-11-18 · R540 · SCREEN_DESIGN §17 · ADR-1262) · 스킬 조각 이름 ⚠임시
    'bk.craft.h': { ko: '스킬 북 제작', en: 'Skill Book Crafting', zh: '技能书制作' },
    'bk.craft.help': { ko: '스킬 조각과 골드로 스킬북을 만들 수 있습니다.', en: 'Craft skill books with skill shards and gold.', zh: '可用技能碎片和金币制作技能书。' },   // 소제목 옆 `?` 툴팁 (R543 — 직업 스킬 전부)
    'bk.craft.none': { ko: '만들 수 있는 스킬북 없음', en: 'No books to craft', zh: '没有可制作的技能书' },
    'bk.make': { ko: '만들기', en: 'Craft', zh: '制作' },
    'bk.shards': { ko: '스킬 조각 {have}/{need}', en: 'Skill Shards {have}/{need}', zh: '技能碎片{have}/{need}' },   // 만들기 줄 아랫줄 비용 — 가진 / 드는 (모자라면 붉다)
    'bk.gold': { ko: '{g} G', en: '{g} G', zh: '{g} G' },   // 만들기 줄 아랫줄 비용 — 골드
    'bk.shardHave': { ko: '스킬 조각 {n}', en: 'Skill Shards {n}', zh: '技能碎片{n}' },   // 창고 스킬북 탭 도구 줄 — [분해] 왼쪽 가진 조각 수 (§6)
    'bk.learned': { ko: '{name} — {skill} 배움', en: '{name} learned {skill}', zh: '{name}——学会了{skill}' },
    'bk.upgraded': { ko: '{name} — {skill} Lv.{n}', en: '{name} — {skill} Lv.{n}', zh: '{name}——{skill} Lv.{n}' },   // 같은 책 업그레이드 (R216)
    'bk.crafted': { ko: '{skill} 스킬북 제작 완료', en: 'Crafted a {skill} book', zh: '{skill}技能书制作完成' },
    'bk.salvage': { ko: '분해', en: 'Salvage', zh: '分解' },   // 창고 스킬북 탭 도구 줄(고른 책 1권) · 도서관 보유 스킬북 제목 줄(분해함을 띄운다) (§6 · §17 · ADR-1199 · ADR-1262 · ADR-1304)
    'bk.salv.gain': { ko: '스킬 조각 +{n}', en: 'Skill Shards +{n}', zh: '技能碎片+{n}' },   // 도서관 분해함 바닥 — 함 안의 책이 주는 조각 합(`game.bookSalvagePreview` · ADR-1304)
    'bk.cube.done': { ko: '스킬북 {n}권 분해 — 스킬 조각 +{s}', en: { one: 'Salvaged {n} skill book · Skill Shards +{s}', other: 'Salvaged {n} skill books · Skill Shards +{s}' }, zh: '已分解 {n} 本技能书 · 技能碎片 +{s}' },   // 도서관 분해함 [분해하기] (ADR-1304)
    'bk.salvaged': { ko: '{skill} 스킬북 분해 — 스킬 조각 +{n}', en: 'Salvaged a {skill} book — Skill Shard +{n}', zh: '分解{skill}技能书——技能碎片+{n}' },
    // 결과 코드 — `game.learnBook` · `game.craftBook` · `game.salvageBook` · `game.bookState` (INTERFACE §3)
    'bk.err.shards': { ko: '스킬 조각 부족', en: 'Not enough skill shards', zh: '技能碎片不足' },   // craftBook (R540)
    'bk.err.gold': { ko: '골드 부족', en: 'Not enough gold', zh: '金币不足' },   // craftBook (R540)
    'bk.err.level': { ko: 'Lv.{n} 달성', en: 'Reach Lv.{n}', lock: true, zh: '达到Lv.{n}' },
    'bk.err.missing': { ko: '배울 수 없는 스킬', en: 'Cannot be learned', zh: '无法学习的技能' },
    'bk.err.book': { ko: '책 부족', en: 'Not enough books', zh: '书不足' },   // 없거나 업그레이드에 드는 권수보다 적다 (R216)
    'bk.err.maxUp': { ko: '이미 최대 레벨', en: 'Already at max level', zh: '已达最高等级' },   // 업그레이드 상한 (R216 — ~~`bk.err.same`~~ 퇴역)
    /* 스킬 툴팁 문장은 **스킬마다 제 틀**이다 — `skill.csv:desc_kr` · `desc_en` [2026-10-21 사용자 지시 · ADR-0679 — ~~`sk.line.*` 공용 틀 · `sk.eff.*` 효과 구절~~].
       여기 남는 것은 공격이 같이 쓰는 둘째 문장(추가 피해)과 숫자 자리 안에 드는 구절(수량 · 단위)이다 — 자리 이름은 `tip.js:descSlots`.
       확률로 터지는 추가 피해 [2026-09-10 · ADR-0089] — 공격 문장 **뒤에 서는 완결된 둘째 문장**이다. {c} = 확률 · {x} = 배수(%) */
    'sk.line.proc': {
        ko: '타격마다 {c} 확률로 피해가 {x} 가 됨',
        en: 'Each hit has a {c} chance to deal {x} damage',
        zh: '每次命中有{c}几率使伤害变为{x}',
    },
    /* 수량 구절 — 값을 아는 자리는 **실제 수치**(`{v}`), 모르는 자리(도감 · 후보 카드)는 **식**(`{f}`)으로 접는다 [식 2026-09-10 · ADR-0089].
       `{v}` 에는 Alt 를 누르는 동안 괄호 식이 따라 붙는다 — 틀은 그걸 모른다. ⚠ 감소·치명·추가 피해 전의 값이다 (game_logic/skill.js:previewOf)
       ~~`sk.amt.mult` · `sk.amt.healMult`(「공격력의 {m}%」)~~ → 식 모양 `sk.amt.*Fx` · `sk.amt.healFx` — 회복의 밑수는 마법 공격력이라 옛 문구가 틀렸었다.
       피해는 식이어도 **종류를 말한다** (2026-10-02 · ADR-0477 — ~~`sk.amt.fx`(「{f} 만큼 피해」)~~) */
    'sk.amt.physical': { ko: '{v} 의 물리 피해', en: '{v} physical damage', zh: '{v}点物理伤害' },
    'sk.amt.elem': { ko: '{v} 의 {e} 피해', en: '{v} {e} damage', zh: '{v}点{e}伤害' },   // {e} = 원소 이름 `st.atkType.*` — 「마법 피해」는 없다(마법 공격은 반드시 원소를 갖는다 · battle_design §2-1)
    'sk.amt.physicalFx': { ko: '{f} 의 물리 피해', en: 'physical damage equal to {f}', zh: '相当于{f}的物理伤害' },   // ko 는 값 자리와 같은 꼴 — ~~「{f} 만큼의」~~ (2026-10-02 사용자 지시)
    'sk.amt.elemFx': { ko: '{f} 의 {e} 피해', en: '{e} damage equal to {f}', zh: '相当于{f}的{e}伤害' },
    'sk.amt.heal': { ko: '{v} 만큼', en: '{v} HP', zh: '{v}点' },
    'sk.amt.healFx': { ko: '{f} 만큼', en: 'HP equal to {f}', zh: '{f}点' },
    /* 숫자 자리의 단위 — 틀이 아니라 **자리 안에** 든다(Alt 의 괄호 식이 값 바로 뒤에 서게). 초는 `time.s` · % 는 기호 그대로 */
    'sk.u.times': { ko: '{v}번', en: { one: '{v} time', other: '{v} times' }, zh: '{v}次' },
    // ~~`sk.altHint`(「Alt 계산식」 각주)~~ 는 2026-10-03 삭제 [사용자 지시 · ADR-0499]
    /* 그 스킬의 **표기 쿨** [개정 2026-09-08 2차 사용자 지시] — 어느 영웅이 들든 같은 수다.
       ~~`sk.base`·`sk.eff`·`sk.aligned`~~ (1차 폐기) → ~~`sk.every`(`{s}초마다`)~~ → **`sk.cool`**.
       **말까지 바꾼 이유는 값이 바뀌었기 때문**이다 — 「{s}초마다」는 빈도의 약속인데 표기 쿨은 빈도가 아니다
       (정렬 대기만큼 뒤에 나간다). 쿨이라고 적으면 참이 된다 */
    'sk.cool': { ko: '쿨 {s}초', en: 'Cooldown {s}s', zh: '冷却{s}秒' },
    // 설명창 Alt 쿨 식 `(18 − 쿨감 10%)` 의 이름 — 문장 한가운데 끼어서 줄인다 (2026-10-21 · ADR-0706 · 세부 스탯 줄은 combat_stat.csv 이름 그대로)
    'sk.cdrShort': { ko: '쿨감', en: 'Cooldown Reduction', zh: '冷却缩减' },
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
        zh: '轮到行动时：<b>等待最久的技能</b> → 若并列则按<b>格位顺序</b> → 都没有则普通攻击。<b>魔法武器没有普通攻击</b>——没有准备好的技能时，行动槽会保持满格等待，技能一准备好就立即施放<br>每次行动只用一个。技能会<b>取代</b>该次行动的攻击，且没有法力——行动1次就是唯一的消耗<br>冷却按实时流逝<br>普通攻击始终是<b>物理</b>——元素伤害只来自技能<br>技能<b>归属于职业</b>——一个技能只属于一个职业，英雄栏来自<b>英雄的职业池</b>，习得栏来自<b>学过的书</b>。<b>打击、治疗、召唤</b>技能无论在哪一格，都必须手持该技能所属职业的武器才会施放；战吼、光环、祝福等<b>增益、减益</b>不看武器<br>⚠ 名称与形态已确定，但<b>倍率、攻击次数、冷却、持续时间尚未发布</b>——当前数值是临时的',
    },
    'sk.sinTree': { ko: '{sin} 마스터리', en: '{sin} Mastery', zh: '{sin}专精' },
    'sk.sinTree.sub': { ko: '모든 {sin} 영웅 공유', en: 'Shared by all {sin} heroes', zh: '所有{sin}英雄共享' },
    'sk.sinTree.missing': {
        ko: '<b>맨 아랫줄(반응형)은 기획이 방향만 정했습니다</b> — 「~하면 ~하는 효과」는 발동 빈도에 파워가 종속돼 값을 잴 자가 없습니다.',
        en: '<b>The bottom row (reactive) has direction but no numbers</b> — "when X, then Y" scales with trigger frequency, and there is no yardstick for that yet.',
        zh: '<b>最下一行（反应型）在设计上只定了方向</b>——“当……时产生……效果”的威力取决于触发频率，还没有衡量其数值的标准。',
    },
    'sk.mastery': { ko: '{cls} 마스터리', en: '{cls} Mastery', zh: '{cls}专精' },
    'sk.mastery.missing': {
        ko: '죄종 마스터리와 <b>같은 구조</b>입니다. <b>맨 윗줄 3칸은 직업마다 확정</b>돼 있습니다.<br>'
            + '<b>그 아래 3칸은 낀 장비가 효과를 켭니다.</b> 빠른 무기는 데미지 %, 느린 무기는 공격 속도, 자기 직업의 갑옷군은 갑옷 마스터리를 켭니다. 랭크는 장비가 안 맞아도 찍어 둘 수 있지만 효과는 꺼집니다.<br>'
            + '맨 아랫줄의 반응형 노드는 아직 기획 중입니다.',
        en: 'The class mastery uses the <b>same structure</b> as sin mastery. <b>Each class has three confirmed nodes in the top row.</b><br>'
            + '<b>Equipped gear activates the three nodes below.</b> Fast weapons activate Damage %, slow weapons activate Attack Speed, and the class armor type activates Armor Mastery. You can invest ranks without matching gear, but the effect stays inactive.<br>'
            + 'The reactive bottom row is still being designed.',
        zh: '与罪宗专精<b>结构相同</b>。<b>最上一行3格按职业已确定</b>。<br><b>其下3格的效果由穿戴的装备开启。</b>快速武器开启伤害%，慢速武器开启攻击速度，本职业的铠甲类别开启铠甲专精。装备不匹配时也能先投阶，但效果处于关闭状态。<br>最下一行的反应型节点仍在设计中。',
    },
    'sk.advTree': { ko: '전직 마스터리', en: 'Advancement Mastery', zh: '转职专精' },   // 전직 전(잠긴 판)의 머리 — 전직하면 「<전직 이름> 마스터리」(`sk.mastery` · ADR-1107)
    'sk.advNeed': { ko: '전직', en: 'Advance', lock: true, zh: '转职' },   // 전직 판의 잠김 베일 (§7 · §13-1)
    'sk.adv.slot.size': { ko: '크기', en: 'Power', zh: '威力' },   // 전직 스킬 줄 칸 이름 — 크기 · 변형 1 · 변형 2 (2026-11-13 · R471 · ADR-1081)
    'sk.adv.slot.var1': { ko: '변형 1', en: 'Variant 1', zh: '变体1' },
    'sk.adv.slot.var2': { ko: '변형 2', en: 'Variant 2', zh: '变体2' },
    'sk.adv.bonusAt': { ko: '{max}랭크: {b}', en: 'Rank {max}: {b}', zh: '{max}阶：{b}' },   // 칸 툴팁 끝줄 — 5랭크 덤
    'sk.adv.commonNow': { ko: '효과 {v}', en: 'Effect {v}', zh: '效果{v}' },   // 공통 줄 칸 툴팁 — 지금 값(0 랭크면 1랭크 값)
    'sk.adv.commonFull': { ko: '{v}', en: '{v}', zh: '{v}' },   // 공통 줄 5랭크 값
    // 스킬 창 전직 판 줄 위 띠 이름 — 마스터리 판의 `Tier n` 자리 · 위에서부터 스킬 셋 · 스킬 줄 · 공통 줄 (2026-11-14 · ADR-1112)
    'sk.adv.band.skill': { ko: '전직 스킬', en: 'Advanced Skill', zh: '转职技能' },
    'sk.adv.band.line': { ko: '전직 스킬 강화', en: 'Skill Upgrades', zh: '转职技能增强' },
    'sk.adv.lineNeed': { ko: '전직 스킬 습득', en: 'Learn an Advanced Skill', lock: true, zh: '习得转职技能' },   // 스킬 줄 자물쇠 칸의 툴팁 한 줄 (§7 · §13-1 · ADR-1181)
    'sk.adv.band.common': { ko: '공통 마스터리', en: 'Common Mastery', zh: '通用专精' },
    'sk.advTree.missing': { ko: "전직 후 갈래의 메인 셋 중 하나를 <b>공용 스킬 포인트 1</b>로 배웁니다. 스킬 포인트는 레벨마다 받고 죄종·직업 마스터리와 나누어 씁니다.<br>메인 단계만 영웅 Lv30·35·40·45·50에 Lv1·2·3·4·5가 열립니다. 특수·변형·필살기 꼬리는 현재 준비 중입니다.", en: "Learn one of the path's three main skills for <b>one shared skill point</b>. Points come with every level from Lv1 and are shared with Sin and Class mastery.<br>Main ranks Lv1–5 unlock at hero Lv30/35/40/45/50. Special, Variant and Ultimate branches are currently coming later.", zh: '转职后用<b>1点共用技能点</b>学习所选路线的三个主技能之一。技能点每级获得，与罪宗、职业专精共用。<br>只有主技能阶段在英雄Lv30、35、40、45、50时依次开启Lv1、2、3、4、5。特殊、变体、必杀技分支目前准备中。' },
    'sk.lockedSuffix': { ko: ' (잠김)', en: ' (locked)', zh: '（未解锁）' },
    'sk.grid.note': {
        ko: '마스터리는 가지가 갈리는 트리가 아니라 <b>위에서 아래로 쌓는</b> 구조입니다 — <b>윗줄이 먼저 열리고 아랫줄일수록 늦게</b> 열립니다<br>'
            + '칸을 누르면 1랭크 오릅니다. 아직 못 여는 칸에는 <b>필요한 레벨</b>이 적힙니다. <b>빈 칸은 기획 미작성 자리</b>이고, 점선 프레임을 남겨 두는 것은 어디까지 갈 수 있는지를 보여주기 위해서입니다',
        en: 'Mastery is not a branching tree but <b>stacks from top to bottom</b> — <b>the top row opens first, lower rows later</b><br>'
            + 'Click a cell to add a rank. Cells you cannot open yet show <b>the level they need</b>. <b>Empty cells are unwritten design</b>; the dashed frame stays so you can see how far this can go',
        zh: '专精不是分叉的技能树，而是<b>自上而下叠加</b>的结构——<b>上行先开启，越往下开启越晚</b><br>点击格子提升1阶。尚无法开启的格会标出<b>所需等级</b>。<b>空位是尚未设计的位置</b>，保留虚线框是为了显示最多能走到哪里',
    },

    /* ── 선술집 ── */
    'tv.h': { ko: '영웅 고용', en: 'Hire Heroes', zh: '雇佣英雄' },
    'tv.sub': { ko: '레어 층 — 직업 × 죄종 × 시작특성을 등장 시 굴림', en: 'Rare tier — class × sin × trait rolled on arrival', zh: '稀有层——职业×罪宗×初始特性在登场时随机' },
    'tv.reroll.note': {
        ko: '선술집 리롤 = <b>아이템 파밍의 영웅판</b> — 굴림 루프는 <b>레어 층</b>에 있습니다. 죄종 × 직업 35칸을 전부 여기서 공급합니다',
        en: 'Tavern rerolls are <b>item farming for heroes</b> — the rolling loop lives in the <b>rare tier</b>, which supplies all 35 sin × class combinations',
        zh: '酒馆刷新=<b>英雄版的物品刷取</b>——随机循环位于<b>稀有层</b>。罪宗×职业的35格全部由这里供应',
    },
    'tv.tiers.note': {
        ko: '<b>유니크</b> — 이름·직업·죄종 고정 + 고유 스킬 1개(영웅 전용), 영웅 로스터에 1명만. 본편 15명(직업별 3)이 상한<br>'
            + '<b>레어</b> — 전부 굴림, 고유 스킬은 공용 풀에서 배정. 죄종 × 직업 35칸 커버리지를 전담합니다',
        en: '<b>Unique</b> — fixed name, class, and sin + 1 signature skill (hero-exclusive); one copy per roster. Capped at 15 in the base game (3 per class)<br>'
            + '<b>Rare</b> — everything rolled; signature skill assigned from the shared pool. Covers all 35 sin × class cells',
        zh: '<b>唯一</b>——名称、职业、罪宗固定+固有技能1个（英雄专属），英雄名册中只能有1名。本篇上限15名（每职业3名）<br><b>稀有</b>——全部随机，固有技能从通用池中分配。专门负责覆盖罪宗×职业的35格',
    },

    /* ── 실험실 (SCREEN_DESIGN §18 · ADR-0580 · ADR-0610) — 개발 장치 · 패널에 규칙 문장이 없다(숫자 · 이름 · 버튼만) ── */
    'lab.tool.item': { ko: '아이템 생성기', en: 'Item Generator', zh: '物品生成器' },
    'lab.tool.raid': { ko: '레이드', en: 'Raid', zh: '突袭' },
    // 실험실 결투 — AI 챔피언 팀 둘 · 측정 스위치 둘 (SCREEN_DESIGN §18 「결투 시험」 · ADR-1070)
    'lab.tool.duel': { ko: '결투', en: 'Duel', zh: '决斗' },
    'lab.duel.kit': { ko: '{tier} · Lv{lv}', en: '{tier} · Lv{lv}', zh: '{tier} · Lv{lv}' },
    'lab.duel.reroll': { ko: '조합 돌리기', en: 'Reroll Teams', zh: '随机组合' },
    'lab.duel.again': { ko: '다시 싸우기', en: 'Fight Again', zh: '再战一次' },
    'lab.duel.res': { ko: '저항 {v}%', en: 'Resist {v}%', zh: '抗性{v}%' },
    'lab.duel.win.top': { ko: '위 승 · {sec}초', en: 'Top wins · {sec}s', zh: '上方胜 · {sec}秒' },
    'lab.duel.win.bottom': { ko: '아래 승 · {sec}초', en: 'Bottom wins · {sec}s', zh: '下方胜 · {sec}秒' },
    'lab.duel.timeout': { ko: '시간 초과 · {sec}초', en: 'Timeout · {sec}s', zh: '超时 · {sec}秒' },
    // 결투 편성 창 — 팀 A 의 영웅(직업 · 죄종)과 작전 카드(칸마다 카드 · 등급 · 옵션 줄 둘) (2026-11-26 · R586 · SCREEN_DESIGN §18)
    'lab.duel.party.title': { ko: '결투 편성', en: 'Duel Party', zh: '决斗编队' },
    'lab.duel.party.edit': { ko: '편성 수정', en: 'Edit Party', zh: '编辑编队' },
    'lab.duel.party.heroes': { ko: '영웅', en: 'Heroes', zh: '英雄' },
    'lab.duel.party.leader': { ko: '리더', en: 'Leader', zh: '队长' },
    'lab.duel.party.hero': { ko: '영웅 {n}', en: 'Hero {n}', zh: '英雄 {n}' },
    'lab.duel.party.class': { ko: '직업', en: 'Class', zh: '职业' },
    'lab.duel.party.random': { ko: '무작위', en: 'Random', zh: '随机' },
    'lab.duel.party.empty': { ko: '없음', en: 'None', zh: '无' },
    'lab.duel.party.card': { ko: '카드', en: 'Card', zh: '卡牌' },
    'lab.duel.party.grade': { ko: '등급', en: 'Grade', zh: '稀有度' },
    'lab.duel.party.line': { ko: '옵션 {n}', en: 'Option {n}', zh: '词条 {n}' },
    'lab.duel.party.reset': { ko: '초기화', en: 'Reset', zh: '重置' },
    'lab.duel.party.fight': { ko: '이 편성으로 싸우기', en: 'Fight with this party', zh: '使用此编队战斗' },
    'lab.h.chapter': { ko: '챕터', en: 'Chapter', zh: '章' },
    'lab.h.monster': { ko: '몬스터', en: 'Monster', zh: '怪物' },
    'lab.h.grade': { ko: '등급', en: 'Grade', zh: '级别' },
    'lab.h.diff': { ko: '난이도', en: 'Difficulty', zh: '难度' },
    'lab.h.level': { ko: '스테이지 레벨', en: 'Stage Level', zh: '关卡等级' },
    'lab.h.slots': { ko: '부위', en: 'Slots', zh: '部位' },
    'lab.h.ilvl': { ko: '아이템 레벨', en: 'Item Level', zh: '物品等级' },
    'lab.h.weights': { ko: '희귀도 가중치', en: 'Rarity Weights', zh: '稀有度权重' },
    'lab.roll': { ko: '굴리기', en: 'Roll', zh: '随机生成' },
    'lab.roll10': { ko: '×10', en: '×10', zh: '×10' },
    'lab.clear': { ko: '비우기', en: 'Clear', zh: '清空' },
    'lab.count': { ko: '{n}개', en: { one: '{n} item', other: '{n} items' }, zh: '{n}个' },

    /* ── 도감 ── */
    /* 세그먼트 다섯 [마스터리 추가 2026-09-24 — SCREEN_DESIGN §9] — 몬스터(카드 수집)만 이 블록이 든다.
       나머지 넷(캐릭터 · 아이템 · 스킬 · 마스터리)의 문구는 아래 「도감 — 자산 세그먼트」(`ix.*`) 블록이다.
       `cx.h`(몬스터 도감)는 화면 제목 자리를 `nav.codex` 에 내주고 **도움말 섹션 제목으로만** 남는다 (§12). */
    'cx.seg.monster': { ko: '몬스터', en: 'Monsters', zh: '怪物' },
    'cx.seg.character': { ko: '캐릭터', en: 'Characters', zh: '角色' },
    'cx.seg.item': { ko: '아이템', en: 'Items', zh: '物品' },
    'cx.seg.skill': { ko: '스킬', en: 'Skills', zh: '技能' },
    'cx.seg.fx': { ko: '이펙트', en: 'Effects', zh: '特效' },
    'cx.seg.mastery': { ko: '마스터리', en: 'Masteries', zh: '专精' },
    'cx.seg.sin': { ko: '죄종', en: 'Sins', zh: '罪宗' },   // 의뢰 죄종별 수령 횟수 (§9 · ADR-1069 · R457)
    'cx.sin.n': { ko: '수령 {n}회', en: 'Claimed {n}', zh: '领取{n}次' },
    'cx.h': { ko: '몬스터 도감', en: 'Monster Codex', zh: '怪物图鉴' },
    'cx.sub': { ko: '도감 경험치 {list}에서 레벨이 오릅니다 — 처치 하나에 {per} · Lv1 · Lv2 의 보너스 효과는 그 몬스터와 같은 종족 전체에 붙습니다', en: 'Levels up at {list} codex EXP — each kill gives {per} · Lv1 and Lv2 bonus effects apply to every monster of the same race', zh: '图鉴经验达到{list}时升级——每次击杀获得{per} · Lv1、Lv2的奖励效果作用于与该怪物同种族的所有怪物' },   // 종족 = monster_type(데몬 · 생물 · 언데드 — 2026-11-14 R494 · ADR-1151)
    /* 잠금 문구 셋(cx.chLocked · cx.chLockedTail · cx.locked)은 2026-09-06 삭제 — 도감이 해금을 안 본다 (SCREEN_DESIGN §9) */
    'cx.sinLabel': { ko: '죄종', en: 'Sin', zh: '罪宗' },
    'cx.exp': { ko: '경험치 {n}', en: '{n} EXP', zh: '经验{n}' },   // 그 몬스터의 누적 도감 경험치 — 카드 진행 줄 · 핍 툴팁 (ADR-0587 · ~~cx.kills 처치 {n}~~)
    'cx.lvTitle': { ko: '도감 Lv.{lv}', en: 'Codex Lv.{lv}', zh: '图鉴Lv.{lv}' },
    // 구간 — 카드 핍의 작은 툴팁 · 몬스터 툴팁 구간 줄의 왼쪽 칸 (SCREEN_DESIGN §9 · ADR-1261)
    'cx.segTitle': { ko: '도감 Lv.{a} ~ {b}', en: 'Codex Lv.{a}–{b}', zh: '图鉴Lv.{a}~{b}' },
    'cx.tip.seg': { ko: 'Lv.{a} ~ {b}', en: 'Lv.{a}–{b}', zh: 'Lv.{a}~{b}' },
    // 몬스터 툴팁 — 초상 옆 이야기 · 아래 처치 단계 (SCREEN_DESIGN §9 · ADR-0206)
    'cx.tip.lv': { ko: 'Lv.{lv}', en: 'Lv.{lv}', zh: 'Lv.{lv}' },
    'cx.tip.story': { ko: '스토리', en: 'Story', zh: '故事' },
    'cx.tip.effects': { ko: '보너스 효과', en: 'Bonus Effects', zh: '奖励效果' },
    // 단계표의 Lv1 · Lv2 — **그 몬스터 한 마리의 몫** 앞에 종족 이름(`{race}` — monster_type.csv · 데몬 · 생물 · 언데드 — 2026-11-14 ADR-1151)을 단다 · Lv2 는 「상대」 · `{line}` = 줄 한 줄(파밍 = 아래 다섯 ·
    //   전투 = 장비 옵션 줄 표기) · `{v}` = 부호 붙은 값 (SCREEN_DESIGN §9 · ADR-0715 · monster_design §8 — ~~그 몬스터에게만 · cx.rw.vs_dmg~~ ADR-0667)
    'cx.rw.farm': { ko: '{race} {line}', en: '{line} from {race}', zh: '{race}{line}' },
    'cx.rw.fight': { ko: '{race} 상대 {line}', en: '{line} vs {race}', zh: '对{race}{line}' },
    // 도감 몬스터 툴팁 가운데 칸 — 오르는 것의 이름만 · 값은 오른쪽 칸 (ADR-1276)
    'cx.rw.xp': { ko: '파티 경험치 획득', en: 'Party Experience Gain', zh: '队伍经验获取' },
    'cx.rw.drop': { ko: '드롭 확률', en: 'Drop Chance', zh: '掉落几率' },
    'cx.rw.magic': { ko: '파티 매직아이템 획득확률', en: 'Party Magic Find', zh: '队伍魔法物品获取率' },
    'cx.rw.gold': { ko: '파티 골드 획득', en: 'Party Gold Find', zh: '队伍金币获取' },
    'cx.rw.material': { ko: '재료 획득', en: 'Material Find', zh: '材料获取' },
    // 전체 버프 — 도감 몬스터 챕터 줄 오른쪽 버튼 · 그 창의 제목 · 묶음 머리 셋 (SCREEN_DESIGN §9 · ADR-1279)
    'cx.buff.btn': { ko: '전체 버프', en: 'All Buffs', zh: '全部增益' },
    'cx.buff.farm': { ko: '파밍', en: 'Farming', zh: '刷取收益' },
    'cx.buff.fight': { ko: '전투', en: 'Combat', zh: '战斗' },
    'cx.buff.option': { ko: '옵션 · 파티 전원', en: 'Options · Whole Party', zh: '词条 · 全队生效' },
    // 스킬 도감 툴팁의 둘째 장 — 획득처 작은 초상 · 레벨이 오르면 (SCREEN_DESIGN §9-1 · ADR-0680 — ~~단계~~ ADR-0650) · 「상단」 머리는 건물 이름 데이터(building.csv)
    'cx.tip.source': { ko: '획득처', en: 'Found On', zh: '获取地点' },
    'cx.tip.levelOptions': { ko: '레벨별 옵션', en: 'Options by Level', zh: '各等级词条' },
    'cx.tip.at': { ko: '{c}-{s}', en: '{c}-{s}', zh: '{c}-{s}' },   // 초상 아래 장-장소
    'cx.tip.lvUp': { ko: '레벨이 오르면', en: 'Per Level', zh: '升级时' },   // 아랫칸 머리글 — 그 스킬의 레벨 줄 하나 (skill_effect.csv:level_field · level_step)
    // 레벨 줄의 칸 이름 — 하는 일·대상·걸린 효과의 stat과 부호로 정한다. 값은 해당 레벨의 실효값이다.
    'cx.lv.mult': { ko: '피해 배율', en: 'Damage multiplier', zh: '伤害倍率' },   // mult_pct — 때린다
    'cx.lv.heal': { ko: '회복 배율', en: 'Healing multiplier', zh: '治疗倍率' },   // mult_pct — 회복 · 자기 회복
    'cx.lv.hits': { ko: '타수', en: 'Hits', zh: '攻击次数' },   // hits
    'cx.lv.decay': { ko: '감쇠', en: 'Falloff', zh: '衰减' },   // decay_pct — 뒤 대상일수록 줄어드는 비율
    'cx.lv.strip': { ko: '방어 깎기', en: 'Defense strip', zh: '削减防御' },   // decay_pct — 가이디드(방어가 가장 두꺼운 적)는 그 적의 방어를 깎는 비율이다
    'cx.lv.dur': { ko: '지속 시간', en: 'Duration', zh: '持续时间' },   // duration_sec
    'cx.lv.value': { ko: '효과', en: 'Effect', zh: '效果' },   // 아직 이름을 정의하지 않은 효과의 대비값
    'cx.lv.def': { ko: '방어력 상승', en: 'Defense increase', zh: '防御提高' },
    'cx.lv.defDown': { ko: '방어력 감소', en: 'Defense reduction', zh: '防御降低' },
    'cx.lv.resAll': { ko: '모든 저항 상승', en: 'All resistances increase', zh: '所有抗性提高' },
    'cx.lv.resAllDown': { ko: '모든 저항 감소', en: 'All resistances reduction', zh: '所有抗性降低' },
    'cx.lv.hp': { ko: '최대 HP 상승', en: 'Max HP increase', zh: '最大生命提高' },
    'cx.lv.hpDown': { ko: '최대 HP 감소', en: 'Max HP reduction', zh: '最大生命降低' },
    'cx.lv.dmg': { ko: '데미지 상승', en: 'Damage increase', zh: '伤害提高' },
    'cx.lv.dmgDown': { ko: '데미지 감소', en: 'Damage reduction', zh: '伤害降低' },
    'cx.lv.phys': { ko: '물리 데미지 상승', en: 'Physical damage increase', zh: '物理伤害提高' },
    'cx.lv.physDown': { ko: '물리 데미지 감소', en: 'Physical damage reduction', zh: '物理伤害降低' },
    'cx.lv.speed': { ko: '공격 속도 상승', en: 'Attack speed increase', zh: '攻击速度提高' },
    'cx.lv.speedDown': { ko: '공격 속도 감소', en: 'Attack speed reduction', zh: '攻击速度降低' },
    'cx.lv.takenUp': { ko: '받는 피해 증가', en: 'Damage taken increase', zh: '所受伤害提高' },
    'cx.lv.takenDown': { ko: '받는 피해 감소', en: 'Damage taken reduction', zh: '所受伤害降低' },
    'cx.lv.barrier': { ko: '보호막 (최대 HP 비율)', en: 'Shield / max HP', zh: '护盾（最大生命比例）' },
    'cx.lv.elementDamage': { ko: '{e} 추가 피해', en: '{e} bonus damage', zh: '{e}额外伤害' },
    'cx.lv.elementMult': { ko: '{e} 피해 배율', en: '{e} damage multiplier', zh: '{e}伤害倍率' },
    'cx.lv.defIgnore': { ko: '방어력 관통', en: 'Defense Penetration', zh: '防御穿透' },
    'cx.lv.vsBurn': { ko: '화상 대상 데미지 상승', en: 'Damage vs burning foes', zh: '对燃烧目标伤害提高' },
    'cx.lv.ailmentChance': { ko: '{a} 확률', en: '{a} chance', zh: '{a}几率' },
    'cx.lv.ailmentDuration': { ko: '{a} 지속 시간', en: '{a} duration', zh: '{a}持续时间' },
    'cx.lv.regen': { ko: '초당 회복 (최대 HP 비율)', en: 'HP / sec (% max HP)', zh: '每秒恢复（最大生命比例）' },
    'cx.lv.cool': { ko: '쿨타임', en: 'Cooldown', zh: '冷却' },   // cool_sec
    'cx.lv.hitsAt': { ko: 'Lv {l} 에 +1번', en: '+1 at Lv {l}', zh: 'Lv {l}时+1次' },   // hits — 단계가 정수가 아니면 한 타가 느는 레벨(러시 · 2026-10-28 R374)
    'cx.note': {
        ko: '그 몬스터에게서 모은 도감 경험치가 누적 문턱을 넘을 때마다 <b>그 몬스터의 도감 레벨</b>이 오르고 보너스 효과가 하나씩 열립니다 — 앞 단계(처치 경험치 · 상대 피해 · 드롭 확률)는 <b>그 몬스터에게만</b> · 마지막 단계는 <b>그 몬스터의 전투 옵션 하나가 파티 전원에게</b> 늘 붙습니다 — <b>파밍이 도감을 밉니다</b><br>'
            + '처치 하나의 도감 경험치는 그 원정의 난이도가 정합니다 — 높은 난이도일수록 빨리 찹니다 · 이긴 라운드의 처치만 셉니다 · 보스 등급별 차등은 후속<br>'
            + '카드에 마우스를 올리면 그 몬스터의 이야기와 레벨 단계가 뜹니다',
        en: "Each time the codex EXP gathered from a monster passes a cumulative threshold, <b>its codex level</b> rises and opens one more bonus effect — the early ones (kill EXP · damage to it · drop chance) apply <b>to that monster only</b> · the last one adds <b>that monster's combat option to your whole party</b> for good — <b>farming pushes the codex</b><br>"
            + "Each kill's codex EXP is set by the expedition's difficulty — higher difficulties fill it faster · only kills from rounds you win count · boss-grade scaling comes later<br>"
            + "Hover a card to see the monster's story and level milestones",
        zh: '每当从该怪物收集的图鉴经验越过累计门槛，<b>该怪物的图鉴等级</b>就会提升，并逐个开启奖励效果——前几个阶段（击杀经验、对其伤害、掉落几率）<b>只对该怪物</b>生效 · 最后一个阶段则使<b>该怪物的一条战斗词条常驻于队伍全员</b>——<b>刷怪推动图鉴</b><br>每次击杀的图鉴经验由该次远征的难度决定——难度越高积累越快 · 只计算获胜回合中的击杀 · 按首领级别区分的差异留待后续<br>鼠标悬停在卡片上，会显示该怪物的故事与等级阶段',
    },

    /* ── 도감 — 자산 세그먼트 (SCREEN_DESIGN §9-1 · 신설 2026-09-06 · 탭 흡수 2026-09-08) ──
       타일에 붙는 것은 **이름과 파일명뿐**이다 — 「무기는 제 그림이고 방어구는 임시다」 같은 규칙은
       화면 문구가 아니라 §9-1 과 `mock.js` 주석의 내용이다 (§12 설명 문구는 도움말 탭 전용).
       **`ix.` 접두를 그대로 둔다** — 옛 「이미지 도감」 탭이 도감의 세그먼트 셋이 됐을 뿐 이 문구 묶음은 그대로라,
       접두를 `cx.` 로 갈면 몬스터 카드 문구와 한 이름 공간에 섞여 오히려 어느 세그먼트의 것인지가 안 읽힌다.
       09-08 삭제 — `ix.h`(탭 제목 · `nav.codex` 가 받는다) · `ix.seg.*`(세그먼트 · `cx.seg.*` 가 받는다) ·
       `ix.g.monster`(몬스터 초상 묶음 · 몬스터 세그먼트의 카드가 그 일을 한다 — §9). */
    // 아이템 세그먼트의 안쪽 분류 (ADR-0179) — 장신구도 비무기 장비이므로 방어구 쪽 부위 묶음에 든다
    // 물약은 셋째 탭이다 [2026-09-23 · ADR-0314] — 장비가 아니라 소모품이라 방어구 쪽에 못 든다
    'ix.seg.weapon': { ko: '무기', en: 'Weapons', zh: '武器' },
    'ix.seg.armor': { ko: '방어구', en: 'Armor', zh: '防具' },
    'ix.seg.potion': { ko: '물약', en: 'Potions', zh: '药水' },
    // 옵션은 넷째 탭이다 [2026-11-18 · ADR-1275 · 부위 고르개 ADR-1278 · R547] — 부위 하나의 옵션 표 · 표 머리(죄종 열은 `cx.sinLabel` · 값 열 머리는 비운다 — ADR-1286 · 단어는 `sin_word.csv`)
    'ix.seg.option': { ko: '옵션', en: 'Options', zh: '词条' },
    'ix.opt.no': { ko: '칸', en: 'No.', zh: '序号' },
    'ix.opt.name': { ko: '옵션', en: 'Option', zh: '词条' },
    /* 물약 묶음 — **종류 하나가 묶음 하나**이고 머리가 종류 이름이다 (§9-1 · ADR-0314).
       **물약 이름은 여기 없다** — `potion.csv:name_kr`/`name_en` 을 `L()` 로 푼다(무기 베이스 `ix.b.*` 와 다르다 ·
       그쪽은 묶음이 CSV 행을 아직 안 읽어서 생긴 임시다). `kind` 만 CSV 에 라벨 컬럼이 없어 이 줄이 든다. */
    'ix.g.potion': { ko: '{kind} 포션', en: '{kind} Potions', zh: '{kind}药水' },
    'ix.pk.heal': { ko: '회복', en: 'Healing', zh: '治疗' },
    /* 무기 베이스 — 도감 타일 이름 (2026-09-10 · 둔기 · 창 · 활 2026-09-11 · 스태프 · 오브 · 십자가 · 성경 · 석궁 2026-09-14). ⚠ **`weapon_base.csv` 와 같은 이름이 두 벌이다** —
       본편 열 무기군 전부 CSV 행이 섰으므로 도감이 `L(row)` 로 읽게 되면 이 줄들은 걷는다. 그때까지 CSV 와 **글자까지 같게** 둔다.
       **영어가 원본이고 한글은 직역**이다 (CLAUDE.md 규칙 6). */
    'ix.b.long_sword': { ko: '롱 소드', en: 'Long Sword', zh: '长剑' },
    'ix.b.claymore': { ko: '클레이모어', en: 'Claymore', zh: '双手大剑' },
    'ix.b.highland_blade': { ko: '하이랜드 블레이드', en: 'Highland Blade', zh: '高地剑' },
    'ix.b.bastard_sword': { ko: '바스타드 소드', en: 'Bastard Sword', zh: '手半剑' },
    'ix.b.balrog_blade': { ko: '발록 블레이드', en: 'Balrog Blade', zh: '炎魔剑' },
    'ix.b.zweihander': { ko: '츠바이핸더', en: 'Zweihander', zh: '双手重剑' },
    'ix.b.colossus_blade': { ko: '콜로서스 블레이드', en: 'Colossus Blade', zh: '巨神刃' },
    'ix.b.hatchet': { ko: '해칫', en: 'Hatchet', zh: '小斧' },
    'ix.b.axe': { ko: '액스', en: 'Axe', zh: '斧' },
    'ix.b.tomahawk': { ko: '토마호크', en: 'Tomahawk', zh: '土著战斧' },
    'ix.b.great_axe': { ko: '그레이트 액스', en: 'Great Axe', zh: '重斧' },
    'ix.b.berserker_axe': { ko: '버서커 액스', en: 'Berserker Axe', zh: '狂战士斧' },
    'ix.b.battle_axe': { ko: '배틀 액스', en: 'Battle Axe', zh: '战斗斧' },
    'ix.b.decapitator': { ko: '데카피테이터', en: 'Decapitator', zh: '斩首斧' },
    'ix.b.club': { ko: '클럽', en: 'Club', zh: '木棒' },
    'ix.b.flanged_mace': { ko: '플랜지드 메이스', en: 'Flanged Mace', zh: '凸缘钉锤' },
    'ix.b.reinforced_mace': { ko: '리인포스드 메이스', en: 'Reinforced Mace', zh: '加固锤' },
    'ix.b.battle_hammer': { ko: '배틀 해머', en: 'Battle Hammer', zh: '战斗锤' },
    'ix.b.legendary_mallet': { ko: '레전더리 맬릿', en: 'Legendary Mallet', zh: '传说之锤' },
    'ix.b.war_club': { ko: '워 클럽', en: 'War Club', zh: '战棍' },
    'ix.b.ogre_maul': { ko: '오우거 몰', en: 'Ogre Maul', zh: '食肉魔锤' },
    'ix.b.pike': { ko: '파이크', en: 'Pike', zh: '尖枪' },
    'ix.b.thresher': { ko: '스레셔', en: 'Thresher', zh: '砍斧' },
    'ix.b.giant_thresher': { ko: '자이언트 스레셔', en: 'Giant Thresher', zh: '巨型砍斧' },
    'ix.b.halberd': { ko: '할버드', en: 'Halberd', zh: '斧枪' },
    'ix.b.cryptic_axe': { ko: '크립틱 액스', en: 'Cryptic Axe', zh: '神秘斧' },
    'ix.b.lance': { ko: '랜스', en: 'Lance', zh: '骑枪' },
    'ix.b.war_pike': { ko: '워 파이크', en: 'War Pike', zh: '战争长枪' },
    'ix.b.short_bow': { ko: '숏 보우', en: 'Short Bow', zh: '短弓' },
    'ix.b.long_bow': { ko: '롱 보우', en: 'Long Bow', zh: '长弓' },
    'ix.b.great_bow': { ko: '그레이트 보우', en: 'Great Bow', zh: '重弓' },
    'ix.b.rune_bow': { ko: '룬 보우', en: 'Rune Bow', zh: '符文弓' },
    'ix.b.diamond_bow': { ko: '다이아몬드 보우', en: 'Diamond Bow', zh: '钻石弓' },
    'ix.b.gothic_bow': { ko: '고딕 보우', en: 'Gothic Bow', zh: '哥特弓' },
    'ix.b.hydra_bow': { ko: '하이드라 보우', en: 'Hydra Bow', zh: '九头蛇弓' },
    'ix.b.short_staff': { ko: '숏 스태프', en: 'Short Staff', zh: '短杖' },
    'ix.b.long_staff': { ko: '롱 스태프', en: 'Long Staff', zh: '长杖' },
    'ix.b.gnarled_staff': { ko: '날드 스태프', en: 'Gnarled Staff', zh: '多节杖' },
    'ix.b.gothic_staff': { ko: '고딕 스태프', en: 'Gothic Staff', zh: '哥特杖' },
    'ix.b.elder_staff': { ko: '엘더 스태프', en: 'Elder Staff', zh: '长老之杖' },
    'ix.b.rune_staff': { ko: '룬 스태프', en: 'Rune Staff', zh: '符文杖' },
    'ix.b.archon_staff': { ko: '아콘 스태프', en: 'Archon Staff', zh: '统治者之杖' },
    'ix.b.eagle_orb': { ko: '이글 오브', en: 'Eagle Orb', zh: '鹰眼法珠' },
    'ix.b.heavenly_stone': { ko: '헤븐리 스톤', en: 'Heavenly Stone', zh: '天界石' },
    'ix.b.demon_heart': { ko: '데몬 하트', en: 'Demon Heart', zh: '恶魔之心' },
    'ix.b.sacred_globe': { ko: '세이크리드 글로브', en: 'Sacred Globe', zh: '圣洁之球' },
    'ix.b.eldritch_orb': { ko: '엘드리치 오브', en: 'Eldritch Orb', zh: '怪异法珠' },
    'ix.b.swirling_crystal': { ko: '스월링 크리스탈', en: 'Swirling Crystal', zh: '漩涡水晶' },
    'ix.b.dimensional_shard': { ko: '디멘셔널 샤드', en: 'Dimensional Shard', zh: '次元碎片' },
    'ix.b.scepter': { ko: '셉터', en: 'Scepter', zh: '权杖' },
    'ix.b.divine_scepter': { ko: '디바인 셉터', en: 'Divine Scepter', zh: '神圣权杖' },
    'ix.b.caduceus': { ko: '카두케우스', en: 'Caduceus', zh: '双蛇杖' },
    'ix.b.rune_scepter': { ko: '룬 셉터', en: 'Rune Scepter', zh: '符文权杖' },
    'ix.b.mighty_scepter': { ko: '마이티 셉터', en: 'Mighty Scepter', zh: '强威权杖' },
    'ix.b.grand_scepter': { ko: '그랜드 셉터', en: 'Grand Scepter', zh: '宏伟权杖' },
    'ix.b.seraph_rod': { ko: '세라프 로드', en: 'Seraph Rod', zh: '炽天使杖' },
    'ix.b.psalter': { ko: '솔터', en: 'Psalter', zh: '诗篇集' },
    'ix.b.breviary': { ko: '브리비어리', en: 'Breviary', zh: '日课经' },
    'ix.b.missal': { ko: '미설', en: 'Missal', zh: '弥撒书' },
    'ix.b.lectern_bible': { ko: '렉턴 바이블', en: 'Lectern Bible', zh: '讲台圣经' },
    'ix.b.great_bible': { ko: '그레이트 바이블', en: 'Great Bible', zh: '大圣经' },
    'ix.b.wicked_bible': { ko: '위키드 바이블', en: 'Wicked Bible', zh: '邪恶圣经' },
    'ix.b.apocrypha': { ko: '아포크리파', en: 'Apocrypha', zh: '伪经' },
    'ix.b.crossbow': { ko: '크로스보우', en: 'Crossbow', zh: '弩' },
    'ix.b.light_crossbow': { ko: '라이트 크로스보우', en: 'Light Crossbow', zh: '轻弩' },
    'ix.b.chu_ko_nu': { ko: '추코누', en: 'Chu-Ko-Nu', zh: '诸葛弩' },
    'ix.b.heavy_crossbow': { ko: '헤비 크로스보우', en: 'Heavy Crossbow', zh: '重弩' },
    'ix.b.ballista': { ko: '발리스타', en: 'Ballista', zh: '弩炮' },
    'ix.b.demon_crossbow': { ko: '데몬 크로스보우', en: 'Demon Crossbow', zh: '恶魔弩' },
    'ix.b.colossus_crossbow': { ko: '콜로서스 크로스보우', en: 'Colossus Crossbow', zh: '巨神弩' },
    /* 스킬은 **직업으로 묶는다** [개정 2026-09-08 사용자 지시 — §9-1]. 그룹 하나가 한 직업이고 그 안에
       그 직업의 스킬 전부가 선다 — **1스킬 = 1직업**이라 묶는 일이 `owner_id` 하나로 끝난다(2026-09-09).
       삭제된 키 셋 — `ix.g.skillClass`·`ix.g.skillWeapon`(09-08 · `owner_kind` 를 그대로 묶던 이름) ·
       **`ix.skillFrom`**(09-09 · 무기군 액티브의 이름표였는데 무기군 고정 폐기로 이름표 자체가 사라졌다) */
    'ix.g.skillCls': { ko: '{cls} 스킬', en: '{cls} Skills', zh: '{cls}技能' },
    'ix.mastery.sin': { ko: '죄종', en: 'Sin', zh: '罪宗' },
    'ix.mastery.class': { ko: '직업', en: 'Class', zh: '职业' },
    'ix.mastery.adv': { ko: '전직', en: 'Advancement', zh: '转职' },
    'ix.mastery.previewRank': { ko: '1/{max}랭크 예시', en: 'Rank 1/{max} preview', zh: '1/{max}阶示例' },
    // 스킬 세그먼트의 안쪽 분류 [2026-09-24 · §9-1 · ADR-0335] — 직업은 탭이 아니라 일반 탭의 묶음이다(0299 의 직업 탭 대체)
    'ix.seg.basic': { ko: '일반 스킬', en: 'Basic Skills', zh: '普通技能' },
    'ix.seg.adv': { ko: '전직 스킬', en: 'Advanced Skills', zh: '转职技能' },
    // 이펙트 세그먼트 [2026-10-05 · §9-1 · ADR-0513 · 세그먼트로 2026-10-09 ADR-0559] — 스킬마다 관전 이펙트를 띄운다 · 맨 위 버튼이 전부를 띄운다
    'ix.fx.playAll': { ko: '▶ 전부 재생', en: '▶ Play All', zh: '▶ 全部播放' },
    // 이펙트 세그먼트의 그림체 탭 [2026-10-09 · §9-1 · ADR-0559] — 키 = skill_art.js:ART_STYLES · 실전 그림체에는 live 가 이름을 감싼다
    'ix.fxs.orrery': { ko: '천구도', en: 'Celestial Chart', zh: '星图' },
    'ix.fxs.vitrail': { ko: '성당 유리', en: 'Stained Glass', zh: '彩绘玻璃' },
    'ix.fxs.wraith': { ko: '망령불', en: 'Wraithfire', zh: '幽焰' },
    'ix.fx.compare': { ko: '나란히 보기', en: 'Side by Side', zh: '并排对比' },
    'ix.fx.replay': { ko: '▶ 다시 재생', en: '▶ Replay', zh: '▶ 重播' },
    'ix.fxs.live': { ko: '{name} · 실전', en: '{name} · In Battle', zh: '{name} · 实战' },
    // 일반 스킬 묶음 안의 티어 칸 머리 [2026-10-02 · §9-1 · ADR-0475 · `skill.csv:tier`]
    'ix.tier': { ko: '{n}티어', en: 'Tier {n}', zh: '第{n}层' },
    /* 전직 스킬 묶음의 이름 — `ix.adv.*`(전직) · `ix.sk.*`(스킬) 11 키는 2026-10-02 삭제. 묶음 머리는 `advance.csv`,
       타일 이름은 `skill.csv` 가 든다(§9-1 · ADR-0472) */
    'ix.count': { ko: '{n}장', en: { one: '{n} image', other: '{n} images' }, zh: '{n}张' },
    'ix.style': { ko: '얼굴 스타일', en: 'Face style', zh: '头像风格' },
    'ix.hero': { ko: '영웅 {n}', en: 'Hero {n}', zh: '英雄{n}' },

    /* ── 전투 관전 ── */
    /* `bt.round`(「라운드」 접두)는 2026-09-04 헤드에서 라운드 수치가 삭제되며 부르는 곳이 없어져 지웠다 */
    /* 배속·건너뛰기 문구는 2026-09-04 헤드 한 줄 개정에서 줄였다 (옛 `{n}배속` · `건너뛰고 리포트만` — SCREEN_DESIGN §4-2) */
    'bt.speed': { ko: '×{n}', en: '×{n}', zh: '×{n}' },
    'bt.pause': { ko: '일시정지', en: 'Pause', zh: '暂停' },
    'bt.resume': { ko: '재개', en: 'Resume', zh: '继续' },
    'bt.retreat': { ko: '철수', en: 'Retreat', zh: '撤退' },
    // 원정 아레나 오른쪽 아래 최대화 버튼의 툴팁 · 이름 (SCREEN_DESIGN §4-2 「최대화」 · ADR-1059)
    'bt.max': { ko: '최대화', en: 'Maximize', zh: '最大化' },
    'bt.unmax': { ko: '원래 크기', en: 'Restore', zh: '还原' },
    // ~~`bt.potion.empty` · `bt.potion.slot`~~ (아레나 칸의 `title` 한 줄 · R104 · ADR-0148) 는 2026-09-24 삭제 —
    //   칸도 **물약 카드**를 띄운다(ADR-0315). 빈 칸 이름은 `pt.potion.empty` 한 벌로 합쳤다   // ~~건너뛰기~~ 2026-09-14 — 진행 중 라운드를 버리고 원정을 끝낸다 (R89)
    'bt.log.h': { ko: '전투 로그', en: 'Combat Log', zh: '战斗记录' },
    // [버프] — 아레나 왼쪽 위 구석 버튼 · 그 런의 버프를 출처별 세 줄로 (SCREEN_DESIGN §4-2 「버프」 · ADR-0461 · ADR-0462)
    'bt.buff': { ko: '버프', en: 'Buffs', zh: '增益' },
    'bt.buff.shrine': { ko: '신단', en: 'Shrine', zh: '圣坛' },
    'bt.buff.tactic': { ko: '전술', en: 'Tactics', zh: '战术' },
    'bt.buff.codex': { ko: '도감', en: 'Codex', zh: '图鉴' },
    'bt.buff.none': { ko: '없음', en: 'None', zh: '无' },
    // 헬 디버프 칸의 설명창 — 이름 「죄종의 저주」({sin} = 그 장 죄종 이름 · 영어가 원본 · 한글은 직역) · 그 아래 장면 한 줄 글(효과마다 · `chapter_debuff.csv:effect`).
    //   한 줄 글은 규칙 · 조건을 안 적는 분위기 글이고 **현재형**이다(ADR-1065) · 효과 한 줄은 출정 창의 `exp.debuff.*` 를 그대로 부른다 (SCREEN_DESIGN §4-2 「헬 디버프」 · ADR-1061 · ADR-1064)
    'bt.buff.curse': { ko: '{sin}의 저주', en: 'Curse of {sin}', zh: '{sin}之诅咒' },
    'bt.curse.lore.taken_pct': { ko: '불타는 전장의 열기가 갑옷을 달군다.', en: 'The heat of the burning field sears through their armor.', zh: '燃烧战场的热浪把铠甲烤得发烫。' },
    'bt.curse.lore.poison': { ko: '뒤틀린 숲의 가시마다 독이 맺혀 있다.', en: 'Poison beads on every thorn of the twisted wood.', zh: '扭曲森林的每一根荆刺上都凝着毒。' },
    'bt.curse.lore.heal_cut': { ko: '황금빛 모래가 상처의 약을 빨아들인다.', en: 'The golden sand drinks the salve from every wound.', zh: '金色的沙吸干伤口上的药。' },
    'bt.curse.lore.freeze': { ko: '동토의 냉기가 손발을 느리게 묶는다.', en: 'The frozen cold binds their hands and feet to a crawl.', zh: '冻土的寒气缚住手脚，使其迟缓。' },
    'bt.curse.lore.feast': { ko: '심연의 짐승들은 싸울수록 배를 불린다.', en: 'The beasts of the abyss grow fatter with every blow.', zh: '深渊的野兽越战越是饱足。' },
    'bt.note': {
        ko: '관전은 가능하되 <b>의무가 아닙니다</b> — 배속은 진행 속도만 바꿉니다. 원정 중에 바꾼 장비 · 스킬 트리는 보스전에서도 <b>그 순간</b> 적용됩니다 · <b>라운드를 이긴 순간 그 보상이 들어옵니다</b>(가방 · 골드 · 경험치 · 도감).<br>'
            + '<b>철수</b>하면 원정이 멈춥니다 — 진행 중이던 라운드는 사라지고 이긴 라운드까지의 보상은 남습니다 · 런이 끝나 다음 런을 세는 동안 누르면 다음 런이 안 나갑니다. 게임을 끄면 원정도 그 자리에서 끊깁니다.',
        en: 'Watching is allowed but <b>never required</b> — speed only changes the pace. Gear and skill-tree changes during a run apply <b>at once</b>, including during boss fights · each round <b>pays out the moment you win it</b> (bag · gold · XP · codex).<br>'
            + '<b>Retreat</b> stops the expedition — it drops the round in progress and keeps what the won rounds gave · pressed while the next run is counting down, the next run does not head out. Closing the game cuts the expedition off on the spot.',
        zh: '可以观战，但<b>并非必须</b>——倍速只改变进行速度。远征中更换的装备、技能树在首领战中也会<b>立即</b>生效 · <b>赢下回合的那一刻即获得该回合奖励</b>（背包、金币、经验、图鉴）。<br><b>撤退</b>会停止远征——进行中的回合作废，已获胜回合的奖励保留 · 若在一场结束、正倒数下一场时按下，下一场便不会出发。关闭游戏时，远征也会就地中断。',
    },
    'bt.rTitle': { ko: 'R{n} {kind}', en: 'R{n} {kind}', zh: 'R{n} {kind}' },
    'bt.actTitle': { ko: '공격 속도 {s}초 — 다 차면 이 유닛 행동', en: 'Attack Speed {s}s — acts when the gauge fills', zh: '攻击速度{s}秒——蓄满后该单位行动' },
    'bt.castTitle': { ko: '캐스팅 속도 {s}초 — 다 차면 칸 하나 충전', en: 'Casting Speed {s}s — stores a charge when the gauge fills', zh: '施法速度{s}秒——蓄满后充能一个施法格' },
    'bt.tab.dmg': { ko: '누적 데미지', en: 'Damage', zh: '累计伤害' },
    'bt.basicAttack': { ko: '기본 공격', en: 'Basic attack', zh: '普通攻击' },
    'bt.lesson.front': { ko: '기본 공격은 전열부터 노립니다.', en: 'Basic attacks target the front row first.', zh: '普通攻击会优先瞄准前排。' },
    'bt.lesson.cooldownMagic': { ko: "스킬을 쓰면 아이콘이 어두워집니다. 어둠이 모두 걷히면 쿨타임이 끝나 다시 쓸 수 있습니다.", en: "Using a skill shades its icon. Once the shading clears, the cooldown is over and the skill can be used again.", zh: "施放技能后，图标会变暗。阴影完全消失时，冷却结束，技能可以再次施放。" },
    'bt.lesson.attack': { ko: "주황색 행동 게이지가 가득 차면 기본 공격을 합니다.", en: "When the orange action gauge fills, the unit makes a basic attack.", zh: "橙色行动条充满时，单位会发动普通攻击。" },
    'bt.lesson.cooldown': { ko: "스킬 아이콘의 어둠이 걷히면 쿨타임이 끝난 것입니다. 물리 유닛은 공격 차례에 준비된 스킬도 자동으로 씁니다.", en: "When the shading clears from a skill icon, its cooldown is over. On their attack turn, physical units also use a ready skill automatically.", zh: "技能图标上的阴影消失，表示冷却完毕。物理单位在攻击时也会自动使用已就绪的技能。" },
    'bt.lesson.magic': { ko: "마법 무기는 기본 공격 대신 파란 게이지에 시전 칸을 하나씩 모읍니다.", en: "Magic weapons build up blue casting charges, one at a time, in place of basic attacks.", zh: "魔法武器会逐格积攒蓝色施法充能，取代普通攻击。" },
    'bt.lesson.magicReady': { ko: "쿨타임이 끝난 스킬이 있으면 모아 둔 시전 칸 하나를 써서 자동으로 시전합니다.", en: "When a skill is off cooldown, the unit automatically spends one stored charge to cast it.", zh: "技能冷却完毕后，单位会自动消耗一格已有的充能来施放。" },
    'bt.lesson.example': { ko: "시전 게이지 예시", en: "Casting gauge example", zh: "施法条示例" },
    'bt.reflectLabel': { ko: '반사', en: 'Reflect', zh: '反射' },
    // 물리 경직 칩의 이름 — 칩에 올리면 뜬다 (R110 · SCREEN_DESIGN §4-2 · ADR-0154)
    'bt.stagger': { ko: '경직', en: 'Stagger', zh: '僵直' },
    // 창 뱃지 툴팁 — 스킬 설명이 아니라 `buff` 이벤트의 실제 stat·v 를 짧게 말한다
    'bt.effect.active': { ko: '효과 적용 중', en: 'Effect active', zh: '效果生效中' },
    'bt.effect.atk.up': { ko: '공격력 {v}% 증가', en: 'Attack +{v}%', zh: '攻击力提高{v}%' },
    'bt.effect.atk.down': { ko: '공격력 {v}% 감소', en: 'Attack −{v}%', zh: '攻击力降低{v}%' },
    // 키 이름은 **주기**의 방향이다 — 주기가 늘면(up) 느려져 공격 속도 감소 · 줄면(down) 증가 (ADR-0358)
    'bt.effect.period.up': { ko: '공격 속도 {v}% 감소', en: 'Attack Speed −{v}%', zh: '攻击速度降低{v}%' },
    'bt.effect.period.down': { ko: '공격 속도 {v}% 증가', en: 'Attack Speed +{v}%', zh: '攻击速度提高{v}%' },
    'bt.effect.barrier': { ko: '최대 HP의 {v}% 보호막', en: 'Shield equal to {v}% max HP', zh: '最大生命{v}%的护盾' },
    'bt.effect.guard.up': { ko: '방어력·모든 저항 {v}% 증가', en: 'Defense and all resistances +{v}%', zh: '防御、所有抗性提高{v}%' },
    'bt.effect.guard.down': { ko: '방어력·모든 저항 {v}% 감소', en: 'Defense and all resistances −{v}%', zh: '防御、所有抗性降低{v}%' },
    'bt.effect.def.up': { ko: '방어력 {v}% 증가', en: 'Defense +{v}%', zh: '防御提高{v}%' },
    'bt.effect.def.down': { ko: '방어력 {v}% 감소', en: 'Defense −{v}%', zh: '防御降低{v}%' },
    'bt.effect.res.up': { ko: '{e} 저항 {v}% 증가', en: '{e} resistance +{v}%', zh: '{e}抗性提高{v}%' },
    'bt.effect.res.down': { ko: '{e} 저항 {v}% 감소', en: '{e} resistance −{v}%', zh: '{e}抗性降低{v}%' },
    'bt.effect.resAll.up': { ko: '모든 원소 저항 {v}% 증가', en: 'All resistances +{v}%', zh: '所有元素抗性提高{v}%' },
    'bt.effect.resAll.down': { ko: '모든 원소 저항 {v}% 감소', en: 'All resistances −{v}%', zh: '所有元素抗性降低{v}%' },
    'bt.effect.hp.up': { ko: '최대 HP {v}% 증가', en: 'Max HP +{v}%', zh: '最大生命提高{v}%' },
    'bt.effect.hp.down': { ko: '최대 HP {v}% 감소', en: 'Max HP −{v}%', zh: '最大生命降低{v}%' },
    'bt.effect.regen.up': { ko: 'HP 재생 {v}% 증가', en: 'HP regeneration +{v}%', zh: '生命再生提高{v}%' },
    'bt.effect.regen.down': { ko: 'HP 재생 {v}% 감소', en: 'HP regeneration −{v}%', zh: '生命再生降低{v}%' },
    'bt.effect.taken.up': { ko: '받는 피해 {v}% 증가', en: 'Damage taken +{v}%', zh: '受到的伤害提高{v}%' },
    'bt.effect.taken.down': { ko: '받는 피해 {v}% 감소', en: 'Damage taken −{v}%', zh: '受到的伤害降低{v}%' },
    'bt.effect.onhit': { ko: '기본 공격 시 {e} 추가 피해 {v}%', en: '+{v}% {e} damage on basic attacks', zh: '普通攻击附加{v}%{e}额外伤害' },
    'bt.effect.splash': { ko: '기본 공격이 적 전원에게 {v}% 피해', en: 'Basic attacks deal {v}% damage to all enemies', zh: '普通攻击对全体敌人造成{v}%伤害' },
    'bt.effect.duel': { ko: '시전자만 공격', en: 'Can only attack the caster', zh: '只能攻击施放者' },
    'bt.effect.taunt': { ko: '적의 공격 대상을 자신으로 고정', en: 'Forces enemies to target this unit', zh: '将敌人的攻击目标固定为自己' },
    // 기본 스킬 50 의 창 [2026-10-16] — {v} = % · {n} = 횟수 · {e} = 원소
    'bt.effect.phys.up': { ko: '물리 데미지 {v}% 증가', en: 'Physical damage +{v}%', zh: '物理伤害提高{v}%' },
    'bt.effect.phys.down': { ko: '물리 데미지 {v}% 감소', en: 'Physical damage −{v}%', zh: '物理伤害降低{v}%' },
    // 적 데미지 감소 디버프 — 최종 피해에 곱 (final_dmg_pct · 2026-10-28 R368)
    'bt.effect.dmg.up': { ko: '데미지 {v}% 증가', en: 'Damage +{v}%', zh: '伤害提高{v}%' },
    'bt.effect.dmg.down': { ko: '데미지 {v}% 감소', en: 'Damage −{v}%', zh: '伤害降低{v}%' },
    'bt.effect.basic.up': { ko: '기본 공격 피해 {v}% 증가', en: 'Basic attack damage +{v}%', zh: '普通攻击伤害提高{v}%' },
    'bt.effect.basic.down': { ko: '기본 공격 피해 {v}% 감소', en: 'Basic attack damage −{v}%', zh: '普通攻击伤害降低{v}%' },
    'bt.effect.frenzy': { ko: '때릴 때마다 공격 속도 {v}% 씩 증가', en: 'Attack Speed +{v}% per hit', zh: '每次攻击叠加{v}%攻击速度' },
    'bt.effect.evade': { ko: '받는 공격 {n}번 회피', en: { one: 'Avoids the next {n} attack', other: 'Avoids the next {n} attacks' }, zh: '闪避接下来的{n}次攻击' },
    'bt.effect.imbue': { ko: '{e} 스킬에 상태이상 추가', en: '{e} skills inflict an ailment', zh: '{e}技能附加异常状态' },
    'bt.effect.pulse': { ko: '일정 간격으로 적 전원에게 {e} 피해', en: '{e} damage to every enemy at intervals', zh: '每隔一段时间对全体敌人造成{e}伤害' },
    'bt.effect.echo': { ko: '공격 스킬이 한 번 더', en: 'Attack skills fire twice', zh: '攻击技能再释放一次' },
    // 장 보스 고유 넷 (2026-10-29 · R380 · ADR-0944)
    'bt.effect.maiden': { ko: '준 직격 피해의 {v} 되받음', en: 'Takes back {v} of its direct damage', zh: '反受自身所造成直击伤害的{v}' },
    'bt.effect.transform': { ko: '변신 — 다른 스킬 봉인', en: 'Transformed — other skills sealed', zh: '变身——其他技能被封印' },
    'bt.effect.mire.aura': { ko: '적 전원 행동 · 스킬 쿨 {v}% 느려짐', en: 'All enemies act and recover skills {v}% slower', zh: '全体敌人行动与技能冷却减慢{v}%' },   // 늪 — 든 쪽 (2026-11-17 · R533 · ADR-1258)
    'bt.effect.mire.slow': { ko: '행동 · 스킬 쿨 {v}% 느려짐', en: 'Acts and recovers skills {v}% slower', zh: '行动与技能冷却减慢{v}%' },   // 늪 — 걸린 쪽
    'bt.effect.swarm': { ko: '파리 떼로 흩어짐', en: 'Scattered into a swarm', zh: '化为蝇群四散' },
    'bt.effect.stagger': { ko: '행동 게이지 정지', en: 'Action gauge stopped', zh: '行动槽停止' },
    // 상태이상 (2026-09-28 · R178 · ADR-0405) — 칩 이름 · 로그 이름 · 툴팁 적용값
    'bt.ail.freeze': { ko: '결빙', en: 'Freeze', zh: '冻结' },
    'bt.ail.burn': { ko: '화상', en: 'Burn', zh: '燃烧' },
    'bt.ail.poison': { ko: '중독', en: 'Poison', zh: '中毒' },
    'bt.ail.stun': { ko: '스턴', en: 'Stun', zh: '眩晕' },
    'bt.effect.burn': { ko: '받는 회복 {c}% 감소', en: 'Healing received −{c}%', zh: '受到的治疗降低{c}%' },
    'bt.effect.poison': { ko: '초당 독 피해 {n}', en: '{n} poison damage per second', zh: '每秒毒素伤害{n}' },
    'bt.effect.stun': { ko: '행동 · 쿨타임 정지', en: 'Actions and cooldowns stopped', zh: '行动、冷却停止' },
    // 전직 트리 창 (2026-11-14 · R471 · SCREEN_DESIGN §4-2 「창 뱃지 툴팁」 — 둘째 줄 = 실제 적용 효과) — 값은 `buff` 이벤트의 실효값
    'bt.effect.vsBurn': { ko: '화상 걸린 적에게 데미지 {v}% 증가', en: 'Damage to burning enemies +{v}%', zh: '对燃烧的敌人伤害提高{v}%' },
    'bt.effect.snipe': { ko: '스나이프 데미지 {v}% 증가', en: 'Snipe damage +{v}%', zh: '狙击伤害提高{v}%' },
    'bt.effect.reload': { ko: '스킬로 처치하면 그 스킬 쿨타임 초기화 · 라운드에 {n}번', en: { one: "Skill kills reset that skill's cooldown · {n} per round", other: "Skill kills reset that skill's cooldown · {n} per round" }, zh: '以技能击杀时重置该技能冷却 · 每回合{n}次' },
    'bt.effect.supportFire': { ko: '아군 기본 공격마다 {v}% 지원 화살', en: '{v}% support arrow with each ally basic attack', zh: '友方每次普通攻击时射出{v}%支援箭' },
    'bt.effect.atone': { ko: '받는 직격 피해의 {v}%만큼 상대 파티 회복', en: '{v}% of direct damage taken heals the other party', zh: '按受到直击伤害的{v}%为对方队伍恢复生命' },
    'bt.effect.ailCut': { ko: '받는 상태이상 · 디버프 시간 {v}% 감소', en: 'Ailment and debuff duration −{v}%', zh: '受到的异常状态、减益时间缩短{v}%' },
    'bt.effect.counter': { ko: '맞으면 {v}% 위력으로 반격', en: 'Strikes back at attackers ({v}%)', zh: '被击中时以{v}%威力反击' },
    'bt.effect.ember': { ko: '불씨가 쌓이면 터져 {v}% 화염 피해', en: 'Embers burst for {v}% fire damage', zh: '火种累积后爆发，造成{v}%火焰伤害' },
    'bt.effect.elemShield': { ko: '원소 직격 피해를 흡수하는 보호막', en: 'Shield that absorbs elemental hits', zh: '吸收元素直击伤害的护盾' },
    'bt.effect.conv': { ko: '물리 직격의 {v}%를 {e} 피해로', en: '{v}% of physical hits dealt as {e} damage', zh: '物理直击的{v}%转为{e}伤害' },
    'bt.effect.convAmp': { ko: '바뀐 {e} 피해 {v}% 증가', en: 'Converted {e} damage +{v}%', zh: '转换后的{e}伤害提高{v}%' },
    'bt.effect.endure': { ko: '쓰러질 피해에 최대 HP {v}%로 버팀', en: 'Survives a lethal hit at {v}% max HP', zh: '受到致命伤害时以最大生命{v}%撑住' },
    'bt.effect.berserk': { ko: '스킬 데미지 {v}% 증가 · 때릴 때 HP 소모', en: 'Skill damage +{v}% · Costs HP per hit', zh: '技能伤害提高{v}% · 攻击时消耗生命' },
    'bt.effect.devotion': { ko: '아군이 받는 직격의 {v}%를 대신 받음', en: "Takes {v}% of allies' direct damage", zh: '代替友方承受其所受直击伤害的{v}%' },
    'bt.effect.devotionDr': { ko: '대신 받는 피해 {v}% 감소', en: 'Redirected damage −{v}%', zh: '代为承受的伤害降低{v}%' },
    'bt.effect.will': { ko: '맞을 때마다 받는 피해 {v}%씩 감소', en: 'Damage taken −{v}% per hit taken', zh: '每次被击中叠加{v}%伤害减免' },
    'bt.effect.reflect': { ko: '받은 직격 피해의 {v}% 반사', en: 'Reflects {v}% of direct damage taken', zh: '反射受到直击伤害的{v}%' },
    'bt.effect.trap': { ko: '덫 — 행동하면 터짐', en: 'Trapped — triggers when it acts', zh: '陷阱——行动时触发' },
    'bt.effect.tickHit': { ko: '일정 간격으로 {e} 피해 {v}%', en: '{e} damage ({v}%) at intervals', zh: '每隔一段时间造成{e}伤害{v}%' },
    'bt.effect.field': { ko: '일정 간격으로 {e} 피해', en: '{e} damage at intervals', zh: '每隔一段时间受到{e}伤害' },   // 적진에 깐 창 — 걸린 쪽 (인페르노 · 블리자드 · 2026-11-18 R550 · ADR-1281)
    'bt.effect.strike': { ko: '일정 간격으로 {e} 벼락 {v}%', en: '{e} bolts ({v}%) at intervals', zh: '每隔一段时间降下{e}雷击{v}%' },
    'bt.effect.periodFix': { ko: '공격 주기 = 무기 주기의 {v}%', en: 'Attack interval = {v}% of weapon speed', zh: '攻击间隔=武器间隔的{v}%' },
    'bt.effect.defIgnore': { ko: '방어력 {v}% 무시', en: 'Ignores {v}% Defense', zh: '无视{v}%防御' },
    'bt.effect.shatter': { ko: '결빙된 적을 다시 얼리면 스턴', en: 'Refreezing a frozen enemy stuns it', zh: '再次冻结已冻结的敌人时使其眩晕' },
    'bt.effect.formation': { ko: '전열 · 후열이 뒤바뀜', en: 'Front and back rows swapped', zh: '前排、后排互换' },
    'bt.effect.element': { ko: '원소', en: 'elemental', zh: '元素' },
    // 현재 창의 시간 상태 — 이름 오른쪽에 값만 선다
    'bt.effect.permanent': { ko: '상시', en: 'Permanent', zh: '常驻' },
    // 정예 특성 칩의 효과 한 줄 — 죄종 칸은 마스터리 툴팁 문장(`sk.masteryEffect.*`)을 그대로 쓰고, 몬스터에게 뜻이 바뀌는 칸만 여기 (SCREEN_DESIGN §4-2 · ADR-1194 · R501)
    'bt.trait.gold': { ko: '이 적을 처치하면 파티 골드 획득 {v} 증가', en: 'Party Gold Find increases by {v} when defeating this enemy', zh: '击杀该敌人时队伍金币获取提高{v}' },
    'bt.trait.xp': { ko: '이 적을 처치하면 파티 경험치 획득 {v} 증가', en: 'Party Experience Gain increases by {v} when defeating this enemy', zh: '击杀该敌人时队伍经验获取提高{v}' },
    'bt.trait.magic': { ko: '이 적의 장비 굴림에 파티 매직아이템 획득확률 {v} 추가', en: 'Adds {v} Party Magic Find to this enemy’s gear rolls', zh: '该敌人的装备随机生成时额外获得{v}队伍魔法物品获取率' },
    // 강화 칸 — 그 정예 갈래 한 줄(물리 무기 `phys` · 마법 무기 `mag` · R528 · ADR-1246) · 값은 balance.csv `elite_enchant_*`
    'bt.trait.enchant.fire.phys': { ko: '물리 피해의 {v}만큼 화염 피해 추가', en: 'Adds Fire damage equal to {v} of physical damage', zh: '附加相当于物理伤害 {v} 的火焰伤害' },
    'bt.trait.enchant.fire.mag': { ko: '쓰러질 때 폭발해 영웅 전원에게 화염 피해', en: 'Explodes on death, dealing Fire damage to all heroes', zh: '倒下时爆炸，对所有英雄造成火焰伤害' },
    'bt.trait.enchant.cold.phys': { ko: '이 정예를 때린 영웅은 결빙되고 냉기 피해를 받는다', en: 'Heroes that strike it are frozen and take Cold damage', zh: '攻击该精英的英雄会被冻结并受到冰霜伤害' },
    'bt.trait.enchant.cold.mag': { ko: '살아 있는 동안 영웅 전원 행동 속도 {v} 감소', en: 'While alive, all heroes act {v} slower', zh: '该精英存活时，所有英雄的行动速度降低 {v}' },
    'bt.trait.enchant.lightning.phys': { ko: '공격이 맞으면 뒤의 영웅에게 공격의 {v}만큼 전기 피해', en: 'Hits arc to a hero behind for {v} of the hit as Lightning damage', zh: '攻击命中时，闪电会跳向目标身后的英雄，造成相当于本次命中伤害 {v} 的闪电伤害' },
    'bt.trait.enchant.lightning.mag': { ko: '{v}초마다 무작위 영웅에게 번개', en: 'Strikes a random hero with lightning every {v}s', zh: '每 {v} 秒以闪电击中一名随机英雄' },
    'bt.trait.enchant.poison.phys': { ko: '물리 피해의 {v}만큼 독 피해 추가', en: 'Adds Poison damage equal to {v} of physical damage', zh: '附加相当于物理伤害 {v} 的毒素伤害' },
    'bt.trait.enchant.poison.mag': { ko: '쓰러지면 영웅 전원 {v}초 중독', en: 'On death, poisons all heroes for {v}s', zh: '倒下时使所有英雄中毒，持续 {v} 秒' },
    'bt.trait.defMult': { ko: '물리 방어 {v}배', en: 'Physical Defense ×{v}', zh: '物理防御{v}倍' },
    'bt.trait.resCap': { ko: '{e} 피해 {v} 감소', en: '{e} damage taken reduced by {v}', zh: '受到的{e}伤害降低{v}' },
    // 로그 탭 — 줄의 **주체**(그 일을 한 쪽)로 거른다 (2026-09-15 · SCREEN_DESIGN §4-2)
    'bt.logf.all': { ko: '전체', en: 'All', zh: '全部' },
    'bt.logf.party': { ko: '우리', en: 'Party', zh: '我方' },
    'bt.logf.enemy': { ko: '적', en: 'Enemies', zh: '敌方' },
    // 누적 데미지 탭 — 값의 **축**을 고른다 (2026-09-21 · ADR-0252)
    'bt.dmgf.dealt': { ko: '가한 피해', en: 'Dealt', zh: '造成伤害' },
    'bt.dmgf.taken': { ko: '받은 피해', en: 'Taken', zh: '受到伤害' },
    // 두 팀 누적 데미지 판 — 결투 관전 아래 칸의 판 이름 (SCREEN_DESIGN §1 「판」 · ADR-0769) · 열 이름은 위 `bt.dmgf.*` 를 다시 쓴다
    'bt.team.party': { ko: '우리 팀', en: 'Our team', zh: '我方队伍' },
    'bt.team.enemy': { ko: '상대 팀', en: 'Opponents', zh: '对方队伍' },
    'bt.tdmView.rows': { ko: '요약', en: 'Summary', zh: '概要' },     // 두 팀 판 보기 버튼 (ADR-0772)
    'bt.tdmView.cols': { ko: '스킬별', en: 'By skill', zh: '按技能' },
    // 누적 데미지 막대의 조각 — 막대에 올리면 뜬다 (ADR-0252). 기타 = 종류 없는 피해(반사 · 자폭)
    'bt.dmgk.phys': { ko: '물리 {n}', en: 'Physical {n}', zh: '物理{n}' },
    'bt.dmgk.magic': { ko: '마법 {n}', en: 'Magic {n}', zh: '魔法{n}' },
    'bt.dmgk.etc': { ko: '기타 {n}', en: 'Other {n}', zh: '其他{n}' },
    // 로그 칸 머리 줄 (2026-09-21 · ADR-0196 · ADR-0198) — 탭 바로 아래 · 「스킬」은 그림 칸 왼쪽 끝에서 시작 · 그림 칸 폭은 그림과 이 라벨 중 넓은 쪽
    'bt.logh.name': { ko: '이름', en: 'Name', zh: '名称' },
    'bt.logh.skill': { ko: '스킬', en: 'Skill', zh: '技能' },
    'bt.logh.target': { ko: '대상', en: 'Target', zh: '目标' },
    'bt.logh.val': { ko: '데미지', en: 'Damage', zh: '伤害' },
    // 라운드 줄 — 종류(일반 · 정예 · 보스)는 괄호가 아니라 글 왼쪽의 칩이다(렌더러가 `kind.*` 로 붙인다 · 2026-09-21 · ADR-0205)
    'log.enemyCard': { ko: '적 작전 · {card}', en: 'Enemy tactic · {card}', zh: '敌方战术 · {card}' },
    'log.roundStart': { ko: '<b>라운드 {n}</b> — {list}', en: '<b>Round {n}</b> — {list}', zh: '<b>第{n}回合</b>——{list}' },
    // 로그 값 칸 (2026-09-21 · ADR-0189) — 격자 방식의 한 줄은 네 칸(주체 이름 · 스킬 그림 · 대상 이름 · 값)이다. 문장 방식의 틀은 아래 `log.say.*`.
    //   글자로 서는 값만 여기 든다 — 피해 · 회복량은 숫자 그대로다. 팝업(`pop.*`)은 영어가 대문자라 따로 든다
    'log.v.miss': { ko: '빗나감', en: 'miss', zh: '未命中' },
    'log.v.counter': { ko: '반격', en: 'counter', zh: '反击' },
    'log.v.evade': { ko: '회피', en: 'evaded', zh: '闪避' },     // 이베이드로 피한 직격 (2026-10-16)
    'log.v.echo': { ko: '한 번 더', en: 'again', zh: '再次' },   // 에코 (2026-10-16)
    'log.v.slain': { ko: '처치', en: 'slain', zh: '击杀' },
    'log.v.downed': { ko: '전투 불능', en: 'downed', zh: '倒下' },
    'log.v.up': { ko: '발동', en: 'up', zh: '发动' },
    'log.v.barrier': { ko: '방벽 {amt}', en: 'barrier {amt}', zh: '屏障{amt}' },
    'log.v.ended': { ko: '종료', en: 'ended', zh: '结束' },
    'log.v.lvup': { ko: '▲ Lv.{n}', en: '▲ Lv.{n}', zh: '▲ Lv.{n}' },   // 레벨업 — 오른 영웅의 줄 · 새 레벨 (2026-09-29 · ADR-0435)
    /* 로그 문장 틀 — `⚙` 설정의 「로그」가 `문장` 일 때 (2026-09-30 · SCREEN_DESIGN §4-2 · ADR-0459). 줄 종류마다 하나.
       **끝말을 줄인 축약형이다** — 「~습니다」 · 마침표 없이 명사로 끝낸다(좁은 열에서 한 줄에 들게 · 2026-09-30 사용자 지시 「문장줄이자 한글일경우에 특히」).
       자리: `{a}` 주체 · `{d}` 대상 · `{ico}` 스킬 그림(올리면 이름) · `{k}` 상태이상 이름 · `{v}` 값.
       `{a|이/가}` 처럼 조사 쌍(받침 있을 때/없을 때)을 달면 앞말 받침을 보고 고른다 — 그림 뒤는 **가려진 스킬 이름**의 받침(`data.js:pickJosa`).
       그림이 없는 줄(스킬 없이 걸린 상태이상 등)은 그림과 그 조사가 같이 빠진다 */
    'log.say.hit': { ko: '{a|이/가} {d}에게 {ico|으로/로} {v} 피해', en: '{a} hit {d} with {ico} for {v}', zh: '{a}用{ico}对{d}造成{v}点伤害' },
    'log.say.miss': { ko: '{a|이/가} {d}에게 {ico} 빗나감', en: '{a} missed {d} with {ico}', zh: '{a}用{ico}攻击{d}未命中' },
    'log.say.reflect': { ko: '{a|이/가} {d}에게 {v} 반사', en: '{a} reflected {v} to {d}', zh: '{a}向{d}反射{v}点伤害' },
    'log.say.counter': { ko: '{a|이/가} {d}에게 반격', en: '{a} countered {d}', zh: '{a}反击{d}' },
    'log.say.dot': { ko: '{d|이/가} {ico} {k|으로/로} {v} 피해', en: '{d} took {v} from {ico} {k}', zh: '{d}因{ico}{k}受到{v}点伤害' },
    'log.say.heal': { ko: '{a|이/가} {ico|으로/로} {d} HP {v} 회복', en: '{a} healed {d} for {v} with {ico}', zh: '{a}用{ico}为{d}恢复{v}点生命' },
    'log.say.healSelf': { ko: '{a|이/가} {ico|으로/로} HP {v} 회복', en: '{a} healed {v} with {ico}', zh: '{a}用{ico}恢复{v}点生命' },
    'log.say.potion': { ko: '{a|이/가} {ico|으로/로} HP {v} 회복', en: '{a} drank {ico} for {v} HP', zh: '{a}饮用{ico}恢复{v}点生命' },
    'log.say.buff': { ko: '{a}에게 {ico} 발동', en: '{ico} on {a}', zh: '{ico}在{a}身上发动' },
    'log.say.ail': { ko: '{a|이/가} {ico} {k}에 걸림', en: '{a} afflicted with {ico} {k}', zh: '{a}陷入{ico}{k}状态' },
    'log.say.barrier': { ko: '{a|이/가} {ico|으로/로} 방벽 {v}', en: '{a} gained {v} barrier from {ico}', zh: '{a}通过{ico}获得屏障{v}' },
    'log.say.buffEnd': { ko: '{a}의 {ico} 종료', en: '{ico} on {a} ended', zh: '{a}的{ico}结束' },
    'log.say.ailEnd': { ko: '{a}의 {ico} {k} 해제', en: '{ico} {k} on {a} ended', zh: '{a}的{ico}{k}解除' },
    'log.say.slain': { ko: '{a} 처치', en: '{a} slain', zh: '{a}被击杀' },
    'log.say.downed': { ko: '{a} 전투 불능', en: '{a} downed', zh: '{a}倒下' },
    'log.say.rise': { ko: '{a|이/가} {ico|으로/로} {d|을/를} 일으킴', en: '{a} raised {d} with {ico}', zh: '{a}用{ico}扶起了{d}' },   // 리저렉션 (2026-11-14 R471)
    'log.say.call': { ko: '{a|이/가} {ico|으로/로} {d} 소환', en: '{a} summoned {d} with {ico}', zh: '{a}用{ico}召唤{d}' },
    // 장 보스 고유 넷 (2026-10-29 · R380) — 아이언 메이든이 되돌린 피해 · 스웜이 다시 뭉쳤다 (늪은 로그가 없다 — ADR-1258)
    'log.say.maiden': { ko: '{d|이/가} {ico|으로/로} {v} 피해를 되받음', en: '{d} took {v} back from {ico}', zh: '{d}因{ico}反受{v}点伤害' },
    'log.say.regroup': { ko: '{a|이/가} {ico}에서 다시 뭉침 — HP {v}', en: '{a} regrouped from {ico} — HP {v}', zh: '{a}从{ico}中重新聚合——生命{v}' },
    'log.say.lvup': { ko: '{a} 레벨 {v} 달성', en: '{a} reached Lv.{v}', zh: '{a}达到Lv.{v}' },
    // 작전 카드가 일했다 (2026-11-26 · R586 · SCREEN_DESIGN §4-2 · ADR-1385) — {ico} = 카드의 죄종 그림 · {k} = 카드 이름
    'log.say.tacAim': { ko: '{a|이/가} {ico|으로/로} {d|을/를} 노림', en: '{a} targets {d} with {ico}', zh: '{a}借助{ico}瞄准了{d}' },
    'log.say.tacMark': { ko: '{a|이/가} {ico|으로/로} {d}에 표식', en: '{a} marked {d} with {ico}', zh: '{a}借助{ico}标记了{d}' },
    'log.say.tacRound': { ko: '{ico} {k} 발동', en: '{ico} {k} triggered', zh: '{ico} {k} 已触发' },
    'log.say.tacShare': { ko: '{a|이/가} {ico|으로/로} {d} 대신 {v} 피해', en: '{a} took {v} for {d} with {ico}', zh: '{a}借助{ico}替{d}承受了 {v} 点伤害' },
    'log.say.tacSwap': { ko: '{a|이/가} {ico|으로/로} {d|과/와} 자리를 바꿈', en: '{a} swapped places with {d} with {ico}', zh: '{a}借助{ico}与{d}交换了位置' },
    'log.say.tacConv': { ko: '{a|이/가} {ico|으로/로} {d}에게 {v} 피해', en: '{a} dealt {v} damage to {d} with {ico}', zh: '{a}借助{ico}对{d}造成了 {v} 点伤害' },
    'log.v.tacAim': { ko: '노림', en: 'aim', zh: '瞄准' },
    'log.v.tacMark': { ko: '표식', en: 'mark', zh: '标记' },
    'log.v.tacSwap': { ko: '자리 바꿈', en: 'swap', zh: '换位' },
    'pop.dodge': { ko: '빗나감', en: 'MISS', zh: '未命中' },
    'pop.counter': { ko: '반격', en: 'COUNTER', zh: '反击' },
    'pop.evade': { ko: '회피', en: 'EVADE', zh: '闪避' },   // 이베이드 (2026-10-16)
    'pop.echo': { ko: '에코', en: 'ECHO', zh: '回响' },     // 에코 (2026-10-16)   // 반격한 카드에 뜬다 (ADR-0158)
    'pop.downed': { ko: '전투 불능', en: 'Downed', zh: '倒下' },
    'pop.rise': { ko: '부활', en: 'Raised', zh: '复活' },   // 리저렉션 (2026-11-14 R471)
    // 레벨업 (2026-09-29 · ADR-0435) — 오른 카드의 금색 글자 · 아래 적중 변화 줄(`pop.lvupHit`)은 2026-10-22 삭제 (ADR-0718)
    'pop.lvup': { ko: '레벨 업', en: 'LEVEL UP', zh: '升级' },
};
