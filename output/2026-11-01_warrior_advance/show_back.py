"""뒷줄 회차 표 — 자리별 나란히."""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
A = ["wFront", "kFront", "kTank", "wwFront"]
R = {a: json.load(open(f"{a}.json", encoding="utf-8"))["res"] for a in A}
for tid in R["wFront"]:
    print(f"\n== {tid}")
    for a in A:
        n = R[a][tid]["rows"]["none"]
        print(f"  {a}: n={n['used']} win={n['win']} m={n['m']} dur={n['dur']} 전사down={n['wDead']}@{n['downT']} 휘두름={n['swings']} wDps={n['wDmgPerS']} 앞줄down={n['fDead']}@{n['fDownT']}")
    print("var | " + " | ".join(f"{a} d(se)/win/swing/wDead" for a in A))
    for k in R["wwFront"][tid]["rows"]:
        print(k + " | " + " | ".join(f"{R[a][tid]['rows'][k]['d']:+.3f}({R[a][tid]['rows'][k]['se']:.3f})/{R[a][tid]['rows'][k]['win']:.0f}/{R[a][tid]['rows'][k]['swings']:.1f}/{R[a][tid]['rows'][k]['wDead']:.2f}" for a in A))
