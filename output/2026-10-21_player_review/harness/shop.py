def shop_prices():
    return page.locator('.td-grid .inv-cell.filled').evaluate_all('ns=>ns.map(n=>{const p=n.closest("[class]").parentElement; return (n.parentElement.textContent||"").replace(/\s+/g," ").trim().slice(0,40)})')
def person_shop(refresh=True):
    bought = []
    click_xy('[data-tab=shop]', wait=0.4); tick(3)
    txt = text('.main')
    if refresh:
        btn = page.locator('.main button', has_text='무료')
        if btn.count():
            btn.first.evaluate('n=>n.click()'); tick(2); ev('shop_refresh_free'); print('refreshed', page.locator('.toast').all_inner_texts())
    lv = LVL()
    for hero in ['h1', 'h3', 'h2']:
        click_xy(f'.hs-card[data-uid={hero}]', wait=0.3); tick(0.5)
        n = page.locator('.td-grid .inv-cell.filled').count()
        for i in range(n):
            t = tip('.td-grid .inv-cell.filled', i)
            parts = t.split('VS'); me = parse(parts[0]); cur = parse(parts[1]) if len(parts) > 1 else None
            if not me or me['lv'] > lv[hero]: continue
            good = False
            if 'dps' in me and me['typ'] in GROUPS[hero]:
                good = cur is None or ('dps' in cur and me['dps'] > cur['dps'] * 1.15)
            elif me['typ'] in ('투구','갑옷','장갑','신발'):
                good = ('착용 중 없음' in parts[0]) or (cur and 'def' in cur and 'def' in me and me['def'] > cur['def'] * 1.3)
            if not good: continue
            g = save()['resources']['gold']
            click_xy('.td-grid .inv-cell.filled', i, wait=0.3); tick(3)
            b = page.get_by_role('button', name='구매', exact=True)
            if b.count() and not b.first.is_disabled():
                b.first.evaluate('n=>n.click()'); page.clock.run_for(300)
            g2 = save()['resources']['gold']
            if g2 < g:
                bought.append((hero, me['typ'], me['lv'], g - g2)); ev('shop_buy', f"{hero} {me['typ']} Lv{me['lv']} {g-g2}G")
                print('bought', hero, parts[0][:120].replace('\n', ' '))
            else:
                print('not bought', hero, me['typ'], page.locator('.toast').all_inner_texts())
            tick(2)
            break
    return bought
