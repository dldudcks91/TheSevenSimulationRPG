"""챕터 시트 다시 찍기 — 스테이지 한 판 = 2×2 한 장 (faces/source/chapters/README.md).

`monster.csv` 가 대장이다: 스테이지마다 일반몹 3 + 스테이지 보스 1 을 읽어
`cartoon/monster/<idx>.webp` 를 칸에 앉힌다. 아트가 없는 자리는 **빈 초록 칸**으로 남고, 그 빈 칸이 곧 발주서다.
`cartoon/monster/` 를 건드렸으면(설치 · 교체 · 삭제) 이걸 돌린다 — SKILL.md 5단계.

    python .claude/skills/art-prompt/build_chapter_sheets.py            # 아트가 있는 스테이지 전부
    python .claude/skills/art-prompt/build_chapter_sheets.py 1 3        # 챕터 1 스테이지 3 만
    python .claude/skills/art-prompt/build_chapter_sheets.py --prune    # 아트가 0 이 된 스테이지의 옛 장을 지운다

칸 배치는 1 · 2 · 3 = 일반몹(`monster_idx` 오름차순) · 4 = 스테이지 보스.
앉히는 문법은 게임 화면(원형 마스크 · align_faces.py)이 아니라 **앵커 문법**이다 —
어깨폭이 칸의 74% · 가로 가운데 · 세로 아래 붙임(postprocess.md §3).
"""
import csv
import os
import sys

import numpy as np
from PIL import Image

CSV = 'src/data/monster.csv'
FACES = 'src/assets/art/faces/cartoon/monster/'
OUT = 'src/assets/art/faces/source/chapters/'
CELL, SHEET, GRID = 1013, 2048, (1014, 1033)      # 격자선 밴드 — sheets/ 의 Gem 시트와 같은 규격
GREEN = (0, 255, 0)
CELL_XY = [(0, 0), (1035, 0), (0, 1035), (1035, 1035)]   # 1 · 2 · 3 = 일반몹 · 4 = 스테이지 보스


def normalize(img, target=0.74, S=CELL):
    """어깨폭을 칸의 74% 로 — postprocess.md §3 과 같은 식(칸 크기만 다르다)."""
    a = np.array(img.convert('RGBA'))
    m = a[:, :, 3] > 40
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    c = img.convert('RGBA').crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))
    k = (S * target) / m.sum(1).max()
    nw, nh = round(c.width * k), round(c.height * k)
    ca = np.array(c).astype(float)
    al = ca[:, :, 3:4] / 255
    pm = Image.fromarray(np.concatenate([ca[:, :, :3] * al, ca[:, :, 3:4]], 2).astype(np.uint8))
    pm = np.array(pm.resize((nw, nh), Image.LANCZOS)).astype(float)
    al2 = np.maximum(pm[:, :, 3:4], 1)
    out = np.concatenate([np.clip(pm[:, :, :3] * 255 / al2, 0, 255), pm[:, :, 3:4]], 2).astype(np.uint8)
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(Image.fromarray(out), ((S - nw) // 2, S - nh))
    return canvas


def stages(rows):
    """{(챕터, 스테이지): [일반몹 idx 셋…, 보스 idx]} — 없는 자리는 None."""
    out = {}
    for r in rows:
        key = (int(r['chapter']), int(r['stage_num']))
        out.setdefault(key, {'normal': [], 'boss': None})
        if r['spawn_grade'] == 'normal':
            out[key]['normal'].append(int(r['monster_idx']))
        else:
            out[key]['boss'] = int(r['monster_idx'])
    return out


def slots(entry):
    n = sorted(entry['normal'])[:3]
    return n + [None] * (3 - len(n)) + [entry['boss']]


def build(ch, st, entry):
    sheet = Image.new('RGB', (SHEET, SHEET), GREEN)
    g0, g1 = GRID                                         # 격자선 — 초록 위에 검정 띠 둘
    d = np.array(sheet)
    d[g0:g1 + 1, :] = 0
    d[:, g0:g1 + 1] = 0
    sheet = Image.fromarray(d)
    drawn = []
    for (x, y), idx in zip(CELL_XY, slots(entry)):
        if idx is None:
            continue
        f = FACES + '%d.webp' % idx
        if not os.path.exists(f):
            continue
        cell = normalize(Image.open(f))
        sheet.paste(cell.convert('RGB'), (x, y), cell)
        drawn.append(idx)
    if not drawn:                                         # 통짜 초록 장은 안 만든다
        return None, []
    os.makedirs(OUT, exist_ok=True)
    path = OUT + 'ch%d_st%d.png' % (ch, st)
    sheet.save(path)
    return path, drawn


def main(argv):
    prune = '--prune' in argv
    argv = [a for a in argv if not a.startswith('-')]
    rows = list(csv.DictReader(open(CSV, encoding='utf-8')))
    table = stages(rows)
    want = [(int(argv[0]), int(argv[1]))] if len(argv) >= 2 else sorted(table)
    for key in want:
        entry = table.get(key)
        if entry is None:
            print('ch%d_st%d  monster.csv 에 없다' % key)
            continue
        path, drawn = build(key[0], key[1], entry)
        old = OUT + 'ch%d_st%d.png' % key
        if path:
            print('ch%d_st%d  %d/4 칸  %s' % (key[0], key[1], len(drawn), ' '.join(map(str, drawn))))
        elif os.path.exists(old):
            if prune:
                os.remove(old)
                print('ch%d_st%d  아트 0 — 옛 장을 지웠다' % key)
            else:
                print('ch%d_st%d  아트 0 인데 옛 장이 남아 있다 (--prune 으로 지운다)' % key)


if __name__ == '__main__':
    main(sys.argv[1:])
