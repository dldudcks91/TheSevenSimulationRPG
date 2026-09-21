# 아이템 분해 모드 — 교차 참고작 조사

> 목적: 본작의 **아이템 분해 모드 개편**에 앞서, 방치형 · 수집형 · 파밍 ARPG 가 분해 · 판매 · 자동 처리 · 보호 장치 · 가방 가득 참을 어떻게 정리하는지 모은 **후보 창고**.
> **짝 문서 — [salvage_interaction_survey.md](salvage_interaction_survey.md)** [2026-09-21]: 「분해를 **어떤 조작으로** 하게 할 것인가」(트리거 · 자리 · 일괄 · 확인 · 성장 축 · 분해가 아닌 형태)는 그쪽이 든다. 이 문서는 **무엇이 나오고 무엇을 거르는가**를 든다.
> 조사 방식: 2026-09-16 · 네 갈래 병렬 조사 — ① 본작 현행(기획 · 화면 · 코드) ② Lootun · PC 방치형 ③ 모바일 방치형 · 수집형 ④ 파밍 ARPG. `docs/reference/<게임>/` 기존 전수 조사분을 먼저 읽고 웹(공식 패치노트 · 위키 · Steam 커뮤니티 · Reddit · 인벤 · 나무위키 · 가이드 사이트)으로 보강했다. 게임별 절의 **[로컬]** = 기존 폴더 문서, **[웹]** = 이번 조사에서 새로 확인.
> ⚠ **이 문서는 조사와 후보이지 결정이 아니다.** 확정은 [GAME_DESIGN.md §9](../game_design/GAME_DESIGN.md) 한 줄 + [item_design.md](../game_design/item_design.md) 가 갖는다. §6 「본작에 비춰 짚을 곳」은 조사자 의견이다.
> ⚠ 인용된 수치는 **그 게임의 것**이다 — `src/data/*.csv` 로 옮기지 않는다. 본작 값은 키 참조로만 적는다.
> ⚠ **「확인 못 함」은 「기능이 없다」가 아니다** — 특히 모바일 게임은 설정 화면이 문서화되지 않아 공백이 많다. 채택 전에 게임 내 화면으로 재검증한다.

---

## 목차

| § | 내용 |
|---|---|
| 1 | 본작 현행 — 조사 시점(2026-09-16) 스냅샷 |
| 2 | 비교표 |
| 3 | 공통 패턴 |
| 4 | 게임마다 갈리는 설계 선택지 |
| 5 | 방치형으로 옮길 때 의미 있는 것 / 없는 것 |
| 6 | 본작에 비춰 짚을 곳 (조사자 의견) |
| 7 | 게임별 상세 — PC 방치형 |
| 8 | 게임별 상세 — 모바일 방치형 · 수집형 |
| 9 | 게임별 상세 — 파밍 ARPG |
| 10 | 기존 폴더 문서에 이미 있던 분해 언급 |
| 11 | 확인 못 한 것 · 신뢰도 |

---

## 1. 본작 현행 — 조사 시점(2026-09-16) 스냅샷

> 현황은 바뀐다 — 이 절은 조사 시점의 대조 기준일 뿐이다. 지금 상태는 기획서 · SCREEN_DESIGN · 코드에서 다시 확인한다.

### 1-1. 기획

- **산출물은 가루 하나** — 등급별 반환량 `[balance.csv:salvage_dust_magic]` · `[balance.csv:salvage_dust_rare]` (둘 다 `status=proposed`)
- **일반 등급 반환량은 미정** — 키를 발행하지 않아 매직 값을 따른다 ([item_design.md §5-3](../game_design/item_design.md) · 09-14 보류). **유니크 반환량은 기획서에 규정이 없다**
- **가루의 유일한 공급원 = 분해**(09-09 — 정예 · 보스는 가루를 안 뱉는다) · **유일한 소모처 = 제작**([item_design.md §7-1](../game_design/item_design.md) · 09-15). 09-03 「가루 삭제」 → 09-15 「가루 복귀」로 한 번 뒤집힌 이력이 있다
- **미확정** — 일반 반환량 · 강화 단계(+n)를 반환량에 넣는가([item_design.md §5-3](../game_design/item_design.md)) · 자동 분해가 무엇을 보호하나 · 자동 분해의 선(ilvl 하한 / 점수 하한 / 둘 다)([item_design.md §6-4](../game_design/item_design.md) · [GAME_DESIGN.md §10](../game_design/GAME_DESIGN.md) 「자동 분해의 선」)
- 「저품질 자동 분해 (Lootun Scrapper)」는 [base_expedition_design.md §2-3](../game_design/base_expedition_design.md) 분해 행에 **이름만** 있다
- **표기 자리는 이미 정해져 있다** — [item_design.md §6-3](../game_design/item_design.md): 가방 · 드롭 목록 · **자동 분해 설정** 자리의 질문은 「버릴까」이고 보여주는 것은 **점수**(+ 최대 대비)
- **판매와의 충돌 경고** — [GAME_DESIGN.md §10](../game_design/GAME_DESIGN.md) 상단 행: 특수상단이 장비를 되사면 「잉여 장비 → 골드」 경로가 둘이 되어 분해가 죽는다

### 1-2. 화면 ([SCREEN_DESIGN.md](../client/SCREEN_DESIGN.md) §3 · §4-3 · §6)

- **진입** — 별도 화면이 아닌 **토글**. 캐릭터 탭 가방 상단(장비 갈래일 때만)과 리포트 상세 「획득 장비」 칸 옆에 **서로 독립된 토글 두 개**(가방 것을 켜 둔 채 리포트에서 오클릭하는 사고를 막으려 분리)
- **선택** — 개별 클릭뿐. 다중 선택 · 일괄 · 등급 필터 없음. 재료 갈래에는 토글이 안 뜬다
- **보호** — 착용 중 장비는 분해 불가(창고 것은 된다). 잠금 · 즐겨찾기 없음. 확인창 없음 — 「토글 1회 + 클릭 1회」를 §3 「되돌릴 수 없는 행동은 두 번 누르게 한다」의 구현으로 본다. 되돌리기 없음
- **결과** — 플래시 「분해 → 가루 +n」. 리포트에서는 분해된 칸이 흐린 빈 칸으로 남는다(그 런이 준 것은 지난 사실)
- **분해 전용 ADR 은 없다** — 걸쳐 있는 ADR: 0026 · 0063 · 0086 · 0101 · 0103 · 0113 · 0133

### 1-3. 코드

- `src/game_logic/item.js` `salvageDust` — `rare` 면 레어 값, **그 밖(일반 · 매직 · 유니크)은 전부 매직 값**. 기획이 비워 둔 자리(일반 · 유니크)를 else 분기가 메우고 있다
- `src/game_logic/state.js` `salvage(state, itemUid)` — 가방 · 창고의 **단일 아이템**만. 착용 중이면 `missing`. **일괄 · 자동 분해 함수는 없다**
- `src/ui/app.js` — 가방 토글 `state.salvageMode` · 리포트 토글 `state.repSalvage`. 둘 다 확인 없이 `salvage` 를 바로 호출
- `src/ui/i18n.js` — `ch.salvageMode` · `ch.salvageHint` · `ch.salvaged` · `res.dust` · `rep.salvage` (ko/en 갖춤)

### 1-4. 가방 가득 참 · 오프라인 · 자동

- **가방이 차면 원정 드롭은 그냥 버려진다** — 창고로 흘리지 않고, 가루도 남기지 않는다. 리포트에 버린 개수만 표시([item_design.md §1](../game_design/item_design.md) 「가방」)
- **오프라인 장비 드롭은 아직 없다** — 09-07 「장비 획득을 원정에 묶지 않는다(오프라인 활동에서도 장비가 나온다)」는 방향만 있고 미구현. 구현되면 분해 대상이 오프라인에 쌓이는 경로가 생긴다
- **자동 분해는 없다**

