"""Apply the cells the user picked from the 2026-10-24 Gemini draft sheets (Gemini style only).

Draft sheets = monster Gem, name lines only, three sheets per portrait (art-prompt 「초안 규칙」).
Each pick is "sheet k, cell n". The whole cell is keyed and shrunk to 512 px (no face seating),
like 1450 Moloch and 1403 Bronze Guardian.

- 3301 Bareheaded Mummy and 4101 Troll Warrior are recoloured toward their chapter palette
  (3 = sand, 4 = ice grey) by a luminance gradient mixed 70 % over the drawing. The recoloured
  portrait is also the attachment for redrawing the other two of the stage.
- 4301 Yeti takes the old 4303 Yeti Glacier Giant portrait (normal + elite, shared ready/monster masters);
  4303 takes a new cell, and its old Gemini elite is removed so the elite falls back to the new normal.
The GPT portraits are untouched. Re-running re-cuts everything from the sheets.
Requires Pillow and numpy.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEETS = FACES / "source/sheets"
SHARED = FACES / "source/ready/monster"
READY = FACES / "source/ready/gemini/monster"
SSOT = FACES / "source/monster"
S = 512
MIX, GAMMA = 0.7, 0.85
# luminance stops (0..1) -> colour, sampled by eye from the installed Chapter 3 / 4 portraits
SAND = [(0, (20, 16, 12)), (0.25, (95, 78, 58)), (0.55, (175, 152, 115)), (1, (238, 224, 190))]
ICE = [(0, (14, 18, 26)), (0.25, (70, 84, 100)), (0.55, (150, 168, 186)), (1, (228, 236, 244))]

#        id: (sheet slug, sheet k, cell n, recolour, SSOT name)
SELECTED = {
    1201: ("ch1_st2_human_footman", 1, 1, None, "human_footman_nasal_helm"),
    1202: ("ch1_st2_human_archer", 2, 1, None, "human_archer_fur_hood"),
    1203: ("ch1_st2_human_knight", 2, 1, None, "human_knight_round_helm"),
    3301: ("ch3_st3_bareheaded_mummy", 1, 1, SAND, "mummy_bandaged_skull_sand"),
    4101: ("ch4_st1_troll_warrior", 1, 5, ICE, "troll_warrior_mohawk_ice"),
    4302: ("ch4_st3_yeti_slinger", 3, 1, None, "yeti_slinger_headband"),
    4303: ("ch4_st3_yeti", 2, 2, None, "yeti_bone_horns"),
    4401: ("ch4_st4_gargoyle_statues", 2, 1, None, "gargoyle_throne_crowned"),
    4402: ("ch4_st4_gargoyle_statues", 2, 2, None, "gargoyle_frost"),
    4403: ("ch4_st4_gargoyle_statues", 2, 3, None, "gargoyle_winged"),
}
MOVES = {"4303": "4301", "4303_elite": "4301_elite"}   # shared master -> Gemini id


def gridlines(rgb: np.ndarray) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """The two black dividers per axis: runs of columns / rows that are >85 % near-black."""
    dark = rgb.max(axis=2) < 60

    def runs(share: np.ndarray) -> list[tuple[int, int]]:
        out: list[list[int]] = []
        for i in range(300, len(share) - 300):
            if share[i] > 0.85:
                if out and i - out[-1][1] <= 20:   # a divider can be two dark bands with a lighter middle
                    out[-1][1] = i
                else:
                    out.append([i, i])
        return [(a, b) for a, b in out]

    return runs(dark.mean(axis=0)), runs(dark.mean(axis=1))


def cut(sheet: Image.Image, n: int) -> tuple[Image.Image, tuple[int, int, int, int]]:
    xs, ys = gridlines(np.asarray(sheet)[:, :, :3])
    if len(xs) != 2 or len(ys) != 2:
        raise ValueError(f"Expected two gridlines per axis, got {xs} {ys}")
    w, h = sheet.size
    # the antialiased pixels next to a divider are left out too
    cols = [(0, xs[0][0] - 2), (xs[0][1] + 2, xs[1][0] - 2), (xs[1][1] + 2, w - 1)]
    rows = [(0, ys[0][0] - 2), (ys[0][1] + 2, ys[1][0] - 2), (ys[1][1] + 2, h - 1)]
    (x0, x1), (y0, y1) = cols[(n - 1) % 3], rows[(n - 1) // 3]
    side = min(x1 - x0, y1 - y0)
    box = (x0, y0, x0 + side, y0 + side)
    return sheet.crop(box), box


def recolour(image: Image.Image, stops: list) -> Image.Image:
    a = np.asarray(image).astype(float)
    rgb, alpha = a[:, :, :3] / 255, a[:, :, 3:]
    lum = (0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]) ** GAMMA
    xs, cols = [s[0] for s in stops], np.array([s[1] for s in stops]) / 255
    tint = np.stack([np.interp(lum, xs, cols[:, k]) for k in range(3)], axis=2)
    out = rgb * (1 - MIX) + tint * MIX
    return Image.fromarray(np.concatenate([np.clip(out * 255, 0, 255), alpha], axis=2).astype(np.uint8))


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for source, target in MOVES.items():
        shutil.copy2(SHARED / f"{source}.png", READY / f"{target}.png")
        exported, size = export_one(READY / f"{target}.png", 256)
        print(f"Moved {source} -> {exported.relative_to(FACES)} ({size:,} bytes)")
    for monster_id, (slug, k, n, stops, name) in SELECTED.items():
        sheet_name = f"source_sheet_{slug}_3x3_{k}.png"
        with Image.open(SHEETS / sheet_name) as opened:
            sheet = opened.convert("RGBA")
        cell, box = cut(sheet, n)
        cell = key_green(cell)
        if stops:
            cell = recolour(cell, stops)
        portrait = cell.convert("RGBa").resize((S, S), Image.Resampling.LANCZOS).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        target = READY / f"{monster_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n} crop {box}"
              + (" recoloured" if stops else ""))
    stale = FACES / "gemini/monster/4303_elite.webp"
    if stale.exists():
        stale.unlink()
        export_one(READY / "4303.png", 256)   # refreshes the file list without the removed elite
        print("Removed gemini/monster/4303_elite.webp (now 4301_elite)")


if __name__ == "__main__":
    main()
