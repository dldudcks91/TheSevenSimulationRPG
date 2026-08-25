/**
 * 영웅 시스템 — 생성(반고정: 이름 + 메인 죄종 + 시작 특성) / XP 성장 / 전투 능력치 계산.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 난수는 전부 rng 인자로 주입받는다.
 * 데이터(밸런스 수치·이름 풀·직업 정의)는 생성자에서 주입받는다 (CLAUDE.md 개발 규칙).
 *
 * ⚠ 공식 표기: 피해 계산 공식은 기획 미확정이다 (battle_design.md 남은 항목).
 *   여기 있는 전투 능력치 산식은 **프로토타입 임시식**이고, 모든 계수는 balance.csv 의
 *   ⚠제안 키에서 온다 — 확정되면 이 파일이 아니라 CSV 를 고친다.
 */

/**
 * @param {object} data
 *   balance      — balance.csv 를 {key: value} 로 눕힌 것
 *   stats        — 기본 능력치 7종 정의 [{id}...] (순서 = 표시 순서)
 *   sins         — 죄종 id 목록
 *   classes      — 직업 정의 [{id, keyAttr, stage}...]
 *   namePool     — 레어 영웅 이름 풀 [{ko,en}...]
 *   traitPool    — 시작 특성 풀 [{ko,en}...] (효과 미작성 — 이름표만 굴린다)
 */
