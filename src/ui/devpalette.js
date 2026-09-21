/**
 * devpalette.js — 개발용 색 피커 (SCREEN_DESIGN §10-1)
 *
 * 상단바 오른쪽 끝 `⚙` 을 누르면 열리는 판. 배경 RGB · 글자 3단 · 투명도 3축을 실시간으로 바꿔 보고,
 * 맘에 드는 값이 나오면 그 자리에서 `style.css` 에 붙여 넣을 줄을 뽑는다. **게임 기능이 아니다.**
 *
 * 어떻게 동작하나 — `style.css:root` 의 **표면 계단**(`--surface-0`~`--surface-7`) · 채널 변수 · 투명도 토큰을
 * `documentElement` 인라인 스타일로 덮어쓴다. 화면의 모든 배경이 그 사다리에서 값을 받으므로
 * (2026-09-14 하드코딩 정리) 여덟 개만 갈아 끼우면 탭 열 · 상단바 · 패널 · hover 까지 전부 따라온다.
 *
 * ⚠ **판을 다시 그리지 않는다** — 값이 바뀔 때마다 `innerHTML` 을 새로 쓰면 잡고 있던 슬라이더가
 *   DOM 에서 사라져 **드래그가 끊긴다**(2026-09-14 사용자 보고). 판은 열 때 한 번만 만들고,
 *   그 뒤로는 `syncPanel()` 이 숫자칸 · 견본 · CSS 칸의 **값만** 갈아 끼운다.
 *
 * ⚠ 스타일을 `style.css` 가 아니라 이 파일 안에 넣었다 — **개발 장치는 한 파일로 끝나야 지우기 쉽다.**
 *    걷어내려면 이 파일과 `app.js` 의 import 한 줄만 지우면 된다.
 *
 * ⚠ 문구는 전부 영어 · 기호다. 다국어 대상이 아니다(유저에게 안 보인다).
 */

const KEY = 'devPalette';

/** 사다리 단수 — style.css 의 `--surface-N` 개수와 맞춘다 */
const STEPS = 8;

/** 패널 알파 3종 — `--chrome-alpha` 기준으로 나머지가 얼마씩 위인지가 고정이다 */
const ALPHAS = ['chrome-alpha', 'panel-alpha', 'panel-alpha-soft'];

/** 슬라이더 정의 — id · 라벨 · 상한 · 상태를 읽고 쓰는 법 */
const SLIDERS = [
    { id: 'R',   sec: 'bg',  max: 255, get: s => s.bg[0],  set: (s, v) => s.bg[0] = v },
    { id: 'G',   sec: 'bg',  max: 255, get: s => s.bg[1],  set: (s, v) => s.bg[1] = v },
    { id: 'B',   sec: 'bg',  max: 255, get: s => s.bg[2],  set: (s, v) => s.bg[2] = v },
    { id: 'T1',  sec: 'tx',  max: 255, get: s => s.text[0], set: (s, v) => s.text[0] = v },
    { id: 'T2',  sec: 'tx',  max: 255, get: s => s.text[1], set: (s, v) => s.text[1] = v },
    { id: 'T3',  sec: 'tx',  max: 255, get: s => s.text[2], set: (s, v) => s.text[2] = v },
    { id: 'ART', sec: 'op',  max: 100, get: s => s.art,    set: (s, v) => s.art = v },
    { id: 'PNL', sec: 'op',  max: 100, get: s => s.panel,  set: (s, v) => s.panel = v },
    { id: 'VIG', sec: 'op',  max: 200, get: s => s.vig,    set: (s, v) => s.vig = v },
];

const clampTo = (n, max) => Math.max(0, Math.min(max, Math.round(n)));
const clamp = n => clampTo(n, 255);
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');

/** 0~max 눈금을 CSS 가 받는 소수로 — 알파는 1 을, 비네트 배율은 2 를 넘지 않는다 */
const pct = (n, max = 100) => (clampTo(n, max) / 100).toFixed(2);

/** `#rrggbb` · `r, g, b` 어느 쪽이든 [r,g,b] 로 */
function parse(raw) {
    const s = (raw || '').trim();
    if (s.startsWith('#')) return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
    const n = s.split(',').map(v => parseInt(v, 10));
    return n.length === 3 && n.every(v => !isNaN(v)) ? n : [0, 0, 0];
}

