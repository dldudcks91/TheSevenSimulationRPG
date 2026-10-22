exec(open('common.py', encoding='utf-8').read(), globals())
START = 1792663200000
T0 = START
st = json.load(open(OUT / 'A2_state_20min.json', encoding='utf-8'))
ls = {o['name']: o['value'] for org in st['origins'] for o in org['localStorage']}
sv = json.loads(ls['thesevensim.save'])
at = sv['savedAt']
EV[:] = [e for e in json.load(open(OUT / 'events.json', encoding='utf-8')) if e['min'] <= 20.1]
open_game(at + 1500, storage=str(OUT / 'A2_state_20min.json'))
page.clock.pause_at((at + 1500) / 1000 + 1)
tick(2)
click_xy('.mn-btn', 1, wait=0.5); tick(2)
s = save()
print('reload at', round(user_s() / 60, 2), 'runs', s['runs'], 'notice', s.get('notice'), flush=True)
for r in s['reports']:
    SEEN.add((r.get('at'), r.get('stageId'), r.get('preset')))
PARTY = ['h1', 'h2', 'h3']; set_groups()
if not any(r.get('active') for r in s['runs']):
    # page reload = game closed for the engine; resend the stage the party was on
    cl = (s.get('progress') or {}).get('cleared') or []
    send_stage(); ev("resend_after_reload")
back_to_watch()
check()
play_until2(45)
context.storage_state(path=str(OUT / 'A3_state_45min.json'))
if save()['resources']['gold'] > 1500 and not (save().get('buildings') or {}).get('shop'):
    click_xy('[data-tab=party]', wait=0.5); tick(5)
    for k in range(2):
        press('.rs-roll', 0, wait=0.5); tick(4)
    ev('tactic_reroll', 2)
    back_to_watch()
play_until2(60)
print(runs_summary(), flush=True); print(brief(), flush=True); print(save().get('buildings'), flush=True)
shot('A3_60min'); note('A3_60min')
context.storage_state(path=str(OUT / 'A3_state_60min.json'))
END = now_ms()
json.dump({'RUNS': RUNS, 'EV': EV, 'TODO': TODO_LOG}, open(OUT / 'A3_session1.json', 'w', encoding='utf-8'), ensure_ascii=False)
ret, d1 = d1_return(OUT / 'A3_state_60min.json', END, 'A3')
print('D1', json.dumps(d1, ensure_ascii=False)[:2500], flush=True)
T0 = ret
RUNS.clear(); PREV = None
for r in save()['reports']:
    SEEN.add((r.get('at'), r.get('stageId'), r.get('preset')))
click_xy('[data-tab=resource]', wait=0.4); tick(10)
send_stage(); ev("d1_send")
play_until2(10)
print('D1 session', runs_summary(), brief(), flush=True)
json.dump({'RUNS': RUNS, 'EV': EV, 'D1': d1}, open(OUT / 'A3_d1.json', 'w', encoding='utf-8'), ensure_ascii=False)
shot('A3_d1_10min')
