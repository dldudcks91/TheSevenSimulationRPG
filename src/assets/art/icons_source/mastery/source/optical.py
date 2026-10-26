# -*- coding: utf-8 -*-
"""Optical-size pass for mastery icons: shrink each icon until it reads as big as the wrath board.

Every icon was installed at the same long side (0.88), but thin subjects (wrath daggers) cover far less of the
cell than solid ones (gluttony pots), so the wrath board looked small and the rest looked big (2026-10-24 user
「분노수준으로 줄여줘」). Optical size O = long_side^0.3 x coverage^0.35 (coverage = mean alpha over the canvas) —
between "same box" and "same ink": matching ink alone made solid blobs look too small. O scales linearly with a
uniform resize, so an icon above TARGET is scaled by TARGET / O about its bbox centre and lands exactly on it;
one at or below is left alone. TARGET is fixed (mean O of the six wrath icons before the pass), so running the
pass again changes nothing.

  python optical.py [--write]      (dry run prints the scale per file)
"""
import glob, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SIZE = 512
TARGET = 0.5185   # mean O of sin_wrath_* on 2026-10-24, before the pass
# Old ring art nobody reads (README 「안 읽히는 옛 고리 그림」) — left out of the pass
SKIP = {'sin_t1_atkspeed', 'sin_t1_damage', 'sin_t1_hp', 'cls_t2_weapon_damage'}


def bbox(im):
    return im.getchannel('A').point(lambda v: 255 if v > 0 else 0).getbbox()


def coverage(im):
    return np.asarray(im.getchannel('A'), float).sum() / 255.0 / (im.width * im.height)


def optical(im):
    b = bbox(im)
    return (max(b[2] - b[0], b[3] - b[1]) / im.width) ** 0.3 * coverage(im) ** 0.35


def files():
    out = []
    for d in ('sin', 'class'):
        for f in sorted(glob.glob(os.path.join(ROOT, d, '*.png'))):
            if os.path.splitext(os.path.basename(f))[0] not in SKIP:
                out.append(f)
    return out


def shrink(im, s):
    box = bbox(im)
    crop = im.crop(box)
    w, h = max(1, round(crop.width * s)), max(1, round(crop.height * s))
    crop = crop.resize((w, h), Image.LANCZOS)
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    canvas = Image.new('RGBA', im.size, (0, 0, 0, 0))
    canvas.paste(crop, (round(cx - w / 2), round(cy - h / 2)), crop)
    return canvas


if __name__ == '__main__':
    write = '--write' in sys.argv
    n = 0
    for f in files():
        im = Image.open(f).convert('RGBA')
        assert im.size == (SIZE, SIZE), f
        s = min(1.0, TARGET / optical(im))
        if s > 0.99:
            continue
        n += 1
        print(f'{os.path.relpath(f, ROOT):48s} O {optical(im):.3f} -> scale {s:.3f}')
        if write:
            shrink(im, s).save(f)
    print(('wrote' if write else 'would shrink'), n)
