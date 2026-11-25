# 전술카드 아이콘 초안 — Codex · Gemini 비교 (2026-11-25)

설치 안 함 · 게임 파일 안 건드림. 같은 전술 넷(방패벽 · 트로이 목마 · 화살비 · 일기토)을 그림 방향 다섯 × 도구 둘 = 시트 10장으로 뽑았다.

| 방향 | 키 | 첨부 |
|---|---|---|
| 단색 실루엣 (스킬 아이콘 결) | `a_mono` | `icons_source/skills/source/sheet_21_anchor_installed_buffs.png` |
| 컬러 물건 (아이템 아이콘 결) | `b_item` | `icons_source/items/source/examples.png` |
| 작전 지도 (위에서 본 진형도) | `c_map` | 없음 |
| 배지 속 장면 | `d_scene` | `examples.png` |
| 자유 (도구 마음대로) | `e_free` | 없음 |

- `board.png` — 비교판. 위 = 흰 바탕 원본 칸 · 아래 = 게임 칸(검정 + 청동 테두리)에 64 · 40px. 단색은 게임처럼 밝게 뒤집어 보인다
- `sheets/` — 원본 시트(`codex_<키>_<n>.png` · `gemini_<키>_<n>.png`) · 로그 · `tiles/` — 칸별 자른 그림
- 다시 뽑기 — `python codex_batch.py <키…>` (ChatGPT 로그인 · 5장 병렬) · `python gemini_web_tactic_batch.py <키…>` (크롬 9222 · 순차) · `python board.py`
- 프롬프트 — `prompts/` (Codex 는 `_codex_head.txt` + 키별 본문 · Gemini 는 한 줄)

---
*마지막 업데이트: 2026-11-25*
