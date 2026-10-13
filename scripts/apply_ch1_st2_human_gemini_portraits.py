"""Apply three cells of the Gemini elite-Gem crimson sheets to the Chapter 1 Stage 2 humans (Gemini style).

Sheet 1 cell 1 = 1201 Human Footman (kettle hat, crimson scarf),
sheet 2 cell 2 = 1202 Human Archer (brown hood, crimson scarf, quiver),
sheet 1 cell 3 = 1203 Human Knight (plumed visored helm, crimson scarf).
Masters go to source/ready/gemini/monster/ so the GPT portraits of the same ids stay untouched.
Re-running re-cuts the three from the sheets.

Faces are seated, not just shrunk: the eye gap becomes 90 px and the eye midpoint (300, 250)
on the 512 px master, so the three match the other Chapter 1 monsters in the round face slot
and the helmets stay inside the circle. Eye positions were read on the cut cells.
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
S = 512
EYE_GAP = 90.0
EYE_X, EYE_Y = 300.0, 250.0
# Gridlines — sheet 1: x · y 676-685 · 1361-1371, sheet 2: x 668-689 · 1358-1379, y 669-690 · 1357-1378.
# The antialiased pixel next to a gridline is left out too; cells are cut square.
#        id: (sheet, crop, eye midpoint x, y and eye gap in the cut cell)
SELECTED = {
    1201: ("source_sheet_ch1_st2_human_crimson_elite_1.png", (0, 0, 674, 674), 422.0, 300.0, 101.0),       # 1: top left
    1202: ("source_sheet_ch1_st2_human_crimson_elite_2.png", (691, 0, 1357, 666), 425.0, 291.0, 106.3),    # 2: top middle
    1203: ("source_sheet_ch1_st2_human_crimson_elite_1.png", (1373, 0, 2048, 675), 421.0, 313.0, 95.8),    # 3: top right
}


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for monster_id, (sheet_name, box, ex, ey, gap) in SELECTED.items():
        with Image.open(SHEETS / sheet_name) as opened:
            sheet = opened.convert("RGBA")
        if sheet.size != (2048, 2048):
            raise ValueError(f"Unexpected human sheet size: {sheet_name} {sheet.size}")
        target = READY / f"{monster_id}.png"
        cell = key_green(sheet.crop(box))
        k = EYE_GAP / gap
        side = round(cell.width * k)
        scaled = cell.convert("RGBa").resize((side, side), Image.Resampling.LANCZOS).convert("RGBA")
        portrait = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        portrait.paste(scaled, (round(EYE_X - ex * k), round(EYE_Y - ey * k)))
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(target)
        exported, size = export_one(target, 256)
        print(f"Installed {target.relative_to(FACES)} and {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} crop {box} k {k:.3f}")


if __name__ == "__main__":
    main()
