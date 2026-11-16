// i18n.js 의 STRINGS 를 읽어 번역 단위 JSON 으로 — 읽기 전용
import fs from 'fs';
const SRC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') + 'src/ui/i18n.js';
const OUT = process.argv[2];
const text = fs.readFileSync(SRC, 'utf8');
const at = text.indexOf('const STRINGS = {');
const block = text.slice(at);
const STRINGS = new Function(`${block}; return STRINGS;`)();
const units = [];
for (const [k, e] of Object.entries(STRINGS)) {
    if ('zh' in e) continue;
    const enIsObj = e.en && typeof e.en === 'object';
    const en = enIsObj ? e.en.other : e.en;
    const ph = [...new Set([...(String(e.ko).matchAll(/\{[^{}]+\}/g))].map(m => m[0]))];
    units.push({ k, ko: e.ko, en, en1: enIsObj ? e.en.one : undefined, ph, html: /<[a-z/]/i.test(e.ko) });
}
fs.writeFileSync(OUT, JSON.stringify(units, null, 1));
const chars = units.reduce((s, u) => s + String(u.ko).length, 0);
console.log('units', units.length, 'ko chars', chars, 'help', units.filter(u => u.k.startsWith('help.')).length);
