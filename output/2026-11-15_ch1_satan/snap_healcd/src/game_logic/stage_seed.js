/**
 * 원정 판 장부 — 상태는 세이브가 소유한다. 시간·DOM·전투 RNG를 읽지 않는다.
 * 판은 라운드 승리 때만 소진하고, 미완료 판은 씨앗과 함께 돌려준다.
 */
import { deriveSeed } from './rng.js';

export const STAGE_SEED_VERSION = 1;
export const STAGE_ENCOUNTER_SALT = 0xE11C;
const uint32 = n => Number.isInteger(n) && n >= 0 && n <= 0xFFFFFFFF;
const count = n => Number.isSafeInteger(n) && n >= 0;
const object = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const bad = message => { throw new Error(`stage seeds: ${message}`); };
export const stageDeckKey = (difficulty, stageId, round) => `${difficulty}|${stageId}|${round}`;

// 단 id의 문자 순서도 계약이다. JS 실행 환경에 의존하는 문자열 해시를 쓰지 않는다.
const stringSeed = value => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619) >>> 0;
    return hash;
};
export function stageEncounterSeed(seed, stageId, difficulty, round, no) {
    let root = deriveSeed(seed ^ STAGE_ENCOUNTER_SALT, stageId);
    root = deriveSeed(root, stringSeed(difficulty));
    return deriveSeed(deriveSeed(root, round), no);
}

/** 읽기 전용 제안. 같은 부대의 재출발은 그 부대가 놓을 판도 후보에 넣는다. */
export function planStageSeeds(state, stageId, difficulty, preset, roundCount) {
    const sequence = state.counters.battle + 1;
    if (!count(sequence) || sequence === 0 || !Number.isInteger(preset) || preset < 1) bad('invalid sequence/preset');
    const own = state.runs?.[preset - 1];
    const held = own?.active && own.stageId === stageId && own.difficulty === difficulty ? own.stageSeeds?.rounds : null;
    const rounds = Array.from({ length: roundCount }, (_, i) => {
        const round = i + 1;
        const deck = state.stageDecks?.[stageDeckKey(difficulty, stageId, round)];
        const free = deck?.free?.[0];
        const pending = held?.[i];
        const chosen = pending && (!free || pending.no < free.no) ? pending : free;
        const no = chosen?.no ?? deck?.next ?? 0;
        if (!count(no) || no === Number.MAX_SAFE_INTEGER) bad('exhausted deck');
        return { round, no, seed: chosen?.seed ?? stageEncounterSeed(state.seed, stageId, difficulty, round, no) };
    });
    return { version: STAGE_SEED_VERSION, sequence, preset, stageId, difficulty,
        combatSeed: deriveSeed(state.seed, sequence), rounds };
}

/** 외부 발급값도 같은 판 번호를 받아야 한다. 돌려준 판의 씨앗은 바꿀 수 없다. */
export function validateStageGrant(grant, planned, state) {
    if (!object(grant)) bad('grant must be an object');
    for (const field of ['version', 'sequence', 'preset', 'stageId', 'difficulty'])
        if (grant[field] !== planned[field]) bad(`grant ${field} mismatch`);
    if (!uint32(grant.combatSeed) || !Array.isArray(grant.rounds) || grant.rounds.length !== planned.rounds.length)
        bad('invalid combat seed/rounds');
    for (let i = 0; i < planned.rounds.length; i++) {
        const ticket = grant.rounds[i], expected = planned.rounds[i];
        if (!object(ticket) || ticket.round !== expected.round || ticket.no !== expected.no || !uint32(ticket.seed))
            bad(`invalid round ${i + 1}`);
        const next = state.stageDecks?.[stageDeckKey(planned.difficulty, planned.stageId, i + 1)]?.next ?? 0;
        if (expected.no < next && ticket.seed !== expected.seed) bad(`reissued seed changed in round ${i + 1}`);
    }
}

/** cutRun이 기존 소유권을 돌려준 뒤 호출한다. 검증을 통과한 제안만 이곳에 온다. */
export function reserveStageSeeds(state, grant) {
    for (const ticket of grant.rounds) {
        const key = stageDeckKey(grant.difficulty, grant.stageId, ticket.round);
        const deck = state.stageDecks[key] ?? (state.stageDecks[key] = { next: 0, free: [] });
        if (deck.free[0]?.no === ticket.no) deck.free.shift();
        else if (ticket.no === deck.next) deck.next++;
        else bad(`unavailable ticket ${key}/${ticket.no}`);
    }
}

