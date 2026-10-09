# -*- coding: utf-8 -*-
"""1-2 인간 3종(1201 보병 · 1202 궁수 · 1203 기사)을 Gemini 초상 결로 새로 그린다 — Codex(ChatGPT 로그인) 발주.

그림체 기준은 Gemini 설치본의 원본(source/ready/hero · monster)이고, 인물은 새로 설계한다.
판(round)마다 프롬프트(rounds/<판>.txt)와 붙이는 방식이 다르다 — 인물 묘사 · 참조 묶음(버전)은 같다.

python run_codex.py <판> [v1_1201 ...]   (잡을 안 주면 그 판의 기본 잡 중 out/<판>/ 에 없는 것 전부)
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
READY = HERE.parent / 'ready'
WORK = Path(os.environ.get('CODEX_WORK', HERE / '_run'))
EXE = max((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'),
          key=lambda p: p.stat().st_mtime) / 'bin/windows-x86_64/codex.exe'
PAR = int(os.environ.get('CODEX_PAR', '3'))
LOG = HERE / 'run.log'

CHARS = {
    '1201': 'a human foot soldier wearing a plain round kettle helmet with a wide brim and a padded cloth gambeson',
    '1202': 'a human archer in a close leather skullcap, with a quiver showing exactly three chunky flat '
            'fletchings just above one shoulder, never thin lines',
    '1203': 'a human knight in a closed flat-topped great helm with a cross-shaped eye slit and a plain dark surcoat',
}

# 버전 = Gemini 참조 묶음. v3 만 인물마다 차림이 가까운 영웅을 짝지어 붙인다
VERSIONS = {
    'v1': {i: ['hero/knight_4', 'hero/priest_1', 'hero/archer_1', 'hero/warrior_5'] for i in CHARS},
    'v2': {i: ['monster/1101', 'monster/1301', 'monster/1250', 'hero/priest_1'] for i in CHARS},
    'v3': {'1201': ['hero/knight_4', 'hero/warrior_4', 'hero/knight_5'],
           '1202': ['hero/archer_1', 'hero/mage_1', 'hero/priest_2'],
           '1203': ['hero/knight_1', 'hero/knight_2', 'hero/warrior_1']},
}
ALL = [f'{v}_{i}' for v in VERSIONS for i in CHARS]
DIAG = ['v1_1201', 'v2_1202', 'v3_1203']  # 탐색 판 — 세 묶음 · 세 인물을 한 장씩

WRAP = """Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

"""


def conf(rnd):
    """rounds/<판>.json — {"jobs": "diag"|"all", "lead": null | {"1201": "hero/x", ...} | {"v1": {"1201": ...}, ...},
    "chars": {키: 인물 한 줄} (주면 잡 = d_<키> 전부 · 버전 대신 "refs" 한 묶음)}
    (lead = 맨 앞에 붙는 편집 바탕 — 판 전체 하나 또는 버전별)"""
    p = HERE / 'rounds' / f'{rnd}.json'
    c = json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}
    return {'jobs': c.get('jobs', 'diag'), 'lead': c.get('lead'), 'chars': c.get('chars'), 'refs': c.get('refs')}


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def from_thread(events):
    """events.jsonl 의 thread_id → ~/.codex/generated_images/<thread_id>/ 의 가장 새 PNG"""
    for line in events.read_text(encoding='utf-8', errors='replace').splitlines():
        if '"thread.started"' in line:
            pngs = sorted((Path.home() / '.codex/generated_images' / json.loads(line)['thread_id']).glob('*.png'),
                          key=lambda q: q.stat().st_mtime)
            return pngs[-1] if pngs else None
    return None


def out_of(rnd, job):
    return HERE / 'out' / rnd / f'{job}.png'


def run(rnd, job):
    ver, idx = job.split('_')
    c = conf(rnd)
    body = WRAP + (HERE / 'rounds' / f'{rnd}.txt').read_text(encoding='utf-8').format(char=(c['chars'] or CHARS)[idx])
    lead = c['lead'] and (c['lead'][ver] if ver in c['lead'] else c['lead'])[idx]  # 판 전체 하나 또는 버전별
    refs = ([lead] if lead else []) + [r for r in (c['refs'] or VERSIONS[ver][idx]) if r != lead]
    wd = WORK / rnd / job
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last)]
    for r in refs:
        cmd += ['-i', str(READY / f'{r}.png')]
    cmd += ['-']
    t0 = time.time()
    log(f'{rnd}/{job} start refs={refs}')
    with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
        p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    path = next((Path(s.strip().strip('`"')) for s in txt.splitlines()
                 if s.strip().lower().strip('`"').endswith('.png')), None)
    if not path or not path.exists():
        path = from_thread(wd / 'events.jsonl')  # 그림은 그렸는데 경로를 못 돌려주는 때가 있다
    if p.returncode != 0 or not path or not path.exists():
        log(f'{rnd}/{job} FAIL rc={p.returncode} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return job, False
    dst = out_of(rnd, job)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dst)
    log(f'{rnd}/{job} ok ({time.time() - t0:.0f}s)')
    return job, True


def main():
    rnd, jobs = sys.argv[1], sys.argv[2:]
    if not jobs:
        c = conf(rnd)
        every = [f'd_{k}' for k in c['chars']] if c['chars'] else ALL if c['jobs'] == 'all' else DIAG
        jobs = [j for j in every if not out_of(rnd, j).exists()]
    log(f'batch {rnd} {jobs} par={PAR}')
    with cf.ThreadPoolExecutor(PAR) as ex:
        res = list(ex.map(lambda j: run(rnd, j), jobs))
    log(f'done {rnd} ' + ' '.join(f'{s}={"ok" if ok else "FAIL"}' for s, ok in res))


if __name__ == '__main__':
    main()
