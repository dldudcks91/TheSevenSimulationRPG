# -*- coding: utf-8 -*-
"""원소 기본 이펙트 · 수묵 붓 그림체 (2026-10-09 사용자 「1번 스타일로 가보자」 — elem_img.py 의 x1 INK BRUSH).

python ink.py run [시트 ...]   → Codex 로 시트(i1 · i2 · i3) 발주 — 한 번에 셋까지
python ink.py gif              → 자르고 비교 GIF(gif/ink_compare.gif) — 스킬마다 「지금 | 수묵」
기준 그림 = sheet_x1.png(수묵 붓 시트 — 그림체 SSOT) + 고블린 초상. 구도 · 움직임 · 크기는 skill_art.js 그대로.
"""
import concurrent.futures as cf
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ART = ROOT / 'src/assets/art'
EXT = sorted((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'), key=lambda p: p.stat().st_mtime)[-1]
EXE = EXT / 'bin/windows-x86_64/codex.exe'
ANCHORS = [HERE / 'sheet_x1.png', HERE / 'anchor/face_goblin.png']
LOG = HERE / 'run.log'

HEAD = """Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

Two reference images are attached: (1) a sheet of four elemental effects painted in SUMI-E INK BRUSH style (on magenta) — THIS IS THE EXACT ART STYLE TO MATCH; (2) a goblin portrait from our game, to show what the effects flash over.

PROMPT:
Elemental skill effects for a grim dark-fantasy party RPG with a dark, minimal battle screen. Each effect flashes for half a second over a small head-and-shoulders portrait about 90 pixels wide, so it must read instantly and must not glare on a dark screen.

ART STYLE — exactly like the attached sheet: SUMI-E INK BRUSH. Each effect is painted with a few bold, fast brush strokes — dark ink mixed with the element's color, dry-brush ends and a few ink flecks allowed, lots of empty space. Expressive and minimal, never a detailed illustration, never a symbol or icon.
Element colors (muted, never glaring): fire = dull red-orange with dark ink · ice = cold slate blue with dark ink · lightning = pale ochre-gold with dark ink · poison = murky olive green with dark ink · holy = pale dull gold with dark ink.
Effects only: no characters, no faces, no weapons, no objects, no text.

SHEET: square image, 2x2 grid of four separate pictures, straight 16px pure black gridlines running fully from edge to edge, solid flat pure magenta #FF00FF background in every cell, no text anywhere. Nothing in the pictures may be pink, magenta or purple.
Each picture stays inside its own cell with a clear strip of magenta before the gridlines.
Cells marked FALL show something dropping from above: its point is LOW in the cell (at the stated height) with its brush trail reaching up toward the top edge. Cells marked IMPACT LOW are centered low in the cell at the stated height. Buff cells keep the MIDDLE 50% of the cell EMPTY magenta (the face shows there).

"""

# 칸 문안 — 칸 키 = (시트, 번호) · 설치 파일 = PICKS
SHEETS = {
    'i1': [
        "FIREBALL (fire, hits one enemy, bursting at the middle of the cell): a ball of fire bursting against the target — a round splash of fiery brush strokes flaring outward, mostly upward.",
        "INFERNO (fire on every enemy, rising from below): a wall of flame brush strokes rising from the bottom of the cell to about two-thirds of its height.",
        "ICE BLAST — FALL (ice, one enemy): ONE big jagged ice shard painted with a few hard brush strokes, point down, dropping from above; its point at 87% of the cell height, a short cold brush trail above it.",
        "ICE BLAST — IMPACT LOW (the shard breaking on the target): a burst of broken ice brush strokes splashing outward, centered at 89% of the cell height, mostly spreading sideways and up.",
    ],
    'i2': [
        "FROST NOVA (ice on every enemy, bursting outward): a ring of cold brush strokes and a few ice spikes bursting outward low around the middle of the cell; the middle stays open.",
        "LIGHTNING — FALL (lightning, one enemy): ONE jagged lightning bolt painted as a single fast zigzag brush stroke from the top edge down to 90% of the cell height, with a small ink-splash burst where it lands.",
        "CHAIN LIGHTNING (lightning jumping between enemies): ONE jagged lightning brush stroke running HORIZONTALLY across the middle of the cell from left to right, with one short fork.",
        "FROZEN WALL (ice, a barrier rises): a row of THREE or FOUR tall jagged ice spikes rising from the bottom of the cell, painted with hard upward brush strokes.",
    ],
    'i3': [
        "POISON ARROW (a buff on the archer, face clear): TWO wavering brush strokes of murky poison rising up the LEFT and RIGHT sides of the cell, with a few drops; the middle stays empty.",
        "JUDGMENT (holy, strikes one enemy from above): ONE broad vertical brush stroke of pale dull-gold light coming straight down from the top edge onto the middle of the cell, with a small flat splash ring where it lands.",
        "FIREBALL, second version (fire, hits one enemy, bursting at the middle of the cell): a compact fireball impact — one swirling brush stroke of fire wrapping around a hot center, with a few flecks thrown off.",
        "LIGHTNING, second version — FALL (lightning, one enemy): ONE thick lightning brush stroke with two sharp bends from the top edge down to 90% of the cell height, splitting into a short ink-splash fork where it lands.",
    ],
}

# 비교 GIF 줄 — 이름, 종류, [ (지금 파일, 수묵 칸, 움직임, 크기, ay, 시간) ... ], 쿵
ROWS = [
    ('파이어볼', 'hit', [('mag_fireball_clean', 'i1_1', 'burst', 90, None, 420)], False),
    ('파이어볼 B안', 'hit', [('mag_fireball_clean', 'i3_3', 'burst', 90, None, 420)], False),
    ('인페르노', 'hit', [('mag_inferno_clean', 'i1_2', 'pillar', 94, None, 500)], False),
    ('아이스 블라스트', 'hit', [('mag_iceblast_clean', 'i1_3', 'fall', 110, .87, 260), ('mag_iceblast_shatter_clean', 'i1_4', 'shatter', 110, .89, 380)], False),
    ('프로스트 노바', 'hit', [('mag_frostnova_clean', 'i2_1', 'wave', 94, None, 480)], False),
    ('라이트닝', 'hit', [('mag_lightning_clean', 'i2_2', 'bolt', 124, .9, 380)], False),
    ('라이트닝 B안', 'hit', [('mag_lightning_clean', 'i3_4', 'bolt', 124, .9, 380)], False),
    ('체인 라이트닝', 'hit', [('mag_chain_clean', 'i2_3', 'thrust', 90, None, 360)], False),
    ('프로즌 월', 'call', [('mag_frozenwall_clean', 'i2_4', 'pillar', 94, None, 560)], False),
    ('포이즌 애로우', 'buff', [('arc_poison_clean', 'i3_1', 'orders', 88, None, 580)], False),
    ('심판', 'hit', [('pri_judgment_clean', 'i3_2', 'strike', 94, None, 480)], False),
]
FACES = {'hit': 'monster/1102', 'call': 'hero/mage_1', 'buff': 'hero/archer_1'}


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def prompt(sid):
    body = HEAD + '\n'.join(f'{i}. {c}' for i, c in enumerate(SHEETS[sid], 1)) + '\n'
    (HERE / f'prompt_{sid}.txt').write_text(body, encoding='utf-8')
    return body


def run(sid):
    body = prompt(sid)
    wd = HERE / '_run' / sid
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last)]
    for a in ANCHORS:
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


