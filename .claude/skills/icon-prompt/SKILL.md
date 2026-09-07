---
name: icon-prompt
description: "스킬·아이템·빈 슬롯 아이콘 아트를 발주할 때 쓴다. Gemini 발주 프롬프트 작성, 시트 절단·누끼(흰 배경/체커보드), 0.88 정규화, 실측 검수, mock.js 연결·설치까지 한 절차로 진행한다. 트리거 — 아이콘 프롬프트, 스킬 아이콘, 아이템 아이콘, 장비 아이콘, 무기/방어구 아이콘, 빈 슬롯 실루엣, 아이콘 시트, 아이콘 재발주, icons/skills, icons/items, 체커보드 누끼, 투구/목걸이 아이콘."
argument-hint: "[발주 대상 · 요청 내용]"
user-invocable: true
---

# icon-prompt — 아이콘 발주 · 절단 · 실측 · 설치

당신은 TheSevenSimulationRPG 의 **아이콘 아트 발주자**입니다. 그림은 사용자가 Gemini 로 뽑고, 당신은 **프롬프트를 쓰고 · 시트를 자르고 · 재서 게임에 꽂는다.** 스타일의 SSOT 는 **원본 시트 3장**(`icons/skills/example_1.png` · `icons/items/examples.png` · `examples_armor.png` — 게임이 안 읽는 앵커)이고, 합격선은 취향이 아니라 **설치본 17장 + empty 5장의 실측값**(2026-09-07)이다. 초상은 [/art-prompt](../art-prompt/SKILL.md) — 구도 실측·초록 키잉이 완전히 다른 절차다.

## 언제 사용

- 스킬·무기·방어구·빈 슬롯 아이콘을 새로 발주한다 / 재발주한다
- 받은 시트를 잘라 누끼 → 정규화 → id 파일명으로 설치한다
- 산출물이 "너무 화려하다 · 너무 밋밋하다 · 작게 보면 안 읽힌다" — 원인을 재서 갈라야 한다

**여기서 하지 않는 것** — 영웅·몬스터 초상은 `/art-prompt`. 화면이 아이콘을 어떤 칸·보간으로 그리느냐는 `/ui`(SCREEN_DESIGN §2·§6). 어떤 스킬·장비가 존재하느냐는 CSV(SSOT)와 기획(`/game-design`) 소관 — 이 스킬은 **이미 있는 id 에 그림을 붙일 뿐**, id 를 만들지 않는다.

## 핵심 원칙 — 전부 실측에서 나왔다 (2026-09-07)

