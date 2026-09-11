/**
 * 전투 시뮬레이터 — **헤드리스**. 파티·스테이지·시드를 받아 결과와 타임라인을 돌려준다.
 * 화면(ui/battle.js)은 이 타임라인을 재생만 한다 — 관전으로 본 전투와 즉시 계산이 갈릴 수 없다.
 * 같은 입력 + 같은 시드 = 같은 타임라인 (엔진 이식 후 대조 검증의 기준).
 *
 * battle_design.md 확정 규칙 (그대로 반영):
 *   · 라운드 구조는 **스테이지가 고르는 세트** — stage.csv:round_set → stage_round.csv. 보통 스테이지는 9라운드(정예 3·6 / 보스 9),
 *     챕터보스 스테이지는 **보스 1라운드**다 (base_expedition_design §1-2 개정 2026-09-11). 편성은 round_budget.csv
 *   · 행동 주기 단일 축 (공격/캐스팅 같은 시계), 한 차례에 하나
 *   · **몬스터도 영웅과 같은 모양이다** — 직업 · 기본 능력치 7종 · 고유 스킬 · 장비 (monster_design §5-1 · 사용자 지시 2026-09-11).
 *     ~~몬스터 소재값(monster.csv) × 등급 배율(spawn_grade.csv)~~ 은 폐기 — `hp`·`attack`·`action_period` 컬럼이 없어졌다
 *   · 용어는 "사망"이 아니라 **전투불능** — 라운드 사이 회복 없음. 회복은 전투 안에서만 일어나고
 *     전투 밖으로 나오면 전원 즉시·무료 회복이다 [2026-09-06, base_expedition_design §1-1]
 *
 *   · 피해 계산은 formula.js — battle_design §9 (적중 게이트 → 타격 피해 → 감소). 이 파일은 **누가 언제 때리는가**만 본다
 *   · **몬스터는 영웅과 같은 전투 능력치 체계를 쓴다** (§8-1) — 같은 `strike` 에 같은 모양의 유닛이 양쪽으로 들어간다.
 *     몬스터 방어 200과 영웅 방어 200은 정확히 같은 감쇠를 만든다. 저항은 양쪽 다 **4원소 객체 · 직접 %**
 *   · 적중은 **레벨 차 0/1 게이트** (§9-4) — 영웅은 자기 레벨, 몬스터는 스테이지 dlvl. 빗나가면 흡혈·반사도 유발되지 않는다
 *   · 원소: 몬스터는 스테이지 원소(monster.csv:attack_type) · 영웅은 **물리** — 마법 무기의 원소는 관련 옵션이 붙었을 때만 생긴다
 *     (§2-1 · §9-5 · 개정 2026-09-11 · R80). 그래서 몬스터의 `attack_type` 은 `computeCombat` 결과를 **덮는다**
 *   · 반사는 비직격 — 감쇠·치명 없이 공격자 HP 를 직접 깎고 아무것도 유발하지 않는다 (§9-6)
 *
 *   · **유닛 생성은 `makeUnit` 하나다** — 영웅도 몬스터도 같은 생성자를 지난다 (§8-1). 그리고 **전투 능력치를 만드는 함수도 하나다**
 *     [개정 2026-09-11 · R79] — ~~`combatFromMonster`~~ 는 삭제되고 몬스터도 `heroSystem.computeCombat` 을 지난다.
 *     필드 이름이 같아서가 아니라 **같은 함수라서** 같다 — 양쪽 유닛이 갈릴 수 없다.
 *     `atk_pct` 버프는 **새 곱셈 층이 아니라 상시 % 와 같은 괄호에 덧셈**이다 (§9-2 "괄호는 둘뿐") —
 *     그래서 유닛이 `atkBase`(괄호 앞) 와 `atkPct`(괄호 안 Σ 상시 %) 를 따로 든다.
 *   · **액티브 스킬의 실행은 `skill_runtime.js`** (battle_design §3 · §6 · §7 · skill_design §9) — 정의·배정·선택은 skill.js.
 *     이 파일에 남는 것은 **전투 진행**이다: 직격 1회(`strikeOnce`) · 타겟팅 · 전투불능 · 라운드 편성 · 정산.
 *     배리어는 HP 밖 흡수 풀이고, 흡혈·반사는 **배리어가 먹은 몫을 포함한 dmg** 에 비례한다(직격이 들어간 사실은 같다).
 *   · **스킬 계수** (skill_design §13 · 2026-09-10) — 영웅 유닛은 기본 능력치(`stats`)를 들고, 런타임이 시전 순간 `skill.scaleDef` 로
 *     실효 정의를 만든다. 스킬 타격은 능력치 항(`flat`)·추가 피해(`procChance`/`procMult`)를 `strikeOnce` 에 싣는다 — 기본 공격은 안 싣는다.
 *   · **사건 훅** — `strikeOnce` 가 `hit`/`hitTaken`/`kill` 을, `downed` 가 `down` 을, 런타임이 `cast` 를 발화한다.
 *     유닛의 `reactions` 가 비면 아무 일도 없다 — 발화 **지점**이 곧 rng 순서 계약이다 (INTERFACE §5-2).
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   ~~타겟팅: 진형·어그로 미확정 → 랜덤~~ **확정 2026-09-09** — 대상 선택은 **전열 우선(하드 게이트)**이다:
 *     전열 생존자가 있으면 후열은 대상이 안 되고, 전열이 전멸해야 뒤가 열린다 (battle_design §3-1).
 *     우선순위는 **좁은 계약부터** — 지목(결투) → 도발 → 전열 → 무작위. 앞의 둘은 진형을 무시한다.
 *   유닛의 `reactions`(사건 훅 등록)는 **자리만** 있고 싣는 소비자가 없다 — 마스터리 T3 몫 (skill_design §5).
 *   `skill.csv:status`(결빙 등)는 `status_effect.csv` 가 없어 코드가 읽지 않는다.
 *   전직·마스터리·패시브는 미구현 — 지금 도는 것은 직업 기본 액티브뿐이다 (프로토타입 §9-0).
 *   ~~몬스터의 치명·반사·피해 감소는 0~~ → **[폐기 2026-09-11 · D2 사용자 확정]** 몬스터도 **영웅과 같은 밑수**를 받는다
 *     (기본 치명 확률 · HP 재생 밑수) — 「몬스터를 영웅과 같은 구조로」가 목적이라 특수 분기를 두지 않는다.
 *     반사·피해 감소는 여전히 접사·정예 특성이 붙을 때만 값이 생긴다. ⚠ battle_design §8-1 출처 표의
 *     「치명·재생은 정예 특성이 얹는다」와 부딪히는 것을 알고 택했다 (DEV_PLAN R79).
 *   도감 카드: 처치마다 장비 드롭과 **별개로** 카드 판정 (monster_design §8) — 결과 cards 와 타임라인 'card' 이벤트.
 *
 *   · **드롭 = 그 몬스터가 입고 있던 장비다** [개정 2026-09-11 · R79 · item_design §1 2단계]. **처치당 최대 1개**(08-27)는
 *     그대로이고 판정도 1회 · 등급은 확률 배율(`spawn_grade.csv:drop_chance_mult`)이다. 바뀐 것은 **무엇이 떨어지나** —
 *     판정 뒤 **입은 부위 중 하나**를 골라 그 아이템을 그대로 낸다. 파이프라인 3~6단계(ilvl · 희귀도 · 접사 · 개체 굴림)는
 *     **스폰으로 옮겨갔다**(`spawnRound`) — 그래서 등급 반영이 해소됐다(~~DEV_PLAN R20~~): ilvl = `dlvl + gear_ilvl_add`(굴림 없음) ·
 *     희귀도 = 파티 평균 매직찬스 + `gear_rare_bonus_pct`. ⚠ 굴림 수가 **스폰 수**를 따라가고, 파티의 매직찬스가 **적 장비도 좋게 한다**
 *     (사용자가 알고 택한 「이스터에그」). 적의 소환 벽은 처치가 아니다 — `onKill` 을 안 지난다.
 */

