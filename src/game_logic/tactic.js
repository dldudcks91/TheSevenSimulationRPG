/**
 * 파티 전술 — **작전 카드 칸 셋**(공격 · 방어 · 유틸) [2026-11-25 · R586 · tactic_card_design §1 · PLAN_tactic_cards_impl]:
 *   칸 하나에 카드 한 장 = **카드 규칙**(전투 — battle 이 읽는다 · `rulesOf`) + **옵션 줄 `lineCount` 개**(능력치 — 접사 · 마스터리와 같은 `{flat, dr}` 채널).
 *   카드는 **소모품**이다 — 드랍(정예 · 스테이지보스)으로 가방에 들고 · 칸에 장착하면 소모되고 · 옵션 줄 수치는 **장착할 때 굴린다**(D7).
 *   ~~칸 다섯 · 칸마다 조건 · 첫 배정 · 전체 리롤 · 잠금 · 등급 셋~~ 은 2026-11-25 퇴역(R586).
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 난수는 인자(`rng`), 정의는 생성자 주입.
 * 이 모듈은 상태를 들지 않는다 — 가방 · 칸의 내용은 세이브(`state.tacticBag` · `presets[*].tactics` — v52)가 들고, 여기는 규칙 · 굴림 · 잰 값만 낸다.
 *
 * **정의는 CSV · 종류는 코드** — 카드 규칙의 어휘(`RULES`)와 수치 칸의 뜻은 아래 고정 사전이고 값(p1 ~ p3)은 `tactic_card.csv` 다.
 *   미니 DSL 을 두지 않는다 (skill.js 와 같은 규약). 규칙의 전투 해석은 battle.js(INTERFACE §2-6).
 *
 * tactic_card_design.md 확정 규칙:
 *   · 카드 등급은 **옵션 줄 등급의 천장**만 정한다 — 카드 규칙의 수치는 등급과 무관하다 (§2-3 · D2)
 *   · 옵션 줄 = 그 카드 죄종의 풀(`tactic_option.csv`)에서 장착할 때 굴린다 — 종류 → 등급 → 범위 배수 m (§5-1)
 *     값 = unit × (1 + mult_share × (m − 1)) · 적용 값 = 값 × (1 + 리더 몫 + 그 죄종 점수 몫) (§5-1 · §6-2 · §6-3) — **카드 규칙의 수치에는 안 곱한다**
 *   · 인챈트 = 줄 하나만 굴려 바로 바꾼다 — 종류 · 등급 한 단계 걷기 · 범위 값 (§5-3 · D4)
 *   · 효과는 **기존 공식의 항**으로 들어간다 (§2-5) — 피해 감소만 따로 낸다 (원천별 곱 — battle_design §9-3)
 *   · 효과는 **파티에만** 걸린다 (§1) — 벤치 영웅에게는 안 붙는다. 그 판정은 state.js 가 한다
 */

