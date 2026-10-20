"""Copy working-copy src (minus assets) into scratch/snap so parallel sessions can't change it mid-run."""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(r"C:\Users\user\Desktop\python_text\git\TheSevenSimulationRPG")
OUT = Path(__file__).resolve().parent
dest = OUT / "snap"
if dest.exists():
    shutil.rmtree(dest)
rows = {}
for folder in ["ui", "game_logic", "data", "dev"]:
    for src in (ROOT / "src" / folder).rglob("*"):
        if not src.is_file():
            continue
        rel = src.relative_to(ROOT)
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        payload = src.read_bytes()
        target.write_bytes(payload)
        rows[rel.as_posix()] = {"sha256": hashlib.sha256(payload).hexdigest(), "mtime_ns": src.stat().st_mtime_ns}
for src in (ROOT / "src").glob("*"):
    if src.is_file():
        target = dest / "src" / src.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, target)
        rows[src.relative_to(ROOT).as_posix()] = {"sha256": hashlib.sha256(src.read_bytes()).hexdigest(), "mtime_ns": src.stat().st_mtime_ns}
(OUT / "snap_manifest.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
print(json.dumps({"files": len(rows), "changed_during_copy": [r for r, v in rows.items() if (ROOT / r).stat().st_mtime_ns != v["mtime_ns"]]}))
