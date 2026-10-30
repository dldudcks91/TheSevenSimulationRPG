"""Full-factorial summaries; unfinished accounts remain censored in every statistic."""
import argparse
import csv
import itertools
import json
import math
import statistics
from pathlib import Path
from run_sweep import BASE, DEFAULT, AXES


def records(folder):
    out={}
    for file in folder.glob('results_*.jsonl'):
        for line in file.read_text(encoding='utf-8').splitlines():
            row=json.loads(line)
            if row['id']in out and out[row['id']]['rows']!=row['rows']:
                raise ValueError('Nonidentical duplicate '+row['id'])
            out[row['id']]=row
    return list(out.values())


def quantile_censored(values,q):
    ordered=sorted(math.inf if x is None else x/60 for x in values)
    n=len(ordered)
    if not n:return None
    if q==.5:
        value=(ordered[(n-1)//2]+ordered[n//2])/2
    else:
        value=ordered[max(0,math.ceil(q*n)-1)]
    return None if not math.isfinite(value)else round(value,5)


def summarize(r):
    rows=r['rows'];n=len(rows)
    if any(x.get('error')for x in rows):
        return{'id':r['id'],'valid':False,'errors':[x for x in rows if x.get('error')]}
    clear=[x['clearSeconds']for x in rows];arrival=[x['arrivalSeconds']for x in rows]
    policy_defaults={'management':120,'lossTrigger':3,'farmWins':3,'mastery':'balanced','rareDps':'off','startFloor':False,'backHp':0,'frontHp':0}
    changed=[k for k,v in r['variant'].items()if v!=DEFAULT.get(k,policy_defaults.get(k))]
    normalized={**policy_defaults,'management':300 if r['policy']=='active_slow' else 120,**r['variant']}
    result={'id':r['id'],'policy':r['policy'],'n':n,**normalized,'changes':len(changed),'changed':changed,'valid':True,
        'clear20':sum(x is not None and x<=1200 for x in clear),
        'clear30':sum(x is not None and x<=1800 for x in clear),
        'clear40':sum(x is not None and x<=2400 for x in clear),
        'clear45':sum(x is not None and x<=2700 for x in clear),
        'clear60':sum(x is not None and x<=3600 for x in clear),
        'clear90':sum(x is not None and x<=5400 for x in clear)if r['horizon']>=5400 else None,
        'arrive25':sum(x is not None and x<=1500 for x in arrival),
        'arrive40':sum(x is not None and x<=2400 for x in arrival),
        'median':quantile_censored(clear,.5),'p75':quantile_censored(clear,.75),'p90':quantile_censored(clear,.9),
        'arrivalMedian':quantile_censored(arrival,.5),'failure60':sum(x is None or x>3600 for x in clear),
        'bookAccounts':sum(x.get('booksLearned',0)>0 for x in rows),
        'levelMedian':statistics.median(statistics.median(x['levels'])for x in rows),
        'runs':sum(x['runs']for x in rows),'losses':sum(x['losses']for x in rows),
        'errors':sum(bool(x.get('failures'))for x in rows)}
    result['rate40']=round(result['clear40']/n,6)
    result['paceGoal']=result['rate40']>=.8 and result['median']is not None and 30<=result['median']<=40
    result['strictGoal']=result['paceGoal']and result['clear45']/n>=.9 and result['clear20']/n<=.1
    result['protectedRules']=r['variant']['bookLevel']==10 and r['variant']['starter']==1 and r['variant']['rounds']==9 and not r['variant'].get('startFloor') and r['variant'].get('rareDps','off')=='off'
    return result


def rank(s):
    return(not s.get('strictGoal',False),not s.get('paceGoal',False),
        abs((s.get('median')or 90)-35),-s.get('rate40',0),s.get('changes',99),s.get('p90')or 99)


def main(args):
    folder=BASE/args.phase;raw=records(folder);summaries=[summarize(r)for r in raw]
    valid=[s for s in summaries if s['valid']]
    jobs=json.loads((folder/'jobs.json').read_text(encoding='utf-8'))
    missing=sorted(set(j['id']for j in jobs)-set(r['id']for r in raw))
    one_at_time=[s for s in valid if s['changes']<=1]
    protected=sorted([s for s in valid if s['protectedRules']],key=rank)
    eligible=sorted([s for s in valid if s['paceGoal']],key=rank)
    # Display a Pareto set of speed reliability, pacing and changed-axis count.
    pareto=[]
    for a in valid:
        dominated=False
        av=(-a['rate40'],abs((a['median']or 90)-35),a['changes'],a['clear20']/a['n'])
        for b in valid:
            if a is b:continue
            bv=(-b['rate40'],abs((b['median']or 90)-35),b['changes'],b['clear20']/b['n'])
            if all(x<=y for x,y in zip(bv,av))and any(x<y for x,y in zip(bv,av)):
                dominated=True;break
        if not dominated:pareto.append(a)
    effects={}
    for axis in dict.fromkeys(k for s in raw for k in s['variant']):
        levels=sorted({s[axis]for s in valid})
        effects[axis]=[{'value':v,'variants':len(group),
                       'averageRate40':round(statistics.mean(s['rate40']for s in group),6),
                       'unidentifiedMedianVariants':sum(s['median']is None for s in group),
                       'medianOfIdentifiableVariantMedians':statistics.median(s['median']for s in group if s['median']is not None)if any(s['median']is not None for s in group)else None}
                      for v in levels for group in [[s for s in valid if s[axis]==v]]]
    result={'phase':args.phase,'expectedVariants':len(jobs),'completedVariants':len(raw),'accounts':sum(len(r['rows'])for r in raw),
            'completedRuns':sum(s.get('runs',0)for s in valid),'missing':missing,
            'invalid':[s for s in summaries if not s['valid']],
            'paceGoalVariants':len(eligible),'strictGoalVariants':sum(s['strictGoal']for s in valid),
            'oneAtTime':one_at_time,'top':eligible[:30],'protectedTop':protected[:30],
            'pareto':sorted(pareto,key=rank),'factorialAverages':effects,'all':sorted(valid,key=lambda x:x['id'])}
    (folder/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    if valid:
        fields=[k for k in valid[0]if k not in ['changed']]
        with(folder/'summary.csv').open('w',encoding='utf-8-sig',newline='')as stream:
            writer=csv.DictWriter(stream,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(valid)
    print(json.dumps({'completed':len(raw),'expected':len(jobs),'accounts':result['accounts'],'goalVariants':len(eligible),'strictVariants':result['strictGoalVariants'],
        'top':[{k:s[k]for k in ['id','median','clear40','clear45','changes','protectedRules']}for s in eligible[:5]],
        'protectedTop':[{k:s[k]for k in ['id','median','clear40','clear45','changes']}for s in protected[:5]]},ensure_ascii=True),flush=True)
    if args.require_complete and(missing or result['invalid']):raise SystemExit(1)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--phase',default='grid');parser.add_argument('--require-complete',action='store_true');main(parser.parse_args())
