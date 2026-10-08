# -*- coding: utf-8 -*-
"""전직 스킬 미리보기 GIF — 직업마다 한 장. spec.FX 의 움직임 · 크기 · 시간으로 초상 위에 재생한다(실제 속도의 절반).

python gif.py [직업 ...]   → gif/<번호>_<직업>.gif + 정지 컷 gif/<번호>_<직업>_still.png
움직임 키프레임은 ../job_style_20261008/now/overview.py(= style.css fx-skill-*)를 옮겼고, spin 하나를 더했다.
타격 · 약화는 고블린, 강화 · 회복은 그 직업 초상 위. 아직 cut/ 에 없는 칸은 건너뛴다.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from spec import FX  # noqa: E402

ART = HERE.parents[1]
FONT = ImageFont.truetype('malgun.ttf', 15)
W, H, P = 200, 250, 91
STEP = 20
JOBS = {'warrior': ('1', 'war_', 'warrior_1'), 'knight': ('2', 'kni_', 'knight_1'), 'mage': ('3', 'mag_', 'mage_1'),
        'archer': ('4', 'arc_', 'archer_1'), 'priest': ('5', 'pri_', 'priest_1')}
KIND_KR = {'hit': '타격', 'bad': '약화', 'buff': '강화', 'heal': '회복'}

EO = lambda u: 1 - (1 - u) ** 2
EI = lambda u: u ** 3
LIN = lambda u: u
KF = {
    'slash': dict(op=[(0, 0), (25, 1), (65, 1), (100, 0)], s=[(0, .92), (25, 1), (100, 1.04)], cr=[(0, 1), (25, 0)], cb=[(0, 1), (25, 0)]),
    'cross': dict(op=[(0, 0), (20, 1), (65, 1), (100, 0)], s=[(0, .65), (20, 1), (100, 1.04)]),
    'ground': dict(op=[(0, 0), (25, 1), (65, 1), (100, 0)], sx=[(0, .55), (25, 1), (100, 1.04)], sy=[(0, .35), (25, 1), (100, 1.04)]),
    'land': dict(op=[(0, 0), (25, 1), (65, 1), (100, 0)], s=[(0, .72), (25, 1), (100, 1.04)], ty=[(0, -7), (25, 2), (65, 0)]),
    'inward': dict(op=[(0, 0), (25, 1), (75, 1), (100, 0)], s=[(0, 1.08), (75, .75), (100, .6)]),
    'wave': dict(op=[(0, 0), (25, 1), (70, 1), (100, 0)], s=[(0, .6), (70, 1), (100, 1.04)]),
    'orders': dict(op=[(0, 0), (25, 1), (70, 1), (100, 0)], s=[(0, .82), (70, 1), (100, 1)], ty=[(0, 8), (70, -2), (100, -5)]),
    'shell': dict(op=[(0, 0), (25, 1), (70, 1), (100, 0)], s=[(0, .82), (25, 1.03), (70, 1), (100, 1.02)]),
    'burst': dict(op=[(0, 0), (22, 1), (65, 1), (100, 0)], s=[(0, .45), (22, 1), (65, 1.02), (100, 1.04)]),
    'thrust': dict(op=[(0, 0), (25, 1), (65, 1), (100, 0)], cr=[(0, 1), (25, 0)], tx=[(0, -6), (25, 0), (65, 0), (100, 3)]),
    'pillar': dict(op=[(0, 0), (25, 1), (65, 1), (100, 0)], cb_rev=[(0, 1), (25, 0)], sx=[(0, .86), (25, 1), (100, 1.02)], sy=[(0, .7), (25, 1), (100, 1.02)]),
    'strike': dict(op=[(0, 0), (25, 1), (65, 1), (100, 0)], cb=[(0, 1), (25, 0)], ty=[(0, -4), (25, 0)], s=[(0, .9), (25, 1), (100, 1.02)]),
    'rain': dict(op=[(0, 0), (25, 1), (65, 1), (100, 0)], tx=[(0, -4), (25, 0), (100, 3)], ty=[(0, -6), (25, 0), (100, 4)], s=[(0, .85), (25, 1), (100, 1)]),
    'orbit': dict(op=[(0, 0), (25, 1), (70, 1), (100, 0)], s=[(0, .78), (70, 1), (100, .95)], rot=[(0, -12), (70, 4), (100, 10)]),
    'sweep': dict(op=[(0, 0), (30, 1), (70, 1), (100, 0)], cr=[(0, 1), (30, 0)], s=[(0, .85), (30, 1), (100, 1)], ty=[(30, 0), (100, -3)]),
    'heal': dict(op=[(0, 0), (25, 1), (70, 1), (100, 0)], s=[(0, .82), (70, 1), (100, 1)], ty=[(0, 6), (70, -2), (100, -5)]),
    'sink': dict(op=[(0, 0), (25, 1), (70, 1), (100, 0)], s=[(0, .85), (70, 1), (100, 1)], ty=[(0, -5), (70, 1), (100, 4)]),
    'bolt': dict(ease=LIN, op=[(0, 1), (20, 1), (28, .45), (36, 1), (65, 1), (100, 0)], cb=[(0, 1), (20, 0)]),
    'fall': dict(ease=EI, op=[(0, 0), (15, 1), (100, 1)], ty_sh=[(0, -1), (100, 0)]),
    'shatter': dict(op=[(0, 0), (14, 1), (60, 1), (100, 0)], s=[(0, .8), (14, 1), (100, 1.03)], ty=[(14, 0), (100, 2)]),
    # 새 움직임 — 휠윈드 · 재장전처럼 도는 것
    'spin': dict(ease=LIN, op=[(0, 0), (12, 1), (78, 1), (100, 0)], s=[(0, .85), (15, 1), (100, 1.04)], rot=[(0, 0), (100, 320)]),
}
BASE = dict(op=1, s=1, sx=None, sy=None, tx=0, ty=0, ty_sh=0, cr=0, cb=0, cb_rev=0, rot=0)
QUAKE = [(0, 0), (10, 0), (25, 5), (45, -1.5), (65, 1), (100, 0)]


def val(track, pct, base, ease):
    if not track:
        return base
    if pct <= track[0][0]:
        return track[0][1]
    for (p0, v0), (p1, v1) in zip(track, track[1:]):
        if p0 <= pct <= p1:
            return v0 + (v1 - v0) * ease((pct - p0) / (p1 - p0) if p1 > p0 else 1)
    return track[-1][1]


def stamp(canvas, img, motion, size, ay, dur, t, cx, cy):
    if t < 0 or t > dur:
        return
    kf = KF[motion]
    ease = kf.get('ease', EO)
    pct = 100 * t / dur
    k = {n: val(kf.get(n), pct, b, ease) for n, b in BASE.items()}
    s = img.resize((size, size), Image.LANCZOS)
    a = np.asarray(s).copy()
    if k['cr'] > 0:
        a[:, int(size * (1 - k['cr'])):, 3] = 0
    if k['cb'] > 0:
        a[int(size * (1 - k['cb'])):, :, 3] = 0
    if k['cb_rev'] > 0:
        a[:int(size * k['cb_rev']), :, 3] = 0
    a[..., 3] = (a[..., 3] * max(0, min(1, k['op']))).astype(np.uint8)
    s = Image.fromarray(a)
    if k['rot']:
        s = s.rotate(-k['rot'], resample=Image.BICUBIC)
    sx = k['sx'] if k['sx'] is not None else k['s']
    sy = k['sy'] if k['sy'] is not None else k['s']
    w, h = max(1, round(size * sx)), max(1, round(size * sy))
    s = s.resize((w, h), Image.LANCZOS)
    oy = (.5 - ay) * size if ay is not None else 0
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    layer.paste(s, (round(cx - w / 2 + k['tx']), round(cy - h / 2 + oy + k['ty'] + k['ty_sh'] * P)), s)
    canvas.alpha_composite(layer)


def tile(face, chain, imgs, t, label, quake):
    im = Image.new('RGBA', (W, H), (24, 22, 30, 255))
    hit_t = chain[0][5] if len(chain) > 1 else 0   # 두 단계면 둘째 그림이 설 때 흔든다
    tq = t - hit_t
    dy = val(QUAKE, 100 * tq / 300, 0, EO) if quake and 0 <= tq <= 300 else 0
    x0, y0 = (W - P) // 2, H - P - 28 + round(dy)
    im.alpha_composite(face, (x0, y0))
    start = 0
    for (sheet, cell, motion, size, ay, dur), img in zip(chain, imgs):
        stamp(im, img, motion, size, ay, dur, t - start, x0 + P / 2, y0 + P / 2)
        start += dur
    big = im.resize((W * 2, H * 2), Image.NEAREST).convert('RGB')
    ImageDraw.Draw(big).text((10, 6), label, fill=(240, 236, 250), font=FONT)
    return big


def main(job, cols=4):
    num, prefix, face_name = JOBS[job]
    face_hit = Image.open(ART / 'faces/gemini/monster/1102.webp').convert('RGBA').resize((P, P), Image.LANCZOS)
    face_own = Image.open(ART / f'faces/gemini/hero/{face_name}.webp').convert('RGBA').resize((P, P), Image.LANCZOS)
    items = []
    for sid, name, kind, chain, quake in FX:
        if not sid.startswith(prefix):
            continue
        paths = [HERE / f'cut/{c[0]}_{c[1]}.png' for c in chain]
        if not all(p.exists() for p in paths):
            continue
        items.append((name, kind, chain, [Image.open(p).convert('RGBA') for p in paths], quake))
    if not items:
        print(job, 'no cut cells yet')
        return
    longest = max(sum(c[5] for c in chain) for _, _, chain, _, _ in items)
    rows = (len(items) + cols - 1) // cols
    frames = []
    for i in range(longest // STEP + 14):
        t = i * STEP
        out = Image.new('RGB', (cols * (W * 2 + 6), rows * (H * 2 + 6)), (8, 8, 12))
        for n, (name, kind, chain, imgs, quake) in enumerate(items):
            face = face_hit if kind in ('hit', 'bad') else face_own
            out.paste(tile(face, chain, imgs, t, f'{name} ({KIND_KR[kind]})', quake), ((n % cols) * (W * 2 + 6), (n // cols) * (H * 2 + 6)))
        frames.append(out)
    (HERE / 'gif').mkdir(exist_ok=True)
    path = HERE / f'gif/{num}_{job}.gif'
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=STEP * 2, loop=0, optimize=True)
    # 정지 컷 — 스킬마다 그림이 다 선 순간(첫 그림 40% · 두 단계면 둘째 그림 30%) — bolt 는 28% 에 한 번 깜빡인다
    still = Image.new('RGB', frames[0].size, (8, 8, 12))
    for n, (name, kind, chain, imgs, quake) in enumerate(items):
        face = face_hit if kind in ('hit', 'bad') else face_own
        t = chain[0][5] + chain[1][5] * .3 if len(chain) > 1 else chain[0][5] * .4
        still.paste(tile(face, chain, imgs, t, f'{name} ({KIND_KR[kind]})', False), ((n % cols) * (W * 2 + 6), (n // cols) * (H * 2 + 6)))
    still.save(HERE / f'gif/{num}_{job}_still.png')
    print(path, len(items), len(frames), f'{path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    for j in sys.argv[1:] or list(JOBS):
        main(j)
