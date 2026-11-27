/** Rules for expedition chapter curses. Ruins encounters supply their own traps. */
export function readChapterDebuffs(rows, traps) {
    return rows.map(r => {
        const trap = traps.find(x => x.chapter === r.trap_chapter);
        if (!trap) throw new Error(`chapter_debuff.csv: missing trap ${r.trap_chapter}`);
        return { ...trap, chapter: r.chapter, difficultyId: r.difficulty_id };
    });
}

export function chapterDebuffLookup(data, diffOf, ruinsTrapOf, validateEffects) {
    const rows = data.chapterDebuffs ?? [];
    const bossMult = data.balance.chapter_debuff_boss_mult;
    if (rows.length && !(typeof bossMult === 'number' && bossMult > 0))
        throw new Error(`battle: chapter_debuff_boss_mult '${bossMult}' — 양수여야 한다 (balance.csv)`);
    for (const row of rows) {
        if (!data.difficulties?.some(d => d.id === row.difficultyId))
            throw new Error(`chapter_debuff.csv: unknown difficulty ${row.difficultyId}`);
    }
    validateEffects(rows, x => `${x.difficultyId} ${x.chapter}`, 'chapter_debuff.csv');
    return function debuffOf(stageId, difficulty = null, ruinsTrap = false) {
        const stage = data.stages[stageId], d = diffOf(difficulty);
        if (!stage || !d) return null;
        const row = ruinsTrap ? ruinsTrapOf(stageId) : rows.find(x => x.difficultyId === d.id && x.chapter === stage.chapter);
        if (!row) return null;
        const boss = !ruinsTrap && stage.boss_grade === 'chapter_boss';
        return { sin: row.sin, effect: row.effect, value: boss ? row.value * bossMult : row.value,
            intervalSec: row.intervalSec, durationSec: row.durationSec, cap: row.cap, boss };
    };
}
