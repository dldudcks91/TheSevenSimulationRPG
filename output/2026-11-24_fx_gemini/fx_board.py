# -*- coding: utf-8 -*-
"""Comparison boards: per group, one row per effect — current installed | each Gemini take (cut/<group>_<k>/).
Each tile = stage-1 background slice + a 90 px-scale portrait + the effect at its SKILL_ART size (same ratio as the game).
  python fx_board.py            -> board/<group>.png (+ board/all_small.png)"""
import glob, json, os, re
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'src', 'assets', 'art')
NAMES = json.load(open(os.path.join(HERE, 'fx_map.json'), encoding='utf-8'))
LABELS = json.load(open(os.path.join(HERE, 'prompts', '_cells.json'), encoding='utf-8'))
TILE, FACE = 340, 140                      # portrait 140 px = the game 90 px card portrait at 1.56x
JS = open(os.path.join(ROOT, 'src', 'ui', 'skill_art.js'), encoding='utf-8').read()
SIZES = {m.group(1): int(m.group(2)) for m in re.finditer(r"file: '([a-z_]+)'[^}]*?size: (\d+)", JS)}
SIZES['charge_gather'] = 120               # CHARGE_ART starts at 1.5 x 80
BG = Image.open(os.path.join(ART, 'backgrounds', 'illustrate', 'background_stage_101.webp')).convert('RGB')
HERO = Image.open(os.path.join(ART, 'faces', 'gemini', 'hero', 'warrior_1.webp')).convert('RGBA').resize((FACE, FACE), Image.Resampling.LANCZOS)
try:
    FONT = ImageFont.truetype('malgun.ttf', 15)
except OSError:
    FONT = ImageFont.load_default()


def current(name):
    for style in ('darktoon', 'foil'):
        p = os.path.join(ART, 'fx', 'skills', '%s_%s.webp' % (name, style))
        if os.path.exists(p):
            return p


def tile(sprite_path, name):
    t = BG.resize((TILE * 3, int(BG.height * TILE * 3 / BG.width))).crop((TILE, 40, TILE * 2, 40 + TILE)).convert('RGBA')
    dark = Image.new('RGBA', t.size, (10, 8, 10, 165)); t.alpha_composite(dark)
    t.alpha_composite(HERO, ((TILE - FACE) // 2, (TILE - FACE) // 2))
    if sprite_path and os.path.exists(sprite_path):
        side = round(SIZES.get(name, 90) / 90 * FACE)
        sp = Image.open(sprite_path).convert('RGBA').resize((side, side), Image.Resampling.LANCZOS)
        t.alpha_composite(sp, ((TILE - side) // 2, (TILE - side) // 2)) if side <= TILE else \
            t.alpha_composite(sp.crop(((side - TILE) // 2, (side - TILE) // 2, (side + TILE) // 2, (side + TILE) // 2)), (0, 0))
    return t


def board(group):
    takes = sorted(glob.glob(os.path.join(HERE, 'cut', group + '_*')), key=lambda d: int(d.rsplit('_', 1)[1]))
    heads = ['current'] + ['gemini %s' % os.path.basename(d).rsplit('_', 1)[1] for d in takes]
    W = 200 + TILE * len(heads); H = 30 + TILE * len(NAMES[group])
    img = Image.new('RGB', (W, H), (236, 233, 228)); d = ImageDraw.Draw(img)
    for j, h in enumerate(heads):
        d.text((200 + j * TILE + 8, 6), h, fill=(20, 20, 20), font=FONT)
    for i, raw in enumerate(NAMES[group]):
        name = raw.split('@')[0]
        y = 30 + i * TILE
        d.text((8, y + 8), raw.replace('@', ' '), fill=(20, 20, 20), font=FONT)
        label = LABELS[group][i].split(':', 1)[-1].strip()
        words, line, ly = label.split(), '', y + 30
        for w in words:
            if len(line) + len(w) > 24:
                d.text((8, ly), line, fill=(90, 90, 90), font=FONT); ly += 18; line = ''
            line += w + ' '
        d.text((8, ly), line, fill=(90, 90, 90), font=FONT)
        d.text((8, y + TILE - 24), 'size %d' % SIZES.get(name, 0), fill=(120, 120, 120), font=FONT)
        img.paste(tile(current(name), name).convert('RGB'), (200, y))
        for j, dd in enumerate(takes):
            img.paste(tile(os.path.join(dd, raw.replace('@', '_') + '.png'), name).convert('RGB'), (200 + (j + 1) * TILE, y))
    os.makedirs(os.path.join(HERE, 'board'), exist_ok=True)
    out = os.path.join(HERE, 'board', group + '.png')
    img.save(out)
    return out


INDEX = '''<!doctype html><meta charset="utf-8"><title>Gemini skill effects</title>
<style>body{margin:0;background:#1b191c;color:#ddd;font:14px sans-serif}h2{margin:24px 16px 8px}
nav{position:sticky;top:0;background:#111;padding:8px 16px}nav a{color:#9cf;margin-right:12px}
img{display:block;margin:0 16px;max-width:calc(100%% - 32px)}p{margin:4px 16px;color:#aaa}</style>
<nav>%s</nav><p>columns: current = installed dark cartoon · gemini 0 = pilot (s01 only) · gemini 1 = faithful redraw · gemini 2 = freer redesign · tile = portrait 140 px (game 90 px at 1.56x), effect at its SKILL_ART size</p>%s'''

if __name__ == '__main__':
    done = []
    for g in NAMES:
        if glob.glob(os.path.join(HERE, 'cut', g + '_*')):
            print(board(g)); done.append(g)
    nav = ' '.join('<a href="#%s">%s</a>' % (g, g) for g in done)
    body = ''.join('<h2 id="%s">%s</h2><img src="%s.png" loading="lazy">' % (g, g, g) for g in done)
    open(os.path.join(HERE, 'board', 'index.html'), 'w', encoding='utf-8').write(INDEX % (nav, body))
