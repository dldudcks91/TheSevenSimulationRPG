"""측정 사본을 다시 만든다 — HEAD 6719d383 의 src 일부를 ../snap/src 에 풀고 두 줄만 바꾼다(시작 쿨 비율 · 버프 · 디버프 먼저).
Usage: python make_snap.py  (저장소 루트 아무 데서나)
"""
import io, subprocess, tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SNAP = HERE.parent / 'snap'
REV = '6719d383'
PATHS = ['src/game_logic', 'src/data', 'src/ui', 'src/dev', 'src/index.html', 'src/assets/art/faces/portrait_files.js']

tar = subprocess.run(['git', 'archive', REV, *PATHS], cwd=ROOT, check=True, capture_output=True).stdout
tarfile.open(fileobj=io.BytesIO(tar)).extractall(SNAP)

EDITS = [
    ('src/game_logic/battle.js',
     "else a.readyAt = a.def.cast === 'auto' ? at : at + lap;",
     "else a.readyAt = a.def.cast === 'auto' ? at : at + lap * (globalThis.__EXP?.startFrac ?? 1);   // [측정 사본] __EXP.startFrac = 시작에 남은 쿨 비율(1 = 지금 · 0 = 준비 · 0.5 = 절반)"),
    ('src/game_logic/skill.js',
     "ready.sort((x, y) => (x.a.readyAt - y.a.readyAt) || (x.i - y.i));",
     "const bf = a => (globalThis.__EXP?.buffFirst && a.def?.needsWeapon === false ? 0 : 1);   // [측정 사본] __EXP.buffFirst = 같은 시각 준비면 버프 · 디버프 먼저\n        ready.sort((x, y) => (x.a.readyAt - y.a.readyAt) || (bf(x.a) - bf(y.a)) || (x.i - y.i));"),
]
for rel, old, new in EDITS:
    p = SNAP / rel
    s = p.read_bytes().decode('utf-8')
    assert s.count(old) == 1, (rel, s.count(old))
    p.write_bytes(s.replace(old, new).encode('utf-8'))
print('snap ready', SNAP)
