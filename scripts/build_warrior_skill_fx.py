"""Install the eight generated warrior effects and create a review sheet.

Requires Pillow. Run from the repository root:
    python scripts/build_warrior_skill_fx.py

The generated alpha and colors are preserved. Only framing, resolution and
WebP encoding change. Unrelated effect sprites and skill icons are untouched.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/warrior_basic_20261005"
OUT = ROOT / "src/assets/art/fx/skills"
SIZE = 384
BACKGROUND = (22, 22, 36)


def normalize(path: Path) -> Image.Image:
    with Image.open(path) as original:
        rgba = original.convert("RGBA")
    alpha = rgba.getchannel("A")
    if alpha.getextrema() != (0, 255):
        raise ValueError(f"Effect needs transparent background and opaque artwork: {path}")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"Empty effect: {path}")
    crop = rgba.crop(bbox)
    scale = round(SIZE * .86) / max(crop.size)
    crop = crop.resize(tuple(max(1, round(v * scale)) for v in crop.size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE))
    canvas.paste(crop, ((SIZE - crop.width) // 2, (SIZE - crop.height) // 2))
    return canvas


def review_sheet(rows: list[dict], sprites: dict[str, Image.Image]) -> None:
    sheet = Image.new("RGB", (1280, 840), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    font_path = Path("C:/Windows/Fonts/malgun.ttf")
    title = ImageFont.truetype(str(font_path), 20) if font_path.exists() else ImageFont.load_default()
    small = ImageFont.truetype(str(font_path), 14) if font_path.exists() else ImageFont.load_default()
    with Image.open(ROOT / "src/assets/art/faces/gpt/hero/warrior_1.webp") as image:
        portrait = image.convert("RGBA").resize((101, 101), Image.Resampling.LANCZOS)
    for index, row in enumerate(rows):
        x, y = index % 4 * 320, index // 4 * 420
        sid = row["skill_id"]
        rgba = sprites[sid]
        large = rgba.resize((220, 220), Image.Resampling.LANCZOS)
        sheet.paste(large, (x + 50, y + 10), large)
        draw.text((x + 18, y + 238), row["name_kr"], font=title, fill=(216, 217, 230))
        draw.text((x + 18, y + 268), sid, font=small, fill=(168, 177, 194))
        for column, size in enumerate((85, 101)):
            px = x + 28 + column * 154
            draw.rounded_rectangle((px - 7, y + 296, px + 108, y + 411), radius=6, fill=(34, 34, 52))
            sheet.paste(portrait, (px, y + 303), portrait)
            effect = rgba.resize((size, size), Image.Resampling.LANCZOS)
            sheet.paste(effect, (px + (101 - size) // 2, y + 303 + (101 - size) // 2), effect)
            draw.text((px + 22, y + 391), f"{size}px", font=small, fill=(216, 217, 230))
    sheet.save(SOURCE / "preview.png")


def main() -> None:
    with (ROOT / "src/data/skill.csv").open(encoding="utf-8-sig", newline="") as handle:
        rows = [r for r in csv.DictReader(handle) if r["owner_kind"] == "job" and r["owner_id"] == "warrior"]
    manifest = json.loads((SOURCE / "prompts.json").read_text(encoding="utf-8"))
    if {r["skill_id"] for r in rows} != {r["id"] for r in manifest["skills"]}:
        raise ValueError("Warrior skill list changed; review effects against current code")
    prepared = {r["skill_id"]: normalize(SOURCE / f"{r['skill_id']}.png") for r in rows}
    OUT.mkdir(parents=True, exist_ok=True)
    measurements = []
    for sid, rgba in prepared.items():
        path = OUT / f"{sid}.webp"
        rgba.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        with Image.open(path) as installed:
            installed.load()
            assert installed.size == (SIZE, SIZE)
            alpha = installed.getchannel("A")
            assert all(alpha.getpixel(p) == 0 for p in ((0, 0), (SIZE - 1, 0), (0, SIZE - 1), (SIZE - 1, SIZE - 1)))
        bbox = alpha.getbbox()
        measurements.append({"skill_id": sid, "size": [SIZE, SIZE], "alpha_bbox": list(bbox), "content_pct": round(max(bbox[2] - bbox[0], bbox[3] - bbox[1]) / SIZE * 100, 1), "webp_bytes": path.stat().st_size})
    (SOURCE / "measurements.json").write_text(json.dumps(measurements, indent=2) + "\n", encoding="utf-8")
    review_sheet(rows, prepared)
    print(json.dumps(measurements, indent=2))


if __name__ == "__main__":
    main()
