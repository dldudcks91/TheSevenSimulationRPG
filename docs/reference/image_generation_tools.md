# 그림 생성 도구 — Codex · Gemini

에이전트가 그림을 직접 뽑을 때 쓰는 두 경로. 프롬프트 쓰는 법은 이 문서가 아니라 `art-prompt` · `icon-prompt` 스킬과 같은 폴더의 `*_prompt.md` 문서에 있다.

## 원칙

- **API 는 절대 안 쓴다** — 둘 다 사용자 계정 로그인(구독 한도)으로만 돌린다. API 키 로그인 · `OPENAI_API_KEY` · `GEMINI_API_KEY` · 플랫폼 API 직접 호출 전부 금지. 로그인이 풀려 있으면 키로 갈아타지 말고 멈추고 묻는다
- **한 번에 3~4장씩** 뽑는다 (2026-10-06 사용자)

## Codex — ChatGPT 로그인

| 항목 | 값 |
|---|---|
| 실행 파일 | `~/.vscode/extensions/openai.chatgpt-<최신판>-win32-x64/bin/windows-x86_64/codex.exe` (PATH 에 없음) · `~/.codex/.sandbox-bin/codex.exe` 는 그림이 「tool host unavailable」로 실패한다 |
| 부르기 전 | `codex login status` → 「Logged in using ChatGPT」인지 확인 |
| 명령 | 지시문을 stdin 으로 · `exec -s read-only -C <작업 폴더> --skip-git-repo-check -c model_reasoning_effort="low" --json -o last.txt -i <앵커1> -i <앵커2> -` |
| 결과 | 그림 경로가 `last.txt` 에 온다 · 파일은 `~/.codex/generated_images/<세션 id>/` |
| 속도 | 1254×1254 시트 한 장 약 2분 |

- 사용자 `~/.codex/config.toml` 은 건드리지 않는다 — 필요한 설정은 `-c` 로 그 호출에만
- 3×3 시트는 넓은 그림이 칸을 넘어 격자 절단이 옆 칸을 문다 — 행 안 빈 틈으로 가른다

## Gemini — 웹(gemini.google.com)을 크롬으로 조종

Gemini CLI 는 2026-06-18 부터 개인 계정 구글 로그인이 막혀 API 키로만 돈다 → 안 쓴다. 후속작 Antigravity CLI(`agy`)는 구글 로그인으로 그림 도구가 있다지만 윈도우 헤드리스 실행이 멈춘다는 보고가 있어 시험 안 했다.

**1. 크롬 띄우기** (PowerShell · 전용 프로필 · 디버깅 포트 9222)

```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList @("--user-data-dir=`"$env:LOCALAPPDATA\gemini-chrome-profile`"", "--remote-debugging-port=9222", "--no-first-run", "--no-default-browser-check", "--window-size=1400,1000", "https://gemini.google.com/app")
```

- 평소 크롬과 따로 노는 프로필이다 — 크롬은 기본 프로필에 디버깅 포트를 못 열게 막는다
- 로그인은 처음 한 번 **사용자가 직접** 한다(비밀번호를 에이전트가 치지 않는다) · 이후엔 프로필에 남는다
- 띄우기 전에 9222 가 비었는지 확인 · `8777` 은 사용자 서버라 손대지 않는다 · 크롬을 이름으로 죽이지 않는다 — 닫을 땐 `gemini_web.py close`

**2. 조종 — `scripts/gemini_web.py`** (Playwright 로 그 창에 붙는다 · PowerShell 에서 돌린다)

| 명령 | 하는 일 |
|---|---|
| `shot [OUT.png]` | 화면을 찍는다(기본 `%TEMP%\gemini_web_shot.png`) — 찍은 그림을 보고 다음 클릭 좌표를 정한다 |
| `act STEP ...` | `goto:URL` · `click:X,Y` · `type:@파일.txt` · `press:Enter` · `wait:초` · `scroll:DY` 를 차례로 하고 찍는다 |
| `download OUT.png` | 지금 채팅의 마지막 그림을 **원본 크기**로 받는다(「원본 크기 이미지 다운로드」 버튼) |
| `run GEM_URL 프롬프트.txt OUT_DIR N [접두어]` | 그 Gem 의 새 채팅 N 번 · 같은 프롬프트 · 그림이 나오면 각각 원본 다운로드 |
| `close` | 그 크롬 창만 닫는다 |

- 화면이 바뀌어 스크립트가 길을 잃으면 `shot` → 그림 보고 → `act click:X,Y` 로 한 단계씩 간다
- 프롬프트는 UTF-8 파일로 넘긴다(`type:@파일`) — 명령줄 한국어는 깨진다

**3. Gem 주소** — 사용자가 만든 Gem 은 Gem 관리자(`https://gemini.google.com/gems/view`)에 있다. 열면 주소창이 `…/gem/<id>` 로 바뀐다

| Gem | 주소 |
|---|---|
| TheSevenSimulationART-몬스터(정예) | `https://gemini.google.com/gem/70623b5f18b5` — 3×3 시트 · 초록 배경 |
| 초상화 · 스킬 아이콘 · 아이템 아이콘 · 배경 | 아직 안 적었다 — 처음 열 때 채운다 |

**4. 결과** — 3×3 시트 한 장 약 45초 · 받은 파일 2048×2048 PNG(화면의 그림은 1024 미리보기라 반드시 다운로드 버튼으로 받는다)

**5. 확인된 범위 (2026-10-06)** — 크롬 띄우기 · 로그인 유지 · Gem 열기 · 프롬프트 입력 · 생성 · 원본 다운로드는 실제로 돌았다. `run`(N 번 자동)은 아직 끝까지 돌려 보지 않았다

- 구글은 자동 조작을 싫어한다 — 사람 속도로 한 장씩 · 몰아서 수십 장 돌리지 않는다

---
*마지막 업데이트: 2026-10-07*
