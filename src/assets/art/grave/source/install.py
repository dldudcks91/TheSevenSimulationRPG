# -*- coding: utf-8 -*-
"""무덤 명패 비석 설치 — cand_<id>.png → ../tombstone.webp (256 투명 · 위아래 3% 여백 · 가운데)

python install.py [후보 id]   (없으면 a · 지금 설치본은 ins1 — 흰 비문 편집본 · ADR-0614)
찍는 것: 설치본 안의 앞면 판 사각 % — 화면이 앞면에 글자를 얹던 때(ADR-0611 ~ 0613)의 자리다. 지금 화면은 안 쓴다.
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
SIDE, FILL = 256, 0.94          # 설치본 한 변 · 내용이 차지하는 세로 비 — 초상 자리를 비석이 거의 다 채운다


def main():
    vid = sys.argv[1] if len(sys.argv) > 1 else 'a'
    im = Image.open(HERE / f'cand_{vid}.png').convert('RGBA')
    a = im.getchannel('A').point(lambda v: 0 if v < 8 else v)        # 가장자리 잔털 알파를 걷는다
    im.putalpha(a)
    im = im.crop(a.point(lambda v: 255 if v >= 24 else 0).getbbox())
    k = SIDE * FILL / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = Image.new('RGBA', (SIDE, SIDE), (0, 0, 0, 0))
    out.alpha_composite(im, ((SIDE - im.width) // 2, (SIDE - im.height) // 2))
    out.save(HERE.parent / 'tombstone.webp', 'WEBP', quality=90, method=6)

    # 빈 앞면 = 가운데 픽셀에서 비슷한 색으로 번지는 덩어리
    px = out.load()
    seed = (SIDE // 2, SIDE // 2)
    c0 = px[seed]
    seen, q = {seed}, deque([seed])
    while q:
        x, y = q.popleft()
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if n in seen or not (0 <= n[0] < SIDE and 0 <= n[1] < SIDE):
                continue
            c = px[n]
            if c[3] > 200 and sum(abs(c[i] - c0[i]) for i in range(3)) < 36:
                seen.add(n)
                q.append(n)
    xs, ys = [p[0] for p in seen], [p[1] for p in seen]
    l, t, r, b = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    pct = lambda v: f'{100 * v / SIDE:.1f}%'
    print(f'{vid}: {SIDE}px · panel px l{l} t{t} r{r} b{b} · css left {pct(l)} top {pct(t)} right {pct(SIDE - r)} bottom {pct(SIDE - b)}'
          f' · {(HERE.parent / "tombstone.webp").stat().st_size} bytes')


if __name__ == '__main__':
    main()
