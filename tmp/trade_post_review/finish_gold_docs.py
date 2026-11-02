from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def update(path, pairs):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    for old, new in pairs:
        assert text.count(old) == 1, (path, old[:70], text.count(old))
        text = text.replace(old, new)
    p.write_text(text, encoding='utf-8', newline='\n')


update('src/ui/i18n.js', [
    ("ko: '다른 재료로 구매하기'", "ko: '재료 또는 골드로 구매하기'"),
    ("en: 'Buy with other materials'", "en: 'Buy with materials or gold'"),
    ('다른 재료별 필요 수와 보유량이 나타납니다.', '다른 재료별 필요 수·보유량과 골드 가격이 나타납니다.'),
    ('골드는 들지 않고 시간이나 재고 제한도 없습니다.', '재료로 지불할 때는 골드가 들지 않습니다. 골드 구매는 골드만 소모하며 재료별 가격이 다르고 약초가 더 비쌉니다. 시간이나 재고 제한은 없습니다.'),
    ('Each other material shows its required and owned amounts.', 'Other materials show their required and owned amounts, and a gold option shows its price.'),
    ('Purchases require enough payment materials, cost no gold and have no timer or stock limit.', 'Choose a material payment or gold. Only the selected currency is spent, and you must have enough of it. Gold prices vary by material, with herbs priced higher. Purchases have no timer or stock limit.'),
])
update('docs/game_design/item_design.md', [
    ('**골드는 모든 행동이 먹는다 — 상단 교환만 뺀다** [2026-09-24 · 교환 2026-10-28]', '**골드는 모든 행동이 먹는다 — 교역소는 재료와 골드 중 지불을 고른다** [2026-10-31]'),
])

p = ROOT / 'docs/client/SCREEN_DESIGN.md'
text = p.read_text(encoding='utf-8')
line = next(s for s in text.splitlines() if s.startswith('- [ADR-1017]'))
text = text.replace(line, line + '\n- [ADR-1018](adr/1018-교역소는-재료와-골드-중-골라-지불한다.md) 교역소는 다른 최하급 재료 또는 골드로 구매한다 — 골드 가격은 대상별 CSV 임시값 — 2026-10-31')
p.write_text(text, encoding='utf-8', newline='\n')

p = ROOT / 'src/dev/README.md'
text = p.read_text(encoding='utf-8')
old = '지불 재료별 부족/정확한 차감·지급·저장 복원을 한영'
assert text.count(old) == 1
text = text.replace(old, '재료·골드 지불별 부족/정확한 차감·지급·대상별 가격·저장 복원을 한영')
p.write_text(text, encoding='utf-8', newline='\n')

p = ROOT / 'docs/game_design/item_design.md'
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)
for i in range(len(lines) - 1, -1, -1):
    if lines[i].startswith('*마지막 업데이트:'):
        lines[i] = '*마지막 업데이트: 2026-10-31*\n'
        break
p.write_text(''.join(lines), encoding='utf-8', newline='\n')
