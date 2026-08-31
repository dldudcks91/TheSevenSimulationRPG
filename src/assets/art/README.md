# 아트 자산 (src/assets/art/)

`backgrounds/`는 TheSevenRPG 포크 — 데이터 CSV(`src/data/inherited/`)와 같은 포크 정책, **원본 SSOT는 TheSevenRPG에 있고 여기 것은 재동기화 가능한 사본**, 읽기 전용 (CLAUDE.md 규칙 3).
`faces/`는 그 반대다 — 신규 아트가 직접 들어가는 활성 폴더, 읽기 전용 아님. **스타일마다 하위 폴더 하나**(2026-08-30).

## backgrounds/

| 파일 | 쓰는 곳 |
|---|---|
| `background_stage_101.webp` | Ch1-1 파멸의 진영 |
| `background_stage_102.webp` | Ch1-2 핏빛 교전지대 |
| `background_stage_103.webp` | Ch1-3 원한의 묘지 |
| `town.webp` | 앱 전역 배경 + 선술집 패널 |

파일명의 숫자는 계승 `stage_info.csv` 의 stage_id 다 — 스테이지와 배경이 id로 1:1 대응한다.
**Ch1-4(사탄의 제단, 104)와 챕터 2 이후는 원작에도 없다.** 없는 스테이지는 CSS 그라디언트로 폴백한다 (`.arena` 기본 배경).

## ⚠ 데이터와 달리 여기는 "무변환"이 아니다 — 포맷만 변환했다

원본은 2752×1536 **32bit RGBA PNG**로 4장 합계 18.2MB였다. 알파 채널이 전부 불투명(=쓰이지 않음)인데도
트루컬러로 저장돼 있어 용량 대부분이 낭비였다.

**해상도·크롭·색은 그대로 두고 컨테이너만 WebP로 바꿨다 → 888KB (95% 감소).**

| | PNG 원본 | WebP q88 |
|---|---|---|
| stage_101 | 6.27MB | 241KB |
| stage_102 | 5.77MB | 349KB |
| stage_103 | 4.52MB | 192KB |
| town | 1.61MB | 105KB |

- 팔레트 PNG(256색)도 검토했으나 2.4MB에 PSNR 38.4dB로 **WebP보다 10배 크고 화질도 낮아** 탈락
- WebP q88 = PSNR 41.7dB. 100% 크롭 비교에서 픽셀 블록 경계가 그대로 보존되는 것을 확인했다
- 화면에서는 항상 **축소** 출력(2752 → 최대 ~1080px)이라 손실이 더 줄어든다

### 재동기화 방법

원본이 갱신되면 PNG를 다시 복사한 뒤 같은 레시피로 변환한다:

```python
from PIL import Image
Image.open(src_png).convert('RGB').save(dst_webp, 'WEBP', quality=88, method=6)
```

`convert('RGB')` = 안 쓰이는 알파 제거. 해상도는 건드리지 않는다.

---

## faces/ — 몬스터 얼굴 아이콘 · **스타일 하나 = 폴더 하나** [2026-08-30]

```
faces/
├── cartoon/     ← 스타일 1 (**현행 기본** — 2026-08-31) — 다크 SD 카툰 흉상 (faces/cartoon/README.md)
│   └── monster_<idx>.png
├── pixel16/     ← 스타일 2 — 16-bit 도트그래픽, 배경 팔레트에 맞춤
│   └── monster_<idx>.png
└── example/     ← **스타일 아님** — 생성용 스타일 앵커 이미지. 게임이 로드하지 않는다 (faces/example/README.md)
```

`example/` 이 스타일 폴더가 아닌 이유는 **파일명 규칙이 다르기 때문**이다 — `skeleton_archer.png` 처럼 내용으로 이름이 붙어 있고
`monster_<idx>.png` 가 아니다. 스타일로 쓰려면 `monster_idx` 로 이름을 바꿔 새 폴더에 넣고 `FACE_STYLES` 에 등록한다.

**파일명 규칙은 스타일이 달라도 같다** — `monster_<idx>.png`, 숫자는 `src/data/monster.csv` 의 `monster_idx` 다.
그래서 폴더만 갈아 끼우면 얼굴이 통째로 바뀐다.

### 새 스타일 넣는 법 — 두 단계

