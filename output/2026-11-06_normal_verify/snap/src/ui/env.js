/**
 * 실행 환경 — **개발 환경인가** 하나 (SCREEN_DESIGN §10 머리 · ADR-0751).
 *
 * 개발 환경 = 이 PC 의 로컬 서버(`start.bat` · `serve.py`)로 연 주소. 그 밖의 주소는 전부 **배포판**으로 친다 —
 *   모르는 주소가 배포판이어야 배포처를 옮겨도 개발 장치가 다시 열리지 않는다.
 * 배포판에서는 개발 장치(Admin · ⚙ 판의 Palette · Save 탭 · 실험실 탭)가 안 서고 개발용 URL(§10 표)이 안 먹는다.
 *   플레이 기록(`app.js:TRACK_ON` · §2-1)의 「개발 환경은 안 올린다」도 이 값을 읽는다 — 둘이 갈리면
 *   장치는 서는데 기록은 올라가는 주소가 생긴다.
 */

/** 개발 환경의 호스트 이름인가 — 단정이 주소를 바꿔 가며 부른다 */
export const isDevHostname = h => ['localhost', '127.0.0.1', '[::1]'].includes(h);

/** 지금 페이지가 개발 환경인가 */
export const DEV_HOST = isDevHostname(location.hostname);
