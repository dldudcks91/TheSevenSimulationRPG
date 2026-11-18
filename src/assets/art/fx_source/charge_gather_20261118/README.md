# 모으기 기운 — 게임 적용본

2026-11-18 사용자 요청: 「차징 이미지 삭제하고 뭔가 끌어모으는 듯한 이미지로 다시 그려줘 codex로」 — 2026-11-17 의 나선 줄기 그림(`charge_gather_20261117/`)을 원본 폴더째 지우고 다시 그렸다([ADR-1259](../../../../../docs/client/adr/1259-모으기의-기운-그림은-사방에서-가운데로-날아드는-혜성-줄기다.md)).

기운 그림 한 장을 **모으기 시전 방식(`channel_charge`)이 같이 쓴다** — 스킬마다 그리지 않는다. 사방에서 가운데로 날아드는 혜성 줄기 열둘 — 둥근 머리가 가운데 빈 자리 가장자리에 닿고 꼬리가 바깥으로 끌린다 · 사이로 속도선을 단 알갱이. 관전에서는 초상 한가운데에 두 장이 반 박자 엇갈려 바깥(크게)에서 안(작게)으로 돌며 빨려 들고, 모일수록 진해진다(`src/ui/style.css` `fx-charge-gather`).

- 생성 — **Codex 내장 image_gen**(`codex exec` · ChatGPT 로그인 · API 미사용) · 그림체마다 후보 둘(혜성 줄기 · 파편 무리)을 병렬로 뽑아 혜성 줄기를 골랐다. 스타일 기준 그림으로 그 그림체의 함성 충격파 · 리프 어택 · 메테오 설치본을 붙였다(`-i`)
- `charge_gather_darktoon.png` · `charge_gather_foil.png` — 고른 원본(1254px · 투명 배경)
- `prompt_darktoon.txt` · `prompt_foil.txt` — 보낸 프롬프트 그대로
- 안 고른 시안(파편 무리 두 장 — 다크 카툰 판은 검은 속도선이 어두운 바탕에서 사라져 돌이 멈춘 듯 보였다)은 남기지 않았다
- 게임 파일 — `../../fx/skills/charge_gather_<style>.webp`(512px · 알파 보존 · 90% 크기로 가운데 정렬) · 금속박은 바탕의 옅은 안개를 걷어 내보낸다(`export.py` `HAZE`)

다시 내보내기 · 설치: `python src/assets/art/fx_source/charge_gather_20261118/export.py` → [export_report.json](export_report.json)
