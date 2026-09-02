/**
 * 전투 시뮬레이터 — **헤드리스**. 파티·스테이지·시드를 받아 결과와 타임라인을 돌려준다.
 * 화면(ui/battle.js)은 이 타임라인을 재생만 한다 — 관전으로 본 전투와 즉시 계산이 갈릴 수 없다.
 * 같은 입력 + 같은 시드 = 같은 타임라인 (엔진 이식 후 대조 검증의 기준).
 *
 * battle_design.md 확정 규칙 (그대로 반영):
 *   · 9라운드 / 정예 3·6 / 보스 9 — 라운드 구조는 stage_round.csv, 편성은 round_budget.csv
 *   · 행동 주기 단일 축 (공격/캐스팅 같은 시계), 한 차례에 하나
 *   · 몬스터 소재값(monster.csv) × 등급 배율(spawn_grade.csv)
 *   · 용어는 "사망"이 아니라 전투불능(부상) — 라운드 사이 회복 없음, 귀환 시 무료 회복
 *
 *   · 피해 계산은 formula.js — battle_design §9 (적중 게이트 → 타격 피해 → 감소). 이 파일은 **누가 언제 때리는가**만 본다
 *   · **몬스터는 영웅과 같은 전투 능력치 체계를 쓴다** (§8-1) — 같은 `strike` 에 같은 모양의 유닛이 양쪽으로 들어간다.
 *     몬스터 방어 200과 영웅 방어 200은 정확히 같은 감쇠를 만든다. 저항은 양쪽 다 **4원소 객체 · 직접 %**
 *   · 적중은 **레벨 차 0/1 게이트** (§9-4) — 영웅은 자기 레벨, 몬스터는 스테이지 dlvl. 빗나가면 흡혈·반사도 유발되지 않는다
 *   · 원소: 몬스터는 스테이지 원소(monster.csv:attack_type) · 영웅은 마법 무기 개체의 원소 (§9-5)
 *   · 반사는 비직격 — 감쇠·치명 없이 공격자 HP 를 직접 깎고 아무것도 유발하지 않는다 (§9-6)
 *
 *   · **유닛 생성은 `makeUnit` 하나다** — 영웅도 몬스터도 같은 생성자를 지난다 (§8-1). 몬스터는 `combatFromMonster` 가
 *     먼저 `computeCombat` 과 **같은 모양**으로 눕혀 준다. 필드가 한 곳에만 있으므로 양쪽 유닛이 갈릴 수 없다.
 *     `atk_pct` 버프는 **새 곱셈 층이 아니라 상시 % 와 같은 괄호에 덧셈**이다 (§9-2 "괄호는 둘뿐") —
 *     그래서 유닛이 `atkBase`(괄호 앞) 와 `atkPct`(괄호 안 Σ 상시 %) 를 따로 든다.
 *   · **액티브 스킬의 실행은 `skill_runtime.js`** (battle_design §3 · §6 · §7 · skill_design §9) — 정의·배정·선택은 skill.js.
 *     이 파일에 남는 것은 **전투 진행**이다: 직격 1회(`strikeOnce`) · 타겟팅 · 전투불능 · 라운드 편성 · 정산.
 *     배리어는 HP 밖 흡수 풀이고, 흡혈·반사는 **배리어가 먹은 몫을 포함한 dmg** 에 비례한다(직격이 들어간 사실은 같다).
 *   · **사건 훅** — `strikeOnce` 가 `hit`/`hitTaken`/`kill` 을, `downed` 가 `down` 을, 런타임이 `cast` 를 발화한다.
 *     유닛의 `reactions` 가 비면 아무 일도 없다 — 발화 **지점**이 곧 rng 순서 계약이다 (INTERFACE §5-2).
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   타겟팅: 진형·어그로 미확정 → 랜덤. **도발**(taunt 창)은 그 임시 규칙 **위에 얹은** 임시 규칙이다 —
 *     창이 켜진 파티원이 있으면 적의 단일 대상 선택이 그 유닛으로 고정되고 타겟 rng 를 쓰지 않는다 (skill_design §7 미확정).
 *   유닛의 `reactions`(사건 훅 등록)는 **자리만** 있고 싣는 소비자가 없다 — 마스터리 T3 몫 (skill_design §5).
 *   `skill.csv:status`(결빙 등)는 `status_effect.csv` 가 없어 코드가 읽지 않는다.
 *   전직·마스터리·패시브는 미구현 — 지금 도는 것은 직업 기본 액티브뿐이다 (프로토타입 §9-0).
 *   몬스터의 치명·반사·피해 감소는 0 — 정예 특성(elite_trait.csv)이 붙기 전까지 값이 없다 (§8-1 "몬스터는 부분집합만").
 *   도감 카드: 처치마다 장비 드롭과 **별개로** 카드 판정 (monster_design §8) — 결과 cards 와 타임라인 'card' 이벤트.
 *
 *   · **드롭 = 처치당 최대 1개** (item_design §1 확정 2026-08-27) — 판정은 1회이고 등급은 굴림 횟수가 아니라
 *     확률 배율(`spawn_grade.csv:drop_chance_mult`)이다. 파이프라인의 나머지(ilvl 에 등급 반영 · 희귀도에
 *     매직찬스)는 아직 미반영 (DEV_PLAN R20).
 */