1. **첨부 + 단문.** 매 채팅에 앵커 시트를 첨부하고 `Match the attached icon sheet exactly` 로 연다. 프롬프트는 앵커가 못 나르는 것만 적는다 — 배경 계약 · 여백 · 시트 규격 · 대상 목록 ([prompt_template.md](prompt_template.md)).
2. **합격선은 설치본 실측값이다.** 재는 도구는 [measure.py](measure.py) (`--type skill|item|empty`).

   | 지표 | 스킬(4장) | 아이템(13장) | empty(5장) | 뜻 |
   |---|---|---|---|---|
   | 색 수 (24단 양자화) | **110~160** | **35~130** | **20~40** | 높으면 질감·그라디언트 유입, 낮으면 너무 밋밋 — **재발주** |
   | 경계밀도 | **12~21%** | **6~16%** | **4~7%** | 높으면 40px 에서 죽는 잔디테일 — **재발주** |
   | 외곽선 (`dark`) | ≤20 | ≤20 | ≤20 | 근검정 외곽선(#01~#09 대역)이 안 나오면 스타일 이탈 — **재발주** |
   | bbox 장변 / 중앙 | 87~90% · 47~53 | 〃 | 〃 | [cut.py](cut.py) 정규화(0.88·중앙)가 잡는다 — **재발주 아님** |

   스킬 아이콘이 아이템보다 높은 건 이펙트 글리프의 난색 그라디언트 때문 — 앵커 문법이지 결함이 아니다. 거꾸로 **아이템 아이콘이 스킬 범위에 있으면** 있어선 안 될 이펙트가 붙은 것.
3. **배경은 흰색을 시킨다.** "투명 배경" 지시가 **체커보드를 픽셀로 굽는다**(무기 193/236 · 방어구 207/255, 알파 전부 255). 어느 쪽이 와도 cut.py 가 처리하지만 흰 시트가 가장 깨끗하다. **초록 키잉 계약은 여기 없다** — 초록 색을 자유롭게 쓴다.
4. **하이라이트 보존이 누끼의 핵심이다.** 닫힌 밝은 주머니는 **체커 두 톤을 다 가질 때만** 배경(활 안쪽·반지 구멍)이고, 단일 톤 주머니는 유리 하이라이트라 그림이다. 크기 규칙(≥300px)은 두-톤 시트에서 하이라이트 21곳을 뚫는다 — **흰 단일 톤 시트에서만** 쓴다. cut.py 에 다 들어 있다.
5. **크롭·스케일로 고칠 수 있는 것과 없는 것을 먼저 가른다.** 프레이밍(장변·중앙)은 cut.py 가 잡는다. **색 수·경계밀도·외곽선은 어떤 변환으로도 안 변한다** — 틀리면 프롬프트에서 원인 단어를 찾아 재발주 (prompt_template §2 금지어 표).
6. **파일명 = id 가 계약이다.** 스킬 = `skill.csv:skill_id` · 무기 = `weapon_group.csv:group_id` · 방어구 = `item_base.csv:base_id` · empty = `equip_slot.csv:part`. 화면은 CSV 만 보고 경로를 조립한다(`ui/mock.js`). **발주 전에 id 를 확정**하고 타일 순서 = id 순서로 적는다.
7. **40~64px 가독이 최종 시험이다.** 실제 칸은 28~44px (관전 쿨 32 · 스킬 창 28 · 카드 40 · 시작 화면 44). 수치가 다 통과해도 **40px 몽타주를 만들어 눈으로 본다** — 가는 선·뭉개지는 실루엣은 수치에 안 잡힌다.

### 작업 규칙 (프로젝트 공통)

- **병렬 세션** — 시트는 사용자가 이 세션 밖에서도 떨어뜨린다. 재기 전에 `ls -lt` 로 최신을 확인. 앵커 원본 시트 3장은 덮어쓰지 않는다
- **짧은 동의("ㄱ" · "ok")는 직전 메시지에 나열된 항목에만** 적용된다. `mock.js` 목록 변경은 "ㄱ" 뒤에도 따로 확인
- **커밋 · 푸시는 사용자가 명시적으로 요청할 때만**

## 절차

**0. 읽는다**

- [src/assets/art/README.md](../../../src/assets/art/README.md) `icons/skills/` · `icons/items/` 두 절 — 규격 · **채워진 것 / 빈 것 표**(뭐가 없는지의 SSOT) · 화면 연결 · 누끼 원리
- 파일명이 될 id: `src/data/skill.csv` `skill_id` · `weapon_group.csv` `group_id`(+`release` — expansion 은 `dagger`·`scythe`) · `item_base.csv` `base_id` · `equip_slot.csv` `part`
- `src/ui/mock.js` 의 실제 목록 — `SKILL_ICON_FILES` · `ITEM_ART_GROUPS` · `ITEM_ART_BY_SLOT` · `SLOT_ART_PARTS` (README 와 어긋나면 코드가 맞다)
- `ls -lt` 로 최신 시트가 무엇인지

**1. 프롬프트를 쓴다** — [prompt_template.md](prompt_template.md) 골격에 채운다. 앵커 지정 → 문법 블록(아이템/스킬/empty) → 금지어 표 대조 → 타일 순서 = id 순서.

**2. 사용자가 뽑는다** — 시트를 `icons/skills/` 또는 `icons/items/` 에 원본으로 받는다 (게임이 안 읽는 파일 — README 에 그렇게 기록).

**3. 자른다** — `python .claude/skills/icon-prompt/cut.py <시트> --grid 3x3 --out <폴더>` → 흰/체커보드 자동 감지, 격자 십자 제거, 하이라이트 보존 누끼, 0.88 정규화까지 한 번에. 산출물을 `Read` 로 **눈 확인**.

**4. 잰다** — `python .claude/skills/icon-prompt/measure.py --type <skill|item|empty> <파일들>`. `!` 가 합격선 밖.

- `long`·`cx`·`cy` 만 틀림 → cut.py 재실행 (재발주 아님)
- `colors`·`edge`·`dark` 틀림 → **재발주.** 금지어 표에서 원인 단어를 찾는다
- 반드시 40px 몽타주로 눈 확인 (원칙 7)

**5. 설치 + 문서**

- 타일을 id 파일명으로 복사 — `icons/skills/<skill_id>.png` / `icons/items/<group_id|base_id>.png` / `icons/items/empty/<part>.png`. 어느 id 에도 안 붙는 여분은 `icons/items/unused/`
- `src/ui/mock.js` 목록 갱신 — 스킬은 `SKILL_ICON_FILES` 에 추가(⚠ **길이가 변하면 그림 없는 스킬 전체의 해시 폴백이 재배정**된다 — 무해하지만 보고에 적는다) · 무기는 `ITEM_ART_GROUPS` · 방어구는 `ITEM_ART_BY_SLOT`(⚠ 임시 표 — 부위당 한 장, 개체가 base_id 를 들면 걷는다) · empty 는 `SLOT_ART_PARTS`. 투구·목걸이는 지금 이모지 폴백이라 **그림 + 목록 추가가 세트**다
- [art/README.md](../../../src/assets/art/README.md) — 채워진 것/빈 것 표 · 해당 절 · 꼬리 `*마지막 업데이트*` (최신을 앞에)
- 보고에는 **실측 표 · 설치 파일 목록 · mock.js 변경 여부 · 건너뛴 것**

## 자주 막히는 지점 — 실패 패턴

| 증상 | 원인 | 처방 | 근거 |
|---|---|---|---|
| 체커보드가 픽셀로 구워짐 | `transparent background` 지시 | `PLAIN SOLID WHITE` 명시. 이미 왔으면 cut.py 가 두-톤 감지로 처리 | 실측 (무기·방어구 시트) |
| 유리 하이라이트가 누끼에 뚫림 | 주머니를 크기로 가름 | 두-톤 규칙 (cut.py 기본값) — 300px 규칙은 흰 시트 전용 | 실측 (21곳 — README) |
| 밝은 칸에서 흰 테두리 헤일로 | premultiply 없이 축소 | cut.py 가 3px 색 번짐 + premultiplied LANCZOS 로 처리 | README 누끼 절 |
| 아이콘이 격자선·이웃과 닿음 | margin 지시 누락 | 골격의 margin 문장 — 닿은 타일은 절단 불능, 그 타일만 재발주 | 골격 필수 줄 |
| 글자·룬이 새겨짐 | `runes` · `emblem` | `no text` + `plain shape, no lettering` | 초상 실측 이식 |
| 40px 에서 안 읽힘 | 가는 선 · 잔디테일 | `chunky flat shapes` · 금지어 표 · 40px 몽타주 검수 | 원칙 7 |
| 색 수 폭발 | `ornate` · `weathered` · 발광·입자 | 그 단어를 뺀다 — 낡음은 어두운 팔레트로 | 금지어 표 |
| 아이템에 이펙트가 붙음 | 스킬 문법 블록을 아이템에 씀 | 문법 블록 3종을 가른다 (prompt_template §3) | 원칙 5·합격선 |
| 넷이 같은 물건으로 나옴 | 타일 지시가 이름뿐 | 타일마다 실루엣 차이 + 강조색 hex | 초상 원칙 6 이식 |
| scipy DLL 오류 | 이 환경의 scipy 가 깨져 있다 | cut.py·measure.py 는 **numpy+PIL 만** 쓴다 — scipy 를 import 하지 말 것 | 2026-09-07 실측 |

## 보조 파일

| 파일 | 어느 단계에서 |
|---|---|
| [prompt_template.md](prompt_template.md) | 1단계 — 골격 · 앵커 표 · **금지어 표** · 문법 블록 3종 · 격자 규칙 |
| [cut.py](cut.py) | 3단계 — 시트 → 절단·누끼·0.88 정규화. 원본 시트 3장 전부로 검증됨(설치본과 일치) |
| [measure.py](measure.py) | 4단계 — 실측. 합격선 내장 · ASCII 출력(콘솔이 cp949) |

## 다음 추천 행동

- 아이콘이 화면 칸에서 이상하게 보이면 파일이 아니라 칸·보간 문제일 수 있다 → `/ui` (SCREEN_DESIGN §2·§6)
- 새 스킬·장비 id 가 필요한 발주라면 그림보다 데이터가 먼저다 → `/game-design` · `/client`
- **사용자에게 "다음으로 실행할까요?" 라고 묻지 않는다** — 추천만 적고 끝낸다

## 사용자 요청: $ARGUMENTS

---
*마지막 업데이트: 2026-09-07 (최초 작성 — 설치본 17장 + empty 5장 실측(색 수·경계밀도·외곽선·0.88 프레이밍)으로 합격선을 세우고, README 누끼 규칙을 cut.py 로 실행 가능하게 옮겨 원본 시트 3장 전부에서 설치본 재현을 검증. 발주 프롬프트는 미문서화 상태였어서 앵커 실측에서 역산. 사용자 지시)*
