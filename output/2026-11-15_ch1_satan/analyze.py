"""1장 깔때기 + 사탄 첫 클리어 시각 — simulation_head/main. 숫자만 낸다(문장은 REPORT.md).
시간 = 시뮬 t(배속 x1 · 5분마다 관리 · 사람의 읽기 · 클릭 시간 제외) · 4시간(14400s)에서 자른다 · D1 판은 뺀다.
"""
import json, statistics as st
from pathlib import Path

BASE = Path(__file__).resolve().parent
SIM = BASE / 'simulation_head' / 'main'
CP = SIM / 'checkpoints'
H = 14400
CH1 = [1011, 1012, 1013, 1021, 1022, 1023, 1031, 1032, 1033, 1041, 1042, 1043, 1051]
POL = ['basic', 'adaptive', 'passive']
SEEDS = {'basic': range(1, 81), 'adaptive': range(1, 81), 'passive': range(1, 11)}

def name(sid):
    ch, place, cell = sid // 1000, (sid // 10) % 10, sid % 10
    return f'{ch}-5 boss' if place == 5 else f'{ch}-{place} ' + ['I', 'II', 'III'][cell - 1]
def q(xs, p):
    xs = sorted(xs); k = (len(xs) - 1) * p; f = int(k); c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)

R = {pol: {s: json.loads((SIM / f'{pol}_seed{s}.json').read_text(encoding='utf-8')) for s in SEEDS[pol]} for pol in POL}
CLS = {pol: {s: json.loads((CP / f'{pol}_seed{s}_3600.json').read_text(encoding='utf-8'))['classes'] for s in SEEDS[pol]} for pol in POL}

def runs(r): return [x for x in r['runs'] if x['start'] < H and not x.get('farming')]
def satan_t(r):
    w = [x['t'] for x in runs(r) if x['stage'] == 1051 and x['won'] and x['t'] <= H]
    return min(w) if w else None

out = []
def p(*a): out.append(' '.join(str(x) for x in a))

p('## 사탄(1-5 보스) 첫 클리어 — 분 (4시간에서 자름)')
for pol in POL:
    for label, seeds in (('all', list(SEEDS[pol])), ('1-40', [s for s in SEEDS[pol] if s <= 40]), ('41-80', [s for s in SEEDS[pol] if s > 40])):
        if pol == 'passive' and label != 'all': continue
        ts = [satan_t(R[pol][s]) for s in seeds]
        got = sorted(t / 60 for t in ts if t is not None); n = len(ts)
        cens = [t / 60 if t is not None else 1e9 for t in ts]
        line = [pol, label, f'n={n}', f'cleared={len(got)}']
        for m in (30, 45, 60, 90, 120, 180, 240):
            line.append(f'<={m}m:{sum(1 for t in got if t <= m)}')
        if len(got) >= n / 2: line.append(f'median(all,censored)={q(cens, .5):.0f}m')
        if got: line.append(f'cleared q25/50/75={q(got,.25):.0f}/{q(got,.5):.0f}/{q(got,.75):.0f}m')
        p(*line)

p('\n## 칸별 — 첫 시도 승률 · 깰 때까지 판당 승률 · 첫 클리어 중앙(분) · 4시간 안 깬 계정')
for pol in ['basic', 'adaptive']:
    p(f'[{pol}]')
    for sid in CH1:
        first, att, wins, clr = [], 0, 0, []
        for s in SEEDS[pol]:
            rs = [x for x in runs(R[pol][s]) if x['stage'] == sid]
            if not rs: continue
            first.append(rs[0]['won'])
            for x in rs:
                att += 1; wins += x['won']
                if x['won']: clr.append(x['t'] / 60); break
        p(f'{name(sid):10s} reached={len(first):2d} first={100*st.mean(first):3.0f}% '
          f'perTry={100*wins/att:3.0f}% ({wins}/{att}) cleared={len(clr):2d} medClear={st.median(clr):5.1f}m' if first else f'{name(sid)} -')

p('\n## 사탄 — 보스 판(재도전) 수 · 계정별 판당 승률')
for pol in ['basic', 'adaptive']:
    tries, perAcc, zero = [], [], 0
    for s in SEEDS[pol]:
        rs = [x for x in runs(R[pol][s]) if x['stage'] == 1051]
        if not rs: continue
        k = next((i + 1 for i, x in enumerate(rs) if x['won']), None)
        if k: tries.append(k)
        else: zero += 1
    p(pol, 'tries-to-first-win med', st.median(tries), 'q75', q(tries, .75), 'max', max(tries), '| never won in 4h', zero)

p('\n## 직업 있음/없음 — 사탄 4시간 안 클리어 · 60분 안 클리어 (기본 · 대응 합쳐 160)')
for cls in ['priest', 'archer', 'knight', 'warrior', 'mage']:
    for has in (True, False):
        ts = [satan_t(R[pol][s]) for pol in ['basic', 'adaptive'] for s in SEEDS[pol] if (cls in CLS[pol][s]) == has]
        got = [t / 60 for t in ts if t is not None]
        p(f'{cls:8s} {"있음" if has else "없음"} n={len(ts):3d} 4h={100*len(got)/len(ts):3.0f}% 60m={100*sum(1 for t in got if t<=60)/len(ts):3.0f}%'
          + (f' med(cleared)={st.median(got):.0f}m' if got else ''))

p('\n## 사탄 판 — 진 판 중 보스 HP 를 못 깎은 판(roundsCleared 0 · 사망 3) 비율은 판 기록에 보스 HP 가 없어 생략')
(BASE / 'analysis_output.txt').write_text('\n'.join(out), encoding='utf-8')
print('\n'.join(out))