/** 덮어쓰기 전의 CSS 기본값 — 「Reset」이 돌아갈 자리이자 오프셋의 기준 */
function readDefaults() {
    const cs = getComputedStyle(document.documentElement);
    const v = k => cs.getPropertyValue(k).trim();
    return {
        surfaces: Array.from({ length: STEPS }, (_, i) => parse(v(`--surface-${i}`))),
        veil: parse(v('--veil-rgb')),
        text: ['primary', 'secondary', 'muted'].map(t => parse(v(`--text-${t}`))),
        art: Math.round(parseFloat(v('--art-opacity')) * 100),
        vig: Math.round(parseFloat(v('--vignette')) * 100),
        alphas: ALPHAS.map(a => Math.round(parseFloat(v(`--${a}`)) * 100)),
    };
}

/** 0단 대비 오프셋 — 사다리의 간격은 늘 이 값을 지킨다 */
const surfaceOffset = (D, i) => D.surfaces[i].map((c, k) => c - D.surfaces[0][k]);

/** 지금 상태가 만드는 사다리 8색 */
const ladderOf = (D, st) =>
    D.surfaces.map((_, i) => {
        const off = surfaceOffset(D, i);
        return hex(st.bg.map((c, k) => clamp(c + off[k])));
    });

/**
 * 고른 값을 실제 변수로 민다.
 * 사다리의 **간격은 기본값 그대로 유지**하고 바닥만 옮긴다 — 간격까지 비례로 줄이면
 * 어두운 쪽에서 패널 구분이 뭉개진다(2026-09-14 실측).
 */
function apply(D, st) {
    const root = document.documentElement.style;
    ladderOf(D, st).forEach((c, i) => root.setProperty(`--surface-${i}`, c));
    root.setProperty('--surface-0-rgb', st.bg.map(clamp).join(', '));
    const veilOff = D.veil.map((c, k) => c - D.surfaces[0][k]);
    root.setProperty('--veil-rgb', st.bg.map((c, k) => clamp(c + veilOff[k])).join(', '));
    ['primary', 'secondary', 'muted'].forEach((t, i) => {
        const g = clamp(st.text[i]);
        root.setProperty(`--text-${t}`, hex([g, g, g]));
    });
    root.setProperty('--art-opacity', pct(st.art));
    root.setProperty('--vignette', pct(st.vig, 200));
    ALPHAS.forEach((a, i) => root.setProperty(`--${a}`, pct(st.panel + D.alphas[i] - D.alphas[0])));
}

function clear() {
    const root = document.documentElement.style;
    for (let i = 0; i < STEPS; i++) root.removeProperty(`--surface-${i}`);
    ['--surface-0-rgb', '--veil-rgb', '--text-primary', '--text-secondary', '--text-muted',
        '--art-opacity', '--vignette', ...ALPHAS.map(a => `--${a}`)]
        .forEach(k => root.removeProperty(k));
}

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const save = st => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 사생활 모드 */ } };

/** 기본값에서 출발하는 상태 */
const freshState = D => ({
    bg: D.surfaces[0].slice(), text: D.text.map(t => t[0]),
    art: D.art, vig: D.vig, panel: D.alphas[0],
});

let DEFAULTS = null;   // 한 번만 읽는다 — 덮어쓴 뒤에 읽으면 기준이 오염된다
let state = null;
let panel = null;
let ui = null;         // 판 안의 노드 참조 — 다시 그리지 않으므로 계속 살아 있다

/** 부팅 직후 1회 — 저장된 값이 있으면 되살린다 */
export function initDevPalette() {
    if (DEFAULTS) return;
    DEFAULTS = readDefaults();
    const saved = load();
    state = saved || freshState(DEFAULTS);
    if (saved) apply(DEFAULTS, state);
}

/** 상단바가 다시 그려질 때마다 호출된다 — 버튼은 매번 새로 붙는다 (app.js 의 전체 다시 그림) */
export function mountDevPalette(container) {
    initDevPalette();
    injectStyle();
    const b = document.createElement('button');
    b.className = 'btn sm dp-btn';
    b.textContent = '⚙';
    b.title = 'Dev palette — background / text / opacity';
    b.onclick = () => togglePanel();
    container.appendChild(b);
}

