"""Analyze sim_out/<name>.json: per-stage difficulty, per-combo spread, halves."""
import csv
import json
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

S = Path(__file__).resolve().parent
name = sys.argv[1]
until = int(sys.argv[2])
d = json.loads((S / "sim_out" / (name + ".json")).read_text(encoding="utf-8"))
rows = d["rows"]
meta = d["meta"]
dl = {r["stage_id"]: int(r["dlvl"]) for r in csv.DictReader(open(S / "snap/src/data/stage.csv", encoding="utf-8-sig"))}
seeds = sorted({r["seed"] for r in rows})
half = set(seeds[: (len(seeds) + 1) // 2])
by_seed = defaultdict(list)
for r in rows:
    by_seed[r["seed"]].append(r)

print("meta.bot:", meta.get("bot"))
print("meta.assume:", meta.get("assume"))
print()
print("== stage: dlvl | arriveLv | first-try win% (front/back) | per-run win% (front/back) | runs/seed | cleared seeds | med first-clear min")
order = []
for r in rows:
    if r["stageId"] not in order:
        order.append(r["stageId"])
order.sort()
for sid in order:
    tries = [r for r in rows if r["stageId"] == sid]
    first = {}
    for r in tries:
        first.setdefault(r["seed"], r)
    fc = {}
    for r in tries:
        if r["won"]:
            fc.setdefault(r["seed"], r)
    def pct(xs):
        return round(100 * sum(1 for x in xs if x["won"]) / len(xs), 1) if xs else None
    ft = list(first.values())
    print(sid, dl.get(str(sid)), "|", round(st.mean(x["lvBefore"] for x in ft), 1),
          "|", pct(ft), f"({pct([x for x in ft if x['seed'] in half])}/{pct([x for x in ft if x['seed'] not in half])})",
          "|", pct(tries), f"({pct([x for x in tries if x['seed'] in half])}/{pct([x for x in tries if x['seed'] not in half])})",
          "|", round(len(tries) / len(ft), 2), "|", f"{len(fc)}/{len(ft)}",
          "|", round(st.median([x["t"] / 60 for x in fc.values()]), 1) if fc else None)

print()
print("== combo: seeds | done | med min to", until, "| min..max | worst losing streak | per-run win% at", until)
combo = defaultdict(list)
for s, rs in by_seed.items():
    combo[tuple(sorted(rs[0]["classes"]))].append(s)
res = []
for c, ss in combo.items():
    mins, done, streak, bw, bn = [], 0, 0, 0, 0
    for s in ss:
        rs = by_seed[s]
        hit = next((r for r in rs if r["stageId"] == until and r["won"]), None)
        if hit:
            done += 1
            mins.append(hit["t"] / 60)
        cur = 0
        for r in rs:
            cur = 0 if r["won"] else cur + 1
            streak = max(streak, cur)
        b = [r for r in rs if r["stageId"] == until]
        bw += sum(1 for r in b if r["won"]); bn += len(b)
    res.append((st.median(mins) if mins else 9999, c, len(ss), done, mins, streak, round(100 * bw / bn, 1) if bn else None))
for med, c, n, done, mins, streak, bp in sorted(res):
    print(" · ".join(c), "|", n, "|", done, "|", round(med, 1) if mins else "-", "|",
          (round(min(mins), 1), round(max(mins), 1)) if mins else "-", "|", streak, "|", bp)

print()
allm = []
for s in seeds:
    hit = next((r for r in by_seed[s] if r["stageId"] == until and r["won"]), None)
    allm.append(hit["t"] / 60 if hit else None)
front = [m for s, m in zip(seeds, allm) if s in half and m is not None]
back = [m for s, m in zip(seeds, allm) if s not in half and m is not None]
print("first clear of", until, "median front/back:", round(st.median(front), 1) if front else None, round(st.median(back), 1) if back else None,
      "| not done:", sum(1 for m in allm if m is None), "| within 60 min:", sum(1 for m in allm if m is not None and m <= 60), "/", len(seeds))
w10 = sum(1 for s in seeds if any(r["won"] and r["t"] <= 600 for r in by_seed[s]))
print("seeds with a win in first 10 min:", w10, "/", len(seeds))
tot = len(rows); wins = sum(1 for r in rows if r["won"])
print("all runs:", tot, "wins:", wins, round(100 * wins / tot, 1), "%")
