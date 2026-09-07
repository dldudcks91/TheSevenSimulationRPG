# 초상 아트 스타일 조사 — 유사작 4군 + 스타일 10종 비교

> 상위: **없음 — [GAME_DESIGN.md](../game_design/GAME_DESIGN.md) §9 에도 §10 에도 아트 항목이 없다** (2026-08-30 확인)
> 짝 문서: [monster_art_prompt.md](monster_art_prompt.md) (프롬프트 SSOT) · [src/assets/art/README.md](../../src/assets/art/README.md) (스타일 폴더 규칙)
> SSOT: **미발행** — 아트 스타일은 확정 행이 없다

> ⚠ **§3~§5 · §7 은 전부 제안이다.** 확정된 것은 §1 의 실측값뿐이다. ⚠ 를 떼려면 §9 에 확정 행이 먼저 생겨야 한다
> §1 의 px 값은 `src/ui/style.css` **실측**이다 — 밸런스 수치가 아니라 화면 규격이라 CSV 대상이 아니다 ([monster_art_prompt.md §3-2](monster_art_prompt.md) 와 같은 성격)

---

## 목차

| § | 내용 |
|---|---|
| 0 | 왜 이 문서가 필요한가 |
| 1 | 실측 — 파일과 CSS 에서 직접 잰 것 6가지 |
| 2 | 비슷한 결의 게임 4군 |
| 3 | 스타일 10종 비교표 |
| 4 | 판단 ⚠제안 |
| 5 | §10 에 올릴 과제 후보 |
| 6 | 출처 |
| 7 | 이름 있는 스타일 앵커 10종 + 프롬프트 조립법 ⚠제안 [2026-09-06] |

---

## 0. 왜 이 문서가 필요한가 [조사 2026-08-30]

아트 스타일은 **결정된 적이 없다.** 그런데 자산은 이미 세 갈래로 갈려 있다:

| 갈래 | 정체 | 상태 |
|---|---|---|
| `backgrounds/` | 진짜 픽셀아트, 다크 판타지, 잉걸불 강조 | **읽기 전용** (CLAUDE.md 규칙 3) |
| `faces/pixel16/` | "16-bit 도트그래픽" 이라 이름 붙은 8장 | **실은 픽셀아트가 아니다** (§1-2) |
| `faces/example/` | 클린 카툰 흉상 앵커 14장 | 게임이 로드하지 않는 스타일 기준 이미지 |

`example/` 과 `pixel16/` 은 **서로 다른 시각 언어**이고, 어느 쪽이 본작의 얼굴인지 정한 문서가 없다.

[monster_art_prompt.md §0](monster_art_prompt.md) 은 "신규 아트는 **배경**을 기준으로 삼는다"고 적었지만,
그 판단의 전제(배경이 화면을 지배한다)가 실제 화면과 맞는지 검증된 적이 없다 — §4-1 이 그 전제를 다시 본다.

---

## 1. 실측 [조사 2026-08-30]

문서가 아니라 **파일과 CSS 를 직접 잰 결과**다. 여섯 중 셋은 기존 문서의 서술과 어긋난다.

### 1-1. 초상이 서는 자리는 7곳, **26px ~ 120px**

| 자리 | 크기 | 모양 | 대상 | 코드 |
|---|---|---|---|---|
| 편성·리포트 칩 | **26px** | 원형 | 몬스터 | `.face` |
| 선술집 후보 | 40px | 네모 | 영웅 | `.tv-cands .hero-face` |
| 큰 칩 | 44px | 원형 | 몬스터 | `.face.lg` |
| 새 게임·선술집 머리 | 52px | 네모 | 영웅 | `.ng-head .hero-face` |
| 도감 카드 | 72px | 원형 | 몬스터 | `.mon-card .face` |
| 관전 유닛 카드 | 76px | 네모 | 영웅·몬스터 | `.unit .sprite` |
| 영웅 띠 카드 | **96~120px** | 네모 | 영웅 | `.hs-card .hero-face` |

> **작동 범위가 26~120px 이다.** 상한 120px 은 취향이 아니라 세로 예산 700px 에서 역산된 값이고
> ([monster_art_prompt.md §3-2](monster_art_prompt.md)), 하한 26px 은 목록 화면의 물리적 한계다.
> **스타일 선택은 이 범위가 정한다.**

### 1-2. `faces/pixel16/` 은 픽셀아트가 아니다 ⚠ 문서와 어긋남

| 측정 | 결과 |
|---|---|
| 파일 규격 | 128×128 RGBA 8장 |
| **고유색 수** | **5,992 ~ 9,305색** (16,384 픽셀 중) |
| 네이티브 격자 테스트 | 16·24·32·48·64·96px 로 NEAREST 왕복했을 때 **오차가 어느 해상도에서도 멈추지 않고** 128 에서만 0 |

진짜 16-bit 픽셀아트라면 고유색은 수십 단위고, 네이티브 해상도에서 오차가 0으로 떨어지는 **평탄 구간**이 나온다.
**둘 다 없다** — 픽셀아트처럼 보이는 **연속톤 그림**이다.

이 사실이 무효화하는 것:

- [monster_art_prompt.md §2](monster_art_prompt.md) 공통 스타일 블록의 `chunky visible square pixels` · `no anti-aliasing` · `hard-edged dithering only`
  → **생성기가 이 지시를 애초에 따르지 않았다.** 프롬프트 SSOT 와 산출물이 다르다
