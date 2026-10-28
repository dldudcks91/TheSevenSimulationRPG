import json, glob, statistics as st, sys
from collections import defaultdict
for tag in sys.argv[1:]:
    seeds=[]
    for f in sorted(glob.glob(f'out/{tag}_[0-9]*-[0-9]*.txt')):
        seeds+=json.load(open(f,encoding='utf-8'))['out']
    print('#',tag,len(seeds))
    for diff in ('hell',):
        tries=defaultdict(list); hrs=defaultdict(list); mlv=defaultdict(set); wr=defaultdict(lambda:[0,0]); reach=defaultdict(int)
        for o in seeds:
            byc=defaultdict(list)
            for s in o['stages']:
                if s['diff']==diff: byc[s['stageId']//1000].append(s)
            for ch,ss in byc.items():
                reach[ch]+=1
                for s in ss:
                    mlv[ch].add(s['mlv']); wr[ch][0]+=s['wins']; wr[ch][1]+=s['tries']
                if all(s['tClear'] is not None for s in ss) and len(ss)>=11:
                    tries[ch].append(sum(s['tries'] for s in ss))
                    hrs[ch].append((ss[-1]['tClear']-ss[0]['t0'])/3600)
        print(' ',diff)
        for ch in sorted(reach):
            m=sorted(mlv[ch])
            print(f'   ch{ch}: reached {reach[ch]} cleared {len(tries[ch])} · mLv {m[0]}~{m[-1]} · tries med {st.median(tries[ch]) if tries[ch] else "-"} · sim h med {st.median(hrs[ch]):.1f}' if tries[ch] else f'   ch{ch}: reached {reach[ch]} cleared 0 · mLv {m[0]}~{m[-1]}', f'· win {100*wr[ch][0]/max(1,wr[ch][1]):.1f}%')
