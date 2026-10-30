import json
from pathlib import Path
HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'simulation'
SIDE=OUT/'speed2_sensitivity'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
rows=[]
for file in SIDE.glob('*_seed*.json'):
    b=read(file);a=read(OUT/file.name)
    for sec in (600,3600):
        x=next(c for c in a['checkpoints']if c['seconds']==sec);y=next(c for c in b['checkpoints']if c['seconds']==sec)
        keep=('stage','difficulty','levels','gold','bags')
        def pack(c):return {**{k:c[k]for k in keep},'progress':len(c['cleared'])+sum(len(v)for v in c['clearedIn'].values()),'runs':c['count']['runs'],'losses':c['count']['losses'],'drops':c['count']['drops'],'potionBuyGold':c['count']['potionBuyGold'],'longestNewStageGap':c['gaps']['newStage']['seconds'],'longestRewardGap':c['gaps']['reward']['seconds'],'chapter1Cleared':1051 in c['cleared']}
        rows.append({'seed':a['seed'],'policy':a['policy'],'seconds':sec,'speed1':pack(x),'speed2':pack(y)})
result={'method':'Same frozen source and legal 5-minute management; only harness calls snapshot paceOf(2), including its SPEED_K. Restart remains the actual rule. Extra encounters, action timings and subsequent RNG outcomes can legitimately differ. Six selected accounts, 10/60 minutes only, separate from primary 50.','pace2':read(SIDE/'meta_worker0.json')['pace'],'info':read(SIDE/'run_info.json'),'comparisons':rows}
(SIDE/'comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
for r in rows:
    if r['seconds']==3600:print(json.dumps(r,ensure_ascii=True))
