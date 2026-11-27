// Run by build_demo.py in a private directory extracted from its final ZIP.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = pathToFileURL(resolve(process.argv[2]) + '/');
const scope = JSON.parse(process.argv[3]);
globalThis.location = new URL('http://localhost/');
globalThis.fetch = async name => ({ ok: true, text: () => readFile(new URL(name, root), 'utf8') });
const loader = await import(new URL('ui/data.js', root));
const { makeRng } = await import(new URL('game_logic/rng.js', root));
const data = await loader.loadData();
const { game, hero, battle } = loader.SYS;
assert.deepEqual(data.difficultyList.map(d => d.id), Object.keys(scope));
const chapters = Array.from({ length: scope.normal }, (_, i) => i + 1);
assert.deepEqual(data.chapterList.map(ch => ch.id), chapters);
assert.deepEqual([...new Set(data.stageList.map(s => s.chapter))], chapters);
for (const d of data.difficultyList) assert.equal(d.lastChapter, scope[d.id]);
const i18n = await import(new URL('ui/i18n.js', root));
const { catalogFor, needsCatalog } = await import(new URL('ui/locales.js', root));
globalThis.document = { documentElement: {} };
const base = ['ko', 'en', 'zh'];
for (const code of i18n.LANGS.filter(code => !base.includes(code))) {
    assert.ok(needsCatalog(code), 'Missing loader for ' + code);
    await i18n.setLang(code);
    const catalog = catalogFor(code);
    assert.equal(i18n.lang(), code);
    assert.ok(Object.keys(catalog.ui).every(i18n.has), 'Unexpected localization key in ' + code);
    for (const [key] of i18n.dictEntries()) {
        if (!key.startsWith('help.')) assert.ok(Object.hasOwn(catalog.ui, key), 'Missing ' + code + ': ' + key);
    }
    const editionHelp = i18n.t('help.expedition.difficulty.body');
    assert.deepEqual(editionHelp.match(/\d+/g)?.map(Number), Object.values(scope),
        'Incorrect published chapters in ' + code);
    for (const d of data.difficultyList) {
        const term = catalog.data[d.name.ko + '\t' + d.name.en];
        assert.ok(term, 'Missing difficulty translation in ' + code);
        assert.equal(i18n.L(d.name), term);
    }
    assert.equal(catalog.data['헬\tHell'], undefined);
    if (!scope.nightmare) assert.equal(catalog.data['나이트메어\tNightmare'], undefined);
}
await i18n.setLang('ko');
const state = game.newGame(7321, hero.rollStartParty(makeRng(17), data.balance.party_size_max), 1000);
assert.ok(game.canLoad(game.serialize(state, 1000)));
assert.ok(game.stageUnlocked(state, data.stageOrder[0], 'normal'));
if (scope.nightmare) assert.equal(game.selectDifficulty(state, 'nightmare').ok, false);
assert.equal(game.selectDifficulty(state, 'hell').ok, false);
// Skip the hours of leveling while exercising boss settlement and the resulting unlock in the real engine.
for (const member of state.heroes) {
    member.level = data.balance.hero_level_cap;
    for (const stat of Object.keys(member.stats)) member.stats[stat] = 10000;
}
for (const [diff, last] of Object.entries(scope)) {
    assert.ok(game.selectDifficulty(state, diff).ok);
    const publicStages = data.stageList.filter(s => s.chapter <= last);
    const boss = publicStages.at(-1);
    const preceding = publicStages.slice(0, -1).map(s => s.stage_id);
    if (diff === 'normal') state.progress.cleared = preceding;
    else state.progress.clearedIn[diff] = preceding;
    assert.equal(boss.boss_grade, 'chapter_boss');
    assert.ok(game.canLoad(game.serialize(state, 1000)));
    const result = game.resolveBattle(state, boss.stage_id, diff === 'normal' ? 4000 : 86404000, 1, diff);
    assert.ok(result.ok, JSON.stringify(result.err));
    assert.equal(result.report.won, true, 'Last public boss must be beatable and settle');
    assert.ok(game.stageCleared(state, boss.stage_id, diff));
    const nextChapter = last + 1;
    const nextStage = nextChapter * 1000 + 11;
    assert.equal(game.stageUnlocked(state, nextStage, diff), false);
    assert.equal(game.departRun(state, nextStage, 4000, 1, null, diff).ok, false);
    assert.throws(() => game.stageSeedRequest(state, nextStage, 1, diff));
    assert.equal(game.exploreTicketParse(game.exploreTicketKey(nextChapter, diff, data.exploreGrades[0].grade_id)), null);
    for (const stage of data.stageList.filter(s => s.chapter > last)) {
        assert.equal(game.stageUnlocked(state, stage.stage_id, diff), false);
        assert.equal(game.departRun(state, stage.stage_id, 4000, 1, null, diff).ok, false);
        assert.throws(() => game.stageSeedRequest(state, stage.stage_id, 1, diff));
        assert.equal(game.exploreTicketParse(game.exploreTicketKey(stage.chapter, diff, data.exploreGrades[0].grade_id)), null);
    }
}
assert.equal(Object.hasOwn(battle, 'debuffOf'), false);
assert.equal(Object.hasOwn(data, 'chapterDebuffs'), false);
for (const d of data.difficultyList)
    for (const key of ['gearIlvlFixed', 'levelAdd', 'chapterGate']) assert.equal(Object.hasOwn(d, key), false);
