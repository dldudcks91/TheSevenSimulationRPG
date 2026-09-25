"""Apply original-reference 3x3 Naga cells in Chapter 2 Stage 4.

Cell 1 = warrior 2401, cell 6 = shaman 2402, cell 2 = mage 2403.
Requires Pillow. Changed files are backed up once.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEET = FACES / "source/sheets/source_sheet_ch2_st4_naga_original_expanded_3x3.png"
READY = FACES / "source/ready/monster"
GAME = FACES / "cartoon/monster"
CHAPTER = FACES / "source/chapters/ch2_st4.png"
BACKUP = FACES / "source/_scratch/ch2_st4_naga_before_original_expanded"
STAGED = ROOT / "output/ch2_st4_naga_original_selected"
SELECTED = {
    2401: (0, 0, 672, 672),         # 1: top left, original Naga Warrior
    2402: (1376, 688, 2048, 1360),  # 6: middle right, Naga Shaman
    2403: (688, 0, 1360, 672),       # 2: top middle, original Naga Mage
}
CHAPTER_POSITIONS = {2401: (0, 0), 2402: (1035, 0), 2403: (0, 1035)}


def key_green(tile: Image.Image) -> Image.Image:
    """Remove the flat green background and its antialiased green fringe."""
    keyed = tile.convert("RGBA")
    pixels = []
    source_pixels = (
        keyed.get_flattened_data()
        if hasattr(keyed, "get_flattened_data")
        else keyed.getdata()
    )
    for r, g, b, old_alpha in source_pixels:
        excess = g - max(r, b)
        if excess <= 40:
            alpha = 255
        elif excess >= 120:
            alpha = 0
        else:
            alpha = round((120 - excess) * 255 / 80)
        if excess > 0:
            g = max(r, b)
        pixels.append((r, g, b, min(old_alpha, alpha)))
    keyed.putdata(pixels)
    return keyed


def chapter_cell(portrait: Image.Image) -> Image.Image:
    """Match the chapter preview's 74% shoulder width and bottom alignment."""
    portrait = portrait.convert("RGBA")
    mask = portrait.getchannel("A").point(lambda value: 255 if value > 40 else 0)
    box = mask.getbbox()
    if box is None:
        raise ValueError("Empty portrait")
    shoulder = max(
        mask.crop((0, y, mask.width, y + 1)).histogram()[255]
        for y in range(mask.height)
    )
    crop = portrait.crop(box)
    scale = 1013 * 0.74 / shoulder
    width = round(crop.width * scale)
    height = round(crop.height * scale)
    sized = crop.convert("RGBa").resize((width, height), Image.Resampling.LANCZOS).convert("RGBA")
    cell = Image.new("RGBA", (1013, 1013), (0, 0, 0, 0))
    cell.paste(sized, ((1013 - width) // 2, 1013 - height))
    return cell


def refresh_chapter_sheet() -> None:
    """Replace the three Naga cells; leave the boss cell intact."""
    if not CHAPTER.is_file():
        raise FileNotFoundError(CHAPTER)
    backup = BACKUP / "chapters" / CHAPTER.name
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(CHAPTER, backup)
    with Image.open(CHAPTER) as opened:
        chapter = opened.convert("RGB")
    if chapter.size != (2048, 2048):
        raise ValueError(f"Unexpected chapter sheet size: {chapter.size}")
    for monster_id, (x, y) in CHAPTER_POSITIONS.items():
        with Image.open(READY / f"{monster_id}.png") as opened:
            figure = chapter_cell(opened)
        tile = Image.new("RGBA", (1013, 1013), "#00FF00")
        tile.alpha_composite(figure)
        chapter.paste(tile.convert("RGB"), (x, y))
    chapter.save(CHAPTER)
    print(f"Updated {CHAPTER}")


def main() -> None:
    with Image.open(SHEET) as opened:
        sheet = opened.convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"Unexpected Naga sheet size: {sheet.size}")
    if sheet.getpixel((675, 675))[:3] != (0, 0, 0):
        raise ValueError("Expected black dividers between the 672 px tiles")

    STAGED.mkdir(parents=True, exist_ok=True)
    for monster_id, box in SELECTED.items():
        tile = sheet.crop(box)
        portrait = key_green(tile).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        portrait.save(STAGED / f"{monster_id}.png")
        print(f"Prepared {monster_id}: crop {box}")

    for monster_id in SELECTED:
        current_png = READY / f"{monster_id}.png"
        current_webp = GAME / f"{monster_id}.webp"
        for original, group in ((current_png, "ready"), (current_webp, "cartoon")):
            if not original.is_file():
                raise FileNotFoundError(original)
            backup = BACKUP / group / original.name
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                shutil.copy2(original, backup)
        shutil.copy2(STAGED / f"{monster_id}.png", current_png)
        exported, size = export_one(current_png, 256)
        print(f"Applied {current_png} and {exported} ({size:,} bytes)")
    refresh_chapter_sheet()


if __name__ == "__main__":
    main()
