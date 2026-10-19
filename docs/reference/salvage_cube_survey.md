# 분해 큐브 · 자동분해 규칙 · 조합 — 참고작 조사

> 상태: **조사 완료** (2026-10-18) · TBH 큐브 · 자동분해 규칙 언어 · 큐브 · 조합 · 레벨형 제작 시설
> 목적: 사용자 질문 셋 — ①자동분해를 잘 만드는 법 ②분해를 큐브로 만들고 큐브 레벨을 둘까(TBH) ③아이템 조합을 만들까. 쓰인 곳: [salvage_draft.md](../game_design/salvage_draft.md) · [GAME_DESIGN.md](../game_design/GAME_DESIGN.md) §10 「분해의 남은 설계」
> 짝 문서 — [salvage_mode_survey.md](salvage_mode_survey.md)(무엇이 나오고 무엇을 거르나 · 2026-09-16) · [salvage_interaction_survey.md](salvage_interaction_survey.md)(어떤 조작으로 하나 · 2026-09-21) · [crafted_item_survey.md](crafted_item_survey.md)(제작품 구조 · 2026-10-10). 그 문서들이 다룬 게임은 여기서 다시 조사하지 않았다 — **이 문서는 빈 곳만 메운다**
> ⚠ 원전 수치 · 규칙은 그 작품의 것이다 — 본작 SSOT 아님, `src/data/*.csv` 로 옮기지 않는다. 조사자 의견은 **제안이지 결정이 아니다**. `[확인]` = 출처로 확인 · `[추정]` = 조사자 해석 · `[기억]` = 웹으로 다시 확인하지 못함 — 인용 전에 확인한다

목차 — 1 TBH 의 큐브 · 2 자동분해 규칙 언어 · 3 큐브 · 조합 · 4 레벨형 제작 시설 · 5 확인 못 한 것 · 6 출처

---

## 1. TBH: Task Bar Hero 의 「Hero-dric Cube」

Steam 3678970 · Nugem Studio · 2026-05-27 · 무료 · 작업표시줄 3인 파티 자동전투 루팅 (형태가 본작과 가장 가깝다 — [steam_market_target_survey.md](steam_market_target_survey.md)). 출처는 전부 비공식 위키 · 가이드(2026-06~07)이고 **위키끼리 수치가 어긋나는 곳이 있다.**

### 1-1. 구조

- **큐브는 분해 전용이 아니다** — 8기능 장치다 [확인]. 기본 둘(Alchemy · Synthesis) + 레벨 해금 여섯
- **분해(Alchemy)는 재료를 안 준다** — **골드 + 큐브 EXP** 뿐이다 [확인]. 재료 환원 경로가 없고, 다른 처분 경로는 Steam 마켓 판매 하나다
- 해금 — 영웅 하나가 Lv4(약 15분)면 열린다 · Tab 영웅 메뉴의 큐브 아이콘 · 드롭다운으로 모드 선택 [확인]
- 투입 — 우클릭 · 드래그 · **Auto Fill** 셋 · 확인 버튼으로 일괄 처리 [확인]

### 1-2. 큐브 레벨

- 최대 Lv100 [확인 — taskbarhero.wiki]
- **EXP 공식** — ⌊등급 × 아이템 레벨 × 장비 종류 × 아이템 타입⌋ × **레벨 매치** × (1 + 큐브 EXP%) [확인]
  - 등급 기본 EXP 는 단계마다 약 3배(Common 2 → Rare 18 → Legendary 54 → … Cosmic 71,089)
  - 장비 종류 계수 — 부츠 ×0.7 ~ 목걸이 ×4 · 재료 ×12 · 장비 ×1
  - **레벨 매치** — 큐브 레벨보다 한참 높은 아이템은 EXP 가 거의 없다 · 커뮤니티 권장은 큐브 레벨 ±10 아이템
  - 룬 트리 · 펫이 큐브 EXP% 를 더한다(한 가이드는 최대 +80%)
- 누적 필요 EXP — Lv10 4,955 · Lv25 306,305 · Lv50 8.83M · Lv100 234.8M [확인]
- EXP 를 주는 조작 — Alchemy · Synthesis · Crafting · Offering (Alchemy 와 Synthesis 는 같은 아이템 기준 EXP 가 같다 — Steam 토론 실험)
- **레벨이 여는 것 = 기능 해금 + 합성 티어** — 수율 · 용량이 느는지는 못 찾았다 [확인 못 함]

