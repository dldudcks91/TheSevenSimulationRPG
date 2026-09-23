/**
 * 도박장 슬롯 — **한 판을 굴려 결과를 데이터로 낸다.** 세이브를 모른다 [신설 2026-09-24 · R149 · base_expedition_design 「도박장」 · INTERFACE §2-15].
 *
 * 순수 모듈 — DOM · 저장소 · 시계 · Math.random 접근 없음. **상태도 없다** — 난수는 `rng` 인자로만 받는다.
 * 충전 · 판돈 차감 · 지급은 `state.js`(`gambleState` · `gambleSpin`)가 한다 — 여기는 「판이 어떻게 섰고 판돈의 몇 배를 받나」까지다.
 * 돈의 단위를 모른다 — 골드는 **판돈의 배수**(`goldMult`), 재료는 **1 단계 개수**(`mats`)로 내고 곱하는 것은 부르는 쪽이다.
 *
 * **무엇이 나오는가는 표 넷이 정한다** — 심볼(`slot_symbol.csv`) · 코인(`slot_coin.csv`) · 라인(`slot_line.csv`) · 판돈 단계(`slot_stake.csv`).
 *   코드가 아는 어휘는 심볼 종류 셋(`line` · `wild` · `coin`) · 산출 넷(`gold` · `ore` · `timber` · `dust`) · 코인 종류 둘(`gold` · `jackpot`)뿐이다.
 *
 * 확정 규칙 [2026-09-24 사용자 「일단 만들어 · 나중에 수정」 — 추천값 D1 ~ D8 · base_expedition_design 「도박장」]:
 *   · 판 = 릴 `[balance.csv:gamble_reels]` × 행 `[balance.csv:gamble_rows]` · 라인은 표가 든다 · 맞은 라인마다 따로 준다
 *   · **장비 · 낙인은 안 나온다** — 산출은 골드와 재료 셋뿐 (DQ7 카지노 경품 붕괴 · 낙인 = 챕터 보스의 유한 공급)
 *   · 보너스는 **홀드 앤 스핀 하나** · 잭팟은 **고정 배수**(쌓이지 않는다 — 1인 게임이라 적립식이 의미 없다)
 *   · 결과를 먼저 다 정하고 화면은 재생만 한다 — 연출이 결과와 따로 놀 수 없다(바다이야기의 「예시 ≠ 배당」을 구조로 막는다)
 * ⚠ 값은 전부 제안값 — dev 시뮬로 맞춘 첫 값이다(각 CSV 의 description)
 *
 * @param {object} data
 *   symbols / coins / lines / stakes — 표 넷의 파싱 행
 *   balance — `gamble_reels` · `gamble_rows` · `gamble_hold_trigger` · `gamble_hold_respins` · `gamble_hold_coin_pct`
 */

/** 심볼 종류 · 산출 · 코인 종류 — 어휘만 코드에 있다(값은 표) */
const KINDS = ['line', 'wild', 'coin'];
const YIELDS = ['gold', 'ore', 'timber', 'dust'];
const COIN_KINDS = ['gold', 'jackpot'];

