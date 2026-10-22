back_to_watch()
for m in (50, 60):
    play_until2(m)
    try:
        print('enh', enhance_weapons(1200), flush=True)
    except Exception as ex:
        print('enh err', str(ex)[:200], flush=True)
    back_to_watch()
print(runs_summary(), flush=True); print(brief(), flush=True); print(save().get('buildings'), flush=True)
shot('B2_60min'); note('B2_60min')
context.storage_state(path=str(OUT / 'B2_state_60min.json'))
END = now_ms()
json.dump({'RUNS': RUNS, 'EV': EV, 'TODO': TODO_LOG}, open(OUT / 'B2_session1.json', 'w', encoding='utf-8'), ensure_ascii=False)
exec(open('common.py', encoding='utf-8').read().split('def send_stage')[1].join(['def send_stage', '']) if False else '', globals())
src = open('common.py', encoding='utf-8').read()
exec('def send_stage' + src.split('def send_stage')[1].split('def register_lab')[0], globals())
ret, d1 = d1_return(OUT / 'B2_state_60min.json', END, 'B2')
print('D1', json.dumps(d1, ensure_ascii=False)[:2500], flush=True)
T0 = ret
RUNS.clear(); PREV = None
for r in save()['reports']:
    SEEN.add((r.get('at'), r.get('stageId'), r.get('preset')))
click_xy('[data-tab=resource]', wait=0.4); tick(5)
shot('B2_d1_lab')
t = text(); i = t.find('연구소\n1랭크'); print('LAB', t[i:i+600].replace('\n', ' '), flush=True)
click_xy('[data-tab=tavern]', wait=0.4); tick(5)
t = text(); i = t.find('영입 후보'); print('TAVERN', t[i:i+400].replace('\n', ' '), flush=True)
send_stage(); ev('d1_send')
play_until2(10)
print('D1 session', runs_summary(), brief(), flush=True)
json.dump({'RUNS': RUNS, 'EV': EV, 'D1': d1}, open(OUT / 'B2_d1.json', 'w', encoding='utf-8'), ensure_ascii=False)
shot('B2_d1_10min')
