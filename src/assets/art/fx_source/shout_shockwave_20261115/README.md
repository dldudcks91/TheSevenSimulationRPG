# 초상 밖으로 퍼지는 함성 충격파 — 게임 적용본

2026-11-15 사용자 요청: 이번에 그린 시안을 모두 삭제하고, 함성은 초상 밖으로 나가도 되므로 디아블로 2 함성처럼 다시 그린다. 이전 `shout_revision_20261115/` 시안·원본·프롬프트·비교·내보내기를 삭제했다.

워 오더스·배틀 오더스·워 크라이·배틀 크라이·호령·사자후, 6종을 다크 카툰과 금속박으로 각각 생성했다. 생성 도구는 **Codex 내장 image_gen**, 스킬·그림체마다 별도 호출이다.

사용자가 새 그림으로 교체하고 기존 그림을 삭제하도록 요청해 게임에 적용했다. 머리 주위의 공기 충격파가 360도로 터지고, 원근이 있는 넓은 타원형 앞면과 찢어진 흐름을 만든다. 초상은 90px, 기본 충격파는 206–218px, 호령·사자후는 258·274px다. 파동 세 겹이 시간차를 두고 1100ms 동안 팽창한다. [ADR-1185](../../../../../docs/client/adr/1185-함성-여섯은-초상-밖으로-퍼지는-충격파-세-겹이다.md).

- [적용본 미리보기·재생](preview.html)
- [움직이는 6종 미리보기](shout_motion.gif) · [다크 카툰 한눈에 보기](showcase_darktoon.png)
- [실제 전투 함수 — 다크 카툰](installed_darktoon.png) · [실제 전투 함수 — 금속박](installed_foil.png)
- [전체 최종 프롬프트와 스킬 대응](manifest.json) · [생성 위치](generation_paths.json)
- `*.png`: 새 생성 원본 12장. `exports/*.webp`: 알파를 보존해 여백·크기만 정리한 512px 투명 파일 12장.
- [내보내기 검사](export_report.json) · [설치·삭제·해시 기록](installation_report.json) · [전투·도감·배속·투명도·정리 검사](runtime_verification.json)

게임은 `../../fx/skills/<skill_id>_shockwave_<style>.webp` 12장을 읽는다. 이전 개별 이미지 10장과 그 그림이 들어간 비교 캡처는 삭제했다. 다른 스킬 이미지 183장은 보존했다. 이전 그림과 섞여 있는 과거 원본 시트는 다른 스킬의 재료이므로 유지하며, 해당 시트의 함성은 재설치하지 않는다.

참고: [Blizzard, The Arreat Summit — Barbarian Warcries](https://classic.battle.net/diablo2exp/skills/barbarian-warcries.shtml). 함성의 넓게 퍼지는 충격파라는 움직임을 참고한 새 그림이며, 게임 화면이나 캐릭터를 복제하지 않았다.

다시 내보내기: `python src/assets/art/fx_source/shout_shockwave_20261115/export.py`.
설치·이전 개별 파일 삭제: `python src/assets/art/fx_source/shout_shockwave_20261115/install.py`.
실제 전투 함수와 도감 검사: `python src/assets/art/fx_source/shout_shockwave_20261115/verify_installed.py`.
