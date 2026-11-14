# 모바일 선택·행동 UI 재설계

원정의 마지막 지역이 아래로 밀리던 문제부터 실제 콘텐츠를 기준으로 다시 구성했다. 기존 초상·배경·스킨·아이콘·게임 규칙을 유지한다.

[변경 전후 화면 갤러리](index.html) · [전체 검증 정보와 파일 해시](summary.json) · [모바일 규격](../../docs/client/MOBILE_UI.md)

- 작업 시작: 2026-11-14 18:46:28 KST
- 결과 기록: 2026-11-14T19:47:31.666613+09:00
- 작업 경과: 61.06분

## 바뀐 화면

| 화면 | 모바일 구성 |
|---|---|
| 원정 | 챕터 선택·난이도·결과 고정 + 남은 높이를 나누는 다섯 지역. 모든 챕터의 마지막 지역까지 휠 없이 접근 |
| 고용·수색 | 후보 또는 도착 영웅을 고른 뒤 능력치 7개·HP·합·고용/보관/돌려보내기 표시 |
| 의뢰·전술·전직 | 짧은 선택 줄 + 현재 상세. 의뢰 행동·전술 잠금·전직 비용과 실행 유지 |
| 건설·연구 | 현재 결정과 전체 랭크/레벨 목록 분리. 연구 시작·진행·취소를 같은 화면에서 조작 |
| 대장간 | 네 작업 탭을 고정 폭 안에 표시. 장비 상세와 강화 결정을 분리하고 단계·성공 확률·변화·전체 재료·실행을 함께 표시 |
| 탐험·연구판 | 챕터/생산 줄 선택 + 해당 선택지 전부 표시 |
| 출전 준비 | 부대 선택 + 두 팀/장비 전환 + 고정된 전투 시작. 실제 여섯 영웅의 정보로 검증 |
| 분류·알림 | 긴 분류 줄은 네이티브 선택기. 실행 결과 알림은 하단 버튼을 덮지 않는 상단 배치 |

390×844 원정의 변경 전 본문은 높이 684px로 이미 고정되어 있었지만 내부 지역 패널은 표시 높이 613px에 내용 690px였고, 다섯째 지역의 아래 경계가 832px였다. 변경 후 내부 스크롤은 없고 다섯째 지역은 766px 안에 끝난다. 바깥 본문만 재는 검사로 통과시키지 않고 실제 카드·행동 버튼·클릭 위치와 휠 전후 위치를 검사한다.

PC 수동 모바일 미리보기는 390×844 고정, 작은 창은 같은 비율로 축소한다. 실제 터치 모바일은 실제 뷰포트에 맞춘다. 가방·도감 결과·긴 설명·전체 레벨 목록은 해당 영역 안에서 스크롤한다.

## 검증

| 묶음 | 통과 | 결과 |
|---|---:|---|
| native | 1393 / 1393 | [JSON](checks/native/results.json) |
| forge | 76 / 76 | [JSON](checks/forge/results.json) |
| visitors | 100 / 100 | [JSON](checks/visitors/results.json) |
| fixed | 847 / 847 | [JSON](checks/fixed/fixed-results.json) |
| desktop | 9 / 9 | [JSON](checks/desktop/desktop-results.json) |
| startup | 31 / 31 | [JSON](checks/startup/startup-results.json) |
| dialogs | 25 / 25 | [JSON](checks/dialogs/dialogs-results.json) |
| touch | 29 / 29 | [JSON](checks/touch/touch-results.json) |
| panels | 94 / 94 | [JSON](checks/panels/panels-results.json) |
| preview | 74 / 74 | [JSON](checks/preview/preview-results.json) |
| workflows | 77 / 77 | [JSON](checks/workflows/workflows-results.json) |

네 가지 화면(390×844, 320×568, 568×320, 800×600 PC 미리보기)에서 각 47개 기능 패널을 촬영하고 실제 스크롤 영역·가려진 조작부를 확인했다. 각 최종 감사의 브라우저 예외와 가려진 조작부는 `summary.json`에 기록했다.

실시간 연속 실행: **45.0분 · 177회 검사 · 재접속 8회 · 실패 0 · 브라우저 예외 0**. 수정 작업과 병행하여 전투·관리 메뉴·회전·저장·재접속을 반복했으며, 재접속 때마다 당시 작업 폴더를 읽었다. 최종 UI는 별도 수용 검사와 회귀 검사로 확인했다.

기본 명령:

```powershell
python serve.py 8854
python scripts/verify_mobile_native.py --port 8854 --section all
python scripts/verify_mobile_ui.py --port 8854 --section fixed
python scripts/audit_mobile_usability.py --port 8854 --width 320 --height 568 --output-dir _scratch/mobile-audit
python scripts/soak_mobile_ui.py --minutes 45 --output-dir _scratch/mobile-soak
```

`native`는 잠긴 새 게임·모든 지역·실제 고용/의뢰/연구/출전·선택 유지·키보드 포커스를 검사한다. 연구 취소는 관리자 즉시 완료를 끈 상태에서 비용 환급까지 확인한다. `panels`는 실제 터치 드래그 진형 변경, `touch`는 길게 누르기·장착·잠금·설정·우편, `startup`은 새 게임과 이어하기, `preview`는 PC 창 7종의 동일한 논리 배치를 확인한다.

## 범위와 한계

- Python Playwright + headless Microsoft Edge의 터치 에뮬레이션이다. 실제 Android/iPhone 및 Safari 검증은 포함하지 않는다.
- 기존 플레이어 저장소와 분리된 테스트 프로필을 사용했다. 외부 웹 글꼴은 차단하고 로컬 대체 글꼴로 재현했다.
- 병행 작업이 있는 작업 폴더를 그대로 검사했다. 각 보고서의 소스 해시로 시점을 구분한다. 게임 로직·CSV를 HEAD로 바꿔 통과시킨 결과가 아니다.
- 검증용 브라우저를 동시에 많이 띄웠을 때 로컬 서버의 일시적 연결 거절/스타일 미수신을 확인했다. 최종 묶음은 순서대로 실행하며 로컬 스타일시트의 로드 완료를 확인한다.
- 배포 파일 목록에 모바일 모듈과 스타일이 포함되는지, 해당 파일의 축소 전후 토큰 동등성과 괄호 검증을 확인했다. 외부 배포는 하지 않았다.
