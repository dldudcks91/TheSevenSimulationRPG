"""CSV 화면 표시 열(X_kr / X_en 쌍)을 번역 단위로 — 읽기 전용. 행 키 = 첫 열 값 + 행 번호."""
import csv, glob, io, json, os, sys
DATA = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')).replace(chr(92), '/') + '/src/data/'
SKIP = {'hero_unique_candidates.csv'}   # 화면에 안 나온다(적재만 · 조사 노트 §2-3)
out = []
stats = {}
for path in sorted(glob.glob(DATA + '*.csv')):
    name = os.path.basename(path)
    if name in SKIP:
        continue
    text = open(path, encoding='utf-8-sig').read()
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        continue
    head = rows[0]
    stems = [h[:-3] for h in head if h.endswith('_en') and (h[:-3] + '_kr') in head]
    if not stems:
        continue
    for ri, r in enumerate(rows[1:], start=2):
        if not r or all(c == '' for c in r):
            continue
        rec = dict(zip(head, r))
        rid = r[0]
        for st in stems:
            ko, en = rec.get(st + '_kr', ''), rec.get(st + '_en', '')
            zh = rec.get(st + '_zh')
            if zh:            # 이미 있음
                continue
            if ko in ('', '-') and en in ('', '-'):
                continue
            out.append({'f': name, 'line': ri, 'id': rid, 'col': st, 'ko': ko, 'en': en})
            stats[(name, st)] = stats.get((name, st), 0) + 1
json.dump(out, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('units', len(out), 'ko chars', sum(len(u['ko']) for u in out), 'columns', len(stats))
for (f, c), n in sorted(stats.items()):
    print(f'{f}:{c} {n}')
