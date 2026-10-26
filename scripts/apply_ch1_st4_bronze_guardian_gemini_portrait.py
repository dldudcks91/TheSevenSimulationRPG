"""Apply one cell of the Gemini Bronze Guardian sheet to the Chapter 1 Stage 4 normal knight (Gemini style).

Sheet r6_2 cell 5 = 1403 Bronze Guardian (crested beak helm, verdigris bronze armour, spear on the right).
The GPT portrait of the same id stays untouched: the master goes to source/ready/gemini/monster/.
The same image is kept as source/monster/bronze_guardian_crested_beak.png.
Only the normal portrait changes; 1403_elite keeps its GPT portrait.
Re-running re-cuts it from the sheet.

The beak helm shows no eyes, so the face is not seated by eye gap: the whole cell is shrunk to 512 px
(like 1450 Moloch from the same chapter).
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
READY = FACES / "source/ready/gemini/monster"
SSOT = FACES / "source/monster/bronze_guardian_crested_beak.png"
S = 512
# Gridlines: x 672-688 · 1361-1377, y 670-687 · 1358-1374. The antialiased pixel next to a gridline is left out too.
#        id: (sheet, crop)
SELECTED = {
    1403: ("source_sheet_ch1_st4_bronze_guardian_r6_3x3_2.png", (690, 689, 1358, 1357)),   # 5: centre
}


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for monster_id, (sheet_name, box) in SELECTED.items():
        with Image.open(SHEETS / sheet_name) as opened:
            sheet = opened.convert("RGBA")
        if sheet.size != (2048, 2048):
            raise ValueError(f"Unexpected Bronze Guardian sheet size: {sheet_name} {sheet.size}")
        target = READY / f"{monster_id}.png"
        cell = key_green(sheet.crop(box))
        portrait = cell.convert("RGBa").resize((S, S), Image.Resampling.LANCZOS).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(target)
        portrait.save(SSOT)
        exported, size = export_one(target, 256)
        print(f"Installed {target.relative_to(FACES)} and {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} crop {box} k {S / cell.width:.3f}")


if __name__ == "__main__":
    main()
