"""Capture a read-only product baseline and prepare isolated experiment code."""
import datetime
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SNAP = BASE / 'snapshot/src'
if (BASE / 'source_manifest.json').exists():
    raise SystemExit('Already captured; do not replace experiment inputs.')
files = {}
for path in (ROOT / 'src').rglob('*'):
    if not path.is_file() or path.suffix.lower() not in {'.js', '.json', '.csv', '.html', '.css'}:
        continue
    key = path.relative_to(ROOT / 'src').as_posix()
    raw = path.read_bytes()
    target = SNAP / key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    files[key] = {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
manifest = {'captured_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'source': str(ROOT / 'src'), 'files': files}
(BASE / 'source_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
harness = BASE / 'harness'
harness.mkdir(exist_ok=True)
old = ROOT / 'output/2026-10-30_active_first_boss/harness'
for name in ['active.js', 'observer.js']:
    (harness / name).write_bytes((old / name).read_bytes())
print(json.dumps({'files': len(files), 'source': str(SNAP)}))
