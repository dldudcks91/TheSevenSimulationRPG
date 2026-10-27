# -*- coding: utf-8 -*-
"""시안 비교 — out/*.png 를 알파 경계로 잘라(trim/) 실제 화면 브랜드 칸에 끼워 찍고 한 장으로 모은다.

화면은 사용자 서버(8777)를 읽기만 한다 · D2 Min 스킨 · 1x 기준 브랜드 칸 330×62 를 2배로 찍는다.
python compare.py  →  trim/<시안>.png · shots/<시안>.png · compare.png
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = 'http://127.0.0.1:8777/index.html?dev=play&skin=d2min&lang=ko'
WEB = '/assets/art/logo/source/codex_20261027/trim/'
LOGO_H, LOGO_W = 40, 296  # 브랜드 칸(330×62 · 돌 틀 9px) 안에 들어가는 최대 크기


def trim():
    (HERE / 'trim').mkdir(exist_ok=True)
    names = []
    for p in sorted((HERE / 'out').glob('*.png')):
        im = Image.open(p).convert('RGBA')
        a = im.getchannel('A').point(lambda v: 255 if v > 24 else 0)  # 옅은 잔광 · 먼지는 경계에서 뺀다
        im.crop(a.getbbox()).save(HERE / 'trim' / p.name)
        names.append(p.stem)
    return names


def shoot(names):
    (HERE / 'shots').mkdir(exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='msedge', headless=True)
        pg = b.new_context(viewport={'width': 1600, 'height': 900}, device_scale_factor=2).new_page()
        pg.goto(URL)
        pg.wait_for_timeout(3500)
        box = pg.locator('.brand').bounding_box()
        clip = {'x': 0, 'y': box['y'] - 4, 'width': 760, 'height': box['height'] + 60}
        pg.screenshot(path=str(HERE / 'shots' / '0_now.png'), clip=clip)
        for n in names:
            pg.evaluate("""([src, h, w]) => {
                const b = document.querySelector('.brand');
                b.innerHTML = `<img src="${src}?v=${Date.now()}" style="max-height:${h}px;max-width:${w}px;display:block">`;
            }""", [WEB + n + '.png', LOGO_H, LOGO_W])
            pg.wait_for_function("document.querySelector('.brand img').complete")
            pg.screenshot(path=str(HERE / 'shots' / f'{n}.png'), clip=clip)
        b.close()


def sheet(names):
    font = ImageFont.truetype('malgunbd.ttf', 28)
    rows = ['0_now'] + names
    shots = [Image.open(HERE / 'shots' / f'{r}.png') for r in rows]
    sw, sh = shots[0].size
    raw_w = 700
    W, pad, lab = sw + raw_w + 60, 20, 44
    H = sum(sh + lab + pad for _ in rows) + pad
    out = Image.new('RGB', (W, H), (24, 24, 24))
    d = ImageDraw.Draw(out)
    y = pad
    for r, s in zip(rows, shots):
        d.text((pad, y), '지금 (설치본)' if r == '0_now' else r, fill=(230, 230, 230), font=font)
        y += lab
        out.paste(s, (pad, y))
        if r != '0_now':
            raw = Image.open(HERE / 'trim' / f'{r}.png')
            raw.thumbnail((raw_w - 20, sh))
            bg = Image.new('RGB', (raw_w - 20, sh), (12, 12, 12))
            bg.paste(raw, ((bg.width - raw.width) // 2, (bg.height - raw.height) // 2), raw)
            out.paste(bg, (sw + 40, y))
        y += sh + pad
    out.save(HERE / 'compare.png')
    print(HERE / 'compare.png', out.size)


if __name__ == '__main__':
    ns = trim()
    if not ns:
        sys.exit('out/ 이 비었다')
    shoot(ns)
    sheet(ns)
