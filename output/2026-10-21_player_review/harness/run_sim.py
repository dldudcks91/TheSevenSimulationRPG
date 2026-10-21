"""Run dev/sim.html headless and save its JSON: python run_sim.py <name> <query>"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

name, query = sys.argv[1], sys.argv[2]
OUT = Path(__file__).resolve().parent / "sim_out"
OUT.mkdir(exist_ok=True)
t0 = time.time()
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="msedge", headless=True)
    p = b.new_page()
    p.set_default_timeout(0)
    p.goto("http://127.0.0.1:8796/dev/sim.html?" + query)
    while True:
        tl = p.title()
        if tl.startswith("SIM"):
            break
        time.sleep(5)
    data = p.locator("#sim").inner_text()
    err = p.locator("#err").inner_text() if p.locator("#err").count() else ""
    (OUT / (name + ".json")).write_text(data, encoding="utf-8")
    (OUT / (name + ".done")).write_text(json.dumps({"title": tl, "sec": round(time.time() - t0, 1), "err": err[:2000]}), encoding="utf-8")
    b.close()
