"""번역 덩어리 만들기 — 각 덩어리 = [{key, ko, en, ctx?, en_one?}] · key 로 결과를 되붙인다."""
import json, os
B = os.path.dirname(os.path.abspath(__file__))
ui = json.load(open(f'{B}/src/ui_units.json', encoding='utf-8'))
csvu = json.load(open(f'{B}/src/csv_units.json', encoding='utf-8'))
mock = json.load(open(f'{B}/src/mock_units.json', encoding='utf-8'))
os.makedirs(f'{B}/chunks', exist_ok=True)

NAME_COLS = {'name', 'monster_name', 'stage_name', 'group', 'attr', 'stat', 'grade', 'role'}
G1A_FILES = {'item_base.csv', 'weapon_base.csv', 'weapon_group.csv', 'armor_group.csv', 'equip_slot.csv', 'sin_word.csv', 'combat_stat.csv',
             'hero_attribute.csv', 'skill_tag.csv', 'potion.csv', 'material_synth.csv', 'lab_material.csv', 'mastery_node.csv', 'slot_coin.csv',
             'slot_symbol.csv', 'monster_type.csv', 'monster_base.csv', 'monster_role.csv', 'spawn_grade.csv', 'difficulty_tier.csv',
             'formation_template.csv', 'arena_tier.csv', 'commission_grade.csv', 'commission_kind.csv', 'building.csv', 'shrine.csv',
             'hero_tier.csv', 'raid_pattern.csv'}
SKILLDESC_FILES = {'skill.csv', 'advance.csv', 'advance_node.csv', 'hero_tier.csv', 'class.csv', 'commission_kind.csv'}
STORY_FILES = {'monster.csv', 'stage.csv', 'explore_spot.csv', 'explore_story.csv', 'visit_story.csv'}


def ckey(u):
    return f"csv|{u['f']}|{u['id']}|{u['col']}|{u['ko']}"


def cu(u):
    return {'key': ckey(u), 'ko': u['ko'], 'en': u['en'], 'ctx': f"{u['f']} 행 {u['id']} · 열 {u['col']}"}


chunks = {k: [] for k in ['g1a_names_gear', 'g1b_names_world', 't1_ui_a', 't2_ui_b', 't3_help_a', 't4_help_b', 't5_story', 't6_skilldesc']}
seen = set()
for u in csvu:
    k = ckey(u)
    if k in seen:
        continue
    seen.add(k)
    if u['col'] in NAME_COLS:
        chunks['g1a_names_gear' if u['f'] in G1A_FILES else 'g1b_names_world'].append(cu(u))
    elif u['f'] in STORY_FILES:
        chunks['t5_story'].append(cu(u))
    else:
        chunks['t6_skilldesc'].append(cu(u))
for m in mock:
    chunks['g1a_names_gear'].append({'key': f"mock|{m['ko']}\t{m['en']}", 'ko': m['ko'], 'en': m['en'], 'ctx': f"mock.js:{m['line']} {m['ctx']}"})
help_ = [u for u in ui if u['k'].startswith('help.')]
rest = [u for u in ui if not u['k'].startswith('help.')]


def uu(u):
    d = {'key': f"ui|{u['k']}", 'ko': u['ko'], 'en': u['en'], 'ctx': u['k']}
    if u.get('en1'):
        d['en_one'] = u['en1']
    return d


half = len(rest) // 2
chunks['t1_ui_a'] = [uu(u) for u in rest[:half]]
chunks['t2_ui_b'] = [uu(u) for u in rest[half:]]
# 도움말은 글자 수로 반씩
tot = sum(len(u['ko']) for u in help_)
acc, cut = 0, len(help_)
for i, u in enumerate(help_):
    acc += len(u['ko'])
    if acc >= tot / 2:
        cut = i + 1
        break
chunks['t3_help_a'] = [uu(u) for u in help_[:cut]]
chunks['t4_help_b'] = [uu(u) for u in help_[cut:]]
for name, items in chunks.items():
    json.dump(items, open(f'{B}/chunks/{name}.in.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(name, len(items), sum(len(x['ko']) for x in items))
