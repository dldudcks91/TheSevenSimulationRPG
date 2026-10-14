"""Apply three cells of the Gemini elite-Gem Naga sheet d to the Chapter 2 Stage 4 elites.

Sheet d cell 3 = 2401_elite Naga Warrior (skull helmet, trident),
sheet d cell 6 = 2402_elite Naga Shaman (feathers and bird skull, holy book),
sheet d cell 9 = 2403_elite Naga Mage (coral and ice crown, ice orb).
All three already face the same way as the installed normals, so none is mirrored.
Cell 9 carries the Gemini ✦ watermark on the robe; it is removed by reverse alpha blending first.
Re-running re-cuts the three from the sheet.
The sheet is 2048 px, so each ~670 px cell is reduced to the 512 px master.
Requires Pillow and NumPy.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch2_st4_naga_elite_3x3_d.png"
READY = FACES / "source/ready/monster"
# The ✦ sits at the same place on every 2048 px Gemini sheet: a white overlay whose opacity (max ~0.36)
# was measured where it lies on flat green (goblin_armor · goblin_scout · goblin_troop_2 · undead_2x2 sheets).
WATERMARK_ALPHA = Path(__file__).with_name("gemini_watermark_alpha.png")
WATERMARK_AT = (1760, 1760)


def remove_watermark(sheet: Image.Image) -> Image.Image:
    """Undo `shown = a * 255 + (1 - a) * original` inside the ✦ patch."""
    with Image.open(WATERMARK_ALPHA) as opened:
        alpha = np.asarray(opened.convert("L"), dtype=float)[:, :, None] / 255
    x, y = WATERMARK_AT
    h, w = alpha.shape[:2]
    pixels = np.asarray(sheet, dtype=float).copy()
    patch = pixels[y:y + h, x:x + w, :3]
    pixels[y:y + h, x:x + w, :3] = np.clip((patch - alpha * 255) / (1 - alpha), 0, 255)
    return Image.fromarray(np.round(pixels).astype(np.uint8))
# Gridlines of sheet d: x 674-689 · 1358-1373, y 676-691 · 1362-1377.
# The antialiased pixel beside a gridline is left out too; a short cell loses a few columns at both sides.
SELECTED = {
    "2401_elite": (1375, 0, 2048, 673),       # 3: top right
    "2402_elite": (1377, 693, 2045, 1361),    # 6: middle right
    "2403_elite": (1377, 1379, 2046, 2048),   # 9: bottom right
}


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected Naga elite sheet size: {sheet.size}")
    sheet = remove_watermark(sheet)
    for name, box in SELECTED.items():
        target = READY / f"{name}.png"
        portrait = key_green(sheet.crop(box)).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {name}")
        portrait.save(target)
        exported, size = export_one(target, 256, "gemini")
        print(f"Installed {target.name} and {exported.name} ({size:,} bytes) from crop {box}")


if __name__ == "__main__":
    main()
