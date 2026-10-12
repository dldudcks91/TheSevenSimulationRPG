"""Apply one cell of the Gemini elite-Gem Idolfolk Stalker sheet to 2302.

Cell 1 = 2302 Idolfolk Stalker (plank mask, blowgun with a poison dart).
Re-running re-cuts it from the sheet.
The sheet is 2048 px, so the ~669 px cell is reduced to the 512 px master.
Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch2_st3_idolfolk_stalker_3x3.png"
READY = FACES / "source/ready/monster"
# Gridlines of this sheet: x · y 670-691 · 1356-1377. The antialiased pixel beside them is left out too.
SELECTED = {
    2302: (0, 0, 669, 669),    # 1: top left
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected Idolfolk Stalker sheet size: {sheet.size}")
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
