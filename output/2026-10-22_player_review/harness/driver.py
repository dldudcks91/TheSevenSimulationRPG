"""Human-mimic play driver: holds one Playwright browser, execs python snippets POSTed to 127.0.0.1:8797.

Single-threaded HTTPServer so Playwright sync API stays on the main thread.
Snippets share globals(): page, context, browser, helpers below.
"""
import contextlib
import http.server
import io
import json
import sys
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent / "run"
OUT.mkdir(exist_ok=True)
BASE = "http://127.0.0.1:8811/"
CMD_PORT = 8812

pw = sync_playwright().start()
browser = pw.chromium.launch(channel="msedge", headless=True)
context = None
page = None
errors = []
failed = []
log = []
T0 = None


def attach(p):
    p.set_default_timeout(5000)
    p.on("pageerror", lambda e: errors.append(str(e)))
    p.on("response", lambda r: failed.append({"url": r.url, "status": r.status}) if r.status >= 400 else None)


def open_game(start_epoch_ms, storage=None, url=""):
    """New isolated context; fake clock installed BEFORE navigation (pitfall 10-18)."""
    global context, page
    kw = dict(viewport={"width": 1600, "height": 1000}, locale="ko-KR")
    if storage is not None:
        kw["storage_state"] = storage
    ctx = browser.new_context(**kw)
    pg = ctx.new_page()
    attach(pg)
    pg.clock.install(time=start_epoch_ms / 1000)
    pg.goto(BASE + url, wait_until="domcontentloaded")
    context, page = ctx, pg
    return pg


def now_ms():
    return page.evaluate("Date.now()")


def user_s():
    return round((now_ms() - T0) / 1000, 2)


def tick(seconds):
    page.mouse.move(1590, 990)
    page.clock.run_for(int(seconds * 1000))


def press(selector, nth=0, wait=0.1):
    node = page.locator(selector).nth(nth)
    node.evaluate("n=>n.click()")
    page.clock.run_for(int(wait * 1000))


def click_xy(selector, nth=0, wait=0.1):
    box = page.locator(selector).nth(nth).bounding_box()
    if not box:
        raise ValueError("no box " + selector)
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.clock.run_for(int(wait * 1000))


def save():
    return page.evaluate("JSON.parse(localStorage.getItem('thesevensim.save'))")


def text(sel="body", limit=None):
    t = page.locator(sel).first.inner_text()
    return t if limit is None else t[:limit]


def buttons(sel="body"):
    return page.locator(sel + " button").evaluate_all(
        "ns => ns.filter(n=>n.offsetParent!==null).map(n => ({t:n.textContent.trim().slice(0,40),d:n.disabled,c:n.className}))")


def tip(selector, nth=0, alt=False):
    if alt:
        page.keyboard.down("Alt")
    page.locator(selector).nth(nth).hover(force=True)
    page.clock.run_for(400)
    try:
        t = page.locator("#tooltip").inner_text()
    except Exception:
        t = ""
    if alt:
        page.keyboard.up("Alt")
    page.mouse.move(1590, 990)
    return t


def shot(name):
    p = OUT / (name + ".png")
    page.screenshot(path=str(p), full_page=False)
    return str(p)


def note(label, extra=None):
    entry = {"label": label, "user_seconds": user_s(), "save": save(), "text": text()}
    if extra:
        entry["extra"] = extra
    log.append(entry)
    (OUT / "play_log.json").write_text(json.dumps(log, ensure_ascii=False), encoding="utf-8")
    return entry["user_seconds"]


def brief():
    s = save() or {}
    heroes = [(h.get("uid"), h.get("classId") or h.get("class"), h.get("level")) for h in s.get("heroes", [])[:6]]
    return {"t_min": round(user_s() / 60, 2), "heroes": heroes, "res": s.get("resources"),
            "cleared": (s.get("progress") or {}).get("cleared"), "errors": errors[-3:]}


class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        code = self.rfile.read(n).decode("utf-8")
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                exec(code, globals())
            status = "DONE"
        except Exception:
            buf.write(traceback.format_exc())
            status = "FAILED"
        body = (buf.getvalue() + "\n" + status + "\n").encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


srv = http.server.HTTPServer(("127.0.0.1", CMD_PORT), Handler)
srv.allow_reuse_address = False
print("READY", flush=True)
srv.serve_forever()

