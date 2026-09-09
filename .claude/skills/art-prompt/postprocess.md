# postprocess — 격자 절단 · 키잉 · 여백 정규화 · 설치

SKILL.md 4~5단계에서 편다. 키잉의 **원리와 이력은 [cartoon/README.md](../../../src/assets/art/faces/cartoon/README.md) · [example/README.md](../../../src/assets/art/faces/example/README.md) 가 SSOT** — 여기는 그대로 돌릴 수 있는 코드와 그 문서에 없는 규칙(74% 패딩)만 적는다.

## 0. 어떤 절차인지 먼저 가른다

| 원본 배경 | 절차 | 문서 |
|---|---|---|
| **초록 `#00FF00`** (현행 Gem 발주) | 아래 §2 키잉 | 여기 |
| 회색 단색 (옛 기사·해골 시트) | 중성 회색 flood fill + barrier 7px 팽창 | example/README.md 「누끼 작업 메모」 |
| 어두운 텍스처 (검투사 시트) | **미해결** — 외곽선이 배경보다 어두워 기존 판정식이 안 통한다 | example/README.md ⚠ 절 |
| 흰 배경 / 체커보드 | 아이콘 절차 | src/assets/art/README.md `icons/` |

## 1. 시트 격자 좌표 (2048² · 2×2 · 검정 격자선)

격자선은 `x/y ≈ 1013~1035`(폭 ~16~22px, 시트마다 몇 px 흔들린다). 타일은 격자 쪽만 안쪽으로 깎아 정사각을 유지한다:

```python
TILES = {'TL': (0, 0, 1013, 1013), 'TR': (1035, 0, 2048, 1013),
         'BL': (0, 1035, 1013, 2048), 'BR': (1035, 1035, 2048, 2048)}   # BR = 워터마크, 버린다
```

격자선 위치가 다르면 `np.array(sheet)[1024].mean(1)` 처럼 한 줄의 밝기를 찍어 검정 띠를 찾는다. 격자가 없는 시트(인물이 칸 경계를 넘는 경우)는 연결요소로 자른다 — `icons/items/` 절차.

## 2. 초록 키잉 (despill 포함)

`g − max(r,b)` 40~120 을 알파 경사로. 인물이 저채도라 오검출이 구조적으로 없다(순색 초록만 없으면 — prompt_template §3).

```python
import numpy as np
from PIL import Image

def key_green(tile):                                  # tile: RGBA, 불투명 초록 배경
    a = np.array(tile.convert('RGBA')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    d = g - np.maximum(r, b)
    alpha = np.clip((120 - d) / 80 * 255, 0, 255)     # d<=40 → 255, d>=120 → 0
    a[:, :, 1] = np.where(d > 0, np.maximum(r, b), g)  # despill — 초록이 빨강·파랑을 넘지 못하게
    a[:, :, 3] = alpha
    return Image.fromarray(a.astype(np.uint8))
```

⚠ 축소는 **premultiplied** 로 해야 한다 — 투명 픽셀의 RGB 가 번져 테두리가 생긴다. 아래 §3 이 그 순서를 지킨다.

## 3-0. ⚠ 몬스터는 **원형 마스크**에 들어간다 — 어깨가 아니라 **얼굴**로 맞춘다 (2026-09-10)

`style.css` 의 `.face` 는 **원형 + `object-fit: cover`** 다(몬스터 전용 · 영웅은 `.hero-face` 사각 `contain`).
가장자리는 어차피 잘리므로 어깨폭을 맞출 이유가 없고, **원 안에서 얼굴이 어디에 얼마만 하게 앉는가**만 보인다.
09-10 에 인간 3종 + 해골 3종을 이 기준으로 다시 앉혔다 — 그전에는 여섯 장이 전부 **오른쪽으로 8~35px 밀려** 있었고
(§3 이 bbox 중심으로 맞춘다), 망토가 넓은 지휘관은 머리가 보병의 73% 까지 작아져 있었다.

**규칙** — ① **얼굴(머리) 크기를 여섯 장이 같게** ② **눈높이를 한 줄로**(캔버스 y ≈ 240) ③ **얼굴 중심을 x = 256 에**.
④ 흉상 아래·옆이 캔버스 밖으로 잘리는 것은 **정상**이다(원이 자른다).

**자동 검출은 못 믿는다** — 머리폭을 알파 실루엣으로 재면 **머리카락이 섞여**(1201) 작아지고, 밝은 영역으로 재면
**해골은 투구가 뼈색이라** 같이 잡힌다. 화살통은 눈 검출을 계속 오염시킨다. 그래서 절차는 **격자를 씌워 눈으로 읽고**
배율·눈좌표를 표에 박는다 → [align_faces.py](align_faces.py) 의 `SPEC`. 새 시트를 넣을 때 그 표에 한 줄 더한다.

```python
python - <<'X'
import sys; sys.path.insert(0,'.claude/skills/art-prompt')
from align_faces import build, SPEC
for n in SPEC:
    img, idx = build(n); img.save('src/assets/art/faces/cartoon/monster_%d.png' % idx)
X
```

⚠ **`measure.py` 의 `shldr` · `body` 대역(71~75 · 78~89)은 옛 74% 규칙 기준이다** — 이 절차로 만든 파일은
`shldr` 69~85 로 나오고 그것이 정상이다. 얼굴 정렬 결과는 원형 몽타주를 그려서 눈으로 본다.

## 3. 여백 정규화 — **어깨폭 74%** 로 (2026-09-06 · **영웅 전용으로 축소** 09-10)

앵커 실측 어깨폭 71~75% 의 가운데. bbox 로 자르고, 어깨폭이 캔버스의 74% 가 되게 스케일하고, **가로 가운데 · 세로 아래 붙임**(흉상은 어깨가 프레임 바닥에 닿는 것이 문법)으로 512² 에 앉힌다.

