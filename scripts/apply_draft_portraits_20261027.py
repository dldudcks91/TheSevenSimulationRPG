"""Apply the cells the user picked on 2026-10-27 from the 2026-10-24 Gemini draft sheets (Gemini style only).

Same cut as apply_draft_portraits_20261024.py: the whole cell is keyed and shrunk to 512 px (no face seating).
Picks were read off the comparison board as "sheet k-cell n", where k counts the subject's sheets in order
(first round _1 ~ _3, then _r2, then _r3).

- 3150 Basilisk is mirrored left-right (user request).
- Stage bosses 2250 · 2450 · 3150 · 3450 · 4350 get their first portrait (monster.csv:face goes to 1 by hand).
- 3401 · 4102 · 4103 replace the Gemini normal portrait; their GPT portraits and elites are untouched.
Re-running re-cuts everything from the sheets. Requires Pillow and numpy.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

from apply_ch3_st3_mummy_portraits import key_green
from apply_draft_portraits_20261024 import cut
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEETS = FACES / "source/sheets"
READY = FACES / "source/ready/gemini/monster"
SSOT = FACES / "source/monster"
S = 512

#        id: (sheet slug, sheet k, cell n, mirror, SSOT name)
SELECTED = {
    2250: ("ch2_st2_mandrake_r3", 2, 8, False, "mandrake_rotten_mushroom"),
    2450: ("ch2_st4_medusa_r3", 3, 4, False, "medusa_hooded_snakes"),
    3150: ("ch3_st1_basilisk", 1, 3, True, "basilisk_spiked_white_crest"),
    3401: ("ch3_st4_golden_ledger", 3, 5, False, "golden_ledger_hooded_book"),
    3450: ("ch3_st4_midas", 3, 4, False, "midas_crowned_empty_helm"),
    4102: ("ch4_st1_troll_shaman", 3, 8, False, "troll_shaman_feather_skull"),
    4103: ("ch4_st1_troll_frostcaller_r3", 1, 5, False, "troll_frostcaller_hood_staff"),
    4350: ("ch4_st3_krampus", 3, 3, False, "krampus_ram_horns_chain"),
}


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for monster_id, (slug, k, n, mirror, name) in SELECTED.items():
        sheet_name = f"source_sheet_{slug}_3x3_{k}.png"
        with Image.open(SHEETS / sheet_name) as opened:
            sheet = opened.convert("RGBA")
        cell, box = cut(sheet, n)
        cell = key_green(cell)
        if mirror:
            cell = ImageOps.mirror(cell)
        portrait = cell.convert("RGBa").resize((S, S), Image.Resampling.LANCZOS).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {monster_id}")
        target = READY / f"{monster_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n} crop {box}"
              + (" mirrored" if mirror else ""))


if __name__ == "__main__":
    main()
