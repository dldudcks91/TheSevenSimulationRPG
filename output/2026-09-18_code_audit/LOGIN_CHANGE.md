# Google 로그인 필수 진입 변경

2026-09-18 사용자 요청에 따라 구현했다. 기존 [검증 보고서](REPORT.md)는 검증 당시의 기록으로 보존하며, 보고서의 결함들을 일괄 수정한 것은 아니다.

- 게임 시작 시 Google 인증과 클라우드 확인을 먼저 한다. 기존 Google 세션은 자동 확인한다.
- 로그인 전에는 로컬 세이브 로드, 새 게임 생성, 개발용 URL 처리, 원정 타이머 실행을 시작하지 않는다.
- 로그인 취소와 인증·클라우드 확인 실패 시 로그인 화면에서 재시도한다.
- 로그아웃이나 다른 탭의 인증 변경 시 게임 진행을 멈추고 다시 진입한다. 로컬 세이브는 보존한다.
- 개발용 계정 화면도 인증 이후에만 접근하며 가짜 계정으로 실제 계정을 교체하지 않는다.

변경: `src/ui/app.js`, `cloud.js`, `i18n.js`, 화면·아키텍처 문서. Firebase 인증 상태 관찰은 [공식 문서](https://firebase.google.com/docs/auth/web/manage-users)의 `onAuthStateChanged`를 사용한다.

검증: `python -X utf8 output/2026-09-18_code_audit/test_login.py`. 격리된 Edge 브라우저에서 인증 어댑터 응답을 대체하여 10개 검사 통과. 상세 결과는 [login_results.json](login_results.json).

실제 Google 팝업 로그인과 운영 Firebase 서버 통신은 테스트하지 않았다. 이 변경은 브라우저 게임의 진입 흐름에 대한 것으로 서버의 게임 실행 권한 검증을 추가한 것은 아니다.
