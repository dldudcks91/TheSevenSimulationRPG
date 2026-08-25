/**
 * CSV 파서 — src/data/*.csv (SSOT) 를 객체 배열로 푼다.
 * 파싱만 한다 — fetch(네트워크)는 ui/ 어댑터의 일이다 (이 모듈은 엔진을 모른다).
 *
 * 규칙: 첫 줄 = 헤더. 셀에 쉼표/따옴표 이스케이프는 쓰지 않는다 (본 프로젝트 CSV 계약 —
 * 설명 컬럼에도 쉼표를 넣지 않는다). 숫자로 읽히는 값은 숫자로 변환한다.
 */

export function parseCsv(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return [];
    const head = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const cells = line.split(',');
        const row = {};
        head.forEach((h, i) => {
            const v = (cells[i] ?? '').trim();
            row[h] = v !== '' && !isNaN(Number(v)) ? Number(v) : v;
        });
        return row;
    });
}

/** key,value,description 형태(balance.csv)를 {key: value} 로 눕힌다 */
export function keyValue(rows) {
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
}

/** 배열을 특정 컬럼 값으로 인덱싱한다 — byId(rows, 'monster_idx') */
export function indexBy(rows, col) {
    const out = {};
    for (const r of rows) out[r[col]] = r;
    return out;
}
