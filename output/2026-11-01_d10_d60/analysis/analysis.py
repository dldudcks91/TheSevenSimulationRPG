"""Compare matched D10/D60 accounts, with no empirical wall-time multiplier."""
import json
import statistics as stats
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
ROOT = BASE.parents[1]
NEW = BASE / 'simulation/pilot'
OLD = ROOT / 'output/2026-10-30_early_d10_d60/simulation/pilot'
MARKS = (600, 3600)
POLICIES = ('basic', 'adaptive', 'passive')


def read(p):
    return json.loads(p.read_text(encoding='utf-8'))


def describe(values):
    xs = sorted(v for v in values if v is not None)
    if not xs:
        return {'n': 0}
    return {'n': len(xs), 'min': round(xs[0], 3),
            'median': round(stats.median(xs), 3), 'max': round(xs[-1], 3),
            'mean': round(stats.mean(xs), 3)}


def rows(folder):
    return {(r['policy'], r['seed']): r
            for r in (read(p) for p in folder.glob('*_seed*.json'))}


def checkpoint(r, mark):
    return next(c for c in r['checkpoints'] if c['seconds'] == mark)


def score(c):
    return len(c['cleared']) + sum(len(v) for v in c['clearedIn'].values())


def gap(times, end):
    xs = sorted({0, end, *(x for x in times if 0 < x <= end)})
    a, b = max(zip(xs, xs[1:]), key=lambda p: p[1] - p[0])
    return {'seconds': round(b-a, 3), 'from': a, 'to': b}


def gaps(r, mark):
    return {'newClear': gap([x['t'] for x in r['clears']], mark),
            'reward': gap([x['t'] for x in r['rounds']
                           if x['actualXp'] > 0 or x['gold'] > 0
                           or x['drops'] > 0 or x['blueprints'] > 0], mark)}


def cleared_ch1(c):
    return 1051 in c['cleared'] or 1051 in c['clearedIn'].get('normal', [])


def account(r, mark):
    c = checkpoint(r, mark)
    return {'policy': r['policy'], 'seed': r['seed'], 'stage': c['stage'],
            'levels': c['levels'], 'clears': score(c), 'gold': c['gold'],
            'chapter1Cleared': cleared_ch1(c), 'gaps': gaps(r, mark),
            'recentTen': c['recentTen'], 'guide': c['unused']['guide'],
            'buildings': c['buildings'],
            'craftableBooks': [b['id'] for b in c['unused']['craftableBooks']],
            'blueprintKinds': len(c['blueprints']),
            'unspentMastery': sum(h['points'] for h in c['mastery'])}


def summarize(rs, mark):
    cs = [checkpoint(r, mark) for r in rs]
    count_keys = ['runs', 'wins', 'losses', 'drops', 'equipMoves', 'mightImprovements',
                  'masterySpent', 'boxesGranted', 'boxesOpened', 'buildGold', 'battleGold',
                  'potionBuyGold', 'upgradeGold', 'overflow', 'guideResponses']
    result = {'n': len(rs), 'heroLevel': describe(v for c in cs for v in c['levels']),
              'partyMedianLevel': describe(stats.median(c['levels']) for c in cs),
              'clears': describe(score(c) for c in cs),
              'gold': describe(c['gold'] for c in cs),
              'chapter1Cleared': sum(cleared_ch1(c) for c in cs),
              'count': {k: describe(c['count'][k] for c in cs) for k in count_keys},
              'maxGapSeconds': {kind: describe(gaps(r, mark)[kind]['seconds'] for r in rs)
                                for kind in ('newClear', 'reward')},
              'first': {},
              'blueprintKinds': describe(len(c['blueprints']) for c in cs),
              'gearUse': {
                  'starterWeaponSlots': sum(w['uid'] in ('i1', 'i3', 'i5') for c in cs for w in c['gear']['weapons']),
                  'totalWeaponSlots': sum(len(c['gear']['weapons']) for c in cs),
                  'allThreeStarterWeaponsAccounts': sum(all(w['uid'] in ('i1', 'i3', 'i5') for w in c['gear']['weapons']) for c in cs),
                  'dropEquippedRatioPerAccount': describe(c['dropEquippedRatio'] for c in cs),
                  'dropsEverEquipped': sum(c['usefulDroppedItems'] for c in cs),
                  'totalDrops': sum(c['count']['drops'] for c in cs),
                  'firstEquipmentGainObservedAccounts': sum('equipmentGain' in c['first'] for c in cs),
                  'firstEquipmentGainSeconds': describe(c['first'].get('equipmentGain', {}).get('t') for c in cs),
                  'firstBoxOpenedAccounts': sum('boxOpened' in c['first'] for c in cs)},
              'bookLearningOpenAccounts': sum(c['unused']['bookStateOpen'] for c in cs),
              'craftableBookAccounts': sum(bool(c['unused']['craftableBooks']) for c in cs),
              'waitingHeroesAccounts': sum(c['unused']['waitingHeroes'] > 0 for c in cs),
              'unspentMastery': describe(sum(h['points'] for h in c['mastery']) for c in cs),
              'buildingRanks': {bid: {str(rank): sum(c['buildings'].get(bid, 0) == rank for c in cs)
                                      for rank in sorted({c['buildings'].get(bid, 0) for c in cs})}
                                for bid in ('shop', 'resource', 'library', 'tavern', 'forge', 'command', 'explore')},
              'accounts': [account(r, mark) for r in rs]}
    for kind in ('xp', 'drop', 'stageClear', 'boxGranted', 'equipmentGain', 'retryGuide'):
        result['first'][kind] = describe(c['first'].get(kind, {}).get('t') for c in cs)
    attempts = [next((x for x in r['runs'] if x['stage'] == 1011 and x['t'] <= mark), None) for r in rs]
    result['stage1011FirstAttempt'] = {'completed': sum(x is not None for x in attempts),
                                       'wins': sum(bool(x and x['won']) for x in attempts)}
    result['worstNewClearGap'] = sorted(result['accounts'], key=lambda a: a['gaps']['newClear']['seconds'], reverse=True)[:3]
    result['worstRewardGap'] = sorted(result['accounts'], key=lambda a: a['gaps']['reward']['seconds'], reverse=True)[:3]
    return result