| 큐브 레벨 | 여는 기능 |
|---|---|
| 기본 | Synthesis(합성) · Alchemy(분해) |
| 5 | Crafting — 부위를 고르면 재료 레벨 티어별 확률표로 랜덤 장비 하나 |
| 8 | Decoration — 소켓 · 옵션 부여 |
| 10 | Removal(Extraction) — 큐브로 붙인 것 제거 · 골드 소모 · 재료는 안 돌아온다 |
| 15 | Engraving — 스탯 범위 랜덤 부여 |
| 20 | Offering — 기념 코인 → 랜덤 장비 |
| 25 | Inscription — 옵션 부여 |

해금표는 위키 둘과 games.gg 가 일치한다. 기능마다 일회성 해금 골드가 붙는다는 위키도 있다.

### 1-3. 산출 · 합성

- Alchemy 골드 — EXP 와 같은 계수를 쓰되 **레벨 매치가 없다** → 어느 레벨이든 제값에 팔린다 [확인]
- **Synthesis — 같은 등급 9개 → 상위 1개** [확인]
  - 결과 아이템 레벨은 재료가 아니라 UI 의 레벨 범위 설정이 정한다 · 범위는 큐브 레벨과 함께 넓어진다(티어 1 큐브 Lv1 무료 ~ 티어 8 큐브 Lv70 · 10,000골드)
  - 성공 · **대성공**(두 단계 상승) — Common→Uncommon 95%(대성공 4.8%) · Rare→Legendary 98%(대성공 2.4%) · Immortal 이상은 제자리 확률이 있다(Divine 91% 제자리)

### 1-4. 자동 · 보호 · UX 사고

- **Auto Fill 에 필터가 없다** — 인벤토리의 아무것이나 가져오므로 확인 전에 목록을 보고 지킬 것을 빼야 한다 [확인]
- 보호는 **Alt + 좌클릭 잠금 하나** · 잠근 것은 Auto Fill 이 건너뛴다 · 장착 직후 잠그라고 권한다 [확인]
- **큐브 창은 열 때마다 Synthesis 로 돌아간다** — Alchemy 로 바꾸는 걸 잊으면 팔려던 장비가 합성된다. **가장 흔한 혼란**으로 꼽힌다 [확인]
- 등급 · 레벨 · 부위 조건의 자동 규칙, 오프라인 자동 분해는 못 찾았다 — 없다고 보는 쪽이 맞다 [추정]

### 1-5. 반응 · 이력

- Steam 평가 Mixed — 원인은 마켓 · 서버 · 봇 단속이지 큐브가 아니다 [확인]. 「Alchemy 는 가장 덜 유용한 큐브 기능」이라는 평 [확인]
- 마켓에 올리면 큐브로 붙인 스탯이 영구히 지워진다는 경고 [확인]
- 흐름 — 고등급은 마켓에 팔고 나머지는 큐브에서 EXP · 골드로 태운다 [추정]
- v1.00.07(2026-06-01) Type B 장비 합성 · 드롭 · 거래 제거 · v1.01.00(2026-07-22) 고등급 거래 재개 · Decoration · Engraving · Inscription 저항 옵션 상향 [확인]

### 1-6. 조사자 해석 [추정]

1. 큐브 레벨의 본질은 **태운 양(EXP)으로 기능을 여는 사다리**다 — 수율이 아니다
2. 레벨 매치는 「진행 단계에 맞는 아이템을 넣어라」를 강제한다 — 아무 쓰레기나 넣어 키우는 흐름을 막지만 숙제가 될 수 있다
3. UX 불만의 뿌리는 셋 — 필터 없는 Auto Fill · 잠금 하나뿐 · **녹이는 기능과 바꾸는 기능이 한 화면의 모드로 겹친다**
4. 레벨 100 · 수억 EXP 는 무한 수직 사다리다

---

## 2. 자동분해 규칙 언어

