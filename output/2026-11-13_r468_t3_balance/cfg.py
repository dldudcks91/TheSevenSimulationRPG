"""측정 설정 묶음 → URL 인코딩 cfg 문자열을 파일로. 사용: python r468_cfg.py <이름> → scratchpad/cfg_<이름>.txt"""
import json, sys, urllib.parse, os
HERE = os.path.dirname(os.path.abspath(__file__))
SETS = {
    'p2': [
        # 조건 없이 늘 켜진 줄(late 0 초) — 능력치 자체의 무게
        {'id': 'u_cdr_0.15', 'cond': 'late', 'stat': 'cooldown_reduction', 'v': 0.15, 'sec': 0},
        {'id': 'u_cdr_0.30', 'cond': 'late', 'stat': 'cooldown_reduction', 'v': 0.30, 'sec': 0},
        {'id': 'u_regen_5', 'cond': 'late', 'stat': 'hp_regen', 'v': 5, 'sec': 0},
        {'id': 'u_regen_20', 'cond': 'late', 'stat': 'hp_regen', 'v': 20, 'sec': 0},
        {'id': 'u_dr_0.075', 'cond': 'late', 'stat': 'damage_reduction', 'v': 0.075, 'sec': 0},
        {'id': 'u_res_0.15', 'cond': 'late', 'stat': 'res_all', 'v': 0.15, 'sec': 0},
        {'id': 'u_crit_0.10', 'cond': 'late', 'stat': 'crit_rate', 'v': 0.10, 'sec': 0},
        {'id': 'u_fhr_0.5', 'cond': 'late', 'stat': 'fhr', 'v': 0.5, 'sec': 0},
        # 문제 칸 탐색
        {'id': 'sloth_regen_20', 'cond': 'opening', 'stat': 'hp_regen', 'v': 20, 'sec': 10},
        {'id': 'sloth_regen_60', 'cond': 'opening', 'stat': 'hp_regen', 'v': 60, 'sec': 10},
        {'id': 'lust_regen_20', 'cond': 'fresh', 'stat': 'hp_regen', 'v': 20, 'thr': 0.8},
        {'id': 'lust_regen_60', 'cond': 'fresh', 'stat': 'hp_regen', 'v': 60, 'thr': 0.8},
        {'id': 'envy_cdr_0.4', 'cond': 'higher', 'stat': 'cooldown_reduction', 'v': 0.4, 'thr': 0},
        {'id': 'sloth_cdr_0.4', 'cond': 'opening', 'stat': 'cooldown_reduction', 'v': 0.4, 'sec': 10},
        {'id': 'glut_atk_sec5', 'cond': 'late', 'stat': 'atk_pct', 'v': 0.15, 'sec': 5},
        {'id': 'glut_atk_sec10', 'cond': 'late', 'stat': 'atk_pct', 'v': 0.15, 'sec': 10},
        {'id': 'glut_dr_sec5', 'cond': 'late', 'stat': 'damage_reduction', 'v': 0.075, 'sec': 5},
        {'id': 'wrath_cd_0.4', 'cond': 'hurt', 'stat': 'crit_damage', 'v': 0.4, 'thr': 0.8},
        {'id': 'pride_fhr_1.0', 'cond': 'lower', 'stat': 'fhr', 'v': 1.0, 'thr': 0},
    ],
    # 3판 — 목표 = 상시 데미지 6% 상당 · 5랭크 문턱 그대로(폭식만 10초부터) · 값 후보
    'p3': [
        {'id': 'wrath_dmgmax_35', 'cond': 'hurt', 'stat': 'dmg_max_flat', 'v': 35, 'thr': 0.8},
        {'id': 'wrath_crit_0.26', 'cond': 'hurt', 'stat': 'crit_rate', 'v': 0.26, 'thr': 0.8},
        {'id': 'wrath_cd_0.5', 'cond': 'hurt', 'stat': 'crit_damage', 'v': 0.5, 'thr': 0.8},
        {'id': 'envy_crit_0.30', 'cond': 'higher', 'stat': 'crit_rate', 'v': 0.30, 'thr': 0},
        {'id': 'envy_res_0.19', 'cond': 'higher', 'stat': 'res_all', 'v': 0.19, 'thr': 0},
        {'id': 'envy_cdr_0.7', 'cond': 'higher', 'stat': 'cooldown_reduction', 'v': 0.7, 'thr': 0},
        {'id': 'sloth_dr_0.11', 'cond': 'opening', 'stat': 'damage_reduction', 'v': 0.11, 'sec': 10},
        {'id': 'sloth_regen_13', 'cond': 'opening', 'stat': 'hp_regen', 'v': 13, 'sec': 10},
        {'id': 'sloth_cdr_0.30', 'cond': 'opening', 'stat': 'cooldown_reduction', 'v': 0.30, 'sec': 10},
        {'id': 'glut_dr_0.085_s10', 'cond': 'late', 'stat': 'damage_reduction', 'v': 0.085, 'sec': 10},
        {'id': 'glut_atk_0.14_s10', 'cond': 'late', 'stat': 'atk_pct', 'v': 0.14, 'sec': 10},
        {'id': 'glut_drflat_12_s10', 'cond': 'late', 'stat': 'dr_flat', 'v': 12, 'sec': 10},
        {'id': 'lust_regen_40', 'cond': 'fresh', 'stat': 'hp_regen', 'v': 40, 'thr': 0.8},
        {'id': 'lust_res_0.19', 'cond': 'fresh', 'stat': 'res_all', 'v': 0.19, 'thr': 0.8},
        {'id': 'lust_crit_0.28', 'cond': 'fresh', 'stat': 'crit_rate', 'v': 0.28, 'thr': 0.8},
        {'id': 'pride_atk_0.10', 'cond': 'lower', 'stat': 'atk_pct', 'v': 0.10, 'thr': 0},
        {'id': 'pride_dr_0.16', 'cond': 'lower', 'stat': 'damage_reduction', 'v': 0.16, 'thr': 0},
        {'id': 'pride_fhr_0.75', 'cond': 'lower', 'stat': 'fhr', 'v': 0.75, 'thr': 0},
    ],
    # 4판 — 최종 후보 확인
    'p4': [
        {'id': 'wrath_dmgmax_35', 'cond': 'hurt', 'stat': 'dmg_max_flat', 'v': 35, 'thr': 0.8},
        {'id': 'wrath_crit_0.30', 'cond': 'hurt', 'stat': 'crit_rate', 'v': 0.30, 'thr': 0.8},
        {'id': 'wrath_cd_0.5', 'cond': 'hurt', 'stat': 'crit_damage', 'v': 0.5, 'thr': 0.8},
        {'id': 'envy_crit_0.40', 'cond': 'higher', 'stat': 'crit_rate', 'v': 0.40, 'thr': 0},
        {'id': 'envy_res_0.21', 'cond': 'higher', 'stat': 'res_all', 'v': 0.21, 'thr': 0},
        {'id': 'envy_cdr_0.75', 'cond': 'higher', 'stat': 'cooldown_reduction', 'v': 0.75, 'thr': 0},
        {'id': 'sloth_dr_0.095', 'cond': 'opening', 'stat': 'damage_reduction', 'v': 0.095, 'sec': 10},
        {'id': 'sloth_regen_13', 'cond': 'opening', 'stat': 'hp_regen', 'v': 13, 'sec': 10},
        {'id': 'sloth_cdr_0.28', 'cond': 'opening', 'stat': 'cooldown_reduction', 'v': 0.28, 'sec': 10},
        {'id': 'glut_dr_0.10_s10', 'cond': 'late', 'stat': 'damage_reduction', 'v': 0.10, 'sec': 10},
        {'id': 'glut_atk_0.14_s10', 'cond': 'late', 'stat': 'atk_pct', 'v': 0.14, 'sec': 10},
        {'id': 'glut_drflat_15_s10', 'cond': 'late', 'stat': 'dr_flat', 'v': 15, 'sec': 10},
        {'id': 'lust_regen_40', 'cond': 'fresh', 'stat': 'hp_regen', 'v': 40, 'thr': 0.8},
        {'id': 'lust_res_0.19', 'cond': 'fresh', 'stat': 'res_all', 'v': 0.19, 'thr': 0.8},
        {'id': 'lust_crit_0.35', 'cond': 'fresh', 'stat': 'crit_rate', 'v': 0.35, 'thr': 0.8},
        {'id': 'pride_atk_0.10', 'cond': 'lower', 'stat': 'atk_pct', 'v': 0.10, 'thr': 0},
        {'id': 'pride_dr_0.13', 'cond': 'lower', 'stat': 'damage_reduction', 'v': 0.13, 'thr': 0},
        {'id': 'pride_fhr_0.75', 'cond': 'lower', 'stat': 'fhr', 'v': 0.75, 'thr': 0},
    ],
}
name = sys.argv[1]
s = urllib.parse.quote(json.dumps(SETS[name], separators=(',', ':')))
open(os.path.join(HERE, f'cfg_{name}.txt'), 'w', encoding='ascii').write(s)
print(len(s))
