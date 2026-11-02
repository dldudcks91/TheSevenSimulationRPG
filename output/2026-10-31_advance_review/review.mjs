import { loadData, buildSystems, D } from '/src/ui/data.js';
import { makeRng } from '/src/game_logic/rng.js';

export async function runReview() {
    await loadData('/src/data/');
    const SYS = buildSystems(D);
    const make = (cls, uid, group, skill = null, up = 0, level = 30, speed = 0) => {
        const h = SYS.hero.rollHeroOf(makeRng(91), cls);
        Object.assign(h, {uid, level, stats: Object.fromEntries(Object.keys(h.stats).map(k => [k, 20])),
            innate: null, bookSkill: null, advanceSkill: skill, advanceUp: up, mastery: {}, equipped: {}});
        const gear = SYS.item.rollGear(makeRng(34), {slots: ['weapon', 'armor'], ilvl: level,
            weaponGroup: group, rarityWeights: {normal: 1, magic: 0, rare: 0, epic: 0, legendary: 0}});
        for (const it of gear) { it.affixes = []; it.implicit = null; }
        const combat = SYS.hero.computeCombat(h, gear.map(SYS.item.effective));
        if (speed) {
            combat.speed_pct += speed;
            combat.action_period = combat.period_raw / (1 + combat.speed_pct);
        }
        return {uid, hero:h, stats:h.stats, gear, combat,
            actives:SYS.skill.activesFor(h), weaponGroup:group, rank:0};
    };
    const run = (cls, group, id, up, level, speed, targets, seed, withBasics = true, stable = false) => {
        const main = make(cls, 'p0', group, id, up, level, speed);
        if (withBasics) {
            const basics = {warrior:['war_bash','war_doubleswing'], knight:['kni_rush','kni_charge'],
                archer:['arc_snipe','arc_multishot'], mage:['mag_fireball','mag_iceblast'],
                priest:['pri_judgment','pri_heal']}[cls];
            if (basics.some(x => !SYS.skill.defs[x])) throw new Error('Missing loadout '+basics);
            main.hero.innate = basics[0]; main.hero.bookSkill = basics[1];
            main.actives = SYS.skill.activesFor(main.hero);
        }
        const party = [main, make('warrior','p1','axe',null,0,level), make('archer','p2','crossbow',null,0,level)];
        party.forEach((p,i) => { p.rank = i ? 1 : 0; p.combat.hp_regen = 0; });
        const enemies = Array.from({length:targets}, (_,i) => {
            const p = make('warrior','e'+i,'mace',null,0,level);
            p.combat.hp_max = 1e9; p.combat.hp_regen = 0; p.combat.debuff_dur_reduction = 0;
            p.rank = i ? 1 : 0;
            return p;
        });
        if (stable) for (const p of party) {
            p.combat.crit_rate=0;
            const range=p.combat.atk_physical ?? p.combat.atk_magic;
            range.min=range.max=(range.min+range.max)/2;
        }
        const r = SYS.battle.createRun(party,null,makeRng(seed),level,null,D.balance.potion_slot_max,
            enemies,null,null,null,{skipActor:u=>u.side === 'enemy',
                beforeTick:ctx=>{if(stable)for(const u of ctx.party)u.hitBonus=10;}});
        r.advance(120);
        const hits = r.result.timeline.filter(e=>e.e==='hit');
        const sum = list => list.reduce((n,e)=>n+e.dmg,0);
        const ph = hits.filter(e=>e.a?.startsWith('p'));
        const own = ph.filter(e=>e.a==='p0');
        return {partyDps:sum(ph)/120, ownDps:sum(own)/120,
            basicDps:sum(own.filter(e=>!e.s))/120, advanceDps:sum(own.filter(e=>e.s===id))/120,
            casts:id ? r.result.casts[id] ?? 0 : 0, period:main.combat.action_period,
            weaponPeriod:main.combat.period_weapon};
    };
    const groups = {warrior:'axe',knight:'greatsword',archer:'bow',mage:'staff',priest:'bible'};
    // Weapon groups are data, so use each class's first weapon where the named group is absent.
    for (const cls of Object.keys(groups)) {
        if (!D.weaponGroups[groups[cls]]) groups[cls]=SYS.item.groupsFor(cls)[0].id;
    }
    const rows = [];
    let simulations = 0;
    const average = (cls,id,up,level,speed,targets,withBasics=true) => {
        const samples=Array.from({length:12},(_,i)=>run(cls,groups[cls],id,up,level,speed,targets,1001+i,withBasics));
        simulations += samples.length;
        return Object.fromEntries(Object.keys(samples[0]).map(k=>[k,samples.reduce((s,r)=>s+r[k],0)/samples.length]));
    };
    for (const cls of Object.keys(groups)) {
        const defs = SYS.skill.list.filter(d=>d.ownerKind==='advance'&&d.classId===cls);
        for (const [level,up] of [[30,0],[50,0],[50,4]]) for (const targets of [1,3]) {
            const baseline=average(cls,null,0,level,0,targets);
            for (const def of defs) {
                const stats=average(cls,def.id,up,level,0,targets);
                rows.push({cls,id:def.id,name:def.name.ko,level,skillLevel:up+1,targets,speed:0,
                    ...stats,baselinePartyDps:baseline.partyDps,baselineOwnDps:baseline.ownDps,
                    partyGain:stats.partyDps/baseline.partyDps-1,
                    ownGain:baseline.ownDps ? stats.ownDps/baseline.ownDps-1 : null});
            }
        }
    }
    const bow=[];
    for (const speed of [0,1]) for (const targets of [1,3]) for(const group of ['bow','crossbow']) {
        groups.archer=group;
        const baseline=average('archer',null,0,30,speed,targets,false);
        for(const id of ['arc_quickdraw','arc_overdraw','arc_chaindraw']) {
            const stats=average('archer',id,0,30,speed,targets,false);
            bow.push({id,group,speed,targets,...stats,baselineDps:baseline.ownDps,
                ownGain:stats.ownDps/baseline.ownDps-1});
        }
    }
    const levels=SYS.skill.list.filter(d=>d.ownerKind==='advance').map(d=>({id:d.id,
        name:d.name.ko,level1:SYS.skill.scaleDef(d,Object.fromEntries(['str','agi','int','vit','luck','ldr','cha'].map(k=>[k,20]))),
        level5:SYS.skill.scaleDef(SYS.skill.resolve({id:d.id,up:4}),Object.fromEntries(['str','agi','int','vit','luck','ldr','cha'].map(k=>[k,20])))}));
    const stableBow=[];
    for(const group of ['bow','crossbow']) for(const speed of [0,1]) for(const targets of [1,3]) {
        const baseline=run('archer',group,null,0,30,speed,targets,1,false,true);
        simulations++;
        for(const id of ['arc_quickdraw','arc_overdraw','arc_chaindraw']) {
            const stats=run('archer',group,id,0,30,speed,targets,1,false,true);
            simulations++;
            stableBow.push({id,group,speed,targets,...stats,baselineDps:baseline.ownDps,
                ownGain:stats.ownDps/baseline.ownDps-1});
        }
    }
    const hydraLevels=Array.from({length:5},(_,up)=>({level:up+1,
        hits:SYS.skill.scaleDef(SYS.skill.resolve({id:'mag_hydra',up}),{str:20,agi:20,int:20,vit:20,luck:20,ldr:20,cha:20}).effects[0].hits}));
    return {summary:{simulations,secondsPerSimulation:120,seeds:12,
        note:'Controlled offense only: immortal inactive targets, no enemy defense/resistance, fixed stats 20, normal weapon/armor, no mastery, gear affixes or potions. Party: reviewed hero plus axe warrior and crossbow archer. This is not a campaign win-rate test.',
        lv30:rows.filter(r=>r.level===30),stableBow,hydraLevels},rows,bow,stableBow,levels};
}
