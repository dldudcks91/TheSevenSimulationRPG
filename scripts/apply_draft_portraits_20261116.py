"""Apply the cells the user picked on 2026-11-16 from the 「11-15 다시 뽑은 몬스터」 board (Gemini style only).

Same cut as apply_draft_portraits_20261031.py: the whole cell is keyed and shrunk to 512 px (no face seating).
Picks were read off the board as "sheet k-cell n".

- 3250 (Charon) · 4450 (Sphinx) are the first boss portraits. 4401 replaces the throne guardian.
- 1403_elite · 4103_elite get their own `<idx>_elite` portrait.
- Second pick the same day (「11-16 다시 뽑은 몬스터」 board): 1201_elite · 1202_elite (blood-soaked 3-8), 3403 · 4102 · 4203
  replace the normal portrait, 5150 is the first portrait of the zombie boss that replaces the Wendigo concept.
  MARKED cells carry the Gemini sparkle (sheet cell 9) — it is flooded from the seed and refilled.
- LOWERED: the human units 1201 · 1202 · 1203 are moved down so the head top sits at TOP of the frame and
  the bottom is cut. The user asked for it so the elite helmets drawn from them stay inside the frame.
  The original Gemini cut stays in source/monster/ (the SSOT name in the faces README).
Re-running re-cuts the picks from the sheets. The lowering is idempotent (it measures before moving).
Requires Pillow and numpy.
"""

from __future__ import annotations

from collections import deque

import numpy as np
from PIL import Image, ImageFilter

from apply_draft_portraits_20261031 import FACES, READY, SSOT, keyed_cell
from export_face_portraits import export_one


#        target: (sheet slug, sheet k, cell n, SSOT name)
SELECTED = {
    "3250": ("ch3_st2_charon_r4", 2, 5, "charon_hooded_skull"),
    "4450": ("ch4_st4_sphinx_r3", 1, 8, "sphinx_winged_statue"),
    "4401": ("ch4_st4_throne_guardian_r4", 2, 2, "throne_guardian_crowned_r4"),
    "1403_elite": ("ch1_st4_bronze_guardian_elite_r2", 3, 4, "bronze_guardian_elite"),
    "4103_elite": ("ch4_st1_troll_frostcaller_elite_r2", 1, 4, "troll_frostcaller_elite"),
    "1201_elite": ("ch1_st2_human_footman_elite_r3", 3, 8, "human_footman_elite_bloodied"),
    "1202_elite": ("ch1_st2_human_archer_elite_r3", 3, 8, "human_archer_elite_bloodied"),
    "3403": ("ch3_st4_palace_guard_captain_r3", 1, 9, "palace_guard_captain_gold_crest_void"),
    "4102": ("ch4_st1_troll_shaman_r7", 2, 2, "troll_shaman_amber_glow"),
    "4203": ("ch4_st2_phantom_centurion_r2", 1, 4, "phantom_centurion_skull_crest"),
    "5150": ("ch5_st1_nachzehrer", 1, 5, "zombie_boss_roped_hulk"),
}
MARKED = {"3403": (0.80, 0.79)}  # target: sparkle seed (x, y) as a fraction of the portrait
LOWERED = ("1201", "1202", "1203")
TOP = 0.18  # head top / frame height after lowering — bare-headed heroes sit at 0.15 ~ 0.19


