# -*- coding: utf-8 -*-
"""시작 파티 고르기 제목 그림 「FIRST PARTY」 시안 — Codex(ChatGPT 로그인) 발주 (SCREEN_DESIGN §3 · 2026-11-17).

브랜드 워드마크 「THE SEVEN」(../codex_20261027/installed/08_dagger_trim.png · ADR-0883)과 **같은 글자 결**로 그린다.
Image 1 = 그 워드마크(결을 그대로 따를 원본) · Image 2 = 지금 시작 화면(D2 Min · 제목이 앉을 자리).
결과는 out/<시안>.png. 발주 절차는 ../codex_20261027/run_codex.py 와 같다.

python run_codex.py [fp_a1 ...]   (잡을 안 주면 out/ 에 없는 것 전부)
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
WORK = HERE / '_run'
EXE = max((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'),
          key=lambda p: p.stat().st_mtime) / 'bin/windows-x86_64/codex.exe'
PAR = int(os.environ.get('CODEX_PAR', '3'))
LOG = HERE / 'run.log'
REFS = [HERE.parent / 'codex_20261027/installed/08_dagger_trim.png', HERE / 'ref_ui_start.png']

WRAP = """Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

"""

COMMON = """Screen heading for a dark fantasy loot RPG themed on the Seven Deadly Sins.
Image 1 is the game's existing title logo "THE SEVEN" (shown on transparency). Draw a companion heading in EXACTLY the same lettering style, as if the same artist made it in the same session: the same hand-carved medieval capitals with sharp flared spurs and pointed serifs, the same aged-ivory fill with subtle stone/parchment texture and a thin darker brown outline, the same old cinnabar red fill with the same texture, the same stroke weight, the same flat colors.
Image 2 is a screenshot of the screen where the heading will sit: centered above the stone panel that holds three hero cards.
Text: "FIRST PARTY" — exactly these two words, spelled exactly like this, and no other text anywhere (no subtitle, no tagline, no numbers).
Colors: "FIRST" in aged ivory like "THE" in Image 1, "PARTY" in cinnabar red like "SEVEN" in Image 1.
Design: {style}
Readability: it will be scaled down to about 40 pixels tall, so keep the letterforms clear; no hairline strokes and no tiny ornaments.
It sits on a near-black background, so every part must stay visible on black: no black or very dark elements. Keep a clear gap between "FIRST" and "PARTY".
Avoid the glossy 3D game-logo look — no chrome or metal bevels, no heavy drop shadows, no glow, no lens flares.
Layout: one long horizontal strip about 6 times wider than tall, centered in a landscape 3:2 canvas, with empty space above and below.
Background: fully transparent (PNG alpha) around the lettering. No backdrop plate, banner, frame or box.
"""

STYLES = {
    'fp_a1': 'lettering only — no dagger, no emblem, no extra ornament. As in Image 1, the first letter of each word may be slightly taller than the rest.',
    'fp_a2': 'lettering only — no dagger, no emblem, no extra ornament. As in Image 1, the first letter of each word may be slightly taller than the rest.',
    'fp_b1': 'the T of "FIRST" is a downward-pointing dagger drawn exactly like the T of "THE" in Image 1 (red gem pommel, wrapped grip, ivory cross-guard and blade). No other emblem or ornament.',
}


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


def run(job):
    body = WRAP + COMMON.format(style=STYLES[job])
    wd = WORK / job
    wd.mkdir(parents=True, exist_ok=True)
    (wd / 'prompt.txt').write_text(body, encoding='utf-8')
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last)]
    for r in REFS:
        cmd += ['-i', str(r)]
    cmd += ['-']
    t0 = time.time()
    log(f'{job} start')
    with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
        p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    path = next((Path(s.strip().strip('`"')) for s in txt.splitlines()
                 if s.strip().lower().strip('`"').endswith('.png')), None)
    if not path or not path.exists():
        path = from_thread(wd / 'events.jsonl')  # 그림은 그렸는데 경로를 못 돌려주는 때가 있다
    if p.returncode != 0 or not path or not path.exists():
        log(f'{job} FAIL rc={p.returncode} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return job, False
    dst = HERE / 'out' / f'{job}.png'
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dst)
    log(f'{job} ok ({time.time() - t0:.0f}s)')
    return job, True


def main():
    jobs = sys.argv[1:] or [j for j in STYLES if not (HERE / 'out' / f'{j}.png').exists()]
    log(f'batch {jobs} par={PAR}')
    with cf.ThreadPoolExecutor(PAR) as ex:
        res = list(ex.map(run, jobs))
    log('done ' + ' '.join(f'{s}={"ok" if ok else "FAIL"}' for s, ok in res))


if __name__ == '__main__':
    main()
