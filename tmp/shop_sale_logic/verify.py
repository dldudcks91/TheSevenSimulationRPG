import json
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:8831/dev/test.html")
    page.wait_for_function("/PASS|FAIL/.test(document.title)", timeout=240000)
    checks = page.locator("#out li").evaluate_all(
        'nodes => nodes.map(node => ({ok: !node.classList.contains("fail"), text:node.textContent}))'
    )
    failures = [check for check in checks if not check["ok"]]
    sale_checks = [
        check
        for check in checks
        if "shop:" in check["text"]
        and any(word in check["text"] for word in ["판매 단가", "일괄 판매", "판매 거절"])
    ]
    report = {"title": page.title(), "failures": failures, "sale_checks": sale_checks, "errors": errors}
    (OUT / "logic_results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=True, indent=2))
    browser.close()
