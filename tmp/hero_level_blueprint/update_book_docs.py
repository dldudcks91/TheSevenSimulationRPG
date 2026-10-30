from pathlib import Path

changes = {
    'docs/game_design/skill_design.md': [
        ('도안 한 장을 무작위로 받는다. 영웅당 한 번이며 이후 레벨 구간마다 반복하지 않는다. 책은 도서관에서 제작한다', '스킬북 한 권을 무작위로 바로 받는다. 영웅당 한 번이며 이후 레벨 구간마다 반복하지 않는다. 이 보상은 약초·골드·가루 없이 바로 배운다'),
        ('해당 직업의 1티어 도안 한 장을 한 번 받는다', '해당 직업의 1티어 스킬북 한 권을 한 번 받는다'),
        ('**무작위 도안 한 장**. 원정·훈련 모두 적용하며 한 번에 문턱을 넘어도 한 장만 준다. 저장·재접속과 이후 레벨업은 다시 주지 않고 기존 문턱 이상 영웅은 소급하지 않는다', '**무작위 스킬북 한 권**. 원정·훈련 모두 적용하며 한 번에 문턱을 넘어도 한 권만 준다. 제작 재화 없이 바로 배운다. 저장·재접속과 이후 레벨업은 다시 주지 않는다. 옛 원정 레벨 보상 기록과 미사용 도안이 남아 있으면 같은 스킬북으로 교환한다'),
        ('책이 생기는 곳은 여기 하나다(10-20)', '일반 책은 여기서 만들며 첫 책 사용 레벨 보상은 완성된 스킬북을 바로 준다'),
    ],
    'docs/game_design/base_expedition_design.md': [
        ('새 스킬의 도안은 처치 · 상단과 영웅별 첫 책 사용 레벨 달성 보상으로 얻는다', '새 스킬의 도안은 처치 · 상단에서 얻고, 영웅별 첫 책 사용 레벨 달성 보상은 완성된 스킬북 한 권이다'),
    ],
    'docs/game_design/construction_draft.md': [
        ('책이 생기는 곳은 여기 하나 — 2026-10-20', '일반 책은 여기서 제작하고 영웅별 첫 책 사용 레벨에는 완성된 스킬북을 바로 받는다'),
    ],
    'docs/client/INTERFACE.md': [
        ('책이 생기는 곳은 도서관 하나다', '일반 책은 도서관에서 제작하고 첫 책 사용 레벨 보상은 스킬북을 직접 준다'),
    ],
}
for filename, replacements in changes.items():
    path = Path(filename)
    with path.open(encoding='utf-8', newline='') as f:
        content = f.read()
    for old, new in replacements:
        assert old in content, (filename, old)
        content = content.replace(old, new, 1)
    with path.open('w', encoding='utf-8', newline='') as f:
        f.write(content)

rows = {
    'docs/game_design/GAME_DESIGN.md': ('| 10-30 | **영웅별 첫 책 사용 레벨에 도안 한 장을 한 번만 지급한다**', '| 10-30 | **영웅별 첫 책 사용 레벨에 스킬북 한 권을 한 번만 지급한다** [사용자 지시] — `[balance.csv:skillbook_learn_level]` 도달 시 해당 직업의 책으로 만들 수 있는 1티어 중 고유 스킬을 제외하고 무작위 한 권 · 약초·골드·가루 없이 바로 배우기 · 이후 반복 없음 (skill_design §2-1 · INTERFACE 첫 스킬북 계약) |'),
    'docs/client/DEV_PLAN.md': ('| R411 |', '| R411 | **영웅별 첫 책 사용 레벨 스킬북 보상** — 해당 직업의 책으로 만들 수 있는 1티어 중 고유 제외 한 권 · 영웅마다 한 번 · 원정·훈련·관리자 생성 공통 · 독립 시드 · 원정 `books`·연구소 `books` 반환 · 약초·골드 없이 배우기 · 기록과 미사용 도안이 남은 옛 원정 보상 교환 · 세이브 버전 유지 | 10-30 | ✅ PASS 809/809 · 재료 없는 학습·직업 후보·다중 레벨업·정산 분할·저장 복원·중복 방지·옛 도안 교환 통과 | skill_design §2-1 · GAME_DESIGN §9 · INTERFACE 첫 스킬북 계약 · ADR-1012 · tmp/hero_level_blueprint |'),
}
for filename, (prefix, replacement) in rows.items():
    path = Path(filename)
    with path.open(encoding='utf-8', newline='') as f:
        content = f.read()
    old = next(line for line in content.splitlines() if line.startswith(prefix))
    content = content.replace(old, replacement, 1)
    with path.open('w', encoding='utf-8', newline='') as f:
        f.write(content)
print('Book reward design and contracts updated.')
