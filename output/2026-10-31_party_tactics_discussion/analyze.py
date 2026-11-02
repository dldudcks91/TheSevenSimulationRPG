"""Read-only design measurements against the current browser game modules.

Run from the repository root: python output/2026-10-31_party_tactics_discussion/analyze.py
Only writes artifacts beside this script. No save data or production files change.
"""

from functools import partial
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
SOURCES = [
    "src/game_logic/tactic.js", "src/game_logic/state.js", "src/game_logic/hero.js",
    "src/data/tactic_slot.csv", "src/data/tactic_condition.csv",
    "src/data/tactic_option.csv", "src/data/tactic_score.csv", "src/data/balance.csv",
    "src/data/building_rank.csv", "src/data/building_effect.csv", "src/data/class.csv",
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class AnalysisServer(ThreadingHTTPServer):
    # loadData fetches the whole CSV catalog concurrently.
    request_queue_size = 128


ANALYSIS = r"""async () => {
    const m = await import('/ui/data.js');
    const { makeRng } = await import('/game_logic/rng.js');
    await m.loadData('/data/');
    const { SYS, D } = m, TC = SYS.tactic, H = SYS.hero;
    if (!TC || !H) throw new Error('Missing real game systems');
    const result = {
        engine: 'Live createTacticSystem / createHeroSystem / createGameSystem',
        sampleModel: 'Seeds 1..3000. Actual distinct starter trio + actual starting goblin. Additional recruits use rollHeroOf with a uniformly chosen main class; no player selection. All three-member subsets may be selected.',
        optionCounts: Object.fromEntries(TC.slotList.map(s => [s.category, TC.families.filter(f => f.category === s.category).length])),
        conditionCount: TC.conditions.length,
        optionCount: TC.families.length,
        leaderCurve: Object.fromEntries([1,5,10,12,15,16,18,20].map(x => [x, TC.leadCurve(x)])),
        commandRanks: D.buildingRankRows.filter(x => x.building_id === 'command' || x.building === 'command'),
        chapterOpenMax: D.balance.chapter_open_max,
        maxRoster: D.balance.roster_cap + D.buildingEffectRows.filter(x => x.kind === 'add' && x.target === 'roster').reduce((s,x) => s + Number(x.value ?? 0), 0),
        gradeWeights: Object.fromEntries(['common','magic','rare'].map(x=>[x,D.balance['tactic_grade_weight_'+x]])),
        rosterSamples: {},
        optionValues: [],
        errors: [],
    };
    for (const f of TC.families) {
        const o = TC.optionOf({id:f.id,grade:'rare'});
        const valueAt = ldr => TC.measure(o, TC.contextOf([{cls:'priest',sin:'wrath',ldr,front:true,items:[]}], {bond:100})).value;
        result.optionValues.push({id:f.id,category:f.category,score:f.score,stat:f.stat,rareLdr10:valueAt(10),rareLdr18:valueAt(18),rareLdr20:valueAt(20)});
    }
    const countMax = a => Math.max(...Object.values(a.reduce((o,k) => (o[k]=(o[k]??0)+1,o), {})));
    const rows = [4,6,10];
    const N = 3000;
    for (const n of rows) result.rosterSamples[n] = {n:N,classPair:0,sinTrio:0,leader12:0,leader16:0,leader18:0,priestPresent:0,knightPresent:0};
    for (let seed=1; seed<=N; seed++) {
        const rng=makeRng(seed);
        const starters=H.rollStartParty(rng,3);
        const g=SYS.game.newGame(seed,starters,0);
        if (g.heroes.length!==4) throw new Error('Starting roster changed');
        const roster=g.heroes.slice();
        const recruitRng=makeRng(0xA7120000+seed);
        for (let n=4; n<=10; n++) {
            if (n>4) {
                const cls=H.mainClasses[Math.floor(recruitRng()*H.mainClasses.length)];
                roster.push(H.rollHeroOf(recruitRng,cls));
            }
            if (!rows.includes(n)) continue;
            const r=result.rosterSamples[n];
            if (countMax(roster.map(h=>h.cls))>=2) r.classPair++;
            if (countMax(roster.map(h=>h.sin))>=3) r.sinTrio++;
            const maxLdr=Math.max(...roster.map(h=>h.stats.ldr));
            if (maxLdr>=12) r.leader12++;
            if (maxLdr>=16) r.leader16++;
            if (maxLdr>=18) r.leader18++;
            if (roster.some(h=>h.cls==='priest')) r.priestPresent++;
            if (roster.some(h=>h.cls==='knight')) r.knightPresent++;
        }
    }
    const witnessIds = ['opt_march_atk','opt_sin_trio','opt_lead_ldr12','opt_gear_no_pride','opt_front_priest','opt_lead_priest','opt_bond_100'];
    result.witness=[];
    for (const ldr of [10,18,20]) {
        const ctx=TC.contextOf([
            {cls:'priest',sin:'wrath',ldr,front:true,items:[]},
            {cls:'mage',sin:'wrath',ldr:10,front:false,items:[]},
            {cls:'archer',sin:'wrath',ldr:10,front:false,items:[]},
        ], {bond:100});
        const options=witnessIds.map(id=>TC.optionOf({id,grade:'rare'}));
        const measured=options.map(o=>({id:o.id,...TC.measure(o,ctx),stat:o.stat}));
        const apply=rows=>rows.filter(x=>x.active).map(x=>({stat:x.stat,value:x.value}));
        result.witness.push({ldr,conditions:measured,allSeven:TC.bonusOf(apply(measured)),firstSix:TC.bonusOf(apply(measured.slice(0,6)))});
    }
    // The current two-family pools must alternate families even when grade is lower.
    const cat='leadership', rng=makeRng(97531);
    let prev=TC.families.find(x=>x.category===cat).id, same=0, rare=0;
    for(let i=0;i<100000;i++) {
        const next=TC.pick(rng,[prev],cat);
        if(next.id===prev) same++;
        if(next.grade==='rare') rare++;
        prev=next.id;
    }
    result.rerollCheck={draws:100000,sameFamily:same,rare};
    return result;
}"""


def reroll_distribution(k, rare=0.05):
    """Exact two-state Markov chain; start while not owning the desired family."""
    absent, present = 1.0, 0.0
    probability_hit = 0.0
    quantiles = {}
    for roll in range(1, 20000):
        probability_hit += absent * rare / (k - 1)
        absent, present = absent * (k - 2) / (k - 1) + present, absent * (1 - rare) / (k - 1)
        for pct in (0.5, 0.9, 0.95):
            if str(pct) not in quantiles and probability_hit >= pct:
                quantiles[str(pct)] = roll
        if len(quantiles) == 3:
            break
    return {"families": k, "rareProbability": rare, "expectedRollsAbsent": k / rare - 1,
            "expectedRollsPresentNonrare": k / rare, "quantilesAbsent": quantiles}


def main():
    before = {p: sha256((ROOT / p).read_bytes()).hexdigest() for p in SOURCES}
    handler = partial(QuietHandler, directory=str(ROOT / "src"))
    server = AnalysisServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel="msedge", headless=True)
            page = browser.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.route("**/__analysis__", lambda route: route.fulfill(status=200, content_type="text/html", body="<!doctype html><title>Tactic design measurements</title>"))
            page.goto(f"http://127.0.0.1:{server.server_port}/__analysis__")
            result = page.evaluate(ANALYSIS)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    after = {p: sha256((ROOT / p).read_bytes()).hexdigest() for p in SOURCES}
    assert before == after, "Source changed during measurement; rerun to obtain a consistent snapshot"
    assert not errors, errors
    result["sourceHashes"] = before
    result["browserErrors"] = errors
    rare_probability = result["gradeWeights"]["rare"] / sum(result["gradeWeights"].values())
    assert result["maxRoster"] == 10, result["maxRoster"]
    assert result["rerollCheck"]["sameFamily"] == 0
    result["rerollDistributions"] = [reroll_distribution(k, rare_probability) for k in (2, 3, 4, 5, 6, 8)]
    result["lockCosts"] = {n: 600 * 2 ** n for n in range(7)}
    result["formulaExamples"] = {
        "cdr60Plus4FrequencyGain": (1 - 0.60) / (1 - 0.64) - 1,
        "cdr80Plus4FrequencyGain": (1 - 0.80) / (1 - 0.84) - 1,
        "res60Plus3EhpGain": (1 - 0.60) / (1 - 0.63) - 1,
        "res70Plus3EhpGain": (1 - 0.70) / (1 - 0.73) - 1,
        "atk100Plus10RelativeGain": (1 + 1.00 + 0.10) / (1 + 1.00) - 1,
        "defense200Plus20EhpGain": (200 + 200 + 20) / (200 + 200) - 1,
    }
    path = OUT / "measurements.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"artifact": str(path), "options": result["optionCount"], "rostersPerSize": 3000,
                      "rerolls": result["rerollCheck"], "browserErrors": errors}, ensure_ascii=False))


if __name__ == "__main__":
    main()
