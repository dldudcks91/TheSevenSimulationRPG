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
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   타겟팅: 진형·어그로 미확정 → 랜덤.
 *   스킬: 액티브 슬롯은 아직 비어 있다(스킬 효과 미작성) — 기본 공격만 돈다(스킬 배율 1). 구조는 battle_design §3 대로 남긴다.
 *   몬스터의 치명·반사·피해 감소는 0 — 정예 특성(elite_trait.csv)이 붙기 전까지 값이 없다 (§8-1 "몬스터는 부분집합만").
 *   도감 카드: 처치마다 장비 드롭과 **별개로** 카드 판정 (monster_design §8) — 결과 cards 와 타임라인 'card' 이벤트.
 */

import { createFormula } from './formula.js';

const TICK = 0.1;

/**
 * @param {object} data
 *   balance, monsters(byId), stages(byId), roundTypes [{round_num, round_type}],
 *   budgets(byKey: normal/elite/stage_boss/chapter_boss), grades(byKey), sins [...],
 *   sinTraits {sin: trait}, commonTraits [trait...], itemSystem
 */
export function createBattleSystem(data) {
    const B = data.balance;
    const F = createFormula(B);
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
        return {
            key, side: 'enemy', monsterId, grade,
            hp, hpMax: hp,
            atk: m.attack * g.atk_mult * B.monster_atk_scale,
            atkType: m.attack_type,                 // physical 또는 스테이지 원소 (monster_design §2)
            def: m.defense * g.def_mult * B.monster_def_scale,
            res: {
                fire: m.res_fire + g.res_add, cold: m.res_cold + g.res_add,
                lightning: m.res_lightning + g.res_add, poison: m.res_poison + g.res_add,
            },
            lvl,                                    // 적중률의 레벨 = 스테이지 dlvl (§9-4 — 몬스터마다 두지 않는다)
            period: m.action_period, next: 0,
            crit: 0, critDmg: B.base_crit_damage_pct, defIgnore: 0, resReduction: 0,
            skillMult: 1, bonusPct: 0, resMaxBonus: 0, dr: 0, ls: 0, reflect: 0,
            expReward: m.exp_reward * g.exp_mult, goldMult: g.gold_mult, dropRoll: g.drop_roll,
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
     * @param partyUnits [{uid, combat:{...}}] — heroSystem.computeCombat 결과
     * @returns 결과 + 타임라인. 타임라인은 재생용이라 세이브에 넣지 않는다 (리포트만 남긴다)
     */
    function simulate(partyUnits, stageId, rng) {
        const stage = data.stages[stageId];
        const pool = stagePool(stage);
        const rounds = B.rounds_per_stage;

        // 파티 유닛 — 몬스터와 **같은 필드 모양**이다 (§8-1). 필드명은 formula.strike 가 읽는 이름 그대로
        const party = partyUnits.map((p, i) => {
            const c = p.combat;
            return {
                key: `p${i}`, side: 'party', uid: p.uid,
                hp: c.hp_max, hpMax: c.hp_max,
                atk: c.atk_physical ?? c.atk_magic ?? 0, atkType: c.attack_type,
                def: c.defense,
                res: { fire: c.res_fire, cold: c.res_cold, lightning: c.res_lightning, poison: c.res_poison },
                lvl: c.level,
                resMaxBonus: c.res_max_bonus, dr: c.damage_reduction,
                defIgnore: c.def_ignore, resReduction: c.res_reduction,
                skillMult: 1, bonusPct: c.dmg_bonus_pct,     // 도감·특효 보정 — strike 가 읽는 이름과 같아야 한다
                crit: c.crit_rate, critDmg: c.crit_damage, ls: c.life_steal, reflect: c.reflect_damage,
                period: c.action_period,
                next: i * 0.3,           // 첫 차례를 살짝 엇갈리게 — 동시 발동 시각 차이만 준다
                goldFind: c.gold_find, itemFind: c.item_find,
            };
        });
        const avg = k => party.reduce((s, p) => s + (p[k] ?? 0), 0) / Math.max(1, party.length);
        const goldMult = 1 + avg('goldFind') / 100;
        const dropMult = 1 + avg('itemFind') / 100;

        const timeline = [];
        const out = {
            won: false, reason: null, durationSec: 0,
            party: party.map(p => ({ key: p.key, uid: p.uid, hpMax: p.hpMax, period: p.period })),
            timeline, xpTotal: 0, gold: 0, dust: 0, kills: {}, cards: {}, drops: [], downed: [],
            roundsCleared: 0, rounds: [],
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
            // 드롭 판정 — 등급별 굴림 횟수(spawn_grade.drop_roll) × 확률. 보스는 최소 1개 보장
            let got = 0;
            for (let i = 0; i < e.dropRoll; i++) {
                if (rng() * 100 < B.drop_chance_pct * dropMult) got++;
            }
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

        const act = u => {
            const foes = alive(u.side === 'party' ? enemies : party);
            if (foes.length === 0) return;
            const target = foes[Math.floor(rng() * foes.length)];   // 타겟팅 미확정 → 랜덤
            const { hit, dmg, crit } = F.strike(rng, u, target);
            const tally = out.strikes[u.side === 'party' ? 'party' : 'enemy'];
            tally.n += 1;
            if (!hit) tally.miss += 1;
            if (!hit) {
                timeline.push({ t: r1(t), e: 'dodge', a: u.key, d: target.key });
                return;
            }
            target.hp = Math.max(0, target.hp - dmg);
            const ev = { t: r1(t), e: 'hit', a: u.key, d: target.key, dmg, crit, dhp: target.hp };
            if (u.ls > 0 && u.hp > 0) {                      // 흡혈 — 직격의 최종 피해에만 비례 (§9-6)
                u.hp = Math.min(u.hpMax, u.hp + F.leech(dmg, u.ls));
                ev.ahp = u.hp;
            }
            timeline.push(ev);
            // 반사 — 비직격. 감쇠·치명 없이 공격자 HP 를 직접 깎고 흡혈·반사를 유발하지 않는다 (§9-6)
            if (target.reflect > 0 && u.hp > 0) {
                const back = F.indirect(dmg * target.reflect / 100);
                u.hp = Math.max(0, u.hp - back);
                timeline.push({ t: r1(t), e: 'reflect', a: target.key, d: u.key, dmg: back, ahp: u.hp });
                if (u.hp <= 0) downed(u);
            }
            if (target.hp <= 0) downed(target);
        };

        beginRound();
        while (true) {
            t += TICK;
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
