base_context=context; base_page=page
day1_at=T0+86400000
def return_day1(storage,label):
    global page
    ctx=browser.new_context(storage_state=storage,viewport={'width':1600,'height':1000},locale='ko-KR')
    page=ctx.new_page()
    page.set_default_timeout(4000)
    page.clock.install(time=day1_at/1000)
    page.goto('http://127.0.0.1:8794/',wait_until='domcontentloaded')
    page.locator('.mn-btn').first.wait_for()
    page.clock.pause_at(page.evaluate('Date.now()')/1000+1)
    page.locator('.mn-btn').nth(1).evaluate('n=>n.click()')
    tick(2)
    note(label+'_first_screen')
    shot(label+'_first_screen')
    result=log[-1]['save']
    (OUT/(label+'_save.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(label,'FIRST SCREEN',page.locator('body').inner_text()[:2200],flush=True)
    print(label,'STATE',json.dumps({'resources':result['resources'],'materials':result['materials'],'levels':[(h['uid'],h['level'])for h in result['heroes']],'search':result.get('search'),'explores':result.get('explores')},ensure_ascii=False)[:2500],flush=True)
    return ctx,result

plain_context,plain_save=return_day1(hour_storage,'day1_a_plain')
plain_context.close()
page=base_page; context=base_context
press('[data-tab=tavern]'); tick(10)
print('PREPARATION SEARCH',page.locator('.tv-send').inner_text(),flush=True)
print('SEARCH BUTTONS',page.locator('.tv-send button').evaluate_all('ns=>ns.map(n=>({text:n.textContent,cls:n.className,disabled:n.disabled}))'),flush=True)
