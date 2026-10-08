# -*- coding: utf-8 -*-
"""Advance node icon plan: node key (<skill_id>_<slot>) -> tile text. Writes sheet prompts + plan.json."""
import csv, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = r'C:\Users\user\Desktop\python_text\git\TheSevenSimulationRPG'

# sheet 01 (pilot, already drawn) in tile order
SHEET01 = ['war_ragnarok_2', 'war_ragnarok_3', 'war_ragnarok_4', 'war_berserk_2', 'war_berserk_3', 'war_berserk_4',
           'war_mutualruin_2', 'war_mutualruin_3', 'war_whirlwind_2']

# same effect -> same icon (key -> key that owns the drawing)
SHARED = {
    'war_shockwave_3': 'war_mutualruin_2', 'arc_trap_2': 'war_mutualruin_2',            # Stun
    'arc_quickdraw_2': 'war_whirlwind_2', 'pri_sweep_2': 'war_whirlwind_2',              # Stagger
    'mag_firewall_2': 'mag_meteor_2', 'mag_hydra_2': 'mag_meteor_2',                     # Burn
    'mag_blizzard_2': 'mag_frozenorb_2', 'mag_frostburst_2': 'mag_frozenorb_2',          # Freeze
    'war_intimidate_4': 'war_lionsroar_2',                                               # enemy attack speed down
    'mag_nova_2': 'mag_thunderstrike_2',                                                 # bonus damage chance
}

