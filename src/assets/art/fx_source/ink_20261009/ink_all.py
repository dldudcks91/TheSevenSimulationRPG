# -*- coding: utf-8 -*-
"""남은 스킬 이펙트 전부 · 수묵 붓 (2026-10-09 사용자 「존재하는 모든 스킬 다 그려줘봐」).

전사 19장(ink_war.py)과 원소 기본 10장(ink.py)은 이미 뽑았다 — 여기는 나머지 66장(기본 23 · 전직 43).
칸 문안은 앞 판에서 가져온다 — 기본 = basic_clean_20261008/spec.py · 전직 = advance_20261008/spec.py 의 A안(설치된 칸).
그림체 머리 · 기준 그림은 ink_war.py(수묵 시트 x1 + 고블린)와 같고, 문안의 「가는 · 얇은」 같은 옛 그림체 낱말은 걷는다.

python ink_all.py run      → n1~n17 을 4장씩 끊어 차례로 발주(이미 있는 시트는 건너뛴다)
python ink_all.py gif      → 직업마다 비교 GIF(gif/ink_<직업>_compare.gif) — 「지금 | 수묵」
"""
import concurrent.futures as cf
import csv
import importlib.util
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ART = ROOT / 'src/assets/art'
sys.path.insert(0, str(HERE))
import ink  # noqa: E402
import ink_war  # noqa: E402


def load(p, name):
    s = importlib.util.spec_from_file_location(name, p)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


B = load(ART / 'fx_source/basic_clean_20261008/spec.py', 'bspec')
A = load(ART / 'fx_source/advance_20261008/spec.py', 'aspec')

HEAD = ink_war.HEAD.replace(
    'verdigris = muted teal green with dark ink ·',
    'verdigris = muted teal green with dark ink · holy = pale dull gold with dark ink · arcane = muted steel blue with dark ink · '
    'wind = pale sage green with dark ink · heal = muted sage green with dark ink · shadow = dusky slate gray with dark ink · '
    'sky = pale slate blue with dark ink ·'
) + """
Ignore any outline, texture or rendering words inside a cell (charcoal outline, chipped, dented, glossy...): paint everything in the ink brush style above.
When a cell names an object (shield, sword, lance, hammer, book, cross, wings, wolf, trap, skull, banner...), paint it with a few loose brush strokes — a suggestion of its shape, never a detailed drawing — and let the effect strokes dominate.

"""


def inkify(t):
    t = re.sub(r'\b(very slim|slim|thin|clean)\s+', '', t)
    return t.replace('in thin lines', 'in brush lines').replace('thin lines', 'brush lines')


# 설치 파일(그림) → 문안 · 움직임. 기본 = (sid, 종류, 움직임, 크기, ay, 시간) — skill_art.js 그대로
BASIC = {
    'kni_smite': ('kni_smite', 'hit', 'burst', 88, None, 360), 'kni_holyshield': ('kni_holyshield', 'buff', 'shell', 92, None, 540),
    'kni_charge': ('kni_charge', 'hit', 'thrust', 88, None, 360), 'kni_rush': ('kni_rush', 'hit', 'thrust', 84, None, 340),
    'kni_duel': ('kni_duel', 'bad', 'inward', 86, None, 520), 'kni_duel_guard': ('kni_duel', 'buff', 'shell', 90, None, 540),
    'kni_enchant': ('kni_enchant', 'buff', 'orders', 88, None, 540), 'kni_might': ('kni_might', 'buff', 'orbit', 90, None, 620),
    'kni_fanaticism': ('kni_fanaticism', 'buff', 'orbit', 90, None, 620), 'kni_defiance': ('kni_defiance', 'buff', 'orbit', 90, None, 620),
    'mag_focus': ('mag_focus', 'buff', 'orbit', 88, None, 620),
    'arc_snipe': ('arc_snipe', 'hit', 'thrust', 84, None, 340), 'arc_rapid': ('arc_rapid', 'hit', 'thrust', 84, None, 340),
    'arc_multishot': ('arc_multishot', 'hit', 'rain', 90, None, 440), 'arc_guided': ('arc_guided', 'hit', 'thrust', 88, None, 400),
    'arc_pierce': ('arc_pierce', 'buff', 'sweep', 90, None, 520),
    'pri_heal': ('pri_heal', 'heal', 'heal', 88, None, 640), 'pri_grace': ('pri_grace', 'buff', 'sweep', 88, None, 580),
    'pri_haste': ('pri_haste', 'buff', 'orders', 84, None, 400), 'pri_cure': ('pri_cure', 'heal', 'burst', 88, None, 520),
    'pri_regen': ('pri_regen', 'buff', 'heal', 88, None, 820), 'pri_penitence': ('pri_penitence', 'bad', 'sink', 90, None, 620),
    'pri_bind': ('pri_bind', 'bad', 'inward', 90, None, 580),
}
CELL = {f: inkify(B.SHEETS[B.PICKS[f][0]][B.PICKS[f][1] - 1]) for f in BASIC}

# 전직 — A안(같은 스킬의 첫 줄) · 전사는 ink_war 가 했다
ADV = []                      # (sid, 이름, 종류, [(파일, 움직임, 크기, ay, 시간)], 쿵)
seen = set()
for sid, name, kind, chain, quake in A.FX:
    if sid in seen or sid.startswith('war_'):
        continue
    seen.add(sid)
    steps = []
    for k, (sh, idx, motion, size, ay, dur) in enumerate(chain):
        f = sid if k == 0 else f'{sid}_impact'
        CELL[f] = 'BIG: ' + inkify(A.SHEETS[sh][1][idx - 1])
        steps.append((f, motion, size, ay, dur))
    ADV.append((sid, name, kind, steps, quake))