로컬 짝 문서가 이미 다룬 것 — Lootun(타입별 등급 문턱 · ilvl 상한 · 신규만 · Always Auto Scrap) · 로스트아크(등급 · 종류 조건 저장) · 버섯커 키우기(등급 하한 자동 판매 · 더 좋으면 멈추고 묻는다) · 에픽세븐 · RAID · Melvor · Loop Hero · D3 · D4 Junk/Favorite · 시즌4 사고 · PoE · Last Epoch 첫 매치 정지 · D2R · Torchlight Infinite · 던파. 아래는 **새로 더한 것**이다.

### 2-1. Last Epoch 루트 필터 [확인 — Maxroll]

- **조건 5종** — Affix · Class Requirement · Level · Rarity · Item Type
  - Affix 고급 옵션 — 「나열한 접사 중 N개 이상」 · 「접사별 티어 합 / 개수」
  - 한 규칙 안의 조건은 전부 AND · 조건 종류는 규칙당 하나
- **동작** — Show / Hide / Recolor + Emphasize
- **평가** — 위에서 아래로, 위 규칙이 이긴다 · 드래그로 순서를 바꾼다 · **필터당 규칙 상한 75개**
- **레벨 구간 활성** — 규칙마다 「캐릭터 레벨 15~30 에서만」
- **레벨 상대 조건** — Below Level · Above Level · 「캐릭터 레벨보다 낮은 최대 레벨」 · 「쓸 수 있는 가장 높은 레벨」 (이름은 Maxroll 서술이 유일한 근거 · 포럼에서는 「캐릭터 레벨보다 20 낮은 무기 숨김」을 손으로 올려 가며 쓴다는 보고)
- 숨김 = 이름표만 숨는다 · 드롭은 그대로 · 자동 판매 · 분해와의 연동은 없다
- 공유 — XML 붙여넣기 · 파일 · Maxroll 빌드 플래너가 필터를 만들어 준다(사실상 진입로)
- **실패 사례** — 맨 아래 catch-all Hide 가 위 규칙을 가려 「전부 숨는다」 · 「레벨 50 미만 전부 숨김」이 거의 모든 드롭을 숨김. 권장 구조 = **맨 위 보호 Show(Unique · Set · Exalted) · 맨 아래 catch-all Hide**

### 2-2. PoE NeverSink — 손잡이 하나 [확인]

- 엄격도 7단계 · 신규는 Semi-Strict(PoE1 은 Regular) · 성장하면 한 칸씩 올리라고 권한다
- 개인 예외는 파일 맨 위 override 섹션
- 불만 — Semi-Strict 는 어수선하고 Strict 는 쓸 만한 레어까지 숨긴다 · 중간 단계 요청. 게임이 변하면 단계 이름의 뜻이 밀린다(PoE1 Soft = 옛 Regular)
- 필터는 표시 전용이라 아이템이 사라지지 않는다 — **방치형 자동 처분과 안전 모델이 다르다**

### 2-3. Diablo 4 — 표시와 처분이 갈라진 틈 [확인 — 2차]

- 개발진 「자동 분해는 넣지 않는다」 · 분해를 제작 요건에서 빼는 쪽으로 간다
- 숨긴 아이템은 상호작용이 안 된다 → 분해 재료를 못 줍는다는 우려
- 필터 범위는 장비만(월드 · 인벤토리 · 창고 · 상인) — 재료 · 보석 · 화폐는 안 건드린다
- 불만 「필터에 걸린 것이 자동 분해되지 않고 회색으로 남는다」 vs 반박 「필터의 일은 숨기는 것」
- [추정] 표시 규칙과 처분 규칙을 **한 규칙 언어로 묶으면** 이 틈이 안 생긴다

### 2-4. 그 밖 [확인]

- **오딘: 발할라 라이징** — 가방에서 등급을 골라 일괄 분해 · 「분해한 장비는 복구할 수 없다」 명시
- **Revival of Addiction**(인디 방치형) — 기본 자동 판매가 초반 키울 레어를 팔고 후반엔 안 쓰는 것이 인벤토리를 채웠다는 불만 → 「**부위별 최고 하나만 남기고 전부 판매**」 요청을 개발자가 v29 에 반영
- **Idle Beast Hunter** — 장비 잠금 · 인벤토리 필터 · 「체크하면 신규 장비 자동 판매」(옵트인)를 한 번에 도입
- Torchlight Infinite — 자동 줍기는 펫(Pactspirit) 등급에 묶이고 표시 필터와 별개 · 자동 분해 설정은 못 찾았다

