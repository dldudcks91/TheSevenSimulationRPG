/**
 * 원정 박자 — 재생 시각을 **실제로 흐른 시간**만큼 민다. 세움(라운드 사이 숨 · 공격자 포커스의 행동 세움) 동안은 시각이 안 간다
 * [2026-10-17 사용자 지시 「내가 화면을 보던 안 보던 Stop 이나 Dim 이면 똑같이 적용되어야 해」 · SCREEN_DESIGN §4 · §10-2 · ADR-0654].
 *
 * **시계 둘이 이 걸음 하나를 같이 쓴다** — 관전 재생기(`battle.js:step`)와 앱 시계(`app.js:tickBattle` — 안 보는 부대 · 숨긴 탭).
 * 그래서 세움이 어느 시계에서나 같은 길이로 먹고, 원정은 보든 안 보든 같은 빠르기로 간다. 옛 판은 세움을 재생기만 알아
 * 관전 중인 부대만 늦었다(10-17 실측 — 관전 중 실제 시간의 약 50% · 안 보면 93%).
 *
 * **DOM 을 모른다** — 설정(포커스 · 흔들림 · 배속 배수)은 부르는 쪽이 `paceCfg` 로 넘긴다. 결과 · 정산 · rng 는 안 바뀐다 — 바뀌는 것은
 * 「실제 몇 초에 시뮬 몇 초」뿐이다. 걸음은 **쪼개도 같다** — 200ms 씩 열 번과 2초 한 번이 같은 자리에 선다(세움 · 사건 판정이 시각 기준이라서다).
 *
 * 박자 상태 `p` — 런 핸들(`app.js` 의 `B.pace`)이 들고 재생기가 빌려 쓴다(세이브에 안 든다 — 런 핸들과 같은 취급):
 *   `t` 재생 시각(초) · `i` 아직 안 지난 첫 사건의 자리(재생기는 `i` 앞까지 적용한다) · `phase` 지금 세움(`rise` | `focus` | `round` | null) ·
 *   `hold` 그 세움의 남은 실제 ms · `g0`/`g1` 세운 행동의 사건 자리 `[g0, g1)` · `rounds` 지난 `round` 수 · `done` `end` 를 지났다
 */

/* 세움 길이(실제 ms · 배속 1) — 배속이 오르면 연출처럼 준다(`paceCfg` 의 `k` = `fx.js:SPEED_K`). 화면 연출의 길이라 CSV 가 아니다 */
export const RISE_MS = 200;        // ① 올라감 — style.css `.fx-advance` 의 전환 길이와 같다 (150 → 200 · 2026-10-21 사용자 「약간 늦춰」)
export const PEAK_MS = 130;        // ① 다 올라간 뒤 타격 전에 서 있는 시간 — 「올라가면서 때림」이 아니라 「올라가서 때림」으로 읽히게 (100 → 130)
export const FOCUS_MS = 400;       // ② 그 행동을 적용하고 나간 채로 세우는 시간 (300 → 400)
export const ROUND_GAP_MS = 500;   // 라운드 사이 숨 — 마지막 몬스터가 쓰러진 뒤 다음 라운드가 서기까지 (ADR-0500 · 1000 → 500 2026-10-21 사용자)
/* 한 번에 내다보는 재생 시각의 상한(초) — 앞을 보려면 엔진을 그 시각까지 먼저 민다(`reach`). 숨긴 탭은 1분에 한 번 깨므로
   한 번에 다 내다보면 보이는 재생보다 수십 초 앞서 라운드를 정산한다 — 이만큼씩 끊어 민다 */
const LOOK_SEC = 1;
const EPS = 1e-9;

/** 행동의 주인 — 시전 · 타격 · 빗나감 · 반격 · 불러내기. 나머지 사건(쓰러짐 · 창 · 재생 · 중독 틱 …)은 주인이 없다 — 같은 순간의 앞 행동에 딸린다 */
export const actorOf = ev => (ev.e === 'skill' || ev.e === 'counter' || ev.e === 'call') ? ev.u : (ev.e === 'hit' || ev.e === 'dodge') ? ev.a : null;

/** 행동 하나의 끝 — `j` 번째 사건(주인이 있다)부터 같은 순간 · 같은 주인(또는 주인 없음)인 사건까지. `round` 는 행동에 안 딸린다(숨이 따로 선다) */
export function groupEnd(tl, j) {
    const key = actorOf(tl[j]), at = tl[j].t;
    let k = j + 1;
    for (; k < tl.length; k++) {
        const ev = tl[k], who = actorOf(ev);
        if (ev.e === 'round' || ev.t > at + EPS || (who != null && who !== key)) break;
    }
    return k;
}

