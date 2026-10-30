async () => {
    const { loadData, buildSystems, D } = await import('/ui/data.js');
    const { makeRng } = await import('/game_logic/rng.js');
    await loadData('/data/');
    const SYS = buildSystems(D), game = SYS.game, NOW = Date.UTC(2026, 9, 30);
    const g = game.newGame(1001, SYS.hero.rollStartParty(makeRng(2001), D.balance.party_size_max), NOW);
    let at = NOW, fights = 0;
    while (g.resources.gold < 2900 && fights < 500) {
        const r = game.resolveBattle(g, D.stageOrder[0], at);
        if (!r.ok) throw Error(JSON.stringify(r));
        at += (r.report.durationSec + D.balance.repeat_restart_sec) * 1000;
        for (const h of g.heroes) game.autoEquip(g, h.uid);
        for (const uid of [...g.bags[0]]) game.salvage(g, uid);
        fights++;
    }
    const builds = ['shop', 'tavern', 'forge', 'storage'].map(id => ({id, ...game.construct(g, id, at)}));
    if (builds.some(b => !b.ok)) throw Error(JSON.stringify(builds));
    game.labSettle(g, at);
    const saved = game.serialize(g, at), records = [];
    for (const elapsedSec of [600, 3600, 7200, 10800, 14400, 86400]) {
        const ctrl = game.deserialize(saved), test = game.deserialize(saved);
        const research = game.labResearchStart(test, 'res', 'seats', at);
        if (!research.ok) throw Error(JSON.stringify(research));
        const reload = game.deserialize(game.serialize(test, at));
        const control = game.labSettle(ctrl, at + elapsedSec * 1000);
        game.closeRun(reload, at + elapsedSec * 1000);
        const studied = game.labSettle(reload, at + elapsedSec * 1000);
        records.push({elapsedSec, control: control.gained, research: studied.gained,
            extraIron: (studied.gained.iron_ore ?? 0) - (control.gained.iron_ore ?? 0),
            duplicate: game.labSettle(reload, at + elapsedSec * 1000).gained });
    }
    return { fights, setupElapsedSec: (at - NOW) / 1000, builds,
        capHours: D.balance.dispatch_offline_cap_hours, workerCount: Object.keys(g.dispatch ?? {}).length,
        records, confirmed: records.at(-1).extraIron === 30 };
}
