# -*- coding: utf-8 -*-
"""Mono install pass for mastery icons: black silhouette -> #d8d8e6, white gaps -> transparent.
Same as advance/source/tone.py with the accent branch removed — the screen tints the alpha with the board colour
(app.js:masteryIconHtml), so only the alpha matters. Input = cut.py output (512 RGBA).

  python mono.py <cut dir> <out dir> [<montage prefix>]
"""
import sys, os, glob
import numpy as np
from PIL import Image

GREY = (216, 216, 230)


def mono(src, dst):
    a = np.array(Image.open(src).convert('RGBA')).astype(float) / 255.0
    al = a[..., 3] * np.clip(1.0 - a[..., :3].max(-1), 0, 1)   # black opaque, white gone, AA in between
    out = np.zeros(a.shape[:2] + (4,), np.uint8)
    out[..., :3] = GREY
    out[..., 3] = (al * 255).round().clip(0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(dst)


def montage(files, out, size, bg=(22, 22, 36), cols=9, pad=8):
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (size + pad) + pad, rows * (size + pad) + pad), bg)
    for i, f in enumerate(files):
        im = Image.open(f).convert('RGBA').resize((size, size), Image.LANCZOS)
        r, c = divmod(i, cols)
        sheet.paste(im, (pad + c * (size + pad), pad + r * (size + pad)), im)
    sheet.save(out)


if __name__ == '__main__':
    src_dir, dst_dir = sys.argv[1], sys.argv[2]
    os.makedirs(dst_dir, exist_ok=True)
    outs = []
    for f in sorted(glob.glob(os.path.join(src_dir, '*.png'))):
        d = os.path.join(dst_dir, os.path.basename(f))
        mono(f, d)
        outs.append(d)
    if len(sys.argv) > 3:
        montage(outs, sys.argv[3] + '_40.png', 40)
        montage(outs, sys.argv[3] + '_96.png', 96)
    print('mono', len(outs))
