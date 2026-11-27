"""Check the active catalog and all three in-game previews against a local serve.py."""
import argparse
import csv
import json
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

SOURCE = Path(__file__).resolve().parent
SRC = SOURCE.parents[3]
STYLES = ("orrery", "vitrail", "wraith")


def verify(url):
    manifest = json.loads((SOURCE / "prompts.json").read_text(encoding="utf-8"))
    names = {name for sheet in manifest["sheets"] for name, _ in sheet}
    with (SRC / "data/skill.csv").open(encoding="utf-8-sig", newline="") as f:
        skills = [row["skill_id"] for row in csv.DictReader(f)]
    assert set(skills) <= names
    for style in STYLES:
        folder = SRC / "assets/art/fx/skills" / style
        assert {p.stem for p in folder.glob("*.webp")} == names, style
        for p in folder.glob("*.webp"):
            with Image.open(p) as im:
                assert im.size == (256, 256) and im.mode == "RGBA", p
                alpha = im.getchannel("A")
                assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] > 180, p
                x0, y0, x1, y1 = alpha.getbbox()
                assert 0 < x0 < x1 < im.width and 0 < y0 < y1 < im.height, p

    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1540, "height": 940})
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("response", lambda r: errors.append(r.url) if "/fx/skills/" in r.url and r.status >= 400 else None)
        page.goto(url + "/index.html?dev=newgame&tab=codex&cx=fx&lang=ko")
        page.locator(".cx-fx-all").wait_for(timeout=60000)
        cards = page.locator(".cx-fx .unit[data-skill]")
        assert set(cards.evaluate_all("(ns) => ns.map(n => n.dataset.skill)")) == set(skills)
        for style in STYLES:
            drawn = page.evaluate("""async style => {
                const {SKILL_ART, CHARGE_ART} = await import('./ui/skill_art.js');
                const {fxPreload, fxPreview, fxCharge, setFxArtStyle} = await import('./ui/fx.js');
                await fxPreload(style, Object.keys(SKILL_ART), true);
                const files = new Set();
                const cards = [...document.querySelectorAll('.cx-fx .unit[data-skill]')];
                for (const node of cards) {
                    const id = node.dataset.skill, u = {node, key:id, side:'enemy'};
                    for (const [kind, def] of Object.entries(SKILL_ART[id])) {
                        node.querySelector('.fx-layer')?.replaceChildren();
                        fxPreview(11, u, id, kind, 'physical', style);
                        const actual = [...node.querySelectorAll('img.fx-skill-stamp')].map(im => im.src);
                        for (let d = def; d; d = d.then) {
                            const suffix = '/fx/skills/' + style + '/' + d.file + '.webp';
                            if (!actual.some(src => src.endsWith(suffix))) throw Error(id+' '+kind+' '+suffix);
                            files.add(d.file);
                        }
                    }
                }
                setFxArtStyle(style);
                const u = {node: cards[0], key:'charge', side:'party'};
                fxCharge({idx:1,speed:1}, u, .6);
                const charge = u.node.querySelector('.fx-charge-gather img');
                if (!charge?.src.endsWith('/'+style+'/'+CHARGE_ART.file+'.webp')) throw Error('charge '+style);
                fxCharge({idx:1,speed:1}, u, null);
                files.add(CHARGE_ART.file);
                return [...files];
            }""", style)
            assert set(drawn) == names, style
        page.reload()
        page.locator(".cx-fx-all").wait_for()
        assert page.evaluate("async () => (await import('./ui/fx.js')).fxArtStyle()") == STYLES[-1]
        page.get_by_role("button", name="나란히 보기", exact=True).click()
        select = page.locator(".cx-fx-select")
        assert select.locator("option").count() == len(skills)
        for skill in ("war_doubleswing", "pri_resurrection", "mon_swarm", "mag_meteor"):
            select.select_option(skill)
            page.wait_for_function("() => document.querySelectorAll('.cx-fx .unit img.fx-skill-stamp').length >= 3")
            assert page.locator(".cx-fx .unit").count() == 3
            assert page.locator(".cx-fx-drawing").count() == 3
        page.locator(".dp-btn").click()
        panel = page.locator(".dp-panel")
        panel.get_by_role("button", name="연출", exact=True).click()
        for style, label in zip(STYLES, ("천구도", "성당 유리", "망령불")):
            panel.get_by_role("button", name=label, exact=True).click()
            assert page.evaluate("localStorage.getItem('thesevensim.fxArt')") == style
        assert not errors, errors
        browser.close()
    print(f"{len(skills)} skills, {len(names)} transparent sprites per style, all catalog previews and charges passed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8777")
    verify(parser.parse_args().url.rstrip("/"))
