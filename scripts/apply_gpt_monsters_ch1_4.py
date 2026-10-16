"""Register built-in image generation results for missing chapter 1–4 portraits."""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

from export_face_portraits import FACES, ROOT, export_one, write_index

SESSION = FACES / "source/gpt_monsters_ch1_4_20261016"
MANIFEST = SESSION / "manifest.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(data: dict) -> None:
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def initialize() -> None:
    SESSION.mkdir(parents=True, exist_ok=True)
    data = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else None
    rows = list(csv.DictReader((ROOT / "src/data/monster.csv").open(encoding="utf-8-sig", newline="")))
    targets = data["targets"] if data else []
    registered = {e["id"] for e in targets}
    for row in rows:
        if int(row["chapter"]) > 4 or row["spawn_grade"] != "normal":
            continue
        for suffix in ("", "_elite"):
            identity = row["monster_idx"] + suffix
            if identity in registered or (FACES / f"gpt/monster/{identity}.webp").exists():
                continue
            targets.append({"id": identity, "name": row["monster_name_kr"] + (" 정예" if suffix else ""),
                            "chapter": int(row["chapter"]), "stage": int(row["stage_num"]),
                            "status": "pending"})
    originals = data["original_files"] if data else {p.relative_to(FACES).as_posix(): sha(p)
                 for folder in ("gemini", "gpt", "source/ready")
                 for p in (FACES / folder).rglob("*") if p.suffix in (".png", ".webp")}
    save({"date": "2026-10-16", "tool": "built-in image_gen", "scope": "chapters 1–4 normal units; base and elite portraits, no bosses",
          "style_references": ["source/ready/monster/1401.png", "source/ready/monster/1402.png"],
          "original_files": originals, "targets": targets})
    print(f"Registered {len(targets)} missing base and elite portraits")


def install(identity: str, generated: Path) -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    entry = next(e for e in data["targets"] if e["id"] == identity)
    archive = SESSION / "generated" / f"{identity}.png"
    master = FACES / f"source/ready/gpt/monster/{identity}.png"
    output = FACES / f"gpt/monster/{identity}.webp"
    if any(p.exists() for p in (archive, master, output)):
        raise FileExistsError(f"Preserving existing files for {identity}")
    with Image.open(generated) as opened:
        pixels = opened.convert("RGBA")
        if opened.width != opened.height or pixels.getchannel("A").getextrema() != (0, 255):
            raise ValueError("Expected a square portrait with genuine transparency")
        ready = pixels.resize((512, 512), Image.Resampling.LANCZOS)
    archive.parent.mkdir(parents=True, exist_ok=True)
    master.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(generated, archive)
    ready.save(master)
    game, size = export_one(master, 256, "gpt")
    entry.update(status="installed", generated=archive.relative_to(FACES).as_posix(),
                 ready=master.relative_to(FACES).as_posix(), game=game.relative_to(FACES).as_posix(),
                 generated_sha256=sha(archive), ready_sha256=sha(master), game_sha256=sha(game), game_bytes=size)
    save(data)
    print(f"Installed {identity}: {size:,} bytes")


def verify() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for relative, expected in data["original_files"].items():
        if "/monster/" not in relative:
            continue  # Other sessions may update hero art while this monster batch runs.
        assert sha(FACES / relative) == expected, f"Original changed: {relative}"
    for entry in data["targets"]:
        if entry["status"] != "installed":
            continue
        for key, size in (("generated", None), ("ready", 512), ("game", 256)):
            path = FACES / entry[key]
            assert sha(path) == entry[f"{key}_sha256"], entry["id"]
            with Image.open(path) as opened:
                assert opened.convert("RGBA").getchannel("A").getextrema() == (0, 255), path
                if size:
                    assert opened.size == (size, size), path
    write_index()
    installed = sum(e["status"] == "installed" for e in data["targets"])
    preserved = sum("/monster/" in p for p in data["original_files"])
    print(f"Verified {installed}/{len(data['targets'])} new portraits; {preserved} original monster files unchanged")


def collect() -> None:
    for result in sorted((SESSION / "results").glob("*.json")):
        record = json.loads(result.read_text(encoding="utf-8"))
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        entry = next(e for e in data["targets"] if e["id"] == record["id"])
        if entry["status"] == "installed":
            continue
        if record.get("path"):
            install(record["id"], Path(record["path"]))
        else:
            entry.update(status="generation_failed", error=record.get("error", "No output"))
            save(data)


