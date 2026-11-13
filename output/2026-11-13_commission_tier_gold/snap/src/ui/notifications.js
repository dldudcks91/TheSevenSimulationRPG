/** Top-bar notification menu. Pending work is derived; acknowledgements use the browser storage adapter. */
import { t } from './i18n.js';
import { BELL_ART } from './mock.js';
import { bindTipNode } from './tip.js';

const BUBBLE_MS = 3000;
const RING_MS = 650;
// Card places always laid in a folder — matches the fixed body height (ADR-0984); empty places are faint bells like the mailbox (ADR-0988).
const SLOTS = 3;
// A mission keeps its acknowledgement while its meaningful destination stays the same.
// Retry counts and the selected hero can change without creating a new mission.
const missionKey = item => {
    const target = item.target ?? {};
    return `mission:${JSON.stringify([item.id, target.building, target.commission,
        target.preset, target.difficulty, target.stageId])}`;
};
const node = (tag, cls, text) => {
    const out = document.createElement(tag);
    if (cls) out.className = cls;
    if (text !== undefined) out.textContent = text;
    return out;
};

export function createNotifications({ read, describe, navigate, hideTip, lockIcon, readDismissed, writeDismissed }) {
    let owner = null, model = null, signature = '', host = null;
    let open = false, openedOnce = false, collapsed = false, seen = new Set(), restoreFocus = null;
    let bubble = '', bubbleUntil = 0, bubbleTimer = null, ringAt = 0;
    let folder = 'notifications', folderScroll = {};
    let dismissed = new Set();

    function rememberScroll() {
        const list = host?.querySelector('.notification-list');
        if (list?.getClientRects().length) folderScroll[list.dataset.folder] = list.scrollTop;
    }

    function selectFolder(id, focus = true) {
        if (!['notifications', 'missions'].includes(id)) return;
        rememberScroll();
        folder = id;
        hideTip();
        paint();
        if (focus) host?.querySelector(`[data-notification-action="folder-${id}"]`)?.focus({ preventScroll: true });
    }

    function observe() {
        const next = read();
        if (!next) {
            owner = null; model = null; signature = ''; open = false; seen.clear(); restoreFocus = null;
            bubble = ''; clearTimeout(bubbleTimer);
            return false;
        }
        const changedOwner = owner !== next.owner;
        if (changedOwner) {
            owner = next.owner; open = false; collapsed = false; seen = new Set();
            dismissed = new Set(readDismissed(owner));
            folderScroll = {}; folder = 'notifications'; openedOnce = false; restoreFocus = null;
            bubble = ''; clearTimeout(bubbleTimer);
        }
        const items = next.model.items.filter(item => !dismissed.has(item.id));
        const guide = next.model.guide && !dismissed.has(missionKey(next.model.guide)) ? next.model.guide : null;
        const arrived = changedOwner ? [] : items.filter(item => !seen.has(item.id));
        const retry = guide?.id === 'retryPreparation' ? guide : null;
        const retryKey = retry ? missionKey(retry) : '';
        if (!changedOwner && retryKey && !seen.has(retryKey)) arrived.push(retry);
        if (retryKey) seen.add(retryKey);
        for (const item of next.model.items) seen.add(item.id);
        // The bell includes only unacknowledged notification items and the current mission.
        model = { ...next.model, guide, items, count: items.length + (guide ? 1 : 0) };
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
        hideTip();
        open = false;
        paint();
        if (focus) host?.querySelector('.notification-btn')?.focus({ preventScroll: true });
    }

    function acknowledge(key, guide) {
        const index = model.items.findIndex(current => current.id === key);
        dismissed.add(key);
        writeDismissed(owner, [...dismissed]);
        bubble = ''; clearTimeout(bubbleTimer);
        hideTip();
        observe();
        paint();
        const remaining = host.querySelectorAll('.notification-confirm');
        const target = guide ? host.querySelector('[data-folder="missions"][role="tab"]')
            : remaining[Math.min(index, remaining.length - 1)]
                ?? host.querySelector('[data-folder="notifications"][role="tab"]');
        target?.focus({ preventScroll: true });
    }

    function row(item, guide = false) {
        const text = describe(item);
        const card = node('div', `notification-card${guide ? ' notification-guide' : ''}`);
        if (item.id === 'retryPreparation') card.classList.add('notification-retry');
        const copy = node('div', 'notification-copy');
        copy.appendChild(node('div', 'notification-title', text.title));
        if (text.detail) copy.appendChild(node('div', 'notification-detail', text.detail));
        const action = node('button', 'btn sm notification-go', t('nt.shortcut'));
        action.dataset.notificationAction = item.id;
        action.setAttribute('aria-label', `${text.title} · ${action.textContent}`);
        action.onclick = () => { close(); hideTip(); navigate(item); };
        const actions = node('div', 'notification-actions');
        actions.appendChild(action);
        const confirm = node('button', 'btn sm notification-confirm', t('nt.check'));
        const key = guide ? missionKey(item) : item.id, rowOwner = owner;
        confirm.dataset.notificationAction = `confirm:${item.id}`;
        confirm.setAttribute('aria-label', `${text.title} · ${confirm.textContent}`);
        confirm.onclick = () => { if (owner === rowOwner) acknowledge(key, guide); };
        actions.appendChild(confirm);
        card.append(copy, actions);
        return card;
    }

    function paint() {
        if (!host?.isConnected || !model) return;
        const focused = host.contains(document.activeElement)
            ? document.activeElement.dataset.notificationAction : restoreFocus;
        restoreFocus = null;
        rememberScroll();
        // Keep the actual button in place so toggles and badge updates preserve normal hover events.
        host.querySelectorAll(':scope > :not(.notification-btn)').forEach(child => child.remove());
        const ringAge = Date.now() - ringAt;
        const button = host.querySelector('.notification-btn') ?? node('button');
        button.className = `mail-btn notification-btn${model.count ? ' has' : ''}${bubble && ringAge < RING_MS ? ' ringing' : ''}`;
        button.replaceChildren();
        button.dataset.notificationAction = 'bell';
        bindTipNode(button, () => {
            const card = node('div', 'tip-card tip-mini');
            card.appendChild(node('div', 'tip-name', t('nt.h')));
            return card;
        });
        button.setAttribute('aria-label', model.count ? t('nt.count', { n: model.count }) : t('nt.h'));
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-controls', 'notification-panel');
        const art = node('img');
        art.src = BELL_ART; art.alt = ''; art.draggable = false;
        if (bubble && ringAge < RING_MS) art.style.animationDelay = `-${ringAge}ms`;
        button.appendChild(art);
        if (model.count) button.appendChild(node('span', 'mail-n', model.count > 99 ? '99+' : model.count));
        button.onclick = () => {
            if (!open && !openedOnce) {
                folder = model.guide ? 'missions' : 'notifications';
                openedOnce = true;
            }
            open = !open;
            hideTip();
            paint();
            host.querySelector(open ? '.notification-close' : '.notification-btn')?.focus({ preventScroll: true });
        };
        if (button.parentNode !== host) host.appendChild(button);

        if (bubble && Date.now() < bubbleUntil && !open) {
            const note = node('div', 'notification-bubble', bubble);
            note.setAttribute('role', 'status');
            host.appendChild(note);
        }
        const panel = node('div', 'notification-panel');
        panel.id = 'notification-panel'; panel.hidden = !open;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-labelledby', 'notification-heading');
        // Same head and square close as every game window (`.modal-head.plain` · `.modal-x` — ADR-0744 · ADR-0988).
        const head = node('div', 'modal-head plain notification-head');
        const heading = node('h2', '', t('nt.h'));
        heading.id = 'notification-heading';
        const dismiss = node('button', 'btn modal-x notification-close', '×');
        dismiss.dataset.notificationAction = 'close';
        dismiss.title = t('ui.close');
        dismiss.setAttribute('aria-label', t('ui.close'));
        dismiss.onclick = () => close(true);
        head.append(heading, dismiss);
        panel.appendChild(head);
        const folders = node('div', 'fg-tabs notification-folders');
        folders.setAttribute('role', 'tablist');
        folders.setAttribute('aria-label', t('nt.h'));
        // Gaps and the fill draw the folder line like the forge tabs (`.fg-gap` · `.fg-fill`).
        folders.appendChild(node('span', 'fg-gap'));
        for (const id of ['notifications', 'missions', 'achievements']) {
            const locked = id === 'achievements', selected = folder === id;
            if (id !== 'notifications') folders.appendChild(node('span', 'fg-gap'));
            const tab = node('button', `fg-tab notification-folder${selected ? ' on' : ''}`);
            tab.type = 'button'; tab.id = `notification-folder-${id}`;
            tab.dataset.notificationAction = `folder-${id}`;
            tab.dataset.folder = id;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', String(selected));
            tab.setAttribute('aria-controls', `notification-content-${id}`);
            tab.tabIndex = selected ? 0 : -1;
            if (locked) {
                const icon = node('span', 'lock-ico');
                icon.innerHTML = lockIcon();
                tab.appendChild(icon);
                tab.disabled = true;
                tab.setAttribute('aria-disabled', 'true');
                tab.setAttribute('aria-label', t('nt.achievementsLocked'));
                bindTipNode(tab, () => {
                    const tip = node('div', 'tip-card tip-mini');
                    tip.appendChild(node('div', 'tip-name', t('nt.achievementsLocked')));
                    return tip;
                });
            } else tab.onclick = () => selectFolder(id);
            tab.appendChild(node('span', 'notification-folder-label', t(`nt.folder.${id}`)));
            const count = id === 'notifications' ? model.items.length : id === 'missions' && model.guide ? 1 : 0;
            if (count) tab.appendChild(node('span', 'notification-folder-count', String(count)));
            folders.appendChild(tab);
        }
        folders.appendChild(node('span', 'fg-gap fg-fill'));
        folders.onkeydown = event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const ids = ['notifications', 'missions'];
            const index = ids.indexOf(folder);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
            selectFolder(ids[next]);
        };
        panel.appendChild(folders);
        const list = node('div', 'notification-list');
        list.id = `notification-content-${folder}`;
        list.dataset.folder = folder;
        list.setAttribute('role', 'tabpanel');
        list.setAttribute('aria-labelledby', `notification-folder-${folder}`);
        if (folder === 'missions' && model.guide) {
            const toggle = node('button', 'notification-guide-toggle', t('nt.next'));
            toggle.dataset.notificationAction = 'guide-toggle';
            toggle.setAttribute('aria-expanded', String(!collapsed));
            toggle.appendChild(node('span', '', collapsed ? '+' : '−'));
            toggle.onclick = () => { collapsed = !collapsed; paint(); };
            list.appendChild(toggle);
            if (!collapsed) list.appendChild(row(model.guide, true));
        }
        // The empty folder has no sentence on screen — the first faint place carries it for screen readers.
        const fillEmpty = n => {
            for (let i = n; i < SLOTS; i++) {
                const slot = node('div', 'notification-card empty');
                const art = node('img');
                art.src = BELL_ART; art.alt = ''; art.draggable = false;
                slot.appendChild(art);
                if (i === 0) {
                    slot.setAttribute('role', 'img');
                    slot.setAttribute('aria-label', t(folder === 'missions' ? 'nt.missionsEmpty' : 'nt.empty'));
                } else slot.setAttribute('aria-hidden', 'true');
                list.appendChild(slot);
            }
        };
        if (folder === 'notifications') {
            for (const item of model.items) list.appendChild(row(item));
            fillEmpty(model.items.length);
        } else if (!model.guide) fillEmpty(0);
        panel.appendChild(list);
        // Keep inactive panel targets in the DOM for each folder's aria-controls, including the locked placeholder.
        for (const id of ['notifications', 'missions', 'achievements']) if (id !== folder) {
            const empty = node('div');
            empty.id = `notification-content-${id}`; empty.hidden = true;
            empty.setAttribute('role', 'tabpanel');
            empty.setAttribute('aria-labelledby', `notification-folder-${id}`);
            panel.appendChild(empty);
        }
        host.appendChild(panel);
        list.scrollTop = folderScroll[folder] ?? 0;
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
            rememberScroll();
            restoreFocus = host?.contains(document.activeElement)
                ? document.activeElement.dataset.notificationAction : null;
        },
        mount() {
            rememberScroll();
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
