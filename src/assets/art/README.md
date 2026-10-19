# 아트 자산 (src/assets/art/)

`backgrounds/` · `faces/` · `icons/`(+ 원본 `icons_source/`) · `buildings/` · `fx/`(+ 원본 `fx_source/`) 는 모두 신규 아트가 직접 들어가는 활성 폴더다.
⚠ **계승 포크 정책이 걸리는 것은 `backgrounds/source/pixel/` 에 남은 계승 원본 셋뿐이다**(101 · 102 · `town`) — 데이터 CSV(`src/data/inherited/`)와 같은 정책으로 **원본 SSOT 는 TheSevenRPG 에 있고 여기 것은 재동기화 가능한 사본**, 읽기 전용(CLAUDE.md 규칙 3). 나머지는 다시 뽑아 덮어써도 된다.
**세 폴더가 같은 모양이다** [2026-09-16] — 게임이 읽는 그림 = 묶음 폴더/id(`backgrounds/<스타일>/background_stage_<id>.webp` · `faces/<스타일>/monster/<idx>.webp` · `icons/items/item_base/<base_id>.webp` …) · 손 안 댄 원본 = `source/` · id 없는 여분 = `unused/`. ⚠ 아이콘만은 원본 · 여분이 **폴더 밖** `icons_source/` 에 있다 (아래 「아이콘 — 원본과 설치본」).
**스타일 축을 갖는 것은 `backgrounds/`(2026-09-16) · `faces/`(2026-08-30) 둘**이고 `icons/` 는 없다(2026-09-03).

## backgrounds/

| 자리 | 쓰는 곳 |
|---|---|
| `gpt/` | **GPT 스테이지 배경 25장(Ch1~Ch5)** — 설정·도감의 `gpt` 버튼으로 초상과 함께 선택한다. 1~3장은 새 그림 15장, 4~5장은 먼저 만든 10장을 그대로 복사했다. 원본·프롬프트는 `source/gpt/` (ADR-0632) |
| `illustrate/` | **스테이지 배경 설치본 — 일러스트 스타일** 25장(Ch1~Ch5 전부). **`BG_STYLES` 첫 항목 = 정식** [2026-09-16 · ADR-0152] · `background_stage_101.webp` 은 **로그인 첫 화면 배경도 겸한다** — 로그인은 스타일 설정 이전이라 CSS 가 이 폴더를 직접 박는다(거점 `pixel/town.webp` 와 같은 예외 · 2026-09-18 사용자 지시) |
| `pixel/` | **스테이지 배경 설치본 — 도트 스타일** 15장(Ch1~Ch3) + `town.webp`(앱 전역 배경 · 한 장 뒤 하나뿐 — 탭 패널은 안 깐다 · ADR-0110). **비교용으로 남긴다**(`?bg=pixel`) · 거점 배경은 스타일을 안 타고 늘 여기서 읽는다 |
| `explore_world.webp` | **탐험 탭 — 세계지도 한 장 · 일곱 챕터가 구간** [2026-10-08 사용자 지시 · ADR-0537] ⚠ 스테이지 배경이 아니라 스타일 축을 안 탄다 (아래) |
| `explore_world_mask/<챕터 id>.png` | **탐험 지도 — 잠긴 챕터 구간의 막 모양** [2026-10-08 · ADR-0543] — 그림과 같은 크기의 알파 그림(땅만 · 물은 안 든다). `python scripts/build_explore_masks.py` 가 짓는다 (아래 「구간 마스크」) · **게임은 안 읽는다** — 아래 조각의 재료다 |
| `explore_world_locked/<챕터 id>.webp` | **탐험 지도 — 잠긴 구간에 얹는 「빛 바랜 땅」 조각** [2026-10-09] — 그림을 회색 · 어둡게 칠해(CSS `grayscale(.85)` · `brightness(.48)` 과 같은 값) 그 장의 마스크로 잘라 **구간 크기로** 굽는다(장당 약 400×400 · 20KB 안팎). `python scripts/build_explore_locked.py` 가 짓고 조각 자리(`tile` %)를 찍는다 → `mock.js:EXPLORE_REGIONS` 에 옮긴다. 실행 중 필터 · 마스크를 안 돌리려고 굽는다(탭이 늦게 켜졌다) — **그림 · 마스크를 바꾸면 다시 돌린다** |
| `explore_chapter_1.webp` | **지금은 아무도 안 읽는다** [2026-10-08] — 09-04 의 챕터 1 지도. 세계지도가 대체했고 파일은 남겨 둔다 (아래 「옛 챕터 1 지도」) |
| `login.webp` | **지금은 아무도 안 읽는다** [2026-09-18 사용자 지시] — 로그인 화면이 스테이지 1-1 그림(`illustrate/background_stage_101.webp`)을 그대로 깔게 바뀌었다. 원본은 `source/illustrate/Gemini_Generated_Image_v1efev1efev1efev.png`(성벽에 일곱 깃발)이고, 크롭 없이 RGB WebP q92 로 설치해 둔 사본이 남아 있다 |
| `source/pixel/` · `source/illustrate/` · `source/gpt/` | **생성 원본** — 게임이 안 읽는다. 설치본은 여기서 게임용 비율로 잘라 만든다. 기존 Gemini 원본은 워터마크 띠도 제외한다 (아래) |

파일명의 숫자는 `stage.csv` 의 `chapter * 100 + stage_num` 이다 — 같은 스테이지의 세 구간은 배경 한 장을 공유한다(`stage_id` 는 구간까지 포함한 네 자리).
**스타일 하나 = 폴더 하나** — 화면은 `mock.js:bgDir()` 이 고른 폴더 **하나만** 읽는다. 설정·도감의 아트 버튼과 `?face=`가 초상·배경을 함께 고른다: `gemini` → `illustrate/`, `gpt` → `gpt/`. 배경만 비교하려면 `?bg=illustrate|gpt|pixel`로 재정의한다. URL·저장값의 우선순위는 [SCREEN_DESIGN §10](../../../docs/client/SCREEN_DESIGN.md), 결정은 ADR-0632다.
**한 스타일이 전 스테이지를 다 갖출 필요는 없다** — 없는 자리는 CSS 그라디언트로 폴백한다(`.arena` 기본 배경). **일러스트와 GPT는 각각 챕터 1~5 스물다섯 장, 도트는 챕터 1~3 열다섯 장을 갖췄다. 챕터 6~7은 아직 없다.**
⚠ **화면은 `source/` 원본을 직접 안 읽는다** [2026-09-11 사용자 지시] — 오른쪽 아래 생성기 워터마크(✦) 띠를 잘라 낸 설치본을 읽는다(아래 레시피). 계승 원본은 재동기화 사본으로 `source/pixel/` 에 그대로 둔다.

### GPT 배경 원본과 재내보내기 [2026-10-15]

`backgrounds/source/gpt/background_stage_<id>.png`는 챕터 1~5의 생성 원본 25장이다. **내장 image_gen**으로 만든 1~3장 새 그림 15장과 앞서 생성한 4~5장 10장을 보관한다. Gemini 원본·설치본(`source/illustrate/`·`illustrate/`)과 분리해 관리한다.

게임용은 `backgrounds/gpt/`의 **1376×615 RGB WebP q92**. `python scripts/build_gpt_backgrounds.py`로 원본 위쪽을 같은 비율로 잘라 축소한다. `--chapters 1 2 3`처럼 필요한 챕터만 내보낼 수도 있다. 색 보정은 하지 않는다. 원본은 바꾸지 않는다.

스토리의 기준은 `stage.csv:story_kr`이며, 원고와 이름이 갈린 곳도 CSV를 따른다. 103의 첫 생성본에 섞인 설경은 편집으로 제거했고 최종본만 설치했다. 303은 계약서·봉인·보물 상자가 있는 실내로 만들었다.

- 프롬프트: [`ch1_ch3_prompts.json`](backgrounds/source/gpt/ch1_ch3_prompts.json) · [`ch4_ch5_prompts.json`](backgrounds/source/gpt/ch4_ch5_prompts.json).
- 전체 25장 미리보기: [`gpt_all_chapters_preview.jpg`](backgrounds/source/gpt/gpt_all_chapters_preview.jpg).
- 기존 그림과 비교: [`chapter_1_comparison.jpg`](backgrounds/source/gpt/chapter_1_comparison.jpg) · [`chapter_2_comparison.jpg`](backgrounds/source/gpt/chapter_2_comparison.jpg) · [`chapter_3_comparison.jpg`](backgrounds/source/gpt/chapter_3_comparison.jpg).

### ⚠ 탐험 지도는 스테이지 배경이 아니다 [2026-09-04 사용자 지시 · 자리 개정 2026-09-16 · 세계지도 2026-10-08]

`explore_world.webp` 는 스타일 폴더 옆 **루트에 혼자 선다** — 스테이지 배경과 성격이 다르다:

- **스타일 축이 없다** — 세계지도는 한 장이고 도트/일러스트로 갈릴 것이 아니다. 그래서 `backgrounds/` 루트다
- **픽셀아트가 아니다** — 굵은 외곽선의 카툰 지도라 화면에서 `image-rendering` 을 **아예 안 건다**
  (`.ex-map` — `src/ui/style.css`). 스테이지 배경은 반대로 `--bg-render` 로 늘 건다
- **챕터 구간이 그림에 묶여 있다** — 막 모양은 `explore_world_mask/<챕터 id>.png`(아래 「구간 마스크」) · 자물쇠 자리는 `src/ui/mock.js:EXPLORE_REGIONS` 의 `at` · 크기는 `EXPLORE_WORLD_SIZE`. **그림을 바꾸면 셋을 같이 다시 잡는다**

#### 세계지도 — 내용과 규격 [2026-10-08 사용자 지시]

**Codex(ChatGPT 로그인)로 세 장씩 뽑아 골랐다** — 옛 챕터 1 지도(아래)를 화풍 앵커로 넘겼다. 첫 판(3:2 · 잔 묘사가 촘촘)은 같은 날 사용자 지시(「화면이 가로로 더 길어서 가득 차야」 · 「그림이 지금 너무 디테일해」 · ADR-0540)로 갈았다. 둘째 판 지시문의 요점 — **앵커보다 더 단순하게**(큰 덩어리 · 바탕색 하나 · 그림자 한 톤 · 잔돌 · 잔나무 금지) · **땅은 가운데 70% 띠에만**(위아래 15% 는 빈 바다 — 잘라 낼 자리) · 대륙이 좌우 끝까지 · 땅마다 동굴 · 폐허 · 마차 정확히 하나씩 · 글자 없음. 셋 중 땅 덩어리가 가장 크고 강줄기 경계가 가장 또렷한 것을 골랐다.

- **배치 — 일곱 땅이 가로로 늘어서고 길 하나가 지그재그로 잇는다**: 1 왼쪽 아래 불타는 전장(인간의 땅 — 불탄 농지 · 목책 마을) · 2 왼쪽 위 뒤틀린 숲 · 3 가운데 왼쪽 아래 황금의 사막 · 4 가운데 위 망각의 동토 · 5 가운데 오른쪽 아래 심연의 동굴(거대한 함몰) · 6 오른쪽 위 타락한 궁전 · 7 오른쪽 끝 높은 산의 신의 폐허 (`src/data/chapter.csv`)
- **길은 1 → 7 한 줄** [2026-10-09 사용자 「챕터 순서대로 길이 이어졌으면」 · ADR-0569] — 마을에서 출발해 숲 다리 · 사막 다리 · 동토 계단 · 심연 다리 · 궁전 계단 · 산 다리로 건너 신전에서 끝난다. 처음 판의 길은 세 토막이었고 1 → 3 지름길이 있었다. **원본을 입력으로 준 Codex 편집**(`-i source/explore_world.png` · 「길만 바꾸고 나머지는 그대로」)으로 고쳤다. 첫 편집에서 빠진 연결은 그 결과를 다시 입력으로 줘서 메웠다(두 번). 결과는 원본과 픽셀이 정렬돼 지점 자리(`spots`) · 자물쇠 자리(`at`)가 그대로 맞는다. 다만 편집이 그림을 살짝 푸르게 틀어 **채널별 선형 보정**(바뀌지 않은 픽셀로 맞춘 gain · offset)으로 원본 색에 맞췄다
- 땅마다 **동굴 · 폐허 · 상단 마차**가 하나씩 서 있다 — 기획 논의 중인 탐험 자리의 그림 자리다
- **글자는 한 자도 없다** — 라벨 · 자물쇠는 UI 가 얹는다(CLAUDE.md 규칙 6)
- **규격 1536×714 (2.15:1) — 지도 칸(1600×800 에서 약 1234×575)을 가로로 가득 채우는 비** — Codex 는 3:2 로만 내므로 원본 `source/explore_world.png`(1536×1024 RGB PNG 약 2MB)에서 **위 155 px 부터 714 px** 를 잘라 **WebP q88 · method 6**(약 220KB). Codex 그림엔 생성기 워터마크가 없다:

```python
from PIL import Image
im = Image.open(src).convert('RGB')
im.crop((0, 155, 1536, 155 + 714)).save(dst, 'WEBP', quality=88, method=6)
```

#### 구간 마스크 [2026-10-08 사용자 「그 가둬주는 명암을 좀 섬세하게 따봐」 · ADR-0543]

잠긴 챕터 구간의 막은 챕터마다 알파 그림 한 장(`explore_world_mask/<챕터 id>.png` · 1536×714 · 장당 약 20~30KB)이 모양을 낸다. **`python scripts/build_explore_masks.py`** 가 원본 PNG 를 설치본과 같이 잘라 짓는다(`--overlay <out.png>` 를 주면 구간을 색칠한 확인 그림도 낸다). 그 스크립트가 든 규칙:

