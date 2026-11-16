"""기본 스킬 · 전직 스킬의 능력치 칸 전부 → stat_slots.md
안(2026-11-16 논의 · 미확정): 데미지 · 회복 배율 = 10% 복리(지금) · 값 칸 = 5% 복리 · 피해량 값 칸 = D2(권 10%) · 횟수 · 확률 = D3 · 지속 = 3번 · 타수 · 감쇠 · 발동 = 5번
능력치 18 = 기준 10 에서 +8 → 10% ×2.1436 · 5% ×1.4775
"""
import csv, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
DATA = Path(__file__).resolve().parents[2] / 'src' / 'data'
rd = lambda n: list(csv.DictReader(open(DATA / n, encoding='utf-8-sig')))
sk = rd('skill.csv'); st = {r['status_id']: r for r in rd('skill_status.csv')}; ef = rd('skill_effect.csv')
adv = {r['advance_id'] if 'advance_id' in r else list(r.values())[0]: r for r in rd('advance.csv')}
advBase = {k: list(r.values())[1] for k, r in adv.items()}; advName = {k: list(r.values())[3] for k, r in adv.items()}
D10, D5 = 1.1 ** 8, 1.05 ** 8
ATTR = dict(str='힘', agi='민첩', int='지능', vit='건강', luck='운', ldr='통솔', cha='매력')
JOB = dict(warrior='전사', knight='기사', archer='궁수', mage='마법사', priest='사제')
LAB = dict(def_pct='방어', res_pct='저항', hp_max_pct='최대 HP', frenzy='겹당 공속', final_phys_pct='적 물리 데미지', final_dmg_pct='적 데미지',
           barrier_pct='보호막', onhit_element='원소 추가타', atk_pct='데미지', period_pct='공속', dr_pct='받는 피해 감소', pulse='펄스', def_ignore='방어 무시',
           evade='회피', phys_pct='물리 데미지', imbue='부여 확률', period_fix='고정 주기', basic_pct='평타 데미지', regen_hp_pct='초당 회복', berserk='스킬 데미지', transform='변신(값 0)', devotion='대신 맞기',
           devotion_dr='헌신 피해 감소', will='겹당 피해 감소', reflect_win='반사', ailment_cut='상태이상 시간 감소', conv_amp='전환 피해', phys_conv='번개 전환',
           ember='불씨 폭발', tick_hit='틱 배율', elem_shield='흡수량', strike_passive='벼락 배율', snipe_amp='스나이프 데미지', reload='초기화', chain_splash='퍼짐 배율',
           support_fire='화살 배율', endure='버티기 HP', atone='속죄 회복', counter_win='반격 배율', stun='스턴', echo='메아리', shatter='산산조각', vs_burn_pct='화상 대상 피해',
           cleanse='정화', imbue_amp='')
NEG = dict(period_pct='적 둔화', dr_pct='적 받는 피해 +', def_pct='적 방어 −', final_dmg_pct='적 데미지 −', final_phys_pct='적 물리 데미지 −')
DMG = {'onhit_element', 'pulse', 'ember', 'tick_hit', 'strike_passive', 'counter_win', 'support_fire', 'chain_splash', 'elem_shield', 'reflect_win', 'atone'}
COUNT = {'evade', 'reload'}; PROB = {'imbue'}
MULT = dict(hit='타격', heal='회복', mend='회복(최대 HP)', summon='소환 HP', revive='일으키기 HP', cleanse='정화 회복', fixed='고정 피해')
def pct(v):
    v = abs(v) * 100
    return f'{v:.1f}'.rstrip('0').rstrip('.') if v < 10 else f'{v:.0f}'
