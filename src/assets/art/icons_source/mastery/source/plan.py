# -*- coding: utf-8 -*-
"""Mastery node icon plan (sin + class boards): node key -> tile text. Writes sheet prompts + plan.json.
Style = advance node icons (advance/source/) but SOLID BLACK ONLY (the screen tints the alpha with the board colour)
and STATIC (emblem-like, no motion). Sin nodes draw the node name in that sin's vocabulary, class nodes draw the
stat or the gear in that class's vocabulary — one main object, at most one small detail.

Key = node_id, except the class-common weapon node (owner '*') which gets one drawing per class:
<node_id>_<class_id> (warrior mace · knight spear · mage orb · priest crucifix · archer bow).
2026-10-09 R230 — T2-2 (slow weapon) became one node per class (cls_<class>_t2_<group>); its drawing is the old
cls_t2_weapon_atkspeed_<class> tile, renamed. Class key order keeps the sheet 01-08 tile positions:
T1 three · armor T2-3 · common T2-1 · own weapon T2-2.
Row layout: one sin or class = two rows (row 1 = T1 three, row 2 = T2 three) -> 24 rows = 8 sheets of 3x3."""
import csv, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, *['..'] * 6))

T = {
    # wrath — horns, flame, blood
    'sin_wrath_t1_atkspeed': 'Two hand axes crossed in an upright X, heads at the top, one small flame rising between the heads.',
    'sin_wrath_t1_critchance': 'A broad heavy dagger standing point-up, a wide blade, its crossguard shaped like two short horns, a small four-point glint at the tip.',
    'sin_wrath_t1_critdamage': 'A broad heavy curved blade shaped like a great fang, thick from hilt to tip, hanging point-down, one fat drop of blood under its tip.',
    'sin_wrath_t2_gear': 'A horned helmet facing front, a short crest of flame on its top.',
    'sin_wrath_t2_wounded_crit': 'A heart drawn as a thick black rim with a hollow white inside, only its bottom quarter filled solid, a dagger standing point-up behind it.',
    'sin_wrath_t2_wounded_critdmg': 'A horned skull facing front, one fat drop of blood under its jaw.',
    # envy — slit eye, serpent, thorns
    'sin_envy_t1_defignore': 'One wide-open almond eye facing front: a white eyeball inside a black lid shape, a narrow black slit pupil.',
    'sin_envy_t1_reflect': 'A round shield facing front, a white ring cut just inside its rim and a round boss at its center, short thick thorns standing out around the rim.',
    'sin_envy_t1_resignore': 'A serpent coiled upright, its head bent forward and low, mouth closed.',
    'sin_envy_t2_gear': 'A closed helmet facing front, one slit-pupil eye staring out of its visor slot.',
    'sin_envy_t2_stronger_defignore': "A tall stone pillar wrapped in a thick thorny vine, the pillar's top broken off.",
    'sin_envy_t2_stronger_reflect': 'A tall kite shield facing front, a serpent coiled along its rim with its head raised at the top, mouth closed.',
    # greed — coins, sack, gem, chest
    'sin_greed_t1_gold': 'An open hand facing front, palm up, a stack of three coins standing on the palm.',
    'sin_greed_t1_itemfind': 'A bulging sack tied at the neck, a sword hilt sticking out of its top.',
    'sin_greed_t1_magicfind': 'A large faceted gem facing front, a round magnifying loupe held over one corner.',
    'sin_greed_t2_gear': 'A helmet resting on top of a small heap of a few large coins.',
    'sin_greed_t2_elite_atk': 'The mounted trophy head of a great horned beast on a shield-shaped plaque, facing front.',
    'sin_greed_t2_elite_crit': 'An open treasure chest facing front, coins heaped above its rim, one small four-point glint.',
    # sloth — pillow, moon, hourglass, bed, drowsy eye, snail
    'sin_sloth_t1_hp': 'A plump heart lying on a fat soft pillow.',
    'sin_sloth_t1_dr': 'A round shield facing front, a crescent moon cut out of its face in white.',
    'sin_sloth_t1_cdr': 'An hourglass lying on its side, at rest.',
    'sin_sloth_t2_gear': 'A small bed seen from the side, a thick quilt and a fat pillow.',
    'sin_sloth_t2_tick_dr': 'A drowsy eye facing front, its heavy upper lid drooping half closed.',
    'sin_sloth_t2_tick_cdr': 'A snail seen from the side, resting level, a big round spiral shell.',
    # gluttony — meat, maw, cauldron, bowl, goblet, boar
    'sin_gluttony_t1_hp': 'A roasted leg of meat on the bone, standing upright, the big round meat end at the top.',
    'sin_gluttony_t1_crush': 'A huge fanged maw seen from the front, jaws wide open.',
    'sin_gluttony_t1_resall': 'A heavy round iron cauldron on three short legs, facing front, a thick lid on top.',
    'sin_gluttony_t2_gear': 'A deep bowl heaped high with food, a big spoon standing up in it.',
    'sin_gluttony_t2_sated_crush': 'A tall goblet filled to the brim, one drop running over its lip.',
    'sin_gluttony_t2_sated_resall': "A boar's head facing front, thick heavy hide, two short tusks.",
    # lust — lips, rose, perfume, veil, locket, siren
    'sin_lust_t1_lifesteal': 'A pair of full lips facing front, one fat drop hanging from the lower lip.',
    'sin_lust_t1_critchance': 'A single rose standing upright on a thick stem, one large sharp thorn.',
    'sin_lust_t1_buffdur': 'A perfume bottle with a round heart-shaped body and a tall stopper.',
    'sin_lust_t2_gear': 'A veiled head seen from the front: a narrow circlet on top, the veil draped over the whole head and falling to the shoulders, no face visible.',
    'sin_lust_t2_ailing_crit': 'A heart-shaped locket hanging from a short chain of three fat links, a sharp point at its bottom.',
    'sin_lust_t2_ailing_lifesteal': "A mermaid's tail curling up into a heart shape.",
    # pride — lion, crown, throne, mirror, peacock
    'sin_pride_t1_dr': "A tall kite shield facing front, a lion's head cut out of its face in white.",
    'sin_pride_t1_atk': 'A broad heavy sword standing point-down, a wide blade, a small crown resting on its pommel at the top.',
    'sin_pride_t1_fhr': 'A tall-backed throne seen from the front.',
    'sin_pride_t2_gear': 'A tall crown resting on a plump square cushion, facing front.',
    'sin_pride_t2_weaker_atk': 'An armored boot planted on top of a small helmet.',
    'sin_pride_t2_weaker_dr': 'A single peacock feather standing upright, a large round eye-spot near its tip.',
    # warrior — axe, mace, fist, fur
    'cls_warrior_t1_hp': 'A plump heart, a short hand axe crossed behind it.',
    'cls_warrior_t1_resall': "A bear-pelt cloak seen from the front, the bear's head as its hood.",
    'cls_warrior_t1_atk': 'A clenched fist facing front, knuckles forward, a thick leather wrap around the wrist.',
    'cls_warrior_t2_heavy': 'A heavy breastplate facing front, broad round shoulder plates, a fur collar.',
    'cls_t2_weapon_damage_warrior': 'A flanged mace standing upright, the head at the top.',
    'cls_warrior_t2_axe': 'A big two-handed battle axe standing upright, the wide blade at the top.',
    # knight — plate, heater shield, gauntlet, great helm
    'cls_knight_t1_hp': 'A plump heart with a band of plate armor across its middle.',
    'cls_knight_t1_def': 'A heater shield facing front, one broad white diagonal band across its face.',
    'cls_knight_t1_dr': 'An armored gauntlet raised palm-forward, fingers together, facing front.',
    'cls_knight_t2_heavy': 'A closed great helm facing front, a narrow eye slit.',
    'cls_t2_weapon_damage_knight': 'A heavy spear resting on a calm diagonal, a thick shaft and a broad leaf-shaped head at the top right.',
    'cls_knight_t2_sword2h': 'A two-handed greatsword standing point-down, long grip, wide crossguard.',
    # mage — pointed hat, star, crystal, robe, scroll
    # 2026-10-09 R230 — T1-1 casting speed (was attack speed: a winged pointed hat) · T1-3 damage (was crushing blow:
    #   a boulder in a crater) · T2-3 robe = HP (was defense). Speed = wings and damage = fist stay the class-board symbols.
    'cls_mage_t1_castspeed': 'A rolled spell scroll standing upright, its ends curled, a small pair of swept-back wings at its middle.',
    'cls_mage_t1_cdr': 'An hourglass standing upright, a small four-point star on its top.',
    'cls_mage_t1_atk': 'A clenched fist facing front, knuckles forward, a wide bell-shaped robe sleeve around the wrist, a small four-point star above the knuckles.',
    'cls_mage_t2_robe': "A wizard's robe facing front, a high pointed collar, wide bell sleeves, a plump heart cut out of its chest in white.",
    'cls_t2_weapon_damage_mage': 'A glass orb held in a three-pronged claw on a short stand.',
    'cls_mage_t2_staff': 'A tall staff resting on a calm diagonal, a crystal set in its curled top.',
    # priest — mitre, cross, candle, vestment, book, praying hands
    # 2026-10-09 R230 — T1-1 casting speed (was attack speed: a winged mitre) · T2-3 robe = HP (was defense)
    'cls_priest_t1_castspeed': 'Two hands pressed together in prayer, fingers pointing up, facing front, a small swept-back wing on each side.',
    'cls_priest_t1_cdr': 'An hourglass standing upright, a small cross on its top.',
    'cls_priest_t1_buffdur': 'A tall candle burning with one calm, steady flame.',
    'cls_priest_t2_robe': "A long priest's vestment facing front, a broad stole hanging down both sides of its front, a plump heart cut out of its chest in white between them.",
    'cls_t2_weapon_damage_priest': 'A crucifix standing upright, thick arms, a short handle at its base.',
    'cls_priest_t2_bible': 'A thick closed book standing upright, a plain cross cut out of its cover in white.',
    # archer — arrow, target, hood, bow
    'cls_archer_t1_atkspeed': 'An arrow standing upright, big swept-back fletching like a pair of wings.',
    'cls_archer_t1_critchance': 'A broad sharp arrowhead pointing up, a small four-point glint at its tip.',
    'cls_archer_t1_hitbonus': 'A round target of concentric rings seen from the front, one arrow stuck dead center.',
    'cls_archer_t2_light': 'A leather hood with a short shoulder cape, seen from the front, the face opening empty white.',
    'cls_t2_weapon_damage_archer': 'A heavy longbow standing upright, thick limbs and a thick taut string, no arrow.',
    'cls_archer_t2_crossbow': 'A crossbow seen from above, pointing straight up, a bolt loaded.',
}

