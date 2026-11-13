/**
 * 의뢰 — **게시판 카드 한 장을 굴리고, 사건 하나(처치 · 분해 · 재료 · 강화 · 제작)가 그 카드를 채우는지 답한다.** 세이브를 모른다
 *   [신설 2026-09-24 · R153 · **개정 2026-11-13 · R457** — 카드마다 죄종 · 장마다 그 장 죄종이 열린다 · 새 미션 · 카드 등급 = 대상의 좁기 ·
 *    base_expedition_design §1-3 「게시판 · 굴림 · 수령」 · 「죄종 = 미션」 · 「카드 등급」 · INTERFACE §2-16].
 *
 * 순수 모듈 — DOM · 저장소 · 시계 · Math.random 접근 없음. **상태도 없다** — 난수는 `rng` 인자로만 받는다.
 * 받기 · 세기 · 수령 · 빈 자리 채우기는 `state.js`(`commissionState` · `commissionTake` …)가 한다 — 여기는 「어떤 카드가 서나 · 무엇이 그것을 채우나」까지다.
 *
 * **무엇이 서는가는 표가 정한다** — 틀(`commission.csv` — 죄종 × 등급 × 종류 · 대상 어휘 · 기본 수 · 기본 골드 · 가중치) ·
 *   종류(`commission_kind.csv` — 토벌 · 현상금 · 분해 · 재료 획득 · 강화 · 제작 · 그 종류가 어느 사건을 세나) · 카드 등급(`commission_grade.csv` — 일반 · 매직 · 레어 · 드물기 · 골드 배수) ·
 *   종족(`monster_type.csv`) · 명성 레벨(`commission_fame.csv` — 2026-10-29 · R375) · 장(`chapter.csv:sin` — 장마다 그 장 죄종이 열린다 · R457).
 *   **코드가 아는 것은 대상 어휘(`AXES`)뿐이다** — 무엇을 세는지는 코드라서다(construction 의 `TARGETS` 와 같은 자리).
 *
 * 확정 규칙:
 *   · 의뢰는 받아 두는 목표다 — 전장을 안 연다 · 파티가 없다 (base_expedition_design §1-3 · 09-07)
 *   · 한 장 = **죄종 · 등급 · 틀 · 대상**을 굴린다 [R457] · 죄종은 **열린 죄종**(들어갈 수 있는 장의 죄종 — 2026-11-13 사용자 「노말에서 챕터별로 1개씩 열리고 오만이랑 색욕은 잠궈놓는거」) 중에서 ·
 *     대상은 **지금 들어갈 수 있는 곳에서만**(부르는 쪽이 `ctx` 로 모은다)
 *   · **카드 등급 = 대상을 얼마나 좁히나** [2026-11-13 사용자 「난이도에 따라 일반/매직/레어를 내부적으로 구분해서 돈을 더많이주던지」 · 「1배2배3배로가자」] —
 *     등급은 골드 배수와 드물기만 든다 · 목표 수는 틀이 든다(확률로 좁히는 틀은 좁힌 몫만큼 작다) ·
 *     좁힌 대상이 넓은 대상과 같으면(풀이 하나) 그 틀을 안 굴린다 · 목표가 1 아래로 떨어지는 틀도 안 굴린다 [사용자 「알맞게 수정해」]
 *   · **명성 레벨** [2026-10-29 · R375] — 명성 경험치(= 누적 수령 수)가 레벨을 정하고 레벨이 **새로 굴리는 카드**의 목표 수 · 골드에 배수를 붙인다 · 골드가 더 가파르다
 * ⚠ 값은 전부 제안값 — 각 CSV 의 description
 *
 * @param {object} data
 *   templates / kinds / grades / races / fame — 표 다섯의 파싱 행
 *   monsters — byId(monster.csv) · 고정 대상 검증 · 개체 카드의 보상 챕터 · 종족 표가 모든 `monster_type` 을 덮는지 검증
 *   chapters — byId(chapter.csv `{id, sin}`) · 장마다 열리는 죄종 · 죄종 순서 (R457)
 *   labMaterials / materialSynth — `[{id}]` · `[{id, from}]` · 재료 갈래(위 단계를 뿌리로 묶는다 · R457)
 *   balance — `commission_gold_chapter_mult`
 */

