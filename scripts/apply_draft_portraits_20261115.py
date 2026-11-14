"""Apply the cells the user picked on 2026-11-15 from the 「11-15 미확정 몬스터」 comparison board (Gemini style only).

Same cut as apply_draft_portraits_20261031.py: the whole cell is keyed and shrunk to 512 px (no face seating).
Picks were read off the board as "sheet k-cell n".

- 3350 · 4150 · 4250 are the first boss portraits (10-27 redraw sheets).
- The elite ids get their own `<idx>_elite` portrait (11-02 elite draft sheets).
Re-running re-cuts everything from the sheets. Requires Pillow and numpy.
"""

from __future__ import annotations

from apply_draft_portraits_20261031 import FACES, READY, SSOT, keyed_cell
from export_face_portraits import export_one


#        target: (sheet slug, sheet k, cell n, SSOT name)
SELECTED = {
    "3350": ("ch3_st3_tutankhamun_r2", 2, 5, "tutankhamun_gold_mask"),
    "4150": ("ch4_st1_ymir_r2", 2, 8, "ymir_frost_giant"),
    "4250": ("ch4_st2_general_frost_r2", 1, 6, "general_frost_wraith"),
    "3401_elite": ("ch3_st4_golden_ledger_elite", 2, 4, "golden_ledger_elite"),
    "4101_elite": ("ch4_st1_troll_warrior_elite", 2, 4, "troll_warrior_elite"),
    "4302_elite": ("ch4_st3_yeti_slinger_elite", 1, 2, "yeti_slinger_elite"),
    "4303_elite": ("ch4_st3_yeti_glacier_giant_elite", 2, 6, "yeti_glacier_giant_elite"),
    "5101_elite": ("ch5_st1_starving_ghoul_elite", 2, 5, "starving_ghoul_elite"),
    "5102_elite": ("ch5_st1_ghoul_hunter_elite", 2, 5, "ghoul_hunter_elite"),
    "5103_elite": ("ch5_st1_ghoul_shaman_elite", 2, 5, "ghoul_shaman_elite"),
}


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    for target_id, (slug, k, n, name) in SELECTED.items():
        portrait, sheet_name, box = keyed_cell(slug, k, n)
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {target_id}")
        target = READY / f"{target_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n} crop {box}")


if __name__ == "__main__":
    main()
