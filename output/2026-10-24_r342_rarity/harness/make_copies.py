"""Snapshot src/ twice (after = as is, before = R342 item.js behaviour reverted + old balance keys)."""
import shutil, sys, re
from pathlib import Path
REPO = Path(r'C:/Users/ANGames-001/Desktop/LYC/thesevensimulationrpg')
SCR = Path(sys.argv[1])
def ignore(dirpath, names):
    d = Path(dirpath)
    if 'assets' in d.parts:
        return [n for n in names if (d / n).is_file() and not n.endswith('.js')]
    return []
for tag in ('after', 'before'):
    dst = SCR / tag
    if dst.exists(): shutil.rmtree(dst)
    shutil.copytree(REPO / 'src', dst / 'src', ignore=ignore)
    shutil.copy2(REPO / 'serve.py', dst / 'serve.py')
# --- before: revert R342 behaviour in item.js
p = SCR / 'before/src/game_logic/item.js'
s = p.read_text(encoding='utf-8')
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit(f'expected {count} got {n}: {old[:80]!r}')
    s = s.replace(old, new)
# rollRarity
a = s.index('    const rollRarity = (rng, magicFind = 0, weights = null, max = null) => {')
b = s.index('\n    };\n', a) + len('\n    };\n')
s = s[:a] + ("    const rollRarity = (rng, magicFind = 0, weights = null) => {\n"
             "        const w = weights ?? { normal: B.rarity_w_normal, magic: B.rarity_w_magic, rare: B.rarity_w_rare };\n"
             "        const wn = w.normal, wm = w.magic, wr = w.rare * (1 + magicFind);\n"
             "        const x = rng() * (wn + wm + wr);\n"
             "        return x < wn ? 'normal' : x < wn + wm ? 'magic' : 'rare';\n"
             "    };\n") + s[b:]
# randomLines -> randomSlots + slotChance/slotOn
a = s.index('    const randomLines = rarity => {')
b = s.index('\n    };\n', a) + len('\n    };\n')
s = s[:a] + "    const randomSlots = _rarity => B.item_random_slots;\n" + s[b:]
lt = '    const levelT = ilvl => Math.min(1, Math.max(0, (ilvl - 1) / (B.hero_level_cap - 1)));\n'
rep(lt, lt + "    const slotChance = ilvl => B.item_random_chance_min + levelT(ilvl) * (B.item_random_chance_max - B.item_random_chance_min);\n"
            "    const slotOn = (i, hr, p) => i < B.item_random_min || hr < p;\n")
rep("        const n = randomLines(rarity);\n        for (let i = 0; i < n; i++) {\n            const fr = rng(), sr = rng(), vr = rng();\n            if (!families.length) continue;",
    "        const n = randomSlots(rarity), p = slotChance(ilvl);\n        for (let i = 0; i < n; i++) {\n            const hr = rng(), fr = rng(), sr = rng(), vr = rng();\n            if (!slotOn(i, hr, p) || !families.length) continue;")
rep("        const line = cands => {\n            const or = rng(), sr = rng(), vr = rng(), kr = rng();\n            if (!cands.length) return;",
    "        const line = (cands, on = true) => {\n            const or = rng(), sr = rng(), vr = rng(), kr = rng();\n            if (!on || !cands.length) return;")
rep("        for (let i = 0; i < n; i++) line(options.filter(o => open(o) && !MAIN_ONLY_SINS.has(o.sin)));\n        return out;",
    "        const p = slotChance(ilvl);\n        for (let i = 0; i < n; i++) {\n            const hr = rng();\n            line(options.filter(o => open(o) && !MAIN_ONLY_SINS.has(o.sin)), slotOn(i, hr, p));\n        }\n        return out;")
rep('randomLines(rarity)', 'randomSlots(rarity)', 2)
rep('TWO_SINS.has(rarity) ? pickSin', "rarity === 'rare' ? pickSin")
p.write_text(s, encoding='utf-8')
# --- before: old balance keys back
bp = SCR / 'before/src/data/balance.csv'
bs = bp.read_text(encoding='utf-8')
anchor = bs.index('item_random_lines_normal,')
old = ('item_random_slots,3,fixed,0,qa copy\n' 'item_random_min,1,fixed,0,qa copy\n'
       'item_random_chance_min,0.05,proposed,1,qa copy\n' 'item_random_chance_max,0.6,proposed,1,qa copy\n')
bp.write_text(bs[:anchor] + old + bs[anchor:], encoding='utf-8')
print('ok')
