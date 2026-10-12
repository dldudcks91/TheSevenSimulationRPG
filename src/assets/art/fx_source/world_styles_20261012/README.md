# 캐릭터와 세계관을 기준으로 고른 스킬 이펙트

사용자 정정: **「그 그림체에 맞추지말고 우리 게임 캐릭터와 분위기에 어울리는걸로」**.

실제 영웅·몬스터 초상과 전장 화면을 참조로 붙여 Codex 내장 imagegen으로 생성했다. 후보마다 기본·전직 이펙트 95장이다. 첫 생성에는 앞선 수묵·과슈 등의 이펙트 시안을 참조로 붙이지 않았다.

| 후보 | 게임에서 가져온 기준 | 표현 |
|---|---|---|
| 다크 카툰 (`darktoon`) | 캐릭터의 큰 덩어리·묵직한 실루엣 | 굵은 윤곽, 각진 셀 명암, 짧고 강한 타격 모양 |
| 강철·잿불 (`cinder`) | 갑옷·무기·불탄 성벽 | 닳은 금속, 그을음, 잿불, 무게감 있는 반실사 게임 효과 |
| 고대 주술 (`ritual`) | 늙은 마법사·고블린 주술사·금기 | 끊어진 의식 문양, 각진 기운, 절제한 밝은 테두리 |

[실제 캐릭터 위 비교](character_compare.png) · [효과만 비교](compare.png) · [캐릭터 참조](character_reference.png) · [전장 참조](battle_reference.png)

- `sheet_<후보>_01.png` ~ `_03.png`: 원본 6×6 아틀라스, 후보마다 세 장.
- `prompt_<후보>_01.txt` ~ `_03.txt`: 최종 생성 프롬프트 전문. 첫 장은 캐릭터·전장 참조, 나머지 장은 여기에 해당 후보의 첫 장을 더했다.
- `manifest.json`: 구도·칸 번호·설치 파일 매핑과 후보 정의. 기술적인 사건·구도만 앞 칸 표를 사용했다.

```powershell
python scripts/prepare_world_fx.py
python scripts/build_painterly_fx.py --source src/assets/art/fx_source/world_styles_20261012
python scripts/build_painterly_fx.py --source src/assets/art/fx_source/world_styles_20261012 --compare
python scripts/build_painterly_fx.py --source src/assets/art/fx_source/world_styles_20261012 --characters
```

첫 명령은 프롬프트와 게임 참조만 준비하며 생성 도구를 호출하지 않는다. 설치본은 `src/assets/art/fx/skills/<기존 파일명>_<후보>.webp`, 384×384 RGBA다. 자홍 키잉·알파를 곱한 축소·5% 가장자리 처리는 기존 설치기와 같다. 낙하·착탄 위치와 강화·회복의 빈 중앙을 유지한다.

게임의 **도감 → 이펙트**와 **설정 → 이펙트 그림체**에서 고른다. 앞 과슈·동판화·프레스코 후보는 `../styles_20261012/`에 비교 자료로 보관한다.