/* ── 어휘 — 무엇을 세는지가 코드라 여기 있다 (INTERFACE §5-3) ── */
const KILL_GRADES = { elite: ['elite'], boss: ['stage_boss', 'chapter_boss'] };   // 옛 카드의 `grade` 어휘
const RARITIES = ['magic', 'rare'];                                                // 옛 카드의 `rarity` 어휘
/** 부위 갈래 — 방어구 = 무기 · 장신구가 아닌 부위 (R457) */
const PARTS = { weapon: ['weapon'], armor: ['helmet', 'armor', 'gloves', 'boots'], accessory: ['ring', 'amulet'] };
/** 「이상」의 차례 — 일반 아래는 없다 (R457) */
const RARITY_ORDER = ['normal', 'magic', 'rare', 'craft', 'epic', 'legendary', 'unique', 'set'];
/** 종류가 거는 처치 등급 — 현상금은 정예만 센다 (R457) */
const KIND_GRADE = { elite: ['elite'] };
/** 종류가 얹히는 사건 — `yield` 는 옛 수집 카드만 */
const RIDES = ['battle', 'salvage', 'material', 'upgrade', 'craft', 'yield'];

/**
 * 대상 어휘 — `on` = 이 어휘를 받는 사건 · `pool(ctx)` = `ref: '-'` 일 때 굴릴 후보(**순서가 계약이다** — INTERFACE §5-2 · 없으면 고정 대상만) ·
 *   `narrow` = 좁히는 어휘 — 풀이 하나뿐이면 넓은 대상과 같아 안 굴린다(R457) · `legacy` = 옛 카드만(틀은 안 쓴다) · `hit(ref, ev)` = 그 사건이 채우나
 */
export const AXES = {
    any: { on: ['battle', 'salvage', 'material', 'upgrade', 'craft'], pool: null, hit: () => true },
    chapter: { on: ['battle'], pool: ctx => ctx.chapters, narrow: true, hit: (ref, ev) => ev.chapter === ref },
    race: { on: ['battle'], pool: ctx => ctx.races, narrow: true, hit: (ref, ev) => ev.race === ref },
    place: { on: ['battle'], pool: ctx => ctx.places, narrow: true, hit: (ref, ev) => ev.place === ref },
    part: { on: ['salvage'], pool: null, hit: (ref, it) => (PARTS[ref] ?? []).includes(it.slot) },
    rarity_min: { on: ['salvage'], pool: null, hit: (ref, it) => { const i = RARITY_ORDER.indexOf(it.rarity); return i >= 0 && i >= RARITY_ORDER.indexOf(ref); } },
    mat: { on: ['material'], pool: null, hit: (ref, ev) => ev.family === ref },
    up_min: { on: ['upgrade'], pool: null, hit: (ref, ev) => ev.to >= ref },
    // 옛 카드만 — R457 이전에 받은 카드가 진행도째 이어 센다
    monster: { on: ['battle'], pool: ctx => ctx.monsters, legacy: true, hit: (ref, ev) => ev.monster === ref },
    grade: { on: ['battle'], pool: () => Object.keys(KILL_GRADES), legacy: true, hit: (ref, ev) => (KILL_GRADES[ref] ?? []).includes(ev.grade) },
    rarity: { on: ['yield'], pool: () => RARITIES, legacy: true, hit: (ref, it) => it.rarity === ref },
};

