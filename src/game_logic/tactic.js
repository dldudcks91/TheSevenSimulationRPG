/**
 * 파티 전술 — 「조건 → 효과」 옵션이 하나씩 든 칸. **획득물이 아니다** (tactic_card_design §5 확정 2026-08-30):
 *   칸은 **지휘 천막 랭크**로 하나씩 열리고(로스터 합산 레벨은 그 랭크의 문턱 · 2026-09-22 · R137), 칸에 든 옵션은 **재화로 리롤**한다. 카드를 줍는 파밍 축이 없다.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 난수는 인자(`rng`), 정의는 생성자 주입.
 * 이 모듈은 상태를 들지 않는다 — 어느 칸에 무엇이 들었는지 · 어느 칸을 잠갔는지는 세이브(`state.presets[*].tactics` — 편성마다 · v34 · 잠금 v35)가 들고, 여기는 규칙만 낸다.
 *
 * **정의는 CSV · 종류는 코드** — 조건의 `test` 어휘는 아래 고정 사전이고 값(문턱 · 점수 · 기준값 · 배수)은 전부 CSV 다.
 *   미니 DSL 을 두지 않는다 (skill.js 와 같은 규약).
 *
 * **표가 셋이다** [2026-09-22 · tactic_card_design §5-8 · R134] — 값을 고치는 자리를 셋으로 좁혔다:
 *   `tactic_condition.csv` (조건 사전 — 무엇을 세나 · 문턱 · **점수**) → `tactic_option.csv` (옵션 = 조건 하나 + 능력치 + **기준값**)
 *   → `tactic_score.csv` (**점수 × 등급 배수**). 옵션 값 = 기준값 × 배수(조건의 점수, 등급). 점수를 바꾸면 그 조건의 옵션이 전부 따라간다.
 *   ~~`(option_id, grade)` 복합키 — 등급마다 값을 손으로 적는다~~ 는 2026-09-22 폐지(§5-5 SSOT 행 모양 개정).
 *
 * tactic_card_design.md 확정 규칙:
 *   · 조건은 **편성 시점에 확정되는 것만** (§2-1) — 현재 HP·남은 적 수 같은 전투 중 값은 세지 않는다.
 *   · 효과는 **기존 공식의 항**으로 들어간다 (§2-4) — 마스터리·접사와 같은 채널이고 새 곱셈 층을 만들지 않는다.
 *     피해 감소만 따로 낸다 (원천별 곱 — battle_design §9-3)
 *   · 효과는 **파티에만** 걸린다 (§1) — 벤치 영웅에게는 안 붙는다. 그 판정은 state.js 가 한다
 *   · 중복 방지·첫 배정·리롤 후보의 단위는 전부 **가족(옵션 하나)**이다 — 등급은 값만 가른다(§5-5):
 *     「일반 데미지」와 「레어 데미지」는 같은 옵션이라 두 칸에 서면 같은 stat 이 두 번 곱해진다
 *   · 「없으면」 조건의 효과는 빠진 것이 하던 일을 메우지 않는다 (§2-3) — 데이터를 짜는 규칙이라 코드는 세지 않는다
 */

/**
 * @param {object} data
 *   slots        — tactic_slot.csv 파싱 행 (칸 수 = 행 수 · 여는 것은 건설 표 — 지휘 천막)
 *   conditions   — tactic_condition.csv 파싱 행 (조건 사전 — 1행 = 조건 하나 · 점수)
 *   options      — tactic_option.csv 파싱 행 (1행 = 옵션 하나 = 조건 id + 인자 + 능력치 + 기준값)
 *   scores       — tactic_score.csv 파싱 행 (점수 하나 = 등급별 배수)
 *   sins         — 죄종 id 목록 (인자 검증)
 *   classes      — 직업 정의 [{id, ...}] (인자 검증)
 *   gradeWeights — {common, magic, rare} 상대 가중치 (balance.csv:tactic_grade_weight_*) — 리롤의 등급 추첨
 *   rerollCost   — {base, lockMult} (balance.csv:tactic_reroll_base_cost · tactic_reroll_lock_mult) — 전체 리롤 비용 (§5-6)
 */
