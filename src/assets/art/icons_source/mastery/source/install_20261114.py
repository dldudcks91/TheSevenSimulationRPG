# -*- coding: utf-8 -*-
"""Cut + mono + install the plan_20261114 sheets.

  python install_20261114.py <stage dir>            cut every sheet, mono every tile -> <stage>/tiles/<sheet>-<n>.png,
                                                    picked tile per key -> <stage>/pick/<key>.png (nothing installed)
  python install_20261114.py <stage dir> --write    + copy the picks to class|sin/<node_id>.png · advances/<advance_id>.png
Pick = plan_20261114.py PICK ('sheet-tile' · advance sheets as 'aNN-tile'), else the key's first tile.
After --write: python optical.py --write (mastery only) · python scripts/build_icons.py
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.abspath(os.path.join(HERE, '..', '..'))
REPO = os.path.abspath(os.path.join(ICONS, *['..'] * 4))
CUT = os.path.join(REPO, '.claude', 'skills', 'icon-prompt', 'cut.py')
sys.path.insert(0, HERE)
import mono as M                                                     # noqa: E402
import plan_20261114 as P                                            # noqa: E402

stage = sys.argv[1]
write = '--write' in sys.argv
tiles = os.path.join(stage, 'tiles')
os.makedirs(tiles, exist_ok=True)

jobs = [(no, os.path.join(HERE, f'sheet_{no}_codex.png'), ids) for no, ids in P.SHEETS.items()]
jobs += [(f'a{no}', os.path.join(ICONS, 'advances', 'source', f'sheet_{no}_codex.png'), ids) for no, ids in P.ADV_SHEETS.items()]
first = {}
for sid, sheet, ids in jobs:
    if not os.path.exists(sheet):
        print('no sheet', sid)
        continue
    cdir = os.path.join(stage, 'cut', sid)
    if not os.path.isdir(cdir) or len(os.listdir(cdir)) < 9:
        subprocess.run([sys.executable, CUT, sheet, '--grid', '3x3', '--out', cdir, '--prefix', 't'], check=True,
                       stdout=subprocess.DEVNULL)
    for n, key in enumerate(ids, 1):
        r, c = divmod(n - 1, 3)
        src = os.path.join(cdir, f't_r{r + 1}c{c + 1}.png')
        if not os.path.exists(src):
            print('EMPTY tile', sid, n, key)
            continue
        M.mono(src, os.path.join(tiles, f'{sid}-{n}.png'))
        first.setdefault(P.TAKE_OF.get(key, key), f'{sid}-{n}')

pick_dir = os.path.join(stage, 'pick')
os.makedirs(pick_dir, exist_ok=True)
done = {}
for key in P.NODES + list(P.A):
    tile = P.PICK.get(key) or first.get(key)
    if not tile:
        print('MISSING', key)
        continue
    shutil.copy2(os.path.join(tiles, f'{tile}.png'), os.path.join(pick_dir, f'{key}.png'))
    done[key] = tile
json.dump(done, open(os.path.join(stage, 'picked.json'), 'w'), indent=1)
print('picked', len(done), 'of', len(P.NODES) + len(P.A))

if write:
    for key, tile in done.items():
        dst = os.path.join(ICONS, 'mastery', P.dest(key)) if key in P.NODES else os.path.join(ICONS, 'advances', f'{key}.png')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(pick_dir, f'{key}.png'), dst)
    print('installed', len(done))
