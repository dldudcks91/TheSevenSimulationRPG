"""Freeze current gameplay/UI inputs once; never change product source files."""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
OUT = Path(sys.argv[1]).resolve() if len(sys.argv)>1 else BASE
SRC = ROOT / 'src'
DEST = OUT / 'snapshot' / 'src'
if DEST.exists():
    raise RuntimeError('Snapshot already exists; keep the original QA baseline')
manifest = {}
paths = [SRC / 'index.html']
for folder in ['game_logic', 'ui', 'data', 'dev']:
    paths.extend(p for p in (SRC/folder).rglob('*') if p.is_file()
                 and p.suffix in ['.js', '.csv', '.json', '.html', '.css'])
paths.extend((SRC/'assets').rglob('*.js'))
for p in sorted(paths):
    rel = p.relative_to(SRC)
    body = p.read_bytes()
    target = DEST / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(body)
    manifest[rel.as_posix()] = {'sha256': hashlib.sha256(body).hexdigest(), 'size': len(body)}
changed = [path for path, meta in manifest.items()
           if hashlib.sha256((SRC/path).read_bytes()).hexdigest() != meta['sha256']]
result = {'captured_at_utc': datetime.now(timezone.utc).isoformat(),
          'source': str(SRC), 'snapshot': str(DEST), 'files': manifest,
          'changed_during_capture': changed}
(OUT/'source_manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
if changed:
    raise RuntimeError(f'Source changed during snapshot capture: {changed}')
print(json.dumps({'captured_at_utc': result['captured_at_utc'], 'files': len(manifest),
                  'bytes': sum(x['size'] for x in manifest.values()), 'changed': changed}))