HEAD = """Generate exactly ONE image with your built-in image generation tool. Do not write code, do not run shell commands, do not create or edit any files yourself. When the image is done, reply with one line: the saved image path.

=== IMAGE PROMPT ===

Use the attached sheet for RENDERING STYLE ONLY — chunky solid black silhouettes, never thin lines. Do NOT copy its subjects, its compositions or its colors; every icon below is a new drawing.

2048x2048 sheet, 3x3 grid, 9 fantasy passive-skill icons on a PLAIN SOLID WHITE background. Each icon is centered in its cell and fills about 70% of it, with white margin all around — no icon may touch a grid line, the sheet edge, or another icon. Keep every icon fully inside its own third of the sheet. Do not draw grid lines. No text anywhere, no letters, no numbers, no runes. No drop shadows, no background scene, no frames, no circles around the icons.

- Every icon is SOLID BLACK ONLY — one flat black, no accent color, no gray, no gradient, no outline, no shading, no glow.
- Each icon is one main object, and may add one small secondary detail. No effect shapes.
- Calm, still, emblem-like compositions, like a charge on a coat of arms: each object stands upright or lies level, faces the viewer, and sits centered and balanced. Long weapons may rest on a calm 45-degree diagonal. Nothing swings, flies, bursts or splashes — no motion streaks, no impact bursts, no speed lines, no sparks.
- Plain and restrained: the theme shows in the choice of object, never in decoration. No ornament, no filigree, no extra spikes or flames beyond what a tile asks for.
- Silhouettes stay SOLID black masses: at most three short white cut lines per icon, only to separate parts or to show the one white detail a tile asks for. No cracks unless asked, no plate seams, no rivets, no scratches, no texture, no stipple.
- Chains, stems, thorns, strings and feathers are CHUNKY — thick and blunt, never thin lines.
- All nine icons share the same visual weight and the same amount of detail.
- Where two shapes overlap, keep a clean white gap between them so they never merge into one mass.

"""

