/**
 * skill_looks.js — **스킬마다 다른 관전 이펙트**의 표 (2026-10-04 사용자 지시 「모든 스킬이 스킬별로 생김새가 달라야」 · SCREEN_DESIGN §4-2 「연출」 · ADR-0511)
 *
 * 키 = `skill.csv:skill_id` · 값 = 사건마다 조각 목록 — `hit`(그 스킬의 타격 · 자폭) · `buff`(그 스킬이 건 창 — 좋은 창 · 방벽, `bad` 가 없으면 나쁜 창도) ·
 *   `bad`(나쁜 창) · `heal`(회복) · `call`(불러낸 카드). 조각 하나 = `[이름, 값]` — 이름과 값의 뜻은 fx.js:PIECES, 색 이름은 fx.js:PALETTE.
 * **표에 없는 스킬**(새로 생긴 스킬)은 피해 종류 모양 · 일반 창 · 일반 회복으로 선다 — 스킬을 늘리면 여기 한 줄을 더한다.
 * 오오라(`cast=aura`)는 늘 켜져 있어 연출이 없다(줄이 없다). 피해 숫자의 색은 늘 피해 종류다(이 표와 무관).
 * 표시 사전이다 — 게임 로직은 이 표를 모른다(이식 대상이 아니다 · 문서가 규격을 든다).
 */
