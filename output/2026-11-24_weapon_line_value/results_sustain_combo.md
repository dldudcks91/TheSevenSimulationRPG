# 회복 조합 — 체력 재생 × 받는 체력 회복 (top_sustain.mjs · 2026-11-25)

사용자 「받는체력회복을 어디에 넣을지 고민도 좀 해보자」. 색욕 빌드 영웅의 갑옷 · 신발 · 반지(첫째) · 목걸이를 베이스 줄만 남긴 판(기준)에 조합마다 Lv50 최고값 줄을 붙인다 — 재생 = 초당 20(R584) · 받는 체력 회복 = 17%(목걸이 색욕 ③ 최고값). 스냅숏 = HEAD src + R581 · R582 · R584 CSV · 무기군 10 × 씨앗 150 × 판 4.

## 차림 1
판 1500 행 × K · 기준 승률 52.2% · 기준 쓰러진 판 39.3%

| 변형 | 값 | 승률 | 95% | 생존 시간 | 95% | 쓰러진 판 | 가한 피해 | 판 |
|---|---|---|---|---|---|---|---|---|
| regen_x3_amulet_recv | hp_regen+hp_regen+hp_regen+hp_recovery_pct | +3.2%p | +2.5%p ~ +3.7%p | +17.3% | +13.7% ~ +21.5% | -6.8%p | +1.8% | 1500 |
| regen_x2_recv_x2 | hp_regen+hp_regen+hp_recovery_pct+hp_recovery_pct | +2.7%p | +2.0%p ~ +3.2%p | +15.3% | +12.3% ~ +19.7% | -5.9%p | +2.5% | 1500 |
| regen_x3 | hp_regen+hp_regen+hp_regen | +2.6%p | +2.0%p ~ +3.2%p | +14.1% | +11.6% ~ +18.0% | -5.9%p | +2.4% | 1500 |
| regen_x1_recv_x3 | hp_regen+hp_recovery_pct+hp_recovery_pct+hp_recovery_pct | +1.8%p | +1.1%p ~ +2.1%p | +12.1% | +9.4% ~ +16.9% | -4.1%p | +1.5% | 1500 |
| armor_regen_amulet_recv | hp_regen+hp_recovery_pct | +1.4%p | +0.9%p ~ +1.6%p | +8.0% | +6.1% ~ +11.9% | -2.8%p | +0.5% | 1500 |
| armor_regen | hp_regen | +1.0%p | +0.7%p ~ +1.3%p | +5.1% | +3.8% ~ +7.3% | -2.0%p | +0.1% | 1500 |
| amulet_recv | hp_recovery_pct | +0.3%p | +0.1%p ~ +0.4%p | +1.6% | +0.8% ~ +3.5% | -0.5%p | +0.7% | 1500 |

## 차림 2
판 1500 행 × K · 기준 승률 48.3% · 기준 쓰러진 판 44.0%

| 변형 | 값 | 승률 | 95% | 생존 시간 | 95% | 쓰러진 판 | 가한 피해 | 판 |
|---|---|---|---|---|---|---|---|---|
| regen_x3_amulet_recv | hp_regen+hp_regen+hp_regen+hp_recovery_pct | +2.5%p | +2.1%p ~ +2.8%p | +11.1% | +6.8% ~ +14.7% | -5.4%p | +2.7% | 1500 |
| regen_x2_recv_x2 | hp_regen+hp_regen+hp_recovery_pct+hp_recovery_pct | +2.0%p | +1.5%p ~ +2.3%p | +8.6% | +5.7% ~ +12.4% | -4.7%p | +3.2% | 1500 |
| regen_x3 | hp_regen+hp_regen+hp_regen | +1.9%p | +1.4%p ~ +2.2%p | +8.5% | +4.8% ~ +11.9% | -4.5%p | +3.2% | 1500 |
| regen_x1_recv_x3 | hp_regen+hp_recovery_pct+hp_recovery_pct+hp_recovery_pct | +1.5%p | +1.1%p ~ +1.7%p | +7.3% | +4.3% ~ +10.7% | -3.2%p | +2.2% | 1500 |
| armor_regen_amulet_recv | hp_regen+hp_recovery_pct | +0.9%p | +0.5%p ~ +1.1%p | +4.4% | +2.4% ~ +5.7% | -2.2%p | +1.7% | 1500 |
| armor_regen | hp_regen | +0.8%p | +0.5%p ~ +0.9%p | +2.6% | +1.9% ~ +3.9% | -1.5%p | +1.5% | 1500 |
| amulet_recv | hp_recovery_pct | +0.2%p | +0.1%p ~ +0.4%p | +0.8% | -0.1% ~ +1.2% | -0.3%p | +0.4% | 1500 |
