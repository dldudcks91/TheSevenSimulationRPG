"""Second round — snapshot repo src/ once into ../snap_base · ../snap_var (heroes only) · ../snap_all (heroes and monsters).
Monsters carry a class (monster.csv:cls) and go through the same computeCombat, so ALL drops the hpBase guard.
"""
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
NAMES = ('snap_base', 'snap_var', 'snap_all')
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

OLD_CRIT = "crit_rate: B.base_crit_pct + f('crit_rate'),"
OLD_DEF = "defense: f('def_flat') + f('def_per_level') * hero.level,"
CRIT = "({ warrior: 0.2, knight: 0.2, archer: 0.3, mage: 0.3, priest: 0.3 }[hero.cls] ?? B.base_crit_pct)"
DEF = "({ warrior: 30, knight: 30 }[hero.cls] ?? 0)"
PATCH = {
    'snap_var': (f"crit_rate: (hero.hpBase == null ? {CRIT} : B.base_crit_pct) + f('crit_rate'),",
                 f"defense: f('def_flat') + f('def_per_level') * hero.level + (hero.hpBase == null ? {DEF} : 0),"),
    'snap_all': (f"crit_rate: {CRIT} + f('crit_rate'),",
                 f"defense: f('def_flat') + f('def_per_level') * hero.level + {DEF},"),
}
for n, (crit, de) in PATCH.items():
    hero = OUT / n / 'src' / 'game_logic' / 'hero.js'
    s = hero.read_text(encoding='utf-8')
    assert s.count(OLD_CRIT) == 1 and s.count(OLD_DEF) == 1
    hero.write_bytes(s.replace(OLD_CRIT, crit).replace(OLD_DEF, de).encode('utf-8'))

head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
st = subprocess.run(['git', '-C', str(REPO), 'status', '--short', '--', 'src'], capture_output=True, text=True).stdout.strip()
(OUT / 'SNAP_AT_round2.txt').write_text(f'{stamp} HEAD {head}\n{st or "(src clean)"}\n', encoding='utf-8')
print('snap', stamp, head)