def run_all(ids):
    ids = ids or list(SHEETS)
    log(f'batch {ids} exe={EXE}')
    with cf.ThreadPoolExecutor(len(ids)) as ex:
        res = list(ex.map(run, ids))
    log('done ' + ' '.join(f'{r}={"ok" if ok else "FAIL"}' for r, ok in res))


def make_gif(out='ink_compare'):
    from PIL import Image, ImageDraw
    sys.path.insert(0, str(ART / 'fx_source/advance_20261008'))
    import gif as g  # noqa: E402
    sys.path.insert(0, str(HERE))
    from cut_preview import cut  # noqa: E402
    (HERE / 'cut').mkdir(exist_ok=True)
    for sid in SHEETS:
        for i in range(1, 5):
            cut(HERE / f'sheet_{sid}.png', i).save(HERE / f'cut/{sid}_{i}.png')
    faces = {k: Image.open(ART / f'faces/gemini/{v}.webp').convert('RGBA').resize((g.P, g.P), Image.LANCZOS) for k, v in FACES.items()}
    items = []
    for name, kind, steps, quake in ROWS:
        chain = [(None, None, m, s, ay, d) for _, _, m, s, ay, d in steps]
        now = [Image.open(ART / f'fx/skills/{f}.webp').convert('RGBA') for f, *_ in steps]
        new = [Image.open(HERE / f'cut/{c}.png').convert('RGBA') for _, c, *_ in steps]
        items.append((name, kind, chain, now, new, quake))
    TOP, K, GAP, PG, COLS = 70, .8, 4, 16, 4
    tw, th = round(g.W * 2 * K), round((g.H * 2 - TOP) * K)
    pw = 2 * tw + GAP
    rows = (len(items) + COLS - 1) // COLS
    size = (COLS * pw + (COLS - 1) * PG, rows * (th + GAP) - GAP)
    longest = max(sum(c[5] for c in it[2]) for it in items) + 160

    def cell(face, chain, imgs, t, label, quake):
        im = g.tile(face, chain, imgs, t, '', quake).crop((0, TOP, g.W * 2, g.H * 2)).resize((tw, th), Image.LANCZOS)
        ImageDraw.Draw(im).text((8, 5), label, fill=(240, 236, 250), font=g.FONT)
        return im

    def frame(t, q=True):
        out = Image.new('RGB', size, (8, 8, 12))
        for n, (name, kind, chain, now, new, quake) in enumerate(items):
            x, y = (n % COLS) * (pw + PG), (n // COLS) * (th + GAP)
            out.paste(cell(faces[kind], chain, now, t, f'{name} · 지금', quake and q), (x, y))
            out.paste(cell(faces[kind], chain, new, t, f'{name} · 수묵', quake and q), (x + tw + GAP, y))
        return out

    frames = [frame(i * g.STEP) for i in range(longest // g.STEP + 6)]
    (HERE / 'gif').mkdir(exist_ok=True)
    path = HERE / f'gif/{out}.gif'
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=g.STEP * 2, loop=0, optimize=True)
    frame(180, False).save(HERE / f'gif/{out}_still.png')
    print(path, len(frames), 'frames', f'{path.stat().st_size // 1024} KB', size)


if __name__ == '__main__':
    if sys.argv[1:2] == ['run']:
        run_all(sys.argv[2:])
    elif sys.argv[1:2] == ['gif']:
        make_gif()
    else:
        print(__doc__)
