"""Per-stage run length (user-min) split by won/lost: python runlen.py <scale> <label>=<json>[,<json>...] ..."""
import json
import statistics as st
import sys
from collections import defaultdict

SCALE = float(sys.argv[1])
for arg in sys.argv[2:]:
    lab, paths = arg.split("=", 1)
    rows = []
    for p in paths.split(","):
        rows += json.loads(open(p, encoding="utf-8").read())["rows"]
    by_seed = defaultdict(list)
    for r in rows:
        by_seed[r["seed"]].append(r)
    dur = defaultdict(lambda: {"won": [], "lost": []})
    for rs in by_seed.values():
        prev = 0.0
        for r in rs:
            d = SCALE * (r["t"] - prev) / 60
            prev = r["t"]
            dur[r["stageId"]]["won" if r["won"] else "lost"].append(d)
    print(f"== {lab}: stage | won n / median min | lost n / median min ==")
    for sid in sorted(dur)[:9]:
        w, l = dur[sid]["won"], dur[sid]["lost"]
        f = lambda xs: round(st.median(xs), 2) if xs else None
        print(f"  {sid} | {len(w)} / {f(w)} | {len(l)} / {f(l)}")