/** 세움 길이 — `focus` = 'off' | 'stop' | 'dim' · `lunge` = 공격 시 흔들림 · `k` = 배속 배수. Off 는 행동 세움이 없고 라운드 숨만 선다 */
export function paceCfg(focus, lunge, speed, k = 1) {
    const on = focus !== 'off';
    return { speed, rise: on && lunge ? (RISE_MS + PEAK_MS) * k : 0, focus: on ? FOCUS_MS * k : 0, gap: ROUND_GAP_MS * k };
}

/** 그 시각에 선 박자 — 세움 없이 `t` 까지 지난 자리(재개 · 결투 · 개발 재생처럼 런 핸들의 박자가 없을 때) */
export function paceAt(tl, t = 0) {
    const p = { t, i: 0, phase: null, hold: 0, g0: -1, g1: -1, rounds: 0, done: false };
    while (p.i < tl.length && tl[p.i].t <= t + EPS && tl[p.i].e !== 'end') {
        if (tl[p.i].e === 'round') p.rounds++;
        p.i++;
    }
    return p;
}

/**
 * 걸음 — 실제 `ms` 만큼 민다. 세움 중이면 그것부터 갚고, 다음 세움을 만나면 **그 사건의 시각에 서서** 세운다.
 * @param tl 런의 타임라인(걸음마다 자란다) · `reach(tMax)` = 그 시각까지 엔진을 민다(앱의 `advanceBattle` — 사건이 붙는다 · 없으면 다 붙은 타임라인)
 * @returns 남은 실제 ms — `end` 에 닿은 걸음만 0 보다 클 수 있다(끝난 순간 = 부른 시각 − 이 값)
 */
export function paceStep(p, tl, ms, cfg, reach = null) {
    let left = Math.max(0, ms);
    while (!p.done) {
        if (p.phase) {
            const pay = Math.min(left, p.hold);
            p.hold -= pay; left -= pay;
            if (p.hold > EPS) return 0;
            p.hold = 0;
            if (p.phase === 'rise') {   // ① 끝 — 그 행동을 적용하고(재생기) 나간 채로 선다(②). 그 행동이 런을 닫았으면 ②는 없다
                p.i = p.g1;
                if (tl.slice(p.g0, p.g1).some(ev => ev.e === 'end')) { p.done = true; p.phase = null; break; }
                p.phase = 'focus'; p.hold = cfg.focus;
                continue;
            }
            if (p.phase === 'round') { p.i += 1; p.rounds += 1; }   // 숨이 끝났다 — 다음 라운드가 선다
            p.phase = null; p.g0 = p.g1 = -1;
            continue;
        }
        const s = p.t + Math.min(left / 1000 * cfg.speed, LOOK_SEC);
        reach?.(s);
        let j = p.i, hit = null;
        for (; j < tl.length && tl[j].t <= s + EPS; j++) {
            const ev = tl[j];
            if (ev.e === 'end') { hit = 'end'; break; }
            if (ev.e === 'round') { if (p.rounds > 0 && cfg.gap > 0) { hit = 'round'; break; } p.rounds++; continue; }
            if (cfg.focus > 0 && actorOf(ev) != null) { hit = 'act'; break; }
        }
        if (!hit) {   // 세울 사건 없이 내다본 끝까지 간다
            left = Math.max(0, left - (s - p.t) / cfg.speed * 1000);
            p.t = s; p.i = j;
            if (left <= EPS) return 0;
            continue;
        }
        const at = Math.max(p.t, tl[j].t);
        left = Math.max(0, left - (at - p.t) / cfg.speed * 1000);
        p.t = at; p.i = j;
        if (hit === 'end') { p.i = j + 1; p.done = true; break; }
        if (hit === 'round') { p.phase = 'round'; p.hold = cfg.gap; continue; }
        p.g0 = j; p.g1 = groupEnd(tl, j);
        if (cfg.rise > 0) { p.phase = 'rise'; p.hold = cfg.rise; continue; }
        p.i = p.g1;   // 올라감 없음(흔들림 Off) — 곧바로 적용하고 ②만 선다
        if (tl.slice(p.g0, p.g1).some(ev => ev.e === 'end')) { p.done = true; break; }
        p.phase = 'focus'; p.hold = cfg.focus;
    }
    return left;
}
