"""Isolated local play-review browser; never opens the user's browser profile."""
import json
import sys
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
OUT = Path(__file__).resolve().parent
pw = sync_playwright().start()
browser = pw.chromium.launch(channel="msedge", headless=True)
context = browser.new_context(viewport={"width": 1600, "height": 1000}, locale="ko-KR")
page = context.new_page()
errors = []
failed = []
page.on("pageerror", lambda e: errors.append(str(e)))
page.on("response", lambda r: failed.append({"url": r.url, "status": r.status}) if r.status >= 400 else None)
page.goto("http://127.0.0.1:8791/")
page.wait_for_timeout(1000)

def show():
    print(json.dumps({"text": page.locator("body").inner_text(), "buttons": page.locator("button").evaluate_all("ns => ns.map(n => ({text:n.textContent.trim(),disabled:n.disabled,cls:n.className}))"), "errors": errors}, ensure_ascii=False), flush=True)

def shot(name):
    page.screenshot(path=str(OUT / (name + ".png")), full_page=True)
    print("SCREENSHOT " + str(OUT / (name + ".png")), flush=True)

print("READY", flush=True)
show()
for line in sys.stdin:
    try:
        command = json.loads(line)
        exec(command, globals())
        print("DONE", flush=True)
    except Exception:
        traceback.print_exc()
        print("FAILED", flush=True)
