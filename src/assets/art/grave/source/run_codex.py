# -*- coding: utf-8 -*-
"""무덤 명패 비석 그림을 Codex(ChatGPT 로그인 · VS Code 확장 묶음 codex.exe)로 병렬 발주한다 (ADR-0590 의 「그림이 생기면 같은 자리에 갈아 끼운다」).

python run_codex.py [변형 id ...]   (없으면 cand_<id>.png 가 아직 없는 변형 전부)
지시문 = COMMON + 변형 한 줄 → prompt_<id>.txt 로 남긴다. 결과 그림은 cand_<id>.png 로 복사한다. 로그는 run.log.
작업 폴더는 GRAVE_WORK(없으면 ./_run) · 앵커는 GRAVE_ANCHOR(없으면 ./anchor) 의 boss_1900.png · shrine_wrath.png
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
WORK = Path(os.environ.get('GRAVE_WORK', HERE / '_run'))
ANCHOR = Path(os.environ.get('GRAVE_ANCHOR', HERE / 'anchor'))
EXT = sorted((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'))[-1]
EXE = EXT / 'bin/windows-x86_64/codex.exe'
LOG = HERE / 'run.log'

COMMON = """Use the built-in image generation tool to create exactly ONE image. Do not create or edit any other file. When done, reply with only the absolute path of the generated PNG.

Subject: a single old gravestone (headstone) of a slain demon lord - a 2D game UI sprite. It stands in for a boss portrait while the boss is dead, and the game prints the boss name and a countdown timer ON the blank front face, so:
- Straight-on FRONT view (no perspective tilt, no side face visible), symmetrical silhouette: an upright slab with an arched round top, standing on a low rough stone plinth with a small mound of dark earth and 2-3 dead grass tufts at its foot.
- The front face carries a large flat EMPTY stone panel - about 60% of the slab's width and 50% of the whole object's height, centered, slightly recessed with a thin carved border. The panel is completely empty: no text, no letters, no runes, no numbers, no symbols, no cracks or moss crossing it. Keep the panel an even mid-dark cool gray so light text stays readable on it.
- All character goes on the rim, never on the panel: a few chips and cracks on the edges and top, moss creeping on the lower corners, plus the ornament below.
Rendering: match Image 1 and Image 2 - clean cartoon, bold uniform dark outline (#0B060C) around every shape, flat base colors with ONE soft shade step and a small highlight, muted mid-value colors, gritty old-fashioned dark-fantasy mood. Weathered and old, never clean or new. Not glossy, not cute, no glow, no airbrush gradients, no photoreal texture, no 3D render.
Palette: cold stone grays, dark iron, a little moss green and dark earth brown. No bright colors.
Canvas: 1024x1024, TRANSPARENT background, exactly one gravestone centered. The whole object (stone + plinth + mound) is about 3:4 width:height and fills about 84% of the canvas height with an 8% empty margin on every side.
Readability: shown small (about 80 to 160 px) - a few big readable shapes, no tiny details, no strokes thinner than the outline.
No text anywhere, no background scenery, no sky, no ground plane beyond the small mound, no cast shadow, no frame, no watermark, no characters or creatures.

References:
- Image 1 - a chapter-boss portrait from this game: outline weight, flat shading, muted color. Style only; do not draw its character.
- Image 2 - a stone shrine sprite from this game: how weathered stone props are rendered. Style only; do not draw a shrine.

Ornament for this gravestone: """

VARIANTS = {
    'a': 'a small carved horned demon skull set into the top of the arch, above the panel, with its two curled horns following the curve of the arch.',
    'b': 'a carved broken crown on the top of the arch, above the panel, one of its points snapped off - the grave of a fallen king.',
    'c': 'a rusty broken iron chain draped over one shoulder of the arch and hanging down the outer edge (outside the panel), and a short notched rusty sword driven into the mound at the foot, leaning against the plinth.',
}


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def run(vid):
    body = COMMON + VARIANTS[vid] + '\n'
    (HERE / f'prompt_{vid}.txt').write_text(body, encoding='utf-8')
    wd = WORK / vid
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last),
           '-i', str(ANCHOR / 'boss_1900.png'), '-i', str(ANCHOR / 'shrine_wrath.png'), '-']
    t0 = time.time()
    log(f'{vid} start')
    with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
        p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    path = next((Path(s.strip().strip('`"')) for s in txt.splitlines() if s.strip().lower().strip('`"').endswith('.png')), None)
    if not path or not path.exists():
        # 그림은 그렸는데 경로를 못 받는 때 — thread_id 폴더에서 건진다 (docs/reference/image_generation_tools.md)
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
    ids = sys.argv[1:] or [v for v in VARIANTS if not (HERE / f'cand_{v}.png').exists()]
    log(f'batch {ids} exe={EXE.parent.parent.parent.parent.name}')
    with cf.ThreadPoolExecutor(len(ids) or 1) as ex:
        res = list(ex.map(run, ids))
    log('done ' + ' '.join(f'{v}={"ok" if ok else "FAIL"}' for v, ok in res))


if __name__ == '__main__':
    main()
