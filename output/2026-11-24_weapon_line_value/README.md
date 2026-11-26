# 무기 줄 하나의 결투 값어치 — 차림 1 · 2 (2026-11-24)

사용자 「레벨50 최고옵션기준 옵션풀이랑 결투에 미치는 영향」 · 「이거를 1번으로 하고 2번도 하나 저장해서 해볼래? 완전풀템으로 만들어서」.
11-23 `output/2026-11-23_weapon_line_value/harness/wv.mjs` 와 같은 판이다.

## 무엇을 재나

- 결투장 「챔피언」 등급(`arena_tier.csv` champion — Lv50) 3 대 3. 재는 영웅 = 내 팀 첫 자리(그 무기군의 직업)
- 기준 무기 = 그 영웅의 무기에서 죄종 줄을 다 떼고 베이스 「무기 데미지 +%」 한 줄만 남긴 것
- 변형 = 기준 + 무기 죄종 줄 하나를 **분노 단어 위끝(Lv50 최고값)** 으로 · 발동 줄은 그 무기군 풀의 스킬마다 따로
- 지표 = 그 영웅이 가한 실제 피해 합 ÷ 판 시간 합 · 기준 대비 % · 판 단위 부트스트랩 95% (`analyze.mjs`) · 마법사만은 `CLS=mage analyze_cls.mjs`
- 무기군 10개 × 씨앗 150 × 판 4 · 사제(십자가 · 성경)는 발동 「심판」이 사제 기본 피해 대비로 부풀어 표에서 뺀다

## 차림

| | 차림 1 — 챔피언 AI 팀 | 차림 2 — 완전 풀템 |
|---|---|---|
| 레벨 · 전직 · 마스터리 | Lv50 · 전직(갈래 무작위) · 포인트 다 씀(AI 가중 무작위) | 같음 |
| 장비 희귀도 | 매직 20 : 레어 80 | **레전더리만** |
| 강화 | +6 (`gear_up`) | **상한** — 건물 · 연구소를 다 지었을 때(`limitsOf().upgrade`) |
| 스킬 레벨 | 5 (`skill_up`) | **상한**(`skillCapMax`) |
| 기준 무기 베이스 | +100% (비교 변형 `base_top` = +200%) | +200%(위끝) · `base_top` 없음 |
| 상대 팀 | 같은 차림 | 같은 차림 |
| 전술 · 물약 · 영웅 등급 | 없음 · 없음 · 굴림대로 | 같음 |

## 죄종 빌드 (`SINBUILD=1`)

사용자 「각 아이템은 해당 죄종 영웅이 사용하도록해서 계산」 · 「그죄종으로 빌드를 좀 해봐 한번 B로」. 차림 1 · 2 위에 얹는다.

- 줄의 죄종마다 따로 잰다 — 재는 영웅 = **그 죄종 영웅**
- 무기 외 일곱 칸을 부위마다 **그 죄종 메인 줄이 붙을 때까지 다시 굴린다**(희귀도 가중치 · 강화 = 차림 그대로) — 죄종 마스터리 T3 의 「그 죄종 장비 6개」 조건이 열린다
- 기준 무기도 그 죄종 장비로 센다(줄 없이 죄종만) — 줄 하나를 붙였다고 6개 조건이 새로 열리는 몫이 줄 값에 안 섞이게
- 마스터리는 그 장비로 **다시 찍는다** — `arena.spendMastery` 와 같은 가중 무작위 · 주력 트리 = 죄종 트리. 원래 AI 팀은 열린 노드가 없어 10 포인트쯤 남겼는데 T3 가 열리며 다 쓴다(직업 20 · 죄종 20)
- 기준은 죄종마다 따로 · `base_top` 없음 · 같은 편 둘 · 상대 팀은 차림 그대로(죄종 빌드 아님)

## 분노 치명 빌드 (`top_crit.mjs` · 2026-11-25)

사용자 「재는법을 바꿔서 너무 정확한 수치는 아니더라도 분노빌드에서 치명타확률과 피해량을 얻었을때로 해야지」. 죄종 빌드(분노) 위에 셋을 더한다.