new, old = rows(NEW), rows(OLD)
assert len(new) == 50, len(new)
assert set(new) == set(old), (set(new)-set(old), set(old)-set(new))
summary = {'accounts': len(new), 'completedExpeditions': sum(r['count']['runs'] for r in new.values()),
           'new': {}, 'baseline': {}, 'matchedChanges': {},
           'notes': ['Virtual online elapsed since first departure; excludes prologue and reading/click latency.',
                     'Actual paceOf(1)/paceStep; Focus Off, 950ms round gap, 5sec restart. No x1.04/x1.55 scaling.',
                     'Management every300sec, lab settlement every60sec; marks before exact-mark management.',
                     'basic is weak CSV-first mastery proxy; adaptive is combat-priority plus nonoptimal prior-stage10run response.',
                     'Neither policy hires, learns/crafts books, advances, explores, rerolls tactics or buys higher potions.',
                     'Matched version changes reflect all changed code/data, not one isolated starter/gold/box input.']}
for policy in POLICIES:
    keys = sorted(k for k in new if k[0] == policy)
    summary['new'][policy] = {}; summary['baseline'][policy] = {}; summary['matchedChanges'][policy] = {}
    for mark in MARKS:
        summary['new'][policy][mark] = summarize([new[k] for k in keys], mark)
        summary['baseline'][policy][mark] = summarize([old[k] for k in keys], mark)
        pairs = []
        for key in keys:
            n, o = checkpoint(new[key], mark), checkpoint(old[key], mark)
            pairs.append({'seed': key[1], 'clearsDelta': score(n)-score(o),
                          'meanLevelDelta': stats.mean(n['levels'])-stats.mean(o['levels']),
                          'dropsDelta': n['count']['drops']-o['count']['drops'],
                          'goldDelta': n['gold']-o['gold'],
                          'equipMovesDelta': n['count']['equipMoves']-o['count']['equipMoves'],
                          'ch1Before': cleared_ch1(o), 'ch1After': cleared_ch1(n),
                          'sameClasses': n['classes'] == o['classes']})
        summary['matchedChanges'][policy][mark] = {
            'n': len(pairs), 'clearsAhead': sum(p['clearsDelta'] > 0 for p in pairs),
            'clearsSame': sum(p['clearsDelta'] == 0 for p in pairs),
            'clearsBehind': sum(p['clearsDelta'] < 0 for p in pairs),
            'deltas': {k: describe(p[k] for p in pairs) for k in ('clearsDelta', 'meanLevelDelta', 'dropsDelta', 'goldDelta', 'equipMovesDelta')},
            'pairs': pairs}

(HERE / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')


print(json.dumps({'accounts': summary['accounts'], 'runs': summary['completedExpeditions'],
                  'D60': {p: {k: summary['new'][p][3600][k] for k in ('heroLevel', 'clears', 'chapter1Cleared')}
                          for p in POLICIES}}, ensure_ascii=True))
