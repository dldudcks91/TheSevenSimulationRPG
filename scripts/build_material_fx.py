"""Prepare and export five distinct material styles using built-in imagegen.

python scripts/build_material_fx.py --prepare
python scripts/build_material_fx.py [papercut pastel foil riso clay]
python scripts/build_material_fx.py --compare

Generation is performed by the built-in tool. Export only crops, resizes and
encodes the generated transparent artwork; it never synthesizes a new style.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import build_clean_fx as atlas

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/material_20261017"
OUT = ROOT / "src/assets/art/fx/skills"
STYLES = {
    "papercut": {
        "ko": "종이 콜라주", "en": "Paper Collage",
        "description": "Hand-cut layered colored paper collage. Every energy stroke is assembled from 2-3 broad overlapping pieces of matte construction paper. Clearly visible irregular scissor-cut edges, tiny torn fibers, paper grain and shallow contact shadows BETWEEN paper layers only. Broad flat desaturated colors, offset cream paper highlights, no contour ink lines. Bold angular cutout silhouettes and handmade asymmetry. It must look unmistakably like a paper craft illustration, not polished luminous game VFX, not pixels. Preserve action geometry while simplifying interior details into large paper planes.",
    },
    "pastel": {
        "ko": "오일 파스텔", "en": "Oil Pastel",
        "description": "Expressive hand-drawn OIL PASTEL illustration, with thick waxy crayon strokes, dense broken pigment, blunt uneven edges and visible cross-scribbled color. Each shape is drawn using just 2-3 chunky overlapping pastel marks. Strong broad gestures and rough cream highlights. The texture must be visible at thumbnail size. No smooth airbrush, no digital glow, no ink contours, no pixel edges, no watercolor wash. Dry opaque wax pigment suspended on genuine transparent space; no sheet of paper or rectangular support behind it.",
    },
    "foil": {
        "ko": "금속박", "en": "Metal Foil",
        "description": "Embossed metallic foil illustration, as if energy silhouettes were pressed into thin colored metal foil and cut free. Broad flat planes, crinkled brushed-metal microtexture, narrow bevels, crisp specular glints and dark recessed grooves. Predominantly silver for physical and ice, copper-orange for fire, gold for holy and lightning, oxidized green metal for healing and poison, burgundy metal for blood. Shallow embossed relief, NOT voluminous sculpted toys. The finish must read as reflective metal leaf even at thumbnail size. No luminous neon cores, no black cartoon outlines, no magical haze, no paper backdrop.",
    },
    "riso": {
        "ko": "리소 인쇄", "en": "Riso Print",
        "description": "Bold handmade two-ink RISOGRAPH screenprint illustration. Absolutely flat graphic silhouettes, very coarse visible halftone dots and stippled ink coverage INSIDE each shape, with a deliberate small color-registration offset at edges. Each effect uses one elemental hue plus warm cream and a limited dark accent. Strong editorial poster drawing, blunt irregular printed edges, asymmetric ink overlap, transparent holes through sparse dot patterns. The coarse dot clusters and offset color plates must be visible at small size. No smooth shading, no gradients, no glow, no 3D bevels, no cartoon contour, no backing paper or rectangle.",
    },
    "clay": {
        "ko": "클레이", "en": "Clay",
        "description": "Hand-sculpted colored modeling-clay stop-motion illustration. Every energy stroke is a slightly thick rounded clay ribbon, with soft lumpy handmade edges, subtle thumb impressions, shallow tool grooves, matte tactile surfaces and simple broad studio-lit shading. Rounded tips replace needle-sharp glowing tips while keeping the same motion silhouette. Detached motes are little clay pellets. Desaturated elemental colors with a small cream clay highlight. Clearly a miniature plasticine craft, never shiny metal, paper, flat digital VFX, pixel art or glowing magic. No cast shadow on an imaginary floor, no support plane or backdrop.",
    },
}

COMMON = """Use case: style-transfer.
Asset type: transparent combat-effect sprite atlas for The Seven Simulation RPG.
Primary request: REDRAW every effect in the reference atlas using the following illustration medium. This must be a radically different drawing style, not a color adjustment or filter on the old drawing.
STYLE / MATERIAL: {description}

