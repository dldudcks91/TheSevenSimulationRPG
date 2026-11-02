"""Read-only advancement balance experiments against the current browser engine."""
import functools
import hashlib
import http.server
import json
import csv
from pathlib import Path
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class ReviewServer(http.server.ThreadingHTTPServer):
    request_queue_size = 128


def write_inventory(result):
    def rows(name):
        with (ROOT / "src/data" / name).open(encoding="utf-8-sig") as stream:
            return list(csv.DictReader(stream))

    skills = {r["skill_id"]: r for r in rows("skill.csv")}
    nodes = rows("advance_node.csv")
    advances = {r["advance_id"]: r["name_kr"] for r in rows("advance.csv")}

    def describe(definition):
        descriptions = []
        for e in definition["effects"]:
            if e["effect"] == "apply":
                descriptions.append(f"{e['stat']} {e['value']:.4g}, {e['dur']:.4g}초, 대상 {e['target']}")
            elif e["effect"] == "hit":
                descriptions.append(f"{e['hits']}타 × {e['mult']:.4g}, 원소 {e['element']}, 대상 {e['target']}"
                                    f", 추가 피해 확률 {e['procChance']:.4g} / 배수 {e['procMult']:.4g}")
            elif e["effect"] == "heal":
                descriptions.append(f"회복 배율 {e['mult']:.4g}, 대상 {e['target']}")
        return f"쿨 {definition['cool']:.4g}초 · " + " / ".join(descriptions)

    text = ["# 전직 45스킬 현재 실값과 꼬리 설명", "",
            "2026-10-31 현재 CSV·엔진 해석값. 능력치 전부 20, 장비·마스터리 보정 없음.",
            "배율의 능력치 계수는 별도로 곱해진다. 효과값 0.3은 해당 비율 채널의 30%다.",
            "꼬리는 현재 설명 데이터이며, 실제로 습득·적용되는 효과가 아니다.", ""]
    for record in result["levels"]:
        skill = skills[record["id"]]
        text.extend([f"## {advances[skill['owner_id']]} · {record['name']} ({record['id']})", "",
                     "- 스킬 Lv1: " + describe(record["level1"]),
                     "- 스킬 Lv5: " + describe(record["level5"]),
                     f"- 발동: {skill['cast']} / 조건 {skill['cast_condition']} / 현재 HP 소모 {skill['hp_cost_pct']}", ""])
        for node in nodes:
            if node["skill_id"] == record["id"]:
                title = {"2": "특수", "3": "변형", "4": "필살기"}[node["slot"]]
                description = "보류" if node["hold"] == "1" else node["desc_kr"]
                text.append(f"- {title}: {description}")
        text.append("")
    (OUT / "SKILL_INVENTORY.md").write_text("\n".join(text), encoding="utf-8")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    server = ReviewServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel="msedge", headless=True)
            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/output/2026-10-31_advance_review/harness.html", wait_until="domcontentloaded")
            result = page.evaluate("""async () => {
                const { runReview } = await import('/output/2026-10-31_advance_review/review.mjs');
                return await runReview();
            }""")
            browser.close()
        result["source_sha256"] = {
            str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in [*sorted((ROOT / "src/game_logic").glob("*.js")),
                         ROOT / "src/data/skill.csv", ROOT / "src/data/skill_effect.csv",
                         ROOT / "src/data/skill_status.csv", ROOT / "src/data/advance_node.csv",
                         ROOT / "src/data/balance.csv"]
        }
        (OUT / "results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        write_inventory(result)
        print(json.dumps(result.get("summary", result), ensure_ascii=False, indent=2))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
