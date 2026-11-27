import { LANGUAGE_NAMES, lang, t } from './i18n.js';

export function createLanguagePicker(onSelect) {
    const element = document.createElement('div');
    element.className = 'language-picker';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'btn sm lang-btn';
    trigger.setAttribute('aria-controls', 'language-choices');
    trigger.setAttribute('aria-expanded', 'false');
    const list = document.createElement('div');
    list.className = 'language-choices';
    list.id = 'language-choices';
    list.setAttribute('role', 'group');
    list.hidden = true;
    element.append(trigger, list);

    function show(open) {
        list.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
    }
    trigger.onclick = () => show(list.hidden);
    const options = Object.entries(LANGUAGE_NAMES).map(([code, name]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.lang = code === 'zh' ? 'zh-CN' : code;
        button.dataset.lang = code;
        button.textContent = name;
        button.onclick = () => {
            show(false);
            trigger.focus({ preventScroll: true });
            onSelect(code);
        };
        list.appendChild(button);
        return button;
    });

    element.onkeydown = event => {
        const index = options.indexOf(event.target);
        if (event.key === 'Escape' && !list.hidden) {
            event.preventDefault();
            event.stopPropagation();
            show(false);
            trigger.focus();
            return;
        }
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        show(true);
        let next = index;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = options.length - 1;
        else if (index < 0) next = options.findIndex(b => b.dataset.lang === lang());
        else next = (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        options[next].focus();
    };
    const closeOutside = event => {
        if (!list.hidden && !element.contains(event.target)) show(false);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    document.addEventListener('focusin', closeOutside);

    function paint() {
        const code = lang();
        const label = t('ui.langBtn');
        trigger.textContent = LANGUAGE_NAMES[code];
        trigger.setAttribute('aria-label', label + ' · ' + LANGUAGE_NAMES[code]);
        list.setAttribute('aria-label', label);
        for (const button of options) button.setAttribute('aria-pressed', String(button.dataset.lang === code));
    }
    return { element, paint };
}
