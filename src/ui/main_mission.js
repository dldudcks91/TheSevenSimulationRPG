/** Top-bar main mission menu (SCREEN_DESIGN §2 「메인미션」 · ADR-1232). Judgment, recording and claiming live in game_logic
 *  (`game.mainMissionState` · `mainMissionSync` · `mainMissionClaim`); this module only lists, opens, rings and calls back.
 *  Look and lifetime follow the bell menu (`notifications.js`) — same window, same cards, same bubble. */
import { t } from './i18n.js';
import { MISSION_ART } from './mock.js';
import { bindTipNode } from './tip.js';

const BUBBLE_MS = 3000;
const RING_MS = 650;
// One swing of the tutorial sign — set inline so a repaint can resume the swing where it was (ADR-1381)
const SWING_MS = 3200;
// Card places always laid in the list — the body height is fixed like the bell's (ADR-0984 · ADR-0988).
const SLOTS = 3;
const node = (tag, cls, text) => {
    const out = document.createElement(tag);
    if (cls) out.className = cls;
    if (text !== undefined) out.textContent = text;
    return out;
};

/**
 * read()  → `{owner, model: mainMissionState, fresh: [id]}` or null (not in a game)
 * label(m) → mission name · rewards(reward) → DOM node · claim(id) · claimAll(ids) · navigate(m) — the caller renders after each
 * readSeen(owner) → next-mission id last seen in the panel, or null · writeSeen(owner, id) — browser-only, not the game save (ADR-1245)
 * tutorial(m) → true when the next mission is a chapter-1 tutorial line — a sign hangs under the icon and pressing it acts like Go To (ADR-1381)
 */
