# 구조와 수정 안내

## 파일과 책임

```text
index.html             직접 실행 가능한 진입점
styles.css             게임 화면·모달·좁은 화면 레이아웃
start.bat              Windows 기본 브라우저로 파일 실행
serve.py               선택형 127.0.0.1 로컬 서버
assets/emblem.svg      독자적인 열차 문양
src/data.js            객차·시너지·유물·인물·역·노선·결단·유산·랜드마크 데이터
src/engine.js          상태·시간·생산·행동 조건·정산·메타·저장 검증
src/art.js             아이콘·객차 카드·풀바디 인물 SVG
src/scene.js           지역 풍경·역·주행·차량·승객 Canvas
src/app.js             화면·선택·키·드래그·오디오·저장·게임 루프
tests/engine.test.js   독립적인 엔진 검사
tests/browser_smoke.py 파일 실행/첫 구간/복원 검사
tests/browser_journey.py 서버 실행/실제 UI 완주/해금/저장 이전 검사
tests/browser_offline.py 서버 실행/경과 시간 복귀/키 변경/포커스 검사
docs/                 범위·규칙·검증·개발 기록
test-results/          실행 시 생성되는 스크린샷·검증 결과 (Git 제외)
```

클래식 스크립트로 순서대로 로드한다. `fetch`·모듈 import·외부 폰트·원격 이미지가 없어 파일 주소에서도 작동한다. data.js와 engine.js는 CommonJS export도 제공해 Node에서 직접 검사할 수 있다.

## 상태와 행동

`run`은 현재 한 여정, `meta`는 해금·유산·기록·설정이다. 엔진은 DOM·오디오·브라우저 저장을 모르며 전달받은 상태만 변경한다. 시뮬레이션 난수는 여정에 저장된 xorshift32 상태를 사용한다. 같은 시드·같은 행동·같은 시간 진행은 재현할 수 있다. 판 밖 유산 재설정과 날짜 식별은 별도 비결정적 입력이다.

행동은 `{ok, message}`로 성공 여부를 반환한다. 거래·객차·고용은 정류장 조건, 자원·공간·선행 조건을 엔진이 검사한다. 화면의 disabled는 설명과 편의를 위한 것이며 실제 조건 검사도 엔진에 있다.

그림은 상태를 읽는다. `Scene`은 정지·상태·입자 설정을 받아 움직이고, 게임 시간이 모달에서 멈추면 주행 그림도 멈춘다. 로직과 시각 타이머를 같은 값으로 삼지 않는다. 2초씩 화면을 다시 그리는 성과 패널과 0.35초 자원 표시가 있으며, 주행 제어 버튼은 상태 변경 때만 갱신해 클릭/포커스를 유지한다.

## 확장할 때의 규칙

1. 객차를 추가하면 tags·capacity·seats·cash·morale·description을 data.js에 정의하고, 특수 효과가 있으면 엔진의 metrics 또는 production에 연결한다.
2. 유물의 즉시/상시/주기/도착/시간 변형 효과를 구분한다. 이름·설명만 추가한 카드로 끝내지 않는다.
3. 새로운 효과가 매각가·생산 반복·주기 감소를 강화한다면 같은 역 반복 거래와 다중 배율의 경제를 검사한다.
4. 객차 UID의 지속 상태와 종류별 기본값을 구분한다. 보관·합성·불러오기에서 훈련과 준비 시간이 사라지지 않게 한다.
5. 새 역과 연결은 계약 목적지·순환 복귀·진입 조건까지 확인한다. 역별 시장과 랜드마크는 경로를 택할 이유를 제공해야 한다.
6. 새 상태 필드는 newRun/defaultMeta와 저장 검증, UI, 문서에 함께 기록한다. 스키마를 바꾸면 명시적인 변환이 필요하다.
7. 새 종료 경로는 한 번만 정산해야 한다. 결과 화면을 닫거나 새로고침해 동전이 다시 지급되면 안 된다.

## 검사 실행

이 폴더에서 일반 Node가 있으면:

```powershell
node --test tests/engine.test.js
```

현재 작업 환경에는 Node가 PATH에 없어 Python Playwright의 포함된 실행 파일을 사용했다. 같은 구성을 쓸 때:

```powershell
$dustlineNode = (python -c "import pathlib,playwright; print(pathlib.Path(playwright.__file__).parent / 'driver' / 'node.exe')").Trim()
& $dustlineNode --test tests/engine.test.js
```

브라우저 검사는 Python Playwright와 Edge가 설치된 개발 환경에서:

```powershell
python tests/browser_smoke.py
```

전체 여정 검사는 별도 터미널에서 서버를 먼저 켠 뒤:

```powershell
python serve.py --no-browser
```

```powershell
python tests/browser_journey.py
python tests/browser_offline.py
```

서버 검사는 기본 8844포트를 사용한다. 테스트 브라우저는 headless이며 일반 브라우저 저장을 건드리지 않는 새 컨텍스트다. 기본 게임을 실행하는 사용자에게 Node·Playwright·Python 설치는 필요 없다.

## 현재 구현 선택의 이유

- 원작의 대규모 콘텐츠보다 거래·계약·빌드·위험·메타가 연결되는지 확인하기 위해 소수 데이터로 구현했다.
- 별도 설치 없이 결과를 바로 열어 볼 수 있게 브라우저 기반으로 만들었다.
- 원작 이미지나 생성된 래스터 그림을 재사용하지 않고 코드로 그려 층수·색·화물·해상도가 상태에 맞게 변하도록 했다.
- 고정 지도로 같은 선택을 비교하고 버그를 재현할 수 있게 했다.
- 저장 파일은 사람이 읽을 수 있게 하되, 잘못된 파일이 기존 저장을 덮어쓰지 않게 검사와 교체 확인을 붙였다.
- 오프라인 진행에서 사건과 거래를 임의로 대신 선택하지 않게 했다.

큰 변경을 시작하기 전 원본 연구와 현재 규칙을 구분해야 한다. 현재 규칙은 이 폴더의 문서·코드이며, 북부 생존 idle 프로젝트의 기획과도 별개다.
