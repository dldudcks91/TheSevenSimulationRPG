# 신규 캐릭터·몬스터 초상 — 공통 구도 기준

> 확정: 2026-09-24 사용자 지시. 새 캐릭터를 그릴 때 반복해서 쓸 프롬프트의 **머리·몸 비율** 기준이다.
> 기존 초상을 일괄 수정하는 지시는 아니다. 그림체·캐릭터 외형·의상은 각 발주에서 별도로 정한다.

## 여러 시안의 기본 시트 [2026-09-24 사용자 지시]

- 사용자가 앞으로 같은 방식으로 캐릭터 시안 여러 개를 그려 달라고 하면, **8개를 가로로 긴 직사각형 시트 한 장**에 배치한다. 기본 배열은 **4열 × 2행**이다.
- 각 칸의 캐릭터가 서로 겹치지 않게 하고, 머리 크기·눈높이·여백을 통일한다. 아래 공통 구도 기준은 시트의 **각 칸**에 적용한다.
- 별도 지시가 없으면 개별 그림 8장을 따로 생성하지 않는다. 사용자가 다른 개수나 배열을 지정하면 그 지시를 따른다.

## 머리와 몸의 비율

- 작업 원본 512×512 초상 기준, **머리가 전체 캔버스 높이의 약 70%**를 차지한다. 허용 범위는 대략 **65~75%**다. 게임용 파일은 이후 WebP로 축소한다.
- 여기서 머리는 **뿔·머리카락·투구·두건의 맨 위부터 턱까지**다. 얼굴 피부만 재서 70%로 만들지 않는다.
- 맨 위에는 대략 **5~10% 여백**을 남긴다. 턱 아래에는 **어깨와 가슴 윗부분만** 보인다. 옷을 보여주려고 허리·벨트·팔 전체까지 내리지 않는다.
- 눈은 세로 중앙 부근에 두고, 소품은 얼굴 옆이나 아래에 일부만 넣는다. 소품 때문에 얼굴을 작게 그리지 않는다.
- 여러 안을 한 시트에 그릴 때도 **모든 칸의 머리 크기와 눈높이를 통일**한다. 의상 변주가 필요하면 몸통의 긴 길이가 아니라 두건·깃·견갑·소품의 형태로 구별한다.

## 재사용할 프롬프트 문장

```text
Square dark-fantasy cartoon bust portrait. Make the head, measured from the top of
the horns, hair, helmet or hood to the chin, occupy about 70% of the full image
height (roughly 65–75%). Leave a small 5–10% top margin. Show only the shoulders
and a little upper chest below the chin; crop before the waist or belt. Keep the
eyes near the vertical middle. Accessories may sit beside the face, but must not
make the head smaller. If generating a comparison sheet, keep head scale and eye
level consistent in every cell.
```

비교 기준: [게임용 화염 광신도](../../src/assets/art/faces/cartoon/monster/1401.webp), [고블린 척후병](../../src/assets/art/faces/cartoon/monster/1101.webp), [영웅 사제](../../src/assets/art/faces/cartoon/hero/priest_1.webp). 2026-09-24 초기 임프 제사장 의상 시안은 몸통이 얼굴과 비슷한 높이로 그려져 이 기준보다 몸이 컸다. 이후 가로형 8종 시트에서 고른 1번이 `monster/1402`에 적용됐다.
