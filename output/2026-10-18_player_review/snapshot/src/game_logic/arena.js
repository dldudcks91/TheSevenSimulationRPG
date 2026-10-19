/** 결투장 — 저장 상태와 독립된 3인 팀 스냅샷 · 상대 두 갈래 · `battle.simulateTeams` 단판. RNG는 상대/전투마다 주입한다.
 * 순수 — DOM · 저장소 · 시계 · `Math.random` 을 모른다 · 데이터는 생성자 주입 · 세이브를 모른다 (INTERFACE §2-17).
 * **상대는 두 갈래다** [2026-10-17 · arena_design §0 · §7] — 오프라인 = 등급에 맞춰 장비 · 스킬을 갖춘 AI 팀(`rollTierOpponent`) /
 *   온라인 = 남이 올린 팀 그대로(`exportTeam` → 운반 → `importTeam` · 받은 팀은 `validateTeam` 을 지나야 선다 — arena_design §2).
 *   운반(문자열로 싸기 · 서버)은 이 모듈 밖이다. 어느 갈래든 결과는 `snapshotTeam` 모양이라 `fight` 하나가 받는다.
 * 개인 능력치·장비·스킬에 고른 편성의 파티 전술·물약 칸을 더한다(`loadout` = `state.arenaLoadout` · 2026-10-03). 도감은 제외.
 * 물약은 칸을 채운 값만 받는다 — 재고는 부르는 쪽이 안 줄인다(결투는 세이브에 영향이 없다).
 * ⚠ 등급 표 값 · AI 가중치는 임시 · 승급 기록은 없다(GAME_DESIGN §10 「결투장」 ⑦) · 팀 코드에 전술 · 물약이 없다 ·
 *   검사기는 옵션 줄 수 · 기본 능력치 대역을 아직 안 본다(⑧)
 */

