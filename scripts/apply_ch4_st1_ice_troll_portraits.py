"""Apply three cells of the Gemini elite-Gem ice troll sheet c to the Chapter 4 Stage 1 trolls.

Sheet c cell 3 = 4101 Troll Warrior (white mohawk, ice-crusted club),
sheet c cell 6 = 4102 Troll Shaman (beast skull and feathers, holy book),
sheet c cell 9 = 4103 Troll Frostcaller (white topknot and beard, ice-tipped staff).
Cell 9 carries the Gemini ✦ watermark; it is removed by reverse alpha blending first.
Re-running re-cuts the three from the sheet.
The sheet is 2048 px, so each ~666 px cell is reduced to the 512 px master.
Requires Pillow and NumPy.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch2_st4_naga_elite_portraits import remove_watermark
from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch4_st1_ice_troll_3x3_c.png"
READY = FACES / "source/ready/monster"
# Gridlines of sheet c: x 666-687 · 1359-1380, y 668-689 · 1359-1380 (no outer border).
# The antialiased pixel beside a gridline is left out too.
SELECTED = {
    "4101": (1382, 0, 2048, 667),       # 3: top right
    "4102": (1382, 691, 2048, 1358),    # 6: middle right
    "4103": (1382, 1382, 2048, 2048),   # 9: bottom right
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected ice troll sheet size: {sheet.size}")
    sheet = remove_watermark(sheet)
    for name, box in SELECTED.items():
        target = READY / f"{name}.png"
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {name}")
        portrait.save(target)
        exported, size = export_one(target, 256, "gemini")
        print(f"Installed {target.name} and {exported.name} ({size:,} bytes) from crop {box}")


if __name__ == "__main__":
    main()
