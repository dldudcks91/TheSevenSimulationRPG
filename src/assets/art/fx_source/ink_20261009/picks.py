# -*- coding: utf-8 -*-
"""수묵 붓 그림체 이펙트 — 설치 파일 → (시트, 칸 — 왼쪽 위부터 1 · 2 / 3 · 4) (2026-10-09 · ADR-0559).

설치 이름 = `skill_art.js:artFile(<실전 판 이름>, 'ink')` = `<앞 판 이름>_ink` — 기본 직업은 `_clean` 을 뗀 이름 · 전직은 그 이름 그대로.
시트: i1~i3 = 원소 기본(ink.py) · w1~w5 = 전사 전부(ink_war.py) · n1~n17 = 나머지(ink_all.py — 칸 문안은 basic_clean · advance 판에서 가져왔다).
그림체 기준 그림 = anchor/ink_style.png(다섯 그림체 비교에서 고른 1번 「수묵 붓」 시트) + 고블린 초상.
B안으로 넣은 것 — 배시(w5_4 · 굵은 한 획) · 파이어볼(i3_3 · 소용돌이 불덩이) · 라이트닝(i3_4 · 굵은 번개). 앞 칸(w1_1 · i1_1 · i2_2)은 시트에만 있다.
"""

PICKS = {
    # 전사 — 기본(ink_war w1 · w2 · w5_4) · 전직(w3 · w4 · w5)
    'war_bash_ink': ('w5', 4), 'war_doubleswing_ink': ('w1', 2), 'war_quake_ink': ('w1', 3), 'war_leap_ink': ('w1', 4),
    'war_taunt_ink': ('w2', 1), 'war_shout_ink': ('w2', 2), 'war_battleorders_ink': ('w2', 3), 'war_ironskin_ink': ('w2', 4),
    'war_ragnarok_ink': ('w3', 1), 'war_berserk_ink': ('w3', 2), 'war_mutualruin_ink': ('w3', 3), 'war_mutualruin_impact_ink': ('w3', 4),
    'war_whirlwind_ink': ('w4', 1), 'war_thorswrath_ink': ('w4', 2), 'war_thorswrath_impact_ink': ('w4', 3), 'war_shockwave_ink': ('w4', 4),
    'war_lionsroar_ink': ('w5', 1), 'war_command_ink': ('w5', 2), 'war_intimidate_ink': ('w5', 3),
    # 원소 기본 + 포이즌 애로우 · 심판 (ink.py i1 ~ i3)
    'mag_fireball_ink': ('i3', 3), 'mag_inferno_ink': ('i1', 2), 'mag_iceblast_ink': ('i1', 3), 'mag_iceblast_shatter_ink': ('i1', 4),
    'mag_frostnova_ink': ('i2', 1), 'mag_lightning_ink': ('i3', 4), 'mag_chain_ink': ('i2', 3), 'mag_frozenwall_ink': ('i2', 4),
    'arc_poison_ink': ('i3', 1), 'pri_judgment_ink': ('i3', 2),
    # 기사 · 마력 집중 · 궁수 · 사제 기본 (ink_all n1 ~ n6 · n6_4 = 스마이트 B안 — 시트에만)
    'kni_smite_ink': ('n1', 1), 'kni_holyshield_ink': ('n1', 2), 'kni_charge_ink': ('n1', 3), 'kni_rush_ink': ('n1', 4),
    'kni_might_ink': ('n2', 1), 'kni_fanaticism_ink': ('n2', 2), 'kni_defiance_ink': ('n2', 3), 'kni_enchant_ink': ('n2', 4),
    'kni_duel_ink': ('n3', 1), 'kni_duel_guard_ink': ('n3', 2), 'mag_focus_ink': ('n3', 3), 'arc_snipe_ink': ('n3', 4),
    'arc_rapid_ink': ('n4', 1), 'arc_multishot_ink': ('n4', 2), 'arc_guided_ink': ('n4', 3), 'arc_pierce_ink': ('n4', 4),
    'pri_heal_ink': ('n5', 1), 'pri_grace_ink': ('n5', 2), 'pri_haste_ink': ('n5', 3), 'pri_cure_ink': ('n5', 4),
    'pri_regen_ink': ('n6', 1), 'pri_penitence_ink': ('n6', 2), 'pri_bind_ink': ('n6', 3),
    # 전직 — 기사 · 마법사 · 궁수 · 사제 (ink_all n7 ~ n17)
    'kni_lastbastion_ink': ('n7', 1), 'kni_unbreakablewill_ink': ('n7', 2), 'kni_divinejudgment_ink': ('n7', 3), 'kni_unyieldingoath_ink': ('n7', 4),
    'kni_holywar_ink': ('n8', 1), 'kni_vow_ink': ('n8', 2), 'kni_retribution_ink': ('n8', 3), 'kni_condemnation_ink': ('n8', 4),
    'kni_condemnation_impact_ink': ('n9', 1), 'kni_showdown_ink': ('n9', 2), 'mag_meteor_ink': ('n9', 3), 'mag_meteor_impact_ink': ('n9', 4),
    'mag_firewall_ink': ('n10', 1), 'mag_hydra_ink': ('n10', 2), 'mag_frozenorb_ink': ('n10', 3), 'mag_frozenorb_impact_ink': ('n10', 4),
    'mag_blizzard_ink': ('n11', 1), 'mag_frostburst_ink': ('n11', 2), 'mag_frostburst_impact_ink': ('n11', 3), 'mag_thunderstrike_ink': ('n11', 4),
    'mag_thunderstrike_impact_ink': ('n12', 1), 'mag_nova_ink': ('n12', 2), 'mag_staticfield_ink': ('n12', 3), 'arc_trueaim_ink': ('n12', 4),
    'arc_singlestrike_ink': ('n13', 1), 'arc_singlestrike_impact_ink': ('n13', 2), 'arc_reload_ink': ('n13', 3), 'arc_quickdraw_ink': ('n13', 4),
    'arc_fulldraw_ink': ('n14', 1), 'arc_chaindraw_ink': ('n14', 2), 'arc_huntersmark_ink': ('n14', 3), 'arc_supportingfire_ink': ('n14', 4),
    'arc_trap_ink': ('n15', 1), 'pri_aegis_ink': ('n15', 2), 'pri_benediction_ink': ('n15', 3), 'pri_resurrection_ink': ('n15', 4),
    'pri_punishment_ink': ('n16', 1), 'pri_punishment_impact_ink': ('n16', 2), 'pri_atonement_ink': ('n16', 3), 'pri_excommunication_ink': ('n16', 4),
    'pri_diamondbody_ink': ('n17', 1), 'pri_sweep_ink': ('n17', 2), 'pri_counter_ink': ('n17', 3),
}
