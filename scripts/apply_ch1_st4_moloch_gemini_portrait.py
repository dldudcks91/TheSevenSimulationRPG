"""Apply one cell of the Gemini elite-Gem Moloch idea sheet to the Chapter 1 Stage 4 boss (Gemini style).

Sheet ideas_a cell 2 = 1450 Moloch (bull's head of cracked bronze, fire showing through the cracks).
The GPT portrait of the same id stays untouched: the master goes to source/ready/gemini/monster/.
The same image is kept as source/monster/moloch_bronze_bull.png.
Re-running re-cuts it from the sheet.

The head is three-quarter with one eye hidden, so the face is not seated by eye gap: the whole cell
is shrunk to 512 px (like the 5101 ghouls). Its head size then matches the Chapter 1 bosses
1150 · 1250 · 1251 · 1900 in the round face slot.
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
SSOT = FACES / "source/monster/moloch_bronze_bull.png"
S = 512
# Gridlines: x 668-687 · 1360-1378, y 668-687 · 1359-1378. The antialiased pixel next to a gridline is left out too.
#        id: (sheet, crop)
SELECTED = {
    1450: ("source_sheet_ch1_st4_moloch_ideas_a_3x3_1.png", (689, 0, 1356, 667)),   # 2: top middle
}


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for monster_id, (sheet_name, box) in SELECTED.items():
        with Image.open(SHEETS / sheet_name) as opened:
            sheet = opened.convert("RGBA")
        if sheet.size != (2048, 2048):
            raise ValueError(f"Unexpected Moloch sheet size: {sheet_name} {sheet.size}")
        target = READY / f"{monster_id}.png"
        cell = key_green(sheet.crop(box))
        portrait = cell.convert("RGBa").resize((S, S), Image.Resampling.LANCZOS).convert("RGBA")
        if portrait.getpixel((5, 256))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(target)
        portrait.save(SSOT)
        exported, size = export_one(target, 256)
        print(f"Installed {target.relative_to(FACES)} and {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} crop {box} k {S / cell.width:.3f}")


if __name__ == "__main__":
    main()
