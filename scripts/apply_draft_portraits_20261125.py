"""Apply the cells the user picked on 2026-11-25 from the 「11-24 미확정 몬스터 · Gemini 4」 board (Gemini style only).

Same cut as apply_draft_portraits_20261117.py: the whole cell is keyed and shrunk to 512 px (no face seating).
Picks were read off the board as "sheet k-cell n". All four are the first portrait of that elite.
Re-running re-cuts the picks from the sheets.
  python scripts/apply_draft_portraits_20261125.py [--preview OUT.png]
Requires Pillow and numpy.
"""

from __future__ import annotations

import sys

from PIL import Image, ImageDraw

from apply_draft_portraits_20261031 import FACES, READY, SSOT
from apply_draft_portraits_20261117 import cut_all
from export_face_portraits import export_one


#        target: (sheet slug, sheet k, cell n, SSOT name)
SELECTED = {
    "3303_elite": ("ch3_st3_gold_crowned_mummy_elite_r2", 3, 4, "mummy_gold_crowned_elite"),
    "5201_elite": ("ch5_st2_orc_glutton_elite", 2, 3, "orc_glutton_elite"),
    "5202_elite": ("ch5_st2_orc_harpooner_elite", 1, 3, "orc_harpooner_elite"),
    "5203_elite": ("ch5_st2_orc_chef_elite", 1, 3, "orc_chef_elite"),
}


def preview(out: str) -> None:
    cells = list(cut_all(SELECTED))
    T = 256
    sheet = Image.new("RGB", (T * len(cells), T + 24), (40, 44, 52))
    d = ImageDraw.Draw(sheet)
    for i, (tid, _, p, _, _, _) in enumerate(cells):
        small = p.resize((T, T))
        sheet.paste(small, (i * T, 24), small)
        d.text((i * T + 6, 6), tid, fill=(255, 255, 255))
    sheet.save(out)
    print("preview", out)


def main() -> None:
    if "--preview" in sys.argv:
        preview(sys.argv[sys.argv.index("--preview") + 1])
        return
    READY.mkdir(parents=True, exist_ok=True)
    for target_id, name, portrait, sheet_name, n, box in cut_all(SELECTED):
        target = READY / f"{target_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n} crop {box}")


if __name__ == "__main__":
    main()
