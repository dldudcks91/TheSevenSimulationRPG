"""사제 힐 쿨 반감 실험 — 사제 든 96계정 · 대조 monclone(몬스터 힐은 복사본 · 쿨 그대로) vs healcd2(영웅 힐 쿨 ÷2 · 몬스터 그대로). 숫자만."""
import json, statistics as st
from pathlib import Path
H=14400
BASE=Path(__file__).resolve().parent
def load(kind,pol,s): return json.loads((BASE/f'simulation_{kind}/main/{pol}_seed{s}.json').read_text(encoding='utf-8'))
def runs(r): return [x for x in r['runs'] if x['start']<H and not x.get('farming')]
def t_of(r,stage,cap=H): return next((x['t']/60 for x in runs(r) if x['stage']==stage and x['won'] and x['t']<=cap),None)
jobs=json.loads((BASE/'priest_jobs.json').read_text())
CP=BASE/'simulation_head/main/checkpoints'
G={}
for s,pol,_ in jobs:
    d=json.loads((CP/f'{pol}_seed{s}_3600.json').read_text(encoding='utf-8'))
    inn=[x['ids'][0] for c,x in zip(d['classes'],d['skills']) if c=='priest'][0]
    G.setdefault(inn,[]).append((s,pol))
out=[]
def p(*a): out.append(' '.join(str(x) for x in a))
for kind in ('monclone','healcd2'):
    i=json.loads((BASE/f'simulation_{kind}/main/run_info.json').read_text(encoding='utf-8'))
    p(kind,'done',len(i['completed']),'errors',len(i['errors']),'changed',i['frozen_source_changed'])
for inn in ['pri_heal','pri_cure','pri_judgment']:
    acc=G[inn]
    for kind in ('monclone','healcd2'):
        R=[load(kind,pol,s) for s,pol in acc]
        sat=[t_of(r,1051) for r in R]; arr=[t_of(r,1043) for r in R]
        cens=sorted(x if x is not None else 1e9 for x in sat); med=cens[len(cens)//2]
        br=[x for r in R for x in runs(r) if x['stage']==1051]
        halves=[sum(1 for (s,_),x in zip(acc,sat) if x is not None and x<=60 and (s<=40)==h) for h in (True,False)]
        p(f'{inn:12s} {kind:8s} n={len(acc)} 사탄60분={sum(1 for x in sat if x is not None and x<=60)} (앞|뒤 {halves[0]}|{halves[1]}) '
          f'120분={sum(1 for x in sat if x is not None and x<=120)} 4시간={sum(1 for x in sat if x is not None)} 중앙={"%.0f"%med if med<1e8 else ">240"}m '
          f'1-4III도착={st.median([x for x in arr if x]):.0f}m 보스판당={100*sum(x["won"] for x in br)/max(1,len(br)):.0f}%')
    # paired per account
    d=[]
    for s,pol in acc:
        a=t_of(load('monclone',pol,s),1051); b=t_of(load('healcd2',pol,s),1051)
        d.append((a if a is not None else 300)-(b if b is not None else 300))
    p(f'{inn:12s} paired 사탄 시각 단축(대조-변형, 못깸=300) 중앙 {st.median(d):+.0f}m · 빨라진 계정 {sum(1 for x in d if x>0)} · 느려진 {sum(1 for x in d if x<0)} · 같음 {sum(1 for x in d if x==0)}')
(BASE/'analysis_healcd.txt').write_text('\n'.join(out),encoding='utf-8'); print('\n'.join(out))
