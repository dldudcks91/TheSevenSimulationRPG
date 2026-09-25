"""Apply the user's two Sandstone Golem images to Chapter 3 Stage 1 monster 3103.

Black eyes = normal 3103 · orange glowing eyes with carved shoulder runes = elite 3103_elite.
Both JPEGs were cut from an older sheet and keep a strip of its black divider on the top
and right edges; the crop boxes drop those strips. Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from apply_ch2_st4_naga_portraits import key_green
from export_face_portraits import export_one


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SHEETS = FACES / "source/sheets"
READY = FACES / "source/ready/monster"
SELECTED = {
    "3103": (SHEETS / "source_sheet_ch3_st1_sandstone_golem.jpg", (0, 4, 506, 510)),
    "3103_elite": (SHEETS / "source_sheet_ch3_st1_sandstone_golem_elite.jpg", (0, 6, 506, 512)),
}


def main() -> None:
    for name, (source, box) in SELECTED.items():
        target = READY / f"{name}.png"
        if target.exists():
            raise FileExistsError(f"{target} already exists; back it up before replacing")
        with Image.open(source) as opened:
            tile = opened.convert("RGBA").crop(box)
        portrait = key_green(tile).convert("RGBa").resize(
            (512, 512), Image.Resampling.LANCZOS
        ).convert("RGBA")
        if portrait.getpixel((5, 5))[3] != 0:
            raise ValueError(f"Background remains in portrait {name}")
        portrait.save(target)
        exported, size = export_one(target, 256)
        print(f"Applied {target} and {exported} ({size:,} bytes) from {source.name} crop {box}")


if __name__ == "__main__":
    main()
