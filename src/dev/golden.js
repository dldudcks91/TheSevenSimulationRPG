/**
 * 골든 시드 스냅샷 — Phase 2 엔진 이식의 **검증 도구** (DEV_PLAN §5-A #4).
 *
 * 같은 시드로 같은 지문이 나오면 이식이 성공한 것이다. 지문이 어긋나면 **어느 런의 어느 필드**가
 * 달라졌는지 사람이 읽는다 — 타임라인 전체를 해시하면 "달라졌다"만 알고 어디가 깨졌는지는 못 읽는다.
 *
 * ⚠ **이 파일은 이식 대상이 아니다.** `dev/` 는 검증 도구라 Phase 2 에서 엔진 쪽 언어로 다시 쓴다.
 *   그래서 여기서는 `game_logic/` 을 **읽기만** 한다 — 지문을 만들려고 로직을 고치지 않는다.
 *
 * 스냅샷 생성:  `test.html?golden=write` → `<pre id="golden">` 에 JSON 이 찍힌다. 그걸 `dev/golden.json` 에 저장한다.
 * 대조:         `test.html` 이 매번 `golden.json` 을 읽어 네 단정으로 비교한다 —
 *               **입력(csvHash → balance) 을 먼저, 출력(parties → runs) 을 나중에**. 원인이 입력 쪽이면
 *               런 지문 불일치는 증상일 뿐이라, 그 순서로 읽어야 회귀로 오진하지 않는다.
 */

import { makeRng } from '../game_logic/rng.js';

/** 스냅샷 범위 — 캘리브레이션(시드 20 × 4스테이지)과 **같은 조건**이라 두 표가 서로를 설명한다 (D-A3) */
export const GOLDEN_SEEDS = 10;
export const GOLDEN_STAGES = [101, 102, 103, 104];

/**
 * 사람이 읽는 요약용 손잡이 5키 — **대조는 `meta.balance` 전 키가 한다.**
 * 이 다섯만 대조하던 판(08-31 최초)은 밖의 15+ 키가 지문을 깨는데도 "손잡이는 같다"고 통과시켜
 * **회귀로 오진하게 만들었다.** 지금 이 배열은 통과 메시지의 문구일 뿐이다.
 */
export const GOLDEN_KNOBS = ['monster_atk_scale', 'monster_hp_scale', 'hero_hp_base', 'weapon_atk_base', 'power_growth_per_level'];

/* ── 지문 조각 만들기 ── */

/**
 * FNV-1a 32비트 — CSV 원문의 지문. **암호용이 아니다**(충돌 저항이 필요 없다 —
 * 여기서 답해야 하는 질문은 "이 파일이 스냅샷 때와 같은가" 하나뿐이다).
 * ⚠ 개행은 `\n` 으로 정규화하고 BOM 을 떼고 센다 — `parseCsv` 가 둘 다 무시하므로
 *   CRLF/LF 차이는 게임을 바꾸지 않는다. 그걸로 빨간불이 켜지면 거짓 양성이다.
 */
