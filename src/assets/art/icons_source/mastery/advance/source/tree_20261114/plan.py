# -*- coding: utf-8 -*-
"""Advance tree icon plan (2026-11-14 · ADR-1081 / 1085 board): every cell of the new advance board gets a picture.

Targets (file = id contract):
  skill:<skill_id>          -> icons_source/skills/<skill_id>.png                (advance skill with no picture yet)
  tail:<skill_id>_<slot>    -> icons_source/mastery/advance/<skill_id>_<slot>.png (advance_node.csv skill_id + slot size|var1|var2)
  common:<advance_id>_<n>   -> icons_source/mastery/advance/<advance_id>_<n>.png  (advance_common.csv advance_id + slot 1|2|3)

Each target is either REUSE (an existing two-tone picture whose meaning is the same effect) or a DRAW id.
DRAW ids are drawn by Codex in 3x3 sheets (black silhouette + one accent on white -> tone.py two-tone).
Grammar for size cells: the skill's subject + three bold upward chevrons ("bigger").

python plan.py   -> writes plan.json + sheet_NN_prompt.txt, asserts every board cell is covered
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../../../../../../../..'))
ADV = 'mastery/advance/'      # old two-tone node pictures (slot 2/3/4 — ADR-0547)
SK = 'skills/'

# ---------------------------------------------------------------- reuse (same effect -> same picture)
REUSE = {
    # mage
    'tail:mag_meteor_var1': ADV + 'mag_meteor_4',            # three meteors falling
    'tail:mag_meteor_var2': ADV + 'mag_meteor_3',            # scorched crater burning
    'tail:mag_ember_var2': ADV + 'mag_meteor_2',             # Burn (skull in flames)
    'tail:mag_hydra_var2': ADV + 'mag_hydra_4',              # fire-emblem shield + down chevron = fire res down
    'tail:mag_frozenorb_var2': ADV + 'mag_frozenorb_3',      # orb bursting ice shards
    'tail:mag_blizzard_size': ADV + 'mag_blizzard_4',        # cloud raining shards on a skull
    'tail:mag_thunderstrike_var1': ADV + 'mag_thunderstrike_2',  # bolt forking into two + up chevron
    'tail:mag_nova_var1': ADV + 'mag_nova_3',                # lightning ring + stacked chevrons
    'tail:mag_thundergod_var2': ADV + 'war_intimidate_2',    # hourglass chained shut = cooldown pushed
    # warrior
    'tail:war_ragnarok_size': ADV + 'war_ragnarok_3',        # flexing arm + chevrons
    'tail:war_ragnarok_var1': ADV + 'kni_retribution_2',     # one slash through three helmets in a row
    'tail:war_ragnarok_var2': ADV + 'war_ragnarok_4',        # chain snapping off a helmet
    'tail:war_berserk_var1': ADV + 'war_berserk_3',          # low heart, burning
    'tail:war_berserk_var2': ADV + 'war_berserk_2',          # bitten heart + down chevron
    'tail:war_mutualruin_var1': ADV + 'kni_showdown_4',      # sword with a ghost second strike
    'tail:war_mutualruin_var2': ADV + 'war_mutualruin_2',    # Stun
    'tail:war_whirlwind_var1': ADV + 'war_whirlwind_3',      # sword + three slash arcs
    'tail:war_whirlwind_var2': ADV + 'war_whirlwind_4',      # shield cut in half + down chevron
    'tail:war_thorswrath_var1': ADV + 'war_thorswrath_3',    # strike leaping on to the next enemy
    'tail:war_command_var1': ADV + 'war_command_2',          # banner + crit reticle
    'tail:war_command_var2': ADV + 'war_command_3',          # banner + bleeding maw (lifesteal)
    'tail:war_intimidate_size': ADV + 'war_intimidate_4',    # sword with drooping wings + down chevron
    'tail:war_intimidate_var1': ADV + 'war_whirlwind_2',     # Stagger
    # knight
    'tail:kni_lastbastion_size': ADV + 'kni_lastbastion_2',  # tall shield covering a small one
    'tail:kni_lastbastion_var1': ADV + 'kni_lastbastion_3',  # low heart -> shield springs up
    'tail:kni_lastbastion_var2': ADV + 'kni_lastbastion_4',  # kneeling on a heart sliver
    'tail:kni_unbreakablewill_var1': ADV + 'kni_unbreakablewill_3',  # top plate tumbling off
    'tail:kni_unbreakablewill_var2': ADV + 'kni_unbreakablewill_4',  # stack shared to three shields
    'tail:kni_divinejudgment_var1': ADV + 'kni_divinejudgment_3',    # shield firing a fan of arrows
    'tail:kni_divinejudgment_var2': ADV + 'kni_divinejudgment_4',    # shield exploding
    'tail:kni_cleansing_var1': ADV + 'pri_benediction_2',    # chalice pouring onto a broken chain
    # archer
    'tail:arc_trueaim_size': ADV + 'arc_singlestrike_3',     # full draw with an eye on the tip
    'tail:arc_trueaim_var1': ADV + 'arc_trueaim_2',          # ball-and-chain snapping off (less slow)
    'tail:arc_trueaim_var2': ADV + 'arc_trueaim_4',          # reticle on the helmet behind the wall
    'tail:arc_singlestrike_var1': ADV + 'arc_singlestrike_4',  # second arrow right behind the first
    'tail:arc_singlestrike_var2': ADV + 'arc_singlestrike_2',  # lone helmet in the reticle
    'tail:arc_reload_size': ADV + 'arc_reload_3',            # arrows in a reset loop
    'tail:arc_reload_var1': ADV + 'arc_reload_2',            # huge barbed head bursting
    'tail:arc_reload_var2': ADV + 'arc_reload_4',            # pierced skull blasting a shockwave
    'tail:arc_quickdraw_var1': ADV + 'arc_quickdraw_3',      # six arrows fanning out
    'tail:arc_quickdraw_var2': ADV + 'arc_quickdraw_4',      # two impact stars on one hit
    'tail:arc_overdraw_size': 'mastery/advance/source/tree_20261114/reuse/arc_fulldraw_2',        # hammer-head arrow smashing armor
    'tail:arc_overdraw_var1': 'mastery/advance/source/tree_20261114/reuse/arc_fulldraw_3',        # arrow flying at a big heart
    'tail:arc_overdraw_var2': ADV + 'arc_chaindraw_2',       # arrow through one helmet into the next
    'tail:arc_chaindraw_var2': ADV + 'arc_chaindraw_3',      # arrow bursting out of a fallen skull
    'tail:arc_huntersmark_var1': ADV + 'arc_huntersmark_2',  # mark jumping to the next enemy
    'tail:arc_huntersmark_var2': ADV + 'arc_huntersmark_3',  # marks over every helmet
    'tail:arc_supportingfire_var1': ADV + 'arc_supportingfire_3',  # arrows flying along the banner
    'tail:arc_supportingfire_var2': ADV + 'arc_supportingfire_4',  # arrow shot back out of a shield
    'tail:arc_trap_var1': ADV + 'arc_trap_3',                # three traps in a row
    # priest
    'tail:pri_resurrection_var1': ADV + 'pri_resurrection_2',  # wings from a grave + reset loop
    'tail:pri_resurrection_var2': ADV + 'pri_resurrection_3',  # three graves rising
    'tail:pri_punishment_size': ADV + 'pri_punishment_2',    # holy sword plunging, big burst
    'tail:pri_punishment_var2': ADV + 'pri_punishment_3',    # chain shattering in an explosion
    'tail:pri_atonement_size': ADV + 'pri_atonement_4',      # skull draining into a heart
    'tail:pri_atonement_var1': ADV + 'pri_atonement_2',      # curse jumping to the next enemy
    'tail:pri_atonement_var2': ADV + 'pri_atonement_3',      # three cursed eyes
    'tail:pri_excommunication_var1': ADV + 'pri_excommunication_3',  # three crowns knocked off
    'tail:pri_excommunication_var2': ADV + 'pri_excommunication_2',  # crown padlocked
    'tail:pri_diamondbody_var1': ADV + 'pri_diamondbody_2',  # fist shattering its chain
    'tail:pri_diamondbody_var2': ADV + 'pri_diamondbody_4',  # diamond linked to three shields
    'tail:pri_sweep_var1': ADV + 'pri_sweep_3',              # sweep over two rows
    'tail:pri_sweep_var2': ADV + 'pri_sweep_4',              # staff with two sweep arcs
    'tail:pri_counter_size': ADV + 'pri_counter_2',          # fist meeting a sword head-on
    'tail:pri_counter_var1': ADV + 'pri_counter_3',          # fist covering three shields
    'tail:pri_counter_var2': ADV + 'pri_counter_4',          # punch shockwave over three helmets
    # common line
    'common:berserker_3': ADV + 'war_ragnarok_2',            # maw biting a heart (life steal)
    'common:vanguard_3': ADV + 'war_intimidate_3',           # roaring helmet (shout)
    'common:guardian_2': ADV + 'kni_unbreakablewill_2',      # plates with fire / frost / lightning emblems
    'common:bishop_2': ADV + 'pri_benediction_4',            # blessed heart with rays + banner
    'common:bishop_3': ADV + 'pri_benediction_3',            # heart overflowing into a dome
}

# ---------------------------------------------------------------- new drawings
UP = 'three bold upward chevrons stacked beside it, each larger than the last'
SKILLS = {   # anchor = skills/source/kni_advanced_skills_sheet.png
    'S_divinedescent': "A warrior's armored torso with both arms flung wide open, a bold column of holy light pouring down onto him from above. Light #F5D76E.",
    'S_cleansing': 'A kite shield washed by one big falling water drop that splashes over its top edge, a broken chain link dropping off below the shield. Water drop and splash #4FB3E8.',
    'S_offenseaura': 'An upright sword thrust down through the middle of a wide flat aura ring, three bold upward chevrons rising above the ring. Aura ring and chevrons #E8501F.',
    'S_elemconvert': 'A sword on a steep diagonal whose blade turns into roaring flame from the middle to the tip. Flames #E8501F.',
    'S_fallingstrike': 'A knight diving straight down sword-first from above, a jagged lightning bolt trailing behind him. Lightning #F4C430.',
    'S_ember': 'A chunky coal ember cracked open, flames bursting out of the crack, three small sparks flying. Flames and sparks #E8501F.',
    'S_frostarmor': 'A breastplate encased in thick jagged ice plates, sharp ice spikes jutting from its shoulders. Ice #4FB3E8.',
    'S_thundergod': 'A huge raised fist gripping a bundle of three lightning bolts, about to hurl them down. Lightning #F4C430.',
    'S_endure': 'A heart cracked almost in two, held together by a bold halo ring wrapped around it. Halo #F5D76E.',
    # redo (sheet 12 · 2026-11-14 review): ember read as a campfire · purify had borrowed the old benediction picture
    'S_ember_b1': 'Three glowing ember sparks clinging to a horned helmet, the largest one flaring into a small burst. Embers and burst #E8501F.',
    'S_ember_b2': 'One teardrop-shaped spark of fire flying on a diagonal, two smaller sparks trailing behind it, its tip bursting open. Sparks and burst #E8501F.',
    'S_purify_b1': 'Two open hands releasing a burst of holy light that shatters a chain between them. Light burst #F5D76E.',
    'S_purify_b2': 'A holy staff topped with a cross, its head bursting with light rays, a broken chain falling away below it. Light rays #F5D76E.',
}
NODES = {    # anchor = ../sheet_01_codex.png
    # mage
    'T_meteor_size': f'A large meteor plunging on a steep diagonal with a long fiery tail, {UP}. Tail and chevrons #E8501F.',
    'T_ember_size': f'A chunky coal ember bursting apart in a big jagged blast, {UP}. Blast and chevrons #E8501F.',
    'T_ember_var1': 'Three helmets in a row, a flame on the middle one leaping to both neighbours along two bold curved arrows. Flames and arrows #E8501F.',
    'T_hydra_size': 'A fanged serpent head rearing up beside a tall hourglass. Hourglass sand #E8501F.',
    'T_hydra_var1': 'A fanged serpent head lunging forward mid-bite, three bold speed lines trailing behind it. Speed lines #E8501F.',
    'T_orb_size': f'A round orb trailing a short frost tail, {UP}. Frost tail and chevrons #4FB3E8.',
    'T_orb_var1': 'A round orb with four short bold slash marks raking past it in quick succession. Slash marks #4FB3E8.',
    'T_bliz_var1': 'A storm cloud dropping three ice shards in a row, each shard larger than the last. Shards #4FB3E8.',
    'T_bliz_var2': 'A storm cloud above a round shield split in two, snow falling between them. Snow #4FB3E8.',
    'T_farmor_size': f'A breastplate wrapped in a thick ice shell, {UP}. Ice shell and chevrons #4FB3E8.',
    'T_farmor_var1': 'A sword bouncing off a jagged ice shield, a bold impact burst where they meet. Ice shield #4FB3E8.',
    'T_farmor_var2': 'An ice shield shattering outward, its sharp shards flying at a skull. Shards #4FB3E8.',
    'T_ts_size': f'A storm cloud dropping one thick lightning bolt, {UP}. Lightning and chevrons #F4C430.',
    'T_nova_size': 'A small hourglass at the center of a jagged lightning ring blasting outward. Lightning ring #F4C430.',
    'T_lshred': 'A round shield with a lightning bolt emblem on it, a bold downward chevron beside it. Lightning emblem #F4C430.',
    'T_tg_size': f'A clenched fist hurling one thick lightning bolt downward, {UP}. Lightning and chevrons #F4C430.',
    'T_tg_var1': 'Three lightning bolts striking down side by side, each one larger than the last. Lightning #F4C430.',
    # warrior
    'T_berserk_size': f'A bloodied axe on a tilt, {UP}. Blood and chevrons #C8102E.',
    'T_ruin_size': f'A sword plunging down past a cracked heart, {UP}. Heart and chevrons #C8102E.',
    'T_ww_size': f'A sword spinning inside one big circular slash ring, {UP}. Slash ring and chevrons #4FB3E8.',
    'T_thor_size': 'A heavy war hammer with a bold circular arrow looping around its head. Arrow #F4C430.',
    'T_shock_size': f'A fist punching down into cracked ground, {UP}. Chevrons #F39C12.',
    'T_shock_var1': 'Two helmets swapping places along two bold curved arrows that chase each other in a circle. Arrows #F39C12.',
    'T_shock_var2': 'A helmet yanked forward by a bold hooked arrow, straight into a jagged impact burst. Hooked arrow and burst #E67E22.',
    'T_descent_size': f'An armored breastplate with a big heart at its center, {UP}. Heart and chevrons #F5D76E.',
    'T_descent_var1': 'A heart with only its bottom quarter filled, three bold plus signs rising out of its top. Filled part and plus signs #2ECC71.',
    'T_stagger_down': 'A warrior silhouette knocked off balance by a jagged impact burst, a bold downward chevron beside him. Burst and chevron #E67E22.',
    'T_command_size': f'A war banner on a tilted pole, {UP}. Chevrons #E8501F.',
    'T_buffdown': 'A crown beside an hourglass, a bold downward chevron below them. Hourglass sand and chevron #8E44AD.',
    # knight
    'T_will_size': f'A stack of three tilted shield plates, {UP}. Chevrons #5DADE2.',
    'T_judg_size': f'A round shield bouncing a big arrow straight back, {UP}. Bounce burst and chevrons #F4C430.',
    'T_cleanse_size': 'An hourglass with a big water drop beside it, a bold downward chevron below them. Water drop and chevron #4FB3E8.',
    'T_cleanse_heal': 'A broken chain falling apart, a heart rising out of the break. Heart #E84A5F.',
    'T_oa_size': 'A wide flat aura ring on the ground with three bold upward chevrons rising from its center. Aura ring and chevrons #E8501F.',
    'T_cast': 'A mage staff with a crystal head, three bold speed lines streaming off it. Speed lines #F39C12.',
    'T_aspd': 'A sword on a steep diagonal, three bold speed lines streaming off its blade. Speed lines #F39C12.',
    'T_firedmg': f'A big flame rising out of an iron brazier, {UP}. Flame and chevrons #E8501F.',
    'T_firepen': 'A flame driving straight through a round shield and flaring out the other side. Flame #E8501F.',
    'T_lburst': 'A lightning bolt ending in a big jagged explosion at its tip. Lightning and explosion #F4C430.',
    'T_ret_var2': 'A skull beside an hourglass, a bold curved arrow running from the skull into the hourglass to refill it. Arrow #E67E22.',
    'T_cond_size': f"An executioner's broad sword over a skull, {UP}. Chevrons #C0392B.",
    'T_cond_var1': 'A bold arrow passing straight through a skull and on into a helmet behind it. Arrow #C0392B.',
    'T_cond_var2': 'A target reticle locked on a heart with only a thin sliver left at its bottom. Reticle and sliver #C0392B.',
    'T_fall_size': f'A sword plunging point-down, {UP}. Chevrons #F4C430.',
    'T_fall_var1': 'A sword planted in the ground, lightning arcing out sideways from it to two helmets. Lightning #F4C430.',
    # archer
    'T_ss_size': f'A single heavy arrow on a steep diagonal, {UP}. Chevrons #E74C3C.',
    'T_qd_size': 'A drawn bow beside an hourglass, bold speed lines streaming off the hourglass. Speed lines #2ECC71.',
    'T_cd_size': 'Three helmets linked by one bold zigzag arrow path that strikes each of them. Arrow path #2ECC71.',
    'T_cd_var1': 'One arrow splitting into three, each new arrowhead tipped with a small star burst. Star bursts #9B59B6.',
    'T_hm_size': f"A diamond-shaped hunter's mark above a helmet, {UP}. Mark and chevrons #27AE60.",
    'T_sf_size': f'Two arrows flying side by side, {UP}. Chevrons #27AE60.',
    'T_trap_size': f'An open bear trap with jagged teeth, {UP}. Chevrons #E67E22.',
    # priest
    'T_endure_size': f'A thin sliver of a heart under a halo ring, {UP}. Halo and chevrons #F5D76E.',
    'T_dr': 'A round shield deflecting a sword, a bold downward chevron beside it. Chevron #4A90E2.',
    'T_healin': 'A heart catching three falling drops of healing light, a bold upward chevron beside it. Drops and chevron #2ECC71.',
    'T_pur_var1': 'A broken chain flung back along a bold curved arrow onto a horned helmet. Arrow #F5D76E.',
    'T_immune': 'A helmet under a protective dome, a chain bouncing off the dome. Dome #F5D76E.',
    'T_res_size': f'A gravestone with a heart rising from it, {UP}. Heart and chevrons #F5D76E.',
    'T_pun_var1': f'A skull wrapped in two heavy chains, {UP}. Chevrons #8E44AD.',
    'T_exc_size': 'A crown split in half by a jagged burst. Burst #8E44AD.',
    'T_dia_size': 'A large faceted diamond with an arrow snapping in half against it. Diamond #48C9B0.',
    'T_sweep_size': f'A staff swung in a wide arc, {UP}. Arc and chevrons #E67E22.',
    # common line
    'C_vsburn': 'A skull wreathed in flames, a sword striking down into it. Flames #E8501F.',
    'C_coldcd': 'A snowflake inside a bold circular arrow. Arrow #4FB3E8.',
    'C_freezeup': f'A skull locked in a jagged block of ice, {UP}. Ice and chevrons #4FB3E8.',
    'C_lpen': 'A lightning bolt driving straight through a round shield. Lightning #F4C430.',
    'C_basic_w': f'An axe mid-swing with one short slash arc, {UP}. Slash arc and chevrons #E8501F.',
    'C_aspd_bow': 'A bow with three bold speed lines streaming off it. Speed lines #F39C12.',
    'C_cdr': 'An hourglass inside a bold circular arrow. Arrow #F39C12.',
    'C_skill': f'An open spellbook with a burst star rising from its pages, {UP}. Burst and chevrons #E8501F.',
    'C_pertarget': 'Three helmets in a row, each struck by a small burst, one bold upward chevron above them. Bursts and chevron #E8501F.',
    'C_hp': f'A big heart, {UP}. Heart and chevrons #E84A5F.',
    'C_def': f'A breastplate, {UP}. Chevrons #4A90E2.',
    'C_alone': 'A lone tower shield planted at the front, two arrows snapping against it. Snap bursts #4A90E2.',
    'C_aura': 'A kite shield standing in a wide flat aura ring, three bold upward chevrons above it. Aura ring and chevrons #F5D76E.',
    'C_final': f'A sword striking a skull with a huge jagged burst, {UP}. Burst and chevrons #C0392B.',
    'C_fixed': 'A breastplate with a sword driven straight through it, the blade tip bursting out of the back. Tip burst #C0392B.',
    'C_charge': 'An arrowhead with three bold curved energy streaks converging into its tip. Streaks #E74C3C.',
    'C_fullhp': 'A full heart split by an arrow, a jagged burst at the hit. Burst #E74C3C.',
    'C_onhit': 'Three arrows side by side, each tipped with a small star burst. Star bursts #27AE60.',
    'C_killhaste': 'A skull with three bold speed lines streaming off it toward a war banner. Speed lines #27AE60.',
    'C_healout': f'A heart with a bold plus sign on it, {UP}. Plus sign and chevrons #2ECC71.',
    'C_curse': f'A cursed eye, {UP}. Eye and chevrons #8E44AD.',
    'C_dmg': f'A jagged impact star, {UP}. Star and chevrons #8E44AD.',
    'C_buffcount': f'A crown struck by a sword, {UP}. Chevrons #8E44AD.',
    'C_phys': f'A clenched fist, {UP}. Chevrons #E67E22.',
    'C_store': 'An arrow striking a shield, a bold curved arrow carrying the impact on into a clenched fist. Curved arrow #E67E22.',
    # redo (sheet 13 · 2026-11-14 review): descent var1 read as a potion · retribution size was the crusader common attack-speed picture
    'T_descent_var1_b1': 'A small cracked heart beside one much larger bold plus sign. Plus sign #2ECC71.',
    'T_descent_var1_b2': 'A heart with a big bite missing from its top, three bold plus signs rising out of the gap, each larger than the last. Plus signs #2ECC71.',
    'T_ret_size_b1': 'A sword with a jagged lightning bolt running along its edge, three bold speed lines streaming off it. Lightning and speed lines #F4C430.',
    'T_ret_size_b2': 'An armored gauntlet gripping a sword, three bold speed lines and a small lightning spark streaming off the blade. Speed lines and spark #F4C430.',
}
RETIRED = {'S_ember', 'T_descent_var1'}   # drawn, not installed — replaced by a redo take (sheet 12 · 13)
ROUND1 = 96            # first 9 SKILLS + 87 NODES went on sheets 01 ~ 11 in table order
REDO = {'12': ('skill', ['S_ember_b1', 'S_ember_b2', 'S_purify_b1', 'S_purify_b2']),
        '13': ('node', ['T_descent_var1_b1', 'T_descent_var1_b2', 'T_ret_size_b1', 'T_ret_size_b2'])}
# ---------------------------------------------------------------- colour per advance (2026-11-14 user: warrior red/orange/yellow · knight blue ·
#   mage by element · archer my pick · "colour follows the advance"). recolor.py repaints every accent on the board to its advance colour.
COLOR = {
    'berserker': '#E03A2F', 'barbarian': '#F28C1E', 'vanguard': '#F4C430',
    'guardian': '#3D7FF5', 'paladin': '#5EC8F2', 'crusader': '#6F6BFF',
    'fire_mage': '#E8501F', 'frost_mage': '#4FB3E8', 'thunder_mage': '#F4C430',
    'sniper': '#A6D63B', 'bowmaster': '#2ECC71', 'ranger': '#16A085',
    'bishop': '#F5A3C7', 'black_priest': '#9D5CE6', 'monk': '#E0529C',   # priest = pink / purple family (2026-11-14 user)
}
# round 2 (sheets 14 ~ 16 · 2026-11-14 user: "the same picture in several cells is not reuse") — one picture per cell
ROUND2 = {
    'R2_conv_burn': 'A sword striking a helmet, flames catching on the helmet and rising from its crest. Flames #5EC8F2.',
    'R2_ts_stun': 'A lightning bolt striking a horned helmet from above, three stars spinning around the dazed helmet. Bolt and stars #F4C430.',
    'R2_thor_stun': 'A dazed horned helmet with three stars circling it, a tall hourglass standing beside it. Stars and sand #F28C1E.',
    'R2_fall_stun': 'A sword plunging point-down onto a helmet, a ring of stars bursting around the impact. Stars #6F6BFF.',
    'R2_trap_stun': 'A bear trap clamped shut on an armored boot, three stars spinning above it. Stars #16A085.',
    'R2_bm_extra': 'A bow loosing two arrows side by side from the same string. Arrowheads and fletchings #2ECC71.',
    'R2_pur_size': f'Two praying hands with a heart rising between them, {UP}. Heart and chevrons #F5D76E.',
    'R2_frost_cast': 'A mage staff topped with an ice crystal, three bold speed lines streaming off it. Ice crystal and speed lines #4FB3E8.',
    'R2_thunder_cast': 'A mage staff topped with a crackling orb, three bold speed lines streaming off it. Orb sparks and speed lines #F4C430.',
    'R2_oa_cast': 'A mage staff standing inside a flat aura ring, three bold speed lines streaming off its head. Aura ring and speed lines #5EC8F2.',
    'R2_oa_aspd': 'A sword standing point-down inside a flat aura ring, three bold speed lines streaming off its blade. Aura ring and speed lines #5EC8F2.',
    'R2_cru_aspd': 'A broad crusader sword with a cross-shaped guard on a steep diagonal, three bold speed lines streaming off it. Speed lines #6F6BFF.',
    'R2_conv_size': f'A sword whose blade is one tall flame, {UP}. Flame blade and chevrons #5EC8F2.',
    'R2_ret_burst': 'A sword striking a breastplate, a jagged lightning burst exploding at the point of impact. Lightning burst #6F6BFF.',
    'R2_bm_basic': f'A bow drawn to full with an arrow nocked, {UP}. Chevrons #2ECC71.',
    'R2_endure_dr': 'A halo floating above a round shield that blunts an incoming arrow, a bold downward chevron beside it. Halo and chevron #F5D76E.',
    'R2_pal_dr': 'A kite shield with a cross emblem, an arrow snapping against it, a bold downward chevron beside it. Cross emblem and chevron #5EC8F2.',
    'R2_rng_cdr': 'A quiver full of arrows wrapped by one bold circular arrow. Circular arrow #16A085.',
    'R2_bar_skill': f'A great war axe with a jagged burst blazing along its edge, {UP}. Burst and chevrons #F28C1E.',
    'R2_pal_hp': f'A kite shield with a heart emblem on it, {UP}. Heart emblem and chevrons #5EC8F2.',
    'R2_monk_hp': f'A heart wrapped in a string of prayer beads, {UP}. Heart and chevrons #5ED6C0.',
}
NODES.update(ROUND2)
_r2 = list(ROUND2)
REDO.update({'14': ('node', _r2[:9]), '15': ('node', _r2[9:17]), '16': ('node', _r2[17:])})
NEW_SKILLS = ['war_divinedescent', 'kni_cleansing', 'kni_offenseaura', 'kni_elemconvert', 'kni_fallingstrike',
              'mag_ember', 'mag_frostarmor', 'mag_thundergod', 'pri_endure', 'pri_purify']   # advance skills that had no picture

# target -> draw id
DRAW = {
    'skill:war_divinedescent': 'S_divinedescent', 'skill:kni_cleansing': 'S_cleansing', 'skill:kni_offenseaura': 'S_offenseaura',
    'skill:kni_elemconvert': 'S_elemconvert', 'skill:kni_fallingstrike': 'S_fallingstrike', 'skill:mag_ember': 'S_ember_b1',
    'skill:mag_frostarmor': 'S_frostarmor', 'skill:mag_thundergod': 'S_thundergod', 'skill:pri_endure': 'S_endure',
    'skill:pri_purify': 'S_purify_b1',
    # mage
    'tail:mag_meteor_size': 'T_meteor_size', 'tail:mag_ember_size': 'T_ember_size', 'tail:mag_ember_var1': 'T_ember_var1',
    'tail:mag_hydra_size': 'T_hydra_size', 'tail:mag_hydra_var1': 'T_hydra_var1',
    'tail:mag_frozenorb_size': 'T_orb_size', 'tail:mag_frozenorb_var1': 'T_orb_var1',
    'tail:mag_blizzard_var1': 'T_bliz_var1', 'tail:mag_blizzard_var2': 'T_bliz_var2',
    'tail:mag_frostarmor_size': 'T_farmor_size', 'tail:mag_frostarmor_var1': 'T_farmor_var1', 'tail:mag_frostarmor_var2': 'T_farmor_var2',
    'tail:mag_thunderstrike_size': 'T_ts_size', 'tail:mag_nova_size': 'T_nova_size', 'tail:mag_nova_var2': 'T_lshred',
    'tail:mag_thundergod_size': 'T_tg_size', 'tail:mag_thundergod_var1': 'T_tg_var1',
    # warrior
    'tail:war_berserk_size': 'T_berserk_size', 'tail:war_mutualruin_size': 'T_ruin_size', 'tail:war_whirlwind_size': 'T_ww_size',
    'tail:war_thorswrath_size': 'T_thor_size', 'tail:war_shockwave_size': 'T_shock_size',
    'tail:war_shockwave_var1': 'T_shock_var1', 'tail:war_shockwave_var2': 'T_shock_var2',
    'tail:war_divinedescent_size': 'T_descent_size', 'tail:war_divinedescent_var1': 'T_descent_var1_b1', 'tail:war_divinedescent_var2': 'T_stagger_down',
    'tail:war_command_size': 'T_command_size', 'tail:war_intimidate_var2': 'T_buffdown',
    # knight
    'tail:kni_unbreakablewill_size': 'T_will_size', 'tail:kni_divinejudgment_size': 'T_judg_size',
    'tail:kni_cleansing_size': 'T_cleanse_size', 'tail:kni_cleansing_var2': 'T_cleanse_heal',
    'tail:kni_offenseaura_size': 'T_oa_size', 'tail:kni_offenseaura_var1': 'T_cast', 'tail:kni_offenseaura_var2': 'T_aspd',
    'tail:kni_elemconvert_size': 'T_firedmg', 'tail:kni_elemconvert_var2': 'T_firepen',
    'tail:kni_retribution_size': 'T_ret_size_b1', 'tail:kni_retribution_var1': 'T_lburst', 'tail:kni_retribution_var2': 'T_ret_var2',
    'tail:kni_condemnation_size': 'T_cond_size', 'tail:kni_condemnation_var1': 'T_cond_var1', 'tail:kni_condemnation_var2': 'T_cond_var2',
    'tail:kni_fallingstrike_size': 'T_fall_size', 'tail:kni_fallingstrike_var1': 'T_fall_var1',
    # archer
    'tail:arc_singlestrike_size': 'T_ss_size', 'tail:arc_quickdraw_size': 'T_qd_size',
    'tail:arc_chaindraw_size': 'T_cd_size', 'tail:arc_chaindraw_var1': 'T_cd_var1',
    'tail:arc_huntersmark_size': 'T_hm_size', 'tail:arc_supportingfire_size': 'T_sf_size', 'tail:arc_trap_size': 'T_trap_size',
    # priest
    'tail:pri_endure_size': 'T_endure_size', 'tail:pri_endure_var1': 'T_dr', 'tail:pri_endure_var2': 'T_healin',
    'tail:pri_purify_size': 'T_cleanse_heal', 'tail:pri_purify_var1': 'T_pur_var1', 'tail:pri_purify_var2': 'T_immune',
    'tail:pri_resurrection_size': 'T_res_size', 'tail:pri_punishment_var1': 'T_pun_var1',
    'tail:pri_excommunication_size': 'T_exc_size', 'tail:pri_diamondbody_size': 'T_dia_size', 'tail:pri_sweep_size': 'T_sweep_size',
    # common line (advance_common.csv advance_id + slot)
    'common:fire_mage_1': 'T_cast', 'common:fire_mage_2': 'T_firedmg', 'common:fire_mage_3': 'C_vsburn',
    'common:frost_mage_1': 'T_cast', 'common:frost_mage_2': 'C_coldcd', 'common:frost_mage_3': 'C_freezeup',
    'common:thunder_mage_1': 'T_cast', 'common:thunder_mage_2': 'C_lpen', 'common:thunder_mage_3': 'T_lburst',
    'common:berserker_1': 'T_aspd', 'common:berserker_2': 'C_basic_w',
    'common:barbarian_1': 'C_cdr', 'common:barbarian_2': 'C_skill', 'common:barbarian_3': 'C_pertarget',
    'common:vanguard_1': 'T_dr', 'common:vanguard_2': 'C_hp',
    'common:guardian_1': 'C_def', 'common:guardian_3': 'C_alone',
    'common:paladin_1': 'C_hp', 'common:paladin_2': 'T_dr', 'common:paladin_3': 'C_aura',
    'common:crusader_1': 'C_final', 'common:crusader_2': 'T_aspd', 'common:crusader_3': 'C_fixed',
    'common:sniper_1': 'C_skill', 'common:sniper_2': 'C_charge', 'common:sniper_3': 'C_fullhp',
    'common:bowmaster_1': 'C_aspd_bow', 'common:bowmaster_2': 'T_ss_size',
    'common:ranger_1': 'C_cdr', 'common:ranger_2': 'C_onhit', 'common:ranger_3': 'C_killhaste',
    'common:bishop_1': 'C_healout',
    'common:black_priest_1': 'C_curse', 'common:black_priest_2': 'C_dmg', 'common:black_priest_3': 'C_buffcount',
    'common:monk_1': 'C_hp', 'common:monk_2': 'C_phys', 'common:monk_3': 'C_store',
}
DRAW.update({'tail:kni_elemconvert_var1': 'R2_conv_burn',
    'tail:mag_thunderstrike_var2': 'R2_ts_stun',
    'tail:war_thorswrath_var2': 'R2_thor_stun',
    'tail:kni_fallingstrike_var2': 'R2_fall_stun',
    'tail:arc_trap_var2': 'R2_trap_stun',
    'common:bowmaster_3': 'R2_bm_extra',
    'tail:pri_purify_size': 'R2_pur_size',
    'common:frost_mage_1': 'R2_frost_cast',
    'common:thunder_mage_1': 'R2_thunder_cast',
    'tail:kni_offenseaura_var1': 'R2_oa_cast',
    'tail:kni_offenseaura_var2': 'R2_oa_aspd',
    'common:crusader_2': 'R2_cru_aspd',
    'tail:kni_elemconvert_size': 'R2_conv_size',
    'tail:kni_retribution_var1': 'R2_ret_burst',
    'common:bowmaster_2': 'R2_bm_basic',
    'tail:pri_endure_var1': 'R2_endure_dr',
    'common:paladin_2': 'R2_pal_dr',
    'common:ranger_1': 'R2_rng_cdr',
    'common:barbarian_2': 'R2_bar_skill',
    'common:paladin_1': 'R2_pal_hp',
    'common:monk_1': 'R2_monk_hp'})   # round 2 — one picture per cell



def dest(target):
    kind, key = target.split(':', 1)
    return ('skills/' if kind == 'skill' else 'mastery/advance/') + key + '.png'


def advance_of():
    """target -> advance id (its colour)"""
    rd = lambda f: list(csv.DictReader(open(os.path.join(REPO, 'src/data', f), encoding='utf-8-sig')))
    owner = {r['skill_id']: r['owner_id'] for r in rd('skill.csv') if r['owner_kind'] == 'advance'}
    out = {f'skill:{k}': v for k, v in owner.items()}
    out.update({f"tail:{r['skill_id']}_{r['slot']}": owner[r['skill_id']] for r in rd('advance_node.csv')})
    out.update({f"common:{r['advance_id']}_{r['slot']}": r['advance_id'] for r in rd('advance_common.csv')})
    return out


def board_targets():
    """Every cell the board shows — skills without a picture + 3 tails per advance skill + 3 common per advance."""
    rd = lambda f: list(csv.DictReader(open(os.path.join(REPO, 'src/data', f), encoding='utf-8-sig')))
    adv = [r['skill_id'] for r in rd('skill.csv') if r['owner_kind'] == 'advance']
    assert set(NEW_SKILLS) <= set(adv), set(NEW_SKILLS) - set(adv)
    out = [f'skill:{k}' for k in adv]
    out += [f"tail:{r['skill_id']}_{r['slot']}" for r in rd('advance_node.csv')]
    out += [f"common:{r['advance_id']}_{r['slot']}" for r in rd('advance_common.csv')]
    return out


HEAD_NODE = open(os.path.join(HERE, '..', 'sheet_01_prompt.txt'), encoding='utf-8').read().split('Row 1 (left to right):')[0]
HEAD_SKILL = (HEAD_NODE.replace('9 fantasy skill-upgrade icons', '9 fantasy skill icons')
              .replace('Each icon is one solid black object plus one bold effect shape',
                       'Each icon is one solid black hero object plus one bold effect shape (a skill icon, slightly bolder and more iconic than an upgrade icon)'))


def sheets():
    """Round 1 = 3x3 sheets 01 ~ 11 (skill drawings on their own sheet — other anchor · node drawings 9 per sheet in table order)
    + REDO 2x2 sheets (two takes per cell)."""
    node_ids = list(NODES)[:ROUND1 - 9]
    out = {'01': ('skill', list(SKILLS)[:9])}
    for i in range(0, len(node_ids), 9):
        out[f'{i // 9 + 2:02d}'] = ('node', node_ids[i:i + 9])
    out.update(REDO)
    return out


def grid(ids):
    return 2 if len(ids) <= 4 else 3


def prompt(kind, ids):
    table = SKILLS if kind == 'skill' else NODES
    head = HEAD_SKILL if kind == 'skill' else HEAD_NODE
    if grid(ids) == 2:   # 2x2 redo sheet
        head = (head.replace('3x3 grid, 9 fantasy', '2x2 grid, 4 fantasy').replace('its own third of the sheet', 'its own quarter of the sheet')
                .replace('All nine icons', 'All four icons'))
    elif len(ids) < 9:   # short last sheet — remaining cells stay empty white
        head = head.replace('3x3 grid, 9 fantasy', f'3x3 grid of nine cells holding {len(ids)} fantasy').replace(
            'All nine icons', f'All {len(ids)} icons') + f'(the last {9 - len(ids)} cells stay completely empty white)\n\n'
    lines = []
    g = grid(ids)
    for r in range(0, len(ids), g):
        lines.append(f'Row {r // g + 1} (left to right):')
        for j, k in enumerate(ids[r:r + g]):
            lines.append(f'{r + j + 1}. {table[k]}')
        lines.append('')
    return head + '\n'.join(lines)


if __name__ == '__main__':
    targets = board_targets()
    for t in targets:   # the 35 advance skills that had a picture: their git-HEAD original, recoloured only
        if t.startswith('skill:') and t[6:] not in NEW_SKILLS:
            REUSE[t] = 'mastery/advance/source/tree_20261114/skill_orig/' + t[6:]
    # one picture per cell [2026-11-14 user] — no two cells share a source
    srcs = list(REUSE.values()) + list(DRAW.values())
    twice = sorted({x for x in srcs if srcs.count(x) > 1})
    assert not twice, twice
    adv = advance_of()
    assert all(adv[t] in COLOR for t in targets)
    both = set(REUSE) & set(DRAW)
    missing = [t for t in targets if t not in REUSE and t not in DRAW]
    extra = [t for t in list(REUSE) + list(DRAW) if t not in targets]
    unknown = [d for d in DRAW.values() if d not in SKILLS and d not in NODES]
    takes = {d for _, ids in REDO.values() for d in ids}   # second takes — only the picked one is in DRAW
    unused = [d for d in list(SKILLS) + list(NODES) if d not in DRAW.values() and d not in takes and d not in RETIRED]
    assert not (both or missing or extra or unknown or unused), dict(both=both, missing=missing, extra=extra, unknown=unknown, unused=unused)
    for t, s in REUSE.items():
        assert os.path.exists(os.path.join(REPO, 'src/assets/art/icons_source', s + '.png')), s
    sh = sheets()
    for no, (kind, ids) in sh.items():
        open(os.path.join(HERE, f'sheet_{no}_prompt.txt'), 'w', encoding='utf-8').write(prompt(kind, ids))
    json.dump({'sheets': {k: {'kind': v[0], 'ids': v[1], 'grid': grid(v[1])} for k, v in sh.items()}, 'reuse': REUSE, 'draw': DRAW,
               'color': {t: COLOR[adv[t]] for t in targets}},
              open(os.path.join(HERE, 'plan.json'), 'w', encoding='utf-8'), indent=1)
    print('targets', len(targets), 'reuse', len(REUSE), 'draw-targets', len(DRAW),
          'drawings', len(SKILLS) + len(NODES), 'sheets', {k: len(v[1]) for k, v in sh.items()})
