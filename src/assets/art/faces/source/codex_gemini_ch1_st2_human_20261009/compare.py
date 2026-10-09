# -*- coding: utf-8 -*-
"""판(round)끼리 나란히 — 첫 행은 Gemini 기준, 다음 행부터 판마다 한 행.

python compare.py <판> [<판> ...] [-o 이름]   ->  compare_<이름>.png (기본 이름 = 판 이름을 _ 로 이음)
열 = 주어진 판들의 out/<판>/*.png 잡(v1_1201 … 순서 우선).
첫 행 = 그 잡의 바탕(lead) — 바탕이 없는 판이면 인물별 Gemini 대표(GEM).
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
READY = HERE.parent / 'ready'
ORDER = [f'{v}_{i}' for v in ('v1', 'v2', 'v3') for i in ('1201', '1202', '1203')]
GEM = {'1201': 'hero/knight_4', '1202': 'hero/archer_1', '1203': 'hero/knight_1'}
BG = (214, 210, 202, 255)
S, PAD, HEAD = 300, 10, 22


def tile(p):
    im = Image.open(p).convert('RGBA').resize((S, S), Image.LANCZOS)
    base = Image.new('RGBA', (S, S), BG)
    base.alpha_composite(im)
    return base


def lead_of(rounds, job):
    ver, idx = job.split('_')
    for r in rounds:
        p = HERE / 'rounds' / f'{r}.json'
        lead = json.loads(p.read_text(encoding='utf-8')).get('lead') if p.exists() else None
        if lead:
            return (lead[ver] if ver in lead else lead)[idx]
    return GEM.get(idx)


def main(argv):
    name = None
    if '-o' in argv:
        k = argv.index('-o')
        name = argv[k + 1]
        argv = argv[:k] + argv[k + 2:]
    rounds = argv
    found = {p.stem for r in rounds for p in (HERE / 'out' / r).glob('*.png')}
    jobs = [j for j in ORDER if j in found] + sorted(found - set(ORDER))
    rows = ['gemini'] + rounds
    sheet = Image.new('RGBA', (PAD + len(jobs) * (S + PAD) + 60, PAD + len(rows) * (S + PAD) + HEAD), (40, 40, 44, 255))
    d = ImageDraw.Draw(sheet)
    for c, j in enumerate(jobs):
        d.text((60 + PAD + c * (S + PAD) + 4, 5), j, fill=(240, 240, 240, 255))
    for r, rnd in enumerate(rows):
        y = HEAD + PAD + r * (S + PAD)
        d.text((6, y + S // 2), rnd, fill=(240, 240, 240, 255))
        for c, j in enumerate(jobs):
            ref = lead_of(rounds, j) if rnd == 'gemini' else None
            p = (READY / f'{ref}.png' if ref else None) if rnd == 'gemini' else HERE / 'out' / rnd / f'{j}.png'
            if p and p.exists():
                sheet.paste(tile(p), (60 + PAD + c * (S + PAD), y))
    out = HERE / f'compare_{name or "_".join(rounds)}.png'
    sheet.convert('RGB').save(out)
    print(out)


if __name__ == '__main__':
    main(sys.argv[1:])
