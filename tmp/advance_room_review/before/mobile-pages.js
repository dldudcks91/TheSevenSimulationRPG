/** Mobile presentation of existing, already-wired panels. No game state lives here. */
import { t } from './i18n.js';
import { bindMobileSwipe } from './mobile-gestures.js';
import { mountRegionSelection, compactSelector, chooseCards, groupChoices, summarizeEmptyRoster } from './mobile-native.js';

const selected = new Map();
const all = (root, selector) => [...root.querySelectorAll(selector)];
const titleOf = node => (node.querySelector('h2 .heading-label, .items-name, .heading-label')
    ?? node.querySelector('h2, .sub-h, .sk-box-head'))?.textContent.replace(/\?/g, '').trim();

function deck(root, key, entries, initial = 0, order = null) {
    entries = entries.filter(e => e.node);
    if (!root || entries.length < 2) return;
    root.classList.add('mobile-deck');
    root.dataset.mobileDeck = key;
    const nav = document.createElement('nav');
    nav.className = 'mobile-pages'; nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', t('mobile.sections'));
    nav.style.setProperty('--mobile-tabs', Math.min(entries.length, entries.length > 4 ? 3 : 4));
    nav.style.setProperty('--mobile-tab-count', entries.length);
    const index = Math.min(selected.get(key) ?? initial, entries.length - 1);
    order ??= entries.map((_, i) => i);
    let updateSwipe;
    const buttons = [];
    const show = i => {
        selected.set(key, i);
        entries.forEach((entry, j) => {
            entry.node.classList.toggle('mobile-pane-on', i === j);
            entry.node.inert = i !== j;
            const tab = buttons[j];
            tab.classList.toggle('on', i === j);
            tab.setAttribute('aria-selected', String(i === j));
            tab.tabIndex = i === j ? 0 : -1;
        });
        updateSwipe?.();
    };
    entries.forEach(({ node, label }, i) => {
        for (let p = node.parentElement; p && p !== root; p = p.parentElement) p.classList.add('mobile-unbox');
        node.classList.add('mobile-pane');
        node.dataset.keep ??= `mobile-${key}-${i}`;
        node.id ||= `mobile-${key}-${i}`;
        node.setAttribute('role', 'tabpanel');
        const tab = document.createElement('button'); tab.type = 'button';
        tab.className = 'btn mobile-page-tab'; tab.id = `mobile-tab-${key}-${i}`;
        tab.textContent = label ? t(`mobile.page.${label}`) : titleOf(node) || `${i + 1}`;
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', node.id);
        node.setAttribute('aria-labelledby', tab.id);
        tab.onclick = () => show(i);
        tab.onkeydown = event => {
            let next;
            const position = order.indexOf(i);
            if (event.key === 'ArrowRight') next = order[(position + 1) % entries.length];
            if (event.key === 'ArrowLeft') next = order[(position + entries.length - 1) % entries.length];
            if (event.key === 'Home') next = order[0];
            if (event.key === 'End') next = order.at(-1);
            if (next !== undefined) { event.preventDefault(); show(next); buttons[next].focus(); }
        };
        buttons.push(tab);
    });
    for (const i of order) nav.appendChild(buttons[i]);
    const hero = root.querySelector(':scope > .hs-panel');
    if (hero) hero.after(nav); else root.prepend(nav);
    show(index);
    updateSwipe = bindMobileSwipe(root, {panes: entries.map(e => e.node), nav, getIndex: () => selected.get(key), select: show, order, buttons});
    return show;
}

function afterPick(root, selector, key, index) {
    root.addEventListener('click', event => {
        if (!event.target.closest(selector)) return;
        // The original action re-renders synchronously; choose its destination first.
        selected.set(key, index);
        // Already-selected items can skip that render; open their detail immediately too.
        root.querySelector(`#mobile-tab-${key}-${index}`)?.click();
    }, true);
}

const items = (root, selector, labels = []) => all(root, selector).map((node, i) => ({ node, label: labels[i] }));

