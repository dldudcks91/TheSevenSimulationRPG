"""Archive generated style edits and export them into the GPT portrait folder.

This script only handles file registration, PNG sizing, and WebP export.
Portrait redraws are made with the built-in image generation tool.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

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
        assert sha(FACES / entry["generated"]) == entry["generated_sha256"], entry["id"]
        assert sha(FACES / entry["game"]) == entry["game_sha256"], entry["id"]
        for key in ("generated", "ready", "game"):
            with Image.open(FACES / entry[key]) as portrait:
                assert portrait.getchannel("A").getextrema() == (0, 255), entry["id"]
        with Image.open(FACES / entry["game"]) as portrait:
            size = SIZES[entry["id"].split("/")[0]]
            assert portrait.size == (size, size), entry["id"]
    print(f"Verified {len(installed)}/{len(data['targets'])} GPT variants; originals unchanged")


def compare() -> None:
    """Build review sheets and a local gallery from actual game exports."""
    entries = read_manifest()["targets"]
    destination = SESSION / "comparisons"
    destination.mkdir(exist_ok=True)
    font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 16)
    cards = []
    for start in range(0, len(entries), 8):
        count = min(8, len(entries) - start)
        sheet = Image.new("RGB", (720, 60 + ((count + 1) // 2) * 220), "#20232a")
        draw = ImageDraw.Draw(sheet)
        draw.text((16, 10), f"Gemini / GPT — {start + 1}–{min(start + 8, len(entries))}", font=font, fill="white")
        for slot, entry in enumerate(entries[start:start + 8]):
            identity = entry["id"]
            x, y = (slot % 2) * 360, 44 + (slot // 2) * 220
            draw.text((x + 16, y), identity, font=font, fill="white")
            figures = []
            for column, style in enumerate(("gemini", "gpt")):
                path = FACES / style / f"{identity}.webp"
                draw.text((x + 16 + column * 176, y + 23), style, font=font, fill="#bbbfc9")
                if path.exists():
                    with Image.open(path) as opened:
                        pixels = opened.convert("RGBA").resize((160, 160), Image.Resampling.LANCZOS)
                    sheet.paste(pixels, (x + 16 + column * 176, y + 48), pixels)
                    relative = f"../../{style}/{identity}.webp"
                    content = f'<img loading="lazy" src="{html.escape(relative)}" alt="{style} {html.escape(identity)}">'
                else:
                    draw.text((x + 16 + column * 176, y + 116), "Unavailable", font=font, fill="#bbbfc9")
                    content = '<div class="missing">생성되지 않음</div>'
                figures.append(f'<figure><figcaption>{style}</figcaption>{content}</figure>')
            cards.append(f'<article data-id="{html.escape(identity)}"><h2>{html.escape(identity)}</h2><div class="pair">{"".join(figures)}</div></article>')
        sheet.save(destination / f"comparison_{start // 8 + 1:02}.png")
    installed = sum(e["status"] == "installed" for e in entries)
    gallery = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gemini · GPT 초상 비교</title><style>
body{margin:24px;background:#20232a;color:#eceef4;font:16px system-ui}h1{font-size:24px}input{padding:10px;background:#303640;color:white;border:1px solid #626975;border-radius:6px;width:min(360px,90%)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:20px;margin-top:24px}article{padding:12px;background:#292e37;border-radius:8px}article[hidden]{display:none}h2{font-size:16px;margin:0 0 8px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}figure{margin:0}figcaption{margin-bottom:8px;color:#b8bec9}img,.missing{width:100%;aspect-ratio:1;object-fit:contain;background:#22262e}.missing{display:grid;place-items:center;color:#b8bec9}
</style><h1>Gemini · GPT 초상 비교</h1>'''
    gallery += f'<p>GPT 추가 {installed}/{len(entries)}장 · 왼쪽 Gemini, 오른쪽 GPT</p><input aria-label="초상 ID 검색" placeholder="초상 ID 검색"><main>{"".join(cards)}</main>'
    gallery += '''<script>document.querySelector('input').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.id.toLowerCase().includes(q));});</script></html>'''
    (SESSION / "comparison.html").write_text(gallery, encoding="utf-8")
    print(f"Built gallery and {(len(entries) + 7) // 8} comparison sheets")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("init", "install", "verify", "compare"))
    parser.add_argument("--id")
    parser.add_argument("--generated", type=Path)
    args = parser.parse_args()
    if args.action == "init":
        initialize()
    elif args.action == "install":
        if not args.id or not args.generated:
            parser.error("install requires --id and --generated")
        install(args.id, args.generated)
    elif args.action == "verify":
        verify()
    else:
        compare()


if __name__ == "__main__":
    main()
