# -*- coding: utf-8 -*-
"""sheet_<id>.png → new/<설치 파일>.png (384x384 투명) — spec.PICKS 대로. 격자 · 키잉은 scripts/build_mage_drop_fx.py,
칸 끝 흐림(바깥 5%)은 scripts/build_advance_fx.py 와 같다. 미리보기용 PNG 다 — 게임 설치는 scripts/build_basic_clean_fx.py(`_clean.webp`)."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[4] / 'scripts'))
import build_mage_drop_fx as base  # noqa: E402
from spec import PICKS  # noqa: E402

OUT = HERE / 'new'


def cut(sheet, index):
    arr = np.asarray(Image.open(HERE / f'sheet_{sheet}.png').convert('RGB'))
    try:
        y0, y1, x0, x1 = base.cells(arr)[index - 1]
    except ValueError as e:
        h, w = arr.shape[:2]
        print(f'{sheet}: {e} — 사등분')
        y0, y1, x0, x1 = [(0, h // 2, 0, w // 2), (0, h // 2, w // 2, w), (h // 2, h, 0, w // 2), (h // 2, h, w // 2, w)][index - 1]
    sub = arr[y0 + base.INSET:y1 - base.INSET, x0 + base.INSET:x1 - base.INSET]
    side = min(sub.shape[:2])
    rgba = Image.fromarray(base.key(sub[:side, :side]))
    sprite = np.asarray(rgba.convert('RGBa').resize((base.SIZE, base.SIZE), Image.Resampling.LANCZOS).convert('RGBA')).copy()
    edge = np.arange(base.SIZE)
    ramp = np.clip(np.minimum(edge, edge[::-1]) / (base.SIZE * .05), 0, 1)
    sprite[..., 3] = (sprite[..., 3] * np.minimum.outer(ramp, ramp)).astype(np.uint8)
    return Image.fromarray(sprite)


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    for file, (sheet, index) in PICKS.items():
        if not (HERE / f'sheet_{sheet}.png').exists():
            print(file, 'no sheet', sheet)
            continue
        sp = cut(sheet, index)
        a = np.asarray(sp)[..., 3] > 16
        sp.save(OUT / f'{file}.png')
        print(f'{file}: fill {a.mean():.2f}')
