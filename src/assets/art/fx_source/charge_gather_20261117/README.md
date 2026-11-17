# 모으기 기운 — 게임 적용본

2026-11-17 사용자 요청: 차징 스킬을 쓸 때 영웅이 기를 모으는 느낌을 준다 — 웅크림 + 쏘는 순간 번쩍을 제안해 승인받았고, 「추가적인 이미지가 필요하면 codex로 그림그려서」 진행했다([ADR-1252](../../../../../docs/client/adr/1252-모으기는-모으는-동안-카드가-웅크리고-기운이-빨려-들며-쏘는-방에-번쩍이며-튄다.md)).

기운 그림 한 장을 **모으기 시전 방식(`channel_charge`)이 같이 쓴다** — 스킬마다 그리지 않는다. 가운데가 빈 나선 줄기가 안쪽을 향해 휜다. 관전에서는 초상 한가운데에 두 장이 반 박자 엇갈려 바깥(크게)에서 안(작게)으로 돌며 빨려 들고, 모일수록 진해진다(`src/ui/style.css` `fx-charge-gather`).

- 생성 — **Codex 내장 image_gen**(ChatGPT 로그인 · API 미사용) · 그림체마다 후보 둘(나선 줄기 · 갈고리 덩굴)을 병렬로 뽑아 나선 줄기를 골랐다. 스타일 기준 그림으로 그 그림체의 함성 충격파 · 리프 어택 · 메테오 설치본을 붙였다
- `charge_gather_darktoon.png` · `charge_gather_foil.png` — 고른 원본(1254px · 투명 배경)
- `prompt_darktoon.txt` · `prompt_foil.txt` — 보낸 프롬프트 그대로
- 안 고른 시안(갈고리 덩굴 두 장 — 금속박 판은 바탕에 회색 안개가 깔려 투명하지 않았다)은 남기지 않았다
- 게임 파일 — `../../fx/skills/charge_gather_<style>.webp`(512px · 알파 보존 · 90% 크기로 가운데 정렬)

다시 내보내기 · 설치: `python src/assets/art/fx_source/charge_gather_20261117/export.py` → [export_report.json](export_report.json)
