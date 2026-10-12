"""Prepare effect candidates from The Seven's characters and world.

This writes prompts only. Generate with built-in imagegen, attaching the game
character reference board and battle screenshot; do not attach older effects.
"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/world_styles_20261012"
PREVIOUS = ROOT / "src/assets/art/fx_source/styles_20261012/manifest.json"
STYLES = {
    "darktoon": {
        "ko": "다크 카툰", "en": "Dark Cartoon",
        "description": "DARK FANTASY CARTOON VFX designed for the chunky, grim, strongly silhouetted characters in the attached game reference. Broad angular cel-shaded silhouettes, thick uneven near-black contour, two decisive colour planes and a small crisp highlight. Punchy asymmetric action gestures, rugged armour-like facets, a few large shards. Fire has blunt hooked flame shapes; ice is heavy faceted crystal; lightning is a forceful jagged ribbon; physical hits have a solid curved steel slash and a few crimson flecks. Buffs frame the face with bold sparse symbols. An expressive combat animation drawing: clean intentional shapes, no paper grain, no painterly brush marks or printmaking texture. Darkly heroic, serious, muscular, never cute or a glossy mobile sticker.",
    },
    "cinder": {
        "ko": "강철·잿불", "en": "Steel & Cinder",
        "description": "CLASSIC DARK ACTION-RPG VFX built from the materials of this game's ruined battlefield: cold worn steel, soot, scorched rock and dull embers. Semi-realistic game-sprite volume, strong sculpted silhouettes, chipped chunky fragments, a restrained directional light and a short kinetic trail. Sharp metal edges and rugged surfaces, no drawn contour. Fire is solid burning ember tongues with black charred interiors; ice is heavy translucent-looking crystal rendered as opaque blue facets; lightning is a bright pale-gold core with only one narrow darker rim; physical attacks are cold metallic crescents with rust-crimson impact shards. Holy and healing retain readable subdued gold/green energy. A weighty grounded combat effect, never photorealistic scenery, paint daubs, crosshatching or a softly blurred fog bank. Keep details coarse enough to read at 90px.",
    },
    "ritual": {
        "ko": "고대 주술", "en": "Ancient Ritual",
        "description": "ANCIENT OCCULT FANTASY VFX for this game's severe warlords, hooded mages and goblin shamans. Clean graphic silhouettes made of fractured angular energy ribbons, broken ceremonial arcs, a few bold abstract incisions and sparse pointed sigil fragments. Flat dark inner shapes bounded by a thin desaturated luminous edge; no thick black cartoon contour, no real material shading, no painterly texture. The energy looks forbidden, old and deliberate, with asymmetric broken geometry rather than ornate lace. Preserve each named action: a slash remains a slash, an arrow remains an arrow and an ice shard remains an ice shard; add at most one restrained broken arc or geometric accent within the existing gesture. Never turn every attack into a magic circle. Buffs/heals use sparse incomplete sigil arcs around the empty face centre. No readable alphabet, no text, no pentagram unless the cell explicitly names one, no neon bloom or confetti. Make strong simple marks that survive reduction to 90px.",
    },
}

COMMON = """Use-case: stylized-concept. Make a NEW combat effect atlas for The Seven, a grim fantasy party RPG.

REFERENCE ROLES: character_reference.png shows the actual existing heroes and monsters (visual weight, silhouettes, palette and mood); battle_reference.png shows the actual battlefield atmosphere and contrast. These are CONTEXT references. Make ONLY effect sprites, never characters or background scenery. Design effects that belong alongside these particular characters and this world. Choose the rendering described below independently; do not imitate an ink wash, oil painting, gouache, engraving, fresco, or any previous effect sheet.

EFFECT DIRECTION: {description}

Every effect briefly overlays a portrait about 90px wide on a nearly black battlefield. Strong instantly legible gestures, a few large shapes, limited details, a moderate area of light colour against the dark screen. Rich but restrained colours: steel = pale blue-gray with rust-crimson accents; fire = ember orange with dark red and soot; ice = cold slate/cyan with small pale facets; lightning = pale old gold; holy = bone gold; poison = olive; healing = muted sage; blood = crimson; earth = stone ochre; arcane = desaturated blue; shadow = gray-teal. Tiny highlights are allowed, but no white-out glare, broad glow, bloom, lens flare, glitter or cute icon language. No magenta, pink or purple in the effects. Fully opaque marks, no semi-transparent haze.

