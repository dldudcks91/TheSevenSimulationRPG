"""Apply the cells the user picked on 2026-11-17 from the 「11-17 미확정 몬스터」 board (Gemini style only).

Same cut as apply_draft_portraits_20261116.py: the whole cell is keyed and shrunk to 512 px (no face seating).
Picks were read off the board as "sheet k-cell n".

- 1203_elite · 3301_elite · 3302_elite · 4402_elite get their own `<idx>_elite` portrait.
- 3303 · 3402 replace the normal portrait. 5201 · 5202 · 5203 are the first orc portraits of chapter 5.
- EDIT_BASE cells are the user's picks that still get an edit (4403_elite 2-8 = red eye glow · 5250 2-5 = a clearer
  scar over the eye). They are keyed to source/monster/ as the edit input, not installed.
Re-running re-cuts the picks from the sheets.
  python scripts/apply_draft_portraits_20261117.py [--preview OUT.png]
Requires Pillow and numpy.
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image, ImageDraw

from apply_draft_portraits_20261031 import FACES, READY, SSOT, keyed_cell
from apply_draft_portraits_20261116 import clear_border
from export_face_portraits import export_one


#        target: (sheet slug, sheet k, cell n, SSOT name)
SELECTED = {
    "1203_elite": ("ch1_st2_human_knight_elite_r4", 2, 6, "human_knight_elite_bloodied"),
    "3301_elite": ("ch3_st3_bareheaded_mummy_elite_r4", 1, 6, "mummy_bareheaded_elite_gold"),
    "3302_elite": ("ch3_st3_bronze_mummy_elite_r4", 3, 4, "mummy_bronze_elite_gold"),
    "3303": ("ch3_st3_gold_crowned_mummy_r10", 3, 4, "mummy_gold_crowned_r10"),
    "3402": ("ch3_st4_palace_guard_archer_r5", 1, 1, "palace_guard_archer_lowered_r5"),
    "4402_elite": ("ch4_st4_frost_statue_elite_r3", 3, 8, "frost_statue_elite_runes"),
    "5201": ("ch5_st2_orc_glutton_r3", 3, 8, "orc_glutton"),
    "5202": ("ch5_st2_orc_harpooner_r3", 2, 5, "orc_harpooner"),
    "5203": ("ch5_st2_orc_chef_r3", 3, 1, "orc_chef"),
}
EDIT_BASE = {
    "4403_elite": ("ch4_st4_winged_statue_elite_r3", 2, 8, "winged_statue_elite_runes_base"),
    "5250": ("ch5_st2_orcus_r3", 2, 5, "orcus_base"),
}
# Second pick the same day (「11-17 넷째 판 몬스터」 board). The board numbers sheets by what was kept:
# the red-eye row shows only `_redeye_3x3_1` and the scar row only `_orcus_scar_3x3_2` as "sheet 1".
SECOND = {
    "4401_elite": ("ch4_st4_throne_guardian_elite_r4", 1, 7, "throne_guardian_elite_black_stone"),
    "4403_elite": ("ch4_st4_winged_statue_elite_redeye", 1, 8, "winged_statue_elite_red_eyes"),
    "5250": ("ch5_st2_orcus_scar", 2, 3, "orcus_scar"),
    "5301": ("ch5_st3_scarab_soldier_r4", 1, 2, "scarab_soldier"),
    "5303": ("ch5_st3_scarab_queen_r4", 1, 5, "scarab_queen"),
}
FLIPPED = {"5301", "5303"}  # 사용자 지시 「뒤집어」 — 좌우 반전
# Third pick the same day (「11-17 다섯째 판 몬스터」 board).
THIRD = {
    "5302": ("ch5_st3_scarab_mage_r5", 3, 8, "scarab_mage_fireball"),
}


def cut_all(table):
    for target_id, (slug, k, n, name) in table.items():
        portrait, sheet_name, box = keyed_cell(slug, k, n)
        portrait = clear_border(portrait)
        if target_id in FLIPPED and table is SECOND:  # 5301 · 5303 은 SECOND 에만 있다
            portrait = portrait.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        # 위 모서리 하나는 무기가 덮을 수 있다(5202 작살 끝) · 아래 모서리는 몸이다 — 위 모서리 하나가 비고 초록이 안 남았나 본다
        a = np.array(portrait).astype(int)
        corners = sum(portrait.getpixel(xy)[3] == 0 for xy in ((5, 5), (506, 5)))
        green = ((a[:, :, 3] > 128) & (a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]) > 60)).sum()
        if corners < 1 or green > 50:
            raise ValueError(f"Background remains in portrait {target_id} (corners {corners} · green {green})")
        yield target_id, name, portrait, sheet_name, n, box


def preview(out: str) -> None:
    cells = list(cut_all(THIRD))
    T = 256
    sheet = Image.new("RGB", (T * 6, (T + 24) * 2), (40, 44, 52))
    d = ImageDraw.Draw(sheet)
    for i, (tid, _, p, _, _, _) in enumerate(cells):
        x, y = (i % 6) * T, (i // 6) * (T + 24)
        sheet.paste(p.resize((T, T)), (x, y + 24), p.resize((T, T)))
        d.text((x + 6, y + 6), tid, fill=(255, 255, 255))
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
    for target_id, name, portrait, sheet_name, n, box in cut_all(EDIT_BASE):
        portrait.save(SSOT / f"{name}.png")
        print(f"Edit base {name}.png for {target_id} from {sheet_name} cell {n} crop {box}")
    for target_id, name, portrait, sheet_name, n, box in cut_all(SECOND):
        target = READY / f"{target_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        flip = " flipped" if target_id in FLIPPED else ""
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n}{flip} crop {box}")
    for target_id, name, portrait, sheet_name, n, box in cut_all(THIRD):
        target = READY / f"{target_id}.png"
        portrait.save(target)
        portrait.save(SSOT / f"{name}.png")
        exported, size = export_one(target, 256)
        print(f"Installed {exported.relative_to(FACES)} ({size:,} bytes) from {sheet_name} cell {n} crop {box}")


if __name__ == "__main__":
    main()
