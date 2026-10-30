"""Compare matched D10/D60 accounts, with no empirical wall-time multiplier."""
import json
import statistics as stats
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
ROOT = BASE.parents[1]
NEW = BASE / 'simulation/pilot'
OLD = ROOT / 'output/2026-10-30_fun_qa/simulation'
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


def med(q, key):
    return q[key]['median']


def counter(q, key):
    return q['count'][key]['median']


lines = ['# 초반 D10·D60 재검증 분석', '',
         f"고정한 최신 소스로 기본20·대응20·무관리10, 총50조건에서 완료 원정 {summary['completedExpeditions']:,}회를 실행했다. 과거03:07 사본의 같은 시드·정책50조건과 비교한다.", '',
         '50조건은20개 시작 시드를 여러 정책으로 공유한다. 50개의 독립 난수 표본이 아니다. 첫1011 승리는 기본20/20이며 대응20/20·무관리10/10에서도 일치했다.', '',
         '10분 레벨과 초반 잔액은 개선됐고, 첫 무기교체가 막힌 증거도 없다. 60분 첫장 완료는 관리정책별9/20에서10/20으로 소폭 늘었다. 기본정책 시드11에는28.25분의 전투보상 공백이 남아 있어 초반 개선을 정체 해소로 확대해석하지 않는다.', '',
         '각 값은 중앙값이다. 이 표의 영웅 레벨은 조건별3명을 모두 합친 분포이며, 나머지는 계정 분포다. 별도로 파티별 중간 레벨을 먼저 구한 뒤 계정 사이 중앙값을 구하면 최신60분 기본11.5·대응12.5·무관리8이다. 두 계산을 섞지 않는다.', '',
         '| 정책·시점 | 레벨 전→후 | 클리어 칸 전→후 | 드롭 전→후 | 장착 변경 전→후 | 잔액G 전→후 | 1장 완료 전→후 |',
         '|---|---:|---:|---:|---:|---:|---:|']
labels = {'basic': '기본', 'adaptive': '대응', 'passive': '무관리'}
for policy in POLICIES:
    for mark in MARKS:
        n, o = summary['new'][policy][mark], summary['baseline'][policy][mark]
        lines.append(f"| {labels[policy]}·{mark//60}분 | {med(o,'heroLevel'):g}→{med(n,'heroLevel'):g} | {med(o,'clears'):g}→{med(n,'clears'):g} | {counter(o,'drops'):g}→{counter(n,'drops'):g} | {counter(o,'equipMoves'):g}→{counter(n,'equipMoves'):g} | {med(o,'gold'):g}→{med(n,'gold'):g} | {o['chapter1Cleared']}/{o['n']}→{n['chapter1Cleared']}/{n['n']} |")
lines += ['', '## 같은 시드 비교', '']
for policy in POLICIES:
    q = summary['matchedChanges'][policy][3600]
    n = summary['new'][policy][3600]
    lines.append(f"- {labels[policy]}60분: 클리어 칸 증가/동일/감소 {q['clearsAhead']}/{q['clearsSame']}/{q['clearsBehind']}. 같은 시드 차이의 중앙값 {q['deltas']['clearsDelta']['median']:g}칸. 첫1011 완료 시도 {n['stage1011FirstAttempt']['completed']}개 중 승리 {n['stage1011FirstAttempt']['wins']}개.")
lines += ['', '## 초반 보상·선택', '']
for policy in POLICIES:
    a, b = summary['new'][policy][600], summary['new'][policy][3600]
    lines.append(f"- {labels[policy]}: 첫XP 중앙 {a['first']['xp']['median']:g}초, 첫드롭 중앙 {a['first']['drop']['median']:g}초, 10분 클리어 {a['clears']['min']:g}~{a['clears']['max']:g}칸. 60분 도안 종류 중앙 {b['blueprintKinds']['median']:g}개, 책 학습기능 열림 {b['bookLearningOpenAccounts']}/{b['n']}, 실제 제작가능 책 보유조건 {b['craftableBookAccounts']}/{b['n']}. 가방 초과 버림 합계 {sum(checkpoint(r,3600)['count']['overflow'] for k,r in new.items() if k[0]==policy)}개.")