- **바다** = 가장자리에 닿은 바다색 덩어리 · **물** = 바다와 이어진 고채도 파랑(강 · 해안 테두리) + 다리에 끊긴 강 토막(두 땅의 씨앗 경계를 따라 흐르는 것) — 둘 다 어느 구간에도 안 든다. 얼음 호수 · 오아시스는 한 땅 한가운데라 그 땅에 남는다
- **땅** = 씨앗 다각형(스크립트의 `SEEDS` · 손으로 찍은 대략)을 안쪽으로 깎은 곳에서 출발해 색 경계(강 · 벼랑 · 외곽선)까지 워터셰드로 채운다
- **동토의 청회색 벼랑면은 동토에 붙인다** — 색 경계만 보면 벼랑의 윗선이 가장 세서 아래 땅(사막)에 붙는다
- 땅을 다듬고 구멍을 메운 **뒤에** 물을 뺀다 — 거꾸로면 다리로 막힌 강 토막이 「구멍」으로 메워진다
- ⚠ 이 기계에선 scipy 가 anaconda DLL 을 PATH 에 붙여야 뜬다 — `PATH="/c/Users/user/anaconda3/Library/bin:$PATH" python scripts/build_explore_masks.py` · anaconda 가 없는 기계는 `python -m pip install --user scipy` 로 넣으면 그냥 뜬다

#### 옛 챕터 1 지도 — 내용과 규격 [재작성 2026-09-04 사용자 지시 · 2026-10-08 부터 안 읽는다]

**1판은 폐기했다 — 「지옥」으로 그려졌다.** 챕터 1 은 지옥이 아니라 **아우레아(인간의 땅)** 이고, 화염은 사탄의 군세가 지른 것이지
땅이 용암인 게 아니다 (`docs/game_design/story/prologue.md` 씬 4·5). 2판은 **불타는 농지 · 강 · 침엽수림**으로 다시 그렸다.

담은 자리 **일곱** — 배치는 아래가 안전하고 위로 갈수록 위험하다:

| 자리 | 정체 | 출처 |
|---|---|---|
| 가운데 | **마을** (목책 · 초가 · 우물 · 불탄 집 몇) | 귀환·회복 지점 (`base_expedition_design.md` §1-1) · 프롤로그 씬 4 |
| 왼쪽 아래 | **잿불 갱도** (광석 수레가 선 갱도 어귀) | `src/data/mine_node.csv:ember_pit` (`unlock_chapter=1`) |
| 오른쪽 아래 | **이름 없는 동굴** | ⚠ 의도적으로 안 붙였다 — 탐험 노드 자리인데 기획 백지 |
| 왼쪽 가운데 | 핏빛 교전지대 | `src/data/stage.csv:102` |
| 오른쪽 가운데 | 원한의 묘지 (화염이 없는 유일한 자리 — 언데드) | `stage.csv:103` |
| 왼쪽 위 | 파멸의 진영 (마귀 야영지) | `stage.csv:101` |
| 오른쪽 위 | **사탄의 제단** — 화염의 고리를 두른 유일한 자리 · 가장 크다 | `stage.csv:104` (챕터 보스) |

**글자는 한 자도 없다** — ko/en 라벨은 UI 가 그림 위에 얹어야 하기 때문이다(CLAUDE.md 규칙 6).

**규격 2752×1211 (2.27:1) · 397KB.** 생성 원본은 2752×**1536** RGBA PNG 6.5MB 였고,
**아래 띠(생성기 워터마크 자리)를 잘라 낸 뒤** 같은 폴더 레시피(WebP q88)로 변환했다 — 가로·색은 안 건드렸다:

```python
from PIL import Image
Image.open(src).convert('RGB').crop((0, 0, 2752, 1211)).save(dst, 'WEBP', quality=88, method=6)
```

자를 수 있었던 것은 배치를 위쪽 70% 안으로 몰아 그리게 했기 때문이다. 화면비 제약(가로로 긴 비)은 세계지도부터 없다 — 지도가 남는 세로에 맞춰 선다 (`src/ui/README.md`).

#### 후처리 — 분노 오염 그라디언트 [2026-09-04 사용자 지시]

생성된 그림은 **낮처럼 밝고 죄종색이 없었다.** 「어둠 위에 죄악의 색이 오염원으로 깔린다」(`docs/game_design/story_chapter_design.md` §2)를 그림에 넣기 위해 저장 전에 한 번 등급을 매긴다:

```python
from PIL import Image, ImageEnhance
WRATH = (0xe0, 0x30, 0x30)                       # ui/mock.js:SINS.wrath
lut = [min(255, int(255*((i/255)**1.55))) for i in range(256)] * 3
im = ImageEnhance.Color(im.point(lut)).enhance(0.88)   # 중간톤만 눌러 화염(밝은 값)은 남긴다
R, G, B = im.split()                                    # 파랑을 빼 흙을 붉은 쪽으로
f = lambda c, k: c.point(lambda v: min(255, int(v*k)))
im = Image.merge('RGB', (f(R,1.04), f(G,0.89), f(B,0.82)))
mask = Image.linear_gradient('L').resize(im.size).point(lambda v: int(56 - 46*(v/255)))
im = Image.composite(Image.new('RGB', im.size, WRATH), im, mask)   # 위 22% -> 아래 4%
```

**세로 그라디언트인 것이 핵심이다** — 오염이 **사탄의 제단(위)에서 번져 마을(아래)로 옅어진다.**
균일하게 얹으면 오염원이 아니라 렌즈 필터로 보이고, 마을이 「오염에서 가장 먼 자리」라는 읽기도 죽는다.
묘지의 차가운 회색은 옅은 아래쪽이라 살아남아 언데드 스테이지가 주변과 구분된다.

⚠ **원본 PNG 은 이미 지웠으므로 이 등급은 WebP 위에 한 번 더 인코딩된 것이다**(q88 2세대). 플랫 카툰이라 눈으로는 차이가 없지만, 다시 손볼 일이 있으면 **생성기에서 다시 뽑는 편**이 낫다.

⚠ **폴더를 가르는 편이 나을 수 있다** — 신규 지도가 챕터 7장까지 늘면 스타일 폴더(`pixel/` · `illustrate/`) 옆 루트에 스테이지 배경이 아닌 그림 일곱 장이 쌓인다.
`maps/` 로 떼는 선택지는 열려 있다(미결).

## ⚠ 데이터와 달리 여기는 "무변환"이 아니다 — 포맷만 변환했다

원본은 2752×1536 **32bit RGBA PNG**로 4장 합계 18.2MB였다. 알파 채널이 전부 불투명(=쓰이지 않음)인데도
트루컬러로 저장돼 있어 용량 대부분이 낭비였다.

**해상도·크롭·색은 그대로 두고 컨테이너만 WebP로 바꿨다 → 888KB (95% 감소).**

| | PNG 원본 | WebP q88 |
|---|---|---|
| stage_101 | 6.27MB | 241KB |
| stage_102 | 5.77MB | 349KB |
| ~~stage_103~~ | 4.52MB | **삭제됨** — 신규 아트로 대체 (2026-09-15) |
| town | 1.61MB | 105KB |

- 팔레트 PNG(256색)도 검토했으나 2.4MB에 PSNR 38.4dB로 **WebP보다 10배 크고 화질도 낮아** 탈락
- WebP q88 = PSNR 41.7dB. 100% 크롭 비교에서 픽셀 블록 경계가 그대로 보존되는 것을 확인했다
- 화면에서는 항상 **축소** 출력(2752 → 최대 ~1080px)이라 손실이 더 줄어든다

### 재동기화 방법

원본이 갱신되면 PNG를 다시 복사한 뒤 같은 레시피로 변환한다:

```python
from PIL import Image
Image.open(src_png).convert('RGB').save(dst_webp, 'WEBP', quality=88, method=6)
```

`convert('RGB')` = 안 쓰이는 알파 제거. 해상도는 건드리지 않는다.
⚠ **재동기화한 뒤에는 `pixel/` 설치본도 다시 만든다** — 화면이 읽는 것은 그쪽이다 (아래 레시피).

---

## backgrounds/&lt;스타일&gt;/ — 워터마크 띠를 잘라 낸 설치본 [2026-09-11 사용자 지시 · 스타일 폴더로 개편 2026-09-16]

**화면이 읽는 배경은 이 폴더다** — `ui/mock.js:bgDir()`(`stageBg`). 파일명은 `source/` 원본과 같다(스테이지 id 1:1 그대로).
⚠ `ui/style.css:#stage::before`(거점)만 예외로 `pixel/town.webp` 를 **직접 박는다** — 거점 그림은 계승 도트 한 벌뿐이라 스타일을 안 탄다.

아래 표는 `pixel/` 이다.

| 파일 | 원본 → 사본 | 용량 |
|---|---|---|
| `background_stage_101.webp` | 2752×1536 → **2752×1360** | 241KB → 226KB |
| `background_stage_102.webp` | 2752×1536 → **2752×1360** | 349KB → 339KB |
| `background_stage_103.webp` | **신규** 1376×768 → **1376×615** | 112KB |
| `background_stage_104.webp` | **신규** 1376×768 → **1376×615** | 110KB |
| `background_stage_105.webp` | **신규** 1376×768 → **1376×615** | 116KB |
| `background_stage_201.webp` | **신규** 1376×768 → **1376×615** | 134KB |
| `background_stage_202.webp` | **신규** 1376×768 → **1376×615** | 214KB |
| `background_stage_203.webp` | **신규** 1376×768 → **1376×615** | 133KB |
| `background_stage_204.webp` | **신규** 1376×768 → **1376×615** | 131KB |
| `background_stage_205.webp` | **신규** 1376×768 → **1376×615** | 134KB |
| `background_stage_301.webp` | **신규** 1376×768 → **1376×615** | 114KB |
| `background_stage_302.webp` | **신규** 1376×768 → **1376×615** | 134KB |
| `background_stage_303.webp` | **신규** 1376×768 → **1376×615** | 177KB |
| `background_stage_304.webp` | **신규** 1376×768 → **1376×615** | 142KB |
| `background_stage_305.webp` | **신규** 2752×1536 → **2752×1230** | 435KB |
| `town.webp` | 1376×768 → **1376×680** | 105KB → 102KB |

**`illustrate/` 는 스물다섯 장이다** — 챕터 1~3(101~305)의 원본은 전부 2752×1536 이라 **50% 로 줄인 뒤 아래 20% 를 잘라** 1376×615 로 맞췄다(WebP q92 · 86~232KB). 생성기 ✦ 는 이 열다섯 장 다 잘려 나가는 띠 안에 있었다(가장 높은 104 도 80% 선 아래). 챕터 4~5 열 장도 같은 설치 규격이며, 생성 방식과 레시피는 아래와 같다.

### 챕터 4~5 일러스트 배경 [2026-10-15]

`stage.csv:story_kr` 를 기준으로, 챕터 1~3 원본 둘(`201` · `305`)을 그림체 기준으로 첨부해 **Gemini 웹**으로 스테이지마다 한 장씩 생성했다(「렌더링만 따르고 색 · 소재는 따르지 말 것」 · 챕터 공통 블록 + 스테이지 블록). 원고와 게임의 이름이 다른 곳은 CSV 를 따른다. 보스는 별도 전투 요소이므로 배경에는 장소와 사물로 이야기를 담았다. GPT 판은 `gpt/` · `source/gpt/` 에 따로 있다.

| id | 장소 | 이야기의 시각 요소 |
|---|---|---|
| 401 | 얼어붙은 평원 | 떠나지 못한 마을 · 짐을 실은 채 선 수레 · 멀리 얼어 선 주민 형상 |
| 402 | 빙하 요새 | 요새 안 얼어붙은 호수 · 빈 의자와 미끼 없는 낚싯대 · 손 안 댄 도끼 |
| 403 | 영구동결의 심부 | 바람 없는 협곡 · 얼어붙은 회오리 · 빳빳하게 늘어진 깃발 · 얼음에 박힌 검은 깃털 |
| 404 | 잠든 빙궁 | 닫힌 문 · 얼음에 갇힌 양귀비 · 얼어붙은 촛불 · 고요한 안개 |
| 405 | 벨페고르의 동결왕좌 | 높은 단의 빈 왕좌에서 퍼지는 얼음 |
| 501 | 탐식의 입구 | 동토의 서리 · 버려진 쇠뇌 · 빵 · 삼키는 동굴 |
| 502 | 맥동하는 미로 | 수축하는 듯한 통로 · 벽에 삼켜진 사물 · 거인의 발자국 |
| 503 | 소화의 심연 | 가라앉은 석상과 건축 잔해 · 소화액 웅덩이 |
| 504 | 연회의 대문 | 조금 열린 문 · 세 개의 빈 먹이 그릇 · 쇠사슬 |
| 505 | 바알제붑의 연회장 | 높은 단의 식탁과 빈 의자 · 끝없이 쌓이는 빈 식기 |

- 원본: `backgrounds/source/illustrate/background_stage_{401~405,501~505}.png` — 생성 결과를 그대로 보관한다.
- 설치본: `backgrounds/illustrate/` 의 같은 이름 WebP — **1376×615 · RGB · q92 · method 6**, 열 장 합계 약 1.56 MiB. 원본 위쪽에서 가로세로 비율을 유지해 자른 뒤 축소하며, 색은 보정하지 않는다. 아래 여백 약 20% 가 제외된다. 생성기 ✦ 는 열 장 모두 높이 약 84% 로 잘려 나가는 띠 안에 있다.
- 생성 지시문: [`backgrounds/source/illustrate/ch4_ch5_prompts.json`](backgrounds/source/illustrate/ch4_ch5_prompts.json). 402 · 503 은 세 번째 판이다(402 는 밝기 · 소품 높이, 503 은 가운데 선 석상 · 벽 색을 프롬프트에 못박아 다시 뽑았다).
- 재내보내기: `python scripts/build_ch4_ch5_backgrounds.py` — 위 열 장만 내보내고 [`ch4_ch5_preview.jpg`](backgrounds/source/illustrate/ch4_ch5_preview.jpg) 비교 시트를 만든다.
- `stage.csv` 의 챕터 4·5 **26개 구간 모두 `bg=1`**. `stageBgOf` 가 같은 스테이지의 배경을 공유한다. 도트 비교 스타일의 챕터 4·5 파일은 없으므로 기존 그라디언트 폴백을 쓴다.

