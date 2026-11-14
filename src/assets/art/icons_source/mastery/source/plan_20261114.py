# -*- coding: utf-8 -*-
"""2026-11-14 batch — every mastery / advance picture that was missing, a temp copy, or borrowed.

  python plan_20261114.py   -> writes sheet_19..26_prompt.txt (mastery) + ../../advances/source/sheet_0N_prompt.txt
                               + plan_20261114.json, asserts every target is a live CSV row

What it covers (audit of 2026-11-14 — README icons/mastery · icons/advances):
  * T4 36 (sheets 19-22, tile order = sheet_19_22_t4_tiles.txt) — were temp copies of a T3/T2 picture
  * class board — missing 5 (mage/priest/archer T1 hp · knight T2 fhr · ddr) · T1 cooldown x5 / speed x5 were one
    other-class picture copied to every class (R459) · warrior T2 hp = its T1 picture · warrior T2 fhr = pride's throne ·
    mage / priest robe = a heart (HP) but the effect is all-resist (R461)
  * sin board T2 — pictures borrowed from another sin / class or equal to the board's own T1 picture ·
    greed T2 g6 (XP) wore the item-find sack
  * advance branch icons 15 (ADR-1107 — waiting since 2026-11-14) — anchor = classes/source/sheet_01_classes.png
Mastery tiles keep the cell grammar: stat symbol + the class object / the sin's material, one picture per cell.
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, *['..'] * 6))
ICONS = os.path.abspath(os.path.join(HERE, '..', '..'))          # icons_source
ADV_SRC = os.path.join(ICONS, 'advances', 'source')

# ---- mastery tiles: node key -> sentence. Class T1 common weapon key = <node>_<class>.
T = {
    # sheet 19 — class T4 (warrior · knight · mage)
    'cls_warrior_t4_sweep': 'A two-headed flail: one short thick handle standing upright at the bottom, two chunky chains spreading from its top to the left and to the right, a round spiked ball at the end of each chain.',
    'cls_warrior_t4_onslaught': 'Two identical heavy war hammers standing upright side by side, square heads at the top, the right one standing a little higher than the left.',
    'cls_warrior_t4_hide': 'A flat stretched animal hide facing front, four short stubby legs splayed at its corners, a small broken wizard staff lying level across its middle.',
    'cls_knight_t4_helmbreaker': 'A closed great helm facing front, a heavy flanged mace head resting on its top, one short white crack running down from where the mace sits.',
    'cls_knight_t4_sworn': 'A tall tower shield facing front, one raised open hand cut out of its center in white, as if swearing an oath.',
    'cls_knight_t4_turned': 'A heater shield facing front, a longsword lying across it on a calm 45-degree diagonal, the blade bent aside at the shield edge.',
    'cls_mage_t4_arcana': 'A tall staff standing upright, a long pointed crystal on its top driven straight through a small square stone slab.',
    'cls_mage_t4_pages': 'An open spellbook standing upright facing front, one thick page lifted halfway up in the middle on its own.',
    'cls_mage_t4_circle': 'A pointed wizard hat under a smooth glass bell jar, the jar standing on a low round base, one white highlight line on the glass.',
    # sheet 20 — class T4 (priest · archer) · wrath T4
    'cls_priest_t4_sin': 'A plump heart facing front, split down its middle by one white zigzag crack, a small plain cross standing above it.',
    'cls_priest_t4_cup': 'A tall chalice standing upright, filled to the brim, three fat drops spilling over its lip and running down its side.',
    'cls_priest_t4_prayer': 'A string of chunky round prayer beads hanging in a loose loop, a small plain cross hanging from its lowest point.',
    'cls_archer_t4_second': 'Two identical arrows standing side by side pointing straight up, broad heads, the right arrow a little higher than the left.',
    'cls_archer_t4_rhythm': 'A small hand drum standing upright facing front, one arrow lying level across its top like a drumstick.',
    'cls_archer_t4_fleet': 'A light leather boot seen from the side, standing on its sole, one chunky feather tucked upright at its heel.',
    'sin_wrath_t4_blood': 'A broad dagger standing point-down over a shallow bowl, one fat drop of blood hanging under its point.',
    'sin_wrath_t4_rally': 'A curved war horn lying level with its mouth to the right, a small flame rising from its mouth.',
    'sin_wrath_t4_steady': 'A heavy anvil facing front, a short curved horn rising from each of its two top corners.',
    # sheet 21 — envy · greed · sloth T4
    'sin_envy_t4_strip': 'A serpent coiled upright, a small crown held in its jaws.',
    'sin_envy_t4_grudge': 'Two daggers crossed in an upright X, points up, one thick blunt thorny vine wound once around both blades.',
    'sin_envy_t4_misery': 'A hand mirror standing upright, a slit-pupil eye cut into its glass in white, a short thick thorny stem as its handle.',
    'sin_greed_t4_bounty': 'A large coin facing front, a white crosshair cut into it: one cross and one small inner ring.',
    'sin_greed_t4_search': 'An open sack lying on its side with three coins at its mouth, a small shovel standing upright behind it.',
    'sin_greed_t4_ward': 'A round shield facing front made of one huge coin, a short stack of three coins standing by its lower edge.',
    'sin_sloth_t4_heavy': 'A heavy iron gauntlet resting flat, palm down, on a plump square pillow.',
    'sin_sloth_t4_idle': 'A wooden rocking chair seen from the side, facing right, its two curved rockers resting on the ground.',
    'sin_sloth_t4_defer': 'A heater shield facing front, a tall hourglass standing in front of its lower half.',
    # sheet 22 — gluttony · lust · pride T4
    'sin_gluttony_t4_consume': 'A big round cauldron facing front, a small skull sitting in its open mouth.',
    'sin_gluttony_t4_feast': 'A clenched fist holding a roasted meat drumstick upright, the round meaty end at the top.',
    'sin_gluttony_t4_stomach': 'A fat round barrel standing upright facing front, two thick iron bands around it, a small lightning bolt standing on its top.',
    'sin_lust_t4_exposed': 'A plump heart facing front with a keyhole cut out of its center in white, a small key hanging beside it.',
    'sin_lust_t4_embrace': 'Two plump hearts side by side, slightly overlapping, a clean white gap between them.',
    'sin_lust_t4_beguile': 'A chunky ribbon tied into a big bow, a small heart hanging from its knot.',
    'sin_pride_t4_contempt': 'A smooth haughty face mask facing front, narrow white eye slits, chin raised, a small crown on its brow.',
    'sin_pride_t4_charge': "A long straight herald's trumpet lying level, its bell to the right, a small square pennant hanging straight down from it.",
    'sin_pride_t4_unbowed': 'A tall straight column standing on a low square base, a small crown resting on its top.',
    # class T1 / T2 / T3 — stat symbol + class object (hourglass = cooldown · wings = speed · heart = HP)
    'cls_warrior_t1_cooldown': 'An hourglass standing upright, a short hand axe leaning against its right side.',
    'cls_knight_t1_cooldown': 'An hourglass standing upright, a small heater shield standing in front of its lower half.',
    'cls_mage_t1_cooldown': 'A tall thick candle with three white notch lines across it, a calm flame on top, standing in a holder shaped like a crescent moon.',
    'cls_priest_t1_cooldown': 'A church bell hanging from a short thick beam, a small plain cross standing on top of the beam.',
    'cls_archer_t1_cooldown': 'An hourglass standing upright, two arrows crossed behind it in an X, points up.',
    'cls_warrior_t1_speed': 'A hand axe standing upright, one small feathered wing spreading from each side of its handle.',
    'cls_knight_t1_speed': "A knight's riding spur seen from the side, a big spiked star-shaped rowel wheel at its back end, one small feathered wing on its strap.",
    'cls_mage_t1_speed': 'A short magic wand standing upright with a small crystal at its tip, one small feathered wing spreading from each side near its tip.',
    'cls_priest_t1_speed': 'A small round censer with a domed lid hanging from a short chunky chain, one small feathered wing spreading from each side of it.',
    'cls_archer_t1_speed': "A leather archer's bracer for the forearm standing upright, one small feathered wing spreading from its side.",
    'cls_mage_t1_hp': 'A plump heart facing front, a diamond-shaped crystal cut out of its center in white.',
    'cls_priest_t1_hp': "A plump heart facing front, a priest's long stole draped over its top, the two ends hanging straight down in front of it.",
    'cls_archer_t1_hp': 'A plump heart facing front, a short bow lying level across its lower half.',
    'cls_warrior_t2_hp': 'A big plump heart facing front, a thick leather belt with a square buckle wrapped around its middle.',
    'cls_warrior_t2_fhr': "A bull's head facing front, thick curved horns, a heavy ring through its nose.",
    'cls_knight_t2_fhr': 'A steep mountain peak, a longsword planted upright on its summit.',
    'cls_knight_t2_ddr': 'A chess knight piece (a horse head on a round base) facing right, a snapped chunky chain hanging loose from its neck in two short pieces.',
    'cls_mage_t3_robe': 'A wizard robe facing front with wide bell sleeves and a tall collar, a small plain shield shape cut out of its chest in white.',
    'cls_priest_t3_robe': "A priest's long vestment facing front, a stole hanging down both sides of its front, a small plain shield shape cut out of its chest in white.",
    # sin T2 — the sin's own material
    'sin_wrath_t2_g6': 'A single-bladed hand axe standing upright, a small four-point star glint at the top corner of its blade.',
    'sin_envy_t2_crit': "A serpent's head in profile facing right, mouth wide open, two long sharp fangs.",
    'sin_envy_t2_resall': 'A round shield facing front, one thick blunt thorny vine wound across its face.',
    'sin_envy_t2_cdr': 'An hourglass standing upright, a slit-pupil eye cut into its upper bulb in white.',
    'sin_greed_t2_g6': 'An open book lying flat facing the viewer, a short stack of three coins standing on its pages.',
    'sin_sloth_t2_hppct': 'A plump heart facing front wearing a long droopy nightcap with a round pompom at its tip.',
    'sin_sloth_t2_regen': 'A hammock hanging level between two short posts, a small plump heart resting in its sag.',
    'sin_gluttony_t2_hppct': 'A fat round pie facing front, a small plump heart cut into its top crust in white.',
    'sin_gluttony_t2_atk': "A heavy butcher's cleaver standing upright, its wide square blade at the top, a short thick handle below.",
    'sin_lust_t2_resall': 'A folding hand fan opened wide into a half circle, facing front, a small heart cut in white at its pivot.',
    'sin_pride_t2_g3': 'A straight longsword standing point-up, a small crown resting on its crossguard.',
}

# ---- advance branch icons (advance.csv advance_id) — one emblem per branch
A = {
    'berserker': "A snarling bear's head facing front, mouth open showing big fangs, small round ears.",
    'barbarian': 'A horned helmet facing front, a big curved horn rising from each side, a short nose guard.',
    'vanguard': 'A tall war standard: a straight pole with a spearhead tip, a crossbar near the top, a long swallowtail flag hanging straight down from the crossbar.',
    'guardian': 'A short section of castle wall facing front: square stone battlements along its top, a closed arched gate in its middle.',
    'paladin': 'A longsword standing point-down, a round sun with eight short straight rays behind its crossguard.',
    'crusader': 'A flat-topped great helm facing front, its eye slit and breathing slot forming a plain cross cut in white.',
    'fire_mage': 'A single tall calm flame shaped like a teardrop, a smaller inner flame cut in white inside it.',
    'frost_mage': 'A large six-armed snowflake facing front, each arm thick and blunt with two short side branches.',
    'thunder_mage': 'A thick zigzag lightning bolt standing on its point, reaching from the top to the bottom of the cell.',
    'sniper': "An eagle's head in profile facing right, a sharp hooked beak, one keen eye cut in white.",
    'bowmaster': 'A tall leather quiver standing upright, five arrows packed in it with their fletchings fanned out at the top.',
    'ranger': "A stag's head facing front, two large branching antlers.",
    'bishop': "A bishop's tall pointed mitre facing front, a plain cross cut out of its front in white, two short ribbons hanging below.",
    'black_priest': 'A thick closed book seen from the front, a chunky chain crossed over its cover in an X, a padlock hanging at the front.',
    'monk': 'A raised clenched fist facing front, cloth wrapping bands around the knuckles, a string of chunky prayer beads around its wrist.',
}

# sheet -> tiles (tile order = list order, 1 = top left). Repeated keys are second takes.
SHEETS = {
    '19': ['cls_warrior_t4_sweep', 'cls_warrior_t4_onslaught', 'cls_warrior_t4_hide', 'cls_knight_t4_helmbreaker',
           'cls_knight_t4_sworn', 'cls_knight_t4_turned', 'cls_mage_t4_arcana', 'cls_mage_t4_pages', 'cls_mage_t4_circle'],
    '20': ['cls_priest_t4_sin', 'cls_priest_t4_cup', 'cls_priest_t4_prayer', 'cls_archer_t4_second', 'cls_archer_t4_rhythm',
           'cls_archer_t4_fleet', 'sin_wrath_t4_blood', 'sin_wrath_t4_rally', 'sin_wrath_t4_steady'],
    '21': ['sin_envy_t4_strip', 'sin_envy_t4_grudge', 'sin_envy_t4_misery', 'sin_greed_t4_bounty', 'sin_greed_t4_search',
           'sin_greed_t4_ward', 'sin_sloth_t4_heavy', 'sin_sloth_t4_idle', 'sin_sloth_t4_defer'],
    '22': ['sin_gluttony_t4_consume', 'sin_gluttony_t4_feast', 'sin_gluttony_t4_stomach', 'sin_lust_t4_exposed',
           'sin_lust_t4_embrace', 'sin_lust_t4_beguile', 'sin_pride_t4_contempt', 'sin_pride_t4_charge', 'sin_pride_t4_unbowed'],
    '23': ['cls_warrior_t1_cooldown', 'cls_knight_t1_cooldown', 'cls_mage_t1_cooldown', 'cls_priest_t1_cooldown',
           'cls_archer_t1_cooldown', 'cls_warrior_t1_speed', 'cls_knight_t1_speed', 'cls_mage_t1_speed', 'cls_priest_t1_speed'],
    '24': ['cls_archer_t1_speed', 'cls_mage_t1_hp', 'cls_priest_t1_hp', 'cls_archer_t1_hp', 'cls_warrior_t2_hp',
           'cls_warrior_t2_fhr', 'cls_knight_t2_fhr', 'cls_knight_t2_ddr', 'cls_mage_t3_robe'],
    '25': ['cls_priest_t3_robe', 'sin_wrath_t2_g6', 'sin_envy_t2_crit', 'sin_envy_t2_resall', 'sin_envy_t2_cdr',
           'sin_greed_t2_g6', 'sin_sloth_t2_hppct', 'sin_sloth_t2_regen', 'sin_gluttony_t2_hppct'],
    '26': ['sin_gluttony_t2_atk', 'sin_lust_t2_resall', 'sin_pride_t2_g3',
           'cls_knight_t2_ddr', 'sin_sloth_t2_regen', 'sin_lust_t2_resall', 'cls_knight_t2_fhr', 'cls_mage_t1_cooldown', 'sin_greed_t2_g6'],
}
# 27 = tiles weak in the 40/80px board review of 19-26 — a new sentence each (T below), tile 9 = second take of tile 6
#   (19-26 prompt files keep the text that drew them)
RETAKE = {
    'sin_envy_t2_resall': 'A heater shield facing front, one thick blunt thorny vine wound diagonally across its face.',   # round shield read as a ball
    'sin_greed_t2_g6': 'An open book lying flat facing the viewer, one large coin standing upright on its open pages.',   # coin stack read as a database drum
    'sin_greed_t4_ward': 'A heater shield facing front, one large round coin cut into its center in white.',   # coin ring read as an empty frame
    'sin_gluttony_t4_feast': 'A plump roast chicken sitting on a flat platter facing front, its two drumsticks pointing up.',   # fist + drumstick read as a ball
    'cls_priest_t1_hp': 'A plump heart facing front, a flat halo ring floating level above its top.',   # stole read as a jacket
    'cls_archer_t1_hp': 'A plump heart facing front, a short hunting bow (the weapon: two curved wooden limbs and a thick taut string) lying level across its lower half.',   # drew a ribbon bow
    'cls_archer_t1_speed': 'A single arrow pointing straight up, one small feathered wing spreading from each side of its shaft.',   # bracer read as a bandaged arm
    'cls_archer_t4_second': 'A short bow standing upright, two arrows nocked on its string at once, both pointing to the right.',   # two arrows read as UI upgrade arrows
}
T.update(RETAKE)
SHEETS['27'] = list(RETAKE) + ['cls_archer_t1_hp']
# 28 = the three still weak after 27 (edge-on coin read as an egg · coin cut read as a hole · level bow read as a belt) —
#   three takes each
RETAKE2 = {
    'sin_greed_t2_g6': 'An open book lying flat facing the viewer, one large coin standing upright on its pages with its round face fully turned to the viewer.',
    'sin_greed_t4_ward': 'A heater shield facing front, a short stack of three coins standing in front of its lower half.',
    'cls_archer_t1_hp': 'A plump heart facing front, a wooden longbow standing upright behind its right side, taller than the heart, its thick string straight.',
}
T.update(RETAKE2)
SHEETS['28'] = list(RETAKE2) * 3
# 29 = greed T2 g6 (XP) once more — 28's coin was a plain disk (read as a ball). Three compositions x three takes;
#   the keys are aliases so each composition keeps its own sentence (TAKE_OF maps them back to the node).
T.update({
    'sin_greed_t2_g6@ring': "An open book lying flat facing the viewer, one large coin standing upright on its pages with its round face turned to the viewer, one thick white ring cut just inside the coin's rim.",
    'sin_greed_t2_g6@heap': 'An open book lying flat facing the viewer, a small heap of round coins piled on its pages, each coin with a white rim line.',
    'sin_greed_t2_g6@scroll': 'A rolled scroll lying level, tied in the middle with a thick band, a large round coin seal hanging from the band with one thick white ring cut inside its rim.',
})
TAKE_OF = {k: k.split('@')[0] for k in T if '@' in k}
SHEETS['29'] = ['sin_greed_t2_g6@ring', 'sin_greed_t2_g6@heap', 'sin_greed_t2_g6@scroll'] * 3
NODES = [k for k in T if '@' not in k]          # the installed keys (one picture per node)
ADV_SHEETS = {
    '01': ['berserker', 'barbarian', 'vanguard', 'guardian', 'paladin', 'crusader', 'fire_mage', 'frost_mage', 'thunder_mage'],
    '02': ['sniper', 'bowmaster', 'ranger', 'bishop', 'black_priest', 'monk', 'berserker', 'vanguard', 'black_priest'],
}
# key -> installed 'sheet-tile' (40/80px board review; default = first take)
PICK = {'sin_envy_t2_resall': '27-1', 'sin_greed_t2_g6': '29-1', 'sin_greed_t4_ward': '28-2', 'sin_gluttony_t4_feast': '27-4',
        'cls_priest_t1_hp': '27-5', 'cls_archer_t1_hp': '28-3', 'cls_archer_t1_speed': '27-7', 'cls_archer_t4_second': '27-8',
        'vanguard': 'a02-8'}   # vanguard second take: the pole runs through, reads as a standard

HEAD = open(os.path.join(HERE, 'sheet_16_prompt.txt'), encoding='utf-8').read().split('Row 1 (left to right):')[0]
ADV_HEAD = (HEAD
            .replace('Use the attached sheet for RENDERING STYLE ONLY — chunky solid black silhouettes, never thin lines.',
                     'Use the attached sheet for RENDERING STYLE ONLY — bold solid black emblem silhouettes with a few clean white cut lines, never thin lines. Ignore its gray grid lines.')
            .replace('9 fantasy passive-skill icons', '9 fantasy class-emblem icons'))
assert ADV_HEAD != HEAD and 'class-emblem' in ADV_HEAD and 'Ignore its gray grid' in ADV_HEAD


def grid(text, ids):
    lines = []
    for r in range(0, 9, 3):
        lines.append(f'Row {r // 3 + 1} (left to right):')
        for j, k in enumerate(ids[r:r + 3]):
            lines.append(f'{r + j + 1}. {text[k]}')
        lines.append('')
    return '\n'.join(lines)


def dest(key):
    return f"{'class' if key.startswith('cls_') else 'sin'}/{key}.png"


if __name__ == '__main__':
    rd = lambda f: list(csv.DictReader(open(os.path.join(REPO, 'src/data', f), encoding='utf-8-sig')))
    nodes = {r['node_id']: r for r in rd('mastery_node.csv')}
    advs = [r['advance_id'] for r in rd('advance.csv')]
    # every key is a live, own-picture node (not a '*' common node)
    for k in T:
        k = TAKE_OF.get(k, k)
        assert k in nodes and nodes[k]['owner_id'] != '*', k
    # every T4 node is in the batch
    t4 = {k for k, r in nodes.items() if r['tier'] == '4'}
    assert t4 <= set(T), t4 - set(T)
    assert set(A) == set(advs), set(A) ^ set(advs)
    used = [k for ids in SHEETS.values() for k in ids]
    assert set(used) == set(T), set(T) ^ set(used)
    assert set(k for ids in ADV_SHEETS.values() for k in ids) == set(A)
    assert all(len(v) == 9 for v in list(SHEETS.values()) + list(ADV_SHEETS.values()))
    # the T4 tile order is the one sheet_19_22_t4_tiles.txt promises
    tiles = open(os.path.join(HERE, 'sheet_19_22_t4_tiles.txt'), encoding='utf-8').read()
    for no in ('19', '20', '21', '22'):
        line = next(l for l in tiles.splitlines() if l.startswith(f'sheet_{no}:'))
        assert [p.split('=')[1].strip() for p in line.split(':', 1)[1].split('·')] == SHEETS[no], no

    for no, ids in SHEETS.items():
        if not os.path.exists(os.path.join(HERE, f'sheet_{no}_codex.png')):
            open(os.path.join(HERE, f'sheet_{no}_prompt.txt'), 'w', encoding='utf-8').write(HEAD + grid(T, ids))
    os.makedirs(ADV_SRC, exist_ok=True)
    for no, ids in ADV_SHEETS.items():
        if not os.path.exists(os.path.join(ADV_SRC, f'sheet_{no}_codex.png')):
            open(os.path.join(ADV_SRC, f'sheet_{no}_prompt.txt'), 'w', encoding='utf-8').write(ADV_HEAD + grid(A, ids))
    json.dump({'sheets': SHEETS, 'adv_sheets': ADV_SHEETS, 'dest': {k: dest(k) for k in NODES}, 'take_of': TAKE_OF, 'pick': PICK},
              open(os.path.join(HERE, 'plan_20261114.json'), 'w', encoding='utf-8'), indent=1)
    print('mastery tiles', len(T), 'advance icons', len(A), 'sheets', list(SHEETS), 'adv', list(ADV_SHEETS))
