"""Apply the middle column of the 3x3 Chapter Boss sheet to the Chapter 3-5 bosses.

Cell 2 = 3900 Mammon (gold crown, gold chains), cell 5 = 4900 Belphegor
(mossy stone horns, chains), cell 8 = 5900 Beelzebub (fly demon, red eyes).
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
SHEET = FACES / "source/sheets/source_sheet_ch3_5_chapter_bosses_3x3.png"
READY = FACES / "source/ready/monster"
# Gridlines of this sheet: x 339-345 · 679-685, y 339-345 · 679-685.
SELECTED = {
    3900: (346, 3, 678, 335),     # 2: top middle, crowned gold goblin — 3 px above the crown
    4900: (346, 346, 678, 678),   # 5: center, mossy stone horns and chains
    5900: (346, 688, 678, 1020),  # 8: bottom middle, fly demon — the horns are cut by the gridline above
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (1024, 1024):
        raise ValueError(f"Unexpected Chapter Boss sheet size: {sheet.size}")
    if sum(sheet.getpixel((342, 170))[:3]) > 60 or sum(sheet.getpixel((170, 342))[:3]) > 60:
        raise ValueError("Expected black dividers at x 339-345 and y 339-345")

    for monster_id, box in SELECTED.items():
        target = READY / f"{monster_id}.png"
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0 and portrait.getpixel((506, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(target)
        exported, size = export_one(target, 256)
        print(f"Installed {target.name} and {exported.name} ({size:,} bytes) from crop {box}")


if __name__ == "__main__":
    main()
