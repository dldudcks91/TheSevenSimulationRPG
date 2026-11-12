/**
 * 퍼널 — 배포판 플레이 기록(`players/<uid>` · `saves/<uid>`)을 모아 본다
 *   (ADR-0633 · SCREEN_DESIGN §2-1 · INTERFACE §4 「플레이 기록」 · src/dev/README.md 「퍼널」).
 * 읽기는 관리자만 — Google 로그인 + Firestore 보안 규칙의 uid 목록. 거부되면 로그인한 uid 를 보여 준다(규칙에 넣을 값).
 * Firebase 앱을 **이름을 붙여** 따로 연다 — 같은 주소에서 도는 게임의 익명 계정(기본 앱)을 이 페이지의 Google 로그인이 덮지 않게.
 * 닉네임은 바깥에서 온 글자라 innerHTML 에 넣지 않는다 — 전부 textContent 로 그린다.
 */

import { FIREBASE_CONFIG } from '../ui/firebase_config.js';
import { parseCsv } from '../game_logic/csv.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';
const DAY = 24 * 3600 * 1000;
// 기능 표에서 빼는 카운터 — 시작 영웅 · 시작 장비에도 오르는 번호표라 「써 봤다」가 안 된다
const COUNTER_SKIP = new Set(['hero', 'item']);
const COUNTER_LABEL = {
    battle: '원정 출발', tavern: '선술집 리롤', upgrade: '강화 시도', make: '제작', gamble: '도박',
    commission: '의뢰', search: '수색', explore: '탐험', join: '가입 희망 도착', tactic: '전술 리롤', mg: '미니게임',
};

let fb = null;       // { A, F, auth, db }
let stages = [];     // stage.csv 행 — 파일 순서 = 진행 순서
let diffs = [];      // difficulty_tier.csv 행 — order 순
let players = [];    // [{ uid, ...진행 요약 }]

/* ───────── 그리기 도구 ───────── */

const $ = id => document.getElementById(id);
function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
}
const td = (text, cls) => el('td', cls, text);
const th = (text, cls) => el('th', cls, text);
function tr(cells, cls) {
    const r = el('tr', cls);
    for (const c of cells) r.appendChild(c);
    return r;
}
function groupRow(label, span) {
    const c = td(label);
    c.colSpan = span;
    return tr([c], 'grp');
}
/** 비율 막대 칸 — 한 계열(크기)이라 범례가 없다 · 값은 막대 옆 글자 · 올리면 수 */
function barTd(share, tip) {
    const c = td(null, 'l');
    c.title = tip;
    const cell = el('div', 'barcell');
    const track = el('div', 'track');
    const bar = el('div', share > 0 ? 'bar' : 'bar zero');
    bar.style.width = `${(share * 100).toFixed(1)}%`;
    track.appendChild(bar);
    cell.append(track, el('span', '', pct(share)));
    c.appendChild(cell);
    return c;
}

const pad = n => String(n).padStart(2, '0');
// Firestore 시각(`lastSeen` — 서버 시각) · 숫자(`firstSeen`) 둘 다 받는다
const ms = v => (v?.toMillis ? v.toMillis() : typeof v === 'number' ? v : null);
function fmtDate(v) {
    const t = ms(v);
    if (t == null) return '—';
    const d = new Date(t);
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDur(v) {
    const m = Math.round((v ?? 0) / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m}m`;
}
const pct = x => `${Math.round(x * 100)}%`;
function median(list) {
    const s = [...list].sort((a, b) => a - b);
    const i = s.length >> 1;
    return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
}
const stageLabel = s => `${s.chapter}-${s.stage_num}-${s.cell}`;
const diffName = id => diffs.find(d => d.difficulty_id === id)?.name_kr ?? id ?? '—';

/* ───────── 계정 · 읽기 ───────── */

async function sdk() {
    const [app, A, F] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore-lite.js`),
    ]);
    const a = app.initializeApp(FIREBASE_CONFIG, 'funnel');
    return { A, F, auth: A.getAuth(a), db: F.getFirestore(a) };
}

function signOutBtn() {
    const b = el('button', '', '로그아웃');
    b.onclick = async () => { await fb.A.signOut(fb.auth); location.reload(); };
    return b;
}

function showLogin(msg) {
    const box = $('auth');
    box.replaceChildren();
    if (msg) box.appendChild(el('div', 'warn', msg));
    const b = el('button', '', 'Google 로그인');
    b.onclick = async () => {
        try {
            await fb.A.signInWithPopup(fb.auth, new fb.A.GoogleAuthProvider());
            await load();
        } catch (e) { showLogin(`로그인 실패 — ${e.code ?? e.message}`); }
    };
    box.appendChild(b);
}

