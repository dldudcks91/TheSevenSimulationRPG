# -*- coding: utf-8 -*-
"""Gemini 결 대조 지표 — 투명 PNG 를 512 로 줄여 잰다.

python score.py <png|폴더> ...    (폴더면 그 안의 *.png 전부)
python score.py --gemini          (Gemini 기준 묶음)

grain  = 외곽선에서 떨어진 면 안쪽의 |라플라시안| 평균 — 매끈한 평면 채색이면 낮고, 긁힘 · 녹 · 붓결 노이즈가 많으면 높다
sat    = 인물 평균 채도(HSV S · 0~100)
shldr  = 가장 넓은 행 / 화면 폭 · top = 머리 위 빈 칸 / 화면 높이 · hd/sh = 머리폭 / 어깨폭 (measure.py 와 같은 정의)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

READY = Path(__file__).resolve().parent.parent / 'ready'
GEMINI = ['hero/knight_4', 'hero/knight_5', 'hero/priest_1', 'hero/archer_1', 'hero/warrior_3', 'hero/warrior_5',
          'hero/knight_1', 'hero/warrior_4', 'hero/mage_1', 'monster/1101', 'monster/1301', 'monster/1250']


def score(p):
    im = Image.open(p).convert('RGBA').resize((512, 512), Image.LANCZOS)
    a = np.array(im).astype(float)
    m = a[:, :, 3] > 200
    rgb = a[:, :, :3]
    g = rgb.mean(2)
    lap = np.abs(4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:])
    edges = np.array(Image.fromarray(g.astype(np.uint8)).filter(ImageFilter.FIND_EDGES)) > 60
    near = np.array(Image.fromarray((edges * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
    inner = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))) > 0
    flat = (inner & ~near)[1:-1, 1:-1]
    grain = lap[flat].mean() if flat.any() else float('nan')
    mx, mn = rgb.max(2), rgb.min(2)
    sat = ((mx - mn) / np.maximum(mx, 1))[m].mean() * 100
    w = m.sum(1).astype(float)
    ys = np.where(w > 0)[0]
    y0, y1 = ys[0], ys[-1]
    seg = w[y0:y1 + 1]
    hw = seg[:max(1, int(len(seg) * 0.55))].max()
    return dict(grain=grain, sat=sat, shldr=w.max() / 512 * 100, top=y0 / 512 * 100, hdsh=hw / w.max() * 100)


def show(name, d):
    print('%-28s grain %5.1f  sat %4.0f  shldr %4.0f  top %4.0f  hd/sh %4.0f'
          % (name[-28:], d['grain'], d['sat'], d['shldr'], d['top'], d['hdsh']))


def main(argv):
    paths = []
    if argv == ['--gemini']:
        paths = [READY / f'{n}.png' for n in GEMINI]
    for a in argv:
        p = Path(a)
        if p.is_dir():
            paths += sorted(p.glob('*.png'))
        elif p.suffix == '.png':
            paths.append(p)
    rows = []
    for p in paths:
        d = score(p)
        rows.append(d)
        show('/'.join(p.parts[-2:]), d)
    if len(rows) > 1:
        k = ('grain', 'sat', 'shldr', 'top', 'hdsh')
        print('%-28s %s' % ('median', '  '.join('%s %5.1f' % (x, np.median([r[x] for r in rows])) for x in k)))


if __name__ == '__main__':
    main(sys.argv[1:])
