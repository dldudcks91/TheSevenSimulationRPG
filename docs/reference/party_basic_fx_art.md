# 기사 · 마법사 · 궁수 · 사제 기본 스킬 이미지 이펙트

전사의 이미지 이펙트를 다른 네 기본 직업으로 확장했다. 범위는 사용자 선택인 **기본 직업 스킬 전체**이며, `skill.csv`, `skill_effect.csv`, `skill_status.csv`의 실제 타격 · 강화 · 약화 · 회복 · 소환에 맞춘다.

| 직업 | 스킬 수 | 이미지 수 | 표현 |
|---|---|---|---|
| 기사 | 9 | 10 | 강철 충돌 · 금빛 보호 · 붉은 결투 표식과 보호 · 화염 강화 · 오오라 3종 |
| 마법사 | 8 | 8 | 불 폭발과 기둥 · 얼음 파편과 파문 · 수직 번개와 가로 연쇄 · 집중 · 얼음 벽 등장 |
| 궁수 | 6 | 6 | 단발 · 연사 · 화살 비 · 유도 궤적 · 관통 · 독 방울 |
| 사제 | 8 | 8 | 심판 · 파티 회복과 단일 회복 · 성광 강화 · 속도 · 재생 · 그림자 약화와 속박 |

32장의 그림은 모두 내장 `image_gen`으로 **장마다 별도 호출**해 생성했다. 굵은 암색 외곽선 · 평면 색 · 투명 배경이며, 384px 설치본에서 중앙 내용의 장변은 약 86%다. 보호와 강화 그림은 중앙을 비워 초상을 보여 준다. 표시 크기는 84~94px이고 동작은 340~820ms다. 배속을 따른다.

결투는 적의 표식 `kni_duel.webp`와 시전자의 보호 `kni_duel_guard.webp`를 따로 쓴다. 스마이트의 실제 효과는 물리 충돌이고, 인챈트의 실제 추가 원소는 화염이라 해당 데이터에 맞췄다. 사제 약화는 `bad`, 회복은 `heal`, 얼음 벽 등장은 `call`에 연결했다.

오오라 셋은 전투 중 계속 번쩍이지 않는다. 기존 `until: null` 제외를 유지하며, 도감 이펙트 탭에서만 그림을 미리 볼 수 있다.

## 생성과 재빌드

- 생성 도구: **내장 `image_gen`**.
- 전체 최종 프롬프트: [prompts.json](../../src/assets/art/fx_source/party_basic_20261006/prompts.json).
- 원본: `src/assets/art/fx_source/party_basic_20261006/<file>.png`.
- 게임용: `src/assets/art/fx/skills/<file>.webp`.
- 비교 시트: 같은 원본 폴더의 `preview_knight.png`, `preview_mage.png`, `preview_archer.png`, `preview_priest.png`.
- 재빌드: `python scripts/build_party_skill_fx.py`(Pillow 필요).
- 표시 표: `src/ui/skill_art.js`; 생성 알파와 색을 유지하고 CSS는 등장 · 이동 · 사라짐만 정한다.
- 게임에서 확인: `index.html?dev=battle&tab=codex&cx=skill&cxs=fx&lang=ko` → 직업 그룹 ▶ 또는 스킬 카드 클릭.

규격: [ADR-0520](../client/adr/0520-기본-다섯-직업의-스킬은-이미지-이펙트를-쓴다.md).

## 검증

32장 모두 384×384 투명 WebP이며, 설치본 합계는 873,974바이트다. [측정 기록](../../src/assets/art/fx_source/party_basic_20261006/measurements.json).

실제 `fx.js`를 Chrome에서 실행한 113개 검사와 이미지 읽기 실패 시 회복·소환의 코드 연출 2개 검사가 통과했다. 스킬별 그림과 움직임 · 설정 끄기 · 도감 설정 예외 · 되감기/끊긴 카드 제외 · 상시 오오라 제외 · 결투의 양수 적 표식과 자기 보호 · 약화 · 방벽 · 16배속 · 다단히트 · 피해 팝업 층 · 기본/전직 연출 유지 · 조각 상한 · 애니메이션 정리 · 전사 그림 유지가 포함된다.

실제 도감에서도 **31개 스킬 카드와 이미지 31개, 오오라 카드 3개**가 확인됐다. 결투의 두 번째 사건인 자기 보호 그림은 별도 표시 함수 검사와 기사 비교 시트에서 확인했다. [검증 기록](../../src/assets/art/fx_source/party_basic_20261006/validation.json), [실제 도감 표시](../../src/assets/art/fx_source/party_basic_20261006/codex_browser.png).

재검증: `python scripts/verify_party_skill_fx.py`(설치된 Chrome 또는 Edge 사용, 추가 Python 패키지 없음). 클라우드 대체 모듈은 로컬 검증 서버에서만 제공한다. 게임 파일이나 실제 계정에 적용하지 않는다. Windows 프로세스 통신이 제한된 샌드박스에서는 브라우저 실행 권한이 필요하다.

---
*마지막 업데이트: 2026-10-06*