export function csvHash(text) {
    const s = String(text).replace(/^﻿/, '').replace(/\r\n/g, '\n');
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

/**
 * 드롭 1개의 지문 — `rollDrop` → `build` → `rollAffixes` 의 **rng 소비를 전부** 드러낸다.
 *   `rarity|slot|ilvl|sins|base|element|개체굴림|접사`
 * **접사는 stat·값·순서를 그대로 적는다** — `rollAffixes` 가 풀에서 뽑는 순서가 바뀌면 여기서만 잡힌다.
 * `uid` 는 넣지 않는다 — 발급 순서는 `state.js` 소관이라 전투 결정론과 다른 축이다 (D-A2).
 * 시작 무기(`item.startingWeapon`)도 **같은 형식**으로 적는다 (`meta.parties`).
 */
export const dropSig = it => [
    it.rarity,
    it.slot,
    it.ilvl,
    it.sins.join('+'),
    it.group ?? it.name.en,                       // 무기는 무기군 id · 그 외는 베이스 이름(영문)이 곧 베이스 인덱스다
    it.element ?? '-',                            // 마법 무기만 원소를 굴린다
    it.watk != null ? `w${it.watk}`               // 개체 굴림 — 무기는 watk
        : it.implicit ? `${it.implicit.stat}:${it.implicit.v}`   // 방어구는 implicit
            : '-',                                //         목걸이·반지는 소비 없음
    it.affixes.map(a => `${a.stat}:${a.v}`).join(';') || '-',
].join('|');

/** `{정수키: n}` 을 순서가 흔들리지 않는 문자열로 — 처치 카드 · 처치 수 */
const numMapSig = m => Object.keys(m ?? {}).map(Number).sort((a, b) => a - b)
    .map(id => `${id}:${m[id]}`).join('|') || '-';
/** `{문자열키: n}` 을 순서가 흔들리지 않는 문자열로 — 스킬 시전 횟수 */
const strMapSig = m => Object.keys(m ?? {}).sort()
    .map(k => `${k}:${m[k]}`).join('|') || '-';

/**
 * 정예 편성 — 라운드마다 `라운드:죄종:특성+특성+특성`.
 * `spawnRound` 의 정예 굴림(죄종 1회 · `pickTwo` 2회)이 여기서만 잡힌다 — 특히 `pickTwo` 의
 * `if (b === a) b = (b + 1) % len` 규칙은 다른 어느 필드도 못 본다. 정예를 못 잡고 라운드가 끝나면
 * `kills` 에도 안 남으므로 **스폰 구성 자체**를 적어야 한다.
 * 출처는 타임라인의 `round` 이벤트다 (`roundLog` 는 죄종만 들고 특성을 안 든다).
 */
const eliteSig = timeline => timeline
    .filter(ev => ev.e === 'round')
    .flatMap(ev => (ev.enemies ?? []).filter(en => en.grade === 'elite')
        .map(en => `${ev.n}:${en.sin ?? '-'}:${(en.traits ?? []).map(t => t?.en ?? t).join('+') || '-'}`))
    .join(' ') || '-';

/**
 * 영웅 성장의 지문 — 정산 **후** 파티의 정수 합 셋.
 * `resolveBattle` 은 `simulate` **다음에** `grantXp` 를 돌리므로, 전투 결과만 보는 필드들은
 * `grantXp` 를 통째로 못 본다(40런에서 레벨업 120회 · rng 1,454회가 지문 밖이었다).
 * ⚠ **정수 합만 적는다** — 부동소수를 그대로 넣으면 이식자가 ULP 로 고생한다.
 */
const grewSig = (SYS, G) => {
    const hs = G.party.map(uid => SYS.game.heroById(G, uid)).filter(Boolean);
    const lv = hs.reduce((a, h) => a + (h.level ?? 0), 0);
    const attr = hs.reduce((a, h) => a + Object.values(h.stats ?? {}).reduce((x, v) => x + v, 0), 0);
    const mp = hs.reduce((a, h) => a + (h.masteryPoints ?? 0), 0);
    return `L${lv}/A${attr}/M${mp}`;
};

/**
 * 시작 파티 1개의 지문 — 영웅 3명의 생성 결과와 시작 무기.
 * `hero.drawDistinct`(이름·죄종·직업·특성) · `rollAttributes` · `rollCaps` · `rollInnate` ·
 * `item.startingWeapon` 이 전부 여기 있다. 40런에 중복하지 않고 **시드마다 한 번만** 적는다 (파일 +2KB).
 * 능력치·상한은 **키 이름까지** 적는다 — `hero_attribute.csv` 행 순서가 곧 굴림 순서라 재정렬을 봐야 한다.
 * 형식: `cls|sin|name|trait|innate|stats|caps|무기`
 */
function partyFingerprint(SYS, B, NOW, seed) {
    const party = SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max);
    const G = SYS.game.newGame(seed, party, NOW);
    const kv = o => Object.entries(o ?? {}).map(([k, v]) => `${k}:${v}`).join(',') || '-';
    return G.party.map(uid => {
        const h = SYS.game.heroById(G, uid);
        const w = G.items[h.equipped?.weapon];
        return [
            h.cls, h.sin, h.name?.en ?? '-', h.trait?.en ?? '-',
            h.innate ?? '-',                          // 고유 스킬(생성 시 1회 굴림) — rng 소비 순서가 여기서 걸린다
            kv(h.stats), kv(h.caps),
            w ? dropSig(w) : '-',
        ].join('|');
    });
}

