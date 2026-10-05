"""Restore the pre-sheet warrior sprites and their original display definitions.

Keeps the new sheet, prepared images, and the replaced active files for later review.
Run: python scripts/restore_warrior_skill_fx.py
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/warrior_sheet_20261006"
BACKUP = SOURCE / "previous"
OUT = ROOT / "src/assets/art/fx/skills"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest = json.loads((BACKUP / "manifest.json").read_text(encoding="utf-8"))
    for name, expected in manifest["warrior_files"].items():
        if digest(BACKUP / "skills" / name) != expected:
            raise ValueError(f"Backup hash mismatch: {name}")
    definition_path = ROOT / "src/ui/skill_art.js"
    current = definition_path.read_bytes().decode("utf-8")
    previous = (BACKUP / "ui/skill_art.js").read_bytes().decode("utf-8")
    restored = current
    for name in manifest["warrior_files"]:
        sid = Path(name).stem
        pattern = rf"(?m)^    {re.escape(sid)}: [^\r\n]*"
        old = re.findall(pattern, previous)
        if len(old) != 1 or len(re.findall(pattern, current)) != 1:
            raise ValueError(f"Expected one definition for {sid}")
        restored = re.sub(pattern, lambda match, replacement=old[0]: replacement, restored)
    restored = re.sub(r"(?m)^    // 전사 시트는 칸 전체가 초상 틀이다\. 아래 변·양옆·귀퉁이의 자리를 보존한다\.\r?\n", "", restored)
    restored = restored.replace("ADR-0515 · ADR-0520 · ADR-0527", "ADR-0515 · ADR-0520 · ADR-0528")
    other_before = {path.name: digest(path) for path in OUT.glob("*.webp") if path.name not in manifest["warrior_files"]}
    archive = SOURCE / "restored_legacy_20261006"
    if not archive.exists():
        (archive / "replaced/skills").mkdir(parents=True)
        (archive / "replaced/ui").mkdir()
        for name in manifest["warrior_files"]:
            shutil.copy2(OUT / name, archive / "replaced/skills" / name)
        for name in ("skill_art.js", "fx.js", "style.css"):
            shutil.copy2(ROOT / "src/ui" / name, archive / "replaced/ui" / name)
        shutil.copy2(SOURCE / "prompts.json", archive / "replaced/prompts.json")
    for name in manifest["warrior_files"]:
        shutil.copy2(BACKUP / "skills" / name, OUT / name)
    definition_path.write_bytes(restored.encode("utf-8"))
    for name, expected in manifest["warrior_files"].items():
        if digest(OUT / name) != expected:
            raise ValueError(f"Restored image mismatch: {name}")
    for name, expected in other_before.items():
        if digest(OUT / name) != expected:
            raise ValueError(f"Unrelated image changed: {name}")
    sources = json.loads((SOURCE / "prompts.json").read_text(encoding="utf-8"))
    sources["installed"] = False
    sources["last_action"] = "restored legacy warrior sprites and display definitions"
    sources["legacy_restored_on"] = "2026-10-06"
    (SOURCE / "prompts.json").write_text(json.dumps(sources, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {"date": "2026-10-06", "restored": manifest["warrior_files"], "unchanged_other_images": len(other_before), "new_sheet_retained": True, "new_active_files_archived": str(archive / "replaced"), "display_definitions_restored": 8}
    (archive / "restoration.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=True))


if __name__ == "__main__":
    main()
