import {readFile} from 'node:fs/promises';
function once(s,a,b){if(s.split(a).length!==2)throw Error('overlay anchor '+a);return s.replace(a,b);}
export async function load(url,context,nextLoad){
    if(!url.endsWith('/snapshot/src/game_logic/battle.js'))return nextLoad(url,context);
    let source=await readFile(new URL(url),'utf8');
    source=once(source,'* B.monster_hp_scale * hpMultOf(difficulty)','* B.monster_hp_scale * hpMultOf(difficulty) * qaFactor(m, grade, difficulty, "hp")');
    source=once(source,'const dmgScale = B.monster_atk_scale * dmgMultOf(difficulty);','const dmgScale = B.monster_atk_scale * dmgMultOf(difficulty) * qaFactor(m, grade, difficulty, "attack");');
    source=once(source,'expReward: MONSTER_XP.get(lvl) * g.exp_mult * m.exp_coef,','expReward: MONSTER_XP.get(lvl) * g.exp_mult * m.exp_coef * qaFactor(m, grade, difficulty, "xp"),');
    source+=`\nfunction qaFactor(m,grade,difficulty,kind){
        const d=typeof difficulty==='string'?difficulty:difficulty?.id??'normal',v=globalThis.__qaVariant;
        if(!v||m.chapter!==1||d!=='normal'||(globalThis.__qaStage&&Math.floor(globalThis.__qaStage/1000)!==1))return 1;
        if(kind==='xp')return v.xp??1;
        if(grade==='chapter_boss')return kind==='hp'?v.bossHp??1:v.bossAttack??1;
        return kind==='hp'?v.enemyHp??1:v.enemyAttack??1;
    }\n`;
    return{format:'module',source,shortCircuit:true};
}
