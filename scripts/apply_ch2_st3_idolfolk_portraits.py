"""Apply two cells of the 3x3 Idolfolk sheet to Chapter 2 Stage 3.

Cell 1 = 2301 Idolfolk Hunter (plank mask, stone spearhead),
cell 8 = 2303 Idolfolk Shaman (round white mask, feathers, crook staff).
Re-running re-cuts the two from the sheet.
The sheet is 1024 px, so each ~335 px cell is enlarged to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch2_st3_idolfolk_3x3.png"
READY = FACES / "source/ready/monster"
# Gridlines of this sheet: x 337-342 · 681-686, y 337-342 · 680-686.
# Their antialiased edges (x 336 · 343 · 680, y 687) are left out too.
SELECTED = {
    2301: (0, 0, 336, 336),        # 1: top left, plank mask
    2303: (345, 688, 679, 1022),   # 8: bottom middle, round white mask
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (1024, 1024):
        raise ValueError(f"Unexpected Idolfolk sheet size: {sheet.size}")
    if sum(sheet.getpixel((340, 500))[:3]) > 60 or sum(sheet.getpixel((500, 340))[:3]) > 60:
        raise ValueError("Expected black dividers at x 337-342 and y 337-342")

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
