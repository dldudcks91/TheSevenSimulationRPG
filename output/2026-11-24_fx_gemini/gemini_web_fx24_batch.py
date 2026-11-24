# -*- coding: utf-8 -*-
"""Skill-effect sheets redrawn on Gemini web (logged-in Chrome :9222, no API).
  python gemini_web_fx24_batch.py s01_war_a s02_war_b ...   (each -> sheets/<key>_<k>.png, next free k)
Per sheet: wait for other Gemini scripts -> attach to Chrome anew -> /images -> model '4 Neon' -> 1:1
-> attach refs/<key>.png -> head + nine cell lines -> wait -> original download.
Chat URLs go to sheets/log.txt so a slow image can be fetched later."""
import json, os, sys, time
import psutil
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import gemini_web as gw
from playwright.sync_api import sync_playwright

GEN = "() => [...document.querySelectorAll('model-response img')].filter(i => i.naturalWidth >= 1000 && i.complete).length"
LIMIT = ('더 이상 이미지를 생성할 수 없', '이미지를 더 생성할 수 없')
CELLS = json.load(open(os.path.join(HERE, 'prompts', '_cells.json'), encoding='utf-8'))
HEAD_FILE = os.environ.get('FX_HEAD', '_head.txt')   # _head.txt = faithful redraw · _head_free.txt = freer redesign
HEAD = open(os.path.join(HERE, 'prompts', HEAD_FILE), encoding='utf-8').read().strip()


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(os.path.join(HERE, 'sheets', 'log.txt'), 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def others():
    me = os.getpid()
    found = []
    for p in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmd = ' '.join(p.info['cmdline'] or [])
        except Exception:
            continue
        if p.info['pid'] != me and 'python' in (p.info['name'] or '').lower() and ('gemini' in cmd.lower() or 'gw_' in cmd.lower()):
            found.append(p.info['pid'])
    return found


def wait_free():
    t0 = time.time()
    while others():
        if time.time() - t0 > 1800:
            raise SystemExit('another Gemini script kept running for 30 min: %s' % others())
        time.sleep(15)


def prompt_for(key):
    # 2026-11-24: Neon in plain /images answers 'no image tool' when the attached sheet comes with a long text / nine cell lines;
    # the short head alone draws in ~10 s. The cell lines stay in _cells.json for the board labels only.
    return HEAD


def out_path(key):
    k = 1
    while os.path.exists(os.path.join(HERE, 'sheets', '%s_%d.png' % (key, k))) and os.path.getsize(os.path.join(HERE, 'sheets', '%s_%d.png' % (key, k))) > 0:
        k += 1
    return os.path.join(HERE, 'sheets', '%s_%d.png' % (key, k))


def wait_image(page, tmax=420):
    t0 = time.time(); fin = None
    while time.time() - t0 < tmax:
        if page.evaluate(GEN) > 0:
            return time.time() - t0
        txt = page.evaluate(gw.LAST_REPLY)
        if any(s in txt for s in LIMIT):
            raise SystemExit('DAILY LIMIT: ' + txt.replace(chr(10), ' ')[:200])
        if page.evaluate(gw.DONE_REPLIES) > 0:
            fin = fin or time.time()
            if time.time() - fin > 60:
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


def pick_model(page):
    btn = page.locator('button:visible:has-text("Hydrogen"), button:visible:has-text("Neon"), button:visible:has-text("Pro")').last
    if 'Neon' in btn.inner_text():
        return
    btn.click(); page.wait_for_timeout(1500)
    page.locator(':text-is("4 Neon"):visible').last.click()
    page.wait_for_timeout(1500)
    btn = page.locator('button:visible:has-text("Hydrogen"), button:visible:has-text("Neon"), button:visible:has-text("Pro")').last
    if 'Neon' not in btn.inner_text():
        raise RuntimeError('model not switched: ' + btn.inner_text())


TARGET = os.environ.get('FX_TARGET', 'https://gemini.google.com/images')


def generate(page, key):
    page.goto(TARGET, timeout=60000)
    page.wait_for_selector('div[contenteditable="true"] >> visible=true', timeout=30000)
    page.wait_for_timeout(2500)
    page.keyboard.press('Escape')
    pick_model(page)
    page.locator(':text("가로세로 비율"):visible').last.click()
    page.wait_for_timeout(1200)
    page.locator(':text-is("1:1"):visible').last.click()
    page.wait_for_timeout(1000)
    gw.attach(page, [os.path.join(HERE, 'refs', key + '.png')])
    page.wait_for_timeout(2000)
    if page.url.rstrip('/') != TARGET.rstrip('/'):
        raise RuntimeError('left the start page before typing: ' + page.url)
    page.locator('div[contenteditable="true"] >> visible=true').last.click()
    page.keyboard.insert_text(prompt_for(key))
    page.wait_for_timeout(800)
    for _ in range(8):  # the send button stays disabled while the attachment uploads — press until the chat opens
        send = gw.icon_button(page, 'arrow_upward')
        (send.click() if send else page.keyboard.press('Enter'))
        page.wait_for_timeout(6000)
        if '/app/' in page.url:
            break
    else:
        raise RuntimeError('not sent (no chat url): ' + page.url)
    log('%s sent [%s] | %s' % (key, HEAD_FILE, page.url))
    secs = wait_image(page)
    out = out_path(key)
    size = fetch(page, out)
    log('%s image %.0fs -> %s (%d bytes) | %s' % (key, secs, os.path.basename(out), size, page.url))
    if size == 0:
        raise RuntimeError('empty download')


def one(key):
    wait_free()
    with sync_playwright() as p:
        b = p.chromium.connect_over_cdp(gw.CDP)
        page = gw.gemini_page(b)
        page.bring_to_front()
        generate(page, key)


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
    fails = 0
    for key in sys.argv[1:]:
        for attempt in (1, 2):
            try:
                one(key)
                fails = 0
                break
            except SystemExit:
                raise
            except Exception as e:
                log('%s FAILED (try %d): %s' % (key, attempt, str(e).replace(chr(10), ' ')[:300]))
                time.sleep(20)
        else:
            fails += 1
            if fails >= 3:
                log('three sheets failed in a row - stop')
                break
        time.sleep(15)
    log('batch done')
