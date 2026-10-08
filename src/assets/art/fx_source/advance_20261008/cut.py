# -*- coding: utf-8 -*-
"""sheet_<id>.png → cut/<id>_<칸>.png (384x384 투명) — 격자 찾기 · 자홍 키잉은 scripts/build_mage_drop_fx.py 와 같다.

칸을 통째로 줄인다(알파 bbox 로 다시 가운데 맞추지 않는다 — 칸 안의 자리가 곧 초상 위의 자리다).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / 'scripts'))
import build_mage_drop_fx as base  # noqa: E402

OUT = HERE / 'cut'


def cut_sheet(sid):
    arr = np.asarray(Image.open(HERE / f'sheet_{sid}.png').convert('RGB'))
    try:
        cells = base.cells(arr)
    except ValueError as e:
        h, w = arr.shape[:2]
        print(f'{sid}: {e} — 사등분으로 자른다')
        cells = [(0, h // 2, 0, w // 2), (0, h // 2, w // 2, w), (h // 2, h, 0, w // 2), (h // 2, h, w // 2, w)]
    for i, (y0, y1, x0, x1) in enumerate(cells, 1):
        sub = arr[y0 + base.INSET:y1 - base.INSET, x0 + base.INSET:x1 - base.INSET]
        side = min(sub.shape[:2])
        rgba = Image.fromarray(base.key(sub[:side, :side]))
        sprite = rgba.convert('RGBa').resize((base.SIZE, base.SIZE), Image.Resampling.LANCZOS).convert('RGBA')
        # 칸 끝까지 뻗은 그림(히드라 목 · 메테오 꼬리)이 네모로 잘려 보이지 않게 바깥 5% 를 알파로 흐린다
        arr2 = np.asarray(sprite).copy()
        ramp = np.clip(np.minimum(np.arange(base.SIZE), np.arange(base.SIZE)[::-1]) / (base.SIZE * .05), 0, 1)
        arr2[..., 3] = (arr2[..., 3] * np.minimum.outer(ramp, ramp)).astype(np.uint8)
        sprite = Image.fromarray(arr2)
        a = np.asarray(sprite)[..., 3] > 16
        edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]).mean()
        sprite.save(OUT / f'{sid}_{i}.png')
        print(f'{sid}_{i}: fill {a.mean():.2f} · edge {edge:.2f}')


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    ids = sys.argv[1:] or sorted(p.stem[6:] for p in HERE.glob('sheet_*.png'))
    for s in ids:
        cut_sheet(s)
