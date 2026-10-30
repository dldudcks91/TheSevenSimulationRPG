"""Count explicitly inactive affixes in newly observed frozen-baseline loot."""
import csv
import json
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent
QA = OUT.parent
INERT = {'proc_cast_attack', 'proc_cast_buff', 'proc_cast_debuff', 'proc_struck_debuff', 'proc_struck_buff'}
groups = {r['group_id']: r for r in csv.DictReader((QA/'snapshot/src/data/weapon_group.csv').open(encoding='utf-8-sig'))}
accounts = []
samples = []
for path in sorted((QA/'simulation/loot_observer').glob('*_seed*.json')):
    d = json.loads(path.read_text(encoding='utf-8'))
    rows = d['dropSamples']
    if len({x['uid'] for x in rows}) != len(rows):
        raise ValueError(f'Duplicate acquired UID: {path.name}')
    equipped = {c['item'] for e in d['events'] if e.get('kind')=='autoEquipChanged' for c in e.get('changes', [])}
    for x in rows:
        it=x['item']
        bad=[a for a in it.get('affixes', []) if a.get('stat') in INERT]
        if bad or it.get('proc'):
            samples.append({'account':path.stem, 't':x['t'], 'source':x['source'], 'uid':x['uid'], 'slot':it['slot'], 'rarity':it['rarity'], 'ilvl':it['ilvl'], 'group':it.get('group'), 'classes':groups.get(it.get('group'), {}).get('classes'), 'name':it.get('name'), 'inertAffixes':bad, 'amuletProc':it.get('proc'), 'autoEquippedAtLeastOnce':x['uid'] in equipped})
    phases=[]
    for mark in [600,3600,86400]:
        part=[x for x in rows if x['t']<=mark]
        equipped_by_mark={c['item'] for e in d['events'] if e.get('kind')=='autoEquipChanged' and e['t']<=mark for c in e.get('changes', [])}
        bad=[x for x in part if any(a.get('stat') in INERT for a in x['item'].get('affixes', []))]
        amulets=[x for x in part if x['item'].get('proc')]
        phases.append({'seconds':mark,'acquiredItems':len(part),'affixLines':sum(len(x['item'].get('affixes', []))for x in part), 'itemsWithInertAffixes':len(bad),'inertAffixLines':sum(sum(a.get('stat') in INERT for a in x['item'].get('affixes', []))for x in part),'itemsWithInactiveAmuletProc':len(amulets),'anyInactiveItems':sum(bool(x['item'].get('proc'))or any(a.get('stat') in INERT for a in x['item'].get('affixes', []))for x in part),'inertStatCounts':dict(Counter(a['stat']for x in part for a in x['item'].get('affixes', [])if a.get('stat') in INERT)),'autoEquippedInertItems':sum(x['uid'] in equipped_by_mark for x in bad)})
    accounts.append({'account':path.stem,'seed':d['seed'],'policy':d['policy'],'metadata':d['metadata'],'phases':phases})
aggregates=[]
for policy in sorted({x['policy'] for x in accounts}):
    for mark in [600,3600,86400]:
        rows=[next(p for p in a['phases']if p['seconds']==mark)for a in accounts if a['policy']==policy]
        cols=['acquiredItems','affixLines','itemsWithInertAffixes','inertAffixLines','itemsWithInactiveAmuletProc','anyInactiveItems','autoEquippedInertItems']
        sums={key:sum(r[key]for r in rows)for key in cols}
        aggregates.append({'policy':policy,'seconds':mark,'accounts':len(rows),**sums,'anyInactiveItemPct':100*sums['anyInactiveItems']/sums['acquiredItems']if sums['acquiredItems']else None})
result={'classification':'Explicitly unfinished effects, shown as inactive in game tooltips; not a newly introduced regression. Weapon hit procs are implemented and excluded.','denominator':'Actual newly acquired expedition loot plus opened first-clear chest items captured by the observer; each account UID counted once. Starting gear and unacquired monster gear excluded.','sourceFlags':'snapshot/src/ui/mock.js:195-199 and item.js:28; runtime hero.js:672 only collects weapon hit procs.','notes':['Auto-equipped-at-least-once is joined to actual automatic equip events; it is not proof that the inactive line caused the choice.','This observational sample does not estimate all player distributions. Observer/main parity must be checked by the simulation owner.','Phases are cumulative and must not be added together.'], 'accounts':accounts,'aggregate':aggregates,'inactiveSamples':samples}
(OUT/'inert_loot.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result['aggregate'],ensure_ascii=True,indent=2))
