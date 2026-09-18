import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
rows = {}
issues = []
for path in sorted((ROOT/'src/data').glob('*.csv')):
    parsed = list(csv.reader(path.read_text(encoding='utf-8-sig').splitlines(), strict=True))
    head = parsed[0]
    data = parsed[1:]
    for i, row in enumerate(data, 2):
        if len(row) != len(head): issues.append({'file':path.name,'line':i,'kind':'width','expected':len(head),'actual':len(row)})
    if len(head) != len(set(head)): issues.append({'file':path.name,'kind':'duplicate headers'})
    rows[path.stem] = [dict(zip(head,r)) for r in data]
    for col in head:
        if col.endswith('_kr') and col[:-3]+'_en' not in head:
            if col not in ['description_kr']: issues.append({'file':path.name,'kind':'missing English column','column':col})

composite = {'stage_round':['round_set','round_num'],'armor_group':['slot','group_id'],'tactic_option':['option_id','grade']}
# Option tables have repeated stat/family/sin by design. Check explicit identity columns elsewhere.
skip = {'weapon_sin_option','weapon_common_option','armor_sin_option','armor_common_option'}
for name, data in rows.items():
    if name in skip or not data: continue
    fields = composite.get(name, [next(iter(data[0]))])
    keys = [tuple(row.get(k) for k in fields) for row in data]
    duplicate = [k for k,n in Counter(keys).items() if n>1]
    if duplicate: issues.append({'file':name,'kind':'candidate duplicate key (review schema)','fields':fields,'keys':duplicate})

source = (ROOT/'src/ui/data.js').read_text(encoding='utf-8')
files_block = re.search(r'export const FILES\s*=\s*\[([\s\S]*?)\];',source)[1]
files = re.findall(r"'([^']+)'",files_block)
deps={}
for path in (ROOT/'src/game_logic').glob('*.js'):
    code = re.sub(r'/\*[\s\S]*?\*/','',path.read_text(encoding='utf-8'))
    code = re.sub(r'//[^\n]*','',code)
    deps[path.name] = re.findall(r"from\s+['\"]([^'\"]+)",code)
    forbidden = re.findall(r'\b(?:Math\.random\s*\(|Date\.\w+|new\s+Date\s*\(|document\.|window\.|localStorage\.|fetch\s*\()',code)
    if forbidden: issues.append({'file':path.name,'kind':'forbidden dependency','matches':forbidden})

balance={r['key'] for r in rows['balance']}
referenced=set()
for path in (ROOT/'src/game_logic').glob('*.js'):
    code = re.sub(r'/\*[\s\S]*?\*/','',path.read_text(encoding='utf-8'))
    code = re.sub(r'//[^\n]*','',code)
    found=set(re.findall(r'\bB\.([A-Za-z_]\w*)',code))
    referenced|=found
    absent=sorted(found-balance)
    if absent:issues.append({'file':path.name,'kind':'missing balance key','keys':absent})

result={'csvCount':len(rows),'csvRows':{k:len(v) for k,v in rows.items()},'loaderCount':len(files),
        'unloaded':sorted(set(rows)-set(files)),'missingFiles':sorted(set(files)-set(rows)),
        'balanceCount':len(balance),'literalReferencedBalanceCount':len(referenced),'logicImports':deps,'issues':issues}
(OUT/'static.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
