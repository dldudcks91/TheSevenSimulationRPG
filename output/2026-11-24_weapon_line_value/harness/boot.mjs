/** Node 부트 — 화면 모듈이 import 때 닿는 브라우저 전역에 가짜를 넣고 스냅숏 데이터로 시스템을 세운다. 게임 로직은 안 바꾼다.
 *  (output/2026-11-17_auto_equip_score/harness/boot.mjs 와 같은 방식 · 2026-11-24 WV_SRC 추가) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// 읽을 src — `WV_SRC`(스냅숏 폴더의 src 절대 경로)를 주면 그것 · 없으면 저장소의 src(병렬 세션이 고치는 중이면 스냅숏을 떠서 넘긴다)
export const SRC = process.env.WV_SRC ? path.resolve(process.env.WV_SRC) : path.resolve(HERE, '../../../src');

const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const fakeEl = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {}, append() {}, addEventListener() {}, setAttribute() {}, querySelector: () => null });
globalThis.document = { documentElement: fakeEl(), head: fakeEl(), body: fakeEl(), createElement: fakeEl, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
globalThis.location = { search: '', href: 'http://127.0.0.1/', hash: '', hostname: '127.0.0.1' };
globalThis.window = globalThis;
globalThis.fetch = async url => {
    try { const text = fs.readFileSync(String(url), 'utf8'); return { ok: true, status: 200, text: async () => text }; }
    catch { return { ok: false, status: 404, text: async () => '' }; }
};

const imp = rel => import(pathToFileURL(path.join(SRC, rel)).href);
const data = await imp('ui/data.js');
export const rngMod = await imp('game_logic/rng.js');
await data.loadData(path.join(SRC, 'data') + path.sep);
export const D = data.D;
export const SYS = data.buildSystems(D);
