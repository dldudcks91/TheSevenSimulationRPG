# -*- coding: utf-8 -*-
"""전사 이펙트 전부 · 수묵 붓 그림체 (2026-10-09 사용자 「전사쪽 다 뽑아봐」) — 기본 8 + 전직 11 + 배시 B안.

python ink_war.py run [시트 ...]   → Codex 로 시트(w1~w5) 발주 — 한 번에 셋까지(기본값: 넘기지 않으면 w1 w2 w3)
python ink_war.py gif              → 자르고 비교 GIF(gif/ink_war_compare.gif) — 스킬마다 「지금 | 수묵」
머리 · 기준 그림은 ink.py 그대로(sheet_x1.png + 고블린). 구도 · 움직임 · 크기는 skill_art.js 그대로. 전직은 ADR-0550 대로 크게 · 한 겹 더.
"""
import concurrent.futures as cf
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import ink  # noqa: E402

HEAD = ink.HEAD.replace(
    'Element colors (muted, never glaring):',
    'Colors (muted, never glaring): physical strikes = cold steel gray with dark ink and a hint of dull crimson · earth = ochre brown with dark ink · blood = dark crimson with dark ink · steel = cool gray with dark ink · gold = dull old gold with dark ink · verdigris = muted teal green with dark ink ·'
).replace(
    'Effects only: no characters, no faces, no weapons, no objects, no text.',
    'Effects only: no characters, no faces, no text, and no weapons or objects unless a cell names one.\n'
    'Cells marked BIG are ADVANCED skills: a clear step grander — the strokes spread out to the edges of the cell, with one extra layer (a second ring, a trail, flung ink) — but painted in exactly the same brush style. Other cells stay inside the middle 85% of the cell.'
)

SHEETS = {
    'w1': [
        "BASH (a strike): THREE fast parallel slash brush strokes raking diagonally from the upper right to the lower left across the middle of the cell. Physical colors.",
        "DOUBLE SWING (a strike): TWO fast slash brush strokes crossing in one X through the middle of the cell, with a small ink splash at the crossing. Physical colors.",
        "EARTHSPLIT (a strike on every enemy): ONE heavy horizontal brush stroke cracking across the lower half of the cell, with FIVE short pointed earth spikes flicked up from it. Earth colors.",
        "LEAP ATTACK (a strike on every enemy): ONE heavy vertical brush stroke slamming straight down into the lower middle of the cell, landing in a flat ink-splash ring spreading sideways on the ground. Physical stroke, earth ring.",
    ],
    'w2': [
        "TAUNT (a buff, face clear): EIGHT short tapered brush flicks around the OUTER EDGE of the cell, each pointing inward toward the middle but staying in the outer quarter of the cell. Blood colors.",
        "WAR CRY (a buff, face clear): exactly the same drawing as cell 1 — EIGHT short tapered brush flicks around the outer edge pointing inward — only the color differs. Gold colors.",
        "BATTLE ORDERS (a buff, face clear): exactly the same drawing as cell 1 — EIGHT short tapered brush flicks around the outer edge pointing inward — only the color differs. Verdigris colors.",
        "IRON SKIN (a buff, face clear): TWO heavy curved brush strokes arcing around the LEFT and RIGHT sides of the cell like a shell of iron around the face, each made of three overlapping plate-like strokes. Steel colors.",
    ],
    'w3': [
        "RAGNAROK — BIG (a buff: the berserker becomes a war god, face clear): a towering crown of dark crimson flame brush strokes rising from behind the shoulders up to the top edge, flanked by two sweeping curved strokes like horns. Blood colors with a dull red-orange.",
        "BERSERK — BIG (a buff: he burns his own blood for fury, face clear): a ring of SIX fierce blood-red brush slashes bursting OUTWARD from around the middle toward the cell edges, with heavy flung ink-blood drops. Blood colors.",
        "MUTUAL DESTRUCTION — BIG (a strike): ONE massive diagonal cleave brush stroke from the upper right corner to the lower left corner, wider than a face, trailing a thick dark-crimson smear. Physical stroke, blood trail.",
        "MUTUAL DESTRUCTION, IMPACT — BIG (the moment after the cleave): a big ragged splash of dark-crimson ink-blood bursting out from the middle in FIVE heavy uneven tongues. Blood colors.",
    ],
    'w4': [
        "WHIRLWIND — BIG (a strike on several enemies): THREE long curved slash brush strokes swirling around the middle of the cell like a whirlwind, spreading to the cell edges. Physical colors.",
        "THOR'S WRATH — BIG, FALL (a strike from above): a huge war-hammer head painted in a few heavy brush strokes, dropping straight down, its face at 86% of the cell height, with heavy speed strokes trailing up to the top edge. Steel colors.",
        "THOR'S WRATH, IMPACT — BIG (the hammer lands): a heavy ink burst of cracked ground splashing out from the middle and sideways, with a flat shockwave stroke. Earth and steel colors.",
        "SHOCKWAVE — BIG (a strike on every enemy): TWO wide flat ellipse ring brush strokes spreading out low across the ground around the middle of the cell, with dust flicked up along the outer ring. Earth colors.",
    ],
    'w5': [
        "LION'S ROAR — BIG (a strike on every enemy): THREE huge crescent sound-wave brush strokes sweeping from the left toward the right across the cell, each larger than the last. Gold colors.",
        "COMMAND — BIG (a buff on the whole party, face clear): THREE big upward-pointing chevron brush strokes rising on the LEFT and RIGHT sides of the cell, with ink flecks lifting upward. Gold colors with a dull crimson accent.",
        "INTIMIDATE — BIG (a curse on every enemy): jagged dark brush strokes stabbing INWARD from all four edges of the cell toward the middle, crimson and charcoal, the middle left open. Blood colors with charcoal.",
        "BASH, second version (a strike): ONE single heavy diagonal slash brush stroke from the upper right to the lower left with a burst of ink flecks at its middle. Physical colors.",
    ],
}

