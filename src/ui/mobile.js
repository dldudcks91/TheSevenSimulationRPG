/** Responsive shell only. Navigation delegates to the existing tab buttons;
 * game rules, save data and battle clocks remain owned by app.js. */
import { t } from './i18n.js';
import { hideTip } from './tip.js';
import { mountMobilePages, mountMobileDialog } from './mobile-pages.js';
import { SCREEN_LAYOUTS, loadScreenLayout, writeScreenLayout } from './storage.js';
export { SCREEN_LAYOUTS } from './storage.js';

const query = matchMedia('(max-width: 1024px), (pointer: coarse) and (max-width: 1366px) and (max-height: 650px)');
const desktopPointer = matchMedia('(hover: hover) and (pointer: fine)');
export const MOBILE_PREVIEW = Object.freeze({ width: 390, height: 844 });
const QUICK_TABS = ['expedition', 'party', 'character', 'research'];
const MENU_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
let open = false;
let previousTab = null;
let installed = false;
let savedFocus = null;
let scrollTop = 0;
let screenLayout = loadScreenLayout();

export const getScreenLayout = () => screenLayout;
export function setScreenLayout(value) {
    if (!SCREEN_LAYOUTS.includes(value)) return;
    screenLayout = value;
    writeScreenLayout(value);
}
export const isMobileLayout = () => screenLayout === 'mobile' || (screenLayout === 'auto' && query.matches);
export const isMobilePreview = () => screenLayout === 'mobile' && desktopPointer.matches;
export function mobileViewport() {
    if (isMobilePreview()) return MOBILE_PREVIEW;
    const viewport = window.visualViewport;
    const height = viewport && viewport.scale !== 1
        ? document.getElementById('stage')?.clientHeight || innerHeight
        : viewport?.height ?? innerHeight;
    return { width: innerWidth, height };
}

export function fitMobileViewport() {
    const root = document.documentElement;
    const active = isMobileLayout();
    const preview = active && isMobilePreview();
    const { width, height } = mobileViewport();
    root.style.setProperty('--mobile-viewport-width', `${width}px`);
    const changed = root.hasAttribute('data-mobile') !== active;
    root.toggleAttribute('data-mobile', active);
    root.toggleAttribute('data-mobile-preview', preview);
    root.toggleAttribute('data-mobile-landscape', active && width > height && height <= 650);
    // CSS follows the logical game viewport, including the fixed desktop preview.
    for (const [name, matches] of Object.entries({ wide: width >= 700, narrow: width <= 360,
        short: height <= 740, compact: height <= 640, tiny: height <= 360, portrait: height >= width })) {
        root.toggleAttribute(`data-mobile-${name}`, active && matches);
    }
    root.toggleAttribute('data-compact-minigame', width <= 650);
    if (!active) closeMobileMenu(false);
    return changed;
}

const button = (cls, label, html = label) => {
    const node = document.createElement('button');
    node.type = 'button'; node.className = cls; node.innerHTML = html;
    node.setAttribute('aria-label', label);
    return node;
};

export function captureMobileFocus() {
    if (!isMobileLayout()) return;
    const nav = document.querySelector('#game-menu');
    scrollTop = nav?.scrollTop ?? 0;
    const active = document.activeElement;
    savedFocus = open && nav?.contains(active)
        ? active.dataset.tab ? `[data-tab="${active.dataset.tab}"]`
            : active.classList.contains('mobile-menu-close') ? '.mobile-menu-close'
                : active.classList.contains('lang-btn') ? '.lang-btn' : null
        : null;
}

function paintOpen() {
    const app = document.getElementById('app');
    const nav = app?.querySelector('.nav');
    const mobile = isMobileLayout() && !app?.classList.contains('pregame');
    if (!mobile) open = false;
    app?.classList.toggle('mobile-menu-open', open);
    const backdrop = document.getElementById('mobile-menu-backdrop');
    if (backdrop) backdrop.hidden = !open;
    if (nav) {
        nav.inert = mobile && !open;
        if (open) {
            nav.setAttribute('role', 'dialog'); nav.setAttribute('aria-modal', 'true');
        } else {
            nav.removeAttribute('role'); nav.removeAttribute('aria-modal');
        }
    }
    for (const node of app?.querySelectorAll(':scope > .main, :scope > .topbar, :scope > .brand, :scope > .mobile-dock') ?? []) node.inert = open;
    app?.querySelector('[data-mobile-menu]')?.setAttribute('aria-expanded', String(open));
}

export function closeMobileMenu(restoreFocus = true) {
    const wasOpen = open;
    open = false; savedFocus = null;
    paintOpen();
    if (wasOpen && restoreFocus) document.querySelector('[data-mobile-menu]')?.focus({ preventScroll: true });
}

function openMenu() {
    hideTip();
    document.querySelector('#stage > .dp-panel .dp-x')?.click();
    open = true; paintOpen();
    document.querySelector('.mobile-menu-close')?.focus({ preventScroll: true });
}

