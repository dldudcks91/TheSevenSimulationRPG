/**
 * 플레이 기록 어댑터 — **Firebase 를 만지는 유일한 파일** (SCREEN_DESIGN §2-1 · ADR-0633 · ARCHITECTURE §8).
 *
 * 하는 일 — 방문 집계(Analytics 켜기 · ADR-1049) · 익명 계정 확보 · 진행 요약과 세이브 사본을 **한 묶음으로 올리기** · 콜로세움 데모(arena_design §9 · ADR-1040 · ADR-1042 · 2026-11-11)의
 *   방어 편성 올리기 · 지우기(따로 쓴다) · 남의 방어 편성과 내 방어 기록 **받기** · 친구와 전투 목록 한 쪽 받기(찾기) · 방어자의 기록함에 한 줄 쓰기 ·
 *   이름 뒤 **태그**(`tagOf` — 계정 id 에서 뽑는 네 자리) ·
 *   **아이디 계정**(2026-11-18 · SCREEN_DESIGN §2-1 「계정」 · ADR-1263) — 익명 계정에 아이디 · 비밀번호 붙이기 · 그 계정으로 로그인 · 사본 받기 · 주인 표식 쓰기 · 로그아웃.
 * **세이브를 받는 것은 아이디 계정뿐이다** — 익명 계정의 세이브 주인은 이 브라우저다. 그 밖에 받는 것은 콜로세움 둘이다.
 * **세이브 형식은 모른다** — 받은 요약은 `players/<uid>` 에 그대로, 세이브는 JSON 문자열 하나로 `saves/<uid>` 에 넣을 뿐이다
 *   (Firestore 는 배열 안 배열을 못 담는다 — `formation.ranks`). 방어 편성도 팀 코드 JSON 문자열 하나다(`arenaTeams/<uid>`).
 * SDK 는 **처음 부를 때** CDN 에서 불러온다 — 게임은 기다리지 않는다.
 * 결과는 `{ ok: true, … }` / `{ ok: false, err }` — err: 'network' · 'signIn' · 계정 쪽은 아래 `AUTH_ERR` 의 값 · 'read'(사본 받기 거부) ·
 *   'taken'(다른 곳이 이 계정을 열었다) · 'anon'(계정이 없다). 던지지 않는다.
 */

import { FIREBASE_CONFIG } from './firebase_config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';
// Firestore 문서 하나의 상한은 1MiB — 봉투 필드 몫을 남기고 자른다. 넘으면 세이브 사본만 건너뛴다.
//   게임 수치가 아니라 저장소 사정이라 CSV 가 아니다 (ADR-0112 선례)
const MAX_BYTES = 1000 * 1000;
// 한 번에 받는 방어 편성 · 방어 기록 줄 수 — 무료 한도(하루 읽기)를 아끼는 저장소 사정이라 CSV 가 아니다 (위와 같은 선례)
const PULL_TEAMS = 30;
const PULL_LOG = 10;

let base = null;
/** 앱을 한 번만 만든다 — Analytics 와 계정 · 저장소가 같은 앱을 쓴다(같은 앱을 두 번 만들면 SDK 가 거부한다) · 실패하면 다음 호출이 다시 시도한다 */
function appOnce() {
    base ??= import(`${SDK}/firebase-app.js`)
        .then(app => app.initializeApp(FIREBASE_CONFIG))
        .catch(e => { base = null; throw e; });
    return base;
}

