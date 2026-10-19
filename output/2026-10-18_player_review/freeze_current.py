import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
dest = OUT/'current_snapshot'
rows = {}
for folder in ['ui','game_logic','data','dev']:
    for src in (ROOT/'src'/folder).rglob('*'):
        if not src.is_file(): continue
        rel = src.relative_to(ROOT)
        target = dest/rel
        target.parent.mkdir(parents=True,exist_ok=True)
        payload = src.read_bytes()
        target.write_bytes(payload)
        rows[rel.as_posix()]={'sha256':hashlib.sha256(payload).hexdigest(),'mtime_ns':src.stat().st_mtime_ns}
for src in (ROOT/'src').glob('*'):
    if src.is_file():
        target = dest/'src'/src.name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(src,target)
        rows[src.relative_to(ROOT).as_posix()]={'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'mtime_ns':src.stat().st_mtime_ns}
(OUT/'current_manifest.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
print(json.dumps({'files':len(rows),'changed_during_copy':[r for r,v in rows.items() if (ROOT/r).stat().st_mtime_ns!=v['mtime_ns']]}))
