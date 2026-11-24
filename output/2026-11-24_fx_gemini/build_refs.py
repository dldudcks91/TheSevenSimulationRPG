# -*- coding: utf-8 -*-
"""Current installed effects -> one 3x3 magenta reference sheet per group (what Gemini redraws).
  python build_refs.py   -> refs/<key>.png (1536x1536, each sprite = one whole 512 cell, so placement is kept)"""
import json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FX = os.path.join(ROOT, 'src', 'assets', 'art', 'fx', 'skills')
CELL = 512
MAGENTA = (255, 0, 255, 255)


def source(name):
    name = name.split('@')[0]
    for style in ('darktoon', 'foil'):
        p = os.path.join(FX, '%s_%s.webp' % (name, style))
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


groups = json.load(open(os.path.join(HERE, 'fx_map.json'), encoding='utf-8'))
os.makedirs(os.path.join(HERE, 'refs'), exist_ok=True)
for key, names in groups.items():
    sheet = Image.new('RGBA', (CELL * 3, CELL * 3), MAGENTA)
    for i, name in enumerate(names):
        sprite = Image.open(source(name)).convert('RGBA').resize((CELL - 24, CELL - 24), Image.Resampling.LANCZOS)
        x, y = (i % 3) * CELL + 12, (i // 3) * CELL + 12
        sheet.alpha_composite(sprite, (x, y))
    sheet.convert('RGB').save(os.path.join(HERE, 'refs', key + '.png'))
    print(key, len(names))
