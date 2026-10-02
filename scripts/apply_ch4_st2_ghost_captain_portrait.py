"""Apply cell 6 of the 3x3 Frozen Soldiers sheet to Chapter 4 Stage 2.

Cell 6 = 4203 (knight slot) — ghost captain with a broken crested helmet.
Re-running re-cuts it from the sheet. Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch4_st2_frozen_soldiers_3x3.png"
READY = FACES / "source/ready/monster"
# Gridlines of this sheet: x 668-689 · 1358-1378, y 669-689 · 1358-1379.
SELECTED = {
    4203: (1379, 690, 2047, 1358),  # 6: middle right, ghost captain
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected Frozen Soldiers sheet size: {sheet.size}")
    if sum(sheet.getpixel((1368, 1000))[:3]) > 60 or sum(sheet.getpixel((1700, 679))[:3]) > 60:
        raise ValueError("Expected black dividers at x 1358-1378 and y 669-689")

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
