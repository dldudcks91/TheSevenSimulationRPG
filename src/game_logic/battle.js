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
 *   · **액티브 스킬**(battle_design §3 · §6 · §7 · skill_design §9) — 정의·배정·선택은 skill.js, **실행이 여기다**:
 *     행동 주기가 도래하면 준비된 액티브 중 하나를 쓰고(한 차례에 하나), 없으면 기본 공격.
 *     쿨은 실시간 초(시전 순간 `readyAt = t + cool`) · 전투 시작 시 전부 준비 → 첫 차례는 priority 로 갈린다.
 *     버프 창도 실시간 초 — 중첩 없이 재시전은 `until` 갱신, 다른 스킬의 같은 스탯은 덧셈.
 *     `atk_pct` 버프는 **새 곱셈 층이 아니라 상시 % 와 같은 괄호에 덧셈**이다 (§9-2 "괄호는 둘뿐") —
 *     그래서 유닛이 `atkBase`(괄호 앞) 와 `atkPct`(괄호 안 Σ 상시 %) 를 따로 든다.
 *     배리어는 HP 밖 흡수 풀이고, 흡혈·반사는 **배리어가 먹은 몫을 포함한 dmg** 에 비례한다(직격이 들어간 사실은 같다).
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   타겟팅: 진형·어그로 미확정 → 랜덤. **도발**(taunt 창)은 그 임시 규칙 **위에 얹은** 임시 규칙이다 —
 *     창이 켜진 파티원이 있으면 적의 단일 대상 선택이 그 유닛으로 고정되고 타겟 rng 를 쓰지 않는다 (skill_design §7 미확정).
 *   다단타·순환 중 대상이 쓰러지면 남은 타수를 **버린다**(재지정 없음) — 재지정 규칙 미확정.
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

