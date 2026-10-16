"""Check the chapter 1–4 portraits and same-style elite fallback in Chromium."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from playwright.sync_api import sync_playwright

from apply_gpt_monsters_ch1_4 import MANIFEST, ROOT, SESSION

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT / "src")))
Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
assert all(e["status"] in ("installed", "generation_failed") for e in manifest["targets"])
expected_missing = sorted(e["id"] for e in manifest["targets"] if e["status"] == "generation_failed")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    context = browser.new_context(viewport={"width": 1600, "height": 1000})
    page = context.new_page()
    errors, missing_responses = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: missing_responses.append(response.url)
            if response.status >= 400 and "/assets/art/faces/" in response.url else None)
    page.goto(BASE + "/assets/art/faces/source/gpt_monsters_ch1_4_20261016/gallery.html")
    assert page.locator("article").count() == 48
    page.evaluate("document.querySelectorAll('img').forEach(image => image.loading = 'eager')")
    page.wait_for_function("[...document.images].every(image => image.complete && image.naturalWidth > 0)")
    resolved = page.evaluate("""async () => {
        const M = await import('/ui/mock.js');
        const data = await import('/ui/data.js');
        await data.loadData('/data/');
        const rows = Object.values(data.D.monsters).filter(r => r.chapter <= 4 && r.spawn_grade === 'normal');
        M.setFaceStyle('gpt');
        const paths = rows.flatMap(r => ['', '_elite'].map(suffix => ({
            id: r.monster_idx + suffix,
            path: data.monsterFace(r.monster_idx, suffix ? 'elite' : 'normal')
        })));
        const gptElite = data.monsterFace(1101, 'elite');
        M.setFaceStyle('gemini');
        const geminiFallback = data.monsterFace(1101, 'elite');
        const geminiElite = data.monsterFace(1301, 'elite');
        const noOtherStyle = data.monsterFace(4401, 'elite');
        return {paths, gptElite, geminiFallback, geminiElite, noOtherStyle};
    }""")
    assert len(resolved["paths"]) == 96
    actual_missing = sorted(entry["id"] for entry in resolved["paths"] if not entry["path"])
    assert actual_missing == expected_missing, (actual_missing, expected_missing)
    for entry in resolved["paths"]:
        if entry["path"]:
            assert entry["path"].endswith(f"/gpt/monster/{entry['id']}.webp"), entry
            assert context.request.get(BASE + "/" + entry["path"].removeprefix("./")).ok, entry
    assert resolved["gptElite"].endswith("/gpt/monster/1101_elite.webp")
    assert resolved["geminiFallback"].endswith("/gemini/monster/1101.webp")
    assert resolved["geminiElite"].endswith("/gemini/monster/1301_elite.webp")
    assert resolved["noOtherStyle"] is None
    page.get_by_label("챕터").select_option("4")
    assert page.locator("article:visible").count() == 12
    page.screenshot(path=str(SESSION / "browser_chapter_4.png"), full_page=True)
    assert not errors, errors
    assert not missing_responses, missing_responses
    browser.close()
server.shutdown()
server.server_close()

result = {"checked_portraits": 96, "available": 96 - len(expected_missing),
          "generation_failed": expected_missing, "same_style_elite_fallback": "passed",
          "gallery_cards": 48, "javascript_errors": errors, "missing_portrait_responses": missing_responses}
(SESSION / "browser_check.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
