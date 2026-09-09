"""adr/README.md 의 「인덱스」 절을 ADR 파일들에서 다시 만든다.

    python docs/client/adr/_build_index.py

**인덱스는 손으로 고치지 않는다.** 표의 번호 · 제목 · 상태 · 화면 · 날짜 · 대체 관계는
전부 각 ADR 파일의 머리표가 이미 들고 있는 값이라, 손으로 옮겨 적으면 반드시 한쪽만 낡는다
(2026-09-09 — ADR-0052 가 생긴 지 한 시간 만에 인덱스가 그것을 놓쳤다).
ADR 을 쓰거나 「대체됨」을 채운 뒤 이것을 돌린다. 게임 코드와 무관하고 이식 대상도 아니다.
"""
import re
import pathlib

D = pathlib.Path(__file__).parent
HDR = "| 번호 | 제목 | 상태 | 화면 | 날짜 | 대체 관계 |"
SEP = "|---|---|---|---|---|---|"


def field(text, name):
    m = re.search(r'\|\s*\*\*%s\*\*\s*\|\s*(.+?)\s*\|' % name, text)
    return m.group(1).strip() if m else ''


def collect():
    rows = []
    for f in sorted(D.glob('[0-9][0-9][0-9][0-9]-*.md')):
        if f.name.startswith('0000'):
            continue
        t = f.read_text(encoding='utf-8')
        h = re.search(r'^# ADR-(\d{4}) — (.*)$', t, re.M)
        if not h:
            raise SystemExit('머리글이 없다: %s' % f.name)
        no, title = h.group(1), h.group(2).strip()
        state = field(t, '상태')
        st, _, when = state.partition('·')
        rows.append({
            'no': no, 'title': title, 'file': f.name,
            'state': st.strip(), 'when': re.sub(r'\(.*\)', '', when).strip(),
            'screen': field(t, '화면'), 'sup': field(t, '대체'), 'supby': field(t, '대체됨'),
        })
    return rows


def main():
    rows = collect()
    sec = re.search(r'§([0-9-]+)', '')
    out = [HDR, SEP]
    for r in sorted(rows, key=lambda x: -int(x['no'])):
        scr = re.search(r'§([0-9-]+)', r['screen'])
        rel = []
        if r['sup'] != '—':
            rel.append('%s 를 대체' % r['sup'])
        if r['supby'] != '—':
            rel.append('**%s 가 대체**' % r['supby'])
        # 제목 안의 대괄호는 링크 텍스트를 깨뜨린다 (ADR-0052 「[확인] · [취소]」)
        safe = r['title'].replace('[', r'\[').replace(']', r'\]')
        out.append('| %s | [%s](%s) | %s | %s | %s | %s |' % (
            r['no'], safe, r['file'],
            '**대체됨**' if r['state'] == '대체됨' else r['state'],
            '§' + scr.group(1) if scr else '—', r['when'], ' · '.join(rel) or '—'))
    table = '\n'.join(out)

    n_sup = sum(1 for r in rows if r['state'] == '대체됨')
    lead = ("**%d건** — 살아 있는 결정 %d · 대체된 것 %d. 번호는 **결정이 선 날 순**이다.\n\n"
            "> 이 표는 **ADR 파일들에서 생성한 파생 뷰**다 — 손으로 고치지 않는다. "
            "ADR 을 쓰거나 「대체됨」을 채운 뒤 `python docs/client/adr/_build_index.py` 를 돌린다.\n"
            % (len(rows), len(rows) - n_sup, n_sup))

    p = D / 'README.md'
    src = p.read_text(encoding='utf-8')
    pat = re.compile(r'(## 인덱스\r?\n\r?\n).*?(\r?\n\r?\n---\r?\n)', re.S)
    if not pat.search(src):
        raise SystemExit('인덱스 절을 못 찾았다 — README 의 「## 인덱스 … ---」 틀이 깨졌다')
    new = pat.sub(lambda m: m.group(1) + lead + '\n' + table + m.group(2), src)
    if new == src:
        print('인덱스 %d행 — 이미 최신이라 안 고쳤다' % len(rows))
        return
    p.write_bytes(new.replace('\r\n', '\n').replace('\n', '\r\n').encode('utf-8'))
    print('인덱스 %d행 생성 (대체됨 %d)' % (len(rows), n_sup))


if __name__ == '__main__':
    main()