T = {
    # warrior - barbarian
    'war_whirlwind_3': 'A sword on a steep diagonal with three bold crescent slash arcs trailing behind it, one after another. Slash arcs #4FB3E8.',
    'war_whirlwind_4': 'A round shield cut in half by a sword stroke, the halves sliding apart, a bold downward chevron beneath. Chevron #8E44AD.',
    'war_thorswrath_2': 'A heavy war hammer smashing down onto a breastplate that bursts apart, a jagged impact star at the hit. Impact star #F4C430.',
    'war_thorswrath_3': 'A lightning bolt striking a skull and leaping onward in a second jagged arc to a large horned helmet. Lightning #F4C430.',
    'war_shockwave_2': 'An armored boot shackled to a heavy iron ball by a short chain, three slow trailing arcs behind it. Trailing arcs #48C9B0.',
    # warrior - vanguard
    'war_lionsroar_2': 'A sword pointing down with two broken bird wings drooping from its crossguard, a bold downward chevron beside it. Chevron #8E44AD.',
    'war_lionsroar_3': 'A sword pointing up with two spread bird wings on its crossguard, a small war banner beside it, a bold upward chevron. Chevron #E8501F.',
    'war_command_2': 'A war banner on a tilted pole, a bold target reticle with a burst at its center beside it. Reticle #E8501F.',
    'war_command_3': 'A war banner on a tilted pole, a fanged maw beside it dripping three fat blood drops. Blood drops #C8102E.',
    'war_intimidate_2': 'An hourglass wrapped tightly in a heavy chain locked with a padlock. Sand #8E44AD.',
    'war_intimidate_3': 'A horned helmet with a wide-open roaring mouth, three bold jagged shout blasts bursting from it. Shout blasts #E8501F.',
    # knight - guardian
    'kni_lastbastion_2': 'A tall tower shield standing in front of a smaller round shield, an arrow snapping against the tall one, a protective arc over both. Arc #4A90E2.',
    'kni_lastbastion_3': 'A nearly empty heart with a tower shield springing up in front of it, three short alarm spikes above. Heart #E84A5F.',
    'kni_lastbastion_4': 'A kneeling knight leaning on a sword planted in the ground, a thin sliver of a heart floating above him. Heart sliver #E84A5F.',
    'kni_unbreakablewill_2': 'Three shield plates stacked on a tilt, the top plate bearing a flame, a snowflake and a lightning bolt emblem side by side. Emblems #5DADE2.',
    'kni_unbreakablewill_3': 'Three shield plates stacked on a tilt, the top plate tumbling off the stack, a bold downward chevron. Chevron #5DADE2.',
    'kni_unbreakablewill_4': 'A tall stack of shield plates with three bold arrows spreading from it to three small round shields. Arrows #5DADE2.',
    'kni_divinejudgment_2': 'A round shield bouncing an arrow back, the returning arrow snapping in two, a bold downward chevron. Bounce burst #F4C430.',
    'kni_divinejudgment_3': 'A round shield firing three bold arrows outward in a wide fan. Arrows #F4C430.',
    'kni_divinejudgment_4': 'A round shield exploding outward, eight jagged spikes radiating from its rim. Spikes #F4C430.',
    # knight - paladin
    'kni_unyieldingoath_2': 'A kite shield with a broken arrow at its foot, a bold halo ring floating around the shield. Halo #F5D76E.',
    'kni_unyieldingoath_3': 'Three small kite shields in a row, each with its own halo ring floating above it. Halos #F5D76E.',
    'kni_unyieldingoath_4': 'A broken gravestone with a pair of wings rising up out of it. Wings #F5D76E.',
    'kni_holywar_2': 'A kite shield inside a bold circular refill arrow that wraps around it. Arrow #F39C12.',
    'kni_holywar_3': 'A kite shield shattered into four pieces, a small explosion at each break. Explosions #F39C12.',
    'kni_holywar_4': 'Three arrows plunging into a round bomb-orb that swells larger. Orb #F39C12.',
    'kni_vow_2': 'A war banner on a tilted pole, a heart with a bold upward chevron beside it. Heart #E84A5F.',
    'kni_vow_3': 'A skull with a bold arrow flowing out of it into a much larger heart. Heart and arrow #E84A5F.',
    # knight - crusader
    'kni_retribution_2': 'A broad sword sweeping sideways through three helmets in a row, one wide crescent slash. Slash #C0392B.',
    'kni_retribution_3': 'An arrow striking a breastplate, three thick upward chevrons rising from the impact. Chevrons #E67E22.',
    'kni_retribution_4': 'A skull wearing a crown of thorns, three drops of blood running down. Blood #C0392B.',
    'kni_condemnation_2': 'A heart with a horizontal bar high across it, the part below the bar filled, a bold upward arrow pushing the bar up. Filled part #C0392B.',
    'kni_condemnation_3': 'A skull inside a bold circular arrow that loops all the way around it. Arrow #C0392B.',
    'kni_condemnation_4': 'A skull with a war banner planted in its top, a bold upward chevron beside it. Chevron #E67E22.',
    'kni_showdown_2': 'A sword with a heavy chain around its blade snapping apart. Snap burst #9B59B6.',
    'kni_showdown_3': 'An hourglass carried from a skull along a bold curved arrow toward a large horned helmet. Arrow #9B59B6.',
    'kni_showdown_4': 'A sword striking down, a bold ghost copy of the blade trailing just behind it. Ghost blade #9B59B6.',
    # mage - fire
    'mag_meteor_2': 'A skull wreathed in roaring flames rising from its top. Flames #E8501F.',
    'mag_meteor_3': 'A scorched crater in the ground with small flames burning along its rim. Flames #E8501F.',
    'mag_meteor_4': 'Three meteors falling on a steep diagonal, each with a long fiery tail. Tails #E8501F.',
    'mag_hydra_3': 'A serpent body splitting into three fanged heads, a small flame from each mouth. Flames #E8501F.',
    'mag_hydra_4': 'A round shield with a flame emblem on it, a bold downward chevron beside it. Flame emblem #E8501F.',
    # mage - frost
    'mag_frozenorb_2': 'A skull locked inside a jagged block of ice. Ice #4FB3E8.',
    'mag_frozenorb_3': 'A round orb with eight sharp ice shards bursting outward from it. Shards #4FB3E8.',
    'mag_blizzard_3': 'A heavy storm cloud above a sword pointing down, snow falling between them. Snow #4FB3E8.',
    'mag_blizzard_4': 'A heavy storm cloud above a skull, sharp ice shards raining down onto it. Shards #4FB3E8.',
    'mag_frostburst_3': 'An ice crystal bursting apart, three bold stars spinning above it. Ice burst #4FB3E8.',
    'mag_frostburst_4': 'A round shield with a snowflake emblem on it, a bold downward chevron beside it. Snowflake #4FB3E8.',
    # mage - thunder
    'mag_thunderstrike_2': 'A lightning bolt forking into two strikes, a bold upward chevron beside it. Lightning #F4C430.',
    'mag_thunderstrike_3': 'A storm cloud with a lightning bolt striking down, a bold circular arrow looping around the cloud. Lightning #F4C430.',
    'mag_nova_3': 'A ring of lightning around a staff head, three upward chevrons stacked beside it. Lightning ring #F4C430.',
    # archer - sniper
    'arc_trueaim_2': 'A heavy iron ball whose chain is snapping off an armored boot, broken links flying. Snap burst #2ECC71.',
    'arc_trueaim_3': 'A bow with its string cut, beside an hourglass with bold speed lines streaming off it. Speed lines #2ECC71.',
    'arc_trueaim_4': 'A target reticle locked on a helmet standing behind a low wall of shields. Reticle #E74C3C.',
    'arc_singlestrike_2': 'A single lone helmet inside a bold target reticle, empty ground around it. Reticle #E74C3C.',
    'arc_singlestrike_3': 'A fully drawn longbow with a bold eye shape at the arrow tip. Eye #E74C3C.',
    'arc_singlestrike_4': 'Two arrows flying one right behind the other on a steep diagonal, a bold trail behind each. Trails #E74C3C.',
    'arc_reload_2': 'An arrow with a huge barbed head, a jagged burst at its tip. Burst #F4C430.',
    'arc_reload_3': 'Three arrows bundled inside a bold circular arrow that loops around them. Loop #F4C430.',
    'arc_reload_4': 'A skull pierced by an arrow, a bold shockwave ring blasting out from it. Shockwave #F4C430.',
    # archer - bowmaster
    'arc_quickdraw_3': 'Six arrows fanning out from one point in a wide spread. Arrowheads #2ECC71.',
    'arc_quickdraw_4': 'An arrow striking a target, two bold impact stars bursting at the hit one after another. Impact stars #2ECC71.',
    'arc_fulldraw_2': 'An arrow with a heavy hammer head instead of a tip, smashing into a breastplate. Impact burst #E67E22.',
    'arc_fulldraw_3': 'An arrow flying straight at a large heart. Heart #E84A5F.',
    'arc_fulldraw_4': 'A target reticle over an open spellbook. Reticle #E67E22.',
    'arc_chaindraw_2': 'An arrow piercing straight through a small helmet and into a larger helmet behind it, a bold trail. Trail #9B59B6.',
    'arc_chaindraw_3': 'A skull with an arrow bursting out of its top. Arrow #9B59B6.',
    'arc_chaindraw_4': 'A skull exploding into jagged shards. Explosion #9B59B6.',
    # archer - ranger
    'arc_huntersmark_2': "A diamond-shaped hunter's mark jumping from a skull along a bold curved arrow to a large helmet. Mark and arrow #27AE60.",
    'arc_huntersmark_3': "Three diamond-shaped hunter's marks floating above three helmets in a row. Marks #27AE60.",
    'arc_huntersmark_4': "A diamond-shaped hunter's mark with three bold arrows splitting off it to three sides. Arrows #27AE60.",
    'arc_supportingfire_2': 'Three arrows raining down onto a sword with broken wings pointing down. Arrows #27AE60.',
    'arc_supportingfire_3': 'A war banner with two arrows flying alongside it in the same direction. Arrows #27AE60.',
    'arc_supportingfire_4': 'A round shield with an arrow flying back out of its face toward the attacker. Arrow #27AE60.',
    'arc_trap_3': 'Three open bear traps in a row. Trap teeth #E67E22.',
    'arc_trap_4': 'An open bear trap inside a bold circular repeat arrow. Arrow #E67E22.',
    # priest - bishop
    'pri_aegis_2': 'A heavy anchor under a protective dome arc. Dome #5DADE2.',
    'pri_aegis_3': 'A wide dome arc spanning over three small helmets in a row. Dome #5DADE2.',
    'pri_aegis_4': 'A round shield turning into a heart, the heart half emerging from it. Heart #E84A5F.',
    'pri_benediction_2': 'A chalice pouring a stream onto a broken chain. Stream #5DADE2.',
    'pri_benediction_3': 'A heart overflowing at the top into a dome arc above it. Dome #F5D76E.',
    'pri_benediction_4': 'A full heart with bold rays bursting around it, a small war banner behind. Rays #F5D76E.',
    'pri_resurrection_2': 'A pair of wings rising from a gravestone, a bold circular arrow around them. Arrow #F5D76E.',
    'pri_resurrection_3': 'Three small gravestones, a pair of wings rising from each. Wings #F5D76E.',
    'pri_resurrection_4': 'A pair of wings rising behind a sword, three upward chevrons beside it. Chevrons #E8501F.',
    # priest - black priest
    'pri_punishment_2': 'A holy sword plunging down point-first, a huge burst at its point. Burst #8E44AD.',
    'pri_punishment_3': 'A heavy chain shattering apart in a bold explosion. Explosion #8E44AD.',
    'pri_punishment_4': 'A skull leaking three dripping streams that flow to two smaller skulls. Streams #6AB04C.',
    'pri_atonement_2': 'A cursed eye jumping from a skull along a bold curved arrow to a large helmet. Eye and arrow #8E44AD.',
    'pri_atonement_3': 'Three cursed eyes in a row. Eyes #8E44AD.',
    'pri_atonement_4': 'A skull with a stream flowing out of it into a large heart. Heart #E84A5F.',
    'pri_excommunication_2': 'A crown locked shut with a heavy padlock. Padlock #8E44AD.',
    'pri_excommunication_3': 'Three crowns knocked off and tumbling, one breaking in half. Crowns #F4C430.',
    'pri_excommunication_4': 'A crown carried along a bold curved arrow toward a war banner. Arrow #8E44AD.',
    # priest - monk
    'pri_diamondbody_2': 'A clenched fist shattering a chain wrapped around it, links flying. Shatter burst #48C9B0.',
    'pri_diamondbody_3': 'A fist punching up from behind a round shield, three upward chevrons beside it. Chevrons #E67E22.',
    'pri_diamondbody_4': 'A large faceted diamond with three bold lines linking it to three small shields. Diamond #48C9B0.',
    'pri_sweep_3': 'A staff swinging in a huge wide arc that sweeps over two rows of helmets. Arc #E67E22.',
    'pri_sweep_4': 'A staff swinging with two bold sweep arcs trailing behind it. Arcs #E67E22.',
    'pri_counter_2': 'A fist meeting an incoming sword head-on, jagged impact spikes at the meeting point. Spikes #E67E22.',
    'pri_counter_3': 'A clenched fist above three small round shields, a bold arc linking them. Arc #E67E22.',
    'pri_counter_4': 'A fist punching forward with a wide shockwave sweeping across three helmets. Shockwave #E67E22.',
}

