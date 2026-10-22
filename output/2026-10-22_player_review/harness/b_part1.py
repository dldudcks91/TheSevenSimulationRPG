exec(open('common.py', encoding='utf-8').read(), globals())
START2 = 1792663200000 + 2 * 24 * 3600 * 1000
open_game(START2); page.clock.pause_at(START2 / 1000 + 3); T0 = START2; tick(3)
click_xy('.mn-btn', 0, wait=0.5); tick(15)
def classes():
    return re.findall(r'(전사|마법사|궁수|기사|사제) · Lv\.1', text())
rolls = 1
while not ({'전사', '기사'} <= set(classes())) and rolls < 15:
    press('button:has-text("다시 굴리기")', 0); tick(6); rolls += 1
ev('start_party', f'rolls {rolls} {classes()}'); print('party', rolls, classes(), flush=True)
press('button.primary'); tick(1)
press('button:has-text("건너뛰기")', 0); tick(2)
tick(10); click_xy('.zone.has-bg', 0, wait=0.5); tick(8)
press('#modal button.primary'); tick(1); ev('first_send')
PARTY = ['h1', 'h2', 'h3']; set_groups()
tick(30)
build('연구소'); register_lab((3, 0, 1)); ev('lab_reg', save().get('labReg'))
back_to_watch()
play_until2(30)
print(runs_summary(), flush=True); print(brief(), flush=True); print(save().get('buildings'), flush=True)
shot('B2_30min'); note('B2_30min')
context.storage_state(path=str(OUT / 'B2_state_30min.json'))
