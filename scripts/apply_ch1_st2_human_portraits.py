"""Apply the selected Chapter 1 Stage 2 human portraits from the 3x3 sheet.

Selection numbers count rows from top to bottom: footman 2, archer 2, knight 1.
Requires Pillow. Existing portraits are copied to source/_scratch before export.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch1_st2_human_3x3_rows_v2.png"
READY = FACES / "source/ready/monster"
GAME = FACES / "cartoon/monster"
BACKUP = FACES / "source/_scratch/ch1_st2_human_before_apply"
STAGED = ROOT / "output/ch1_st2_human_selected"
SELECTED = {
    1201: (1, 0),  # footman, second row
    1202: (1, 1),  # archer, second row
    1203: (0, 2),  # knight, first row
}


def black_runs(samples: list[tuple[int, int, int, int]]) -> list[tuple[int, int]]:
    runs = []
    start = None
    for index, (r, g, b, a) in enumerate(samples):
        black = a > 240 and max(r, g, b) < 15
        if black and start is None:
            start = index
        elif not black and start is not None:
            runs.append((start, index))
            start = None
    if start is not None:
        runs.append((start, len(samples)))
    return runs


def tile_bounds(sheet: Image.Image, vertical: bool) -> list[tuple[int, int]]:
    extent = sheet.width if vertical else sheet.height
    samples = [
        sheet.getpixel((index, 5) if vertical else (5, index))
        for index in range(extent)
    ]
    runs = black_runs(samples)
    dividers = []
    for center in (extent / 3, 2 * extent / 3):
        nearby = [
            run
            for run in runs
            if 10 <= run[1] - run[0] <= 24
            and abs((run[0] + run[1]) / 2 - center) < 30
        ]
        if len(nearby) != 1:
            raise ValueError(f"Expected one divider near {center}: {nearby}")
        dividers.append(nearby[0])
    return [(0, dividers[0][0]), (dividers[0][1], dividers[1][0]), (dividers[1][1], extent)]


def key_green(tile: Image.Image) -> Image.Image:
    keyed = tile.convert("RGBA")
    pixels = []
    source_pixels = (
        keyed.get_flattened_data()
        if hasattr(keyed, "get_flattened_data")
        else keyed.getdata()
    )
    for r, g, b, old_alpha in source_pixels:
        green_excess = g - max(r, b)
        if green_excess <= 40:
            alpha = 255
        elif green_excess >= 120:
            alpha = 0
        else:
            alpha = round((120 - green_excess) * 255 / 80)
        if green_excess > 0:
            g = max(r, b)
        pixels.append((r, g, b, min(old_alpha, alpha)))
    keyed.putdata(pixels)
    return keyed


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.width != sheet.height:
        raise ValueError(f"Expected a square sheet: {sheet.size}")
    columns = tile_bounds(sheet, vertical=True)
    rows = tile_bounds(sheet, vertical=False)
    STAGED.mkdir(parents=True, exist_ok=True)

    for monster_id, (row, column) in SELECTED.items():
        left, right = columns[column]
        top, bottom = rows[row]
        tile = sheet.crop((left, top, right, bottom))
        portrait = key_green(tile).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background was not removed from {monster_id}")
        portrait.save(STAGED / f"{monster_id}.png")
        print(f"{monster_id}: row {row + 1}, column {column + 1}, crop {(left, top, right, bottom)}")

    for monster_id in SELECTED:
        current_png = READY / f"{monster_id}.png"
        current_webp = GAME / f"{monster_id}.webp"
        for original, group in ((current_png, "ready"), (current_webp, "cartoon")):
            if not original.is_file():
                raise FileNotFoundError(original)
            backup = BACKUP / group / original.name
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                shutil.copy2(original, backup)
        shutil.copy2(STAGED / f"{monster_id}.png", current_png)
        exported, size = export_one(current_png, 256)
        print(f"Applied {current_png} and {exported} ({size:,} bytes)")


if __name__ == "__main__":
    main()
