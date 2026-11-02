"""측정 실행 — python run.py <config.json> <out.json> · 임시 서버(저장소 루트 · 읽기 전용) · Edge 헤드리스."""
import functools
import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BATTLE_OLD = "                        else rt.act(u, t);"
BATTLE_NEW = "                        else { rt.act(u, t); if (u.buffs?.war_ragnarok_now && u.next > u.period) u.next = u.period; }"


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128


sys.stdout.reconfigure(encoding="utf-8")
cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
srv = Server(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}"
rel = Path(__file__).resolve().parent.relative_to(ROOT).as_posix()
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page()
    pg.on("pageerror", lambda e: print("PAGEERR", e))
    # 측정 전용 장치 둘 — 응답만 고친다(파일은 그대로) · 찾는 문자열이 없으면 멈춘다
    def patch(route, pairs):
        body = (ROOT / "src/game_logic" / route.request.url.split("/")[-1].split("?")[0]).read_text(encoding="utf-8")
        for old, new in pairs:
            if old not in body:
                print("PATCH TARGET MISSING: " + old[:60])
            body = body.replace(old, new, 1)
        route.fulfill(body=body, content_type="text/javascript; charset=utf-8", headers={"Cache-Control": "no-store"})
    pg.route("**/src/game_logic/skill_effects.js", lambda rt: patch(rt, [("    phys_pct: { state: true },", "    phys_pct: { state: true },\n    skill_pct: { state: true },\n    hp_burn: { state: true },\n    free_turn: { state: true },")]))
    pg.route("**/src/game_logic/skill_runtime.js", lambda rt: patch(rt, [("        procCast(u, t);\n        // 스킬 뒤 기본 공격", "        procCast(u, t);\n        if (u.buffs?.war_berserk_free && def.id === 'war_berserk') return turn(u, t);\n        // 스킬 뒤 기본 공격")]))
    pg.route("**/src/game_logic/battle.js", lambda rt: patch(rt, [
        (BATTLE_OLD, BATTLE_NEW),
        # 동귀어진 최대 HP 비례 — 강타처럼 방어 · 치명을 안 받고 그 직격에 더한다
        ("            const total = dmg + cb;", "            const mutB = globalThis.__MUT && s === globalThis.__MUT.id ? Math.round(target.hpMax * (globalThis.__MUT.target ?? 0) + u.hpMax * (globalThis.__MUT.self ?? 0)) : 0; const total = dmg + cb + mutB;"),
        # 자동 발동 — 차례와 무관하게 first 초에 처음 · 그 뒤 cool 초마다 건다 · 칸에서는 안 고른다
        ("                    if (rules?.skipActor?.(u)) continue;\n                    if (u.chan) {", "                    if (rules?.skipActor?.(u)) continue;\n                    { const au = globalThis.__AUTO; const a = au && u.actives?.find(x => x.def?.id === au.id); if (a) { a.readyAt = Infinity; a.autoAt ??= t + au.first; if (t + 1e-6 >= a.autoAt) { a.autoAt = t + au.cool; timeline.push({ t: r1(t), e: 'skill', u: u.key, s: a.def.id }); rt.cast(u, a.def, t); } } }\n                    if (u.chan) {"),
        ("                if (phys) u.condPct += phys;\n            }", "                if (phys) u.condPct += phys;\n            }\n            if (s) { const sp = sumOf(u, 'skill_pct'); if (sp) u.condPct += sp; }"),
        ("            const shield = target.barrier;\n", "            const burnP = sumOf(u, 'hp_burn'); if (burnP > 0) { const amt = Math.floor(u.hp * burnP); if (amt > 0) { u.hp -= amt; timeline.push({ t: r1(t), e: 'pay', u: u.key, s: 'hp_burn', amt, dhp: u.hp }); } }\n            const shield = target.barrier;\n"),
    ]))
    pg.goto(f"{url}/{rel}/blank.html")
    pg.set_default_timeout(0)
    res = pg.evaluate(
        "async (c) => { const m = await import('/%s/harness.mjs'); const t = await m.setup(); const sample = m.sample(); return { t, sample, res: m.run(c) }; }" % rel,
        cfg,
    )
    b.close()
srv.shutdown()
Path(sys.argv[2]).write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
print(json.dumps(res["sample"], ensure_ascii=False)[:900])
for tid, T in res["res"].items():
    print(f"\n== {tid} Lv{T['level']} shape={T['shape']}")
    print("var | m | d | se | d1 | d2 | win | n | dur | cast | wDps | share | turns | stag | downT | dead")
    for k, v in T["rows"].items():
        print(f"{k} | {v['m']:.3f} | {v['d']:.3f} | {v['se']:.3f} | {v['d1']:.3f} | {v['d2']:.3f} | {v['win']:.1f} | {v['used']} | {v['dur']:.1f} | {v['casts']:.2f} | {v['wDmgPerS']:.0f} | {v['skillShare']:.2f} | {v['turns']:.2f} | {v['stag']:.2f} | {v['downT']:.1f} | {v['wDead']:.2f}")
