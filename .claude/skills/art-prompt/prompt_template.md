# prompt_template — 발주 프롬프트 골격 · 금지어 · 안전 색

SKILL.md 1단계에서 편다.

> **지시문이 늘면 앵커의 지분이 준다.** 생성기는 첨부한 그림과 쓴 글을 **경쟁시킨다** — 글이 이긴 만큼 우리 세트에서 멀어진다.
> 그래서 기본값은 **지시문 8줄 · 부정문 2개**이고, 나머지는 §1-2 에서 **실측이 틀렸을 때 한 줄씩 되살린다.** [사용자 지시 2026-09-08]

## 0. 첨부

| 인물 | 첨부 | 이유 |
|---|---|---|
| 갑옷 · 투구 | `faces/example/gladiator_helm.png` | 외곽선 굵기 · 음영 단수 · 닫힌 투구의 눈높이 |
| 맨머리 · 맨몸 · 후드 · 천 | `faces/example/barbarian.png` | 두상 비율 65% · 어깨폭 75% — SD 구도의 실측 기준 |
| 같은 종족이 이미 있다 | 그 그림도 함께 (해골이면 `skeleton_plain`) | 종족 고유의 골격·색을 나른다 |
| 애매하면 | 둘 다 | 해가 없다 |

⚠ **무기·손이 들어간 앵커는 붙이지 않는다** — `skeleton_soldier` · `skeleton_archer` 처럼 손에 무기를 든 옛 그림을 붙이면 그 구도가 따라온다.
**첨부가 곧 스타일 지시다** — 붙일 그림을 고르는 데 시간을 쓰고, 글로 설명하는 데는 쓰지 않는다.

## 1. 골격 — 기본형 (지시문 8줄). **앵커를 첨부했으면 무조건 이 판**

⚠ **사용자에게 줄 때는 `[ ]` 를 다 채운 전문을 코드블록 하나로 준다** — 조각·diff·「이 줄만 바꾸세요」 금지(SKILL.md 작업 규칙).

```
Match the attached portraits exactly — same proportions, same outline weight,
same flat shading, same dark palette, same bust framing and gaze.

2048x2048 sheet, 2x2 grid, four bust portraits, thin black gridlines, solid pure
green #00FF00 background, no text anywhere. Nothing on the characters may be
bright or saturated green. Leave background margin on all sides — the figures
must not touch an edge.

[소재 — 1~2줄. 원형 + 넷을 가르는 축 한 줄. 필요하면 소재 고유의 hex 2~3개]

1. [변주 — 실루엣 한 마디 + 강조색 hex]
2. [변주]
3. [변주]
4. [변주 — 가장 덜 중요한 것. 워터마크 자리]
```

**이게 전부인 이유** — 남긴 것은 **첨부한 그림 안에 없는 넷**뿐이다: 시트 규격(그림에 없다) · 초록 계약(앵커는 초록 배경이 아니다) · 여백(앵커는 이미 잘려 있다) · 소재(무엇을 그릴지).

**적지 않는다 — 앵커가 나른다**: 두상 비율 · 얼굴 생김새 · 외곽선 굵기 · 음영 단수 · 눈 처리 · 손·무기 유무 · 디테일 수준 · 자세.

**부정문은 통틀어 2개까지** — `no text` · `no saturated green` 이 이미 둘이다. 부정문은 잘 안 지켜지면서 그 대상을 화면에 불러온다(「no cracks」가 금 간 두개골을 부른다).

**넣으면 안 되는 것** — 디테일 수치 제한(`3 tones` · `under ten colors`) · 「사실적」을 암시하는 단어(`realistic` · `adult proportion` · `head no more than a third`).

## 1-2. 안 닮게 나왔을 때 — 한 번에 한 줄만 되살린다

기본형으로 뽑아 [measure.py](measure.py) 로 잰 뒤, **틀린 지표에 해당하는 줄 하나만** 넣어 다시 뽑는다.
이 표가 길어 보이는 건 **선택지이기 때문이지, 다 넣으라는 뜻이 아니다** — 여러 줄을 한꺼번에 넣으면 그게 옛 장문이다.

