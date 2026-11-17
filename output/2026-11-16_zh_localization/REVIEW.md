# 간체(zh) 번역 검토 — 규칙 · 수치 문장 역번역 대조

zh 를 먼저 한국어로 되돌린 뒤 ko 원문 · en 과 맞대 보았다. 대상은 덩어리 `chunks/*.out.json` 이고, 고칠 칸은 저장소 `src/ui/i18n.js` · `src/data/*.csv` 의 지금 값과도 맞춰 보았다. 고친 문자열 전체는 [review_fixes.json](review_fixes.json)에 있다(22칸 · `check_out.py` 결과 ERR 0 · WARN 0).

## 1. 수치

| 항목 | 수 |
|---|---|
| 정독 표본(한 줄씩 역번역) | **166** — 스킬 설명 45 · 전직 노드 20 · 툴팁 · 옵션 · 효과 줄 39 · 도움말 규칙 37 · 확인 창 · 오류 · 알림 25 |
| 표본 밖 전수 훑기 | `skill.csv` desc 101 전부 · `advance_node.csv` 270줄 전부 · ui 규칙 문자열(숫자 · 조건어 포함) 267 · 오류 · 확인 153 · 도움말 [버튼] 인용 전부 · 용어 30쌍 grep |
| **A 뜻이 다름** | **5** |
| **B 용어 어긋남** | **16** (표본 안 12 · 같은 꼴 grep 4) |
| **C 형식** | **1** |
| 고친 칸 합계 | 22 (`review_fixes.json`) |

통과한 것도 적어 둔다.
- 스킬 설명의 자리 둘레에 단위가 겹친 곳이 없다(`{d}点` · `{s}秒` · `{h}次` · `{v}%` 모두 0건).
- 「마다 → 每」 · 「뒤 → …后」 · 「동안 → 持续」 · 「최대 → 最多」 · 「이상 → 以上」 · 「확률 → 几率」을 섞어 쓴 곳이 없다.
- 증가와 감소가 뒤집힌 곳, 부정이 빠진 곳도 찾지 못했다(휴리스틱 전수 검사).
- 도움말의 [버튼] 인용은 실제 버튼 글자와 모두 같다.

## 2. 어긋남 표

