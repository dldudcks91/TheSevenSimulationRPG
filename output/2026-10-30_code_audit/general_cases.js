import { loadData, buildSystems, D } from '/ui/data.js';
import { makeRng } from '/game_logic/rng.js';
await loadData('/data/');
const S = buildSystems(D);
const clone = x => JSON.parse(JSON.stringify(x));
const game = seed => S.game.newGame(seed, S.hero.rollCandidates(makeRng(seed), 3), 1700000000000);
const g = game(84);
const valid = S.arena.exportTeam(g.heroes.slice(0,3), g.items);

export function verify() {
    const result = { valid_roundtrip: S.arena.validateTeam(valid), generated: [], malformed: [], item_range: { items: 0, options: 0, failures: [] } };
    const mutations = {
        empty_stats: p => p.heroes[0].hero.stats = {},
        missing_stats_key: p => delete p.heroes[0].hero.stats.str,
        empty_stats_array: p => p.heroes[0].hero.stats = [],
        missing_name: p => delete p.heroes[0].hero.name,
        invalid_sin: p => p.heroes[0].hero.sin = 'invalid',
        affixes_object: p => p.heroes[0].gear[0].item.affixes = {},
        affixes_null_entry: p => p.heroes[0].gear[0].item.affixes = [null],
        sins_object: p => p.heroes[0].gear[0].item.sins = {},
        skillOrder_object: p => p.heroes[0].hero.skillOrder = {},
        missing_gear_group: p => delete p.heroes[0].gear[0].item.group,
        name_object: p => p.heroes[0].hero.name = {ko:{x:1}, en:{x:2}},
    };
    for (const [name, change] of Object.entries(mutations)) {
        const p = clone(valid); change(p);
        const r = {name};
        try {r.problems = S.arena.validateTeam(p);} catch (e) {r.validation_threw = String(e);}
        try {const got = S.arena.importTeam(p); r.import_ok = got.ok; if (got.ok) r.import_team = got.team;} catch (e) {r.import_threw = String(e);}
        result.malformed.push(r);
    }
    // Generated legal AI teams must survive the same export/import boundary as player teams.
    for (const t of S.arena.tiers) {
        for (let seed = 1; seed <= 25; seed++) {
            const team = S.arena.rollTierOpponent(t.id, makeRng(seed));
            const items = Object.fromEntries(team.flatMap(p => p.gear).map(it => [it.uid, it]));
            const ranks = Object.fromEntries(team.map(p => [p.uid,p.rank]));
            const p = S.arena.exportTeam(team.map(p => p.hero), items, ranks);
            const problems = S.arena.validateTeam(p);
            if (problems.length) result.generated.push({tier:t.id,seed,problems});
        }
    }
    for (let seed=1;seed<=200;seed++) {
        for (const ilvl of [1,10,30,60,90]) {
            const its=S.item.rollGear(makeRng(seed), {slots:D.slots.map(x=>x.id),ilvl,rarityWeights:{normal:0,magic:0,rare:1}});
            for(const it of its) {
                result.item_range.items++;
                for(let i=0;i<(it.affixes??[]).length;i++) {
                    const a=it.affixes[i],r=S.item.optionRange(it,i); result.item_range.options++;
                    if(r && !(a.v>=Math.min(r.min,r.max)-1e-10&&a.v<=Math.max(r.min,r.max)+1e-10)) result.item_range.failures.push({seed,ilvl,item:it,option:i,range:r});
                }
            }
        }
    }
    return result;
}

export {S, D, valid, game};
