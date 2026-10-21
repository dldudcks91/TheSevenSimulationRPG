from pathlib import Path
import csv, hashlib, json, collections, re, gzip
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
files = []
images = []
data = []
code = []
exts = {'.png', '.webp', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.avif'}
for p in ROOT.rglob('*'):
    if not p.is_file() or any(s in {'.git', '__pycache__', 'node_modules'} for s in p.relative_to(ROOT).parts):
        continue
    name = p.relative_to(ROOT).as_posix()
    if name.startswith('output/2026-10-21_performance_audit/'):
        continue
    entry = {'path': name, 'bytes': p.stat().st_size, 'extension': p.suffix.lower()}
    files.append(entry)
    if p.suffix.lower() in exts:
        row = dict(entry)
        try:
            with Image.open(p) as im:
                row.update(width=im.width, height=im.height, mode=im.mode, frames=getattr(im, 'n_frames', 1), rgba_bytes=im.width*im.height*4)
            # Hash only game assets; avoid rereading historical outputs and snapshots.
            if name.startswith('src/assets/'):
                row['sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
        except Exception as e:
            row['error'] = str(e)
        images.append(row)
    if name.startswith('src/data/') and p.suffix == '.csv':
        try:
            raw = p.read_bytes()
            rows = list(csv.reader(raw.decode('utf-8-sig').splitlines()))
            data.append({**entry, 'rows': max(0,len(rows)-1), 'columns': len(rows[0]) if rows else 0, 'gzip_bytes':len(gzip.compress(raw))})
        except Exception as e:
            data.append({**entry, 'error': str(e)})
    if p.suffix in {'.js','.css','.html','.py'} and not name.startswith(('output/','docs/','_scratch/')):
        raw = p.read_bytes()
        txt = raw.decode('utf-8-sig', errors='replace')
        code.append({**entry,'lines':len(txt.splitlines()),'gzip_bytes':len(gzip.compress(raw)), **{key:len(re.findall(pattern,txt)) for key,pattern in {'innerHTML':r'\.innerHTML\s*=', 'timers':r'\b(?:setInterval|setTimeout|requestAnimationFrame)\(', 'layout_reads':r'getBoundingClientRect\(|\.(?:offsetWidth|offsetHeight|scrollHeight)\b', 'json_clone':r'JSON\.parse\(JSON\.stringify', 'array_filter':r'\.filter\('}.items()}})

for name,rows in [('files',files),('images',images),('data',data),('code',code)]:
    (OUT/f'{name}.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    keys=list(dict.fromkeys(k for row in rows for k in row))
    with (OUT/f'{name}.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(rows)
groups = collections.defaultdict(lambda: {'files':0,'bytes':0})
for r in files:
    parts=r['path'].split('/')
    key='/'.join(parts[:3]) if parts[0]=='src' and len(parts)>3 else parts[0]
    groups[key]['files']+=1;groups[key]['bytes']+=r['bytes']
hashes=collections.defaultdict(list)
for r in images:
    if 'sha256' in r:hashes[r['sha256']].append(r)
dupes=[v for v in hashes.values() if len(v)>1]
summary={'file_count':len(files),'image_count':len(images),'bytes':sum(r['bytes'] for r in files),'groups':dict(sorted(groups.items(),key=lambda x:-x[1]['bytes'])),'largest_images':sorted(images,key=lambda r:-r['bytes'])[:25], 'duplicate_asset_groups':len(dupes),'duplicate_asset_bytes':sum(sum(r['bytes'] for r in v[1:]) for v in dupes),'image_errors':[r for r in images if 'error' in r]}
(OUT/'duplicates.json').write_text(json.dumps(dupes,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k not in {'largest_images','image_errors'}},ensure_ascii=False,indent=2))
