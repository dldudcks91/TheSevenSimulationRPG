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
- 그림은 그렸는데 `last.txt` 에 경로 대신 「경로를 못 받았다」가 오는 때가 있다(9장 중 2장꼴) — `events.jsonl` 첫 줄의 `thread_id` 로 `~/.codex/generated_images/<thread_id>/` 에서 건진다
- Gemini 결 초상은 참조만 붙이면 안 나온다 — Gemini 원본을 바탕으로 편집시킨다 → [art-prompt prompt_template §7](../../.claude/skills/art-prompt/prompt_template.md)

## Gemini — 웹(gemini.google.com)을 크롬으로 조종

Gemini CLI 는 2026-06-18 부터 개인 계정 구글 로그인이 막혀 API 키로만 돈다 → 안 쓴다. 후속작 Antigravity CLI(`agy`)는 구글 로그인으로 그림 도구가 있다지만 윈도우 헤드리스 실행이 멈춘다는 보고가 있어 시험 안 했다.

**1. 크롬 띄우기** (PowerShell · 전용 프로필 · 디버깅 포트 9222)

```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList @("--user-data-dir=`"$env:LOCALAPPDATA\gemini-chrome-profile`"", "--remote-debugging-port=9222", "--no-first-run", "--no-default-browser-check", "--window-size=1400,1000", "https://gemini.google.com/app")
```

- 크롬 경로는 PC 마다 다르다 — `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe` 인 PC 가 있다(`HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe` 로 확인)
- 처음 쓰는 PC 는 `python -m pip install playwright` — 브라우저 받기(`playwright install`)는 필요 없다(띄운 크롬에 붙는다)
- 평소 크롬과 따로 노는 프로필이다 — 크롬은 기본 프로필에 디버깅 포트를 못 열게 막는다
- 로그인은 처음 한 번 **사용자가 직접** 한다(비밀번호를 에이전트가 치지 않는다) · 이후엔 프로필에 남는다
- 띄우기 전에 9222 가 비었는지 확인 · `8777` 은 사용자 서버라 손대지 않는다 · 크롬을 이름으로 죽이지 않는다 — 닫을 땐 `gemini_web.py close`

**2. 조종 — `scripts/gemini_web.py`** (Playwright 로 그 창에 붙는다 · PowerShell 에서 돌린다)

| 명령 | 하는 일 |
|---|---|
| `shot [OUT.png]` | 화면을 찍는다(기본 `%TEMP%\gemini_web_shot.png`) — 찍은 그림을 보고 다음 클릭 좌표를 정한다 |
| `act STEP ...` | `goto:URL` · `click:X,Y` · `type:@파일.txt` · `press:Enter` · `wait:초` · `scroll:DY` · `attach:A.png\|B.png` 를 차례로 하고 찍는다 |
| `download OUT.png` | 지금 채팅의 마지막 그림을 **원본 크기**로 받는다(「원본 크기 이미지 다운로드」 버튼) |
| `run GEM_URL 프롬프트.txt OUT_DIR N [접두어] [--attach A.png\|B.png]` | 그 Gem 의 새 채팅 N 번 · 같은 프롬프트(+ 같은 첨부) · 그림이 나오면 각각 `OUT_DIR/<접두어>_<k>.png` 로 원본 다운로드 |
| `close` | 그 크롬 창만 닫는다 |

- 화면이 바뀌어 스크립트가 길을 잃으면 `shot` → 그림 보고 → `act click:X,Y` 로 한 단계씩 간다
- 프롬프트는 UTF-8 파일로 넘긴다(`type:@파일`) — 명령줄 한국어는 깨진다

**3. Gem 주소** — 사용자가 만든 Gem 은 Gem 관리자(`https://gemini.google.com/gems/view`)에 있다. 열면 주소창이 `…/gem/<id>` 로 바뀐다

| Gem | 주소 |
|---|---|
| TheSevenSimulationART-몬스터(정예) | `https://gemini.google.com/gem/70623b5f18b5` — 3×3 시트 · 초록 배경. 메인 프롬프트가 art-prompt 의 `gem_main_prompt.txt` 와 같다 · 지식 = 정예 `1103_elite` · `1301_elite` · 영웅 `warrior_3` |
| TheSevenSimulationArt - 초상화 | `https://gemini.google.com/gem/5f85cdf1b764` — 2×2 시트 · 지식 = 영웅 `warrior_1~3` |
| cartoon-art | `https://gemini.google.com/gem/24346aa60645` — 지식 없음 · 기본 도구 없음 |

