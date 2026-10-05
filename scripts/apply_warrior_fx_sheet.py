"""Cut and key the approved warrior sheet, preserving each cell's placement.

python scripts/apply_warrior_fx_sheet.py           # prepare sources and review
python scripts/apply_warrior_fx_sheet.py --install # back up and install eight FX
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/warrior_sheet_20261006"
PREVIEW = ROOT / "_scratch/imagegen/warrior_basic_fx_sheet_20261006_v2"
OUT = ROOT / "src/assets/art/fx/skills"
SIZE = 384
SPECS = [
    ("war_bash", "hit", "slash", 360, False),
    ("war_doubleswing", "hit", "cross", 400, False),
    ("war_quake", "hit", "ground", 480, True),
    ("war_leap", "hit", "land", 460, True),
    ("war_taunt", "buff", "edge-burst", 540, False),
    ("war_shout", "buff", "edge-wave", 580, False),
    ("war_battleorders", "buff", "edge-orders", 580, False),
    ("war_ironskin", "buff", "edge-shell", 540, False),
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def snapshot() -> dict:
    previous = SOURCE / "previous"
    manifest_path = previous / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for name, expected in manifest["warrior_files"].items():
            if digest(previous / "skills" / name) != expected:
                raise ValueError(f"Backup hash mismatch: {name}")
        return manifest
    if previous.exists():
        raise ValueError("Incomplete backup directory; inspect it before installing")
    names = [sid + ".webp" for sid, *_ in SPECS]
    missing = [name for name in names if not (OUT / name).is_file()]
    if missing:
        raise ValueError(f"Existing warrior effects missing: {missing}")
    (previous / "skills").mkdir(parents=True)
    (previous / "ui").mkdir()
    hashes = {path.name: digest(path) for path in OUT.glob("*.webp")}
    for name in names:
        shutil.copy2(OUT / name, previous / "skills" / name)
        if digest(previous / "skills" / name) != hashes[name]:
            raise ValueError(f"Backup verification failed: {name}")
    for name in ("skill_art.js", "fx.js", "style.css"):
        shutil.copy2(ROOT / "src/ui" / name, previous / "ui" / name)
    manifest = {
        "date": "2026-10-06",
        "warrior_files": {name: hashes[name] for name in names},
        "other_files": {name: value for name, value in hashes.items() if name not in names},
        "ui_snapshots": {path.name: digest(path) for path in (previous / "ui").iterdir()},
    }
    write_json(manifest_path, manifest)
    return manifest


def grid_runs(image: Image.Image, vertical: bool) -> list[tuple[int, int]]:
    pixels = image.load()
    length, cross = image.size if vertical else image.size[::-1]
    positions = []
    for i in range(length):
        count = sum(max(pixels[i, j] if vertical else pixels[j, i]) < 40 for j in range(cross))
        if count >= cross * .98:
            positions.append(i)
    runs: list[tuple[int, int]] = []
    for i in positions:
        if runs and i == runs[-1][1]:
            runs[-1] = (runs[-1][0], i + 1)
        else:
            runs.append((i, i + 1))
    if len(runs) != 4 or runs[0][0] != 0 or runs[-1][1] != length:
        raise ValueError(f"Expected four uninterrupted grid lines: {runs}")
    return runs


def key_magenta(image: Image.Image) -> Image.Image:
    """Use the prompt's 40..120 alpha ramp and unmix the magenta edge color."""
    keyed = []
    for red, green, blue in getattr(image, "get_flattened_data", image.getdata)():
        alpha = min(1.0, max(0.0, (120 - (min(red, blue) - green)) / 80))
        if alpha == 0:
            keyed.append((0, 0, 0, 0))
            continue
        channels = (
            (red - (1 - alpha) * 255) / alpha,
            green / alpha,
            (blue - (1 - alpha) * 255) / alpha,
        )
        keyed.append(tuple(max(0, min(255, round(c))) for c in channels) + (round(alpha * 255),))
    rgba = Image.new("RGBA", image.size)
    rgba.putdata(keyed)
    # Resize the whole cell, not the artwork's alpha bounding box.
    return rgba.convert("RGBa").resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGBA")


