import sys
from pathlib import Path
src, scr = Path(sys.argv[1]), Path(sys.argv[2])
s = src.read_text(encoding='utf-8')
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
rep("const RAR = { normal: 0, magic: 1, rare: 2, unique: 3, set: 3 };",
    "const RAR = { normal: 0, magic: 1, rare: 2, craft: 2, epic: 3, legendary: 4, unique: 5, set: 5 };   // qa_r342 — epic/legendary")
rep("const tier = { diff, t0: r2(t), n0: n, t1: null, runs: 0 };",
    "const tier = { diff, t0: r2(t), n0: n, t1: null, runs: 0, wins: 0, drops: {} };   // qa_r342 — drop rarity tally")
rep("            if (!r.ok) return { err: r.err };\n",
    "            if (!r.ok) return { err: r.err };\n"
    "            for (const u of r.report.drops ?? []) { const rr = G.items[u]?.rarity ?? 'gone'; tier.drops[rr] = (tier.drops[rr] ?? 0) + 1; }\n"
    "            if (r.report.won) tier.wins++;\n")
page = ('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>wheel</title></head><body>'
        '<h1 id="head">...</h1><pre id="sim"></pre><script type="module" src="wheel.js"></script></body></html>\n')
for tag in ('after', 'before'):
    d = scr / tag / 'src' / 'dev'
    (d / 'wheel.js').write_text(s, encoding='utf-8')
    (d / 'wheel.html').write_text(page, encoding='utf-8')
print('ok')
