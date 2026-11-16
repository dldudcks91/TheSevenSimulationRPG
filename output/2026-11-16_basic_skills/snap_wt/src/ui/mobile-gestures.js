/** Related information is a horizontal page; actions keep their original handlers. */
import { t } from './i18n.js';
import { hideTip } from './tip.js';

const owners = new WeakMap();
const blocked = 'button, a, input, select, textarea, [contenteditable], [draggable="true"], .hs-panel, .fm-cell, .inv-cell, .pd-cell, .gear-slot, .pt-slot, .p-stock, .sk-field, .sk-tree, .mg-field, [data-mobile-no-swipe]';
let suppress = null;
let actionPress = null;
let cancelActive = null;
window.addEventListener('pointerdown', event => {
    // A subsequent deliberate tap must never inherit suppression from a swipe.
    cancelActive?.(); suppress = null; actionPress = null;
    const button = event.target.closest?.('button');
    if (document.documentElement.hasAttribute('data-mobile') && event.isPrimary && event.button === 0 &&
        button?.closest('.mobile-swipe') && !button.matches('.mobile-page-tab, .mobile-choice-button')) {
        actionPress = {id:event.pointerId, x:event.clientX, y:event.clientY, moved:false};
    }
}, true);
window.addEventListener('pointermove', event => {
    if (actionPress?.id === event.pointerId && Math.hypot(event.clientX-actionPress.x, event.clientY-actionPress.y) > 8) actionPress.moved = true;
}, true);
window.addEventListener('pointerup', event => {
    if (actionPress?.id !== event.pointerId) return;
    if (actionPress.moved) suppress = {x:event.clientX,y:event.clientY,until:performance.now()+400};
    actionPress = null;
}, true);
window.addEventListener('pointercancel', () => { actionPress = null; }, true);
// A mouse can leave before direction lock/capture. Clean up after local handlers,
// including releases outside the page and window focus loss, without per-render listeners.
window.addEventListener('pointerup', () => cancelActive?.());
window.addEventListener('pointercancel', () => cancelActive?.());
window.addEventListener('blur', () => { cancelActive?.(); actionPress = null; });
// A swipe must never turn into the click generated after pointerup, even after a render.
window.addEventListener('click', event => {
    if (!suppress || event.detail === 0 || performance.now() > suppress.until) return;
    if (Math.hypot(event.clientX - suppress.x, event.clientY - suppress.y) > 32) return;
    suppress = null; event.preventDefault(); event.stopImmediatePropagation();
}, true);