import { createFormula } from './formula.js';
// 원소 어휘만 가져온다 — 시스템 주입이 아니다 (skill.js 와 같은 취급 · INTERFACE §1)
import { ELEMENTS } from './hero.js';
import { createHooks, createSkillRuntime } from './skill_runtime.js';
import { refreshDerived, weaponOnHit } from './skill_effects.js';

const TICK = 0.1;

/**
 * @param {object} data
 *   balance, monsters(byId), stages(byId), roundSets {round_set: [{round_num, round_type}]} (세트마다 round_num 순),
 *   budgets(byKey: normal/elite/stage_boss/chapter_boss), grades(byKey), sins [...],
 *   sinTraits {sin: trait}, commonTraits [trait...], itemSystem,
 *   skillSystem — skill.js (정의·발동 선택). 없으면 액티브 없이 기본 공격만 돈다,
 *   heroSystem — hero.js. **몬스터도 `computeCombat` 을 지난다** (§8-1 「계산이 한 곳」 · 신설 2026-09-11 R79),
 *   classSkills {classId: [skillId]} — 보스 셋째 스킬 칸의 후보 풀. item·hero 에 넘기는 **같은 표**다 (신설 2026-09-11 R79),
 *   slots [partId] — 장비 부위 어휘. `monster.csv:wear_slots` 검증에만 쓴다 (신설 2026-09-11 R79),
 *   monsterRoles {role: {rank}} — `monster_role.csv`. **적의 자리**를 정한다 (진형 확정 2026-09-09).
 *     모르는 역할은 **전열(0)** 로 떨어뜨린다 — 빠뜨린 몬스터가 뒤에 숨어 무적이 되는 것보다 앞에 서는 편이 안전하다
 */
