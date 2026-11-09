"""노말 장별 피해 종류 — python analyze.py <tag> → out/<tag>_summary.txt
잣대 = 실제로 깎은 값(넘친 몫 뺌 · 배리어가 먹은 몫 포함 · 처형으로 지운 체력 포함 — 엔진 기여표와 같다).
몫 = 그 장에서 친 모든 판(앞 칸 · 파밍 판 포함 · 그 판이 속한 칸의 장)의 합. 판이 많은 칸(벽)이 무겁다 — 칸마다 같은 무게 표를 따로 낸다."""
import glob, json, math, statistics as st, sys
from collections import defaultdict
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent / 'out'
tag = sys.argv[1]
rows, meta = [], None
for f in sorted(glob.glob(str(OUT / f'{tag}_*-*.txt'))):
    txt = Path(f).read_text(encoding='utf-8').strip()
    if not txt: continue
    d = json.loads(txt)
    meta = meta or d['meta']
    rows += d['rows']
rows.sort(key=lambda r: r['seed'])
NAMES = {'warrior': '전사', 'knight': '기사', 'archer': '궁수', 'mage': '마법사', 'priest': '사제'}
EL = ['fire', 'cold', 'lightning', 'poison']
ELK = {'fire': '화염', 'cold': '냉기', 'lightning': '전기', 'poison': '독'}
GROUPS = [('물리', ['physical']), ('마법', EL), ('고정', ['fixed']), ('강타', ['crush']), ('반사', ['reflect'])]
SKIP = {'cDealt', 'cTaken'}
def ch_of(sid): return int(sid) // 1000
def label(sid):
    sid = int(sid); ch, sn, cell = sid // 1000, (sid // 10) % 100, sid % 10
    return f'{ch}-{sn} ' + (['', 'I', 'II', 'III'][cell] if sn < 5 else '보스')
def comp(r): return ' + '.join(NAMES[c] for c in sorted(r['cls'], key=lambda c: list(NAMES).index(c)))
def pct(a, b): return 100 * a / b if b else float('nan')
def add(dst, src):
    for k, v in src.items():
        if k not in SKIP: dst[k] += v
def by_chapter(rs, side):
    out = defaultdict(lambda: defaultdict(float))
    for r in rs:
        for sid, s in r['dmg']['stage'].items():
            add(out[ch_of(sid)], s[side])
    return out
def grp(b):
    tot = sum(b.values())
    g = {name: sum(b.get(k, 0) for k in ks) for name, ks in GROUPS}
    other = tot - sum(g.values())
    return tot, g, other
def seed_share(r, side, ch, keys):
    tot = mag = 0
    for sid, s in r['dmg']['stage'].items():
        if ch_of(sid) != ch: continue
        for k, v in s[side].items():
            if k in SKIP: continue
            tot += v
            if k in keys: mag += v
    return pct(mag, tot) if tot else None
L = []
p = L.append
p(f'# {tag} — {len(rows)}시드 ({rows[0]["seed"]} ~ {rows[-1]["seed"]}) · 노말 완주 {sum(r["done"] for r in rows)} · 막힘 {sum(1 for r in rows if r["stuck"])}')
p(f'bot: {meta["bot"]}')
p(f'route: {meta["route"]}')
p(f'assume: {" / ".join(meta["assume"])}')
stuck = defaultdict(int)
for r in rows:
    if r['stuck']: stuck[(label(r['stuck']['stageId']), r['stuck']['why'])] += 1
if stuck: p('막힌 칸: ' + ' · '.join(f'{k[0]} {k[1]} {v}' for k, v in sorted(stuck.items(), key=lambda x: -x[1])))