**왜** — 계승 원본 넷 모두 **오른쪽 아래에 생성기 워터마크(✦)가 박혀 있다**(끝에서 가로 · 세로 약 64~160px · `town` 은 절반인 32~80px). 화면은 그림을 `cover` 로 채우므로 **틀의 비율이 워터마크를 가리거나 드러낸다** — 2026-09-11 넓게 보기 아레나(약 2.66:1)는 아래가 12% 잘려 우연히 가려졌고, 나눔 보기(약 1.97:1)는 3% 만 잘려 드러났다(사용자 제보). `town` 은 상점 · 선술집 패널 오른쪽 아래에 어두운 막 아래로 희미하게 보였다.

**버린 안**
- **CSS 로 가리기**(배경을 크게 깔아 아래 띠를 늘 박스 밖으로) — 그림을 쓰는 자리마다(아레나 · 전역 배경 · 마을 패널 · 편성 행) 따로 맞춰야 하고, 배치가 새로 생길 때마다 다시 드러나는지 봐야 한다
- **워터마크만 덮어 칠하기**(그림 전체를 살린다) — 102 의 사선 무늬 · `town` 의 돌바닥 위라 덮은 티가 난다
- **원본을 고치기** — 계승 원본은 읽기 전용이다(CLAUDE.md 규칙 3). TheSevenRPG 쪽 원본은 **안 고쳤다**

**레시피** — 아래 **11.5%**(1536 → 1360 · `town` 768 → 680)를 버려 워터마크 위 끝에서 16px(`town` 8px) 여유를 두고 WebP q92 로 다시 싼다. 원본이 이미 WebP 라 2세대 인코딩이다(잘라 낸 원본 대비 PSNR 45.7~47.7dB):

```python
from PIL import Image
im = Image.open(src).convert('RGB')                  # backgrounds/source/pixel/<같은 이름>
keep = 1360 if im.height == 1536 else 680
im.crop((0, 0, im.width, keep)).save(dst, 'WEBP', quality=92, method=6)
```

**화면 쪽 맞춤** — 그림이 짧아진 만큼 `background-position` 을 옮겨 **원본에서 보이던 띠를 그대로** 보인다: 아레나 `center 62%` → **`95.2%`** · 편성 행(`.zone.has-bg`) `60%` → **`69.3%`**. 실측 1600×800 — 넓게 보기 아레나 · 편성 행의 전후 평균 차이 **0.29 · 0.10 / 255**(같은 그림). 나눔 보기는 사본의 세로가 다 보이고 ✦ 가 사라졌다. 마을 패널(`center 34%`)은 막 아래라 값을 안 옮겼다(전후 1.44 / 255).

- ⚠ **잃은 것은 그림 아래 11.5% 띠**다 — 넓게 보기 · 편성 행에서는 원래 안 보이던 자리다
- ⚠ 그림을 새로 들이면 **워터마크 자리부터 확인한다** — 같은 생성기면 크기에 비례해 같은 구석이다(`explore_chapter_1` 은 2026-09-04 에 같은 이유로 아래 띠를 잘랐다 — 위 「내용과 규격」)

### 신규 배경 — Ch1-3~5 · Ch2 · Ch3 전부 [2026-09-15 사용자 지시]

Gemini 로 새로 뽑은 배경 열셋이다. 원본은 `backgrounds/source/pixel/background_stage_<id>.png`(RGBA · 1376×768 이 기본이고 305 만 2752×1536 · 장당 1.4~6.9MB)이고, 설치본은 **아래 20% 를 잘라** WebP q92 로 싼 것이다. 잘라 낸 자리는 대부분 생성기가 깔아 둔 평평한 어두운 띠다(104 만 바닥 돌길 끝자락이 들어갔다).

```python
from PIL import Image
im = Image.open(src_png).convert('RGB')                        # backgrounds/source/<같은 이름>.png
im.crop((0, 0, im.width, 615 * im.height // 768)).save(dst, 'WEBP', quality=92, method=6)   # 768 → 615 · 1536 → 1230
```

- **자르는 양이 계승과 다르다** — 워터마크(✦)가 **y 623~673**(아래에서 95~145px)에 박혀 있어 계승 비율(아래 11.5% = 680 까지)로는 **그대로 남는다.** `town` 과 같은 「워터마크 위 8px 여유」를 따라 **615 까지** 남겼다
- ⚠ **화면비 · 해상도가 계승과 다르다** — 사본 1376×615 = **2.24:1**(계승 2.02:1) · 가로는 계승의 절반이다(305 만 생성기가 2752×1536 으로 내놓아 사본도 2752×1230 — 비율은 같다). `cover` 라 깨지지는 않지만 넓게 보기 아레나(`center 95.2%`)가 보여 주는 띠가 원본의 **12~79%** 다(계승은 20~87%). 픽셀아트라 확대는 안 했다
- **옛 계승 Ch1-3(원한의 묘지)은 지웠다** — 「너무 픽셀 구조」라 1 · 2 스타일로 다시 뽑았다. CLAUDE.md 규칙 3(`backgrounds/` 읽기 전용)의 예외이고 사용자 지시다. git 에 남아 되살릴 수 있다
- **`stage.csv:bg` 는 그림이 선 스테이지만 1 이다** — 104 · 105 · 201~205 · 301~305 를 올렸다. ⚠ `ui/data.js:stageBgOf` 의 주석은 아직 이 칸을 「계승 자산이 있는 스테이지」라고 적는다
- 발주 프롬프트는 **1 · 2 를 스타일 기준으로 첨부**하고 「타일셋 금지 · 가운데 비우기 · 글자 금지」를 못박은 판이다(대화에서 만들었다 — 문서화 미정). 2장부터는 「첨부의 렌더링만 따르고 색 · 소재는 따르지 말 것」과 챕터 공통 블록(세계 · 죄종 색이 스테이지 1 → 5 로 짙어진다)을 더했고, 비우는 띠를 실측에 맞춰 **위 12% · 아래 20%** 로 고쳤다. ⚠ 실내 스테이지는 공통 블록의 사막 문장(우물 · 야자수)이 새어 들어가므로 스테이지 블록의 AVOID 로 막는다 — **303 은 보물고 안에 야자수 · 우물이 든 채로 설치됐다.** 스테이지 블록에 색을 누르는 말(muted · dusty 등)을 넣으면 그림체가 튄다(305 는 두 번 다시 뽑았다). 1 · 2 와 갈렸던 옛 3 의 문제는 픽셀 크기가 아니라 **판석이 떠 있는 타일셋 짜임**이었다

---

## buildings/ — 건설 탭의 건물 그림 [신설 2026-09-23 사용자 지시]

```
buildings/
├── <building_id>.webp   ← 게임이 읽는다 — 파일명 = building.csv:building_id · 목록은 ui/mock.js:BUILDING_IMAGES
│     expedition · command · forge · tavern · training · shop · resource · explore · codex · storage · library
├── source/
│   ├── sheet_01_buildings.png   ← 원본 시트 2752×1536 · 4×3 = 12칸 · 칸 사이 검은 홈 — 게임이 안 읽는다
│   ├── library.png              ← 도서관 원본 1448×1086(4:3 한 장) — 게임이 안 읽는다
│   └── laboratory.png           ← 연구소(`resource`) 원본 1448×1086(4:3 한 장) — 게임이 안 읽는다
└── unused/
    ├── codex_alt.webp   ← 11번 칸(도감 두 번째 판) · id 없는 여분
    └── resource_mine.webp ← 옛 자원 건물(갱도) — 2026-10-18 연구소로 바뀌며 내렸다
```

- **그림체는 배경(`backgrounds/illustrate/`)과 같다** — 발주 때 `illustrate/background_stage_101.webp` · `102.webp` 두 장을 첨부하고 「렌더링만 따르고 색 · 소재는 따르지 말 것」으로 열었다(배경 발주와 같은 줄). 프롬프트는 대화에서 만들었다 — 위에 공통 형태(시트 규격 · 각도 · 아래 1/4 빈 땅 · 같은 저녁 하늘 · 글자 금지), 아래에 번호 목록(칸 번호 = 건설 탭 부지 순서)
- **칸 → 파일** — 1~10 번 칸이 부지 순서(원정 · 지휘 천막 · 제련소 · 선술집 · 훈련장 · 상단 · 자원 · 탐험 · 도감 · 창고)다. 11 = 도감 여분(`unused/codex_alt`) · 12 = 자원 여분인데 **생성기 ✦ 가 박혀** 안 잘랐다(시트에만 남는다)
- **자르기** — 검은 홈을 실측(열 평균 밝기 < 30)으로 찾고 칸 안쪽 3px 을 더 걷어 홈 가장자리를 뺐다 → 장당 **666~667 × 494~495**(약 4:3). 화면의 부지는 3:2 라 `cover` 가 위아래를 조금 자른다(`center 40%`) — **카드 비율이 바뀌어도 다시 자를 필요가 없게** 칸을 통째로 뒀다
- **인코딩** — WebP q90 · 장당 29~51KB. ⚠ 이 PC 에 Python 이 없어 **Edge 캔버스(`toDataURL('image/webp', 0.9)`)로** 자르고 쌌다 — 다른 폴더의 PIL 레시피와 도구가 다르다. 다시 자를 땐 어느 쪽이든 같은 좌표(홈 안쪽 3px)면 된다
- **도서관(`library`)는 따로 한 장이다** [2026-09-30] — 시트를 첨부해 「그 시트의 새 칸 하나」로 발주했다(둥근 돌 탑 · 도감의 기둥 신전 · 11번 목조 팔각과 실루엣을 가른다). 원본이 4:3 한 장이라 자르지 않고 **667×500 으로 줄여**(PIL Lanczos) WebP q90 으로 쌌다 — 시트 칸과 폭이 같다
- **연구소(`resource`)도 따로 한 장이다** [2026-10-18 사용자 「이미지가 필요한건 모두 codex로 그려」] — 자원 건물이 연구소가 되며(GAME_DESIGN §9 10-18) 갱도 그림을 `unused/resource_mine.webp` 로 내리고 새로 그렸다. Codex 내장 이미지 생성에 **도서관 그림을 화풍 기준으로 첨부**(`-i`) — 돔 지붕 돌 작업장 · 녹색 플라스크 창 · 톱니바퀴와 파이프 · 앞에 광석 드릴 · 통나무 톱 · 약초 온실(채광 · 채집 · 벌목이 저절로 돈다). 도서관과 같이 **667×500 으로 줄여**(PIL Lanczos) WebP q90
- 그림이 없는 건물은 `ui/mock.js:BUILDING_ART` 의 단색 실루엣(SVG)으로 폴백한다 — 건물이 늘면 파일을 넣고 `BUILDING_IMAGES` 에 id 를 더한다

---

## fx/ — 관전 스킬 이펙트 그림

```text
fx/skills/<file>_darktoon.webp  다크 카툰 — 기존 원본·설치본 유지, 기본 그림체
fx/skills/<file>_ink.webp       수묵 — 기존 원본·설치본 유지
fx/skills/<file>_pixel2d.webp   클린 도트 — 기존 원본·설치본 유지
fx/skills/<file>_<style>.webp   새 재료 시안 — papercut / pastel / foil / riso / clay
fx_source/clean_20261017/       보존한 클린 도트 원본·최종 프롬프트·대응표
fx_source/material_20261017/    새 다섯 그림체의 원본 15장·최종 프롬프트·대응표·비교표·검사 기록
fx_source/ink_20261009/         보존한 수묵 원본
fx_source/world_styles_20261012/sheet_darktoon_*.png  보존한 다크 카툰 원본
fx/ui/stage_banner.webp         관전 스테이지 띠의 붓 한 획 — 흰색 + 알파(모양만) · 2026-10-18
fx_source/stage_banner_20261018/ 그 원본(Codex 생성 · 흰 바탕 먹) · 프롬프트 · 안 고른 시안 unused_*
```

**스테이지 띠**(SCREEN_DESIGN §4-2 · ADR-0663)는 그림을 **모양(mask)으로만** 쓴다 — 색은 CSS 가 챕터 죄종 색으로 칠한다. 원본을 갈면 `python scripts/build_stage_banner.py`(먹의 짙기 → 알파 · 먹 둘레로 자르기 · 폭 1600 WebP).

그림체는 `src/ui/skill_art.js:ART_STYLES`, 스킬·움직임·크기는 `SKILL_ART`, 파일 이름은 `artFile`이 기준이다. 새 다섯 방향은 같은 스킬 형태를 서로 다른 재료 표현으로 생성했다. 각 88장, 총 440장의 실제 투명 WebP다. 최종 설치는 `python scripts/build_material_fx.py`, 비교표는 `python scripts/build_material_fx.py --compare`, 브라우저 검사는 `python scripts/verify_material_fx.py`다. 이미지 생성은 내장 imagegen을 사용했다.

클린 도트·다크 카툰·수묵 외의 이전 이펙트 데이터는 설치본·보관본·비교 이미지·생성 프롬프트까지 삭제했다([ADR-0655](../../../docs/client/adr/0655-이펙트는-클린도트-다크카툰-수묵과-서로-다른-재료의-다섯-그림체다.md)). 오래된 발주 문서·스크립트는 과거 기록이며, 삭제된 그림의 재빌드 경로로 사용하지 않는다. 배경·초상·아이콘은 이 정리 범위와 무관하다.

## faces/ — 몬스터 얼굴 아이콘 · **스타일 하나 = 폴더 하나** [2026-08-30]

2026-10-01: 상단 Admin 오른쪽 · 설정에서 `gemini` / `gpt`를 선택한다. 선택한 스타일에 없는 초상은 빈 칸이다. 현재 분류·추가 절차는 [faces/README.md](faces/README.md). 아래 `cartoon` 표기는 분리 전 이력이다.

