"""out/A_*.txt (결투장) · out/P_*.txt (원정 탐침) → 등가 데미지 % · 판정. python analyze.py [--boot 200]
쓰는 것: out/analysis.md (표) · out/eval.json (모든 수 — README 가 읽는다). 결정 목록은 ../PLAN.md D1 ~ D10.

등가 데미지 % (D2) — 같은 영웅에 상시 「데미지 +%」(atk_pct · 무기 밖 장비 한 줄) 2 · 5 · 10 · 20% 를 넣은 곡선에서 그 옵션의 효과를 거꾸로 읽는다.
  결투장 효과 = **남은 HP 차이**(A 남은 HP 비율 − 미러 남은 HP 비율 · −1 ~ 1)의 「변형 − 바탕」(같은 씨앗 · 같은 자리 짝) 평균.
  곡선과 옵션 효과를 시드마다 고르게 평균한 뒤(시드마다 대상 영웅이 다르다) 곡선을 단조로 다듬고 꺾은선으로 거꾸로 읽는다 ·
  곡선 밖(20% 초과 · 0 아래)은 0 → 20% 기울기로 늘인다.
옵션 하나 = 변형의 묶음 — 발동은 그 무기군 풀의 스킬 평균(D7 ③) · 원소 줄은 그 영웅이 바탕 판에서 가장 많이 준 원소(「맞는 원소」 · 셋 평균은 따로) ·
  종족은 셋 평균(따로도 적는다).
판정 (D9) — 같은 무기 종류 · 같은 단의 전투 옵션(탐욕 · 종족 · 정예 · 오만 제외) 메인 줄 등가 % 중앙값 대비 배수 —
  > 1.6 압도 · 1.3 ~ 1.6 강함 · 0.7 ~ 1.3 정상 · 0.3 ~ 0.7 약함 · < 0.3 죽은 줄.
  세 단 배수 평균으로 판정 · 시드 앞 절반 / 뒤 절반의 방향(+ 강함 쪽 · 0 정상 · − 약함 쪽)이 같을 때만(D10) · 다르면 「갈림」.
"""
import json, sys, math
from pathlib import Path
from collections import defaultdict
import numpy as np

OUT = Path(__file__).resolve().parent.parent / 'out'
BOOT = int(sys.argv[sys.argv.index('--boot') + 1]) if '--boot' in sys.argv else 200
TIERS = ['normal', 'nightmare', 'hell']
TKO = {'normal': '노말', 'nightmare': '나이트메어', 'hell': '헬'}
DMG = ['0.02', '0.05', '0.1', '0.2']
DX = [2.0, 5.0, 10.0, 20.0]
ELS = ['fire', 'cold', 'lightning']
RNG = np.random.default_rng(20261117)

SIN_KO = {'wrath': '분노', 'sloth': '나태', 'lust': '색욕', 'envy': '시기', 'pride': '오만', 'gluttony': '폭식', 'greed': '탐욕'}
STAT_KO = {
    'crit_damage': '치명타 피해', 'crit_rate': '치명타 확률', 'aspd_pct': '공격 속도', 'cast_speed_pct': '캐스팅 속도',
    'proc_hit_attack': '타격 시 발동', 'proc_cast_attack': '시전 시 발동', 'cooldown_reduction': '쿨타임 감소',
    'hit_bonus': '명중률', 'buff_dur_pct': '버프 지속', 'life_steal': '흡혈', 'cast_refund_chance': '시전 칸 충전',
    'dmg_min_flat': '최소 데미지', 'dmg_max_flat': '최대 데미지', 'el_dmg': '원소 데미지', 'def_ignore': '방어력 관통',
    'stagger_dur_pct': '경직 시간', 'el_pen': '원소 관통', 'dmg_max_per_level': '레벨당 최대', 'dmg_min_per_level': '레벨당 최소',
    'crushing_blow_pct': '강타', 'cast_stack_pct': '시전 누적', 'vs_elite_dmg': '정예 · 보스 추가', 'vs_race': '종족 추가',
    'magic_find': '매직 획득', 'gold_find': '골드 획득', 'xp_gain_pct': '경험치 획득',
}
EXCLUDE_MEDIAN = ('greed', 'gluttony2', 'gluttony3', 'pride')


def nanmean(xs):
    xs = [x for x in xs if x is not None and not (isinstance(x, float) and math.isnan(x))]
    return sum(xs) / len(xs) if xs else float('nan')


# ───────────── 곡선 ─────────────
def monotone(ys):
    """앞 점보다 낮으면 묶어 평균 — 단조 증가 (pool adjacent violators) · ys 와 같은 길이"""
    out = []
    for y in ys:
        out.append([y, 1])
        while len(out) > 1 and out[-2][0] > out[-1][0]:
            a, c = out[-2], out[-1]
            out[-2] = [(a[0] * a[1] + c[0] * c[1]) / (a[1] + c[1]), a[1] + c[1]]
            out.pop()
    res = []
    for y, n in out:
        res += [y] * n
    return res


