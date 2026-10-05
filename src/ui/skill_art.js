/** 전사 기본 스킬의 이미지 연출 — 사건 · 그림 · 움직임 (ADR-0515).
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
};
