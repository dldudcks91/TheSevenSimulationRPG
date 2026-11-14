# -*- coding: utf-8 -*-
"""Review board — one row per advance, laid out like the board: common 1-3 | skill · size · var1 · var2 (x3).

python review_board.py  -> review_board.png (installed files under icons_source · green tag = new drawing · grey = reuse)
"""
import csv
import json
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ICONS = HERE.parents[3]
REPO = HERE.parents[7]
PLAN = json.loads((HERE / 'plan.json').read_text(encoding='utf-8'))
FONT = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 11)
FONT_B = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 14)
S, CW, CH, PAD = 72, 92, 126, 6

rd = lambda f: list(csv.DictReader(open(REPO / 'src/data' / f, encoding='utf-8-sig')))
advs = rd('advance.csv')
skills = {r['skill_id']: r for r in rd('skill.csv')}
common = {(r['advance_id'], r['slot']): r for r in rd('advance_common.csv')}
nodes = {(r['skill_id'], r['slot']): r for r in rd('advance_node.csv')}
by_adv = {}
for r in rd('skill.csv'):
    if r['owner_kind'] == 'advance':
        by_adv.setdefault(r['owner_id'], []).append(r['skill_id'])
SLOT_KR = {'size': '크기', 'var1': '변형1', 'var2': '변형2'}


def cell(img, d, x, y, path, label, target):
    if path.exists():
        t = Image.open(path).convert('RGBA').resize((S, S), Image.LANCZOS)
        img.paste(t, (x + (CW - S) // 2, y), t)
    new = target in PLAN['draw']
    reuse = target in PLAN['reuse']
    if new or reuse:
        d.rectangle([x + 2, y, x + 8, y + 6], fill=(80, 200, 120) if new else (110, 110, 125))
    for i, line in enumerate(textwrap.wrap(label, 8)[:4]):
        d.text((x + 3, y + S + 3 + i * 13), line, font=FONT, fill=(215, 215, 225))


def main():
    cols = 3 + 12
    W = 150 + cols * CW + 3 * 10
    H = len(advs) * (CH + PAD) + 40
    img = Image.new('RGB', (W, H), (22, 22, 30))
    d = ImageDraw.Draw(img)
    d.text((8, 8), '■ 초록 = 새로 그림   ■ 회색 = 기존 그림 재사용   (전직마다: 공통 줄 1~3 | 스킬 · 크기 · 변형1 · 변형2 ×3)', font=FONT, fill=(200, 200, 210))
    d.rectangle([8, 9, 13, 14], fill=(80, 200, 120))
    for ri, a in enumerate(advs):
        y = 32 + ri * (CH + PAD)
        d.text((8, y + 20), a['name_kr'], font=FONT_B, fill=(240, 220, 160))
        d.text((8, y + 42), a['advance_id'], font=FONT, fill=(150, 150, 160))
        x = 150
        for n in '123':
            c = common[(a['advance_id'], n)]
            cell(img, d, x, y, ICONS / f"mastery/advance/{a['advance_id']}_{n}.png", c['name_kr'], f"common:{a['advance_id']}_{n}")
            x += CW
        for sid in by_adv[a['advance_id']]:
            x += 10
            d.line([x - 6, y, x - 6, y + CH - 6], fill=(60, 60, 75))
            cell(img, d, x, y, ICONS / f'skills/{sid}.png', '★' + skills[sid]['name_kr'], f'skill:{sid}')
            x += CW
            for slot in ('size', 'var1', 'var2'):
                nd = nodes[(sid, slot)]
                cell(img, d, x, y, ICONS / f'mastery/advance/{sid}_{slot}.png', f"{SLOT_KR[slot]} · {nd['name_kr']}", f'tail:{sid}_{slot}')
                x += CW
    img.save(HERE / 'review_board.png')
    print('review_board.png', img.size)


if __name__ == '__main__':
    main()