SINS = ['wrath', 'envy', 'greed', 'sloth', 'gluttony', 'lust', 'pride']
CLASSES = ['warrior', 'knight', 'mage', 'priest', 'archer']

rows = list(csv.DictReader(open(os.path.join(REPO, 'src/data/mastery_node.csv'), encoding='utf-8-sig')))
common = [r['node_id'] for r in rows if r['tree_kind'] == 'class' and r['owner_id'] == '*']
keys, dest = [], {}
for s in SINS:
    for tier in ('1', '2'):
        for r in rows:
            if r['tree_kind'] == 'sin' and r['owner_id'] == s and r['tier'] == tier:
                keys.append(r['node_id'])
                dest[r['node_id']] = f"sin/{r['node_id']}.png"
own = lambda c, tier, gate: [r['node_id'] for r in rows if r['tree_kind'] == 'class' and r['owner_id'] == c
                             and r['tier'] == tier and r['requires'].startswith(gate)]
for c in CLASSES:
    # T1 three · armor T2-3 · common T2-1 · own weapon T2-2 — the tile order of sheets 01-08 (R230 kept it)
    for k in own(c, '1', '') + own(c, '2', 'armor:'):
        keys.append(k)
        dest[k] = f'class/{k}.png'
    for n in common:
        keys.append(f'{n}_{c}')
        dest[f'{n}_{c}'] = f'class/{n}_{c}.png'
    for k in own(c, '2', 'weapon:'):
        keys.append(k)
        dest[k] = f'class/{k}.png'

