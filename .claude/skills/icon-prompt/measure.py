"""Icon metrics vs the installed set (icons/skills 4 + icons/items 13 + empty 5).

usage:
  python .claude/skills/icon-prompt/measure.py --type skill|item|empty <png> [<png> ...]

Feed it transparent RGBA icons -- cut.py output or installed files. For a raw
sheet, run cut.py first; framing numbers only mean anything after normalization.
Output is ASCII only -- the Windows console is cp949.

Reference (measured 2026-09-07 on every installed icon):
  metric  skill(4)   item(13)   empty(5)   meaning
  long    87-90%     87-90%     87-90%     bbox long edge / canvas. cut.py sets 88 --
                                           off-range = you skipped normalization, not a re-roll
  center  47-53      47-53      47-53      bbox centre. same -- normalization's job
  colors  110-160    35-130     20-40      unique colours after 24-step quantization, inside figure.
                                           (item ceiling is 130, not the installed max 116 -- cut.py's
                                           feathered edge adds ~10 blend colours on a re-cut)
                                           high = gradients/texture crept in; low = too plain -> RE-ROLL
  edge    12-21%     6-16%      4-7%       pixels with colour gradient > 60, inside figure.
                                           high = fine texture that dies at 40px -> RE-ROLL
  dark    <= 20      <= 20      <= 20      mean channel of the darkest 8% of figure pixels.
                                           higher = outline is not near-black -> style broke -> RE-ROLL
Skill icons run hotter than item icons because the effect glyph (slash arc,
impact star, sound waves) carries a warm gradient -- that is anchor style, not a
defect. An ITEM icon in skill-icon ranges has effects it should not have.
"""
import sys
import numpy as np
from PIL import Image

REF = {
    'skill': {'long': (87, 90), 'center': (47, 53), 'colors': (110, 160),
              'edge': (12, 21), 'dark': (0, 20)},
    'item':  {'long': (87, 90), 'center': (47, 53), 'colors': (35, 130),
              'edge': (6, 16), 'dark': (0, 20)},
    'empty': {'long': (87, 90), 'center': (47, 53), 'colors': (20, 40),
              'edge': (4, 7), 'dark': (0, 20)},
}


def metrics(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    H, W = a.shape[:2]
    m = a[:, :, 3] > 40
    if not m.any():
        return None
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    long_edge = max(xs[-1] - xs[0] + 1, ys[-1] - ys[0] + 1) / max(W, H) * 100
    cx = (xs[0] + xs[-1] + 1) / 2 / W * 100
    cy = (ys[0] + ys[-1] + 1) / 2 / H * 100
    rgb = a[:, :, :3].astype(float)
    q = (rgb // 24).astype(int)
    colors = len(np.unique((q[:, :, 0] * 10000 + q[:, :, 1] * 100 + q[:, :, 2])[m]))
    gy = np.abs(np.diff(rgb, axis=0)).sum(2)[:, :W - 1]
    gx = np.abs(np.diff(rgb, axis=1)).sum(2)[:H - 1, :]
    edge = ((gx + gy)[m[:H - 1, :W - 1]] > 60).mean() * 100
    lum = rgb.sum(2)
    dark = lum[m]
    sel = m & (lum <= np.percentile(dark, 8))
    return dict(long=long_edge, center=max(abs(cx - 50), abs(cy - 50)) + 50,
                cx=cx, cy=cy, colors=colors, edge=edge,
                dark=rgb[sel].mean() if sel.any() else 255)


def cell(ref, k, v):
    lo, hi = ref[k]
    s = '%4d' % v if k == 'colors' else '%4.0f' % v
    return s + (' ' if lo <= v <= hi else '!')


def main(argv):
    if len(argv) < 3 or argv[0] != '--type' or argv[1] not in REF:
        print(__doc__)
        return
    typ, files = argv[1], argv[2:]
    ref = REF[typ]
    hdr = '%-26s %6s %5s %5s %7s %6s %6s'
    print(hdr % ('file (type=%s)' % typ, 'long', 'cx', 'cy', 'colors', 'edge', 'dark'))
    print(hdr % ('reference', '%d-%d' % ref['long'], '47-53', '47-53',
                 '%d-%d' % ref['colors'], '%d-%d' % ref['edge'], '<=%d' % ref['dark'][1]))
    for path in files:
        d = metrics(path)
        name = path.replace('\\', '/').split('/')[-1][:26]
        if d is None:
            print('%-26s  (empty alpha)' % name)
            continue
        print('%-26s %s %s %s %s %s %s' % (
            name, cell(ref, 'long', d['long']),
            cell(ref, 'center', d['cx']), cell(ref, 'center', d['cy']),
            ' ' + cell(ref, 'colors', d['colors']),
            cell(ref, 'edge', d['edge']) + '%', cell(ref, 'dark', d['dark'])))
    print("\n'!' = outside reference.  long/cx/cy -> re-run cut.py (fixable).")
    print("colors/edge/dark -> RE-ROLL: detail and outline cannot be fixed by crop/scale.")
    print("Always ALSO look with your eyes at 40px -- montage the icons small;")
    print("legibility failures (thin lines, mushy silhouettes) hide inside passing numbers.")


if __name__ == '__main__':
    main(sys.argv[1:])
