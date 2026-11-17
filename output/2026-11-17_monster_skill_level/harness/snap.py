"""Snapshot repo src/ (art images excluded, assets/**/*.js kept) into ../snap/src and drop the mslv harness into dev/.
한 벌만 뜬다 — A(몬스터 스킬 레벨 전부 1)는 mslv.js 가 페이지 안에서 difficultyList 를 덮어 따로 조립한다(같은 상태 객체를 두 규칙에 넘기려고)."""
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
shutil.copy2(H / 'mslv.js', dev / 'mslv.js')
(dev / 'mslv.html').write_text('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>harness</title></head><body>'
                               '<h1 id="head">...</h1><pre id="sim"></pre><script type="module" src="mslv.js"></script></body></html>\n', encoding='utf-8')
head = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
st = subprocess.run(['git', '-C', str(REPO), 'status', '--short', '--', 'src'], capture_output=True, text=True).stdout.strip()
(H.parent / 'SNAP_AT.txt').write_text(f'{time.strftime("%Y-%m-%d %H:%M:%S")} HEAD {head}\n{st or "(src clean)"}\n', encoding='utf-8')
hdr = (SNAP / 'src/data/difficulty_tier.csv').read_text(encoding='utf-8').splitlines()
k = hdr[0].split(',').index('monster_skill_level')
print('monster_skill_level', [l.split(',')[k] for l in hdr])
print('snap', time.strftime('%H:%M:%S'), head)
