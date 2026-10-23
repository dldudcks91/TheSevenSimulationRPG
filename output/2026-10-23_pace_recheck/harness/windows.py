"""First-10/30/60-minute windows from campaign sims: python windows.py <scale> <name> [name ...]"""
import csv
import json
import statistics as st
import sys
from collections import Counter, defaultdict
from pathlib import Path

S = Path(__file__).resolve().parent
SCALE = float(sys.argv[1])   # user minutes per sim minute
rows, meta = [], None
for name in sys.argv[2:]:
    d = json.loads((S / "sim_out" / (name + ".json")).read_text(encoding="utf-8"))
    rows += d["rows"]
    meta = meta or d["meta"]
restart = meta.get("knobs", {}).get("repeat_restart_sec")
stage_rows = list(csv.DictReader(open(S / "snap/src/data/stage.csv", encoding="utf-8-sig")))
dl = {int(r["stage_id"]): r.get("dlvl") for r in stage_rows}

def label(sid):
    s = str(sid)
    return f"{s[0]}-{s[2]} {['', 'I', 'II', 'III'][int(s[3])] if s[3] in '123' else s[3]}" if len(s) == 4 else s

by_seed = defaultdict(list)
for r in rows:
    by_seed[r["seed"]].append(r)
seeds = sorted(by_seed)
front = set(seeds[: len(seeds) // 2])
for s in seeds:
    rs = by_seed[s]
    prev = 0.0
    for r in rs:
        r["t0"] = SCALE * prev / 60
        r["t1"] = SCALE * r["t"] / 60
        prev = r["t"]

def per_seed(s, W):
    rs = by_seed[s]
    done = [r for r in rs if r["t1"] <= W]
    wins = [r for r in done if r["won"]]
    losses = [r for r in done if not r["won"]]
    clears = [r for r in wins]
    streak = cur = 0
    for r in done:
        cur = 0 if r["won"] else cur + 1
        streak = max(streak, cur)
    marks = [0.0] + [r["t1"] for r in clears] + [W]
    gaps = [(marks[i + 1] - marks[i], i) for i in range(len(marks) - 1)]
    gmax, gi = max(gaps)
    wall_stage = None
    nxt = [r for r in rs if r["t0"] >= marks[gi] - 1e-9]
    if nxt:
        wall_stage = nxt[0]["stageId"]
    after = [r for r in rs if r["t0"] >= W]
    lv = after[0]["lvBefore"] if after else (done[-1]["levels"] / 3 if done else None)
    first_win = next((r["t1"] for r in rs if r["won"]), None)
    reached = clears[-1]["stageId"] if clears else None
    return dict(runs=len(done), wins=len(wins), losses=len(losses), clears=len(clears), streak=streak,
                gap=gmax, wall=wall_stage, lv=lv, first_win=first_win, reached=reached,
                lossmin=sum(r["t1"] - r["t0"] for r in losses))

def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs), 1) if xs else None

def q(xs, p):
    xs = sorted(x for x in xs if x is not None)
    return round(xs[min(len(xs) - 1, int(p * (len(xs) - 1) + 0.5))], 1) if xs else None

print("meta.bot:", meta.get("bot"))
print("meta.assume:", meta.get("assume"))
print("meta.knobs:", meta.get("knobs"))
print("repeat_restart_sec:", restart, "| seeds:", len(seeds), "| rows:", len(rows), "| scale:", SCALE)
print()
fw = {s: per_seed(s, 10 ** 9)["first_win"] for s in seeds}
v = list(fw.values())
print(f"== first win (1-1 I clear) user-min: median {med(v)} | q1 {q(v, .25)} q3 {q(v, .75)} | p90 {q(v, .9)} | never {sum(1 for x in v if x is None)}"
      f" | front {med([fw[s] for s in seeds if s in front])} / back {med([fw[s] for s in seeds if s not in front])}"
      f" | within 5/10/20/30: {[sum(1 for x in v if x is not None and x <= w) for w in (5, 10, 20, 30)]}")
