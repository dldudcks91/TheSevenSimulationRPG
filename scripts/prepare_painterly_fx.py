"""Write built-in imagegen prompts for three 6x6 effect atlases per style.

Keep the existing 95 sprite compositions, including low impact positions and
empty buff centres. This prepares text only; it never starts a model or API.
"""

from __future__ import annotations

import json
import re
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INK = ROOT / "src/assets/art/fx_source/ink_20261009"
SOURCE = ROOT / "src/assets/art/fx_source/styles_20261012"
STYLES = {
    "gouache": {
        "ko": "과슈",
        "en": "Gouache",
        "description": "MATTE GOUACHE painted by hand: broad opaque flat pigment shapes, blunt bristle marks, slightly ragged dry edges, two or three restrained colour planes, and a few small pale highlights. A weathered medieval fantasy illustration, visibly handmade, softly chalky but with a strong readable silhouette. No thick black contour and no oil-paint impasto or realistic volumetric rendering.",
    },
    "etching": {
        "ko": "동판화",
        "en": "Etching",
        "description": "HAND-TINTED COPPERPLATE ETCHING from an old dark-fantasy grimoire: confident engraved contour strokes, short coarse parallel hatch lines and sparse cross-hatching cut into bold muted-colour silhouettes. The dark carved lines describe the gesture while dusty hand-applied pigment makes it readable over a nearly black screen. Broad simple forms; hatch lines must survive reduction to 90 pixels. No printed paper rectangle, no woodblock gouges, no tiny filigree, no shiny actual copper objects.",
    },
    "fresco": {
        "ko": "프레스코",
        "en": "Fresco",
        "description": "WEATHERED MEDIEVAL FRESCO painted with mineral pigments: bold flat earthy shapes, softly mottled chalky colour, irregular worn paint edges, restrained chipped patches within the strokes, and a few broad cracked pigment marks. An ancient mural fragment reduced to ONLY the spell's shape, with no wall or plaster slab behind it. Faded terracotta, stone blue, ochre and sage, rough and sombre, with strong medium-value silhouettes and no dark outline. No realistic chunks of masonry and no photorealistic material rendering.",
    },
}

COMMON = """Use-case: stylized-concept. Deliver a production sprite atlas for The Seven, a grim dark-fantasy party RPG. Each sprite flashes over a small portrait about 90px wide on a nearly black battle screen. Keep the action legible immediately, using a few large shapes and subdued medium-value colours.

ART STYLE: {description}

LAYOUT IS CRITICAL: exactly SIX equal columns and SIX equal rows, a square 6x6 grid containing 36 separate square cells. Five straight pure-black dividing lines in each direction, 8 pixels thick, run unbroken from edge to edge. No outer border. Every cell background is solid pure magenta #FF00FF. Effects stay completely inside their own cell, with a visible empty margin before every dividing line. Never merge adjacent pictures. Row order is top to bottom; column order is left to right. No labels, numbers, lettering, caption, characters, portraits, UI, decorative panel, paper rectangle or scenery. Cells explicitly marked EMPTY contain only magenta.

Draw only the named spell gesture or named symbolic object. Preserve the number of objects and their positions. Ignore rendering vocabulary such as brush, ink, chalk, thin lines or glossy inside a cell: the ART STYLE above governs all 36 cells. Fully opaque marks, no translucent haze. No neon, bloom, glow, lens flare, glitter, floating confetti, cute sticker look or perfect comic starburst. Nothing in the effect itself may be magenta, pink or purple.

Palette: physical = cool light steel gray with restrained dull crimson; fire = muted terracotta orange and a little ochre; ice = stone/slate blue with pale cold highlights; lightning and holy = dusty pale gold; poison = olive green; earth = ochre brown; blood = dark crimson; arcane = muted blue; healing/wind = sage green; shadow = medium-value slate gray. Effects must be visible on dark backgrounds without glaring.

For ordinary cells keep the content inside the central 85%. BIG means an advanced skill: a grander gesture with one extra layer, still inside the cell. FALL means the tip is LOW, at the specified percentage of the cell height, with the trail reaching upward. IMPACT LOW stays centred at the specified low height; do not recenter it. Buff/heal effects leave the central half of the cell empty so a face remains visible. All percentages refer to each individual cell, never the whole atlas.

CELL CONTENTS:
"""


def main() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    picks = runpy.run_path(str(INK / "picks.py"))["PICKS"]
    entries = []
    for file, (sheet, cell) in picks.items():
        lines = (INK / f"prompt_{sheet}.txt").read_text(encoding="utf-8").splitlines()
        text = next(line.split(". ", 1)[1] for line in lines if line.startswith(f"{cell}. "))
        text = re.sub(r"\bbrush\s+", "", text)
        text = re.sub(r"\bink[- ](?=splash|flecks|blood|burst)", "", text)
        entries.append({"file": file.removesuffix("_ink"), "content": text})
    manifest = {"date": "2026-10-12", "grid": 6, "styles": STYLES, "sheets": []}
    for start in range(0, len(entries), 36):
        batch = entries[start:start + 36]
        sheet_id = f"{start // 36 + 1:02d}"
        manifest["sheets"].append({"id": sheet_id, "cells": batch})
        cells = batch + [{"content": "EMPTY — solid magenta, no effect."}] * (36 - len(batch))
        body = "\n".join(f"Row {i // 6 + 1}, column {i % 6 + 1}: {cell['content']}" for i, cell in enumerate(cells))
        for style, spec in STYLES.items():
            prompt = COMMON.format(description=spec["description"]) + body + "\n"
            if sheet_id != "01":
                prompt = f"REFERENCE IMAGE: sheet_{style}_01.png is a STYLE reference only. Match its pigment, edges, palette, line weight and texture. Generate a NEW atlas with the different cell contents below; do not repeat the reference's subjects.\n\n" + prompt
            (SOURCE / f"prompt_{style}_{sheet_id}.txt").write_text(prompt, encoding="utf-8")
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(STYLES)} styles x {len(entries)} sprites; {len(manifest['sheets'])} atlases per style")


if __name__ == "__main__":
    main()
