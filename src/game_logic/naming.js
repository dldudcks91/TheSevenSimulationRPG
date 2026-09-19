/**
 * 이름 조립 — 아이템 이름(`composeName`) · 정예 몬스터 이름(`eliteName`).
 *
 * 순수 모듈. 데이터(죄종 표시명·형용사 · 죄종 단어)는 생성자 주입, 난수를 쓰지 않는다.
 * **CSV 가 아니라 코드다** — 언어별 어순·조사가 규칙이라 표로 적을 수 없다 (INTERFACE §7).
 * 렌더러가 아니라 여기 있는 이유도 같다: 두 렌더러(장비 화면·관전)가 같은 규칙을 두 번 적으면 갈린다.
 *
 * ⚠ `sins` 는 아직 CSV 가 아니다 (죄종 매핑 미확정 — GAME_DESIGN §10 `sin_mapping.md`).
 *   지금은 `ui/mock.js:SINS` 가 주입된다. CSV 가 생기면 주입원만 갈아 끼운다.
 */

/** 한글 음절의 받침 유무 — 유니코드 한글 음절 블록(가 U+AC00 부터 11172자 · 종성 28갈래)의 배열 규칙이다. 밸런스 값이 아니다 */
const HANGUL_FIRST = 0xAC00, HANGUL_COUNT = 11172, JONG_COUNT = 28;
const hasBatchim = word => {
    const c = word.charCodeAt(word.length - 1) - HANGUL_FIRST;
    return c >= 0 && c < HANGUL_COUNT && c % JONG_COUNT !== 0;
};

/**
 * @param {object} data
 *   sins     — {sinId: {ko, en, adj}}  ko/en = 표시명 · adj = 영문 형용사(Wrathful …)
 *   sinWords — {sinId: [{ko, en}]} 아이템 이름의 죄종 단어 — **단 순서**(`sin_word.csv` 를 tier 로 정렬 · 2026-09-19).
 *              ko = 명사(격노) · en = 형용사(Raging). 없는 죄종은 한 단짜리 — 원래 죄종 이름(ko · adj)
 */
export function createNaming(data) {
    const S = data.sins;
    const W = data.sinWords ?? {};
    /** base 는 문자열(양 언어 공통) 또는 {ko, en} — 무기군 정의도 ko/en 을 갖고 있어 그대로 들어온다 */
    const pair = base => (typeof base === 'string' ? { ko: base, en: base } : base);

    const wordsOf = sin => (W[sin]?.length ? W[sin] : [{ ko: S[sin].ko, en: S[sin].adj }]);
    /** 그 죄종의 단어 수 — 드롭이 단 번호를 고르는 폭 (item.js · INTERFACE §2-5 `words`) */
    const wordCount = sin => wordsOf(sin).length;
    /** 칸의 단어 — 단 번호가 없거나 범위 밖이면 첫 단(원래 죄종 이름) */
    const wordAt = (sin, i) => { const ws = wordsOf(sin); return ws[i] ?? ws[0]; };

    /**
     * 이름 앞머리의 조각들 — ko 「격노와 찬탈의 」 / en 「Raging and Usurping 」 (item_design §1 「이름」 · 2026-09-19).
     * 조각은 `{t, sin?}` 이고 **죄종 단어 조각만 `sin` 을 든다** — 화면이 단어를 따로 다뤄야 할 때의 입력이다(지금 화면은 이름을 희귀도 한 색으로 찍는다 · ADR-0175).
     * 「와 / 과」는 앞 단어의 받침이 가른다 · 「의」는 그대로다. 일반(죄종 없음)은 빈 배열
     */
    const sinPhrase = (preSin, sufSin, words = []) => {
        if (!preSin) return { ko: [], en: [] };
        const a = wordAt(preSin, words[0]);
        if (!sufSin) return {
            ko: [{ t: a.ko, sin: preSin }, { t: '의 ' }],
            en: [{ t: a.en, sin: preSin }, { t: ' ' }],
        };
        const b = wordAt(sufSin, words[1]);
        return {
            ko: [{ t: a.ko, sin: preSin }, { t: hasBatchim(a.ko) ? '과 ' : '와 ' }, { t: b.ko, sin: sufSin }, { t: '의 ' }],
            en: [{ t: a.en, sin: preSin }, { t: ' and ' }, { t: b.en, sin: sufSin }, { t: ' ' }],
        };
    };

    /** 아이템 이름 — ko "격노와 찬탈의 <base>" / en "Raging and Usurping <base>" (2026-09-19 개정 · ~~태그 형식 `[분노][오만] <base>`~~ 09-11).
     *  매직(`sufSin` 없음)은 「격노의 <base>」 · 일반(`preSin` 도 없음 · R86)은 베이스 이름뿐이다.
     *  `words` = 칸마다 그 죄종 단어의 단 번호(item 의 `words`) — 없으면 첫 단 */
    const composeName = (preSin, base, sufSin, words = []) => {
        const b = pair(base);
        const p = sinPhrase(preSin, sufSin, words);
        const join = segs => segs.map(x => x.t).join('');
        return { ko: `${join(p.ko)}${b.ko}`, en: `${join(p.en)}${b.en}` };
    };

    /**
     * **세이브 이관 전용** — 옛 이름에서 베이스를 뗀다 (INTERFACE §4 v30 → v31 · 2026-09-19).
     * 알아보는 형식 셋: 지금 형식(`words` 로 조립한 앞머리 — v15 무기군 교체 이관이 이미 새 형식으로 다시 조립했을 수 있다) ·
     *   09-11 태그형 `[분노][오만] <base>` · 그 전 문장형 ko `분노의 <base> — 오만` / en `Wrathful <base> of Pride`.
     * 두 언어가 **모두** 떼어져야 값을 낸다 — 한쪽만 맞으면 다른 형식을 잘못 읽은 것이다
     */
    const baseOf = (name, sins = [], words = []) => {
        if (!name || !sins.length) return null;
        const p = sinPhrase(sins[0], sins[1] ?? null, words);
        const head = { ko: p.ko.map(x => x.t).join(''), en: p.en.map(x => x.t).join('') };
        if (name.ko.startsWith(head.ko) && name.en.startsWith(head.en) && name.ko.length > head.ko.length && name.en.length > head.en.length)
            return { ko: name.ko.slice(head.ko.length), en: name.en.slice(head.en.length) };
        const TAG = /^(\[[^\]]*\])+ /;
        if (TAG.test(name.ko) && TAG.test(name.en)) return { ko: name.ko.replace(TAG, ''), en: name.en.replace(TAG, '') };
        const [pre, suf] = sins;
        const cut = (str, head, tail) => (str.startsWith(head) && str.endsWith(tail) && str.length > head.length + tail.length
            ? str.slice(head.length, str.length - tail.length) : null);
        const ko = cut(name.ko, `${S[pre].ko}의 `, suf ? ` — ${S[suf].ko}` : '');
        const en = cut(name.en, `${S[pre].adj} `, suf ? ` of ${S[suf].en}` : '');
        return ko !== null && en !== null ? { ko, en } : null;
    };

    /** 정예 이름 — ko "분노의 스켈레톤 기사" / en "Wrathful Skeleton Knight". base = 몬스터 이름 {ko, en} */
    const eliteName = (sin, base) => {
        const s = S[sin], b = pair(base);
        return { ko: `${s.ko}의 ${b.ko}`, en: `${s.adj} ${b.en}` };
    };

    return { composeName, sinPhrase, wordCount, baseOf, eliteName };
}
