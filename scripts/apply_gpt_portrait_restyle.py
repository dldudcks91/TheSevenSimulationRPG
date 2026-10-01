"""Archive generated style edits and export them into the GPT portrait folder.

This script only handles file registration, PNG sizing, and WebP export.
Portrait redraws are made with the built-in image generation tool.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

from export_face_portraits import FACES, SIZES, export_one

SESSION = FACES / "source/gpt_restyle_20261001"
MANIFEST = SESSION / "manifest.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def save_manifest(data: dict) -> None:
    SESSION.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def initialize() -> None:
    if MANIFEST.exists():
        return
    targets = []
    originals = {}
    for style in ("gemini", "gpt"):
        for path in sorted((FACES / style).rglob("*.webp")):
            relative = path.relative_to(FACES / style)
            originals[f"{style}/{relative.as_posix()}"] = sha(path)
            if style == "gemini" and not (FACES / "gpt" / relative).exists():
                master = FACES / "source/ready" / relative.with_suffix(".png")
                if not master.is_file():
                    raise FileNotFoundError(master)
                targets.append({"id": relative.with_suffix("").as_posix(),
                                "original": str(master.relative_to(FACES).as_posix()),
                                "original_sha256": sha(master), "status": "pending"})
    save_manifest({"date": "2026-10-01", "tool": "built-in image_gen",
                   "style_references": ["source/ready/monster/1401.png", "source/ready/monster/1402.png"],
                   "original_game_files": originals, "targets": targets})
    print(f"Registered {len(targets)} missing GPT portraits")


def install(identity: str, generated: Path) -> None:
    data = read_manifest()
    entry = next(e for e in data["targets"] if e["id"] == identity)
    if entry["status"] == "installed":
        raise ValueError(f"Already installed: {identity}")
    group, name = identity.split("/")
    if group not in SIZES or not name.replace("_", "").isalnum():
        raise ValueError(identity)
    output = FACES / "gpt" / group / f"{name}.webp"
    master = FACES / "source/ready/gpt" / group / f"{name}.png"
    if output.exists() or master.exists():
        raise FileExistsError(f"Preserving existing GPT asset: {output}")
    with Image.open(generated) as opened:
        if opened.width != opened.height:
            raise ValueError(f"Expected square portrait: {opened.size}")
        pixels = opened.convert("RGBA")
        if pixels.getchannel("A").getextrema() != (0, 255):
            raise ValueError("Generated portrait must have genuine transparency")
        ready = pixels.resize((512, 512), Image.Resampling.LANCZOS)
    archive = SESSION / "generated" / group / f"{name}.png"
    archive.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(generated, archive)
    master.parent.mkdir(parents=True, exist_ok=True)
    ready.save(master)
    game, size = export_one(master, SIZES[group], "gpt")
    entry.update(status="installed", generated=str(archive.relative_to(FACES).as_posix()),
                 ready=str(master.relative_to(FACES).as_posix()), game=str(game.relative_to(FACES).as_posix()),
                 generated_sha256=sha(archive), game_sha256=sha(game), game_bytes=size)
    save_manifest(data)
    print(f"Installed {identity}: {size:,} bytes")


def verify() -> None:
    data = read_manifest()
    for relative, expected in data["original_game_files"].items():
        assert sha(FACES / relative) == expected, f"Original changed: {relative}"
    installed = [e for e in data["targets"] if e["status"] == "installed"]
    for entry in data["targets"]:
        assert sha(FACES / entry["original"]) == entry["original_sha256"], entry["id"]
    for entry in installed:
        for key in ("generated", "ready", "game"):
            with Image.open(FACES / entry[key]) as portrait:
                assert portrait.getchannel("A").getextrema() == (0, 255), entry["id"]
        with Image.open(FACES / entry["game"]) as portrait:
            size = SIZES[entry["id"].split("/")[0]]
            assert portrait.size == (size, size), entry["id"]
    print(f"Verified {len(installed)}/{len(data['targets'])} GPT variants; originals unchanged")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("init", "install", "verify"))
    parser.add_argument("--id")
    parser.add_argument("--generated", type=Path)
    args = parser.parse_args()
    if args.action == "init":
        initialize()
    elif args.action == "install":
        if not args.id or not args.generated:
            parser.error("install requires --id and --generated")
        install(args.id, args.generated)
    else:
        verify()


if __name__ == "__main__":
    main()