def invert(xs, ys, d):
    """(0,0) 포함 꺾은선 · 단조 다듬기 → d 를 x 로 · 밖은 0 → 끝 점 기울기"""
    ys = monotone(ys)
    slope = ys[-1] / xs[-1] if xs[-1] else 0
    if not (slope > 0) or d is None or math.isnan(d):
        return float('nan')
    if d <= 0:
        return d / slope
    if d >= ys[-1]:
        return xs[-1] + (d - ys[-1]) / slope
    for i in range(1, len(xs)):
        if d <= ys[i]:
            if ys[i] == ys[i - 1]:
                return xs[i - 1]
            return xs[i - 1] + (d - ys[i - 1]) * (xs[i] - xs[i - 1]) / (ys[i] - ys[i - 1])
    return float('nan')


def cat(r):
    if r is None or (isinstance(r, float) and math.isnan(r)):
        return '못 잼'
    if r > 1.6: return '압도'
    if r > 1.3: return '강함'
    if r >= 0.7: return '정상'
    if r >= 0.3: return '약함'
    return '죽은 줄'


def direction(c):
    return {'압도': 1, '강함': 1, '정상': 0, '약함': -1, '죽은 줄': -1}.get(c)


# ───────────── 변형 id → 옵션 묶음 ─────────────
def classify(vid):
    """→ ('dmg', x) · ('hp', x) · ('wbase',) · ('prideB', st, n) · ('pen', name) · ('opt', gkey, which, sub, el) · None"""
    p = vid.split(':')
    if p[0].startswith('dmg'): return ('dmg', p[0][3:])
    if p[0].startswith('hp'): return ('hp', p[0][2:])
    if p[0].startswith('wbase'): return ('wbase',)
    if p[0] == 'prideB': return ('prideB', p[1], p[2])
    if p[0].startswith('pen'): return ('pen', vid)
    cell, stat, which = p[0], p[1], p[-1]
    el = next((e for e in ELS + ['poison'] if stat == f'{e}_dmg_pct' or stat == f'res_reduction_{e}'), None)
    if cell.startswith('pride'):
        return ('opt', f'{cell}:{stat}', which, stat, None)
    if stat.startswith('vs_') and stat != 'vs_elite_dmg':
        return ('opt', cell, which, stat, None)          # 종족 셋 → 한 묶음(평균)
    if stat.startswith('proc_'):
        return ('opt', cell, which, p[2], None)          # 스킬마다 → 한 묶음(평균)
    return ('opt', cell, which, stat, el)


def gstat(gkey, sub, el):
    if gkey.startswith('pride'): return gkey.split(':')[1]
    if el: return 'el_dmg' if sub.endswith('_dmg_pct') else 'el_pen'
    if sub.startswith('vs_') and sub != 'vs_elite_dmg': return 'vs_race'
    if gkey.startswith('sloth1'): return sub if sub.startswith('proc_') else 'proc'
    return sub


def match_el(dealt):
    if not dealt: return None
    xs = {e: dealt.get(e, 0) for e in ELS}
    best = max(xs, key=xs.get)
    return best if xs[best] > 0 else None


def seed_values(var, dealt, idx=None, kmetric='M'):
    """한 쪽(시드 · 단 · 대상)의 변형 효과 → 묶음 값 — var: {vid: {M, W, ...}} · idx = 붓스트랩 표본(판 번호)"""
    base = var['base']
    def d(v):
        x = (v['M'] - base['M']) if kmetric == 'M' else (v['W'] - base['W']) / 2.0
        return float((x[idx] if idx is not None else x).mean())
    out = {'dmg': {}, 'hp': {}, 'wbase': None, 'prideB': {}, 'pen': {}, 'opt': {}, 'optEl': {}, 'optSub': {}}
    groups = defaultdict(list)
    me = match_el(dealt)
    for vid, v in var.items():
        if vid == 'base': continue
        c = classify(vid)
        if c is None: continue
        if c[0] == 'dmg': out['dmg'][c[1]] = d(v)
        elif c[0] == 'hp': out['hp'][c[1]] = d(v)
        elif c[0] == 'wbase': out['wbase'] = d(v)
        elif c[0] == 'prideB': out['prideB'][(c[1], c[2])] = d(v)
        elif c[0] == 'pen': out['pen'][c[1]] = d(v)
        else: groups[(c[1], c[2])].append((c[3], c[4], d(v)))
    for key, rows in groups.items():
        els = [r for r in rows if r[1]]
        if els:
            m = [r[2] for r in els if r[1] == me]
            out['opt'][key] = m[0] if m else float(np.mean([r[2] for r in els]))
            out['optEl'][key] = float(np.mean([r[2] for r in els]))
        else:
            out['opt'][key] = float(np.mean([r[2] for r in rows]))
        out['optSub'][key] = {r[0]: r[2] for r in rows}
        out.setdefault('stat', {})[key] = gstat(key[0], rows[0][0], rows[0][1])
    out['me'] = me
    # 관통 합(마법) — 맞는 원소 판
    if me and f'pen:{me}' in out['pen']: out['pen']['pen:match'] = out['pen'][f'pen:{me}']
    return out


