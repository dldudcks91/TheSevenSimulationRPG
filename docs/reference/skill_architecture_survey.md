# 스킬 시스템 아키텍처 조사 — 타 게임은 어떻게 짜는가

> 목적: `skill_design.md` 확정분을 `src/game_logic/` 에 구현하기 전에, 데이터 주도 스킬/능력 시스템의 업계 패턴을 확인한다.
> 조사 방식: 웹 조사(2026-08-28). 공개 문서·소스가 있는 것(Dota 2 KV · PoE · D3 · Unreal GAS · Godot/Unity 패턴 · Cataclysm DDA · FF12 Gambit)은 구체적으로 확인했고, 클로즈드소스(Lootun · NGU · Idle Champions · LoL · Genshin · Epic Seven)는 커뮤니티 추정이라 **[추정]** 표시.
> 적용 결정은 이 문서가 아니라 [DEV_PLAN.md](../client/DEV_PLAN.md) · [INTERFACE.md](../client/INTERFACE.md) 가 갖는다.

---

## 1. 데이터 주도 스킬/능력 정의

**Dota 2** — `npc_abilities.txt`(KeyValues) 한 파일에 전 스킬의 메타데이터. 확인된 필드: `AbilityBehavior`(NO_TARGET/UNIT_TARGET/POINT/PASSIVE/CHANNELLED/TOGGLE, `|` 조합) · `AbilityUnitTargetTeam`(ENEMY/FRIENDLY/BOTH) · `AbilityUnitTargetType`(HERO/BASIC/BUILDING/CREEP) · `AbilityUnitTargetFlags` · `AbilityCastRange` · `AbilityCastPoint` · `AbilityChannelTime` · `AbilityCooldown`/`AbilityManaCost`/`AbilityDamage`(레벨별 공백 구분 값 목록 `"100 200 300 400"`) · `AbilityUnitDamageType`(MAGICAL/PHYSICAL/PURE) · `MaxLevel` · `RequiredLevel`. KV 는 **메타데이터·튜닝 수치**만 담고 발동 로직은 Lua/C++ — 순수 데이터 주도가 아니라 "데이터 + 코드 하이브리드". ([ModDota](https://moddota.com/abilities/ability-keyvalues) · [Valve wiki](https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Scripting/Abilities_Data_Driven) · [npc_abilities.txt](https://github.com/dotabuff/d2vpk/blob/master/dota_pak01/scripts/npc/npc_abilities.txt))

**Path of Exile** — 스탯을 내부 ID(`maximum_life_+%`)로 관리하고, ID+수치 → 표시 문구 번역(`stat_translations.json`)과 어떤 아이템에 어떤 스탯이 붙나(`mods.json`)를 분리. **"내부 계산용 ID" ↔ "표시용 텍스트" 완전 분리**가 핵심 패턴. ([PoE Wiki Stat](https://pathofexile.fandom.com/wiki/Stat) · [Modifiers](https://pathofexile.fandom.com/wiki/Modifiers) · [RePoE](https://github.com/brather1ng/RePoE))

**Cataclysm: DDA** (오픈소스 · JSON 완전 데이터 주도) — 상태 이펙트 예:
```json
{ "type": "effect_type", "id": "drunk", "name": ["Tipsy", "Drunk", "Trashed"], "max_intensity": 3,
  "base_mods": {"str_mod": [1]}, "scaling_mods": {"per_mod": [-1]} }
```
`base_mods`(강도 1 값) / `scaling_mods`(강도당 추가) 분리 · `removes_effects`/`blocks_effects`(상호 배제) · `int_decay_step`(자동 감쇠) — **강도(intensity)를 1급 축**으로 둔다. ([EFFECTS_JSON](https://docs.cataclysmdda.org/JSON/EFFECTS_JSON.html))

**Slay the Spire 2** [추정 — 디컴파일] — 카드는 코드 클래스이되 수치는 `DamageVar`·`BlockVar`·`PowerVar<T>` 같은 가변 값 컨테이너. "코드 클래스 + 가변 값 필드" 절충형. ([spire-codex](https://github.com/ptrlrd/spire-codex/blob/main/README.md))

**공통 필드 6축**: trigger(언제) / target selector(누구에게) / effect list(무엇을) / scaling(값) / cost(자원) / cooldown(재사용) + condition(발동 조건).

## 2. 이펙트 / 트리거 아키텍처

**Unreal GAS** — `GameplayEffect` = 어트리뷰트 Modifier 집합. 연산 종류 Add / MultiplyAdditive / DivideAdditive / MultiplyCompound / AddFinal / Override. Magnitude 는 ① 고정 스칼라 ② 데이터 테이블 ③ 커스텀 계산 클래스(`UGameplayModMagnitudeCalculation`). `GameplayTag` 로 소스/타겟 조건 분기. 발동 로직과 연출(`GameplayCue`)이 **명시적으로 분리**. ([Unreal Directive](https://unrealdirective.com/resources/cpp-reference/gas/) · [GameplayEffect.h](https://github.com/ylyking/UnrealEngineNiv/blob/master/Engine/Plugins/Runtime/GameplayAbilities/Source/GameplayAbilities/Public/GameplayEffect.h) · [Epic 공식](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-unreal-engine-gameplay-ability-system))

**Godot `godot-gameplay-systems`** — `Ability`(Resource) + `AbilityContainer`(Node) + 문자열 태그 배열. `tags_activation_required` · `tags_block` · `tags_cooldown_start/end` · `tags_to_remove_on_*` — **태그 문자열이 조건이자 이벤트이자 상태**라 별도 이벤트 버스 없이 트리거 체계를 만든다. ([ability-system.md](https://github.com/OctoD/godot-gameplay-systems/blob/main/docs/ability-system.md))

**Unity ScriptableObject** — 스킬 = SO 에셋(Strategy 패턴). 데이터(SO) · 로직 · 표현 3분리. 새 스킬 = 새 에셋. ([Wayline](https://www.wayline.io/blog/unity-skill-tree-scriptable-objects) · [dev.to](https://dev.to/eriksk/implementing-the-strategy-design-pattern-using-scriptable-objects-in-unity-292i))

**상태 이펙트 일반 패턴** — 정적 정의(최대 지속·틱 주기·최대 스택)는 Flyweight 로 한 번, 런타임 인스턴스(현재 스택·남은 시간)만 개별 보유. 이벤트 버스/옵저버(`OnHit`·`OnKill`·`OnTurnStart`)는 결합도를 낮추지만 **디버깅 난도가 오른다**는 트레이드오프가 반복 지적됨. ([salivity](https://salivity.github.io/game-development/article/rpg-status-effect-and-cooldown-architecture) · [Stray Pixels](https://straypixels.net/statuseffects-framework/) · [hackernoon](https://hackernoon.com/using-an-enum-based-event-bus-pattern-in-unity))

## 3. 스탯 수정자 스태킹

원리는 어디나 같다 — **같은 카테고리 안은 덧셈, 카테고리 사이는 곱셈.**

- **PoE** — increased/reduced 는 한 합산 계수 · more/less 는 각각 곱. "…당 x% more" 는 자기끼리 더하고 다른 more 와 곱. ([커뮤니티 종합](https://steamcommunity.com/app/238960/discussions/0/1842367319525042043))
- **Diablo 3** — 최종 = 기본 × 스킬 배율 × Π(카테고리별 합). 카테고리: 주스탯 · 치명 · 속성 · 엘리트 · 몬스터 타입 · 스킬 고유 버프(DIBS) · 펫. 예: 물리 18%+17% (합 1.35) × 엘리트 15% × 강화 20% = 1.863. ([Maxroll](https://maxroll.gg/d3/resources/damage-multipliers-thorns-explained))
- **GAS** — `((Base + AddBase) × MultiplyAdditive ÷ DivideAdditive × MultiplyCompound) + AddFinal`, Override 는 전부 대체. PoE/D3 의 "버킷" 을 연산자 5종으로 형식화한 것.

**결정론 함의** — 스태킹 순서가 코드 경로(어느 버프가 먼저 계산됐나)에 의존하면 안 되고 **카테고리 ID 로 명시 정렬**해야 재현된다. GAS 의 고정 파이프라인이 이를 구조적으로 강제.

> 본작 대응: battle_design.md §9 의 「괄호는 둘뿐(상시/조건부) · 괄호 안 덧셈 · 괄호끼리 곱셈」이 정확히 이 패턴이다. 버프 효과는 새 괄호를 만들지 않고 기존 괄호에 **더한다**(skill_design.md §3).

## 4. 액티브 vs 패시브 · 자동전투 선택 로직

패시브 = 상시 적용 Modifier(무조건 또는 "HP 50% 이하" 같은 상시 감시 조건) / 액티브 = 쿨·비용·AI 선택이 붙은 별도 오브젝트 — GAS/Dota 공통.

**FF12 Gambit** — 정렬된 「조건 → 대상 → 행동」 규칙 목록을 위에서부터 검사해 **조건이 참인 첫 규칙을 실행**, 차례마다 처음부터 재평가. 플레이어는 순서 재배치·개별 on/off. 자동전투 "AI 우선순위 목록" 설계 대부분이 이 형태. ([FF12 Wiki](https://finalfantasy.fandom.com/wiki/Gambits) · [구현기](https://immersivenick.wordpress.com/2019/03/31/programming-the-ffxii-gambit-system/))

Epic Seven S1/S2/S3 [추정] — 공식 문서 없음. 커뮤니티 관찰상 "쿨 돌아온 것 중 번호 높은(강한) 스킬 우선".

> 본작 대응: battle_design.md §3 「가장 오래 기다린 것 → 우선순위 → 기본 공격」은 Gambit 의 변형이다 — 1차 키가 조건이 아니라 **대기 시간**이고, 우선순위는 동률 결정자. `cast_condition`(skill_design.md §9-3)이 Gambit 의 조건 항에 해당한다.

## 5. 타겟팅

**Yanfly Target Core(RPG Maker)** — `<Target: x Random Foes>` · `<Target: Everybody hp Multiple Of x>` 처럼 **"수량 + 필터"를 선언 문자열 하나로**. 조건 기반(최저 HP 등)은 DSL 만으로 부족해 `<JS Targets>` 로 탈출하는 게 흔함 — **단순 케이스는 DSL, 복잡 케이스는 코드 탈출구**. ([Yanfly](https://www.yanfly.moe/wiki/Target_Core_(YEP)))

**Dota 2** — 팀(ENEMY/FRIENDLY/BOTH) × 타입(HERO/BASIC/…) × 특수 플래그 3단 필터.

→ 결국 **「팀 필터 × 정렬 기준 × 개수」 3튜플**로 환원된다: `enemy|lowest_hp|1` · `ally|self|1` · `enemy|all|*` · `enemy|random|2`.

## 6. 결정론과 리플레이

TFT/오토체스 내부 시딩은 비공개 [추정]. 일반 원칙은 명확:
- 락스텝의 전제 = 비트 단위 결정성. 부동소수 플랫폼 차이도 깨뜨린다. ([SnapNet](https://www.snapnet.dev/blog/netcode-architectures-part-1-lockstep/))
- **시뮬레이션 RNG 와 연출 RNG 는 반드시 분리** — 연출이 소비한 난수가 시뮬 순서에 끼면 재현이 깨진다. ([Meseta](https://meseta.medium.com/netcode-concepts-part-3-lockstep-and-rollback-f70e9297271))
- 디버깅 관례: 입력 기록 → 같은 입력 재생 → 디싱크 확인을 **가장 먼저** 만든다. ([GameDev.net](https://www.gamedev.net/forums/topic/685257-lockstep-desyncing-because-of-rng-i-think/))

> 본작 대응: INTERFACE.md §5-2 「rng 소비 순서가 곧 계약」· §5-4 double 강제 · DEV_PLAN 부채 #7 골든 시드 스냅샷이 여기 해당.

## 7. 인터프리터(미니 DSL) vs 함수 레지스트리

| 극단 | 사례 | 성격 |
|---|---|---|
| 완전 데이터/인터프리터 | Cataclysm DDA | JSON 필드만으로 이펙트 표현. 코드 컴파일 불요 |
| 하이브리드 | Dota 2 · GAS | 수치·메타는 데이터, 트리거 로직은 Lua/C++ · `ExecutionCalculation` 코드 확장점 |
| 완전 코드/레지스트리 | Unity SO | 데이터는 "어느 클래스 + 파라미터", 로직은 `Execute()` |

JVM Gaming 「Fully Data Driven Skill System」 논의 — Passive/Active 를 3~4단 클래스 계층으로 나눴다가 "너무 복잡·흩어진다" 지적을 받고 **1개 타입 + nullable 파라미터**로 단순화. 타입 세분화로 표현력을 늘리려는 시도가 과설계로 귀결되는 반례. ([jvm-gaming](https://jvm-gaming.org/t/fully-data-driven-skill-system/58344))

Nystrom **Type Object** 패턴 — "새 콘텐츠 = 새 데이터 인스턴스 · 새 행동 = 새 코드"를 명확히 가르는 절충. ([요약](https://tylerayoung.com/2017/01/23/notes-on-game-programming-patterns-by-robert-nystrom/))

## 8. 본작(소규모 데이터 주도 자동전투)에 대한 시사점

1. **스키마는 6축 고정** — trigger / target / effect list / scaling(CSV 키) / cost / cooldown (+ condition). 필드가 늘수록 CSV 가독성이 떨어진다.
2. **"이펙트 타입 이름 + 파라미터" 레지스트리**를 권장, 완전 DSL 인터프리터는 지양. 로직-데이터 경계가 유동적인 초기엔 함수 레지스트리가 반복이 빠르다. 타입이 30~40종을 넘으면 계층 과설계 주의.
3. **스탯 스태킹은 버킷 enum 으로 명시**(base / increased(가산) / more(승산) / override), 순서는 코드 경로가 아니라 **고정 파이프라인 함수 하나**로. PoE/D3/GAS 셋 다 여기로 수렴 = 재현 가능성의 최소 요구.
4. **패시브 = 상시 Modifier, 액티브 = 쿨·비용 오브젝트**로 나누되 같은 effect 스키마를 공유하면 스키마가 하나로 준다. 대신 UI 탭 분리는 다른 층위에서.
5. **자동전투 선택은 Gambit 형** — 정렬된 규칙 목록 · 첫 매치 실행 · 매 차례 재평가. "왜 이 스킬을 썼나"가 추적되어 통제성 원칙과 맞다.
6. **타겟 셀렉터는 팀 × 정렬 × 개수 3튜플**로 인코딩. 예외는 별도 플래그.
7. **RNG 는 전투 로직 전용 스트림 하나** — 연출용 난수는 배제.
8. **연산 순서는 가산 → 승산 → 오버라이드 고정**, 이펙트가 어느 버킷인지는 데이터가 선언.
9. **상태 이펙트는 정적 정의(CSV 한 행) + 런타임 인스턴스(스택·남은 시간) 2분리**.
10. **이벤트 훅은 전역 버스보다 `Map<TriggerKey, Effect[]>` 를 유닛이 들고 있는 형태** 우선. 전장 전역 효과(오라)는 별도 리스너가 필요할 수 있다.
11. **값은 CSV · 종류는 코드** — CLAUDE.md 규칙 2 가 업계 표준 절충과 일치한다는 근거.
12. **예외가 계속 느는 영역(타겟팅·트리거·스택)은 처음부터 코드 탈출구**를 둔다 — "80% 데이터 · 20% 명명된 코드 함수"가 현실적 목표.

---
*마지막 업데이트: 2026-08-28 (최초 작성 — 스킬 game_logic 구현 착수 전 조사)*
