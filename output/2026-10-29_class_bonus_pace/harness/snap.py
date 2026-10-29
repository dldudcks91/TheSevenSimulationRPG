"""Snapshot repo src/ once (art images excluded, assets/**/*.js kept) into ../snap_base and ../snap_var at the same moment,
drop the wheel harness into both, then patch snap_var with the hero-only class bonus (measurement only).
Variant VAR — heroes only (monsters pass hpBase and keep base_crit_pct · defense +0):
  base crit 20% (warrior · knight) / 30% (archer · mage · priest) · defense +30 (warrior · knight)
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
base = OUT / 'snap_base'
var = OUT / 'snap_var'
for d in (base, var):
    if d.exists():
        shutil.rmtree(d)
shutil.copytree(REPO / 'src', base / 'src', ignore=ignore)
stamp = time.strftime('%Y-%m-%d %H:%M:%S')
shutil.copytree(base / 'src', var / 'src')
for d in (base, var):
    dev = d / 'src' / 'dev'
    shutil.copy2(H / 'wheel.js', dev / 'wheel.js')
    (dev / 'wheel.html').write_text('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>wheel</title></head><body>'
                                    '<h1 id="head">...</h1><pre id="sim"></pre><script type="module" src="wheel.js"></script></body></html>\n', encoding='utf-8')

HERO = var / 'src' / 'game_logic' / 'hero.js'
src = HERO.read_text(encoding='utf-8')
OLD_CRIT = "crit_rate: B.base_crit_pct + f('crit_rate'),"
NEW_CRIT = ("crit_rate: (hero.hpBase == null ? ({ warrior: 0.2, knight: 0.2, archer: 0.3, mage: 0.3, priest: 0.3 }[hero.cls] ?? B.base_crit_pct)"
            " : B.base_crit_pct) + f('crit_rate'),")
OLD_DEF = "defense: f('def_flat') + f('def_per_level') * hero.level,"
NEW_DEF = "defense: f('def_flat') + f('def_per_level') * hero.level + (hero.hpBase == null ? ({ warrior: 30, knight: 30 }[hero.cls] ?? 0) : 0),"
assert src.count(OLD_CRIT) == 1 and src.count(OLD_DEF) == 1
src = src.replace(OLD_CRIT, NEW_CRIT).replace(OLD_DEF, NEW_DEF)
HERO.write_bytes(src.encode('utf-8'))

head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
st = subprocess.run(['git', '-C', str(REPO), 'status', '--short', '--', 'src'], capture_output=True, text=True).stdout.strip()
(OUT / 'SNAP_AT.txt').write_text(f'{stamp} HEAD {head}\n{st or "(src clean)"}\n', encoding='utf-8')
print('snap', stamp, head)
print(st or '(src clean)')
