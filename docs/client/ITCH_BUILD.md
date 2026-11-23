# itch.io 판 구성

itch.io 에 올리는 HTML5 판에 **무엇을 싣고 무엇을 빼는가**를 이 문서 하나가 든다. 웹판(GitHub Pages)은 [ARCHITECTURE §11](ARCHITECTURE.md) 그대로 다 싣고, itch 판은 그 배포 사본에서 아래 「빼는 것」만 덜어 낸다. **저장소에서는 아무것도 안 지운다.**

## 1. 왜 따로인가 — itch 업로드 상한

| 상한 | 값 |
|---|---|
| zip 안 파일 수 | **1,000** |
| zip 크기 | 500MB |
| 파일 하나 | 200MB |
| 경로 길이 | 240자 |

출처: itch.io 문서 「HTML5 — zip file requirements」. 지금 걸리는 것은 파일 수뿐이다.

## 2. 원칙

- **설정에서 고르는 그림 묶음은 기본값 하나만 싣는다** [2026-11-13 사용자] — 나머지 묶음은 웹판에서 견준다
- 게임이 안 읽는 파일(관리자 퍼널 · Pages 전용 파일)은 싣지 않는다
- 기본값이 바뀌면 이 표도 바꾼다 — 기본값은 `ui/skill_art.js:ART_DEFAULT` · `ui/mock.js:BG_STYLES[0]`
- 새 아트 묶음 · 폴더가 생기면 싣는지 빼는지 이 표에 한 줄을 더한다
- 그림 미리 받기 목록(`src/assets/art/preload.json` · ADR-1080)은 웹판 목록 그대로 싣는다 — itch 에서 뺀 파일(스킨)은 404 로 받은 셈 치고 넘어간다

## 3. 빼는 것

| 묶음 | 싣는 것 | 빼는 것 |
|---|---|---|
| 이펙트 그림체 | 다크 카툰 | 금속박 `fx/skills/*_foil` |
| 배경 스타일 | 일러스트 | gpt · 도트 스테이지 (`pixel/town.webp` 는 거점 배경이라 싣는다) |
| 겉모양 스킨 | 기본(Now) | `skins/` 전부 |
| 관리자 퍼널 | — | `src/dev/` |
| Pages 전용 | — | `.nojekyll` |

빼는 목록 — 배포 사본 안의 경로 · 글롭(`*` 는 `/` 를 넘지 않는다 · 끝의 `/` 는 그 폴더 전부). 짓는 쪽은 이 블록을 읽는다:

```itch-exclude
src/assets/art/fx/skills/*_foil.webp
src/assets/art/backgrounds/gpt/
src/assets/art/backgrounds/pixel/background_stage_*.webp
src/assets/art/skins/
src/dev/
.nojekyll
```

## 4. 지금

| | 낱장 | `--pack-icons` |
|---|---|---|
| 배포 사본 | 1,502 | 790 |
| 빼는 것 | 144 | 144 |
| **itch 판** | 1,358 | **646** |

2026-11-23 측정 · 작업 폴더 기준. 낱장으로는 상한을 넘는다 — itch 판은 `--pack-icons` 로 짓는다(§6). 묶음 13개가 아이콘 725장을 든다(스킬 2 · 마스터리 8 · 장비 3).

## 5. 빼서 생기는 화면 — 결정 대기

빠진 묶음도 설정 줄에는 그대로 뜬다. itch 판에서 고르면:

| 설정 | 고르면 |
|---|---|
| 이펙트 그림체 → 금속박 | 코드로 그린 이펙트 (그림 없을 때의 대체 · `fx.js:loadSkillArt`) |
| 주소 `?bg=gpt` · `?bg=pixel` | 스테이지 배경이 그라디언트 |
| Skin → D2 Min · 키트 | 테두리 그림이 빠진 화면 |

## 6. 짓는 법

