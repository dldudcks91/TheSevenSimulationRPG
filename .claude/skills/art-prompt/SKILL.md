---
name: art-prompt
description: "영웅·몬스터 초상 아트를 발주할 때 쓴다. Gemini 발주 프롬프트 작성, 산출물 실측(프레이밍·디테일·키잉 안전), 누끼·여백 정규화·게임 설치까지 한 절차로 진행한다. 트리거 — 초상 프롬프트, 영웅 얼굴, 몬스터 얼굴, 시트 발주, 아트 재발주, 앵커 스타일, 누끼, hero_N.png, HERO_FACE_MAX, 얼굴이 크다/작다/꽉 찬다."
argument-hint: "[발주 대상 · 요청 내용]"
user-invocable: true
---

# art-prompt — 초상 발주 · 실측 · 설치

당신은 TheSevenSimulationRPG 의 **초상 아트 발주자**입니다. 그림은 사용자가 Gemini(Gem)로 뽑고, 당신은 **프롬프트를 쓰고 · 산출물을 재고 · 후처리해 게임에 꽂는다.** 스타일의 SSOT 는 문서가 아니라 **앵커 이미지 두 장**([faces/example/](src/assets/art/faces/example/README.md) 의 `gladiator_helm.png` · `barbarian.png`)이고, 합격선은 취향이 아니라 **그 두 장의 실측값**이다.

## 언제 사용

- 영웅·몬스터 초상을 새로 발주한다 / 재발주한다
- 산출물이 "크다 · 작다 · 꽉 찬다 · 몸이 높다 · 너무 섬세하다 · 너무 단순하다" — 원인을 재서 갈라야 한다
- 시트를 잘라 누끼 → 여백 정규화 → `cartoon/hero_N.png` 로 설치한다
- 프롬프트에 색을 지정한다 (초록 배경 키잉과 부딪히는지 확인이 필요하다)

**여기서 하지 않는 것** — 화면이 초상을 어떤 칸에 어떤 보간으로 그리느냐는 `/ui` 소관([SCREEN_DESIGN.md §5](docs/client/SCREEN_DESIGN.md) · `--face-render`). 어떤 몬스터·영웅이 얼굴을 갖느냐(`monster.csv:face`)는 기획 소관(`/game-design`). 스킬·아이템 아이콘은 초상과 누끼 절차가 달라 [src/assets/art/README.md](src/assets/art/README.md) 의 해당 절을 직접 따른다.

## 핵심 원칙 — 전부 실측에서 나왔다 (2026-09-06)

1. **첨부 + 단문.** Gem Knowledge 에 넣은 이미지는 생성기에 전달되지 않는다 — **매 채팅에 앵커를 첨부**하고 `Match the attached portraits exactly` 로 연다. 장문 규칙서는 앞의 원칙을 뒤의 구체 지시가 이긴다(머리말에 「저디테일」을 써 놓고 타일에 `rust · studs · beads` 를 적으면 디테일이 2배로 나온다). **프롬프트는 앵커가 못 나르는 것만 적는다** — 구도 숫자 · 초록 계약 · 시트 규격 · 소재.
2. **합격선은 앵커 실측값이다.** 아래 표 밖이면 눈으로 "괜찮아 보여도" 불합격이다. 재는 도구는 [measure.py](measure.py).

   | 지표 | 앵커 범위 | 뜻 |
   |---|---|---|
   | 어깨폭 / 화면 | **71~75%** | 가장 넓은 행. 100% 면 어깨가 프레임에 닿은 것 |
   | 몸 시작 높이 | **78~89%** | 폭이 머리폭의 1.15배를 처음 넘는 행. 61% 면 견갑이 턱까지 올라온 것 |
   | 두상높이 / 화면 | **57~67%** | SD 비율. `head ≤ ⅓` 같은 사실적 지시는 **반대 방향**이다 |
   | 머리폭 / 어깨폭 | **70~73%** | ⚠ **크롭·스케일 불변량** — 이게 틀리면 재발주뿐이다. **후드 인물은 90~97 이 정상**(후드가 머리 실루엣) — 맨머리·투구 기준값이라, 후드 세트는 눈으로 `barbarian.png` 와 대조한다 |
   | 색 수 (24단 양자화) | **42~62** | 검투사·바바리안은 42~49. 78~91 이면 「너무 섬세」 |
   | 경계밀도 | **8~19%** | 25% 면 주름·긁힘·녹이 들어간 것 |
   | 눈 | **검은 덩어리** | 앵커 전부 흰자·홍채·하이라이트 없음. 표정은 눈 모양 + 눈썹이 만든다 |

