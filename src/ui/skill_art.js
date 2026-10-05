/** 기본 직업 스킬의 이미지 연출 — 사건 · 그림 · 움직임 (ADR-0515 · ADR-0520 · ADR-0528).
 * 게임 로직과 슬롯 아이콘은 이 표를 모른다. 그림이 준비되지 않으면
 * fx.js가 skill_looks.js의 기존 조각 조합을 표시한다.
 */
export const SKILL_ART = {
    war_bash: { hit: { file: 'war_bash', motion: 'slash', size: 92, duration: 360 } },
    war_doubleswing: { hit: { file: 'war_doubleswing', motion: 'cross', size: 90, duration: 400 } },
    war_quake: { hit: { file: 'war_quake', motion: 'ground', size: 96, duration: 480, quake: true } },
    war_leap: { hit: { file: 'war_leap', motion: 'land', size: 94, duration: 460, quake: true } },
    war_taunt: { buff: { file: 'war_taunt', motion: 'inward', size: 90, duration: 540 } },
    war_shout: { buff: { file: 'war_shout', motion: 'wave', size: 90, duration: 580 } },
    war_battleorders: { buff: { file: 'war_battleorders', motion: 'orders', size: 88, duration: 580 } },
    war_ironskin: { buff: { file: 'war_ironskin', motion: 'shell', size: 94, duration: 540 } },

    // 기사 — 스마이트는 물리 충돌, 인챈트는 실제 추가 피해인 화염이다.
    kni_smite: { hit: { file: 'kni_smite', motion: 'burst', size: 88, duration: 360 } },
    kni_holyshield: { buff: { file: 'kni_holyshield', motion: 'shell', size: 92, duration: 540 } },
    kni_charge: { hit: { file: 'kni_charge', motion: 'thrust', size: 88, duration: 360 } },
    kni_rush: { hit: { file: 'kni_rush', motion: 'thrust', size: 84, duration: 340 } },
    kni_duel: {
        bad: { file: 'kni_duel', motion: 'inward', size: 86, duration: 520 },
        buff: { file: 'kni_duel_guard', motion: 'shell', size: 90, duration: 540 },
    },
    kni_enchant: { buff: { file: 'kni_enchant', motion: 'orders', size: 88, duration: 540 } },
    // 상시 오오라의 그림은 도감에서만 재생한다(fxBuff의 until: null 제외).
    kni_might: { buff: { file: 'kni_might', motion: 'wave', size: 88, duration: 560 } },
    kni_fanaticism: { buff: { file: 'kni_fanaticism', motion: 'orders', size: 86, duration: 420 } },
    kni_defiance: { buff: { file: 'kni_defiance', motion: 'shell', size: 92, duration: 540 } },

    // 마법사 — 불 · 냉기 · 번개 · 집중 · 얼음 벽 소환.
    mag_fireball: { hit: { file: 'mag_fireball', motion: 'burst', size: 90, duration: 420 } },
    mag_inferno: { hit: { file: 'mag_inferno', motion: 'pillar', size: 94, duration: 500 } },
    mag_iceblast: { hit: { file: 'mag_iceblast', motion: 'burst', size: 88, duration: 420 } },
    mag_frostnova: { hit: { file: 'mag_frostnova', motion: 'wave', size: 94, duration: 480 } },
    mag_lightning: { hit: { file: 'mag_lightning', motion: 'strike', size: 88, duration: 340 } },
    mag_chain: { hit: { file: 'mag_chain', motion: 'thrust', size: 90, duration: 360 } },
    mag_focus: { buff: { file: 'mag_focus', motion: 'orbit', size: 88, duration: 620 } },
    mag_frozenwall: { call: { file: 'mag_frozenwall', motion: 'pillar', size: 94, duration: 560 } },

    // 궁수 — 단발 · 연사 · 광역 · 유도 · 관통 · 독 강화.
    arc_snipe: { hit: { file: 'arc_snipe', motion: 'thrust', size: 84, duration: 340 } },
    arc_rapid: { hit: { file: 'arc_rapid', motion: 'thrust', size: 84, duration: 340 } },
    arc_multishot: { hit: { file: 'arc_multishot', motion: 'rain', size: 90, duration: 440 } },
    arc_guided: { hit: { file: 'arc_guided', motion: 'thrust', size: 88, duration: 400 } },
    arc_pierce: { buff: { file: 'arc_pierce', motion: 'sweep', size: 90, duration: 520 } },
    arc_poison: { buff: { file: 'arc_poison', motion: 'orders', size: 88, duration: 580 } },

    // 사제 — 성광 · 회복 · 강화 · 그림자 약화.
    pri_judgment: { hit: { file: 'pri_judgment', motion: 'strike', size: 94, duration: 480 } },
    pri_heal: { heal: { file: 'pri_heal', motion: 'heal', size: 88, duration: 640 } },
    pri_grace: { buff: { file: 'pri_grace', motion: 'sweep', size: 88, duration: 580 } },
    pri_haste: { buff: { file: 'pri_haste', motion: 'orders', size: 84, duration: 400 } },
    pri_cure: { heal: { file: 'pri_cure', motion: 'burst', size: 88, duration: 520 } },
    pri_regen: { buff: { file: 'pri_regen', motion: 'heal', size: 88, duration: 820 } },
    pri_penitence: { bad: { file: 'pri_penitence', motion: 'sink', size: 90, duration: 620 } },
    pri_bind: { bad: { file: 'pri_bind', motion: 'inward', size: 90, duration: 580 } },
};
