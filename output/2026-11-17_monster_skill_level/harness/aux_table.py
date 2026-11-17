"""보조 표 — 1~5장 몬스터가 쥔 스킬(1칸 고유 · 나이트메어 2칸)의 레벨 칸 종류와 묶기 스킬의 Lv.1/4/7 값. snap/src/data 를 읽는다."""
import csv, collections, json
from pathlib import Path
D = Path(__file__).resolve().parent.parent / 'snap' / 'src' / 'data'
rd = lambda f: list(csv.DictReader(open(D / f, encoding='utf-8-sig')))
mons = [m for m in rd('monster.csv') if m['chapter'].isdigit() and int(m['chapter']) <= 5]
skills = {s['skill_id']: s for s in rd('skill.csv')}
eff = collections.defaultdict(list)
for e in rd('skill_effect.csv'): eff[e['skill_id']].append(e)
st = {s['status_id']: s for s in rd('skill_status.csv')}
def kind(e):
    f = e['level_field']
    if f in ('-', ''): return None
    if f == 'mult_pct': return '회복' if e['effect'] == 'heal' else '데미지'
    if f == 'effect_value':
        s = st.get(e['status'], {})
        return f"효과값({s.get('stat','?')})"
    return {'duration_sec': '지속 시간', 'hit_duration_sec': '묶기 시간', 'hits': '타수', 'decay_pct': '연쇄 감쇠', 'cool_sec': '쿨', 'proc_chance_pct': '확률', 'proc_mult_pct': '발동 배율'}.get(f, f)
held = collections.Counter(); who = collections.defaultdict(list)
for m in mons:
    for slot, col in (('1칸', 'innate_skill'), ('2칸', 'nightmare_skill')):
        sid = m[col]
        if sid and sid != '-':
            held[(slot, sid)] += 1; who[sid].append(f"{m['monster_idx']}{'B' if m['spawn_grade'] != 'normal' else ''}")
rows = []
kinds = collections.Counter()
for (slot, sid), n in sorted(held.items()):
    ks = sorted({kind(e) for e in eff[sid] if kind(e)}) or ['(레벨 칸 없음)']
    for k in ks: kinds[(slot, k)] += n
    rows.append((slot, sid, skills.get(sid, {}).get('name_kr', sid), n, ' · '.join(ks)))
print('## 칸 × 레벨 칸 종류 (몬스터 수)')
for (slot, k), n in sorted(kinds.items()): print(slot, k, n)
print()
print('## 스킬별')
for r in rows: print(*r, sep=' | ')
# 묶기 — 스턴 · 결빙 · 산산조각 등
print()
print('## 묶기 스킬 Lv.1/4/7')
CC = {'stun', 'freeze', 'shatter', 'imbue', 'slow', 'root', 'silence'}
for sid in sorted({s for (_, s) in held}):
    for e in eff[sid]:
        s = st.get(e['status'], {})
        hs = st.get(s.get('hit_status', '-'), {}) if s else {}
        cc = s.get('stat') in CC or hs.get('stat') in CC or (s.get('ailment') not in (None, '', '-'))
        if not cc: continue
        f, step = e['level_field'], float(e['level_step'] or 0) if e['level_field'] not in ('-', '') else 0
        base = {'duration_sec': float(s.get('duration_sec') or 0), 'effect_value': float(s.get('value') or 0),
                'hit_duration_sec': float(hs.get('duration_sec') or 0) if hs else 0, 'mult_pct': float(e['mult_pct'] or 0)}.get(f)
        vals = [round(base + step * up, 3) for up in (0, 3, 6)] if base is not None and f not in ('-', '') else None
        print(sid, skills.get(sid, {}).get('name_kr', sid), '|', 'status', e['status'], s.get('stat'), 'dur', s.get('duration_sec'), 'val', s.get('value'),
              '| hit', s.get('hit_status'), hs.get('stat'), hs.get('duration_sec'), '| level', f, step, '→ Lv1/4/7', vals, '| 쥔 몬스터', len(who[sid]))
print()
print('## 효과값 · 시간 · 쿨 칸 Lv.1/4/7 (몬스터가 쥔 것만)')
for sid in sorted({s for (_, s) in held}):
    for e in eff[sid]:
        f = e['level_field']
        if f in ('-', '', 'mult_pct', 'hits', 'decay_pct', 'hit_duration_sec'): continue
        step = float(e['level_step'] or 0)
        s = st.get(e['status'], {})
        if f == 'effect_value': base = float(s.get('value') or 0)
        elif f == 'duration_sec': base = float(s.get('duration_sec') or 0)
        elif f == 'cool_sec': base = float(skills[sid]['cool_sec'] or 0)
        else: base = None
        if base is None: continue
        sign = -1 if base < 0 else 1
        vals = [round(base + sign * step * up if f == 'effect_value' else base + step * up, 3) for up in (0, 3, 6)]
        print(sid, skills[sid]['name_kr'], '|', f, s.get('stat', ''), '| Lv1/4/7', vals, '| 2칸' if any(k == ('2칸', sid) for k in held) else '| 1칸', len(who[sid]))
