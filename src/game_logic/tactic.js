/**
 * 파티 전술 — 「조건 → 효과」 옵션이 하나씩 든 칸. **획득물이 아니다** (tactic_card_design §5 확정 2026-08-30):
 *   칸은 **로스터 합산 레벨**로 하나씩 열리고, 칸에 든 옵션은 **재화로 리롤**한다. 카드를 줍는 파밍 축이 없다.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 난수는 인자(`rng`), 정의는 생성자 주입.
 * 이 모듈은 상태를 들지 않는다 — 어느 칸에 무엇이 들었는지는 세이브(`state.tactics`)가 들고, 여기는 규칙만 낸다.
 *
 * **정의는 CSV · 종류는 코드** — `cond_kind` 어휘는 아래 고정 사전이고 값(문턱 · 효과 수치)은 전부 CSV 다.
 *   미니 DSL 을 두지 않는다 (skill.js 와 같은 규약).
 *
 * tactic_card_design.md 확정 규칙:
 *   · 조건은 **편성 시점에 확정되는 것만** (§2-1) — 현재 HP·남은 적 수 같은 전투 중 값은 세지 않는다.
 *     판정은 출발 시 1회 고정이 아니라 **편성이 바뀔 때마다 다시 참**이 된다(같은 뜻이다 — 전투 중엔 편성이 안 바뀐다)
 *   · 효과는 **기존 공식의 항**으로 들어간다 (§2-4) — 마스터리·접사와 같은 채널이고 새 곱셈 층을 만들지 않는다.
 *     피해 감소만 따로 낸다 (원천별 곱 — battle_design §9-3)
 *   · 효과는 **파티에만** 걸린다 (§1) — 벤치 영웅에게는 안 붙는다. 그 판정은 state.js 가 한다
 *   · 옵션의 SSOT 는 **`(option_id, grade)` 복합키**다 (§5-5 확정 2026-09-01) — `option_id` 가 **가족**(조건·stat 고정)이고
 *     `grade` 가 **값만** 가른다. 중복 방지·첫 배정·리롤 후보의 단위는 전부 **가족**이다:
 *     「일반 공격력」과 「레어 공격력」은 같은 옵션이라 두 칸에 서면 같은 stat 이 두 번 곱해진다
 */

/**
 * @param {object} data
 *   slots        — tactic_slot.csv 파싱 행 (칸 수 = 행 수 · 해금 문턱 = 합산 레벨 · 리롤 비용)
 *   options      — tactic_option.csv 파싱 행 (조건 + 효과 1행 = 옵션 1개)
 *   sins         — 죄종 id 목록 (조건 인자 검증)
 *   classes      — 직업 정의 [{id, ...}] (조건 인자 검증)
 *   skillSystem  — 태그 조건이 `tagsOf` 로 스킬 태그를 읽는다 (skill_design §11)
 *   gradeWeights — {common, magic, rare} 상대 가중치 (balance.csv:tactic_grade_weight_*) — 리롤의 등급 추첨
 */
