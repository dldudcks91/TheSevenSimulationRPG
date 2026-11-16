"""Satan class probe summary — probe/class_*.json (40분 상태 · 20판씩). 숫자만."""
import json, statistics as st
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).resolve().parent
P = BASE / 'probe'
rows = []
for f in sorted(P.glob('class_*.json')):
    d = json.loads(f.read_text(encoding='utf-8'))
    if d.get('skip'): continue
    rows.append(d)
out = []
def p(*a): out.append(' '.join(str(x) for x in a))
p('accounts', len(rows), 'fights', sum(len(r['fights']) for r in rows))

# per hero class (per fight averages)
C = defaultdict(lambda: defaultdict(list))
for r in rows:
    for fi in r['fights']:
        if 'err' in fi: continue
        tot = sum(h['toEscort'] + h['toBoss'] for h in fi['heroes']) or 1
        for i, h in enumerate(fi['heroes']):
            c = C[h['cls']]
            dmg = h['toEscort'] + h['toBoss']
            c['dmg'].append(dmg); c['share'].append(dmg / tot)
            c['basicShare'].append(h['basic'] / dmg if dmg else 0)
            c['toBossShare'].append(h['toBoss'] / dmg if dmg else 0)
            c['heal'].append(h['heal'])
            alive = h['down'] if h['down'] is not None else fi['sec']
            c['alive'].append(alive); c['survived'].append(h['down'] is None)
            c['dps'].append(dmg / alive if alive else 0)
            c['hp'].append(r['heroes'][i]['hp'])
            c['first15'].append(1 if (h['down'] is None or h['down'] > 15) else 0)
p('\n## 직업별 (영웅 한 명 · 사탄전 한 판 평균)')
p('cls      n     dmg  share  dps(alive)  alive_s  alive>15s  survived  basic%  toBoss%  heal  hp')
for cls in ['archer', 'mage', 'warrior', 'knight', 'priest']:
    c = C[cls]
    p(f"{cls:8s} {len(c['dmg']):5d} {st.mean(c['dmg']):6.0f} {100*st.mean(c['share']):4.0f}%  {st.mean(c['dps']):6.1f}  {st.median(c['alive']):7.1f}  {100*st.mean(c['first15']):4.0f}%  {100*st.mean(c['survived']):4.0f}%  {100*st.mean(c['basicShare']):4.0f}%  {100*st.mean(c['toBossShare']):4.0f}%  {st.mean(c['heal']):5.0f} {st.median(c['hp']):4.0f}")

# skill damage by class
S = defaultdict(lambda: defaultdict(float)); N = defaultdict(int)
for r in rows:
    for fi in r['fights']:
        if 'err' in fi: continue
        for h in fi['heroes']:
            N[h['cls']] += 1
            S[h['cls']]['(basic)'] += h['basic']
            for s, v in h['skills'].items(): S[h['cls']][s] += v
p('\n## 직업별 피해 출처 (한 판 평균)')
for cls in ['archer', 'mage', 'warrior', 'knight', 'priest']:
    items = sorted(S[cls].items(), key=lambda x: -x[1])[:6]
    p(cls, ' · '.join(f'{k} {v / N[cls]:.0f}' for k, v in items))

# party: archer present vs not
p('\n## 파티 — 궁수 있음 / 없음 (사탄전 판 단위)')
for has in (True, False):
    fs = [fi for r in rows for fi in r['fights'] if 'err' not in fi and ('archer' in r['classes']) == has]
    win = [fi['won'] for fi in fs]
    esc = [fi['escortsClearedAt'] for fi in fs if fi['escortsClearedAt'] is not None]
    p('있음' if has else '없음', 'fights', len(fs), f'win {100*st.mean(win):.0f}%',
      f'escorts cleared {100*len(esc)/len(fs):.0f}%', f'cleared-at med {st.median(esc):.1f}s' if esc else '',
      f'<=13s {100*sum(1 for x in esc if x<=13)/len(fs):.0f}%')
    # halves by seed
    for lo, hi in ((1, 40), (41, 80)):
        fs2 = [fi for r in rows if lo <= r['seed'] <= hi and ('archer' in r['classes']) == has for fi in r['fights'] if 'err' not in fi]
        p('   seeds', f'{lo}-{hi}', f'win {100*st.mean([f["won"] for f in fs2]):.0f}%')

# account-level: won fights by escorts-cleared time
p('\n## 호위를 언제 넘겼나 → 그 판 승률')
allf = [fi for r in rows for fi in r['fights'] if 'err' not in fi]
for lo, hi in ((0, 10), (10, 13), (13, 16), (16, 25), (25, 999)):
    fs = [fi for fi in allf if fi['escortsClearedAt'] is not None and lo < fi['escortsClearedAt'] <= hi]
    if fs: p(f'{lo}-{hi}s', len(fs), f'win {100*st.mean([f["won"] for f in fs]):.0f}%')
fs = [fi for fi in allf if fi['escortsClearedAt'] is None]
p('never', len(fs), f'win {100*st.mean([f["won"] for f in fs]):.0f}%')
(BASE / 'analysis_class.txt').write_text('\n'.join(out), encoding='utf-8')
print('\n'.join(out))
