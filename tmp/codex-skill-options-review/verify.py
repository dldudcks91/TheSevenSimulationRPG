import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
baseline = json.loads((OUT / 'baseline-options.json').read_text(encoding='utf-8'))
baseline_regression = json.loads((OUT / 'baseline-regression.json').read_text(encoding='utf-8'))

INVENTORY = '''async () => {
    const { SYS } = await import('/ui/data.js');
    const { codexSkillTipCard } = await import('/ui/tip.js');
    return SYS.skill.list.filter(d => d.ownerKind === 'job' && SYS.skill.bookable(d.id)).map(d => ({
        id: d.id, name: d.name.ko,
        levels: [...codexSkillTipCard(d.id)[1].querySelectorAll('.cx-sk-level')].map(l =>
            [...l.querySelectorAll('.cx-lv-option')].map(o => ({
                label: o.querySelector('span').textContent, value: o.querySelector('b').textContent
            })))
    }));
}'''

EXPECT = {
    'war_ironskin': ('방어력 상승', '+100%'),
    'war_battleorders': ('최대 HP 상승', '+10%'),
    'war_battlecry': ('방어력 감소', '25%'),
    'war_warcry': ('물리 데미지 감소', '10%'),
    'kni_holyshield': ('보호막 (최대 HP 비율)', '25%'),
    'kni_enchant': ('화염 추가 피해', '60%'),
    'kni_might': ('데미지 상승', '+10%'),
    'kni_fanaticism': ('공격 속도 상승', '+10%'),
    'kni_defiance': ('받는 피해 감소', '10%'),
    'kni_holyfire': ('화염 피해 배율', '15%'),
    'arc_pierce': ('방어력 무시', '50%'),
    'arc_poison': ('독 추가 피해', '50%'),
    'arc_coldarrow': ('냉기 추가 피해', '40%'),
    'mag_inferno': ('화염 피해 배율', '40%'),
    'mag_ignite': ('화상 대상 데미지 상승', '+10%'),
    'mag_surge': ('스턴 확률', '25%'),
    'pri_grace': ('데미지 상승', '+25%'),
    'pri_haste': ('공격 속도 상승', '+50%'),
    'pri_regen': ('초당 회복 (최대 HP 비율)', '2%'),
    'pri_penitence': ('데미지 감소', '25%'),
    'pri_bind': ('공격 속도 감소', '40%'),
    'pri_doom': ('받는 피해 증가', '20%'),
    'arc_quickhands': ('공격 속도 상승', '+20%'),
    'arc_eagleeye': ('물리 데미지 상승', '+20%'),
    'mag_deepfreeze': ('스턴 지속 시간', '1초'),
}

result = {'errors': [], 'inventories': {}, 'layout': []}
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for skin in ('now', 'd2min'):
        for lang in ('ko', 'en'):
            context = browser.new_context(viewport={'width': 1366, 'height': 768})
            page = context.new_page()
            page.on('pageerror', lambda e: result['errors'].append(str(e)))
            page.goto(f'http://127.0.0.1:8848/?dev=newgame&tab=codex&cx=skill&skin={skin}&lang={lang}')
            page.locator('.ix-tile[data-skill="war_ironskin"]').wait_for(timeout=30000)
            inventory = page.evaluate(INVENTORY)
            result['inventories'][f'{skin}-{lang}'] = inventory
            assert len(inventory) == len(baseline) == 49
            for before, after in zip(baseline, inventory):
                assert before['id'] == after['id']
                assert len(after['levels']) == 9
                for old_level, new_level in zip(before['levels'], after['levels']):
                    assert len(old_level) == len(new_level)
                    for old, new in zip(old_level, new_level):
                        assert new['label'] not in ('효과', 'Effect')
                        assert not re.search(r'cx\.|bt\.|st\.|[{}]', new['label'])
                        assert re.findall(r'\d+(?:\.\d+)?', old['value']) == re.findall(r'\d+(?:\.\d+)?', new['value'])
            if lang == 'ko':
                by_id = {row['id']: row for row in inventory}
                for skill_id, (label, value) in EXPECT.items():
                    assert by_id[skill_id]['levels'][0][0] == {'label': label, 'value': value}, skill_id
                assert by_id['war_ironskin']['levels'][8][0]['value'] == '+180%'
                assert by_id['war_shout']['levels'][0] == [
                    {'label': '방어력 상승', 'value': '+25%'},
                    {'label': '모든 저항 상승', 'value': '+15%'}]
            for skill_id in ('war_ironskin', 'war_shout', 'war_battlecry', 'kni_holyshield', 'kni_enchant', 'mag_surge', 'pri_regen', 'mag_deepfreeze', 'arc_eagleeye'):
                page.mouse.move(0, 0)
                page.locator(f'.ix-tile[data-skill="{skill_id}"]').hover()
                page.locator('#tooltip.show .cx-sk-tip').wait_for()
                layout = page.locator('#tooltip.show').evaluate('''tip => {
                    const r = tip.getBoundingClientRect();
                    return {
                        inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
                        overlaps: [...tip.querySelectorAll('.cx-lv-option')].filter(o =>
                            o.querySelector('span').getBoundingClientRect().right > o.querySelector('b').getBoundingClientRect().left + 1).length,
                        labels: [...tip.querySelectorAll('.cx-lv-option > span')].map(n => n.textContent)
                    };
                }''')
                result['layout'].append({'skin': skin, 'lang': lang, 'id': skill_id, **layout})
                assert layout['inside'], (skin, lang, skill_id, layout)
                assert not layout['overlaps'], (skin, lang, skill_id, layout)
                if skill_id in ('war_ironskin', 'pri_regen', 'mag_surge'):
                    page.screenshot(path=str(OUT / f'{skin}-{lang}-{skill_id}.png'))
            context.close()

    page = browser.new_page()
    page.on('pageerror', lambda e: result['errors'].append(str(e)))
    page.goto('http://127.0.0.1:8848/dev/test.html')
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
    result['regression'] = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents()}
    assert result['regression']['title'] == baseline_regression['title']
    assert result['regression']['failures'] == baseline_regression['failures']
    assert not result['errors'], result['errors']
    browser.close()

result['previously_generic_skills'] = sum(any(o['label'] == '효과' for o in row['levels'][0]) for row in baseline)
(OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({
    'skills': 49, 'levels': 9, 'language_skin_combinations': len(result['inventories']),
    'previously_generic_skills': result['previously_generic_skills'],
    'layout_checks': len(result['layout']), 'regression': result['regression']['title'],
    'new_regression_failures': 0, 'browser_errors': result['errors']
}, ensure_ascii=False))
