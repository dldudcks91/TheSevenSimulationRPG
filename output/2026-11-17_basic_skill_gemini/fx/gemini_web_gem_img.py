# usage: python gem_img.py URL MODEL_TEXT|- PROMPT.txt OUT.png [ATTACH.png ...]
# Opens gemini.google.com/images, picks the model whose menu row contains MODEL_TEXT, picks 1:1,
# attaches files, sends the prompt, waits for the image and downloads the original.
import os, sys
sys.path.insert(0, r'c:\Users\ANGames-001\Desktop\LYC\thesevensimulationrpg\scripts')
import gemini_web as gw
from playwright.sync_api import sync_playwright

url, model, prompt_file, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
files = sys.argv[5:]
prompt = open(prompt_file, encoding='utf-8').read().strip()
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp(gw.CDP)
    page = gw.gemini_page(b)
    page.bring_to_front()
    page.goto(url, timeout=60000)
    page.wait_for_selector('div[contenteditable="true"] >> visible=true', timeout=30000)
    page.wait_for_timeout(2000)
    # model menu: the button showing the current model name
    if model != '-':
        page.locator('button:has-text("Hydrogen"), button:has-text("Pro")').filter(visible=True).last.click()
        page.wait_for_timeout(1500)
        page.get_by_text(model).filter(visible=True).last.click()
        page.wait_for_timeout(1500)
    try:
        page.get_by_text('가로세로 비율').filter(visible=True).last.click(timeout=4000)
        page.wait_for_timeout(1200)
        page.get_by_text('1:1', exact=True).filter(visible=True).last.click()
        page.wait_for_timeout(1000)
    except Exception as e:
        print('aspect pick failed:', e)
    if files:
        gw.attach(page, files)
        page.wait_for_timeout(3000)
    before = page.evaluate(gw.BIG_IMGS)
    done_before = page.evaluate(gw.DONE_REPLIES)
    page.locator('div[contenteditable="true"] >> visible=true').last.click()
    page.keyboard.insert_text(prompt)
    page.wait_for_timeout(500)
    gw.screenshot(page, os.path.splitext(out)[0] + '_send.png')
    send = gw.icon_button(page, 'arrow_upward')
    (send.click() if send else page.keyboard.press('Enter'))
    import time
    t0 = time.time(); fin = None; secs = None
    while time.time() - t0 < 360:
        if page.evaluate(gw.BIG_IMGS) > before:
            secs = time.time() - t0; break
        if page.evaluate(gw.DONE_REPLIES) > done_before:
            fin = fin or time.time()
            if time.time() - fin > 90:
                raise RuntimeError('text reply, no image: ' + page.evaluate(gw.LAST_REPLY).replace(chr(10), ' '))
        page.wait_for_timeout(2000)
    if secs is None:
        raise TimeoutError('no image after 360s')
    page.wait_for_timeout(3000)
    gw.download_last(page, out)
    print('IMAGE after %.0fs | chat %s | %d bytes' % (secs, page.url, os.path.getsize(out)))
