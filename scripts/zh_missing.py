"""간체(zh)가 빠진 문구 목록 — docs/client/LOCALIZATION_ZH.md D5(새 문구는 ko · en 만 써도 된다 · zh 는 몰아서).

  python scripts/zh_missing.py            # 개수만
  python scripts/zh_missing.py --list     # 빠진 항목 전부 (사전 키 · CSV 파일:행 id:열 · mock 쌍)

범위 = 화면에 나오는 문구 — `src/ui/i18n.js` 사전 · CSV 의 `<열>_kr`/`<열>_en` 쌍(설계자 메모 열 · `hero_unique_candidates.csv` 제외) · `src/ui/mock.js` 의 문자열 쌍.
CSV 에 `<열>_zh` 열이 아직 없으면 그 열 전체가 빠진 것으로 센다. 원문이 `-`(없음)인 칸은 세지 않는다.
"""
import csv, glob, io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
SKIP_CSV = {'hero_unique_candidates.csv'}
LIT = r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"|`(?:[^`\\]|\\.)*`"


def dict_missing():
    text = open(os.path.join(SRC, 'ui', 'i18n.js'), encoding='utf-8').read()
    body = text[text.index('const STRINGS = {'):]
    out = []
    for m in re.finditer(r"(?m)^[ \t]*'([^']+)'\s*:\s*\{", body):
        i, depth, j = m.end() - 1, 0, m.end() - 1
        while j < len(body):            # 항목의 짝 괄호까지 (문자열 안의 괄호는 건너뛴다)
            c = body[j]
            if c in '\'"`':
                q = c; j += 1
                while j < len(body) and body[j] != q:
                    j += 2 if body[j] == '\\' else 1
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        if not re.search(r'(^|[\s,{])zh\s*:', body[i:j + 1]):
            out.append(m.group(1))
    return out


def csv_missing():
    out = []
    for p in sorted(glob.glob(os.path.join(SRC, 'data', '*.csv'))):
        name = os.path.basename(p)
        if name in SKIP_CSV:
            continue
        rows = list(csv.reader(io.StringIO(open(p, encoding='utf-8-sig').read())))
        if not rows:
            continue
        head = rows[0]
        for st in [h[:-3] for h in head if h.endswith('_en') and h[:-3] + '_kr' in head]:
            kr, zh = head.index(st + '_kr'), head.index(st + '_zh') if st + '_zh' in head else None
            for r in rows[1:]:
                if not r or kr >= len(r) or r[kr] in ('', '-'):
                    continue
                if zh is None or zh >= len(r) or r[zh] == '':
                    out.append(f'{name}:{r[0]}:{st}_zh')
    return out


def mock_missing():
    text = open(os.path.join(SRC, 'ui', 'mock.js'), encoding='utf-8').read()
    pair = re.compile(r"ko:\s*(" + LIT + r")\s*,\s*en:\s*(" + LIT + r")(?!\s*,\s*zh:)")
    return [f'mock.js:{text.count(chr(10), 0, m.start()) + 1} {m.group(1)}' for m in pair.finditer(text)]


def main():
    groups = {'사전': dict_missing(), 'CSV': csv_missing(), 'mock': mock_missing()}
    total = sum(len(v) for v in groups.values())
    print(f"zh 빠짐 {total} — " + ' · '.join(f'{k} {len(v)}' for k, v in groups.items()))
    if '--list' in sys.argv:
        for k, v in groups.items():
            for x in v:
                print(f'{k}\t{x}')


if __name__ == '__main__':
    main()