export function createHeroSystem(data) {
    const B = data.balance;
    const statIds = data.stats.map(s => s.id);
    const mainClasses = data.classes.filter(c => c.stage === 'main').map(c => c.id);
    const keyAttrOf = id => data.classes.find(c => c.id === id)?.keyAttr ?? null;

    /* ── 생성 ── */

    const drawDistinct = (rng, pool, n) => {
        const rest = pool.slice(), out = [];
        for (let i = 0; i < n && rest.length; i++)
            out.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
        return out;
    };

    /**
     * 기본 능력치 굴림 — **합은 고정, 모양만 굴린다** ([balance.csv:hero_attr_total]).
     * 축마다 독립 균등이면 합이 33↔86까지 벌어져 죽은 카드가 나온다 — 차이는 양이 아니라 모양.
     * 마지막에 직업 주력 축(keyAttr)이 최고치가 되도록 **자리만 바꾼다** (합·분포 불변).
     */
    function rollAttributes(rng, favor) {
        const lo = B.hero_attr_min, hi = B.hero_attr_max, total = B.hero_attr_total;
        const w = statIds.map(() => rng() ** 2 + 0.04);
        const sum = w.reduce((a, b) => a + b, 0);
        const free = total - lo * statIds.length;
        const v = w.map(x => Math.max(lo, Math.min(hi, lo + Math.round(free * x / sum))));

        let diff = total - v.reduce((a, b) => a + b, 0);
        for (let guard = 0; diff !== 0 && guard < 500; guard++) {
            const i = Math.floor(rng() * v.length);
            if (diff > 0 && v[i] < hi) { v[i]++; diff--; }
            else if (diff < 0 && v[i] > lo) { v[i]--; diff++; }
        }
        const fi = statIds.indexOf(favor);
        if (fi >= 0) {
            let top = 0;
            for (let i = 1; i < v.length; i++) if (v[i] > v[top]) top = i;
            if (top !== fi) { const x = v[fi]; v[fi] = v[top]; v[top] = x; }
        }
        return Object.fromEntries(statIds.map((id, i) => [id, v[i]]));
    }

    /**
     * 히든 상한선 — 개체별로 [현재값 ~ hero_attr_max] 에서 굴린다 (계승: 히든 성장률/상한선).
     * 레벨업 성장은 이 상한까지만 간다. 화면에는 절대 보여주지 않는다.
     */
    const rollCaps = (rng, stats) =>
        Object.fromEntries(statIds.map(id =>
            [id, stats[id] + Math.floor(rng() * (B.hero_attr_max - stats[id] + 1))]));

    /** 레어 영웅 1명 — 죄종·직업·특성을 겹침 없이 뽑는 건 rollStartParty 쪽의 일 */
    function rollHero(rng, { sin, cls, name, trait }) {
        const stats = rollAttributes(rng, keyAttrOf(cls));
        return {
            uid: null,               // uid 발급은 state 의 일 (카운터 소유자)
            name, tier: 'rare', sin, cls, trait,
            level: 1, xp: 0,
            stats, caps: rollCaps(rng, stats),
            equipped: {},            // 슬롯 초기화는 state 가 slots 정의로 채운다
            injuredUntil: null,
        };
    }

    /** 시작 파티 — 죄종·직업·이름·특성이 셋 사이에서 겹치지 않는다 (같은 카드 3장 방지) */
    function rollStartParty(rng, n) {
        const names = drawDistinct(rng, data.namePool, n);
        const sins = drawDistinct(rng, data.sins, n);
        const classes = drawDistinct(rng, mainClasses, n);
        const traits = drawDistinct(rng, data.traitPool, n);
        return names.map((name, i) =>
            rollHero(rng, { name, sin: sins[i], cls: classes[i], trait: traits[i] }));
    }

    /** 선술집 후보 — 시작 파티와 같은 굴림. 겹침 방지도 동일 */
    const rollCandidates = rollStartParty;

    /* ── 성장 ── */

    const xpNeeded = level => Math.round(B.hero_xp_base * Math.pow(level, B.hero_xp_exp));

    /**
     * XP 지급 → 레벨업 처리. gains = 이번 지급으로 오른 능력치 {attr: +n}.
     * 능력치는 레벨업마다 축별로 [balance.csv:attr_growth_chance_pct]% 확률로 +1,
     * 단 히든 상한(caps)까지만 — 계승(TheSevenSimulation)의 자동 성장 모델.
     */
    function grantXp(hero, amount, rng) {
        hero.xp += amount;
        const from = hero.level;
        const gains = {};
        while (hero.xp >= xpNeeded(hero.level)) {
            hero.xp -= xpNeeded(hero.level);
            hero.level += 1;
            for (const id of statIds) {
                if (hero.stats[id] < hero.caps[id] && rng() * 100 < B.attr_growth_chance_pct) {
                    hero.stats[id] += 1;
                    gains[id] = (gains[id] ?? 0) + 1;
                }
            }
        }
        return hero.level > from ? { uid: hero.uid, from, to: hero.level, gains } : null;
    }

    /* ── 전투 능력치 (임시식 — 계수는 전부 balance.csv ⚠제안 키) ── */

    const isMagicClass = cls => cls === 'mage' || cls === 'necromancer';
    const attrMult = v => 1 + v * B.attr_bonus_per_point / 100;

    /**
     * 기본 능력치 + 장비 + 도감 보너스 → 전투 능력치.
     * items = 착용 중 아이템 배열. codex = {atk_pct, hp_pct, dmg_pct} (없으면 0).
     *
     * v1 에서 실제로 전투에 걸리는 기본 능력치: 힘/지능(공격력), 민첩(행동 주기), 감각(회피).
     * 건강(타격 회복·상태이상 저항)·통솔(힐·파티 버프)은 해당 시스템 미구현으로 아직 밖 —
     * 축 자체는 combat_stat.csv 대로 유지하고 구현만 미룬다.
     */
    function computeCombat(hero, items, codex = {}) {
        const A = hero.stats;
        const flat = {};                       // 접사 합산 {stat: v}
        for (const it of items) {
            if (it.implicit) flat[it.implicit.stat] = (flat[it.implicit.stat] ?? 0) + it.implicit.v;
            for (const a of it.affixes ?? []) flat[a.stat] = (flat[a.stat] ?? 0) + a.v;
        }
        const f = id => flat[id] ?? 0;

        const weapon = items.find(it => it.slot === 'weapon');
        const magic = isMagicClass(hero.cls);
        const watk = weapon ? weapon.watk : B.unarmed_atk;
        const atk = Math.round(
            (watk + f('atk_flat'))
            * attrMult(magic ? A.int : A.str)
            * (1 + f('atk_pct') / 100)
            * (1 + (codex.atk_pct ?? 0) / 100));

        const hpMax = Math.round(
            (B.hero_hp_base + (hero.level - 1) * B.hero_hp_per_level + f('hp_flat'))
            * (1 + f('hp_pct') / 100)
            * (1 + (codex.hp_pct ?? 0) / 100));

        const period = Math.max(0.4,
            (weapon ? weapon.period : B.unarmed_period)
            / attrMult(A.agi)
            * (1 - f('aspd_pct') / 100));

        return {
            [magic ? 'atk_magic' : 'atk_physical']: atk,
            attack_type: magic ? 'magic' : 'physical',
            hp_max: hpMax,
            defense: f('def_flat'),
            magic_defense: f('mdef_flat'),
            // 회피 — 감각이 미는 축 (combat_stat.csv). 몬스터에는 명중 축이 없어
            // v1 은 "영웅이 피할 확률"로만 쓴다. 상한은 balance.evasion_cap_pct
            evasion: Math.round(f('evasion') + A.sen * B.attr_bonus_per_point),
            crit_rate: B.base_crit_pct + f('crit_rate'),
            crit_damage: B.base_crit_damage_pct + f('crit_damage'),
            life_steal: f('life_steal'),
            action_period: Number(period.toFixed(3)),
            dmg_bonus_pct: codex.dmg_pct ?? 0,
            gold_find: f('gold_find'),
            item_find: f('item_find'),
        };
    }

    return { rollAttributes, rollHero, rollStartParty, rollCandidates, xpNeeded, grantXp, computeCombat };
}