for (const ch of data.chapterList) {
    const st = data.stageList.find(s => s.chapter === ch.id);
    const trap = battle.ruinsTrapOf(st.stage_id);
    assert.ok(trap);
    assert.deepEqual(trap, data.ruinsTraps.find(r => r.chapter === ch.id));
    assert.equal(game.stageLevel(st.stage_id, 'normal'), Math.min(st.dlvl, data.balance.hero_level_cap));
}
// A normal expedition and a ruins trap in the same area must still play differently.
const poisonTrap = data.ruinsTraps.find(r => r.effect === 'poison');
if (poisonTrap) {
    const stage = data.stageList.find(s => s.chapter === poisonTrap.chapter);
    const fresh = game.newGame(500, hero.rollStartParty(makeRng(123), 3), 1000);
    const members = game.partyOf(fresh).map(uid => ({ uid, combat: {
        ...game.heroCombat(fresh, game.heroById(fresh, uid)),
        hp_max: 100000, atk_physical: { min: 5, max: 5 }, atk_magic: undefined,
        attack_type: 'physical', basic_attack: true,
    } }));
    function encounter(rules) {
        const run = battle.createRun(members, stage.stage_id, makeRng(37), stage.dlvl,
            null, data.balance.potion_slot_max, null, 'normal', null, null, { round: { type: 'normal' }, ...rules });
        while (run.next()?.ended === false) {}
        return run.result.timeline;
    }
    const plain = encounter({});
    assert.deepEqual(encounter({ curseDiff: 'hell' }), plain);
    assert.notDeepEqual(encounter({ ruinsTrap: true }), plain);
}
for (const f of data.endlessFloors) {
    assert.ok(Object.hasOwn(scope, f.difficulty_id));
    assert.ok(data.stages[f.stage_id].chapter <= scope[f.difficulty_id]);
}
assert.equal(loader.SYS.raid, undefined);
assert.equal(game.canLoad({ ...game.serialize(state, 90000000), progress: { ...state.progress, clearedIn: { hell: [1011] } } }), false);
for (const s of data.stageList)
    assert.equal(Boolean(s.dlvl_nightmare), s.chapter <= (scope.nightmare ?? 0));
for (const m of Object.values(data.monsters))
    if (m.chapter > (scope.nightmare ?? 0)) assert.ok(!m.nightmare_skill);
assert.ok(data.stageTacticRows.every(r => r.chapter <= (scope.nightmare ?? 0)));
