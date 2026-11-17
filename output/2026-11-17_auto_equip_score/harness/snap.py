"""저장소 src/ 한 벌을 ../snap/src 로 뜬다(아트 그림 제외 · assets 의 .js 는 남긴다) — 병렬 세션이 src 를 고쳐도 측정 코드 · 데이터가 안 바뀌게.
Node 가 .js 를 ES 모듈로 읽도록 ../snap/package.json 에 type=module 을 둔다.  python snap.py"""
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
(SNAP / 'package.json').write_text('{"type": "module"}\n', encoding='utf-8')
head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
st = subprocess.run(['git', '-C', str(REPO), 'status', '--short', '--', 'src/game_logic', 'src/data'], capture_output=True, text=True).stdout.strip()
(H.parent / 'SNAP_AT.txt').write_text(f'{time.strftime("%Y-%m-%d %H:%M:%S")} HEAD {head}\n{st or "(src clean)"}\n', encoding='utf-8')
print('snap', time.strftime('%H:%M:%S'), head)
