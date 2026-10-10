# -*- coding: utf-8 -*-
"""스킬 이펙트 그림체 시안 (2026-10-10).

1차 — 픽셀 · 목판화 · 스테인드글라스(사용자 「다른 그림체로 빠르게 2~3가지 · 수묵 말고」) · 시트 여덟(i1~i3 · w1~w3 · n1 · n5)만 · 게임에서는 걷었다(ADR-0584).
2차 — 고딕 펜화 · 목탄 · 유화(사용자 「초상 그림체 · 수묵만 남기고 비슷한 그림체로 3개 더 · 스킬마다 보며 정하게」) · 시트 스물다섯 전부(95장).
칸 문안 = 수묵 판(ink_20261009)의 지시문 스물다섯(prompt_<시트>.txt — i1~i3 원소 · w1~w5 전사 · n1~n17 나머지) · 칸 표 = ink_20261009/picks.py.
문안의 붓 낱말(brush · ink)은 걷고, 머리의 그림체 문단만 그림체마다 바꾼다. 구도 · 움직임 · 크기는 skill_art.js 그대로.
그림체마다 i1 을 먼저 뽑아(고블린 초상만 붙인다) 그 그림체의 기준 그림으로 삼고, 나머지 시트는 그 i1 을 붙여 발주한다.
설치 = scripts/build_style_fx.py(`<앞 판 이름>_<그림체>.webp`).

python style.py run [그림체 ...]   → 기본 = 2차 셋 · 있는 시트는 건너뛴다 · 한 번에 넷까지
python style.py prompt             → 지시문만 쓴다(prompt_<그림체>_<시트>.txt)
"""
import concurrent.futures as cf
import re
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
INK = HERE.parent / 'ink_20261009'
EXT = sorted((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'), key=lambda p: p.stat().st_mtime)[-1]
EXE = EXT / 'bin/windows-x86_64/codex.exe'
GOBLIN = INK / 'anchor/face_goblin.png'
LOG = HERE / 'run.log'
IDS = ['i1', 'i2', 'i3'] + [f'w{n}' for n in range(1, 6)] + [f'n{n}' for n in range(1, 18)]
ROUND2 = ['pen', 'charcoal', 'oil']
# 칸 문안 — 수묵 판이 발주한 지시문(prompt_<시트>.txt)의 번호 줄 넷
CELLS = {sid: [ln.split('. ', 1)[1] for ln in (INK / f'prompt_{sid}.txt').read_text(encoding='utf-8').splitlines()
               if ln[:2] in ('1.', '2.', '3.', '4.')] for sid in IDS}

STYLES = {
    'pixel': ('16-BIT PIXEL ART',
              "like the spell sprites of a 16-bit SNES-era RPG. Chunky, clearly visible square pixels on a coarse grid — as if each cell were drawn "
              "at about 48x48 pixels and scaled up with nearest-neighbour — hard stair-stepped pixel edges, no anti-aliasing, no smooth gradients, no blur. "
              "A limited palette: 3 or 4 flat shades of the effect's color plus a near-black outline, a little checker dithering allowed. "
              "Bold, readable sprite silhouettes with lots of empty space; never a smooth painting."),
    'woodcut': ('WOODCUT PRINT',
                "like a print from a carved woodblock in an old grimoire or a 15th-century broadsheet. Bold carved shapes with chiselled, jagged edges "
                "and rows of parallel gouge lines for shading, printed in near-black plus ONE flat muted color per effect (the color below), the color layer "
                "slightly off-register. The color areas carry the shape so it reads on a dark screen; the black carving is the detail. "
                "No gradients, no soft shading, no glow, lots of empty space."),
    'glass': ('GOTHIC STAINED GLASS',
              "like a gothic cathedral window. Each effect's shape is built from flat pieces of colored glass split by thick dark lead lines — angular shards, "
              "every piece one flat muted jewel tone with at most one faint lighter streak, no soft glow, no gradients. "
              "Only the effect itself is glass: no window frame, no panel, no border — the background stays empty magenta around the shape. "
              "Bold simple silhouettes, lots of empty space."),
    # 2차 — 초상 그림체(굵고 고르지 않은 목탄 외곽선 · 평평한 칠)와 수묵(붓 획 · 빈 곳) 사이
    'pen': ('GOTHIC BRUSH-INK COMIC',
            "like a grim gothic comic inked with a heavy brush. Thick, uneven black brush-ink contours that swell and taper, solid black shadow shapes, "
            "flat muted fills at middle value with one shadow tone, ragged dry-brush edges and a few short crosshatch strokes. "
            "A few large blunt shapes you can count, hand-inked and a little crude — never a clean vector line, never glossy."),
    'charcoal': ('CHARCOAL AND CHALK',
                 "like a quick rough drawing in charcoal and colored chalk. Grainy, smudged charcoal strokes with broken dry edges, "
                 "the effect's muted color rubbed in with chalk over the dark strokes, visible paper grain inside the marks, a few smudge streaks. "
                 "Loose and expressive, a few strong gestures, lots of empty space — never a clean line, never a smooth gradient."),
    'oil': ('THICK OIL PAINT',
            "like small studies painted with thick oil paint and a stiff brush. Chunky opaque daubs of paint with visible bristle ridges, "
            "blunt heavy forms, muted desaturated colors at middle value with one darker umber tone around the edges instead of an outline, "
            "a few bright palette-knife highlights. Heavy, old and worn, a little clumsy on purpose — never smooth, never glossy."),
}

DONT = ("DO NOT (these make it look like generic AI clip art): no sparkles, no twinkle stars, no floating diamond confetti, no scattered glitter dots · "
        "no glossy shine, no glow, no bloom, no lens flare · no perfectly symmetrical starburst, no comic \"POW\" star · no saturated or neon colors · "
        "no mobile-game or sticker look.")

COLORS = ("fire = dull red-orange · ice = cold slate blue · lightning = pale ochre-gold · poison = murky olive green · holy = pale dull gold · "
          "physical strikes = cold steel gray with a hint of dull crimson · earth = ochre brown · blood = dark crimson · steel = cool gray · "
          "gold = dull old gold · verdigris = muted teal green · arcane = muted steel blue · wind = pale sage green · heal = muted sage green · "
          "shadow = dusky slate gray · sky = pale slate blue")


def plain(t):
    """수묵 문안의 붓 낱말을 걷는다 — 모양 · 수 · 자리만 남긴다"""
    t = re.sub(r'\bink[- ](?=splash|flecks|blood|burst)', '', t)
    t = re.sub(r'\bflung ink\b', 'flung drops', t)
    t = re.sub(r'\bbrush\s+', '', t)
    return t


def head(style, anchored):
    name, desc = STYLES[style]
    ref = (f"Two reference images are attached: (1) a sheet of four skill effects in the {name} style (on magenta) — THIS IS THE EXACT ART STYLE TO MATCH; "
           "(2) a goblin portrait from our game, to show what the effects flash over. Do NOT copy the portrait's drawing style."
           if anchored else
           "One reference image is attached: a goblin portrait from our game. It only shows WHAT the effects will flash over "
           "(a small portrait on a dark battle screen). Do NOT copy its drawing style.")
    return f"""Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

{ref}

PROMPT:
Skill effects for a grim dark-fantasy party RPG with a dark, minimal battle screen. Each effect flashes for half a second over a small head-and-shoulders portrait about 90 pixels wide, so it must read instantly and must not glare on a dark screen.

ART STYLE — {name}: {desc}
{DONT}
Colors (muted, never glaring): {COLORS}.
Effects only: no characters, no faces, no text, and no weapons or objects unless a cell names one. When a cell names an object (shield, sword, lance, hammer, cross, wings...), draw it simply in the same style and let the effect dominate.
Ignore any rendering words inside a cell (strokes, outline, thin lines, chipped, glossy...): draw every cell in the {name} style above — the cell text only gives the shapes, how many, and where they sit.
Cells marked BIG are ADVANCED skills: a clear step grander — spreading out to the edges of the cell, with one extra layer (a second ring, a trail, flying pieces) — but in exactly the same style. Other cells stay inside the middle 85% of the cell.

SHEET: square image, 2x2 grid of four separate pictures, straight 16px pure black gridlines running fully from edge to edge, solid flat pure magenta #FF00FF background in every cell, no text anywhere. Nothing in the pictures may be pink, magenta or purple. Every shape fully opaque (no semi-transparent haze or glow) — it will be cut out of the magenta.
Each picture stays inside its own cell with a clear strip of magenta before the gridlines.
Cells marked FALL show something dropping from above: its point is LOW in the cell (at the stated height) with its trail reaching up toward the top edge. Cells marked IMPACT LOW are centered low in the cell at the stated height. Buff and heal cells keep the MIDDLE 50% of the cell EMPTY magenta (the face shows there).

"""


def prompt(style, sid):
    body = head(style, sid != 'i1') + '\n'.join(f'{i}. {plain(c)}' for i, c in enumerate(CELLS[sid], 1)) + '\n'
    (HERE / f'prompt_{style}_{sid}.txt').write_text(body, encoding='utf-8')
    return body


_lock = threading.Lock()


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    with _lock:
        print(line, flush=True)
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(line + '\n')


def sheet(style, sid):
    return HERE / f'sheet_{style}_{sid}.png'


def run(style, sid):
    key = f'{style}_{sid}'
    body = prompt(style, sid)
    wd = HERE / '_run' / key
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last)]
    for a in ([] if sid == 'i1' else [sheet(style, 'i1')]) + [GOBLIN]:
        cmd += ['-i', str(a)]
    cmd += ['-']
    t0 = time.time()
    log(f'{key} start')
    try:
        with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
            p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
        rc = p.returncode
    except subprocess.TimeoutExpired:
        rc = 'timeout'
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    path = next((Path(s.strip().strip('`"')) for s in txt.splitlines() if s.strip().lower().strip('`"').endswith('.png')), None)
    if rc != 0 or not path or not path.exists():
        log(f'{key} FAIL rc={rc} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return False
    shutil.copy2(path, sheet(style, sid))
    log(f'{key} ok ({time.time() - t0:.0f}s)')
    return True


def run_all(styles):
    """i1 이 먼저 — 그 그림체의 i1 이 서면 나머지 일곱이 줄에 선다 · 일꾼 넷"""
    styles = styles or ROUND2
    log(f'batch {styles} exe={EXE}')
    with cf.ThreadPoolExecutor(4) as ex:
        pending = set()

        def rest(style):
            for sid in IDS[1:]:
                if not sheet(style, sid).exists():
                    pending.add(ex.submit(run, style, sid))

        firsts = {}
        for style in styles:
            if sheet(style, 'i1').exists():
                rest(style)
            else:
                firsts[ex.submit(run, style, 'i1')] = style
        pending |= set(firsts)
        while pending:
            done, pending = cf.wait(pending, return_when=cf.FIRST_COMPLETED)
            for f in done:
                if f in firsts and f.result():
                    rest(firsts[f])
    log('done ' + ' '.join(f'{s}={sum(sheet(s, i).exists() for i in IDS)}/{len(IDS)}' for s in styles))


if __name__ == '__main__':
    if sys.argv[1:2] == ['run']:
        run_all(sys.argv[2:])
    elif sys.argv[1:2] == ['prompt']:
        for s in STYLES:
            for i in IDS:
                prompt(s, i)
        print(len(STYLES) * len(IDS), 'prompts')
    else:
        print(__doc__)