### 2-5. 유형 분류 [추정]

| 유형 | 예 | 장점 | 방치형에서의 약점 |
|---|---|---|---|
| A. 엄격도 손잡이 하나 | NeverSink | 학습 비용 최저 · override 로 보완 | 왜 걸렸는지 안 읽힌다 · 패치로 단계 뜻이 밀린다 |
| B. 등급 문턱 | Lootun · 로스트아크 · 오딘 · **본작 현행** | 즉시 읽힌다 | 좋은 레어와 쓰레기 레어를 못 가른다 |
| C. 점수 · 장착품 대비 | 에픽세븐 · 버섯커 | 성장 따라 저절로 움직인다 | 점수 정의가 틀리면 전부 틀린다 |
| D. 순서 있는 규칙 목록 | Last Epoch · PoE | 표현력 최고 · 예외 처리 | 순서 실수 한 번에 「전부」 · 상한 필요 · 템플릿 의존 |
| E. 부위별 최고 N개 | Revival of Addiction · Soda Dungeon 2 | 등급 무관 · 방치형에 직관적 | 서로 다른 빌드용 장비를 한 부위에서 못 지킨다 |
| F. 혼합 | 문턱 + 잠금 + 유니크 제외 | 사고 대부분을 막는다 | 설계 면적 |

### 2-6. 실패 모드와 해법 [추정]

1. **원하던 것을 녹였다** — 잠금(불완전하면 사고 — D4 시즌4) · 투자한 장비 자동 제외 · 신규 유입에만 적용 · 보호 규칙을 맨 위에 고정 · 유니크 · 첫 획득 보류 · 되돌리기(사례 드묾 — 오딘은 복구 불가 명시)
2. **필터가 복잡하다** — 손잡이 하나를 기본으로, 고급 규칙은 접어 둔다 · 템플릿
3. **성장할 때마다 다시 맞춰야 한다** — 레벨 상대 조건 · 장착품 대비 · 레벨 구간 활성
4. **가방이 차 보상을 잃는다** — 자동 규칙이 가방 참을 막는 것이 본체
5. **숨김 = 못 줍기**(D4) — 숨김과 분해를 같은 규칙에 두면 풀린다

### 2-7. 훔칠 만한 것 [추정]

- **부위별 최고 N개 · 「모든 축에서 확실히 못한 것만」 처분** — 비교가 안 되는 것(다른 옵션 특화)은 남긴다
- **보호 맨 위 · catch-all 맨 아래를 UI 가 고정** — 순서 실수를 못 하게
- **레벨 구간 활성** — 「챕터 1~2 에서만」 같은 규칙이 성장하면 저절로 꺼진다
- **미리보기 · 최근 분해 로그** — 복구는 못 해도 사고를 알아챈다
- **멈추고 묻기**(버섯커) → 방치형에서는 질문을 리포트에 쌓는 쪽
- 영웅 · 빌드별 필터 — 사례를 못 찾았다. 파티 게임만의 자리일 수 있다

---

## 3. 큐브 · 조합

로컬이 이미 다룬 것 — D2 큐브 레시피 · 크래프트(diablo2/02_items.md §6) · Hero Siege 큐브 · 다이스 · 감바(herosiege/02_items.md §7) · D4 Lord of Hatred 큐브(diablo4/02_items.md §7-2 · §7-3 — 유니크 → 참 · 유니크 3 → 새 유니크) · D4 레전더리 분해 → 어스펙트 코덱스 · Lootun Scrapper · Artisan's Hall · Dragon Cliff Furnace Combine 3→1 · 젬 3:1.

### 3-1. 게임별 [확인 — 출처 §6]

