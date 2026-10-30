import csv
import collections
import pathlib
import re
import json
import sys

root = pathlib.Path('src/data')
allitems = []
for p in root.glob('*.csv'):
    for i, r in enumerate(csv.DictReader(p.open(encoding='utf-8-sig')), 2):
        for k, v in r.items():
            if k and k.endswith('_kr') and k != 'description_kr' and v and re.search('[가-힣]', v):
                allitems.append((p.name, i, k, v))
if len(sys.argv) > 1 and sys.argv[1] == '--endings':
    endings = collections.Counter()
    for p, i, k, v in allitems:
        if p == 'hero_unique_candidates.csv':
            continue
        endings.update(re.findall(r'[가-힣]+(?=[.!?。…”’"(]|\\n|$)', v))
    print('\n'.join(f'{w} {c}' for w, c in endings.most_common() if not w.endswith(('니다', '세요'))))
    sys.exit(0)
if len(sys.argv) > 1:
    selected = set(sys.argv[1:])
    for p, i, k, v in allitems:
        if p in selected and ('다' in v or '?' in v):
            print(p, i, k, v)
    sys.exit(0)
words = collections.Counter()
fields = collections.Counter()
for p, i, k, v in allitems:
    words.update(re.findall(r'[가-힣]+다(?=[.!?。…”’"\\ ]|$)', v))
    fields.update([p])
print(fields)
print('\n'.join(f'{w} {c}' for w, c in words.most_common()))
