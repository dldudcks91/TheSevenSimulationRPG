"""Record generated art registry modules imported by frozen UI/mock.js."""
import hashlib,json
from pathlib import Path
out=Path(__file__).resolve().parent
root=out.parents[1]
manifest={}
for p in (root/'src'/'assets').rglob('*.js'):
    rel=p.relative_to(root/'src')
    target=out/'snapshot'/'src'/rel
    if target.exists():
        raise RuntimeError('Supplemental asset module already frozen: '+str(rel))
    body=p.read_bytes();target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(body)
    manifest[rel.as_posix()]={'sha256':hashlib.sha256(body).hexdigest(),'size':len(body)}
(out/'asset_module_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'supplemental_art_modules':len(manifest),'bytes':sum(x['size'] for x in manifest.values())}))
