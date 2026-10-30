import collections
import csv
import json
import pathlib
import re

root = pathlib.Path('src/data')
backup = pathlib.Path('tmp/polite_data_before')
backup.mkdir(parents=True, exist_ok=True)
for p in root.glob('*.csv'):
    dest = backup / p.name
    if not dest.exists():
        dest.write_bytes(p.read_bytes())

target_fields = {
    'advance.csv': {'desc_kr'},
    'advance_node.csv': {'desc_kr'},
    'class.csv': {'role_text_kr'},
    'monster.csv': {'story_kr'},
    'stage.csv': {'story_kr'},
    'explore_spot.csv': {'story_kr'},
    'explore_story.csv': {'text_kr'},
    'mastery_node.csv': {'name_kr'},
}
special_words = {
    '아니다': '아닙니다',
    '봉화대다': '봉화대입니다',
    '천사다': '천사입니다',
    '부하다': '부하입니다',
    '자다': '자입니다',
    '아스클레피오스다': '아스클레피오스입니다',
}
phrases = {
    '그때의 너였다면': '그때의 당신이었다면',
    '남을 앞세우는구나': '남을 앞세우는군요',
    '“그래,': '“그래요,',
    '네가 올 줄': '당신이 올 줄',
    '필요도 없었지': '필요도 없었지요',
    '달라질 수 있을까': '달라질 수 있을까요',
    '멈출 테냐': '멈출 겁니까',
    '저것을 원하는가': '저것을 원하는 걸까요',
    '오래 걸렸구나': '오래 걸렸군요',
    '내 궁전은 마음에 들었나': '제 궁전은 마음에 들었나요',
    '“왔구나': '“오셨군요',
    '쌓다 흩어졌지': '쌓다 흩어졌지요',
    '나는 혼자라': '저는 혼자라',
    '나는 일흔일곱 배로': '저는 일흔일곱 배로',
    '시간은 돈이다': '시간은 돈',
}
terminal = re.compile(r'[가-힣]+다(?=[.!?。…”’"(]|\\n|\s+—|$)')
conversions = collections.Counter()

def polite_word(m):
    word = m.group()
    if word.endswith('니다') and word != '아니다':
        return word
    if word in special_words:
        result = special_words[word]
    elif word.endswith('이다'):
        result = word[:-2] + '입니다'
    elif word.endswith('는다'):
        result = word[:-2] + '습니다'
    else:
        stem = word[:-1]
        syllable = ord(stem[-1]) - 0xac00
        jong = syllable % 28
        if jong == 4:  # Present declarative -ㄴ다: 간다 -> 갑니다.
            result = stem[:-1] + chr(ord(stem[-1]) - 4 + 17) + '니다'
        elif jong == 0:
            result = stem[:-1] + chr(ord(stem[-1]) + 17) + '니다'
        else:
            result = stem + '습니다'
    conversions[(word, result)] += 1
    return result

changed = []
for filename, fields in target_fields.items():
    p = root / filename
    original = p.read_bytes()
    text = original.decode('utf-8-sig')
    lines = text.splitlines(keepends=True)
    header = next(csv.reader([lines[0]]))
    for lineno in range(1, len(lines)):
        line = lines[lineno]
        values = next(csv.reader([line]))
        for field in fields:
            col = header.index(field)
            value = values[col]
            replacement = value.replace('지요요', '지요').replace('까요요', '까요')
            for old, new in phrases.items():
                replacement = re.sub(re.escape(old) + r'(?![가-힣])', lambda m: new, replacement)
            replacement = terminal.sub(polite_word, replacement)
            if replacement != value:
                old_encoded = value.replace('"', '""')
                new_encoded = replacement.replace('"', '""')
                assert old_encoded in line, (filename, lineno, field)
                line = line.replace(old_encoded, new_encoded, 1)
                changed.append((filename, lineno + 1, field, value, replacement))
        lines[lineno] = line
    result = ''.join(lines).encode('utf-8')
    if original.startswith(b'\xef\xbb\xbf'):
        result = b'\xef\xbb\xbf' + result
    p.write_bytes(result)

report = pathlib.Path('tmp/polite_data_changes.json')
report.write_text(json.dumps(changed, ensure_ascii=False, indent=2), encoding='utf-8')
print('Changed cells:', len(changed))
print('Changed per file:', collections.Counter(row[0] for row in changed))
print('Changed endings:', sum(conversions.values()))
print('\n'.join(f'{a} -> {b}: {n}' for (a, b), n in conversions.items()))