print()
for W in (10, 30, 60):
    res = {s: per_seed(s, W) for s in seeds}
    def stat(key, ss=seeds):
        return med([res[s][key] for s in ss])
    print(f"== first {W} min (median all | front/back) ==")
    for key in ("runs", "wins", "losses", "clears", "streak", "gap", "lv", "lossmin"):
        print(f"  {key:8s} {stat(key)} | {stat(key, [s for s in seeds if s in front])}/{stat(key, [s for s in seeds if s not in front])}"
              f"   q1..q3 {q([res[s][key] for s in seeds], .25)}..{q([res[s][key] for s in seeds], .75)}  max {q([res[s][key] for s in seeds], 1)}")
    nowin = [s for s in seeds if res[s]["wins"] == 0]
    print(f"  seeds with 0 wins: {len(nowin)}/{len(seeds)} (front {sum(1 for s in nowin if s in front)} / back {sum(1 for s in nowin if s not in front)})")
    reach = Counter(label(res[s]["reached"]) if res[s]["reached"] else "-" for s in seeds)
    print("  last cleared stage:", ", ".join(f"{k}:{v}" for k, v in sorted(reach.items())))
    walls = Counter(label(res[s]["wall"]) for s in seeds if res[s]["wall"])
    print("  longest-gap stage:", ", ".join(f"{k}:{v}" for k, v in walls.most_common(8)))
    if W == 60:
        lossshare = [res[s]["lossmin"] / max(1e-9, sum(r['t1'] - r['t0'] for r in by_seed[s] if r['t1'] <= W)) for s in seeds]
        print("  share of time in lost runs: median", round(100 * st.median(lossshare), 1), "%")
    print()

print("== chapter-1 boss (1051) first clear ==")
fc = {s: next((r["t1"] for r in by_seed[s] if r["stageId"] == 1051 and r["won"]), None) for s in seeds}
for nm, ss in (("all", seeds), ("front", [s for s in seeds if s in front]), ("back", [s for s in seeds if s not in front])):
    v = [fc[s] for s in ss]
    print(f"  {nm}: median {med(v)} | q1 {q(v, .25)} q3 {q(v, .75)} | <=30: {sum(1 for x in v if x is not None and x <= 30)}/{len(ss)} | <=60: {sum(1 for x in v if x is not None and x <= 60)}/{len(ss)} | not cleared: {sum(1 for x in v if x is None)}")
print()

print("== per stage (all runs): dlvl | first-try win% f/b | per-run win% f/b | runs to clear (median) | first clear user-min median | seeds tried | arrive Lv ==")
order = sorted({r["stageId"] for r in rows})
for sid in order:
    tries = [r for r in rows if r["stageId"] == sid]
    ft = {}
    for r in tries:
        ft.setdefault(r["seed"], r)
    def pct(xs):
        return round(100 * sum(1 for x in xs if x["won"]) / len(xs)) if xs else None
    ftl = list(ft.values())
    ntc, fcm = [], []
    for s in ft:
        k = [r for r in tries if r["seed"] == s]
        w = next((i for i, r in enumerate(k) if r["won"]), None)
        if w is not None:
            ntc.append(w + 1)
            fcm.append(k[w]["t1"])
    print(f"  {label(sid):7s} dl{dl.get(sid)} | {pct(ftl)} ({pct([x for x in ftl if x['seed'] in front])}/{pct([x for x in ftl if x['seed'] not in front])})"
          f" | {pct(tries)} ({pct([x for x in tries if x['seed'] in front])}/{pct([x for x in tries if x['seed'] not in front])})"
          f" | {med(ntc)} (max {max(ntc) if ntc else '-'}) | {med(fcm)} | {len(ftl)} | Lv {round(st.mean(x['lvBefore'] for x in ftl), 1)}")
print()

print("== by starting combo: n | clears@10 | clears@60 | 1051 min | first win min | worst streak@60 ==")
combo = defaultdict(list)
for s in seeds:
    combo[" · ".join(sorted(by_seed[s][0]["classes"]))].append(s)
out = []
for c, ss in combo.items():
    r10 = [per_seed(s, 10) for s in ss]
    r60 = [per_seed(s, 60) for s in ss]
    out.append((med([fc[s] for s in ss]) or 999, c, len(ss), med([x["clears"] for x in r10]), med([x["clears"] for x in r60]),
                med([fc[s] for s in ss]), med([fw[s] for s in ss]), max(x["streak"] for x in r60)))
for row in sorted(out):
    print("  ", " | ".join(str(x) for x in row[1:]))
