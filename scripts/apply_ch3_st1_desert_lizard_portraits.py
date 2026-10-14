"""Apply two cells of the Gemini elite-Gem desert lizard sheet b to Chapter 3 Stage 1.

Sheet b cell 2 = 3101 Desert Lizardman Raider (cloth wrapped head, quiver),
sheet b cell 5 = 3102 Desert Lizardman Shaman (tall mitre, gold cross).
Both already face right like the other monsters, so neither is mirrored.
Re-running re-cuts the two from the sheet.
The sheet is 2048 px, so each ~666 px cell is reduced to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch3_st1_desert_lizard_3x3_b.png"
READY = FACES / "source/ready/monster"
# Gridlines of sheet b: x 670-689 · 1358-1377, y 670-689 · 1358-1377.
# The antialiased pixel beside a gridline is left out too; the top cell loses a few body rows at the bottom.
SELECTED = {
    3101: (691, 0, 1357, 666),       # 2: top middle
    3102: (691, 691, 1357, 1357),    # 5: center (mitre tip cut by the gridline above)
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected desert lizard sheet size: {sheet.size}")
    for monster_id, box in SELECTED.items():
        target = READY / f"{monster_id}.png"
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(target)
        exported, size = export_one(target, 256, "gemini")
        print(f"Installed {target.name} and {exported.name} ({size:,} bytes) from crop {box}")


if __name__ == "__main__":
    main()
