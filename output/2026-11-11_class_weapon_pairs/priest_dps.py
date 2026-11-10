# -*- coding: utf-8 -*-
"""사제 십자가 vs 성경 — mage_dps.py 의 칸 충전 셈에 사제 스킬을 넣었다. 회복은 회복량 · 검은사제는 고정 피해(무기 굴림 · 배율을 그대로 받는다)."""
import os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mage_dps.py'), encoding='utf-8').read().split('if __name__')[0])
SK.update({'heal': (1.6, 10), 'cure': (3.0, 8), 'bene': (2.4, 24), 'judg': (0.7, 9), 'puni': (0.56, 16), 'excom': (1.04, 18)})
BUILDS.clear(); BUILDS.update({'비숍 회복량 (힐링 라이트 · 힐 · 베네딕션)': ['heal', 'cure', 'bene'], '검은사제 피해 (심판 · 천벌 · 파문)': ['judg', 'puni', 'excom']})
compare('지금 — 십자가 2.7 ×1 · 성경 3.5 ×1 (성경 기준)', (2.7, 1.0, 0.08), (3.5, 1.0, 0.12), cdrs=(0.0, 0.3), lvs=(50,))
compare('기사 숫자(대화 중 안) — 성경 3.7 ×1.3', (2.7, 1.0, 0.08), (3.7, 1.3, 0.12), cdrs=(0.0, 0.3, 0.5), lvs=(50,))
compare('11-11 — 성경 3.7 ×1 (버프 · 디버프 특성이 대신한다)', (2.7, 1.0, 0.08), (3.7, 1.0, 0.12), cdrs=(0.0, 0.3), lvs=(50,))