- 같은 문서 §7 「미해결 — 픽셀 스케일 불일치」의 처방(네이티브 32/40/48 로 잡고 정수배 업스케일)
  → **맞출 격자가 없으므로 무효**다. 배경과 스프라이트의 "픽셀 밀도를 맞춘다"는 목표가 성립하지 않는다
- `src/assets/art/README.md` 의 "`pixel16` — 16-bit 도트그래픽" 서술과 폴더 이름

> **픽셀아트 노선은 이미 한 번 조용히 실패했다.** 실패한 줄 몰랐다는 것이 더 중요하다 —
> 스타일 지시가 지켜졌는지 검사하는 절차가 파이프라인에 없다.

### 1-3. `image-rendering: pixelated` 가 손해를 보고 있다

`.face img` · `.hero-face img` · `.sprite.has-face img` 세 곳 전부 `image-rendering: pixelated` 다.

- 이 값은 **확대**할 때 픽셀을 살리는 옵션이다. 지금은 128px 을 26~76px 로 **축소**하는 데 걸려 있다
- 축소에 NEAREST 를 걸면 픽셀을 평균내지 않고 **버린다** → 얇은 선(칼날·활시위·투구 능선)이 끊긴다
- §1-2 로 원본이 연속톤임이 확인됐으므로 **지킬 격자도 없다** — 순손실이다

26px·44px 에서 NEAREST vs LANCZOS 를 나란히 놓으면 차이가 눈으로 확인된다. 특히 26px 의 검·투구 능선이 갈린다.

> 다만 **진짜 픽셀아트 스타일 폴더가 나중에 들어올 수 있으므로** 전역으로 끄면 안 된다 —
> **스타일 폴더별로 갈리는 값**이어야 한다. 화면 결정이라 `/ui` 소관이다.

### 1-4. 26px 에서는 **어떤 스타일도 안 읽힌다**

`pixel16` 2장 + `example` 2장을 26·44·72·120px 로 내려 본 결과:

| 크기 | 판독 |
|---|---|
| **26px** | **전 스타일 실패.** 얼룩으로만 보인다 |
| 44px | 굵은 외곽선 + 큰 두상(`example` 계열)만 종류가 식별된다 |
| 72px | 둘 다 읽히나 `example` 계열이 빠르다 |
| 120px | 둘 다 충분 |

> **26px 칩은 초상의 자리가 아니다.** 스타일을 무엇으로 고르든 이 자리는 따로 답해야 한다 (§4-3).

### 1-5. 원형·네모 겸용은 성립한다 — 단 상단 여백이 필요하다

`example/` 앵커를 72px 원형 마스크에 넣어 본 결과, 두상이 중앙에 크고 어깨가 아래에 있어 **원형에서도 안 잘린다.**
다만 **왕관 끝(`skeleton_king`)과 활 끝(`skeleton_archer`)은 잘린다.**

`pixel16` 은 배경이 불투명하게 구워져 있어 원형 마스크가 그림이 아니라 **액자를 자른다** — 사진을 오려 붙인 것처럼 보인다.
→ **투명 배경이 겸용의 전제조건**이다.

### 1-6. 필요 초상 장수 — **64~90장** (현재 8장 = 12%)

| 구분 | 장수 | 근거 |
|---|---|---|
| 몬스터 베이스 | **16** | `monster.csv` 일반 84 인스턴스는 색조 변형으로 커버 ([monster_design.md §3](../game_design/monster_design.md)) |
| 보스 | **28** | `monster.csv` 실측 — 스테이지 보스 21 + 챕터 보스 7. **전부 고유 이름**(아바돈·사탄·레비아탄…)이라 색조 변형이 안 통한다 |
| 유니크 영웅 | **15** | 본편 5직업 × 3 ([hero_design.md §1](../game_design/hero_design.md)) |
| 레어 영웅 얼굴 | **5~7 이상** | 직업당 1장이면 §5 의 문제가 생긴다 |
| **합계** | **64~90** | 현재 확보 8장 |

> **보스 28장이 예산의 절반 가까이를 차지한다.** [monster_design.md §3](../game_design/monster_design.md) 의
> "아트 병목은 베이스 16장" 이라는 서술은 **보스를 세지 않았다.**

---

## 2. 비슷한 결의 게임 4군 [조사 2026-08-30]

"결"을 형태 · 화면 · 경영 · 아이템 넷으로 갈랐다. **아트 참고처는 A군이 아니라 B군이다.**

### A군 — 게임 형태가 같다 (반자동 방치 + 로스터 + 파밍)

Lootun · Dragon Cliff · Idle Champions · Book of Yog · Lootlands · Firestone ·
Path of Idle · Melvor Idle · Soda Dungeon 2 · Incremental Epic Hero 2 · Clickpocalypse 2 · AFK Arena · 마지막이야기

> **이 장르의 초상은 공통적으로 부실하고, 그게 유저 불만이다.**
> Lootun 은 커뮤니티가 **다른 게임에서 긁어온 초상 1,200장짜리 팩**을 만들어 갈아 끼운다.
> 리뷰 평가도 "simplistic art" · "장르 평균보다 조금 나은 정도"다.
> → **A군은 배울 곳이 아니라 비어 있는 자리다.** 초상 하나로 장르 평균을 넘길 수 있다.

### B군 — 로스터 초상이 화면의 주인공 (전투는 다르지만 **화면 문법이 본작과 같다**)

Darkest Dungeon 1·2 · **Battle Brothers** · Iratus · Legend of Keepers · Wildermyth ·
Wartales · Urtuk · Vagrus · Gordian Quest · Vambrace · Rogue Lords · Othercide

