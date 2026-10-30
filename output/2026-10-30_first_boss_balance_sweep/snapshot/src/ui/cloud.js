/**
 * 플레이 기록 어댑터 — **Firebase 를 만지는 유일한 파일** (SCREEN_DESIGN §2-1 · ADR-0633 · ARCHITECTURE §8).
 *
 * 하는 일은 둘 — 익명 계정 확보 · 진행 요약과 세이브 사본을 **한 묶음으로 올리기.** **받는 길은 없다** — 세이브의 주인은 이 브라우저다.
 * **세이브 형식은 모른다** — 받은 요약은 `players/<uid>` 에 그대로, 세이브는 JSON 문자열 하나로 `saves/<uid>` 에 넣을 뿐이다
 *   (Firestore 는 배열 안 배열을 못 담는다 — `formation.ranks`).
 * SDK 는 **처음 올릴 때** CDN 에서 불러온다 — 게임은 기다리지 않는다.
 * 결과는 `{ ok: true }` / `{ ok: false, err }` — err: 'network' · 'signIn'. 던지지 않는다.
 */

import { FIREBASE_CONFIG } from './firebase_config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';
// Firestore 문서 하나의 상한은 1MiB — 봉투 필드 몫을 남기고 자른다. 넘으면 세이브 사본만 건너뛴다.
//   게임 수치가 아니라 저장소 사정이라 CSV 가 아니다 (ADR-0112 선례)
const MAX_BYTES = 1000 * 1000;

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

/**
 * 올리기 — 진행 요약(`players/<uid>`)과 세이브 사본(`saves/<uid>`)을 **통째로** 한 묶음으로 쓴다.
 * 세이브가 없거나 상한을 넘으면 요약만 올린다. `lastSeen` 은 서버 시각이다(기기마다 시계가 달라서)
 */
export async function pushTrack(summary, save) {
    let s, user;
    try { s = await sdk(); } catch (e) { return fail('network', e); }
    try { user = await ensureUser(s); } catch (e) { return fail('signIn', e); }
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
