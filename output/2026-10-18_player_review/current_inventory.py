press('[data-tab=character]'); tick(5)
for i in range(page.locator('.store-bag .inv-cell.filled').count()):
    page.locator('.store-bag .inv-cell.filled').nth(i).hover(force=True)
    page.clock.run_for(300)
    print('BAG',i,page.locator('#tooltip').inner_text(),flush=True)
    tick(8)
shot('current_06_item_comparison')