- **D2 호라드릭 큐브** — 룬 3 → 다음 룬(중간부터 보석 동반) · 보석 3 → 상위 · 소켓 추가 · 품질 업그레이드(노멀 → 익셉셔널) · 크래프트. **레벨 없음 · 레시피 처음부터 전부 열림(비밀은 위키) · 고정 출력**. 분해가 없고 인벤토리 칸이 「줍지 않기」를 강제한다. 1.10 에서 룬 사다리를 늘렸다 · 고룬은 사실상 거래 화폐 [기억]
- **D3 카나이의 큐브** — 전설 파워를 **추출**하면 무기 · 방어구 · 장신구 칸 셋에 아이템 없이 적용(값은 최대치로 저장) · 레시피: 레어 → 같은 종류 랜덤 전설 · 전설 스탯 리롤(고대화 1/10) · 재료 · 보석 · 세트 변환. 쓰레기 전설이 **수집 가치**가 된다 · 리롤은 재료 대량 + 확률이라 슬롯머신 느낌 [추정]
- **D4 호라드릭 큐브(Lord of Hatred · 2026)** — Add Affix · Unique Power Reroll · Upgrade to Unique · 3 to 1 Transmutation · Chaotic Reroll · Upgrade to Legendary · Transfigure Item · 재료 Primordial Dust · 레벨 없음. **중복 유니크를 업그레이드 재료로** 만든다 (상세 입출력은 403 으로 못 읽음)
- **PoE 벤더 레시피** — 부위별 레어 한 벌(아이템 레벨 60~74)을 팔면 카오스 오브 · **쓰레기를 화폐로 바꾸는 조합** · 한 벌 맞추기가 숙제가 된다 [추정]
- **Grim Dawn 변환**(Forgotten Gods) — 같은 세트 안(비쌈 · 확정) / 랜덤 세트(쌈) · 목적은 세트 완성
- **Last Epoch** — Rune of Shattering(아이템 파괴 → 접사 샤드, 분해의 한 종류) · Glyph · Forging Potential(만질수록 줄어 리롤 고리를 막는다) · 레전더리 = **유니크 + Exalted 접사 넷**을 Temporal Sanctum 끝에서 합침
- **Torchlight Infinite** — 결정론 제작(Flame Fuel · Prototype Crafting + Targeted Processing)
- **Epic Seven** — 촉매를 낮은 등급 N → 상위 1 교환(비율은 출처마다 다름)
- **Summoners War** — +12 이상 룬의 부옵션 하나를 Enchanted Gem 으로 교체(하나만)

### 3-2. 입력 · 출력 비교

| 계열 | 입력 | 출력 | 푸는 문제 | 위험 |
|---|---|---|---|---|
| D2 큐브 | 같은 것 N | 고정 | 중복 · 줍기 가치 | 수직 사다리 |
| D3 큐브 | 전설 1 + 재료 | 파워 영구 해금 | 수집 · 쓰레기 가치 | 리롤 도박 |
| D4 큐브 | 아이템 + 재료 | 접사 · 등급 변경 | 목표 파밍 · 중복 유니크 | 재료 병목 |
| PoE 벤더 | 부위별 한 벌 | 고정 화폐 | 쓰레기 환금 | 한 벌 숙제 |
| GD 변환 | 같은 세트 | 세트 조각 | 세트 완성 | 비용 |
| TBH 합성 | 같은 등급 9 | 상위 1(대성공 있음) | 인벤토리 정리 | 레벨 게이트 · 숙제 |
| E7 촉매 | 낮은 것 N | 높은 것 1 | 쓸모없는 하위 재료 | 교환비 |

### 3-3. 조합의 다섯 갈래 [추정]

| 갈래 | 예 | 장점 | 본작에 비춘 위험 |
|---|---|---|---|
| (1) N개 합쳐 올리기 | D2 룬 · TBH 9→1 · E7 촉매 | 중복 · 잡템이 쓸모가 된다 | 수직 사다리 · 랜덤이면 도박 · 「모아서 합치면 되지」가 드롭의 기쁨을 깎는다 |
| (2) 고정 레시피 변환 | PoE 벤더 · 룬워드 | 결과가 읽힌다 | 위키 의존 · 정답 레시피로 수렴 |
| (3) 추출 · 수집 | D3 카나이 · D4 코덱스 | 잡템 → 영구 해금 · 수평 성장 | 빌드 상한이 필요(D3 는 칸 셋) |
| (4) 리롤 · 개조 | D3 Kulle · D4 Chaotic Reroll · LE Glyph | 목표 파밍 | 본작 「재굴림 없음」 · 「같은 장비를 계속 다시 굴리는 고리 금지」와 충돌 |
| (5) 목표 제작 | 바탕 + 재료 · GD 블루프린트 | 결정론 | 본작은 이미 「도안 + 바탕 장비 + 재료」로 채택(10-10) |

