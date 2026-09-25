"""Apply cell 1 of the user's 2x2 undead sheet to Chapter 2 Stage 3 monster 2301 (Villager Corpse).

Cell 1 = top left, chained hulking corpse. Requires Pillow.
2301 had no portrait before, so there is nothing to back up.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch2_st4_naga_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch2_st3_undead_2x2.png"
READY = FACES / "source/ready/monster"
SELECTED = {
    2301: (0, 0, 1016, 1016),  # 1: top left, chained hulking corpse
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected undead sheet size: {sheet.size}")
    if sum(sheet.getpixel((1020, 60))[:3]) >= 90:
        raise ValueError("Expected black dividers at x 1016-1031")

    for monster_id, box in SELECTED.items():
        target = READY / f"{monster_id}.png"
        if target.exists():
            raise FileExistsError(f"{target} already exists; back it up before replacing")
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(target)
        exported, size = export_one(target, 256)
        print(f"Applied {target} and {exported} ({size:,} bytes) from crop {box}")


if __name__ == "__main__":
    main()
