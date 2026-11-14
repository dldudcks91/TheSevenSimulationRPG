# -*- coding: utf-8 -*-
"""Cut every sheet (icon-prompt cut.py · 3x3 · 0.88) -> two-tone (../tone.py) -> drawn/<draw id>.png, then a review board.

python cut_tone.py [NN ...]   (default: every sheet_NN_codex.png · board = the sheets cut this run)
drawn/   = one 512 two-tone PNG per draw id (plan.json order) — install.py copies from here
board_*  = review montages (labels = draw id) in this folder
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[7]
CUT = REPO / '.claude/skills/icon-prompt/cut.py'
sys.dont_write_bytecode = True   # no __pycache__ next to ../tone.py
sys.path.insert(0, str(HERE.parent))
from tone import tone   # noqa: E402

PLAN = json.loads((HERE / 'plan.json').read_text(encoding='utf-8'))
DRAWN = HERE / 'drawn'


def cut_sheet(no):
    ids = PLAN['sheets'][no]['ids']
    g = PLAN['sheets'][no].get('grid', 3)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([sys.executable, str(CUT), str(HERE / f'sheet_{no}_codex.png'), '--grid', f'{g}x{g}', '--out', tmp, '--prefix', 't'],
                       check=True, stdout=subprocess.DEVNULL)
        for i, did in enumerate(ids):
            r, c = divmod(i, g)
            src = Path(tmp) / f't_r{r + 1}c{c + 1}.png'
            if not src.exists():
                print(no, did, 'MISSING cell', r + 1, c + 1)
                continue
            tone(str(src), str(DRAWN / f'{did}.png'))
    return ids


def board(ids, out, size, cols=9, bg=(22, 22, 36)):
    lab = 14 if size >= 64 else 0
    cw = max(size, 110 if lab else size) + 8
    rows = (len(ids) + cols - 1) // cols
    im = Image.new('RGB', (cols * cw + 8, rows * (size + lab + 8) + 8), bg)
    d = ImageDraw.Draw(im)
    for i, did in enumerate(ids):
        r, c = divmod(i, cols)
        x, y = 8 + c * cw, 8 + r * (size + lab + 8)
        p = DRAWN / f'{did}.png'
        if p.exists():
            t = Image.open(p).convert('RGBA').resize((size, size), Image.LANCZOS)
            im.paste(t, (x + (cw - 8 - size) // 2, y), t)
        if lab:
            d.text((x, y + size + 1), did[:18], fill=(200, 200, 210))
    im.save(out)


if __name__ == '__main__':
    DRAWN.mkdir(exist_ok=True)
    nos = sys.argv[1:] or [n for n in PLAN['sheets'] if (HERE / f'sheet_{n}_codex.png').exists()]
    ids = []
    for no in nos:
        ids += cut_sheet(no)
    board(ids, HERE / 'board_96.png', 96)
    board(ids, HERE / 'board_40.png', 40, cols=16)
    print('cut', len(ids))
