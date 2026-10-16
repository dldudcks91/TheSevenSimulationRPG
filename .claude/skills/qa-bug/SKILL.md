---
name: qa-bug
description: "개발 검수 — 게임을 실제로 돌려 아직 모르는 고장을 찾는다. 자동 검증(test.html · 골든)이 안 지나는 곳 위주: 시간(숨긴 탭 · 오프라인) · 세이브 · 두 탭 · 원정 중 조작 · 동시 원정 · 경계값 · 연타 · 상태 불변식. 재현 문장과 함께 DEV_PLAN §4 에 올린다. 옛 `/qa` 버그 모드. 트리거 — 버그 찾기, 개발 검수, 탐색 테스트, 회귀 점검, 스모크 테스트."
argument-hint: "[영역]"
user-invocable: true
---

# qa-bug — 고장이 없나

공통 규칙과 교훈 이월은 [qa/SKILL.md](.claude/skills/qa/SKILL.md) — 먼저 읽는다. 교훈 파일은 [angles.md](.claude/skills/qa/angles.md)(찌르는 관점) · [risk_map.md](.claude/skills/qa/risk_map.md)(잘 깨지는 곳 · 못 일으킨 관찰).

## 볼 것

- **그물 밖을 찌른다** — `test.html` 단정과 골든이 이미 지나는 곳은 뒤로 미룬다. 그물이 못 잡는 목록은 [src/dev/README.md](src/dev/README.md) 「그래도 못 잡는 것」
- 관점은 angles 위에서 둘 + risk_map 영역 + **목록 밖 새 관점 하나**(목록만 돌면 목록이 아는 버그만 찾는다)
- **상태 불변식을 같이 본다** — 한 아이템은 한 곳에만 · 가방 ≤ 칸 수 · 자원에 NaN · 음수 없음 · 화면의 현재 ≤ 최대
- 재현은 「dev 주소 + 조작 한 문장」으로 두 번. 한 문장으로 못 적으면 그 상태에 닿는 dev 주소가 없다는 뜻이다 → `/ui` 에 제안

---
*마지막 업데이트: 2026-10-16*
