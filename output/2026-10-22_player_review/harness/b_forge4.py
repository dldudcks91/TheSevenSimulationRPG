def enhance_weapons(reserve=800):
    done = []
    click_xy('[data-tab=forge]', wait=0.5); tick(3)
    press('.main button:has-text("강화")', 0); tick(2)
    for hero in PARTY:
        click_xy(f'.hs-card[data-uid={hero}]', wait=0.3); tick(1)
        page.mouse.click(436, 443); page.clock.run_for(300); tick(2)
        t = text(); i = t.find('강화\n', t.find('크래프트')); head = t[i:i+200].replace('\n', ' ')
        for k in range(3):
            g = save()['resources']['gold']
            if g < reserve: break
            b = page.locator('.main button.primary.lg', has_text='강화')
            if not b.count() or b.first.is_disabled(): break
            b.first.evaluate('n=>n.click()'); page.clock.run_for(300); tick(3)
            g2 = save()['resources']['gold']
            if g2 >= g: break
            done.append((hero, g - g2))
        t = text(); i = t.find('강화\n', t.find('크래프트'))
        print(hero, 'before:', head[:120], '| after:', t[i:i+200].replace('\n', ' ')[:160], flush=True)
    if done: ev('enhance', done)
    return done
print(enhance_weapons())
shot('B2_forge_after')
