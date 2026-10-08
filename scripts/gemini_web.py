# -*- coding: utf-8 -*-
"""Gemini web (gemini.google.com) driver over CDP -- no API key, uses the logged-in Chrome window.

Start Chrome on port 9222 first (docs/reference/image_generation_tools.md), then:
  python scripts/gemini_web.py shot [OUT.png]
  python scripts/gemini_web.py act STEP [STEP ...] [--out OUT.png]
      STEP = goto:URL | click:X,Y | type:@file.txt | type:TEXT | press:KEY | wait:SEC | scroll:DY
  python scripts/gemini_web.py download OUT.png
  python scripts/gemini_web.py run GEM_URL PROMPT.txt OUT_DIR N [PREFIX]
  python scripts/gemini_web.py close
Every command except close/run ends with a screenshot (default: %TEMP%/gemini_web_shot.png).
"""
import os
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

CDP = 'http://127.0.0.1:9222'
SHOT = os.path.join(tempfile.gettempdir(), 'gemini_web_shot.png')
BIG_IMGS = "() => [...document.querySelectorAll('img')].filter(i => i.naturalWidth >= 400 && i.complete).length"
# Buttons are found by their material icon name (download / arrow_upward), not by the Korean aria-label.
ICON_BTN = """(name) => [...document.querySelectorAll('button')].filter(b => {
    const m = b.querySelector('mat-icon');
    return m && b.offsetParent !== null && ((m.getAttribute('fonticon') || '') === name || m.textContent.trim() === name);
}).at(-1) || null"""


def gemini_page(browser):
    pages = [pg for ctx in browser.contexts for pg in ctx.pages]
    return next((pg for pg in pages if 'gemini.google.com' in pg.url), pages[0])


def icon_button(page, name):
    return page.evaluate_handle(ICON_BTN, name).as_element()


def screenshot(page, out=SHOT):
    page.wait_for_timeout(800)
    page.screenshot(path=out)
    print('URL:', page.url)
    print('SHOT:', out)


def act(page, steps):
    for step in steps:
        kind, _, val = step.partition(':')
        if kind == 'goto':
            page.goto(val)
        elif kind == 'click':
            x, y = (float(v) for v in val.split(','))
            page.mouse.click(x, y)
        elif kind == 'type':
            if val.startswith('@'):
                with open(val[1:], encoding='utf-8') as f:
                    val = f.read().strip()
            page.keyboard.insert_text(val)
        elif kind == 'press':
            page.keyboard.press(val)
        elif kind == 'wait':
            time.sleep(float(val))
        elif kind == 'scroll':
            vw, vh = page.evaluate('() => [innerWidth, innerHeight]')
            page.mouse.move(vw / 2, vh / 2)
            page.mouse.wheel(0, float(val))
        else:
            raise ValueError('unknown step: ' + step)
        print('DONE', step)


def download_last(page, out_path):
    """Original-size download of the last generated image (the on-screen img is a 1024 preview)."""
    imgs = page.locator('img')
    idx = [k for k, w in imgs.evaluate_all('els => els.map((e, k) => [k, e.naturalWidth])') if w >= 400][-1]
    img = imgs.nth(idx)
    img.scroll_into_view_if_needed()
    img.hover()
    page.wait_for_timeout(600)
    btn = icon_button(page, 'download')
    if btn is None:
        raise RuntimeError('download button not found')
    with page.expect_download(timeout=180000) as dl:
        btn.click()
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    dl.value.save_as(out_path)
    print('SAVED', out_path)


def wait_new_image(page, before, timeout=300):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if page.evaluate(BIG_IMGS) > before:
            return time.time() - t0
        page.wait_for_timeout(2000)
    raise TimeoutError('no image after %ds' % timeout)


def run(page, gem_url, prompt, out_dir, n, prefix):
    """N fresh chats of one Gem with the same prompt; each image downloaded at original size."""
    for k in range(1, n + 1):
        page.goto(gem_url)
        page.wait_for_selector('div[contenteditable="true"]', timeout=30000)
        page.wait_for_timeout(1500)
        before = page.evaluate(BIG_IMGS)
        page.locator('div[contenteditable="true"]').last.click()
        page.keyboard.insert_text(prompt)
        page.wait_for_timeout(500)
        send = icon_button(page, 'arrow_upward')
        if send is None:
            page.keyboard.press('Enter')
        else:
            send.click()
        secs = wait_new_image(page, before)
        page.wait_for_timeout(3000)
        download_last(page, os.path.join(out_dir, '%s_%d.png' % (prefix, k)))
        print('RUN %d/%d: image after %.0fs | chat %s' % (k, n, secs, page.url), flush=True)


def main(argv):
    cmd, args = argv[0], argv[1:]
    out = SHOT
    if '--out' in args:
        i = args.index('--out')
        out = args[i + 1]
        del args[i:i + 2]
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP)
        if cmd == 'close':
            browser.new_browser_cdp_session().send('Browser.close')
            print('CLOSED')
            return
        page = gemini_page(browser)
        page.bring_to_front()
        if cmd == 'shot':
            screenshot(page, args[0] if args else out)
        elif cmd == 'act':
            act(page, args)
            screenshot(page, out)
        elif cmd == 'download':
            download_last(page, args[0])
        elif cmd == 'run':
            gem_url, prompt_file, out_dir, n = args[0], args[1], args[2], int(args[3])
            prefix = args[4] if len(args) > 4 else 'sheet'
            with open(prompt_file, encoding='utf-8') as f:
                prompt = f.read().strip()
            run(page, gem_url, prompt, out_dir, n, prefix)
        else:
            raise SystemExit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
