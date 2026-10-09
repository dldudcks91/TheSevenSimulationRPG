# 10. 화면 관찰 기록

## 방법

공식 이미지 9개와 공개 영상 3개를 조사했다. 영상 길이 합계는 **2시간 54분 29초**다. 이 길이는 원본 자료의 길이이며 연속 시청한 시간이라는 뜻이 아니다.

영상은 120초 간격으로 87개 프레임을 생성해 흐름을 확인하고, 시작·선택·종료 장면을 추가 추출했다. 필요한 **22개 영상 근거 프레임**을 문서에 저장했다. 주기 추출 프레임의 시각은 대략적인 중간 시점이며, 아래에 링크한 저장 프레임은 지정 시각으로 별도 추출한 것이다. 클릭 입력의 정확한 프레임이나 음향은 확인하지 않았다.

원본 출처·길이·버전은 [영상 목록](data/video_source_index.json), 저장 프레임의 시각·원본 링크·SHA-256은 [프레임 목록](data/video_frame_index.json)에 있다. 관찰하지 않은 사이에 일어난 행위를 채워 넣지 않는다.

## 공식 이미지

공통 한계: 조사일의 상점 이미지이지만 **촬영한 빌드는 미표시**다. 현재 전역 규칙의 수치로 일반화하지 않는다.

| ID·이미지 | 직접 보이는 정보 | 해석·미확인 |
|---|---|---|
| [SS00](evidence/official_screenshots/steam_00.jpg) | 조미미 초상화, 5일차, 행복 126, 작은 열차, 여러 상태 아이콘, 사건 진행률 41% | 아이콘만으로 안정성 상한·사건 공식은 알 수 없음 |
| [SS01](evidence/official_screenshots/steam_01.jpg) | 13일차 행복 1,991, 숲 배경, 다층 객차, 승객 입장·녹색 산출, 아카데미·총보급관리국·교육 등 | 배치와 생산의 시각적 대응. 정확한 생산 합계·사람 순서는 미검증 |
| [SS02](evidence/official_screenshots/steam_02.jpg) | 레벨 9 후보 확률 18/35/37/10%, 대학·사설 도박장, 교육·아카데미 툴팁 | 한 상태의 등급 확률. 모든 레벨의 확률표가 아님 |
| [SS03](evidence/official_screenshots/steam_03.jpg) | 31일차 행복 27,827, 붉은 서리 기사단·엔진의 자녀들 등의 혼합, 다층 객차와 많은 산출 | 강한 생산의 표현. 특정 조합의 승리·최적성 증거는 아님 |
| [SS04](evidence/official_screenshots/steam_04.jpg) | 유물 후보 4개, 즉시 획득·누적 성장·슬롯 증가/선택 수 감소 등의 효과 | 유물마다 발동 기준과 반대 비용이 다름. 후보 수 4가 항상 기본인 것은 아님 |
| [SS05](evidence/official_screenshots/steam_05.jpg) | 강경한 사건 선택, 승객 2 손실, 반발의 초당 행복 -1·획득 반복 때 배증 | 즉시 손실과 지속 손실을 분리해 읽을 수 있음. 제거·상한은 알 수 없음 |
| [SS06](evidence/official_screenshots/steam_06.jpg) | 43일차 행복 1,271,240, 레벨 10, 11/11 배치, 승객 32, 속도 106%, 손패 3/7, 재활용 56/80 | 큰 성장·많은 효과의 사례. 보편적인 후반 기준이 아님 |
| [SS07](evidence/official_screenshots/steam_07.jpg) | 결단 트리, 진행 시간, 고압 커먼레일 시스템 70초·속도 +4%, 결단 번복 버튼 | 선택의 시간 투자. 취소·환급 범위는 미확인 |
| [SS08](evidence/official_screenshots/steam_08.jpg) | 조미미 주행, 연료와 망치 비밀결사 5, 보안관실 여러 장, 구도심 배경 | 시너지 개수·보관 카드·실제 편성은 구분해야 함 |

### SS02의 정확한 읽기

교육은 만원 때의 추가 행복을 다룬다. 화면은 2개에서 보너스 3배, 3개에서 항상 발생, 4개에서 6배를 설명한다.

아카데미는 **5층까지 강화 가능**과 **주기적인 아카데미 객차 획득**을 설명한다. 2개는 4주기마다 2티어 이하 객차 하나, 4개는 매 주기 객차 하나를 얻는다고 표시한다. “자동으로 기존 객차를 강화한다”는 설명과 다르다. 실제 획득 카드의 층·손패 넘침·병합은 별도 검증해야 한다.