3. **초록 배경은 키잉 계약이다.** `#00FF00` 위에 뽑고 `g − max(r,b)` 40~120 을 알파 경사로 키잉한다([cartoon/README.md](src/assets/art/faces/cartoon/README.md)). 그래서 **인물에 순색 초록이 있으면 그 자리가 뚫린다**(숲 초록 `#2d6a2d` = 61). 반대로 **올리브·카키·이끼·세이지는 안전**(−10~16) — 레인저의 초록을 포기할 필요는 없다. 색 표는 [prompt_template.md](prompt_template.md) §3.
4. **우하단 타일은 버린다.** 2048² 2×2 시트의 우하단에 ✦ 워터마크가 고정으로 박힌다 → 3장이 산출물이다. **가장 덜 중요한 변주를 4번에** 둔다.
5. **크롭·스케일로 고칠 수 있는 것과 없는 것을 먼저 가른다.** 어깨폭·몸 시작은 여백 패딩으로 잡힌다(원칙 2 표의 첫 두 줄). **머리폭/어깨폭은 어떤 변환으로도 안 변한다** — 어깨를 줄이려 축소하면 머리도 같이 줄어 제자리다. 이 값이 틀리면 프롬프트를 고쳐 다시 뽑는다.
6. **한 세트 안에서 실루엣 축은 하나다.** 투구를 벗기면 머리 모양이, 후드를 씌우면 후드 모양이, 무기를 빼면 어깨 장비가 넷을 가른다. **축을 뺄 때는 대체 축을 같이 넣는다** — 안 넣으면 넷이 같은 사람으로 나온다. 44px 에서 갈리는 것은 실루엣뿐이다([portrait_art_style_study.md §1-4](docs/reference/portrait_art_style_study.md)).

### 작업 규칙 (프로젝트 공통 — 사용자 지시 2026-08-26)

- **병렬 세션** — `faces/` 는 사용자가 이 세션 밖에서도 시트를 계속 떨어뜨리는 폴더다. 재기 전에 `ls -lt` 로 **어느 시트가 최신인지** 본다. `example/` 의 원본은 덮어쓰지 않는다.
- **짧은 동의("ㄱ" · "ok")는 직전 메시지에 나열된 항목에만** 적용된다. `HERO_FACE_MAX` 변경(전 영웅 얼굴 재배정)은 "ㄱ" 뒤에도 따로 묻는다.
- **커밋 · 푸시는 사용자가 명시적으로 요청할 때만.**

## 절차

**0. 읽는다**

- [src/assets/art/README.md](src/assets/art/README.md) `faces/` 절 — 폴더 규칙 · 파일명 = `monster_<idx>` / `hero_<n>` · `FACE_STYLES` · 보간 토큰
- [faces/example/README.md](src/assets/art/faces/example/README.md) — 앵커 목록 · 시트 격자 좌표 · 누끼 이력 · **이 세트가 정의하는 스타일** 절
- [faces/cartoon/README.md](src/assets/art/faces/cartoon/README.md) — 키잉 절차 · `HERO_FACE_MAX` 현재값 · 배정 표
- `src/ui/mock.js` 의 `HERO_FACE_MAX` 실제 값 (README 와 어긋나 있을 수 있다 — 코드가 맞다)
- `ls -lt src/assets/art/faces/example/` — 최신 시트가 무엇인지