```
faces/
├── gemini/      ← 기본 스타일 — 영웅 전체 · GPT 분류 외 몬스터
├── gpt/         ← 기존 1-2 · 1-4 초상 10장 + Gemini 초상의 그림체 변형 64장(총 74)
│   ├── hero/<직업id>_<k>.png
│   └── monster/<idx>.png
├── pixel16/     ← 스타일 2 — 16-bit 도트그래픽, 배경 팔레트에 맞춤
│   └── monster/<idx>.png
└── source/      ← **스타일 아님** — 원본 시트 · 생성용 스타일 앵커(구 `example/` · 2026-09-14). 게임이 로드하지 않는다 (faces/source/README.md)
```

`source/` 가 스타일 폴더가 아닌 이유는 **파일명 규칙이 다르기 때문**이다 — `skeleton_archer.png` 처럼 내용으로 이름이 붙어 있고
id 가 아니다. 스타일로 쓰려면 id 로 이름을 바꿔 새 폴더의 `monster/` · `hero/` 에 넣고 `FACE_STYLES` 에 등록한다.

**파일명 규칙은 스타일이 달라도 같다** — `monster/<idx>.png`(숫자는 `src/data/monster.csv` 의 `monster_idx`) · `hero/<직업id>_<k>.png`(장수는 `mock.js:HERO_FACES`).
**정예 전용 초상은 `monster/<idx>_elite.png`** [2026-09-17] — 있는 몬스터만 `monster.csv:face_elite = 1` 이다. 파일 존재를 찔러보지 않고 **그 컬럼이 결정한다** — 0 이면 정예도 기본 `<idx>.png` 를 그대로 쓴다.
그래서 폴더만 갈아 끼우면 얼굴이 통째로 바뀐다.

### 새 스타일 넣는 법 — 두 단계

1. `faces/` 아래 폴더를 만들고 같은 파일명으로 그림을 넣는다 (`faces/<스타일>/monster/1101.webp` · `faces/<스타일>/hero/warrior_1.webp` …)
2. `src/ui/mock.js` 의 `FACE_STYLES` 목록에 그 폴더 이름을 더한다

고르는 순서는 언어와 같다 — URL `?face=<스타일>` → localStorage → **목록의 첫 항목**.
`?face=` 는 localStorage 에 남으므로 한 번 걸면 계속 그 스타일로 돈다. 경로를 조립하는 곳은 `mock.js:faceDir()` 하나다.

**한 스타일이 전 몬스터를 다 갖출 필요는 없다.** 파일이 없으면 그 자리만 **빈 칸**이 되고 나머지는 그대로 나온다
(렌더러가 `<img onerror>` 로 받는다) — 그리는 중인 스타일로도 게임이 돈다.
> **이니셜 폴백은 2026-09-06 에 폐기됐다** (사용자 지시 · SCREEN_DESIGN §5) — 이름 첫 글자를 그림 **밑에** 깔던 규칙이다.
> 몬스터 그림이 배경 투명 PNG 라 그림이 **있어도** 글자가 여백 사이로 비쳤다(영웅 직업 글리프가 09-03 에 같은 이유로 폐기됐다).
> 지금 폴백은 둘 다 글자가 없다: **글자 없는 죄종 색 원판** = `monster.csv:face=0`(그 몬스터는 원래 아트가 없다) · **빈 네모 칸**(관전) = 그 스타일에만 파일이 없다.
> 이름은 호버(`title`)가 든다. 새 스타일을 그릴 때 **무엇이 아직 안 채워졌는지는 빈 칸으로 보인다.**

### pixel16 — 스타일 2 (2026-08-31 까지 기본이었다)

TheSevenRPG 원작 크롭 아트는 폐기(배경 팔레트와 안 맞아 붕 떠 보였다 — `docs/reference/monster_art_prompt.md` §0).
프롬프트 SSOT 의 공통 스타일 블록이 `16-bit pixel art, dark fantasy` 라 폴더 이름을 거기서 땄다.

| 파일 | monster_idx | 몬스터 |
|---|---|---|
| `monster/1101.png` | 1101 | 고블린 척후병 |
| `monster/1102.png` | 1102 | 고블린 전사 |
| `monster/1103.png` | 1103 | 오크 전사 |
| `monster/1150.png` | 1150 | **아바돈** (스테이지 보스) [2026-09-06 신규 — `monster.csv:face` 0 → 1] |
| `monster/1201.png` | 1201 | 인간 보병 |
| `monster/1202.png` | 1202 | 인간 궁수 [2026-09-06 개명 — 구 「인간 창병」] |
| `monster/1203.png` | 1203 | 인간 기사 [2026-09-06 개명 — 구 「트롤 돌격병」 · 베이스도 Troll → Human] |
| `monster/1301~1303.png` | 1301~1303 | 스켈레톤 전사 · 기사 · 마법사 (+ `_elite` 3장) [2026-09-21 새 시트 — 구 「스켈레톤 병사」 셋] |
| `monster/1350.png` | 1350 | 둘라한 |

⚠ **이 표는 2026-09-06 판이라 낡았다** — 살아 있는 대응표는 [faces/README.md](faces/README.md) 다(챕터 2·3 과 정예까지 든다). 여기는 폴백 규칙만 본다.
챕터 1 스테이지 4의 임프 2종 · 청동 수호상 · 몰록은 모두 전용 초상이 있다 [2026-09-25].
없는 얼굴은 **글자 없는 죄종 색 원판**으로 폴백한다 (이니셜 폐지 2026-09-06).

⚠ 원본 파일명은 믿지 말 것 — `public/assets/sprites/monster_1101.png` 는 이름과 달리
**고블린 척후병(1101)이 아니라 스켈레톤 전사** 그림이다. 위 표가 실제 대응이다.

### 규격 (스타일 공통)

- 정사각 PNG. `pixel16` 은 배경이 불투명(단색) — 투명화 미처리. **투명 배경도 된다** (관전은 어두운 그라디언트, 도감은 원형 마스크 위에 얹힌다)
- 원형 마스크는 파일에 굽지 않는다. 도감의 원형 표시는 UI에서 `border-radius: 50%` 로 처리하고, 관전은 네모로 쓴다 — **같은 파일이 두 모양으로 쓰이므로 가장자리에 중요한 것을 두지 않는다**
- **축소 보간은 스타일이 정한다** (2026-09-01) — 얼굴은 늘 원본보다 작게 그려진다(구성 칩 26px ~ 시작 후보 카드 152px). 도트(`pixel16`)는 보간을 **끄고**(`pixelated` — 켜면 도트가 뭉갠다), 손그림(`cartoon`)은 **켠다**(끄면 픽셀을 건너뛰며 샘플링해 선이 끊기고 계단이 진다 — 512를 26px 에 넣으면 20픽셀 중 1픽셀만 남는다). 화면 쪽 구현은 `<html data-face>` + CSS 토큰 `--face-render` **하나**이므로, 스타일을 늘리면 그 토큰에 한 줄만 더한다 (`docs/client/SCREEN_DESIGN.md` §5)
- **해상도는 「가장 큰 칸 × 화면 배율」이 정한다** — 지금 가장 큰 칸이 152px 이라 고해상도(DPR 2)에서 304px 이 필요하다. `cartoon` 의 512는 그 위로 여유가 있는 값이고, **작아 보이는 문제와 깨져 보이는 문제는 원인이 다르다**(후자는 위의 보간)
- **영웅은 여백을 걷어 칸을 채운다 · 몬스터는 안 걷는다** [2026-09-03 사용자 지시] — 아래 「영웅 초상 여백 정규화」

### 영웅 초상 여백 정규화 [2026-09-03 사용자 지시]

생성된 `hero_*.png` 는 투명 여백이 컸다 — 그림이 차지하는 비율이 **가로 57~88% · 세로 74~80%** 라, `object-fit: contain` 인 네모 칸 안에서 인물이 **작게 떠 보였다.** 장마다 여백이 달라 크기도 들쭉날쭉했다(`hero_3` 은 가로 57%).

여백을 걷어 **가로 77~100% · 세로 86~100%** 로 맞췄다. 절차는 **다시 그리지 않는다** — 알파 bbox 로 자르고, 정사각으로 패딩하고, 512 로 되돌린다:

1. `getbbox()` 로 그림의 실제 경계를 얻어 자른다
2. 긴 변을 한 변으로 하는 정사각 캔버스에 얹는다 — **가로는 가운데 · 세로는 아래 붙임**. 흉상이라 어깨가 프레임 바닥에 닿는 것이 초상의 문법이다
3. 512×512 로 되돌린다 (LANCZOS)

⚠ **몬스터(`monster_*.png`)는 건드리지 않았다** — 도감의 `.face` 가 **원형 마스크**(`border-radius: 50%`)라 가장자리가 잘린다. 위 「가장자리에 중요한 것을 두지 않는다」가 그 몬스터 파일들에 걸린 제약이고, 영웅은 어디서나 **네모 칸**(`.hero-face` · 관전 `.sprite`)뿐이라 그 제약이 없다. 몬스터의 여백은 원래도 작다(87% 안팎).

원본을 되살려야 하면 `source/` 가 그림의 SSOT 다 — `cartoon/` 것은 이름만 바꾼 사본이고, 위 절차를 거친 것은 **사본 + 여백 정규화**다.

⚠ **현재 `cartoon/hero/*.webp`의 작업 원본은 이 정규화를 거치지 않았다** — 위에서 정규화한 기사 5종은 2026-09-04 에 전부 교체·삭제됐다. 그 뒤의 초상은 시트를 타일째 잘라 쓰기 때문에 원래 여백이 거의 없다: 가로 71~100% · 세로 88~100%. 다시 여백이 큰 초상이 들어오면 이 절차를 그 장에만 적용한다.

---

## 아이콘 — 원본과 설치본 [2026-09-27 사용자 지시 · 못박음]

**게임이 읽는 아이콘은 전부 256px WebP 다. PNG 를 게임에 넣지 않는다.**

| 폴더 | 무엇 | 게임이 읽나 |
|---|---|---|
| `icons_source/` | **모든 원본** — 512 PNG 설치 원본 · 발주 시트(`source/`) · 여분(`unused/`) · 옛 판(`v1/` …) · 작업 파일(`mastery/` 의 스크립트 · 계획표) | **안 읽는다** |
| `icons/` | **설치본만** — `icons_source/` 와 **같은 상대 경로 · 같은 이름**의 `.webp`(256×256 RGBA) | 읽는다 — 이 폴더엔 WebP 외의 파일이 없다 |

