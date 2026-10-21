import { loadData, buildSystems, D } from '../ui/data.js';
import { makeRng } from '../game_logic/rng.js';
const NOW = 1_700_000_000_000;
const q = new URLSearchParams(location.search);
const seeds = (q.get('seeds') ?? '64').split(',').map(Number);
const full = q.get('full') === '1';
(async () => {
  try {
    await loadData('../data/');
    const SYS = buildSystems(D);
    const B = D.balance;
    const out = [];
    for (const seed of seeds) {
      const G = SYS.game.newGame(seed, SYS.hero.rollStartParty(makeRng(1000 + seed), (B.party_size_max ?? 3)), NOW);
      const party = SYS.game.partyOf(G).map(uid => SYS.game.heroById(G, uid));
      const fs = SYS.game.formationState(G);
      out.push({ seed, heroes: party.map(h => {
        const c = SYS.game.heroCombat(G, h);
        const w = h.equipped.weapon ? G.items[h.equipped.weapon] : null;
        const row = { cls: h.cls, rank: fs.byUid?.[h.uid], sin: h.sin, attrs: h.attrs ?? h.stats, hp: c.hp_max ?? c.max_hp ?? c.hp,
          atk: c.atk_physical ?? c.atk_magic, period: c.action_period, def: c.defense, basic: c.basic_attack, mam: c.main_attr_mult, tier: h.tier, trait: h.trait?.en,
          weapon: w ? { name: w.name ?? w.baseId ?? w.id, ilvl: w.ilvl, rarity: w.rarity, fixed: w.fixed ?? w.fixedOpt ?? w.implicit, opts: w.options ?? w.affixes } : null };
        if (full) row.combat = c, row.hero = h, row.item = w;
        return row;
      }) });
    }
    document.getElementById('o').textContent = JSON.stringify(out);
    document.title = 'DIAG ok';
  } catch (e) { document.getElementById('o').textContent = String(e.stack || e); document.title = 'DIAG FAIL'; }
})();
