# 깔끔한 2D 스킬 이펙트 비교

다크 카툰·수묵을 남기고, 비슷한 2D와 더 깔끔한 모바일 게임 방향을 다섯 가지로 생성했다. 생성 방식은 **Codex 내장 imagegen**이다. 게임에서 현재 연결하는 파일 88장씩, 총 440장을 `../../fx/skills/<file>_<style>.webp`에 설치했다.

[실제 표시 크기 비교표](compare.png) · [스킬·셀 대응](manifest.json) · [내보내기 검사](export_report.json) · [브라우저 검사](verification.json) · [삭제·보존 해시 기록](cleanup_report.json)

| 방향 | 특징 | 최종 생성 프롬프트 |
|---|---|---|
| 셀 2D (`cel2d`) | 가는 윤곽, 셀 명암, 정돈된 큰 모양 | [01](prompt_cel2d_01.txt) · [02](prompt_cel2d_02.txt) · [03](prompt_cel2d_03.txt) |
| 플랫 코믹 (`comic2d`) | 선명한 외곽선, 평평한 명암, 강한 실루엣 | [01](prompt_comic2d_01.txt) · [02](prompt_comic2d_02.txt) · [03](prompt_comic2d_03.txt) |
| 클린 모바일 (`mobile2d`) | 부드러운 에너지 곡선, 밝은 중심, 또렷한 색 테두리 | [01](prompt_mobile2d_01.txt) · [02](prompt_mobile2d_02.txt) · [03](prompt_mobile2d_03.txt) |
| 도깨비불 2D (`spirit2d`) | 흐르는 불꽃과 기운, 가늘어지는 곡선 | [01](prompt_spirit2d_01.txt) · [02](prompt_spirit2d_02.txt) · [03](prompt_spirit2d_03.txt) |
| 클린 도트 (`pixel2d`) | 픽셀 가장자리, 선명한 색 덩어리 | [01](prompt_pixel2d_01.txt) · [02](prompt_pixel2d_02.txt) · [03](prompt_pixel2d_03.txt) |

원본은 `sheet_<style>_01.png`~`_03.png`이며 실제 투명 알파를 갖는다. 각 시트는 6×6 배치이고, 구도 대응을 유지하려고 그린 과거 스킬 일곱 칸은 게임용 파일로 내보내지 않는다. 후속 시트에는 해당 방향의 첫 시트만 그림체 참조로 첨부했다.

`python scripts/build_clean_fx.py`로 설치하고 `--compare`로 비교표를 만든다. 내보내기는 투명한 셀 간격을 찾아 자르는 위치를 보정하며, 원본의 알파와 낙하·착탄·얼굴을 비우는 구도를 유지한다. 새 설치본은 256×256 WebP이고 기존 두 그림체는 원래 해상도 그대로다.

그림체는 도감 → 이펙트와 설정 → 이펙트 그림체에서 고른다. 한영 탭, 활성 파일 616개 디코딩, 각 그림체의 전체 재생, 설정 저장, 삭제한 그림체 설정의 다크 카툰 기본값 복귀를 실제 브라우저에서 확인했다. 보존 대상 222개는 삭제 전후 SHA-256이 같다.
