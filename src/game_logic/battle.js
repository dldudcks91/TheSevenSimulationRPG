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
 * ⚠ 피해 계산 공식은 기획 미확정 — 아래는 프로토타입 임시식이다. 계수는 전부 balance.csv ⚠제안 키.
 *   명중/회피: 몬스터 쪽에 명중·회피 축이 없어(monster.csv) v1 은 **영웅의 회피만** 적용한다.
 *   타겟팅: 진형·어그로 미확정 → 랜덤.
 *   스킬: 액티브 슬롯은 아직 비어 있다(스킬 효과 미작성) — 기본 공격만 돈다. 구조는 battle_design §3 대로 남긴다.
 */

const TICK = 0.1;

/**
 * @param {object} data
 *   balance, monsters(byId), stages(byId), roundTypes [{round_num, round_type}],
 *   budgets(byKey: normal/elite/stage_boss/chapter_boss), grades(byKey), sins [...],
 *   sinTraits {sin: trait}, commonTraits [trait...], itemSystem
 */
export function createBattleSystem(data) {
    const B = data.balance;
    const r1 = v => Math.round(v * 10) / 10;

    const stagePool = stage => Object.values(data.monsters)
        .filter(m => m.chapter === stage.chapter && m.stage_num === stage.stage_num && m.spawn_grade === 'normal')
        .map(m => m.monster_idx);

    /** 몬스터 소재값 × 등급 배율 × 전역 스케일 → 전투 유닛 */
    function makeEnemy(key, monsterId, grade, extra = {}) {
        const m = data.monsters[monsterId];
        const g = data.grades[grade];
        const hp = Math.round(m.hp * g.hp_mult * B.monster_hp_scale);
        return {
            key, side: 'enemy', monsterId, grade,
            hp, hpMax: hp,
            atk: m.attack * g.atk_mult * B.monster_atk_scale,
            atkType: m.attack_type,
            def: m.defense * g.def_mult, mdef: m.magic_defense * g.def_mult,
            period: m.action_period, next: 0,
            eva: 0, crit: 0, critDmg: B.base_crit_damage_pct, ls: 0, dmgBonus: 0,
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
        const add = (id, grade, extra) => list.push(makeEnemy(`e${k++}`, id, grade, extra));

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

    /** 피해 1회 — 임시식: atk × 편차 × 치명 − 방어(타입별), 최소 1 */
    function damage(rng, a, d) {
        const varPct = B.dmg_variance_pct / 100;
        const crit = rng() * 100 < a.crit;
        let v = a.atk * (1 - varPct + rng() * varPct * 2);
        if (crit) v *= a.critDmg / 100;
        v *= 1 + a.dmgBonus / 100;
        v -= a.atkType === 'magic' ? d.mdef : d.def;
        return { dmg: Math.max(1, Math.round(v)), crit };
    }

    /**
     * @param partyUnits [{uid, combat:{...}}] — heroSystem.computeCombat 결과
     * @returns 결과 + 타임라인. 타임라인은 재생용이라 세이브에 넣지 않는다 (리포트만 남긴다)
     */
    function simulate(partyUnits, stageId, rng) {
        const stage = data.stages[stageId];
        const pool = stagePool(stage);
        const rounds = B.rounds_per_stage;

        const party = partyUnits.map((p, i) => {
            const c = p.combat;
            return {
                key: `p${i}`, side: 'party', uid: p.uid,
                hp: c.hp_max, hpMax: c.hp_max,
                atk: c.atk_physical ?? c.atk_magic ?? 0, atkType: c.attack_type,
                def: c.defense, mdef: c.magic_defense,
                eva: Math.min(c.evasion, B.evasion_cap_pct),
                crit: c.crit_rate, critDmg: c.crit_damage, ls: c.life_steal,
                dmgBonus: c.dmg_bonus_pct, period: c.action_period,
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
            timeline, xpTotal: 0, gold: 0, dust: 0, kills: {}, drops: [], downed: [],
            roundsCleared: 0, rounds: [],
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

        const act = u => {
            const foes = alive(u.side === 'party' ? enemies : party);
            if (foes.length === 0) return;
            const target = foes[Math.floor(rng() * foes.length)];   // 타겟팅 미확정 → 랜덤
            if (target.eva > 0 && rng() * 100 < target.eva) {
                timeline.push({ t: r1(t), e: 'dodge', a: u.key, d: target.key });
                return;
            }
            const { dmg, crit } = damage(rng, u, target);
            target.hp = Math.max(0, target.hp - dmg);
            const ev = { t: r1(t), e: 'hit', a: u.key, d: target.key, dmg, crit, dhp: target.hp };
            if (u.ls > 0 && u.hp > 0) {
                u.hp = Math.min(u.hpMax, u.hp + Math.round(dmg * u.ls / 100));
                ev.ahp = u.hp;
            }
            timeline.push(ev);
            if (target.hp <= 0) {
                timeline.push({ t: r1(t), e: 'down', u: target.key });
                if (target.side === 'enemy') onKill(target);
                else out.downed.push(target.uid);
            }
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

    return { simulate, stagePool };
}
