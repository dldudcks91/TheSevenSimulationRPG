"""Copy ../snap_base (same moment as snap_var) into ../snap_crit (crit part only) and ../snap_def (defense part only)."""
import shutil
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent
OLD_CRIT = "crit_rate: B.base_crit_pct + f('crit_rate'),"
NEW_CRIT = ("crit_rate: (hero.hpBase == null ? ({ warrior: 0.2, knight: 0.2, archer: 0.3, mage: 0.3, priest: 0.3 }[hero.cls] ?? B.base_crit_pct)"
            " : B.base_crit_pct) + f('crit_rate'),")
OLD_DEF = "defense: f('def_flat') + f('def_per_level') * hero.level,"
NEW_DEF = "defense: f('def_flat') + f('def_per_level') * hero.level + (hero.hpBase == null ? ({ warrior: 30, knight: 30 }[hero.cls] ?? 0) : 0),"
for name, old, new in (('snap_crit', OLD_CRIT, NEW_CRIT), ('snap_def', OLD_DEF, NEW_DEF)):
    d = OUT / name
    if d.exists():
        shutil.rmtree(d)
    shutil.copytree(OUT / 'snap_base', d)
    hero = d / 'src' / 'game_logic' / 'hero.js'
    s = hero.read_text(encoding='utf-8')
    assert s.count(old) == 1
    hero.write_bytes(s.replace(old, new).encode('utf-8'))
    print(name, 'patched')