/**
 * @param {object} data
 *   cards        — tactic_card.csv 파싱 행 (`card_id,slot,sin,rule,p1,p2,p3,description_kr`) — **행 순서가 굴림 순서**다 (드랍 카드 · 층 AI 팀 카드)
 *   options      — tactic_option.csv 파싱 행 (1행 = 옵션 종류 하나 = 죄종 + 효과 + 능력치 + 기준값 + 배수 몫 + 리더 몫) — 옵션 줄의 풀
 *   sins         — 죄종 id 목록 (어휘 · 판 데이터의 순서)
 *   gearPct      — 죄종 점수 1점의 버프 몫 (balance.csv:tactic_sin_gear_pct) (§6-3)
 *   heroScore    — 파티 영웅 하나가 제 죄종에 더하는 점수 (balance.csv:tactic_sin_hero_score) (§6-3)
 *   leader       — {pivot, min, max, multMin, multMax} (balance.csv:attr_dmg_pivot · hero_attr_min · hero_attr_max · tactic_leader_mult_min · _max) (§6-2)
 *   cardWeights  — {등급: w} (balance.csv:tactic_card_weight_*) — 드랍 카드 등급 (§3-2)
 *   lineWeights  — {등급: w} (balance.csv:tactic_line_weight_*) — 장착 때 줄 등급 · 카드 등급 이하만 다시 정규화 (§5-1)
 *   lineRange    — {등급: [lo, hi]} (balance.csv:tactic_line_lo_* · tactic_line_hi_*) — 줄 등급의 범위 배수 (§5-1)
 *   lineCount    — 카드 하나의 옵션 줄 수 (balance.csv:tactic_line_count)
 *   enchant      — {stay, up, gold, shard} (balance.csv:tactic_enchant_stay_pct · tactic_enchant_up_pct · tactic_enchant_gold · tactic_enchant_shard) (§5-3)
 *   shards       — {등급: n} (balance.csv:tactic_shard_*) — 카드 한 장을 분해한 조각 (§3-4)
 *   drop         — {elite, boss} (balance.csv:tactic_drop_elite_pct · tactic_drop_boss_pct) — 정예 · 스테이지보스 한 마리의 드랍 확률 (§3-2)
 */
