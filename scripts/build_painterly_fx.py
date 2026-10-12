"""Install saved 6x6 sprite atlases from their manifest.

python scripts/build_painterly_fx.py [gouache etching fresco]
python scripts/build_painterly_fx.py --compare
python scripts/build_painterly_fx.py --source src/assets/art/fx_source/world_styles_20261012
python scripts/build_painterly_fx.py --source src/assets/art/fx_source/world_styles_20261012 --characters

Grid detection and magenta removal follow build_mage_drop_fx.py. Preserve each
cell's coordinates instead of centring its alpha bounds: falling/impact sprites
and face-clearing buffs depend on those coordinates.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import build_mage_drop_fx as base

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/styles_20261012"
OUT = ROOT / "src/assets/art/fx/skills"


def grid_cells(rgb: np.ndarray, count: int) -> list[tuple[int, int, int, int]]:
    dark = rgb.max(axis=2) < 60

    def spans(mask: np.ndarray) -> list[tuple[int, int]]:
        length = len(mask)
        lines = base.runs(mask)
        result = []
        start = 0
        for a, b in lines:
            if a - start > length / count * 0.4:
                result.append((start, a))
            start = b
        if length - start > length / count * 0.4:
            result.append((start, length))
        if len(result) != count:
            raise ValueError(f"Expected {count} cells; found {len(result)} spans: {result}")
        if any(not 0.65 * length / count < b - a < 1.35 * length / count for a, b in result):
            raise ValueError(f"Uneven grid: {result}")
        return result

    rows = spans(dark.mean(axis=1) > 0.90)
    cols = spans(dark.mean(axis=0) > 0.90)
    return [(y0, y1, x0, x1) for y0, y1 in rows for x0, x1 in cols]


def install(styles: list[str], manifest: dict) -> None:
    # Validate the whole requested set before writing any runtime asset.
    pending = {}
    for style in styles:
        if style not in manifest["styles"]:
            raise ValueError(f"Unknown style: {style}")
        for sheet in manifest["sheets"]:
            path = SOURCE / f"sheet_{style}_{sheet['id']}.png"
            rgb = np.asarray(Image.open(path).convert("RGB"))
            cells = grid_cells(rgb, manifest["grid"])
            for entry, (y0, y1, x0, x1) in zip(sheet["cells"], cells):
                inset = max(2, round(min(y1 - y0, x1 - x0) * 0.02))
                cell = rgb[y0 + inset:y1 - inset, x0 + inset:x1 - inset]
                rgba = Image.fromarray(base.key(cell))
                sprite = rgba.convert("RGBa").resize((base.SIZE, base.SIZE), Image.Resampling.LANCZOS).convert("RGBA")
                # Same 5% edge feather as build_advance_fx.py: broad advanced
                # gestures must not flash a square edge where the cell ends.
                pixels = np.asarray(sprite).copy()
                edge = np.arange(base.SIZE)
                ramp = np.clip(np.minimum(edge, edge[::-1]) / (base.SIZE * 0.05), 0, 1)
                pixels[..., 3] = (pixels[..., 3] * np.minimum.outer(ramp, ramp)).astype(np.uint8)
                sprite = Image.fromarray(pixels)
                alpha = np.asarray(sprite)[..., 3]
                coverage = (alpha > 16).mean()
                if not 0.01 < coverage < 0.82:
                    raise ValueError(f"{entry['file']}_{style}: invalid coverage {coverage:.3f}")
                corners = alpha[np.ix_([0, -1], [0, -1])]
                if corners.max() > 16:
                    raise ValueError(f"{entry['file']}_{style}: opaque corner / possible grid residue")
                pending[f"{entry['file']}_{style}"] = sprite
    OUT.mkdir(parents=True, exist_ok=True)
    for name, sprite in pending.items():
        sprite.save(OUT / f"{name}.webp", "WEBP", quality=90, alpha_quality=100, method=4)
    print(f"Installed {len(pending)} sprites ({len(styles)} styles)")


def compare(manifest: dict) -> None:
    examples = ["war_bash", "war_ironskin", "mag_fireball", "mag_iceblast", "mag_lightning", "arc_snipe", "pri_heal", "war_whirlwind", "mag_meteor"]
    styles = {"portrait": "초상", "ink": "수묵", "pen": "펜화", "charcoal": "목탄", "oil": "유화"}
    styles.update({key: spec["ko"] for key, spec in manifest["styles"].items()})
    width, label, row_height = 112, 156, 108
    board = Image.new("RGB", (label + width * len(styles), 44 + row_height * len(examples)), "#0e0e14")
    draw = ImageDraw.Draw(board)
    font_path = Path("C:/Windows/Fonts/malgun.ttf")
    font = ImageFont.truetype(str(font_path), 14) if font_path.exists() else ImageFont.load_default()
    for i, (style, title) in enumerate(styles.items()):
        draw.text((label + i * width + width / 2, 14), title, font=font, anchor="mt", fill="#c2beca")
        for j, file in enumerate(examples):
            suffix = "" if style == "portrait" else f"_{style}"
            with Image.open(OUT / f"{file}{suffix}.webp") as image:
                thumb = image.convert("RGBA").resize((96, 96), Image.Resampling.LANCZOS)
            board.paste(thumb, (label + i * width + 8, 44 + j * row_height), thumb)
    for j, file in enumerate(examples):
        draw.text((8, 44 + j * row_height + 40), file, fill="#aaa6b3", font=font)
    path = SOURCE / "compare.png"
    board.save(path)
    print(path)


def character_compare(manifest: dict) -> None:
    """Compare the effects at game scale on the existing, unmodified faces."""
    examples = [
        ("war_bash", "gpt/hero/warrior_5.webp", 0.5),
        ("war_ironskin", "gpt/hero/warrior_5.webp", 0.5),
        ("mag_fireball", "gemini/monster/1102.webp", 0.5),
        ("mag_iceblast", "gemini/monster/1102.webp", 0.87),
        ("mag_lightning", "gemini/monster/1102.webp", 0.9),
        ("arc_snipe", "gemini/monster/1102.webp", 0.5),
        ("pri_heal", "gpt/hero/warrior_5.webp", 0.5),
        ("war_whirlwind", "gemini/monster/1102.webp", 0.5),
        ("mag_meteor", "gemini/monster/1102.webp", 0.82),
    ]
    styles = {"portrait": "기존"}
    styles.update({key: spec["ko"] for key, spec in manifest["styles"].items()})
    width, label, row_height = 144, 160, 152
    board = Image.new("RGBA", (label + width * len(styles), 42 + row_height * len(examples)), "#121014")
    draw = ImageDraw.Draw(board)
    font_path = Path("C:/Windows/Fonts/malgun.ttf")
    font = ImageFont.truetype(str(font_path), 14) if font_path.exists() else ImageFont.load_default()
    for i, (style, title) in enumerate(styles.items()):
        draw.text((label + i * width + width / 2, 14), title, font=font, anchor="mt", fill="#c9c1b6")
        for j, (file, face, ay) in enumerate(examples):
            x, y = label + i * width + 24, 42 + j * row_height + 36
            with Image.open(ROOT / "src/assets/art/faces" / face) as image:
                portrait = image.convert("RGBA").resize((96, 96), Image.Resampling.LANCZOS)
            board.alpha_composite(portrait, (x, y))
            suffix = "" if style == "portrait" else f"_{style}"
            with Image.open(OUT / f"{file}{suffix}.webp") as image:
                sprite = image.convert("RGBa").resize((100, 100), Image.Resampling.LANCZOS).convert("RGBA")
            board.alpha_composite(sprite, (x - 2, round(y + 48 - ay * 100)))
    for j, (file, _, _) in enumerate(examples):
        draw.text((8, 42 + j * row_height + 80), file, fill="#b2a9a1", font=font)
    path = SOURCE / "character_compare.png"
    board.convert("RGB").save(path)
    print(path)


def main() -> None:
    global SOURCE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("styles", nargs="*")
    parser.add_argument("--compare", action="store_true")
    parser.add_argument("--characters", action="store_true", help="Compare on actual game portraits")
    parser.add_argument("--source", type=Path, help="An alternate atlas folder, relative to the repository")
    args = parser.parse_args()
    if args.source:
        SOURCE = (ROOT / args.source).resolve()
        if ROOT.resolve() not in SOURCE.parents:
            raise ValueError("The source folder must stay inside this repository")
    manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    if args.characters:
        character_compare(manifest)
    elif args.compare:
        compare(manifest)
    else:
        install(args.styles or list(manifest["styles"]), manifest)


if __name__ == "__main__":
    main()
