# -*- coding: utf-8 -*-
"""One-shot: insert the tail cell names (name_kr · name_en) into src/data/advance_node.csv after `unit` (2026-11-14 user).
English is the original, Korean the literal translation (CLAUDE.md rule 6). Guards: no comma/quote · unique · no clash with
an existing skill / mastery name · every (skill_id, slot) row gets a name. Re-running on a CSV that already has the columns stops.

python tail_names.py
"""
import csv
from pathlib import Path

REPO = Path(__file__).resolve().parents[8]
N = {
    # fire mage
    ('mag_meteor', 'size'): ('Great Impact', '대충돌'), ('mag_meteor', 'var1'): ('Meteor Shower', '유성우'), ('mag_meteor', 'var2'): ('Afterburn', '잔불'),
    ('mag_ember', 'size'): ('Flashpoint', '발화점'), ('mag_ember', 'var1'): ('Wildfire', '들불'), ('mag_ember', 'var2'): ('Scorch', '그을림'),
    ('mag_hydra', 'size'): ('Tenacity', '끈기'), ('mag_hydra', 'var1'): ('Frenzied Fangs', '광란의 송곳니'), ('mag_hydra', 'var2'): ('Melting Fangs', '녹이는 송곳니'),
    # frost mage
    ('mag_frozenorb', 'size'): ('Hard Frost', '된서리'), ('mag_frozenorb', 'var1'): ('Rapid Spin', '빠른 회전'), ('mag_frozenorb', 'var2'): ('Ice Shards', '얼음 조각'),
    ('mag_blizzard', 'size'): ('Heavy Snow', '폭설'), ('mag_blizzard', 'var1'): ('Deepening Cold', '깊어지는 추위'), ('mag_blizzard', 'var2'): ('Frostbite', '동상'),
    ('mag_frostarmor', 'size'): ('Thick Ice', '두꺼운 얼음'), ('mag_frostarmor', 'var1'): ('Ice Plate', '얼음 판금'), ('mag_frostarmor', 'var2'): ('Shatter', '산산조각'),
    # thunder mage
    ('mag_thunderstrike', 'size'): ('High Voltage', '고전압'), ('mag_thunderstrike', 'var1'): ('Extra Bolt', '추가 벼락'), ('mag_thunderstrike', 'var2'): ('Shock', '감전'),
    ('mag_nova', 'size'): ('Quick Charge', '빠른 충전'), ('mag_nova', 'var1'): ('Overcharge', '과충전'), ('mag_nova', 'var2'): ('Ionize', '이온화'),
    ('mag_thundergod', 'size'): ('Divine Bolt', '신의 벼락'), ('mag_thundergod', 'var1'): ('Mounting Wrath', '커지는 분노'), ('mag_thundergod', 'var2'): ('Disruption', '교란'),
    # berserker
    ('war_ragnarok', 'size'): ('Unleashed Power', '해방된 힘'), ('war_ragnarok', 'var1'): ('Cleave', '가르기'), ('war_ragnarok', 'var2'): ('Unchained', '풀린 사슬'),
    ('war_berserk', 'size'): ('Blood Fury', '피의 격노'), ('war_berserk', 'var1'): ('Desperation', '절박함'), ('war_berserk', 'var2'): ('Controlled Rage', '절제된 분노'),
    ('war_mutualruin', 'size'): ('Reckless Blow', '무모한 일격'), ('war_mutualruin', 'var1'): ('Second Blow', '두 번째 일격'), ('war_mutualruin', 'var2'): ('Concussion', '뇌진탕'),
    # barbarian
    ('war_whirlwind', 'size'): ('Tempest', '폭풍'), ('war_whirlwind', 'var1'): ('Extra Spin', '추가 회전'), ('war_whirlwind', 'var2'): ('Sunder Armor', '갑옷 쪼개기'),
    ('war_thorswrath', 'size'): ('Returning Hammer', '돌아오는 망치'), ('war_thorswrath', 'var1'): ('Branching Lightning', '갈래 번개'), ('war_thorswrath', 'var2'): ('Ringing Blow', '울리는 일격'),
    ('war_shockwave', 'size'): ('Great Quake', '대지진'), ('war_shockwave', 'var1'): ('Broken Ranks', '무너진 대열'), ('war_shockwave', 'var2'): ('Exposed Rear', '드러난 후열'),
    # vanguard
    ('war_divinedescent', 'size'): ('Divine Vessel', '신의 그릇'), ('war_divinedescent', 'var1'): ('Closing Wounds', '아무는 상처'), ('war_divinedescent', 'var2'): ('Rooted Stance', '뿌리 내린 자세'),
    ('war_command', 'size'): ('Rally', '집결'), ('war_command', 'var1'): ('Weak Point', '약점'), ('war_command', 'var2'): ('Bloodthirst', '피의 갈증'),
    ('war_intimidate', 'size'): ('Dread', '두려움'), ('war_intimidate', 'var1'): ('Flinch', '움찔'), ('war_intimidate', 'var2'): ('Demoralize', '사기 저하'),
    # guardian
    ('kni_lastbastion', 'size'): ('Bulwark', '보루'), ('kni_lastbastion', 'var1'): ('Guardian Instinct', '수호 본능'), ('kni_lastbastion', 'var2'): ('Unyielding', '불굴'),
    ('kni_unbreakablewill', 'size'): ('Iron Resolve', '강철 결의'), ('kni_unbreakablewill', 'var1'): ('Lingering Will', '남는 의지'), ('kni_unbreakablewill', 'var2'): ('Shared Resolve', '나누는 결의'),
    ('kni_divinejudgment', 'size'): ('Mirror Shield', '거울 방패'), ('kni_divinejudgment', 'var1'): ('Scattered Judgment', '흩어지는 심판'), ('kni_divinejudgment', 'var2'): ('Final Verdict', '최후의 판결'),
    # paladin
    ('kni_cleansing', 'size'): ('Clear Waters', '맑은 물'), ('kni_cleansing', 'var1'): ('Repel', '튕겨내기'), ('kni_cleansing', 'var2'): ('Restoring Waters', '회복의 물'),
    ('kni_offenseaura', 'size'): ('Fervor', '열정'), ('kni_offenseaura', 'var1'): ('Quickened Chant', '빨라진 영창'), ('kni_offenseaura', 'var2'): ('Quickened Blade', '빨라진 칼날'),
    ('kni_elemconvert', 'size'): ('Fierce Flame', '맹렬한 불꽃'), ('kni_elemconvert', 'var1'): ('Burning Blade', '불타는 칼날'), ('kni_elemconvert', 'var2'): ('Melting Point', '녹는점'),
    # crusader
    ('kni_retribution', 'size'): ('Swift Retribution', '빠른 응징'), ('kni_retribution', 'var1'): ('Lightning Burst', '번개 폭발'), ('kni_retribution', 'var2'): ('Relentless', '가차 없음'),
    ('kni_condemnation', 'size'): ('Heavy Sentence', '무거운 형벌'), ('kni_condemnation', 'var1'): ('Next in Line', '다음 차례'), ('kni_condemnation', 'var2'): ('Execution', '처형'),
    ('kni_fallingstrike', 'size'): ('Higher Leap', '더 높은 도약'), ('kni_fallingstrike', 'var1'): ('Thunder Landing', '천둥 착지'), ('kni_fallingstrike', 'var2'): ('Dazing Impact', '아찔한 충격'),
    # sniper
    ('arc_trueaim', 'size'): ('Steady Breath', '고른 숨'), ('arc_trueaim', 'var1'): ('Light Stance', '가벼운 자세'), ('arc_trueaim', 'var2'): ('Over the Wall', '벽 너머'),
    ('arc_singlestrike', 'size'): ('Broadhead', '넓은 촉'), ('arc_singlestrike', 'var1'): ('Follow Shot', '따라가는 화살'), ('arc_singlestrike', 'var2'): ('Thinning Herd', '줄어드는 무리'),
    ('arc_reload', 'size'): ('Full Quiver', '가득 찬 화살통'), ('arc_reload', 'var1'): ('Primed Shot', '장전된 한 발'), ('arc_reload', 'var2'): ('Warning Shot', '경고 사격'),
    # bowmaster
    ('arc_quickdraw', 'size'): ('Swift Fingers', '날랜 손가락'), ('arc_quickdraw', 'var1'): ('Scatter Shot', '흩어 쏘기'), ('arc_quickdraw', 'var2'): ('Lucky Hit', '행운의 적중'),
    ('arc_overdraw', 'size'): ('Taut String', '팽팽한 시위'), ('arc_overdraw', 'var1'): ('Big Game', '큰 사냥감'), ('arc_overdraw', 'var2'): ('Skewer', '꿰뚫기'),
    ('arc_chaindraw', 'size'): ('Strong Links', '단단한 고리'), ('arc_chaindraw', 'var1'): ('Linked Hits', '이어진 타격'), ('arc_chaindraw', 'var2'): ('Kill Streak', '연속 처치'),
    # ranger
    ('arc_huntersmark', 'size'): ('Deep Mark', '깊은 표식'), ('arc_huntersmark', 'var1'): ('Next Prey', '다음 사냥감'), ('arc_huntersmark', 'var2'): ('Pack Hunt', '무리 사냥'),
    ('arc_supportingfire', 'size'): ('Keen Arrows', '예리한 화살'), ('arc_supportingfire', 'var1'): ('Combined Fire', '합동 사격'), ('arc_supportingfire', 'var2'): ('Return Fire', '응사'),
    ('arc_trap', 'size'): ('Sharp Jaws', '날카로운 이빨'), ('arc_trap', 'var1'): ('Trapline', '덫 줄'), ('arc_trap', 'var2'): ('Snare', '올무'),
    # bishop
    ('pri_endure', 'size'): ('Stout Heart', '굳센 심장'), ('pri_endure', 'var1'): ('Guarding Halo', '지키는 후광'), ('pri_endure', 'var2'): ('Mercy', '자비'),
    ('pri_purify', 'size'): ('Mending Light', '치유의 빛'), ('pri_purify', 'var1'): ('Backlash', '역풍'), ('pri_purify', 'var2'): ('Sanctuary', '성역'),
    ('pri_resurrection', 'size'): ('Renewed Vigor', '되살아난 활력'), ('pri_resurrection', 'var1'): ('Fresh Start', '새 출발'), ('pri_resurrection', 'var2'): ('Mass Resurrection', '매스 리저렉션'),
    # black priest
    ('pri_punishment', 'size'): ('Severe Punishment', '가혹한 벌'), ('pri_punishment', 'var1'): ('Compounding Sins', '쌓이는 죄'), ('pri_punishment', 'var2'): ('Reckoning', '청산'),
    ('pri_atonement', 'size'): ('Tithe', '십일조'), ('pri_atonement', 'var1'): ('Passing Curse', '옮겨가는 저주'), ('pri_atonement', 'var2'): ('All Are Guilty', '모두가 죄인'),
    ('pri_excommunication', 'size'): ('Cast Out', '추방'), ('pri_excommunication', 'var1'): ('Interdict', '성사 금지'), ('pri_excommunication', 'var2'): ('Seal', '봉인'),
    # monk
    ('pri_diamondbody', 'size'): ('Diamond Skin', '금강 피부'), ('pri_diamondbody', 'var1'): ('Shake Off', '털어내기'), ('pri_diamondbody', 'var2'): ('Diamond Wall', '금강 벽'),
    ('pri_sweep', 'size'): ('Heavy Staff', '무거운 봉'), ('pri_sweep', 'var1'): ('Deep Sweep', '깊은 휩쓸기'), ('pri_sweep', 'var2'): ('Return Swing', '되돌아 휘두르기'),
    ('pri_counter', 'size'): ('Iron Fist', '강철 주먹'), ('pri_counter', 'var1'): ('Protective Counter', '지키는 반격'), ('pri_counter', 'var2'): ('Wide Counter', '넓은 반격'),
}


