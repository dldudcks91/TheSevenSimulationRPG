"""Portrait metrics vs the anchor set (faces/example/gladiator_helm.png, barbarian.png).

usage:
  python .claude/skills/art-prompt/measure.py <png> [<png> ...]
  python .claude/skills/art-prompt/measure.py --sheet <2048x2048 2x2 green sheet.png>

Accepts transparent RGBA crops (cartoon/hero_N.png), green-background originals
(example/*.png) or a whole 2048 2x2 sheet (--sheet; BR tile is the watermark slot).
Output is ASCII only -- the Windows console is cp949.

Anchor reference (measured 2026-09-06, SKILL.md principle 2):
  shldr   71-75 %  widest row / canvas width         -> fixable by padding
  body    78-89 %  first row wider than 1.15 x head / canvas height -> fixable by padding
  headH   57-67 %  figure top -> neck / canvas height (SD ratio)
  hd/sh   70-73 %  head width / shoulder width  ** crop/scale INVARIANT -> re-roll **
  colors  42-62    unique colors after 24-step quantization, inside figure, at 512
  edge     8-19 %  pixels with colour gradient > 60, inside figure, at 512

Caveats:
  * hd/sh is calibrated on bare heads and helmets. A HOOD -- or a bare SKULL -- is
    part of the head silhouette, so those read 90-100. That is normal, not a defect.
    For such sets judge hd/sh by eye against barbarian.png instead.
  * colors below 42 on a flat single-colour hood/cloak set is fine.
"""
import sys
import numpy as np
from PIL import Image

REF = {
    'shoulder': (71, 75), 'body_start': (78, 89), 'head_h': (57, 67),
    'head_ratio': (70, 73), 'colors': (42, 62), 'edge': (8, 19),
}
TILES = {'TL': (0, 0, 1013, 1013), 'TR': (1035, 0, 2048, 1013),
         'BL': (0, 1035, 1013, 2048), 'BR(wm)': (1035, 1035, 2048, 2048)}


def mask_of(im):
    """Figure mask. alpha > green key > luma fallback (opaque dark bg -- unreliable)."""
    a = np.array(im.convert('RGBA'))
    al = a[:, :, 3]
    if (al > 250).mean() < 0.98:
        return a, al > 40, 'alpha'
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    d = g - np.maximum(r, b)
    if d.max() > 60:
        return a, d < 40, 'green'
    return a, a[:, :, :3].max(2) > 60, 'luma?'


def metrics(im):
    a, m, how = mask_of(im)
    H, W = m.shape
    w = m.sum(1).astype(float)
    ys = np.where(m.any(1))[0]
    if len(ys) == 0:
        return None
    y0, y1 = ys[0], ys[-1]
    seg = w[y0:y1 + 1]
    n = len(seg)
    top = seg[:max(1, int(n * 0.55))]
    hw = top.max()
    hpk = int(top.argmax())
    neck = y0 + hpk + int(seg[hpk:max(hpk + 1, int(n * 0.85))].argmin())
    over = np.where(w >= hw * 1.15)[0]
    bt = over[0] if len(over) else neck

    # detail metrics at 512 so sheets and crops compare alike
    im5 = im.convert('RGBA').resize((512, 512), Image.LANCZOS)
    rgb = np.array(im5).astype(float)[:, :, :3]
    m5 = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((512, 512), Image.NEAREST)) > 127
    gy = np.abs(np.diff(rgb, axis=0)).sum(2)[:, :511]
    gx = np.abs(np.diff(rgb, axis=1)).sum(2)[:511, :]
    edge = ((gx + gy)[m5[:511, :511]] > 60).mean() * 100
    q = (rgb // 24).astype(int)
    colors = len(np.unique((q[:, :, 0] * 10000 + q[:, :, 1] * 100 + q[:, :, 2])[m5]))

    return dict(how=how, shoulder=w.max() / W * 100, body_start=bt / H * 100,
                head_h=(neck - y0) / H * 100, head_ratio=hw / w.max() * 100,
                colors=colors, edge=edge)


def cell(k, v):
    lo, hi = REF[k]
    s = '%3d' % v if k == 'colors' else '%3.0f' % v
    return s + (' ' if lo <= v <= hi else '!')


def report(name, d):
    if d is None:
        print('%-26s  (empty mask)' % name)
        return
    keys = ('shoulder', 'body_start', 'head_h', 'head_ratio', 'colors', 'edge')
    print('%-26s %s   %s' % (name, '  '.join('%6s' % cell(k, d[k]) for k in keys), d['how']))


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__)
        return
    hdr = '%-26s %6s  %6s  %6s  %6s  %6s  %6s'
    print(hdr % ('file', 'shldr', 'body', 'headH', 'hd/sh', 'colors', 'edge'))
    print(hdr % ('anchor range', '71-75', '78-89', '57-67', '70-73', '42-62', '8-19'))
    if argv[0] == '--sheet':
        for path in argv[1:]:
            sh = Image.open(path).convert('RGBA')
            base = path.replace('\\', '/').split('/')[-1][:16]
            for tag, box in TILES.items():
                report('%s %s' % (base, tag), metrics(sh.crop(box)))
    else:
        for path in argv:
            report(path.replace('\\', '/').split('/')[-1][:26], metrics(Image.open(path)))
    print("\n'!' = outside anchor range.  shldr/body -> pad (postprocess.md).  hd/sh -> re-roll.")
    print("hooded figures AND bare skulls: hd/sh 90-100 is normal (it is the head silhouette).")
    print("luma? = opaque dark background, mask unreliable (gladiator_helm.png).")


if __name__ == '__main__':
    main(sys.argv[1:])
