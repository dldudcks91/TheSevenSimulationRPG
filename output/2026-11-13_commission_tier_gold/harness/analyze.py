"""out/<tag>_*.txt 를 모아 장(측정점)마다 등급 배수를 낸다.
배수 = 1 + (옮겨 가서 채우는 시간 ÷ 앞 칸에서 채우는 시간) — 앞 칸이 대상이면 옮길 일이 없어 0.
  시간 기준: 옮긴 시간 = N / k_p · 앞 칸 = N / k_f → 비 = k_f / k_p (N 은 지워진다)
  골드 기준: 옮긴 동안 덜 번 골드 ÷ 카드 기본 골드(= 앞 칸에서 채우는 시간만큼의 골드) = (k_f / k_p) · (1 - g_p / g_f)
일반 = 어디서든(앞 칸에서 찬다) · 매직 = 한 장(그 장의 가장 빠른 장소) 또는 한 종족(그 종족 장소 중 가장 빠른 곳) · 레어 = 한 장소
대상은 갈 수 있는 것 중 고르게 굴린다고 본다.
python analyze.py <tag>"""
import glob, json, statistics as st, sys
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent / 'out'
tag = sys.argv[1]
rows = []
for f in sorted(glob.glob(str(OUT / f'{tag}_*.txt'))):
    t = Path(f).read_text(encoding='utf-8').strip()
    if t:
        rows += json.loads(t)['rows']
rows.sort(key=lambda r: r['seed'])
print('seeds', len(rows), 'stuck', sum(1 for r in rows if r.get('stuck')))

def rate(x, key):
    return x[key] / x['sec'] if x['sec'] > 0 else 0.0

def card_mults(cp, key):
    w = cp['window']['acc']
    kf, gf = rate(w, key), rate(w, 'gold')
    if kf <= 0:
        return None
    pl = [p for p in cp['places'] if p['sec'] > 0 and not p.get('err')]
    front = next((p for p in pl if p['front']), None)
    def cost(group, mode):
        # 그 묶음 중 앞 칸이 있으면 0 · 아니면 가장 싼 곳
        if any(p['front'] for p in group):
            return 0.0
        best = None
        for p in group:
            kp = rate(p, key)
            if kp <= 0:
                continue
            c = kf / kp if mode == 'time' else (kf / kp) * max(0.0, 1 - (rate(p, 'gold') / gf if gf > 0 else 0))
            best = c if best is None else min(best, c)
        return best  # None = 그 대상으로는 못 채운다(그 장소에서 0)
    out = {}
    for mode in ('time', 'gold'):
        place = [cost([p], mode) for p in pl]
        chs = sorted({p['ch'] for p in pl})
        chap = [cost([p for p in pl if p['ch'] == c], mode) for c in chs]
        races = sorted({p['race'] for p in pl})
        race = [cost([p for p in pl if p['race'] == r], mode) for r in races]
        ok = lambda xs: [x for x in xs if x is not None]
        out[mode] = {
            'rare': 1 + st.mean(ok(place)) if ok(place) else None,
            'magic_ch': 1 + st.mean(ok(chap)) if ok(chap) else None,
            'magic_race': 1 + st.mean(ok(race)) if ok(race) else None,
            'none_place': sum(1 for x in place if x is None),
        }
    out['kf_min'] = kf * 60
    out['gf_min'] = gf * 60
    old = [rate(p, key) * 60 for p in pl if not p['front']]
    out['kp_min_med'] = st.median(old) if old else None
    out['front_kp_min'] = rate(front, key) * 60 if front else None
    return out

def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs), 2) if xs else None

for key, label in (('kills', '처치(분노)'), ('elite', '정예(시기)')):
    print(f'\n== {label} ==')
    print('장 | 시드 | 앞칸 분당 | 옛 장소 분당(중앙) | 시간: 매직(장) 매직(종족) 레어 | 골드: 매직(장) 매직(종족) 레어 | 앞/뒤 절반 레어(시간)')
    for X in range(1, 6):
        res = []
        for r in rows:
            cp = next((c for c in r['cps'] if c['X'] == X), None)
            if not cp:
                continue
            m = card_mults(cp, key)
            if m:
                res.append((r['seed'], m))
        if not res:
            print(X, '| 없음'); continue
        half = len(rows) // 2
        first = [m for s, m in res if s <= rows[half - 1]['seed']] if half else []
        second = [m for s, m in res if s > rows[half - 1]['seed']] if half else []
        g = lambda ms, mode, k: med([m[mode][k] for m in ms])
        print(f"{X} | {len(res)} | {med([m['kf_min'] for _, m in res])} | {med([m['kp_min_med'] for _, m in res])} | "
              f"{g([m for _, m in res], 'time', 'magic_ch')} {g([m for _, m in res], 'time', 'magic_race')} {g([m for _, m in res], 'time', 'rare')} | "
              f"{g([m for _, m in res], 'gold', 'magic_ch')} {g([m for _, m in res], 'gold', 'magic_race')} {g([m for _, m in res], 'gold', 'rare')} | "
              f"{g(first, 'time', 'rare')} / {g(second, 'time', 'rare')}")
print('\n도착 레벨 · 시각(분) 중앙:', {X: (med([c['lv'] for r in rows for c in r['cps'] if c['X'] == X]), med([c['t'] / 60 for r in rows for c in r['cps'] if c['X'] == X])) for X in range(1, 6)})