function togglePanel() {
    if (panel) { panel.remove(); panel = null; ui = null; return; }
    panel = document.createElement('div');
    panel.className = 'dp-panel';
    document.body.appendChild(panel);
    buildPanel();
}

/** 한 줄 = 라벨 + 슬라이더 + 숫자칸. **한 번만** 만든다 */
function sliderRow(d) {
    const wrap = document.createElement('label');
    wrap.className = 'dp-row';
    wrap.innerHTML = `<span class="dp-k">${d.id}</span>`;
    const range = document.createElement('input');
    range.type = 'range'; range.min = 0; range.max = d.max; range.step = 1;
    const num = document.createElement('input');
    num.type = 'number'; num.min = 0; num.max = d.max; num.className = 'dp-n';
    wrap.append(range, num);
    const push = v => {
        d.set(state, clampTo(v, d.max));
        apply(DEFAULTS, state); save(state); syncPanel(range);
    };
    range.addEventListener('input', () => push(+range.value));
    num.addEventListener('input', () => { if (num.value !== '') push(+num.value); });
    return { wrap, range, num, def: d };
}

function buildPanel() {
    panel.innerHTML = `
        <div class="dp-h">Dev palette<button class="dp-x" title="close">×</button></div>
        <div class="dp-sec">BACKGROUND</div>
        <label class="dp-row dp-pick"><span class="dp-k">#</span>
            <input type="color" class="dp-color"><output class="dp-hexout"></output></label>
        <div class="dp-rows" data-sec="bg"></div>
        <div class="dp-sw"></div>
        <div class="dp-sec">TEXT</div>
        <div class="dp-rows" data-sec="tx"></div>
        <div class="dp-sec">OPACITY <i class="dp-hint">art / panel / vignette</i></div>
        <div class="dp-rows" data-sec="op"></div>
        <div class="dp-sec">CSS</div>
        <textarea class="dp-out" readonly rows="7" spellcheck="false"></textarea>
        <div class="dp-foot"><button class="btn sm dp-reset">Reset</button></div>`;

    const rows = SLIDERS.map(sliderRow);
    rows.forEach(r => panel.querySelector(`.dp-rows[data-sec="${r.def.sec}"]`).appendChild(r.wrap));

    ui = {
        rows,
        color: panel.querySelector('.dp-color'),
        hexout: panel.querySelector('.dp-hexout'),
        sw: panel.querySelector('.dp-sw'),
        out: panel.querySelector('.dp-out'),
    };
    // 색 상자 — 슬라이더 셋보다 이쪽이 빠를 때가 많다
    ui.color.addEventListener('input', () => {
        state.bg = parse(ui.color.value);
        apply(DEFAULTS, state); save(state); syncPanel(ui.color);
    });
    for (let i = 0; i < STEPS; i++) ui.sw.appendChild(document.createElement('i'));

    panel.querySelector('.dp-x').onclick = () => togglePanel();
    panel.querySelector('.dp-reset').onclick = () => {
        state = freshState(DEFAULTS); clear(); save(state); syncPanel();
    };
    syncPanel();
}

/**
 * 값만 갈아 끼운다 — 노드를 다시 만들지 않는다.
 * `origin` 은 지금 사용자가 잡고 있는 입력칸이다. 거기에 값을 되쓰면 드래그가 튀므로 건너뛴다.
 */
function syncPanel(origin) {
    if (!ui) return;
    ui.rows.forEach(r => {
        const v = String(r.def.get(state));
        if (r.range !== origin && r.range.value !== v) r.range.value = v;
        if (r.num !== origin && r.num.value !== v) r.num.value = v;
    });
    const base = hex(state.bg);
    if (ui.color !== origin) ui.color.value = base;
    ui.hexout.textContent = base + '  ' + state.bg.map(clamp).join(', ');
    ladderOf(DEFAULTS, state).forEach((c, i) => {
        const el = ui.sw.children[i];
        el.style.background = c;
        el.title = `--surface-${i}: ${c}`;
    });
    ui.out.value = cssOut();
}

