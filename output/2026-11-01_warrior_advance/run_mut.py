"""mut.mjs 실행 — python run_mut.py"""
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


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128


sys.stdout.reconfigure(encoding="utf-8")
srv = Server(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}"
rel = Path(__file__).resolve().parent.relative_to(ROOT).as_posix()
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page()
    pg.on("pageerror", lambda e: print("PAGEERR", e))
    pg.goto(f"{url}/{rel}/blank.html")
    pg.set_default_timeout(0)
    res = pg.evaluate("async (c) => (await import('/%s/mut.mjs')).mut(c)" % rel, {"tiers": ["platinum", "diamond", "champion"], "n": 200, "cost": float(sys.argv[1]), "mults": [float(x) for x in sys.argv[2:]]})
    b.close()
srv.shutdown()
Path(__file__).with_name("mut_" + "_".join(sys.argv[1:]) + ".json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
for k, v in res.items():
    print(k, json.dumps(v, ensure_ascii=False))
