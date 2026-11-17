# -*- coding: utf-8 -*-
"""Basic-skill icon sheets on Gemini web (logged-in Chrome :9222, no API).
  python gemini_skill_batch.py s1_warrior s2_knight ...   (each -> sheets/<key>_1.png, or _2 if _1 exists)
Per sheet: gemini.google.com/images -> model '3.1 Pro' -> 1:1 -> attach anchor -> prompt -> wait -> original download.
Chat URLs go to sheets/log.txt so a slow image can be fetched later (recover KEY URL)."""
import os, sys, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import gemini_web as gw
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ANCHOR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'style_ref_magenta.png')
GEN = "() => [...document.querySelectorAll('model-response img')].filter(i => i.naturalWidth >= 400 && i.complete).length"
LIMIT = ('더 이상 이미지를 생성할 수 없', '이미지를 더 생성할 수 없')


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(os.path.join(HERE, 'sheets', 'log.txt'), 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def out_path(key):
    k = 1
    while os.path.exists(os.path.join(HERE, 'sheets', '%s_%d.png' % (key, k))) and os.path.getsize(os.path.join(HERE, 'sheets', '%s_%d.png' % (key, k))) > 0:
        k += 1
    return os.path.join(HERE, 'sheets', '%s_%d.png' % (key, k))


def wait_image(page, tmax=300):
    t0 = time.time(); fin = None
    while time.time() - t0 < tmax:
        if page.evaluate(GEN) > 0:
            return time.time() - t0
        txt = page.evaluate(gw.LAST_REPLY)
        if any(s in txt for s in LIMIT):
            raise SystemExit('DAILY LIMIT: ' + txt.replace(chr(10), ' ')[:200])
        if page.evaluate(gw.DONE_REPLIES) > 0:
            fin = fin or time.time()
            if time.time() - fin > 120:
                raise RuntimeError('text reply, no image: ' + txt.replace(chr(10), ' ')[:300])
        page.wait_for_timeout(3000)
    raise TimeoutError('no image after %ds' % tmax)


def fetch(page, out):
    page.wait_for_timeout(3000)
    gw.download_last(page, out)
    for _ in range(2):
        if os.path.getsize(out) > 0:
            break
        chat = page.url
        page.goto(chat); page.wait_for_timeout(8000)
        gw.download_last(page, out)
    return os.path.getsize(out)


def generate(page, key):
    prompt = open(os.path.join(HERE, 'prompts', key + '.txt'), encoding='utf-8').read().strip()
    page.goto('https://gemini.google.com/images', timeout=60000)
    page.wait_for_selector('div[contenteditable="true"] >> visible=true', timeout=30000)
    page.wait_for_timeout(2500)
    page.locator('button:has-text("Hydrogen"), button:has-text("Pro")').filter(visible=True).last.click()
    page.wait_for_timeout(1500)
    page.get_by_text('3.1 Pro', exact=True).filter(visible=True).last.click()
    page.wait_for_timeout(1500)
    page.get_by_text('가로세로 비율').filter(visible=True).last.click()
    page.wait_for_timeout(1200)
    page.get_by_text('1:1', exact=True).filter(visible=True).last.click()
    page.wait_for_timeout(1000)
    if not key.endswith('_na'):
        gw.attach(page, [ANCHOR])
        page.wait_for_timeout(2000)
    if '/images' not in page.url:
        raise RuntimeError('left the image page before typing: ' + page.url)
    box = page.locator('div[contenteditable="true"] >> visible=true').last
    box.click()
    page.keyboard.insert_text(prompt)
    page.wait_for_timeout(800)
    if len(box.inner_text()) < 50:
        raise RuntimeError('prompt did not land in the input box')
    send = gw.icon_button(page, 'arrow_upward')
    (send.click() if send else page.keyboard.press('Enter'))
    import re
    for _ in range(40):
        if re.search(r'/app/[0-9a-f]{8,}', page.url) or page.evaluate("() => document.querySelectorAll('user-query').length") > 0:
            break
        page.wait_for_timeout(1000)
    else:
        raise RuntimeError('not sent (no chat url): ' + page.url)
    log('%s sent | %s' % (key, page.url))
    secs = wait_image(page)
    out = out_path(key[:-3] if key.endswith('_na') else key)
    size = fetch(page, out)
    log('%s image %.0fs -> %s (%d bytes) | %s' % (key, secs, os.path.basename(out), size, page.url))


def recover(page, key, url):
    page.goto(url, timeout=60000); page.wait_for_timeout(8000)
    n = page.evaluate(GEN)
    if n == 0:
        log('%s recover: no image in %s' % (key, url)); return False
    out = out_path(key)
    size = fetch(page, out)
    log('%s recovered -> %s (%d bytes) | %s' % (key, os.path.basename(out), size, url))
    return size > 0


if __name__ == '__main__':
    args = sys.argv[1:]
    with sync_playwright() as p:
        b = p.chromium.connect_over_cdp(gw.CDP)
        page = gw.gemini_page(b)
        page.bring_to_front()
        if args and args[0] == 'recover':
            recover(page, args[1], args[2]); sys.exit(0)
        if args and args[0].startswith('recover='):
            key, url = args.pop(0)[8:].split('@', 1)
            if recover(page, key, url) and key in args:
                args.remove(key)
        for key in args:
            try:
                try:
                    generate(page, key)
                except RuntimeError as e:
                    if 'text reply' in str(e):
                        raise
                    log('%s retry once: %s' % (key, str(e)[:160]))
                    time.sleep(10)
                    generate(page, key)
            except SystemExit:
                raise
            except Exception as e:
                log('%s FAILED: %s | %s' % (key, str(e).replace(chr(10), ' ')[:300], page.url))
                log('stop after first failure — Chrome released')
                break
            time.sleep(20)