function install() {
    if (installed) return;
    installed = true;
    const nav = document.querySelector('.nav');
    nav.addEventListener('click', event => {
        if (event.target.closest('button[data-tab]:not(.dim), .b-newgame')) closeMobileMenu(false);
    }, true);
    document.addEventListener('keydown', event => {
        if (!open) return;
        if (event.key === 'Escape') {
            event.preventDefault(); event.stopImmediatePropagation(); closeMobileMenu();
        } else if (event.key === 'Tab') {
            const nodes = [...nav.querySelectorAll('button, a, input, select, textarea, [tabindex="0"]')]
                .filter(n => !n.disabled && n.getClientRects().length && !n.closest('[hidden]'));
            const first = nodes[0], last = nodes.at(-1);
            if (!first) return;
            if (event.shiftKey && (document.activeElement === first || !nav.contains(document.activeElement))) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !nav.contains(document.activeElement))) {
                event.preventDefault(); first.focus();
            }
        }
    }, true);
}

/** Called after the original shell has built its real, fully wired controls. */
export function mountMobileShell({ pre, tab }) {
    install();
    const app = document.getElementById('app');
    const nav = app.querySelector('.nav');
    nav.id = 'game-menu';
    nav.setAttribute('aria-label', t('mobile.menu'));
    app.dataset.tab = tab;
    let dock = app.querySelector('.mobile-dock');
    if (!dock) {
        dock = document.createElement('nav'); dock.className = 'mobile-dock';
        app.appendChild(dock);
        const back = button('mobile-menu-backdrop', t('mobile.close'));
        back.id = 'mobile-menu-backdrop'; back.hidden = true; back.tabIndex = -1;
        back.onclick = () => closeMobileMenu();
        app.appendChild(back);
    }
    dock.setAttribute('aria-label', t('mobile.navigation'));
    dock.replaceChildren();
    if (pre || previousTab !== tab) open = false;
    previousTab = tab;
    if (!isMobileLayout() || pre) { paintOpen(); return; }

    const header = document.createElement('div'); header.className = 'mobile-menu-head';
    const title = document.createElement('strong'); title.textContent = t('mobile.menu');
    const close = button('mobile-menu-close', t('mobile.close'), '<span aria-hidden="true">×</span>');
    close.onclick = () => closeMobileMenu(); header.append(title, close); nav.prepend(header);

    const utilities = document.createElement('div'); utilities.className = 'mobile-menu-utilities';
    for (const node of app.querySelectorAll('.resources > .lang-btn, .resources > .exp-time, .resources > .da-wrap')) utilities.appendChild(node);
    nav.appendChild(utilities);
    for (const id of QUICK_TABS) {
        const source = nav.querySelector(`[data-tab="${id}"]`);
        if (!source) continue;
        const node = button(`mobile-nav-item${source.classList.contains('on') ? ' on' : ''}`, t(`nav.${id}`), source.innerHTML);
        node.dataset.mobileTab = id;
        if (tab === id) node.setAttribute('aria-current', 'page');
        node.onclick = () => nav.querySelector(`[data-tab="${id}"]`)?.click();
        dock.appendChild(node);
    }
    const more = button('mobile-nav-item mobile-more', t('mobile.menu'), `${MENU_ICON}<span>${t('mobile.more')}</span>`);
    more.dataset.mobileMenu = ''; more.setAttribute('aria-controls', nav.id);
    if (!QUICK_TABS.includes(tab)) {
        more.classList.add('on'); more.setAttribute('aria-current', 'page');
    }
    more.onclick = openMenu; dock.appendChild(more);
    refreshMobileBadges(); paintOpen();
    nav.scrollTop = scrollTop;
    if (open) (nav.querySelector(savedFocus ?? '.mobile-menu-close') ?? close).focus({ preventScroll: true });
}

export function refreshMobileBadges() {
    const nav = document.querySelector('.nav');
    for (const node of document.querySelectorAll('[data-mobile-tab]')) {
        const source = nav?.querySelector(`[data-tab="${node.dataset.mobileTab}"]`);
        for (const cls of ['todo', 'dim']) node.classList.toggle(cls, source?.classList.contains(cls) ?? false);
        node.setAttribute('aria-disabled', String(source?.classList.contains('dim') ?? false));
    }
    document.querySelector('[data-mobile-menu]')?.classList.toggle('todo',
        [...nav?.querySelectorAll('[data-tab].todo') ?? []].some(n => !QUICK_TABS.includes(n.dataset.tab)));
}

/** Each mobile screen fits the viewport; long lists scroll inside their pane. */
export function mountMobileContent(main) {
    if (!isMobileLayout()) return;
    mountMobilePages(main);
}

export function mountMobileModal() {
    if (isMobileLayout()) mountMobileDialog(document.querySelector('#modal .modal-box'));
}
