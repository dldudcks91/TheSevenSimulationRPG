# 배시·더블스윙 참격 두께 수정

> 이 문서는 두께 수정 시안의 기록이다. 현재 실전 그림은 세 갈래가 휘어지고 거칠게 찢긴 [호랑이 발톱 수정본](../baekho_tiger_claw_20261031/README.md)이다.

2026-10-31 사용자 요청 「참격의 두께를 조금만 더 두껍게」에 따라 **Codex 내장 imagegen의 이미지 편집**으로 [첫 시안](../baekho_darktoon_20261031/README.md)의 주 참격을 소폭 두껍게 수정했다. 프롬프트의 목표 증가는 약 25%이며, 이미지 전체 확대 대신 참격 본체 폭을 늘리도록 지시했다. 대각선 구도·길이·청백색/금빛 구분·다크 카툰 표현을 유지하는 방향으로 편집했다.

| 스킬 | 편집 원본 | 최종 프롬프트 | 현재 실전 파일 |
|---|---|---|---|
| 배시 | [war_bash.png](war_bash.png) | [배시 편집](prompt_war_bash.txt) | [war_bash_darktoon.webp](../../fx/skills/war_bash_darktoon.webp) |
| 더블스윙 | [war_doubleswing.png](war_doubleswing.png) | [더블스윙 편집](prompt_war_doubleswing.txt) | [war_doubleswing_darktoon.webp](../../fx/skills/war_doubleswing_darktoon.webp) |

[전후 비교 — 위가 기존, 아래가 수정본](before_after.png) · [수정본 384px/92px](comparison.png) · [게임 화면](codex_in_game.png)

원본은 투명 알파를 가진 1254×1254 PNG이며, [export.py](export.py)로 384×384 투명 WebP를 내보낸다. 설치본 용량은 배시 19,312바이트, 더블스윙 29,296바이트다. 두께 수정 전 설치본은 [previous](previous)에 보관했다. 알파 면적은 배시 약 20.5%, 더블스윙 약 33.7% 증가했다. 이는 보조 궤적까지 포함한 전체 면적 비교이며 본체 폭의 정확한 배율은 아니다. [측정 기록](thickness_comparison.json).

[내보내기 검사](export_report.json): 투명 알파·빈 모서리·경계 여백과 변경 대상 두 파일을 확인했다. [변경 전 해시](before_sha256.json) 대조 결과 다른 이펙트 200장은 동일하다.

[브라우저 검사](browser_verification.json): 배시 1타, 더블스윙 각 타격의 이미지·마스크·130ms 지연, ×1·×2·×4·×16 배속, 금속박 미리보기와 이미지 디코딩을 확인했다. 페이지 오류와 이펙트 요청 오류는 없다. [배시](battle_war_bash_0.png) · [더블스윙 1타](battle_war_doubleswing_0.png) · [더블스윙 2타](battle_war_doubleswing_1.png).

재내보내기: 저장소 루트에서 `python src/assets/art/fx_source/baekho_darktoon_thicker_20261031/export.py`.
