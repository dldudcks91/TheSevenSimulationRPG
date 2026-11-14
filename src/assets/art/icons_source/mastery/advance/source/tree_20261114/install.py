# -*- coding: utf-8 -*-
"""Install every board picture under its id file name (plan.json), repainted to its advance colour (recolor.py · plan.py:COLOR):
REUSE = existing picture (the 35 old advance skills = their git-HEAD original in skill_orig/), DRAW = drawn/<draw id>.png.

python install.py [--dry] [--force]   -> icons_source/skills/<skill_id>.png · icons_source/mastery/advance/<key>.png
Refuses to overwrite a file that is not ours (an existing different picture) — prints it instead.
Then run: python scripts/build_icons.py
"""
import filecmp
import json
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from recolor import recolor   # noqa: E402

HERE = Path(__file__).resolve().parent
ICONS = HERE.parents[3]
PLAN = json.loads((HERE / 'plan.json').read_text(encoding='utf-8'))


def dest(target):
    kind, key = target.split(':', 1)
    return ICONS / (('skills/' if kind == 'skill' else 'mastery/advance/') + key + '.png')


def main(dry, force):
    jobs = [(t, ICONS / (s + '.png')) for t, s in PLAN['reuse'].items()]
    jobs += [(t, HERE / 'drawn' / f'{d}.png') for t, d in PLAN['draw'].items()]
    done = same = 0
    tmp = Path(tempfile.gettempdir()) / 'adv_recolor_tmp.png'
    for t, src in jobs:
        dst = dest(t)
        assert src.exists(), src
        recolor(str(src), str(tmp), PLAN['color'][t])
        src = tmp
        if dst.exists():
            if filecmp.cmp(src, dst, shallow=False):
                same += 1
                continue
            if not force:
                print('SKIP existing (pass --force to replace)', dst.relative_to(ICONS))
                continue
        if not dry:
            dst.write_bytes(src.read_bytes())
        done += 1
    print(('would copy' if dry else 'copied'), done, 'unchanged', same, 'of', len(jobs))


if __name__ == '__main__':
    main('--dry' in sys.argv, '--force' in sys.argv)