/** 읽기 거부 — 이 계정의 uid 를 보여 준다. 규칙의 관리자 목록에 넣으면 읽힌다 */
function denied(u) {
    const box = $('auth');
    const copy = el('button', '', '복사');
    copy.onclick = () => navigator.clipboard?.writeText(u.uid);
    box.replaceChildren(
        el('div', 'warn', '읽기 거부 — 이 계정은 보안 규칙의 관리자 목록에 없다. 아래 uid 를 규칙의 isAdmin() 목록에 넣고 게시한다 (src/dev/README.md 「퍼널」)'),
        el('span', '', `${u.email ?? ''} · uid `), el('code', '', u.uid), ' ', copy, ' ', signOutBtn(),
    );
}

async function load() {
    const u = fb.auth.currentUser;
    const box = $('auth');
    box.replaceChildren(el('span', '', `${u.email ?? u.uid} 로 읽는 중 …`));
    try {
        const snap = await fb.F.getDocs(fb.F.collection(fb.db, 'players'));
        players = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (e) {
        if (e.code === 'permission-denied') { denied(u); return; }
        box.replaceChildren(el('span', 'warn', `읽기 실패 — ${e.code ?? e.message}`), ' ', signOutBtn());
        return;
    }
    box.replaceChildren(el('span', '', `${u.email ?? ''} · 기록 ${players.length}건 · ${fmtDate(Date.now())} 에 읽음 `), signOutBtn());
    $('controls').hidden = false;
    document.querySelector('.need-data').hidden = false;
    draw();
}

/* ───────── 집계 ───────── */

function filtered() {
    const range = $('range').value;
    const idle = $('hideIdle').checked;
    const from = range === 'all' ? -Infinity : Date.now() - Number(range) * DAY;
    return players.filter(p => (ms(p.firstSeen) ?? 0) >= from && !(idle && !(p.expMs > 0)));
}

/** 퍼널 단계 — 첫 방문 → 새 게임 → 첫 승리 → 장소마다 완료(그 장소 마지막 칸 · 칸 단위면 칸마다) → 난이도마다 첫 승리 */
function steps(cells) {
    const out = [
        { label: '첫 방문', hit: () => true },
        { label: '새 게임', hit: p => !!p.started },
        { label: '첫 승리', hit: p => (p.cleared?.length ?? 0) > 0 },
    ];
    const places = new Map();
    for (const s of stages) {
        const k = `${s.chapter}-${s.stage_num}`;
        if (!places.has(k)) places.set(k, []);
        places.get(k).push(s);
    }
    let chapter = null;
    for (const [k, rows] of places) {
        if (rows[0].chapter !== chapter) { chapter = rows[0].chapter; out.push({ group: `${chapter}장` }); }
        for (const s of cells ? rows : [rows.at(-1)]) {
            out.push({
                label: cells ? `${stageLabel(s)} ${s.stage_name_kr}` : `${k} ${s.stage_name_kr} 완료`,
                hit: p => !!p.cleared?.includes(s.stage_id),
                reach: String(s.stage_id),
            });
        }
    }
    out.push({ group: '난이도' });
    for (const d of diffs.slice(1)) out.push({ label: `${d.name_kr} 첫 승리`, hit: p => (p.clearedIn?.[d.difficulty_id]?.length ?? 0) > 0 });
    return out;
}

function drawTiles(list) {
    const now = Date.now();
    const started = list.filter(p => p.started);
    const active = days => list.filter(p => (ms(p.lastSeen) ?? 0) >= now - days * DAY).length;
    const exp = started.map(p => p.expMs ?? 0);
    const tiles = [
        ['유저', list.length],
        ['새 게임 시작', started.length],
        ['24시간 안에 접속', active(1)],
        ['7일 안에 접속', active(7)],
        ['원정 시간 중앙값', exp.length ? fmtDur(median(exp)) : '—'],
    ];
    $('tiles').replaceChildren(...tiles.map(([k, v]) => {
        const t = el('div', 'tile');
        t.append(el('b', '', v), el('span', '', k));
        return t;
    }));
}

function drawFunnel(list) {
    const t = $('funnel');
    t.replaceChildren(tr([th('단계', 'l'), th('도달'), th('전체 대비', 'l'), th('앞 단계 대비'), th('걸린 원정 시간 (표본)')]));
    const total = list.length;
    let prev = null;
    for (const s of steps($('cells').checked)) {
        if (s.group) { t.appendChild(groupRow(s.group, 5)); continue; }
        const hits = list.filter(s.hit);
        const n = hits.length;
        // 처음 기록할 때 이미 깨 있던 칸은 시각을 모른다(null) — 중앙값에서 뺀다
        const times = s.reach ? hits.map(p => p.reach?.[s.reach]).filter(v => typeof v === 'number') : [];
        t.appendChild(tr([
            td(s.label, 'l'),
            td(n),
            barTd(total ? n / total : 0, `${s.label} — ${n} / ${total}명`),
            td(prev ? pct(n / prev) : '—'),
            td(times.length ? `${fmtDur(median(times))} (${times.length})` : '—'),
        ]));
        prev = n;
    }
}

function drawFeatures(list) {
    const started = list.filter(p => p.started);
    const t = $('features');
    t.replaceChildren(tr([th('기능', 'l'), th('써 본 유저'), th('비율', 'l'), th('중앙값 (써 본 유저)')]));
    const keys = [...new Set(started.flatMap(p => Object.keys(p.counters ?? {})))].filter(k => !COUNTER_SKIP.has(k));
    const usedBy = k => started.filter(p => (p.counters?.[k] ?? 0) > 0);
    keys.sort((a, b) => usedBy(b).length - usedBy(a).length);
    for (const k of keys) {
        const users = usedBy(k);
        const label = COUNTER_LABEL[k] ? `${COUNTER_LABEL[k]} (${k})` : k;
        t.appendChild(tr([
            td(label, 'l'),
            td(users.length),
            barTd(started.length ? users.length / started.length : 0, `${label} — ${users.length} / ${started.length}명`),
            td(users.length ? median(users.map(p => p.counters[k])) : '—'),
        ]));
    }
    if (!keys.length) t.appendChild(groupRow('새 게임을 시작한 유저가 없다', 4));
}

/** 가장 먼 노말 칸 — stage.csv 순서로 */
function farthest(p) {
    const done = new Set(p.cleared ?? []);
    for (let i = stages.length - 1; i >= 0; i--) if (done.has(stages[i].stage_id)) return stages[i];
    return null;
}

/** 깬 칸이 있는 가장 깊은 단 — 없으면 노말(깬 게 있을 때) */
function deepestDiff(p) {
    for (const d of [...diffs].reverse()) {
        if (d.order === 1) return (p.cleared?.length ?? 0) > 0 ? d.name_kr : '—';
        if ((p.clearedIn?.[d.difficulty_id]?.length ?? 0) > 0) return d.name_kr;
    }
    return '—';
}

async function downloadSave(p, btn) {
    btn.disabled = true;
    try {
        const snap = await fb.F.getDoc(fb.F.doc(fb.db, 'saves', p.uid));
        if (!snap.exists()) { btn.textContent = '없음'; return; }
        const { data, savedAt } = snap.data();
        const a = el('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const who = (p.nick || p.uid.slice(0, 6)).replace(/[^\w가-힣-]/g, '_');
        a.download = `save_${who}_${fmtDate(savedAt).replace(/[-: ]/g, '')}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
        btn.textContent = e.code ?? '실패';
    } finally {
        btn.disabled = false;
    }
}

function drawUsers(list) {
    const t = $('users');
    t.replaceChildren(tr(['닉네임', 'uid', '첫 방문', '마지막 접속', '켠 횟수', '원정 시간', '가장 먼 칸 (노말)', '가장 깊은 단', '고른 단', '영웅', '최고 Lv', '언어', '세이브']
        .map((h, i) => th(h, i < 2 || i === 6 ? 'l' : ''))));
    const sorted = [...list].sort((a, b) => (ms(b.lastSeen) ?? 0) - (ms(a.lastSeen) ?? 0));
    for (const p of sorted) {
        const far = farthest(p);
        const save = el('button', '', '받기');
        save.onclick = () => downloadSave(p, save);
        const cell = td(null);
        cell.appendChild(save);
        t.appendChild(tr([
            td(p.nick || '—', p.nick ? 'l' : 'l muted'),
            td(p.uid.slice(0, 8), 'l muted'),
            td(fmtDate(p.firstSeen)),
            td(fmtDate(p.lastSeen)),
            td(p.sessions ?? '—'),
            td(p.started ? fmtDur(p.expMs) : '—'),
            td(far ? `${stageLabel(far)} ${far.stage_name_kr}` : p.started ? '없음' : '새 게임 전', 'l'),
            td(deepestDiff(p)),
            td(p.started ? diffName(p.difficulty) : '—'),
            td(p.heroes ?? '—'),
            td(p.maxLevel ?? '—'),
            td(p.lang ?? '—'),
            cell,
        ]));
    }
}

function draw() {
    const list = filtered();
    drawTiles(list);
    drawFunnel(list);
    drawFeatures(list);
    drawUsers(list);
}

/* ───────── 켜기 ───────── */

async function boot() {
    const [st, df] = await Promise.all(['stage', 'difficulty_tier'].map(n =>
        fetch(`../data/${n}.csv`).then(r => r.text()).then(parseCsv)));
    stages = st;
    diffs = df.sort((a, b) => a.order - b.order);
    fb = await sdk();
    await fb.auth.authStateReady();
    for (const id of ['range', 'hideIdle', 'cells']) $(id).onchange = draw;
    $('reload').onclick = load;
    if (fb.auth.currentUser) await load();
    else showLogin();
}

boot().catch(e => {
    console.error(e);
    $('auth').replaceChildren(el('span', 'warn', `켜지 못했다 — ${e.message ?? e}`));
});
