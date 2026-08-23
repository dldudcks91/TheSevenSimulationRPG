# 계승 아트 (TheSevenRPG 포크)

원본: `TheSevenRPG/fastapi/public/assets/backgrounds/`
데이터 CSV(`src/data/inherited/`)와 같은 포크 정책 — **원본 SSOT는 TheSevenRPG에 있고, 여기 것은 재동기화 가능한 사본**이다.

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

원본: `TheSevenRPG/fastapi/` 의 1024px급 몬스터 일러스트에서 **머리만 크롭**한 것.
파일명의 숫자는 계승 `monster_info.csv` 의 `monster_idx` 다 — 몬스터와 1:1 대응한다.

| 파일 | monster_idx | 몬스터 | 원본 |
|---|---|---|---|
| `face_1101.png` | 1101 | 고블린 척후병 | `resources/monster_goblin_scout.jpg` |
| `face_1102.png` | 1102 | 고블린 전사 | `resources/monster_gblin_warrior.jpg` |
| `face_1301.png` | 1301 | 스켈레톤 전사 | `public/assets/sprites/monster_1101.png` |
| `face_1303.png` | 1303 | 스켈레톤 기사 | `resources/Gemini_Generated_Image_l5y18fl5y18fl5y1.png` |
| `face_1350.png` | 1350 | 둘라한 | `resources/Gemini_Generated_Image_vikvapvikvapvikv.png` |

**CH1 16종 중 5종뿐이다.** 나머지 11종(오크 전사·아바돈·인간 보병/창병·트롤 돌격병·레기온·
스켈레톤 궁수·임프 3종·몰록)은 **원작에도 아트가 없다.** CH2 이후도 전무하다.
없는 얼굴은 죄종 색 원판 + 이니셜로 폴백한다.

⚠ 원본 파일명은 믿지 말 것 — `public/assets/sprites/monster_1101.png` 는 이름과 달리
**고블린 척후병(1101)이 아니라 스켈레톤 전사** 그림이다. 위 표가 실제 대응이다.

### 규격

- **256×256 정사각, 투명 PNG (팔레트 128색)**, 5장 합계 62KB
- 흰 배경은 테두리 flood fill 로 제거 — 전역 threshold 가 아니라서 해골 뼈 같은 내부 밝은색이 살아있다
- **원형 마스크를 파일에 굽지 않았다.** 원형 표시는 UI에서 `border-radius: 50%` 로 —
  풀바디 일러스트에서 잘라낸 것이라 네모로 두면 모서리에 칼끝·어깨·방패가 남는데,
  원형으로 깎으면 전부 정리된다. 마스크를 구우면 나중에 사각 프레임으로 못 바꾼다
- 확대는 `NEAREST`(픽셀 보존), 축소는 `LANCZOS`

### 재동기화 방법

머리 bbox 좌표가 `_crop_faces.py` 의 `FACES` 딕셔너리에 원본 픽셀좌표로 박혀 있다.
원본이 갱신되면:

```bash
cd src/assets/inherited/faces && python _crop_faces.py .
```

---

*마지막 업데이트: 2026-08-22 (배경 4종 포크 + WebP 변환 / CH1 얼굴 5종 크롭)*
