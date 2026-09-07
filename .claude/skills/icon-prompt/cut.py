"""Cut a Gemini icon sheet into transparent, normalized 512x512 game icons.

usage:
  python .claude/skills/icon-prompt/cut.py <sheet.png> --grid 3x3 --out <dir> [--prefix icon]

numpy + PIL only -- scipy is installed here but its DLLs fail to load (2026-09-07).

Handles every sheet background observed so far (measured 2026-09-07):
  * plain white                      (icons/skills/example_1.png      : ~255)
  * baked fake checkerboard          (icons/items/examples.png        : 193/236)
  * checkerboard + black cross lines (icons/items/examples_armor.png  : 207/255)
The checkerboard is PAINTED PIXELS (alpha is all 255) -- Gemini's rendering of a
"transparent background" request. Ask for solid white instead; both still work here.

Pipeline (art/README.md icons/ nuki rules, made runnable):
  1. read up to two achromatic background tones from an 8px border band
  2. flood fill from the border  -> outer background
  3. enclosed pocket = background ONLY if it holds BOTH tones (>=15% each).
     Single-tone pockets are glass highlights -- keep them. (A size rule like
     "pocket >= 300px" punches 21 highlights on the two-tone sheets; the 300px
     rule applies only to single-tone white sheets, where both-tones can't.)
  4. grid lines drawn on the sheet: any row/column whose figure coverage
     exceeds 95% of the sheet is background (the black cross)
  5. per grid cell: that cell's slice of the figure mask is one icon
     (a skill icon's separate effect strokes union automatically)
  6. 1px erode (checker AA ring) -> 3px colour bleed outward -> soft alpha edge
  7. bbox long edge = 512 * 0.88, centered on 512x512, premultiplied LANCZOS
     (skipping premultiply bleeds white RGB into the edge -> halo on light cells)

Output is ASCII only -- the Windows console is cp949.
"""
import argparse
import os
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

DEV = 14        # max channel deviation for "achromatic" (README rule 1)
TONE_PAD = 12   # tolerance around each background tone
LONG = 0.88     # bbox long edge / canvas (installed set: 0.87-0.90)
S = 512


def dilate(m):
    out = m.copy()
    out[1:, :] |= m[:-1, :]; out[:-1, :] |= m[1:, :]
    out[:, 1:] |= m[:, :-1]; out[:, :-1] |= m[:, 1:]
    return out


def erode(m):
    out = m.copy()
    out[1:, :] &= m[:-1, :]; out[:-1, :] &= m[1:, :]
    out[:, 1:] &= m[:, :-1]; out[:, :-1] &= m[:, 1:]
    return out


def flood_from_border(cand):
    """Iterative numpy flood fill: the outer background region."""
    seed = np.zeros(cand.shape, bool)
    seed[0, :] = cand[0, :]; seed[-1, :] = cand[-1, :]
    seed[:, 0] = cand[:, 0]; seed[:, -1] = cand[:, -1]
    while True:
        grown = dilate(seed) & cand
        if grown.sum() == seed.sum():
            return seed
        seed = grown


def pockets_of(mask):
    """Connected components of a (small) mask -- BFS, python speed is fine here."""
    H, W = mask.shape
    seen = np.zeros_like(mask)
    for y, x in zip(*np.where(mask)):
        if seen[y, x]:
            continue
        q, px = deque([(y, x)]), []
        seen[y, x] = True
        while q:
            cy, cx = q.popleft()
            px.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        yield px


def find_tones(rgb):
    """Up to two achromatic tone peaks in the 8px border band."""
    v = rgb.mean(2)
    dev = rgb.max(2) - rgb.min(2)
    band = np.zeros(v.shape, bool)
    band[:8, :] = band[-8:, :] = band[:, :8] = band[:, -8:] = True
    bv = v[band & (dev <= DEV)].astype(int)
    hist = np.bincount(bv, minlength=256)
    tones = []
    for t in np.argsort(-hist):
        if hist[t] == 0:
            break
        if all(abs(int(t) - u) > TONE_PAD for u in tones):
            tones.append(int(t))
        if len(tones) == 2:
            break
    # a lone secondary speck is noise, not a checker tone
    if len(tones) == 2 and hist[tones[1]] < hist[tones[0]] * 0.02:
        tones = tones[:1]
    return sorted(tones), v, dev