| key | 분류 | ko 원문 요지 | 지금 zh | 문제 | 고친 zh |
|---|---|---|---|---|---|
| `ui\|pt.help.potion` | **A** | HP가 {n}% **아래로** 떨어진 영웅이 마심 | 生命降到{n}%**以下**的英雄… | 以下 는 {n}% 를 포함한다(경계값이 틀림). 같은 규칙을 말하는 `pt.potion.use` 는 「低于{n}%」 | 生命低于{n}%的英雄会自动饮用药水。 |
| `ui\|pt.err.exploring` | **A** | (자물쇠 줄) 탐험 **귀환**(= 불러들여라) | 探索归来 | 「탐험에서 돌아왔다」는 상태로 읽힌다. 해야 할 일이 안 보이고, 버튼 글자는 「召回」 | 召回探索 |
| `ui\|bt.effect.will` | **A** | 맞을 때마다 받는 피해 {v}%**씩** 감소 | 每次被击中，受到的伤害降低{v}% | 누적(씩)이 빠져 「맞은 그 한 방이 {v}% 준다」로 읽힌다. 스킬 설명 쪽은 「叠加」 | 每次被击中叠加{v}%伤害减免 |
| `ui\|bt.effect.frenzy` | **A** | 때릴 때마다 공격 속도 {v}% **씩** 증가 | 每次攻击使攻击速度提高{v}% | 위와 같은 꼴 — 누적이 빠졌다 | 每次攻击叠加{v}%攻击速度 |
| `csv\|advance_node.csv\|mag_blizzard\|desc\|구름 속에서 틱마다 피해 {v}씩 증가` | **A** | 틱마다 피해가 {v}**씩** 증가(쌓인다 — 덤이 「쌓인 세기가 이어진다」) | 雪云中每跳伤害提高{v} | 「한 틱마다 {v} 고정 가산」으로 읽힌다. 점점 커진다는 뜻이 빠졌다 | 雪云中伤害每跳递增{v} |
| `csv\|skill.csv\|war_shout\|desc` | B | **전열에** 명령을 내려 파티 전원의 방어 · 저항 ↑ | 每{n}秒**向前排**下达命令… | 前排 은 게임 용어(전열 칸)다. 대상이 앞줄뿐인 것처럼 읽히고 en 에도 「front」가 없다 | 每{n}秒高声下令，使队伍全员防御提高{v}、所有抗性提高{v2}，持续{s} |
| `ui\|help.party.formation.body` | B | 기본 공격 | **基本攻击** | 같은 개념인데 스킬 설명 · 툴팁 · 옵션 24곳은 「普通攻击」를 쓴다 | 基本攻击 → 普通攻击 (전체 문자열은 json) |
| `ui\|help.character.damage_kinds.body` | B | 〃 | 基本攻击 | 〃 | 〃 |
| `ui\|help.character.critical_effects.body` | B | 〃 | 基本攻击 | 〃 | 〃 |
| `ui\|help.character.channeling.body` | B | 〃 | 基本攻击 | 〃 | 〃 |
| `ui\|help.character.growth.body` | B (grep) | 〃 | 基本攻击 | 〃 | 〃 |
| `ui\|help.character.skills.body` | B (grep) | 〃 | 基本攻击 | 〃 — **저장소에서 손으로 고친 값**(「[设定顺序]」 「[随机顺序]」)을 바탕으로 고쳤다 | 〃 |
| `ui\|help.library.points.body` | B | 스킬 줄(**크기** · 변형 1 · 변형 2) | （**强度**、变体1、变体2） | 칸 이름 `sk.adv.slot.size` 는 「威力」 | （威力、变体1、变体2） |
| `ui\|sk.tier` | B | `Tier {n}` (ko · en 모두 영어 · ADR-1082 사용자 지시) | 第{n}层 | 용어집 §2 「ko · en 이 같은 라틴 낱말인 라벨은 그대로」에 어긋난다. 「层」은 이미 겹(层) · 탑 층(第{n}层)에 쓰여 세 개념이 한 글자에 몰린다. `sk.err.prevRow` 의 {tier} 로도 들어간다 | Tier {n} |
| `ui\|ch.err.running` | B | (자물쇠 줄) 원정 **철수** | 撤出远征 | 버튼 `bt.retreat` · `rep.retreat` 은 「撤退」라 따라 누를 글자가 다르다 | 从远征撤退 |
| `ui\|ex.err.running` | B | 〃 | 撤出远征 | 〃 | 从远征撤退 |
| `ui\|pt.err.running` | B | 〃 | 撤出远征 | 〃 | 从远征撤退 |
| `ui\|rep.discarded` | B | 가방이 가득 차 장비 {n}개 분해 | …分解了{n}**个** | 용어집 §2-1 「장비 개수 = 件」 | 背包已满，分解了{n}件 |
| `ui\|td.sell.count` | B | (판매할 장비) 선택 {n}개 | 已选{n}**个** | 〃 | 已选{n}件 |
| `ui\|tr.adv.todo` | B (grep) | **공용** 스킬 포인트 · 공용 지갑 | **通用**技能点 · 通用点数池 | 같은 ko 「공용 스킬 포인트」가 도움말 4곳(제목 포함)은 「共用技能点」이다 | …共用技能点… · 共用点数池 |
| `ui\|sk.advTree.missing` | B (grep) | 공용 스킬 포인트 1 | 1点**通用**技能点 | 〃 | 1点共用技能点 |
| `csv\|skill.csv\|mag_frostarmor\|desc` | C | 보호막을 평타로 친 적은 얼어붙음 | 用**普攻击打**护盾的敌人… | 「普攻 + 击打」이 붙어 「普攻击」로 잘못 끊어 읽힌다 | …以普通攻击击打护盾的敌人会被冻结 |

### 반복 패턴

| 패턴 | 개수 | 칸 |
|---|---|---|
| 기본 공격 = 「基本攻击」(나머지 24곳은 「普通攻击」) | 6 | 도움말 party.formation · character.growth / skills / damage_kinds / critical_effects / channeling |
| 「~씩」(쌓임)이 빠짐 | 3 | bt.effect.will · bt.effect.frenzy · mag_blizzard 노드 |
| 철수 버튼 인용 = 「撤出」(버튼은 「撤退」) | 3 | ch / ex / pt `.err.running` |
| 공용 스킬 포인트 = 「通用」 / 「共用」 둘로 갈림 | 2 | tr.adv.todo · sk.advTree.missing (나머지 4곳은 共用) |
| 장비 개수 = 「个」 | 2 | rep.discarded · td.sell.count |

## 3. 원문(ko) · 데이터 · 렌더러 쪽 문제 — 번역으로는 못 고친다

