import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(__file__).parent
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.add_init_script("localStorage.setItem('devAdmin','1')")
    for url in ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**', 'https://cdn.jsdelivr.net/**']:
        context.route(url, lambda r: r.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8865/index.html?dev=box&tab=codex&cx=monster&skin=d2min&lang=ko', wait_until='domcontentloaded')
    page.locator('.mon-card').first.wait_for()
    results = page.evaluate(r'''async () => {
        const {D, monsterStory, fillStory, STORY_TOKEN} = await import('./ui/data.js');
        const {codexMonsterTipCard} = await import('./ui/tip.js');
        const {setLang} = await import('./ui/i18n.js');
        const testSource = await (await fetch('./dev/test.js')).text();
        const start = testSource.indexOf("check('monster.csv: 이야기는 ko/en");
        const end = testSource.indexOf('\n});', start) + 4;
        if (start < 0 || end < start) throw new Error('Story check not found');
        const STORY_MAX = {story_kr:155, story_en:235};
        const fail = message => { throw new Error(message); };
        const check = (name, fn) => fn();
        const originalCheck = eval(testSource.slice(start, end));
        if (!originalCheck.includes('120')) throw new Error(originalCheck);
        const tip = document.querySelector('#tooltip');
        Object.assign(tip.style, {left:'20px',top:'20px'});
        tip.classList.add('show');
        const result = [];
        for (const language of ['ko','en']) {
            setLang(language);
            for (const m of Object.values(D.monsters)) {
                const story = fillStory(monsterStory(m.monster_idx)[language], language);
                if (!story.trim() || /[{}�]/.test(story)) throw new Error('Invalid story '+m.monster_idx);
                const cards = codexMonsterTipCard({id:m.monster_idx, exp:0, boss:m.spawn_grade!=='normal'}, 'normal');
                tip.replaceChildren(...cards);
                const para = tip.querySelector('.cx-tip-story p');
                const range = document.createRange();
                range.selectNodeContents(para);
                const lines = range.getClientRects().length;
                const card = tip.getBoundingClientRect();
                result.push({id:m.monster_idx, language, chars:story.length, lines, height:card.height, text:story});
            }
        }
        return result;
    }''')
    (out / 'render-review.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    assert all(r['lines'] <= 6 for r in results), 'Story exceeds six lines'
    assert all(r['chars'] <= (155 if r['language']=='ko' else 235) for r in results)
    print(json.dumps({'checked':len(results), 'overlength':[r for r in results if r['chars'] > (155 if r['language']=='ko' else 235)], 'over6':[{'id':r['id'],'lang':r['language'],'lines':r['lines']} for r in results if r['lines']>6], 'max_height':max(r['height'] for r in results), 'errors':errors}, ensure_ascii=False))
    for language, monster in [('ko',2150),('ko',3350),('ko',5101),('en',7450)]:
        page.evaluate('''async ({language,monster}) => {
            const {setLang} = await import('./ui/i18n.js');
            const {D} = await import('./ui/data.js');
            const {codexMonsterTipCard} = await import('./ui/tip.js');
            setLang(language);
            const tip = document.querySelector('#tooltip');
            tip.replaceChildren(...codexMonsterTipCard({id:monster,exp:0,boss:D.monsters[monster].spawn_grade!=='normal'},'normal'));
            Object.assign(tip.style,{left:'480px',top:'100px'});
            tip.classList.add('show');
        }''', {'language':language,'monster':monster})
        page.screenshot(path=str(out / f'{monster}-{language}.png'))
    assert not errors, errors
    browser.close()
