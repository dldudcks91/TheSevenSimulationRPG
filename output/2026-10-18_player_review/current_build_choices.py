for _ in range(4):
    press('[data-node=sin_gluttony_t1_hp]'); tick(2)
page.keyboard.press('Escape'); tick(1)
press('.hs-card[data-uid=h3]'); press('.go-tree')
for _ in range(3):
    press('[data-node=cls_archer_t1_atkspeed]'); tick(2)
press('[data-node=sin_sloth_t1_hp]'); tick(2)
page.keyboard.press('Escape'); tick(1)
press('.hs-card[data-uid=h1]'); press('.go-tree')
for _ in range(3):
    press('[data-node=cls_warrior_t1_hp]'); tick(2)
page.keyboard.press('Escape'); tick(1)
note('current_mastery_choices')
press('[data-tab=research]'); press('.cn-lot:nth-child(6)'); press('.cn-go'); tick(15)
press('[data-tab=shop]'); tick(20)
press('.hs-card[data-uid=h1]')
for i in range(3):
    page.locator('.td-grid .inv-cell.filled').nth(i).hover(force=True)
    page.clock.run_for(300)
    print('SHOP',i,page.locator('#tooltip').inner_text(),flush=True)
    tick(8)
note('current_shop_review')
shot('current_10_shop')