- **분해는 재료를, 조합은 아이템을 돌려준다.** 같은 쓰레기에 출구가 둘이면 한쪽이 죽는다 — 조합은 **분해로는 못 하는 일**을 해야 산다
- 인벤토리 압박이 약한 방치형은 D2 처럼 「줍지 않기」를 강제하지 못해 조합이 선택 사항으로 남기 쉽다

---

## 4. 레벨형 제작 시설

| 게임 | 무엇이 올리나 | 레벨이 주는 것 | 비고 |
|---|---|---|---|
| **TBH 큐브** [확인] | 태운 양(사용 EXP) | 기능 해금 · 합성 아이템 레벨 범위 | Lv100 · 수억 EXP · 레벨 매치 |
| Lootun 건물 [로컬] | 재료 + 코인(랭크업) | 칸 · 상한 · 자동 보충 | 랭크업 재료가 다음 티어 장비 분해에서 나온다 · 사용 EXP 없음 |
| WoW 마법부여 분해 [확인] | 직업 스킬 | 분해 가능한 아이템 레벨 | 클래식은 요구 없음 · 이후 확장에서 생겼다는 출처 |
| **GW2 분해 키트** [확인] | 골드로 산 도구 티어 | 희귀 재료 확률 · 업그레이드 회수율 | 상위 키트는 신비 포지에서 **합성** · 도구 티어가 곧 수율 |
| Melvor 마스터리 [부분 확인] | 아이템별 사용 XP → 풀 | 풀 체크포인트에서 스킬 전체 보너스 | 풀을 유지해야 보너스가 유지 |
| Albion 정제 전문화 [약한 확인] | 사용 fame | 포커스 비용 · 품질 | 비공식 출처뿐 |

[추정] 올리는 법은 셋(사용 XP · 재화 투자 · 도구 합성)이고, 레벨이 주는 것은 거의 언제나 **범위**(무엇을 처리할 수 있나 — 수평)와 **수율**(얼마나 — 수직)이다.

---

## 5. 확인 못 한 것

- TBH — 나무위키 · 인벤 · 디시 · Reddit 직접 소스 · 큐브 자체의 호불호 · 수율이 레벨로 느는지
- Last Epoch 레벨 상대 조건의 정확한 이름과 동작 — Maxroll 서술이 유일한 근거
- 모바일 MMO 자동분해 체크박스(등급 / 직업 아님 / 전투력 낮음 — 리니지W · 메이플M) · Undecember · Grim Dawn 자동 처분 · Hero Siege 큐브 안 분해 · 보석세공 레벨
- PoE 품질 · 5동명 레시피 · Torchlight 2 변환기 · 한국 MMO 합성 확률과 불만 · AFK Arena · Dragon Cliff 용광로 레벨 · Shakes & Fidget · Idle Heroes · Titan Quest
- D4 관련 Icy Veins · mobalytics 페이지는 403 — 검색 요약으로만 확인

## 6. 출처

