# -*- coding: utf-8 -*-
"""Draw the mastery / advance-icon sheets of plan_20261114.json with Codex (ChatGPT login · VS Code extension codex.exe).

python run_codex.py [19 20 … a01 a02]   (default: every sheet without its sheet_NN_codex.png)
  mastery 'NN' -> prompt sheet_NN_prompt.txt · anchor sheet_01_codex.png · result sheet_NN_codex.png (here)
  advance 'aNN' -> prompt ../../advances/source/sheet_NN_prompt.txt · anchor classes/source/sheet_01_classes.png ·
                   result ../../advances/source/sheet_NN_codex.png
Same call as advance/source/tree_20261114/run_codex.py. log -> run_20261114.log · work dir = CODEX_WORK (default ./_run, not kept)
"""
import concurrent.futures as cf
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ICONS = HERE.parents[1]                       # icons_source
ADV = ICONS / 'advances' / 'source'
WORK = Path(os.environ.get('CODEX_WORK', HERE / '_run'))
EXT = sorted((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'))[-1]
EXE = EXT / 'bin/windows-x86_64/codex.exe'
LOG = HERE / 'run_20261114.log'
PLAN = json.loads((HERE / 'plan_20261114.json').read_text(encoding='utf-8'))


def job(sid):
    if sid.startswith('a'):
        no = sid[1:]
        return ADV / f'sheet_{no}_prompt.txt', ICONS / 'classes/source/sheet_01_classes.png', ADV / f'sheet_{no}_codex.png'
    return HERE / f'sheet_{sid}_prompt.txt', HERE / 'sheet_01_codex.png', HERE / f'sheet_{sid}_codex.png'


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def run(sid):
    prompt, anchor, out = job(sid)
    body = prompt.read_text(encoding='utf-8')
    wd = WORK / sid
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last), '-i', str(anchor), '-']
    t0 = time.time()
    log(f'{sid} start')
    try:
        with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
            p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
        rc = p.returncode
    except subprocess.TimeoutExpired:
        rc = 'timeout'
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    path = next((Path(s.strip().strip('`"')) for s in txt.splitlines() if s.strip().lower().strip('`"').endswith('.png')), None)
    if not path or not path.exists():
        # drawn but the path did not come back — pick it up from the thread folder
        try:
            tid = json.loads((wd / 'events.jsonl').read_text(encoding='utf-8').splitlines()[0]).get('thread_id')
            pngs = sorted((Path.home() / '.codex/generated_images' / tid).glob('*.png'), key=lambda q: q.stat().st_mtime) if tid else []
            path = pngs[-1] if pngs else None
        except Exception:
            path = None
    if not path or not path.exists():
        log(f'{sid} FAIL rc={rc} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return sid, False
    shutil.copy2(path, out)
    log(f'{sid} ok ({time.time() - t0:.0f}s)')
    return sid, True


def main():
    ids = sys.argv[1:] or ([n for n in PLAN['sheets'] if not job(n)[2].exists()]
                           + [f'a{n}' for n in PLAN['adv_sheets'] if not job(f'a{n}')[2].exists()])
    log(f'batch {ids} exe={EXT.name}')
    with cf.ThreadPoolExecutor(min(6, len(ids) or 1)) as ex:
        res = list(ex.map(run, ids))
    log('done ' + ' '.join(f'{n}={"ok" if ok else "FAIL"}' for n, ok in res))


if __name__ == '__main__':
    main()