n_csv = sum(1 for r in rows if r['tree_kind'] in ('sin', 'class') and r['owner_id'] != '*')
assert len(keys) == n_csv + len(common) * len(CLASSES), (len(keys), n_csv)
missing = [k for k in keys if k not in T]
extra = [k for k in T if k not in keys]
assert not missing and not extra, (missing, extra)
assert len(keys) % 9 == 0, len(keys)

sheets = {}
for i in range(0, len(keys), 9):
    no = f'{i // 9 + 1:02d}'
    chunk = keys[i:i + 9]
    sheets[no] = chunk
    lines = []
    for r in range(0, 9, 3):
        lines.append(f'Row {r // 3 + 1} (left to right):')
        for j, k in enumerate(chunk[r:r + 3]):
            lines.append(f'{r + j + 1}. {T[k]}')
        lines.append('')
    if os.path.exists(os.path.join(HERE, f'sheet_{no}_codex.png')):
        continue  # already drawn — its prompt file stays the text that drew it
    open(os.path.join(HERE, f'sheet_{no}_prompt.txt'), 'w', encoding='utf-8').write(HEAD + '\n'.join(lines))

# re-roll sheets — tiles that were weak at 40px in the first pass (T holds their revised text). Tile order = list order.
RETRY = {
    '09': ['sin_envy_t1_reflect', 'sin_wrath_t1_critdamage', 'sin_pride_t2_gear',      # spiked ball · thin fang · magnifier (= greed loupe)
           'sin_lust_t2_gear', 'cls_t2_weapon_damage_archer', 'sin_pride_t1_atk',      # veil read as a table · thin bow · thin sword
           'cls_t2_weapon_damage_knight', 'sin_greed_t2_gear', 'sin_wrath_t1_critchance'],  # thin spear · busy coins · thin dagger
    # 2026-10-09 R230 — the five class tiles whose effect changed. Tiles 6-9 are second takes of tiles 1-4 (same text);
    #   PICK says which tile was installed.
    '10': ['cls_mage_t1_castspeed', 'cls_priest_t1_castspeed', 'cls_mage_t1_atk',
           'cls_mage_t2_robe', 'cls_priest_t2_robe', 'cls_mage_t1_castspeed',
           'cls_priest_t1_castspeed', 'cls_mage_t1_atk', 'cls_mage_t2_robe'],
}
# node key -> installed tile number (1-9) in its re-roll sheet. Sheet 10: both takes read the same at 40px — first takes went in
PICK = {'cls_mage_t1_castspeed': 1, 'cls_priest_t1_castspeed': 2, 'cls_mage_t1_atk': 3, 'cls_mage_t2_robe': 4, 'cls_priest_t2_robe': 5}
for no, chunk in RETRY.items():
    assert len(chunk) == 9 and all(k in T for k in chunk), chunk
    sheets[no] = chunk
    if os.path.exists(os.path.join(HERE, f'sheet_{no}_codex.png')):
        continue
    lines = []
    for r in range(0, 9, 3):
        lines.append(f'Row {r // 3 + 1} (left to right):')
        for j, k in enumerate(chunk[r:r + 3]):
            lines.append(f'{r + j + 1}. {T[k]}')
        lines.append('')
    open(os.path.join(HERE, f'sheet_{no}_prompt.txt'), 'w', encoding='utf-8').write(HEAD + '\n'.join(lines))
json.dump({'sheets': sheets, 'dest': dest, 'nodes': keys, 'pick': PICK}, open(os.path.join(HERE, 'plan.json'), 'w'), indent=1)
print('nodes', len(keys), 'sheets', {k: len(v) for k, v in sheets.items()})
