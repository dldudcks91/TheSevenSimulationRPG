"""Apply three cells of the Gemini elite-Gem sheet b to the Chapter 2 Stage 3 Idolfolk elites.

Sheet b cell 2 = 2301_elite Idolfolk Hunter (carved plank mask, wrapped spear),
sheet b cell 5 = 2302_elite Idolfolk Stalker (painted plank mask, bound blowgun),
sheet b cell 8 = 2303_elite Idolfolk Shaman (painted round mask, bone staff).
Re-running re-cuts the three from the sheet.
The sheet is 2048 px, so each ~672 px cell is reduced to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch2_st3_idolfolk_elite_3x3_b.png"
READY = FACES / "source/ready/monster"
# Gridlines of sheet b: x 678-686 · 1361-1369, y 678-687 · 1360-1370.
# The antialiased pixel beside a gridline is left out too; cells are cut square (a few body rows dropped at the bottom).
SELECTED = {
    "2301_elite": (688, 0, 1360, 672),       # 2: top middle
    "2302_elite": (688, 688, 1360, 1360),    # 5: center
    "2303_elite": (688, 1372, 1360, 2044),   # 8: bottom middle
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected Idolfolk elite sheet size: {sheet.size}")
    for name, box in SELECTED.items():
        target = READY / f"{name}.png"
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {name}")
        portrait.save(target)
        exported, size = export_one(target, 256)
        print(f"Installed {target.name} and {exported.name} ({size:,} bytes) from crop {box}")


if __name__ == "__main__":
    main()