---

## 2. 비교표

| 게임 | 정리 수단 | 한꺼번에 | 자동 규칙 | 보호 장치 | 가방 가득 참 |
|---|---|---|---|---|---|
| **본작(현행)** | 분해(가루) | 없음 | 없음 | 착용 중 제외 | **그냥 버림** |
| **Lootun** | 분해만(판매 없음) | 확인 못 함 | 타입별 등급 문턱(+ilvl) · 아이템별 「Always Auto Scrap」 | **신규 드롭에만 적용** · 속성 잠금 | 확인 못 함 |
| Dragon Cliff | 분해 + 품질별 자동 판매 | **없음**(요청 스레드 있음) | 자동 판매만 | 확인 못 함 | 확인 못 함 |
| Melvor Idle | 판매만(분해 없음) | 잠기지 않은 것 전부 판매 | 없음(모드로 우회) | 잠금 | **그 스킬 정지**(옵션 켜면 초과분 버림) |
| Loop Hero | 넘치면 자동 파괴 | — | 상시(끌 수 없음) | 칸 순서를 옮겨 조절 | **자원으로 전환** |
| Clicker Heroes(렐릭) | 분해 | Junk Pile 일괄 분해 | 넘친 것이 Junk Pile 로 | 장착 슬롯 | Junk Pile |
| Soda Dungeon 2 | 판매 | 종류당 N개 남기고 일괄 판매 | — | 도금 장비 판매 불가 | 확인 못 함 |
| 버섯커 키우기 | 판매 | 요약 목록 일괄 판매 | 등급 하한 미만 자동 판매 | **더 좋은 장비면 멈추고 묻는다** | 요약 목록 |
| 서머너즈 워 | 판매 · 강화 재료 | 필터 후 다중 선택 | 확인 못 함 | 확인 못 함 | 확인 못 함 |
| RAID | 판매 | 다중 선택 | 연속 전투 보상에 필터(등급 · 부위 · 세트 · 옵션) | 장착품 제외 | 저장 칸 확장 |
| 에픽세븐 | 판매(골드) / 추출(재료) | 다중 선택 | ⚠ 위임 전투 결과에 필터(등급 · 장비 점수 · 부위 · 세트) | 잠금 | 확인 못 함 |
| 메이플스토리 키우기 | 무기 = 흡수 / 방어구 = 분해 | 확인 못 함 | 확인 못 함 | 확인 못 함 | 확인 못 함 |
| AFK Arena | **분해 없음** — 장비를 장비에 먹인다 | — | 장비별 옵트인 자동화 | — | — |
| AFK Journey | 재련에서 리사이클 | 확인 못 함 | 확인 못 함 | 확인 못 함 | 확인 못 함 |
| Diablo 3 | 분해 | **등급별 일괄**(일반 · 마법 · 레어) | 없음 | 레어+ 확인창 · 장착/가공품 일괄 제외 | 확인 못 함 |
| Diablo 4 | 분해 · 판매 · 추출 | Junk 일괄 · 등급별 · 전부 | 없음(필터는 표시만) | Favorite(불완전) | 확인 못 함 |
| PoE 1 / 2 | 1 = 분해 없음(벤더 레시피) / 2 = Salvage Bench | — | 표시 필터(외부 파일) | 없음 | 확인 못 함 |
| Last Epoch | 분해 룬(유료) | — | 표시 필터(규칙 상한 · 첫 매치) | 확인 못 함 | 확인 못 함 |
| Torchlight Infinite | Recycle(수동) | 수동 선택 | 자동 줍기 필터만 | 확인 못 함 | 확인 못 함 |
| Hero Siege | 판매(고등급은 파우더) | 확인 못 함 | **없음** | 확인 못 함 | 확인 못 함 |
| 던전앤파이터 | 해체 | 「모두해체」(등급 설정) + 다중 선택 | 없음 | **잠금(해제 지연)** | 확인 못 함 |
| **로스트아크** | 분해 · 잡동사니 판매 | 일괄 판매 | **등급 + 종류 조건 저장 자동분해 · 신규 획득분만** | 확인 못 함 | 확인 못 함 |
| Diablo 2 / D2R | 분해 없음 — 판매 · 줍지 않기 | — | ⚠ D2R 확장팩에 표시 필터 신설(보고) | — | 그리드 제약 |

---

## 3. 공통 패턴

1. **정리 장치는 3단으로 쌓인다 — 개별 → 버튼 일괄 → 자동 규칙.** 방치형일수록 3단이 본체다(Lootun · 로스트아크 · 버섯커). 파밍량이 임계를 넘으면 「분해 없음」 게임도 결국 정리 장치를 들인다(D2 → D2R 필터, PoE1 → PoE2 Salvage Bench)
2. **1차 축은 거의 전부 등급(희귀도)** — 부위 · 타입 · ilvl · 옵션은 그 위의 보조축. **점수(현재 장비 대비) 기준은 드물다** — 에픽세븐(장비 점수 하한) 정도. 버섯커는 점수를 「버림」이 아니라 「정지」 트리거로 쓴다
3. **자동 규칙은 「신규 유입에만」 적용된다** — Lootun · 로스트아크. 설정 한 번에 보유분이 통째로 갈리는 사고를 구조로 막는다
4. **보호는 「장착 중 제외」가 바닥이고, 그 위가 잠금 태그** — Melvor · 에픽세븐 · 던파(해제 지연까지). 타입 고정 플래그(Idle Guild Master · Soda Dungeon 2)도 있다
5. **보호가 불완전하면 사고가 난다** — D4 시즌4(2024-05)에 일괄 분해의 보호 범위를 줄이자 투자한 장비가 갈리는 사고와 반발이 났고, 2026-04 에도 「마스터워크한 장비를 실수로 분해」 불만이 계속됐다. RAID 는 필터 오작동으로 기능을 일시 비활성화했다
6. **가방 가득 참의 답은 셋** — **정지**(Melvor · 버섯커) / **자원 전환**(Loop Hero · Clicker Heroes Junk Pile) / **칸 확장**(RAID · Idle Guild Master — 과금 · 골드). **기본값이 「그냥 버림」인 사례는 이번 조사에서 찾지 못했다**(Melvor 의 초과분 버림은 옵트인)
7. **분해 산출물은 「분해로만 얻는 전용 재화」** — Lootun(Rarity Core · Shard) · Dragon Cliff(Demon Fragment) · Clicker Heroes(Forge Cores) · D3(등급별 재료) · 던파(소울). 하위 등급 분해가 상위 제작 · 승급 재료로 순환한다
8. **분해와 판매를 둘 다 두면 역할을 가른다** — 에픽세븐(판매 = 골드 · 추출 = 부위별 제작 재료), 메이플 키우기(무기 = 흡수 · 방어구 = 분해). 한쪽만 두는 게임도 많다(Lootun = 분해만 · Melvor = 판매만)
9. **개체 굴림이 없으면 분해도 없다** — Melvor · Idle Guild Master 는 등급 · 접사 랜덤이 없어 분해할 이유가 구조적으로 성립하지 않는다. 분해의 존재는 파밍 모델(굴림형 vs 결정론형)에 종속된다
10. **필터가 복잡할수록 불만이 커진다** — RAID(AND/OR 불명확) · 서머너즈 워(판매 필터와 강화 필터 기준 불일치) · 세븐나이츠 리버스(판매 필터와 분해 필터가 다름)

---

## 4. 게임마다 갈리는 설계 선택지

