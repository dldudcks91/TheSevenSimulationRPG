# 챕터 2-4 나가 초상 생성 프롬프트

2026-09-25 · built-in imagegen. **아래 첫 프롬프트는 폐기한 초안**이다. 세 장을 따로 만들고 투명 배경을 요청해 [저장된 기본규칙](../../.claude/skills/art-prompt/gem_main_prompt.txt)의 2×2 시트·네 캐릭터·순녹색 배경·검은 구분선 계약을 어겼다. 설치본은 아래 정정 작업의 그림으로 교체했다.

입력 이미지:

1. `src/assets/art/faces/source/sheets/source_sheet_ch2_st4_naga_3x3.png` — 나가 외형
2. `src/assets/art/faces/source/ready/monster/2900.png` — 레비아탄 진영
3. `src/assets/art/faces/source/ready/monster/2101.png` — 게임 초상 그림체

## 공통 블록

```text
Use case: stylized-concept
Asset type: one game monster bust portrait for Chapter 2 Stage 4, to be shown small in an RPG UI.
Input images: Image 1 is the existing same-race Naga concept sheet and is the appearance reference; Image 2 is Leviathan, their master and faction reference; Image 3 is a finished game monster portrait and is ONLY the line weight, flat shading, dark palette, and head-to-body framing reference.
Shared identity: cold blue-grey scales, flat earless reptilian face, narrow red eyes, short pale fangs, scaly humanlike shoulders. Preserve the specific same-race face design from Image 1 while simplifying detail to the bold flat-shaded game style of Image 3.
Composition: exactly ONE character, square bust portrait on a genuinely transparent background, centered. Head from crown to chin occupies about 70% of image height; 5-10% top margin; eyes near vertical center; shoulders and only a little upper chest visible. Strong readable silhouette at 44 pixels. No grid or scenery.
Avoid: text, glyphs, watermark, extra characters, realistic rendering, tiny texture marks, bright green.
```

## 2401 나가 전사

```text
Subject: Naga Warrior, the guard of Leviathan's pond. Use Image 1 TOP ROW as the appearance guide. Battered plain iron helmet with straight nose guard, compact iron shoulder plates below the collarbone, dark red scarf. Steely and menacing. Weapon can remain outside the bust frame. Preserve fully visible snake face.
```

## 2402 나가 주술사

```text
Subject: Naga Shaman who drains strength from enemies. Use Image 1 MIDDLE ROW as the appearance guide. Pale branching coral crown and a simple cord of bone at the collarbone. Dark unadorned robe, severe expression. Let the crown distinguish the silhouette; keep the snake face clear.
```

## 2403 나가 마법사

```text
Subject: Naga Mage who commands poisonous mist. Use Image 1 BOTTOM ROW as the appearance guide. Wide cobra frill behind the head and a small muted violet poison orb beside one shoulder. Dark plain robe. Frill distinguishes the silhouette; keep the snake face large and clear.
```

## 정정본

최종 발주 기준은 [기본규칙](../../.claude/skills/art-prompt/gem_main_prompt.txt)과 [공통 구도 기준](character_portrait_prompt.md)이다. 나가 시트는 **한 장, 2×2, 서로 다른 네 캐릭터**로 구성했다. 네 번째는 맨머리에 이마 흉터가 있는 나가 보초다. 게임 설치에는 첫 세 칸만 사용했다.

초기 2×2 생성에서 배경이 투명하게 나왔고, 시트 전체의 스타일 수정 후에는 아래 두 칸의 눈높이가 맞지 않았다. 그래서 같은 종족의 기존 시트와 게임의 완성 초상을 참조해 전사·주술사·마법사를 각각 평면 음영으로 재작업하고, 네 번째 보초를 생성했다. 각 프롬프트는 대상 외형 보존, `2101.png`의 선·음영 기준, 질감 제거, 투명 작업 배경, 큰 두상과 작은 상반신을 지시했다.

이 네 작업 이미지를 [최종 2×2 시트](../../src/assets/art/faces/source/sheets/source_sheet_ch2_st4_naga_2x2_final.png) 한 장으로 조합했다. 모든 칸의 눈 중심을 y=495px에 맞추고, 두상 윗여백 5.6~9.8%, 머리 높이 약 68~73%로 배치했다. 최종 시트의 배경은 정확한 `#00FF00`, 중앙 구분선은 정확한 `#000000` 16px이다. 이전 설치본은 `src/assets/art/faces/source/_scratch/naga_v1/`에 보관했다.
