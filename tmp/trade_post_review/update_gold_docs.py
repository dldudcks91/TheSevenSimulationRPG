from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ADR = '1018-교역소는-재료와-골드-중-골라-지불한다.md'


def update(path, pairs):
    file = ROOT / path
    text = file.read_text(encoding='utf-8')
    for old, new in pairs:
        assert text.count(old) == 1, (path, old[:80], text.count(old))
        text = text.replace(old, new)
    file.write_text(text, encoding='utf-8', newline='\n')


update('docs/client/INTERFACE.md', [
    ('`offers` = 선택과 다른 최하급 재료별 지불 수(`shop_trade_cost`)·보유·구매 가능 판정.', '`offers` = 선택과 다른 최하급 재료별 지불 수(`shop_trade_cost`)·보유·구매 가능 판정 + 마지막 골드 지불(`pay:gold`). 골드 비용 = 대상별 `shop_trade_gold_<id>` × 지급 수(`n`)이며 현재 골드로 가능 여부를 판정한다.'),
    ('골드·상위 재료·낙인은 대상 밖이다.', '상위 재료·낙인은 대상 밖이다. 골드는 지불만 가능하고 구매 대상에는 없다.'),
    ('최하급 재료를 다른 최하급 재료로 구매 · 거절', '최하급 재료를 다른 최하급 재료 또는 골드로 구매 · 거절'),
    ('→ `materials`(현재 보유 부족). 거절이면 상태 불변 · 구매 직전에 보유 재확인 · 성공하면 `cost` 차감 후 대상 `n`개 지급', '→ `materials`(재료 보유 부족) / `gold`(골드 부족). 거절이면 상태 불변 · 구매 직전에 보유 재확인 · 성공하면 지불 종류에 따라 재료 또는 `resources.gold`에서 `cost` 차감 후 대상 `n`개 지급'),
    ('골드·목록·시계·rng·의뢰 수집 진행은 바꾸지 않는다.', '선택하지 않은 지갑·목록·시계·rng·의뢰 수집 진행은 바꾸지 않는다.'),
])
update('docs/client/SCREEN_DESIGN.md', [
    ('선택 아래 다른 재료별 지불 재료·필요/보유 수·[구매]', '선택 아래 다른 재료와 골드의 지불 칸·가격·[구매] · 재료는 필요/보유 수, 골드는 가격 G(보유는 상단바와 툴팁)'),
    ('비율은 `balance.csv:shop_trade_cost/shop_trade_receive` 임시값', '비율은 `balance.csv:shop_trade_cost/shop_trade_receive` · 골드 가격은 `shop_trade_gold_<id>` 임시값'),
    ('가로로 나란한 지불 재료 칸의 [구매]', '가로로 나란한 지불 재료·골드 칸의 [구매]'),
])
update('docs/game_design/base_expedition_design.md', [
    ('**받을 최하급 재료를 클릭한 뒤 다른 최하급 재료로 구매한다**', '**받을 최하급 재료를 클릭한 뒤 다른 최하급 재료 또는 골드로 구매한다**'),
    ('골드 소모·상위 단계 교환·재고·시간 제한 없음', '골드 구매는 대상별 `[balance.csv:shop_trade_gold_<id>]`(한 개 가격) · 약초는 희소함을 반영한 별도 가격 · 재료 지불에는 골드 소모 없음 · 상위 단계 교환·재고·시간 제한 없음'),
    ('- **화폐는 골드 — 교환만 재료끼리다**(2026-10-28)', '- **화폐는 골드 — 교역소는 다른 재료와 골드 중 골라 지불한다**(2026-10-31)'),
])

path = ROOT / 'docs/game_design/GAME_DESIGN.md'
text = path.read_text(encoding='utf-8')
old = '**골드는 모든 행동이 먹는다 — 상단 교환만 뺀다**'
assert text.count(old) == 1
text = text.replace(old, '**골드는 모든 행동이 먹는다 — 교역소는 재료와 골드 중 지불을 고른다**')
anchor = '| 10-31 | **상단 r2 = 교역소'
assert text.count(anchor) == 1
text = text.replace(anchor, '| 10-31 | **교역소 골드 구매 추가** — 받을 최하급 재료 선택 후 다른 재료 또는 골드 지불 · 대상별 한 개 가격 `[balance.csv:shop_trade_gold_<id>]` · 약초는 별도 가격 · 부족 시 거절·선택한 지갑만 차감 (base_expedition §2-6 · ADR-1018) |\n' + anchor)
path.write_text(text, encoding='utf-8', newline='\n')

path = ROOT / ('docs/client/adr/' + ADR)
assert not path.exists()
path.write_text('''# ADR-1018 — 교역소는 재료와 골드 중 골라 지불한다

| | |
|---|---|
| **상태** | 확정 · 2026-10-31 |
| **화면** | [SCREEN_DESIGN §8-3](../SCREEN_DESIGN.md) |
| **정한 사람** | 사용자 지시 — 「골드로도 구매가능하게하자 가격은 어느정도가 적당하려나」 · 가격은 제안 임시값 |
| **대체** | ADR-1017의 재료로만 지불 |
| **대체됨** | — |

## 결정

받을 재료를 고르면 기존 재료 지불 칸 옆에 골드 지불 칸이 나타난다. 어느 지불 수단의 [구매]를 눌렀는지에 따라 그 지갑에서만 차감한다. 골드로 받을 수는 없다.

## 근거

부족한 재료를 채울 수 있도록 사용자가 골드 구매를 요청했다. 한 개 가격은 `balance.csv:shop_trade_gold_<id>`에 둔다. 초반 일반 장비의 판매가를 기준으로 철광석·목재·가루는 장비 한 개를 팔아 두 개, 약초는 한 개를 살 수 있는 수준으로 시작한다. 약초는 귀하게 둔다는 기존 방향을 반영한다. 제안 가격이므로 플레이를 보며 조정한다.

## 파급

- 재료 교환 비율·받을 재료·해금 랭크는 ADR-1017을 따른다.
- `shopTradeState.offers[].pay = gold`와 `shopTradeBuy`의 `gold` 부족 거절을 추가한다.
- 골드는 `resources.gold`, 재료는 기존 `materials`를 사용한다. 저장 형식 추가 없음.

---
*이 파일은 고치지 않는다. 결정이 뒤집히면 새 ADR이 이것을 대체한다.*
''', encoding='utf-8', newline='\n')

old_adr = 'docs/client/adr/1017-교역소는-상단-2랭크이고-받을-재료를-고른-뒤-다른-재료로-산다.md'
update(old_adr, [('| **대체됨** | — |', f'| **대체됨** | [ADR-1018]({ADR})의 골드 지불 추가가 확장 |')])
update('docs/client/SCREEN_CHANGELOG.md', [
    ('## 이력\n', '## 이력\n\n- **2026-10-31** — **§8-3 교역소 골드 구매 추가** — 재료 선택 후 다른 재료 또는 골드 지불 · 대상별 골드 가격·부족 비활성·지갑별 차감(ADR-1018).\n'),
])
