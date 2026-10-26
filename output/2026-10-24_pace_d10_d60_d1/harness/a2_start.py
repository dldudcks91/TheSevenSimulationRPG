context.close()
START_B = START
open_game(START_B); page.clock.pause_at(START_B / 1000 + 3); T0 = START_B; tick(3)
EV = []; RUNS = []; SEEN = set(); PREV = None; TODO_LOG = []; TAG = 'A2'; LAST_SHOP = -99; SALVAGE = True; PARTY = ['h1', 'h2', 'h3']
exec(open('lib.py', encoding='utf-8').read(), globals())
click_xy('.mn-btn', 0, wait=0.5); tick(3)
def classes():
    return re.findall(r'(전사|마법사|궁수|기사|사제)\n(?:\S+)\nLv\.1', text())
rolls = 1
print('roll 1', classes())
while False:
    press('button:has-text("다시 굴리기")', 0); tick(1); rolls += 1
    print('roll', rolls, classes())
ev('start_party', f'rolls {rolls} {classes()}')
press('button.primary'); tick(1)
press('button:has-text("건너뛰기")', 0); tick(3)
click_xy('.zone.has-bg', 0, wait=0.5); tick(2)
press('#modal button.primary'); tick(1); ev('first_send')
print([(h['uid'], h['cls'], h['level']) for h in save()['heroes']])
# 연구소 first, then register h4 → mining, h1 → gathering, h2 → logging (same as A and 10-22)
go('research', 1)
lots = [x.strip() for x in page.locator('.cn-lot').all_inner_texts()]
click_xy('.cn-lot', lots.index('연구소'), wait=0.3); tick(1); click_xy('.cn-go', wait=0.5); tick(1)
if (save().get('buildings') or {}).get('resource'):
    ev('built', '연구소')
go('resource', 1)
for hi in (3, 0, 1):
    click_xy('.dp-reg-face.empty:not(.lock)', 0, wait=0.4); tick(1)
    click_xy('#modal .hs-card', hi, wait=0.4); tick(1)
    page.keyboard.press('Escape'); tick(0.5)
ev('lab_reg', save().get('labReg'))
go('expedition', 0.5); check()
print(EV)