def pool(svs):
    """시드마다 값 → 고른 평균 (그 값을 가진 시드만)"""
    acc = defaultdict(list)
    for sv in svs:
        for sec in ('dmg', 'hp', 'prideB', 'pen', 'opt', 'optEl'):
            for k, x in sv[sec].items():
                acc[(sec, k)].append(x)
        if sv['wbase'] is not None: acc[('wbase', None)].append(sv['wbase'])
    P = {'dmg': {}, 'hp': {}, 'prideB': {}, 'pen': {}, 'opt': {}, 'optEl': {}, 'wbase': None, 'stat': {}}
    for (sec, k), xs in acc.items():
        if sec == 'wbase': P['wbase'] = float(np.mean(xs))
        else: P[sec][k] = float(np.mean(xs))
    for sv in svs: P['stat'].update(sv.get('stat', {}))
    return P


def evaluate(P):
    """등가 % · 중앙값 · 배수"""
    if not all(x in P['dmg'] for x in DMG):
        return None
    xs = [0.0] + DX
    ys = [0.0] + [P['dmg'][x] for x in DMG]
    hys = [0.0] + [P['hp'].get(x, float('nan')) for x in DMG]
    E = {'curve': ys, 'eq': {}, 'eqEl': {}, 'eqHp': {}, 'pen': {}, 'prideB': {}}
    for key, x in P['opt'].items(): E['eq'][key] = invert(xs, ys, x)
    for key, x in P['optEl'].items(): E['eqEl'][key] = invert(xs, ys, x)
    if not any(math.isnan(h) for h in hys):
        for key, x in P['opt'].items(): E['eqHp'][key] = invert(xs, hys, x)
    for k, x in P['pen'].items(): E['pen'][k] = invert(xs, ys, x)
    for k, x in P['prideB'].items(): E['prideB'][k] = invert(xs, ys, x)
    E['wbase'] = invert(xs, ys, P['wbase']) if P['wbase'] is not None else float('nan')
    med = [E['eq'][k] for k in E['eq'] if k[1] == 'main' and not k[0].startswith(EXCLUDE_MEDIAN)]
    med = [m for m in med if not math.isnan(m)]
    E['median'] = float(np.median(med)) if med else float('nan')
    E['ratio'] = {k: (v / E['median'] if E['median'] > 0 else float('nan')) for k, v in E['eq'].items()}
    return E


# ───────────── 결투장 ─────────────
def load_arena():
    pages = {}
    for p in sorted(OUT.glob('A_*.txt')):
        t = p.read_text(encoding='utf-8').strip()
        if not t: continue
        d = json.loads(t)
        if 'res' not in d: continue
        m = d['meta']
        key = (m['seed'], m['tier'], m['who'])
        pg = pages.setdefault(key, {'meta': m, 'var': {}, 'dealt': None, 'files': []})
        pg['files'].append(p.name)
        for r in d['res']:
            vid = r['id'].split(':', 1)[1]
            W = np.frombuffer(r['W'].encode(), dtype=np.uint8).astype(np.float64) - 48.0
            M = np.array(r['M'], dtype=np.float64) / 1000.0
            if vid == 'base' and 'base' in pg['var']:
                assert np.array_equal(pg['var']['base']['M'], M), f'base differs across parts {key}'
            pg['var'][vid] = {'kind': r['kind'], 'meta': r['meta'], 'lines': r['lines'], 'sec': r['sec'], 'to': r['to'], 'bad': r['bad'], 'W': W, 'M': M}
            if r.get('dealt'): pg['dealt'] = r['dealt']
    return pages