lines += ['', '## 정체 사례', '']
for policy in POLICIES:
    q = summary['new'][policy][3600]
    for a in q['worstNewClearGap']:
        lines.append(f"- {labels[policy]} 시드{a['seed']}: 60분 현재 {a['stage']}, Lv{'/'.join(map(str,a['levels']))}, {a['gold']:,}G, 새칸 최대공백 {a['gaps']['newClear']['seconds']/60:.2f}분, 보상 최대공백 {a['gaps']['reward']['seconds']/60:.2f}분, 최근 {a['recentTen']['runs']}전 {a['recentTen']['wins']}승, 첫장완료 {a['chapter1Cleared']}.")
lines += ['', '## 시작 무기 유지와 드롭 사용', '',
          '새 게임은 아이템 카운터0에서 영웅마다 무기→갑옷을 순서대로 등록하므로 i1·i3·i5가 시작무기다. 아래는 현재 장착 무기가 이 세 UID에 속하는 칸의 수다. 장비의 모든 옵션 가치를 평가한 수치는 아니다.', '',
          '| 정책·시점 | 시작무기 착용 칸 전→후 | 세 무기 모두 유지 계정 전→후 | 드롭 중 실제 착용 경험 비율 중앙 전→후 | 첫 전투세기 개선 관찰 전→후 |',
          '|---|---:|---:|---:|---:|']
for policy in POLICIES:
    for mark in MARKS:
        n, o = summary['new'][policy][mark], summary['baseline'][policy][mark]
        a, b = o['gearUse'], n['gearUse']
        lines.append(f"| {labels[policy]}·{mark//60}분 | {a['starterWeaponSlots']}/{a['totalWeaponSlots']}→{b['starterWeaponSlots']}/{b['totalWeaponSlots']} | {a['allThreeStarterWeaponsAccounts']}/{o['n']}→{b['allThreeStarterWeaponsAccounts']}/{n['n']} | {100*a['dropEquippedRatioPerAccount']['median']:.1f}%→{100*b['dropEquippedRatioPerAccount']['median']:.1f}% | {a['firstEquipmentGainObservedAccounts']}/{o['n']}→{b['firstEquipmentGainObservedAccounts']}/{n['n']} |")
lines += ['', '첫 전투세기 개선은 자동 장착의 DPS×버티는 양 대리점수가 증가한 사건이다. 이번 결과에서는 시작무기 유지가 오히려 줄었고, 10분까지 전투세기 개선을 경험한 관리계정은17/20에서20/20으로 늘었다. 시작무기 강화 때문에 초반교체가 막혔다는 증거는 없다. 특정 입력 하나의 인과효과는 이 버전비교로 분리하지 않았다. 첫장 무기상자를 여는 것과 실제 교체·개선은 다른 사건이다.']
lines += ['', '## 해석 범위', '',
          '시간은 첫 출정 뒤 가상 온라인 경과이며 프롤로그·읽기·클릭 시간은 제외한다. 실제×1 전투 박자와 라운드 간950ms·재출정5초를 반영했고 옛경험 배수×1.04/×1.55를 더하지 않았다. 10분·60분 체크포인트는 해당 순간 관리 직전이다.', '',
          '기본은 CSV 순서 마스터리라는 약한 대리정책이다. 대응도 전투우선 투자와 직전칸10회 파밍을 묶은 비최적 정책이다. 두 정책 모두 책·고용·전직·탐험 등을 사용하지 않으므로 새 스킬 미학습을 기능 부족으로 단정하지 않는다. 이전 시드10 정체에서 정상 무료 재배분·장소 반복으로 약33분에 회복한 별도 실험도 함께 읽어야 한다.', '',
          '최신 사본과의 차이는 시작무기·첫장상자·초반골드 외 변경을 포함한 버전차이다. 특정 조정 하나의 인과효과나 실제 유저 평균·재미·이탈률로 일반화하지 않는다.', '',
          '원시 분포·동일시드 차이·건물랭크·최악사례는 [summary.json](summary.json)에 저장했다.']
(HERE / 'FINDINGS.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')
print(json.dumps({'accounts': summary['accounts'], 'runs': summary['completedExpeditions'],
                  'D60': {p: {k: summary['new'][p][3600][k] for k in ('heroLevel', 'clears', 'chapter1Cleared')}
                          for p in POLICIES}}, ensure_ascii=True))