let ready = null;
/** SDK 를 한 번만 불러온다 — 실패하면 다음 호출이 다시 시도한다 */
function sdk() {
    ready ??= Promise.all([
        appOnce(),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore-lite.js`),
    ]).then(([fb, A, F]) => ({ A, F, auth: A.getAuth(fb), db: F.getFirestore(fb) }))
        .catch(e => { ready = null; throw e; });
    return ready;
}

const fail = (err, e) => { if (e) console.warn(`cloud: ${err}`, e); return { ok: false, err }; };

let analytics = null;
/**
 * 방문 집계 — Google Analytics 를 켠다 (ADR-1049). 켜기만 하면 SDK 가 첫 방문 · 세션 · 페이지 보기를 스스로 보낸다 —
 * Firebase 콘솔 첫 화면 「사용자 활동」이 이 숫자다. 게임 이벤트는 안 보낸다(유저 한 명의 진행은 `players` 요약 몫).
 * 한 번만 켠다 · 광고 차단기 · 쿠키 막힘이면 조용히 안 켜진다 · 던지지 않는다
 */
export function startAnalytics() {
    analytics ??= Promise.all([appOnce(), import(`${SDK}/firebase-analytics.js`)])
        .then(async ([fb, G]) => { if (await G.isSupported()) G.getAnalytics(fb); })
        .catch(e => { fail('analytics', e); });
    return analytics;
}

/* ─── 아이디 계정 (ADR-1263) ───
   Firebase 의 이메일/비밀번호 로그인을 쓰되 **아이디 뒤에 이 프로젝트의 인증 도메인을 붙인 주소**로 넣는다 — 진짜 메일이 아니다
   (인증 메일 · 비밀번호 찾기를 안 보낸다). 아이디 · 비밀번호 규칙(글자 · 길이)은 부르는 쪽(`app.js`)이 먼저 거른다 */
const accountMail = id => `${id}@${FIREBASE_CONFIG.authDomain}`;
const idOfMail = mail => String(mail ?? '').split('@')[0] || null;
/** 아이디 계정인가 — 익명 · Google(퍼널 페이지의 관리자 로그인 · 옛 ADR-0112 세션)과 가른다 */
const isAccount = u => !!u && !u.isAnonymous && u.providerData.some(p => p.providerId === 'password');
/** SDK 오류 코드 → 결과 코드. 모르는 코드는 'network' */
const AUTH_ERR = {
    'auth/email-already-in-use': 'taken', 'auth/credential-already-in-use': 'taken', 'auth/provider-already-linked': 'linked',
    'auth/weak-password': 'weak', 'auth/password-does-not-meet-requirements': 'weak', 'auth/invalid-email': 'badId',
    'auth/invalid-credential': 'wrong', 'auth/invalid-login-credentials': 'wrong', 'auth/wrong-password': 'wrong', 'auth/user-not-found': 'wrong',
    'auth/too-many-requests': 'busy', 'auth/operation-not-allowed': 'off', 'auth/admin-restricted-operation': 'off',
};
const authFail = e => fail(AUTH_ERR[e?.code] ?? 'network', e);

/** 계정 — 이 브라우저에 있으면 되찾고 없으면 익명으로 만든다. `firstSeen` = 계정이 생긴 시각(첫 방문) · `account` = 아이디(익명이면 null).
 *  Google 세션(옛 ADR-0112 · 같은 주소에서 연 퍼널 페이지의 관리자 로그인)이 남아 있으면 내려놓고 익명으로 — 기록은 늘 브라우저 하나 = 유저 하나다.
 *  아이디 계정 세션은 그대로 쓴다 (ADR-1263) */
async function ensureUser({ A, auth }) {
    await auth.authStateReady();
    let u = auth.currentUser;
    if (u && !u.isAnonymous && !isAccount(u)) { await A.signOut(auth); u = null; }
    u ??= (await A.signInAnonymously(auth)).user;
    return { uid: u.uid, firstSeen: Date.parse(u.metadata.creationTime) || null, account: isAccount(u) ? idOfMail(u.email) : null };
}

/** SDK + 계정 — 실패는 결과 코드로 */
async function open() {
    let s;
    try { s = await sdk(); } catch (e) { return { fail: fail('network', e) }; }
    try { return { s, user: await ensureUser(s) }; } catch (e) { return { fail: fail('signIn', e) }; }
}

/** Firestore 시각 → ms (서버 시각이 아직 안 찍힌 사본이면 null) */
const ms = v => (typeof v?.toMillis === 'function' ? v.toMillis() : null);

/**
 * 태그 — 계정 id 에서 뽑는 0 ~ 9999 (ADR-1042). 같은 이름을 가르는 네 자리라 서버 없이 · 쓰기를 늘리지 않고 정한다 —
 * 이름을 바꿔도 그대로다. 32비트 FNV-1a 를 만으로 나눈 나머지(같은 이름 + 같은 태그는 만 분의 1 — 데모에 충분하다).
 * 화면은 문서 id(= 계정 id)에서 다시 뽑아 찍는다 — 올린 `tag` 칸은 친구와 전투 목록의 태그 찾기에만 쓴다
 */
export function tagOf(uid) {
    let h = 0x811c9dc5;
    for (const ch of String(uid ?? '')) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0;
    return h % 10000;
}

/** 내 계정 id — 받기가 규칙에 막혀도 태그는 보이게(설정 · 등록 판). 실패면 null */
export async function myId() {
    const { user, fail: f } = await open();
    return f ? null : user.uid;
}

/** 계정 — `{ ok, uid, id }`(id = 아이디 · 익명이면 null) */
export async function accountOf() {
    const { user, fail: f } = await open();
    return f ?? { ok: true, uid: user.uid, id: user.account };
}

/** 세이브 사본 문서 — `{savedAt, version, data, nick, device}`. 세이브가 없거나 상한을 넘으면 null(사본을 안 쓴다) */
function copyOf(save, nick, device) {
    const data = save ? JSON.stringify(save) : null;
    if (!data || new TextEncoder().encode(data).length > MAX_BYTES) return null;
    return { savedAt: save.savedAt, version: save.version, data, nick: nick ?? '', device: device ?? null };
}

/**
 * 올리기 — 진행 요약(`players/<uid>`)과 세이브 사본(`saves/<uid>`)을 **통째로** 한 묶음으로 쓴다.
 * 세이브가 없거나 상한을 넘으면 요약만 올린다. `lastSeen` 은 서버 시각이다(기기마다 시계가 달라서).
 * 사본에는 닉네임(`nick` — 계정을 따라간다)과 이 브라우저 표식(`device`)이 같이 실린다.
 * **아이디 계정이면** — 이 탭이 게임을 안 열었으면(`held` 거짓 · 메뉴) 요약만 쓴다 · 열었으면 사본의 주인 표식을 먼저 보고(트랜잭션)
 *   다른 브라우저의 것이면 안 쓰고 'taken'(늦게 연 쪽이 이긴다 · ADR-1263). 결과에 `account`(아이디 · 익명이면 null)가 붙는다
 */
export async function pushTrack(summary, save, { nick = '', device = null, held = false } = {}) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    const { F, db } = s;
    const pRef = F.doc(db, 'players', user.uid), sRef = F.doc(db, 'saves', user.uid);
    const player = { ...summary, firstSeen: user.firstSeen, lastSeen: F.serverTimestamp() };
    const copy = copyOf(save, nick, device);
    const account = user.account;
    try {
        if (!account) {
            const batch = F.writeBatch(db);
            batch.set(pRef, player);
            if (copy) batch.set(sRef, copy);
            await batch.commit();
            return { ok: true, account };
        }
        if (!held) { await F.setDoc(pRef, player); return { ok: true, account }; }
        const r = await F.runTransaction(db, async tx => {
            const cur = await tx.get(sRef);
            const owner = cur.exists() ? cur.data().device ?? null : null;
            if (owner && owner !== device) return { ok: false, err: 'taken' };
            tx.set(pRef, player);
            if (copy) tx.set(sRef, copy);
            return { ok: true };
        });
        return { ...r, account };
    } catch (e) { return fail('network', e); }
}

/** 받은 사본 문서 → `{ ok, save, nick, device }` — 사본이 없으면 save null · 세이브 글이 깨졌으면 save null(열 수 있나는 부르는 쪽이 본다) */
async function readSave({ F, db }, uid) {
    try {
        const d = await F.getDoc(F.doc(db, 'saves', uid));
        if (!d.exists()) return { ok: true, save: null, nick: '', device: null };
        const v = d.data();
        let save = null;
        try { save = typeof v.data === 'string' ? JSON.parse(v.data) : null; } catch { save = null; }
        return { ok: true, save, nick: typeof v.nick === 'string' ? v.nick : '', device: typeof v.device === 'string' ? v.device : null };
    } catch (e) { return fail('read', e); }
}

/**
 * 계정 만들기 — 지금 쓰는 **익명 계정에 아이디 · 비밀번호를 붙인다**(계정 id 그대로 — 사본 · 퍼널 · 콜로세움 태그가 이어진다).
 * 이미 아이디 계정이면 'linked'. `{ ok, id }`
 */
export async function createAccount(id, pw) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    if (user.account) return fail('linked');
    const { A, auth } = s;
    try {
        await A.linkWithCredential(auth.currentUser, A.EmailAuthProvider.credential(accountMail(id), pw));
        return { ok: true, id };
    } catch (e) { return authFail(e); }
}

/**
 * 계정으로 로그인 — 이 브라우저의 익명 세션을 그 계정으로 갈아 끼우고 사본을 받는다. `{ ok, id, save, nick, device }`.
 * 로그인은 됐는데 받기가 거부되면 'read'(보안 규칙 게시 전)
 */
export async function signInAccount(id, pw) {
    let s;
    try { s = await sdk(); } catch (e) { return fail('network', e); }
    const { A, auth } = s;
    try { await auth.authStateReady(); } catch (e) { return fail('network', e); }
    let u;
    try { u = (await A.signInWithEmailAndPassword(auth, accountMail(id), pw)).user; } catch (e) { return authFail(e); }
    const r = await readSave(s, u.uid);
    return r.ok ? { ...r, id: idOfMail(u.email) } : r;
}

/** 계정의 사본 받기 — 계정이 묶인 브라우저가 [불러오기]를 누를 때. 익명이면 'anon'. `{ ok, save, nick, device }` */
export async function pullSave() {
    const { s, user, fail: f } = await open();
    if (f) return f;
    if (!user.account) return fail('anon');
    return readSave(s, user.uid);
}

/**
 * 주인 표식 쓰기 — 이 탭이 계정의 게임을 **연 순간**(늦게 연 쪽이 이긴다 · ADR-1263). 묻지 않고 쓴다.
 * 세이브가 있으면 사본째 · 없으면 표식과 닉네임만(앞 사본은 남긴다). 익명이면 'anon'
 */
export async function claimSave(save, { nick = '', device = null } = {}) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    if (!user.account) return fail('anon');
    const { F, db } = s;
    const ref = F.doc(db, 'saves', user.uid);
    const copy = copyOf(save, nick, device);
    try {
        if (copy) await F.setDoc(ref, copy);
        else await F.setDoc(ref, { nick, device }, { merge: true });
        return { ok: true };
    } catch (e) { return fail('network', e); }
}

/** 로그아웃 — 다음 부름이 새 익명 계정을 만든다 */
export async function signOutAccount() {
    let s;
    try { s = await sdk(); } catch (e) { return fail('network', e); }
    try { await s.A.signOut(s.auth); return { ok: true }; } catch (e) { return fail('network', e); }
}

/**
 * 콜로세움 방어 편성 (arena_design §9) — `{nick, rating, team}`(team = 팀 코드 JSON 문자열) 이면 `arenaTeams/<uid>` 에 쓰고 · `'drop'` 이면 지운다.
 * 태그(`tag`)는 여기서 붙인다 — 계정 id 를 아는 곳이 여기뿐이다 (ADR-1042).
 * **플레이 기록과 묶지 않는다** — 보안 규칙이 이 문서를 거부해도 진행 요약 · 세이브 사본은 올라가야 한다(한 묶음은 통째로 거부된다)
 */
export async function pushArenaTeam(arena) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    const { F, db } = s;
    try {
        if (arena === 'drop') await F.deleteDoc(F.doc(db, 'arenaTeams', user.uid));
        else await F.setDoc(F.doc(db, 'arenaTeams', user.uid), { nick: arena.nick, rating: arena.rating, tag: tagOf(user.uid), team: arena.team, at: F.serverTimestamp() });
        return { ok: true };
    } catch (e) { return fail('network', e); }
}

/**
 * 받기 — 최근 방어 편성 묶음과 내 방어 기록 (arena_design §9).
 * `teams` = `[{id, nick, rating, team, at}]`(team = 받은 문자열 그대로 — 검사는 부르는 쪽) · `log` = `[{by, nick, rating, result, friendly, at}]` · `me` = 내 uid
 */
export async function pullArena() {
    const { s, user, fail: f } = await open();
    if (f) return f;
    const { F, db } = s;
    try {
        const [teams, log] = await Promise.all([
            F.getDocs(F.query(F.collection(db, 'arenaTeams'), F.orderBy('at', 'desc'), F.limit(PULL_TEAMS))),
            F.getDocs(F.query(F.collection(db, 'arenaLog', user.uid, 'hits'), F.orderBy('at', 'desc'), F.limit(PULL_LOG))),
        ]);
        return {
            ok: true, me: user.uid,
            teams: teams.docs.map(d => { const v = d.data(); return { id: d.id, nick: v.nick, rating: v.rating, team: v.team, at: ms(v.at) }; }),
            log: log.docs.map(d => { const v = d.data(); return { by: v.by, nick: v.nick, rating: v.rating, result: v.result, friendly: v.friendly === true, at: ms(v.at) }; }),
        };
    } catch (e) { return fail('network', e); }
}

/**
 * 친구와 전투 목록 한 쪽 (ADR-1042 · SCREEN_DESIGN §1 「친구와 전투 창」) — `arenaTeams` 를 `PULL_TEAMS` 개씩.
 * 찾기: 아무것도 없으면 최근 순(`at` 내림차순) · `name` 만이면 그 글자로 시작하는 이름(`nick` 범위 — 대소문자를 가린다 ·
 * 「들어간」 찾기는 저장소가 못 한다) · `tag` 가 있으면 그 태그(`tag` 같음 — 이름도 주면 받은 뒤 `nick` 같음으로 거른다 · 두 칸 조건을 저장소에 안 걸어 색인을 새로 안 만든다).
 * `cursor` = 앞 쪽이 돌려준 것 — 그 뒤부터. 돌려주는 `cursor` 는 한 쪽이 꽉 찼을 때만(다음 쪽이 있을 수 있다)
 * `teams` = `[{id, nick, rating, team, at}]` (검사는 부르는 쪽) · `me` = 내 uid
 */
export async function listArena({ name = '', tag = null, cursor = null } = {}) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    const { F, db } = s;
    try {
        // 앞 글자 범위의 끝 — 유니코드 사용자 영역의 큰 글자(이 글자로 시작하는 모든 이름이 그 아래다)
        const top = String.fromCharCode(0xf8ff);
        const parts = tag !== null ? [F.where('tag', '==', tag)]
            : name ? [F.where('nick', '>=', name), F.where('nick', '<=', name + top), F.orderBy('nick')]
            : [F.orderBy('at', 'desc')];
        if (cursor) parts.push(F.startAfter(cursor));
        const snap = await F.getDocs(F.query(F.collection(db, 'arenaTeams'), ...parts, F.limit(PULL_TEAMS)));
        return {
            ok: true, me: user.uid,
            teams: snap.docs.map(d => { const v = d.data(); return { id: d.id, nick: v.nick, rating: v.rating, team: v.team, at: ms(v.at) }; })
                .filter(x => tag === null || !name || x.nick === name),
            cursor: snap.docs.length === PULL_TEAMS ? snap.docs.at(-1) : null,
        };
    } catch (e) { return fail('network', e); }
}

/** 방어 기록 한 줄 — 방어자 `def` 의 기록함에 `{nick, rating, result}`(result = 방어자 쪽) + 내 uid · 서버 시각.
 *  `friendly` = 친구와 전투 목록에서 고른 친선전 — 그때만 `friendly: true` 칸이 붙는다(레이팅 결투 문서는 옛 모양 그대로 · ADR-1042) */
export async function pushArenaHit(def, { nick, rating, result, friendly = false }) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    const { F, db } = s;
    try {
        await F.addDoc(F.collection(db, 'arenaLog', def, 'hits'), { by: user.uid, nick, rating, result, ...(friendly ? { friendly: true } : {}), at: F.serverTimestamp() });
        return { ok: true };
    } catch (e) { return fail('network', e); }
}
