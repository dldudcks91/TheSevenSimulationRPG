/** Conditional ring bonuses, added by tag and effect. Pure; shared by previews and combat. */
export function skillTagBonus(bonuses, def, effect) {
    const tags = new Set([...(def?.derived ?? []), ...(def?.tags ?? [])]);
    let value = 0;
    for (const tag of tags) value += bonuses?.[tag]?.[effect] ?? 0;
    return value;
}

export function enhanceSkillLine(line, def, bonuses) {
    if (!bonuses || !Object.keys(bonuses).length) return line;
    const value = skillTagBonus(bonuses, def, 'value');
    const out = { ...line };
    if (line.effect === 'hit') out.tagDamage = skillTagBonus(bonuses, def, 'damage');
    if (line.effect === 'heal' || line.effect === 'mend') out.tagHeal = skillTagBonus(bonuses, def, 'heal');
    if (line.effect === 'apply') {
        out.tagDuration = skillTagBonus(bonuses, def, 'duration');
        if (value && Number.isFinite(line.value)) out.value = line.value * (1 + value);
        if (line.hit && value) out.hit = { ...line.hit, value: line.hit.value * (1 + value) };
    }
    return out;
}
