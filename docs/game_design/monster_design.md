# 몬스터 시스템 설계

> 상태: **TheSevenRPG 통째 계승** (2026-08-21) — 본 문서는 계승 구조 요약 + 정리 필요 항목
> 원본 SSOT: `TheSevenRPG/fastapi/docs/game_design/monster_design.md` + `fastapi/meta_data/` (monster_info, chapter_monster_pool, elite_trait, spawn_grade_config)
> 수치는 전부 원본 CSV 참조 — 본 문서에 기재하지 않음

---

## 1. 타입 3종 (monster_type)

| 타입 | 설명 | 용도 |
|---|---|---|
| Normal | 자연 생물·피조물 | 장비 공통옵션 `vs_Normal_damage` 대상 |
| Demon | 지옥/마법 계열 (고블린·오크 포함) | `vs_Demon_damage` |
| Undead | 죽어서 되살아난 존재 | `vs_Undead_damage` |

- 속성 상성 시스템 없음 — 타입은 **장비 옵션의 대상 분류 전용** ("드롭 편향"과 "전투 속성"의 분리)
- 규칙: **1스테이지 = 1타입 단일** → vs_type 옵션이 실질 의미를 가짐

## 2. 베이스 16종 (monster_base)

- **Normal (6)**: Wolf(고속 딜러) · Yeti(강타) · Troll(방어) · Lizardman(균형) · Golem(극단 방어) · Human(균형 전사)
- **Demon (5)**: Imp(빠른 마법) · Goblin(집단) · Succubus(디버프) · Gargoyle(방어) · Orc(강타)
- **Undead (5)**: Skeleton(밸런스) · Zombie(느린 고체력) · Ghost(물방↓마방↑) · Vampire(흡혈) · Lich(마법 극대)

원칙: **베이스 = 내부 분류(스탯/드롭 기준), 인스턴스 = 챕터별 고유 이름·외형.** 같은 Skeleton도 챕터마다 다른 존재로 보이게. 챕터×타입×베이스 매핑은 `chapter_monster_pool.csv`.

## 3. 스폰 등급 4종

일반 → 정예 → 스테이지보스 → 챕터보스. 등급별 HP/ATK/EXP/골드 배율과 드롭롤 횟수, 목표 전투시간은 `spawn_grade_config.csv` 참조. 드롭롤 횟수 차이가 파밍 동선(보스 러시 가치)을 만든다.

## 4. 정예(Elite) 특성 시스템 — 런타임 랜덤 생성

```
정예 = 노말 유닛 + 죄종 고유 특성 1 + 공통 특성 2
네이밍: [죄종 접두사] [몬스터 이름] [역할]  (예: "분노의 고블린 전사")
```

**죄종 고유 7종** — 각 죄종 성격의 전투 번역 + 명확한 카운터 존재:

| 접두사 | 특성 | 개념 | 카운터 |
|---|---|---|---|
| 분노의 | 격분 | 저체력 시 폭주 | 임계 전에 끝내기 |
| 나태의 | 태만 | 느리지만 한 방 | 한 방 버티는 몸 |
| 색욕의 | 유혹 | 공격력 흡수 스택 | 회피·속전속결 |
| 시기의 | 박탈 | 치명/회피 무효화 | 순수 공방 |
| 오만의 | 불가침 | 상태이상 면역 | 스탯 압도 |
| 폭식의 | 탐식 | 타격마다 공격력 누적 | 속전속결 |
| 탐욕의 | 도박 | 피해 랜덤 + 드롭 보너스 | 체력 여유 |

**공통 16종**: 스탯 강화 8(강인한/단단한/거대한/날랜/흉포한/민첩한/정확한/치명적인) + 전투 규칙 8(재생하는/가시의/경화의/선제의/보복의/폭발하는/저주받은/흡혈의). 효과 수치는 `elite_trait.csv`.

- "저주받은"은 상태이상 7종(story_chapter_design.md)을 소스로 사용
- 조합 다양성: 7 × C(16,2) = 840가지 정예 변형 — **콘텐츠를 곱셈으로 얻는 구조, 계승 가치 높음**

## 5. 데이터 구조 (`monster_info.csv`)

- 컬럼: idx, name, type, base, size_type(소/중/대), hp, attack, defense, magic_defense, attack_speed, exp_reward, sprite_path, description
- idx 채번: `CSNN` (챕터/스테이지/순번), 챕터보스 `X900`
- 신규 프로젝트 이관 시: 컬럼 구조는 유지하되 전투 수치는 우리 전투 엔진 기준으로 재밸런싱 필요

## 6. 계승 시 정리 필요 항목 (원본의 알려진 갭)

- [ ] Ch5~Ch7 스테이지 보스 9종이 플레이스홀더 (이름/베이스 미정)
- [ ] 원본 `monster_guide.md`는 구버전 (monster_grade 컬럼 서술이 실제 CSV와 불일치) — **계승하지 않음**, monster_design.md 계열만 계승
- [ ] Ch1 보스 공격력 밸런싱 미적용 구간 (타 챕터 대비 이상치)
- [ ] 파티 전투(우리는 1:1이 아닌 파티 자동전투) 전제의 스탯/AI 재설계 — 원본은 1:1 전투 기준

---

*마지막 업데이트: 2026-08-21 (최초 작성 — TheSevenRPG 계승 요약)*
