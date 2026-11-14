# -*- coding: utf-8 -*-
"""Draw the advance tree icon sheets with Codex (ChatGPT login · VS Code extension codex.exe) in parallel.

python run_codex.py [NN ...]   (default: every sheet in plan.json without sheet_NN_codex.png)
prompt = sheet_NN_prompt.txt (plan.py) · anchor = skill sheet for 01, ../sheet_01_codex.png for the rest
result -> sheet_NN_codex.png · log -> run.log · work dir = TREE_WORK (default: ./_run, not kept)
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
ICONS = HERE.parents[3]                      # icons_source
WORK = Path(os.environ.get('TREE_WORK', HERE / '_run'))
EXT = sorted((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'))[-1]
EXE = EXT / 'bin/windows-x86_64/codex.exe'
LOG = HERE / 'run.log'
ANCHOR = {'skill': ICONS / 'skills/source/kni_advanced_skills_sheet.png', 'node': HERE.parent / 'sheet_01_codex.png'}
PLAN = json.loads((HERE / 'plan.json').read_text(encoding='utf-8'))


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def run(no):
    body = (HERE / f'sheet_{no}_prompt.txt').read_text(encoding='utf-8')
    kind = PLAN['sheets'][no]['kind']
    wd = WORK / no
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last), '-i', str(ANCHOR[kind]), '-']
    t0 = time.time()
    log(f'{no} start ({kind})')
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
        log(f'{no} FAIL rc={rc} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return no, False
    shutil.copy2(path, HERE / f'sheet_{no}_codex.png')
    log(f'{no} ok ({time.time() - t0:.0f}s)')
    return no, True


def main():
    ids = sys.argv[1:] or [n for n in PLAN['sheets'] if not (HERE / f'sheet_{n}_codex.png').exists()]
    log(f'batch {ids} exe={EXT.name}')
    with cf.ThreadPoolExecutor(min(6, len(ids) or 1)) as ex:
        res = list(ex.map(run, ids))
    log('done ' + ' '.join(f'{n}={"ok" if ok else "FAIL"}' for n, ok in res))


if __name__ == '__main__':
    main()
