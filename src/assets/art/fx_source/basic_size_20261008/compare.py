# -*- coding: utf-8 -*-
"""기본 스킬 크기 · 길이 비교 GIF — 직업마다 세 줄: 지금 기본 / 줄인 기본 / 전직(설치본 그대로).

python compare.py <skill_art.json> [직업 ...]   → <번호>_<직업>.gif + _still.png
skill_art.json = src/ui/skill_art.js 의 SKILL_ART 를 node 로 뽑은 것. 그림은 fx/skills 설치본.
줄인 값 = 크기 × SIZE_K · 길이 × DUR_K(DUR_MIN ~ DUR_MAX ms 안) — 미리보기 전용이다(게임 값은 안 바뀐다).
움직임 키프레임은 ../advance_20261008/gif.py(= style.css fx-skill-*)를 쓴다. 실제 속도의 절반 · 배율 S 로 그린다.
"""
import csv
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'advance_20261008'))
import gif as G  # noqa: E402

ART = HERE.parents[1]
ROOT = HERE.parents[4]
SIZE_K, DUR_K, DUR_MIN, DUR_MAX = .72, .62, 200, 450
S = 1.5
P = round(91 * S)
W, H = round(150 * S), round(200 * S)
LABEL_W = 120
STEP = 20
FONT = ImageFont.truetype('malgun.ttf', 15)
FONT_ROW = ImageFont.truetype('malgunbd.ttf', 17)
JOBS = {'warrior': ('1', 'war_', 'warrior_1'), 'knight': ('2', 'kni_', 'knight_1'), 'mage': ('3', 'mag_', 'mage_1'),
        'archer': ('4', 'arc_', 'archer_1'), 'priest': ('5', 'pri_', 'priest_1')}
KIND_KR = {'hit': '타격', 'bad': '약화', 'buff': '강화', 'heal': '회복', 'call': '불러내기'}
ROWS = ['지금 기본', '줄인 기본', '전직']


def chain_of(d):
    out = []
    while d:
        out.append(dict(file=d['file'], motion=d['motion'], size=d['size'], ay=d.get('ay'), dur=d['duration']))
        d = d.get('then')
    return out


def reduce(chain):
    return [dict(c, size=round(c['size'] * SIZE_K), dur=max(DUR_MIN, min(DUR_MAX, round(c['dur'] * DUR_K)))) for c in chain]


def stamp(canvas, img, c, t, cx, cy):
    """gif.stamp 을 배율 S 로 — 크기 · 옮김 · 떨어지는 높이를 S 배 한다"""
    if t < 0 or t > c['dur']:
        return
    kf = G.KF.get(c['motion'], G.KF['burst'])
    ease = kf.get('ease', G.EO)
    pct = 100 * t / c['dur']
    k = {n: G.val(kf.get(n), pct, b, ease) for n, b in G.BASE.items()}
    size = round(c['size'] * S)
    s = img.resize((size, size), Image.LANCZOS)
    import numpy as np
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
    oy = (.5 - c['ay']) * size if c['ay'] is not None else 0
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    layer.paste(s, (round(cx - w / 2 + k['tx'] * S), round(cy - h / 2 + oy + k['ty'] * S + k['ty_sh'] * P)), s)
    canvas.alpha_composite(layer)


def tile(face, chain, imgs, t, label, quake):
    im = Image.new('RGBA', (W, H), (24, 22, 30, 255))
    hit_t = chain[0]['dur'] if len(chain) > 1 else 0
    tq = t - hit_t
    dy = G.val(G.QUAKE, 100 * tq / 300, 0, G.EO) * S if quake and 0 <= tq <= 300 else 0
    x0, y0 = (W - P) // 2, H - P - round(20 * S) + round(dy)
    im.alpha_composite(face, (x0, y0))
    start = 0
    for c, img in zip(chain, imgs):
        stamp(im, img, c, t - start, x0 + P / 2, y0 + P / 2)
        start += c['dur']
    out = im.convert('RGB')
    ImageDraw.Draw(out).text((8, 5), label, fill=(240, 236, 250), font=FONT)
    return out


def main(art, names, job):
    num, prefix, face_name = JOBS[job]
    face_hit = Image.open(ART / 'faces/gemini/monster/1102.webp').convert('RGBA').resize((P, P), Image.LANCZOS)
    face_own = Image.open(ART / f'faces/gemini/hero/{face_name}.webp').convert('RGBA').resize((P, P), Image.LANCZOS)
    cache = {}

    def load(chain):
        for c in chain:
            if c['file'] not in cache:
                cache[c['file']] = Image.open(ART / f"fx/skills/{c['file']}.webp").convert('RGBA')
        return [cache[c['file']] for c in chain]

    rows = [[], [], []]
    for sid, events in art.items():
        if not sid.startswith(prefix):
            continue
        adv = names[sid][1] == 'advance'
        for kind, d in events.items():
            ch = chain_of(d)
            label = f'{names[sid][0]} ({KIND_KR[kind]})'
            face = face_hit if kind in ('hit', 'bad') else face_own
            item = (face, ch, load(ch), label, bool(d.get('quake')))
            if adv:
                rows[2].append(item)
            else:
                rows[0].append(item)
                rows[1].append((face, reduce(ch), item[2], label, item[4]))
    cols = max(len(r) for r in rows)
    longest = max(sum(c['dur'] for c in it[1]) for r in rows for it in r)
    size = (LABEL_W + cols * (W + 4), 3 * (H + 4))

    def frame(t_of):
        out = Image.new('RGB', size, (8, 8, 12))
        d = ImageDraw.Draw(out)
        for ri, r in enumerate(rows):
            d.text((10, ri * (H + 4) + H // 2 - 12), ROWS[ri], fill=(250, 220, 140) if ri == 1 else (220, 216, 230), font=FONT_ROW)
            for ci, (face, ch, imgs, label, q) in enumerate(r):
                out.paste(tile(face, ch, imgs, t_of(ch), label, q), (LABEL_W + ci * (W + 4), ri * (H + 4)))
        return out

    frames = [frame(lambda ch, t=i * STEP: t) for i in range(longest // STEP + 14)]
    path = HERE / f'{num}_{job}.gif'
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=STEP * 2, loop=0, optimize=True)
    still = frame(lambda ch: ch[0]['dur'] + ch[1]['dur'] * .3 if len(ch) > 1 else ch[0]['dur'] * .4)
    still.save(HERE / f'{num}_{job}_still.png')
    print(path, [len(r) for r in rows], len(frames), f'{path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    art = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    with open(ROOT / 'src/data/skill.csv', encoding='utf-8-sig') as f:
        names = {r['skill_id']: (r['name_kr'], r['owner_kind']) for r in csv.DictReader(f)}
    for j in sys.argv[2:] or list(JOBS):
        main(art, names, j)
