# Diablo 2 데미지 공식 조사

> 조사 범위: Diablo II LoD 1.14 · D2R — 물리 피해 · 명중 · 블록 · 2배 피해(CS/DS) · 크러싱 블로우 · 오픈 운즈 · 받는 쪽 감소 · 원소 저항 · 흡수 · D2R 변경점.
> 1차 출처: **The Amazon Basin 위키**(게임 코드 역산 자료 — 원 도메인 theamazonbasin.com 이 간헐적으로 막혀 미러 `d2.lc/AB/wiki/` 로 읽었다) · maxroll.gg 로 교차 확인. The Arreat Summit(classic.battle.net)은 이번 조사에서 해당 페이지가 404 였다. fandom · purediablo · diablowiki 는 [00_overview.md](00_overview.md) 와 같은 이유로 배제.
> 신뢰도: ★★★ 코드 역산 1차 자료 · ★★ 커뮤니티 정리본(교차 확인) · ★ 단일 출처. **⚠ 미검증** = 원문으로 확인 못 하고 통설로 채운 곳.
> WebFetch 가 페이지를 요약 모델로 거쳐 오므로 **표 수치는 반올림 · 오독 가능성**이 있다 — 특히 §1 무기별 스탯 계수.
> ⚠ **이 문서의 수치는 전부 Diablo 2 의 것이다.** 본작 SSOT 가 아니며 `src/data/*.csv` 로 옮기지 말 것.

---

## 1. 물리 피해 — 곱하는 칸이 둘 ★★★

```
1. 무기 기본 min~max
2. × (1 + 에테리얼 50%)                    ← 에테리얼 무기만
3. × (1 + 무기에 붙은 ED%)                  ← 내림
4. + 무기의 +최소 / +최대 피해 · 「Adds X-Y damage」
5. + 「Damage +X」(양끝에 같은 값)
6. × (1 + 무기 밖 ED% + 스킬 피해% + 스탯 보너스% + 대상 종류별 %)   ← 전부 더한 뒤 한 번 곱한다
7. 명중 판정 — 실패면 0
```

- **무기 ED% 는 기본 피해에만, 무기 밖 % 는 고정 추가 피해까지 포함한 전체에** 곱한다. 두 칸은 서로 곱이다 — 원문: "300% Enhanced Damage results in 4 times base weapon damage while +300% Damage results in 4 times attack damage; together … 16 times base weapon damage"
- 고정 물리 추가 피해는 "무기 ED 뒤, 무기 밖 % 앞" 에 더해진다(「Adds Damage」 페이지)
- **아이템의 원소 추가 피해(+화염 등)는 이 줄에 없다** — 별도 줄이라 어떤 ED% 도 곱해지지 않는다
- 스탯 보너스(★ · ⚠ 미검증): 대부분 근접 무기 힘 1점당 1% · 활 · 석궁 민첩 1점당 1% · 발톱 · 단검 · 투척 힘 · 민첩 각 0.75%. 조사에서 받은 요약 하나는 "활도 힘" 이라고 답해 통설과 어긋났다 — 요약 오독으로 보이나, 무기별 정확한 계수는 원본 `weapons.txt` 의 StrBonus · DexBonus 칼럼을 봐야 한다
- ⚠ 미검증: 「레벨당 최대 피해」 의 자리(고정 추가 피해로 4번에 드는 것으로 알려짐) · 둔기의 언데드 +50%(6번 칸으로 알려짐)

## 2. 명중 ★★★

```
명중률 = clamp( 2 × AR/(AR+방어) × 공격자Lv/(공격자Lv+방어자Lv), 5%, 95% )
```

- 레벨 항이 있어 **같은 AR 이라도 고레벨 적에게 덜 맞는다.** 반대로 오버레벨은 95% 캡까지 이득이 있다
- 피해를 깎는 식이 아니라 **맞느냐 마느냐의 확률**이다 — 빗나가면 그 타격은 통째로 없다
- PvM · MvP · PvP 모두 같은 식이다(★★ — 검색 스니펫). D2R 에서도 같은 식이 그대로 인용된다(maxroll ★★ — "변경 없음" 명시 문구는 없음)

