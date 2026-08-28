/**
 * 툴팁 — **기계장치를 한 곳에** (2026-08-28).
 *
 * 화면 렌더러(`app.js`)와 관전 재생기(`battle.js`)가 같은 `#tooltip` 한 자리를 쓴다. 표시·따라다니기·넘침 보정을
 * 두 번 짜면 한쪽만 고쳐지므로 여기 하나만 둔다. **내용은 부르는 쪽이 만든다** — `bindTipNode(node, build)` 의
 * `build()` 가 붙일 노드를 돌려준다.
 *
 * 다만 **영웅 카드 · 스킬 카드는 여기 둔다**: 두 렌더러가 같은 카드를 띄우기 때문이다(영웅 띠 ↔ 관전 유닛 카드).
 * 아이템 비교 카드는 `app.js` 에 남는다 — 희귀도 · 접사 · 무기군처럼 app 쪽 헬퍼를 많이 타서 옮기면 그게 따라온다.
 *
 * **겹쳐 붙은 툴팁** — 관전 유닛 카드(영웅) 안에 스킬 칸이 들어 있다. 칸에서 나가 카드로 돌아올 때
 * `mouseenter` 는 다시 안 뜨므로(자식에서 부모로 돌아오는 건 진입이 아니다) 여기서 조상의 툴팁을 되살린다.
 *
 * i18n 규약: **이 파일에 한국어 리터럴을 쓰지 않는다** (주석 제외) — app.js · battle.js 와 같다.
 */

import * as M from './mock.js';
import { t, L } from './i18n.js';

const $tip = () => document.querySelector('#tooltip');

const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
};

/* ───────── 기계장치 ───────── */

/**
 * node 위에 올리면 build() 가 만든 카드를 띄운다.
 * @param build () => Node | Node[]
 */
export function bindTipNode(node, build) {
    node.dataset.tip = '1';
    node._tipBuild = build;
    node.onmouseenter = ev => showTip(build(), ev);
    node.onmousemove = moveTip;
    node.onmouseleave = ev => {
        const up = node.parentElement?.closest('[data-tip]');
        if (up?._tipBuild && ev.relatedTarget && up.contains(ev.relatedTarget)) showTip(up._tipBuild(), ev);
        else hideTip();
    };
}

function showTip(content, ev) {
    const tip = $tip();
    if (!tip) return;
    tip.innerHTML = '';
    for (const n of [].concat(content)) if (n) tip.appendChild(n);
    tip.classList.add('show');
    moveTip(ev);
}

/** 커서를 따라다니되 화면 밖으로 나가면 반대쪽으로 접는다 */
export function moveTip(ev) {
    const tip = $tip();
    if (!tip) return;
    const r = tip.getBoundingClientRect();
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 16;
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
}

export function hideTip() { $tip()?.classList.remove('show'); }

/* ───────── 카드 — 두 렌더러가 함께 쓴다 ───────── */

const classOf = id => M.CLASSES.find(c => c.id === id);
const tierOf = h => M.HERO_TIER[h.tier] ?? M.HERO_TIER.rare;

/**
 * 영웅 카드 — 이름 / 직업 · 레벨 · 죄종 · 등급 / **기본 능력치 7** (SCREEN_DESIGN §5).
 * 옛 `title` 속성(직업·Lv·죄종·등급)이 들던 것에 능력치를 더한 것이다 — 값이 늘어 한 줄에 안 들어간다.
 * 능력치는 `h.stats` 에서 그대로 읽는다. 파생 전투치(HP·공격력 등)는 여기서 계산하지 않는다 — 캐릭터 탭의 몫이다.
 */
export function heroTipCard(h) {
    if (!h) return null;
    const tier = tierOf(h);
    const sin = M.SINS[h.sin];
    const cls = classOf(h.cls);
    const sub = [cls ? L(cls) : h.cls, t('tip.hero.lv', { n: h.level }), sin ? L(sin) : h.sin, L(tier)];
    const c = el('div', 'tip-card');
    c.innerHTML = `
        <div class="tip-head">${t('tip.hero.h')}</div>
        <div class="tip-name" style="color:${tier.color}">${L(h.name)}</div>
        <div class="tip-sub">${sub.join(' · ')}</div>
        <div class="tip-stats">${M.STATS.map(s => `
            <div class="tip-stat"><span class="n">${L(s)}<i>${s.abbr}</i></span><b>${h.stats?.[s.id] ?? '—'}</b></div>`).join('')}</div>`;
    return c;
}

/**
 * 스킬 카드 — 아이콘 + 이름 / 표기 쿨 · **실효 쿨**(행동 주기에 맞춰 올림, battle_design §6) / 설명.
 * 실효 쿨은 진짜 파생값이다 — "표기 6초"만 봐서는 주기 2.4초인 영웅이 실제로 7.2초마다 쓴다는 걸 못 읽는다.
 * 설명(`s.d`)은 목업이다 — 스킬 미작성이라 발행된 텍스트가 없다 (DEV_PLAN 부채 #13 · #15).
 * @param period 그 유닛의 행동 주기(초). 없으면 실효 쿨 줄을 접는다
 */
export function skillTipCard(s, period) {
    if (!s) return null;
    const c = el('div', 'tip-card');
    let cdLine = t('sk.base', { s: s.cd });
    if (period > 0) {
        const eff = Math.ceil(s.cd / period) * period;
        const loss = (eff - s.cd) / s.cd * 100;
        cdLine += ` · <b class="${loss > 0.5 ? 'down' : 'up'}">${t('sk.eff', { s: eff.toFixed(1) })}</b>`
            + (loss > 0.5 ? ` <span class="muted">(+${loss.toFixed(0)}%)</span>` : ` <span class="muted">${t('sk.aligned')}</span>`);
    }
    c.innerHTML = `
        <div class="tip-head">${t('tip.skill.h')}</div>
        <div class="tip-name"><span class="tip-sk-ico">${s.i ?? ''}</span>${L(s.n)}</div>
        <div class="tip-implicit">${cdLine}</div>
        ${s.d ? `<div class="tip-desc">${L(s.d)}</div>` : ''}
        <div class="tip-sub" style="margin:6px 0 0">${t('tip.skill.mock')}</div>`;
    return c;
}
