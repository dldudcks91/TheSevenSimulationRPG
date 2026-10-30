"""Compare frozen QA versions; classify CSV cell changes without modifying either."""
import csv,hashlib,json
from pathlib import Path

HERE=Path(__file__).resolve().parent
OLD=HERE.parent/'snapshot'/'src'
NEW=HERE/'snapshot'/'src'
changes={}
for old in OLD.rglob('*'):
    if not old.is_file(): continue
    rel=old.relative_to(OLD);new=NEW/rel
    if not new.exists() or old.read_bytes()==new.read_bytes():continue
    info={'old_sha256':hashlib.sha256(old.read_bytes()).hexdigest(),'new_sha256':hashlib.sha256(new.read_bytes()).hexdigest()}
    if old.suffix=='.csv':
        a=list(csv.reader(old.read_text(encoding='utf-8-sig').splitlines()))
        b=list(csv.reader(new.read_text(encoding='utf-8-sig').splitlines()))
        info['old_rows']=len(a)-1;info['new_rows']=len(b)-1
        info['cells']=[{'row':i,'id':x[0] if x else None,'column':a[0][j] if j<len(a[0]) else j,'old':v,'new':w}
                       for i,(x,y) in enumerate(zip(a[1:],b[1:]),1)
                       for j,(v,w) in enumerate(zip(x,y)) if v!=w]
        info['changed_columns']=sorted({str(c['column']) for c in info['cells']})
    changes[rel.as_posix()]=info
(HERE/'changes_from_primary.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({p:info.get('changed_columns','code/style/test change') for p,info in changes.items()},ensure_ascii=True,indent=2))
