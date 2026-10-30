import collections
import csv
import io
import pathlib
import re

root = pathlib.Path('src/data')
backup = pathlib.Path('tmp/polite_data_before')
allowed = {
    'advance.csv': {'desc_kr'},
    'advance_node.csv': {'desc_kr'},
    'class.csv': {'role_text_kr'},
    'monster.csv': {'story_kr'},
    'stage.csv': {'story_kr'},
    'explore_spot.csv': {'story_kr'},
    'explore_story.csv': {'text_kr'},
    'mastery_node.csv': {'name_kr'},
}
counts = collections.Counter()
for source in backup.glob('*.csv'):
    dest = root / source.name
    old = list(csv.reader(io.StringIO(source.read_text(encoding='utf-8-sig'))))
    new = list(csv.reader(io.StringIO(dest.read_text(encoding='utf-8-sig'))))
    assert old[0] == new[0], source.name
    assert len(old) == len(new), source.name
    for i, (before, after) in enumerate(zip(old[1:], new[1:]), 2):
        assert len(before) == len(after), (source.name, i)
        if before != after:
            assert len(after) == len(old[0]), (source.name, i)
        for field, a, b in zip(old[0], before, after):
            if a == b:
                continue
            assert field in allowed.get(source.name, set()), (source.name, i, field)
            assert re.findall(r'\{[^{}]+\}', a) == re.findall(r'\{[^{}]+\}', b), (source.name, i)
            assert a.count(r'\n') == b.count(r'\n'), (source.name, i)
            assert '요요' not in b, (source.name, i)
            counts[source.name] += 1
print('CSV headers, rows, field counts, English, numeric rules, IDs, placeholders and story line breaks preserved.')
print('Changed Korean display cells:', sum(counts.values()))
print(dict(counts))
