"""life.mjs 실행 — python run_life.py"""
import functools
import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


sys.stdout.reconfigure(encoding="utf-8")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}"
rel = Path(__file__).resolve().parent.relative_to(ROOT).as_posix()
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page()
    pg.on("pageerror", lambda e: print("PAGEERR", e))
    pg.goto(f"{url}/{rel}/blank.html")
    res = pg.evaluate("async (c) => (await import('/%s/life.mjs')).life(c)" % rel, {"tiers": ["platinum", "diamond", "champion"], "n": 300})
    b.close()
srv.shutdown()
print(json.dumps(res, ensure_ascii=False, indent=1))
