"""mock.js 의 문자열 리터럴 쌍(ko: '..', en: '..')을 번역 단위로 — 읽기 전용. 같은 쌍은 한 번만."""
import os, re, json, sys
SRC = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')).replace(chr(92), '/') + '/src/ui/mock.js'
LIT = r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\""
PAIR = re.compile(r"ko:\s*(" + LIT + r")\s*,\s*en:\s*(" + LIT + r")(?!\s*,\s*zh:)")
text = open(SRC, encoding='utf-8').read()
seen, out = set(), []
for m in PAIR.finditer(text):
    ko, en = eval(m.group(1)), eval(m.group(2))
    if (ko, en) in seen:
        continue
    seen.add((ko, en))
    line = text.count('\n', 0, m.start()) + 1
    # 문맥 — 같은 줄의 앞쪽 키 이름
    ls = text.rfind('\n', 0, m.start()) + 1
    ctx = text[ls:m.start()].strip()[:60]
    out.append({'line': line, 'ctx': ctx, 'ko': ko, 'en': en})
json.dump(out, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('pairs', len(out), 'ko chars', sum(len(u['ko']) for u in out))