| # | 어디 | 무엇 | 영향 |
|---|---|---|---|
| 1 | `advance_node.csv` 단위 `sec` 18행 + `app.js:advVal`(6113 ~ 6119행) | `unit=sec` 이면 `advVal` 이 이미 `sk.adv.sec`(「{n}초」)로 단위를 붙이는데, 틀도 「{v}초」를 들고 있다. 그래서 「3초초」 · 「3ss」 · 「3秒秒」가 된다. 해당 행: mag_blizzard var2 덤 · mag_thundergod var2 · war_ragnarok 크기 덤 · war_mutualruin var2 · war_thorswrath var2 · war_shockwave var1 · war_intimidate 크기 덤 · war_intimidate var1 · kni_unbreakablewill var1 · kni_retribution var2 · arc_reload var2 · arc_overdraw var2 덤 · arc_trap var2 · pri_purify 크기 덤 · pri_purify var2 · pri_excommunication var2 · pri_sweep var2 덤 · pri_counter 크기 덤 | **세 언어 모두** · 전직 칸 툴팁 |
| 2 | 같은 `advDesc` 의 `{a}` | `unit=pct` 이고 `arg ≤ 1` 이면 `{a}` 를 %로 찍는다. 그래서 mag_thunderstrike var2 「맞은 적 {v} 확률로 **{a}초** 스턴」(arg 0.5)는 「50%초 스턴」, kni_fallingstrike var2(arg 1)는 「100%초」가 된다. kni_retribution var2 의 「+{a}초」(unit sec)는 「4초초」 | 세 언어 모두 |
| 3 | `skill.csv` arc_reload desc 「(라운드마다 **{v}번**)」 | 상태 `reload` 는 `descSlots.v` 의 단위 분기(evade → 횟수 · transform → 초 · 그 밖 %)에서 %로 떨어진다. 값 1 이면 「100%번」, 레벨이 오르면 「140%번」 | 세 언어 모두 |
| 4 | `skill.csv` war_mutualruin desc 「지금 HP 의 **30%**」 · kni_retribution 「물리 피해의 **30%**」 | 수치를 박아 썼다(규칙 2 · 수치는 CSV). `hp_cost_pct` 0.3 은 `{p}`, `kni_retribution_conv` 0.3 은 `{v2}` 자리로 이미 낼 수 있다 | 지금 값은 맞다. 밸런스를 바꾸면 어긋난다 |
| 5 | `skill.csv` war_shout desc 「**전열에** 명령을 내려」 | 「전열」은 게임 용어(앞줄)다. 대상은 파티 전원이다(en 은 「barks orders」) | ko 독자도 앞줄만 받는 것으로 오해할 수 있다 |
| 6 | `cx.note` 「앞 단계(…)는 **그 몬스터에게만**」 | `cx.sub` · 도움말 codex.milestones 는 「Lv1 · Lv2 보너스는 **같은 종족 전체**」라고 한다. 서로 어긋난다 — `cx.note` 가 옛 설명일 가능성이 크다 | 원문끼리 모순 |
| 7 | `skill.csv` mag_frozenorb 「**{h} 동안** 적 전열 전원을 긁어」 | `{h}` 는 「N번」이라 「5번 동안」이 된다 | ko 만 어색하다(zh 는 「…全体{h}」로 자연스럽다) |
| 8 | `tv.visit.dropped` · `tv.visit.ignored` 의 「{name} **을(를)**」 | 조사를 고르는 자리 문법(`{name\|을/를}`)이 아니라 글자로 박혀 있다 | ko 표시만 |

참고 — 저장소 `i18n.js` 에서 덩어리 값과 다른 ui 키는 12개다. 그중 실제로 손으로 고친 것은 `st.fx.normal`(종족 일반 → 「自然」) · `st.desc.fx_vs_type` · `st.desc.fx_dr_type` · `ch.skill.orderRandom` · `help.character.skills.body` · `help.codex.classification.body` · `help.codex.race_traits.body` 이다. 나머지는 `pro.s*.b` 의 줄바꿈 표기 차이뿐이다. 종족 이름이 ko 에서도 「자연」으로 바뀌어 덩어리 `in.json` 의 ko 는 일부 낡았다. `apply_zh.py` 는 이미 있는 zh 를 덮지 않으므로 `review_fixes.json` 은 저장소 파일에 직접 반영해야 한다(README 8단계).

## 4. 표본 목록 (통과한 것 포함 · ✗ = 고친 칸)

