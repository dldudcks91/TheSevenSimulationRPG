/**
 * game_logic 검증 페이지 — 브라우저가 유일한 JS 런타임이라(빌드 없음, node 없음) 여기서 단정을 돌린다.
 *   실행: start.bat 후 http://localhost:8777/dev/test.html
 *   헤드리스: 스크린샷의 머리글이 "PASS n/n" 이면 통과. document.title 에도 같은 결과가 찍힌다.
 *
 * 단정 규약: 통과 = true 또는 정보 문자열(표에 그대로 찍힌다) / 실패 = false 또는 fail('사유') — 실패 사유는 문자열이 아니라
 *   **던진다** (2026-08-26: 이전엔 사유 문자열이 통과로 집계돼 실패가 묻혔다).
 *
 * 두 부분:
 *   ① 단정 — 결정론 / 직렬화 왕복 / 생성 규칙 / 무기군·슬롯 8 착용 규칙 / 성장 / 원정 정산 / 도감 카드 / 런 마무리 / 선술집
 *   ② 캘리브레이션 — 시작 파티 N개를 굴려 스테이지별 승률·소요·전투불능 수를 표로 찍는다 (balance.csv 손잡이 조정용)
 */

import * as M from '../ui/mock.js';
import { loadData, buildSystems, D, FILES, fillStory, pickJosa, STORY_TOKEN } from '../ui/data.js';
import { bindTipNode, heroTipCard, monsterTipCard, skillTipCard, sheetPages } from '../ui/tip.js';
import { setLang, t as i18nT } from '../ui/i18n.js';
import { ELEMENTS } from '../game_logic/hero.js';
import { makeRng, deriveSeed } from '../game_logic/rng.js';
import { parseCsv } from '../game_logic/csv.js';
import { createFormula } from '../game_logic/formula.js';
import { createSkillSystem } from '../game_logic/skill.js';
import { ATTACK_TARGETS, refreshDerived, weaponOnHit } from '../game_logic/skill_effects.js';
import { createSkillRuntime, createHooks, cooldownSec } from '../game_logic/skill_runtime.js';
import { createTacticSystem } from '../game_logic/tactic.js';
import { createCommission } from '../game_logic/commission.js';
import { SAVE_VERSION } from '../game_logic/state.js';
import {
    buildFingerprint, buildMeta, buildParties, compareGolden, compareBalance, compareCsvHash, compareParties, inputNote,
    wantsWrite, GOLDEN_SEEDS, GOLDEN_STAGES, GOLDEN_KNOBS,
} from './golden.js';

const out = document.getElementById('out');
const results = [];
class Fail extends Error {}
const fail = msg => { throw new Fail(msg); };
/** 공유 판 `G`(아래 「새 게임 · 직렬화」)의 처음 모습 — 판이 서면 채운다. 그 전의 단정은 판을 모른다 */
let G0 = null;
function check(name, fn) {
    try {
        const r = fn();
        results.push({ name, ok: r !== false, msg: typeof r === 'string' ? r : '' });
    } catch (e) {
        results.push({ name, ok: false, msg: e instanceof Fail ? e.message : String(e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e) });
    }
    // **공유 판은 읽기 전용이다** [2026-09-22 · 구조 감사] — 바꾼 단정은 그 자리에서 빨간불이고 판을 새로 깐다(뒤 단정이 흔적을 안 밟게).
    //   돌려 쓰던 때는 반지 단정이 끼워 둔 반지를 낀 채 뒤의 전투 단정 39개가 싸웠고 분해 단정은 그 반지를 분해했다 —
    //   단정 하나를 지우면 무관한 단정의 조건이 바뀌었다. 판을 바꾸는 단정은 `freshG()` 로 제 판을 만든다
    if (G0 !== null && JSON.stringify(G) !== G0) {
        const last = results[results.length - 1];
        last.ok = false;
        last.msg = `공유 판 G 를 바꿨다 — 판을 바꾸는 단정은 freshG() 로 제 판을 만든다 · ${last.msg}`;
        G = freshG();
        G0 = JSON.stringify(G);
    }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NOW = 1_700_000_000_000;      // 고정 시각 — 테스트는 시계를 읽지 않는다
/** 손으로 만든 장비 — 접사만 지정하고 나머지는 최소 골격 (드롭 굴림과 무관하게 계산을 시험한다) */
const mkItem = (slot, affixes, extra = {}) =>
    ({ uid: null, slot, rarity: 'magic', ilvl: 1, name: { ko: slot, en: slot }, implicit: null, affixes, sins: ['wrath'], ...extra });

await loadData('../data/');
const SYS = buildSystems(D);
const B = D.balance;
const WG = D.weaponGroups;
const AGROUP = D.armorGroups;                    // armor_group.csv — {slot: {groupId: def}} · 갑옷군 3갈래 (2026-09-16 · R107) + 투구 · 장갑 · 신발 갈래 (2026-09-18)
/** 무기 피해 가운데 — 구간 직선의 누적합 (R105). 단정이 공식을 손으로 다시 세운다: 코드와 같은 식을 쓰면 서로를 못 잡는다 */
const bandMid = ilvl => {
    let m = B.weapon_atk_base;
    for (let n = 2; n <= ilvl; n++) m += B[`weapon_atk_band${Math.min(8, Math.floor((n - 1) / B.weapon_atk_band_levels) + 1)}_unit`];
    return m;
};

/* ── 데이터 ── */
check('csv: 숫자 셀은 숫자로', () => parseCsv('a,b\n1,x\n2.5,\n')[0].a === 1 && parseCsv('a,b\n1,x\n')[0].b === 'x');
check('csv: 따옴표로 감싼 셀은 쉼표를 품는다 · "" 는 따옴표 하나 · 가운데 따옴표는 글자 (2026-09-15)', () => {
    const r = parseCsv('a,b,c\n"x, y",2,"say ""hi"""\n5 "in",,z\n');
    return r[0].a === 'x, y' && r[0].b === 2 && r[0].c === 'say "hi"' && r[1].a === '5 "in"' && r[1].b === '' && r[1].c === 'z';
});
check('이야기: 조사 쌍은 받침을 본다 · ㄹ 받침은 「로」 · 한국어는 「」 · 빈 파티는 대체 문구 (2026-09-15)', () =>
    pickJosa('아바돈', '이', '가') === '이' && pickJosa('사탄', '과', '와') === '과' && pickJosa('발리', '은', '는') === '는'
    && pickJosa('아르길', '으로', '로') === '로' && pickJosa('몰록', '으로', '로') === '으로' && pickJosa('Lilith', '이', '가') === '가'
    && fillStory('{leader|이/가} 섰다', 'ko', { leader: { ko: '발렌', en: 'Valen' } }) === '「발렌」이 섰다'
    && fillStory('{leader} stood', 'en', { leader: { ko: '발렌', en: 'Valen' } }) === 'Valen stood'
    && fillStory('{leader|이/가} 섰다', 'ko', { leader: null, fallback: '용병 하나' }) === '용병 하나가 섰다');
check('stage.csv: 이야기의 이름 자리표시자는 있는 몬스터를 가리키고 괄호가 닫힌다 (2026-09-15)', () => {
    const bad = [];
    for (const st of D.stageList) for (const col of ['story_kr', 'story_en']) {
        const rest = String(st[col] ?? '').replace(STORY_TOKEN, (tok, idx) => {
            if (idx && !D.monsters[idx]) bad.push(`${st.stage_id} ${tok}`);
            return '';
        });
        if (/[{}]/.test(rest)) bad.push(`${st.stage_id} ${col}: 모르는 자리표시자`);
    }
    if (bad.length) fail(bad.join(' · '));
    return `${D.stageList.length}스테이지 · 이상 없음`;
});
/* 몬스터 이야기 [2026-09-21 · monster_design §8 · SCREEN_DESIGN §9 · ADR-0206] — 도감 툴팁이 읽는다.
   ko/en 은 **짝으로** 선다(한쪽만 있으면 영어가 한국어로 떨어져 보인다) · 이름은 `{m:}` 자리표시자뿐 — 파티 문맥이 없어 `{leader}` 는 못 쓴다 ·
   셀 안 실제 줄바꿈 금지(`\n` 두 글자만 — 한 행 = 한 줄 · src/data/README.md) · 챕터 1 은 전부 채워져 있다 ·
   **툴팁 이야기 칸(최대 여섯 줄)을 안 넘는다**(ADR-0244) — 단정은 DOM 을 못 재니 **글자 수가 줄 수의 대용**이다:
   자리표시자를 푼 길이로 재고, 상한은 실측(폭 280 · 14px · 원고를 이어 붙여 끊는 자리를 바꿔 가며 잰 최악 — 한글 162자 · 영어 244자까지 여섯 줄)보다 조금 짧다 */
const STORY_MAX = { story_kr: 155, story_en: 235 };
check('monster.csv: 이야기는 ko/en 짝 · 이름 자리표시자만(있는 몬스터 · {leader} 없음) · 셀 안 줄바꿈 없음 · 이야기 칸 상한 · 챕터 1 전부 (2026-09-21)', () => {
    const bad = [];
    let n = 0;
    for (const m of Object.values(D.monsters)) {
        const ko = String(m.story_kr ?? ''), en = String(m.story_en ?? '');
        if (!ko !== !en) bad.push(`${m.monster_idx} ko/en 한쪽만`);
        if (m.chapter === 1 && !ko) bad.push(`${m.monster_idx} 챕터 1 인데 이야기가 없다`);
        for (const [col, s] of [['story_kr', ko], ['story_en', en]]) {
            if (/[\r\n]/.test(s)) bad.push(`${m.monster_idx} ${col} 실제 줄바꿈`);
            const rest = s.replace(STORY_TOKEN, (tok, idx, isLeader) => {
                if (isLeader) bad.push(`${m.monster_idx} ${col} {leader}`);
                else if (!D.monsters[idx]) bad.push(`${m.monster_idx} ${col} ${tok}`);
                return '';
            });
            if (/[{}]/.test(rest)) bad.push(`${m.monster_idx} ${col}: 모르는 자리표시자`);
            const shown = fillStory(s, col === 'story_kr' ? 'ko' : 'en');
            if (shown.length > STORY_MAX[col]) bad.push(`${m.monster_idx} ${col} ${shown.length}자 — 이야기 칸(여섯 줄)을 넘는다(상한 ${STORY_MAX[col]})`);
        }
        if (ko) n++;
    }
    if (bad.length) fail(bad.join(' · '));
    return `이야기 ${n}종 · 이상 없음`;
});
check('csv: monster 119 / stage 35 / weapon_group 12 / codex_level 4 / chapter 7 / codex_series 4 / hero_attribute 7 / combat_stat 24', () =>
    Object.keys(D.monsters).length === 119 && D.stageList.length === 35 && D.weaponGroupList.length === 12
    && D.codexLevels.length === 4 && D.chapterList.length === 7 && Object.keys(D.codexSeries).length === 4
    && D.heroAttributes.length === 7 && D.combatStats.length === 24);
/**
 * 직업 스킬 풀 — **1스킬 = 1직업** (skill_design §12 확정 2026-09-08·09-09).
 * 기획은 37개(전사 7 · 기사 8 · 궁수 6 · 마법사 8 · 사제 8)를 확정했지만 **엔진 어휘로 도는 것만 발행**했다 —
 * 오오라 · 소환 · 「라운드 종료까지」 · 도트 · 평타 부여 · 적에게 거는 창 · 「양 옆의 아군」은 §7 미결이다 (R59).
 * 여기서 보는 것은 **겹침 없음**과 **직업 밖 출처 없음** 둘이다 — 그 둘이 「1스킬 = 1직업」의 전부다.
 */
check('csv: skill — 직업 풀 37행(전사 7 · 기사 8 · 궁수 6 · 마법사 8 · 사제 8) · 1스킬 = 1직업 · 그 밖은 몬스터 전용 · 전직뿐 (skill_design §12 · §12-9 · PLAN_skill_structure D1)', () => {
    const rows = D.skillRows.filter(r => r.owner_kind === 'job');
    const want = { warrior: 7, knight: 8, archer: 6, mage: 8, priest: 8 };
    if (rows.length !== 37) fail(`직업 풀 ${rows.length}행`);
    // 어휘에서 무기군이 빠졌다 — 무기는 스킬의 **그릇**이지 출처가 아니다 (§12-1 규칙 2).
    //   직업 밖은 **몬스터 전용**(2026-09-18 · §12-9)과 **전직**(`advance` — 어느 뽑기에도 안 섞인다 · PLAN_skill_structure D1 · 4단계가 행을 넣는다)뿐이고 영웅 고유 풀에 안 든다
    const other = D.skillRows.filter(r => r.owner_kind !== 'job');
    const bad = other.find(r => !['monster', 'advance'].includes(r.owner_kind) || r.innate_pool !== 0);
    if (bad) fail(`${bad.skill_id} owner_kind ${bad.owner_kind} · innate_pool ${bad.innate_pool} — 직업 밖은 몬스터 전용 · 전직(innate_pool 0)뿐`);
    for (const [cls, n] of Object.entries(want)) {
        const got = rows.filter(r => r.owner_id === cls).length;
        if (got !== n) fail(`${cls} ${got}행 ≠ ${n}`);
    }
    // 겹침 없음 — 같은 스킬이 두 직업에 있으면 「마법사가 배쉬를 든다」가 되살아난다
    const byId = {};
    for (const r of rows) { if (byId[r.skill_id]) fail(`${r.skill_id} 중복`); byId[r.skill_id] = r.owner_id; }
    // 전 행이 고유 풀이다 — 두 출처(고유 · 무기)가 **같은 직업 풀**에서 가져간다 (§12-1 규칙 3)
    if (rows.some(r => r.innate_pool !== 1)) fail('직업 풀 행인데 innate_pool 이 0 이다');
    return `${Object.entries(want).map(([c, n]) => `${c} ${n}`).join(' · ')} · 몬스터 전용 ${other.filter(r => r.owner_kind === 'monster').length} · 전직 ${other.filter(r => r.owner_kind === 'advance').length}`;
});
// 태그 어휘의 SSOT (2026-09-01 mock→CSV 이관). **행 수·파생 여부가 계약이다** — skill.js 가 derived=1 셋을
//   `derivedTagsOf` 가 내는 셋과 대조해 던지므로, 여기가 깨지면 스킬 시스템 자체가 로드되지 않는다
check('csv: skill_tag 14행 — 파생 3(aoe·single·multihit) · 대분류 4 (skill_design §11)', () => {
    const rows = D.skillTagRows;
    if (rows.length !== 14) fail(`${rows.length}행`);
    const derived = rows.filter(r => r.derived === 1).map(r => r.tag_id);
    if (!eq(derived, ['aoe', 'single', 'multihit'])) fail(`파생 [${derived}]`);
    const cats = [...new Set(rows.map(r => r.category))].sort();
    if (!eq(cats, ['buff', 'damage', 'debuff', 'other'])) fail(`대분류 [${cats}]`);
    for (const r of rows) if (!r.name_kr || !r.name_en) fail(`${r.tag_id} 이름 ko/en`);
    if (new Set(rows.map(r => r.tag_id)).size !== rows.length) fail('tag_id 중복');
    return `정의 ${rows.length - derived.length} + 파생 ${derived.length} · 대분류 ${cats.join('/')}`;
});
// 08-31 mock→CSV 이관분 6종. **행 수가 곧 결정론 계약이다** — 풀이 늘거나 줄면 pick(rng, arr) 이 다른 것을 고른다
// affix 19 → 18 [2026-09-11 · R78] — `atk_flat` 퇴역: 무기가 affix.csv 를 안 쓴다(무기 옵션 표 둘)
// ~~affix 13~~ [2026-09-21 · R127] — 목걸이 · 반지가 세 층 표로 옮겨 **affix.csv 를 지웠다**. 자리에 장신구 표 셋의 행 수가 선다
check('csv: 이관 5종 + 장신구 표 셋 — class 7 / equip_slot 8 / item_base 40 / hero_name 24 / hero_trait 12 / 장신구 죄종 칸 23 · 공통 11 · 발동 3', () => {
    const got = [D.classes.length, D.equipSlots.length, Object.values(D.itemBases).flat().length,
        D.heroNamePool.length, D.heroTraitPool.length,
        D.accessorySinOptions.length, D.accessoryCommonOptions.length, D.amuletProcs.length];
    const want = [7, 8, 40, 24, 12, 23, 11, 3];   // 30 → 36 [2026-09-17] 투구 4 → 10 · 36 → 42 [2026-09-18] 장갑 · 신발 각 4 → 7 (갈래 2 × 티어 3 + 시작) · 42 → 40 [2026-09-21] 목걸이 · 반지 각 4 → 3 (그림 없는 넷째를 뺐다 — 풀이 곧 설치된 그림이다)
    //   장신구 죄종 칸 23 = 반지 13(시기 다섯 · 탐욕 셋 · 나머지 하나씩) + 목걸이 10(시기 둘 · 탐욕 셋) · 공통 11 = 원소 4 · 절대값 1 · 상태이상 4 · 버프 1 · 경험치 1 · 발동 3 = 목걸이 베이스 셋 (2026-09-21 · R127)
    return got.every((n, i) => n === want[i]) || fail(`${got.join('/')} ≠ ${want.join('/')}`);
});
/**
 * 무기 베이스 — 행이 전부 실재 무기군이고, **그림 목록(`mock.js:WEAPON_BASE_STEMS`)과 무기군마다 id · 순서가 같다** (2026-09-11).
 * 같은 사실이 두 벌이라 한쪽만 고치면 예외 없이 **그 베이스만 제 그림 대신 uid 해시 그림**을 들고 이름과 갈린다.
 * 행 순서는 결정론에 걸린다 — `item.js:build` 가 `bases[floor(r × len)]` 로 고른다.
 */
check('csv: weapon_base — 무기군 실재 · base_id 유일 · 그림 목록과 무기군마다 id·순서가 같다', () => {
    const groups = Object.keys(D.weaponBases);
    const ghost = groups.filter(g => !WG[g]);
    if (ghost.length) fail(`없는 무기군: ${ghost.join(',')}`);
    const ids = Object.values(D.weaponBases).flat().map(b => b.id);
    if (new Set(ids).size !== ids.length) fail(`base_id 중복: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(',')}`);
    const all = [...new Set([...groups, ...Object.keys(M.WEAPON_BASE_STEMS)])];
    const off = all.filter(g => !eq((D.weaponBases[g] ?? []).map(b => b.id), M.WEAPON_BASE_STEMS[g] ?? []));
    if (off.length) fail(`CSV 와 그림 목록이 다른 무기군: ${off.join(',')}`);
    return groups.map(g => `${g} ${D.weaponBases[g].length}`).join(' · ');
});
/**
 * 부위는 **7개**여야 한다 — `rollDrop` 이 `pick(rng, slots)` 로 부위를 고르므로 목록 길이가 곧 드롭 분포다.
 * `D.slots` 는 `equip_slot.csv` 에서 `part_order !== '-'` 인 행만 걸러 만든다(위치 8 → 부위 7).
 * 2026-09-01 한손 개념 폐지로 보조(offhand)가 사라져 9/8 이 8/7 이 됐다.
 * 누가 ring2 의 `part_order` 를 비우거나 채우면 `ring` 이 두 번 들어가 **반지 드롭 확률만 조용히 2배**가 된다 —
 * 예외가 안 나고 게임만 달라지므로 여기서 잡는다 (골든 지문은 "drops 가 달라졌다"까지만 말한다).
 */
check('csv: equip_slot — 부위 7 유일 · 위치 8 · 보조 없음 · 위치의 part 가 전부 실재 부위 (반지 2칸이 부위를 늘리지 않는다)', () => {
    const ids = D.slots.map(s => s.id);
    if (ids.length !== 7) fail(`부위 ${ids.length}개 (7이어야 한다)`);
    if (new Set(ids).size !== 7) fail(`부위 중복: ${ids.join(',')}`);
    if (ids.includes('offhand')) fail('보조(offhand)는 2026-09-01 한손 개념 폐지와 함께 삭제됐다');
    if (D.equipSlots.length !== 8) fail(`위치 ${D.equipSlots.length}개`);
    const orphan = D.equipSlots.filter(e => !ids.includes(e.part));
    if (orphan.length) fail(`부위 없는 위치: ${orphan.map(e => e.id).join(',')}`);
    const rings = D.equipSlots.filter(e => e.part === 'ring').length;
    return `부위 ${ids.join(' ')} · 위치 8 · 반지 ${rings}칸`;
});
/** 옵션 표 · 아이템 베이스가 가리키는 부위가 전부 실재해야 한다 — `itemBases[slot]` 이 비면 `pick` 이 undefined 를 준다 */
check('csv: 방어구 · 장신구 옵션 표의 slot · item_base.slot 이 전부 실재 부위 · 무기 외 6부위에 베이스가 있다', () => {
    const ids = new Set(D.slots.map(s => s.id));
    // ~~affix.slots~~ [2026-09-21 · R127 — affix.csv 퇴역] → 부위를 드는 옵션 표 셋
    for (const d of [...D.armorSinOptions, ...D.armorCommonOptions, ...D.accessorySinOptions])
        if (!ids.has(d.slot)) fail(`옵션 ${d.stat} 의 slot '${d.slot}' 가 없다`);
    for (const s of ids) {
        if (s === 'weapon') continue;                        // 무기의 베이스는 무기군 자체다
        if (!D.itemBases[s]?.length) fail(`부위 '${s}' 에 아이템 베이스가 없다`);
    }
    if (D.itemBases.weapon) fail('무기는 item_base.csv 에 있으면 안 된다 — 베이스는 weapon_group.csv');
    return `부위 ${ids.size} · 베이스 보유 ${Object.keys(D.itemBases).length}`;
});
/**
 * **베이스 풀 = 설치된 그림** [2026-09-21 사용자 확정] — `item_base.csv` 의 전 행이 `mock.js:ITEM_BASE_ART_IDS` 에 있어야 한다.
 * 그림 없는 베이스는 착용 · 가방 · 제련소 · 도감에서 **부위 이모지**로 떨어지고(`itemArt` 는 해시 폴백을 안 쓴다),
 *   예외가 안 나므로 「가끔 이모지가 뜬다」로만 보인다 — 반지 · 목걸이의 넷째가 09-18 부터 09-21 까지 그 상태였다.
 * 무기 쪽 짝은 위 `weapon_base` 단정이다. **거기와 달리 순서는 안 본다** — 방어구 · 장신구 그림은 id 로 찾고(`ITEM_BASE_ART_IDS.includes`)
 *   인덱스로 찾지 않아 목록 순서가 결정론에 안 걸린다. 반대 방향(그림만 있고 CSV 행이 없는 id)도 잡는다 — 죽은 파일이 목록에 남는다.
 */
check('csv: item_base 의 전 행에 그림이 있다 — 베이스 풀 = mock.js:ITEM_BASE_ART_IDS (그림 없는 베이스는 이모지로 떨어진다 · 2026-09-21)', () => {
    const rows = new Set(Object.values(D.itemBases).flat().map(b => b.id));
    const art = new Set(M.ITEM_BASE_ART_IDS);
    const noArt = [...rows].filter(id => !art.has(id));
    if (noArt.length) fail(`그림 없는 베이스: ${noArt.join(',')} — 아이콘을 설치하거나 item_base.csv 에서 그 행을 뺀다`);
    const noRow = [...art].filter(id => !rows.has(id));
    if (noRow.length) fail(`CSV 행 없는 그림: ${noRow.join(',')} — mock.js:ITEM_BASE_ART_IDS 에서 뺀다`);
    return `베이스 ${rows.size} = 그림 ${art.size}`;
});

/* ── CSV 무결성 (2026-08-28 형태 최적화) — 코드가 안 읽는 구조 키를 「CSV 끼리 정합한가」로 살린다 ── */

check('csv: balance — status ∈ fixed|proposed · knob ∈ 0|1 · description 이 비어 있지 않다', () => {
    let fixed = 0, knob = 0;
    for (const r of D.balanceRows) {
        if (!['fixed', 'proposed'].includes(r.status)) fail(`${r.key} status=${r.status}`);
        if (![0, 1].includes(r.knob)) fail(`${r.key} knob=${r.knob}`);
        if (!r.description_kr || String(r.description_kr).trim() === '') fail(`${r.key} description 없음`);
        if (r.status === 'fixed') fixed++;
        if (r.knob === 1) knob++;
    }
    return `${D.balanceRows.length}키 · fixed ${fixed} · knob ${knob}`;
});
check('csv: stages_per_chapter 가 챕터별 stage 행 수와 같고 stage_num 이 1..N (구조 키를 데이터가 지킨다)', () => {
    const per = D.balance.stages_per_chapter;
    for (const c of D.chapterList) {
        const rows = D.stageList.filter(s => s.chapter === c.id).sort((a, b) => a.stage_num - b.stage_num);
        if (rows.length !== per) fail(`ch${c.id} ${rows.length} ≠ ${per}`);
        rows.forEach((r, i) => { if (r.stage_num !== i + 1) fail(`ch${c.id} stage_num ${r.stage_num}`); });
    }
    return `${D.chapterList.length}챕터 × ${per}`;
});
check('csv: attr_equip_bonus = 0 이고 접사 어느 것도 기본 능력치를 주지 않는다 (hero_design §4-2)', () => {
    if (D.balance.attr_equip_bonus !== 0) fail(`attr_equip_bonus=${D.balance.attr_equip_bonus}`);
    const attrIds = D.heroAttributes.map(a => a.id);
    // ~~D.affixDefs~~ [2026-09-21 · R127 — affix.csv 퇴역] → 장비 옵션 표 전부
    const opts = [...D.weaponSinOptions, ...D.weaponCommonOptions, ...D.armorSinOptions, ...D.armorCommonOptions,
        ...D.accessorySinOptions, ...D.accessoryCommonOptions];
    for (const d of opts) if (attrIds.includes(d.stat)) fail(`옵션이 기본 능력치를 준다: ${d.stat}`);
    return `옵션 ${opts.length}행 확인`;
});
/** 보스 단독 스테이지 — 세트가 보스 라운드뿐이고 호위 예산도 0 이다. 일반몹 풀을 한 번도 안 뽑는다 (base_expedition_design §1-2 · R75) */
const isBossOnly = st => SYS.battle.stageRounds(st).every(r => r.round_type === 'boss') && D.budgets[st.boss_grade].escort_max === 0;
check('csv: stage ↔ monster 정합 — 보스 행 존재·등급·타입 일치 · 일반몹 타입 일치 · dlvl 단조 · 고아 몬스터 없음', () => {
    const seen = new Set();
    let prev = 0;
    for (const st of D.stageList) {
        const boss = D.monsters[st.boss_monster_idx];
        if (!boss) fail(`${st.stage_id} boss_monster_idx ${st.boss_monster_idx} 없음`);
        if (boss.spawn_grade !== st.boss_grade) fail(`${st.stage_id} boss grade ${boss.spawn_grade} ≠ ${st.boss_grade}`);
        if (boss.monster_type !== st.monster_type) fail(`${st.stage_id} boss type ${boss.monster_type} ≠ ${st.monster_type}`);
        const pool = SYS.battle.stagePool(st);
        // 보스 단독 스테이지는 일반몹이 **0** 이어야 하고 나머지는 셋이다 (2026-09-11 · R75)
        const solo = isBossOnly(st);
        if (pool.length !== (solo ? 0 : 3)) fail(`${st.stage_id} 일반몹 ${pool.length}${solo ? ' — 보스 단독 스테이지인데 일반몹이 있다' : ''}`);
        for (const id of pool) if (D.monsters[id].monster_type !== st.monster_type) fail(`${id} type ${D.monsters[id].monster_type}`);
        // dlvl 은 스테이지마다 오른다 — 보스 단독 스테이지만 **직전과 같아도 된다**
        //   (챕터보스 소재값이 직전 스테이지 일반몹 평균이라 같은 레벨 대역에 선다 · ⚠제안 — 곡선 재작성은 밸런스 작업)
        if (!(solo ? st.dlvl >= prev : st.dlvl > prev)) fail(`dlvl 단조 아님 ${st.stage_id} ${prev}→${st.dlvl}`);
        prev = st.dlvl;
        [...pool, st.boss_monster_idx].forEach(id => seen.add(id));
    }
    const orphan = Object.keys(D.monsters).map(Number).filter(id => !seen.has(id));
    if (orphan.length) fail(`어느 스테이지에도 안 속한 몬스터: ${orphan.join(',')}`);
    return `${D.stageList.length}스테이지 · 몬스터 ${seen.size} 전원 소속`;
});
/*
 * **챕터 하나 = 10레벨** [2026-09-14 사용자 확정 · story_chapter_design §2 · hero_design §5 · R88] — 챕터 폭은 **만렙 ÷ 챕터 수**로 읽는다(만렙 = 7장 끝).
 *   레벨이 걸린 자리가 챕터 끝에 떨어진다 — 마스터리 T2 = 1장 끝 · 전직 = 3장 끝. 챕터 안의 스테이지 간격은 ⚠임시라(사용자 09-14 「기본 레벨은 나중에」) 재지 않는다
 */
check('csv: 스테이지 레벨 = 챕터당 같은 폭 — N장은 (N−1)w 초과 Nw 이하 · 챕터보스 = Nw · 만렙 = 7장 끝 · T2 = 1장 끝 · 전직 = 3장 끝 (story_chapter_design §2 · R88)', () => {
    const chapters = Math.max(...D.stageList.map(s => Number(s.chapter)));
    const w = B.hero_level_cap / chapters;
    if (!Number.isInteger(w)) fail(`만렙 ${B.hero_level_cap} 이 챕터 ${chapters} 로 안 나뉜다`);
    for (const st of D.stageList) {
        const lo = (st.chapter - 1) * w, hi = st.chapter * w;
        if (!(st.dlvl > lo && st.dlvl <= hi)) fail(`${st.stage_id} dlvl ${st.dlvl} — ${st.chapter}장 대역 ${lo + 1}~${hi} 밖`);
        if (st.boss_grade === 'chapter_boss' && st.dlvl !== hi) fail(`${st.stage_id} 챕터보스 dlvl ${st.dlvl} ≠ ${st.chapter}장 끝 ${hi}`);
    }
    if (B.mastery_t2_unlock_level !== w) fail(`마스터리 T2 해금 ${B.mastery_t2_unlock_level} ≠ 1장 끝 ${w}`);
    if (B.advance_unlock_level !== 3 * w) fail(`전직 해금 ${B.advance_unlock_level} ≠ 3장 끝 ${3 * w}`);
    return `챕터 ${chapters} × ${w}레벨 · 챕터보스 ${D.stageList.filter(s => s.boss_grade === 'chapter_boss').map(s => s.dlvl).join('·')}`;
});
/*
 * **몬스터 행은 등급을 안 탄다** — 보스의 세기는 `spawn_grade.hp_mult` 와 **장비**(희귀도·아이템 레벨)가 낸다
 *   (monster_design §5 · §5-1 · R79). ~~보스 `hp`·`attack` 소재값이 일반몹 평균~~ 은 컬럼이 없어져 잴 수 없으므로
 *   같은 규칙을 **전투 능력치 5축의 합**으로 잰다(같은 0.8~1.25 허용). `ldr`·`cha` 는 빼는데, 둘은
 *   전투 계수가 0 이고 ⚠임시 규칙이 등급으로 배분한 축이라 여기 섞으면 규칙 자체를 재게 된다.
 */
check('csv: 보스 능력치 = 그 스테이지 일반몹 평균 대역 — 등급 세기는 배율·장비가 낸다 (monster_design §5 · R79)', () => {
    const AX = ['str', 'agi', 'int', 'vit', 'luck'];
    let worst = 1;
    for (const st of D.stageList) {
        // 보스 단독 스테이지는 제 일반몹이 없다 — 기준은 **직전 스테이지** 일반몹 평균이다 (R75)
        const src = isBossOnly(st) ? D.stages[D.stageOrder[D.stageOrder.indexOf(st.stage_id) - 1]] : st;
        const pool = SYS.battle.stagePool(src).map(id => D.monsters[id]);
        const boss = D.monsters[st.boss_monster_idx];
        const sum = m => AX.reduce((a, k) => a + m[k], 0);
        const r = sum(boss) / (pool.reduce((a, m) => a + sum(m), 0) / pool.length);
        if (!(r >= 0.8 && r <= 1.25)) fail(`${st.stage_id} 능력치 합 비율 ${r.toFixed(2)} (보스 ${sum(boss)})`);
        worst = Math.max(worst, r, 1 / r);
    }
    return `최대 이탈 ×${worst.toFixed(3)}`;
});
check('csv: monster 모양 — 직업·무기군·고유 스킬·입는 부위가 실재하고 능력치 7종이 대역 안 (monster_design §7 · R79)', () => {
    const AX = ['str', 'agi', 'int', 'vit', 'luck', 'ldr', 'cha'];
    const parts = new Set(D.slots.map(s => s.id));
    const cls = new Set(D.classes.filter(c => c.stage === 'main').map(c => c.id));
    const seen = { cls: new Set(), grp: new Set(), part: new Set(), sk: new Set() };
    for (const m of Object.values(D.monsters)) {
        if (!cls.has(m.cls)) fail(`${m.monster_idx} cls ${m.cls} — 본편 직업 5종이 아니다`);
        const g = WG[m.weapon_group];
        if (!g) fail(`${m.monster_idx} weapon_group ${m.weapon_group}`);
        if (!g.classes.includes(m.cls)) fail(`${m.monster_idx} 무기군 ${m.weapon_group} 이 직업 ${m.cls} 의 것이 아니다`);
        if (m.innate_skill !== '-' && !SYS.skill.defs[m.innate_skill]) fail(`${m.monster_idx} innate_skill ${m.innate_skill}`);
        // 제 직업 풀이거나 **몬스터 전용**이다 (2026-09-18 · skill_design §12-9 — 영웅 풀 공유 규칙의 예외)
        if (m.innate_skill !== '-' && SYS.skill.defs[m.innate_skill].ownerKind !== 'monster' && SYS.skill.defs[m.innate_skill].ownerId !== m.cls)
            fail(`${m.monster_idx} 고유 스킬이 제 직업 풀도 몬스터 전용도 아니다`);
        const ws = String(m.wear_slots).split('|');
        if (!ws.includes('weapon')) fail(`${m.monster_idx} wear_slots 에 weapon 이 없다`);
        if (new Set(ws).size !== ws.length) fail(`${m.monster_idx} wear_slots 에 같은 부위가 두 번`);
        for (const s of ws) { if (!parts.has(s)) fail(`${m.monster_idx} 부위 ${s}`); seen.part.add(s); }
        for (const a of AX) {
            if (!Number.isInteger(m[a])) fail(`${m.monster_idx} ${a} 가 정수가 아니다 (${m[a]})`);
            if (m[a] < B.hero_attr_min || m[a] > B.hero_attr_max) fail(`${m.monster_idx} ${a}=${m[a]} 대역 밖`);
        }
        seen.cls.add(m.cls); seen.grp.add(m.weapon_group); seen.sk.add(m.innate_skill);
    }
    // 직업 5종 전부 · 본편 무기군 10종 전부 · 부위 7종 전부가 공급원을 갖는다 — 안 나오는 무기·부위가 있으면 파밍 경로가 없다
    if (seen.cls.size !== cls.size) fail(`직업 ${seen.cls.size}/${cls.size} 만 쓰인다`);
    if (seen.part.size !== parts.size) fail(`부위 ${seen.part.size}/${parts.size} 만 공급원이 있다`);
    return `직업 ${seen.cls.size} · 무기군 ${seen.grp.size} · 부위 ${seen.part.size} · 고유 스킬 ${seen.sk.size}종`;
});
check('csv: spawn_grade 6축이 normal < elite < stage_boss < chapter_boss 로 단조 · skill_slots 는 1/2/3/3 (부채 #17 · R79)', () => {
    const order = ['normal', 'elite', 'stage_boss', 'chapter_boss'];
    // ~~atk_mult · def_mult · res_add~~ 는 2026-09-11 R79 로 퇴역했다 — 그 셋은 이제 **장비**가 낸다 (monster_design §5)
    const axes = ['hp_mult', 'gear_ilvl_add', 'gear_rare_bonus_pct', 'exp_mult', 'gold_mult', 'drop_chance_mult'];
    for (const a of axes) {
        const v = order.map(g => D.grades[g][a]);
        for (let i = 1; i < v.length; i++) if (!(v[i] > v[i - 1])) fail(`${a} 역행 ${v.join(' < ')}`);
    }
    for (const g of order) if (D.grades[g].atk_mult !== undefined || D.grades[g].def_mult !== undefined || D.grades[g].res_add !== undefined)
        fail(`${g} 에 퇴역 칸이 남아 있다 — 등급의 세기는 장비가 낸다 (R79)`);
    // 스킬 칸은 **비감소**다 — 일반 1(고유) · 정예 2(+무기) · 보스 3(+셋째). 상한은 영웅과 같은 active_slots
    const sl = order.map(g => D.grades[g].skill_slots);
    if (!eq(sl, [1, 2, 3, 3])) fail(`skill_slots ${sl.join('/')} ≠ 1/2/3/3`);
    if (Math.max(...sl) > B.active_slots) fail(`skill_slots 가 active_slots(${B.active_slots}) 를 넘는다`);
    return axes.map(a => `${a} ${order.map(g => D.grades[g][a]).join('/')}`).join(' · ') + ` · skill_slots ${sl.join('/')}`;
});
check('csv: combat_stat impl=1 집합 == computeCombat 출력 키 집합 (부채 #12 — 사본이 아니라 대조)', () => {
    const h = SYS.hero.rollHero(makeRng(7), { sin: 'wrath', cls: 'warrior', name: { ko: 'x', en: 'x' }, trait: { ko: 't', en: 't' } });
    const c = SYS.hero.computeCombat(h, []);
    // 전투 능력치가 아닌 출력 — 파생 합·도감 보정·적중 레벨·공격 타입 (INTERFACE §2-4)
    const EXCLUDE = ['atk_pct_sum', 'dmg_bonus_pct', 'level', 'attack_type', 'option_fx', 'res_max_el', 'res_reduction_el', 'main_attr_mult'];   // option_fx = 장비 옵션 묶음(R78 · 방어구 2026-09-18) · res_max_el = 원소별 최대 저항(저항 행의 상한에만 먹는다) · res_reduction_el = 원소별 저항 무시(반지 시기 칸 · 2026-09-21) — 시트에 안 서는 축
    const got = new Set(Object.keys(c).filter(k => !EXCLUDE.includes(k)));
    got.add('atk_physical'); got.add('atk_magic');          // 둘은 배타 (INTERFACE §8 항목 5)
    const impl = new Set(D.combatStats.filter(s => s.impl === 1).map(s => s.id));
    const missing = [...impl].filter(k => !got.has(k));
    const extra = [...got].filter(k => !impl.has(k));
    if (missing.length) fail(`impl=1 인데 안 나온다: ${missing.join(',')}`);
    if (extra.length) fail(`나오는데 impl=0/없음: ${extra.join(',')}`);
    return `impl=1 ${impl.size} · impl=0 ${D.combatStats.length - impl.size}`;
});
check('csv: hero_attribute 7행 · 순서 str agi int vit luck ldr cha · combat_stat 값이 실재한다', () => {
    const want = ['str', 'agi', 'int', 'vit', 'luck', 'ldr', 'cha'];
    const ids = D.heroAttributes.map(a => a.id);
    if (!eq(ids, want)) fail(ids.join('/'));
    const statIds = D.combatStats.map(s => s.id);
    for (const a of D.heroAttributes) {
        if (a.combatStat === '-') continue;
        for (const k of String(a.combatStat).split('|'))
            if (!statIds.includes(k)) fail(`${a.id} combat_stat '${k}' 가 combat_stat.csv 에 없다`);
        if (!a.en || !a.abbr) fail(`${a.id} en/abbr 없음`);
    }
    return ids.join('/');
});
check('csv: monster_name_en 전부 있음 · attack_type ∈ physical+원소4 · weapon_group damage_kind ∈ physical|magic', () => {
    const types = ['physical', ...ELEMENTS];
    for (const m of Object.values(D.monsters)) {
        if (!m.monster_name_en || String(m.monster_name_en).trim() === '') fail(`${m.monster_idx} monster_name_en 없음`);
        if (!types.includes(m.attack_type)) fail(`${m.monster_idx} attack_type ${m.attack_type}`);
        if (![0, 1].includes(m.face)) fail(`${m.monster_idx} face ${m.face}`);
    }
    for (const g of D.weaponGroupList) {
        if (!['physical', 'magic'].includes(g.damageKind)) fail(`${g.id} damage_kind ${g.damageKind}`);
        if (!['main', 'expansion'].includes(g.release)) fail(`${g.id} release ${g.release}`);
    }
    const faces = Object.values(D.monsters).filter(m => m.face === 1).length;
    return `112종 · 얼굴 ${faces}`;
});
check('csv: 액티브 단일 대상 공격의 DPS 기여가 skill_dps_budget_pct 대역 안 (skill_design §9-1)', () => {
    const budget = D.balance.skill_dps_budget_pct;              // 비율 (R111)
    const rows = SYS.skill.list.filter(d => d.effects[0].effect === 'hit' && ['enemy_single', 'enemy_rotate'].includes(d.target));
    const seenList = [];
    for (const d of rows) {
        const e = d.effects[0];                                   // 1단계 — 스킬마다 하는 일 한 줄 (2026-09-22)
        const share = (e.mult * e.hits - 1) / Math.ceil(d.cool / 1.5);
        const r = share / budget;
        if (!(r >= 0.5 && r <= 1.6)) fail(`${d.id} 기여 ${share.toFixed(3)} = 예산의 ×${r.toFixed(2)}`);
        seenList.push(`${d.id} ×${r.toFixed(2)}`);
    }
    return `${rows.length}행 · ${seenList.join(' · ')}`;
});
/**
 * 퍼센트 눈금 [2026-09-17 · R111 · src/data/README.md 단위 규약] — **퍼센트 · 배율은 비율로 저장한다**(5% = 0.05 · 310% = 3.1).
 * 옛 눈금(0~100)이 한 표라도 남으면 코드가 나누지 않으므로 조용히 100 배가 된다 — 표마다 상한으로 잡는다.
 * 상한은 「옛 눈금이면 반드시 넘는 값」이다(배율은 옛 55~310 · 비율 0.55~3.1 이라 10 으로 가른다)
 */
check('csv: 퍼센트는 비율 눈금이다 — balance `_pct` 키 · 옵션 표 · 몬스터 저항 · 스킬 배율/확률 · 갑옷군 · 도감 · 등급 (R111)', () => {
    const bad = [];
    const over = (where, v, max) => { if (typeof v === 'number' && Math.abs(v) > max) bad.push(`${where}=${v}`); };
    const BAL_PCT = Object.keys(B).filter(k => (k.endsWith('_pct') || ['attr_bonus_per_point', 'res_cap_base', 'res_cap_absolute', 'weapon_fixed_atk_pct_min', 'weapon_fixed_atk_pct_max'].includes(k)));
    for (const k of BAL_PCT) over(`balance.${k}`, B[k], 2);                 // 최대가 기본 치명 배수 1.5
    for (const d of [...D.weaponCommonOptions, ...D.weaponSinOptions, ...D.armorSinOptions, ...D.armorCommonOptions, ...D.accessorySinOptions, ...D.accessoryCommonOptions])
        if (d.scale === 'flat' || d.scale === 'fine') { over(`${d.stat}.min`, d.min, 1); over(`${d.stat}.max`, d.max, 1); }
    // 목걸이 발동 — 확률은 비율(1 이하) · 간격은 쿨타임 배수(옛 눈금이면 100 이상) (2026-09-21 · R127)
    for (const r of D.amuletProcs) { over(`amulet_proc ${r.baseId}.min`, r.min, r.trigger === 'interval' ? 10 : 1); over(`amulet_proc ${r.baseId}.max`, r.max, r.trigger === 'interval' ? 10 : 1); }
    for (const m of Object.values(D.monsters)) for (const el of ELEMENTS) over(`monster ${m.monster_idx}.res_${el}`, m[`res_${el}`], 1);
    // 스킬 표 셋 (2026-09-22) — 배율 · 감쇠 · 확률 · 배수는 하는 일 줄 · 효과값은 걸린 효과 · 조건값은 스킬
    for (const d of SYS.skill.list) {
        for (const e of d.effects) {
            over(`${d.id}.mult`, e.mult, 10); over(`${d.id}.decay`, e.decay, 1);
            over(`${d.id}.procChance`, e.procChance, 1); over(`${d.id}.procMult`, e.procMult, 10);
        }
        over(`${d.id}.condValue`, d.condValue, 1);
    }
    for (const st of Object.values(SYS.skill.statuses)) over(`${st.id}.value`, st.value, 1);
    for (const g of D.armorGroupList) { over(`${g.slot}.${g.id}.aspdPct`, g.aspdPct, 1); over(`${g.slot}.${g.id}.cdrPct`, g.cdrPct, 1); over(`${g.slot}.${g.id}.defMult`, g.defMult, 10); }   // 부위 → 갈래 (2026-09-18)
    for (const g of Object.values(WG)) over(`${g.id}.variance`, g.variance, 1);
    for (const v of D.codexBonus) over('codex_level.bonus_pct', v, 1);
    for (const [id, g] of Object.entries(D.grades)) over(`${id}.gear_rare_bonus_pct`, g.gear_rare_bonus_pct, 10);
    for (const a of D.heroAttributes) { over(`${a.id}.mult_base_pct`, Number(a.multBasePct), 2); over(`${a.id}.mult_per_point_pct`, Number(a.multPerPointPct), 1); }
    for (const f of SYS.tactic.families) for (const v of Object.values(f.grades)) if (SYS.item.pctStat(f.stat) && !['def_flat', 'hp_regen'].includes(f.stat)) over(`${f.id}.${f.stat}`, v, 1);
    if (bad.length) fail(`옛 눈금으로 보이는 값 ${bad.length}개: ${bad.slice(0, 8).join(' · ')}`);
    return `balance ${BAL_PCT.length}키 · 옵션 · 몬스터 저항 · 스킬 ${SYS.skill.list.length} · 갑옷군 · 무기군 · 도감 · 등급 · 영웅 계수 · 전술 — 전부 비율`;
});
check('csv: chapter 7행 · stage.chapter 가 전부 실재 · codex_series 4행이 codexBonus 누적 키와 같다', () => {
    const ids = D.chapterList.map(c => c.id);
    if (!eq(ids, [1, 2, 3, 4, 5, 6, 7])) fail(ids.join('/'));
    for (const c of D.chapterList) if (!M.SINS[c.sin]) fail(`ch${c.id} sin '${c.sin}' 가 죄종이 아니다`);
    for (const st of D.stageList) if (!D.chapters[st.chapter]) fail(`${st.stage_id} chapter ${st.chapter} 없음`);
    const nums = Object.keys(D.codexSeries).map(Number).sort();
    if (!eq(nums, [1, 2, 3, 4])) fail(`codex_series stage_num ${nums.join('/')}`);
    // 계열이 없는 스테이지 번호는 **보스 단독 스테이지뿐**이다 — 챕터보스 한 종짜리 계열에 스탯을 줄지는 미정 (GAME_DESIGN §10 · R75)
    for (const st of D.stageList) if (D.codexSeries[st.stage_num] === undefined && !isBossOnly(st)) fail(`${st.stage_id} 도감 계열 없음`);
    const G0 = SYS.game.newGame(1, SYS.hero.rollCandidates(makeRng(1), B.party_size_max), NOW);
    const keys = Object.keys(SYS.game.codexBonus(G0)).sort();
    const want = [...new Set(Object.values(D.codexSeries))].sort();
    if (!eq(keys, want)) fail(`codexBonus 키 ${keys.join('/')} ≠ codex_series ${want.join('/')}`);
    return `7챕터 · 계열 ${want.join('/')}`;
});
// 디렉터리 목록은 비동기라 check() 밖에서 미리 읽는다 (check 는 동기 — Promise 를 돌려주면 무조건 통과가 된다)
const dataDirHtml = await fetch('../data/').then(r => (r.ok ? r.text() : null)).catch(() => null);
check('csv: 로더가 읽는 목록 = src/data/*.csv 전부 — 읽히지 않는 SSOT 를 두지 않는다', () => {
    const html = dataDirHtml;
    if (html === null) return `디렉터리 목록을 못 읽었다 — 로더 ${FILES.length}개만 확인`;
    const onDisk = [...html.matchAll(/href="([^"/]+)\.csv"/g)].map(m => m[1]).sort();
    if (onDisk.length === 0) return `디렉터리 목록에 csv 가 없다 — 로더 ${FILES.length}개만 확인`;
    const loaded = FILES.slice().sort();
    const unread = onDisk.filter(f => !loaded.includes(f));
    const ghost = loaded.filter(f => !onDisk.includes(f));
    if (unread.length) fail(`코드가 안 읽는 CSV: ${unread.join(', ')}`);
    if (ghost.length) fail(`로더 목록에만 있는 CSV: ${ghost.join(', ')}`);
    return `${loaded.length}개 일치`;
});
check('balance: 시스템이 쓰는 키가 전부 있다', () => {
    const need = ['party_size_max', 'party_preset_count', 'roster_cap', 'wave_monster_max', 'hero_attr_min', 'hero_attr_max',
        'hero_hp_base', 'monster_hp_base', 'hero_hp_band_levels', 'attr_bonus_per_point', 'hero_xp_base', 'hero_xp_exp', 'power_growth_per_level', 'attr_growth_chance_pct', 'xp_rate', 'monster_xp_base', 'monster_xp_growth',
        'unarmed_atk', 'unarmed_period', 'weapon_atk_base', 'weapon_atk_band_levels', 'weapon_atk_band1_unit', 'weapon_atk_band8_unit',
        'armor_def_l1', 'armor_def_band_levels', 'armor_def_band1_unit', 'armor_def_band8_unit',
        'armor_fixed_def_pct_min', 'armor_fixed_def_pct_max', 'armor_common_opt_normal', 'armor_common_opt_magic', 'armor_common_opt_rare',
        'armor_def_slot_armor', 'armor_def_slot_helmet', 'armor_def_slot_gloves', 'armor_def_slot_boots',
        'base_crit_pct', 'base_crit_damage_pct', 'dmg_variance_pct', 'monster_hp_scale', 'monster_atk_scale', 'monster_def_scale', 'battle_timeout_sec',
        'def_curve_k', 'dmg_min', 'crit_cap_pct', 'res_cap_base', 'res_cap_absolute', 'attr_dmg_pivot', 'attr_dmg_step_pct',
        'hit_base_pct', 'hit_per_level_deficit_pct', 'hit_min_pct',
        'gold_rate', 'drop_chance_pct', 'boss_guaranteed_drop', 'rarity_w_normal', 'rarity_w_magic', 'rarity_w_rare', 'make_rarity_w_normal', 'make_rarity_w_magic', 'make_rarity_w_rare',
        'accessory_common_opt_normal', 'accessory_common_opt_magic', 'accessory_common_opt_rare', 'weapon_common_opt_normal', 'weapon_common_opt_magic', 'weapon_common_opt_rare', 'weapon_fixed_atk_pct_min', 'weapon_fixed_atk_pct_max', 'weapon_def_down_sec', 'weapon_res_down_sec', 'weapon_atk_down_sec', 'salvage_dust_magic', 'salvage_dust_rare',
        'equip_upgrade_max', 'equip_upgrade_base_pct',
        'equip_upgrade_gold_base', 'equip_upgrade_gold_growth',
        'inventory_cap', 'tavern_candidates', 'tavern_hire_cost', 'tavern_reroll_cost', 'tavern_refresh_hours', 'start_gold', 'start_dust', 'start_stigma',
        'tavern_search_slots', 'tavern_search_hours',
        'tavern_search_rare_base_pct', 'tavern_search_rare_per_cha_pct', 'tavern_search_rare_cap_pct', 'tavern_search_sin_echo_pct',
        'tavern_search_meet_at_pct', 'tavern_search_meet_hit_pct', 'tavern_search_meet_key_pct',
        'trade_visit_hours', 'trade_stay_hours', 'shop_equip_per_slot', 'shop_equip_weapon', 'shop_price_normal', 'shop_price_magic', 'shop_price_rare',
        'hero_level_cap', 'concurrent_expedition_parties', 'active_slots', 'skill_cd_floor_mult', 'skill_decay_cap_pct',
        'mastery_point_per_level', 'mastery_t1_max_rank', 'mastery_t2_unlock_level',
        'tactic_grade_weight_common', 'tactic_grade_weight_magic', 'tactic_grade_weight_rare',
        'tactic_reroll_base_cost', 'tactic_reroll_lock_mult',
        'potion_slot_max', 'potion_use_hp_pct', 'potion_cooldown_sec', 'stagger_hp_pct', 'stagger_sec', 'repeat_restart_sec',
        'gamble_batch_spins', 'gamble_stake_steps', 'gamble_stake_gold', 'gamble_stake_chapter_mult',
        'gamble_reels', 'gamble_rows', 'gamble_hold_trigger', 'gamble_hold_respins', 'gamble_hold_coin_pct',
        'commission_slots', 'commission_board_cards', 'commission_gold_chapter_mult'];
    const missing = need.filter(k => B[k] === undefined);
    if (missing.length) fail(`missing: ${missing.join(', ')}`);
    if (B.offline_cap_hours !== undefined) fail('offline_cap_hours 는 퇴역 키 — 반복 원정은 게임이 켜져 있는 동안만 (08-25)');
    if (B.two_hand_atk_mult !== undefined) fail('two_hand_atk_mult 는 퇴역 키 — 한손 개념 폐지로 weapon_atk_base 에 흡수됐다 (2026-09-01)');
    if (B.rounds_per_stage !== undefined) fail('rounds_per_stage 는 퇴역 키 — 라운드 수는 stage_round.csv 세트의 행 수다 (2026-09-11 · R75)');
    if (B.armor_def_variance_pct !== undefined) fail('armor_def_variance_pct 는 퇴역 키 — 방어구 고유 방어력은 굴리지 않는다 · 개체차는 고정 옵션 「방어력 +%」가 든다 (2026-09-18)');
    if (B.drop_ilvl_spread !== undefined) fail('drop_ilvl_spread 는 퇴역 키 — 드롭 ilvl = dlvl + spawn_grade.gear_ilvl_add 이고 굴리지 않는다 (2026-09-11 · R79)');
    if (B.suffix_sin_chance_pct !== undefined) fail('suffix_sin_chance_pct 는 퇴역 키 — 죄종 수는 희귀도가 정한다(매직 1 · 레어 2) (2026-09-11 · R77)');
    // 퇴역 키 — 08-26 수치 대역 재설계로 사라졌다. 남아 있으면 코드가 옛 규칙을 되살릴 수 있다
    const retired = ['hero_hp_per_level', 'weapon_atk_per_ilvl', 'hit_floor_pct'].filter(k => B[k] !== undefined);
    if (retired.length) fail(`퇴역 키가 남아 있다: ${retired.join(', ')} (성장은 power_growth_per_level · 적중은 hit_min_pct)`);
    return true;
});
check('monster.csv: 저항은 원소별 4컬럼 — 공통 소재값(resist)은 퇴역했다 (monster_design §7-1)', () => {
    const m = D.monsters[1101];
    for (const e of ['fire', 'cold', 'lightning', 'poison']) if (typeof m[`res_${e}`] !== 'number') fail(`res_${e}`);
    if (m.resist !== undefined) fail('resist 컬럼이 아직 있다');
    return `1101 → ${['fire', 'cold', 'lightning', 'poison'].map(e => m[`res_${e}`]).join('/')}`;
});
check('spawn_grade.csv: 세기 칸은 hp_mult 하나 — 나머지는 장비가 낸다 · 보상 칸은 남는다 (R79)', () => {
    for (const g of Object.values(D.grades)) {
        for (const k of ['hp_mult', 'exp_mult', 'gold_mult', 'drop_chance_mult', 'gear_ilvl_add', 'gear_rare_bonus_pct', 'skill_slots',
            'gear_rarity_w_normal', 'gear_rarity_w_magic', 'gear_rarity_w_rare'])
            if (typeof g[k] !== 'number') fail(`${g.grade}.${k} 가 숫자가 아니다`);
        for (const k of ['atk_mult', 'def_mult', 'res_add', 'drop_roll'])
            if (k in g) fail(`${g.grade}.${k} 는 퇴역 칸이다 (R79)`);
    }
    // 일반 등급은 아무것도 얹지 않는다 — 장비의 기준선이다
    const n = D.grades.normal;
    if (!(n.hp_mult === 1 && n.gear_ilvl_add === 0 && n.gear_rare_bonus_pct === 0)) fail('normal 이 기준선이 아니다');
    return `hp_mult ${Object.values(D.grades).map(g => g.hp_mult).join('/')} · gear_ilvl_add ${Object.values(D.grades).map(g => g.gear_ilvl_add).join('/')}`;
});
check('spawn_grade.csv: 장비 희귀도 — 일반 = 일반 + 가끔 매직(레어 0) · 정예 = 일반 + 매직 + 가끔 레어 (2026-09-23 사용자 지시)', () => {
    const w = g => [D.grades[g].gear_rarity_w_normal, D.grades[g].gear_rarity_w_magic, D.grades[g].gear_rarity_w_rare];
    const [nn, nm, nr] = w('normal'), [en, em, er] = w('elite');
    if (!(nn > nm && nm > 0 && nr === 0)) fail(`일반 ${nn}/${nm}/${nr} — 일반 > 매직 > 0 · 레어 0 이어야 한다`);
    if (!(en > 0 && em > 0 && er > 0 && er < em)) fail(`정예 ${en}/${em}/${er} — 셋 다 있고 레어가 가장 드물어야 한다`);
    // 굴림 — 일반 몬스터는 매직찬스를 받아도 레어를 안 입는다(레어 가중 0 × 무엇 = 0)
    const g = D.grades.normal, rng = makeRng(91);
    const rw = { normal: nn, magic: nm, rare: nr };
    const seen = { normal: 0, magic: 0, rare: 0 };
    for (let i = 0; i < 600; i++) seen[SYS.item.rollGear(rng, { slots: ['armor'], ilvl: 5, magicFind: 2, rareBonusPct: g.gear_rare_bonus_pct, rarityWeights: rw })[0].rarity]++;
    if (seen.rare) fail(`일반 몬스터가 레어를 입었다 ${seen.rare}/600`);
    if (!seen.magic || seen.magic > seen.normal) fail(`일반 ${seen.normal} · 매직 ${seen.magic} — 「가끔 매직」이 아니다`);
    return `일반 ${nn}/${nm}/${nr} · 정예 ${en}/${em}/${er} · 일반 굴림 600 → 일반 ${seen.normal} · 매직 ${seen.magic}`;
});
check('stage_round: 첫 스테이지 세트 — 정예 3·6 / 보스 9', () => eq(D.eliteRounds, [3, 6]) && D.bossRound === 9);
check('stage_round: 세트마다 round_num 1..N 연속 · 보스 라운드는 마지막 하나 · 스테이지는 있는 세트를 가리킨다 (base_expedition_design §1-2 · R75)', () => {
    for (const [set, rows] of Object.entries(D.roundSets)) {
        rows.forEach((r, i) => { if (r.round_num !== i + 1) fail(`${set} round_num ${r.round_num} (자리 ${i + 1})`); });
        if (rows.filter(r => r.round_type === 'boss').length !== 1 || rows[rows.length - 1].round_type !== 'boss') fail(`${set} — 보스 라운드는 마지막 하나여야 한다`);
    }
    for (const st of D.stageList) if (!D.roundSets[st.round_set]) fail(`${st.stage_id} round_set ${st.round_set}`);
    return Object.entries(D.roundSets).map(([k, v]) => `${k} ${v.length}`).join(' · ');
});
check('stage: 챕터의 마지막 스테이지만 챕터보스 — 보스 단독 1라운드 · 일반몹 없음 · 나머지는 스테이지보스 (base_expedition_design §1-2 · R75)', () => {
    for (const c of D.chapterList) {
        const rows = D.stageList.filter(s => s.chapter === c.id).sort((a, b) => a.stage_num - b.stage_num);
        rows.forEach((st, i) => {
            const last = i === rows.length - 1;
            if ((st.boss_grade === 'chapter_boss') !== last) fail(`${st.stage_id} boss_grade ${st.boss_grade}`);
            if (last !== isBossOnly(st)) fail(`${st.stage_id} — ${last ? '마지막 스테이지가 보스 단독이 아니다' : '보스 단독은 마지막 스테이지뿐이어야 한다'}`);
            if (last && SYS.battle.stageRounds(st).length !== 1) fail(`${st.stage_id} ${SYS.battle.stageRounds(st).length}라운드`);
        });
    }
    return `${D.chapterList.length}챕터 × 마지막 스테이지 = 챕터보스 단독 1라운드`;
});
/**
 * 무기군 재편 (2026-09-01) — 한손 개념 폐지 · 한손검 삭제 · 창이 전사 → 기사 · 완드 → 오브.
 * **본편 5직업이 전부 2개씩**이라는 것이 계약이다. 전사는 변동이 크고(22·28) 기사는 작다(10·15) —
 * 직업 성격이 무기에서부터 갈린다. 같은 직업의 두 무기는 행동 주기(1.3 ↔ 1.6)로 갈린다.
 *
 * **사제 전용 무기 (2026-09-07 확정 · R46)** — 스태프·오브가 마법사 전용이 되고 사제는 성경·십자가를 든다.
 * 09-01 이 감수하기로 했던 「사제·마법사 숙련 중복」이 여기서 소멸한다 (hero_design §2).
 * 그리고 **직업마다 「높은 공속 하나 · 높은 데미지 하나」**가 축 이름으로 확정됐다 — 두 무기의 주기가
 * 같으면 그 직업은 축이 없다는 뜻이라 아래에서 매 직업 검사한다.
 */
check('weapon_group: 본편 5직업 × 무기 2개 · 사제 전용 성경/십자가(09-07) · 캐스터 무기 = magic · 전 무기 양손', () => {
    const groups = cls => D.weaponGroupList.filter(g => g.classes.includes(cls)).map(g => g.id).sort();
    if (!eq(groups('warrior'), ['axe', 'mace'])) fail(`warrior ${groups('warrior')}`);
    if (!eq(groups('knight'), ['spear', 'sword2h'])) fail(`knight ${groups('knight')}`);
    // 09-07 — 캐스터 풀이 갈렸다. 사제가 스태프·오브를 들면 R46 이 되돌아온 것이다
    if (!eq(groups('mage'), ['orb', 'staff'])) fail(`mage ${groups('mage')}`);
    if (!eq(groups('priest'), ['bible', 'crucifix'])) fail(`priest ${groups('priest')}`);
    if (WG.staff.classes.includes('priest') || WG.orb.classes.includes('priest')) fail('스태프·오브가 아직 사제와 공유다 (09-07 분리)');
    if (WG.bible.damageKind !== 'magic' || WG.crucifix.damageKind !== 'magic') fail('사제 무기는 마법 채널이다 — 파워 출처가 지능이어야 한다');
    if (!eq(groups('archer'), ['bow', 'crossbow'])) fail(`archer ${groups('archer')}`);
    if (WG.sword1h || WG.wand) fail('sword1h 삭제 · wand → orb 개명 (2026-09-01)');
    if (WG.staff.damageKind !== 'magic' || WG.orb.damageKind !== 'magic' || WG.axe.damageKind !== 'physical') fail('damageKind');
    if (WG.crucifix.variance >= WG.spear.variance) fail('사제 무기의 변동이 기사보다 크다 — 「기사·사제가 작다」(hero_design §2)');
    if (D.weaponGroupList.some(g => 'twoHanded' in g)) fail('twoHanded 는 퇴역 필드 — 전 무기가 양손이라 표현할 게 없다');
    for (const cls of ['warrior', 'knight', 'mage', 'priest', 'archer']) {
        const gs = groups(cls);
        if (gs.length !== 2) fail(`${cls} 무기 ${gs.length}개 (2여야 한다)`);
        if (WG[gs[0]].period === WG[gs[1]].period) fail(`${cls} 두 무기의 행동 주기가 같다 — 갈릴 근거가 없다`);
    }
    return `전사 ${groups('warrior')} · 기사 ${groups('knight')} · 사제 ${groups('priest')}`;
});
check('combat_stat.csv: 24행 · 폐지 축 없음 · 저항은 pct · 유틸은 운 계수 (08-26 재설계 · 09-17 사이즈 특효 삭제)', () => {
    const ids = D.combatStats.map(s => s.id);
    const gone = ['status_chance', 'magic_defense', 'cc_reduction', 'heal_power', 'party_bonus', 'skill_level', 'dispatch_speed',
        'accuracy', 'evasion', 'vs_size_damage'].filter(id => ids.includes(id));
    if (gone.length) fail(`still: ${gone}`);
    const need = ['res_lightning', 'res_fire', 'res_cold', 'res_poison', 'res_max_bonus', 'res_reduction', 'vs_status_damage'].filter(id => !ids.includes(id));
    if (need.length) fail(`missing: ${need}`);
    const fhr = D.combatStats.find(s => s.id === 'fhr');
    // fhr = 타격 회복(경직 시간 단축) — 09-16 물리 경직 부활로 디아블로 2 의 원래 뜻으로 돌아갔다 (battle_design §2-3 · R110). ~~상태이상 회복 속도 (08-25)~~
    if (!fhr || !fhr.ko.includes('타격') || fhr.en !== 'Hit Recovery') fail(`fhr 라벨 = 타격 회복 / Hit Recovery (09-16) — 지금 ${fhr?.ko} / ${fhr?.en}`);
    // 저항은 소재값이 아니라 직접 % (§9-5) · 유틸은 운 계수 (hero_design §4-1)
    for (const id of ['res_fire', 'res_cold', 'res_lightning', 'res_poison', 'res_max_bonus'])
        if (D.combatStats.find(s => s.id === id).fmt !== 'pct') fail(`${id} fmt`);
    for (const id of ['item_find', 'gold_find'])
        if (D.combatStats.find(s => s.id === id).attr !== 'luck') fail(`${id} attr`);
    if (ids.length !== 24) fail(`${ids.length}`);
    return true;
});
check('combat_stat.csv: sheet_order 1~24 유일 · 머리 4 = 물공·마공·행동 주기·최대 HP · 세부 옵션 1 = 사용자가 고른 14줄 (SCREEN_DESIGN §6 · ADR-0294)', () => {
    // 캐릭터 시트의 행 순서는 **CSV 행 순서가 아니라 이 컬럼**이 정한다. 화면이 못 읽는 규칙이라 여기서 지킨다
    const orders = D.combatStats.map(s => s.sheetOrder);
    if (orders.some(v => typeof v !== 'number')) fail('sheet_order 가 비어 있는 행이 있다');
    if (new Set(orders).size !== 24) fail(`중복 ${orders.length - new Set(orders).size}개`);
    if (Math.min(...orders) !== 1 || Math.max(...orders) !== 24) fail(`범위 ${Math.min(...orders)}~${Math.max(...orders)}`);
    const seq = D.combatStats.slice().sort((a, b) => a.sheetOrder - b.sheetOrder);
    // 머리 4 = 대표값 — 시트가 여기까지 굵게 찍고 간격을 둔다 (tip.js:DETAIL_LEAD — 캐릭터 탭 · 유닛 툴팁이 같이 쓴다 · 넷은 2026-09-22 ADR-0294)
    const lead = seq.slice(0, 4).map(s => s.id).join();
    if (lead !== 'atk_physical,atk_magic,action_period,hp_max') fail(`머리 4: ${lead}`);
    const drawn = seq.filter(s => s.impl === 1).map(s => s.id);
    // 22행 = 09-17 타격 회복(fhr)이 들어왔다 (R110). 저항 감소는 impl=1 이지만 시트에 안 선다(tip.js:SHEET_HIDDEN · ADR-0294) — 맨 뒤에 둔다
    if (drawn.length !== 22) fail(`impl=1 ${drawn.length}`);
    // 칸 경계 = tip.js:DETAIL_SPLIT_AT ('def_ignore' · 2026-09-22 ADR-0294) — 세부 옵션 1 은 사용자가 적은 14줄 · 그 순서 그대로다.
    //   옵션이 여는 축(tip.js:FX_ROWS 12 — 명중률 2026-09-22 R138)은 전부 2 에 선다 — 캐릭터 탭 두 패널 · 유닛 툴팁 두 열이 같이 쓴다(sheetPages)
    const cut = drawn.indexOf('def_ignore');
    const page1 = drawn.slice(0, cut).join();
    const want = 'atk_physical,atk_magic,action_period,hp_max,crit_rate,crit_damage,cooldown_reduction,defense,damage_reduction,fhr,res_fire,res_cold,res_lightning,res_poison';
    if (page1 !== want) fail(`세부 옵션 1: ${page1}`);
    if (drawn[drawn.length - 1] !== 'res_reduction') fail(`시트에 안 서는 저항 감소가 맨 뒤가 아니다: ${drawn[drawn.length - 1]}`);
    return `22행 · 세부 옵션 1 ${cut} / 2 ${drawn.length - cut - 1}(+ 옵션 줄 · 저항 감소 제외)`;
});
check('hero_attribute.csv: 감각 → 운 (2026-08-26 재정의) · 자리 유지 · 직업 메인 스탯(class.csv:key_attr · 2026-09-18)', () => {
    const ids = D.heroAttributes.map(s => s.id);
    if (ids.includes('sen')) fail('sen 이 남아 있다');
    if (ids[4] !== 'luck') fail(`5번째가 luck 이 아니다: ${ids[4]}`);
    // 메인 스탯 [2026-09-18 사용자 확정 · hero_design §2] — ~~궁수 keyAttr 이 감각 → 운을 따라간다~~ 는 궁수 민첩으로 대체
    const want = { warrior: 'str', knight: 'str', mage: 'int', archer: 'agi', priest: 'int', assassin: 'luck', necromancer: 'int' };
    for (const [cls, attr] of Object.entries(want)) {
        const got = D.classes.find(c => c.id === cls)?.keyAttr;
        if (got !== attr) fail(`${cls} 메인 스탯 ${got} ≠ ${attr}`);
    }
    return ids.join('/');
});
// ~~접사 정의(affix.csv)~~ [2026-09-21 · R127 — 파일째 퇴역] → **장신구 옵션 표 둘**에 같은 규약을 건다 (무기 · 방어구 표는 로드 검증 · 아래 단정들이 든다)
check('장신구 옵션 표: scale 3분류 · perIlvl 은 band 에만 · 라벨 · 명중/회피 없음 · 공통에 원소별 저항 4종 (item_design §2-1 · §1 「반지 · 목걸이」)', () => {
    const rows = [...D.accessorySinOptions, ...D.accessoryCommonOptions];
    for (const d of rows) {
        if (!['growth', 'band', 'flat'].includes(d.scale)) fail(`${d.stat} scale=${d.scale}`);
        if (d.scale !== 'band' && d.perIlvl !== undefined) fail(`${d.stat} 에 perIlvl 이 남아 있다`);
        if (d.scale === 'band' && typeof d.perIlvl !== 'number') fail(`${d.stat} band 인데 perIlvl 없음`);
        if (!M.AFFIX_LABELS[d.stat]) fail(`라벨 없음: ${d.stat}`);
    }
    if (rows.some(d => ['accuracy', 'evasion'].includes(d.stat))) fail('명중/회피 옵션이 있다');
    if (!['res_fire', 'res_cold', 'res_lightning', 'res_poison'].every(s => D.accessoryCommonOptions.some(d => d.stat === s))) fail('원소별 저항 4종 없음');
    if (rows.some(d => d.stat === 'atk_flat')) fail('atk_flat 은 퇴역했다 — 최소/최대 피해 보류 (R78)');
    // 반지 기준 — 두 칸이라 두 번 쌓인다. 곱이 되는 것(치명 피해 · % 피해 감소 · 최대 저항 · 공속 · 데미지 +%)은 반지에 없다 (item_design §1)
    const multy = ['crit_damage', 'damage_reduction', 'res_max_bonus', 'aspd_pct', 'atk_pct'];
    const ringHas = rows.filter(d => (d.slot === 'ring' || d.slot === undefined) && multy.includes(d.stat));
    if (ringHas.length) fail(`반지에 곱이 되는 옵션: ${ringHas.map(d => d.stat).join(',')}`);
    return `죄종 칸 ${D.accessorySinOptions.length} · 공통 ${D.accessoryCommonOptions.length}`;
});

/* ── RNG ── */
check('rng: 같은 시드 = 같은 수열', () => {
    const a = makeRng(7), b = makeRng(7);
    for (let i = 0; i < 50; i++) if (a() !== b()) return false;
    return true;
});
check('rng: 다른 시드 = 다른 수열', () => makeRng(1)() !== makeRng(2)());
check('rng: deriveSeed 결정론', () => deriveSeed(123, 4) === deriveSeed(123, 4) && deriveSeed(123, 4) !== deriveSeed(123, 5));

/* ── 피해 공식 (battle_design §9) — formula.js 는 순수 함수라 여기서 직접 시험한다 ── */
const F = createFormula(B);
/** 값을 정해 주는 rng — 소비 횟수를 세고, 순서 계약을 시드 운에 맡기지 않는다 */
const seqRng = vals => {
    let i = 0;
    const f = () => { f.n += 1; return vals[Math.min(i++, vals.length - 1)]; };
    f.n = 0;
    return f;
};
check('formula: 감쇠 곡선 — D=K 에서 정확히 50%, 면역 없음, 0에서 0 (§9-3)', () => {
    const K = B.def_curve_k;
    if (Math.abs(F.mitigation(K) - 0.5) > 1e-9) fail(`D=K → ${F.mitigation(K)}`);
    if (F.mitigation(0) !== 0) fail('D=0');
    if (F.mitigation(1e9) >= 1) fail('면역 발생');
    if (!(F.mitigation(K * 4) > F.mitigation(K))) fail('단조 증가 아님');
    return `K=${K} · D=4K → ${(F.mitigation(K * 4) * 100).toFixed(0)}%`;
});
check('formula: def_curve_k 는 상수 — 감쇠가 레벨과 무관하다 (08-26 레벨 앵커 폐기)', () => {
    if (F.mitigation(50) !== F.mitigation(50, 99)) fail('레벨 인자가 아직 곡선을 흔든다');
    if (F.mitigation(50, 1) !== F.mitigation(50, 10)) fail('레벨별로 다르다');
    // 실효 체력 = HP × (1 + 방어/K) — 방어 1점의 가치가 구간과 무관하게 같다
    const eff = D2 => 1 / (1 - F.mitigation(D2));
    if (Math.abs((eff(2 * B.def_curve_k) - eff(B.def_curve_k)) - (eff(B.def_curve_k) - eff(0))) > 1e-9) fail('실효 체력이 선형이 아니다');
    return true;
});
check('formula: 방어 무시는 곡선 앞 소재값을 깎는다 (감쇠율의 %가 아니다)', () => {
    if (Math.abs(F.physicalDefense(100, 0.4) - 60) > 1e-9) fail(`${F.physicalDefense(100, 0.4)}`);
    if (F.physicalDefense(100) !== 100) fail('기본 0%');
    if (F.physicalDefense(100, 1.5) !== 0) fail('음수로 내려가지 않는다');
    return true;
});
check('formula: 음수 방어는 거울식 — 더 받고 받는 배수는 2 에서 멈춘다 · 0 에서 매끄럽다 · 방어 무시는 양수에만 (battle_design §9-3 · INTERFACE §2-3 · R130)', () => {
    const K = B.def_curve_k, taken = D => 1 - F.mitigation(D);   // 받는 배수
    if (Math.abs(taken(-K) - 1.5) > 1e-9) fail(`D=−K → 받는 배수 ${taken(-K)} (1.5 여야 — 거울식)`);
    if (!(taken(-1e9) < 2) || taken(-1e9) < 1.999) fail(`D→−∞ 받는 배수 ${taken(-1e9)} — 2 에 다가가되 넘지 않아야`);
    if (!(taken(-K * 4) > taken(-K) && taken(-K) > taken(-1) && taken(-1) > 1)) fail('음수 쪽이 단조 증가가 아니다 — 방어가 깊을수록 더 받아야');
    // 0 에서 기울기가 이어진다 — 양쪽 한 걸음의 차가 같다(1차 근사)
    const h = 1e-4, l = taken(-h) - taken(0), r = taken(0) - taken(h);
    if (Math.abs(l - r) > 1e-9) fail(`0 에서 꺾인다 — 왼쪽 ${l} · 오른쪽 ${r}`);
    if (Number.isNaN(F.mitigation(NaN)) || F.mitigation(NaN) !== 0) fail('NaN 은 0');
    // 무시는 양수 방어에만 — 음수에 걸면 음수가 줄어 관통이 방어자를 돕는다
    if (F.physicalDefense(-50, 0.4) !== -50) fail(`음수 방어에 무시를 걸었다 — ${F.physicalDefense(-50, 0.4)}`);
    if (F.physicalDefense(0, 0.4) !== 0) fail('0 방어');
    return `K=${K} · −K → ×${taken(-K).toFixed(2)} · −4K → ×${taken(-K * 4).toFixed(2)} · 상한 ×2`;
});
check('formula: 원소 저항은 상한형 — res_cap_base 에서 잘리고 최대 저항 증가만 뚫는다, 절대 상한이 마지막 (§9-5)', () => {
    // 저항 · 상한은 비율이다 (R111) — 0.3 = 30%
    if (F.appliedResist(0.3) !== 0.3) fail('상한 아래는 그대로');
    if (F.appliedResist(2) !== B.res_cap_base) fail(`기본 상한 ${F.appliedResist(2)}`);
    if (F.appliedResist(2, 0.1) !== B.res_cap_base + 0.1) fail('최대 저항 증가가 상한을 못 뚫는다');
    if (F.appliedResist(9.99, 9.99) !== B.res_cap_absolute) fail('절대 상한');
    if (F.resCap() !== B.res_cap_base) fail('resCap');
    if (!(B.res_cap_base > 0 && B.res_cap_absolute <= 1)) fail(`저항 상한이 비율이 아니다 ${B.res_cap_base} / ${B.res_cap_absolute}`);
    return `${M.pctNum(B.res_cap_base)}% → 절대 ${M.pctNum(B.res_cap_absolute)}%`;
});
check('formula: 저항은 하한이 없다 — 음수 저항은 피해를 증폭한다 (§9-5)', () => {
    const a = { atkMin: 100, atkMax: 100, atkType: 'fire', crit: 0, critDmg: 1, lvl: 5 };
    const amp = F.strike(seqRng([0, 0.99]), a, { res: { fire: -0.5 }, lvl: 5 }).dmg;
    if (!(amp > a.atkMax)) fail(`증폭되지 않았다 ${amp}`);
    return `저항 −50% → ${amp} (공격력 ${a.atkMax})`;
});
check('formula: 저항 감소는 %p 가감 — 관통이라는 별도 규칙이 아니다 (§9-5)', () => {
    const a = { atkMin: 100, atkMax: 100, atkType: 'cold', crit: 0, critDmg: 1, lvl: 5, resReduction: 0.3 };
    const dmg = F.strike(seqRng([0, 0.99]), a, { res: { cold: 0.3 }, lvl: 5 }).dmg;
    return dmg === 100 ? '저항 30 − 감소 30 → 무저항' : fail(`${dmg}`);
});
check('formula: 피해 감소는 원천별 곱 — 10 + 10 은 20이 아니라 19 (§9-3)', () => {
    if (Math.abs(F.reductionMult([0.1, 0.1]) - 0.81) > 1e-9) fail(`${F.reductionMult([0.1, 0.1])}`);
    if (F.reductionMult([]) !== 1) fail('빈 배열은 1');
    if (!(F.reductionMult([0.5, 0.5, 0.5, 0.5]) > 0)) fail('0에 닿았다 — 면역 발생');
    return `10+10 → ${(100 * (1 - F.reductionMult([0.1, 0.1]))).toFixed(0)}%`;
});
check('formula: 적중률은 레벨 차만이 정한다 — 동레벨 기준값, 오버레벨 초과 이득 없음, 하한 존재 (§9-4)', () => {
    if (F.hitChance(5, 5) !== B.hit_base_pct) fail('동레벨');
    if (F.hitChance(10, 5) !== B.hit_base_pct) fail('오버레벨에서 더 오른다');
    if (F.hitChance(5, 6) !== B.hit_base_pct - B.hit_per_level_deficit_pct) fail('레벨 1 부족');
    if (F.hitChance(1, 99) !== B.hit_min_pct) fail('하한');
    return `기준 ${M.pctNum(B.hit_base_pct)}% · 부족 1당 −${M.pctNum(B.hit_per_level_deficit_pct)}%p · 하한 ${M.pctNum(B.hit_min_pct)}%`;
});
check('formula: 성장 곡선 growthMult — n=1 에서 1, 1당 power_growth_per_level 배 (§9-0)', () => {
    if (F.growthMult(1) !== 1) fail('n=1');
    if (Math.abs(F.growthMult(2) - B.power_growth_per_level) > 1e-12) fail('n=2');
    if (F.growthMult(0) !== 1) fail('n<1 은 1로 막는다');
    if (Math.abs(F.growthMult(11) - Math.pow(B.power_growth_per_level, 10)) > 1e-9) fail('n=11');
    return `ilvl 10 → ×${F.growthMult(10).toFixed(2)} · 챕터(ilvl 8) → ×${F.growthMult(8).toFixed(2)}`;
});
check('formula: strike 의 rng 소비 = 적중 → 피해 → 치명 (빗나가면 1회) — 피해 굴림은 적중 뒤 · 치명 앞 (§5-2 계약 · R90)', () => {
    const a = { atkMin: 100, atkMax: 100, atkType: 'physical', crit: 0.5, critDmg: 2, lvl: 5 };
    const hit = seqRng([0, 0.99]);
    const r1 = F.strike(hit, a, { def: 0, lvl: 5 });
    if (!r1.hit || hit.n !== 3) fail(`적중 시 ${hit.n}회 (3 이어야)`);
    // 자리 — 둘째 굴림이 피해 · 셋째가 치명이다. 뒤바뀌면 아래 두 판의 결과가 서로 바뀐다
    const low = F.strike(seqRng([0, 0, 0.99]), { ...a, atkMax: 200 }, { def: 0, lvl: 5 });
    if (low.dmg !== 100 || low.crit) fail(`피해 굴림 0 · 치명 굴림 0.99 → ${low.dmg} crit ${low.crit} (100 · false 여야)`);
    const high = F.strike(seqRng([0, 0.99, 0]), { ...a, atkMax: 200 }, { def: 0, lvl: 5 });
    if (high.dmg !== 199 * 2 || !high.crit) fail(`피해 굴림 0.99 · 치명 굴림 0 → ${high.dmg} crit ${high.crit} (398 · true 여야)`);
    const miss = seqRng([0.99, 0.0]);
    const r2 = F.strike(miss, a, { def: 0, lvl: 99 });      // 레벨 부족 → 적중률 하한
    if (r2.hit || miss.n !== 1) fail(`빗나감 시 ${miss.n}회 (1 이어야)`);
    if (r2.dmg !== 0 || r2.crit !== false) fail('빗나감 결과');
    return true;
});
/**
 * 추가 피해 · 능력치 항 [2026-09-10 · battle_design §9-2 · INTERFACE §5-2 · R72] — rng 소비 수를 **세는 rng** 로 잠근다.
 * 기본 공격은 확률이 0 이라 수열이 종전과 같아야 한다 — 그게 깨지면 골든 40런이 통째로 흔들린다.
 */
check('formula: strike rng 소비 — 빗나감 1 · 적중(추가 피해 확률 0) 3 · 적중(확률 > 0) 4 · 터지면 배수가 치명과 곱해진다 (§5-2 · R72 · 피해 굴림 R90)', () => {
    const a = { atkMin: 100, atkMax: 100, atkType: 'physical', crit: 0, critDmg: 2, lvl: 5 };
    const miss = seqRng([0.99, 0, 0]);
    const m = F.strike(miss, { ...a, procChance: 0.5, procMult: 3 }, { def: 0, lvl: 99 });
    if (m.hit || miss.n !== 1 || m.proc !== false) fail(`빗나감 ${miss.n}회 · proc ${m.proc} (1회 · false 여야)`);
    const plain = seqRng([0, 0.99, 0]);
    const p = F.strike(plain, a, { def: 0, lvl: 5 });
    if (!p.hit || plain.n !== 3 || p.proc !== false) fail(`확률 0 적중 ${plain.n}회 · proc ${p.proc} (3회 · false 여야)`);
    const rolled = seqRng([0, 0.99, 0.99]);
    const r = F.strike(rolled, { ...a, procChance: 0.5, procMult: 3 }, { def: 0, lvl: 5 });
    if (!r.hit || rolled.n !== 4 || r.proc !== false || r.dmg !== 100) fail(`확률 50 적중(안 터짐) ${rolled.n}회 · proc ${r.proc} · dmg ${r.dmg} (4회 · false · 100 이어야)`);
    const both = seqRng([0, 0, 0]);
    const x = F.strike(both, { ...a, crit: 0.5, procChance: 0.5, procMult: 3 }, { def: 0, lvl: 5 });
    if (both.n !== 4 || !x.crit || !x.proc || x.dmg !== 100 * 2 * 3) fail(`치명+추가 ${both.n}회 · crit ${x.crit} · proc ${x.proc} · dmg ${x.dmg} (4회 · 600 이어야)`);
    // 확률 > 1(= 100%) 은 1 에서 자른다 — 0.9999 굴림도 터진다
    const capped = seqRng([0, 0.99, 0.9999]);
    if (!F.strike(capped, { ...a, procChance: 2.5, procMult: 2 }, { def: 0, lvl: 5 }).proc) fail('확률 2.5 인데 0.9999 에서 안 터졌다 — 1 에서 자르지 않는다');
    return '빗나감 1 · 확률 0 적중 3 · 확률 > 0 적중 4 · 치명 ×2 · 추가 ×3 = ×6';
});
/**
 * 능력치 계수 [2026-09-18 · 사용자 확정 · battle_design §9-2] — `(1 + attr_dmg_step_pct) ^ (능력치 − attr_dmg_pivot)`.
 * 기준에서 1 · 복리 · 0 에 안 닿는다 · ~~능력치 항 `flat` 덧셈(09-10)~~ 폐기 — 옛 필드를 넘겨도 피해가 안 변해야 한다
 */
check('formula: 능력치 계수 statCoef — 기준 능력치에서 1 · 1점마다 복리 · 0 에 안 닿는다 · 모르면 1 (battle_design §9-2 · 2026-09-18)', () => {
    const p = B.attr_dmg_pivot, s = B.attr_dmg_step_pct;
    if (!(Number.isFinite(p) && s > 0)) fail(`balance.csv 손잡이 attr_dmg_pivot ${p} · attr_dmg_step_pct ${s}`);
    if (F.statCoef(p) !== 1) fail(`기준 ${p} → ${F.statCoef(p)} (1 이어야)`);
    const up = F.statCoef(p + 10), down = F.statCoef(p - 9);
    if (Math.abs(up - Math.pow(1 + s, 10)) > 1e-12) fail(`기준 +10 → ${up}`);
    if (Math.abs(F.statCoef(p + 2) / F.statCoef(p + 1) - (1 + s)) > 1e-12) fail('1점마다 같은 비율로 곱해지지 않는다 — 복리가 아니다');
    if (!(down > 0 && down < 1)) fail(`기준 −9 → ${down} (0 과 1 사이여야)`);
    if (F.statCoef(undefined) !== 1 || F.statCoef(null) !== 1) fail('능력치를 모르면 1');
    return `기준 ${p} ×1 · +10 ×${up.toFixed(3)} · −9 ×${down.toFixed(3)}`;
});
check('formula: strike 능력치 계수는 곱이다 — 스킬 배율과 함께 곱해지고 옛 flat 은 안 읽힌다 (battle_design §9-2 · 2026-09-18)', () => {
    const a = { atkMin: 100, atkMax: 100, atkType: 'physical', crit: 0, critDmg: 1, lvl: 5 };
    const dmg = patch => F.strike(seqRng([0, 0.99]), { ...a, ...patch }, { def: 0, lvl: 5 }).dmg;
    if (dmg({ statMult: 2 }) !== 200) fail(`100 × 계수 2 → ${dmg({ statMult: 2 })}`);
    if (dmg({ skillMult: 2, statMult: 1.5 }) !== 300) fail(`100 × 2 × 1.5 → ${dmg({ skillMult: 2, statMult: 1.5 })}`);
    if (dmg({ atkMin: 0, atkMax: 0, statMult: 3 }) !== B.dmg_min) fail('데미지 0 이면 계수를 곱해도 하한만 — 능력치가 따로 더해지면 안 된다');
    if (dmg({ flat: 40 }) !== 100) fail(`옛 flat 이 아직 더해진다 → ${dmg({ flat: 40 })}`);
    if (dmg({}) !== 100) fail('계수를 안 넘기면 1');
    return '100 × 2 = 200 · 100 × 2 × 1.5 = 300 · flat 무시';
});
check('formula: 치명 상한 crit_cap_pct — 넘겨도 전타 치명이 되지 않는다', () => {
    const rng = makeRng(5);
    const a = { atkMin: 100, atkMax: 100, atkType: 'physical', crit: 99.99, critDmg: 2, lvl: 5 };
    let crits = 0;
    for (let i = 0; i < 400; i++) if (F.strike(rng, a, { def: 0, lvl: 5 }).crit) crits++;
    if (crits === 400) fail('상한 미적용');
    return `${crits}/400 (상한 ${M.pctNum(B.crit_cap_pct)}%)`;
});
check('formula: 비직격은 감쇠·치명을 받지 않는다 (§9-6)', () =>
    F.indirect(50) === 50 && F.indirect(0) === B.dmg_min && F.leech(200, 0.1) === 20);
check('formula: 직격 — 양끝이 같으면 시드와 무관하게 같은 숫자가 나오고 감쇠가 그대로 곱해진다 (범위 굴림은 아래 단정 · R90)', () => {
    const a = { atkMin: 1000, atkMax: 1000, atkType: 'physical', crit: 0, critDmg: 1, lvl: 5 };
    const flat = F.strike(makeRng(11), a, { def: 0, lvl: 5 }).dmg;
    if (flat !== 1000) fail(`무방어 ${flat}`);
    const half = F.strike(makeRng(11), a, { def: B.def_curve_k, lvl: 5 }).dmg;
    if (half !== 500) fail(`D=K 에서 ${half} (500 이어야)`);
    for (let s = 0; s < 30; s++) if (F.strike(makeRng(s), a, { def: 0, lvl: 5 }).dmg !== 1000) fail('양끝이 같은데 숫자가 흔들린다');
    return true;
});
/**
 * 무기 피해 범위 [2026-09-14 · R90 · battle_design §9-1] — 적중한 직격마다 공격력 범위 양끝 사이를 **한 번** 굴린다.
 * 기대값이 가운데에 모이는 것 · 범위 × 배율을 안 벗어나는 것 · 양끝이 같아도 굴림을 소비하는 것을 같이 잠근다.
 */
check('formula: 피해 굴림 — 직격 피해는 범위 × 배율 안 · 많이 굴린 평균 ≈ 가운데 · 양끝이 같아도 굴림 1회 (battle_design §9-1 · R90)', () => {
    const a = { atkMin: 100, atkMax: 200, atkType: 'physical', crit: 0, critDmg: 1, lvl: 5, skillMult: 1.5 };
    const rng = makeRng(17);
    let sum = 0, n = 0, lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 4000; i++) {
        const r = F.strike(rng, a, { def: 0, lvl: 5 });
        if (!r.hit) continue;
        if (r.dmg < 150 || r.dmg > 300) fail(`범위 밖 ${r.dmg} ∉ [150, 300] (100~200 × 1.5)`);
        sum += r.dmg; n++; lo = Math.min(lo, r.dmg); hi = Math.max(hi, r.dmg);
    }
    if (n < 1000) fail(`적중 표본 부족 ${n}`);
    const mean = sum / n;
    if (Math.abs(mean - 225) > 225 * 0.02) fail(`평균 ${mean.toFixed(1)} — 가운데 225 에서 2% 넘게 벗어났다`);
    if (!(hi - lo > 100)) fail(`폭이 안 퍼진다 ${lo}~${hi} — 굴림이 안 걸린다`);
    // 양끝이 같아도 굴림은 소비된다 — 소비 수가 무기에 의존하면 같은 시드가 다른 전투를 낸다
    const same = seqRng([0, 0.5, 0.99]);
    F.strike(same, { ...a, atkMin: 150, atkMax: 150 }, { def: 0, lvl: 5 });
    if (same.n !== 3) fail(`양끝이 같은 적중 ${same.n}회 (3 이어야)`);
    return `100~200 × 1.5 → ${lo}~${hi} · 평균 ${mean.toFixed(1)} (가운데 225 · 적중 ${n})`;
});
check('formula: weaponDamage — 가운데 × (1 ∓ 폭) × 강화 배율을 한 번 반올림 · 최소 ≥ 1 · 최대 ≥ 최소 · 무기군을 모르면 전역 폭 (INTERFACE §2-3 · R90)', () => {
    for (const g of Object.values(WG)) for (const ilvl of [1, 10, 40]) for (const up of [0, 3]) {
        const d = F.weaponDamage(ilvl, g, up);
        const mid = bandMid(ilvl), w = g.variance, m = F.upgradeMult(up);   // 폭은 비율 (R111)
        const want = { min: Math.max(1, Math.round(mid * (1 - w) * m)), max: 0 };
        want.max = Math.max(want.min, Math.round(mid * (1 + w) * m));
        if (!eq(d, want)) fail(`${g.id} ilvl ${ilvl} +${up} → ${JSON.stringify(d)} ≠ ${JSON.stringify(want)}`);
        if (!Number.isInteger(d.min) || d.min < 1 || d.max < d.min) fail(`${g.id} 양끝 규칙 ${d.min}~${d.max}`);
    }
    const bare = F.weaponDamage(10, null), mid = bandMid(10);
    if (bare.max !== Math.round(mid * (1 + B.dmg_variance_pct))) fail(`무기군 없음 → ${JSON.stringify(bare)} (dmg_variance_pct 여야)`);
    if (F.upgradeMult(0) !== 1 || Math.abs(F.upgradeMult(2) - (1 + 2 * B.equip_upgrade_base_pct)) > 1e-12) fail('upgradeMult');
    const axe = F.weaponDamage(1, WG.axe);
    return `axe ilvl1 ${axe.min}~${axe.max} · 무기군 없음 ilvl10 ${bare.min}~${bare.max}`;
});
check('formula: 피해량(bonusPct)은 따로 곱한다 · 스킬 배율은 기본 1 (battle_design §9-2 · 2026-09-18)', () => {
    const a = { atkMin: 100, atkMax: 100, atkType: 'physical', crit: 0, critDmg: 1, lvl: 5 };
    if (F.strike(seqRng([0, 0.99]), { ...a, bonusPct: 0.5 }, { def: 0, lvl: 5 }).dmg !== 150) fail('bonusPct');
    // 데미지 % 괄호(100% — 범위에 이미 곱해진 200)와 **곱**이다 — 괄호에 더해지면 250 이 된다
    if (F.strike(seqRng([0, 0.99]), { ...a, atkMin: 200, atkMax: 200, dmgPct: 1, bonusPct: 0.5 }, { def: 0, lvl: 5 }).dmg !== 300) fail('피해량이 데미지 % 괄호에 더해졌다');
    if (F.strike(seqRng([0, 0.99]), { ...a, skillMult: 2 }, { def: 0, lvl: 5 }).dmg !== 200) fail('skillMult');
    if (F.strike(seqRng([0, 0.99]), a, { def: 0, lvl: 5 }).dmg !== 100) fail('기본값');
    return true;
});
/**
 * 데미지 % 는 한 괄호 [2026-09-18 · 사용자 확정 · battle_design §9-1] — 조건부 % 는 그 타격에서 괄호 **안에 더해진다**.
 * 그래서 조건부 30% 는 상시 데미지 % 30% 와 같은 값이고, 상시가 100% 쌓인 뒤의 조건부 30% 는 ×1.3 이 아니라 ×1.15 다
 */
check('formula: 조건부 %(condPct)는 데미지 % 괄호 안의 덧셈 — 조건부 30% = 상시 30% · 상시 100% 위에서는 ×1.15 (battle_design §9-1 · 2026-09-18)', () => {
    const a = { atkMin: 100, atkMax: 100, atkType: 'physical', crit: 0, critDmg: 1, lvl: 5 };
    const dmg = patch => F.strike(seqRng([0, 0.99]), { ...a, ...patch }, { def: 0, lvl: 5 }).dmg;
    const cond = dmg({ condPct: 0.3 });
    const always = dmg({ atkMin: 130, atkMax: 130, dmgPct: 0.3 });
    if (cond !== 130 || always !== 130) fail(`조건부 30% ${cond} · 상시 30% ${always} (둘 다 130 이어야)`);
    const stacked = dmg({ atkMin: 200, atkMax: 200, dmgPct: 1, condPct: 0.3 });
    if (stacked !== 230) fail(`상시 100% + 조건부 30% → ${stacked} (230 이어야 — 260 이면 괄호가 둘이다)`);
    if (dmg({ atkMin: 200, atkMax: 200, dmgPct: 1 }) !== 200) fail('조건부가 없으면 범위 그대로');
    return `조건부 30% ${cond} = 상시 30% ${always} · 상시 100% + 조건부 30% → ${stacked}`;
});
check('formula: 최종 피해 하한 dmg_min — 감쇠가 아무리 커도 0이 되지 않는다', () => {
    const a = { atkMin: 1, atkMax: 1, atkType: 'fire', crit: 0, critDmg: 1, lvl: 5 };
    return F.strike(seqRng([0, 0.99]), a, { res: { fire: 1e6 }, lvl: 5 }).dmg === B.dmg_min;
});

/* ── 영웅 생성 ── */
const cands = SYS.hero.rollStartParty(makeRng(1), B.party_size_max);
check('시작 파티: 3명, 죄종·직업·이름 겹침 없음', () => {
    const u = k => new Set(cands.map(c => typeof c[k] === 'object' ? c[k].en : c[k])).size === cands.length;
    return cands.length === B.party_size_max && u('sin') && u('cls') && u('name');
});
check('시작 파티: 능력치 합이 **등급 대역** 안 · 범위 준수 · 주력 축(class.csv:key_attr)이 최고', () => {
    // ⚠ ~~합은 hero_attr_total 하나로 고정~~ 은 09-07 폐지 — 등급이 대역을 정하고 그 안에서 굴린다 (hero_design §1)
    for (const c of cands) {
        const vals = Object.values(c.stats);
        const sum = vals.reduce((a, b) => a + b, 0);
        const tier = D.heroTiers.find(t => t.id === c.tier);
        if (!tier) fail(`등급 '${c.tier}' 가 hero_tier.csv 에 없다`);
        if (sum < tier.totalMin || sum > tier.totalMax) fail(`${c.tier} sum ${sum} ∉ [${tier.totalMin}·${tier.totalMax}]`);
        if (vals.some(v => v < B.hero_attr_min || v > B.hero_attr_max)) fail('range');
        const key = D.classes.find(x => x.id === c.cls).keyAttr;
        if (c.stats[key] !== Math.max(...vals)) fail(`${c.cls} key ${key}=${c.stats[key]} max=${Math.max(...vals)}`);
        if ('caps' in c) fail('caps 가 남았다 — 개체별 히든 상한은 09-07 폐지');
    }
    return `등급 ${cands.map(c => c.tier).join('·')}`;
});
check('시작 파티: **레어 1 + 매직 1 + 일반 1** — 첫 화면부터 세 층이 보인다 (hero_design §1 개정 2026-09-14)', () => {
    const got = cands.map(c => c.tier);
    if (!eq(got, ['rare', 'magic', 'normal'])) fail(`${got.join('·')} ≠ rare·magic·normal`);
    // 대역은 **겹쳐도 된다**(2026-09-14 사용자 확정 — ~~겹치지 않는다~~ 09-07 폐기) · 대신 **아래 등급일수록 양 끝이 낮다**
    const n = D.heroTiers.find(t => t.id === 'normal'), m = D.heroTiers.find(t => t.id === 'magic'), r = D.heroTiers.find(t => t.id === 'rare');
    if (!n || !m || !r) fail('hero_tier.csv 에 일반·매직·레어 중 빠진 행이 있다');
    if (!(n.totalMin < m.totalMin && m.totalMin < r.totalMin && n.totalMax < m.totalMax && m.totalMax < r.totalMax))
        fail(`대역 순서가 어긋난다 일반[${n.totalMin}·${n.totalMax}] 매직[${m.totalMin}·${m.totalMax}] 레어[${r.totalMin}·${r.totalMax}]`);
    return `rare·magic·normal · 대역 일반[${n.totalMin}·${n.totalMax}] · 매직[${m.totalMin}·${m.totalMax}] · 레어[${r.totalMin}·${r.totalMax}]`;
});
check('영웅 등급: rng 소비 수가 등급에 의존하지 않는다 — 지정이어도 굴림을 태운다 (INTERFACE §5-2)', () => {
    // 등급 지정(시작 파티)과 등급 굴림(선술집)이 **같은 시드에서 같은 자리를 소비**해야 한다.
    // 밀리면 이름·직업(등급보다 먼저 뽑힌다)은 같은데 뒤에 오는 고유·얼굴이 어긋난다
    const forced = SYS.hero.rollStartParty(makeRng(7), 3);
    const free = SYS.hero.rollCandidates(makeRng(7), 3);
    for (let i = 0; i < 3; i++) {
        if (forced[i].name.en !== free[i].name.en) fail(`이름이 밀렸다 ${forced[i].name.en} ≠ ${free[i].name.en}`);
        if (forced[i].cls !== free[i].cls || forced[i].sin !== free[i].sin) fail('직업·죄종이 밀렸다');
        if (forced[i].innate !== free[i].innate) fail('고유가 밀렸다 — 등급 굴림이 소비를 바꿨다');
        if (forced[i].face !== free[i].face) fail(`얼굴이 밀렸다 ${forced[i].face} ≠ ${free[i].face} — 등급 굴림이 소비를 바꿨다`);
    }
    return `지정 ${forced.map(h => h.tier).join('·')} vs 굴림 ${free.map(h => h.tier).join('·')} — 소비 동일`;
});
check('시작 파티: 같은 시드 = 같은 3명', () => eq(SYS.hero.rollStartParty(makeRng(1), 3), cands));
check('시작 파티: 고유 스킬 — 생성 시 skill.csv 풀에서 1개 · 정의에 있는 id · 같은 시드 = 같은 스킬 (hero_design §1 프로토타입 2026-09-01)', () => {
    for (const c of cands) if (!SYS.skill.defs[c.innate]) fail(`${c.cls} 의 고유 '${c.innate}' 가 정의에 없다`);
    // 굴림 순서(능력치 → 상한 → 고유)가 계약이라 같은 시드는 같은 고유를 내야 한다
    const one = { sin: cands[0].sin, cls: cands[0].cls, name: cands[0].name, trait: cands[0].trait };
    if (SYS.hero.rollHero(makeRng(7), one).innate !== SYS.hero.rollHero(makeRng(7), one).innate) fail('같은 시드인데 고유가 다르다');
    // 풀은 **그 직업 풀** 하나다 [개정 2026-09-09 · skill_design §12-1 규칙 1]
    const id = SYS.hero.rollInnate(makeRng(3), cands[0].cls);
    if (!SYS.skill.list.some(d => d.id === id && d.ownerId === cands[0].cls))
        fail(`rollInnate 가 ${cands[0].cls} 풀 밖의 '${id}' 를 줬다`);
    return cands.map(c => `${c.cls}:${c.innate}`).join(' · ');
});

/* ── 새 게임 · 직렬화 ── */
/**
 * 공유 판 — 새 게임 하나. **읽기 전용이다** [2026-09-22 · 구조 감사] — 단정이 바꾸면 `check` 가 그 단정을 빨간불로 만들고 판을 새로 깐다.
 *   판을 바꿔야 하는 단정은 `freshG()` 로 **제 판**을 만든다(같은 시드 · 같은 시작 영웅이라 처음 모습이 공유 판과 같다).
 * **공유 판은 다 지은 판이다** [2026-09-22 · R137] — 기능 단정(분해 · 강화 · 제작 · 선술집 · 수색 · 전술 · 편성 여럿)은 건설이 아니라
 *   그 기능을 잰다. 새 게임 그대로(제련소 · 선술집 안 지어짐)를 재는 단정은 `SYS.game.newGame` 을 직접 부른다
 */
/** 모든 건물을 끝까지 지은 판 — 문턱 · 비용을 건너뛴다. 편성 수 · 물약 칸이 늘도록 세이브를 한 번 돌려 불러온다(`deserialize` 가 상한에 맞춘다) */
const openAll = (g, S = SYS) => {
    for (const b of S.construction.list) g.buildings[b.id] = b.maxRank;
    return S.game.deserialize(JSON.parse(JSON.stringify(S.game.serialize(g, NOW))));
};
const freshG = () => openAll(SYS.game.newGame(42, cands, NOW));
let G = freshG();
G0 = JSON.stringify(G);
/**
 * 새 게임은 **편성 1 이 시작 영웅 셋으로 차 있다** [사용자 지시 2026-09-21 · ADR-0227 — ~~빈 파티~~ 09-09 폐기].
 * 로스터 순서 그대로라 옛 판에서 단정이 직접 채우던 파티와 **같다** — 아래 단정 전부가 그 파티를 전제한다.
 */
check('newGame: 편성 1 에 시작 영웅 셋이 로스터 순서로 서 있다 — 나머지 편성은 빈다 · party[0] 이 리더 · 진형도 선다 (ADR-0227)', () => {
    const party = SYS.game.partyOf(G);
    const starters = G.heroes.slice(0, B.party_size_max).map(h => h.uid);
    if (!eq(party, starters)) fail(`편성 1 ${party.join(',')} ≠ 시작 파티 ${starters.join(',')}`);
    if (SYS.game.canDepart(G, D.stageOrder[0], NOW) !== null) fail(`새 게임이 못 나간다 — ${SYS.game.canDepart(G, D.stageOrder[0], NOW)}`);
    // 편성 수는 건물이 늘린다(공유 판은 다 지은 판 · R137) — 2 번부터 끝까지 빈다
    if (G.presets.length < 2) fail(`fixture: 다 지은 판인데 편성 ${G.presets.length}개`);
    for (let no = 2; no <= G.presets.length; no++) if (SYS.game.partyOf(G, no).length) fail(`편성 ${no} 가 안 비었다`);
    // 진형도 같이 선다 — 파티 순서대로 앞 랭크부터 (기본 템플릿은 일자라 셋이 전열)
    const f = SYS.game.formationState(G);
    if (f.ranks.flat().length !== party.length) fail(`진형에 ${f.ranks.flat().length}명뿐이다`);
    // 리더 = party[0] — 빼면 다음 사람이 리더가 되고 다시 넣으면 맨 뒤다 (ADR-0047 의 살아남은 절반)
    const lead = party[0];
    SYS.game.toggleParty(G, lead, NOW);
    if (SYS.game.partyOf(G)[0] !== party[1]) fail('리더를 뺐는데 다음 사람이 리더가 아니다');
    SYS.game.toggleParty(G, lead, NOW);
    if (!eq(SYS.game.partyOf(G), [party[1], party[2], lead])) fail(`다시 넣으면 맨 뒤 ${SYS.game.partyOf(G).join(',')}`);
    // 아래 단정들이 쓰는 G 는 **로스터 순서**여야 한다 — 위에서 흔든 것을 되돌린다
    for (const u of [...SYS.game.partyOf(G)]) SYS.game.toggleParty(G, u, NOW);
    for (const h of G.heroes.slice(0, B.party_size_max)) SYS.game.toggleParty(G, h.uid, NOW);
    return `편성 1 = 로스터 ${party.length}명 · 편성 2 ~ ${G.presets.length} 빈다 · 출발 가능`;
});

/**
 * 해고 (INTERFACE §2-7 `dismiss` · SCREEN_DESIGN §6 · 사용자 확정 2026-09-09) —
 * **별도 상태**에서 돌린다: 로스터에서 영웅을 지우는 파괴적 연산이라 아래 단정들이 쓰는 `G` 를 건드리면 안 된다.
 */
check('dismiss: 장비를 걸치면 막고 · 다 벗으면 지우고 · 파티에서도 빠진다 · 마지막 한 명은 못 지운다', () => {
    const g = SYS.game.newGame(99, SYS.hero.rollCandidates(makeRng(99), B.party_size_max), NOW);
    const [a] = g.heroes;
    // 새 게임은 각자 시작 무기를 하나 차고 있다 — 그대로면 막혀야 한다
    if (!Object.values(a.equipped).some(Boolean)) fail('시작 영웅이 무기를 안 들고 있다 — 전제가 깨졌다');
    if (SYS.game.dismiss(g, a.uid).err !== 'equipped') fail('장비를 걸쳤는데 해고가 통과했다');
    // 다 벗긴다 — 파티에는 새 게임이 이미 넣어 뒀다 (ADR-0227 · 해고가 파티에서도 빼는지 본다)
    for (const [pos, uid] of Object.entries(a.equipped)) if (uid) SYS.game.unequip(g, a.uid, pos);
    if (!SYS.game.partyOf(g).includes(a.uid)) fail('전제가 깨졌다 — 새 게임의 편성 1 에 안 들어 있다');
    const before = g.heroes.length;
    if (!SYS.game.dismiss(g, a.uid).ok) fail('다 벗었는데 해고가 막혔다');
    if (g.heroes.length !== before - 1) fail('로스터에서 안 지워졌다');
    if (SYS.game.partyOf(g).includes(a.uid)) fail('해고했는데 파티에 uid 가 남았다 — 편성이 유령을 든다');
    if (SYS.game.dismiss(g, a.uid).err !== 'missing') fail('이미 지운 영웅이 또 지워진다');
    // 마지막 한 명 — 나머지를 다 지우고 나면 막혀야 한다
    for (const h of [...g.heroes]) {
        if (g.heroes.length <= 1) break;
        for (const [pos, uid] of Object.entries(h.equipped)) if (uid) SYS.game.unequip(g, h.uid, pos);
        SYS.game.dismiss(g, h.uid);
    }
    if (g.heroes.length !== 1) fail(`마지막 한 명만 남아야 하는데 ${g.heroes.length}명이다`);
    for (const [pos, uid] of Object.entries(g.heroes[0].equipped)) if (uid) SYS.game.unequip(g, g.heroes[0].uid, pos);
    if (SYS.game.dismiss(g, g.heroes[0].uid).err !== 'last') fail('마지막 한 명이 지워졌다 — 복구 불능 상태가 만들어진다');
    return '장비 차단 · 삭제 · 파티 정리 · 마지막 보호';
});
/**
 * 로스터 순서 맞바꾸기 (INTERFACE §2-7 `swapHeroes` · SCREEN_DESIGN §5 · ADR-0136 · 2026-09-15) — 캐릭터 탭 띠의 드래그.
 * 순서만 바뀌고 **파티 · 리더 · 진형은 안 따라온다** — 따라오면 띠를 줄 세우려다 리더가 바뀐다. 별도 상태에서 돌린다
 */
check('swapHeroes: 로스터 두 자리만 맞바꾼다 — 파티 · 리더 · 진형은 그대로 · 없는 영웅은 missing · 거절은 아무것도 안 바꾼다', () => {
    const g = SYS.game.newGame(99, SYS.hero.rollCandidates(makeRng(99), B.party_size_max), NOW);
    if (g.heroes.length < 2) fail(`전제가 깨졌다 — 영웅이 ${g.heroes.length}명이다`);
    const ids = () => JSON.stringify(g.heroes.map(h => h.uid));
    const order = g.heroes.map(h => h.uid);
    const party = JSON.stringify(SYS.game.partyOf(g)), form = JSON.stringify(SYS.game.formationState(g).byUid);
    const a = order[0], b = order[order.length - 1];
    if (!SYS.game.swapHeroes(g, a, b).ok) fail('맞바꾸기가 거절됐다');
    const want = [...order]; want[0] = b; want[want.length - 1] = a;
    if (ids() !== JSON.stringify(want)) fail(`순서 ${ids()} — 기대 ${JSON.stringify(want)}`);
    if (JSON.stringify(SYS.game.partyOf(g)) !== party) fail('파티 순서가 따라 바뀌었다 — 리더가 흔들린다');
    if (JSON.stringify(SYS.game.formationState(g).byUid) !== form) fail('진형 자리가 따라 바뀌었다');
    if (!SYS.game.swapHeroes(g, a, a).ok || ids() !== JSON.stringify(want)) fail('같은 영웅끼리의 맞바꾸기가 순서를 흔들었다');
    if (SYS.game.swapHeroes(g, a, 'nobody').err !== 'missing') fail('없는 영웅과의 맞바꾸기가 통과했다');
    if (ids() !== JSON.stringify(want)) fail('거절된 맞바꾸기가 순서를 건드렸다');
    return `${order.length}명 · 첫 ↔ 끝 · 파티 · 진형 불변 · missing`;
});
/**
 * **파티까지 찬 새 게임** — 2026-09-21(ADR-0227)부터 `newGame` 이 **편성 1 을 로스터 순서로 채운다**.
 * 이름은 그대로 둔다 — 부르는 자리가 「편성이 끝난 게임」을 전제한다는 뜻이 이름에 남아 있다.
 * ⚠ 여기서 `toggleParty` 를 또 부르면 **빼기로 뒤집힌다**.
 * **다 지은 판이다** [2026-09-22 · R137 — 공유 판 `freshG` 와 같은 까닭] — 부르는 자리가 편성 여럿 · 물약 칸 · 전술 칸을 쓴다
 */
const newGameP = (...args) => openAll(SYS.game.newGame(...args));
/*
 * 표본용 약한 몬스터 [2026-09-22] — 몬스터 데미지 전역 배율만 1/5 로 낮춘 시스템. 메커니즘 단정(처치 · 반격 · 재생)이 모으는
 *   「파티가 몇 대는 버틴다」는 표본 조건을 밸런스 값에 기대지 않게 한다 — 같은 날 배율이 0.2 → 1 이 되자 세 단정의 표본이 0 이 됐다
 */
const SOFT = buildSystems({ ...D, balance: { ...B, monster_atk_scale: B.monster_atk_scale / 5 } });
// 09-10 장착 개방 뒤에도 **시작 무기만은** 제 직업 무기다 — 첫 무기 칸에 제 직업 스킬이 서야 직업이 읽힌다(item.js startingWeapon)
check('newGame: 시작 파티 3명은 각자 제 직업 무기와 일반 갑옷으로 시작하고, 고블린 일꾼은 로스터에 대기한다', () => {
    if (G.heroes.length !== 4 || SYS.game.partyOf(G).length !== 3) fail('count');
    for (const h of G.heroes.slice(0, B.party_size_max)) {
        const w = G.items[h.equipped.weapon];
        if (!w || w.slot !== 'weapon' || !WG[w.group]?.classes.includes(h.cls)) fail(`weapon ${h.cls} ${w?.group}`);
        const a = G.items[h.equipped.armor];
        if (!a || a.slot !== 'armor') fail(`armor ${h.cls} ${a?.slot}`);
        if (w.rarity !== 'normal' || a.rarity !== 'normal') fail(`시작 장비 등급 ${w.rarity} · ${a.rarity} — 일반이어야 한다 (hero_design §1 · 2026-09-14)`);
        if (w.skill && w.skill === h.innate) fail(`${h.cls} 무기 스킬 ${w.skill} 이 고유 스킬과 겹친다`);
        if (Object.keys(h.equipped).length !== D.equipSlots.length || !('ring1' in h.equipped) || !('ring2' in h.equipped)) fail('positions');
    }
    return G.bag.length === 0 && G.resources.gold === B.start_gold;
});
check('newGame: 모든 플레이어에게 고블린 일꾼 1명 — 고정 이름·초상·능력치 5 · 편성 밖', () => {
    const g = SYS.game.newGame(99, cands, NOW);
    const butlers = g.heroes.filter(h => h.face === 'goblin_butler');
    if (butlers.length !== 1) fail(`고블린 일꾼 ${butlers.length}명`);
    const h = butlers[0];
    if (h.name.ko !== '고블린 일꾼' || h.name.en !== 'Goblin Worker') fail('이름');
    if (!Object.values(h.stats).every(v => v === 5) || Object.keys(h.stats).length !== D.heroAttributes.length) fail('능력치');
    if (SYS.game.partyOf(g).includes(h.uid)) fail('처음부터 전투 파티에 들어 있다');
    if (M.heroFace(h) !== `${M.faceDir()}hero/goblin_butler.webp`) fail('초상 연결');
    const loaded = SYS.game.deserialize(SYS.game.serialize(g, NOW));
    if (loaded.heroes.filter(x => x.face === h.face).length !== 1) fail('저장 후 일꾼 수');
    const old = SYS.game.serialize(g, NOW);
    old.heroes.find(x => x.face === h.face).name = { ko: '집사 고블린', en: 'Goblin Butler' };
    if (SYS.game.deserialize(old).heroes.find(x => x.face === h.face).name.ko !== '고블린 일꾼') fail('옛 세이브 이름');
    return `로스터 ${g.heroes.length}명 · 집사 ${h.uid} · 능력치 모두 5`;
});
check('newGame: 시작 무기 스킬은 고유 스킬을 뺀 풀에서 굴린다 — 시드 200 에서 한 번도 안 겹친다 · 빼도 rng 소비는 같다 (R86)', () => {
    let n = 0;
    for (let s = 1; s <= 200; s++) {
        const g = SYS.game.newGame(s, SYS.hero.rollStartParty(makeRng(5000 + s), 3), NOW);
        for (const h of g.heroes.slice(0, B.party_size_max)) { const w = g.items[h.equipped.weapon]; n++; if (w.skill === h.innate) fail(`시드 ${s} ${h.cls} ${w.skill} — 고유와 겹쳤다`); }
    }
    // 뺀 스킬만 달라지고 나머지 굴림은 같은 자리를 소비한다 — 뒤에 굴리는 갑옷이 흔들리지 않는다
    const a = SYS.item.startingWeapon(makeRng(9), 'warrior'), b = SYS.item.startingWeapon(makeRng(9), 'warrior', a.skill);
    if (b.skill === a.skill) fail('avoidSkill 이 안 먹는다');
    if (!eq({ ...a, skill: null }, { ...b, skill: null })) fail('avoidSkill 이 스킬 밖의 굴림을 바꿨다');
    const ra = makeRng(9), rb = makeRng(9);
    SYS.item.startingWeapon(ra, 'warrior'); SYS.item.startingWeapon(rb, 'warrior', a.skill);
    if (ra() !== rb()) fail('avoidSkill 이 rng 소비 수를 바꿨다');
    return `영웅 ${n}명 · 겹침 0`;
});
check('newGame: 마이너 힐링 포션을 갖고 시작한다 — 재고 = potion.csv:start_owned 개수 · 편성 1 의 칸에 한 칸씩 · 나머지 칸과 다른 편성은 빈다 (item_design §7-4 · R103 · R124)', () => {
    const start = D.potions.filter(p => p.startOwned > 0);
    if (!start.length) fail('start_owned 행이 없다');
    const g = SYS.game.newGame(1, cands, NOW);
    const want = Object.fromEntries(start.map(p => [p.id, p.startOwned]));
    if (!eq(g.potions, want)) fail(`재고 ${JSON.stringify(g.potions)} ≠ ${JSON.stringify(want)}`);
    const ps = SYS.game.presetState(g);
    const first = Array.from({ length: B.potion_slot_max }, (_, i) => start[i]?.id ?? null);
    if (!eq(ps.presets[0].potionSlots.map(s => s?.id ?? null), first)) fail(`편성 1 칸 ${JSON.stringify(ps.presets[0].potionSlots)}`);
    if (ps.presets[0].potionSlots.some(s => s?.short)) fail('시작 칸이 모자람이다');
    for (const p of ps.presets.slice(1)) if (p.potionSlots.some(Boolean)) fail(`편성 ${p.no} 칸이 안 비었다`);
    if (ps.presets.slice(1).some(p => p.party.length)) fail('편성 2 부터가 안 비었다 — 시작 영웅은 편성 1 에만 든다 (ADR-0227)');
    return `${start.map(p => `${p.en} ×${p.startOwned}`).join(' · ')} · 편성 1 칸 ${first.filter(Boolean).length} / ${ps.slotMax} · 편성 ${ps.count}`;
});
check('hero: 얼굴 id 는 태어날 때 1회 굴려 박힌다 — **제 직업 풀**(`<cls>_<k>`) 또는 null(풀 0장) · 파티 안에서 안 겹침 · 같은 시드면 같은 얼굴', () => {
    const n = D.balance.party_size_max;
    const party = SYS.hero.rollStartParty(makeRng(1234), n);
    if (party.length !== n) fail(`인원 ${party.length}`);
    // 얼굴은 제 직업 풀에서 나온다 — 풀이 0장인 직업(확장 직업)만 null 이다 (2026-09-07 · 본편 5직업은 전부 1장 이상)
    for (const h of party)
        if (h.face !== null && !(typeof h.face === 'string' && h.face.startsWith(h.cls + '_')))
            fail(`얼굴 id 가 직업과 안 맞는다 (${h.cls} → ${h.face})`);
    // 파티 안 직업이 서로 다르므로 얼굴 겹침은 자동으로 회피된다 — null 은 「초상 없음」이라 겹침 검사에서 뺀다
    const fs = party.map(h => h.face).filter(f => f !== null);
    if (new Set(fs).size !== fs.length) fail(`파티 안에서 얼굴이 겹쳤다 ${fs.join(',')}`);
    const again = SYS.hero.rollStartParty(makeRng(1234), n);
    if (!eq(party.map(h => h.face), again.map(h => h.face))) fail('같은 시드인데 얼굴이 다르다');
    return party.map(h => h.face).join(' · ');
});
check('save: serialize → deserialize 왕복 동일 (v22)', () => {
    const s = SYS.game.serialize(G, NOW);
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(s)));
    return eq(SYS.game.serialize(back, NOW), s) && s.version === SAVE_VERSION && SAVE_VERSION === 38;
});
/**
 * v18 → v19 (2026-09-09 — 처치는 가루를 안 뱉는다 · R63 · item_design §5-3).
 * 리포트의 가루 칸은 걷고, **이미 번 가루는 안 건드린다** — 공급원이 분해 하나로 줄었을 뿐이다.
 */
/* ── 진형 (battle_design §3-1 확정 2026-09-09 · 부채 #37 해소) ── */
/**
 * 「앞에 있는 유닛부터 때린다」의 **뼈대 셋** — 자리가 정해지는 규칙 · 전투가 그 자리를 읽는 것 · 하드 게이트.
 * 이 셋 중 하나라도 되돌아가면 진형은 다시 그림이 된다.
 */
check('formation: 파티 순서대로 전열부터 찬다 · 템플릿이 정원을 정한다 (진형 2026-09-09)', () => {
    const G2 = newGameP(31, cands, NOW);
    // 기본 템플릿 = 표의 첫 행 = 일자(모두 전열) — 새 편성은 셋이 한 줄에 선다 (2026-09-21 사용자 지시 · id `3` 은 CSV 로더가 숫자로 읽는다)
    const f0 = SYS.game.formationState(G2);
    if (f0.tpl !== f0.templates[0] || String(f0.tpl) !== '3') fail(`기본 템플릿 ${f0.tpl} (첫 행 ${f0.templates[0]})`);
    if (!eq(f0.ranks[0], SYS.game.partyOf(G2)) || f0.ranks[1].length) fail(`일자 ${f0.ranks[0]} / ${f0.ranks[1]}`);
    if (!SYS.game.setFormation(G2, '2-1').ok) fail('setFormation 2-1');
    const f = SYS.game.formationState(G2);
    if (!eq(f.caps, [2, 1])) fail(`2-1 정원 ${f.caps}`);
    if (!eq(f.ranks[0], SYS.game.partyOf(G2).slice(0, 2))) fail(`전열 ${f.ranks[0]}`);
    if (!eq(f.ranks[1], SYS.game.partyOf(G2).slice(2, 3))) fail(`후열 ${f.ranks[1]}`);
    // 템플릿을 바꾸면 정원이 갈리고 재배치가 따라온다
    if (!SYS.game.setFormation(G2, '1-2').ok) fail('setFormation 1-2');
    const g = SYS.game.formationState(G2);
    if (!eq(g.caps, [1, 2])) fail(`1-2 정원 ${g.caps}`);
    if (g.ranks[0].length !== 1 || g.ranks[1].length !== 2) fail(`재배치 ${g.ranks[0].length}/${g.ranks[1].length}`);
    // 모두 전열 — 후열이 없다
    SYS.game.setFormation(G2, '3');
    if (SYS.game.formationState(G2).ranks[1].length !== 0) fail('템플릿 3 에 후열이 남았다');
    // 모두 후열 — 전열이 없다 [2026-09-21 사용자 지시] · 전원이 후열(1)이고 전열 칸으로는 못 옮긴다(정원 0)
    if (!SYS.game.setFormation(G2, '0-3').ok) fail('setFormation 0-3');
    const b = SYS.game.formationState(G2);
    if (b.ranks[0].length || !eq(b.ranks[1], SYS.game.partyOf(G2))) fail(`모두 후열 ${b.ranks[0]} / ${b.ranks[1]}`);
    if (SYS.game.partyOf(G2).some(uid => SYS.game.rankOf(G2, uid) !== 1)) fail('모두 후열인데 전열(0)인 영웅이 있다');
    if (SYS.game.placeFormation(G2, SYS.game.partyOf(G2)[0], 0, 0).err !== 'missing') fail('정원 0 인 전열로 옮겨졌다');
    SYS.game.setFormation(G2, '3');
    if (SYS.game.setFormation(G2, 'nope').err !== 'missing') fail('없는 템플릿이 통과했다');
    return '기본 3(일자) → 2-1 → 1-2 → 3 · 0-3(모두 후열) 재배치';
});
check('formation: 전투 유닛이 자리를 들고 간다 — partyUnits.rank (진형 2026-09-09)', () => {
    const G2 = newGameP(32, cands, NOW);
    SYS.game.setFormation(G2, '2-1');
    const ranks = SYS.game.partyOf(G2).map(uid => SYS.game.rankOf(G2, uid));
    if (!eq(ranks, [0, 0, 1])) fail(`rank ${ranks}`);
    // 자리를 바꾸면 유닛이 든 값도 바뀐다 — 화면 상태가 아니라 세이브가 답이다
    const back = SYS.game.formationState(G2).ranks[1][0];
    if (!SYS.game.placeFormation(G2, back, 0).ok) fail('placeFormation');
    if (SYS.game.rankOf(G2, back) !== 0) fail('옮긴 영웅이 전열이 아니다');
    // 세이브를 한 바퀴 돌려도 자리가 남는다 (v20 — 종전엔 화면 상태라 새로고침에 사라졌다)
    const back2 = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(G2, NOW))));
    if (SYS.game.rankOf(back2, back) !== 0) fail('세이브 왕복에서 자리가 사라졌다');
    return `rank ${ranks} · 왕복 보존`;
});
check('formation: 칸을 주면 그 칸의 주인과 맞바꾼다 — 같은 랭크 안에서도 (편성 드래그 2026-09-11)', () => {
    const G2 = newGameP(34, cands, NOW);
    SYS.game.setFormation(G2, '2-1');
    const ranksOf = () => SYS.game.formationState(G2).ranks;
    const [[a, b], [c]] = ranksOf();
    // 다른 랭크 — 후열이 전열 **첫 칸**으로. 칸을 안 받던 판은 전열 **마지막**(b)과 바뀌었다
    const r = SYS.game.placeFormation(G2, c, 0, 0);
    if (!r.ok || r.swapped !== a) fail(`다른 랭크 swapped=${r.swapped} (기대 ${a})`);
    if (!eq(ranksOf(), [[c, b], [a]])) fail(`다른 랭크 ${JSON.stringify(ranksOf())}`);
    // 같은 랭크 — 칸을 안 받던 판은 아무 일도 없었다
    SYS.game.placeFormation(G2, b, 0, 0);
    if (!eq(ranksOf(), [[b, c], [a]])) fail(`같은 랭크 ${JSON.stringify(ranksOf())}`);
    // 빈 칸 — 한 명이 빠지면 그 랭크 끝이 빈다. 거기로 옮기면 끝에 선다
    SYS.game.toggleParty(G2, c, NOW);
    if (!SYS.game.placeFormation(G2, a, 0, 1).ok || !eq(ranksOf(), [[b, a], []])) fail(`빈 칸 ${JSON.stringify(ranksOf())}`);
    // 정원 밖 칸은 거절 — 2-1 의 후열 정원은 하나다
    if (SYS.game.placeFormation(G2, a, 1, 1).err !== 'missing') fail('정원 밖 칸이 통과했다');
    return '다른 랭크 · 같은 랭크 · 빈 칸 · 정원 밖 칸';
});
/**
 * 진형·도발을 **무시하는 정상 경로** 셋의 창을 타임라인에서 추적한다 (battle_design §3-1 · skill_design §12-4 · R79):
 *   `attack_splash`(평타가 광역이 된다 — `s` 가 안 선다) · `duel`(지목된 적은 지목자를 친다) · `taunt`(도발자를 친다).
 *   창은 스킬 id 로 들고(`buffEnd` 가 stat 을 안 싣는다) · **적 쪽 창은 라운드가 바뀌면 지운다** — 키(e0…)가 다음 라운드에 다른 몬스터로 재사용된다.
 *   R79 로 몬스터가 스킬을 쓰게 되어 적 궁수의 `arc_pierce` 같은 창이 생겼다 — 이것을 모르면 정상 광역 평타가 위반으로 잡힌다
 */
function windowTracker() {
    const open = new Map();                     // key → Map(stat → Set(skillId))
    const statOf = new Map();                   // `${key}|${skillId}` → stat
    const WATCH = ['attack_splash', 'duel', 'taunt'];
    return {
        feed(ev) {
            if (ev.e === 'round') { for (const k of [...open.keys()]) if (k.startsWith('e')) open.delete(k); return; }
            if (ev.e === 'buff' && WATCH.includes(ev.stat)) {
                if (!open.has(ev.u)) open.set(ev.u, new Map());
                const m = open.get(ev.u);
                if (!m.has(ev.stat)) m.set(ev.stat, new Set());
                m.get(ev.stat).add(ev.s);
                statOf.set(`${ev.u}|${ev.s}`, ev.stat);
                return;
            }
            if (ev.e === 'buffEnd') { const st = statOf.get(`${ev.u}|${ev.s}`); if (st) open.get(ev.u)?.get(st)?.delete(ev.s); return; }
            if (ev.e === 'down') open.delete(ev.u);
        },
        has: (k, st) => (open.get(k)?.get(st)?.size ?? 0) > 0,
    };
}
check('formation: 전열이 살아 있으면 기본 공격은 후열을 안 때린다 — 하드 게이트 · 광역 스킬은 밖 (battle_design §3-1 · R79)', () => {
    const G2 = newGameP(33, cands, NOW);
    SYS.game.setFormation(G2, '2-1');
    const backUid = SYS.game.formationState(G2).ranks[1][0];
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(`resolveBattle ${r.err}`);
    // 후열 영웅이 맞은 시점마다, 그 직전까지 전열이 하나라도 살아 있었으면 계약 위반이다
    const idxOf = uid => SYS.game.partyOf(G2).indexOf(uid);
    const frontKeys = SYS.game.formationState(G2).ranks[0].map(u => `p${idxOf(u)}`);
    const backKey = `p${idxOf(backUid)}`;
    /*
     * ⚠ **전투불능은 라운드를 넘어 유지된다** — 「라운드 사이 회복 없음」(battle.js 머리말 · base_expedition §1-1).
     *   ~~라운드마다 전열을 산 것으로 되돌리던 판정~~ 은 **단정의 버그**였다 — 앞 라운드에서 쓰러진 전열을 산 것으로 쳐서
     *   전열이 이미 전멸해 후열이 **정당하게** 맞는 판을 위반으로 잡았다(R72~R78 에 수열 따라 켜졌다 꺼지던 원인 · 2026-09-11).
     *   대조용으로 옛 판정(`stale`)도 같이 세어 둔다 — 새 판정이 0 이고 옛 판정만 잡는다면 원인이 이것이라는 증거다.
     */
    const alive = {}, stale = {};
    const wins = [];     // 실패 때 원인을 읽으려는 창 사건 — 지목(결투)·도발·평타 부여는 진형을 무시하는 정상 경로다 (battle_design §3-1)
    const tr = windowTracker();
    let oldBad = 0, crossed = 0, exempt = 0;
    for (const ev of r.result.timeline) {
        tr.feed(ev);
        if (ev.e === 'buff' || ev.e === 'buffEnd' || ev.e === 'skill') wins.push(ev);
        if (ev.e === 'round') {
            for (const k of [...frontKeys, backKey]) {
                if (alive[k] === undefined) alive[k] = 1;
                else if (alive[k] === 0 && frontKeys.includes(k)) crossed++;
                stale[k] = 1;
            }
            continue;
        }
        if (ev.e === 'down') {
            if (alive[ev.u] !== undefined) alive[ev.u] = 0;
            if (stale[ev.u] !== undefined) stale[ev.u] = 0;
        }
        if (ev.e !== 'hit' || ev.d !== backKey) continue;   // `d` = 맞은 쪽
        // 게이트는 **단일 대상 선택**의 규칙이다 — 스킬 타격(`s` 가 선다)은 광역일 수 있어 뺀다.
        //   R79 로 몬스터가 스킬 칸을 갖게 되어 적 광역 스킬이 후열에 닿는 것이 **정상**이 됐다 (INTERFACE §5-2 battle.act 스킬)
        if (ev.s !== undefined) continue;
        // 광역 평타 · 지목 · 후열 도발자는 진형을 무시한다 — 위반이 아니다
        if (tr.has(ev.a, 'attack_splash') || tr.has(ev.a, 'duel') || tr.has(backKey, 'taunt')) { exempt++; continue; }
        if (frontKeys.some(k => stale[k] === 1)) oldBad++;
        if (frontKeys.some(k => alive[k] === 1)) {
            const near = wins.filter(w => w.t >= ev.t - 20 && w.t <= ev.t && (w.u === backKey || w.u === ev.a))
                .slice(-8).map(w => `${w.t}:${w.e}:${w.u}:${w.s ?? ''}${w.stat ? `/${w.stat}` : ''}${w.by ? `@${w.by}` : ''}`).join(' ');
            fail(`전열이 살아 있는데 후열(${backKey})이 맞았다 — t=${ev.t} ${ev.a}→${backKey} · 가까운 창 [${near}]`);
        }
    }
    return `후열 기본 공격 피격은 전열 전멸 뒤에만 · 옛 판정이면 위반 ${oldBad}건 · 쓰러진 전열이 라운드를 넘은 횟수 ${crossed} · 창 예외 ${exempt}`;
});
/**
 * 리포트 목록의 상한 — [balance.csv:report_keep] (R68).
 * **회귀 그물**: 상한을 넘겨 돌려 보고 **최신이 맨 앞**이며 **오래된 것부터 밀려나는지**를 본다.
 * 반복 원정이 밤새 돌면 이 두 규칙이 세이브 크기를 정한다.
 */
check('resolveBattle: 리포트는 목록에 쌓이고 상한을 넘으면 오래된 것부터 밀려난다 (R68)', () => {
    const keep = D.balance.report_keep;
    if (!(keep >= 1)) fail('balance.csv:report_keep 이 없다');
    const G2 = newGameP(4242, cands, NOW);
    for (let i = 0; i < keep + 3; i++) {
        const r = SYS.game.resolveBattle(G2, 101, NOW + i * 1000);
        if (!r.ok) fail(`resolveBattle #${i} ${r.err}`);
    }
    if (G2.reports.length !== keep) fail(`상한을 안 지킨다 — ${G2.reports.length} / ${keep}`);
    if (G2.reports[0].at !== NOW + (keep + 2) * 1000) fail('최신이 맨 앞이 아니다');
    for (let i = 1; i < G2.reports.length; i++) {
        if (!(G2.reports[i].at < G2.reports[i - 1].at)) fail(`목록 순서가 최신 → 과거가 아니다 (${i})`);
    }
    return `${keep + 3}판 → ${keep}칸 · 최신이 앞`;
});
/**
 * 처치는 가루를 안 뱉는다 (2026-09-09 확정 · item_design §5-3 · R63).
 * **회귀 그물** — 정예·보스가 도는 전투를 한 판 돌려 결과·리포트 어디에도 가루 칸이 없고
 * 보유 가루가 한 톨도 안 는 것을 본다. 옛 규칙이 되살아나면 여기서 빨간불이 뜬다.
 */
check('battle: 처치가 가루를 안 뱉는다 — 결과·리포트에 칸이 없고 보유량이 그대로 (R63)', () => {
    const G2 = SOFT.game.newGame(1234, cands, NOW);    // 처치 표본 — 약한 몬스터(SOFT)
    const before = G2.resources.dust;
    const r = SOFT.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(`resolveBattle ${r.err}`);
    if (r.result.dust !== undefined) fail(`결과에 dust 가 남아 있다 — ${r.result.dust}`);
    if (r.report.dust !== undefined) fail(`리포트에 dust 가 남아 있다 — ${r.report.dust}`);
    if (G2.resources.dust !== before) fail(`처치로 가루가 늘었다 — ${before} → ${G2.resources.dust}`);
    const kills = Object.values(r.result.kills).reduce((a, b) => a + b, 0);
    if (!kills) fail('처치가 0이라 검사가 성립하지 않는다');
    return `처치 ${kills} · 가루 ${before} 그대로`;
});
check('save: v38 만 연다 — v1 · v36 · v37 · v99 는 던진다 · 모양이 멀쩡한 세이브도 버전이 다르면 던진다 (INTERFACE §4 「v38 에서 또 끊었다」 · 다부대)', () => {
    const cur = SYS.game.serialize(G, NOW);
    for (const v of [1, 36, 37, 99]) {
        const s = JSON.parse(JSON.stringify(cur)); s.version = v;
        try { SYS.game.deserialize(s); fail(`v${v} accepted`); } catch (e) { if (e instanceof Fail) throw e; }
    }
    return `v${SAVE_VERSION} 만 연다 · v1 · v36 · v37 · v99 거부`;
});
check('save: canLoad 가 deserialize 와 같은 답을 낸다 — 지금 버전은 열고 v38 전은 막는다 (부채 #24 · R139 · ADR-0303 · 다부대)', () => {
    const cur = SYS.game.serialize(G, NOW);
    if (!SYS.game.canLoad(JSON.parse(JSON.stringify(cur)))) fail(`v${SAVE_VERSION} 를 못 연다 — deserialize 는 여는데 canLoad 가 막는다`);
    // 시작 화면이 [이어하기] 를 숨기고 「이전 형식」 한 줄을 세우는 근거 — 버전 숫자만 낮춘 세이브로 확인한다
    for (const v of [1, 36, 37, 99]) {
        const s = JSON.parse(JSON.stringify(cur)); s.version = v;
        if (SYS.game.canLoad(s)) fail(`v${v} 를 연다고 답했다`);
    }
    if (SYS.game.canLoad(null) || SYS.game.canLoad('x')) fail('객체가 아닌 것을 연다고 답했다');
    return `v${SAVE_VERSION} 열림 · v1 · v36 · v37 · v99 거부`;
});
check('save: 크기 < 64KB (빈 게임)', () => { const n = JSON.stringify(SYS.game.serialize(G, NOW)).length; return n < 65536 ? `${n} bytes` : fail(`${n} bytes`); });

/* ── 성장 ── */
check('xp: 필요량 단조 증가', () => { for (let l = 1; l < 30; l++) if (SYS.hero.xpNeeded(l + 1) <= SYS.hero.xpNeeded(l)) return false; return true; });
check('xp: 레벨 상한 hero_level_cap 에서 멈추고 XP 를 더 쌓지 않는다 (GAME_DESIGN §9 08-26 · R12)', () => {
    const h = JSON.parse(JSON.stringify(G.heroes[0]));
    SYS.hero.grantXp(h, 1e12, makeRng(3));
    if (h.level !== B.hero_level_cap) fail(`Lv ${h.level} ≠ ${B.hero_level_cap}`);
    if (h.xp !== 0) fail(`상한에서 xp ${h.xp} 가 남았다`);
    // 상한에 닿은 뒤의 지급은 아무 일도 하지 않는다 — 레벨업 결과도 null
    if (SYS.hero.grantXp(h, 1e9, makeRng(4)) !== null || h.xp !== 0) fail('상한 뒤에도 XP 가 쌓인다');
    return `Lv ${B.hero_level_cap} 에서 정지`;
});
check('xp: 레벨업해도 기본 능력치는 안 바뀐다 — gains 는 비고 rng 를 안 쓴다 (hero_design §4-3 · 2026-09-14 · R83)', () => {
    const h = JSON.parse(JSON.stringify(G.heroes[0]));
    const before = { ...h.stats };
    const base = makeRng(3);
    let calls = 0;
    const lu = SYS.hero.grantXp(h, 100000, () => { calls += 1; return base(); });
    if (!(lu && lu.to > lu.from && h.level > 5)) fail('no levelup');
    if (!eq(h.stats, before)) fail(`능력치가 바뀌었다 ${JSON.stringify(before)} → ${JSON.stringify(h.stats)}`);
    if (Object.keys(lu.gains).length !== 0) fail(`gains ${JSON.stringify(lu.gains)}`);
    if (calls !== 0) fail(`rng ${calls}회 소비`);
    return `Lv ${lu.from}→${lu.to} · 능력치 불변 · rng 0회`;
});

/* ── 마스터리 (skill_design §3-1~§3-4 확정 2026-08-28) ── */
/**
 * 마스터리 개편 (2026-09-22 사용자 확정 · R138) — 죄종 T2 7 × 3 이 다 찼고(빈칸 채움 · 나태 · 폭식 · 오만 교체),
 * 직업 T1 마법사 · 사제 · 궁수가 바뀌었고, 직업 T2 는 **낀 장비가 켜는 세 칸**이다 — T2-1 · T2-2 = 5직업 공통(든 무기군) ·
 * T2-3 = 갑옷 마스터리(직업별 · 갑옷 칸의 갑옷군). 옛 T2-3 넷(방어 무시 · 반사 · 저항 감소 · 마법 데미지)은 걷혔다.
 */
check('csv: mastery_node 46행 — 죄종 T1 공통 3 + 죄종 T2 21(7×3) + 직업 T1 15(5×3) + 직업 T2 7(공통 2 + 갑옷 5). T3(반응형)는 아직 없다', () => {
    if (D.masteryNodes.length !== 46) fail(`${D.masteryNodes.length}행`);
    const by = {};
    for (const n of D.masteryNodes) { const k = `${n.tree_kind}${n.tier}`; by[k] = (by[k] ?? 0) + 1; }
    if (by.sin1 !== 3 || by.sin2 !== 21 || by.class1 !== 15 || by.class2 !== 7) fail(JSON.stringify(by));
    for (const sin of Object.keys(M.SINS)) {
        const t2 = D.masteryNodes.filter(n => n.tree_kind === 'sin' && n.owner_id === sin && n.tier === 2);
        if (t2.length !== 3) fail(`${sin} 죄종 T2 ${t2.length}개`);
    }
    // 직업 T1 표 (skill_design §3-4 · 09-22) — 칸 순서가 곧 화면 순서다
    const T1 = {
        warrior: 'hp_pct,res_all,atk_pct', knight: 'hp_pct,def_flat,damage_reduction',
        mage: 'aspd_pct,cooldown_reduction,crushing_blow_pct', priest: 'aspd_pct,cooldown_reduction,buff_dur_pct',
        archer: 'aspd_pct,crit_rate,hit_bonus',
    };
    for (const [cls, want] of Object.entries(T1)) {
        const got = D.masteryNodes.filter(n => n.tree_kind === 'class' && n.owner_id === cls && n.tier === 1).map(n => n.stat).join();
        if (got !== want) fail(`${cls} 직업 T1 ${got} ≠ ${want}`);
    }
    // 직업 T2 는 전부 게이트가 있다 — 「T2 세 칸이 전부 든 장비가 켠다」(§3-5)
    const c2 = D.masteryNodes.filter(n => n.tree_kind === 'class' && n.tier === 2);
    if (c2.some(n => !n.requires || n.requires === '-')) fail('게이트 없는 직업 T2 가 있다');
    if (D.masteryNodes.some(n => !(n.tree_kind === 'class' && n.tier === 2) && n.requires !== '-')) fail('직업 T2 밖에 게이트가 있다');
    // 치명 배수 예외는 분노 하나다 (skill_design §3 · 09-22)
    const cd = D.masteryNodes.filter(n => n.stat === 'crit_damage').map(n => n.node_id);
    if (cd.join() !== 'sin_wrath_t2_critdamage') fail(`치명 피해 노드 ${cd.join()}`);
    // T3 는 전투 중 사건에 붙는 반응형이라 hero.js 가 아니라 battle.js 의 몫 — 값도 전부 미정이다
    if (D.masteryNodes.some(n => n.tier === 3)) fail('T3 가 CSV 에 들어왔다 — 구현 없이 두면 읽히지 않는 SSOT 가 된다');
    return `죄종 T1 ${by.sin1} · 죄종 T2 ${by.sin2} · 직업 T1 ${by.class1} · 직업 T2 ${by.class2}`;
});
check('mastery: 직업 T2 는 낀 장비가 켠다 — 든 무기군 · 갑옷 칸의 갑옷군 · 랭크가 있어도 안 맞으면 0 (skill_design §3-5 · §3-6 · R138)', () => {
    const r = B.mastery_t1_max_rank;
    const base = { ...G.heroes[0], sin: 'wrath', cls: 'warrior', level: B.mastery_t2_unlock_level };
    const h = { ...base, mastery: { cls_t2_weapon_damage: r, cls_t2_weapon_atkspeed: r, cls_warrior_t2_heavy: r } };
    const wpn = g => ({ ...mkItem('weapon', []), group: g });
    const arm = g => ({ ...mkItem('armor', []), group: g });
    const pct = (items, hh = h) => SYS.hero.computeCombat(hh, items).atk_pct_sum;
    const per = (items, hh = h) => SYS.hero.computeCombat(hh, items).action_period;
    // 빠른 무기(둔기)는 T2-1 만 · 느린 무기(도끼)는 T2-2 만
    if (!(pct([wpn('mace')]) > pct([wpn('mace')], { ...base, mastery: {} }))) fail('둔기인데 데미지 % 가 안 켜졌다');
    if (pct([wpn('axe')]) !== pct([wpn('axe')], { ...base, mastery: {} })) fail('도끼인데 데미지 % 가 켜졌다');
    if (!(per([wpn('axe')]) < per([wpn('axe')], { ...base, mastery: { cls_t2_weapon_damage: r } }))) fail('도끼인데 공속이 안 켜졌다');
    // 중갑 마스터리 — 갑옷 칸이 중갑일 때만 · 로브면 꺼진다
    const heavyOn = per([arm('heavy')]), heavyOff = per([arm('heavy')], { ...h, mastery: { cls_t2_weapon_damage: r, cls_t2_weapon_atkspeed: r } });
    if (!(heavyOn < heavyOff)) fail(`중갑인데 공속이 안 켜졌다 ${heavyOn} / ${heavyOff}`);
    if (per([arm('robe')]) !== per([arm('robe')], { ...h, mastery: { cls_t2_weapon_damage: r, cls_t2_weapon_atkspeed: r } })) fail('로브인데 중갑 마스터리가 켜졌다');
    // 맨몸이면 게이트 셋 다 꺼진다 — 랭크 0 과 같다
    if (!eq(SYS.hero.computeCombat(h, []), SYS.hero.computeCombat({ ...base, mastery: {} }, []))) fail('맨몸인데 게이트 노드가 먹었다');
    // 화면 상태 — `gate` · `on` 을 싣는다 (INTERFACE §2)
    const G2 = newGameP(31, cands, NOW);
    const h2 = G2.heroes[0];
    const ms = SYS.game.masteryState(G2, h2.uid);
    const gated = ms.nodes.filter(n => n.gate);
    if (gated.length !== 3) fail(`게이트 칸 ${gated.length}`);
    if (ms.nodes.some(n => !n.gate && n.on !== true)) fail('게이트 없는 칸이 꺼져 있다');
    const wg = SYS.game.heroItems(G2, h2).find(it => it.slot === 'weapon')?.group;
    const onW = gated.filter(n => n.gate.slot === 'weapon' && n.on).length;
    if (wg && onW !== 1) fail(`무기(${wg})가 켠 칸 ${onW} — 무기 T2 둘 중 정확히 하나여야 한다`);
    return `둔기 → T2-1 · 도끼 → T2-2 · 중갑 → 중갑 마스터리 · 맨몸 0 · ${h2.cls} 시작 무기 ${wg ?? '없음'} → 무기 칸 ${onW} 켜짐`;
});
check('mastery: 세이브를 열 때 표에 맞춘다 — 걷힌 노드 · 상한 초과 랭크는 포인트로 돌아온다 (R138 · 버전 무변경)', () => {
    const G2 = newGameP(32, cands, NOW);
    const h = G2.heroes[0];
    h.masteryPoints = 2;
    h.mastery = { sin_t1_hp: B.mastery_t1_max_rank + 2, gone_node: 3, sin_t1_damage: 1 };
    const back = SYS.game.deserialize(SYS.game.serialize(G2, NOW)).heroes[0];
    if (back.masteryPoints !== 2 + 2 + 3) fail(`포인트 ${back.masteryPoints} ≠ 7`);
    if (!eq(back.mastery, { sin_t1_hp: B.mastery_t1_max_rank, sin_t1_damage: 1 })) fail(JSON.stringify(back.mastery));
    return '초과 2 + 걷힌 칸 3 → +5p · 남은 랭크는 그대로';
});
check('formula: 명중률은 레벨 차 적중률에 더하고 기준을 넘지 않는다 — 0 이면 종전과 같다 (battle_design §9-4 · R138)', () => {
    const d = B.hit_per_level_deficit_pct;
    if (F.hitChance(5, 8, 0) !== F.hitChance(5, 8)) fail('0 이 종전과 다르다');
    const want = Math.min(B.hit_base_pct, B.hit_base_pct - 3 * d + 0.1);
    if (Math.abs(F.hitChance(5, 8, 0.1) - want) > 1e-9) fail(`레벨 3 부족 + 10% = ${F.hitChance(5, 8, 0.1)} ≠ ${want}`);
    if (F.hitChance(10, 5, 0.5) !== B.hit_base_pct) fail('오버레벨에서 기준을 넘었다');
    if (F.hitChance(1, 99, 0.05) !== Math.min(B.hit_base_pct, B.hit_min_pct + 0.05)) fail('하한 위에 더하지 않았다');
    // 궁수 T1-3 이 전투 유닛까지 온다
    const r = B.mastery_t1_max_rank;
    const c = SYS.hero.computeCombat({ ...G.heroes[0], cls: 'archer', mastery: { cls_archer_t1_hitbonus: r } }, []);
    if (Math.abs((c.option_fx?.hitBonus ?? 0) - B.mastery_archer_t1_hitbonus_pct * r) > 1e-9) fail(`option_fx.hitBonus ${c.option_fx?.hitBonus}`);
    return `레벨 3 부족 ${M.pctNum(F.hitChance(5, 8))}% → +10% ${M.pctNum(F.hitChance(5, 8, 0.1))}% · 궁수 ${r}랭크 +${M.pctNum(c.option_fx.hitBonus)}%`;
});
check('mastery_node: 참조하는 balance 키가 전부 실재하고 stat 이 실재하는 채널이다 — 새 채널을 만들지 않는다', () => {
    // 접사 채널 = **장비 옵션 표 전부**(무기 옵션 둘 · 방어구 옵션 둘 · 장신구 옵션 둘) — 2026-09-18 aspd_pct 가 affix.csv 에서 방어구 표로 옮겨 갔다
    //   ⚠ `hp_pct`(체력 %)는 **2026-09-21 affix.csv 퇴역**으로 장비 옵션에서 사라졌지만 채널은 산다 — `hero.computeCombat` 이 읽고 마스터리 T1 이 쓴다. 이름으로 남긴다
    //   `hit_bonus`(명중률)는 **마스터리만 쓰는 채널**이다 — 궁수 T1-3 · `computeCombat` 이 `option_fx.hitBonus` 로 낸다(2026-09-22 R138)
    const affix = new Set([...D.weaponSinOptions, ...D.weaponCommonOptions, ...D.armorSinOptions, ...D.armorCommonOptions,
        ...D.accessorySinOptions, ...D.accessoryCommonOptions].map(d => d.stat).concat('hp_pct', 'hit_bonus'));
    const stats = new Set(D.combatStats.map(x => x.id));
    const sins = new Set(Object.keys(M.SINS));
    const classes = new Set(D.classes.map(c => c.id));
    for (const n of D.masteryNodes) {
        for (const k of ['value_key', 'max_rank_key'])
            if (typeof B[n[k]] !== 'number') fail(`${n.node_id} ${k}='${n[k]}' 가 balance.csv 에 없다`);
        if (n.unlock_key !== '-' && typeof B[n.unlock_key] !== 'number') fail(`${n.node_id} unlock_key='${n.unlock_key}'`);
        if (!affix.has(n.stat) && !stats.has(n.stat)) fail(`${n.node_id} stat '${n.stat}' 은 접사 채널도 전투 능력치도 아니다`);
        if (n.owner_id !== '*' && !(n.tree_kind === 'sin' ? sins : classes).has(n.owner_id)) fail(`${n.node_id} owner '${n.owner_id}'`);
    }
    return `키 ${new Set(D.masteryNodes.map(n => n.value_key)).size}종 · 채널 ${new Set(D.masteryNodes.map(n => n.stat)).size}종`;
});
check('mastery: 랭크 0 이면 전투 능력치가 그대로다 — 도입이 기존 결과를 안 건드린다 (회귀)', () => {
    const h = G.heroes[0];
    const items = SYS.game.heroItems(G, h);
    const empty = SYS.hero.computeCombat({ ...h, mastery: {} }, items);
    const absent = SYS.hero.computeCombat({ ...h, mastery: undefined }, items);
    if (!eq(empty, absent)) fail('mastery 없음 ≠ 빈 객체');
    if (empty.cooldown_reduction !== 0) fail(`쿨감소 ${empty.cooldown_reduction}`);
    // ⚠ **재생만 0 이 아니다** [개정 2026-09-07 — battle_design §8] — 「장비가 0이면 능력치도 0」의 유일한 예외로
    //   전 영웅이 레벨 곡선 밑수를 갖는다. 0 을 기대하면 R43 이 회귀로 잡힌다. ~~마지막에 건강 계수~~ 는 09-10 폐기(R72)
    const base = B.hp_regen_base_per_level * Math.pow(B.power_growth_per_level, Math.max(1, h.level) - 1);
    const want = Number(base.toFixed(3));
    if (empty.hp_regen !== want) fail(`재생 ${empty.hp_regen} ≠ 밑수 ${want}`);
    return `쿨감소 출처는 마스터리뿐이라 0 · 재생은 밑수 ${want} 가 남는다`;
});
check('mastery: 랭크를 찍으면 그 채널이 오른다 — T1 공통 3종은 죄종을 안 가린다', () => {
    const r = B.mastery_t1_max_rank;
    let moved = 0;
    for (const sin of Object.keys(M.SINS)) {
        const h = { ...G.heroes[0], sin, mastery: {} };
        const base = SYS.hero.computeCombat(h, []);
        const up = SYS.hero.computeCombat({ ...h, mastery: { sin_t1_hp: r, sin_t1_atkspeed: r, sin_t1_damage: r } }, []);
        if (!(up.hp_max > base.hp_max)) fail(`${sin} hp ${base.hp_max} → ${up.hp_max}`);
        if (!(up.action_period < base.action_period)) fail(`${sin} 주기 ${base.action_period} → ${up.action_period}`);
        if (!(up.atk_pct_sum > base.atk_pct_sum)) fail(`${sin} 상시% ${base.atk_pct_sum} → ${up.atk_pct_sum}`);
        moved += 1;
    }
    return `${moved} 죄종 전부 동일하게 반응`;
});
check('mastery: 남의 트리 노드는 안 붙는다 — 죄종·직업이 다르면 무시한다', () => {
    const h = { ...G.heroes[0], sin: 'wrath', cls: 'mage' };
    const dirty = SYS.hero.computeCombat({ ...h, mastery: { sin_pride_t2_dr: 5, cls_warrior_t1_hp: 5 } }, []);
    const clean = SYS.hero.computeCombat({ ...h, mastery: {} }, []);
    return eq(dirty, clean) ? '오만 T2 · 전사 T1 둘 다 무시' : fail('다른 죄종·직업 노드가 적용됐다');
});
check('mastery: 피해 감소는 원천별 곱이다 — 접사와 합치지 않는다 (battle_design §9-3)', () => {
    const r = B.mastery_t1_max_rank;
    const h = { ...G.heroes[0], sin: 'pride', mastery: { sin_pride_t2_dr: r } };
    const per = B.mastery_pride_t2_dr_pct * r;
    const only = SYS.hero.computeCombat(h, []);
    // 피해 감소는 비율이다 (R111) — 접사 10% = 0.1
    const want = Number((1 - (1 - per)).toFixed(5));
    if (Math.abs(only.damage_reduction - want) > 1e-6) fail(`단독 ${only.damage_reduction} ≠ ${want}`);
    const both = SYS.hero.computeCombat(h, [mkItem('armor', [{ stat: 'damage_reduction', v: 0.1 }])]);
    const wantBoth = Number((1 - (1 - per) * (1 - 0.1)).toFixed(5));
    if (Math.abs(both.damage_reduction - wantBoth) > 1e-6) fail(`합류 ${both.damage_reduction} ≠ ${wantBoth} (덧셈이면 ${(per + 0.1).toFixed(5)})`);
    return `마스터리 ${M.pctNum(only.damage_reduction)}% · 접사 합류 ${M.pctNum(both.damage_reduction)}%`;
});
check('mastery: 포인트 — 레벨업마다 지급 · 찍으면 1점 소비 · 롤백은 전액 환급 (skill_design §5)', () => {
    const G2 = newGameP(7, cands, NOW);
    const h = G2.heroes[0];
    if (h.masteryPoints !== 0) fail(`시작 포인트 ${h.masteryPoints}`);
    const lu = SYS.hero.grantXp(h, 100000, makeRng(3));
    const gained = (lu.to - lu.from) * B.mastery_point_per_level;
    if (h.masteryPoints !== gained) fail(`지급 ${h.masteryPoints} ≠ ${gained}`);
    if (lu.points !== gained) fail(`보고 ${lu.points} ≠ ${gained}`);
    const r = SYS.game.learnMastery(G2, h.uid, 'sin_t1_hp');
    if (!r.ok) fail(r.err);
    if (h.mastery.sin_t1_hp !== 1 || h.masteryPoints !== gained - 1) fail('소비가 안 맞는다');
    const back = SYS.game.resetMastery(G2, h.uid);
    if (!back.ok || back.refunded !== 1 || h.masteryPoints !== gained) fail(JSON.stringify(back));
    if (Object.keys(h.mastery).length !== 0) fail('롤백 뒤에도 랭크가 남았다');
    return `Lv ${lu.from}→${lu.to} · +${gained}p · 롤백 전액 환급`;
});
check('mastery: 거절 사유 — 해금 전 locked · 상한 maxRank · 포인트 없음 points · 남의 노드 missing', () => {
    const G2 = newGameP(8, cands, NOW);
    const h = G2.heroes.find(x => x.cls !== 'warrior') ?? G2.heroes[0];
    h.masteryPoints = 99;
    if (h.level >= B.mastery_t2_unlock_level) fail('레벨 1 전제가 깨졌다');
    const t2 = D.masteryNodes.find(n => n.tier === 2 && n.owner_id === h.sin);
    if (!t2) fail(`${h.sin} 의 T2 노드가 없다`);
    if (SYS.game.learnMastery(G2, h.uid, t2.node_id).err !== 'locked') fail('locked 아님');
    if (h.cls !== 'warrior' && SYS.game.learnMastery(G2, h.uid, 'cls_warrior_t1_hp').err !== 'missing') fail('남의 직업 노드가 통과했다');
    for (let i = 0; i < B.mastery_t1_max_rank; i++) if (!SYS.game.learnMastery(G2, h.uid, 'sin_t1_hp').ok) fail(`랭크 ${i + 1} 실패`);
    if (SYS.game.learnMastery(G2, h.uid, 'sin_t1_hp').err !== 'maxRank') fail('maxRank 아님');
    h.masteryPoints = 0;
    if (SYS.game.learnMastery(G2, h.uid, 'sin_t1_damage').err !== 'points') fail('points 아님');
    return '네 사유 전부 코드로 나온다';
});
check('mastery: 우클릭 되돌리기 — 1랭크씩 무르고 1포인트씩 돌아온다 · 0 이 되면 키가 사라진다 (INTERFACE §2)', () => {
    const G2 = newGameP(21, cands, NOW);
    const h = G2.heroes[0];
    h.masteryPoints = 3;
    for (let i = 0; i < 2; i++) if (!SYS.game.learnMastery(G2, h.uid, 'sin_t1_hp').ok) fail(`랭크 ${i + 1} 실패`);
    const one = SYS.game.unlearnMastery(G2, h.uid, 'sin_t1_hp');
    if (!one.ok || one.rank !== 1 || one.points !== 2) fail(JSON.stringify(one));
    if (h.mastery.sin_t1_hp !== 1 || h.masteryPoints !== 2) fail('환급이 안 맞는다');
    const zero = SYS.game.unlearnMastery(G2, h.uid, 'sin_t1_hp');
    if (!zero.ok || zero.rank !== 0 || zero.points !== 3) fail(JSON.stringify(zero));
    // 전액 롤백 뒤와 같은 모양이어야 세이브가 두 갈래로 안 갈린다
    if ('sin_t1_hp' in h.mastery) fail('랭크 0 인데 키가 남았다');
    if (SYS.game.unlearnMastery(G2, h.uid, 'sin_t1_hp').err !== 'noRank') fail('noRank 아님');
    if (SYS.game.unlearnMastery(G2, 'h999', 'sin_t1_hp').err !== 'missing') fail('없는 영웅에 missing 아님');
    if (h.cls !== 'warrior' && SYS.game.unlearnMastery(G2, h.uid, 'cls_warrior_t1_hp').err !== 'missing') fail('남의 직업 노드가 통과했다');
    return '2 → 1 → 0 · 포인트 1 → 2 → 3 · noRank · missing';
});
check('mastery: 해금 레벨이 내려간 칸도 무를 수 있다 — 「찍었는데 못 뺀다」를 만들지 않는다 (INTERFACE §2)', () => {
    const G2 = newGameP(22, cands, NOW);
    const h = G2.heroes[0];
    const t2 = D.masteryNodes.find(n => n.tier === 2 && n.owner_id === h.sin);
    if (!t2) fail(`${h.sin} 의 T2 노드가 없다`);
    // 해금 레벨까지 올려 찍은 뒤, 레벨을 도로 낮춘다(세이브 이관·기획 개정으로 문턱이 움직일 수 있다)
    h.level = B.mastery_t2_unlock_level;
    h.masteryPoints = 1;
    if (!SYS.game.learnMastery(G2, h.uid, t2.node_id).ok) fail('T2 를 못 찍었다');
    h.level = 1;
    if (SYS.game.learnMastery(G2, h.uid, t2.node_id).err !== 'locked') fail('찍기는 여전히 막혀야 한다');
    const r = SYS.game.unlearnMastery(G2, h.uid, t2.node_id);
    if (!r.ok || r.rank !== 0) fail(JSON.stringify(r));
    return `${t2.node_id} — 잠긴 채로도 환급된다`;
});
check('masteryState: 판정을 한 번에 낸다 — 랭크·상한·해금·찍을 수 있는가 (렌더러로 새지 않는다)', () => {
    const G2 = newGameP(9, cands, NOW);
    const h = G2.heroes[0];
    const ms = SYS.game.masteryState(G2, h.uid);
    if (ms.points !== h.masteryPoints) fail('points 불일치');
    const t1 = ms.nodes.filter(n => n.tier === 1), t2 = ms.nodes.filter(n => n.tier === 2);
    if (t1.some(n => !n.unlocked)) fail('T1 이 잠겨 있다');
    if (t2.some(n => n.unlocked)) fail(`레벨 ${h.level} 인데 T2 가 열려 있다`);
    if (ms.nodes.some(n => n.canLearn)) fail('포인트 0 인데 찍을 수 있다');
    if (SYS.game.masteryState(G2, 'h999') !== null) fail('없는 영웅에 null 을 안 낸다');
    return `${h.cls}/${h.sin} → 노드 ${ms.nodes.length} (T1 ${t1.length} · T2 ${t2.length})`;
});

/* ── 강화 (item_design §7-2 — R25 · 개정 2026-09-15 R95) ── */

/** 강화 시험용 판 — 가방에 아이템 하나를 넣고 골드를 넉넉히 준다 (본판 G 를 흔들지 않는다) */
function upgradeFixture(item) {
    const g = newGameP(7, cands, NOW);
    const it = JSON.parse(JSON.stringify(item));
    it.uid = 'iX'; it.up = it.up ?? 0;
    g.items[it.uid] = it; g.bag.push(it.uid);
    g.resources.gold = 1e9;
    return { g, it };
}

check('강화: 상한 = limitsOf.upgrade(기본값 [balance.csv:equip_upgrade_max] + 제련소 랭크) · 상한 뒤 비용은 null 이고 `maxUp` 을 낸다 (R137)', () => {
    const { g, it } = upgradeFixture(mkItem('gloves', [{ stat: 'crit_pct', v: 0.05 }]));
    let n = 0;
    while (SYS.game.upgradeItem(g, it.uid).ok) if (++n > 50) fail('상한에서 안 멈춘다');
    if (it.up !== SYS.game.limitsOf(g).upgrade) fail(`up ${it.up} ≠ 상한 ${SYS.game.limitsOf(g).upgrade}`);
    if (SYS.item.upgradeCost(it) !== null) fail('상한인데 비용이 있다');
    const r = SYS.game.upgradeItem(g, it.uid);
    return r.err === 'maxUp' ? `+${it.up} 에서 멈춤 · ${n}단계` : fail(`err ${r.err}`);
});

check('강화: 골드가 모자라면 `gold` — 단계도 골드도 안 움직인다', () => {
    const { g, it } = upgradeFixture(mkItem('boots', [{ stat: 'hp_pct', v: 0.03 }]));
    g.resources.gold = SYS.item.upgradeCost(it) - 1;
    const gold = g.resources.gold;
    const r = SYS.game.upgradeItem(g, it.uid);
    if (r.ok || r.err !== 'gold') fail(JSON.stringify(r));
    return it.up === 0 && g.resources.gold === gold ? `${gold}G 로는 못 올린다` : fail('실패했는데 상태가 바뀌었다');
});

check('강화: 없는 아이템은 `missing` · 강화는 가방·착용을 가리지 않는다 (소유물에 하는 일이다)', () => {
    const { g } = upgradeFixture(mkItem('helmet', [{ stat: 'hp_flat', v: 4 }]));
    if (SYS.game.upgradeItem(g, 'i9999').err !== 'missing') fail('missing 이 아니다');
    const worn = g.heroes[0].equipped.weapon;                 // 착용 중인 시작 무기
    const r = SYS.game.upgradeItem(g, worn);
    return r.ok && g.items[worn].up === 1 ? '착용 중인 무기도 강화된다' : fail(JSON.stringify(r));
});

check('강화: **옵션을 건드리지 않는다** — +[balance.csv:equip_upgrade_max] 까지 올려도 접사의 종류·개수·순서·값이 그대로다 (item_design §7-2 · R95)', () => {
    const { g, it } = upgradeFixture(mkItem('armor', [{ stat: 'crit_pct', v: 0.05 }, { stat: 'hp_pct', v: 0.03 }, { stat: 'res_fire', v: 0.07 }]));
    const before = JSON.stringify(it.affixes);
    for (let i = 0; i < B.equip_upgrade_max; i++) {
        const r = SYS.game.upgradeItem(g, it.uid);
        if (!r.ok) fail(`${i + 1}단계 ${r.err}`);
        if ('affix' in r) fail('결과에 affix 가 남아 있다 — 옵션 계단은 퇴역했다');
    }
    const after = JSON.stringify(it.affixes);
    return after === before ? `+${it.up} · 접사 ${it.affixes.length}개 그대로` : fail(`${before} → ${after}`);
});

check('강화: 목걸이 · 반지는 강화하지 않는다 — `noBase` · 비용 null · 옛 세이브의 up 은 그대로 (item_design §7-2 · R95)', () => {
    const out = [];
    for (const slot of ['amulet', 'ring']) {
        const { g, it } = upgradeFixture(mkItem(slot, [{ stat: 'gold_find', v: 0.05 }], { up: 2 }));   // 옛 규칙으로 +2 까지 올린 장신구
        const gold = g.resources.gold;
        if (SYS.item.upgradeable(it)) fail(`${slot} 이 강화 대상이다`);
        if (SYS.item.upgradeCost(it) !== null) fail(`${slot} 에 비용이 있다`);
        const s = SYS.game.upgradeState(g, it.uid);
        if (s.upgradeable || s.canUpgrade || s.cost !== null) fail(`${slot} state ${JSON.stringify(s)}`);
        const r = SYS.game.upgradeItem(g, it.uid);
        if (r.ok || r.err !== 'noBase') fail(`${slot} ${JSON.stringify(r)}`);
        if (it.up !== 2 || g.resources.gold !== gold) fail(`${slot} 거절했는데 상태가 바뀌었다`);
        out.push(slot);
    }
    for (const slot of ['weapon', 'helmet', 'armor', 'gloves', 'boots'])
        if (!SYS.item.upgradeable({ slot })) fail(`${slot} 이 강화 대상이 아니다`);
    return `${out.join('·')} 거절 · 무기 · 방어구 4부위는 대상`;
});

check('강화: 베이스는 **파생이다** — 무기 피해 범위는 up 으로 다시 계산되고 아이템에 박히지 않는다 (R25 · R90)', () => {
    const w = SYS.item.startingWeapon(makeRng(11), 'warrior');
    const { g, it } = upgradeFixture(w);
    const before = SYS.item.weaponDamage(it);
    const keys = Object.keys(it).sort().join(',');
    for (let i = 0; i < 4; i++) SYS.game.upgradeItem(g, it.uid);
    if ('watk' in it) fail('무기에 공격력 값이 박혔다 — 범위는 파생이다');
    if (Object.keys(it).sort().join(',') !== keys) fail('강화가 아이템에 새 필드를 박았다');
    const got = SYS.item.weaponDamage(it);
    const want = F.weaponDamage(it.ilvl, WG[it.group], 4);
    if (!eq(got, want)) fail(`${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
    if (!(got.max > before.max)) fail(`+4강인데 최대 피해가 안 올랐다 ${before.max} → ${got.max}`);
    if (SYS.item.effective(it) !== it) fail('무기는 사본에 먹일 고유값이 없다 — effective 가 원본을 돌려줘야 한다');
    return `${before.min}~${before.max} → +4강 ${got.min}~${got.max}`;
});

check('강화: up=0 이면 effective 가 **원본 객체 그대로**다 (매 렌더·매 전투가 부르는 자리라 할당을 아낀다)', () => {
    const it = mkItem('amulet', [{ stat: 'gold_find', v: 0.05 }]);
    if (SYS.item.effective(it) !== it) fail('up=0 인데 사본을 만든다');
    const up = { ...it, up: 3 };
    return SYS.item.effective(up) === up ? '목걸이는 베이스가 없어 up>0 이어도 원본' : fail('베이스 없는 부위가 사본을 만든다');
});

check('강화: 전투 능력치가 실제로 오른다 — heroCombat 이 effective 를 통과시킨다 (INTERFACE §2-7)', () => {
    const g = newGameP(7, cands, NOW);
    g.resources.gold = 1e9;
    const h = g.heroes[0], w = g.items[h.equipped.weapon];
    const atkOf = c => (c.atk_physical ?? c.atk_magic).max;      // 채널 키는 무기군이 정한다 (§2-4) · 값은 범위 — 최대 끝으로 본다 (R90)
    const atk0 = atkOf(SYS.game.heroCombat(g, h));
    for (let i = 0; i < B.equip_upgrade_max; i++) SYS.game.upgradeItem(g, w.uid);
    const atk1 = atkOf(SYS.game.heroCombat(g, h));
    return atk1 > atk0 ? `공격력 ${atk0} → ${atk1} (+${B.equip_upgrade_max}강)` : fail(`안 올랐다: ${atk0} → ${atk1}`);
});

check('강화: rng 를 안 쓴다 — 시드가 달라도 같은 결과 · `counters.upgrade` 가 안 오른다 (R95 · INTERFACE §5-1)', () => {
    const run = seed => {
        const { g, it } = upgradeFixture(mkItem('armor', [{ stat: 'crit_pct', v: 0.05 }, { stat: 'hp_pct', v: 0.03 }, { stat: 'res_fire', v: 0.07 }], { implicit: { stat: 'def_flat', v: 10 } }));
        g.seed = seed;
        const c0 = g.counters.upgrade;
        const log = [];
        for (let i = 0; i < B.equip_upgrade_max; i++) log.push(JSON.stringify(SYS.game.upgradeItem(g, it.uid)));
        if (g.counters.upgrade !== c0) fail(`counters.upgrade ${c0} → ${g.counters.upgrade}`);
        return log.join('|') + JSON.stringify(SYS.item.effective(it));
    };
    return run(12345) === run(777) ? `${B.equip_upgrade_max}단계 · 시드 둘 동일` : fail('시드가 강화 결과를 바꿨다');
});

check('강화: 드롭·시작 무기는 up=0 으로 나온다 — 강화는 굴림이 아니다', () => {
    for (let i = 1; i <= 20; i++) if (SYS.item.rollDrop(makeRng(i), i).up !== 0) fail(`드롭 ${i} up≠0`);
    for (const cls of D.classes.map(c => c.id)) if (SYS.item.startingWeapon(makeRng(3), cls).up !== 0) fail(`시작 무기 ${cls}`);
    return '드롭 20 · 시작 무기 7 전부 up=0';
});

check('강화: 비용 곡선 = base × growth^(현재 단계) — 단계마다 오른다', () => {
    const it = mkItem('helmet', [{ stat: 'hp_flat', v: 4 }]);
    const costs = [];
    for (let up = 0; up < B.equip_upgrade_max; up++) costs.push(SYS.item.upgradeCost({ ...it, up }));
    if (costs.some((c, i) => i && c <= costs[i - 1])) fail(`곡선이 안 오른다: ${costs.join('·')}`);
    if (costs[0] !== B.equip_upgrade_gold_base) fail(`+1강 비용 ${costs[0]}`);
    return `${costs.join(' · ')} (합 ${costs.reduce((a, b) => a + b, 0)}G)`;
});

/* ── 제작 (item_design §7-1 확정 2026-09-15 · R96) ── */

/** 제작 시험용 판 — 모든 레벨의 광석 · 목재와 가루를 무기 레시피의 k 배만큼 쥔다 (본판 G 를 흔들지 않는다 · 같은 단계를 쓰는 레벨은 한 몫) */
function makeFixture(k = 1) {
    const g = newGameP(7, cands, NOW);
    const r = D.makeRecipes.weapon;
    for (const l of SYS.game.makeLevels()) { g.materials[l.ore] = r.ore * k; g.materials[l.timber] = r.timber * k; }
    g.resources.dust = r.dust * k;
    return g;
}
/** 그 부위 · 레벨의 첫 종류 id — 제작은 종류를 받는다 (item_design §7-1 개정 2026-09-21) */
const firstKind = (g, part, level) => SYS.game.makeState(g, part, level).kinds[0].id;

check('make: 레시피는 부위 전부 — 광석 · 목재 · 가루가 모두 1 이상 (보완재 · 원정 쪽 입력 — item_design §5-1 · §7-1)', () => {
    const parts = D.slots.map(s => s.id);
    for (const p of parts) {
        const r = D.makeRecipes[p];
        if (!r) fail(`${p} 레시피가 없다`);
        if (!(r.ore >= 1 && r.timber >= 1 && r.dust >= 1)) fail(`${p} ${JSON.stringify(r)}`);
    }
    return `${parts.length}부위`;
});

check('make: 레벨 = 1 + 챕터마다 끝 레벨(stage.csv) · 재료는 그 레벨이 든 챕터 단계의 광석 · 목재 (item_design §7-1 개정 2026-09-21 · base_expedition §2-1)', () => {
    const levels = SYS.game.makeLevels();
    const chs = [...new Set(D.stageList.map(s => s.chapter))].sort((a, b) => a - b);
    const top = c => Math.max(...D.stageList.filter(s => s.chapter === c).map(s => s.dlvl));
    const want = [...new Set([1, ...chs.map(top)])];
    if (JSON.stringify(levels.map(l => l.level)) !== JSON.stringify(want)) fail(`레벨 ${levels.map(l => l.level)} ≠ ${want}`);
    for (const l of levels) {
        // 그 레벨이 든 챕터 = 끝 레벨이 그 레벨 이상인 첫 챕터 (Lv1 · Lv10 은 챕터 1)
        const ch = chs.find(c => top(c) >= l.level);
        if (l.chapter !== ch) fail(`Lv${l.level} 챕터 ${l.chapter} ≠ ${ch}`);
        if (D.mineNodes.find(n => n.tier === ch)?.yieldId !== l.ore) fail(`Lv${l.level} 광석 ${l.ore}`);
        if (D.logNodes.find(n => n.tier === ch)?.yieldId !== l.timber) fail(`Lv${l.level} 목재 ${l.timber}`);
    }
    return levels.map(l => `Lv${l.level}(${l.chapter})`).join(' · ');
});

check('make: 종류 = item.basesAt — 무기는 본편 무기군 · 무기 외는 그 레벨의 티어 베이스(Lv1 = 시작 칸) (item_design §7-1 · §1 「베이스」)', () => {
    const g = makeFixture(1);
    const l1 = SYS.game.makeLevels()[0].level;
    const ids = (part, lv) => SYS.game.makeState(g, part, lv).kinds.map(k => k.id);
    const main = D.weaponGroupList.filter(w => w.release === 'main').map(w => w.id);
    if (JSON.stringify(ids('weapon', l1)) !== JSON.stringify(main)) fail(`무기 종류 ${ids('weapon', l1)} ≠ ${main}`);
    for (const part of D.slots.map(s => s.id)) for (const l of SYS.game.makeLevels())
        if (JSON.stringify(ids(part, l.level)) !== JSON.stringify(SYS.item.basesAt(part, l.level).map(b => b.id))) fail(`${part} Lv${l.level} 종류가 basesAt 과 다르다`);
    // Lv1 방어구 = 시작 칸 하나(갈래 없음) · 첫 티어가 열리는 레벨부터는 갈래 셋
    const a1 = SYS.game.makeState(g, 'armor', l1).kinds;
    if (a1.length !== 1 || a1[0].group !== null) fail(`Lv1 갑옷 ${JSON.stringify(a1)}`);
    return `무기 ${main.length} · 갑옷 Lv1 ${a1[0].id}`;
});

check('make: 무기 줄은 그 레벨의 세부 베이스 — make_level ≤ 레벨 중 가장 높은 하나 · 무기군마다 Lv1 베이스가 있고 제작 레벨이 겹치지 않는다 (weapon_base.csv:make_level · 2026-09-21)', () => {
    const g = makeFixture(1);
    const levels = SYS.game.makeLevels().map(l => l.level);
    for (const [gid, bases] of Object.entries(D.weaponBases)) {
        const ml = bases.map(b => b.makeLevel);
        if (ml.some(v => !Number.isInteger(v) || v < 1)) fail(`${gid} make_level ${ml}`);
        if (new Set(ml).size !== ml.length) fail(`${gid} — 제작 레벨이 겹친다 ${ml}`);
        if (!ml.includes(1)) fail(`${gid} — Lv1 베이스가 없다`);
    }
    const seq = {};
    for (const lv of levels) for (const k of SYS.game.makeState(g, 'weapon', lv).kinds) {
        const want = D.weaponBases[k.id].filter(b => b.makeLevel <= lv).sort((a, b) => b.makeLevel - a.makeLevel)[0];
        if (k.baseId !== want.id || k.ko !== want.ko || k.en !== want.en) fail(`${k.id} Lv${lv} — ${k.baseId} ≠ ${want.id}`);
        (seq[k.id] ??= []).push(k.baseId);
    }
    return `양손검 ${levels.map((lv, i) => `Lv${lv} ${seq.sword2h[i]}`).join(' · ')}`;
});

check('make: 재료가 모자라면 `materials` — 재료 · 가방 · 카운터가 안 움직인다', () => {
    const g = makeFixture(1);
    const l = SYS.game.makeLevels()[0];
    g.materials[l.ore] -= 1;
    const snap = JSON.stringify([g.materials, g.resources, g.bag, g.counters]);
    if (SYS.game.makeState(g, 'weapon', l.level).canMake) fail('모자란데 canMake');
    const r = SYS.game.makeItem(g, 'weapon', l.level, firstKind(g, 'weapon', l.level));
    if (r.ok || r.err !== 'materials') fail(JSON.stringify(r));
    return JSON.stringify([g.materials, g.resources, g.bag, g.counters]) === snap ? '광석 하나 모자람 → 거절' : fail('거절했는데 상태가 바뀌었다');
});

check('make: 만들면 재료를 레시피만큼 내고 인벤토리 끝에 하나 — 고른 부위 · 고른 종류 · ilvl = 고른 레벨 · 일반/매직/레어 · 강화 0 (item_design §7-1)', () => {
    const got = [];
    // 열린 레벨만 — 제련소 랭크가 앞에서부터 연다(다 지은 판 · R137). 안 열린 레벨은 아래에서 `unbuilt` 를 본다
    const lv = SYS.game.makeLevels(makeFixture(0));
    for (const l of lv.filter(x => x.open)) for (const part of D.slots.map(s => s.id)) for (const k of SYS.item.basesAt(part, l.level)) {
        const g = makeFixture(0);
        const r0 = D.makeRecipes[part];
        g.materials[l.ore] = r0.ore; g.materials[l.timber] = r0.timber; g.resources.dust = r0.dust;
        const bag0 = g.bag.length, c0 = g.counters.make;
        const r = SYS.game.makeItem(g, part, l.level, k.id);
        if (!r.ok) fail(`${part} Lv${l.level} ${k.id} ${r.err}`);
        const it = g.items[r.uid];
        if (it.slot !== part) fail(`부위 ${it.slot} ≠ ${part}`);
        // 종류 — 무기는 무기군(세부 베이스는 굴림) · 무기 외는 베이스 id
        if ((part === 'weapon' ? it.group : it.baseId) !== k.id) fail(`${part} 종류 ${part === 'weapon' ? it.group : it.baseId} ≠ ${k.id}`);
        // 줄이 보인 베이스가 그대로 나온다 — 무기는 그 레벨의 세부 베이스(2026-09-21)
        const shown = SYS.game.makeState(makeFixture(0), part, l.level).kinds.find(x => x.id === k.id);
        if (it.baseId !== shown.baseId) fail(`${part} Lv${l.level} ${k.id} — 보인 베이스 ${shown.baseId} ≠ 나온 ${it.baseId}`);
        if (it.ilvl !== l.level) fail(`ilvl ${it.ilvl} ≠ Lv${l.level}`);
        if (!['normal', 'magic', 'rare'].includes(it.rarity)) fail(`희귀도 ${it.rarity}`);
        if (it.up !== 0) fail(`up ${it.up}`);
        if (g.bag.length !== bag0 + 1 || g.bag[g.bag.length - 1] !== r.uid) fail('인벤토리 끝에 안 들어갔다');
        if (g.materials[l.ore] !== 0 || g.materials[l.timber] !== 0 || g.resources.dust !== 0) fail('재료를 레시피만큼 안 냈다');
        if (g.counters.make !== c0 + 1) fail(`counters.make ${c0} → ${g.counters.make}`);
        got.push(it.rarity[0]);
    }
    const shut = lv.find(x => !x.open);
    if (shut) {
        const g = makeFixture(1);
        g.materials[shut.ore] = 99; g.materials[shut.timber] = 99;
        const r = SYS.game.makeItem(g, 'ring', shut.level, SYS.game.makeState(g, 'ring', shut.level).kinds[0].id);
        if (r.err !== 'unbuilt') fail(`안 열린 Lv${shut.level} → ${JSON.stringify(r)}`);
    }
    return `${got.length}회 · ${got.join('')}${shut ? ` · Lv${shut.level} unbuilt` : ''}`;
});

check('make: 인벤토리가 차 있으면 `bagFull` — 재료를 안 낸다', () => {
    const g = makeFixture(1);
    const l = SYS.game.makeLevels()[0];
    while (g.bag.length < SYS.game.limitsOf(g).bag) g.bag.push(`iFake${g.bag.length}`);
    const snap = JSON.stringify([g.materials, g.resources.dust, g.counters.make]);
    const r = SYS.game.makeItem(g, 'weapon', l.level, firstKind(g, 'weapon', l.level));
    if (r.ok || r.err !== 'bagFull') fail(JSON.stringify(r));
    return JSON.stringify([g.materials, g.resources.dust, g.counters.make]) === snap ? '가득 참 → 거절 · 재료 그대로' : fail('거절했는데 재료가 줄었다');
});

check('make: 없는 부위 · 레벨 · 목록 밖 종류는 `missing` — 상태가 안 움직인다 · 상태는 null', () => {
    const g = makeFixture(1);
    if (SYS.game.makeState(g, 'offhand', 1) !== null) fail('없는 부위에 상태가 섰다');
    if (SYS.game.makeItem(g, 'weapon', 99, 'axe').err !== 'missing') fail('없는 레벨');
    // 목록 밖 종류 — Lv1 에서 윗 티어 갑옷 · 무기 부위에 방어구 베이스
    const l1 = SYS.game.makeLevels()[0].level;
    const snap = JSON.stringify([g.materials, g.resources, g.bag, g.counters]);
    const high = D.itemBases.armor.find(b => b.tierMin > l1);
    for (const [part, kind] of [['armor', high.id], ['weapon', 'armor_cloth'], ['armor', undefined]]) {
        const r = SYS.game.makeItem(g, part, l1, kind);
        if (r.err !== 'missing') fail(`${part} ${kind} → ${JSON.stringify(r)}`);
    }
    return JSON.stringify([g.materials, g.resources, g.bag, g.counters]) === snap ? `목록 밖(${high.id} · 무기에 갑옷 · 종류 없음) → 거절` : fail('거절했는데 상태가 바뀌었다');
});

check('make: 같은 시드 · 같은 회차 = 같은 장비 — 제작 스트림은 전투와 안 섞인다 (INTERFACE §5-1)', () => {
    const run = () => {
        const g = makeFixture(3);
        const levels = SYS.game.makeLevels();
        const l = levels[2] ?? levels[0];
        const uids = [0, 1, 2].map(() => SYS.game.makeItem(g, 'weapon', l.level, firstKind(g, 'weapon', l.level)).uid);
        return { s: JSON.stringify(uids.map(u => g.items[u])), battle: g.counters.battle };
    };
    const a = run(), c = run();
    if (a.s !== c.s) fail('같은 시드가 다른 장비를 냈다');
    return a.battle === 0 ? '3회 동일 · counters.battle 0' : fail(`counters.battle ${a.battle}`);
});

check('make: 한 판에서 거듭 만들면 희귀도가 갈린다 — 베이스를 안 굴려 희귀도가 스트림 첫 값을 써도 회차마다 다르다 (INTERFACE §5-2 · 2026-09-21)', () => {
    const g = makeFixture(0);
    const l = SYS.game.makeLevels()[0], r0 = D.makeRecipes.ring, N = 60;
    g.materials[l.ore] = r0.ore * N; g.materials[l.timber] = r0.timber * N; g.resources.dust = r0.dust * N;
    const n = { normal: 0, magic: 0, rare: 0 };
    for (let i = 0; i < N; i++) {
        const r = SYS.game.makeItem(g, 'ring', l.level, firstKind(g, 'ring', l.level));
        if (!r.ok) fail(`${i}회째 ${r.err}`);
        n[g.items[r.uid].rarity]++;
        g.bag.pop();   // 인벤토리 상한에 안 걸리게 — 판정은 희귀도만 본다
    }
    if (Object.values(n).filter(v => v > 0).length < 2 || n.normal === 0) fail(`희귀도가 안 갈린다 ${JSON.stringify(n)}`);
    return `${N}회 — 일반 ${n.normal} · 매직 ${n.magic} · 레어 ${n.rare}`;
});

check('make: 희귀도 가중치는 [balance.csv:make_rarity_w_*] — 드롭 가중치와 따로다 (item_design §7-1)', () => {
    const S2 = buildSystems({ ...D, balance: { ...B, make_rarity_w_normal: 0, make_rarity_w_magic: 0, make_rarity_w_rare: 1, rarity_w_rare: 0 } });
    const g = openAll(S2.game.newGame(7, cands, NOW), S2);
    const l = S2.game.makeLevels()[0], r0 = D.makeRecipes.armor, kind = S2.game.makeState(g, 'armor', l.level).kinds[0].id;
    g.materials[l.ore] = r0.ore * 5; g.materials[l.timber] = r0.timber * 5; g.resources.dust = r0.dust * 5;
    const got = [0, 1, 2, 3, 4].map(() => g.items[S2.game.makeItem(g, 'armor', l.level, kind).uid].rarity);
    if (got.some(x => x !== 'rare')) fail(`제작 ${got.join('·')} — 제작 가중치를 안 읽는다`);
    for (let i = 1; i <= 20; i++) if (S2.item.rollDrop(makeRng(i), 5).rarity === 'rare') fail('드롭이 제작 가중치를 읽는다');
    return '제작 5 전부 레어 · 드롭 20 레어 0';
});

check('save: 제작 재료 · counters.make 가 왕복한다 — 없는 옛 세이브는 {} · 0 으로 열린다 (버전 무변경 · INTERFACE §4 · R96)', () => {
    const g = makeFixture(2);
    const l1 = SYS.game.makeLevels()[0].level;
    SYS.game.makeItem(g, 'ring', l1, firstKind(g, 'ring', l1));
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW))));
    if (!eq(back.materials, g.materials) || back.counters.make !== g.counters.make) fail('왕복이 재료를 흔들었다');
    const old = JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW)));
    delete old.materials; delete old.counters.make;
    const up = SYS.game.deserialize(old);
    return eq(up.materials, {}) && up.counters.make === 0 && up.version === SAVE_VERSION ? '왕복 · 옛 세이브 기본값' : fail(JSON.stringify([up.materials, up.counters.make]));
});

/* ── 물약 (battle_design §7-1 · item_design §7-4 확정 2026-09-15 · R103) ── */

check('potion: 표 — 힐링 포션 5단계 · 영어 원본 이름(Diablo 2) · 회복량은 단계마다 커진다 · 시작은 마이너 · 만들 수 있는 단계는 제련소 랭크가 연다 (item_design §7-4 · R137)', () => {
    const rows = D.potions;
    const want = ['Minor Healing Potion', 'Light Healing Potion', 'Healing Potion', 'Greater Healing Potion', 'Super Healing Potion'];
    if (!eq(rows.map(p => p.en), want)) fail(`이름 ${rows.map(p => p.en).join(' · ')}`);
    rows.forEach((p, i) => {
        if (p.kind !== 'heal' || p.tier !== i + 1) fail(`${p.id} kind ${p.kind} tier ${p.tier}`);
        if (i && !(p.heal > rows[i - 1].heal)) fail(`${p.id} 회복량 ${p.heal} ≤ 앞 단계`);
        if (!p.ko) fail(`${p.id} 한글 이름`);
    });
    // 시작 물약은 **지금의** 사용자 지시다 — 바뀌면 이 줄을 고친다
    const start = rows.filter(p => p.startOwned).map(p => p.id);
    if (!eq(start, ['minor_healing'])) fail(`시작 물약 ${start}`);
    // 만들 수 있는 단계 = 제련소 랭크의 더하기(`limitsOf.potionTier`) — 새 게임(제련소 0)은 하나도 없고 · 다 지으면 그만큼 앞에서부터 (R137 · ~~craftable 칸~~)
    const openIds = g => SYS.game.potionState(g).list.filter(x => x.craftable).map(x => x.id);
    const raw = SYS.game.newGame(11, cands, NOW), all = openAll(SYS.game.newGame(11, cands, NOW));
    if (openIds(raw).length !== SYS.game.limitsOf(raw).potionTier) fail(`새 게임 열린 단계 ${openIds(raw)} ≠ ${SYS.game.limitsOf(raw).potionTier}`);
    const n = SYS.game.limitsOf(all).potionTier;
    if (!eq(openIds(all), rows.slice(0, n).map(p => p.id))) fail(`다 지은 판 열린 단계 ${openIds(all)} — 앞에서부터 ${n} 이어야`);
    return `${rows.map(p => `${p.ko} ${p.heal}`).join(' · ')} · 열린 단계 새 게임 ${openIds(raw).length} · 다 지으면 ${n}`;
});

check('potion: 표가 틀리면 로드에서 멈춘다 — 모르는 종류 · 단계 빈틈 · 회복량 역전 · id 중복 (state.js · INTERFACE §2-7)', () => {
    const tryLoad = potions => { try { buildSystems({ ...D, potions }); return null; } catch (e) { return String(e.message); } };
    const base = D.potions;
    const cases = [
        ['종류', base.map((p, i) => (i === 2 ? { ...p, kind: 'damage' } : p)), '모르는 종류'],
        ['단계', base.map((p, i) => (i === 3 ? { ...p, tier: 9 } : p)), '단계'],
        ['회복량', base.map((p, i) => (i === 1 ? { ...p, heal: 1 } : p)), '회복량'],
        ['id', base.map((p, i) => (i === 4 ? { ...p, id: base[0].id } : p)), 'id'],
    ];
    for (const [name, rows, word] of cases) {
        const msg = tryLoad(rows);
        if (!msg || !msg.includes(word)) fail(`${name} — ${msg ?? '안 멈췄다'}`);
    }
    const ok = tryLoad(base);
    return ok === null ? '넷 다 멈춤 · 원본은 통과' : fail(`원본이 멈췄다 — ${ok}`);
});

/** 물약 시험용 판 — 본판 G 를 흔들지 않는다 · **다 지은 판**이라 제련소가 연 단계가 있다(R137) */
const potionFixture = (gold = 0) => {
    const g = newGameP(11, cands, NOW);
    g.resources.gold = gold;
    return g;
};
/** 그 판에서 **만들 수 있는 단계 중 마지막**(옛 단정의 「라이트」 자리) · **첫 안 열린 단계**(없으면 null) — 표 · 건물 랭크가 바뀌어도 단정이 따라간다 */
const potionOpen = g => { const l = SYS.game.potionState(g).list; return D.potions.find(p => p.id === l.filter(x => x.craftable).at(-1)?.id); };
const potionShut = g => SYS.game.potionState(g).list.find(x => !x.craftable)?.id ?? null;

check('potion: potionState 가 판정을 다 낸다 — have = 재고 · 안 열린 것 locked · 골드가 모자라면 gold · 가진 뒤에도 만든다 · loadout · owned 퇴역 (INTERFACE §2-7 · R124)', () => {
    const g = potionFixture(0);
    const light = potionOpen(g), shut = potionShut(g);
    if (!light) fail('fixture: 다 지은 판인데 만들 수 있는 단계가 없다');
    g.resources.gold = light.craftGold - 1;
    const s = SYS.game.potionState(g);
    const by = id => s.list.find(x => x.id === id);
    const minor = by('minor_healing');
    if (minor.have !== 1 || minor.err !== (minor.craftable ? 'gold' : 'locked')) fail(`마이너 ${JSON.stringify(minor)}`);
    if (shut && (by(shut).err !== 'locked' || by(shut).canMake || by(shut).have !== 0)) fail(`안 열린 단계 ${JSON.stringify(by(shut))}`);
    if (by(light.id).err !== 'gold' || by(light.id).canMake) fail(`라이트 ${JSON.stringify(by(light.id))}`);
    if ('loadout' in s || 'owned' in by(light.id)) fail('퇴역한 칸이 남았다 — loadout · owned');
    if (s.slotMax !== SYS.game.limitsOf(g).potionSlots || s.useHpPct !== B.potion_use_hp_pct || s.cooldownSec !== B.potion_cooldown_sec) fail('상한 · balance 값이 아니다');
    g.resources.gold = light.craftGold;
    if (!SYS.game.potionState(g).list.find(x => x.id === light.id).canMake) fail('골드가 딱 맞는데 못 만든다');
    return s.list.map(x => `${x.id}:${x.have}:${x.err ?? 'ok'}`).join(' · ');
});

check('potion: 만들면 골드를 내고 재고가 1 는다 — 거듭 만든다 · 거절(missing → locked → gold)이면 아무것도 안 바뀐다 · rng · 카운터 · 칸 구성 불변 (INTERFACE §2-7 · R124)', () => {
    const g = potionFixture(0);
    const light = potionOpen(g), shut = potionShut(g);
    g.resources.gold = light.craftGold * 2;
    const snap = () => JSON.stringify([g.resources, g.potions, g.counters, g.presets]);
    for (const [id, err] of [['nope', 'missing'], ...(shut ? [[shut, 'locked']] : [])]) {
        const before = snap();
        const r = SYS.game.makePotion(g, id);
        if (r.ok || r.err !== err) fail(`${id} → ${JSON.stringify(r)} (기대 ${err})`);
        if (snap() !== before) fail(`${id} 거절인데 상태가 바뀌었다`);
    }
    const c0 = JSON.stringify(g.counters), slots0 = JSON.stringify(g.presets);
    const r1 = SYS.game.makePotion(g, light.id), r2 = SYS.game.makePotion(g, light.id);
    if (!r1.ok || r1.have !== 1 || !r2.ok || r2.have !== 2 || r2.cost !== light.craftGold) fail(JSON.stringify([r1, r2]));
    if (g.resources.gold !== 0 || g.potions[light.id] !== 2) fail(`골드 ${g.resources.gold} · 재고 ${JSON.stringify(g.potions)}`);
    if (JSON.stringify(g.counters) !== c0) fail('카운터가 움직였다');
    if (JSON.stringify(g.presets) !== slots0) fail('만들기가 칸 구성을 바꿨다 — 칸에 넣는 것은 편성 탭이다');
    const poor = snap();
    if (SYS.game.makePotion(g, light.id).err !== 'gold' || snap() !== poor) fail('골드 부족 거절이 상태를 바꿨다');
    return `${light.en} ${light.craftGold}G ×2 → 재고 ${g.potions[light.id]}`;
});

check('save: 재고 · 편성이 왕복한다 — 모양이 틀린 재고는 시작 재고로 · 표에서 사라진 id 는 로드가 안 지우고 칸 채우기가 빈 칸으로 낸다 (INTERFACE §4 · R124)', () => {
    const g = potionFixture(0);
    const light = potionOpen(g);
    g.resources.gold = light.craftGold;
    SYS.game.makePotion(g, light.id);
    SYS.game.setPotionSlot(g, 1, light.id);
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW))));
    if (!eq(back.potions, g.potions) || !eq(back.presets, g.presets) || back.preset !== g.preset) fail('왕복');
    const bad = JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW)));
    bad.potions = ['minor_healing'];            // v32 인데 목록 모양 — 망가진 세이브
    const start = Object.fromEntries(D.potions.filter(p => p.startOwned > 0).map(p => [p.id, p.startOwned]));
    if (!eq(SYS.game.deserialize(bad).potions, start)) fail('모양이 틀린 재고가 시작 재고로 안 열린다');
    const ghost = JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW)));
    ghost.potions = { gone_potion: 2, minor_healing: 1 };
    ghost.presets[0].potionSlots = Array.from({ length: SYS.game.limitsOf(g).potionSlots }, (_, i) => ['gone_potion', 'minor_healing'][i] ?? null);
    const gg = SYS.game.deserialize(ghost);
    if (!eq(gg.potions, { gone_potion: 2, minor_healing: 1 })) fail('로드가 모르는 id 를 지웠다');
    const sl = SYS.game.presetState(gg).presets[0].potionSlots;
    if (!sl[0]?.short || sl[1]?.short !== false) fail(`모르는 id 칸 ${JSON.stringify(sl)}`);
    const d = SYS.game.departRun(gg, 101, NOW);
    if (!d.ok) fail(d.err);
    const ids = d.run.result.potion.slots.map(s => s?.id ?? null);
    const want = Array.from({ length: SYS.game.limitsOf(gg).potionSlots }, (_, i) => [null, 'minor_healing'][i] ?? null);
    return eq(ids, want) ? '왕복 · 모양 틀림 = 시작 재고 · 모르는 id = 빈 칸' : fail(`런 칸 ${JSON.stringify(ids)}`);
});

/* ── 스킬 표 셋 [2026-09-22 · R136 · PLAN_skill_structure 1단계] — `skill.csv`(스킬) · `skill_effect.csv`(하는 일) · `skill_status.csv`(걸린 효과).
   행을 망가뜨려 로드가 던지는지 보는 단정은 **그 칸이 사는 표**를 망가뜨린다(`patchSkill` 이 칸 이름으로 표를 가른다) ── */
/** 표 셋의 깊은 복사본 — 고쳐도 원본(`D`)이 안 바뀐다 */
const skillTables = () => JSON.parse(JSON.stringify({ rows: D.skillRows, effectRows: D.skillEffectRows, statusRows: D.skillStatusRows }));
/** 스킬 시스템 조립 — 넘기지 않은 표는 원본을 쓴다 */
const loadSkills = (t = {}) => createSkillSystem({
    balance: B, rows: D.skillRows, effectRows: D.skillEffectRows, statusRows: D.skillStatusRows,
    tagRows: D.skillTagRows, attributes: D.heroAttributes, ...t,
});
/**
 * 한 스킬의 칸을 고친 표 셋 — 칸 이름이 사는 표에 쓴다: 스킬 행 → 그 스킬의 하는 일 첫 줄 → 그 줄이 거는 걸린 효과.
 * 어느 표에도 없는 칸이면 빨간불이다(고칠 칸을 못 찾은 단정이 헛돌지 않게)
 */
const patchSkill = (id, patch, t = skillTables()) => {
    const row = t.rows.find(r => r.skill_id === id);
    const line = t.effectRows.find(r => r.skill_id === id);
    const st = t.statusRows.find(r => r.status_id === line?.status);
    for (const [k, v] of Object.entries(patch)) {
        const at = [row, line, st].find(x => x && k in x);
        if (!at) fail(`${id} 에 '${k}' 칸이 없다 — 스킬 · 하는 일 · 걸린 효과 어디에도`);
        at[k] = v;
    }
    return t;
};
/** 시전 단위 — 하는 일 한 줄을 능력치 없이(원값) 민 것. 실행 함수(대상 표 · castHeal · castBuff · castSummon)가 받는 모양이다 (INTERFACE §2-8 scaleDef) */
const skillLine = (id, S = SYS.skill) => S.scaleDef(S.defs[id], null).effects[0];

/* ── 스킬 태그 (skill_design §11 확정 2026-08-28) ── */
check('skill: 태그 14종 — 정의 11(최대 2) + 파생 3(target·hits 에서). CSV 값이 전부 어휘 안이다', () => {
    const S = SYS.skill;
    if (S.TAGS.length !== 11 || S.DERIVED_TAGS.length !== 3) fail(`정의 ${S.TAGS.length} · 파생 ${S.DERIVED_TAGS.length}`);
    for (const d of S.list) {
        if (d.tags.length > S.MAX_TAGS) fail(`${d.id} tags ${d.tags.length}개`);
        for (const tg of d.tags) if (!S.TAGS.includes(tg)) fail(`${d.id} '${tg}'`);
        // 피해 태그는 **`hit` 줄만** 낸다 [2026-09-09 · 줄 2026-09-22] — 적에게 거는 창(참회·속박)도 `enemy_all` 을 쓴다
        const want = [];
        const hit = d.effects.find(e => e.effect === 'hit');
        if (hit) {
            if (d.target === 'enemy_all' || d.target === 'enemy_chain') want.push('aoe');
            if (d.target === 'enemy_single' || d.target === 'enemy_highest_def') want.push('single');
            if (hit.hits > 1) want.push('multihit');
        }
        if (!eq(d.derived, want)) fail(`${d.id} 파생 [${d.derived}] ≠ [${want}]`);
    }
    const rot = S.defs.kni_rush;                       // enemy_rotate — 타수만큼만 닿는다 (§11-2 규칙 3)
    if (S.tagsOf(rot).some(x => x === 'aoe' || x === 'single')) fail('enemy_rotate 가 광역/단일로 셌다');
    const tagged = S.list.filter(d => d.tags.length).length;
    return `태그 붙은 스킬 ${tagged}/${S.list.length} · 다단히트 ${S.list.filter(d => d.derived.includes('multihit')).map(d => d.id).join(',')}`;
});
check('skill: 파생 태그를 tags 에 적으면 로드가 실패한다 — 두 곳 관리 금지 (§11-2 규칙 2)', () => {
    const rows = JSON.parse(JSON.stringify(D.skillRows));
    rows[0].tags = 'single';
    try { loadSkills({ rows }); } catch (e) { return `throw — ${String(e.message).slice(0, 50)}`; }
    return fail('파생 태그가 통과했다');
});
check('skill: tags 3개 · 어휘 밖 값 · 중복은 로드가 실패한다 (§11-2 규칙 1)', () => {
    const mk = v => { const rows = JSON.parse(JSON.stringify(D.skillRows)); rows[0].tags = v; return rows; };
    for (const v of ['shout|blessing|curse', 'nonsense', 'shout|shout']) {
        let threw = false;
        try { loadSkills({ rows: mk(v) }); } catch (e) { threw = true; }
        if (!threw) fail(`'${v}' 가 통과했다`);
    }
    return '3개 · 어휘 밖 · 중복 전부 throw';
});
/**
 * 고유 스킬 후보 풀 = `skill.csv:innate_pool = 1` 인 행 (2026-09-01 — 옛 판은 「전 행」이었다).
 * 풀은 `ui/data.js:buildSystems` 가 `hero.skillPool` 로 주입한다 — **행 순서가 결정론 계약**이라
 *   여기서는 목록만 대조한다(영웅 재조립은 골든 `meta.parties` 가 본다).
 */
check('skill: 고유 풀 = innate_pool=1 인 행 · 0 이면 뽑히지 않는다 (skill_design §9-0)', () => {
    const pool = SYS.skill.list.filter(sk => sk.innatePool).map(sk => sk.id);
    const wanted = D.skillRows.filter(r => r.innate_pool === 1).map(r => r.skill_id);
    if (!eq(pool, wanted)) fail(`풀 [${pool}] ≠ CSV [${wanted}]`);
    if (pool.length === 0) fail('풀이 비면 영웅이 고유 칸을 못 채운다');
    // 한 행을 0 으로 내리면 그 id 가 풀에서 빠져야 한다 — 컬럼이 실제로 문을 여닫는지 본다
    const rows = JSON.parse(JSON.stringify(D.skillRows));
    rows[0].innate_pool = 0;
    const S2 = loadSkills({ rows });
    const pool2 = S2.list.filter(sk => sk.innatePool).map(sk => sk.id);
    if (pool2.includes(rows[0].skill_id)) fail(`innate_pool 0 인데 ${rows[0].skill_id} 가 풀에 남았다`);
    if (pool2.length !== pool.length - 1) fail(`풀 ${pool.length} → ${pool2.length}`);
    // 어휘 밖 값은 로드가 실패한다 (0/1 뿐)
    const bad = JSON.parse(JSON.stringify(D.skillRows));
    bad[0].innate_pool = 2;
    let threw = false;
    try { loadSkills({ rows: bad }); } catch (e) { threw = true; }
    if (!threw) fail('innate_pool 2 가 통과했다');
    return `풀 ${pool.length}/${SYS.skill.list.length}행 · ${rows[0].skill_id} 를 0 으로 내리면 ${pool2.length}`;
});
check('skill: tagRows 무결성 — 비었거나 · 대분류 밖 · derived 가 0/1 밖 · 파생 셋 불일치는 로드가 실패한다 (§11)', () => {
    const mk = patch => { const t = JSON.parse(JSON.stringify(D.skillTagRows)); Object.assign(t[0], patch); return t; };
    const cases = [
        [[], '태그 표가 비었다'],
        [mk({ category: 'nonsense' }), '대분류 밖'],
        [mk({ derived: 2 }), 'derived 2'],
        [mk({ derived: 0 }), '파생 3 → 2 (derivedTagsOf 와 불일치)'],
        [mk({ tag_id: 'single' }), 'tag_id 중복'],
    ];
    for (const [tagRows, why] of cases) {
        let threw = false;
        try { loadSkills({ tagRows }); } catch (e) { threw = true; }
        if (!threw) fail(`${why} 가 통과했다`);
    }
    return `데이터 오류 ${cases.length}가지가 전부 로드에서 걸린다`;
});
check('skill: 표 사이 검사 — 줄 없는 스킬 · seq 빈틈 · seq 가 1 이 아님 · 없는 스킬의 줄 · 없는 걸린 효과 · 아무도 안 거는 걸린 효과 · 걸린 효과 중복 · 어휘 밖 stat · 줄 대상 · round_end · 오오라 대상은 로드가 실패한다 (INTERFACE §2-8 · R136 · 2단계 R151)', () => {
    loadSkills();                                                 // 원본은 통과해야 한다 — 아래 실패가 전부 망가뜨린 행 탓이라는 증거
    const bash = t => t.effectRows.find(r => r.skill_id === 'war_bash');
    const cases = [
        [t => { t.effectRows = t.effectRows.filter(r => r.skill_id !== 'war_bash'); }, '줄 없는 스킬'],
        // 줄 둘은 합법이다(2026-09-24 R151 — ~~1단계 정확히 1개~~) · 같은 seq 를 두 번 적으면 빈틈이라 던진다
        [t => { t.effectRows.push({ ...bash(t) }); }, 'seq 가 두 번 — 1 · 1'],
        [t => { bash(t).seq = 2; }, 'seq 가 1 부터가 아니다'],
        [t => { bash(t).target = 'nonsense'; }, '줄 target 어휘 밖'],
        [t => { t.effectRows.find(r => r.skill_id === 'kni_duel' && r.seq === 2).target = 'enemy_single'; }, '줄 대상이 공격 뜻(enemy_single)인데 apply'],
        [t => { t.statusRows.find(r => r.status_id === 'mag_focus').round_end = 'nonsense'; }, 'round_end 어휘 밖'],
        [t => { t.statusRows.find(r => r.status_id === 'kni_might').round_end = 'close'; }, '오오라가 거는 효과가 close'],
        [t => { t.rows.find(r => r.skill_id === 'pri_penitence').target = 'enemy_single'; }, '적에게 거는 창의 대상이 enemy_single(공격 뜻)'],
        [t => { t.rows.find(r => r.skill_id === 'war_shout').cast_condition = 'on_death'; }, '차례 스킬의 조건이 사건 이름'],
        [t => { t.rows.find(r => r.skill_id === 'mon_selfdestruct').cast_condition = 'buff_absent'; }, '사건 스킬의 조건이 사건이 아니다'],
        [t => { t.effectRows.push({ ...bash(t), skill_id: 'no_such_skill' }); }, '없는 스킬을 가리키는 줄'],
        [t => { t.effectRows.find(r => r.skill_id === 'mag_focus').status = 'no_such_status'; }, '없는 걸린 효과를 거는 줄'],
        [t => { t.statusRows.push({ ...t.statusRows[0], status_id: 'orphan' }); }, '아무도 안 거는 걸린 효과'],
        [t => { t.statusRows.push({ ...t.statusRows[0] }); }, 'status_id 중복'],
        [t => { t.statusRows.find(r => r.status_id === 'mag_focus').stat = 'nonsense'; }, '걸린 효과의 stat 어휘 밖'],
        // 오오라는 고르는 대상 표를 안 거친다(battle.applyAuras = 자기 또는 편 전체) — 아군 쪽이어도 둘 밖은 조용히 편 전체에 걸렸다 (2026-09-24)
        [t => { t.rows.find(r => r.skill_id === 'kni_might').target = 'ally_single'; }, '오오라 대상 ally_single'],
        [t => { t.rows.find(r => r.skill_id === 'kni_might').target = 'party_adjacent'; }, '오오라 대상 party_adjacent'],
    ];
    for (const [mut, why] of cases) {
        const t = skillTables();
        mut(t);
        let threw = false;
        try { loadSkills(t); } catch (e) { threw = true; }
        if (!threw) fail(`${why} 가 통과했다`);
    }
    // 오오라의 `self` 는 합법이다 — 위 규칙이 넘치게 막지 않는다(던지면 이 단정이 빨갛다)
    const own = skillTables();
    own.rows.find(r => r.skill_id === 'kni_might').target = 'self';
    loadSkills(own);
    return `표 사이 오류 ${cases.length}가지가 전부 로드에서 걸린다 · 오오라 self 는 통과`;
});
/**
 * 표 셋 옮기기 [2026-09-22 · R136 · PLAN_skill_structure 1단계] — 옛 `skill.csv` 한 행을 스킬 · 하는 일 · 걸린 효과로 기계적으로 갈랐다.
 * 대표 정의가 **옮기기 전과 같은 수치**다 — 옛 `kind` 일곱이 (cast, effect) 짝 하나씩으로 섰다.
 * **2단계(표준 모양 · 2026-09-24 R151)** — 여러 줄은 결투 하나다(① 지목 ② 시전자 피해 감소 — 옛 `castBuff` 결투 분기를 데이터로) · 결투 대상은 `enemy_hp_max`.
 * ⚠ 값은 전부 임시다 — 캘리브레이션이 값을 바꾸면 아래 표도 같이 고친다(구조는 그대로)
 */
check('skill: 표 셋 — 여러 줄은 결투 하나(지목 + 시전자 피해 감소 close) · 걸린 효과는 거는 스킬 하나(id 가 같다 · 결투 짝만 제 이름) · 대표 정의 수치 (PLAN_skill_structure 1 · 2단계 · R136 · R151)', () => {
    const S = SYS.skill;
    const multi = S.list.filter(d => d.effects.length !== 1).map(d => d.id);
    if (!eq(multi, ['kni_duel'])) fail(`여러 줄 스킬 [${multi}] — 결투 하나여야 한다`);
    for (const d of S.list) d.effects.forEach((e, i) => { if (e.seq !== i + 1) fail(`${d.id} seq ${d.effects.map(x => x.seq)}`); });
    if (D.skillEffectRows.length !== D.skillRows.length + 1) fail(`줄 ${D.skillEffectRows.length} ≠ 스킬 ${D.skillRows.length} + 결투 둘째 줄 1`);
    const OWN = { kni_duel_guard: 'kni_duel' };                   // 한 스킬이 효과 둘을 걸면 둘째가 제 이름이다
    for (const st of Object.values(S.statuses)) {
        const by = S.list.filter(d => d.effects.some(e => e.status === st.id)).map(d => d.id);
        if (!eq(by, [OWN[st.id] ?? st.id])) fail(`${st.id} 를 거는 스킬 [${by}]`);
    }
    // 결투 둘째 줄 — 시전자 자신 · 받는 피해 감소 · 라운드가 끝나면 닫힌다 · 첫 줄(지목)은 keep
    const guard = S.scaleDef(S.defs.kni_duel, null).effects[1];
    const gw = { effect: 'apply', target: 'self', status: 'kni_duel_guard', stat: 'dr_pct', value: 0.2, dur: 999, roundEnd: 'close' };
    for (const [k, v] of Object.entries(gw)) if (guard?.[k] !== v) fail(`kni_duel 둘째 줄 ${k} ${guard?.[k]} ≠ ${v}`);
    if (skillLine('kni_duel').roundEnd !== 'keep') fail(`결투 지목 창 round_end ${skillLine('kni_duel').roundEnd} — keep 이어야`);
    const want = {
        mag_fireball: { cast: 'turn', effect: 'hit', target: 'enemy_single', hits: 1, mult: 3.1, element: 'fire', cool: 15 },
        mag_chain: { cast: 'turn', effect: 'hit', target: 'enemy_chain', hits: 1, mult: 1.3, decay: 0.3, procChance: 0.1, procMult: 2, element: 'lightning', cool: 9 },
        kni_rush: { effect: 'hit', target: 'enemy_rotate', hits: 4, mult: 0.6 },
        mag_focus: { cast: 'turn', effect: 'apply', target: 'self', stat: 'atk_pct', value: 0.2, dur: 8, cool: 16 },
        kni_enchant: { effect: 'apply', stat: 'onhit_element', value: 0.6, dur: 10, element: 'fire' },
        kni_might: { cast: 'aura', effect: 'apply', target: 'party', stat: 'atk_pct', value: 0.15, dur: 0, cool: 0 },
        pri_penitence: { effect: 'apply', target: 'enemy_all', stat: 'atk_pct', value: -0.25, dur: 10 },
        kni_duel: { effect: 'apply', target: 'enemy_hp_max', stat: 'duel', value: 0.2, dur: 999 },
        pri_heal: { effect: 'heal', target: 'party', mult: 1.6 },
        mag_frozenwall: { effect: 'summon', target: 'self', mult: 0.8 },
        mon_summon_goblin: { cast: 'turn', effect: 'call', target: 'self', cool: 20 },
        mon_selfdestruct: { cast: 'event', effect: 'fixed', target: 'enemy_all', hits: 1, mult: 0.3, cool: 0 },
    };
    for (const [id, w] of Object.entries(want)) {
        const d = S.defs[id];
        if (!d) fail(`${id} 가 없다`);
        const x = skillLine(id);
        const got = { cast: d.cast, effect: x.effect, target: d.target, hits: x.hits, mult: x.mult, decay: x.decay, procChance: x.procChance,
            procMult: x.procMult, element: x.element ?? null, stat: x.stat, value: x.value, dur: x.dur, cool: d.cool };
        for (const [k, v] of Object.entries(w)) if (got[k] !== v) fail(`${id}.${k} ${got[k]} ≠ ${v}`);
    }
    return `스킬 ${S.list.length} · 줄 ${D.skillEffectRows.length} · 걸린 효과 ${Object.keys(S.statuses).length} · 대표 ${Object.keys(want).length}종 수치 그대로`;
});

/* ── 장비 ── */
check('combat: 무기가 공격력을 올린다', () => {
    const h = G.heroes[0];
    const naked = SYS.hero.computeCombat(h, []);
    const armed = SYS.hero.computeCombat(h, [G.items[h.equipped.weapon]]);
    const atk = c => (c.atk_physical ?? c.atk_magic).max;   // 범위 — 최대 끝으로 본다 (R90)
    return atk(armed) > atk(naked) ? `${atk(naked)} → ${atk(armed)}` : false;
});
/*
 * **원소 옵션이 없는 마법 무기의 기본 공격은 물리다** [사용자 지시 2026-09-11 · R80 · battle_design §2-1 · §9-5].
 *   바뀌는 것은 **무엇에 깎이나**뿐이다 — 세기 채널(`atk_magic` = 회복의 밑수)은 그대로 마법이다.
 *   원소를 주는 옵션이 아직 없으므로 `attack_type` 은 어떤 무기에서도 `physical` 이다.
 */
check('combat: 무기군이 물리/마법을 정하지만 attack_type 은 언제나 물리 — 원소는 옵션이 준다 (§2-1 · R80)', () => {
    const h = { ...G.heroes[0], stats: { ...G.heroes[0].stats, int: 20, str: 1 } };
    const staff = SYS.item.startingWeapon(makeRng(2), 'mage');
    if (!['staff', 'orb'].includes(staff.group)) fail(`mage weapon ${staff.group}`);
    if ('element' in staff) fail('마법 무기가 element 를 들었다 — 생성 때 굴리지 않는다 (R80)');
    const c = SYS.hero.computeCombat(h, [staff]);
    // 세기 채널은 여전히 마법이다 — 회복의 밑수(matk)가 여기서 온다
    if (c.atk_magic === undefined || c.atk_physical !== undefined) fail('staff not magic');
    if (c.attack_type !== 'physical') fail(`attack_type ${c.attack_type} — 원소 옵션이 없으면 물리다 (R80)`);
    // 원소를 억지로 박아도 안 읽는다 — 옛 규칙이 되살아날 자리를 막는다
    const forced = SYS.hero.computeCombat(h, [{ ...staff, element: 'fire' }]);
    if (forced.attack_type !== 'physical') fail('item.element 를 아직 읽는다 — R80 미반영');
    const n = SYS.hero.computeCombat(h, []);
    if (n.attack_type !== 'physical') fail('unarmed not physical');
    if (c.action_period > WG[staff.group].period) fail('period from group');
    return `${staff.group} → atk_magic ${c.atk_magic.min}~${c.atk_magic.max} · atkType ${c.attack_type}`;
});
check('combat: 무기가 밑수다 — 무기 접사의 고정 공격력만 오르고 장갑의 것은 안 오른다 (§9-1)', () => {
    const h = G.heroes[0];
    const atk = c => (c.atk_physical ?? c.atk_magic).max;   // 범위 — 최대 끝으로 본다 (R90)
    const w = { ...G.items[h.equipped.weapon], affixes: [] };
    const base = atk(SYS.hero.computeCombat(h, [w]));
    const wPlus = { ...w, affixes: [{ stat: 'atk_flat', v: 5 }] };
    const gloves = mkItem('gloves', [{ stat: 'atk_flat', v: 5 }]);
    const armed = atk(SYS.hero.computeCombat(h, [wPlus]));
    if (!(armed > base)) fail(`무기 접사가 안 걸린다 ${base} → ${armed}`);
    if (atk(SYS.hero.computeCombat(h, [w, gloves])) !== base) fail('무기 외 슬롯의 고정 공격력이 밑수에 더해졌다');
    // 상시 피해 %는 밑수 전체를 곱한다 (반올림 알갱이를 피하려고 큰 밑수로 본다)
    const big = { ...w, ilvl: 60, affixes: [] };            // ~~watk 100~~ — 무기 피해는 파생이라 ilvl 로 키운다 (R90)
    const b100 = atk(SYS.hero.computeCombat(h, [big]));
    const p100 = atk(SYS.hero.computeCombat(h, [{ ...big, affixes: [{ stat: 'atk_pct', v: 1 }] }]));   // +100% = 비율 1 (R111)
    if (Math.abs(p100 - 2 * b100) > 1) fail(`atk_pct 가 밑수를 곱하지 않는다 ${b100} → ${p100}`);
    return `밑수 ${base} · 무기접사 +5 → ${armed} · ilvl60 +100% → ${b100}→${p100}`;
});
check('combat: 원소 저항은 직접 % — res_all + 원소별 접사, 최대 저항 증가·저항 감소는 따로 낸다 (§9-5)', () => {
    // 저항은 비율이다 (R111) — 7% = 0.07
    const armor = mkItem('armor', [{ stat: 'res_all', v: 0.07 }, { stat: 'res_fire', v: 0.05 }]);
    const c = SYS.hero.computeCombat(G.heroes[0], [armor]);
    if ('magic_defense' in c) fail('magic_defense still emitted');
    if (Math.abs(c.res_fire - 0.12) > 1e-12) fail(`res_fire ${c.res_fire}`);
    if (c.res_max_bonus !== 0 || c.res_reduction !== 0) fail('접사 없는데 값이 있다');
    const boosted = SYS.hero.computeCombat(G.heroes[0], [mkItem('amulet', [{ stat: 'res_max_bonus', v: 0.05 }, { stat: 'res_reduction', v: 0.1 }])]);
    if (boosted.res_max_bonus !== 0.05 || boosted.res_reduction !== 0.1) fail('축이 출력되지 않는다');
    return c.res_lightning === 0.07 && c.res_cold === 0.07 && c.res_poison === 0.07;
});
check('combat: 출력에 명중·회피·편차가 없다 (08-26 폐지 — §9-4)', () => {
    const c = SYS.game.heroCombat(G, G.heroes[0]);
    const gone = ['accuracy', 'evasion', 'variance_pct'].filter(k => k in c);
    if (gone.length) fail(`still: ${gone.join(', ')}`);
    if (typeof c.level !== 'number') fail('적중률에 쓸 level 이 없다');
    return true;
});
check('combat: 피해 감소는 원천별 곱 — 접사 10 + 10 → 실효 19% (§9-3)', () => {
    const c = SYS.hero.computeCombat(G.heroes[0], [
        mkItem('armor', [{ stat: 'damage_reduction', v: 0.1 }]),
        mkItem('helmet', [{ stat: 'damage_reduction', v: 0.1 }]),
    ]);
    if (Math.abs(c.damage_reduction - 0.19) > 1e-6) fail(`${c.damage_reduction}`);
    const one = SYS.hero.computeCombat(G.heroes[0], [mkItem('armor', [{ stat: 'damage_reduction', v: 0.1 }])]);
    if (Math.abs(one.damage_reduction - 0.1) > 1e-6) fail(`하나면 ${one.damage_reduction}`);
    return '10+10 → 19%';
});
check('combat: 운은 전투 밖 — 장비가 0이면 0, 접사가 있으면 운 계수가 곱해진다 (hero_design §4-1)', () => {
    const h = { ...G.heroes[0], stats: { ...G.heroes[0].stats, luck: 20 } };
    const bare = SYS.hero.computeCombat(h, []);
    if (bare.gold_find !== 0 || bare.item_find !== 0) fail(`bare ${bare.gold_find}/${bare.item_find}`);
    const geared = SYS.hero.computeCombat(h, [mkItem('boots', [{ stat: 'gold_find', v: 0.1 }, { stat: 'item_find', v: 0.1 }])]);
    if (geared.gold_find <= 0.1 || geared.item_find <= 0.1) fail(`운 계수 미적용 ${geared.gold_find}/${geared.item_find}`);
    // 결과는 1% 단위로 잘린다 (formula.roundPct · R111) — 표기 = 계산
    if (Math.round(geared.gold_find * 100) / 100 !== geared.gold_find) fail(`1% 단위가 아니다 ${geared.gold_find}`);
    // 운은 전투 축에 손대지 않는다
    const lowLuck = SYS.hero.computeCombat({ ...h, stats: { ...h.stats, luck: 1 } }, []);
    if (!eq(lowLuck.atk_physical, bare.atk_physical) || lowLuck.hp_max !== bare.hp_max) fail('운이 전투 능력치를 흔든다');
    return `luck20 · 접사 10% → 골드 획득 ${M.pctNum(geared.gold_find)}%`;
});
/**
 * 능력치 경로 재정리 [확정 2026-09-10 · hero_design §4-1 · battle_design §8·§9-1 · DEV_PLAN R72] —
 * 힘·지능은 공격력에서 빠져 **스킬 계수**로 가고, 건강은 HP 재생을 떠나 **레벨 성장분의 최대 HP** 로 간다.
 * ~~hp_max = hero_hp_base × growth^(lv−1)~~ 단정은 아래 둘째가 대체한다.
 */
check('combat: 공격력은 순수 무기 밑수 — 힘·지능만 다른 두 영웅의 공격력이 같다 (battle_design §9-1 · R72)', () => {
    const h = G.heroes[0];
    const w = G.items[h.equipped.weapon];
    const staff = SYS.item.startingWeapon(makeRng(2), 'mage');
    const lo = { ...h, stats: { ...h.stats, str: 1, int: 1 } };
    const hi = { ...h, stats: { ...h.stats, str: 20, int: 20 } };
    const atk = c => { const r = c.atk_physical ?? c.atk_magic; return `${r.min}~${r.max}`; };   // 범위 — 양끝을 같이 본다 (R90)
    for (const items of [[w], [staff], []]) {
        const a = atk(SYS.hero.computeCombat(lo, items)), b = atk(SYS.hero.computeCombat(hi, items));
        if (a !== b) fail(`${items[0]?.group ?? '맨손'} 힘·지능 1 → ${a} · 20 → ${b} — 능력치가 아직 곱해진다`);
    }
    return `물리 ${atk(SYS.hero.computeCombat(lo, [w]))} · 마법 ${atk(SYS.hero.computeCombat(lo, [staff]))} · 맨손 ${atk(SYS.hero.computeCombat(lo, []))} — 힘·지능 1 과 20 이 같다`;
});
check('combat: hp_max — 레벨 1 은 건강 무관하게 같고 레벨 N 은 구간 단위 누적합 × 건강 계수만큼 갈린다 (hero_design §4-1 · 2026-09-14 · R84)', () => {
    const h = G.heroes[0];
    const at = (lv, vit) => SYS.hero.computeCombat({ ...h, level: lv, stats: { ...h.stats, vit } }, []).hp_max;
    const vitRow = D.heroAttributes.find(a => a.id === 'vit');
    const coef = vit => Number(vitRow.multBasePct) + vit * Number(vitRow.multPerPointPct);   // 비율 (R111)
    // 단정은 레벨업을 하나씩 밟으며 **그 레벨의 구간 키를 직접** 읽는다 — 코드의 누적합 표를 거치지 않는다
    const units = lv => { let s = 0; for (let n = 2; n <= lv; n++) s += B[`hero_hp_band${Math.floor((n - 1) / B.hero_hp_band_levels) + 1}_unit`]; return s; };
    const want = (lv, vit) => Math.round(B.hero_hp_base + units(lv) * coef(vit));
    if (at(1, 1) !== Math.round(B.hero_hp_base) || at(1, 20) !== Math.round(B.hero_hp_base)) fail(`lv1 vit1 ${at(1, 1)} · vit20 ${at(1, 20)} ≠ ${B.hero_hp_base}`);
    const E = B.hero_hp_band_levels, CAP = B.hero_level_cap;
    for (const lv of [2, E, E + 1, CAP]) for (const vit of [1, 10, 20]) if (at(lv, vit) !== want(lv, vit)) fail(`lv${lv} vit${vit} ${at(lv, vit)} ≠ ${want(lv, vit)}`);
    // 구간 안의 상승분은 일정하고 경계에서 다음 구간 단위로 바뀐다 — 건강 16 = 계수 1.0 이 아니어도 되게 계수로 나눠 본다
    const step = lv => (at(lv, 20) - at(lv - 1, 20)) / coef(20);
    const u1 = B.hero_hp_band1_unit, u2 = B.hero_hp_band2_unit;
    if (Math.abs(step(E) - u1) > 1 || Math.abs(step(E + 1) - u2) > 1) fail(`경계 상승분 lv${E} ${step(E)} (단위 ${u1}) · lv${E + 1} ${step(E + 1)} (단위 ${u2})`);
    if (!(at(CAP, 20) > at(CAP, 1))) fail(`만렙에서 건강이 HP 를 안 민다 (${at(CAP, 1)} → ${at(CAP, 20)})`);
    return `lv1 ${at(1, 1)} = ${at(1, 20)} · lv${CAP} vit1 ${at(CAP, 1)} → vit20 ${at(CAP, 20)} · lv${E}→${E + 1} 단위 ${u1} → ${u2}`;
});
check('combat: HP 는 power_growth_per_level 을 안 읽는다 · 구간 키가 만렙을 못 덮으면 생성 때 던진다 · 스테이지 레벨 ≤ 만렙 (R84)', () => {
    const h = G.heroes[0];
    const CAP = B.hero_level_cap;
    const other = buildSystems({ ...D, balance: { ...B, power_growth_per_level: B.power_growth_per_level * 2 } });
    const a = SYS.hero.computeCombat({ ...h, level: CAP }, []).hp_max;
    const b = other.hero.computeCombat({ ...h, level: CAP }, []).hp_max;
    if (a !== b) fail(`성장률을 두 배로 했더니 만렙 HP 가 ${a} → ${b}`);
    let threw = null;
    try { buildSystems({ ...D, balance: { ...B, hero_level_cap: CAP + B.hero_hp_band_levels } }); } catch (e) { threw = String(e.message); }
    if (!threw || !threw.includes('hero_hp_band')) fail(`구간 키가 없는 만렙에서 생성이 안 던졌다 (${threw})`);
    const top = Math.max(...D.stageList.map(s => s.dlvl));
    if (top > CAP) fail(`스테이지 레벨 ${top} 이 만렙 ${CAP} 을 넘는다 — 몬스터 HP 구간이 없다`);
    return `만렙 HP ${a} 불변 · 만렙 +${B.hero_hp_band_levels} 이면 던짐 · 스테이지 레벨 최대 ${top} ≤ ${CAP}`;
});
check('combat: hp_regen 은 건강 무관 — 바탕값 곡선 + 가산뿐 (battle_design §8 · R72)', () => {
    const h = G.heroes[0];
    const at = vit => SYS.hero.computeCombat({ ...h, level: 10, mastery: {}, stats: { ...h.stats, vit } }, []).hp_regen;
    const want = Number((B.hp_regen_base_per_level * Math.pow(B.power_growth_per_level, 9)).toFixed(3));
    if (at(1) !== want || at(20) !== want) fail(`lv10 vit1 ${at(1)} · vit20 ${at(20)} ≠ 바탕값 ${want}`);
    return `lv10 재생 ${want} — 건강 1 과 20 이 같다`;
});
/*
 * ~~마법 무기 개체가 원소를 든다~~ → **[폐기 2026-09-11 · 사용자 지시 · R80]** 생성 때 원소를 굴리지 않는다.
 *   원소는 **관련 옵션이 붙었을 때만** 생기고 드롭의 무작위성은 옵션 굴림이 든다 (item_design §2 · battle_design §9-5).
 *   그래서 이 단정은 **원소가 붙지 않는 것**을 지킨다 — 옛 규칙이 되살아나면 빨간불이다.
 */
check('item: 어느 무기에도 element 가 없다 — 생성 때 원소를 굴리지 않는다 (R80)', () => {
    const rng = makeRng(31);
    let magicSeen = 0, physSeen = 0;
    for (let i = 0; i < 200; i++) {
        const it = SYS.item.rollDrop(rng, 5);
        if (it.slot !== 'weapon') continue;
        if ('element' in it) fail(`${it.group} 이 element 를 들었다 (${it.element})`);
        if (WG[it.group].damageKind === 'magic') magicSeen++; else physSeen++;
    }
    if (!magicSeen || !physSeen) fail(`표본 부족 magic=${magicSeen} phys=${physSeen}`);
    // 시작 무기도 같다 — 경로가 둘이라 한쪽만 고치면 갈린다
    for (const cls of ['mage', 'priest', 'warrior']) if ('element' in SYS.item.startingWeapon(makeRng(9), cls)) fail(`시작 무기(${cls})에 element`);
    return `마법 무기 ${magicSeen}개 · 물리 ${physSeen}개 — 전부 원소 없음`;
});
/*
 * **`rollGear` — 한 벌** [신설 2026-09-11 · R79]. 몬스터가 입는 장비이고 드롭은 그중 하나가 그대로 나간다.
 *   ① 부위 배열 **순서대로** 그 부위의 아이템이 나온다 ② `weaponGroup` 을 주면 무기군을 **굴리지 않는다**
 *   ③ `rareBonusPct` 는 `magicFind` 와 같은 채널이다 ④ `rollDrop` 은 부위 1회를 앞에 붙인 것과 **수열이 같다**
 */
check('item: rollGear — 부위 배열 순서대로 한 벌 · weaponGroup 고정 시 무기군을 안 굴린다 (R79)', () => {
    const slots = ['weapon', 'helmet', 'armor', 'amulet', 'ring'];
    const set = SYS.item.rollGear(makeRng(77), { slots, ilvl: 12, weaponGroup: 'axe' });
    if (set.length !== slots.length) fail(`${set.length} ≠ ${slots.length}`);
    set.forEach((it, i) => {
        if (it.slot !== slots[i]) fail(`자리 ${i} ${it.slot} ≠ ${slots[i]}`);
        if (it.ilvl !== 12) fail(`ilvl ${it.ilvl}`);
        if (it.up !== 0) fail('드롭은 강화 0 이다');
    });
    if (set[0].group !== 'axe') fail(`무기군 ${set[0].group} ≠ axe`);
    // 무기군을 안 주면 굴린다 — 그래서 **같은 시드에서 수열이 한 칸 밀린다**
    const rolled = SYS.item.rollGear(makeRng(77), { slots: ['weapon'], ilvl: 12 });
    const fixed = SYS.item.rollGear(makeRng(77), { slots: ['weapon'], ilvl: 12, weaponGroup: 'axe' });
    if (eq(rolled, fixed)) fail('weaponGroup 을 줘도 무기군을 굴린다 — 소비 수가 같아졌다');
    // rollDrop = 부위 1회 + rollGear 한 벌. 부위를 맞춰 주면 나머지가 **글자 하나까지** 같아야 한다
    const r1 = makeRng(55), r2 = makeRng(55);
    const drop = SYS.item.rollDrop(r1, 8);
    const gear = SYS.item.rollGear(r2, { slots: [drop.slot], ilvl: 8 })[0];
    r2();                                                     // 부위 굴림 1회를 뒤늦게 태워 수열을 맞춘다(대조용)
    if (drop.slot !== gear.slot) return `부위가 갈려 대조 생략 (${drop.slot}/${gear.slot})`;
    return `한 벌 ${set.length}부위 · rollDrop 위임 확인 (${drop.slot})`;
});
check('item: rollGear — 등급 레어 가중(gear_rare_bonus_pct)이 매직찬스와 같은 채널이다 (R79)', () => {
    const rate = bonus => {
        const rng = makeRng(88);
        let rare = 0;
        for (let i = 0; i < 1500; i++) if (SYS.item.rollGear(rng, { slots: ['armor'], ilvl: 5, rareBonusPct: bonus })[0].rarity === 'rare') rare++;
        return rare / 1500;
    };
    const lo = rate(0), hi = rate(2.5);                             // +250% = 비율 2.5 (R111)
    if (!(hi > lo + 0.1)) fail(`등급 보너스가 안 먹는다 ${(lo * 100).toFixed(1)}% → ${(hi * 100).toFixed(1)}%`);
    // magicFind 와 같은 채널 — 같은 값이면 같은 결과여야 한다
    const rngA = makeRng(89), rngB = makeRng(89);
    const a = SYS.item.rollGear(rngA, { slots: ['armor'], ilvl: 5, rareBonusPct: 1 })[0];
    const b = SYS.item.rollGear(rngB, { slots: ['armor'], ilvl: 5, magicFind: 1 })[0];
    if (!eq(a, b)) fail('rareBonusPct 와 magicFind 가 다른 채널이다');
    return `레어 ${(lo * 100).toFixed(1)}% → ${(hi * 100).toFixed(1)}% (+250%)`;
});
check('item: 무기 피해는 범위이고 파생이다 — 같은 무기군 · 같은 ilvl 이면 같은 범위 · 아이템에 박히지 않는다 · 양끝 정수 (battle_design §9-1 · R90)', () => {
    const rng = makeRng(41);
    const ILVL = 10;
    const byGroup = {};
    let n = 0;
    for (let i = 0; i < 400; i++) {
        const it = SYS.item.rollDrop(rng, ILVL);
        if (it.slot !== 'weapon') continue;
        n++;
        if ('watk' in it) fail(`${it.group} 에 watk 가 박혔다 — 무기 피해는 파생이다`);
        const d = SYS.item.weaponDamage(it);
        const mid = bandMid(ILVL);
        const v = WG[it.group].variance ?? B.dmg_variance_pct;          // 비율 (R111)
        if (d.min !== Math.max(1, Math.round(mid * (1 - v))) || d.max !== Math.max(d.min, Math.round(mid * (1 + v))))
            fail(`${it.group} ${d.min}~${d.max} ≠ round(${mid.toFixed(2)} × (1 ∓ ${v}))`);
        if (!Number.isInteger(d.min) || !Number.isInteger(d.max) || d.min < 1 || d.max < d.min) fail(`양끝 규칙 ${d.min}~${d.max}`);
        const key = `${d.min}~${d.max}`;
        if (byGroup[it.group] && byGroup[it.group] !== key) fail(`${it.group} 같은 ilvl 인데 범위가 갈린다 ${byGroup[it.group]} vs ${key}`);
        byGroup[it.group] = key;
    }
    if (n < 10) fail(`무기 표본 부족 ${n}`);
    if (SYS.item.weaponDamage(mkItem('boots', [])) !== null) fail('무기가 아닌데 범위가 났다');
    return Object.entries(byGroup).map(([g, k]) => `${g} ${k}`).join(' · ');
});
check('item: 무기 피해 범위는 성장 곡선을 탄다 — ilvl 이 오르면 대역이 통째로 올라간다 (§9-0 · R90)', () => {
    const mace = { slot: 'weapon', group: 'mace', up: 0 };
    const lo = SYS.item.weaponDamage({ ...mace, ilvl: 1 }), hi = SYS.item.weaponDamage({ ...mace, ilvl: 20 });
    if (!(hi.min > lo.max)) fail(`대역이 겹친다 ilvl1 ${lo.min}~${lo.max} vs ilvl20 ${hi.min}~${hi.max}`);
    return `mace ilvl1 ${lo.min}~${lo.max} · ilvl20 ${hi.min}~${hi.max}`;
});
check('item: weaponDamageFixed — 무기 피해 양끝 × (1 + 고정 「데미지 +%」) 를 한 번 반올림 · 다른 출처 % 는 안 든다 · 고정 줄 하나만 낀 영웅의 공격력과 같다 (툴팁 메인 옵션 · 2026-09-23)', () => {
    const rng = makeRng(43);
    const h = G.heroes[0];
    let n = 0, same = 0, sample = '';
    for (let i = 0; i < 400; i++) {
        const it = SYS.item.rollDrop(rng, 10);
        if (it.slot !== 'weapon') continue;
        n++;
        const fixed = it.affixes.find(a => a.src === 'fixed');
        const d = SYS.item.weaponDamage(it), got = SYS.item.weaponDamageFixed(it);
        const want = { min: Math.round(d.min * (1 + fixed.v)), max: Math.round(d.max * (1 + fixed.v)) };
        if (got.min !== want.min || got.max !== want.max) fail(`${it.group} ${got.min}~${got.max} ≠ ${want.min}~${want.max} (고정 ${fixed.v})`);
        // 전투와 같은 숫자 — 고정 줄 하나만 남긴 무기를 낀 영웅. 마스터리 등 다른 % 가 괄호에 들면 비교할 수 없어 건너뛴다
        const c = SYS.hero.computeCombat(h, [{ ...it, affixes: [fixed] }]);
        if (c.atk_pct_sum === fixed.v) {
            same++;
            const a = c.atk_physical ?? c.atk_magic;
            if (a.min !== got.min || a.max !== got.max) fail(`전투 ${a.min}~${a.max} ≠ 툴팁 ${got.min}~${got.max}`);
        }
        if (!sample) sample = `${it.group} ${d.min}~${d.max} +${Math.round(fixed.v * 100)}% → ${got.min}~${got.max}`;
    }
    if (n < 10) fail(`무기 표본 부족 ${n}`);
    if (!same) fail('전투 대조 표본이 없다');
    const w = { slot: 'weapon', group: 'mace', ilvl: 20, up: 0 };
    const bare = SYS.item.weaponDamage(w), noFixed = SYS.item.weaponDamageFixed({ ...w, affixes: [{ stat: 'atk_pct', v: 1, src: 'random' }] });
    if (noFixed.min !== bare.min || noFixed.max !== bare.max) fail('고정이 아닌 데미지 % 가 들었다');
    if (SYS.item.weaponDamageFixed(mkItem('boots', [])) !== null) fail('무기가 아닌데 범위가 났다');
    return `무기 ${n} · 전투 대조 ${same} · 예 ${sample}`;
});
check('item: implicitFixed — 방어구 고유값(강화까지) × (1 + 고정 「방어력 +%」) 를 한 번 반올림 · 그 방어구 하나를 낀 영웅의 방어력 증가분과 같다 · 무기 · 목걸이 · 반지는 null (툴팁 메인 옵션 · 제련소 · 2026-09-23)', () => {
    const rng = makeRng(45);
    const h = { ...G.heroes[0], mastery: {} };
    const bareDef = SYS.hero.computeCombat(h, []).defense;
    let n = 0, sample = '';
    for (let i = 0; i < 400; i++) {
        const drop = SYS.item.rollDrop(rng, 20);
        const fixed = drop.affixes.find(a => a.src === 'fixed');
        if (!drop.implicit || !fixed) continue;
        n++;
        const it = { ...drop, up: i % 3, affixes: [fixed] };      // 강화 0 ~ 2 — 강화 배율도 같이 먹는지 본다
        const eff = SYS.item.effective(it).implicit, got = SYS.item.implicitFixed(it);
        if (got.stat !== eff.stat || got.v !== Math.round(eff.v * (1 + fixed.v))) fail(`${it.slot} ${got.v} ≠ round(${eff.v} × (1 + ${fixed.v}))`);
        const gain = SYS.hero.computeCombat(h, [SYS.item.effective(it)]).defense - bareDef;
        if (gain !== got.v) fail(`${it.slot} +${it.up} 전투 방어 +${gain} ≠ 툴팁 ${got.v}`);
        if (!sample) sample = `${it.slot} +${it.up} ${eff.v} +${Math.round(fixed.v * 100)}% → ${got.v}`;
    }
    if (n < 10) fail(`방어구 표본 부족 ${n}`);
    for (const slot of ['weapon', 'amulet', 'ring']) if (SYS.item.implicitFixed(mkItem(slot, [])) !== null) fail(`${slot} 에 고유값이 났다`);
    return `방어구 ${n} · 예 ${sample}`;
});
check('item: 방어구 고유값 — 부위 배수 × 그 부위 갈래 계수 × 10레벨 구간 직선 · 개체 굴림 없음 · 목걸이·반지는 없다 (2026-09-16 · R108 · 편차 폐지 · 네 부위 갈래 2026-09-18)', () => {
    const rng = makeRng(47);
    const coef = (slot, group) => (group ? AGROUP[slot]?.[group]?.defMult : 1);
    const seen = {};
    for (const ILVL of [8, 15, 35, 55]) {
        for (let i = 0; i < 200; i++) {
            const it = SYS.item.rollDrop(rng, ILVL);
            if (['weapon', 'amulet', 'ring'].includes(it.slot)) { if (it.implicit) fail(`${it.slot} 에 implicit 이 있다`); continue; }
            if (!it.implicit || it.implicit.stat !== 'def_flat') fail(`${it.slot} implicit ${JSON.stringify(it.implicit)}`);
            const k = coef(it.slot, it.group);
            if (typeof k !== 'number') fail(`${it.slot} 갈래 '${it.group}' 의 계수가 armor_group.csv 에 없다`);
            const want = Math.max(1, Math.round(F.armorDefense(ILVL, B[`armor_def_slot_${it.slot}`], k)));
            if (it.implicit.v !== want) fail(`${it.slot}/${it.group ?? '-'} ilvl ${ILVL} def ${it.implicit.v} ≠ ${want} — 개체 편차는 폐지됐다`);
            seen[`${it.slot}/${it.group ?? '-'}@${ILVL}`] = it.implicit.v;
        }
    }
    // 갈래 계수의 순서 — 투구 플레이트 > 가죽 > 티아라 · 장갑 건틀릿 > 가죽 · 신발 그리브스 > 가죽 (사용자 값: 갑옷 부위를 1 로 놓고 0.5/0.2/0.1 · 0.3/0.1)
    const at = (slot, g) => Math.round(F.armorDefense(55, B[`armor_def_slot_${slot}`], AGROUP[slot][g].defMult));
    if (!(at('helmet', 'plate') > at('helmet', 'leather') && at('helmet', 'leather') > at('helmet', 'tiara'))) fail('투구 갈래 계수 순서');
    if (!(at('gloves', 'gauntlet') > at('gloves', 'leather') && at('boots', 'greaves') > at('boots', 'leather'))) fail('장갑 · 신발 갈래 계수 순서');
    if (at('helmet', 'plate') * 2 !== Math.round(F.armorDefense(55, B.armor_def_slot_armor, 1))) fail(`플레이트 투구 = 갑옷 부위의 절반이어야 ${at('helmet', 'plate')}`);
    return `${Object.keys(seen).length}칸 · 투구 ilvl55 ${at('helmet', 'plate')}/${at('helmet', 'leather')}/${at('helmet', 'tiara')} · 장갑 ${at('gloves', 'gauntlet')}/${at('gloves', 'leather')}`;
});
check('item: 장비 옵션 값 — 고정값은 정수 · 퍼센트는 1% 단위 비율 · 강화까지 먹인 값도. 오만 「레벨당 데미지 +%」(fine)만 0.1% 단위 (2026-09-16 사용자 지시 · 2026-09-17 R111)', () => {
    const rng = makeRng(91);
    let n = 0, fine = 0, upd = 0, pct = 0;
    const onStep = (v, k) => Math.abs(Math.round(v * k) / k - v) < 1e-12;
    // 비율 상한 — 고정 옵션이 1~200% 를 굴린다(2026-09-21 사용자 지시 · balance 키). 옛 눈금(0~100)을 잡는 그물은 그대로다
    const PCT_CAP = Math.max(1, B.weapon_fixed_atk_pct_max, B.armor_fixed_def_pct_max);
    // fine(0.1% 단위)은 옵션 표가 정한다 — 오만 「레벨당 데미지」(무기 · 장갑) · 「레벨당 공격 속도」(신발 · 2026-09-18)
    const FINE = new Set([...D.weaponSinOptions, ...D.weaponCommonOptions, ...D.armorSinOptions, ...D.armorCommonOptions,
        ...D.accessorySinOptions, ...D.accessoryCommonOptions].filter(d => d.scale === 'fine').map(d => d.stat));
    for (let i = 0; i < 600; i++) {
        const it = SYS.item.rollDrop(rng, 1 + (i % 70));
        if (it.implicit && !Number.isInteger(it.implicit.v)) fail(`${it.slot} implicit ${it.implicit.v}`);
        for (const a of it.affixes ?? []) {
            if (FINE.has(a.stat)) {                                      // fine — 1% 보다 작은 값이 본질이라 보류 중
                if (!onStep(a.v, 1000) || !(a.v > 0 && a.v < 0.01)) fail(`${it.slot} fine ${a.stat} ${a.v} — 0.1% 단위 · 1% 미만이어야`);
                fine++; continue;
            }
            if (SYS.item.pctStat(a.stat)) {
                if (!onStep(a.v, 100) || !(a.v >= 0.01 && a.v <= PCT_CAP)) fail(`${it.slot} ${a.stat} = ${a.v} — 1% 단위 비율 · ${PCT_CAP} 이하여야`);
                pct++;
            } else if (!Number.isInteger(a.v)) fail(`${it.slot} ${a.stat} = ${a.v}`);
            n++;
        }
        if (!SYS.item.upgradeable(it)) continue;
        const eff = SYS.item.effective({ ...it, up: B.equip_upgrade_max });
        if (eff.implicit && !Number.isInteger(eff.implicit.v)) fail(`${it.slot} +${B.equip_upgrade_max} implicit ${eff.implicit.v}`);
        upd++;
    }
    if (n < 100 || upd < 50 || pct < 50) fail(`표본 부족 옵션 ${n}(퍼센트 ${pct}) · 강화 ${upd}`);
    return `옵션 ${n}개(퍼센트 ${pct}) · 강화본 ${upd}개 정수 · fine 예외 ${fine}개`;
});
check('item: 접사 3분류 — flat · fine 은 ilvl 60 에서도 굴림 범위 안 · band 는 ilvl 가산 · growth 는 ilvl 로 커진다 (item_design §2-1)', () => {
    // 부위와 출처가 정의 표를 고른다 (R78 · 방어구 2026-09-18) — 같은 stat 이라도 표마다 범위가 다르다
    const isArmor = s => !['weapon', 'amulet', 'ring'].includes(s);
    const FIXED_W = { scale: 'flat', min: B.weapon_fixed_atk_pct_min, max: B.weapon_fixed_atk_pct_max };
    const FIXED_A = { scale: 'flat', min: B.armor_fixed_def_pct_min, max: B.armor_fixed_def_pct_max };
    const defOf = (it, a) => {
        if (a.src === 'fixed') return it.slot === 'weapon' ? FIXED_W : FIXED_A;
        if (a.src === 'random') return it.slot === 'weapon' ? D.weaponCommonOptions.find(d => d.stat === a.stat)
            : isArmor(it.slot) ? D.armorCommonOptions.find(d => d.slot === it.slot && d.stat === a.stat)
                : D.accessoryCommonOptions.find(d => d.stat === a.stat);            // ~~affixDefs~~ R127 — 반지 · 목걸이 한 풀
        return it.slot === 'weapon' || it.slot === 'gloves' ? D.weaponSinOptions.find(d => d.sin === a.src && d.stat === a.stat)
            : isArmor(it.slot) ? D.armorSinOptions.find(d => d.slot === it.slot && d.sin === a.src && d.stat === a.stat)
                : D.accessorySinOptions.find(d => d.slot === it.slot && d.sin === a.src && d.stat === a.stat);
    };
    const inRange = (d, v, ilvl) => (d.scale === 'flat' || d.scale === 'fine')
        ? v >= F.roundPct(d.min, d.scale === 'fine') && v <= F.roundPct(d.max, d.scale === 'fine')
        : d.scale === 'band' ? v >= Math.max(1, Math.round(d.min + ilvl * d.perIlvl)) && v <= Math.round(d.max + ilvl * d.perIlvl)
            : v >= Math.max(1, Math.round(d.min * F.growthMult(ilvl))) && v <= Math.max(1, Math.round(d.max * F.growthMult(ilvl)));
    const growth = {};
    for (const [seed, ilvl] of [[53, 1], [59, 60]]) {
        const rng = makeRng(seed);
        for (let i = 0; i < 400; i++) {
            const it = SYS.item.rollDrop(rng, ilvl);
            for (const a of it.affixes) {
                const d = defOf(it, a);
                if (!d) fail(`${it.slot} ${a.src}/${a.stat} 의 정의 행이 없다`);
                if (!inRange(d, a.v, ilvl)) fail(`ilvl${ilvl} ${it.slot} ${a.src}/${a.stat} ${a.v} 가 ${d.scale} 대역 밖 [${d.min}, ${d.max}] — % 접사가 ilvl 을 타면 여기서 걸린다`);
                if (d.scale === 'growth') (growth[a.stat] ??= {})[ilvl] = Math.max(growth[a.stat][ilvl] ?? 0, a.v);
            }
        }
    }
    // growth 는 ilvl 로 커진다 — 곱셈 곡선(growthMult)이 ilvl 60 에서 수십 배다 (하한 1 에 걸린 작은 굴림도 커진다)
    for (const [stat, g] of Object.entries(growth))
        if (g[1] !== undefined && g[60] !== undefined && !(g[60] > g[1])) fail(`${stat} 이 ilvl 로 안 큰다 (${g[1]} → ${g[60]})`);
    return `growth ${Object.keys(growth).join('/')} · 표 전부 대역 안`;
});
check('item: 명중·회피 접사는 400개 드롭에 하나도 없다 (08-26 폐지)', () => {
    const rng = makeRng(61);
    let n = 0;
    for (let i = 0; i < 400; i++) {
        for (const a of SYS.item.rollDrop(rng, 12).affixes) {
            if (['accuracy', 'evasion'].includes(a.stat)) fail(`${a.stat} 이 떴다`);
            n++;
        }
    }
    return `${n}개 접사 확인`;
});
check('item: 접사 죄종은 목록(세트포인트 없음) — 양손 2포인트·메인 죄종 +1 도 없다', () => {
    const rng = makeRng(21);
    for (let i = 0; i < 40; i++) {
        const it = SYS.item.rollDrop(rng, 5);
        if (!Array.isArray(it.sins) || it.sins.length > 2 || new Set(it.sins).size !== it.sins.length) fail(`sins ${JSON.stringify(it.sins)}`);
        if (it.slot === 'weapon' && (it.period !== undefined || it.cls !== undefined)) fail('weapon carries period/cls — group 에서 읽어야 한다');
        if (it.slot === 'weapon' && WG[it.group]?.release !== 'main') fail(`expansion group dropped: ${it.group}`);
    }
    return SYS.game.setPoints === undefined;
});
check('item: 죄종 수는 희귀도가 정한다 — 일반 0 · 매직 1 · 레어 2 · 일반은 이름에 태그가 없다 (item_design §1 · R77 · R86)', () => {
    const rng = makeRng(77);
    const seen = { normal: 0, magic: 0, rare: 0 };
    for (let i = 0; i < 400; i++) {
        const it = SYS.item.rollDrop(rng, 5);
        const want = it.rarity === 'rare' ? 2 : it.rarity === 'magic' ? 1 : 0;
        if (it.sins.length !== want) fail(`${it.rarity} 인데 죄종 ${it.sins.length}개: ${JSON.stringify(it.sins)}`);
        if (it.rarity === 'normal' && (it.name.ko.includes('[') || it.name.en.includes('['))) fail(`일반인데 이름에 태그가 있다: ${it.name.ko}`);
        seen[it.rarity]++;
    }
    if (!seen.normal || !seen.magic || !seen.rare) fail(`표본에 등급이 비었다: ${JSON.stringify(seen)}`);
    const sw = SYS.item.startingWeapon(makeRng(3), 'warrior');
    if (sw.rarity !== 'normal' || sw.sins.length !== 0) fail(`시작 무기 ${sw.rarity} · 죄종 ${JSON.stringify(sw.sins)}`);
    return `normal ${seen.normal} · magic ${seen.magic} · rare ${seen.rare}`;
});
/**
 * 아이템 이름 = 「A와 B의 베이스」 [2026-09-19 · 사용자 확정 · item_design §1 「이름」 · R118].
 * 죄종마다 단어 넷(`sin_word.csv`) · 단 번호는 그 죄종 굴림의 소수부(rng 소비 0) · 화면은 `sinPhrase` 조각으로 죄종 단어를 칠한다.
 */
check('csv: sin_word — 죄종마다 단이 같은 수 · 첫 단 = 원래 죄종 이름(ko · adj) · 단어가 서로 겹치지 않는다 (item_design §1 「이름」 · R118)', () => {
    const sins = Object.keys(M.SINS);
    const n = D.sinWords[sins[0]]?.length ?? 0;
    if (n < 2) fail(`단 수 ${n}`);
    const all = [];
    for (const sin of sins) {
        const ws = D.sinWords[sin] ?? [];
        if (ws.length !== n) fail(`${sin} 단 ${ws.length} ≠ ${n}`);
        if (ws[0].ko !== M.SINS[sin].ko || ws[0].en !== M.SINS[sin].adj) fail(`${sin} 첫 단 ${ws[0].ko}/${ws[0].en} ≠ ${M.SINS[sin].ko}/${M.SINS[sin].adj}`);
        if (SYS.naming.wordCount(sin) !== n) fail(`wordCount(${sin}) ${SYS.naming.wordCount(sin)}`);
        all.push(...ws);
    }
    for (const lang of ['ko', 'en']) {
        const dup = all.map(w => w[lang]).filter((w, i, a) => a.indexOf(w) !== i);
        if (dup.length) fail(`${lang} 단어가 겹친다: ${dup.join(', ')}`);
    }
    return `${sins.length} 죄종 × ${n} 단`;
});
check('item: 이름 = 「A와 B의 베이스」 · 영어도 죄종 단어가 앞 — words 는 sins 와 같은 길이 · 이름 앞머리 = sinPhrase · 대괄호 없음 (item_design §1 「이름」 · R118)', () => {
    const rng = makeRng(119);
    const seen = { magic: 0, rare: 0 };
    for (let i = 0; i < 300; i++) {
        const it = SYS.item.rollDrop(rng, 5);
        if (!Array.isArray(it.words) || it.words.length !== it.sins.length) fail(`words ${JSON.stringify(it.words)} · sins ${JSON.stringify(it.sins)}`);
        it.sins.forEach((sin, k) => { if (!(it.words[k] >= 0 && it.words[k] < SYS.naming.wordCount(sin))) fail(`단 번호 ${it.words[k]} (${sin})`); });
        if (/[[\]]/.test(it.name.ko + it.name.en)) fail(`대괄호가 남았다: ${it.name.ko}`);
        const p = SYS.naming.sinPhrase(it.sins[0] ?? null, it.sins[1] ?? null, it.words);
        for (const lang of ['ko', 'en']) {
            const head = p[lang].map(x => x.t).join('');
            if (!it.name[lang].startsWith(head) || it.name[lang].length <= head.length) fail(`${lang} 이름 「${it.name[lang]}」이 앞머리 「${head}」로 시작하지 않는다`);
            if (p[lang].filter(x => x.sin).map(x => x.sin).join() !== it.sins.join()) fail(`${lang} 죄종 조각 ${JSON.stringify(p[lang])} ≠ ${it.sins}`);
        }
        if (it.rarity in seen) seen[it.rarity]++;
    }
    if (!seen.magic || !seen.rare) fail(`표본 ${JSON.stringify(seen)}`);
    return `magic ${seen.magic} · rare ${seen.rare}`;
});
check('naming: 「와 / 과」는 앞 단어의 받침이 가른다 · 매직은 「의」 · 영어는 「A and B Base」 (item_design §1 「이름」 · R118)', () => {
    const N = SYS.naming, base = { ko: '베이스', en: 'Base' };
    // 받침 판정은 여기서 따로 한다 — 한글 음절표(가 ~ 힣)에서 종성 자리를 읽는다
    const batchim = w => { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0; };
    const sins = Object.keys(M.SINS), other = s => sins.find(x => x !== s);
    const used = { 와: 0, 과: 0 };
    for (const sin of sins) D.sinWords[sin].forEach((w, i) => {
        const suf = other(sin), b = D.sinWords[suf][0];
        const rare = N.composeName(sin, base, suf, [i, 0]);
        const j = batchim(w.ko) ? '과' : '와';
        used[j]++;
        if (rare.ko !== `${w.ko}${j} ${b.ko}의 베이스`) fail(`ko ${rare.ko}`);
        if (rare.en !== `${w.en} and ${b.en} Base`) fail(`en ${rare.en}`);
        const magic = N.composeName(sin, base, null, [i]);
        if (magic.ko !== `${w.ko}의 베이스` || magic.en !== `${w.en} Base`) fail(`매직 ${magic.ko} / ${magic.en}`);
    });
    const plain = N.composeName(null, base, null, []);
    if (plain.ko !== '베이스' || plain.en !== 'Base') fail(`일반 ${plain.ko}`);
    if (!used.와 || !used.과) fail(`표에 한쪽 조사만 나온다 — 판정이 안 걸린다 ${JSON.stringify(used)}`);
    return `와 ${used.와} · 과 ${used.과}`;
});
check('item: 이름 단어의 단은 넷 중 고르게 나온다 — 죄종 굴림의 소수부 · 고른 죄종과 독립 (⚠ 임시 — 밸런싱 전 · 사용자 지시 · R118)', () => {
    const rng = makeRng(4242);
    const n = SYS.naming.wordCount('wrath');
    const byTier = Array(n).fill(0), bySinTier = {};
    let total = 0;
    for (let i = 0; i < 3000; i++) {
        const it = SYS.item.rollDrop(rng, 20);
        it.sins.forEach((sin, k) => { byTier[it.words[k]]++; (bySinTier[sin] ??= Array(n).fill(0))[it.words[k]]++; total++; });
    }
    const exp = total / n;
    byTier.forEach((c, t) => { if (Math.abs(c - exp) > exp * 0.12) fail(`단 ${t + 1} ${c} — 기대 ${exp.toFixed(0)} ±12%`); });
    for (const [sin, cs] of Object.entries(bySinTier)) if (cs.some(c => c === 0)) fail(`${sin} 에서 안 나오는 단이 있다 ${cs}`);
    return `죄종 칸 ${total} · 단별 ${byTier.join(' / ')}`;
});
check('csv: 무기 옵션 표 둘 — 본편 무기군마다 죄종 7 전부 칸이 있다 · 통합 종류가 개수 이상 · 라벨이 있다 (item_design §1 「무기 옵션」 · R78)', () => {
    const groups = Object.values(WG).filter(g => g.release === 'main');
    const applies = (r, g) => r.appliesTo === 'all' || r.appliesTo === g.damageKind || g.classes.includes(r.appliesTo);
    for (const sin of Object.keys(M.SINS)) for (const g of groups)
        if (!D.weaponSinOptions.some(r => r.sin === sin && applies(r, g))) fail(`${sin} 칸이 ${g.id} 에 없다`);
    for (const r of [...D.weaponSinOptions, ...D.weaponCommonOptions]) if (!M.AFFIX_LABELS[r.stat]) fail(`라벨 없음: ${r.stat}`);
    for (const g of groups) {
        const fams = new Set(D.weaponCommonOptions.filter(r => applies(r, g)).map(r => r.family));
        if (fams.size < Math.max(B.weapon_common_opt_normal, B.weapon_common_opt_magic, B.weapon_common_opt_rare)) fail(`${g.id} 통합옵션 종류 ${fams.size} < 개수`);
    }
    const envy = id => D.weaponSinOptions.filter(r => r.sin === 'envy' && applies(r, WG[id])).map(r => r.stat).sort().join('+');
    if (envy('axe') !== 'def_ignore' || envy('bow') !== 'def_ignore') fail(`물리 시기 ${envy('axe')} · ${envy('bow')}`);
    if (envy('staff') !== 'res_reduction') fail(`마법사 시기 ${envy('staff')}`);
    if (envy('bible') !== 'atk_down_mag_pct+atk_down_phys_pct') fail(`사제 시기 ${envy('bible')}`);
    return `죄종 칸 ${D.weaponSinOptions.length} · 통합 ${D.weaponCommonOptions.length}`;
});
check('item: 무기 옵션은 세 층 — 고정 1 + 죄종 칸(죄종마다 1) + 통합옵션 키 개수 · 출처 순서 · 갈래가 맞는 행만 (R78)', () => {
    const rng = makeRng(78);
    let n = 0;
    for (let i = 0; i < 800 && n < 150; i++) {
        const it = SYS.item.rollDrop(rng, 20);
        // 방어구 네 부위(2026-09-18) · 목걸이 · 반지(2026-09-21 · R127)도 세 층이다 — 각자의 단정(「방어구 옵션은 세 층」 · 「반지 · 목걸이 옵션은 세 층」)이 든다
        if (it.slot !== 'weapon') continue;
        n++;
        const g = WG[it.group];
        const applies = r => r.appliesTo === 'all' || r.appliesTo === g.damageKind || g.classes.includes(r.appliesTo);
        const common = it.rarity === 'rare' ? B.weapon_common_opt_rare : it.rarity === 'normal' ? B.weapon_common_opt_normal : B.weapon_common_opt_magic;
        const want = ['fixed', ...it.sins, ...Array(common).fill('random')];
        const src = it.affixes.map(a => a.src);
        if (!eq(src, want)) fail(`${it.rarity} ${it.group} 출처 ${src.join(',')} ≠ ${want.join(',')}`);
        const fixed = it.affixes[0];
        if (fixed.stat !== 'atk_pct' || fixed.v < B.weapon_fixed_atk_pct_min || fixed.v > B.weapon_fixed_atk_pct_max) fail(`고정 옵션 ${JSON.stringify(fixed)}`);
        it.sins.forEach((sin, k) => {
            const a = it.affixes[1 + k];
            if (!D.weaponSinOptions.some(r => r.sin === sin && r.stat === a.stat && applies(r))) fail(`${it.group} ${sin} 칸에 ${a.stat}`);
        });
        const fams = it.affixes.slice(1 + it.sins.length).map(a => D.weaponCommonOptions.find(r => r.stat === a.stat && applies(r))?.family);
        if (fams.some(f => !f)) fail(`${it.group} 통합옵션이 표 밖이거나 갈래가 안 맞는다`);
        if (new Set(fams).size !== fams.length) fail(`${it.group} 같은 종류가 두 번: ${fams.join(',')}`);
    }
    if (n < 50) fail(`무기 표본 ${n}`);
    const sw = SYS.item.startingWeapon(makeRng(4), 'mage');
    // 시작 무기는 일반이라 죄종 칸이 없다 (2026-09-14 · R86)
    if (!eq(sw.affixes.map(a => a.src), ['fixed', ...Array(B.weapon_common_opt_normal).fill('random')])) fail(`시작 무기 ${JSON.stringify(sw.affixes)}`);
    return `무기 ${n}개`;
});
check('item: 매직아이템 획득확률은 레어 가중치에 곱한다 — 0 이면 수열이 그대로다 (R78)', () => {
    const count = mf => { const rng = makeRng(90); let rare = 0; for (let i = 0; i < 2000; i++) if (SYS.item.rollDrop(rng, 5, { magicFind: mf }).rarity === 'rare') rare++; return rare; };
    const r0 = count(0), r100 = count(1);                            // +100% = 비율 1 (R111)
    if (!(r100 > r0)) fail(`레어 ${r0} → ${r100}`);
    if (!eq(SYS.item.rollDrop(makeRng(91), 5), SYS.item.rollDrop(makeRng(91), 5, { magicFind: 0 }))) fail('magicFind 0 이 수열을 바꿨다');
    return `레어 ${r0} → ${r100} / 2000`;
});

/* ── 방어구 옵션 세 층 · 티어 · 갈래 (item_design §1 「갑옷 옵션」 · 「투구 옵션」 · 장갑 · 신발 갈래 · 2026-09-18 사용자 확정) ── */
const ARMOR_PARTS = ['armor', 'helmet', 'gloves', 'boots'];
check('csv: 방어구 옵션 표 둘 — 갑옷 · 투구 · 신발은 죄종 7 전부 · 장갑은 행 없음(무기 표 ⚠임시) · 공통옵션 종류가 개수 이상(갈래마다) · 라벨 · item_base 의 갈래가 armor_group 에 있다 (2026-09-18)', () => {
    const sins = Object.keys(M.SINS);
    for (const slot of ['armor', 'helmet', 'boots']) for (const sin of sins)
        if (!D.armorSinOptions.some(r => r.slot === slot && r.sin === sin)) fail(`${slot} ${sin} 칸이 없다`);
    if (D.armorSinOptions.some(r => r.slot === 'gloves')) fail('장갑 행이 있다 — 장갑은 무기 죄종 표를 읽는다(⚠임시)');
    for (const r of [...D.armorSinOptions, ...D.armorCommonOptions]) if (!M.AFFIX_LABELS[r.stat]) fail(`라벨 없음: ${r.stat}`);
    const n = Math.max(B.armor_common_opt_normal, B.armor_common_opt_magic, B.armor_common_opt_rare);
    for (const slot of ARMOR_PARTS) {
        const groups = [null, ...new Set((D.itemBases[slot] ?? []).map(b => b.group).filter(Boolean))];
        for (const g of groups) {
            if (g && !AGROUP[slot]?.[g]) fail(`item_base ${slot} 갈래 '${g}' 가 armor_group.csv 에 없다`);
            const fams = new Set(D.armorCommonOptions.filter(r => r.slot === slot && (!g || r.group === 'all' || r.group === g)).map(r => r.family));
            if (fams.size < n) fail(`${slot}/${g ?? '시작'} 공통옵션 종류 ${fams.size} < 개수 ${n}`);
        }
    }
    // 투구 공통옵션은 갈래별 풀 — 갈래 전용 행이 그 갈래에만 뜬다 · 경험치만 셋 공통 (item_design §1 「투구 옵션」)
    const helm = g => [...new Set(D.armorCommonOptions.filter(r => r.slot === 'helmet' && (r.group === 'all' || r.group === g)).map(r => r.family))].sort();
    if (!eq(helm('plate'), ['dr_flat', 'ele_res', 'xp'])) fail(`플레이트 풀 ${helm('plate')}`);
    if (!eq(helm('leather'), ['aspd', 'crit_rate', 'xp'])) fail(`가죽 풀 ${helm('leather')}`);
    if (!eq(helm('tiara'), ['cdr', 'xp'])) fail(`티아라 풀 ${helm('tiara')} — ⚠ 데미지 +% 는 재논의라 없다`);
    // 갈래 표 — 부위마다 id 가 유일하고 숙련 직업은 갑옷만 든다
    for (const g of D.armorGroupList) {
        if (!ARMOR_PARTS.includes(g.slot)) fail(`armor_group ${g.id} slot '${g.slot}'`);
        if (g.slot !== 'armor' && g.classes.length) fail(`${g.slot} 갈래 ${g.id} 가 숙련 직업을 든다 — 숙련은 갑옷 한 칸만 본다`);
    }
    return `죄종 칸 ${D.armorSinOptions.length} · 공통 ${D.armorCommonOptions.length} · 갈래 ${D.armorGroupList.length}`;
});
check('item: 방어구 옵션은 세 층 — 고정 「방어력 +%」 1 + 죄종 칸(죄종마다 1) + 공통옵션 키 개수 · 출처 순서 · 부위 · 갈래가 맞는 행만 · 같은 종류는 한 번 · 장갑 시기 칸은 무기 표 넷 (2026-09-18)', () => {
    const rng = makeRng(81);
    const seen = {};
    for (let i = 0; i < 1200; i++) {
        const slot = ARMOR_PARTS[i % 4];
        const ilvl = [5, 15, 35, 55][Math.floor(i / 4) % 4];
        const it = SYS.item.rollGear(rng, { slots: [slot], ilvl })[0];
        const common = it.rarity === 'rare' ? B.armor_common_opt_rare : it.rarity === 'normal' ? B.armor_common_opt_normal : B.armor_common_opt_magic;
        const src = it.affixes.map(a => a.src);
        const want = ['fixed', ...it.sins, ...Array(common).fill('random')];
        if (!eq(src, want)) fail(`${slot} ${it.rarity} 출처 ${src.join(',')} ≠ ${want.join(',')}`);
        const fx = it.affixes[0];
        if (fx.stat !== 'armor_def_pct' || fx.v < B.armor_fixed_def_pct_min || fx.v > B.armor_fixed_def_pct_max) fail(`${slot} 고정 옵션 ${JSON.stringify(fx)}`);
        it.sins.forEach((sin, k) => {
            const a = it.affixes[1 + k];
            const rows = slot === 'gloves' ? D.weaponSinOptions.filter(r => r.sin === sin) : D.armorSinOptions.filter(r => r.slot === slot && r.sin === sin);
            if (!rows.some(r => r.stat === a.stat)) fail(`${slot} ${sin} 칸에 ${a.stat}`);
        });
        const rows = D.armorCommonOptions.filter(r => r.slot === slot && (!it.group || r.group === 'all' || r.group === it.group));
        const fams = it.affixes.slice(1 + it.sins.length).map(a => rows.find(r => r.stat === a.stat)?.family);
        if (fams.some(f => !f)) fail(`${slot}/${it.group ?? '-'} 공통옵션이 그 부위 · 갈래의 풀 밖이다: ${JSON.stringify(it.affixes)}`);
        if (new Set(fams).size !== fams.length) fail(`${slot} 같은 종류가 두 번: ${fams.join(',')}`);
        seen[slot] = (seen[slot] ?? 0) + 1;
    }
    // 장갑 시기 칸은 무기 표의 넷 중 하나 — 무기 갈래를 안 본다(⚠임시 · 물리 · 마법사 · 사제 행이 다 뜬다)
    const envy = new Set();
    const r2 = makeRng(82);
    for (let i = 0; i < 3000 && envy.size < 4; i++) {
        const it = SYS.item.rollGear(r2, { slots: ['gloves'], ilvl: 20, rarityWeights: { normal: 0, magic: 0, rare: 1 } })[0];
        it.sins.forEach((sin, k) => { if (sin === 'envy') envy.add(it.affixes[1 + k].stat); });
    }
    if (envy.size !== 4) fail(`장갑 시기 칸 ${[...envy].join(',')} — 무기 시기 행 넷이 다 떠야 한다`);
    return `${Object.entries(seen).map(([k, v]) => `${k} ${v}`).join(' · ')} · 장갑 시기 ${[...envy].sort().join('/')}`;
});
check('item: 베이스는 그 아이템 레벨의 가장 높은 열린 티어에서만 — 시작 칸은 첫 티어 아래 · 갈래는 균등 · 시작 갑옷은 클로스 (item_design §1 「베이스」 · 2026-09-18)', () => {
    const rng = makeRng(83);
    for (const slot of ARMOR_PARTS) {
        const tiers = [...new Set(D.itemBases[slot].map(b => b.tierMin))];
        for (const ilvl of [1, 9, 10, 29, 30, 49, 50, 80]) {
            const top = Math.max(...tiers.filter(x => x <= ilvl));
            const want = D.itemBases[slot].filter(b => b.tierMin === top).map(b => b.id).sort();
            const got = new Set();
            for (let i = 0; i < 60; i++) got.add(SYS.item.rollGear(rng, { slots: [slot], ilvl })[0].baseId);
            if (!eq([...got].sort(), want)) fail(`${slot} ilvl ${ilvl} 베이스 ${[...got].sort()} ≠ ${want}`);
        }
    }
    const sa = SYS.item.startingArmor(makeRng(5));
    if (sa.baseId !== 'armor_cloth' || sa.group) fail(`시작 갑옷 ${sa.baseId}/${sa.group}`);
    // 목걸이 · 반지는 티어가 하나(1)라 전 행이 뜬다
    const ring = new Set();
    for (let i = 0; i < 80; i++) ring.add(SYS.item.rollGear(rng, { slots: ['ring'], ilvl: 60 })[0].baseId);
    if (ring.size !== D.itemBases.ring.length) fail(`반지 베이스 ${ring.size}/${D.itemBases.ring.length}`);
    return `네 부위 × ilvl 여덟 곳 · 시작 갑옷 ${sa.baseId}`;
});

/* ── 반지 · 목걸이 옵션 세 층 (item_design §1 「반지 · 목걸이」 · 2026-09-21 사용자 확정 · R127) ── */
check('csv: 장신구 옵션 표 — 반지 · 목걸이 죄종 7 전부 · 시기 칸 구성 · 공통 종류가 개수 이상 · 발동 조건이 목걸이 베이스마다 하나 · 발동 후보 (R127)', () => {
    for (const slot of ['ring', 'amulet']) for (const sin of Object.keys(M.SINS))
        if (!D.accessorySinOptions.some(r => r.slot === slot && r.sin === sin)) fail(`${slot} ${sin} 칸이 없다`);
    const fams = new Set(D.accessoryCommonOptions.map(r => r.family));
    if (fams.size < Math.max(B.accessory_common_opt_normal, B.accessory_common_opt_magic, B.accessory_common_opt_rare)) fail(`공통 종류 ${fams.size} < 개수`);
    const envy = slot => D.accessorySinOptions.filter(r => r.slot === slot && r.sin === 'envy').map(r => r.stat).sort().join('+');
    if (envy('ring') !== 'def_ignore+res_reduction_cold+res_reduction_fire+res_reduction_lightning+res_reduction_poison') fail(`반지 시기 ${envy('ring')} — 방어 무시 + 원소별 저항 감소 넷(다섯 균등 · 사용자 2026-09-21)`);
    if (envy('amulet') !== 'def_down_pct+res_down_pct') fail(`목걸이 시기 ${envy('amulet')} — 파티 디버프 둘`);
    const trig = Object.fromEntries(D.amuletProcs.map(r => [r.baseId, r.trigger]));
    const bases = D.itemBases.amulet.map(b => b.id);
    if (!eq(Object.keys(trig).sort(), bases.slice().sort())) fail(`발동 조건 행 ${Object.keys(trig)} ≠ 목걸이 베이스 ${bases}`);
    if (!eq(Object.values(trig).sort(), ['hit', 'interval', 'struck'])) fail(`발동 조건 ${Object.values(trig)} — 베이스 셋이 조건 셋을 하나씩 든다`);
    const pool = SYS.skill.list.filter(sk => sk.amuletPool);
    // 차례 밖에서 나가면 뜻이 없는 것(오오라 · 사건 · 소환 · 불러내기) · 도발 · 결투 — 표 셋(2026-09-22)에서는 나가는 방식 · 하는 일 · 걸린 효과로 가른다
    const statOf = sk => SYS.skill.statuses[sk.effects[0].status]?.stat;
    const bad = pool.filter(sk => sk.ownerKind === 'monster' || sk.cast !== 'turn' || sk.effects.some(e => ['summon', 'call'].includes(e.effect)) || ['taunt', 'duel'].includes(statOf(sk)));
    if (bad.length) fail(`발동 후보가 될 수 없는 스킬: ${bad.map(s => s.id).join(',')}`);
    if (!pool.length) fail('발동 후보가 비었다');
    return `죄종 칸 ${D.accessorySinOptions.length} · 공통 종류 ${fams.size} · 발동 ${Object.entries(trig).map(([k, v]) => `${k}=${v}`).join(' ')} · 후보 ${pool.length}`;
});
check('skill: amulet_pool — 0/1 · 오오라 · 몬스터 전용이 1 이면 로드가 던진다 · 0 으로 내리면 후보에서 빠진다 (R127)', () => {
    const load = rows => loadSkills({ rows });
    const clone = () => JSON.parse(JSON.stringify(D.skillRows));
    const throws = mut => { const rows = clone(); mut(rows); try { load(rows); return false; } catch { return true; } };
    if (!throws(rows => { rows.find(r => r.cast === 'aura').amulet_pool = 1; })) fail('오오라가 발동 후보로 통과했다');
    if (!throws(rows => { rows.find(r => r.owner_kind === 'monster').amulet_pool = 1; })) fail('몬스터 전용이 발동 후보로 통과했다');
    if (!throws(rows => { rows[0].amulet_pool = 2; })) fail('amulet_pool 2 가 통과했다');
    const rows = clone();
    const first = rows.find(r => r.amulet_pool === 1);
    first.amulet_pool = 0;
    if (load(rows).list.some(sk => sk.amuletPool && sk.id === first.skill_id)) fail(`${first.skill_id} 를 0 으로 내렸는데 후보에 남았다`);
    return `오오라 · 몬스터 · 2 거절 · ${first.skill_id} 0 이면 빠진다`;
});
check('item: 반지 · 목걸이 옵션은 세 층 — 죄종 칸(죄종마다 1) + 공통 키 개수 · 같은 종류 한 번 · 목걸이만 발동 스킬(베이스 조건 · 후보 풀 · 범위) · 반지 시기 다섯이 다 뜬다 (R127)', () => {
    const rng = makeRng(127);
    const pool = SYS.skill.list.filter(sk => sk.amuletPool).map(sk => sk.id);
    const procOf = Object.fromEntries(D.amuletProcs.map(r => [r.baseId, r]));
    const envy = new Set(), trig = new Set();
    let normalProc = 0;
    for (let i = 0; i < 1600; i++) {
        const slot = i % 2 ? 'ring' : 'amulet';
        const it = SYS.item.rollGear(rng, { slots: [slot], ilvl: 5 + (i % 60) })[0];
        const common = it.rarity === 'rare' ? B.accessory_common_opt_rare : it.rarity === 'normal' ? B.accessory_common_opt_normal : B.accessory_common_opt_magic;
        const src = it.affixes.map(a => a.src);
        const want = [...it.sins, ...Array(common).fill('random')];
        if (!eq(src, want)) fail(`${slot} ${it.rarity} 출처 ${src.join(',')} ≠ ${want.join(',')}`);
        it.sins.forEach((sin, k) => {
            const a = it.affixes[k];
            if (!D.accessorySinOptions.some(r => r.slot === slot && r.sin === sin && r.stat === a.stat)) fail(`${slot} ${sin} 칸에 ${a.stat}`);
            if (slot === 'ring' && sin === 'envy') envy.add(a.stat);
        });
        const fams = it.affixes.slice(it.sins.length).map(a => D.accessoryCommonOptions.find(r => r.stat === a.stat)?.family);
        if (fams.some(f => !f)) fail(`${slot} 공통옵션이 풀 밖: ${JSON.stringify(it.affixes)}`);
        if (new Set(fams).size !== fams.length) fail(`${slot} 같은 종류가 두 번: ${fams.join(',')}`);
        if (slot === 'ring') { if ('proc' in it) fail('반지에 발동 스킬이 붙었다'); continue; }
        const p = it.proc, row = procOf[it.baseId];
        if (!p || !row) fail(`목걸이 ${it.baseId} 에 발동 스킬이 없다`);
        if (p.trigger !== row.trigger) fail(`${it.baseId} 발동 조건 ${p.trigger} ≠ 베이스의 ${row.trigger}`);
        if (!pool.includes(p.skill)) fail(`발동 스킬 ${p.skill} 이 후보 풀 밖`);
        if (!(p.v >= F.roundPct(row.min) && p.v <= F.roundPct(row.max))) fail(`${it.baseId} 값 ${p.v} 가 [${row.min}, ${row.max}] 밖`);
        if (it.affixes.some(a => a.src === 'fixed')) fail('발동 스킬이 affixes 에 들어갔다 — proc 에만 든다');
        trig.add(p.trigger);
        if (it.rarity === 'normal') normalProc++;
    }
    if (envy.size !== 5) fail(`반지 시기 칸 ${[...envy].join(',')} — 다섯이 다 떠야 한다`);
    if (trig.size !== 3) fail(`발동 조건 ${[...trig]} — 셋이 다 떠야 한다`);
    if (!normalProc) fail('일반 목걸이 표본이 없다 — 고정 옵션은 일반에도 붙는다');
    return `반지 시기 ${[...envy].sort().join('/')} · 발동 조건 ${[...trig].sort().join('/')} · 일반 목걸이 ${normalProc}개도 발동 스킬`;
});
check('combat: 목걸이 발동 스킬은 전투가 읽지 않는다 — proc 을 떼어도 computeCombat · 타임라인이 같다 (사용자 지시 2026-09-21 · 설명에만)', () => {
    const party = strip => SYS.game.partyOf(G).map(uid => {
        const h = SYS.game.heroById(G, uid);
        const am = SYS.item.rollGear(makeRng(3), { slots: ['amulet'], ilvl: 5 })[0];
        if (!am.proc) fail('표본 목걸이에 발동 스킬이 없다');
        if (strip) delete am.proc;
        return { uid, combat: SYS.hero.computeCombat(h, [...SYS.game.heroItems(G, h).map(SYS.item.effective), am]) };
    });
    const a = party(false), b = party(true);
    if (!eq(a.map(u => u.combat), b.map(u => u.combat))) fail('발동 스킬이 전투 능력치를 움직였다');
    if (!eq(SYS.battle.simulate(a, 101, makeRng(5)).timeline, SYS.battle.simulate(b, 101, makeRng(5)).timeline)) fail('발동 스킬이 타임라인을 움직였다');
    return '능력치 · 타임라인 동일';
});
check('combat: 원소별 저항 감소는 그 원소의 타격에만 · res_reduction 과 같은 자리에 더한다 (반지 시기 칸 · R127)', () => {
    const zero = () => 0;                                           // 적중 · 최소 피해 · 치명 없음
    const a = { atkMin: 100, atkMax: 100, lvl: 1, crit: 0, critDmg: 1 };
    const d = { def: 0, res: { fire: 0.4, cold: 0.4, lightning: 0.4, poison: 0.4 }, resMaxBonus: 0, dr: 0, lvl: 1 };
    const el = { fire: 0.1, cold: 0, lightning: 0, poison: 0 };
    const fireEl = F.strike(zero, { ...a, atkType: 'fire', resReductionEl: el }, d).dmg;
    const fireAll = F.strike(zero, { ...a, atkType: 'fire', resReduction: 0.1 }, d).dmg;
    const coldEl = F.strike(zero, { ...a, atkType: 'cold', resReductionEl: el }, d).dmg;
    const coldNone = F.strike(zero, { ...a, atkType: 'cold' }, d).dmg;
    const physEl = F.strike(zero, { ...a, atkType: 'physical', resReductionEl: el }, d).dmg;
    const physNone = F.strike(zero, { ...a, atkType: 'physical' }, d).dmg;
    if (fireEl !== fireAll) fail(`불 타격 ${fireEl} ≠ res_reduction 0.1 과 같아야 ${fireAll}`);
    if (coldEl !== coldNone) fail(`냉기 타격이 불 저항 감소를 받았다 ${coldEl} ≠ ${coldNone}`);
    if (physEl !== physNone) fail(`물리 타격이 저항 감소를 받았다 ${physEl} ≠ ${physNone}`);
    const c = SYS.hero.computeCombat(G.heroes[0], [mkItem('ring', [{ stat: 'res_reduction_fire', v: 0.07, src: 'envy' }])]);
    if (c.res_reduction_el?.fire !== 0.07 || c.res_reduction_el.cold !== 0) fail(`res_reduction_el ${JSON.stringify(c.res_reduction_el)}`);
    return `불 ${fireEl} = 전 원소 감소 ${fireAll} · 냉기 ${coldEl} = 없음 ${coldNone}`;
});
check('combat: 고정 「방어력 +%」는 그 아이템 자신의 고유 방어력에만 곱한다 · 레벨당 방어력 · 체력 · 공격 속도는 영웅 레벨 × 값을 더한다 (item_design §1 「갑옷 옵션」 · 2026-09-18)', () => {
    const h = { ...G.heroes[0], mastery: {} };
    const armor = mkItem('armor', [{ stat: 'armor_def_pct', v: 0.1, src: 'fixed' }, { stat: 'def_flat', v: 5, src: 'random' }], { implicit: { stat: 'def_flat', v: 100 } });
    const helm = mkItem('helmet', [{ stat: 'armor_def_pct', v: 0.2, src: 'fixed' }], { implicit: { stat: 'def_flat', v: 33 } });
    const c = SYS.hero.computeCombat(h, [armor, helm]);
    // 100 × 1.1 = 110 · 33 × 1.2 = 39.6 → 40 · 접사 5 는 안 곱한다
    if (c.defense !== 110 + 40 + 5) fail(`defense ${c.defense} ≠ 155`);
    const lv = { ...h, level: 20 };
    const lvItem = mkItem('armor', [{ stat: 'def_per_level', v: 2 }, { stat: 'hp_per_level', v: 3 }, { stat: 'aspd_per_level_pct', v: 0.001 }]);
    const c0 = SYS.hero.computeCombat(lv, []), c1 = SYS.hero.computeCombat(lv, [lvItem]);
    if (c1.defense - c0.defense !== 40) fail(`레벨당 방어력 ${c1.defense - c0.defense} ≠ 20 × 2`);
    if (c1.hp_max - c0.hp_max !== 60) fail(`레벨당 체력 ${c1.hp_max - c0.hp_max} ≠ 20 × 3`);
    if (!(c1.action_period < c0.action_period)) fail(`레벨당 공격 속도 — 주기 ${c0.action_period} → ${c1.action_period}`);
    return `defense ${c.defense} · 레벨 20 방어 +${c1.defense - c0.defense} · 체력 +${c1.hp_max - c0.hp_max} · 주기 ${c0.action_period} → ${c1.action_period}`;
});
check('combat: 방어구 갈래의 공속 · 쿨감은 낀 방어구마다 제 부위 · 제 갈래 값을 더한다 — 투구 · 장갑 · 신발 갈래는 지금 0 · 무기군은 안 걸린다 (2026-09-18)', () => {
    const h = { ...G.heroes[0], mastery: {} };
    const heavy = mkItem('armor', [], { group: 'heavy' }), robe = mkItem('armor', [], { group: 'robe' });
    const plate = mkItem('helmet', [], { group: 'plate' }), leather = mkItem('gloves', [], { group: 'leather' });
    const cH = SYS.hero.computeCombat(h, [heavy]), cR = SYS.hero.computeCombat(h, [robe]), c0 = SYS.hero.computeCombat(h, []);
    if (!(cH.action_period > c0.action_period)) fail(`중갑이 공속을 안 깎는다 ${c0.action_period} → ${cH.action_period}`);
    if (cR.cooldown_reduction !== AGROUP.armor.robe.cdrPct) fail(`로브 쿨감 ${cR.cooldown_reduction}`);
    const cX = SYS.hero.computeCombat(h, [heavy, plate, leather]);
    if (cX.action_period !== cH.action_period || cX.cooldown_reduction !== cH.cooldown_reduction) fail('투구 · 장갑 갈래가 공속 · 쿨감을 바꿨다');
    const w = mkItem('weapon', [], { group: 'axe' });
    if (SYS.hero.computeCombat(h, [w]).cooldown_reduction !== 0) fail('무기군이 방어구 갈래로 읽혔다');
    return `중갑 주기 ${c0.action_period} → ${cH.action_period} · 로브 쿨감 ${M.pctNum(cR.cooldown_reduction)}%`;
});
check('formula: 절대값 피해 감소는 모든 감소 뒤에 뺀다 · 원소별 최대 저항은 그 원소의 상한에만 · 흡혈은 체력 회복 +% 를 탄다 (2026-09-18 · INTERFACE §2-3)', () => {
    const a = { atkMin: 500, atkMax: 500, atkType: 'physical', lvl: 50, crit: 0, critDmg: 1.5 };
    const d = { def: 0, res: { fire: 0.9, cold: 0.9, lightning: 0, poison: 0 }, resMaxBonus: 0, dr: 0, lvl: 1 };
    let seed = 1;
    while (!F.strike(makeRng(seed), a, d).hit) seed++;
    const hit = (aa, dd) => F.strike(makeRng(seed), aa, dd);
    const p0 = hit(a, d), p3 = hit(a, { ...d, drFlat: 30 });
    if (p3.dmg !== Math.max(B.dmg_min, p0.dmg - 30)) fail(`절대값 감소 ${p0.dmg} → ${p3.dmg}`);
    if (hit(a, { ...d, drFlat: 1e9 }).dmg !== B.dmg_min) fail('하한 dmg_min 이 안 선다');
    const fire = { ...a, atkType: 'fire' };
    const f0 = hit(fire, d).dmg, fEl = hit(fire, { ...d, resMaxEl: { fire: 0.05 } }).dmg, fCold = hit(fire, { ...d, resMaxEl: { cold: 0.05 } }).dmg;
    // 상한 75% → 80% — 남는 피해 25% → 20%
    if (Math.abs(fEl - f0 * 0.8) > 1) fail(`불 상한 +5%p ${f0} → ${fEl}`);
    if (fCold !== f0) fail('냉기 상한이 불 타격에 걸렸다');
    if (Math.abs(F.resCap(0.02, 0.05) - Math.min(B.res_cap_base + 0.07, B.res_cap_absolute)) > 1e-12) fail(`resCap ${F.resCap(0.02, 0.05)}`);
    if (F.resCap(0.02) !== F.resCap(0.02, 0)) fail('원소 몫이 없으면 종전과 같아야 한다');
    if (F.leech(100, 0.1) !== 10 || F.leech(100, 0.1, 0.5) !== 15) fail(`흡혈 ${F.leech(100, 0.1)} · ${F.leech(100, 0.1, 0.5)}`);
    return `물리 ${p0.dmg} → ${p3.dmg} · 불 ${f0} → ${fEl}`;
});
check('equip: 방어구 착용 → 방어력 상승, 해제 → 가방 복귀', () => {
    const G = freshG();                 // 제 판 — 시작 갑옷을 벗기고 갑옷을 가방에 남긴다
    const rng = makeRng(9);
    let it;
    do { it = SYS.item.rollDrop(rng, 3); } while (it.slot !== 'armor');
    it.uid = 'test_armor'; G.items[it.uid] = it; G.bag.push(it.uid);
    const h = G.heroes[0];
    // 시작 장비가 갑옷을 입고 있다(R86) — **벗긴 상태**를 기준으로 삼는다. 다른 갑옷으로 갈아입을 때의 증감은 굴림 운이라
    //   이 단정이 볼 것이 아니다(R90 로 드롭 수열이 밀리자 굴린 갑옷이 시작 갑옷보다 약하게 나와 드러났다)
    if (h.equipped.armor) { const off = SYS.game.unequip(G, h.uid, 'armor'); if (!off.ok) fail(`시작 갑옷 해제 ${off.err}`); }
    const before = SYS.game.heroCombat(G, h).defense;
    const r = SYS.game.equip(G, h.uid, it.uid);
    if (!r.ok) fail(`equip ${r.err}`);
    const after = SYS.game.heroCombat(G, h).defense;
    if (!(after > before)) fail(`def ${before} → ${after}`);
    const u = SYS.game.unequip(G, h.uid, 'armor');
    return u.ok && G.bag.includes(it.uid) && h.equipped.armor == null;
});
/**
 * 2026-09-10 장착 개방 (R71 · GAME_DESIGN §9 09-10 · hero_design §2).
 * ~~다른 직업 전속 무기군은 거부~~ 가 뒤집혔다 — **어느 직업이든 어느 무기든 낀다.**
 * 대신 지킬 값이 옮겨갔다: 무기 칸 스킬은 **그 무기군이 지정한 직업**의 풀에서 온다(낀 사람의 직업이 아니다).
 */
check('equip: 어느 직업이든 어느 무기든 낀다 — 무기가 「어느 직업의 스킬 풀」을 연다 (2026-09-10 · R71)', () => {
    const h = G.heroes[0];
    const rng = makeRng(13);
    let foreign;
    do { foreign = SYS.item.rollDrop(rng, 3); } while (!(foreign.slot === 'weapon' && !WG[foreign.group].classes.includes(h.cls)));
    const startW = h.equipped.weapon ?? fail('시작 무기가 없다');
    foreign.uid = 'test_foreign'; G.items[foreign.uid] = foreign; G.bag.push(foreign.uid);
    const r = SYS.game.equip(G, h.uid, foreign.uid);
    if (!r.ok) fail(`남의 직업 무기를 거부했다 — 09-10 개방이 안 됐다 (${r.err})`);
    // 붙은 스킬은 **그 무기군의 직업** 것이어야 한다 — h.cls 가 아니다
    const owner = WG[foreign.group].classes[0];
    // data.js 의 classSkills 와 같은 조건 — innatePool + 그 직업의 job 스킬 (skill_design §12-1)
    const pool = SYS.skill.list.filter(sk => sk.innatePool && sk.ownerKind === 'job' && sk.ownerId === owner).map(sk => sk.id);
    if (foreign.skill && !pool.includes(foreign.skill))
        fail(`${foreign.group}(${owner} 풀)에 ${foreign.skill} 이 붙었다 — 무기군의 직업 풀이 아니다`);
    SYS.game.equip(G, h.uid, startW);                                    // 원복
    G.bag = G.bag.filter(u => u !== foreign.uid); delete G.items[foreign.uid];
    if (h.equipped.weapon !== startW) fail('원복 실패');
    // 거절 사유가 하나도 남지 않았다 (canEquip 은 늘 null)
    const cases = [['mage', 'orb'], ['priest', 'orb'], ['priest', 'crucifix'], ['mage', 'crucifix'], ['knight', 'orb'], ['warrior', 'staff']];
    for (const [cls, group] of cases)
        if (SYS.item.canEquip({ cls }, { slot: 'weapon', group }) !== null) fail(`${cls} 가 ${group} 를 못 낀다 — 거절 사유는 없어야 한다`);
    return `${h.cls} 가 ${foreign.group}(${owner} 풀) 착용 · 거절 0`;
});
/**
 * 한손 개념 폐지 (2026-09-01) — 「양손 무기가 보조를 벗긴다」 단정이 있던 자리다.
 * 규칙이 사라진 것은 단정을 지울 이유가 되지만, **되살아나지 않는다**는 것은 여전히 지킬 값이다:
 * 무기를 바꿔 껴도 돌아오는 것은 언제나 그 자리에 있던 하나뿐이어야 한다 (둘이 돌아오면 배타가 부활한 것).
 */
check('equip: 무기 교체는 그 자리 하나만 돌려준다 — 양손↔보조 배타 없음 (2026-09-01)', () => {
    const rng = makeRng(11);
    const h = G.heroes[0];
    const startW = h.equipped.weapon ?? fail('시작 무기가 없다');
    let w;
    do { w = SYS.item.rollDrop(rng, 3); } while (!(w.slot === 'weapon' && WG[w.group].classes.includes(h.cls)));
    w.uid = 'test_w2';
    G.items[w.uid] = w; G.bag.push(w.uid);
    const r = SYS.game.equip(G, h.uid, w.uid);
    if (!r.ok) fail(`equip ${r.err}`);
    if (r.back.length !== 1 || r.back[0] !== startW) fail(`back ${JSON.stringify(r.back)} (그 자리 하나여야 한다)`);
    if ('offhand' in h.equipped) fail('보조 위치가 살아 있다');
    const undo = SYS.game.equip(G, h.uid, startW);
    if (!undo.ok) fail(`restore ${undo.err}`);
    G.bag = G.bag.filter(u => u !== w.uid); delete G.items[w.uid];
    return `${h.cls}: ${WG[w.group].ko} ↔ 시작 무기 · 돌아온 것 1개`;
});
check('equip: 반지 ×2 — 빈 칸부터 채우고, 셋째는 1번 칸을 교체한다', () => {
    const G = freshG();                 // 제 판 — 반지 둘을 낀 채 끝난다
    const rng = makeRng(17);
    const h = G.heroes[1];
    const rings = [];
    while (rings.length < 3) { const it = SYS.item.rollDrop(rng, 3); if (it.slot === 'ring') rings.push(it); }
    rings.forEach((r, i) => { r.uid = `test_ring${i}`; G.items[r.uid] = r; G.bag.push(r.uid); });
    if (SYS.game.equipTarget(h, rings[0]) !== 'ring1') fail('target1');
    const a = SYS.game.equip(G, h.uid, rings[0].uid);
    if (!a.ok || a.position !== 'ring1') fail(`a ${JSON.stringify(a)}`);
    if (SYS.game.equipTarget(h, rings[1]) !== 'ring2') fail('target2');
    const b = SYS.game.equip(G, h.uid, rings[1].uid);
    if (!b.ok || b.position !== 'ring2') fail(`b ${JSON.stringify(b)}`);
    const c = SYS.game.equip(G, h.uid, rings[2].uid);
    if (!c.ok || c.position !== 'ring1' || !G.bag.includes(rings[0].uid)) fail(`c ${JSON.stringify(c)}`);
    if (SYS.game.heroItems(G, h).filter(it => it.slot === 'ring').length !== 2) fail('two rings worn');
    const d = SYS.game.equip(G, h.uid, rings[0].uid, 'ring2');      // 위치 지정 착용
    return d.ok && d.position === 'ring2' && h.equipped.ring2 === rings[0].uid;
});
check('equip: heroCombatIf 「이 아이템을 끼면」 = 실제로 낀 뒤의 heroCombat · 원본 불변 · 남이 낀 것은 그 몸에서 뺀 셈 (INTERFACE §2-7 · 2026-09-15)', () => {
    const g = newGameP(7, cands, NOW);
    const [a, b] = g.heroes;
    const wb = b.equipped.weapon ?? fail('fixture: 시작 무기가 없다');
    const J = x => JSON.stringify(x);
    if (J(SYS.game.heroCombatIf(g, a, a.equipped.weapon)) !== J(SYS.game.heroCombat(g, a))) fail('이미 낀 무기인데 heroCombat 과 다르다');
    const worn = J(SYS.game.heroCombatIf(g, a, wb));             // b 가 끼고 있는 채로 묻는다
    if (!SYS.game.unequip(g, b.uid, 'weapon').ok) fail('fixture: 무기를 못 벗긴다');
    const snap = J(g);
    const inBag = J(SYS.game.heroCombatIf(g, a, wb));
    if (J(g) !== snap) fail('원본 상태가 바뀌었다');
    if (inBag !== worn) fail('남이 낀 것을 그 몸에서 안 뺐다');
    if (inBag === J(SYS.game.heroCombat(g, a))) fail('fixture: 무기를 바꿔도 값이 같다 — 비교가 헛돈다');
    if (!SYS.game.equip(g, a.uid, wb).ok) fail('fixture: 무기를 못 낀다');
    const got = J(SYS.game.heroCombat(g, a));
    return inBag === got ? `${a.cls} ← ${b.cls} 무기 · 낀 뒤 값과 같다` : fail(`다르다: ${inBag} ≠ ${got}`);
});
check('salvage: 가방에서 사라지고 가루가 는다', () => {
    // 제 판 · 제 아이템 — 판을 돌려 쓰던 때는 앞의 반지 단정이 가방에 남긴 반지를 분해했다(그 단정 없이는 가방이 비어 빨간불 · 2026-09-22)
    const { g, it } = upgradeFixture(mkItem('gloves', [{ stat: 'crit_pct', v: 0.05 }]));
    const before = g.resources.dust;
    const r = SYS.game.salvage(g, it.uid);
    return r.ok && !g.bag.includes(it.uid) && !g.items[it.uid] && g.resources.dust === before + r.dust;
});

/** 자물쇠 [신설 2026-09-21 · ADR-0185] — 분해만 막는다. 없으면 안 잠긴 것이라 옛 세이브에 소급할 판단이 없다 */
check('잠금: 잠근 아이템은 분해가 `locked` 로 거절되고 가방에 남는다', () => {
    const { g, it } = upgradeFixture(mkItem('gloves', [{ stat: 'crit_pct', v: 0.05 }]));
    const dust = g.resources.dust;
    if (!SYS.game.setItemLock(g, it.uid, true).ok) return fail('잠그지 못했다');
    const r = SYS.game.salvage(g, it.uid);
    if (r.ok) return fail('잠근 것이 분해됐다');
    if (r.err !== 'locked') return fail(`거절 코드가 다르다: ${r.err}`);
    return !!g.items[it.uid] && g.resources.dust === dust;
});
check('잠금: 풀면 필드가 사라지고 다시 분해된다', () => {
    const { g, it } = upgradeFixture(mkItem('gloves', [{ stat: 'crit_pct', v: 0.05 }]));
    SYS.game.setItemLock(g, it.uid, true);
    const off = SYS.game.setItemLock(g, it.uid, false);
    if (!off.ok || off.locked) return fail('잠금이 안 풀렸다');
    // `false` 를 남기지 않는다 — 안 쓰는 값이 개체마다 쌓인다 (INTERFACE §2-5)
    if ('locked' in g.items[it.uid]) return fail('`locked` 필드가 남았다');
    return SYS.game.salvage(g, it.uid).ok;
});

/**
 * 알아서 분해 [신설 2026-09-21 · R125 · item_design §6-5] — 등급 선 · 아이템 레벨 선을 각각 긋고 **하나라도 걸리면**
 * 새 드롭이 가방에 들어오기 전에 가루가 된다. 가방 참 검사보다 먼저 · 리포트 `drops` 에는 남는다(흐린 칸) · rng 0.
 */
const autoRun = (seed, rule) => {
    const g = newGameP(seed, cands, NOW);
    if (rule && !SYS.game.setAutoSalvage(g, rule).ok) fail(`선이 거절됐다 ${JSON.stringify(rule)}`);
    const d = SYS.game.departRun(g, 101, NOW);
    if (!d.ok) fail(`depart ${d.err}`);
    while (!SYS.game.advanceRun(g, d.run, NOW).done);
    return { g, R: d.run.report };
};
check('알아서 분해: 새 게임은 꺼짐 · 옛 세이브(필드 없음)도 꺼짐으로 열린다 · 선이 없으면 드롭이 전부 가방에 든다', () => {
    const g = SYS.game.newGame(3, cands, NOW);
    if (!eq(g.autoSalvage, { rarity: null, ilvlBelow: 0 })) fail(`새 게임 ${JSON.stringify(g.autoSalvage)}`);
    const old = SYS.game.serialize(g, NOW); delete old.autoSalvage;
    const back = SYS.game.deserialize(old);
    if (!eq(back.autoSalvage, { rarity: null, ilvlBelow: 0 })) fail(`옛 세이브 ${JSON.stringify(back.autoSalvage)}`);
    const { g: g2, R } = autoRun(11, null);
    const gone = R.drops.filter(u => !g2.items[u]);
    return gone.length === 0 ? `드롭 ${R.drops.length} · 전부 가방` : fail(`선이 없는데 ${gone.length}개가 사라졌다`);
});
check('알아서 분해: 같은 시드에서 선을 켜도 굴림은 그대로 — 걸린 드롭만 가방에 안 들고 리포트 drops 에는 남는다 · 가루는 반환량 합만큼', () => {
    for (let seed = 1; seed <= 40; seed++) {
        const off = autoRun(seed, null);
        const hits = off.R.drops.map(u => off.g.items[u]).filter(it => it && (it.rarity === 'normal' || it.rarity === 'magic'));
        if (!hits.length) continue;
        const on = autoRun(seed, { rarity: 'magic' });
        // rng 0 — 드롭 목록(uid 순서까지) · 골드가 같아야 한다
        if (!eq(on.R.drops, off.R.drops)) fail(`seed ${seed}: 드롭 목록이 달라졌다 — 선이 굴림을 흔들었다`);
        if (on.R.gold !== off.R.gold) fail(`seed ${seed}: 골드 ${off.R.gold} → ${on.R.gold}`);
        for (const it of hits) {
            if (on.g.items[it.uid] || on.g.bag.includes(it.uid)) fail(`seed ${seed}: ${it.rarity} ${it.uid} 가 가방에 남았다`);
        }
        const kept = on.g.bag.filter(u => off.R.drops.includes(u)).map(u => on.g.items[u].rarity);
        if (kept.some(r => r === 'normal' || r === 'magic')) fail(`seed ${seed}: 선 아래 등급이 가방에 있다 ${kept}`);
        const want = off.g.resources.dust + hits.reduce((a, it) => a + SYS.item.salvageDust(it), 0);
        if (on.g.resources.dust !== want) fail(`seed ${seed}: 가루 ${on.g.resources.dust} ≠ ${want}`);
        return `seed ${seed}: 드롭 ${off.R.drops.length} 중 ${hits.length}개 가루 · 남은 ${kept.join('/') || '없음'}`;
    }
    return fail('40 시드 동안 일반 · 매직 드롭이 한 번도 없었다 — 시험이 헛돈다');
});
check('알아서 분해: 가방이 가득 차도 걸린 드롭은 버린 수에 안 든다(가방 참 검사보다 먼저) · 레벨 선 하나로도 걸린다', () => {
    for (let seed = 1; seed <= 40; seed++) {
        const g = newGameP(seed, cands, NOW);
        while (g.bag.length < B.inventory_cap) { const f = mkItem('gloves', []); f.uid = `iF${g.bag.length}`; g.items[f.uid] = f; g.bag.push(f.uid); }
        SYS.game.setAutoSalvage(g, { ilvlBelow: 100000 });      // 레벨 선만 — 모든 드롭이 걸린다
        const d = SYS.game.departRun(g, 101, NOW);
        if (!d.ok) fail(`depart ${d.err}`);
        while (!SYS.game.advanceRun(g, d.run, NOW).done);
        const R = d.run.report;
        if (!R.drops.length) continue;
        if (R.discarded) fail(`seed ${seed}: 버린 수 ${R.discarded} — 걸린 드롭이 칸을 먹었다`);
        if (g.bag.length !== B.inventory_cap) fail(`seed ${seed}: 가방 ${g.bag.length}`);
        if (R.drops.some(u => g.items[u])) fail(`seed ${seed}: 걸린 드롭이 items 에 남았다`);
        return `seed ${seed}: 가득 찬 가방 · 드롭 ${R.drops.length} 전부 가루 · 버린 수 0`;
    }
    return fail('40 시드 동안 드롭이 없었다');
});
check('알아서 분해: [지금 적용]은 인벤토리만 · 잠근 것 · 창고는 안 건드린다 · 미리보기 숫자와 실행 결과가 같다 · 선을 바꿔도 가방은 그대로', () => {
    const { g } = upgradeFixture(mkItem('gloves', [], { rarity: 'normal', ilvl: 3 }));
    const add = (where, extra) => { const it = mkItem('boots', [], extra); it.uid = `iA${Object.keys(g.items).length}`; g.items[it.uid] = it; g[where].push(it.uid); return it; };
    const lockedN = add('bag', { rarity: 'normal', ilvl: 3, locked: true });
    const stashN = add('stash', { rarity: 'normal', ilvl: 3 });
    const bagMagic = add('bag', { rarity: 'magic', ilvl: 3 });
    const bagRare = add('bag', { rarity: 'rare', ilvl: 20 });
    const before = g.bag.length;
    SYS.game.setAutoSalvage(g, { rarity: 'normal' });
    if (g.bag.length !== before) fail('선을 바꿨더니 가방이 줄었다');
    const pv = SYS.game.autoSalvagePreview(g);
    const r = SYS.game.applyAutoSalvage(g);
    if (!r.ok || r.n !== pv.n || r.dust !== pv.dust) fail(`미리보기 ${JSON.stringify(pv)} ≠ 실행 ${JSON.stringify(r)}`);
    const alive = u => !!g.items[u];
    if (alive('iX')) fail('인벤토리의 일반이 안 갈렸다');
    if (!alive(lockedN.uid)) fail('잠근 일반이 갈렸다');
    if (!alive(stashN.uid) || !g.stash.includes(stashN.uid)) fail('창고의 일반이 갈렸다');
    if (!alive(bagMagic.uid) || !alive(bagRare.uid)) fail('선 위의 등급이 갈렸다');
    // 레벨 선을 더하면 매직(Lv.3)도 걸린다 — 하나라도 걸리면 분해
    SYS.game.setAutoSalvage(g, { ilvlBelow: 10 });
    if (g.autoSalvage.rarity !== 'normal') fail('준 키만 바꿔야 한다 — 등급 선이 지워졌다');
    const r2 = SYS.game.applyAutoSalvage(g);
    if (r2.n !== 1 || alive(bagMagic.uid) || !alive(bagRare.uid)) fail(`레벨 선 ${JSON.stringify(r2)}`);
    return `등급 선 ${r.n}개 · 레벨 선 ${r2.n}개 · 잠금 · 창고 · 레어 Lv.20 생존`;
});
check('알아서 분해: 선의 값 검사 — 레어 이상 등급 · 음수 · 소수 레벨은 `invalid` 이고 아무것도 안 바뀐다', () => {
    const g = openAll(SYS.game.newGame(4, cands, NOW));
    const bad = [{ rarity: 'rare' }, { rarity: 'unique' }, { ilvlBelow: -1 }, { ilvlBelow: 2.5 }, { ilvlBelow: '5' }];
    for (const b of bad) {
        const r = SYS.game.setAutoSalvage(g, b);
        if (r.ok || r.err !== 'invalid') fail(`${JSON.stringify(b)} → ${JSON.stringify(r)}`);
    }
    return eq(g.autoSalvage, { rarity: null, ilvlBelow: 0 }) || fail(`값이 바뀌었다 ${JSON.stringify(g.autoSalvage)}`);
});

/** 정렬 [신설 2026-09-21 · ADR-0242] — 칸 하나를 한 번 줄 세운다 · 기준마다 동점 규칙이 다르다 · 다 같으면 원래 순서 · rng 0 */
check('정렬: 등급순 · 레벨순 · 부위순이 각자의 동점 규칙으로 줄 세운다 · 다 같으면 원래 순서 · 누른 칸만 · 개체 · 개수 그대로', () => {
    const g = SYS.game.newGame(5, cands, NOW);
    g.bag = []; g.stash = [];
    const put = (where, uid, slot, rarity, ilvl) => { const it = mkItem(slot, [], { rarity, ilvl }); it.uid = uid; g.items[uid] = it; g[where].push(uid); };
    put('bag', 'a', 'ring', 'magic', 5);
    put('bag', 'b', 'weapon', 'rare', 3);
    put('bag', 'c', 'boots', 'magic', 9);
    put('bag', 'd', 'weapon', 'magic', 5);
    put('bag', 'e', 'ring', 'magic', 5);      // a 와 셋이 다 같다 — a 뒤에 남아야 한다
    put('stash', 's1', 'boots', 'normal', 1);
    put('stash', 's2', 'weapon', 'rare', 9);
    const stash0 = g.stash.slice(), items0 = Object.keys(g.items).length;
    const run = key => { const r = SYS.game.sortStorage(g, 'bag', key); if (!r.ok) fail(`${key} ${r.err}`); return g.bag.join(''); };
    const want = { rarity: 'bcdae', ilvl: 'cdaeb', slot: 'bdcae' };
    for (const [key, w] of Object.entries(want)) { const got = run(key); if (got !== w) fail(`${key}: ${got} ≠ ${w}`); }
    if (!eq(g.stash, stash0)) fail('인벤토리를 줄 세웠는데 창고가 움직였다');
    if (Object.keys(g.items).length !== items0 || g.bag.length !== 5) fail('개체 · 개수가 바뀌었다');
    if (!SYS.game.sortStorage(g, 'stash', 'rarity').ok || g.stash.join() !== 's2,s1') fail(`창고 ${g.stash}`);
    for (const [w, k] of [['bag', 'name'], ['equip', 'rarity']]) {
        const r = SYS.game.sortStorage(g, w, k);
        if (r.ok || r.err !== 'invalid') fail(`${w}/${k} → ${JSON.stringify(r)}`);
    }
    return Object.entries(want).map(([k, w]) => `${k} ${w}`).join(' · ');
});

/**
 * 보관 두 칸 [신설 2026-09-11 · v24 · item_design §1 · GAME_DESIGN §9].
 * 드롭은 인벤토리에만 쌓이고 창고는 **유저가 옮긴 것만** 든다. 창고에서도 **바로 장착·분해**된다.
 */
check('창고: 인벤토리 ↔ 창고 왕복 — 총량이 안 변하고 제자리로 돌아온다 (v24)', () => {
    const { g, it } = upgradeFixture(mkItem('gloves', [{ stat: 'crit_pct', v: 0.05 }]));
    const total = () => g.bag.length + g.stash.length;
    const n0 = total();
    const a = SYS.game.moveToStash(g, it.uid);
    if (!a.ok) fail(`toStash ${a.err}`);
    if (!(g.stash.includes(it.uid) && !g.bag.includes(it.uid))) fail('창고로 안 갔다');
    const b = SYS.game.moveToBag(g, it.uid);
    if (!b.ok) fail(`toBag ${b.err}`);
    return g.bag.includes(it.uid) && !g.stash.includes(it.uid) && total() === n0;
});

check('창고: 창고에서 바로 장착된다 — 교체품은 창고로 돌아간다 (v24 · item_design §1)', () => {
    const { g, it } = upgradeFixture(mkItem('gloves', [{ stat: 'crit_pct', v: 0.05 }]));
    const h = g.heroes[0];
    const worn = mkItem('gloves', [{ stat: 'crit_pct', v: 0.01 }]);
    worn.uid = 'iWorn'; g.items[worn.uid] = worn; h.equipped.gloves = worn.uid;
    if (!SYS.game.moveToStash(g, it.uid).ok) fail('창고로 못 옮겼다');
    const r = SYS.game.equip(g, h.uid, it.uid);
    if (!r.ok) fail(`equip ${r.err}`);
    // 교체품은 **꺼낸 쪽**(창고)으로 — 인벤이 차 있어도 창고 장착이 막히지 않는다
    return h.equipped.gloves === it.uid && g.stash.includes(worn.uid) && !g.bag.includes(worn.uid);
});

/* ── 전투 ── */
const units = () => SYS.game.partyOf(G).map(uid => ({ uid, combat: SYS.game.heroCombat(G, SYS.game.heroById(G, uid)) }));
/**
 * 구조를 보려고 만든 **이길 수 있는 파티** — 밸런스가 어긋나도 9라운드 구조·정예·보스 계약을 확인할 수 있어야 한다.
 * 현재 수치 대역에서 시작 파티는 1라운드에 전멸한다 (캘리브레이션 표) — 그건 수치 문제이지 구조 계약이 아니다.
 */
const godUnits = (lvl = 50) => units().map(u => ({
    uid: u.uid,
    combat: { ...u.combat, atk_physical: { min: 2000, max: 2000 }, atk_magic: undefined, attack_type: 'physical', hp_max: 100000, level: lvl },
}));
/** 공격력 범위에 배수 — 테스트 파티를 세게 만든다 (R90 — 공격력은 `{min, max}`) */
const scaleRange = (r, k) => ({ min: (r?.min ?? 1) * k, max: (r?.max ?? 1) * k });
check('simulate: 같은 시드 = 같은 타임라인', () => {
    const a = SYS.battle.simulate(units(), 101, makeRng(5));
    const b = SYS.battle.simulate(units(), 101, makeRng(5));
    return eq(a, b) && a.timeline.length > 10 ? `${a.timeline.length} events` : false;
});
check('simulate: 직격마다 피해를 굴린다 — 같은 라운드 · 같은 공격자 · 같은 대상의 기본 공격(치명 · 추가 · 강타 없음)도 피해가 갈린다 (battle_design §9-1 · R90)', () => {
    // 무기 옵션을 걷는다 — 타격 시 창(방어 감소 등)이 대상 방어를 흔들면 굴림 없이도 피해가 갈려 이 단정이 헛돈다
    const r = SYS.battle.simulate(units().map(u => ({ ...u, combat: { ...u.combat, option_fx: null } })), 101, makeRng(5));
    const groups = new Map();
    let round = 0;
    for (const ev of r.timeline) {
        if (ev.e === 'round') round = ev.n;
        if (ev.e !== 'hit' || !ev.a.startsWith('p') || ev.s || ev.crit || ev.proc || ev.cb) continue;
        const k = `${round}:${ev.a}>${ev.d}`;
        if (!groups.has(k)) groups.set(k, new Set());
        groups.get(k).add(ev.dmg);
    }
    if (!groups.size) fail('파티 기본 공격 표본이 없다');
    const varied = [...groups.values()].filter(s => s.size > 1).length;
    if (!varied) fail(`같은 공격자 · 같은 대상의 피해가 전부 한 값이다 — 굴림이 안 걸린다 (${groups.size}쌍)`);
    return `${groups.size}쌍 중 ${varied}쌍이 갈린다`;
});
check('simulate: 다른 시드 = 다른 전투', () => !eq(SYS.battle.simulate(units(), 101, makeRng(5)).timeline, SYS.battle.simulate(units(), 101, makeRng(6)).timeline));

/* ── 방어구 옵션 — 전투 (INTERFACE §2-6 「반격」 · 「조건부 받는 피해 감소」 · 「체력 회복」 · 2026-09-18) ── */
/** 방어구 옵션을 손으로 얹은 파티 — 영웅마다 투구 한 칸을 더 입힌다(실제 합산 경로 `computeCombat` 을 지난다) */
const armorUnits = affixes => SYS.game.partyOf(G).map(uid => {
    const h = SYS.game.heroById(G, uid);
    const items = [...SYS.game.heroItems(G, h).map(SYS.item.effective), mkItem('helmet', affixes)];
    return { uid, combat: SYS.hero.computeCombat(h, items) };
});
/*
 * 데미지 공식 개정 [2026-09-18 · 사용자 확정 · battle_design §9-1 · §9-2 · GAME_DESIGN §9] — 평타 × 직업 메인 스탯 계수 · 도감 「데미지」는 한 괄호 ·
 *   몬스터도 같다(2026-09-22 — 보류 해제). 메인 스탯은 `class.csv:key_attr`(hero_design §2) — 표 대조는 hero_attribute 단정이 본다
 */
check('hero: 평타 능력치 계수 main_attr_mult = statCoef(직업 메인 스탯) — 직업마다 제 축을 읽는다 (battle_design §9-2 · 2026-09-18)', () => {
    const base = SYS.game.heroById(G, SYS.game.partyOf(G)[0]);
    const out = [];
    for (const cls of D.classes) {
        const stats = Object.fromEntries(Object.keys(base.stats).map(k => [k, B.attr_dmg_pivot]));
        stats[cls.keyAttr] = B.attr_dmg_pivot + 7;
        const c = SYS.hero.computeCombat({ ...base, cls: cls.id, stats }, []);
        if (Math.abs(c.main_attr_mult - F.statCoef(B.attr_dmg_pivot + 7)) > 1e-12) fail(`${cls.id} (${cls.keyAttr}) 계수 ${c.main_attr_mult}`);
        // 메인 스탯이 아닌 축이 높아도 평타 계수는 안 움직인다
        const other = Object.keys(stats).find(k => k !== cls.keyAttr);
        const c2 = SYS.hero.computeCombat({ ...base, cls: cls.id, stats: { ...stats, [cls.keyAttr]: B.attr_dmg_pivot, [other]: B.attr_dmg_pivot + 7 } }, []);
        if (c2.main_attr_mult !== 1) fail(`${cls.id} 메인 스탯이 기준인데 ${other} 가 계수를 움직였다 ${c2.main_attr_mult}`);
        out.push(`${cls.id}=${cls.keyAttr}`);
    }
    if (SYS.hero.computeCombat({ ...base, cls: 'nope' }, []).main_attr_mult !== 1) fail('모르는 직업인데 계수가 섰다');
    return out.join(' · ');
});
check('battle: 평타는 메인 스탯 계수를 곱한다 — 같은 시드의 첫 평타가 계수만큼 커진다 · 몬스터도 제 메인 스탯 계수 (battle_design §9-2 · 2026-09-18 · 몬스터 2026-09-22)', () => {
    const units = m => armorUnits([]).map(u => ({ ...u, combat: { ...u.combat, main_attr_mult: m } }));
    const first = r => r.timeline.find(ev => ev.e === 'hit' && ev.a.startsWith('p') && !ev.s);
    // 레벨 1 평타는 한 자릿수라 반올림에 묻힌다 — 계수 10 과 20 을 잰다(비율 2 는 같다)
    const h1 = first(SYS.battle.simulate(units(10), 101, makeRng(5)));
    const h2 = first(SYS.battle.simulate(units(20), 101, makeRng(5)));
    if (!h1 || !h2 || h1.a !== h2.a || h1.d !== h2.d) fail('같은 시드의 첫 평타가 서로 다른 타격이다');
    const d1 = h1.dmg - (h1.cb ?? 0), d2 = h2.dmg - (h2.cb ?? 0);
    if (!(d1 >= 10)) fail(`표본이 작다 ${d1}`);
    if (Math.abs(d2 / d1 - 2) > 0.1) fail(`계수 10 → 20 인데 ${d1} → ${d2} (×${(d2 / d1).toFixed(2)})`);
    // 몬스터도 영웅과 같다 [2026-09-22 사용자 — 보류 해제] — 제 직업의 메인 스탯(`monster.csv` 기본 능력치) 계수를 탄다
    const e = SYS.battle.makeEnemy('e0', 1101, 'normal', 1);
    const mRow = D.monsters[1101];
    const mAttr = D.classes.find(c => c.id === mRow.cls)?.keyAttr;
    const mWant = F.statCoef(Number(mRow[mAttr]));
    if (!mAttr || Math.abs(e.mainMult - mWant) > 1e-12) fail(`몬스터 계수 mainMult ${e.mainMult} ≠ statCoef(${mAttr} ${mRow[mAttr]}) = ${mWant}`);
    if (e.mainMult === 1) fail('표본 몬스터의 메인 스탯이 기준값이라 계수를 못 가른다 — 다른 몬스터로 잰다');
    if ('noStatMult' in e) fail('몬스터 유닛에 옛 보류 표시(noStatMult)가 남았다');
    if ('main_attr_mult' in e.sheet) fail('몬스터 시트에 평타 계수가 새어 나왔다');
    return `첫 평타 계수 10 ${d1} → 계수 20 ${d2} · 몬스터 1101(${mAttr} ${mRow[mAttr]}) ×${e.mainMult.toFixed(2)}`;
});
check('hero: 도감 「데미지」는 데미지 % 괄호에 더한다 — 따로 곱하지 않는다 (battle_design §9-1 · 2026-09-18)', () => {
    const h = SYS.game.heroById(G, SYS.game.partyOf(G)[0]);
    const items = [...SYS.game.heroItems(G, h).map(SYS.item.effective), mkItem('ring', [{ stat: 'atk_pct', v: 1, src: 'wrath' }])];
    const c0 = SYS.hero.computeCombat(h, items), c1 = SYS.hero.computeCombat(h, items, { atk_pct: 1 });
    if (Math.abs(c1.atk_pct_sum - c0.atk_pct_sum - 1) > 1e-12) fail(`괄호 합 ${c0.atk_pct_sum} → ${c1.atk_pct_sum} (+1 이어야)`);
    const k = c0.atk_physical ? 'atk_physical' : 'atk_magic';
    const bare = c0[k].max / (1 + c0.atk_pct_sum);
    const want = Math.round(bare * (1 + c0.atk_pct_sum + 1));
    if (Math.abs(c1[k].max - want) > 1) fail(`도감 데미지 100% → ${c1[k].max} ≠ ${want} (따로 곱하면 ${c0[k].max * 2} 근처)`);
    return `${c0[k].max} → ${c1[k].max} (한 괄호 ${want} · 따로 곱 ${c0[k].max * 2})`;
});
check('battle: 반격 —맞으면 확률로 때린 적에게 기본 공격 1회 · counter 바로 뒤에 그 타격이 잇는다 · 경직 중엔 없다 · 차례를 쓴다 · 몬스터도 입은 대로 갖는다 (2026-09-18 · INTERFACE §2-6 「반격」)', () => {
    const r = SOFT.battle.simulate(armorUnits([{ stat: 'counter_chance', v: 0.6, src: 'wrath' }]), 101, makeRng(5));   // 반격 표본 — 약한 몬스터(SOFT)
    const tl = r.timeline;
    const period = Object.fromEntries(r.party.map(p => [p.key, p.period]));
    const stagEnd = {}, lastCounter = {};
    let n = 0;
    for (let i = 0; i < tl.length; i++) {
        const ev = tl[i];
        if (ev.e === 'round') for (const k of Object.keys(stagEnd)) if (k.startsWith('e')) delete stagEnd[k];
        if (ev.e === 'stagger') stagEnd[ev.u] = ev.until;
        if (ev.e === 'counter') {
            n++;
            if ((stagEnd[ev.u] ?? 0) > ev.t + 1e-9) fail(`${ev.u} 가 경직 중(${stagEnd[ev.u]}까지)에 반격했다 @${ev.t}`);
            const nx = tl[i + 1];
            if (!nx || !['hit', 'dodge'].includes(nx.e) || nx.a !== ev.u || nx.d !== ev.d || nx.s !== undefined) fail(`counter 뒤가 그 반격의 기본 공격이 아니다: ${JSON.stringify(nx)}`);
            if (ev.u.startsWith('p')) lastCounter[ev.u] = ev.t;
            continue;
        }
        // 차례를 쓴다 — 반격 뒤 한 주기가 지나기 전에는 제 차례(시전 · 반격이 아닌 기본 공격)가 안 온다
        const own = ev.e === 'skill' ? ev.u : (ev.e === 'hit' || ev.e === 'dodge') && tl[i - 1]?.e !== 'counter' ? ev.a : null;
        if (own && own.startsWith('p') && lastCounter[own] !== undefined && ev.t < lastCounter[own] + period[own] - 0.15)
            fail(`${own} 가 반격(@${lastCounter[own]}) 뒤 ${(ev.t - lastCounter[own]).toFixed(1)}초 만에 제 차례를 썼다(주기 ${period[own]})`);
    }
    if (n < 3) fail(`반격 표본 ${n}`);
    const mid = Number(Object.keys(D.monsters)[0]);
    const e = SYS.battle.makeEnemy('e0', mid, 'normal', 10, [mkItem('helmet', [{ stat: 'counter_chance', v: 0.07, src: 'wrath' }])]);
    if (e.counter !== 0.07) fail(`몬스터 반격 확률 ${e.counter}`);
    return `반격 ${n}회 · 이벤트 ${tl.length}`;
});
check('battle: 조건부 받는 피해 감소 — 때린 쪽의 열이 맞으면 그 타격만 한 원천으로 곱한다 · 전투에 안 닿는 방어구 옵션(경험치)은 타임라인을 한 글자도 안 바꾼다 (2026-09-18)', () => {
    const lvl = 40;
    const base = SYS.battle.simulate(armorUnits([]), 101, makeRng(5), lvl);
    const xp = SYS.battle.simulate(armorUnits([{ stat: 'xp_gain_pct', v: 0.5, src: 'random' }]), 101, makeRng(5), lvl);
    if (!eq(xp.timeline, base.timeline)) fail('경험치 옵션이 전투를 바꿨다');
    const dr = SYS.battle.simulate(armorUnits([{ stat: 'vs_front_dr', v: 0.5, src: 'random' }, { stat: 'vs_back_dr', v: 0.5, src: 'random' }]), 101, makeRng(5), lvl);
    const first = res => res.timeline.findIndex(ev => ev.e === 'hit' && ev.a.startsWith('e') && ev.d.startsWith('p'));
    const i = first(base);
    if (i < 0) fail('적의 타격이 없다');
    if (first(dr) !== i) fail(`첫 적 타격 자리 ${i} → ${first(dr)} — 그 앞이 달라졌다`);
    const a = base.timeline[i], b = dr.timeline[i];
    if (a.a !== b.a || a.d !== b.d) fail('다른 타격을 비교하고 있다');
    const net = ev => ev.dmg - (ev.cb ?? 0);                      // 강타 몫은 감소를 안 받는다
    // 기대 비율 — **두 런의 감소 몫을 둘 다 센다**: 시작 갑옷이 이미 받는 피해 감소 공통옵션을 굴려 들 수 있다(기준 런도 감소가 들어간다).
    //   조건 = 때린 적의 종족 · 등급 · 열(`monster_role.csv` 랭크) — `battle.condDr` 와 같은 합이고, 합이 한 원천으로 곱해진다
    const en = base.timeline.find(ev => ev.e === 'round').enemies.find(x => x.key === a.a);
    const mon = D.monsters[en.monsterId], rank = D.monsterRoles[mon.role]?.rank ?? 0;
    const pIdx = Number(a.d.slice(1));
    const guard = us => {
        const fx = us[pIdx].combat.option_fx;
        if (!fx) return 0;
        return (fx.vsDr?.[String(mon.monster_type).toLowerCase()] ?? 0) + (en.grade !== 'normal' ? fx.vsEliteDr : 0) + (rank === 0 ? fx.vsFrontDr : fx.vsBackDr);
    };
    const gA = guard(armorUnits([])), gB = guard(armorUnits([{ stat: 'vs_front_dr', v: 0.5, src: 'random' }, { stat: 'vs_back_dr', v: 0.5, src: 'random' }]));
    if (!(gB - gA > 0.49)) fail(`옵션이 그 타격의 조건에 안 걸렸다 ${gA} → ${gB}`);
    const want = net(a) * (1 - gB) / (1 - gA);
    if (Math.abs(net(b) - want) > 1) fail(`받는 피해 ${net(a)} → ${net(b)} (기대 ${want.toFixed(1)} · 감소 몫 ${gA} → ${gB})`);
    return `첫 적 타격 ${net(a)} → ${net(b)} (기대 ${want.toFixed(1)} · 감소 몫 ${M.pctNum(gA)}% → ${M.pctNum(gB)}%)`;
});
check('battle: 체력 회복 +% — 물약 · 회복 스킬 · 재생에 곱한다(흡혈은 formula 단정) · 0 이면 종전과 같다 (2026-09-18 · INTERFACE §2-6 「체력 회복」)', () => {
    const P = { id: 'test_p', heal: 10 };
    const S1 = buildSystems({ ...D, balance: { ...B, potion_use_hp_pct: 101, potion_slot_max: 2, potion_cooldown_sec: 1000 } });
    const drink = us => S1.battle.simulate(us, 101, makeRng(5), undefined, [P, P]).timeline.filter(ev => ev.e === 'potion');
    const plain = drink(armorUnits([])), up = drink(armorUnits([{ stat: 'hp_recovery_pct', v: 0.5, src: 'sloth' }]));
    if (!plain.length || plain.some(ev => ev.amt !== 10)) fail(`회복 +% 없는 물약 ${plain.map(ev => ev.amt)}`);
    if (!up.length || up.some(ev => ev.amt !== 15)) fail(`회복 +50% 물약 ${up.map(ev => ev.amt)}`);
    // 회복 스킬 — 받는 쪽만 늘어난다
    const tl = [];
    const rt = createSkillRuntime({ SK: null, B, rng: makeRng(1), timeline: tl, out: { casts: {} }, units: { party: [], enemies: [] }, r1: v => Math.round(v * 10) / 10, EPS: 1e-9, hooks: createHooks() });
    const self = { key: 'p0', side: 'party', hp: 1, hpMax: 1000, recv: 0.5, matkMin: 100, matkMax: 100, buffs: {} };
    rt.castHeal(self, { id: 'test_heal', mult: 1, statMult: 1, target: 'self' }, 0);
    if (tl[0]?.amt !== 150 || self.hp !== 151) fail(`회복 스킬 ${tl[0]?.amt} · HP ${self.hp}`);
    // 재생 — 같은 틱의 첫 재생량이 두 배(+100%)다 · 그 앞의 사건은 한 글자도 안 다르다
    const lvl = 40;
    const regen = us => us.map(u => ({ ...u, combat: { ...u.combat, hp_regen: 20 } }));
    // 재생 표본 — 첫 피격 뒤에도 살아 있어야 재생이 돈다 · 약한 몬스터(SOFT)
    const rb = SOFT.battle.simulate(regen(armorUnits([])), 101, makeRng(5), lvl);
    const ru = SOFT.battle.simulate(regen(armorUnits([{ stat: 'hp_recovery_pct', v: 1, src: 'sloth' }])), 101, makeRng(5), lvl);
    const hitI = rb.timeline.findIndex(ev => ev.e === 'hit' && ev.a.startsWith('e') && ev.d.startsWith('p'));
    const hitEv = rb.timeline[hitI];
    const missing = rb.party.find(p => p.key === hitEv.d).hpMax - hitEv.dhp;
    if (missing < 4) fail(`표본 — 첫 피격이 너무 작다(${missing})`);
    const firstRegen = res => res.timeline.find((ev, k) => k > hitI && ev.e === 'regen' && ev.u === hitEv.d);
    const gb = firstRegen(rb), gu = firstRegen(ru);
    if (!gb || !gu || gb.t !== gu.t) fail(`재생 이벤트 ${JSON.stringify(gb)} · ${JSON.stringify(gu)}`);
    if (gb.amt !== 2 || gu.amt !== 4) fail(`재생 ${gb.amt} → ${gu.amt} (초당 20 · 한 틱 2 → 4)`);
    return `물약 10 → 15 · 회복 100 → 150 · 재생 ${gb.amt} → ${gu.amt}`;
});

/* ── 물약 — 전투 (battle_design §7-1 · INTERFACE §2-6 · R103) ── */
check('simulate: 물약은 차례를 안 쓰고 rng 를 안 쓴다 — 회복량 0 인 물약 칸을 넣으면 potion 이벤트만 끼고 나머지 타임라인은 한 글자도 안 다르다 · null · 빈 목록은 인자를 안 준 것과 같다 · 칸 수를 넘거나 모양이 틀리면 멈춘다 (INTERFACE §5-2 · §2-6 · R104)', () => {
    const bare = SYS.battle.simulate(units(), 101, makeRng(5));
    for (const none of [null, []]) if (!eq(bare, SYS.battle.simulate(units(), 101, makeRng(5), undefined, none))) fail(`${JSON.stringify(none)} 이 인자 없음과 다르다`);
    if (!eq(bare.potion, { max: B.potion_slot_max, slots: [], used: 0 })) fail(`물약 없는 런의 result.potion — ${JSON.stringify(bare.potion)}`);
    const Z = Array.from({ length: B.potion_slot_max }, () => ({ id: 'test_zero', heal: 0 }));
    const zero = SYS.battle.simulate(units(), 101, makeRng(5), undefined, Z);
    const drinks = zero.timeline.filter(ev => ev.e === 'potion');
    if (!drinks.length) fail('회복량 0 물약을 한 번도 안 마셨다 — 시험이 헛돈다');
    if (!eq(zero.timeline.filter(ev => ev.e !== 'potion'), bare.timeline)) fail('물약이 차례 · rng · 다른 사건을 바꿨다');
    if (zero.potion.used !== drinks.length || zero.potion.max !== B.potion_slot_max || !eq(zero.potion.slots, Z)) fail(`result.potion ${JSON.stringify(zero.potion)}`);
    const stops = arg => { try { SYS.battle.simulate(units(), 101, makeRng(5), undefined, arg); return false; } catch (e) { return true; } };
    if (!stops([...Z, Z[0]])) fail('칸 수를 넘는 목록이 안 멈췄다');
    if (!stops([{ id: 'test_zero' }])) fail('회복량 없는 칸이 안 멈췄다');
    if (!stops({ id: 'test_zero', heal: 0 })) fail('목록이 아닌 옛 모양이 안 멈췄다');
    return `마심 ${drinks.length} · 나머지 ${bare.timeline.length} 이벤트 동일`;
});

check('simulate: 물약 순서 — HP 비율 낮은 순 · 같으면 파티 배열 순이 앞 칸부터 · 조건 밑(미만)에서만 (battle_design §7-1 · INTERFACE §5-3 · R104)', () => {
    const P = { id: 'test_zero', heal: 0 };
    // 조건 101% — 첫 틱에 전원이 조건 밑이다(가득 찬 HP = 100%). 동점이라 파티 순으로 칸만큼만 마신다
    const S1 = buildSystems({ ...D, balance: { ...B, potion_use_hp_pct: 101, potion_slot_max: 2, potion_cooldown_sec: 1000 } });
    const first = S1.battle.simulate(units(), 101, makeRng(5), undefined, [P, P]).timeline.filter(ev => ev.e === 'potion');
    if (!eq(first.map(ev => ev.u), ['p0', 'p1'])) fail(`동점 순서 ${first.map(ev => `${ev.u}@${ev.t}`).join(' ')}`);
    if (!eq(first.map(ev => ev.left), [1, 0]) || !eq(first.map(ev => ev.i), [0, 1]) || first[1].t !== first[0].t) fail(`칸 ${first.map(ev => `${ev.i}→${ev.left}`)} · 시각 ${first.map(ev => ev.t)}`);
    // 조건 0% — 누구도 미만이 될 수 없다
    const S0 = buildSystems({ ...D, balance: { ...B, potion_use_hp_pct: 0 } });
    if (S0.battle.simulate(units(), 101, makeRng(5), undefined, [P]).timeline.some(ev => ev.e === 'potion')) fail('조건 0% 인데 마셨다');
    // HP 비율 순 — 칸이 넉넉하고 쿨이 0 이면 매 틱 조건 밑의 전원이 마신다: 같은 틱 안의 순서가 HP 비율 오름차순이어야 한다.
    //   회복량 0 이라 `dhp` 가 곧 마시기 전 HP 이고, `units()` 는 스킬이 없어 최대 HP 가 흔들리지 않는다
    const SR = buildSystems({ ...D, balance: { ...B, potion_use_hp_pct: 101, potion_slot_max: 1e6, potion_cooldown_sec: 0 } });
    const rr = SR.battle.simulate(units(), 101, makeRng(5), undefined, Array.from({ length: 3000 }, () => P));
    const hpMax = Object.fromEntries(rr.party.map(p => [p.key, p.hpMax]));
    const byT = new Map();
    for (const ev of rr.timeline) if (ev.e === 'potion') { if (!byT.has(ev.t)) byT.set(ev.t, []); byT.get(ev.t).push(ev); }
    let pairs = 0, strict = 0;
    for (const evs of byT.values()) {
        for (let i = 1; i < evs.length; i++) {
            const a = evs[i - 1], b = evs[i];
            const ra = a.dhp / hpMax[a.u], rb = b.dhp / hpMax[b.u];
            if (ra > rb) fail(`t=${a.t} ${a.u}(${ra.toFixed(3)}) 가 ${b.u}(${rb.toFixed(3)}) 보다 먼저 마셨다`);
            if (ra === rb && a.u > b.u) fail(`t=${a.t} 동점인데 ${a.u} 가 ${b.u} 보다 먼저 마셨다`);
            pairs++;
            if (ra < rb) strict++;
        }
    }
    if (!strict) fail(`같은 틱에서 HP 비율이 갈린 표본이 없다(${pairs}쌍) — 시험이 헛돈다`);
    return `동점 p0 → p1 · 같은 틱 ${pairs}쌍 중 비율이 갈린 ${strict}쌍`;
});

check('simulate: 물약 — 런 하나에 찬 칸 수만큼 · 앞 칸부터 그 칸의 물약 · 라운드 사이에 안 찬다 · 영웅마다 쿨 · 쓰러진 영웅 · 적 · 소환은 안 마신다 · 최대치에서 자른다 (battle_design §7-1 · R104)', () => {
    // 칸마다 다른 물약 — 표의 앞 단계부터 칸 수만큼(회복량이 칸마다 달라 「그 칸의 물약」이 갈린다)
    const S = D.potions.slice(0, B.potion_slot_max).map(p => ({ id: p.id, heal: p.heal }));
    let total = 0, clipped = 0, multi = 0;
    for (let seed = 1; seed <= 20; seed++) {
        const r = SYS.battle.simulate(units(), 101, makeRng(seed), undefined, S);
        const evs = r.timeline.filter(ev => ev.e === 'potion');
        if (evs.length > S.length) fail(`seed ${seed} 마심 ${evs.length} > 찬 칸 ${S.length}`);
        if (r.potion.used !== evs.length) fail(`seed ${seed} used ${r.potion.used} ≠ ${evs.length}`);
        if (evs.length >= 2) multi++;
        const hpMax = Object.fromEntries(r.party.map(p => [p.key, p.hpMax]));
        const lastAt = {}, down = new Set();
        let left = S.length;
        for (const ev of r.timeline) {
            if (ev.e === 'down') down.add(ev.u);
            if (ev.e !== 'potion') continue;
            if (!(ev.u in hpMax)) fail(`seed ${seed} 파티 영웅이 아닌 ${ev.u} 가 마셨다`);
            if (down.has(ev.u)) fail(`seed ${seed} 쓰러진 ${ev.u} 가 마셨다`);
            const i = S.length - left;
            left -= 1;
            if (ev.left !== left || ev.i !== i) fail(`seed ${seed} 칸 ${ev.i} · 남은 ${ev.left} ≠ 칸 ${i} · 남은 ${left} — 앞 칸부터가 아니거나 칸이 라운드 사이에 찼거나 둘이 한 칸을 썼다`);
            if (ev.amt !== S[i].heal || ev.s !== S[i].id) fail(`seed ${seed} 칸 ${i} 의 물약이 아니다 ${JSON.stringify(ev)}`);
            if (ev.dhp > hpMax[ev.u]) fail(`seed ${seed} ${ev.u} HP ${ev.dhp} > 최대 ${hpMax[ev.u]}`);
            if (ev.dhp === hpMax[ev.u]) clipped++;
            if (lastAt[ev.u] !== undefined && ev.t - lastAt[ev.u] < B.potion_cooldown_sec - 0.05) fail(`seed ${seed} ${ev.u} 쿨 ${lastAt[ev.u]} → ${ev.t}`);
            lastAt[ev.u] = ev.t;
        }
        total += evs.length;
    }
    if (!total) fail('20판 동안 한 번도 안 마셨다 — 시험이 헛돈다');
    if (!multi) fail('20판 동안 둘째 칸까지 간 판이 없다 — 앞 칸부터를 못 잰다');
    return `20판 마심 ${total} · 둘째 칸 이상 ${multi}판 · 최대치에서 잘린 ${clipped}`;
});

check('departRun: 칸은 런을 열 때 그 편성의 구성대로 재고에서 앞 칸부터 찬다 — 모자란 칸은 빈 채 나간다 · 원정 도중에 만든 물약은 다음 런부터 · 마신 만큼 재고가 준다 (battle_design §7-1 · R124)', () => {
    const g = newGameP(5, cands, NOW);
    const light = potionOpen(g);
    g.resources.gold = light.craftGold;
    const ids = p => (p?.slots ?? []).map(s => s?.id ?? null);
    const pad = list => Array.from({ length: SYS.game.limitsOf(g).potionSlots }, (_, i) => list[i] ?? null);
    SYS.game.setPotionSlot(g, 1, light.id);      // 칸 구성 [마이너, 라이트] — 라이트는 재고 0 이라 모자람
    if (!SYS.game.presetState(g).presets[0].potionSlots[1]?.short) fail('재고 0 인 칸이 모자람이 아니다');
    const d1 = SYS.game.departRun(g, 101, NOW);
    if (!d1.ok) fail(d1.err);
    const p1 = d1.run.result.potion;
    if (!eq(ids(p1), pad(['minor_healing'])) || p1.max !== SYS.game.limitsOf(g).potionSlots) fail(`첫 런 ${JSON.stringify(p1)}`);
    if (!SYS.game.makePotion(g, light.id).ok) fail('원정 중 제작이 막혔다');
    while (!SYS.game.advanceRun(g, d1.run, NOW).done);
    if (!eq(ids(d1.run.result.potion), pad(['minor_healing']))) fail('도는 런의 칸이 바뀌었다');
    const drunk = d1.run.result.potion.used;
    if ((g.potions.minor_healing ?? 0) !== 1 - drunk) fail(`마신 ${drunk} 인데 마이너 재고 ${g.potions.minor_healing}`);
    const d2 = SYS.game.departRun(g, 101, NOW);
    if (!d2.ok) fail(d2.err);
    const want2 = pad([drunk ? null : 'minor_healing', light.id]);
    if (!eq(ids(d2.run.result.potion), want2)) fail(`다음 런 ${JSON.stringify(ids(d2.run.result.potion))} ≠ ${JSON.stringify(want2)}`);
    return `첫 런 마이너 ${drunk}병 → 재고 ${JSON.stringify(g.potions)} · 다음 런 칸 ${ids(d2.run.result.potion).map(x => x ?? '-').join(' · ')}`;
});
check('advanceRun: 마신 물약이 재고에서 빠진다 — 같은 물약 여러 칸 · 라운드마다 정산 · 0 이면 키가 없다 · 철수한 라운드의 물약은 안 준다 (battle_design §7-1 · INTERFACE §2-7 · R124)', () => {
    const S1 = buildSystems({ ...D, balance: { ...B, potion_use_hp_pct: 101, potion_cooldown_sec: 0 } });
    const mk = () => {
        const g = openAll(S1.game.newGame(5, cands, NOW), S1);    // 편성 1 은 이미 차 있다 (ADR-0227) · 물약 칸 셋이 들도록 다 지은 판 (R137)
        g.potions = { minor_healing: 3 };
        for (let i = 0; i < 3; i++) S1.game.setPotionSlot(g, i, 'minor_healing');
        return g;
    };
    const g = mk();
    const d = S1.game.departRun(g, 101, NOW);
    if (!d.ok) fail(d.err);
    if (g.potions.minor_healing !== 3) fail(`출발만 했는데 재고 ${g.potions.minor_healing} — 재고는 정산이 뺀다`);
    let spent = 0;
    for (;;) {
        const r = S1.game.advanceRun(g, d.run, NOW);
        spent += Object.values(r.round.potions ?? {}).reduce((a, b) => a + b, 0);
        if (r.done) break;
    }
    if (spent !== d.run.result.potion.used) fail(`라운드 합 ${spent} ≠ 마신 수 ${d.run.result.potion.used}`);
    if (spent !== 3) fail(`조건 101% · 쿨 0 인데 ${spent}병만 마셨다 — 같은 물약 세 칸이 다 안 돌았다`);
    if ('minor_healing' in g.potions) fail(`다 마셨는데 키가 남았다 ${JSON.stringify(g.potions)}`);
    // 철수 — 도중까지 계산된 라운드는 없던 것이라 그 라운드의 물약도 안 준다. 첫 라운드 1초까지 걸어 엔진이 이미 마신 채로 끊는다 (R130 — 걸음)
    const h = mk();
    const e = S1.game.departRun(h, 101, NOW);
    S1.game.stepRun(h, e.run, 1);
    const firstRound = e.run.result.potion.used;
    if (!firstRound) fail('첫 라운드 1초 안에 안 마셨다 — 시험이 헛돈다');
    S1.game.retreatRun(h, e.run, NOW);
    if (h.potions.minor_healing !== 3) fail(`철수했는데 재고 ${h.potions.minor_healing} (그 라운드 ${firstRound}병)`);
    return `세 칸 마이너 → ${spent}병 · 재고 0(키 없음) · 철수한 라운드 ${firstRound}병은 안 줄었다`;
});
check('preset: 편성은 늘 상한(limitsOf.presets)만큼 서 있다 — 고른 편성에 파티 · 진형이 작용하고 다른 편성은 안 흔들린다 · 한 영웅은 한 편성에만 든다(v38 다부대) · 없는 번호는 missing (SCREEN_DESIGN §15 · INTERFACE §2-7 · R122 · R137)', () => {
    const g = openAll(SYS.game.newGame(21, cands, NOW));      // 편성 여럿 — 지휘 천막이 늘린다 (R137)
    const ps0 = SYS.game.presetState(g), cap = SYS.game.limitsOf(g).presets;
    if (ps0.count !== cap || g.presets.length !== cap || ps0.activeNo !== 1 || ps0.runNos.length !== 0) fail(`편성 ${ps0.count} · 고른 ${ps0.activeNo} · 도는 부대 ${ps0.runNos}`);
    if (ps0.presets[0].err !== null) fail(`새 게임 편성 1 이 못 나간다 — ${ps0.presets[0].err}`);
    if (!ps0.presets.slice(1).every(p => p.err === 'noParty')) fail('편성 2 부터가 빈 파티가 아니다');
    const [a, b, c] = g.heroes.map(h => h.uid);
    SYS.game.toggleParty(g, c, NOW);                  // 편성 1 = [a, b] — 새 게임이 넣어 둔 셋에서 하나를 뺀다
    if (!SYS.game.selectPreset(g, 2).ok) fail('편성 2 고르기');
    for (const bad of [0, cap + 1, 1.5, '2', null]) if (SYS.game.selectPreset(g, bad).err !== 'missing') fail(`없는 번호 ${bad}`);
    if (g.preset !== 2) fail('거절이 고른 번호를 바꿨다');
    if (SYS.game.partyOf(g).length !== 0) fail('편성 2 가 편성 1 파티를 비춘다');
    // a 는 편성 1 에 있다 — 편성 2 에 넣으면 **편성 1 에서 빠진다**(한 영웅은 한 편성에만 · v38 다부대). 진형에서도 빠진다
    SYS.game.toggleParty(g, a, NOW); SYS.game.toggleParty(g, c, NOW);
    SYS.game.setFormation(g, SYS.game.formationState(g).templates.at(-1));
    if (!eq(SYS.game.partyOf(g, 1), [b]) || !eq(SYS.game.partyOf(g, 2), [a, c])) fail(`파티 ${SYS.game.partyOf(g, 1)} / ${SYS.game.partyOf(g, 2)}`);
    if (JSON.stringify(g.presets[0].formation).includes(a)) fail('옮긴 영웅이 앞 편성의 진형에 남았다');
    if (g.presets[0].formation.tpl === g.presets[1].formation.tpl) fail('진형이 편성마다 안 갈린다');
    const copy = SYS.game.partyOf(g); copy.push('x');
    if (SYS.game.partyOf(g).includes('x')) fail('partyOf 가 복사본이 아니다');
    // 전술 조건은 고른 편성의 파티로 센다
    SYS.game.selectPreset(g, 1);
    if (!eq(SYS.game.tacticState(g), SYS.game.tacticState(g, [b]))) fail('전술이 고른 편성을 안 센다');
    // 해고는 모든 편성에서 뺀다 — 장비를 벗겨야 해고된다
    const hc = SYS.game.heroById(g, c);
    for (const pos of Object.keys(hc.equipped)) if (hc.equipped[pos]) SYS.game.unequip(g, c, pos);
    if (!SYS.game.dismiss(g, c).ok) fail('해고');
    if (SYS.game.partyOf(g, 2).includes(c) || JSON.stringify(g.presets[1].formation).includes(c)) fail('해고한 영웅이 편성 2 에 남았다');
    return `편성 ${ps0.count} · 1=[${SYS.game.partyOf(g, 1).length}] 2=[${SYS.game.partyOf(g, 2).length}] · 한 영웅은 한 편성에만 · 해고가 모든 편성에서 뺀다`;
});
check('preset: 출발은 편성 번호를 든다 — 빈 편성 noParty · 반복은 도는 원정의 편성으로 다시 나간다(고른 편성이 바뀌어도 · 그 편성의 지금 모습) · runNo (INTERFACE §2-7 · R122)', () => {
    const g = newGameP(22, cands, NOW);            // 편성 1 = 로스터 전원
    SYS.game.selectPreset(g, 2);
    if (SYS.game.canDepart(g, 101, NOW) !== 'noParty') fail('빈 편성 2 가 나간다');
    if (SYS.game.departRun(g, 101, NOW).err !== 'noParty') fail('빈 편성 출발 거절');
    if (SYS.game.canDepart(g, 101, NOW, 9) !== 'missing') fail('없는 편성');
    SYS.game.toggleParty(g, g.heroes[0].uid, NOW);   // 편성 2 = 한 명
    const d = SYS.game.departRun(g, 101, NOW, 1);
    if (!d.ok || d.run.preset !== 1 || g.runs[0].preset !== 1) fail(`편성 1 출발 ${JSON.stringify(d.err ?? d.run?.preset)}`);
    if (!eq(d.report.party, SYS.game.partyOf(g, 1))) fail('편성 1 의 파티가 안 나갔다');
    if (!eq(SYS.game.presetState(g).runNos, [1])) fail('runNos');
    // 반복 — 앱은 도는 원정의 번호를 넘긴다. 고른 편성(2)이 아니라 편성 1 의 **지금 모습**이 나간다
    SYS.game.selectPreset(g, 1); SYS.game.toggleParty(g, g.heroes[2].uid, NOW); SYS.game.selectPreset(g, 2);
    const again = SYS.game.departRun(g, 101, NOW, g.runs[0].preset);
    if (!again.ok || !eq(again.report.party, SYS.game.partyOf(g, 1)) || again.report.party.length !== 1) fail(`반복 파티 ${again.report?.party}`);
    // 부대 상한이 1 이면 편성 2 는 `full` 이다 — 기본 번호(고른 편성)를 보려고 도는 부대를 먼저 걷는다 (v38 다부대)
    SYS.game.retreatRun(g, again.run, NOW);
    const two = SYS.game.departRun(g, 101, NOW);
    return (two.ok && two.run.preset === 2 && two.report.party.length === 1) ? '빈 편성 거절 · 편성 1 반복은 지금 모습 · 기본은 고른 편성 2' : fail('기본 번호가 고른 편성이 아니다');
});
check('preset: 물약 칸 — 앞의 빈 칸에 넣기 · 비우기 · 맞바꾸기 · 같은 물약 여러 칸 · 재고를 안 본다 · 모자람은 뒤 칸부터 · 칸은 편성마다 (ADR-0195 · INTERFACE §2-7 · R124)', () => {
    const g = openAll(SYS.game.newGame(23, cands, NOW));    // 편성 1 = [마이너, -, -, -] · 재고 마이너 1 · 물약 칸 · 편성 여럿은 건물이 늘린다 (R137)
    const cap = SYS.game.limitsOf(g).potionSlots;
    const ids = () => g.presets[g.preset - 1].potionSlots.slice();
    const r = SYS.game.setPotionSlot(g, null, 'minor_healing');
    if (!r.ok || r.slot !== 1) fail(`앞의 빈 칸 ${JSON.stringify(r)}`);
    const short = () => SYS.game.presetState(g).presets[0].potionSlots.map(s => s && s.short);
    if (!eq(short().slice(0, 2), [false, true])) fail(`모자람 ${JSON.stringify(short())} — 재고 1 이면 둘째 칸이 모자란다`);
    while (SYS.game.setPotionSlot(g, null, 'light_healing').ok);
    if (SYS.game.setPotionSlot(g, null, 'light_healing').err !== 'slotsFull') fail('칸이 찼는데 slotsFull 이 아니다');
    for (const [slot, id] of [[cap, 'minor_healing'], [-1, null], [0, 'nope']])
        if (SYS.game.setPotionSlot(g, slot, id).err !== 'missing') fail(`missing ${slot} ${id}`);
    if (!SYS.game.setPotionSlot(g, 0, null).ok || ids()[0] !== null) fail('비우기');
    if (!SYS.game.swapPotionSlot(g, 0, 1).ok || ids()[0] !== 'minor_healing' || ids()[1] !== null) fail(`맞바꾸기 ${ids()}`);
    if (SYS.game.swapPotionSlot(g, 0, cap).err !== 'missing') fail('없는 칸 맞바꾸기');
    if (g.presets[1].potionSlots.some(Boolean)) fail('편성 2 칸이 흔들렸다');
    return `칸 ${ids().map(x => x ?? '-').join(' · ')} · 모자람 ${JSON.stringify(short())}`;
});
/** 무기 옵션 묶음 — 전부 0 인 판을 깔고 시험할 축만 얹는다 (hero.computeCombat:option_fx 모양 · R78) */
const FX0 = { vs: { normal: 0, demon: 0, undead: 0 }, vsElite: 0, vsFront: 0, vsBack: 0, ele: { fire: 0, cold: 0, lightning: 0, poison: 0 }, defDown: 0, resDown: 0, atkDownPhys: 0, atkDownMag: 0, crush: 0, magicFind: 0 };
check('battle: 무기 옵션 조건부 % — 대상의 종족 · 열이 맞을 때만 조건부 괄호에 더해진다 (battle_design §9-2 · R78)', () => {
    const run = fx => SYS.battle.simulate(godUnits().slice(0, 1).map(x => ({ ...x, combat: { ...x.combat, option_fx: fx } })), 101, makeRng(5));
    const first = r => {
        const hit = r.timeline.find(ev => ev.e === 'hit' && ev.a === 'p0');
        const enemy = r.timeline.find(ev => ev.e === 'round').enemies.find(e => e.key === hit.d);
        return { hit, m: D.monsters[enemy.monsterId] };
    };
    const a = first(run(null));
    const type = String(a.m.monster_type).toLowerCase();
    const rank = D.monsterRoles[a.m.role]?.rank ?? 0;
    const other = type === 'demon' ? 'undead' : 'demon';
    // 옵션 값은 비율이다 (R111) — +50% = 0.5
    const vs = first(run({ ...FX0, vs: { ...FX0.vs, [type]: 0.5 } }));
    const wrongType = first(run({ ...FX0, vs: { ...FX0.vs, [other]: 0.5 } }));
    const rankOk = first(run({ ...FX0, [rank === 0 ? 'vsFront' : 'vsBack']: 0.5 }));
    const rankNo = first(run({ ...FX0, [rank === 0 ? 'vsBack' : 'vsFront']: 0.5 }));
    if (!(vs.hit.dmg > a.hit.dmg)) fail(`종족 ${type} +50%: ${a.hit.dmg} → ${vs.hit.dmg}`);
    if (wrongType.hit.dmg !== a.hit.dmg) fail(`다른 종족 옵션이 먹었다: ${a.hit.dmg} → ${wrongType.hit.dmg}`);
    if (!(rankOk.hit.dmg > a.hit.dmg)) fail(`맞는 열 옵션: ${a.hit.dmg} → ${rankOk.hit.dmg}`);
    if (rankNo.hit.dmg !== a.hit.dmg) fail(`다른 열 옵션이 먹었다: ${a.hit.dmg} → ${rankNo.hit.dmg}`);
    return `${a.m.monster_type} · rank ${rank} · ${a.hit.dmg} → ${vs.hit.dmg}`;
});
check('battle: 강타 — 맞기 직전 현재 체력 × % 가 hit.cb 로 서고 dmg 에 든다 (R78)', () => {
    const u = godUnits().slice(0, 1).map(x => ({ ...x, combat: { ...x.combat, option_fx: { ...FX0, crush: 0.1 } } }));
    const r = SYS.battle.simulate(u, 101, makeRng(5));
    const hit = r.timeline.find(ev => ev.e === 'hit' && ev.a === 'p0');
    const hp0 = r.timeline.find(ev => ev.e === 'round').enemies.find(e => e.key === hit.d).hpMax;   // 첫 타격이라 현재 체력 = 최대 체력
    if (hit.cb !== Math.round(hp0 * 0.1)) fail(`cb ${hit.cb} ≠ round(${hp0} × 10%)`);
    // 비교 판은 무기 옵션을 걷는다 — 시작 무기의 옵션(vs 종족 등)이 남으면 강타 말고 다른 것까지 달라진다
    const plain = SYS.battle.simulate(godUnits().slice(0, 1).map(x => ({ ...x, combat: { ...x.combat, option_fx: null } })), 101, makeRng(5)).timeline.find(ev => ev.e === 'hit' && ev.a === 'p0');
    if (hit.dmg !== plain.dmg + hit.cb) fail(`dmg ${hit.dmg} ≠ ${plain.dmg} + ${hit.cb}`);
    return `cb ${hit.cb} / hp ${hp0}`;
});
check('battle: 타격 시 창 — 방어 · 공격 감소는 센 값 하나 · 저항 감소는 영웅끼리 중첩 · 타입이 맞아야 공격 감소 (skill_effects.weaponOnHit · R78)', () => {
    const sec = { def: B.weapon_def_down_sec, res: B.weapon_res_down_sec, atk: B.weapon_atk_down_sec };
    const d = SYS.battle.makeEnemy('e0', 1101, 'normal', 2);      // 물리 공격 몬스터
    const def0 = d.def, res0 = d.res.fire, atk0 = d.atkMax;
    const p0 = { key: 'p0' }, p1 = { key: 'p1' };
    // 옵션 값은 비율이다 (R111) — 10% = 0.1
    weaponOnHit(p0, { ...FX0, defDown: 0.1 }, d, 'physical', 1, sec);
    weaponOnHit(p1, { ...FX0, defDown: 0.2 }, d, 'physical', 1.5, sec);
    weaponOnHit(p0, { ...FX0, defDown: 0.1 }, d, 'physical', 2, sec);
    if (Math.abs(d.def - def0 * (1 - 0.2)) > 1e-9) fail(`방어 ${def0} → ${d.def} (센 값 20% 하나여야 한다)`);
    if (d.buffs['wx:def_down'].until !== 2 + sec.def) fail('시간이 갱신되지 않았다');
    weaponOnHit(p0, { ...FX0, resDown: 0.05 }, d, 'fire', 3, sec);
    weaponOnHit(p1, { ...FX0, resDown: 0.05 }, d, 'fire', 3, sec);
    weaponOnHit(p0, { ...FX0, resDown: 0.05 }, d, 'fire', 3.5, sec);
    if (Math.abs(d.res.fire - (res0 - 0.1)) > 1e-9) fail(`불 저항 ${res0} → ${d.res.fire} (두 영웅 -10% 이어야 한다)`);
    if (d.res.cold !== d.resBase.cold) fail('다른 원소 저항이 깎였다');
    weaponOnHit(p0, { ...FX0, atkDownMag: 0.3 }, d, 'fire', 4, sec);
    if (d.atkMax !== atk0) fail('물리 공격 몬스터에 마법 공격력 감소가 걸렸다');
    weaponOnHit(p0, { ...FX0, atkDownPhys: 0.3 }, d, 'fire', 4, sec);
    if (Math.abs(d.atkMax - atk0 * (1 - 0.3)) > 1e-9) fail(`공격력 ${atk0} → ${d.atkMax}`);
    if (Object.values(d.buffs).some(b => !b.quiet)) fail('조용하지 않은 창');
    return `def ${def0.toFixed(1)}→${d.def.toFixed(1)} · fire ${res0}→${d.res.fire} · atk ${atk0.toFixed(1)}→${d.atkMax.toFixed(1)}`;
});
check('battle: 타격 시 창은 조용하다 — wx: 창은 buff/buffEnd 이벤트를 안 낸다 · 같은 시드 = 같은 전투 (R78)', () => {
    const fx = { ...FX0, defDown: 0.1, resDown: 0.05, atkDownPhys: 0.1, atkDownMag: 0.1 };
    const mk = () => units().map(x => ({ ...x, combat: { ...x.combat, option_fx: fx } }));
    const a = SYS.battle.simulate(mk(), 101, makeRng(7)), b = SYS.battle.simulate(mk(), 101, makeRng(7));
    if (!eq(a.timeline, b.timeline)) fail('결정적이지 않다');
    if (a.timeline.some(ev => (ev.e === 'buff' || ev.e === 'buffEnd') && String(ev.s).startsWith('wx:'))) fail('wx: 창이 이벤트를 냈다');
    return `${a.timeline.length} events`;
});
check('hero: 오만 레벨당 데미지 — 영웅 레벨 × 값이 상시 괄호(atk_pct_sum)에 더해진다 (R78)', () => {
    const h = SYS.hero.rollHero(makeRng(7), { sin: 'pride', cls: 'warrior', name: { ko: 'x', en: 'x' }, trait: { ko: 't', en: 't' } });
    h.level = 10;
    const w = mkItem('weapon', [], { group: 'axe', ilvl: 60, up: 0 });   // ~~watk 100~~ — 반올림 알갱이를 피하려고 ilvl 로 키운다 (R90)
    const base = SYS.hero.computeCombat(h, [w]);
    const pride = SYS.hero.computeCombat(h, [{ ...w, affixes: [{ stat: 'dmg_per_level_pct', v: 0.005, src: 'pride' }] }]);   // 레벨당 0.5% (비율 · R111)
    if (Math.abs(pride.atk_pct_sum - (base.atk_pct_sum + 0.05)) > 1e-12) fail(`atk_pct_sum ${base.atk_pct_sum} → ${pride.atk_pct_sum}`);
    if (!(pride.atk_physical.max > base.atk_physical.max)) fail('공격력이 안 올랐다');
    if (base.option_fx !== null) fail('옵션 없는 무기인데 option_fx 가 null 이 아니다');
    return `atk ${base.atk_physical.min}~${base.atk_physical.max} → ${pride.atk_physical.min}~${pride.atk_physical.max}`;
});
check('simulate: 구조 — round 로 시작, end 로 끝, 라운드 ≤ 그 스테이지의 세트, 편성 ≤ wave_monster_max', () => {
    const r = SYS.battle.simulate(units(), 101, makeRng(5));
    const tl = r.timeline;
    if (tl[0].e !== 'round' || tl[0].n !== 1) fail('first');
    if (tl[tl.length - 1].e !== 'end') fail('last');
    if (r.rounds.length > SYS.battle.stageRounds(D.stages[101]).length) fail('rounds');
    for (const ev of tl) if (ev.e === 'round' && ev.enemies.length > B.wave_monster_max) fail('wave');
    const keys = new Set(['p0', 'p1', 'p2']);
    for (const ev of tl) {
        if (ev.e === 'round') { for (const e of ev.enemies) keys.add(e.key); }
        if (ev.e === 'hit' && (!keys.has(ev.a) || !keys.has(ev.d))) fail(`key ${ev.a}→${ev.d}`);
    }
    return `${r.reason} r${r.roundsCleared} ${r.durationSec}s`;
});
check('simulate: 귀환 룰 — 전투불능자가 나와도 남은 인원으로 계속 간다 (base_expedition §1-1 개정 2026-09-03)', () => {
    // 종잇장 파티를 높은 스테이지에 보낸다 — 반드시 누군가 쓰러진다
    const weak = units().map(u => ({ ...u, combat: { ...u.combat, hp_max: 20, level: 1 } }));
    let sawCarryOn = false;
    for (let seed = 1; seed <= 8; seed++) {
        const r = SYS.battle.simulate(weak, 104, makeRng(seed));
        // `retreat` 는 폐기됐다 — 이 사유로 끝나는 런이 하나라도 있으면 옛 룰이 살아 있는 것이다
        if (r.reason === 'retreat') fail('retreat 가 아직 난다 — 귀환 룰 개정이 안 먹었다');
        // 전투불능이 **두 시각에 걸쳐** 났다면 하나가 쓰러진 뒤에도 런이 이어졌다는 뜻이다 (개정의 핵심)
        const partyKeys = new Set(weak.map((_, i) => `p${i}`));
        const downTs = [...new Set(r.timeline.filter(e => e.e === 'down' && partyKeys.has(e.u)).map(e => e.t))];
        if (downTs.length > 1) sawCarryOn = true;
        const end = r.timeline[r.timeline.length - 1];
        if (end.e !== 'end' || end.reason !== r.reason) fail('end 이벤트와 reason 이 갈린다');
        if (!['clear', 'wipe', 'timeout'].includes(r.reason)) fail(`모르는 사유 ${r.reason}`);
    }
    return sawCarryOn ? '전투불능 뒤에도 런이 이어졌다' : fail('한 명이 쓰러진 뒤 이어진 런이 하나도 없다');
});
check('simulate: 귀환보다 클리어가 먼저다 — 마지막 타격과 같은 틱에 쓰러져도 클리어는 클리어다', () => {
    // 압도적인 파티는 전투불능 없이 클리어한다 (귀환 룰이 정상 클리어를 잡아먹지 않는지)
    const r = SYS.battle.simulate(godUnits(), 101, makeRng(5));
    return r.won && r.reason === 'clear' && r.downed.length === 0 ? `r${r.roundsCleared} ${r.reason}` : fail(`${r.reason} downed ${r.downed.length}`);
});
check('balance: concurrent_expedition_parties 는 1 ~ 편성 수여야 한다 — 코드가 읽는 값이다 (부채 #19 해소 · v38 다부대)', () => {
    // ~~state.run 이 단수라 「동시 원정 1」이 구조로만 지켜진다~~ → 2026-09-23 `state.runs` 가 부대마다 한 자리를 든다.
    // 부대 = 편성이므로 편성 수보다 많은 부대는 낼 수 없다 — `limitsOf` 가 그 위에서 한 번 더 자른다
    const n = B.concurrent_expedition_parties;
    if (!Number.isInteger(n) || n < 1) fail(`${n} — 1 이상 정수여야 한다`);
    if (n > B.party_preset_count) fail(`${n} — 편성 ${B.party_preset_count} 보다 많은 부대는 못 낸다 (부대 = 편성)`);
    if (SYS.game.limitsOf(SYS.game.newGame(42, cands, NOW)).expeditions !== Math.min(n, B.party_preset_count)) fail('limitsOf.expeditions 가 이 키를 안 읽는다');
    return `동시 원정 ${n} / 편성 ${B.party_preset_count}`;
});
/*
 * **몬스터는 영웅과 같은 함수를 지난다** [전면 개정 2026-09-11 · R79 · 사용자 지시 · monster_design §5-1 · battle_design §8-1].
 *   `combatFromMonster` 가 삭제되고 `heroSystem.computeCombat` 을 부르므로, 이 단정은 **세 줄만 다르다**는 것을 지킨다:
 *   ① 몸값 합류(`defense`·`res_*`) ② 몬스터 전용 전역 배율 ③ `attack_type` 덮기.
 *   **직접 computeCombat 을 불러 대조**하므로 한쪽만 바뀌면 빨간불이다.
 */
check('battle: 몬스터는 computeCombat 을 지난다 — 다른 것은 몸값 · 전역 배율 · attack_type 셋뿐 (§8-1 · R79)', () => {
    const id = 1401, m = D.monsters[id], g = D.grades.elite, lvl = 7;
    const gear = SYS.item.rollGear(makeRng(4), { slots: ['weapon', 'armor'], ilvl: 5, weaponGroup: m.weapon_group });
    const e = SYS.battle.makeEnemy('e0', id, 'elite', lvl, gear);
    const stats = { str: m.str, agi: m.agi, int: m.int, vit: m.vit, luck: m.luck, ldr: m.ldr, cha: m.cha };
    // 입력의 `hpBase` — 몬스터의 레벨 1 HP 바탕은 영웅과 갈린다 (R91 · 아래 「레벨 1 HP 바탕」 단정)
    const c = SYS.hero.computeCombat({ stats, level: lvl, cls: m.cls, innate: m.innate_skill, hpBase: B.monster_hp_base }, gear);
    // ① 몸값 — res 는 4원소 객체(직접 %)이고 몸값 위에 장비가 얹힌다
    if (typeof e.res !== 'object' || e.res === null) fail('res 가 객체가 아니다');
    for (const el of ELEMENTS) {
        const want = c[`res_${el}`] + m[`res_${el}`];
        if (e.res[el] !== want) fail(`res ${el} ${e.res[el]} ≠ 장비 ${c[`res_${el}`]} + 몸값 ${m[`res_${el}`]}`);
    }
    // ② 전역 배율 — hp 만 반올림하고 등급 세기는 hp_mult 하나다
    if (e.hp !== Math.round(c.hp_max * g.hp_mult * B.monster_hp_scale)) fail(`hp ${e.hp}`);
    if (Math.abs(e.def - (c.defense + m.defense) * B.monster_def_scale) > 1e-9) fail(`def ${e.def}`);
    const atk0 = c.atk_physical ?? c.atk_magic;
    // 공격력은 범위다 — 전역 배율이 양끝에 같이 곱해진다 (R90)
    if (Math.abs(e.atkMin - atk0.min * B.monster_atk_scale) > 1e-6) fail(`atkMin ${e.atkMin} ≠ ${atk0.min} × monster_atk_scale`);
    if (Math.abs(e.atkMax - atk0.max * B.monster_atk_scale) > 1e-6) fail(`atkMax ${e.atkMax} ≠ ${atk0.max} × monster_atk_scale`);
    // ③ attack_type — 원소를 정하는 것은 스테이지다 (computeCombat 은 R80 으로 언제나 physical 을 낸다)
    if (c.attack_type !== 'physical') fail('computeCombat 이 physical 이 아니다 — R80 미반영');
    if (e.atkType !== m.attack_type) fail(`atkType ${e.atkType} ≠ ${m.attack_type}`);
    if (e.lvl !== lvl) fail('lvl 은 스테이지 dlvl');
    // **밑수도 영웅과 같이 받는다** [D2 사용자 확정] — 치명·재생을 0 으로 덮지 않는다
    if (e.crit !== c.crit_rate) fail(`crit ${e.crit} ≠ ${c.crit_rate} — 밑수를 덮었다 (D2)`);
    if (e.regen !== c.hp_regen) fail(`regen ${e.regen} ≠ ${c.hp_regen} — 밑수를 덮었다 (D2)`);
    if (!(e.crit > 0 && e.regen > 0)) fail('밑수가 0 이다 — computeCombat 을 안 지났다');
    if (e.skillMult !== 1) fail('skillMult');
    if ('acc' in e || 'eva' in e || 'variance' in e || 'dmgBonus' in e) fail('옛 필드가 남아 있다');
    return `elite res ${ELEMENTS.map(el => e.res[el]).join('/')} · hp ${e.hp} · crit ${e.crit}`;
});
/*
 * **몬스터도 장비를 낀다** [R79] — `gear` 는 `wear_slots` 를 그 순서로 채운 한 벌이고, 무기는 `monster.csv:weapon_group` 이다.
 *   장비가 세기를 낸다는 것이 뒤집은 이유이므로(monster_design §5-1) **맨몸보다 세다**는 것도 같이 잰다.
 */
check('battle: 몬스터가 장비를 낀다 — 부위는 wear_slots · 무기군은 제 것 · 맨몸보다 세다 (R79)', () => {
    // 1101(활 1.4)로 잰다 — 아래 주기 줄이 맨몸(`unarmed_period` 1.3)과 갈리는지를 보므로 **주기가 1.3 이 아닌 무기군**이어야 한다
    //   [2026-09-16] 1103 이 십자가(1.3)를 든 고블린 주술사가 되면서 그 줄이 헛돌았다 — 둔기 · 창 · 오브도 1.3 이라 같은 함정이다
    const id = 1101, m = D.monsters[id];
    const slots = String(m.wear_slots).split('|');
    const gear = SYS.item.rollGear(makeRng(12), { slots, ilvl: 10, weaponGroup: m.weapon_group });
    const armed = SYS.battle.makeEnemy('e0', id, 'normal', 10, gear);
    const bare = SYS.battle.makeEnemy('e0', id, 'normal', 10);
    if (armed.gear.length !== slots.length) fail(`gear ${armed.gear.length} ≠ ${slots.length}`);
    armed.gear.forEach((it, i) => { if (it.slot !== slots[i]) fail(`자리 ${i} ${it.slot} ≠ ${slots[i]}`); });
    if (armed.gear[0].group !== m.weapon_group) fail(`무기군 ${armed.gear[0].group} ≠ ${m.weapon_group}`);
    if (!(armed.atkMax > bare.atkMax)) fail(`장비가 공격력을 안 낸다 ${bare.atkMax} → ${armed.atkMax}`);
    if (!(armed.def > bare.def)) fail(`장비가 방어를 안 낸다 ${bare.def} → ${armed.def}`);
    // 주기도 무기군이 낸다 — 맨몸은 unarmed_period 다 (영웅과 같은 식)
    if (!(armed.period !== bare.period)) fail('주기가 무기군을 안 탄다');
    if (bare.gear.length !== 0) fail('맨몸인데 gear 가 있다');
    return `${slots.length}부위 · atk ${bare.atkMax.toFixed(1)} → ${armed.atkMax.toFixed(1)} · def ${bare.def.toFixed(1)} → ${armed.def.toFixed(1)}`;
});
/*
 * **스킬 칸은 등급이 연다** [R79 · skill_design §2 · monster_design §5-1] — 일반 1(고유) · 정예 2(+ 낀 무기의 스킬) ·
 *   보스 3(+ 셋째 칸). **칸은 출처 자리**라 「있는 것 중 앞에서 n개」가 아니다 — 고유가 비어도 무기 스킬이 1번 칸으로 올라오지 않는다.
 */
check('battle: 몬스터 스킬 칸은 등급이 연다 — 일반 1(고유) · 정예 2(+무기) · 보스 3 (R79)', () => {
    const id = 1103, m = D.monsters[id];
    const slots = String(m.wear_slots).split('|');
    const gear = SYS.item.rollGear(makeRng(12), { slots, ilvl: 10, weaponGroup: m.weapon_group });
    const wsk = gear.find(it => it.slot === 'weapon').skill;
    const of = (grade, third) => SYS.battle.makeEnemy('e0', id, grade, 10, gear, { thirdSkill: third }).actives;
    const n = of('normal', 'kni_duel'), el = of('elite', 'kni_duel'), bo = of('stage_boss', 'kni_duel');
    if (n.length !== 1 || n[0].id !== m.innate_skill) fail(`일반 ${n.map(a => a.id).join(',')} ≠ 고유 ${m.innate_skill}`);
    if (n[0].source !== 'innate') fail(`1번 칸 출처 ${n[0].source}`);
    if (el.length !== 2 || el[1].id !== wsk) fail(`정예 둘째 칸 ${el[1]?.id} ≠ 무기 스킬 ${wsk}`);
    if (el[1].source !== 'weapon_group') fail(`둘째 칸 출처 ${el[1].source}`);
    if (bo.length !== 3 || bo[2].id !== 'kni_duel') fail(`보스 셋째 칸 ${bo[2]?.id}`);
    // 정의가 풀려 있어야 한다 — 인스턴스만 넘기면 castable 이 undefined 를 읽는다 (회귀)
    for (const a of bo) { if (!a.def || typeof a.readyAt !== 'number') fail(`${a.id} 정의가 안 풀렸다`); }
    // 열리지 않은 출처는 넘기지 않는다 — 일반 등급에 셋째를 줘도 칸이 늘지 않는다
    if (of('normal', 'kni_duel').length !== 1) fail('일반 등급인데 셋째 칸이 열렸다');
    return `일반 ${n.length} · 정예 ${el.length}(${wsk}) · 보스 ${bo.length}`;
});
check('battle: 마법 무기를 낀 몬스터는 마법 공격력을 든다 — 회복의 바탕값 (monster_design §5-1 · R79)', () => {
    const mage = Object.values(D.monsters).find(m => WG[m.weapon_group].damageKind === 'magic');
    if (!mage) fail('마법 무기 몬스터가 없다');
    const gear = SYS.item.rollGear(makeRng(21), { slots: ['weapon'], ilvl: 8, weaponGroup: mage.weapon_group });
    const e = SYS.battle.makeEnemy('e0', mage.monster_idx, 'normal', 8, gear);
    if (!(e.matkMin > 0 && e.matkMax >= e.matkMin)) fail(`matk ${e.matkMin}~${e.matkMax} — 마법 무기인데 0 이다`);
    // 물리 무기 몬스터는 0 이다
    const phys = Object.values(D.monsters).find(m => WG[m.weapon_group].damageKind === 'physical');
    const pg = SYS.item.rollGear(makeRng(21), { slots: ['weapon'], ilvl: 8, weaponGroup: phys.weapon_group });
    if (SYS.battle.makeEnemy('e0', phys.monster_idx, 'normal', 8, pg).matkMax !== 0) fail('물리 무기인데 matk 가 있다');
    return `${mage.monster_idx} ${mage.weapon_group} matk ${e.matkMin}~${e.matkMax}`;
});
check('battle: stageElement — 스테이지 원소를 로직이 정한다 (편성 화면 표기 §9-8)', () => {
    if (SYS.battle.stageElement(D.stages[101]) !== 'physical') fail('101');
    if (SYS.battle.stageElement(D.stages[104]) !== 'fire') fail(`104 ${SYS.battle.stageElement(D.stages[104])}`);
    for (const s of D.stageList) {
        const el = SYS.battle.stageElement(s);
        if (el !== 'physical' && !ELEMENTS.includes(el)) fail(`${s.stage_id} → ${el}`);
    }
    return `101=physical · 104=${SYS.battle.stageElement(D.stages[104])}`;
});
check('simulate: 결과에 빗나감 집계가 있다 — 레벨 부족의 전용 신호 (§9-8)', () => {
    const r = SYS.battle.simulate(units(), 101, makeRng(5));
    const s = r.strikes;
    if (!s || !(s.party.n >= 1)) fail(`party.n ${s?.party?.n}`);
    if (s.party.miss > s.party.n || s.enemy.miss > s.enemy.n) fail('miss > n');
    const dodges = r.timeline.filter(ev => ev.e === 'dodge').length;
    if (dodges !== s.party.miss + s.enemy.miss) fail(`타임라인 ${dodges} ≠ 집계 ${s.party.miss + s.enemy.miss}`);
    return `party ${s.party.miss}/${s.party.n} · enemy ${s.enemy.miss}/${s.enemy.n}`;
});
check('#1 회귀: 도감 피해 보정이 실제 타격에 곱해진다 — dmgBonus/bonusPct 필드명 통일', () => {
    const mk = bonus => SYS.game.partyOf(G).map(uid => ({ uid, combat: { ...SYS.game.heroCombat(G, SYS.game.heroById(G, uid)), dmg_bonus_pct: bonus } }));
    const firstHit = r => r.timeline.find(ev => ev.e === 'hit' && ev.a.startsWith('p'));
    const a = firstHit(SYS.battle.simulate(mk(0), 101, makeRng(5)));
    const b = firstHit(SYS.battle.simulate(mk(100), 101, makeRng(5)));
    if (!a || !b) fail('파티 타격이 없다');
    if (!(b.dmg > a.dmg)) fail(`보정이 안 걸린다 ${a.dmg} → ${b.dmg}`);
    return `dmg ${a.dmg} → ${b.dmg} (+100%)`;
});
check('simulate: 정예 라운드에 죄종·특성이 붙고 9라운드 구조가 끝까지 돈다', () => {
    // 라운드 구조는 밸런스와 무관한 계약이라 **이길 수 있는 파티**로 본다 —
    // 시작 파티는 현재 수치 대역에서 1라운드에 전멸해 정예(3라운드)에 닿지 못한다 (캘리브레이션 표 참조)
    const r = SYS.battle.simulate(godUnits(), 101, makeRng(5));
    if (!r.won) fail(`god party 도 못 이긴다 (${r.reason})`);
    if (r.roundsCleared !== SYS.battle.stageRounds(D.stages[101]).length) fail(`rounds ${r.roundsCleared}`);
    const el = r.timeline.filter(ev => ev.e === 'round' && ev.kind === 'elite').flatMap(ev => ev.enemies).find(e => e.grade === 'elite');
    if (!el) fail('elite round not reached');
    if (!el.sin || el.traits?.length !== 3) fail(`정예 ${JSON.stringify(el.sin)} / ${el.traits?.length}`);
    const boss = r.timeline.find(ev => ev.e === 'round' && ev.kind === 'boss');
    if (!boss || !boss.enemies.some(e => e.grade === D.stages[101].boss_grade)) fail('보스 라운드');
    return `${el.sin} + 특성 ${el.traits.length} · 보스 ${boss.enemies.length}유닛`;
});
check('battle: 1-1 편성 예외 — 주술사는 3라운드부터 · 정예는 주술사뿐 · 주술사가 서면 척후병 · 전사로 상한까지(주술사 하나) — 채운 몫은 라운드 시작에 없고 주술사가 불러낸다 · 아바돈 혼자 (2026-09-18 · INTERFACE §2-13)', () => {
    const SHAMAN = 1103, FILL = new Set([1101, 1102]);
    let rounds = 0, shamanNormal = 0, early = 0, calls = 0, bosses = 0;
    // 라운드 하나의 명단 = 시작에 선 적 + 불러낸 적. 판정은 라운드가 닫힐 때 명단 전체로 한다
    const judge = (tag, cur) => {
        const roster = [...cur.roster.values()];
        const ids = roster.map(e => e.monsterId);
        const at = `${tag} 라운드 ${cur.ev.n} [시작 ${cur.ev.enemies.map(e => `${e.monsterId}:${e.grade}`).join(' ')} · 명단 ${roster.length}]`;
        const shamans = ids.filter(id => id === SHAMAN).length;
        rounds++;
        if (cur.ev.kind === 'boss') {
            bosses++;
            if (ids.length !== 1 || ids[0] !== D.stages[101].boss_monster_idx) fail(`${at} 아바돈 혼자가 아니다`);
            return;
        }
        if (cur.ev.n < 3) { early++; if (shamans) fail(`${at} 주술사가 3라운드 전에 나왔다`); }
        for (const e of roster) if (e.grade === 'elite' && e.monsterId !== SHAMAN) fail(`${at} 주술사가 아닌 정예`);
        if (cur.ev.kind === 'elite' && !shamans) fail(`${at} 정예 라운드에 주술사가 없다`);
        if (shamans > 1) fail(`${at} 주술사가 둘 이상이다`);
        if (!shamans) return;
        if (cur.ev.kind === 'normal') shamanNormal++;
        // 채운 몫(대기)은 주술사 **뒤에** 뽑혔다 — 라운드 시작에 서면 안 된다
        const lead = cur.ev.enemies.find(e => e.monsterId === SHAMAN);
        if (cur.ev.enemies.some(e => e.key > lead.key)) fail(`${at} 대기 몫이 라운드 시작에 섰다`);
        if (ids.some(id => id !== SHAMAN && !FILL.has(id))) fail(`${at} 무리가 척후병 · 전사가 아니다`);
        // 불렀으면 상한까지 · 안 불렀으면 주술사가 첫 차례 전에 쓰러졌거나 부를 몫이 없었다
        if (cur.called ? roster.length !== B.wave_monster_max : !(cur.shamanDownFirst || roster.length === B.wave_monster_max))
            fail(`${at} 불렀나 ${cur.called} · 먼저 쓰러졌나 ${cur.shamanDownFirst} — 명단이 상한 ${B.wave_monster_max} 이 아니다`);
    };
    // 신 파티(보스까지 간다 — 정예 주술사를 첫 차례 전에 잡기도 한다) + 느린 파티(주술사가 부를 틈이 있다) · 둘 다 안 쓰러진다
    for (const atk of [2000, 40]) for (let seed = 1; seed <= 12; seed++) {
        const party = godUnits().map(u => ({ ...u, combat: { ...u.combat, atk_physical: { min: atk, max: atk } } }));
        const r = SYS.battle.simulate(party, 101, makeRng(seed));
        const tag = `atk ${atk} seed ${seed}`;
        let cur = null;
        for (const ev of r.timeline) {
            if (ev.e === 'round') {
                if (cur) judge(tag, cur);
                cur = { ev, roster: new Map(ev.enemies.map(e => [e.key, e])), called: false, shamanDownFirst: false };
                continue;
            }
            if (!cur) continue;
            if (ev.e === 'down' && cur.roster.get(ev.u)?.monsterId === SHAMAN && !cur.called) cur.shamanDownFirst = true;
            if (ev.e === 'call') {
                if (cur.roster.get(ev.u)?.monsterId !== SHAMAN) fail(`${tag} 라운드 ${cur.ev.n} 주술사가 아닌 ${ev.u} 가 불렀다`);
                cur.called = true; calls++;
                for (const e of ev.units) cur.roster.set(e.key, e);
            }
        }
        if (cur) judge(tag, cur);
    }
    if (!early) fail('1 · 2라운드 표본이 없다');
    if (!bosses) fail('보스 라운드 표본이 없다');
    if (!calls) fail('한 번도 안 불렀다 — 불러내기를 못 잰다');
    if (!shamanNormal) fail('일반 라운드에 주술사가 한 번도 안 섰다 — 일반 라운드의 채움을 못 잰다');
    return `${rounds}라운드 · 불러내기 ${calls}회 · 일반 라운드에 선 주술사 ${shamanNormal}회`;
});
check('battle: 고블린 소환 — 부를 것이 있을 때만 · 쿨마다 · 쓰러진 무리는 한 번에 되살아난다 · 보상은 한 마리당 한 번 (2026-09-18 · skill_design §12-9 · INTERFACE §2-6 `call`)', () => {
    const SK_ID = 'mon_summon_goblin';
    let casts = 0, revives = 0, reDowns = 0;
    // 약한 파티(안 쓰러진다) — 주술사가 쿨이 돌 때까지 살아 있어야 되살림이 선다
    for (const atk of [6, 12, 25]) for (let seed = 1; seed <= 6; seed++) {
        const party = godUnits().map(u => ({ ...u, combat: { ...u.combat, atk_physical: { min: atk, max: atk } } }));
        const r = SYS.battle.simulate(party, 101, makeRng(seed));
        const tag = `atk ${atk} seed ${seed}`;
        const downs = [];                          // 라운드마다 {key: 쓰러진 횟수}
        let seen = null, ready = null;
        const tl = r.timeline;
        for (let i = 0; i < tl.length; i++) {
            const ev = tl[i];
            if (ev.e === 'round') { seen = new Set(ev.enemies.map(e => e.key)); downs.push(new Map()); ready = null; continue; }
            if (!seen) continue;
            if (ev.e === 'down' && ev.u.startsWith('e')) { const d = downs[downs.length - 1]; d.set(ev.u, (d.get(ev.u) ?? 0) + 1); }
            if (ev.e === 'skill' && ev.s === SK_ID) {
                casts++;
                // 부를 것이 없으면 안 쓴다(`band_missing`) — 시전 바로 뒤에 늘 `call` 이 선다
                if (tl[i + 1]?.e !== 'call' || !tl[i + 1].units.length) fail(`${tag} ${ev.t}s 시전 뒤에 부름이 없다 — 빈 부름`);
                if (ready !== null && ev.t < ready - 0.05) fail(`${tag} 쿨 전에 또 불렀다 ${ev.t} < ${ready}`);
                ready = ev.ready;
            }
            if (ev.e === 'call') for (const e of ev.units) {
                if (seen.has(e.key)) {
                    // 되살아남 — 그 전에 쓰러져 있었다
                    if (!downs[downs.length - 1].get(e.key)) fail(`${tag} ${e.key} 가 안 쓰러졌는데 다시 불렸다`);
                    revives++;
                }
                seen.add(e.key);
            }
        }
        // 보상은 한 마리당 한 번 — 라운드의 처치 기록 수 = 쓰러진 적(키) 수. 두 번째 쓰러짐은 기록이 없다
        downs.forEach((d, k) => {
            const killed = r.rounds[k]?.killed?.length ?? 0;
            if (killed !== d.size) fail(`${tag} 라운드 ${k + 1} 처치 기록 ${killed} ≠ 쓰러진 적 ${d.size}`);
            for (const n of d.values()) reDowns += n - 1;
        });
    }
    if (!casts) fail('한 번도 안 불렀다');
    if (!revives) fail('되살림 표본이 없다 — 약한 파티의 공격력을 더 낮춘다');
    if (!reDowns) fail('되살아난 무리가 다시 쓰러진 표본이 없다 — 보상 한 번을 못 잰다');
    return `시전 ${casts} · 되살림 ${revives} · 두 번째 쓰러짐 ${reDowns}(보상 없음)`;
});
check('simulate: 챕터보스 스테이지는 보스 1라운드 — 적은 챕터보스 하나 · 클리어하면 roundsCleared 1 (base_expedition_design §1-2 · R75)', () => {
    const st = D.stageList.find(s => s.boss_grade === 'chapter_boss');
    const r = SYS.battle.simulate(godUnits(), st.stage_id, makeRng(5));
    const rounds = r.timeline.filter(ev => ev.e === 'round');
    if (rounds.length !== 1 || rounds[0].kind !== 'boss') fail(`라운드 ${rounds.map(ev => ev.kind).join(',')}`);
    const foes = rounds[0].enemies;
    if (foes.length !== 1 || foes[0].monsterId !== st.boss_monster_idx || foes[0].grade !== 'chapter_boss')
        fail(`적 ${foes.map(e => `${e.monsterId}:${e.grade}`).join(',')}`);
    if (!r.won || r.roundsCleared !== 1) fail(`${r.reason} r${r.roundsCleared}`);
    return `${st.stage_id} — ${foes[0].monsterId} 단독 · ${r.durationSec}s`;
});
check('simulate: 오버레벨이면 빗나감이 사라진다 — 적정 레벨의 분산은 0 (§9-4)', () => {
    const r = SYS.battle.simulate(godUnits(), 101, makeRng(5));
    if (r.strikes.party.miss !== 0) fail(`레벨 50 파티가 dlvl ${D.stages[101].dlvl} 에서 빗나갔다 (${r.strikes.party.miss})`);
    const under = SYS.battle.simulate(godUnits(1), 401, makeRng(5));
    if (!(under.strikes.party.miss > 0)) fail(`레벨 1 파티가 dlvl ${D.stages[401].dlvl} 에서 하나도 안 빗나갔다`);
    return `Lv50@dlvl2 = 0회 · Lv1@dlvl${D.stages[401].dlvl} = ${under.strikes.party.miss}회`;
});
// ~~도감 카드는 처치의 부분집합~~ — 2026-09-21 도감 카드를 걷었다(monster_design §8 · 레벨은 처치 수). card 이벤트는 R89 에 이미 없어졌다
check('simulate: 도감 카드가 없다 — 결과에 cards 가 없고 타임라인에 card 이벤트가 없다 · 처치 수는 모인다 (2026-09-21)', () => {
    let kills = 0;
    for (let seed = 1; seed <= 10; seed++) {
        const r = SYS.battle.simulate(units(), 101, makeRng(seed));
        if (r.timeline.some(ev => ev.e === 'card')) fail(`seed ${seed} — card 이벤트가 되살아났다`);
        if ('cards' in r) fail(`seed ${seed} — 결과에 cards 가 되살아났다`);
        kills += Object.values(r.kills).reduce((a, b) => a + b, 0);
    }
    return kills > 0 ? `${kills} kills / 10 runs` : fail('10 런에 처치가 하나도 없다');
});

/* ── 스킬 — 정의·배정·선택은 skill.js, 실행은 battle.js ── */

/** 액티브를 실은 파티 — 기존 simulate 단정은 `units()`(액티브 없음) 그대로 둔다: rng 수열 불변을 지키기 위해서다 */
const skillUnits = () => units().map(u => {
    const h = SYS.game.heroById(G, u.uid);
    return { ...u, actives: SYS.skill.activesFor(h, { weaponSkill: SYS.game.weaponSkillOf(G, h) }) };
});
/** 특정 직업의 액티브를 손으로 실은 파티 — 파티에 없는 직업의 **실행**을 보려는 용도 (배정 규칙은 activesFor 단정이 따로 본다) */
/**
 * 특정 직업의 액티브를 **손으로 전부** 실은 파티 — 배정이 아니라 **실행**(회복·다단타·도발)을 보려는 용도다.
 * 배정은 출처가 정하므로 최대 둘(고유 · 무기)이고, 직업 풀의 나머지는 **배정으로는 영원히 안 나간다** —
 * 그래서 실행을 보려면 킷을 손으로 실어야 한다 (2026-09-09 · 직업 풀은 `owner_kind=job`).
 */
const clsUnits = cls => {
    const kit = SYS.skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === cls)
        .slice().sort((a, b) => a.priority - b.priority).map(d => ({ id: d.id, source: 'innate' }));
    return units().map(u => ({ ...u, actives: kit }));
};
/** 시드 탐색 — 어느 전투에서 그 사건이 나는지는 편성·굴림에 달렸다. 못 찾으면 던진다 */
function findSeed(pred, mk = skillUnits, stageId = 101) {
    for (let seed = 1; seed <= 40; seed++) {
        const r = SYS.battle.simulate(mk(), stageId, makeRng(seed));
        if (pred(r)) return { seed, r };
    }
    return fail('시드 탐색 실패 (1~40)');
}

check('skill: 어휘 — owner_kind/cast/effect/target/걸린 효과 stat/cast_condition 이 사전 안 · 출처마다 priority 유일 (§9-5 · 표 셋 2026-09-22)', () => {
    // 2026-09-09 확장 — 직업 스킬 풀 37 (skill_design §12 · DEV_PLAN R61) · 2026-09-22 옛 kind → 나가는 방식(cast) + 하는 일(effect) (R136)
    const CAST = ['turn', 'aura', 'event'];
    const EFFECT = ['hit', 'heal', 'apply', 'summon', 'call', 'fixed'];   // call = 불러내기 · fixed = 비직격(사망 폭발 §9-6) · 둘 다 몬스터 전용 (§12-9)
    const TGT = ['enemy_single', 'enemy_all', 'enemy_rotate', 'enemy_chain', 'enemy_highest_def',
        'self', 'party', 'ally_single', 'party_adjacent', 'enemy_hp_max'];      // enemy_hp_max — 적에게 거는 창의 「HP 최대」(2026-09-24 R151)
    const STAT = ['atk_pct', 'barrier_pct', 'period_pct', 'taunt', 'guard_pct', 'hp_max_pct',
        'regen_pct', 'dr_pct', 'onhit_element', 'attack_splash', 'duel'];
    const COND = ['buff_absent', 'ally_hp_below', 'band_missing', 'on_death'];
    const OWNER = ['job', 'advance', 'unique', 'monster'];
    const seen = {};
    for (const d of SYS.skill.list) {
        if (!OWNER.includes(d.ownerKind)) fail(`${d.id} owner_kind ${d.ownerKind}`);
        if (!CAST.includes(d.cast)) fail(`${d.id} cast ${d.cast}`);
        if (!TGT.includes(d.target)) fail(`${d.id} target ${d.target}`);
        for (const e of d.effects) {
            if (!EFFECT.includes(e.effect)) fail(`${d.id} effect ${e.effect}`);
            // 걸린 효과는 apply 줄만 건다 — 오오라도 창의 stat 을 든다
            const st = e.status === null ? null : SYS.skill.statuses[e.status];
            if (e.effect === 'apply' ? !STAT.includes(st?.stat) : e.status !== null) fail(`${d.id} status ${e.status} (${st?.stat})`);
            const el = e.effect === 'apply' ? st.element : e.element;
            if (el !== null && !ELEMENTS.includes(el)) fail(`${d.id} element ${el}`);
        }
        if (d.cond !== null && !COND.includes(d.cond)) fail(`${d.id} cast_condition ${d.cond}`);
        const k = `${d.ownerKind}#${d.ownerId}#${d.priority}`;
        if (seen[k]) fail(`priority 중복 ${k} (${seen[k]} / ${d.id})`);
        seen[k] = d.id;
    }
    return `${SYS.skill.list.length} defs`;
});
/**
 * 배정 — **출처가 칸을 정한다** (§2). 두 출처(고유 · 무기)가 **같은 직업 풀**에서 하나씩 오고,
 * 전직 칸은 찍기가 없어 언제나 빈다(R52). 여기가 다시 `advance` 를 내면 임시 채움이 되살아난 것이다.
 * ⚠ **무기 칸의 입력이 무기군에서 「무기 개체가 담은 스킬」로 바뀌었다** [2026-09-09 · §12-1 규칙 3].
 */
check('skill: activesFor — 칸은 출처가 정한다 · 고유 / 무기(개체가 담은 것) / 전직(언제나 빈 칸) (skill_design §2 · §12)', () => {
    const srcOf = (hero, ctx) => SYS.skill.activesFor(hero, ctx).map(a => a.source);
    const idsOf = (hero, ctx) => SYS.skill.activesFor(hero, ctx).map(a => a.id);
    const MAIN = D.classes.filter(c => c.stage === 'main').map(c => c.id);
    for (const cls of MAIN) {
        const pool = SYS.skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === cls);
        if (pool.length < 2) fail(`${cls} 직업 풀이 ${pool.length}행 — 두 출처를 볼 수 없다`);
        // ① 맨손 · 고유 없음 — **칸이 하나도 없다.** 전직을 안 찍었으므로 3번 칸도 비어 있다
        if (SYS.skill.activesFor({ cls }).length !== 0) fail(`${cls} 맨손·고유없음인데 칸이 생겼다`);
        // ② 무기를 들면 무기 칸 **하나뿐** — 전직 칸이 따라 붙으면 임시 채움이 되살아난 것이다
        const withW = SYS.skill.activesFor({ cls }, { weaponSkill: pool[1].id });
        if (!eq(withW.map(a => a.source), ['weapon_group'])) fail(`${cls} 무기 출처 ${withW.map(a => a.source)}`);
        if (withW[0].id !== pool[1].id) fail(`${cls} 무기 칸 ${withW[0].id} ≠ ${pool[1].id}`);
        // ③ 고유 + 무기 = **둘** · 순서는 고유 → 무기. 상한(`active_slots`)은 안 넘는다
        const full = SYS.skill.activesFor({ cls, innate: pool[0].id }, { weaponSkill: pool[1].id });
        if (!eq(full.map(a => a.source), ['innate', 'weapon_group'])) fail(`${cls} 순서 ${full.map(a => a.source)}`);
        if (full[0].id !== pool[0].id) fail(`${cls} 고유가 1번 칸이 아니다`);
        if (full.length > B.active_slots) fail(`${cls} 칸 ${full.length} > ${B.active_slots}`);
        // ④ **두 출처가 같은 스킬이어도 칸은 둘이다** [사용자 지시 2026-09-09 · ~~중복 제거~~ 폐기].
        //   한 풀에서 둘이 가져가므로 실제로 일어난다(§12-1 규칙 3). 칸은 출처 자리라 겹쳐도 각자 선다 —
        //   걷어내면 화면의 「무기」 칸이 비어 맨손과 구분이 안 됐다. **회귀 그물**이다
        const same = SYS.skill.activesFor({ cls, innate: pool[0].id }, { weaponSkill: pool[0].id });
        if (!eq(same.map(a => a.source), ['innate', 'weapon_group'])) fail(`${cls} 겹쳤다고 칸이 줄었다 ${same.map(a => a.source)}`);
        if (!eq(same.map(a => a.id), [pool[0].id, pool[0].id])) fail(`${cls} 겹친 칸의 스킬이 다르다 ${same.map(a => a.id)}`);
        // ⑤ 없는 스킬 id · 정의에 없는 고유 — 그 칸만 빈다 (던지지 않는다)
        if (srcOf({ cls }, { weaponSkill: 'nope' }).length !== 0) fail(`${cls} 없는 스킬이 무기 칸을 먹었다`);
        if (!eq(idsOf({ cls, innate: 'nope' }), idsOf({ cls }))) fail(`${cls} 정의 없는 고유가 칸을 먹었다`);
        // ⑥ **어떤 영웅도 `advance` 출처를 못 받는다** — 찍기가 없으므로 (2026-09-08)
        for (const ctx of [undefined, { weaponSkill: pool[1].id }])
            if (SYS.skill.activesFor({ cls, innate: pool[0].id }, ctx).some(a => a.source === 'advance'))
                fail(`${cls} 전직 칸이 찍지도 않았는데 찼다`);
    }
    return `${MAIN.length}직업 × (고유 · 무기) · 전직 칸은 빈다`;
});
/**
 * 무기 개체가 스킬을 담는다 [확정 2026-09-09 · §12-1 규칙 3] — ~~무기군이 스킬의 종류를 정한다~~ 는 폐기됐다.
 * 「전사류 무기에 전사류 스킬이 붙는다」가 계약이고, **같은 무기군이라도 개체마다 다를 수 있다**.
 */
check('item: 무기 개체가 그 무기군의 **직업 풀**에서 스킬을 담는다 · 같은 무기군도 개체마다 갈린다 (skill_design §12-1)', () => {
    const poolOf = cls => SYS.skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === cls).map(d => d.id);
    const rng = makeRng(7);
    const seen = {};
    let n = 0;
    for (let i = 0; i < 400; i++) {
        const it = SYS.item.rollDrop(rng, 10);
        if (it.slot !== 'weapon') continue;
        n++;
        const cls = SYS.item.groupOf(it)?.classes?.[0];
        if (!poolOf(cls).includes(it.skill)) fail(`${it.group}(${cls}) 가 ${it.skill} 를 담았다 — 그 직업 풀 밖이다`);
        (seen[it.group] = seen[it.group] ?? new Set()).add(it.skill);
    }
    if (n === 0) fail('400 드롭에 무기가 하나도 없다');
    // 방어구·장신구는 스킬을 안 든다 — 무기만이다
    const armor = SYS.item.rollDrop(makeRng(3), 10);
    if (armor.slot !== 'weapon' && armor.skill !== undefined) fail(`${armor.slot} 이 skill 을 들었다`);
    // 풀이 2행 이상인 직업의 무기군은 개체마다 갈려야 한다 — 하나로 고정이면 「무기군 고정」이 되살아난 것이다
    const varied = Object.entries(seen).filter(([g]) => poolOf(WG[g]?.classes?.[0]).length > 1);
    if (varied.length && !varied.some(([, set]) => set.size > 1))
        fail('무기군마다 스킬이 하나로 고정됐다 — 개체 굴림이 죽었다');
    return `${n}자루 · ${Object.entries(seen).map(([g, set]) => `${g} ${set.size}종`).join(' · ')}`;
});
/** 고유 스킬은 **제 직업 풀**에서 굴린다 [개정 2026-09-09 · §12-1 규칙 1] — 「마법사가 배쉬를 드는 일은 없다」 */
check('hero: 고유 스킬이 제 직업 풀 안에서 나온다 · 풀이 비어도 rng 1회 (skill_design §12-1 규칙 1)', () => {
    const poolOf = cls => SYS.skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === cls).map(d => d.id);
    const MAIN = D.classes.filter(c => c.stage === 'main').map(c => c.id);
    const hit = {};
    for (const cls of MAIN) {
        const rng = makeRng(11);
        for (let i = 0; i < 200; i++) {
            const id = SYS.hero.rollInnate(rng, cls);
            if (!poolOf(cls).includes(id)) fail(`${cls} 가 ${id} 를 굴렸다 — 직업 풀 밖이다`);
            (hit[cls] = hit[cls] ?? new Set()).add(id);
        }
        if (hit[cls].size < 2 && poolOf(cls).length > 1) fail(`${cls} 가 한 스킬만 굴린다`);
    }
    // 풀이 빈 직업(확장)도 **1회 소비**한다 — 소비 수가 직업에 의존하면 같은 시드가 다른 파티를 낸다
    const a = makeRng(5), b = makeRng(5);
    if (SYS.hero.rollInnate(a, 'assassin') !== null) fail('풀이 빈 직업인데 스킬이 나왔다');
    b();
    if (a() !== b()) fail('풀이 비었는데 rng 를 안 썼다 — 소비 수가 직업에 의존한다');
    return MAIN.map(c => `${c} ${hit[c].size}종`).join(' · ');
});
check('simulate: 고유 스킬이 1번 칸에 실린다 — 무기군 칸이 생겨도 앞자리는 고유다 (INTERFACE §2-7)', () => {
    const r = SYS.battle.simulate(skillUnits(), 101, makeRng(5));
    for (const p of r.party) {
        const h = SYS.game.heroById(G, p.uid);
        if (p.actives[0] !== h.innate) fail(`${p.uid} actives[0] ${p.actives[0]} ≠ innate ${h.innate}`);
    }
    return r.party.map(p => p.actives[0]).join(' · ');
});
check('formula: effectiveCd — ceil(cd/period)×period · 정수배면 손실 0 (battle_design §6)', () => {
    const F = SYS.formula;
    if (F.effectiveCd(15, 1.5) !== 15) fail(`15@1.5 → ${F.effectiveCd(15, 1.5)}`);
    if (F.effectiveCd(5, 1.5) !== 6) fail(`5@1.5 → ${F.effectiveCd(5, 1.5)}`);
    if (F.effectiveCd(9, 2) !== 10) fail(`9@2 → ${F.effectiveCd(9, 2)}`);
    for (const d of SYS.skill.list) if (F.effectiveCd(d.cool, 1.5) < d.cool) fail(`${d.id} 실효 쿨이 쿨보다 짧다`);
    return '15@1.5=15 · 5@1.5=6 · 9@2=10';
});
/**
 * 동률의 기준이 `priority` → **칸 순서**로 바뀌었다 (2026-09-01 · battle_design §5 · skill_design §2).
 * 그래서 배열을 **일부러 priority 역순**으로 세운다 — priority 가 뒤인 것이 앞칸이면 그것이 먼저 나가야 한다.
 * `skill.csv:priority` 는 이제 `activesFor` 의 직업 행 기본 정렬에만 쓰인다.
 */
check('skill: pickReady — readyAt 최소 우선 · 동률은 칸 순서(priority 아님) · 조건 거짓은 준비 아님 (battle_design §3)', () => {
    const d = SYS.skill.defs;
    const A = [
        { id: 'mag_iceblast', def: d.mag_iceblast, readyAt: 1 },      // priority 3 — 그런데 1번 칸이다
        { id: 'mag_chain', def: d.mag_chain, readyAt: 1 },            // priority 2
        { id: 'mag_fireball', def: d.mag_fireball, readyAt: 3 },      // priority 1
    ];
    const snap = JSON.stringify(A);
    if (SYS.skill.pickReady(A, 0.5, null) !== null) fail('아무것도 안 준비됐는데 골랐다');
    if (SYS.skill.pickReady(A, 1, null).id !== 'mag_iceblast') fail('동률이면 앞칸 — priority 를 다시 읽었다');
    if (SYS.skill.pickReady(A, 9, null).id !== 'mag_iceblast') fail('가장 오래 기다린 것 우선');
    if (SYS.skill.pickReady(A, 9, a => a.id !== 'mag_iceblast').id !== 'mag_chain') fail('조건 거짓은 제외');
    if (JSON.stringify(A) !== snap) fail('pickReady 가 입력을 바꿨다 (순수해야 한다)');
    return `1번 칸 iceblast(readyAt 1·pri ${d.mag_iceblast.priority}) 가 chain(1·${d.mag_chain.priority}) 보다 먼저`;
});
check('skill: castable — buff_absent 는 창이 있으면 거짓 · ally_hp_below 는 임계 미만 아군이 있어야 참 (§9-3)', () => {
    const d = SYS.skill.defs;
    const self = { hp: 100, hpMax: 100, buffs: {} };
    const full = [{ hp: 100, hpMax: 100 }, { hp: 80, hpMax: 100 }];
    const hurt = [{ hp: 100, hpMax: 100 }, { hp: 50, hpMax: 100 }];
    if (!SYS.skill.castable(d.pri_grace, { self, allies: full })) fail('창이 없으면 참이어야 한다');
    self.buffs.pri_grace = { stat: 'atk_pct', v: skillLine('pri_grace').value, until: skillLine('pri_grace').dur };
    if (SYS.skill.castable(d.pri_grace, { self, allies: full })) fail('창이 있으면 거짓이어야 한다');
    if (SYS.skill.castable(d.pri_heal, { self, allies: full })) fail(`80% 는 임계 ${d.pri_heal.condValue} 이상`);
    if (!SYS.skill.castable(d.pri_heal, { self, allies: hurt })) fail('50% 아군이 있으면 참');
    if (!SYS.skill.castable(d.mag_chain, { self, allies: full })) fail('조건 없음(-)은 항상 참');
    return `ally_hp_below 임계 ${d.pri_heal.condValue}%`;
});
check('simulate: 스킬 — actives 가 있으면 skill 이벤트와 casts 가 생긴다', () => {
    const r = SYS.battle.simulate(skillUnits(), 101, makeRng(5));
    const evs = r.timeline.filter(ev => ev.e === 'skill');
    if (evs.length === 0) fail('skill 이벤트가 없다');
    const total = Object.values(r.casts).reduce((a, b) => a + b, 0);
    if (total !== evs.length) fail(`casts 합 ${total} ≠ 이벤트 ${evs.length}`);
    const owned = new Set(r.party.flatMap(p => p.actives ?? []));
    if (owned.size === 0) fail('party[*].actives 가 비었다');
    // 몬스터도 제 칸으로 시전한다 [2026-09-11 · R79] — 파티가 쓴 것은 파티 칸의 것이어야 하고, 적이 쓴 것은 정의가 실재해야 한다
    for (const ev of evs) {
        if (!SYS.skill.defs[ev.s]) fail(`모르는 스킬 ${ev.s}`);
        if (ev.u.startsWith('p') && !owned.has(ev.s)) fail(`안 가진 스킬을 썼다 ${ev.u} ${ev.s}`);
    }
    return Object.entries(r.casts).map(([id, n]) => `${id}×${n}`).join(' · ');
});
check('simulate: skill 이벤트가 준비 시각(ready)을 싣는다 — 재생기가 쿨을 계산하지 않는다 (INTERFACE §2-6)', () => {
    const us = skillUnits();
    // 쿨감은 유닛마다 다르다 — 로브를 낀 영웅(R107) · **티아라 투구를 입은 몬스터**(공통옵션 · 2026-09-18). 파티는 전투 능력치,
    //   적은 `round` 이벤트의 세부 능력치(`sheet`)에서 읽어 **그 유닛의** 기대값을 세운다(적 키는 라운드마다 다시 쓰인다)
    const cdr = new Map(us.map((u, i) => [`p${i}`, u.combat?.cooldown_reduction ?? 0]));
    const r = SYS.battle.simulate(us, 101, makeRng(5));
    let casts = 0;
    for (const ev of r.timeline) {
        if (ev.e === 'round') for (const e of ev.enemies) cdr.set(e.key, e.sheet?.cooldown_reduction ?? 0);
        if (ev.e === 'call') for (const e of ev.units) cdr.set(e.key, e.sheet?.cooldown_reduction ?? 0);   // 불러낸 적도 같은 모양 (2026-09-18)
        if (ev.e !== 'skill') continue;
        casts++;
        if (typeof ev.ready !== 'number') fail(`${ev.s} 에 ready 가 없다`);
        if (ev.ready <= ev.t) fail(`${ev.s} ready ${ev.ready} ≤ t ${ev.t}`);
        // 준비까지의 간격 = 표기 쿨 × max(바닥, 1 − 쿨감) — 시각이 소수 1자리라 ±0.15 (쿨감은 비율 · R111)
        const cd = SYS.skill.defs[ev.s].cool;
        const want = cd * Math.max(B.skill_cd_floor_mult, 1 - (cdr.get(ev.u) ?? 0));
        if (Math.abs((ev.ready - ev.t) - want) > 0.15)
            fail(`${ev.u} ${ev.s} 쿨 ${(ev.ready - ev.t).toFixed(1)} ≠ ${want.toFixed(1)} (표기 ${cd} · 쿨감 ${M.pctNum(cdr.get(ev.u) ?? 0)}%)`);
    }
    if (!casts) fail('시전이 없다');
    return `${casts} casts`;
});
check('simulate: 스킬 — 같은 시드 = 같은 타임라인 (actives 포함)', () => {
    const a = SYS.battle.simulate(skillUnits(), 101, makeRng(7));
    const b = SYS.battle.simulate(skillUnits(), 101, makeRng(7));
    return eq(a, b) ? `${a.timeline.length} events` : fail('스킬을 실으면 결정론이 깨진다');
});
check('simulate: 스킬 — 파티 actives 가 비면 파티는 시전하지 않는다 · 몬스터는 제 칸으로 시전한다 (D16 · R79)', () => {
    const a = SYS.battle.simulate(units(), 101, makeRng(5));
    const b = SYS.battle.simulate(units(), 101, makeRng(5));
    if (!eq(a, b)) fail('결정론');
    // ~~스킬 사건이 하나도 없다~~ 는 R79 로 성립하지 않는다 — 몬스터가 스킬 칸을 갖게 됐다. **파티 쪽만** 본다
    const bad = a.timeline.filter(ev =>
        (ev.e === 'skill' && ev.u.startsWith('p'))
        || ((ev.e === 'hit' || ev.e === 'dodge') && ev.a.startsWith('p') && ev.s !== undefined));
    if (bad.length) fail(`파티 스킬 사건 ${bad.length}건`);
    const enemyCasts = a.timeline.filter(ev => ev.e === 'skill' && ev.u.startsWith('e')).length;
    const total = Object.values(a.casts).reduce((x, y) => x + y, 0);
    if (total !== enemyCasts) fail(`casts 합 ${total} ≠ 적 시전 ${enemyCasts} — 파티 몫이 섞였다`);
    return `${a.timeline.length} events · 파티 시전 0 · 적 시전 ${enemyCasts}`;
});
/*
 * **적 카드의 스킬 칸 = `round` 이벤트의 `actives`** [2026-09-11 · R79 후속 · 사용자 지적 · INTERFACE §2-6 · §6].
 *   재생기는 적의 `skill` 이벤트를 **그 라운드 이벤트가 실어 온 칸**에서 찾고, 없으면 조용히 흘린다 —
 *   옛 판은 이 필드가 없어 재생기가 `skills: []` 로 비웠고, R79 로 몬스터가 스킬을 쓰게 된 뒤에도 칸이 빈 채였다.
 *   ① 적의 시전은 **전부 제 칸 안**이다(재생기가 찾을 수 있다) ② 1번 칸은 고유 · 칸 수는 등급이 연 수 이하
 *   ③ 툴팁 표시값(`atkMin`·`atkMax`·`matkMin`·`matkMax`·`atkType`·`stats` — 범위 R90)이 실린다 — 파티의 `result.party[]` 와 같은 모양
 */
check('simulate: round 이벤트가 적의 스킬 칸(actives)과 툴팁 표시값을 싣는다 — 적의 시전은 전부 제 칸 안이다 (INTERFACE §2-6 · R79 후속)', () => {
    const AXES = ['str', 'agi', 'int', 'vit', 'luck', 'ldr', 'cha'];
    let rounds = 0, casts = 0, multi = 0, third = 0;
    // 약한 파티(적이 오래 살아 시전한다) + 신 파티(보스 라운드까지 간다)
    for (const mk of [skillUnits, godUnits]) for (const stage of [101, 103, 105]) for (let seed = 1; seed <= 3; seed++) {
        const r = SYS.battle.simulate(mk(), stage, makeRng(seed));
        const slotsOf = new Map();
        // 불러내기(`call` · 2026-09-18)의 `units` 도 `round` 의 `enemies` 와 같은 모양이다 — 불린 적도 제 칸으로 시전해야 재생기가 안 흘린다
        const take = list => {
            for (const e of list) {
                const m = D.monsters[e.monsterId], g = D.grades[e.grade], tag = `${stage}/${seed} ${e.key} ${e.monsterId}`;
                if (!Array.isArray(e.actives)) fail(`${tag} actives 가 배열이 아니다 (${e.actives})`);
                for (const id of e.actives) if (typeof id !== 'string' || !SYS.skill.defs[id]) fail(`${tag} 칸이 스킬 id 가 아니다 (${JSON.stringify(id)})`);
                if (e.actives[0] !== m.innate_skill) fail(`${tag} 1번 칸 ${e.actives[0]} ≠ 고유 ${m.innate_skill}`);
                if (!(e.actives.length >= 1 && e.actives.length <= g.skill_slots)) fail(`${tag} ${e.grade} 칸 ${e.actives.length} — 1..${g.skill_slots} 밖`);
                if (e.atkType !== m.attack_type) fail(`${tag} atkType ${e.atkType} ≠ ${m.attack_type}`);
                if (!(e.atkMin > 0 && e.atkMax >= e.atkMin) || typeof e.matkMin !== 'number' || typeof e.matkMax !== 'number')
                    fail(`${tag} atk ${e.atkMin}~${e.atkMax} · matk ${e.matkMin}~${e.matkMax}`);
                for (const k of AXES) if (e.stats?.[k] !== m[k]) fail(`${tag} stats.${k} ${e.stats?.[k]} ≠ ${m[k]}`);
                if (e.actives.length >= 2) multi++;
                if (e.actives.length >= 3) third++;
                slotsOf.set(e.key, e.actives);
            }
        };
        for (const ev of r.timeline) {
            if (ev.e === 'round') { slotsOf.clear(); rounds++; take(ev.enemies); }
            else if (ev.e === 'call') take(ev.units);
            else if (ev.e === 'skill' && ev.u.startsWith('e')) {
                casts++;
                const own = slotsOf.get(ev.u);
                if (!own) fail(`${stage}/${seed} ${ev.u} 는 라운드 이벤트에 없다`);
                if (!own.includes(ev.s)) fail(`${stage}/${seed} ${ev.u} 가 칸에 없는 ${ev.s} 를 썼다 (칸 ${own.join(',')}) — 재생기가 흘린다`);
            }
        }
    }
    if (!casts) fail('적 시전이 한 번도 없다 — 표본');
    if (!multi || !third) fail(`둘째 칸 ${multi} · 셋째 칸 ${third} — 정예·보스 표본 부족`);
    return `라운드 ${rounds} · 적 시전 ${casts} · 칸 둘 이상 ${multi} · 셋 ${third}`;
});
check('simulate: 버프 창 — 창 길이 = duration · 재시전은 중첩 없이 until 갱신 · 만료마다 buffEnd (battle_design §7)', () => {
    // 버프는 직업 풀의 뒤쪽 자리라 배정(고유 · 무기)으로는 드물다 — 사제 킷을 손으로 십는다
    // 오오라 창(`until: null` · R98)은 창 길이가 없다 — 적의 오오라가 첫 buff 로 설 수 있어 뺀다
    const timed = ev => ev.e === 'buff' && ev.until !== null;
    // 버프 지속시간(반지 · 목걸이 공통옵션 · 2026-09-21)은 걷는다 — 창 길이 규칙만 본다(지속시간 배율은 「runtime: 버프 지속시간」 단정이 든다)
    const noBuffDur = us => us.map(u => ({ ...u, combat: { ...u.combat, option_fx: u.combat.option_fx && { ...u.combat.option_fx, buffDur: 0 } } }));
    const { seed, r } = findSeed(x => x.timeline.some(timed), () => noBuffDur(clsUnits('priest')));
    const first = r.timeline.find(timed);
    const def = skillLine(first.s);                    // 창 길이 = 그 스킬이 거는 걸린 효과의 시간 (2026-09-22)
    const own = r.timeline.filter(ev => (ev.e === 'buff' || ev.e === 'buffEnd') && ev.u === first.u && ev.s === first.s);
    let open = null, ends = 0, refresh = 0;
    for (const ev of own) {
        if (ev.e === 'buff') {
            if (Math.abs((ev.until - ev.t) - def.dur) > 0.11) fail(`창 길이 ${ev.until - ev.t} ≠ duration ${def.dur}`);
            if (open) { if (!(ev.until > open.until)) fail('재시전인데 until 이 안 늘었다'); refresh++; }
            open = ev;                       // 중첩이 아니라 갱신 — 같은 스킬의 창은 하나뿐이다
        } else {
            if (!open) fail('열린 창 없이 buffEnd 가 왔다');
            if (Math.abs(ev.t - open.until) > 0.2) fail(`만료 ${ev.t} 가 until ${open.until} 과 다르다`);
            open = null; ends++;
        }
    }
    return `seed ${seed} · ${first.s} 창 ${own.length}건 (갱신 ${refresh} · 만료 ${ends})`;
});
check('simulate: 회복 — heal 은 hpMax 를 넘지 않는다 (battle_design §9-2)', () => {
    const { seed, r } = findSeed(x => x.timeline.some(ev => ev.e === 'heal'), () => clsUnits('priest'));
    const hpMax = {};
    for (const p of r.party) hpMax[p.key] = p.hpMax;
    let n = 0, sum = 0, foe = 0;
    for (const ev of r.timeline) {
        // **적도 회복한다** — 정예의 둘째 칸은 낀 무기의 스킬이라 십자가를 든 사제 몬스터는 회복을 쓸 수 있다(R79).
        //   2026-09-18 1-1 정예가 주술사(사제)뿐이 되며 탐색 시드에 처음 끼었다 — 적의 최대 HP 는 라운드마다 새로 선다
        if (ev.e === 'round') for (const e of ev.enemies) hpMax[e.key] = e.hpMax;
        if (ev.e === 'call') for (const e of ev.units) hpMax[e.key] = e.hpMax;   // 불러낸 적 (2026-09-18)
        if (ev.e !== 'heal') continue;
        if (ev.a[0] !== ev.d[0]) fail(`회복이 편을 넘었다 ${ev.a}→${ev.d}`);
        if (hpMax[ev.d] === undefined) fail(`회복 대상을 모른다 ${ev.d}`);
        if (ev.dhp > hpMax[ev.d]) fail(`dhp ${ev.dhp} > hpMax ${hpMax[ev.d]} (${ev.d})`);
        if (!(ev.amt >= 0)) fail(`amt ${ev.amt}`);
        n++; sum += ev.amt;
        if (ev.a.startsWith('e')) foe++;
    }
    return `seed ${seed} · heal ${n}건(적 ${foe}) · 회복량 합 ${sum}`;
});
check('simulate: 다단타 — 연사(arc_rapid)는 한 대상에게 hits 회 이하로 연속 타격 (§9-3)', () => {
    // 파티 궁수는 고유 칸이 1번을 먹어 priority 3 인 연사가 상한(active_slots)에서 잘린다 (§9-0 개정 2026-09-01).
    // 여기서 보는 것은 **배정**이 아니라 다단타의 실행이므로 clsUnits 로 직업 액티브를 손으로 싣는다
    const { seed, r } = findSeed(x => (x.casts.arc_rapid ?? 0) > 0, () => clsUnits('archer'));
    const def = skillLine('arc_rapid');
    const tl = r.timeline;
    let casts = 0, maxN = 0;
    for (let i = 0; i < tl.length; i++) {
        if (!(tl[i].e === 'skill' && tl[i].s === 'arc_rapid')) continue;
        let n = 0, d = null;
        for (let j = i + 1; j < tl.length; j++) {
            const x = tl[j];
            if (x.e === 'skill' || x.e === 'round' || x.e === 'end') break;
            if ((x.e === 'hit' || x.e === 'dodge') && x.s === 'arc_rapid' && x.a === tl[i].u) {
                n++;
                if (d === null) d = x.d; else if (x.d !== d) fail('다단타가 대상을 옮겼다');
            }
        }
        if (n < 1 || n > def.hits) fail(`타수 ${n} (hits ${def.hits})`);
        maxN = Math.max(maxN, n); casts++;
    }
    return `seed ${seed} · 시전 ${casts}회 · 최대 연속 ${maxN}/${def.hits}타`;
});
check('simulate: 도발 — taunt 창 동안 적의 단일 대상(기본 공격 · enemy_single 스킬)은 전부 도발자 (skill_design §9-2 ⚠임시 규칙 · R79)', () => {
    // 창은 buffEnd 로 닫히지만 **도발자가 쓰러져도** 닫힌다 (hasTaunt 는 생존자만 본다)
    // 도발자는 **동시에 여럿일 수 있다** — 기사 셋을 세우면 창이 겹친다. 그래서 열린 창을 집합으로 든다
    //   (규칙은 「도발자 중 하나를 때린다」이지 「가장 최근 도발자」가 아니다 — battle.js hasTaunt 는 생존 도발자 전부를 본다)
    const scan = r => {
        const open = new Map();   // 도발자 key → 그 창을 연 스킬 id
        const tr = windowTracker();
        let checked = 0, windows = 0, bad = null, lastCounter = false;
        for (const ev of r.timeline) {
            // 반격은 **때린 적에게** 되갚는다 — 대상 선택(`pickTarget`)을 안 지나 도발이 안 묶는다(INTERFACE §2-6 「반격」 · 2026-09-18).
            //   `counter` 바로 뒤의 타격이 그것이다 — 1-1 편성이 바뀌며(2026-09-18) 탐색 시드에 처음 끼었다
            const counterHit = lastCounter;
            lastCounter = ev.e === 'counter';
            tr.feed(ev);
            // 창은 **파티 도발자만** 연다 [2026-09-14 · R91 에서 드러남] — 이 단정은 적의 타격만 재고, 적을 묶는 것은 파티의 도발이다.
            //   R79 로 몬스터 전사도 도발을 쓰는데 옛 판은 그 창까지 열어 「적 e2 가 p0 을 때렸다(도발자 e0)」를 위반으로 셌다.
            //   몬스터 HP 가 바뀌어 탐색 시드가 몬스터 도발이 끼는 런으로 옮겨가며 처음 걸렸다 — 로직이 아니라 단정의 구멍이다
            if (ev.e === 'buff' && ev.stat === 'taunt') { if (ev.u.startsWith('p')) { open.set(ev.u, ev.s); windows++; } continue; }
            if (!open.size) continue;
            if (ev.e === 'buffEnd' && open.get(ev.u) === ev.s) { open.delete(ev.u); continue; }
            if (ev.e === 'down' && open.has(ev.u)) { open.delete(ev.u); continue; }
            if ((ev.e === 'hit' || ev.e === 'dodge') && ev.a.startsWith('e')) {
                // 도발이 묶는 것은 **단일 대상 선택**이다(`pickTarget`) — 기본 공격과 적의 `enemy_single` 스킬만 잰다.
                //   R79 로 몬스터가 스킬 칸을 갖게 되어 광역·회전·연쇄·최고 방어 대상 스킬이 도발자 밖을 때리는 것은 **정상**이다
                const single = ev.s === undefined || SYS.skill.defs[ev.s]?.target === 'enemy_single';
                if (!single) continue;
                // 지목(결투)이 도발보다 먼저다(battle.js pickTarget) · 광역 평타는 대상 선택을 안 한다
                if (tr.has(ev.a, 'duel') || tr.has(ev.a, 'attack_splash') || counterHit) continue;
                if (!open.has(ev.d)) bad = bad ?? `${ev.a}→${ev.d}${ev.s ? ` (${ev.s})` : ''} (도발자 ${[...open.keys()].join('·')})`;
                checked++;
            }
        }
        return { windows, checked, bad };
    };
    // 도발은 **전사** 것이고(09-09 기사 → 전사 · §12-3) 직업 풀의 마지막 자리라 배정으로는 안 나간다 — 손으로 싯는다
    const { seed, r } = findSeed(x => scan(x).checked > 0, () => clsUnits('warrior'));
    const s = scan(r);
    if (s.bad) fail(`도발 중인데 다른 대상을 때렸다 — ${s.bad}`);
    return `seed ${seed} · 창 ${s.windows}개 · 적 타격 ${s.checked}건 전부 도발자`;
});

/* ── 물리 경직 — 전투 (battle_design §2-3 · INTERFACE §2-6 「경직」 · R110) ── */

/** 규칙을 재는 판 — 문턱을 낮춰 **파티도 자주 경직되게** 한다. 기본 문턱에서 시작 파티는 거의 안 걸려(적 타격이 최대 HP 의 문턱을 잘 못 넘는다)
 *  표본이 비면 단정이 헛돈다. 기본 값이 내는 판은 골든이 잠근다 */
const STAG_B = { ...B, stagger_hp_pct: 0.02 };
const SYS_STAG = buildSystems({ ...D, balance: STAG_B });
/** 같은 문턱에 몬스터 데미지만 1/5 (`SOFT` 와 같은 배율) — 경직 조건 단정이 「문턱 밑」 표본을 밸런스 값에 기대지 않게 한다 (2026-09-22) */
const SYS_STAG_SOFT = buildSystems({ ...D, balance: { ...STAG_B, monster_atk_scale: STAG_B.monster_atk_scale / 5 } });

check('simulate: 경직 — 물리 직격으로 줄어든 HP 가 최대 HP × stagger_hp_pct 이상일 때만 · 그 hit 바로 뒤 · 원소 타격 · 쓰러진 대상은 안 건다 · 길이 = stagger_sec · 적도 걸린다 (battle_design §2-3 · R110)', () => {
    // 조건을 정확히 재는 것은 **파티가 맞은 직격**뿐이다 — `units()` 는 스킬 · 오오라가 없어 최대 HP 가 안 흔들리고,
    //   배리어가 없고 살아남았으면 줄어든 HP = `dmg` 다. 적의 최대 HP 는 제 창이 흔들 수 있어 「걸렸다」만 센다
    const eleStage = D.stageList.find(s => SYS.battle.stageElement(s) !== 'physical');
    if (!eleStage) fail('원소 스테이지가 없다');
    const B = STAG_B;
    let on = 0, off = 0, ele = 0, foes = 0;
    // 표본은 **두 판을 합친다** [2026-09-22] — 문턱 위(경직)와 밑(안 걸림)이 둘 다 있어야 문턱을 잰다. 몬스터 데미지가 오르면 모든 직격이
    //   문턱을 넘어 「밑」이 비고(배율 0.2 → 1 에서 0 이 됐다), 내리면 「위」가 빈다 — 데미지만 1/5 인 판을 함께 돌려 어느 쪽으로 움직여도 양쪽이 선다
    for (const S of [SYS_STAG, SYS_STAG_SOFT]) for (const stageId of [101, eleStage.stage_id]) for (let seed = 1; seed <= 10; seed++) {
        const r = S.battle.simulate(units(), stageId, makeRng(seed));
        const hpMax = Object.fromEntries(r.party.map(p => [p.key, p.hpMax]));
        const tl = r.timeline;
        for (let i = 0; i < tl.length; i++) {
            const ev = tl[i];
            const at = `${S === SYS_STAG_SOFT ? '약한 몬스터 ' : ''}${stageId}/${seed} t=${ev.t}`;
            if (ev.e === 'stagger') {
                const h = tl[i - 1];
                if (h?.e !== 'hit' || h.d !== ev.u || h.t !== ev.t) fail(`${at} 경직이 그 hit 바로 뒤가 아니다 — 앞 ${JSON.stringify(h)}`);
                if (h.ty !== 'physical') fail(`${at} ${h.ty} 타격이 경직을 걸었다`);
                if (!(h.dhp > 0)) fail(`${at} 쓰러진 ${ev.u} 가 경직됐다`);
                if (Math.abs(ev.until - ev.t - B.stagger_sec) > 0.11) fail(`${at} 경직 길이 ${(ev.until - ev.t).toFixed(2)} ≠ ${B.stagger_sec}`);
                if (!(ev.u in hpMax)) foes++;
                else if (h.dmg < hpMax[ev.u] * B.stagger_hp_pct) fail(`${at} ${ev.u} 피해 ${h.dmg} < 문턱 ${hpMax[ev.u] * B.stagger_hp_pct} 인데 경직됐다`);
                continue;
            }
            if (ev.e !== 'hit' || !(ev.d in hpMax)) continue;
            const got = tl[i + 1]?.e === 'stagger' && tl[i + 1].u === ev.d;
            if (ev.ty !== 'physical') { ele++; if (got) fail(`${at} ${ev.ty} 타격 뒤에 경직`); continue; }
            if (ev.bar !== undefined || !(ev.dhp > 0)) continue;
            const want = ev.dmg >= hpMax[ev.d] * B.stagger_hp_pct;
            if (want !== got) fail(`${at} ${ev.d} 피해 ${ev.dmg} · 문턱 ${hpMax[ev.d] * B.stagger_hp_pct} — 경직 ${got ? '걸림' : '안 걸림'}`);
            if (want) on++; else off++;
        }
    }
    if (!on || !off) fail(`파티가 맞은 물리 직격 — 경직 ${on} · 문턱 밑 ${off} · 한쪽이 비어 문턱을 못 잰다`);
    if (!ele) fail(`${eleStage.stage_id} 에서 원소 타격 표본이 없다`);
    if (!foes) fail('적이 경직된 표본이 없다 — 양쪽 같은 규칙을 못 본다');
    return `물리 직격 경직 ${on} · 문턱 밑 ${off} · 원소 ${ele}(${eleStage.stage_id}) · 적 경직 ${foes}`;
});

check('simulate: 경직은 행동 차례만 늦춘다 — 두 차례 사이 = 행동 주기 + 그 사이 경직이 민 시간 · 경직 중에 또 맞으면 끝 시각만 새로(더하지 않는다) · 틱 하나 안쪽 (battle_design §2-3 · INTERFACE §2-6 · R110)', () => {
    // 경직을 길게 늘린 판도 돈다 — 기본 길이로는 「경직 중에 또 맞음」이 드물어 「더하지 않는다」를 못 잰다.
    //   `units()` 는 스킬이 없어 한 차례 = 직격 하나(hit/dodge)다. 적의 주기 창(바인드 등)이 걸린 영웅은 주기가 달라져 그 판에서 뺀다
    const LONG = 3;
    const runs = [['짧게', SYS_STAG, STAG_B.stagger_sec], ['길게', buildSystems({ ...D, balance: { ...STAG_B, stagger_sec: LONG } }), LONG]];
    const out = [];
    for (const [name, S, dur] of runs) {
        let gaps = 0, pushed = 0, overlap = 0;
        for (let seed = 1; seed <= 10; seed++) {
            const r = S.battle.simulate(units(), 101, makeRng(seed));
            const period = Object.fromEntries(r.party.map(p => [p.key, p.period]));
            const push = {}, until = {}, slowed = new Set();
            let last = {};
            for (const ev of r.timeline) {
                // 라운드 경계를 넘는 간격은 재지 않는다 — 적이 같은 틱에 다 쓰러지면 뒤 순번의 차례는 때릴 대상 없이 지나간다(이벤트 없음 · skill_runtime.act)
                if (ev.e === 'round') { last = {}; continue; }
                if (ev.e === 'buff' && ev.stat === 'period_pct') slowed.add(ev.u);
                if (ev.e === 'stagger' && ev.u in period) {
                    const end = ev.t + dur;
                    if ((until[ev.u] ?? 0) > ev.t + 1e-9) overlap++;
                    push[ev.u] = (push[ev.u] ?? 0) + end - Math.max(until[ev.u] ?? 0, ev.t);
                    until[ev.u] = end;
                    continue;
                }
                if ((ev.e !== 'hit' && ev.e !== 'dodge') || !(ev.a in period) || slowed.has(ev.a)) continue;
                const k = ev.a;
                if (last[k] !== undefined) {
                    const want = period[k] + (push[k] ?? 0);
                    const gap = ev.t - last[k];
                    if (Math.abs(gap - want) > 0.1 + 1e-6) fail(`${name} seed ${seed} ${k} t=${ev.t} — 간격 ${gap.toFixed(2)} ≠ 주기 ${period[k]} + 경직 ${(push[k] ?? 0).toFixed(2)}`);
                    gaps++;
                    if (push[k] > 0) pushed++;
                }
                last[k] = ev.t;
                push[k] = 0;
            }
        }
        if (!pushed) fail(`${name} — 경직으로 밀린 차례가 없다`);
        if (dur === LONG && !overlap) fail('경직 중에 또 맞은 표본이 없다 — 「끝 시각만 새로」를 못 잰다');
        out.push(`${name} 간격 ${gaps} · 밀림 ${pushed} · 겹침 ${overlap}`);
    }
    return out.join(' / ');
});

check('simulate: 경직 중에도 스킬 쿨은 흐른다 — 쿨 도중 경직으로 밀린 시간보다 일찍 다시 쓴 시전이 있다 · 준비 전에는 안 나간다 (스턴과의 경계 · battle_design §2-3 · R110)', () => {
    // 쿨이 경직 동안 멈췄다면 「준비 시각 + 쿨 도중 밀린 시간」보다 일찍 다시 쓸 수 없다 — 그런 시전이 하나라도 있으면 쿨이 흘렀다
    const LONG = 3;
    const S = buildSystems({ ...D, balance: { ...STAG_B, stagger_sec: LONG } });
    let early = 0, stalled = 0;
    for (let seed = 1; seed <= 10; seed++) {
        const r = S.battle.simulate(skillUnits(), 101, makeRng(seed));
        const party = new Set(r.party.map(p => p.key));
        const until = {}, log = {}, prev = {};
        for (const ev of r.timeline) {
            if (ev.e === 'stagger' && party.has(ev.u)) {
                const end = ev.t + LONG;
                (log[ev.u] = log[ev.u] ?? []).push({ t: ev.t, d: end - Math.max(until[ev.u] ?? 0, ev.t) });
                until[ev.u] = end;
                continue;
            }
            if (ev.e !== 'skill' || !party.has(ev.u)) continue;
            const k = `${ev.u}|${ev.s}`, p = prev[k];
            if (p && p.ready > p.at) {
                if (ev.t < p.ready - 0.05) fail(`seed ${seed} ${k} t=${ev.t} 가 준비 ${p.ready} 전에 나갔다`);
                const d = (log[ev.u] ?? []).filter(x => x.t >= p.at && x.t < p.ready).reduce((s, x) => s + x.d, 0);
                if (d > 0) { stalled++; if (ev.t < p.ready + d - 0.05) early++; }
            }
            prev[k] = { at: ev.t, ready: ev.ready };
        }
    }
    if (!stalled) fail('쿨 도중 경직된 시전 표본이 없다');
    if (!early) fail(`쿨 도중 경직된 시전 ${stalled}건이 전부 경직만큼 늦었다 — 쿨이 경직 동안 멈춘 것처럼 보인다`);
    return `쿨 도중 경직 ${stalled}건 중 경직보다 일찍 다시 쓴 ${early}건`;
});

check('simulate: 타격 회복(fhr · 비율)이 경직 시간을 줄인다 — 0.5 면 절반 · 1 이상이면 안 걸린다(면역 · 이벤트 없음) · 적은 그대로 걸린다 (battle_design §2-3 · R110)', () => {
    // 값은 **비율**이다(0.5 = 50% · R111 단위 규약)
    const withFhr = v => units().map(u => ({ ...u, combat: { ...u.combat, fhr: v } }));
    const keysOf = r => new Set(r.party.map(p => p.key));
    let half = 0;
    for (let seed = 1; seed <= 10; seed++) {
        const r = SYS_STAG.battle.simulate(withFhr(0.5), 101, makeRng(seed));
        const ks = keysOf(r);
        for (const ev of r.timeline) {
            if (ev.e !== 'stagger' || !ks.has(ev.u)) continue;
            if (Math.abs(ev.until - ev.t - B.stagger_sec / 2) > 0.11) fail(`seed ${seed} fhr 0.5 — 경직 길이 ${(ev.until - ev.t).toFixed(2)} ≠ ${B.stagger_sec / 2}`);
            half++;
        }
    }
    if (!half) fail('fhr 0.5 — 파티가 경직된 표본이 없다');
    let foes = 0;
    for (const v of [1, 1.5]) for (let seed = 1; seed <= 10; seed++) {
        const r = SYS_STAG.battle.simulate(withFhr(v), 101, makeRng(seed));
        const ks = keysOf(r);
        for (const ev of r.timeline) {
            if (ev.e !== 'stagger') continue;
            if (ks.has(ev.u)) fail(`fhr ${v} seed ${seed} — ${ev.u} 가 경직됐다`);
            foes++;
        }
    }
    if (!foes) fail('면역 판에서 적 경직이 없다 — 적까지 막혔다');
    return `fhr 0.5 경직 ${half}건 · fhr 1/1.5 20판 파티 경직 0 · 적 경직 ${foes}`;
});

/* ── 스킬 런타임 단위 시험 — 전투를 안 돌리고 skill_runtime / skill_effects 를 직접 두드린다 ── */

/** 가짜 유닛 — 런타임이 만지는 필드만 든다(피해 계산은 여기서 안 돈다) */
const rtUnit = (key, side, extra = {}) => {
    const u = {
        key, side, hp: 100, hpMax: 100, hpMaxBase: 100,
        atkMin: 10, atkMax: 10, atkMinBase: 10, atkMaxBase: 10, atkPct: 0, matkMin: 10, matkMax: 10, matkMinBase: 10, matkMaxBase: 10,
        // 창이 미는 축은 **밑수를 함께** 든다 [2026-09-09] — `refreshDerived` 가 전 효과의 derive 를 돌리므로
        //   여기가 비면 방어·저항·재생·피해감소 창이 없는 축을 만져 TypeError 가 난다 (battle.js:makeUnit 과 같은 모양)
        def: 10, defBase: 10,
        res: { fire: 0, cold: 0, lightning: 0, poison: 0 },
        resBase: { fire: 0, cold: 0, lightning: 0, poison: 0 },
        dr: 0, drBase: 0, regen: 0, regenBase: 0, regenAcc: 0,
        period: 1, basePeriod: 1, next: 0, cdr: 0,
        actives: [], buffs: {}, barrier: null, reactions: [], ...extra,
    };
    // 값만 덮어쓴 축은 **밑수도 따라간다** — 안 그러면 `refreshDerived` 가 밑수 기준으로 값을 되돌려 버린다
    //   (창이 하나도 없을 때 derive 는 `값 = 밑수` 로 다시 쓰는 것이 정상 동작이다)
    for (const [v, b] of [['hpMax', 'hpMaxBase'], ['def', 'defBase'], ['dr', 'drBase'], ['regen', 'regenBase']]) {
        if (extra[v] !== undefined && extra[b] === undefined) u[b] = u[v];
    }
    return u;
};
/**
 * 가짜 문맥 — `strikeOnce` 는 호출을 **기록만** 하고 `rng` 는 호출 횟수를 센다.
 * 남는 것은 「누구를 · 몇 번 · 어떤 배율로 · rng 를 몇 번 써서」뿐이고, 그게 등록표가 지키는 계약이다.
 */
function fakeRt(party, enemies, opts = {}) {
    const hits = [], log = [], count = { rng: 0 };
    const rng = () => { count.rng++; return opts.roll ?? 0; };
    const rt = createSkillRuntime({
        SK: SYS.skill, B, rng, timeline: log, out: { casts: {} }, units: { party, enemies },
        // `opts.kill` — 맞은 대상을 그 자리에서 쓰러뜨린다(여러 줄 단정 — 앞 줄이 적을 다 쓰러뜨린 판 · 2026-09-24)
        strikeOnce: (u, tgt, mult, element, s, sk) => { hits.push({ a: u.key, d: tgt.key, mult, element: element ?? null, s: s ?? null, sk: sk ?? null }); if (opts.kill) tgt.hp = 0; },
        pickTarget: (u, foes) => { count.rng++; return foes[0]; },   // 진짜 pickTarget 도 타겟 rng 를 쓴다
        // 소환 — 진짜 유닛 생성자는 battle.js 것이라 여기서는 **키와 HP 만** 있는 최소 유닛을 낸다
        makeSummon: (caster, def) => rtUnit('s0', caster.side, {
            hp: Math.round(caster.hpMax * def.mult), hpMax: Math.round(caster.hpMax * def.mult), summon: true,
        }),
        // 비직격 고정 피해 — 진짜 이음매는 battle.js 것(기여 · 전투불능)이라 여기서는 **HP 와 이벤트만** 남긴다 (2026-09-24 R151)
        dealIndirect: (a, d, dmg, s) => { d.hp = Math.max(0, d.hp - dmg); log.push({ e: 'blast', a: a.key, d: d.key, s, dmg, dhp: d.hp }); },
        r1: v => Math.round(v * 10) / 10, EPS: SYS.skill.EPS,
        hooks: createHooks(),
    });
    return { rt, hits, log, count };
}

check('runtime: enemy_chain — k번째 배율 = mult × (1 − decay)^k · 시작점 rng 1회 (skill_design §9-3)', () => {
    const u = rtUnit('p0', 'party');
    const foes = [rtUnit('e0', 'enemy'), rtUnit('e1', 'enemy'), rtUnit('e2', 'enemy')];
    const { rt, hits, count } = fakeRt([u], foes);
    const def = skillLine('mag_chain');
    ATTACK_TARGETS.enemy_chain(rt, u, def, foes);
    if (count.rng !== 1) fail(`시작점 굴림은 1회여야 한다 (${count.rng}회)`);
    if (hits.length !== foes.length) fail(`타격 ${hits.length} ≠ 대상 ${foes.length}`);
    for (let k = 0; k < hits.length; k++) {
        const want = def.mult * Math.pow(1 - def.decay, k);          // 둘 다 비율 (R111)
        if (Math.abs(hits[k].mult - want) > 1e-12) fail(`${k}번째 배율 ${hits[k].mult} ≠ ${want}`);
        if (hits[k].d !== `e${k}`) fail(`${k}번째 대상 ${hits[k].d}`);
        if (hits[k].element !== def.element || hits[k].s !== def.id) fail(`${k}번째 원소·스킬 태그`);
    }
    return `${hits.map(h => h.mult.toFixed(3)).join(' → ')} (decay ${M.pctNum(def.decay)}%)`;
});
check('runtime: enemy_rotate — hits 가 대상 수보다 많으면 배열 순으로 겹친다 · 시작점 rng 1회 (skill_design §9-3)', () => {
    const u = rtUnit('p0', 'party');
    const foes = [rtUnit('e0', 'enemy'), rtUnit('e1', 'enemy'), rtUnit('e2', 'enemy')];
    const { rt, hits, count } = fakeRt([u], foes);
    const def = skillLine('kni_rush');
    if (!(def.hits > foes.length)) fail(`kni_rush hits ${def.hits} — 대상 ${foes.length} 보다 많아야 겹침을 본다`);
    ATTACK_TARGETS.enemy_rotate(rt, u, def, foes);
    if (count.rng !== 1) fail(`시작점 굴림은 1회여야 한다 (${count.rng}회)`);
    const want = Array.from({ length: def.hits }, (_, k) => `e${k % foes.length}`);
    if (!eq(hits.map(h => h.d), want)) fail(`${hits.map(h => h.d).join(',')} ≠ ${want.join(',')}`);
    if (hits.some(h => Math.abs(h.mult - def.mult) > 1e-12)) fail('순환은 배율이 줄지 않는다');
    return `${want.join(' → ')} (hits ${def.hits} / 대상 ${foes.length})`;
});
check('runtime: enemy_all — 생존 적 전원 각 1회 · 타겟 rng 0회 (skill_design §9-3)', () => {
    const u = rtUnit('p0', 'party');
    const foes = [rtUnit('e0', 'enemy'), rtUnit('e1', 'enemy', { hp: 0 }), rtUnit('e2', 'enemy')];
    const { rt, hits, count } = fakeRt([u], foes);
    ATTACK_TARGETS.enemy_all(rt, u, skillLine('arc_multishot'), foes);
    if (count.rng !== 0) fail(`대상을 고르지 않는데 rng 를 ${count.rng}회 썼다`);
    if (!eq(hits.map(h => h.d), ['e0', 'e2'])) fail(`대상 ${hits.map(h => h.d).join(',')}`);
    return 'e0·e2 각 1회 · rng 0회 (쓰러진 e1 은 건너뛴다)';
});
check('runtime: 가이디드 애로우는 양수 밑수만 깎고 깎인 비율을 defKeep 에 곱한다(어떤 장비로 맞았든 같은 비율 — 갈아입기가 이것으로 잇는다) · 방어 % 창은 양수 밑수에만 곱한다 (battle_design §9-3 · INTERFACE §2-6 · R130)', () => {
    const found = Object.values(SYS.skill.defs).find(d => d.target === 'enemy_highest_def');
    if (!found) fail('enemy_highest_def 스킬이 없다');
    const def = skillLine(found.id);
    const u = rtUnit('p0', 'party');
    const hi = rtUnit('e0', 'enemy', { def: 100 }), lo = rtUnit('e1', 'enemy', { def: 20 });
    ATTACK_TARGETS.enemy_highest_def(fakeRt([u], [hi, lo]).rt, u, def, [hi, lo]);
    const keep = (1 - def.decay) ** def.hits;
    if (Math.abs(hi.defBase - 100 * keep) > 1e-9 || Math.abs(hi.def - 100 * keep) > 1e-9) fail(`밑수 ${hi.defBase} · 값 ${hi.def} — ×${keep} 여야`);
    if (Math.abs(hi.defKeep - keep) > 1e-12) fail(`깎인 비율 ${hi.defKeep} ≠ ${keep}`);
    if (lo.defBase !== 20 || (lo.defKeep ?? 1) !== 1) fail('가장 높은 방어가 아닌 대상을 깎았다');
    // 밑수가 0 이하면 더 안 깎는다 — % 로 깎는 스킬이다(음수를 곱하면 오히려 올라간다)
    const neg = rtUnit('e2', 'enemy', { def: -30, defKeep: 0.5 });
    ATTACK_TARGETS.enemy_highest_def(fakeRt([u], [neg]).rt, u, def, [neg]);
    if (neg.defBase !== -30 || neg.def !== -30 || neg.defKeep !== 0.5) fail(`음수 밑수를 깎았다 — ${neg.defBase} · ${neg.def} · ${neg.defKeep}`);
    // 방어 % 창 — 양수 밑수엔 곱하고(합이 −100% 를 넘으면 음수) · 0 이하 밑수엔 안 곱한다(뒤집히지 않게)
    const pos = rtUnit('e3', 'enemy', { def: 100 });
    pos.buffs.x = { stat: 'def_pct', v: -1.5, until: 99 };
    refreshDerived(pos);
    if (Math.abs(pos.def + 50) > 1e-9) fail(`양수 밑수 100 · −150% → ${pos.def} (−50 이어야)`);
    const under = rtUnit('e4', 'enemy', { def: -30 });
    under.buffs.g = { stat: 'guard_pct', v: 0.5, until: 99 };
    refreshDerived(under);
    if (under.def !== -30) fail(`음수 밑수 −30 에 +50% 창 → ${under.def} (−30 그대로여야 — 버프가 음수를 깊게 만들면 안 된다)`);
    return `×${keep.toFixed(3)} · 깎인 비율 ×${hi.defKeep.toFixed(3)} · 음수 밑수 불변 · −150% → ${pos.def} · 음수 밑수 + 창 → ${under.def}`;
});
check('runtime: 광역 약화 — decay > 0 이면 주 대상(전열 첫 생존자)만 온전 · 나머지 약화 · decay 0 광역은 전원 같다 · rng 0 (skill_design §13-5 · R72)', () => {
    const u = rtUnit('p0', 'party');
    // e0 후열 · e1 쓰러짐 · e2·e3 전열 → 주 대상은 **전열 생존자 첫 번째** e2
    const foes = [rtUnit('e0', 'enemy', { rank: 1 }), rtUnit('e1', 'enemy', { hp: 0 }), rtUnit('e2', 'enemy'), rtUnit('e3', 'enemy')];
    const shot = skillLine('arc_multishot');
    if (!(shot.decay > 0)) fail(`멀티샷 decay ${shot.decay} — 약화가 없다`);
    const a = fakeRt([u], foes);
    ATTACK_TARGETS.enemy_all(a.rt, u, shot, foes);
    if (a.count.rng !== 0) fail(`주 대상을 고르는 데 rng 를 ${a.count.rng}회 썼다`);
    const full = shot.mult, weak = full * (1 - shot.decay);          // 비율 (R111)
    const got = Object.fromEntries(a.hits.map(h => [h.d, h.mult]));
    if (!eq(Object.keys(got), ['e0', 'e2', 'e3'])) fail(`대상 ${Object.keys(got)}`);
    if (Math.abs(got.e2 - full) > 1e-12) fail(`주 대상 e2 배율 ${got.e2} ≠ ${full}`);
    if (Math.abs(got.e0 - weak) > 1e-12 || Math.abs(got.e3 - weak) > 1e-12) fail(`나머지 ${got.e0}·${got.e3} ≠ ${weak}`);
    if (a.hits.some(h => !h.sk || typeof h.sk.statMult !== 'number' || typeof h.sk.procChance !== 'number')) fail('스킬 타격인데 {statMult, procChance, procMult} 가 안 넘어갔다');
    // 전열이 비면 생존자 첫 번째가 주 대상이다
    const back = [rtUnit('e0', 'enemy', { rank: 1 }), rtUnit('e1', 'enemy', { rank: 1 })];
    const b = fakeRt([u], back);
    ATTACK_TARGETS.enemy_all(b.rt, u, shot, back);
    if (Math.abs(b.hits[0].mult - full) > 1e-12 || Math.abs(b.hits[1].mult - weak) > 1e-12) fail(`전열이 빈 판 ${b.hits.map(h => h.mult)}`);
    // decay 0 광역 — 종전과 같다
    const quake = skillLine('war_quake');
    if (quake.decay !== 0) fail(`어스스플릿 decay ${quake.decay}`);
    const c = fakeRt([u], foes);
    ATTACK_TARGETS.enemy_all(c.rt, u, quake, foes);
    if (c.hits.some(h => Math.abs(h.mult - quake.mult) > 1e-12)) fail(`decay 0 인데 배율이 갈렸다 ${c.hits.map(h => h.mult)}`);
    // 기본 공격은 스킬 타격 필드를 안 넘긴다
    const d = fakeRt([u], foes);
    d.rt.basicAttack(u, 0, foes.filter(f => f.hp > 0));
    if (d.hits.length === 0 || d.hits.some(h => h.sk !== null)) fail('기본 공격이 스킬 타격 필드를 넘겼다');
    return `주 대상 e2 ×${full} · 나머지 ×${weak.toFixed(2)} · 어스스플릿 전원 ×${quake.mult} · 기본 공격 sk 없음`;
});
check('runtime: 결투 = 줄 둘 — ① HP 최대 적에게 지목 ② 시전자에게 같은 until 의 dr_pct 창 · buff 이벤트가 이 순서로 둘(s 는 둘 다 kni_duel) · 첫 줄만으로는 시전자 창이 없다(전용 분기 없음) (skill_design §13-5 · R72 · 2단계 R151)', () => {
    const u = rtUnit('p0', 'party');
    const foes = [rtUnit('e0', 'enemy', { hp: 50 }), rtUnit('e1', 'enemy', { hp: 90 })];
    const { rt, log, count } = fakeRt([u], foes);
    const duel = SYS.skill.defs.kni_duel;
    const [mk, gd] = SYS.skill.scaleDef(duel, null).effects;       // 시전 단위 둘 — 지목 · 시전자 피해 감소 (2026-09-24)
    if (!(gd.value > 0)) fail(`듀얼 둘째 줄 value ${gd.value} — 피해 감소가 없다`);
    rt.cast(u, duel, 3);
    if (count.rng !== 0) fail(`지목이 rng 를 ${count.rng}회 썼다`);
    const mark = foes[1].buffs[mk.status];
    if (!mark || mark.stat !== 'duel' || mark.by !== 'p0' || mark.s !== 'kni_duel') fail(`HP 최대 적(e1)에게 지목이 안 걸렸다 — ${JSON.stringify(mark)}`);
    const own = u.buffs[gd.status];
    if (!own || own.stat !== 'dr_pct' || own.v !== gd.value || own.until !== mark.until || own.s !== 'kni_duel' || own.roundEnd !== 'close')
        fail(`시전자 창 ${JSON.stringify(own)} — dr_pct · v ${gd.value} · until ${mark.until} · s kni_duel · close 여야`);
    // 원천별 곱 — 밑값과 창이 각자 원천이다 (battle_design §9-3 · 2026-09-22 — ~~drBase + value~~ 덧셈을 기대하던 단정)
    if (Math.abs(u.dr - (1 - (1 - u.drBase) * (1 - gd.value))) > 1e-12) fail(`시전자 피해 감소 ${u.dr} ≠ 1 − (1 − ${u.drBase}) × (1 − ${gd.value})`);
    const evs = log.filter(e => e.e === 'buff' && e.s === 'kni_duel');
    if (evs.length !== 2 || evs[0].u !== 'e1' || evs[0].stat !== 'duel' || evs[1].u !== 'p0' || evs[1].stat !== 'dr_pct') fail(`buff 이벤트 ${JSON.stringify(evs)} — 지목 → 시전자 순이어야`);
    rt.expire(u, 3 + gd.dur);
    if (u.buffs[gd.status] || u.dr !== u.drBase) fail('창이 끝났는데 피해 감소가 남았다');
    if (!log.some(e => e.e === 'buffEnd' && e.u === 'p0' && e.s === 'kni_duel')) fail('시전자 창이 닫힐 때 buffEnd 의 s 가 건 스킬(kni_duel)이 아니다');
    // 첫 줄만 걸면 시전자 창이 **없다** — ~~castBuff 의 결투 분기~~ 가 되살아나면 여기서 걸린다
    const v = rtUnit('p1', 'party');
    const b = fakeRt([v], [rtUnit('e0', 'enemy')]);
    b.rt.castBuff(v, mk, 3);
    if (Object.keys(v.buffs).length) fail(`지목 줄 하나로 시전자 창이 섰다 ${JSON.stringify(v.buffs)} — 스킬 전용 분기가 되살아났다`);
    return `e1 지목 · p0 dr_pct ${M.pctNum(gd.value)}% (until ${mark.until} · close) · 만료 후 원값 · 첫 줄만으로는 시전자 창 없음`;
});
/* ── 표준 모양 개편 [2026-09-24 · R151 · PLAN_skill_structure 2단계] — 창 열쇠 · 여러 줄 · 사건 스킬 · 능력치 표 ── */
check('runtime: 창 열쇠 = 걸린 효과 id — 한 스킬이 한 유닛에 효과 둘을 걸어도 둘 다 선다 · buff · buffEnd 의 s 는 건 스킬 id · 같은 효과 재시전은 갱신 (PLAN_skill_structure 2단계 D3 · R151)', () => {
    const u = rtUnit('p0', 'party');
    const { rt, log } = fakeRt([u], [rtUnit('e0', 'enemy')]);
    // 손으로 만든 시전 단위 — 같은 스킬(`test_two`)이 효과 둘을 건다 (INTERFACE §2-8 scaleDef)
    const line = (status, stat, value) => ({ id: 'test_two', status, target: 'self', stat, value, dur: 5, element: null, roundEnd: 'keep' });
    rt.castBuff(u, line('st_a', 'atk_pct', 0.1), 1);
    rt.castBuff(u, line('st_b', 'period_pct', 0.2), 1);
    if (!u.buffs.st_a || !u.buffs.st_b) fail(`창 [${Object.keys(u.buffs)}] — 둘 다 서야 한다(스킬 id 로 열쇠를 잡으면 뒤 줄이 앞 줄을 덮는다)`);
    if (Math.abs(u.period - u.basePeriod * (1 - 0.2)) > 1e-12 || Math.abs(u.atkMax - u.atkMaxBase * 1.1) > 1e-9) fail(`파생값 period ${u.period} · atkMax ${u.atkMax}`);
    const evs = log.filter(e => e.e === 'buff');
    if (evs.length !== 2 || evs.some(e => e.s !== 'test_two')) fail(`buff 이벤트 ${JSON.stringify(evs)}`);
    // 같은 효과 재시전 — 창 하나를 갱신한다(덧셈이 아니다)
    rt.castBuff(u, line('st_a', 'atk_pct', 0.1), 3);
    if (Object.keys(u.buffs).length !== 2 || u.buffs.st_a.until !== 8) fail(`재시전 ${JSON.stringify(u.buffs)}`);
    rt.expire(u, 100);
    const ends = log.filter(e => e.e === 'buffEnd');
    if (ends.length !== 2 || ends.some(e => e.s !== 'test_two')) fail(`buffEnd ${JSON.stringify(ends)} — s 는 건 스킬 id 여야`);
    if (u.period !== u.basePeriod) fail('만료 뒤 주기가 안 돌아왔다');
    return '효과 둘이 따로 선다 · 이벤트 s = 건 스킬 · 재시전은 갱신 · 만료 둘';
});
check('skill · runtime: 여러 줄 — 줄마다 제 대상 · seq 순으로 실행 · 줄마다 적을 다시 본다(앞 줄이 다 쓰러뜨리면 뒤 hit 줄은 굴림 없이 건너뛴다) (PLAN_skill_structure 2단계 D2 · R151)', () => {
    const t = skillTables();
    const bash = t.effectRows.find(r => r.skill_id === 'war_bash');
    const focus = t.effectRows.find(r => r.skill_id === 'mag_focus');
    // 배시에 줄 둘을 더한 표 — ② 시전자 자신에게 포커스 효과(한 효과를 두 스킬이 걸어도 된다) ③ 다시 때린다
    t.effectRows.splice(t.effectRows.indexOf(bash) + 1, 0, { ...focus, skill_id: 'war_bash', seq: 2, target: 'self' }, { ...bash, seq: 3 });
    const def = loadSkills(t).defs.war_bash;
    if (def.effects.map(e => e.effect).join() !== 'hit,apply,hit') fail(`줄 ${def.effects.map(e => e.effect)}`);
    if (!eq(def.derived, ['single'])) fail(`파생 태그 [${def.derived}] — hit 줄의 대상(enemy_single)에서`);
    // 적이 남는 판 — 세 줄이 다 돈다: hit 두 번은 각자 대상을 굴린다(rng 2) · 가운데 줄은 시전자에게
    const u = rtUnit('p0', 'party');
    const a = fakeRt([u], [rtUnit('e0', 'enemy'), rtUnit('e1', 'enemy')]);
    a.rt.cast(u, def, 1);
    if (a.hits.length !== 2 || a.count.rng !== 2) fail(`타격 ${a.hits.length} · rng ${a.count.rng} — hit 줄 둘이 각자 대상을 굴려야`);
    if (u.buffs.mag_focus?.s !== 'war_bash') fail(`둘째 줄 창 ${JSON.stringify(u.buffs)} — 시전자에게 · s = war_bash`);
    // 첫 줄이 적을 다 쓰러뜨린 판 — 셋째 줄은 굴림 없이 건너뛰고 둘째 줄은 그대로 선다
    const v = rtUnit('p0', 'party');
    const b = fakeRt([v], [rtUnit('e0', 'enemy')], { kill: true });
    b.rt.cast(v, def, 1);
    if (b.hits.length !== 1 || b.count.rng !== 1) fail(`타격 ${b.hits.length} · rng ${b.count.rng} — 적이 없는 셋째 줄이 굴렸다`);
    if (!v.buffs.mag_focus) fail('적이 다 쓰러져도 시전자에게 거는 줄은 서야 한다');
    return 'hit → apply(self) → hit · 적이 남으면 rng 2 · 다 쓰러지면 셋째 줄 건너뜀(rng 1)';
});
check('runtime: 사건 스킬 — 자폭은 차례에 안 고르고(castable 거짓) fire 로만 나간다 · 한 유닛 한 번 · rng 0 · 대상은 살아 있는 적 전원 · skill 이벤트 없음 (PLAN_skill_structure 2단계 D6 · R151)', () => {
    const def = SYS.skill.defs.mon_selfdestruct;
    if (SYS.skill.castable(def, { self: rtUnit('e0', 'enemy'), allies: [] })) fail('사건 스킬이 차례에 준비된 것으로 셌다');
    const me = rtUnit('e0', 'enemy', { atkMin: 100, atkMax: 200, actives: [{ id: def.id, def, readyAt: 0, source: 'innate' }] });
    const party = [rtUnit('p0', 'party', { hp: 1000, hpMax: 1000 }), rtUnit('p1', 'party', { hp: 0 }), rtUnit('p2', 'party', { hp: 1000, hpMax: 1000 })];
    const { rt, log, count } = fakeRt(party, [me]);
    rt.fire(me, 'on_death', 2);
    const bl = log.filter(e => e.e === 'blast');
    const want = Math.max(B.dmg_min, Math.round((100 + 200) / 2 * skillLine('mon_selfdestruct').mult));
    if (!eq(bl.map(e => e.d), ['p0', 'p2']) || bl.some(e => e.dmg !== want || e.s !== def.id)) fail(`blast ${JSON.stringify(bl)} — 살아 있는 p0 · p2 에 ${want} 씩이어야`);
    if (count.rng !== 0) fail(`자폭이 rng 를 ${count.rng}회 썼다`);
    rt.fire(me, 'on_death', 3);
    if (log.filter(e => e.e === 'blast').length !== 2) fail('한 유닛이 두 번 터졌다 — on_death 는 once 다');
    if (log.some(e => e.e === 'skill')) fail('사건 시전이 skill 이벤트를 냈다');
    return `p0 · p2 에 ${want} · 두 번째 사건은 안 터진다 · rng 0`;
});
check('runtime: 능력치 표 — 방어 = 방어 % + 외침 · 저항 = 외침 + 원소 창 · 창을 건 순서가 달라도 같은 값 (PLAN_skill_structure 2단계 D7 · R151 — 옛 「EFFECTS 키 순서가 계약」)', () => {
    const wins = [['g', { stat: 'guard_pct', v: 0.3, until: 9 }], ['d', { stat: 'def_pct', v: -0.5, until: 9 }], ['r', { stat: 'res_elem', v: -0.1, until: 9, element: 'fire' }]];
    const at = order => { const u = rtUnit('e0', 'enemy', { def: 100 }); for (const i of order) u.buffs[wins[i][0]] = wins[i][1]; refreshDerived(u); return u; };
    const a = at([0, 1, 2]), b = at([2, 1, 0]);
    const wantDef = 100 * (1 + (-0.5 + 0.3));
    if (Math.abs(a.def - wantDef) > 1e-9 || a.def !== b.def) fail(`방어 ${a.def} · ${b.def} ≠ ${wantDef}`);
    if (Math.abs(a.res.fire - (0.3 - 0.1)) > 1e-12 || a.res.fire !== b.res.fire || a.res.cold !== 0.3) fail(`저항 ${JSON.stringify(a.res)} · ${JSON.stringify(b.res)}`);
    return `방어 ${a.def} · 화염 저항 ${a.res.fire.toFixed(2)} · 냉기 ${a.res.cold} — 건 순서와 무관`;
});
check('runtime: 받는 피해 감소 창은 원천별 곱 — 밑값 50% + 창 20% = 60% · 창 둘도 곱 · 음수 창은 받는 피해를 늘린다 · 창이 없으면 밑값 그대로 · 쌓아도 100% 에 안 닿는다 (battle_design §9-3 · 2026-09-22 덧셈 회귀)', () => {
    const u = rtUnit('p0', 'party', { dr: 0.5, drBase: 0.5 });
    const near = (a, b) => Math.abs(a - b) < 1e-12;
    const win = v => ({ stat: 'dr_pct', v, until: 9, element: null });
    u.buffs.a = win(0.2);
    refreshDerived(u);
    const one = u.dr;
    if (!near(one, 0.6)) fail(`밑값 0.5 + 창 0.2 → ${one} — 곱이면 0.6 · 덧셈이면 0.7`);
    u.buffs.b = win(0.1);
    refreshDerived(u);
    if (!near(u.dr, 1 - 0.5 * 0.8 * 0.9)) fail(`창 둘 → ${u.dr} ≠ ${1 - 0.5 * 0.8 * 0.9}`);
    u.buffs = { c: win(-0.2) };
    refreshDerived(u);
    if (!near(u.dr, 1 - 0.5 * 1.2)) fail(`음수 창 −0.2 → ${u.dr} ≠ ${1 - 0.5 * 1.2}`);
    u.buffs = {};
    refreshDerived(u);
    if (u.dr !== u.drBase) fail(`창이 없는데 ${u.dr} ≠ 밑값 ${u.drBase}`);
    for (let i = 0; i < 6; i++) u.buffs[`s${i}`] = win(0.3);
    refreshDerived(u);
    if (!(u.dr < 1)) fail(`창 0.3 여섯에 ${u.dr} — 100% 에 닿았다(덧셈이면 2.3)`);
    return `0.5 · 0.2 → ${M.pctNum(one)}% · 창 여섯 → ${M.pctNum(u.dr)}%`;
});
check('runtime: 버프 지속시간 — 거는 쪽 창이 (1 + buffDur) 배 · 적에게 거는 창도 · 0 이면 종전과 같다 (반지 · 목걸이 공통옵션 · R127)', () => {
    const cast = (id, buffDur) => {
        const u = rtUnit('p0', 'party', { buffDur }), mate = rtUnit('p1', 'party'), foe = rtUnit('e0', 'enemy');
        const { rt } = fakeRt([u, mate], [foe]);
        const def = skillLine(id);
        rt.castBuff(u, def, 2);
        return { def, u, mate, foe };
    };
    const grace = cast('pri_grace', 0.5), plain = cast('pri_grace', 0);
    const d = grace.def.dur;
    if (Math.abs(grace.mate.buffs.pri_grace.until - (2 + d * 1.5)) > 1e-9) fail(`파티 창 ${grace.mate.buffs.pri_grace.until} ≠ ${2 + d * 1.5}`);
    if (Math.abs(plain.mate.buffs.pri_grace.until - (2 + d)) > 1e-9) fail(`buffDur 0 인데 창 ${plain.mate.buffs.pri_grace.until} ≠ ${2 + d}`);
    const pen = cast('pri_penitence', 0.5);
    if (Math.abs(pen.foe.buffs.pri_penitence.until - (2 + pen.def.dur * 1.5)) > 1e-9) fail(`적에게 거는 창 ${pen.foe.buffs.pri_penitence.until}`);
    const c = SYS.hero.computeCombat(G.heroes[0], [mkItem('amulet', [{ stat: 'buff_dur_pct', v: 0.1, src: 'random' }])]);
    if (c.option_fx?.buffDur !== 0.1) fail(`option_fx.buffDur ${c.option_fx?.buffDur}`);
    return `그레이스 ${d}초 → ${d * 1.5}초 · 참회도 · buffDur 0 은 ${d}초`;
});
/**
 * 결투의 시전자 창은 **라운드가 바뀌면 닫힌다** [2026-09-10 · 사용자 원문 「적 하나를 지목하고 라운드 끝까지 + 피해감소」 · R72 후속].
 * 창이 999초라 만료로는 안 닫히고 `battle.beginRound` 가 지목과 함께 걷는다 — 경계는 전투 안에만 있으므로
 *   **전투를 실제로 돌리고** 훅으로 피격 순간의 창·dr 을 적어 둔 뒤, 결투 뒤에 라운드가 한 번 이상 바뀐 피격만 본다.
 */
check('battle: 결투의 시전자 피해 감소 창은 라운드가 바뀌면 닫힌다 — 다음 라운드 피격 때 dr 이 원래 값 · 닫을 때 buffEnd 가 round 바로 앞 (R72 후속)', () => {
    // 기사 킷을 손으로 싣고 HP 를 크게 줘 여러 라운드를 버티게 한다 — 라운드 경계 뒤의 피격을 봐야 한다
    const kit = SYS.skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === 'knight')
        .slice().sort((a, b) => a.priority - b.priority).map(d => ({ id: d.id, source: 'innate' }));
    for (let seed = 1; seed <= 40; seed++) {
        const casts = [], samples = [];
        const reactions = [
            { on: 'cast', fn: (u, p) => { if (p.def.id === 'kni_duel') casts.push({ key: u.key, t: p.t }); } },
            // 시전자 창 — 결투가 건 `dr_pct` 창(창 열쇠는 걸린 효과 id `kni_duel_guard` · 건 스킬 `s` 로 찾는다 — 2026-09-24 R151)
            { on: 'hitTaken', fn: (u, p) => samples.push({ key: u.key, t: p.t, win: Object.values(u.buffs).some(b => b.s === 'kni_duel' && b.stat === 'dr_pct'), dr: u.dr, base: u.drBase }) },
        ];
        const mk = units().map(x => ({ ...x, combat: { ...x.combat, hp_max: 100000 }, actives: kit, reactions }));
        const r = SYS.battle.simulate(mk, 101, makeRng(seed));
        const rounds = r.timeline.filter(e => e.e === 'round').map(e => e.t);
        let after = 0;
        for (const s of samples) {
            const last = casts.filter(c => c.key === s.key && c.t <= s.t).pop();
            if (!last) continue;
            // 결투 뒤 라운드가 **엄격히 사이에** 바뀐 피격만 센다 — 같은 틱의 경계는 어느 라운드인지 모호하므로 뺀다
            if (!rounds.some(R => R > last.t && R < s.t)) continue;
            if (s.win) fail(`seed ${seed} ${s.key} t=${s.t} — 결투(t=${last.t}) 뒤 라운드가 바뀌었는데 시전자 창이 남았다`);
            if (s.dr !== s.base) fail(`seed ${seed} ${s.key} t=${s.t} — dr ${s.dr} ≠ 원래 값 ${s.base}`);
            after++;
        }
        // 재생기 칩 — 라운드 경계에서 닫힌 창마다 **기존 `buffEnd`** 가 그 라운드의 `round` 이벤트 바로 앞에 선다(없으면 칩이 다음 라운드에 남는다)
        const ends = r.timeline.map((e, i) => (e.e === 'buffEnd' && e.s === 'kni_duel' && e.u.startsWith('p') && rounds.includes(e.t) ? i : -1)).filter(i => i >= 0);
        if (after > 0 && ends.length === 0) fail(`seed ${seed} — 라운드 경계에서 시전자 창이 닫혔는데 buffEnd 가 없다 — 재생기 칩이 남는다`);
        for (const i of ends) {
            let j = i + 1;
            while (r.timeline[j]?.e === 'buffEnd') j++;
            if (r.timeline[j]?.e !== 'round' || r.timeline[j].t !== r.timeline[i].t)
                fail(`seed ${seed} ${r.timeline[i].u} t=${r.timeline[i].t} — 창을 닫은 buffEnd 뒤가 같은 시각의 round 이벤트가 아니다`);
        }
        if (after > 0) return `seed ${seed} · 결투 ${casts.length}회 · 라운드 경계 뒤 피격 ${after}건 전부 창 없음 · dr 원래 값 · buffEnd ${ends.length}건이 round 바로 앞`;
    }
    return fail('시드 1~40 에서 결투 뒤 라운드를 넘긴 피격이 없다 — 단정이 아무것도 못 봤다');
});
/* ── 2026-09-09 신설 — 직업 스킬 풀 37 이 연 어휘 (skill_design §12 · DEV_PLAN R61) ── */
check('runtime: ally_single — 회복은 **HP 비율 최저** 아군 하나에게 간다 · 대상 선택 rng 0회 — 쓰는 것은 회복량 굴림 1회뿐 (사용자 확정 2026-09-09 · R90)', () => {
    // 절대량이 아니라 **비율**이다 — HP 가 큰 탱커가 늘 최저 절대량을 갖는 구도를 피한다
    const a = rtUnit('p0', 'party', { hp: 90, hpMax: 100 });      // 90%
    const b = rtUnit('p1', 'party', { hp: 100, hpMax: 300 });     // 33% ← 여기로 가야 한다
    const c = rtUnit('p2', 'party', { hp: 60, hpMax: 100 });      // 60%
    const { rt, count } = fakeRt([a, b, c], [rtUnit('e0', 'enemy')]);
    const before = b.hp;
    rt.castHeal(a, skillLine('pri_cure'), 0);
    if (count.rng !== 1) fail(`rng ${count.rng}회 — 회복량 굴림 1회뿐이어야 한다(대상 선택은 결정론 · R90)`);
    if (b.hp === before) fail('비율 최저(p1)가 아니라 다른 아군이 회복됐다');
    if (a.hp !== 90 || c.hp !== 60) fail('단일 회복인데 여럿이 회복됐다');
    return `p1(33%) 회복 · p0(90%)·p2(60%) 그대로 · rng 1회(회복량 굴림)`;
});
check('runtime: 회복량은 시전마다 한 번 굴린다 — matkMin ~ matkMax 사이 · 대상 전원 같은 양 · rng 1회 (battle_design §9-1 · INTERFACE §2-6 · R90)', () => {
    const def = skillLine('pri_heal');
    const amtAt = roll => {
        const a = rtUnit('p0', 'party', { hp: 10, hpMax: 100000, matkMin: 100, matkMax: 300, matkMinBase: 100, matkMaxBase: 300 });
        const b = rtUnit('p1', 'party', { hp: 10, hpMax: 100000 });
        const { rt, count, log } = fakeRt([a, b], [rtUnit('e0', 'enemy')], { roll });
        rt.castHeal(a, def, 0);
        const heals = log.filter(e => e.e === 'heal');
        if (!heals.length) fail(`roll ${roll} — 회복 이벤트가 없다`);
        if (count.rng !== 1) fail(`roll ${roll} — rng ${count.rng}회 (1 이어야)`);
        if (new Set(heals.map(e => e.amt)).size > 1) fail(`대상마다 양이 다르다 ${heals.map(e => e.amt)}`);
        return heals[0].amt;
    };
    const lo = amtAt(0), hi = amtAt(0.999999);
    const want = m => Math.round(m * def.mult);                       // 배율은 비율 (R111)
    if (lo !== want(100)) fail(`굴림 0 → ${lo} ≠ ${want(100)}`);
    if (Math.abs(hi - want(300)) > 1) fail(`굴림 1 → ${hi} ≠ ${want(300)}`);
    return `${def.id} · 굴림 0 → ${lo} · 굴림 1 → ${hi}`;
});
check('runtime: party_adjacent — 함성은 **양 옆만** 걸린다 · 자기는 제외 (skill_design §12-3 · 위치는 임시 규칙)', () => {
    const p = [rtUnit('p0', 'party'), rtUnit('p1', 'party'), rtUnit('p2', 'party'), rtUnit('p3', 'party')];
    const { rt } = fakeRt(p, [rtUnit('e0', 'enemy')]);
    rt.castBuff(p[1], skillLine('war_shout'), 0);
    const on = p.filter(u => u.buffs.war_shout).map(u => u.key);
    if (!eq(on, ['p0', 'p2'])) fail(`걸린 대상 [${on}] ≠ [p0,p2]`);
    // 끝자리는 한쪽만 — 배열 밖을 만지면 undefined 가 섞인다
    rt.castBuff(p[0], skillLine('war_shout'), 0);
    const on0 = p.filter(u => u.buffs.war_shout).map(u => u.key);
    if (!on0.includes('p1')) fail('끝자리 시전인데 한쪽 이웃도 안 걸렸다');
    return 'p1 시전 → p0·p2 (자기 제외) · 끝자리는 한쪽만';
});
check('runtime: 적에게 거는 창 — 음수 값이 **적 유닛**에 얹히고 공격력이 내려간다 (사용자 확정 2026-09-09 D1)', () => {
    const u = rtUnit('p0', 'party');
    const foes = [rtUnit('e0', 'enemy'), rtUnit('e1', 'enemy'), rtUnit('e2', 'enemy', { hp: 0 })];
    const { rt, count } = fakeRt([u], foes);
    const def = skillLine('pri_penitence');
    if (!(def.value < 0)) fail(`참회의 effect_value 가 ${def.value} — 디버프는 음수여야 한다`);
    const before = foes[0].atkMax;
    rt.castBuff(u, def, 0);
    if (count.rng !== 0) fail(`적 전원 대상인데 rng 를 ${count.rng}회 썼다`);
    if (!foes[0].buffs[def.id] || !foes[1].buffs[def.id]) fail('생존 적 전원에게 안 걸렸다');
    if (foes[2].buffs[def.id]) fail('쓰러진 적에게도 걸렸다');
    if (!(foes[0].atkMax < before)) fail(`공격력이 안 내려갔다 (${before} → ${foes[0].atkMax})`);
    if (u.buffs[def.id]) fail('시전자에게도 걸렸다 — 적에게 거는 창이다');
    return `e0·e1 공격력 ${before} → ${Math.round(foes[0].atkMax * 10) / 10} · 시전자 무변화`;
});
check('runtime: summon — 아군 배열에 유닛이 서고 타임라인에 남는다 (skill_design §12-6 프로즌월)', () => {
    const u = rtUnit('p0', 'party', { hp: 200, hpMax: 200 });
    const party = [u];
    const { rt, log } = fakeRt(party, [rtUnit('e0', 'enemy')]);
    const def = skillLine('mag_frozenwall');
    rt.castSummon(u, def, 3);
    if (party.length !== 2) fail(`아군이 ${party.length}명 — 벽이 안 섰다`);
    const wall = party[1];
    if (!wall.summon) fail('선 유닛에 summon 표식이 없다');
    if (wall.hpMax !== Math.round(u.hpMax * def.mult)) fail(`벽 HP ${wall.hpMax} ≠ 시전자 최대 HP × ${M.pctNum(def.mult)}%`);
    if (!log.some(e => e.e === 'summon')) fail('타임라인에 summon 이 없다');
    return `벽 HP ${wall.hpMax} (시전자 ${u.hpMax} × ${M.pctNum(def.mult)}%) · 대상 풀 ${party.length}명`;
});
check('runtime: 평타 부여 — attack_splash 는 전원에게 · onhit_element 는 추가타 1회 (skill_design §12-4·§12-5)', () => {
    const foes = [rtUnit('e0', 'enemy'), rtUnit('e1', 'enemy')];
    // 창이 없을 때 — 단일 1타 (종전 수열과 같아야 한다)
    const plain = rtUnit('p0', 'party');
    const a = fakeRt([plain], foes);
    a.rt.basicAttack(plain, 0, foes);
    if (a.hits.length !== 1) fail(`창이 없는데 ${a.hits.length}타 — 종전 동작이 바뀌었다`);
    // 관통 사격 — 전원에게, 배율은 창의 값 %
    const pierce = rtUnit('p0', 'party');
    const bRt = fakeRt([pierce], foes);
    bRt.rt.castBuff(pierce, skillLine('arc_pierce'), 0);
    bRt.rt.basicAttack(pierce, 0, foes);
    if (!eq(bRt.hits.map(h => h.d), ['e0', 'e1'])) fail(`관통 대상 [${bRt.hits.map(h => h.d)}]`);
    const want = skillLine('arc_pierce').value;                      // 창의 값이 곧 배율(비율 · R111)
    if (bRt.hits.some(h => Math.abs(h.mult - want) > 1e-12)) fail(`관통 배율 ${bRt.hits[0].mult} ≠ ${want}`);
    // 독화살 — 같은 대상에게 원소 추가타 1회
    const pois = rtUnit('p0', 'party');
    const cRt = fakeRt([pois], foes);
    cRt.rt.castBuff(pois, skillLine('arc_poison'), 0);
    cRt.rt.basicAttack(pois, 0, foes);
    if (cRt.hits.length !== 2) fail(`평타 + 추가타 = 2 여야 한다 (${cRt.hits.length})`);
    if (cRt.hits[1].element !== 'poison') fail(`추가타 원소 ${cRt.hits[1].element}`);
    return '평타 1 · 관통 전원 · 독 추가타 1회(poison)';
});
check('runtime: period_pct — 창은 period 만 바꾸고 이미 예약된 next 는 안 건드린다 (INTERFACE §2-6)', () => {
    const u = rtUnit('p0', 'party', { period: 2, basePeriod: 2, next: 1.7 });
    const { rt } = fakeRt([u], []);
    const def = skillLine('pri_haste');
    rt.castBuff(u, def, 0);
    if (u.next !== 1.7) fail(`이미 잡힌 예약이 움직였다 (next ${u.next})`);
    const want = u.basePeriod * (1 - def.value);
    if (Math.abs(u.period - want) > 1e-12) fail(`period ${u.period} ≠ ${want}`);
    rt.expire(u, def.dur);                       // 창이 끝나면 원값이 돌아온다
    if (u.period !== u.basePeriod) fail(`만료 후 period ${u.period} ≠ ${u.basePeriod}`);
    if (u.next !== 1.7) fail('만료가 예약을 건드렸다');
    return `주기 ${u.basePeriod} → ${want.toFixed(2)} → 만료 후 ${u.period} · next 1.7 불변`;
});
check('runtime: 쿨감소 — readyAt = t + cool × max(바닥, 1 − cdr) · 바닥은 [balance.csv:skill_cd_floor_mult] (battle_design §6)', () => {
    const def = SYS.skill.defs.arc_snipe;
    const floor = B.skill_cd_floor_mult;
    const shot = cdr => {
        const u = rtUnit('p0', 'party', { cdr, actives: [{ id: def.id, def, readyAt: 0, source: 'job' }] });
        const { rt } = fakeRt([u], [rtUnit('e0', 'enemy')]);
        rt.act(u, 5);
        return u.actives[0].readyAt - 5;
    };
    const plain = shot(0), cut = shot(0.4), floored = shot(0.99);   // 쿨감은 비율 (R111)
    if (Math.abs(plain - def.cool) > 1e-12) fail(`쿨감소 0% → ${plain}`);
    if (Math.abs(cut - def.cool * 0.6) > 1e-12) fail(`쿨감소 40% → ${cut}`);
    if (Math.abs(floored - def.cool * floor) > 1e-12) fail(`바닥 ${floor} 인데 ${floored}`);
    return `표기 쿨 ${def.cool}s · 0% → ${plain} · 40% → ${cut.toFixed(1)} · 99% → ${floored.toFixed(1)}(바닥)`;
});
/**
 * 배리어 — **HP 밖 흡수 풀**이다 (skill_design §9-3). 창이 끝나면 남은 흡수량은 사라진다.
 * ⚠ **`skill.csv` 에 이 효과를 쓰는 행이 없다** [2026-09-09] — 기사 「수호의 방벽」이 직업 풀 8 에서 빠졌기 때문이다
 *   (§12-4). 그래서 전투를 돌려서는 이 코드에 못 닿고, 여기서 **등록표를 직접 두드려** 그물을 남긴다.
 *   기획이 배리어를 다시 주면 이 단정이 그대로 그 스킬의 회귀 시험이 된다.
 */
check('runtime: 배리어 — 창을 열면 hpMax × value% 가 흡수 풀로 서고 창이 끝나면 사라진다 (skill_design §9-3)', () => {
    const u = rtUnit('p0', 'party', { hp: 80, hpMax: 200 });
    const { rt, log } = fakeRt([u], [rtUnit('e0', 'enemy')]);
    const def = { id: 'test_barrier', effect: 'apply', target: 'self', stat: 'barrier_pct', value: 0.2, dur: 10, mult: 0, hits: 0 };   // 손으로 만든 시전 단위 (INTERFACE §2-8 scaleDef)
    rt.castBuff(u, def, 1);
    const want = Math.round(u.hpMax * def.value);
    if (!u.barrier || u.barrier.amt !== want) fail(`흡수 풀 ${u.barrier?.amt} ≠ hpMax×${M.pctNum(def.value)}% = ${want}`);
    if (u.barrier.until !== 1 + def.dur) fail(`until ${u.barrier.until} ≠ ${1 + def.dur}`);
    const ev = log.find(e => e.e === 'buff' && e.s === def.id);
    if (!ev || ev.amt !== want) fail('타임라인 buff 이벤트에 총량이 안 실렸다 — 재생기가 배리어를 못 그린다');
    // 창이 끝나면 **남은 흡수량은 사라진다** — 다음 창까지 이월되면 방벽이 영구 HP 가 된다
    rt.expire(u, 1 + def.dur);
    if (u.barrier !== null) fail('창이 끝났는데 배리어가 남았다');
    return `hpMax ${u.hpMax} × ${M.pctNum(def.value)}% = ${want} 흡수 · 창 ${def.dur}초 뒤 소멸`;
});
check('runtime: 발동 조건 통합 — 만피 파티에서 pri_heal 은 뽑히지 않고 기본 공격이 나간다 (skill_design §9-3)', () => {
    const def = SYS.skill.defs.pri_heal;
    const run = mateHp => {
        const u = rtUnit('p0', 'party', { actives: [{ id: def.id, def, readyAt: 0, source: 'job' }] });
        const { rt, hits, log } = fakeRt([u, rtUnit('p1', 'party', { hp: mateHp })], [rtUnit('e0', 'enemy')]);
        rt.act(u, 1);
        return { hits, log };
    };
    const full = run(100);
    if (full.log.some(ev => ev.e === 'skill')) fail('만피인데 회복이 나갔다');
    if (full.hits.length !== 1 || full.hits[0].mult !== 1) fail('기본 공격이 안 나갔다');
    const hurt = run(10);
    if (!hurt.log.some(ev => ev.e === 'skill' && ev.s === def.id)) fail(`임계 ${M.pctNum(def.condValue)}% 미만 아군이 있는데 안 나갔다`);
    if (hurt.hits.length !== 0) fail('회복인데 타격이 있다');
    return `임계 ${M.pctNum(def.condValue)}% — 만피는 기본 공격 · 10% 아군이 있으면 ${def.id} (회복 ${hurt.log.filter(e => e.e === 'heal').length}건)`;
});
check('runtime: 훅 — reactions 가 비면 타임라인이 같고 · cast/hit/kill/down 이 payload 를 받는다 (INTERFACE §5-2)', () => {
    // ① 빈 reactions 를 **명시**해도 타임라인이 한 글자도 안 달라져야 한다 — 훅 자리가 rng 를 밀지 않는다는 증거
    const base = SYS.battle.simulate(skillUnits(), 101, makeRng(5));
    const empty = SYS.battle.simulate(skillUnits().map(u => ({ ...u, reactions: [] })), 101, makeRng(5));
    if (!eq(base.timeline, empty.timeline)) fail('빈 훅이 타임라인을 바꿨다');
    // ② rng 를 안 쓰는 관찰자 핸들러 — 타임라인은 그대로고 payload 만 받는다
    const seen = { cast: 0, hit: 0, kill: 0, down: 0 }, got = {};
    const on = name => ({ on: name, fn: (u, p) => { seen[name]++; got[name] = got[name] ?? p; } });
    const reactions = [on('cast'), on('hit'), on('kill'), on('down')];
    const hooked = SYS.battle.simulate(skillUnits().map(u => ({ ...u, reactions })), 101, makeRng(5));
    if (!eq(base.timeline, hooked.timeline)) fail('rng 를 안 쓰는 핸들러가 타임라인을 바꿨다');
    if (!(seen.cast >= 1)) fail('cast 훅이 안 불렸다');
    if (!(seen.hit >= 1)) fail('hit 훅이 안 불렸다');
    const killed = Object.values(base.kills).reduce((a, b) => a + b, 0);
    if (killed > 0 && !(seen.kill >= 1)) fail(`처치 ${killed}건인데 kill 훅 0`);
    if (!got.cast?.def || typeof got.cast.t !== 'number') fail('cast payload 에 def·t 가 없다');
    if (!got.hit?.d || typeof got.hit.dmg !== 'number') fail('hit payload 에 d·dmg 가 없다');
    // ③ down 은 파티가 쓰러져야 불린다 — 이기는 판에서는 발화가 없으므로 지는 스테이지에서 한 번 더 태운다
    const { seed } = findSeed(x => x.downed.length > 0, skillUnits, 104);
    const fell = [];
    SYS.battle.simulate(skillUnits().map(u => ({ ...u, reactions: [{ on: 'down', fn: (u2, p) => fell.push(p) }] })), 104, makeRng(seed));
    if (!fell.length) fail(`104 seed ${seed} 에서 전투불능이 났는데 down 훅 0`);
    if (typeof fell[0].t !== 'number') fail('down payload 에 t 가 없다');
    return `${Object.entries(seen).map(([k, n]) => `${k} ${n}`).join(' · ')} (down 은 104 seed ${seed} 에서 ${fell.length}회)`;
});
check('skill: 검증 — cast↔effect 짝 · effect↔target 불일치 · 광역의 hits>1 · 연쇄 밖 decay · 조건값 범위는 로드가 실패한다 (§9-5 · 표 셋 2026-09-22)', () => {
    const cases = [
        ['war_bash', { target: 'party' }, 'attack 이 아군 대상'],
        // ⚠ `buff` + `enemy_all` 은 **이제 합법**이다 (참회·속박 — 음수 창). 대신 순환·연쇄는 여전히 못 쓴다
        ['pri_grace', { target: 'enemy_rotate' }, 'buff 가 순환 대상'],
        ['pri_heal', { target: 'enemy_all' }, 'heal 이 적 대상'],
        ['kni_might', { cool_sec: 5 }, 'aura 인데 쿨이 있다'],
        ['kni_might', { duration_sec: 5 }, 'aura 인데 창을 연다'],                       // 걸린 효과의 시간 (2026-09-22)
        ['mag_frozenwall', { target: 'party' }, 'summon 이 자기 자리가 아니다'],
        ['pri_grace', { hits: 2 }, 'buff 에 타수'],
        // 배율 · 감쇠 · 조건값은 비율이다 (R111) — 100% = 1
        ['pri_grace', { mult_pct: 0.5 }, 'buff 에 배율'],
        ['war_bash', { status: 'mag_focus' }, 'hit 줄이 걸린 효과를 건다(옛 「attack 이 창을 연다」)'],
        ['war_bash', { mult_pct: 0 }, 'attack 인데 배율 0'],
        ['arc_multishot', { hits: 2 }, '광역인데 hits 2'],
        ['mag_chain', { hits: 3 }, '연쇄인데 hits 3'],
        ['war_bash', { decay_pct: 0.2 }, '연쇄가 아닌데 감쇠'],
        ['mag_chain', { decay_pct: 1 }, '감쇠 100%'],
        ['pri_heal', { cond_value: 0 }, 'ally_hp_below 인데 조건값 0'],
        ['pri_heal', { cond_value: 1.2 }, '조건값 120%'],
        ['pri_heal', { cond_value: 75 }, '옛 눈금 조건값(75)'],
        ['war_bash', { cond_value: 0.5 }, '조건이 없는데 조건값'],
        // 나가는 방식 × 하는 일 — 옛 kind 일곱 밖의 짝은 던진다 (2026-09-22 · R136)
        ['war_bash', { cast: 'nonsense' }, 'cast 어휘 밖'],
        ['war_bash', { effect: 'nonsense' }, 'effect 어휘 밖'],
        ['kni_might', { effect: 'heal', mult_pct: 1 }, '오오라가 회복한다'],
        ['mon_selfdestruct', { cast: 'turn', cool_sec: 5 }, '고정 피해를 차례로 쓴다'],
        ['mon_selfdestruct', { cast_condition: '-' }, '사건 스킬인데 사건이 없다'],
        ['kni_enchant', { element: 'fire' }, 'apply 줄에 원소(원소는 걸린 효과가 든다)'],
    ];
    for (const [id, patch, why] of cases) {
        let threw = false;
        try { loadSkills(patchSkill(id, patch)); } catch (e) { threw = true; }
        if (!threw) fail(`${why} 가 통과했다 — ${id} ${JSON.stringify(patch)}`);
    }
    return `데이터 오류 ${cases.length}가지가 전부 로드에서 걸린다`;
});
/**
 * 스케일링 슬롯 · 추가 피해 · 광역 약화 · 결투 검증 [2026-09-10 · skill_design §13-1 · INTERFACE §2-8 · R72].
 * 채운 슬롯의 coef 0 은 합법이다(지금 CSV 전부가 그렇다) — 그래서 **원본이 로드되는 것**부터 확인하고 하나씩 깨뜨린다.
 */
check('skill: 슬롯·추가 피해 검증 — 모르는 field·attr · 음수 coef · - 짝 불일치 · 같은 field 두 번 · 하는 일 부적합 · proc 규칙은 로드가 실패한다 (§13-1 · R72 · 줄 2026-09-22)', () => {
    const load = t => loadSkills(t);
    const mk = (id, patch) => patchSkill(id, patch);              // 슬롯 · 추가 피해는 하는 일 줄 · 결투 값은 걸린 효과에 산다 (2026-09-22)
    load();                                                       // 원본은 통과해야 한다 — 아래 실패가 전부 패치 탓이라는 증거
    load(mk('war_quake', { decay_pct: 0.3 }));                    // 광역 공격의 감쇠는 이제 합법이다(멀티샷)
    const cases = [
        ['war_bash', { scale1_field: 'cool_sec' }, '열지 않은 field(cool_sec)'],
        ['war_bash', { scale1_attr: 'wis' }, '모르는 attr'],
        ['war_bash', { scale1_coef: -1 }, '음수 coef'],
        ['war_bash', { scale1_coef: 'x' }, '숫자가 아닌 coef'],
        ['war_bash', { scale2_field: 'hits' }, 'field 만 채우고 attr 은 -'],
        ['war_bash', { scale2_attr: 'agi' }, 'attr 만 채우고 field 는 -'],
        ['war_bash', { scale2_coef: 1 }, '빈 슬롯인데 coef 1'],
        ['kni_rush', { scale2_field: 'mult_pct', scale2_attr: 'agi' }, '같은 field 두 번'],
        ['war_shout', { scale1_field: 'hits' }, 'buff 가 hits 를 민다'],
        ['kni_might', { scale2_field: 'duration_sec', scale2_attr: 'vit' }, 'aura 가 duration_sec 을 민다'],
        ['pri_grace', { scale1_field: 'mult_pct' }, 'buff 가 mult_pct 를 민다'],
        ['war_bash', { scale2_field: 'decay_pct', scale2_attr: 'agi' }, '감쇠를 안 쓰는 대상이 decay_pct 를 민다'],
        ['war_bash', { scale2_field: 'proc_chance_pct', scale2_attr: 'luck' }, '확률 0 인데 proc_chance_pct 슬롯'],
        // 확률 · 배수 · 효과값은 비율이다 (R111) — 100% = 1
        ['pri_penitence', { decay_pct: 0.2 }, '적에게 거는 광역 창의 감쇠'],
        ['war_bash', { proc_chance_pct: 1.01, proc_mult_pct: 2 }, '확률 101%'],
        ['war_bash', { proc_chance_pct: 0.1, proc_mult_pct: 0.9 }, '확률 > 0 인데 배수 < 100%'],
        ['war_bash', { proc_chance_pct: 10, proc_mult_pct: 200 }, '옛 눈금 확률(10)'],
        ['war_bash', { proc_mult_pct: 2 }, '확률 0 인데 배수 200%'],
        ['pri_grace', { proc_chance_pct: 0.1, proc_mult_pct: 2 }, 'attack 아닌데 추가 피해'],
        ['kni_duel', { value: -0.05 }, '결투 피해 감소가 음수'],
    ];
    for (const [id, patch, why] of cases) {
        let threw = false;
        try { load(mk(id, patch)); } catch (e) { threw = true; }
        if (!threw) fail(`${why} 가 통과했다 — ${id} ${JSON.stringify(patch)}`);
    }
    // attributes 주입이 없으면 채운 슬롯을 검증할 수 없다 — 조용히 통과하면 오타가 0 으로 샌다
    let bare = false;
    try { loadSkills({ attributes: [] }); } catch (e) { bare = true; }
    if (!bare) fail('attributes 주입 없이 슬롯 행이 로드됐다');
    return `데이터 오류 ${cases.length}가지 + 주입 누락이 전부 로드에서 걸린다 · 광역 공격 감쇠는 통과`;
});
check('skill: scaleDef — 계수가 전부 0 이면 모든 줄이 원값 그대로 · 걸린 효과를 푼 값이 그 행 그대로 · 데미지 슬롯의 능력치 계수만 선다 · 복사본 (skill_design §13-3 · R72 · 계수 곱 2026-09-18 · 줄 2026-09-22)', () => {
    const stats = { str: 20, agi: 20, int: 20, vit: 20, luck: 20, ldr: 20, cha: 20 };
    const KEYS = ['hits', 'mult', 'decay', 'procChance', 'procMult'];
    for (const d0 of SYS.skill.list) {
        // CSV 계수가 나중에 들어와도 이 단정의 전제가 안 깨지게 **계수만 0 으로 눌러** 본다
        const d = { ...d0, effects: d0.effects.map(e => ({ ...e, scales: e.scales.map(s => ({ ...s, coef: 0 })) })) };
        for (const st of [stats, null]) {
            const eff = SYS.skill.scaleDef(d, st);
            if (eff === d || eff.effects === d.effects) fail(`${d.id} 복사본이 아니다`);
            if (eff.cool !== d.cool) fail(`${d.id}.cool ${d.cool} → ${eff.cool}`);
            d.effects.forEach((e, i) => {
                const x = eff.effects[i];
                for (const k of KEYS) if (x[k] !== e[k]) fail(`${d.id}#${e.seq}.${k} ${e[k]} → ${x[k]} (stats ${st ? '20' : 'null'})`);
                // 시전 단위 = 줄 + 스킬 id · **그 줄의 대상**(줄 target · `-` 면 스킬 것 — 2026-09-24 R151) + (apply 줄이면) 걸린 효과를 푼 능력치 · 값 · 시간 · 원소 · 라운드 규칙 (INTERFACE §2-8 · 2026-09-22)
                if (x.id !== d.id || x.target !== (e.target ?? d.target)) fail(`${d.id}#${e.seq} 시전 단위에 스킬 id · 그 줄의 대상이 안 실렸다 (${x.target})`);
                const sv = e.status === null ? null : SYS.skill.statuses[e.status];
                if (sv && (x.stat !== sv.stat || x.value !== sv.value || x.dur !== sv.dur || x.element !== sv.element || x.roundEnd !== sv.roundEnd))
                    fail(`${d.id}#${e.seq} 걸린 효과 ${sv.id} 를 푼 값 ${x.stat}·${x.value}·${x.dur}·${x.element}·${x.roundEnd} ≠ 행 ${sv.stat}·${sv.value}·${sv.dur}·${sv.element}·${sv.roundEnd}`);
                // 데미지 슬롯(`mult_pct`)은 `coef` 를 안 읽고 그 능력치의 계수를 곱한다 — 능력치 20 이면 슬롯마다 statCoef(20) · null 이면 1 (2026-09-18)
                const n = e.scales.filter(s => s.field === 'mult_pct').length;
                const want = st ? Math.pow(F.statCoef(20), n) : 1;
                if (Math.abs(x.statMult - want) > 1e-12) fail(`${d.id} statMult ${x.statMult} ≠ ${want}`);
                if ('flat' in x) fail(`${d.id} 옛 flat 이 남았다`);
            });
        }
    }
    const slotted = SYS.skill.list.filter(d => d.effects.some(e => e.scales.length)).length;
    return `${SYS.skill.list.length}정의 × (능력치 20 · null) 전부 원값 · 슬롯 든 정의 ${slotted}`;
});
check('skill: scaleDef 계수 주입 — mult_pct 는 능력치 계수(coef 무시) · hits 버림 · 음수 value 는 크기가 커진다 · dur 가산 · decay 는 상한에서 멈춘다 (INTERFACE §2-8 · R72)', () => {
    const t = skillTables();                                     // 슬롯은 하는 일 줄에 산다 (2026-09-22)
    const put = (id, n, coef) => { t.effectRows.find(r => r.skill_id === id)[`scale${n}_coef`] = coef; };
    // 퍼센트 항(effect_value · decay · 확률 · 배수)의 계수는 비율이다 (R111) — mult_pct 슬롯은 고정 피해라 그대로 · hits · 초도 그대로
    put('war_bash', 1, 2);            // mult_pct · str (고정 피해)
    put('kni_rush', 2, 0.5);          // hits · agi
    put('pri_penitence', 1, 0.01);    // effect_value · cha (원값 음수) — 1점당 1%
    put('pri_grace', 2, 0.5);         // duration_sec · vit
    put('mag_chain', 2, 0.1);         // decay_pct · agi — 1점당 10%
    put('mag_chain', 3, 0.05);        // proc_mult_pct · luck — 1점당 5%
    put('kni_charge', 2, 0.01);       // proc_chance_pct · luck — 1점당 1%
    const S = loadSkills(t);
    const st = { str: 10, agi: 15, int: 12, vit: 8, luck: 6, ldr: 7, cha: 6 };
    const e = id => S.scaleDef(S.defs[id], st).effects[0];
    const raw = id => skillLine(id, S);                          // 원값 — 걸린 효과의 값 · 시간도 푼다
    // 데미지 슬롯은 coef(2)를 안 읽는다 — 힘 10 = 기준이면 계수 1 · 배율 그대로 (2026-09-18 · battle_design §9-2)
    if (Math.abs(e('war_bash').statMult - F.statCoef(st.str)) > 1e-12 || e('war_bash').mult !== raw('war_bash').mult) fail(`bash statMult ${e('war_bash').statMult} ≠ ${F.statCoef(st.str)} · mult ${e('war_bash').mult} (배율 그대로여야)`);
    if (Math.abs(S.scaleDef(S.defs.war_bash, { ...st, str: 20 }).effects[0].statMult - F.statCoef(20)) > 1e-12) fail('힘 20 인데 계수가 statCoef(20) 이 아니다');
    if (e('kni_rush').hits !== Math.floor(raw('kni_rush').hits + 7.5)) fail(`rush hits ${e('kni_rush').hits} ≠ floor(${raw('kni_rush').hits} + 7.5)`);
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    if (!near(e('pri_penitence').value, raw('pri_penitence').value - 0.06)) fail(`penitence value ${e('pri_penitence').value} ≠ ${raw('pri_penitence').value - 0.06} (음수는 크기가 커진다)`);
    if (e('pri_grace').dur !== raw('pri_grace').dur + 4) fail(`grace dur ${e('pri_grace').dur} ≠ ${raw('pri_grace').dur + 4}`);
    if (e('mag_chain').decay !== B.skill_decay_cap_pct) fail(`chain decay ${e('mag_chain').decay} ≠ 상한 ${B.skill_decay_cap_pct}`);
    if (!near(e('mag_chain').procMult, raw('mag_chain').procMult + 0.3)) fail(`chain procMult ${e('mag_chain').procMult}`);
    if (!near(e('kni_charge').procChance, raw('kni_charge').procChance + 0.06)) fail(`charge procChance ${e('kni_charge').procChance}`);
    // 소환(stats null)은 계수를 안 받는다 · 입력을 바꾸지 않는다
    const before = JSON.stringify(S.defs.war_bash);
    if (S.scaleDef(S.defs.war_bash, null).effects[0].statMult !== 1) fail('stats null 인데 능력치 계수가 섰다');
    if (JSON.stringify(S.defs.war_bash) !== before) fail('scaleDef 가 정의를 바꿨다');
    return `bash 계수 ${e('war_bash').statMult} · rush hits ${e('kni_rush').hits} · penitence ${e('pri_penitence').value} · grace ${e('pri_grace').dur}s · chain decay ${e('mag_chain').decay}(상한) · charge 확률 ${e('kni_charge').procChance}`;
});
/*
 * **몬스터의 레벨 1 HP 바탕은 영웅과 따로다** [2026-09-14 사용자 지시 · R91 · monster_design §5 · battle_design §8].
 *   맨몸 · 레벨 1 이면 성장분도 장비 HP 도 0 이라 바탕이 그대로 드러난다 — 몬스터는 등급 배율 · 전역 배율만 곱해진다.
 *   영웅 쪽(레벨 1 = hero_hp_base)은 「최대 HP 레벨 성장」 단정이 본다. 키가 빠지면 `hpBase` 가 undefined 라 영웅 값으로 조용히 떨어지므로
 *   **값으로** 대조한다(키 존재는 balance 키 목록 단정이 본다)
 */
check('battle: 몬스터 레벨 1 HP = monster_hp_base × 등급 배율 × 전역 배율 — 영웅 hero_hp_base 와 갈린다 (R91)', () => {
    for (const grade of ['normal', 'elite']) {
        const e = SYS.battle.makeEnemy('e0', 1101, grade, 1);
        const want = Math.round(B.monster_hp_base * D.grades[grade].hp_mult * B.monster_hp_scale);
        if (e.hp !== want || e.hpMax !== want) fail(`${grade} hp ${e.hp} / ${e.hpMax} ≠ ${want}`);
    }
    return `normal ${SYS.battle.makeEnemy('e0', 1101, 'normal', 1).hp} (바탕 ${B.monster_hp_base} · 영웅 ${B.hero_hp_base})`;
});
/*
 * **적의 세부 능력치 복사본 `sheet`** [2026-09-14 · R94 · INTERFACE §2-6 `round` · SCREEN_DESIGN §2 「유닛 툴팁 규격」].
 *   유닛 툴팁이 Alt 로 펴는 표시값이라 **전투 유닛이 쓰는 값과 한 글자도 달라서는 안 된다** — 몸값 · 등급 배율 · 전역 배율까지 먹은 값이다.
 *   전투 내부용 둘(`option_fx` · `atk_pct_sum`)이 새어 나오면 타임라인이 부풀고 이식 계약이 흐려진다
 */
check('battle: 적의 세부 능력치 sheet — 전투 유닛과 같은 값 · round 이벤트가 싣는다 · 내부용 둘은 없다 (R94)', () => {
    const id = 1401, m = D.monsters[id];
    const gear = SYS.item.rollGear(makeRng(4), { slots: ['weapon', 'armor'], ilvl: 5, weaponGroup: m.weapon_group });
    const e = SYS.battle.makeEnemy('e0', id, 'elite', 7, gear);
    const s = e.sheet;
    if (!s) fail('makeEnemy 유닛에 sheet 가 없다');
    if (s.hp_max !== e.hpMax || s.defense !== e.def || s.action_period !== e.period) fail(`hp ${s.hp_max}/${e.hpMax} · def ${s.defense}/${e.def} · 주기 ${s.action_period}/${e.period}`);
    for (const el of ELEMENTS) if (s[`res_${el}`] !== e.res[el]) fail(`res ${el} ${s[`res_${el}`]} ≠ ${e.res[el]}`);
    const atk = s.atk_physical ?? s.atk_magic;
    if (atk.min !== e.atkMin || atk.max !== e.atkMax) fail(`공격력 ${atk.min}~${atk.max} ≠ ${e.atkMin}~${e.atkMax}`);
    if (s.crit_rate !== e.crit || s.damage_reduction !== e.dr || s.attack_type !== e.atkType) fail('치명 · 피해 감소 · 공격 타입이 유닛과 다르다');
    if ('option_fx' in s || 'atk_pct_sum' in s) fail('전투 내부용 필드가 sheet 로 새어 나왔다');
    const r = SYS.battle.simulate(units(), 101, makeRng(1));
    const round = r.timeline.find(ev => ev.e === 'round');
    const bad = round.enemies.find(x => !x.sheet || x.sheet.hp_max !== x.hpMax || x.sheet.action_period !== x.period);
    if (bad) fail(`round 이벤트의 ${bad.key} sheet 가 비었거나 hpMax · period 와 다르다`);
    return `${Object.keys(s).length}키 · round 적 ${round.enemies.length}명 전부 sheet`;
});
check('battle: makeEnemy 유닛의 전투 안 필드 초기값 —창·배리어·훅·장비는 비고 보상 축은 등급에서 온다 (§8-1 · R79)', () => {
    const id = 1401, grade = 'elite', lvl = 7;
    const m = D.monsters[id], g = D.grades[grade];
    const e = SYS.battle.makeEnemy('e0', id, grade, lvl);
    // ~~옛 필드 값이 한 글자도 같다~~ 는 R79 로 폐기 — 계산은 computeCombat 이 하고 그 대조는 「computeCombat 을 지난다」 단정이 한다.
    //   여기 남는 것은 **몬스터만 드는 축**과 **전투 안에서만 사는 필드의 초기값**이다
    const want = {
        key: 'e0', side: 'enemy', monsterId: id, grade, lvl, cls: m.cls, next: 0, regenAcc: 0, skillMult: 1,
        atkType: m.attack_type, monsterType: m.monster_type,
        expReward: B.monster_xp_base * B.monster_xp_growth ** (lvl - 1) * g.exp_mult * m.exp_coef, goldMult: g.gold_mult, dropChanceMult: g.drop_chance_mult,
    };
    for (const [k, v] of Object.entries(want)) if (e[k] !== v) fail(`${k}: ${e[k]} ≠ ${v}`);
    if (e.hpMax !== e.hp) fail(`hpMax ${e.hpMax} ≠ hp ${e.hp}`);
    if (e.basePeriod !== e.period) fail('basePeriod ≠ period');
    for (const k of ['Min', 'Max']) {
        if (Math.abs(e[`atk${k}Base`] * (1 + e.atkPct) - e[`atk${k}`]) > 1e-6)
            fail(`atk${k}Base ${e[`atk${k}Base`]} · atkPct ${e.atkPct} 가 atk${k} ${e[`atk${k}`]} 를 못 만든다`);
    }
    if (!eq(e.buffs, {}) || e.barrier !== null || !eq(e.reactions, []) || !eq(e.gear, []))
        fail('전투 안에서만 사는 필드의 초기값이 다르다');
    if (!eq(e.stats, { str: m.str, agi: m.agi, int: m.int, vit: m.vit, luck: m.luck, ldr: m.ldr, cha: m.cha })) fail('stats 가 monster.csv 7컬럼이 아니다');
    return `${Object.keys(want).length}필드 + 초기값 · hp ${e.hp} · period ${e.period}`;
});
check('battle: 처치 XP 는 몬스터 레벨이 정한다 — 레벨·등급이 같으면 몬스터가 달라도 같고 레벨 +1 은 monster_xp_growth 배 (monster_design §7 · R85)', () => {
    const bad = Object.values(D.monsters).filter(m => !(m.exp_coef > 0)).map(m => m.monster_idx);
    if (bad.length) fail(`exp_coef 가 양수가 아닌 몬스터: ${bad.join(', ')}`);
    const normals = Object.values(D.monsters).filter(m => m.spawn_grade === 'normal');
    const a = normals[0];
    const b = normals.find(m => m.chapter !== a.chapter && m.exp_coef === a.exp_coef);
    if (!b) fail('계수가 같은 다른 챕터 일반몹이 없다');
    const lvl = 12;
    const xa = SYS.battle.makeEnemy('e0', a.monster_idx, 'normal', lvl).expReward;
    const xb = SYS.battle.makeEnemy('e1', b.monster_idx, 'normal', lvl).expReward;
    if (xa !== xb) fail(`같은 레벨 ${lvl} · 같은 등급인데 ${a.monster_idx}=${xa} · ${b.monster_idx}=${xb}`);
    const up = SYS.battle.makeEnemy('e2', a.monster_idx, 'normal', lvl + 1).expReward;
    if (Math.abs(up / xa - B.monster_xp_growth) > 1e-9) fail(`레벨 +1 배율 ${up / xa} ≠ monster_xp_growth ${B.monster_xp_growth}`);
    return `${a.monster_idx}(${a.chapter}장) = ${b.monster_idx}(${b.chapter}장) = ${xa.toFixed(2)} @Lv${lvl} · Lv${lvl + 1} ×${B.monster_xp_growth}`;
});
check('runtime: refreshDerived — 같은 stat 의 창은 덧셈이고 창이 사라지면 원값이 돌아온다 (battle_design §9-2)', () => {
    const u = rtUnit('p0', 'party', { atkMin: 200, atkMax: 400, atkMinBase: 100, atkMaxBase: 200, atkPct: 1 });   // 상시 100%(비율 1)가 이미 곱해진 상태 · 양끝 둘 다 (R90 · R111)
    u.buffs = { a: { stat: 'atk_pct', v: 0.25, until: 9 }, b: { stat: 'atk_pct', v: 0.15, until: 9 } };
    refreshDerived(u);
    if (Math.abs(u.atkMin - 240) > 1e-9 || Math.abs(u.atkMax - 480) > 1e-9) fail(`두 창이 덧셈이 아니다 (${u.atkMin}~${u.atkMax})`);
    u.buffs = {};
    refreshDerived(u);
    if (u.atkMin !== 200 || u.atkMax !== 400) fail(`창이 사라졌는데 ${u.atkMin}~${u.atkMax}`);
    return '상시 100% + 창 25% + 창 15% → 240~480 · 창 제거 → 200~400 (같은 괄호 덧셈 · 양끝)';
});
/**
 * 회복 밑수도 **같은 괄호**를 탄다 (2026-09-01). 옛 판은 `atk` 만 다시 써서 함성(atk_pct) 아래에서
 * 치유의 빛만 밑수가 그대로였다 — 「괄호는 둘뿐」인데 회복만 괄호 밖에 있던 셈이다.
 */
check('runtime: atk_pct 창은 회복 밑수(matkMin·matkMax)도 같은 괄호로 올린다 (battle_design §9-2 · 범위 R90)', () => {
    const u = rtUnit('p0', 'party', { atkMin: 100, atkMax: 100, atkMinBase: 100, atkMaxBase: 100, atkPct: 0, matkMin: 100, matkMax: 200, matkMinBase: 100, matkMaxBase: 200 });
    u.buffs = { x: { stat: 'atk_pct', v: 0.25, until: 9 } };
    refreshDerived(u);
    if (u.matkMin !== 125 || u.matkMax !== 250) fail(`창 25% 인데 matk ${u.matkMin}~${u.matkMax}`);
    if (u.atkMin !== 125 || u.atkMax !== 125) fail(`atk ${u.atkMin}~${u.atkMax}`);
    u.buffs = {};
    refreshDerived(u);
    if (u.matkMin !== 100 || u.matkMax !== 200) fail(`창이 사라졌는데 matk ${u.matkMin}~${u.matkMax}`);
    return 'matk 100~200 → 125~250(창 25%) → 100~200(창 제거) · 공격력과 같은 괄호';
});

check('save: SAVE_VERSION 23 — 쿨·창·배리어는 전투 안에서만 살고 세이브가 든 것은 마스터리 랭크·포인트 · 선술집 쿨다운 · **리롤한 전술 칸(가족+등급)** · 강화 단계 · 고유 스킬 · **무기가 담은 스킬(`items[*].skill` — v18)** · **초상 id(`face`)** · **등급(`tier`)**뿐. 회복 대기(`injuredUntil`)는 v11 · **개체별 히든 상한(`caps`)은 v15** · **출정 아웃(`run.downed`)은 v17** 에서 사라졌다 · v22 는 필드를 안 늘린다(클리어 기록 소급 — R75) · **v23 은 접사에 출처 `src` 를 붙인다(무기 옵션 세 층 — R78)** · **v24 는 보관을 둘로 가른다(`stash` 신설 — 인벤토리 + 창고)** · **v25 는 리포트의 경험치를 영웅별 `xp` 로 가르고 `run.active` 를 더한다(원정은 라운드 단위 — 런 핸들은 세이브에 안 든다 · R89)** · **v26 은 무기의 `watk` 를 지운다(무기 피해는 범위이고 파생 — R90)** · **v27 은 필드를 안 늘린다(장비 옵션 값을 정수로 반올림 — 2026-09-16)** · **v28 은 필드를 안 늘린다(방어구 고유값 재계산 — R107)** · **v29 는 필드를 안 늘린다(퍼센트 접사 값을 비율로 — R111)** · **v30 은 필드를 안 늘린다(옛 방어구에 고정 옵션 · 죄종 칸 · 고유값 재계산 — 2026-09-18)** · **v31 은 아이템에 이름의 죄종 단어 `words` 를 더한다(「A와 B의 베이스」 — 2026-09-19 · R118)** · **v32 는 파티 · 진형을 편성 배열(`presets` · `preset`)로 접고 물약을 개수 표로 바꾼다(편성 — 2026-09-21 · R122 · R124)** · **v33 은 목걸이에 발동 스킬 `proc` 을 더하고 옛 반지 · 목걸이에 죄종 칸을 채운다(장신구 옵션 세 층 — 2026-09-21 · R127)** · **v34 는 전술 칸을 편성 안으로 옮긴다(`presets[*].tactics` — 편성마다 · 2026-09-21 · R129)** · **v35 는 전술 칸에 잠금 `locked` 를 더한다(전체 리롤 + 잠금 — 2026-09-22 · R28)** · **v36 은 같이 나간 런 수 `bonds` 를 더한다(전술 관계 조건 — 2026-09-22 · R134)** · **v37 은 건물 랭크 · 연구 · 합산 레벨 최고치를 더한다(건설 — 2026-09-22 · R137)** · **v38 은 `run`(단수)을 `runs`(부대마다)로 바꾸고 리포트에 편성 번호를 싣는다(다부대 — 2026-09-23)** (R59 · INTERFACE §4)', () =>
    SAVE_VERSION === 38 || fail(`v${SAVE_VERSION}`));

/**
 * 스킬 툴팁 문장 [신설 2026-09-08 · SCREEN_DESIGN §4-2] — 수치표를 버리고 데이터로 조립한 한 문장을 낸다.
 * 파생값은 `game_logic/skill.js:previewOf` 가 내고 화면은 문장만 만든다. 여기가 두 층을 다 잡는다.
 */
check('skill: previewOf — 실효 쿨 · 한 타 피해(능력치 계수 포함) · parts 모양 · 모르는 값은 null (SCREEN_DESIGN §4-2 · INTERFACE §2-8 · R72 · 계수 곱 2026-09-18)', () => {
    const def = SYS.skill.defs.war_bash;                       // 공격 · 단일 · 1타 · mult 300 · 슬롯 mult_pct·str
    const L0 = def.effects[0];                                 // 1단계 — previewOf 는 첫 줄에서 낸다 (2026-09-22)
    const stats = { ...G.heroes[0].stats };
    const sc = F.statCoef(stats.str);                          // 데미지 슬롯의 능력치 계수 — 곱이다 (battle_design §9-2)
    // 주기 2.4 · 표기 15초 → 올림(15/2.4)=7 × 2.4 = 16.8
    const pv = SYS.skill.previewOf(def, { period: 2.4, atkMin: 400, atkMax: 600, stats });
    if (Math.abs(pv.everySec - 16.8) > 1e-9) fail(`everySec ${pv.everySec}`);
    // 밑수는 범위다 — amount 도 양끝마다 계산한 {min, max} (R90)
    if (!eq(pv.amount, { min: Math.round(400 * L0.mult * sc), max: Math.round(600 * L0.mult * sc) })) fail(`amount ${JSON.stringify(pv.amount)}`);
    if (!(pv.lossPct > 0)) fail(`lossPct ${pv.lossPct}`);
    // 주기가 정수배면 손실 0 — 실효 = 표기
    const aligned = SYS.skill.previewOf(def, { period: 3, atkMin: 400, atkMax: 400, stats });
    if (aligned.everySec !== 15 || Math.abs(aligned.lossPct) > 1e-9) fail(`정렬 ${aligned.everySec}/${aligned.lossPct}`);
    // parts.amount — 밑수 · 배율 · 항(coef 0 인 항도 terms 에 든다) · 슬롯이 없는 항은 키가 없다
    const pa = pv.parts.amount;
    if (!pa || pa.basis !== 'atk' || pa.pct !== L0.mult || pa.value !== pv.amount) fail(`parts.amount ${JSON.stringify(pa)}`);
    if (!eq(pa.terms, L0.scales.filter(s => s.field === 'mult_pct').map(s => ({ attr: s.attr, coef: s.coef })))) fail(`terms ${JSON.stringify(pa.terms)}`);
    if (Object.keys(pv.parts).some(k => k !== 'amount')) fail(`슬롯이 없는 항의 키가 섰다 ${Object.keys(pv.parts)}`);
    // mult_pct 슬롯이 있는데 stats 가 없으면 amount 는 null — 능력치 계수를 모르는 피해는 틀린 숫자다
    const noStats = SYS.skill.previewOf(def, { period: 2.4, atkMin: 400, atkMax: 400 });
    // 양끝 중 하나라도 모르면 숫자를 안 낸다 — 반쪽 범위는 틀린 숫자다 (R90)
    if (SYS.skill.previewOf(def, { period: 2.4, atkMin: 400, stats }).amount !== null) fail('최대 끝을 모르는데 amount 가 났다');
    if (noStats.amount !== null || noStats.parts.amount.value !== null) fail(`stats 없는데 amount ${noStats.amount}`);
    // 모르는 값은 null — 화면이 그 조각을 접는다(후보 카드는 무기가 없어 둘 다 모른다)
    const bare = SYS.skill.previewOf(def, {});
    if (bare.everySec !== null || bare.lossPct !== null || bare.amount !== null) fail(`bare ${bare.everySec}/${bare.lossPct}/${bare.amount}`);
    if (bare.baseSec !== def.cool) fail('baseSec 이 표기 쿨이 아니다');
    // 데미지 슬롯은 coef 를 안 읽는다 — 계수를 넣은 표로 봐도 값이 같다 (2026-09-18 · ~~고정 항 `+ 능력치 × coef`~~ 폐기)
    const S2 = loadSkills(patchSkill('war_bash', { scale1_coef: 2 }));
    const wantMul = Math.round(400 * L0.mult * sc);
    if (S2.previewOf(S2.defs.war_bash, { atkMin: 400, atkMax: 400, stats }).amount?.min !== wantMul) fail(`coef 2 를 넣었더니 amount 가 ${wantMul} 이 아니다 — coef 를 읽었다`);
    // 버프는 배율이 없다 — amount 는 null · 슬롯이 미는 항만 parts 에 선다(value · dur)
    const grace = SYS.skill.defs.pri_grace;
    const gs = SYS.skill.statuses[grace.effects[0].status];    // 값 · 시간은 걸린 효과가 든다 (2026-09-22)
    const pg = SYS.skill.previewOf(grace, { period: 2.4, atkMin: 400, atkMax: 400, stats });
    if (pg.amount !== null || pg.parts.amount) fail('buff 에 amount 가 났다');
    if (!pg.parts.value || pg.parts.value.raw !== gs.value || pg.parts.value.value !== gs.value) fail(`parts.value ${JSON.stringify(pg.parts.value)}`);
    if (!pg.parts.dur || pg.parts.dur.raw !== gs.dur || !eq(pg.parts.dur.terms, [{ attr: 'vit', coef: 0 }])) fail(`parts.dur ${JSON.stringify(pg.parts.dur)}`);
    if (SYS.skill.previewOf(grace, { period: 2.4 }).parts.value.value !== null) fail('stats 없는데 parts.value.value 가 났다');
    // 회복 밑수는 마법 공격력 · 소환은 최대 HP
    const heal = SYS.skill.defs.pri_heal, wall = SYS.skill.defs.mag_frozenwall;
    const hl = heal.effects[0];
    const hsc = F.statCoef(stats[hl.scales.find(s => s.field === 'mult_pct')?.attr]);
    if (!eq(SYS.skill.previewOf(heal, { atkMin: 999, atkMax: 999, matkMin: 100, matkMax: 150, stats }).amount,
        { min: Math.round(100 * hl.mult * hsc), max: Math.round(150 * hl.mult * hsc) })) fail('회복 amount 가 matk 범위 × 능력치 계수를 안 탄다');
    if (SYS.skill.previewOf(wall, { hpMax: 500, stats }).parts.amount.basis !== 'hpMax') fail('소환 밑수가 hpMax 가 아니다');
    const wa = SYS.skill.previewOf(wall, { hpMax: 500, stats }).amount;
    if (!wa || wa.min !== wa.max) fail(`벽 HP 는 한 점이어야 한다 ${JSON.stringify(wa)}`);
    return `실효 ${pv.everySec}s · 한 타 ${pv.amount.min}~${pv.amount.max}(계수 ×${sc.toFixed(3)}) · parts ${Object.keys(pg.parts).join('/')}(그레이스)`;
});
check('skill: previewOf 확률은 1(= 100%) 에서 자른다 — parts.procChance.value ≤ 1 · raw 는 원값 · scaleDef 는 안 자른다 (strike 와 같은 상한 · R72 후속 · R111)', () => {
    const S = loadSkills(patchSkill('kni_charge', { scale2_coef: 0.2 }));   // proc_chance_pct · luck — 1점당 20% (슬롯은 하는 일 줄 · 2026-09-22)
    const def = S.defs.kni_charge;
    const stats = { str: 10, agi: 10, int: 10, vit: 10, luck: 6, ldr: 10, cha: 10 };
    const raw = def.effects[0].procChance, pushed = raw + stats.luck * 0.2;
    if (!(pushed > 1)) fail(`전제 — 민 확률 ${pushed} 가 1 을 안 넘는다`);
    const pc = S.previewOf(def, { atkMin: 100, atkMax: 100, stats }).parts.procChance;
    if (!pc || pc.value !== 1) fail(`parts.procChance.value ${pc?.value} (1 이어야)`);
    if (pc.raw !== raw) fail(`raw ${pc.raw} ≠ 원값 ${raw}`);
    if (S.scaleDef(def, stats).effects[0].procChance !== pushed) fail(`scaleDef 가 잘랐다 ${S.scaleDef(def, stats).effects[0].procChance} ≠ ${pushed}`);
    const low = S.previewOf(def, { atkMin: 100, atkMax: 100, stats: { ...stats, luck: 1 } }).parts.procChance.value;
    if (Math.abs(low - (raw + 0.2)) > 1e-9) fail(`1 아래는 그대로여야 한다 ${low} ≠ ${raw + 0.2}`);
    return `원값 ${raw} · 민 값 ${pushed} → 설명창 ${pc.value} · 운 1 이면 ${low}`;
});
check('tip: 영웅 첫 장은 착용 장비 · Alt 는 장비를 둔 채 세부 옵션 둘만 추가 · Basic Stats 는 숨긴다 (ADR-0171)', () => {
    const h = G.heroes[0], combat = SYS.game.heroCombat(G, h), findItem = uid => G.items[uid] ?? null;
    const alt = on => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: 'Alt' }));
    const base = heroTipCard(h, combat, findItem);
    if (!base.classList.contains('equipment')) fail('장비 전용 너비 클래스가 없다');
    if (!base.querySelector('.tip-equipment')) fail('첫 장에 착용 장비가 없다');
    if (!base.querySelector('.tip-equipment-face')) fail('장비 화면 레이어가 없다');
    if (!base.querySelector('.tip-equipment-probe')) fail('기본 높이를 잡는 세부 옵션 1 기준이 없다');
    if (base.querySelector('.attr-list')) fail('첫 장에 Basic Stats 가 남았다');
    if (base.querySelector('.tip-unit-col.d1, .tip-unit-col.d2')) fail('기본 상태에 세부 옵션이 섰다');
    if (base.querySelectorAll('.tip-equipment .pd-cell').length !== 8) fail('착용 위치가 8칸이 아니다');
    const worn = Object.values(h.equipped).filter(uid => findItem(uid)).length;
    if (base.querySelectorAll('.tip-equipment .pd-cell.filled').length !== worn) fail('착용한 개체 수와 찬 칸 수가 다르다');
    let held;
    try {
        alt(true);
        held = heroTipCard(h, combat, findItem);
    } finally { alt(false); }
    if (!held.querySelector('.tip-equipment')) fail('Alt 에서 착용 장비가 사라졌다');
    if (held.querySelector('.tip-equipment-probe')) fail('Alt 에서 높이 기준이 실제 세부 옵션 1과 중복됐다');
    if (held.querySelector('.attr-list')) fail('Alt 에 Basic Stats 가 섰다');
    if (held.querySelectorAll('.tip-unit-col.d1, .tip-unit-col.d2').length !== 2) fail('Alt 세부 옵션 두 열이 아니다');
    const detailRows = held.querySelectorAll('.tip-unit-col.d1 .cs-row, .tip-unit-col.d2 .cs-row').length;
    // 전투 능력치 행 전부 + 옵션이 여는 축 중 **값이 있는 줄만** (2026-09-22 · ADR-0291) — 캐릭터 탭은 그 축을 늘 세운다
    const all = sheetPages().flat();
    const statRows = all.filter(s => !s.fx).length, fxMax = all.filter(s => s.fx).length;
    const sparse = sheetPages(combat, true).flat().length;
    if (detailRows !== sparse) fail(`Alt 세부 옵션 ${detailRows}행 ≠ 값이 있는 줄까지 ${sparse}행`);
    if (sparse < statRows || sparse > statRows + fxMax) fail(`Alt 세부 옵션 ${sparse}행 — 전투 능력치 ${statRows}행 + 옵션 0~${fxMax} 가 아니다`);
    const full = sheetPages().map(p => p.length).join(' / ');
    // 2 는 19 — 명중률(궁수 T1-3 · 2026-09-22 R138)이 옵션 줄로 방어 무시 뒤에 섰다
    if (full !== '14 / 19') fail(`캐릭터 탭 세부 옵션 ${full} — 14 / 19 이어야 한다 (ADR-0294 · R138)`);
    return `장비 8칸(착용 ${worn}) · Alt 세부 ${detailRows}행 · 캐릭터 탭 ${full}`;
});
check('tip: Alt 영웅 툴팁은 카드 밖에서도 남고 · 찬 장비 hover는 옵션 카드를 열고 · 키를 떼면 모두 닫힌다 (ADR-0182)', () => {
    const h = G.heroes[0], combat = SYS.game.heroCombat(G, h), findItem = uid => G.items[uid] ?? null;
    const tip = document.createElement('div'), node = document.createElement('div');
    tip.id = 'tooltip'; document.body.append(tip, node);
    // `itemCardOf` 는 **아이템 개체**를 받는다 — 몬스터 장비는 세이브 밖이라 uid 가 없다 (ADR-0183)
    const itemCardOf = it => {
        const card = document.createElement('div');
        card.className = 'tip-card';
        card.dataset.testItem = it?.uid ?? '';
        card.textContent = `options:${it?.uid}`;
        return card;
    };
    bindTipNode(node, () => heroTipCard(h, combat, findItem, itemCardOf), { anchor: true, holdOnAlt: true });
    const alt = on => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: 'Alt' }));
    try {
        node.onmouseenter(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
        alt(true);
        if (!tip.classList.contains('interactive')) fail('Alt 를 누르자 툴팁이 포인터를 받지 않는다');
        node.onmouseleave(new MouseEvent('mouseleave', { relatedTarget: document.body, clientX: 20, clientY: 20 }));
        if (!tip.classList.contains('show')) fail('Alt 를 누른 채 영웅 밖으로 나가자 닫혔다');
        const cell = tip.querySelector('.tip-equipment .pd-cell.filled');
        if (!cell?.classList.contains('tip-optionable')) fail('찬 장비 칸에 옵션 hover가 연결되지 않았다');
        cell.onmouseenter(new MouseEvent('mouseenter', { clientX: 30, clientY: 30 }));
        const itemTip = document.querySelector('#equipment-item-tooltip');
        if (!itemTip?.classList.contains('show')) fail('찬 장비에 올렸는데 옵션 카드가 뜨지 않았다');
        // 칸은 **찬 칸의 차례**(`data-equip-i`)를 들고, 그 차례는 페이퍼돌 순서의 착용 개체다 (ADR-0183)
        const wornUids = M.PAPERDOLL.flat().filter(Boolean).map(pos => h.equipped?.[pos]).filter(uid => findItem(uid));
        if (itemTip.querySelector('.tip-card')?.dataset.testItem !== wornUids[+cell.dataset.equipI]) fail('올린 장비와 옵션 카드가 다르다');
        cell.onmouseleave(new MouseEvent('mouseleave', { relatedTarget: document.body }));
        if (itemTip.classList.contains('show')) fail('장비 칸에서 나왔는데 옵션 카드가 남았다');
        cell.onmouseenter(new MouseEvent('mouseenter', { clientX: 30, clientY: 30 }));
        alt(false);
        if (tip.classList.contains('show')) fail('영웅 밖에서 Alt 를 뗐는데 남았다');
        if (tip.classList.contains('interactive')) fail('Alt 를 뗐는데 툴팁이 포인터를 계속 받는다');
        if (itemTip.classList.contains('show')) fail('Alt 를 뗐는데 장비 옵션 카드가 남았다');
    } finally {
        alt(false);
        tip.remove(); node.remove(); document.querySelector('#equipment-item-tooltip')?.remove();
    }
    return 'Alt hold → 이탈 유지 → 장비 hover 옵션 → mouseleave/keyup 닫힘';
});
check('tip: 몬스터 첫 장도 착용 장비다 — 영웅과 같은 카드 · 한 벌은 `round` 이벤트의 `gear` (ADR-0183)', () => {
    const G2 = newGameP(42, cands, NOW);
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(r.err);
    const u = r.result.timeline.find(e => e.e === 'round')?.enemies?.[0];
    if (!u) fail('round 이벤트에 적이 없다');
    // 한 벌은 시뮬이 실어 온다 — 렌더러가 굴리지 않는다 (INTERFACE §2-6 · 처치 드롭이 이 중 하나로 나간다)
    if (!Array.isArray(u.gear) || !u.gear.length) fail('round 이벤트가 gear 를 안 싣는다');
    const alt = on => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: 'Alt' }));
    const base = monsterTipCard(u);
    if (!base.classList.contains('equipment')) fail('장비 전용 너비 클래스가 없다');
    if (!base.querySelector('.tip-equipment-face')) fail('첫 장에 착용 장비가 없다');
    if (base.querySelector('.attr-list')) fail('첫 장에 Basic Stats 가 남았다 — 영웅과 같은 카드여야 한다');
    if (base.querySelectorAll('.tip-equipment .pd-cell').length !== 8) fail('착용 위치가 8칸이 아니다');
    const filled = base.querySelectorAll('.tip-equipment .pd-cell.filled').length;
    if (filled !== u.gear.length) fail(`찬 칸 ${filled} ≠ 입은 부위 ${u.gear.length}`);
    let held;
    try { alt(true); held = monsterTipCard(u); } finally { alt(false); }
    if (!held.querySelector('.tip-equipment')) fail('Alt 에서 착용 장비가 사라졌다');
    if (held.querySelectorAll('.tip-unit-col.d1, .tip-unit-col.d2').length !== 2) fail('Alt 세부 옵션 두 열이 아니다');
    const rows = held.querySelectorAll('.tip-unit-col.d1 .cs-row, .tip-unit-col.d2 .cs-row').length;
    // 몬스터는 옵션이 여는 축이 없다(battle.js 가 시트에서 option_fx 를 뺀다) — 옵션 줄은 하나도 안 서고 전투 능력치 행만 선다 (ADR-0291)
    if (rows !== sheetPages().flat().filter(x => !x.fx).length) fail(`Alt 세부 옵션 ${rows}행 — 전체가 아니다`);
    return `${u.monsterId} · 장비 8칸(착용 ${filled}) · Alt 세부 ${rows}행`;
});
check('tip: 스킬 문장 — 37행 전부 문장을 낸다 · 숫자가 강조된다 · ko/en 둘 다 (SCREEN_DESIGN §4-2)', () => {
    const ctx = { period: 2.4, atkMin: 400, atkMax: 400, atkType: 'physical' };
    let checked = 0;
    for (const lang of ['ko', 'en']) {
        setLang(lang);
        for (const def of SYS.skill.list) {
            const card = skillTipCard({ id: def.id }, ctx);
            const line = card?.querySelector('.tip-line');
            if (!line) fail(`${lang} ${def.id} 문장이 없다 (cast=${def.cast} effect=${def.effects[0].effect} target=${def.target})`);
            const txt = line.textContent.trim();
            if (!txt) fail(`${lang} ${def.id} 문장이 비었다`);
            if (txt.includes('{') || txt.includes('undefined') || txt.includes('null'))
                fail(`${lang} ${def.id} 치환이 안 됐다: ${txt}`);
            // 표기 쿨이 문장에 들어가고 **강조**돼야 한다 — 강조가 빠지면 숫자가 문장에 묻힌다.
            // ⚠ 2026-09-08 2차 개정으로 ~~실효 쿨~~ 이 아니라 **표기 쿨**이다 (SCREEN_DESIGN §4-2 · R56)
            const hl = [...line.querySelectorAll('.tip-hl')].map(n => n.textContent);
            if (!hl.length) fail(`${lang} ${def.id} 강조된 숫자가 없다`);
            // ⚠ **쿨이 없는 둘만 예외** — 오오라(§1-5 상시)와 사건(자폭 · 차례가 아니라 죽음이 부른다 · 2026-09-21).
            //   문장이 초를 안 말한다. 대신 오오라는 효과 값이, 자폭은 피해 값이 강조돼 있다
            if (def.cast === 'turn') {
                const cool = String(Number(SYS.skill.previewOf(def, ctx).baseSec.toFixed(1)));
                if (!hl.includes(cool)) fail(`${lang} ${def.id} 표기 쿨 ${cool} 이 강조에 없다 (${hl})`);
            }
            checked += 1;
        }
    }
    setLang('ko');
    return `${checked} 문장 (37행 × ko/en)`;
});
check('tip: 스킬의 초는 **행동 주기를 안 탄다** — 공속을 올려도 문장의 숫자가 그대로다 (SCREEN_DESIGN §4-2 · R56)', () => {
    // 회귀 그물 — 옛 판은 실효 쿨(ceil(쿨 ÷ 주기) × 주기)을 찍어서 공격 속도 마스터리를 찍을 때마다
    // 쿨 자리의 숫자가 움직였다(「공속을 올리는데 왜 스킬 쿨이 줄어드나」). 다시 그렇게 되면 여기서 걸린다
    const def = SYS.skill.defs.pri_judgment;
    const secOf = period => skillTipCard({ id: def.id }, { period, atkMin: 400, atkMax: 400, atkType: 'physical' })
        .querySelector('.tip-line').querySelector('.tip-hl').textContent;
    const slow = secOf(2.4), fast = secOf(0.8), none = secOf(undefined);
    if (slow !== fast) fail(`주기 2.4 → ${slow} · 0.8 → ${fast} — 초가 주기를 탔다`);
    if (slow !== none) fail(`주기를 모르는 자리(${none})와 아는 자리(${slow})가 다르다`);
    if (Number(slow) !== def.cool) fail(`표기 쿨 ${def.cool} 이 아니라 ${slow} 이 나왔다`);
    // 실효 쿨 자체는 계약에 남는다 — 엔진 규칙은 안 바뀌었고 화면만 안 쓴다
    const pv = SYS.skill.previewOf(def, { period: 2.4 });
    if (!(pv.everySec > pv.baseSec)) fail(`previewOf.everySec 가 사라졌다 (${pv.everySec})`);
    return `표기 쿨 ${def.cool} 초 고정 · previewOf.everySec ${pv.everySec.toFixed(1)} 는 계약에 살아 있다`;
});
check('tip: 값을 모르면 식으로 접힌다 — 후보 카드 · 도감 자리 (SCREEN_DESIGN §2 「스킬 설명창 규격」 · ADR-0089)', () => {
    const def = SYS.skill.defs.war_bash;
    const bare = skillTipCard({ id: def.id }, {}).querySelector('.tip-line').textContent;
    // 공격력을 아는 자리는 **능력치도 안다** — mult_pct 슬롯이 있는데 stats 가 없으면 previewOf 가 숫자를 안 낸다 (R72)
    const full = skillTipCard({ id: def.id }, { period: 2.4, atkMin: 400, atkMax: 400, atkType: 'physical', stats: { ...G.heroes[0].stats } })
        .querySelector('.tip-line').textContent;
    const L0 = def.effects[0];                                  // 1단계 — 문장은 첫 줄에서 (2026-09-22)
    if (!bare.includes(`${M.pctNum(L0.mult)}%`)) fail(`배율 ${M.pctNum(L0.mult)}% 가 안 보인다: ${bare}`);   // 비율 3 → 화면 300% (R111)
    // 식은 데미지 슬롯의 능력치를 곱한다 — `(데미지 × 300% × STR)` (ADR-0164 · 2026-09-18)
    const abbr = D.heroAttributes.find(a => a.id === L0.scales[0]?.attr)?.abbr;
    if (!abbr || !bare.includes(`× ${abbr}`) || bare.includes(`${abbr} ×`)) fail(`식이 능력치 약어(${abbr})를 곱하지 않는다: ${bare}`);
    if (!bare.includes(String(def.cool))) fail(`표기 쿨 ${def.cool} 로 안 접혔다: ${bare}`);
    if (!full.includes(Math.round(400 * L0.mult * F.statCoef(G.heroes[0].stats[L0.scales[0].attr])).toLocaleString())) fail(`실제 수치가 안 보인다: ${full}`);
    if (bare === full) fail('아는 자리와 모르는 자리가 같은 문장을 냈다');
    // 정의에 없는 id 는 던지지 않고 이름만 낸다 (행이 지워진 옛 세이브)
    const gone = skillTipCard({ id: 'no_such_skill' }, {});
    if (!gone || gone.querySelector('.tip-line')) fail('없는 스킬에 문장이 났다');
    return `모름 "${bare}" / 앎 "${full}"`;
});
check('tip: 피해 · 회복량은 범위로 찍힌다 — 양끝이 다르면 「최소~최대」 · 같으면 한 수 · ko/en (SCREEN_DESIGN §2 · ADR-0108 · R90)', () => {
    const def = SYS.skill.defs.war_bash;
    const stats = { ...G.heroes[0].stats };
    const lineOf = ctx => skillTipCard({ id: def.id }, { period: 2.4, atkType: 'physical', stats, ...ctx }).querySelector('.tip-line').textContent;
    const L0 = def.effects[0];                                  // 1단계 — 문장은 첫 줄에서 (2026-09-22)
    const sc = F.statCoef(stats[L0.scales[0].attr]);            // 능력치 계수 — 곱이다 (2026-09-18)
    const lo = Math.round(400 * L0.mult * sc), hi = Math.round(600 * L0.mult * sc);
    const shown = [];
    try {
        for (const lang of ['ko', 'en']) {
            setLang(lang);
            const want = i18nT('st.range', { a: lo.toLocaleString(), b: hi.toLocaleString() });
            const ranged = lineOf({ atkMin: 400, atkMax: 600 });
            if (!ranged.includes(want)) fail(`${lang} 범위 ${want} 가 안 보인다: ${ranged}`);
            const single = lineOf({ atkMin: 400, atkMax: 400 });
            if (single.includes(want) || !single.includes(lo.toLocaleString())) fail(`${lang} 양끝이 같은데 한 수가 아니다: ${single}`);
            shown.push(want);
        }
    } finally { setLang('ko'); }
    return shown.join(' · ');
});
check('tip: 숫자 자리 셋 — 기본 · Alt 를 누르는 동안 값 + 괄호 식 · 값 없음 · 추가 피해는 둘째 문장 (SCREEN_DESIGN §2 「스킬 설명창 규격」 · ADR-0089)', () => {
    // 차지 — 피해(mult_pct · STR)와 확률(proc_chance_pct · LCK)에 슬롯이 있고 배수에는 없다. 추가 피해 문장이 선다
    const def = SYS.skill.defs.kni_charge;
    const ctx = { period: 2.4, atkMin: 400, atkMax: 400, atkType: 'physical', stats: { ...G.heroes[0].stats } };
    const alt = on => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: 'Alt' }));
    const base = skillTipCard({ id: def.id }, ctx);
    const nLines = base.querySelectorAll('.tip-line').length;
    if (nLines !== 2) fail(`추가 피해 둘째 문장이 없다 (${nLines}줄)`);
    if (base.querySelector('.tip-fx')) fail('기본 상태에 식이 섰다');
    if (!base.querySelector('.tip-foot')) fail('기본 상태에 「Alt 계산식」 각주가 없다');
    let held;
    try {
        alt(true);
        held = skillTipCard({ id: def.id }, ctx);
    } finally { alt(false); }
    const fx = [...held.querySelectorAll('.tip-fx')].map(n => n.textContent);
    // 괄호는 슬롯이 미는 숫자에만 — 피해 · 확률 둘. 쿨 · 배수(슬롯 없음)는 괄호가 없다
    if (fx.length !== 2) fail(`Alt 괄호 식이 ${fx.length}개 — 피해 · 확률 둘이어야 한다: ${fx}`);
    if (held.querySelector('.tip-foot')) fail('Alt 상태에 각주가 남았다');
    if (skillTipCard({ id: def.id }, ctx).querySelector('.tip-fx')) fail('Alt 를 뗐는데 식이 남았다');
    // 값 없음(도감) — 식만. 흐리게 두지 않고 각주도 없다(Alt 가 더 보여줄 것이 없다)
    const bare = skillTipCard({ id: def.id }, {});
    if (bare.querySelector('.tip-fx') || bare.querySelector('.tip-foot')) fail('값 없음 자리에 흐린 식 · 각주가 섰다');
    return `Alt 식 ${fx.join(' · ')}`;
});

/* ── 원정 정산 ── */
check('report: roundsCleared 를 정산이 싣는다 — 렌더러가 짐작하지 않는다 (INTERFACE §2-7)', () => {
    const G2 = newGameP(42, cands, NOW);
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(r.err);
    if (r.report.roundsCleared !== r.result.roundsCleared) fail('결과와 리포트가 갈린다');
    if (r.report.won && r.report.roundsCleared !== SYS.battle.stageRounds(D.stages[101]).length) fail(`클리어인데 ${r.report.roundsCleared} 라운드`);
    return `r${r.report.roundsCleared} · ${r.report.reason}`;
});
check('resolveBattle: 골드·처치·드롭·전투불능이 상태에 반영 · 도감 카드는 없다', () => {
    const G2 = newGameP(42, cands, NOW);
    const gold = G2.resources.gold;
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(r.err);
    const rp = r.report;
    if (G2.resources.gold !== gold + rp.gold) fail('gold');
    if (Object.keys(G2.codexKills).length === 0) fail('kills');
    if ('codexCards' in G2 || 'cards' in rp) fail('도감 카드가 상태 · 리포트에 되살아났다 (2026-09-21 걷음)');
    if (rp.drops.some(u => !G2.bag.includes(u))) fail('drops');
    if (G2.runs[0].downed !== undefined) fail('run.downed 가 아직 있다 — 「출정 아웃」은 2026-09-08 폐기(v17)');
    if (rp.won !== G2.progress.cleared.includes(101)) fail('cleared');
    if (G2.counters.battle !== 1 || !G2.runs[0] || G2.runs[0].stageId !== 101) fail('counters/run');
    if (!rp.strikes || !(rp.strikes.party.n >= 1) || !eq(rp.strikes, r.result.strikes)) fail('리포트에 빗나감 집계가 없다 (§9-8)');
    return `${rp.won ? 'WIN' : 'LOSE'} gold+${rp.gold} drops ${rp.drops.length} kills ${Object.values(G2.codexKills).reduce((a, b) => a + b, 0)} downed ${rp.downed.length}`;
});
/*
 * **드롭은 몬스터가 입고 있던 장비다** [사용자 지시 2026-09-11 · R79 · item_design §1 2단계].
 *   떨어진 아이템은 ① 그 스테이지 몬스터의 `wear_slots` 안의 부위이고 ② 무기면 그 몬스터들의 `weapon_group` 중 하나이며
 *   ③ ilvl 이 `dlvl + gear_ilvl_add`(등급 하나)로 **굴림 없이** 정해진다. 옛 경로(부위 균등 · 무기군 균등 · ilvl 퍼짐)면 셋 다 깨진다.
 */
check('simulate: 드롭은 입은 장비다 — 부위·무기군은 그 스테이지 몬스터의 것 · ilvl 은 dlvl + 등급 가산 (R79)', () => {
    const st = D.stages[101];
    const ids = [...SYS.battle.stagePool(st), st.boss_monster_idx];
    const parts = new Set(ids.flatMap(id => String(D.monsters[id].wear_slots).split('|')));
    const groups = new Set(ids.map(id => D.monsters[id].weapon_group));
    const ilvls = new Set(Object.values(D.grades).map(g => st.dlvl + g.gear_ilvl_add));
    let n = 0;
    for (let seed = 1; seed <= 12; seed++) {
        const r = SOFT.battle.simulate(units(), 101, makeRng(seed));      // 드롭 표본 — 잡아야 떨어진다 · 약한 몬스터(SOFT)
        for (const it of r.drops) {
            n++;
            if (!parts.has(it.slot)) fail(`seed ${seed} 부위 ${it.slot} — 101 몬스터가 안 입는 부위다`);
            if (it.slot === 'weapon' && !groups.has(it.group)) fail(`seed ${seed} 무기군 ${it.group} — 101 몬스터가 안 드는 무기다`);
            if (!ilvls.has(it.ilvl)) fail(`seed ${seed} ilvl ${it.ilvl} — dlvl ${st.dlvl} + 등급 가산이 아니다`);
            if ('element' in it) fail('드롭 무기에 element 가 있다 (R80)');
        }
    }
    if (!n) fail('12판에 드롭이 하나도 없다 — 표본 부족');
    return `드롭 ${n}개 · 부위 ⊂ {${[...parts].join(',')}} · 무기군 ⊂ {${[...groups].join(',')}}`;
});
/*
 * **몬스터 장비는 제 줄에서 굴린다** [2026-09-22 · 구조 감사 · INTERFACE §5-1] — 전투 줄에서 굴리던 때는 아이템 옵션 한 줄이
 *   장비 굴림 수를 바꿔 그 뒤 편성 · 적중 · 치명이 통째로 갈렸다. 같은 한 벌을 내되 굴림을 더 쓰는 `rollGear` 로 갈아 끼워도
 *   타임라인이 **한 글자도** 안 달라야 한다 — 다른 몬스터의 장비도 그대로다(몬스터마다 제 줄). 판은 제 것을 만든다(공유 `G` 를 안 읽는다)
 */
check('battle: 몬스터 장비는 제 줄에서 굴린다 — 장비 굴림 수가 늘어도 편성 · 장비 · 전투가 그대로다 (INTERFACE §5-1 · 2026-09-22)', () => {
    const S = buildSystems(D);
    const g = S.game.newGame(61, S.hero.rollStartParty(makeRng(61), B.party_size_max), NOW);
    const party = S.game.partyOf(g).map(uid => ({ uid, combat: S.game.heroCombat(g, S.game.heroById(g, uid)) }));
    const plain = S.item.rollGear;
    const run = extra => {
        let sets = 0;
        S.item.rollGear = (rng, opts) => { sets++; const out = plain(rng, opts); for (let i = 0; i < extra; i++) rng(); return out; };
        try {
            const tl = [101, 105].map(id => JSON.stringify(S.battle.simulate(party, id, makeRng(7)).timeline));
            return { sets, tl };
        } finally { S.item.rollGear = plain; }
    };
    const a = run(0), b = run(3);
    if (!a.sets) fail('장비를 한 번도 안 굴렸다 — 갈아 끼운 자리를 battle 이 안 부른다');
    if (a.sets !== b.sets) fail(`굴린 벌 수가 달라졌다 ${a.sets} → ${b.sets} — 편성이 밀렸다`);
    [101, 105].forEach((id, i) => { if (a.tl[i] !== b.tl[i]) fail(`${id} — 장비 굴림 3회가 전투를 바꿨다(같은 시드 · 같은 장비인데 다른 타임라인)`); });
    return `${a.sets}벌 · 벌마다 굴림 +3 · 101 · 105 타임라인 동일`;
});
/*
 * **스테이지 레벨** [2026-09-14 사용자 확정 · base_expedition_design §1-4 · R87] — 플레이어가 만지는 숫자는 이것 하나다.
 *   ① 상한 = 클리어한 스테이지의 기본 레벨 중 최고 · 아무것도 안 깼으면 못 올린다 ② 범위 밖 · 정수 아님은 `range`
 *   ③ 세이브는 **올린 양**이고 기본 레벨로 돌리면 지운다 ④ 상한을 넘는 기록은 읽을 때 자른다(기본 레벨이 다시 깔린 세이브)
 *   ⚠ 해금 조건은 없다 — 사용자 09-14 「처음부터 열어 두고 나중에 연구로」
 */
check('stageLevel: 상한 = 클리어한 최고 기본 레벨 · 범위 밖은 range · 저장은 올린 양 · 기본 레벨로 돌리면 지운다 (base_expedition_design §1-4 · R87)', () => {
    const g = newGameP(31, SYS.hero.rollStartParty(makeRng(31), B.party_size_max), NOW);
    const base = D.stages[101].dlvl, top = D.stages[105].dlvl;
    const s0 = SYS.game.stageLevelState(g, 101);
    if (!eq(s0, { base, max: base, level: base })) fail(`새 게임 ${JSON.stringify(s0)}`);
    // 처음부터 열려 있다(R152 — 사용자 09-14 로 되돌림) — 아무것도 안 지은 새 게임도 클리어하면 곧바로 올린다
    const raw = SYS.game.newGame(31, SYS.hero.rollStartParty(makeRng(31), B.party_size_max), NOW);
    raw.progress.cleared = [101, 102, 103, 104];
    const rawTop = D.stages[104].dlvl;
    if (SYS.game.stageLevelState(raw, 101).max !== rawTop || !SYS.game.setStageLevel(raw, 101, rawTop).ok) fail(`새 게임에서 못 올렸다 ${JSON.stringify(SYS.game.stageLevelState(raw, 101))}`);
    if (SYS.game.setStageLevel(g, 101, base + 1).err !== 'range') fail('아무것도 안 깼는데 올라갔다');
    g.progress.cleared = [101, 102, 103, 104, 105];
    if (SYS.game.stageLevelState(g, 101).max !== top) fail(`상한 ${SYS.game.stageLevelState(g, 101).max} ≠ 105 기본 레벨 ${top}`);
    if (SYS.game.stageLevelState(g, 201).max !== D.stages[201].dlvl) fail('안 깬 윗 스테이지의 상한이 기본 레벨이 아니다');
    const r = SYS.game.setStageLevel(g, 101, top);
    if (!r.ok || SYS.game.stageLevelState(g, 101).level !== top) fail(`상한까지 못 올렸다 ${JSON.stringify(r)}`);
    if (g.progress.levelUp[101] !== top - base) fail(`저장은 올린 양이다 — ${g.progress.levelUp[101]}`);
    for (const bad of [top + 1, base - 1, base + 0.5, String(base + 1)])
        if (SYS.game.setStageLevel(g, 101, bad).err !== 'range') fail(`${JSON.stringify(bad)} 가 거절 안 됐다`);
    if (SYS.game.setStageLevel(g, 999, base).err !== 'missing' || SYS.game.stageLevelState(g, 999) !== null) fail('없는 스테이지');
    SYS.game.setStageLevel(g, 101, base);
    if (101 in g.progress.levelUp) fail('기본 레벨로 돌렸는데 기록이 남았다');
    g.progress.levelUp[101] = 999;
    if (SYS.game.stageLevelState(g, 101).level !== top) fail('상한을 넘는 기록을 안 잘랐다');
    return `기본 ${base} · 상한 ${top} · 저장 = 올린 양`;
});
/*
 * 올린 레벨이 전투에 닿는 두 자리(적 생성 · 장비 아이템 레벨)가 **같은 값**을 읽고, 레벨은 **값만** 바꾼다.
 *   굴림 횟수가 레벨을 따라 바뀌면 같은 세이브가 레벨 한 칸에 전혀 다른 편성을 낸다 — 첫 라운드 편성이 같아야 한다.
 */
check('stageLevel: 올린 레벨로 싸운다 — 몬스터 HP · 드롭 아이템 레벨이 따라 오르고 편성 · 장비 굴림 수는 그대로 · 리포트 level (R87)', () => {
    const base = D.stages[101].dlvl, top = D.stages[105].dlvl;
    const run = up => {
        const g = newGameP(32, SYS.hero.rollStartParty(makeRng(32), B.party_size_max), NOW);
        g.progress.cleared = [101, 102, 103, 104, 105];
        if (up && !SYS.game.setStageLevel(g, 101, top).ok) fail('못 올렸다');
        return SYS.game.resolveBattle(g, 101, NOW);
    };
    const r0 = run(false), r1 = run(true);
    if (r0.report.level !== base || r1.report.level !== top) fail(`리포트 level ${r0.report.level} · ${r1.report.level}`);
    const foes = r => r.result.timeline.find(ev => ev.e === 'round').enemies;
    const f0 = foes(r0), f1 = foes(r1);
    if (!eq(f0.map(e => `${e.monsterId}:${e.grade}:${e.sin}`), f1.map(e => `${e.monsterId}:${e.grade}:${e.sin}`))) fail('레벨을 올렸더니 첫 라운드 편성이 달라졌다');
    f0.forEach((e, i) => { if (!(f1[i].hpMax > e.hpMax)) fail(`${e.monsterId} HP ${e.hpMax} → ${f1[i].hpMax} — 안 올랐다`); });
    // 장비 굴림 수는 아이템 레벨과 무관하다 — 같은 시드에서 굴린 뒤 다음 수가 같다
    const m = D.monsters[D.stages[101].boss_monster_idx];
    const ra = makeRng(3), rb = makeRng(3);
    const slots = String(m.wear_slots).split('|');
    SYS.item.rollGear(ra, { slots, ilvl: base, weaponGroup: m.weapon_group });
    SYS.item.rollGear(rb, { slots, ilvl: top, weaponGroup: m.weapon_group });
    if (ra() !== rb()) fail('아이템 레벨이 장비 굴림 횟수를 바꿨다');
    // 드롭 아이템 레벨 = 올린 레벨 + 등급 가산
    const ilvls = new Set(Object.values(D.grades).map(gr => top + gr.gear_ilvl_add));
    let n = 0;
    for (let seed = 1; seed <= 12; seed++)
        for (const it of SYS.battle.simulate(godUnits(), 101, makeRng(seed), top).drops) {
            n++;
            if (!ilvls.has(it.ilvl)) fail(`seed ${seed} 드롭 ilvl ${it.ilvl} — 올린 레벨 ${top} + 등급 가산이 아니다`);
        }
    if (!n) fail('12판에 드롭이 하나도 없다 — 표본 부족');
    return `Lv ${base} → ${top} · 첫 라운드 ${f0.length}마리 편성 동일 · 드롭 ${n}개`;
});
check('save: progress.levelUp 은 왕복한다 · 없는 옛 세이브는 {} 로 열린다 — 버전 불변 (INTERFACE §4 · R87)', () => {
    const g = newGameP(33, SYS.hero.rollStartParty(makeRng(33), B.party_size_max), NOW);
    g.progress.cleared = [101, 102, 103];
    const want = D.stages[103].dlvl;
    if (!SYS.game.setStageLevel(g, 101, want).ok) fail('못 올렸다');
    const s = JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW)));
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(s)));
    if (SYS.game.stageLevelState(back, 101).level !== want) fail('왕복하며 올린 레벨을 잃었다');
    delete s.progress.levelUp;
    const old = SYS.game.deserialize(s);
    if (!eq(old.progress.levelUp, {}) || s.version !== SAVE_VERSION) fail(`옛 세이브 ${JSON.stringify(old.progress.levelUp)} · v${s.version}`);
    if (SYS.game.stageLevelState(old, 101).level !== D.stages[101].dlvl) fail('옛 세이브가 기본 레벨로 안 열린다');
    return `올린 양 ${JSON.stringify(back.progress.levelUp)} · 옛 세이브 {} · v${SAVE_VERSION}`;
});
/*
 * **적의 소환 벽** [2026-09-11 · R79] — 몬스터가 스킬 칸을 갖게 되어 처음 생긴 경로다(105 챕터보스 사탄의 고유 `mag_frozenwall`).
 *   ① 적 벽을 쓰러뜨려도 **처치가 아니다** — 골드가 NaN 이 되거나 `kills` 에 몬스터가 아닌 키가 생기면 안 된다(캘리브레이션 105 gold NaN 의 원인)
 *   ② **클리어 판정에서 빠진다** — 보스만 쓰러지면 벽이 서 있어도 끝난다(전멸 판정이 파티 벽을 빼는 것과 같은 규칙)
 */
check('battle: 적의 소환 벽은 처치가 아니고 클리어를 막지 않는다 — 골드·처치가 오염되지 않는다 (R79)', () => {
    const wallsOf = r => new Set(r.timeline.filter(ev => ev.e === 'summon' && ev.u.startsWith('e')).map(ev => ev.d));
    const downOf = (r, k) => r.timeline.find(ev => ev.e === 'down' && ev.u === k);
    // ① 적 벽이 **쓰러진** 판 — 벽이 onKill 을 지나면 골드가 NaN 이 된다(캘리브레이션 105 에서 처음 드러났다).
    //   드문 사건이라 한 가지 세기·시드에 기대면 수열이 바뀔 때마다 표본이 사라진다 — 세기를 올려 가며 찾는다(결함은 파티 세기와 무관하다)
    let one = null;
    for (const mul of [1, 2, 4, 8]) {
        const mk = () => units().map(u => ({ uid: u.uid, combat: { ...u.combat, hp_max: 100000, attack_type: 'physical', atk_magic: undefined,
            atk_physical: scaleRange(u.combat.atk_physical ?? u.combat.atk_magic, mul) } }));
        for (let seed = 1; seed <= 40 && !one; seed++) {
            const x = SYS.battle.simulate(mk(), 105, makeRng(seed));
            if ([...wallsOf(x)].some(k => downOf(x, k))) one = { seed, mul, r: x };
        }
        if (one) break;
    }
    if (!one) fail('적 벽이 쓰러진 판이 없다 — ① 표본 없음 (×1~×8 · 시드 1~40)');
    const r = one.r;
    if (!Number.isFinite(r.gold)) fail(`×${one.mul} seed ${one.seed} gold ${r.gold} — 벽이 onKill 을 지났다`);
    for (const k of Object.keys(r.kills)) if (!D.monsters[k]) fail(`kills 에 몬스터가 아닌 키 ${k}`);
    const walls = wallsOf(r);
    // 벽이 처치로 새지 않는다 — **몬스터** 쓰러짐(벽 제외)만 처치가 된다(보스 단독 1라운드라 이겼을 때만 들어온다 · R89).
    //   ~~타임라인 card 이벤트의 주인이 벽인가~~ 는 R89 로 card 이벤트가 없어져 **영원히 통과하던 줄**이라 갈아 끼웠다
    const monsterDowns = r.timeline.filter(ev => ev.e === 'down' && ev.u.startsWith('e') && !walls.has(ev.u)).length;
    const banked = Object.values(r.kills).reduce((x, y) => x + y, 0);
    if (banked !== (r.won ? monsterDowns : 0)) fail(`처치 ${banked} ≠ 몬스터 쓰러짐 ${monsterDowns}(won ${r.won}) — 벽이 처치로 샜다`);
    const credited = r.contrib.reduce((x, c) => x + c.kills, 0), killed = Object.values(r.kills).reduce((x, y) => x + y, 0);
    if (credited !== killed) fail(`기여 처치 ${credited} ≠ 처치 ${killed} — 벽을 한쪽만 셌다`);
    // ② 센 파티 — 벽이 선 채로 보스가 쓰러진 판. 끝나는 시각 = 보스가 쓰러진 시각이어야 한다. 세기를 올려 가며 찾고 표본 수를 같이 낸다
    const stat = [];
    let two = null;
    for (const mul of [4, 8, 16, 32, 64]) {
        const mk = () => units().map(u => ({ uid: u.uid, combat: { ...u.combat, hp_max: 100000, attack_type: 'physical', atk_magic: undefined,
            atk_physical: scaleRange(u.combat.atk_physical ?? u.combat.atk_magic, mul) } }));
        let summoned = 0, wins = 0, standing = 0;
        for (let seed = 1; seed <= 40; seed++) {
            const x = SYS.battle.simulate(mk(), 105, makeRng(seed));
            const w = wallsOf(x);
            if (w.size) summoned++;
            if (x.won) wins++;
            if (x.won && [...w].some(k => !downOf(x, k))) { standing++; if (!two) two = { mul, seed, r: x }; }
        }
        stat.push(`×${mul} 소환 ${summoned} · 승 ${wins} · 벽 선 채 승 ${standing}`);
    }
    if (!two) fail(`벽이 선 채 이긴 판이 없다 — ② 표본 없음 [${stat.join(' / ')}]`);
    const bossDown = downOf(two.r, 'e0');
    const end = two.r.timeline[two.r.timeline.length - 1];
    if (!bossDown) fail(`×${two.mul} seed ${two.seed} 보스가 안 쓰러졌는데 이겼다`);
    if (end.t !== bossDown.t) fail(`×${two.mul} seed ${two.seed} 보스 전투불능 t=${bossDown.t} 인데 끝은 t=${end.t} — 벽이 클리어를 막았다`);
    return `① ×${one.mul} seed ${one.seed} 벽 ${walls.size} · gold ${r.gold} · 처치 ${killed} / ② ×${two.mul} seed ${two.seed} 벽이 선 채 t=${end.t} 클리어 [${stat.join(' / ')}]`;
});
/*
 * **파티의 소환 벽** [2026-09-21 · 부채 #44] — 적 쪽 벽은 R79 에서 처치가 아니게 고쳤는데 **파티 쪽 벽**은 그대로였다.
 *   `makeSummon` 이 `uid` 를 안 주므로 벽이 쓰러지면 `downed` 에 `undefined` 가 실려 리포트의 「전투불능 N명」과
 *   캘리브레이션 `avg downed` 열이 부푼다(파티 3 인데 3.15~3.45 가 나오던 원인).
 */
check('battle: 파티의 소환 벽은 전투불능에 안 실린다 — downed 는 영웅 uid 뿐이다 (2026-09-21 · 부채 #44 · INTERFACE §2-6)', () => {
    // 벽은 **마법사 킷**(mag_frozenwall)이 세운다 — 배정으로는 안 나갈 수 있어 킷을 손으로 싣는다(clsUnits)
    const wallsOf = r => new Set(r.timeline.filter(ev => ev.e === 'summon' && !ev.u.startsWith('e')).map(ev => ev.d));
    const downKeys = r => new Set(r.timeline.filter(ev => ev.e === 'down').map(ev => ev.u));
    let one = null;
    for (const stageId of [104, 105, 103]) {
        for (let seed = 1; seed <= 40 && !one; seed++) {
            const x = SYS.battle.simulate(clsUnits('mage'), stageId, makeRng(seed));
            const fell = [...wallsOf(x)].filter(k => downKeys(x).has(k));
            if (fell.length) one = { stageId, seed, r: x, walls: wallsOf(x).size, fell: fell.length };
        }
        if (one) break;
    }
    if (!one) fail('파티 벽이 쓰러진 판이 없다 — 표본 없음 (스테이지 103~105 · 시드 1~40)');
    const bad = one.r.downed.filter(uid => !SYS.game.partyOf(G).includes(uid));
    if (bad.length) fail(`downed 에 영웅이 아닌 값 ${bad.length}개 (${bad.map(x => String(x)).join(',')}) — 벽이 실렸다`);
    if (one.r.downed.length > SYS.game.partyOf(G).length) fail(`downed ${one.r.downed.length} > 파티 ${SYS.game.partyOf(G).length}`);
    return `stage ${one.stageId} seed ${one.seed} 벽 ${one.walls} 중 ${one.fell} 쓰러짐 · downed ${one.r.downed.length}/${SYS.game.partyOf(G).length}`;
});
/*
 * **최대 HP 를 미는 창** [2026-09-21 · 부채 #50] — 배틀오더스(`hp_max_pct`)는 로직에서 `hpMax` 를 올리는데 창 이벤트가 그 값을 안 실었다.
 *   재생기는 **계산하지 않으므로**(INTERFACE §6) 옛 최대치를 든 채 현재 HP 만 갱신해 관전 카드에 `118 / 103` 이 떴다.
 *   여기서는 **재생기가 아는 최대치**(party[] 초기값 + refit + 창이 실어 준 값)를 그대로 따라가며, 어떤 이벤트도 그 최대치를 넘는 HP 를 말하지 않는지 본다.
 */
check('runtime: 최대 HP 를 미는 창이 hpMax·dhp 를 싣는다 — 재생기가 아는 최대치를 HP 가 안 넘는다 (2026-09-21 · 부채 #50 · INTERFACE §6)', () => {
    let one = null;
    for (let seed = 1; seed <= 40 && !one; seed++) {
        const x = SYS.battle.simulate(clsUnits('warrior'), 101, makeRng(seed));
        if (x.timeline.some(ev => ev.e === 'buff' && ev.stat === 'hp_max_pct')) one = { seed, r: x };
    }
    if (!one) fail('hp_max_pct 창이 열린 판이 없다 — 표본 없음 (시드 1~40)');
    // **창을 여는 시전만 싣는다** — 이미 열려 있는데 다시 걸면(쿨 < 지속) 창 합이 그대로라 최대치가 안 바뀐다.
    //   여는 것과 재시전을 양쪽으로 다 본다: 여는데 안 실으면 `118 / 103`, 재시전에 실으면 없는 변화를 말하는 것이다
    const ups = one.r.timeline.filter(ev => ev.e === 'buff' && ev.stat === 'hp_max_pct');
    const openUntil = new Map();
    let opened = 0;
    for (const ev of ups) {
        const k = `${ev.u}|${ev.s}`;
        const fresh = !(openUntil.get(k) > ev.t + 1e-9);
        if (fresh && ev.hpMax === undefined) fail(`t=${ev.t} buff ${ev.s} (${ev.u}) 가 창을 여는데 hpMax 가 없다 — 재생기가 옛 최대치를 든다`);
        if (!fresh && ev.hpMax !== undefined) fail(`t=${ev.t} buff ${ev.s} (${ev.u}) 는 재시전인데 hpMax 를 실었다 — 최대치는 안 바뀐다`);
        if (ev.hpMax !== undefined && ev.dhp > ev.hpMax + 1e-9) fail(`t=${ev.t} buff ${ev.s} dhp ${ev.dhp} > hpMax ${ev.hpMax}`);
        openUntil.set(k, ev.until);
        if (fresh) opened++;
    }
    if (!opened) fail('창을 여는 시전이 하나도 없다 — 표본이 재시전뿐이다');
    // **최대치를 실어 주는 이벤트는 셋뿐이다** — `summon` 의 hpMax 는 **벽의 것**이라 시전자에 쓰면 안 된다
    const CARRY = ['refit', 'buff', 'buffEnd'];
    const cap = new Map(one.r.party.map(p => [p.key, p.hpMax]));
    let ends = 0;
    for (const ev of one.r.timeline) {
        if (ev.hpMax !== undefined && CARRY.includes(ev.e) && cap.has(ev.u)) { cap.set(ev.u, ev.hpMax); if (ev.e === 'buffEnd') ends++; }
        // `d` 가 있으면 `dhp` 는 그쪽 몫이다(hit 의 피격자 · heal 의 대상) · 없으면 `u` 의 것(refit · regen · 창)
        const pairs = ev.d !== undefined ? [[ev.d, ev.dhp], [ev.u, ev.ahp]] : [[ev.u, ev.dhp], [ev.u, ev.ahp]];
        for (const [k, hp] of pairs) {
            if (hp === undefined || !cap.has(k)) continue;
            if (hp > cap.get(k) + 1e-9) fail(`t=${ev.t} ${ev.e} ${k} — hp ${hp} > 재생기가 아는 최대 ${cap.get(k)} (관전 카드의 118 / 103)`);
        }
    }
    if (!ends) fail('hp_max_pct 창이 닫히며 hpMax 를 실은 buffEnd 가 하나도 없다 — 최대치가 안 내려간다');
    return `seed ${one.seed} 시전 ${ups.length}(창 연 것 ${opened}) · 최대치 되돌린 buffEnd ${ends}개 · 넘침 없음`;
});
/*
 * **적의 오오라** [2026-09-11 · R79] — 몬스터가 스킬 칸을 갖게 되어 기사 무기를 낀 정예(무기 칸)나 기사 고유(`kni_defiance` 등)가
 *   오오라를 들게 됐다. 오오라는 **쿨 없이 상시이고 행동을 안 먹는다**(skill_design §1-5) — 파티만 칸에서 빼 창으로 걸던 것을
 *   적도 라운드마다 같은 규칙으로 건다. 안 빼면 쿨 0 액티브가 되어 **매 차례 시전만 반복**한다(일부러 깨뜨린 검증에서 드러난 결함).
 */
check('battle: 적의 오오라는 시전되지 않는다 — 라운드 시작에 창으로 걸린다 (skill_design §1-5 · R79)', () => {
    const auras = new Set(SYS.skill.list.filter(d => d.cast === 'aura').map(d => d.id));
    // 오오라를 드는 몬스터가 실재해야 이 단정이 뜻을 갖는다
    const holders = Object.values(D.monsters).filter(m => auras.has(m.innate_skill));
    if (!holders.length) fail('오오라를 고유로 든 몬스터가 없다 — 이 단정이 아무것도 안 잰다');
    const strong = () => units().map(u => ({ uid: u.uid, combat: { ...u.combat, hp_max: 100000, attack_type: 'physical', atk_magic: undefined,
        atk_physical: scaleRange(u.combat.atk_physical ?? u.combat.atk_magic, 16) } }));
    let enemyCasts = 0, runs = 0;
    for (const st of D.stageList) {
        if (isBossOnly(st)) continue;
        for (let seed = 1; seed <= 3; seed++) {
            const r = SYS.battle.simulate(strong(), st.stage_id, makeRng(seed));
            runs++;
            for (const ev of r.timeline) {
                if (ev.e !== 'skill' || !ev.u.startsWith('e')) continue;
                enemyCasts++;
                if (auras.has(ev.s)) fail(`${st.stage_id} seed ${seed} 적 ${ev.u} 이 오오라 ${ev.s} 를 시전했다 — 칸에서 안 뺐다`);
            }
        }
    }
    return `${runs}판 · 적 시전 ${enemyCasts}건 · 오오라 시전 0 · 고유 보유 ${holders.map(m => m.monster_idx).join(',')}`;
});
/*
 * **오오라가 관전에 보인다** [2026-09-15 · R98 · INTERFACE §2-6 · ADR-0127] — 전투는 그대로 두고 **표시값과 이벤트만** 더했다:
 *   칸 표시(`party[]` · `round` 적 · `refit` 의 `actives`/`ready`)는 오오라를 빼기 전 칸 순서 · 켜진 오오라 `0` · 안 켜진 오오라 `null`,
 *   오오라 창은 `round` 바로 뒤의 `buff`(`until: null` · 시전 없이 · 받는 유닛마다).
 */
check('battle: 오오라는 제 칸에 서고 창은 round 바로 뒤 buff 로 선다 — 켜진 오오라 ready 0 · 안 켜진 오오라 null · until null · 적도 같다 (INTERFACE §2-6 · R98)', () => {
    const on = SYS.skill.defs.kni_might, off = SYS.skill.defs.kni_fanaticism;
    const onX = skillLine(on.id);                      // 창의 능력치 · 값 — 걸린 효과 (2026-09-22)
    const hit = SYS.skill.list.find(d => d.effects[0].effect === 'hit' && d.ownerKind === 'job' && d.ownerId === 'knight');
    // p0 = 공격 · 오오라 둘 — 켜지는 것은 칸 순서 첫 오오라(on)뿐이다
    const kit = [{ id: hit.id, source: 'innate' }, { id: on.id, source: 'weapon_group' }, { id: off.id, source: 'advance' }];
    const r = SYS.battle.simulate(godUnits().map((u, i) => i === 0 ? { ...u, actives: kit } : u), 101, makeRng(3));
    const p0 = r.party[0];
    if (!eq(p0.actives, kit.map(a => a.id))) fail(`칸 순서 [${p0.actives}] ≠ [${kit.map(a => a.id)}] — 오오라를 뺀 목록을 실었다`);
    // 공격 칸도 0 이다 — 스킬은 준비 상태로 출발한다 (R100). 켜진 오오라와 가르는 것은 null 인 안 켜진 오오라뿐이다
    if (p0.ready[0] !== 0 || p0.ready[1] !== 0 || p0.ready[2] !== null) fail(`ready ${JSON.stringify(p0.ready)} — 공격 0(R100) · 켜진 오오라 0 · 안 켜진 오오라 null 이어야`);
    const tl = r.timeline;
    if (tl.some(ev => ev.e === 'skill' && (ev.s === on.id || ev.s === off.id))) fail('오오라를 시전했다');
    const i0 = tl.findIndex(ev => ev.e === 'round');
    if (tl.slice(0, i0).some(ev => ev.e === 'buff')) fail('첫 round 앞에 buff 가 섰다 — 순서 보장 ②');
    const lead = [];
    for (let j = i0 + 1; tl[j]?.e === 'buff' && tl[j].until === null; j++) lead.push(tl[j]);
    const mine = lead.filter(ev => ev.u.startsWith('p') && ev.s === on.id);
    const keys = r.party.map(p => p.key);
    if (!eq(mine.map(ev => ev.u), keys)) fail(`${on.id} 창 [${mine.map(ev => ev.u)}] ≠ 파티 [${keys}] — 첫 round 바로 뒤여야`);
    if (mine.some(ev => ev.stat !== onX.stat || ev.v !== onX.value)) fail(`창 ${JSON.stringify(mine[0])} — stat ${onX.stat} · v ${onX.value} 이어야`);
    if (tl.some(ev => ev.e === 'buff' && ev.s === off.id)) fail('안 켜진 오오라가 창을 냈다');
    if (tl.filter(ev => ev.e === 'buff' && ev.until === null && ev.u.startsWith('p')).length !== keys.length) fail('파티 오오라 창이 첫 라운드 말고도 섰다');
    // 적 — 켠 오오라마다 그 라운드 round 바로 뒤에 시전자의 창이 선다
    let enemy = 0;
    for (const st of D.stageList) {
        if (isBossOnly(st)) continue;
        const rr = SYS.battle.simulate(godUnits(), st.stage_id, makeRng(1));
        rr.timeline.forEach((ev, i) => {
            if (ev.e !== 'round') return;
            const after = [];
            for (let j = i + 1; rr.timeline[j]?.e === 'buff' && rr.timeline[j].until === null; j++) after.push(rr.timeline[j]);
            for (const e of ev.enemies) {
                // 켜진 오오라 = 칸 순서 첫 오오라 · 준비 0. 첫 라운드는 공격 칸도 준비 0(라운드 시작 0초 · R100)이라 준비 값으로는 못 가른다
                const k = (e.actives ?? []).findIndex(id => SYS.skill.defs[id].cast === 'aura');
                if (k < 0) continue;
                if (e.ready[k] !== 0) fail(`${st.stage_id} ${e.key} — 켜진 오오라 ${e.actives[k]} 의 준비 ${e.ready[k]} ≠ 0`);
                if (!after.some(b => b.u === e.key && b.s === e.actives[k])) fail(`${st.stage_id} 라운드 ${ev.n} ${e.key} — 켜진 오오라 ${e.actives[k]} 의 창이 round 바로 뒤에 없다`);
                enemy++;
            }
        });
    }
    if (!enemy) fail('오오라를 켠 적이 없다 — 적 쪽 표본 없음');
    return `p0 ready [${p0.ready}] · 파티 창 ${mine.length} · 적 오오라 ${enemy}`;
});
check('createRun: 갈아입기로 오오라가 바뀌면 다음 round 바로 뒤에 옛 창을 닫고(buffEnd) 새 창을 연다(buff) — refit 의 오오라 칸도 같은 규칙 (INTERFACE §2-6 · R98)', () => {
    const was = SYS.skill.defs.kni_might, now = SYS.skill.defs.kni_defiance;
    const withAura = id => godUnits().map((u, i) => i === 0 ? { ...u, actives: [{ id, source: 'innate' }] } : u);
    for (let seed = 1; seed <= 20; seed++) {
        const run = SYS.battle.createRun(withAura(was.id), 101, makeRng(seed));
        if (run.next().ended) continue;
        run.next(withAura(now.id));
        const tl = run.result.timeline;
        const fi = tl.findIndex(ev => ev.e === 'refit' && ev.u === 'p0');
        if (fi < 0) fail(`seed ${seed} — 오오라를 갈았는데 refit 이 없다`);
        if (!eq(tl[fi].actives, [now.id]) || tl[fi].ready[0] !== 0) fail(`refit 칸 [${tl[fi].actives}] · ready [${tl[fi].ready}] — [${now.id}] · [0] 이어야`);
        const ri = tl.findIndex((ev, i) => i > fi && ev.e === 'round');
        const lead = [];
        for (let j = ri + 1; tl[j]?.e === 'buffEnd' || (tl[j]?.e === 'buff' && tl[j].until === null); j++) lead.push(tl[j]);
        const keys = run.result.party.map(p => p.key);
        const mine = ev => ev.u.startsWith('p');
        const ends = lead.filter(ev => mine(ev) && ev.e === 'buffEnd' && ev.s === was.id).map(ev => ev.u);
        const opens = lead.filter(ev => mine(ev) && ev.e === 'buff' && ev.s === now.id).map(ev => ev.u);
        if (!eq(ends, keys)) fail(`seed ${seed} 닫힌 ${was.id} [${ends}] ≠ 파티 [${keys}]`);
        if (!eq(opens, keys)) fail(`seed ${seed} 열린 ${now.id} [${opens}] ≠ 파티 [${keys}]`);
        if (lead.findIndex(ev => ev.e === 'buff') < lead.findLastIndex(ev => ev.e === 'buffEnd')) fail(`seed ${seed} — 다시 건 buff 가 닫는 buffEnd 보다 앞섰다`);
        return `seed ${seed} · round 뒤 ${was.id} 닫힘 ${ends.length} → ${now.id} 열림 ${opens.length}`;
    }
    return fail('첫 라운드를 넘긴 판이 없다 (시드 1~20)');
});
check('battle: result.party[].stats — 정산 경로가 기본 능력치를 싣고 전투 시작 시점의 복사본이다 (INTERFACE §2-6 · R72)', () => {
    const G2 = newGameP(42, cands, NOW);
    const snap = Object.fromEntries(SYS.game.partyOf(G2).map(uid => [uid, { ...SYS.game.heroById(G2, uid).stats }]));
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(r.err);
    for (const p of r.result.party) {
        if (!p.stats) fail(`${p.uid} 에 stats 가 없다 — partyUnits 가 능력치를 안 실었다`);
        if (!eq(p.stats, snap[p.uid])) fail(`${p.uid} stats ${JSON.stringify(p.stats)} ≠ 출발 시점 ${JSON.stringify(snap[p.uid])}`);
        if (p.stats === SYS.game.heroById(G2, p.uid).stats) fail('복사본이 아니라 영웅 객체를 그대로 물었다');
    }
    // 몬스터 유닛도 stats 를 든다 [2026-09-11 · R79] — monster.csv 의 7컬럼. null 은 소환만이다
    const ms = SYS.battle.makeEnemy('e0', 1401, 'normal', 1).stats;
    if (!ms || Object.keys(ms).length !== 7) fail(`몬스터 유닛의 stats ${JSON.stringify(ms)} — 7축이 아니다`);
    // 능력치 없는 조립(units())도 돈다 — stats null 은 계수 0 이다
    if (SYS.battle.simulate(units(), 101, makeRng(5)).party.some(p => p.stats !== null)) fail('stats 를 안 넘겼는데 결과에 능력치가 있다');
    return `${r.result.party.length}명 · ${Object.keys(snap[r.result.party[0].uid]).join('/')}`;
});
/**
 * 기여 집계 — 영웅별 가한/받은 피해와 처치 수 (SCREEN_DESIGN §4-3 · ADR-0063 · R68).
 * **타임라인이 정답지다** — 재생기가 이벤트를 더해 그리는 누적 데미지 판(§4-2)과 같은 값이어야
 * 관전과 리포트가 서로 다른 말을 하지 않는다. `hit`(직격)과 `reflect`(반사) 둘을 판정 쪽/맞은 쪽으로 갈라 더한다.
 */
check('battle: contrib 이 타임라인과 같은 값을 낸다 — 파티 전원 · 가한/받은/처치 (R68)', () => {
    const G2 = newGameP(777, cands, NOW);
    const r = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r.ok) fail(`resolveBattle ${r.err}`);
    const res = r.result, c = res.contrib;
    if (!Array.isArray(c)) fail('결과에 contrib 이 없다');
    // 파티 전원이 자리를 갖는다 — 0 이어도 줄이 서야 「안 나갔다」와 「못 때렸다」가 갈린다
    if (c.length !== SYS.game.partyOf(G2).length || SYS.game.partyOf(G2).some(uid => !c.some(x => x.uid === uid)))
        fail(`파티 전원이 안 들어 있다 — ${c.length} / ${SYS.game.partyOf(G2).length}`);
    // 소환물(`s0` 대역)은 uid 가 없으므로 애초에 자리가 없다
    const keyOf = {};                                    // 유닛 키 → 파티 uid
    for (const p of res.party) keyOf[p.key] = p.uid;
    const dealt = {}, taken = {};
    const add = (o, uid, v) => { if (uid) o[uid] = (o[uid] ?? 0) + v; };
    for (const ev of res.timeline) {
        if (ev.e === 'hit') { add(dealt, keyOf[ev.a], ev.dmg); add(taken, keyOf[ev.d], ev.dmg); }
        // 반사 — `a` 가 되받은 쪽이다 (battle.js 의 reflect 이벤트)
        if (ev.e === 'reflect') { add(dealt, keyOf[ev.a], ev.dmg); add(taken, keyOf[ev.d], ev.dmg); }
    }
    for (const x of c) {
        if (x.dealt !== Math.round(dealt[x.uid] ?? 0)) fail(`가한 피해가 타임라인과 다르다 (${x.uid}: ${x.dealt} ≠ ${Math.round(dealt[x.uid] ?? 0)})`);
        if (x.taken !== Math.round(taken[x.uid] ?? 0)) fail(`받은 피해가 타임라인과 다르다 (${x.uid}: ${x.taken} ≠ ${Math.round(taken[x.uid] ?? 0)})`);
    }
    // 처치 합 = 쓰러뜨린 몬스터 수 — **진 라운드의 처치도 든다**(사실의 기록 · `rounds[].killed` 와 같다).
    //   보상 칸 `kills` 는 **이긴 라운드의 몫만** 센다(R89) — 그래서 그쪽은 기여 처치를 넘지 못하고, 런을 이겼을 때만 같다.
    //   ~~`kills` 와 정확히 같다~~ 는 R89 이전 전제였다 — R90 로 수열이 밀려 이 시드의 마지막 라운드가 지면서 드러났다
    const kills = c.reduce((a, x) => a + x.kills, 0);
    const slain = res.rounds.reduce((a, rd) => a + (rd.killed?.length ?? 0), 0);
    if (kills !== slain) fail(`처치 합이 다르다 — contrib ${kills} · 라운드 처치 ${slain}`);
    const banked = Object.values(res.kills).reduce((a, b) => a + b, 0);
    if (banked > kills || (res.won && banked !== kills)) fail(`보상 처치 ${banked} 가 기여 처치 ${kills} 와 안 맞는다 (won ${res.won})`);
    if (!eq(r.report.contrib, res.contrib)) fail('리포트가 결과의 기여를 그대로 안 실었다');
    return `${c.length}명 · 가한 합 ${c.reduce((a, x) => a + x.dealt, 0)} · 처치 ${kills}`;
});
check('resolveBattle: 잠긴 스테이지는 출발 불가 · 편성을 막는 상태 검사는 없다 (2026-09-03)', () => {
    const G2 = newGameP(42, cands, NOW);
    if (SYS.game.resolveBattle(G2, 102, NOW).err !== 'locked') fail('locked');
    if (!SYS.game.resolveBattle(G2, 101, NOW).ok) fail('출발이 막혔다');
    return 'locked 만 남았다';
});
check('「출정 아웃」 폐기: 이어지는 반복 런에도 전원이 나간다 (base_expedition §1-1 개정 2026-09-08)', () => {
    const G2 = newGameP(42, cands, NOW);
    const r1 = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r1.ok) fail(r1.err);
    if (r1.report.party.length !== SYS.game.partyOf(G2).length) fail('첫 런부터 인원이 빠졌다');
    // 옛 규칙이 되살아나면 여기서 걸린다 — 아웃을 심을 칸 자체가 없어야 한다
    if (G2.runs[0].downed !== undefined) fail('run.downed 가 살아 있다 — 아웃이 런을 넘는다');
    G2.runs[0].repeat = true;
    const r2 = SYS.game.resolveBattle(G2, 101, NOW + 1000);
    if (!r2.ok) fail(r2.err);
    if (r2.report.party.length !== SYS.game.partyOf(G2).length) fail('반복 런에서 인원이 빠졌다');
    if (r2.report.outTotal !== undefined) fail('리포트에 출정 누적 아웃이 남아 있다');
    return `반복 런 참가 ${r2.report.party.length}인 (전원)`;
});
check('「출정 아웃」 폐기: 쓰러진 영웅도 다음 런에서 XP 를 받는다', () => {
    const G2 = newGameP(42, cands, NOW);
    const r1 = SYS.game.resolveBattle(G2, 101, NOW);
    if (!r1.ok) fail(r1.err);
    if (r1.report.downed.length === 0) return '이 시드는 아무도 안 쓰러졌다 — 참가 인원만 확인';
    const victim = r1.report.downed[0];
    const xpBefore = SYS.game.heroById(G2, victim).xp;
    G2.runs[0].repeat = true;
    const r2 = SYS.game.resolveBattle(G2, 101, NOW + 1000);
    if (!r2.ok) fail(r2.err);
    if (!r2.report.party.includes(victim)) fail('직전 런에 쓰러진 영웅이 다음 런에 안 나갔다');
    if (SYS.game.heroById(G2, victim).xp === xpBefore) fail('나갔는데 XP 를 못 받았다');
    return `직전 런 전투불능 ${r1.report.downed.length}인이 전부 복귀`;
});
check('closeRun: 반복만 끈다 — 회복시킬 아웃이 없다 (2026-09-08 개정)', () => {
    const G2 = newGameP(42, cands, NOW);
    SYS.game.resolveBattle(G2, 101, NOW);
    G2.runs[0].repeat = true;
    SYS.game.closeRun(G2, NOW + 60000);
    if (G2.runs[0].repeat !== false) fail('반복이 안 꺼졌다');
    if (G2.notice?.kind !== 'runClosed') fail('알림이 안 남았다');
    return '반복 off · 알림 runClosed';
});
check('삭제된 export 셋은 다시 생기지 않는다 — isOut · activeParty · returnToTown (R54)', () => {
    const gone = ['isOut', 'activeParty', 'returnToTown'].filter(k => typeof SYS.game[k] === 'function');
    if (gone.length) fail(`「출정 아웃」과 함께 지운 export 가 되살아났다: ${gone.join(' · ')}`);
    return '셋 다 없다';
});
check('toggleParty: 상한을 넘지 못한다 (편성을 막는 상태 검사는 2026-09-03 폐기)', () => {
    const G2 = newGameP(42, cands, NOW);
    const uid = SYS.game.partyOf(G2)[0];
    SYS.game.toggleParty(G2, uid, NOW);
    if (SYS.game.partyOf(G2).includes(uid)) fail('remove');
    if (!SYS.game.toggleParty(G2, uid, NOW).ok) fail('add back');
    const extra = SYS.game.tavernCandidates(G2)[0];
    G2.counters.hero++; extra.uid = 'hx'; G2.heroes.push(extra);
    return SYS.game.toggleParty(G2, 'hx', NOW).err === 'full';
});

// 리더 = party[0] = **제일 먼저 넣은 영웅**. 화면이 그 자리에 리더 표시를 붙이므로(SCREEN_DESIGN §4-1)
// 넣고 빼는 순서가 곧 리더 결정이다 — 로스터 순서로 다시 줄 세우면 안 된다 (2026-08-28)
check('toggleParty: 파티 순서 = 넣은 순서 · party[0] 이 리더', () => {
    const G2 = newGameP(42, cands, NOW);
    const [a, b, c] = G2.heroes.map(h => h.uid);
    for (const u of [...SYS.game.partyOf(G2)]) SYS.game.toggleParty(G2, u, NOW);       // 비운다
    if (SYS.game.partyOf(G2).length !== 0) fail('clear');
    for (const u of [c, a, b]) SYS.game.toggleParty(G2, u, NOW);           // 로스터 순서와 일부러 다르게 넣는다
    if (!eq(SYS.game.partyOf(G2), [c, a, b])) fail(`order ${SYS.game.partyOf(G2).join(',')}`);
    SYS.game.toggleParty(G2, c, NOW);                                      // 리더를 빼면 다음 사람이 리더가 된다
    if (SYS.game.partyOf(G2)[0] !== a) fail(`leader after remove ${SYS.game.partyOf(G2)[0]}`);
    SYS.game.toggleParty(G2, c, NOW);                                      // 다시 넣으면 맨 뒤
    return eq(SYS.game.partyOf(G2), [a, b, c]) || fail(`re-add ${SYS.game.partyOf(G2).join(',')}`);
});

/* ── 도감 — 처치 수 모델 (monster_design §8 · 2026-09-21 카드 → 처치 수) ── */
check('codex: 레벨 = 누적 처치 문턱(codex_level.csv:kills_total — 오름차순) · 최종 레벨에서 멈춘다', () => {
    const cum = D.codexLevels;                        // **누적 문턱 그대로** — 레벨당 증분(옛 cards_to_next)이 아니다
    for (let i = 1; i < cum.length; i++) if (!(cum[i] > cum[i - 1])) fail(`문턱이 오름차순이 아니다 ${cum.join('/')}`);
    if (SYS.game.codexLevel(0) !== 0) fail('lv0');
    for (let i = 0; i < cum.length; i++) {
        if (SYS.game.codexLevel(cum[i] - 1) !== i) fail(`below ${cum[i]}`);
        if (SYS.game.codexLevel(cum[i]) !== i + 1) fail(`at ${cum[i]}`);
        if (SYS.game.codexNext(cum[i] - 1) !== cum[i]) fail(`next ${i}`);
    }
    if (SYS.game.codexLevel(cum[cum.length - 1] * 10) !== cum.length) fail('max');
    if (SYS.game.codexNext(cum[cum.length - 1]) !== null) fail('next at max');
    if (SYS.game.codexMaxLevel() !== D.codexLevels.length) fail('maxLevel');
    return `thresholds ${cum.join('/')}`;
});
check('codex: 보너스는 처치 수 레벨에서(계열 = 스테이지 번호) · 옛 세이브의 codexCards 는 로드가 지운다', () => {
    const G2 = newGameP(42, cands, NOW);
    const top = D.codexLevels[D.codexLevels.length - 1];
    G2.codexKills[1201] = D.codexLevels[0] - 1;       // 첫 문턱 바로 밑 — 레벨 0
    if (SYS.game.codexBonus(G2).hp_pct !== 0) fail('문턱 밑인데 보정이 붙었다');
    G2.codexKills[1201] = top;                        // 2스테이지 몬스터 → 체력 계열 · 최종 레벨
    const b = SYS.game.codexBonus(G2);
    if (b.hp_pct !== SYS.game.codexBonusAt(SYS.game.codexMaxLevel()) || b.atk_pct !== 0) fail(`bonus ${JSON.stringify(b)}`);
    // 옛 세이브 — 카드가 있어도 레벨은 처치 수가 정하고 필드는 사라진다 (INTERFACE §4 · 버전 무변경)
    const old = JSON.parse(JSON.stringify(SYS.game.serialize(G2, NOW)));
    old.codexCards = { 1101: 999 };
    const back = SYS.game.deserialize(old);
    if ('codexCards' in back) fail('로드가 codexCards 를 안 지웠다');
    if (SYS.game.codexBonus(back).atk_pct !== 0) fail('옛 카드가 1스테이지 보정을 올렸다');
    const withCodex = SYS.game.heroCombat(G2, G2.heroes[0]).hp_max;
    G2.codexKills = {};
    const without = SYS.game.heroCombat(G2, G2.heroes[0]).hp_max;
    return withCodex > without ? `hp ${without} → ${withCodex}` : fail(`codex bonus not applied (${without} → ${withCodex})`);
});

/* ── 런 마무리 — 반복 원정은 게임이 켜져 있는 동안만 (08-25) ── */
check('closeRun: 반복 켠 채 껐다 켜면 반복이 꺼지고 알림만 남는다 — 추가 전투·자원 변화 없음', () => {
    const G2 = newGameP(42, cands, NOW);
    SYS.game.resolveBattle(G2, 101, NOW);
    G2.runs[0].repeat = true;
    const snap = JSON.stringify({ r: G2.resources, b: G2.counters.battle, bag: G2.bag, rep: G2.lastReport });
    const n = SYS.game.closeRun(G2, NOW + 8 * 3_600_000);
    if (!n || n.kind !== 'runClosed' || n.stageId !== 101) fail(`notice ${JSON.stringify(n)}`);
    if (G2.runs[0].repeat !== false) fail('repeat still on');
    if (JSON.stringify({ r: G2.resources, b: G2.counters.battle, bag: G2.bag, rep: G2.lastReport }) !== snap) fail('state changed offline');
    SYS.game.dismissNotice(G2);
    return G2.notice === null;
});
check('closeRun: 반복이 꺼져 있으면 아무것도 안 한다', () => {
    const G2 = newGameP(42, cands, NOW);
    SYS.game.resolveBattle(G2, 101, NOW);
    return SYS.game.closeRun(G2, NOW + 3_600_000) === null && G2.notice === null;
});

/* ── 원정 — 라운드 단위 [2026-09-14 · R89 · base_expedition_design §1-5 · INTERFACE §2-6 createRun · §2-7 departRun/advanceRun] ──
   보상은 라운드를 이긴 순간 들어오고, 원정은 재생 시각까지만 걸음으로 계산되며(원정 중 교체는 그 순간 · R130), 원정 중에 편성을 바꿔도 도는 원정은 나간 인원 그대로이고(R92), 끊긴 라운드는 없던 것이다.
   전투 쪽(`createRun`)과 상태 쪽(`departRun` · `advanceRun` · `retreatRun` · `closeRun`)을 따로 본다 — 앞은 규칙, 뒤는 정산 */
const tenth = v => Math.round(v * 10) / 10;       // battle.js r1 과 같은 자릿수
const sortedJson = o => JSON.stringify(Object.entries(o).sort());

check('createRun: 라운드마다 「그 순간의 파티」를 다시 넘겨도 바뀐 것이 없으면 simulate 와 한 글자도 안 다르다 (R89 · INTERFACE §8 항목 18)', () => {
    let rounds = 0;
    for (const [mk, stage] of [[skillUnits, 101], [skillUnits, 103], [godUnits, 104]]) {
        for (let seed = 1; seed <= 5; seed++) {
            const want = SYS.battle.simulate(mk(), stage, makeRng(seed));
            const bare = SYS.battle.createRun(mk(), stage, makeRng(seed));
            while (bare.next()?.ended === false);
            if (!eq(bare.result, want)) fail(`${stage} seed ${seed} — 인자 없이 이어 부른 결과가 simulate 와 다르다`);
            // 매 라운드 **새로 만든** 같은 파티 — state.advanceRun 이 언제나 이 길로 부른다(같으면 갈아입지 않아야 한다)
            const run = SYS.battle.createRun(mk(), stage, makeRng(seed));
            let s = run.next(); rounds++;
            while (s && !s.ended) { s = run.next(mk()); rounds++; }
            if (!eq(run.result, want)) fail(`${stage} seed ${seed} — 같은 파티를 다시 넘겼는데 결과가 갈렸다 (refit ${run.result.timeline.filter(ev => ev.e === 'refit').length})`);
        }
    }
    return `3 조합 × 시드 5 · 라운드 ${rounds}`;
});

check('createRun: 보상은 이긴 라운드만 — 진 라운드의 처치 · 카드 · 드롭 · 골드 · XP 는 버린다 · 이긴 라운드 합 = 결과 (R89 D1)', () => {
    let lost = 0, thrown = 0, won = 0;
    const plus = (a, b) => { for (const [k, n] of Object.entries(b)) a[k] = (a[k] ?? 0) + n; return a; };
    for (const [mk, stage] of [[units, 101], [units, 102], [units, 103], [godUnits, 101]]) {
        for (let seed = 1; seed <= 12; seed++) {
            const run = SYS.battle.createRun(mk(), stage, makeRng(seed));
            const sum = { xp: 0, gold: 0, kills: {}, drops: [] }, clearedN = new Set();
            for (let s = run.next(); s; s = s.ended ? null : run.next()) {
                if (s.cleared) {
                    clearedN.add(s.n);
                    sum.xp += s.xp; sum.gold += s.gold; plus(sum.kills, s.kills); sum.drops.push(...s.drops);
                    continue;
                }
                lost++;
                if (s.xp || s.gold || s.drops.length || Object.keys(s.kills).length)
                    fail(`${stage} seed ${seed} 라운드 ${s.n} — 진 라운드인데 몫이 있다 ${JSON.stringify({ xp: s.xp, gold: s.gold, drops: s.drops.length, kills: s.kills })}`);
            }
            const r = run.result;
            if (sum.xp !== r.xpTotal || sum.gold !== r.gold || !eq(sum.drops, r.drops) || sortedJson(sum.kills) !== sortedJson(r.kills))
                fail(`${stage} seed ${seed} — 이긴 라운드 합 ≠ 결과 (xp ${sum.xp}/${r.xpTotal} · gold ${sum.gold}/${r.gold} · drops ${sum.drops.length}/${r.drops.length})`);
            // 처치 순간의 사실(적의 down)과 대조 — 이긴 라운드의 몬스터 쓰러짐 = 처치 · 진 라운드의 쓰러짐은 버렸다 (소환 벽 키는 `s` 로 시작한다)
            let n = 0;
            const downs = {};
            // **키로 센다** — 불러내기로 되살아난 적(2026-09-18)이 다시 쓰러진 것은 처치가 아니다(보상은 한 마리당 한 번)
            for (const ev of r.timeline) { if (ev.e === 'round') n = ev.n; else if (ev.e === 'down' && ev.u.startsWith('e')) (downs[n] ??= new Set()).add(ev.u); }
            const kept = Object.entries(downs).filter(([k]) => clearedN.has(+k)).reduce((x, [, v]) => x + v.size, 0);
            const killed = Object.values(r.kills).reduce((x, y) => x + y, 0);
            if (kept !== killed) fail(`${stage} seed ${seed} — 이긴 라운드의 몬스터 쓰러짐 ${kept} ≠ 처치 ${killed}`);
            thrown += Object.entries(downs).filter(([k]) => !clearedN.has(+k)).reduce((x, [, v]) => x + v.size, 0);
            if (r.won) won++;
        }
    }
    if (!lost) fail('진 라운드가 하나도 없다 — 표본 없음');
    if (!thrown) fail('진 라운드에서 쓰러진 몬스터가 없다 — 「버린다」를 한 번도 못 봤다');
    if (!won) fail('클리어한 런이 없다 — 마지막 라운드를 이긴 쪽 표본 없음');
    return `진 라운드 ${lost} · 버린 처치 ${thrown} · 클리어 런 ${won}`;
});

check('createRun: 스킬은 준비 상태로 출발한다 — 파티는 0초 · 적은 등장 라운드 시작 · 쿨 한 바퀴가 돌기 전에 첫 시전이 나온다 (R100 · battle_design §6)', () => {
    let party = 0, enemy = 0, casts = 0, early = 0;
    for (let seed = 1; seed <= 4; seed++) {
        const us = skillUnits();
        const r = SYS.battle.simulate(us, 103, makeRng(seed));
        const firstCast = (key, id, from, to) => r.timeline.find((ev, i) => i >= from && i < to && ev.e === 'skill' && ev.u === key && ev.s === id);
        r.party.forEach((p, i) => p.actives.forEach((id, j) => {
            // 오오라 칸은 쿨이 없다 — 켜진 것 0 · 안 켜진 것 null (R98 · 「오오라는 제 칸에 서고」 단정)
            if (SYS.skill.defs[id].cast === 'aura') { if (p.ready[j] !== 0 && p.ready[j] !== null) fail(`seed ${seed} ${p.key} 오오라 ${id} — 준비 ${p.ready[j]}`); return; }
            if (p.ready[j] !== 0) fail(`seed ${seed} ${p.key} ${id} — 첫 준비 ${p.ready[j]} ≠ 0초`);
            party++;
            const c = firstCast(p.key, id, 0, r.timeline.length);
            if (!c) return;
            casts++;
            // 옛 규칙(쿨부터 돈다 · R89)이면 나올 수 없는 시각 — 쿨 한 바퀴가 돌기 전의 첫 시전
            if (c.t < cooldownSec(B, { cdr: us[i].combat.cooldown_reduction ?? 0 }, SYS.skill.defs[id]) - 0.05) early++;
        }));
        const starts = r.timeline.flatMap((ev, i) => ev.e === 'round' ? [i] : []);
        starts.forEach((i, k) => {
            const ev = r.timeline[i], to = starts[k + 1] ?? r.timeline.length;
            for (const e of ev.enemies) (e.actives ?? []).forEach((id, j) => {
                if (SYS.skill.defs[id].cast === 'aura') { if (e.ready[j] !== 0 && e.ready[j] !== null) fail(`seed ${seed} 라운드 ${ev.n} ${e.key} 오오라 ${id} — 준비 ${e.ready[j]}`); return; }
                if (Math.abs(e.ready[j] - ev.t) > 0.05) fail(`seed ${seed} 라운드 ${ev.n} ${e.key} ${id} — 첫 준비 ${e.ready[j]} ≠ 등장 라운드 시작 ${ev.t}`);
                enemy++;
                const c = firstCast(e.key, id, i, to);
                if (!c) return;
                casts++;
                // 적의 쿨감소는 이벤트에 없다 — 바닥(skill_cd_floor_mult) 배수보다 먼저 썼으면 확실히 한 바퀴 전이다
                if (c.t - ev.t < (SYS.skill.defs[id].cool ?? 0) * B.skill_cd_floor_mult - 0.05) early++;
            });
        });
    }
    if (!party || !enemy || !casts || !early) fail(`표본 부족 — 파티 칸 ${party} · 적 칸 ${enemy} · 시전 ${casts} · 쿨 한 바퀴 전 시전 ${early}`);
    return `파티 칸 ${party} · 적 칸 ${enemy} · 첫 시전 ${casts} · 쿨 한 바퀴 전 ${early}`;
});

check('createRun: 갈아입기 — 라운드 도중 그 시각에 먹는다 · 현재 HP 는 비율 · 남은 스킬은 칸마다 쿨 그대로 · 새 스킬은 그 순간부터 한 바퀴 · 보스 라운드 도중은 거절 (R89 · R130 · base_expedition_design §1-5 · INTERFACE §2-6)', () => {
    // 그 유닛의 지금 HP · 최대치 — 타임라인에서 싣는 마지막 사건 (재생기가 읽는 것과 같은 길 · INTERFACE §6)
    const hpNow = (tl, k) => {
        for (let i = tl.length - 1; i >= 0; i--) {
            const ev = tl[i];
            if (ev.e === 'reflect') { if (ev.d === k) return ev.ahp; continue; }
            if ((ev.d === k || ev.u === k) && ev.dhp != null) return ev.dhp;
            if (ev.a === k && ev.ahp != null) return ev.ahp;
        }
        return null;
    };
    const maxNow = (run, k) => {
        const tl = run.result.timeline;
        for (let i = tl.length - 1; i >= 0; i--) if (tl[i].u === k && tl[i].hpMax != null) return tl[i].hpMax;
        return run.result.party.find(p => p.key === k).hpMax;
    };
    const withHp = (list, i, mult) => list.map((u, k) => k === i ? { ...u, combat: { ...u.combat, hp_max: Math.round(u.combat.hp_max * mult) } } : u);
    const lastRefit = (run, k) => run.result.timeline.findLast(ev => ev.e === 'refit' && ev.u === k);

    // ① 라운드 도중 · 그 시각 · HP 비율 — 맞아서 깎인 채(80% 밑) 라운드가 이어지는 순간에 최대치를 반으로 줄였다 되돌린다.
    //   옛 규칙(현재 HP 유지 · 새 최대치로 자름)이면 반으로 줄일 때 잘린 HP 가 돌아오지 않는다 — 비율이면 거의 제자리다
    const base = () => units();                          // 시작 파티 — 맞아서 깎인 채 라운드가 이어진다(이길 수 있는 파티는 한 방에 끝낸다)
    let one = null;
    for (let seed = 1; seed <= 30 && !one; seed++) {
        const run = SYS.battle.createRun(base(), 101, makeRng(seed));
        run.advance(0);
        for (let T = 0.5; T < 300 && !one; T += 0.5) {
            while (run.advance(T) && !run.ended);            // 라운드가 끝나면 같은 시각으로 다음 라운드를 연다
            if (run.ended) break;
            const hp0 = hpNow(run.result.timeline, 'p0'), max0 = maxNow(run, 'p0');
            if (hp0 == null || !(hp0 > 0 && hp0 < max0 * 0.8)) continue;
            const st = run.status();
            if (!st.inRound || st.kind === 'boss') continue;
            const r1 = run.refit(withHp(base(), 0, 0.5));
            if (r1.locked || !eq(r1.changed, ['p0'])) fail(`seed ${seed} — 라운드 도중 갈아입기 ${JSON.stringify(r1)}`);
            const a = lastRefit(run, 'p0');
            if (!a || a.t !== st.t) fail(`seed ${seed} — refit 시각 ${a?.t} ≠ 지금 ${st.t} (그 시각에 먹어야)`);
            const tl = run.result.timeline, lastRound = tl.findLast(ev => ev.e === 'round');
            if (tl.indexOf(lastRound) > tl.indexOf(a) || lastRound.n !== st.round) fail(`seed ${seed} — refit 이 라운드 ${st.round} 도중에 안 섰다`);
            const want1 = Math.max(1, Math.round(hp0 / max0 * a.hpMax));
            if (a.hpMax !== Math.round(max0 / 2) || a.dhp !== want1) fail(`seed ${seed} — 반으로: 최대 ${max0} → ${a.hpMax} · HP ${hp0} → ${a.dhp} (비율이면 ${want1})`);
            run.refit(base());
            const b = lastRefit(run, 'p0');
            const want2 = Math.max(1, Math.round(a.dhp / a.hpMax * b.hpMax));
            if (b === a || b.hpMax !== max0 || b.dhp !== want2) fail(`seed ${seed} — 되돌림: 최대 ${b.hpMax} · HP ${b.dhp} (비율이면 ${want2})`);
            if (Math.abs(b.dhp - hp0) > 2) fail(`seed ${seed} — 뺐다 끼웠더니 HP ${hp0} → ${b.dhp} — 비율 유지면 제자리여야`);
            one = { seed, hp0, max0, half: a.dhp, back: b.dhp, t: st.t };
        }
    }
    if (!one) fail('맞아서 80% 밑으로 깎인 채 라운드가 이어지는 순간이 없다 — ① 표본 없음 (시드 1~30)');

    // ② 스킬 — 첫 라운드를 넘긴 판에서 p0 에게 새 스킬 하나를 얹는다
    const kit = () => { const s = skillUnits(); return godUnits().map((u, i) => ({ ...u, actives: s[i].actives })); };
    let two = null;
    for (let seed = 1; seed <= 20 && !two; seed++) {
        const run = SYS.battle.createRun(kit(), 101, makeRng(seed));
        if (run.next().ended) continue;
        const tl = run.result.timeline, had = run.result.party[0];
        // 갈아입기 직전의 준비 시각 — 마지막 시전의 ready, 안 썼으면 첫 준비
        const readyNow = Object.fromEntries(had.actives.map((id, j) => {
            const last = tl.findLast(ev => ev.e === 'skill' && ev.u === 'p0' && ev.s === id);
            return [id, last ? last.ready : had.ready[j]];
        }));
        const add = Object.values(SYS.skill.defs).find(df => df.cast !== 'aura' && (df.cool ?? 0) > 0 && !had.actives.includes(df.id));
        const nextUnits = kit().map((u, i) => i === 0 ? { ...u, actives: [...u.actives, { id: add.id, source: 'advance' }] } : u);
        run.next(nextUnits);
        const fits = tl.filter(ev => ev.e === 'refit');
        if (fits.length !== 1 || fits[0].u !== 'p0') fail(`seed ${seed} — 갈아입은 영웅이 p0 하나가 아니다 [${fits.map(f => f.u).join(',')}]`);
        const ev = fits[0];
        for (const id of had.actives) {
            const j = ev.actives.indexOf(id);
            if (j < 0 || Math.abs(ev.ready[j] - readyNow[id]) > 0.05) fail(`seed ${seed} ${id} — 남은 스킬의 준비 ${readyNow[id]} → ${ev.ready[j]} (쿨이 다시 돌았다)`);
        }
        const j = ev.actives.indexOf(add.id);
        const want = tenth(ev.t + cooldownSec(B, { cdr: nextUnits[0].combat.cooldown_reduction ?? 0 }, add));
        if (j < 0 || Math.abs(ev.ready[j] - want) > 0.15) fail(`seed ${seed} 새 스킬 ${add.id} — 준비 ${ev.ready[j]} ≠ 갈아입은 시각 ${ev.t} + 쿨 = ${want}`);
        two = { seed, add: add.id, kept: had.actives.length };
    }
    if (!two) fail('첫 라운드를 넘긴 판이 없다 — ② 표본 없음');

    // ③ 칸마다 쿨 — 고유 · 무기 두 칸에 같은 스킬(칸이 둘이면 쿨도 둘 · skill.activesFor). 앞 칸을 쓴 직후 갈아입어도
    //   앞 칸은 제 쿨을 · 뒤 칸은 준비를 지킨다 — 옛 판(스킬 id 로 잇기)은 두 칸이 뒤 칸 값으로 합쳐져 앞 칸이 다시 준비됐다
    const dup = Object.values(SYS.skill.defs).find(df => df.effects[0].effect === 'hit' && df.target === 'enemy_single' && (df.cool ?? 0) > 2);
    if (!dup) fail('단일 대상 · 쿨 2초 넘는 공격 스킬이 없다 — ③ 표본 스킬 없음');
    const dupKit = (hp = 0) => godUnits().map((u, i) => ({ ...u, combat: { ...u.combat, hp_max: u.combat.hp_max + hp },
        actives: i === 0 ? [{ id: dup.id, source: 'innate' }, { id: dup.id, source: 'weapon_group' }] : [] }));
    let three = null;
    for (let seed = 1; seed <= 10 && !three; seed++) {
        const run = SYS.battle.createRun(dupKit(), 101, makeRng(seed));
        run.advance(0);
        for (let T = 0.1; T < 30 && !three; T += 0.1) {
            if (run.advance(T)) break;
            const casts = run.result.timeline.filter(ev => ev.e === 'skill' && ev.u === 'p0');
            if (!casts.length) continue;
            if (casts.length > 1) break;                      // 뒤 칸까지 이미 썼다 — 이 시드는 지나갔다
            run.refit(dupKit(1));
            const ev = lastRefit(run, 'p0');
            if (!ev || !eq(ev.actives, [dup.id, dup.id])) fail(`seed ${seed} — refit 칸 ${JSON.stringify(ev?.actives)}`);
            if (Math.abs(ev.ready[0] - casts[0].ready) > 0.05 || ev.ready[1] !== 0) fail(`seed ${seed} — 칸 준비 [${ev.ready}] — 앞 칸 ${casts[0].ready}(쓴 칸의 쿨) · 뒤 칸 0 이어야`);
            three = { seed, ready: ev.ready };
        }
    }
    if (!three) fail('같은 스킬 두 칸 중 앞 칸만 쓴 순간이 없다 — ③ 표본 없음');

    // ④ 보스 라운드 — 도중에는 거절(아무 사건도 없다) · 라운드 사이는 보스 라운드 앞이라도 받는다
    const boss = SYS.battle.createRun(godUnits(), 105, makeRng(1));
    boss.advance(0);
    const bst = boss.status();
    if (bst.kind !== 'boss' || !bst.inRound) fail(`105 첫 라운드 ${JSON.stringify(bst)} — 보스 라운드 도중이어야`);
    const lock = boss.refit(withHp(godUnits(), 0, 0.5));
    if (!lock.locked || lock.changed.length || lastRefit(boss, 'p0')) fail(`보스 라운드 도중 갈아입기 ${JSON.stringify(lock)} — 거절되고 사건이 없어야`);
    const nine = SYS.battle.createRun(godUnits(), 101, makeRng(2));
    let s8 = null;
    for (let s = nine.next(); s && !s.ended; s = nine.next()) if (s.n === 8) { s8 = s; break; }
    if (!s8?.cleared) fail('101 을 8 라운드까지 이긴 판이 없다 — ④ 표본 없음');
    if (nine.status().inRound) fail('이긴 라운드 뒤인데 라운드 도중이라고 한다');
    const gap = nine.refit(withHp(godUnits(), 0, 0.5));
    if (gap.locked || !eq(gap.changed, ['p0'])) fail(`보스 라운드 앞(라운드 사이) 갈아입기 ${JSON.stringify(gap)} — 받아야`);
    nine.advance(0);
    const tl9 = nine.result.timeline, fit = lastRefit(nine, 'p0'), r9 = tl9.findLast(ev => ev.e === 'round');
    if (r9?.n !== 9 || r9.kind !== 'boss' || tl9.indexOf(fit) > tl9.indexOf(r9)) fail('라운드 사이의 refit 이 보스 라운드의 round 앞에 서야');
    if (!nine.refit(godUnits()).locked) fail('보스 라운드가 열린 뒤의 갈아입기가 거절되지 않았다');
    return `① seed ${one.seed} ${one.t}초 HP ${one.hp0}/${one.max0} → 반 ${one.half} → 되돌림 ${one.back} ② seed ${two.seed} 남은 스킬 ${two.kept} 유지 · 새 ${two.add} ③ seed ${three.seed} 같은 스킬 두 칸 [${three.ready}] ④ 보스 도중 거절 · 사이 받음`;
});

check('createRun: 쪼개 걸어도(advance) 한 번에 돈 것과 한 글자도 안 다르다 — 교체가 없으면 끊는 자리만 다르다 (INTERFACE §8 항목 18 · R130)', () => {
    let steps = 0;
    for (const [mk, stage] of [[skillUnits, 101], [skillUnits, 103], [godUnits, 104], [godUnits, 105]]) {
        for (let seed = 1; seed <= 4; seed++) {
            const want = SYS.battle.simulate(mk(), stage, makeRng(seed));
            const run = SYS.battle.createRun(mk(), stage, makeRng(seed));
            const cut = makeRng(seed * 7919);            // 끊는 자리 — 0.05 ~ 3.05 초씩 제멋대로
            let T = 0;
            for (let guard = 0; !run.ended && guard < 100000; guard++) {
                T += 0.05 + cut() * 3;
                steps++;
                while (run.advance(T) && !run.ended);    // 라운드가 끝나면 같은 시각으로 다시 — 다음 라운드는 다음 걸음이 연다
            }
            if (!eq(run.result, want)) fail(`${stage} seed ${seed} — 쪼개 걸은 결과가 한 번에 돈 것과 다르다`);
        }
    }
    return `4 조합 × 시드 4 · 걸음 ${steps}`;
});

check('stepRun: 교체가 없으면 어디서 끊어 걸어도 resolveBattle 과 같다 — 리포트 · 가방 · 경험치 · 도감 · 자원 (INTERFACE §2-7 · R130)', () => {
    let rounds = 0;
    const snap = g => JSON.stringify({ r: g.resources, bag: g.bag, items: g.items, ck: g.codexKills,
        h: g.heroes.map(h => [h.uid, h.level, h.xp, h.masteryPoints]), rep: g.reports[0], run: g.runs[0], pot: g.potions });
    for (const seed of [1, 2, 3, 7]) {
        const A = newGameP(seed, cands, NOW), Bg = newGameP(seed, cands, NOW);
        SYS.game.resolveBattle(A, 101, NOW);
        const d = SYS.game.departRun(Bg, 101, NOW);
        const cut = makeRng(seed * 31);
        let T = 0;
        for (let guard = 0; !d.run.done && guard < 100000; guard++) { T += 0.05 + cut() * 4; rounds += SYS.game.stepRun(Bg, d.run, T).rounds ?? 0; }
        if (snap(A) !== snap(Bg)) fail(`seed ${seed} — 걸어서 간 원정이 한 번에 푼 원정과 다르다`);
    }
    return `시드 4 · 정산 ${rounds}`;
});

check('stepRun: 원정 중 교체는 다음 걸음 첫머리(= 바꾼 시각)에 먹는다 · 쓰러진 영웅은 장비 · 스킬 트리가 downed · 보스 라운드 도중은 runLock 이 boss 이고 안 갈아입는다 (base_expedition_design §1-5 · INTERFACE §2-7 · R130)', () => {
    // ① 그 시각 — 첫 라운드 도중 레벨을 올리면(장비 교체와 같은 길 — 전투 능력치가 바뀐다) 다음 걸음 첫머리에 refit 이 그 시각으로 선다
    let one = null;
    for (let seed = 1; seed <= 30 && !one; seed++) {
        const g = newGameP(seed, cands, NOW);
        const d = SYS.game.departRun(g, 101, NOW);
        SYS.game.stepRun(g, d.run, 3);
        const st = d.run.battle.status();
        const uid = d.run.party.find(u => !g.runs[0].fallen.includes(u));
        if (!st.inRound || st.round !== 1 || !uid) continue;
        const key = d.run.result.party.find(p => p.uid === uid).key;
        SYS.game.heroById(g, uid).level += 10;
        SYS.game.stepRun(g, d.run, 3.5);
        const tl = d.run.result.timeline, fit = tl.find(ev => ev.e === 'refit' && ev.u === key);
        if (!fit || fit.t !== st.t) fail(`seed ${seed} — 레벨을 올렸는데 refit ${fit?.t} — ${st.t}(바꾼 시각)에 서야`);
        if (tl.some((ev, i) => ev.e === 'round' && ev.n > 1 && i < tl.indexOf(fit))) fail(`seed ${seed} — refit 이 라운드 경계로 밀렸다`);
        one = { seed, t: fit.t };
    }
    if (!one) fail('첫 라운드가 3초 넘게 도는 원정이 없다 — ① 표본 없음 (시드 1~30)');

    // ② 쓰러진 영웅 — 장비 · 스킬 트리를 못 바꾼다(downed · 다른 검사보다 먼저). 산 영웅은 그대로 · 원정이 끝나면 풀린다
    let two = null;
    for (let seed = 1; seed <= 40 && !two; seed++) {
        const g = newGameP(seed, cands, NOW);
        const d = SYS.game.departRun(g, 101, NOW);
        for (let T = 0.5; !d.run.done && !g.runs[0].fallen.length && T < 900; T += 0.5) SYS.game.stepRun(g, d.run, T);
        if (d.run.done || !g.runs[0].fallen.length) continue;
        const uid = g.runs[0].fallen[0], h = SYS.game.heroById(g, uid);
        if (!eq(g.runs[0].fallen, d.run.result.downed)) fail(`seed ${seed} — fallen ${g.runs[0].fallen} ≠ 이 런의 쓰러짐 ${d.run.result.downed}`);
        const pos = Object.keys(h.equipped).find(k => h.equipped[k]);
        const errs = {
            equip: SYS.game.equip(g, uid, 'none').err, unequip: SYS.game.unequip(g, uid, pos).err,
            learn: SYS.game.learnMastery(g, uid, 'none').err, unlearn: SYS.game.unlearnMastery(g, uid, 'none').err, reset: SYS.game.resetMastery(g, uid).err,
        };
        for (const [k, e] of Object.entries(errs)) if (e !== 'downed') fail(`seed ${seed} 쓰러진 영웅의 ${k} — ${e} (downed 여야)`);
        const live = d.run.party.find(u => !g.runs[0].fallen.includes(u));
        if (live && SYS.game.resetMastery(g, live).err) fail(`seed ${seed} — 산 영웅의 스킬 트리가 막혔다`);
        SYS.game.retreatRun(g, d.run, NOW);
        if (SYS.game.resetMastery(g, uid).err || g.runs[0].fallen.length) fail(`seed ${seed} — 끊긴 원정 뒤에도 잠겨 있다`);
        two = { seed, n: d.run.result.downed.length };
    }
    if (!two) fail('도중에 쓰러진 영웅이 있는 원정이 없다 — ② 표본 없음 (시드 1~40)');

    // ③ 보스 라운드 — 챕터보스 스테이지(보스 1라운드)는 런 전체가 굳는다. 바꿔도 갈아입지 않고 runLock 이 boss 다
    const g3 = newGameP(3, cands, NOW);
    for (const h of g3.heroes) h.level = B.hero_level_cap;
    g3.progress.cleared.push(D.stageOrder[D.stageOrder.indexOf(105) - 1]);
    const d3 = SYS.game.departRun(g3, 105, NOW);
    if (!d3.ok) fail(`105 출발 ${d3.err}`);
    SYS.game.stepRun(g3, d3.run, 0.3);
    if (SYS.game.runLock(g3, d3.run) !== 'boss') fail(`챕터보스 라운드 도중 runLock ${SYS.game.runLock(g3, d3.run)} (boss 여야)`);
    SYS.game.heroById(g3, d3.run.party[0]).level = 1;
    SYS.game.stepRun(g3, d3.run, 0.8);
    if (d3.run.result.timeline.some(ev => ev.e === 'refit')) fail('보스 라운드 도중에 갈아입었다 — 다음 런부터여야');
    SYS.game.retreatRun(g3, d3.run, NOW);
    if (SYS.game.runLock(g3, d3.run) !== null) fail('끝난 원정의 runLock 이 null 이 아니다');
    return `① seed ${one.seed} ${one.t}초에 갈아입음 ② seed ${two.seed} 쓰러진 영웅 잠금 · 끝나면 풀림 ③ 챕터보스 도중 잠금`;
});

check('departRun: 전술은 출발 판정이 상한 — 도중 리롤 · 출발 때 꺼진 칸은 그 런에서 안 켜진다 · 교체로 조건이 깨지면 꺼지고 되찾으면 켜진다 · 다음 런은 지금 모습 (tactic_card_design §2-1 · INTERFACE §2-7 · R130)', () => {
    const g = newGameP(9, cands, NOW);
    for (const h of g.heroes) h.level = B.hero_level_cap;       // 칸이 열리게 — 로스터 합산 레벨
    g.resources.gold = 1e9;
    const party = SYS.game.partyOf(g);
    const weapons = party.map(uid => SYS.game.heroById(g, uid).equipped.weapon);
    if (weapons.some(w => !w)) fail('픽스처 — 파티 셋이 무기를 들고 있어야');
    for (const uid of party) for (const iu of Object.values(SYS.game.heroById(g, uid).equipped)) if (iu) g.items[iu].sins = [];
    for (const w of weapons) g.items[w].sins = ['wrath'];       // 분노 태그 셋 — 조건 3 을 딱 채운다
    // 열린 칸을 전부 정한다 — 1 분노 장비(켜짐) · 2 나태 장비(꺼짐) · 나머지는 출발 때 꺼진 가족. 안 정한 칸은 첫 배정이 들어가 결과가 흐려진다
    //   진형은 모두 후열 — 「전열에 ~」 조건이 저절로 켜지지 않게 (과녁은 모두 전열과 같다 — battle_design §3-1)
    const slots = { 1: { id: 'opt_gear_wrath', grade: 'common' }, 2: { id: 'opt_gear_sloth', grade: 'common' } };
    g.presets[g.preset - 1].tactics = { slots, locked: [] };
    g.presets[g.preset - 1].formation = { tpl: '0-3', ranks: [[], party.slice()] };
    const spare = SYS.tactic.familyIds.filter(id => !['opt_gear_wrath', 'opt_gear_sloth'].includes(id));
    for (let n = 3; n <= SYS.tactic.slotCount; n++) {
        // 조건은 파티 구성에 달려 있어 이름으로 못 박는다 — 이 파티로 **꺼지는** 가족을 앞에서부터 고른다
        const id = spare.find(f => { slots[n] = { id: f, grade: 'common' }; return !SYS.game.tacticState(g).slots[n - 1].active; });
        if (!id) fail(`픽스처 — ${n}번 칸에 꺼진 가족이 없다`);
        spare.splice(spare.indexOf(id), 1);
    }
    const st = SYS.game.tacticState(g);
    if (!st.slots[0].open || !st.slots[0].active || !st.slots[1].open || st.slots[1].active) fail(`출발 전 칸 — 1 ${st.slots[0].active} · 2 ${st.slots[1].active} (1 켜짐 · 2 꺼짐 · 둘 다 열림이어야)`);
    const d = SYS.game.departRun(g, 101, NOW);
    if (!eq(d.run.tactics.map(o => o.id), ['opt_gear_wrath'])) fail(`스냅숏 [${d.run.tactics.map(o => o.id)}] — 출발 때 켜진 것만`);
    let T = 0;
    const step = dt => SYS.game.stepRun(g, d.run, (T += dt));
    const refits = key => d.run.result.timeline.filter(ev => ev.e === 'refit' && (!key || ev.u === key)).length;
    step(0.5);
    // ① 도중 리롤 · 꺼진 칸의 조건 충족 — 도는 원정은 안 흔들린다(갈아입기 없음 · 태그는 전투 능력치가 아니다)
    const f0 = refits();
    g.resources.gold = 999_999;                    // 나머지 칸을 잠그고 1번만 굴린다 — 잠근 만큼 비싸다 (§5-6)
    if (!rollOnly(g, [1]).ok) fail('원정 중 리롤이 거절됐다');
    for (const uid of party) { const a = SYS.game.heroById(g, uid).equipped.armor; if (a) g.items[a].sins = ['sloth']; }
    step(0.5);
    if (refits() !== f0) fail('도중 리롤 · 출발 때 꺼진 칸의 조건 충족이 도는 원정을 갈아입혔다 — 다음 런부터여야');
    if (!eq(SYS.game.runTactics(g, d.run).map(m => [m.option.id, m.active]), [['opt_gear_wrath', true]])) fail(`도는 원정의 전술 ${JSON.stringify(SYS.game.runTactics(g, d.run))}`);
    if (d.run.done) fail('원정이 벌써 끝났다 — 시험이 헛돈다');
    // ② 깨짐 — 분노 무기 하나를 벗기면 2/3 → 꺼진다: 무기를 안 만진 영웅도 갈아입는다(보너스가 빠졌다) · 끼면 켜진다(runTacticsIf)
    const [a0, a1] = party, key1 = d.run.result.party.find(x => x.uid === a1).key;
    if (!SYS.game.unequip(g, a0, 'weapon').ok) fail('무기 벗기 거절');
    const off = SYS.game.runTactics(g, d.run)[0];
    if (off.active || off.have !== 2) fail(`벗긴 뒤 ${off.have}/${off.need} · ${off.active} — 꺼져야`);
    if (!SYS.game.runTacticsIf(g, d.run, a0, weapons[0])[0].active) fail('runTacticsIf — 그 무기를 끼면 켜져야');
    const r1 = refits(key1);
    step(0.5);
    if (!(refits(key1) > r1)) fail('전술이 꺼졌는데 무기를 안 만진 영웅이 안 갈아입었다 — 보너스가 그대로다');
    // ③ 되찾음 — 다시 끼면 켜진다
    if (!SYS.game.equip(g, a0, weapons[0]).ok) fail('무기 다시 끼기 거절');
    if (!SYS.game.runTactics(g, d.run)[0].active) fail('되찾았는데 안 켜졌다');
    const r2 = refits(key1);
    step(0.5);
    if (!(refits(key1) > r2)) fail('되찾았는데 무기를 안 만진 영웅이 다시 안 갈아입었다');
    // ④ 다음 런은 지금 모습 — 출발 때 켜진 나태 칸이 든다
    const ids2 = SYS.game.departRun(g, 101, NOW + 1).run.tactics.map(o => o.id);
    if (!ids2.includes('opt_gear_sloth')) fail(`다음 런 스냅숏 [${ids2}] — 켜진 나태 칸이 들어야`);
    return `스냅숏 [분노] · 리롤 · 꺼진 칸 무시 · 깨짐 2/3 · 되찾음 · 다음 런 [${ids2}]`;
});

check('advanceRun: 이긴 라운드의 경험치는 그 순간 살아 있는 영웅만 — 쓰러진 영웅은 그 런 끝까지 몫이 없다 (R89 D2)', () => {
    let sample = 0, rounds = 0;
    for (let seed = 1; seed <= 30 && sample < 3; seed++) {
        const G2 = newGameP(seed, cands, NOW);
        const d = SYS.game.departRun(G2, 101, NOW);
        if (!d.ok) fail(`seed ${seed} depart ${d.err}`);
        const R = d.report, out = new Set();
        for (;;) {
            const before = { ...R.xp };
            const a = SYS.game.advanceRun(G2, d.run, NOW);
            const s = a.round, base = s.xp * B.xp_rate;
            // 경험치 획득 +%(방어구 공통옵션)는 **본인 몫** — 그 영웅의 옵션 묶음으로 잰다 (2026-09-18). 0 이면 전원 같은 값이다
            const each = uid => {
                if (!s.cleared) return 0;
                const gain = SYS.game.heroCombat(G2, SYS.game.heroById(G2, uid)).option_fx?.xpGain ?? 0;
                return Math.round(gain ? base * (1 + gain) : base);
            };
            rounds++;
            for (const uid of out) if (s.alive.includes(uid)) fail(`seed ${seed} — 쓰러졌던 ${uid} 가 라운드 ${s.n} 끝에 살아 있다`);
            for (const uid of R.party) {
                const live = s.alive.includes(uid), want = before[uid] + (live ? each(uid) : 0);
                if (!live) out.add(uid);
                if (R.xp[uid] !== want) fail(`seed ${seed} 라운드 ${s.n} ${uid} — xp ${before[uid]} → ${R.xp[uid]} (기대 ${want} · 살아 있음 ${live} · 이김 ${s.cleared})`);
            }
            if (s.cleared && base > 0 && s.alive.length < R.party.length) sample++;
            if (a.done) break;
        }
    }
    if (!sample) fail('쓰러진 영웅이 있는 채로 이긴 라운드가 없다 — 표본 없음 (시드 1~30)');
    return `쓰러진 채 이긴 라운드 ${sample} · 정산 ${rounds}`;
});
check('advanceRun: 경험치 획득 +% 는 낀 영웅 본인 몫만 늘린다 — 다른 영웅은 제 값 (2026-09-18 · item_design §1 「갑옷 옵션」)', () => {
    // 표본 — 옵션 영웅이 살아서 이긴 라운드가 있어야 한다 · 약한 몬스터(SOFT)
    const G2 = SOFT.game.newGame(3, cands, NOW);
    const h0 = SOFT.game.heroById(G2, SOFT.game.partyOf(G2)[0]);
    const aUid = h0.equipped.armor;
    if (!aUid) fail('픽스처 — 첫 영웅이 갑옷을 입고 있어야 한다');
    G2.items[aUid].affixes = [...G2.items[aUid].affixes, { stat: 'xp_gain_pct', v: 0.5, src: 'random' }];
    const d = SOFT.game.departRun(G2, 101, NOW);
    if (!d.ok) fail(`depart ${d.err}`);
    const R = d.report;
    const gainOf = uid => SOFT.game.heroCombat(G2, SOFT.game.heroById(G2, uid)).option_fx?.xpGain ?? 0;
    if (!(gainOf(h0.uid) >= 0.5)) fail(`옵션 묶음 경험치 ${gainOf(h0.uid)}`);
    for (;;) {
        const before = { ...R.xp };
        const a = SOFT.game.advanceRun(G2, d.run, NOW);
        const s = a.round;
        if (s.cleared && s.xp > 0 && s.alive.includes(h0.uid)) {
            const base = s.xp * B.xp_rate;
            for (const uid of s.alive) {
                const g = gainOf(uid);
                const want = Math.round(g ? base * (1 + g) : base);
                if (R.xp[uid] - before[uid] !== want) fail(`${uid} 경험치 ${R.xp[uid] - before[uid]} ≠ ${want} (옵션 ${g})`);
            }
            return `기본 ${Math.round(base)} · 옵션 영웅 ${R.xp[h0.uid] - before[h0.uid]}`;
        }
        if (a.done) break;
    }
    return fail('옵션 영웅이 살아서 이긴 라운드가 없다 — 표본 없음');
});

check('원정 중 편성 — 인원 넣기 · 빼기 · 진형 · 자리 · 새 출발이 열린다 · 지금 싸우는 영웅만 해고 · 수색이 막힌다 · 끝나면 풀린다 (R92 · R89 D7 대체)', () => {
    const G2 = newGameP(42, cands, NOW);
    const extra = SYS.game.tavernCandidates(G2)[0];
    G2.counters.hero++; extra.uid = 'hx'; G2.heroes.push(extra);
    const [a, b] = SYS.game.partyOf(G2);
    const d = SYS.game.departRun(G2, 101, NOW);
    if (!d.ok) fail(`depart ${d.err}`);
    const going = SYS.game.partyOf(G2).slice();
    if (!eq(SYS.game.runParty(G2), going)) fail(`싸우는 영웅 ${JSON.stringify(SYS.game.runParty(G2))} — 나간 인원이어야`);
    if (SYS.game.canDepart(G2, 101, NOW) !== null) fail(`원정 중 출발 판정 ${SYS.game.canDepart(G2, 101, NOW)}`);
    const tries = {
        '빼기': () => SYS.game.toggleParty(G2, a, NOW),
        '넣기': () => SYS.game.toggleParty(G2, 'hx', NOW),
        '진형': () => SYS.game.setFormation(G2, '1-2'),
        '자리': () => SYS.game.placeFormation(G2, b, 0, 0),
    };
    for (const [k, f] of Object.entries(tries)) { const r = f(); if (!r.ok) fail(`원정 중 ${k} — ${r.err}`); }
    // 뺀 영웅도 그 원정이 끝날 때까지 싸운다 — 해고 · 수색이 막힌다. 새로 넣은 영웅은 안 싸운다
    if (!eq(SYS.game.runParty(G2), going)) fail('편성을 바꿨더니 싸우는 영웅이 따라 바뀌었다');
    const fired = SYS.game.dismiss(G2, a).err;
    if (fired !== 'running') fail(`파티에서 뺀 채 싸우는 영웅의 해고 — ${fired} (running 이어야)`);
    if (SYS.game.searchState(G2, NOW).ready.includes(a)) fail('싸우는 영웅이 수색 후보에 섰다');
    const sent = SYS.game.searchSend(G2, a, NOW).err;
    if (sent !== 'party') fail(`싸우는 영웅의 수색 — ${sent} (party 여야)`);
    while (!SYS.game.advanceRun(G2, d.run, NOW).done);
    if (SYS.game.runParty(G2).length) fail(`끝났는데 싸우는 영웅 ${JSON.stringify(SYS.game.runParty(G2))}`);
    if (SYS.game.dismiss(G2, a).err === 'running') fail('끝났는데 해고가 running');
    return `편성 ${Object.keys(tries).length}가지 열림 · 싸우는 ${going.length}명 해고 · 수색 막힘 · 끝나면 풀림`;
});

check('원정 중에 편성을 바꿔도 도는 원정은 나간 인원 · 전술 조건 그대로다 — 안 바꾼 원정과 전투가 한 글자도 안 다르다 (R92)', () => {
    const mk = seed => { const g = newGameP(seed, cands, NOW); for (const h of g.heroes) h.level = B.hero_level_cap; return g; };
    // 한 명을 빼면 전술이 달라지는 편성을 고른다 — 안 그러면 「나간 인원으로 센다」가 안 걸린다
    let seed = 0;
    for (let s = 1; s <= 40 && !seed; s++) {
        const g = mk(s);
        if (JSON.stringify(SYS.game.tacticBonus(g)) !== JSON.stringify(SYS.game.tacticBonus(g, SYS.game.partyOf(g).slice(1)))) seed = s;
    }
    if (!seed) fail('한 명을 빼면 전술이 달라지는 편성이 없다 — 표본 없음 (시드 1~40)');
    const fight = edit => {
        const g = mk(seed);
        const d = SYS.game.departRun(g, 101, NOW);
        if (!d.ok) fail(`seed ${seed} depart ${d.err}`);
        edit?.(g);
        let bounds = 0;
        while (!SYS.game.advanceRun(g, d.run, NOW).done) bounds++;
        return { tl: JSON.stringify(d.run.result.timeline), bounds };
    };
    const plain = fight();
    const edited = fight(g => {
        const f = SYS.game.formationState(g);
        if (!SYS.game.toggleParty(g, SYS.game.partyOf(g)[0], NOW).ok) fail('원정 중 빼기가 거절됐다');
        if (!SYS.game.setFormation(g, f.templates.find(x => x !== f.tpl)).ok) fail('원정 중 진형이 거절됐다');
    });
    if (plain.bounds < 1) fail('라운드가 하나뿐이라 갈아입기 경계가 없다');
    if (edited.tl !== plain.tl) fail('편성을 바꿨더니 도는 원정의 전투가 바뀌었다 — 인원 · 전술을 편성에서 읽었다');
    return `seed ${seed} · 라운드 경계 ${plain.bounds} · 전투 동일`;
});

/**
 * 첫 라운드를 이겨 정산했고 **둘째 라운드가 도는 중**(한가운데까지 걸었다)인데 그 라운드도 이기면 골드가 들어올 원정 — 끊기 · 철수 단정이 쓴다.
 * 둘째 라운드의 몫은 **같은 시드의 쌍둥이**를 끝까지 걸어 안다 — 엔진이 미래를 미리 계산해 두지 않는다(R130 · 옛 `run.pending`)
 */
const midRun = () => {
    for (let seed = 1; seed <= 40; seed++) {
        const G2 = newGameP(seed, cands, NOW), gold0 = G2.resources.gold, twin = newGameP(seed, cands, NOW);
        const d = SYS.game.departRun(G2, 101, NOW), dt = SYS.game.departRun(twin, 101, NOW);
        if (!d.ok) fail(`seed ${seed} depart ${d.err}`);
        const a = SYS.game.advanceRun(G2, d.run, NOW + 1000);
        SYS.game.advanceRun(twin, dt.run, NOW + 1000);
        if (a.done || !a.round.cleared || !(a.round.gold > 0)) continue;
        const b = SYS.game.advanceRun(twin, dt.run, NOW + 1000);
        if (!b.round.cleared || !(b.round.gold > 0)) continue;
        SYS.game.stepRun(G2, d.run, (a.round.t + b.round.t) / 2);
        if (!d.run.battle.status().inRound) continue;
        return { seed, G2, d, gold0, pendGold: b.round.gold };
    }
    return null;
};
const settledSnap = (G2, R) => JSON.stringify({ r: G2.resources, bag: G2.bag, ck: G2.codexKills, h: G2.heroes.map(h => [h.uid, h.level, h.xp]), rep: { ...R, reason: null } });

check('closeRun: 도는 원정을 끊는다 — 진행 중 라운드는 없던 것 · 이긴 라운드 보상은 남는다 · 반복 off · 리포트 closed (R89 D8 · D13)', () => {
    const m = midRun();
    if (!m) fail('둘째 라운드도 골드를 줄 원정이 없다 — 표본 없음 (시드 1~40)');
    const { G2, d } = m;
    G2.runs[0].repeat = true;
    const snap = settledSnap(G2, d.report);
    const n = SYS.game.closeRun(G2, NOW + 3_600_000);
    if (n?.kind !== 'runClosed' || n.stageId !== 101) fail(`알림 ${JSON.stringify(n)}`);
    if (d.report.reason !== 'closed') fail(`리포트 판정 ${d.report.reason}`);
    if (G2.runs[0].active !== false || G2.runs[0].repeat !== false) fail(`active ${G2.runs[0].active} · repeat ${G2.runs[0].repeat}`);
    if (settledSnap(G2, d.report) !== snap) fail('끊었는데 자원 · 가방 · 도감 · 경험치 · 리포트가 움직였다 — 진행 중 라운드를 정산했다');
    if (G2.resources.gold !== m.gold0 + d.report.gold || d.report.roundsCleared < 1) fail(`이긴 라운드의 보상이 없다 — 골드 ${m.gold0} → ${G2.resources.gold} · 리포트 ${d.report.gold}`);
    if (SYS.game.canDepart(G2, 101, NOW) !== null) fail('끊었는데 출발이 막혀 있다');
    return `seed ${m.seed} · 이긴 라운드 ${d.report.roundsCleared} · 골드 +${d.report.gold} 남음 · 버린 라운드 골드 ${m.pendGold}`;
});

check('retreatRun: 철수 — 진행 중 라운드는 버리고 이긴 라운드 보상은 남는다 · 반복 off · 리포트 retreat · 끝난 원정은 다시 안 움직인다 (R89 D10 · D13)', () => {
    const m = midRun();
    if (!m) fail('둘째 라운드도 골드를 줄 원정이 없다 — 표본 없음 (시드 1~40)');
    const { G2, d } = m;
    G2.runs[0].repeat = true;
    const snap = settledSnap(G2, d.report);
    const r = SYS.game.retreatRun(G2, d.run, NOW + 2000);
    if (!r.ok || r.report !== d.report) fail(`retreat ${r.err}`);
    if (d.report.reason !== 'retreat') fail(`리포트 판정 ${d.report.reason}`);
    if (G2.runs[0].active !== false || G2.runs[0].repeat !== false || d.run.done !== true) fail(`active ${G2.runs[0].active} · repeat ${G2.runs[0].repeat} · done ${d.run.done}`);
    if (settledSnap(G2, d.report) !== snap) fail('철수했는데 자원 · 가방 · 도감 · 경험치 · 리포트가 움직였다 — 진행 중 라운드를 정산했다');
    if (G2.resources.gold !== m.gold0 + d.report.gold) fail(`이긴 라운드의 골드가 자원에 없다 — ${m.gold0} → ${G2.resources.gold} · 리포트 ${d.report.gold}`);
    if (SYS.game.retreatRun(G2, d.run, NOW).err !== 'done' || SYS.game.advanceRun(G2, d.run, NOW).err !== 'done') fail('끝난 원정이 또 움직였다');
    SYS.game.closeRun(G2, NOW + 3000);
    if (d.report.reason !== 'retreat') fail(`철수한 원정을 closeRun 이 다시 끊었다 — ${d.report.reason}`);
    return `seed ${m.seed} · 이긴 라운드 ${d.report.roundsCleared} · 골드 +${d.report.gold} 남음 · 버린 라운드 골드 ${m.pendGold}`;
});

check('departRun: 원정 중에 보내면 도는 원정을 끊고 나간다 — 철수와 같다 · 새 리포트가 맨 앞 · 끊긴 원정의 핸들은 done 이고 새 원정을 안 건드린다 (R92)', () => {
    const m = midRun();
    if (!m) fail('둘째 라운드도 골드를 줄 원정이 없다 — 표본 없음 (시드 1~40)');
    const { G2, d } = m;
    G2.runs[0].repeat = true;
    const snap = settledSnap(G2, d.report), battles = G2.counters.battle;
    const e = SYS.game.departRun(G2, 101, NOW + 2000);
    if (!e.ok) fail(`원정 중 출발 ${e.err}`);
    if (d.report.reason !== 'retreat') fail(`끊긴 원정의 판정 ${d.report.reason}`);
    if (settledSnap(G2, d.report) !== snap) fail('끊었는데 자원 · 가방 · 도감 · 경험치 · 옛 리포트가 움직였다 — 진행 중 라운드를 정산했다');
    if (G2.reports[0] !== e.report || G2.reports[1] !== d.report || e.report.reason !== null) fail('새 리포트가 맨 앞(진행 중) · 끊긴 리포트가 그 뒤여야');
    if (G2.runs[0].active !== true || G2.runs[0].lastAt !== NOW + 2000 || G2.runs[0].repeat !== false || G2.counters.battle !== battles + 1) fail(`새 원정 active ${G2.runs[0].active} · lastAt ${G2.runs[0].lastAt} · repeat ${G2.runs[0].repeat} · 전투 ${battles} → ${G2.counters.battle}`);
    const after = settledSnap(G2, e.report);
    if (SYS.game.advanceRun(G2, d.run, NOW + 9_000_000).err !== 'done' || SYS.game.retreatRun(G2, d.run, NOW + 3000).err !== 'done') fail('끊긴 원정의 핸들이 또 움직였다');
    if (settledSnap(G2, e.report) !== after || e.report.reason !== null || G2.runs[0].active !== true) fail('끊긴 원정의 핸들이 새 원정을 건드렸다');
    if (!SYS.game.advanceRun(G2, e.run, NOW + 9_000_000).ok) fail('새 원정이 안 넘어간다');
    return `seed ${m.seed} · 끊긴 원정 이긴 라운드 ${d.report.roundsCleared} · 버린 라운드 골드 ${m.pendGold}`;
});

/* ── 다부대 [v38 · 2026-09-23 · GAME_DESIGN §1-1 「동시 원정은 최대 3부대다」] ──
   부대 = 편성이다. 부대 수를 여는 건물 랭크는 아직 미정(GAME_DESIGN §10 「다부대의 남은 설계」)이라
   **CSV 기본값을 바꿔 끼운 시스템**으로 규칙을 잠근다 — 건물 표가 서면 그때 문턱 단정이 따로 붙는다 */
const MULTI = buildSystems({ ...D, balance: { ...B, concurrent_expedition_parties: 3 } });
/** 새 게임의 영웅 셋을 편성 1 · 2 · 3 에 한 명씩 흩는다 — 한 영웅은 한 편성에만 들므로 넣으면 앞 편성에서 빠진다 */
const spread = (S, g) => {
    const uids = g.heroes.map(h => h.uid);
    S.game.selectPreset(g, 2); S.game.toggleParty(g, uids[1], NOW);
    S.game.selectPreset(g, 3); S.game.toggleParty(g, uids[2], NOW);
    S.game.selectPreset(g, 1);
    return uids;
};

check('다부대: 부대 셋이 동시에 돈다 — 편성마다 제 칸 · 제 리포트 · 제 전투 스트림 · 하나가 끝나도 남은 부대는 돈다 · 껐다 켜면 전부 끊긴다 (v38 · GAME_DESIGN §1-1)', () => {
    const g = MULTI.game.newGame(51, cands, NOW);
    const [a, b, c] = spread(MULTI, g);
    if (MULTI.game.limitsOf(g).expeditions !== 3) fail(`상한 ${MULTI.game.limitsOf(g).expeditions}`);
    const d = [1, 2, 3].map(no => MULTI.game.departRun(g, 101, NOW, no));
    if (d.some(x => !x.ok)) fail(`출발 ${JSON.stringify(d.map(x => x.err ?? 'ok'))}`);
    if (!eq(g.runs.map(r => r?.active === true), [true, true, true])) fail(`도는 부대 ${JSON.stringify(g.runs.map(r => r?.active))}`);
    if (!eq(MULTI.game.presetState(g).runNos, [1, 2, 3])) fail('runNos');
    if (!eq(d.map(x => x.report.preset), [1, 2, 3])) fail('리포트에 편성 번호가 안 실렸다 — 어느 부대의 런인지 못 가린다');
    if (g.counters.battle !== 3) fail(`전투 스트림 ${g.counters.battle} — 부대마다 하나씩이어야 한다`);
    // 인원 — 합친 것(`heroBusy` 가 읽는다) · 부대별 · 어느 부대인가
    if (!eq(MULTI.game.runParty(g).slice().sort(), [a, b, c].slice().sort())) fail(`합친 인원 ${MULTI.game.runParty(g)}`);
    if (!eq(MULTI.game.runParty(g, 2), [b])) fail(`부대 2 인원 ${MULTI.game.runParty(g, 2)}`);
    if (MULTI.game.runOf(g, b) !== 2 || MULTI.game.runOf(g, a) !== 1 || MULTI.game.runOf(g, 'nope') !== null) fail('runOf');
    if (MULTI.game.heroBusy(g, c) !== 'run') fail('heroBusy 가 셋째 부대를 못 본다');
    // 부대 2 만 끝까지 — 나머지는 그대로 돈다
    while (!MULTI.game.advanceRun(g, d[1].run, NOW).done);
    if (g.runs[1].active !== false) fail('끝난 부대가 안 닫혔다');
    if (g.runs[0].active !== true || g.runs[2].active !== true) fail('한 부대가 끝나자 다른 부대까지 닫혔다');
    if (MULTI.game.runOf(g, b) !== null || MULTI.game.runOf(g, a) !== 1) fail('끝난 부대의 영웅이 아직 싸운다고 나온다');
    // 껐다 켜면 남은 부대가 전부 끊긴다 — 오프라인엔 원정이 안 돈다 (base_expedition_design §1)
    const n = MULTI.game.closeRun(g, NOW + 60_000);
    if (n?.kind !== 'runClosed' || n.runs.length !== 2) fail(`알림 ${JSON.stringify(n)}`);
    if (g.runs.some(r => r?.active)) fail('껐는데 도는 부대가 남았다');
    return `부대 3 동시 · 전투 스트림 3 · 하나 끝나도 둘은 돈다 · closeRun 이 ${n.runs.length}개를 끊었다`;
});

check('다부대: 상한을 넘으면 full · 다른 부대에서 싸우는 영웅이 든 편성은 busy · 같은 편성 재출발은 부대 수를 안 늘린다 (v38 · INTERFACE §3)', () => {
    const S = buildSystems({ ...D, balance: { ...B, concurrent_expedition_parties: 2 } });
    const g = S.game.newGame(52, cands, NOW);
    const [, b] = spread(S, g);
    if (!S.game.departRun(g, 101, NOW, 1).ok || !S.game.departRun(g, 101, NOW, 2).ok) fail('두 부대 출발');
    if (S.game.canDepart(g, 101, NOW, 3) !== 'full') fail(`셋째 부대 ${S.game.canDepart(g, 101, NOW, 3)}`);
    if (S.game.departRun(g, 101, NOW, 3).err !== 'full') fail('셋째 부대 출발이 안 막혔다');
    // 같은 편성을 다시 보내는 것은 그 부대를 끊고 여는 것이라 수가 안 는다
    if (!S.game.departRun(g, 101, NOW + 1, 1).ok) fail('같은 편성 재출발이 막혔다');
    if (S.game.presetState(g).runNos.length !== 2) fail('재출발로 부대 수가 늘었다');
    // busy — 부대 2 에서 싸우는 영웅을 편성 3 으로 옮기면 그 편성은 못 나간다(도는 부대는 나간 인원 그대로 싸운다)
    S.game.selectPreset(g, 3); S.game.toggleParty(g, b, NOW);
    if (S.game.canDepart(g, 101, NOW, 3) !== 'busy') fail(`busy 가 아니라 ${S.game.canDepart(g, 101, NOW, 3)}`);
    if (S.game.presetState(g).presets[2].err !== 'busy') fail('편성 화면이 busy 를 안 낸다');
    if (!eq(S.game.runParty(g, 2), [b])) fail('편성을 옮겼다고 도는 부대의 인원이 흔들렸다');
    return '상한 2 → 셋째 full · 같은 편성 재출발은 수가 안 는다 · 옮겨 둔 영웅이 싸우는 중이면 busy';
});

check('다부대: 부대끼리 rng 가 안 섞인다 — 사이에 다른 부대를 보내도 그 부대의 런은 혼자 돌린 것과 같다 (INTERFACE §5-1 · v38)', () => {
    const fp = g2 => JSON.stringify(g2.reports.filter(r => r.preset === 1).map(r => [r.won, r.reason, r.gold, r.roundsCleared, r.drops.length, r.downed.length]));
    const solo = MULTI.game.newGame(53, cands, NOW);
    spread(MULTI, solo);
    const s1 = MULTI.game.departRun(solo, 101, NOW, 1);
    while (!MULTI.game.advanceRun(solo, s1.run, NOW).done);
    // 같은 시드 · 같은 순서로 부대 1 을 먼저 보내고, 그 뒤 부대 2 · 3 을 끼워 넣는다 — 부대 1 의 rng 인스턴스는 제 클로저 안에 있다
    const mix = MULTI.game.newGame(53, cands, NOW);
    spread(MULTI, mix);
    const m1 = MULTI.game.departRun(mix, 101, NOW, 1);
    MULTI.game.departRun(mix, 101, NOW, 2);
    MULTI.game.departRun(mix, 101, NOW, 3);
    while (!MULTI.game.advanceRun(mix, m1.run, NOW).done);
    if (fp(mix) !== fp(solo)) fail(`부대 1 의 런이 갈렸다 — 혼자 ${fp(solo)} · 섞어 ${fp(mix)}`);
    return `부대 1 의 결과가 다른 부대를 끼워 넣어도 같다 ${fp(solo)}`;
});

check('save: runs 는 편성 수만큼 선다 — 왕복 동일 · 옛 단수 run 필드는 없다 · 겹친 파티는 로드가 앞 편성에 몰아준다 (v38 · 다부대)', () => {
    const g = MULTI.game.newGame(54, cands, NOW);
    spread(MULTI, g);
    MULTI.game.departRun(g, 101, NOW, 2);
    const s = MULTI.game.serialize(g, NOW);
    if (s.runs?.length !== MULTI.game.limitsOf(g).presets) fail(`runs ${JSON.stringify(s.runs?.length)}`);
    if (s.run !== undefined) fail('옛 단수 run 필드가 남아 있다');
    if (s.runs[0] !== null || s.runs[1]?.active !== true) fail(`안 나간 편성은 null · 나간 편성만 선다 ${JSON.stringify(s.runs)}`);
    const back = MULTI.game.deserialize(JSON.parse(JSON.stringify(s)));
    if (!eq(MULTI.game.serialize(back, NOW), s)) fail('왕복이 다르다');
    // 겹친 파티 — 손으로 두 편성에 같은 영웅을 넣어 두면 로드가 **앞 편성**만 남긴다
    const dup = JSON.parse(JSON.stringify(s));
    dup.presets[2].party = dup.presets[0].party.concat(dup.presets[1].party);
    const fixed = MULTI.game.deserialize(dup);
    if (fixed.presets[2].party.length !== 0) fail(`겹친 파티가 남았다 ${JSON.stringify(fixed.presets[2].party)}`);
    if (JSON.stringify(fixed.presets[2].formation).includes(dup.presets[1].party[0])) fail('겹쳐 들어온 영웅이 진형에 남았다');
    return `runs ${s.runs.length}칸 · 왕복 동일 · 겹친 파티는 앞 편성이 갖는다`;
});

check('원정 결정론 — 같은 세이브면 resolveBattle 두 번이 같고, departRun + advanceRun 을 손으로 이어도 같다 (R89 · INTERFACE §5-2)', () => {
    let steps = 0;
    for (const seed of [3, 42]) {
        const a = newGameP(seed, cands, NOW), b = newGameP(seed, cands, NOW), c = newGameP(seed, cands, NOW);
        const ra = SYS.game.resolveBattle(a, 101, NOW), rb = SYS.game.resolveBattle(b, 101, NOW);
        if (!ra.ok || !eq(ra.report, rb.report) || !eq(ra.result, rb.result)) fail(`seed ${seed} — 같은 세이브인데 resolveBattle 이 갈렸다`);
        const d = SYS.game.departRun(c, 101, NOW);
        do steps++; while (!SYS.game.advanceRun(c, d.run, NOW).done);
        if (!eq(d.report, ra.report) || !eq(d.run.result, ra.result)) fail(`seed ${seed} — 손으로 이은 리포트 · 결과가 resolveBattle 과 다르다`);
        if (!eq(SYS.game.serialize(c, NOW), SYS.game.serialize(a, NOW))) fail(`seed ${seed} — 손으로 이은 세이브가 resolveBattle 과 다르다`);
    }
    return `시드 2 · 라운드 넘기기 ${steps}`;
});

/* ── 선술집 ── */
check('tavern: 후보는 카운터에 결정론, 고용은 골드·상한을 지킨다 · 고용한 칸만 빈다 (base_expedition §2-4)', () => {
    const G2 = newGameP(42, cands, NOW);
    const a = SYS.game.tavernCandidates(G2), b = SYS.game.tavernCandidates(G2);
    if (!eq(a, b)) fail('nondeterministic');
    G2.resources.gold = B.tavern_hire_cost - 1;
    if (SYS.game.hire(G2, 0).err !== 'gold') fail('gold gate');
    G2.resources.gold = B.tavern_hire_cost * 100;
    const r = SYS.game.hire(G2, 0);
    if (!r.ok || G2.heroes.length !== 5 || r.hero.uid !== 'h5') fail('hire');
    // 고용한 칸만 null 이 되고 **나머지 칸은 그대로**다 — 고용이 무료 리롤 우회로가 되면 쿨다운이 무의미해진다
    const after = SYS.game.tavernCandidates(G2);
    if (after[0] !== null) fail('hired slot should be empty');
    if (!eq(after.slice(1), a.slice(1))) fail('other slots must not change on hire');
    if (SYS.game.hire(G2, 0).err !== 'missing') fail('empty slot should not be hireable');
    // 명단이 갈리지 않으므로 정원을 채우려면 **리롤을 끼워야 한다** — 그 자체가 「고용 ≠ 리롤」의 증거다
    const cap = SYS.game.limitsOf(G2).roster;       // 로스터 상한 = 기본값 + 선술집 랭크 (R137)
    for (let guard = 0; G2.heroes.length < cap && guard < 50; guard++)
        if (!SYS.game.hire(G2, 1).ok) SYS.game.tavernReroll(G2, NOW);
    if (G2.heroes.length !== cap) fail(`로스터 ${G2.heroes.length} — 정원 ${cap} 을 못 채웠다`);
    return SYS.game.hire(G2, 1).err === 'roster';
});
check('tavern: 리롤은 쿨다운이 끝나면 무료, 남았으면 골드 — 명단은 저절로 갈리지 않는다 (base_expedition §2-4)', () => {
    const G2 = newGameP(42, cands, NOW);
    G2.resources.gold = B.tavern_reroll_cost * 10;
    const gold0 = G2.resources.gold;
    // 리롤한 적이 없으면 이미 열려 있다 (자동 갱신이 없으므로 「기다린 시간」이 없다)
    const st0 = SYS.game.tavernState(G2, NOW);
    if (!st0.free) fail('first reroll should be free');
    const r1 = SYS.game.tavernReroll(G2, NOW);
    if (!r1.ok || !r1.free || G2.resources.gold !== gold0) fail('free reroll must not charge');
    // 쿨다운 중 — 즉시 리롤은 골드
    const st1 = SYS.game.tavernState(G2, NOW);
    if (st1.free) fail('should be on cooldown');
    const r2 = SYS.game.tavernReroll(G2, NOW);
    if (!r2.ok || r2.free || G2.resources.gold !== gold0 - B.tavern_reroll_cost) fail('paid reroll must charge');
    // 쿨다운이 지나면 다시 무료 (오프라인에도 흐른다 — now 만 앞으로 간다)
    const later = NOW + B.tavern_refresh_hours * 60 * 60 * 1000;
    if (!SYS.game.tavernState(G2, later).free) fail('cooldown should expire');
    // 골드가 없으면 쿨다운 중 리롤은 거절
    G2.resources.gold = 0;
    SYS.game.tavernReroll(G2, later);
    return SYS.game.tavernReroll(G2, later).err === 'gold';
});
check('tavern: 리롤은 산 칸을 되살린다 — 빈 칸은 다음 리롤에 채워진다', () => {
    const G2 = newGameP(42, cands, NOW);
    G2.resources.gold = B.tavern_hire_cost * 100;
    SYS.game.hire(G2, 0);
    if (SYS.game.tavernCandidates(G2)[0] !== null) fail('slot should be empty');
    SYS.game.tavernReroll(G2, NOW);
    return SYS.game.tavernCandidates(G2).every(c => c !== null) || fail('reroll should refill');
});

/* ── 상점 — 특수상단 방문 시계 · 상단 장비 목록 (base_expedition §2-6 · SCREEN_DESIGN §8-3 · ADR-0223 · 2026-09-21) ── */
check('shop: 방문 시계 — 게임을 만든 시각에서 세고 주기마다 와서 체류만큼 머문다 · rng 도 상태도 안 건드린다 (ADR-0223)', () => {
    const G2 = newGameP(42, cands, NOW);
    const H = 60 * 60 * 1000, P = B.trade_visit_hours * H, S = B.trade_stay_hours * H;
    if (!(S > 0 && S < P)) fail(`체류 ${B.trade_stay_hours} 은 0 보다 크고 주기 ${B.trade_visit_hours} 보다 작아야 떠나 있는 시간이 생긴다`);
    const snap = JSON.stringify(G2);
    const at = dt => SYS.game.shopVisit(G2, G2.createdAt + dt);
    const v0 = at(0);
    if (!(v0.cycle === 0 && v0.here && v0.remainMs === S)) fail(`새 게임 = 상인이 와 있다 ${JSON.stringify(v0)}`);
    const v1 = at(S - 1);
    if (!(v1.here && v1.remainMs === 1)) fail(`떠나기 1ms 전 ${JSON.stringify(v1)}`);
    const v2 = at(S);
    if (!(!v2.here && v2.cycle === 0 && v2.remainMs === P - S)) fail(`떠난 순간 = 다음 상인까지 주기 − 체류 ${JSON.stringify(v2)}`);
    const v3 = at(P);
    if (!(v3.here && v3.cycle === 1 && v3.arriveAt === G2.createdAt + P)) fail(`다음 회차 ${JSON.stringify(v3)}`);
    // 시계가 게임을 만든 시각보다 뒤로 가 있어도 음수 회차를 안 낸다
    if (at(-H).cycle !== 0) fail('createdAt 앞의 시각이 음수 회차를 냈다');
    if (JSON.stringify(G2) !== snap) fail('방문 시계가 상태를 바꿨다');
    return `주기 ${B.trade_visit_hours}h · 체류 ${B.trade_stay_hours}h`;
});
check('shop: 장비 목록 — 부위마다 shop_equip_per_slot 개(무기만 shop_equip_weapon 개) · 같은 부위가 붙어 선다 · 방문 회차마다 새로 굴리고 같은 회차면 같다 · 저장 안 함 · 희귀도 가격 · ilvl = 진행 챕터 레벨대 (ADR-0223)', () => {
    const G2 = newGameP(42, cands, NOW);
    const H = 60 * 60 * 1000, P = B.trade_visit_hours * H, S = B.trade_stay_hours * H;
    const snap = JSON.stringify(G2);
    const s0 = SYS.game.shopState(G2, NOW);
    // 부위 순서 = 착용 위치 순서에서 부위만 한 번씩(반지 한 종류) — 그 순서로 n 개씩 붙어 선다
    const parts = [...new Set(D.equipSlots.map(s => s.part))];
    const SL = SYS.game.limitsOf(G2);                // 품목 수 = 기본값 + 상단 랭크 (R137)
    const want = parts.flatMap(p => Array(p === 'weapon' ? SL.shopWeapon : SL.shopPerSlot).fill(p));
    if (parts[0] !== 'weapon') fail(`맨 앞 부위 ${parts[0]} — 무기가 맨 윗줄이다`);
    const got = s0.equip.map(e => e.item.slot);
    if (JSON.stringify(got) !== JSON.stringify(want)) fail(`부위 줄 ${got.join(',')} ≠ ${want.join(',')}`);
    const price = { normal: B.shop_price_normal, magic: B.shop_price_magic, rare: B.shop_price_rare };
    // 챕터 레벨대 — (챕터 n−1 끝, 챕터 n 끝] · 첫 레벨대는 1 부터 (stage.csv:dlvl · 제작이 레벨로 바뀌며 makeBands 가 퇴역 2026-09-21)
    const chTop = c => Math.max(...D.stageList.filter(s => s.chapter === c).map(s => s.dlvl));
    const chBand = c => ({ lo: c === 1 ? 1 : chTop(c - 1) + 1, hi: chTop(c) });
    const band1 = chBand(1);
    for (const { item, gold } of s0.equip) {
        if (gold !== price[item.rarity]) fail(`${item.rarity} 가격 ${gold}`);
        if (item.uid != null) fail(`가방에 들지 않은 물건이 uid ${item.uid} 를 받았다`);
        if (item.ilvl < band1.lo || item.ilvl > band1.hi) fail(`새 게임 = 챕터 1 레벨대 ${band1.lo}~${band1.hi} 인데 ilvl ${item.ilvl}`);
    }
    // 같은 회차면 떠난 뒤에도 같은 목록 · 다음 회차는 다른 목록
    const key = s => JSON.stringify(s.equip);
    if (key(SYS.game.shopState(G2, NOW + S + 1)) !== key(s0)) fail('같은 회차인데 목록이 바뀌었다');
    if (key(SYS.game.shopState(G2, NOW + P)) === key(s0)) fail('다음 회차인데 목록이 그대로다');
    if (JSON.stringify(G2) !== snap) fail('목록 굴림이 상태(카운터 · 가방)를 바꿨다 — 저장하지 않는 문법이다');
    // 챕터 1 을 다 깨면 챕터 2 가 열려 레벨대가 넘어간다
    for (const id of D.stageOrder) if (D.stages[id].chapter === 1) G2.progress.cleared.push(id);
    const s1 = SYS.game.shopState(G2, NOW);
    const band2 = chBand(2);
    if (s1.chapter !== 2) fail(`진행 챕터 ${s1.chapter} ≠ 2`);
    if (s1.equip.some(e => e.item.ilvl < band2.lo || e.item.ilvl > band2.hi)) fail(`챕터 2 레벨대 ${band2.lo}~${band2.hi} 밖`);
    const n = r => s0.equip.filter(e => e.item.rarity === r).length;
    return `무기 ${SL.shopWeapon} + ${parts.length - 1}부위 × ${SL.shopPerSlot} = ${s0.equip.length}칸 — 일반 ${n('normal')} · 매직 ${n('magic')} · 레어 ${n('rare')}`;
});

/* ── 수색 (base_expedition_design §2-4 · 구현 2026-09-09 · ADR-0062) ── */
const SPAN = () => B.tavern_search_hours * 60 * 60 * 1000;
/** 수색용 새 게임 — 편성에 든 영웅도 수색을 보낼 수 있다(편성은 계획이고 막는 자리는 출발이다 · R122).
 *  ⚠ 2026-09-21(ADR-0227)부터 `newGame` 도 편성 1 이 차 있어 `newGameP` 와 같은 상태다 — 이름만 남긴다 · **다 지은 판**(수색은 선술집 랭크가 연다 · R137) */
const newGameS = seed => openAll(SYS.game.newGame(seed, cands, NOW));
const SIN_IDS = Object.keys(M.SINS);

check('csv: search_story 는 막마다 공통(-) 행을 갖고 phase_order 는 1부터 연속 (state.js 로드 검증과 같은 규칙)', () => {
    const rows = D.searchStories;
    if (!rows.length) fail('행이 없다');
    const order = new Map();
    for (const r of rows) {
        if (!r.story_id || !r.phase || !r.text_kr || !r.text_en) fail(`빈 칸: ${r.story_id}`);
        if (r.sin !== '-' && !SIN_IDS.includes(r.sin)) fail(`죄종 '${r.sin}' (${r.story_id})`);
        const had = order.get(r.phase);
        if (had !== undefined && had !== r.phase_order) fail(`${r.phase} 의 phase_order 가 둘이다`);
        order.set(r.phase, r.phase_order);
    }
    const list = [...order.entries()].sort((a, b) => a[1] - b[1]);
    list.forEach(([id, n], i) => { if (n !== i + 1) fail(`phase_order 가 연속이 아니다 (${id} = ${n})`); });
    // 공통 행이 없는 막이 있으면 그 죄종에서 후보가 비어 「막마다 굴림 1회」가 깨진다
    for (const [id] of list) if (!rows.some(r => r.phase === id && r.sin === '-')) fail(`${id} 에 공통(-) 행이 없다`);
    return `막 ${list.length} · ${rows.length}행`;
});
check('search: 편성은 계획이다 — 편성에 든 영웅도 보내고 그 편성의 출발이 searching 으로 막힌다 · 동시 1건 · 나가면 대기 목록에서 빠진다 (§2-4 · R122)', () => {
    const g = newGameS(42);
    const st0 = SYS.game.searchState(g, NOW);
    if (st0.out || st0.ready.length !== g.heroes.length) fail(`대기 ${st0.ready.length}`);
    // 영웅 0 은 새 게임의 편성 1 에 이미 들어 있다 (ADR-0227)
    if (!SYS.game.partyOf(g).includes(g.heroes[0].uid)) fail('전제가 깨졌다 — 편성 1 에 안 들어 있다');
    if (!SYS.game.searchState(g, NOW).ready.includes(g.heroes[0].uid)) fail('편성에 든 영웅이 대기에서 빠졌다 — 편성은 계획이다');
    if (SYS.game.searchSend(g, 'nope', NOW).err !== 'missing') fail('없는 영웅');
    if (!SYS.game.searchSend(g, g.heroes[0].uid, NOW).ok) fail('편성에 든 영웅을 못 보낸다');
    if (SYS.game.canDepart(g, D.stageOrder[0], NOW) !== 'searching') fail(`수색 나간 영웅이 든 편성이 나간다 — ${SYS.game.canDepart(g, D.stageOrder[0], NOW)}`);
    if (SYS.game.presetState(g).presets[0].err !== 'searching') fail('presetState 가 수색을 못 짚는다');
    if (SYS.game.searchSend(g, g.heroes[2].uid, NOW).err !== 'busy') fail('동시 1건');
    const st = SYS.game.searchState(g, NOW);
    return (st.out && st.ready.length === 0 && st.sent.uid === g.heroes[0].uid && !st.done) || fail('나간 상태');
});
check('search: 결과는 저장 없이 재현된다 — 같은 세이브를 다시 열어도 같은 영웅·같은 이야기 (스트림 0x5EA7)', () => {
    const g = newGameS(42);
    SYS.game.searchSend(g, g.heroes[0].uid, NOW);
    const a = SYS.game.searchState(g, NOW + SPAN());
    const b = SYS.game.searchState(SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW)))), NOW + SPAN());
    if (!eq(a.result, b.result)) fail('결과가 재현되지 않는다');
    if (!eq(a.beats.map(x => x.id), b.beats.map(x => x.id))) fail('이야기가 재현되지 않는다');
    // 세이브가 드는 것은 「누가 · 언제 · 몇 번째 · 그때의 죄종·매력」뿐이다 — 결과도 이야기도 안 담긴다
    const keys = Object.keys(g.search).sort();
    return eq(keys, ['answer', 'cha', 'heroUid', 'no', 'sin', 'startedAt']) || fail(`세이브 필드 ${keys}`);
});
check('search: 이야기는 소요 시간을 막 수로 균등분할해 하나씩 열린다 · 결과는 끝에만 보인다 (ADR-0062)', () => {
    const g = newGameS(7);
    SYS.game.searchSend(g, g.heroes[0].uid, NOW);
    const span = SPAN(), n = SYS.game.searchState(g, NOW).beats.length;
    if (n < 1) fail('막이 없다');
    const open = at => SYS.game.searchState(g, at).beats.filter(x => x.open).length;
    if (open(NOW) !== 1) fail(`출발 직후 열린 막 ${open(NOW)} — 첫 막은 바로 열린다`);
    for (let i = 1; i < n; i++) {
        const at = NOW + Math.round(span * i / n);
        if (open(at - 1) !== i || open(at) !== i + 1) fail(`막 ${i + 1} 이 제때 안 열린다`);
    }
    if (SYS.game.searchState(g, NOW + span - 1).result !== null) fail('끝나기 전에 결과가 보인다');
    return SYS.game.searchState(g, NOW + span).result !== null || fail('끝났는데 결과가 없다');
});
check('search: 매력이 레어 확률을 민다 — 상한을 넘지 않는다 (tavern_search_rare_* 세 키)', () => {
    const N = 200, span = SPAN();
    const rareOf = cha => {
        const g = newGameS(4242);
        const h = g.heroes[0];
        let rare = 0;
        for (let i = 0; i < N; i++) {
            h.stats.cha = cha;
            SYS.game.searchSend(g, h.uid, NOW);
            if (SYS.game.searchState(g, NOW + span).result.tier === 'rare') rare++;
            SYS.game.searchDrop(g);
        }
        return rare / N;                                   // 비율 (R111)
    };
    const want = cha => Math.min(B.tavern_search_rare_cap_pct,
        B.tavern_search_rare_base_pct + cha * B.tavern_search_rare_per_cha_pct);
    const lo = rareOf(B.hero_attr_min), hi = rareOf(B.hero_attr_max);
    const p = v => `${M.pctNum(v).toFixed(0)}%`;
    if (hi <= lo) fail(`매력이 안 밀다 (낮음 ${p(lo)} · 높음 ${p(hi)})`);
    if (Math.abs(lo - want(B.hero_attr_min)) > 0.12) fail(`낮은 매력 ${p(lo)} ≠ 기대 ${p(want(B.hero_attr_min))}`);
    if (Math.abs(hi - want(B.hero_attr_max)) > 0.12) fail(`높은 매력 ${p(hi)} ≠ 기대 ${p(want(B.hero_attr_max))}`);
    return `매력 ${B.hero_attr_min} → ${p(lo)} · ${B.hero_attr_max} → ${p(hi)} (표본 ${N})`;
});
check('search: 죄종 메아리 — 결과가 보낸 영웅의 죄종으로 쏠린다 (tavern_search_sin_echo_pct)', () => {
    const N = 200, span = SPAN();
    const g = newGameS(555);
    const h = g.heroes[0];
    let same = 0;
    for (let i = 0; i < N; i++) {
        SYS.game.searchSend(g, h.uid, NOW);
        if (SYS.game.searchState(g, NOW + span).result.sin === h.sin) same++;
        SYS.game.searchDrop(g);
    }
    // 기대 = echo + (1 − echo) × 1/죄종수. 메아리가 0 이면 균등(1/7)이라 그 둘이 갈리는지를 본다
    const e = B.tavern_search_sin_echo_pct;                // 비율 (R111)
    const want = (e + (1 - e) / SIN_IDS.length) * 100;
    const got = same / N * 100;
    if (Math.abs(got - want) > 12) fail(`같은 죄종 ${got.toFixed(0)}% ≠ 기대 ${want.toFixed(0)}%`);
    return `같은 죄종 ${got.toFixed(0)}% (균등이면 ${(100 / SIN_IDS.length).toFixed(0)}%)`;
});
check('search: 수령은 골드·정원을 지키고 칸을 비운다 · 버리기는 다시 보낼 수 있게 한다 (§2-4)', () => {
    const g = newGameS(42);
    const span = SPAN();
    SYS.game.searchSend(g, g.heroes[0].uid, NOW);
    if (SYS.game.searchTake(g, NOW).err !== 'notDone') fail('안 끝났는데 수령됐다');
    g.resources.gold = B.tavern_hire_cost - 1;
    if (SYS.game.searchTake(g, NOW + span).err !== 'gold') fail('골드 검사');
    g.resources.gold = B.tavern_hire_cost * 100;
    const want = SYS.game.searchState(g, NOW + span).result;
    const r = SYS.game.searchTake(g, NOW + span);
    if (!r.ok || g.heroes.length !== 5) fail('수령 실패');
    if (r.hero.name.ko !== want.name.ko || r.hero.tier !== want.tier) fail('보여준 것과 다른 사람이 왔다');
    if (g.search !== null) fail('수령했는데 칸이 안 비었다');
    if (SYS.game.searchTake(g, NOW + span).err !== 'none') fail('빈 칸 수령');
    if (SYS.game.searchDrop(g).err !== 'none') fail('빈 칸 버리기');
    // 버리기 — 다시 보내면 번호가 올라 **다른 결과**가 나온다
    SYS.game.searchSend(g, g.heroes[1].uid, NOW);
    const first = SYS.game.searchState(g, NOW + span).result;
    if (!SYS.game.searchDrop(g).ok || g.search !== null) fail('버리기 실패');
    SYS.game.searchSend(g, g.heroes[1].uid, NOW);
    return SYS.game.searchState(g, NOW + span).result.name.ko !== first.name.ko || fail('다시 보냈는데 같은 결과');
});
check('search: 나가 있는 영웅은 편성도 해고도 막힌다 — 마을에 없기 때문이다', () => {
    const g = newGameS(42);
    const uid = g.heroes[0].uid;
    SYS.game.toggleParty(g, uid, NOW);                      // 편성 1 에서 뺀다 — **넣기**가 막히는지 보는 단정이다 (ADR-0227)
    SYS.game.searchSend(g, uid, NOW);
    if (SYS.game.toggleParty(g, uid, NOW).err !== 'searching') fail('편성이 안 막혔다');
    if (SYS.game.dismiss(g, uid).err !== 'searching') fail('해고가 안 막혔다');
    SYS.game.searchDrop(g);
    return SYS.game.toggleParty(g, uid, NOW).ok || fail('버렸는데도 편성이 막힌다');
});
check('dismissState: 해고와 같은 판정 · 상태를 안 바꾼다 — 원정 중 · 수색 중 · 장비 · 통과 · 없음 · 마지막 한 명 (SCREEN_DESIGN §6 해고 창 · 부채 #56)', () => {
    const judge = (g, uid, want, what) => {
        const snap = JSON.stringify(g);
        const s = SYS.game.dismissState(g, uid);
        if (JSON.stringify(g) !== snap) fail(`${what}: dismissState 가 상태를 바꿨다`);
        if (s.err !== want || s.canDismiss !== (want === null)) fail(`${what}: 판정 ${JSON.stringify(s)} — err ${want} 이어야`);
        const r = SYS.game.dismiss(structuredClone(g), uid);
        if ((r.ok ? null : r.err) !== want) fail(`${what}: 해고는 ${JSON.stringify(r)} — 판정과 갈렸다`);
    };
    const bare = (g, h) => { for (const [pos, uid] of Object.entries(h.equipped)) if (uid) SYS.game.unequip(g, h.uid, pos); };
    // 원정 — 장비를 걸친 채 싸우는 영웅은 `equipped` 가 아니라 `running` 이다(옛 창은 장비 문장을 띄웠다)
    const run = newGameS(42);
    const [fighter] = SYS.game.partyOf(run);
    const d = SYS.game.departRun(run, 101, NOW);
    if (!d.ok) fail(`출발 ${d.err}`);
    judge(run, fighter, 'running', '원정');
    // 수색 — 장비를 걸쳐도 `searching` 이 먼저다
    const out = newGameS(42);
    const scout = out.heroes[0].uid;
    SYS.game.toggleParty(out, scout, NOW);
    const sent = SYS.game.searchSend(out, scout, NOW);
    if (!sent.ok) fail(`수색 ${sent.err}`);
    judge(out, scout, 'searching', '수색');
    // 장비 → 다 벗으면 통과 · 없는 영웅 · 마지막 한 명
    const g = newGameS(7);
    const [h] = g.heroes;
    judge(g, h.uid, 'equipped', '장비');
    bare(g, h);
    judge(g, h.uid, null, '통과');
    judge(g, 'nope', 'missing', '없음');
    for (const x of g.heroes.slice(1)) { bare(g, x); SYS.game.dismiss(g, x.uid); }
    if (g.heroes.length !== 1) fail(`한 명만 남아야 하는데 ${g.heroes.length}명`);
    judge(g, h.uid, 'last', '마지막');
    return '원정 · 수색 · 장비 · 통과 · 없음 · 마지막 — 여섯이 해고와 같다';
});
check('nextRepeat: 반복 + 이긴 런이면 같은 스테이지 · 같은 편성으로 끝난 순간 + repeat_restart_sec · 반복 꺼짐 · 짐 · 도는 중 · 원정 없음은 null · 상태를 안 바꾼다 (ADR-0300 · 부채 #57)', () => {
    const g = newGameS(42);
    const END = NOW + 90_000;
    if (SYS.game.nextRepeat(g, END, 1) !== null) fail('원정이 없는데 다음 출발이 섰다');
    const d = SYS.game.departRun(g, 101, NOW);
    if (!d.ok) fail(`출발 ${d.err}`);
    g.runs[0].repeat = true;
    if (SYS.game.nextRepeat(g, END, 1) !== null) fail('도는 중인데 다음 출발이 섰다');
    // 끝난 런을 손으로 세운다 — 이긴 판 · 진 판 둘 다 봐야 하는데 시작 파티의 승패는 밸런스가 정한다
    const rep = g.reports.find(r => r.at === g.runs[0].lastAt);
    g.runs[0].active = false; rep.reason = 'clear'; rep.won = true;
    const snap = JSON.stringify(g);
    const nx = SYS.game.nextRepeat(g, END, 1);
    if (JSON.stringify(g) !== snap) fail('nextRepeat 가 상태를 바꿨다');
    if (!nx || nx.stageId !== 101 || nx.preset !== g.runs[0].preset || nx.at !== END + B.repeat_restart_sec * 1000) fail(`다음 출발 ${JSON.stringify(nx)}`);
    rep.won = false; rep.reason = 'wipe';
    if (SYS.game.nextRepeat(g, END, 1) !== null) fail('진 런인데 다음 출발이 섰다');
    rep.won = true; rep.reason = 'clear'; g.runs[0].repeat = false;
    if (SYS.game.nextRepeat(g, END, 1) !== null) fail('반복이 꺼졌는데 다음 출발이 섰다');
    return `끝난 순간 + ${B.repeat_restart_sec}초 · 반복 꺼짐 · 짐 · 도는 중 · 원정 없음 → null`;
});
check('nextRepeat: 반복 원정은 처음부터 열려 있다 — 새 게임(원정 r1)도 이긴 런은 다음 출발이 선다 · 건물 어휘에 없다 · 편성 수는 건물이 안 늘린다 (2026-09-24 사용자 지시 · R152)', () => {
    const g = SYS.game.newGame(42, cands, NOW);
    let threw = false;
    try { SYS.game.hasFeature(g, 'repeat'); } catch { threw = true; }
    if (!threw) fail('반복 원정이 아직 건물이 여는 기능이다');
    const d = SYS.game.departRun(g, 101, NOW);
    if (!d.ok) fail(`출발 ${d.err}`);
    const rep = g.reports.find(r => r.at === g.runs[0].lastAt);
    g.runs[0].active = false; g.runs[0].repeat = true; rep.reason = 'clear'; rep.won = true;
    if (!SYS.game.nextRepeat(g, NOW, 1)) fail(`새 게임(원정 r${g.buildings.expedition})인데 다음 출발이 안 선다`);
    if (SYS.game.needOf('presets') !== null) fail('편성 수를 늘리는 건물 랭크가 있다');
    if (g.presets.length !== B.party_preset_count || SYS.game.limitsOf(newGameS(42)).presets !== B.party_preset_count) fail('편성 수가 balance 값이 아니다');
    return `원정 r${g.buildings.expedition} 에서 반복 · 편성 ${B.party_preset_count} (건물 무관)`;
});
/*
 * 장은 원정 랭크가 연다 [2026-09-24 사용자 지시 · R152 · construction_draft §2] — 원정 r n = n−1 장 보스 클리어 → n 장 · 비용은 골드만.
 *   보스를 깨도 다음 장 첫 스테이지는 안 열린다 · 원정 r2 를 지으면 열린다 · 잠긴 장은 「원정 n랭크 필요」(`needOf('chapters', n)`)
 */
check('chapter: 보스를 깨도 다음 장은 원정 랭크가 연다 — 원정 r n = n 장 · 문턱은 앞 장 보스 · 비용은 골드만 · 랭크 줄은 「n장까지」 누적 (R152)', () => {
    const g = SYS.game.newGame(43, cands, NOW);
    if (SYS.game.limitsOf(g).chapters !== 1 || !SYS.game.chapterOpen(g, 1) || SYS.game.chapterOpen(g, 2)) fail(`새 게임 장 ${SYS.game.limitsOf(g).chapters}`);
    g.progress.cleared = D.stageOrder.filter(id => D.stages[id].chapter === 1);
    const first2 = D.stageOrder.find(id => D.stages[id].chapter === 2);
    if (SYS.game.stageUnlocked(g, first2)) fail('1장 보스만 깼는데 2장이 열렸다');
    if (SYS.game.canDepart(g, first2, NOW) !== 'locked') fail(`잠긴 장 출발 ${SYS.game.canDepart(g, first2, NOW)}`);
    const exp = SYS.construction.list.find(b => b.id === 'expedition');
    for (let n = 2; n <= exp.maxRank; n++) {
        const w = SYS.game.needOf('chapters', n);
        if (w?.id !== 'expedition' || w.rank !== n) fail(`${n}장을 여는 곳 ${JSON.stringify(w)}`);
        const info = SYS.construction.rankInfo('expedition', n);
        const boss = D.stageOrder.filter(id => D.stages[id].chapter === n - 1).at(-1);
        if (!eq(info.require.map(c => `${c.kind}:${c.ref}`), [`stage:${boss}`])) fail(`원정 r${n} 문턱 ${JSON.stringify(info.require)} — ${n - 1}장 보스(${boss})여야 한다`);
        if (info.cost.some(c => c.res !== 'gold')) fail(`원정 r${n} 비용에 골드 밖의 재화 ${JSON.stringify(info.cost)}`);
    }
    g.resources.gold = 1e6;
    const r = SYS.game.construct(g, 'expedition');
    if (!r.ok || !SYS.game.stageUnlocked(g, first2)) fail(`원정 r2 를 지었는데 2장이 안 열렸다 ${JSON.stringify(r)}`);
    const row = SYS.game.constructionState(g).buildings.find(b => b.id === 'expedition').ranks.map(x => x.effects.find(e => e.target === 'chapters')?.total);
    if (!eq(row, Array.from({ length: exp.maxRank }, (_, i) => i + 1))) fail(`랭크 줄의 누적 장 ${JSON.stringify(row)}`);
    return `원정 r1 ~ r${exp.maxRank} = 1 ~ ${exp.maxRank}장 · 문턱 = 앞 장 보스 · 골드만`;
});
check('chapter: 반복 원정 · 위험도가 빠진 물약 칸 둘은 창고가 연다 — 원정 랭크는 물약 칸을 안 늘린다 (R152)', () => {
    const adds = id => Array.from({ length: SYS.construction.list.find(b => b.id === id).maxRank }, (_, i) => SYS.construction.rankInfo(id, i + 1).effects)
        .flatMap((es, i) => es.filter(e => e.target === 'potionSlots').map(() => i + 1));
    if (adds('expedition').length) fail(`원정이 물약 칸을 연다 r${adds('expedition')}`);
    if (!eq(adds('storage'), [2, 5])) fail(`창고의 물약 칸 랭크 ${JSON.stringify(adds('storage'))} — r2 · r5 여야 한다`);
    const g = SYS.game.newGame(44, cands, NOW);
    const s0 = SYS.game.stageLevelState(g, 101);
    if (!s0 || 'open' in s0) fail(`위험도 상태에 잠금 칸이 남았다 ${JSON.stringify(s0)}`);
    return '창고 r2 · r5 · 위험도 · 반복은 건물 밖';
});
check('buildSystems: 바꿔 끼운 데이터만 읽는다 — 등급 표를 한 등급만 굴리게 바꾸면 후보가 전부 그 등급이다 (전역 D 누수 회귀 · 부채 #58)', () => {
    const rollable = D.heroTiers.filter(t => t.weight > 0);
    if (rollable.length < 2) fail('굴리는 등급이 둘 미만이라 누수를 가를 수 없다');
    const only = rollable.reduce((a, t) => (t.weight < a.weight ? t : a)).id;   // 가장 드문 등급 — 전역 표로 굴리면 여섯이 다 이것일 리 없다
    const S = buildSystems({ ...D, heroTiers: D.heroTiers.map(t => ({ ...t, weight: t.id === only ? 1 : 0 })) });
    const got = S.hero.rollCandidates(makeRng(3), 6).map(h => h.tier);
    if (!got.every(x => x === only)) fail(`후보 등급 ${got.join(' · ')} — ${only} 만 나와야 한다(전역 표를 읽었다)`);
    return `${only} × ${got.length}`;
});
check('limitsOf: 상한은 한 곳이 답한다 — balance 기본값 + 지어진 건물 랭크의 더하기 · 새 게임(null)은 시작 랭크 · 편성 · 물약 칸 · 강화 · 고용 후보 판정이 이 값을 따른다 (2026-09-22 구조 감사 · R137)', () => {
    const base = {
        bag: B.inventory_cap, stash: B.stash_cap, roster: B.roster_cap, party: B.party_size_max, presets: B.party_preset_count,
        expeditions: B.concurrent_expedition_parties,
        potionSlots: B.potion_slot_max, upgrade: B.equip_upgrade_max, tavernCandidates: B.tavern_candidates, searchSlots: B.tavern_search_slots,
        shopPerSlot: B.shop_equip_per_slot, shopWeapon: B.shop_equip_weapon, makeLevels: 0, potionTier: 0, tacticSlots: 0,
        gambleStakes: B.gamble_stake_steps,   // 도박장 판돈 단계 (2026-09-24 · R149)
        chapters: 0,   // 들어갈 수 있는 장 — 원정 랭크만 연다 (2026-09-24 · R152)
        commissionSlots: B.commission_slots,   // 동시 의뢰 — 선술집 r2 가 더한다 (2026-09-24 · R153)
    };
    // 표의 단계 셋 · 동시 의뢰만 이름이 다르다(state.js ADD_KEY) — 나머지 더하기는 같은 이름의 상한에 붙고 · 붙을 상한이 없는 것(준비 중)은 버린다
    const KEY = { make_level: 'makeLevels', potion_tier: 'potionTier', tactic_slots: 'tacticSlots', commission_slots: 'commissionSlots' };
    const expect = ranks => {
        const w = { ...base };
        for (const [k0, n] of Object.entries(SYS.construction.opened(ranks).adds)) { const k = KEY[k0] ?? k0; if (k in w) w[k] += n; }
        w.expeditions = Math.min(w.expeditions, w.presets);   // 부대는 편성 하나에 하나다 (v38 · 다부대)
        return w;
    };
    const raw = SYS.game.newGame(42, cands, NOW);
    if (!eq(SYS.game.limitsOf(raw), expect(raw.buildings))) fail(`새 게임 limitsOf ${JSON.stringify(SYS.game.limitsOf(raw))}`);
    if (!eq(SYS.game.limitsOf(null), expect(SYS.construction.startRanks()))) fail('새 게임(null) 상한이 시작 랭크의 것이 아니다');
    const g = newGameS(42);                          // 다 지은 판
    const L = SYS.game.limitsOf(g);
    if (!eq(L, expect(g.buildings))) fail(`다 지은 판 limitsOf ${JSON.stringify(L)}`);
    if (eq(L, SYS.game.limitsOf(raw))) fail('다 지었는데 상한이 새 게임과 같다 — 더하기가 안 붙는다');
    const ps = SYS.game.presetState(g);
    if (ps.count !== L.presets || ps.slotMax !== L.potionSlots || g.presets.length !== L.presets) fail(`편성 ${ps.count} · 칸 ${ps.slotMax} · 세이브 ${g.presets.length}`);
    if (SYS.game.potionState(g).slotMax !== L.potionSlots) fail('물약 칸');
    if (SYS.game.tavernCandidates(g).length !== L.tavernCandidates) fail('고용 후보 수');
    const w = Object.values(g.heroes[0].equipped).find(Boolean);
    if (SYS.game.upgradeState(g, w).max !== L.upgrade) fail('강화 상한');
    return Object.entries(L).map(([k, v]) => `${k} ${v}`).join(' · ');
});
check('상한을 인자로 받는다 — item.upgradeCost(it, max) · battle.createRun(…, slotMax) 가 넘긴 값을 쓰고 안 주면 CSV 기본값이다 (2026-09-22)', () => {
    const g = newGameS(42);
    const w = g.items[Object.values(g.heroes[0].equipped).find(Boolean)];
    const top = { ...w, up: B.equip_upgrade_max };
    if (SYS.item.upgradeCost(top) !== null) fail('기본 상한인데 비용이 있다');
    if (!(SYS.item.upgradeCost(top, B.equip_upgrade_max + 1) > 0)) fail('상한을 올려 넘겼는데 비용이 없다');
    if (SYS.item.upgradeCost({ ...w, up: 0 }, 0) !== null) fail('상한 0 인데 비용이 있다');
    const n = B.potion_slot_max + 1, slots = Array(n).fill(null);
    let threw = false;
    try { SYS.battle.createRun(units(), 101, makeRng(1), undefined, slots); } catch { threw = true; }
    if (!threw) fail(`칸 ${n} 이 기본 상한 ${B.potion_slot_max} 을 넘는데 안 던졌다`);
    const run = SYS.battle.createRun(units(), 101, makeRng(1), undefined, slots, n);
    if (run.result.potion.max !== n) fail(`result.potion.max ${run.result.potion.max} ≠ ${n}`);
    return `강화 상한 인자 · 물약 칸 ${n} 을 넘기면 받는다`;
});
check('heroBusy: 영웅이 지금 하는 일 — run · search · null · 편성 · 해고 · 수색 판정이 같은 답을 읽는다 (2026-09-22 구조 감사)', () => {
    const g = newGameS(42);
    if (g.heroes.some(h => SYS.game.heroBusy(g, h.uid) !== null)) fail('새 게임인데 바쁜 영웅이 있다');
    if (SYS.game.heroBusy(g, 'nope') !== null) fail('없는 영웅이 바쁘다');
    const [a] = SYS.game.partyOf(g);
    if (!SYS.game.departRun(g, 101, NOW).ok) fail('출발');
    if (SYS.game.heroBusy(g, a) !== 'run') fail('원정 인원이 run 이 아니다');
    if (SYS.game.searchSend(g, a, NOW).err !== 'party' || SYS.game.searchState(g, NOW).ready.includes(a)) fail('싸우는 영웅이 수색에 섰다');
    const s = newGameS(42);
    const scout = s.heroes[0].uid;
    SYS.game.toggleParty(s, scout, NOW);
    if (!SYS.game.searchSend(s, scout, NOW).ok) fail('수색 보내기');
    if (SYS.game.heroBusy(s, scout) !== 'search') fail('수색 나간 영웅이 search 가 아니다');
    if (SYS.game.heroBusy(s, s.heroes[1].uid) !== null) fail('마을 영웅이 바쁘다');
    if (SYS.game.toggleParty(s, scout, NOW).err !== 'searching' || SYS.game.dismissState(s, scout).err !== 'searching') fail('편성 · 해고가 수색을 못 봤다');
    return 'run · search · null';
});
check('save: 수색은 세이브 버전을 안 올렸다 — 필드가 없는 세이브도 그대로 열린다', () => {
    const g = newGameS(42);
    SYS.game.searchSend(g, g.heroes[0].uid, NOW);
    const raw = JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW)));
    delete raw.search; delete raw.counters.search;          // 수색이 없던 시절의 세이브 모양
    const back = SYS.game.deserialize(raw);
    if (back.version !== SAVE_VERSION) fail(`버전이 움직였다 (${back.version})`);
    return (back.search === null && back.counters.search === 0) || fail('기본값 보정이 안 걸렸다');
});

/* ── 수색 만남 (ADR-0068 · 2026-09-09) ── */
const MEET_AT = () => Math.round(SPAN() * B.tavern_search_meet_at_pct);     // 비율 (R111)

check('csv: search_meeting/answer 무결성 — 만남마다 공통(-) 답이 있고 답이 가리키는 만남이 실재한다', () => {
    const mt = D.searchMeetings, an = D.searchAnswers;
    if (!mt.length || !an.length) fail('행이 없다');
    const ids = new Set(mt.map(m => m.meeting_id));
    if (ids.size !== mt.length) fail('meeting_id 중복');
    if (new Set(an.map(a => a.answer_id)).size !== an.length) fail('answer_id 중복');
    for (const m of mt) {
        if (!SIN_IDS.includes(m.sin)) fail(`죄종 '${m.sin}' (${m.meeting_id})`);
        if (!m.rumor_kr || !m.rumor_en || !m.prompt_kr || !m.prompt_en) fail(`빈 문구 ${m.meeting_id}`);
        const rows = an.filter(a => a.meeting_id === m.meeting_id);
        if (!rows.length) fail(`${m.meeting_id} 에 답이 없다`);
        // 공통 답이 없으면 그 죄종을 안 보낸 판에서 고를 것이 0개가 된다
        if (!rows.some(a => a.need_sin === '-')) fail(`${m.meeting_id} 에 공통(-) 답이 없다`);
        // 소문을 읽으면 맞힐 수 있어야 한다 — 만난 죄종에 먹히는 **공통** 답이 하나는 있어야 한다
        if (!rows.some(a => a.need_sin === '-' && a.hit_sin === m.sin)) fail(`${m.meeting_id} — 읽어서 맞힐 답이 없다`);
    }
    for (const a of an) {
        if (!ids.has(a.meeting_id)) fail(`없는 만남 '${a.meeting_id}' (${a.answer_id})`);
        if (a.need_sin !== '-' && !SIN_IDS.includes(a.need_sin)) fail(`need_sin '${a.need_sin}'`);
        if (!SIN_IDS.includes(a.hit_sin)) fail(`hit_sin '${a.hit_sin}'`);
        if (!a.answer_kr || !a.answer_en) fail(`빈 문구 ${a.answer_id}`);
    }
    return `만남 ${mt.length} · 답 ${an.length}`;
});
check('search: 소문은 거짓이 아니다 — 보내기 전에 본 죄종이 실제로 만나는 사람이다 (ADR-0068)', () => {
    const g = newGameS(42);
    const before = SYS.game.searchState(g, NOW).rumor;
    if (!before) fail('소문이 없다');
    // 누굴 보내든 같은 사람을 만난다 — 만남은 **회차 번호**가 정하지 보낸 사람이 정하지 않는다
    for (const uid of [g.heroes[0].uid, g.heroes[1].uid]) {
        const g2 = newGameS(42);
        SYS.game.searchSend(g2, uid, NOW);
        const after = SYS.game.searchState(g2, NOW + MEET_AT()).rumor;
        if (after.id !== before.id || after.sin !== before.sin) fail(`보낸 사람이 만남을 바꿨다 (${before.id} → ${after.id})`);
    }
    return `${before.id} (${before.sin})`;
});
check('search: 만남은 tavern_search_meet_at_pct 지점에 열린다 · 답은 그 전엔 거절된다', () => {
    const g = newGameS(42);
    SYS.game.searchSend(g, g.heroes[0].uid, NOW);
    const at = MEET_AT();
    if (SYS.game.searchState(g, NOW + at - 1).meetOpen) fail('너무 일찍 열렸다');
    if (!SYS.game.searchState(g, NOW + at).meetOpen) fail('제때 안 열렸다');
    const list = SYS.game.searchState(g, NOW + at).answers;
    if (!list.length) fail('열린 답이 없다');
    if (SYS.game.searchAnswer(g, list[0].id, NOW).err !== 'notOpen') fail('만나기 전에 답이 됐다');
    if (!SYS.game.searchAnswer(g, list[0].id, NOW + at).ok) fail('답이 안 된다');
    if (SYS.game.searchAnswer(g, list[0].id, NOW + at).err !== 'answered') fail('두 번 답했다');
    return true;
});
check('search: 맞는 죄종을 보내면 답이 하나 더 열린다 — 그 답이 전액을 깎는다 (ADR-0068 두 층)', () => {
    const g = newGameS(42);
    const meet = SYS.game.searchState(g, NOW).rumor;
    const at = MEET_AT();
    // 보낸 영웅의 죄종을 만남에 맞춰 준다 — 로스터 3명이 그 죄종을 가졌다는 보장이 없다
    const h = g.heroes[0];
    h.sin = meet.sin;
    SYS.game.searchSend(g, h.uid, NOW);
    const opened = SYS.game.searchState(g, NOW + at).answers;
    const key = opened.filter(a => a.key);
    if (key.length !== 1) fail(`열쇠 답 ${key.length}개 — 맞는 죄종을 보냈으면 정확히 하나여야 한다`);
    const r = SYS.game.searchAnswer(g, key[0].id, NOW + at);
    if (!r.ok || r.discountPct !== B.tavern_search_meet_key_pct) fail(`할인 ${M.pctNum(r.discountPct ?? NaN)}%`);
    // 안 맞는 죄종을 보내면 그 답은 **보이지도 않는다**
    const g2 = newGameS(42);
    const other = SIN_IDS.find(x => x !== meet.sin);
    g2.heroes[0].sin = other;
    SYS.game.searchSend(g2, g2.heroes[0].uid, NOW);
    if (SYS.game.searchState(g2, NOW + at).answers.some(a => a.key)) fail('안 맞는 죄종에게 열쇠 답이 보였다');
    return `${meet.sin} → 열쇠 ${M.pctNum(r.discountPct)}%`;
});
check('search: 소문만 읽어도 절반은 깎는다 · 빗나간 답은 0 이고 **벌은 없다**', () => {
    const g = newGameS(42);
    const meet = SYS.game.searchState(g, NOW).rumor;
    const at = MEET_AT();
    const other = SIN_IDS.find(x => x !== meet.sin);
    g.heroes[0].sin = other;                       // 열쇠 답이 안 열리는 판
    SYS.game.searchSend(g, g.heroes[0].uid, NOW);
    const rows = D.searchAnswers.filter(a => a.meeting_id === meet.id && a.need_sin === '-');
    const hit = rows.find(a => a.hit_sin === meet.sin), miss = rows.find(a => a.hit_sin !== meet.sin);
    if (!hit || !miss) fail('맞는 답과 빗나간 답이 둘 다 있어야 한다');
    const g2 = newGameS(42); g2.heroes[0].sin = other; SYS.game.searchSend(g2, g2.heroes[0].uid, NOW);
    if (SYS.game.searchAnswer(g2, miss.answer_id, NOW + at).discountPct !== 0) fail('빗나갔는데 깎였다');
    if (SYS.game.searchAnswer(g, hit.answer_id, NOW + at).discountPct !== B.tavern_search_meet_hit_pct) fail('맞혔는데 안 깎였다');
    // 빗나가도 결과는 그대로 온다 — 벌이 아니라 「깎을 기회를 안 쓴 것」이다
    const span = SPAN();
    g2.resources.gold = B.tavern_hire_cost * 10;
    const took = SYS.game.searchTake(g2, NOW + span);
    return (took.ok && took.cost === B.tavern_hire_cost) || fail(`빗나간 답의 값 ${took.cost}`);
});
check('search: 답은 **결과 영웅을 안 바꾼다** — 고용비만 깎는다 (rng 스트림이 갈려 있다)', () => {
    const at = MEET_AT(), span = SPAN();
    const mk = () => { const g = newGameS(42); SYS.game.searchSend(g, g.heroes[0].uid, NOW); return g; };
    const base = SYS.game.searchState(mk(), NOW + span).result;
    const g = mk();
    const list = SYS.game.searchState(g, NOW + at).answers;
    SYS.game.searchAnswer(g, list[list.length - 1].id, NOW + at);
    const after = SYS.game.searchState(g, NOW + span).result;
    return eq(base, after) || fail('답이 결과를 바꿨다 — 만남 스트림이 결과 굴림을 밀고 있다');
});
check('search: 답을 안 해도 수령된다 — 정가일 뿐 벌이 없다 (OSRS 무해 소멸 · 방치형 계약 ③)', () => {
    const g = newGameS(42);
    const span = SPAN();
    SYS.game.searchSend(g, g.heroes[0].uid, NOW);
    g.resources.gold = B.tavern_hire_cost * 10;
    const gold0 = g.resources.gold;
    const r = SYS.game.searchTake(g, NOW + span);
    if (!r.ok) fail(`수령 실패 ${r.err}`);
    if (r.cost !== B.tavern_hire_cost) fail(`값 ${r.cost} ≠ 정가`);
    return g.resources.gold === gold0 - B.tavern_hire_cost || fail('정가가 안 나갔다');
});
check('search: 열쇠 답이면 고용비가 실제로 그만큼 덜 나간다', () => {
    const g = newGameS(42);
    const meet = SYS.game.searchState(g, NOW).rumor;
    const at = MEET_AT(), span = SPAN();
    g.heroes[0].sin = meet.sin;
    SYS.game.searchSend(g, g.heroes[0].uid, NOW);
    const key = SYS.game.searchState(g, NOW + at).answers.find(a => a.key);
    SYS.game.searchAnswer(g, key.id, NOW + at);
    g.resources.gold = B.tavern_hire_cost * 10;
    const gold0 = g.resources.gold;
    const want = Math.round(B.tavern_hire_cost * (1 - B.tavern_search_meet_key_pct));   // 할인은 비율 (R111)
    const r = SYS.game.searchTake(g, NOW + span);
    if (!r.ok || r.cost !== want) fail(`값 ${r.cost} ≠ ${want}`);
    return g.resources.gold === gold0 - want || fail('깎인 값이 안 나갔다');
});

/* ── 파티 전술 (tactic_card_design §5 확정 2026-08-30) ── */
check('csv: tactic_slot 은 1부터 빈틈없이 · 문턱은 오름차순 · 가족이 칸의 두 배 이상 (전체 리롤의 후보) · 칸별 비용 컬럼은 없다', () => {
    const slots = SYS.tactic.slotList;
    if (slots.length !== D.tacticSlots.length) fail(`칸 ${slots.length} ≠ CSV ${D.tacticSlots.length}행`);
    slots.forEach((s, i) => { if (s.no !== i + 1) fail(`slot_no ${s.no}`); });
    for (let i = 1; i < slots.length; i++)
        if (slots[i].unlockTotalLevel <= slots[i - 1].unlockTotalLevel) fail(`문턱이 안 오른다 (칸 ${slots[i].no})`);
    // **가족**으로 센다 — 66행 22가족 7칸에서 행으로 세면 통과하지만 첫 배정도 리롤도 가족 단위다 (§5-5).
    //   전체 리롤은 굴리기 직전에 든 것 + 이번에 뽑은 것을 빼고 뽑으므로 칸의 두 배가 있어야 모든 칸이 새로 뽑힌다 (§5-6)
    if (SYS.tactic.families.length < slots.length * 2) fail(`가족 ${SYS.tactic.families.length} < 칸 ${slots.length} × 2`);
    // 칸별 리롤 비용은 2026-09-01 기획에서 폐기 · 2026-09-22 코드에서 삭제 — 비용은 잠근 칸 수가 정한다 (§5-6 · R28)
    if (D.tacticSlots.some(r => 'reroll_cost_gold' in r)) fail('tactic_slot.csv 에 reroll_cost_gold 가 남았다');
    return `칸 ${slots.length} · 가족 ${SYS.tactic.families.length}(행 ${D.tacticOptions.length}) · 문턱 ${slots.map(s => s.unlockTotalLevel).join('/')}`;
});
check('csv: tactic_condition — 조건 사전 (§5-8 · ⚠ 점수 임시 · R134) — 종류 6 · 있으면/없으면 · 점수 0~5 · 0 은 무조건만 · 관계는 있으면만 · 우연 비율은 0~1', () => {
    // 로드 검증은 game_logic/tactic.js 가 한다(옵션이 조건을 가리킨다) — 여기는 표 자체의 형태만 본다
    const rows = D.tacticConditions;
    if (!rows.length) fail('행이 없다');
    const CAT = ['always', 'party', 'gear', 'leader', 'formation', 'bond'];      // §5-8 조건 종류 6
    const ids = new Set();
    for (const r of rows) {
        if (!r.cond_id || ids.has(r.cond_id)) fail(`cond_id '${r.cond_id}' 가 비었거나 겹친다`);
        ids.add(r.cond_id);
        if (!CAT.includes(r.category)) fail(`${r.cond_id} 종류 '${r.category}'`);
        if (!['has', 'not'].includes(r.polarity)) fail(`${r.cond_id} polarity '${r.polarity}'`);
        if (r.category === 'bond' && r.polarity !== 'has') fail(`${r.cond_id} — 관계는 있으면만이다 (§5-8)`);
        if (!(Number.isInteger(r.score) && r.score >= 0 && r.score <= 5)) fail(`${r.cond_id} 점수 ${r.score}`);
        if ((r.score === 0) !== (r.category === 'always')) fail(`${r.cond_id} — 점수 0 은 무조건만이다`);
        if (r.chance !== '-' && !(typeof r.chance === 'number' && r.chance >= 0 && r.chance <= 1)) fail(`${r.cond_id} 우연 비율 ${r.chance} — 비율(0~1)이다`);
    }
    return `${rows.length}행 · 종류 ${[...new Set(rows.map(r => r.category))].join('/')} · 점수 ${rows.map(r => r.score).join('/')}`;
});
/** 전술 시스템을 CSV 말고 임의의 행으로 세운다 — 로드 검증을 찌를 때 쓴다 (표 셋 — 조건 사전 · 옵션 · 점수 배수 · §5-8) */
const TACTIC_WEIGHTS = { common: 70, magic: 25, rare: 5 };
const TACTIC_COST = () => ({ base: B.tactic_reroll_base_cost, lockMult: B.tactic_reroll_lock_mult });
const mkTactic = (rows, over = {}) => createTacticSystem({
    slots: D.tacticSlots, options: rows, conditions: D.tacticConditions, scores: D.tacticScores, sins: Object.keys(M.SINS),
    classes: D.classes, gradeWeights: TACTIC_WEIGHTS, rerollCost: TACTIC_COST(), ...over,
});
/**
 * 전술 칸 몇 개만 굴린다 — 나머지 열린 칸을 잠갔다가 전체 리롤 뒤 **원래 잠금으로 되돌린다** (§5-6 — 칸별 리롤은 없다).
 * 비용은 잠근 칸 수가 정하므로 부르는 쪽이 골드를 채워 둔다. 결과는 `rerollTactic` 의 것 그대로
 */
function rollOnly(g, nos) {
    const st = SYS.game.tacticState(g);
    const flip = st.slots.filter(s => s.open && !s.locked && !nos.includes(s.no)).map(s => s.no);
    for (const no of flip) SYS.game.toggleTacticLock(g, no);
    const r = SYS.game.rerollTactic(g);
    for (const no of flip) SYS.game.toggleTacticLock(g, no);
    return r;
}
/** 옵션 한 행 — 검증을 찌를 때 「나머지는 멀쩡한」 옵션을 만들어야 해서 자주 쓴다 (1행 = 가족 하나 · §5-8) */
const optRow = (id, over = {}) => ({ option_id: id, cond_id: 'always', arg: '-', stat: 'atk_pct', unit: 0.02, ...over });
/** 조건 한 행 — 조건 사전을 일부러 깨뜨릴 때 */
const condRow = (id, over = {}) => ({ cond_id: id, category: 'party', polarity: 'has', test: 'sin_same', arg: '-', n: 2, score: 2, chance: '-', ...over });

check('tactic: 옵션 · 조건 사전의 어휘 · 인자 · 기준값을 로드 시 검증한다 — 오타는 조용히 안 넘어간다 (§5-8)', () => {
    // 양성 대조 — 멀쩡한 표는 통과해야 한다. 이게 던지면 아래 「던졌다」가 전부 다른 이유로 던진 것이다
    mkTactic(D.tacticOptions);
    mkTactic([...D.tacticOptions, optRow('ok1', { cond_id: 'gear_sin3', arg: 'envy' }), optRow('ok2', { cond_id: 'leader_cls', arg: 'mage' })]);
    const badOpt = [
        ['없는 조건 id', optRow('x1', { cond_id: 'nope' })],
        ['죄종 자리에 죄종이 없다', optRow('x2', { cond_id: 'gear_sin3' })],
        ['없는 죄종', optRow('x3', { cond_id: 'gear_sin3', arg: 'nosin' })],
        ['직업 자리에 없는 직업', optRow('x4', { cond_id: 'leader_cls', arg: 'nocls' })],
        ['인자를 안 받는 조건에 인자', optRow('x5', { arg: 'wrath' })],
        ['조건이 정한 직업에 또 인자', optRow('x6', { cond_id: 'front_priest', arg: 'knight' })],
        ['기준값 0', optRow('x7', { unit: 0 })],
        ['option_id 중복', optRow(D.tacticOptions[0].option_id)],
    ];
    for (const [why, row] of badOpt) {
        let threw = false;
        try { mkTactic([...D.tacticOptions, row]); } catch { threw = true; }
        if (!threw) fail(`옵션 — ${why} 가 통과했다`);
    }
    const badCond = [
        ['조건 어휘 오타', condRow('c1', { test: 'nope' })],
        // 폐기된 어휘 — 스킬 태그 조건은 2026-09-22 삭제 · 옛 이름은 조건 사전으로 바뀌었다 (§5-8)
        ['폐기 어휘 skill_tag', condRow('c2', { test: 'skill_tag', arg: 'shout', n: 1 })],
        ['폐기 어휘 affix_sin', condRow('c3', { test: 'affix_sin', arg: 'wrath', n: 3 })],
        ['없는 종류', condRow('c4', { category: 'skill' })],
        ['polarity 오타', condRow('c5', { polarity: 'maybe' })],
        ['점수 표에 없는 점수', condRow('c6', { score: 9 })],
        ['조건부인데 점수 0', condRow('c7', { score: 0 })],
        ['관계의 없으면', condRow('c8', { category: 'bond', polarity: 'not', test: 'together', n: 10 })],
        ['cond_id 중복', condRow(D.tacticConditions[0].cond_id)],
    ];
    for (const [why, row] of badCond) {
        let threw = false;
        try { mkTactic(D.tacticOptions, { conditions: [...D.tacticConditions, row] }); } catch { threw = true; }
        if (!threw) fail(`조건 — ${why} 가 통과했다`);
    }
    const want = ['none', 'sin_kind', 'sin_same', 'cls_same', 'gear_sin', 'leader_cls', 'front_cls', 'together'];
    if (!eq(SYS.tactic.COND_KINDS.slice().sort(), want.slice().sort())) fail(`조건 어휘 ${SYS.tactic.COND_KINDS.join('/')}`);
    return `옵션 ${badOpt.length} · 조건 ${badCond.length}종 거부 · 어휘 ${SYS.tactic.COND_KINDS.join('/')}`;
});
check('tactic: 값 = 기준값 × 배수(조건의 점수, 등급) — 가족 = 옵션 한 행 · 등급 순으로 커진다 · 어려울수록 천장이 높다 (§5-8 · §5-5)', () => {
    const fams = SYS.tactic.families;
    if (fams.length !== D.tacticOptions.length) fail(`가족 ${fams.length} ≠ CSV ${D.tacticOptions.length}행`);
    if (!eq(SYS.tactic.GRADES, ['common', 'magic', 'rare'])) fail(`등급 어휘 ${SYS.tactic.GRADES.join('/')}`);
    const multOf = s => D.tacticScores.find(r => r.score === s);
    for (const f of fams) {
        const row = D.tacticOptions.find(r => r.option_id === f.id);
        const cond = D.tacticConditions.find(c => c.cond_id === row.cond_id);
        if (f.score !== cond.score) fail(`${f.id} 점수 ${f.score} ≠ 조건 ${cond.score}`);
        for (const g of SYS.tactic.GRADES) {
            // 식을 손으로 다시 세운다 — 코드와 같은 함수를 부르면 서로를 못 잡는다
            const raw = row.unit * multOf(cond.score)[g];
            const want = row.stat.endsWith('_flat') ? Math.round(raw) : Math.round(raw * 1e4) / 1e4;
            if (f.grades[g] !== want) fail(`${f.id} ${g} ${f.grades[g]} ≠ ${row.unit} × ${multOf(cond.score)[g]} = ${want}`);
        }
        for (let i = 1; i < SYS.tactic.GRADES.length; i++)
            if (!(f.grades[SYS.tactic.GRADES[i]] > f.grades[SYS.tactic.GRADES[i - 1]])) fail(`${f.id} 값이 등급 순으로 안 커진다`);
    }
    // 어려울수록 천장이 높다 — 같은 능력치 · 같은 기준값이면 점수가 높은 쪽의 레어가 더 크다
    const unitAtk = D.tacticOptions.find(r => r.option_id === 'opt_march_atk').unit;
    const atk = fams.filter(f => f.stat === 'atk_pct' && f.unit === unitAtk).sort((a, b) => a.score - b.score);
    for (let i = 1; i < atk.length; i++)
        if (atk[i].score > atk[i - 1].score && !(atk[i].grades.rare > atk[i - 1].grades.rare)) fail(`${atk[i].id} 레어가 ${atk[i - 1].id} 보다 안 크다`);
    // 무조건은 같은 등급의 조건부보다 낮다 (§5-5) — 같은 능력치 · 기준값끼리
    const base = atk.find(f => f.score === 0) ?? fail('fixture: 데미지 무조건 옵션이 없다');
    for (const f of atk) if (f.score > 0) for (const g of SYS.tactic.GRADES) if (!(f.grades[g] > base.grades[g])) fail(`${f.id} ${g} 가 무조건보다 안 크다`);
    // 배수 표를 일부러 깨뜨린다
    const sc = D.tacticScores;
    const broken = [
        ['점수 빠짐', sc.filter(r => r.score !== 3)],
        ['한 점수 안에서 등급이 안 커진다', sc.map(r => (r.score === 2 ? { ...r, rare: r.common } : r))],
        ['점수가 오르는데 배수가 준다', sc.map(r => (r.score === 4 ? { ...r, rare: sc.find(x => x.score === 3).rare - 0.1 } : r))],
        ['점수 중복', [...sc, { ...sc[0] }]],
    ];
    for (const [why, rows] of broken) {
        let threw = false;
        try { mkTactic(D.tacticOptions, { scores: rows }); } catch { threw = true; }
        if (!threw) fail(`배수 표 — ${why} 가 통과했다`);
    }
    // 등급 가중치가 없으면 로드가 멈춘다 (조용히 한쪽으로 쏠리는 것보다 낫다)
    let noWeight = false;
    try { mkTactic(D.tacticOptions, { gradeWeights: undefined }); } catch { noWeight = true; }
    if (!noWeight) fail('등급 가중치 없이 로드됐다');
    const top = fams.slice().sort((a, b) => b.score - a.score)[0];
    return `가족 ${fams.length} · ${top.id}(점수 ${top.score}) ${SYS.tactic.GRADES.map(g => top.grades[g]).join('/')}`;
});
check('tactic: 칸은 **지휘 천막 랭크**가 연다 — 열린 칸 = 더하기(tactic_slots) · 표의 칸 수에서 자른다 · 합산 레벨만으로는 안 열린다 (R137 · ~~합산 레벨이 곧장 연다~~)', () => {
    const raw = SYS.game.newGame(42, cands, NOW);
    const total = raw.heroes.reduce((a, h) => a + h.level, 0);
    const opens = g => Math.min(SYS.game.limitsOf(g).tacticSlots, SYS.tactic.slotCount);
    const st = SYS.game.tacticState(raw);
    if (st.totalLevel !== total) fail(`합산 ${st.totalLevel} ≠ ${total}`);
    if (st.open !== opens(raw)) fail(`새 게임 열린 칸 ${st.open} ≠ 더하기 ${opens(raw)}`);
    if (st.slots.some(x => !x.open && x.option)) fail('잠긴 칸이 내용을 들고 있다');
    // 레벨만 올려서는 안 열린다 — 합산 레벨은 지휘 천막 랭크의 문턱이고, 칸은 지어야 연다
    raw.heroes[0].level = 500;
    if (SYS.game.tacticState(raw).open !== st.open) fail('합산 레벨만으로 칸이 열렸다');
    const all = newGameP(42, cands, NOW);
    const st2 = SYS.game.tacticState(all);
    if (st2.open !== opens(all)) fail(`다 지은 판 ${st2.open}칸 ≠ ${opens(all)}`);
    // 잠긴 칸이 말할 자리 — 마지막 칸을 여는 랭크(needOf)
    const need = SYS.game.needOf('tactic_slots', SYS.tactic.slotCount);
    return `새 게임 ${st.open}칸 · 합산 500 이어도 ${st.open}칸 · 다 지으면 ${st2.open}칸 · 마지막 칸 = ${need ? `${need.id} ${need.rank}랭크` : '표에 없음'}`;
});
check('tactic: 첫 배정은 시드 결정론 · **등급은 전부 일반** · 가족끼리 안 겹친다 — 리롤이 다른 칸을 흔들지 않는다 (§5-5)', () => {
    const G2 = newGameP(42, cands, NOW);
    G2.heroes[0].level = 500;                     // 전 칸 개방
    const ids = () => SYS.game.tacticState(G2).slots.map(x => x.option.id);
    const a = ids();
    if (!eq(a, ids())) fail('같은 상태에서 다른 배정이 나온다');
    // 중복 판정의 단위는 **가족**이다 — 등급으로 갈라 세면 같은 stat 이 두 칸에서 곱해진다
    if (new Set(a).size !== a.length) fail(`첫 배정에 같은 가족 중복 ${a.join(',')}`);
    // 첫 배정은 언제나 일반 — 시드 운이 초반 격차를 만들지 않는다
    const grades = SYS.game.tacticState(G2).slots.map(x => x.option.grade);
    if (grades.some(g => g !== 'common')) fail(`첫 배정에 일반이 아닌 등급 ${grades.join(',')}`);
    // 나머지를 잠그고 3번 칸만 굴리면 잠근 칸은 그대로다 — 통제성은 잠금이 든다 (§5-6 · 인과를 읽을 수 있어야 한다)
    G2.resources.gold = 999_999;
    if (!rollOnly(G2, [3]).ok) fail('3번 칸만 굴리기 거절');
    const b = ids();
    if (b[2] === a[2]) fail('리롤인데 같은 것이 나왔다');
    if (!eq(a.filter((_, i) => i !== 2), b.filter((_, i) => i !== 2))) fail('잠근 칸이 흔들렸다');
    if (new Set(b).size !== b.length) fail('리롤이 칸끼리 겹치게 만들었다');
    return `${a.length}칸 · 3번 ${a[2]} → ${b[2]}`;
});
check('tactic: 리롤 비용 = 기본가 × 배수 ^ 잠근 칸 수 · 골드 게이트는 아무것도 안 바꾼다 · 전부 잠그면 allLocked (§5-6 · 결과 코드 INTERFACE §3)', () => {
    const G2 = newGameP(42, cands, NOW);
    G2.heroes[0].level = 500;                     // 전 칸 개방
    const want = n => Math.round(B.tactic_reroll_base_cost * B.tactic_reroll_lock_mult ** n);
    // 잠글 때마다 곱으로 오른다 — 잠근 칸 수 0 부터 전부까지
    const costs = [];
    for (let n = 0; n <= SYS.tactic.slotCount; n++) {
        const st = SYS.game.tacticState(G2);
        if (st.lockedCount !== n) fail(`잠근 칸 ${st.lockedCount} ≠ ${n}`);
        if (st.rerollCost !== want(n)) fail(`잠금 ${n} 비용 ${st.rerollCost} ≠ ${want(n)}`);
        costs.push(st.rerollCost);
        if (n < SYS.tactic.slotCount && !SYS.game.toggleTacticLock(G2, n + 1).locked) fail(`${n + 1}번 칸이 안 잠겼다`);
    }
    for (let i = 1; i < costs.length; i++) if (!(costs[i] >= costs[i - 1])) fail(`잠글수록 싸졌다 ${costs.join('/')}`);
    // 전부 잠그면 굴릴 칸이 없다 — 골드가 넘쳐도 거절 · 버튼이 꺼진다(canReroll)
    G2.resources.gold = 99_999_999;
    const all = SYS.game.rerollTactic(G2);
    if (all.err !== 'allLocked' || SYS.game.tacticState(G2).canReroll) fail(`전부 잠갔는데 ${JSON.stringify(all)}`);
    // 하나만 풀면 그 칸만 굴러간다 — 비용은 잠근 칸(전부 − 1) 몫
    SYS.game.toggleTacticLock(G2, 4);
    const before = JSON.stringify(G2.presets[G2.preset - 1].tactics.slots), c0 = G2.counters.tactic;
    const cost = SYS.game.tacticState(G2).rerollCost;
    G2.resources.gold = cost - 1;
    if (SYS.game.rerollTactic(G2).err !== 'gold') fail('골드 게이트');
    if (G2.resources.gold !== cost - 1 || G2.counters.tactic !== c0 || JSON.stringify(G2.presets[G2.preset - 1].tactics.slots) !== before)
        fail('거절된 리롤이 골드 · 카운터 · 칸을 건드렸다');
    G2.resources.gold = cost;
    const r = SYS.game.rerollTactic(G2);
    if (!r.ok || r.cost !== cost || G2.resources.gold !== 0) fail(`리롤 후 골드 ${G2.resources.gold} · ${JSON.stringify(r)}`);
    if (!eq(r.rolled.map(x => x.no), [4])) fail(`굴린 칸 ${r.rolled.map(x => x.no)} (4 만이어야)`);
    const saved = G2.presets[G2.preset - 1].tactics.slots[4];     // 고른 편성의 칸에 남는다 (R129)
    if (!saved || saved.id !== r.rolled[0].option.id || saved.grade !== r.rolled[0].option.grade) fail(`세이브에 (가족, 등급)이 안 남았다 ${JSON.stringify(saved)}`);
    if (!SYS.tactic.GRADES.includes(saved.grade)) fail(`리롤이 낸 등급 '${saved.grade}'`);
    return `비용 ${costs.join(' / ')} · 전부 잠금 거절 · 한 칸 ${cost}G`;
});
check('tactic: 잠금은 무료 · rng · 카운터를 안 탄다 · 안 열린 칸은 못 잠근다 · 편성마다 따로 · 세이브 왕복 (§5-6 · INTERFACE §2-7)', () => {
    let G2 = SYS.game.newGame(42, cands, NOW);    // 새 게임 — 지휘 천막이 1랭크라 뒤 칸은 안 열렸다 (R137)
    const st = SYS.game.tacticState(G2);
    const shut = st.slots.find(s => !s.open) ?? fail('fixture: 안 열린 칸이 없다');
    if (SYS.game.toggleTacticLock(G2, shut.no).err !== 'locked') fail('안 열린 칸이 잠겼다');
    if (SYS.game.toggleTacticLock(G2, 99).err !== 'missing') fail('없는 칸이 잠겼다');
    G2 = openAll(G2);                             // 전 칸 개방 · 편성 여럿
    const gold0 = G2.resources.gold, c0 = G2.counters.tactic;
    const on = SYS.game.toggleTacticLock(G2, 3), on2 = SYS.game.toggleTacticLock(G2, 1);
    if (!on.ok || !on.locked || !on2.locked) fail(`잠그기 ${JSON.stringify(on)}`);
    if (!eq(G2.presets[G2.preset - 1].tactics.locked, [1, 3])) fail(`잠근 칸 목록 ${G2.presets[G2.preset - 1].tactics.locked} (오름차순이어야)`);
    if (G2.resources.gold !== gold0 || G2.counters.tactic !== c0) fail('잠금이 골드나 카운터를 건드렸다');
    if (!SYS.game.tacticState(G2).slots[2].locked) fail('tacticState 가 잠금을 안 싣는다');
    // 편성마다 — 편성 2 는 안 잠겼다
    if (SYS.game.tacticState(G2, undefined, 2).lockedCount !== 0) fail('편성 1 의 잠금이 편성 2 로 샜다');
    // 세이브 왕복 — 잠금이 남는다 · 다시 누르면 풀린다
    const back = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(G2, NOW))));
    if (!eq(back.presets[back.preset - 1].tactics.locked, [1, 3])) fail('세이브 왕복에서 잠금이 사라졌다');
    if (SYS.game.toggleTacticLock(G2, 3).locked) fail('다시 눌렀는데 안 풀렸다');
    if (!eq(G2.presets[G2.preset - 1].tactics.locked, [1])) fail(`풀린 뒤 ${G2.presets[G2.preset - 1].tactics.locked}`);
    return `안 열린 칸 ${shut.no} 거절 · 잠금 [1,3] → 풀기 [1] · 골드 · 카운터 그대로`;
});
check('tactic: 전체 리롤 — 안 잠근 칸을 한 번에 · 판 안에서 안 겹치고 직전 옵션도 안 나온다 · 카운터 1회 · 한 rng 로 칸 번호 오름차순 (§5-6 · INTERFACE §5-2)', () => {
    const G2 = newGameP(42, cands, NOW);
    G2.heroes[0].level = 500;                     // 전 칸 개방
    G2.resources.gold = 99_999_999;
    const ids = () => SYS.game.tacticState(G2).slots.map(x => x.option.id);
    const a = ids();
    SYS.game.toggleTacticLock(G2, 2); SYS.game.toggleTacticLock(G2, 5);
    const c0 = G2.counters.tactic;
    const r = SYS.game.rerollTactic(G2);
    if (!r.ok) fail(`리롤 ${r.err}`);
    const want = SYS.tactic.slotList.map(s => s.no).filter(no => no !== 2 && no !== 5);
    if (!eq(r.rolled.map(x => x.no), want)) fail(`굴린 칸 ${r.rolled.map(x => x.no)} ≠ ${want}`);
    if (G2.counters.tactic !== c0 + 1) fail(`카운터 ${c0} → ${G2.counters.tactic} (한 번만 올라야)`);
    const b = ids();
    if (b[1] !== a[1] || b[4] !== a[4]) fail('잠근 칸이 굴러갔다');
    for (const no of want) if (a.includes(b[no - 1])) fail(`${no}번 칸에 직전 판의 옵션 ${b[no - 1]} 이 나왔다`);
    if (new Set(b).size !== b.length) fail(`판 안에 같은 가족 ${b.join(',')}`);
    // rng 계약 — 시드 하나 · 카운터 + 1 · 칸 번호 오름차순으로 pickMany. 제외는 굴리기 직전 판 전부
    const again = SYS.tactic.pickMany(makeRng(deriveSeed(G2.seed ^ 0x7AC7, c0 + 1)), want.length, a);
    if (!eq(again, r.rolled.map(x => ({ id: x.option.id, grade: x.option.grade })))) fail('같은 시드 · 카운터로 다시 뽑았더니 다르다 — rng 순서가 계약과 어긋난다');
    return `잠금 2·5 · 굴린 칸 ${want.join(',')} · 카운터 +1`;
});
check('tactic: 조건이 참일 때만 효과가 전투 능력치에 합류한다 · **벤치는 안 받는다** (§1 파티 단위)', () => {
    const G2 = newGameP(42, cands, NOW);
    // 만렙까지만 — HP 가 구간 표를 읽어 만렙 밖 레벨은 computeCombat 이 던진다 (R84). 칸은 합산 레벨이 연다
    G2.heroes[0].level = B.hero_level_cap;
    // 조건 없는 옵션(always)만 남기고 나머지 칸은 조건이 거짓인 옵션으로 몰아 확인한다 —
    // 여기서는 켜진 칸의 효과 합이 그대로 시트에 오르는지만 본다
    const st = SYS.game.tacticState(G2);
    const on = st.slots.filter(x => x.open && x.active).map(x => x.option);
    const bonus = SYS.tactic.bonusOf(on);
    const h = SYS.game.heroById(G2, SYS.game.partyOf(G2)[0]);
    const withParty = SYS.game.heroCombat(G2, h);
    const bare = SYS.hero.computeCombat(h, SYS.game.heroItems(G2, h), SYS.game.codexBonus(G2));
    // 상시 피해 %는 **괄호 안의 합**으로 본다 — 최종 공격력은 반올림돼서 밑수가 작을 때 차이를 삼킨다 (§9-2)
    const pct = bonus.flat.atk_pct ?? 0;
    // 값은 비율이라 덧셈 꼬리가 남는다 (R111) — 허용치로 본다
    if (Math.abs(withParty.atk_pct_sum - bare.atk_pct_sum - pct) > 1e-12) fail(`상시 피해 % 합류 ${bare.atk_pct_sum} → ${withParty.atk_pct_sum} (기대 +${pct})`);
    if (Math.abs(withParty.crit_rate - bare.crit_rate - (bonus.flat.crit_rate ?? 0)) > 1e-12) fail('치명타 확률 채널이 안 맞는다');
    if ((bonus.dr.length > 0) !== (withParty.damage_reduction > bare.damage_reduction)) fail('피해 감소는 원천별 곱으로 들어가야 한다');
    // 벤치 영웅 — 파티 밖이라 전술이 안 붙는다
    G2.presets[G2.preset - 1].party = [SYS.game.partyOf(G2)[0]];
    const bench = G2.heroes.find(x => !SYS.game.partyOf(G2).includes(x.uid));
    const bc = SYS.game.heroCombat(G2, bench);
    const bbare = SYS.hero.computeCombat(bench, SYS.game.heroItems(G2, bench), SYS.game.codexBonus(G2));
    if (!eq(bc, bbare)) fail('벤치 영웅이 전술 효과를 받았다');
    return `켜진 칸 ${on.length} · 상시 피해 % ${bare.atk_pct_sum} → ${withParty.atk_pct_sum}`;
});
check('tactic: 조건은 편성에서 확정되는 것만 센다 — 편성을 바꾸면 카운터가 따라 움직인다 (§2-1)', () => {
    const G2 = newGameP(42, cands, NOW);
    G2.heroes[0].level = 500;
    // 첫 배정이 어느 옵션을 줄지는 시드가 정하므로, 세는 축을 보려면 그 칸에 **직접 꽂는다**.
    // `party_size` 는 2026-09-02 폐기라(§5-4) 편성을 세는 살아 있는 어휘 중 하나로 본다
    const opt = SYS.tactic.families.find(o => o.condKind === 'sin_kind') ?? fail('풀에 sin_kind 옵션이 없다');
    G2.presets[G2.preset - 1].tactics.slots[1] = { id: opt.id, grade: 'common' };
    const sins = SYS.game.partyOf(G2).map(uid => SYS.game.heroById(G2, uid).sin);
    const before = SYS.game.tacticState(G2).slots[0];
    if (before.have !== new Set(sins).size) fail(`카운터 ${before.have} ≠ 죄종 가짓수 ${new Set(sins).size}`);
    G2.presets[G2.preset - 1].party = [SYS.game.partyOf(G2)[0]];
    const after = SYS.game.tacticState(G2).slots[0];
    if (after.have !== 1) fail(`파티 1명인데 죄종 ${after.have}종`);
    if (after.have >= after.need && !after.active) fail('카운터가 문턱을 넘었는데 안 켜졌다');
    return `죄종 ${before.have}종(${before.active ? '켜짐' : '꺼짐'}) → 1종(${after.active ? '켜짐' : '꺼짐'})`;
});

check('tactic: 리롤은 가족과 등급을 **같이** 굴린다 — rng 는 가족 1회 → 등급 1회 순서로 2번 (§5-5 · INTERFACE §5-2)', () => {
    // 같은 rng 를 두 번 태워 같은 답이 나오는지(결정론) · 등급이 실제로 굴러가는지(고정이 아닌지) 둘 다 본다
    const roll = (seed, exclude = []) => SYS.tactic.pick(makeRng(seed), exclude);
    if (!eq(roll(7), roll(7))) fail('같은 시드가 다른 것을 냈다');
    const many = [];
    for (let i = 1; i <= 400; i++) many.push(roll(i));
    for (const r of many) {
        if (!SYS.tactic.familyIds.includes(r.id)) fail(`없는 가족 ${r.id}`);
        if (!SYS.tactic.GRADES.includes(r.grade)) fail(`없는 등급 ${r.grade}`);
    }
    const seen = SYS.tactic.GRADES.filter(g => many.some(r => r.grade === g));
    if (seen.length !== SYS.tactic.GRADES.length) fail(`400번 굴려 나온 등급이 ${seen.join('/')} 뿐 — 등급이 안 굴러간다`);
    // 가중치가 방향을 정한다 — 일반이 레어보다 흔해야 한다 (tactic_grade_weight_* 70/25/5)
    const n = g => many.filter(r => r.grade === g).length;
    if (!(n('common') > n('magic') && n('magic') > n('rare')))
        fail(`가중치와 반대 방향 — 일반 ${n('common')} · 매직 ${n('magic')} · 레어 ${n('rare')}`);
    // 제외는 **가족** 단위 — 등급이 달라도 같은 가족이면 안 나와야 한다
    const drop = SYS.tactic.familyIds.slice(0, SYS.tactic.familyIds.length - 1);
    for (let i = 1; i <= 30; i++) {
        const r = roll(i, drop);
        if (drop.includes(r.id)) fail(`제외한 가족 ${r.id} 가 나왔다`);
    }
    // rng 를 **2회** 쓴다 — 소비 횟수는 계약이다(같은 시드가 다른 게임이 된다 · INTERFACE §5-2)
    let used = 0;
    const probe = makeRng(11);
    SYS.tactic.pick(() => { used++; return probe(); });
    if (used !== 2) fail(`rng 소비 ${used}회 (기대 2 — 가족 1 + 등급 1)`);
    return `일반 ${n('common')} · 매직 ${n('magic')} · 레어 ${n('rare')} / 400`;
});

check('tactic: 새 조건 — 리더(편성 첫 칸) · 전열의 직업 · 장비 죄종 없으면 · 관계(같이 나간 런 수 — 출발 때 +1 · 그 런은 +1 전 값) (§5-8 · R134)', () => {
    const G2 = newGameP(42, cands, NOW);
    for (const h of G2.heroes) h.level = B.hero_level_cap;       // 전 칸 개방
    const p = G2.presets[G2.preset - 1];
    const party = SYS.game.partyOf(G2);
    const hero = uid => SYS.game.heroById(G2, uid);
    const slot1 = id => { p.tactics.slots[1] = { id, grade: 'common' }; return SYS.game.tacticState(G2).slots[0]; };
    // 리더 — 편성 첫 칸의 직업. 직업은 픽스처로 박는다(전투를 안 돌리므로 조건만 본다)
    hero(party[0]).cls = 'knight'; hero(party[1]).cls = 'priest'; hero(party[2]).cls = 'mage';
    let s1 = slot1('opt_lead_knight');
    if (!s1.active || s1.have !== 1) fail(`리더가 기사인데 ${s1.have}/${s1.need} ${s1.active}`);
    p.party = [party[1], party[0], party[2]];
    s1 = slot1('opt_lead_knight');
    if (s1.active) fail('리더를 바꿨는데 「리더가 기사」가 그대로 켜졌다');
    p.party = party.slice();
    // 전열 — 그 편성의 진형이 정한다. 사제를 뒤에 두면 꺼지고 앞에 두면 켜진다
    p.formation = { tpl: '2-1', ranks: [[party[0], party[2]], [party[1]]] };
    s1 = slot1('opt_front_priest');
    if (s1.active || s1.have !== 0) fail(`사제가 후열인데 ${s1.have} ${s1.active}`);
    p.formation = { tpl: '2-1', ranks: [[party[1], party[0]], [party[2]]] };
    s1 = slot1('opt_front_priest');
    if (!s1.active) fail('사제가 전열인데 안 켜졌다');
    // 장비 죄종 없으면 — 하나라도 들면 꺼진다 · 필요는 0
    const worn = party.flatMap(uid => Object.values(hero(uid).equipped).filter(Boolean));
    for (const iu of worn) G2.items[iu].sins = [];
    s1 = slot1('opt_gear_no_pride');
    if (!s1.active || s1.need !== 0) fail(`오만 장비가 없는데 ${s1.have}/${s1.need} ${s1.active}`);
    G2.items[worn[0]].sins = ['pride'];
    s1 = slot1('opt_gear_no_pride');
    if (s1.active || s1.have !== 1) fail(`오만 장비를 하나 들었는데 ${s1.have} ${s1.active}`);
    // 관계 — 이 인원의 키(순서 무관)로 센다 · 출발할 때 +1 · 그 런의 판정은 +1 전 값
    const key = party.slice().sort().join('|');
    G2.bonds[key] = 99;
    s1 = slot1('opt_bond_100');
    if (s1.active || s1.have !== 99 || s1.need !== 100) fail(`관계 ${s1.have}/${s1.need} ${s1.active}`);
    p.tactics.slots[2] = { id: 'opt_front_priest', grade: 'common' };   // 출발 때 켜진 칸 하나 — 원정 중 진형을 고쳐도 안 흔들리는지 본다
    const d = SYS.game.departRun(G2, 101, NOW);
    if (!d.ok) fail(`depart ${d.err}`);
    if (d.run.fixed?.bond !== 99 || G2.bonds[key] !== 100) fail(`출발 뒤 관계 — 런 ${d.run.fixed?.bond} · 세이브 ${G2.bonds[key]} (99 · 100 이어야)`);
    if (d.run.tactics.some(o => o.id === 'opt_bond_100')) fail('출발 때 99 였는데 관계 칸이 스냅숏에 들었다');
    if (!SYS.game.tacticState(G2).slots[0].active) fail('100 이 됐는데 편성의 관계 칸이 안 켜졌다');
    p.party = [party[2], party[1], party[0]];
    if (SYS.game.tacticState(G2).slots[0].have !== 100) fail('순서를 바꿨더니 같이 나간 런 수가 달라졌다');
    p.party = party.slice();
    // 원정 중에 그 편성의 진형을 고쳐도 도는 원정의 전열 조건은 출발 때 명단으로 센다
    p.formation = { tpl: '2-1', ranks: [[party[0], party[2]], [party[1]]] };
    const live = SYS.game.runTactics(G2, d.run).find(m => m.option.id === 'opt_front_priest');
    if (!live?.active) fail('원정 중 진형을 고쳤더니 도는 원정의 「전열에 사제」가 꺼졌다');
    if (SYS.game.tacticState(G2).slots[1].active) fail('편성의 칸은 지금 진형으로 세야 한다');
    return `리더 · 전열 · 없으면 · 관계 99 → 출발 → 100 · 도는 원정은 출발 때 전열`;
});

check('tactic: 칸은 편성마다 — 편성 2 에서 굴려도 편성 1 의 칸은 그대로 · 첫 배정 · 열린 칸 수는 모든 편성이 같다 (R129 · ADR-0250)', () => {
    const G2 = newGameP(42, cands, NOW);
    G2.heroes[0].level = 500;                     // 전 칸 개방
    G2.resources.gold = 999_999;
    const ids = no => SYS.game.tacticState(G2, undefined, no).slots.map(x => `${x.option.id}:${x.option.grade}`);
    const a1 = ids(1), a2 = ids(2);
    // 첫 배정은 시드 하나 — 편성마다 다르게 주면 편성 수만큼 공짜 리롤이 생긴다
    if (!eq(a1, a2)) fail('첫 배정이 편성마다 다르다');
    if ('tactics' in G2) fail('새 게임에 최상위 tactics 가 있다');
    SYS.game.selectPreset(G2, 2);
    if (!eq(SYS.game.tacticState(G2), SYS.game.tacticState(G2, undefined, 2))) fail('기본값이 고른 편성이 아니다');
    const r = rollOnly(G2, [3]);
    if (!r.ok) fail(`리롤 ${r.err}`);
    const b1 = ids(1), b2 = ids(2);
    if (!eq(b1, a1)) fail('편성 2 에서 굴렸는데 편성 1 의 칸이 바뀌었다');
    if (b2[2] === a2[2]) fail('편성 2 의 3번 칸이 안 바뀌었다');
    if (!eq(b2.filter((_, i) => i !== 2), a2.filter((_, i) => i !== 2))) fail('편성 2 의 다른 칸이 흔들렸다');
    if (G2.presets[0].tactics.slots[3] || !G2.presets[1].tactics.slots[3]) fail(`세이브 자리 ${JSON.stringify(G2.presets.map(p => p.tactics))}`);
    const opens = G2.presets.map((_, i) => SYS.game.tacticState(G2, undefined, i + 1).open);
    if (new Set(opens).size !== 1) fail(`열린 칸 수가 편성마다 다르다 ${opens}`);
    return `편성 2 의 3번 ${a2[2]} → ${b2[2]} · 편성 1 그대로 · 열린 칸 ${opens[0]} × ${opens.length}`;
});
check('tactic: 원정은 **나간 편성의** 전술 칸으로 싸운다 — 다른 편성을 골라 두어도 전투가 한 글자도 안 다르다 (R129 · ADR-0250)', () => {
    const strong = { id: 'opt_march_aspd', grade: 'rare' };
    if (!SYS.tactic.optionOf(strong)) fail('fixture: opt_march_aspd 가 표에 없다');
    const fight = (pick, copyToOne = false) => {
        const g = newGameP(42, cands, NOW);
        for (const h of g.heroes) h.level = B.hero_level_cap;
        g.presets[1].tactics.slots[1] = { ...strong };           // 편성 2 에만 센 칸
        if (copyToOne) g.presets[0].tactics.slots[1] = { ...strong };
        const party = SYS.game.partyOf(g, 1);
        if (!copyToOne && JSON.stringify(SYS.game.tacticBonus(g, party, 1)) === JSON.stringify(SYS.game.tacticBonus(g, party, 2)))
            fail('fixture: 두 편성의 전술 효과가 같다');
        SYS.game.selectPreset(g, pick);
        const d = SYS.game.departRun(g, 101, NOW, 1);            // 나가는 것은 늘 편성 1
        if (!d.ok) fail(`depart ${d.err}`);
        while (!SYS.game.advanceRun(g, d.run, NOW).done);
        return JSON.stringify(d.run.result.timeline);
    };
    const home = fight(1), away = fight(2);
    if (away !== home) fail('편성 2 를 골라 두었더니 편성 1 의 원정이 편성 2 의 칸으로 싸웠다');
    // 헛돌지 않는다 — 같은 칸을 편성 1 에 꽂으면 전투가 달라져야 표본이 칸을 읽는 길을 탄 것이다
    if (fight(1, true) === home) fail('fixture: 전술 칸이 전투를 안 바꾼다 — 비교가 헛돈다');
    return `편성 2 선택 중 편성 1 출발 = 편성 1 선택 중 출발 · 칸을 옮기면 전투가 갈린다`;
});

/* ── 건설 — 건물 랭크가 기능을 연다 (construction_draft §11 · INTERFACE §2-14 · R137) ──
   단정은 **지어낸 작은 표**로 잰다 — 진짜 표의 내용은 초안이고 기획이 바꾼다(그때마다 단정이 깨지면 안 된다). 진짜 표는 「불러와지고 새 게임이 선다」만 본다 */
const conRows = (over = {}) => ({
    buildingRows: [
        { building_id: 'a', name_kr: '가', name_en: 'A', tab: '-', start_rank: 1, sort_order: 1 },
        { building_id: 'b', name_kr: '나', name_en: 'B', tab: '-', start_rank: 0, sort_order: 2 },
    ],
    buildingRankRows: [
        { building_id: 'a', rank: 1, require: '-', cost: '-', status: 'proposed' },
        { building_id: 'a', rank: 2, require: 'stage:101', cost: 'gold:100', status: 'proposed' },
        { building_id: 'a', rank: 3, require: 'total:5|building:b:1', cost: 'gold:100|dust:5', status: 'proposed' },
        { building_id: 'b', rank: 1, require: '-', cost: 'gold:50', status: 'proposed' },
        { building_id: 'b', rank: 2, require: '-', cost: '-', status: 'proposed' },
    ],
    buildingEffectRows: [
        { building_id: 'a', rank: 1, kind: 'unlock', target: 'expedition', value: '-', status: 'proposed' },
        { building_id: 'a', rank: 2, kind: 'unlock', target: 'search', value: '-', status: 'proposed' },
        { building_id: 'a', rank: 3, kind: 'add', target: 'bag', value: 6, status: 'proposed' },
        { building_id: 'b', rank: 1, kind: 'add', target: 'bag', value: 4, status: 'proposed' },
        { building_id: 'b', rank: 2, kind: 'unlock', target: 'raid', value: '-', status: 'proposed' },   // 준비 중뿐인 랭크 (옛 `gamble` — 2026-09-24 R149 로 도박장이 열려 준비 중인 약탈로 갈았다)
    ],
    researchRows: [],
    ...over,
});
const conSys = over => buildSystems({ ...D, ...conRows(over) });

check('construction: 진짜 표 넷이 불러와진다 — 새 게임은 시작 랭크로 선다 · 연구는 빈 채 · 준비 중뿐인 랭크는 못 짓는다 (construction_draft §11 · R137)', () => {
    if (!SYS.construction.list.length) fail('건물이 없다');
    const g = SYS.game.newGame(71, cands, NOW);
    if (!eq(g.buildings, SYS.construction.startRanks())) fail(`새 게임 랭크 ${JSON.stringify(g.buildings)}`);
    if (!eq(g.research, {})) fail('연구가 비어 있지 않다');
    const st = SYS.game.constructionState(g);
    if (st.buildings.length !== SYS.construction.list.length) fail('건설 한 벌의 건물 수가 표와 다르다');
    for (const b of st.buildings)
        if (b.next.rank !== null && !b.next.effects.some(e => e.live) && b.next.err !== 'pending') fail(`${b.id} r${b.next.rank} — 준비 중뿐인데 ${b.next.err}`);
    return `건물 ${st.buildings.length} · 시작 ${Object.entries(g.buildings).map(([k, v]) => `${k} ${v}`).join(' · ')}`;
});
check('construction: 표만 바꾸면 여는 것이 바뀐다 — 수색을 다른 랭크로 옮기면 창구의 답이 따라간다 · 더하기는 모인다 · 모르는 이름은 멈춘다 (construction_draft §11-1 · §11-2)', () => {
    const S1 = conSys(), g = S1.game.newGame(72, cands, NOW);
    g.buildings = { a: 2, b: 1 };
    if (!S1.game.hasFeature(g, 'search')) fail('a r2 가 수색을 안 연다');
    const S2 = conSys({ buildingEffectRows: conRows().buildingEffectRows.map(e => (e.target === 'search' ? { ...e, rank: 3 } : e)) });
    if (S2.game.hasFeature(g, 'search')) fail('표에서 r3 으로 옮겼는데 r2 에서 열린다');
    g.buildings = { a: 3, b: 1 };
    if (!S2.game.hasFeature(g, 'search')) fail('옮긴 랭크에서 안 열린다');
    const adds = S2.construction.opened(g.buildings).adds;
    if (adds.bag !== 10) fail(`가방 더하기 ${adds.bag} ≠ 6 + 4`);
    let threw = null;
    try { S1.game.hasFeature(g, 'serach'); } catch (e) { threw = String(e.message); }
    if (!threw) fail('모르는 이름을 조용히 닫힌 기능으로 뒀다');
    return `r2 → r3 으로 옮기자 창구가 따라갔다 · 가방 +${adds.bag}`;
});
check('construction: 짓기 — 한 칸씩 · 판정 순서 missing → maxRank → pending → locked → gold → materials · 지으면 비용을 내고 랭크 +1 (INTERFACE §2-7 · R137)', () => {
    const S = conSys(), g = S.game.newGame(73, cands, NOW);
    const err = id => S.game.construct(g, id).err;
    if (err('zz') !== 'missing') fail('없는 건물');
    g.resources.gold = 0; g.resources.dust = 0;
    if (err('a') !== 'locked') fail(`a r2 — 101 을 안 깼는데 ${err('a')}`);
    g.progress.cleared = [101];
    if (err('a') !== 'gold') fail(`골드 0 인데 ${err('a')}`);
    g.resources.gold = 1000;
    const r = S.game.construct(g, 'a');
    if (!r.ok || r.rank !== 2 || g.buildings.a !== 2 || g.resources.gold !== 900) fail(`짓기 ${JSON.stringify(r)} · 골드 ${g.resources.gold}`);
    if (err('a') !== 'locked') fail('a r3 — 합산 · b 랭크가 모자란데 안 막는다');
    if (!S.game.construct(g, 'b').ok) fail('b r1');
    if (err('b') !== 'pending') fail(`b r2 는 준비 중뿐인데 ${err('b')}`);
    g.heroes.forEach(h => { h.level = 2; });           // 합산 6 ≥ 5
    if (err('a') !== 'materials') fail(`가루 0 인데 ${err('a')}`);
    g.resources.dust = 5;
    if (!S.game.construct(g, 'a').ok || g.resources.dust !== 0) fail('a r3');
    if (err('a') !== 'maxRank') fail('최대 랭크인데 더 짓는다');
    const st = S.game.constructionState(g).buildings.find(b => b.id === 'a');
    return `a ${st.rank}/${st.maxRank} · b ${g.buildings.b} · 골드 ${g.resources.gold}`;
});
check('construction: 문턱 — 합산 레벨은 도달한 최고치(해고해도 안 내려간다) · 영웅 레벨(balance 키 이름을 적으면 그 값) · 다른 건물 랭크 (construction_draft 원칙 3 · §11-3)', () => {
    const S = conSys({ buildingRankRows: [
        { building_id: 'a', rank: 1, require: '-', cost: '-', status: 'proposed' },
        { building_id: 'a', rank: 2, require: 'total:6', cost: '-', status: 'proposed' },
        { building_id: 'a', rank: 3, require: 'hero:advance_unlock_level', cost: '-', status: 'proposed' },
        { building_id: 'b', rank: 1, require: 'building:a:3', cost: '-', status: 'proposed' },
        { building_id: 'b', rank: 2, require: '-', cost: '-', status: 'proposed' },
    ] });
    const g = S.game.newGame(74, cands, NOW);
    g.heroes.forEach(h => { h.level = 2; });           // 합산 6
    const h = g.heroes[2];
    for (const pos of Object.keys(h.equipped)) if (h.equipped[pos] && !S.game.unequip(g, h.uid, pos).ok) fail('fixture: 벗기기');
    if (!S.game.dismiss(g, h.uid).ok) fail('fixture: 해고');
    if (S.game.peakTotal(g) !== 6) fail(`해고 뒤 최고치 ${S.game.peakTotal(g)} ≠ 6 (지금 합산 4)`);
    if (!S.game.construct(g, 'a').ok) fail('최고치로 r2 를 못 짓는다');
    if (S.game.construct(g, 'a').err !== 'locked') fail('영웅 레벨이 모자란데 짓는다');
    g.heroes[0].level = B.advance_unlock_level;
    if (!S.game.construct(g, 'a').ok) fail(`영웅 레벨 ${B.advance_unlock_level} 인데 못 짓는다`);
    const cond = S.game.constructionState(g).buildings.find(b => b.id === 'b').next.require[0];
    if (!(cond.kind === 'building' && cond.have === 3 && cond.ok)) fail(`b r1 조건 ${JSON.stringify(cond)}`);
    return `해고 뒤 최고치 6 · 영웅 레벨 ${B.advance_unlock_level} · a r3 → b r1 열림`;
});
check('construction: 세이브 랭크는 표에 맞춘다 — 없는 건물은 지우고 최대에서 자르고 시작 랭크보다 낮으면 올린다 · 연구도 없는 항목은 지운다 · 왕복 그대로 (INTERFACE §4 · R137)', () => {
    const S = conSys(), g = S.game.newGame(76, cands, NOW);
    const s = JSON.parse(JSON.stringify(S.game.serialize(g, NOW)));
    s.buildings = { a: 0, b: 9, gone: 2 }; s.research = { nope: 3 };
    const back = S.game.deserialize(s);
    if (!eq(back.buildings, { a: 1, b: 2 }) || !eq(back.research, {})) fail(`${JSON.stringify(back.buildings)} · ${JSON.stringify(back.research)}`);
    if (!eq(S.game.deserialize(JSON.parse(JSON.stringify(S.game.serialize(g, NOW)))).buildings, g.buildings)) fail('왕복이 랭크를 바꿨다');
    return 'a 0 → 1(시작) · b 9 → 2(최대) · gone 지움';
});
check('construction: 표를 불러올 때 멈춘다 — 모르는 대상 · 종류가 틀린 대상 · 끊긴 랭크 · 없는 스테이지 · 비용 모양 · 켜기에 값 · 없는 건물 랭크 (construction_draft §11-5)', () => {
    const base = conRows();
    const withEffect = e => ({ buildingEffectRows: [...base.buildingEffectRows, { building_id: 'a', rank: 1, status: 'proposed', ...e }] });
    const rankAt = (rank, patch) => ({ buildingRankRows: base.buildingRankRows.map(r => (r.building_id === 'a' && r.rank === rank ? { ...r, ...patch } : r)) });
    const cases = [
        ['모르는 대상', withEffect({ kind: 'unlock', target: 'serach', value: '-' })],
        ['종류가 틀린 대상', withEffect({ kind: 'add', target: 'search', value: 1 })],
        ['끊긴 랭크', { buildingRankRows: base.buildingRankRows.filter(r => !(r.building_id === 'a' && r.rank === 2)) }],
        ['없는 스테이지', rankAt(2, { require: 'stage:999' })],
        ['비용 모양', rankAt(2, { cost: 'gold:0' })],
        ['켜기에 값', { buildingEffectRows: base.buildingEffectRows.map(e => (e.target === 'search' ? { ...e, value: 1 } : e)) }],
        ['없는 건물 랭크', rankAt(3, { require: 'building:b:5' })],
    ];
    const missed = cases.filter(([, over]) => { try { conSys(over); return true; } catch { return false; } }).map(([w]) => w);
    if (missed.length) fail(`안 멈췄다: ${missed.join(' · ')}`);
    return `${cases.length}가지 모두 멈춘다`;
});
check('construction: 연구 배율 — 없으면 1 · 같은 대상의 레벨끼리 더한다 · 연구 상한은 더하기로 연다 · 모르는 대상은 멈춘다 (construction_draft §11-7)', () => {
    const research = [
        { research_id: 'g1', building_id: 'a', target: 'gold_gain', per_level: 0.02, cost: 'gold:10', name_kr: '골드', name_en: 'Gold', status: 'proposed' },
        { research_id: 'g2', building_id: 'b', target: 'gold_gain', per_level: 0.05, cost: '-', name_kr: '골드 2', name_en: 'Gold 2', status: 'proposed' },
    ];
    const S = conSys({ researchRows: research, buildingEffectRows: [...conRows().buildingEffectRows, { building_id: 'a', rank: 2, kind: 'add', target: 'research:g1', value: 5, status: 'proposed' }] });
    const g = S.game.newGame(77, cands, NOW);
    if (S.game.bonusOf(g, 'gold_gain') !== 1) fail('연구가 없는데 1 이 아니다');
    g.research = { g1: 3, g2: 1 };
    const got = S.game.bonusOf(g, 'gold_gain');
    if (Math.abs(got - (1 + 0.06 + 0.05)) > 1e-9) fail(`배율 ${got} ≠ 1.11`);
    if (S.construction.opened({ a: 2 }).adds['research:g1'] !== 5) fail('연구 상한 더하기가 안 모인다');
    let threw = false;
    try { S.game.bonusOf(g, 'gold_gian'); } catch { threw = true; }
    if (!threw) fail('모르는 연구 대상을 1 로 넘겼다');
    return `g1 ×3 + g2 ×1 → ${got.toFixed(2)} · 상한 +5`;
});

/*
 * 2단계 — 기능 자리마다 잠금 · 상한 = 기본값 + 더하기 · 짓기가 편성 · 물약 칸을 곧바로 붙인다 (R137).
 *   **지어낸 표**로 잰다 — 막히는 기능을 전부 건물 x 1랭크에 몰아 둔다(시작 랭크 0). 진짜 표의 배치는 기획이 바꾼다
 */
const gateRows = () => conRows({
    buildingRows: [
        { building_id: 'a', name_kr: '가', name_en: 'A', tab: 'expedition', start_rank: 1, sort_order: 1 },
        { building_id: 'x', name_kr: '엑스', name_en: 'X', tab: 'forge', start_rank: 0, sort_order: 2 },
    ],
    buildingRankRows: [
        { building_id: 'a', rank: 1, require: '-', cost: '-', status: 'proposed' },
        { building_id: 'x', rank: 1, require: '-', cost: 'gold:10', status: 'proposed' },
    ],
    buildingEffectRows: [
        ...['expedition', 'codex'].map(target => ({ building_id: 'a', rank: 1, kind: 'unlock', target, value: '-', status: 'proposed' })),
        { building_id: 'a', rank: 1, kind: 'add', target: 'chapters', value: 1, status: 'proposed' },   // 1장 — 장은 원정 랭크가 연다 (R152)
        ...['upgrade_item', 'make', 'potion', 'storage', 'hire', 'search', 'shop', 'shop_special']
            .map(target => ({ building_id: 'x', rank: 1, kind: 'unlock', target, value: '-', status: 'proposed' })),
        // 제작 레벨은 `make` · 물약 단계는 `potion` 이 첫 단계를 심는다(TARGETS.seed · 2026-09-24) — +1 이면 둘이다
        ...[['make_level', 1], ['potion_tier', 1], ['tactic_slots', 3], ['presets', 2], ['potionSlots', 1], ['bag', 5]]
            .map(([target, value]) => ({ building_id: 'x', rank: 1, kind: 'add', target, value, status: 'proposed' })),
    ],
});
check('construction: 기능 자리마다 잠근다 — 안 지었으면 강화 · 제작 · 물약 · 창고 넣기 · 고용 · 리롤 · 수색 · 상단이 unbuilt(또는 닫힘) · 지으면 곧바로 열린다 (INTERFACE §3 · R137 · 위험도는 R152 로 처음부터)', () => {
    const S = buildSystems({ ...D, ...gateRows() });
    const g = S.game.newGame(81, cands, NOW);
    g.resources.gold = 1e6;
    g.progress.cleared = [101, 102];
    const it = mkItem('gloves', []); it.uid = 'iG'; g.items.iG = it; g.bag.push('iG');
    const w = Object.values(g.heroes[0].equipped).find(Boolean);
    const shut = {
        upgrade: S.game.upgradeItem(g, w).err, make: S.game.makeState(g, 'ring', 1)?.err, stash: S.game.moveToStash(g, 'iG').err,
        hire: S.game.hire(g, 0).err, reroll: S.game.tavernReroll(g, NOW).err, search: S.game.searchSend(g, g.heroes[0].uid, NOW).err,
    };
    const bad = Object.entries(shut).filter(([, e]) => e !== 'unbuilt');
    if (bad.length) fail(`안 지었는데 안 막힌 자리 ${JSON.stringify(Object.fromEntries(bad))}`);
    const closed = [S.game.upgradeState(g, w).open, S.game.tavernState(g, NOW).open, S.game.searchState(g, NOW).open,
        S.game.shopState(g, NOW).open, S.game.shopState(g, NOW).special, S.game.makeLevels(g).some(l => l.open), S.game.potionState(g).list.some(p => p.craftable)];
    if (closed.some(Boolean)) fail(`닫힌 판인데 열렸다 ${JSON.stringify(closed)}`);
    if (S.game.tacticState(g).open !== 0) fail('전술 칸이 열렸다');
    if (!eq(S.game.constructionState(g).tabs, { expedition: true, forge: false })) fail(`탭 ${JSON.stringify(S.game.constructionState(g).tabs)}`);
    const L0 = S.game.limitsOf(g);
    if (g.presets.length !== L0.presets || g.presets[0].potionSlots.length !== L0.potionSlots) fail('fixture: 새 게임 편성 · 칸 수');
    // 짓는다 — 곧바로 열리고 · 상한이 더하기만큼 오르고 · 편성 · 물약 칸이 그 자리에서 늘어난다(불러오기를 기다리지 않는다)
    const r = S.game.construct(g, 'x');
    if (!r.ok) fail(`짓기 ${r.err}`);
    const L1 = S.game.limitsOf(g);
    const grew = { presets: L1.presets - L0.presets, potionSlots: L1.potionSlots - L0.potionSlots, bag: L1.bag - L0.bag, makeLevels: L1.makeLevels, potionTier: L1.potionTier, tacticSlots: L1.tacticSlots };
    if (!eq(grew, { presets: 2, potionSlots: 1, bag: 5, makeLevels: 2, potionTier: 2, tacticSlots: 3 })) fail(`더하기 ${JSON.stringify(grew)}`);
    if (g.presets.length !== L1.presets || g.presets.some(p => p.potionSlots.length !== L1.potionSlots)) fail(`짓고 난 편성 ${g.presets.length} · 칸 ${g.presets.map(p => p.potionSlots.length)}`);
    if (S.game.tacticState(g).open !== Math.min(3, S.tactic.slotCount)) fail(`전술 칸 ${S.game.tacticState(g).open}`);
    if (!eq(S.game.makeLevels(g).map(l => l.open).slice(0, 3), [true, true, false])) fail('제작 레벨이 앞에서부터 둘만 열려야 한다');
    if (!eq(S.game.potionState(g).list.map(p => p.craftable).slice(0, 3), [true, true, false])) fail('물약 단계가 앞에서부터 둘만 열려야 한다');
    const open = [S.game.upgradeItem(g, w).ok, S.game.hire(g, 0).ok, S.game.setAutoSalvage(g, { rarity: 'normal' }).ok, S.game.moveToStash(g, 'iG').ok,
        S.game.setStageLevel(g, 101, D.stages[102].dlvl).ok, S.game.shopState(g, NOW).special, S.game.constructionState(g).tabs.forge];
    if (!open.every(Boolean)) fail(`지었는데 안 열린 자리 ${JSON.stringify(open)}`);
    if (!S.game.moveToBag(g, 'iG').ok || !S.game.salvage(g, 'iG').ok) fail('창고 꺼내기 · 분해');
    return `안 지음 — ${Object.keys(shut).length}자리 unbuilt · 지으면 편성 +2 · 칸 +1 · 전술 ${S.game.tacticState(g).open} · 제작 레벨 2 · 물약 단계 2`;
});
check('construction: 분해 · 알아서 분해는 건물이 막지 않는다 — 진짜 표의 새 게임(제련소 안 지음)에서 분해 · 선 긋기 · 지금 적용 · 드롭 가루가 된다 (R140 · 2026-09-23 사용자 지시)', () => {
    // 켜기 대상이 아니면 `hasFeature` 가 멈춘다(INTERFACE §2-7) — 대상에서 빠졌다는 증거다. 남아 있으면 어느 자리가 다시 막을 수 있다
    for (const id of ['salvage', 'auto_salvage', 'auto_salvage_score']) {
        let threw = false;
        try { SYS.game.hasFeature(G, id); } catch { threw = true; }
        if (!threw) fail(`${id} 가 아직 건물의 켜기 대상이다`);
    }
    for (let seed = 1; seed <= 40; seed++) {
        const g = SYS.game.newGame(seed, cands, NOW);
        if (g.buildings.forge) fail('fixture: 새 게임인데 제련소가 지어져 있다');
        const it = mkItem('gloves', []); it.uid = 'iS'; g.items.iS = it; g.bag.push('iS');
        const sv = SYS.game.salvage(g, 'iS');
        if (!sv.ok) fail(`분해 ${sv.err}`);
        if (!SYS.game.setAutoSalvage(g, { ilvlBelow: 100000 }).ok) fail('선 긋기');   // 레벨 선만 — 모든 드롭이 걸린다
        const ap = SYS.game.applyAutoSalvage(g);
        if (!ap.ok) fail(`지금 적용 ${ap.err}`);
        const d = SYS.game.departRun(g, 101, NOW);
        if (!d.ok) fail(`depart ${d.err}`);
        while (!SYS.game.advanceRun(g, d.run, NOW).done);
        const R = d.run.report;
        if (!R.drops.length) continue;
        if (R.drops.some(u => g.items[u])) fail(`seed ${seed}: 제련소 없는 판에서 드롭이 선을 지나 가방에 들었다`);
        return `seed ${seed}: 분해 · 선 · 지금 적용 ok · 드롭 ${R.drops.length} 전부 가루`;
    }
    return fail('40 시드 동안 드롭이 없었다 — 시험이 헛돈다');
});
check('construction: 잠긴 자리가 말할 건물 — needOf 는 켜기면 처음 나오는 랭크 · 더하기면 쌓아 닿는 랭크 · 표에 없으면 null (INTERFACE §2-7 · R137)', () => {
    const S = conSys();                              // a r2 수색 · a r3 가방 +6 · b r1 가방 +4 · b r2 약탈(준비 중)
    const at = (target, n) => { const w = S.game.needOf(target, n); return w ? `${w.id}${w.rank}` : null; };
    const got = { search: at('search'), bag5: at('bag', 5), bag10: at('bag', 10), bag11: at('bag', 11), raid: at('raid'), craft: at('craft') };
    if (!eq(got, { search: 'a2', bag5: 'a3', bag10: 'b1', bag11: null, raid: 'b2', craft: null })) fail(JSON.stringify(got));
    if (S.game.needOf('search').name.ko !== '가') fail('이름이 없다');
    return Object.entries(got).map(([k, v]) => `${k} ${v ?? '-'}`).join(' · ');
});
check('construction: 첫 단계는 켜기가 심는다 — 제련소 r1(장비 강화 · 장비 제작)이 제작 Lv1 을 · r2(물약 제작)가 물약 1단계를 연다 · 표에 첫 단계 줄이 없고 · 잠긴 자리는 그 랭크를 말하고 · 뒤 랭크의 +1 은 그 위로 쌓인다 (TARGETS.seed · INTERFACE §2-14 · 2026-09-24 사용자 지시)', () => {
    const fx = n => SYS.construction.rankInfo('forge', n).effects.map(e => e.target);
    const r1 = fx(1), r2 = fx(2);
    if (!eq(r1, ['upgrade_item', 'make'])) fail(`제련소 r1 표 ${r1.join(' · ')} — 장비 강화 · 장비 제작 둘이어야 한다`);
    if (!eq(r2, ['potion', 'make_level'])) fail(`제련소 r2 표 ${r2.join(' · ')} — 물약 제작 · 제작 레벨 둘이어야 한다`);
    const g = SYS.game.newGame(45, cands, NOW);
    if (g.buildings.forge) fail('fixture: 새 게임인데 제련소가 지어져 있다');
    const L0 = SYS.game.limitsOf(g);
    if (L0.makeLevels !== 0 || L0.potionTier !== 0) fail(`안 지었는데 첫 단계가 섰다 ${L0.makeLevels} · ${L0.potionTier}`);
    const at = (target, n) => { const w = SYS.game.needOf(target, n); return w ? `${w.id}${w.rank}` : null; };
    const need = { lv1: at('make_level', 1), lv2: at('make_level', 2), pt1: at('potion_tier', 1), pt2: at('potion_tier', 2) };
    if (!eq(need, { lv1: 'forge1', lv2: 'forge2', pt1: 'forge2', pt2: 'forge4' })) fail(`잠긴 자리가 말할 랭크 ${JSON.stringify(need)}`);
    const got = n => { g.buildings.forge = n; const L = SYS.game.limitsOf(g); return [L.makeLevels, L.potionTier]; };
    if (!eq(got(1), [1, 0])) fail(`r1 을 지었는데 ${got(1)} — 제작 1 · 물약 0`);
    if (!eq(SYS.game.makeLevels(g).map(l => l.open).slice(0, 2), [true, false])) fail('제작 레벨이 첫 하나만 열려야 한다');
    if (SYS.game.potionState(g).list.some(p => p.craftable)) fail('r1 인데 물약을 만들 수 있다');
    if (!eq(got(2), [2, 1])) fail(`r2 를 지었는데 ${got(2)} — 제작 2 · 물약 1`);
    if (!eq(SYS.game.potionState(g).list.map(p => p.craftable).slice(0, 2), [true, false])) fail('물약이 1단계만 열려야 한다');
    const tot = SYS.game.constructionState(g).buildings.find(b => b.id === 'forge').ranks[1].effects.find(e => e.target === 'make_level')?.total;
    if (tot !== 2) fail(`r2 줄의 누적 ${tot} — 첫 단계를 포함해 2`);
    return `r1 ${r1.join(' · ')} · r2 ${r2.join(' · ')} · 제작/물약 r1 = ${got(1)} · r2 = ${got(2)} · 잠긴 자리 ${Object.values(need).join(' · ')}`;
});

/* ── 도박장 슬롯 (base_expedition_design 「도박장」 · INTERFACE §2-7 · §2-15 · 2026-09-24 · R149) ── */
/** 도박장이 열린 새 판 — 선술집 `rank` · 골드는 넉넉히(판돈 거절이 다른 단정을 가리지 않게) */
const gambleGame = (seed, rank = 3) => {
    const g = SYS.game.newGame(seed, cands, NOW);
    g.buildings.tavern = rank;
    g.resources.gold = 1e9;
    return g;
};

check('gamble: 표 넷이 불러와진다 — 판 = 릴 × 행 · 라인 칸 수 = 릴 · 판돈 단계는 1 부터 · 판이 찼을 때의 코인은 굴림에 안 나온다 (INTERFACE §2-15)', () => {
    const GB = SYS.gamble;
    if (GB.reels !== B.gamble_reels || GB.rows !== B.gamble_rows) fail(`판 크기 ${GB.reels}×${GB.rows}`);
    if (!GB.lines.length || GB.lines.some(l => l.cells.length !== GB.reels)) fail('라인 칸 수');
    if (GB.stakes[0]?.step !== 1) fail('판돈 단계가 1 부터가 아니다');
    if (GB.coins.find(c => c.id === GB.fill)?.weight !== 0) fail('판이 찼을 때의 코인이 굴림에 나온다');
    return `${GB.reels}×${GB.rows} · 라인 ${GB.lines.length} · 심볼 ${GB.symbols.length} · 코인 ${GB.coins.length} · 판돈 ${GB.stakes.length}단계`;
});
check('gamble: 라인 판정 — 셋이 같으면 맞는다 · 와일드가 대신 선다 · 코인이 끊는다 · 다 와일드면 와일드 (INTERFACE §2-15)', () => {
    const GB = SYS.gamble, line = GB.lines[0];
    const lineSyms = GB.symbols.filter(s => s.kind === 'line').map(s => s.id);
    const [a, b] = lineSyms;
    const wild = GB.symbols.find(s => s.kind === 'wild').id, coin = GB.symbols.find(s => s.kind === 'coin').id;
    // 나머지 칸은 두 심볼을 번갈아 — 이 라인의 칸만 덮어써서 이 라인의 판정만 본다
    const hit = ids => {
        const cells = Array.from({ length: GB.reels * GB.rows }, (_, i) => lineSyms[i % 2]);
        line.cells.forEach((c, k) => { cells[c] = ids[k]; });
        return GB.evaluate(cells).lines.find(h => h.line === line.id)?.symbol ?? null;
    };
    const row = (first, mid) => Array.from({ length: GB.reels }, (_, k) => (k === 1 ? mid : first));
    const got = { same: hit(row(a, a)), wildMid: hit(row(a, wild)), allWild: hit(row(wild, wild)), coinMid: hit(row(a, coin)), mixed: hit(row(a, b)), wildCoin: hit(row(wild, coin)) };
    if (!eq(got, { same: a, wildMid: a, allWild: wild, coinMid: null, mixed: null, wildCoin: null })) fail(JSON.stringify(got));
    return Object.entries(got).map(([k, v]) => `${k} ${v ?? '-'}`).join(' · ');
});
check('gamble: 같은 판 번호면 같은 판 — 결과를 저장하지 않아도 다시 나온다 · 다음 판은 다른 판 (INTERFACE §5-1)', () => {
    const a = gambleGame(91);
    const b = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(a, NOW))));
    const ra = SYS.game.gambleSpin(a, 1), rb = SYS.game.gambleSpin(b, 1);
    if (!ra.ok || !rb.ok) fail(`${ra.err} · ${rb.err}`);
    if (!eq(ra.spin, rb.spin)) fail('같은 세이브 · 같은 판 번호가 다른 결과를 냈다');
    const touched = g => [g.resources, g.materials, g.counters.gamble];
    if (!eq(touched(a), touched(b))) fail('같은 판 뒤의 골드 · 재료가 갈렸다');
    const rc = SYS.game.gambleSpin(a, 1);
    if (rc.spin.n !== ra.spin.n + 1) fail('판 번호가 안 오른다');
    if (eq(rc.spin.cells, ra.spin.cells) && eq(rc.spin.coinAt, ra.spin.coinAt)) fail('다음 판이 같은 판이다');
    return `판 ${ra.spin.n} · ${ra.spin.cells.join(' ')}`;
});
check('gamble: 거절 순서 unbuilt → missing → locked → gold · 거절이면 아무것도 안 바뀐다 (INTERFACE §2-7 · §3)', () => {
    const snap = g => JSON.stringify(g);
    const errs = [];
    const g0 = SYS.game.newGame(92, cands, NOW);
    delete g0.buildings.tavern;
    const s0 = snap(g0);
    errs.push(SYS.game.gambleSpin(g0, 1).err);
    if (snap(g0) !== s0) fail('unbuilt 거절이 상태를 바꿨다');
    const g = gambleGame(92);
    const openN = SYS.game.limitsOf(g).gambleStakes;
    errs.push(SYS.game.gambleSpin(g, SYS.gamble.stakes.length + 1).err);
    if (openN < SYS.gamble.stakes.length) errs.push(SYS.game.gambleSpin(g, openN + 1).err);
    else errs.push('locked');   // 표의 단계가 다 열려 있으면 이 자리를 시험할 수 없다
    const g2 = gambleGame(93);
    g2.resources.gold = 0;
    const s2 = snap(g2);
    errs.push(SYS.game.gambleSpin(g2, 1).err);
    if (snap(g2) !== s2) fail('gold 거절이 상태를 바꿨다');
    if (!eq(errs, ['unbuilt', 'missing', 'locked', 'gold'])) fail(errs.join(' · '));
    return errs.join(' → ');
});
check('gamble: 횟수 제한이 없다 — 판돈이 있는 한 같은 순간에 거듭 돈다 · 판돈이 떨어지면 gold · 세이브에 충전 시계가 없고 옛 필드는 로드가 지운다 (ADR-0334 · INTERFACE §4)', () => {
    const g = gambleGame(94);
    const N = 200;
    for (let i = 0; i < N; i++) { const r = SYS.game.gambleSpin(g, 1); if (!r.ok) fail(`${i + 1}번째 판 ${r.err}`); }
    if (g.counters.gamble !== N) fail(`판 수 ${g.counters.gamble}`);
    const stake = SYS.game.gambleState(g).stake;
    g.resources.gold = stake - 1;
    if (SYS.game.gambleSpin(g, 1).err !== 'gold') fail('판돈이 모자란데 돈다');
    if ('gamble' in g) fail('새 게임에 충전 시계가 있다');
    const old = JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW)));
    old.gamble = { emptyAt: NOW };
    if ('gamble' in SYS.game.deserialize(old)) fail('옛 충전 시계를 안 지운다');
    return `${N}판 연속 · 판돈 ${stake} G`;
});
check('gamble: 판돈은 진행 챕터 × 단계 배수 · 단계는 선술집 랭크가 연다 · 재료는 진행 챕터 단계 (base_expedition_design 「도박장」 · R149)', () => {
    const g = gambleGame(95, 3);
    const s1 = SYS.game.gambleState(g);
    const open3 = s1.stakes.filter(x => x.open).length;
    if (s1.stakes[0].gold !== Math.round(B.gamble_stake_gold * B.gamble_stake_chapter_mult ** (s1.chapter - 1) * s1.stakes[0].mult)) fail('판돈 식');
    g.buildings.tavern = SYS.construction.list.find(b => b.id === 'tavern').maxRank;
    const openMax = SYS.game.gambleState(g).stakes.filter(x => x.open).length;
    if (!(openMax > open3)) fail(`랭크를 올려도 단계가 안 는다 ${open3} → ${openMax}`);
    for (const id of D.stageOrder) if (D.stages[id].chapter === s1.chapter && !g.progress.cleared.includes(id)) g.progress.cleared.push(id);
    g.buildings.expedition = s1.chapter + 1;   // 다음 장은 원정 랭크가 연다 — 보스만 깨서는 안 넘어간다 (R152)
    const s2 = SYS.game.gambleState(g);
    if (!(s2.chapter > s1.chapter)) fail('챕터를 다 깨도 진행 챕터가 안 넘어간다');
    if (!(s2.stakes[0].gold > s1.stakes[0].gold)) fail(`판돈이 챕터를 안 따른다 ${s1.stakes[0].gold} → ${s2.stakes[0].gold}`);
    if (s2.mats.ore === s1.mats.ore || s2.mats.timber === s1.mats.timber) fail('재료 단계가 챕터를 안 따른다');
    return `선술집 r3 ${open3}단계 · 최대 ${openMax}단계 · ch${s1.chapter} ${s1.stakes.map(x => x.gold).join('/')} · ch${s2.chapter} ${s2.stakes.map(x => x.gold).join('/')}`;
});
check('gamble: 골드 환급은 1 미만 · 장비 · 낙인은 안 나온다 · 지급 = 결과와 같다 (GAME_DESIGN §10 「도박장」 ②③ · R149)', () => {
    const N = 20000;
    let gm = 0, holds = 0, fulls = 0;
    const units = { ore: 0, timber: 0, dust: 0 };
    for (let i = 1; i <= N; i++) {
        const r = SYS.gamble.spin(makeRng(deriveSeed(4242, i)));
        gm += r.goldMult;
        for (const k in units) units[k] += r.mats[k];
        if (r.hold) { holds++; if (r.hold.full) fulls++; }
    }
    const rtp = gm / N;
    if (!(rtp < 1)) fail(`골드 환급 ${rtp.toFixed(3)} ≥ 1 — 골드 소모처가 아니다`);
    // 실제 판 — 가방 · 아이템 · 낙인은 그대로이고 골드 · 재료는 결과가 말한 만큼만 움직인다
    const g = gambleGame(96, SYS.construction.list.find(b => b.id === 'tavern').maxRank);
    const bag0 = g.bag.length, items0 = Object.keys(g.items).length, stig0 = g.resources.stigma;
    for (let t = 0; t < 40; t++) {
        const gold0 = g.resources.gold, dust0 = g.resources.dust, mats0 = { ...g.materials };
        const r = SYS.game.gambleSpin(g, 1 + (t % SYS.game.limitsOf(g).gambleStakes));
        if (!r.ok) fail(`${t}번째 판 ${r.err}`);
        if (g.resources.gold - gold0 !== r.spin.net) fail(`골드 변화 ${g.resources.gold - gold0} ≠ 순손익 ${r.spin.net}`);
        for (const [id, n] of Object.entries(r.spin.mats)) {
            const have = id === 'dust' ? g.resources.dust - dust0 : (g.materials[id] ?? 0) - (mats0[id] ?? 0);
            if (have !== n) fail(`${id} 지급 ${have} ≠ ${n}`);
        }
    }
    if (g.bag.length !== bag0 || Object.keys(g.items).length !== items0 || g.resources.stigma !== stig0) fail('장비 · 낙인이 나왔다');
    return `골드 환급 ${rtp.toFixed(3)} · 재료(1 단계 개수/판) 광석 ${(units.ore / N).toFixed(2)} · 목재 ${(units.timber / N).toFixed(2)} · 가루 ${(units.dust / N).toFixed(2)} · 홀드 1/${Math.round(N / Math.max(holds, 1))} · 판이 다 참 ${fulls}/${N}`;
});
check('gamble: n판 돌리기 — 정해진 판 수만 돈다 · 판돈이 떨어지면 거기서 멈춘다 · 합계 = 판마다의 합 · 한 판도 못 돌면 그 거절 (INTERFACE §2-7 · ADR-0334)', () => {
    const g = gambleGame(97);
    const gold0 = g.resources.gold;
    const r = SYS.game.gambleSpinBatch(g, 1);
    if (!r.ok) fail(r.err);
    if (r.spins.length !== B.gamble_batch_spins || r.stop !== null) fail(`${r.spins.length}판 · 멈춘 사유 ${r.stop}`);
    if (g.resources.gold - gold0 !== r.net) fail(`골드 변화 ${g.resources.gold - gold0} ≠ 합계 순손익 ${r.net}`);
    if (r.net !== r.gold - r.stake) fail('순손익 ≠ 받음 − 판돈');
    // 판돈이 두 판치뿐 — 판수가 모자라게 멈추면 사유는 gold 이고 남은 골드는 판돈보다 적다
    const stake = SYS.game.gambleState(g).stake;
    g.resources.gold = stake * 2;
    const short = SYS.game.gambleSpinBatch(g, 1);
    if (!short.ok || short.spins.length < 2) fail(`두 판치 판돈에서 ${short.spins?.length ?? short.err}판`);
    if (short.spins.length < B.gamble_batch_spins && (short.stop !== 'gold' || g.resources.gold >= stake)) fail(`${short.spins.length}판에서 멈춘 사유 ${short.stop} · 남은 골드 ${g.resources.gold}`);
    g.resources.gold = 0;
    const none = SYS.game.gambleSpinBatch(g, 1);
    if (none.ok || none.err !== 'gold') fail(`빈 지갑에서 ${JSON.stringify(none).slice(0, 80)}`);
    return `${r.spins.length}판 · 받음 ${r.gold} · 판돈 ${r.stake} · 순손익 ${r.net} · 두 판치 판돈 → ${short.spins.length}판(${short.stop ?? '다 돎'})`;
});
/* ── 의뢰 — 게시판 · 받기 · 세기 · 수령 (base_expedition_design §1-3 · INTERFACE §2-7 · §2-16 · R153) ── */
const cmGame = (seed, rank = 1) => {
    const g = SYS.game.newGame(seed, cands, NOW);
    g.buildings.tavern = rank;
    return g;
};
/** 받아 둔 카드 하나만 세운다 — 굴림을 안 거치고 어휘 하나만 시험한다(게시판의 다른 카드는 걷는다) */
const cmHold = (g, card) => {
    g.commissions.cards = [{ no: 9001, tpl: 'test', need: 999, grade: 'normal', gold: 100, have: 0, ...card }];
    return g.commissions.cards[0];
};
check('commission: 표 넷이 불러와진다 — 등급은 일반 · 매직 · 레어 · 윗 등급일수록 드물고 목표당 골드가 좋다 (base_expedition_design §1-3 · INTERFACE §2-16)', () => {
    const CM = SYS.commission;
    if (!CM.templates.length) fail('틀이 없다');
    if (CM.grades.map(x => x.id).join() !== 'normal,magic,rare') fail(`등급 ${CM.grades.map(x => x.id).join()}`);
    for (let i = 1; i < CM.grades.length; i++) {
        const a = CM.grades[i - 1], b = CM.grades[i];
        if (!(b.weight < a.weight)) fail(`${b.id} 가 ${a.id} 보다 드물지 않다`);
        if (!(b.goldMult / b.needMult > a.goldMult / a.needMult)) fail(`${b.id} 의 목표당 골드가 ${a.id} 보다 좋지 않다`);
    }
    const axes = [...new Set(CM.templates.map(x => x.axis))];
    for (const ax of ['chapter', 'race', 'monster', 'grade', 'rarity']) if (!axes.includes(ax)) fail(`어휘 ${ax} 를 쓰는 틀이 없다 — 사용자 「모두가 나오도록」`);
    return `틀 ${CM.templates.length}(${axes.join(' · ')}) · 등급 ${CM.grades.map(x => `${x.id} ${x.weight}`).join(' / ')} · 종족 ${CM.races.length}`;
});
check('commission: 표를 불러올 때 멈춘다 — 모르는 어휘 · 종류와 안 맞는 어휘 · 없는 고정 대상 · 이름 없는 종족 · 가중치 합 0 (INTERFACE §2-16)', () => {
    const base = { templates: D.commissionRows, kinds: D.commissionKindRows, grades: D.commissionGradeRows, races: D.monsterTypeRows, monsters: D.monsters, balance: B };
    createCommission(base);
    const t0 = D.commissionRows.find(r => r.axis === 'chapter');
    const cases = {
        axis: { templates: [{ ...t0, axis: 'nope' }] },
        kindAxis: { templates: [{ ...t0, kind_id: 'collect' }] },
        ref: { templates: [{ ...t0, axis: 'monster', ref: 99999 }] },
        race: { races: D.monsterTypeRows.slice(1) },
        weight: { grades: D.commissionGradeRows.map(r => ({ ...r, weight: 0 })) },
    };
    const passed = Object.entries(cases).filter(([, over]) => { try { createCommission({ ...base, ...over }); return true; } catch { return false; } }).map(([k]) => k);
    if (passed.length) fail(`안 멈췄다: ${passed.join(', ')}`);
    return Object.keys(cases).join(' · ');
});
check('commission: 한 장 = 틀 → 등급 → 대상 언제나 3회(고정이어도) · 목표 = 틀 × 등급 · 골드 = 틀 × 등급 × 챕터 배수^(보상 챕터 − 1) · 풀이 비면 그 틀은 안 선다 (INTERFACE §2-16 · §5-2)', () => {
    const CM = SYS.commission;
    let n = 0;
    const src = makeRng(77), rng = () => { n++; return src(); };
    const ctx = { chapters: [1, 2], races: ['Demon'], monsters: [1101], chapter: 2 };
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
        const before = n;
        const c = CM.roll(rng, ctx);
        if (n - before !== 3) fail(`${c?.tpl} — ${n - before}회`);
        const t = CM.templates.find(x => x.id === c.tpl), gr = CM.gradeById.get(c.grade);
        if (c.need !== Math.max(1, Math.round(t.need * gr.needMult))) fail(`${c.tpl} 목표 ${c.need}`);
        const ch = c.axis === 'chapter' ? c.ref : c.axis === 'monster' ? D.monsters[c.ref].chapter : ctx.chapter;
        if (c.gold !== Math.round(t.gold * gr.goldMult * B.commission_gold_chapter_mult ** (ch - 1))) fail(`${c.tpl} 골드 ${c.gold}`);
        const pool = { chapter: ctx.chapters, race: ctx.races, monster: ctx.monsters }[c.axis];
        if (pool && !pool.includes(c.ref)) fail(`${c.axis} 대상 ${c.ref} 가 풀 밖이다`);
        seen.add(c.axis);
    }
    if (seen.size !== new Set(CM.templates.map(x => x.axis)).size) fail(`200장에 안 나온 어휘가 있다 — ${[...seen].join(',')}`);
    // 챕터 · 종족 · 개체 풀이 비면 그 틀은 빠지고 남는 틀(몬스터 등급 · 희귀도)만 선다
    for (let i = 0; i < 30; i++) {
        const c = CM.roll(rng, { chapters: [], races: [], monsters: [], chapter: 1 });
        if (!['grade', 'rarity'].includes(c.axis)) fail(`풀이 빈 ${c.axis} 가 섰다`);
    }
    return `어휘 ${[...seen].join(' · ')}`;
});
check('commission: 게시판은 선술집이 연다 · 빈 자리를 commission_board_cards 장까지 굴린다 · 같은 세이브면 같은 카드 · 대상은 지금 들어갈 수 있는 스테이지에서만 (INTERFACE §2-7 · §5-1)', () => {
    const g0 = SYS.game.newGame(301, cands, NOW);
    delete g0.buildings.tavern;
    if (SYS.game.commissionFill(g0).err !== 'unbuilt') fail('안 지었는데 굴린다');
    if (g0.commissions.cards.length || SYS.game.commissionState(g0).open) fail('안 지었는데 게시판이 섰다');
    const a = cmGame(301);
    const b = SYS.game.deserialize(JSON.parse(JSON.stringify(SYS.game.serialize(a, NOW))));
    const ra = SYS.game.commissionFill(a), rb = SYS.game.commissionFill(b);
    if (ra.rolled !== B.commission_board_cards || rb.rolled !== ra.rolled) fail(`${ra.rolled} · ${rb.rolled}장`);
    if (!eq(a.commissions, b.commissions)) fail('같은 세이브가 다른 카드를 굴렸다');
    if (SYS.game.commissionFill(a).rolled !== 0) fail('찬 게시판을 또 굴린다');
    // 새 게임에서 열린 스테이지는 첫 스테이지뿐 — 대상이 그 밖을 가리키면 안 된다
    const open = D.stageOrder.filter(id => SYS.game.stageUnlocked(a, id));
    const mons = new Set(open.flatMap(id => SYS.battle.stagePool(D.stages[id])));
    const chs = new Set(open.map(id => D.stages[id].chapter));
    const races = new Set([...mons].map(id => D.monsters[id].monster_type));
    const axes = {};
    for (let s = 310; s < 350; s++) {
        const g = cmGame(s);
        SYS.game.commissionFill(g);
        for (const c of g.commissions.cards) {
            axes[c.axis] = (axes[c.axis] ?? 0) + 1;
            if (c.axis === 'chapter' && !chs.has(c.ref)) fail(`안 열린 챕터 ${c.ref}`);
            if (c.axis === 'monster' && !mons.has(c.ref)) fail(`안 열린 스테이지의 몬스터 ${c.ref}`);
            if (c.axis === 'race' && !races.has(c.ref)) fail(`안 열린 스테이지에 없는 종족 ${c.ref}`);
            if (!(c.need >= 1 && c.gold >= 1) || !SYS.commission.gradeById.has(c.grade)) fail(`카드 모양 ${JSON.stringify(c)}`);
        }
    }
    return `열린 스테이지 ${open.join(',')} · 40판 ${Object.entries(axes).map(([k, v]) => `${k} ${v}`).join(' · ')}`;
});
check('commission: 받기 unbuilt → missing → full · 받은 카드는 제자리 · 수령 missing → notDone → 골드 · 그 자리에 새 카드 · 포기는 벌 없이 자리를 새로 굴린다 (INTERFACE §2-7 · §3)', () => {
    const g0 = SYS.game.newGame(303, cands, NOW);
    delete g0.buildings.tavern;
    const errs = [SYS.game.commissionTake(g0, 1).err];
    const g = cmGame(303);
    SYS.game.commissionFill(g);
    errs.push(SYS.game.commissionTake(g, -1).err);
    const [c1, c2] = g.commissions.cards;
    const r1 = SYS.game.commissionTake(g, c1.no);
    if (!r1.ok) fail(`받기 ${r1.err}`);
    const s = JSON.stringify(g);
    errs.push(SYS.game.commissionTake(g, c2.no).err);   // 선술집 r1 = 한 칸
    if (JSON.stringify(g) !== s) fail('full 거절이 상태를 바꿨다');
    if (!eq(errs, ['unbuilt', 'missing', 'full'])) fail(errs.join(' · '));
    if (g.commissions.cards[0].no !== c1.no || g.commissions.cards.length !== B.commission_board_cards) fail('받은 카드가 제자리가 아니다');
    const st = SYS.game.commissionState(g);
    if (!st.cards[0].taken || st.cards[0].have !== 0 || st.cards[1].canTake || st.taken !== 1) fail(`게시판 상태 ${JSON.stringify(st.cards[0])}`);
    const cerr = [SYS.game.commissionClaim(g, c2.no).err, SYS.game.commissionClaim(g, c1.no).err];
    if (!eq(cerr, ['missing', 'notDone'])) fail(`수령 ${cerr.join(' · ')}`);
    g.commissions.cards[0].have = g.commissions.cards[0].need;
    if (!SYS.game.commissionState(g).cards[0].done) fail('다 채웠는데 done 이 아니다');
    const gold0 = g.resources.gold;
    const cl = SYS.game.commissionClaim(g, c1.no);
    if (!cl.ok || g.resources.gold - gold0 !== c1.gold || cl.gold !== c1.gold) fail(`수령 골드 ${g.resources.gold - gold0} ≠ ${c1.gold}`);
    const fresh = g.commissions.cards[0];
    if (fresh.no === c1.no || 'have' in fresh || g.commissions.cards.length !== B.commission_board_cards) fail('그 자리에 새 카드가 안 섰다');
    // 포기 — 벌도 보상도 없이 그 자리만 새로 굴린다
    SYS.game.commissionTake(g, fresh.no);
    g.commissions.cards[0].have = 3;
    const gold1 = g.resources.gold;
    const dr = SYS.game.commissionDrop(g, fresh.no);
    if (!dr.ok || g.resources.gold !== gold1) fail('포기에 벌 · 보상이 있다');
    if (g.commissions.cards[0].no === fresh.no || 'have' in g.commissions.cards[0]) fail('포기한 자리가 새로 안 굴려졌다');
    if (SYS.game.commissionDrop(g, g.commissions.cards[1].no).err !== 'missing') fail('안 받은 카드를 포기한다');
    return `${errs.join(' → ')} · 수령 +${c1.gold} G`;
});
check('commission: 받아 둘 수 = commission_slots + 선술집 r2 (construction_draft §2 · R153)', () => {
    const g = cmGame(304, 1);
    const n1 = SYS.game.limitsOf(g).commissionSlots;
    g.buildings.tavern = 2;
    const n2 = SYS.game.limitsOf(g).commissionSlots;
    if (n1 !== B.commission_slots) fail(`r1 ${n1}`);
    if (!(n2 > n1)) fail(`r2 가 안 늘린다 ${n1} → ${n2}`);
    if (!(n2 < B.commission_board_cards)) fail(`받을 수(${n2})가 게시판 자리(${B.commission_board_cards})보다 작지 않다 — 고를 폭이 없다`);
    SYS.game.commissionFill(g);
    const nos = g.commissions.cards.map(c => c.no);
    for (let i = 0; i < n2; i++) if (!SYS.game.commissionTake(g, nos[i]).ok) fail(`${i + 1}번째가 안 받아진다`);
    if (SYS.game.commissionTake(g, nos[n2]).err !== 'full') fail('칸을 넘겨 받는다');
    return `r1 ${n1} · r2 ${n2} · 게시판 ${B.commission_board_cards}`;
});
check('commission: 처치가 센다 — 이긴 라운드의 처치만 · 지역 · 종족 · 개체 · 정예 · 보스가 각자 맞는 것만 · need 에서 자른다 · killGrades 합 = kills (INTERFACE §2-6 · §2-7)', () => {
    // 정예 · 보스까지 잡는 런이어야 시험이 된다 — 시작 파티를 끌어올리고 그런 시드를 찾는다(같은 시드 = 같은 전투라 카드만 바꿔 다시 돈다)
    let seed = 305;
    const play = card => {
        const g = cmGame(seed);
        for (const h of g.heroes) h.level = B.hero_level_cap;
        const c = cmHold(g, card);
        const r = SYS.game.resolveBattle(g, 101, NOW);
        if (!r.ok) fail(r.err);
        return { c, res: r.result };
    };
    const hasBoth = res => Object.values(res.killGrades).some(m => m.elite) && Object.values(res.killGrades).some(m => m.stage_boss || m.chapter_boss);
    while (seed < 335 && !hasBoth(play({ kind: 'kill', axis: 'chapter', ref: 1 }).res)) seed++;
    const base = play({ kind: 'kill', axis: 'chapter', ref: 1 });
    if (!hasBoth(base.res)) fail('30 시드에 정예 · 보스를 다 잡은 런이 없다 — 시험이 안 된다');
    for (const [id, n] of Object.entries(base.res.kills)) {
        const sum = Object.values(base.res.killGrades[id] ?? {}).reduce((a, x) => a + x, 0);
        if (sum !== n) fail(`${id} killGrades 합 ${sum} ≠ kills ${n}`);
    }
    const kills = Object.values(base.res.kills).reduce((a, x) => a + x, 0);
    if (!kills) fail('101 에서 하나도 못 잡았다 — 시험이 안 된다');
    if (base.c.have !== kills) fail(`지역 1 = ${base.c.have} · 처치 ${kills}`);
    if (play({ kind: 'kill', axis: 'chapter', ref: 2 }).c.have !== 0) fail('다른 챕터를 센다');
    const graded = gs => Object.values(base.res.killGrades).reduce((a, m) => a + gs.reduce((b, g) => b + (m[g] ?? 0), 0), 0);
    if (play({ kind: 'kill', axis: 'grade', ref: 'elite' }).c.have !== graded(['elite'])) fail('정예');
    if (play({ kind: 'kill', axis: 'grade', ref: 'boss' }).c.have !== graded(['stage_boss', 'chapter_boss'])) fail('보스');
    const mid = Number(Object.keys(base.res.kills)[0]);
    if (play({ kind: 'kill', axis: 'monster', ref: mid }).c.have !== base.res.kills[mid]) fail(`개체 ${mid}`);
    const race = D.monsters[mid].monster_type;
    const byRace = Object.entries(base.res.kills).filter(([id]) => D.monsters[id].monster_type === race).reduce((a, [, n]) => a + n, 0);
    if (play({ kind: 'kill', axis: 'race', ref: race }).c.have !== byRace) fail(`종족 ${race}`);
    if (play({ kind: 'kill', axis: 'chapter', ref: 1, need: 2 }).c.have !== 2) fail('need 에서 안 자른다');
    return `시드 ${seed} · 101 처치 ${kills} · 정예 ${graded(['elite'])} · 보스 ${graded(['stage_boss', 'chapter_boss'])} · ${race} ${byRace}`;
});
check('commission: 들어온 드롭이 채운다 — 희귀도가 맞는 것만 · 알아서 분해로 녹은 것도 · 가방이 차서 버린 것은 빼고 (INTERFACE §2-7)', () => {
    const play = (seed, setup) => {
        const g = cmGame(seed);
        const c = cmHold(g, { kind: 'collect', axis: 'rarity', ref: 'magic' });
        setup?.(g);
        const r = SYS.game.resolveBattle(g, 101, NOW);
        if (!r.ok) fail(r.err);
        return { g, c, r };
    };
    // 매직 드롭이 나오는 시드를 찾는다 — 없으면 시험이 안 된다
    let seed = null, a = null, magic = 0;
    for (let s = 360; s < 380 && seed === null; s++) {
        const x = play(s);
        const m = x.r.report.drops.filter(u => x.g.items[u]?.rarity === 'magic').length;
        if (m > 0) { seed = s; a = x; magic = m; }
    }
    if (seed === null) fail('20 시드에 매직 드롭이 없다 — 시험이 안 된다');
    if (a.c.have !== magic) fail(`매직 ${a.c.have} ≠ 드롭 ${magic}`);
    if (play(seed, g => SYS.game.setAutoSalvage(g, { rarity: 'magic' })).c.have !== magic) fail('알아서 분해로 녹은 것을 안 센다');
    const full = play(seed, g => {
        const cap = SYS.game.limitsOf(g).bag;
        for (let i = g.bag.length; i < cap; i++) { const f = mkItem('gloves', []); f.uid = `iF${i}`; g.items[f.uid] = f; g.bag.push(f.uid); }
    });
    if (full.c.have !== 0) fail('가방이 차서 버린 드롭을 센다');
    const rare = play(seed, g => { g.commissions.cards[0].ref = 'rare'; });
    const rareN = rare.r.report.drops.filter(u => rare.g.items[u]?.rarity === 'rare').length;
    if (rare.c.have !== rareN) fail(`레어 ${rare.c.have} ≠ ${rareN}`);
    return `시드 ${seed} · 드롭 ${a.r.report.drops.length} · 매직 ${magic} · 레어 ${rareN}`;
});
check('commission: 세이브 — 왕복 그대로 · 없으면 빈 게시판으로 연다(버전 무변경) · 모르는 어휘의 카드는 로드가 지운다 (INTERFACE §4)', () => {
    const g = cmGame(307);
    SYS.game.commissionFill(g);
    SYS.game.commissionTake(g, g.commissions.cards[0].no);
    const s = JSON.parse(JSON.stringify(SYS.game.serialize(g, NOW)));
    if (!eq(SYS.game.deserialize(s).commissions, g.commissions)) fail('왕복이 갈렸다');
    const old = JSON.parse(JSON.stringify(s));
    delete old.commissions;
    delete old.counters.commission;
    const o = SYS.game.deserialize(old);
    if (!eq(o.commissions, { cards: [] }) || o.counters.commission !== 0) fail('없는 필드를 빈 게시판으로 안 연다');
    const odd = JSON.parse(JSON.stringify(s));
    odd.commissions.cards[1].axis = 'nope';
    if (SYS.game.deserialize(odd).commissions.cards.length !== B.commission_board_cards - 1) fail('모르는 어휘의 카드를 안 지운다');
    return `v${SAVE_VERSION} · 카드 ${g.commissions.cards.length}`;
});
check('construction: 상한이 줄어든 세이브 — 가방은 넘친 채 둔다(새 드롭 · 옮기기만 막힌다) · 편성 · 물약 칸은 상한에 맞춰 자른다 (사용자 확정 2026-09-22 · R137)', () => {
    const S = buildSystems({ ...D, ...gateRows() });
    const g = S.game.newGame(82, cands, NOW);
    g.resources.gold = 1e6;
    S.game.construct(g, 'x');
    const cap = S.game.limitsOf(g).bag;
    for (let i = g.bag.length; i < cap; i++) { const f = mkItem('gloves', []); f.uid = `iO${i}`; g.items[f.uid] = f; g.bag.push(f.uid); }
    const s = JSON.parse(JSON.stringify(S.game.serialize(g, NOW)));
    s.buildings.x = 0;                               // 표에서 x 가 0 이 되었다 — 더하기가 사라진다
    const back = S.game.deserialize(s), L = S.game.limitsOf(back);
    if (back.bag.length !== cap || !(back.bag.length > L.bag)) fail(`가방 ${back.bag.length} — 넘친 ${cap} 개가 그대로여야(상한 ${L.bag})`);
    if (back.presets.length !== L.presets || back.presets[0].potionSlots.length !== L.potionSlots) fail(`편성 ${back.presets.length} · 칸 ${back.presets[0].potionSlots.length}`);
    if (!eq(back.presets[0].party, g.presets[0].party)) fail('남는 편성의 파티가 흔들렸다');
    return `가방 ${back.bag.length} / 상한 ${L.bag} 그대로 · 편성 ${g.presets.length} → ${back.presets.length} · 칸 ${g.presets[0].potionSlots.length} → ${back.presets[0].potionSlots.length}`;
});
check('construction: 진짜 표 — 첫 건설(새 게임에 안 지어졌고 문턱이 없는 첫 랭크 · 준비 중 제외)은 시작 재화로 바로 짓는다 (construction_draft §4 조건 ① · R137)', () => {
    const g = SYS.game.newGame(83, cands, NOW);
    const firsts = SYS.game.constructionState(g).buildings.filter(b => b.rank === 0 && b.next.err !== 'pending' && !b.ranks[0].require.length);
    const need = {};
    for (const b of firsts) for (const c of b.next.cost) need[c.res] = (need[c.res] ?? 0) + c.need;
    const wallet = { gold: g.resources.gold, dust: g.resources.dust, stigma: g.resources.stigma };
    const short = Object.entries(need).filter(([res, n]) => (wallet[res] ?? g.materials[res] ?? 0) < n);
    if (short.length) fail(`시작 재화로 첫 건설을 다 못 짓는다 ${JSON.stringify(short)} (가진 것 ${JSON.stringify(wallet)})`);
    for (const b of firsts) if (!SYS.game.construct(g, b.id).ok) fail(`${b.id} 를 못 짓는다`);
    return `${firsts.map(b => b.name.ko).join(' → ') || '없음'} · 비용 ${JSON.stringify(need)} ≤ 시작 ${JSON.stringify(wallet)}`;
});
check('construction: 관리자 모드(openAll) — 켜면 기능 · 상한 · 탭이 모든 건물 최대 랭크로 열린 척 · 스테이지도 전부 열림 · 세이브와 건설 탭의 실제 랭크는 그대로 · 끄면 돌아온다 (INTERFACE §2-7 · SCREEN_DESIGN §10-3 · R155)', () => {
    let on = false;
    const S = buildSystems(D, { openAll: () => on });
    const g = S.game.newGame(84, cands, NOW);
    const maxed = JSON.parse(JSON.stringify(g));
    for (const b of S.construction.list) maxed.buildings[b.id] = b.maxRank;
    const unlocks = [...new Set(S.construction.list
        .flatMap(b => Array.from({ length: b.maxRank }, (_, i) => S.construction.rankInfo(b.id, i + 1).effects).flat())
        .filter(e => e.kind === 'unlock').map(e => e.target))];
    const L0 = S.game.limitsOf(g), Lmax = S.game.limitsOf(maxed), cs0 = S.game.constructionState(g), save0 = JSON.stringify(S.game.serialize(g, NOW));
    const openStages = () => D.stageOrder.filter(id => S.game.stageUnlocked(g, id)).length;
    const st0 = openStages();
    if (unlocks.every(id => S.game.hasFeature(g, id)) || eq(L0, Lmax) || st0 === D.stageOrder.length) fail('fixture: 새 게임인데 이미 다 열려 있다 — 시험이 헛돈다');
    on = true;
    const shut = unlocks.filter(id => !S.game.hasFeature(g, id));
    if (shut.length) fail(`켰는데 닫힌 기능 ${shut.join(' · ')}`);
    const stLocked = D.stageOrder.filter(id => !S.game.stageUnlocked(g, id));
    if (stLocked.length) fail(`켰는데 잠긴 스테이지 ${stLocked.join(' · ')} — 장 잠금 · 직전 클리어를 안 따져야 (R155)`);
    if (g.progress.cleared.length) fail('켜기만 했는데 클리어 기록이 생겼다');
    if (!eq(S.game.limitsOf(g), Lmax)) fail(`켰는데 상한 ${JSON.stringify(S.game.limitsOf(g))} ≠ 다 지은 판 ${JSON.stringify(Lmax)}`);
    const cs = S.game.constructionState(g);
    const dim = Object.entries(cs.tabs).filter(([, v]) => !v).map(([k]) => k);
    if (dim.length) fail(`켰는데 흐린 탭 ${dim.join(' · ')}`);
    const real = st => st.buildings.map(b => [b.id, b.rank, b.next.err]);
    if (!eq(real(cs), real(cs0))) fail('건설 탭이 실제 랭크를 안 그린다');
    if (JSON.stringify(S.game.serialize(g, NOW)) !== save0) fail('켜기만 했는데 세이브가 바뀌었다');
    on = false;
    if (!eq(S.game.limitsOf(g), L0) || !eq(S.game.constructionState(g).tabs, cs0.tabs) || openStages() !== st0) fail('끄니 원래대로 안 돌아왔다');
    return `기능 ${unlocks.length} 전부 열림 · 물약 칸 ${L0.potionSlots} → ${Lmax.potionSlots} · 전술 칸 ${L0.tacticSlots} → ${Lmax.tacticSlots} · 스테이지 ${st0} → ${D.stageOrder.length} · 세이브 그대로`;
});
check('선술집 명단은 건물이 안 늘린다 — 모든 건물 최대 랭크(관리자 모드)에서도 후보는 tavern_candidates · 표에 tavernCandidates 더하기를 적으면 로드가 멈춘다 (2026-09-24 사용자 지시 · base_expedition §2-4)', () => {
    const S = buildSystems(D, { openAll: () => true });
    const g = S.game.newGame(84, cands, NOW);
    const n = S.game.tavernCandidates(g).length;
    if (S.game.limitsOf(g).tavernCandidates !== B.tavern_candidates || n !== B.tavern_candidates) fail(`다 연 판의 명단 ${n} — ${B.tavern_candidates} 여야`);
    let threw = false;
    try { buildSystems({ ...D, buildingEffectRows: [...D.buildingEffectRows, { building_id: 'tavern', rank: 3, kind: 'add', target: 'tavernCandidates', value: 1, status: 'proposed' }] }); } catch { threw = true; }
    if (!threw) fail('tavernCandidates 더하기 줄이 로드를 통과했다');
    return `다 연 판 명단 ${n} · 더하기 줄은 거절`;
});
check('선술집 로스터 — 다 지으면 3부대(편성 수 × 파티 인원)를 다 채우고 · 짓기 전엔 못 채운다 (2026-09-24 사용자 지시 「3부대 돌리는 게 좀 빡세도록」 · construction_draft §2)', () => {
    const need = B.party_preset_count * B.party_size_max;
    const S = buildSystems(D, { openAll: () => true });
    const full = S.game.limitsOf(S.game.newGame(85, cands, NOW)).roster;
    const start = SYS.game.limitsOf(null).roster;
    if (full < need) fail(`다 지은 로스터 ${full} — 3부대 ${need} 명을 못 채운다`);
    if (start >= need) fail(`시작 로스터 ${start} 가 이미 3부대 ${need} 명을 채운다 — 건물이 할 일이 없다`);
    return `시작 ${start} → 다 지음 ${full} · 3부대 ${need}`;
});

/* ── 골든 시드 스냅샷 — Phase 2 이식 대조의 실제 도구 (DEV_PLAN §5-A #4 · dev/golden.js) ── */
// fetch 는 비동기라 check() 밖에서 미리 읽는다 (check 는 동기 — Promise 를 돌려주면 무조건 통과가 된다)
const goldenExpected = await fetch('./golden.json').then(r => (r.ok ? r.json() : null)).catch(() => null);
const goldenWrite = wantsWrite(location.search);
// 시계는 **찍을 때만** 읽는다. 대조할 때는 golden.json 의 날짜를 그대로 되쓴다 (테스트가 시계를 읽지 않는다)
const goldenCreated = goldenWrite ? new Date().toISOString().slice(0, 10) : (goldenExpected?.meta?.created ?? null);
const noJson = () => fail('golden.json 을 못 읽었다 — test.html?golden=write 로 찍어 dev/golden.json 에 저장하라');
/**
 * ⚠ **지문 생성은 전부 `check()` 안에서 돈다.** 최상위에서 돌리던 판(08-31 최초)은 40런 중 하나가
 * 던지면 DOM 이 1.4KB 로 죽고 `<title>` 이 정적 제목으로 남아 **나머지 140 단정 결과가 통째로 사라졌다**
 * — README 가 경고하는 「0바이트 = 무한 루프」 증상과 구분도 안 됐다. 지금은 골든만 빨간불이 켜진다.
 */
let goldenActual = null;                                    // ?golden=write 가 찍을 것 — ④가 채운다
let goldenMeta = null;                                      // ①이 만들고 ②가 다시 쓴다 (전투를 안 돌리는 부분)
// 입력 차이 한 줄 — ③ · ④ 가 어긋났을 때 사유의 요약 바로 뒤에 붙인다(입력 탓인가 코드 탓인가)
const withInput = bad => [bad[0], inputNote(goldenMeta ??= buildMeta(B, D, NOW, goldenCreated), goldenExpected), ...bad.slice(1)].join(' / ');

/*
 * ① · ② **입력 기록 — 판정하지 않고 설명한다** [2026-09-22 · 구조 감사 · INTERFACE §5-5]. 설명문 한 글자 · 전투와 무관한 키 하나에도
 *   빨간불이 켜져 결과가 같은데 재촬영을 요구했고, 병렬 세션이 도는 동안 그 재촬영이 남의 미완성 변경을 지문에 박았다.
 *   판정은 ③ · ④ 가 하고, 그 둘이 어긋나면 사유에 입력 차이(`inputNote`)가 붙는다. 여기서 던지는 것은 golden.json 을 못 읽은 때뿐이다
 */
check('golden: 입력 차이는 설명이다 — 같은 입력이면 「그대로」 · 달라진 파일과 키를 짚는다 (INTERFACE §5-5 · 2026-09-22)', () => {
    const meta = buildMeta(B, D, NOW, 'x');
    const file = Object.keys(meta.csvHash)[0];
    const same = inputNote(meta, { meta });
    if (!same.startsWith('입력 그대로')) fail(`같은 입력인데 변화라고 한다: ${same}`);
    const moved = inputNote(meta, { meta: { ...meta, csvHash: { ...meta.csvHash, [file]: '00000000' }, balance: { ...meta.balance, zz_gone: 1 } } });
    if (!moved.startsWith('입력 변화') || !moved.includes(`${file}: 00000000`) || !moved.includes('zz_gone: 1 → 없음')) fail(`달라진 입력을 못 짚는다: ${moved}`);
    return moved;
});
// ① CSV 원문 — 어느 **파일**이 달라졌는지 적는다 · 빨간불을 안 켠다
check(`golden: 입력 기록 — CSV ${FILES.length}종 원문 (설명만 · 판정은 시작 파티 · 50런)`, () => {
    goldenMeta = buildMeta(B, D, NOW, goldenCreated);
    if (!goldenExpected) noJson();
    const diff = compareCsvHash(goldenMeta, goldenExpected);
    return diff.length ? `${diff.join(' / ')} — 결과 단정이 초록이면 다시 찍지 않는다` : `${Object.keys(goldenMeta.csvHash).length}파일 해시 일치`;
});
// ② balance.csv 전 키 — 손잡이 5키만 보면 밖의 키가 달라진 것을 못 적는다 · 빨간불을 안 켠다
check('golden: 입력 기록 — balance.csv 전 키 (설명만 · 판정은 시작 파티 · 50런)', () => {
    goldenMeta ??= buildMeta(B, D, NOW, goldenCreated);
    if (!goldenExpected) noJson();
    const diff = compareBalance(goldenMeta, goldenExpected);
    const knobs = `손잡이 ${GOLDEN_KNOBS.length}키 ${GOLDEN_KNOBS.map(k => `${k}=${B[k]}`).join(' ')}`;
    return diff.length ? `${diff.join(' / ')} — 결과 단정이 초록이면 다시 찍지 않는다 · ${knobs}`
        : `${Object.keys(goldenMeta.balance).length}키 · ${goldenExpected.meta.created} 판 · ${knobs}`;
});
// ③ 시작 파티 — 영웅 생성 굴림과 시작 무기. `hero_name.csv`/`hero_trait.csv` 행 순서는 여기서만 잡힌다
check(`golden: 시드 ${GOLDEN_SEEDS}개의 시작 파티(영웅 생성 + 시작 무기)가 일치한다`, () => {
    const goldenParties = buildParties(SYS, B, NOW);
    if (!goldenExpected) noJson();
    const bad = compareParties({ parties: goldenParties }, goldenExpected);
    if (bad.length) fail(withInput(bad));
    return `${Object.keys(goldenParties).length}파티 · 영웅 ${Object.values(goldenParties).flat().length}`;
});
// ④ 40런 지문 — 40번의 전투를 실제로 돌린다. 여기서 던져도 위 셋의 결과는 화면에 남는다
check(`golden: 시드 ${GOLDEN_SEEDS} × 스테이지 ${GOLDEN_STAGES.length} = ${GOLDEN_SEEDS * GOLDEN_STAGES.length}런 지문이 golden.json 과 일치한다`, () => {
    goldenActual = buildFingerprint(SYS, B, D, NOW, goldenCreated);
    if (!goldenExpected) noJson();
    const diffs = compareGolden(goldenActual, goldenExpected);
    if (diffs.length) fail(withInput(diffs));
    const sum = k => goldenActual.runs.reduce((a, r) => a + (k === 'drops' ? r.drops.length : r[k]), 0);
    return `${goldenActual.runs.length}런 · 드롭 ${sum('drops')} · 이벤트 ${sum('events')}`;
});
if (goldenWrite) {
    const pre = document.createElement('pre');
    pre.id = 'golden';
    // ④가 던졌으면 지문이 없다 — 이때 `<pre>` 는 **비어 있다.** 재촬영 절차(dev/README)의 길이 가드가
    // 그걸 보고 멈춰야 한다: 빈 지문으로 golden.json 을 덮어쓰면 다음 사람이 그물을 통째로 잃는다
    pre.textContent = goldenActual ? JSON.stringify(goldenActual, null, 1) : '';
    document.body.appendChild(pre);
}

/* ── 출력 ── */
const pass = results.filter(r => r.ok).length;
document.getElementById('head').innerHTML = `<b class="${pass === results.length ? 'ok' : 'fail'}">${pass === results.length ? 'PASS' : 'FAIL'}</b> ${pass} / ${results.length}`;
document.title = `${pass === results.length ? 'PASS' : 'FAIL'} ${pass}/${results.length}`;
document.getElementById('meta').textContent = `balance: monster_atk_scale=${B.monster_atk_scale} monster_hp_scale=${B.monster_hp_scale} weapon_atk_base=${B.weapon_atk_base} xp_rate=${B.xp_rate} hero_hp_base=${B.hero_hp_base}`;
for (const r of results) {
    const li = document.createElement('li');
    li.className = r.ok ? 'ok' : 'fail';
    li.innerHTML = `${r.name}${r.msg ? `<span class="m">${r.msg}</span>` : ''}`;
    out.appendChild(li);
}

/* ── 캘리브레이션 — 시작 파티 N개 × 스테이지 101~105 (연속 진행 없이 각각 새 게임 기준 · 105 = 챕터보스 단독 1라운드) ── */
const N = 20;
const rows = [];
for (const stageId of GOLDEN_STAGES) {
    let wins = 0, dur = 0, downed = 0, rounds = 0, gold = 0, drops = 0, kills = 0, timeouts = 0;
    let stagP = 0, stagE = 0, lock = 0;
    for (let seed = 1; seed <= N; seed++) {
        const party = SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max);
        const G2 = newGameP(seed, party, NOW);
        G2.progress.cleared = GOLDEN_STAGES.filter(s => s < stageId);   // 해금만 풀어준다 (성장 없음) — 골든과 같은 5스테이지
        const r = SYS.game.resolveBattle(G2, stageId, NOW);
        const rp = r.report;
        if (rp.won) wins++;
        if (rp.reason === 'timeout') timeouts++;
        dur += rp.durationSec; downed += rp.downed.length; rounds += rp.won ? rp.rounds.length : rp.rounds.length - 1;
        gold += rp.gold; drops += rp.drops.length; kills += Object.values(G2.codexKills).reduce((a, b) => a + b, 0);   // 도감 처치 수 (이긴 라운드만 — 2026-09-21 ~~cards~~)
        // 물리 경직 (R110) — 파티 · 적이 걸린 수와 **영웅 하나가 쉬지 않고 묶인 가장 긴 시간**(겹친 경직을 이어 붙인 길이 · GAME_DESIGN §10 「경직 잠금」)
        const run = {};   // 영웅 키 → 지금 이어지는 경직의 {from, to}
        for (const ev of r.result.timeline) {
            if (ev.e !== 'stagger') continue;
            if (!ev.u.startsWith('p')) { stagE++; continue; }
            stagP++;
            const w = run[ev.u];
            run[ev.u] = w && ev.t <= w.to ? { from: w.from, to: ev.until } : { from: ev.t, to: ev.until };
            lock = Math.max(lock, run[ev.u].to - run[ev.u].from);
        }
    }
    rows.push({ stageId, wins, dur: dur / N, downed: downed / N, rounds: rounds / N, gold: gold / N, drops: drops / N, kills: kills / N, timeouts,
        stagP: stagP / N, stagE: stagE / N, lock });
}
document.getElementById('calib').innerHTML = `
    <table>
        <tr><th>stage</th><th>win</th><th>avg rounds</th><th>avg sec</th><th>avg downed</th><th>avg gold</th><th>avg drops</th><th>avg kills</th><th>timeouts</th><th>avg stagger party/enemy</th><th>max hero lock sec</th></tr>
        ${rows.map(r => `<tr><td>${r.stageId}</td>
            <td class="${r.wins / N >= .7 ? 'up' : r.wins / N >= .3 ? 'warn' : 'down'}">${r.wins}/${N}</td>
            <td>${r.rounds.toFixed(1)}</td><td>${r.dur.toFixed(0)}</td><td>${r.downed.toFixed(2)}</td>
            <td>${r.gold.toFixed(0)}</td><td>${r.drops.toFixed(1)}</td><td>${r.kills.toFixed(1)}</td><td>${r.timeouts}</td>
            <td>${r.stagP.toFixed(1)} / ${r.stagE.toFixed(1)}</td><td>${r.lock.toFixed(1)}</td></tr>`).join('')}
    </table>
    <pre>목표: 101 승률 ≥ 70% (시작 파티 그대로) · 102 30~70% · 103~105 는 성장·장비 없이는 지는 게 정상
시작 파티 Lv1 · 제 직업 스킬이 붙는 무기군의 일반 무기 1개 + 일반 갑옷 1개 (2026-09-14 R86) · 액티브 = 고유 1 + 무기 1 (둘 다 그 직업 풀에서 굴린 것 · 무기는 고유를 뺀 풀이라 안 겹친다 · 전직 칸은 빈다 — §12 개정 09-09) 기준
⚠ 무기군 재배정(08-25)으로 시작 무기의 한손/양손·행동 주기가 바뀌었다 — 이전 캘리브레이션(1-1 95%)과 직접 비교 불가</pre>`;
