"""Snapshot repo src/ (art images excluded, assets/**/*.js kept) into ../snap/src and drop the rpen harness into dev/.
병렬 세션이 src 를 고쳐도 측정 중인 코드 · 데이터가 안 바뀌게 한 벌을 떠 둔다. python snap.py"""
import shutil, subprocess, time
from pathlib import Path
H = Path(__file__).resolve().parent
REPO = H.parents[2]
SNAP = H.parent / 'snap'
def ignore(dirpath, names):
    d = Path(dirpath)
    if 'assets' in d.parts:
        return [n for n in names if (d / n).is_file() and not n.endswith('.js')]
    return []
if SNAP.exists():
    shutil.rmtree(SNAP)
shutil.copytree(REPO / 'src', SNAP / 'src', ignore=ignore)
dev = SNAP / 'src' / 'dev'
shutil.copy2(H / 'rpen.js', dev / 'rpen.js')
(dev / 'rpen.html').write_text('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>harness</title></head><body>'
                               '<h1 id="head">...</h1><pre id="sim"></pre><script type="module" src="rpen.js"></script></body></html>\n', encoding='utf-8')
head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
st = subprocess.run(['git', '-C', str(REPO), 'status', '--short', '--', 'src/game_logic', 'src/data'], capture_output=True, text=True).stdout.strip()
(H.parent / 'SNAP_AT.txt').write_text(f'{time.strftime("%Y-%m-%d %H:%M:%S")} HEAD {head}\n{st or "(src clean)"}\n', encoding='utf-8')
print('snap', time.strftime('%H:%M:%S'), head)
