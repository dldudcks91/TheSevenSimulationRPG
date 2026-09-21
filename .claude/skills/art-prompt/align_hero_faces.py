"""Re-frame a hero portrait by FACE (eye pair), not by shoulder width.

Heroes render in a square `contain` box, so what the eye reads is how big the
face is and where it sits -- the 74% shoulder rule puts small-headed figures
(hd/sh below the anchor band) visibly further away than the rest of the set.
Targets below are the measured median of the installed heroes whose eyes the
detector finds (knight_4/5, priest_1/2/3, warrior_2/3).
"""
import collections
import os
import numpy as np
from PIL import Image

TARGET_GAP = 89.0     # eye centroid distance, px on a 512 canvas
TARGET_X = 315.0      # eye midpoint x
TARGET_Y = 235.0      # eye line y
MARGIN_TOP = 35       # a figure touching the top/sides reads as spilling out of the box
MARGIN_SIDE = 20      #   (warrior_2/3 sit at top 35~60 · sides 35~44) -- shrink below TARGET_GAP until it fits
S = 512


def key_green(tile):
    a = np.array(tile.convert('RGBA')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    d = g - np.maximum(r, b)
    a[:, :, 1] = np.where(d > 0, np.maximum(r, b), g)
    a[:, :, 3] = np.clip((120 - d) / 80 * 255, 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def _erode(m, k):
    out = m.copy()
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1):
            out &= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def _label(mask):
    H, W = mask.shape
    lb = np.zeros((H, W), np.int32)
    cur = 0
    for sy in range(H):
        for sx in np.where(mask[sy] & (lb[sy] == 0))[0]:
            if lb[sy, sx]:
                continue
            cur += 1
            q = collections.deque([(sy, sx)])
            lb[sy, sx] = cur
            while q:
                y, x = q.popleft()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lb[ny, nx]:
                        lb[ny, nx] = cur
                        q.append((ny, nx))
    return lb, cur


def eyes(img):
    """(mid_x, mid_y, gap) of the eye pair. Erosion kills the line art, which
    otherwise welds the eyes to the hair outline."""
    a = np.array(img.convert('RGBA')).astype(int)
    H, W = a.shape[:2]
    core = _erode((a[:, :, 3] > 180) & (a[:, :, :3].max(2) < 60), max(2, round(3 * H / 512)))
    lb, n = _label(core)
    cand = []
    for i in range(1, n + 1):
        ys, xs = np.where(lb == i)
        if len(ys) < 120 * (H / 512) ** 2:
            continue
        h, w = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
        if w < h or h > 0.18 * H or w > 0.34 * W or not 0.12 < ys.mean() / H < 0.68:
            continue
        cand.append((xs.mean(), ys.mean(), len(ys)))
    best = None
    for i in range(len(cand)):
        for j in range(i + 1, len(cand)):
            p, q = cand[i], cand[j]
            if abs(p[1] - q[1]) > 0.04 * H or not 0.08 * W < abs(p[0] - q[0]) < 0.40 * W:
                continue
            sc = abs(p[1] - q[1]) / H - (p[2] + q[2]) / (H * W)
            if best is None or sc < best[0]:
                best = (sc, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, abs(p[0] - q[0]))
    if best is None:
        raise SystemExit('no eye pair')
    return best[1], best[2], best[3]


def place(img, ex, ey, gap, eye_gap=None, eye_y=TARGET_Y):
    """Scale to TARGET_GAP, put the eye midpoint on (TARGET_X, TARGET_Y).
    Bottom overflow is normal -- the bust runs off the frame like the rest.
    `eye_gap` pins the size by hand (skips the margin fit) -- the SPEC override."""
    m0 = np.array(img.convert('RGBA'))[:, :, 3] > 40
    ys0, xs0 = np.where(m0.any(1))[0], np.where(m0.any(0))[0]
    k = eye_gap / gap if eye_gap else min(
        TARGET_GAP / gap,
        (S - MARGIN_TOP) / (ys0[-1] - ys0[0] + 1),           # bust is pinned to the floor below
        (S - 2 * MARGIN_SIDE) / (xs0[-1] - xs0[0] + 1))
    nw, nh = round(img.width * k), round(img.height * k)
    ca = np.array(img.convert('RGBA')).astype(float)
    al = ca[:, :, 3:4] / 255
    pm = Image.fromarray(np.concatenate([ca[:, :, :3] * al, ca[:, :, 3:4]], 2).astype(np.uint8))
    pm = np.array(pm.resize((nw, nh), Image.LANCZOS)).astype(float)
    al2 = np.maximum(pm[:, :, 3:4], 1)
    scaled = Image.fromarray(np.concatenate(
        [np.clip(pm[:, :, :3] * 255 / al2, 0, 255), pm[:, :, 3:4]], 2).astype(np.uint8))

    ox, oy = TARGET_X - ex * k, eye_y - ey * k
    m = np.array(scaled)[:, :, 3] > 40
    xs = np.where(m.any(0))[0]
    lo, hi = ox + xs[0], ox + xs[-1]
    if lo < MARGIN_SIDE:
        ox += MARGIN_SIDE - lo        # nudge back in, never crop hair at the edge
    elif hi > S - 1 - MARGIN_SIDE:
        ox -= hi - (S - 1 - MARGIN_SIDE)
    bottom = oy + np.where(m.any(1))[0][-1]
    if bottom < S - 1:
        oy += S - 1 - bottom          # top-row tiles end at the grid line -- the bust must still reach the floor
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(scaled, (round(ox), round(oy)))
    return canvas


def tile_at(path, corner='BL', inset=3):
    """One tile of a 2x2 sheet (TL/TR/BL). The grid-facing edges get an extra
    inset -- the corner keeps a few anti-aliased grid pixels that survive the
    key as a stray speck."""
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    H, W = a.shape[:2]
    dark = a.max(2) < 60
    cols = [i for i in range(W) if dark[:, i].mean() > 0.8]
    rows = [i for i in range(H) if dark[i].mean() > 0.8]
    x0, x1 = (0, cols[0] - inset) if corner[1] == 'L' else (cols[-1] + 1 + inset, W)
    y0, y1 = (0, rows[0] - inset) if corner[0] == 'T' else (rows[-1] + 1 + inset, H)
    return Image.open(path).convert('RGBA').crop((x0, y0, x1, y1))


def despeckle(img, min_area=100):
    a = np.array(img.convert('RGBA'))
    lb, n = _label(a[:, :, 3] > 40)
    keep = np.zeros(a.shape[:2], bool)
    for i in range(1, n + 1):
        blob = lb == i
        if blob.sum() >= min_area:
            keep |= blob
    a[:, :, 3] = np.where(keep, a[:, :, 3], 0)
    return Image.fromarray(a)


# sheet basename -> (source/hero SSOT name, cartoon/hero install name, tile[, place() overrides]).
# One line per portrait seated this way; 74% (postprocess.md §3) stays the default.
SPEC = [
    ('mage_2', 'mage_poseidon', 'mage_2', 'BL'),
    ('mage_3', 'mage_nostradamus', 'mage_3', 'BL'),
    ('warrior_2', 'warrior_leonidas', 'warrior_4', 'TR'),
    ('warrior_2', 'warrior_samson', 'warrior_5', 'BL', {'eye_gap': 85, 'eye_y': 245}),   # eyes = warrior_3 (user 09-21)
]

if __name__ == '__main__':
    import sys
    only = [a for a in sys.argv[1:] if not a.startswith('--')]   # install names; none = all
    for sheet, ssot, inst, corner, *ov in SPEC:
        if only and inst not in only:
            continue
        tile = despeckle(key_green(tile_at(
            'src/assets/art/faces/source/sheets/source_sheet_%s.png' % sheet, corner)))
        ex, ey, gap = eyes(tile)
        out = place(tile, ex, ey, gap, **(ov[0] if ov else {}))
        nx, ny, ngap = eyes(out)
        print('%-16s tile %dx%d  eyes(%.0f,%.0f) gap %.1f  ->  eyes(%.0f,%.0f) gap %.1f'
              % (inst, tile.width, tile.height, ex, ey, gap, nx, ny, ngap))
        if '--write' in sys.argv:
            os.makedirs('src/assets/art/faces/source/hero', exist_ok=True)
            out.save('src/assets/art/faces/source/hero/%s.png' % ssot)
            out.quantize(256, Image.FASTOCTREE).save(
                'src/assets/art/faces/cartoon/hero/%s.png' % inst)
