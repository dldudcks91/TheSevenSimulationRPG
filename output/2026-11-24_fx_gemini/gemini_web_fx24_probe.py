# -*- coding: utf-8 -*-
"""Probe: does plain /images chat draw with a given model? python gemini_web_fx24_probe.py MODEL_LABEL [ATTACH]"""
import os, sys, time
sys.argv += [] 
import importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('b', os.path.join(HERE, 'gemini_web_fx24_batch.py'))
b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
gw = b.gw
from playwright.sync_api import sync_playwright
label = sys.argv[1]; att = sys.argv[2] if len(sys.argv) > 2 else None
b.wait_free()
with sync_playwright() as p:
    page = gw.gemini_page(p.chromium.connect_over_cdp(gw.CDP)); page.bring_to_front()
    page.goto('https://gemini.google.com/images'); page.wait_for_selector('div[contenteditable="true"] >> visible=true'); page.wait_for_timeout(2500)
    btn = page.locator('button:visible:has-text("Hydrogen"), button:visible:has-text("Neon")').last
    btn.click(); page.wait_for_timeout(1500)
    page.locator(':text-is("%s"):visible' % label).last.click(); page.wait_for_timeout(1500)
    page.locator(':text("가로세로 비율"):visible').last.click(); page.wait_for_timeout(1200)
    page.locator(':text-is("1:1"):visible').last.click(); page.wait_for_timeout(1000)
    if att: gw.attach(page, [att]); page.wait_for_timeout(2000)
    page.locator('div[contenteditable="true"] >> visible=true').last.click()
    page.keyboard.insert_text(os.environ.get('FX_PROBE_TEXT', 'Create an image: a rusty iron sword stuck in a stone, dark cartoon style, plain magenta background.'))
    page.wait_for_timeout(600)
    gw.icon_button(page, 'arrow_upward').click(); page.wait_for_timeout(8000)
    print('sent', page.url, flush=True)
    try:
        print('image after %.0fs' % b.wait_image(page, 240))
    except Exception as e:
        print('NO IMAGE:', str(e)[:300])
    print(page.url)