### 2-1. 레벨 — 누구의 무엇인가 ★★★

- 공격자 · 방어자 각자의 레벨. 플레이어 · 용병은 캐릭터 레벨
- 몬스터 레벨은 노멀에선 `MonStats` 값, **악몽 · 지옥에선 스폰된 지역의 지역 레벨**(보스류 제외). 챔피언 계열 +2 · 유니크 · 슈퍼유니크 · 미니언 +3
- ⚠ 미검증: 소환수의 레벨 식

### 2-2. AR 쌓기 ★★★

```
AR    = (기본 AR + 고정 AR + 레벨당 AR + 대 악마/언데드 AR) × (1 + Σ %AR)
기본 AR = (민첩 − 7) × 5 + 직업 상수
몬스터 AR = 몬스터 레벨 × MonStats 계수 / 100
```

- %AR 원천(아이템 · Zeal · Charge · Blessed Aim · Fanaticism · 무기 마스터리)은 **한 풀에 더한 뒤 한 번 곱한다**
- 예외: 전투 제단(Combat Shrine) +200% 는 풀 밖에서 한 번 더 곱한다

### 2-3. 방어 쪽 ★★★

```
방어구 베이스(저품질 −25%) → 에테리얼 +50%(내림) → 아이템 ED%(내림) → + 고정 방어
플레이어 방어 = Σ 아이템 방어 + 민첩/4
```

- **−% 대상 방어** — AR 에 `100/(100−x)` 를 곱하는 것과 같다. **플레이어 · 용병 · 슈퍼유니크 · 보스에겐 절반 효과.** 방어는 0 밑으로 안 간다
- **대상 방어 무시(ITD)** — 방어를 0 으로 본다 → `명중률 = 2 × 레벨 항`. 일반 몬스터 · 미니언 · 소환수에만 먹고 **플레이어 · 용병 · 챔피언 · 유니크 · 슈퍼유니크 · 보스엔 안 먹는다**
- Conviction 은 저항과 함께 방어도 깎는다(★★)
- ⚠ 미검증: Defiance · Iron Skin 등 방어 증가 스킬의 자리

### 2-4. 언제 굴리고, 무엇이 건너뛰나

- 굴림은 **타격 판정이 일어날 때마다 1회**다. 휠윈드는 판정 프레임마다(4 · 8프레임, 이후 IAS 주기) 한 대상씩 굴린다 ★★★
- **"Always Hits" — AR 판정 생략**: Lightning Bolt · Guided Arrow · Lightning Fury · Smite · 몬스터 Charge. 블록 · 회피(Dodge 등)는 그대로 받는다 ★★★
- ⚠ 미검증: 주문(원소 스킬) 전반이 AR 을 안 쓴다는 통설 · 다중 화살의 화살별 굴림 · D2R 스플래시가 원 타격에 종속되는지
- ★ 재확인 필요: "달리는 중이면 명중 판정 생략(Leap · Leap Attack · Whirlwind · Charge 예외)" 문구가 있다 — 달리는 **방어자**는 판정 없이 맞는다는 뜻으로 읽히나 원문 재확인 전

### 2-5. 빗나가면 · 순서

- 명중해야 피해와 다른 이벤트가 발동한다 — 빗나가면 무기 원소 추가 피해 · 흡수 · 넉백까지 전부 없다 ★★★. 크러싱 블로우 · 데들리 스트라이크 · 오픈 운즈 각각의 문구는 ⚠ 미확인(구조상 같이 무산으로 추정)
- **On Striking(타격 시)** — 명중하고 블록 · 회피까지 전부 통과해야 발동 ★★★
- **On Attack(공격 시)** — 빗나가도 · 막혀도 발동 ★★
- 순서: **명중 → 블록 → 아마존 Dodge/Avoid/Evade · 어쌔신 Weapon Block** — On Striking 정의의 나열 순서에서 읽은 정황 ★★. 몬스터 블록의 자리는 ⚠ 미확인
- 캐릭터 화면의 명중률(AR 마우스오버)은 ITD · −% 대상 방어를 반영하지 않는다 ★★★. 기준 대상이 누구인지는 ⚠ 미확인