# 대조 — 집계 합 vs 엔진 기여표
pd = sum(v for r in rows for s in r['dmg']['stage'].values() for k, v in s['party'].items() if k not in SKIP)
pc = sum(s['party'].get('cDealt', 0) for r in rows for s in r['dmg']['stage'].values())
ed = sum(v for r in rows for s in r['dmg']['stage'].values() for k, v in s['enemy'].items() if k not in SKIP)
ec = sum(s['enemy'].get('cTaken', 0) for r in rows for s in r['dmg']['stage'].values())
p(f'대조: 파티 집계 {pd:,.0f} / 기여표 가한 {pc:,.0f} ({pct(pd, pc):.2f}%) · 적 집계 {ed:,.0f} / 기여표 받은 {ec:,.0f} ({pct(ed, ec):.2f}% — 소환 벽이 맞은 몫만큼 넘는다)')
unk = defaultdict(float)
for r in rows:
    for s in r['dmg']['stage'].values():
        for side in ('party', 'enemy'):
            for k, v in s[side].items():
                if k not in SKIP and k not in EL + ['physical', 'fixed', 'crush', 'reflect']: unk[(side, k)] += v
if unk: p('모르는 종류: ' + ' · '.join(f'{a}:{b} {v:,.0f}' for (a, b), v in unk.items()))

