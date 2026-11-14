import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(__file__).parent
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    ctx = browser.new_context(viewport={'width': 1600, 'height': 900})
    ctx.add_init_script("localStorage.setItem('devAdmin','1')")
    for url in ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**', 'https://cdn.jsdelivr.net/**']:
        ctx.route(url, lambda r: r.abort())
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    for skin, lang in [('d2min', 'ko'), ('now', 'en')]:
        page.goto(f'http://127.0.0.1:8865/index.html?dev=box&tab=codex&cx=skill&skin={skin}&lang={lang}', wait_until='domcontentloaded')
        page.locator('.ix-skills [data-codex]').first.wait_for()
        checked = page.evaluate('''async () => {
            const {codexSkillTipCard} = await import('./ui/tip.js');
            const {SYS} = await import('./ui/data.js');
            const result = [];
            for (const node of document.querySelectorAll('.ix-skills [data-codex]')) {
                const id = node.dataset.skill;
                const [left,right] = codexSkillTipCard(id);
                const buildings = [...left.querySelectorAll('.cx-src-building')].map(n => n.dataset.building);
                const expectedBuildings = SYS.game.shopBlueprintPool().includes(id) ? ['shop', 'library'] : ['library'];
                if (JSON.stringify(buildings) !== JSON.stringify(expectedBuildings)) throw new Error(id + ': building sources');
                const sourceMonsters = left.querySelectorAll('.cx-src-cell .face:not(.bld)').length;
                if (sourceMonsters !== SYS.battle.skillCarriers(id).fixed.length || left.querySelector('.cx-src.roll')) throw new Error(id + ': non-fixed source');
                const values = [...right.querySelectorAll('.cx-sk-level')].map(n => n.textContent);
                if (values.length !== 9 || values.some(v => /NaN|undefined/.test(v))) throw new Error(id + ': ' + values);
                if (!left.querySelector('.cx-src-box') || right.querySelector('.cx-src-box')) throw new Error(id + ': source placement');
                if (!left._rebuild().querySelector('.cx-src-box')) throw new Error(id + ': rebuild lost source');
                result.push({id, first:values[0], last:values[8]});
            }
            return result;
        }''')
        bash = next(x for x in checked if x['id'] == 'war_bash')
        assert '300%' in bash['first'] and '540%' in bash['last'], bash
        shout = next(x for x in checked if x['id'] == 'war_shout')
        assert '+25%' in shout['first'] and '+15%' in shout['first'], shout
        assert '+57%' in shout['last'] and '+31%' in shout['last'], shout
        for skill in ['war_bash', 'war_shout', 'kni_rush']:
            page.locator(f'.ix-skills [data-skill="{skill}"]').hover()
            page.locator('#tooltip.show .cx-sk-level').first.wait_for()
            assert page.locator('#tooltip .cx-sk-level').count() == 9
            page.keyboard.down('Alt')
            assert page.locator('#tooltip .cx-sk-description .cx-src-box').count() == 1
            page.keyboard.up('Alt')
            alignment = page.locator('#tooltip').evaluate('''tip => ({
                border: Math.abs(tip.querySelector('.cx-sk-description > .tip-name').getBoundingClientRect().bottom - tip.querySelector('.cx-sk-tip > .cx-tip-h').getBoundingClientRect().bottom),
                first: Math.abs(tip.querySelector('.cx-sk-levels').getBoundingClientRect().top - tip.querySelector('.cx-sk-tip > .cx-tip-h').getBoundingClientRect().bottom)
            })''')
            assert alignment['border'] < 1 and alignment['first'] < 1, alignment
            bounds = page.locator('#tooltip').bounding_box()
            assert bounds['y'] >= -1 and bounds['y'] + bounds['height'] <= 901, bounds
            page.screenshot(path=str(out / f'tooltip-{skin}-{skill}.png'))
        print(json.dumps({'skin':skin, 'checked':len(checked), 'samples':checked[:6]}, ensure_ascii=False))
    assert not errors, errors
    browser.close()
