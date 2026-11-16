"""Aggregate probe/books_*.json -> analysis_books.txt (numbers only, no conclusions)."""
import json, statistics as st
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent
rows, skips = [], Counter()
for f in sorted((BASE / 'probe').glob('books_*.json')):
    r = json.loads(f.read_text(encoding='utf-8'))
    if 'skip' in r: skips[(r['policy'], r['skip'])] += 1; continue
    rows.append(r)
V = ['base', 'book', 'bookBest', 'all', 'all_book', 'all_gold30_book', 'all_gold30_bookBest']
out = []; p = out.append
med = lambda xs: round(st.median(xs), 3) if xs else None
mean = lambda xs: round(sum(xs) / len(xs), 3) if xs else None
p(f'accounts probed: {len(rows)}  (basic {sum(r["policy"]=="basic" for r in rows)} / adaptive {sum(r["policy"]=="adaptive" for r in rows)})  skips {dict(skips)}')
p(f'already had a book skill at D60: {sum(any(b for b in r["bookSkill"]) for r in rows)}')
inj = Counter(x.get('injected') for r in rows for x in r['variants']['book']['log'].get('book', []) if 'id' in x)
p(f'book variant: lv10 book found in inventory {inj.get(False,0)} / injected {inj.get(True,0)} / skipped {sum(1 for r in rows for x in r["variants"]["book"]["log"].get("book", []) if "skip" in x)}')
def table(sub, title):
    p(f'\n== {title} (n={len(sub)})')
    p(f'{"variant":<20} {"median":>6} {"mean":>6} {">=50%":>6} {">=25%":>6} {"<=10%":>6} {"=0":>4} {"up":>4} {"down":>5} {"errs":>4}')
    for v in V:
        rates = [r['variants'][v]['rate'] for r in sub]; base = [r['variants']['base']['rate'] for r in sub]
        up = sum(a > b for a, b in zip(rates, base)); down = sum(a < b for a, b in zip(rates, base))
        p(f'{v:<20} {med(rates):>6} {mean(rates):>6} {sum(x>=.5 for x in rates):>6} {sum(x>=.25 for x in rates):>6} {sum(x<=.1 for x in rates):>6} {sum(x==0 for x in rates):>4} {up:>4} {down:>5} {sum(r["variants"][v]["errors"] for r in sub):>4}')
table(rows, 'all probed')
table([r for r in rows if r['seed'] <= 40], 'seeds 1-40')
table([r for r in rows if r['seed'] > 40], 'seeds 41-80')

p('\n== composition -> mean rate per variant')
by = defaultdict(list)
for r in rows: by['+'.join(sorted(r['classes']))].append(r)
p(f'{"combo":<24} {"n":>3} ' + ' '.join(f'{v[:10]:>10}' for v in V))
for k, sub in sorted(by.items(), key=lambda kv: mean([r['variants']['base']['rate'] for r in kv[1]])):
    p(f'{k:<24} {len(sub):>3} ' + ' '.join(f'{mean([r["variants"][v]["rate"] for r in sub]):>10}' for v in V))

p('\n== class presence -> mean rate (base / book / all_book / all_gold30_book)')
for c in ['warrior', 'knight', 'mage', 'archer', 'priest']:
    w = [r for r in rows if c in r['classes']]; wo = [r for r in rows if c not in r['classes']]
    f = lambda s: ' / '.join(str(mean([r['variants'][v]['rate'] for r in s])) for v in ['base', 'book', 'all_book', 'all_gold30_book'])
    p(f'{c:<8} with n={len(w):>2} {f(w)}   without n={len(wo):>2} {f(wo)}')

p('\n== lv10 book id -> mean (book - base) gain, by class')
gain = defaultdict(list)
for r in rows:
    d = r['variants']['book']['rate'] - r['variants']['base']['rate']
    for x in r['variants']['book']['log'].get('book', []):
        if 'id' in x: gain[(x['cls'], x['id'])].append(d)
for (c, i), xs in sorted(gain.items()): p(f'{c:<8} {i:<20} n={len(xs):>2} mean gain {mean(xs)}')

p('\n== bookBest picks (by class)')
pk = Counter((x['cls'], x['id'], x['id'] == x.get('lv10')) for r in rows for x in r['variants']['bookBest']['log'].get('bookBest', []) if 'id' in x)
for (c, i, same), n in sorted(pk.items()): p(f'{c:<8} {i:<20} {"=lv10" if same else "other"} {n}')

p('\n== still <=10% under all_gold30_book')
for r in sorted(rows, key=lambda r: r['variants']['all_gold30_book']['rate']):
    v = r['variants']
    if v['all_gold30_book']['rate'] > .1: break
    p(f'{r["policy"]:<8} s{r["seed"]:<3} {"+".join(r["classes"]):<22} lv{r["levels"]} innate {r["innate"]} lv10 {r["lv10Book"]} '
      f'base {v["base"]["rate"]} book {v["book"]["rate"]} all_book {v["all_book"]["rate"]} g30book {v["all_gold30_book"]["rate"]} g30best {v["all_gold30_bookBest"]["rate"]} left {v["all_gold30_book"]["bossLeft"]}')
(BASE / 'analysis_books.txt').write_text('\n'.join(out), encoding='utf-8')
print('\n'.join(out))
