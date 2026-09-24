/**
 * 의뢰 — **게시판 카드 한 장을 굴리고, 처치 · 드롭 하나가 그 카드를 채우는지 답한다.** 세이브를 모른다
 *   [신설 2026-09-24 · R153 · base_expedition_design §1-3 「게시판 · 굴림 · 수령」 · INTERFACE §2-16].
 *
 * 순수 모듈 — DOM · 저장소 · 시계 · Math.random 접근 없음. **상태도 없다** — 난수는 `rng` 인자로만 받는다.
 * 받기 · 세기 · 수령 · 빈 자리 채우기는 `state.js`(`commissionState` · `commissionTake` …)가 한다 — 여기는 「어떤 카드가 서나 · 무엇이 그것을 채우나」까지다.
 *
 * **무엇이 서는가는 표 넷이 정한다** — 틀(`commission.csv` — 종류 × 대상 어휘 · 기본 수 · 기본 골드 · 가중치) ·
 *   종류(`commission_kind.csv` — 처치 · 수집) · 의뢰 등급(`commission_grade.csv` — 일반 · 매직 · 레어 · 카드 희귀도) ·
 *   종족(`monster_type.csv`). **코드가 아는 것은 대상 어휘(`AXES`)뿐이다** — 무엇을 세는지는 코드라서다(construction 의 `TARGETS` 와 같은 자리).
 *
 * 확정 규칙 [2026-09-24 사용자 — 「랜덤하게 모두가 나오도록」 · 「일반 · 매직 · 레어」 · 명성 보류]:
 *   · 의뢰는 받아 두는 목표다 — 전장을 안 연다 · 파티가 없다 (base_expedition_design §1-3 · 09-07)
 *   · 한 장 = **틀 · 등급 · 대상**을 굴린다 · 대상은 **지금 들어갈 수 있는 곳에서만**(부르는 쪽이 `ctx` 로 모은다)
 *   · 의뢰 등급은 카드 희귀도 — 윗 등급이 드물고 **목표당 골드가 좋다**(표가 그렇게 들고 있다)
 *   · 명성은 없다 — 보류 (카드에 명성 칸이 없다)
 * ⚠ 값은 전부 제안값 — 각 CSV 의 description
 *
 * @param {object} data
 *   templates / kinds / grades / races — 표 넷의 파싱 행
 *   monsters — byId(monster.csv) · 고정 대상 검증 · 개체 틀의 보상 챕터 · 종족 표가 모든 `monster_type` 을 덮는지 검증
 *   balance — `commission_gold_chapter_mult`
 */

/**
 * 대상 어휘 — `on` = 그 어휘를 받는 종류의 `rides_on`(`battle` = 처치가 센다 · `yield` = 드롭 · 산출이 채운다).
 *   `pool(ctx)` = `ref: '-'` 일 때 굴릴 후보 — **순서가 계약이다**(INTERFACE §5-2) · `hit(ref, ev)` = 그 처치 · 드롭이 채우나
 */
const KILL_GRADES = { elite: ['elite'], boss: ['stage_boss', 'chapter_boss'] };
const RARITIES = ['magic', 'rare'];
export const AXES = {
    chapter: { on: 'battle', pool: ctx => ctx.chapters, hit: (ref, ev) => ev.chapter === ref },
    race: { on: 'battle', pool: ctx => ctx.races, hit: (ref, ev) => ev.race === ref },
    monster: { on: 'battle', pool: ctx => ctx.monsters, hit: (ref, ev) => ev.monster === ref },
    grade: { on: 'battle', pool: () => Object.keys(KILL_GRADES), hit: (ref, ev) => KILL_GRADES[ref].includes(ev.grade) },
    rarity: { on: 'yield', pool: () => RARITIES, hit: (ref, it) => it.rarity === ref },
};

