/**
 * 그림 미리 받기 [2026-11-13 · SCREEN_DESIGN §3 「메뉴」 · ADR-1080] — 켜면 기본 화면이 쓰는 그림을 전부 받아 둔다.
 *   처음 여는 도감 · 가방에서 그림이 한 장씩 늦게 뜨던 것은 「받아 본 적 없는 그림」을 그 자리에서 받아서였다 —
 *   켤 때 받아 두면 처음 열어도 두 번째 속도로 뜬다.
 * 목록은 배포판을 지을 때 `scripts/build_deploy.py` 가 쓰는 `assets/art/preload.json`(`src/` 기준 경로의 배열)이다 —
 *   Pages 엔 폴더 목록이 없고, 손으로 둔 목록은 그림이 바뀔 때마다 어긋난다. 개발 서버엔 그 파일이 없어 **찾지도 않는다**
 *   (`?preload` 가 있으면 찾는다 — 지은 사본을 로컬로 띄워 볼 때 · §10).
 * 화면(메뉴)은 `preloadState().open` 이 거짓인 동안 막대를 세우고 버튼을 잠근다. 계산 · 난수 · 세이브와 무관하다.
 */
import { DEV_HOST } from './env.js';

const MANIFEST = './assets/art/preload.json';
/** 동시에 받는 수 — 한꺼번에 몰면 GitHub Pages 가 429 로 막는다(2026-11-13 · 10초 남짓에 약 3,800번 요청에서 막혔다) */
export const PRELOAD_LANES = 16;
/** 이 시간이 지나면 다 못 받아도 메뉴를 푼다 — 남은 것은 뒤에서 계속 받는다 */
export const PRELOAD_GIVE_UP_MS = 15000;

// 받은 그림을 페이지가 닫힐 때까지 쥔다 — 놓으면 브라우저가 버릴 수 있고, `max-age` 가 지나면 화면이 쓸 때 서버에 다시 묻는다
const keep = [];
// open = 메뉴 버튼을 풀어도 되나(목록이 없거나 · 다 받았거나 · 제한 시간이 지났다) · total / done = 막대 값
const st = { total: 0, done: 0, open: false };
export const preloadState = () => st;

const one = src => new Promise(res => {
    const im = new Image();
    im.onload = () => { keep.push(im); res(); };
    im.onerror = () => res();   // 못 받은 파일은 받은 것으로 센다 — 막대가 멈추지 않게
    im.src = src;
});

/**
 * 받기 시작 — **목록을 읽은 뒤** 풀린다(그 전에 메뉴를 그리면 잠기지 않은 버튼이 한 번 비친다).
 * `onTick` 은 한 장 받을 때마다 · 다 받았을 때 · 제한 시간에 부른다(화면이 다시 그릴지 정한다).
 */
export async function startPreload(onTick) {
    let list = null;
    if (!DEV_HOST || new URLSearchParams(location.search).has('preload')) {
        try {
            const r = await fetch(MANIFEST, { cache: 'no-cache' });
            if (r.ok) list = await r.json();
        } catch { /* 목록이 없으면 안 받는다 — 화면은 예전처럼 그 자리에서 받는다 */ }
    }
    if (!Array.isArray(list) || !list.length) { st.open = true; return; }
    st.total = list.length;
    const giveUp = setTimeout(() => { if (!st.open) { st.open = true; onTick?.(); } }, PRELOAD_GIVE_UP_MS);
    let next = 0;
    const lane = async () => {
        while (next < list.length) {
            await one(`./${list[next++]}`);
            st.done++;
            onTick?.();
        }
    };
    Promise.all(Array.from({ length: PRELOAD_LANES }, lane)).then(() => {
        clearTimeout(giveUp);
        if (!st.open) { st.open = true; onTick?.(); }
    });
}
