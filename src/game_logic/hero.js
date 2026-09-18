/**
 * 영웅 시스템 — 생성(반고정: 이름 + 메인 죄종 + 시작 특성 + 고유 스킬) / XP 성장 / 전투 능력치 계산.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 난수는 전부 rng 인자로 주입받는다.
 * 데이터(밸런스 수치·이름 풀·직업 정의)는 생성자에서 주입받는다 (CLAUDE.md 개발 규칙).
 *
 * 전투 능력치 = ( 장비(베이스 + Implicit + 접사) + 스킬 ) × 기본 능력치 계수 (battle_design §8).
 *   ~~곱셈이라 장비가 0이면 능력치도 0을 곱한다~~ — 2026-09-10 폐기(능력치가 스킬의 덧셈 항으로 옮겨갔다 · battle_design §9-1).
 *   계수는 `hero_attribute.csv` 의 `mult_base_pct + 능력치 × mult_per_point_pct`(비율 — 2026-09-17 R111)다.
 *   모든 계수는 CSV 의 ⚠제안 값이다 — 확정되면 이 파일이 아니라 CSV 를 고친다.
 *
 * **퍼센트는 비율이다** [2026-09-17 · R111] — 접사 · 마스터리 · 전술 · 도감이 넣는 % 채널과 여기서 내는 % 능력치가 전부 0.05 = 5% 눈금이다.
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
 * 전투 계수가 실제로 걸리는 축은 둘뿐 [개정 2026-09-10 · battle_design §8 · DEV_PLAN R72] — 민첩(행동 주기) ·
 *   건강(**레벨 성장분의 최대 HP**). ~~힘(물리 공격력) · 지능(마법 공격력)~~ 은 **스킬 계수**로 옮겨갔고(skill.js scaleDef ·
 *   battle_design §9-1) ~~건강(HP 재생)~~ 은 계수를 잃었다. 통솔·매력은 전투 스탯 계수 없음 · **운은 전투 계산 밖**이다
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
 *   armorGroups  — {slot: {groupId: {defMult, aspdPct, cdrPct, ...}}} ← armor_group.csv — **부위 → 갈래** (2026-09-16 갑옷군 · R107 · 2026-09-18 네 부위).
 *                  **낀 방어구마다** 제 갈래의 공속 · 쿨감을 더한다 — 지금 값이 있는 것은 갑옷군뿐이다(장갑 갈래 고정값은 사용자 보류)
 *   namePool     — 레어 영웅 이름 풀 [{ko,en}...]
 *   traitPool    — 시작 특성 풀 [{ko,en}...] (효과 미작성 — 이름표만 굴린다)
 *   skillPool    — **직업별** 고유 스킬 후보 `{classId: [skillId...]}` ← skill.csv **행 순서**(순서가 굴림 결과를 정한다).
 *                  hero.js 는 skill 시스템을 모른다 — id 목록만 받는다. **1스킬 = 1직업**(skill_design §12-1
 *                  확정 2026-09-08)이라 ~~전 행에서 균등~~ 이 아니라 **제 직업 풀**에서 굴린다 —
 *                  「마법사가 배쉬를 드는 일은 없다」
 *   masteryNodes — mastery_node.csv 파싱 행. 랭크당 값·상한·해금 레벨은 **키 이름만** 들고 balance 에서 읽는다
 *   heroTiers    — 영웅 등급 표 [{id, weight, totalMin, totalMax, shape}...] ← `hero_tier.csv` (**행 순서가 굴림 결과를 정한다**).
 *                  `weight = 0` 인 행은 생성기가 안 뽑는다(유니크는 수작업). 등급을 가르는 것은 **총합 대역과 분포 모양 둘뿐**이다
 *                  (hero_design §1 확정 2026-09-07). 상한은 등급이 아니라 `[balance.csv:hero_attr_max]` 하나다
 *   heroFaces    — **직업별** 초상 장수 `{classId: n}`. **영웅이 태어날 때 제 직업 풀에서 굴려 `face` 에 박는다**
 *                  (2026-09-07 — 구 `heroFaceMax` 정수 하나를 대체). `face` 는 `'<classId>_<k>'` 문자열이고
 *                  풀이 0장인 직업은 `null`(초상 없음)이다. 로직은 그림을 모른다 — 직업별 장수 객체만 받고
 *                  어느 파일인지는 화면이 정한다(`ui/mock.js:heroFace`)
 */
