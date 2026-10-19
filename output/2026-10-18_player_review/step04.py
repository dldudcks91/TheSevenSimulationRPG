page.locator('[data-node=sin_gluttony_t1_hp]').hover(force=True)
page.clock.run_for(300)
print('MAGE HP NODE',page.locator('#tooltip').inner_text(),flush=True)
for _ in range(4):
    press('[data-node=sin_gluttony_t1_hp]'); tick(3)
page.keyboard.press('Escape')
press('.hs-card[data-uid=h3]'); press('.go-tree')
for _ in range(3):
    press('[data-node=cls_archer_t1_atkspeed]'); tick(3)
page.keyboard.press('Escape')
note('first_party_masteries')
press('[data-tab=tavern]'); tick(20)
print(page.locator('.main').inner_text()[:4200],flush=True)
shot('12_tavern')
