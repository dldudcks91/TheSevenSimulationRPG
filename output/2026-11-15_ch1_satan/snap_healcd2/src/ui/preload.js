/**
 * 그림 미리 받기 [2026-11-13 · 나눠 받기 2026-11-14 · SCREEN_DESIGN §3 「메뉴」 · ADR-1080 · ADR-1097] — 켜면 기본 화면이 쓰는 그림을 두 번에 나눠 받아 둔다.
 *   처음 여는 도감 · 가방에서 그림이 한 장씩 늦게 뜨던 것은 「받아 본 적 없는 그림」을 그 자리에서 받아서였다 —
 *   켤 때 받아 두면 처음 열어도 두 번째 속도로 뜬다.
 *   **1차**(첫 화면 그림 — 영웅 초상 · 스킬 · 탭 아이콘)만 메뉴가 기다리고, 1차가 끝나면 **2차**(나머지)를 뒤에서 이어 받는다 —
 *   전부 기다리면 켤 때 너무 오래 걸렸다(ADR-1097).
 * 목록은 배포판을 지을 때 `scripts/build_deploy.py` 가 쓰는 `assets/art/preload.json`(`{first, rest}` — `src/` 기준 경로의 배열 둘)이다 —
 *   Pages 엔 폴더 목록이 없고, 손으로 둔 목록은 그림이 바뀔 때마다 어긋난다. 1차 · 2차를 가르는 것도 그 스크립트(`PRELOAD_FIRST`)다.
 *   개발 서버엔 그 파일이 없어 **찾지도 않는다**(`?preload` 가 있으면 찾는다 — 지은 사본을 로컬로 띄워 볼 때 · §10).
 * 화면(메뉴)은 `preloadState().open` 이 거짓인 동안 막대를 세우고 버튼을 잠근다. 계산 · 난수 · 세이브와 무관하다.
 */
import { DEV_HOST } from './env.js';

const MANIFEST = './assets/art/preload.json';
/** 동시에 받는 수 — 한꺼번에 몰면 GitHub Pages 가 429 로 막는다(2026-11-13 · 10초 남짓에 약 3,800번 요청에서 막혔다) */
export const PRELOAD_LANES = 16;
/** 이 시간이 지나면 1차를 다 못 받아도 메뉴를 푼다 — 남은 1차와 2차는 뒤에서 계속 받는다 */
export const PRELOAD_GIVE_UP_MS = 15000;

// 받은 그림을 페이지가 닫힐 때까지 쥔다 — 놓으면 브라우저가 버릴 수 있고, `max-age` 가 지나면 화면이 쓸 때 서버에 다시 묻는다
const keep = [];
// open = 메뉴 버튼을 풀어도 되나(목록이 없거나 · 1차를 다 받았거나 · 제한 시간이 지났다) · total / done = 막대 값(1차 몫)
const st = { total: 0, done: 0, open: false };
export const preloadState = () => st;

const one = src => new Promise(res => {
    const im = new Image();
    im.onload = () => { keep.push(im); res(); };
    im.onerror = () => res();   // 못 받은 파일은 받은 것으로 센다 — 막대가 멈추지 않게
    im.src = src;
});

/** 목록을 `PRELOAD_LANES` 줄로 받는다 — 한 장 받을 때마다 `each` */
const fetchAll = (list, each) => {
    let next = 0;
    const lane = async () => {
        while (next < list.length) {
            await one(`./${list[next++]}`);
            each?.();
        }
    };
    return Promise.all(Array.from({ length: PRELOAD_LANES }, lane));
};

/**
 * 받기 시작 — **목록을 읽은 뒤** 풀린다(그 전에 메뉴를 그리면 잠기지 않은 버튼이 한 번 비친다).
 * `onTick` 은 1차를 한 장 받을 때마다 · 1차를 다 받았을 때 · 제한 시간에 부른다(화면이 다시 그릴지 정한다). 2차는 안 부른다.
 */
export async function startPreload(onTick) {
    let list = null;
    if (!DEV_HOST || new URLSearchParams(location.search).has('preload')) {
        try {
            const r = await fetch(MANIFEST, { cache: 'no-cache' });
            if (r.ok) list = await r.json();
        } catch { /* 목록이 없으면 안 받는다 — 화면은 예전처럼 그 자리에서 받는다 */ }
    }
    const first = Array.isArray(list?.first) ? list.first : [];
    const rest = Array.isArray(list?.rest) ? list.rest : [];
    if (!first.length) { st.open = true; fetchAll(rest); return; }
    st.total = first.length;
    const giveUp = setTimeout(() => { if (!st.open) { st.open = true; onTick?.(); } }, PRELOAD_GIVE_UP_MS);
    fetchAll(first, () => { st.done++; onTick?.(); }).then(() => {
        clearTimeout(giveUp);
        if (!st.open) { st.open = true; onTick?.(); }
        fetchAll(rest);
    });
}
