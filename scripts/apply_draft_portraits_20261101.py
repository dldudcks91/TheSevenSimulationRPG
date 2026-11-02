"""Apply the cells the user picked on 2026-11-01 from the 2026-10-31 Gemini redraw sheets (Gemini style only).

Same cut as apply_draft_portraits_20261031.py: the whole cell is keyed and shrunk to 512 px (no face seating).
Picks were read off the comparison board as "sheet k-cell n".

- 3402 · 3403 · 4103 · 4402 replace the Gemini normal portrait.
Re-running re-cuts everything from the sheets. Requires Pillow and numpy.
"""

from __future__ import annotations

from apply_draft_portraits_20261031 import FACES, READY, SSOT, keyed_cell
from export_face_portraits import export_one


#        id: (sheet slug, sheet k, cell n, SSOT name)
SELECTED = {
    3402: ("ch3_st4_palace_guard_archer_r2", 1, 1, "palace_guard_archer_gold_helm_scarf"),
    3403: ("ch3_st4_palace_guard_captain_r2", 1, 6, "palace_guard_captain_gold_helm"),
    4103: ("ch4_st1_troll_frostcaller_r5", 1, 5, "troll_frostcaller_ice_staff"),
    4402: ("ch4_st4_frost_statue_r2", 1, 8, "frost_statue_ice_gargoyle"),
}


def main() -> None:
    for monster_id, (slug, k, n, name) in SELECTED.items():
        portrait, sheet_name, box = keyed_cell(slug, k, n)
        target = READY / f"{monster_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n} crop {box}")


if __name__ == "__main__":
    main()