> 본작의 영웅 띠([SCREEN_DESIGN §5](../client/SCREEN_DESIGN.md)) · 관전 유닛 카드(§4-2) · 도감 카드(§9)는 전부 B군의 문법이다.
> 특히 **Battle Brothers 는 팀 3명 · 아티스트 1명**이라는 조건에서 같은 문제를 이미 풀었다 —
> 전신 애니메이션을 포기하고 **소켓 위 흉상 + 파츠 레이어**로 갔고,
> "줌아웃해도 얼굴이 읽혀야 한다"는 이유로 **머리를 크게, 무기를 과장**했다.
> 그 판단이 본작 §1-1 의 26~120px 제약과 정확히 같은 문제다.

### C군 — 경영 · 파견

Dungeon Village 2 (Kairosoft) · Legend of Keepers · Massive Chalice

### D군 — 아이템 철학

Diablo 2 · Diablo 4 · Path of Exile · Grim Dawn · Last Epoch

---

## 3. 스타일 10종 비교 [조사 2026-08-30]

평가축 7개. ◎ 좋음 / ○ 무난 / △ 조건부 / ✕ 안 됨

| # | 스타일 | 대표작 | 26px | 76px | 배경·UI 정합 | 7죄악 톤 | **AI 재현** | 변형·확장 | 원형+네모 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **하이비트 픽셀 흉상** (네이티브 64~96, 정수배) | Songs of Conquest · Chained Echoes | ✕ | ○ | ◎ | ○ | **✕ 이미 실패**(§1-2) | ◎ 팔레트 스왑 | △ 격자가 원호에서 깨짐 |
| 2 | **로우비트 아이콘 픽셀** (네이티브 32~48) | Shattered Pixel Dungeon · Loop Hero · Dungeon Village 2 | **○ 유일** | △ 확대해도 정보 불변 | ◎ | △ 귀여워진다 | ✕ 전량 수작업 | ◎ | △ |
| 3 | **클린 카툰 흉상 · 굵은 외곽선** ← 현행 `example/` | Legend of Keepers · Cult of the Lamb | △ | **◎** | △ 팔레트 안 묶으면 뜬다 | △ 기본값이 밝다 | **◎ 가장 안정** | ○ | **◎** |
| 4 | **고딕 잉크 · 목판화** | **Darkest Dungeon** · Inscryption | △ | ◎ | ○ | **◎** | △ 선 굵기가 장마다 흔들림 | ◎ 단색 위 색조 | ○ |
| 5 | **다크 회화 흉상** | **Battle Brothers** · Iratus · Wartales | ✕ | ○ | △ | **◎** | △ 붓질이 장마다 다르다 | △ | ○ |
| 6 | **레이어드 파츠 합성** *(스타일 아님 — 생산 방식)* | Battle Brothers · RimWorld · Wildermyth | — | — | — | — | △ 파츠별 생성 | **◎◎ 무한 레어 영웅의 유일한 답** | — |
| 7 | **페이퍼크래프트 컷아웃** | Wildermyth | ✕ | ○ | ✕ 픽셀 배경과 최악 | △ | △ | ◎ 모듈 | △ |
| 8 | **애니 반신** | AFK Arena · 세븐나이츠 · Vambrace | ✕ | △ 반신이라 얼굴이 작다 | ✕ | ✕ 장르가 갈린다 | ○ | ✕ 장당 수작업 | △ |
| 9 | **3D 프리렌더 흉상** | Book of Yog(셀셰이딩) · Crusader Kings 3 | ✕ | ○ | ✕ | ○ | ✕ 파이프라인이 아예 다름 | **◎◎ 장비 반영 자동** | ○ |
| 10 | **문장 · 인장** (얼굴을 안 그린다) | CK 문장 · Reigns · Loop Hero 카드 | **◎◎ 유일하게 26px 에서 100%** | ✕ 커져도 정보 불변 | ◎ | ◎ | ○ | ◎ | ◎ |

**탈락 2종**

| # | 스타일 | 탈락 사유 |
|---|---|---|
| 11 | 모노크롬 + 단색 강조 (Othercide) | 죄종 7색 축과 정면 충돌 |
| 12 | 사실적 유화 (PoE · Diablo 4) | 76px 에서 전멸 (§1-4) |

### 표에서 읽히는 것 셋

1. **10번은 다른 9개와 경쟁하지 않는다.** 26px 칩의 해답이지 초상의 대체가 아니다.
   ①~⑨ 중 무엇을 고르든 26px 자리는 따로 답해야 한다
2. **6번도 경쟁 항목이 아니다.** ①~⑤ 어디에도 얹을 수 있는 **생산 방식**이고,
   레어 영웅이 무한 생성인 이상 언젠가 필요하다 (§5)
3. **AI 재현 열이 사실상 결과를 정한다.** 64~90장을 같은 손으로 뽑아야 하는데,
   굵은 외곽선 카툰(2~3px 검은 선 + 그라디언트 없는 플랫)이 가장 안정적이고,
   **진짜 픽셀 격자와 정확한 치수는 생성기가 못 지킨다** — §1-2 가 그 증거다

---

## 4. 판단 ⚠제안 [초안 2026-08-30]

> **③의 골격에 ④의 팔레트를 씌운다** — 굵은 외곽선 · SD 두상의 카툰 흉상(현행 `example/` 계열)을 채택하되,
> 팔레트를 Darkest Dungeon 규율(지역별 지배 색조 하나 + 강조색은 구두점)로 묶는다.

