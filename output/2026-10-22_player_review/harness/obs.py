RUNS = globals().get('RUNS', [])
SEEN = globals().get('SEEN', set())
PREV = globals().get('PREV', None)
TODO_LOG = globals().get('TODO_LOG', [])
def snap_state():
    s = save() or {}
    return {
        "cleared": list((s.get("progress") or {}).get("cleared", [])),
        "levels": {h["uid"]: h.get("level") for h in s.get("heroes", [])},
        "gold": (s.get("resources") or {}).get("gold"),
        "counters": dict(s.get("counters") or {}),
        "buildings": dict(s.get("buildings") or {}),
        "reports": s.get("reports") or [],
        "runs": s.get("runs") or [],
        "nitems": len(s.get("items") or []),
    }
def todo_tabs():
    return page.locator('nav button.todo, .nav button.todo, button.todo').evaluate_all("ns=>ns.filter(n=>n.offsetParent!==null).map(n=>n.textContent.trim())")
def check(st=None):
    global PREV
    st = st or snap_state()
    if PREV is not None:
        for c in st["cleared"]:
            if c not in PREV["cleared"]:
                ev("clear", c)
        for u, lv in st["levels"].items():
            if lv != PREV["levels"].get(u):
                ev("level", f"{u} {PREV['levels'].get(u)}->{lv}")
        for b, r in st["buildings"].items():
            if r != PREV["buildings"].get(b):
                ev("building", f"{b} {PREV['buildings'].get(b)}->{r}")
    for r in st["reports"]:
        key = (r.get("at"), r.get("stageId"), r.get("preset"))
        if key in SEEN:
            continue
        if r.get("reason") is None and not r.get("won"):
            # maybe live/partial; only accept once a run finished — accept if not the active run's lastAt
            act = [x for x in st["runs"] if x.get("active") and x.get("lastAt") == r.get("at")]
            if act:
                continue
        SEEN.add(key)
        RUNS.append({"min": round(user_s()/60, 2), "stage": r.get("stageId"), "won": r.get("won"), "reason": r.get("reason"),
                     "dur": r.get("durationSec"), "downed": r.get("downed"), "rounds": len(r.get("rounds") or []), "drops": len(r.get("drops") or []), "gold": r.get("gold")})
    PREV = st
    (OUT / "runs.json").write_text(json.dumps(RUNS, ensure_ascii=False, indent=0), encoding="utf-8")
    return st
def modal_open():
    m = page.locator('#modal')
    return m.count() and m.is_visible() and m.inner_text().strip() != ''
def watch(sec, step=10, verbose=False):
    end = user_s() + sec
    while user_s() < end - 0.01:
        tick(min(step, end - user_s()))
        st = check()
        t = todo_tabs()
        if not TODO_LOG or TODO_LOG[-1][1] != t:
            TODO_LOG.append((round(user_s()/60, 2), t))
        if verbose:
            print(round(user_s()/60,2), st["cleared"][-2:], st["levels"], st["gold"], len(RUNS), t)
    return PREV
def runs_summary():
    w = sum(1 for r in RUNS if r["won"]); l = sum(1 for r in RUNS if not r["won"])
    return f"runs {len(RUNS)} won {w} lost {l} last {RUNS[-3:]}"