ROWS = [  # 이름, 종류, [(지금 파일, 수묵 칸, 움직임, 크기, ay, 시간)], 쿵
    ('배시', 'hit', [('war_bash_clean', 'w1_1', 'slash', 92, None, 360)], False),
    ('배시 B안', 'hit', [('war_bash_clean', 'w5_4', 'slash', 92, None, 360)], False),
    ('더블스윙', 'hit', [('war_doubleswing_clean', 'w1_2', 'cross', 90, None, 400)], False),
    ('어스스플릿', 'hit', [('war_quake_clean', 'w1_3', 'ground', 96, None, 480)], True),
    ('리프 어택', 'hit', [('war_leap_clean', 'w1_4', 'land', 94, None, 460)], True),
    ('타운트', 'buff', [('war_taunt_clean', 'w2_1', 'wave', 90, None, 580)], False),
    ('워 크라이', 'buff', [('war_shout_clean', 'w2_2', 'wave', 90, None, 580)], False),
    ('배틀오더스', 'buff', [('war_battleorders_clean', 'w2_3', 'wave', 90, None, 580)], False),
    ('아이언 스킨', 'buff', [('war_ironskin_clean', 'w2_4', 'shell', 94, None, 540)], False),
    ('라그나로크', 'buff', [('war_ragnarok', 'w3_1', 'pillar', 136, None, 720)], False),
    ('버서크', 'buff', [('war_berserk', 'w3_2', 'burst', 128, None, 600)], False),
    ('동귀어진', 'hit', [('war_mutualruin', 'w3_3', 'slash', 132, None, 300), ('war_mutualruin_impact', 'w3_4', 'burst', 128, None, 420)], True),
    ('휠윈드', 'hit', [('war_whirlwind', 'w4_1', 'spin', 130, None, 620)], False),
    ('토르의 분노', 'hit', [('war_thorswrath', 'w4_2', 'fall', 128, .86, 260), ('war_thorswrath_impact', 'w4_3', 'shatter', 132, None, 440)], True),
    ('쇼크웨이브', 'hit', [('war_shockwave', 'w4_4', 'ground', 140, None, 520)], True),
    ('사자후', 'hit', [('war_lionsroar', 'w5_1', 'wave', 132, None, 520)], False),
    ('호령', 'buff', [('war_command', 'w5_2', 'orders', 132, None, 620)], False),
    ('일갈', 'bad', [('war_intimidate', 'w5_3', 'inward', 128, None, 580)], False),
]
FACES = {'hit': 'monster/1102', 'bad': 'monster/1102', 'buff': 'hero/warrior_1'}


def prompt(sid):
    body = HEAD + '\n'.join(f'{i}. {c}' for i, c in enumerate(SHEETS[sid], 1)) + '\n'
    (HERE / f'prompt_{sid}.txt').write_text(body, encoding='utf-8')
    return body


def run_all(ids):
    ink.prompt = prompt                      # ink.run 이 이 시트 문안을 쓰게
    ink.SHEETS.update(SHEETS)
    ids = ids or ['w1', 'w2', 'w3']
    ink.log(f'batch {ids}')
    with cf.ThreadPoolExecutor(len(ids)) as ex:
        res = list(ex.map(ink.run, ids))
    ink.log('done ' + ' '.join(f'{r}={"ok" if ok else "FAIL"}' for r, ok in res))


def make_gif():
    ink.SHEETS.clear()
    ink.SHEETS.update(SHEETS)
    ink.ROWS[:] = ROWS
    ink.FACES.clear()
    ink.FACES.update(FACES)
    ink.make_gif('ink_war_compare')


if __name__ == '__main__':
    if sys.argv[1:2] == ['run']:
        run_all(sys.argv[2:])
    elif sys.argv[1:2] == ['gif']:
        make_gif()
    else:
        print(__doc__)
