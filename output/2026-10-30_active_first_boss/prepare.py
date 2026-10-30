"""Freeze product inputs and preserve the previous observer without product edits."""
import datetime
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SNAP = BASE / 'snapshot/src'
if (BASE / 'source_manifest.json').exists():
    raise SystemExit('Inputs already captured.')
files = {}
for p in (ROOT / 'src').rglob('*'):
    if not p.is_file() or p.suffix.lower() not in {'.js', '.json', '.csv', '.html', '.css'}:
        continue
    key = p.relative_to(ROOT / 'src').as_posix()
    raw = p.read_bytes()
    dest = SNAP / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)
    files[key] = {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
manifest = {'captured_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'source': str(ROOT / 'src'), 'files': files}
(BASE / 'source_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
previous = ROOT / 'output/2026-10-30_early_d10_d60'
old = json.loads((previous / 'source_manifest.json').read_text(encoding='utf-8'))
diff = {k: {'before': old['files'].get(k), 'now': files.get(k)}
        for k in sorted(set(files) | set(old['files']))
        if files.get(k, {}).get('sha256') != old['files'].get(k, {}).get('sha256')}
(BASE / 'changes_from_previous.json').write_text(json.dumps(diff, ensure_ascii=False, indent=2), encoding='utf-8')
source = (previous / 'harness/fun_simulation.js').read_text(encoding='utf-8')
(BASE / 'harness').mkdir(exist_ok=True)
(BASE / 'harness/legacy_simulation.js').write_text(source, encoding='utf-8')
core = source.split('window.runFunQA=async function(')[0]
core = core.replace('function manage(c,t){', 'function legacyManage(c,t){')
core = core.replace('c.events.push({t:r3(t),kind,...detail});', 'c.events.push({t:r3(t),...detail,kind});')
core = core.replace("c.skills[h.uid]??=[]", "c.skills[h.uid]??=[]")
(BASE / 'harness/observer.js').write_text(core, encoding='utf-8')
print(json.dumps({'frozen_files': len(files), 'changes_from_previous': list(diff)}))
