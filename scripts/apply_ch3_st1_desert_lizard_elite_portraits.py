"""Apply two cells of the Gemini elite-Gem desert lizard elite sheet c to the Chapter 3 Stage 1 elites.

Sheet c cell 2 = 3101_elite Desert Lizardman Raider (bone-studded gold circlet, gold case, studded shoulder),
sheet c cell 5 = 3102_elite Desert Lizardman Shaman (tall banded headdress, bead collar, rune stole, gold cross).
Both already face right like the installed normals, so neither is mirrored.
Re-running re-cuts the two from the sheet.
The sheet is 2048 px, so each ~674 px cell is reduced to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch3_st1_desert_lizard_elite_3x3_c.png"
READY = FACES / "source/ready/monster"
# Gridlines of sheet c: x 678-685 · 1362-1369, y 678-686 · 1362-1370.
# The antialiased pixel beside a gridline is left out too; cells are cut square.
SELECTED = {
    "3101_elite": (687, 0, 1361, 674),       # 2: top middle
    "3102_elite": (687, 688, 1360, 1361),    # 5: center (headdress tip cut by the gridline above)
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected desert lizard elite sheet size: {sheet.size}")
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