def review(entries: list[dict], sprites: dict[str, Image.Image]) -> None:
    sheet = Image.new("RGB", (1020, 600), (22, 22, 36))
    draw = ImageDraw.Draw(sheet)
    font_path = Path("C:/Windows/Fonts/malgun.ttf")
    font = ImageFont.truetype(str(font_path), 14) if font_path.exists() else ImageFont.load_default()
    portraits = []
    for style in ("gemini", "gpt"):
        with Image.open(ROOT / f"src/assets/art/faces/{style}/hero/warrior_1.webp") as face:
            portraits.append(face.convert("RGBA").resize((91, 91), Image.Resampling.LANCZOS))
    for i, entry in enumerate(entries):
        x, y = i % 3 * 340, i // 3 * 200
        draw.text((x + 10, y + 6), entry["name"], font=font, fill=(216, 217, 230))
        draw.text((x + 10, y + 28), entry["file"], font=font, fill=(168, 177, 194))
        old = SOURCE / "previous/skills" / (entry["id"] + ".webp")
        if not old.exists():
            old = OUT / (entry["id"] + ".webp")
        with Image.open(old) as image:
            before = image.convert("RGBA")
        for col, (portrait, effect, label) in enumerate((
            (portraits[0], before, "기존 91px"),
            (portraits[0], sprites[entry["file"]], "새 그림 91px"),
            (portraits[1], sprites[entry["file"]], "새 그림 GPT 91px"),
        )):
            px = x + 10 + col * 110
            tile = portrait.copy()
            overlay = effect.convert("RGBa").resize((91, 91), Image.Resampling.LANCZOS).convert("RGBA")
            tile.alpha_composite(overlay)
            sheet.paste(tile.convert("RGB"), (px, y + 58))
            draw.text((px, y + 157), label, font=font, fill=(216, 217, 230))
    sheet.save(SOURCE / "preview_91px.png")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install", action="store_true")
    args = parser.parse_args()
    SOURCE.mkdir(parents=True, exist_ok=True)
    backup = snapshot() if args.install else None
    sheet_path = SOURCE / "sheet.png"
    if not sheet_path.exists():
        shutil.copy2(PREVIEW / "warrior_fx_sheet_final.png", sheet_path)
        for name in ("source_prompt.txt", "prompt.txt", "prompt_revision.txt", "prompt_inset.txt"):
            shutil.copy2(PREVIEW / name, SOURCE / name)
        shutil.copy2(PREVIEW / "generation.json", SOURCE / "generation_preview.json")
    with (ROOT / "src/data/skill.csv").open(encoding="utf-8-sig", newline="") as handle:
        rows = {r["skill_id"]: r for r in csv.DictReader(handle) if r["owner_kind"] == "job" and r["owner_id"] == "warrior"}
    if set(rows) != {sid for sid, *_ in SPECS}:
        raise ValueError("Warrior skill list changed")
    with Image.open(sheet_path) as original:
        sheet = original.convert("RGB")
    cols, lines = grid_runs(sheet, True), grid_runs(sheet, False)
    staged = SOURCE / "prepared"
    staged.mkdir(exist_ok=True)
    sprites, entries, measurements = {}, [], []
    specs = SPECS + [("war_ironskin", "buff", "edge-shell", 540, False)]
    for i, (sid, kind, motion, duration, quake) in enumerate(specs):
        row, col = divmod(i, 3)
        # Discard three pixels of the grid's antialiasing halo inside each cell.
        bounds = [cols[col][1] + 3, lines[row][1] + 3, cols[col + 1][0] - 3, lines[row + 1][0] - 3]
        cell = sheet.crop(bounds)
        side = min(cell.size)
        dx, dy = (cell.width - side) // 2, (cell.height - side) // 2
        cell = cell.crop((dx, dy, dx + side, dy + side))
        rgba = key_magenta(cell)
        file = sid if i < 8 else "war_ironskin_glints"
        sprites[file] = rgba
        rgba.save(SOURCE / (file + ".png"))
        target = staged / (file + ".webp")
        rgba.save(target, "WEBP", quality=90, alpha_quality=100, method=6, exact=True)
        with Image.open(target) as installed:
            installed.load()
            alpha = installed.getchannel("A")
            if installed.size != (SIZE, SIZE) or installed.mode != "RGBA" or alpha.getextrema() != (0, 255):
                raise ValueError(f"Invalid WebP: {file}")
            if any(alpha.getpixel(point) for point in ((0, 0), (383, 0), (0, 383), (383, 383))):
                raise ValueError(f"Opaque corner: {file}")
            if alpha.getbbox() is None:
                raise ValueError(f"Empty effect: {file}")
            face = alpha.crop((round(SIZE * .35), round(SIZE * .28), round(SIZE * .65), round(SIZE * .55)))
            face_coverage = sum(a > 32 for a in getattr(face, "get_flattened_data", face.getdata)()) / (face.width * face.height)
        entry = {"id": sid, "file": file, "name": rows[sid]["name_kr"], "job": "warrior", "kind": kind, "motion": motion, "size": 101, "fit": "portrait", "duration": duration, "quake": quake, "cell": i + 1}
        entries.append(entry)
        measurements.append({"file": file, "cell_bounds": bounds, "size": [SIZE, SIZE], "alpha_bbox": list(alpha.getbbox()), "face_coverage_pct": round(face_coverage * 100, 2), "webp_bytes": target.stat().st_size, "sha256": digest(target)})
    if backup:
        for entry in entries[:8]:
            shutil.copy2(staged / (entry["file"] + ".webp"), OUT / (entry["file"] + ".webp"))
        for name, expected in backup["other_files"].items():
            if digest(OUT / name) != expected:
                raise ValueError(f"Unrelated effect changed: {name}")
    manifest = {"date": "2026-10-06", "generator": "built-in image_gen", "source_document": "docs/reference/basic_skill_fx_sheet_prompts.md", "sheet": "sheet.png", "sheet_sha256": digest(sheet_path), "framing": "whole cell; no alpha-bbox normalization", "keying": "min(r,b)-g ramp 40..120, magenta edge unmixing, premultiplied resize", "installed": bool(backup), "skills": entries[:8], "alternates": entries[8:]}
    write_json(SOURCE / "prompts.json", manifest)
    write_json(SOURCE / "measurements.json", measurements)
    review(entries, sprites)
    print(json.dumps({"installed": bool(backup), "effects": 8, "alternates": 1, "source": str(SOURCE), "backup": str(SOURCE / "previous") if backup else None, "measurements": measurements}, ensure_ascii=True))


if __name__ == "__main__":
    main()
