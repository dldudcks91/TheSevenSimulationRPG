from pathlib import Path

path = Path('docs/client/SCREEN_DESIGN.md')
text = path.read_text(encoding='utf-8')
assert text.count('보유/필요') == 7, text.count('보유/필요')
assert text.count('보유 / 필요') == 1
text = text.replace('보유/필요', '필요/보유').replace('보유 / 필요', '필요 / 보유')
old = '(`30/20` — ADR-0397)'
new = '(`20/30` — [ADR-1176](adr/1176-비용의-자원-수량은-필요량-보유량-순서다.md))'
assert text.count(old) == 1
text = text.replace(old, new)
old = '[ADR-1175](adr/1175-교역소-재료-수량도-보유-필요-순서로-표시한다.md)'
new = '[ADR-1176](adr/1176-비용의-자원-수량은-필요량-보유량-순서다.md)'
assert text.count(old) == 1
text = text.replace(old, new)
path.write_text(text, encoding='utf-8', newline='')