export const SKILL_LOOKS = {
    /* ── 전사 — 하늘빛 흰 백호 줄 · 땅 ── */
    war_bash: { hit: [['claws', { c: 'tiger' }]] },                                                       // 배시 — 백호 줄 셋(백호참)
    war_doubleswing: { hit: [['cross', { c: 'tiger', a: -45, len: 230, w: 12, halo: true, t: 400 }], ['flare', { c: 'tiger', s: 50, dl: 90 }]] },   // 더블스윙 — X 자
    war_quake: { hit: [['crack', { c: 'earth' }], ['spikes', { c: 'earth', n: 5 }], ['quake']] },          // 어스스플릿 — 갈라짐 + 땅 가시
    war_leap: { hit: [['streak', { c: 'steel', a: 90, jit: 6, len: 170, w: 10, sh: -40 }], ['ring', { c: 'earth', fy: 0.35, oy: 26, n: 2, s: 110 }], ['quake']] },   // 리프 어택 — 내리꽂힘 + 땅 고리
    war_taunt: { buff: [['ring', { c: 'blood', r0: 1.3, r1: 0.5, n: 2, s: 110 }], ['flash', { c: 'blood' }]] },   // 타운트 — 붉은 고리가 조여든다
    war_shout: { buff: [['ring', { c: 'gold', n: 3, s: 100, w: 3, step: 110 }]] },                        // 워 크라이 — 소리 고리 셋
    war_battleorders: { buff: [['sweep', { c: 'gold' }], ['chevron', { c: 'gold', n: 3 }]] },             // 배틀오더스 — 금빛 훑음 + 꺾쇠
    war_ironskin: { buff: [['shell', { c: 'steel' }], ['flash', { c: 'steel' }]] },                       // 아이언 스킨 — 강철 막

    /* ── 기사 — 성광 · 강철 ── */
    kni_smite: { hit: [['pillar', { c: 'holy', w: 34 }], ['flare', { c: 'holy', s: 70, dl: 110 }]] },     // 스마이트 — 빛기둥
    kni_holyshield: { buff: [['shell', { c: 'holy' }], ['sigil', { c: 'holy', s: 96 }]] },               // 홀리 실드 — 성광 막 + 문양
    kni_charge: { hit: [['streak', { c: 'steel', a: 'in', len: 160, w: 14 }], ['flare', { c: 'steel', s: 64, dl: 80 }], ['ring', { c: 'steel', s: 70, dl: 80 }]] },   // 차지 — 굵은 창끝이 날아든다
    kni_rush: { hit: [['streak', { c: 'steel', a: 'in', n: 2, len: 120, w: 6, gap: 14, step: 40 }]] },   // 러시 — 짧은 찌르기 둘
    kni_duel: { bad: [['xmark', { c: 'blood', s: 34 }], ['sigil', { c: 'blood', s: 88 }]], buff: [['shell', { c: 'blood' }]] },   // 듀얼 — 상대는 붉은 × · 나는 붉은 막
    kni_enchant: { buff: [['streak', { c: 'holy', a: -60, len: 120, w: 5 }], ['rise', { c: 'holy', n: 10, shape: 'shard' }]] },   // 인챈트 — 칼날에 빛 + 빛 조각

    /* ── 궁수 — 바람 ── */
    arc_snipe: { hit: [['streak', { c: 'wind', a: 'in', len: 190, w: 4 }], ['flare', { c: 'wind', s: 40, dl: 70 }]] },   // 스나이프 — 가늘고 긴 바늘
    arc_rapid: { hit: [['streak', { c: 'wind', a: 'in', n: 3, len: 110, w: 3, gap: 10, step: 25 }]] },    // 래피드 샷 — 짧은 바늘 셋
    arc_multishot: { hit: [['rain', { c: 'wind', n: 5 }]] },                                              // 멀티샷 — 화살 비
    arc_guided: { hit: [['sigil', { c: 'wind', s: 60, t: 360 }], ['streak', { c: 'wind', a: 'in', len: 160, w: 5, dl: 120 }]] },   // 가이디드 애로우 — 표식 뒤 바늘
    arc_pierce: { buff: [['sweep', { c: 'wind' }], ['streak', { c: 'wind', a: 0, jit: 0, len: 150, w: 4 }]] },   // 피어싱 샷 — 바람 훑음 + 가로 줄
    arc_poison: { buff: [['sweep', { c: 'poison' }], ['rise', { c: 'poison', n: 8, shape: 'drop' }]] },  // 포이즌 애로우 — 독 훑음 + 방울

    /* ── 마법사 — 원소 ── */
    mag_fireball: { hit: [['flare', { c: 'fire', s: 96 }], ['spray', { c: 'fire', n: 12, up: 20 }]] },   // 파이어볼 — 터짐 + 불똥
    mag_inferno: { hit: [['pillar', { c: 'fire', w: 44 }], ['rise', { c: 'fire', n: 12 }]] },            // 인페르노 — 불기둥 + 불티
    mag_iceblast: { hit: [['flare', { c: 'cold', s: 74 }], ['spray', { c: 'cold', n: 11, shape: 'shard' }]] },   // 아이스 블라스트 — 터짐 + 얼음 조각
    mag_frostnova: { hit: [['ring', { c: 'cold', s: 120, w: 5 }], ['ring', { c: 'cold', fy: 0.35, oy: 24, s: 120, dl: 80 }], ['spray', { c: 'cold', n: 6, shape: 'shard', r0: 20, r1: 46 }]] },   // 프로스트 노바 — 냉기 고리 둘
    mag_lightning: { hit: [['flare', { c: 'lightning', s: 68 }], ['bolt', { c: 'lightning', n: 3 }]] },  // 라이트닝 — 번개 셋
    mag_chain: { hit: [['bolt', { c: 'lightning', n: 2, from: 'side' }], ['spray', { c: 'lightning', n: 6, shape: 'dash', r0: 20, r1: 50 }]] },   // 체인 라이트닝 — 옆에서 이어지는 번개
    mag_focus: { buff: [['sigil', { c: 'cold', s: 100 }], ['rise', { c: 'cold', n: 6 }]] },              // 포커스 — 푸른 문양
    mag_frozenwall: { call: [['spikes', { c: 'cold', n: 6 }], ['shell', { c: 'cold' }]] },               // 프로즌 월 — 얼음 가시 + 막

    /* ── 사제 — 성광 · 회복 · 그림자 ── */
    pri_judgment: { hit: [['pillar', { c: 'holy', w: 50 }], ['ring', { c: 'holy', s: 100, dl: 120 }]] }, // 심판 — 굵은 빛기둥 + 고리
    pri_heal: { heal: [['rise', { c: 'heal', n: 12 }], ['sweep', { c: 'heal' }]] },                      // 힐링 라이트 — 초록 알갱이 + 훑음
    pri_grace: { buff: [['sweep', { c: 'holy' }], ['rise', { c: 'holy', n: 6 }]] },                      // 그레이스 — 성광 훑음
    pri_haste: { buff: [['chevron', { c: 'wind', n: 4, t: 380 }]] },                                      // 헤이스트 — 빠른 꺾쇠 넷
    pri_cure: { heal: [['flare', { c: 'heal', s: 60 }], ['rise', { c: 'heal', n: 6 }], ['ring', { c: 'heal', s: 80 }]] },   // 힐 — 초록 터짐 + 고리
    pri_regen: { buff: [['sigil', { c: 'heal', s: 90 }], ['rise', { c: 'heal', n: 5, t: 900 }]] },       // 프레이어 오브 리제너레이션 — 초록 문양 + 느린 알갱이
    pri_penitence: { buff: [['haze', { c: 'shadow' }], ['ring', { c: 'shadow', fy: 0.35, oy: 26, s: 110 }]] },   // 페니턴스 — 그림자 + 땅 고리
    pri_bind: { buff: [['sigil', { c: 'shadow', s: 84 }], ['streak', { c: 'shadow', a: 0, jit: 0, n: 2, gap: 30, len: 130, w: 5 }]] },   // 바인드 — 문양 + 묶는 가로 줄

    /* ── 몬스터 ── */
    mon_summon_goblin: { call: [['ring', { c: 'earth', fy: 0.35, oy: 30, s: 110 }], ['rise', { c: 'earth', n: 6, shape: 'shard' }]] },   // 고블린 소환 — 흙 고리 + 흙 조각
    mon_selfdestruct: { hit: [['flare', { c: 'blood', s: 110 }], ['ring', { c: 'fire', s: 110, w: 6 }], ['spray', { c: 'fire', n: 10, shape: 'shard' }]] },   // 자폭 — 큰 붉은 터짐

    /* ── 광전사 — 피 ── */
    war_ragnarok: { buff: [['flash', { c: 'blood' }], ['rise', { c: 'fire', n: 14 }], ['ring', { c: 'blood', s: 120 }]] },   // 라그나로크 — 붉은 번쩍 + 불티
    war_berserk: { buff: [['haze', { c: 'blood' }], ['ring', { c: 'blood', n: 2, s: 90, step: 140 }]] }, // 버서크 — 피 기운 + 고동
    war_mutualruin: { hit: [['claws', { c: 'blood' }], ['flare', { c: 'blood', s: 70, dl: 60 }]] },      // 동귀어진 — 붉은 백호 줄

    /* ── 바바리안 ── */
    war_whirlwind: { hit: [['spin', { c: 'tiger', s: 110 }]] },                                           // 휠윈드 — 회전 칼날
    war_thorswrath: { hit: [['bolt', { c: 'steel', n: 1 }], ['flare', { c: 'steel', s: 90 }], ['quake']] },   // 토르의 분노 — 강철 벼락
    war_shockwave: { hit: [['ring', { c: 'earth', fy: 0.4, oy: 20, n: 3, s: 130, step: 80 }], ['quake']] },   // 쇼크웨이브 — 땅 고리 셋

    /* ── 선봉장 — 금빛 함성 ── */
    war_lionsroar: { hit: [['ring', { c: 'gold', n: 2, s: 120, w: 5, step: 100 }], ['spray', { c: 'gold', n: 8, shape: 'dash' }]] },   // 사자후 — 큰 금빛 고리
    war_command: { buff: [['sigil', { c: 'gold', s: 96 }], ['chevron', { c: 'gold', n: 2 }]] },          // 호령 — 금빛 문양 + 꺾쇠
    war_intimidate: { buff: [['haze', { c: 'blood' }], ['xmark', { c: 'blood', s: 26 }]] },              // 일갈 — 피 기운 + ×

    /* ── 가디언 ── */
    kni_lastbastion: { buff: [['shell', { c: 'holy' }], ['pillar', { c: 'holy', w: 24, t: 500 }]] },     // 최후의 보루 — 성광 막 + 가는 빛기둥
    kni_unbreakablewill: { buff: [['shell', { c: 'steel' }], ['ring', { c: 'steel', s: 100, w: 5 }]] },  // 꺾을 수 없는 의지 — 강철 막 + 고리
    kni_divinejudgment: { buff: [['sigil', { c: 'holy', s: 80 }], ['chevron', { c: 'holy', n: 3 }]] },   // 신성한 심판 — 성광 문양 + 꺾쇠

    /* ── 팔라딘 ── */
    kni_unyieldingoath: { buff: [['sweep', { c: 'holy' }], ['sigil', { c: 'holy', s: 104 }]] },          // 불굴의 맹세 — 성광 훑음 + 큰 문양
    kni_holywar: { buff: [['flash', { c: 'holy' }], ['chevron', { c: 'holy', n: 2 }]] },                 // 성전 — 성광 번쩍 + 꺾쇠
    kni_vow: { buff: [['ring', { c: 'holy', r0: 1.3, r1: 0.6, s: 100 }], ['rise', { c: 'holy', n: 8 }]] },   // 서약 — 조여드는 성광 고리

    /* ── 크루세이더 ── */
    kni_retribution: { buff: [['sweep', { c: 'steel' }], ['spikes', { c: 'steel', n: 4 }]] },            // 응징 — 강철 훑음 + 가시
    kni_condemnation: { hit: [['pillar', { c: 'holy', w: 30 }], ['cross', { c: 'holy', a: 90, spread: 90, len: 120, w: 8, dl: 120 }]] },   // 단죄 — 빛기둥 + 십자
    kni_showdown: { buff: [['ring', { c: 'steel', r0: 1.3, r1: 0.5, s: 110 }], ['chevron', { c: 'steel', n: 3 }]] },   // 결전 — 조여드는 강철 고리

    /* ── 파이어 메이지 ── */
    mag_meteor: { hit: [['rain', { c: 'fire', shape: 'big' }], ['flare', { c: 'fire', s: 110, dl: 160 }], ['spray', { c: 'fire', n: 14, up: 26, dl: 160 }], ['quake']] },   // 메테오 — 떨어지는 불덩이
    mag_firewall: { hit: [['spikes', { c: 'fire', n: 7, h: 60 }]] },                                      // 파이어월 — 솟는 불꽃 벽
    mag_hydra: { hit: [['streak', { c: 'fire', a: 'in', len: 140, w: 8 }], ['flare', { c: 'fire', s: 52, dl: 80 }]] },   // 히드라 — 날아드는 불줄기

    /* ── 프로스트 메이지 ── */
    mag_frozenorb: { hit: [['flare', { c: 'cold', s: 60 }], ['spray', { c: 'cold', n: 16, shape: 'shard', r0: 40, r1: 86 }], ['spin', { c: 'cold', s: 70 }]] },   // 프로즌 오브 — 도는 얼음 + 조각
    mag_blizzard: { hit: [['rain', { c: 'cold', n: 9, shape: 'shard' }]] },                               // 블리자드 — 얼음 비
    mag_frostburst: { hit: [['ring', { c: 'cold', s: 90, r0: 0.2, r1: 1.4 }], ['spray', { c: 'cold', n: 9, shape: 'shard', r0: 50, r1: 80 }]] },   // 프로스트 버스트 — 냉기 고리 + 먼 조각

    /* ── 썬더 메이지 ── */
    mag_thunderstrike: { hit: [['pillar', { c: 'lightning', w: 30, t: 300 }], ['bolt', { c: 'lightning', n: 2 }], ['quake']] },   // 썬더 스트라이크 — 벼락 기둥
    mag_nova: { hit: [['ring', { c: 'lightning', n: 2, s: 120, step: 70 }], ['spray', { c: 'lightning', n: 10, shape: 'dash' }]] },   // 노바 — 전기 고리 둘
    mag_staticfield: { hit: [['sigil', { c: 'lightning', s: 90 }], ['bolt', { c: 'lightning', n: 4, short: true }]] },   // 정전장 — 문양 + 짧은 불꽃

    /* ── 스나이퍼 ── */
    arc_trueaim: { buff: [['sigil', { c: 'wind', s: 70 }], ['xmark', { c: 'wind', s: 18 }]] },           // 정조준 — 조준 문양
    arc_singlestrike: { hit: [['streak', { c: 'wind', a: 'in', len: 180, w: 12 }], ['flare', { c: 'wind', s: 80, dl: 70 }], ['ring', { c: 'wind', s: 90, dl: 70 }]] },   // 일격 — 굵은 바늘 + 터짐
    arc_reload: { buff: [['spin', { c: 'wind', s: 70 }], ['chevron', { c: 'wind', n: 1 }]] },            // 재장전 — 도는 고리

    /* ── 보우마스터 ── */
    arc_quickdraw: { buff: [['chevron', { c: 'wind', n: 5, t: 300 }]] },                                  // 퀵 드로우 — 아주 빠른 꺾쇠 다섯
    arc_fulldraw: { buff: [['sweep', { c: 'wind' }], ['pillar', { c: 'wind', w: 18 }]] },                // 풀 드로우 — 바람 훑음 + 가는 기둥
    arc_chaindraw: { buff: [['sigil', { c: 'wind', s: 100 }], ['sigil', { c: 'wind', s: 60, dl: 120 }]] },   // 체인 드로우 — 겹 문양

    /* ── 레인저 ── */
    arc_huntersmark: { buff: [['xmark', { c: 'wind', s: 30 }], ['ring', { c: 'wind', r0: 1.4, r1: 0.4, s: 90 }]] },   // 사냥 표식 — × + 조여드는 고리
    arc_supportingfire: { buff: [['sweep', { c: 'wind' }], ['rain', { c: 'wind', n: 3 }]] },             // 지원 사격 — 훑음 + 작은 화살 비
    arc_trap: { hit: [['spikes', { c: 'steel', n: 6, h: 34 }], ['flare', { c: 'steel', s: 46 }]] },      // 덫 — 강철 이빨

    /* ── 비숍 ── */
    pri_aegis: { buff: [['shell', { c: 'holy' }], ['ring', { c: 'holy', s: 110 }]] },                    // 이지스 — 성광 막 + 고리
    pri_benediction: { heal: [['ring', { c: 'heal', fy: 0.35, oy: 26, s: 110 }], ['rise', { c: 'holy', n: 10 }], ['sweep', { c: 'heal' }]] },   // 베네딕션 — 땅 고리 + 금빛 알갱이
    pri_resurrection: { heal: [['pillar', { c: 'holy', w: 56 }], ['flash', { c: 'holy' }], ['rise', { c: 'heal', n: 10 }]] },   // 리저렉션 — 큰 빛기둥

    /* ── 검은사제 — 그림자 ── */
    pri_punishment: { hit: [['pillar', { c: 'shadow', w: 40 }], ['flare', { c: 'shadow', s: 80, dl: 110 }]] },   // 천벌 — 그림자 기둥
    pri_atonement: { buff: [['haze', { c: 'shadow' }], ['sigil', { c: 'shadow', s: 90 }]] },             // 속죄 — 그림자 + 문양
    pri_excommunication: { hit: [['cross', { c: 'shadow', a: -45, len: 160, w: 9 }], ['flare', { c: 'shadow', s: 60, dl: 90 }]] },   // 파문 — 그림자 X

    /* ── 몽크 ── */
    pri_diamondbody: { buff: [['shell', { c: 'gold' }], ['flash', { c: 'gold' }]] },                     // 금강 — 금빛 막
    pri_sweep: { hit: [['arc', { c: 'earth', a: 0, jit: 6, s: 170, h: 40, w: 6 }], ['spray', { c: 'earth', n: 8, up: 10, r0: 30, r1: 60 }]] },   // 소탕 — 낮게 휩쓰는 호 + 흙먼지
    pri_counter: { buff: [['ring', { c: 'steel', s: 100, r0: 1.2, r1: 0.7 }], ['spin', { c: 'steel', s: 80 }]] },   // 반격 — 강철 고리 + 회전
};
