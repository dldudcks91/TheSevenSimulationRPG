"""Aggregate probe/levers_*.json -> analysis_output.txt (numbers only, no conclusions)."""
import json, statistics as st
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent
rows, skips = [], Counter()
for f in sorted((BASE / 'probe').glob('levers_*.json')):
    r = json.loads(f.read_text(encoding='utf-8'))
    if 'skip' in r: skips[(r['policy'], r['skip'])] += 1; continue
    rows.append(r)
V = ['base', 'mastery', 'potion', 'shop', 'upgrade', 'tactic', 'formation', 'all', 'all_gold30', 'lv6']
out = []
p = out.append
p(f'accounts probed: {len(rows)}  (basic {sum(r["policy"]=="basic" for r in rows)} / adaptive {sum(r["policy"]=="adaptive" for r in rows)})')
p(f'skips: {dict(skips)}')
med = lambda xs: round(st.median(xs), 3) if xs else None
mean = lambda xs: round(sum(xs) / len(xs), 3) if xs else None
def table(sub, title):
    p(f'\n== {title} (n={len(sub)})')
    p(f'{"variant":<11} {"median":>6} {"mean":>6} {">=50%":>6} {">=25%":>6} {"<=10%":>6} {"=0":>4} {"up_vs_base":>10} {"down":>5} {"errs":>4}')
    for v in V:
        rates = [r['variants'][v]['rate'] for r in sub]
        base = [r['variants']['base']['rate'] for r in sub]
        up = sum(a > b for a, b in zip(rates, base)); down = sum(a < b for a, b in zip(rates, base))
        errs = sum(r['variants'][v]['errors'] for r in sub)
        p(f'{v:<11} {med(rates):>6} {mean(rates):>6} {sum(x>=.5 for x in rates):>6} {sum(x>=.25 for x in rates):>6} {sum(x<=.1 for x in rates):>6} {sum(x==0 for x in rates):>4} {up:>10} {down:>5} {errs:>4}')
table(rows, 'all probed')
table([r for r in rows if r['seed'] <= 40], 'seeds 1-40')
table([r for r in rows if r['seed'] > 40], 'seeds 41-80')
table([r for r in rows if r['policy'] == 'basic'], 'policy basic')
table([r for r in rows if r['policy'] == 'adaptive'], 'policy adaptive')

p('\n== composition (sorted classes) -> mean rate per variant')
by = defaultdict(list)
for r in rows: by['+'.join(sorted(r['classes']))].append(r)
p(f'{"combo":<24} {"n":>3} ' + ' '.join(f'{v[:9]:>9}' for v in V))
for k, sub in sorted(by.items(), key=lambda kv: mean([r['variants']['all']['rate'] for r in kv[1]])):
    p(f'{k:<24} {len(sub):>3} ' + ' '.join(f'{mean([r["variants"][v]["rate"] for r in sub]):>9}' for v in V))

p('\n== class presence -> mean rate (base / all / all_gold30)')
for c in ['warrior', 'knight', 'mage', 'archer', 'priest']:
    w = [r for r in rows if c in r['classes']]; wo = [r for r in rows if c not in r['classes']]
    f = lambda s, v: mean([r['variants'][v]['rate'] for r in s])
    p(f'{c:<8} with n={len(w):>2} {f(w,"base")} / {f(w,"all")} / {f(w,"all_gold30")}   without n={len(wo):>2} {f(wo,"base")} / {f(wo,"all")} / {f(wo,"all_gold30")}')

p('\n== still <=10% under all_gold30')
for r in sorted(rows, key=lambda r: r['variants']['all_gold30']['rate']):
    if r['variants']['all_gold30']['rate'] > .1: break
    v = r['variants']
    p(f'{r["policy"]:<8} s{r["seed"]:<3} {"+".join(r["classes"]):<22} lv{r["levels"]} gold {r["gold"]} hourGold {r["hourGold"]} wIlvl {r["weaponIlvl"]} '
      f'base {v["base"]["rate"]} all {v["all"]["rate"]} g30 {v["all_gold30"]["rate"]} lv6 {v["lv6"]["rate"]} left(g30) {v["all_gold30"]["bossLeft"]}')

p('\n== resources at D60 (median)')
p(f'gold {med([r["gold"] for r in rows])}  hourGold {med([r["hourGold"] or 0 for r in rows])}  level {med([st.mean(r["levels"]) for r in rows])}  weapon ilvl {med([st.mean(r["weaponIlvl"]) for r in rows])}')
for m in ['iron_ore', 'timber', 'dust', 'herb']: p(f'  {m} {med([r["materials"].get(m,0) for r in rows])}')

p('\n== lever logs')
def L(v, k): return [r['variants'][v]['log'].get(k, {}) for r in rows]
for v in ['shop', 'all', 'all_gold30']:
    s = L(v, 'shop'); p(f'{v}: shop bought>=1 {sum(bool(x.get("bought")) for x in s)}/{len(s)}  offered weapon gold median {med([o["gold"] for x in s for o in x.get("offered",[])])}')
for v in ['upgrade', 'all', 'all_gold30']:
    s = L(v, 'upgrade'); p(f'{v}: upgrade tries median {med([x.get("tries",0) for x in s])} success median {med([x.get("success",0) for x in s])} gold median {med([x.get("gold",0) for x in s])} stop {Counter(x.get("stop",{}).get("weapon") for x in s)}')
for v in ['potion', 'all', 'all_gold30']:
    s = L(v, 'potion'); p(f'{v}: potion tier {Counter(x.get("tier") for x in s)} slots {Counter(x.get("slots") for x in s)}')
for v in ['tactic', 'all', 'all_gold30']:
    s = L(v, 'tactic'); p(f'{v}: tactic rerolls median {med([x.get("rerolls",0) for x in s])} open {Counter(x.get("open") for x in s)} mightGain median {med([x.get("mightGain",1) for x in s])}')
for v in ['formation', 'all', 'all_gold30']:
    s = L(v, 'formation'); p(f'{v}: formation changed {sum(x.get("startRanks")!=x.get("chosenRanks") or x.get("start")!=x.get("chosen",{}).get("tpl") for x in s)}/{len(s)} chosen {Counter(x.get("chosen",{}).get("tpl") for x in s)} start {Counter(x.get("start") for x in s)}')
p(f'all_gold30 gold added median {med([r["variants"]["all_gold30"]["log"].get("goldAdded",0) for r in rows])}')

p('\n== single lever: accounts where it is the best single lever')
single = ['mastery', 'potion', 'shop', 'upgrade', 'tactic', 'formation']
p(str(Counter(max(single, key=lambda v: r['variants'][v]['rate']) for r in rows if max(r['variants'][v]['rate'] for v in single) > r['variants']['base']['rate'])))
(BASE / 'analysis_output.txt').write_text('\n'.join(out), encoding='utf-8')
print('\n'.join(out))