import { createFormula } from './formula.js';
import { createHooks, createSkillRuntime } from './skill_runtime.js';

const TICK = 0.1;

/**
 * @param {object} data
 *   balance, monsters(byId), stages(byId), roundTypes [{round_num, round_type}],
 *   budgets(byKey: normal/elite/stage_boss/chapter_boss), grades(byKey), sins [...],
 *   sinTraits {sin: trait}, commonTraits [trait...], itemSystem,
 *   skillSystem — skill.js (정의·발동 선택). 없으면 액티브 없이 기본 공격만 돈다
 */
export function createBattleSystem(data) {
    const B = data.balance;
    const F = createFormula(B);
    const SK = data.skillSystem ?? null;
    const EPS = SK ? SK.EPS : 0;                // 준비·만료 판정 허용 오차 (skill.js — INTERFACE §5-3)
    const r1 = v => Math.round(v * 10) / 10;

    const stageMonsters = stage => Object.values(data.monsters)
        .filter(m => m.chapter === stage.chapter && m.stage_num === stage.stage_num);

    const stagePool = stage => stageMonsters(stage)
        .filter(m => m.spawn_grade === 'normal')
        .map(m => m.monster_idx);

    /**
     * 스테이지 원소 — 그 스테이지 몬스터의 `attack_type` 중 physical 이 아닌 첫 값 (없으면 'physical').
     * 편성 화면이 "이 스테이지는 어느 저항을 요구하나"를 표시하려면 필요한데(§9-8),
     * 렌더러가 몬스터 테이블을 훑어 계산하면 규칙이 화면 층에 새므로 여기 둔다.
     */
    const stageElement = stage =>
        stageMonsters(stage).find(m => m.attack_type !== 'physical')?.attack_type ?? 'physical';

    /**
     * 전투 유닛 하나 — **영웅도 몬스터도 여기를 지난다** (§8-1). 필드명은 `formula.strike` 가 읽는 이름 그대로다.
     * `c` 는 `hero.computeCombat` 결과 모양이고, 몬스터는 `combatFromMonster` 가 먼저 같은 모양으로 눕혀 준다 —
     *   유닛 모양을 두 곳에 적으면 반드시 갈리므로 생성자는 하나뿐이어야 한다.
     * 버프 괄호 — `atk` 는 이미 Σ 상시 %(`atk_pct_sum`)가 곱해진 값이라, 버프를 **같은 괄호에 더하려면**
     *   괄호 앞 밑수(`atkBase`)와 괄호 안 합(`atkPct`)을 분리해 둬야 한다 (§9-2).
     * @param extra 자리·출처가 정하는 것 — `key` · `uid`/`monsterId` · `next` · `actives` · 보상 축
     */
    function makeUnit(side, c, extra = {}) {
        const atk = c.atk_physical ?? c.atk_magic ?? 0;
        const atkPct = c.atk_pct_sum ?? 0;
        const matk = c.atk_magic ?? 0;
        return {
            side,
            hp: c.hp_max, hpMax: c.hp_max,
            atk, atkBase: atk / (1 + atkPct / 100), atkPct,
            matk,                                    // 회복량의 밑수 (battle_design §9-2)
            // 회복 밑수도 공격력과 **같은 괄호**를 탄다 — atk_pct 창이 여기도 걸린다 (skill_effects:EFFECTS.atk_pct)
            matkBase: matk / (1 + atkPct / 100),
            atkType: c.attack_type,                  // physical 또는 원소 (monster_design §2 · §9-5)
            def: c.defense,
            res: { fire: c.res_fire, cold: c.res_cold, lightning: c.res_lightning, poison: c.res_poison },
            lvl: c.level,                            // 적중률의 레벨 — 몬스터는 스테이지 dlvl (§9-4)
            resMaxBonus: c.res_max_bonus, dr: c.damage_reduction,
            defIgnore: c.def_ignore, resReduction: c.res_reduction,
            skillMult: 1, bonusPct: c.dmg_bonus_pct, // 도감·특효 보정 — strike 가 읽는 이름과 같아야 한다
            crit: c.crit_rate, critDmg: c.crit_damage, ls: c.life_steal, reflect: c.reflect_damage,
            // sustain 두 축 중 재생 쪽 (battle_design §8) — 초당 회복이라 틱마다 누산한다
            regen: c.hp_regen ?? 0, regenAcc: 0,
            cdr: c.cooldown_reduction ?? 0,          // 표기 쿨 단축 % — 시전 시점에 곱한다
            period: c.action_period, basePeriod: c.action_period,
            next: 0,
            actives: [], buffs: {}, barrier: null,
            reactions: [],                           // 사건 훅 등록 자리 (⚠ 지금은 아무도 싣지 않는다)
            goldFind: c.gold_find, itemFind: c.item_find,
            ...extra,
        };
    }

    /**
     * 몬스터 소재값 → **`computeCombat` 과 같은 모양**. 영웅 체계의 부분집합이라 없는 축은 0 이다 (§8-1).
     *   hp·공격력 = 소재값 × 등급 배율 × 전역 스케일 (성장 축)
     *   방어      = 소재값 × 등급 배율 × 전역 스케일 (비율 축 — monster_design §7-1 규칙 생성)
     *   저항      = **직접 %** — 배율을 받지 않고 등급은 `spawn_grade.res_add` 로 %p 가산만 한다
     * ⚠ 원소 공격 몬스터도 값은 `atk_physical` 에 둔다 — 원소는 `attack_type` 이 들고, 마법 공격력은
     *   **회복의 밑수**라 몬스터에게 없다. `atk_magic` 에 넣으면 matk 가 0 이 아니게 되어 체계가 갈린다.
     */
    const combatFromMonster = (m, g, lvl) => ({
        hp_max: Math.round(m.hp * g.hp_mult * B.monster_hp_scale),
        atk_physical: m.attack * g.atk_mult * B.monster_atk_scale,
        attack_type: m.attack_type,
        defense: m.defense * g.def_mult * B.monster_def_scale,
        res_fire: m.res_fire + g.res_add, res_cold: m.res_cold + g.res_add,
        res_lightning: m.res_lightning + g.res_add, res_poison: m.res_poison + g.res_add,
        level: lvl,
        // 몬스터의 치명·반사·피해 감소·재생·쿨감소는 0 — 정예 특성(elite_trait.csv)이 붙기 전까지 값이 없다
        res_max_bonus: 0, damage_reduction: 0, def_ignore: 0, res_reduction: 0, dmg_bonus_pct: 0,
        crit_rate: 0, crit_damage: B.base_crit_damage_pct,
        life_steal: 0, reflect_damage: 0, hp_regen: 0, cooldown_reduction: 0,
        action_period: m.action_period, atk_pct_sum: 0,
    });

    /** 몬스터 → 전투 유닛. 보상 축(경험치·골드·드롭 배율)만 등급에서 따로 얹는다 — 영웅에게 없는 필드다 */
    function makeEnemy(key, monsterId, grade, lvl, extra = {}) {
        const m = data.monsters[monsterId];
        const g = data.grades[grade];
        return makeUnit('enemy', combatFromMonster(m, g, lvl), {
            key, monsterId, grade,
            expReward: m.exp_reward * g.exp_mult, goldMult: g.gold_mult, dropChanceMult: g.drop_chance_mult,
            ...extra,
        });
    }

    const pickTwo = (rng, arr) => {
        const a = Math.floor(rng() * arr.length);
        let b = Math.floor(rng() * arr.length);
        if (b === a) b = (b + 1) % arr.length;
        return [arr[a], arr[b]];
    };

    /** 라운드 편성 — 구조는 고정(stage_round), 내용물은 예산(round_budget) 안에서 랜덤 */
    function spawnRound(rng, stage, pool, n) {
        const type = data.roundTypes.find(r => r.round_num === n)?.round_type ?? 'normal';
        const budgetKey = type === 'boss' ? stage.boss_grade : type;
        const bd = data.budgets[budgetKey];
        const pick = () => pool[Math.floor(rng() * pool.length)];
        const between = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
        const list = [];
        let k = 0;
        const add = (id, grade, extra) => list.push(makeEnemy(`e${k++}`, id, grade, stage.dlvl, extra));

        if (type === 'boss') {
            add(stage.boss_monster_idx, stage.boss_grade);
            const escorts = between(bd.escort_min, bd.escort_max);
            for (let i = 0; i < escorts; i++) add(pick(), 'normal');
        } else {
            for (let i = 0; i < bd.elite_count; i++) {
                // 정예 = 일반몹 1종 + 죄종 특성 1 + 공통 특성 2. 죄종은 이 판에서 굴린다
                const sin = data.sins[Math.floor(rng() * data.sins.length)];
                add(pick(), 'elite', { sin, traits: [data.sinTraits[sin], ...pickTwo(rng, data.commonTraits)] });
            }
            const normals = between(bd.normal_min, bd.normal_max);
            for (let i = 0; i < normals; i++) add(pick(), 'normal');
        }
        // 전역 상한 [balance.csv:wave_monster_max] — 어떤 편성도 넘지 못한다
        return { type, list: list.slice(0, B.wave_monster_max) };
    }

    /**
     * @param partyUnits [{uid, combat:{...}, actives?: [{id, source}], reactions?: [{on, fn}]}] —
     *   combat = heroSystem.computeCombat 결과, actives = 그 영웅의 액티브 **인스턴스** 목록(skill.activesFor).
     *   없거나 비면 기본 공격만 돈다. reactions = 사건 훅 등록(⚠ 지금은 아무도 싣지 않는다)
     * @returns 결과 + 타임라인. 타임라인은 재생용이라 세이브에 넣지 않는다 (리포트만 남긴다)
     */
    function simulate(partyUnits, stageId, rng) {
        const stage = data.stages[stageId];
        const pool = stagePool(stage);
        const rounds = B.rounds_per_stage;

        // 파티 유닛 — 몬스터와 **같은 생성자**를 지난다 (§8-1). 자리가 정하는 것만 extra 로 얹는다
        const party = partyUnits.map((p, i) => makeUnit('party', p.combat, {
            key: `p${i}`, uid: p.uid,
            next: i * 0.3,               // 첫 차례를 살짝 엇갈리게 — 동시 발동 시각 차이만 준다
            reactions: p.reactions ?? [],   // ⚠ 싣는 소비자가 아직 없다 — 마스터리 T3 자리
            // 전투 시작 시 액티브는 전부 준비(readyAt 0) — 첫 차례는 **1번 칸**이 나간다 (battle_design §6)
            actives: (SK ? p.actives ?? [] : []).map(a => {
                const def = SK.resolve(a);
                if (!def) throw new Error(`battle: 알 수 없는 스킬 ${a?.id ?? a}`);
                return { id: a.id, def, readyAt: 0, source: a.source };
            }),
        }));
        const avg = k => party.reduce((s, p) => s + (p[k] ?? 0), 0) / Math.max(1, party.length);
        const goldMult = 1 + avg('goldFind') / 100;
        const dropMult = 1 + avg('itemFind') / 100;

        const timeline = [];
        const out = {
            won: false, reason: null, durationSec: 0,
            party: party.map(p => ({ key: p.key, uid: p.uid, hpMax: p.hpMax, period: p.period, actives: p.actives.map(a => a.id) })),
            timeline, xpTotal: 0, gold: 0, dust: 0, kills: {}, cards: {}, drops: [], downed: [],
            roundsCleared: 0, rounds: [], casts: {},
            // 빗나감 집계 — 레벨 부족의 전용 신호라 리포트에 따로 낸다 (§9-4·§9-8). 세는 것뿐이라 rng 소비 없음
            strikes: { party: { n: 0, miss: 0 }, enemy: { n: 0, miss: 0 } },
        };

        let t = 0, round = 1;
        // 적 배열은 라운드마다 **갈아 끼운다** — 런타임이 속성으로 읽어야 옛 라운드를 가리키지 않는다 (skill_runtime @param units)
        const units = { party, enemies: [] };
        let roundLog = null;
        const alive = list => list.filter(u => u.hp > 0);
        const hooks = createHooks();
        // 액티브 실행은 런타임 몫 — 전투 하나마다 새로 만든다(모듈 전역 상태 없음)
        const rt = createSkillRuntime({
            SK, B, rng, timeline, out, units,
            strikeOnce, pickTarget, r1, EPS, hooks,
        });

        const beginRound = () => {
            const sp = spawnRound(rng, stage, pool, round);
            units.enemies = sp.list;
            // 적 등장 시각 = 라운드 시작 + 짧은 지연 (전 라운드 마지막 타격과 겹치지 않게)
            for (const e of units.enemies) e.next = 0.4 + rng() * 0.6;
            roundLog = { n: round, kind: sp.type, killed: [], eliteSin: units.enemies.find(e => e.grade === 'elite')?.sin ?? null };
            out.rounds.push(roundLog);
            timeline.push({
                t: r1(t), e: 'round', n: round, kind: sp.type,
                enemies: units.enemies.map(e => ({
                    key: e.key, monsterId: e.monsterId, grade: e.grade, sin: e.sin ?? null,
                    traits: e.traits ?? null, hpMax: e.hpMax, period: e.period,
                })),
            });
        };

        const onKill = e => {
            roundLog.killed.push(e.monsterId);
            out.kills[e.monsterId] = (out.kills[e.monsterId] ?? 0) + 1;
            out.xpTotal += e.expReward;
            out.gold += Math.round(e.expReward * e.goldMult * B.gold_rate * goldMult);
            if (e.grade === 'elite') out.dust += B.dust_elite;
            if (e.grade === 'stage_boss' || e.grade === 'chapter_boss') out.dust += B.dust_boss;
            // 도감 카드 — 장비 드롭과 별개 판정 [balance.csv:codex_card_drop_pct]. 등급별 차등은 후속 (monster_design §8)
            if (rng() * 100 < B.codex_card_drop_pct) {
                out.cards[e.monsterId] = (out.cards[e.monsterId] ?? 0) + 1;
                timeline.push({ t: r1(t), e: 'card', u: e.key, monsterId: e.monsterId });
            }
            // 드롭 판정 — **처치당 최대 1개** (item_design §1 확정 08-27). 등급은 굴림 횟수가 아니라
            // 확률 배율(spawn_grade.drop_chance_mult)이다 — 판정은 **1회**. 보스는 최소 1개 보장
            let got = rng() * 100 < B.drop_chance_pct * e.dropChanceMult * dropMult ? 1 : 0;
            if ((e.grade === 'stage_boss' || e.grade === 'chapter_boss') && got < B.boss_guaranteed_drop) got = B.boss_guaranteed_drop;
            for (let i = 0; i < got; i++) {
                const ilvl = stage.dlvl + Math.floor(rng() * B.drop_ilvl_spread);
                out.drops.push(data.itemSystem.rollDrop(rng, ilvl));
            }
        };

        const downed = u => {
            timeline.push({ t: r1(t), e: 'down', u: u.key });
            if (u.side === 'enemy') onKill(u);
            else out.downed.push(u.uid);
            // 처치 정산(드롭 rng)이 **먼저** 돌아야 훅이 rng 를 써도 순서가 잠긴다 (INTERFACE §5-2)
            hooks.emit('down', u, { t });
        };

        /* ── 전투 진행 — 타겟팅 · 직격 1회 · 전투불능 (액티브 실행은 skill_runtime.js) ── */

        /** 도발자 — `taunt` 창이 켜진 생존 유닛 중 배열 순 첫 번째 (skill_design §9-2 기사 항) */
        const hasTaunt = list => list.find(p => p.hp > 0 && Object.values(p.buffs).some(b => b.stat === 'taunt')) ?? null;

        /** 단일 대상 선택 — 적 측은 도발이 켜져 있으면 그 유닛으로 고정하고 **타겟 rng 를 쓰지 않는다** */
        function pickTarget(u, foes) {
            if (u.side === 'enemy') {
                const tn = hasTaunt(party);
                if (tn) return tn;
            }
            return foes[Math.floor(rng() * foes.length)];   // 타겟팅 미확정 → 랜덤
        }

        /** 피해 적용 — 배리어(HP 밖 흡수 풀)가 먼저 먹고 남은 몫만 HP 를 깎는다 */
        function applyDamage(target, dmg) {
            let absorbed = 0;
            if (target.barrier) {
                absorbed = Math.min(target.barrier.amt, dmg);
                target.barrier.amt -= absorbed;
            }
            target.hp = Math.max(0, target.hp - (dmg - absorbed));
            return { absorbed };
        }

        /**
         * 직격 1회 — 기본 공격과 스킬 타격이 **같은 함수**를 쓴다.
         * 스킬 배율·원소 태그는 `strike` 시그니처를 건드리지 않으려고 **그 타격 동안만** 유닛에 얹고 원복한다.
         * `s`(스킬 id)·`bar`(배리어 잔량)는 해당될 때만 붙는다 — 기본 공격의 이벤트 모양·rng 수열은 그대로다.
         */
        function strikeOnce(u, target, mult, element, s) {
            const mult0 = u.skillMult, type0 = u.atkType;
            u.skillMult = mult;
            if (element) u.atkType = element;               // 원소 태그가 있는 스킬은 무기 원소를 무시한다 (§9-5)
            const { hit, dmg, crit } = F.strike(rng, u, target);
            u.skillMult = mult0;
            u.atkType = type0;

            const tally = out.strikes[u.side === 'party' ? 'party' : 'enemy'];
            tally.n += 1;
            if (!hit) tally.miss += 1;
            if (!hit) {
                const miss = { t: r1(t), e: 'dodge', a: u.key, d: target.key };
                if (s) miss.s = s;
                timeline.push(miss);
                return;
            }
            const shield = target.barrier;
            applyDamage(target, dmg);
            const ev = { t: r1(t), e: 'hit', a: u.key, d: target.key, dmg, crit, dhp: target.hp };
            // 흡혈 — 직격의 최종 피해에만 비례 (§9-6). 배리어가 먹은 몫도 포함한다 (직격이 들어간 사실은 같다)
            if (u.ls > 0 && u.hp > 0) {
                u.hp = Math.min(u.hpMax, u.hp + F.leech(dmg, u.ls));
                ev.ahp = u.hp;
            }
            if (s) ev.s = s;
            if (shield) ev.bar = shield.amt;                // 흡수 후 잔량
            timeline.push(ev);
            // 사건 훅 — 등록된 반응이 없으면 아무 일도 없다. 핸들러가 rng 를 쓰면 **이 자리에서** 소비한다
            hooks.emit('hit', u, { t, d: target, dmg, crit, s });
            hooks.emit('hitTaken', target, { t, a: u, dmg, crit, s });
            // 반사 — 비직격. 감쇠·치명 없이 공격자 HP 를 직접 깎고 흡혈·반사를 유발하지 않는다 (§9-6)
            if (target.reflect > 0 && u.hp > 0) {
                const back = F.indirect(dmg * target.reflect / 100);
                u.hp = Math.max(0, u.hp - back);
                timeline.push({ t: r1(t), e: 'reflect', a: target.key, d: u.key, dmg: back, ahp: u.hp });
                if (u.hp <= 0) downed(u);
            }
            if (target.hp <= 0) { downed(target); hooks.emit('kill', u, { t, d: target }); }
        }

        beginRound();
        while (true) {
            t += TICK;
            // 창 만료를 행동 **앞에서** 한 번에 처리한다 — 같은 틱에 만료와 행동이 섞이는 순서를 고정하기 위해서다
            for (const u of [...party, ...units.enemies]) if (u.hp > 0) rt.expire(u, t);
            // HP 재생 — 행동 순회 **앞**. 초당 값이라 틱마다 누산하고 1 이상 쌓였을 때만 회복한다
            // (매 틱 소수점을 더하면 타임라인이 흘러넘치고 재생기가 정수 HP 와 어긋난다). rng 를 안 쓴다
            for (const u of [...party, ...units.enemies]) {
                if (u.hp <= 0 || !(u.regen > 0) || u.hp >= u.hpMax) continue;
                u.regenAcc += u.regen * TICK;
                const whole = Math.floor(u.regenAcc);
                if (whole < 1) continue;
                u.regenAcc -= whole;
                const amt = Math.min(whole, u.hpMax - u.hp);
                u.hp += amt;
                timeline.push({ t: r1(t), e: 'regen', u: u.key, amt, dhp: u.hp });
            }
            for (const u of [...party, ...units.enemies]) {
                if (u.hp <= 0) continue;
                u.next -= TICK;
                if (u.next <= 0) { u.next = u.period; rt.act(u, t); }
            }
            // 귀환 룰 [개정 2026-09-03 — base_expedition_design §1-1] — **전멸일 때만 돌아온다.**
            // 하나가 쓰러져도 런을 접지 않고 남은 인원으로 계속 간다. 쓰러진 영웅은 `out.downed` 에 실려
            // 그 **출정** 동안 아웃되고(state.js), 마을로 돌아오면 낫는다.
            // ~~전투불능자가 하나라도 나오면 철수~~ 는 폐기 — 그 룰이 「언제 돌아올까」를 대신 정하고 있었다
            if (alive(party).length === 0) { out.reason = 'wipe'; break; }
            if (alive(units.enemies).length === 0) {
                out.roundsCleared = round;
                if (round >= rounds) { out.won = true; out.reason = 'clear'; break; }
                round += 1;
                beginRound();
            }
            if (t >= B.battle_timeout_sec) { out.reason = 'timeout'; break; }
        }
        out.durationSec = r1(t);
        timeline.push({ t: r1(t), e: 'end', won: out.won, reason: out.reason });
        return out;
    }

    // makeEnemy 는 검증(dev/test.js)이 몬스터→유닛 변환 규칙을 직접 볼 수 있도록 함께 내보낸다 — stagePool 과 같은 이유
    return { simulate, stagePool, stageElement, makeEnemy };
}
