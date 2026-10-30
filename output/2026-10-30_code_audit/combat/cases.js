async () => {
    const {loadData, buildSystems, D} = await import('/ui/data.js');
    const {makeRng} = await import('/game_logic/rng.js');
    await loadData('/data/');
    const S = buildSystems(D);
    const starter = S.hero.rollStartParty(makeRng(731), 3)[0];
    const base = S.hero.computeCombat(starter, []);
    const fx0 = {vs:{},vsElite:0,vsFront:0,vsBack:0,ele:{},defDown:0,resDown:0,atkDownPhys:0,atkDownMag:0,crush:0,magicFind:0};
    const fighter = (uid, skills = [], extra = {}) => ({
        uid, actives: skills.map(id => ({id,source:'innate'})), stats: null,
        combat: {
            ...base, level: 20, atk_physical:{min:10,max:10},atk_magic:undefined,
            basic_attack:true,attack_type:'physical',hp_max:1000000,defense:100,
            hp_regen:0,damage_reduction:0,crit_rate:0,crit_damage:1,life_steal:0,reflect_damage:0,
            cooldown_reduction:0,main_attr_mult:1,action_period:1,period_raw:1,period_weapon:1,
            speed_pct:0,res_fire:0,res_cold:0,res_lightning:0,res_poison:0,mastery_cond:null,
            option_fx:null,...extra
        }
    });
    const run = (a,b,t=3.2,rng=makeRng(731)) => {
        const r=S.battle.createRun(a,null,rng,1,null,0,b);
        r.advance(t); return r;
    };
    const records=[];
    {
        const samples=[];
        for(const atk of [10,20,40,80,160])for(let seed=1;seed<=8;seed++){
            const party=[0,1,2].map(i=>fighter('ab'+i,[],{hp_max:1000000,atk_physical:{min:atk,max:atk},level:50,defense:1000,fhr:1,res_fire:0.5,res_cold:0.5,res_lightning:0.5,res_poison:0.5}));
            const r=S.battle.simulate(party,5033,makeRng(seed),D.stages[5033].dlvl,null,0,'normal');
            let round=0,roster={},downs=0,firsts=new Set(),prevRes=null;
            for(const e of r.timeline){
                if(e.e==='round'){round=e.n;roster=Object.fromEntries(e.enemies.map(m=>[m.key,m.monsterId]));downs=0;firsts=new Set();prevRes=null;}
                if(e.e==='call')for(const m of e.units)roster[m.key]=m.monsterId;
                if(e.e==='down'&&[5301,5302,5303].includes(roster[e.u])){downs++;firsts.add(e.u);}
                if(e.e==='stat'&&e.u==='p0'&&e.v.res_fire!==undefined){
                    const expected=0.5-Math.min(5,downs)*0.05;
                    if(Math.abs(e.v.res_fire-expected)>0.001)samples.push({atk,seed,round,downs,firsts:[...firsts],expected,actual:e.v.res_fire,event:e});
                    prevRes=e.v.res_fire;
                }
                if(e.e==='down'&&downs>firsts.size&&[5301,5302,5303].includes(roster[e.u]))samples.push({atk,seed,round,repeatedDown:e,downs,unique:firsts.size,latestFireRes:prevRes,expectedFireRes:0.5-Math.min(5,downs)*0.05});
            }
            if(samples.length>=8)break;
        }
        records.push({name:'revived_aberration_missing_reduction',samples:samples.slice(0,20)});
    }
    {
        const natural=S.arena.rollTierOpponent(S.arena.tiers.at(-1).id,makeRng(50512));
        const r=S.battle.simulate(natural,5051,makeRng(140512),D.stages[5051].dlvl,null,0,'normal');
        const negative=r.timeline.filter(e=>['hit','dot','reflect','blast'].includes(e.e)&&e.dmg-(e.ov??0)+(e.cull??0)<0);
        records.push({name:'natural_team_swarm_negative_replay_damage',negative,contrib:r.contrib,
            fromTimeline:r.party.map(p=>({uid:p.uid,dealt:r.timeline.filter(e=>e.a===p.key&&['hit','dot','reflect','blast'].includes(e.e)).reduce((n,e)=>n+e.dmg-(e.ov??0)+(e.cull??0),0)})),
            swarmEvents:r.timeline.filter(e=>e.e==='fly'||(e.e==='buff'&&e.s==='mon_swarm')||negative.includes(e))});
    }
    {
        const a=fighter('channel',['arc_snipe'],{option_fx:{...fx0,counter:0.1},fhr:1});
        const b=fighter('attacker');
        const r=run([a],[b],4.2,()=>0);
        records.push({name:'counter_while_channeling',timeline:r.result.timeline});
    }
    {
        const a=fighter('level',['war_bash']);
        const b=fighter('defender',[],{action_period:20,period_raw:20,period_weapon:20});
        const r=run([a],[b],1.1);
        const leveled={...a,actives:[{...a.actives[0],up:1}]};
        records.push({name:'known_debt85_skill_upgrade_refit',refit:r.refit([leveled]),
            originalDef:S.skill.resolve(a.actives[0]),newDef:S.skill.resolve(leveled.actives[0]),timeline:r.result.timeline});
    }
    {
        const attacks=(id,debuff)=>{
            const a=fighter('attacker',[id],{basic_attack:false,atk_physical:undefined,atk_magic:{min:100,max:100},action_period:2,period_raw:2,period_weapon:2});
            const b=fighter('debuffer',debuff?['pri_penitence']:[],{basic_attack:false,atk_physical:undefined,atk_magic:{min:10,max:10},action_period:0.5,period_raw:0.5,period_weapon:0.5});
            return run([a],[b],2.1).result.timeline;
        };
        records.push({name:'fixed_damage_ignores_outgoing_debuff_interpretation',
            judgmentBase:attacks('pri_judgment',false),judgmentDebuff:attacks('pri_judgment',true),
            fireballBase:attacks('mag_fireball',false),fireballDebuff:attacks('mag_fireball',true)});
    }
    {
        const a=fighter('stack',['mag_fireball','mag_inferno','mag_lightning'],{
            basic_attack:false,atk_physical:undefined,atk_magic:{min:10,max:10},
            option_fx:{...fx0,castStack:0.1}
        });
        const b=fighter('defender',[],{action_period:20,period_raw:20,period_weapon:20});
        const r=run([a],[b],1.1);
        const before=r.result.timeline.filter(e=>e.e==='stat'&&e.u==='p0');
        const changed={...a,combat:{...a.combat,defense:a.combat.defense+1}};
        const refit=r.refit([changed]);
        r.advance(1.2);
        records.push({name:'refit_erases_cast_stack',before,refit,after:r.result.timeline.filter(e=>e.e==='stat'&&e.u==='p0'),timeline:r.result.timeline});
    }
    // Guided Arrow must not apply an on-hit shred when the strike misses.
    {
        const a=fighter('guided',['arc_guided'],{option_fx:{...fx0,hitBonus:-1}});
        const b=fighter('defender',[],{action_period:20,period_raw:20,period_weapon:20});
        const r=run([a],[b],1.1,()=>0.99);
        records.push({name:'guided_miss_shred',timeline:r.result.timeline,
            stats:r.result.timeline.filter(e=>e.e==='stat'&&e.u==='e0'),
            note:'No hit from p0 should reduce e0 defense.'});
    }
    // The evade window is a different no-hit path, with the same afterStrike callback.
    {
        const a=fighter('guided',['arc_guided'],{action_period:2,period_raw:2,period_weapon:2});
        const b=fighter('defender',['arc_evade']);
        const r=run([a],[b],2.1);
        records.push({name:'guided_evade_shred',timeline:r.result.timeline,
            stats:r.result.timeline.filter(e=>e.e==='stat'&&e.u==='e0')});
    }
    // A spread hit should contribute the same total in the result and timeline replay.
    {
        const a=fighter('spread',['arc_multishot'],{action_period:2,period_raw:2,period_weapon:2});
        const b=fighter('swarm',['mon_swarm']);
        const r=run([a],[b],3.2);
        const tl=r.result.timeline;
        const contribAtEnd=(()=>{while(r.next()?.ended===false);return r.result.contrib;})();
        records.push({name:'swarm_spread_contrib',firstTimeline:tl.filter(e=>e.t<=3.2),contrib:contribAtEnd,
            fromTimeline:tl.filter(e=>e.a==='p0'&&['hit','reflect','dot','blast'].includes(e.e)).reduce((n,e)=>n+e.dmg-(e.ov??0)+(e.cull??0),0),
            allTimeline:tl});
    }
    return {records};
}
