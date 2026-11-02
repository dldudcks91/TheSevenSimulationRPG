from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ADR_NAME = '1017-교역소는-상단-2랭크이고-받을-재료를-고른-뒤-다른-재료로-산다.md'


def replace(path, old, new):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if old not in text and new in text:
        return
    assert text.count(old) == 1, (path, old[:80], text.count(old))
    p.write_text(text.replace(old, new), encoding='utf-8', newline='\n')


replace('docs/game_design/base_expedition_design.md',
        'r1 = 무기 · 물약 · r2 = 방어구 · 장신구 · 스킬 도안 · r3 = 교역소(교환) · r4 = 특수상단 방문.',
        'r1 = 무기 · 물약 · r2 = 교역소(재료 구매) · r3 = 방어구 · 장신구 · 스킬 도안 · r4 = 특수상단 방문(2026-10-31 사용자).')
replace('src/game_logic/state.js', '잠긴 칸 · 상단 r2 · R390', '잠긴 칸 · 상단 r3 · 2026-10-31')
replace('docs/client/SCREEN_DESIGN.md',
        '### 8-3. 상점 탭 — 구매 · 판매 · 교역소 · 특수상단 · ⚠ 보조 창구 물건 미정',
        '### 8-3. 상점 탭 — 구매 · 판매 · 교역소 · 특수상단 · ⚠ 특수상단 물건 미정')

p = ROOT / 'docs/client/SCREEN_DESIGN.md'
text = p.read_text(encoding='utf-8')
start = text.index('> **줄은 상단 랭크가 연다**')
end = text.index(' — 맨 윗줄', start)
text = text[:start] + f'> **줄은 상단 랭크가 연다** ([ADR-1017](adr/{ADR_NAME}) · 기획 base_expedition_design §2-6 · construction_draft §2)' + text[end:]
anchor = '- [ADR-0960]'
line = next(s for s in text.splitlines() if s.startswith(anchor))
if '- [ADR-1017]' not in text:
    text = text.replace(line, line + f'\n- [ADR-1017](adr/{ADR_NAME}) 교역소는 상단 r2이고 받을 최하급 재료를 고른 뒤 다른 재료로 산다 — r3은 방어구·장신구·도안 — 2026-10-31 **(0952의 판매 줄 r2 · 0960의 교역소 r3·목업을 대체)**')
p.write_text(text, encoding='utf-8', newline='\n')

for name, scope in [
    ('0952-상단-줄은-상단-랭크가-연다-맨-윗줄은-무기와-물약이고-안-열린-칸은-자물쇠다.md', '판매 줄의 해금 랭크'),
    ('0960-상점-오른쪽-반은-위-교역소-아래-특수상단이-높이를-반씩-나눈다.md', '교역소의 해금 랭크·물음표 자리'),
]:
    path = 'docs/client/adr/' + name
    old = next(s for s in (ROOT / path).read_text(encoding='utf-8').splitlines() if s.startswith('| **대체됨** |'))
    if '[ADR-1017]' not in old:
        new = f'| **대체됨** | [ADR-1017]({ADR_NAME})의 {scope}가 대체 |' if old == '| **대체됨** | — |' else old[:-2] + f' · [ADR-1017]({ADR_NAME})의 {scope}가 대체 |'
        replace(path, old, new)

replace('docs/client/SCREEN_DESIGN.md',
        '지불할 재료 줄의 [구매]', '가로로 나란한 지불 재료 칸의 [구매]')

p = ROOT / 'docs/client/DEV_PLAN.md'
text = p.read_text(encoding='utf-8')
line = next(s for s in text.splitlines() if s.startswith('| R412 |'))
text = text.replace(line, line + '\n| R413 | **교역소 실제 구매 · 상단 r2/r3 교체** — r2 교역소·r3 방어구/장신구/도안 · 최하급 철광석·약초·목재·가루 선택 → 다른 재료 3개로 1개 구매 · `shopTradeState/shopTradeBuy` · 필요/보유·부족 비활성·재확인 · 목업/미착수 제거 | 10-31 | ✅ PASS 814/814 · 12개 지불 조합·거절 불변·저장 복원 · 한영/두 스킨/두 화면 크기 클릭 검사 57개 통과 · 오류 0 | base_expedition §2-6 · construction_draft §2 · INTERFACE §2-7 · ADR-1017 · tmp/trade_post_review/verification.json |')
p.write_text(text, encoding='utf-8', newline='\n')

p = ROOT / 'src/dev/README.md'
text = p.read_text(encoding='utf-8')
anchor = '## 장비 발동 검증'
text = text.replace(anchor, '## 교역소 검증\n\n별도 서버 `python serve.py 8843`을 켠 뒤 `python scripts/verify_trade_post.py --port 8843`을 실행한다. 전체 회귀와 상단 r1/r2/r3 해금, 받을 재료 선택·해제·키보드 조작, 지불 재료별 부족/정확한 차감·지급·저장 복원을 한영·두 스킨·두 화면 크기로 확인한다. 결과와 화면은 `tmp/trade_post_review/`에 남는다.\n\n' + anchor, 1)
p.write_text(text, encoding='utf-8', newline='\n')

for file in [
    'docs/client/SCREEN_DESIGN.md', 'docs/client/INTERFACE.md',
    'docs/game_design/base_expedition_design.md', 'docs/game_design/construction_draft.md',
    'docs/game_design/GAME_DESIGN.md',
]:
    p = ROOT / file
    lines = p.read_text(encoding='utf-8').splitlines(keepends=True)
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].startswith('*마지막 업데이트:'):
            lines[i] = '*마지막 업데이트: 2026-10-31*\n'
            break
    p.write_text(''.join(lines), encoding='utf-8', newline='\n')
