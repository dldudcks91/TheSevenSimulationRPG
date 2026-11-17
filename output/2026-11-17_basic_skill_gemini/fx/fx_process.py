# -*- coding: utf-8 -*-
"""Gemini magenta 3x3 effect sheet -> keyed alpha -> 9 cells (whole cell, 256 RGBA) named by fx file key.
  python fx_process.py sheets/<key>_<n>.png   -> cut/<key>_<n>/<file>.png + cut/<key>_<n>/_keyed.png
Keying: background M = (255,0,255); alpha = 1 - (min(R,B) - G)/255; colour unmixed as (P - (1-a)M)/a.
Cells: same boundary rule as scripts/build_darktoon_completion_fx.py (gap nearest the third line), whole cell -> 256."""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sheet = sys.argv[1]
tag = os.path.splitext(os.path.basename(sheet))[0]
key = tag.rsplit('_', 1)[0]
names = json.load(open(os.path.join(HERE, 'fx_map.json'), encoding='utf-8'))[key]

p = np.array(Image.open(sheet).convert('RGB')).astype(float)
H, W = p.shape[:2]
# Gemini sparkle watermark: semi-transparent white 4-point star at the bottom-right (alpha map from magenta corners)
wm = np.load(os.path.join(HERE, 'wm_alpha.npy'))[..., None]
c = p[H - 230:H, W - 230:W]
p[H - 230:H, W - 230:W] = np.clip((c - wm * 255.0) / np.maximum(1 - wm, 0.2), 0, 255)
M = np.array([255.0, 0.0, 255.0])
m = np.minimum(p[..., 0], p[..., 2]) - p[..., 1]
a = 1.0 - np.clip(m / 255.0, 0, 1)
a[a < 0.04] = 0
a3 = np.maximum(a[..., None], 1e-3)
f = np.clip((p - (1 - a[..., None]) * M) / a3, 0, 255)
rgba = np.dstack([f, a * 255]).round().astype(np.uint8)
rgba[a == 0] = 0
img = Image.fromarray(rgba, 'RGBA')
out = os.path.join(HERE, 'cut', tag)
os.makedirs(out, exist_ok=True)
img.save(os.path.join(out, '_keyed.png'))


def boundaries(alpha, axis):
    projection = (alpha > 224).mean(axis=axis)
    length = len(projection); step = length / 3
    smoothed = np.convolve(projection, np.ones(5) / 5, mode='same')
    cuts = [0]
    for i in (1, 2):
        intended = round(i * step)
        lo, hi = round(intended - step * .22), round(intended + step * .22)
        values = smoothed[lo:hi]
        cand = np.flatnonzero(values <= values.min() + .004) + lo
        runs = np.split(cand, np.flatnonzero(np.diff(cand) > 1) + 1)
        run = min(runs, key=lambda r: min(abs(r - intended)))
        cuts.append(round(float((run[0] + run[-1]) / 2)))
    return cuts + [length]


alpha = rgba[..., 3]
rows = boundaries(alpha, 1)
for i, name in enumerate(names):
    x, y = i % 3, i // 3
    cols = boundaries(alpha[rows[y]:rows[y + 1]], 0)
    crop = img.crop((cols[x], rows[y], cols[x + 1], rows[y + 1]))
    side = max(crop.size)                                  # square the cell without moving the art
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
    sprite = sq.convert('RGBa').resize((256, 256), Image.Resampling.LANCZOS).convert('RGBA')
    sa = np.asarray(sprite)[..., 3]
    edge = np.concatenate([sa[0], sa[-1], sa[:, 0], sa[:, -1]])
    sprite.save(os.path.join(out, name.replace('@', '_') + '.png'))
    print('%-28s cell %s coverage %.3f edge %.3f' % (name, (cols[x], rows[y], cols[x + 1], rows[y + 1]), (sa > 16).mean(), (edge > 224).mean()))
