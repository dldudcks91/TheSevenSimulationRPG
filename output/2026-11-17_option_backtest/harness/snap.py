"""Snapshot repo src/ (art images excluded, assets/**/*.js kept) into ../snap/src.
병렬 세션이 src 를 고쳐도 측정 중인 코드 · 데이터가 안 바뀌게 한 벌을 떠 둔다.
python snap.py            — 스냅숏을 새로 뜬다(옛 snap 지움)
python snap.py --harness  — 스냅숏은 그대로 두고 하네스(obt.js · obt.html)만 dev/ 에 다시 넣는다"""
import shutil, subprocess, sys, time
from pathlib import Path
H = Path(__file__).resolve().parent
REPO = H.parents[2]
SNAP = H.parent / 'snap'
def ignore(dirpath, names):
    d = Path(dirpath)
    if 'assets' in d.parts:
        return [n for n in names if (d / n).is_file() and not n.endswith('.js')]
    return []
def install():
    dev = SNAP / 'src' / 'dev'
    shutil.copy2(H / 'obt.js', dev / 'obt.js')
    (dev / 'obt.html').write_text('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>harness</title></head><body>'
                                  '<h1 id="head">...</h1><pre id="sim"></pre><script type="module" src="obt.js"></script></body></html>\n', encoding='utf-8')
if '--harness' in sys.argv:
    install(); print('harness installed', time.strftime('%H:%M:%S')); sys.exit(0)
if SNAP.exists():
    shutil.rmtree(SNAP)
t = time.strftime('%Y-%m-%d %H:%M:%S')
shutil.copytree(REPO / 'src', SNAP / 'src', ignore=ignore)
head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
st = subprocess.run(['git', '-C', str(REPO), 'status', '--short', '--', 'src/game_logic', 'src/data', 'src/ui/data.js'], capture_output=True, text=True).stdout.strip()
(H.parent / 'SNAP_AT.txt').write_text(f'{t} HEAD {head}\n{st or "(src clean)"}\n', encoding='utf-8')
if (H / 'obt.js').exists():
    install()
print('snap', t, head)