| 축 | 갈래 |
|---|---|
| 분해 유무 | 있음(대다수) / 없음 — 판매만(Melvor · IGM) · 장비를 장비에 먹임(AFK Arena) · 벤더 레시피(PoE1) · 판매와 줍지 않기(D2) |
| 처리 수단의 이원화 | 분해만(Lootun · D3) / 판매만(RAID · Melvor) / 판매 + 추출(에픽세븐) / 부위별로 다른 처리(메이플 키우기) |
| 자동화 트리거 | 획득 즉시(Lootun · 로스트아크 · 버섯커) / 연속 전투 종료 후 일괄(RAID · 에픽세븐) / 넘칠 때만(Loop Hero · Clicker Heroes) / 수동 방문(서머너즈 워) |
| 적용 범위 | 신규 유입만(Lootun · 로스트아크) / 탭 전체 수동 일괄(Melvor) / 상시 강제(Loop Hero) |
| 필터 축 | 등급 문턱(Lootun · 로스트아크 · 버섯커) / 등급 + ilvl(Lootun 실전 세팅) / 옵션 조합(RAID · 서머너즈 워) / 장비 점수(에픽세븐) / 보유 수량 상한(Soda Dungeon 2) / 칸 위치(Loop Hero) |
| 보호 단위 | 개체 잠금(Melvor · 에픽세븐 · 던파) / 타입 플래그(IGM · Soda Dungeon 2) / 장착 슬롯(RAID · Clicker Heroes) / 확인창(D3) / **정지 후 질문**(버섯커) |
| 가득 참 대응 | 정지 / 자원 전환 / 칸 확장(과금 · 골드) / 요약 목록에서 일괄 처리 |
| 분해 대상의 단위 | 아이템(대다수) / 캐릭터(Idle Heroes Altar — 장비는 돌려준다) / 렐릭 · 아티팩트(Clicker Heroes · Tap Titans 2) |
| 필터 제공 방식 | 게임 내장 UI(Last Epoch · 로스트아크 · 던파 · D4 · D2R) / 외부 텍스트 파일 + 커뮤니티 도구(PoE) |

---

## 5. 방치형으로 옮길 때 의미 있는 것 / 없는 것

**의미 있는 것**

- **조건 저장형 자동 분해** — 한 번 세팅하면 신규 유입에 계속 적용된다(로스트아크 · Lootun). 방치형은 「돌아왔을 때 정리가 끝나 있어야」 한다
- **조건 → 동작 규칙 목록 · 위에서부터 첫 매치**(Last Epoch) — 규칙이 늘어날 때의 우선순위 문법
- **보호 태그**(잠금 · 즐겨찾기) — 자동 처리가 좋은 장비를 삼키지 않게 하는 최소 안전장치
- **정지 후 질문**(버섯커) — 자동화가 결정권까지 가져가지 않는 절충
- **등급별 산출물 순환** — 파밍 루프를 닫는 구조
- **가방 가득 참 처리** — 조사 대상 대부분이 명확한 답을 주지 못했다는 것 자체가, 방치형에선 따로 설계해야 할 과제라는 신호

**의미 없는 것** (수동 조작 ARPG 전제)

- **확인창**(D3 레어+) — 사람이 화면을 보고 있다는 전제의 마찰. 방치 중엔 아무도 안 본다
- **화면 표시 필터**(PoE Hide) — 오프라인 구간엔 「보는」 행위가 없다. 실시간 관전에서만 부분적으로 유효
- **Ctrl+클릭 다중 선택 · Shift 비교 툴팁** — 매번 사람이 눌러야 한다
- **텍스트 파일 직접 편집**(PoE `.filter`) — 파워유저 도구
- **눌러야 실행되는 일괄 버튼만**(D3 Salvage All · 던파 모두해체) — 능동 트리거 전제. 방치형이면 한 단계 더 나간 「조건 저장 → 신규 유입 자동 적용」이 필요하다

---

## 6. 본작에 비춰 짚을 곳 (조사자 의견 — 결정 아님)

구조적 완성도 순서로 적는다.

1. **가방 가득 참 = 그냥 버림** — 방치형 계약 「자리 비워도 안전」과 가장 크게 부딪힌다. 참고작은 정지 · 전환 · 확장 중 하나를 쓰고, 보상 없는 소실을 기본값으로 둔 사례는 찾지 못했다
2. **자동 규칙 없음** — §10 「자동 분해의 선」이 미확정. 09-07 오프라인 장비 드롭이 구현되면 필수가 된다. 참고작의 공통 답은 **등급 문턱 + 신규 유입에만**(필요하면 ilvl 추가)
3. **⚠ 확정 사항과의 긴장** — [item_design.md §6-3](../game_design/item_design.md) 은 자동 분해 설정 자리의 표기를 **점수**로 정해 뒀다. 참고작의 1차 축은 **등급**이고 점수 기준은 드물다(에픽세븐). 둘은 배타가 아니다(등급 문턱 + 점수 표시 · 등급 + 점수 하한) — 어느 쪽을 선의 기준으로 쓸지가 §10 과제 그대로다
4. **일괄 없음** — 리포트 「획득 장비」 칸이 「이 런에서 얻은 것 일괄」의 자연스러운 자리다(버섯커 요약 목록 · RAID · 에픽세븐 연속 전투 결과와 같은 모양). Dragon Cliff 는 일괄 부재가 실제 요청으로 올라왔다
5. **잠금 없음** — 자동 · 일괄이 들어오면 필수. D4 교훈대로 **강화한 장비를 어떻게 보호할지**가 걸리고, 이것은 [item_design.md §5-3](../game_design/item_design.md) 「강화 단계를 반환량에 넣는가」와 한 묶음이다. [item_design.md §6-4](../game_design/item_design.md) 「자동 분해가 무엇을 보호하나」(저항 · 유틸 · 죄종 태그)도 같은 자리
6. **반환량 규정의 빈칸** — 일반 미정 · 유니크 규정 없음인데 코드는 둘 다 매직 값
7. **판매** — §10 경고가 이미 있다. 참고작도 둘을 두면 역할(골드 vs 재료)을 가른다
8. **교차 참조 어긋남(사소)** — [item_design.md §6-4](../game_design/item_design.md) 「자동 분해 자체」 행은 「base_expedition_design.md §5 에 이름만 있다」고 적지만, 조사 시점에 그 이름은 §2-3 분해 행에 있다

---

## 7. 게임별 상세 — PC 방치형

### 7-1. Lootun (본작 1순위 참고작)