export function bindMobileSwipe(root, { panes, nav, getIndex, select, order = panes.map((_, i) => i), buttons = panes.map((_, i) => nav.children[i]) }) {
    const owner = {}; owners.set(root, owner);
    root.classList.add('mobile-swipe');
    const hint = document.createElement('div'); hint.className = 'mobile-swipe-hint';
    const previous = document.createElement('span'), middle = document.createElement('span'), next = document.createElement('span');
    middle.className = 'mobile-swipe-position';
    hint.append(previous, middle, next); nav.appendChild(hint);
    const labels = buttons.map(button => button.textContent.trim());
    const live = document.createElement('span'); live.className = 'mobile-swipe-live';
    live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true'); root.appendChild(live);
    hint.id = `${nav.children[0].id}-gesture`;
    for (const pane of panes) {
        pane.classList.add('mobile-swipe-surface');
        pane.setAttribute('aria-describedby', [pane.getAttribute('aria-describedby'), hint.id].filter(Boolean).join(' '));
    }
    const update = (announce = false, prepare = true) => {
        const position = order.indexOf(getIndex());
        if (prepare) {
            const navStyle = getComputedStyle(nav);
            nav.classList.toggle('mobile-swipe-rail', navStyle.display === 'flex' && navStyle.flexDirection === 'column');
            // touch-action is resolved only as far as the first scroll container.
            // Apply it to vertical lists as well as the surrounding page, while
            // leaving genuinely horizontal scroll areas to the browser.
            for (const node of [panes[getIndex()], ...panes[getIndex()].querySelectorAll('*')]) {
                const css = getComputedStyle(node);
                if (node.clientHeight && /auto|scroll/.test(css.overflowY)) {
                    node.classList.toggle('mobile-swipe-y-scroll', node.scrollWidth <= node.clientWidth + 2 && !node.matches('.hero-strip, .sk-field, .sk-tree, .mg-field'));
                }
            }
        }
        previous.textContent = position > 0 ? `‹ ${labels[order[position - 1]]}` : '';
        next.textContent = position < order.length - 1 ? `${labels[order[position + 1]]} ›` : '';
        middle.textContent = t('mobile.swipe.position', {n: position + 1, total: order.length});
        hint.setAttribute('aria-label', t('mobile.swipe.help'));
        if (announce) live.textContent = `${labels[getIndex()]} · ${position + 1}/${order.length}`;
    };
    let drag = null, motion = null;
    const clear = () => {
        if (!drag) return;
        const {pane, id} = drag;
        pane.style.removeProperty('transform'); pane.classList.remove('mobile-swipe-moving');
        root.classList.remove('mobile-swiping'); delete root.dataset.swipePreview;
        drag = null;
        if (cancelActive === clear) cancelActive = null;
        if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
        update(false, false);
    };
    const nearestOwner = target => {
        for (let node = target; node; node = node.parentElement) if (owners.has(node)) return owners.get(node);
    };
    root.addEventListener('pointerdown', event => {
        if (drag && event.pointerId !== drag.id) { clear(); return; }
        const navigation = event.target.closest('.mobile-page-tab, .mobile-choice-button');
        if (!event.isPrimary || event.button !== 0 || nearestOwner(event.target) !== owner || event.target.closest(blocked) && !navigation) return;
        // Scrollable horizontal inventories and spatial boards own both axes.
        for (let n = event.target; n && n !== root; n = n.parentElement) {
            if (n.onpointerdown || /auto|scroll/.test(getComputedStyle(n).overflowX) && n.scrollWidth > n.clientWidth + 2) return;
        }
        const pane = panes[getIndex()];
        if (!pane?.contains(event.target) && !hint.contains(event.target) && !nav.contains(event.target)) return;
        motion?.cancel(); motion = null;
        const stage = document.getElementById('stage');
        const scale = stage ? stage.getBoundingClientRect().width / stage.offsetWidth : 1;
        drag = {id:event.pointerId, x:event.clientX, y:event.clientY, scale, pane, index:getIndex(), dx:0, locked:false};
        cancelActive = clear;
    });
    root.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.id) return;
        if (!root.isConnected || getIndex() !== drag.index) { clear(); return; }
        const dx = (event.clientX - drag.x) / drag.scale, dy = (event.clientY - drag.y) / drag.scale;
        if (!drag.locked) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
            if (Math.abs(dx) < Math.abs(dy) * 1.4) { clear(); return; }
            drag.locked = true; hideTip();
            root.setPointerCapture(event.pointerId);
            drag.pane.classList.add('mobile-swipe-moving'); root.classList.add('mobile-swiping');
        }
        event.preventDefault(); drag.dx = dx;
        const position = order.indexOf(drag.index), target = order[position + (dx < 0 ? 1 : -1)];
        root.dataset.swipePreview = target === undefined ? t(dx > 0 ? 'mobile.swipe.first' : 'mobile.swipe.edge') : labels[target];
        middle.textContent = root.dataset.swipePreview;
        const offset = Math.sign(dx) * Math.min(Math.abs(dx) * (target === undefined ? .18 : .7), 100);
        drag.pane.style.transform = `translateX(${offset}px)`;
    });
    root.addEventListener('pointerup', event => {
        if (!drag || event.pointerId !== drag.id) return;
        const {locked, dx, index, pane} = drag;
        const offset = pane.style.transform;
        const position = order.indexOf(index), destination = order[position + (dx < 0 ? 1 : -1)];
        const commit = locked && Math.abs(dx) >= Math.min(60, pane.clientWidth * .18) && destination !== undefined;
        if (locked) suppress = {x:event.clientX, y:event.clientY, until:performance.now() + 400};
        clear();
        if (!locked) return;
        if (commit) { select(destination); update(true, false); }
        const active = commit ? panes[destination] : pane;
        if (active.isConnected && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            motion = active.animate([{transform:commit ? `translateX(${dx < 0 ? 36 : -36}px)` : offset}, {transform:'translateX(0)'}], {duration:170, easing:'ease-out'});
        }
    });
    root.addEventListener('pointercancel', event => { if (drag?.id === event.pointerId) clear(); });
    // Touch first implicitly captures the child. Its bubbling loss is the handoff
    // to this root, not a cancellation of our newly acquired capture.
    root.addEventListener('lostpointercapture', event => { if (event.target === root && drag?.id === event.pointerId) clear(); });
    // Per-page listeners stay local; the module owns only one active gesture.
    update();
    return update;
}
