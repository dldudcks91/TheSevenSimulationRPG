from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
old_name = '1018-교역소는-재료와-골드-중-골라-지불한다.md'
old = (ROOT / 'docs/client/adr' / old_name).resolve()
numbers = [int(p.name[:4]) for p in old.parent.glob('[0-9][0-9][0-9][0-9]-*.md')]
number = max(numbers) + 1
new_name = f'{number:04d}-교역소는-재료와-골드-중-골라-지불한다.md'
target = (old.parent / new_name).resolve()
assert old.is_relative_to(ROOT) and target.is_relative_to(ROOT)
assert not target.exists()
old.rename(target)
text = target.read_text(encoding='utf-8')
text = text.replace('# ADR-1018 —', f'# ADR-{number:04d} —', 1)
target.write_text(text, encoding='utf-8', newline='\n')

for file in [
    'docs/client/SCREEN_DESIGN.md',
    'docs/client/adr/1017-교역소는-상단-2랭크이고-받을-재료를-고른-뒤-다른-재료로-산다.md',
]:
    p = ROOT / file
    lines = p.read_text(encoding='utf-8').splitlines(keepends=True)
    for i, line in enumerate(lines):
        if old_name in line:
            lines[i] = line.replace(old_name, new_name).replace('ADR-1018', f'ADR-{number:04d}')
    p.write_text(''.join(lines), encoding='utf-8', newline='\n')

for file in ['docs/client/SCREEN_CHANGELOG.md', 'docs/game_design/GAME_DESIGN.md']:
    p = ROOT / file
    lines = p.read_text(encoding='utf-8').splitlines(keepends=True)
    for i, line in enumerate(lines):
        if '교역소 골드 구매 추가' in line:
            lines[i] = line.replace('ADR-1018', f'ADR-{number:04d}')
    p.write_text(''.join(lines), encoding='utf-8', newline='\n')

p = ROOT / 'docs/client/DEV_PLAN.md'
text = p.read_text(encoding='utf-8')
rows = [s for s in text.splitlines() if re.match(r'^\| R\d+ \|', s)]
last = max(rows, key=lambda s: int(re.match(r'^\| R(\d+) \|', s).group(1)))
record = int(re.match(r'^\| R(\d+) \|', last).group(1)) + 1
entry = f'| R{record} | **교역소 골드 구매** — 최하급 재료별 `shop_trade_gold_<id>` · 다른 재료와 골드 중 지불 선택 · 필요 지갑만 차감 · 골드 부족 재확인·옛 재료 지갑 호환 · 가격은 제안 임시값 | 10-31 | ✅ PASS 815/815 · 네 재료 골드 구매·정확 잔액·부족 거절 불변·저장 복원 · 한영·두 스킨·두 크기 UI 69개 통과 · 오류 0 | base_expedition §2-6 · item_design §5-1 · INTERFACE §2-7 · ADR-{number:04d} · tmp/trade_post_review/verification.json |'
text = text.replace(last, last + '\n' + entry, 1)
p.write_text(text, encoding='utf-8', newline='\n')
print(f'ADR-{number:04d}, R{record}')