def main():
    for v in N.values():
        assert all(',' not in x and '"' not in x for x in v), v
    en = [v[0] for v in N.values()]
    kr = [v[1] for v in N.values()]
    assert len(set(en)) == len(en), [x for x in en if en.count(x) > 1]
    assert len(set(kr)) == len(kr), [x for x in kr if kr.count(x) > 1]
    taken = set()
    for f in ('skill.csv', 'mastery_node.csv'):
        for r in csv.DictReader(open(REPO / 'src/data' / f, encoding='utf-8-sig')):
            taken |= {r.get('name_en', ''), r.get('name_kr', '')}
    clash = [x for x in en + kr if x in taken]
    assert not clash, clash
    p = REPO / 'src/data/advance_node.csv'
    raw = p.read_bytes()
    crlf, bom = b'\r\n' in raw, raw.startswith(b'\xef\xbb\xbf')
    nl = '\r\n' if crlf else '\n'
    lines = raw.decode('utf-8-sig').split(nl)
    assert 'name_kr' not in lines[0], 'already has the name columns'
    out, seen = [], set()
    for i, line in enumerate(lines):
        if not line:
            out.append(line)
            continue
        parts = line.split(',', 6)
        assert len(parts) == 7 and not any('"' in x for x in parts[:6]), (i, line[:60])
        if i == 0:
            assert parts[:6] == ['skill_id', 'slot', 'fx', 'per_rank', 'arg', 'unit'] and parts[6].startswith('desc_kr'), parts
            ins = 'name_kr,name_en'
        else:
            k = (parts[0], parts[1])
            ins = f'{N[k][1]},{N[k][0]}'
            seen.add(k)
        out.append(','.join(parts[:6] + [ins, parts[6]]))
    assert seen == set(N), set(N) ^ seen
    p.write_bytes((b'\xef\xbb\xbf' if bom else b'') + nl.join(out).encode('utf-8'))
    print('rows', len(seen), 'crlf', crlf, 'bom', bom)


if __name__ == '__main__':
    main()
