/** Small contextual guides. The app supplies eligible targets; the storage adapter owns the seen record. */
let serial = 0;

const node = (tag, cls) => {
    const out = document.createElement(tag);
    if (cls) out.className = cls;
    return out;
};
const setText = (element, value = '') => {
    if (element.textContent !== value) element.textContent = value;
};
const idsOf = value => Array.isArray(value)
    ? value.filter(id => typeof id === 'string' && id.length > 0) : [];

/** Rect visible inside both the viewport and any scrolling/clipping ancestors. Never scrolls the target into view. */
function visibleRect(target) {
    if (!target?.isConnected || !target.getClientRects().length) return null;
    const box = target.getBoundingClientRect();
    let left = Math.max(0, box.left), top = Math.max(0, box.top);
    let right = Math.min(window.innerWidth, box.right), bottom = Math.min(window.innerHeight, box.bottom);
    for (let parent = target; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.visibility === 'hidden' || style.display === 'none') return null;
        if (parent === target) continue;
        const clipX = /hidden|clip|auto|scroll/.test(style.overflowX);
        const clipY = /hidden|clip|auto|scroll/.test(style.overflowY);
        if (clipX || clipY) {
            const rect = parent.getBoundingClientRect();
            if (clipX) { left = Math.max(left, rect.left); right = Math.min(right, rect.right); }
            if (clipY) { top = Math.max(top, rect.top); bottom = Math.min(bottom, rect.bottom); }
        }
    }
    return right - left >= 8 && bottom - top >= 8 ? { left, top, right, bottom } : null;
}

