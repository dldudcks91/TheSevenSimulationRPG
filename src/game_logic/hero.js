/**
 * 영웅 시스템 — 생성(반고정: 이름 + 메인 죄종 + 시작 특성) / XP 성장 / 전투 능력치 계산.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 난수는 전부 rng 인자로 주입받는다.
 * 데이터(밸런스 수치·이름 풀·직업 정의)는 생성자에서 주입받는다 (CLAUDE.md 개발 규칙).
 *
 * 전투 능력치 = ( 장비(베이스 + Implicit + 접사) + 스킬 ) × 기본 능력치 계수 (battle_design §8).
 *   **곱셈이라 장비가 0이면 능력치도 0을 곱한다** — "레벨 = 진입 자격 / 장비 = 세기"의 수치적 표현.
 *   ⚠ 계수 **함수의 형태**는 아직 미확정이다 (hero_design §4-1-1 — 분포부터 정해야 한다).
 *   현재 형태는 `1 + 능력치 × [balance.csv:attr_bonus_per_point] / 100` 프로토타입 임시식이고,
 *   모든 계수는 balance.csv 의 ⚠제안 키에서 온다 — 확정되면 이 파일이 아니라 CSV 를 고친다.
 *
 * `computeCombat` 은 Σ 상시 피해 %(`atk_pct_sum`)를 따로도 낸다 — 전투 중 스킬 버프가 **새 곱셈 층이 아니라
 *   같은 괄호에 덧셈**으로 들어가야 해서(battle_design §9-2) battle.js 가 그 괄호를 다시 쓸 수 있어야 한다.
 *
 * **마스터리(패시브 수치층)는 접사와 같은 채널에 더한다** (skill_design §3-1~§3-4 확정 2026-08-28).
 *   죄종 마스터리와 직업 마스터리는 **포인트 풀을 공유**하고(§1-4) 액티브를 주지 않는다 — 여기 들어오는 것은
 *   전부 수치 노드(T1·T2)뿐이다. 반응형(T3)은 전투 중 사건에 붙어 이 파일이 아니라 battle.js 의 몫이고
 *   값이 전부 미정이라 아직 없다. 노드 정의는 `mastery_node.csv`, 랭크당 값은 `balance.csv` 다.
 *   ⚠ **포인트 지급 곡선은 기획 미확정**(skill_design §7) — `mastery_point_per_level` 은 임시 형태다.
 *
 * 전투 계수가 실제로 걸리는 축은 셋뿐 — 힘(물리 공격력) · 지능(마법 공격력) · 민첩(행동 주기).
 *   건강(fhr)은 상태이상 미구현으로 휴면 · 통솔·매력은 계수 없음 · **운은 전투 계산 밖**이다
 *   (드랍률·골드 획득 계수 — hero_design §4-1 감각→운 개정 2026-08-26).
 */

import { createFormula } from './formula.js';

/** 원소 4종 — combat_stat.csv 의 res_* 와 monster.csv:attack_type 이 쓰는 같은 어휘 (battle_design §9-5) */
export const ELEMENTS = ['fire', 'cold', 'lightning', 'poison'];

/**
 * @param {object} data
 *   balance      — balance.csv 를 {key: value} 로 눕힌 것
 *   stats        — 기본 능력치 7종 정의 [{id}...] (순서 = 표시 순서)  ← hero_attribute.csv
 *   sins         — 죄종 id 목록
 *   classes      — 직업 정의 [{id, keyAttr, stage}...]
 *   weaponGroups — {id: {period, damageKind, ...}}  ← weapon_group.csv. 무기가 행동 주기·피해 종류를 정한다
 *   namePool     — 레어 영웅 이름 풀 [{ko,en}...]
 *   traitPool    — 시작 특성 풀 [{ko,en}...] (효과 미작성 — 이름표만 굴린다)
 *   masteryNodes — mastery_node.csv 파싱 행. 랭크당 값·상한·해금 레벨은 **키 이름만** 들고 balance 에서 읽는다
 */
