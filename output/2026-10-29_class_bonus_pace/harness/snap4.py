"""Third round — snapshot repo src/ once into ../snap_base · ../snap_c30 (every unit base crit 30%) · ../snap_c30d (+ hero-only defense +30 for warrior · knight)."""
import shutil, subprocess, time
from pathlib import Path
REPO = Path(r'C:/Users/user/Desktop/python_text/git/TheSevenSimulationRPG')
H = Path(__file__).resolve().parent
OUT = H.parent
def ignore(dirpath, names):
    d = Path(dirpath)
    if 'assets' in d.parts:
        return [n for n in names if (d / n).is_file() and not n.endswith('.js')]
    return []
NAMES = ('snap_base', 'snap_c30', 'snap_c30d')
for n in NAMES:
    if (OUT / n).exists():
        shutil.rmtree(OUT / n)
shutil.copytree(REPO / 'src', OUT / 'snap_base' / 'src', ignore=ignore)
stamp = time.strftime('%Y-%m-%d %H:%M:%S')
dev = OUT / 'snap_base' / 'src' / 'dev'
shutil.copy2(H / 'wheel.js', dev / 'wheel.js')
(dev / 'wheel.html').write_text('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>wheel</title></head><body>'
                                '<h1 id="head">...</h1><pre id="sim"></pre><script type="module" src="wheel.js"></script></body></html>\n', encoding='utf-8')
for n in NAMES[1:]:
    shutil.copytree(OUT / 'snap_base', OUT / n)

# every unit: balance.csv base_crit_pct 0.05 -> 0.3 (heroes and monsters read the same key)
for n in NAMES[1:]:
    bal = OUT / n / 'src' / 'data' / 'balance.csv'
    b = bal.read_bytes().decode('utf-8')
    old = '\nbase_crit_pct,0.05,'
    assert b.count(old) == 1
    bal.write_bytes(b.replace(old, '\nbase_crit_pct,0.3,').encode('utf-8'))
hero = OUT / 'snap_c30d' / 'src' / 'game_logic' / 'hero.js'
s = hero.read_text(encoding='utf-8')
OLD_DEF = "defense: f('def_flat') + f('def_per_level') * hero.level,"
assert s.count(OLD_DEF) == 1
hero.write_bytes(s.replace(OLD_DEF, "defense: f('def_flat') + f('def_per_level') * hero.level + (hero.hpBase == null ? ({ warrior: 30, knight: 30 }[hero.cls] ?? 0) : 0),").encode('utf-8'))

head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
st = subprocess.run(['git', '-C', str(REPO), 'status', '--short', '--', 'src'], capture_output=True, text=True).stdout.strip()
(OUT / 'SNAP_AT_round3.txt').write_text(f'{stamp} HEAD {head}\n{st or "(src clean)"}\n', encoding='utf-8')
print('snap', stamp, head)
