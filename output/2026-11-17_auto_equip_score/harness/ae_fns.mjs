/** 점수 재료 — 베이스 몫 · 옵션 점수 합. ae.mjs 와 check.mjs 가 같이 쓴다. 게임에는 없다. */
import { D, SYS, rngMod } from './boot.mjs';

const { makeRng } = rngMod;
const I = SYS.item;
const CAP = D.balance.hero_level_cap;
export const ARMOR = new Set(['armor', 'helmet', 'gloves', 'boots']);
const clamp01 = x => Math.min(1, Math.max(0, x));

/* 베이스 기준값 — 그 아이템 레벨에서 나올 수 있는 강화 0 · 베이스 옵션 0 의 최대(표본) */
const periodOf = it => I.weaponBasePreview(it.group, it.baseId)?.period ?? 1;
const wdps = it => { const d = I.weaponDamage({ ...it, up: 0 }); return d ? (d.min + d.max) / 2 / periodOf(it) : 0; };
export const REFW = {}, REFWG = {}, REFA = {};
{
    const r = makeRng(424242);
    for (let lv = 1; lv <= CAP; lv++) {
        for (const it of I.rollGear(r, { slots: Array(400).fill('weapon'), ilvl: lv })) {
            const v = wdps(it);
            REFW[lv] = Math.max(REFW[lv] ?? 0, v);
            ((REFWG[it.group] ??= {})[lv]) = Math.max(REFWG[it.group][lv] ?? 0, v);
        }
        for (const slot of ARMOR) for (const it of I.rollGear(r, { slots: Array(250).fill(slot), ilvl: lv })) {
            const v = I.effective({ ...it, up: 0 })?.implicit?.v ?? 0;
            ((REFA[slot] ??= {})[lv]) = Math.max(REFA[slot][lv] ?? 0, v);
        }
    }
}
/** 베이스 몫 — 무기 = 초당 무기 데미지(툴팁의 무기 데미지 = 베이스 옵션 · 강화 포함 ÷ 공격 주기) · 방어구 = 방어력(베이스 옵션 · 강화 포함) — 기준값 대비 · 장신구 0 */
export function baseFrac(it, norm = 'global') {
    if (it.slot === 'weapon') {
        const d = I.weaponDamageFixed(it);
        if (!d) return 0;
        const v = (d.min + d.max) / 2 / periodOf(it);
        const ref = norm === 'group' ? (REFWG[it.group]?.[it.ilvl] || REFW[it.ilvl]) : REFW[it.ilvl];
        return ref > 0 ? v / ref : 0;
    }
    if (ARMOR.has(it.slot)) {
        const f = I.implicitFixed(it);
        const ref = REFA[it.slot]?.[it.ilvl];
        return f && ref > 0 ? f.v / ref : 0;
    }
    return 0;
}
/** 옵션 점수 합 — 줄마다 그 레벨에서 나올 수 있던 범위 안의 자리(0 ~ 1)를 더한다(메인 줄은 단어를 묶어 잰다 — item.optionScore 와 같은 범위) ·
 *  베이스 줄 둘(무기 데미지 +% · 방어력 +%)은 베이스 항에 이미 들어 있어 뺀다 · 방어구 특성 · 반지 태그 · 목걸이 스킬 +n 은 옵션 줄로 센다 */
/** 전투와 무관한 줄 — 2차(`nf`)에서 점수에서 뺀다 */
export const NONCOMBAT = new Set(['gold_find', 'magic_find', 'xp_gain_pct']);
export function optSum(it, nf = false) {
    const mean = I.optionScore(it);
    if (mean == null) return 0;
    let n = 0, sub = 0;
    (it.affixes ?? []).forEach((a, i) => {
        const r = I.optionRange(it, i);
        if (!r || !Number.isFinite(a.v) || !(r.max > r.min)) return;
        n++;
        if ((a.src === 'fixed' && (a.stat === 'atk_pct' || a.stat === 'armor_def_pct')) || (nf && NONCOMBAT.has(a.stat)))
            sub += clamp01((a.v - r.min) / (r.max - r.min));
    });
    return Math.max(0, mean * n - sub);
}
export const scoreFn = (wB, wO, norm = 'global', nf = false) => it => it.ilvl + wB * baseFrac(it, norm) + wO * optSum(it, nf);
