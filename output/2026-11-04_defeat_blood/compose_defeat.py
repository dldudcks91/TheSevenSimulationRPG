"""패배 피 오버레이 시안 합성 — 관전 스크린숏 위에 A/B 를 얹고 팁 카드 · 결과 띠를 그린다 (목업 · 게임 파일 무변경)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance

ROOT = Path(sys.argv[1])
OUT = ROOT / 'output/2026-11-04_defeat_blood'
SHOT = ROOT / 'output/2026-10-30_early_d10_d60/browser/fresh_battle_75s.png'
ARENA = (364, 168, 1566, 620)            # 관전 아레나 안쪽 (1600×900 스크린숏 실측)
FONT = 'C:/Windows/Fonts/malgun.ttf'
FONT_B = 'C:/Windows/Fonts/malgunbd.ttf'

def font(sz, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, sz)

def defeated_base():
    im = Image.open(SHOT).convert('RGBA')
    # 아군 줄(아래 카드 셋)은 전멸 — 흑백 + 어둡게
    hero = (612, 432, 1314, 584)
    crop = im.crop(hero)
    g = ImageOps.grayscale(crop.convert('RGB')).convert('RGBA')
    g = ImageEnhance.Brightness(g).enhance(0.55)
    im.paste(g, hero[:2])
    return im

def overlay(im, blood_path, alpha=1.0):
    x0, y0, x1, y1 = ARENA
    w, h = x1 - x0, y1 - y0
    b = Image.open(blood_path).convert('RGBA')
    b = b.resize((w, round(b.height * w / b.width)), Image.LANCZOS).crop((0, 0, w, h))
    if alpha < 1:
        a = b.getchannel('A').point(lambda v: round(v * alpha))
        b.putalpha(a)
    im.alpha_composite(b, (x0, y0))
    return im

def tips_card(im):
    d = ImageDraw.Draw(im)
    x0, y0, x1 = 1326, 214, 1558
    rows = [
        ('마스터리 포인트 3 남음', '캐릭터'),
        ('물약 칸 2 비어 있음', '대장간'),
        ('가방에 더 강한 장비 2개', '캐릭터'),
    ]
    row_h = 52
    y1 = y0 + 34 + row_h * len(rows) + 6
    d.rectangle((x0, y0, x1, y1), fill=(10, 10, 10, 235), outline=(78, 78, 78, 255))
    d.text((x0 + 12, y0 + 9), '전투에 도움이 되는 것', font=font(14, True), fill=(255, 255, 255))
    d.line((x0 + 1, y0 + 32, x1 - 1, y0 + 32), fill=(52, 52, 52))
    y = y0 + 40
    for i, (txt, btn) in enumerate(rows):
        d.text((x0 + 12, y + 2), f'{i + 1}.', font=font(13, True), fill=(170, 170, 170))
        d.text((x0 + 30, y + 2), txt, font=font(13), fill=(227, 227, 227))
        bw = 58
        bx, by = x1 - 12 - bw, y + 22
        d.rectangle((bx, by, bx + bw, by + 22), outline=(120, 120, 120), fill=(20, 20, 20))
        tw = d.textlength(btn, font=font(12))
        d.text((bx + (bw - tw) / 2, by + 3), btn, font=font(12), fill=(255, 255, 255))
        y += row_h
    return im

def result_band(im):
    d = ImageDraw.Draw(im)
    parts = [('패배', font(18, True), (224, 48, 48)),
             ('5초 뒤 다시 — Ch1-1 파멸의 진영 I', font(13), (170, 170, 170))]
    btns = ['재도전', '리포트 보기']
    pad, gap = 14, 12
    widths = [d.textlength(t, font=f) for t, f, _ in parts] + [d.textlength(b, font=font(12)) + 20 for b in btns]
    w = sum(widths) + gap * (len(widths) - 1) + pad * 2
    cx = (ARENA[0] + ARENA[2]) / 2
    x, y0, y1 = cx - w / 2, ARENA[3] - 12 - 38, ARENA[3] - 12
    d.rectangle((x, y0, x + w, y1), fill=(10, 10, 10, 255), outline=(78, 78, 78))
    x += pad
    for (t, f, c), wd in zip(parts, widths):
        d.text((x, y0 + (9 if f.size == 13 else 6)), t, font=f, fill=c)
        x += wd + gap
    for i, b in enumerate(btns):
        wd = widths[len(parts) + i]
        primary = i == 1
        d.rectangle((x, y0 + 7, x + wd, y1 - 7), fill=(160, 32, 32) if primary else (20, 20, 20), outline=(120, 120, 120) if not primary else (190, 50, 50))
        d.text((x + 10, y0 + 10), b, font=font(12), fill=(255, 255, 255))
        x += wd + gap
    return im

for tag, alpha in (('A', 1.0), ('B', 1.0)):
    im = defeated_base()
    overlay(im, OUT / f'defeat_blood_{tag}.png', alpha)
    tips_card(im)
    result_band(im)
    im.convert('RGB').save(OUT / f'mock_{tag}.png')
    # 아레나만 잘라 크게 본다
    im.crop((ARENA[0] - 16, ARENA[1] - 50, ARENA[2] + 16, ARENA[3] + 12)).convert('RGB').save(OUT / f'mock_{tag}_arena.png')
print('ok')
