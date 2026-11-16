"""번역 결과를 저장소에 붙인다 — python apply_zh.py [--dry] [chunk ...]
 - ui|<key>   → src/ui/i18n.js 의 그 키 항목에 zh 칸(없을 때만)
 - csv|f|id|col|ko → src/data/<f> 의 <col>_en 바로 오른쪽 <col>_zh 열(없으면 만든다) · 행은 첫 열 id + <col>_kr 원문으로 찾는다
 - mock|ko\ten → src/ui/mock.js 의 그 ko/en 문자열 쌍 뒤에 zh(없을 때만)
줄 끝(CRLF/LF) · BOM 을 그대로 둔다. 파일마다 읽은 직후 바로 쓴다(병렬 세션)."""
import csv, glob, io, json, os, re, sys
B = os.path.dirname(os.path.abspath(__file__))
REPO = next((a[7:] for a in sys.argv if a.startswith('--repo=')), os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')).replace(chr(92), '/') + '/')
dry = '--dry' in sys.argv
names = [a for a in sys.argv[1:] if not a.startswith('--')] or [os.path.basename(p)[:-9] for p in glob.glob(f'{B}/chunks/*.out.json')]
T = {}
for n in names:
    p = f'{B}/chunks/{n}.out.json'
    if os.path.exists(p):
        T.update(json.load(open(p, encoding='utf-8')))
ui = {k[3:]: v for k, v in T.items() if k.startswith('ui|')}
mock = {k[5:]: v for k, v in T.items() if k.startswith('mock|')}
csvt = {k[4:]: v for k, v in T.items() if k.startswith('csv|')}
print(f'translations: ui {len(ui)} · mock {len(mock)} · csv {len(csvt)}')


def js_lit(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('\r', '').replace('\n', '\\n') + "'"


def scan_close(text, i):
    """text[i] == '{' → 짝 '}' 의 위치 (문자열 · 주석 건너뜀)"""
    depth, n = 0, len(text)
    while i < n:
        c = text[i]
        if c in '\'"`':
            q = c; i += 1
            while i < n and text[i] != q:
                i += 2 if text[i] == '\\' else 1
        elif c == '/' and text[i + 1:i + 2] == '/':
            i = text.index('\n', i)
            continue
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError('unclosed')


# ── 1. i18n.js ──
def apply_ui():
    p = REPO + 'src/ui/i18n.js'
    raw = open(p, 'rb').read(); text = raw.decode('utf-8')
    nl = '\r\n' if '\r\n' in text else '\n'
    start = text.index('const STRINGS = {')
    done = miss = skip = 0
    edits = []
    for key, zh in ui.items():
        m = re.compile(r"(?m)^([ \t]*)'" + re.escape(key) + r"'\s*:\s*\{").search(text, start)
        if not m:
            miss += 1; continue
        o = m.end() - 1
        c = scan_close(text, o)
        body = text[o:c + 1]
        if re.search(r'(^|[\s,{])zh\s*:', body):
            skip += 1; continue
        if '\n' not in body:
            pre = text[o:c].rstrip()
            sep = '' if pre.endswith(',') else ','
            edits.append((o, c + 1, pre + f'{sep} zh: {js_lit(zh)} ' + '}'))
        else:
            line_start = text.rfind('\n', 0, c) + 1
            close_indent = text[line_start:c]
            inner = text[o + 1:line_start].rstrip()
            ind = re.search(r'\n([ \t]+)en\s*:', text[o:c])
            indent = ind.group(1) if ind else close_indent + '    '
            fix = '' if inner.endswith(',') else ','
            new = text[o:o + 1] + text[o + 1:line_start].rstrip() + fix + nl + f'{indent}zh: {js_lit(zh)},' + nl + close_indent + '}'
            edits.append((o, c + 1, new))
        done += 1
    for a, b, new in sorted(edits, reverse=True):
        text = text[:a] + new + text[b:]
    print(f'i18n.js: +zh {done} · 이미 있음 {skip} · 키 없음 {miss}')
    if not dry:
        open(p, 'wb').write(text.encode('utf-8'))


# ── 2. CSV ──
def split_row(line):
    """한 줄을 원문 그대로의 칸 문자열 목록으로(따옴표 유지)"""
    cells, i, n, cur = [], 0, len(line), ''
    while True:
        if i < n and line[i] == '"':
            j = i + 1
            while j < n:
                if line[j] == '"':
                    if line[j + 1:j + 2] == '"':
                        j += 2; continue
                    break
                j += 1
            k = line.find(',', j)
            k = n if k < 0 else k
            cells.append(line[i:k]); i = k
        else:
            k = line.find(',', i)
            k = n if k < 0 else k
            cells.append(line[i:k]); i = k
        if i >= n:
            break
        i += 1
        if i == n:
            cells.append('')
            break
    return cells


def unq(c):
    return c[1:-1].replace('""', '"') if len(c) >= 2 and c[0] == '"' and c[-1] == '"' else c


def q(v):
    return '"' + v.replace('"', '""') + '"' if (',' in v or '"' in v) else v


def apply_csv():
    byfile = {}
    for k, v in csvt.items():
        f, rid, col, ko = k.split('|', 3)
        byfile.setdefault(f, {})[(rid, col, ko)] = v
    for f, tr in sorted(byfile.items()):
        p = REPO + 'src/data/' + f
        raw = open(p, 'rb').read()
        bom = raw.startswith(b'\xef\xbb\xbf')
        text = raw[3:].decode('utf-8') if bom else raw.decode('utf-8')
        nl = '\r\n' if '\r\n' in text else '\n'
        lines = text.split(nl)
        head = split_row(lines[0])
        cols = sorted({c for (_, c, _) in tr}, key=lambda c: head.index(c + '_en'), reverse=True)
        filled = 0
        for col in cols:
            ken, kkr = head.index(col + '_en'), head.index(col + '_kr')
            has = (col + '_zh') in head
            at = head.index(col + '_zh') if has else ken + 1
            for li in range(len(lines)):
                if li == 0:
                    if not has:
                        head.insert(at, col + '_zh')
                    continue
                if not lines[li].strip():
                    continue
                cells = split_row(lines[li])
                ko = unq(cells[kkr]) if kkr < len(cells) else ''
                zh = tr.get((unq(cells[0]), col, ko))
                if not zh and ko == '-':
                    zh = '-'          # 「없음」 표시는 세 언어가 같이 든다
                if has:
                    if at < len(cells) and unq(cells[at]) == '' and zh:
                        cells[at] = q(zh); filled += 1
                else:
                    while len(cells) < at:
                        cells.append('')
                    cells.insert(at, q(zh) if zh else '')
                    filled += bool(zh)
                lines[li] = ','.join(cells)
            lines[0] = ','.join(head)
        n_rows = sum(1 for l in lines[1:] if l.strip())
        print(f'{f}: 열 {",".join(c + "_zh" for c in cols)} · 채움 {filled} / 번역 {len(tr)} · 행 {n_rows}')
        if not dry:
            out = nl.join(lines).encode('utf-8')
            open(p, 'wb').write((b'\xef\xbb\xbf' if bom else b'') + out)


# ── 3. mock.js ──
def apply_mock():
    p = REPO + 'src/ui/mock.js'
    text = open(p, 'rb').read().decode('utf-8')
    LIT = r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\""
    PAIR = re.compile(r"(ko:\s*(" + LIT + r")\s*,\s*en:\s*(" + LIT + r"))(?!\s*,\s*zh:)")
    n = 0

    def rep(m):
        nonlocal n
        zh = mock.get(f'{eval(m.group(2))}\t{eval(m.group(3))}')
        if zh is None:
            return m.group(0)
        n += 1
        return m.group(1) + f', zh: {js_lit(zh)}'
    text = PAIR.sub(rep, text)
    print(f'mock.js: +zh {n}')
    if not dry:
        open(p, 'wb').write(text.encode('utf-8'))


if ui:
    apply_ui()
if csvt:
    apply_csv()
if mock:
    apply_mock()
print('(dry)' if dry else '(applied)')
