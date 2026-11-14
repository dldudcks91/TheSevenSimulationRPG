# -*- coding: utf-8 -*-
"""Repaint a two-tone icon's accent to one colour (plan.py:COLOR — the advance's colour).

The grey silhouette (#d8d9e6 · chroma ~0.05) and transparency stay. Accent pixels (chroma above ~0.12) get the target hue;
their saturation and brightness keep their relative spread (a flame's light and dark tongues stay light and dark), scaled so the
image's typical accent lands on the target colour. Anti-aliased accent edges blend by the same chroma weight tone.py uses.
Idempotent — repainting a repainted icon with the same colour gives the same picture.

python recolor.py <src.png> <dst.png> <#rrggbb>
"""
import sys

import numpy as np
from PIL import Image


def _rgb2hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0)
    gc = np.where(m, (mx - g) / np.where(m, d, 1), 0)
    bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    return np.stack([np.where(m, h, 0), s, mx], -1)


def _hsv2rgb(hsv):
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    i = np.floor(h * 6.0).astype(int) % 6
    f = h * 6.0 - np.floor(h * 6.0)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,))
    for k, (a, b, c) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        sel = i == k
        out[sel] = np.stack([a[sel], b[sel], c[sel]], -1)
    return out


def hex2rgb(hx):
    hx = hx.lstrip('#')
    return np.array([int(hx[i:i + 2], 16) for i in (0, 2, 4)], float) / 255.0


def recolor(src, dst, hx):
    a = np.array(Image.open(src).convert('RGBA')).astype(float)
    rgb, al = a[..., :3] / 255.0, a[..., 3]
    chroma = rgb.max(-1) - rgb.min(-1)
    w = np.clip((chroma - 0.10) / 0.15, 0, 1) * (al > 0)        # 0 = grey silhouette / empty, 1 = accent
    core = (w >= 1) & (al > 200)
    if core.sum() < 20:                                           # no accent to repaint
        Image.fromarray(a.astype(np.uint8), 'RGBA').save(dst)
        return 0
    hsv = _rgb2hsv(rgb)
    th = _rgb2hsv(hex2rgb(hx)[None, None, :])[0, 0]
    s_ref = np.percentile(hsv[..., 1][core], 60)
    v_ref = np.percentile(hsv[..., 2][core], 60)
    new = np.empty_like(hsv)
    new[..., 0] = th[0]
    new[..., 1] = np.clip(hsv[..., 1] / max(s_ref, 1e-3) * th[1], 0, 1)
    new[..., 2] = np.clip(hsv[..., 2] / max(v_ref, 1e-3) * th[2], 0, 1)
    out = _hsv2rgb(new) * w[..., None] + rgb * (1 - w[..., None])
    res = np.dstack([out * 255.0, al]).clip(0, 255).astype(np.uint8)
    Image.fromarray(res, 'RGBA').save(dst)
    return int(core.sum())


if __name__ == '__main__':
    print(recolor(sys.argv[1], sys.argv[2], sys.argv[3]))