export function mountMobilePages(main) {
    main.classList.remove('mobile-regions');
    summarizeEmptyRoster(main);
    if (mountRegionSelection(main)) return;
    const tab = document.getElementById('app').dataset.tab;
    const page = main.querySelector(':scope > .page');
    if (main.querySelector('.bt-page')) {
        const battle = main.querySelector('.bt-page');
        const floor = battle.querySelector('.arena-floor');
        const tools = main.querySelector('[data-lab-tools]');
        if (floor && tools) {
            const bar = main.querySelector('.lab-duel-bar');
            floor.prepend(tools);
            if (bar) tools.after(bar);
        }
        if (document.getElementById('app').classList.contains('mobile-battle-details')) {
            const back = battle.querySelector('.bt-max-btn');
            if (back) {
                const bar = document.createElement('div'); bar.className = 'mobile-battle-back';
                const name = document.createElement('strong'); name.textContent = t('mobile.page.battle');
                back.appendChild(name); bar.appendChild(back); battle.prepend(bar);
            }
            const bags = tab === 'expedition' ? items(battle, '.bag-row > .bag', ['stash', 'bag']) : [];
            if (bags.length) deck(battle, 'battle-bags', bags);
            else battle.querySelector('.arena-floor')?.classList.add('mobile-detail-scroll');
        }
        return;
    }
    if (main.querySelector('.ng-wrap')) {
        const start = main.querySelector('.ng-wrap');
        deck(start, 'start-heroes', [...items(start, '.ng-row > .ng-card', ['hero1', 'hero2', 'hero3']), ...items(start, '.ng-legend', ['guide'])]);
        return;
    }
    if (!page || document.getElementById('app').classList.contains('pregame')) return;
    if (tab === 'expedition' && page.querySelector('.rep-runs')) {
        for (const table of all(page, '.rep-ct')) {
            const labels = all(table, '.ct-row.head > span').map(n => n.textContent);
            for (const row of all(table, '.ct-row:not(.head):not(.pad)')) {
                [...row.children].forEach((cell, i) => { if (i > 0) cell.dataset.mobileLabel = labels[i] ?? ''; });
            }
        }
        deck(page, 'reports', items(page, '.rep-runs, .rep-detail', ['reports','reportDetail']), 1);
        afterPick(page, '.rep-run', 'reports', 1);
    } else if (tab === 'character') {
        deck(page, tab, items(page, '.c-char > .panel, .bag-row > .bag', ['gear','basic','detail1','detail2','stash','bag']), 1, [3,2,1,0,4,5]);
    } else if (tab === 'explore') {
        const wrap = page.querySelector('.ex-map-wrap');
        const map = wrap?.querySelector('.ex-map');
        if (map) {
            const list = document.createElement('div');
            list.className = 'mobile-explore-spots'; list.dataset.keep = 'mobile-explore-spots';
            for (const spot of all(map, '.ex-spot')) {
                const name = document.createElement('span'); name.textContent = spot.getAttribute('aria-label');
                spot.appendChild(name); list.appendChild(spot);
            }
            wrap.appendChild(list);
            groupChoices(list, all(list, '.ex-spot'), 'explore-chapter', card => card.dataset.exspot.split(':')[0],
                (_, chapter) => `${t('mobile.chapter')} ${chapter}`);
            const pop = map.querySelector('.ex-pop');
            if (pop) wrap.appendChild(pop);
        }
    } else if (tab === 'party') {
        const shareLabel = page.querySelector('.rs-colh .c-extra')?.textContent;
        for (const share of all(page, '.rs-cell .rs-lead')) if (shareLabel) share.dataset.mobileLabel = shareLabel;
        deck(page.querySelector('.pt-body'), tab, items(page, '.pt-left > .fm-box, .pt-left > .pt-potion, .pt-tactics', ['formation','potions','tactics']));
        const tactics = page.querySelector('.pt-tactics');
        const grid = tactics?.querySelector('.rs-grid');
        if (grid) {
            chooseCards(grid, all(grid, ':scope > .rs-cell'), 'tactics', (card, i) => `${i + 1} ${card.querySelector('.rs-sin')?.textContent.trim() ?? '🔒'}`);
            deck(tactics, 'tactic-content', items(tactics, ':scope > .rs-grid, :scope > .rs-board', ['cards','bonuses']));
        }
    } else if (tab === 'research') {
        deck(page.querySelector('.cn-box'), tab, items(page, '.cn-lotbox, .cn-side', ['town','building']));
        afterPick(page, '.cn-lot', tab, 1);
        const side = page.querySelector('.cn-side');
        if (side) {
            const overview = document.createElement('div'); overview.className = 'mobile-building-overview';
            for (const node of all(side, ':scope > .cn-head, :scope > .cn-next')) overview.appendChild(node);
            const history = document.createElement('div'); history.className = 'mobile-building-history';
            for (const node of all(side, ':scope > .cn-sub, :scope > .cn-ranks')) history.appendChild(node);
            side.append(overview, history);
            deck(side, 'building-content', [{node:overview,label:'building'}, {node:history,label:'ranks'}]);
        }
    } else if (tab === 'tavern') {
        deck(page, tab, items(page, '.tv-top > .panel, .tv-low > .panel', ['hire','search','quests','gamble']));
        const candidates = page.querySelector('.tv-cands');
        if (candidates) chooseCards(candidates, all(candidates, ':scope > .ng-card'), 'hire',
            (card, i) => card.querySelector('.tv-empty-l, .ng-name b')?.textContent ?? `${i + 1}`, { portrait: true });
        const commissions = page.querySelector('.cm-board');
        if (commissions) chooseCards(commissions, all(commissions, ':scope > .cm-card:not(.ghost)'), 'commissions',
            (card, i) => `${i + 1} ${card.querySelector('.cm-sin')?.textContent ?? ''}`);
        const visitor = page.querySelector('.tv-join-card');
        if (visitor) {
            visitor.classList.add('mobile-choice-card', 'mobile-choice-on');
            visitor.closest('.tv-search').classList.add('mobile-visitor-detail');
        }
    } else if (tab === 'shop') {
        deck(page, tab, items(page, '.c-shop-band > .panel, .c-shop-stack > .panel, .bag-row > .bag', ['buy','sell','trade','merchant','stash','bag']));
    } else if (tab === 'forge') {
        const work = page.querySelector('.c-forge-col');
        deck(page, tab, [{node:work,label:'work'}, ...items(page, '.c-forge-band > .panel, .bag-row > .bag', ['gear','stash','bag'])]);
        afterPick(page, '.inv-cell.filled, .pd-cell.filled', tab, 0);
        const upgrade = page.querySelector('.fg-up');
        if (upgrade) {
            const temper = upgrade.querySelector('.fg-tp');
            const sections = [{node:upgrade.querySelector('.fg-up-work'),label:'upgrade'}, {node:upgrade.querySelector('.fg-up-tipcol'),label:'gear'}];
            if (temper) sections.push({node:temper,label:'temper'});
            deck(upgrade, 'forge-up', sections, 0, temper ? [2,0,1] : null);
        }
    } else if (tab === 'library') {
        // Folder tabs split Skill Books / Advance; the book tab pages its two sections (ADR-1165).
        deck(page.querySelector('.lib-split'), 'library-books', items(page, '.lib-split > .lib-sec', ['upgrade','books']));
        const branches = page.querySelector('.tr-adv-row');
        if (branches) chooseCards(branches, all(branches, ':scope > .tr-adv-branch'), 'advance',
            card => card.querySelector('.tr-adv-bh > b')?.textContent ?? '', { activate: true });
    } else if (tab === 'resource') {
        const grid = page.querySelector('.dp-tree-grid');
        // Turn the desktop coordinate grid into a list of production lines.
        // Each line keeps its own hero slots and connected research nodes.
        if (grid) {
            const rows = new Map();
            for (const node of [...grid.children]) {
                const row = node.style.gridRow;
                if (!rows.has(row)) {
                    const group = document.createElement('section'); group.className = 'mobile-research-line';
                    rows.set(row, group);
                }
                rows.get(row).appendChild(node);
            }
            grid.replaceChildren(...rows.values());
            groupChoices(grid, [...rows.values()], 'research-line', card => String([...rows.values()].indexOf(card)),
                card => card.querySelector('.dp-card-n')?.textContent ?? '');
        }
        deck(page, tab, items(page, '.dp-tree, .dp-wrap > .dp-side', ['research','researchDetail']));
        afterPick(page, '.dp-tree-cell, .dp-card', tab, 1);
        const side = page.querySelector('.dp-wrap > .dp-side');
        if (side?.querySelector(':scope > .dp-side-next')) {
            const decision = document.createElement('div'); decision.className = 'mobile-research-decision';
            for (const node of all(side, ':scope > .dp-side-h, :scope > .dp-side-next')) decision.appendChild(node);
            side.appendChild(decision);
            deck(side, 'research-content', [{node:decision,label:'researchAction'}, {node:side.querySelector(':scope > .dp-lvl'),label:'levels'}]);
        } else if (side?.querySelector(':scope > .dp-side-fx')) {
            const production = document.createElement('div'); production.className = 'mobile-research-production';
            for (const node of all(side, ':scope > .dp-side-h, :scope > .dp-side-line')) production.appendChild(node);
            side.appendChild(production);
            deck(side, 'research-line-content', [{node:production,label:'production'}, {node:side.querySelector(':scope > .dp-side-fx'),label:'registration'}]);
        }
    } else if (tab === 'colosseum' || tab === 'arena') {
        deck(page, tab, items(page, '.arena-rail, .arena-main', ['opponent','prepare']));
        afterPick(page, '.cs-floor:not(.locked), .ar-cand', tab, 1);
        const preparation = page.querySelector('.arena-main');
        if (preparation) {
            compactSelector(preparation.querySelector('.arena-selection > .segmented'), t('mobile.party'), 'arena-party');
            deck(preparation, 'arena-preparation', items(preparation, ':scope > .arena-prep, :scope > .arena-load', ['field','setup']));
        }
    } else if (tab === 'codex') {
        compactSelector(main.querySelector('.cx-tabs'), t('mobile.selection'), 'codex-category');
        compactSelector(page.querySelector('.cx-ch-seg'), t('mobile.chapter'), 'codex-chapter');
    } else if (tab === 'help') {
        compactSelector(page.querySelector('.help-tabs'), t('mobile.selection'), 'help-topic');
    } else if (tab === 'lab') {
        const raid = main.querySelector('.raid-page');
        if (raid) {
            const header = raid.querySelector('.raid-header');
            const tools = main.querySelector('[data-lab-tools]');
            if (tools) header.prepend(tools);
            const live = raid.querySelector('[data-raid-pause]')?.closest('.raid-group');
            if (live) { live.classList.add('mobile-raid-live'); raid.querySelector('.raid-footer').appendChild(live); }
            const show = deck(raid, 'raid', [
                {node:raid.querySelector('.raid-field'),label:'field'},
                {node:raid.querySelector('.raid-header'),label:'setup'},
                {node:raid.querySelector('.raid-feed'),label:'log'},
            ]);
            deck(raid.querySelector('.raid-lanes'), 'raid-parties', items(raid, '.raid-lane', ['party1','party2','party3']));
            const expand = raid.querySelector('.raid-header .raid-group:last-child .btn:first-child');
            if (expand) { expand.textContent = t('mobile.page.battle'); expand.onclick = () => show?.(0); }
        }
        const lab = page.querySelector('.lab-item');
        deck(lab, 'lab-item', items(page, '.lab-cond, .lab-out', ['generate','result']));
        afterPick(page, '.lab-foot .btn', 'lab-item', 1);
    }
}

export function mountMobileDialog(box) {
    if (!box) return;
    const skills = box.querySelector('.c-skill');
    if (skills) {
        deck(skills, 'skills', items(skills, ':scope > div', ['skills']));
    }
    const depart = box.querySelector('.dw-body');
    if (depart) {
        const actions = depart.querySelector('.form-actions');
        if (actions) { actions.classList.add('mobile-dialog-actions'); box.appendChild(actions); }
        deck(depart, 'depart', items(depart, ':scope > div'));
    }
}
