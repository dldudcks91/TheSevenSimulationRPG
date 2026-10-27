# -*- coding: utf-8 -*-
"""스킨 키트 — 다시 그린 D2 Min 그림에서 부품 다섯 장을 D2 Min 과 같은 자리에서 잘라 낸다 (SCREEN_DESIGN §10-5 · ADR-0901).

python src/assets/art/skins/source/cut_skin_repaints.py [번호 ...]          → src/assets/art/skins/k<번호>_frame|btn|slot|chrome|fill.webp
python src/assets/art/skins/source/cut_skin_repaints.py --css [번호 ...]    → 키트마다 토큰 한 덩어리(style.css 「스킨 키트」 절에 붙인다)

원본 = run_skin_repaints.py 가 받은 `repaint_<번호>_<id>.png`(D2 Min 그림 `concept_17_minimal.png` 를 재질만 바꿔 다시 그린 것).
자리는 D2 Min 의 자르는 좌표(`cut_d2min_parts.py` 의 `*_BOX`) 그대로다 — 다만 다시 그린 그림이 몇 px 밀릴 수 있어, 글자 · 아이콘이 서 있는
가장자리 지도를 원본과 맞대 밀린 만큼(±10px)을 재고 좌표를 같이 옮긴다.

| 부품 | 자리 | 쓰임 |
|---|---|---|
| frame  | 「세부 옵션 2」 패널 → 바깥 11px 고리만 | 내용물 판 · 창 · 툴팁의 9-slice 틀(D2 Min 의 slice 11) |
| btn    | 「마스터리 열기」 버튼 → 바깥 5px 고리만 | 버튼 턱 |
| slot   | 창고 첫 칸 | 칸 바탕 |
| chrome | 브랜드 자리의 빈 판 안 가장 민 200×20 → 뒤집어 2×2 | 제목 띠 · 버튼 · 고른 탭의 결 |
| fill   | 영웅 띠 패널의 빈 자리 안 가장 민 360×56 → 뒤집어 2×2 | 판 · 카드의 결 |

- 글자가 얹히는 면(fill · chrome · slot)은 밝기 상한까지 누른다(ADR-0820 의 값) — 평균 밝기가 넘으면 색 · 결은 두고 곱해 누른다. 테두리 · 버튼 턱은 안 누른다
- 토큰 덩어리는 **내용물 상자**(메인 · 툴팁 · 창 · 플래시)에 선다 — 상단바 · 브랜드 · 탭 열은 `:root` 의 D2 Min 값 그대로다(ADR-0866)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from cut_d2min_parts import BTN_BOX, BTN_RING, CHROME_BOX, FILL_BOX, FRAME_BOX, FRAME_RING, SLOT_BOX
from run_skin_repaints import KITS

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
BASE = Image.open(HERE / 'concept_17_minimal.png').convert('L')
CAP = {'fill': 22, 'chrome': 33, 'slot': 18}   # 평균 밝기(0 ~ 255) 상한 — ADR-0820 의 값
SHIFT = 10


def lum(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def edges(gray):
    a = np.asarray(gray).astype(float)
    gx = np.abs(np.diff(a, axis=1))[:-1, :]
    gy = np.abs(np.diff(a, axis=0))[:, :-1]
    return np.minimum(gx + gy, 255)


def offset(img):
    """다시 그린 그림이 원본에서 밀린 만큼 — 가장자리 지도(글자 · 아이콘 · 초상이 그대로라 가장 많이 겹친다)를 ±SHIFT 안에서 맞댄다"""
    e0 = edges(BASE)
    e1 = edges(img.convert('L'))
    m = SHIFT
    core = e0[m:-m, m:-m]
    best, arg = -1.0, (0, 0)
    for dy in range(-m, m + 1):
        for dx in range(-m, m + 1):
            sh = e1[m + dy:e1.shape[0] - m + dy, m + dx:e1.shape[1] - m + dx]
            score = float((core * sh).sum())
            if score > best:
                best, arg = score, (dx, dy)
    return arg


def box(b, d):
    return (b[0] + d[0], b[1] + d[1], b[2] + d[0], b[3] + d[1])


def ring(im, w):
    im = im.convert('RGBA')
    a = Image.new('L', im.size, 255)
    a.paste(0, (w, w, im.width - w, im.height - w))
    im.putalpha(a)
    return im


def mirror_tile(c):
    w, h = c.size
    t = Image.new('RGB', (w * 2, h * 2))
    t.paste(c, (0, 0))
    t.paste(c.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    t.paste(c.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
    t.paste(c.transpose(Image.ROTATE_180), (w, h))
    return t


def plainest(src, b, w, h, inset=6, step=4):
    """상자 안에서 가장 민(가장자리 에너지가 가장 낮은) w×h 자리 — 다시 그린 그림은 결 자리에 리벳 · 아치 홈 같은 장식이 걸릴 때가 있다.
    장식째 떠서 뒤집어 깔면 장식이 반복돼 점으로 박힌다(2026-10-27 · 191 ~ 194 첫 자르기)"""
    l, t, r, bt = b[0] + inset, b[1] + inset, b[2] - inset, b[3] - inset
    w, h = min(w, r - l), min(h, bt - t)
    e = edges(src.crop((l, t, r, bt)).convert('L'))
    ii = np.pad(e, ((1, 0), (1, 0))).cumsum(0).cumsum(1)   # 적분 영상 — 창마다 합을 한 번에
    best, arg = None, (l, t)
    for y in range(0, (bt - t) - h, step):
        for x in range(0, (r - l) - w, step):
            y2, x2 = min(y + h, e.shape[0]), min(x + w, e.shape[1])
            s = ii[y2, x2] - ii[y, x2] - ii[y2, x] + ii[y, x]
            if best is None or s < best:
                best, arg = s, (l + x, t + y)
    return (arg[0], arg[1], arg[0] + w, arg[1] + h)


def cap(im, limit):
    a = np.asarray(im.convert('RGB')).astype(float)
    L = lum(a).mean()
    if L > limit:
        a *= limit / L
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB'), L


def cut(n):
    kid = KITS[n][0]
    src = Image.open(HERE / f'repaint_{n}_{kid}.png').convert('RGB')
    if src.size != BASE.size:
        src = src.resize(BASE.size, Image.LANCZOS)
    d = offset(src)
    out, notes = {}, {}
    out['frame'] = ring(src.crop(box(FRAME_BOX, d)), FRAME_RING)
    out['btn'] = ring(src.crop(box(BTN_BOX, d)), BTN_RING)
    out['slot'], notes['slot'] = cap(src.crop(box(SLOT_BOX, d)), CAP['slot'])
    chrome, notes['chrome'] = cap(src.crop(plainest(src, box(CHROME_BOX, d), 200, 20)), CAP['chrome'])
    out['chrome'] = mirror_tile(chrome)
    fill, notes['fill'] = cap(src.crop(plainest(src, box(FILL_BOX, d), 360, 56)), CAP['fill'])
    out['fill'] = mirror_tile(fill)
    for name, im in out.items():
        p = OUT / f'k{n}_{name}.webp'
        im.save(p, 'WEBP', lossless=name in ('frame', 'btn', 'slot'), quality=90, method=6)
    bright = ' '.join(f'{k}={v:.0f}' for k, v in notes.items())
    print(f'{n} {kid}: 밀림 {d} · 원래 밝기 {bright}')


def tokens(n):
    """키트 토큰 한 덩어리 — 잘라 둔 부품에서 잰다 · 내용물 상자에만 선다 (ADR-0866)"""
    kid, name, theme = KITS[n]
    frame = np.asarray(Image.open(OUT / f'k{n}_frame.webp').convert('RGBA')).astype(float)
    fr = frame[..., :3][frame[..., 3] > 200]
    L = lum(fr)
    lip = fr[L >= np.percentile(L, 85)].mean(0)
    u = lambda part: f"url('../assets/art/skins/k{n}_{part}.webp')"
    return (f':root[data-skin="d2min"][data-skin-parts="{n}"] :is(#app > .main, #tooltip, #modal, #toast) {{   /* {n} {name} — {theme} */\n'
            f'    --sk-frame: {u("frame")}; --sk-btn: {u("btn")}; --sk-slot: {u("slot")};\n'
            f'    --sk-chrome: {u("chrome")}; --sk-fill: {u("fill")}; --sk-lip: rgba({int(lip[0])}, {int(lip[1])}, {int(lip[2])}, .30);\n'
            f'}}')


def main():
    args = sys.argv[1:]
    css = '--css' in args
    ns = [int(a) for a in args if a != '--css'] or [n for n in KITS if (HERE / f'repaint_{n}_{KITS[n][0]}.png').exists()]
    if css:
        print('\n'.join(tokens(n) for n in ns))
        return
    for n in ns:
        cut(n)


if __name__ == '__main__':
    main()
