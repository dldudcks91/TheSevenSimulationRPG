"""Local browser checks for the Gemini/GPT portrait switch."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8788"
OUT = Path(__file__).resolve().parent / "art_style_comparison"
OUT.mkdir(exist_ok=True)
checks = []


with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    context = browser.new_context(viewport={"width": 1600, "height": 900})
    page = context.new_page()
    errors, missing = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: missing.append(response.url)
            if response.status >= 400 and "/assets/art/faces/" in response.url else None)
    page.goto(BASE + "/?dev=newgame&tab=codex")
    picker = page.locator(".resources .face-style-buttons")
    picker.wait_for()
    assert page.locator("html").get_attribute("data-face") == "gemini"
    assert picker.get_by_role("button", name="gemini", exact=True).get_attribute("aria-pressed") == "true"
    assert picker.evaluate("node => node.previousElementSibling.textContent") == "Admin"
    checks.append("Gemini default; buttons immediately follow Admin")

    paths = page.evaluate("""async () => {
        const M = await import('./ui/mock.js');
        const {PORTRAIT_FILES} = await import('./assets/art/faces/portrait_files.js');
        const files = [...new Set(Object.values(PORTRAIT_FILES).flat())];
        const paths = {};
        for (const style of M.FACE_STYLES) {
            M.setFaceStyle(style);
            paths[style] = files.map(file => M.facePath(file));
        }
        M.setFaceStyle('gemini');
        return paths;
    }""")
    for style, urls in paths.items():
        assert len(urls) == 75
        present = [url for url in urls if url]
        assert len(present) == {"gemini": 65, "gpt": 10}[style]
        assert all(f"/faces/{style}/" in url for url in present)
        assert any(url is None for url in urls)
        for url in present:
            assert context.request.get(BASE + "/" + url.removeprefix("./")).ok, url
    checks.append("Each mode resolves only its own portraits; missing variants return null")

    # Temporary in-memory index entries prove selection priority for a shared ID.
    assert page.evaluate("""async () => {
        const M = await import('./ui/mock.js');
        const {PORTRAIT_FILES: files} = await import('./assets/art/faces/portrait_files.js');
        const file = 'hero/warrior_1.webp';
        files.gpt.push(file);
        M.setFaceStyle('gpt');
        const gpt = M.heroFace({face:'warrior_1'});
        M.setFaceStyle('gemini');
        const gemini = M.heroFace({face:'warrior_1'});
        files.gpt.pop();
        return gpt.includes('/gpt/') && gemini.includes('/gemini/');
    }""")
    checks.append("Each mode prefers its own version when both exist")

    picker.get_by_role("button", name="gpt", exact=True).click()
    assert page.locator("html").get_attribute("data-face") == "gpt"
    assert page.evaluate("localStorage.getItem('thesevensim.faceStyle')") == "gpt"
    page.reload()
    picker.wait_for()
    assert page.locator("html").get_attribute("data-face") == "gpt"
    checks.append("Topbar selection persists after reload")

    page.locator(".main").get_by_role("button", name="\uce90\ub9ad\ud130", exact=True).click()
    assert page.locator(".ix-grid img[src*='/faces/']").count() == 0
    page.locator(".ix-style").get_by_role("button", name="gemini", exact=True).click()
    assert picker.get_by_role("button", name="gemini", exact=True).get_attribute("aria-pressed") == "true"
    assert page.locator(".ix-grid img[src*='/gemini/hero/']").count() == 18
    page.wait_for_function("[...document.querySelectorAll('.ix-grid img')].every(i => i.complete && i.naturalWidth > 0)")
    checks.append("GPT character codex is blank; Gemini loads its 18 class portraits")

    page.locator(".dp-btn").click()
    settings = page.locator(".dp-panel .set-box")
    settings.get_by_role("button", name="gemini", exact=True).click()
    assert page.locator("html").get_attribute("data-face") == "gemini"
    assert picker.get_by_role("button", name="gemini", exact=True).get_attribute("aria-pressed") == "true"
    assert settings.is_visible()
    picker.get_by_role("button", name="gpt", exact=True).click()
    assert settings.get_by_role("button", name="gpt", exact=True).get_attribute("aria-pressed") == "true"
    checks.append("Settings and topbar stay synchronized; settings remain open")
    page.screenshot(path=str(OUT / "settings.png"))

    page.evaluate("localStorage.setItem('thesevensim.faceStyle', 'cartoon')")
    page.goto(BASE + "/?dev=newgame")
    picker.wait_for()
    assert page.locator("html").get_attribute("data-face") == "gemini"
    page.goto(BASE + "/?dev=newgame&face=gpt")
    picker.wait_for()
    assert page.locator("html").get_attribute("data-face") == "gpt"
    assert page.evaluate("localStorage.getItem('thesevensim.faceStyle')") == "gpt"
    checks.append("Old cartoon value defaults to Gemini; URL override persists")

    page.goto(BASE + "/?dev=play")
    picker.wait_for()
    assert page.locator("img[src*='/faces/']").count() == 0
    picker.get_by_role("button", name="gemini", exact=True).click()
    assert page.locator("img[src*='/gemini/']").count() > 0
    assert page.locator("img[src*='/gpt/']").count() == 0
    picker.get_by_role("button", name="gpt", exact=True).click()
    assert page.locator("img[src*='/faces/']").count() == 0
    checks.append("Battle portraits appear only in their selected style")
    page.screenshot(path=str(OUT / "battle.png"))
    assert not errors, errors
    assert not missing, missing
    checks.append("No JavaScript errors or missing portrait responses")
    browser.close()

(OUT / "results.json").write_text(json.dumps({"passed": checks}, indent=2), encoding="utf-8")
print(json.dumps({"passed": checks}, indent=2))
