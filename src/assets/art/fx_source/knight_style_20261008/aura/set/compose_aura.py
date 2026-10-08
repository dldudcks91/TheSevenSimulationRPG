# -*- coding: utf-8 -*-
"""고르신 오각별 마법진(cut_m2_1)의 바깥 원을 그대로 떼어 · 안쪽 문양만 바꿔 끼운다 — 원은 픽셀째 같다"""
import numpy as np
from PIL import Image

base = Image.open('cut_m2_1.png').convert('RGBA')
W = base.width
CX, CY, R_IN = 305.5, 302.5, 238
yy, xx = np.mgrid[0:W, 0:W]
r = np.hypot(xx - CX, yy - CY)
ang = (np.degrees(np.arctan2(yy - CY, xx - CX)) + 360) % 360
A0 = np.asarray(base)
# 별 꼭짓점이 원에 닿은 각도 — 원 바로 안쪽(226~236) 띠에서 불투명한 각도 무리의 가운데
band = (r >= 226) & (r < 236) & (A0[..., 3] > 128)
hist = np.bincount(ang[band].astype(int) % 360, minlength=360)
tips = []
for d in np.argsort(hist)[::-1]:
    if hist[d] == 0 or len(tips) == 5:
        break
    if all(min(abs(d - t), 360 - abs(d - t)) > 30 for t in tips):
        tips.append(int(d))
print('tips', sorted(tips))
# 꼭짓점 자리는 원을 36도 돌린 그림(그 자리엔 별이 안 닿았다)으로 메운다
rot = np.asarray(base.rotate(36, resample=Image.BICUBIC, center=(CX, CY)))
near = np.zeros_like(r, dtype=bool)
for t in tips:
    dd = np.abs(((ang - t) + 180) % 360 - 180)
    near |= dd < 10
patch = near & (r >= 226) & (r < 256)
ring = A0.copy()
ring[patch] = rot[patch]
ring[r < R_IN, 3] = 0
ring = Image.fromarray(ring)
ring.save('aura_ring.png')


def fit(pattern_path, reach=R_IN + 4):
    p = Image.open(pattern_path).convert('RGBA')
    a = np.asarray(p)[..., 3] > 16
    ys, xs = np.nonzero(a)
    pcx, pcy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    pr = np.hypot(xs - pcx, ys - pcy).max()
    k = reach / pr
    q = p.convert('RGBa').resize((round(p.width * k), round(p.height * k)), Image.LANCZOS).convert('RGBA')
    out = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    out.alpha_composite(q, (round(CX - pcx * k), round(CY - pcy * k)))
    return out


def compose(pattern_path, dst):
    out = fit(pattern_path)
    out.alpha_composite(ring)   # 원이 위 — 문양 끝이 원 밑으로 들어간다(오각별과 같다)
    out.save(dst)


for i, name in [(1, 'aura_fan_1'), (2, 'aura_fan_2'), (3, 'aura_def_1'), (4, 'aura_def_2')]:
    compose(f'cut_inner_{i}.png', f'{name}.png')
base.save('aura_might.png')
tiles = [Image.open(f) for f in ('aura_might.png', 'aura_fan_1.png', 'aura_fan_2.png', 'aura_def_1.png', 'aura_def_2.png')]
sheet = Image.new('RGBA', (5 * 300, 300), (24, 22, 30, 255))
for i, t in enumerate(tiles):
    sheet.alpha_composite(t.resize((300, 300), Image.LANCZOS), (i * 300, 0))
sheet.convert('RGB').save('aura_set.png')
print('ok')
