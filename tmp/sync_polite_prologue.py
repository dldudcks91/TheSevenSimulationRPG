import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
before = Path('C:/Users/ANGAME~1/AppData/Local/Temp/theseven_polite_i18n_before_20261030.js').read_text(encoding='utf-8')
after = (ROOT / 'src/ui/i18n.js').read_text(encoding='utf-8')
path = ROOT / 'docs/game_design/story/prologue.md'
raw = path.read_bytes()
text = raw.decode('utf-8').replace('\r\n', '\n')


def value(source, key):
    match = re.search(r"'" + re.escape(key) + r"':\s*\{\s*ko:\s*(.*?),\s*en:", source, re.S)
    assert match, key
    literals = re.findall(r"'(?:\\.|[^'\\])*'", match.group(1))
    return ''.join(ast.literal_eval(literal) for literal in literals)


for key in [f'pro.s{i}.b' for i in range(1, 6)] + ['pro.s5.q']:
    old, new = value(before, key), value(after, key)
    assert text.count(old) == 1, key
    text = text.replace(old, new)

old_note = '> **글만 가져왔다** — 원본에 있던 연출 지시(암전 배경 · 픽셀아트 컷씬 · 씬별 일러스트)는 걷어냈다. 본작의 전달 방식은 텍스트다'
new_note = old_note + ' · 한국어 문체는 [화면 말투 규칙](../../client/SCREEN_DESIGN.md)에 맞춰 존댓말로 정리했다'
assert text.count(old_note) == 1
text = text.replace(old_note, new_note)
text = text.replace('- 인간을 "이것들"로 지칭 — 아직 동등한 존재로 보지 않음', '- 인간을 아직 동등한 존재로 보지 않음')
text = text.replace('*마지막 업데이트: 2026-10-22*', '*마지막 업데이트: 2026-10-30*')
path.write_bytes(text.replace('\n', '\r\n').encode('utf-8') if b'\r\n' in raw else text.encode('utf-8'))
print('Synced 5 prologue scenes and 1 quotation with the Korean display text.')
