/**
 * 클라우드 세이브 어댑터 — **Firebase 를 만지는 유일한 파일** (SCREEN_DESIGN §2-1 · ADR-0112 · ARCHITECTURE §8).
 *
 * 하는 일은 셋 — Google 로그인 · 세이브 사본 올리기 · 받기. **세이브 형식은 모른다** — 받은 객체를 JSON 문자열 하나로
 *   `saves/<uid>` 문서에 넣고 뺄 뿐이다(Firestore 는 배열 안 배열을 못 담는다 — `formation.ranks`).
 * SDK 는 **처음 부를 때** CDN 에서 불러온다 — 로그인하지 않은 브라우저에는 네트워크 의존이 생기지 않는다.
 * 결과는 `{ ok: true, … }` / `{ ok: false, err }` — err: 'network' · 'signIn' · 'conflict' · 'tooLarge'. 던지지 않는다.
 *
 * 문서 봉투: `{ rev, savedAt, version, data }` — `rev` 는 올릴 때마다 1 씩 오르는 저장 번호다.
 *   순서를 시각이 아니라 이 번호로 가르는 이유는 기기마다 시계가 달라서다 (INTERFACE §4 「클라우드 사본」).
 */

import { FIREBASE_CONFIG } from './firebase_config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';
const COLLECTION = 'saves';
// Firestore 문서 하나의 상한은 1MiB — 봉투 필드 몫을 남기고 자른다. 게임 수치가 아니라 저장소 사정이라 CSV 가 아니다 (ADR-0112)
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
const userOf = u => (u ? { uid: u.uid, email: u.email ?? '' } : null);
const unwrap = d => ({ rev: d.rev, savedAt: d.savedAt, version: d.version, save: JSON.parse(d.data) });

/** 미리 불러 둔다 — 로그인 창은 클릭 직후에 떠야 브라우저가 막지 않는다(버튼에 마우스가 올라오면 부른다) */
export function warm() { sdk().catch(() => {}); }

/** 전에 로그인해 둔 계정 — 없으면 `user: null` */
export async function restoreUser() {
    try {
        const { auth } = await sdk();
        await auth.authStateReady();
        return { ok: true, user: userOf(auth.currentUser) };
    } catch (e) { return fail('network', e); }
}

export async function signIn() {
    let s;
    try { s = await sdk(); } catch (e) { return fail('network', e); }
    try {
        const cred = await s.A.signInWithPopup(s.auth, new s.A.GoogleAuthProvider());
        return { ok: true, user: userOf(cred.user) };
    } catch (e) { return fail('signIn', e); }
}

export async function signOut() {
    try {
        const { A, auth } = await sdk();
        await A.signOut(auth);
        return { ok: true };
    } catch (e) { return fail('network', e); }
}

/** 받기 — 사본이 없으면 `remote: null` */
export async function pullSave(uid) {
    try {
        const { F, db } = await sdk();
        const snap = await F.getDoc(F.doc(db, COLLECTION, uid));
        return { ok: true, remote: snap.exists() ? unwrap(snap.data()) : null };
    } catch (e) { return fail('network', e); }
}

/**
 * 올리기 — `baseRev` 는 이 브라우저가 마지막으로 맞춘 번호. 클라우드 번호가 그것과 다르면 **덮어쓰지 않고** `conflict` 와 그 사본을 돌려준다.
 * `baseRev` 가 `null` 이면 번호를 안 본다 — 선택 창에서 「이 브라우저」를 고른 경우다.
 */
export async function pushSave(uid, save, baseRev) {
    const data = JSON.stringify(save);
    if (new TextEncoder().encode(data).length > MAX_BYTES) return fail('tooLarge');
    try {
        const { F, db } = await sdk();
        const ref = F.doc(db, COLLECTION, uid);
        return await F.runTransaction(db, async tx => {
            const snap = await tx.get(ref);
            const cur = snap.exists() ? snap.data() : null;
            if (baseRev != null && cur && cur.rev !== baseRev) return { ok: false, err: 'conflict', remote: unwrap(cur) };
            const rev = (cur?.rev ?? 0) + 1;
            tx.set(ref, { rev, savedAt: save.savedAt, version: save.version, data });
            return { ok: true, rev };
        });
    } catch (e) { return fail('network', e); }
}