/**
 * 런 1개의 지문.
 * @param seed  시작 파티 시드(`makeRng(1000+seed)`) 겸 세이브 마스터 시드 — 캘리브레이션과 같은 규칙
 */
function runFingerprint(SYS, B, NOW, seed, stage) {
    const party = SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max);
    const G = SYS.game.newGame(seed, party, NOW);
    G.progress.cleared = [101, 102, 103].filter(s => s < stage);      // 해금만 풀어준다 (성장 없음)

    // 전술 칸 — `newGame` 직후 상태 그대로 (인위적으로 켜지 않는다, D-A4). 켜진 효과가 전투 수치에 들어가므로
    // 지문에 남겨야 나중에 달라졌을 때 원인을 읽을 수 있다. 전술은 자기 rng 스트림이라 전투 수열과 안 섞인다.
    // **열린 칸 전체**를 적는다 — 켜진 것만 적으면 칸에 무엇이 들었는지조차 안 남아서,
    // 배정이 바뀌었는데 우연히 둘 다 조건 미달이면 지문이 침묵한다
    // **등급도 적는다** (2026-09-02) — 같은 가족의 다른 등급은 값만 다르므로, 등급이 빠지면 지문이 안 움직인다
    const tactics = SYS.game.tacticState(G).slots.filter(s => s.open)
        .map(s => `${s.no}:${s.option?.id ?? '-'}:${s.option?.grade ?? '-'}:${s.active ? 'on' : 'off'}`).join('|') || '-';

    const r = SYS.game.resolveBattle(G, stage, NOW);
    if (!r.ok) throw new Error(`golden: seed ${seed} stage ${stage} — resolveBattle ${r.err}`);
    const res = r.result, rp = r.report;

    // 쓰러진 영웅은 uid 가 아니라 **파티 자리 번호**로 적는다 (uid 발급은 state.js 축)
    const downed = res.downed.map(uid => G.party.indexOf(uid)).sort((a, b) => a - b).join('|') || '-';

    return {
        seed, stage,
        won: res.won, reason: res.reason,
        rounds: res.rounds.length, cleared: res.roundsCleared,
        sec: res.durationSec,
        downed,
        gold: res.gold, dust: res.dust, xp: res.xpTotal, xpEach: rp.xpEach,
        events: res.timeline.length,                                  // 타임라인 구조 변화 감지
        strikes: `${res.strikes.party.n}/${res.strikes.party.miss} · ${res.strikes.enemy.n}/${res.strikes.enemy.miss}`,
        cards: numMapSig(res.cards),
        kills: numMapSig(res.kills),                                  // 스폰 구성 — 카드는 10%만 뜬다
        casts: strMapSig(res.casts),                                  // 스킬 선택은 rng 를 안 써서 다른 필드가 못 본다
        elites: eliteSig(res.timeline),
        grew: grewSig(SYS, G),                                        // ⚠ resolveBattle **뒤**의 상태 (grantXp)
        tactics,
        drops: res.drops.map(dropSig),
        // 타임라인 전체의 지문 — 요약 필드가 못 보는 순서·값 변화를 잡는다.
        // 어디가 깨졌는지는 위 필드들이 말하고 이 값은 「달라졌다」만 말한다
        tl: csvHash(JSON.stringify(res.timeline)),
    };
}

