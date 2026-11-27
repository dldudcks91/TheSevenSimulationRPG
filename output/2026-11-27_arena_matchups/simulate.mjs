import fs from 'node:fs';
import { D, SYS, rngMod } from '../2026-11-24_weapon_line_value/harness/boot.mjs';

// Run against the current source, or point WV_SRC at an ES-module copy of src.
// Arguments: experiment, first roster seed, last roster seed, destination CSV.
// Published seed ranges (inclusive): matrix 1-256, gap 257-352, formation
// and shield 501-740, leader 501-884, tag 1101-1164. Ranges may be sharded.
// Write raw shards to a separate directory and give it to analyze.py.
const [experiment, first, last, filename] = process.argv.slice(2);
const { arena, skill, item, hero } = SYS;
const { deriveSeed, makeRng } = rngMod;
const compositions = [
    ['knight', 'archer', 'priest'],
    ['knight', 'mage', 'priest'],
    ['warrior', 'archer', 'priest'],
    ['knight', 'archer', 'archer'],
    ['knight', 'mage', 'mage'],
    ['knight', 'warrior', 'warrior'],
    ['warrior', 'mage', 'archer'],
    ['knight', 'priest', 'priest'],
];
const potion = D.potions.find(p => p.id === 'super_healing');
const loadout = { potions: Array.from({ length: 4 }, () => ({ id: potion.id, heal: potion.heal })), slotMax: 4 };
const lines = ['mode,seed,left,right,variant,condition,win,loss,draw'];

function team(classes, tier, seed, key) {
    const members = arena.rollTierOpponent(tier, makeRng(deriveSeed(seed, key)), [], {
        floorRules: true, heroTier: 'rare', rarityWeights: { rare: 1 },
        party: { heroes: classes.map(cls => ({ cls })) },
    });
    members.forEach((p, i) => { p.uid = p.hero.uid = 'unit-' + key + '-' + i; });
    return members;
}

function record(seed, left, right, variant, condition, a, b, fightSeed, aLoadout = loadout, bLoadout = loadout) {
    let win = 0, loss = 0, draw = 0;
    for (const reverse of [false, true]) {
        const outcome = arena.fight(reverse ? b : a, reverse ? a : b, makeRng(fightSeed),
            reverse ? bLoadout : aLoadout, reverse ? aLoadout : bLoadout);
        if (outcome.reason === 'timeout') draw++;
        else if (!['wipe', 'clear'].includes(outcome.reason)) throw new Error(outcome.reason);
        else if (outcome.won !== reverse) win++;
        else loss++;
    }
    lines.push([experiment, seed, left, right, variant, condition, win, loss, draw].join(','));
}

function matrix(seed, gap) {
    const opponents = compositions.map((c, i) => team(c, 'champion', seed, 500 + i));
    const challengers = gap ? compositions.map((c, i) => team(c, 'diamond', seed, 1500 + i)) : opponents;
    for (let i = 0; i < challengers.length; i++) {
        for (let j = gap ? 0 : i + 1; j < opponents.length; j++) {
            const fightSeed = deriveSeed(seed, 5000 + i * 100 + j);
            record(seed, i, j, '-', '-', challengers[i], opponents[j], fightSeed);
        }
    }
}

// Replace only the knight's starting innate. Both options are first in the
// cast order, have the same trained rank, and keep all six heroes and gear
// unchanged between the two variants against each opposing team.
function withInnate(team, id) {
    const p = team[0];
    const h = { ...p.hero, innate: id, skillOrder: [id], skillLv: { ...p.hero.skillLv } };
    const rank = p.hero.skillLv?.[p.hero.innate] ?? 0;
    delete h.skillLv[p.hero.innate];
    h.skillLv[id] = rank;
    const gear = p.gear.map(item.effective);
    return [{ ...p, hero: h, combat: hero.computeCombat(h, gear),
        actives: skill.activesFor(h, { skillPlus: item.skillPlusOf(p.gear) }), startOrder: 'fixed' }, ...team.slice(1)];
}

function leaderTrial(seed) {
    const attackers = team(['archer', 'knight', 'archer'], 'champion', seed, 44001);
    const defenders = team(compositions[1], 'champion', seed, 44002);
    const mageLeading = [defenders[1], defenders[0], defenders[2]];
    for (const id of ['duel', 'wedge']) {
        // Isolate the targeting rule from the rolled stat lines on the card.
        const rules = SYS.tactic.rulesOf([id]);
        if (rules.length !== 1) throw new Error('Missing card ' + id);
        const kit = { ...loadout, rules };
        for (const [label, target] of [['knight_leader', defenders], ['mage_leader', mageLeading]]) {
            record(seed, '-', '-', id, label, attackers, target, deriveSeed(seed, 44003), kit);
        }
    }
}

function tagTrial(seed) {
    function roster(key) {
        const rng = makeRng(deriveSeed(seed, key));
        const pool = compositions.map((_, i) => i);
        return Array.from({ length: 3 }, (_, slot) => {
            const [id] = pool.splice(Math.floor(rng() * pool.length), 1);
            return { id, party: team(compositions[id], 'champion', seed, key + 1 + slot) };
        });
    }
    const attackers = roster(91000), defenders = roster(92000);
    for (const [i, a] of attackers.entries()) for (const [j, b] of defenders.entries()) {
        for (const [block, label] of ['practice', 'evaluation'].entries()) {
            let win = 0, loss = 0, draw = 0;
            for (let n = 0; n < 12; n++) {
                const rng = makeRng(deriveSeed(seed, 100000 + 1000 * i + 100 * j + 12 * block + n));
                const fight = arena.fight(a.party, b.party, rng, loadout, loadout);
                if (fight.reason === 'timeout') draw++;
                else if (fight.reason === 'clear') win++;
                else if (fight.reason === 'wipe') loss++;
                else throw new Error(fight.reason);
            }
            lines.push([experiment, seed, i, j, a.id + ':' + b.id, label, win, loss, draw].join(','));
        }
    }
}

function skillTrial(seed, formation) {
    const options = formation ? ['kni_charge', 'kni_sweep'] : ['kni_holyshield', 'kni_resistshield'];
    let key = 30000;
    let a;
    do { a = team(compositions[0], 'champion', seed, key++); } while (options.includes(a[0].hero.bookSkill));
    const defenders = formation ? [team(compositions[5], 'champion', seed, 40001)] :
        [team(compositions[3], 'champion', seed, 40002), team(compositions[4], 'champion', seed, 40003)];
    const fightSeed = deriveSeed(seed, 45000);
    for (const id of options) {
        const attack = withInnate(a, id);
        for (let j = 0; j < 2; j++) {
            const target = formation ? defenders[0].map((p, i) => ({ ...p, rank: j === 1 || i === 0 ? 0 : 1 })) : defenders[j];
            const condition = formation ? ['one_front', 'three_front'][j] : ['two_archers', 'two_mages'][j];
            record(seed, 0, '-', id, condition, attack, target, fightSeed);
        }
    }
}

for (let seed = Number(first); seed <= Number(last); seed++) {
    if (experiment === 'matrix' || experiment === 'gap') matrix(seed, experiment === 'gap');
    else if (experiment === 'formation' || experiment === 'shield') skillTrial(seed, experiment === 'formation');
    else if (experiment === 'leader') leaderTrial(seed);
    else if (experiment === 'tag') tagTrial(seed);
    else throw new Error('Unknown experiment: ' + experiment);
}
fs.writeFileSync(filename, lines.join('\n') + '\n');
