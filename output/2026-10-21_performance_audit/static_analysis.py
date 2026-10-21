from pathlib import Path
import json,re,gzip,collections,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
seen=set();missing=[]
def walk(p):
    p=p.resolve()
    if p in seen:return
    if not p.exists():missing.append(str(p));return
    seen.add(p)
    t=p.read_text(encoding='utf-8')
    for s in re.findall(r'(?:\bfrom\s*|\bimport\s*)[\'"]([^\'"]+)[\'"]',t):
        if s.startswith('.'):walk(p.parent/s)
walk(ROOT/'src/ui/app.js')
modules=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'gzip_bytes':len(gzip.compress(p.read_bytes())),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(seen)]
files=json.loads((OUT/'files.json').read_text(encoding='utf-8'))
imgs=json.loads((OUT/'images.json').read_text(encoding='utf-8'))
assets=[r for r in files if r['path'].startswith('src/assets/')]
source=lambda r:any('source' in part for part in r['path'].split('/'))
runtime=[r for r in imgs if r['path'].startswith('src/assets/') and not source(r)]
errors=[]
for r in runtime:
    try:
        with Image.open(ROOT/r['path']) as im:im.load()
    except Exception as e:errors.append({'path':r['path'],'error':str(e)})
sizes=collections.Counter((r['width'],r['height']) for r in runtime)
text=(ROOT/'src/ui/data.js').read_text(encoding='utf-8')
block=text.split('export const FILES = [',1)[1].split('];',1)[0]
block=re.sub(r'//[^\n]*','',block)
csvfiles=re.findall(r"'([^']+)'",block)
loaded_data=[r for r in json.loads((OUT/'data.json').read_text(encoding='utf-8')) if r['path'] in {f'src/data/{n}.csv' for n in csvfiles}]
fx_groups=collections.defaultdict(lambda:dict(count=0,bytes=0,rgba_bytes=0))
for r in runtime:
    if '/fx/skills/' in r['path']:
        tail=r['path'].split('/fx/skills/')[1].split('/')
        key=tail[0] if len(tail)>1 else '(root)'
        for k,v in [('count',1),('bytes',r['bytes']),('rgba_bytes',r['rgba_bytes'])]:fx_groups[key][k]+=v
out={'modules':modules,'module_count':len(modules),'module_bytes':sum(r['bytes'] for r in modules),'module_gzip_bytes':sum(r['gzip_bytes'] for r in modules),'missing_imports':missing,'asset_source_files':sum(source(r) for r in assets),'asset_source_bytes':sum(r['bytes'] for r in assets if source(r)),'non_source_asset_files':sum(not source(r) for r in assets),'non_source_asset_bytes':sum(r['bytes'] for r in assets if not source(r)),'non_source_image_count':len(runtime),'non_source_image_bytes':sum(r['bytes'] for r in runtime),'decoded_errors':errors,'image_sizes':[{'width':k[0],'height':k[1],'count':v} for k,v in sizes.most_common(15)],'loaded_csv_count':len(loaded_data),'loaded_csv_bytes':sum(r['bytes'] for r in loaded_data),'loaded_csv_rows':sum(r['rows'] for r in loaded_data),'loaded_csv_gzip_bytes':sum(r['gzip_bytes'] for r in loaded_data),'fx_groups':dict(fx_groups)}
(OUT/'static_analysis.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in out.items() if k not in {'modules','image_sizes','fx_groups'}},ensure_ascii=False,indent=2))
