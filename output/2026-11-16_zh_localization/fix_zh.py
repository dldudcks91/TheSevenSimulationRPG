"""이미 붙은 zh 를 고친다 — python fix_zh.py <fixes.json> [--dry]
fixes.json = {chunk key: 새 zh} (key 꼴은 chunks 와 같다 — ui|<키> · csv|파일|id|열|ko · mock|ko\ten).
저장소 파일(i18n.js · CSV `_zh` 칸 · mock.js 의 zh)과 chunks/*.out.json(기록)을 같이 고친다.
apply_zh.py 는 있는 zh 를 안 덮으므로 검토 뒤 고칠 때는 이것을 쓴다. 파일마다 읽은 직후 바로 쓴다(병렬 세션)."""
import glob, json, os, re, sys


# ── apply_zh.py 와 같은 규칙(그 파일은 불러오기만 해도 붙이기를 실행해 복사해 둔다) ──
def js_lit(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('\r', '').replace('\n', '\\n') + "'"


def scan_close(text, i):
    depth, n = 0, len(text)
    while i < n:
        c = text[i]
        if c in '\'"`':
            qc = c; i += 1
            while i < n and text[i] != qc:
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


def split_row(line):
    cells, i, n = [], 0, len(line)
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


B = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(B, '..', '..')).replace(chr(92), '/') + '/'
dry = '--dry' in sys.argv
fixes = json.load(open([a for a in sys.argv[1:] if not a.startswith('--')][0], encoding='utf-8'))
LIT = r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\""
miss = []


def write(p, data):
    if not dry:
        open(p, 'wb').write(data)


# ── i18n.js ──
ui = {k[3:]: v for k, v in fixes.items() if k.startswith('ui|')}
if ui:
    p = REPO + 'src/ui/i18n.js'
    text = open(p, 'rb').read().decode('utf-8')
    start = text.index('const STRINGS = {')
    edits = []
    for key, zh in ui.items():
        m = re.compile(r"(?m)^([ \t]*)'" + re.escape(key) + r"'\s*:\s*\{").search(text, start)
        if not m:
            miss.append('ui|' + key); continue
        o = m.end() - 1
        c = scan_close(text, o)
        z = re.compile(r"((?:^|[\s,{])zh\s*:\s*)(" + LIT + ")").search(text, o, c)
        if not z:
            miss.append('ui|' + key); continue
        edits.append((z.start(2), z.end(2), js_lit(zh)))
    for a, b, new in sorted(edits, reverse=True):
        text = text[:a] + new + text[b:]
    print(f'i18n.js: 고침 {len(edits)}')
    write(p, text.encode('utf-8'))

# ── CSV ──
byfile = {}
for k, v in fixes.items():
    if k.startswith('csv|'):
        f, rid, col, ko = k[4:].split('|', 3)
        byfile.setdefault(f, {})[(rid, col, ko)] = v
for f, tr in sorted(byfile.items()):
    p = REPO + 'src/data/' + f
    raw = open(p, 'rb').read()
    bom = raw.startswith(b'\xef\xbb\xbf')
    text = raw[3:].decode('utf-8') if bom else raw.decode('utf-8')
    nl = '\r\n' if '\r\n' in text else '\n'
    lines = text.split(nl)
    head = split_row(lines[0])
    done = set()
    for li in range(1, len(lines)):
        if not lines[li].strip():
            continue
        cells = split_row(lines[li])
        for (rid, col, ko), zh in tr.items():
            if unq(cells[0]) != rid or (col + '_zh') not in head:
                continue
            kr, at = head.index(col + '_kr'), head.index(col + '_zh')
            if kr < len(cells) and unq(cells[kr]) == ko and at < len(cells):
                cells[at] = q(zh); done.add((rid, col, ko))
        lines[li] = ','.join(cells)
    for key in tr:
        if key not in done:
            miss.append(f'csv|{f}|{"|".join(key)}')
    print(f'{f}: 고침 {len(done)}')
    write(p, (b'\xef\xbb\xbf' if bom else b'') + nl.join(lines).encode('utf-8'))

# ── mock.js ──
mk = {k[5:]: v for k, v in fixes.items() if k.startswith('mock|')}
if mk:
    p = REPO + 'src/ui/mock.js'
    text = open(p, 'rb').read().decode('utf-8')
    PAIR = re.compile(r"(ko:\s*(" + LIT + r")\s*,\s*en:\s*(" + LIT + r")\s*,\s*zh:\s*)(" + LIT + ")")
    hit = set()

    def rep(m):
        k = f'{eval(m.group(2))}\t{eval(m.group(3))}'
        if k not in mk:
            return m.group(0)
        hit.add(k)
        return m.group(1) + js_lit(mk[k])
    text = PAIR.sub(rep, text)
    miss += ['mock|' + k for k in mk if k not in hit]
    print(f'mock.js: 고친 쌍 {len(hit)}')
    write(p, text.encode('utf-8'))

# ── 기록(chunks) ──
for op in glob.glob(f'{B}/chunks/*.out.json'):
    d = json.load(open(op, encoding='utf-8'))
    ch = [k for k in fixes if k in d and d[k] != fixes[k]]
    if ch and not dry:
        for k in ch:
            d[k] = fixes[k]
        json.dump(d, open(op, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if ch:
        print(f'{os.path.basename(op)}: 기록 {len(ch)}')
print(f'못 찾음 {len(miss)}')
for x in miss[:30]:
    print('  ', x[:120])
print('(dry)' if dry else '(applied)')