/** 그대로 style.css 에 붙여 넣을 수 있는 형태 */
function cssOut() {
    const g = i => { const v = clamp(state.text[i]); return hex([v, v, v]); };
    const veilOff = DEFAULTS.veil.map((c, k) => c - DEFAULTS.surfaces[0][k]);
    return [
        ...ladderOf(DEFAULTS, state).map((c, i) => `--surface-${i}: ${c};`),
        `--surface-0-rgb: ${state.bg.map(clamp).join(', ')};`,
        `--veil-rgb: ${state.bg.map((c, k) => clamp(c + veilOff[k])).join(', ')};`,
        `--text-primary: ${g(0)};`, `--text-secondary: ${g(1)};`, `--text-muted: ${g(2)};`,
        `--art-opacity: ${pct(state.art)};`, `--vignette: ${pct(state.vig, 200)};`,
        ...ALPHAS.map((a, i) => `--${a}: ${pct(state.panel + DEFAULTS.alphas[i] - DEFAULTS.alphas[0])};`),
    ].join('\n');
}

let styled = false;
function injectStyle() {
    if (styled) return;
    styled = true;
    const s = document.createElement('style');
    s.textContent = `
.dp-btn { margin-left: 4px; min-width: 30px; }
.dp-panel {
    position: fixed; right: 12px; top: 56px; z-index: 90; width: 280px;
    background: #101010; border: 1px solid #444; padding: 10px 12px;
    font-size: 12px; color: #e8e8e8; box-shadow: 0 8px 28px rgba(0,0,0,.8);
    /* 슬라이더가 아홉 개라 낮은 창에서는 넘친다 — 판 안에서 굴린다 */
    max-height: calc(100vh - 72px); overflow-y: auto;
}
.dp-h { display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 8px; }
.dp-x { background: none; border: 0; color: #aaa; font-size: 17px; line-height: 1; cursor: pointer; }
.dp-sec { color: #888; letter-spacing: 1px; font-size: 10px; margin: 10px 0 5px; }
.dp-hint { color: #666; font-style: normal; letter-spacing: 0; }
.dp-row { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
.dp-k { width: 22px; color: #aaa; flex: 0 0 auto; }
.dp-pick { margin-bottom: 7px; }
.dp-color { width: 54px; height: 22px; padding: 0; border: 1px solid #444; background: #000; cursor: pointer; }
.dp-hexout { font-family: ui-monospace, Consolas, monospace; font-size: 11px; color: #9a9a9a; }
/* 판 안으로 가둔다 — 자원 탭의 단 이름도 .dp-n 이라 이 규칙이 새면 그 이름이 50px 상자로 눌린다 (2026-09-21) */
.dp-panel .dp-n { width: 50px; flex: 0 0 auto; background: #000; color: #e8e8e8;
        border: 1px solid #444; padding: 2px 4px; font-size: 11px; }

/* 슬라이더 — 기본 두께로는 잡기가 어렵다. 트랙을 키우고 손잡이를 크게 준다 */
.dp-row input[type=range] {
    flex: 1 1 auto; min-width: 0; height: 18px; margin: 0;
    -webkit-appearance: none; appearance: none; background: none; cursor: pointer;
}
.dp-row input[type=range]::-webkit-slider-runnable-track {
    height: 6px; background: #2e2e2e; border: 1px solid #4a4a4a; border-radius: 3px;
}
.dp-row input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 15px; height: 15px; margin-top: -5px; border-radius: 50%;
    background: #d8d8d8; border: 1px solid #000; cursor: grab;
}
.dp-row input[type=range]:active::-webkit-slider-thumb { background: #fff; cursor: grabbing; }

.dp-sw { display: flex; gap: 2px; margin-top: 7px; }
.dp-sw i { flex: 1; height: 18px; border: 1px solid #333; }
.dp-out { width: 100%; background: #000; color: #9fdf9f; border: 1px solid #444;
          font-family: ui-monospace, Consolas, monospace; font-size: 10px; resize: vertical; }
.dp-foot { margin-top: 8px; text-align: right; }`;
    document.head.appendChild(s);
}
