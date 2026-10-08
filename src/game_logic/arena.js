/** 결투장 초안 — 저장 상태와 독립된 3인 팀 스냅샷. RNG는 상대/전투마다 주입한다.
 * 상대 공급은 rollOpponent 한 곳이다. 이후 서버 팀도 snapshotTeam과 fight에 넣을 수 있다.
 * 개인 능력치·장비·스킬에 고른 편성의 파티 전술·물약 칸을 더한다(`loadout` = `state.arenaLoadout` · 2026-10-03). 도감은 제외.
 * 물약은 칸을 채운 값만 받는다 — 재고는 부르는 쪽이 안 줄인다(결투는 세이브에 영향이 없다).
 */
export function createArenaSystem({ hero, item, skill, battle }) {
    const teamSize = 3;
    const clone = value => JSON.parse(JSON.stringify(value));

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
        const heroes = hero.rollCandidates(rng, teamSize);
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

    return { teamSize, snapshotTeam, rollOpponent, fight };
}