| 실측 증상 | 되살릴 줄 (하나만) |
|---|---|
| 두상 47% — 머리가 작다 · 사실 비율로 흘렀다 | `The head is huge and the body small, like the references — the head is about two thirds of the bust.` |
| 얼굴이 길고 말랐다 · 주름·광대선 | `Broad simple face, wide cheeks, short chin, almost no interior lines.` |
| 어깨가 프레임에 닿는다 (100%) | 여백 줄을 강조형으로: `The figures MUST NOT touch any edge.` |
| 몸 시작 61% — 견갑이 턱까지 | `The whole neck stays visible with background on both sides.` |
| 눈에 흰자·홍채가 생겼다 | `Eyes are solid black shapes.` |
| 손·무기가 들어왔다 | `No weapons, no hands. Worn gear only.` |
| 후드 속 얼굴이 검은 구멍 | `The face inside the hood is fully lit, never a dark void.` |
| 문장에 글자가 새겨졌다 | 그 자리에 `plain shape, no lettering` |
| 넷이 같은 사람 | 지시를 **더하는 게 아니라** 소재의 축 한 줄을 고친다 (SKILL.md 원칙 6) |

⚠ **되살린 줄은 그 세트에서만 쓴다.** 골격에 영구히 붙이지 않는다 — 다음 원형에서는 다시 필요 없어지고, 붙여 두면 그대로 장문으로 되돌아간다.

## 1-3. 장문형 — 앵커를 첨부 못 할 때만

사용자가 그림을 못 붙이는 상황(다른 도구 · API)에서만 §1-2 표의 줄을 전부 골격에 붙여 쓴다.
**Gem 채팅은 앵커를 붙일 수 있으므로 이 길은 쓰지 않는다.**

## 2. 금지어 표 — 단어 하나가 지표 하나를 무너뜨린다

| 쓰지 말 것 | 무너지는 지표 | 대신 |
|---|---|---|
| `pauldron` · `oversized` · `heavy` · `bulky` · `flared` · `spiked` | 어깨폭 88~100% | `thin shoulder plates` · `sits flat, below the collarbone` |
| `gorget` · `chainmail collar` · `high collar` · `mantle` · `cowl` | 몸 시작 61% (턱까지) | 목은 비운다: `bare neck` · `whole neck visible` |
| `soot` · `rust` · `dried blood` · `grime` · `scratches` · `dents` | 색 수 78~91 · 경계 25% | 빼고 `dark desaturated palette` 로 음침함을 낸다 |
| `studded` · `beaded` · `stitching` · `stubble` · `strands of hair` · `fur` | 색 수 · 경계밀도 | `plain leather` · `one solid shape` · `thin fur collar` 까지만 |
| `head no more than a third` · `realistic` · `human proportion` | 두상 47% (SD 붕괴) | `head about two thirds of the bust` · `skull big and round` |
| `wear and grime` · `battle-worn` · `weathered plate` | 디테일 폭발 | `grim` · `hard-used face` (얼굴 표정으로 옮긴다) |
| `emblem` · `sigil` · `badge` · `crest` | 글자가 새겨진다 | `plain shape, no lettering` 을 그 자리에 덧붙이거나 뺀다 |
| `glowing` · `radiant` · `shining` | 그라디언트 · 플랫 붕괴 | 발광은 없다. 강조색 단색으로 |
| 순색 초록 계열 (`forest green` · `emerald` · `leaf`) | 누끼에 뚫림 | §3 |
| 얇은 것 (`thin lines` · `arrow shafts` · `fine chain`) | 외곽선보다 가늘어 40px 에서 사라지고, 디테일로 잡힌다 | `chunky flat shapes, never thin lines` |

## 3. 키잉 안전 색 표 — `g − max(r,b)` 가 40 미만이면 안전

키잉이 `g − max(r,b)` 40~120 을 알파 경사로 쓴다([cartoon/README.md](../../../src/assets/art/faces/cartoon/README.md)). 25~39 는 경계(안티에일리어싱 링에서 새는 수가 있다).

| 색 | hex | 판정값 | |
|---|---|---|---|
| 숲 초록 | `#2d6a2d` | **61** | ✕ 뚫린다 |
| 잎 초록 | `#4c9a4c` | **78** | ✕ 뚫린다 |
| 올리브 드랩 | `#6b6b3a` | 0 | ○ |
| 짙은 올리브 | `#3c3f24` | 3 | ○ |
| 이끼 회록 | `#4a5a3a` | 16 | ○ |
| 세이지 | `#7d8a6a` | 13 | ○ |
| 카키 | `#8f855c` | −10 | ○ |
| 청록 | `#0d7a7a` | 0 | ○ (b ≈ g 라 안전) |
| 호박 | `#c8901e` | −56 | ○ |
| 러셋 · 녹빛 주황 | `#6a3a24` · `#a04a20` | −48 · −86 | ○ |
| 진홍 · 금 | `#8a2a2a` · `#c8901e` | 음수 | ○ |
| 청회 · 남색 | `#2c3a52` · `#2a3a7a` | −24 · −64 | ○ |
| 근검정 | `#1a1a1e` | −4 | ○ |