TBH
- [taskbarhero.wiki/cube](https://taskbarhero.wiki/cube) · [taskbarhero.org/en/cube](https://taskbarhero.org/en/cube/)
- [games.gg 연금술 가이드](https://games.gg/es/tbh-task-bar-hero/guides/gu%C3%ADa-de-alquimia-en-tbh-task-bar-hero-vende-objetos-r%C3%A1pidamente/) (2026-06-11) · [games.gg 큐브 공물 가이드](https://games.gg/tbh-task-bar-hero/guides/tbh-task-bar-hero-cube-offering-guide/) (2026-06-22)
- [mobalytics 합성](https://mobalytics.gg/gamebase/guides/task-bar-hero-cube-synthesis) · [mobalytics 제거](https://mobalytics.gg/gamebase/guides/task-bar-hero-cube-removal)
- [Steam 토론 — Synthesis vs Alchemy EXP](https://steamcommunity.com/app/3678970/discussions/0/562533727113059155/)
- [gameplay.tips 큐브 레벨](https://gameplay.tips/guides/tbh-task-bar-hero-how-to-level-up-your-cube-efficiently.html) · [roonby 큐브 전 기능](https://roonby.com/2026/06/12/task-bar-heroes-cube-system-explained-guide-to-every-feature-and-how-it-works/amp/)
- [taskbarhero.wiki v1.01.00](https://taskbarhero.wiki/news/higher-grade-item-trading-resumed-balance-update-ver-1-01-00) · [taskbarherowiki 패치노트](https://taskbarherowiki.com/patch-notes)
- [allthings.how 마켓 판매 시 큐브 스탯 삭제](https://allthings.how/tbh-task-bar-hero-steam-market-selling-cube-wipe-warning/) · [commonsensegamer](https://commonsensegamer.com/?p=41530) · [Game*Spark](https://www.gamespark.jp/article/2026/06/06/167529.html)

자동분해
- [Maxroll Last Epoch 필터 가이드](https://maxroll.gg/last-epoch/resources/loot-filter-guide) · [Heavy'z 필터 스레드](https://forum.lastepoch.com/t/1-2-heavyz-casual-loot-filters-for-all-classes-v5/25176/238)
- [Maxroll PoE2 FilterBlade](https://maxroll.gg/poe2/news/filterblade-launch-for-path-of-exile-2) · [NeverSink 필터](https://gitee.com/agg/NeverSink-Filter)
- [Icy Veins — D4 자동 분해 없음](https://www.icy-veins.com/d4/news/no-auto-salvage-in-diablo-4-loot-filters-should-players-be-worried/) · [mein-mmo D4 필터](https://mein-mmo.de/en/diablo-4-loot-filter-sorgt-direkt-fuer-meckereien,1551673)
- [Maxroll Torchlight Infinite 필터](https://maxroll.gg/torchlight-infinite/resources/creating-and-editing-item-filters)
- [카카오게임즈 오딘 FAQ — 일괄 분해](https://kakaogames.oqupie.com/portals/2952/articles/73417)
- [itch.io Revival of Addiction 코멘트](https://itch.io/post/16632840) · [Idle Beast Hunter devlog](https://itch.io/devlog/675681/huge-update-bugfix-gear-rework.amp)

큐브 · 조합 · 시설
- [Diablo Wiki D2 큐브 레시피](https://diablo2.diablowiki.net/Cube_recipes) · [Almar's D2 업그레이드](https://almarsguides.com/Computer/Games/Diablo2/Crafting/HoradricCube/WeaponsandArmor/Upgrading/)
- [Icy Veins D3 카나이 큐브](https://icy-veins.com/d3/kanais-cube-guide) · [DiabloWiki 카나이](https://diablowiki.net/Kanai's_Cube)
- [mein-mmo D4 큐브 레시피](https://mein-mmo.de/en/diablo-4-horadrim-cube-all-recipes-and-what-they-do,1564897/) · [DiabloBytes D4 큐브](https://www.diablobytes.com/diablo-iv/news/2026-04-29-5-tips-on-how-to-use-the-horadric/)
- [Maxroll PoE 벤더 레시피](https://maxroll.gg/poe/resources/vendor-recipes) · [Primagames Grim Dawn 변환](https://primagames.com/news/grim-dawn-adding-transmutation-to-help-set-completion)
- [Icy Veins Last Epoch 제작](https://www.icy-veins.com/last-epoch/crafting-guide) · [Maxroll Torchlight Infinite 제작](https://maxroll.gg/torchlight-infinite/resources/crafting-in-torchlight-infinite)
- [Game8 Epic Seven 촉매](https://game8.co/games/Epic-Seven/archives/275505) · [Summoners War Enchanted Gem](https://summonerswar.fandom.com/wiki/Enchanted_Gem)
- [GW2 Salvage Kit](https://wiki.guildwars2.com/wiki/Salvage_Kit) · [WoW 분해 표](https://www.wow-professions.com/cataclysm/disenchanting-table-cataclysm-classic)

---

*마지막 업데이트: 2026-10-19*
