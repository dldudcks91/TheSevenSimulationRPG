# -*- coding: utf-8 -*-
"""Two-tone install pass for advance icons (skill_tiles.md section 11):
black silhouette -> #d8d9e6, white gaps -> transparent, saturated accent kept as is.
Saturation 0.25..0.55 blends between the two. Input = cut.py output (512 RGBA)."""
import sys, os, glob
import numpy as np
from PIL import Image

GREY = np.array([216, 217, 230], float)


def tone(src, dst):
    a = np.array(Image.open(src).convert('RGBA')).astype(float)
    rgb, al = a[..., :3] / 255.0, a[..., 3] / 255.0
    mx, mn = rgb.max(-1), rgb.min(-1)
    # chroma (max - min), not HSV saturation: near-black noise like (10,5,8) has saturation 0.5 but chroma 0.02
    chroma = mx - mn
    t = np.clip((chroma - 0.12) / 0.18, 0, 1)          # 0 = black/white part, 1 = accent
    ach_al = al * np.clip(1.0 - mx, 0, 1)              # black opaque, white gone, AA in between
    out_al = t * al + (1 - t) * ach_al
    out_rgb = t[..., None] * rgb * 255 + (1 - t[..., None]) * GREY
    out = np.dstack([out_rgb, out_al * 255]).clip(0, 255).astype(np.uint8)
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
    files = sorted(glob.glob(os.path.join(src_dir, '*.png')))
    outs = []
    for f in files:
        d = os.path.join(dst_dir, os.path.basename(f))
        tone(f, d)
        outs.append(d)
    if len(sys.argv) > 3:
        montage(outs, sys.argv[3] + '_40.png', 40)
        montage(outs, sys.argv[3] + '_96.png', 96)
    print('toned', len(outs))
