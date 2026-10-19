"""cut.py with two overrides for the codex arena sheet:
- the sheet has a faint full-width seam row (~y506); cut.py's grid-line rule erased it straight
  through the icons. Here seam rows are healed from the rows above/below (mask + colour) instead.
- row cut lines are given explicitly (the seam fooled snap()).
usage: python cut_seam.py <sheet> <out_dir> <prefix> <y1> <y2>
"""
import sys, importlib.util, os
import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location('cut', os.path.join('.claude', 'skills', 'icon-prompt', 'cut.py'))
cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cut)

sheet, out, prefix, y1, y2 = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
rgb = np.array(Image.open(sheet).convert('RGB'))

# seam rows: almost fully non-white across the sheet
tones, v, dev = cut.find_tones(rgb)
lo, hi = tones[0], tones[-1]
cand = (dev <= cut.DEV) & (v >= lo - cut.TONE_PAD) & (v <= hi + cut.TONE_PAD)
seam = np.where((~cand).mean(1) > 0.95)[0]
seam_c = np.where((~cand).mean(0) > 0.95)[0]
print('seam rows:', seam.tolist(), 'seam cols:', seam_c.tolist())
H = rgb.shape[0]
for y in seam:
    a = y - 1
    while a in seam: a -= 1
    b = y + 1
    while b in seam: b += 1
    a, b = max(a, 0), min(b, H - 1)
    # pixel is "white" in both neighbours -> pure white, else average colour
    both_bg = cand[a] & cand[b]
    avg = ((rgb[a].astype(int) + rgb[b].astype(int)) // 2).astype(np.uint8)
    rgb[y] = np.where(both_bg[:, None], np.array([255, 255, 255], np.uint8), avg)

def background_nogrid(rgb):
    """cut.background without the grid-line rule — row 2's wings nearly span the sheet, so a natural
    row passed the 95% coverage test and was erased through the icons. A white codex sheet has no grid."""
    tones, v, dev = cut.find_tones(rgb)
    lo, hi = tones[0], tones[-1]
    cand = (dev <= cut.DEV) & (v >= lo - cut.TONE_PAD) & (v <= hi + cut.TONE_PAD)
    bg = cut.flood_from_border(cand)
    for px in cut.pockets_of(cand & ~bg):
        ys_, xs_ = zip(*px)
        if len(px) >= 300:
            bg[ys_, xs_] = True
    return bg, tones

R, C = 3, 3
bg, tones = background_nogrid(rgb)
fig = ~bg
Hh, W = fig.shape
ys = [0, y1, y2, Hh]
xs = cut.snap(fig.sum(0), W, C)
print('cuts y:', ys[1:-1], 'x:', xs[1:-1])
os.makedirs(out, exist_ok=True)
# whole connected pieces go to the cell holding their centre — a wing tip crossing a cut line
# stays with its own icon instead of leaking a sliver into the neighbour
from scipy import ndimage
lab, n = ndimage.label(fig)
owner = np.zeros(n + 1, int) - 1
for k, (sy, sx) in enumerate(ndimage.find_objects(lab), start=1):
    yy, xx = np.nonzero(lab[sy, sx] == k)
    cy, cx = sy.start + yy.mean(), sx.start + xx.mean()
    r = next(i for i in range(R) if ys[i] <= cy < ys[i + 1])
    c = next(i for i in range(C) if xs[i] <= cx < xs[i + 1])
    owner[k] = r * C + c
sizes = np.bincount(lab.ravel())
big = np.nonzero(sizes > 20000)[0]
big = big[big > 0]          # pieces that join two icons (touching wings) stay clipped by the cut lines
for r in range(R):
    for c in range(C):
        rect = np.zeros(fig.shape, bool)
        rect[ys[r]:ys[r + 1], xs[c]:xs[c + 1]] = True
        if (r, c) == (1, 1):
            rect[:, 824:] = False   # the champion's wing tip touches the diamond's wing — leave it with the champion
        small_own = np.isin(lab, np.nonzero((owner == r * C + c) & (sizes <= 20000))[0])
        # a big piece clipped by the cell: drop its slivers (its own sub-pieces under 3% of the cell figure)
        clipped = np.isin(lab, big) & rect
        sl, sn = ndimage.label(clipped)
        if sn:
            ss = np.bincount(sl.ravel()); ss[0] = 0
            keep = np.nonzero(ss >= 0.03 * max(1, clipped.sum()))[0]
            clipped = np.isin(sl, keep)
        cell = small_own | clipped
        im = cut.finish(rgb, fig & cell)
        p = os.path.join(out, '%s_r%dc%d.png' % (prefix, r + 1, c + 1))
        im.save(p)
        print(os.path.basename(p), int((fig & cell).sum()))

import glob
fs = sorted(glob.glob(os.path.join(out, prefix + '_*.png')))
Wp = 170
prev = Image.new('RGBA', (Wp * len(fs), Wp), (40, 40, 40, 255))
for i, f in enumerate(fs):
    prev.alpha_composite(Image.open(f).convert('RGBA').resize((Wp, Wp)), (i * Wp, 0))
prev.save(os.path.join(out, 'preview.png'))