export function createHeroSystem(data) {
    const B = data.balance;
    const F = createFormula(B);        // 성장 곡선(growthMult)을 시뮬과 같은 함수에서 읽는다
    const statIds = data.stats.map(s => s.id);
    const mainClasses = data.classes.filter(c => c.stage === 'main').map(c => c.id);
    const keyAttrOf = id => data.classes.find(c => c.id === id)?.keyAttr ?? null;

    /* ── 마스터리 노드 (skill_design §3) — 정의는 CSV · 값은 balance.csv · 랭크는 영웅이 든다 ── */

    const TREE_KINDS = ['sin', 'class'];
    const ANY = '*';                       // owner_id 가 `*` = 그 tree_kind 의 주인 전부 (T1 공통 3종)

    /** 로드 시 전수 검증 — 키가 balance 에 없으면 값이 undefined 로 조용히 새므로 즉시 던진다 */
    const masteryNodes = (data.masteryNodes ?? []).map(row => {
        const bad = why => { throw new Error(`mastery: ${row.node_id} — ${why}`); };
        const num = key => {
            if (typeof B[key] !== 'number') bad(`balance.csv 에 '${key}' 가 없다`);
            return B[key];
        };
        if (!row.node_id) bad('node_id 가 없다');
        if (!TREE_KINDS.includes(row.tree_kind)) bad(`tree_kind '${row.tree_kind}'`);
        if (row.tree_kind === 'sin' && row.owner_id !== ANY && !data.sins.includes(row.owner_id)) bad(`죄종 '${row.owner_id}'`);
        if (row.tree_kind === 'class' && row.owner_id !== ANY && !data.classes.some(c => c.id === row.owner_id)) bad(`직업 '${row.owner_id}'`);
        if (!(row.tier >= 1)) bad(`tier ${row.tier}`);
        return {
            id: row.node_id, treeKind: row.tree_kind, ownerId: row.owner_id, tier: row.tier,
            stat: row.stat, value: num(row.value_key), maxRank: num(row.max_rank_key),
            // 해금 없음(`-`)은 레벨 1 — 「T1 은 1레벨부터」(§1-4)를 숫자 하나로 표현한 것
            unlockLevel: row.unlock_key === '-' ? 1 : num(row.unlock_key),
        };
    });
    const masteryById = Object.fromEntries(masteryNodes.map(n => [n.id, n]));

    /** 이 영웅의 트리에 걸린 노드 — 죄종·직업 둘 다. 죄종도 직업도 생성 시 확정이라 목록은 안 바뀐다 (§1-4) */
    const masteryNodesFor = hero => masteryNodes.filter(n =>
        (n.treeKind === 'sin' && (n.ownerId === ANY || n.ownerId === hero?.sin))
        || (n.treeKind === 'class' && (n.ownerId === ANY || n.ownerId === hero?.cls)));

    /**
     * 찍은 랭크 → 접사와 **같은 채널**의 가산치. 새 곱셈 층을 만들지 않는다 (battle_design §9-2 「괄호는 둘뿐」).
     * 피해 감소만 따로 낸다 — 원천별 곱이라 합치면 안 된다(§9-3). **노드 하나 = 원천 하나**.
     */
    function masteryBonus(hero) {
        const flat = {}, dr = [];
        const ranks = hero?.mastery ?? {};
        for (const n of masteryNodesFor(hero)) {
            const r = Math.min(ranks[n.id] ?? 0, n.maxRank);   // 상한 초과는 세이브 손상 — 계산에선 잘라 쓴다
            if (!(r > 0)) continue;
            if (n.stat === 'damage_reduction') dr.push(n.value * r);
            else flat[n.stat] = (flat[n.stat] ?? 0) + n.value * r;
        }
        return { flat, dr };
    }

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
            mastery: {}, masteryPoints: 0,   // 찍은 랭크 {nodeId: rank} · 남은 포인트 (죄종·직업 공유 풀)
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
        // 마스터리 포인트 — 레벨업 1회당 정액. 지급 곡선 자체가 기획 미확정이라 형태도 임시다 (skill_design §7)
        const points = (hero.level - from) * B.mastery_point_per_level;
        if (points > 0) hero.masteryPoints = (hero.masteryPoints ?? 0) + points;
        return hero.level > from ? { uid: hero.uid, from, to: hero.level, gains, points } : null;
    }

    /* ── 전투 능력치 (계수는 전부 balance.csv ⚠제안 키) ── */

    const attrMult = v => 1 + (v ?? 0) * B.attr_bonus_per_point / 100;

    /**
     * 기본 능력치 + 장비 + 도감 보너스 → 전투 능력치.
     * items = 착용 중 아이템 배열. codex = {atk_pct, hp_pct, dmg_pct} (없으면 0).
     *
     * · **무기가 밑수다** (battle_design §9-1, 08-26 개정) — 다른 슬롯의 고정 공격력을 밑수에 더하지 않는다.
     *   `atk_flat` 은 무기 슬롯 접사만 합산하고, `+피해 %` 는 그 밑수 전체를 곱한다.
     *   무기 개체 공격력(watk)에는 드롭 시 굴린 편차가 이미 박혀 있다 — 타격마다 굴리지 않는다.
     * · 공격 타입은 직업이 아니라 **무기군**이 정한다 (battle_design §2-1 — 스태프·완드 = magic). 맨손은 physical.
     *   사제가 마법사와 무기 풀을 공유하므로 사제의 파워 출처 = 마법 공격력 = 지능이 여기서 성립한다.
     * · **원소는 무기 개체가 든다** (§9-5) — 마법 무기군이면 그 무기의 element 가 공격 타입이다.
     * · **저항은 소재값이 아니라 직접 %다** (§9-5) — `res_all` + 원소별 접사. 상한은 전투에서 적용된다
     *   (formula.appliedResist) — 여기서는 원값을 그대로 내고, 상한을 뚫는 `res_max_bonus` 를 따로 낸다.
     * · **최대 HP 는 성장 축**이라 레벨이 기하 곡선을 탄다 (§9-0 · hero_design §5). 방어는 비율 축이라 타지 않는다.
     * · **피해 감소는 원천별 곱**이라 (§9-3) 접사를 각각 곱해 **실효 %** 한 숫자로 낸다 — 시트에도 그 숫자가 찍힌다.
     * · **운은 전투 계산 밖**이다 — 드랍률·골드 획득에만 계수로 곱한다 (hero_design §4-1).
     *   장비가 0이면 운도 0을 곱한다 (§8 곱셈 원칙).
     */
    function computeCombat(hero, items, codex = {}) {
        const A = hero.stats;
        const flat = {};                       // 접사 합산 {stat: v}
        const drList = [];                     // 피해 감소는 합치지 않고 원천별로 모은다 (§9-3)
        for (const it of items) {
            if (it.implicit) flat[it.implicit.stat] = (flat[it.implicit.stat] ?? 0) + it.implicit.v;
            for (const a of it.affixes ?? []) {
                flat[a.stat] = (flat[a.stat] ?? 0) + a.v;
                if (a.stat === 'damage_reduction') drList.push(a.v);
            }
        }
        // 마스터리는 접사와 같은 채널로 합류한다 — 이 줄 아래로는 출처를 구분하지 않는다
        const mb = masteryBonus(hero);
        for (const k of Object.keys(mb.flat)) flat[k] = (flat[k] ?? 0) + mb.flat[k];
        for (const v of mb.dr) drList.push(v);
        const f = id => flat[id] ?? 0;

        const weapon = items.find(it => it.slot === 'weapon');
        const group = weapon ? data.weaponGroups[weapon.group] ?? null : null;
        const magic = group?.damageKind === 'magic';
        // 밑수 = 무기 개체 공격력 + 무기 슬롯 접사의 고정 공격력. 맨손이면 unarmed_atk
        const base = weapon
            ? weapon.watk + (weapon.affixes ?? []).reduce((s, a) => s + (a.stat === 'atk_flat' ? a.v : 0), 0)
            : B.unarmed_atk;
        const atk = Math.round(
            attrMult(magic ? A.int : A.str)
            * base
            * (1 + f('atk_pct') / 100)
            * (1 + (codex.atk_pct ?? 0) / 100));

        const hpMax = Math.round(
            (B.hero_hp_base * F.growthMult(hero.level) + f('hp_flat'))
            * (1 + f('hp_pct') / 100)
            * (1 + (codex.hp_pct ?? 0) / 100));

        const period = Math.max(0.4,
            (group ? group.period : B.unarmed_period)
            / attrMult(A.agi)
            * (1 - f('aspd_pct') / 100));

        const resAll = f('res_all');
        const luckMult = attrMult(A.luck);
        return {
            [magic ? 'atk_magic' : 'atk_physical']: atk,
            attack_type: magic ? (weapon?.element ?? ELEMENTS[0]) : 'physical',
            level: hero.level,                 // 적중률의 공격자 레벨 (§9-4)
            hp_max: hpMax,
            defense: f('def_flat'),
            ...Object.fromEntries(ELEMENTS.map(e => [`res_${e}`, resAll + f(`res_${e}`)])),
            res_max_bonus: f('res_max_bonus'),  // 저항 기본 상한을 뚫는 유일한 수단 (§9-5)
            res_reduction: f('res_reduction'),  // 상대 저항을 %p 로 깎는다 — 관통이 아니라 음수 가산
            def_ignore: f('def_ignore'),
            reflect_damage: f('reflect_damage'),
            damage_reduction: Number((100 * (1 - F.reductionMult(drList))).toFixed(3)),
            crit_rate: B.base_crit_pct + f('crit_rate'),
            crit_damage: B.base_crit_damage_pct + f('crit_damage'),
            life_steal: f('life_steal'),
            hp_regen: f('hp_regen'),                        // 초당 회복 — 행동 주기와 무관한 실시간 (battle.js 가 틱마다 누산)
            cooldown_reduction: f('cooldown_reduction'),    // 표기 쿨을 줄인다 — 시전 시점에 곱한다 (battle.js)
            action_period: Number(period.toFixed(3)),
            dmg_bonus_pct: codex.dmg_pct ?? 0,
            gold_find: Math.round(f('gold_find') * luckMult),
            item_find: Math.round(f('item_find') * luckMult),
            // Σ 상시 피해 % — 이미 atk 에 곱해져 있지만, 전투 중 버프가 **같은 괄호에 덧셈**으로 들어가려면
            // (battle_design §9-2 "괄호는 둘뿐") 그 괄호 안의 합을 따로 알아야 한다 (battle.js atkBase/atkPct)
            atk_pct_sum: f('atk_pct'),
        };
    }

    return {
        rollAttributes, rollHero, rollStartParty, rollCandidates, xpNeeded, grantXp, computeCombat,
        masteryNodes, masteryById, masteryNodesFor, masteryBonus,
    };
}
