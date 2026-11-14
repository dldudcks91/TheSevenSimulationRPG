# 모바일 제스처 개편 — 2026-11-14

[실제 드래그 프레임과 화면 비교](index.html) · [계획 및 참고 자료](../../docs/client/MOBILE_GESTURE_PLAN.md) · [ADR-1129](../../docs/client/adr/1129-mobile-swipe-related-information.md)

- 캐릭터는 능력치로 시작한다. 오른쪽 드래그로 상세 I, 다시 오른쪽으로 상세 II. 왼쪽으로 돌아온다.
- 관련 기능 패널과 고용·의뢰·전술·전직 카드에서 좌우 탐색한다. 양옆 정보와 현재 위치를 선택 줄 안에 표시한다.
- 실행 버튼 위의 드래그는 실행하지 않는다. 짧은 이동·세로 스크롤·다중 터치·취소·빠른 연속 스와이프·창 크기 변경을 검사한다.
- 다섯 지역 무스크롤과 PC 390×844 고정 미리보기를 유지한다.

## 검증

총 2802/2802 통과. 자세한 결과와 최종 소스 해시는 [summary.json](summary.json)에 있다.

| 범위 | 결과 |
|---|---|
| [gestures-final](gestures-final/results.json) | 138/138 |
| [native-final](native-final/results.json) | 1509/1509 |
| [fixed](fixed/fixed-results.json) | 847/847 |
| [panels](panels/panels-results.json) | 94/94 |
| [touch](touch/touch-results.json) | 29/29 |
| [dialogs](dialogs/dialogs-results.json) | 25/25 |
| [preview](preview/preview-results.json) | 74/74 |
| [desktop](desktop/desktop-results.json) | 9/9 |
| [workflows](workflows/workflows-results.json) | 77/77 |

반복 검사 30.1분 · 458회 왕복/회전 · 재접속 30회 · 실패 0 · 예외 0. PC 고정 미리보기 15.0분 · 창 크기 전환과 마우스 왕복 233회 · 실패 0 · 예외 0.

화면 감사: landscape-final 47개 패널 / 잘림 0, portrait-final 47개 패널 / 잘림 0, preview-final 47개 패널 / 잘림 0, small-final 47개 패널 / 잘림 0, wide-final 47개 패널 / 잘림 0.

## 범위와 한계

Edge 터치 에뮬레이션과 PC 마우스로 검사했다. 실제 Android/iPhone과 Safari는 미검증이다. 사용자 저장소와 분리했으며 외부 글꼴을 차단했다. 반복 검사는 구현 도중 실행하고 15회마다 새로고침했다. 최종 수용 검사는 별도다. 초기 native 결과의 수색 선택자·강화 높이 실패는 수정 후 native-final에서 재검증한다.
