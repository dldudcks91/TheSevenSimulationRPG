import json, html, statistics as st, sys
from pathlib import Path
OUT = Path(sys.argv[1]); K = 1.55
RARS = ['normal', 'magic', 'rare', 'epic', 'legendary']
def load(tag):
    out = []
    for f in sorted(OUT.glob(f'{tag}_*.txt')):
        t = f.read_text(encoding='utf-8').strip()
        if t: out += json.loads(html.unescape(t))['out']
    return {r['seed']: r for r in out}
def med(xs): return round(st.median(xs), 1) if xs else '-'
def h(sec): return sec / 3600 * K
def summarize(tag, R, seeds):
    lines = []
    for diff in ('normal', 'nightmare', 'hell'):
        done, dt, lv, runs, wins, drops, full = 0, [], [], 0, 0, {}, 0
        for s in seeds:
            r = R.get(s)
            if not r: continue
            tier = next((x for x in r['tiers'] if x['diff'] == diff), None)
            if not tier: continue
            runs += tier['runs']; wins += tier.get('wins', 0)
            for k, v in tier.get('drops', {}).items(): drops[k] = drops.get(k, 0) + v
            if tier['t1'] is not None and not (r['stuck'] and r['stuck']['diff'] == diff):
                done += 1; dt.append(h(tier['t1'] - tier['t0']))
                last = [x for x in r['stages'] if x['diff'] == diff]
                if last: lv.append(last[-1]['clear']['lv'])
        n = len(seeds)
        tot = sum(drops.values()) or 1
        per = {k: drops.get(k, 0) for k in RARS}
        perSeed = {k: round(per[k] / max(1, sum(1 for s in seeds if R.get(s) and any(x['diff'] == diff for x in R[s]['tiers']))), 2) for k in ('epic', 'legendary')}
        lines.append(f"  {diff:9} 끝낸 {done}/{n} · 단 시간 {med(dt)}h · 끝 Lv {med(lv)} · 판 {runs} 승 {round(100*wins/max(1,runs))}% · 드롭 {sum(drops.values())} "
                     + ' '.join(f"{k[:3]} {per[k]}({round(100*per[k]/tot,1)}%)" for k in RARS)
                     + (f" gone {drops.get('gone',0)}" if drops.get('gone') else '')
                     + f" · 시드당 에픽 {perSeed['epic']} 레전더리 {perSeed['legendary']} · 100판당 에픽 {round(100*per['epic']/max(1,runs),2)} 레전 {round(100*per['legendary']/max(1,runs),2)}")
    stuck = [f"{R[s]['stuck']['diff'][0]}{R[s]['stuck']['stageId']}" for s in seeds if R.get(s) and R[s]['stuck']]
    endrar = {}
    for s in seeds:
        if R.get(s):
            for k, v in R[s]['end']['rar'].items(): endrar[k] = endrar.get(k, 0) + v
    return '\n'.join(lines) + f"\n  막힘 {len(stuck)}: {' '.join(stuck)}\n  끝 착용 희귀도 {endrar} · 총 시간 {med([h(R[s]['t']) for s in seeds if R.get(s)])}h"
for tag in sys.argv[2:]:
    R = load(tag)
    print(f"== {tag} seeds {len(R)}")
    for name, seeds in (('all', sorted(R)), ('front', [s for s in sorted(R) if s <= 12]), ('back', [s for s in sorted(R) if s > 12])):
        print(f" [{name}]"); print(summarize(tag, R, seeds))
