/** Top-bar notification menu. Pending work comes from game.notificationState; nothing here is saved. */
import { t } from './i18n.js';
import { BELL_ART } from './mock.js';

const BUBBLE_MS = 3000;
const RING_MS = 650;
const node = (tag, cls, text) => {
    const out = document.createElement(tag);
    if (cls) out.className = cls;
    if (text !== undefined) out.textContent = text;
    return out;
};

export function createNotifications({ read, describe, navigate, hideTip }) {
    let owner = null, model = null, signature = '', host = null;
    let open = false, collapsed = false, seen = new Set(), restoreFocus = null;
    let bubble = '', bubbleUntil = 0, bubbleTimer = null, ringAt = 0, listScrollTop = 0;

    function observe() {
        const next = read();
        if (!next) {
            owner = null; model = null; signature = ''; open = false; seen.clear(); restoreFocus = null;
            bubble = ''; clearTimeout(bubbleTimer);
            return false;
        }
        const changedOwner = owner !== next.owner;
        const arrived = changedOwner ? [] : next.model.items.filter(item => !seen.has(item.id));
        if (changedOwner) {
            owner = next.owner; open = false; collapsed = false; seen = new Set();
            listScrollTop = 0; restoreFocus = null;
            bubble = ''; clearTimeout(bubbleTimer);
        }
        for (const item of next.model.items) seen.add(item.id);
        model = next.model;
        const nextSignature = JSON.stringify(model);
        const changed = signature !== nextSignature || changedOwner;
        signature = nextSignature;
        if (arrived.length) {
            bubble = arrived.length === 1 ? describe(arrived[0]).title : t('nt.arrived', { n: arrived.length });
            ringAt = Date.now();
            bubbleUntil = ringAt + BUBBLE_MS;
            clearTimeout(bubbleTimer);
            bubbleTimer = setTimeout(() => { bubble = ''; paint(); }, BUBBLE_MS);
        }
        return changed || arrived.length > 0;
    }

    function close(focus = false) {
        if (!open) return;
        open = false;
        paint();
        if (focus) host?.querySelector('.notification-btn')?.focus({ preventScroll: true });
    }

    function row(item, guide = false) {
        const text = describe(item);
        const card = node('div', `notification-card${guide ? ' notification-guide' : ''}`);
        const copy = node('div', 'notification-copy');
        copy.appendChild(node('div', 'notification-title', text.title));
        if (text.detail) copy.appendChild(node('div', 'notification-detail', text.detail));
        const action = node('button', 'btn sm notification-go', t(guide ? 'nt.go' : 'nt.check'));
        action.dataset.notificationAction = item.id;
        action.setAttribute('aria-label', `${text.title} · ${action.textContent}`);
        action.onclick = () => { close(); hideTip(); navigate(item); };
        card.append(copy, action);
        return card;
    }

    function paint() {
        if (!host?.isConnected || !model) return;
        const focused = host.contains(document.activeElement)
            ? document.activeElement.dataset.notificationAction : restoreFocus;
        restoreFocus = null;
        listScrollTop = host.querySelector('.notification-list')?.scrollTop ?? listScrollTop;
        host.replaceChildren();
        const ringAge = Date.now() - ringAt;
        const button = node('button', `mail-btn notification-btn${model.count ? ' has' : ''}${bubble && ringAge < RING_MS ? ' ringing' : ''}`);
        button.dataset.notificationAction = 'bell';
        button.title = t('nt.h');
        button.setAttribute('aria-label', model.count ? t('nt.count', { n: model.count }) : t('nt.h'));
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-controls', 'notification-panel');
        const art = node('img');
        art.src = BELL_ART; art.alt = ''; art.draggable = false;
        if (bubble && ringAge < RING_MS) art.style.animationDelay = `-${ringAge}ms`;
        button.appendChild(art);
        if (model.count) button.appendChild(node('span', 'mail-n', model.count > 99 ? '99+' : model.count));
        else if (model.guide) button.appendChild(node('span', 'notification-dot'));
        button.onclick = () => {
            open = !open;
            hideTip();
            paint();
            host.querySelector(open ? '.notification-close' : '.notification-btn')?.focus({ preventScroll: true });
        };
        host.appendChild(button);

        if (bubble && Date.now() < bubbleUntil && !open) {
            const note = node('div', 'notification-bubble', bubble);
            note.setAttribute('role', 'status');
            host.appendChild(note);
        }
        const panel = node('div', 'notification-panel');
        panel.id = 'notification-panel'; panel.hidden = !open;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-labelledby', 'notification-heading');
        const head = node('div', 'notification-head');
        const heading = node('h2', '', t('nt.h'));
        heading.id = 'notification-heading';
        const dismiss = node('button', 'btn sm notification-close', '×');
        dismiss.dataset.notificationAction = 'close';
        dismiss.title = t('ui.close');
        dismiss.setAttribute('aria-label', t('ui.close'));
        dismiss.onclick = () => close(true);
        head.append(heading, dismiss);
        panel.appendChild(head);
        const list = node('div', 'notification-list');
        if (model.guide) {
            const toggle = node('button', 'notification-guide-toggle', t('nt.next'));
            toggle.dataset.notificationAction = 'guide-toggle';
            toggle.setAttribute('aria-expanded', String(!collapsed));
            toggle.appendChild(node('span', '', collapsed ? '+' : '−'));
            toggle.onclick = () => { collapsed = !collapsed; paint(); };
            list.appendChild(toggle);
            if (!collapsed) list.appendChild(row(model.guide, true));
        }
        list.appendChild(node('div', 'notification-section', t('nt.pending')));
        if (model.items.length) for (const item of model.items) list.appendChild(row(item));
        else list.appendChild(node('div', 'notification-empty', t('nt.empty')));
        panel.appendChild(list);
        host.appendChild(panel);
        list.scrollTop = listScrollTop;
        if (focused) [...host.querySelectorAll('[data-notification-action]')]
            .find(control => control.dataset.notificationAction === focused)?.focus({ preventScroll: true });
    }

    // Only the small menu closes; the underlying game's controls keep their usual behavior.
    document.addEventListener('pointerdown', event => {
        if (open && !host?.contains(event.target)) close();
    }, true);
    document.addEventListener('focusin', event => {
        if (open && !host?.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && open) {
            event.preventDefault(); event.stopImmediatePropagation(); close(true);
        }
    });

    return {
        capture() {
            restoreFocus = host?.contains(document.activeElement)
                ? document.activeElement.dataset.notificationAction : null;
        },
        mount() {
            listScrollTop = host?.querySelector('.notification-list')?.scrollTop ?? listScrollTop;
            observe();
            host = node('div', 'notification-slot');
            // The caller attaches the host before paint so focus and positioning are measurable.
            return host;
        },
        refresh() { if (observe()) paint(); },
        paint,
        close,
        reset() { observe(); },
    };
}