def background(rgb):
    tones, v, dev = find_tones(rgb)
    lo, hi = tones[0], tones[-1]
    cand = (dev <= DEV) & (v >= lo - TONE_PAD) & (v <= hi + TONE_PAD)
    bg = flood_from_border(cand)
    for px in pockets_of(cand & ~bg):                # enclosed pockets
        ys, xs = zip(*px)
        if len(tones) == 2:                          # both-tones rule
            pv = v[ys, xs]
            if len(px) >= 30 and (np.abs(pv - lo) <= TONE_PAD).mean() >= 0.15 \
                             and (np.abs(pv - hi) <= TONE_PAD).mean() >= 0.15:
                bg[ys, xs] = True
        elif len(px) >= 300:                         # white sheet: size rule
            bg[ys, xs] = True
    # grid lines drawn on the sheet: rows/columns almost fully covered by figure
    fig = ~bg
    H, W = fig.shape
    bg[fig.mean(1) > 0.95, :] = True
    bg[:, fig.mean(0) > 0.95] = True
    return bg, tones


def finish(rgb, mask):
    """erode -> colour bleed -> feathered alpha -> normalized 512 RGBA."""
    m = erode(mask)
    if m.sum() < 50:
        return None
    out = rgb.astype(float)
    cur = m.copy()
    for _ in range(3):                               # 3px bleed kills halo
        csum = np.zeros_like(out)
        cnt = np.zeros(cur.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(cur, (dy, dx), (0, 1))
            csum += np.roll(out * cur[:, :, None], (dy, dx), (0, 1))
            cnt += sh
        grown = dilate(cur)
        ring = grown & ~cur & (cnt > 0)
        out[ring] = csum[ring] / cnt[ring][:, None]
        cur = grown
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    a = np.dstack([out, np.array(alpha, float)]).astype(np.uint8)

    al = a[:, :, 3]
    ys, xs = np.where((al > 8).any(1))[0], np.where((al > 8).any(0))[0]
    crop = a[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1].astype(float)
    h, w = crop.shape[:2]
    k = (S * LONG) / max(h, w)
    nw, nh = max(1, round(w * k)), max(1, round(h * k))
    av = crop[:, :, 3:4] / 255
    pm = np.dstack([crop[:, :, :3] * av, crop[:, :, 3:4]]).astype(np.uint8)
    pm = np.array(Image.fromarray(pm).resize((nw, nh), Image.LANCZOS)).astype(float)
    az = np.maximum(pm[:, :, 3:4], 1)
    fin = np.dstack([np.clip(pm[:, :, :3] * 255 / az, 0, 255),
                     pm[:, :, 3:4]]).astype(np.uint8)
    canvas = np.zeros((S, S, 4), np.uint8)
    y0, x0 = (S - nh) // 2, (S - nw) // 2
    canvas[y0:y0 + nh, x0:x0 + nw] = fin
    return Image.fromarray(canvas)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('sheet')
    p.add_argument('--grid', default='2x2', help='RxC, e.g. 2x2 or 3x3')
    p.add_argument('--out', required=True)
    p.add_argument('--prefix', default='icon')
    a = p.parse_args()
    R, C = (int(x) for x in a.grid.lower().split('x'))
    os.makedirs(a.out, exist_ok=True)

    rgb = np.array(Image.open(a.sheet).convert('RGB'))
    bg, tones = background(rgb)
    print('bg tones:', tones, '(1 = white sheet, 2 = baked checkerboard)')
    fig = ~bg
    H, W = fig.shape
    empty = []
    for r in range(R):
        for c in range(C):
            cell = np.zeros(fig.shape, bool)
            cell[r * H // R:(r + 1) * H // R, c * W // C:(c + 1) * W // C] = True
            im = finish(rgb, fig & cell)
            if im is None:
                empty.append((r + 1, c + 1))
                continue
            path = os.path.join(a.out, '%s_r%dc%d.png' % (a.prefix, r + 1, c + 1))
            im.save(path)
            print('%-28s figure px %7d' % (os.path.basename(path), int((fig & cell).sum())))
    if empty:
        print('EMPTY cells (no figure found):', empty)
    print('\nnext: python .claude/skills/icon-prompt/measure.py --type <skill|item|empty> %s/*.png'
          % a.out.replace('\\', '/'))


if __name__ == '__main__':
    main()
