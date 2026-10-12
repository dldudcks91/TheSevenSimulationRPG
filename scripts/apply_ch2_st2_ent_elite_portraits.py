"""Apply three cells of the Gemini elite-Gem sheets to the Chapter 2 Stage 2 Ent elites.

Sheet a cell 1 = 2201_elite Ent (bark-plate shoulder armor),
sheet b cell 4 = 2202_elite Rotting Ent (more skulls, skull on the shoulder),
sheet b cell 7 = 2203_elite Wise Ent (fuller headdress, skull on the staff).
Re-running re-cuts the three from the sheets.
The sheets are 2048 px, so each ~670 px cell is reduced to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEETS = FACES / "source/sheets"
READY = FACES / "source/ready/monster"
# Gridlines — sheet a: x · y 674-687 · 1360-1373, sheet b: x · y 676-687 · 1360-1371.
# The antialiased pixel on each side of a gridline is left out too; cells are cut square.
SELECTED = {
    "2201_elite": ("source_sheet_ch2_st2_ent_elite_3x3_a.png", (0, 0, 673, 673)),        # 1: top left
    "2202_elite": ("source_sheet_ch2_st2_ent_elite_3x3_b.png", (2, 689, 672, 1359)),     # 4: middle left
    "2203_elite": ("source_sheet_ch2_st2_ent_elite_3x3_b.png", (0, 1373, 675, 2048)),    # 7: bottom left
}


def main() -> None:
    for name, (sheet_name, box) in SELECTED.items():
        with Image.open(SHEETS / sheet_name) as opened:
            sheet = opened.convert("RGBA")
        if sheet.size != (2048, 2048):
            raise ValueError(f"Unexpected Ent elite sheet size: {sheet_name} {sheet.size}")
        target = READY / f"{name}.png"
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {name}")
        portrait.save(target)
        exported, size = export_one(target, 256)
        print(f"Installed {target.name} and {exported.name} ({size:,} bytes) from {sheet_name} crop {box}")


if __name__ == "__main__":
    main()