## 3. 블록 ★★★

```
블록률 = min( (방패 블록% + 추가 블록%) × (민첩 − 15) / (캐릭터Lv × 2), 75% )
```

- 정지 · 공격 · 시전 · 걷기 중엔 75% 캡, **달리는 중엔 결과의 1/3** (실질 캡 25%)
- 클래식(확장팩 이전)은 민첩 항 없는 더 단순한 식이었다는 언급만 있고 세부는 미확보

## 4. 2배 피해 · 특수 타격

### 크리티컬 · 데들리 스트라이크 ★★★

```
2원 결합 = 1 − (1−DS)(1−CS)
3원 결합 = 1 − (1−DS)(1−CS)(1−마스터리CS)        ← 더하지 않는다(확률 OR)
```

- 셋 중 하나만 발동(상호 배타) → **물리 피해만 ×2.** 겹쳐서 ×4 는 없다
- 물리 → 원소 변환 스킬은 변환 뒤에도 2배가 남는다. Impale · Dragon Talon · Sacrifice · Smite 등은 예외

### 크러싱 블로우 ★★★

명중하면 확률로 **대상 현재 HP 의 비율**을 깎는 독립 줄 — 일반 피해 계산과 별개다.

| 대상 | 근접 | 원거리 |
|---|---|---|
| 일반 · 챔피언 · 유니크 · 소환수 | 1/4 | 1/8 |
| 슈퍼유니크 · 보스 | 1/8 | 1/16 |
| 플레이어 · 용병 | 1/10 | 1/20 |

- 대상의 양수 물리 저항만큼 줄어든다. 저항이 음수(Amplify · Decrepify)여도 **더 커지지는 않는다.** % 피해 감소 50% 캡은 크러싱 블로우에 적용되지 않는다
- 크리티컬 2배를 받지 않는다
- D2R 일반형(maxroll ★★): `1/4 × 현재 HP ÷ (0.5 + 0.5 × 인원수)` — 1인이면 위 표와 같다

### 오픈 운즈 ★★★

- 프레임당 출혈(1/256 단위). 레벨 구간별 식 — `(9×Lv)+31` (1~15) … `(45×Lv)−1319` (60+)
- 특수 몬스터 대상 1/2 · 플레이어 대상 근접 1/4 · 원거리 1/8 추가 배율
- 지속 200프레임(8초) · 재적용 시 지속시간만 초기화 · Replenish Life 류 재생을 무시하고 통과

## 5. 받는 쪽 감소 — 물리 ★★★

```
들어온 물리 피해
  → 고정 피해 감소(Damage Reduced by X)
  → % 피해 감소(캡 50% · 하한 −100%)       ← 몬스터는 이 자리가 물리 저항%
```

- % 피해 감소는 Amplify Damage · Decrepify 로 깎이므로 50% 를 넘겨 쌓는 것이 디버프 대비 버퍼로 의미가 있다
- 고정 피해 감소는 크러싱 블로우 · Sacrifice 자해 피해에 적용되지 않는다
- Amplify Damage(−100%) · Decrepify(−50%) 는 **물리 면역 대상에게 1/5 효과**(−20% · −10%)

## 6. 원소 · 마법 · 독 ★★★

```
고정 마법 피해 감소(MDR) → 저항% → 흡수(Absorb, 고정 · %)
받는 피해 = 피해 × (100 − 최종 저항) / 100
최종 저항 = 기본 저항 − 난이도 페널티 − 적 저항 감소        (하한 −100 · 100 이상 = 면역)
```