**형태 = HTML5 zip** — 브라우저에서 바로 하는 판이다. 게임이 원래 무빌드 웹이라 웹판과 같은 사본에서 파일만 덜어 낸다.

1. `scripts/build_deploy.py <폴더> --pack-icons` 로 배포 사본을 짓는다 (웹판과 같은 사본 — 주석을 뗀다 · 파이썬 3.10 이상)
2. 위 「빼는 것」 블록대로 덜어 낸다
3. zip 한다 — 맨 위에 루트 `index.html` 이 와야 한다(그 파일이 `src/index.html` 로 넘긴다)

**아이콘 묶음** (`--pack-icons` · 2026-11-23) — 큰 아이콘 묶음(스크립트의 `PACK_SETS` — 스킬 · 마스터리 · 무기 · 방어구 베이스)을 낱장 대신 **64장씩 한 파일**(`src/assets/art/packs/*.bin`)로 싣는다.
- 묶음 파일은 아이콘 파일의 바이트를 그대로 이어 붙인 것이다 — 다시 인코딩하지 않아 그림은 낱장과 같다. 스크립트가 아이콘마다 묶음에서 다시 읽어 바이트를 대조한다
- `preload.json` 의 `packs` 가 아이콘마다 위치 · 길이를 든다. 메뉴가 켤 때 묶음을 받아 잘라 그림 주소를 만들고(`ui/preload.js`), 그림 경로를 짓는 함수(`mock.skillIcon` · `itemArt` · `weaponBaseArt` · 마스터리 칸 · `battle.js:traitArt`)가 `packed()` 로 그 주소를 받는다. 첫 화면 그림(스킬)이 든 묶음은 1차 막대에 든다
- **`PACK_SETS` 에 묶음을 더하면 그 경로를 짓는 함수도 `packed()` 를 거쳐야 한다** — 안 거치면 낱장 경로를 찾다 404 가 난다
- 웹판(Pages)은 낱장 그대로다 — 워크플로가 이 옵션 없이 짓는다
- 검증: 지은 사본을 세션 포트로 띄워 `index.html?preload` 로 열고, 시작 파티 · 도감(스킬 · 마스터리 · 무기 · 방어구) · 캐릭터 화면의 그림이 `blob:` 주소로 서는지 · 묶음 경로의 404 가 없는지 본다(2026-11-23 — 전부 섰다 · 404 는 원래 빼는 스킨뿐)

1 ~ 3 을 한 번에 하는 명령은 아직 없다 — 결정 대기.

| itch 업로드 칸 | 값 |
|---|---|
| Kind of project | HTML |
| 올린 zip | 「This file will be played in the browser」 |
| Viewport dimensions | 1280 × 640 — 화면이 1600×800 한 장(2:1)이라 같은 비 (SCREEN_DESIGN §2 「한 장」) |
| Fullscreen button | 켠다 |
| Mobile friendly | 끈다 — 마우스 hover 툴팁이 정보의 길이다 |

## 7. 올린 뒤 확인

itch 는 게임을 `html-classic.itch.zone/html/<업로드 번호>/` 에서 iframe 으로 띄운다. 업로드마다 번호(경로)만 바뀌고 도메인은 같다.

- 세이브가 남는가 — 새로고침 · 탭 닫고 다시 열기 · **새 판을 올린 뒤**. 세이브는 도메인 단위(localStorage · `thesevensim.*` 고정 키)라 업데이트에도 남아야 하지만, 업데이트하면 세이브가 날아간다는 보고가 여럿 있다
- 저장 용량(도메인당 약 5MB)을 itch 의 모든 HTML 게임이 나눠 쓴다 — 저장이 실패해도 지금은 알림이 없다
- 웹판(Pages)과 세이브가 따로다 — 주소가 달라서다
- 플레이 기록 · 결투장이 itch 주소에서 도는가 — Firebase 익명 로그인 · API 키의 허용 도메인
- itch 페이지의 AI 표기 — 그림이 AI 생성이다

---

*마지막 업데이트: 2026-11-23*
