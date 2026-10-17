"""Prepare/export the retained clean pixel style and share alpha-aware atlas export.

Generation uses the built-in imagegen tool. This script only writes prompts,
crops equal atlas cells, preserves their alpha, and exports runtime WebP files.
Run --prepare before generation, then run without arguments to install.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/clean_20261017"
OUT = ROOT / "src/assets/art/fx/skills"
STYLES = {
    "pixel2d": {
        "ko": "클린 도트",
        "en": "Clean Pixel",
        "description": "Clean premium 2D pixel-animation combat VFX inspired by the clarity of modern Korean retro mobile RPGs. Each effect is designed on a strict 64x64 logical pixel grid, enlarged with crisp nearest-neighbor pixel edges. Deliberate coherent pixel clusters, precise stepped curves, 3-4 colors per effect, no dithering, no single-pixel noise, no blur or smooth antialiasing. Broad simple silhouettes and spare spark clusters. Bright clear elemental colors balanced for dark backgrounds. Fluid modern pixel animation keyframe, not 3D voxel art, not a smooth illustration with a pixel filter."
    }
}

COMMON = """Use case: stylized-concept.
Asset type: actual transparent 2D RPG combat VFX sprite atlas, to crop into individual effects displayed over 90px portraits.
Primary request: draw a coherent NEW atlas in the following specific direction.
STYLE: {description}

LAYOUT IS CRITICAL: square canvas, ideally 3072x3072 pixels, exactly SIX equal columns and SIX equal rows, 36 invisible equal square cells. NO grid lines, NO panels, NO frames, NO labels or text. Render on genuinely transparent alpha background, including all empty space inside each effect. No colored backdrop, no fake checkerboard, no black background. Each sprite must be entirely inside its own cell with at least 8% clear margin on all four edges. The cells must never touch each other. Keep the cells on a precise regular SIX BY SIX grid across the entire canvas.

Every cell is one fleeting combat action, not an item icon. Slashes are energy strokes, not swords. Buffs and heals frame an EMPTY central half, so the underlying face remains visible. Ordinary effects use at most 6 large shapes. Advanced BIG effects use one additional layer, not intricate texture. Use a strong readable silhouette rather than many details. Fall tips and low impacts keep their specified positions within their OWN cell. Do not recenter a low effect. Preserve the precise count, direction, shape and meaning of each cell.
Element palettes: physical = pale steel blue-gray; fire = warm orange and golden yellow; ice = cyan and pale blue; lightning = gold and pale yellow; holy = cream gold; poison = clear olive green; healing = sage green; blood = restrained crimson; earth = ochre; arcane = blue; shadow = slate teal. Clean fresh midtones, small bright highlights. NO texture, scratches, grain, painterly daubs, ink wash, dark cartoon roughness, scattered confetti, scenery, characters, UI icons, text or watermark. No opaque or translucent rectangular cell backgrounds. Fully transparent space around each individual sprite.

REFERENCE ROLE, when present: an earlier sheet in this same new direction is only a rendering reference. Generate the DIFFERENT actions listed below, in the exact row/column positions. Disregard any old medium/brush/ink/painting words in cell descriptions; they only specify the action geometry.

