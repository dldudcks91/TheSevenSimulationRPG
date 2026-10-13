# -*- coding: utf-8 -*-
"""고른 비석(cand_a.png)의 빈 앞면에 **읽히지 않는 흰 비문**을 새기는 Codex 편집 발주 (ADR-0614).

python run_codex_edit.py [변형 id ...]   (없으면 cand_<id>.png 가 아직 없는 변형 전부)
입력 그림 = cand_a.png 하나(편집 바탕) · 지시문 = EDIT_COMMON + 변형 한 줄 → prompt_<id>.txt · 결과 cand_<id>.png · 로그 run.log
발주 · 경로 건지기는 run_codex.py 와 같다.
"""
import concurrent.futures as cf
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_codex import EXE, HERE, LOG, WORK, log  # noqa: E402

BASE = HERE / 'cand_a.png'

EDIT_COMMON = """Use the built-in image generation tool to EDIT the attached image (a gravestone game sprite). Do not create or edit any other file. When done, reply with only the absolute path of the generated PNG.

Keep everything exactly as it is - the stone shape, the horned skull, cracks, moss, plinth, earth mound, outline weight, colors, size, position and the TRANSPARENT background. Change only the blank recessed front panel:
carve a weathered EPITAPH into it so that from a distance the stone reads as "something is written here". The inscription is pale off-white (like old chalk-filled or worn engraved letters on gray stone), slightly faded and chipped, centered inside the panel with a clear margin to the panel border.
The marks must look like writing but must NOT be readable: no letters or words of any real language (no Latin, Korean, runes you can read, numbers or symbols) - just short pseudo-script strokes and dashes arranged in lines, like illegible handwriting seen from far away.
Same clean cartoon style as the rest of the image: bold simple strokes, no thin detail, nothing photoreal. Shown small (about 100 px), so use a few chunky lines rather than many tiny ones.

Layout of the inscription: """

EDITS = {
    'ins1': 'one slightly larger title line at the top, a short horizontal divider line under it, then 4 shorter lines of pseudo-script below, centered like a classic epitaph.',
    'ins2': '5 to 6 even lines of pseudo-script filling the upper two thirds of the panel, centered, with the lowest line shorter; a little worn away at one edge.',
    'ins3': 'a short title line at the top, a small cross-like ornament or simple carved emblem in the middle, and 2 short lines of pseudo-script at the bottom.',
}


def run(vid):
    body = EDIT_COMMON + EDITS[vid] + '\n'
    (HERE / f'prompt_{vid}.txt').write_text(body, encoding='utf-8')
    wd = WORK / vid
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last), '-i', str(BASE), '-']
    t0 = time.time()
    log(f'{vid} start (edit {BASE.name})')
    with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
        p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    path = next((Path(s.strip().strip('`"')) for s in txt.splitlines() if s.strip().lower().strip('`"').endswith('.png')), None)
    if not path or not path.exists():
        try:
            tid = json.loads((wd / 'events.jsonl').read_text(encoding='utf-8').splitlines()[0]).get('thread_id')
            pngs = sorted((Path.home() / '.codex/generated_images' / tid).glob('*.png'), key=lambda q: q.stat().st_mtime) if tid else []
            path = pngs[-1] if pngs else None
        except Exception:
            path = None
    if not path or not path.exists():
        log(f'{vid} FAIL rc={p.returncode} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return vid, False
    shutil.copy2(path, HERE / f'cand_{vid}.png')
    log(f'{vid} ok {path} ({time.time() - t0:.0f}s)')
    return vid, True


def main():
    ids = sys.argv[1:] or [v for v in EDITS if not (HERE / f'cand_{v}.png').exists()]
    log(f'edit batch {ids}')
    with cf.ThreadPoolExecutor(len(ids) or 1) as ex:
        res = list(ex.map(run, ids))
    log('done ' + ' '.join(f'{v}={"ok" if ok else "FAIL"}' for v, ok in res))


if __name__ == '__main__':
    main()