⚠ **Gem 지식 그림은 생성기에 안 가는 것으로 보인다** (2026-10-09 · [ch1_st2_human_gem_prompt.md](ch1_st2_human_gem_prompt.md)) — 지식이 다른 두 Gem 이 한 줄 프롬프트에 같은 거친 결을 냈고, 영웅 초상을 `--attach` 로 붙이자 얼굴 · 팔레트가 영웅 쪽으로 왔다. 그림체를 맞추려면 요청마다 첨부한다. 단 **첨부 + 인물별 묘사 목록은 그림이 안 나온다**(거절 · 글로 쓴 사양 · 오류 — 8번 연속) — `run` 은 답이 그림 없이 끝나면 그 글을 보여 주고 바로 멈춘다

⚠ **병렬 세션이 한 크롬 탭을 같이 잡는다** (2026-10-13) — `gemini_web.py` 는 첫 번째 Gemini 탭을 쓰므로 두 세션이 동시에 `run` 하면 서로 페이지를 옮겨 전송이 실패하고 다운로드가 0바이트로 끊긴다. 돌리기 전에 다른 `gemini_web.py run` 프로세스가 있는지 보고, 있으면 끝나길 기다린다. **새 창을 따로 열어도 안 된다** (2026-10-24) — 같은 크롬에 붙은 Playwright 가 둘이면 다운로드 폴더는 나중에 붙은 쪽 것이 된다. 그래서 먼저 붙은 쪽의 받은 그림이 깨진다(「cannot identify image file」). 나중에 붙은 쪽이 끝나 나가도 그 폴더가 남아 계속 깨지고, 먼저 붙은 쪽이 다시 붙어야 풀린다. 이름에 `gem` · `gemini` 가 든 python 프로세스도 같이 본다(배치 스크립트는 `gemini_web.py` 를 불러다 쓴다)

⚠ **엔트 초상은 「서드 파티 콘텐츠 제공업체의 권리 보호」 거절이 잦다** (2026-10-12 · `2201`~`2203` — 기성 캐릭터를 닮은 탓으로 보인다) — `2201` 한 장만 붙이면 거절되고, **세 장(`2201`~`2203`)을 함께 붙이면 대개 그려 준다**(정예 Gem · 일반 채팅 모두 · 거절은 네다섯 번에 한 번꼴 — 같은 요청을 다시 보내면 된다). 첨부를 빼고 글로만 적으면 생김새가 원본에서 멀어진다 — 정예처럼 원본을 지켜야 하는 발주는 셋을 함께 붙인다

⚠ **하데스 초상은 묘사를 붙인 프롬프트로는 첫 판 뒤로 그림이 안 나왔다** (2026-10-21) — 글 답(「text-only environment」) · 거절(「그런 것을 하도록 프로그래밍되지 않았습니다」) · 5분 무응답으로 14번 모두 실패했다. 해골 · 저승 단어를 빼도, 이름을 빼도, 첨부를 바꿔도 같았고 같은 시각 제우스는 그려졌다. **이름 아홉 줄 초안(2026-10-24)은 첫 시도에 그려졌다** → [faces/source/README.md](../../src/assets/art/faces/source/README.md) 「마법사 유니크 스케치」
| 스킬 아이콘 · 아이템 아이콘 · 배경 | 주소는 아직 안 적었다 — 처음 열 때 채운다 |

⚠ **하루 생성 한도가 있다** (2026-10-24) — 그날 몬스터(정예) Gem 으로 3×3 시트 133장(04:02 ~ 23:32 · 세션 셋이 나눠 씀)을 받은 뒤, 「오늘은 더 이상 이미지를 생성할 수 없습니다. 내일 다시 오시면 …」 · 「오늘은 이미지를 더 생성할 수 없지만, 웹에서 이미지를 찾을 수 있습니다」 글 답만 왔다(자정을 넘겨도 같았다). 한도는 계정 하나에 걸리므로 병렬 세션이 같이 깎는다 — 큰 묶음은 그날 남은 양을 생각해 나눈다. 이 문구가 오면 **재시도하지 말고 멈춘다**(그날은 다시 보내도 같은 답이고, 그만큼 자동 조작으로 보인다)

**4. 결과** — 3×3 시트 한 장 약 45~65초 · 받은 파일 2048×2048 PNG(화면의 그림은 1024 미리보기라 반드시 다운로드 버튼으로 받는다)

**5. 확인된 범위 (2026-10-09)** — 크롬 띄우기 · 로그인 · Gem 열기 · 프롬프트 입력 · 생성 · 원본 다운로드 · `run` 끝까지 · `attach`(입력창에 붙는 것까지)가 실제로 돌았다

- 구글은 자동 조작을 싫어한다 — 사람 속도로 한 장씩 · 몰아서 수십 장 돌리지 않는다

---
*마지막 업데이트: 2026-10-25*
