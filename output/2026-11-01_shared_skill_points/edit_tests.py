from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
p = ROOT / 'src/dev/test.js'
s = p.read_text(encoding='utf-8')
s = s.replace('advPointsAt', 'advMainCapAt')
s = s.replace('SAVE_VERSION === 44', 'SAVE_VERSION === 45').replace('SAVE_VERSION !== 44', 'SAVE_VERSION !== 45')
s = s.replace('SAVE_VERSION === 45;   // v44', 'SAVE_VERSION === 45;   // v45 = 공용 스킬 포인트 · v44')
s = s.replace("if (spent + (h.masteryPoints ?? 0) !== budget", "if (spent + (h.advanceSkill ? 1 + (h.advanceUp ?? 0) : 0) + (h.masteryPoints ?? 0) !== budget")
s = s.replace('전직 포인트 ${1 + (h.advanceUp ?? 0)}', '전직 메인 단계 ${1 + (h.advanceUp ?? 0)}')
s = s.replace("    if (!S.game.advanceLearn(g, h.uid, br.skills[0]).ok) fail('배우기 거절');", "    h.masteryPoints = 1;\n    if (!S.game.advanceLearn(g, h.uid, br.skills[0]).ok) fail('배우기 거절');")
s = s.replace("        if (!S.game.advanceLearn(g, a, br.skills[0]).ok)", "        h.masteryPoints = 1;\n        if (!S.game.advanceLearn(g, a, br.skills[0]).ok)")
start = s.index("check('advance: 전직 포인트 —")
end = s.index("\n});", start) + len("\n});")
new = r"""check('advance: 매 레벨 공용 포인트 지급 · 전직 추가 지급 없음 · 마스터리와 소비·환급 공유 · 메인만 Lv30/35/40/45/50 해금 · 실패 시 불변', () => {
    const S = buildSystems(D), g = S.game.newGame(96, cands, NOW), h = g.heroes[0];
    g.resources.gold = 1e9;
    g.buildings.library = S.construction.reach('advance').rank;
    const advanceTo = lv => {
        while (h.level < lv) S.hero.grantXp(h, S.hero.xpNeeded(h.level) - h.xp, makeRng(1));
    };
    advanceTo(30);
    const before = h.masteryPoints;
    const br = S.game.advanceState(g, h.uid, NOW).branches[0];
    if (!S.game.advanceStart(g, h.uid, br.id, NOW).ok || h.masteryPoints !== before) fail('전직 자체가 포인트를 바꿨다');
    const st = () => S.game.advanceState(g, h.uid, NOW).hero;
    if (!S.game.advanceLearn(g, h.uid, br.skills[0]).ok || h.masteryPoints !== before - 1) fail('공용 지갑 학습 비용');
    if (st().points.free !== S.game.masteryState(g, h.uid).points) fail('마스터리와 전직 지갑 불일치');
    const node = S.game.masteryState(g, h.uid).nodes.find(n => n.canLearn);
    if (!node || !S.game.learnMastery(g, h.uid, node.id).ok || st().points.free !== before - 2) fail('마스터리 소비가 전직 지갑에 반영 안 됨');
    if (!S.game.unlearnMastery(g, h.uid, node.id).ok || st().points.free !== before - 1) fail('마스터리 환급 공유');
    const unchanged = action => { const old = JSON.stringify(h); const r = action(); if (r.ok || JSON.stringify(h) !== old) fail('거절이 영웅을 바꿨다'); return r; };
    let r = unchanged(() => S.game.advanceLevelUp(g, h.uid));
    if (r.err !== 'level' || r.need !== 35) fail(`Lv30 강화 제한 ${JSON.stringify(r)}`);
    for (let lv = 31; lv <= 50; lv++) {
        const free = h.masteryPoints;
        advanceTo(lv);
        if (h.masteryPoints !== free + B.mastery_point_per_level) fail(`Lv${lv} 공용 포인트 미지급`);
        if (lv % 5 === 0) {
            const cost = h.masteryPoints;
            const result = S.game.advanceLevelUp(g, h.uid);
            if (!result.ok || result.lv !== 1 + (lv - 30) / 5 || h.masteryPoints !== cost - 1) fail(`Lv${lv} 메인 강화 ${JSON.stringify(result)}`);
        } else {
            r = unchanged(() => S.game.advanceLevelUp(g, h.uid));
            if (r.err !== 'level' || r.need !== Math.ceil(lv / 5) * 5) fail(`중간 레벨 제한 ${lv}: ${JSON.stringify(r)}`);
        }
    }
    if (st().lv !== 5 || st().levelCap !== 5 || st().nextLevel !== null || st().canLevelUp) fail('메인 Lv5 상한');
    if (unchanged(() => S.game.advanceLevelUp(g, h.uid)).err !== 'maxLevel') fail('최종 단계 초과');
    const saved = S.game.deserialize(S.game.serialize(g, NOW));
    const back = saved.heroes.find(x => x.uid === h.uid);
    if (back.advanceUp !== 4 || back.masteryPoints !== h.masteryPoints) fail('공용 지갑 세이브 왕복');
    const free = h.masteryPoints;
    const refund = S.game.advanceForget(g, h.uid);
    if (!refund.ok || refund.refunded !== 5 || h.masteryPoints !== free + 5 || h.advanceSkill || h.advanceUp !== undefined) fail('전직 전액 환급');
    if (unchanged(() => S.game.advanceForget(g, h.uid)).err !== 'empty') fail('중복 환급');
    const nodes = S.game.advanceState(g, h.uid, NOW).nodes;
    for (const id of br.skills) if (nodes[id].map(n => n.slot).join() !== '2,3,4') fail('꼬리 설명 구조');
    return '매 레벨 지갑 증가 · 메인 5레벨 해금 · 학습/마스터리/환급 공유 · 꼬리는 설명만';
});
check('advance: 포인트 0이면 전직해도 학습 불가 · 레벨 충족 후 늦게 메인 여러 단계 투자 가능 · 다른 스킬로 변경', () => {
    const S = buildSystems(D), g = S.game.newGame(97, cands, NOW), h = g.heroes[0];
    h.level = 40; h.masteryPoints = 0;
    const br = S.game.advanceState(g, h.uid, NOW).branches[0]; h.advance = br.id;
    if (S.game.advanceLearn(g, h.uid, br.skills[0]).err !== 'points' || S.game.advanceState(g, h.uid, NOW).hero.canLearn) fail('별도 포인트가 생겼다');
    h.masteryPoints = 4;
    if (!S.game.advanceLearn(g, h.uid, br.skills[0]).ok) fail('늦은 학습');
    if (!S.game.advanceLevelUp(g, h.uid).ok || !S.game.advanceLevelUp(g, h.uid).ok || h.advanceUp !== 2 || h.masteryPoints !== 1) fail('늦게 열린 단계 따라잡기');
    if (S.game.advanceLevelUp(g, h.uid).need !== 45) fail('Lv40에서 Lv4 허용');
    if (!S.game.advanceForget(g, h.uid).ok || h.masteryPoints !== 4) fail('환급');
    if (!S.game.advanceLearn(g, h.uid, br.skills[1]).ok || h.masteryPoints !== 3 || h.advanceUp !== undefined) fail('다른 메인 학습');
    h.level = 50; h.masteryPoints = 0;
    if (S.game.advanceLevelUp(g, h.uid).err !== 'points') fail('레벨만으로 무료 강화');
    h.level = 29; h.masteryPoints = 10; h.advanceSkill = null;
    if (S.game.advanceLearn(g, h.uid, br.skills[0]).err !== 'level' || h.masteryPoints !== 10) fail('학습 레벨 미달');
});
check('save: v44 별도 전직 투자 → v45 공용 잔액에서 유지 가능한 단계만 비용 지불 · 포인트 증식 없음 · 반복 로드 불변', () => {
    for (const free of [0, 2, 10]) {
        const S = buildSystems(D), g = S.game.newGame(98, cands, NOW), h = g.heroes[0];
        h.level = 50; h.masteryPoints = free;
        const br = S.game.advanceState(g, h.uid, NOW).branches[0];
        h.advance = br.id; h.advanceSkill = br.skills[0]; h.advanceUp = 4;
        const node = S.game.masteryState(g, h.uid).nodes.find(n => n.unlocked);
        h.mastery = {[node.id]:1};
        const old = S.game.serialize(g, NOW); old.version = 44;
        const original = JSON.stringify(old), back = S.game.deserialize(old), bh = back.heroes[0];
        const kept = Math.min(free, 5);
        if ((bh.advanceSkill ? 1 + (bh.advanceUp ?? 0) : 0) !== kept || bh.masteryPoints !== free - kept) fail(`구버전 이관 잔액 ${free}`);
        if (bh.mastery[node.id] !== 1 || bh.advance !== br.id || !eq(back.items, g.items) || JSON.stringify(old) !== original) fail('기존 마스터리/갈래/장비/원본 훼손');
        const round = S.game.deserialize(S.game.serialize(back, NOW));
        if (!eq(round.heroes[0], bh)) fail('재로드가 포인트를 다시 차감했다');
    }
});
check('save: v45 메인 레벨 제한 초과분 환급 · 유효하지 않은 메인도 비용 환급', () => {
    const S = buildSystems(D), g = S.game.newGame(99, cands, NOW), h = g.heroes[0];
    h.level = 31; h.masteryPoints = 3;
    const br = S.game.advanceState(g, h.uid, NOW).branches[0];
    h.advance = br.id; h.advanceSkill = br.skills[0]; h.advanceUp = 4;
    let back = S.game.deserialize(S.game.serialize(g, NOW)).heroes[0];
    if (back.advanceSkill !== br.skills[0] || back.advanceUp !== undefined || back.masteryPoints !== 7) fail('초과 메인 환급');
    h.advanceSkill = 'retired-advance';
    back = S.game.deserialize(S.game.serialize(g, NOW)).heroes[0];
    if (back.advanceSkill || back.masteryPoints !== 8) fail('없는 메인 환급');
});
check('battle: 같은 스킬의 레벨만 바꿔도 refit 에 반영 · 같은 레벨 재적용은 변화 없음', () => {
    const party = godUnits(), id = 'war_mutualruin';
    party[0].actives = [{id,source:'advance'}];
    const run = SYS.battle.createRun(party, 1013, makeRng(4));
    run.advance(0);
    const changed = JSON.parse(JSON.stringify(party)); changed[0].actives[0].up = 1;
    const fit = run.refit(changed), ev = run.result.timeline.find(x => x.e === 'refit' && x.u === 'p0');
    if (!fit.changed.includes('p0') || ev?.up?.[0] !== 1) fail('같은 ID의 메인 레벨을 못 갈아입혔다');
    const n = run.result.timeline.length;
    if (run.refit(changed).changed.length || run.result.timeline.length !== n) fail('같은 레벨을 다시 갈아입혔다');
});
check('arena: 마스터리와 전직 메인을 합쳐 공용 포인트 예산 초과 시 거절', () => {
    const team = SYS.arena.rollTierOpponent(SYS.arena.tiers.at(-1).id, makeRng(2001));
    const payload = SYS.arena.exportTeam(...Object.values(arenaParts(team)));
    const h = payload.heroes[0].hero;
    h.level = 50;
    const br = D.advanceRows.find(r=>r.class_id===h.cls);
    h.advance=br.advance_id;
    h.advanceSkill=SYS.skill.list.find(d=>d.ownerKind==='advance'&&d.ownerId===h.advance).id;
    h.advanceUp=4;
    let left = (h.level-1)*B.mastery_point_per_level;
    h.mastery={};
    for(const n of SYS.hero.masteryNodesFor(h).filter(n=>n.unlockLevel<=h.level)) {
        const rank=Math.min(left,n.maxRank); if(rank)h.mastery[n.id]=rank; left-=rank;
    }
    if(left)fail('예산을 채울 합법 노드가 부족하다');
    if(!SYS.arena.validateTeam(payload).some(p=>p.code==='masteryPoints'))fail('공용 예산 이중 사용 허용');
});"""
s = s[:start] + new + s[end:]
s = s.replace('첫 전직 포인트', '공용 스킬 포인트 1')
p.write_text(s, encoding='utf-8', newline='')

for name in ['src/ui/app.js','src/game_logic/arena.js']:
    p=ROOT/name; s=p.read_text(encoding='utf-8')
    s=s.replace('첫 전직 포인트', '공용 스킬 포인트 1')
    s=s.replace('전직 포인트 하나가 남아 스킬 칸이 눌린다', '공용 포인트와 메인 레벨 조건을 확인한다')
    if name.endswith('app.js'):
        s=s.replace('if (br) { h.advance = br.id; SYS.game.advanceLearn', 'if (br) { h.masteryPoints = Math.max(h.masteryPoints ?? 0, 1); h.advance = br.id; SYS.game.advanceLearn')
        s=s.replace('if (br) { h0.advance = br.id; SYS.game.advanceLearn', 'if (br) { h0.masteryPoints = Math.max(h0.masteryPoints ?? 0, 2); h0.advance = br.id; SYS.game.advanceLearn')
    p.write_text(s,encoding='utf-8',newline='')
print('Updated fixtures and added shared-point, migration, arena and live-upgrade regressions.')