export function createMainMission({ read, label, rewards, claim, claimAll, navigate, hideTip, readSeen, writeSeen, tutorial }) {
    let owner = null, model = null, signature = '', host = null;
    let open = false, restoreFocus = null, scroll = 0, seen = null;
    let bubble = '', bubbleUntil = 0, bubbleTimer = null, ringAt = 0;

    // Opening the panel marks the next mission as seen — so does a next mission that changes while it is open.
    function markSeen() {
        const id = model?.current?.id;
        if (!open || !id || id === seen) return;
        seen = id;
        writeSeen(owner, id);
    }

    function rememberScroll() {
        const list = host?.querySelector('.mission-list');
        if (list?.getClientRects().length) scroll = list.scrollTop;
    }

    function observe() {
        const next = read();
        if (!next) {
            owner = null; model = null; signature = ''; open = false; restoreFocus = null; seen = null;
            bubble = ''; clearTimeout(bubbleTimer);
            return false;
        }
        const changedOwner = owner !== next.owner;
        if (changedOwner) {
            owner = next.owner; open = false; scroll = 0; restoreFocus = null;
            seen = readSeen(owner);
            bubble = ''; clearTimeout(bubbleTimer);
        }
        model = next.model;
        markSeen();
        // A loaded save does not replay what it had already filled — only lines filled while the game is on ring the icon.
        const fresh = changedOwner ? [] : next.fresh ?? [];
        const nextSignature = JSON.stringify([model.claimable.map(m => m.id), model.current?.id, model.current?.have, model.got, seen]);
        const changed = changedOwner || signature !== nextSignature;
        signature = nextSignature;
        if (fresh.length) {
            const first = model.list.find(m => m.id === fresh[0]);
            bubble = fresh.length === 1 && first ? t('mm.bubble', { name: label(first) }) : t('mm.bubbleN', { n: fresh.length });
            ringAt = Date.now();
            bubbleUntil = ringAt + BUBBLE_MS;
            clearTimeout(bubbleTimer);
            bubbleTimer = setTimeout(() => { bubble = ''; paint(); }, BUBBLE_MS);
        }
        return changed || fresh.length > 0;
    }

    function close(focus = false) {
        if (!open) return;
        hideTip();
        open = false;
        paint();
        if (focus) host?.querySelector('.mission-btn')?.focus({ preventScroll: true });
    }

    function card(m, ready) {
        const name = label(m);
        const out = node('div', `notification-card mission-card ${ready ? 'mission-ready' : 'notification-guide mission-next'}`);
        const copy = node('div', 'notification-copy');
        const title = node('div', 'notification-title');
        title.appendChild(node('span', 'mission-name', name));
        copy.appendChild(title);
        const detail = node('div', 'notification-detail mission-detail');
        if (!ready && m.need > 1) detail.appendChild(node('span', 'mission-have', t('mm.have', { have: m.have, need: m.need })));
        detail.appendChild(rewards(m.reward));
        copy.appendChild(detail);
        const actions = node('div', 'notification-actions');
        const button = node('button', `btn sm${ready ? ' primary' : ''} notification-go`, t(ready ? 'mail.claim' : 'nt.shortcut'));
        button.dataset.missionAction = `${ready ? 'claim' : 'go'}:${m.id}`;
        button.setAttribute('aria-label', `${name} · ${button.textContent}`);
        const rowOwner = owner;
        button.onclick = ready
            ? () => { if (owner === rowOwner) { hideTip(); claim(m.id); } }
            : () => { close(); hideTip(); navigate(m); };
        actions.appendChild(button);
        out.append(copy, actions);
        return out;
    }

    function paint() {
        if (!host?.isConnected || !model) return;
        const focused = host.contains(document.activeElement) ? document.activeElement.dataset.missionAction : restoreFocus;
        restoreFocus = null;
        rememberScroll();
        // Keep the actual button in place so toggles and badge updates preserve normal hover events.
        host.querySelectorAll(':scope > :not(.mission-btn)').forEach(child => child.remove());
        const ringAge = Date.now() - ringAt, ready = model.claimable.length;
        // Red dot = a next mission not yet seen in the panel · the number badge (rewards to claim) wins (ADR-1245)
        const unseen = !ready && !!model.current && model.current.id !== seen;
        const button = host.querySelector('.mission-btn') ?? node('button');
        button.className = `mail-btn notification-btn mission-btn${ready || unseen ? ' has' : ''}${bubble && ringAge < RING_MS ? ' ringing' : ''}`;
        button.replaceChildren();
        button.dataset.missionAction = 'scroll';
        bindTipNode(button, () => {
            const tip = node('div', 'tip-card tip-mini');
            tip.appendChild(node('div', 'tip-name', t('mm.h')));
            return tip;
        });
        button.setAttribute('aria-label', ready ? t('mm.count', { n: ready }) : unseen ? t('mm.new') : t('mm.h'));
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-controls', 'mission-panel');
        const art = node('img');
        art.src = MISSION_ART; art.alt = ''; art.draggable = false;
        if (bubble && ringAge < RING_MS) art.style.animationDelay = `-${ringAge}ms`;
        button.appendChild(art);
        if (ready) button.appendChild(node('span', 'mail-n', ready > 99 ? '99+' : ready));
        else if (unseen) button.appendChild(node('span', 'notification-dot'));
        button.onclick = () => {
            open = !open;
            markSeen();
            hideTip();
            paint();
            host.querySelector(open ? '.mission-close' : '.mission-btn')?.focus({ preventScroll: true });
        };
        if (button.parentNode !== host) host.appendChild(button);

        if (bubble && Date.now() < bubbleUntil && !open) {
            const note = node('div', 'notification-bubble', bubble);
            note.setAttribute('role', 'status');
            host.appendChild(note);
        } else if (!open && model.current && tutorial?.(model.current)) {
            // Chapter-1 tutorial sign — hangs under the icon while the next mission is a tutorial line · not while the panel or the bubble is up
            const next = model.current, sign = node('div', 'mission-tut');
            const plate = node('button', 'mission-tut-card');
            plate.dataset.missionAction = `tut:${next.id}`;
            plate.append(node('span', 'mission-tut-cap', t('mm.tut')), node('span', 'mission-tut-name', label(next)));
            plate.style.animationDuration = `${SWING_MS}ms`;
            plate.style.animationDelay = `-${Date.now() % SWING_MS}ms`;   // a repaint keeps the swing going instead of restarting it
            const signOwner = owner;
            plate.onclick = () => { if (owner === signOwner) { hideTip(); navigate(next); } };
            sign.appendChild(plate);
            host.appendChild(sign);
        }
        const panel = node('div', 'notification-panel mission-panel');
        panel.id = 'mission-panel'; panel.hidden = !open;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-labelledby', 'mission-heading');
        const head = node('div', 'modal-head plain notification-head mission-head');
        const heading = node('h2', '', t('mm.h'));
        heading.id = 'mission-heading';
        const dismiss = node('button', 'btn modal-x notification-close mission-close', '×');
        dismiss.dataset.missionAction = 'close';
        dismiss.title = t('ui.close');
        dismiss.setAttribute('aria-label', t('ui.close'));
        dismiss.onclick = () => close(true);
        head.append(heading, dismiss);
        panel.appendChild(head);
        if (ready >= 2) {
            const bar = node('div', 'mission-bar');
            const all = node('button', 'btn sm primary mission-all', t('mail.claimAll'));
            all.dataset.missionAction = 'claim-all';
            const allOwner = owner;
            all.onclick = () => { if (owner === allOwner) { hideTip(); claimAll(model.claimable.map(m => m.id)); } };
            bar.appendChild(all);
            panel.appendChild(bar);
        }
        const list = node('div', 'notification-list mission-list');
        list.dataset.folder = 'missions';
        let cards = 0;
        for (const m of model.claimable) { list.appendChild(card(m, true)); cards++; }
        if (model.current) { list.appendChild(card(model.current, false)); cards++; }
        else if (!ready) {
            list.appendChild(node('div', 'notification-card mission-done', t('mm.done')));
            cards++;
        }
        for (let i = cards; i < SLOTS; i++) {
            const slot = node('div', 'notification-card empty');
            const empty = node('img');
            empty.src = MISSION_ART; empty.alt = ''; empty.draggable = false;
            slot.appendChild(empty);
            slot.setAttribute('aria-hidden', 'true');
            list.appendChild(slot);
        }
        panel.appendChild(list);
        host.appendChild(panel);
        list.scrollTop = scroll;
        if (focused) [...host.querySelectorAll('[data-mission-action]')]
            .find(control => control.dataset.missionAction === focused)?.focus({ preventScroll: true });
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
            restoreFocus = host?.contains(document.activeElement) ? document.activeElement.dataset.missionAction : null;
        },
        mount() {
            rememberScroll();
            observe();
            host = node('div', 'notification-slot mission-slot');
            // The caller attaches the host before paint so focus and positioning are measurable.
            return host;
        },
        refresh() { if (observe()) paint(); },
        paint,
        close,
        reset() { observe(); },
    };
}
