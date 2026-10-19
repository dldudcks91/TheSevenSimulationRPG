press('.hs-card[data-uid=h1]')
for i in range(3):
    cell = page.locator('.td-grid .inv-cell.filled').nth(i)
    cell.hover(force=True)
    page.clock.run_for(500)
    print('SHOP WEAPON',i,page.locator('#tooltip').inner_text(),flush=True)
    tick(10)
press('[data-tab=character]')
for i in range(page.locator('.store-bag .inv-cell.filled').count()):
    page.locator('.store-bag .inv-cell.filled').nth(i).hover(force=True)
    page.clock.run_for(500)
    print('BAG',i,page.locator('#tooltip').inner_text(),flush=True)
    tick(10)
note('inventory_review_16min')