ORDER = (['kni_smite', 'kni_holyshield', 'kni_charge', 'kni_rush',
          'kni_might', 'kni_fanaticism', 'kni_defiance', 'kni_enchant',      # 오오라 셋은 「같은 마법진」을 서로 짚는다 — 한 시트
          'kni_duel', 'kni_duel_guard', 'mag_focus', 'arc_snipe',
          'arc_rapid', 'arc_multishot', 'arc_guided', 'arc_pierce',
          'pri_heal', 'pri_grace', 'pri_haste', 'pri_cure',
          'pri_regen', 'pri_penitence', 'pri_bind']
         + [f for _, _, _, steps, _ in ADV for f, *_ in steps])
ORDER.insert(23, 'kni_smite_b')        # 기본 마지막 시트의 빈 칸 — 스마이트 B안
CELL['kni_smite_b'] = CELL['kni_smite'].replace('SMITE (a strike)', 'SMITE, second version (a strike)')
SHEETS, WHERE = {}, {}
for n in range(0, len(ORDER), 4):
    sid = f'n{n // 4 + 1}'
    SHEETS[sid] = [CELL[f] for f in ORDER[n:n + 4]]
    for i, f in enumerate(ORDER[n:n + 4], 1):
        WHERE[f] = f'{sid}_{i}'


def prompt(sid):
    body = HEAD + '\n'.join(f'{i}. {c}' for i, c in enumerate(SHEETS[sid], 1)) + '\n'
    (HERE / f'prompt_{sid}.txt').write_text(body, encoding='utf-8')
    return body


def run_all():
    ink.prompt = prompt
    ink.SHEETS.update(SHEETS)
    todo = [s for s in SHEETS if not (HERE / f'sheet_{s}.png').exists()]
    for k in range(0, len(todo), 4):          # 한 번에 4장까지(image_generation_tools.md)
        ids = todo[k:k + 4]
        ink.log(f'batch {ids}')
        with cf.ThreadPoolExecutor(len(ids)) as ex:
            res = list(ex.map(ink.run, ids))
        ink.log('done ' + ' '.join(f'{r}={"ok" if ok else "FAIL"}' for r, ok in res))


def names():
    with open(ROOT / 'src/data/skill.csv', encoding='utf-8') as f:
        return {r['skill_id']: r['name_kr'] for r in csv.DictReader(f)}


def make_gif():
    nm = names()
    jobs = {'kni': ('knight', 'knight_1'), 'mag': ('mage', 'mage_1'), 'arc': ('archer', 'archer_1'), 'pri': ('priest', 'priest_1')}
    for pre, (job, face) in jobs.items():
        rows = []
        if pre == 'mag':                         # 원소 기본은 ink.py 칸(B안 고른 것)
            rows += [r for r in ink.ROWS if not r[0].endswith('B안') and r[0] not in ('포이즌 애로우', '심판', '파이어볼', '라이트닝')]
            rows.insert(0, ('파이어볼', 'hit', [('mag_fireball_clean', 'i3_3', 'burst', 90, None, 420)], False))
            rows.insert(5, ('라이트닝', 'hit', [('mag_lightning_clean', 'i3_4', 'bolt', 124, .9, 380)], False))
        if pre == 'arc':
            rows.append(('포이즌 애로우', 'buff', [('arc_poison_clean', 'i3_1', 'orders', 88, None, 580)], False))
        if pre == 'pri':
            rows.append(('심판', 'hit', [('pri_judgment_clean', 'i3_2', 'strike', 94, None, 480)], False))
        for f, (sid, kind, motion, size, ay, dur) in BASIC.items():
            if f.startswith(pre):
                label = nm.get(sid, sid) + (' (보호)' if f == 'kni_duel_guard' else '')
                rows.append((label, kind, [(f'{f}_clean', WHERE[f], motion, size, ay, dur)], False))
        if pre == 'kni':
            rows.insert(1, ('스마이트 B안', 'hit', [('kni_smite_clean', WHERE['kni_smite_b'], 'burst', 88, None, 360)], False))
        for sid, name, kind, steps, quake in ADV:
            if sid.startswith(pre):
                rows.append((name, kind, [(f, WHERE[f], m, s, ay, d) for f, m, s, ay, d in steps], quake))
        ink.SHEETS.clear()
        ink.SHEETS.update(SHEETS)
        ink.SHEETS.update({k: [None] * 4 for k in ('i1', 'i2', 'i3')})
        ink.ROWS[:] = rows
        ink.FACES.clear()
        ink.FACES.update({'hit': 'monster/1102', 'bad': 'monster/1102', 'buff': f'hero/{face}', 'heal': f'hero/{face}', 'call': f'hero/{face}'})
        ink.make_gif(f'ink_{job}_compare')


if __name__ == '__main__':
    if sys.argv[1:2] == ['run']:
        run_all()
    elif sys.argv[1:2] == ['gif']:
        make_gif()
    else:
        print(__doc__)
        print(len(ORDER), 'cells →', len(SHEETS), 'sheets')
