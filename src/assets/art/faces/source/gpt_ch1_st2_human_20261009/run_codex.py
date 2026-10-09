# -*- coding: utf-8 -*-
"""1-2 인간 3종(1201 보병 · 1202 궁수 · 1203 기사) 그림체 비교 — Codex(ChatGPT 로그인) 발주.

생김새 · 실루엣 · 구도는 현행 source/ready/monster/<id>.png 가 유일한 기준이고,
버전마다 그림체 참조(Image 2 · 3)만 바꾼다.

python run_codex.py [v1_1201 ...]   (없으면 out/<ver>/<id>.png 가 아직 없는 것 전부)
"""
import concurrent.futures as cf
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
FACES = HERE.parent  # faces/source
WORK = Path(os.environ.get('CODEX_WORK', HERE / '_run'))
EXE = max((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'),
          key=lambda p: p.stat().st_mtime) / 'bin/windows-x86_64/codex.exe'
PAR = int(os.environ.get('CODEX_PAR', '3'))
LOG = HERE / 'run.log'

IDS = {'1201': 'infantry soldier', '1202': 'hooded archer', '1203': 'knight'}

# 버전 = 그림체 참조 묶음 + 그림체 지시 한 줄
VERSIONS = {
    'v1': (['ready/monster/1401.png', 'ready/monster/1402.png'],
           'the same clean bold near-black outlines, angular broad shaded facets, subdued flat '
           'dark-fantasy cartoon colors, restrained brush shading and material highlights as Images 2-3. '
           'Transfer their rendering only, never their demon features, horns, grin, fire, face, costume or proportions.'),
    'v2': (['ready/gpt/hero/knight_4.png', 'ready/gpt/hero/knight_2.png'],
           'the same bold near-black outlines, angular shaded facets, subdued colors and armor highlights '
           'as Images 2-3, and give the skin the same living human skin tone as Image 2 instead of grey. '
           'Transfer their rendering only, never their face, helmet, plume, hair or costume.'),
    'v3': (['ready/gpt/monster/1250.png', 'ready/gpt/monster/1301.png'],
           'the same clean bold near-black outlines, angular broad shaded facets, subdued flat '
           'dark-fantasy cartoon colors, restrained brush shading and material highlights as Images 2-3. '
           'Transfer their rendering only, never their skull faces, helmet, banner, rust or costume.'),
}

COMMON = """Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

PROMPT:
Edit Image 1 only: change the rendering style of this exact existing RPG bust portrait of a human enemy {role}.
Image 1 is the sole source for identity, pose and composition; Images 2 and 3 are paint-and-line style references only.
Trace Image 1 faithfully. Keep exactly its face and expression, facial landmarks, head shape, hairstyle, beard, scars, anatomy, silhouette, proportions, pose, head tilt, gaze, clothing, armor, hood, quiver, accessories, crop, headroom and all relative positions. Do not add, remove, redesign, mirror, rotate, re-pose, rescale or recenter the character.
Change only the drawing treatment to {style}
Output just one square portrait with the EXACT source framing, genuine transparent background, no grid, text, scenery, shadow or watermark. This is a style edit, not character design.
"""


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def jobs():
    return [f'{v}_{i}' for v in VERSIONS for i in IDS]


def run(job):
    ver, idx = job.split('_')
    refs, style = VERSIONS[ver]
    body = COMMON.format(role=IDS[idx], style=style)
    (HERE / 'prompts').mkdir(exist_ok=True)
    (HERE / 'prompts' / f'{job}.txt').write_text(body, encoding='utf-8')
    wd = WORK / job
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    images = [FACES / f'ready/monster/{idx}.png'] + [FACES / r for r in refs]
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last)]
    for a in images:
        cmd += ['-i', str(a)]
    cmd += ['-']
    t0 = time.time()
    log(f'{job} start')
    with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
        p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    path = next((Path(s.strip().strip('`"')) for s in txt.splitlines()
                 if s.strip().lower().strip('`"').endswith('.png')), None)
    if p.returncode != 0 or not path or not path.exists():
        log(f'{job} FAIL rc={p.returncode} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return job, False
    dst = HERE / 'out' / ver / f'{idx}.png'
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dst)
    log(f'{job} ok {path} ({time.time() - t0:.0f}s)')
    return job, True


def main():
    ids = sys.argv[1:] or [j for j in jobs()
                           if not (HERE / 'out' / j.split('_')[0] / f"{j.split('_')[1]}.png").exists()]
    log(f'batch {ids} par={PAR} exe={EXE.parent.parent.parent.name}')
    with cf.ThreadPoolExecutor(PAR) as ex:
        res = list(ex.map(run, ids))
    log('done ' + ' '.join(f'{s}={"ok" if ok else "FAIL"}' for s, ok in res))


if __name__ == '__main__':
    main()
