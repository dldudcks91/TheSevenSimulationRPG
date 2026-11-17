# UNIFY_LOG — 일곱 덩어리 통일 (g1a · g1b · t1 · t2 · t3 · t4 · t5)

> t6_skilldesc 는 범위 밖(동시 번역 중) — 그 파일은 읽지도 쓰지도 않았다. 바꾼 칸 **124** 개(같은 칸에 여러 치환이 겹친 것은 한 칸).

## 이름 변경 — t6 가 맞춰야 한다

이름 덩어리에서 바꾼 것은 아래 둘뿐이다(§2-1 「고정 피해 = 真实伤害 · 固定伤害 버림」). 나머지 이름은 그대로 두고 문장 쪽을 이름에 맞췄다.

| key | ko | 옛 zh | 새 zh |
|---|---|---|---|
| `mock:고정 피해 몫` | 고정 피해 몫 | 固定伤害占比 | 真实伤害占比 |
| `advance_common.csv:crusader:name` | 타격의 일부가 고정 피해로 | 部分打击转为固定伤害 | 部分打击转为真实伤害 |

## 바꾼 것

| 옛 글자 → 새 글자 | 칸 | key | 이유 |
|---|---|---|---|
| 品级 → 稀有度(아이템 · 영웅 · 의뢰 카드 · 전술 카드 · 상자) | 14 | `help.expedition.difficulty.body` · `help.party.tactics.body` · `help.character.identity.title` · `help.character.identity.body` 외 10 | §2-1 등급(희귀도)=稀有度 · 品级 버림 |
| 品级 → 级别(몬스터 일반 · 정예 · 보스) | 3 | `help.expedition.difficulty.body` · `help.character.identity.body` · `help.lab.generator.body` | §2-1 몬스터 등급=级别 · 品级 버림 |
| 物品寻获 · 魔法物品寻获 · 金币寻获 → 掉落率 · 魔法物品获取 · 金币获取 | 4 | `help.expedition.difficulty.body` · `help.expedition.rounds.body` · `help.character.farming_stats.title` · `help.character.farming_stats.body` | §2-1 드랍률·골드 획득·매직아이템 획득=掉落率·金币获取·魔法物品获取 · 寻获 버림 |
| 装备上的经验加成 → 装备上的经验获取 | 1 | `help.character.farming_stats.body` | 옵션·스탯 이름 = 이름 덩어리 글자 |
| 品级 → 分级(「稀有度是……这类分级」 — 稀有度 겹침 회피) | 1 | `help.help.common_terms.body` | §2-1 등급(희귀도)=稀有度 · 品级 버림 |
| 品阶 → 级别 | 3 | `hint.forge_synth` · `hint.temper` · `fg.err.tier` | §2-1 재료 단계=级别 · 品阶 버림 |
| 按品阶 → 按层级 | 1 | `ch.sort.tier` | 책 티어 = 层(ix.tier · sk.tier) · 品阶 버림 |
| 头彩 → 大丰收 | 2 | `help.resource.hero_effects.body` · `help.resource.jobs.body` | §2-1 대박=大丰收 · 头彩 버림 |
| 护符 → 项链 | 2 | `eq.slots` · `help.character.equipment_slots.body` | §2-1 목걸이(부위)=项链 · 护符 버림 |
| 倒地 → 倒下(문장은 「倒下状态」) | 7 | `raid.downed` · `rep.downed` · `rep.reason.wipe` · `hint.contribution` 외 3 | §2-1 전투 불능=倒下 · 倒地 버림 |
| 固定伤害 → 真实伤害(「物理或固定直击」→「物理或真实伤害直击」) | 6 | `mock:고정 피해 몫` · `advance_common.csv:crusader:name` · `help.character.defenses.body` · `help.character.penetration.body` · `help.character.damage_kinds.body` · `help.character.critical_effects.body` | §2-1 고정 피해(True)=真实伤害 · 固定伤害 버림 |
| {n}个 → {n}件(장비 개수) | 12 | `ch.auto.confirm` · `ex.taken` · `ex.takenBooks` · `td.sell.done` 외 8 | §2-1 장비 개수=件 |
| 小队 → Party(라틴 그대로 · 라벨은 `Party I` · `Party {n}` · `Party +{n}`, 문장은 앞뒤 공백 없이) | 35 | `raid.lane.1` · `raid.lane.2` · `raid.lane.3` · `raid.threeParties` 외 31 | ADR-0910 한국어 원문의 라틴 Party 는 간체도 Party |
| [解除锁定] → [解锁] | 1 | `help.character.salvage.body` | 버튼·탭 인용 = 실제 키 글자(ch.menu.unlock) |
| [立即分解] → [执行分解] | 1 | `help.character.salvage.body` | 버튼·탭 인용 = 실제 키 글자(ch.sel.go) |
| [词语] → [词] | 1 | `help.character.salvage.body` | 버튼·탭 인용 = 실제 키 글자(ch.auto.m.word) |
| [立即应用到背包] → [立即应用于背包] | 1 | `help.character.salvage.body` | 버튼·탭 인용 = 실제 키 글자(ch.auto.apply) |
| [优先顺序] → [优先级] | 1 | `help.character.skills.body` | 버튼·탭 인용 = 실제 키 글자(ch.skill.order) |
| <b>[制造]</b> → <b>[制作]</b> | 2 | `help.forge.smith.body` · `help.forge.potions.body` | 버튼·탭 인용 = 실제 키 글자(fg.make.go) |
| <b>[最大]</b> → <b>[最多]</b> | 1 | `help.forge.combine.body` | 버튼·탭 인용 = 실제 키 글자(fg.synth.max 最多×{n}) |
| [更换对手] → [新对手] | 2 | `help.arena.opponents.body` · `help.arena.defense.body` | 버튼·탭 인용 = 실제 키 글자(ar.newCands) |
| [与好友对战] → [与好友战斗] | 2 | `help.arena.defense.body` · `help.arena.friendly.body` | 버튼·탭 인용 = 실제 키 글자(ar.users) |
| 与好友对战 → 与好友战斗 | 1 | `help.arena.friendly.title` | 버튼·탭 인용 = 실제 키 글자(ar.users) |
| [查看更多] → [更多] | 1 | `help.arena.friendly.body` | 버튼·탭 인용 = 실제 키 글자(ar.users.more) |
| [详细] → [详情] | 1 | `help.help.controls.body` | 버튼·탭 인용 = 실제 키 글자(tip.touch.alt) |
| [重新随机] → [重掷] | 1 | `help.help.newgame.body` | 버튼·탭 인용 = 실제 키 글자(ng.reroll) |
| [派出] → [派遣] | 1 | `help.help.away.body` | 버튼·탭 인용 = 실제 키 글자(exp.deploy) |
| <b>[随机]</b> → <b>[随机生成]</b> | 1 | `help.lab.rolling.body` | 버튼·탭 인용 = 실제 키 글자(lab.roll) |
| <b>旋转{batch}次</b> → <b>连转{batch}次</b> | 1 | `help.tavern.gambling.body` | 버튼·탭 인용 = 실제 키 글자(gb.spinN) |
| <b>战斗日志</b> → <b>战斗记录</b> | 1 | `help.expedition.controls.body` | 버튼·탭 인용 = 실제 키 글자(bt.log.h) |
| <b>开发中</b>表示目前尚无法使用的功能。如果某一阶开放的功能全部处于开发中 → <b>准备中</b>表示目前尚无法使用的功能。如果某一阶开放的功能全部处于准备中 | 1 | `help.research.locked.body` | 버튼·탭 인용 = 실제 키 글자(cn.pending) |
| [命中时降低目标防御力] → [击中时降低目标防御] | 1 | `help.character.penetration.body` | 옵션·스탯 이름 = 이름 덩어리 글자(mock 타격 시 대상 방어력 감소) |
| [命中时降低目标抗性] → [击中时降低目标抗性] | 1 | `help.character.penetration.body` | 옵션·스탯 이름 = 이름 덩어리 글자(타격 시 = 击中时) |
| 了解积分与联赛 → 了解积分与段位 | 1 | `help.arena.rating.title` | §2-1 결투장 등급·리그=段位 |
| 联赛是积分区间的名称。可在左侧联赛表中查看下一档的门槛，达到门槛后显示的联赛会改变。积分和联赛 → 段位是积分区间的名称。可在左侧段位表中查看下一段位的门槛，达到门槛后显示的段位会改变。积分和段位 | 1 | `help.arena.rating.body` | §2-1 결투장 등급·리그=段位 |
| 洞窟 → 洞穴(탐험 동굴) | 5 | `ex.help` · `help.explore.map.body` · `help.explore.purpose.body` · `help.explore.claim.body` · `help.library.sources.body` | 탐험 동굴 = 洞穴(g1b 탐험 지점) |
| “恢复”这类自我治疗 → “复原”这类自我治疗 | 1 | `help.character.weapon_skills.body` | 문장 속 이름 = 이름 덩어리 글자(war_recovery 复原) |
| 余烬累积后爆发 → 火种累积后爆发 | 1 | `bt.effect.ember` | 문장 속 이름 = 이름 덩어리 글자(mag_ember 火种) |
| 范围攻击等能命中全员的技能 → 群体技能等能命中全员的技能 | 1 | `help.party.formation.body` | 문장 속 이름 = 이름 덩어리 글자(스킬 태그 광역 群体) |
| 怠惰：获得材料 → 怠惰：材料获取 | 1 | `exp.commission.note` | 문장 속 이름 = 이름 덩어리 글자(의뢰 종류 재료 획득 材料获取) |
| <b>获得材料在离线时也会推进</b> → <b>材料获取在离线时也会推进</b> | 1 | `exp.commission.note` | 문장 속 이름 = 이름 덩어리 글자(의뢰 종류 재료 획득 材料获取) |
| 受到的伤害提高 → 所受伤害提高 | 1 | `cx.lv.takenUp` | 옵션·스탯 이름 = 이름 덩어리 글자(받는 피해 = 所受伤害) |
| 受到的伤害降低 → 所受伤害降低 | 1 | `cx.lv.takenDown` | 옵션·스탯 이름 = 이름 덩어리 글자(받는 피해 = 所受伤害) |
| 卡米拉 → 卡蜜拉 | 2 | `stage.csv:6021:story` · `stage.csv:6041:story` | 문장 속 이름 = 이름 덩어리 글자(6250 카밀라) |
| 拿玛 → 娜玛 | 1 | `stage.csv:6041:story` | 문장 속 이름 = 이름 덩어리 글자(6450 나아마) |
| 阿斯莫德寝殿 → 阿斯莫德寝宫 | 1 | `stage.csv:6041:story` | 문장 속 이름 = 이름 덩어리 글자(stage 6051 아스모데우스의 침실) |
| 寝殿 → 寝宫 | 2 | `stage.csv:6051:story` · `monster.csv:6403:story` | 문장 속 이름 = 이름 덩어리 글자(침실 = 寝宫) |
| 寝殿的魅魔 → 寝宫魅魔 | 1 | `monster.csv:6401:story` | 문장 속 이름 = 이름 덩어리 글자(6401 침실의 서큐버스) |
| 阿撒泻勒 → 阿撒兹勒 | 1 | `stage.csv:7011:story` | 문장 속 이름 = 이름 덩어리 글자(7150 아자젤) |
| 寒霜怨魂 → 寒霜怨灵 | 1 | `stage.csv:4021:story` | 문장 속 이름 = 이름 덩어리 글자(4201 서리 원혼) |
| 冰封哭嚎鬼 → 冰封哭魂 | 1 | `stage.csv:4021:story` | 문장 속 이름 = 이름 덩어리 글자(4202 동결 곡성귀) |
| 亡灵百夫长 → 幽灵百夫长 | 1 | `stage.csv:4021:story` | 문장 속 이름 = 이름 덩어리 글자(4203 망령 백인대장) |
| 苍蝇法师们 → 魔蝇法师们 | 1 | `monster.csv:5402:story` | 문장 속 이름 = 이름 덩어리 글자(5402 파리 마법사) |
| 苍蝇射手们 → 魔蝇射手们 | 1 | `stage.csv:5041:story` | 문장 속 이름 = 이름 덩어리 글자(5401 파리 사수) |
| 倒塌神殿 → 倾颓神殿 | 1 | `monster.csv:7201:story` | 문장 속 이름 = 이름 덩어리 글자(stage 7021 무너진 신전) |
| 若在一轮结束、正倒数下一轮时按下，下一轮便不会出发 → 若在一场结束、正倒数下一场时按下，下一场便不会出发 | 1 | `bt.note` | §2-1 런(원정 한 번)=场 |
| {b}尚未开放 → {b}准备中 | 1 | `nav.pending` | 같은 라벨 「준비 중」 = 准备中(cn.pending · cn.soon) |
| 尚未开放 → 准备中 | 1 | `ex.err.pending` | 같은 라벨 「준비 중」 = 准备中(cn.pending · cn.soon) |
| 成就 · 尚未开放 → 成就 · 准备中 | 1 | `nt.achievementsLocked` | 같은 라벨 「준비 중」 = 准备中(cn.pending · cn.soon) |
| 未解锁功能与开发中功能 → 未解锁功能与准备中功能 | 1 | `help.research.locked.title` | 같은 라벨 「준비 중」 = 准备中(cn.pending · cn.soon) |
| 基础属性最高为{max} → 基础属性最多为{max} | 1 | `hint.attributes` | §4 최대(up to)=最多 |
| 从远征撤退 → 撤出远征 | 1 | `pt.err.running` | 같은 라벨 「원정 철수」 = 撤出远征(ch/ex.err.running) |