def compare() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    font = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 18)
    targets = sorted(data["targets"], key=lambda e: e["id"])
    width, card_w, card_h = 1000, 250, 290
    sheet = Image.new("RGB", (width, ((len(targets) + 3) // 4) * card_h), "#20232a")
    draw = ImageDraw.Draw(sheet)
    cards = []
    for slot, entry in enumerate(targets):
        x, y = (slot % 4) * card_w, (slot // 4) * card_h
        label = f"{entry['id']} {entry['name']}"
        draw.text((x + 10, y + 8), label, fill="white", font=font)
        if entry["status"] == "installed":
            with Image.open(FACES / entry["game"]) as opened:
                pixels = opened.convert("RGBA").resize((240, 240), Image.Resampling.LANCZOS)
            sheet.paste(pixels, (x + 5, y + 40), pixels)
            content = f'<img src="../../gpt/monster/{entry["id"]}.webp" alt="{html.escape(label)}">'
        else:
            draw.text((x + 20, y + 125), entry["status"], fill="#afb5bf", font=font)
            content = f'<p>{html.escape(entry["status"])}</p>'
        cards.append(f'<article><h2>{html.escape(label)}</h2>{content}</article>')
    sheet.save(SESSION / "preview.jpg", quality=92)
    gallery = '<!doctype html><html lang="ko"><meta charset="utf-8"><title>챕터 1–4 GPT 몬스터 초상</title><style>body{background:#20232a;color:#eee;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#292e37;padding:12px}h2{font-size:16px}img{width:100%;max-width:320px}</style><h1>챕터 1–4 GPT 일반형·정예형</h1><main>' + ''.join(cards) + '</main></html>'
    (SESSION / "gallery.html").write_text(gallery, encoding="utf-8")
    rows = [r for r in csv.DictReader((ROOT / "src/data/monster.csv").open(encoding="utf-8-sig", newline=""))
            if int(r["chapter"]) <= 4 and r["spawn_grade"] == "normal"]
    pair_cards = []
    circle_mask = Image.new("L", (196, 196), 0)
    ImageDraw.Draw(circle_mask).ellipse((0, 0, 195, 195), fill=255)
    for chapter in range(1, 5):
        chapter_rows = [r for r in rows if int(r["chapter"]) == chapter]
        board = Image.new("RGB", (1200, 4 * 250), "#20232a")
        circle_board = board.copy()
        painter = ImageDraw.Draw(board)
        circle_painter = ImageDraw.Draw(circle_board)
        for index, row in enumerate(chapter_rows):
            pair = []
            for variant, suffix in enumerate(("", "_elite")):
                identity = row["monster_idx"] + suffix
                x, y = (index % 3) * 400 + variant * 200, (index // 3) * 250
                label = f"{row['monster_idx']} {'정예' if suffix else '일반'}"
                painter.text((x + 5, y + 5), label, fill="white", font=font)
                circle_painter.text((x + 5, y + 5), label, fill="white", font=font)
                path = FACES / f"gpt/monster/{identity}.webp"
                if path.exists():
                    with Image.open(path) as opened:
                        portrait = opened.convert("RGBA").resize((196, 196), Image.Resampling.LANCZOS)
                    board.paste(portrait, (x + 2, y + 38), portrait)
                    circle_alpha = ImageChops.multiply(portrait.getchannel("A"), circle_mask)
                    circle_board.paste(portrait, (x + 2, y + 38), circle_alpha)
                    content = f'<img loading="lazy" src="../../gpt/monster/{identity}.webp" alt="{html.escape(label)}">'
                else:
                    painter.text((x + 10, y + 100), "미생성", fill="#aaa", font=font)
                    circle_painter.text((x + 10, y + 100), "미생성", fill="#aaa", font=font)
                    content = '<p>미생성</p>'
                pair.append(f'<figure><figcaption>{"정예" if suffix else "일반"}</figcaption>{content}</figure>')
            pair_cards.append(f'<article data-chapter="{chapter}"><h2>{chapter}-{row["stage_num"]} · {row["monster_idx"]} {html.escape(row["monster_name_kr"])}</h2><div class="pair">{"".join(pair)}</div></article>')
        board.save(SESSION / f"chapter_{chapter}.jpg", quality=94)
        circle_board.save(SESSION / f"chapter_{chapter}_circles.jpg", quality=94)
    gallery = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>챕터 1–4 GPT 일반·정예 비교</title><style>body{background:#20232a;color:#eee;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(370px,1fr));gap:16px}article{background:#292e37;padding:12px}article[hidden]{display:none}h2{font-size:16px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}figure{margin:0}figcaption{color:#bbb;margin-bottom:6px}img{width:100%;max-width:320px}select{padding:8px;background:#333;color:white}</style><h1>챕터 1–4 GPT 일반·정예 초상화</h1><label>챕터 <select aria-label="챕터"><option value="">전체</option><option>1</option><option>2</option><option>3</option><option>4</option></select></label><main>' + ''.join(pair_cards) + '</main><script>document.querySelector("select").addEventListener("change",e=>document.querySelectorAll("article").forEach(a=>a.hidden=!!e.target.value&&a.dataset.chapter!==e.target.value));</script></html>'
    (SESSION / "gallery.html").write_text(gallery, encoding="utf-8")
    print("Built preview.jpg and gallery.html")


def enable() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    installed = {e["id"] for e in data["targets"] if e["status"] == "installed"}
    csv_path = ROOT / "src/data/monster.csv"
    backup = SESSION / "monster.before.csv"
    if not backup.exists():
        shutil.copy2(csv_path, backup)
    lines = csv_path.read_bytes().decode("utf-8").splitlines(keepends=True)
    changed = 0
    for index, line in enumerate(lines):
        fields = line.split(",", 7)
        if len(fields) != 8:
            continue
        identity = fields[0]
        before = fields[5:7]
        for column, suffix in ((5, ""), (6, "_elite")):
            if identity + suffix in installed:
                fields[column] = "1"
        if fields[5:7] != before:
            lines[index] = ",".join(fields)
            changed += 1
    csv_path.write_bytes("".join(lines).encode("utf-8"))
    print(f"Enabled portraits in {changed} monster rows")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("init", "install", "verify", "compare", "enable", "collect"))
    parser.add_argument("--id")
    parser.add_argument("--generated", type=Path)
    args = parser.parse_args()
    if args.action == "install":
        if not args.id or not args.generated:
            parser.error("install requires --id and --generated")
        install(args.id, args.generated)
    else:
        {"init": initialize, "verify": verify, "compare": compare, "enable": enable, "collect": collect}[args.action]()


if __name__ == "__main__":
    main()