rows = []  # (group, skill name, on, new, todo)
for s in sk:
    kind = s['owner_kind']
    if not (kind == 'job' and s['tier'] in ('1', '2')) and kind != 'advance': continue
    grp = JOB[s['owner_id']] if kind == 'job' else f"{JOB[advBase[s['owner_id']]]} · {advName[s['owner_id']]}"
    on, new, todo = [], [], []
    for e in [e for e in ef if e['skill_id'] == s['skill_id']]:
        x = st.get(e['status']) if e['status'] not in ('', '-') else None
        for i in (1, 2, 3):
            f, a = e[f'scale{i}_field'], e[f'scale{i}_attr']
            if f in ('', '-'): continue
            A = ATTR[a]
            if f == 'mult_pct':
                m = float(e['mult_pct']); on.append(f"{MULT.get(e['effect'], e['effect'])} {pct(m)}→{pct(m * D10)}% {A}")
            elif f == 'effect_value':
                v = float(x['value']); stat = x['stat']; lab = NEG.get(stat, LAB.get(stat, stat)) if v < 0 else LAB.get(stat, stat)
                if stat in DMG: todo.append(f"{lab} {pct(v)}→{pct(v * D10)}% {A} (D2)")
                elif stat in COUNT: todo.append(f"{lab} {v:g}→{max(1, round(v * D5))}회 {A} (D3)")
                elif stat in PROB: todo.append(f"{lab} {pct(v)}→{pct(min(1, v * D5))}% {A} (D3)")
                elif stat == 'transform': pass   # 값 0 — 곱해도 0

                else: new.append(f"{lab} {pct(v)}→{pct(v * D5)}% {A}")
            elif f == 'duration_sec':
                lab = NEG.get(x['stat'], LAB.get(x['stat'], x['stat'])) if float(x['value']) < 0 else LAB.get(x['stat'], x['stat'])
                todo.append(f"{lab} 지속 {float(x['duration_sec']):g}초 {A} (3번)")
            elif f == 'hits': todo.append(f"타수 {e['hits']} {A} (5번)")
            elif f == 'decay_pct': todo.append(f"감쇠 {pct(float(e['decay_pct']))}% {A} (5번)")
            elif f == 'proc_chance_pct': todo.append(f"발동 확률 {pct(float(e['proc_chance_pct']))}% {A} (5번)")
            elif f == 'proc_mult_pct': todo.append(f"발동 배수 {pct(float(e['proc_mult_pct']))}% {A} (5번)")
    rows.append((grp, s['name_kr'], on, new, todo))
import re
allc = [c for r in rows for c in r[2] + r[3] + r[4]]
cnt = dict(on=sum(len(r[2]) for r in rows), new=sum(len(r[3]) for r in rows), d2=sum(c.endswith('(D2)') for c in allc), d3=sum(c.endswith('(D3)') for c in allc),
           q3=sum(c.endswith('(3번)') for c in allc), q5=sum(c.endswith('(5번)') for c in allc), none=sum(not (r[2] or r[3] or r[4]) for r in rows))
out = ['<!-- stat_slots.py 산출 · 스킬 레벨 1 값 · 능력치 18 기준 · 미확정 안 -->',
       f"칸 수 — 켜짐 {cnt['on']} · 5% {cnt['new']} · D2 {cnt['d2']} · D3 {cnt['d3']} · 지속(3번) {cnt['q3']} · 타수 · 감쇠 · 발동(5번) {cnt['q5']} · 칸 없는 스킬 {cnt['none']}"]
order = []
for g, *_ in rows:
    if g not in order: order.append(g)
order.sort(key=lambda g: (list(JOB.values()).index(g.split(' · ')[0]), ' · ' in g))
for g in order:
    rs = [r for r in rows if r[0] == g]
    none = [r[1] for r in rs if not (r[2] or r[3] or r[4])]
    out.append(f'\n### {g}\n')
    out.append('| 스킬 | 지금 켜짐 (10%) | 이번에 켬 (5%) | 정할 것 |'); out.append('|---|---|---|---|')
    for _, n, on, new, todo in rs:
        if on or new or todo: out.append(f"| {n} | {' · '.join(on) or '—'} | {' · '.join(new) or '—'} | {' · '.join(todo) or '—'} |")
    if none: out.append(f"\n칸 없음: {' · '.join(none)}")
txt = '\n'.join(out); (Path(__file__).parent / 'stat_slots.md').write_text(txt, encoding='utf-8'); print(txt)