## 끝낸 뒤 점검

- 검사기(`check_out.py`) — 일곱 덩어리 모두 **ERR 0 · WARN 0**.
- §2-1 「버린 것」 재집계(일곱 덩어리 out 전체) — 品级 0 · 品阶 0 · 头彩 0 · 物品寻获 0 · 金币寻获 0 · 护符(목걸이) 0 · 倒地 0 · 固定伤害 0 · 장비 개수 「个」 0 · 슬롯 「场」 0.
- 한국어에 라틴 `Party` 가 있는 칸 — 간체 `Party` 개수가 한국어와 모두 같다(35칸 되돌림).
- `[버튼]` · `<b>버튼</b>` · `“ ”` 인용 대조 — 남은 1건 `help.forge.combine.body` [最多] 는 같은 ko 「최대」 키가 도서관 `bk.max`(最高)뿐이라 걸린 것 — 실제 버튼은 합성의 `fg.synth.max`(最多×{n})라 맞다.
- `consistency.py` 재실행 — 일곱 덩어리 **495건** 남음, 전부 잡음:

| 잡음 유형 | 건 |
|---|---|
| 동음이의(UNIFY 명시) — 골드 金币↔黄金 · 부족 不足↔部族 · 회복 恢复↔治疗 · 최대 最大↔最多 · 해제 · 지점 地点↔节点 · 상단 商会↔商队/화면 위쪽 · 방어 防具/防守↔防御 · 등록 报名↔派驻 | 248 |
| 글자 겹침 · 이름 속 다른 글자 — 레이드⊂업그레이드·블레이드 · 레벨업 升级·레벨당 每级 · 마법사 法师 · ~의 분노 之怒 · 시전자만⊃자만 · 하나라도⊃나라 · 미니게임 · 차지하다 · 단일 보스 · 도감 베이스 이름(워 클럽 등) · 최후의 저항 背水一战 · 대신 받기 代为承受 · 烈焰(몬스터 이름) · 传说之锤(노트 결정) | 94 |
| 다른 뜻의 합성 라벨 · 설명문 — 스킬 강화 提升/增强 · 받는 피해 감소 설명문 · 기본/세부 옵션(属性 패널) · 쿨타임 감소/데미지 증가 설명문 · 유니크 아이템 暗金↔영웅 唯一 · 치명 확률 暴击率 · 새 게임 리롤 = [重掷] · 반복 원정 = 自动循环 · 관전 观看 · 잠금 해제 解锁 · 시전자 施放者 · 레이드 보스 패턴 광역 范围攻击 | 55 |
| 이야기 산문의 보통 낱말 — 갑옷 盔甲 · 무기 兵器 · 가죽 · 몬스터 사제 祭司 · 현상금 赏金 · 손짓 · 홀리기 · 함성 · 추방 · 냉기 寒气 · 금가루 · 명단 · 투구 · 신발 · 신의 벼락(신화 — 전직 노드 이름 아님) · 척후병 · 벽 너머 · 다음 차례 · 늦잠 | 50 |
| `consistency.py` 가 §2-1 표의 셋째 칸(「버린 것」)을 정답으로 읽는 파싱 — 단계→品阶 · 고정 피해→固定伤害 · 목걸이→护符 · 대박→头彩. 실제로는 바르게 고친 곳 | 48 |
