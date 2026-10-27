# -*- coding: utf-8 -*-
"""왼쪽 위 브랜드 로고 「THE SEVEN」 시안 — Codex(ChatGPT 로그인) 발주.

앵커 = 지금 화면(D2 Min 스킨) 캡처 ref_ui_now.png — 로고가 앉을 돌 상단바를 보여 준다.
판 6 = 설치본(installed/08_dagger) 말고 다 지우고 중세 느낌의 새 방향 열 장 · 바탕 시안 없이.
공통 사양(COMMON) + 시안마다 화풍 한 덩어리 + 바탕 시안(STYLES — 붙이면 BASE 에서 읽는다). 결과는 out/<시안>.png.

python run_codex.py [01_lombardic ...]   (잡을 안 주면 out/ 에 없는 것 전부)
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
PAR = int(os.environ.get('CODEX_PAR', '4'))
LOG = HERE / 'run.log'
REFS = [HERE / 'ref_ui_now.png']
BASE = HERE / 'installed'  # 바탕 시안을 붙일 때 읽는 곳

WRAP = """Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

"""

COMMON = """Game title logo for a dark fantasy loot RPG themed on the Seven Deadly Sins.
Image 1 is a screenshot of the game's current UI: near-black weathered stone panels with thin double stone borders and blood-red accents, a minimal Diablo II-like look. The plain text "THE SEVEN" in its top-left corner is what this logo replaces.
{bases}
Text: {text} — exactly these words, spelled exactly like this, and no other text anywhere (no subtitle, no tagline, no "RPG", no numbers).
Design: {style}
Medieval feel: it must clearly feel medieval (12th to 15th century European manuscripts, carvings, heraldry, metalwork) — period letterforms, hand-made materials, worn edges, aged ivory instead of pure white, old cinnabar red instead of bright red. But it must stay bold, legible and high contrast, never grungy or muddy.
Readability: it will be scaled down to about 300 by 50 pixels, so keep the letterforms clear; no hairline strokes and no tiny ornaments.
It sits on a near-black background, so every part must stay visible on black: no black or very dark elements. Keep a clear gap between "THE" and "SEVEN". Any emblem or decoration stays within the height of the capital letters, so the words stay large.
Avoid the glossy 3D game-logo look — no chrome or metal bevels, no heavy drop shadows, no glow, no lens flares.
Layout: one long horizontal strip about 5 times wider than tall, centered in a landscape 3:2 canvas, with empty space above and below.
Background: fully transparent (PNG alpha) around the logo. No backdrop plate, banner, frame or box behind the logo unless the design above describes one.
"""

# (글자, 설계, 바탕 시안 — BASE/<이름>.png · 붙인 순서대로 Image 2, 3)
STYLES = {
    '01_lombardic': ('"THE SEVEN"',
                     'Lombardic versal capitals from a 13th-century manuscript: round swelling strokes, cinnabar red letters '
                     'with a thin aged-ivory outline, small ivory diamond dots set inside the counters. "THE" smaller in aged ivory.',
                     []),
    '02_textura': ('"The Seven"',
                   'gothic Textura blackletter in aged ivory ink, but the capital T and capital S are large red Lombardic '
                   'versals, as a scribe would rubricate them. Slightly uneven hand-inked strokes.',
                   []),
    '03_uncial': ('"THE SEVEN"',
                  'Insular uncial lettering like the Book of Kells, aged ivory letters with a thin red outline; the S of "SEVEN" '
                  'holds a small interlaced red Celtic knot. Restrained ornament, the word stays easy to read.',
                  []),
    '04_relief': ('"THE SEVEN"',
                  'letters carved in raised relief from worn pale limestone, chipped corners and small cracks, like a cathedral '
                  'inscription; the letters of "SEVEN" keep traces of old red pigment in their grooves.',
                  []),
    '05_rust_iron': ('"THE SEVEN"',
                     'letters forged from hammered iron bars joined with round rivets, covered in warm orange-brown rust, '
                     '"SEVEN" with a deep red-brown rust. Blacksmith work on a castle gate. Visible and warm, never black.',
                     []),
    '06_scroll': ('"THE SEVEN"',
                  'an aged parchment ribbon scroll (phylactery) running horizontally, its two ends curling back, muted tan with '
                  'darker worn edges (the scroll is part of the logo, outside it stays transparent). Words in cinnabar red '
                  'gothic capitals on the scroll.',
                  []),
    '07_engraving': ('"THE SEVEN"',
                     'title lettering from a 15th-century printed book, bold old-style capitals in aged ivory shaded with fine '
                     'engraved cross-hatching; "SEVEN" printed in red as a rubric. Woodcut print feel.',
                     []),
    '08_tapestry': ('"THE SEVEN"',
                    'a narrow woven linen band like the Bayeux Tapestry (the band is part of the logo, outside it stays '
                    'transparent), pale beige with visible threads; the words stitched in wool thread, "THE" in ochre and '
                    '"SEVEN" in madder red, with a simple stitched border line.',
                    []),
    '09_cross': ('"THE SEVEN"',
                 'a knightly order mark: a red cross pattee placed between "THE" and "SEVEN", as tall as the letters, with '
                 'chiselled aged-ivory Roman capitals slightly worn at the edges. Templar seal feel, flat colors.',
                 []),
    '10_sign': ('"THE SEVEN"',
                'a weathered pale oak signboard hanging from two very short iron chains at its top corners, like an inn sign '
                '(the sign is part of the logo, outside it stays transparent). The words painted on it in cinnabar red and '
                'aged ivory, the paint slightly flaked. The whole thing stays a long low strip.',
                []),
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
    text, style, bases = STYLES[job]
    names = ' and '.join(f'Image {i + 2}' for i in range(len(bases)))
    note = (f'{names} {"are earlier drafts" if len(bases) > 1 else "is an earlier draft"} of this logo — '
            'keep the idea and layout described below, but redraw it fresh.\n') if bases else ''
    body = WRAP + COMMON.format(bases=note, text=text, style=style)
    wd = WORK / job
    wd.mkdir(parents=True, exist_ok=True)
    (wd / 'prompt.txt').write_text(body, encoding='utf-8')
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last)]
    for r in REFS + [BASE / f'{b}.png' for b in bases]:
        cmd += ['-i', str(r)]
    cmd += ['-']
    t0 = time.time()
    log(f'{job} start bases={bases}')
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