- 원문: "Resistance modifies the relevant damage type by a percentage, after Damage Reduced and Magic Damage Reduced have been applied"
- 플레이어 저항 캡 75% · 최대 저항 옵션으로 95% 까지
- 난이도 페널티: 악몽 −40 · 지옥 −100 (⚠ 노멀 0 은 통설 — 원문 미확인)
- **면역 규칙** — 아이템의 일반 −적 저항은 "저항이 100 미만일 때만" 먹는다. 저주 · 오라는 면역 대상에게 **1/5 효과**(예: Conviction −85 → −17)라 면역이 잘 안 깨진다. Amplify · Decrepify 의 1/5 은 원문 확인 · ⚠ Conviction · Lower Resist 의 1/5 은 원문 미확인(통설)
- 쌍수 무기의 −적 저항% 는 합산된다
- 독: `총 피해 = rate × 프레임 / 256` (1초 = 25프레임). 재적용 규칙은 방향마다 다르다 — 높은 rate 가 낮은 것을 즉시 덮어쓰고, 낮으면 1프레임만 얹고 기존 지속
- ⚠ 미검증: 스킬 원소 피해 = 스킬 기본 피해 × (1 + 시너지%) × (1 + 마스터리% + 아이템 +% 원소 스킬 피해) — 시너지와 마스터리가 곱이라는 통설

## 7. 생명력 · 마나 흡수 ★★★

- 감소가 다 적용된 **최종 물리 피해 × 흡수%** — 원문: "based on a percentage of final physical attack damage applied"
- 난이도 페널티: **악몽 1/2 · 지옥 1/3**
- 물리를 100% 원소로 바꾸는 스킬(레벨 49+ Fire · Cold Arrow, Lightning Bolt, 레벨 33+ Fists of Fire, Berserk 등)엔 발동하지 않는다

## 8. D2R 변경점 ★★

- 명중 · 블록 핵심 식은 1.14 와 같은 식이 그대로 인용된다
- 2.6 패치: Cold Mastery 가 면역 해제 뒤 1/5 효과로 재조정 · Metamorphosis 룬워드의 크러싱 블로우가 고정 스탯으로 이동 — 코어 공식이 아니라 개별 조정
- ⚠ 미검증: 2.5 패치의 Sunder 차암(면역 강제 해제)은 이번 조사에서 원문 확인 못 함
- 2026-02 확장팩 「Reign of the Warlock」 이 데미지 공식을 바꿨다는 근거는 찾지 못함 ★

## 9. 한 장 요약 — 파이프라인

```
[공격 쪽]
1. 무기 기본 × 에테리얼 × 무기 ED%
2. + 고정 물리 피해
3. × (1 + 무기 밖 %)
4. 명중 판정(레벨 항 · 5~95%) → 블록 판정(75% · 달리면 1/3)
5. 크러싱 블로우 — 현재 HP 비율, 독립 줄
6. CS / DS / 마스터리 CS 확률 OR → 물리 ×2
   원소 · 마법 · 독은 1~3 을 안 거치는 별도 줄
[받는 쪽]
7. 물리: 고정 감소 → % 감소(캡 50%) · 원소: MDR → 저항(난이도 페널티 · 면역 1/5) → 흡수
8. 생명력 · 마나 흡수 = 최종 물리 × % (악몽 1/2 · 지옥 1/3)
```

## 10. 본작에 주는 시사점

