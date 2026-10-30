"""Learn a genuinely granted Lv10 book through the library's real controls."""
import json
from fun_browser import Session, OUT, boot, take, write

BASE = OUT.parent
raw = json.loads((BASE / 'simulation/owned_books/checkpoints/state_active_seed2_end.json').read_text(encoding='utf-8'))
session = Session()
context, page = session.context(fixed_at=raw['savedAt']+1)
context.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(json.dumps(raw))+');')
result = {'checks': [], 'scope': 'Actual winning seed2 state; h1 learned first book before boss, h2 reached Lv10 on final round and has an unspent granted book. Normal menu Load and real library clicks; no granted resources or items.'}


def check(name, ok, detail=None):
    result['checks'].append({'name': name, 'ok': bool(ok), 'detail': detail})
    if not ok:
        raise AssertionError(name)


try:
    boot(page, session.base)
    page.locator('.mn-btn').nth(1).click()
    page.wait_for_function('__fun.G')
    if page.locator('.notice-float .b-ok').count():
        page.locator('.notice-float .b-ok').first.click()
    check('first boss really cleared', page.evaluate('__fun.G.progress.cleared.includes(1051)'))
    check('preboss learned knight skill persisted', page.evaluate('__fun.G.heroes[0].bookSkill') == 'kni_rush')
    page.locator('.nav button[data-tab="library"]').click()
    page.evaluate("__fun.state.heroUid='h2'; __fun.state.bookSel=null; __fun.render()")
    before = page.evaluate('({gold:__fun.G.resources.gold,materials:structuredClone(__fun.G.materials),books:structuredClone(__fun.G.books),hero:structuredClone(__fun.G.heroes[1]),buildings:structuredClone(__fun.G.buildings)})')
    check('warrior reached natural Lv10 with granted book', before['hero']['level'] == 10 and before['books'].get('war_doubleswing') == 1 and not before['hero'].get('bookSkill'))
    check('learning open at library1', before['buildings']['library'] == 1 and page.evaluate('__fun.SYS.game.bookState(__fun.G,"h2").hero.err') is None)
    card = page.locator('[data-keep="library-learn"]')
    card.locator('.bk-grid .inv-cell').first.click()
    button = card.locator('.bk-buy button')
    check('actual Learn button enabled', button.is_enabled())
    page.screenshot(path=str(OUT / 'gifted_book_before.png'))
    button.click()
    after = page.evaluate('({gold:__fun.G.resources.gold,materials:structuredClone(__fun.G.materials),books:structuredClone(__fun.G.books),hero:structuredClone(__fun.G.heroes[1])})')
    check('actual book consumed and active slot filled', after['hero']['bookSkill'] == 'war_doubleswing' and not after['books'].get('war_doubleswing'))
    check('learning spends no gold or materials', before['gold'] == after['gold'] and before['materials'] == after['materials'])
    page.screenshot(path=str(OUT / 'gifted_book_learned.png'))
    result['before'], result['after'] = before, after
    result['page_errors'], result['http_errors'] = session.errors, session.http_errors
    check('no JS or local HTTP errors', not session.errors and not session.http_errors)
finally:
    result['passed'] = sum(c['ok'] for c in result['checks'])
    write('book_ui.json', result)
    print(json.dumps({'passed': result['passed'], 'checks': len(result['checks']), 'errors': session.errors, 'http_errors': session.http_errors}, ensure_ascii=True))
    context.close()
    session.close()