def arena_eval(pages, boot=BOOT):
    R = {}
    for tier in TIERS:
        for who in ('phys', 'mag'):
            keys = sorted(k for k in pages if k[1] == tier and k[2] == who)
            if not keys: continue
            seeds = [k[0] for k in keys]
            svs = {k[0]: seed_values(pages[k]['var'], pages[k]['dealt']) for k in keys}
            svw = {k[0]: seed_values(pages[k]['var'], pages[k]['dealt'], kmetric='W') for k in keys}
            E = evaluate(pool(list(svs.values())))
            Ew = evaluate(pool(list(svw.values())))
            h1 = [s for s in seeds if s <= 4]; h2 = [s for s in seeds if s >= 5]
            E1 = evaluate(pool([svs[s] for s in h1])) if h1 else None
            E2 = evaluate(pool([svs[s] for s in h2])) if h2 else None
            # 마법 대상이 마법사인 시드만 — 사제는 피해 스킬이 고정 피해라 원소 줄이 안 먹는다(item_design §1 · 받아들인 처지)
            mage_seeds = [s for s in seeds if (pages[(s, tier, who)]['meta'].get('target') or {}).get('cls') == 'mage']
            Emage = evaluate(pool([svs[s] for s in mage_seeds])) if who == 'mag' and mage_seeds else None
            # 붓스트랩 — 시드 안에서 판(씨앗 k · 두 자리 짝)을 다시 뽑는다
            bs = []
            for _ in range(boot):
                bsv = []
                for k in keys:
                    L = len(pages[k]['var']['base']['M']) // 2
                    kk = RNG.integers(0, L, L)
                    idx = np.stack([2 * kk, 2 * kk + 1], 1).ravel()
                    bsv.append(seed_values(pages[k]['var'], pages[k]['dealt'], idx))
                bs.append(evaluate(pool(bsv)))
            ci = {}
            for key in E['eq']:
                xs = [b['eq'].get(key, float('nan')) for b in bs if b]
                xs = [x for x in xs if not math.isnan(x)]
                ci[key] = (float(np.percentile(xs, 5)), float(np.percentile(xs, 95))) if xs else (float('nan'),) * 2
            # 바탕 판 모습 · 대상
            meta = {s: {'target': pages[(s, tier, who)]['meta'].get('target'), 'party': pages[(s, tier, who)]['meta'].get('party'),
                        'N': pages[(s, tier, who)]['meta'].get('N'), 'me': svs[s]['me'],
                        'sec': pages[(s, tier, who)]['var']['base']['sec'], 'to': pages[(s, tier, who)]['var']['base']['to'],
                        'bad': sum(v['bad'] for v in pages[(s, tier, who)]['var'].values()),
                        'n': len(pages[(s, tier, who)]['var']['base']['M']),
                        'd20': svs[s]['dmg'].get('0.2'), 'w20': svw[s]['dmg'].get('0.2')} for s in seeds}
            # 값(메인 · 랜덤) — 첫 시드의 변형 meta 에서(시드마다 아이템 레벨이 달라 값도 다르다 — 범위로)
            vals = defaultdict(list)
            for k in keys:
                for vid, v in pages[k]['var'].items():
                    c = classify(vid)
                    if c and c[0] == 'opt':
                        vals[(c[1], c[2])].append(v['lines'][0]['v'] if v['lines'] else None)
                    if c and c[0] in ('prideB', 'pen'):
                        vals[(c[0],) + tuple(c[1:])].append(sum(l['v'] for l in v['lines']))
            # 시드마다 등가(같은 곡선이 아니라 그 시드의 곡선) — 흔들림을 보이려고
            per_seed = {s: evaluate(pool([svs[s]])) for s in seeds}
            R[(tier, who)] = {'E': E, 'Ew': Ew, 'E1': E1, 'E2': E2, 'h1': h1, 'h2': h2, 'ci': ci, 'meta': meta, 'Emage': Emage, 'mage_seeds': mage_seeds,
                              'vals': {k: [min(x for x in v if x is not None), max(x for x in v if x is not None)] for k, v in vals.items() if any(x is not None for x in v)},
                              'stat': pool(list(svs.values()))['stat'], 'per_seed': per_seed}
    return R


# ───────────── 원정 탐침 ─────────────
def load_probe():
    P = {}
    for p in sorted(OUT.glob('P_*.txt')):
        t = p.read_text(encoding='utf-8').strip()
        if not t: continue
        d = json.loads(t)
        if 'out' not in d: continue
        P[(d['meta']['seed'], d['meta']['tier'])] = d
    return P


