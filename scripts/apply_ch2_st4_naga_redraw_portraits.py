"""Apply three cells of the Gemini elite-Gem Naga redraw sheet a to Chapter 2 Stage 4.

Sheet a cell 1 = 2401 Naga Warrior (bronze helmet, trident) — mirrored to face right,
sheet a cell 4 = 2402 Naga Shaman (seaweed hood, holy book),
sheet a cell 8 = 2403 Naga Mage (hood, ice orb).
Re-running re-cuts the three from the sheet.
The sheet is 2048 px, so each ~670 px cell is reduced to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch2_st4_naga_redraw_3x3_a.png"
READY = FACES / "source/ready/monster"
# Gridlines of sheet a: x 678-691 · 1356-1369, y 678-691 · 1356-1369 (plus one antialiased pixel at x 1355 · 1370).
# Cells are cut square; a short cell loses a few columns at both sides or body rows at the bottom.
SELECTED = {
    2401: ((0, 0, 678, 678), True),            # 1: top left, mirrored
    2402: ((7, 692, 671, 1356), False),        # 4: middle left
    2403: ((692, 1371, 1355, 2034), False),    # 8: bottom middle
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected Naga redraw sheet size: {sheet.size}")
    for monster_id, (box, mirror) in SELECTED.items():
        target = READY / f"{monster_id}.png"
        tile = key_green(sheet.crop(box))
        if mirror:
            tile = ImageOps.mirror(tile)
        portrait = tile.convert("RGBa").resize((512, 512), Image.Resampling.LANCZOS).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(target)
        exported, size = export_one(target, 256, "gemini")
        print(f"Installed {target.name} and {exported.name} ({size:,} bytes) from crop {box}{' mirrored' if mirror else ''}")


if __name__ == "__main__":
    main()
