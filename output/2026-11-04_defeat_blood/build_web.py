"""비교 판용 그림 — 피 없는 패배 아레나(팁 카드 · 결과 띠 목업 포함) + 피 오버레이 WebP.
실행: python -I output/2026-11-04_defeat_blood/build_web.py <저장소 루트>"""
import sys
import importlib.util
from pathlib import Path
from PIL import Image

ROOT = Path(sys.argv[1])
HERE = ROOT / 'output/2026-11-04_defeat_blood'
WEB = HERE / 'web'
WEB.mkdir(exist_ok=True)

spec = importlib.util.spec_from_file_location('compose', sys.argv[2])
c = importlib.util.module_from_spec(spec)
sys.argv = [sys.argv[0], str(ROOT)]
spec.loader.exec_module(c)          # 합성 스크립트(mock_*.png 도 다시 만든다)

base = c.defeated_base()
c.tips_card(base)
c.result_band(base)
base.crop(c.ARENA).convert('RGB').save(WEB / 'arena_defeat.webp', quality=88, method=6)
for tag in 'AB':
    Image.open(HERE / f'defeat_blood_{tag}.png').convert('RGBA').save(WEB / f'blood_{tag}.webp', quality=90, method=6)
for p in sorted(WEB.iterdir()):
    print(p.name, p.stat().st_size)