- **처리 수단** — 분해(Scrapper 건물)만 있고 판매는 없다. 분해가 이후 모든 건물의 재료원이다 [로컬]. 개조(리롤 · 락 · 트랜스뮤트 등)는 별개 도구 10종 [로컬]
- **진입 UI** — Scrapper 건물의 **Auto Scrap 패널**: 전체 on/off 체크박스 + 아이템 타입(Default · Gems · Tools 등)별 독립 설정, 드롭다운으로 타입 전환 [웹]
- **필터 기준** — **타입별 희귀도 문턱**(Legendary 로 두면 Uncommon~Legendary 전부 자동 분해) [웹]. 실전 세팅 예시는 문턱에 **ilvl 상한**도 건다(Uncommon 은 iLvl82 까지, Legendary+ 는 iLvl75 까지 등) [웹]
- **자동 처리** — **신규 드롭에만 적용**, 기존 보유분엔 소급하지 않는다 [로컬]. 아이템 글로서리의 **「Always Auto Scrap」** 플래그로 희귀도 · 인챈트 · Nemesis 여부와 무관하게 그 아이템(타입)을 강제 자동 분해(전체 스위치가 켜져 있어야 작동) [웹]
- **보호 장치** — Lock Attributes(속성 잠금 — 원래 용도는 크래프팅) [웹]. 「신규 드롭 전용」 자체가 실수 방지 장치 [로컬]
- **산출물** — 직업 재료 · Rarity Core(최소 1개) · Attribute Shard(공 · 방 · 유 3종) · Socket Shard · 인챈트 시약. **리롤 비용이 곧 분해 산출물** [로컬]
- **가방 가득 참** — 확인 못 함. 바운티 보상이 빈 슬롯을 못 채우는 문제로 「보상 전용 슬롯 자동 수령」 요청 스레드가 있다 [웹]
- **커뮤니티** — 「가방 전체 검색 부재 + 가방이 너무 많아 관리가 번거롭다」 · 「비교 · 장착 · 스크랩 반복이 지겹다」 [웹]. 「Scrap Settings by Rarity」 요청 스레드로 보아 현재의 타입별 문턱 UI 는 요청이 반영된 결과로 보인다(도입 시점 확인 못 함)
- 출처: [Auto Scrap 요청](https://steamcommunity.com/app/1960270/discussions/0/596280900528025704/) · [오작동 문의](https://steamcommunity.com/app/1960270/discussions/0/688615158419891488/) · [작동 방식 Q&A](https://steamcommunity.com/app/1960270/discussions/0/5219148331328222101/) · [인벤 불만](https://steamcommunity.com/app/1960270/discussions/0/4692280570914305558/) · 로컬 [lootun/00_overview.md](lootun/00_overview.md) §6 · `lootun/03_buildings.md` Scrapper 절

### 7-2. Dragon Cliff

- **처리 수단** — Furnace 의 **Decompose** — Combine · Reforge · Enchant · Transfer 와 나란한 5기능 중 하나 [로컬]. Factory 에 **품질별 오토셀**이 따로 있다 [로컬]
- **진입 UI** — 개별 투입. 아이템 관리 화면과 Furnace 화면 양쪽에서 분해 [웹]. **동일 타입 일괄 분해 없음**
- **필터** — 없음(손으로 고른다). 등급별 산출량 차등만
- **자동 처리** — Factory 오토셀이 품질 기준으로 작동(임계치 확인 못 함) [로컬]. Decompose 자동화 확인 못 함
- **보호 장치** — 확인 못 함
- **산출물** — Star 등급 분해 = Demon Fragment 10 / Ancient = 1(등급 간 10배 환산) [로컬]. Reforge 는 Book Pages 소모 [로컬]
- **가방 가득 참** — 확인 못 함
- **커뮤니티** — Decompose 해금이 탐험(함선 파견) 퀘스트 체인 뒤라 초반 접근이 막힌다는 질문 [웹]. **「decompose all same type」 일괄 분해 요청 스레드** — 조사 시점까지 미도입으로 보인다 [웹]
- 출처: [Furnace 위키](https://dragon-cliff.fandom.com/wiki/Furnace) · [unlock decompose](https://steamcommunity.com/app/758190/discussions/0/1693795812288605692/) · [decompose all same type 요청](https://steamcommunity.com/app/758190/discussions/0/1744479063997393225/) · 로컬 [dragoncliff/02_items.md](dragoncliff/02_items.md)

### 7-3. Melvor Idle

- **처리 수단** — **분해 없음**. 등급이 고정 금속 티어라 개체차가 없다 [로컬]. 처리는 **판매**뿐. 강화는 비가역 확정형(실패 · 파괴 없음) [로컬]
- **진입 UI** — 뱅크에서 개별 판매 + **Sell All Unlocked**(톱니바퀴 · 탭 단위 일괄) [웹]
- **필터** — 잠금 여부 하나뿐(등급이 없으므로) [웹]
- **자동 처리** — **공식 자동 판매 없음**. GitHub 이슈 #714 로 제안됐고 서드파티 모드(SEMI Auto Sell · 그리스몽키 스크립트)로 우회 [웹]
- **보호 장치** — **잠금 아이콘** — 판매 방지 + 뼈 매장 방지 + 상자류 자동 개봉 방지를 겸한다 [웹]. 「탭 전체 잠금」에 **되돌릴 수 없다는 경고**가 붙어 혼란을 낳은 사례 [웹]
- **산출물** — 골드뿐 [로컬]
- **뱅크 가득 참** — **막히면 그 스킬이 그 자리에서 정지**. 「Ignore Bank Full」을 켜면 계속 진행하되 초과분은 버린다. 온라인 · 오프라인 동일 [로컬]
- **커뮤니티** — 「auto-sell 옵션이 어디 있냐」 반복 질문 · 탭 잠금 경고문 혼란 [웹]
- 출처: [Bank 위키](https://wiki.melvoridle.com/w/Bank) · [auto-sell 문의](https://steamcommunity.com/app/1267910/discussions/0/6980058383077376427/) · [탭 잠금 경고 문의](https://steamcommunity.com/app/1267910/discussions/0/3881598799635097880/) · [GitHub #714](https://github.com/MelvorIdle/melvoridle.github.io/issues/714) · [SEMI Auto Sell](https://mod.io/g/melvoridle/m/semi-auto-sell) · 로컬 [melvoridle/](melvoridle/00_overview.md)

### 7-4. Guild Master - Idle Dungeons (Paranoid Squirrels)

- **처리 수단** — **분해 없음**(공식 위키 서술 없음). 정리는 **판매(Market)**뿐. 개체 굴림 없는 「타입」만 있어 분해할 편차가 없다 [로컬]
- **보호 장치** — **판매 불가 플래그**가 아이템 타입에 고정(기본 무기 · 에픽 레이드 보상 등) [로컬]. 선술집의 영웅 잠금은 아이템과 무관 [로컬]
- **가방 가득 참** — 창고 시작 칸이 작고 골드로 확장. 가득 찼을 때의 처리(손실 / 정지)는 확인 못 함 [로컬]
- **커뮤니티** — 확인 못 함(서드파티 공략이 사실상 없다)
- 출처: 로컬 [idleguildmaster/02_items.md](idleguildmaster/02_items.md) §8-6

### 7-5. Legends of IdleOn

- 판매 중심. 「분해」라는 이름의 시스템은 확인 못 함 [웹]
- 카드 섹션에 **아이템 필터**가 있어 특정 드롭(이미 해금한 스탬프 등)을 거를 수 있으나, **오토루트가 필터를 무시하고 다 줍는 이슈**가 보고됐다 [웹]
- 특정 번들 구매 시 인벤 칸 · 필터 칸이 늘어난다(과금 연계) [웹]
- 보호 · 산출물 · 가득 참 세부는 확인 못 함
- 출처: [Idleon Efficiency – Stamps](https://www.idleonefficiency.com/world-1/stamps)

### 7-6. Loop Hero

- 분해 명령이 없다. **인벤토리 칸을 넘으면 마지막 칸(우하단)부터 자동 파괴 → Scrap Metal(자원)** [웹]
- 필터 없음. **플레이어가 아이템을 앞 칸으로 옮겨 파괴 순서를 조작**하는 것이 유일한 보호 수단 [웹]
- 자동 처리는 상시(끌 수 없음). 공략은 「가득 채워 두는 편이 자원 확보에 늘 유리하다」고 조언 [웹]
- 커뮤니티 — 「인벤 비우는 법 · 삭제하는 법」 질문이 많다 — 명시적 삭제 버튼이 없는 것이 낯설다는 반응 [웹]
- 출처: [Deleting stuff from Inventory](https://steamcommunity.com/app/1282730/discussions/0/3112522283873315589/) · [Gamer Tweak 가이드](https://gamertweak.com/loop-hero-delete-items/)

### 7-7. Soda Dungeon 2

- 개별 판매 + **Liquidate**(일괄 판매) [웹]
- 필터 축이 **「이 종류는 N개까지 남기고 나머지 처분」 — 보유 수량 상한**(등급 · 점수 아님) [웹]
- **Plated(도금) 장비는 판매 불가**. 유니크는 재제작도 안 돼 갇히는 문제가 보고됨(의도인지 결함인지 확인 못 함) [웹]
- 출처: [Blacksmith Shop 위키](https://soda-dungeon-2.fandom.com/wiki/Blacksmith_Shop) · [Plated Unique 문의](https://steamcommunity.com/app/946050/discussions/0/3034850411004713995/)

### 7-8. Nonstop Knight 2

- 확인된 것은 「필요 없는 장비를 판다」 한 줄뿐. 분해 · 일괄 · 필터 서술을 찾지 못했다 — 없는 것인지 미문서화인지 구분 못 함
- 출처: [Level Winner 가이드](https://www.levelwinner.com/nonstop-knight-2-beginners-guide-tips-cheats-tricks-to-clear-more-dungeons/)

### 7-9. Clicker Heroes (렐릭)

- 파밍 대상은 일반 장비가 아니라 **렐릭**, 분해 체계가 뚜렷하다 [웹]
- **장착 칸을 넘는 렐릭은 자동으로 Junk Pile 에 쌓이고**, 그 안에서 남길 것을 고른 뒤 **「Salvage Junk Pile」**로 일괄 분해 [웹]
- **개별 분해는 지원하지 않아** 불만 스레드가 있다 [웹]
- 산출물 — **Forge Cores**(렐릭 업그레이드 전용 재화). 등급별 배수 · 레벨 비례 [웹]. 「분해 전에 업그레이드하면 코어를 더 얻는 경우가 있다」는 최적화 팁이 공략화돼 있다 [웹]
- 출처: [개별 분해 불가 문의](https://steamcommunity.com/app/363970/discussions/0/133259227514427285/) · [Forge Cores 공식 블로그](https://blog.clickerheroes.com/forge-cores-in-clicker-heroes-how-to-upgrade-relics-right/) · [Relics 위키](https://clickerheroes.fandom.com/wiki/Relics)

### 7-10. Idle Heroes (대조군)

- 장비가 아니라 **영웅을 분해**(Altar) — Spirit · 승급석 · Soul Stone Shard 로 전환. **그 영웅이 끼고 있던 장비 · 아티팩트는 파괴되지 않고 인벤토리로 돌아온다** [웹]
- 「장비를 태우는」 설계와 정반대인 「영웅을 태우고 장비는 보존」 계보
- 필터 · 보호 · 커뮤니티 확인 못 함
- 출처: [Altar 위키](https://game-maps.com/Idle-Heroes/Idle-Heroes-Altar.asp) · [BlueStacks 기어 가이드](https://www.bluestacks.com/blog/game-guides/idle-heroes/ih-gear-guide-en.html)

### 7-11. Tap Titans 2 (대조군)

- **아티팩트 분해 → Relic 재화**. 「원치 않는 아티팩트를 분해해 두면 이후 신규 아티팩트 획득 비용이 낮아진다」는 팁 [웹]
- 필터 · 자동화 · 보호 · 가득 참 확인 못 함
- 출처: [Artifacts 위키](https://tap-titans-2.fandom.com/wiki/Artifacts)

---

## 8. 게임별 상세 — 모바일 방치형 · 수집형

### 8-1. 세븐나이츠 키우기 — 자료 미확보

- **「세븐나이츠 키우기」 자체의 분해 · 판매 세부는 확인 못 함** — 가이드가 성장 · 소환 위주다. 넷마블 산하에 이름이 비슷한 타이틀이 여럿이라 혼동 주의
- 아래는 **별도 게임인 「세븐나이츠 리버스」**에서 확인된 것 — 참고용
  - 처리 수단 — 판매 위주. 「장비 분해는 없냐」는 질문 글이 있다(분해가 없거나 제한적인 것으로 보이나 공식 확인 못 함)
  - 진입 — 가방의 판매 모드 진입 후 다중 선택
  - 필터 — 세트 → 주옵션 → 부옵션 우선순위 조합, 「부옵션 금지」 지정으로 배제
  - 보호 — **「장착 아이템 숨기기」** 설정으로 판매 목록에서 장착 장비 제외
  - 커뮤니티 — 「판매 필터와 분해 필터가 다르다」는 혼란
- 출처: [인벤 기사](http://www.inven.co.kr/webzine/news/?news=247412) · [나무위키 세븐나이츠/시스템](https://namu.wiki/w/세븐나이츠/시스템) · [DC 갤러리 1](https://gall.dcinside.com/mgallery/board/view/?id=sevennightsrebirth&no=906567) · [DC 갤러리 2](https://m.dcinside.com/board/sevennightsrebirth/215172) · [공식](https://skidle.netmarble.com/en) · [talkandroid 가이드](https://www.talkandroid.com/26122-seven-knights-idle-adventure-guide-tips-codes/)

### 8-2. 메이플스토리 키우기 (MapleStory Idle RPG)

- **이중 트랙** — 무기는 **흡수**(같은 무기를 먹여 각성 단계 상승 · 각성을 채우면 같은 무기 여러 개로 다음 등급 승급), 방어구는 **분해**(아머 스톤 → 엘리트 몬스터 소환 레벨을 올려 더 좋은 등급 방어구 확률 상승)
- 산출물 — 아머 스톤(방어구) / 무기는 재료화 없이 각성치로 소모
- 진입 UI · 필터 · 자동 처리 · 보호 · 가득 참 — **확인 못 함**(공략은 「따로 보관할 필요 없다」는 수동 처리 팁뿐)
- 로컬 `maplestory/` 는 몬스터 조사뿐이라 해당 내용 없음
- 출처: [공식 가이드](https://maplestoryidle.nexon.com/ko/guide) · [BlueStacks 팁](https://www.bluestacks.com/ko/blog/game-guides/maplestory-idle-rpg/mpsir-tips-tricks-ko.html) · [나무위키 메이플 키우기/시스템](https://namu.wiki/w/메이플%20키우기/시스템)

### 8-3. 버섯커 키우기 (Legend of Mushroom)

- **처리 수단** — 램프 자동 소환 → 지정 등급 미만은 자동 판매, 이상은 확인
- **진입** — 램프 탭 자체가 모드 토글형. 해금 레벨은 출처마다 달라 확인 못 함
- **필터** — **등급 하한 하나**(선택 등급 이상만 보관). 성급 · 부위 · 전투력 필터는 확인 못 함
- **자동 처리** — 해금 후 램프를 계속 자동 소환하며 하한 미만을 즉시 자동 판매. 재화 소진 시 정지 옵션. 탭하면 즉시 정지
- **보호** — **현재 장착보다 좋은 장비가 나오면 판매 / 장착을 묻는 팝업과 함께 파밍을 멈춘다**(자동 장착이 아니라 정지)
- **산출물** — 골드 + 경험치
- **가득 참** — 최근 획득분을 등급순 요약 목록으로 보여주고 일괄 판매 또는 개별 비교
- 커뮤니티 — 확인 못 함
- 출처: [krasia.net](https://krasia.net/217) · [나무위키 버섯커 키우기](https://namu.wiki/w/버섯커%20키우기) · [LDPlayer](https://kr.ldplayer.net/blog/1727.html)

### 8-4. 서머너즈 워 (룬)

- **처리 수단** — 판매(마나) · 강화(다른 룬을 재료로). 별도 「분해 → 전용 재화」는 확인 못 함
- **진입** — 룬 보관함의 판매 모드 → 다중 선택. **NPC 방문이 필요**(획득 즉시 자동 판매 아님) — 방문 필요 구조 자체가 불만 소재
- **필터** — 등급 · 별 · 주옵션 · 부옵션. 「룬 자동 각인」(2022-01)은 판매가 아니라 세트 · 옵션 · 별 우선순위 기반 **장착 추천**
- **자동 처리** — 획득 즉시 자동 판매는 확인 못 함
- **보호** — 명시적 잠금 확인 못 함
- **커뮤니티** — NPC 방문 번거로움 · **판매 필터와 강화 재료 필터의 기준 불일치**
- 출처: [나무위키 룬](https://namu.wiki/w/서머너즈%20워%20:%20천공의%20아레나/룬) · [베타뉴스](https://www.betanews.net/article/view/beta202201180093) · [게임샷](https://m.gameshot.net/common/con_view.php?code=GA6723060ed5696)

### 8-5. RAID: Shadow Legends (아티팩트)

- **처리 수단** — 판매(Silver). 분해 → 재료화 확인 못 함
- **진입** — 아티팩트 선택 → SELL 토글 → 다중 선택 → SELL. **멀티배틀(연속 전투) 보상에 필터 자동 적용**
- **필터** — 등급 · 랭크 · 부위 · 세트 · 주옵션(고정 vs %) · 부옵션 조합. 필터 간 AND/OR 논리가 불명확해 혼란
- **보호** — **장착 중 장비는 판매 불가**. 초기 버전은 버그로 필터 대상이 안 팔리거나 필요한 게 팔리는 사고가 나 공식 포럼이 인정 후 **일시 비활성화**
- **산출물** — Silver(등급별 차등 · 배율 확인 못 함)
- **가득 참** — **패치 7.70 에서 저장 공간 자체를 확장**(아티팩트 · 장신구 · 예비 금고 · 영혼 칸) — 자동 정리가 아니라 확장
- **커뮤니티** — 필터 버그로 수백 개 미판매 → 우편함 손실 사례, 「공격적 필터가 고성급 장비까지 날린다」는 경고
- 출처: [공식 포럼 — 새 자동 판매 필터](https://forum.plarium.com/en/raid-shadow-legends/674_game-discussion/1437347_confused-about-new-autosell-filters/) · [RSL Helper](https://rslhelper.com/how-to-gear-cleansing-with-rsl-helper/) · [7.70 패치노트](https://www.sportskeeda.com/esports/raid-shadow-legends-update-7-70-patch-notes-storage-expansion-champion-lore)

### 8-6. 에픽세븐

- **처리 수단** — **판매(골드) / 추출(제작 재료) 이원**. 가이드 원칙: 「그 부위 제작 재료가 필요하면 추출, 골드가 필요하고 세트가 안 맞으면 판매」
- ⚠ **자동 처리** — 2026-08-27(8주년) 업데이트로 「전투 위임」(오프라인 자동 반복 전투) 드롭에 자동 판매 · 자동 추출 필터가 결합됐다는 보고(최근 기사 기반 — 재검증 필요)
- **필터** — 등급 · **장비 점수(Gear Score) 하한** · 부위 · 세트 · 부옵션 성질(속도 유무 · 고정치 vs %)
- **보호** — **잠금**. 「이계 장비는 통째로 자동 파괴 금지」 같은 권고
- **가득 참** — 확인 못 함
- 출처: [epic-seven.wiki 장비 가이드](https://epic-seven.wiki/guides/gear/) · [엑스포츠뉴스](https://www.xportsnews.com/article/2189285) · [인벤 기사](https://www.inven.co.kr/webzine/news/?news=320145) · [나무위키 에픽세븐/장비](https://namu.wiki/w/에픽세븐/장비)

### 8-7. AFK Arena / AFK Journey — 두 게임 분리

- **AFK Arena** [로컬] — **분해 시스템이 없다.** 하위 장비를 상위 장비의 강화 게이지에 직접 먹인다. 강화 재료는 필드 드롭 장비 + 강화 토큰의 이중 트랙(등급별 고정 환전비). Gear Resonance 는 **장비 단위로 켜고 끄는 옵트인 자동화**(전역 규칙이 아니라 개체별 예외)
  - 출처: 로컬 [afkarena/02_items.md](afkarena/02_items.md) §8 · §10 (원출처 theriagames.com 등)
- **AFK Journey** [웹] — 재련(Forge)에서 안 쓰는 장비를 **리사이클** → Casting Shards → 강화. AFK Arena 와 달리 분해 재화가 있다. 진입 · 필터 · 자동 · 보호 · 가득 참 확인 못 함(prydwen.gg 상세 페이지 열람 실패)
  - 출처: [playafkjourney.com](https://playafkjourney.com/equipment/) (검색 스니펫)

### 8-8. 그 밖의 셋

- **이블헌터 타이쿤** — 「히로익 등급 이상 분해 시 보석 획득」이라는 커뮤니티 언급(공식 확인 못 함). 나머지 전부 확인 못 함
  - 출처: [나무위키](https://namu.wiki/w/이블헌터%20타이쿤) · [DC](https://m.dcinside.com/board/evilhunter/259)
- **라그나로크: Back to Glory** — 분해 있음(산출물 확인 못 함). **분해해도 승급에 쓴 재료는 돌려주지 않는다**는 경고 · 승급 완료 장비는 귀속
  - 출처: [BlueStacks 장비 가이드](https://www.bluestacks.com/ko/blog/game-guides/ragnarok-back-to-glory/rrbg-gear-guide-ko.html)
- **아처키우기** — 장착 · 해제 · 분해 · 강화 · 합성 5종 조작이 있다는 서술뿐. 세부 확인 못 함
  - 출처: [나무위키](https://namu.wiki/w/아처키우기)

---

## 9. 게임별 상세 — 파밍 ARPG

### 9-1. Diablo 3

- **처리 수단** — 분해가 유일한 재료화 경로. 카나이의 큐브 「Archive of Tal Rasha」는 별도 — 레전더리 파워만 추출해 큐브에 영구 귀속, 원본 소멸 [웹]
- **진입** — 대장장이. 개별 분해 + **등급별(일반 · 마법 · 레어) Salvage All**(패치 2.1.0 · 2014-08-26 추가) [웹]
- **필터** — 일괄 대상은 일반 · 마법 · 레어뿐, 전설 · 세트는 개별 처리
- **자동 처리** — 없음. 스마트 드롭(Loot 2.0)은 클래스 적합도만 반영, 보유 여부는 드롭 확률에 미반영 [웹]
- **보호** — **레어 이상 분해 시 확인창**. 2.1.1 부터 장착 · 인챈트 · 소켓 · 전송 아이템은 일괄 분해에서 제외 [웹]
- **산출물** — 일반 → Reusable Parts · 마법 → Arcane Dust · 레어 → Veiled Crystal · 전설 → Forgotten Soul · 프리멀 → Primordial Ashes [웹]
- **가득 참** — 확인 못 함
- **커뮤니티** — 확인창 찬반: 안전장치 지지 vs 숙련 유저의 끄기 요청(미수용) [웹]
- 출처: [Icy Veins 큐브](https://www.icy-veins.com/d3/kanais-cube-guide) · [패치 2.1.0](https://news.blizzard.com/en-us/article/15487814/patch-2-1-0-now-live) · [Diablo Wiki Salvage](https://www.diablowiki.net/Salvage) · [Smart Loot](https://www.diablowiki.net/Smart_Loot) · [확인창 제거 요청](https://us.forums.blizzard.com/en/d3/t/remove-legendary-salvage-confirmation-window/18403)

### 9-2. Diablo 4

- **처리 수단** [로컬] — 분해 = 레전더리 어스펙트를 코덱스 오브 파워에 등록하는 유일 경로(Lord of Hatred 로 던전별 확정 등록 경로 폐지). Occultist 의 Extract = 어스펙트만 추출(아이템 소멸 · 아이템 파워 비례 골드 · 유니크 불가). 호라드릭 큐브가 시즌13 에 레시피 시스템으로 부활
- **진입** [웹] — Junk 태그는 수동. 대장장이 Salvage 탭에서 **All Junk / 등급별(Common · Magic · Rare) / All Items** 일괄. **상인 창에 Sell All 버튼 자체가 없다**(출시 이후 요청, 미구현)
- **필터** — Junk(수동) / Favorite(토글) · 등급별 일괄. 레전더리 · 유니크는 개별 또는 All Items 로만
- **자동 처리** — 없음. Advanced Tooltip Compare 는 분해 판단과 연동 안 됨. **2026-04 Lord of Hatred 에 Loot Filter 가 들어왔지만 표시 숨김일 뿐 자동 분해가 아니다**
- **보호** — Favorite 가 분해 · 판매를 막지만 **불완전** — 마스터워크에 투자해도 Favorite 를 안 걸면 그냥 분해된다. 2026-04 에도 「완전 마스터워크 아이템을 실수로 분해」 불만
- **이력** — 출시(2023-06 · 베타부터 Junk + 일괄 분해) → **시즌2(2023-10) Favorite 도입** → **시즌4 Loot Reborn(2024-05-14) Salvage All 보호 범위 축소**(유니크 · 레전더리 자동 제외 폐지) → 실수 파괴 다발 · 반발 → **2026-04 Lord of Hatred** Junk/Favorite UI 불변 · Loot Filter 신설 · 분해 재료 요구량 완화 방향(Dev Q&A)
- **커뮤니티** — Sell All 부재 · 완전 잠금 요청 반복 · 시즌4 사고 이후 확인창 요청
- 출처: [Sell All 요청](https://us.forums.blizzard.com/en/d4/t/sell-all-button/11667) · [보호 부재 불만](https://us.forums.blizzard.com/en/d4/t/no-auto-favouritesalvage-item-protection/247517) · [Icy Veins 시즌2](https://www.icy-veins.com/d4/news/stash-receiving-filters-and-a-text-search-in-diablo-4-season-2/) · [Dexerto 시즌4](https://www.dexerto.com/diablo/diablo-4-salvage-all-items-change-loot-reborn-2725179/) · [Maxroll 3.0.2](https://maxroll.gg/d4/news/lord-of-hatred-3-0-2-patch-notes) · [Icy Veins 자동 분해 없음](https://www.icy-veins.com/d4/news/no-auto-salvage-in-diablo-4-loot-filters-should-players-be-worried/) · 로컬 [diablo4/02_items.md](diablo4/02_items.md)

### 9-3. Diablo Immortal

- 인벤토리 전체 대상 **자동 분해는 확인 못 함**. 확실한 것은 **자동 줍기**(등급별 체크박스)
- Warband 패치노트에 「auto-salvage」 용어가 한 번 나오나 원문 미확보 — 범위 · 조건 불명, 단정하지 않는다
- 출처: [ScreenRant](https://screenrant.com/diablo-immortal-automatically-pick-items/)

### 9-4. Path of Exile 1 / 2

- **PoE1**
  - **분해 개념이 없다** — 벤더 레시피로 화폐에 직접 전환 [웹]
  - 게임 내 필터 편집기 없음 — `.filter` 텍스트 파일을 외부에서 작성해 불러온다 [웹]
  - 필터 문법 — `Show` / `Hide` 블록, 위에서부터 **첫 매치에서 정지**(`Continue` 로 예외). 조건 = Class · Rarity · ItemLevel · DropLevel · Sockets · 접사 등
  - 커뮤니티 도구 Filterblade(NeverSink) — **엄격도 단계** 선택
  - **보호 없음** — 필터는 **표시 전용**, 숨겨도 실제로는 떨어진다. 3.15.3 에 「숨긴 아이템 렌더 자체 차단」 옵션 추가
  - 벤더 레시피 예 — 미식별 레어 풀세트 → Chaos / Regal Orb · RGB 링크 → Chromatic Orb · 젬 품질 합산 → Gemcutter's Prism · 플라스크 품질 합산 → Glassblower's Bauble
  - 출처: [poewiki 필터 가이드](https://poewiki.net/wiki/Item_filter_guide) · [NeverSink GitHub](https://github.com/NeverSinkDev/NeverSink-Filter) · [3.15.3 기사](https://poecurrency.com/news/path-of-exile-patch-3153-adds-new-options-to-stop-item-renders-hidden-by-item-filter) · [벤더 레시피](https://exitlag.com/blog/path-of-exile-vendor-recipes)
- **PoE2**
  - **Salvage Bench 신설** — 소켓 장비 분해 → Artificer's Shard(모으면 Artificer's Orb) · 품질 장비 분해 → Armourer's Scrap 등. PoE1 의 「분해 없음」에서 **부분 이탈** [웹]
  - 필터 — EA 출시(2024-12) 때 내장 「라이트 필터」만, 커스텀 텍스트 필터 · Filterblade 지원은 2025-01. 외부 도구 의존 구조 유지 [웹]
  - 벤더 레시피 — PoE1 식 조합은 폐지된 것으로 보임(2차 출처 · 공식 재확인 못 함)
  - 이력 — 0.5 패치(2026-05) 드롭량 급증으로 「필터 없이는 플레이 불가」 지적 → v1.1.157(2026-05-25) 식별 아이템 규칙 제거로 필터 용량 감소
  - 출처: [GameSpot Salvage Bench](https://www.gamespot.com/articles/path-of-exile-2-how-to-unlock-the-salvage-bench-and-salvage-items) · [Maxroll Filterblade](https://maxroll.gg/poe2/news/filterblade-launch-for-path-of-exile-2) · 로컬 [poe1/](poe1/00_overview.md) · `poe2/`

### 9-5. Last Epoch

- **진입** — 게임 내장 필터 편집기, **규칙 수 상한**이 있다(상한 확대 요청 스레드). 코드 · 파일로 내보내기 / 가져오기 [웹]
- **필터** — 조건(Affix · Class Requirement · Level · Rarity · Item Type · **조건 종류당 하나**) → 동작(Show · Hide · Recolor · Emphasize). 캐릭터 레벨 구간 조건 가능 [웹]
- **처리 순서** — 위에서부터 **첫 매치에서 즉시 멈춘다**(성능 목적 · 순서 = 우선순위 · 드래그로 재배치) [웹]
- **숨김** — 드롭은 유지, 표시만 숨김. 자동 줍기 연동 확인 못 함
- **분해** — 필터와 별개. **Rune of Shattering**(장비 → Shard · 유니크 · 세트 불가 · 상인에서 골드로 구매) · Rune of Removal(접사 하나 확정 제거 + 티어만큼 Shard) [웹]
- **커뮤니티** — 「ARPG 최고의 루트 필터」류 호평(비공식)
- 출처: [규칙 상한 확대 요청](https://forum.lastepoch.com/t/increase-the-loot-filter-rules-limit-75/68181) · [규칙 우선순위](https://forum.lastepoch.com/t/loot-filter-rule-processing-priority-and-sequence/51560) · [Rune of Shattering](https://lastepoch.fandom.com/wiki/Rune_of_Shattering)

### 9-6. Torchlight Infinite

- **자동 줍기** — 필터 3단계(Basic · Intermediate · Advanced). 펫(Pactspirit) 동반 필요 · 무료 펫은 「대부분」만 · 유료 Advanced Auto Loot 가 우선 [웹]
- **자동 분해** — **확인 못 함**. 조사된 자료는 전부 인벤토리 하단 「Recycle」 수동 선택. 「auto-salvage」 언급 1건은 재확인 안 됨
- 전투는 자동화가 있으나 **「줍기」까지만 자동이고 「정리」는 수동** — 자동화가 멈추는 지점이 뚜렷하다
- 출처: [tlidb Advanced Auto Loot](https://tlidb.com/Advanced_Auto_Loot)

### 9-7. Hero Siege

- [로컬] Loot Filter(방어구 타입 · 무기 · 소켓 · 티어 기준 표시 필터) · Target Farming(저널이 드롭 위치 안내)
- [웹] **자동 판매 · 자동 분해 없음** — Steam 토론에서 확인, 공식 위키에도 서술 없음
- 산출물 — NPC 판매 시 레전더리 · 미식 · 사탄 등급은 골드 대신 **등급별 파우더**(제작 재사용). 도입 패치 추정(본문 미확보)
- Satanic · 세트 장비 분해 → Satanic Crystal(거래 가능). 일괄 여부 확인 못 함
- 출처: [Steam 토론](https://steamcommunity.com/app/269210/discussions/0/3109151560904913400/) · 로컬 [herosiege/00_overview.md](herosiege/00_overview.md)

### 9-8. 던전앤파이터

- [로컬] 해체 시 등급별 확정 재료(레어 → 무색 큐브 조각 + 원소 결정 + 레어 소울 등). **소울이 승급 재료로 재사용되는 순환**
- [웹] **진입** — **「모두해체」 버튼(등급 사전 설정)** + 텍스트 필터(부위명 검색) + Ctrl+클릭 다중 선택(해체기 · 추출기 공통)
- [웹] **보호** — **Alt+클릭 잠금** — 거래 · 판매 · 해체 · 강화 등 차단, **해제는 신청 후 지연**
- [웹] **전문 직업 「해체가」** — 해체기 레벨이 오를수록 처리 가능한 등급이 넓어진다
- 가득 참 — 확인 못 함
- 출처: [인벤](https://www.inven.co.kr/board/df/4307/1032) · [공식 가이드](https://df.nexon.com/guide?no=1234) · [나무위키 해체가](https://namu.wiki/w/%ED%95%B4%EC%B2%B4%EA%B0%80) · 로컬 [dfo/02_items.md](dfo/02_items.md)

### 9-9. 로스트아크

- [로컬] **젬(전투 보석) 분해 = 파편화**(등급별 파편 수) — 젬 한정, 일반 장비와 별개
- [웹] **일반 장비 — 소지품 창 「자동분해」 설정**: 등급 + 종류별 조건 저장, **신규 획득분에만 적용(소급 없음)**. 「잡동사니」 일괄 판매는 별도 버튼
- [웹] 이력 — 2024-12-18 자동분해 설정 개편 · 2026-01 추가 갱신
- 산출물 수치 확인 못 함
- 출처: [인벤](https://www.inven.co.kr/board/lostark/4821/102699) · 로컬 [lostark/02_items.md](lostark/02_items.md)

### 9-10. Diablo 2 / D2R — 대조군

- [로컬 + 웹] **분해 없음.** 호라딕 큐브는 조합 · 크래프팅 전용(장비 → 재료 환원 없음). 상점 판매 + **인벤토리 그리드(테트리스) 제약이 「줍지 않기」를 강제**
- [로컬] D2R 2.4 에 세트 · 유니크 무기 · 방어구 등급 업그레이드 큐브 레시피 신설
- ⚠ [웹] **2026-02-11 유료 확장 「Reign of the Warlock」(패치 3.0)에서 공식 인게임 루트 필터 신설**(표시 숨김 · 이름표 색 · 사운드 · 미니맵 아이콘 · 조건 기반)이라는 보고. 그 전에는 커뮤니티 모드뿐. **D2R 을 「분해도 필터도 없는」 순수 대조군으로 쓰는 전제는 최신 기준으로 부정확할 수 있다**
- 보완 장치 — 뮬 캐릭터 · 공유 창고 문화. 창고 제한이 의도적 설계라는 공식 입장은 확인 못 함. 「분해 없음」의 개발 의도를 직접 설명하는 1차 자료도 확인 못 함
- 출처: [Reign of the Warlock 3.1.1 패치노트](https://news.blizzard.com/en-us/article/24244884/reign-of-the-warlock-3-1-1-patch-notes) · 로컬 [diablo2/02_items.md](diablo2/02_items.md)

---

## 10. 기존 폴더 문서에 이미 있던 분해 언급

| 게임 | 파일 | 요지 |
|---|---|---|
| Lootun | [lootun/00_overview.md](lootun/00_overview.md) §6 · `lootun/03_buildings.md` | Scrapper 가 재료 경제의 시작점 · 타입별 희귀도 문턱 자동 분해(신규 드롭만) · 산출물 다층 |
| Idle Guild Master | [idleguildmaster/02_items.md](idleguildmaster/02_items.md) §8-6 | 분해 없음 · 판매뿐 · 판매 불가 플래그로 보호 |
| Dragon Cliff | [dragoncliff/02_items.md](dragoncliff/02_items.md) | 등급 간 분해 산출 환산율 사례 |
| Diablo 4 | [diablo4/02_items.md](diablo4/02_items.md) | 레전더리 분해 = 어스펙트 코덱스 등록 경로 · Occultist 추출 |
| AFK Arena | [afkarena/02_items.md](afkarena/02_items.md) §8-2 | 분해 없음 — 하위 장비를 상위 장비 강화에 먹인다 · 본작 가루의 「소모처 0」과 대조 |
| ESO | [eso/02_items.md](eso/02_items.md) | 강화석이 「쓸모없는 장비를 분해해 재활용」하는 2차 파밍 산출물 |
| 아이온 | [aion/02_items.md](aion/02_items.md) | 글리프를 룬으로 역추출(원본 파괴) |
| 거상 | `gersang/02_items.md` | 옛 장비가 재활용되지 않고 버려지는 구조 — 대조 대상으로만 언급 |
| DFO | [dfo/02_items.md](dfo/02_items.md) | 해체 → 등급별 소울 → 승급 재료 순환 |
| 로스트아크 | [lostark/02_items.md](lostark/02_items.md) | 젬 분해 = 파편화 |
| Diablo 2 | [diablo2/02_items.md](diablo2/02_items.md) | 분해 없음 · 큐브는 조합 전용 |
| Hero Siege | [herosiege/00_overview.md](herosiege/00_overview.md) | Loot Filter · Target Farming |

melvoridle · diablo3 · maplestory · lineage · poe1 · poe2 폴더에서는 분해 · 필터 언급을 찾지 못했다(주제 자체가 없는지 조사가 안 된 것인지 구분 못 함).

---

## 11. 확인 못 한 것 · 신뢰도

- **세븐나이츠 키우기** — 자료 미확보. §8-1 의 내용은 별도 게임(세븐나이츠 리버스)이다
- ⚠ **최근 기사 단일 출처** — 에픽세븐 위임 전투 필터(2026-08-27) · D2R 확장팩 루트 필터(2026-02) · D4 Lord of Hatred Loot Filter(2026-04)
- **Diablo Immortal · Torchlight Infinite 의 자동 분해 유무** — 불확실
- **PoE2 벤더 레시피 폐지 여부** — 2차 출처 기반
- **가방 가득 참 처리** — 거의 전 게임에서 확인되지 않았다(Melvor · Loop Hero · Clicker Heroes · 버섯커 · RAID 만 확인)
- **산출물 정확한 목록 · 수치** — D4 · 로스트아크 · Hero Siege · DFO 확인 못 함
- **모바일 게임의 설정 화면 구조** — 나무위키 · 공식 가이드의 짧은 절이 요약 과정에서 빠지는 경우가 많았다. 채택 전에 게임 내 화면 스크린샷으로 재검증한다

---

*마지막 업데이트: 2026-09-16*