/**
 * 입력 쪽 지문 — 전투를 한 번도 안 돌린다. 그래서 런 생성이 던져도 이쪽 대조는 살아남는다.
 * @param D  ui/data.js 의 로드 결과 — `balance`(전 키) · `csvText`(파일별 원문)
 */
export function buildMeta(B, D, NOW, created) {
    return {
        created,
        seeds: GOLDEN_SEEDS, stages: GOLDEN_STAGES.slice(), now: NOW,
        knobs: Object.fromEntries(GOLDEN_KNOBS.map(k => [k, B[k]])),
        // **전 키다.** 손잡이 5키만 보던 판은 밖의 키가 지문을 깨뜨려도 통과시켰다
        balance: { ...B },
        // 어느 CSV 가 달라졌는지 — 지문 diff 는 "달라졌다"만 말하고 파일은 못 짚는다
        csvHash: Object.fromEntries(Object.entries(D.csvText ?? {}).map(([f, t]) => [f, csvHash(t)])),
        tacticsNote: 'newGame 직후 상태 그대로 — 전술 칸을 인위적으로 켜지 않는다 (런마다 tactics 에 열린 칸 전체 `번호:옵션:등급:on|off`)',
    };
}

/** 시드별 시작 파티 — 40런에 중복하지 않는다 */
export const buildParties = (SYS, B, NOW) =>
    Object.fromEntries(Array.from({ length: GOLDEN_SEEDS }, (_, i) => [i + 1, partyFingerprint(SYS, B, NOW, i + 1)]));

/** 지문 전체 — `{meta, runs}`. 순서는 스테이지 → 시드 (캘리브레이션 표와 같은 순회) */
export function buildFingerprint(SYS, B, D, NOW, created) {
    const runs = [];
    for (const stage of GOLDEN_STAGES)
        for (let seed = 1; seed <= GOLDEN_SEEDS; seed++)
            runs.push(runFingerprint(SYS, B, NOW, seed, stage));
    return { meta: { ...buildMeta(B, D, NOW, created), parties: buildParties(SYS, B, NOW) }, runs };
}

/* ── 대조 — 전부 「옛값 → 새값」 형식으로 사람이 읽는 문자열을 돌려준다 ── */

const RETAKE = '→ **스냅샷을 다시 찍어야 한다** (test.html?golden=write)';

/** 사전 대조 — 키 합집합을 돌아 `키: 옛값 → 새값`. 기대값에만 있으면 `없음`, 실측에만 있으면 신규 키다 */
function mapDiff(actual, expected, limit) {
    const out = [];
    let n = 0;
    for (const k of new Set([...Object.keys(expected ?? {}), ...Object.keys(actual ?? {})])) {
        const a = actual?.[k], e = expected?.[k];
        if (a === e) continue;
        n++;
        if (out.length < limit) out.push(`${k}: ${e ?? '없음'} → ${a ?? '없음'}`);
    }
    return { n, out };
}

/**
 * CSV 원문 대조 — **골든 지문 불일치보다 먼저 읽어야 한다.**
 * 여기가 깨졌으면 런 지문 diff 는 원인이 아니라 증상이다. "`monster.csv` 가 달라졌다"가 즉시 나온다.
 */
export function compareCsvHash(actual, expected) {
    if (!expected?.meta?.csvHash) return ['golden.json 에 meta.csvHash 가 없다 — 다시 찍어라'];
    const { n, out } = mapDiff(actual.csvHash, expected.meta.csvHash, 8);
    return n ? [`CSV ${n}종이 달라졌다 ${RETAKE}: ${out.join(' · ')}${n > out.length ? ` (+${n - out.length})` : ''}`] : [];
}

/**
 * `balance.csv` **전 키** 대조 — 손잡이 5키만 보던 판이 밖의 15+ 키를 놓쳤다.
 * 다르면 키별로 `키: 옛값 → 새값` 을 최대 8개까지 찍는다.
 */
