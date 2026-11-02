# 배시·더블스윙 — 호랑이가 발톱으로 할퀸 듯한 참격

2026-10-31 사용자 정정 「이건 너무 단순하잖아 뭔가 호랑이가 발톱으로 할퀸 듯한 느낌」을 반영했다. **Codex 내장 imagegen 이미지 편집**으로 [직전의 세 줄 시안](../baekho_three_lines_20261031/README.md)에 휘어진 궤적, 갈고리처럼 날카로운 끝, 거칠게 뜯긴 가장자리와 작은 파편을 넣었다. 굵고 긴 가운데 자국과 조금 가는 양옆 자국을 떨어뜨려 세 갈래를 유지하고, 시작점·길이·굽음에 차이를 주었다. 다크 카툰의 어두운 윤곽·각진 명암과 청백색/금빛 구분을 사용한다.

| 스킬 | 편집 원본 | 최종 프롬프트 | 현재 실전 설치 파일 |
|---|---|---|---|
| 배시 | [war_bash.png](war_bash.png) | [배시 발톱 편집](prompt_war_bash.txt) | [war_bash_darktoon.webp](../../fx/skills/war_bash_darktoon.webp) |
| 더블스윙 | [war_doubleswing.png](war_doubleswing.png) | [더블스윙 발톱 편집](prompt_war_doubleswing.txt) | [war_doubleswing_darktoon.webp](../../fx/skills/war_doubleswing_darktoon.webp) |

[384px/92px 비교](comparison.png) · [전후 비교 — 위가 이전, 아래가 발톱 수정본](before_after.png) · [게임 화면](codex_in_game.png)

배시는 청백색 세 갈래가 한 번 훑고, 더블스윙은 청백색 세 갈래와 금빛 세 갈래가 차례로 교차한다. 실제 표시 크기의 분리된 발톱 자국과 각 타격을 직접 확인했다. [배시](battle_war_bash_0.png) · [더블스윙 1타](battle_war_doubleswing_0.png) · [더블스윙 2타](battle_war_doubleswing_1.png).

원본은 실제 투명 알파를 가진 1254×1254 PNG다. [export.py](export.py)로 384×384 투명 WebP로 내보냈으며, 설치본 용량은 배시 31,018바이트·더블스윙 56,444바이트다. 직전 세 줄 설치본은 [previous](previous)에 보존했다.

[내보내기 검사](export_report.json): 투명 알파·빈 모서리·경계 여백을 확인했다. [변경 전 해시](before_sha256.json) 대조 결과 이번 두 파일 외의 이펙트 200장은 동일하다. [브라우저 검사](browser_verification.json): 이미지 디코딩·배시 1타·더블스윙 각 타격과 130ms 지연·×1/×2/×4/×16 배속·금속박 재생을 확인했다. 페이지 오류와 이펙트 요청 오류는 없다.

재내보내기: 저장소 루트에서 `python src/assets/art/fx_source/baekho_tiger_claw_20261031/export.py`.