export function createBattleSystem(data) {
    const B = data.balance;
    const F = createFormula(B);
    const SK = data.skillSystem ?? null;
    const HS = data.heroSystem ?? null;            // 몬스터도 computeCombat 을 지난다 (R79)
    const CLASS_SKILLS = data.classSkills ?? {};   // 보스 셋째 칸의 후보 풀 (R79)
    if (!HS) throw new Error('battle: heroSystem 이 없다 — 몬스터도 computeCombat 을 지난다 (INTERFACE §2-6)');
    // 적의 랭크 — `monster.csv:role` → `monster_role.csv:rank` (0 전열 · 1 후열). 화면이 들고 있던 규칙을 CSV 로 올린 것이다
    const ROLES = data.monsterRoles ?? {};
    const rankOfRole = role => ROLES[role]?.rank ?? 0;
    const EPS = SK ? SK.EPS : 0;                // 준비·만료 판정 허용 오차 (skill.js — INTERFACE §5-3)
    const r1 = v => Math.round(v * 10) / 10;

    /** 입는 부위 — `monster.csv:wear_slots` 를 `|` 로 가른다. **이 순서가 장비 굴림 순서**다 (INTERFACE §5-2) */
    const wearSlots = m => String(m.wear_slots ?? '').split('|').filter(Boolean);

    /*
     * 몬스터 모양 검증 — **로드에서 멈춘다** (`roundSets` 검사와 같은 이유 · 2026-09-11 R79). 오타가 조용히 새면
     *   빈 스킬 풀 · 없는 무기군 · 알 수 없는 부위가 되어 전투 도중에 터지거나 조용히 칸이 빈다.
     */
    {
        const PARTS = new Set(data.slots ?? []);
        for (const m of Object.values(data.monsters)) {
            const at = m.monster_idx;
            if (!(m.cls in CLASS_SKILLS)) throw new Error(`battle: 몬스터 ${at} 의 직업 '${m.cls}' 를 모른다`);
            if (!data.itemSystem.groupOf({ slot: 'weapon', group: m.weapon_group })) throw new Error(`battle: 몬스터 ${at} 의 무기군 '${m.weapon_group}' 를 모른다`);
            if (m.innate_skill !== '-' && SK && !SK.defs[m.innate_skill]) throw new Error(`battle: 몬스터 ${at} 의 고유 스킬 '${m.innate_skill}' 를 모른다`);
            const ws = wearSlots(m);
            if (!ws.includes('weapon')) throw new Error(`battle: 몬스터 ${at} 의 wear_slots 에 weapon 이 없다 — 무기가 밑수다`);
            if (PARTS.size) for (const s of ws) if (!PARTS.has(s)) throw new Error(`battle: 몬스터 ${at} 의 wear_slots 부위 '${s}' 를 모른다`);
        }
        for (const g of Object.values(data.grades)) {
            if (!(g.skill_slots >= 1)) throw new Error(`battle: 등급 ${g.grade} 의 skill_slots 가 없다 (spawn_grade.csv)`);
        }
    }

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
     * 스테이지의 라운드 줄 — `stage.csv:round_set` 이 `stage_round.csv` 의 세트 하나를 고른다 (base_expedition_design §1-2 · 2026-09-11).
     * **라운드 수 = 그 세트의 행 수**다 — 전역 라운드 수 키(~~`rounds_per_stage`~~)는 없다. 챕터보스 스테이지는 보스 한 줄뿐이다.
     * 화면(라운드 트랙 · 예상 소요 · 리포트 총수)도 이것을 부른다 — 렌더러가 세트를 고르면 규칙이 화면 층에 샌다 (`stageElement` 와 같은 이유)
     */
    const stageRounds = stage => data.roundSets[stage.round_set];
    // 세트가 없는 스테이지는 **로드에서 멈춘다** — 전투 도중에 라운드가 비면 원인이 안 읽힌다
    for (const st of Object.values(data.stages)) {
        if (!stageRounds(st)?.length) throw new Error(`battle: 스테이지 ${st.stage_id} 의 round_set '${st.round_set}' 가 stage_round.csv 에 없다`);
    }

    /**
     * 전투 유닛 하나 — **영웅도 몬스터도 여기를 지난다** (§8-1). 필드명은 `formula.strike` 가 읽는 이름 그대로다.
     * `c` 는 `hero.computeCombat` 결과다 — **몬스터도 같은 함수를 지난다**(2026-09-11 R79 · `makeEnemy`) —
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
            // 창이 미는 축은 **밑수를 따로 든다** — `refreshDerived` 가 창 합으로 파생값을 다시 쓰고,
            //   창이 하나도 없을 때 원값으로 돌아갈 자리가 필요해서다 (skill_effects:EFFECTS.derive)
            def: c.defense, defBase: c.defense,
            hpMaxBase: c.hp_max,
            res: { fire: c.res_fire, cold: c.res_cold, lightning: c.res_lightning, poison: c.res_poison },
            resBase: { fire: c.res_fire, cold: c.res_cold, lightning: c.res_lightning, poison: c.res_poison },
            lvl: c.level,                            // 적중률의 레벨 — 몬스터는 스테이지 dlvl (§9-4)
            resMaxBonus: c.res_max_bonus, dr: c.damage_reduction, drBase: c.damage_reduction,
            defIgnore: c.def_ignore, resReduction: c.res_reduction,
            skillMult: 1, bonusPct: c.dmg_bonus_pct, // 도감·특효 보정 — strike 가 읽는 이름과 같아야 한다
            crit: c.crit_rate, critDmg: c.crit_damage, ls: c.life_steal, reflect: c.reflect_damage,
            // sustain 두 축 중 재생 쪽 (battle_design §8) — 초당 회복이라 틱마다 누산한다
            regen: c.hp_regen ?? 0, regenBase: c.hp_regen ?? 0, regenAcc: 0,
            cdr: c.cooldown_reduction ?? 0,          // 표기 쿨 단축 % — 시전 시점에 곱한다
            period: c.action_period, basePeriod: c.action_period,
            next: 0,
            actives: [], buffs: {}, barrier: null,
            reactions: [],                           // 사건 훅 등록 자리 (⚠ 지금은 아무도 싣지 않는다)
            goldFind: c.gold_find, itemFind: c.item_find,
            // 무기 옵션 묶음 [2026-09-11 · R78] — 조건부 % · 타격 시 창 · 강타 · 매직아이템 획득확률. 없으면 null(몬스터·소환·옵션 없는 영웅)
            //   `strikeOnce` 는 `fx` 가 있을 때만 읽는다 — 타격마다 아이템을 훑지 않게 전투 시작에 한 번 묶어 둔다
            fx: c.option_fx ?? null, magicFind: c.option_fx?.magicFind ?? 0,
            // 기본 능력치 — 영웅은 `partyUnits[].stats`, **몬스터는 `monster.csv` 의 7컬럼**이 extra 로 들어온다 (2026-09-11 R79).
            //   기본값 null 은 **소환**의 몫이다 — null = 스킬 계수 0 (skill.js scaleDef · 2026-09-10)
            stats: null,
            // 스킬 타격 전용 — `strikeOnce` 가 그 타격 동안만 얹고 원복한다(능력치 항 · 추가 피해 확률·배수). 평소 0
            flat: 0, procChance: 0, procMult: 0,
            ...extra,
        };
    }

    /**
     * 소환 유닛 — **HP 와 대상 풀 참여만** 있는 유닛 (skill_design §12-6 프로즌월).
     * 행동하지 않으므로 행동 주기도 AI 도 대상 선택도 없다 — `next: Infinity` 라 차례가 영원히 안 온다.
     * 공격·방어 축은 전부 0 이고 HP 만 든다: **펫 서브시스템을 여는 것이 아니다**(기획 §12-6 이 못박은 구분).
     * @param caster 시전자 · @param def 스킬 정의(`mult` = 시전자 최대 HP 의 % · `flat` = 능력치 항 — 런타임이 `scaleDef` 를 지난 것을 넘긴다) · @param key 유닛 키
     */
    function makeSummon(caster, def, key) {
        const hp = Math.max(1, Math.round(caster.hpMax * def.mult / 100 + (def.flat ?? 0)));
        const zero = {
            hp_max: hp, atk_physical: 0, atk_magic: 0, atk_pct_sum: 0, attack_type: 'physical',
            defense: 0, res_fire: 0, res_cold: 0, res_lightning: 0, res_poison: 0,
            level: caster.lvl, res_max_bonus: 0, damage_reduction: 0, def_ignore: 0, res_reduction: 0,
            dmg_bonus_pct: 0, crit_rate: 0, crit_damage: 0, life_steal: 0, reflect_damage: 0,
            hp_regen: 0, cooldown_reduction: 0, action_period: 0, gold_find: 0, item_find: 0,
        };
        // ⚠ **소환물은 전열에 선다** [임시 2026-09-09] — 벽의 목적이 대상 풀 희석인데 후열에 세우면
        //   전열 우선(§3-1) 아래에서 아무도 안 때려 존재가 사라진다. **자리는 기획 미확정**이다 (GAME_DESIGN §10 「소환 벽의 자리」)
        return makeUnit(caster.side, zero, { key, summon: true, summonOf: caster.key, next: Infinity, rank: 0 });
    }

    /**
     * 몬스터 → 전투 유닛. **영웅과 같은 함수를 지난다** [전면 개정 2026-09-11 · R79 · 사용자 지시 ·
     *   monster_design §5-1 · battle_design §8-1]. ~~`combatFromMonster`~~ 는 삭제됐다 —
     *   필드 이름을 맞추는 것이 아니라 **같은 `computeCombat` 을 부른다**. 그래서 「계산이 한 곳」이 문자 그대로 성립하고
     *   이식 대조도 한 함수로 양쪽을 검증한다.
     *
     * 입력 = **레벨과 무관한 모양**(직업 · 기본 능력치 7 · 고유 스킬) + **스폰 때 굴린 장비**.
     *   크기는 던전 레벨과 등급이 장비로 준다 — ~~소재값 × 등급 배율~~ 은 컬럼째 없어졌다(`hp`·`attack`·`action_period`).
     * 몬스터 전용으로 남는 것은 세 줄뿐이다:
     *   ① **몸값 합류** — `defense` · `res_*` 는 몸이 들고 장비가 그 **위에** 더한다 [사용자 확정 · monster_design §7].
     *      도감이 저항을 공략 정보로 적고(§8) 굴린 장비로 판마다 요동치면 「이 원소를 막았나」가 안 읽히기 때문이다(§9-5)
     *   ② **몬스터 전용 전역 배율** — 합계에 곱한다(캘리브레이션 조절값). 등급 세기는 `hp_mult` 하나만 남았다 —
     *      **HP 는 장비에서 안 오기 때문**이다(영웅 체계에서 HP 는 레벨이 준다). ~~`atk_mult`·`def_mult`·`res_add`~~ 퇴역
     *   ③ **`attack_type` 덮기** — 원소를 정하는 것은 **스테이지**다 (monster_design §2). `computeCombat` 은 R80 으로 언제나 `physical` 을 낸다
     *
     * ⚠ 치명·재생 **밑수도 영웅과 같이 받는다** [D2 사용자 확정 2026-09-11] — 특수 분기를 두지 않는 것이 목적이라
     *   `crit_rate`·`hp_regen` 을 0 으로 덮지 않는다. 마법 무기를 낀 몬스터는 `atk_magic`(= matk)을 갖는다(monster_design §5-1 이 인정).
     * 보상 축(경험치·골드·드롭 배율)은 영웅에게 없는 필드라 등급에서 따로 얹는다.
     * @param gear 그 몬스터가 **입고 있는** 아이템 배열 (`item.rollGear` 결과). 비면 맨몸이다 — 검증에서 한 마리만 만들 때 쓴다
     * @param extra `thirdSkill` 은 여기서 꺼내 스킬 칸으로 보내고 나머지는 유닛에 그대로 얹는다
     */
    function makeEnemy(key, monsterId, grade, lvl, gear = [], extra = {}) {
        const m = data.monsters[monsterId];
        const g = data.grades[grade];
        const { thirdSkill = null, ...rest } = extra;
        const stats = { str: m.str, agi: m.agi, int: m.int, vit: m.vit, luck: m.luck, ldr: m.ldr, cha: m.cha };
        // 영웅과 같은 경로 — `mastery` 가 없으니 마스터리 몫은 0 이고 `codex`·`party` 도 안 넘긴다
        const c = HS.computeCombat({ stats, level: lvl, cls: m.cls, innate: m.innate_skill }, gear);
        c.defense += m.defense;                                             // ①
        for (const el of ELEMENTS) c[`res_${el}`] += m[`res_${el}`];        // ①
        c.hp_max = Math.round(c.hp_max * g.hp_mult * B.monster_hp_scale);   // ②
        if (c.atk_physical !== undefined) c.atk_physical *= B.monster_atk_scale;
        if (c.atk_magic !== undefined) c.atk_magic *= B.monster_atk_scale;
        c.defense *= B.monster_def_scale;
        c.attack_type = m.attack_type;                                      // ③
        /*
         * 스킬 칸 — **등급이 연다** (skill_design §2 · monster_design §5-1): 일반 = 고유 1 · 정예 = + 낀 무기가 든 스킬 ·
         *   보스 = + 셋째 칸. **칸은 출처 자리**라 「있는 것 중 앞에서 n개」가 아니다 — 그래서 열리지 않은 출처를
         *   `activesFor` 에 **넘기지 않는다**(고유가 비었다고 무기 스킬이 1번 칸으로 올라오면 안 된다).
         */
        const slots = g.skill_slots;
        // ⚠ `activesFor` 는 **인스턴스**(`{id, source}`)를 낸다 — 파티 경로와 같이 **정의를 풀고 `readyAt` 을 얹어야** 한다.
        //   안 풀면 `skill.castable(def, …)` 이 undefined 를 읽는다 (INTERFACE §2-6 「전투 유닛」 actives 행)
        const acts = SK ? SK.activesFor({ innate: m.innate_skill }, {
            weaponSkill: slots >= 2 ? gear.find(it => it.slot === 'weapon')?.skill : null,
            thirdSkill: slots >= 3 ? thirdSkill : null,
        }).map(a => {
            const def = SK.resolve(a);
            if (!def) throw new Error(`battle: 몬스터 ${monsterId} 의 알 수 없는 스킬 ${a?.id ?? a}`);
            return { id: a.id, def, readyAt: 0, source: a.source };
        }) : [];
        return makeUnit('enemy', c, {
            key, monsterId, grade, gear,
            rank: rankOfRole(m.role),        // 진형 — 역할이 자리를 정한다 (battle_design §3-1)
            monsterType: m.monster_type,     // 종족(Normal/Demon/Undead) — 무기 옵션 vs 종족이 읽는다 (R78)
            cls: m.cls,                      // 직업 — 스킬 풀과 무기군을 정한다. 자리는 role 이 정한다 (monster_design §5-1)
            stats,                           // 기본 능력치 — 스킬 계수가 시전 순간 읽는다 (skill.js scaleDef)
            actives: acts,
            expReward: m.exp_reward * g.exp_mult, goldMult: g.gold_mult, dropChanceMult: g.drop_chance_mult,
            ...rest,
        });
    }

    const pickTwo = (rng, arr) => {
        const a = Math.floor(rng() * arr.length);
        let b = Math.floor(rng() * arr.length);
        if (b === a) b = (b + 1) % arr.length;
        return [arr[a], arr[b]];
    };

    /**
     * 라운드 편성 — 구조는 그 스테이지의 세트(stage_round), 내용물은 예산(round_budget) 안에서 랜덤.
     * 챕터보스 스테이지는 일반몹 풀이 비어 있지만 호위 예산이 0 이라 `pick` 을 한 번도 안 부른다 — 호위 수 굴림(1회)은 그대로 돈다
     *
     * **2단이다** [개정 2026-09-11 · R79 · INTERFACE §5-2]:
     *   **1단 편성** — 누가 나오나. 굴림 순서·횟수가 **종전과 같다**
     *   **2단 장비·스킬** — 편성이 확정된 뒤 목록 순서로 유닛마다 `rollGear` 한 벌 + (보스면) 셋째 스킬 1회
     *
     * ⚠ **1단이 2단보다 앞인 것이 계약이다** — 장비 굴림이 편성 굴림을 밀면 같은 시드가 다른 편성을 낸다
     *   (`rollFace` 를 맨 뒤에 두는 것 · `searchRoll` 의 「결과를 먼저, 이야기를 뒤에」와 같은 규칙).
     * ⚠ **전역 상한도 1단에서 자른다** — 잘릴 유닛의 장비를 굴리면 수열이 편성 상한에 종속된다.
     * @param magicFind 파티 평균 매직아이템 획득확률 % — 장비 희귀도의 레어 가중치에 곱한다 (item_design §1 4단계)
     */
    function spawnRound(rng, stage, pool, n, magicFind = 0) {
        const type = stageRounds(stage).find(r => r.round_num === n)?.round_type ?? 'normal';
        const budgetKey = type === 'boss' ? stage.boss_grade : type;
        const bd = data.budgets[budgetKey];
        const pick = () => pool[Math.floor(rng() * pool.length)];
        const between = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
        const specs = [];
        const add = (id, grade, extra) => specs.push({ id, grade, extra });

        /* ── 1단 편성 (굴림 순서·횟수 불변) ── */
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
        const kept = specs.slice(0, B.wave_monster_max);

        /* ── 2단 장비·스킬 ── */
        const list = kept.map((s, k) => {
            const m = data.monsters[s.id];
            const g = data.grades[s.grade];
            // 아이템 레벨은 **굴리지 않는다** — 던전 레벨 + 등급 가산이다 (item_design §1 3단계 · 사용자 확정 2026-09-11)
            const gear = data.itemSystem.rollGear(rng, {
                slots: wearSlots(m),
                ilvl: stage.dlvl + g.gear_ilvl_add,
                magicFind,
                rareBonusPct: g.gear_rare_bonus_pct,
                weaponGroup: m.weapon_group,
            });
            // 셋째 칸 — 보스만. ⚠ **풀이 비어도 1회 소비한다**(무기 베이스·스킬 굴림과 같은 규칙)
            let thirdSkill = null;
            if (g.skill_slots >= 3) {
                const cp = CLASS_SKILLS[m.cls] ?? [];
                const tr = rng();
                thirdSkill = cp.length ? cp[Math.floor(tr * cp.length)] : null;
            }
            return makeEnemy(`e${k}`, s.id, s.grade, stage.dlvl, gear, { ...s.extra, thirdSkill });
        });
        return { type, list };
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
        const rounds = stageRounds(stage).length;      // 그 세트의 행 수 — 챕터보스 스테이지는 1 (2026-09-11)

        // 파티 유닛 — 몬스터와 **같은 생성자**를 지난다 (§8-1). 자리가 정하는 것만 extra 로 얹는다
        const party = partyUnits.map((p, i) => makeUnit('party', p.combat, {
            key: `p${i}`, uid: p.uid,
            stats: p.stats ?? null,      // 기본 능력치 — 스킬 계수가 시전 순간 읽는다 (skill.js scaleDef · 2026-09-10)
            rank: p.rank ?? 0,           // 진형 — 편성이 정한 자리 (state.formationState · 배치가 없으면 전열)
            next: i * 0.3,               // 첫 차례를 살짝 엇갈리게 — 동시 발동 시각 차이만 준다
            reactions: p.reactions ?? [],   // ⚠ 싣는 소비자가 아직 없다 — 마스터리 T3 자리
            // 전투 시작 시 액티브는 전부 준비(readyAt 0) — 첫 차례는 **1번 칸**이 나간다 (battle_design §6)
            actives: (SK ? p.actives ?? [] : []).map(a => {
                const def = SK.resolve(a);
                if (!def) throw new Error(`battle: 알 수 없는 스킬 ${a?.id ?? a}`);
                return { id: a.id, def, readyAt: 0, source: a.source };
            }),
        }));
        /*
         * 오오라 — **쿨 없이 상시이고 행동을 안 먹는다** (skill_design §1-5). 그래서 액티브 칸에서 빼고
         *   전투 시작에 `until: Infinity` 창으로 건다: 창 만료가 영원히 안 걸리므로 상시가 되고,
         *   `pickReady` 가 안 보므로 차례를 안 먹는다.
         * **한 번에 하나만** — 켤 것을 고르는 화면이 없어 **칸 순서 첫 오오라**를 켠다 (⚠ 임시 · SCREEN_DESIGN 미작성).
         * ⚠ 파티원이 각자 다른 오오라를 들면 파티에 둘이 겹친다 — 「하나만」이 지금은 **시전자 단위**다 (기획 §7).
         */
        // **적도 같은 규칙이다** [2026-09-11 · R79] — 몬스터가 스킬 칸을 갖게 되어 오오라를 들 수 있다(기사 무기를 낀 정예 · 기사 고유).
        //   그래서 이 루프를 배열 하나를 받는 함수로 두고 파티는 여기서 한 번, 적은 **라운드마다** `beginRound` 가 부른다.
        //   안 빼면 오오라가 쿨 0 액티브가 되어 **매 차례 시전만 반복**한다. rng 를 안 쓴다 · 이벤트를 안 낸다(파티와 같다)
        const applyAuras = side => {
            for (const p of side) {
                const aura = p.actives.find(a => a.def.kind === 'aura');
                p.actives = p.actives.filter(a => a.def.kind !== 'aura');
                if (!aura) continue;
                const targets = aura.def.target === 'self' ? [p] : side;
                // 오오라의 세기도 **시전자 능력치로 민 값**이다 — 걸 때 한 번 (skill.js scaleDef · 2026-09-10)
                const eff = SK.scaleDef(aura.def, p.stats);
                for (const tgt of targets) {
                    tgt.buffs[aura.id] = { stat: aura.def.stat, v: eff.value, until: Infinity, element: aura.def.element ?? null, by: p.key };
                }
            }
            for (const p of side) refreshDerived(p);
        };
        applyAuras(party);

        const avg = k => party.reduce((s, p) => s + (p[k] ?? 0), 0) / Math.max(1, party.length);
        const goldMult = 1 + avg('goldFind') / 100;
        const dropMult = 1 + avg('itemFind') / 100;
        const magicFind = avg('magicFind');            // 매직아이템 획득확률 % — 드롭의 레어 가중치에 곱한다 (item_design §1 「무기 옵션」 · R78)
        // 무기 옵션 타격 시 창의 길이 (R78) — 전투 시작에 한 번 묶는다
        const windowSec = { def: B.weapon_def_down_sec, res: B.weapon_res_down_sec, atk: B.weapon_atk_down_sec };

        const timeline = [];
        const out = {
            won: false, reason: null, durationSec: 0,
            // atk·matk·atkType 은 **툴팁이 읽는 표시값**이다 (SCREEN_DESIGN §4-2) — 재생기가 스킬 문장의 피해·회복량을 조립한다.
            // stats 는 기본 능력치의 **복사본**이다(설명창이 스킬 계수를 풀어 쓴다 · 2026-09-10) — 정산(grantXp)이 전투 뒤에 능력치를 올린다.
            // 전투에는 안 쓰이고 타임라인에도 안 들어가므로 rng·골든 지문과 무관하다
            party: party.map(p => ({ key: p.key, uid: p.uid, hpMax: p.hpMax, period: p.period,
                atk: p.atk, matk: p.matk, atkType: p.atkType, stats: p.stats ? { ...p.stats } : null, actives: p.actives.map(a => a.id) })),
            timeline, xpTotal: 0, gold: 0, kills: {}, cards: {}, drops: [], downed: [],
            roundsCleared: 0, rounds: [], casts: {},
            // 빗나감 집계 — 레벨 부족의 전용 신호라 리포트에 따로 낸다 (§9-4·§9-8). 세는 것뿐이라 rng 소비 없음
            strikes: { party: { n: 0, miss: 0 }, enemy: { n: 0, miss: 0 } },
            // 기여 집계 — 영웅별 가한/받은 피해와 처치 수. 리포트가 「누가 얼마나 했나」를 그린다 (SCREEN_DESIGN §4-3).
            // 아래 `contrib` 맵이 세고 전투가 끝나면 여기로 옮긴다. **rng 를 안 쓰고 타임라인에도 안 들어간다** —
            // 세는 것뿐이라 전투 결과도 골든 수열도 안 건드린다 (`strikes` 와 같은 취급)
            contrib: [],
        };

        /* 기여 — **전투 시작 시점의 파티 전원**으로 자리를 미리 잡는다. 0 인 영웅도 줄이 서야
           「안 나갔다」와 「못 때렸다」가 갈린다 (SCREEN_DESIGN §4-3).
           ⚠ **소환물은 안 센다** — 행동하지 않아 가한 피해가 없고(`next: Infinity`), 얼음 벽이 맞은 것을
              주인이 맞은 것으로 적으면 「받은 피해」가 그 영웅의 사실이 아니게 된다 (skill_design §12-6) */
        const contrib = new Map(party.map(p => [p.uid, { uid: p.uid, dealt: 0, taken: 0, kills: 0 }]));
        const credit = u => (u.side === 'party' && !u.summon) ? (contrib.get(u.uid) ?? null) : null;

        let t = 0, round = 1;
        // 적 배열은 라운드마다 **갈아 끼운다** — 런타임이 속성으로 읽어야 옛 라운드를 가리키지 않는다 (skill_runtime @param units)
        const units = { party, enemies: [] };
        let roundLog = null;
        const alive = list => list.filter(u => u.hp > 0);
        const hooks = createHooks();
        // 액티브 실행은 런타임 몫 — 전투 하나마다 새로 만든다(모듈 전역 상태 없음)
        // 소환 유닛 키 — `p0`(파티) · `e0`(적) 과 겹치지 않는 `s0` 대역. 전투 하나 안에서만 센다
        let summonSeq = 0;
        const rt = createSkillRuntime({
            SK, B, rng, timeline, out, units,
            strikeOnce, pickTarget, r1, EPS, hooks,
            makeSummon: (caster, def) => makeSummon(caster, def, `s${summonSeq++}`),
        });

        const beginRound = () => {
            // 소환물은 **라운드가 끝나면 사라진다** (skill_design §12-6). 걷어내는 자리가 여기다 —
            //   적 배열이 갈리는 것과 같은 시점이라 결투 선언의 지목도 함께 사라진다(창이 적에게 붙어 있었다)
            for (let i = party.length - 1; i >= 0; i--) if (party[i].summon) party.splice(i, 1);
            // 결투의 **시전자 창**(받는 피해 감소)도 여기서 닫는다 [2026-09-10 · 사용자 원문 「라운드 끝까지 + 피해 감소」] —
            //   지목이 적 배열과 함께 사라지는 바로 이 시점이다. 창이 999초라 만료로는 안 닫힌다.
            //   rng 를 안 쓴다. 닫을 때 **기존 `buffEnd`** 를 낸다 — 만료(`skill_runtime.expire`)와 같은 모양이라 재생기가 칩을 걷는다
            //   (새 이벤트 종류가 아니다 · 이 라운드의 `round` 이벤트보다 앞선다)
            for (const p of party) {
                let closed = false;
                for (const [id, b] of Object.entries(p.buffs)) {
                    if (b.stat === 'dr_pct' && SK?.resolve({ id })?.stat === 'duel') {
                        delete p.buffs[id];
                        timeline.push({ t: r1(t), e: 'buffEnd', u: p.key, s: id });
                        closed = true;
                    }
                }
                if (closed) refreshDerived(p);
            }
            // 매직찬스는 **스폰 굴림**에 걸린다 [2026-09-11 · R79] — 장비 희귀도가 여기서 정해지기 때문이다.
            //   ⚠ 딸린 것 — 파티의 매직아이템 획득확률이 **적 장비도 좋게 한다**(사용자가 알고 택한 「이스터에그」)
            const sp = spawnRound(rng, stage, pool, round, magicFind);
            units.enemies = sp.list;
            // 적의 오오라 — 파티와 같은 규칙으로 **라운드 시작에** 창으로 건다 (R79 · 위 `applyAuras`). rng 0 이라 등장 지연 굴림 수열이 안 밀린다
            applyAuras(units.enemies);
            // 적 등장 시각 = 라운드 시작 + 짧은 지연 (전 라운드 마지막 타격과 겹치지 않게)
            for (const e of units.enemies) e.next = 0.4 + rng() * 0.6;
            roundLog = { n: round, kind: sp.type, killed: [], eliteSin: units.enemies.find(e => e.grade === 'elite')?.sin ?? null };
            out.rounds.push(roundLog);
            timeline.push({
                t: r1(t), e: 'round', n: round, kind: sp.type,
                enemies: units.enemies.map(e => ({
                    key: e.key, monsterId: e.monsterId, grade: e.grade, sin: e.sin ?? null,
                    traits: e.traits ?? null, hpMax: e.hpMax, period: e.period,
                    // 표시값 [2026-09-11 · R79 후속 · INTERFACE §2-6] — 재생기가 적 카드의 스킬 칸(`actives` = id · 칸 순서 = 출처 자리)과
                    //   그 툴팁 문장(피해·회복량 · 스킬 계수)을 그린다. `out.party[]` 의 같은 이름 필드와 같은 모양이고 전투에는 안 쓰인다.
                    //   ⚠ 파티 쪽과 달리 **타임라인 안**이라 골든 지문(`tl`)에 걸린다 — rng 는 0
                    atk: e.atk, matk: e.matk, atkType: e.atkType, stats: e.stats ? { ...e.stats } : null,
                    actives: e.actives.map(a => a.id),
                })),
            });
        };

        const onKill = e => {
            roundLog.killed.push(e.monsterId);
            out.kills[e.monsterId] = (out.kills[e.monsterId] ?? 0) + 1;
            out.xpTotal += e.expReward;
            out.gold += Math.round(e.expReward * e.goldMult * B.gold_rate * goldMult);
            // ~~정예·보스 처치가 가루를 뱉던 두 줄~~ 은 2026-09-09 삭제 — **처치가 뱉는 재료는 없다**
            // (item_design §5-3 확정 · GAME_DESIGN §9 09-09). 처치의 산출은 **장비 · 골드**뿐이다.
            // 가루 자체는 남는다 — 공급원이 **분해** 하나로 줄었을 뿐이다(`item.salvageDust`)
            // 도감 카드 — 장비 드롭과 별개 판정 [balance.csv:codex_card_drop_pct]. 등급별 차등은 후속 (monster_design §8)
            if (rng() * 100 < B.codex_card_drop_pct) {
                out.cards[e.monsterId] = (out.cards[e.monsterId] ?? 0) + 1;
                timeline.push({ t: r1(t), e: 'card', u: e.key, monsterId: e.monsterId });
            }
            // 드롭 판정 — **처치당 최대 1개** (item_design §1 확정 08-27). 등급은 굴림 횟수가 아니라
            // 확률 배율(spawn_grade.drop_chance_mult)이다 — 판정은 **1회**. 보스는 최소 1개 보장
            let got = rng() * 100 < B.drop_chance_pct * e.dropChanceMult * dropMult ? 1 : 0;
            if ((e.grade === 'stage_boss' || e.grade === 'chapter_boss') && got < B.boss_guaranteed_drop) got = B.boss_guaranteed_drop;
            /*
             * **떨어지는 것은 그 몬스터가 입고 있던 장비다** [개정 2026-09-11 · R79 · 사용자 지시 · item_design §1 2단계].
             *   여기서 아이템을 만들지 않는다 — 부위 · ilvl · 희귀도 · 접사 · 개체 굴림은 **스폰 때** 이미 돌았다(`spawnRound`).
             *   남은 굴림은 **입은 부위 중 하나를 고르는 1회**뿐이고, 그것이 「드롭 부위 편향의 단위」의 답이다 — 단위는 **입은 것**이다.
             * ⚠ 맨몸 몬스터는 판정이 성공해도 낼 것이 없다 — 아무것도 굴리지 않고 넘어간다.
             */
            for (let i = 0; i < got; i++) {
                const worn = e.gear ?? [];
                if (!worn.length) break;
                out.drops.push(worn[Math.floor(rng() * worn.length)]);
            }
        };

        const downed = u => {
            timeline.push({ t: r1(t), e: 'down', u: u.key });
            // 적의 **소환 벽은 처치가 아니다** [2026-09-11 · R79] — 몬스터 행이 없어 골드·경험치·카드·드롭 어느 것도 정의되지 않는다.
            //   R79 로 몬스터가 스킬 칸을 갖게 되어 처음 생긴 경로다(챕터보스 고유 `mag_frozenwall` 등). onKill 을 안 지나므로 **rng 도 안 쓴다**.
            //   ⚠ 파티 쪽 벽이 uid 없이 `out.downed` 에 실리는 것은 이 변경 **전부터** 있던 동작이라 손대지 않았다 (DEV_PLAN R79 보고)
            if (u.side === 'enemy') { if (!u.summon) onKill(u); }
            else out.downed.push(u.uid);
            // 처치 정산(드롭 rng)이 **먼저** 돌아야 훅이 rng 를 써도 순서가 잠긴다 (INTERFACE §5-2)
            hooks.emit('down', u, { t });
        };

        /* ── 전투 진행 — 타겟팅 · 직격 1회 · 전투불능 (액티브 실행은 skill_runtime.js) ── */

        /**
         * 전열만 남긴다 — 전열 생존자가 없으면 받은 목록 그대로다(후열이 곧 최전선이 된다).
         * 랭크가 없는 유닛은 **전열(0)** 로 본다 — 자리를 못 받은 유닛이 뒤에 숨어 무적이 되면 안 된다.
         */
        const frontOf = foes => {
            const front = foes.filter(f => (f.rank ?? 0) === 0);
            return front.length ? front : foes;
        };
        const pickFrom = pool => pool[Math.floor(rng() * pool.length)];

        /** 도발자 — `taunt` 창이 켜진 생존 유닛 중 배열 순 첫 번째 (skill_design §9-2 기사 항) */
        const hasTaunt = list => list.find(p => p.hp > 0 && Object.values(p.buffs).some(b => b.stat === 'taunt')) ?? null;

        /**
         * 단일 대상 선택 — 적 측은 **지목**(결투 선언) → **도발** 순으로 고정하고 그때는 **타겟 rng 를 쓰지 않는다**.
         * 결투가 먼저인 이유: 지목은 그 적 하나에게만 걸리는 개별 계약이고 도발은 적 전체에 거는 광역 규칙이라,
         *   좁은 쪽이 이기지 않으면 지목이 도발에 늘 먹혀 스킬이 죽는다 (skill_design §12-4).
         */
        function pickTarget(u, foes) {
            if (u.side === 'enemy') {
                const duel = Object.values(u.buffs).find(b => b.stat === 'duel');
                if (duel) {
                    const marked = party.find(p => p.key === duel.by && p.hp > 0);
                    if (marked) return marked;
                }
                const tn = hasTaunt(party);
                if (tn) return tn;
            }
            // **전열 우선 — 하드 게이트** [확정 2026-09-09 사용자 지시 · battle_design §3-1].
            //   전열(rank 0) 생존자가 하나라도 있으면 **후열은 대상이 되지 않는다**. 전열이 전멸해야 뒤가 열린다.
            //   굴림은 여전히 **1회**다 — 바뀐 것은 모집단뿐이라 rng 소비 수열이 안 밀린다 (INTERFACE §5-2)
            return pickFrom(frontOf(foes));
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
         * 무기 옵션의 조건부 추가 피해 % — **조건부 괄호에 덧셈**이다 (battle_design §9-2 · item_design §1 「무기 옵션」 · R78).
         *   vs 종족(`monster.csv:monster_type`) · vs 등급(normal 이 아니면 정예 · 보스) · vs 열(`rank` 0 전열 · 1 후열) · 원소(그 타격의 공격 타입)
         */
        const condPct = (fx, d, type) =>
            (fx.vs[String(d.monsterType ?? '').toLowerCase()] ?? 0)
            + (d.grade && d.grade !== 'normal' ? fx.vsElite : 0)
            + (d.rank === 0 ? fx.vsFront : d.rank === 1 ? fx.vsBack : 0)
            + (type !== 'physical' ? (fx.ele[type] ?? 0) : 0);

        /**
         * 직격 1회 — 기본 공격과 스킬 타격이 **같은 함수**를 쓴다.
         * 스킬 배율·원소 태그·**스킬 타격 필드**(`sk`)는 `strike` 시그니처를 건드리지 않으려고 **그 타격 동안만** 유닛에 얹고 원복한다.
         * `s`(스킬 id)·`proc`(추가 피해가 터졌다)·`bar`(배리어 잔량)는 해당될 때만 붙는다 — 기본 공격의 이벤트 모양·rng 수열은 그대로다.
         * @param sk `{flat, procChance, procMult}` — **스킬 타격만** 넘긴다(skill_effects 공격 대상 표). 기본 공격은 안 넘겨 전부 0 이다
         */
        function strikeOnce(u, target, mult, element, s, sk = null) {
            const mult0 = u.skillMult, type0 = u.atkType, flat0 = u.flat, chance0 = u.procChance, pmult0 = u.procMult, bonus0 = u.bonusPct;
            const fx = u.fx;                                 // 무기 옵션 묶음 — 없으면 null (R78)
            const hitType = element || u.atkType;            // 그 타격의 공격 타입 — 원소 조건 · 저항 감소 창이 읽는다
            u.skillMult = mult;
            if (element) u.atkType = element;               // 원소 태그가 있는 스킬은 무기 원소를 무시한다 (§9-5)
            u.flat = sk?.flat ?? 0;                          // 능력치 항 — 배율에 안 곱하고 더한다 (battle_design §9-2 · 2026-09-10)
            u.procChance = sk?.procChance ?? 0;              // 확률로 터지는 추가 피해 — 확률이 0 이면 strike 가 굴리지 않는다
            u.procMult = sk?.procMult ?? 0;
            // 조건부 추가 피해 — vs 종족 · 등급 · 열 · 원소를 **조건부 괄호에 덧셈**으로 그 타격 동안만 얹는다 (battle_design §9-2 · R78). rng 0
            if (fx) u.bonusPct = bonus0 + condPct(fx, target, hitType);
            const { hit, dmg, crit, proc } = F.strike(rng, u, target);
            u.skillMult = mult0;
            u.atkType = type0;
            u.flat = flat0;
            u.procChance = chance0;
            u.procMult = pmult0;
            u.bonusPct = bonus0;

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
            // 강타 — **맞기 직전 대상의 현재 체력** × % 를 그 타격에 더한다. 치명 · 방어 · 저항을 받지 않는 고정 피해 (battle_design §9 · R78). rng 0
            const cb = fx?.crush > 0 ? Math.round(target.hp * fx.crush / 100) : 0;
            const total = dmg + cb;
            applyDamage(target, total);
            // 기여 — **감쇠 후 최종 피해**를 센다. 배리어가 먹은 몫도 포함이라 관전의 누적 데미지 판과 같은 값이다
            const cA = credit(u), cD = credit(target);
            if (cA) cA.dealt += total;
            if (cD) cD.taken += total;
            const ev = { t: r1(t), e: 'hit', a: u.key, d: target.key, dmg: total, crit, dhp: target.hp };
            if (cb) ev.cb = cb;                              // 강타 몫 — 강타가 들어간 타격에만 키가 선다(`dmg` 는 합 · 흡혈 · 반사는 강타 몫을 안 먹는다)
            // 흡혈 — 직격의 최종 피해에만 비례 (§9-6). 배리어가 먹은 몫도 포함한다 (직격이 들어간 사실은 같다)
            if (u.ls > 0 && u.hp > 0) {
                u.hp = Math.min(u.hpMax, u.hp + F.leech(dmg, u.ls));
                ev.ahp = u.hp;
            }
            if (s) ev.s = s;
            if (proc) ev.proc = true;                        // 추가 피해가 **터진 타격만** 키가 선다 (INTERFACE §2-6)
            if (shield) ev.bar = shield.amt;                // 흡수 후 잔량
            timeline.push(ev);
            // 타격 시 창 — 무기 옵션의 방어력 · 저항 · 공격력 감소 (skill_effects.weaponOnHit · R78). rng 0 · 이벤트 없음(`quiet`)
            if (fx && target.hp > 0) weaponOnHit(u, fx, target, hitType, t, windowSec);
            // 사건 훅 — 등록된 반응이 없으면 아무 일도 없다. 핸들러가 rng 를 쓰면 **이 자리에서** 소비한다
            hooks.emit('hit', u, { t, d: target, dmg, crit, s, proc });
            hooks.emit('hitTaken', target, { t, a: u, dmg, crit, s, proc });
            // 반사 — 비직격. 감쇠·치명 없이 공격자 HP 를 직접 깎고 흡혈·반사를 유발하지 않는다 (§9-6)
            if (target.reflect > 0 && u.hp > 0) {
                const back = F.indirect(dmg * target.reflect / 100);
                u.hp = Math.max(0, u.hp - back);
                timeline.push({ t: r1(t), e: 'reflect', a: target.key, d: u.key, dmg: back, ahp: u.hp });
                if (cD) cD.dealt += back;                       // 반사도 **가한 피해**다 — 때린 쪽이 아니라 되받은 쪽의 몫
                if (cA) cA.taken += back;
                if (u.hp <= 0) { if (cD && u.side !== 'party') cD.kills += 1; downed(u); }
            }
            if (target.hp <= 0) {
                if (cA && target.side !== 'party' && !target.summon) cA.kills += 1;   // **적을 쓰러뜨린 것**만 센다 — 적의 소환 벽은 몬스터가 아니다 (R79)
                downed(target);
                hooks.emit('kill', u, { t, d: target });
            }
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
            // ~~전투불능자가 하나라도 나오면 철수~~ 는 폐기 — 그 룰이 편성이 져야 할 무게를 대신 지고 있었다.
            // ⚠ 09-07 로 이것이 **최종형**이다 — 원정은 켜 놓고 자리를 뜨는 것이라 전멸까지 도는 것이 사양이고,
            //    추가 브레이크를 만들지 않는다. **결정은 편성이다** (base_expedition_design §1-1 · DEV_PLAN R42)
            // ⚠ 소환물은 **전멸 판정에서 뺀다** — 얼음 벽이 서 있다고 전투가 안 끝나면 파티가 전멸해도 안 돌아온다
            if (alive(party).filter(u => !u.summon).length === 0) { out.reason = 'wipe'; break; }
            // 적의 소환 벽도 **클리어 판정에서 뺀다** [2026-09-11 · R79] — 바로 위 전멸 판정과 같은 규칙이다: 행동하지 않는 벽이 서 있다고
            //   라운드가 안 끝나면 안 된다. 벽은 다음 라운드의 적 배열 교체(`units.enemies = sp.list`)로 함께 사라진다
            if (alive(units.enemies).filter(u => !u.summon).length === 0) {
                out.roundsCleared = round;
                if (round >= rounds) { out.won = true; out.reason = 'clear'; break; }
                round += 1;
                beginRound();
            }
            if (t >= B.battle_timeout_sec) { out.reason = 'timeout'; break; }
        }
        out.durationSec = r1(t);
        // 정수로 낸다 — 리포트가 그대로 찍는 값이고, 부동소수 꼬리는 이식 대조에서 잡음이 된다
        out.contrib = [...contrib.values()].map(c => ({ ...c, dealt: Math.round(c.dealt), taken: Math.round(c.taken) }));
        timeline.push({ t: r1(t), e: 'end', won: out.won, reason: out.reason });
        return out;
    }

    // makeEnemy 는 검증(dev/test.js)이 몬스터→유닛 변환 규칙을 직접 볼 수 있도록 함께 내보낸다 — stagePool 과 같은 이유
    return { simulate, stagePool, stageElement, stageRounds, makeEnemy };
}