export function createCommission(data) {
    const bad = why => { throw new Error(`commission: ${why}`); };
    const B = data.balance ?? {};
    const monsters = data.monsters ?? {};
    const posInt = v => Number.isInteger(v) && v > 0;
    const weightOk = v => typeof v === 'number' && v >= 0;

    const chapterMult = B.commission_gold_chapter_mult;
    if (!(typeof chapterMult === 'number' && chapterMult > 0)) bad(`commission_gold_chapter_mult ${chapterMult}`);

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
        if (r.rides_on !== 'battle' && r.rides_on !== 'yield') bad(`${r.kind_id} — rides_on '${r.rides_on}'`);
        kinds.set(r.kind_id, r.rides_on);
    }

    /* ── 틀 — 행 순서가 굴림 순서다 ── */
    // 고정 대상이 그 어휘의 값인가 — 챕터 · 개체는 몬스터 표 · 종족은 종족 표 · 몬스터 등급 · 희귀도는 코드의 어휘
    const refOk = {
        chapter: ref => chapterSeen.has(ref),
        race: ref => raceSeen.has(ref),
        monster: ref => !!monsters[ref],
        grade: ref => ref in KILL_GRADES,
        rarity: ref => RARITIES.includes(ref),
    };
    const tplSeen = new Set();
    const templates = (data.templates ?? []).map(r => {
        const id = r.commission_id;
        if (!id || tplSeen.has(id)) bad(`commission_id '${id}'`);
        tplSeen.add(id);
        if (!kinds.has(r.kind_id)) bad(`${id} — 없는 종류 '${r.kind_id}'`);
        const ax = AXES[r.axis];
        if (!ax) bad(`${id} — 모르는 대상 어휘 '${r.axis}'`);
        if (ax.on !== kinds.get(r.kind_id)) bad(`${id} — ${r.kind_id} 는 ${kinds.get(r.kind_id)} 에 얹히는데 ${r.axis} 는 ${ax.on} 어휘다`);
        const ref = r.ref === '-' ? null : r.ref;
        if (ref !== null && !refOk[r.axis](ref)) bad(`${id} — ${r.axis} 에 없는 대상 '${r.ref}'`);
        if (!posInt(r.need)) bad(`${id} — need ${r.need}`);
        if (!posInt(r.reward_gold)) bad(`${id} — reward_gold ${r.reward_gold}`);
        if (!weightOk(r.weight)) bad(`${id} — weight ${r.weight}`);
        return { id, kind: r.kind_id, axis: r.axis, ref, need: r.need, gold: r.reward_gold, weight: r.weight };
    });
    if (!(templates.reduce((a, t) => a + t.weight, 0) > 0)) bad('틀 가중치 합이 0 이다');

    /* ── 의뢰 등급 — 행 순서가 굴림 순서다 ── */
    const gradeSeen = new Set();
    const grades = (data.grades ?? []).map(r => {
        const id = r.grade_id;
        if (!id || gradeSeen.has(id)) bad(`grade_id '${id}'`);
        gradeSeen.add(id);
        if (!weightOk(r.weight)) bad(`등급 ${id} — weight ${r.weight}`);
        if (!(typeof r.need_mult === 'number' && r.need_mult > 0)) bad(`등급 ${id} — need_mult ${r.need_mult}`);
        if (!(typeof r.gold_mult === 'number' && r.gold_mult > 0)) bad(`등급 ${id} — gold_mult ${r.gold_mult}`);
        if (!r.name_kr || !r.name_en) bad(`등급 ${id} — 이름이 비었다`);
        return { id, weight: r.weight, needMult: r.need_mult, goldMult: r.gold_mult, name: { ko: r.name_kr, en: r.name_en } };
    });
    if (!(grades.reduce((a, g) => a + g.weight, 0) > 0)) bad('등급 가중치 합이 0 이다');
    const gradeById = new Map(grades.map(g => [g.id, g]));

    /* ── 굴림 ── */

    /** 가중 추첨 1회 — **목록 순서로 훑는다**(INTERFACE §5-2) */
    const pickWeighted = (rng, list) => {
        const total = list.reduce((a, x) => a + x.weight, 0);
        let r = rng() * total;
        for (const x of list) { r -= x.weight; if (r < 0) return x; }
        return list[list.length - 1];
    };

    /** 그 틀이 지금 굴릴 수 있나 — 굴리는 대상이면 풀이 비지 않았나 · 고정이면 그 값이 풀에 드나 */
    const usable = (t, ctx) => {
        const pool = AXES[t.axis].pool(ctx) ?? [];
        return t.weight > 0 && (t.ref === null ? pool.length > 0 : pool.includes(t.ref));
    };

    /** 보상 챕터 — 가야 할 곳이 보상을 정한다: 지역 = 그 챕터 · 개체 = 그 몬스터의 챕터 · 나머지 = 진행 챕터 */
    const rewardChapter = (axis, ref, ctx) => (axis === 'chapter' ? ref : axis === 'monster' ? monsters[ref]?.chapter ?? ctx.chapter : ctx.chapter);

    /**
     * 카드 한 장 — **언제나 3회**: 틀 1 → 등급 1 → 대상 1(고정이어도 소비하고 버린다) · 굴릴 틀이 없으면 0회 `null`.
     * `ctx = {chapters, races, monsters, chapter}` — 지금 들어갈 수 있는 것만 · 순서가 계약이다(INTERFACE §2-16)
     */
    function roll(rng, ctx) {
        const open = templates.filter(t => usable(t, ctx));
        if (!open.length) return null;
        const t = pickWeighted(rng, open);
        const g = pickWeighted(rng, grades);
        const pool = AXES[t.axis].pool(ctx);
        const picked = pool[Math.floor(rng() * pool.length)];
        const ref = t.ref ?? picked;
        const ch = rewardChapter(t.axis, ref, ctx) ?? 1;
        return {
            tpl: t.id, kind: t.kind, axis: t.axis, ref,
            need: Math.max(1, Math.round(t.need * g.needMult)),
            grade: g.id,
            gold: Math.round(t.gold * g.goldMult * chapterMult ** (ch - 1)),
        };
    }

    /* ── 대조 ── */

    /** 처치 하나가 이 카드를 채우나 — `ev = {chapter, monster, race, grade}` */
    const matchKill = (card, ev) => AXES[card.axis]?.on === 'battle' && AXES[card.axis].hit(card.ref, ev);
    /** 들어온 드롭 하나가 이 카드를 채우나 */
    const matchDrop = (card, item) => AXES[card.axis]?.on === 'yield' && AXES[card.axis].hit(card.ref, item);

    return { templates, grades, races, gradeById, roll, matchKill, matchDrop };
}
