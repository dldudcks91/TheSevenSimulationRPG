"""Apply three cells of the 3x3 Mummy sheet to Chapter 3 Stage 3.

Cell 2 = 3301 Bareheaded Mummy, cell 1 = 3302 Bronze Mummy,
cell 8 = 3303 Gold-Crowned Mummy. Re-running re-cuts the three from the sheet.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch3_st3_mummy_3x3.png"
READY = FACES / "source/ready/monster"
# Gridlines of this sheet: x 674-689 · 1358-1373, y 675-689 · 1358-1372.
SELECTED = {
    3301: (690, 7, 1358, 675),      # 2: top middle, bare wrapped head
    3302: (0, 1, 674, 675),         # 1: top left, bronze helmet
    3303: (690, 1373, 1358, 2041),  # 8: bottom middle, gold crown — the crown is cut by the gridline above
}


def key_green(tile: Image.Image) -> Image.Image:
    """Remove the flat green background and its antialiased green fringe."""
    keyed = tile.convert("RGBA")
    pixels = []
    source_pixels = (
        keyed.get_flattened_data()
        if hasattr(keyed, "get_flattened_data")
        else keyed.getdata()
    )
    for r, g, b, old_alpha in source_pixels:
        excess = g - max(r, b)
        if excess <= 40:
            alpha = 255
        elif excess >= 120:
            alpha = 0
        else:
            alpha = round((120 - excess) * 255 / 80)
        if excess > 0:
            g = max(r, b)
        pixels.append((r, g, b, min(old_alpha, alpha)))
    keyed.putdata(pixels)
    return keyed


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected Mummy sheet size: {sheet.size}")
    if sum(sheet.getpixel((681, 300))[:3]) > 60 or sum(sheet.getpixel((300, 682))[:3]) > 60:
        raise ValueError("Expected black dividers at x 674-689 and y 675-689")

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
