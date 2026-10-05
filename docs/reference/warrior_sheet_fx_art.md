# 전사 기본 스킬 이펙트 — 가장자리 배치 시트 적용

> 같은 날 사용자 지시로 기존 전사 그림과 표시 설정을 복원했다([ADR-0528](../client/adr/0528-전사-기본-이펙트를-기존-그림으로-복원한다.md)). 아래는 새 시트 적용 당시의 기록이며, 새 그림은 보관한다. [복원·보존 결과](../../src/assets/art/fx_source/warrior_sheet_20261006/restored_legacy_20261006/restoration.json).

업데이트된 [시트 프롬프트](basic_skill_fx_sheet_prompts.md)의 전사 시트를 적용했다. 강화 효과는 초상의 가장자리에 놓이고, 칸 전체를 유지해 얼굴과 어깨에 대한 배치를 보존한다. 기존 전사 그림 8장과 표시 설정은 별도로 백업했다([ADR-0527](../client/adr/0527-전사-기본-이펙트는-초상-가장자리에-자리한다.md)).

| 칸 | 스킬 | 설치 모양 | 움직임 |
|---|---|---|---|
| 1 | 배시 | 상아색 속·하늘색 테의 굵은 사선 셋 | `slash` |
| 2 | 더블스윙 | 굵은 초승달 X | `cross` |
| 3 | 어스스플릿 | 아래 변 바위·밝은 균열 | `ground` |
| 4 | 리프 어택 | 내리꽂히는 세 줄·아래 먼지 폭발 | `land` |
| 5 | 타운트 | 아래 변 붉은 가시 부채 | `edge-burst` |
| 6 | 워 크라이 | 둘레의 금빛 함성 줄 | `edge-wave` |
| 7 | 배틀오더스 | 양옆 꺾쇠 탑 | `edge-orders` |
| 8 | 아이언 스킨 | 아래 양 귀퉁이 강철판 | `edge-shell` |
| 9 | 아이언 스킨 다른 안 | 네 귀퉁이 강철 번쩍임 | 보관만 |

## 원본과 백업

- 생성 도구: 내장 `image_gen`. [선택 시트](../../src/assets/art/fx_source/warrior_sheet_20261006/sheet.png)는 1254×1254 생성 원본을 그대로 보관한다.
- [최초 프롬프트](../../src/assets/art/fx_source/warrior_sheet_20261006/prompt.txt) · [배치 보정](../../src/assets/art/fx_source/warrior_sheet_20261006/prompt_revision.txt) · [격자 여백 보정](../../src/assets/art/fx_source/warrior_sheet_20261006/prompt_inset.txt).
- 설치 이미지: `src/assets/art/fx/skills/war_*.webp` 8장.
- 백업: `src/assets/art/fx_source/warrior_sheet_20261006/previous/skills/`에 교체 직전 WebP 8장, `previous/ui/`에 표시 설정 사본. [해시 목록](../../src/assets/art/fx_source/warrior_sheet_20261006/previous/manifest.json)으로 백업과 다른 직업 이미지 보존을 확인한다.
- 기존 [2026-10-05 원본·발주 기록](warrior_basic_fx_art.md)은 그대로 보관한다.

## 변환과 재현

```powershell
python scripts/apply_warrior_fx_sheet.py --install
python scripts/verify_warrior_skill_fx.py
```

검정 격자는 화면 전체를 가로지르는 줄로 검출한다. 격자의 안티에일리어싱을 제거하기 위해 칸 안쪽 3px을 더 제외하고 정사각형 칸 전체를 사용한다. 알파는 `min(r,b) − g`의 40~120 경사로로 만들며, 반투명 가장자리에서 자홍색을 역합성한다. premultiplied LANCZOS로 칸 전체를 384×384로 줄여 WebP q90을 저장한다. 내용의 알파 bbox는 측정에만 사용한다.

`SKILL_ART.fit: 'portrait'`는 실제 초상 폭에 맞춰 시트 틀을 표시한다. 전사 강화의 전용 움직임은 얼굴 쪽으로 크게 수축하지 않고 가장자리 배치를 유지한다.

## 검증

- 9장 모두 384×384 RGBA·투명 모서리·불투명 내용 통과. 설치는 8장, 아이언 스킨 다른 안은 보관한다.
- [91px 비교](../../src/assets/art/fx_source/warrior_sheet_20261006/preview_91px.png): 기존·새 Gemini 초상·새 GPT 초상 위에서 비교했다. [측정](../../src/assets/art/fx_source/warrior_sheet_20261006/measurements.json)에 칸 좌표·알파 bbox·중앙 점유율·해시를 남겼다.
- 실제 FX 모듈 브라우저 검사 73개, 읽기 실패 검사 33개, 도감 전사 카드 8장·이미지 8장 통과. 91px 초상 크기 맞춤, 배속·켜고 끄기·정리, 다른 직업의 표시 정의와 이미지 보존도 확인했다.
- [검증 결과](../../src/assets/art/fx_source/warrior_sheet_20261006/validation.json) · [FX 렌더링](../../src/assets/art/fx_source/warrior_sheet_20261006/runtime_browser.png) · [도감 화면](../../src/assets/art/fx_source/warrior_sheet_20261006/codex_browser.png).

*적용: 2026-10-06*