1. `faces/` 아래 폴더를 만들고 같은 파일명으로 그림을 넣는다 (`faces/<스타일>/monster_1101.png` …)
2. `src/ui/mock.js` 의 `FACE_STYLES` 목록에 그 폴더 이름을 더한다

고르는 순서는 언어와 같다 — URL `?face=<스타일>` → localStorage → **목록의 첫 항목**.
`?face=` 는 localStorage 에 남으므로 한 번 걸면 계속 그 스타일로 돈다. 경로를 조립하는 곳은 `mock.js:faceDir()` 하나다.

**한 스타일이 전 몬스터를 다 갖출 필요는 없다.** 파일이 없으면 그 자리만 죄종 색 이니셜로 떨어지고 나머지는 그대로 나온다
(렌더러가 `<img onerror>` 로 받는다) — 그리는 중인 스타일로도 게임이 돈다.
> 폴백 그림이 둘로 갈린다: **원형 이니셜** = `monster.csv:face=0`(그 몬스터는 원래 아트가 없다) · **네모 칸 안 이니셜**(관전) = 그 스타일에만 파일이 없다.
> 새 스타일을 그릴 때 **무엇이 아직 안 채워졌는지 화면에서 바로 보인다.**

### pixel16 — 스타일 2 (2026-08-31 까지 기본이었다)

TheSevenRPG 원작 크롭 아트는 폐기(배경 팔레트와 안 맞아 붕 떠 보였다 — `docs/reference/monster_art_prompt.md` §0).
프롬프트 SSOT 의 공통 스타일 블록이 `16-bit pixel art, dark fantasy` 라 폴더 이름을 거기서 땄다.

| 파일 | monster_idx | 몬스터 |
|---|---|---|
| `monster_1101.png` | 1101 | 고블린 척후병 |
| `monster_1102.png` | 1102 | 고블린 전사 |
| `monster_1103.png` | 1103 | 오크 전사 |
| `monster_1201.png` | 1201 | 인간 보병 |
| `monster_1202.png` | 1202 | 인간 창병 |
| `monster_1203.png` | 1203 | 트롤 돌격병 |
| `monster_1302.png` | 1302 | 스켈레톤 궁수 |
| `monster_1350.png` | 1350 | 둘라한 |

**CH1 16종 중 8종뿐이다.** 나머지(아바돈·레기온·스켈레톤 전사/기사·임프 3종·몰록)는
아직 아트가 없다 — 스켈레톤 전사·기사는 별도로 채워질 예정. CH2 이후도 전무하다.
없는 얼굴은 죄종 색 원판 + 이니셜로 폴백한다.

⚠ 원본 파일명은 믿지 말 것 — `public/assets/sprites/monster_1101.png` 는 이름과 달리
**고블린 척후병(1101)이 아니라 스켈레톤 전사** 그림이다. 위 표가 실제 대응이다.

### 규격 (스타일 공통)

- 정사각 PNG. `pixel16` 은 배경이 불투명(단색) — 투명화 미처리. **투명 배경도 된다** (관전은 어두운 그라디언트, 도감은 원형 마스크 위에 얹힌다)
- 원형 마스크는 파일에 굽지 않는다. 도감의 원형 표시는 UI에서 `border-radius: 50%` 로 처리하고, 관전은 네모로 쓴다 — **같은 파일이 두 모양으로 쓰이므로 가장자리에 중요한 것을 두지 않는다**

---

*마지막 업데이트: 2026-08-31 (**기본 스타일 = cartoon** — `FACE_STYLES` 의 첫 항목이 기본값이라 순서를 바꿨다(`ui/mock.js`). `?face=` · localStorage 는 그대로 우선한다 — 옛 선택이 저장돼 있으면 그쪽이 이긴다. 사용자 지시) · 2026-08-30 (**faces/ 를 스타일 폴더로** — 현행 아트를 `faces/pixel16/` 로 이동 · `FACE_STYLES` 목록 + `?face=` 로 통째 교체 · 스타일에 없는 그림은 이니셜로 폴백(그리는 중에도 게임이 돈다) · 없는 `face_chapter_1.png` 줄 삭제) · 2026-08-28 (`assets/inherited/` → `assets/art/` 리네임 · faces/ 를 계승 크롭 아트에서 신규 도트그래픽으로 교체, 읽기 전용 해제) · 2026-08-22 (배경 4종 포크 + WebP 변환)*