- **설치본은 손으로 만들지 않는다** — `python scripts/build_icons.py` 가 짓는다. 한 장마다 무손실 · 손실(q90)을 둘 다 인코딩해 **작은 쪽**을 쓴다(단색 실루엣은 무손실이 이긴다 — 오차 0 · 컬러 그림은 q90 이 1/4 크기에 오차가 눈에 안 띈다). 원본이 없어진 설치본은 지운다
- **새 아이콘 · 교체** — 원본 PNG 를 `icons_source/<폴더>/<id>.png` 에 넣고 스크립트를 돌린다. `icons/` 에 PNG 를 떨어뜨려도 스크립트가 `icons_source/` 로 옮기고(같은 이름의 옛 원본을 대체) 짓는다
- **어느 폴더가 설치되나** — `build_icons.py:GAME_DIRS` 가 목록이다(skills · sins · classes · items/empty · items/item_base · items/potion · items/weapon_base/* · mastery/sin · mastery/class · mastery/advance · materials/ores · materials/timbers · materials/herbs · explore · currency · gamble · forge · lab · arena). 새 아이콘 폴더는 그 목록 + `mock.js` 경로 조립 두 곳에 더한다
- **경로 조립** — `mock.js:ICON_EXT`(= `.webp`) 하나를 모든 아이콘 경로가 쓴다
- **256 인 이유** — 칸은 22~44px 지만 한 장(1600×800)이 모니터에 맞춰 늘고(`fitStage`) 고해상도 배율이 겹치면 40px 칸이 기기 픽셀 100 안팎이 된다. 128 은 거기서 빠듯하다. 512 PNG 대비 7장 1.1MB → 70KB 안팎
- 아래 폴더별 절의 트리 · 규격(512 · 투명 · 0.88)은 **원본(`icons_source/`) 기준**이다 — 설치본은 그걸 256 WebP 로 줄인 것뿐이다

## icons/mastery/ — 마스터리 아이콘

**게임이 읽는 것은 `sin/<node_id>.webp`(죄종 판 42) · `class/<node_id>.webp`(직업 판 25 — T2-2 무기 노드는 10-09 R230 부터 직업별) · `class/<node_id>_<class_id>.webp`(직업 공통 무기 노드 T2-1 × 5직업)** [2026-10-09] — 고리 없는 굵은 실루엣 하나(전직 가지 칸과 같은 그림체 · **단색** · **정적** — 정면 · 똑바로)의 회색 `#d8d8e6`(512 투명 · 긴 변 0.88). 화면이 판 색 마스크로 칠한다(`app.js:masteryIconHtml` · `masteryIconPath` · SCREEN_DESIGN §7 · ADR-0555). 죄종 칸은 노드 이름을 그 죄종 소재로, 직업 칸은 능력치 기호에 직업 물건을 붙였다. 원본은 `mastery/source/` — Codex 이미지 생성 시트 10장(`sheet_NN_codex.png` · 01~08 = 72칸 · 09 = 40px 에서 약했던 9칸 재발주 · 10 = 효과가 바뀐 직업 칸 다섯(R230 — 마법사 · 사제 캐스팅 속도 · 마법사 데미지 증가 · 로브 체력 · 6~9 칸은 1~4 의 두 번째 판 · 설치한 칸은 `plan.py:PICK`) · 앵커 = `advance/source/sheet_01_codex.png`) · 지시문 `sheet_NN_prompt.txt` · 칸 문장 표 `plan.py`(노드 키 → 그림 문장 · 시트 배치 · `plan.json` 이 칸 → 파일 대응) · 단색 칠 `mono.py`(검정 → 회색 · 흰 틈 → 투명). ⚠ 안 읽히는 옛 고리 그림이 남았다 — `class/cls_t2_weapon_damage`(직업 없는 경로의 대비책) · `sin/sin_t1_{atkspeed,damage,hp}`(폐지된 옛 공통 T1)

아래 옛 봉인 문양(`nodes/` · `nodes/variants/` · `*_seal.png` · `generate.ps1` · `IconRenderer.cs` · `icon_plan.csv` · `ART_DIRECTION.md`)은 **이제 어디서도 안 읽힌다** — 비교용으로 남겨 두었다.

**`advance/<skill_id>_<slot>.webp` — 전직 트리 가지 칸 121** [2026-10-08] — 파일명 = `advance_node.csv` 의 `skill_id` + `slot`(2 · 3 · 4) · 보류 칸(`hold = 1` · 14)은 그림이 없다. 위 둘과 문법이 다르다 — **고리 + 기호가 아니라 전직 스킬 그림과 같은 투톤**(회백 `#d8d9e6` 실루엣 + 효과 도형 하나만 강조색 · 512 투명 · 긴 변 0.88)이고 화면이 칠하지 않는다(`app.js:advanceNodeIconPath` · SCREEN_DESIGN §7 · ADR-0547). 그린 것 111 + 효과가 같아 그림을 같이 쓰는 10(기절 · 경직 · 화상 · 빙결 · 적 공격 속도 감소 · 추가 피해 확률 — 같은 파일 복사본). 원본은 `advance/source/` — Codex 이미지 생성 시트 13장(`sheet_NN_codex.png` · 앵커 = `skills/source/war_advanced_skills_sheet.png`) · 지시문 `sheet_NN_prompt.txt` · 칸 문장 표 `plan.py`(노드 키 → 그림 문장 · 같은 효과 표) · 투톤 칠 `tone.py`(검정 → 회백 · 흰 틈 → 투명 · 강조색은 채도가 아니라 **색 차(max − min)** 로 가른다 — 채도로 가르면 검정의 미세한 색 잡티가 강조색으로 남아 실루엣이 얼룩진다). 지시문에 「grim · old · brutal」 같은 분위기 말을 넣으면 실루엣에 금 · 이음매가 들어차 40px 에서 얼룩으로 보였다(첫 시트 폐기 — 지금 시트 01 은 그 말을 뺀 재발주)

## shrines/ — 신단 그림 [신설 2026-09-29]

`<죄종 id>.webp` 7장(`wrath` · `sloth` · `lust` · `envy` · `pride` · `gluttony` · `greed`) — 512 투명 · 내용 88% · 원본 `shrines/source/<id>.png`(1024 · 게임이 안 읽는다). 결과 띠 · 관전 헤드 · 리포트의 신단 칩이 읽는다(`data.js:shrineInfo` · SCREEN_DESIGN §4-2 「신단」 · ADR-0445) · 파일명 = `shrine.csv:shrine_id`. 발주 지시문 · 규격 [docs/reference/shrine_art_prompt.md](../../../docs/reference/shrine_art_prompt.md)

## grave/ — 무덤 명패 비석 [신설 2026-10-13]

`tombstone.webp` 한 장 — 죽어 있는 챕터보스의 초상 자리에 서는 비석(일곱 보스가 같은 그림 · CSS `.grave-stone` 이 깐다 · SCREEN_DESIGN §4-2 「무덤 명패」 · ADR-0611). 256 투명 · 내용 세로 94% · 아치 위 뿔 달린 악마 해골 · **앞면에 흰 비문**(제목 한 줄 · 구분선 · 네 줄 — 글이 새겨진 것처럼 보이지만 **읽히는 글자가 아니다** · ADR-0614). 화면은 비석 위에 아무 글자도 안 얹는다 — 남은 초는 칸 구석이다.

- **발주** — Codex(ChatGPT 로그인) · `source/run_codex.py`(지시문 = 파일 안 `COMMON` + 변형 한 줄 · 앵커 = 보스 초상 `faces/gemini/monster/1900` · 신단 `shrines/wrath` 를 PNG 로 바꿔 붙인다 · 작업 폴더 · 앵커 자리는 환경 변수 `GRAVE_WORK` · `GRAVE_ANCHOR`). 후보 셋 `source/cand_a|b|c.png`(뿔 해골 · 부러진 왕관 · 녹슨 사슬과 칼) 중 **a 를 골랐다** · 지시문 `source/prompt_<id>.txt`
- **비문 편집** — `source/run_codex_edit.py` — `cand_a.png` 를 입력으로 주고 「앞면만 바꿔 읽히지 않는 흰 비문을 새겨라 · 나머지 · 투명 배경은 그대로」 + 배치 한 줄. 배치 셋 `source/cand_ins1|2|3.png`(제목 + 구분선 + 네 줄 · 고른 다섯 줄 · 제목 + 가운데 문양 + 두 줄) 중 **ins1 을 설치했다**(초상 크기에서 「글귀」로 가장 또렷하다 · ins3 은 문양이 십자가로 나왔다). 편집본은 원본과 크기 · 자리가 그대로 맞았다(1254 · 같은 내용 상자)
- **설치** — `python source/install.py [후보 id]` — 잔털 알파를 걷고 내용 상자로 잘라 256 정사각 가운데에 세로 94% 로 앉힌다(WebP q90) · 판 사각을 % 로 찍는다(비문이 생긴 뒤로 화면은 이 값을 안 쓴다 — 앞면에 글자를 다시 얹을 때의 자리다)

## icons/sins/ — 죄종 아이콘 [신설 2026-09-27]

`<죄종 id>.png` 7장(`wrath` · `envy` · `greed` · `sloth` · `gluttony` · `lust` · `pride`) — 스킬 아이콘과 같은 규격(512 투명 · 회색 `#d8d8e6` 단색 실루엣 · 긴 변 0.88 · 실선 21px · 파낸 선 15px)이다. 화면은 알파를 마스크로 써 판 색으로 칠한다(`mock.js:sinIcon` · SCREEN_DESIGN §7 · ADR-0368). 원본은 같은 폴더 `source.html`(SVG) — 고치면 512 로 렌더해 다시 자른다.

## icons/classes/ — 직업 아이콘 [신설 2026-09-27]

`<class_id>.png` 7장(`warrior` · `knight` · `mage` · `archer` · `priest` · `assassin` · `necromancer`) — 스킬 아이콘과 같은 규격(512 투명 · 회색 `#d8d8e6` 단색 실루엣 · 긴 변 0.88 · 중앙). Gemini 시트 `source/sheet_01_classes.png`(3×3)를 `cut.py` 로 잘랐고, 여분 두 칸(낫 · 두건)은 `unused/`. 화면은 알파를 마스크로 써 판 색으로 칠한다(`mock.js:classIcon` · SCREEN_DESIGN §7 · ADR-0375). ⚠ 두건 칸(`unused/hood.png`) 원본에 Gemini 워터마크가 있었다 — 쓰려면 확인한다

## icons/materials/ — 재료 아이콘 [신설 2026-09-27]

`ores/<ore_id>.png` 7장(`ore_t1` 구리 ~ `ore_t7` 오리하르콘 — 파일명 = `mine_node.csv:ore_id`) — 512 투명 · 어두운 모암 + 광물 강조색 한 점 · 단계마다 다른 실루엣 · 긴 변 0.88 · 중앙(정규화 — 원본은 크기 77~89% · 중심이 제각각이었다). 원본은 `ores/source/v3/`(t1~t5 지금 판) · `v2/`(t6 · t7 지금 판 · t1~t5 는 폐기) · `v1/`(원색 돌덩이 판 — 폐기) · 발주 첨부용 앵커 `source/anchor_items.png`(설치된 아이템 6장) — 셋 다 게임이 안 읽는다. ⚠ `ore_t2`(철)는 어두운 회색 덩이라 어두운 상자 바탕에서 가장 약하게 읽힌다 · 경계밀도 5% 로 합격선 하단 밖. 화면은 자원 탭 단계 상자의 산출물 칸(`mock.js:MATERIAL_ICONS` · SCREEN_DESIGN §8 · ADR-0377). 약초(`herbs/<id>` · `gather_node`) · 목재(`timbers/<id>` · `log_node`) 7장씩도 섰다(`MATERIAL_ICONS`) · 건설 「다음 랭크」 의 재료 칸도 이 그림을 읽는다(`app.js:matTile` · SCREEN_DESIGN §13-1)

## icons/currency/ — 재화 그림 [신설 2026-10-12]

`<재화 id>.png` 2장 — 512 투명 · 긴 변 0.88 · 중앙 · 파일명 = 자원 셋 id(`app.js:resKind`). 화면은 건설 「다음 랭크」 의 재료 칸(`mock.js:RES_ART` · SCREEN_DESIGN §13-1 · ADR-0323).

| 파일 | 그림 | 원본 시트 (Codex 이미지 생성 · 2×2) | 대안 (`unused/`) | 실측 색 수 · 경계밀도 · 외곽선 |
|---|---|---|---|---|
| `gold.png` | 왕관을 찍은 금화 한 닢 | `source/sheet_01_codex.png` (미니게임 · 목재 시트 첨부) | `gold_hole` 네모 구멍 · `gold_star` 별 · `gold_skull` 해골 | 140 · 12% · 16 |
| `dust.png` | 돌절구에 수북한 잿빛 가루(보라 기) | `source/sheet_02_codex.png` (미니게임 · 광석 앵커 · 금화 첨부) | `dust_heap` 강철 조각 섞인 더미 · `dust_pouch` 쏟아진 가죽 주머니 · `dust_sack` 찢어진 자루 | 114 · 15% · 4 |

지시문은 같은 폴더 `sheet_<번호>_prompt.txt`. 실측은 재료 · 미니게임 설치본 범위 안이다(장비 아이콘 합격선의 색 수 130 은 금화가 조금 넘는다). **빈 것** — 낙인(`stigma` · 죄종별 7종)은 아직 `RES_ART` 의 임시 실루엣이다

## icons/gamble/ — 도박장 슬롯 심볼 [신설 2026-10-12]

`<symbol_id>.png` 7장 + `jackpot.png` — 512 투명 · 긴 변 0.88 · 중앙 · 파일명 = `slot_symbol.csv` 의 `symbol_id`(잭팟 코인만 `slot_coin.csv` 의 kind). 화면은 도박장 창의 판 · 배당표 · 선술집 도박장 칸의 죄종 띠(`mock.js:gambleArt` · SCREEN_DESIGN §8-1 · ADR-0608 · ADR-0631).

| 파일 | 그림 (죄종) | 원본 |
|---|---|---|
| `seven.png` | 숫자 7 실루엣 — 윗변이 무쇠 왕관 띠(가시 다섯 · 보라 보석 셋) (오만) | `source/sheet_03_codex.png` 2 (ADR-0631) |
| `wild.png` | 금 인장 반지 — 「탐욕의 인장」 (탐욕) | 시트 01 · 2 |
| `gold.png` | 장미 (색욕) | 시트 01 · 3 |
| `ore.png` | 화로의 화염 (분노) | 시트 01 · 4 |
| `timber.png` | 가시 박힌 초록 눈 (시기) | 시트 01 · 5 |
| `dust.png` | 모래시계 (나태) | 시트 01 · 6 |
| `coin.png` | 아가리를 찍은 동전 (폭식) | 시트 01 · 7 |
| `jackpot.png` | 루비 박힌 금화 — 잭팟 코인 | `source/sheet_02_codex.png` 8 |

원본 시트 01 · 02 는 Codex 이미지 생성 · 3×3 · 미니게임 · 금화 시트를 첨부해 같은 그림체로 뽑았다(지시문 `source/sheet_0N_prompt.txt`). 시트 03 은 2×2 · 시트 01 과 옛 왕관을 첨부한 「7 로 읽히는 오만」 후보 넷이다(78px 판 시안 `source/sheet_03_board_preview.png` · 경계밀도 26% 로 위 범위를 조금 넘지만 판 시안에서 갈렸다). 대안 열넷은 `unused/`(`seven_crown`(옛 오만 왕관) · `seven7_slab` · `seven7_stone` · `seven7_scepter` · `seven_mirror` · `wild_sack` · `wild_key` · `gold_flask` · `ore_fist` · `ore_skull` · `timber_snake` · `dust_candle` · `dust_snail` · `coin_bitten`). 실측 색 수 107~268 · 경계밀도 13~25% · 외곽선 ≤6 — 금화 · 미니게임 그림과 같은 계열이고 옛 장비 아이콘 합격선보다 거칠다 · 64 · 42 · 24px 몽타주에서 여덟 장이 다 갈렸다

## icons/forge/ — 강화 연출의 모루 · 망치 [신설 2026-10-14]

`anvil.png` · `hammer.png` — 512 투명 · 긴 변 0.88 · 중앙. 제련소 강화 칸의 연출([강화]를 누르면 진열 칸에서 망치가 모루를 세 번 내려친다)이 읽는다(`mock.js:FORGE_ART` · SCREEN_DESIGN §8-2 · ADR-0626). **연출이 그림의 생김새에 기댄다** — 모루는 옆에서 본 모습 · 뿔이 왼쪽 · 윗면이 수평(그 위에 아이템 그림이 앉는다) · 통나무 받침, 망치는 수평으로 누운 옆모습 · 머리가 왼쪽 · 때리는 면이 아래 · 손잡이가 오른쪽(화면이 손잡이 끝을 축으로 돌린다 — 축 자리는 `style.css` 의 `.fg-hammer`). 다른 그림으로 바꾸면 이 방향을 지켜야 연출이 맞는다.

- **그림체 — 건물 그림과 같은 단순한 카툰** [2026-10-15 사용자 「너무 AI슬롭같에 · 너무 섬세하니까 좀 단순한느낌으로」] — 굵고 고른 외곽선 · 재질마다 평평한 색 + 그림자 한 톤 · 결 · 잔금 · 깎은 면 · 광택 없음. 첫 판(10-14)은 도박장 · 재화 시트를 기준 그림으로 붙여 그 「잘게 깎은 면(low-poly)」 결이 옮았다 — 기준 그림을 **건물 그림**(`buildings/forge` · `shop` — 제련소 그림엔 모루도 있다)으로 바꾸고 결 · 잔금 · 광택을 지시문에서 금지했다
- **원본** — Codex 이미지 생성 · 2×2 시트(칸마다 받침 있는 모루 · 대장 망치 · 받침 없는 모루 · 메). **설치는 `source/sheet_04_codex.png` 의 통나무 받침 모루(왼쪽 위) + 대장 망치(오른쪽 위)** — 외곽선이 가장 굵고 덩어리가 커서 건물 그림과 결이 가장 가깝다. 05 · 06 은 같은 지시문 `source/sheet_simple_prompt.txt` 의 다른 판(대안 누끼 `unused/anvil_v2b` · `v2c` · `hammer_v2b` · `v2c`). 첫 판 시트 01 ~ 03(지시문 `source/sheet_prompt.txt`)과 그 설치본은 `unused/anvil_v1` · `hammer_v1` 로 남겼다
- **그림을 바꾸면 연출 자리도 다시 잰다** — 모루 윗면 높이 · 폭, 망치 머리의 가운데 · 아래 끝, 손잡이 끝을 % 로 재 `style.css` 의 `.fg-anvil` · `.fg-anim-item` · `.fg-hammer`(`transform-origin`) · 불꽃 자리를 맞춘다(지금 값의 근거는 그 규칙 위 주석)
- **누끼** — 흰 배경을 가장자리에서 이어진 밝은 무채 픽셀로 잡아 지우고, 배경과 맞닿은 띠는 흰 위에 섞인 색으로 보고 알파 · 색을 되푼다(외곽선이 검정이라 어두운 바탕에서 흰 테두리가 안 남는다) · 내용 상자로 잘라 긴 변 0.88 로 앉혔다

## icons/arena/ — 콜로세움 · 결투장 휘장 [신설 2026-10-18]

`<tier_id>.png` 여섯(`arena_tier.csv` 의 `tier_id` — 브론즈 ~ 챔피언) + `colosseum.png` · `duel.png` · `gladiator.png` — 512 투명 · 긴 변 0.88 · 중앙. 등급 휘장은 콜로세움 사다리 · 결투장 리그가 같이 읽는다(`mock.js:arenaArt` · SCREEN_DESIGN §1 · ADR-0670) · 표에 행이 늘면 같은 이름의 그림을 더한다(없으면 칸이 이름 글씨만 든다).

- **휘장은 한 벌이다** — 여섯 다 같은 방패 꼴이고 등급이 오를 때마다 하나씩 붙는다(검 하나 → 교차한 검 → 월계수 → 날개 · 보석 → 큰 날개 · 다이아 → 왕관). 등급을 더 그리면 이 순서를 잇는다
- **원본** — Codex 이미지 생성 · 3×3 시트 · 도박장 시트(`gamble/source/sheet_01_codex.png`)를 기준 그림으로 붙여 같은 low-poly 결로 뽑았다(지시문 `source/sheet_01_prompt.txt`). 같은 지시문의 다른 판은 `source/sheet_01b_codex_unused.png`
- **자르기** — `cut.py` 의 칸 선 · 격자선 규칙이 이 시트에서 틀렸다(둘째 줄 날개가 시트 폭을 거의 채워 한 줄이 「격자선」으로 지워졌다). 고친 판이 `source/cut_sheet_01.py` 다 — 줄 선을 손으로 주고 · 격자선 규칙을 끄고 · 칸 선을 넘는 조각은 중심이 든 칸으로 보낸다

## icons/lab/ — 연구소 줄 아이콘 [신설 2026-10-18]

`<줄 id>.png` 셋(`mine` 채광 · `gather` 채집 · `log` 벌목 — 파일명 = `app.js:POSTS` 의 `id`) — 512 투명 · 긴 변 0.88 · **둥근 그림 원판**(양피지색 바탕 + 도구 · 가장자리는 검은 선 — 탐험 지점 아이콘과 같은 그림체). 연구소 탭 왼쪽 줄 목록이 읽는다(`mock.js:labIcon` · SCREEN_DESIGN §8 · ADR-0669). **새 줄이 서면 같은 이름의 그림을 더한다**

- **원본** — Codex 이미지 생성 · 2×2 시트 · 탐험 지점 시트(`explore/source/codex_explore_icons_sheet.png`)를 기준 그림으로 붙이고 「청동 테두리 없이 원판만」을 시켰다(지시문 `source/sheet_prompt.txt` · 시트 `source/sheet_01_codex.png`). 넷째 칸(교차한 곡괭이 — 채광 둘째 판)은 `unused/mine_crossed.png`
- **자르기** — `cut.py --grid 2x2`(흰 시트 · 원판이 칸 안에 떨어져 있어 손볼 것이 없었다)

## icons/explore/ — 탐험 지점 아이콘 [신설 2026-10-09]

`<지점>.png` 3장(`cave` · `ruins` · `caravan` — 파일명 = `state.js:EXPLORE_SPOTS`) — 512 투명 · **원형 그림 원판**(양피지색 바탕 + 그림 · 가장자리는 검은 선) · **테두리가 없다** — 화면이 땅 색 테두리를 두른다(`mock.js:EXPLORE_REGIONS[장].ring` · `exploreIcon` · SCREEN_DESIGN §8-4 · ADR-0553). 원본 `source/codex_explore_icons_sheet.png`(Codex 이미지 생성 · 2132×738 · 지도 그림을 스타일 기준으로 붙인 청동 테두리 메달 셋) — 메달마다 원을 맞춰 자르고 청동 테두리를 걷어 낸 안쪽 검은 선까지가 원판이다(테두리를 박으면 땅 색마다 7 × 3 장이 된다)

## minigames/ — 자원 미니게임 [전면 교체 2026-10-16]

`mine_scene.webp`·`gather_scene.webp`·`log_scene.webp` — 1536×1024, 광산·약초 정원·노을 숲 배경. Built-in `image_gen`으로 새로 생성했고 PNG 원본은 `source/`, 사용한 프롬프트는 `prompts.json`에 저장한다. 게임은 WebP 세 장만 읽는다(전체 약 924 KiB).

광맥·희귀 광맥·위험 바위·일반/희귀 약초·독초·나무·가지·나무꾼은 `ui/minigame_art.js:MG_SPRITES`의 새 인라인 SVG다. `MG_SCENES`가 배경 경로를 소유하고, `style.css`의 `--mg-*` 색 토큰과 함께 사용한다. 이전 `icons/minigame/`·`icons_source/minigame/`는 삭제했다. `build_icons.py`의 대상이 아니다. (ADR-0638)

## icons/skills/ — 스킬 아이콘 [신설 2026-09-03]

```
icons_source/skills/
├── <skill_id>.png        ← 설치 원본 512 · 파일명 = skill_id — 기본 스킬 50 은 단색 실루엣(회백 #d8d9e6) · 전직 45 는 투톤(아래)
├── source/               ← 원본 시트 — **게임이 안 읽는다**
│   ├── sheet_07_codex_warrior.png … sheet_12_codex_extra.png  ← 기본 50 을 다시 뽑은 시트(2026-10-15 · Codex 이미지 생성 · 3×3 여섯) — 설치한 것은 새 스킬 14 칸뿐 · 지시문 sheet_NN_codex_<직업>_prompt.txt
│   ├── sheet_07_12_anchor_installed_mono.png  ← 그 여섯에 붙인 기준 그림 — 그때 설치돼 있던 기본 아이콘 9장을 흰 바탕 검정으로 되돌린 것
│   ├── sheet_13_codex_inferno.png · sheet_14_codex_summon.png  ← 인페르노 · 소환 2×2 (2026-10-16 · Codex) — 둘 다 1번 칸을 설치 · 기준 그림 = 같은 직업 설치본 9장(`sheet_13_anchor_installed_mage` · `sheet_14_anchor_installed_priest`) · 지시문 `*_prompt.txt`
│   ├── war_recovery_20261017.png · kni_resistshield_20261017.png  ← 리커버리 · 레지스탕스 실드 단독 생성 원본(내장 image_gen · 투명 배경) · 지시문 `*_20261017_prompt.txt` · 내보내기 기록 `missing_basic_20261017.json`
│   ├── missing_basic_20261017_preview.png  ← 새 아이콘과 같은 직업 기존 아이콘을 28 · 32 · 44px로 비교
│   ├── body_shield_revision_20261017/  ← 리커버리 · 아이언 스킨의 공통 몸, 홀리 실드형 레지스탕스 실드 수정본 · `*_generated.png` · `*_prompt.txt` · `manifest.json` · 비교 `comparison.png` · 이전 설치본 `previous/`
│   ├── <직업>_advanced_skills_sheet.png  ← 전직 45 투톤 시트 다섯 (2026-09-28 · 전직 시트의 앵커는 war_ 시트)
│   └── sheet_01 ~ 06 · Gemini_Generated_Image_*  ← 9월 Gemini 시트 — 지금 설치된 기존 기본 36 의 출처 · sheet_02_mono_anchor 가 그때의 앵커
└── unused/               ← id 가 없는 여분 · 10-15 「새 B」 넷(`war_frenzy_b` · `arc_evade_b` · `pri_halo_b` · `pri_doom_b`)
```

**새 기본 스킬 14 — 2026-10-15 Codex 단색 발주** — skill_design §12 의 직업마다 10(50)을 전부 다시 뽑았고, **그림이 없던 새 스킬 14 만 설치했다**(사용자 「기존꺼 내버려두고 새로 뽑힌 애들만」) — 기존 36 은 9월 그림 그대로이고 그 36 의 새 판은 원본 시트에만 있다. 같은 단색 실루엣 형태를 지키려고 설치돼 있던 그림을 기준 그림으로 붙였고, 칸 문장은 `.claude/skills/icon-prompt/skill_tiles.md` 의 타일을 따랐다(새 스킬은 시트 지시문이 원문). 실측 — 장변 88 · 중앙 50/50 · 단색(기존 설치본과 같은 값). 지시와 다르게 나온 칸 — `arc_overdraw`(큰 화살 대신 활 쏘는 사람) · 40px 에서 약한 칸 — `arc_arrowrain`(가는 화살) · `arc_overdraw`

- **새 스킬 13 이 화면에 나온다** [2026-10-16 · DEV_PLAN R246 ~ R250] — 가안 id 그대로 `skill.csv` 행이 섰고 `mock.js:SKILL_ICON_FILES` 에 들었다. **`pri_halo` 는 쓸 곳이 없다**(헤일로가 같은 날 지워져 소환으로 — 파일만 남는다)
- **인페르노 · 소환** [2026-10-16 · Codex 단색] — 인페르노는 「화염의 고리」로 갈아 끼웠고(옛 각진 분사는 git 이력에만) 소환은 「별을 그린 의식 원에서 솟는 뿔 해골」이다. 설치본 실측 장변 88 · 중앙 50/50 · 단색
- **리커버리 · 레지스탕스 실드 초판** [2026-10-17 · 내장 image_gen 단색] — 기본 스킬 50행과 화면 등록 목록 · 설치 파일을 대조해 비어 있던 두 스킬을 채우고 `mock.js:SKILL_ICON_FILES`에 등록했다. 건틀릿과 회복 화살표 · 원소 방패와 보호 호로 만든 첫 그림은 같은 날 아래 수정본으로 교체했다. 원본과 지시문은 `source/`, 당시 설치본은 수정 폴더의 `previous/`에 남는다
- **리커버리 · 아이언 스킨 · 레지스탕스 실드 수정** [2026-10-17 · 사용자 지시 · 내장 image_gen 편집] — 리커버리와 아이언 스킨은 같은 정면 사람 상반신을 쓴다. 리커버리는 몸 가운데 큰 십자 구멍, 아이언 스킨은 십자 대신 목 · 어깨 · 가슴 · 복부의 적은 갑옷 선으로만 구분한다. 레지스탕스 실드는 홀리 실드의 방패 외형 · 테두리 · 바깥 광선을 기준으로 안쪽 십자를 화염 · 얼음 · 번개로 바꿨다. 회백 `#d8d9e6`, 생성 알파 유지, 512 PNG · 장변 88% · 중앙 50/50, 게임용 256 WebP 세 장만 기존 인코더로 내보냈다. 원본 · 프롬프트 · 이전 설치본 · 크기 비교는 [`body_shield_revision_20261017/`](icons_source/skills/source/body_shield_revision_20261017/manifest.json)에 기록한다
- 지운 스킬(`war_taunt` · `kni_duel` · `mag_focus` · `mag_frozenwall`)은 2026-10-16 행이 걷혀 목록에서 빠졌다 — 그림 파일만 폴더에 남는다
- **전직 45** — 투톤(회백 실루엣 + 효과 강조색 하나 · 원본 `source/<직업>_*_sheet.png` 다섯 · 2026-09-28 · 궁수 9 는 2026-10-09) · `mastery/advance/source/tone.py` 로 칠했다 — 강조색 픽셀은 그대로 두고 검정만 회백으로 칠한다

**오오라 셋은 「원 배지」로 갈렸다** [2026-09-09] — D2 팔라딘 오오라 아이콘 **14개 중 12개**가 「원형 테 + 그 안에 갇힌 작은 심볼」이고,
일반 전투 스킬(Zeal·Smite)은 원 없이 오브젝트가 칸을 꽉 채운다. **오오라임을 말하는 것은 심볼이 아니라 「가둔다」는 구조**라 그것만 가져왔다.
원본의 톱니 테는 28~44px 에서 뭉개지므로 **민 원**으로 단순화했고, 원본 심볼 중 둘은 단색에서 죽어 바꿨다 —
Might(굽은 갈고리 → **굽힌 팔**) · Fanaticism(가는 평행 줄무늬 → **날개**). Defiance 의 방패만 원본 그대로다.

**단색 실루엣으로 통일됐다** [2026-09-09] — ~~1차 컬러 카툰~~ 은 마지막 한 장(`war_warcry`)이 전사 세트로 교체되며 **설치본에서 사라졌다**(원본 시트는 남는다).
원본이 검정이라 어두운 UI(`--bg-card: #161624`)에서 안 보여서 **밝은 청회(`#d8d9e6`)로 칠해** 설치한다 — 알파는 그대로 두고 RGB 만 단색으로 채우므로 축소 헤일로가 없다.
`icon-prompt` 의 스킬 합격선(색 수 110~160 · 경계 12~21%)은 **컬러 앵커 기준이라 이 세트에는 안 맞는다** — 설치본 실측은 `colors 1 · edge 0% · dark 219~221` 이고 **프레이밍(장변 88 · 중앙 50/50)만 그대로 유효**하다.

### 채워진 것 / 빈 것 — 기본 스킬 50 (skill_design §12 · 2026-10-17)

| 직업 | 그림 | 화면에 나온다 | 빈 것 |
|---|---|---|---|
| 전사 10 | **10** | 10 | — |
| 기사 10 | **10** | 10 | — |
| 궁수 10 | **10** | 10 | — (퀵 드로우는 전직 투톤 그림 그대로) |
| 마법사 10 | **10** | 10 | — |
| 사제 10 | **10** | 10 | — |

발주 프롬프트와 **타일 문장**(무엇을 그리는가)은 `.claude/skills/icon-prompt/skill_tiles.md` 가 든다.

**파일명 = `src/data/skill.csv` 의 `skill_id`.** 초상의 `monster/<idx>.png` 와 같은 문법이라, 화면이 CSV 만 보고 경로를 조립한다 — 조립하는 곳은 `ui/mock.js:skillIcon` 하나다.

**`mock.js:SKILL_ICON_FILES` 에 없는 스킬은 검은 칸이다**(2026-09-18 · ADR-0162 — 해시 폴백 폐기). 스타일 폴더가 없는 이유는 세트가 하나뿐이라 `faces/` 의 `?face=` 축이 성립하지 않기 때문이다.

### 규격

- 512×512 RGBA · **투명 배경** · 장당 130~200KB. 원본 시트는 2048 한 장(2×2)이고 잘라서 512로 줄였다
- 스타일은 `faces/source/` 의 초상과 같은 문법 — 굵고 균일한 암색 외곽선(약 `#0B060C`) · 플랫 베이스 + 그림자 1단 · 저채도에 강조색 하나. 프롬프트는 [docs/reference/](../../../docs/reference/) 가 아니라 대화에서 만들었다(문서화 미정)
- **40~64px 에서 읽혀야 한다** — 실제로 그려지는 칸은 관전 쿨 칸 32px · 스킬 창 슬롯 28px · 캐릭터 카드 40px · 시작 화면 고유 칸 44px 이다. 가는 선·작은 디테일은 이 크기에서 사라진다
- 축소 보간은 초상과 같은 토큰(`--face-render`)을 탄다 — 손그림이라 켠 쪽으로 떨어진다

### 누끼 (생성 원본이 흰 배경으로 나올 때)

Gemini 가 투명 배경 지시를 무시하고 흰 배경으로 굽는다(초상 시트도 같았다 — `faces/source/README.md`). 처리 순서:

1. near-white 판정(`min(RGB) ≥ 225` · 채널 편차 ≤ 18) + **테두리에서 flood fill**
2. **테두리와 안 닿는 닫힌 흰 포켓도 300px 이상이면 배경**으로 본다 — 나팔의 끈 고리 안쪽처럼 둘러싸인 배경이 남는다. 그보다 작은 것은 광택 하이라이트라 보존한다
3. 경계 1px 페더 → **premultiplied LANCZOS 로 512 축소** (프리멀티플라이를 건너뛰면 투명 픽셀의 흰 RGB 가 번져 흰 테두리가 생긴다)

초상의 회색 배경과 달리 흰 배경이라 **갑옷이 뚫리는 문제는 없었다** — 그쪽이 쓰는 barrier 팽창 단계가 여기서는 불필요하다.

---

## icons/items/ — 장비 아이콘 [신설 2026-09-03]

```
icons_source/items/
│   (무기군 그림 8장은 2026-09-17 삭제 — 베이스 그림이 그 자리를 든다 · 사용자 지시)
├── empty/
│   └── weapon · helmet · armor · gloves · boots · amulet · ring .png  ← 파일명 = equip_slot.csv 의 part (부위 7종 전부)
├── item_base/          ← 방어구 · 장신구 — 파일명 = item_base.csv 의 base_id [폴더 2026-09-14 · 베이스 축 2026-09-17]
│   └── armor_cloth · armor_robe_1~3 · armor_light_1~3 · armor_heavy_1~3 .png      ← 갑옷 10종
│       helmet_cloth · helmet_tiara_1~3 · helmet_leather_1~3 · helmet_plate_1~3 .png ← 투구 10종 [2026-09-17]
│       gloves_cloth · gloves_leather_1~3 · gloves_gauntlet_1~3 .png                ← 장갑 7종 [2026-09-18]
│       boots_start · boots_leather_1~3 · boots_greaves_1~3 .png                    ← 신발 7종 [2026-09-18]
│       ring_1~3 · amulet_1~3 .png                                                  ← 장신구 6종 [2026-09-18 · 스케치 발주]
│       (옛 부위당 한 장 armor_1 · boots_1 · gloves_1 · ring_1 은 2026-09-17 삭제)
├── source/             ← 원본 시트 — **게임이 안 읽는다** [폴더 2026-09-14]
│   ├── examples.png        ← 무기 원본 시트(3×3)
│   ├── examples_armor.png  ← 방어구 원본 시트(2×2)
│   ├── item_background.png ← 미장착 실루엣 **구판** 시트(십자 5종 · 2026-09-17 교체로 비사용)
│   ├── Gemini_Generated_Image_ (2).png ← 미장착 실루엣 원본 시트(4×6 = 24칸 · 어두운 칸 배경) [2026-09-17]
│   ├── sheet_sword2h_bases.png ← 양손검 베이스 원본 시트(3×3 · 7칸)
│   ├── sheet_axe_bases.png     ← 도끼 베이스 원본 시트(3×3 · 7칸)
│   ├── sheet_mace_bases.png    ← 둔기 베이스 원본 시트(3×3 · 7칸)
│   ├── sheet_spear_bases.png   ← 창 베이스 원본 시트(3×3 · 7칸)
│   ├── sheet_bow_bases.png     ← 활 베이스 원본 시트(3×3 · 7칸)
│   ├── sheet_staff_bases.png   ← 스태프 베이스 원본 시트(3×3 · 7칸)
│   ├── sheet_orb_bases.png     ← 오브 베이스 원본 시트(3×3 · 7칸)
│   ├── sheet_crucifix_bases.png ← 십자가 베이스 원본 시트(3×3 · 7칸)
│   ├── sheet_bible_bases.png   ← 성경 베이스 원본 시트(3×3 · 7칸)
│   └── sheet_crossbow_bases.png ← 석궁 베이스 원본 시트(3×3 · 7칸)
├── unused/
│   └── wand.png        ← 어느 id 에도 안 붙은 여분
└── weapon_base/        ← 무기 베이스 — 폴더 = weapon_base.csv · 하위 폴더 = group_id · 파일명 = base_id (아래)
    ├── sword2h/        ← 양손검 베이스 7종 — 게임이 읽는다
    │   └── long_sword · claymore · highland_blade · bastard_sword
    │       · balrog_blade · zweihander · colossus_blade .png
    ├── axe/            ← 도끼 베이스 7종 — 게임이 읽는다
    │   └── hatchet · axe · tomahawk · great_axe
    │       · berserker_axe · battle_axe · decapitator .png
    ├── mace/           ← 둔기 베이스 7종 — 게임이 읽는다 (2026-09-11)
    │   └── club · flanged_mace · reinforced_mace · battle_hammer
    │       · legendary_mallet · war_club · ogre_maul .png
    ├── spear/          ← 창 베이스 7종 — 게임이 읽는다 (2026-09-11)
    │   └── pike · thresher · giant_thresher · halberd
    │       · cryptic_axe · lance · war_pike .png
    ├── bow/            ← 활 베이스 7종 — 게임이 읽는다 (2026-09-11)
    │   └── short_bow · long_bow · great_bow · rune_bow
    │       · diamond_bow · gothic_bow · hydra_bow .png
    ├── staff/          ← 스태프 베이스 7종 — 게임이 읽는다 (2026-09-14)
    │   └── short_staff · long_staff · gnarled_staff · gothic_staff
    │       · elder_staff · rune_staff · archon_staff .png
    ├── orb/            ← 오브 베이스 7종 — 게임이 읽는다 (2026-09-14)
    │   └── eagle_orb · heavenly_stone · demon_heart · sacred_globe
    │       · eldritch_orb · swirling_crystal · dimensional_shard .png
    ├── crucifix/       ← 십자가 베이스 7종 — 게임이 읽는다 (2026-09-14)
    │   └── scepter · divine_scepter · caduceus · rune_scepter
    │       · mighty_scepter · grand_scepter · seraph_rod .png
    ├── bible/          ← 성경 베이스 7종 — 게임이 읽는다 (2026-09-14)
    │   └── psalter · breviary · missal · lectern_bible
    │       · great_bible · wicked_bible · apocrypha .png
    └── crossbow/       ← 석궁 베이스 7종 — 게임이 읽는다 (2026-09-14)
        └── crossbow · light_crossbow · chu_ko_nu · heavy_crossbow
            · ballista · demon_crossbow · colossus_crossbow .png
```

**파일명 = 그 장비를 정하는 CSV 의 id** — `icons/skills/` 의 `skill_id`, 초상의 `monster/<idx>` 와 같은 문법이다.
갈리는 것은 **무기와 방어구의 SSOT 가 다르다**는 점뿐이다: 무기는 착용 단위가 무기군이라 `weapon_group.csv:group_id`,
방어구는 `item_base.csv:base_id`(폴더 `item_base/` — `mock.js:ITEM_BASE_ART_DIR`). 두 네임스페이스는 겹치지 않는다(`hatchet` ↔ `armor_cloth`).

`unused/` · `source/` 를 폴더로 가른 이유는 `faces/source/` 와 같다 — **파일명이 id 가 아니기 때문**이다. `unused/` 에는 지금 `wand.png` 하나뿐이다.
완드는 `weapon_group.csv` 의 어느 행도 아니다(2026-09-01 「완드 → 오브」 개명으로 자리가 사라졌다). id 가 생기면 위로 올린다.

`weapon_base/` 는 **폴더 이름부터 id 축**이다 — 폴더 = `weapon_base.csv` · 하위 폴더 = `group_id` · 파일명 = `base_id`. 화면이 이 경로를 조립하는 곳은 `mock.js:WEAPON_BASE_DIR` 하나다(아래 「무기 베이스 7종 × 10군」 · DEV_PLAN R62).
⚠ **폴더에 있다고 게임이 읽는 것은 아니다** — `weapon_base.csv` 행과 `mock.js:WEAPON_BASE_STEMS` 줄이 서야 뜬다. 지금은 열 폴더 전부 그 둘이 섰다.

### 채워진 것 / 빈 것

| 축 | 있음 | 없음 |
|---|---|---|
| 무기군 `release=main` 10종 | 8종 | `crucifix` · `bible` (2026-09-07 사제 전용 신설분) |
| 무기군 `release=expansion` | — | `dagger` · `scythe` |
| **무기 베이스** (본편 70 — 무기군 10 × 7) | 양손검·도끼·둔기·창·활 7종씩 = `weapon_base/sword2h·axe·mace·spear·bow/`(**id 있음 · 실사용** — 뒤의 셋 2026-09-11) · 스태프·오브·십자가·성경 7종씩 = `weapon_base/staff·orb·crucifix·bible/`(**id 있음 · 실사용** — 2026-09-14) · 석궁 7종 = `weapon_base/crossbow/`(**id 있음 · 실사용** — 2026-09-14) | — |
| 방어구 6부위 × 4종 | `armor_1` `boots_1` `gloves_1` `ring_1` | `helmet_*` · `amulet_*` 전부 · 나머지 부위의 `_2`~`_4` |
| **빈 칸 실루엣** (부위 7) | 7종 전부 — `empty/` [2026-09-17 통째 교체] | — |

방어구는 부위마다 4종인데 그려진 것은 **판금 계열 `_1` 하나씩**이다 — 사슬·가죽·유령 계열은 아직 없다.
`boots_1`(전투화)·`ring_1`(은반지)은 그림이 판금 장화·붉은 보석 반지라 **이름과 완전히 같지는 않다** — `_1` = 중장 계열이라는 축으로 붙였다.

### 무기 베이스 7종 × 10군 — 발주 상태 [2026-09-10 ~ 09-14]

`source/sheet_<무기군>_bases.png` 를 잘라 `weapon_base/<무기군>/` 에 넣었다. 파일 이름과 순서는 `weapon_base.csv` · [item_design.md](../../../docs/game_design/item_design.md) §1 「이름 — 9군」이 정한다. 열 다 실칸 · 도감에 뜬다(아래 「화면 연결」 · 스태프 · 오브 · 십자가 · 성경 · 석궁 2026-09-14).

| 무기군 | 40px 몽타주 검수 | 경계밀도 실측 | 남은 일 |
|---|---|---|---|
| 양손검 `sword2h` | ⚠ **미통과** — 날이 가늘어 28~40px 에서 넷이 실처럼 사라진다 | 17~26% | **재발주** |
| 도끼 `axe` | 통과 | 15~19% | — |
| 둔기 `mace` | 통과 — 표면 디테일만 뭉개진다 | 12~27% | — |
| 창 `spear` | 통과 — 자루를 굵게 못박았다 | 19~25% | — |
| 활 `bow` | ⚠ **미통과** — 몸체가 가늘다 · 어두운 칸에서 룬 · 고딕이 사라진다 | 22~41% | **재발주** |
| 스태프 `staff` | ⚠ **부분 미통과** — `long_staff` · `elder_staff` 는 자루가 가늘어 28px 에서 실이 된다 · `gothic_staff` 는 어두운 칸에서 흐리다. 나머지 넷은 통과 | 14~22% | 셋 재발주 후보 |
| 오브 `orb` | 통과 — 일곱 실루엣이 28px 에서도 갈린다 | 15~22% | — |
| 십자가 `crucifix` | 통과 — `scepter` · `rune_scepter` 만 어두운 칸 28px 에서 흐리다 | 20~29% (`grand_scepter` 색 수 134 — 합격선 130 살짝 초과) | — |
| 성경 `bible` | 통과 — 일곱이 크기 · 묶는 방식(끈 · 사슬 · 쇠 띠)으로 28px 에서도 갈린다. `missal` 의 해골만 28px 에서 뭉개진다(모서리 발톱은 남는다) | 10~28% | — |
| 석궁 `crossbow` | 통과 — 개머리판 모양 · 색점(뼈 · 밧줄 · 피 · 초록 눈)으로 일곱이 갈린다. ⚠ 어두운 칸 28px 에서 **짙은 회색 쇠 활대가 흐려지고** `demon_crossbow` 의 검은 뿔이 가장 약하다 · 시위는 가는 선으로 나와 작게 보면 안 보인다 | 21~27% | — |

- 경계밀도가 합격선(6~16%)을 넘어도 **40px 몽타주가 통과하면 설치한다**(icon-prompt 원칙 7). 미통과 둘은 사용자 지시로 설치된 채다
- ⚠ **스태프 · 오브 · 십자가 · 성경의 이름은 기획서 확정 전이다** [2026-09-14 게임 연결] — `gnarled_staff`(스태프 ①-B ⚠미정 자리의 추천) · `eagle_orb`(오브 기본 ⚠미정 자리의 추천) · `crucifix/` 7개 전부(⚠제안 이름) · `bible/` 7개 전부(2026-09-14 대화에서 정한 안 — 기도서 · 대형 성경 · 금서 세 계열 · `item_design.md` §1 성경 행에는 **아직 안 적혔다**). 이름을 바꾸면 **파일명 · `weapon_base.csv:base_id` · `mock.js:WEAPON_BASE_STEMS` · `i18n:ix.b.*` 를 한꺼번에** 바꾼다 — 넷이 같은 id 를 든다
- **재발주 처방** — 양손검: 「blade at least one third as wide as the guard is long, thick heavy blade」 · 가는 검(롱 소드 · 클레이모어)도 굵게. 활: 「thick chunky bow limbs, each limb as wide as the grip wrap」 · 「no thin separate string — omit it or draw it thick」 · 검은 몸체(룬 · 고딕)에 「bright rim highlight along the dark limb」 · 설치본 `bow.png` 를 굵기 기준으로 첨부 · 롱 보우는 숏 보우와 **형태로** 가른다
- 파일마다 생김새의 출처 · 실측 표 · 발주 중 수정 이력은 [DEV_LOG.md §4](../../../docs/client/DEV_LOG.md)

### `potion/` — 물약 그림 [5종 설치 2026-09-23]

```
icons_source/items/potion/
├── slot.png   ← **칸 배경 실루엣** — id 가 아니다(칸 넷이 같은 한 장) [2026-09-17]
└── minor_healing · light_healing · healing · greater_healing · super_healing .png   ← 파일명 = potion.csv 의 potion_id
```

관전 아레나의 물약 칸 · 편성 탭의 물약 칸 · 제련소 물약 머리 줄 · **도감 아이템의 물약 탭**이 읽는다([SCREEN_DESIGN §4-2 · §8-2 · §9-1 · §15](../../../docs/client/SCREEN_DESIGN.md) · ADR-0148 · 0314). **칸 한 변이 28px** 이라 장비 칸(40px)보다 작다 — 병의 윤곽이 굵어야 읽힌다(도감 타일은 더 크다). 규격은 아래 「규격」과 같다. **실측 [2026-09-23]** — 프레이밍(장변 87% · 중앙 50/50)은 통과했고 **색 수만 아이템 합격선(35~130) 위다**(135~142 — 유리 반사와 액체 그라디언트). 28px · 40px 몽타주에서 다섯 단계가 **병의 부피**로 갈려 읽혀 재발주하지 않았다.
**목록에 적어야 뜬다** — `mock.js:POTION_ART_IDS` 에 5종이 등록돼 있다. 목록에 없는 물약은 칸이 테두리만 선다 · 해시 폴백을 안 쓰는 이유는 `empty/` 와 같다(틀린 그림 = 틀린 정보 — 마이너 칸에 슈퍼 병이 뜨면 회복량을 잘못 읽는다).

원본 `source/sheet_healing_potions.png` 는 3×2 시트다(위쪽 왼쪽부터 1~3단계 · 아래쪽 왼쪽부터 4~5단계). 화면용 5장은 이 시트를 잘라 외곽의 흰 배경을 투명하게 처리하고 512×512 RGBA 로 정규화한 것이다. 병 몸통의 부피가 단계마다 커진다.

**칸 배경은 그 규칙 밖이다** [2026-09-17 사용자 지시] — `slot.png` 한 장을 **칸 넷이 다 든다**. `potionArt` 가 축이 「어느 물약인가」라 틀리면 회복량을 잘못 읽는 반면, 이쪽은 **「여기에 물약이 들어간다」는 칸의 말**이라 티어를 안 가린다 (`empty/` 의 부위 실루엣과 같은 자리 · 조립은 `mock.js:POTION_SLOT_ART`). 찬 칸과 빈 칸은 **진하기**가 가른다 — 빈 칸 `.3` · 찬 칸 `.8` (28px 칸에서 테두리 실선/점선만으로는 덜 읽힌다). 티어 그림이 오면 찬 칸이 제 그림으로 바뀌고 이 배경은 빈 칸에만 남는다.

원본은 `source/Gemini_Generated_Image_ (2).png` 의 **r4c6** — 그 칸에는 Gemini ✦ 워터마크가 같이 들어 있었다. 병과 **안 닿아**(가로로 11px 떨어진 별개 연결요소) 지우개질 없이 **덩어리째 안 담는 것**으로 걷혔다 — 병 픽셀은 원본 그대로다. 코르크 마개(322px)는 병과 붙어 있어 같이 남긴다 — 크기로 거르면 마개가 날아간다.

### `empty/` — 미장착 슬롯의 부위 실루엣 [신설 2026-09-03]

```
icons_source/items/empty/
└── weapon · helmet · armor · gloves · boots · amulet · ring .png   ← 파일명 = equip_slot.csv 의 part
                                                             (부위 7종 전부 찼다 — 2026-09-17)
```

여기만 **축이 부위**(`equip_slot.csv:part`)다 — 위쪽 파일들이 `group_id`/`base_id` 인 것과 갈린다.
그래서 반지 두 칸(`ring1`·`ring2`)이 같은 그림 하나를 든다. 폴더를 가른 이유가 이것이다: 같은 폴더에 두면
`gloves.png`(부위)와 `gloves_1.png`(베이스)가 나란히 서서 **어느 축인지 파일명만 봐서는 못 읽는다.**

원본은 `source/Gemini_Generated_Image_ (2).png` — **4×6 = 24칸** 중 7칸을 부위로 썼다 [2026-09-17 · 이전 5종을 통째로 교체].
그림은 채도가 없는 회색이고, 화면에서 옅게 까는 것은 **CSS 가** 한다(`opacity`) — 파일에 굽지 않는다.

**이 시트만 누끼 절차가 다르다 — 배경이 어둡다.** 아래 「누끼」 절의 체커보드 팔로 읽기는 여기서 못 쓴다
(둥근 칸 타일과 바깥 판이 **다른 어둠**이라 flood fill 이 타일을 그림으로 삼킨다). 대신 **밝기로** 갈랐다:
그림 = 밝기 96 초과(판 29~33 · 타일 48~55 · 타일 베벨 72~79 · 아이콘 몸 200+) · 칸 경계는 **밝은 획이 없는 빈 골**에서 찾고
(균등 분할은 옆 칸 아이콘을 건드려 조각을 끌고 온다) · 둘러싸인 어두운 주머니는 25px 이상이면 배경이다(반지 구멍 · 갑옷 목 파임 · 손가락 사이).
그 뒤 침식 · 3px 색 번짐 · 페더 · 0.88 정규화는 `cut.py` 와 같다.

**해시 폴백을 쓰지 않는다** — 스킬 아이콘은 「제 그림은 아니어도 늘 같은 그림」이면 되지만, 부위는
**틀린 그림이 곧 틀린 정보**다(투구 칸에 장화가 뜨면 그 칸을 잘못 읽는다). 목록에 없는 부위는 옛 이모지로 남지만, 2026-09-17 로 **부위 7종이 다 차서** 빈 칸이 이모지로 떨어지는 일은 없다.

### 규격 — `icons/skills/` 와 같다

- 512×512 RGBA · **투명 배경** · 46~215KB (빈 칸 실루엣 7종이 46~73KB — 명암이 부드럽게 이어져 평면 음영보다 무겁다)
- **bbox 장변 = 512 × 0.88, 중앙 정렬.** 기존 스킬 4종의 실측(0.88~0.90)에 맞춘 값이다 — 원본 시트에서 창이 크게, 완드가 작게 그려져 있어도 화면에서는 같은 무게로 읽힌다
- **40~64px 에서 읽혀야 한다** (스킬 아이콘과 같은 근거 — 실제 칸이 그 크기다)

### 누끼 — 여기는 체커보드가 픽셀로 구워져 나온다

스킬 시트는 흰 배경이었지만 아이템 시트는 **체커보드 무늬가 그려져** 온다(알파는 전부 255). 그래서 절차가 다르다:

1. **체커 두 톤을 테두리에서 읽는다** — 무기 시트 192/236, 방어구 시트 207/254 로 **시트마다 다르다**. 무채색(채널 편차 ≤ 14) + 두 톤 사이 값이 배경 후보
2. 테두리에서 flood fill
3. **둘러싸인 주머니는 두 톤을 다 가질 때만 배경** — 판정의 핵심이다. 활 안쪽·석궁 삼각 공간·반지 구멍은 두 톤이 반반(평균 214)이라 배경이고, 검날·도끼날·오브의 회색 하이라이트는 **한 톤짜리**라 그림이다. 크기로 가르면(스킬 시트의 300px 규칙) 하이라이트가 21곳 뚫린다
4. 시트에 그려진 구분선(방어구 2×2 의 검은 십자)은 **테두리에 닿는 컴포넌트**로 걸러낸다. 칸 격자 대신 연결요소로 자르므로 칸 경계에 걸친 그림도 안 잘린다
5. 1px 침식으로 체커가 섞인 안티에일리어싱 링을 버리고 → 색을 3px 바깥으로 번지게 한 뒤 → **premultiplied LANCZOS** 로 축소 (건너뛰면 밝은 배경에서 흰 테두리가 보인다)

### 화면 연결 — 셋 다 걸려 있다

| 세트 | 어디에 | 조립하는 곳 |
|---|---|---|
| `empty/<part>.webp` | **캐릭터 탭 페이퍼돌의 빈 칸** (SCREEN_DESIGN §6) | `ui/mock.js:slotArt` |
| ~~`<group_id>.png` (무기 8)~~ **삭제 2026-09-17** | **착용 칸 · 가방 칸 · 제련소 목록·머리** (SCREEN_DESIGN §2) — `item.group` 이 곧 파일명이라 **제 그림이다**. ⚠ **본편 열 전부 베이스 그림이 서서 실칸에서는 안 쓰인다** — 아래 베이스 7장이 대신 뜬다. 무기군 그림은 **도감 「무기」 줄에만** 남았다 | `ui/mock.js:itemArt` |
| `weapon_base/<group>/*.webp` (본편 열 무기군 베이스 각 7) | 같은 칸들 — **개체마다 제 무기군의 7장 중 하나** [2026-09-10 · 둔기·창·활 2026-09-11 · 스태프·오브·십자가·성경·석궁 2026-09-14]. 개체가 든 `baseId` 의 그림이다(`weapon_base.csv` 가 드롭 때 굴린다 · **이름도 그 베이스**). `baseId` 가 없는 옛 개체만 **`uid`+무기군 해시**로 고른다 — **rng 가 아니라** 그리는 시각의 해시라 골든이 안 움직이고, uid 가 세이브에 남으므로 **한 개체는 평생 같은 무기**다. ⚠ 해시로 고른 옛 개체는 이름·툴팁이 무기군 이름이라 **그림과 이름이 어긋난다** | `ui/mock.js:itemArt` (`WEAPON_BASE_STEMS` — 무기군별 맵) |
| `item_base/<base_id>.webp` (갑옷 10 · 투구 10 · 장갑 7 · 신발 7 · 반지 3 · 목걸이 3) | 같은 칸들 — **개체가 든 `baseId` 의 그림** [2026-09-17]. 드롭 때 굴린 베이스 id 를 개체가 들고(`item.js:build`) 화면은 그대로 읽어, 퀼티드와 더스크 슈라우드가 다른 그림이다. ⚠ **옛 세이브의 방어구는 `baseId` 가 없어** 이모지로 떨어진다 — 새로 먹는 것부터 그림이 붙는다 | `ui/mock.js:itemArt` (`ITEM_BASE_ART_IDS`) |
| ~~반지 · 목걸이의 **넷째 이름**(`ring_4` · `amulet_4`)~~ **해소 2026-09-21** | 그림 없는 그 두 베이스를 `item_base.csv` 에서 **뺐다** — 「베이스 풀 = 설치된 그림」(item_design §1 · `dev/test.js` 단정이 양방향으로 지킨다). 이모지로 떨어지는 것은 이제 **옛 세이브의 개체**뿐이다 | — |

⚠ 화면에서 이 그림들은 **`<img>` 로 들어간다. CSS `background: url()` 이 아니다** — 상대 경로를 커스텀 프로퍼티에
담으면 `style.css` 기준(`/ui/assets/…`)으로 풀려 404 가 난다. 실제로 그렇게 짰다가 칸이 통째로 비었다.
스킬 아이콘이 `<img>` 인 것도 같은 문법이다.

---

*마지막 업데이트: 2026-10-18*
