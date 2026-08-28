# 아트 자산 (src/assets/art/)

`backgrounds/`는 TheSevenRPG 포크 — 데이터 CSV(`src/data/inherited/`)와 같은 포크 정책, **원본 SSOT는 TheSevenRPG에 있고 여기 것은 재동기화 가능한 사본**, 읽기 전용 (CLAUDE.md 규칙 3).
`faces/`는 그 반대다 — 신규 도트그래픽 아트가 직접 들어가는 활성 폴더, 읽기 전용 아님.

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

## faces/ — CH1 몬스터 얼굴 아이콘

TheSevenRPG 원작 크롭 아트는 폐기(배경 팔레트와 안 맞아 붕 떠 보였다 — `docs/reference/monster_art_prompt.md` §0).
신규 아트는 도트그래픽 스타일로 새로 그린다. 파일명 규칙은 `monster_<idx>.png`,
숫자는 `src/data/monster.csv` 의 `monster_idx` 다 — 몬스터와 1:1 대응한다.

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

> `face_chapter_1.png` — 위 6종(1101~1203)을 뽑아낸 4×2 원본 시트. 참고용으로만 남겨둠, 코드 참조 없음.

⚠ 원본 파일명은 믿지 말 것 — `public/assets/sprites/monster_1101.png` 는 이름과 달리
**고블린 척후병(1101)이 아니라 스켈레톤 전사** 그림이다. 위 표가 실제 대응이다.

### 규격

- 정사각 PNG, 배경은 아직 불투명(단색) — 투명화는 미처리 상태로 남아있다
- 원형 마스크는 파일에 굽지 않는다. 원형 표시는 UI에서 `border-radius: 50%` 로 처리

---

*마지막 업데이트: 2026-08-28 (`assets/inherited/` → `assets/art/` 리네임 · faces/ 를 계승 크롭 아트에서 신규 도트그래픽으로 교체, 읽기 전용 해제) · 2026-08-22 (배경 4종 포크 + WebP 변환)*
