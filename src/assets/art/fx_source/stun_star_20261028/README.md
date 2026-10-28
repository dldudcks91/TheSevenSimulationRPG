# 스턴 별 원본

관전 카드에서 스턴에 걸린 유닛의 머리 위 검은 선을 따라 도는 별이다([ADR-0936](../../../../../docs/client/adr/0936-상태이상은-초상-빛깔이-원색과-번갈아-깜빡이고-스턴은-머리-위-선을-도는-별이다.md)). 설치본은 `../../fx/ui/stun_star.webp` 한 장이다.

- [sheet.png](sheet.png) · [prompt.txt](prompt.txt) — Codex 내장 imagegen 2×2 시트. 첨부한 화풍 기준은 `../darktoon_completion_20261024/sheet_01.png`. **왼쪽 위 칸(녹슨 쇠 별)을 골랐다**. 나머지 셋(쇠 가시 · 놋쇠 파편 · 피 묻은 쇠)은 안 골랐다
- [unused_sheet_bone.png](unused_sheet_bone.png) · [unused_prompt_bone.txt](unused_prompt_bone.txt) — 같은 날 뽑은 뼈 · 가시 쪽 넷. 안 골랐다
- 더 앞의 시안(둥근 노란 별)은 「너무 귀염틱해」로 버려서 남기지 않았다

**자르기** — 시트 왼쪽 위 사분면을 알파 경계(> 24)로 자르고 긴 변 128 로 줄여(PIL Lanczos) WebP q90 으로 쌌다. 화면에서는 14px 로 서고 도는 모습(정면 → 옆면)은 CSS 가 `rotateY` 로 만든다.
