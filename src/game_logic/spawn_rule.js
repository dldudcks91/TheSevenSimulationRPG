/**
 * 스테이지 편성 예외 — **스테이지 컨셉이 편성을 바꾸는 자리** (monster_design §4 · INTERFACE §2-13).
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. **상태도 rng 도 없다** — 굴림은 `battle.spawnRound` 가 하고(INTERFACE §5-2)
 *   이 파일은 **뽑을 목록과 범위만** 바꾼다. 그래서 예외가 굴림 자리를 늘리지 않는다(소환사의 채움만 새 자리다).
 *
 * **CSV 가 아니라 코드다** [2026-09-18 사용자 결정] — 스테이지마다 컨셉의 모양이 달라, 칸으로 두면 컨셉 하나에 칸이 하나씩 늘고
 *   나머지 스테이지는 빈칸이다. 대신 **규칙 함수는 다시 쓰라고 있다** — 새 스테이지가 같은 모양이면 표에 한 줄을 더하고,
 *   새 모양이면 규칙 함수를 하나 더 만든다. 같은 규칙을 **두 번째 스테이지**가 쓰면 그 규칙만 CSV 칸으로 올린다.
 *   표의 몬스터 번호 · 라운드 수는 CLAUDE.md 규칙 2 의 **등록된 예외**다 (INTERFACE §5-3).
 *
 * 규칙 = 편성 단계에 끼어드는 자리의 묶음 — `{refs, pool?, elitePool?, summoners?, escorts?}`:
 *   refs              생성 시 검사가 볼 몬스터 번호 — **그 스테이지의 일반몹**이어야 한다(battle.js 가 로드에서 던진다)
 *   pool(ids, n)      n 라운드의 라운드 풀을 줄인다
 *   elitePool(ids)    정예 후보를 줄인다 — 받는 목록은 **라운드 풀**이다
 *   summoners         소환사 — 라운드에 서면 그 뒤의 뽑기와 채움이 소환사를 뺀 풀에서 돈다 · 상한까지 채운다
 *   escorts(lo, hi)   보스 호위 수 범위를 바꾼다
 */

/** 그 몬스터는 **n 라운드부터** 나온다 — 앞 라운드의 라운드 풀에서 뺀다(정예 후보도 라운드 풀에서 나오므로 같이 빠진다) */
export const roundFrom = (id, n) => ({
    refs: [id],
    pool: (ids, round) => (round < n ? ids.filter(x => x !== id) : ids),
});

/** 정예 후보를 이 몬스터들로 좁힌다 */
export const eliteOnly = (...ids) => ({
    refs: ids,
    elitePool: pool => pool.filter(x => ids.includes(x)),
});

/**
 * **소환사** — 이 몬스터가 라운드에 서면(등급 무관) 나머지를 불러낸다: 그 뒤의 뽑기는 소환사를 뺀 풀에서 하고,
 *   편성이 끝나면 라운드 상한 [balance.csv:wave_monster_max] 까지 같은 풀에서 채운다. 그래서 소환사는 라운드에 하나뿐이다.
 *   **소환사 뒤에 뽑힌 몫(채움 포함)은 대기한다** [2026-09-18] — 라운드 시작에 서지 않고 소환사의 고유 스킬(불러내기 `call`)이 세운다.
 *   소환사의 무리 = 그 라운드의 다른 적 전부 — 쿨이 돌 때 무리 중 서 있지 않은 것(대기 · 쓰러진 것)을 한 번에 세운다.
 *   소환사는 고유 스킬이 `call` 이어야 한다(battle.js 가 로드에서 던진다)
 */
export const summoner = id => ({ refs: [id], summoners: [id] });

/** 보스 호위 수 범위를 바꾼다 — 호위 수 굴림 1회는 그대로 돈다 */
export const bossEscorts = (lo, hi) => ({ refs: [], escorts: () => [lo, hi] });

/** 보스 혼자 — 호위 0 (챕터보스 스테이지와 같은 규칙 · 굴림 1회는 돈다) */
export const bossAlone = () => bossEscorts(0, 0);

/**
 * 스테이지 → 규칙 배열. **배열 순서대로 겹쳐 건다.** 표에 없는 스테이지는 예외가 없다 — 편성 · rng 가 예외 도입 전과 같다.
 */
export const STAGE_SPAWN_RULES = Object.freeze({
    // 1-1 파멸의 진영 — 「주술사가 나머지를 소환한다」 [2026-09-18 사용자 지시]
    //   주술사는 3라운드부터 · 정예는 주술사뿐 · 주술사가 서면 척후병 · 전사로 상한까지 채운다(그 몫은 「고블린 소환」이 세운다) · 아바돈은 혼자
    101: [roundFrom(1103, 3), eliteOnly(1103), summoner(1103), bossAlone()],
});
