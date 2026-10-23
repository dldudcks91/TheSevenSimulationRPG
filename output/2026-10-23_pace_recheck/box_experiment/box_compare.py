"""Compare box variants: python box_compare.py <scale> <variant> [variant ...]"""
import json
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

S = Path(__file__).resolve().parent
SCALE = float(sys.argv[1])
STAGES = [1013, 1023, 1033, 1043, 1051]

def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs), 1) if xs else None

def load(variant):
    rows = []
    for qn in ("q1", "q2", "q3", "q4"):
        rows += json.loads((S / "sim_out" / f"box_{variant}_{qn}.json").read_text(encoding="utf-8"))["rows"]
    by = defaultdict(list)
    for r in rows:
        by[r["seed"]].append(r)
    return by

print("variant | boss med (front/back) | boss<=60 | boss<=90 | not cleared | 1-1III med | 1-2III med | 1-3III med | runs to boss med | box worn % | lost-run share")
for v in sys.argv[2:]:
    by = load(v)
    seeds = sorted(by)
    front = set(seeds[:len(seeds) // 2])
    def fc(s, sid):
        return next((SCALE * r["t"] / 60 for r in by[s] if r["stageId"] == sid and r["won"]), None)
    boss = {s: fc(s, 1051) for s in seeds}
    given = [r for s in seeds for r in by[s] if r.get("boxSlot")]
    worn = sum(1 for r in given if r.get("boxWorn"))
    runs = [next((r["n"] for r in by[s] if r["stageId"] == 1051 and r["won"]), None) for s in seeds]
    lost = sum(r["sec"] for s in seeds for r in by[s] if not r["won"])
    allsec = sum(r["sec"] for s in seeds for r in by[s])
    bv = [boss[s] for s in seeds]
    print(f"{v:7s} | {med(bv)} ({med([boss[s] for s in seeds if s in front])}/{med([boss[s] for s in seeds if s not in front])})"
          f" | {sum(1 for x in bv if x is not None and x <= 60)} | {sum(1 for x in bv if x is not None and x <= 90)} | {sum(1 for x in bv if x is None)}"
          f" | {med([fc(s, 1013) for s in seeds])} | {med([fc(s, 1023) for s in seeds])} | {med([fc(s, 1033) for s in seeds])}"
          f" | {med(runs)} | {round(100 * worn / max(1, len(given)))}% of {len(given)} | {round(100 * lost / allsec)}%")
