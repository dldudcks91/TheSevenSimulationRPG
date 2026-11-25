# -*- coding: utf-8 -*-
"""Comparison board for the tactic-icon drafts.
  python board.py            -> board.png (rows = direction, left = Codex, right = Gemini)
Each sheet is split into 2x2 quadrants; each quadrant is trimmed to its drawing and squared.
Under each big tile: the same tile at 40 and 64 px on a dark game slot (#000 + bronze line).
Near-black monochrome tiles are drawn light on the dark slot (the game tints mono art)."""
import glob, os, re
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SHEETS = os.path.join(HERE, 'sheets')
TILES = os.path.join(HERE, 'tiles')
ROWS = [('a_mono', '단색 실루엣'), ('b_item', '컬러 물건'), ('c_map', '작전 지도'), ('d_scene', '배지 속 장면'), ('e_free', '자유')]
NAMES = ['방패벽', '트로이 목마', '화살비', '일기토']
BIG, GAP, LABEL_W, SMALL_H = 180, 10, 130, 78
FONT = ImageFont.truetype(r'C:\Windows\Fonts\malgun.ttf', 18)
FONT_S = ImageFont.truetype(r'C:\Windows\Fonts\malgun.ttf', 14)


def latest(tool, key):
    fs = [f for f in glob.glob(os.path.join(SHEETS, '%s_%s_*.png' % (tool, key))) if os.path.getsize(f) > 0]
    if not fs:
        return None
    return max(fs, key=lambda f: int(re.search(r'_(\d+)\.png$', f).group(1)))


def tiles_of(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    out = []
    for r in range(2):
        for c in range(2):
            q = im.crop((c * w // 2, r * h // 2, (c + 1) * w // 2, (r + 1) * h // 2))
            a = np.asarray(q).astype(int)
            bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
            fg = np.abs(a - bg).sum(axis=2) > 60
            m = 6  # ignore a few px at the quadrant edge (stray grid lines)
            fg[:m] = fg[-m:] = False; fg[:, :m] = fg[:, -m:] = False
            ys, xs = np.nonzero(fg)
            if len(xs) == 0:
                out.append(q); continue
            x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
            side = int(max(x1 - x0, y1 - y0) * 1.1) + 2
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            sq = Image.new('RGB', (side, side), tuple(int(v) for v in bg))
            bx, by = cx - side // 2, cy - side // 2  # box may run past the quadrant: paste only the part inside
            qx0, qy0 = max(bx, 0), max(by, 0)
            qx1, qy1 = min(bx + side, q.width), min(by + side, q.height)
            sq.paste(q.crop((qx0, qy0, qx1, qy1)), (qx0 - bx, qy0 - by))
            out.append(sq)
    return out


def keyed(tile, size):
    """Tile -> RGBA at `size` with the background flood-filled out from the corners."""
    t = tile.resize((256, 256), Image.LANCZOS).convert('RGB')
    key = (255, 0, 255)
    for xy in [(0, 0), (255, 0), (0, 255), (255, 255)]:
        ImageDraw.floodfill(t, xy, key, thresh=60)
    a = np.asarray(t).astype(int)
    alpha = (np.abs(a - np.array(key)).sum(axis=2) > 30).astype(np.uint8) * 255
    rgba = np.dstack([a.astype(np.uint8), alpha])
    fg = alpha > 0
    if fg.any():
        px = a[fg]
        near_black = (px.max(axis=1) < 60).mean()
        near_white = (px.min(axis=1) > 200).mean()
        if near_black > 0.5 and near_black + near_white > 0.8:  # monochrome black art (pure black glyph + white gaps): show it light, as the game tints mono art
            rgba[..., :3][fg] = 255 - rgba[..., :3][fg]
    im = Image.fromarray(rgba)
    return im.resize((size, size), Image.LANCZOS)


def slot(icon, size):
    s = Image.new('RGB', (size + 4, size + 4), (0, 0, 0))
    ImageDraw.Draw(s).rectangle((0, 0, size + 3, size + 3), outline=(0x7d, 0x6a, 0x48))
    s.paste(icon, (2, 2), icon)
    return s


def main():
    os.makedirs(TILES, exist_ok=True)
    cols = 8
    W = LABEL_W + cols * (BIG + GAP) + 40
    H = 70 + len(ROWS) * (BIG + SMALL_H + 20)
    board = Image.new('RGB', (W, H), (236, 233, 226))
    d = ImageDraw.Draw(board)
    d.text((LABEL_W, 8), 'Codex', fill=(0, 0, 0), font=FONT)
    d.text((LABEL_W + 4 * (BIG + GAP) + 40, 8), 'Gemini', fill=(0, 0, 0), font=FONT)
    for i in range(cols):
        x = LABEL_W + i * (BIG + GAP) + (40 if i >= 4 else 0)
        d.text((x, 38), NAMES[i % 4], fill=(60, 60, 60), font=FONT_S)
    for r, (key, label) in enumerate(ROWS):
        y = 64 + r * (BIG + SMALL_H + 20)
        d.text((8, y + BIG // 2 - 12), label, fill=(0, 0, 0), font=FONT)
        for t, tool in enumerate(['codex', 'gemini']):
            p = latest(tool, key)
            if not p:
                continue
            for i, tile in enumerate(tiles_of(p)):
                tile.save(os.path.join(TILES, '%s_%s_%d.png' % (tool, key, i + 1)))
                x = LABEL_W + (t * 4 + i) * (BIG + GAP) + (40 if t else 0)
                board.paste(tile.resize((BIG, BIG), Image.LANCZOS), (x, y))
                s40, s64 = slot(keyed(tile, 40), 40), slot(keyed(tile, 64), 64)
                board.paste(s64, (x, y + BIG + 6))
                board.paste(s40, (x + 76, y + BIG + 6 + 24))
    board.save(os.path.join(HERE, 'board.png'))
    print('board.png', board.size)


if __name__ == '__main__':
    main()
