/** 결투장 초안 — 저장 상태와 독립된 3인 팀 스냅샷. RNG는 상대/전투마다 주입한다.
 * 상대 공급은 rollOpponent 한 곳이다. 이후 서버 팀도 snapshotTeam과 fight에 넣을 수 있다.
 * 현재는 개인 능력치·장비·스킬만 사용한다(파티 전술·도감·물약 제외).
 */
export function createArenaSystem({ hero, item, skill, battle }) {
    const teamSize = 3;
    const clone = value => JSON.parse(JSON.stringify(value));

    function snapshotTeam(heroes, items, ranks = {}) {
        if (heroes.length !== teamSize || new Set(heroes.map(h => h.uid)).size !== teamSize)
            throw new Error('arena: a team must contain three distinct heroes');
        return heroes.map((source, i) => {
            const h = clone(source);
            const gear = Object.values(h.equipped).filter(Boolean).map(uid => items[uid]).filter(Boolean).map(clone);
            const combat = hero.computeCombat(h, gear.map(item.effective));
            return {
                uid: h.uid, hero: h, gear, combat, stats: h.stats,
                actives: skill.activesFor(h), weaponGroup: gear.find(it => it.slot === 'weapon')?.group ?? null,
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

    function fight(team, opponent, rng) {
        if (team.length !== teamSize || opponent.length !== teamSize) throw new Error('arena: expected 3 vs 3');
        return battle.simulateTeams(clone(team), clone(opponent), rng);
    }

    return { teamSize, snapshotTeam, rollOpponent, fight };
}