export function consumeStageRound(slot, round) {
    if (slot?.stageSeeds) slot.stageSeeds.rounds[round - 1] = null;
}

/** 소유권을 지우므로 여러 번 호출해도 중복 반환하지 않는다. */
export function releaseStageSeeds(state, slot) {
    const grant = slot?.stageSeeds;
    if (!grant) return;
    for (let i = 0; i < grant.rounds.length; i++) {
        const ticket = grant.rounds[i];
        if (!ticket) continue;
        const key = stageDeckKey(grant.difficulty, grant.stageId, ticket.round);
        const deck = state.stageDecks[key];
        if (!deck || ticket.no >= deck.next || deck.free.some(t => t.no === ticket.no)) bad(`invalid ownership ${key}`);
        deck.free.push({ no: ticket.no, seed: ticket.seed });
        deck.free.sort((a, b) => a.no - b.no);
        grant.rounds[i] = null;
    }
}

/** 잘못된 장부를 초기화하면 소진한 보상이 되살아난다. 로드는 오류를 드러낸다. */
export function validateStageDecks(state, roundCountOf) {
    if (!object(state.stageDecks)) bad('missing deck ledger');
    const used = new Map();
    const note = (key, no) => {
        const seen = used.get(key) ?? new Set();
        if (seen.has(no)) bad(`duplicate ownership ${key}/${no}`);
        seen.add(no); used.set(key, seen);
    };
    for (const [key, deck] of Object.entries(state.stageDecks)) {
        const pieces = key.split('|');
        if (pieces.length !== 3 || !pieces[0] || !/^\d+$/.test(pieces[1]) || !/^[1-9]\d*$/.test(pieces[2])
            || !object(deck) || !count(deck.next) || !Array.isArray(deck.free)
            || Number(pieces[2]) > (roundCountOf(Number(pieces[1]), pieces[0]) ?? 0)) bad(`invalid deck ${key}`);
        let previous = -1;
        for (const ticket of deck.free) {
            if (!object(ticket) || !count(ticket.no) || ticket.no <= previous || ticket.no >= deck.next || !uint32(ticket.seed))
                bad(`invalid free ticket ${key}`);
            note(key, ticket.no); previous = ticket.no;
        }
    }
    for (const [i, slot] of (state.runs ?? []).entries()) {
        const grant = slot?.stageSeeds;
        if (!grant) {
            if (slot?.active && !slot.legacyStageSeeds) bad('missing active grant');
            continue; // v43 이전에 출발한 판은 이관 뒤 끊기만 한다.
        }
        const roundCount = roundCountOf(slot.stageId, slot.difficulty);
        if (!object(grant) || grant.version !== STAGE_SEED_VERSION || grant.preset !== i + 1
            || grant.stageId !== slot.stageId || grant.difficulty !== slot.difficulty || !count(grant.sequence)
            || grant.sequence === 0 || grant.sequence > state.counters.battle || !uint32(grant.combatSeed)
            || !Array.isArray(grant.rounds) || !roundCount || grant.rounds.length !== roundCount) bad('invalid saved grant');
        const report = state.reports?.find(r => (r.preset ?? 1) === i + 1 && r.at === slot.lastAt && r.stageId === slot.stageId);
        if (slot.active && (!report || !count(report.roundsCleared) || report.roundsCleared >= roundCount))
            bad('missing active round progress');
        for (let r = 0; r < grant.rounds.length; r++) {
            const ticket = grant.rounds[r];
            if (slot.active && (ticket === null) !== (r < report.roundsCleared)) bad('reserved round progress mismatch');
            if (ticket === null) continue;
            const key = stageDeckKey(grant.difficulty, grant.stageId, r + 1);
            const deck = state.stageDecks[key];
            if (!slot.active || !object(ticket) || ticket.round !== r + 1 || !count(ticket.no)
                || !deck || ticket.no >= deck.next || !uint32(ticket.seed)) bad(`invalid reserved ticket ${key}`);
            note(key, ticket.no);
        }
    }
}