- 무기 외 부위의 분노 줄을 **치명 줄(Lv50 최고값)** 로 바꾼다 — 그 아이템이 가진 분노 줄 수만큼(레어 1 · 레전더리 2) · 장갑 · 목걸이는 치명 피해가 먼저(확률만 쌓으면 100% 를 넘는다) · 투구 · 반지는 확률 · 갑옷 · 신발은 그대로
- 마스터리를 다시 찍을 때 치명 노드 가중 × `CRITW`(20)
- `nocrit` = 같은 영웅에서 그 치명 줄만 뗀 판 — 「치명 몰빵 한 벌」의 값 · `crit_both` = 무기에 치명 두 줄
- `EXP=1` — 치명 확률을 0 · 1 로 눌러 고정하고 직격 몫 · 넘친 몫을 센다. **계측 사본이 필요하다** — 스냅숏 `battle.js` 의 직격 기여 줄(`if (cA) cA.dealt += real;`) 뒤에 `globalThis.__CS` 누적 한 줄을 넣는다 · 집계 `analyze_crit_leak.cjs`

## 방어구 줄 (`top_armor.mjs` · 2026-11-25)

사용자 「이제 갑옷으로 가보자」. 죄종 빌드와 같은 판에서 재는 부위만 바꾼다(`SLOT` · 기본 갑옷).

- 기준 = 그 부위에서 죄종 줄을 다 떼고 베이스 줄(`src: 'fixed'` — 방어력 +% · 갈래 특성)만 남긴 것 · 죄종 표지는 그 죄종(장비 수 조건이 안 섞이게)
- 변형 = 기준 + 그 부위 죄종 줄 하나를 Lv50 최고값으로 · 발동 줄은 스킬마다
- 무기군 10개(사제 포함 — 방어 줄이라 심판 발동이 안 섞인다) · 기록 = 가한 피해 · 받은 피해 · 살아 있던 시간(처음 쓰러진 시각 · 안 쓰러지면 판 끝) · 판 시간 · 승패
- 집계 `analyze_armor.mjs` — **승률**(%p · 무기 줄과 같은 잣대) · 생존 시간 · 쓰러진 판 · 가한 피해 · 생존 시간은 판 끝까지 산 판이 많아(기준 쓰러진 판 37~39%) 덜 민감하다

## 돌리는 법

```
# 병렬 세션이 src 를 고치는 중이면 스냅숏(src 통째 복사 + assets/art/faces/portrait_files.js)을 떠서 WV_SRC 로 넘긴다
KIT=1 WV_SRC=<스냅숏>/src node harness/top.mjs <out>/top_axe.jsonl axe 1 150 4     # 무기군마다 하나씩 동시에
node harness/analyze.mjs <out>
CLS=mage node harness/analyze_cls.mjs <out>
```

`ONLY=stat,stat` 를 주면 그 줄만 잰다. 원데이터(jsonl · 무기군당 약 0.4MB)는 저장소에 안 넣는다.

## 결과

- 차림 1 — [results_kit1.md](results_kit1.md) (저장한 하네스로 앞 측정과 같은 값 — 도끼 씨앗 1 · 2 의 48 칸 대조 일치)
- 차림 2 — [results_kit2.md](results_kit2.md)
- 차림 1 · 2 + 죄종 빌드 — [results_kit1b.md](results_kit1b.md) · [results_kit2b.md](results_kit2b.md)
- 차림 1 · 2 + 분노 치명 빌드 — [results_crit_kit1.md](results_crit_kit1.md) · [results_crit_kit2.md](results_crit_kit2.md) · 치명 새는 곳 [results_crit_leak.md](results_crit_leak.md)
- W8(R581) 무기 치명 두 줄 새 값 15% · 10% — [results_crit_w8.md](results_crit_w8.md) (죄종 빌드 · 옛 값과 같은 판)
- 갑옷 줄 — [results_armor_kit1.md](results_armor_kit1.md) · [results_armor_kit2.md](results_armor_kit2.md) (`SLOT=armor KIT=1|2 WV_SRC=<스냅숏>/src node harness/top_armor.mjs <out>/top_<무기군>.jsonl <무기군> 1 150 4` → `node harness/analyze_armor.mjs <out>`) · 체력 후보(색욕 ① 낮추기 · 오만 레벨당 체력) [results_armor_hp.md](results_armor_hp.md) · 약한 줄 후보(체력 재생 · 받는 체력 회복 · 타격 회복) [results_armor_sustain.md](results_armor_sustain.md) · 회복 조합(재생 × 받는 회복 · `top_sustain.mjs`) [results_sustain_combo.md](results_sustain_combo.md)
- 투구 줄 — [results_helmet_kit1.md](results_helmet_kit1.md) · [results_helmet_kit2.md](results_helmet_kit2.md) (`SLOT=helmet` · 같은 판) · 지금 값 다시 재기 + 후보(체력 +299 · 절대값 · 방어력 · 시기 ② 「나보다 성한 적에게 받는 피해 감소」 — 계측 사본) · 직업별 [results_helmet_1126.md](results_helmet_1126.md)
