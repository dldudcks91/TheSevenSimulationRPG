# -*- coding: utf-8 -*-
"""기본 스킬 깔끔판 — spec.py 의 시트를 Codex(ChatGPT 로그인 · VS Code 확장 묶음 codex.exe)로 병렬 발주한다.

python run_codex.py [시트 id ...]   (없으면 sheet_<id>.png 가 아직 없는 시트 전부)
결과 그림은 sheet_<id>.png 로 복사한다. 로그는 run.log.
"""
import concurrent.futures as cf
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from spec import COMMON, SHEETS  # noqa: E402

HERE = Path(__file__).resolve().parent
WORK = Path(os.environ.get('ADV_WORK', HERE / '_run'))
EXE = Path.home() / '.vscode/extensions/openai.chatgpt-26.1002.51308-win32-x64/bin/windows-x86_64/codex.exe'
PAR = int(os.environ.get('ADV_PAR', '5'))
LOG = HERE / 'run.log'


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def prompt(sid):
    cells = SHEETS[sid]
    body = COMMON + '\n'.join(f'{i}. {c}' for i, c in enumerate(cells, 1)) + '\n'
    (HERE / f'prompt_{sid}.txt').write_text(body, encoding='utf-8')
    return body


def run(sid):
    body = prompt(sid)
    wd = WORK / sid
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    anchors = [HERE / 'anchor/code_effects.png', HERE / 'anchor/face_goblin.png']
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last)]
    for a in anchors:
        cmd += ['-i', str(a)]
    cmd += ['-']
    t0 = time.time()
    log(f'{sid} start')
    with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
        p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    path = next((Path(s.strip().strip('`"')) for s in txt.splitlines() if s.strip().lower().strip('`"').endswith('.png')), None)
    if p.returncode != 0 or not path or not path.exists():
        log(f'{sid} FAIL rc={p.returncode} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return sid, False
    shutil.copy2(path, HERE / f'sheet_{sid}.png')
    log(f'{sid} ok {path} ({time.time() - t0:.0f}s)')
    return sid, True


def main():
    ids = sys.argv[1:] or [s for s in SHEETS if not (HERE / f'sheet_{s}.png').exists()]
    log(f'batch {ids} par={PAR}')
    with cf.ThreadPoolExecutor(PAR) as ex:
        res = list(ex.map(run, ids))
    log('done ' + ' '.join(f'{s}={"ok" if ok else "FAIL"}' for s, ok in res))


if __name__ == '__main__':
    main()