HEAD = open(os.path.join(HERE, 'sheet_01_prompt.txt'), encoding='utf-8').read().split('Row 1 (left to right):')[0]

rows = [r for r in csv.DictReader(open(os.path.join(REPO, 'src/data/advance_node.csv'), encoding='utf-8-sig')) if r['hold'] != '1']
keys = [f"{r['skill_id']}_{r['slot']}" for r in rows]
todo = [k for k in keys if k not in SHEET01 and k not in SHARED]
missing = [k for k in todo if k not in T]
extra = [k for k in T if k not in todo]
assert not missing and not extra, (missing, extra)
assert all(v in SHEET01 or v in T for v in SHARED.values())

sheets = {'01': SHEET01}
for i in range(0, len(todo), 9):
    no = f'{i // 9 + 2:02d}'
    chunk = todo[i:i + 9]
    sheets[no] = chunk
    g = 3 if len(chunk) > 4 else 2
    head = HEAD if g == 3 else HEAD.replace('3x3 grid, 9 fantasy', '2x2 grid, 4 fantasy').replace('its own third of the sheet', 'its own quarter of the sheet').replace('All nine icons', 'All four icons')
    lines = []
    for r in range(0, len(chunk), g):
        lines.append(f'Row {r // g + 1} (left to right):')
        for j, k in enumerate(chunk[r:r + g]):
            lines.append(f'{r + j + 1}. {T[k]}')
        lines.append('')
    open(os.path.join(HERE, f'sheet_{no}_prompt.txt'), 'w', encoding='utf-8').write(head + '\n'.join(lines))
json.dump({'sheets': sheets, 'shared': SHARED, 'nodes': keys}, open(os.path.join(HERE, 'plan.json'), 'w'), indent=1)
print('nodes', len(keys), 'drawn', len(SHEET01) + len(todo), 'shared', len(SHARED), 'sheets', {k: len(v) for k, v in sheets.items()})
