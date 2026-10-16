# 챕터 1–4 GPT 몬스터 일반형·정예형

2026-10-16 사용자 요청: 보스를 제외한 챕터 1–4 일반 유닛의 일반형과 정예형을 모두 제작한다. 기존 GPT 초상은 유지하며 누락된 50장을 대상으로 한다.

**완료: 48장(일반형 16 · 정예형 32).** 기존 그림과 합쳐 이 범위는 **94/96장**이다. `2201` 일반형·정예형 2장은 아래의 생성 도구 차단으로 남았다. 48장 모두 게임에 등록했고, 기존 몬스터 원본 248개의 SHA-256 보존을 확인했다.

내장 `image_gen`을 초상마다 호출했다. `../ready/monster/1401.png` 화염 광신도와 `1402.png` 임프 제사장은 굵은 외곽선·각진 명암·탁한 색·절제된 붓질의 기준이다. 각 몬스터의 현재 그림은 외형·장비·구도의 기준이며, 정예 원본이 없으면 같은 일반형에 머리장식과 장비를 더한다.

챕터 4의 신규 일반형은 기존 트롤·동결 병사 시트, 예티 빙하거인 `4303`, 청동 수호자 `1403`을 외형 참고로 삼았다. 프롬프트와 입력별 역할은 [prompts/](prompts/) 및 [jobs.json](jobs.json)에 보존한다. 단일 초상과 실제 알파 배경을 요청하여 초록 키잉이나 격자 절단은 필요하지 않았다.

- [manifest.json](manifest.json): 대상·상태·출력 해시·기존 몬스터 파일 해시.
- `generated/`: 내장 도구의 원본 생성 PNG. 기존 기본 저장 경로의 파일도 남긴다.
- `../ready/gpt/monster/`: 512×512 투명 작업 PNG.
- `../../gpt/monster/`: 256×256 게임용 WebP, 품질 90.
- [gallery.html](gallery.html): 48종 일반형·정예형을 나란히 보는 비교 자료.
- `chapter_1.jpg`~`chapter_4.jpg`: 챕터별 일반형·정예형 비교 시트.
- `chapter_1_circles.jpg`~`chapter_4_circles.jpg`: 실제 게임의 원형 마스크로 본 비교 시트.
- `results/`: 도구 출력 경로 또는 실패 원문.
- [browser_check.json](browser_check.json): 96개 경로 중 94개 로딩, 같은 스타일의 일반형 대체 통과. JavaScript 오류와 잘못된 이미지 응답은 0개.
- [browser_chapter_4.png](browser_chapter_4.png): 브라우저의 챕터 4 일반형·정예형 비교 화면.

## 생성 도구의 차단

엔트 `2201` 일반형은 이번 작업에서 두 번 결과 단계의 `moderation_blocked`(`other`)를 반환했다. 요청 ID는 `e8870145-b7a1-410a-b939-82aa2625e8b7`, `87dd92b9-ee3c-40e6-bdb7-fd77b4ef996b`다. `2201_elite`도 같은 오류를 반환했다(`22275ca0-0ad6-40bc-81cc-0e5bceaef20b`). 두 초상은 생성 결과가 없으며 다른 스타일의 그림을 GPT 파일로 복사하지 않았다.

## 저장 및 검증

```powershell
python scripts/apply_gpt_monsters_ch1_4.py collect
python scripts/apply_gpt_monsters_ch1_4.py enable
python scripts/apply_gpt_monsters_ch1_4.py compare
python scripts/apply_gpt_monsters_ch1_4.py verify
python .claude/skills/art-prompt/build_chapter_sheets.py
python scripts/verify_gpt_monsters_ch1_4.py
```

`enable`은 저장 완료된 초상에 한해 `monster.csv:face/face_elite`를 켠다. CSV의 다른 내용과 줄바꿈은 보존하며 실행 직전 사본을 `monster.before.csv`에 남긴다. 게임은 선택한 스타일의 정예 그림이 없으면 같은 스타일의 일반형을 사용한다. 다른 스타일의 초상으로 대체하지 않는다. 영웅 초상과 `HERO_FACES`는 이 작업의 변경 대상이 아니다.

검증은 기존 몬스터 원본 보존, 새 PNG/WebP의 해시·알파·크기를 검사한다. 영웅 원본은 다른 세션에서 작업 중일 수 있어 몬스터 보존 검사에서 제외한다. 브라우저 검증 스크립트는 임시 로컬 서버를 직접 열고 종료하며 96개 경로, 스타일 선택, 정예의 일반형 대체, 비교 자료의 이미지 로딩을 확인한다.