Input image 1 is a GEOMETRY MAP ONLY: preserve its EXACT SIX columns by SIX rows, sprite-to-cell correspondence, action directions, main silhouettes, element colors and empty centers. Do NOT copy its glossy pixel rendering. If a second reference is supplied, it shows ONLY the desired new medium; its cell contents must not replace the geometry map.
Square atlas, 3072x3072 if possible. Exactly 36 INVISIBLE equal square cells. No outlines around cells, no labels, text or borders. Each sprite must fit inside its own cell with 10% entirely transparent margin on every edge. Draw slightly smaller than the reference to keep generous gutters. No sprite may touch a neighbor.
Genuinely transparent alpha everywhere outside the effect strokes, including hollow centers. No colored background, checkerboard, floor, rectangular paper, panel or shared shadow. Buffs and heals leave the central half open for the portrait. Keep falling tips and low landing impacts at their listed positions; never recenter them. All effects share the same strong readable action shapes across styles. Texture belongs INSIDE the strokes only.
Palettes: physical steel gray, fire orange/ochre, ice pale blue, lightning yellow, holy cream/gold, healing sage, poison olive, shadow dark teal, blood burgundy, earth brown. Avoid unnecessary changes to shape or new ornament. No characters, UI badges, lettering or watermarks.
Precise cell contents, left to right and top to bottom:
"""


def prepare() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    previous = json.loads((ROOT / "src/assets/art/fx_source/clean_20261017/manifest.json").read_text(encoding="utf-8"))
    active = sorted(set(re.findall(r"file: '([^']+)'", (ROOT / "src/ui/skill_art.js").read_text(encoding="utf-8"))))
    manifest = {"date": "2026-10-17", "mode": "built-in imagegen", "grid": 6, "styles": STYLES,
                "sheets": previous["sheets"], "active_files": active,
                "geometry_reference": "../clean_20261017/sheet_pixel2d_<sheet>.png", "row_local_gutters": True}
    # The final atlas has only four occupied rows. Its generated gutters drift
    # further from a six-row template, so search a wider transparent interval.
    for sheet in manifest["sheets"]:
        if sheet["id"] == "03":
            sheet["row_search_fraction"] = .30
    for sheet in manifest["sheets"]:
        entries = sheet["cells"] + [{"content": "EMPTY: entirely transparent, no drawing."}] * (36 - len(sheet["cells"]))
        body = "\n".join(f"Row {i // 6 + 1}, column {i % 6 + 1}: {entry['content']}" for i, entry in enumerate(entries))
        for style, spec in STYLES.items():
            (SOURCE / f"prompt_{style}_{sheet['id']}.txt").write_text(COMMON.format(description=spec["description"]) + body + "\n", encoding="utf-8")
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    preserved = [p for p in OUT.glob("*.webp") if p.stem.rsplit("_", 1)[-1] in {"darktoon", "ink", "pixel2d"}]
    snapshot = {str(p.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(preserved)}
    (SOURCE / "preserved_sha256.json").write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared 15 atlas prompts, {len(active)} sprites per style; snapshotted {len(snapshot)} preserved sprites.")


def compare(manifest: dict) -> None:
    styles = {"pixel2d": {"ko": "클린 도트"}, "darktoon": {"ko": "다크 카툰"}, "ink": {"ko": "수묵"}, **manifest["styles"]}
    examples = [("war_bash", "베기"), ("war_ironskin", "보호"), ("mag_fireball", "화염"), ("mag_iceblast", "냉기"), ("mag_lightning", "번개"), ("arc_snipe", "화살"), ("pri_heal", "회복"), ("war_whirlwind", "회전"), ("mag_meteor", "메테오")]
    width, height, label = 140, 116, 84
    board = Image.new("RGB", (label + len(styles) * width, 48 + len(examples) * height), "#10141d")
    draw = ImageDraw.Draw(board)
    font = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 15)
    for col, (style, spec) in enumerate(styles.items()):
        draw.text((label + col * width + width / 2, 14), spec["ko"], font=font, anchor="mt", fill="#e3e3e8")
        for row, (file, title) in enumerate(examples):
            sprite = Image.open(OUT / f"{file}_{style}.webp").convert("RGBA")
            sprite.thumbnail((100, 100), Image.Resampling.NEAREST if style == "pixel2d" else Image.Resampling.LANCZOS)
            board.paste(sprite, (label + col * width + 20, 48 + row * height), sprite)
            if col == 0:
                draw.text((10, 84 + row * height), title, font=font, fill="#b9bdc8")
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
            atlas.SOURCE = SOURCE
            atlas.install(args.styles or list(STYLES), manifest)
