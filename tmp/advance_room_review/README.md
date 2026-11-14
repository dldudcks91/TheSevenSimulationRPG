# 전직의 방 적용 및 검증 — 2026-11-15

도서관의 스킬북·전직 폴더 탭을 제거하고 책 관리 기본 화면에 전직의 방 입구를 추가했다. 방에서 세 갈래의 설명과 실제 전직 마스터리를 비교하며, 선택한 스킬에 따라 강화 줄이 바뀐다. 실행 영역에는 조건·비용·시간·갈래 변경 불가 안내가 있고, 완료 후에는 마스터리 열기로 연결한다. 미리보기는 게임 상태를 변경하지 않는다. 한영·Now/D2 Min·PC/모바일을 지원한다.

## 결과

| 검사 | 결과 |
|---|---|
| `scripts/verify_advance_room.py` | 725/725 통과, 브라우저 예외 0. 다섯 직업·모든 갈래/스킬, 미리보기 재화 불변, 건물/레벨/골드 조건, 수입으로 버튼 갱신, 비용 한 번 차감, 완료/스킬 학습/복귀, 영웅 변경 |
| `scripts/verify_mobile_native.py --section keyboard` | 27/27 통과 |
| `scripts/verify_mobile_native.py --section choices` 중 전직 | 45/45 통과, 568×320 포함 |
| `scripts/verify_mobile_gestures.py` | 138/138 통과, 브라우저 예외 0. 스와이프가 전직을 실행하지 않는지 포함 |
| `books.py` | PC·모바일에서 책 제작(도안 소모·책 증가), 기존 스킬 업그레이드(책 소모) 통과 |
| Python 검사 파일 문법·`git diff --check` | 통과 |

모든 브라우저 검사는 격리된 프로필과 테스트 세이브를 사용했다. 게임 규칙·CSV·실제 사용자 저장 데이터는 수정하지 않았다.

## 전체 회귀 검사에서 남은 별도 문제

- `src/dev/test.html`: 883/884 통과. 실패 1건은 현재 CSV 22종·밸런스 159키와 저장된 golden 기준의 불일치다. 이번 작업은 해당 데이터와 golden 파일을 변경하지 않았다. 상세: [regression.txt](regression.txt).
- 모바일 선택 화면 전체 검사: 252/270 통과. 실패 18개는 568×320 영어 D2 Min 선술집 고용 카드의 잘림/접근성이다. 전직 검사 45개는 모두 통과했다. 상세: [mobile-choices/results.json](mobile-choices/results.json).

## 화면

- [PC 전직의 방](1600-ko-now-room.png)
- [모바일 책 관리](390-ko-d2min-books.png)
- [모바일 전직 완료](390-ko-d2min-complete.png)
- [전직 상세 검사](results.json)

결정: `docs/client/adr/1174-도서관은-책-관리와-전직의-방으로-나누고-실제-마스터리를-미리-본다.md`.