- **명중률의 `AR/(AR+방어)` 는 본작 방어 곡선 `K/(K+방어)`([battle_design §9-3](../../game_design/battle_design.md))와 같은 모양이다** — 차이는 K 자리에 **공격자의 값(AR)** 이 들어간다는 것. 본작이 08-26 에 버린 "K 가 공격자에 따라 변한다" 쪽이고, D2 는 그걸 피해가 아니라 **명중 확률**에 걸었다
- **오버레벨의 이득** — D2 는 레벨 항 덕에 95% 캡까지 오버레벨 이득이 있다. 본작 §9-4 는 적중률을 레벨 차로만 정하고 오버레벨 초과 이득이 없다
- **무기 ED% 와 무기 밖 % 의 칸 분리** — 무기 밖 옵션을 아무리 쌓아도 무기 베이스가 끝까지 의미를 갖는 장치
- **CS / DS 확률 OR** — 같은 효과를 여러 원천에서 모아도 체감한다. 상한 규칙 없이 쌓기를 누르는 방식(본작 §9-3 「피해 감소는 원천별로 곱한다」와 같은 발상)

## 출처

| 페이지 | 다룬 절 | 신뢰도 |
|---|---|---|
| [Damage](https://d2.lc/AB/wiki/index9c3b.html?title=Damage) | §1 순서 목록 | ★★★ |
| [% Damage](https://d2.lc/AB/wiki/index0ccc.html) · [Adds Damage](https://d2.lc/AB/wiki/indexa0d7.html) | §1 칸 관계 · 고정 피해 자리 | ★★ · ★★★ |
| [Attack](https://d2.lc/AB/wiki/indexd836.html) · [maxroll Hit Chance](https://maxroll.gg/d2/resources/hit-chance-mechanics) | §2 · §2-1 · §2-4 | ★★★ · ★★ |
| [Attack Rating](https://d2.lc/AB/wiki/index49ee.html) · [% Attack Rating](https://d2.lc/AB/wiki/index9855.html) | §2-2 | ★★★ |
| [Defense](https://d2.lc/AB/wiki/index8959.html) · [Target Defense](https://d2.lc/AB/wiki/index8a05.html) · [Ignore Target's Defense](https://d2.lc/AB/wiki/indexb96c.html) | §2-3 · §2-5 | ★★★ |
| [Whirlwind](https://d2.lc/AB/wiki/indexf74e.html) · [On Striking](https://d2.lc/AB/wiki/index496f.html) | §2-4 · §2-5 | ★★★ |
| [Block](https://d2.lc/AB/wiki/index2117.html) · [maxroll Block](https://maxroll.gg/d2/resources/block-mechanics) | §3 | ★★★ · ★★ |
| [Deadly Strike](https://d2.lc/AB/wiki/indexc837.html) · [Critical Strike](https://d2.lc/AB/wiki/index88a0.html) | §4 | ★★★ |
| [Crushing Blow](https://d2.lc/AB/wiki/index889d.html) · [maxroll Damage Calculation](https://maxroll.gg/d2/resources/damage-calculation) | §4 · §9 | ★★★ · ★★ |
| [Open Wounds](https://d2.lc/AB/wiki/indexad3f.html) | §4 | ★★★ |
| [Damage Reduced](https://d2.lc/AB/wiki/index71ac.html) · [maxroll Damage Reductions](https://maxroll.gg/d2/resources/damage-reductions) | §5 | ★★★ · ★★ |
| [Amplify Damage](https://d2.lc/AB/wiki/indexc9ff.html) · [Decrepify](https://d2.lc/AB/wiki/index537c.html) | §5 · §6 | ★★★ |
| [Resistance](https://d2.lc/AB/wiki/index05a3.html) · [Enemy Resistance](https://d2.lc/AB/wiki/indexfe43.html) · [Poison Damage](https://d2.lc/AB/wiki/index3a3a.html) | §6 | ★★★ |
| [Life Stolen](https://d2.lc/AB/wiki/index14cd.html) | §7 | ★★★ |
| [maxroll 2.6 Patch Notes](https://maxroll.gg/d2/news/patch-2-6-final-patch-notes) · [Icy Veins — Reign of the Warlock](https://www.icy-veins.com/d2/news/diablo-2-resurrected-reveals-reign-of-the-warlock-expansion/) | §8 | ★★ · ★ |

---
*마지막 업데이트: 2026-09-22*