def probe_eval(P):
    R = {}
    for tier in TIERS:
        recs = {s: d for (s, t), d in P.items() if t == tier}
        if not recs: continue
        for who in ('phys', 'mag'):
            # 변형 → 시드 → [(바탕 판, 변형 판)] 짝
            pairs = defaultdict(lambda: defaultdict(list))
            dealt = defaultdict(lambda: defaultdict(float))
            cells = defaultdict(int)
            for s, d in recs.items():
                for st in d['out']:
                    if st.get('missing') or 'rows' not in st: continue
                    base = st['rows'].get('base')
                    if not base: continue
                    cells[s] += 1
                    uid = None
                    for vid, rows in st['rows'].items():
                        if not vid.startswith(who + ':'): continue
                        for b, x in zip(base, rows):
                            if 'won' in b and 'won' in x: pairs[vid.split(':', 1)[1]][s].append((b, x))
                    # 맞는 원소 — 바탕 판에서 그 대상이 준 원소(시드 · 단 안의 대표 칸 전부를 더한다)
                    uid = (st.get('uids') or {}).get(who)
                    for b in base:
                        for ty, x in ((b.get('dealt') or {}).get(uid) or {}).items():
                            dealt[s][ty] += x
            if not pairs: continue
            mel = {s: match_el(dict(dealt[s])) for s in dealt}
            seeds = sorted({s for v in pairs.values() for s in v})

            def seed_stat(vid, s, metric):
                """그 시드의 짝(바탕 판, 변형 판) 평균 Δ — win = 승률 · sec = 둘 다 이긴 판의 처치 시간 비 − 1 · down = 전투불능 수"""
                pr = pairs[vid].get(s)
                if not pr: return float('nan')
                if metric == 'win': return float(np.mean([x['won'] - b['won'] for b, x in pr]))
                if metric == 'sec':
                    both = [(b, x) for b, x in pr if b['won'] and x['won']]
                    return float(np.mean([x['sec'] / b['sec'] - 1 for b, x in both])) if both else float('nan')
                return float(np.mean([x['downed'] - b['downed'] for b, x in pr]))

            def gstat_(vids, metric, keep=None):
                """옵션 묶음 — 원소 줄은 그 시드의 맞는 원소(없으면 셋 평균) · 나머지(발동 스킬 · 종족)는 평균 → 시드 고른 평균"""
                xs = []
                for s in seeds:
                    if keep is not None and (s <= 4) != (keep == 1): continue
                    els = [v for v in vids if v[2]]
                    use = ([v for v in els if v[2] == mel.get(s)] or els) if els else vids
                    vals = [seed_stat(v[0], s, metric) for v in use]
                    vals = [x for x in vals if not math.isnan(x)]
                    if vals: xs.append(float(np.mean(vals)))
                return float(np.mean(xs)) if xs else float('nan')

            out = {'seeds': seeds, 'cells': dict(cells), 'mel': mel, 'win': {}, 'sec': {}, 'down': {}, 'eqWin': {}, 'eqSec': {}, 'greed': {}, 'half': {}}
            xs = [0.0] + DX
            ref = lambda x: [(f'dmg{x}', None, None)]
            cw = [0.0] + [gstat_(ref(x), 'win') for x in DMG]
            cs = [0.0] + [-gstat_(ref(x), 'sec') for x in DMG]   # 처치 시간 단축 = 양수
            out['curveWin'], out['curveSec'] = cw, cs
            # 도구 검증 ② (원정) — 데미지 +20% 의 처치 시간 · 승률 변화를 판 짝 전체로(z = 평균 ÷ 표준오차)
            pr20 = [p for s in seeds for p in pairs['dmg0.2'].get(s, [])]
            ds = [x['sec'] / b['sec'] - 1 for b, x in pr20 if b['won'] and x['won']]
            dw = [x['won'] - b['won'] for b, x in pr20]
            zz = lambda a: float(np.mean(a) / (np.std(a, ddof=1) / math.sqrt(len(a)))) if len(a) > 2 and np.std(a) > 0 else float('nan')
            out['gate'] = {'n': len(pr20), 'dSec': float(np.mean(ds)) if ds else float('nan'), 'zSec': zz(ds), 'dWin': float(np.mean(dw)) if dw else float('nan'), 'zWin': zz(dw)}
            cs1 = [0.0] + [-gstat_(ref(x), 'sec', 1) for x in DMG]
            cs2 = [0.0] + [-gstat_(ref(x), 'sec', 2) for x in DMG]
            groups = defaultdict(list)
            for vid in pairs:
                c = classify(vid)
                if c and c[0] == 'opt' and c[2] == 'main': groups[c[1]].append((vid, c[3], c[4]))
            for g, vids in groups.items():
                w, sc = gstat_(vids, 'win'), gstat_(vids, 'sec')
                out['win'][g] = w; out['sec'][g] = sc
                out['down'][g] = gstat_(vids, 'down')
                out['eqWin'][g] = invert(xs, cw, w)
                out['eqSec'][g] = invert(xs, cs, -sc) if not math.isnan(sc) else float('nan')
                out['half'][g] = (invert(xs, cs1, -gstat_(vids, 'sec', 1)), invert(xs, cs2, -gstat_(vids, 'sec', 2)))
                out.setdefault('subs', {})[g] = {sub: (gstat_([(v, sub, el)], 'win'), gstat_([(v, sub, el)], 'sec')) for v, sub, el in vids}
            # 탐욕 — 합의 비율(변형 Σ / 바탕 Σ − 1) · 시드 앞 / 뒤 절반
            for g in ('greed1', 'greed2', 'greed3'):
                vids = [v for v in pairs if v.startswith(g + ':') and v.endswith(':main')]
                if not vids: continue
                vid = vids[0]
                def ratio(field, keep=None):
                    sb = sx = 0
                    for s in seeds:
                        if keep is not None and (s <= 4) != (keep == 1): continue
                        for b, x in pairs[vid].get(s, []):
                            sb += b.get(field, 0); sx += x.get(field, 0)
                    return sx / sb - 1 if sb else float('nan')
                out['greed'][g] = {f: (ratio(f), ratio(f, 1), ratio(f, 2)) for f in ('gold', 'xp', 'xpT', 'nd', 'rare')}
                out['greed'][g]['n'] = sum(len(pairs[vid].get(s, [])) for s in seeds)
            R[(tier, who)] = out
    return R