대학은 기본 행복 +2, 만원 때 추가 +3을 표시한다. 이 카드 한 장의 값으로 모든 교육 객차의 산출을 추정할 수 없다.

## V01 — 최순자 일반 난이도 여정

출처: [Game On Screen 영상](https://www.youtube.com/watch?v=nqF8GW_xr7w). 2026-07-22 업로드, 48:46. **빌드 미확인.** 수치는 이 영상의 상태다.

| 기록 | 시각·근거 | 상태·관찰 | 선택·비용·결과의 확인 범위 |
|---|---|---|---|
| START01 | [00:00](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=0s), [화면](evidence/video_frames/v01_00m00s_start.jpg) | 행복 300, 레벨 1, 배치 2/3, 승객 6, 속도 100% | 시작 상태. 차장 전체 공통 초기값으로 쓰지 않음 |
| TOOL01 | [00:30](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=30s), [화면](evidence/video_frames/v01_00m30s_transportation.jpg) | 운송 40/31/24 탑승 누적, 붉은 서리 기사단 훈련 설명 | N086 운송 수치와 일치. 요약 문장은 세부 단계와 다른 기준처럼 읽힘 |
| M01 | [03:00](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=180s), [화면](evidence/video_frames/v01_03m00s_map.jpg) | 행복 284, 보급품 5, 연결 노선·열차 위치·가려진 영역 | Mountain의 Rare Supply Outpost 툴팁: 시야 +1, 경험치 +1, 보급품 1, Artifact Drone Supply 1, 도착 41초. 실제 그 지점 도착·보상 처리는 이 프레임만으로 확정하지 않음 |
| D01 | [09:00](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=540s), [화면](evidence/video_frames/v01_09m00s_decision.jpg) | 여러 결단이 열린 트리와 선택 상세 화면 | Reconstruction Committee 설명을 보고 있음. 실제 선택·완료 시각은 미기록 |
| A01 | [11:00](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=660s), [화면](evidence/video_frames/v01_11m00s_artifacts.jpg) | 레벨 5, 행복 1,440, 유물 후보 3개 | 속도·주행거리/생산 관련 후보 비교. 선택 결과와 지출을 프레임 사이에서 추정하지 않음 |
| EV01 | [31:00](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=1860s), [화면](evidence/video_frames/v01_31m00s_event.jpg) | 행복 19,305, 빈곤 관련 사건, 두 선택 | 기술적 해결과 강경한 해결을 제시. SS05와 같은 결과라고 합치지 않음 |
| LATE01 | [41:00](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=2460s), [화면](evidence/video_frames/v01_41m00s_late_run.jpg) | 행복 33,908, 길고 성장한 열차 | 이후 43:00은 29,739, 47:00은 8,884. 감소를 관찰했지만 원인별 손실 장부는 미확보 |
| END01 | [48:20](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=2900s), [화면](evidence/video_frames/v01_48m20s_destination.jpg) | 53일차, 행복 447, 목적지 발견 사건 | 도착과 탈출을 제시. 영구 순환 구조의 증거가 아님 |
| E01 | [48:40](https://www.youtube.com/watch?v=nqF8GW_xr7w&t=2920s), [화면](evidence/video_frames/v01_48m40s_victory.jpg) | 일반 난이도 승리. 53일, 행복 447, 승객 41, 속도 113%, 총 행복 119,267 | 경로·객차·유물과 상위 기여 객차가 결과에 표시. 이전의 행복 감소는 패배를 뜻하지 않음 |

### 이 여정에서 도출할 수 있는 것

**해석:** 현재 행복이 줄어도 목적지까지 여유가 남으면 성공할 수 있다. 따라서 유한 여정에서는 높은 지속 생산 외에 도달 시간도 가치가 있다.

**도출할 수 없는 것:** 이 경로가 최적이었다는 결론, 이 객차 목록의 현재 승률, 행복 감소의 정확한 원인, 모든 지점에서의 선택 이유. 영상 제목이 전체 플레이를 표방해도 프레임 조사만으로 입력 전체를 복원할 수 없다.

## V02 — 임석대 Frost 1, 1.0.1-build-1

출처: [The Gaming CPA 영상](https://www.youtube.com/watch?v=RG-jVILa4gE). 2026-08-14 업로드, 43:11. 시작 메뉴 하단에 **v1.0.1-build-1**이 표시된다. 얼굴 영상이 왼쪽 일부를 가린다.

| 기록 | 시각·근거 | 직접 관찰 | 확인 경계 |
|---|---|---|---|
| BUILD01 | [00:00](https://www.youtube.com/watch?v=RG-jVILa4gE&t=0s), [화면](evidence/video_frames/v02_00m00s_build.jpg) | 메뉴 하단 빌드 1.0.1-build-1 | 8월 업로드를 1.0.3 플레이로 간주하면 오류 |
| C01 | [00:30](https://www.youtube.com/watch?v=RG-jVILa4gE&t=30s), [화면](evidence/video_frames/v02_00m30s_conductor.jpg) | Strongman: 레벨 상승 시 보급품 3. Obsession: 최종 행복 +5%·주기적 스트레스. Frost 1 툴팁 불만 +30% | 현재 N103의 +35%와 구분. 초기 특성·해당 난이도 하나의 관찰 |
| CHOICE01 | [05:10](https://www.youtube.com/watch?v=RG-jVILa4gE&t=310s), [화면](evidence/video_frames/v02_05m10s_artifact_choices.jpg) | 레벨 4, 행복 1,012, 보급품 3, 속도 100%. 유물 후보 3개 | 선택지는 아래의 연쇄 기록 참조 |
| FUTURE01 | [05:15](https://www.youtube.com/watch?v=RG-jVILa4gE&t=315s), [화면](evidence/video_frames/v02_05m15s_future_effect.jpg) | Rusty Nut가 변할 Clean Nut의 툴팁: 속도 +4% | 변신 후 예상 효과가 선택 전에 보임. 실제 변신 장면은 미기록 |
| SELECT01 | [05:20](https://www.youtube.com/watch?v=RG-jVILa4gE&t=320s), [화면](evidence/video_frames/v02_05m20s_selection.jpg) | Rusty Nut 카드가 선택 연출로 떠 있음 | 어떤 후보가 선택됐는지 확인 |
| RESULT01 | [05:30](https://www.youtube.com/watch?v=RG-jVILa4gE&t=330s), [화면](evidence/video_frames/v02_05m30s_after_selection.jpg) | 주행 복귀, 유물 아이콘에 210, 속도 92%, 보급품 2, 게임 시각 5일 19:37 유지 | 속도 -8%와 일치. 보급품 3→2도 관찰. 소비의 정확한 트리거를 모든 유물 선택의 공통 규칙으로 확대하지 않음 |
| EV02 | [29:20](https://www.youtube.com/watch?v=RG-jVILa4gE&t=1760s), [화면](evidence/video_frames/v02_29m20s_protest.jpg) | 시위 후 조미미 대화, 한 선택 툴팁 긴장 3·승객 3 손실·반발 2 | 1.0.1의 선택지 표시. 그 선택을 실제로 눌렀다고 툴팁만으로 확정하지 않음 |
| E02 | [41:50](https://www.youtube.com/watch?v=RG-jVILa4gE&t=2510s), [화면](evidence/video_frames/v02_41m50s_victory.jpg) | Frost 1 승리, 55일, 행복 131,409, 승객 36, 속도 107%, 결과 경로 | 유물이 일부 화면을 가림. 이 한 판으로 임석대가 최순자보다 쉽다고 판단하지 않음 |
| META01 | [42:00](https://www.youtube.com/watch?v=RG-jVILa4gE&t=2520s), [화면](evidence/video_frames/v02_42m00s_meta_reward.jpg) | 생존 121·승리 33 등 항목, 보라색 동전 합계 225 | 1.0.2 이전의 보상. 최신 기본 보상과 다름 |

### 선택→비용→결과→향후 영향의 한 사례

**선택 전 상태:** 게임 내 5일 19:37, 레벨 4, 행복 1,012, 승객 9, 배치 4/4, 속도 100%, 보급품 3.

| 후보 | 화면에 표시된 효과 | 선택의 성격에 대한 해석 |
|---|---|---|
| Jury-Rigged Engine | 속도 +4%, 모든 객차 행복 산출 -6% | 이동을 즉시 강화하며 생산을 포기 |
| Rusty Nut | 속도 -8%, 210초 뒤 Clean Nut로 변신 | 현재 이동을 늦추고 미래의 속도 효과를 기다림 |
| Happiness Balloon | 모든 객차 행복 +1 | 현재 생산을 강화 |

**실제 선택:** Rusty Nut. 선택 연출과 다음 화면 아이콘을 확인했다.

**관찰된 비용·변화:** 속도는 100→92%, 보급품은 3→2, 새 유물에 210 카운터가 나타난다. 시간·행복·배치가 같아 즉시 변화를 비교하기 좋은 장면이다. 보급품 소비가 보급 카드 발동·후보 선택 중 어느 단계의 규칙인지는 추가 입력 관찰이 필요하다.

**향후 영향:** Clean Nut의 속도 +4%가 사전에 표시된다. **해석:** 현재 구간의 체류 시간과 이후 구간의 도달 시간을 교환하는 선택이다. 실제 변신 타이머 종료·당시 속도·추가 생산·목적지 도달 차이는 확인하지 않았다. 세 후보 중 무엇이 최적이었는지도 결론 내리지 않는다.

이 정도로 비용과 시간의 성격이 다른 후보라면, 카드 이름이 달라서가 아니라 선택 기준이 달라서 비교가 생긴다. 서부 화물 선택에서도 현재의 수익과 다음 구간의 시간을 함께 읽게 할 수 있다.

## V03 — 얼리 액세스 최순자, 0.8.3-build-1

출처: [Mr. Heo 의 게임 기록소 영상](https://www.youtube.com/watch?v=P6fGJeUs3jM), 2026-04-25 업로드, 82:32. 최종 메뉴에서 **v0.8.3-build-1** 확인.

| 기록 | 시각·근거 | 직접 관찰 | 해석 제한 |
|---|---|---|---|
| C02 | [00:00](https://www.youtube.com/watch?v=P6fGJeUs3jM&t=0s), [화면](evidence/video_frames/v03_00m00s_conductor.jpg) | 최순자 초기 특성: 배치 가능 +2, 빈민칸 2개, 승객 4명 | 얼리 액세스의 초기 조건 |
| E03 | [81:00](https://www.youtube.com/watch?v=P6fGJeUs3jM&t=4860s), [화면](evidence/video_frames/v03_81m00s_victory.jpg) | 기본 난이도 승리. 51일, 행복 5,110, 승객 27, 속도 174%, 총 행복 75,133 | 다른 판과 속도·총 산출을 단순 비교해 효율 순위를 매기지 않음 |
| SHOP01 | [81:40](https://www.youtube.com/watch?v=P6fGJeUs3jM&t=4900s), [화면](evidence/video_frames/v03_81m40s_unlock_shop.jpg) | 상품 구입 후 다음 여정에서 등장, 페이지 전부 구매 시 특전, 보라색 동전 가격 | 해금과 즉시 판 안 획득의 차이를 보여 줌. 최신 가격표로 사용하지 않음 |
| BUILD02 | [82:30](https://www.youtube.com/watch?v=P6fGJeUs3jM&t=4950s), [화면](evidence/video_frames/v03_82m30s_build.jpg) | 제목 화면 하단 v0.8.3-build-1 | 제목 날짜보다 강한 버전 근거 |

87개 주기 프레임 중 V03은 41개다. 이 관찰에서 객차·유물 선택, 결단, 사건, 지도와 주행의 반복이 보였다. 모든 선택 비용과 결과를 연속 입력 기록처럼 복원하지 않았다.

## 세 여정의 결과를 어떻게 읽을 것인가

| 사례 | 버전·난이도 | 생존 일수 | 남은 행복 | 속도 | 읽을 수 있는 것 |
|---|---|---:|---:|---:|---|
| V01 | 미확인·일반 | 53 | 447 | 113% | 작은 잔여 여유로도 해당 목적지 승리 가능 |
| V02 | 1.0.1·Frost 1 | 55 | 131,409 | 107% | 추가 위험이 있는 차장에서도 성장한 구성과 승리 화면 존재 |
| V03 | 0.8.3·기본 | 51 | 5,110 | 174% | 과거 판에서도 서로 다른 구성·속도·경로가 결과에 기록 |

빌드·시나리오·난이도·플레이어·경로가 다르다. 이 표로 차장 난이도, 업데이트의 개선 폭, 플레이어 숙련, 특정 객차의 승률을 계산할 수 없다. 비교할 수 있는 것은 결과 화면의 항목과 서로 다른 판의 존재다.

## 다음 관찰에 사용할 기록 양식

```text
자료 ID / 게임 빌드 / 난이도 / 영상 시각 또는 직접 플레이 시각
상태: 자원, 승객, 객차·층, 시너지, 유물·상태, 경로
제시된 선택: 각 후보의 즉시·지연 효과, 선택 가능 조건
실제 입력: 무엇을 눌렀는가 / 확인하지 못했는가
즉시 비용과 결과: 전후 상태를 따로 기록
지연 결과: 발동 시각, 새 상태, 제거·변환
다음 선택의 변화: 새로 가능한 행동, 사라진 행동
해석: 왜 유리했을 수 있는가
미확인: 다른 효과·시간·입력이 섞여 인과를 확정할 수 없는 부분
```

“선택했다”와 “선택지에 마우스를 올려놓았다”를 구분하는 것이 중요하다. 다음 직접 플레이에서 채워야 할 질문은 [11의 Q01~Q12](11_SOURCES.md)에 정리했다.
