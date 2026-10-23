"""Where does time to the chapter-1 boss go? python why_slow.py <scale> <name> [name ...]"""
import json
import statistics as st
import sys
from collections import Counter, defaultdict
from pathlib import Path

S = Path(__file__).resolve().parent
SCALE = float(sys.argv[1])
rows = []
for name in sys.argv[2:]:
    rows += json.loads((S / "sim_out" / (name + ".json")).read_text(encoding="utf-8"))["rows"]
by_seed = defaultdict(list)
for r in rows:
    by_seed[r["seed"]].append(r)
for rs in by_seed.values():
    prev = 0.0
    for r in rs:
        r["dur"] = SCALE * (r["t"] - prev) / 60
        prev = r["t"]

done = [s for s, rs in by_seed.items() if any(r["stageId"] == 1051 and r["won"] for r in rs)]
order = sorted({r["stageId"] for r in rows})
print(f"seeds that beat 1051: {len(done)}/{len(by_seed)}")
print()
print("== time by stage (seeds that beat 1051) : median min | share of total | lost-run share | runs median ==")
tot = sum(r["dur"] for s in done for r in by_seed[s])
for sid in order:
    per = [sum(r["dur"] for r in by_seed[s] if r["stageId"] == sid) for s in done]
    lost = sum(r["dur"] for s in done for r in by_seed[s] if r["stageId"] == sid and not r["won"])
    allt = sum(per)
    runs = [sum(1 for r in by_seed[s] if r["stageId"] == sid) for s in done]
    print(f"  {sid} | {round(st.median(per), 1)} | {round(100 * allt / tot)}% | {round(100 * lost / max(allt, 1e-9))}% | {st.median(runs)}")
print()
print("== where lost runs die (rounds cleared before wipe; 9 rounds; III round 9 = stage boss) ==")
for sid in order:
    lost = [r for r in rows if r["stageId"] == sid and not r["won"]]
    if not lost:
        continue
    c = Counter(r["cleared"] for r in lost)
    n = len(lost)
    top = ", ".join(f"r{k + 1}:{round(100 * v / n)}%" for k, v in sorted(c.items()))
    print(f"  {sid} lost {n} | died at {top}")
print()
print("== what precedes a win after >=2 losses: gear change in previous run vs base rate, level gained ==")
for sid in order:
    after_eq = base_eq = base_n = 0
    wins = 0
    lv_gain, eq_count = [], []
    for s, rs in by_seed.items():
        k = [r for r in rs if r["stageId"] == sid]
        w = next((i for i, r in enumerate(k) if r["won"]), None)
        if w is None or w < 2:
            continue
        wins += 1
        idx = rs.index(k[w])
        prev = rs[idx - 1]
        after_eq += 1 if prev["equips"] > 0 else 0
        for r in k[:w - 1]:
            base_n += 1
            base_eq += 1 if r["equips"] > 0 else 0
        lv_gain.append(k[w]["lvBefore"] - k[0]["lvBefore"])
        eq_count.append(sum(r["equips"] for r in k[:w]))
    if wins:
        print(f"  {sid} stuck-then-won seeds {wins} | win right after a gear change {round(100 * after_eq / wins)}%"
              f" | gear change after a losing run (base) {round(100 * base_eq / max(base_n, 1))}%"
              f" | Lv gained while stuck median {st.median(lv_gain)} | items equipped while stuck median {st.median(eq_count)}")
print()
print("== drops & equips per run by stage (all runs) ==")
for sid in order:
    rs = [r for r in rows if r["stageId"] == sid]
    print(f"  {sid} drops/run {round(st.mean(r['drops'] for r in rs), 2)} | equips/run {round(st.mean(r['equips'] for r in rs), 2)}"
          f" | won {round(st.mean(r['drops'] for r in rs if r['won']), 2) if any(r['won'] for r in rs) else '-'} / lost {round(st.mean(r['drops'] for r in rs if not r['won']), 2) if any(not r['won'] for r in rs) else '-'} drops")
