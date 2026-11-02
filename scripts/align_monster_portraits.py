"""Seat monster portraits on the Troll Warrior (4101) framing: same head size, same eye line, no whole bodies.

Whole-cell installs (apply_draft_portraits_*) shrink a sheet cell to 512 px with no face seating, so a figure
drawn full body arrives with a small head. This scales the master around its head and re-exports the WebP.

Coordinates are 512 px master coordinates, read off a grid by eye (postprocess.md 3-0: auto detection is unreliable).
Reads source/ready/prealign/monster/<id>.png; the first run moves the current master there, so re-running with new
numbers always starts from the uncropped picture. Portraits absent from SPEC keep their current file.

    python scripts/align_monster_portraits.py            # write masters + WebPs
    python scripts/align_monster_portraits.py --dry      # print the placement only
    python scripts/align_monster_portraits.py 4103 4402  # only these
"""

from __future__ import annotations

import shutil
import sys

import numpy as np
from PIL import Image

from export_face_portraits import SOURCE, export_one


PREALIGN = SOURCE / "prealign/monster"
S = 512
EYE_Y = 225       # 4101's eye line
HEAD_X = 310      # 4101's head centre
TOUCH = 3         # opaque pixels on an edge row that mean the figure is cut by that edge

#   id: (head centre x, eye y, scale[, head centre x on the canvas])
SPEC = {
    "2203": (299, 230, 1.20),
    "2203_elite": (286, 222, 1.20),
    "2401": (222, 222, 1.15, 262),
    "2401_elite": (243, 205, 1.14, 272),
    "2402": (298, 188, 1.15),
    "2402_elite": (290, 196, 1.12),
    "2403": (302, 188, 1.30),
    "2403_elite": (290, 196, 1.22),
    "2450": (307, 201, 1.10),
    "3101": (303, 188, 1.00),
    "3101_elite": (310, 205, 1.00),
    "4103": (288, 166, 1.32, 280),
    "4402": (340, 179, 1.15, 300),
    "4403": (311, 230, 1.15, 300),
    "5103": (280, 183, 1.00),
}


def touches(alpha: np.ndarray) -> dict[str, bool]:
    solid = alpha > 40
    return {"left": solid[:, :2].sum() > TOUCH, "right": solid[:, -2:].sum() > TOUCH,
            "top": solid[:2, :].sum() > TOUCH, "bottom": solid[-2:, :].sum() > TOUCH}


def seat(image: Image.Image, spec: tuple) -> tuple[Image.Image, tuple[float, float, list[str]]]:
    """Scale premultiplied, then place. A side the source already cuts must stay outside the canvas."""
    hx, ey, k, *canvas_x = spec
    target_x = canvas_x[0] if canvas_x else HEAD_X
    size = round(S * k)
    x = target_x - hx * k
    y = EYE_Y - ey * k
    cut = touches(np.array(image)[:, :, 3])
    clamped = []
    if cut["left"] and x > 0:
        x, _ = 0, clamped.append("left")
    if cut["top"] and y > 0:
        y, _ = 0, clamped.append("top")
    if cut["right"] and x + size < S:
        x, _ = S - size, clamped.append("right")
    if cut["bottom"] and y + size < S:
        y, _ = S - size, clamped.append("bottom")

    rgba = np.array(image).astype(float)
    alpha = rgba[:, :, 3:4] / 255
    premultiplied = Image.fromarray(np.concatenate([rgba[:, :, :3] * alpha, rgba[:, :, 3:4]], 2).round().astype(np.uint8))
    scaled = np.array(premultiplied.resize((size, size), Image.Resampling.LANCZOS)).astype(float)
    restored = np.clip(scaled[:, :, :3] * 255 / np.maximum(scaled[:, :, 3:4], 1), 0, 255)
    result = Image.fromarray(np.concatenate([restored, scaled[:, :, 3:4]], 2).astype(np.uint8))
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    canvas.paste(result, (round(x), round(y)))
    return canvas, (x, y, clamped)


def master_path(name: str):
    override = SOURCE / "gemini/monster" / f"{name}.png"
    return override if override.exists() else SOURCE / "monster" / f"{name}.png"


def main() -> None:
    args = sys.argv[1:]
    dry = "--dry" in args
    names = [a for a in args if a != "--dry"] or list(SPEC)
    for name in names:
        master = master_path(name)
        kept = PREALIGN / f"{name}.png"
        if not dry and not kept.exists():
            kept.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(master, kept)
        with Image.open(kept if kept.exists() else master) as opened:
            image = opened.convert("RGBA")
        seated, (x, y, clamped) = seat(image, SPEC[name])
        print(f"{name}: k {SPEC[name][2]} at ({x:.0f}, {y:.0f})" + (f"  clamped {clamped}" if clamped else ""))
        if not dry:
            seated.save(master)
            export_one(master, 256)


if __name__ == "__main__":
    main()