새 색을 쓰면 판정값을 계산해 붙인다:

```python
h='#4a5a3a'; r,g,b=int(h[1:3],16),int(h[3:5],16),int(h[5:7],16); print(g-max(r,b))
```

## 4. 원형별 소재 블록 (골격의 `[소재]` 자리 — **2줄 안에 끝낸다**)

소재 줄은 「무엇을 그릴지 + 넷을 가르는 축」만이다. 분위기·디테일·팔레트는 앵커가 나르므로 적지 않는다.

**판금 (팔라딘 · 기사)**
```
Four grim crusader knights in the mood of Diablo 2, in worn close-fitting plate.
Every head is bare — hair shape is the only thing that tells the four apart.
```

**맨머리 (바바리안 · 아마존 · 사냥꾼)**
```
Four [부족/야만] warriors, sun-darkened skin and flat war paint.
Heads bare — the hair is the silhouette, so make all four clearly different.
```

**후드 (레인저 · 방랑자)**
```
Four hooded forest rangers, a deep cloth hood pulled forward.
The hood shape is the only thing that tells the four apart.
```

**해골 (언데드)**
```
Four undead skeletons risen from a graveyard, bone #cfc4a0 over dark steel #5a6270.
What sits on the head is the only thing that tells the four apart.
```
⚠ 해골은 `hd/sh` 가 90~100 으로 나온다 — **두개골이 곧 실루엣**이라 후드 인물과 같은 예외다. 이 숫자로 재발주하지 않는다.

### 자주 쓰는 한 줄 (필요할 때만 붙인다)

- 화살통: `a quiver with EXACTLY THREE ARROWS — three chunky flat fletchings rising just above one shoulder, never thin lines, not past the top of the head`
- 후드로 얼굴 가리기는 **각도로**: `The head is TILTED DOWN so the front rim of the hood cuts across the face at eye level; nose, mouth and jaw stay in view.` — `at eye level` 을 `just below/above the eyes` 로 바꿔 가림 정도를 조절한다

## 5. 타일 배치 — 넷을 가르는 축

- **한 세트 = 축 하나.** 판금은 머리 모양, 맨머리는 머리카락, 후드는 후드 형태(뾰족/둥글고 뒤로/낮고 평평/비대칭). 축이 둘 이상이면 세트가 흩어지고, 없으면 같은 사람이 넷 나온다
- **타일 한 줄은 한 마디** — 실루에을 하나 + hex 하나. 두 줄을 넘으면 그 타일이 앵커를 이긴다(§1)
- **강조색은 타일마다 다르게, hex 로.** 안 정하면 넷이 같은 진홍으로 나온다
- **같은 인물의 색 변형 4종**을 원하면 얼굴·자세를 고정하고 후드/망토 색만 hex 로 갈라 준다(색상환을 벌린다 — 검정 · 적갈 · 청회 · 카키)
- **4번 = 버릴 변주.** 우하단이 워터마크 자리다
- 나이 변주는 `early twenties / thirties / forties / sixties` 정도로. 「할머니」를 빼 달라는 지시가 있었으므로(2026-09-06) 노년 여성은 사용자 확인 없이 넣지 않는다

---
*마지막 업데이트: 2026-09-08 (**지시문 감량 — 골격 12줄 → 8줄 · 부정문 7개 → 2개** [사용자 지시]. 산출물이 기존 세트와 안 닮는 원인이 「지시가 앵커를 이긴다」였다. 삭제가 아니라 강등 — 옇 골격의 구도·해부 지시는 **§1-2 복구 사다리**(실측 증상별로 한 줄씩 되살린다)로 내렸고, 앵커 미첨부 상황은 §1-3 장문형으로 남겼다. §0 에 「무기·손 들어간 앵커는 붙이지 않는다」 · §4 소재 블록 2줄 제한 + 해골 블록 신설(hd/sh 90~100 예외) 추가) · 2026-09-06 (최초 작성)*