```python
def normalize(img, target=0.74, S=512):
    a = np.array(img); m = a[:, :, 3] > 40
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    c = img.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))
    shoulder = m.sum(1).max()                          # 가장 넓은 행 = 어깨
    k = (S * target) / shoulder
    nw, nh = round(c.width * k), round(c.height * k)
    # premultiply → LANCZOS → unpremultiply
    ca = np.array(c).astype(float); al = ca[:, :, 3:4] / 255
    pm = Image.fromarray(np.concatenate([ca[:, :, :3] * al, ca[:, :, 3:4]], 2).astype(np.uint8))
    pm = np.array(pm.resize((nw, nh), Image.LANCZOS)).astype(float)
    al2 = np.maximum(pm[:, :, 3:4], 1)
    out = np.concatenate([np.clip(pm[:, :, :3] * 255 / al2, 0, 255), pm[:, :, 3:4]], 2).astype(np.uint8)
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(Image.fromarray(out), ((S - nw) // 2, S - nh))
    return canvas
```

세로가 512 를 넘으면(`nh > S`) 인물이 세로로 긴 것 — 위를 자르지 말고 `target` 을 낮춰 다시 맞춘 뒤 보고한다.

⚠ **[src/assets/art/README.md](../../../src/assets/art/README.md) 「영웅 초상 여백 정규화 (09-03)」 는 반대 방향(여백을 걷어 칸을 채운다)이다.** 그 규칙은 지금은 삭제된 09-03 세트(가로 57~88%)를 위한 것이었고, 현행 5장(검투사·바바리안·로마군)은 그 절차 없이 71~75% 에 앉아 있다. **현행 기준은 74% 고정이다** — README 의 그 절은 갱신 대상(미수행 · 2026-09-06).

## 4. 한 번에 — 시트 → 4장

```python
sheet = Image.open('src/assets/art/faces/example/source_sheet_<이름>.png').convert('RGBA')
for tag, box in TILES.items():
    if tag == 'BR': continue                            # 워터마크
    out = normalize(key_green(sheet.crop(box)))
    out.save('src/assets/art/faces/example/<설명>_%s.png' % tag)   # SSOT — 내용으로 이름
```

이어서 `python .claude/skills/art-prompt/measure.py <만든 파일들>` 로 `shldr` 가 73~75 에 앉았는지 확인한다. `hd/sh` 는 이 단계로 안 바뀐다(불변량).

## 5. 설치

1. **SSOT** — `faces/example/<설명>.png` (예: `archer_hood_black.png`). 파일명은 내용으로. 시트 원본 `source_sheet_<이름>.png` 도 남긴다
2. **사본** — `faces/cartoon/hero_<직업id>_<k>.png` 로 복사 [개정 2026-09-07]. `직업id` 는 `data/class.csv` 의 id(그림이 읽히는 직업), `k` 는 그 직업 풀의 다음 번호(추가) 또는 교체할 번호
3. **`src/ui/mock.js` `HERO_FACES[<직업id>]`** — 추가면 그 직업의 장수를 올린다. **늘리는 방향은 무해하다** (2026-09-06 저장형 전환 뒤 얼굴은 세이브에 박혀 있다 — 새로 태어나는 영웅의 굴림 범위만 넓어진다). ⚠ **줄이는 방향만** 영향이 있다: 범위를 넘은 저장값은 그 직업 풀 안에서 접힌다. 사용자에게 추가/교체를 먼저 묻는다. 몬스터는 `monster_<idx>.png` 라 직업 축이 없다
4. **문서** — [cartoon/README.md](../../../src/assets/art/faces/cartoon/README.md) `hero_*` 절의 장수·출처 · [example/README.md](../../../src/assets/art/faces/example/README.md) 영웅 표에 한 줄 · 두 문서 꼬리 `*마지막 업데이트*` 최신을 앞에
5. 브라우저 확인 — 서버가 `serve.py`(no-store) 면 새로고침으로 충분. `python -m http.server` 면 같은 파일명 교체가 캐시에 먹힌다 → 하드 리로드

## 6. 크롭·스케일로 못 고치는 것 (다시)

| 증상 | 여기서 고쳐지나 |
|---|---|
| 어깨가 프레임에 닿는다 | ○ §3 |
| 몸이 높이 올라와 있다 | △ 일부 — 축소로 몸 시작 높이는 내려가지만 위 여백이 30% 뜬다 |
| 머리에 비해 몸이 크다 (머리폭/어깨폭) | **✕ 불변량.** 재발주 |
| 얼굴이 길고 말랐다 · 너무 섬세하다 | ✕ 재발주 |
| 후드 속이 검은 구멍 | ✕ 재발주 (그 타일만) |

---
*마지막 업데이트: 2026-09-10 (**§3-0 신설 — 몬스터는 원형 마스크라 얼굴로 맞춘다** · 어깨폭 74% 는 영웅(사각 `contain`) 전용으로 축소. 계기는 인간 3종 설치 뒤 「좌우가 안 맞고 크기도 제각각」 지적 — 실측해 보니 여섯 장이 **오른쪽으로 8~35px** 밀려 있었고 머리폭이 206~283 으로 벌어져 있었다. 자동 검출 셋(알파 머리폭 · 밝은 얼굴 · 눈 검출)이 각각 머리카락·뼈색 투구·화살통에 걸려 실패해서, **격자를 읽어 표에 박는** `align_faces.py` 로 갔다) · 2026-09-06 (최초 작성 — 74% 패딩 규칙 신설 · README 09-03 「여백 걷기」 와의 충돌 명시)*
