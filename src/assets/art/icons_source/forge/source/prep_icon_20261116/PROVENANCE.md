# 손질 카드 그림 — 달구기 · 덧대기 · 담금질 원본 (스킬 아이콘 결)

게임이 읽지 않는 원본이다. 설치본 = `icons_source/forge/heat.png` · `reinforce.png` · `quench.png` (512 투명 · `#d8d8e6`) → `scripts/build_icons.py` → `icons/forge/*.webp`.

## 생성

- Codex(ChatGPT 로그인) `exec -s read-only --skip-git-repo-check -c model_reasoning_effort="low" -i <앵커>` · 앵커 = `icons_source/skills/source/sheet_07_codex_warrior.png`(전사 스킬 시트 — 굵고 날카로운 검정 실루엣)
- 지시문 `sheet_01_prompt.txt` 하나로 두 판(`sheet_01a_codex.png` · `sheet_01b_codex.png`) — 3×3 · 1행 달구기 · 2행 덧대기 · 3행 담금질 · 열마다 다른 구도 · 칸마다 물건 하나 + 효과 하나 · 「NOT cute · no puffy clouds · no buckets」 · 일감은 「square-ended iron bar · never a weapon」(칼날 문구는 폭력 검열에 막힌다)
- `python .claude/skills/icon-prompt/cut.py <시트> --grid 3x3` → `icons_source/mastery/source/mono.py`(검정 → 회색 · 흰 틈 → 투명)

| 설치 | 칸 | 그림 |
|---|---|---|
| `heat.png` | `sheet_01b` 1행 1열 | 비스듬한 집게가 문 쇠막대 끝에 날카로운 불길 |
| `reinforce.png` | `sheet_01b` 2행 1열 | 망치가 리벳 넷 박은 두꺼운 판을 내려친다 · 충격 파편 |
| `quench.png` | `sheet_01b` 3행 3열 | 각진 물결에 선 쇠막대 · 김 세 갈래 · 뾰족한 약초 잎 |

대안 — 1행: 불길에 감싸인 선 막대(2) · 누운 막대 아래 불길(3) / 2행: 리벳 판을 두른 막대 위 갈매기 셋(5) · 광석을 깨는 망치(6) / 3행: 집게가 막대를 물보라에 꽂는다(7) · 물방울에 떨어지는 막대(8). 비교판 = `board_dark.png`.

| 시트 | generated_images |
|---|---|
| `sheet_01a_codex.png` | `~/.codex/generated_images/01a1e05e-f3fa-7730-8c4c-c6340957cde3/exec-c1eecf53-35b3-4850-9047-bd6264ba55be.png` |
| `sheet_01b_codex.png` | `~/.codex/generated_images/01a1e05e-f3ed-7252-b674-32d508fbe599/exec-9be49042-5db1-4742-a7e4-6c2e6be5e08a.png` |

---
*마지막 업데이트: 2026-11-16*
