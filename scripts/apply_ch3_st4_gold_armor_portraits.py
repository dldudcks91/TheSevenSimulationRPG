"""Apply the middle row of the 3x3 Gold Armor sheet to Chapter 3 Stage 4.

Cell 5 = 3401 Palace Guard (brimmed helmet), cell 4 = 3402 Palace Guard Archer
(open helmet, quiver), cell 6 = 3403 Palace Guard Captain (closed visor).
Re-running re-cuts the three from the sheet.
The sheet is 1024 px, so each 332 px cell is enlarged to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch3_st4_gold_armor_3x3.png"
READY = FACES / "source/ready/monster"
# Gridlines of this sheet: x 339-345 · 678-685, y 338-345 · 678-685.
SELECTED = {
    3401: (346, 346, 678, 678),   # 5: middle, brimmed helmet
    3402: (3, 346, 335, 678),     # 4: middle left, open helmet with a quiver
    3403: (689, 346, 1021, 678),  # 6: middle right, closed visor
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (1024, 1024):
        raise ValueError(f"Unexpected Gold Armor sheet size: {sheet.size}")
    if sum(sheet.getpixel((342, 500))[:3]) > 60 or sum(sheet.getpixel((500, 342))[:3]) > 60:
        raise ValueError("Expected black dividers at x 339-345 and y 338-345")

    for monster_id, box in SELECTED.items():
        target = READY / f"{monster_id}.png"
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(target)
        exported, size = export_one(target, 256)
        print(f"Installed {target.name} and {exported.name} ({size:,} bytes) from crop {box}")


if __name__ == "__main__":
    main()