export function createTacticSystem(data) {
    const NONE = '-';
    const dash = v => (v === NONE || v === '' || v === undefined || v === null ? null : v);
    /** 등급 어휘 — **이 배열 순서가 계약이다** (INTERFACE §5-3): 가중 추첨이 이 순서로 훑는다 */
    const GRADES = ['common', 'magic', 'rare'];
    const BASE_GRADE = GRADES[0];   // 첫 배정은 언제나 여기 (§5-5 「첫 배정은 일반 고정」)
    const SINS = data.sins ?? [];
    const CLASS_IDS = (data.classes ?? []).map(c => c.id);

    /** 배열에서 같은 값이 가장 많이 나온 횟수 — 「같은 죄종 n명」 · 「같은 직업 n명」 */
    const maxCount = arr => {
        const n = {};
        let best = 0;
        for (const v of arr) best = Math.max(best, n[v] = (n[v] ?? 0) + 1);
        return best;
    };

    /**
     * 조건 어휘(`tactic_condition.csv:test`) — 이 밖의 값은 로드 시 throw. `count` 가 파티 문맥에서 숫자를 하나 뽑는다.
     * **있으면**(`has`)은 그 숫자가 문턱 `n` **이상**이면 참 · **없으면**(`not`)은 **0** 이면 참이다.
     * `arg` = 인자의 종류 — `sin`(죄종) · `cls`(직업) · null(안 받음). 전부 편성에서 확정되는 값이다 (§2-1).
     * 종류 여섯(무조건 · 편성 · 장비 죄종 · 리더 · 진형 · 관계)은 `category` 이고 이 어휘가 그 안을 가른다 (§5-8)
     */
    const TESTS = {
        none: { arg: null, count: () => 1 },                                     // 무조건 — 문턱 0
        sin_kind: { arg: null, count: c => new Set(c.sins).size },               // 죄종이 몇 종인가
        sin_same: { arg: null, count: c => maxCount(c.sins) },                   // 같은 죄종이 몇 명까지 겹치나
        cls_same: { arg: null, count: c => maxCount(c.classes) },                // 같은 직업이 몇 명까지 겹치나
        gear_sin: { arg: 'sin', count: (c, a) => c.gearSins[a] ?? 0 },           // 파티 장비 이름의 그 죄종 수 (item_design §1 「이름」)
        leader_cls: { arg: 'cls', count: (c, a) => (c.leader?.cls === a ? 1 : 0) },   // 리더 = 편성 첫 칸
        front_cls: { arg: 'cls', count: (c, a) => c.front.filter(m => m.cls === a).length },   // 전열에 선 그 직업 인원
        together: { arg: null, count: c => c.bond },                             // 지금 이 인원이 같이 나간 런 수 (세이브 v36)
    };
    // ~~always~~ · ~~class_same~~ · ~~affix_sin~~ · ~~skill_tag~~ 는 2026-09-22 폐지 — 조건 사전(§5-8)으로 이름이 바뀌었고
    //   **스킬 태그 조건은 삭제**다. 옛 세이브의 칸은 가족 id 로 찾으므로 없는 가족은 첫 배정으로 돌아간다(state.tacticState)
    const CATEGORIES = ['always', 'party', 'gear', 'leader', 'formation', 'bond'];

    /* ── 칸 (tactic_slot.csv) ── */

    const slotList = (data.slots ?? []).slice().sort((a, b) => a.slot_no - b.slot_no).map((row, i) => {
        const no = row.slot_no;
        if (no !== i + 1) throw new Error(`tactic: slot_no 는 1부터 빈틈없이 — ${no} (${i + 1} 자리)`);
        // ~~reroll_cost_gold~~ 는 2026-09-22 삭제 — 비용은 칸이 아니라 **잠근 칸 수**가 정한다 (§5-6 · 아래 rerollCost)
        // ~~unlock_total_level~~ 도 2026-09-22 삭제 — 칸은 **지휘 천막 랭크**가 연다(`building_effect.csv` 의 `tactic_slots` · 합산 레벨은 그 랭크의 문턱 · R137).
        //   이 표는 칸 **수**만 든다 — 몇 칸이 열렸나는 `state.tacticState` 가 `limitsOf` 로 센다
        return { no };
    });
    const slotCount = slotList.length;

    /* ── 점수 × 등급 배수 (tactic_score.csv) ── */

    const scoreMult = {};
    for (const row of data.scores ?? []) {
        const s = row.score;
        if (!Number.isInteger(s) || s < 0) throw new Error(`tactic: 점수 ${s} — 0 이상 정수`);
        if (scoreMult[s]) throw new Error(`tactic: 점수 ${s} 가 두 번 나온다`);
        const m = GRADES.map(g => row[g]);
        if (m.some(v => typeof v !== 'number' || !(v > 0))) throw new Error(`tactic: 점수 ${s} 배수 ${m.join('/')}`);
        // 등급이 오르면 값이 커진다 (§5-5) — 한 점수 안에서 일반 < 매직 < 레어
        for (let i = 1; i < m.length; i++) if (!(m[i] > m[i - 1])) throw new Error(`tactic: 점수 ${s} — ${GRADES[i]} ${m[i]} 가 ${GRADES[i - 1]} ${m[i - 1]} 보다 크지 않다`);
        scoreMult[s] = Object.fromEntries(GRADES.map((g, i) => [g, m[i]]));
    }
    const scoreList = Object.keys(scoreMult).map(Number).sort((a, b) => a - b);
    if (!scoreList.length) throw new Error('tactic: 점수 배수 표가 비었다 (tactic_score.csv)');
    scoreList.forEach((s, i) => { if (s !== i) throw new Error(`tactic: 점수는 0 부터 빈틈없이 — ${s} (${i} 자리)`); });
    // 어려울수록 천장이 높다 (§5-8) — 같은 등급에서 점수가 오르면 배수가 줄지 않는다
    for (let i = 1; i < scoreList.length; i++) for (const g of GRADES)
        if (scoreMult[i][g] < scoreMult[i - 1][g]) throw new Error(`tactic: 점수 ${i} 의 ${g} 배수가 점수 ${i - 1} 보다 작다 — 어려운 조건이 더 약해진다`);

    /* ── 조건 사전 (tactic_condition.csv) ── */

    const condById = {};
    for (const row of data.conditions ?? []) {
        const id = row.cond_id;
        const bad = why => { throw new Error(`tactic: 조건 ${id} — ${why}`); };
        if (!id) bad('cond_id 가 없다');
        if (condById[id]) bad('cond_id 가 두 번 나온다');
        if (!CATEGORIES.includes(row.category)) bad(`category '${row.category}' — 어휘는 ${CATEGORIES.join('/')}`);
        if (!['has', 'not'].includes(row.polarity)) bad(`polarity '${row.polarity}' — has / not`);
        const test = TESTS[row.test];
        if (!test) bad(`test '${row.test}'`);
        // 인자 — 옵션이 정하는 자리(`sin` · `cls`)이거나, 조건이 이미 정한 직업 id 이거나, 없다
        const arg = dash(row.arg);
        if (test.arg === null && arg !== null) bad(`test '${row.test}' 는 인자를 받지 않는다`);
        if (test.arg === 'sin' && arg !== 'sin' && !SINS.includes(arg)) bad(`죄종 인자 '${arg}'`);
        if (test.arg === 'cls' && arg !== 'cls' && !CLASS_IDS.includes(arg)) bad(`직업 인자 '${arg}'`);
        const n = dash(row.n);
        if (n !== null && !(Number.isInteger(n) && n >= 0)) bad(`n ${row.n}`);
        if (!scoreMult[row.score]) bad(`점수 ${row.score} — tactic_score.csv 에 없다`);
        // 점수 0 은 무조건만이다 — 조건부가 바닥값과 같으면 조건을 맞출 이유가 없다 (§5-2 「무조건 = 리롤 바닥값」)
        if ((row.score === 0) !== (row.category === 'always')) bad('점수 0 은 무조건만이다');
        if (row.category === 'bond' && row.polarity !== 'has') bad('관계는 있으면만이다 (§5-8)');
        condById[id] = {
            id, category: row.category, polarity: row.polarity, test: row.test, argSlot: test.arg, arg, score: row.score,
            // 문턱 — 있으면은 적힌 값(비었으면 1 명 · 1 개) · 없으면은 언제나 0
            n: row.polarity === 'not' ? 0 : (n ?? (row.test === 'none' ? 0 : 1)),
        };
    }

    /* ── 옵션 (tactic_option.csv — 1행 = 가족 하나) ── */

    /** 기준값 × 배수 — 고정값 채널(`_flat`)은 정수, 나머지는 비율이라 부동소수 꼬리만 자른다 */
    const valueOf = (stat, unit, mult) => (stat.endsWith('_flat') ? Math.round(unit * mult) : Math.round(unit * mult * 1e4) / 1e4);

    const families = [];
    const famById = {};
    for (const row of data.options ?? []) {
        const id = row.option_id;
        const bad = why => { throw new Error(`tactic: ${id} — ${why}`); };
        if (!id) bad('option_id 가 없다');
        if (famById[id]) bad('option_id 가 두 번 나온다');
        const cond = condById[row.cond_id];
        if (!cond) bad(`cond_id '${row.cond_id}' — tactic_condition.csv 에 없다`);
        // 인자 — 조건이 자리를 비워 두면(`sin` · `cls`) 옵션이 채우고, 조건이 이미 정했으면 옵션은 비운다
        const own = dash(row.arg);
        let arg = null;
        if (cond.arg === 'sin') { if (!SINS.includes(own)) bad(`죄종 '${own}' — 조건 ${cond.id} 가 죄종을 받는다`); arg = own; }
        else if (cond.arg === 'cls') { if (!CLASS_IDS.includes(own)) bad(`직업 '${own}' — 조건 ${cond.id} 가 직업을 받는다`); arg = own; }
        else { if (own !== null) bad(`조건 ${cond.id} 는 인자를 안 받는다(이미 정했거나 없다)`); arg = cond.arg; }
        if (!row.stat) bad('stat 이 없다');
        if (typeof row.unit !== 'number' || !(row.unit > 0)) bad(`unit ${row.unit} — 기준값은 양수`);
        const mult = scoreMult[cond.score];
        const grades = Object.fromEntries(GRADES.map(g => [g, valueOf(row.stat, row.unit, mult[g])]));
        // 반올림 뒤에도 등급 순으로 커져야 한다 — 고정값 채널은 기준값이 작으면 둘이 같은 정수로 뭉칠 수 있다
        for (let i = 1; i < GRADES.length; i++)
            if (!(grades[GRADES[i]] > grades[GRADES[i - 1]])) bad(`${GRADES[i]} ${grades[GRADES[i]]} 가 ${GRADES[i - 1]} ${grades[GRADES[i - 1]]} 보다 크지 않다 — 기준값이 너무 작다`);
        const fam = famById[id] = {
            id, condId: cond.id, category: cond.category, polarity: cond.polarity, condKind: cond.test, condArg: arg, condN: cond.n,
            score: cond.score, stat: row.stat, unit: row.unit, grades,
        };
        families.push(fam);
    }
    const familyIds = families.map(f => f.id);
    // 가족이 **칸의 두 배** 이상이어야 한다 — 전체 리롤은 굴리기 직전에 든 것(열린 칸 전부)과 이번에 이미 뽑은 것을 빼고 뽑으므로
    //   모든 칸을 새로 뽑는 마지막 한 번에 `칸 수 + (칸 수 − 1)` 가족이 후보에서 빠진다 (§5-6 중복 규칙)
    if (families.length < slotCount * 2)
        throw new Error(`tactic: 가족 ${families.length}개 < 칸 ${slotCount}개 × 2 — 전체 리롤이 후보를 다 쓴다`);

    /** 등급 가중치 — 값은 CSV. 하나라도 빠지거나 음수면 리롤이 조용히 한쪽으로 쏠리므로 로드 시 막는다 */
    const gradeWeights = GRADES.map(g => {
        const w = data.gradeWeights?.[g];
        if (typeof w !== 'number' || !(w >= 0)) throw new Error(`tactic: 등급 가중치 '${g}' 가 없다 (balance.csv:tactic_grade_weight_${g})`);
        return w;
    });
    const weightSum = gradeWeights.reduce((a, w) => a + w, 0);
    if (!(weightSum > 0)) throw new Error('tactic: 등급 가중치 합이 0 — 뽑을 등급이 없다');

    /** 전체 리롤 비용 — 기본가 × 배수 ^ 잠근 칸 수 (§5-6 확정 2026-09-22 — 가파른 곱). 값은 CSV */
    const costBase = data.rerollCost?.base, lockMult = data.rerollCost?.lockMult;
    if (typeof costBase !== 'number' || !(costBase >= 0)) throw new Error('tactic: 리롤 기본가가 없다 (balance.csv:tactic_reroll_base_cost)');
    // 배수가 1 밑이면 잠글수록 싸진다 — 「지킬수록 비싸다」(§5-6)가 뒤집힌다
    if (typeof lockMult !== 'number' || !(lockMult >= 1)) throw new Error('tactic: 잠금 배수가 없거나 1 미만 (balance.csv:tactic_reroll_lock_mult)');
    const rerollCost = lockedCount => Math.round(costBase * lockMult ** lockedCount);

    /** 칸이 든 `{id, grade}` 한 쌍 → 옵션 하나. 없는 가족·없는 등급이면 `null` (CSV 가 바뀐 세이브) */
    function optionOf(ref) {
        const fam = ref && famById[ref.id];
        if (!fam) return null;
        const value = fam.grades[ref.grade];
        if (value === undefined) return null;
        return {
            id: fam.id, grade: ref.grade, condId: fam.condId, category: fam.category, polarity: fam.polarity,
            condKind: fam.condKind, condArg: fam.condArg, condN: fam.condN, score: fam.score, stat: fam.stat, value,
        };
    }

    /* ── 판정 ── */
    // ~~openCount(totalLevel)~~ 는 2026-09-22 삭제 — 열린 칸 수는 지휘 천막 랭크가 정한다(`state.limitsOf(state).tacticSlots` · R137)

    /**
     * 파티 문맥 — 조건이 세는 숫자를 **한 번에** 뽑아 둔다. 조건마다 파티를 다시 훑지 않는다.
     * members = [{sin, cls, items:[아이템], front}] **편성 순서대로**(첫 칸이 리더) · `extra.bond` = 이 인원이 같이 나간 런 수.
     * 모으는 것은 state.js, 세는 규칙은 여기.
     */
    function contextOf(members, extra = {}) {
        const ctx = { size: members.length, sins: [], classes: [], gearSins: {}, leader: members[0] ?? null, front: [], bond: extra.bond ?? 0 };
        for (const m of members) {
            ctx.sins.push(m.sin);
            ctx.classes.push(m.cls);
            if (m.front) ctx.front.push(m);
            // 장비 죄종은 **아이템 이름의 죄종 태그**를 센다 — 세트포인트가 아니다 (item_design §4 · INTERFACE §2-5)
            for (const it of m.items ?? []) for (const s of it.sins ?? []) ctx.gearSins[s] = (ctx.gearSins[s] ?? 0) + 1;
        }
        return ctx;
    }

    /** 조건이 참인가 — 지금 센 숫자와 함께 낸다 (화면이 「3 / 2」 처럼 카운터를 찍는다 — §4 「안 보이면 함정」). 없으면은 `need` 0 */
    function measure(option, ctx) {
        const have = TESTS[option.condKind].count(ctx, option.condArg);
        const active = option.polarity === 'not' ? have === 0 : have >= option.condN;
        return { have, need: option.condN, active };
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
     * 한 칸 뽑기 — **가족과 등급을 같이 굴린다** (§5-5 확정 2026-09-01). rng 소비는 **가족 1회 → 등급 1회** 이 순서다.
     *
     * `excludeIds` 는 **가족 id** 다 — 같은 것이 다시 나오면 돈을 내고 아무 일도 안 일어나고, 칸끼리 겹치면 같은 stat 이 두 번 곱해진다.
     *   **등급이 달라도 같은 가족이면 같은 옵션이다** — 「일반 데미지」와 「레어 데미지」를 두 칸에 세우면 안 된다.
     *   점수는 출현에 안 걸린다 — 어려운 조건도 쉬운 조건만큼 뜬다(§5-8 「출현은 균등」)
     */
    function pick(rng, excludeIds = []) {
        const rest = familyIds.filter(id => !excludeIds.includes(id));
        if (!rest.length) return null;
        const id = rest[Math.floor(rng() * rest.length)];
        return { id, grade: rollGrade(rng) };
    }

    /**
     * 전체 리롤의 뽑기 — rng **하나로** `pick` 을 `count` 번 잇는다 (§5-6 · INTERFACE §5-2). 부르는 쪽이 칸 번호 오름차순으로 나눠 준다.
     * `excludeIds` = **잠긴 칸의 옵션 + 굴리기 직전 열린 칸이 들고 있던 옵션**이고, 이번에 뽑은 가족은 다음 뽑기에서 빠진다.
     * 후보가 모자라면 `null` — 로드가 「가족 ≥ 칸 × 2」를 검증하므로 평소엔 안 탄다
     */
    function pickMany(rng, count, excludeIds = []) {
        const out = [], taken = excludeIds.slice();
        for (let i = 0; i < count; i++) {
            const got = pick(rng, taken);
            if (!got) return null;
            out.push(got);
            taken.push(got.id);
        }
        return out;
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
        slotList, slotCount, families, familyIds, optionOf, contextOf, measure, bonusOf,
        initialAssign, pick, pickMany, rerollCost, GRADES, COND_KINDS: Object.keys(TESTS), CATEGORIES,
        conditions: Object.values(condById), scoreMult,
    };
}
