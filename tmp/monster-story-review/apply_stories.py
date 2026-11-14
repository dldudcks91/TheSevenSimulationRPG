import csv
import io
import json
import re
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = root / 'src/data/monster.csv'
review = Path(__file__).parent
stories = {}
for chapter in range(2, 8):
    part = json.loads((review / f'ch{chapter}.json').read_text(encoding='utf-8'))
    assert len(part) == 17 and not stories.keys() & part.keys()
    stories.update(part)

raw = source.read_bytes()
text = raw.decode('utf-8-sig')
lines = text.splitlines(keepends=True)
header = next(csv.reader([lines[0]]))
rows = list(csv.DictReader(io.StringIO(text)))
assert len(lines) == len(rows) + 1, 'Expected one physical line per monster'
blank = lambda value: value.strip() in ('', '-')
missing = {r['monster_idx'] for r in rows if blank(r['story_kr']) or blank(r['story_en'])}
assert missing == stories.keys(), (missing - stories.keys(), stories.keys() - missing)
ids = {r['monster_idx'] for r in rows}
for monster_id, pair in stories.items():
    assert len(pair) == 2
    for story in pair:
        assert story and '\n' not in story and '\r' not in story
        assert not re.search(r'[�]|\{leader', story)
        assert set(re.findall(r'\{m:(\d+)(?:\|[^}]+)?\}', story)) <= ids
        assert '{' not in re.sub(r'\{m:\d+(?:\|[^}]+)?\}', '', story)

output = [lines[0]]
for original, row in zip(lines[1:], rows):
    if row['monster_idx'] not in stories:
        output.append(original)
        continue
    pair = stories[row['monster_idx']]
    for key, value in zip(('story_kr', 'story_en'), pair):
        assert blank(row[key]), f'Would replace existing {key}: {row["monster_idx"]}'
        row[key] = value
    ending = '\r\n' if original.endswith('\r\n') else '\n' if original.endswith('\n') else ''
    buffer = io.StringIO(newline='')
    writer = csv.DictWriter(buffer, fieldnames=header, lineterminator=ending)
    writer.writerow(row)
    output.append(buffer.getvalue())
result = ''.join(output)
after = list(csv.DictReader(io.StringIO(result)))
for before_row, after_row in zip(rows, after):
    for key in header:
        if key not in ('story_kr', 'story_en') or before_row['monster_idx'] not in stories:
            assert before_row[key] == after_row[key], (before_row['monster_idx'], key)
assert all(not blank(r[k]) for r in after for k in ('story_kr', 'story_en'))
source.write_bytes((b'\xef\xbb\xbf' if raw.startswith(b'\xef\xbb\xbf') else b'') + result.encode('utf-8'))
report = {
    'total': len(rows), 'added': len(stories), 'preserved': len(rows) - len(stories),
    'by_grade': dict(Counter(r['spawn_grade'] for r in rows if r['monster_idx'] in stories)),
    'by_chapter': dict(Counter(r['chapter'] for r in rows if r['monster_idx'] in stories)),
    'longest_ko': sorted(((len(s[0]), k) for k, s in stories.items()), reverse=True)[:8],
    'longest_en': sorted(((len(s[1]), k) for k, s in stories.items()), reverse=True)[:8],
}
(review / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
