# D1 for the current persona: needs END_X, state file, TAG base, PARTY, extra fn ENH (or None)
s = save()
BEFORE_D1 = {'res': s['resources'], 'mats': {k: v for k, v in (s.get('materials') or {}).items() if v}, 'levels': LVL(),
             'cleared': s['progress']['cleared'], 'buildings': s.get('buildings'), 'labReg': s.get('labReg')}
SESSION1 = {'RUNS': list(RUNS), 'EV': list(EV), 'TODO': list(TODO_LOG)}
context.close()
RET = END_X + 24 * 3600 * 1000
open_game(RET, storage=str(OUT / f'{PB}_state_60min.json'))
page.clock.pause_at(RET / 1000 + 3); tick(6)
title = text()[:400]
click_xy('.mn-btn', 1, wait=0.5); tick(3)
s0 = save()
D1 = {'title': title, 'notice': s0.get('notice'), 'res': s0['resources'], 'mats': {k: v for k, v in (s0.get('materials') or {}).items() if v},
      'before': BEFORE_D1, 'visit': s0.get('visit'), 'joins': s0.get('joins'), 'mail': s0.get('mail'), 'todo': todo_tabs(), 'screen': text()[:1800]}
shot(f'{PB}_d1_return')
T0 = now_ms()
RUNS.clear(); EV.clear(); TODO_LOG.clear(); PREV = None
for r in save()['reports']:
    SEEN.add((r.get('at'), r.get('stageId'), r.get('preset')))
b = page.get_by_role('button', name='확인', exact=True)
if b.count():
    b.first.evaluate('n=>n.click()'); tick(1)
TAG = f'{PB}_d1'; LAST_SHOP = -99
check(); send_stage(); ev('d1_send')
play_until(10, shop_fn=person_shop, extra_fn=ENH)
dump('10min'); shot(f'{PB}_d1_10min')
json.dump({'D1': D1, 'session1': SESSION1}, open(OUT / f'{PB}_d1_return.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('D1', json.dumps({k: D1[k] for k in ('notice', 'res', 'mats', 'visit', 'joins', 'mail', 'todo')}, ensure_ascii=False))
print('before', json.dumps(BEFORE_D1, ensure_ascii=False))
print([(e['min'], e['event'], e['extra']) for e in EV])
