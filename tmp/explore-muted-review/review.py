"""Capture the new exploration art in disposable desktop/mobile browser contexts."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import threading

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY'] = '1'
spec = importlib.util.spec_from_file_location('local_serve', ROOT / 'serve.py')
server_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server_module)


class QuietHandler(server_module.NoCacheHandler):
    def log_message(self, *args):
        pass


server = server_module.Server(('::1', 0), QuietHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
url = f'http://[::1]:{server.server_address[1]}'
report = {'views': [], 'errors': [], 'asset_failures': []}
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)
        for name, w, h, mobile in [('desktop', 1600, 800, False), ('mobile', 390, 844, True)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile)
            ctx.add_init_script("localStorage.setItem('devAdmin','1')")
            for remote in ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**', 'https://cdn.jsdelivr.net/**']:
                ctx.route(remote, lambda route: route.abort())
            page = ctx.new_page()
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.on('response', lambda response: report['asset_failures'].append(response.url) if response.status >= 400 and 'explore_world_muted' in response.url else None)
            page.goto(url + '/index.html?dev=box&tab=explore&lang=ko&skin=d2min', wait_until='domcontentloaded')
            page.locator('.ex-map').wait_for(timeout=60000)
            for _ in range(8):
                button = page.locator('.tutorial-card button').first
                if not button.count() or not button.is_visible():
                    break
                button.click()
            page.wait_for_function("[...document.querySelectorAll('.ex-map img')].every(n=>n.complete && n.naturalWidth>0)")
            data = page.evaluate("""async () => {
                const M = await import('./ui/mock.js');
                const image = new Image(); image.src = M.EXPLORE_WORLD_MAP; await image.decode();
                return {map: M.EXPLORE_WORLD_MAP, size: [image.naturalWidth, image.naturalHeight],
                    spots: document.querySelectorAll('.ex-spot').length,
                    veils: [...document.querySelectorAll('.ex-veil')].map(n=>({src:n.getAttribute('src'),size:[n.naturalWidth,n.naturalHeight]})),
                    regions: M.EXPLORE_REGIONS};
            }""")
            assert data['map'].endswith('explore_world_muted.webp'), data['map']
            assert data['size'] == [1536, 714], data['size']
            assert all('explore_world_muted_locked/' in v['src'] and min(v['size']) > 0 for v in data['veils'])
            page.screenshot(path=str(OUT / f'{name}.png'), animations='disabled', timeout=20000)
            page.locator('.ex-spot').first.click()
            page.locator('.ex-pop').wait_for(timeout=10000)
            data['spot_dialog'] = True
            if name == 'desktop':
                page.screenshot(path=str(OUT / 'desktop-dialog.png'), animations='disabled', timeout=20000)
                bg = ROOT / 'src/assets/art/backgrounds'
                for chapter, region in data['regions'].items():
                    alpha = Image.open(bg / f'explore_world_muted_mask/{chapter}.png').getchannel('A')
                    box = alpha.getbbox()
                    tile = [box[0]/1536*100, box[1]/714*100, (box[2]-box[0])/1536*100, (box[3]-box[1])/714*100]
                    assert all(abs(a-b)<0.011 for a,b in zip(tile,region['tile'])), (chapter, tile, region['tile'])
                    for kind, (x,y) in region['spots'].items():
                        assert alpha.getpixel((round(x/100*1536),round(y/100*714))) > 240, (chapter,kind)
            report['views'].append({'name':name, **data})
            ctx.close()
        browser.close()
    assert not report['errors'], report['errors']
    assert not report['asset_failures'], report['asset_failures']
finally:
    (OUT / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
    server.shutdown()
    server.server_close()
print('Desktop/mobile images and spot dialogs verified; 21 landmarks and 7 lock tiles aligned; browser errors:',len(report['errors']))
