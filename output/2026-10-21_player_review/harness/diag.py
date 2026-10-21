import sys, time, json
from pathlib import Path
from playwright.sync_api import sync_playwright
q = sys.argv[1]; out = Path(sys.argv[2])
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="msedge", headless=True)
    p = b.new_page(); p.set_default_timeout(0)
    p.goto("http://127.0.0.1:8796/dev/_diag.html?" + q)
    for _ in range(120):
        if p.title().startswith("DIAG"): break
        time.sleep(0.5)
    out.write_text(p.locator("#o").inner_text(), encoding="utf-8"); print(p.title()); b.close()
