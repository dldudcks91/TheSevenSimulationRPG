"""Snapshot repo src/ (art images excluded, assets/**/*.js kept) into pace/snap at this instant."""
import shutil, sys, time
from pathlib import Path
REPO = Path(r'C:/Users/ANGames-001/Desktop/LYC/thesevensimulationrpg')
DST = Path(__file__).resolve().parent.parent / 'snap'
def ignore(dirpath, names):
    d = Path(dirpath)
    if 'assets' in d.parts:
        return [n for n in names if (d / n).is_file() and not n.endswith('.js')]
    return []
if DST.exists(): shutil.rmtree(DST)
shutil.copytree(REPO / 'src', DST / 'src', ignore=ignore)
shutil.copy2(REPO / 'serve.py', DST / 'serve.py')
(DST / 'SNAP_AT.txt').write_text(time.strftime('%Y-%m-%d %H:%M:%S'), encoding='utf-8')
print('snap', time.strftime('%H:%M:%S'))
