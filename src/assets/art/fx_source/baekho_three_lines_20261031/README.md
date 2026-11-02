# 배시·더블스윙 — 가운데 굵은 한 줄과 떨어진 양옆 두 줄

> 이 문서는 세 줄 구도를 확인한 이전 시안이다. 사용자의 후속 요청 「너무 단순하잖아… 호랑이가 발톱으로 할퀸 듯한 느낌」을 반영한 현재 실전 파일은 [호랑이 발톱 수정본](../baekho_tiger_claw_20261031/README.md)이다.

2026-10-31 사용자 정정 「바람의나라 백호참처럼 큰 거 가운데 한 줄 약간 떨어져서 한 줄씩 총 세 줄 느낌」을 반영했다. **Codex 내장 imagegen 이미지 편집**으로 각 참격을 가운데 굵고 긴 선 하나와 투명한 간격을 둔 양옆의 가늘고 긴 선 하나씩으로 다시 그렸다. 양옆 선은 파편이 아니라 길게 이어지는 평행선이다. 배시는 세 줄 한 묶음, 더블스윙은 청백색 세 줄과 금빛 세 줄이 교차하는 두 묶음이다.

[실제 백호참 핵심 프레임](../baekho_darktoon_20261031/reference_keyframes.png)과 [직전 시안](../baekho_darktoon_thicker_20261031/README.md)을 참조했다. 다크 카툰 윤곽·평면 명암·투명 배경을 유지했다.

| 스킬 | 생성 원본 | 최종 프롬프트 | 실전 설치 파일 |
|---|---|---|---|
| 배시 | [war_bash.png](war_bash.png) | [배시 세 줄 편집](prompt_war_bash.txt) | [war_bash_darktoon.webp](../../fx/skills/war_bash_darktoon.webp) |
| 더블스윙 | [war_doubleswing.png](war_doubleswing.png) | [더블스윙 세 줄 편집](prompt_war_doubleswing.txt) | [war_doubleswing_darktoon.webp](../../fx/skills/war_doubleswing_darktoon.webp) |

[384px/92px 비교](comparison.png) · [전후 비교 — 위가 이전, 아래가 세 줄 수정본](before_after.png) · [게임 화면](codex_in_game.png)

원본은 실제 투명 알파를 가진 1254×1254 PNG다. [export.py](export.py)로 384×384 투명 WebP로 내보냈고, 배시 16,350바이트·더블스윙 30,164바이트다. 교체 전 설치본은 [previous](previous)에 보존했다.

[세 줄 검사](three_line_check.json): 배시 설치본의 알파 128 초과 픽셀에서 면적 100px 이상인 분리된 모양이 정확히 세 개다. 작은 표시 크기와 실전 타격별 화면도 직접 확인했다. [배시](battle_war_bash_0.png) · [더블스윙 1타](battle_war_doubleswing_0.png) · [더블스윙 2타](battle_war_doubleswing_1.png).

[내보내기 검사](export_report.json): 투명 알파·빈 모서리·경계 여백과 변경 대상 두 파일을 확인했다. [변경 전 해시](before_sha256.json) 대조 결과 나머지 이펙트 200장은 동일하다. [브라우저 검사](browser_verification.json): 이미지 디코딩·배시 1타·더블스윙 각 타격과 130ms 지연·×1/×2/×4/×16 배속·금속박 재생을 확인했다. 페이지 오류와 이펙트 요청 오류는 없다.

재내보내기: 저장소 루트에서 `python src/assets/art/fx_source/baekho_three_lines_20261031/export.py`.