**스킬 설명 `skill.csv|<id>|desc` (45)** — war_bash · war_doubleswing · war_recovery · war_leap · war_shout ✗ · war_battleorders · war_frenzy · war_warcry · kni_holyshield · kni_charge · kni_enchant · kni_might · kni_defiance · kni_sweep · kni_holyfire · arc_snipe · arc_multishot · arc_guided · arc_pierce · arc_coldarrow · arc_evade · mag_inferno · mag_iceblast · mag_chain · mag_deepfreeze · mag_surge · mag_echo · pri_heal · pri_regen · pri_doom · pri_summon · mon_hellfire · mon_ironmaiden · mon_goldfever · mon_swarm · war_berserk · kni_lastbastion · kni_unbreakablewill · kni_condemnation · mag_frozenorb · mag_frostarmor ✗ · mag_thunderstrike · arc_reload · arc_quickdraw · pri_resurrection

**전직 노드 `advance_node.csv|<id>|<열>` (20)** — mag_meteor var2 desc(「{a}초 동안 메테오의 {v}만큼」) · mag_ember var2 desc(「{v} 확률로 화상」) · mag_hydra var2 desc(「최대 {a}겹」) · mag_hydra var2 bonus · mag_blizzard var1 desc(「틱마다 {v}씩」) ✗ · mag_blizzard var2 bonus(「{v}초 남는다」) · mag_thunderstrike var2 desc · mag_nova var1 desc(「최대 {a}겹 · 라운드마다 처음부터」) · mag_thundergod var2 desc · war_berserk var1 bonus(「처음 {v} 아래로」) · war_intimidate size bonus · kni_lastbastion var1 desc(「{v} 아래면 저절로」) · kni_unbreakablewill var1 desc(「{v}초마다 하나씩」) · kni_retribution var2 desc(「최대 +{a}초」) · kni_fallingstrike size bonus(「3초 동안」) · arc_trap size bonus(「{v}번까지」) · arc_chaindraw var2 desc(「연속 최대 {v}」) · pri_endure var1 desc · pri_purify var2 desc · pri_excommunication var2 desc

**툴팁 · 옵션 · 효과 줄 (39)** — sk.amt.physical · sk.amt.elem · sk.amt.heal · sk.amt.healFx · sk.line.proc · sk.u.times · time.s · tip.ring.cooldown · tip.ring.extra_hit · tip.proc.hit · tip.proc.struck · tip.proc.interval · tip.potion.heal · st.desc.crit_rate · st.desc.def_ignore · st.desc.damage_reduction · st.desc.res_fire · st.desc.fx_counter · st.desc.hp_regen · st.desc.vit · sk.cond.hurt · sk.cond.higher · sk.cond.fresh · sk.cond.opening · sk.cond.late · sk.masteryEffect.basic_cd_tick · sk.masteryEffect.glut_cull · sk.masteryEffect.sloth_defer · sk.masteryEffect.period_minus_sec · bt.effect.period.up · bt.effect.frenzy ✗ · bt.effect.will ✗ · bt.effect.atone · bt.fam.Army · bt.fam.Aberration · exp.debuff.poison · exp.debuff.freeze · sk.tier ✗ · sk.gate.sin_gear

**도움말 `help.<…>.body` (37)** — expedition.rounds · expedition.firstclear · expedition.difficulty · expedition.hell_debuffs · expedition.offline · expedition.shrines · explore.time · explore.recall · explore.claim · party.potions · party.threshold · party.formation ✗ · party.tactics · character.speed · character.defenses · character.penetration · character.damage_kinds ✗ · character.critical_effects ✗ · character.ailments · character.channeling ✗ · character.salvage · character.rarity · tavern.visitors · tavern.fame · tavern.gambling · shop.trade · shop.restock · forge.upgrade · forge.combine · library.points ✗ · resource.production · resource.assignment · resource.hero_effects · arena.rating · colosseum.rules · codex.milestones · help.away

**확인 창 · 오류 · 알림 (25)** — pt.err.exploring ✗ · pt.err.running ✗ · ch.err.running ✗ · ex.err.running ✗ · ch.err.equipped · exp.locked · cm.err.notDone · ch.err.tries · ch.err.noBase · ch.sel.lockedNo · ch.auto.confirm · ch.dismiss.blocked · ch.star.warn · bk.overwrite.warn · ex.err.slots · ex.err.bagFull · tv.visit.full · sk.err.prevRow · sk.err.rowFull · cm.err.full · pt.help.potion ✗ · pt.potion.use · exp.departLevelGap · rep.discarded ✗ · td.sell.count ✗

**표본 밖에서 같은 꼴로 찾은 것 (4)** — help.character.growth.body ✗ · help.character.skills.body ✗ (基本攻击) · tr.adv.todo ✗ · sk.advTree.missing ✗ (通用技能点)

---

*마지막 업데이트: 2026-11-17*
