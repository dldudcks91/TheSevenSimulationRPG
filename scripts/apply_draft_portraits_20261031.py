"""Apply the cells the user picked on 2026-10-31 from the 2026-10-30 Gemini draft sheets (Gemini style only).

Same cut as apply_draft_portraits_20261027.py: the whole cell is keyed and shrunk to 512 px (no face seating).
Picks were read off the comparison board as "sheet k-cell n".

- 1201 · 1202 · 3301 · 3302 · 3401 replace the Gemini normal portrait.
- SKETCHES are keyed the same way but not installed: palace guard archer 3-7 is the attachment for the 3402 · 3403 redraw.
Re-running re-cuts everything from the sheets. Requires Pillow and numpy.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch3_st3_mummy_portraits import key_green
from apply_draft_portraits_20261024 import cut
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEETS = FACES / "source/sheets"
READY = FACES / "source/ready/gemini/monster"
SSOT = FACES / "source/monster"
S = 512

#        id: (sheet slug, sheet k, cell n, SSOT name)
SELECTED = {
    1201: ("ch1_st2_human_footman_r2", 2, 4, "human_footman_riveted_helm_shield"),
    1202: ("ch1_st2_human_archer_r2", 3, 5, "human_archer_riveted_helm"),
    3301: ("ch3_st3_bareheaded_mummy_r2", 2, 6, "mummy_bareheaded_torn_skull"),
    3302: ("ch3_st3_bronze_mummy_r5", 2, 5, "mummy_bronze_wrapped_face"),
    3401: ("ch3_st4_golden_ledger_r2", 1, 4, "golden_ledger_chained_padlocks"),
}
SKETCHES = {
    "palace_guard_archer_gold_helm_cloak_sketch": ("ch3_st4_palace_guard_archer", 3, 7),
}


def keyed_cell(slug: str, k: int, n: int) -> tuple[Image.Image, str, tuple[int, int, int, int]]:
    sheet_name = f"source_sheet_{slug}_3x3_{k}.png"
    with Image.open(SHEETS / sheet_name) as opened:
        sheet = opened.convert("RGBA")
    cell, box = cut(sheet, n)
    portrait = key_green(cell).convert("RGBa").resize((S, S), Image.Resampling.LANCZOS).convert("RGBA")
    return portrait, sheet_name, box


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for monster_id, (slug, k, n, name) in SELECTED.items():
        portrait, sheet_name, box = keyed_cell(slug, k, n)
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        target = READY / f"{monster_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n} crop {box}")
    for name, (slug, k, n) in SKETCHES.items():
        portrait, sheet_name, box = keyed_cell(slug, k, n)
        portrait.save(SSOT / f"{name}.png")
        print(f"Sketch {name}.png from {sheet_name} cell {n} crop {box}")


if __name__ == "__main__":
    main()
