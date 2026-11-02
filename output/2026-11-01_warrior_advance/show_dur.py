"""지속 회차 표 — python show_dur.py"""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
for path in sys.argv[1:] or ("dur1.json", "dur3.json"):
    R = json.load(open(path, encoding="utf-8"))["res"]
    print(f"\n=== {path}  전투 길이 " + " / ".join(str(T["shape"]["dur"]) for T in R.values()))
    names = list(next(iter(R.values()))["rows"])
    for k in names:
        rows = [T["rows"][k] for T in R.values()]
        print(
            f"{k:18} d " + " / ".join(f"{r['d']:+.2f}" for r in rows)
            + " | se " + " / ".join(f"{r['se']:.2f}" for r in rows)
            + " | share " + " / ".join(f"{r.get('hitShare', 0):.0f}" for r in rows)
            + " | fk " + " / ".join(f"{r.get('fullKill', 0):.0f}" for r in rows)
            + " | win " + " / ".join(f"{r['win']:.0f}" for r in rows)
            + " | cast " + " / ".join(f"{r['casts']:.1f}" for r in rows)
            + " | swing " + " / ".join(f"{r['swings']:.1f}" for r in rows)
            + " | dead " + " / ".join(f"{r['wDead']:.2f}" for r in rows)
            + " | dur " + " / ".join(f"{r['dur']:.0f}" for r in rows)
        )
