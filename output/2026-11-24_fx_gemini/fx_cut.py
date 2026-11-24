# -*- coding: utf-8 -*-
"""Gemini magenta 3x3 effect sheet -> keyed alpha -> 9 cells named by fx_map.json (whole cell, 384 RGBA).
  python fx_cut.py sheets/<key>_<n>.png [...]   -> cut/<key>_<n>/<file>.png + _keyed.png + _report.txt
Watermark: the 11-17 sparkle alpha map (bottom-right 230 px) still fits Gemini 4 sheets.
Keying: Gemini's magenta is uneven (pink-to-magenta gradient), so the background is estimated locally —
magenta-like pixels -> block medians -> filled -> smooth map B. alpha = 1 - m(P)/m(B), m = min(R,B) - G;
colour unmixed as (P - (1-a)B)/a. Cells: gap nearest each third line (same rule as the 11-17 fx_process)."""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
WM = np.load(os.path.join(HERE, '..', '2026-11-17_basic_skill_gemini', 'fx', 'wm_alpha.npy'))[..., None]
NAMES = json.load(open(os.path.join(HERE, 'fx_map.json'), encoding='utf-8'))
OUT = 384
BLOCK = 16
LIGHT_PINK_ART = {'pri_summon'}


def unwatermark(p):
    H, W = p.shape[:2]
    c = p[H - 230:H, W - 230:W]
    p[H - 230:H, W - 230:W] = np.clip((c - WM * 255.0) / np.maximum(1 - WM, 0.2), 0, 255)


def background(p, light_pink_is_art=False):
    """Local background map. Gemini's magenta is uneven and turns a dull pink right around the art (a glow mixed in),
    so every pink/magenta-hued pixel counts as background and the map is built from 16 px blocks."""
    R, G, B = p[..., 0], p[..., 1], p[..., 2]
    bgmask = (R > G + 25) & (B > G + 25) & (np.abs(R - B) < 80)
    if light_pink_is_art:   # the summon circle is drawn in light pink — elsewhere light pink is Gemini's glow
        bgmask &= G < 150
    H, W = bgmask.shape
    gh, gw = H // BLOCK, W // BLOCK
    pm = p[:gh * BLOCK, :gw * BLOCK].reshape(gh, BLOCK, gw, BLOCK, 3).transpose(0, 2, 1, 3, 4).reshape(gh, gw, -1, 3)
    mm = bgmask[:gh * BLOCK, :gw * BLOCK].reshape(gh, BLOCK, gw, BLOCK).transpose(0, 2, 1, 3).reshape(gh, gw, -1)
    have = mm.mean(-1) > .3
    grid = np.where(have[..., None], (pm * mm[..., None]).sum(2) / np.maximum(mm.sum(-1), 1)[..., None], 0)
    known = have.copy()
    while not known.all():  # blocks under the art: repeated averaging of known neighbours
        acc = np.zeros_like(grid); cnt = np.zeros((gh, gw))
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
            sk = np.roll(known, (dy, dx), (0, 1)); sg = np.roll(grid, (dy, dx), (0, 1))
            acc += sg * sk[..., None]; cnt += sk
        new = (~known) & (cnt > 0)
        grid[new] = acc[new] / cnt[new][:, None]
        known |= new
    img = Image.fromarray(np.clip(grid, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
    return np.asarray(img.resize((W, H), Image.Resampling.BILINEAR)).astype(float)


def key(p, light_pink_is_art=False):
    Bg = background(p, light_pink_is_art)
    m = np.minimum(p[..., 0], p[..., 2]) - p[..., 1]
    mb = np.maximum(np.minimum(Bg[..., 0], Bg[..., 2]) - Bg[..., 1], 40)
    a = 1.0 - np.clip(m / mb, 0, 1)
    a = np.clip((a - .1) / .8, 0, 1)
    a3 = np.maximum(a[..., None], 1e-3)
    f = np.clip((p - (1 - a[..., None]) * Bg) / a3, 0, 255)
    # despill: semi-transparent fringes keep a pink cast — pull min(R,B) down to G there
    spill = np.clip(np.minimum(f[..., 0], f[..., 2]) - f[..., 1], 0, None) * (a < .9)
    f[..., 0] -= spill; f[..., 2] -= spill
    rgba = np.dstack([f, a * 255]).round().astype(np.uint8)
    rgba[a == 0] = 0
    return rgba


def boundaries(alpha, axis):
    projection = (alpha > 160).mean(axis=axis)
    length = len(projection); step = length / 3
    smoothed = np.convolve(projection, np.ones(9) / 9, mode='same')
    cuts = [0]
    for i in (1, 2):
        intended = round(i * step)
        lo, hi = round(intended - step * .2), round(intended + step * .2)
        values = smoothed[lo:hi]
        cand = np.flatnonzero(values <= values.min() + .004) + lo
        runs = np.split(cand, np.flatnonzero(np.diff(cand) > 1) + 1)
        run = min(runs, key=lambda r: min(abs(r - intended)))
        cuts.append(round(float((run[0] + run[-1]) / 2)))
    return cuts + [length]


def cut(sheet):
    tag = os.path.splitext(os.path.basename(sheet))[0]
    group = tag.rsplit('_', 1)[0]
    names = NAMES[group]
    p = np.array(Image.open(sheet).convert('RGB')).astype(float)
    unwatermark(p)
    rgba = key(p)
    pink_cells = [i for i, n in enumerate(names) if n.split('@')[0] in LIGHT_PINK_ART]
    rgba_pink = key(p, True) if pink_cells else None
    img = Image.fromarray(rgba, 'RGBA')
    out = os.path.join(HERE, 'cut', tag)
    os.makedirs(out, exist_ok=True)
    img.save(os.path.join(out, '_keyed.png'))
    alpha = rgba[..., 3]
    rows = boundaries(alpha, 1)
    lines = []
    for i, name in enumerate(names):
        x, y = i % 3, i // 3
        cols = boundaries(alpha[rows[y]:rows[y + 1]], 0)
        src = Image.fromarray(rgba_pink, 'RGBA') if i in pink_cells else img
        crop = src.crop((cols[x], rows[y], cols[x + 1], rows[y + 1]))
        side = max(crop.size)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
        sprite = sq.convert('RGBa').resize((OUT, OUT), Image.Resampling.LANCZOS).convert('RGBA')
        sa = np.asarray(sprite)[..., 3]
        edge = np.concatenate([sa[0], sa[-1], sa[:, 0], sa[:, -1]])
        sprite.save(os.path.join(out, name.replace('@', '_') + '.png'))
        lines.append('%-28s cell %-22s coverage %.3f edge %.3f' % (name, (cols[x], rows[y], cols[x + 1], rows[y + 1]), (sa > 16).mean(), (edge > 128).mean()))
    open(os.path.join(out, '_report.txt'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(tag); print('\n'.join(lines))


if __name__ == '__main__':
    for s in sys.argv[1:]:
        cut(s)