### 4-1. 근거 넷

1. **26~120px 이 스타일을 정한다, 취향이 아니라.**
   §1-4 실측에서 44px 이상 살아남은 것은 굵은 외곽선 + 큰 두상뿐이다.
   Battle Brothers 가 같은 이유로 내린 결론과 같다 (§2 B군)

2. **"배경이 픽셀이니 초상도 픽셀"은 성립하지 않는다** — [monster_art_prompt.md §0](monster_art_prompt.md) 의 전제를 뒤집는다.
   - 초상은 배경 위에 뜨지 않는다. `.face` · `.hero-face` · `.sprite` 전부 **자기 배경과 테두리를 가진 박스** 안에 있다
   - 전역 배경 `town.webp` 는 **패널 뒤 62% 불투명**에 여백에서만 보인다 (`body::before`)
   - UI 본체는 Pretendard + 다크 네이비 패널로 **애초에 픽셀이 아니다**. 픽셀 폰트 Galmuri 도 워드마크 한 곳뿐이다 (2026-08-27 하이브리드 폰트 결정)
   > **맞출 대상은 배경이 아니라 UI 팔레트다.**
   > Battle Brothers 의 "소켓"이 하던 일(캐릭터를 배경에서 떼어내 액자에 앉히는 것)을 여기선 **카드 테두리가 이미 하고 있다.**

3. **③의 유일한 약점이 톤인데, 그건 팔레트로 고쳐진다.**
   현행 앵커 시트는 회색 배경 기준이라 밝게 떴다.
   [monster_art_prompt.md §1](monster_art_prompt.md) 이 이미 실측해 둔 램프(목탄 회색 + 그을음 갈색, **잉걸불 5% 미만**)를
   카툰 골격에 그대로 얹으면 된다.
   Battle Brothers 가 증명한 대로, **암울한 게임에 큰 두상은 결함이 아니라 대비 장치**다 —
   상실을 기계가 아니라 사건으로 읽히게 한다

4. **`example/` 은 이미 원형 마스크를 통과한다** (§1-5). 규격 하나(상단 여백)만 추가하면 된다

### 4-2. 채택 시 같이 정해지는 규격 넷 ⚠제안

| 항목 | 값 | 이유 |
|---|---|---|
| 배경 | **투명 PNG 고정** | §1-5 — 같은 파일이 원형·네모 둘 다 서므로 투명이 유일한 답 |
| 팔레트 | 배경 실측 램프 + **죄종 색은 초상에 안 넣는다** | [SCREEN_DESIGN §5](../client/SCREEN_DESIGN.md) 「초상은 색을 갖지 않는다」 유지. 죄종은 프레임이 든다 |
| 구도 | 두상 ≥ 프레임의 45% · **상단 12% 비움** · 소품은 실루엣으로 과장 | 원형 클리핑(§1-5) + 44px 판독(§1-4) |
| 시트 | **한 장에 3~6개 × 2~3줄** | 그 이상은 생성기의 스타일 일관성이 무너진다 (§6) |

> 채택되면 [monster_art_prompt.md](monster_art_prompt.md) §2 공통 스타일 블록과 §7 을 **재작성**해야 한다 —
> 현행 블록은 픽셀아트를 지시하고 있고, 그 지시는 §1-2 로 무효가 됐다.

### 4-3. 스타일과 별개로 지금 고칠 수 있는 것 둘

| 항목 | 조치 | 소관 |
|---|---|---|
| **26px 칩** | 초상을 포기한다(10번). 편성·리포트 칩은 **죄종 색 원판 + 이니셜/글리프**가 더 읽힌다 — 지금 폴백으로 있는 그것이 실은 정답이다 | 화면 결정 → `/ui` |
| ~~**`image-rendering`**~~ | ~~`pixelated` 를 뗀다. 단 전역이 아니라 **스타일 폴더별로 갈리는 값**이어야 한다 (§1-3)~~ **→ 2026-09-01 반영 완료.** `<html data-face>` + CSS 토큰 `--face-render` 로 갈랐다 — `cartoon` 은 보간 켬 / `pixel16` 은 `pixelated` 유지. 배경 아트는 손대지 않았다 ([SCREEN_DESIGN §5](../client/SCREEN_DESIGN.md)) | 화면 결정 → `/ui` |

---

## 5. §10 에 올릴 과제 후보 ⚠제안 [초안 2026-08-30]

| 과제 | 상태 |
|---|---|
| **초상 아트 스타일** | 확정 행이 없다. §4-1 의 ③+④ 채택 여부 · §4-2 규격 넷 · `pixel16` 폐기 여부가 한 묶음. 채택 시 [monster_art_prompt.md](monster_art_prompt.md) §2·§7 재작성이 딸려온다 |
| **26px 칩의 정체** | 초상인가 글리프인가. §1-4 로 초상은 물리적으로 불가능함이 확인됐다. 화면 결정이라 [SCREEN_DESIGN](../client/SCREEN_DESIGN.md) 이 선행 |
| **레어 영웅의 얼굴** | **가장 시급하다.** 레어 층이 죄종×직업 **35칸을 전담**하는데([hero_design.md §1](../game_design/hero_design.md)) 직업당 얼굴 하나면 35칸이 화면에서 5장으로 보인다. 후보는 **10종 중 6번(파츠 합성) 하나뿐** — 스타일 선택보다 이 구멍이 먼저다 |
| **보스 28장의 예산** | [monster_design.md §3](../game_design/monster_design.md) 의 「병목은 베이스 16장」이 보스를 안 셌다(§1-6). 색조 변형이 안 통하는 고유 이름 28개를 어떻게 감당할지 미정 |