/** 팀 코드 판 — 모양을 바꾸면 올린다. 옛 판의 코드는 `format` 으로 거절한다 (세이브 판과 같은 성격 · INTERFACE §2-17) */
const TEAM_CODE_VERSION = 1;
/** 진형 랭크 — 전열 · 후열 (battle_design §3-1) */
const RANKS = [0, 1];
/** 마스터리 트리 종류 — `mastery_node.csv:tree_kind` 의 어휘 · AI 가 주력을 여기서 하나 굴린다 */
const TREES = ['class', 'sin'];
/** 팀 코드에 싣는 영웅 칸 — 전투에 드는 것만. uid · XP · 남은 포인트 · 착용 표는 안 싣는다(받는 쪽이 다시 세운다) */
const HERO_KEYS = ['name', 'tier', 'sin', 'cls', 'trait', 'face', 'level', 'stats', 'mastery', 'innate', 'bookSkill', 'skillLv', 'advance', 'advanceSkill', 'advanceUp', 'skillOrder'];
/** 받은 팀 코드의 문자열에 못 들어오는 글자 — 화면이 `innerHTML` 로 그리므로 태그 · 속성을 열 수 있는 것 (INTERFACE §2-17 `text`) */
const UNSAFE_TEXT = /[<>"`]/;

/**
 * @param deps.hero · item · skill · battle  시스템
 * @param deps.balance       balance.csv — 성장 문턱(`skillbook_learn_level` · `advance_unlock_level` · `advance_point_interval` · `mastery_point_per_level`) · 상한(`hero_level_cap` · `hero_attr_max`) · AI 가중치(`arena_ai_*`)
 * @param deps.equipSlots    착용 위치 `[{id, part}]` — 위치 순서가 장비 굴림 순서다 (equip_slot.csv)
 * @param deps.advances      advance.csv 원시 행 — 전직 갈래 → 직업
 * @param deps.classSkills   직업 풀 `{classId: [skillId]}` — 고유 스킬의 후보 (hero 와 같은 표)
 * @param deps.tiers         arena_tier.csv 원시 행 — 오프라인 등급
 * @param deps.upgradeCeiling 건물을 다 지었을 때의 강화 상한 · `skillCapMax` 스킬 업그레이드 상한의 끝 — 검사기가 보는 끝값
 */
export function createArenaSystem({ hero, item, skill, battle, balance = {}, equipSlots = [], advances = [], classSkills = {}, tiers = [], upgradeCeiling = 0, skillCapMax = 0 }) {
    const B = balance;
    const teamSize = 3;
    const clone = value => JSON.parse(JSON.stringify(value));
    const POS = equipSlots.map(s => ({ id: s.id, part: s.part }));

    /* ── 표 ── */

    // 오프라인 등급 — `tier_order` 순. 표가 틀리면 생성 때 던진다 (INTERFACE §2-17)
    const TIERS = (tiers ?? []).map(r => ({
        id: r.tier_id, order: Number(r.tier_order), name: { ko: r.name_kr, en: r.name_en }, level: r.hero_level,
        rarityWeights: { normal: r.rarity_w_normal, magic: r.rarity_w_magic, rare: r.rarity_w_rare }, up: r.gear_up, skillUp: r.skill_up,
    })).sort((a, b) => a.order - b.order);
    (() => {
        const bad = why => { throw new Error(`arena_tier: ${why}`); };
        const within = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
        if (!TIERS.length) bad('행이 없다');
        const seen = new Set();
        for (const t of TIERS) {
            if (!t.id || seen.has(t.id)) bad(`tier_id '${t.id}'`);
            seen.add(t.id);
            if (!t.name.ko || !t.name.en) bad(`${t.id} — 이름이 비었다`);
            if (!within(t.level, 1, B.hero_level_cap)) bad(`${t.id} — hero_level '${t.level}' (1 ~ hero_level_cap)`);
            // 강화 · 스킬 업그레이드는 「바라는 단계」다 — 쓸 때 끝값으로 자른다(건물 표를 바꿔 끼운 단정에서도 시스템이 선다)
            if (!within(t.up, 0, Infinity)) bad(`${t.id} — gear_up '${t.up}' (0 이상 정수)`);
            if (!within(t.skillUp, 0, Infinity)) bad(`${t.id} — skill_up '${t.skillUp}' (0 이상 정수)`);
            const w = Object.values(t.rarityWeights);
            if (w.some(x => typeof x !== 'number' || x < 0) || !(w.reduce((s, x) => s + x, 0) > 0)) bad(`${t.id} — 희귀도 가중치`);
        }
    })();

    // 전직 갈래 — 갈래의 스킬은 `skill.csv` 의 `owner_kind=advance` 행 · `priority` 순 (`state.advanceSkills` 와 같다)
    const ADV = (advances ?? []).map(r => ({ id: r.advance_id, cls: r.class_id, order: Number(r.sort_order) || 0 })).sort((a, b) => a.order - b.order);
    const advanceSkills = id => skill.list.filter(d => d.ownerKind === 'advance' && d.ownerId === id)
        .sort((a, b) => a.priority - b.priority).map(d => d.id);
    /** 전직 포인트 — 전직 레벨에 1 · 그 뒤 간격마다 1 (`state.advancePointsOf` 와 같은 식 · skill_design §4) */
    const advancePoints = level => {
        const over = level - B.advance_unlock_level;
        return over >= 0 ? 1 + Math.floor(over / Math.max(1, B.advance_point_interval)) : 0;
    };
    /** 레벨 1 에서 그 레벨까지 받은 마스터리 포인트 — `hero.grantXp` 와 같은 정액 */
    const masteryBudget = level => (level - 1) * B.mastery_point_per_level;

    /* ── 스냅샷 · 단판 ── */

    function snapshotTeam(heroes, items, ranks = {}, loadout = null) {
        if (heroes.length !== teamSize || new Set(heroes.map(h => h.uid)).size !== teamSize)
            throw new Error('arena: a team must contain three distinct heroes');
        return heroes.map((source, i) => {
            const h = clone(source);
            const gear = Object.values(h.equipped).filter(Boolean).map(uid => items[uid]).filter(Boolean).map(clone);
            const combat = hero.computeCombat(h, gear.map(item.effective), {}, loadout?.tactic ?? null);
            return {
                uid: h.uid, hero: h, gear, combat, stats: h.stats,
                actives: skill.activesFor(h, { skillPlus: item.skillPlusOf(gear) }), weaponGroup: gear.find(it => it.slot === 'weapon')?.group ?? null,
                rank: ranks[h.uid] ?? (i === 0 ? 0 : 1),
            };
        });
    }

    function rollOpponent(team, rng) {
        const level = Math.max(1, Math.round(team.reduce((n, p) => n + p.hero.level, 0) / teamSize));
        // 우리 팀과 같은 이름은 피한다 — rng 0 이라 뒤의 굴림이 안 밀린다 (`hero.avoidNames` · 2026-10-15 · PLAN_user_review 2-5 「노엘 → 노엘」)
        const heroes = hero.avoidNames(hero.rollCandidates(rng, teamSize), team.map(p => p.hero.name));
        const items = {};
        heroes.forEach((h, i) => {
            h.uid = `arena-enemy-${i}`;
            h.level = level;
            const groups = item.groupsFor(h.cls);
            const group = groups[Math.floor(rng() * groups.length)].id;
            const gear = item.rollGear(rng, { slots: ['weapon', 'armor'], ilvl: level, weaponGroup: group });
            gear.forEach((it, j) => {
                it.uid = `arena-gear-${i}-${j}`;
                items[it.uid] = it;
                h.equipped[it.slot] = it.uid;
            });
        });
        return snapshotTeam(heroes, items);
    }

    function fight(team, opponent, rng, loadout = null) {
        if (team.length !== teamSize || opponent.length !== teamSize) throw new Error('arena: expected 3 vs 3');
        // 물약을 안 주면 칸 0 — 물약 줄이 아예 안 선다
        return battle.simulateTeams(clone(team), clone(opponent), rng, loadout?.potions ?? null, loadout?.slotMax ?? 0);
    }

    /* ── 오프라인 — 등급에 맞춰 갖춘 AI 팀 (arena_design §7) ── */

    const drawDistinct = (rng, pool, n) => {
        const rest = pool.slice(), out = [];
        for (let i = 0; i < n && rest.length; i++) out.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
        return out;
    };
    /** 가중 추첨 한 번 — 합이 0 이면 균등. 언제나 1회 소비 */
    const pickIndex = (rng, weights) => {
        const total = weights.reduce((s, w) => s + w, 0);
        const r = rng();
        if (!(total > 0)) return Math.floor(r * weights.length);
        let x = r * total;
        for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
        return weights.length - 1;
    };
    const pickOne = (rng, list) => { const r = rng(); return list.length ? list[Math.floor(r * list.length)] : null; };

    /**
     * 마스터리 포인트를 다 쓴다 — **사람처럼**: 주력 트리 하나를 굴리고, 찍을 수 있는 노드(해금 레벨 · 랭크 상한 · 지금 장비로 켜진 게이트) 중에서
     *   주력 트리 × `arena_ai_main_tree_weight` · 이미 찍은 노드 × `arena_ai_continue_weight` 로 한 랭크씩 가중 추첨한다 (INTERFACE §2-17)
     */
    function spendMastery(h, gear, rng) {
        const main = TREES[Math.floor(rng() * TREES.length)];
        const nodes = hero.masteryNodesFor(h);
        h.mastery = {};
        while ((h.masteryPoints ?? 0) > 0) {
            const open = nodes.filter(n => n.unlockLevel <= h.level && (h.mastery[n.id] ?? 0) < n.maxRank && hero.gateOn(n, gear, h));
            if (!open.length) break;
            const n = open[pickIndex(rng, open.map(x => (x.treeKind === main ? B.arena_ai_main_tree_weight : 1)
                * ((h.mastery[x.id] ?? 0) > 0 ? B.arena_ai_continue_weight : 1)))];
            h.mastery[n.id] = (h.mastery[n.id] ?? 0) + 1;
            h.masteryPoints -= 1;
        }
    }

    /** 책 · 전직 · 스킬 업그레이드 — 레벨 문턱은 게임과 같다. 건물(도서관)은 안 본다 — AI 는 다른 모험가다 */
    function learnSkills(h, T, rng) {
        if (h.level >= B.skillbook_learn_level) {
            const pool = skill.list.filter(d => d.ownerKind === 'job' && d.ownerId === h.cls && d.id !== h.innate && skill.bookable(d.id)).map(d => d.id);
            const id = pickOne(rng, pool);   // 풀이 비어도 1회 소비
            if (id) h.bookSkill = id;
        }
        if (h.level >= B.advance_unlock_level) {
            const br = pickOne(rng, ADV.filter(a => a.cls === h.cls));
            const id = pickOne(rng, br ? advanceSkills(br.id) : []);   // 갈래가 없어도 1회 소비
            if (br) h.advance = br.id;
            if (br && id) {
                h.advanceSkill = id;
                const up = advancePoints(h.level) - 1;   // 첫 포인트로 배우고 나머지는 전부 스킬 레벨 (state.advanceLevelUp 과 같은 셈)
                if (up > 0) h.advanceUp = up;
            }
        }
        const lv = {};
        for (const id of [h.innate, h.bookSkill]) if (id && T.skillUp > 0) lv[id] = Math.min(T.skillUp, skillCapMax);
        if (Object.keys(lv).length) h.skillLv = lv;
    }

    function rollTierOpponent(tierId, rng, taken = []) {
        const T = TIERS.find(t => t.id === tierId);
        if (!T) throw new Error(`arena: 모르는 등급 '${tierId}'`);
        const heroes = drawDistinct(rng, hero.mainClasses, teamSize).map(cls => hero.rollHeroOf(rng, cls));
        // 이름 — 부르는 쪽(`taken`)과도 서로도 안 겹친다. `avoidNames` 는 목록 안의 겹침을 안 보므로 한 명씩 앞사람을 더해 간다 (rng 0)
        const names = (taken ?? []).slice();
        for (const h of heroes) { hero.avoidNames([h], names); names.push(h.name); }
        const items = {};
        heroes.forEach((h, i) => {
            h.uid = `arena-enemy-${i}`;
            // 레벨 — 1 에서 그 레벨까지의 XP 를 게임과 같은 길로 받는다(마스터리 포인트도 `grantXp` 가 준다 · rng 0)
            let xp = 0;
            for (let l = 1; l < T.level; l++) xp += hero.xpNeeded(l);
            hero.grantXp(h, xp);
            // 장비 — 착용 위치를 다 채운다 · 아이템 레벨 = 영웅 레벨 · 희귀도 = 등급 가중치 · 강화 = 등급 단계(강화 대상 부위만)
            const groups = item.groupsFor(h.cls);
            const group = groups[Math.floor(rng() * groups.length)].id;
            const gear = item.rollGear(rng, { slots: POS.map(p => p.part), ilvl: h.level, weaponGroup: group, rarityWeights: T.rarityWeights });
            const up = Math.min(T.up, upgradeCeiling);
            gear.forEach((it, j) => {
                if (up > 0 && item.upgradeable(it)) it.up = up;
                it.uid = `arena-gear-${i}-${j}`;
                items[it.uid] = it;
                h.equipped[POS[j].id] = it.uid;
            });
            spendMastery(h, gear, rng);
            learnSkills(h, T, rng);
        });
        const team = snapshotTeam(heroes, items);
        // 진형 — 최대 HP 가 가장 큰 영웅 하나가 전열 · 나머지 후열(같으면 앞 영웅) · rng 0
        let front = 0;
        team.forEach((p, i) => { if (p.combat.hp_max > team[front].combat.hp_max) front = i; });
        team.forEach((p, i) => { p.rank = i === front ? RANKS[0] : RANKS[1]; });
        return team;
    }

    /* ── 온라인 — 남이 올린 팀 그대로 (arena_design §0 · §2) ── */

    function exportTeam(heroes, items, ranks = {}) {
        if (heroes.length !== teamSize || new Set(heroes.map(h => h.uid)).size !== teamSize)
            throw new Error('arena: a team must contain three distinct heroes');
        return {
            v: TEAM_CODE_VERSION,
            heroes: heroes.map((h, i) => ({
                hero: Object.fromEntries(HERO_KEYS.filter(k => h[k] !== undefined && h[k] !== null).map(k => [k, clone(h[k])])),
                gear: POS.filter(p => items[h.equipped?.[p.id]]).map(p => {
                    const it = clone(items[h.equipped[p.id]]);
                    delete it.uid;
                    return { pos: p.id, item: it };
                }),
                rank: ranks[h.uid] ?? (i === 0 ? RANKS[0] : RANKS[1]),
            })),
        };
    }

    /** 적법성 검사 — 빈 배열 = 합법. 사유 코드는 INTERFACE §2-17. 순수 · rng 0 */
    function validateTeam(payload) {
        const out = [];
        const bad = (code, hero = null, extra = {}) => out.push({ code, ...(hero === null ? {} : { hero }), ...extra });
        const within = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
        if (!payload || payload.v !== TEAM_CODE_VERSION || !Array.isArray(payload.heroes) || payload.heroes.length !== teamSize) {
            bad('format');
            return out;
        }
        // 받은 문자열은 화면 HTML 로 들어간다 — 태그 · 속성을 열 수 있는 글자는 어디에도 못 들어온다 (이름 · 장비 이름 · 아무 칸)
        const texts = [];
        const walk = v => { if (typeof v === 'string') texts.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
        walk(payload.heroes);
        if (texts.some(s => UNSAFE_TEXT.test(s))) bad('text');
        payload.heroes.forEach((entry, i) => {
            const h = entry?.hero;
            if (!h || typeof h !== 'object' || !Array.isArray(entry.gear) || !RANKS.includes(entry.rank)) { bad('format', i); return; }
            // 초상 id 는 `<직업>_<번호>` 모양뿐이다(`hero.rollFace`) — 그림 경로로 들어가는 칸이다
            if (h.face != null && !(typeof h.face === 'string' && h.face.startsWith(`${h.cls}_`) && Number.isInteger(Number(h.face.slice(h.cls.length + 1))))) bad('format', i);
            if (!hero.mainClasses.includes(h.cls)) bad('class', i);
            if (!within(h.level, 1, B.hero_level_cap)) { bad('level', i); return; }   // 아래 검사는 레벨을 믿고 본다
            if (!h.stats || typeof h.stats !== 'object' || Object.values(h.stats).some(v => !within(v, 0, B.hero_attr_max))) bad('stats', i);
            // 마스터리 — 그 영웅의 트리 · 랭크 상한 · 해금 레벨 · 포인트 예산
            const nodes = new Map(hero.masteryNodesFor(h).map(n => [n.id, n]));
            let spent = 0;
            for (const [id, r] of Object.entries(h.mastery ?? {})) {
                const n = nodes.get(id);
                if (!n || !within(r, 0, n.maxRank) || (r > 0 && h.level < n.unlockLevel)) bad('mastery', i, { detail: id });
                else spent += r;
            }
            if (spent > masteryBudget(h.level)) bad('masteryPoints', i, { detail: `${spent}/${masteryBudget(h.level)}` });
            // 스킬 — 고유는 그 직업 풀 · 책은 책이 되는 스킬이고 책 레벨 이상 · 업그레이드는 고유 · 배운 칸만
            if (!(classSkills[h.cls] ?? []).includes(h.innate)) bad('innate', i);
            if (h.bookSkill != null && (!skill.bookable(h.bookSkill) || h.level < B.skillbook_learn_level)) bad('book', i);
            for (const [id, n] of Object.entries(h.skillLv ?? {}))
                if ((id !== h.innate && id !== h.bookSkill) || !within(n, 1, skillCapMax)) bad('skillLv', i, { detail: id });
            // 전직 — 제 직업의 갈래 · 전직 레벨 · 그 갈래의 스킬 · 포인트
            const advUp = h.advanceUp ?? 0;
            if (h.advance != null) {
                const br = ADV.find(a => a.id === h.advance);
                const spentA = (h.advanceSkill ? 1 : 0) + advUp;
                if (!br || br.cls !== h.cls || h.level < B.advance_unlock_level
                    || (h.advanceSkill != null && !advanceSkills(br.id).includes(h.advanceSkill))
                    || !within(advUp, 0, Infinity) || (advUp > 0 && !h.advanceSkill) || spentA > advancePoints(h.level)) bad('advance', i);
            } else if (h.advanceSkill != null || advUp) bad('advance', i);
            // 장비 — 위치 · 부위 · 무기군 · 착용 요구 · 강화 · 옵션 수치 범위
            const seen = new Set();
            for (const g of entry.gear) {
                const p = POS.find(x => x.id === g?.pos), it = g?.item;
                if (!p || seen.has(p.id) || !it || it.slot !== p.part || (it.slot === 'weapon' && !item.groupOf(it)) || !within(it.ilvl, 1, Infinity)) {
                    bad('slot', i, { pos: g?.pos ?? null });
                    continue;
                }
                seen.add(p.id);
                if (item.canEquip(h, it)) bad('reqLevel', i, { pos: p.id });
                const up = it.up ?? 0;
                if (!within(up, 0, upgradeCeiling) || (up > 0 && !item.upgradeable(it))) bad('up', i, { pos: p.id });
                (it.affixes ?? []).forEach((a, k) => {
                    const r = item.optionRange(it, k);
                    if (!r) return;   // ⚠ 범위를 못 찾는 줄은 막지 않는다 (INTERFACE §2-17)
                    if (typeof a.v !== 'number' || a.v < Math.min(r.min, r.max) || a.v > Math.max(r.min, r.max)) bad('option', i, { pos: p.id, detail: a.stat });
                });
            }
        });
        return out;
    }

    function importTeam(payload) {
        const problems = validateTeam(payload);
        if (problems.length) return { ok: false, problems };
        const items = {}, ranks = {};
        const heroes = payload.heroes.map((entry, i) => {
            // 정해진 영웅 칸만 들인다 — 코드에 덧붙은 다른 칸은 버린다
            const src = clone(entry.hero);
            const h = { ...Object.fromEntries(HERO_KEYS.filter(k => k in src).map(k => [k, src[k]])), uid: `ghost-${i}`, xp: 0, masteryPoints: 0, equipped: {} };
            entry.gear.forEach((g, j) => {
                const it = { ...clone(g.item), uid: `ghost-gear-${i}-${j}` };
                items[it.uid] = it;
                h.equipped[g.pos] = it.uid;
            });
            ranks[h.uid] = entry.rank;
            return h;
        });
        // 전투 능력치는 여기서 다시 계산한다 — payload 에는 능력치가 없다(올린 쪽 숫자를 안 믿는다)
        return { ok: true, team: snapshotTeam(heroes, items, ranks) };
    }

    return {
        teamSize, tiers: TIERS.map(t => clone(t)),
        snapshotTeam, rollOpponent, fight,
        rollTierOpponent, exportTeam, validateTeam, importTeam,
    };
}