export function createTacticSystem(data) {
    const NONE = '-';
    const dash = v => (v === NONE || v === '' || v === undefined || v === null ? null : v);
    /** 등급 어휘 — **이 배열 순서가 계약이다** (INTERFACE §5-3): 가중 추첨이 이 순서로 훑고 · 등급 걷기의 위아래가 이 순서다 */
    const GRADES = ['common', 'magic', 'rare', 'epic', 'legendary'];
    /** 칸(갈래) — **이 순서로 지휘 천막 1 · 2 · 3랭크가 연다** · 층 AI 팀의 카드 굴림 순서 · `rulesOf` 를 부르는 쪽의 순서 (INTERFACE §5-3) */
    const SLOTS = ['attack', 'defense', 'utility'];
    /**
     * 카드 규칙 어휘 — 규칙마다 받는 수치 칸(p1 ~ p3)의 종류: `sec` = 초(0 보다 크다) · `frac` = 몫(0 초과 1 이하) · 없는 칸은 `-`.
     *   이 밖의 규칙은 로드 시 throw · 전투 해석은 battle.js (INTERFACE §2-6) · 뜻은 tactic_card_design §4
     */
    const RULE_PARAMS = {
        duel: [],
        wedge: ['sec'],
        trojan: ['sec'],
        charge: ['sec'],
        shieldwall: ['frac'],
        guard: ['frac'],
        turtle: ['sec', 'frac', 'frac'],
        retreat: ['frac'],
        poison_arrow: ['frac'],
        fire_arrow: ['frac', 'frac'],
        baggage: ['frac'],
    };
    const RULES = Object.keys(RULE_PARAMS);
    /** 죄종 — 옵션 · 카드의 어휘 · 판 데이터(`gear` · `score`)의 순서 */
    const SINS = (data.sins ?? []).slice();
    if (!SINS.length) throw new Error('tactic: 죄종 목록이 비었다 (sins)');
    /** 범위 배수 m 자르기 — 소수 넷째 자리 (INTERFACE §5-3) · 세이브는 m 을 들고 값은 m 으로 다시 잰다 */
    const round4 = v => Math.round(v * 1e4) / 1e4;
    const isInt = (v, lo = 0) => Number.isInteger(v) && v >= lo;
    const isFrac01 = v => typeof v === 'number' && v >= 0 && v <= 1;

    /* ── 리더 보너스 (balance.csv:tactic_leader_mult_* — 2026-10-24 · R340 · §6-2) ── */

    const LD = data.leader ?? {};
    if (![LD.pivot, LD.min, LD.max].every(Number.isFinite) || !(LD.min < LD.pivot && LD.pivot < LD.max))
        throw new Error(`tactic: 리더 통솔 범위 ${LD.min} < 기준 ${LD.pivot} < ${LD.max} 가 아니다 (balance.csv:hero_attr_min · attr_dmg_pivot · hero_attr_max)`);
    // 최소 쪽이 1 을 넘거나 최대 쪽이 1 밑이면 통솔이 높을수록 약해진다 — 곡선이 뒤집힌다
    if (!(LD.multMin > 0 && LD.multMin <= 1 && LD.multMax >= 1))
        throw new Error(`tactic: 리더 배수 ${LD.multMin} ~ ${LD.multMax} — 0 < 최소 ≤ 1 ≤ 최대 (balance.csv:tactic_leader_mult_min · _max)`);
    /**
     * 리더 곡선 — 리더(편성 첫 칸)의 통솔을 [최소, 최대]로 자르고 **기준 아래는 최소 배수까지 · 위는 최대 배수까지 직선** [2026-10-24 사용자
     *   「통솔 10을 기준으로 10보다 낮으면 감소해서 1이면 50%, 20이면 2배」]. 기준에서 1 · 리더가 없거나 통솔을 모르면 1
     */
    const leadCurve = ldr => {
        if (!Number.isFinite(ldr)) return 1;
        const v = Math.min(LD.max, Math.max(LD.min, ldr));
        return v >= LD.pivot
            ? 1 + (LD.multMax - 1) * (v - LD.pivot) / (LD.max - LD.pivot)
            : 1 - (1 - LD.multMin) * (LD.pivot - v) / (LD.pivot - LD.min);
    };

    /* ── 죄종 점수 몫 (balance.csv — §6-3 · R441 · R563) ── */

    const gearPct = data.gearPct;
    if (typeof gearPct !== 'number' || !(gearPct >= 0)) throw new Error('tactic: 죄종 점수 몫이 없다 (balance.csv:tactic_sin_gear_pct)');
    const heroScore = data.heroScore;
    if (typeof heroScore !== 'number' || !(heroScore >= 0)) throw new Error('tactic: 영웅 죄종 점수가 없다 (balance.csv:tactic_sin_hero_score)');

    /* ── 등급 — 가중치 · 범위 · 조각 (balance.csv · §3-2 · §3-4 · §5-1) ── */

    /** 등급마다 값 하나 — 빠지거나 어휘 밖이면 로드 시 막는다(가중 추첨이 조용히 한쪽으로 쏠리지 않게) */
    const perGrade = (src, what, ok, key) => Object.fromEntries(GRADES.map(g => {
        const v = src?.[g];
        if (!ok(v)) throw new Error(`tactic: ${what} '${g}' = ${v} (balance.csv:${key}${g})`);
        return [g, v];
    }));
    const cardWeights = perGrade(data.cardWeights, '카드 등급 가중치', v => typeof v === 'number' && v >= 0, 'tactic_card_weight_');
    if (!(Object.values(cardWeights).reduce((a, w) => a + w, 0) > 0)) throw new Error('tactic: 카드 등급 가중치 합이 0 — 뽑을 등급이 없다 (balance.csv:tactic_card_weight_*)');
    const lineWeights = perGrade(data.lineWeights, '줄 등급 가중치', v => typeof v === 'number' && v >= 0, 'tactic_line_weight_');
    // 일반 카드도 줄을 굴린다 — 일반의 가중치가 0 이면 일반 카드의 줄 등급 후보가 빈다
    if (!(lineWeights.common > 0)) throw new Error('tactic: 줄 등급 가중치 common 이 0 — 일반 카드의 줄을 못 굴린다 (balance.csv:tactic_line_weight_common)');
    const lineRange = Object.fromEntries(GRADES.map(g => {
        const r = data.lineRange?.[g];
        if (!Array.isArray(r) || r.length !== 2 || !r.every(Number.isFinite) || !(r[0] > 0 && r[0] <= r[1]))
            throw new Error(`tactic: 줄 범위 '${g}' = ${JSON.stringify(r)} — 0 < lo ≤ hi (balance.csv:tactic_line_lo_${g} · tactic_line_hi_${g})`);
        return [g, [r[0], r[1]]];
    }));
    // 등급이 오르면 범위가 내려가지 않는다 — 높은 등급이 더 약한 값을 내면 천장이 뒤집힌다
    for (let i = 1; i < GRADES.length; i++) {
        const [a, b] = [lineRange[GRADES[i - 1]], lineRange[GRADES[i]]];
        if (!(b[0] >= a[0] && b[1] >= a[1])) throw new Error(`tactic: 줄 범위 ${GRADES[i]} [${b}] 가 ${GRADES[i - 1]} [${a}] 보다 낮다 — 등급 순으로 lo · hi 가 줄지 않아야 한다`);
    }
    const lineCount = data.lineCount;
    if (!isInt(lineCount, 1)) throw new Error(`tactic: 줄 수 ${lineCount} — 1 이상 정수 (balance.csv:tactic_line_count)`);
    const EN = data.enchant ?? {};
    if (!isFrac01(EN.stay) || !isFrac01(EN.up)) throw new Error(`tactic: 인챈트 걷기 그대로 ${EN.stay} · 오를 몫 ${EN.up} — 0 ~ 1 (balance.csv:tactic_enchant_stay_pct · tactic_enchant_up_pct)`);
    if (!isInt(EN.gold) || !isInt(EN.shard)) throw new Error(`tactic: 인챈트 비용 골드 ${EN.gold} · 조각 ${EN.shard} — 0 이상 정수 (balance.csv:tactic_enchant_gold · tactic_enchant_shard)`);
    const enchantCost = { gold: EN.gold, shard: EN.shard };
    const walk = { stay: EN.stay, up: EN.up };
    const shards = perGrade(data.shards, '분해 조각', v => isInt(v), 'tactic_shard_');
    const dropPct = { elite: data.drop?.elite, boss: data.drop?.boss };
    if (!isFrac01(dropPct.elite) || !isFrac01(dropPct.boss)) throw new Error(`tactic: 드랍 확률 정예 ${dropPct.elite} · 보스 ${dropPct.boss} — 0 ~ 1 (balance.csv:tactic_drop_elite_pct · tactic_drop_boss_pct)`);

    /* ── 옵션 풀 (tactic_option.csv — 1행 = 옵션 종류 하나) ── */

    /** 고정값 채널(`_flat`)은 정수, 나머지는 비율이라 부동소수 꼬리만 자른다 */
    const round = (stat, v) => (stat.endsWith('_flat') ? Math.round(v) : round4(v));
    /** 줄 값 = 기준값 × (1 + 몫 × (m − 1)) — 몫 1 이면 기준값 × m (§5-1 · 피해 감소만 몫이 1 밑) */
    const valueAt = (f, m) => round(f.stat, f.unit * (1 + f.multShare * (m - 1)));

    const families = [];
    const famById = {};
    /** 죄종마다 옵션 id — 행 순서(굴림 순서라 계약이다) */
    const poolBySin = Object.fromEntries(SINS.map(s => [s, []]));
    for (const row of data.options ?? []) {
        const id = row.option_id;
        const bad = why => { throw new Error(`tactic: ${id} — ${why}`); };
        if (!id) bad('option_id 가 없다');
        if (famById[id]) bad('option_id 가 두 번 나온다');
        if (!SINS.includes(row.sin)) bad(`죄종 '${row.sin}' — 어휘는 ${SINS.join('/')}`);
        if (!row.effect) bad('effect 가 없다');
        if (!row.stat) bad('stat 이 없다');
        if (typeof row.unit !== 'number' || !(row.unit > 0)) bad(`unit ${row.unit} — 기준값은 양수`);
        // 배수 받는 몫 — 1 = 범위 배수를 전부 · 0 = 안 받음. 원천별 곱(피해 감소)처럼 일률 배수에서 터지는 채널만 1 밑이다 (§5-2)
        const share = row.mult_share;
        if (!isFrac01(share)) bad(`mult_share ${share} — 0 ~ 1 (tactic_option.csv)`);
        // 리더 곡선을 받는 몫 — 1 = 전부 · 0 = 안 받음 · 통솔 최소에서도 값이 0 보다 커야 한다
        const lb = row.leader_bonus;
        if (typeof lb !== 'number' || !(lb >= 0)) bad(`leader_bonus ${lb} — 0 이상 (tactic_option.csv)`);
        if (!(1 + lb * (LD.multMin - 1) > 0)) bad(`leader_bonus ${lb} — 통솔 최소에서 값이 0 이하가 된다`);
        const fam = { id, sin: row.sin, effect: row.effect, stat: row.stat, unit: row.unit, multShare: share, leaderBonus: lb };
        // 가장 낮은 범위 끝(일반의 lo)에서도 값이 0 보다 크다 — 고정값 채널은 반올림이 0 으로 떨어질 수 있다
        if (!(valueAt(fam, lineRange[GRADES[0]][0]) > 0)) bad(`가장 낮은 범위 끝(${lineRange[GRADES[0]][0]})에서 값이 0 이하 — 기준값이 너무 작다`);
        families.push(fam);
        famById[id] = fam;
        poolBySin[row.sin].push(id);
    }
    const familyIds = families.map(f => f.id);

    /* ── 카드 (tactic_card.csv — 1행 = 카드 한 종류) ── */

    const cards = [];
    const cardById = {};
    const seenRule = new Set();
    for (const row of data.cards ?? []) {
        const id = row.card_id;
        const bad = why => { throw new Error(`tactic: 카드 ${id} — ${why}`); };
        if (!id) bad('card_id 가 없다');
        if (cardById[id]) bad('card_id 가 두 번 나온다');
        if (!SLOTS.includes(row.slot)) bad(`slot '${row.slot}' — 어휘는 ${SLOTS.join('/')}`);
        if (!SINS.includes(row.sin)) bad(`sin '${row.sin}' — 어휘는 ${SINS.join('/')}`);
        const kinds = RULE_PARAMS[row.rule];
        if (!kinds) bad(`rule '${row.rule}' — 어휘는 ${RULES.join('/')}`);
        // 같은 규칙이 한쪽에 두 번 오지 않는다 — 칸이 갈래별 하나라 표에서 한 번이면 충분하다 (PLAN §2)
        if (seenRule.has(row.rule)) bad(`rule '${row.rule}' 이 표에 두 번 나온다`);
        seenRule.add(row.rule);
        const ps = [row.p1, row.p2, row.p3].map(dash);
        ps.forEach((v, k) => {
            const kind = kinds[k];
            if (!kind) { if (v !== null) bad(`p${k + 1} '${v}' — ${row.rule} 는 이 칸을 안 받는다(-)`); return; }
            if (kind === 'sec' && !(typeof v === 'number' && v > 0)) bad(`p${k + 1} '${v}' — 초는 0 보다 크다`);
            if (kind === 'frac' && !(typeof v === 'number' && v > 0 && v <= 1)) bad(`p${k + 1} '${v}' — 몫은 0 초과 1 이하`);
        });
        // 옵션 줄은 그 카드 죄종의 풀에서 서로 다른 행으로 뽑는다 — 풀이 줄 수보다 작으면 장착이 못 선다
        if (poolBySin[row.sin].length < lineCount) bad(`죄종 ${row.sin} 의 옵션 풀 ${poolBySin[row.sin].length} < 줄 수 ${lineCount} (tactic_option.csv)`);
        const card = { id, slot: row.slot, sin: row.sin, rule: row.rule, p1: ps[0], p2: ps[1], p3: ps[2] };
        cards.push(card);
        cardById[id] = card;
    }
    for (const s of SLOTS) if (!cards.some(c => c.slot === s)) throw new Error(`tactic: 갈래 ${s} 의 카드가 없다 (tactic_card.csv)`);
    const copyCard = c => (c ? { ...c } : null);

    /* ── 줄 ── */

    /** 줄 하나를 편다 — 모르는 옵션 · 등급 · m 이 유한한 수가 아니면 null (CSV 가 바뀐 세이브) */
    function lineOf(ref) {
        const f = ref && famById[ref.id];
        if (!f || !GRADES.includes(ref.grade) || !Number.isFinite(ref.m)) return null;
        return { id: f.id, grade: ref.grade, m: ref.m, sin: f.sin, effect: f.effect, stat: f.stat, unit: f.unit, multShare: f.multShare, leaderBonus: f.leaderBonus, value: valueAt(f, ref.m) };
    }
    /** 그 카드에 설 수 있는 줄인가 — 옵션이 그 죄종 풀 · 등급이 천장 이하 · m 이 그 등급 범위 안 (받은 팀 코드 검사 · INTERFACE §2-17) */
    function lineFits(ref, sin, ceiling) {
        const f = ref && famById[ref.id];
        const cap = GRADES.indexOf(ceiling), g = GRADES.indexOf(ref?.grade);
        if (!f || f.sin !== sin || cap < 0 || g < 0 || g > cap || !Number.isFinite(ref.m)) return false;
        const [lo, hi] = lineRange[ref.grade];
        return ref.m >= lo - 1e-9 && ref.m <= hi + 1e-9;
    }

    /* ── 판정 ── */

    /**
     * 파티 문맥 — 버프가 세는 숫자를 **한 번에** 뽑아 둔다.
     * members = [{sin, cls, ldr, gear}] **편성 순서대로**(첫 칸이 리더) · `gear` = 그 영웅이 낀 장비의 죄종 목록(이름의 첫째 · 둘째 둘 다 · 유니크는 없다).
     * `score` = **죄종 점수** — 그 죄종 영웅 하나마다 `heroScore` + 장비 죄종 수(`gear`) · 버프 몫이 읽는다 (§6-3 · R563)
     */
    function contextOf(members) {
        const gear = Object.fromEntries(SINS.map(s => [s, 0]));
        const score = Object.fromEntries(SINS.map(s => [s, 0]));
        const ctx = { size: members.length, members, sins: [], leader: members[0] ?? null, gear, score };
        for (const m of members) {
            ctx.sins.push(m.sin);
            if (m.sin in score) score[m.sin] += heroScore;
            for (const s of m.gear ?? []) if (s in gear) gear[s] += 1;
        }
        for (const s of SINS) score[s] += gear[s];
        return ctx;
    }

    /**
     * 줄 하나를 잰다 — `base` = 버프 전 값 · `leadPart` · `gearPart` = 버프 몫 둘 · `value` = **적용 값** = `base × (1 + leadPart + gearPart)` (§6-2 · §6-3) ·
     *   `bonus` = `value − base`. 줄 = `lineOf` 모양(옵션 종류 · 등급 · m · 죄종 · 능력치)
     */
    function measure(line, ctx) {
        const f = famById[line.id] ?? line;
        const base = Number.isFinite(line.m) ? valueAt(f, line.m) : line.value;
        const leadPart = (line.leaderBonus ?? 0) * (leadCurve(ctx.leader?.ldr) - 1);
        const gearPart = (ctx.score?.[line.sin] ?? 0) * gearPct;      // 죄종 점수 몫 — 영웅 죄종 + 장비 죄종 (R563)
        const value = round(line.stat, base * (1 + leadPart + gearPart));
        return { base, leadPart: round4(leadPart), gearPart: round4(gearPart), value, bonus: round(line.stat, value - base) };
    }

    /**
     * 줄들 → 접사·마스터리와 **같은 채널**의 가산치 (§2-5). 같은 능력치는 더한다 — 같은 옵션이 두 카드에 뜨면 둘 다.
     * 피해 감소만 따로 낸다 — 원천별 곱이라 합치면 안 된다 (battle_design §9-3). **줄 하나 = 원천 하나**.
     * 줄의 `value` 를 그대로 더한다 — 버프를 탄 값을 넘기는 것은 부르는 쪽(`state` 는 `measure` 의 `value` 를 얹어 넘긴다)
     */
    function bonusOf(lines) {
        const flat = {}, dr = [];
        for (const o of lines) {
            if (!o) continue;
            if (o.stat === 'damage_reduction') dr.push(o.value);
            else flat[o.stat] = (flat[o.stat] ?? 0) + o.value;
        }
        return { flat, dr };
    }

    /* ── 굴림 (INTERFACE §5-2 — 순서가 계약이다) ── */

    /** 가중 추첨 — `GRADES` 순서로 앞 `n` 등급만 훑는다 · 1회. 부동소수 끝자락은 마지막 후보 */
    function pickGrade(rng, weights, n = GRADES.length) {
        const list = GRADES.slice(0, n);
        const sum = list.reduce((a, g) => a + weights[g], 0);
        let r = rng() * sum;
        for (const g of list) {
            r -= weights[g];
            if (r < 0) return g;
        }
        return list[list.length - 1];
    }
    /** 그 등급 범위의 m — 1회 · 소수 넷째 자리 */
    const rollM = (rng, grade) => { const [lo, hi] = lineRange[grade]; return round4(lo + (hi - lo) * rng()); };
    const cardOrThrow = (cardId, grade) => {
        const c = cardById[cardId];
        if (!c) throw new Error(`tactic: 모르는 카드 '${cardId}'`);
        if (!GRADES.includes(grade)) throw new Error(`tactic: 모르는 카드 등급 '${grade}'`);
        return c;
    };

    /**
     * **장착 굴림** — 줄마다(줄 자리 순) ① 옵션(그 카드 죄종 풀 균등 · **앞 줄과 같은 행 제외**) ② 등급(`lineWeights` 가중 · **카드 등급 이하만** 다시 정규화)
     *   ③ m(그 등급 범위 균등) = 줄마다 3회 (§5-1 · INTERFACE §5-2)
     */
    function equipLines(rng, cardId, grade) {
        const c = cardOrThrow(cardId, grade);
        const cap = GRADES.indexOf(grade) + 1;
        const out = [];
        for (let i = 0; i < lineCount; i++) {
            const pool = poolBySin[c.sin].filter(id => !out.some(l => l.id === id));
            const id = pool[Math.floor(rng() * pool.length)];
            const g = pickGrade(rng, lineWeights, cap);
            out.push({ id, grade: g, m: rollM(rng, g) });
        }
        return out;
    }

    /**
     * **한 단계 걷기** (D4 · §5-3) — 1회. 가운데 등급: 그대로 `stay` · 오름 `(1 − stay) × up` · 내림 `(1 − stay) × (1 − up)`.
     *   **바닥(`common`)은 내림 몫이 · 천장(카드 등급)은 오름 몫이 그대로에 붙는다** — 판정 = `r < 내림 몫` → 내림 · `r ≥ 1 − 오름 몫` → 오름 · 나머지 그대로
     */
    function walkGrade(rng, grade, ceiling) {
        const cap = GRADES.indexOf(ceiling);
        if (cap < 0) throw new Error(`tactic: 모르는 천장 등급 '${ceiling}'`);
        let i = GRADES.indexOf(grade);
        if (i < 0) throw new Error(`tactic: 모르는 줄 등급 '${grade}'`);
        const down = i <= 0 ? 0 : (1 - walk.stay) * (1 - walk.up);
        const up = i >= cap ? 0 : (1 - walk.stay) * walk.up;
        const r = rng();
        if (r < down) i -= 1;
        else if (r >= 1 - up) i += 1;
        return GRADES[i];
    }

    /**
     * **인챈트 굴림** — 줄 `i` 하나: ① 옵션(그 죄종 풀 균등 · **다른 줄 제외 · 지금 것은 허용**) ② 등급 걷기(`walkGrade` · 천장 = 카드 등급) ③ m = 3회 (§5-3 · INTERFACE §5-2)
     */
    function enchantLine(rng, cardId, grade, lines, i) {
        const c = cardOrThrow(cardId, grade);
        const cur = lines?.[i];
        if (!cur) throw new Error(`tactic: 없는 줄 자리 ${i}`);
        const others = lines.filter((_, k) => k !== i).map(l => l?.id);
        const pool = poolBySin[c.sin].filter(id => !others.includes(id));
        const id = pool[Math.floor(rng() * pool.length)];
        const g = walkGrade(rng, cur.grade, grade);
        return { id, grade: g, m: rollM(rng, g) };
    }

    /**
     * **드랍 굴림** — 정예(`elite`) · 스테이지보스(`boss`) 한 마리: ① 떨어지나(`r < dropPct[kind]` — 아니면 1회로 끝) ② 카드(표 전체 균등 · 행 순)
     *   ③ 카드 등급(`cardWeights` 가중 · `GRADES` 순) (§3-2 · INTERFACE §5-2) — 전리품 rng 와 다른 스트림을 부르는 쪽이 준다
     */
    function dropRoll(rng, kind) {
        if (!(kind in dropPct)) throw new Error(`tactic: 드랍 종류 '${kind}' — elite · boss`);
        if (!(rng() < dropPct[kind])) return null;
        const c = cards[Math.floor(rng() * cards.length)];
        return { card: c.id, grade: pickGrade(rng, cardWeights) };
    }

    /* ── 가방 키 · 규칙 ── */

    /** 가방 키(`state.tacticBag`) — `'card|grade'` · 모르는 카드 · 등급이면 null */
    const keyOf = (card, grade) => (cardById[card] && GRADES.includes(grade) ? `${card}|${grade}` : null);
    const parseKey = key => {
        const parts = typeof key === 'string' ? key.split('|') : [];
        return parts.length === 2 && keyOf(parts[0], parts[1]) ? { card: parts[0], grade: parts[1] } : null;
    };
    /** 전투 계약 `Rule[]` (INTERFACE §2-6 · PLAN §6) — 준 순서대로 · 모르는 카드는 뺀다 · 수치 `-` 는 null */
    const rulesOf = cardIds => (cardIds ?? []).map(id => cardById[id]).filter(Boolean)
        .map(c => ({ card: c.id, rule: c.rule, p1: c.p1, p2: c.p2, p3: c.p3 }));

    return {
        GRADES: GRADES.slice(), SLOTS: SLOTS.slice(), RULES: RULES.slice(),
        // 규칙마다 받는 수치 칸의 종류(`sec` · `frac`) — battle.js `TACTIC_RULES` 와 같은 목록이어야 한다(단정이 대조한다 · 모듈끼리 import 하지 않는다)
        RULE_PARAMS: Object.fromEntries(RULES.map(r => [r, RULE_PARAMS[r].slice()])),
        cards: cards.map(copyCard), cardById: id => copyCard(cardById[id]),
        cardsOf: slot => cards.filter(c => c.slot === slot).map(copyCard),
        starterOf: slot => cards.find(c => c.slot === slot)?.id ?? null,
        families: families.map(f => ({ ...f })), familyIds, sinList: SINS.slice(),
        poolOf: sin => (poolBySin[sin] ?? []).slice(),
        lineCount, rangeOf: g => (lineRange[g] ? lineRange[g].slice() : null),
        lineRange: Object.fromEntries(GRADES.map(g => [g, lineRange[g].slice()])),
        gearPct, heroScore, cardWeights: { ...cardWeights }, lineWeights: { ...lineWeights },
        enchantCost: { ...enchantCost }, walk: { ...walk }, dropPct: { ...dropPct },
        valueOf: (id, m) => (famById[id] && Number.isFinite(m) ? valueAt(famById[id], m) : null),
        lineOf, lineFits, keyOf, parseKey, contextOf, measure, leadCurve, bonusOf,
        equipLines, enchantLine, walkGrade, dropRoll,
        shardsOf: grade => shards[grade] ?? 0,
        rulesOf,
    };
}
