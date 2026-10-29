"""Try 1-1 easing variants on the snapshot one at a time (patch -> run -> restore).
python variants.py <port> V1 V2 ...   (results: ../out/<V>.txt)
"""
import subprocess
import sys
from pathlib import Path

H = Path(__file__).resolve().parent
SRC = H.parent / 'snap' / 'src'
RULE = SRC / 'game_logic' / 'spawn_rule.js'
SKILL = SRC / 'data' / 'skill.csv'
BAL = SRC / 'data' / 'balance.csv'
BASE_XP = '\nxp_rate,1,'
BASE_RULE = "'1-1': [roundFrom(1103, 3), eliteOnly(1103), summonerWithBand(1103), bossAlone()],"
BASE_SUMMON = 'pri_summon,job,priest,소환,Summon,turn,self,20,'

VARIANTS = {
    # shaman never elite (elite = scout / warrior) — shaman still from round 3 as a normal
    'V1': ('rule', "'1-1': [roundFrom(1103, 3), { refs: [1103], elitePool: pool => pool.filter(x => x !== 1103) }, summonerWithBand(1103), bossAlone()],"),
    # shaman from round 6 (first elite round has no shaman)
    'V2': ('rule', "'1-1': [roundFrom(1103, 6), summonerWithBand(1103), bossAlone()],"),
    # summon cooldown x2 (measurement only — the skill is shared with hero priests)
    'V3': ('skill', 'pri_summon,job,priest,소환,Summon,turn,self,40,'),
    # no shaman in 1-1 at all (upper bound of what the shaman costs)
    'V6': ('skill', 'pri_summon,job,priest,소환,Summon,turn,self,30,'),
    'V4': ('rule', "'1-1': [roundFrom(1103, 99), bossAlone()],"),
    # battle XP x2 (level pace lever)
    'V5': ('bal', '\nxp_rate,2,'),
}
port = sys.argv[1]
Q = 'bot=auto&mastery=1&potion=1&buildShop=1&lossLog=1&diffs=normal&chapters=1&until=1051&stall=800&cap=20000'
rule0 = RULE.read_text(encoding='utf-8')
skill0 = SKILL.read_text(encoding='utf-8')
bal0 = BAL.read_text(encoding='utf-8')
assert bal0.count(BASE_XP) == 1
assert rule0.count(BASE_RULE) == 1 and skill0.count(BASE_SUMMON) == 1
try:
    for v in sys.argv[2:]:
        kind, text = VARIANTS[v]
        if kind == 'rule':
            RULE.write_text(rule0.replace(BASE_RULE, text), encoding='utf-8')
        elif kind == 'bal':
            BAL.write_text(bal0.replace(BASE_XP, text), encoding='utf-8')
        else:
            SKILL.write_text(skill0.replace(BASE_SUMMON, text), encoding='utf-8')
        subprocess.run([sys.executable, str(H / 'run_page_t.py'), v, f'dev/wheel.html?seeds=1-80&{Q}', 'WHEEL', '#sim', port, '400'], timeout=480)
        RULE.write_text(rule0, encoding='utf-8')
        SKILL.write_text(skill0, encoding='utf-8')
        BAL.write_text(bal0, encoding='utf-8')
        print(v, (H.parent / 'out' / f'{v}.done').read_text(encoding='utf-8'), flush=True)
finally:
    RULE.write_text(rule0, encoding='utf-8')
    SKILL.write_text(skill0, encoding='utf-8')
    BAL.write_text(bal0, encoding='utf-8')