---

## 6. 출처

| 표기 | 소스 | 신뢰도 |
|---|---|---|
| **[실측]** | `src/assets/art/` 파일 · `src/ui/style.css` · `src/data/monster.csv` 직접 측정 (2026-08-30) | ★★★ 1차 |
| **[개발사]** | [Battle Brothers Dev Blog #5 — Concept Art](https://battlebrothersgame.com/dev-blog-5-concept-art-explaining-battle-brothers-character-art-style/) — 흉상·소켓·파츠 레이어·큰 두상의 사유 | ★★★ 원문 |
| **[개발사]** | [Chris Bourassa GDC — Questionable Characters](https://www.youtube.com/watch?v=77NfJLARwPQ) · [Gothic Sensibilities (GameSpot)](https://www.gamespot.com/articles/the-gothic-sensibilities-of-darkest-dungeon/1100-6424880/) — 뒤러 목판화 · 지역별 지배 색조 · 강한 선 위의 색 강조 | ★★★ |
| **[실험]** | [Nano Banana Pro 스프라이트 생성 교훈](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/) — **굵은 외곽선 카툰이 가장 안정** · 정확한 치수·균일 격자는 못 지킴 · 크로마키 + 흰 외곽선이 최적 | ★★☆ |
| **[가이드]** | [Nano Banana 캐릭터 시트 일관성](https://selfielab.me/blog/nano-banana-pro-consistent-character-sheets-guide-20260216) — 시트당 3~6개 × 2~3줄 상한 | ★★ |
| **[리뷰]** | [PC Gamer — Lootun](https://www.pcgamer.com/games/lootun-is-an-auto-battling-rpg-for-people-who-just-really-love-managing-their-partys-gear/) · Steam 커뮤니티 초상 팩 1,200장 — A군의 초상이 유저 불만인 근거 | ★★ |
| **[리뷰]** | [Wildermyth 페이퍼크래프트](https://www.gamingonlinux.com/2019/11/papercraft-inspired-tactical-rpg-wildermyth-enters-early-access/) — 적은 1장, 영웅은 모듈 | ★★ |

### 미확인

- **Songs of Conquest · Chained Echoes 의 초상 네이티브 해상도** — 하이비트 픽셀의 실제 작업 규격을 못 확보했다. ①번 재평가 시 필요
- **`example/` 앵커의 44px 판독 우위가 스타일 때문인지 두상 비율 때문인지** — 분리 검증 안 됨. 같은 카툰 골격에 두상을 작게 그려 대조하면 갈린다
- **26px 칩을 글리프로 바꿨을 때의 실제 체감** — 화면에서 확인 필요 (`/ui`)

---

## 7. 이름 있는 스타일 앵커 10종 ⚠제안 [조사 2026-09-06]

> §3 이 「계열」 비교표라면, 여기는 그 안에서 **프롬프트에 이름으로 박을 수 있는 앵커** 목록이다. 평가축은 셋 — 7죄악 톤 · 44px 판독(§1-4) · AI 시트 재현성.
> 기준점은 현행 `faces/cartoon/`(다크 SD 카툰 흉상 · 굵은 외곽선 · Gemini 2×2 초록 시트 · [faces/example/README.md](../../src/assets/art/faces/example/README.md)).
> §4 의 결론(③ 골격 + ④ 팔레트)을 뒤집지 않는다 — 그 결론을 **실제 토큰**으로 옮긴 것이다. 확정 행은 여전히 없다.

### 7-1. 목록

**A. 현행 카툰 골격을 유지하고 톤만 바꾼다 — 파이프라인 그대로**

| # | 스타일 | 참고 | 맞는 이유 | 위험 |
|---|---|---|---|---|
| 1 | **Mignola 잉크** | Hellboy · Mike Mignola | 실루엣 중심이라 작은 칸에서 가장 강함 · 생성기 스타일 토큰이 안정 · Darkest Dungeon 과 Hades 의 아트 디렉터가 둘 다 1순위 영향으로 꼽음 | 얼굴 절반이 검어 **같은 종족 안 개체 식별**이 약해짐 |
| 2 | **고딕 목판 코믹** | Darkest Dungeon · Chris Bourassa | 뒤러 목판 + Mignola + 미국 코믹 노아르. 7죄악 톤 최적 · §3 ④ 그대로 | 선 굵기가 장마다 흔들림 · 해칭이 축소에서 뭉개짐 |
| 3 | **스케치 고딕 카툰** | Don't Starve · Klei (Burton · Gorey) | 개발사 표현으로 「신문 만화 스케치 선」 + 큰 머리 + 거의 무채색. 현행 SD 비율과 최근접 · 고블린·해골 잡몹에 특히 | 종이 질감이 다크 네이비 UI 위에서 가벼움 · 「귀엽다」로 기움 |
| 4 | **코믹-회화 카툰** | Rogue Lords · Cyanide | 악마가 빌런 무리를 이끄는 게임 — 서사 결이 가장 가까움. 카툰 형태 + 코믹 인킹 + 살짝 회화 채색 | 회화 채색이라 시트 간 일관성이 순수 카툰보다 낮음 |

**B. 「그래픽 최소화」(GAME_DESIGN §1) 정의에 가장 붙는 플랫·그래픽 계열**

| # | 스타일 | 참고 | 맞는 이유 | 위험 |
|---|---|---|---|---|
| 5 | **플랫 그래픽** | The Banner Saga · Eyvind Earle | 검정이 거의 항상 드는 단순 팔레트 + 고대비 + 각진 형태. [monster_art_prompt.md §1](monster_art_prompt.md) 배경 실측 램프와 같은 논리(목탄·그을음 위에 잉걸불만 점) | 원작 두상이 사실 비율 — **SD 로 바꿔 그려야** 44px 에서 산다 |
| 6 | **스테인드글라스** | Saga of Sins (보슈 영향) | 납선 = 굵은 외곽선 · 면 = 플랫 · 교회 창 = 7죄악 직결. 그 게임이 이미 7죄악을 이렇게 그렸다 | 유리색이 밝고 채도가 높아 [SCREEN_DESIGN §5](../client/SCREEN_DESIGN.md) 「초상은 색을 갖지 않는다」와 충돌. 그을린 유리로 죽이거나 **보스 28장(§1-6) · 죄종 글리프(§4-3) 자리 한정** |
| 7 | **비잔틴 이콘** | 금바탕 · 후광 (게임 참고: Gorogoa) | 플랫 · 정면 · 후광 원 = 도감 원형 마스크(§1-5)와 같은 형태. 성인 도상을 죄인으로 뒤집는 아이러니가 죄종 보유 영웅에 맞음 · 생성 재현 매우 안정 | 정면 응시 + 금색이 전원을 같은 얼굴로 만듦. **영웅 전용** — 몬스터엔 불가 |
| 8 | **중세 사본·목판** | Pentiment · Obsidian | 채색사본 + 독일 목판 · 제한 프레임의 평면 인물. 죄악 분류 자체가 중세 교회 것이라 시대 정합 최고 | 양피지 팔레트가 다크 UI 와 불일치 · 의도적 「어설픈 중세풍」이 루팅 RPG 의 힘 있는 인상과 멀어짐 |

**C. 색과 회화가 들어오는 계열 — 예산·안정성 리스크 큼**

| # | 스타일 | 참고 | 맞는 이유 | 위험 |
|---|---|---|---|---|
| 9 | **그래픽 흉상** | Hades · Supergiant · Jen Zee | Mignola 선 + 선명한 색 + 정밀 렌더링. 대화 흉상이 캐릭터 표현의 전부 — 본작 초상과 같은 문법 | 채도·미형으로 기울어 저채도 팔레트와 정면 충돌 · 64~90장(§1-6) 일관성 낮음. 「상업적 상한선」 참고용 |
| 10 | **cartoony but spooky** | Sunless Sea · Failbetter | 어두운 바탕 위 실루엣 + 강한 단순 색 + 손그림 질감 + 발광 포인트. 개발사 아트 디렉션 글이 그대로 본작 배경 논리 | 질감이 76px 이하에서 뭉개짐 · 빅토리아풍 어휘가 딸려옴 |

**번외 · 탈락**

| 항목 | 정체 |
|---|---|
| 보슈 그로테스크 | 화풍이 아니라 **괴물 디자인 어휘**. 보슈가 「7대 죄악의 탁자」를 직접 그렸다 — 색조 변형이 안 통하는 보스 28장(§1-6)의 형태 발상에 쓴다. 렌더링은 1~8 중 하나로 |
| HoMM3 초상 | 58×64 회화 초상이 완벽히 읽히는 **존재 증명**. §3 ⑫ 「회화는 76px 에서 전멸」의 반례 — 큰 두상 + 어두운 배경 + 강한 대비면 회화도 된다 |
| Cuphead 러버호스 | **탈락.** 악마와 계약이라는 소재는 맞지만 1930년대 개그 문법이라 루팅 RPG 톤과 안 맞는다 |

### 7-2. 판단 ⚠제안

**1순위 = 1번 Mignola.** §4 결론(③+④)과 같은 방향이면서 프롬프트에 이름 하나로 박히는 가장 안정적인 토큰이고, 검은 그림자 덩어리가 44px 판독을 오히려 돕는다. **2순위 = 5번 Earle 플랫.** 6·7번은 전 초상이 아니라 자리 한정(보스·글리프 / 영웅)으로 따로 본다.

### 7-3. Mignola 가 무엇인가 — 1순위라 따로 적는다

《헬보이》(1993~) 원작자. 「그림자를 선으로 그리지 않고 **검은 덩어리로 칠하는** 화풍」으로 요약된다.

| 특징 | 내용 |
|---|---|
| 그림자 = 순검정 면 | 그라디언트·해칭 없이 어두운 부분을 통째로 검정으로. 인물 절반이 검정인 컷이 흔하다 |
| 각진 단순화 | 턱·눈썹·어깨·주름이 직선과 예각. 둥근 것도 육각형처럼 깎여 **실루엣만으로 읽힌다** |
| 선이 거의 없다 | 외곽선이 그림자 덩어리에 흡수돼 사라지고, 밝은 면 안쪽 디테일은 최소. 눈은 점 둘이거나 그늘 속 |
| 플랫하고 탁한 색 | 채색 담당 Dave Stewart — 장면마다 지배색 하나 + 붉은 강조 한 점. 광택 없음 |
| 소재 | 고딕 · 민담 · 오컬트 · 가톨릭 도상 · 러브크래프트. 정지된 구도, 빈 공간이 많다 |

현행 카툰과의 차이 — 현행은 **균일한 굵은 외곽선 · 플랫 베이스 · 그림자 1단 · 둥근 면의 광택**. Mignola 는 균일 외곽선이 없고, 그림자가 1단이 아니라 검정 면이며, 광택이 없고, 형태가 둥글지 않고 각진다.

현행 민머리 기사(`hero_6`)가 이 화풍이 되면 — 눈두덩·코 아래·목 아래·견갑 안쪽이 전부 순검정 덩어리, 얼굴 한쪽 절반이 그늘, 둥근 두상이 각진 실루엣, 갑옷 광택 소멸, 외곽선이 그림자와 합쳐져 따로 안 보임. 붉은 서코트만 강조색으로 남는다.

### 7-4. 프롬프트 조립 — 스타일 칸 하나만 갈아끼운다

**10줄은 서로 독립이고 한 시트에 한 줄만 쓴다.** 섞으면 평균으로 뭉개져 비교가 안 된다.
프롬프트는 다섯 칸이고 **[1] 만 바꾸고 [2]~[5] 는 글자 하나 안 바꾼다** — 그래야 결과 차이가 스타일 탓임을 안다.

```
[1 STYLE]    ← 아래 10줄 중 하나
[2 FORMAT]   2×2 시트 · 2048² · 초록 배경 · 검정 격자선                (현행 그대로)
[3 COMPOSE]  흉상 · 두상 ≥ 45% · 상단 12% 비움 · 한 손에 무기         (§4-2)
[4 PALETTE]  목탄·그을음 램프 · 잉걸불 5% 미만 · 저채도               (monster_art_prompt §1)
[5 SUBJECT]  인물 묘사 + 레퍼런스 이미지 첨부                          (현행 그대로)
```

**스타일 줄 10개** (번호는 §7-1):

```
1  Mike Mignola style, heavy pooled black shadows, angular shapes, flat muted color, minimal linework
2  Darkest Dungeon style, gothic woodcut comic, thick black ink, hatching, face half in shadow, single dominant hue
3  Don't Starve style, sketchy newspaper-cartoon ink, big head, near-monochrome, Edward Gorey gothic
4  Rogue Lords style, clean dark cartoon with comic inking, light painterly shading
5  Eyvind Earle style, bold graphic flat shapes, high contrast, near-black + two muted tones, angular
6  dark stained glass window, thick lead lines, flat smoked-glass panes, medieval church icon
7  Byzantine icon, flat frontal portrait, gold ground, halo, tempera, minimal shading
8  Pentiment style, medieval illuminated manuscript + German woodcut, flat, parchment, ink outline
9  Supergiant Games style, Mignola-derived lineart with rich saturated painterly color, dialogue bust
10 Sunless Sea style, silhouette against darkness, strong simple colors, hand-painted texture, ember glow accent
```

**규칙 넷**

| 규칙 | 이유 |
|---|---|
| 레퍼런스 이미지는 **인물 고정용**으로만 — 현행 기사 PNG 를 첨부하고 「이 인물을 아래 스타일로 다시 그려라」 | 첨부 없이 글로만 묘사하면 인물이 바뀌어 스타일 비교가 안 된다 |
| **네거티브도 스타일마다 다르다** | 현행 네거티브에 `painterly` · `heavy shadow` 가 있으면 1·2·9·10 번은 그 줄이 죽인다. 스타일 줄을 바꿀 때 그 스타일의 핵심 단어를 네거티브에서 뺀다 |
| **작가 이름 > 게임 이름** | Mignola · Earle · Gorey 는 이름만으로 먹힌다. Rogue Lords · Pentiment · Saga of Sins 는 생성기가 잘 모른다 — 그 줄들은 뒤의 묘사가 무게를 지므로 묘사를 줄이면 안 된다 |
| **한 시트 = 한 스타일 = 한 인물** | 시트 하나에 두 스타일이나 두 인물을 섞으면 격자 안에서 서로 번진다. 비교는 시트를 따로 뽑는다 |

**조립 예 — 1번 · 민머리 기사.** 스타일 칸 아래는 다른 후보를 돌릴 때도 그대로 둔다.

```
STYLE — Mike Mignola style: heavy pooled black shadow shapes, angular simplified
forms, flat muted color, minimal linework. Shadows are solid black masses, not gradients.

FORMAT — one 2048x2048 sheet, 2x2 grid of four portraits separated by solid black
grid lines, flat chroma-green background (#00FF00) in every cell, no scenery, no text.

COMPOSITION — bust portrait, head and shoulders and one hand holding a weapon.
Head fills at least 45% of the cell height, top 12% of the cell left empty,
nearly frontal with a slight turn, transparent-ready silhouette.

PALETTE — desaturated charcoal grays and soot browns, one ember-red accent under 5%
of the figure, no bright or saturated colors, no sin color on the character itself.

SUBJECT — redraw the attached character exactly (bald middle-aged knight, gold-rimmed
pauldrons, red surcoat, scarred face) as four variations: neutral, grim, wounded, shouting.
```

### 7-5. 검증 절차 — 한 번이면 갈린다

같은 인물(민머리 기사)로 **1·2·5 번 시트 3장**을 뽑는다 → 각 시트의 1번 타일만 잘라 → 44·76px 로 내려 → 현행 카툰(`cartoon/hero_6`) 옆에 나란히 놓는다. **44px 에서 누가 남는지**가 답이다. 통과한 것이 있으면 [monster_art_prompt.md](monster_art_prompt.md) §2 공통 스타일 블록을 그 줄로 재작성한다(§4-2 예고 그대로).

### 7-6. 출처

| 표기 | 소스 | 신뢰도 |
|---|---|---|
| **[생성기]** | [Midlibrary — Mike Mignola](https://midlibrary.io/styles/mike-mignola) · [Dataloop — Mignola style](https://dataloop.ai/library/model/kappaneuro_mike-mignola-style/) — 생성기가 이 토큰으로 내놓는 결과 샘플 | ★★ |
| **[개발사]** | [GameSpot — The Gothic Sensibilities of Darkest Dungeon](https://www.gamespot.com/articles/the-gothic-sensibilities-of-darkest-dungeon/1100-6424880/) · [Dark RPGs — Chris Bourassa 인터뷰](https://darkrpgs.home.blog/2019/10/03/interview-with-chris-bourassa-co-founder-of-red-hook-studios-and-creative-director-of-darkest-dungeon/) — 뒤러 목판 + Mignola + 코믹 노아르 | ★★★ |
| **[개발사]** | [Game Developer — Don't Starve: A Tim Burton take on Minecraft](https://www.gamedeveloper.com/design/-i-don-t-starve-i-a-tim-burton-take-on-i-minecraft-i-) — 「sketchy newspaper cartoon」 · Burton · Gorey | ★★★ |
| **[리뷰]** | [Thumb Culture — Rogue Lords](https://www.thumbculture.co.uk/rogue-lords-review) · [Steam — Rogue Lords](https://store.steampowered.com/app/1069690/Rogue_Lords/) — 코믹 + 회화 카툰 · 악마가 빌런을 이끈다 | ★★ |
| **[분석]** | [Polygon Treehouse — The Banner Saga and Eyvind Earle](https://www.polygon-treehouse.com/blog/2018/3/7/inspiration-corner-eyvind-earle) — 검정 포함 단순 팔레트 · 고대비 | ★★ |
| **[개발사]** | [Shacknews — Saga of Sins stained glass](https://www.shacknews.com/article/134187/saga-of-sins-stained-glass-window) · [Fextralife — Saga of Sins · Bosch](https://fextralife.com/saga-of-sins-is-a-side-scrolling-rpg-inspired-by-hieronymus-boschs-paintings/) — 7죄악을 스테인드글라스로 | ★★★ |
| **[분석]** | [AV Club — On the Byzantine Art of Gorogoa](https://www.avclub.com/on-the-byzantine-art-of-gorogoa) · [Wikipedia — Gold ground](https://en.wikipedia.org/wiki/Gold_ground) | ★★ |
| **[개발사]** | [Game Developer — The art of Pentiment](https://www.gamedeveloper.com/art/deep-dive-the-art-of-pentiment) — 채색사본 + 목판 · 제한 프레임 | ★★★ |
| **[개발사]** | [Point'n Think — The Art of Hades](https://www.pointnthink.fr/en/the-art-of-hades-en/) · [MCV — Behind the art of Hades](https://mcvuk.com/business-news/behind-the-art-of-hades-we-value-artistic-integrity-and-excellence-in-artistic-craft-at-supergiant-however-were-first-and-foremost-a-game-design-lead-team/) — Jen Zee 가 Mignola 를 출발점으로 | ★★★ |
| **[개발사]** | [Failbetter — Sunless Sea art direction](https://www.failbettergames.com/news/caverns-measureless-to-man-or-sunless-sea-art-direction) — 「cartoony but spooky」 원문 | ★★★ 원문 |
| **[자료]** | [Art History Project — Bosch, Table of the Seven Deadly Sins](https://www.arthistoryproject.com/artists/hieronymus-bosch/the-seven-deadly-sins-and-the-four-last-things/) | ★★ |
| **[자료]** | [Heroes III Wiki — 초상 58×64 규격](https://homm.miraheze.org/wiki/Heroes_from_other_games) · [Cuphead Wiki](https://cuphead.fandom.com/wiki/Cuphead_(video_game)) | ★★ |
| **[자료]** | [Wikipedia — Mike Mignola](https://en.wikipedia.org/wiki/Mike_Mignola) — §7-3 화풍 정리의 기초 | ★★ |

---

*마지막 업데이트: 2026-09-06 (**§7 신설 — 이름 있는 스타일 앵커 10종 + 프롬프트 조립법** · A 카툰 골격 유지 4종(Mignola · Darkest Dungeon · Don't Starve · Rogue Lords) / B 플랫·그래픽 4종(Earle · 스테인드글라스 · 비잔틴 이콘 · Pentiment) / C 색·회화 2종(Hades · Sunless Sea) + 번외 셋(보슈 어휘 · HoMM3 반례 · Cuphead 탈락). 1순위 Mignola · 2순위 Earle. 조립은 다섯 칸 중 STYLE 칸만 교체, 검증은 같은 기사로 1·2·5 시트 3장을 44px 대조. §3 계열표·§4 결론은 안 건드렸다 — §4 결론을 실제 토큰으로 옮긴 것. 사용자 지시) · 2026-09-01 (**§4-3 `image-rendering` 반영 완료** — 예고한 대로 스타일 폴더별로 갈리는 값이 됐다(`--face-render`). §1-3 의 「축소에 NEAREST 는 순손실」 진단이 그대로 확인됐다 — 26px 칩에서 20픽셀 중 1픽셀만 남고 있었다) · 2026-08-30 (최초 작성 — 실측 6건 · 유사작 4군 · 스타일 10종 비교 · ③+④ 제안 · §10 후보 4건. **전부 임시 · 확정 행 없음**)*