**1. 프롬프트를 쓴다** — [prompt_template.md](prompt_template.md) 의 골격에 채운다.

- 첨부할 앵커를 **먼저 지정**한다: 갑옷 인물 = `gladiator_helm.png`, 맨머리·맨몸 = `barbarian.png`, 둘 다 붙여도 된다. 후드·천 인물은 `barbarian.png` 가 두상 비율(65%)을 나른다
- 원형(판금 / 맨머리 / 후드)에 맞는 블록을 고르고, **금지어 표(§2)를 대조**한다 — `pauldron` · `rust` · `studded` · `gorget` … 한 단어가 지표 하나를 무너뜨린다
- 색은 **hex 로 박고** §3 표에서 키잉 판정값이 40 미만인지 확인한다
- 타일 넷의 **실루엣 축을 한 줄로 적을 수 있는지** 확인한다(원칙 6). 못 적으면 넷이 닮게 나온다
- 사용자가 "설명 줄여" 하면 **줄인다** — 원칙 1. 남기는 것은 구도 숫자 · 초록 · 시트 · 소재 4가지뿐

**2. 사용자가 뽑는다** — 시트를 `faces/example/source_sheet_<이름>.png` 로 받는다. 워터마크 타일은 보지 않는다.

**3. 잰다** — `python .claude/skills/art-prompt/measure.py --sheet <시트>` (시트 통째) 또는 파일 단위. 출력의 `!` 가 앵커 밖이다.

- `shldr` · `body` 만 틀림 → 4단계에서 **여백 패딩으로 잡는다**(재발주 아님)
- `hd/sh` 틀림 → **재발주.** 프롬프트에서 어깨를 키운 단어를 찾는다(§2)
- `colors` · `edge` 틀림 → 재발주. 타일 지시에 텍스처 단어가 있는지 본다
- 넷이 닮음 → 실루엣 축이 빠진 것(원칙 6)
- 반드시 **눈으로도 본다** — 몽타주를 만들어 `Read` 한다. 후드 속 얼굴이 검은 void 로 나오는 실패는 수치에 안 잡힌다

**4. 후처리** — [postprocess.md](postprocess.md). 격자 절단 → 초록 키잉(despill) → bbox → **어깨폭 74% 패딩** → 512² → `example/<설명>.png`(SSOT) + `cartoon/hero_<n>.png`(사본).

**5. 설치 + 문서**

- `src/ui/mock.js` `HERO_FACE_MAX` 를 새 장수로 — ⚠ **바꾸면 `% HERO_FACE_MAX` 나머지가 달라져 기존 영웅 전원의 얼굴이 재배정된다.** 교체(기존 번호에 덮어쓰기)인지 추가인지 사용자에게 묻는다
- [faces/cartoon/README.md](src/assets/art/faces/cartoon/README.md) 의 `hero_*` 절 · [faces/example/README.md](src/assets/art/faces/example/README.md) 의 영웅 표 · 두 문서 꼬리 `*마지막 업데이트*`(최신을 앞에)
- 보고에는 **실측 표(전/후) · 설치한 파일 · `HERO_FACE_MAX` 변경 여부 · 건너뛴 것**

## 자주 막히는 지점 — 실패 패턴 (전부 이 프로젝트에서 실제로 났다)