export function createCommission(data) {
    const bad = why => { throw new Error(`commission: ${why}`); };
    const B = data.balance ?? {};
    const monsters = data.monsters ?? {};
    const posInt = v => Number.isInteger(v) && v > 0;
    const weightOk = v => typeof v === 'number' && v >= 0;

    const chapterMult = B.commission_gold_chapter_mult;
    if (!(typeof chapterMult === 'number' && chapterMult > 0)) bad(`commission_gold_chapter_mult ${chapterMult}`);

    /* ── 장 → 죄종 — 장 순서가 죄종 순서다(굴림의 죄종 차례 · R457) ── */
    const chapterRows = Object.values(data.chapters ?? {}).slice().sort((a, b) => a.id - b.id);
    const chapterSin = new Map();
    const sins = [];
    for (const c of chapterRows) {
        if (!c.sin) bad(`장 ${c.id} — 죄종이 비었다`);
        chapterSin.set(c.id, c.sin);
        if (!sins.some(s => s.id === c.sin)) sins.push({ id: c.sin, chapter: c.id });
    }
    const sinSeen = new Set(sins.map(s => s.id));
    /** 들어갈 수 있는 장들의 죄종 — 장 순서 · 중복 없음 · rng 0 (R457) */
    const openSins = chapters => {
        const open = new Set((chapters ?? []).map(n => chapterSin.get(n)).filter(Boolean));
        return sins.map(s => s.id).filter(id => open.has(id));
    };

    /* ── 재료 갈래 — 위 단계는 `from` 을 따라 뿌리로 · 연구소 재료가 아닌 뿌리(가루)는 null (R457) ── */
    const labIds = new Set((data.labMaterials ?? []).map(m => m.id));
    const synthFrom = new Map((data.materialSynth ?? []).map(m => [m.id, m.from]));
    const familyOf = id => {
        let cur = id;
        for (let guard = 0; guard <= synthFrom.size; guard++) {
            if (labIds.has(cur)) return cur;
            if (!synthFrom.has(cur)) return null;
            cur = synthFrom.get(cur);
        }
        return null;
    };

    /* ── 종족 — 행 순서가 종족 풀의 순서다 ── */
    const raceSeen = new Set();
    const races = (data.races ?? []).map(r => {
        const id = r.type_id;
        if (!id || raceSeen.has(id)) bad(`type_id '${id}'`);
        raceSeen.add(id);
        if (!r.name_kr || !r.name_en) bad(`종족 ${id} — 이름이 비었다`);
        return { id, name: { ko: r.name_kr, en: r.name_en } };
    });
    // 몬스터 표의 종족이 전부 이름을 가져야 한다 — 없으면 그 종족 카드가 이름 없이 선다
    for (const m of Object.values(monsters)) if (!raceSeen.has(m.monster_type)) bad(`monster.csv ${m.monster_idx} 의 종족 '${m.monster_type}' 가 monster_type.csv 에 없다`);
    const chapterSeen = new Set(Object.values(monsters).map(m => m.chapter));

    /* ── 종류 ── */
    const kinds = new Map();
    for (const r of data.kinds ?? []) {
        if (!r.kind_id || kinds.has(r.kind_id)) bad(`kind_id '${r.kind_id}'`);
        if (!RIDES.includes(r.rides_on)) bad(`${r.kind_id} — rides_on '${r.rides_on}'`);
        kinds.set(r.kind_id, r.rides_on);
    }

    /* ── 카드 등급 — 행 순서가 굴림 순서다 · 대상의 좁기 · 골드 배수와 드물기만 든다 (R457) ── */
    const gradeSeen = new Set();
    const grades = (data.grades ?? []).map(r => {
        const id = r.grade_id;
        if (!id || gradeSeen.has(id)) bad(`grade_id '${id}'`);
        gradeSeen.add(id);
        if (!weightOk(r.weight)) bad(`등급 ${id} — weight ${r.weight}`);
        if (!(typeof r.gold_mult === 'number' && r.gold_mult > 0)) bad(`등급 ${id} — gold_mult ${r.gold_mult}`);
        if (!r.name_kr || !r.name_en) bad(`등급 ${id} — 이름이 비었다`);
        return { id, weight: r.weight, goldMult: r.gold_mult, name: { ko: r.name_kr, en: r.name_en } };
    });
    if (!(grades.reduce((a, g) => a + g.weight, 0) > 0)) bad('등급 가중치 합이 0 이다');
    const gradeById = new Map(grades.map(g => [g.id, g]));

    /* ── 틀 — 행 순서가 굴림 순서다 ── */
    // 고정 대상이 그 어휘의 값인가 — 풀을 굴리는 어휘(장 · 종족 · 장소)는 틀이 `-` 만 쓴다
    const refOk = {
        any: ref => ref === null,
        chapter: ref => ref === null || chapterSeen.has(ref),
        race: ref => ref === null || raceSeen.has(ref),
        place: ref => ref === null,
        part: ref => ref in PARTS,
        rarity_min: ref => RARITY_ORDER.includes(ref),
        mat: ref => labIds.has(ref),
        up_min: ref => posInt(ref),
    };
    const tplSeen = new Set();
    const templates = (data.templates ?? []).map(r => {
        const id = r.commission_id;
        if (!id || tplSeen.has(id)) bad(`commission_id '${id}'`);
        tplSeen.add(id);
        if (!sinSeen.has(r.sin)) bad(`${id} — 장 표에 없는 죄종 '${r.sin}'`);
        if (!gradeById.has(r.grade_id)) bad(`${id} — 없는 등급 '${r.grade_id}'`);
        if (!kinds.has(r.kind_id)) bad(`${id} — 없는 종류 '${r.kind_id}'`);
        const ax = AXES[r.axis];
        if (!ax || ax.legacy) bad(`${id} — 틀이 쓰는 어휘가 아니다 '${r.axis}'`);
        if (!ax.on.includes(kinds.get(r.kind_id))) bad(`${id} — ${r.kind_id} 는 ${kinds.get(r.kind_id)} 에 얹히는데 ${r.axis} 는 ${ax.on.join('/')} 어휘다`);
        const ref = r.ref === '-' ? null : r.ref;
        if (!refOk[r.axis](ref)) bad(`${id} — ${r.axis} 에 없는 대상 '${r.ref}'`);
        if (!(typeof r.need === 'number' && r.need > 0)) bad(`${id} — need ${r.need}`);
        if (!posInt(r.reward_gold)) bad(`${id} — reward_gold ${r.reward_gold}`);
        if (!weightOk(r.weight)) bad(`${id} — weight ${r.weight}`);
        return { id, sin: r.sin, grade: r.grade_id, kind: r.kind_id, axis: r.axis, ref, need: r.need, gold: r.reward_gold, weight: r.weight };
    });
    if (!(templates.reduce((a, t) => a + t.weight, 0) > 0)) bad('틀 가중치 합이 0 이다');

    /* ── 명성 레벨 — 행 순서 = 레벨 순서 · 레벨 1 = 틀의 값 (R375) ── */
    const fame = (data.fame ?? []).map((r, i) => {
        const lv = i + 1;
        if (r.level !== lv) bad(`명성 ${i + 1}번째 행 — level ${r.level} (1 부터 1씩)`);
        if (!(Number.isInteger(r.claims_total) && r.claims_total >= 0)) bad(`명성 Lv${lv} — claims_total ${r.claims_total}`);
        if (!(typeof r.need_mult === 'number' && r.need_mult > 0)) bad(`명성 Lv${lv} — need_mult ${r.need_mult}`);
        if (!(typeof r.gold_mult === 'number' && r.gold_mult > 0)) bad(`명성 Lv${lv} — gold_mult ${r.gold_mult}`);
        return { level: lv, total: r.claims_total, needMult: r.need_mult, goldMult: r.gold_mult };
    });
    if (!fame.length) bad('명성 표가 비었다');
    if (fame[0].total !== 0 || fame[0].needMult !== 1 || fame[0].goldMult !== 1) bad('명성 Lv1 은 문턱 0 · 배수 1 이어야 한다 — 틀의 값이 레벨 1 의 값이다');
    for (let i = 1; i < fame.length; i++) {
        const a = fame[i - 1], b = fame[i];
        if (!(b.total > a.total)) bad(`명성 Lv${b.level} — 문턱 ${b.total} 이 Lv${a.level} 의 ${a.total} 보다 크지 않다`);
        if (b.needMult < a.needMult) bad(`명성 Lv${b.level} — 목표 배수가 준다`);
        if (!(b.goldMult / b.needMult > a.goldMult / a.needMult)) bad(`명성 Lv${b.level} — 목표당 골드가 Lv${a.level} 보다 크지 않다(골드가 목표보다 가파르다)`);
    }

    /** 명성 경험치 → 레벨 한 벌 — 닿은 가장 높은 레벨 · 0 이상 정수가 아니면 0 으로 읽는다 · rng 0 */
    function fameOf(xp) {
        const x = Number.isInteger(xp) && xp > 0 ? xp : 0;
        let f = fame[0];
        for (const r of fame) if (x >= r.total) f = r;
        const nx = fame[f.level] ?? null;
        return { level: f.level, xp: x, total: f.total, next: nx ? nx.total : null, needMult: f.needMult, goldMult: f.goldMult, max: !nx };
    }

    /* ── 굴림 ── */

    /** 가중 추첨 1회 — **목록 순서로 훑는다**(INTERFACE §5-2) */
    const pickWeighted = (rng, list) => {
        const total = list.reduce((a, x) => a + x.weight, 0);
        let r = rng() * total;
        for (const x of list) { r -= x.weight; if (r < 0) return x; }
        return list[list.length - 1];
    };

    /** 장소 키 `"장-장소"` 의 장 — 보상 챕터 */
    const placeChapter = key => Number(String(key).split('-')[0]);
    /** 보상 챕터 — 가야 할 곳이 보상을 정한다: 장 · 장소 = 그 장 · 개체 = 그 몬스터의 장 · 나머지 = 진행 챕터 */
    const rewardChapter = (axis, ref, ctx) => (axis === 'chapter' ? ref
        : axis === 'place' ? placeChapter(ref)
        : axis === 'monster' ? monsters[ref]?.chapter ?? ctx.chapter
        : ctx.chapter);

    /**
     * 카드 한 장 — **언제나 4회**: 죄종 1 → 등급 1 → 틀 1 → 대상 1(고정이어도 소비하고 버린다) · 굴릴 틀이 없으면 0회 `null` (R457).
     * `ctx = {chapters, races, places, monsters, chapter, fame}` — 지금 들어갈 수 있는 것만 · 순서가 계약이다(INTERFACE §2-16) ·
     *   `fame` = 명성 경험치 — 레벨의 배수가 목표 · 골드에 곱해진다(굴림 수는 안 바뀐다 · R375)
     */
    function roll(rng, ctx) {
        const f = fameOf(ctx.fame);
        const open = new Set(openSins(ctx.chapters));
        /** 그 틀이 지금 굴릴 수 있나 — 열린 죄종 · 가중치 · 목표가 1 이상 · 풀(굴리면 비지 않았나 · 좁히면 둘 이상 · 고정이면 그 값이 드나) */
        const usable = t => {
            if (!open.has(t.sin) || !(t.weight > 0) || !(gradeById.get(t.grade).weight > 0)) return false;
            if (t.need * f.needMult < 1) return false;
            const ax = AXES[t.axis];
            if (!ax.pool) return true;
            const pool = ax.pool(ctx) ?? [];
            if (t.ref !== null) return pool.includes(t.ref);
            return ax.narrow ? pool.length > 1 : pool.length > 0;
        };
        const live = templates.filter(usable);
        if (!live.length) return null;
        const sinList = sins.map(s => s.id).filter(id => live.some(t => t.sin === id));
        const sin = sinList[Math.floor(rng() * sinList.length)];
        const g = pickWeighted(rng, grades.filter(x => live.some(t => t.sin === sin && t.grade === x.id)));
        const t = pickWeighted(rng, live.filter(x => x.sin === sin && x.grade === g.id));
        const pool = AXES[t.axis].pool ? AXES[t.axis].pool(ctx) : [t.ref];
        const picked = pool[Math.floor(rng() * pool.length)];
        const ref = t.ref ?? picked;
        const ch = rewardChapter(t.axis, ref, ctx) ?? 1;
        return {
            sin, grade: g.id, tpl: t.id, kind: t.kind, axis: t.axis, ref,
            need: Math.round(t.need * f.needMult),
            gold: Math.round(t.gold * g.goldMult * f.goldMult * chapterMult ** (ch - 1)),
        };
    }

    /* ── 대조 ── */

    /**
     * 사건 하나가 이 카드를 채우나 — 카드 종류가 `on` 사건에 얹히고 · 종류가 거는 처치 등급을 지나고 · 어휘가 받는가 · rng 0 (R457).
     *   `on` = `battle`(`ev = {chapter, place, monster, race, grade}`) · `salvage`(아이템) · `material`(`{family}`) · `upgrade`(`{to}`) · `craft`(아이템) · `yield`(옛 수집 — 아이템)
     */
    function match(card, on, ev) {
        const ax = AXES[card.axis];
        if (!ax || kinds.get(card.kind) !== on || !ax.on.includes(on)) return false;
        const gate = KIND_GRADE[card.kind];
        if (gate && !gate.includes(ev.grade)) return false;
        return ax.hit(card.ref, ev);
    }

    return { templates, grades, races, fame, sins, gradeById, fameOf, openSins, familyOf, roll, match };
}
