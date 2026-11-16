/** Mobile decision screens: choose first, inspect one item, keep its actions visible. */
import { t } from './i18n.js';
import { bindMobileSwipe } from './mobile-gestures.js';

const picks = new Map();
const nodes = (root, selector) => [...root.querySelectorAll(selector)];
const make = (tag, cls, text) => {
    const n = document.createElement(tag); n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};

/** The existing buttons remain the owners of selection and validation. */
export function compactSelector(group, label, key) {
    if (!group || group.dataset.mobileSelect) return null;
    const buttons = nodes(group, ':scope > button');
    if (!buttons.length) return null;
    const field = make('label', 'mobile-select-field');
    field.appendChild(make('span', 'mobile-select-label', label));
    const select = make('select', 'mobile-select');
    select.setAttribute('aria-label', label); select.dataset.mobileSelect = key;
    buttons.forEach((button, i) => {
        const option = document.createElement('option');
        option.value = String(i); option.textContent = button.textContent.trim();
        option.disabled = button.disabled;
        option.selected = button.classList.contains('on');
        select.appendChild(option);
    });
    select.onchange = () => {
        const focused = document.activeElement === select;
        buttons[Number(select.value)]?.click();
        if (focused) document.querySelector(`select[data-mobile-select="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
    };
    field.appendChild(select); group.before(field);
    group.dataset.mobileSelect = key; group.hidden = true; group.inert = true;
    // Help filters its existing buttons without re-rendering the screen.
    // Mirror their availability and current topic into the native control.
    const sync = () => {
        buttons.forEach((button, i) => {
            select.options[i].disabled = button.disabled || button.hidden;
            select.options[i].selected = button.classList.contains('on');
        });
        select.disabled = [...select.options].every(option => option.disabled);
    };
    new MutationObserver(sync).observe(group, { subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'class'] });
    sync();
    return field;
}

/** Group a finite location/production list without changing its original actions. */
export function groupChoices(root, cards, key, groupOf, labelOf) {
    if (!root || !cards.length) return;
    const groups = [...new Set(cards.map(groupOf))];
    if (groups.length < 2) return;
    const field = make('label', 'mobile-select-field mobile-group-selector');
    field.appendChild(make('span', 'mobile-select-label', t('mobile.selection')));
    const select = make('select', 'mobile-select'); select.dataset.mobileSelect = key;
    select.setAttribute('aria-label', t('mobile.selection'));
    groups.forEach(value => {
        const option = make('option', '', labelOf(cards.find(card => groupOf(card) === value), value));
        option.value = value; select.appendChild(option);
    });
    const chosen = cards.find(card => card.matches('.on') || card.querySelector('.on, .picked'));
    select.value = groups.includes(picks.get(key)) ? picks.get(key) : chosen ? groupOf(chosen) : groups[0];
    const show = () => {
        picks.set(key, select.value);
        cards.forEach(card => { const hidden = groupOf(card) !== select.value; card.classList.toggle('mobile-group-hidden', hidden); card.inert = hidden; });
    };
    select.onchange = show; field.appendChild(select); root.before(field); show();
}

export function summarizeEmptyRoster(main) {
    for (const strip of nodes(main, '.hero-strip')) {
        const empty = nodes(strip, ':scope > .hs-card.empty:not(.lock)');
        if (!empty.length) continue;
        const first = empty[0]; first.classList.add('mobile-roster-capacity');
        first.textContent = t('mobile.freeSlots', {n: empty.length});
        for (const card of empty.slice(1)) card.remove();
    }
}

export function mountRegionSelection(main) {
    const panel = main.querySelector(':scope > .diff-panel');
    if (!panel) return false;
    main.classList.add('mobile-regions');
    const controls = make('div', 'mobile-region-controls');
    const difficulty = main.querySelector(':scope > .diff-tabs');
    if (difficulty) controls.appendChild(difficulty);
    const gate = difficulty?.querySelector('.dt-fill > .zone-lock');
    const bar = panel.querySelector(':scope > .sub-bar');
    if (bar) {
        controls.appendChild(bar);
        compactSelector(bar.querySelector('.segmented'), t('mobile.chapter'), 'chapter');
    }
    if (gate) { gate.classList.add('mobile-region-note'); controls.appendChild(gate); }
    const list = make('div', 'mobile-zone-list');
    const zones = nodes(panel, ':scope > .zone');
    list.style.setProperty('--mobile-zone-count', zones.length);
    for (const zone of zones) {
        zone.tabIndex = 0; zone.setAttribute('role', 'button');
        zone.setAttribute('aria-label', zone.querySelector('.title')?.textContent.trim() ?? '');
        zone.setAttribute('aria-disabled', String(zone.classList.contains('locked')));
        zone.onkeydown = e => {
            if (e.target === zone && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); zone.click(); }
        };
        for (const go of nodes(zone, '.zone-go button')) {
            go.setAttribute('aria-label', go.textContent.trim());
            const number = go.textContent.trim().match(/([IVX]+)$/)?.[1];
            if (number) go.textContent = number;
        }
        list.appendChild(zone);
    }
    panel.appendChild(list); main.prepend(controls);
    return true;
}

/** Swipe related candidates, with direct selection and explicit action fallbacks. */
export function chooseCards(root, cards, key, labelOf, { portrait = false, activate = false } = {}) {
    if (!root || cards.length < 2) return;
    root.classList.add('mobile-choice');
    const bar = make('div', 'mobile-choice-bar');
    bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', t('mobile.selection'));
    bar.style.setProperty('--choice-count', cards.length);
    let currentIndex = 0, updateSwipe;
    const show = index => {
        currentIndex = index;
        picks.set(key, index);
        cards.forEach((card, i) => {
            card.classList.toggle('mobile-choice-on', i === index); card.inert = i !== index;
            const b = bar.children[i]; b.classList.toggle('on', i === index);
            b.setAttribute('aria-selected', String(i === index)); b.tabIndex = i === index ? 0 : -1;
        });
        updateSwipe?.();
    };
    cards.forEach((card, i) => {
        card.classList.add('mobile-choice-card');
        card.id ||= `mobile-choice-${key}-${i}`;
        card.setAttribute('role', 'tabpanel');
        const b = make('button', 'btn mobile-choice-button'); b.type = 'button';
        b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', card.id);
        b.id = `${card.id}-tab`; card.setAttribute('aria-labelledby', b.id);
        if (portrait) {
            const img = card.querySelector('.hero-face img, img.sprite');
            if (img) { const copy = img.cloneNode(); copy.alt = ''; b.appendChild(copy); }
        }
        b.appendChild(make('span', '', labelOf(card, i)));
        const pick = () => {
            const focused = document.activeElement === b;
            show(i);
            if (activate && card.classList.contains('can-pick') && !card.classList.contains('pick')) card.click();
            if (focused) document.getElementById(b.id)?.focus({ preventScroll: true });
        };
        b.onclick = pick;
        b.onkeydown = e => {
            const n = e.key === 'ArrowRight' ? (i + 1) % cards.length : e.key === 'ArrowLeft' ? (i + cards.length - 1) % cards.length : null;
            if (n !== null) { e.preventDefault(); bar.children[n].click(); document.getElementById(bar.children[n].id)?.focus(); }
        };
        bar.appendChild(b);
    });
    root.prepend(bar);
    const current = activate ? cards.findIndex(card => card.matches('.pick, .done')) : -1;
    show(current >= 0 ? current : Math.min(picks.get(key) ?? 0, cards.length - 1));
    updateSwipe = bindMobileSwipe(root, {panes:cards, nav:bar, getIndex:() => currentIndex,
        select:index => bar.children[index].click()});
}