halves = [rows[:len(rows) // 2], rows[len(rows) // 2:]]
for side, title in (('enemy', '몬스터 → 영웅 (받은 피해)'), ('party', '영웅 → 몬스터 (가한 피해)')):
    p('')
    p(f'## {title} — 장별 몫 % (합 기준)')
    p('| 장 | 판 수 | 물리 | 마법 | (화염 · 냉기 · 전기 · 독) | 고정 | 강타 · 반사 | 우세 | 마법 % 앞 / 뒤 절반 | 시드별 마법 % 중앙 [사분위] |')
    p('|---|---:|---:|---:|---|---:|---:|---|---|---|')
    A = by_chapter(rows, side)
    H = [by_chapter(h, side) for h in halves]
    for ch in sorted(A):
        tot, g, other = grp(A[ch])
        n = sum(s['n'] for r in rows for sid, s in r['dmg']['stage'].items() if ch_of(sid) == ch)
        els = ' · '.join(f'{pct(A[ch].get(e, 0), tot):.1f}' for e in EL)
        hm = ' / '.join(f'{pct(sum(h[ch].get(e, 0) for e in EL), sum(v for v in h[ch].values())):.1f}' for h in H)
        ss = [x for x in (seed_share(r, side, ch, set(EL)) for r in rows) if x is not None]
        qs = st.quantiles(ss, n=4) if len(ss) > 3 else [float('nan')] * 3
        win = '물리' if g['물리'] > g['마법'] else '마법'
        p(f'| {ch}장 | {n:,} | {pct(g["물리"], tot):.1f} | {pct(g["마법"], tot):.1f} | {els} | {pct(g["고정"], tot):.1f} | {pct(g["강타"] + g["반사"], tot):.1f} | {win} | {hm} | {qs[1]:.1f} [{qs[0]:.1f} ~ {qs[2]:.1f}] |' + (f' 기타 {pct(other, tot):.2f}' if other else ''))

# 영웅 쪽 — 파티 구성으로 가른다
p('')
p('## 영웅 → 몬스터 — 마법사 있는 파티 / 없는 파티 (장별 마법 몫 % · 합 기준)')
wm = [r for r in rows if 'mage' in r['cls']]
nm = [r for r in rows if 'mage' not in r['cls']]
p(f'마법사 있음 {len(wm)}시드 · 없음 {len(nm)}시드')
p('| 장 | 마법사 있음 — 물리 · 마법 · 고정 | 마법사 없음 — 물리 · 마법 · 고정 |')
p('|---|---|---|')
AW, AN = by_chapter(wm, 'party'), by_chapter(nm, 'party')
for ch in sorted(AW):
    cells = []
    for A in (AW, AN):
        tot, g, _ = grp(A[ch])
        cells.append(f'{pct(g["물리"] + g["강타"], tot):.1f} · {pct(g["마법"], tot):.1f} · {pct(g["고정"], tot):.1f}')
    p(f'| {ch}장 | {cells[0]} | {cells[1]} |')

# 직업별 — 그 직업이 낸 피해 중 마법 몫 · 그리고 직업의 파티 피해 몫
p('')
p('## 직업별 — 낸 피해의 종류 (5장 합 · 전 시드)')
CLS = defaultdict(lambda: defaultdict(float))
for r in rows:
    for c, o in r['dmg']['cls'].items():
        for k, v in o.items():
            ch, b = k.split(':')
            CLS[c][b] += v
allp = sum(sum(o.values()) for o in CLS.values())
p('| 직업 | 파티 전체 피해 중 몫 | 물리 | 마법 (원소별) | 고정 | 강타 · 반사 |')
p('|---|---:|---:|---|---:|---:|')
for c in NAMES:
    if c not in CLS: continue
    b = CLS[c]; tot = sum(b.values())
    els = ' · '.join(f'{ELK[e]} {pct(b.get(e, 0), tot):.1f}' for e in EL if b.get(e, 0) > 0)
    p(f'| {NAMES[c]} | {pct(tot, allp):.1f} | {pct(b.get("physical", 0), tot):.1f} | {pct(sum(b.get(e, 0) for e in EL), tot):.1f}' + (f' ({els})' if els else '') + f' | {pct(b.get("fixed", 0), tot):.1f} | {pct(b.get("crush", 0) + b.get("reflect", 0), tot):.1f} |')

# 조합별 — 가한 피해 마법 몫 (5장 합)
p('')
p('## 조합별 — 가한 피해 마법 몫 % (전 장 합)')
CB = defaultdict(list)
for r in rows: CB[comp(r)].append(r)
p('| 조합 | 시드 | 마법 % | 1 · 2 · 3 · 4 · 5장 |')
p('|---|---:|---:|---|')
for k, rs in sorted(CB.items(), key=lambda x: -len(x[1])):
    A = by_chapter(rs, 'party')
    tot_all = sum(sum(v.values()) for v in A.values()); mag_all = sum(sum(v.get(e, 0) for e in EL) for v in A.values())
    per = ' · '.join(f'{pct(sum(A[ch].get(e, 0) for e in EL), sum(A[ch].values())):.0f}' for ch in sorted(A))
    p(f'| {k} | {len(rs)} | {pct(mag_all, tot_all):.1f} | {per} |')

# 칸별 — 몬스터가 영웅에게 (판 수 · 판당 평균이 아닌 합 몫 · 원소별)
p('')
p('## 칸별 — 몬스터 → 영웅 (그 칸 합의 몫 % · 판 수)')
p('| 칸 | 판 | 물리 | 화염 | 냉기 | 전기 | 독 | 고정 | 강타 · 반사 | 판당 받은 피해 |')
p('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
S = defaultdict(lambda: defaultdict(float)); N = defaultdict(int)
for r in rows:
    for sid, s in r['dmg']['stage'].items():
        add(S[int(sid)], s['enemy']); N[int(sid)] += s['n']
for sid in sorted(S):
    b = S[sid]; tot = sum(b.values())
    p(f'| {label(sid)} | {N[sid]:,} | {pct(b.get("physical", 0), tot):.0f} | ' + ' | '.join(f'{pct(b.get(e, 0), tot):.0f}' for e in EL) + f' | {pct(b.get("fixed", 0), tot):.0f} | {pct(b.get("crush", 0) + b.get("reflect", 0), tot):.0f} | {tot / N[sid]:,.0f} |')

# 칸마다 같은 무게 — 칸별 몫을 평균해 장으로 (판 많은 벽 칸이 장을 끌지 않게)
p('')
p('## 칸마다 같은 무게로 본 장별 마법 몫 % (칸 몫의 평균)')
p('| 장 | 몬스터 → 영웅 | 영웅 → 몬스터 |')
p('|---|---:|---:|')
SP = defaultdict(lambda: defaultdict(float))
for r in rows:
    for sid, s in r['dmg']['stage'].items(): add(SP[int(sid)], s['party'])
for ch in sorted({ch_of(s) for s in S}):
    vals = []
    for src in (S, SP):
        xs = [pct(sum(src[sid].get(e, 0) for e in EL), sum(src[sid].values())) for sid in src if ch_of(sid) == ch and sum(src[sid].values())]
        vals.append(sum(xs) / len(xs))
    p(f'| {ch}장 | {vals[0]:.1f} | {vals[1]:.1f} |')

# 시드 한 명 기준 — 그 장을 깨는 동안 그 시드가 받은(가한) 피해에서 물리 · 마법 몫 · 마법이 이긴 시드 비율 · 절반 둘
def seed_parts(r, side, ch):
    b = defaultdict(float)
    for sid, s in r['dmg']['stage'].items():
        if ch_of(sid) == ch: add(b, s[side])
    return b
for side, title in (('enemy', '몬스터 → 영웅'), ('party', '영웅 → 몬스터')):
    p('')
    p(f'## 시드 한 명 기준 — {title} (시드마다 그 장 몫을 낸 뒤 중앙 · 마법 > 물리 인 시드 %)')
    p('| 장 | 물리 % 중앙 | 마법 % 중앙 | 마법이 이긴 시드 % (전체 · 앞 절반 · 뒤 절반) | 강타 % 중앙 | 반사 % 중앙 |')
    p('|---|---:|---:|---|---:|---:|')
    for ch in range(1, 6):
        ph, mg, cr, rf, win = [], [], [], [], [[], []]
        for i, h in enumerate(halves):
            for r in h:
                b = seed_parts(r, side, ch); tot = sum(b.values())
                if not tot: continue
                P_ = b.get('physical', 0); M_ = sum(b.get(e, 0) for e in EL)
                ph.append(pct(P_, tot)); mg.append(pct(M_, tot)); cr.append(pct(b.get('crush', 0), tot)); rf.append(pct(b.get('reflect', 0), tot))
                win[i].append(1 if M_ > P_ else 0)
        allw = win[0] + win[1]
        p(f'| {ch}장 | {st.median(ph):.1f} | {st.median(mg):.1f} | {pct(sum(allw), len(allw)):.0f} · {pct(sum(win[0]), len(win[0])):.0f} · {pct(sum(win[1]), len(win[1])):.0f} | {st.median(cr):.1f} | {st.median(rf):.1f} |')

# 영웅 쪽 — 마법사 있는 파티만 시드 기준
p('')
p('## 시드 한 명 기준 — 영웅 → 몬스터 · 마법사 있는 파티만')
p('| 장 | 물리 % 중앙 | 마법 % 중앙 | 마법이 이긴 시드 % (전체 · 앞 · 뒤) |')
p('|---|---:|---:|---|')
wmh = [[r for r in h if 'mage' in r['cls']] for h in halves]
for ch in range(1, 6):
    ph, mg, win = [], [], [[], []]
    for i, h in enumerate(wmh):
        for r in h:
            b = seed_parts(r, 'party', ch); tot = sum(b.values())
            if not tot: continue
            P_ = b.get('physical', 0); M_ = sum(b.get(e, 0) for e in EL)
            ph.append(pct(P_, tot)); mg.append(pct(M_, tot)); win[i].append(1 if M_ > P_ else 0)
    allw = win[0] + win[1]
    p(f'| {ch}장 | {st.median(ph):.1f} | {st.median(mg):.1f} | {pct(sum(allw), len(allw)):.0f} · {pct(sum(win[0]), len(win[0])):.0f} · {pct(sum(win[1]), len(win[1])):.0f} |')

# 강타 · 반사를 칸별로 떼어 — 몬스터 쪽에서 5% 넘는 칸만
p('')
p('## 몬스터 → 영웅 · 강타 / 반사가 5% 넘는 칸')
for sid in sorted(S):
    b = S[sid]; tot = sum(b.values())
    c, rf = pct(b.get('crush', 0), tot), pct(b.get('reflect', 0), tot)
    if c + rf > 5: p(f'- {label(sid)} — 강타 {c:.1f} · 반사 {rf:.1f}')

txt = '\n'.join(L)
(OUT / f'{tag}_summary.txt').write_text(txt, encoding='utf-8')
print(txt)