CELL CONTENTS, read left to right and top to bottom:
"""


def prepare() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    previous = json.loads((ROOT / "src/assets/art/fx_source/world_styles_20261012/manifest.json").read_text(encoding="utf-8"))
    active = set(re.findall(r"file: '([^']+)'", (ROOT / "src/ui/skill_art.js").read_text(encoding="utf-8")))
    # Keep the established sheet positions, including seven retired cells, so
    # the old content specifications remain directly auditable. Export active only.
    for sheet in previous["sheets"]:
        entries = sheet["cells"] + [{"content": "EMPTY: fully transparent, no sprite."}] * (36 - len(sheet["cells"]))
        body = "\n".join(f"Row {i // 6 + 1}, column {i % 6 + 1}: {entry['content']}" for i, entry in enumerate(entries))
        for style, spec in STYLES.items():
            (SOURCE / f"prompt_{style}_{sheet['id']}.txt").write_text(COMMON.format(description=spec["description"]) + body + "\n", encoding="utf-8")
    manifest = {"date": "2026-10-17", "mode": "built-in imagegen", "grid": 6, "styles": STYLES, "sheets": previous["sheets"], "active_files": sorted(active)}
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(STYLES)} directions, {len(active)} active sprites each, 3 atlas prompts.")


def cell_boundaries(alpha: np.ndarray, axis: int, search_fraction: float = .20) -> list[int]:
    """Find transparent gutters near the intended six equal grid boundaries.

    Generated sheets can drift a few pixels from an exact grid, particularly
    on the last sheet with empty bottom rows. Only crop coordinates change;
    never recenter the artwork inside a cell or discard its alpha.
    """
    projection = (alpha > 224).mean(axis=axis)
    length = len(projection)
    step = length / 6
    smoothed = np.convolve(projection, np.ones(5) / 5, mode="same")
    cuts = [0]
    for index in range(1, 6):
        intended = round(index * step)
        lo, hi = round(intended - search_fraction * step), round(intended + search_fraction * step)
        values = smoothed[lo:hi]
        candidates = np.flatnonzero(values <= values.min() + .004) + lo
        cuts.append(int(candidates[np.argmin(abs(candidates - intended))]))
    cuts.append(length)
    return cuts


def install(styles: list[str], manifest: dict) -> None:
    pending = {}
    report = []
    active = set(manifest["active_files"])
    for style in styles:
        for sheet in manifest["sheets"]:
            path = SOURCE / f"sheet_{style}_{sheet['id']}.png"
            atlas = Image.open(path).convert("RGBA")
            w, h = atlas.size
            if abs(w - h) > 6 or atlas.getextrema()[3][0] != 0:
                raise ValueError(f"{path.name}: expected square atlas with transparent space, got {atlas.size} alpha={atlas.getextrema()[3]}")
            alpha_atlas = np.asarray(atlas)[..., 3]
            columns = cell_boundaries(alpha_atlas, 0)
            rows = cell_boundaries(alpha_atlas, 1, sheet.get("row_search_fraction", .20))
            for i, entry in enumerate(sheet["cells"]):
                if entry["file"] not in active:
                    continue
                x, y = i % 6, i // 6
                if manifest.get("row_local_gutters"):
                    columns = cell_boundaries(alpha_atlas[rows[y]:rows[y + 1]], 0)
                inset = max(1, round(min(columns[x + 1] - columns[x], rows[y + 1] - rows[y]) * .02))
                bounds = (columns[x], rows[y], columns[x + 1], rows[y + 1])
                box = (bounds[0] + inset, bounds[1] + inset, bounds[2] - inset, bounds[3] - inset)
                cell = atlas.crop(box)
                cut_alpha = np.asarray(cell)[..., 3]
                cut_edge = np.concatenate([cut_alpha[0], cut_alpha[-1], cut_alpha[:, 0], cut_alpha[:, -1]])
                # Trim border haze only when the trim leaves solid art intact.
                if (cut_edge > 224).mean() > .10 or (cut_alpha > 16).mean() >= .79:
                    box = bounds
                    cell = atlas.crop(box)
                resample = Image.Resampling.NEAREST if style == "pixel2d" else Image.Resampling.LANCZOS
                sprite = cell.convert("RGBa").resize((256, 256), resample).convert("RGBA")
                alpha = np.asarray(sprite)[..., 3]
                coverage = float((alpha > 16).mean())
                edge = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
                if box != bounds and (coverage >= .79 or (edge > 224).mean() > .10):
                    box = bounds
                    sprite = atlas.crop(box).convert("RGBa").resize((256, 256), resample).convert("RGBA")
                    alpha = np.asarray(sprite)[..., 3]
                    coverage = float((alpha > 16).mean())
                    edge = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
                # A faint energy halo may reach a cell edge; reject solid
                # artwork crossing the cut, rather than low-alpha glow.
                if not .005 < coverage < .80 or float((edge > 224).mean()) > .10:
                    raise ValueError(f"{entry['file']}_{style}: invalid coverage or cell overlap: {coverage:.4f}, solid edge={(edge > 224).mean():.4f}, box={box}")
                name = f"{entry['file']}_{style}"
                pending[name] = sprite
                report.append({"file": name, "crop": box, "coverage": round(coverage, 4), "solid_edge_coverage": round(float((edge > 224).mean()), 4)})
    OUT.mkdir(parents=True, exist_ok=True)
    for name, sprite in pending.items():
        sprite.save(OUT / f"{name}.webp", "WEBP", quality=92, alpha_quality=100, method=4)
    (SOURCE / "export_report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Installed {len(pending)} genuinely transparent sprites ({len(styles)} styles).")


def compare(manifest: dict) -> None:
    examples = [("war_bash", "베기"), ("war_ironskin", "보호"), ("mag_fireball", "화염"), ("mag_iceblast", "냉기"), ("mag_lightning", "번개"), ("arc_snipe", "화살"), ("pri_heal", "회복"), ("war_whirlwind", "회전"), ("mag_meteor", "메테오")]
    styles = {"darktoon": {"ko": "다크 카툰"}, "ink": {"ko": "수묵"}, **manifest["styles"]}
    width, row_height, label = 144, 116, 84
    board = Image.new("RGB", (label + len(styles) * width, 52 + len(examples) * row_height), "#10141d")
    draw = ImageDraw.Draw(board)
    font = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 15)
    for col, (style, spec) in enumerate(styles.items()):
        draw.text((label + col * width + width / 2, 15), spec["ko"], font=font, anchor="mt", fill="#dddde4")
        for row, (file, title) in enumerate(examples):
            sprite = Image.open(OUT / f"{file}_{style}.webp").convert("RGBA")
            sprite.thumbnail((100, 100), Image.Resampling.NEAREST if style == "pixel2d" else Image.Resampling.LANCZOS)
            board.paste(sprite, (label + col * width + 22, 52 + row * row_height), sprite)
            if col == 0:
                draw.text((10, 90 + row * row_height), title, font=font, fill="#b9bdc8")
    board.save(SOURCE / "compare.png")
    print(SOURCE / "compare.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--compare", action="store_true")
    parser.add_argument("styles", nargs="*", metavar="STYLE")
    args = parser.parse_args()
    if any(style not in STYLES for style in args.styles):
        parser.error("Unknown style; choose from " + ", ".join(STYLES))
    if args.prepare:
        prepare()
    else:
        manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
        if args.compare:
            compare(manifest)
        else:
            install(args.styles or list(STYLES), manifest)
