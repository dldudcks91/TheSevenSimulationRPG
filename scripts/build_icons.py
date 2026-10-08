"""Build the game's icon set: icons_source/ (PNG originals) -> icons/ (256px WebP).

Rule (src/assets/art/README.md 「아이콘 — 원본과 설치본」):
- src/assets/art/icons_source/  every original — 512 PNG, sheets, unused, variants, work files. The game never reads it.
- src/assets/art/icons/         what the game reads — 256px WebP only, same relative path, same stem.

Run after adding or replacing any icon:  python scripts/build_icons.py
- A PNG dropped straight into icons/ is moved to icons_source/ (same path, replacing the old original) and built.
- Only the folders in GAME_DIRS are built; everything else in icons_source/ stays source-only.
- Each file is encoded both lossless and lossy (q90); the smaller one wins — flat silhouettes come out lossless.
- A WebP in a built folder whose original is gone is removed.
Requires Pillow only.
"""

from __future__ import annotations

import io
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/assets/art/icons_source"
OUT = ROOT / "src/assets/art/icons"
SIZE = 256

# Folders the game reads (src/ui/mock.js · app.js path builders). A new icon folder is added here and in the README table.
GAME_DIRS = [
    "skills",
    "sins",
    "classes",
    "items/empty",
    "items/item_base",
    "items/potion",
    "items/weapon_base/*",
    "mastery/sin",
    "mastery/class",
    "mastery/advance",
    "materials/ores",
    "materials/timbers",
    "materials/herbs",
    "minigame",
]


def encode(im: Image.Image) -> bytes:
    best = None
    for kw in (dict(lossless=True, method=6), dict(quality=90, alpha_quality=100, method=6)):
        buf = io.BytesIO()
        im.save(buf, "WEBP", **kw)
        data = buf.getvalue()
        if best is None or len(data) < len(best):
            best = data
    return best


def adopt_drops() -> list[str]:
    """PNGs dropped into icons/ become originals in icons_source/."""
    moved = []
    for png in sorted(OUT.rglob("*.png")):
        rel = png.relative_to(OUT)
        dst = SRC / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(png), str(dst))
        moved.append(rel.as_posix())
    return moved


def game_dirs() -> list[Path]:
    dirs = []
    for pattern in GAME_DIRS:
        dirs += [p for p in sorted(SRC.glob(pattern)) if p.is_dir()]
    return dirs


def build() -> None:
    moved = adopt_drops()
    built = skipped = removed = 0
    before = after = 0
    for sdir in game_dirs():
        rel_dir = sdir.relative_to(SRC)
        odir = OUT / rel_dir
        odir.mkdir(parents=True, exist_ok=True)
        stems = set()
        for png in sorted(sdir.glob("*.png")):
            stems.add(png.stem)
            webp = odir / f"{png.stem}.webp"
            before += png.stat().st_size
            if webp.exists() and webp.stat().st_mtime >= png.stat().st_mtime:
                skipped += 1
                after += webp.stat().st_size
                continue
            im = Image.open(png).convert("RGBA")
            if im.size != (SIZE, SIZE):
                im = im.resize((SIZE, SIZE), Image.LANCZOS)
            webp.write_bytes(encode(im))
            built += 1
            after += webp.stat().st_size
        for stale in odir.glob("*.webp"):
            if stale.stem not in stems:
                stale.unlink()
                removed += 1
    for m in moved:
        print(f"adopted  {m}  -> icons_source/")
    print(f"built {built} | up to date {skipped} | removed {removed} | "
          f"{before / 1048576:.1f} MB PNG -> {after / 1048576:.2f} MB WebP")


if __name__ == "__main__":
    build()
