# -*- coding: utf-8 -*-
"""설치본 그대로 — 직업마다 모든 스킬 그림을 skill_art.js 값(움직임 · 크기 · 시간 · ay · then)으로 초상 위에 재생하는 GIF + 정지 컷.
키프레임은 style.css fx-skill-* 를 옮겼다. 타격 · 약화는 고블린, 강화 · 회복 · 불러내기는 그 직업 초상 위."""
import re
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = r'C:\Users\user\Desktop\python_text\git\TheSevenSimulationRPG'
FONT = ImageFont.truetype('malgun.ttf', 15)
W, H, P = 150, 200, 91
STEP = 20

src = open(ROOT + r'\src\ui\skill_art.js', encoding='utf-8').read()
DEF = re.compile(r"file: '(\w+)', motion: '([\w-]+)', size: (\d+)(?:, ay: ([.\d]+))?, duration: (\d+)")
ENTRY = re.compile(r"^\s{4}(\w+): \{(.*?)\n?\s*\},?$", re.M)
KIND = re.compile(r"(hit|buff|bad|heal|call): \{")


def parse():
    out = []
    for m in re.finditer(r"^    (\w+): \{", src, re.M):
        sid = m.group(1)
        end = src.find('\n    ', m.end())
        nxt = re.search(r"^    \w+: \{", src[m.end():], re.M)
        body = src[m.end(): m.end() + (nxt.start() if nxt else len(src))]
        for k in KIND.finditer(body):
            seg = body[k.end():]
            d = DEF.search(seg)
            chain = [dict(file=d.group(1), motion=d.group(2), size=int(d.group(3)), ay=float(d.group(4)) if d.group(4) else None, dur=int(d.group(5)))]
            rest = seg[d.end():]
            t = re.match(r",\s*then: \{ " + DEF.pattern, rest)
            if t:
                chain.append(dict(file=t.group(1), motion=t.group(2), size=int(t.group(3)), ay=float(t.group(4)) if t.group(4) else None, dur=int(t.group(5))))
            out.append((sid, k.group(1), chain))
    return out


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
}
BASE = dict(op=1, s=1, sx=None, sy=None, tx=0, ty=0, ty_sh=0, cr=0, cb=0, cb_rev=0, rot=0)


def val(track, pct, base, ease):
    if not track:
        return base
    if pct <= track[0][0]:
        return track[0][1]
    for (p0, v0), (p1, v1) in zip(track, track[1:]):
        if p0 <= pct <= p1:
            return v0 + (v1 - v0) * ease((pct - p0) / (p1 - p0) if p1 > p0 else 1)
    return track[-1][1]


def stamp(canvas, img, d, t, cx, cy):
    if t < 0 or t > d['dur']:
        return
    kf = KF.get(d['motion'], KF['burst'])
    ease = kf.get('ease', EO)
    pct = 100 * t / d['dur']
    k = {n: val(kf.get(n), pct, b, ease) for n, b in BASE.items()}
    size = d['size']
    s = img.resize((size, size), Image.LANCZOS)
    a = np.asarray(s).copy()
    if k['cr'] > 0:
        a[:, int(size * (1 - k['cr'])):, 3] = 0
    if k['cb'] > 0:
        a[int(size * (1 - k['cb'])):, :, 3] = 0
    if k['cb_rev'] > 0:   # 아래에서 위로 드러남(pillar)
        a[:int(size * k['cb_rev']), :, 3] = 0
    a[..., 3] = (a[..., 3] * max(0, min(1, k['op']))).astype(np.uint8)
    s = Image.fromarray(a)
    if k['rot']:
        s = s.rotate(-k['rot'], resample=Image.BICUBIC)
    sx = k['sx'] if k['sx'] is not None else k['s']
    sy = k['sy'] if k['sy'] is not None else k['s']
    w, h = max(1, round(size * sx)), max(1, round(size * sy))
    s = s.resize((w, h), Image.LANCZOS)
    oy = (.5 - d['ay']) * size if d['ay'] is not None else 0
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    layer.paste(s, (round(cx - w / 2 + k['tx']), round(cy - h / 2 + oy + k['ty'] + k['ty_sh'] * P)), s)
    canvas.alpha_composite(layer)


QUAKE = [(0, 0), (10, 0), (25, 5), (45, -1.5), (65, 1), (100, 0)]


def tile(face, chain, t, label, quake):
    im = Image.new('RGBA', (W, H), (24, 22, 30, 255))
    dy = val(QUAKE, 100 * t / 300, 0, EO) if quake and t <= 300 else 0
    x0, y0 = (W - P) // 2, H - P - 12 + round(dy)
    im.alpha_composite(face, (x0, y0))
    start = 0
    for d in chain:
        img = Image.open(ROOT + rf"\src\assets\art\fx\skills\{d['file']}.webp").convert('RGBA')
        stamp(im, img, d, t - start, x0 + P / 2, y0 + P / 2)
        start += d['dur']
    big = im.resize((W * 2, H * 2), Image.NEAREST).convert('RGB')
    ImageDraw.Draw(big).text((8, 4), label, fill=(240, 236, 250), font=FONT)
    return big


def main(prefix, out_path, cls_face, cols=4):
    face_hit = Image.open(ROOT + r'\src\assets\art\faces\gemini\monster\1102.webp').convert('RGBA').resize((P, P), Image.LANCZOS)
    face_own = Image.open(ROOT + rf'\src\assets\art\faces\gemini\hero\{cls_face}.webp').convert('RGBA').resize((P, P), Image.LANCZOS)
    items = [(sid, kind, chain) for sid, kind, chain in parse() if sid.startswith(prefix)]
    quake = 'quake: true'
    longest = max(sum(d['dur'] for d in c) for _, _, c in items)
    rows = (len(items) + cols - 1) // cols
    frames = []
    for i in range(longest // STEP + 12):
        t = i * STEP
        out = Image.new('RGB', (cols * (W * 2 + 6), rows * (H * 2 + 6)), (8, 8, 12))
        for n, (sid, kind, chain) in enumerate(items):
            face = face_hit if kind in ('hit', 'bad') else face_own
            q = bool(re.search(sid + r": \{[^\n]*quake: true", src))
            label = sid + ('' if kind in ('hit',) else f' ({kind})')
            out.paste(tile(face, chain, t, label, q), ((n % cols) * (W * 2 + 6), (n // cols) * (H * 2 + 6)))
        frames.append(out)
    frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=STEP * 2, loop=0, optimize=True)
    print(out_path, len(items), len(frames))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
