"""덩어리 사이 일관성 — python consistency.py [report.json]
① 이름: CSV 이름 열(ko → zh)이 다른 문장의 ko 에 나오면 그 문장의 zh 에도 같은 zh 이름이 있어야 한다
② 용어: 용어집 §1 ~ §3 의 ko → zh 가 ko 에 나오면 zh 에도 있어야 한다
결과 = 어긋난 (용어, 문장 key, ko 조각, zh 조각) 목록 · 용어별 개수"""
import glob, json, os, re, sys
B = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')).replace(chr(92), '/') + '/'
src, out = {}, {}
for p in glob.glob(f'{B}/chunks/*.in.json'):
    for u in json.load(open(p, encoding='utf-8')):
        src[u['key']] = u
for p in glob.glob(f'{B}/chunks/*.out.json'):
    out.update(json.load(open(p, encoding='utf-8')))
NAME_COLS = {'name', 'monster_name', 'stage_name', 'group'}
names = {}
for k, u in src.items():
    if k.startswith('csv|') and k in out:
        col = k.split('|')[3]
        if col in NAME_COLS and len(u['ko']) >= 2 and '{' not in u['ko'] and out[k] not in ('', '-'):
            names.setdefault(u['ko'], set()).add(out[k])
# 용어집 표 — ko 칸과 zh 칸을 ' · ' 로 나눠 짝짓는다(개수가 같을 때만)
terms = {}
g = open(REPO + 'docs/client/LOCALIZATION_ZH_GLOSSARY.md', encoding='utf-8').read()
for line in g.split('\n'):
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    if len(cells) < 3 or cells[0] in ('한국어', '---') or set(cells[0]) <= set('-'):
        continue
    ko = [re.sub(r'\(.*?\)', '', x).strip() for x in cells[0].split(' · ')]
    zh = [re.sub(r'\(.*?\)', '', x).strip() for x in cells[2].split(' · ')]
    if len(ko) == len(zh):
        for a, b in zip(ko, zh):
            if len(a) >= 2 and a and b and not a.startswith('~'):
                terms.setdefault(a, set()).add(b)
bad = []
for k, u in src.items():
    zh = out.get(k)
    if not zh or zh == '-':
        continue
    ko = u['ko']
    for table, kind in ((names, '이름'), (terms, '용어')):
        for a, bs in table.items():
            if a in ko and ko.strip() != a and not any(b in zh for b in bs):
                # 더 긴 이름 안에 든 경우(「스켈레톤」 ⊂ 「스켈레톤 기사」)는 긴 쪽이 맞으면 넘어간다
                longer = [x for x in table if a in x and x != a and x in ko]
                if longer and any(any(b in zh for b in table[x]) for x in longer):
                    continue
                i = ko.find(a)
                bad.append({'kind': kind, 'term': a, 'want': sorted(bs), 'key': k, 'ko': ko[max(0, i - 15):i + len(a) + 15], 'zh': zh[:80]})
from collections import Counter
cnt = Counter((b['kind'], b['term']) for b in bad)
print(f'어긋남 {len(bad)} · 용어 {len(cnt)}')
for (kind, t), n in cnt.most_common(60):
    want = next(b['want'] for b in bad if b['term'] == t)
    print(f'{n:4d} {kind} {t} → {"/".join(want)}')
if len(sys.argv) > 1:
    json.dump(bad, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
