/** Conditional ring bonuses, added by tag and effect. Pure; shared by previews and combat. */
export function skillTagBonus(bonuses, def, effect) {
    // 원소 태그(의사) `el:<원소>`(skill.js `elTags` · 2026-11-13 R471)도 센다 — 전직 공통 줄 「냉기 스킬 쿨타임 감소」
    const tags = new Set([...(def?.derived ?? []), ...(def?.tags ?? []), ...(def?.elTags ?? [])]);
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
        // 오오라 피해 창(`pulse` — 인페르노 · 홀리 파이어)은 간격마다 적 전원을 치는 피해다 — 태그 데미지를 창이 들고 틱이 데미지 % 괄호에 더한다 (2026-11-13 R462)
        if (line.stat === 'pulse') out.tagDamage = skillTagBonus(bonuses, def, 'damage');
        if (value && Number.isFinite(line.value)) out.value = line.value * (1 + value);
        if (line.hit && value) out.hit = { ...line.hit, value: line.hit.value * (1 + value) };
    }
    return out;
}
