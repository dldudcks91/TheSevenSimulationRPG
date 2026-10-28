"""Snapshot repo src/ (art images excluded, assets/**/*.js kept) into ../snap, then drop the wheel harness into snap/src/dev."""
import shutil, subprocess, time
from pathlib import Path
REPO = Path(r'C:/Users/user/Desktop/python_text/git/TheSevenSimulationRPG')
H = Path(__file__).resolve().parent
DST = H.parent / 'snap'
def ignore(dirpath, names):
    d = Path(dirpath)
    if 'assets' in d.parts:
        return [n for n in names if (d / n).is_file() and not n.endswith('.js')]
    return []
if DST.exists():
    shutil.rmtree(DST)
shutil.copytree(REPO / 'src', DST / 'src', ignore=ignore)
shutil.copy2(REPO / 'serve.py', DST / 'serve.py')
dev = DST / 'src' / 'dev'
shutil.copy2(H / 'wheel.js', dev / 'wheel.js')
(dev / 'wheel.html').write_text('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>wheel</title></head><body>'
                                '<h1 id="head">...</h1><pre id="sim"></pre><script type="module" src="wheel.js"></script></body></html>\n', encoding='utf-8')
head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
st = subprocess.run(['git', '-C', str(REPO), 'status', '--short', '--', 'src'], capture_output=True, text=True).stdout.strip()
(DST / 'SNAP_AT.txt').write_text(f'{time.strftime("%Y-%m-%d %H:%M:%S")} HEAD {head}\n{st or "(src clean)"}\n', encoding='utf-8')
print('snap', time.strftime('%H:%M:%S'), head, st or '(src clean)')
