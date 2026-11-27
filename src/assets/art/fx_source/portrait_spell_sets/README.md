# 전투 카드용 스킬 이펙트

내장 ImageGen으로 그림체마다 4×4 투명 원화 시트 일곱 장을 그렸다. 시트 번호는 1부터 시작하며 각 행은 왼쪽부터 읽는다. 생성 문구는 `prompts.json`의 공통 구도, 그림체, 칸별 동작, 개별 시트 추가 지시로 구성한다.

천구도는 황동 눈금과 별빛, 성당 유리는 납선과 색유리 파편, 망령불은 반투명 연기와 발광하는 심지를 사용한다. 각 세트의 112장에는 스킬 101개의 기본 그림, 두 번째 타격 장면 9개, 지원 사격의 발사, 모으기 기운이 들어 있다.

`python src/assets/art/fx_source/portrait_spell_sets/export.py`가 원본 알파의 투명한 틈을 따라 시트를 분리하고 투사체 줄과 바닥 접점을 맞춰 256×256 WebP로 저장한다. Pillow와 NumPy가 필요하다. 출력 경로는 `src/assets/art/fx/skills/<style>/`이다.

`python serve.py 8777`로 게임을 실행한 뒤 `python src/assets/art/fx_source/portrait_spell_sets/verify.py`로 전체 파일과 도감 재생을 검사한다. 브라우저 검사는 Playwright와 Chrome을 사용한다. 도감 → 이펙트 → 나란히 보기에서 스킬 하나를 골라 세 그림체를 같은 타이밍에 재생할 수 있다.
