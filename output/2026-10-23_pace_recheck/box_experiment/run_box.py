"""Run campaign sims for each box variant, serially: python run_box.py <variant> [variant ...]"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent / "sim_out"
OUT.mkdir(exist_ok=True)
QUARTERS = [("q1", "1-20"), ("q2", "21-40"), ("q3", "41-60"), ("q4", "61-80")]
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="msedge", headless=True)
    for variant in sys.argv[1:]:
        for qn, seeds in QUARTERS:
            t0 = time.time()
            p = b.new_page()
            p.set_default_timeout(0)
            p.goto(f"http://127.0.0.1:8797/dev/sim.html?mode=campaign&seeds={seeds}&runs=150&bot=greedy&mastery=1&potion=1&until=1051&box={variant}")
            while True:
                tl = p.title()
                if tl.startswith("SIM"):
                    break
                if time.time() - t0 > 300:
                    tl = "TIMEOUT"
                    break
                time.sleep(2)
            name = f"box_{variant}_{qn}"
            if tl.startswith("SIM ok"):
                (OUT / (name + ".json")).write_text(p.locator("#sim").inner_text(), encoding="utf-8")
            err = p.locator("#err").inner_text() if p.locator("#err").count() else ""
            print(name, tl, round(time.time() - t0, 1), err[:300], flush=True)
            p.close()
    b.close()