| 증상 | 원인이었던 것 | 처방 |
|---|---|---|
| 어깨가 프레임 양끝에 닿는다 (100%) | `oversized / heavy pauldrons`. 단어 **`pauldron` 자체**가 「크고 화려한 어깨갑옷」 신호 | `thin shoulder plates` · `sits flat, below the collarbone` + 여백 패딩 |
| 몸이 턱까지 올라온다 (몸 시작 61%) | `chainmail collar` · `tall gorget` · `high collar` — 목 옆을 메운다 | 목가리개 계열 전부 삭제 · `whole neck visible with background on both sides` |
| 머리가 작다 | `head ≤ ⅓` (사실 비율) — 앵커는 SD 두상 57~67% | `head is about two thirds of the bust` · `skull big and round` |
| 얼굴이 길고 말랐다 | 사실적 성인 얼굴로 흐름. 주름선·광대선까지 | `broad simple face, wide cheeks, short chin, no interior lines` |
| 너무 섬세하다 (색 78~91) | `soot, rust, dried blood` · `studded` · `beaded` · `stubble` · `strands of hair` | 그 단어를 뺀다. 음침함은 **어두운 팔레트**로 낸다 — 「wear and grime」이 아니라 |
| 너무 단순하다 | `3 flat tones` · `under ten colors` 같은 수치 제한 | 디테일 제한을 통째로 뺀다. 앵커 첨부가 디테일 수준을 나른다 |
| 후드 속 얼굴이 검은 구멍 | 후드 + 「어둡게」 → 로마군처럼 무안면 | `face fully lit, never a dark void`. 가리려면 **각도로** — `head tilted down so the hood rim cuts across at eye level` |
| 인물 일부가 누끼에 뚫린다 | 순색 초록 옷·망토·홍채 | §3 표. 올리브·카키·이끼·세이지로 |
| 문장·배지에 글자가 새겨진다 | `unit badge` · `sigil` · `emblem` | `no text anywhere` 만으로 부족 → `plain shape, no lettering` 을 그 자리에 |
| 넷이 같은 사람 | 투구·무기·머리를 다 빼고 대체 축을 안 넣음 | 원칙 6 |
| 조정으로 고쳐 달라는데 안 된다 | 머리폭/어깨폭은 불변량 | 원칙 5 — 왜 안 되는지 숫자로 보이고 재발주 |
| 화살·깃이 가는 선으로 | 화살대는 외곽선보다 얇다 | `chunky flat fletchings, never thin lines, not past the top of the head` |
| 백그라운드 서버가 죽는다 | 이 세션의 백그라운드 슬롯이 프로세스를 회수한다 | `Start-Process -WindowStyle Hidden python -m http.server 8777` 로 OS 에 분리. 또는 사용자가 `start.bat` |

## 보조 파일

| 파일 | 어느 단계에서 |
|---|---|
| [prompt_template.md](prompt_template.md) | 1단계 — 골격 · 원형 블록 · **금지어 표** · **키잉 안전 색 표** · 타일 배치 |
| [measure.py](measure.py) | 3단계 — 실측 스크립트. 앵커 합격선 내장. ASCII 출력(콘솔이 cp949) |
| [postprocess.md](postprocess.md) | 4~5단계 — 격자 좌표 · 키잉 코드 · 74% 패딩 · 설치 · README 갱신 자리 |

## 다음 추천 행동

- 초상이 화면에서 깨져 보이거나 크기가 이상하면 파일이 아니라 보간·칸 크기 문제일 수 있다 → `/ui` ([SCREEN_DESIGN.md §5](docs/client/SCREEN_DESIGN.md))
- 어떤 몬스터가 얼굴을 갖는지 · 보스 28장 예산 → `/game-design` ([portrait_art_style_study.md §1-6](docs/reference/portrait_art_style_study.md))
- **사용자에게 "다음으로 실행할까요?" 라고 묻지 않는다** — 추천만 적고 끝낸다

## 사용자 요청: $ARGUMENTS

---
*마지막 업데이트: 2026-09-06 (최초 작성 — 팔라딘·궁수 발주 세션의 실측값(어깨폭 71~75% · 몸 시작 78~89% · 두상 57~67% · 머리폭/어깨폭 70~73% · 색 42~62 · 경계 8~19%)과 실패 패턴 13종, 키잉 안전 색 판정을 스킬로 묶음. 사용자 지시)*
