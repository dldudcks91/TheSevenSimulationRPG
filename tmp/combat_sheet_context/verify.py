import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8843'


def main():
    report = {'suite': {}, 'checks': [], 'errors': []}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            page = browser.new_page(viewport={'width': 1600, 'height': 1000})
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.goto(BASE + '/dev/test.html')
            page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
            report['suite'] = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents()}
            print(json.dumps(report['suite'], ensure_ascii=False), flush=True)
            browser.close()
        assert not report['suite']['failures'], report['suite']['failures']
        assert not report['errors'], report['errors']
    finally:
        (OUT / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
