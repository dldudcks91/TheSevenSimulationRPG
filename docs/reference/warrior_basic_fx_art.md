# 전사 기본 스킬 이미지 이펙트

> 2026-10-06 사용자 지시로 아래 전사 8장과 기존 표시 설정을 복원했다([ADR-0528](../client/adr/0528-전사-기본-이펙트를-기존-그림으로-복원한다.md)). [새 시트](warrior_sheet_fx_art.md)는 원본·변환본·후보를 보관한다.

전사 기본 스킬의 실제 효과(`src/data/skill.csv`, `skill_effect.csv`, `skill_status.csv`)와 기존 연출(`src/ui/skill_looks.js`)을 기준으로 만든 전투용 투명 이미지다. 스킬 슬롯의 단색 아이콘과 별개다.

| 스킬 | 구현된 효과 | 이미지 | 움직임 |
|---|---|---|---|
| 배시 `war_bash` | 적 하나에게 강한 물리 타격 | 흰 중심·하늘빛 가장자리 사선 세 줄 | 빠르게 그어지고 사라짐 |
| 더블스윙 `war_doubleswing` | 적 하나에게 물리 두 타격 | 교차한 흰 베기 X | 교차 타격이 퍼짐 |
| 어스스플릿 `war_quake` | 적 전원에게 지면 공격 | 흙빛 균열과 돌 가시 | 낮게 터져 퍼지고 카드가 쿵 |
| 리프 어택 `war_leap` | 적 전원에게 도약 공격 | 은빛 내리꽂힘과 낮은 착지 파문 | 내려앉아 퍼지고 카드가 쿵 |
| 타운트 `war_taunt` | 시전자에게 적의 단일 공격을 유도 | 붉은 고리 | 안으로 조여듦 |
| 워 크라이 `war_shout` | 양옆 아군의 방어·모든 저항 강화 | 금빛 음파 호 세 겹 | 바깥으로 퍼짐 |
| 배틀오더스 `war_battleorders` | 양옆 아군의 최대 체력 강화 | 금빛 상승 꺾쇠 세 개와 훑음 | 위로 오름 |
| 아이언 스킨 `war_ironskin` | 자신의 방어·모든 저항 강화 | 중앙이 빈 강철 막 | 한 번 단단하게 부풂 |

그림체는 기존 초상과 이펙트 후보에 맞춘 굵은 암색 외곽선·평면 색·그림자 한 단계다. 배시와 더블스윙은 같은 색과 재질을 쓰고, 지면 공격 둘과 강화 넷은 형태와 방향으로 구별한다. 모든 그림은 기본 직업 스킬의 크기 규칙에 따라 초상 둘레 안에서 표시한다.

## 파일과 재현

- 생성 도구: **내장 `image_gen`**. 스킬마다 별도 호출로 생성했다.
- 전체 최종 프롬프트: [prompts.json](../../src/assets/art/fx_source/warrior_basic_20261005/prompts.json).
- 생성 원본: `src/assets/art/fx_source/warrior_basic_20261005/<skill_id>.png`.
- 게임용: `src/assets/art/fx/skills/<skill_id>.webp` — 384×384, 투명 알파, q90.
- 비교 시트: [preview.png](../../src/assets/art/fx_source/warrior_basic_20261005/preview.png) — 큰 이미지와 초상 위 85·101px 비교.
- 재빌드: `python scripts/build_warrior_skill_fx.py`(Pillow 필요). 생성 알파와 색을 유지하고 내용 경계·여백·해상도·인코딩만 맞춘다.
- 표시 표: `src/ui/skill_art.js`. 준비된 이미지를 먼저 쓰고 로딩 중·실패 시 기존 코드 조각을 쓴다.
- 게임에서 보기: `index.html?dev=battle&tab=codex&cx=skill&cxs=fx&lang=ko` → 전사 스킬 그룹의 ▶ 또는 카드 클릭.

규격: [SCREEN_DESIGN §4-2](../client/SCREEN_DESIGN.md), [ADR-0515](../client/adr/0515-전사-기본-스킬은-이미지-이펙트를-쓴다.md).

## 검증

8종 모두 투명 384px WebP로 읽히고, 관전 표시 함수와 도감 카드에서 각 스킬의 이미지·움직임을 확인했다. 설정 끄기, 도감의 설정 예외, 되감기·끊긴 카드 제외, 피해 팝업 층, 16배속, 두 타격, 다른 직업·기본 공격, 조각 상한, 로딩 실패 폴백의 11개 동작 검사가 통과했다. 애니메이션 종료 후 이미지가 제거되는 것도 확인했다.

전체 회귀 검사는 **508/515**다. 남은 7개는 물약 재고·체력 회복·첫 건설·골든 기준값 관련 기존 항목이며, 이 검사는 변경된 이펙트 모듈을 읽지 않는다. 작업 시작 이후 CSV 파일의 해시는 모두 동일하다. [검증 기록](../../src/assets/art/fx_source/warrior_basic_20261005/validation.json), [실제 도감 표시](../../src/assets/art/fx_source/warrior_basic_20261005/game_preview.png).

---
*마지막 업데이트: 2026-10-05*