export function createTutorial({ read, describe, readSeen, writeSeen }) {
    const labelId = `tutorial-title-${++serial}`, detailId = `tutorial-detail-${serial}`;
    let owner = null, lastContext = null, seen = new Set(), suppressed = new Set();
    let active = null, card = null, title = null, detail = null, progress = null, confirm = null;
    let frame = null, destroyed = false;

    function removeCard() {
        active?.target?.classList.remove('tutorial-target');
        card?.remove();
        active = null; card = null;
    }

    function acknowledge() {
        if (!active) return;
        const target = active.target, returnFocus = card.contains(document.activeElement);
        seen.add(active.id);
        // Finish one explanation at a time. Other guides on this screen wait until their context is revisited.
        try {
            const current = read();
            if (current?.owner === owner && Array.isArray(current.steps))
                for (const step of current.steps) if (typeof step?.id === 'string') suppressed.add(step.id);
        } catch { /* The selected guide still closes if the surrounding screen is being replaced. */ }
        try { writeSeen(owner, [...seen]); } catch { /* Keep the session record if browser storage is unavailable. */ }
        removeCard();
        if (returnFocus && target?.isConnected) {
            const focusTarget = target.matches('button, a[href], input, select, textarea, [tabindex]') ? target
                : target.querySelector('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex]');
            focusTarget?.focus({ preventScroll: true });
        }
    }

    function mount() {
        card = node('section', 'tutorial-card');
        card.setAttribute('role', 'region');
        card.setAttribute('aria-labelledby', labelId);
        card.setAttribute('aria-describedby', detailId);
        card.setAttribute('aria-live', 'polite');
        card.style.visibility = 'hidden';
        const head = node('div', 'tutorial-head');
        title = node('div', 'tutorial-title'); title.id = labelId;
        progress = node('span', 'tutorial-progress');
        head.append(title, progress);
        detail = node('div', 'tutorial-detail'); detail.id = detailId;
        const actions = node('div', 'tutorial-actions');
        confirm = node('button', 'btn sm tutorial-confirm');
        confirm.type = 'button'; confirm.onclick = acknowledge;
        actions.appendChild(confirm);
        card.append(head, detail, actions);
        card.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            event.preventDefault(); event.stopPropagation();
            acknowledge();
        });
        const stage = document.getElementById('stage');
        if (!stage) card.classList.add('tutorial-viewport');
        // Share the game's stacking context so comparison tooltips remain above the guide.
        (stage ?? document.body).appendChild(card);
    }

    function position(rect) {
        if (!card || !rect) return;
        const stage = card.parentElement?.id === 'stage' ? card.parentElement : null;
        const stageRect = stage?.getBoundingClientRect();
        const scale = stage?.offsetWidth ? stageRect.width / stage.offsetWidth : 1;
        const unit = Number.isFinite(scale) && scale > 0 ? scale : 1;
        const inset = 10, gap = 10 * unit;
        card.style.width = `${Math.min(310, Math.max(120, (window.innerWidth - inset * 2) / unit))}px`;
        const size = card.getBoundingClientRect();
        const width = size.width, height = size.height;
        const clamp = (v, max) => Math.max(inset, Math.min(v, Math.max(inset, max)));
        const candidates = [
            { side: 'right', x: rect.right + gap, y: rect.top },
            { side: 'left', x: rect.left - width - gap, y: rect.top },
            { side: 'bottom', x: rect.left, y: rect.bottom + gap },
            { side: 'top', x: rect.left, y: rect.top - height - gap },
        ].map(candidate => {
            const x = clamp(candidate.x, window.innerWidth - width - inset);
            const y = clamp(candidate.y, window.innerHeight - height - inset);
            const overlap = Math.max(0, Math.min(x + width, rect.right) - Math.max(x, rect.left))
                * Math.max(0, Math.min(y + height, rect.bottom) - Math.max(y, rect.top));
            const shift = Math.abs(x - candidate.x) + Math.abs(y - candidate.y);
            return { ...candidate, x, y, score: overlap + shift };
        });
        candidates.sort((a, b) => a.score - b.score);
        const best = candidates[0];
        card.dataset.side = best.side;
        card.style.left = `${(best.x - (stageRect?.left ?? 0)) / unit}px`;
        card.style.top = `${(best.y - (stageRect?.top ?? 0)) / unit}px`;
        card.style.visibility = '';
    }

    function refresh() {
        if (destroyed) return;
        const current = read();
        if (!current || typeof current.owner !== 'string' || !current.owner.length) {
            removeCard(); suppressed.clear(); lastContext = null; return;
        }
        if (owner !== current.owner) {
            removeCard(); owner = current.owner; suppressed.clear(); lastContext = null;
            try { seen = new Set(idsOf(readSeen(owner))); } catch { seen = new Set(); }
        }
        const context = current.context ?? null;
        if (lastContext !== context) { suppressed.clear(); lastContext = context; }
        const steps = Array.isArray(current.steps) ? current.steps.filter(step => step && typeof step.id === 'string') : [];
        const currentIds = new Set(steps.map(step => step.id));
        for (const id of suppressed) if (!currentIds.has(id)) suppressed.delete(id);
        let chosen = null, rect = null;
        for (const step of steps) {
            if (!step || typeof step.id !== 'string' || seen.has(step.id) || suppressed.has(step.id)) continue;
            const visible = visibleRect(step.target);
            if (visible) { chosen = step; rect = visible; break; }
        }
        if (!chosen) { removeCard(); return; }
        if (active?.target !== chosen.target) active?.target?.classList.remove('tutorial-target');
        active = chosen;
        active.target.classList.add('tutorial-target');
        if (!card) mount();
        const text = describe(active.id);
        card.dataset.tutorial = active.id;
        setText(title, text.title); setText(detail, text.detail); setText(progress, text.progress);
        progress.hidden = !text.progress;
        setText(confirm, text.closeLabel);
        position(rect);
    }

    function queueRefresh() {
        if (frame !== null || destroyed) return;
        frame = requestAnimationFrame(() => { frame = null; refresh(); });
    }
    window.addEventListener('resize', queueRefresh);
    window.addEventListener('scroll', queueRefresh, true);
    window.visualViewport?.addEventListener('resize', queueRefresh);
    window.visualViewport?.addEventListener('scroll', queueRefresh);

    return {
        refresh,
        reset() { removeCard(); owner = null; lastContext = null; seen.clear(); suppressed.clear(); },
        destroy() {
            destroyed = true; removeCard();
            if (frame !== null) cancelAnimationFrame(frame);
            window.removeEventListener('resize', queueRefresh);
            window.removeEventListener('scroll', queueRefresh, true);
            window.visualViewport?.removeEventListener('resize', queueRefresh);
            window.visualViewport?.removeEventListener('scroll', queueRefresh);
        },
    };
}
