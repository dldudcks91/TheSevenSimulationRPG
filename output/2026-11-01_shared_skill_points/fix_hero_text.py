from pathlib import Path
p=Path(__file__).resolve().parents[2]/'docs/game_design/hero_design.md'
lines=p.read_text(encoding='utf-8').splitlines(keepends=True)
found=False
for i,line in enumerate(lines):
    if line.startswith('  - **레벨이 주는 것은 체력 · 적중 · 공용 스킬 포인트 · 자격**'):
        lines[i]='  - **레벨이 주는 것은 체력 · 적중 · 공용 스킬 포인트 · 자격** [2026-11-01 포인트 규칙 정정] — 체력 = 최대 HP 성장과 레벨업 순간 가득 회복 · 적중 = 레벨 차(battle_design.md §9-4). 스킬 포인트는 매 레벨업 지급하며 죄종·직업 마스터리와 전직 메인·꼬리가 공유한다. 전직 시 별도 포인트는 없다. 자격 = 마스터리 T2 · 스킬북 · T3 · 전직 · 메인 단계의 해금. 메인 단계만 `[balance.csv:advance_skill_level_interval]` 간격으로 열린다. 일반 영웅의 기본 능력치와 무기 데미지가 레벨업만으로 증가하는 것은 아니다. 세기는 장비·포인트 배분·스킬 레벨로 만든다 (skill_design.md §4).\n'
        found=True
assert found
p.write_text(''.join(lines),encoding='utf-8',newline='')
