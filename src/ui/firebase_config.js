/**
 * Firebase 웹 앱 설정 — `ui/cloud.js` 만 읽는다 (ADR-0112).
 * **공개돼도 되는 값이다** — 이 키는 프로젝트를 가리킬 뿐 권한이 아니다. 누가 무엇을 읽고 쓰나는 Firestore 보안 규칙이 정한다
 *   (`saves/{uid}` — 로그인한 본인 문서만). 애널리틱스는 안 쓴다 — `measurementId` 는 콘솔이 준 그대로 둔 것이다.
 */
export const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDIE0_kSbg4fBuODy8l-8gag8zWL7UeEAU',
    authDomain: 'thesevensimulationrpg-922aa.firebaseapp.com',
    projectId: 'thesevensimulationrpg-922aa',
    storageBucket: 'thesevensimulationrpg-922aa.firebasestorage.app',
    messagingSenderId: '451879607648',
    appId: '1:451879607648:web:43e6c85c5a1b603e229205',
    measurementId: 'G-HX4MLZ23ZN',
};
