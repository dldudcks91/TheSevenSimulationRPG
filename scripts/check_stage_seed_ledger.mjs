/**
 * Independent randomized invariant check for the pure stage-seed ledger.
 * Usage: node scripts/check_stage_seed_ledger.mjs [steps-per-seed]
 * The browser project has no Node package type; data URLs load the two real ESM
 * sources without changing its runtime configuration or copying production code.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const rngURL = asModule(await readFile(new URL('../src/game_logic/rng.js', import.meta.url), 'utf8'));
const stageSource = await readFile(new URL('../src/game_logic/stage_seed.js', import.meta.url), 'utf8');
assert.equal(stageSource.split("from './rng.js'").length, 2, 'stage module import contract changed');
const ledger = await import(asModule(stageSource.replace("from './rng.js'", `from '${rngURL}'`)));

const STEPS = Number(process.argv[2] ?? 2000);
assert.ok(Number.isSafeInteger(STEPS) && STEPS > 0 && STEPS <= 100000, 'steps must be 1..100000');
const STAGES = new Map([[1011, 9], [1013, 9], [1051, 1], [2011, 3]]);
const DIFFICULTIES = ['normal', 'nightmare', 'hell'];
const roundCountOf = (id, difficulty) => DIFFICULTIES.includes(difficulty) ? STAGES.get(id) ?? null : null;
const copy = value => JSON.parse(JSON.stringify(value));
const encode = value => JSON.stringify(value);
// Deliberately different from the production generator and derivation function.
const generator = seed => {
    let value = seed >>> 0;
    return () => {
        value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
        return value >>> 0;
    };
};

function exercise(seed) {
    const random = generator(seed), pick = values => values[random() % values.length];
    let state = { seed, counters: { battle: 0 }, stageDecks: {}, runs: [null, null, null], reports: [] };
    // Each independently recorded issued ticket has one explicit lifecycle state.
    // Spent tickets are never inferred from gaps in the production ledger.
    const model = new Map(), squads = [null, null, null];
    const spentTickets = new Set(), seenSeeds = new Map();
    const counts = { departed: 0, wonRounds: 0, cleared: 0, released: 0, snapshots: 0, rejected: 0, reissued: 0, externallySeeded: 0 };
    const keyOf = (stageId, difficulty, round) => `${difficulty}|${stageId}|${round}`;
    const currentReport = preset => state.reports.find(report => report.preset === preset && report.at === state.runs[preset - 1]?.lastAt);
    const target = () => ({ stageId: pick([...STAGES.keys()]), difficulty: pick(DIFFICULTIES) });

    const release = preset => {
        const slot = state.runs[preset - 1], squad = squads[preset - 1];
        if (!slot?.active) return;
        ledger.releaseStageSeeds(state, slot);
        for (const ticket of squad.tickets) {
            if (!ticket) continue;
            const records = model.get(keyOf(squad.stageId, squad.difficulty, ticket.round));
            const record = records[ticket.no];
            assert.equal(record.status, 'reserved'); assert.equal(record.owner, preset);
            record.status = 'free'; record.owner = null;
        }
        squad.tickets.fill(null); squad.active = false;
        slot.active = false;
        currentReport(preset).reason = 'retreat';
        counts.released++;
        const after = encode(state);
        ledger.releaseStageSeeds(state, slot);
        assert.equal(encode(state), after, 'second release changed state');
    };

    const start = (preset, stageId, difficulty) => {
        const before = encode(state), total = STAGES.get(stageId);
        const planned = ledger.planStageSeeds(state, stageId, difficulty, preset, total);
        assert.equal(encode(state), before, 'planning mutated state');
        assert.deepEqual(ledger.planStageSeeds(state, stageId, difficulty, preset, total), planned, 'planning is unstable');
        assert.equal(planned.sequence, state.counters.battle + 1);
        // Reference allocation scans complete ticket histories for eligible owners,
        // rather than reading next/free or reproducing the production plan code.
        for (const ticket of planned.rounds) {
            const records = model.get(keyOf(stageId, difficulty, ticket.round)) ?? [];
            const eligible = records.findIndex(record => record.status === 'free' || (record.status === 'reserved' && record.owner === preset));
            assert.equal(ticket.no, eligible >= 0 ? eligible : records.length, 'did not choose lowest available board');
            const old = records[ticket.no];
            if (old) {
                assert.notEqual(old.status, 'spent', 'spent board was reissued');
                assert.equal(ticket.seed, old.seed, 'reissued board changed seed');
            }
        }
        const grant = copy(planned);
        if (random() % 2 === 0) {
            grant.combatSeed = random();
            for (const ticket of grant.rounds) {
                if (!model.get(keyOf(stageId, difficulty, ticket.round))?.[ticket.no]) {
                    ticket.seed = pick([0, 0xFFFFFFFF, random()]);
                    counts.externallySeeded++;
                }
            }
        }
        ledger.validateStageGrant(grant, planned, state);
        assert.equal(encode(state), before, 'grant validation mutated state');
        release(preset);
        ledger.reserveStageSeeds(state, grant);
        state.counters.battle = grant.sequence;
        state.runs[preset - 1] = { stageId, difficulty, active: true, preset, lastAt: grant.sequence, stageSeeds: copy(grant) };
        state.reports = state.reports.filter(report => report.preset !== preset);
        state.reports.push({ stageId, difficulty, preset, at: grant.sequence, roundsCleared: 0, reason: null });
        squads[preset - 1] = { stageId, difficulty, active: true, sequence: grant.sequence, tickets: copy(grant.rounds) };
        for (const ticket of grant.rounds) {
            const key = keyOf(stageId, difficulty, ticket.round);
            const identity = `${key}/${ticket.no}`;
            assert.ok(!spentTickets.has(identity), 'spent board appeared in a new grant');
            if (seenSeeds.has(identity)) assert.equal(ticket.seed, seenSeeds.get(identity), 'seen board changed seed');
            else seenSeeds.set(identity, ticket.seed);
            let records = model.get(key);
            if (!records) model.set(key, records = []);
            let record = records[ticket.no];
            if (record) {
                assert.equal(record.status, 'free'); assert.equal(record.seed, ticket.seed);
                counts.reissued++;
            } else {
                assert.equal(ticket.no, records.length);
                record = { seed: ticket.seed, status: 'free', owner: null };
                records.push(record);
            }
            record.status = 'reserved'; record.owner = preset;
        }
        counts.departed++;
    };

    const win = preset => {
        const slot = state.runs[preset - 1], squad = squads[preset - 1];
        if (!slot?.active) return;
        const report = currentReport(preset), round = report.roundsCleared + 1;
        const ticket = squad.tickets[round - 1];
        const key = keyOf(squad.stageId, squad.difficulty, round), identity = `${key}/${ticket.no}`;
        const record = model.get(key)[ticket.no];
        assert.equal(record.status, 'reserved'); assert.equal(record.owner, preset);
        assert.ok(!spentTickets.has(identity), 'one board won twice');
        spentTickets.add(identity);
        record.status = 'spent'; record.owner = null;
        squad.tickets[round - 1] = null;
        ledger.consumeStageRound(slot, round);
        report.roundsCleared++;
        counts.wonRounds++;
        if (round === STAGES.get(slot.stageId)) {
            const before = encode(state);
            ledger.releaseStageSeeds(state, slot);
            assert.equal(encode(state), before, 'completed run returned a spent board');
            slot.active = false; squad.active = false; report.reason = 'clear';
            counts.cleared++;
        }
    };

    const check = () => {
        ledger.validateStageDecks(state, roundCountOf);
        assert.equal(Object.keys(state.stageDecks).length, model.size, 'deck silently created or lost');
        const liveOwners = new Map();
        for (let i = 0; i < squads.length; i++) {
            const slot = state.runs[i], squad = squads[i];
            if (!squad) { assert.equal(slot, null); continue; }
            assert.equal(slot.active, squad.active);
            assert.equal(slot.stageSeeds.sequence, squad.sequence);
            assert.deepEqual(slot.stageSeeds.rounds, squad.tickets, 'reservation differs from reference ownership');
            for (const ticket of slot.stageSeeds.rounds) {
                if (!ticket) continue;
                const key = keyOf(slot.stageId, slot.difficulty, ticket.round);
                const owned = liveOwners.get(key) ?? new Map();
                assert.ok(!owned.has(ticket.no), 'two squads share a board');
                owned.set(ticket.no, { owner: i + 1, seed: ticket.seed }); liveOwners.set(key, owned);
            }
        }
        for (const [key, records] of model) {
            const deck = state.stageDecks[key];
            assert.equal(deck.next, records.length, 'issued board was skipped or lost');
            const free = new Map(deck.free.map(ticket => [ticket.no, ticket.seed]));
            assert.equal(free.size, deck.free.length, 'free list duplicates');
            for (let no = 0; no < records.length; no++) {
                const record = records[no], reserved = liveOwners.get(key)?.get(no);
                const identity = `${key}/${no}`;
                assert.equal(seenSeeds.get(identity), record.seed, 'ticket seed history was changed');
                assert.equal(spentTickets.has(identity), record.status === 'spent', 'spent history differs from reference status');
                const partitionCount = Number(free.has(no)) + Number(!!reserved) + Number(spentTickets.has(identity));
                assert.equal(partitionCount, 1, `${key}/${no} is lost, duplicated, or spent and available`);
                if (record.status === 'free') assert.equal(free.get(no), record.seed, 'free seed changed');
                if (record.status === 'reserved') assert.deepEqual(reserved, { owner: record.owner, seed: record.seed });
            }
        }
    };

    const reject = preset => {
        const slot = state.runs[preset - 1];
        const { stageId, difficulty } = slot?.active ? slot : target();
        const before = encode(state);
        const planned = ledger.planStageSeeds(state, stageId, difficulty, preset, STAGES.get(stageId));
        const grant = copy(planned);
        const recycled = grant.rounds.find(ticket => model.get(keyOf(stageId, difficulty, ticket.round))?.[ticket.no]);
        if (recycled && random() % 2) recycled.seed = (recycled.seed + 1) >>> 0;
        else {
            switch (random() % 5) {
                case 0: grant.sequence++; break;
                case 1: grant.rounds.pop(); break;
                case 2: grant.rounds[0].no++; break;
                case 3: grant.rounds[0].seed = 0x100000000; break;
                case 4: grant.combatSeed = 0.5; break;
            }
        }
        assert.throws(() => ledger.validateStageGrant(grant, planned, state), /stage seeds:/);
        assert.equal(encode(state), before, 'rejected grant changed state');
        counts.rejected++;
    };

    // Always exercise contention, restart of the current owner, and reuse first.
    for (let preset = 1; preset <= 3; preset++) start(preset, 1011, 'normal');
    start(1, 1011, 'normal'); win(2); release(1); start(3, 1011, 'normal'); check();
    for (let step = 0; step < STEPS; step++) {
        try {
            const preset = 1 + random() % 3, operation = random() % 100;
            if (operation < 30) {
                const slot = state.runs[preset - 1];
                const { stageId, difficulty } = slot?.active && random() % 2 ? slot : target();
                start(preset, stageId, difficulty);
            } else if (operation < 72) win(preset);
            else if (operation < 84) release(preset);
            else if (operation < 92) {
                const raw = encode(state), back = JSON.parse(raw);
                ledger.validateStageDecks(back, roundCountOf);
                assert.equal(encode(back), raw, 'save validation mutated the snapshot');
                state = back;
                counts.snapshots++;
                // Some reconnects stop all active squads; others only round-trip.
                if (random() % 3 === 0) for (let no = 1; no <= 3; no++) release(no);
            } else reject(preset);
            check();
        } catch (error) {
            throw new Error(`ledger stress seed=${seed} step=${step}: ${error.message}`, { cause: error });
        }
    }
    for (let preset = 1; preset <= 3; preset++) release(preset);
    check();
    const issued = [...model.values()].reduce((sum, records) => sum + records.length, 0);
    const spent = [...model.values()].flat().filter(record => record.status === 'spent').length;
    assert.equal(seenSeeds.size, issued, 'seen ticket history has gaps');
    assert.equal(spentTickets.size, spent, 'spent set has gaps');
    assert.equal(spent, counts.wonRounds, 'spent history differs from independently recorded victories');
    assert.ok(counts.reissued > 0 && counts.snapshots > 0 && counts.rejected > 0 && counts.externallySeeded > 0);
    return { seed, steps: STEPS, decks: model.size, issued, spent, ...counts };
}

const results = [0x1BADB002, 0xC0FFEE, 0xFFFFFFFF].map(exercise);
console.log(JSON.stringify({ ok: true, totalRandomSteps: STEPS * results.length, results }, null, 2));
