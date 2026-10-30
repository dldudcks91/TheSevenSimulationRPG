"""Capture reviewable QA inputs without changing product sources."""
import datetime
import hashlib
import json
import shutil
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SNAP = BASE / 'snapshot' / 'src'
if (BASE / 'source_manifest.json').exists():
    raise SystemExit('Already frozen; use the existing captured inputs.')
files = {}
for path in (ROOT / 'src').rglob('*'):
    if not path.is_file() or path.suffix.lower() not in {'.js', '.json', '.csv', '.html', '.css'}:
        continue
    key = path.relative_to(ROOT / 'src').as_posix()
    target = SNAP / key
    target.parent.mkdir(parents=True, exist_ok=True)
    data = path.read_bytes()
    target.write_bytes(data)
    files[key] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
manifest = {'captured_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'source': str(ROOT / 'src'), 'files': files,
            'note': 'All executable JS, CSV, JSON, HTML and CSS frozen, including asset registries; bitmap assets served read-only from workspace.'}
(BASE / 'source_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
(BASE / 'harness').mkdir(exist_ok=True)
old = ROOT / 'output/2026-10-30_fun_qa/harness'
for name in ['run_fun.py', 'fun_simulation.js']:
    shutil.copyfile(old / name, BASE / 'harness' / name)
print(json.dumps({'captured': len(files), 'bytes': sum(x['bytes'] for x in files.values()), 'base': str(BASE)}))
