# 배시·더블스윙 — 백호참 참격을 참고한 다크 카툰

> 이 문서는 첫 시안의 기록이다. 현재 실전 파일은 사용자 요청에 따라 세 갈래가 휘어지고 거칠게 찢긴 [호랑이 발톱 수정본](../baekho_tiger_claw_20261031/README.md)이다. 아래 원본과 비교 그림은 첫 시안을 보존한다.

2026-10-31 사용자 요청 「배시와 더블스윙 그림을 바람의나라 백호참 스타일로 찾아서 다시 그려볼래? 다크카툰, 실전이야」에 따라 **Codex 내장 imagegen**으로 스킬별 그림을 한 장씩 새로 생성하고 실전용 파일을 교체했다.

참고는 [바람의나라 클래식 전사 스킬 및 재료 정보의 백호참 GIF](https://jjungs-lee.tistory.com/241)다. [다운로드한 GIF](baekhocham_reference.gif), [전체 프레임](reference_frames.png), [확대한 핵심 두 프레임](reference_keyframes.png)을 확인했다. 푸른색 `\` 참격 뒤에 옅은 금빛 `/` 참격이 이어지는 동작과 가느다란 평행 궤적을 참고했다. 게임 캐릭터 참조는 [기존 다크 카툰 참조판](../world_styles_20261012/character_reference.png)을 사용했다. GIF의 픽셀을 게임 그림에 복사하지 않고, 굵은 어두운 윤곽·각진 실루엣·평면 명암으로 새로 그렸다.

| 스킬 | 최종 그림 | 생성 원본 | 최종 프롬프트 | 실전 파일 |
|---|---|---|---|---|
| 배시 | 푸른색·상아색 단발 대각선 참격 | [PNG](war_bash.png) | [배시 프롬프트](prompt_war_bash.txt) | [war_bash_darktoon.webp](../../fx/skills/war_bash_darktoon.webp) |
| 더블스윙 | 푸른색과 옅은 금빛이 교차하는 두 참격 | [PNG](war_doubleswing.png) | [더블스윙 프롬프트](prompt_war_doubleswing.txt) | [war_doubleswing_darktoon.webp](../../fx/skills/war_doubleswing_darktoon.webp) |

두 원본은 실제 투명 알파를 가진 1254×1254 이미지다. [export.py](export.py)로 눈에 보이는 알파 경계를 기준으로 여백을 맞춰 384×384 WebP로 내보낸다. 실루엣은 정사각형의 약 86%를 차지한다. 원본 알파를 유지하고 미리 곱한 알파로 축소해 가장자리 색 번짐을 줄인다. 재생 코드는 기존 `SKILL_ART` 설정과 더블스윙의 대각선 마스크·타격별 지연을 사용한다.

[384px·실제 표시 크기 비교](comparison.png) · [게임 도감 화면](codex_in_game.png) · [배시 실전 타격](battle_war_bash_0.png) · [더블스윙 1타](battle_war_doubleswing_0.png) · [더블스윙 2타](battle_war_doubleswing_1.png)

검증: [내보내기 기록](export_report.json)과 [브라우저 기록](browser_verification.json). 두 파일의 투명 알파·빈 모서리·경계 여백, 브라우저 이미지 디코딩, 도감 재생, 실전 `fxHit`의 배시 1타·더블스윙 각 타격, ×1·×2·×4·×16 배속을 확인했다. 페이지 오류와 이펙트 요청 오류는 없었다. 금속박 미리보기도 확인했다.

게임용 두 파일은 각각 18,588바이트와 27,044바이트로 총 45,632바이트다. 교체 전 그림은 [previous](previous)에 보존했다. [교체 전 SHA-256](before_sha256.json) 대조 결과 이번 두 파일 외의 이펙트 200장은 동일하다.

재내보내기: 저장소 루트에서 `python src/assets/art/fx_source/baekho_darktoon_20261031/export.py`.