def clear_border(img: Image.Image) -> Image.Image:
    """Erase a sheet divider that the cut left on an edge (1403_elite 3-4 kept an 8 px black strip on the left)."""
    a = np.array(img)
    solid = lambda line: ((line[:, 3] > 128) & (line[:, :3].max(1) < 60)).mean() > 0.95
    for x in range(a.shape[1] // 8):
        if not solid(a[:, x]):
            break
        a[:, x, 3] = 0
    for x in range(a.shape[1] - 1, a.shape[1] - a.shape[1] // 8, -1):
        if not solid(a[:, x]):
            break
        a[:, x, 3] = 0
    for y in range(a.shape[0] // 8):
        if not solid(a[y]):
            break
        a[y, :, 3] = 0
    for y in range(a.shape[0] - 1, a.shape[0] - a.shape[0] // 8, -1):
        if not solid(a[y]):
            break
        a[y, :, 3] = 0
    return Image.fromarray(a)


def _grow(m, r):
    return np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0

def erase_mark(img, seed=(0.80, 0.79), grow=3, iters=300):
    """Erase the Gemini sparkle: flood the grey blob from `seed`, refill by diffusion, re-cut the edge and redraw the outline."""
    a = np.array(img).astype(np.float64)
    H, W = a.shape[:2]
    rgb, al = a[:, :, :3], a[:, :, 3]
    grey = (al > 0) & (rgb.min(2) > 110) & ((rgb.max(2) - rgb.min(2)) < 45)
    sy, sx = int(seed[1] * H), int(seed[0] * W)
    # nearest grey pixel to the seed
    ys, xs = np.where(grey[sy - 40:sy + 40, sx - 40:sx + 40])
    k = np.argmin((ys - 40) ** 2 + (xs - 40) ** 2)
    start = (sy - 40 + ys[k], sx - 40 + xs[k])
    blob = np.zeros((H, W), bool); q = deque([start]); blob[start] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and grey[ny, nx] and not blob[ny, nx]:
                blob[ny, nx] = True; q.append((ny, nx))
    m = _grow(blob, grow)
    pm = np.dstack([rgb * al[..., None] / 255.0, al]); pm[m] = 0
    known = ~m
    for _ in range(iters):
        acc = np.zeros_like(pm); cnt = np.zeros((H, W))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            acc += np.roll(np.roll(pm, dy, 0), dx, 1) * np.roll(np.roll(known, dy, 0), dx, 1)[..., None]
            cnt += np.roll(np.roll(known, dy, 0), dx, 1)
        upd = m & ~known & (cnt > 0)
        pm[upd] = acc[upd] / cnt[upd][:, None]
        known |= upd
    alpha = pm[:, :, 3]
    col = pm[:, :, :3] * 255.0 / np.maximum(alpha[..., None], 1e-6)
    inside = alpha > 128
    out = a.copy()
    out[m, 3] = np.where(inside[m], 255, 0)
    out[m, :3] = np.clip(col[m], 0, 255)
    edge = m & inside & _grow(~inside, 4)
    out[edge, :3] = (22, 22, 24)
    return Image.fromarray(out.astype(np.uint8), 'RGBA'), int(blob.sum())


def head_top(img: Image.Image) -> int:
    alpha = np.array(img)[:, :, 3]
    rows = np.where((alpha > 128).sum(1) > 2)[0]
    return int(rows[0])


def lower(img: Image.Image) -> tuple[Image.Image, int]:
    shift = round(TOP * img.height) - head_top(img)
    if shift <= 0:
        return img, 0
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img.crop((0, 0, img.width, img.height - shift)), (0, shift))
    return out, shift


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for target_id, (slug, k, n, name) in SELECTED.items():
        portrait, sheet_name, box = keyed_cell(slug, k, n)
        portrait = clear_border(portrait)
        if target_id in MARKED:
            portrait, _ = erase_mark(portrait, MARKED[target_id])
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {target_id}")
        target = READY / f"{target_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n} crop {box}")
    for target_id in LOWERED:
        target = READY / f"{target_id}.png"
        with Image.open(target) as opened:
            moved, shift = lower(opened.convert("RGBA"))
        if not shift:
            print(f"Already lowered {target_id}")
            continue
        moved.save(target)
        exported, size = export_one(target, 256)
        print(f"Lowered {exported.relative_to(FACES)} by {shift}px ({size:,} bytes)")


if __name__ == "__main__":
    main()
