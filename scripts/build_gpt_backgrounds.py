"""Export the GPT background set and per-chapter review sheets."""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src/assets/art/backgrounds"
SOURCE = ART / "source/gpt"
SIZE = (1376, 615)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chapters", type=int, nargs="+", default=[1, 2, 3, 4, 5])
    args = parser.parse_args()
    if any(ch not in range(1, 6) for ch in args.chapters):
        parser.error("chapters must be between 1 and 5")
    (ART / "gpt").mkdir(exist_ok=True)
    for chapter in args.chapters:
        sheet = Image.new("RGB", (1124, 1412), "#171c24")
        draw = ImageDraw.Draw(sheet)
        for stage in range(1, 6):
            name = f"background_stage_{chapter * 100 + stage}"
            with Image.open(SOURCE / f"{name}.png") as original:
                im = original.convert("RGB")
                height = round(im.width * SIZE[1] / SIZE[0])
                if height > im.height:
                    raise ValueError(f"Source too wide: {name}")
                # Generation reserves the bottom fifth for cropping. Preserve
                # aspect ratio and colors; only export size/format are changed.
                im = im.crop((0, 0, im.width, height)).resize(SIZE, Image.Resampling.LANCZOS)
            destination = ART / "gpt" / f"{name}.webp"
            im.save(destination, "WEBP", quality=92, method=6)
            y = 8 + (stage - 1) * 280
            for col, style in enumerate(("illustrate", "gpt")):
                x = 8 + col * 558
                draw.text((x + 4, y + 4), f"{chapter}-{stage} / {style.upper()}", fill="#e5eaf0")
                with Image.open(ART / style / f"{name}.webp") as picture:
                    sheet.paste(picture.convert("RGB").resize((550, 246), Image.Resampling.LANCZOS), (x, y + 26))
            print(f"{name}: {SIZE}, {destination.stat().st_size:,} bytes")
        sheet.save(SOURCE / f"chapter_{chapter}_comparison.jpg", quality=92)

    all_ids = [chapter * 100 + stage for chapter in range(1, 6) for stage in range(1, 6)]
    if all((ART / "gpt" / f"background_stage_{sid}.webp").exists() for sid in all_ids):
        overview = Image.new("RGB", (2048, 1080), "#171c24")
        draw = ImageDraw.Draw(overview)
        for sid in all_ids:
            x, y = 8 + (sid // 100 - 1) * 408, 8 + (sid % 100 - 1) * 214
            draw.text((x + 4, y + 3), f"{sid // 100}-{sid % 100} / GPT", fill="#e5eaf0")
            with Image.open(ART / "gpt" / f"background_stage_{sid}.webp") as picture:
                overview.paste(picture.convert("RGB").resize((400, 179), Image.Resampling.LANCZOS), (x, y + 25))
        overview.save(SOURCE / "gpt_all_chapters_preview.jpg", quality=92)


if __name__ == "__main__":
    main()