export function createGamble(data) {
    const bad = why => { throw new Error(`gamble: ${why}`); };
    const B = data.balance ?? {};
    const posInt = v => Number.isInteger(v) && v > 0;

    const reels = B.gamble_reels, rows = B.gamble_rows;
    if (!posInt(reels) || !posInt(rows)) bad(`판 크기 ${reels} × ${rows}`);
    const cellCount = reels * rows;
    const trigger = B.gamble_hold_trigger, respins = B.gamble_hold_respins, coinPct = B.gamble_hold_coin_pct;
    if (!posInt(trigger)) bad(`gamble_hold_trigger ${trigger}`);
    if (!posInt(respins)) bad(`gamble_hold_respins ${respins}`);
    if (!(typeof coinPct === 'number' && coinPct >= 0 && coinPct <= 1)) bad(`gamble_hold_coin_pct ${coinPct}`);

    /* ── 심볼 ── */
    const symSeen = new Set();
    const symbols = (data.symbols ?? []).map(r => {
        const id = r.symbol_id;
        if (!id || symSeen.has(id)) bad(`symbol_id '${id}'`);
        symSeen.add(id);
        if (!KINDS.includes(r.kind)) bad(`${id} — kind '${r.kind}'`);
        const coin = r.kind === 'coin';
        if (coin ? r.yield !== '-' : !YIELDS.includes(r.yield)) bad(`${id} — yield '${r.yield}'`);
        if (!(typeof r.weight === 'number' && r.weight >= 0)) bad(`${id} — weight ${r.weight}`);
        if (!coin && !(typeof r.pay === 'number' && r.pay > 0)) bad(`${id} — pay ${r.pay}`);
        if (!r.name_kr || !r.name_en) bad(`${id} — 이름이 비었다`);
        return { id, kind: r.kind, yield: coin ? null : r.yield, weight: r.weight, pay: coin ? 0 : r.pay, name: { ko: r.name_kr, en: r.name_en } };
    });
    for (const k of ['wild', 'coin']) if (symbols.filter(s => s.kind === k).length !== 1) bad(`${k} 심볼은 정확히 하나여야 한다`);
    if (!symbols.some(s => s.kind === 'line')) bad('라인 심볼이 없다');
    const symById = new Map(symbols.map(s => [s.id, s]));
    const WILD = symbols.find(s => s.kind === 'wild').id;
    const COIN = symbols.find(s => s.kind === 'coin').id;
    // 굴림 후보는 가중치 > 0 인 행 — **행 순서 그대로**(INTERFACE §5-2)
    const symPool = symbols.filter(s => s.weight > 0);
    const symTotal = symPool.reduce((a, s) => a + s.weight, 0);
    if (!(symTotal > 0)) bad('심볼 가중치 합이 0 이다');

    /* ── 코인 ── */
    const coinSeen = new Set();
    const coins = (data.coins ?? []).map(r => {
        const id = r.coin_id;
        if (!id || coinSeen.has(id)) bad(`coin_id '${id}'`);
        coinSeen.add(id);
        if (!COIN_KINDS.includes(r.kind)) bad(`코인 ${id} — kind '${r.kind}'`);
        if (!(typeof r.value === 'number' && r.value > 0)) bad(`코인 ${id} — value ${r.value}`);
        if (!(typeof r.weight === 'number' && r.weight >= 0)) bad(`코인 ${id} — weight ${r.weight}`);
        if (r.on_fill !== 0 && r.on_fill !== 1) bad(`코인 ${id} — on_fill ${r.on_fill}`);
        const named = r.name_kr && r.name_kr !== '-';
        if (named && (!r.name_en || r.name_en === '-')) bad(`코인 ${id} — 영어 이름이 비었다`);
        return { id, kind: r.kind, value: r.value, weight: r.weight, onFill: r.on_fill === 1, name: named ? { ko: r.name_kr, en: r.name_en } : null };
    });
    const fills = coins.filter(c => c.onFill);
    if (fills.length !== 1) bad(`on_fill 행은 정확히 하나여야 한다 (${fills.length})`);
    if (fills[0].weight !== 0) bad(`${fills[0].id} — on_fill 행은 굴림에 안 나와야 한다(가중치 0)`);
    const FILL = fills[0];
    const coinById = new Map(coins.map(c => [c.id, c]));
    const coinPool = coins.filter(c => c.weight > 0);
    const coinTotal = coinPool.reduce((a, c) => a + c.weight, 0);
    if (!(coinTotal > 0)) bad('코인 가중치 합이 0 이다');

    /* ── 라인 — 칸 번호 = 릴 × rows + 행 (릴 먼저) ── */
    const lineSeen = new Set();
    const lines = (data.lines ?? []).map(r => {
        const id = r.line_id;
        if (id === undefined || id === '' || lineSeen.has(id)) bad(`line_id '${id}'`);
        lineSeen.add(id);
        const rs = String(r.rows).split('|').map(Number);
        if (rs.length !== reels) bad(`라인 ${id} — 칸 수 ${rs.length} ≠ 릴 ${reels}`);
        if (rs.some(v => !(Number.isInteger(v) && v >= 0 && v < rows))) bad(`라인 ${id} — 행 번호 '${r.rows}'`);
        return { id, rows: rs, cells: rs.map((row, reel) => reel * rows + row) };
    });
    if (!lines.length) bad('라인이 없다');

    /* ── 판돈 단계 ── */
    const stakes = (data.stakes ?? []).map(r => ({ step: r.step, mult: r.mult })).sort((a, b) => a.step - b.step);
    if (!stakes.length) bad('판돈 단계가 없다');
    stakes.forEach((s, i) => {
        if (s.step !== i + 1) bad(`판돈 단계가 1 부터 이어지지 않는다 (${s.step})`);
        if (!(typeof s.mult === 'number' && s.mult > 0)) bad(`판돈 ${s.step} 단계 — mult ${s.mult}`);
    });

    /** 가중 추첨 — **표의 행 순서로 훑는다**(INTERFACE §5-2). 후보는 가중치 > 0 인 행뿐이라 끝까지 가면 마지막 후보 */
    const pick = (rng, pool, total) => {
        let t = rng() * total;
        for (const x of pool) { t -= x.weight; if (t < 0) return x; }
        return pool[pool.length - 1];
    };

    /**
     * 라인 판정 — rng 0. 칸에 **코인이 하나라도 있으면 안 맞는다** · 전부 와일드면 와일드 · 아니면 와일드 아닌 심볼이 전부 같을 때 그 심볼.
     * @returns `{lines: [{line, symbol, yield, pay}], goldMult, mats: {ore, timber, dust}}` — 맞은 라인마다 따로 준다
     */
    function evaluate(cells) {
        const hits = [];
        let goldMult = 0;
        const mats = { ore: 0, timber: 0, dust: 0 };
        for (const ln of lines) {
            const ids = ln.cells.map(i => cells[i]);
            if (ids.includes(COIN)) continue;
            const rest = ids.filter(id => id !== WILD);
            const sym = rest.length === 0 ? WILD : rest.every(id => id === rest[0]) ? rest[0] : null;
            if (!sym) continue;
            const s = symById.get(sym);
            hits.push({ line: ln.id, symbol: s.id, yield: s.yield, pay: s.pay });
            if (s.yield === 'gold') goldMult += s.pay;
            else mats[s.yield] += s.pay;
        }
        return { lines: hits, goldMult, mats };
    }

    /**
     * 한 판 — rng 순서: 칸마다 심볼 → 코인 칸마다 값 → (홀드면) 리스핀마다 빈 칸마다 「서나」 → 서면 값 (INTERFACE §5-2).
     * 홀드 앤 스핀: 첫 판의 코인이 `trigger` 개 이상이면 선다 — 코인은 제자리에 붙고, **새 코인이 하나라도 서면 남은 리스핀이 처음 값으로** 돌아간다.
     * 판이 다 차면 `on_fill` 행을 더 준다. 첫 판의 코인도 값을 든다(홀드가 안 서면 버린다)
     * @returns `{cells, coinAt, lines, hold: null | {start, steps: [{left, landed: [{i, coin}]}], held, full}, goldMult, mats}`
     */
    function spin(rng) {
        const cells = Array.from({ length: cellCount }, () => pick(rng, symPool, symTotal).id);
        const coinAt = cells.map(id => (id === COIN ? pick(rng, coinPool, coinTotal).id : null));
        const out = evaluate(cells);
        let hold = null;
        if (coinAt.filter(Boolean).length >= trigger) {
            const held = coinAt.slice();
            const steps = [];
            let left = respins;
            while (left > 0 && held.some(c => c === null)) {
                const landed = [];
                for (let i = 0; i < cellCount; i++) {
                    if (held[i] !== null) continue;
                    if (rng() < coinPct) {
                        held[i] = pick(rng, coinPool, coinTotal).id;
                        landed.push({ i, coin: held[i] });
                    }
                }
                left = landed.length ? respins : left - 1;
                steps.push({ left, landed });
            }
            const full = held.every(Boolean);
            for (const c of held) if (c) out.goldMult += coinById.get(c).value;
            if (full) out.goldMult += FILL.value;
            hold = { start: coinAt.slice(), steps, held, full };
        }
        return { cells, coinAt, lines: out.lines, hold, goldMult: out.goldMult, mats: out.mats };
    }

    return { symbols, coins, lines, stakes, reels, rows, trigger, respins, fill: FILL.id, evaluate, spin };
}
