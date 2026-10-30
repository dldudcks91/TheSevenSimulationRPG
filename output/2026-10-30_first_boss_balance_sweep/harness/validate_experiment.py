"""Audit completeness, paired starts, time, provenance and all saved outcomes."""
import argparse
import collections
import hashlib
import itertools
import json
import math
from pathlib import Path
from run_sweep import BASE, AXES
from analyze_sweep import records


def main(args):
    groups=collections.defaultdict(lambda:{'checks':0,'passed':0})
    failures=[]
    def check(name,ok,detail=None):
        groups[name]['checks']+=1;groups[name]['passed']+=bool(ok)
        if not ok:failures.append({'check':name,'detail':detail})
    manifest=json.loads((BASE/'source_manifest.json').read_text(encoding='utf-8'))
    for key,value in manifest['files'].items():
        check('frozen source hash',hashlib.sha256((BASE/'snapshot/src'/key).read_bytes()).hexdigest()==value['sha256'],key)
    parity=json.loads((BASE/'browser_parity.json').read_text(encoding='utf-8'))
    check('browser/native parity',not parity['errors']and all(c['identical_rows']for c in parity['comparisons']))
    vm={r['id']:r for r in records(BASE/'pilot')}
    native={r['id']:r for r in records(BASE/'native_pilot')}
    check('VM/native parity',set(vm)==set(native)and all(vm[k]['rows']==native[k]['rows']for k in vm))
    starts={x['seed']:x['classes']for x in native['baseline']['rows']}
    phase_reports=[]
    for phase in args.phases:
        folder=BASE/phase
        jobs=json.loads((folder/'jobs.json').read_text(encoding='utf-8'))
        rows=records(folder);by_id={r['id']:r for r in rows}
        check(phase+' all expected combinations',set(by_id)=={j['id']for j in jobs},{'expected':len(jobs),'actual':len(rows)})
        if phase=='grid':
            actual={tuple(r['variant'][k]for k in AXES)for r in rows}
            expected=set(itertools.product(*AXES.values()))
            check('576 Cartesian combinations covered',actual==expected)
        for j in jobs:
            if j['id']not in by_id:continue
            r=by_id[j['id']]
            check('variant exact input',r['variant']==j['variant'],phase+'/'+j['id'])
            check('seed set and order exact',r['seeds']==j['seeds']and[x['seed']for x in r['rows']]==j['seeds'],phase+'/'+j['id'])
            for x in r['rows']:
                label=f"{phase}/{r['id']}/{x['seed']}"
                check('no runtime or invariant errors',not x.get('error')and not x.get('failures'),label)
                if x.get('error'):continue
                clear=x['clearSeconds'];arrival=x['arrivalSeconds'];end=x['seconds']
                check('real timing budget',x['timeBudgetMs']==round(end*1000),label)
                check('win agrees with endpoint',x['won']==(clear is not None)and(clear is None or clear==end),label)
                check('arrival precedes clear',clear is None or arrival is not None and 0<=arrival<=clear,label)
                check('censoring retains failed starts',clear is not None or end==r['horizon'],label)
                check('no injected negative/nonfinite wallet',math.isfinite(x['gold'])and x['gold']>=0,label)
                check('real level bounds',all(isinstance(level,int)and 1<=level<=50 for level in x['levels']),label)
                if x['seed']in starts:check('same starting class order',x['classes']==starts[x['seed']],label)
        info=json.loads((folder/'run_info.json').read_text(encoding='utf-8'))
        check(phase+' no phase errors',not info.get('errors'),info.get('errors'))
        phase_reports.append({'phase':phase,'combinations':len(rows),'accounts':sum(len(r['rows'])for r in rows),'runs':sum(x.get('runs',0)for r in rows for x in r['rows'])})
    coverage=json.loads((BASE/'class_coverage.json').read_text(encoding='utf-8'))
    check('all54 legal class/rarity orders',len(coverage['groups'])==54 and all(len(v)==4 for v in coverage['groups'].values()))
    check('coverage seeds separate from tuning and natural test',not(set(coverage['seeds'])&set(range(1,401))))
    result={'checks':sum(g['checks']for g in groups.values()),'passed':sum(g['passed']for g in groups.values()),
            'failures':failures,'groups':dict(groups),'phases':phase_reports}
    (BASE/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items()if k not in ['groups']},ensure_ascii=True),flush=True)
    if failures:raise SystemExit(1)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--phases',nargs='+',default=['grid','refinement','policy_grid','startup_grid']);main(parser.parse_args())
