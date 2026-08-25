/**
 * 세이브 어댑터 — **localStorage 를 만지는 유일한 파일** (CLAUDE.md 이식성 규칙 3).
 * 직렬화 형식은 game_logic/state.js 가 정한다(엔진 중립 JSON). 여기는 문자열을 넣고 빼기만 한다.
 * Phase 2(엔진 이식)에서는 이 파일만 파일 시스템/클라우드 어댑터로 갈아끼운다.
 */

const KEY = 'thesevensim.save';

export function loadSave() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('save: load failed', e);
        return null;
    }
}

export function writeSave(obj) {
    try {
        localStorage.setItem(KEY, JSON.stringify(obj));
        return true;
    } catch (e) {
        console.warn('save: write failed', e);
        return false;
    }
}

export function clearSave() {
    try { localStorage.removeItem(KEY); } catch {}
}

export const hasSave = () => loadSave() != null;