export function createTacticSystem(data) {
    const SK = data.skillSystem;
    const NONE = '-';
    const dash = v => (v === NONE || v === '' || v === undefined || v === null ? null : v);
    /** 등급 어휘 — **이 배열 순서가 계약이다** (INTERFACE §5-3): 가중 추첨이 이 순서로 훑는다 */
    const GRADES = ['common', 'magic', 'rare'];
    const BASE_GRADE = GRADES[0];   // 첫 배정은 언제나 여기 (§5-5 「첫 배정은 일반 고정」)

    /** 배열에서 같은 값이 가장 많이 나온 횟수 — 「같은 죄종 n명」 · 「같은 직업 n명」 */
    const maxCount = arr => {
        const n = {};
        let best = 0;
        for (const v of arr) best = Math.max(best, n[v] = (n[v] ?? 0) + 1);
        return best;
    };

    /**
     * 조건 어휘 — 이 밖의 `cond_kind` 는 로드 시 throw.
     * `count` 가 파티 문맥에서 숫자를 하나 뽑고, 그것이 `cond_n` **이상**이면 조건이 참이다.
     * 전부 편성에서 확정되는 값이다 (§2-1) — 전투 중에 변하는 축은 여기 없다.
     */
    const COND_KINDS = {
        always: { arg: null, count: () => 1 },                              // 무조건 — cond_n 은 0
        sin_same: { arg: null, count: c => maxCount(c.sins) },              // 같은 죄종이 몇 명까지 겹치나
        sin_kind: { arg: null, count: c => new Set(c.sins).size },          // 죄종이 몇 종인가
        class_same: { arg: null, count: c => maxCount(c.classes) },         // 같은 직업이 몇 명까지 겹치나
        affix_sin: { arg: 'sin', count: (c, a) => c.affixSins[a] ?? 0 },    // 파티 착용 장비의 그 죄종 접사 수
        skill_tag: { arg: 'tag', count: (c, a) => c.tags[a] ?? 0 },         // 그 태그의 액티브를 가진 인원
    };
    // ~~party_size~~ · ~~damage_kind~~ 는 2026-09-02 폐지 — §5-4 가 「파티 인원수 · 무기 종류 조건 폐기」로
    //   확정했고 09-01 임시 풀 교체 때 CSV 에서 먼저 빠졌다. 어휘만 남아 조건 2종이 영원히 못 뜨는 상태였다.

    /* ── 칸 (tactic_slot.csv) ── */

    const slotList = (data.slots ?? []).slice().sort((a, b) => a.slot_no - b.slot_no).map((row, i) => {
        const no = row.slot_no;
        if (no !== i + 1) throw new Error(`tactic: slot_no 는 1부터 빈틈없이 — ${no} (${i + 1} 자리)`);
        if (!(row.unlock_total_level >= 0)) throw new Error(`tactic: 칸 ${no} unlock_total_level`);
        if (!(row.reroll_cost_gold >= 0)) throw new Error(`tactic: 칸 ${no} reroll_cost_gold`);
        return { no, unlockTotalLevel: row.unlock_total_level, rerollCost: row.reroll_cost_gold };
    });
    for (let i = 1; i < slotList.length; i++) {
        if (slotList[i].unlockTotalLevel < slotList[i - 1].unlockTotalLevel)
            throw new Error(`tactic: 칸 ${slotList[i].no} 해금 문턱이 앞 칸보다 낮다`);
    }
    const slotCount = slotList.length;

    /* ── 옵션 (tactic_option.csv — `(option_id, grade)` 복합키) ── */

    /**
     * 행을 **가족**으로 접는다. 가족 하나가 3등급을 들고, 등급은 `value` 만 가른다 (§5-5).
     * 조건·stat 이 등급마다 다르면 그건 같은 옵션이 아니라 다른 옵션이므로 로드 시 throw 한다.
     */
    const families = [];
    const famById = {};
    for (const row of data.options ?? []) {
        const id = row.option_id;
        const bad = why => { throw new Error(`tactic: ${id} — ${why}`); };
        if (!id) bad('option_id 가 없다');
        const grade = row.grade;
        if (!GRADES.includes(grade)) bad(`grade '${grade}' — 어휘는 ${GRADES.join('/')}`);
        const kind = COND_KINDS[row.cond_kind];
        if (!kind) bad(`cond_kind '${row.cond_kind}'`);
        const arg = dash(row.cond_arg);
        if (kind.arg === null && arg !== null) bad(`cond_kind '${row.cond_kind}' 는 인자를 받지 않는다`);
        if (kind.arg === 'sin' && !(data.sins ?? []).includes(arg)) bad(`죄종 '${arg}'`);
        if (kind.arg === 'tag' && !(SK?.TAGS ?? []).includes(arg)) bad(`스킬 태그 '${arg}'`);
        if (!(row.cond_n >= 0)) bad(`cond_n ${row.cond_n}`);
        if (!row.stat) bad('stat 이 없다');
        if (typeof row.value !== 'number' || row.value === 0) bad(`value ${row.value}`);

        let fam = famById[id];
        if (!fam) {
            fam = famById[id] = { id, condKind: row.cond_kind, condArg: arg, condN: row.cond_n, stat: row.stat, grades: {} };
            families.push(fam);
        } else {
            // 가족 안에서 **값 말고는 다 같아야** 한다 — 등급은 손잡이지 다른 옵션이 아니다
            if (fam.condKind !== row.cond_kind || fam.condArg !== arg || fam.condN !== row.cond_n || fam.stat !== row.stat)
                bad(`등급 '${grade}' 의 조건·stat 이 같은 가족의 다른 행과 다르다 — 등급은 값만 가른다 (§5-5)`);
        }
        if (fam.grades[grade] !== undefined) bad(`등급 '${grade}' 가 두 번 나온다`);
        fam.grades[grade] = row.value;
    }
    for (const fam of families) {
        const missing = GRADES.filter(g => fam.grades[g] === undefined);
        if (missing.length) throw new Error(`tactic: ${fam.id} — 등급 ${missing.join('/')} 행이 없다 (가족마다 ${GRADES.length}등급)`);
        // 값이 등급 순으로 커지는지 — 「등급이 오르면 같은 스탯의 값만 커진다」(§5-5)가 데이터에서 지켜지는지 본다
        for (let i = 1; i < GRADES.length; i++) {
            const lo = fam.grades[GRADES[i - 1]], hi = fam.grades[GRADES[i]];
            if (!(hi > lo)) throw new Error(`tactic: ${fam.id} — ${GRADES[i]} ${hi} 가 ${GRADES[i - 1]} ${lo} 보다 크지 않다`);
        }
    }
    const familyIds = families.map(f => f.id);
    // 칸보다 **가족이** 많아야 한다 — 행으로 세면 66 > 7 이라 통과하지만, 첫 배정도 리롤도 가족 단위라 그때 답이 안 된다
    if (families.length <= slotCount)
        throw new Error(`tactic: 가족 ${families.length}개 ≤ 칸 ${slotCount}개 — 리롤할 여지가 없다`);

    /** 등급 가중치 — 값은 CSV. 하나라도 빠지거나 음수면 리롤이 조용히 한쪽으로 쏠리므로 로드 시 막는다 */
    const gradeWeights = GRADES.map(g => {
        const w = data.gradeWeights?.[g];
        if (typeof w !== 'number' || !(w >= 0)) throw new Error(`tactic: 등급 가중치 '${g}' 가 없다 (balance.csv:tactic_grade_weight_${g})`);
        return w;
    });
    const weightSum = gradeWeights.reduce((a, w) => a + w, 0);
    if (!(weightSum > 0)) throw new Error('tactic: 등급 가중치 합이 0 — 뽑을 등급이 없다');

    /** 칸이 든 `{id, grade}` 한 쌍 → 옵션 하나. 없는 가족·없는 등급이면 `null` (CSV 가 바뀐 세이브) */
    function optionOf(ref) {
        const fam = ref && famById[ref.id];
        if (!fam) return null;
        const value = fam.grades[ref.grade];
        if (value === undefined) return null;
        return { id: fam.id, grade: ref.grade, condKind: fam.condKind, condArg: fam.condArg, condN: fam.condN, stat: fam.stat, value };
    }

    /* ── 판정 ── */

    /** 합산 레벨로 열린 칸 수 — 문턱은 오름차순이라 세면 끝이다 */
    const openCount = totalLevel => slotList.filter(s => totalLevel >= s.unlockTotalLevel).length;

    /**
     * 파티 문맥 — 조건이 세는 숫자를 **한 번에** 뽑아 둔다. 조건마다 파티를 다시 훑지 않는다.
     * members = [{sin, cls, items:[아이템], actives:[스킬 정의]}] — 모으는 것은 state.js, 세는 규칙은 여기.
     */
    function contextOf(members) {
        const ctx = { size: members.length, sins: [], classes: [], affixSins: {}, tags: {} };
        for (const m of members) {
            ctx.sins.push(m.sin);
            ctx.classes.push(m.cls);
            // 죄종 접사는 **아이템의 죄종 태그**를 센다 — 세트포인트가 아니다 (item_design §4 · INTERFACE §2-5)
            for (const it of m.items ?? []) for (const s of it.sins ?? []) ctx.affixSins[s] = (ctx.affixSins[s] ?? 0) + 1;
            // 태그는 **사람 수**를 센다 — 한 영웅이 같은 태그를 둘 들어도 1이다 (스킬 수를 세면 액티브 3 이 조건을 밀어 버린다)
            const mine = new Set();
            for (const def of m.actives ?? []) for (const tag of (SK?.tagsOf(def) ?? [])) mine.add(tag);
            for (const tag of mine) ctx.tags[tag] = (ctx.tags[tag] ?? 0) + 1;
        }
        return ctx;
    }

    /** 조건이 참인가 — 지금 센 숫자와 함께 낸다 (화면이 「3 / 2」 처럼 카운터를 찍는다 — §4 「안 보이면 함정」) */
    function measure(option, ctx) {
        const k = COND_KINDS[option.condKind];
        const have = k.count(ctx, option.condArg);
        return { have, need: option.condN, active: have >= option.condN };
    }

    /**
     * 켜진 옵션들 → 접사·마스터리와 **같은 채널**의 가산치 (§2-4).
     * 피해 감소만 따로 낸다 — 원천별 곱이라 합치면 안 된다 (battle_design §9-3). **옵션 하나 = 원천 하나**.
     */
    function bonusOf(options) {
        const flat = {}, dr = [];
        for (const o of options) {
            if (!o) continue;
            if (o.stat === 'damage_reduction') dr.push(o.value);
            else flat[o.stat] = (flat[o.stat] ?? 0) + o.value;
        }
        return { flat, dr };
    }

    /**
     * 칸이 처음 열렸을 때 들어 있는 옵션 — 풀을 **통째로 섞어** 앞에서부터 칸에 나눠 준다.
     * 리롤 결과에 의존하지 않는 게 핵심이다: 3번 칸을 리롤했다고 아직 안 열린 5번 칸의 내용이 바뀌면
     *   플레이어가 인과를 못 읽는다(통제성 — CLAUDE.md 철학 2). 섞기라서 첫 배정에 중복도 없다.
     */
    function initialAssign(rng) {
        const pool = familyIds.slice();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        // 등급은 안 굴린다 — 첫 배정은 언제나 일반이다 (§5-5): 시드 운이 초반 격차를 만들지 않고
        //   칸이 열릴 때마다 「굴릴 이유」가 같이 생긴다
        return pool.slice(0, slotCount).map(id => ({ id, grade: BASE_GRADE }));
    }

    /**
     * 리롤 한 번 — **가족과 등급을 같이 굴린다** (§5-5 확정 2026-09-01). rng 소비는 **가족 1회 → 등급 1회** 이 순서다.
     *
     * `excludeIds` 는 **가족 id** 다. 부르는 쪽이 **지금 그 칸에 든 것과 다른 칸에 든 것**을 전부 넘긴다:
     *   같은 것이 다시 나오면 돈을 내고 아무 일도 안 일어나고, 칸끼리 겹치면 같은 stat 이 두 번 곱해진다.
     *   **등급이 달라도 같은 가족이면 같은 옵션이다** — 「일반 공격력」과 「레어 공격력」을 두 칸에 세우면 안 된다
     */
    function pick(rng, excludeIds = []) {
        const rest = familyIds.filter(id => !excludeIds.includes(id));
        if (!rest.length) return null;
        const id = rest[Math.floor(rng() * rest.length)];
        return { id, grade: rollGrade(rng) };
    }

    /** 등급 가중 추첨 — `GRADES` 순서로 훑는다. 그 순서가 계약이다 (INTERFACE §5-3) */
    function rollGrade(rng) {
        let r = rng() * weightSum;
        for (let i = 0; i < GRADES.length; i++) {
            r -= gradeWeights[i];
            if (r < 0) return GRADES[i];
        }
        return GRADES[GRADES.length - 1];   // 부동소수 끝자락 보호 — 가중치 합을 넘는 r 은 마지막 등급
    }

    return {
        slotList, slotCount, families, familyIds, optionOf, openCount, contextOf, measure, bonusOf,
        initialAssign, pick, GRADES, COND_KINDS: Object.keys(COND_KINDS),
    };
}
