"""Read-only combat audit using current source modules in headless Edge."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    page.route("**/combat-audit.html", lambda route: route.fulfill(content_type="text/html", body="<title>Combat audit</title>"))
    page.goto("http://127.0.0.1:8921/combat-audit.html", wait_until="domcontentloaded")
    # The audit does not use app state or browser storage.
    stem = sys.argv[1] if len(sys.argv) > 1 else "cases"
    result = page.evaluate((OUT / (stem + ".js")).read_text(encoding="utf-8"))
    target = OUT / ("results.json" if stem == "cases" else stem + "_results.json")
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"cases": len(result.get("records", [])), "file": str(target), "counts": result.get("counts")}))
    browser.close()
