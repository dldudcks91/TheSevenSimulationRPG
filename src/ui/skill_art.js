/** 단일 다단은 타격마다 해당 칼날 또는 투사체 한 줄을 드러낸다. */
const X_BLADES = [
    { mask: 'linear-gradient(45deg, transparent 33%, #000 41%, #000 55%, transparent 63%)', mx: '-14px', my: '-14px' },    // 「\」 — 왼쪽 위에서 그어 내린다
    { mask: 'linear-gradient(135deg, transparent 37%, #000 45%, #000 59%, transparent 67%)', mx: '14px', my: '-14px' },    // 「/」 — 오른쪽 위에서 그어 내린다
];
const THREE_ARROWS = [{ ct: '0%', cb: '66%' }, { ct: '33%', cb: '33%' }, { ct: '66%', cb: '0%' }];
/* 러시 — 창끝 둘이 위아래로 나란한 그림을 창 하나씩 · `jitter` 가 타마다 각도(r 도) · 자리(x · y px)를 무작위로 흔들고 위 · 아래 창도 무작위로 고른다 (ADR-0780) */
const TWO_SPEARS = [{ ct: '0%', cb: '57%' }, { ct: '43%', cb: '0%' }];

export const SKILL_ART = {
    // job warrior
    war_bash: { hit: { file: 'war_bash', motion: 'slash', size: 92, duration: 360 } },
    war_doubleswing: { hit: { file: 'war_doubleswing', motion: 'swing', size: 90, duration: 400, beat: 130, parts: X_BLADES } },
    war_recovery: { heal: { file: 'war_recovery', motion: 'heal', size: 88, duration: 640 } },
    war_leap: { hit: { file: 'war_leap', motion: 'land', size: 94, duration: 460, quake: true } },
    war_shout: { buff: { file: 'war_shout', motion: 'shout', size: 116, ay: .45, duration: 760, pulses: 2, beat: 85 } },
    war_battleorders: { buff: { file: 'war_battleorders', motion: 'shout', size: 116, ay: .45, duration: 760, pulses: 2, beat: 105 } },
    war_ironskin: { buff: { file: 'war_ironskin', motion: 'shell', size: 94, duration: 540 } },
    war_frenzy: { buff: { file: 'war_frenzy', motion: 'orders', size: 90, duration: 560 } },
    war_warcry: { bad: { file: 'war_warcry', motion: 'shout', size: 116, ay: .45, duration: 760, pulses: 2, beat: 75 } },
    war_battlecry: { bad: { file: 'war_battlecry', motion: 'shout', size: 116, ay: .45, duration: 760, pulses: 2, beat: 85 } },

    // job knight
    kni_resistshield: { buff: { file: 'kni_resistshield', motion: 'shell', size: 92, duration: 540 } },
    kni_holyshield: { buff: { file: 'kni_holyshield', motion: 'shell', size: 92, duration: 540 } },
    kni_charge: { hit: { file: 'kni_charge', motion: 'thrust', size: 88, duration: 360 } },
    kni_rush: { hit: { file: 'kni_rush', motion: 'thrust', size: 84, duration: 340, beat: 110, parts: TWO_SPEARS, jitter: { r: 70, x: 26, y: 26 }, preview: 4 } },
    kni_enchant: { buff: { file: 'kni_enchant', motion: 'orders', size: 88, duration: 540 } },
    kni_might: { buff: { file: 'kni_might', motion: 'orbit', size: 90, duration: 620 } },
    kni_fanaticism: { buff: { file: 'kni_fanaticism', motion: 'orbit', size: 90, duration: 620 } },
    kni_defiance: { buff: { file: 'kni_defiance', motion: 'orbit', size: 90, duration: 620 } },
    kni_sweep: { hit: { file: 'kni_sweep', motion: 'sweep', size: 94, duration: 420 } },
    kni_holyfire: { buff: { file: 'kni_holyfire', motion: 'orbit', size: 90, duration: 620 } },

    // job archer
    arc_snipe: { hit: { file: 'arc_snipe', motion: 'thrust', size: 84, duration: 340 } },
    arc_rapid: { hit: { file: 'arc_rapid', motion: 'thrust', size: 84, duration: 340, beat: 90, parts: THREE_ARROWS } },
    arc_multishot: { hit: { file: 'arc_multishot', motion: 'rain', size: 90, duration: 440 } },
    arc_guided: { hit: { file: 'arc_guided', motion: 'thrust', size: 88, duration: 400 } },
    arc_pierce: { buff: { file: 'arc_pierce', motion: 'sweep', size: 90, duration: 520 } },
    arc_poison: { buff: { file: 'arc_poison', motion: 'orders', size: 88, duration: 580 } },
    arc_coldarrow: { buff: { file: 'arc_coldarrow', motion: 'orders', size: 88, duration: 560 } },
    arc_evade: { buff: { file: 'arc_evade', motion: 'sweep', size: 88, duration: 520 } },
    arc_quickhands: { buff: { file: 'arc_quickhands', motion: 'sweep', size: 84, duration: 420 } },
    arc_eagleeye: { buff: { file: 'arc_eagleeye', motion: 'inward', size: 88, duration: 580 } },

    // job mage
    mag_fireball: { hit: { file: 'mag_fireball', motion: 'burst', size: 90, duration: 420 } },
    mag_inferno: { bad: { file: 'mag_inferno', motion: 'pillar', size: 94, duration: 500 } },
    mag_iceblast: { hit: {
        file: 'mag_iceblast', motion: 'fall', size: 110, anchor: [.5, .91], targetY: .61, duration: 260,
        then: { file: 'mag_iceblast_shatter', motion: 'shatter', size: 110, anchor: [.5, .91], targetY: .61, duration: 380 },
    } },
    mag_frostnova: { hit: { file: 'mag_frostnova', motion: 'wave', size: 94, duration: 480 } },
    mag_lightning: { hit: { file: 'mag_lightning', motion: 'bolt', size: 124, ay: .9, duration: 380 } },
    mag_chain: { hit: { file: 'mag_chain', motion: 'thrust', size: 90, duration: 360 } },
    mag_ignite: { buff: { file: 'mag_ignite', motion: 'orders', size: 90, duration: 560 } },
    mag_deepfreeze: { buff: { file: 'mag_deepfreeze', motion: 'shell', size: 92, duration: 560 } },
    mag_surge: { buff: { file: 'mag_surge', motion: 'wave', size: 90, duration: 520 } },
    mag_echo: { buff: { file: 'mag_echo', motion: 'wave', size: 90, duration: 660 } },

    // job priest
    pri_judgment: { hit: { file: 'pri_judgment', motion: 'strike', size: 94, duration: 480 } },
    pri_heal: { heal: { file: 'pri_heal', motion: 'heal', size: 88, duration: 640 } },
    pri_grace: { buff: { file: 'pri_grace', motion: 'sweep', size: 88, duration: 580 } },
    pri_haste: { buff: { file: 'pri_haste', motion: 'orders', size: 84, duration: 400 } },
    pri_cure: { heal: { file: 'pri_cure', motion: 'burst', size: 88, duration: 520 } },
    pri_regen: { buff: { file: 'pri_regen', motion: 'heal', size: 88, duration: 820 } },
    pri_penitence: { bad: { file: 'pri_penitence', motion: 'sink', size: 90, duration: 620 } },
    pri_bind: { bad: { file: 'pri_bind', motion: 'inward', size: 90, duration: 580 } },
    pri_doom: { bad: { file: 'pri_doom', motion: 'sink', size: 92, duration: 620 } },
    pri_summon: { call: { file: 'pri_summon', motion: 'orbit', size: 90, duration: 620 } },

    // monster 몬스터
    mon_selfdestruct: { hit: { file: 'mon_selfdestruct', motion: 'burst', size: 124, duration: 460 } },
    mon_hellfire: { hit: { file: 'mon_hellfire', motion: 'pillar', size: 118, duration: 420 } },
    mon_ironmaiden: { bad: { file: 'mon_ironmaiden', motion: 'inward', size: 96, duration: 580 } },
    mon_goldfever: { buff: { file: 'mon_goldfever', motion: 'burst', size: 92, duration: 520 } },
    mon_mire: { bad: { file: 'mon_mire', motion: 'ground', size: 94, duration: 600 } },
    mon_swarm: { buff: { file: 'mon_swarm', motion: 'cross', size: 94, duration: 620 } },

    // advance war
    war_ragnarok: { buff: { file: 'war_ragnarok', motion: 'pillar', size: 136, duration: 720 } },
    war_berserk: { buff: { file: 'war_berserk', motion: 'burst', size: 128, duration: 600 } },
    war_mutualruin: { hit: {
        file: 'war_mutualruin', motion: 'slash', size: 132, duration: 300, quake: true,
        then: { file: 'war_mutualruin_impact', motion: 'burst', size: 128, duration: 420 },
    } },
    war_whirlwind: { hit: { file: 'war_whirlwind', motion: 'spin', size: 130, duration: 620 } },
    war_thorswrath: { hit: {
        file: 'war_thorswrath', motion: 'fall', size: 128, anchor: [.5, .91], targetY: .66, duration: 260, quake: true,
        then: { file: 'war_thorswrath_impact', motion: 'shatter', size: 132, anchor: [.5, .91], targetY: .66, duration: 440 },
    } },
    war_shockwave: { hit: { file: 'war_shockwave', motion: 'ground', size: 140, duration: 520, quake: true } },
    war_divinedescent: { buff: { file: 'war_divinedescent', motion: 'strike', size: 116, duration: 640 } },
    war_command: { buff: { file: 'war_command', motion: 'shout', size: 136, ay: .45, duration: 760, pulses: 2, beat: 75 } },
    war_intimidate: { bad: { file: 'war_intimidate', motion: 'shout', size: 136, ay: .45, duration: 760, pulses: 2, beat: 65 } },

    // advance kni
    kni_lastbastion: { buff: { file: 'kni_lastbastion', motion: 'shell', size: 134, duration: 620 } },
    kni_unbreakablewill: { buff: { file: 'kni_unbreakablewill', motion: 'shell', size: 128, duration: 600 } },
    kni_divinejudgment: { buff: { file: 'kni_divinejudgment', motion: 'shell', size: 130, duration: 600 } },
    kni_cleansing: { buff: { file: 'kni_cleansing', motion: 'heal', size: 112, duration: 660 } },
    kni_offenseaura: { buff: { file: 'kni_offenseaura', motion: 'orbit', size: 114, duration: 620 } },
    kni_elemconvert: { buff: { file: 'kni_elemconvert', motion: 'sweep', size: 114, duration: 620 } },
    kni_retribution: { buff: { file: 'kni_retribution', motion: 'orders', size: 136, duration: 620 } },
    kni_condemnation: { hit: {
        file: 'kni_condemnation', motion: 'fall', size: 130, anchor: [.5, .91], targetY: .64, duration: 260, quake: true,
        then: { file: 'kni_condemnation_impact', motion: 'shatter', size: 130, anchor: [.5, .5], targetY: .64, duration: 420 },
    } },
    kni_fallingstrike: { hit: { file: 'kni_fallingstrike', motion: 'fall', size: 118, anchor: [.5, .9], targetY: .61, duration: 330 } },

    // advance mag
    mag_meteor: { hit: {
        file: 'mag_meteor', motion: 'flight', size: 140, anchor: [.21, .91], targetY: .66, entry: [.69, -.88], duration: 300, quake: true,
        then: { file: 'mag_meteor_impact', motion: 'shatter', size: 140, anchor: [.5, .91], targetY: .66, duration: 460 },
    } },
    mag_ember: { hit: { file: 'mag_ember', motion: 'burst', size: 94, duration: 450 } },
    mag_hydra: { hit: { file: 'mag_hydra', motion: 'cross', size: 136, duration: 520 } },
    mag_frozenorb: { hit: {
        file: 'mag_frozenorb', motion: 'flight', size: 130, anchor: [.79, .5], entry: [-.56, 0], duration: 280,
        then: { file: 'mag_frozenorb_impact', motion: 'shatter', size: 136, anchor: [.5, .51], duration: 420 },
    } },
    mag_blizzard: { hit: { file: 'mag_blizzard', motion: 'rain', size: 140, ay: .62, duration: 620 }, bad: { file: 'mag_blizzard', motion: 'rain', size: 140, ay: .62, duration: 620 } },
    mag_frostarmor: { buff: { file: 'mag_frostarmor', motion: 'shell', size: 112, duration: 580 } },
    mag_thunderstrike: { hit: {
        file: 'mag_thunderstrike', motion: 'bolt', size: 140, anchor: [.51, .92], targetY: .64, duration: 300, quake: true,
        then: { file: 'mag_thunderstrike_impact', motion: 'burst', size: 132, anchor: [.5, .91], targetY: .64, duration: 380 },
    } },
    mag_nova: { hit: { file: 'mag_nova', motion: 'wave', size: 140, duration: 480 } },
    mag_thundergod: { hit: { file: 'mag_thundergod', motion: 'bolt', size: 122, anchor: [.5, .9], targetY: .61, duration: 410 } },

    // advance arc
    arc_trueaim: { buff: { file: 'arc_trueaim', motion: 'inward', size: 130, duration: 600 } },
    arc_singlestrike: { hit: {
        file: 'arc_singlestrike', motion: 'flight', size: 140, anchor: [.93, .5], entry: [-.42, 0], duration: 280, quake: true,
        then: { file: 'arc_singlestrike_impact', motion: 'burst', size: 132, anchor: [.53, .56], duration: 400 },
    } },
    arc_reload: { buff: { file: 'arc_reload', motion: 'spin', size: 128, duration: 620 } },
    arc_quickdraw: { buff: { file: 'arc_quickdraw', motion: 'sweep', size: 128, duration: 520 } },
    arc_overdraw: { buff: { file: 'arc_overdraw', motion: 'orders', size: 92, duration: 620 } },
    arc_chaindraw: { buff: { file: 'arc_chaindraw', motion: 'sweep', size: 132, duration: 600 } },
    arc_huntersmark: { bad: { file: 'arc_huntersmark', motion: 'inward', size: 128, duration: 600 } },
    arc_supportingfire: { buff: { file: 'arc_supportingfire', motion: 'orders', size: 134, duration: 620 }, hit: { file: 'arc_supportingfire_hit', motion: 'thrust', size: 90, duration: 320 } },
    arc_trap: { hit: { file: 'arc_trap', motion: 'land', size: 128, duration: 480, quake: true } },

    // advance pri
    pri_endure: { buff: { file: 'pri_endure', motion: 'shell', size: 112, duration: 640 } },
    pri_purify: { heal: { file: 'pri_purify', motion: 'heal', size: 114, duration: 620 } },
    pri_resurrection: { heal: { file: 'pri_resurrection', motion: 'heal', size: 140, duration: 820 } },
    pri_punishment: { hit: {
        file: 'pri_punishment', motion: 'fall', size: 132, anchor: [.5, .91], targetY: .66, duration: 260, quake: true,
        then: { file: 'pri_punishment_impact', motion: 'shatter', size: 134, anchor: [.5, .91], targetY: .66, duration: 440 },
    } },
    pri_atonement: { bad: { file: 'pri_atonement', motion: 'inward', size: 132, duration: 620 } },
    pri_excommunication: { hit: { file: 'pri_excommunication', motion: 'land', size: 128, duration: 480, quake: true } },
    pri_diamondbody: { buff: { file: 'pri_diamondbody', motion: 'shell', size: 130, duration: 600 } },
    pri_sweep: { hit: { file: 'pri_sweep', motion: 'sweep', size: 140, duration: 480 } },
    pri_counter: { buff: { file: 'pri_counter', motion: 'burst', size: 132, duration: 560 } },
};

export const ART_STYLES = ['orrery', 'vitrail', 'wraith'];
export const ART_DEFAULT = ART_STYLES[0];
export const CHARGE_ART = { file: 'charge_gather', size: 80, duration: 1400 };

export function artFile(file, style) {
    return file && ART_STYLES.includes(style) ? `${style}/${file}` : null;
}
