/**
 * 플레이 기록 어댑터 — **Firebase 를 만지는 유일한 파일** (SCREEN_DESIGN §2-1 · ADR-0633 · ARCHITECTURE §8).
 *
 * 하는 일 — 방문 집계(Analytics 켜기 · ADR-1049) · 익명 계정 확보 · 진행 요약과 세이브 사본을 **한 묶음으로 올리기** · 콜로세움 데모(arena_design §9 · ADR-1040 · ADR-1042 · 2026-11-11)의
 *   방어 편성 올리기 · 지우기(따로 쓴다) · 남의 방어 편성과 내 방어 기록 **받기** · 친구와 전투 목록 한 쪽 받기(찾기) · 방어자의 기록함에 한 줄 쓰기 ·
 *   이름 뒤 **태그**(`tagOf` — 계정 id 에서 뽑는 네 자리).
 * **세이브 · 요약을 받는 길은 없다** — 세이브의 주인은 이 브라우저다. 받는 것은 콜로세움 둘뿐이다.
 * **세이브 형식은 모른다** — 받은 요약은 `players/<uid>` 에 그대로, 세이브는 JSON 문자열 하나로 `saves/<uid>` 에 넣을 뿐이다
 *   (Firestore 는 배열 안 배열을 못 담는다 — `formation.ranks`). 방어 편성도 팀 코드 JSON 문자열 하나다(`arenaTeams/<uid>`).
 * SDK 는 **처음 부를 때** CDN 에서 불러온다 — 게임은 기다리지 않는다.
 * 결과는 `{ ok: true, … }` / `{ ok: false, err }` — err: 'network' · 'signIn'. 던지지 않는다.
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

/** 익명 계정 — 이 브라우저에 있으면 되찾고 없으면 만든다. `firstSeen` = 계정이 생긴 시각(첫 방문).
 *  옛 Google 로그인 세션(ADR-0112)이 남아 있으면 내려놓고 익명으로 — 기록은 늘 브라우저 하나 = 유저 하나다 */
async function ensureUser({ A, auth }) {
    await auth.authStateReady();
    let u = auth.currentUser;
    if (u && !u.isAnonymous) { await A.signOut(auth); u = null; }
    u ??= (await A.signInAnonymously(auth)).user;
    return { uid: u.uid, firstSeen: Date.parse(u.metadata.creationTime) || null };
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

/**
 * 올리기 — 진행 요약(`players/<uid>`)과 세이브 사본(`saves/<uid>`)을 **통째로** 한 묶음으로 쓴다.
 * 세이브가 없거나 상한을 넘으면 요약만 올린다. `lastSeen` 은 서버 시각이다(기기마다 시계가 달라서)
 */
export async function pushTrack(summary, save) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    const { F, db } = s;
    try {
        const batch = F.writeBatch(db);
        batch.set(F.doc(db, 'players', user.uid), { ...summary, firstSeen: user.firstSeen, lastSeen: F.serverTimestamp() });
        const data = save ? JSON.stringify(save) : null;
        if (data && new TextEncoder().encode(data).length <= MAX_BYTES) {
            batch.set(F.doc(db, 'saves', user.uid), { savedAt: save.savedAt, version: save.version, data });
        }
        await batch.commit();
        return { ok: true };
    } catch (e) { return fail('network', e); }
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
