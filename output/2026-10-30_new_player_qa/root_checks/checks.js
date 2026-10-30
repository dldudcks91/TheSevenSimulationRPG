async () => {
    const { loadData, buildSystems, D } = await import('/ui/data.js');
    const { makeRng } = await import('/game_logic/rng.js');
    await loadData('/data/');
    const SYS = buildSystems(D), game = SYS.game;
    const NOW = 1793314800000;
    const failures = [], samples = [];
    const result = { cases: 0, roundtrips: 0, nextBattleComparisons: 0, inventoryChecks: 0, failures, samples };
    const stable = value => JSON.stringify(value, (key, val) =>
        val && typeof val === 'object' && !Array.isArray(val)
            ? Object.fromEntries(Object.keys(val).sort().map(k => [k, val[k]])) : val);
    const digest = g => ({ heroes: g.heroes, items: g.items, resources: g.resources, potions: g.potions,
        counters: g.counters, progress: g.progress, bags: g.bags, stash: g.stash, mail: g.mail,
        codexExp: g.codexExp, bonds: g.bonds, presets: g.presets, buildings: g.buildings });
    function inventory(g, label) {
        const refs = [...g.bags.flat(), ...(g.stash ?? []),
            ...g.heroes.flatMap(h => Object.values(h.equipped).filter(Boolean))];
        const duplicates = refs.filter((uid, i) => refs.indexOf(uid) !== i);
        const missing = refs.filter(uid => !g.items[uid]);
        if (duplicates.length || missing.length || !Number.isFinite(g.resources.gold) || g.resources.gold < 0)
            failures.push({ label, kind: 'inventory', duplicates, missing, gold: g.resources.gold });
        result.inventoryChecks++;
    }
    for (let seed = 1; seed <= 10; seed++) {
        let g = game.newGame(seed, SYS.hero.rollStartParty(makeRng(1000 + seed), D.balance.party_size_max), NOW);
        for (let run = 0; run <= 30; run++) {
            const at = NOW + run * 120000;
            const save = JSON.parse(JSON.stringify(game.serialize(g, at)));
            const restored = game.deserialize(save);
            if (stable(digest(g)) !== stable(digest(restored))) {
                const fields = Object.keys(digest(g)).filter(k => stable(digest(g)[k]) !== stable(digest(restored)[k]));
                failures.push({ seed, run, kind: 'roundtrip', fields });
            }
            result.roundtrips++;
            inventory(g, `seed=${seed} run=${run}`);
            const stage = D.stageOrder.filter(id => game.stageUnlocked(g, id)).at(-1);
            const a = game.resolveBattle(g, stage, at);
            const b = game.resolveBattle(restored, stage, at);
            if (stable(a) !== stable(b) || stable(digest(g)) !== stable(digest(restored)))
                failures.push({ seed, run, stage, kind: 'nextBattleChangedAfterLoad', a: a.ok, b: b.ok });
            result.nextBattleComparisons++;
            result.cases++;
            if (!a.ok) { failures.push({ seed, run, stage, kind: 'depart', err: a.err }); break; }
            for (const h of game.partyOf(g).map(uid => game.heroById(g, uid))) {
                game.autoEquip(g, h.uid, 1);
                for (let guard = 0; guard < 50; guard++) {
                    const n = game.masteryState(g, h.uid)?.nodes.find(x => x.canLearn);
                    if (!n || !game.learnMastery(g, h.uid, n.id).ok) break;
                }
            }
            // Manage only bag contents through the public API, preserving locked items and boxes.
            for (const uid of g.bags.flat()) if (!g.items[uid]?.box) game.salvage(g, uid);
            if (run === 30) samples.push({ seed, clears: g.progress.cleared.length,
                levels: game.partyOf(g).map(uid => game.heroById(g, uid).level), gold: g.resources.gold });
        }
    }
    return result;
}
