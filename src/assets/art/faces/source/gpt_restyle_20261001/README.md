# Gemini 초상 → GPT 그림체

2026-10-01 시작 · 2026-10-02 저장 및 검증. 내장 `image_gen`을 초상별로 호출해 GPT에 없던 Gemini 초상 **65장 중 64장**을 편집했다(영웅 19 · 몬스터 45). 기존 Gemini WebP 65장 · GPT WebP 10장 · 작업 원본 PNG를 보존했고 SHA-256으로 확인했다.

각 대상의 `source/ready/<hero|monster>/<id>.png`는 외형·자세·장비·표정·구도의 기준이다. 화염 광신도 `source/ready/monster/1401.png`와 임프 제사장 `1402.png`는 선·명암·채색 표현만 참조한다. 모든 결과는 실제 투명 배경이며, 프레이밍을 다시 맞추거나 재단하지 않고 512×512 작업 PNG와 영웅 320×320 · 몬스터 256×256 WebP(품질 90)로 축소했다.

- `generated/`: 내장 도구의 원본 출력 PNG.
- `../ready/gpt/`: 512×512 작업 PNG.
- `../../gpt/`: 게임 설치 WebP.
- [manifest.json](manifest.json): 대상 65장, 원본 해시, 설치 경로·해시와 처리 결과.
- [prompt.txt](prompt.txt): 공통 편집 프롬프트. [archer_prompt.txt](archer_prompt.txt)는 첫 궁수용, [correction_1103.txt](correction_1103.txt)는 누락된 송곳니 복원용, [3103_prompt.txt](3103_prompt.txt)는 사암 골렘 재시도용이다.
- [comparison.html](comparison.html): 전체 원본·GPT 비교. `comparisons/`에는 8장씩 나란히 배치한 비교 PNG가 있다.

**미완료: 엔트 `monster/2201`.** 내장 이미지 생성 도구가 출력 단계에서 세 번 `moderation_blocked`(`other`)를 반환해 결과 파일이 없다. 요청 ID와 상태를 manifest에 기록했다. [2201_prompt.txt](2201_prompt.txt)와 [2201_retry_prompt.txt](2201_retry_prompt.txt)는 재시도 프롬프트이며, 원본은 보존했다. GPT 스타일에서는 다른 스타일로 대체하지 않고 이 초상을 표시하지 않는다.

파일 검증: 저장소 루트에서 `python scripts/apply_gpt_portrait_restyle.py verify`.