const TICK = 0.1;
/** 쿨타임 감소의 바닥 — 표기 쿨의 이 배수 밑으로는 안 내려간다. 0 이 되면 스킬이 매 차례 나가 예산이 무너진다 (INTERFACE §5-3) */
const CD_MIN_MULT = 0.1;

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
     * 몬스터 → 전투 유닛. 영웅과 **같은 필드 모양**을 갖는다 (§8-1) — 대부분의 축은 값이 0인 부분집합.
     *   hp·공격력 = 소재값 × 등급 배율 × 전역 스케일 (성장 축)
     *   방어      = 소재값 × 등급 배율 × 전역 스케일 (비율 축 — monster_design §7-1 규칙 생성)
     *   저항      = **직접 %** — 배율을 받지 않고 등급은 `spawn_grade.res_add` 로 %p 가산만 한다
     */
    function makeEnemy(key, monsterId, grade, lvl, extra = {}) {
        const m = data.monsters[monsterId];
        const g = data.grades[grade];
        const hp = Math.round(m.hp * g.hp_mult * B.monster_hp_scale);
        const atk = m.attack * g.atk_mult * B.monster_atk_scale;
        return {
            key, side: 'enemy', monsterId, grade,
            hp, hpMax: hp,
            atk,
            // 버프 괄호 — 몬스터는 상시 % 도 마법 공격력도 없다(영웅 체계의 부분집합 §8-1)
            atkBase: atk, atkPct: 0, matk: 0,
            atkType: m.attack_type,                 // physical 또는 스테이지 원소 (monster_design §2)
            def: m.defense * g.def_mult * B.monster_def_scale,
            res: {
                fire: m.res_fire + g.res_add, cold: m.res_cold + g.res_add,
                lightning: m.res_lightning + g.res_add, poison: m.res_poison + g.res_add,
            },
            lvl,                                    // 적중률의 레벨 = 스테이지 dlvl (§9-4 — 몬스터마다 두지 않는다)
            period: m.action_period, basePeriod: m.action_period, next: 0,
            actives: [], buffs: {}, barrier: null,  // 몬스터 액티브는 미구현 (정예 특성과 함께 후속)
            crit: 0, critDmg: B.base_crit_damage_pct, defIgnore: 0, resReduction: 0,
            skillMult: 1, bonusPct: 0, resMaxBonus: 0, dr: 0, ls: 0, reflect: 0,
            regen: 0, regenAcc: 0, cdr: 0,          // 재생·쿨감소는 영웅 전용 — 몬스터 쪽 배정은 정예 특성과 함께 후속
            expReward: m.exp_reward * g.exp_mult, goldMult: g.gold_mult, dropChanceMult: g.drop_chance_mult,
            ...extra,
        };
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
     * @param partyUnits [{uid, combat:{...}, actives?: [skillId]}] — combat = heroSystem.computeCombat 결과,
     *   actives = 그 영웅이 들고 있는 액티브 id 목록(skill.activesFor). 없거나 비면 기본 공격만 돈다
     * @returns 결과 + 타임라인. 타임라인은 재생용이라 세이브에 넣지 않는다 (리포트만 남긴다)
     */
    function simulate(partyUnits, stageId, rng) {
        const stage = data.stages[stageId];
        const pool = stagePool(stage);
        const rounds = B.rounds_per_stage;

        // 파티 유닛 — 몬스터와 **같은 필드 모양**이다 (§8-1). 필드명은 formula.strike 가 읽는 이름 그대로
        const party = partyUnits.map((p, i) => {
            const c = p.combat;
            const atk = c.atk_physical ?? c.atk_magic ?? 0;
            // 버프 괄호 — atk 는 이미 Σ 상시 %(atk_pct_sum)가 곱해진 값이라, 버프를 **같은 괄호에 더하려면**
            // 괄호 앞 밑수(atkBase)와 괄호 안 합(atkPct)을 분리해 둬야 한다 (§9-2)
            const atkPct = c.atk_pct_sum ?? 0;
            return {
                key: `p${i}`, side: 'party', uid: p.uid,
                hp: c.hp_max, hpMax: c.hp_max,
                atk, atkBase: atk / (1 + atkPct / 100), atkPct,
                matk: c.atk_magic ?? 0,                     // 회복량의 밑수 (battle_design §9-2)
                atkType: c.attack_type,
                def: c.defense,
                res: { fire: c.res_fire, cold: c.res_cold, lightning: c.res_lightning, poison: c.res_poison },
                lvl: c.level,
                resMaxBonus: c.res_max_bonus, dr: c.damage_reduction,
                defIgnore: c.def_ignore, resReduction: c.res_reduction,
                skillMult: 1, bonusPct: c.dmg_bonus_pct,     // 도감·특효 보정 — strike 가 읽는 이름과 같아야 한다
                crit: c.crit_rate, critDmg: c.crit_damage, ls: c.life_steal, reflect: c.reflect_damage,
                // sustain 두 축 중 재생 쪽 (battle_design §8) — 초당 회복이라 틱마다 누산한다. 출처는 지금 마스터리뿐
                regen: c.hp_regen ?? 0, regenAcc: 0,
                cdr: c.cooldown_reduction ?? 0,          // 표기 쿨 단축 % — 시전 시점에 곱한다
                period: c.action_period, basePeriod: c.action_period,
                next: i * 0.3,           // 첫 차례를 살짝 엇갈리게 — 동시 발동 시각 차이만 준다
                // 전투 시작 시 액티브는 전부 준비(readyAt 0) — 첫 차례는 priority 로 갈린다 (battle_design §6)
                actives: (SK ? p.actives ?? [] : []).map(id => {
                    const def = SK.defs[id];
                    if (!def) throw new Error(`battle: 알 수 없는 스킬 ${id}`);
                    return { id, def, readyAt: 0 };
                }),
                buffs: {}, barrier: null,
                goldFind: c.gold_find, itemFind: c.item_find,
            };
        });
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
        let enemies = [];
        let roundLog = null;
        const alive = list => list.filter(u => u.hp > 0);

        const beginRound = () => {
            const sp = spawnRound(rng, stage, pool, round);
            enemies = sp.list;
            // 적 등장 시각 = 라운드 시작 + 짧은 지연 (전 라운드 마지막 타격과 겹치지 않게)
            for (const e of enemies) e.next = 0.4 + rng() * 0.6;
            roundLog = { n: round, kind: sp.type, killed: [], eliteSin: enemies.find(e => e.grade === 'elite')?.sin ?? null };
            out.rounds.push(roundLog);
            timeline.push({
                t: r1(t), e: 'round', n: round, kind: sp.type,
                enemies: enemies.map(e => ({
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
        };

        /* ── 스킬 런타임 — 정의·선택은 skill.js, 실행이 여기다 (skill_design §9-3 · battle_design §7) ── */

        /** 버프 창을 반영해 파생값을 다시 쓴다 — 공격력은 상시 % 와 **같은 괄호에 덧셈**(§9-2), 주기는 배율 감소 */
        function refreshDerived(u) {
            let atkAdd = 0, periodAdd = 0;
            for (const b of Object.values(u.buffs)) {
                if (b.stat === 'atk_pct') atkAdd += b.v;
                else if (b.stat === 'period_pct') periodAdd += b.v;
            }
            u.atk = u.atkBase * (1 + (u.atkPct + atkAdd) / 100);
            // 주기는 **다음 차례 예약부터** 걸린다 — 이미 잡힌 u.next 는 건드리지 않는다 (§9-3)
            u.period = u.basePeriod * (1 - periodAdd / 100);
        }

        /** 창 만료 — 행동 순회 **앞에서** 처리한다. rng 를 쓰지 않으므로 수열이 밀리지 않는다 */
        function expire(u, at) {
            let changed = false;
            for (const id of Object.keys(u.buffs)) {
                if (u.buffs[id].until <= at + EPS) {
                    delete u.buffs[id];
                    timeline.push({ t: r1(at), e: 'buffEnd', u: u.key, s: id });
                    changed = true;
                }
            }
            // 배리어도 같은 조건 — 창이 끝나면 남은 흡수량은 사라진다 (skill_design §9-3)
            if (u.barrier && u.barrier.until <= at + EPS) u.barrier = null;
            if (changed) refreshDerived(u);
        }

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
            // 반사 — 비직격. 감쇠·치명 없이 공격자 HP 를 직접 깎고 흡혈·반사를 유발하지 않는다 (§9-6)
            if (target.reflect > 0 && u.hp > 0) {
                const back = F.indirect(dmg * target.reflect / 100);
                u.hp = Math.max(0, u.hp - back);
                timeline.push({ t: r1(t), e: 'reflect', a: target.key, d: u.key, dmg: back, ahp: u.hp });
                if (u.hp <= 0) downed(u);
            }
            if (target.hp <= 0) downed(target);
        }

        /**
         * 공격 스킬의 타겟팅 4종 (skill_design §9-3).
         * 타격 도중 대상이 쓰러지면 **남은 타수는 버린다** — 재지정 규칙은 미확정(⚠).
         */
        function castAttack(u, def, foes) {
            const mult = def.mult / 100;
            if (def.target === 'enemy_all') {               // 생존 적 배열 순 전원 각 1회 — 타겟 rng 없음
                for (const tgt of foes) {
                    if (u.hp <= 0) break;
                    if (tgt.hp > 0) strikeOnce(u, tgt, mult, def.element, def.id);
                }
                return;
            }
            if (def.target === 'enemy_chain') {             // 시작점 무작위 → 배열 순 전원, 순서마다 배율 감쇠
                const start = Math.floor(rng() * foes.length);
                for (let k = 0; k < foes.length; k++) {
                    if (u.hp <= 0) break;
                    const tgt = foes[(start + k) % foes.length];
                    if (tgt.hp > 0) strikeOnce(u, tgt, mult * Math.pow(1 - def.decay / 100, k), def.element, def.id);
                }
                return;
            }
            if (def.target === 'enemy_rotate') {            // 시작점 무작위 → 돌아가며 hits 회 (모자라면 겹친다)
                const start = Math.floor(rng() * foes.length);
                for (let k = 0; k < def.hits; k++) {
                    if (u.hp <= 0) break;
                    const tgt = foes[(start + k) % foes.length];
                    if (tgt.hp > 0) strikeOnce(u, tgt, mult, def.element, def.id);
                }
                return;
            }
            const tgt = pickTarget(u, foes);                // enemy_single — 같은 대상에게 hits 회 (다단타)
            for (let k = 0; k < def.hits; k++) {
                if (u.hp <= 0 || tgt.hp <= 0) break;
                strikeOnce(u, tgt, mult, def.element, def.id);
            }
        }

        /** 회복 — 마법 공격력 × 배율을 생존 아군 전원에게. rng 소비 없음 (battle_design §9-2) */
        function castHeal(u, def) {
            const amt = Math.round(u.matk * def.mult / 100);
            const targets = def.target === 'self' ? [u] : alive(u.side === 'party' ? party : enemies);
            for (const tgt of targets) {
                tgt.hp = Math.min(tgt.hpMax, tgt.hp + amt);
                timeline.push({ t: r1(t), e: 'heal', a: u.key, d: tgt.key, amt, dhp: tgt.hp, s: def.id });
            }
        }

        /** 버프 창 — 중첩 없음, 같은 스킬 재시전은 `until` 갱신. 배리어는 흡수 풀을 다시 채운다 (battle_design §7) */
        function castBuff(u, def) {
            const targets = def.target === 'self' ? [u] : alive(u.side === 'party' ? party : enemies);
            const until = t + def.dur;
            for (const tgt of targets) {
                tgt.buffs[def.id] = { stat: def.stat, v: def.value, until };
                const ev = { t: r1(t), e: 'buff', u: tgt.key, s: def.id, stat: def.stat, v: def.value, until: r1(until) };
                if (def.stat === 'barrier_pct') {
                    const amt = Math.round(tgt.hpMax * def.value / 100);
                    tgt.barrier = { amt, until, s: def.id };   // 만료는 buffs 쪽 창과 같은 조건으로 본다
                    ev.amt = amt;
                }
                timeline.push(ev);
                refreshDerived(tgt);
            }
        }

        const act = u => {
            const foes = alive(u.side === 'party' ? enemies : party);
            if (foes.length === 0) return;
            // 발동 선택 — rng 를 쓰지 않는다 (battle_design §3). 준비된 것이 없으면 기본 공격
            const sel = SK && u.actives.length
                ? SK.pickReady(u.actives, t, a => SK.castable(a.def, { self: u, allies: alive(u.side === 'party' ? party : enemies) }))
                : null;
            if (!sel) {
                strikeOnce(u, pickTarget(u, foes), 1, null);
                return;
            }
            const def = sel.def;
            // 쿨은 실시간 초 — 시전 순간부터 (battle_design §6). 쿨감소는 **표기 쿨에 곱**한다 (combat_stat:cooldown_reduction)
            sel.readyAt = t + def.cool * Math.max(CD_MIN_MULT, 1 - (u.cdr ?? 0) / 100);
            out.casts[def.id] = (out.casts[def.id] ?? 0) + 1;
            timeline.push({ t: r1(t), e: 'skill', u: u.key, s: def.id });
            if (def.kind === 'attack') castAttack(u, def, foes);
            else if (def.kind === 'heal') castHeal(u, def);
            else castBuff(u, def);
        };

        beginRound();
        while (true) {
            t += TICK;
            // 창 만료를 행동 **앞에서** 한 번에 처리한다 — 같은 틱에 만료와 행동이 섞이는 순서를 고정하기 위해서다
            for (const u of [...party, ...enemies]) if (u.hp > 0) expire(u, t);
            // HP 재생 — 행동 순회 **앞**. 초당 값이라 틱마다 누산하고 1 이상 쌓였을 때만 회복한다
            // (매 틱 소수점을 더하면 타임라인이 흘러넘치고 재생기가 정수 HP 와 어긋난다). rng 를 안 쓴다
            for (const u of [...party, ...enemies]) {
                if (u.hp <= 0 || !(u.regen > 0) || u.hp >= u.hpMax) continue;
                u.regenAcc += u.regen * TICK;
                const whole = Math.floor(u.regenAcc);
                if (whole < 1) continue;
                u.regenAcc -= whole;
                const amt = Math.min(whole, u.hpMax - u.hp);
                u.hp += amt;
                timeline.push({ t: r1(t), e: 'regen', u: u.key, amt, dhp: u.hp });
            }
            for (const u of [...party, ...enemies]) {
                if (u.hp <= 0) continue;
                u.next -= TICK;
                if (u.next <= 0) { u.next = u.period; act(u); }
            }
            if (alive(party).length === 0) { out.reason = 'wipe'; break; }
            if (alive(enemies).length === 0) {
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
