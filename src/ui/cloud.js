/**
 * 플레이 기록 어댑터 — **Firebase 를 만지는 유일한 파일** (SCREEN_DESIGN §2-1 · ADR-0633 · ARCHITECTURE §8).
 *
 * 하는 일 — 익명 계정 확보 · 진행 요약과 세이브 사본을 **한 묶음으로 올리기** · 콜로세움 데모(arena_design §9 · ADR-1040 · 2026-11-11)의
 *   방어 편성 올리기 · 지우기(따로 쓴다) · 남의 방어 편성과 내 방어 기록 **받기** · 방어자의 기록함에 한 줄 쓰기.
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

let ready = null;
/** SDK 를 한 번만 불러온다 — 실패하면 다음 호출이 다시 시도한다 */
function sdk() {
    ready ??= Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore-lite.js`),
    ]).then(([app, A, F]) => {
        const fb = app.initializeApp(FIREBASE_CONFIG);
        return { A, F, auth: A.getAuth(fb), db: F.getFirestore(fb) };
    }).catch(e => { ready = null; throw e; });
    return ready;
}

const fail = (err, e) => { if (e) console.warn(`cloud: ${err}`, e); return { ok: false, err }; };

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
 * **플레이 기록과 묶지 않는다** — 보안 규칙이 이 문서를 거부해도 진행 요약 · 세이브 사본은 올라가야 한다(한 묶음은 통째로 거부된다)
 */
export async function pushArenaTeam(arena) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    const { F, db } = s;
    try {
        if (arena === 'drop') await F.deleteDoc(F.doc(db, 'arenaTeams', user.uid));
        else await F.setDoc(F.doc(db, 'arenaTeams', user.uid), { nick: arena.nick, rating: arena.rating, team: arena.team, at: F.serverTimestamp() });
        return { ok: true };
    } catch (e) { return fail('network', e); }
}

/**
 * 받기 — 최근 방어 편성 묶음과 내 방어 기록 (arena_design §9).
 * `teams` = `[{id, nick, rating, team, at}]`(team = 받은 문자열 그대로 — 검사는 부르는 쪽) · `log` = `[{by, nick, rating, result, at}]` · `me` = 내 uid
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
            log: log.docs.map(d => { const v = d.data(); return { by: v.by, nick: v.nick, rating: v.rating, result: v.result, at: ms(v.at) }; }),
        };
    } catch (e) { return fail('network', e); }
}

/** 방어 기록 한 줄 — 방어자 `def` 의 기록함에 `{nick, rating, result}`(result = 방어자 쪽) + 내 uid · 서버 시각 */
export async function pushArenaHit(def, { nick, rating, result }) {
    const { s, user, fail: f } = await open();
    if (f) return f;
    const { F, db } = s;
    try {
        await F.addDoc(F.collection(db, 'arenaLog', def, 'hits'), { by: user.uid, nick, rating, result, at: F.serverTimestamp() });
        return { ok: true };
    } catch (e) { return fail('network', e); }
}
