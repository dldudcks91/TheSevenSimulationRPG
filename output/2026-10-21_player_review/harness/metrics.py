def metrics(EV, RUNS, end=60.0):
    out = {}
    for lo, hi, k in [(0, 10, 'w0_10'), (0, 60, 'w0_60'), (10, 60, 'w10_60')]:
        rs = [r for r in RUNS if lo < r['min'] <= hi + 0.01]
        out[k] = {'runs': len(rs), 'won': sum(r['won'] for r in rs), 'lost': sum(not r['won'] for r in rs),
                  'wipes': sum(r.get('reason') == 'wipe' for r in rs)}
    # losing streaks
    best = (0, None, None); cur = 0; start = None
    for r in RUNS:
        if r['won']:
            cur = 0; start = None
        else:
            if cur == 0: start = r['min']
            cur += 1
            if cur > best[0]: best = (cur, start, r['min'])
    out['longest_losing_streak'] = {'runs': best[0], 'from_min': best[1], 'to_min': best[2]}
    # per stage tries before clear
    tries = {}
    for r in RUNS:
        tries.setdefault(r['stage'], []).append(r['won'])
    out['stage_tries'] = {str(k): {'runs': len(v), 'losses_before_first_win': (v.index(True) if True in v else len(v)), 'cleared': True in v} for k, v in tries.items()}
    # stall: time between consecutive first clears
    clears = [(e['min'], e['extra']) for e in EV if e['event'] == 'clear']
    gaps = []; prev = 0
    for m, c in clears:
        gaps.append((round(m - prev, 2), c)); prev = m
    gaps.append((round(end - prev, 2), 'open (no clear yet at end)'))
    out['minutes_between_clears'] = gaps
    out['longest_no_clear_min'] = max(gaps)
    # longest gap with no event at all (any first-time / progress event)
    ts = sorted([0.0] + [e['min'] for e in EV] + [end])
    g = max((round(b - a, 2), a, b) for a, b in zip(ts, ts[1:]))
    out['longest_no_event_gap'] = {'min': g[0], 'from': g[1], 'to': g[2]}
    # game-driven events only (clear / level / drop-driven) — excludes player-initiated
    ts2 = sorted([0.0] + [e['min'] for e in EV if e['event'] in ('clear', 'level')] + [end])
    g2 = max((round(b - a, 2), a, b) for a, b in zip(ts2, ts2[1:]))
    out['longest_no_clear_or_levelup_gap'] = {'min': g2[0], 'from': g2[1], 'to': g2[2]}
    return out
