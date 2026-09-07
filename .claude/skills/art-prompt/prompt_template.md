# prompt_template — 발주 프롬프트 골격 · 금지어 · 안전 색

SKILL.md 1단계에서 편다. **짧게 쓴다** — 앵커 첨부가 스타일·디테일·음영을 나르므로, 프롬프트는 앵커가 못 나르는 4가지(구도 숫자 · 초록 계약 · 시트 규격 · 소재)만 적는다.

## 0. 첨부

| 인물 | 첨부 | 이유 |
|---|---|---|
| 갑옷 · 투구 | `faces/example/gladiator_helm.png` | 외곽선 굵기 · 음영 단수 · 닫힌 투구의 눈높이 |
| 맨머리 · 맨몸 · 후드 · 천 | `faces/example/barbarian.png` | 두상 비율 65% · 어깨폭 75% — SD 구도의 실측 기준 |
| 애매하면 | 둘 다 | 해가 없다 |

`match the attached portrait's exact style` 은 앵커에 없는 것(구도 · 얼굴 크기)까지 맞추지 못한다 — 그래서 §1 의 구도 줄이 필요하다.

## 1. 골격 (그대로 복사해서 `[ ]` 만 채운다)

```
Match the attached portraits exactly — same outline weight, same flat shading,
same heavy dark mood, same framing and gaze.

The SKULL IS BIG AND ROUND like the references — a broad simple face with wide
cheeks and a short chin, drawn with almost no interior lines. NOT a long gaunt
adult face. No cheek lines, no brow furrows, no wrinkles.
Head huge, body small, shoulders barely wider than the head, body low in the frame.
Leave clear background margin on all sides — the figure must not touch any edge.
Eyes are solid black shapes.

2048x2048 sheet, 2x2 grid, four bust portraits, thin black gridlines, solid pure
green #00FF00 background, no text anywhere. Nothing on the characters may be bright
or saturated green.

[소재 — 2~4줄. 원형 · 분위기 · 공통 장비 · 넷을 가르는 축 한 줄]
No weapons, no hands, no props. Worn gear only.

1. [변주 — 한두 줄. 실루엣 + 강조색 hex]
2. [변주]
3. [변주]
4. [변주 — 가장 덜 중요한 것. 워터마크 자리]
```

**빼면 안 되는 줄** — `SKULL IS BIG AND ROUND` 문단(빠지면 사실 비율 얼굴로 흐른다) · `must not touch any edge`(빠지면 어깨 100%) · `#00FF00` + `no saturated green`(키잉 계약) · `no text`.

**넣으면 안 되는 것** — 디테일 수치 제한(`3 tones` · `under ten colors`) · 자세 지시(앵커 = 거의 정면, 살짝 틀어짐. 자세는 나중에 타일 단위로) · 「사실적」을 암시하는 단어(`realistic` · `adult proportion` · `head no more than a third`).

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

## 4. 원형별 소재 블록 (골격의 `[소재]` 자리)

**판금 (팔라딘 · 기사)**
```
Four holy knights in the mood of Diablo 2 — grim crusaders, not shining heroes.
Worn close-fitting plate, thin shoulder plates sitting low, bare neck. Stern faces.
Dark desaturated palette; one saturated accent per tile.
EVERY head is bare — no helmet, no coif, no hood. Hair shape and the small gear at
the shoulders are the only things that tell them apart.
```

**맨머리 (바바리안 · 아마존 · 사냥꾼)**
```
Four [부족/야만] warriors — bronze sun-darkened skin, bold flat war paint, leather
straps and bone. Heads bare; the hair is the silhouette, so make all four clearly
different. Dark desaturated palette; one saturated accent per tile.
```

**후드 (레인저 · 방랑자)**
```
Four hooded forest rangers: a deep pointed cloth hood pulled forward, thin
travelling cloak below, hard weathered stare. The face inside the hood is fully
lit and clearly visible — never a dark void.
Each carries a quiver with EXACTLY THREE ARROWS — three chunky flat fletchings
rising above one shoulder.
```
후드로 얼굴을 **가리고 싶으면 각도로**: `The head is TILTED DOWN so the front rim of the hood cuts across the face at eye level; nose, mouth and jaw stay in view.` — `at eye level` 을 `just below the eyes` / `just above the eyes` 로 바꿔 가림 정도를 조절한다.

## 5. 타일 배치 — 넷을 가르는 축

- **한 세트 = 축 하나.** 판금은 머리 모양, 맨머리는 머리카락, 후드는 후드 형태(뾰족/둥글고 뒤로/낮고 평평/비대칭). 축이 둘 이상이면 세트가 흩어지고, 없으면 같은 사람이 넷 나온다
- **강조색은 타일마다 다르게, hex 로.** 안 정하면 넷이 같은 진홍으로 나온다
- **같은 인물의 색 변형 4종**을 원하면 얼굴·자세를 고정하고 후드/망토 색만 hex 로 갈라 준다(색상환을 벌린다 — 검정 · 적갈 · 청회 · 카키)
- **4번 = 버릴 변주.** 우하단이 워터마크 자리다
- 나이 변주는 `early twenties / thirties / forties / sixties` 정도로. 「할머니」를 빼 달라는 지시가 있었으므로(2026-09-06) 노년 여성은 사용자 확인 없이 넣지 않는다

---
*마지막 업데이트: 2026-09-06 (최초 작성)*
