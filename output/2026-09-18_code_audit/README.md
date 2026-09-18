# 코드 검증 재실행

결론과 근거: [REPORT.md](REPORT.md).

저장소 루트에서 실행한다. Python, 설치된 Playwright Python 패키지, Windows Edge를 사용한다. Node 패키지 설치나 앱 빌드는 필요 없다.

```powershell
python -X utf8 output/2026-09-18_code_audit/static_audit.py
python -X utf8 output/2026-09-18_code_audit/run_audit.py --mode baseline
python -X utf8 output/2026-09-18_code_audit/run_audit.py --mode extended
python -X utf8 output/2026-09-18_code_audit/run_audit.py --mode focused
python -X utf8 output/2026-09-18_code_audit/run_audit.py --mode campaign
python -X utf8 output/2026-09-18_code_audit/run_audit.py --mode ui
python -X utf8 output/2026-09-18_code_audit/run_audit.py --mode flow
```

각 명령은 `serve.py`를 포트 8879에 띄우고 격리된 임시 브라우저 컨텍스트에서 실행한 뒤 종료한다. 같은 포트를 쓰므로 동시에 실행하지 않는다. 사용자의 실제 브라우저 프로필·세이브·Google 계정을 사용하지 않는다. 결과 파일은 같은 이름으로 갱신되므로 과거 결과를 보존하려면 실행 전에 별도 보관한다.

`baseline`은 기존 테스트 페이지, `extended`는 상태·생성·전투 불변조건, `focused`는 경계 사례와 스킬/후반 스테이지, `campaign`은 기존 장착 봇의 3,000원정, `ui`는 44개 화면 경로와 재생·저장 실패 주입, `flow`는 실제 재접속·다중 탭·화면 배율을 검사한다.

`ui`와 `flow`는 브라우저에 전달하는 app.js 응답 끝에 검사 전용 export를 붙인다. 디스크의 앱 소스는 변경하지 않는다. UI 사건 검사는 별도 DOM에 synthetic timeline 또는 실제 런타임이 만든 이벤트를 넣으며 각 테스트의 제한은 보고서에 적었다.

현재 결함을 재현하는 검사는 **실패가 예상된다**. 프로세스 종료 코드 0은 실행을 마쳤다는 뜻이며 제품 검증 통과를 뜻하지 않는다. JSON의 `ok`, `passed`, `title`, `issues`를 확인한다. `focused`의 두 관찰 항목(함성 재적용, CSV 관용 파싱)은 현상을 기록하며 기획의 정답을 단정하지 않는다.

| 파일 | 내용 |
|---|---|
| baseline.json / baseline.html | 마지막 기존 테스트의 단정 목록·캘리브레이션·DOM |
| static.json | CSV 목록·열 검사·로더 목록·의존 관계 |
| extended.json / focused.json | 추가 검사 결과와 최소 실패 입력 |
| campaign.json | 3,000원정 개별 결과와 봇 가정·요약 |
| ui.json / ui_logic.json | 화면 44경로와 재생·저장 계약 검사 |
| flow.json | 실제 브라우저 재접속·다중 탭·배율 |
| *_manifest.json | 실행 직전 검증 대상의 SHA-256 |
| *_changes_during_run.json | 실행 중 변경된 검증 대상 |
| ui_2.png / ui_11.png / ui_18.png / ui_touch.png | 대표 화면 캡처 |

마지막 업데이트: 2026-09-18