LAYOUT: exactly SIX equal columns and SIX equal rows in a SQUARE 6x6 sprite atlas. Five straight pure-black 8px dividing lines in each direction extend across the entire image. No outer border. Solid pure magenta #FF00FF background in every cell. Keep each effect entirely inside its cell, with clear empty space before the black grid. No text, labels, numbering, border decoration or scene. EMPTY cells contain only solid magenta. Follow rows top-to-bottom and columns left-to-right exactly.

The cell descriptions give action, number and composition ONLY: disregard medium, painting, brush, ink, line-width and texture words in them. Ordinary effects stay in the central 85%; BIG advanced skills are grander with one extra large layer but remain inside the cell. FALL tips and IMPACT LOW centres stay at the specified percentage of their OWN cell height. Buff/heal effects leave the central HALF empty so the face remains readable. Do not recenter a low impact. Do not replace the named action with a generic icon.

CELL CONTENTS:
"""


def reference_board() -> None:
    paths = [
        ("gpt/hero/warrior_5.webp", "Warrior"),
        ("gpt/hero/knight_1.webp", "Knight"),
        ("gpt/hero/mage_3.webp", "Mage"),
        ("gpt/hero/priest_1.webp", "Priest"),
        ("gemini/hero/warrior_5.webp", "Warrior / muted"),
        ("gemini/hero/knight_1.webp", "Knight / muted"),
        ("gemini/monster/1102.webp", "Goblin"),
        ("gemini/monster/1301.webp", "Undead"),
    ]
    board = Image.new("RGB", (768, 432), "#111116")
    draw = ImageDraw.Draw(board)
    font = ImageFont.load_default(size=16)
    for i, (file, label) in enumerate(paths):
        with Image.open(ROOT / "src/assets/art/faces" / file) as image:
            thumb = image.convert("RGBA").resize((176, 176), Image.Resampling.LANCZOS)
        x, y = i % 4 * 192 + 8, i // 4 * 216 + 8
        board.paste(thumb, (x, y), thumb)
        draw.text((x, y + 183), label, font=font, fill="#bbb8ad")
    board.save(SOURCE / "character_reference.png")
    shutil.copy2(ROOT / "output/art_style_comparison/battle.png", SOURCE / "battle_reference.png")


def main() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    previous = json.loads(PREVIOUS.read_text(encoding="utf-8"))
    sheets = previous["sheets"]
    for sheet in sheets:
        for cell in sheet["cells"]:
            text = re.sub(r"\b(?:brush|ink)[- ]", "", cell["content"], flags=re.I)
            text = re.sub(r"\bpainted\b", "formed", text, flags=re.I)
            cell["content"] = text
        cells = sheet["cells"] + [{"content": "EMPTY — magenta only."}] * (36 - len(sheet["cells"]))
        body = "\n".join(f"Row {i // 6 + 1}, column {i % 6 + 1}: {cell['content']}" for i, cell in enumerate(cells))
        for style, spec in STYLES.items():
            prompt = COMMON.format(description=spec["description"]) + body + "\n"
            if sheet["id"] != "01":
                prompt = f"ADDITIONAL REFERENCE: sheet_{style}_01.png is the first NEW atlas in this direction. Keep its VFX rendering consistent while generating the different actions below. The game character and battlefield references still determine the world fit.\n\n" + prompt
            (SOURCE / f"prompt_{style}_{sheet['id']}.txt").write_text(prompt, encoding="utf-8")
    manifest = {"date": "2026-10-12", "grid": 6, "styles": STYLES, "sheets": sheets,
                "references": ["character_reference.png", "battle_reference.png"]}
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    reference_board()
    print("Prepared three character/world-based directions, 95 sprites each.")


if __name__ == "__main__":
    main()
