/**
 * 이름 조립 — 아이템 이름(`composeName`) · 정예 몬스터 이름(`eliteName`).
 *
 * 순수 모듈. 데이터(죄종 표시명·형용사)는 생성자 주입, 난수를 쓰지 않는다.
 * **CSV 가 아니라 코드다** — 언어별 어순·조사가 규칙이라 표로 적을 수 없다 (INTERFACE §7).
 * 렌더러가 아니라 여기 있는 이유도 같다: 두 렌더러(장비 화면·관전)가 같은 규칙을 두 번 적으면 갈린다.
 *
 * ⚠ `sins` 는 아직 CSV 가 아니다 (죄종 매핑 미확정 — GAME_DESIGN §10 `sin_mapping.md`).
 *   지금은 `ui/mock.js:SINS` 가 주입된다. CSV 가 생기면 주입원만 갈아 끼운다.
 */

/**
 * @param {object} data
 *   sins — {sinId: {ko, en, adj}}  ko/en = 표시명 · adj = 영문 형용사(Wrathful …)
 */
export function createNaming(data) {
    const S = data.sins;
    /** base 는 문자열(양 언어 공통) 또는 {ko, en} — 무기군 정의도 ko/en 을 갖고 있어 그대로 들어온다 */
    const pair = base => (typeof base === 'string' ? { ko: base, en: base } : base);

    /** 아이템 이름 — 태그 형식 "[죄종1][죄종2] Base" — ko/en 동형 (2026-09-11 개정 · 사용자 지시).
     *  대괄호는 죄종 표시명 그대로(`adj` 형용사 아님) — 태그라 언어별 조사·전치사가 없다.
     *  매직 등급(`sufSin` 없음)은 대괄호가 하나뿐이다 — 조건부로 빈 칸을 만들지 않는다. */
    const composeName = (preSin, base, sufSin) => {
        const b = pair(base);
        const tag = sin => `[${S[sin].ko}]`, tagEn = sin => `[${S[sin].en}]`;
        return {
            ko: `${tag(preSin)}${sufSin ? tag(sufSin) : ''} ${b.ko}`,
            en: `${tagEn(preSin)}${sufSin ? tagEn(sufSin) : ''} ${b.en}`,
        };
    };

    /** 정예 이름 — ko "분노의 스켈레톤 기사" / en "Wrathful Skeleton Knight". base = 몬스터 이름 {ko, en} */
    const eliteName = (sin, base) => {
        const s = S[sin], b = pair(base);
        return { ko: `${s.ko}의 ${b.ko}`, en: `${s.adj} ${b.en}` };
    };

    return { composeName, eliteName };
}
