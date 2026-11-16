"""python merge_parts.py <chunk이름> — chunks/<이름>.out.part*.json 을 합쳐 chunks/<이름>.out.json 으로(뒤 파트가 같은 key 를 덮는다)"""
import glob, json, os, re, sys
B = os.path.dirname(os.path.abspath(__file__))
name = sys.argv[1]
parts = sorted(glob.glob(f'{B}/chunks/{name}.out.part*.json'), key=lambda p: int(re.search(r'part(\d+)', p).group(1)))
out = {}
for p in parts:
    out.update(json.load(open(p, encoding='utf-8')))
json.dump(out, open(f'{B}/chunks/{name}.out.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(parts)} parts → {len(out)} keys')
