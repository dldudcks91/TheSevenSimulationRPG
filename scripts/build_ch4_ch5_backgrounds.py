"""Export the selected chapter 4/5 illustrations without altering their PNG sources."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src/assets/art/backgrounds"
IDS = [401, 402, 403, 404, 405, 501, 502, 503, 504, 505]
SIZE = (1376, 615)


def main():
    previews = []
    for stage_id in IDS:
        name = f"background_stage_{stage_id}"
        source = ART / "source/illustrate" / f"{name}.png"
        if not source.exists():
            raise FileNotFoundError(source)
        with Image.open(source) as original:
            # Generation reserves the bottom fifth as empty floor. Keep the
            # upper panorama, preserving aspect ratio and the existing UI size.
            im = original.convert("RGB")
            crop_height = round(im.width * SIZE[1] / SIZE[0])
            if crop_height > im.height:
                raise ValueError(f"Source is too wide for the intended crop: {source}")
            im = im.crop((0, 0, im.width, crop_height))
            im = im.resize(SIZE, Image.Resampling.LANCZOS)
        destination = ART / "illustrate" / f"{name}.webp"
        im.save(destination, "WEBP", quality=92, method=6)
        previews.append((stage_id, im.copy()))
        print(f"{stage_id}: {SIZE[0]}x{SIZE[1]}, {destination.stat().st_size:,} bytes")

    # A review artifact only; the game reads the individual WebP files.
    thumb_size = (550, 246)
    sheet = Image.new("RGB", (1124, 1412), "#171c24")
    draw = ImageDraw.Draw(sheet)
    for index, (stage_id, im) in enumerate(previews):
        column = index // 5
        row = index % 5
        x, y = 8 + column * 558, 8 + row * 280
        draw.text((x + 4, y + 4), f"CHAPTER {stage_id // 100} / STAGE {stage_id % 100}", fill="#e5eaf0")
        sheet.paste(im.resize(thumb_size, Image.Resampling.LANCZOS), (x, y + 26))
    sheet.save(ART / "source/illustrate/ch4_ch5_preview.jpg", quality=92)


if __name__ == "__main__":
    main()
