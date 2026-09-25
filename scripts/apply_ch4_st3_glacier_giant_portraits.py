"""Apply cells 3 and 4 of the user's 3x3 troll sheet to Chapter 4 Stage 3 monster 4303 (Troll Glacier Giant).

Cell 4 = middle left, grinning white troll = normal 4303.
Cell 3 = top right, scarred snarling troll with a fang necklace = elite 4303_elite.
Grid lines sit at 0-4 · 678-687 · 1360-1370 · 2042-2047; each box drops the one-pixel
dark antialias row beside them. Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch2_st4_naga_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch4_st3_troll_3x3.png"
READY = FACES / "source/ready/monster"
SELECTED = {
    "4303": (6, 688, 677, 1359),         # 4: middle left
    "4303_elite": (1370, 6, 2041, 677),  # 3: top right
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected troll sheet size: {sheet.size}")
    if sum(sheet.getpixel((682, 60))[:3]) >= 90:
        raise ValueError("Expected black dividers at x 678-687")

    for name, box in SELECTED.items():
        target = READY / f"{name}.png"
        if target.exists():
            raise FileExistsError(f"{target} already exists; back it up before replacing")
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {name}")
        portrait.save(target)
        exported, size = export_one(target, 256)
        print(f"Applied {target} and {exported} ({size:,} bytes) from crop {box}")


if __name__ == "__main__":
    main()
