"""v3 열 장 정리 — 옅은 떠돌이 알파(≤24) 지우기 · WebP · 아레나 합성 확인 시트.
실행: python -I v3/build.py (output/2026-11-04_defeat_blood 에서)"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
WEB = HERE.parent / 'web'
base = Image.open(WEB / 'arena_defeat.webp').convert('RGBA')
W, H = base.size
tiles = []
for n in range(1, 11):
    src = HERE / f'style_{n:02d}.png'
    if not src.exists():
        print(n, 'MISSING'); continue
    b = Image.open(src).convert('RGBA')
    a = b.getchannel('A').point(lambda v: 0 if v <= 24 else v)
    b.putalpha(a)
    b.save(WEB / f's_{n:02d}.webp', quality=90, method=6)
    bb = a.getbbox()
    print(n, b.mode, b.size, 'bottom %.1f%%' % (100 * bb[3] / b.height if bb else 0))
    s = b.resize((W, round(b.height * W / b.width)), Image.LANCZOS).crop((0, 0, W, H))
    im = base.copy(); im.alpha_composite(s)
    tiles.append(im.convert('RGB').resize((W // 2, H // 2), Image.LANCZOS))
cols = 2
rows = (len(tiles) + 1) // 2
sheet = Image.new('RGB', (cols * (W // 2) + 10, rows * (H // 2 + 10)), (13, 12, 11))
for k, t in enumerate(tiles):
    sheet.paste(t, ((k % 2) * (W // 2 + 10), (k // 2) * (H // 2 + 10)))
sheet.save(HERE / 'check_all.png')
