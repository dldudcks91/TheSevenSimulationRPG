"""src/ 를 이 순간 그대로 떠 둔다 — 그림은 빼고 assets/**/*.js 는 넣는다(ui/mock.js 가 import 한다)."""
import shutil, subprocess, time
from pathlib import Path
REPO = Path(__file__).resolve().parents[3]
import sys
DST = Path(__file__).resolve().parent.parent / (sys.argv[1] if len(sys.argv) > 1 else 'snap')
def ignore(dirpath, names):
    d = Path(dirpath)
    if 'assets' in d.parts:
        return [n for n in names if (d / n).is_file() and not n.endswith('.js')]
    return []
if DST.exists(): shutil.rmtree(DST)
shutil.copytree(REPO / 'src', DST / 'src', ignore=ignore)
head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
dirty = subprocess.run(['git', '-C', str(REPO), 'status', '--short', 'src'], capture_output=True, text=True).stdout.strip()
(DST / 'SNAP_AT.txt').write_text(f"{time.strftime('%Y-%m-%d %H:%M:%S')} HEAD {head}\n{dirty or '(src clean)'}\n", encoding='utf-8')
print('snap', time.strftime('%H:%M:%S'), head, 'dirty' if dirty else 'clean')