# ───────────── 표 ─────────────
def f1(x, sign=True):
    if x is None or (isinstance(x, float) and math.isnan(x)): return '—'
    return f'{x:+.1f}' if sign else f'{x:.1f}'


def opt_label(gkey, stat):
    cell = gkey.split(':')[0]
    sin, num = cell[:-1], cell[-1]
    return f'{SIN_KO.get(sin, sin)} {"①②③"[int(num) - 1]} {STAT_KO.get(stat, stat)}'


def main():
    pages = load_arena()
    A = arena_eval(pages)
    probes = load_probe()
    PR = probe_eval(probes)
    lines = []
    W = lines.append
    dump = {'arena': {}, 'probe': {}}
    for who, title in (('phys', '표 1 물리 무기'), ('mag', '표 2 마법 무기')):
        W(f'\n## {title} — 결투장 등가 데미지 % (메인 줄 가운데 · 괄호 = 랜덤 줄)\n')
        W('| 옵션 | 세 단 평균 | 노말 | 나이트메어 | 헬 | 배수 | 앞 / 뒤 절반 | 판정 |')
        W('|---|---|---|---|---|---|---|---|')
        keys = []
        for tier in TIERS:
            r = A.get((tier, who))
            if r:
                for k in r['E']['eq']:
                    if k[1] == 'main' and k[0] not in keys: keys.append(k[0])
        order = lambda g: (['wrath', 'sloth', 'lust', 'envy', 'pride', 'gluttony', 'greed'].index(''.join(c for c in g.split(':')[0] if not c.isdigit())), g)
        for g in sorted(keys, key=order):
            stat = None
            cells, rats, h1s, h2s = [], [], [], []
            mains, rands = [], []
            for tier in TIERS:
                r = A.get((tier, who))
                if not r: cells.append('—'); continue
                stat = stat or r['stat'].get((g, 'main'))
                m = r['E']['eq'].get((g, 'main')); rr = r['E']['eq'].get((g, 'random'))
                cells.append(f'{f1(m)} ({f1(rr)})' if rr is not None else f1(m))
                mains.append(m); rands.append(rr)
                rats.append(r['E']['ratio'].get((g, 'main')))
                if r['E1']: h1s.append(r['E1']['ratio'].get((g, 'main')))
                if r['E2']: h2s.append(r['E2']['ratio'].get((g, 'main')))
            ratio = nanmean(rats)
            excl = g.startswith(EXCLUDE_MEDIAN)
            c = cat(ratio)
            c1, c2 = cat(nanmean(h1s)), cat(nanmean(h2s))
            verdict = c if direction(c1) == direction(c2) == direction(c) else ('갈림' if c != '못 잼' else c)
            if g.startswith('pride'): verdict = f'{verdict} (목표 강함)'
            if excl and not g.startswith('pride'): verdict = '— (중앙값 밖)'
            rmean = nanmean(rands)
            W(f'| {opt_label(g, stat)} | {f1(nanmean(mains))} ({f1(rmean)}) | ' + ' | '.join(cells) + f' | ×{ratio:.2f} | {c1} / {c2} | {verdict} |')
            dump['arena'].setdefault(who, {})[g] = {'stat': stat, 'mean': nanmean(mains), 'rmean': rmean, 'tiers': dict(zip(TIERS, cells)), 'ratio': ratio, 'h': (c1, c2), 'verdict': verdict}
        med = [A[(t, who)]['E']['median'] if (t, who) in A else float('nan') for t in TIERS]
        W(f'| 중앙값(판정 기준) | {f1(nanmean(med))} | ' + ' | '.join(f1(m) for m in med) + ' | ×1 | | |')
        if who == 'mag':
            W('\n마법사만(사제 시드 제외) — 원소 줄 · 전체 중앙값:')
            for tier in TIERS:
                r = A.get((tier, who))
                if not r or not r['Emage']: continue
                Em = r['Emage']
                el = ' · '.join(f'{opt_label(g, r["stat"].get((g, "main")))} {f1(Em["eq"].get((g, "main")))} (셋 평균 {f1(Em["eqEl"].get((g, "main")))})'
                                for g in ('lust2', 'envy1') if (g, 'main') in Em['eq'])
                W(f'- {TKO[tier]} 시드 {r["mage_seeds"]} — {el} · 중앙값 {f1(Em["median"])} · 관통 합(맞는 원소) {f1(Em["pen"].get("pen:match"))}')
        for tier in TIERS:
            r = A.get((tier, who))
            if not r: continue
            W(f'\n- {TKO[tier]} 「무기 데미지 +10%」(베이스 줄 참고) = 데미지 {f1(r["E"]["wbase"])}% · 곡선(남은 HP 차이 +2/5/10/20%) = ' + ' / '.join(f'{y:+.4f}' for y in r['E']['curve'][1:])
              + ' · 시드 ' + ', '.join(f'{s}:{m["target"]["cls"] if m["target"] else "-"}' for s, m in r['meta'].items()))
    # 표 3 오만
    W('\n## 표 3 오만 두 판 — 결투장 등가 데미지 %\n')
    W('| 무기 · 단 | 영웅 Lv | ⓐ 최대 · 최소(값) | ⓑ n=10% | n=25% | n=50% | 목표(중앙값 ×1.3 ~ 1.6) | ⓑ 최대 n | ⓑ 최소 n |')
    W('|---|---|---|---|---|---|---|---|---|')
    for who in ('phys', 'mag'):
        for tier in TIERS:
            r = A.get((tier, who))
            if not r: continue
            E = r['E']
            lv = sorted({m['target']['lv'] for m in r['meta'].values() if m['target']})
            amax = E['eq'].get(('pride1:dmg_max_per_level', 'main')); amin = E['eq'].get(('pride1:dmg_min_per_level', 'main'))
            vmax = r['vals'].get(('pride1:dmg_max_per_level', 'main')); vmin = r['vals'].get(('pride1:dmg_min_per_level', 'main'))
            b = {(st, n): E['prideB'].get((st, n)) for st in ('max', 'min') for n in ('0.1', '0.25', '0.5')}
            tlo, thi = 1.3 * E['median'], 1.6 * E['median']
            def nfor(st, target):
                ys = [0.0] + [b[(st, n)] if b[(st, n)] is not None else float('nan') for n in ('0.1', '0.25', '0.5')]
                if any(math.isnan(y) for y in ys): return float('nan')
                return invert([0.0, 10.0, 25.0, 50.0], ys, target)
            W(f'| {"물리" if who == "phys" else "마법"} · {TKO[tier]} | {lv[0] if len(lv) == 1 else f"{lv[0]}~{lv[-1]}"} | {f1(amax)} · {f1(amin)} (×Lv {vmax} · {vmin}) | '
              f'{f1(b[("max", "0.1")])} · {f1(b[("min", "0.1")])} | {f1(b[("max", "0.25")])} · {f1(b[("min", "0.25")])} | {f1(b[("max", "0.5")])} · {f1(b[("min", "0.5")])} | '
              f'{f1(tlo)} ~ {f1(thi)} | {f1(nfor("max", tlo), False)} ~ {f1(nfor("max", thi), False)}% | {f1(nfor("min", tlo), False)} ~ {f1(nfor("min", thi), False)}% |')
            dump.setdefault('pride', {})[f'{who}:{tier}'] = {'lv': lv, 'a': (amax, amin), 'vals': (vmax, vmin), 'b': {f'{k[0]}:{k[1]}': x for k, x in b.items()},
                                                             'target': (tlo, thi), 'nmax': (nfor('max', tlo), nfor('max', thi)), 'nmin': (nfor('min', tlo), nfor('min', thi)),
                                                             'bflat': {f'{k[0]}:{k[1]}': v for k, v in r['vals'].items() if k[0] == 'prideB'}}
    # 표 5 관통 합
    W('\n## 표 5 관통 합 — 한 영웅에 몰았을 때 (결투장)\n')
    W('| 무기 · 단 | 합 (값) | 등가 데미지 % | 승률 변화(점) |')
    W('|---|---|---|---|')
    for who in ('phys', 'mag'):
        for tier in TIERS:
            r = A.get((tier, who))
            if not r: continue
            names = ['pen', 'pen+xbow'] if who == 'phys' else ['pen:match']
            for nm in names:
                eq = r['E']['pen'].get(nm)
                ww = r['Ew']['pen'].get(nm) if r['Ew'] else None
                # 승률 변화 = Δ승률(시드 평균) — Ew 는 등가 곡선이라 원값은 pool 에서
                dw = pool([seed_values(pages[(s, tier, who)]['var'], pages[(s, tier, who)]['dealt'], kmetric='W') for s in r['meta']])['pen'].get(nm)
                key = ('pen', f'{who}:{nm}') if nm != 'pen:match' else None
                tot = r['vals'].get(('pen', f'{who}:{nm}'))
                if nm == 'pen:match':
                    tot = r['vals'].get(('pen', f'{who}:pen:fire'))
                W(f'| {"물리" if who == "phys" else "마법"} · {TKO[tier]} {"+ 석궁 특성" if nm == "pen+xbow" else ""} | {tot[0]:.3f} ~ {tot[1]:.3f} | {f1(eq)} | {f1(dw * 100 if dw is not None else None)} |' if tot else
                  f'| {"물리" if who == "phys" else "마법"} · {TKO[tier]} | — | {f1(eq)} | {f1(dw * 100 if dw is not None else None)} |')
    # 원정 보조
    W('\n## 원정 도구 검증 ② — 데미지 +20% (판 짝 전체)\n')
    for (tier, who), o in PR.items():
        g = o.get('gate', {})
        W(f'- {TKO[tier]} {who}: 짝 {g.get("n")} · 처치 시간 {g.get("dSec", float("nan")) * 100:+.1f}% (z {g.get("zSec", float("nan")):.1f}) · 승률 {g.get("dWin", float("nan")) * 100:+.1f}점 (z {g.get("zWin", float("nan")):.1f}) · 칸 {sum(o["cells"].values())} · 맞는 원소 {o.get("mel")}')
    W('\n## 원정 탐침(보조) — 등가 데미지 % (처치 시간 곡선 · 승률 곡선)\n')
    W('| 무기 · 옵션 | 노말 | 나이트메어 | 헬 |')
    W('|---|---|---|---|')
    for who in ('phys', 'mag'):
        gs = []
        for tier in TIERS:
            for g in (PR.get((tier, who)) or {}).get('eqSec', {}):
                if g not in gs: gs.append(g)
        for g in gs:
            cells = []
            for tier in TIERS:
                o = PR.get((tier, who))
                if not o or g not in o['eqSec']: cells.append('—'); continue
                cells.append(f'{f1(o["eqSec"][g])} / {f1(o["eqWin"][g])}')
            W(f'| {"물리" if who == "phys" else "마법"} {g} | ' + ' | '.join(cells) + ' |')
    # 표 4 탐욕
    W('\n## 표 4 탐욕 — 원정 탐침 변화 % (Σ변형 / Σ바탕 − 1 · 앞 / 뒤 절반)\n')
    W('| 대상 · 단 | 줄 | 골드 | 경험치(파티) | 경험치(본인) | 드롭 수 | 레어 이상 | 판 수 |')
    W('|---|---|---|---|---|---|---|---|')
    for who in ('phys', 'mag'):
        for tier in TIERS:
            o = PR.get((tier, who))
            if not o: continue
            for g, x in o['greed'].items():
                fm = lambda t: f'{t[0] * 100:+.1f} ({t[1] * 100:+.1f} / {t[2] * 100:+.1f})' if not math.isnan(t[0]) else '—'
                W(f'| {"물리" if who == "phys" else "마법"} · {TKO[tier]} | {g} | {fm(x["gold"])} | {fm(x["xp"])} | {fm(x["xpT"])} | {fm(x["nd"])} | {fm(x["rare"])} | {x["n"]} |')
    (OUT / 'analysis.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')

    def clean(o):
        if isinstance(o, dict): return {('|'.join(map(str, k)) if isinstance(k, tuple) else str(k)): clean(v) for k, v in o.items()}
        if isinstance(o, (list, tuple)): return [clean(v) for v in o]
        if isinstance(o, float) and math.isnan(o): return None
        if isinstance(o, (np.floating,)): return float(o)
        return o
    full = {'arena': {f'{t}:{w}': {k: v for k, v in r.items() if k != 'per_seed'} for (t, w), r in A.items()},
            'arena_per_seed': {f'{t}:{w}': {s: (e['eq'] if e else None) for s, e in r['per_seed'].items()} for (t, w), r in A.items()},
            'probe': {f'{t}:{w}': r for (t, w), r in PR.items()}, 'table': dump}
    (OUT / 'eval.json').write_text(json.dumps(clean(full), ensure_ascii=False, indent=1), encoding='utf-8')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
