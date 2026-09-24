"""Keep full-size portrait PNGs in source/ready and export small game WebPs.

Initial migration: python scripts/export_face_portraits.py --migrate
Later exports:      python scripts/export_face_portraits.py
Requires Pillow:    python -m pip install Pillow
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "src/assets/art/faces"
SOURCE = FACES / "source/ready"
GAME = FACES / "cartoon"
SIZES = {"monster": 256, "hero": 320}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def migrate_sources() -> list[Path]:
    old_files = sorted(path for group in SIZES for path in (GAME / group).glob("*.png"))
    for old in old_files:
        master = SOURCE / old.parent.name / old.name
        if master.exists() and digest(master) != digest(old):
            raise RuntimeError(f"Source differs from current game PNG: {master}")
    for old in old_files:
        master = SOURCE / old.parent.name / old.name
        master.parent.mkdir(parents=True, exist_ok=True)
        if not master.exists():
            shutil.copy2(old, master)
    return old_files


def export_one(master: Path, size: int) -> tuple[Path, int]:
    with Image.open(master) as opened:
        if opened.width != opened.height or opened.width < size:
            raise ValueError(f"Expected square source at least {size}px: {master}")
        profile = opened.info.get("icc_profile")
        image = opened.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)

    # Avoid an unnecessary alpha channel for the few fully opaque portraits.
    pixels = image.convert("RGB") if image.getchannel("A").getextrema() == (255, 255) else image
    output = GAME / master.parent.name / f"{master.stem}.webp"
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(output.name + ".tmp")
    try:
        options = {"quality": 90, "method": 6}
        if profile:
            options["icc_profile"] = profile
        pixels.save(temporary, "WEBP", **options)
        with Image.open(temporary) as encoded:
            if encoded.size != (size, size) or encoded.format != "WEBP":
                raise RuntimeError(f"Invalid WebP export: {temporary}")
            if ImageChops.difference(image.getchannel("A"), encoded.convert("RGBA").getchannel("A")).getbbox():
                raise RuntimeError(f"Alpha changed in WebP export: {temporary}")
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)
    return output, output.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--migrate", action="store_true", help="Copy old game PNGs to source/ready, then remove them after export")
    args = parser.parse_args()

    if not args.migrate and any(path for group in SIZES for path in (GAME / group).glob("*.png")):
        parser.error("Game PNGs still exist; run with --migrate first")
    old_files = migrate_sources() if args.migrate else []
    masters = sorted(path for group in SIZES for path in (SOURCE / group).glob("*.png"))
    if not masters:
        parser.error(f"No portrait masters found in {SOURCE}")

    exported = [export_one(master, SIZES[master.parent.name]) for master in masters]
    for old in old_files:
        master = SOURCE / old.parent.name / old.name
        output = GAME / old.parent.name / f"{old.stem}.webp"
        if digest(master) != digest(old) or not output.is_file():
            raise RuntimeError(f"Keeping old PNG because migration could not be verified: {old}")
    for old in old_files:
        old.unlink()

    total = sum(size for _, size in exported)
    print(f"Exported {len(exported)} WebP portraits ({total:,} bytes); archived {len(old_files)} original PNGs")


if __name__ == "__main__":
    main()
