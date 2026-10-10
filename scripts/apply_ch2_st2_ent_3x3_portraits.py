"""Apply two cells of the user's 3x3 Ent sheet to Chapter 2 Stage 2.

Cell 2 = 2202 Rotting Ent (skulls hung on branches, violet eyes),
cell 4 = 2203 Wise Ent (carved mask face, feathers, wrapped staff).
Re-running re-cuts the two from the sheet.
The sheet is 1024 px, so each ~333 px cell is enlarged to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch2_st2_ent_3x3.png"
READY = FACES / "source/ready/monster"
# Gridlines of this sheet: x 337-343 · 680-686, y 338-344 · 679-685.
# Their antialiased edges (x 336 · 344 · 679, y 337 · 345 · 678) are left out too.
SELECTED = {
    2202: (345, 0, 679, 334),    # 2: top middle, skulls on branches
    2203: (2, 346, 334, 678),    # 4: middle left, carved mask and feathers
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (1024, 1024):
        raise ValueError(f"Unexpected Ent sheet size: {sheet.size}")
    if sum(sheet.getpixel((340, 500))[:3]) > 60 or sum(sheet.getpixel((500, 341))[:3]) > 60:
        raise ValueError("Expected black dividers at x 337-343 and y 338-344")

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