export function createHeroSystem(data) {
    const B = data.balance;
    const F = createFormula(B);        // 성장 곡선(growthMult)을 시뮬과 같은 함수에서 읽는다
    const statIds = data.stats.map(s => s.id);
    const mainClasses = data.classes.filter(c => c.stage === 'main').map(c => c.id);
    const skillPool = data.skillPool ?? {};      // {classId: [skillId...]} — 직업 풀 (skill_design §12)
    const faceCounts = data.heroFaces ?? {};       // {classId: 장수} — 없는 직업은 0장 = 초상 없음
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
     * 얼굴 1회 — 태어날 때 **제 직업 풀에서** 굴려 영웅에 박고, 그 뒤로 안 바뀐다 (hero_design §1 의 고유 스킬과 같은 층).
     * **화면이 매번 다시 계산하지 않게** 하려고 저장한다 — 렌더러는 전체를 다시 그리므로 그때마다 굴리면 얼굴이 흔들린다.
     * 결과는 `'<classId>_<k>'` 문자열(k ≥ 1)이고, 그 직업의 그림이 하나도 없으면 `null` = 초상 없음(2026-09-07).
     */
    const rollFace = (rng, cls) => {
        const m = faceCounts[cls] ?? 0;
        const r = rng();               // 풀 0장이어도 1회 소비 — 직업이 소비 수를 바꾸면 같은 시드가 다른 파티가 된다
        return m ? `${cls}_${1 + Math.floor(r * m)}` : null;
    };

    /* ── 등급 (hero_design §1 — 3층 확정 2026-09-07 · SSOT: `hero_tier.csv`) ── */

    const tierRows = data.heroTiers ?? [];
    const rollable = tierRows.filter(t => t.weight > 0);      // 유니크(weight 0)는 수작업이라 굴림 대상이 아니다
    const tierById = id => tierRows.find(t => t.id === id) ?? null;
    const defaultTier = () => rollable[0] ?? tierRows[0] ?? null;

    /**
     * 등급 1회 — **소비는 언제나 정확히 1회다.**
     * ⚠ 이것이 계약이다 (INTERFACE §5-2) — 소비 수가 등급이나 호출 경로에 의존하면
     *   선술집에서 등급이 섞여 나올 때 **같은 시드가 다른 결과**를 낸다. 그래서 시작 파티처럼
     *   등급을 **지정**하는 경우에도 굴림은 그대로 태우고 결과만 버린다
     *   (`rollFace` 가 「풀이 0장이어도 1회 소비」로 막아 둔 것과 같은 함정).
     */
    function rollTier(rng, forced) {
        const total = rollable.reduce((s, t) => s + t.weight, 0);
        const x = rng() * total;                              // 강제 지정이어도 굴린다 — 위 계약
        if (forced) return tierById(forced) ?? defaultTier();
        let acc = 0;
        for (const t of rollable) { acc += t.weight; if (x < acc) return t; }
        return defaultTier();
    }

    /** 능력치 총합 1회 — 등급이 대역을 정하고 그 안에서 굴린다. 여기도 **소비 1회 고정** */
    function rollTotal(rng, tier) {
        const lo = Math.max(B.hero_attr_min * statIds.length, tier?.totalMin ?? 0);
        const hi = Math.min(B.hero_attr_max * statIds.length, tier?.totalMax ?? lo);
        return lo + Math.floor(rng() * (Math.max(lo, hi) - lo + 1));
    }

    /**
     * 기본 능력치 굴림 — **합은 등급이 정하고 모양만 굴린다** (`hero_tier.csv`).
     * 축마다 독립 균등이면 합이 33↔86까지 벌어져 죽은 카드가 나온다 — 차이는 양이 아니라 모양.
     * `shape` 는 그 모양의 손잡이다 — **작을수록 가중치가 고르게 나서 극값이 드물다**(레어 = 정규),
     * 클수록 치우쳐 한 축이 크게 튄다. **1.0 이 균등 가중치**이고 그 위는 균등보다도 퍼진다.
     * ⚠ 2026-09-08 정정 — 옛 주석은 이 방향을 반대로 적어(「1 에 가까울수록 고르다」) 레어에 1.0,
     *   매직에 2.5 가 들어가 있었다. 실측 결과 레어의 최고축 18+ 가 20.4% 로 「극값이 드물다」가
     *   성립하지 않았고, 매직 최고축 평균(17.2)이 레어(15.4)를 넘어 **등급이 뒤집혀** 있었다.
     *   주력 축이 전투 계수를 쥐므로(hero_design §4-1) 이는 밸런스 역전이다 — DEV_PLAN R50.
     * 마지막에 직업 주력 축(keyAttr)이 최고치가 되도록 **자리만 바꾼다** (합·분포 불변).
     *
     * ⚠ **rng 소비는 축 수(7)로 고정이다** — 옛 판은 나머지 보정 루프가 `rng()` 로 칸을 골라
     *   소비 수가 굴림 결과에 의존했다. 총합이 등급마다 달라지는 09-07 개정에서는 그것이 곧
     *   「등급이 소비 수를 민다」가 되므로 **보정을 결정적으로** 바꿨다 (소수부 큰 축부터 · 동률은 인덱스 순).
     */
    function rollAttributes(rng, favor, opts = {}) {
        const t = opts.total != null ? null : defaultTier();
        const total = opts.total ?? Math.round(((t?.totalMin ?? 7) + (t?.totalMax ?? 7)) / 2);
        const shape = opts.shape ?? t?.shape ?? 2;
        const lo = B.hero_attr_min, hi = B.hero_attr_max;
        const w = statIds.map(() => rng() ** shape + 0.04);   // 소비 = 축 수. 등급과 무관하다
        const sum = w.reduce((a, b) => a + b, 0);
        const free = total - lo * statIds.length;
        const raw = w.map(x => lo + free * x / sum);
        const v = raw.map(x => Math.max(lo, Math.min(hi, Math.floor(x))));

        let diff = total - v.reduce((a, b) => a + b, 0);
        const order = raw
            .map((x, i) => [x - Math.floor(x), i])
            .sort((a, b) => b[0] - a[0] || a[1] - b[1])
            .map(([, i]) => i);
        for (let pass = 0; diff !== 0 && pass < hi + 2; pass++) {
            let moved = false;
            for (let k = 0; k < order.length && diff !== 0; k++) {
                const i = order[diff > 0 ? k : order.length - 1 - k];
                if (diff > 0 && v[i] < hi) { v[i]++; diff--; moved = true; }
                else if (diff < 0 && v[i] > lo) { v[i]--; diff++; moved = true; }
            }
            if (!moved) break;                                // 대역이 [lo*7, hi*7] 밖이면 더 못 민다
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
     * 고유 스킬 1개 — 영웅이 태어날 때 딱 한 번 굴린다 (hero_design §1).
     * 풀은 **그 영웅의 직업 풀** 하나다 [개정 2026-09-09 · skill_design §12-1 규칙 1] —
     *   ~~`skill.csv` 전 행에서 균등~~(09-01)은 「1스킬 = 1직업」 확정으로 폐기됐다.
     * ⚠ **풀이 비어도 1회 소비한다** — 소비 수가 직업에 의존하면 같은 시드가 다른 파티를 낸다
     *   (초상 굴림이 09-07 에 같은 이유로 같은 규칙이 됐다 · INTERFACE §5-2).
     */
    const rollInnate = (rng, cls) => {
        const pool = skillPool[cls] ?? [];
        const r = rng();
        return pool.length ? pool[Math.floor(r * pool.length)] : null;
    };

    /** 생성 영웅 1명 — 죄종·직업·특성을 겹침 없이 뽑는 건 rollParty 쪽의 일 */
    function rollHero(rng, { sin, cls, name, trait, tier }) {
        // rng 소비 순서가 계약이다 (INTERFACE §5-2) — 등급 1 → 총합 1 → 능력치 7 → 고유 1 = **언제나 10회**.
        // 객체 리터럴 안에서 부르면 평가 순서가 문장으로 안 보여 순서가 조용히 밀린다.
        // ⚠ ~~상한 7회(`rollCaps`)~~ 는 09-07 폐지 — 상한은 개체별이 아니라 `hero_attr_max` 하나다 (§4-3)
        const t = rollTier(rng, tier);
        const total = rollTotal(rng, t);
        const stats = rollAttributes(rng, keyAttrOf(cls), { total, shape: t?.shape });
        const innate = rollInnate(rng, cls);
        return {
            uid: null,               // uid 발급은 state 의 일 (카운터 소유자)
            name, tier: t?.id ?? 'rare', sin, cls, trait,
            face: null,              // 얼굴 id — **파티를 굴리는 쪽이 맨 마지막에 박는다** (rollStartParty · 아래 이유)
            level: 1, xp: 0,
            mastery: {}, masteryPoints: 0,   // 찍은 랭크 {nodeId: rank} · 남은 포인트 (죄종·직업 공유 풀)
            innate,                  // 고유 스킬 — 생성 시 확정 · 이후 불변 (hero_design §1 · 풀 = 그 직업의 스킬 풀)
            stats,                   // ~~caps~~ 는 09-07 폐지 — 상한이 전 영웅 공통이라 개체가 들 것이 없다
            equipped: {},            // 슬롯 초기화는 state 가 slots 정의로 채운다
        };
    }

    /**
     * 시작 파티 — 죄종·직업·이름·특성이 셋 사이에서 겹치지 않는다 (같은 카드 3장 방지).
     * 얼굴은 **겹침 방지를 따로 안 한다** (2026-09-07) — 직업 풀에서 굴리는데 파티 안 직업이 이미 서로 다르므로
     *   (바로 위 `drawDistinct(mainClasses)`) 다른 풀에서 나온 얼굴끼리는 id 가 겹칠 수 없다.
     *
     * ⚠ **얼굴은 맨 마지막에 굴린다** (2026-09-06) — 능력치·상한·고유 뒤에 두어야 **앞의 소비 순서가 안 밀린다**.
     *   영웅 안에서 굴리면 1번 영웅의 얼굴이 2번 영웅의 능력치를 밀어 **같은 시드가 다른 파티**를 낸다 (INTERFACE §5-2).
     */
    function rollParty(rng, n, tiers) {
        const names = drawDistinct(rng, data.namePool, n);
        const sins = drawDistinct(rng, data.sins, n);
        const classes = drawDistinct(rng, mainClasses, n);
        const traits = drawDistinct(rng, data.traitPool, n);
        const party = names.map((name, i) =>
            rollHero(rng, { name, sin: sins[i], cls: classes[i], trait: traits[i], tier: tiers?.[i] }));
        // 소비는 언제나 인원수만큼 1회씩이다 — 직업 풀이 비어도(마법사) 소비 수는 안 바뀐다
        party.forEach(h => { h.face = rollFace(rng, h.cls); });
        return party;
    }

    /**
     * 첫 파티의 등급 — **레어 1 + 매직 1 + 일반 1** [개정 2026-09-14 사용자 확정 · ~~레어 1 + 매직 2~~ 09-07] (hero_design §1).
     * 셋이 같은 등급이면 차이가 굴림 운으로만 나타나는데 등급이 갈리면 **첫 화면부터 로스터에 층이 보이고**
     * 「아래 둘을 언젠가 위로 갈아탄다」는 목표가 바로 생긴다. 인원이 늘면 나머지는 굴린다.
     */
    const START_TIERS = ['rare', 'magic', 'normal'];

    const rollStartParty = (rng, n) => rollParty(rng, n, START_TIERS);

    /**
     * 선술집 후보 — 시작 파티와 같은 굴림이되 **등급도 굴린다** (첫 파티만 지정이다).
     * `tiers` 를 주면 그 등급으로 굳는다 — **수색이 매력으로 등급을 미는 자리**다 (state.searchResult).
     *   `rollTier` 가 지정이어도 굴림을 태우므로(위 계약) **소비 수는 지정 여부와 무관하게 같다**.
     */
    const rollCandidates = (rng, n, tiers = null) => rollParty(rng, n, tiers);

    /* ── 성장 ── */

    const xpNeeded = level => Math.round(B.hero_xp_base * Math.pow(level, B.hero_xp_exp));

    /**
     * XP 지급 → 레벨업 처리.
     * **기본 능력치는 안 바꾼다** [2026-09-14 사용자 확정 · hero_design §4-3 · R83] — 태어날 때 굴린 값이 평생 간다.
     *   ~~레벨업마다 축별 [balance.csv:attr_growth_chance_pct]% 확률로 +1~~ 은 폐지됐다 — 7축을 공통 상한으로 모아
     *   만렙에서 개체차를 지웠다. 등급 차이는 이제 끝까지 간다.
     * `gains` 는 언제나 `{}` 이고 `rng` 는 소비하지 않는다 — 둘 다 계약 모양으로만 남는다 (INTERFACE §2-4 · §5-2).
     */
    function grantXp(hero, amount, rng) {
        // 레벨 상한 — 상한에 닿으면 XP 를 쌓지 않는다 (GAME_DESIGN §9 08-26 「레벨 상한 99」).
        // 남은 XP 를 들고 있어 봐야 쓸 곳이 없고, 세이브에 의미 없는 잔량이 남는다
        if (hero.level >= B.hero_level_cap) { hero.xp = 0; return null; }
        hero.xp += amount;
        const from = hero.level;
        while (hero.level < B.hero_level_cap && hero.xp >= xpNeeded(hero.level)) {
            hero.xp -= xpNeeded(hero.level);
            hero.level += 1;
        }
        if (hero.level >= B.hero_level_cap) hero.xp = 0;
        // 마스터리 포인트 — 레벨업 1회당 정액. 지급 곡선 자체가 기획 미확정이라 형태도 임시다 (skill_design §7)
        const points = (hero.level - from) * B.mastery_point_per_level;
        if (points > 0) hero.masteryPoints = (hero.masteryPoints ?? 0) + points;
        return hero.level > from ? { uid: hero.uid, from, to: hero.level, gains: {}, points } : null;
    }

    /* ── 전투 능력치 (계수는 전부 balance.csv ⚠제안 키) ── */

    /**
     * 기본 능력치 계수 — **축마다 형태가 다르다** (2026-09-13 확정 · hero_design §4-1).
     *   계수 = `mult_base_pct` + 능력치 × `mult_per_point_pct` — 둘 다 **비율**이다(2026-09-17 R111 · ~~`/ 100`~~)
     *   대부분 축은 `1 + 0.01n` 이라 옛 `1 + n × attr_bonus_per_point` 과 같은 값을 낸다.
     *   **건강만 모양이 다르다** — 곱해지는 대상이 HP 레벨업 상승분이라 계수가 1 보다 작은 쪽에서 시작한다.
     *   값은 전부 `hero_attribute.csv` 에 있다. 바꿀 때 이 파일이 아니라 CSV 를 고친다.
     */
    const attrCoef = Object.fromEntries(data.stats.map(s => [s.id, {
        base: Number(s.multBasePct ?? 1),
        per: Number(s.multPerPointPct ?? B.attr_bonus_per_point),
    }]));
    const attrMult = (id, v) => {
        const c = attrCoef[id];
        if (!c) throw new Error(`attrMult: 축 '${id}' 가 hero_attribute.csv 에 없다`);
        return c.base + (v ?? 0) * c.per;
    };

    /**
     * 최대 HP 의 레벨 성장 — **10레벨 구간마다 직선** [확정 2026-09-14 사용자 · hero_design §4-1 · battle_design §8 · R84].
     *   레벨 n 으로 오를 때 상승분 = `hero_hp_band{b}_unit` × 건강 계수 · 구간 b = floor((n−1) / `hero_hp_band_levels`) + 1
     *   구간 단위는 **건강 계수 1.0 기준** 상승분이다. HP 는 `power_growth_per_level` 을 **읽지 않는다** —
     *   ~~`hero_hp_base × (R^(N+1) − R²)`~~(R82) 는 곱셈이라 만렙을 늘리는 구간에서 불어났다.
     * `hpUnitSum[level]` = 레벨 1 에서 그 레벨까지 오른 단위의 합. **생성할 때 만렙까지 한 번** 만든다 —
     *   구간 키가 만렙을 못 덮으면 전투 중이 아니라 **여기서** 던진다.
     */
    if (!(B.hero_hp_band_levels > 0)) throw new Error(`hero: balance.csv 의 hero_hp_band_levels 가 없거나 0 이하다`);
    const hpUnitSum = [0, 0];
    for (let n = 2; n <= B.hero_level_cap; n++) {
        const band = Math.floor((n - 1) / B.hero_hp_band_levels) + 1;
        const unit = B[`hero_hp_band${band}_unit`];
        if (typeof unit !== 'number') throw new Error(`hero: balance.csv 에 'hero_hp_band${band}_unit' 이 없다 — 만렙 ${B.hero_level_cap} 까지 HP 구간을 덮어야 한다`);
        hpUnitSum[n] = hpUnitSum[n - 1] + unit;
    }

    /**
     * 기본 능력치 + 장비 + 도감 보너스 + 파티 전술 → 전투 능력치.
     * items = 착용 중 아이템 배열. codex = {atk_pct, hp_pct, dmg_pct} (없으면 0).
     * party = 파티 전술의 가산치 `{flat, dr}` (없으면 null) — **파티에 든 영웅에게만** 넘어온다.
     *   판정(어느 칸이 켜졌나 · 이 영웅이 파티인가)은 state.js 가 하고 여기는 받은 값을 합류시키기만 한다.
     *
     * · **무기가 밑수다** (battle_design §9-1, 08-26 개정) — 다른 슬롯의 고정 공격력을 밑수에 더하지 않는다.
     *   `atk_flat` 은 무기 슬롯 접사만 합산하고, `+피해 %` 는 그 밑수 전체를 곱한다.
     *   **공격력은 범위 `{min, max}` 다** [2026-09-14 · R90] — 무기 피해 범위(`formula.weaponDamage` · 무기군 × ilvl × 강화)의 양끝이고 직격마다 전투가 굴린다.
     * · 공격 타입은 직업이 아니라 **무기군**이 정한다 (battle_design §2-1 — 스태프·오브 = magic). 맨손은 physical.
     *   ~~사제의 파워 출처 = 마법 공격력 = 지능~~ 은 09-10 에 깨졌다 — 공격력은 순수 무기 밑수이고 지능은 스킬 계수로 간다 (§9-1).
     * · ~~**원소는 무기 개체가 든다** — 마법 무기군이면 그 무기의 element 가 공격 타입이다~~ → **[폐기 2026-09-11 · 사용자 지시 · R80]**
     *   원소는 **관련 옵션이 붙었을 때만** 생기고 그 옵션이 아직 없으므로 `attack_type` 은 **언제나 `physical`** 이다 (§2-1 · §9-5).
     * · **저항은 소재값이 아니라 직접 %다** (§9-5) — `res_all` + 원소별 접사. 상한은 전투에서 적용된다
     *   (formula.appliedResist) — 여기서는 원값을 그대로 내고, 상한을 뚫는 `res_max_bonus` 를 따로 낸다.
     * · **최대 HP 는 레벨이 키운다** — ~~기하 곡선(§9-0)~~ 이 아니라 **10레벨 구간 직선의 누적합**이다 [2026-09-14 · R84]. 방어는 비율 축이라 레벨을 안 탄다.
 *   **그 성장분만 건강 계수를 탄다** [확정 2026-09-10 · hero_design §4-1] — 레벨 1 은 전 영웅이 같다(몬스터 앵커링 기준점 유지).
     * · **피해 감소는 원천별 곱**이라 (§9-3) 접사를 각각 곱해 **실효 %** 한 숫자로 낸다 — 시트에도 그 숫자가 찍힌다.
     * · **운은 전투 계산 밖**이다 — 드랍률·골드 획득에만 계수로 곱한다 (hero_design §4-1).
     *   접사가 0이면 운도 0을 곱한다(곱이다) · 결과는 1% 단위로 자른다(`formula.roundPct` · R111).
     * · **HP 재생만 밑수를 갖는다** [09-07] — 최대 HP 시작값과 같은 분류다(생존의 바닥이지 세기가 아니다).
     */
    function computeCombat(hero, items, codex = {}, party = null) {
        // ⚠ **몬스터도 이 함수를 지난다** [2026-09-11 · R79 · battle_design §8-1 · monster_design §5-1] — `battle.js:makeEnemy` 가
        //   `{stats, level: dlvl, cls, innate}` 모양을 넘긴다. `mastery` 가 없으면 랭크 0 이라 마스터리 몫은 0 이고,
        //   `codex`·`party` 도 안 넘어온다. 몬스터 전용으로 남는 것은 호출한 쪽의 세 줄(몸값 합류 · 전역 배율 · attack_type 덮기)뿐이다.
        const A = hero.stats;
        const flat = {};                       // 접사 합산 {stat: v}
        const drList = [];                     // 피해 감소는 합치지 않고 원천별로 모은다 (§9-3)
        for (const it of items) {
            if (it.implicit) {
                // 고정 옵션 「방어력 +%」(`armor_def_pct`)는 **그 아이템 자신의 고유 방어력에만** 곱한다 [2026-09-18 · item_design §1 「갑옷 옵션」 · 네 부위 공통].
                //   고유값은 강화까지 먹은 값으로 온다(부르는 쪽이 `item.effective` 를 지난다) · 다른 부위 · 접사 · 오만의 더하기 값에는 안 곱한다 · 곱한 뒤 정수
                const own = (it.affixes ?? []).reduce((s, a) => s + (a.stat === 'armor_def_pct' ? a.v : 0), 0);
                const v = own ? Math.round(it.implicit.v * (1 + own)) : it.implicit.v;
                flat[it.implicit.stat] = (flat[it.implicit.stat] ?? 0) + v;
            }
            for (const a of it.affixes ?? []) {
                flat[a.stat] = (flat[a.stat] ?? 0) + a.v;
                if (a.stat === 'damage_reduction') drList.push(a.v);
            }
        }
        // 마스터리는 접사와 같은 채널로 합류한다 — 이 줄 아래로는 출처를 구분하지 않는다
        const mb = masteryBonus(hero);
        for (const k of Object.keys(mb.flat)) flat[k] = (flat[k] ?? 0) + mb.flat[k];
        for (const v of mb.dr) drList.push(v);
        // 파티 전술도 같은 채널로 합류한다 — 새 곱셈 층을 만들지 않는다 (tactic_card_design §2-4)
        for (const k of Object.keys(party?.flat ?? {})) flat[k] = (flat[k] ?? 0) + party.flat[k];
        for (const v of party?.dr ?? []) drList.push(v);
        const f = id => flat[id] ?? 0;

        const weapon = items.find(it => it.slot === 'weapon');
        const group = weapon ? data.weaponGroups[weapon.group] ?? null : null;
        const magic = group?.damageKind === 'magic';
        // 밑수 = **무기 피해 범위**(양끝 · 무기군 × ilvl × 강화에서 파생 · R90) + 무기 슬롯 접사의 고정 공격력(양끝에 같이). 맨손이면 양끝 모두 unarmed_atk
        //   ⚠ 2026-09-11 R78 부터 새 무기에는 `atk_flat` 이 안 붙는다(최소/최대 피해 보류) — 옛 무기만 든다
        const range = weapon ? F.weaponDamage(weapon.ilvl, group, weapon.up) : { min: B.unarmed_atk, max: B.unarmed_atk };
        const atkFlat = (weapon?.affixes ?? []).reduce((s, a) => s + (a.stat === 'atk_flat' ? a.v : 0), 0);
        // 데미지 % 괄호 = Σ 데미지 % + **오만 칸의 레벨당 데미지 × 영웅 레벨** [2026-09-11 · R78 · item_design §1 「무기 옵션」]
        //   + **도감 「데미지」** [2026-09-18 · battle_design §9-1 — ~~괄호 밖에서 따로 곱한다~~ → 같은 괄호의 덧셈]. 조건부 % 는 타격마다 전투가 같은 괄호에 끼운다(formula.strike)
        const atkPctSum = f('atk_pct') + f('dmg_per_level_pct') * hero.level + (codex.atk_pct ?? 0);
        // 공격력 = **순수 무기 밑수** [개정 2026-09-10 · battle_design §9-1] — ~~`attrMult(magic ? int : str) ×`~~ 는 걷었다.
        //   힘·지능은 스킬 쪽 **덧셈 항**으로 옮겨갔다(skill.js scaleDef) — 곱이면 무기가 약할 때 능력치까지 죽는다
        //   양끝마다 데미지 % 괄호 하나를 곱하고 반올림한다 — 범위 안의 굴림은 전투(formula.strike)가 한다 (R90 · 괄호 하나 2026-09-18)
        const scaleAtk = end => Math.round((end + atkFlat) * (1 + atkPctSum));
        const atk = { min: scaleAtk(range.min), max: scaleAtk(range.max) };

        // 최대 HP — 레벨 1 값은 전 영웅 공통이고 **레벨 성장분만 건강을 탄다** [확정 2026-09-10 · hero_design §4-1].
        //   성장분 = **구간 단위의 누적합**(`hpUnitSum`) × 건강 계수 [확정 2026-09-14 · R84]. 레벨 1 에서 누적합이 0 이라
        //   몬스터 앵커링 기준점(`hero_hp_base`)이 안 흔들린다 (battle_design §8). 레벨업 팝업의 상승분은 hpMax(새)−hpMax(옛) 로 낸다(반올림 정합)
        //   ⚠ 몬스터도 여기를 지난다 — `stage.csv:dlvl` 이 만렙을 넘으면 구간이 없어 던진다
        //   ⚠ **레벨 1 바탕만 몬스터가 따로다** [2026-09-14 사용자 지시 · R91 · monster_design §5] — `battle.js:makeEnemy` 가
        //   `hpBase` 로 `monster_hp_base` 를 넘긴다. 영웅은 안 넘기므로 `hero_hp_base` 다. 성장분 · 장비 몫은 같은 식이다
        const units = hpUnitSum[hero.level];
        if (units === undefined) throw new Error(`hero: 레벨 ${hero.level} 은 HP 구간 밖이다(1 ~ 만렙 ${B.hero_level_cap}) — 몬스터면 stage.csv:dlvl 이 만렙을 넘었다`);
        // 투구 오만 「레벨당 체력」은 **더하기**다 — 영웅 레벨 × 값이 체력 flat 과 같은 자리에 든다 [2026-09-17 · item_design §1 「투구 옵션」]
        const hpMax = Math.round(
            ((hero.hpBase ?? B.hero_hp_base) + units * attrMult('vit', A.vit) + f('hp_flat') + f('hp_per_level') * hero.level)
            * (1 + f('hp_pct'))
            * (1 + (codex.hp_pct ?? 0)));

        // 방어구 갈래가 공속·쿨감을 낸다 [2026-09-16 사용자 확정 · R107 · item_design §1] — ~~갑옷 칸 하나만~~ → **낀 방어구마다 제 갈래 값을 더한다**
        //   [2026-09-18 — 네 부위가 갈래를 갖는다]. 지금 값이 있는 것은 갑옷군뿐이다 — 중갑은 음수(느려진다) · 경갑은 양수 · 로브는 0 이고 쿨감을 든다.
        //   갈래 id 가 부위마다 겹쳐(`leather`) 부위와 함께 찾는다. 무기의 `group`(무기군)은 `weapon` 칸이라 여기 안 걸린다
        const worn = items.map(it => (data.armorGroups ?? {})[it?.slot]?.[it?.group]).filter(Boolean);
        const groupAspd = worn.reduce((s, g) => s + (g.aspdPct ?? 0), 0);
        const groupCdr = worn.reduce((s, g) => s + (g.cdrPct ?? 0), 0);
        // 신발 오만 「레벨당 공격 속도」 — 영웅 레벨 × 값이 공속 합에 더해진다 [2026-09-18 · item_design §1 신발 행] (합산은 더하기 — 원천별 곱 여부는 GAME_DESIGN §10)
        const period = Math.max(0.4,
            (group ? group.period : B.unarmed_period)
            / attrMult('agi', A.agi)
            * (1 - (f('aspd_pct') + f('aspd_per_level_pct') * hero.level + groupAspd)));

        const resAll = f('res_all');
        const luckMult = attrMult('luck', A.luck);
        // 무기 옵션이 여는 축 한 묶음 [2026-09-11 · R78 · item_design §1 「무기 옵션」] — **전투 능력치가 아니다**(combat_stat 행 없음 · 시트에 안 선다).
        //   소비자는 battle.js 뿐이다(조건부 % · 타격 시 창 · 강타 · 매직아이템 획득확률). 전부 0 이면 null 이라 전투가 한 번도 안 읽는다
        const fx = {
            vs: { normal: f('vs_normal_dmg'), demon: f('vs_demon_dmg'), undead: f('vs_undead_dmg') },
            vsElite: f('vs_elite_dmg'), vsFront: f('vs_front_dmg'), vsBack: f('vs_back_dmg'),
            ele: Object.fromEntries(ELEMENTS.map(e => [e, f(`${e}_dmg_pct`)])),
            defDown: f('def_down_pct'), resDown: f('res_down_pct'),
            atkDownPhys: f('atk_down_phys_pct'), atkDownMag: f('atk_down_mag_pct'),
            crush: f('crushing_blow_pct'),
            // 운 계수는 드랍률 · 골드와 같은 취급이다 (⚠제안 — item_design §1 「무기 옵션」)
            magicFind: F.roundPct(f('magic_find') * luckMult),
            // ── 방어구 옵션이 여는 축 [2026-09-18 · item_design §1 「갑옷 옵션」 · 「투구 옵션」 · 신발 행] — 소비자는 battle.js(경험치만 state.js)
            //   받는 피해 감소 — **때린 쪽**의 종족 · 등급 · 열이 조건이다. 셋은 더한 뒤 한 원천으로 곱한다(battle.strikeOnce)
            vsDr: { normal: f('vs_normal_dr'), demon: f('vs_demon_dr'), undead: f('vs_undead_dr') },
            vsEliteDr: f('vs_elite_dr'), vsFrontDr: f('vs_front_dr'), vsBackDr: f('vs_back_dr'),
            drFlat: f('dr_flat'),                // 절대값 피해 감소 — 모든 감소 뒤에 뺀다(formula.strike)
            counter: f('counter_chance'),        // 반격 확률 — 맞으면 때린 적에게 기본 공격 1회 · 차례를 쓴다(battle.strikeOnce)
            recv: f('hp_recovery_pct'),          // 체력 회복 +% — 재생 · 회복 스킬 · 흡혈 · 물약에 곱한다(보호막 제외)
            xpGain: f('xp_gain_pct'),            // 경험치 획득 — **본인 몫**(state.advanceRun)
            // ⚠ 빙결 · 중독 시간 감소 — **읽는 곳이 없다**. 상태이상 기계가 서면 그쪽이 읽는다(신발 공통옵션 · 사용자 「풀에 넣어」)
            freezeDur: f('freeze_dur_reduction'), poisonDur: f('poison_dur_reduction'),
        };
        const anyFx = [...Object.values(fx.vs), ...Object.values(fx.ele), fx.vsElite, fx.vsFront, fx.vsBack,
            fx.defDown, fx.resDown, fx.atkDownPhys, fx.atkDownMag, fx.crush, fx.magicFind,
            ...Object.values(fx.vsDr), fx.vsEliteDr, fx.vsFrontDr, fx.vsBackDr, fx.drFlat, fx.counter, fx.recv, fx.xpGain,
            fx.freezeDur, fx.poisonDur].some(v => v !== 0);
        return {
            [magic ? 'atk_magic' : 'atk_physical']: atk,
            // **원소 옵션이 없는 마법 무기의 기본 공격은 물리다** [개정 2026-09-11 · 사용자 지시 · R80 · battle_design §2-1 · §9-5]
            //   ~~magic ? (weapon.element ?? ELEMENTS[0]) : physical~~ 폐기 — 생성 때 원소를 굴리지 않으므로(item.js build) 들 원소가 없다.
            //   ⚠ 바뀌는 것은 **무엇에 깎이나**뿐이다 — 마법 무기의 세기 채널(`atk_magic` = 회복의 밑수)은 그대로고,
            //   깎임만 저항(§9-5)에서 방어 곡선(§9-3)으로 옮겨간다. 그래서 08-26 「원소 없는 마법 공격은 없다」도 그대로 선다.
            //   평타에 원소를 얹는 것은 **평타 부여 스킬**(인챈트 계열 · 미구현)의 몫이고, 어느 옵션이 원소를 주는지는 기획 미정(GAME_DESIGN §10).
            //   ⚠ **몬스터는 이 값을 덮는다** — 원소를 정하는 것은 스테이지다(`monster.csv:attack_type` · monster_design §2 · battle.js makeEnemy)
            attack_type: 'physical',
            level: hero.level,                 // 적중률의 공격자 레벨 (§9-4)
            hp_max: hpMax,
            // 갑옷 오만 「레벨당 방어력」은 **더하기**다 — 영웅 레벨 × 값 [2026-09-16 · item_design §1 「갑옷 옵션」]. 고정 옵션 % 는 위 아이템 루프에서 고유값에만 곱했다
            defense: f('def_flat') + f('def_per_level') * hero.level,
            ...Object.fromEntries(ELEMENTS.map(e => [`res_${e}`, resAll + f(`res_${e}`)])),
            res_max_bonus: f('res_max_bonus'),  // 저항 기본 상한을 뚫는 유일한 수단 (§9-5)
            // 원소별 최대 저항 증가 [2026-09-18 · 투구 시기 칸] — 그 원소의 상한에만 더한다. 시트 행이 아니라 저항 행의 상한 표기와 전투가 읽는다
            res_max_el: Object.fromEntries(ELEMENTS.map(e => [e, f(`res_max_${e}`)])),
            res_reduction: f('res_reduction'),  // 상대 저항을 비율만큼 깎는다 — 관통이 아니라 음수 가산
            def_ignore: f('def_ignore'),
            reflect_damage: f('reflect_damage'),
            // 원천별 곱의 실효값(비율) — 옛 %(소수 3자리)와 같은 정밀도라 5자리다
            damage_reduction: Number((1 - F.reductionMult(drList)).toFixed(5)),
            crit_rate: B.base_crit_pct + f('crit_rate'),
            crit_damage: B.base_crit_damage_pct + f('crit_damage'),
            life_steal: f('life_steal'),
            // 초당 회복 — 행동 주기와 무관한 실시간 (battle.js 가 틱마다 누산).
            // **밑수를 갖는 유일한 축**이다 [확정 2026-09-07 · battle_design §8] — 「장비가 0이면 능력치도 0」의 예외로,
            // 전 영웅이 레벨 곡선 밑수를 갖고(성장 축 = hero_hp_base 와 같은 기하) 그 위에 접사·마스터리가 얹힌다.
            // 밑수는 세기가 아니라 생존의 바닥이라 능력치와 무관하게 존재한다. ~~마지막에 건강 계수를 곱한다~~ 는
            // **2026-09-10 폐기** — 건강은 HP 성장분으로 옮겨갔다 (hero_design §4-1 · DEV_PLAN R72).
            hp_regen: Number(
                (B.hp_regen_base_per_level * F.growthMult(hero.level) + f('hp_regen'))
                    .toFixed(3)),
            cooldown_reduction: f('cooldown_reduction') + groupCdr,    // 표기 쿨을 줄인다 — 시전 시점에 곱한다 (battle.js) · 로브(R107) · 티아라 공통옵션(2026-09-18)이 여기 얹힌다
            // 타격 회복 — 물리 경직 시간을 줄인다 (battle_design §2-3 · R110 · battle.js stagger). **비율**이다(0.5 = 50% · R111 단위 규약).
            //   출처는 갑옷 분노 칸(2026-09-18 — 첫 출처) · ⚠ 상한은 기획 미정(GAME_DESIGN §10)
            fhr: f('fhr'),
            action_period: Number(period.toFixed(3)),
            dmg_bonus_pct: codex.dmg_pct ?? 0,    // 피해량(도감) — 데미지 % 괄호와 합치지 않고 전투가 따로 곱한다 (2026-09-18 · battle_design §9-2)
            // 평타 능력치 계수 [2026-09-18 · 사용자 확정 · battle_design §9-2] — 직업 메인 스탯(`class.csv:key_attr` · hero_design §2)의 `formula.statCoef`.
            //   직업이나 그 능력치를 모르면 1. **`combat_stat.csv` 행이 아니다**(시트에 안 선다) · ⚠ 몬스터는 `battle.makeEnemy` 가 1 로 덮는다(보류)
            main_attr_mult: F.statCoef(A?.[keyAttrOf(hero.cls)]),
            gold_find: F.roundPct(f('gold_find') * luckMult),
            item_find: F.roundPct(f('item_find') * luckMult),
            // Σ 상시 피해(비율) — 이미 atk 에 곱해져 있지만, 전투 중 버프가 **같은 괄호에 덧셈**으로 들어가려면
            // (battle_design §9-2 "괄호는 둘뿐") 그 괄호 안의 합을 따로 알아야 한다 (battle.js atkBase/atkPct)
            atk_pct_sum: atkPctSum,
            option_fx: anyFx ? fx : null,
        };
    }

    return {
        rollAttributes, rollTier, rollInnate, rollFace, rollHero, rollStartParty, rollCandidates, xpNeeded, grantXp, computeCombat,
        masteryNodes, masteryById, masteryNodesFor, masteryBonus,
    };
}
