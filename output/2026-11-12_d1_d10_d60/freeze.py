"""Freeze executable sources (js/json/csv/html/css) into snap_<kind>/src without touching product files.
Usage: python freeze.py head   (git HEAD blobs)
       python freeze.py wt     (working tree as of now)
"""
import datetime, hashlib, json, subprocess, sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
KIND = sys.argv[1]
SNAP = BASE / f'snap_{KIND}' / 'src'
MAN = BASE / f'manifest_{KIND}.json'
if MAN.exists():
    raise SystemExit(f'{KIND} already frozen')
SUF = {'.js', '.json', '.csv', '.html', '.css'}
files = {}
if KIND == 'head':
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    names = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', 'HEAD', 'src'], cwd=ROOT).decode('utf-8').splitlines()
    for n in names:
        if Path(n).suffix.lower() not in SUF:
            continue
        data = subprocess.check_output(['git', 'show', f'HEAD:{n}'], cwd=ROOT)
        key = n[len('src/'):]
        t = SNAP / key; t.parent.mkdir(parents=True, exist_ok=True); t.write_bytes(data)
        files[key] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
else:
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    for p in (ROOT / 'src').rglob('*'):
        if not p.is_file() or p.suffix.lower() not in SUF:
            continue
        key = p.relative_to(ROOT / 'src').as_posix()
        data = p.read_bytes()
        t = SNAP / key; t.parent.mkdir(parents=True, exist_ok=True); t.write_bytes(data)
        files[key] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
                      'mtime': datetime.datetime.fromtimestamp(p.stat().st_mtime).isoformat(timespec='seconds')}
MAN.write_text(json.dumps({'kind': KIND, 'head': head, 'captured_at_local': datetime.datetime.now().isoformat(timespec='seconds'),
                           'files': files}, ensure_ascii=False, indent=1), encoding='utf-8')
print(json.dumps({'kind': KIND, 'head': head[:8], 'files': len(files)}))
