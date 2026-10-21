"""Apply one cell of the Gemini elite-Gem Lamech sheet to the Chapter 1 Stage 2 boss (Gemini style).

Sheet 1 cell 2 = 1251 Lamech (black hair tied back, beard, the mark of Cain branded on the forehead).
Lamech has no GPT portrait, so the master goes to source/ready/monster/ and exports to gemini/.
The same image is kept as source/monster/lamech_cain_mark.png.
Re-running re-cuts it from the sheet.

The face is seated like the three Chapter 1 Stage 2 humans: the eye gap becomes 90 px and the eye
midpoint (300, 250) on the 512 px master. Eye positions were read on the cut cell.
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
SSOT = FACES / "source/monster/lamech_cain_mark.png"
S = 512
EYE_GAP = 90.0
EYE_X, EYE_Y = 300.0, 250.0
# Gridlines: x 671-690 · 1357-1376, y 670-691 · 1354-1374. The antialiased pixel next to a gridline is left out too.
#        id: (sheet, crop, eye midpoint x, y and eye gap in the cut cell)
SELECTED = {
    1251: ("source_sheet_ch1_st2_lamech_cain_3x3_1.png", (692, 0, 1356, 664), 445.0, 296.0, 118.0),   # 2: top middle
}


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for monster_id, (sheet_name, box, ex, ey, gap) in SELECTED.items():
        with Image.open(SHEETS / sheet_name) as opened:
            sheet = opened.convert("RGBA")
        if sheet.size != (2048, 2048):
            raise ValueError(f"Unexpected Lamech sheet size: {sheet_name} {sheet.size}")
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
        portrait.save(SSOT)
        exported, size = export_one(target, 256)
        print(f"Installed {target.relative_to(FACES)} and {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} crop {box} k {k:.3f}")


if __name__ == "__main__":
    main()