export function compareBalance(actual, expected) {
    if (!expected?.meta?.balance) return ['golden.json 에 meta.balance 가 없다 — 다시 찍어라'];
    const { n, out } = mapDiff(actual.balance, expected.meta.balance, 8);
    return n ? [`balance ${n}키가 달라졌다 ${RETAKE}: ${out.join(' · ')}${n > out.length ? ` (+${n - out.length})` : ''}`] : [];
}

/**
 * 시작 파티 대조 — 영웅 생성(이름·죄종·직업·특성·고유 스킬·능력치·상한)과 시작 무기가 한 번에 걸린다.
 * `hero_name.csv`·`hero_trait.csv` 행 순서 뒤집기는 이 대조에서만 잡힌다.
 */
export function compareParties(actual, expected, limit = 6) {
    if (!expected?.meta?.parties) return ['golden.json 에 meta.parties 가 없다 — 다시 찍어라'];
    const A = actual.parties ?? {}, E = expected.meta.parties;
    const diffs = [];
    let bad = 0;
    for (const seed of new Set([...Object.keys(E), ...Object.keys(A)])) {
        const a = A[seed] ?? [], e = E[seed] ?? [];
        if (a.length !== e.length) { bad++; if (diffs.length < limit) diffs.push(`[seed ${seed}] 인원 ${e.length} → ${a.length}`); continue; }
        for (let i = 0; i < e.length; i++) {
            if (a[i] === e[i]) continue;
            bad++;
            if (diffs.length < limit) diffs.push(`[seed ${seed}] 영웅 ${i}: ${e[i]} → ${a[i]}`);
        }
    }
    return bad ? [`시작 영웅 ${bad}명 불일치`, ...diffs] : [];
}

/**
 * 런 지문 대조 — **요약을 맨 앞에** 찍는다.
 * 「1런만 어긋남」과 「40런 전부 어긋남」은 이식 검증에서 원인이 전혀 다른데, 예산을 첫 런이
 * 통째로 먹으면 그 둘을 구분할 수 없다. 그래서 런당 `perRun` 개까지만 보여 주고 여러 런을 걸친다.
 * 기대값에만 있는 키가 아니라 **합집합**을 돈다 — 지문에 필드를 추가하고 재촬영을 잊으면
 * 그 필드가 무기한 미검증으로 남기 때문이다.
 */
export function compareGolden(actual, expected, perRun = 2, maxRuns = 6) {
    const A = actual.runs, E = expected?.runs;
    if (!Array.isArray(E)) return ['golden.json 에 runs 배열이 없다'];
    const head = [];
    if (A.length !== E.length) head.push(`런 수 ${E.length} → ${A.length}`);
    const n = Math.min(A.length, E.length);
    const shown = [];
    let bad = 0;
    for (let i = 0; i < n; i++) {
        const a = A[i], e = E[i];
        const d = [];
        for (const k of new Set([...Object.keys(e), ...Object.keys(a)])) {
            if (k === 'drops') continue;
            if (a[k] !== e[k]) d.push(`${k}: ${e[k]} → ${a[k]}`);
        }
        const ad = a.drops ?? [], ed = e.drops ?? [];
        if (ad.length !== ed.length) d.push(`drops 수: ${ed.length} → ${ad.length}`);
        else for (let j = 0; j < ed.length; j++) if (ad[j] !== ed[j]) d.push(`drops[${j}]: ${ed[j]} → ${ad[j]}`);
        if (!d.length) continue;
        bad++;
        if (shown.length < maxRuns)
            shown.push(`[seed ${e.seed} stage ${e.stage}] ${d.slice(0, perRun).join(' · ')}${d.length > perRun ? ` (+${d.length - perRun})` : ''}`);
    }
    if (!bad && !head.length) return [];
    return [`${bad}/${n} 런 불일치`, ...head, ...shown];
}

/** `?golden=write` 로 켠다 — 지문을 페이지에 찍어 사람이 `dev/golden.json` 에 저장한다 (브라우저는 파일을 못 쓴다) */
export const wantsWrite = search => new URLSearchParams(search).get('golden') === 'write';
