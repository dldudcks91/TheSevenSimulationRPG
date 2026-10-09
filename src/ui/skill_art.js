/** 기본 직업 · 전직 스킬의 이미지 연출 — 사건 · 그림 · 움직임 (ADR-0515 · ADR-0520 · ADR-0528 · ADR-0550 · ADR-0551).
 * 기본 직업 그림은 코드 모양처럼 깔끔한 `_clean` 판이다 — 앞 판(투박한 초상 그림체)은 같은 폴더에 이름 그대로 남아 있다(ADR-0551).
 * 게임 로직과 슬롯 아이콘은 이 표를 모른다. 그림이 준비되지 않으면
 * fx.js가 skill_looks.js의 기존 조각 조합을 표시한다.
 */
export const SKILL_ART = {
    war_bash: { hit: { file: 'war_bash_clean', motion: 'slash', size: 92, duration: 360 } },
    war_doubleswing: { hit: { file: 'war_doubleswing_clean', motion: 'cross', size: 90, duration: 400 } },
    war_quake: { hit: { file: 'war_quake_clean', motion: 'ground', size: 96, duration: 480, quake: true } },
    war_leap: { hit: { file: 'war_leap_clean', motion: 'land', size: 94, duration: 460, quake: true } },
    // 함성 셋 — 같은 집중선 · 색만 다르다 · 움직임도 퍼짐 하나(ADR-0546).
    war_taunt: { buff: { file: 'war_taunt_clean', motion: 'wave', size: 90, duration: 580 } },
    war_shout: { buff: { file: 'war_shout_clean', motion: 'wave', size: 90, duration: 580 } },
    war_battleorders: { buff: { file: 'war_battleorders_clean', motion: 'wave', size: 90, duration: 580 } },
    war_ironskin: { buff: { file: 'war_ironskin_clean', motion: 'shell', size: 94, duration: 540 } },

    // 기사 — 스마이트는 물리 충돌, 인챈트는 실제 추가 피해인 화염이다.
    kni_smite: { hit: { file: 'kni_smite_clean', motion: 'burst', size: 88, duration: 360 } },
    kni_holyshield: { buff: { file: 'kni_holyshield_clean', motion: 'shell', size: 92, duration: 540 } },
    kni_charge: { hit: { file: 'kni_charge_clean', motion: 'thrust', size: 88, duration: 360 } },
    kni_rush: { hit: { file: 'kni_rush_clean', motion: 'thrust', size: 84, duration: 340 } },
    kni_duel: {
        bad: { file: 'kni_duel_clean', motion: 'inward', size: 86, duration: 520 },
        buff: { file: 'kni_duel_guard_clean', motion: 'shell', size: 90, duration: 540 },
    },
    kni_enchant: { buff: { file: 'kni_enchant_clean', motion: 'orders', size: 88, duration: 540 } },
    // 상시 오오라의 그림은 도감에서만 재생한다(fxBuff의 until: null 제외).
    // 오오라 셋 — 같은 푸른 마법진 원 · 안쪽 문양만 다르다 · 크기 · 움직임도 하나(ADR-0548).
    kni_might: { buff: { file: 'kni_might_clean', motion: 'orbit', size: 90, duration: 620 } },
    kni_fanaticism: { buff: { file: 'kni_fanaticism_clean', motion: 'orbit', size: 90, duration: 620 } },
    kni_defiance: { buff: { file: 'kni_defiance_clean', motion: 'orbit', size: 90, duration: 620 } },

    // 마법사 — 불 · 냉기 · 번개 · 집중 · 얼음 벽 소환.
    // 아이스 블라스트 · 라이트닝은 초상 바깥 위에서 떨어진다(ADR-0541) — `ay` = 그림에서 초상 가운데에 닿는 높이 · `then` = 이어 서는 그림.
    mag_fireball: { hit: { file: 'mag_fireball_clean', motion: 'burst', size: 90, duration: 420 } },
    mag_inferno: { hit: { file: 'mag_inferno_clean', motion: 'pillar', size: 94, duration: 500 } },
    mag_iceblast: { hit: {
        file: 'mag_iceblast_clean', motion: 'fall', size: 110, ay: .87, duration: 260,
        then: { file: 'mag_iceblast_shatter_clean', motion: 'shatter', size: 110, ay: .89, duration: 380 },
    } },
    mag_frostnova: { hit: { file: 'mag_frostnova_clean', motion: 'wave', size: 94, duration: 480 } },
    mag_lightning: { hit: { file: 'mag_lightning_clean', motion: 'bolt', size: 124, ay: .9, duration: 380 } },
    mag_chain: { hit: { file: 'mag_chain_clean', motion: 'thrust', size: 90, duration: 360 } },
    mag_focus: { buff: { file: 'mag_focus_clean', motion: 'orbit', size: 88, duration: 620 } },
    mag_frozenwall: { call: { file: 'mag_frozenwall_clean', motion: 'pillar', size: 94, duration: 560 } },

    // 궁수 — 단발 · 연사 · 광역 · 유도 · 관통 · 독 강화.
    arc_snipe: { hit: { file: 'arc_snipe_clean', motion: 'thrust', size: 84, duration: 340 } },
    arc_rapid: { hit: { file: 'arc_rapid_clean', motion: 'thrust', size: 84, duration: 340 } },
    arc_multishot: { hit: { file: 'arc_multishot_clean', motion: 'rain', size: 90, duration: 440 } },
    arc_guided: { hit: { file: 'arc_guided_clean', motion: 'thrust', size: 88, duration: 400 } },
    arc_pierce: { buff: { file: 'arc_pierce_clean', motion: 'sweep', size: 90, duration: 520 } },
    arc_poison: { buff: { file: 'arc_poison_clean', motion: 'orders', size: 88, duration: 580 } },

    // 사제 — 성광 · 회복 · 강화 · 그림자 약화.
    pri_judgment: { hit: { file: 'pri_judgment_clean', motion: 'strike', size: 94, duration: 480 } },
    pri_heal: { heal: { file: 'pri_heal_clean', motion: 'heal', size: 88, duration: 640 } },
    pri_grace: { buff: { file: 'pri_grace_clean', motion: 'sweep', size: 88, duration: 580 } },
    pri_haste: { buff: { file: 'pri_haste_clean', motion: 'orders', size: 84, duration: 400 } },
    pri_cure: { heal: { file: 'pri_cure_clean', motion: 'burst', size: 88, duration: 520 } },
    pri_regen: { buff: { file: 'pri_regen_clean', motion: 'heal', size: 88, duration: 820 } },
    pri_penitence: { bad: { file: 'pri_penitence_clean', motion: 'sink', size: 90, duration: 620 } },
    pri_bind: { bad: { file: 'pri_bind_clean', motion: 'inward', size: 90, duration: 580 } },

    // 전직 — 기본보다 크게(124~140) 카드 밖까지 뻗는다 · 큰 한 방은 두 장(떨어짐 · 날아듦 → 터짐 `_impact`)이고 흔들림은 터질 때 선다(ADR-0550).
    // 전사 — 광전사 · 바바리안 · 선봉장. 휠윈드는 칼날 바퀴가 돈다(`spin`).
    war_ragnarok: { buff: { file: 'war_ragnarok', motion: 'pillar', size: 136, duration: 720 } },
    war_berserk: { buff: { file: 'war_berserk', motion: 'burst', size: 128, duration: 600 } },
    war_mutualruin: { hit: {
        file: 'war_mutualruin', motion: 'slash', size: 132, duration: 300, quake: true,
        then: { file: 'war_mutualruin_impact', motion: 'burst', size: 128, duration: 420 },
    } },
    war_whirlwind: { hit: { file: 'war_whirlwind', motion: 'spin', size: 130, duration: 620 } },
    war_thorswrath: { hit: {
        file: 'war_thorswrath', motion: 'fall', size: 128, ay: .86, duration: 260, quake: true,
        then: { file: 'war_thorswrath_impact', motion: 'shatter', size: 132, duration: 440 },
    } },
    war_shockwave: { hit: { file: 'war_shockwave', motion: 'ground', size: 140, duration: 520, quake: true } },
    war_lionsroar: { hit: { file: 'war_lionsroar', motion: 'wave', size: 132, duration: 520 } },
    war_command: { buff: { file: 'war_command', motion: 'orders', size: 132, duration: 620 } },
    war_intimidate: { bad: { file: 'war_intimidate', motion: 'inward', size: 128, duration: 580 } },

    // 기사 — 가디언 · 팔라딘 · 크루세이더. 방벽(신성한 심판 · 불굴의 맹세 · 성전)도 강화 그림이다.
    kni_lastbastion: { buff: { file: 'kni_lastbastion', motion: 'shell', size: 134, duration: 620 } },
    kni_unbreakablewill: { buff: { file: 'kni_unbreakablewill', motion: 'shell', size: 128, duration: 600 } },
    kni_divinejudgment: { buff: { file: 'kni_divinejudgment', motion: 'shell', size: 130, duration: 600 } },
    kni_unyieldingoath: { buff: { file: 'kni_unyieldingoath', motion: 'orbit', size: 130, duration: 660 } },
    kni_holywar: { buff: { file: 'kni_holywar', motion: 'shell', size: 132, duration: 620 } },
    kni_vow: { buff: { file: 'kni_vow', motion: 'heal', size: 130, duration: 720 } },
    kni_retribution: { buff: { file: 'kni_retribution', motion: 'orders', size: 136, duration: 620 } },
    kni_condemnation: { hit: {
        file: 'kni_condemnation', motion: 'fall', size: 130, ay: .86, duration: 260, quake: true,
        then: { file: 'kni_condemnation_impact', motion: 'shatter', size: 130, duration: 420 },
    } },
    kni_showdown: { buff: { file: 'kni_showdown', motion: 'burst', size: 132, duration: 600 } },

    // 마법사 — 파이어 · 프로스트 · 썬더. 메테오는 바깥 위에서 떨어지고 썬더 스트라이크는 위에서 내리꽂힌다.
    mag_meteor: { hit: {
        file: 'mag_meteor', motion: 'fall', size: 140, ay: .82, duration: 300, quake: true,
        then: { file: 'mag_meteor_impact', motion: 'shatter', size: 140, duration: 460 },
    } },
    mag_firewall: { hit: { file: 'mag_firewall', motion: 'pillar', size: 140, duration: 560 } },
    mag_hydra: { hit: { file: 'mag_hydra', motion: 'cross', size: 136, duration: 520 } },
    mag_frozenorb: { hit: {
        file: 'mag_frozenorb', motion: 'thrust', size: 130, duration: 280,
        then: { file: 'mag_frozenorb_impact', motion: 'shatter', size: 136, duration: 420 },
    } },
    mag_blizzard: { hit: { file: 'mag_blizzard', motion: 'rain', size: 140, ay: .62, duration: 620 } },
    mag_frostburst: { hit: {
        file: 'mag_frostburst', motion: 'inward', size: 128, duration: 320,
        then: { file: 'mag_frostburst_impact', motion: 'burst', size: 136, duration: 420 },
    } },
    mag_thunderstrike: { hit: {
        file: 'mag_thunderstrike', motion: 'bolt', size: 140, ay: .86, duration: 300, quake: true,
        then: { file: 'mag_thunderstrike_impact', motion: 'burst', size: 132, duration: 380 },
    } },
    mag_nova: { hit: { file: 'mag_nova', motion: 'wave', size: 140, duration: 480 } },
    mag_staticfield: { hit: { file: 'mag_staticfield', motion: 'bolt', size: 124, duration: 460 } },

    // 궁수 — 스나이퍼 · 보우마스터 · 레인저. 재장전은 화살 고리가 돈다(`spin`).
    arc_trueaim: { buff: { file: 'arc_trueaim', motion: 'inward', size: 130, duration: 600 } },
    arc_singlestrike: { hit: {
        file: 'arc_singlestrike', motion: 'thrust', size: 140, duration: 280, quake: true,
        then: { file: 'arc_singlestrike_impact', motion: 'burst', size: 132, duration: 400 },
    } },
    arc_reload: { buff: { file: 'arc_reload', motion: 'spin', size: 128, duration: 620 } },
    arc_quickdraw: { buff: { file: 'arc_quickdraw', motion: 'sweep', size: 128, duration: 520 } },
    arc_fulldraw: { buff: { file: 'arc_fulldraw', motion: 'orders', size: 134, duration: 620 } },
    arc_chaindraw: { buff: { file: 'arc_chaindraw', motion: 'sweep', size: 132, duration: 600 } },
    arc_huntersmark: { bad: { file: 'arc_huntersmark', motion: 'inward', size: 128, duration: 600 } },
    arc_supportingfire: { buff: { file: 'arc_supportingfire', motion: 'orders', size: 134, duration: 620 } },
    arc_trap: { hit: { file: 'arc_trap', motion: 'land', size: 128, duration: 480, quake: true } },

    // 사제 — 비숍 · 검은사제 · 몽크. 천벌은 바깥 위에서 떨어진다.
    pri_aegis: { buff: { file: 'pri_aegis', motion: 'shell', size: 134, duration: 620 } },
    pri_benediction: { heal: { file: 'pri_benediction', motion: 'heal', size: 136, duration: 760 } },
    pri_resurrection: { heal: { file: 'pri_resurrection', motion: 'heal', size: 140, duration: 820 } },
    pri_punishment: { hit: {
        file: 'pri_punishment', motion: 'fall', size: 132, ay: .86, duration: 260, quake: true,
        then: { file: 'pri_punishment_impact', motion: 'shatter', size: 134, duration: 440 },
    } },
    pri_atonement: { bad: { file: 'pri_atonement', motion: 'inward', size: 132, duration: 620 } },
    pri_excommunication: { hit: { file: 'pri_excommunication', motion: 'land', size: 128, duration: 480, quake: true } },
    pri_diamondbody: { buff: { file: 'pri_diamondbody', motion: 'shell', size: 130, duration: 600 } },
    pri_sweep: { hit: { file: 'pri_sweep', motion: 'sweep', size: 140, duration: 480 } },
    pri_counter: { buff: { file: 'pri_counter', motion: 'burst', size: 132, duration: 560 } },
};

/* 그림체 — 관전은 설정 탭이 고른 그림체로 서고(fx.js:fxArtStyle · ADR-0561), 도감의 이펙트 세그먼트는 같은 스킬을 그림체별로 견준다(§9-1 · ADR-0559).
   버튼 · 탭 순서 = 이 배열 순서 · 기본값 = 한 번도 안 고른 사람의 관전(ADR-0551 의 깔끔한 그림) */
export const ART_STYLES = ['clean', 'ink', 'portrait', 'code'];
export const ART_DEFAULT = 'clean';
/** 그 그림체의 파일 이름 — 위 표의 이름(실전 판)에서 만든다. 기본 직업은 `_clean` 이 실전이고 접미 없는 이름이 앞 판(초상 그림체 · ADR-0549),
 *  전직은 앞 판 하나뿐이라 둘이 같다(ADR-0550) · 수묵 = `<앞 판 이름>_ink` · 코드 모양은 그림이 없다(null — 조각 조합이 선다) */
export function artFile(file, style) {
    const base = file.replace(/_clean$/, '');
    return style === 'clean' ? file : style === 'portrait' ? base : style === 'ink' ? `${base}_ink` : null;
}
