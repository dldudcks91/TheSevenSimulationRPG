"""간체 화면 스크린샷 — python shots.py <port> <out_dir> [lang=zh]
각 화면: 렌더 오류 · 콘솔 오류 · 화면 글자의 한글 수(간체 화면엔 0 이어야 — 이름이 데이터 빠짐이면 영어) · 가로 넘침 칸 수를 함께 적는다."""
import sys, os, json, re, time
from playwright.sync_api import sync_playwright
port, out = sys.argv[1], sys.argv[2]
lang = sys.argv[3] if len(sys.argv) > 3 else 'zh'
os.makedirs(out, exist_ok=True)
SHOTS = [
    ('expedition', '?dev=newgame'),
    ('form', '?dev=form'),
    ('tip_item', '?dev=tip'),
    ('tree', '?dev=tree'),
    ('tavern', '?dev=newgame&tab=tavern&cn=max'),
    ('commission', '?dev=commission'),
    ('codex', '?dev=newgame&tab=codex'),
    ('codex_skill', '?dev=newgame&tab=codex&cx=skill'),
    ('library', '?dev=book'),
    ('forge', '?dev=mats'),
    ('research', '?dev=newgame&tab=research&cn=max'),
    ('explore', '?dev=explore'),
    ('party', '?dev=tactics'),
    ('arena', '?dev=arena'),
    ('battle', '?dev=battle'),
    ('help', '?dev=newgame&tab=help'),
    ('shop', '?dev=newgame&tab=shop&cn=max'),
    ('prologue', '?dev=prologue&s=5'),
]
HANGUL = re.compile(r'[가-힣]')
report = []
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    for name, q in SHOTS:
        ctx = b.new_context(viewport={'width': 1600, 'height': 800})
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('console', lambda m: errs.append(m.text[:200]) if m.type == 'error' else None)
        url = f'http://127.0.0.1:{port}/index.html{q}&lang={lang}'
        try:
            pg.goto(url, timeout=60000)
            pg.wait_for_timeout(3500)
            pg.screenshot(path=os.path.join(out, f'{name}_{lang}.png'))
            txt = pg.evaluate('document.body.innerText')
            hang = HANGUL.findall(txt)
            sample = re.findall(r'[가-힣][가-힣\s]{0,12}', txt)[:6]
            over = pg.evaluate("""() => [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible' && e.textContent.trim()).length""")
            fonts = pg.evaluate("""() => getComputedStyle(document.body).fontFamily""")
            report.append({'name': name, 'hangul': len(hang), 'sample': sample, 'clipped': over, 'errors': errs[:5], 'htmlLang': pg.evaluate('document.documentElement.lang'), 'font': fonts[:60]})
        except Exception as e:
            report.append({'name': name, 'fail': str(e)[:200], 'errors': errs[:5]})
        ctx.close()
    b.close()
json.dump(report, open(os.path.join(out, f'report_{lang}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for r in report:
    print(json.dumps(r, ensure_ascii=False))
