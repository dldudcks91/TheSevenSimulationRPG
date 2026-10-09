# -*- coding: utf-8 -*-
"""현행 1201~1203 과 out/<ver>/<id>.png 를 나란히 놓고 실루엣 일치도(알파 마스크 IoU)를 잰다.

python compare.py   ->  comparison.png (행 = 몬스터 · 열 = 현행 | v1 | v2 | v3)
                        silhouette.png (현행 외곽선을 빨강으로 새 그림 위에 겹친 판)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
FACES = HERE.parent
IDS = ['1201', '1202', '1203']
VERS = ['v1', 'v2', 'v3']
S = 384
PAD = 12
BG = (214, 210, 202, 255)


def load(p):
    im = Image.open(p).convert('RGBA')
    return im.resize((512, 512), Image.LANCZOS) if im.size != (512, 512) else im


def mask(im):
    return np.array(im)[:, :, 3] > 40


def on_bg(im):
    base = Image.new('RGBA', im.size, BG)
    base.alpha_composite(im)
    return base.resize((S, S), Image.LANCZOS)


def outline(m):
    e = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES)
    return np.array(e.filter(ImageFilter.MaxFilter(3))) > 0


def main():
    cols = ['now'] + VERS
    W = len(cols) * (S + PAD) + PAD
    H = len(IDS) * (S + PAD) + PAD + 28
    sheet = Image.new('RGBA', (W, H), (40, 40, 44, 255))
    sil = Image.new('RGBA', (W, H), (40, 40, 44, 255))
    d1, d2 = ImageDraw.Draw(sheet), ImageDraw.Draw(sil)
    for c, name in enumerate(cols):
        for d in (d1, d2):
            d.text((PAD + c * (S + PAD) + 6, 8), name, fill=(240, 240, 240, 255))
    print('%-6s %s' % ('id', '  '.join('%-14s' % v for v in VERS)))
    for r, idx in enumerate(IDS):
        cur = load(FACES / f'ready/monster/{idx}.png')
        mc = mask(cur)
        y = 28 + PAD + r * (S + PAD)
        sheet.paste(on_bg(cur), (PAD, y))
        sil.paste(on_bg(cur), (PAD, y))
        row = []
        for c, ver in enumerate(VERS, 1):
            p = HERE / 'out' / ver / f'{idx}.png'
            x = PAD + c * (S + PAD)
            if not p.exists():
                row.append('missing')
                continue
            new = load(p)
            mn = mask(new)
            iou = (mc & mn).sum() / max(1, (mc | mn).sum()) * 100
            transparent = (np.array(new)[:, :, 3] < 250).mean() * 100
            row.append('IoU %3.0f%% a%2.0f' % (iou, transparent))
            sheet.paste(on_bg(new), (x, y))
            ov = np.array(on_bg(new).resize((512, 512)))
            ov[outline(mc)] = (220, 40, 40, 255)
            sil.paste(Image.fromarray(ov).resize((S, S), Image.LANCZOS), (x, y))
            d1.text((x + 6, y + S - 18), 'IoU %.0f%%' % iou, fill=(20, 20, 20, 255))
        print('%-6s %s' % (idx, '  '.join('%-14s' % s for s in row)))
    sheet.convert('RGB').save(HERE / 'comparison.png')
    sil.convert('RGB').save(HERE / 'silhouette.png')
    print('a = % of pixels not fully opaque (0 -> background was not made transparent)')


if __name__ == '__main__':
    main()
