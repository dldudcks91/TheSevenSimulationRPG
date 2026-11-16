"""번역 결과 검사기 — python check_out.py <chunk>.in.json <chunk>.out.json
결과 파일 = JSON 객체 {key: 간체 문자열}. 오류(ERR)가 0 이어야 통과. 경고(WARN)는 읽어 보고 판단."""
import json, re, sys

HANGUL = re.compile(r'[ᄀ-ᇿ㄰-㆏가-힣]')
TRAD = set('們這說會時來個為國學點體對開關頭實現長樣間後種機動東歡無應經發進寶戰鬥劍擊傷護屬裝備級強靈龍術書圖鑑銀錢鐵礦藥麼與將從還讓給記錄選擇設計復興勝敗範圍狀態驗節隊陣顯鍵鈕碼帳號亂難業輕軍權歲歷黃紅綠藍響聲遠處誤錯變壓鎧鎚劇場際氣鳥頁費贈題類')
TOKEN = re.compile(r'\{[^{}]+\}')
TAG = re.compile(r'</?([a-zA-Z][a-zA-Z0-9]*)[^>]*>')


def toks(s, strip_josa):
    out = []
    for t in TOKEN.findall(s):
        if strip_josa and '|' in t:
            t = t.split('|')[0] + '}'
        out.append(t)
    return sorted(out)


src = json.load(open(sys.argv[1], encoding='utf-8'))
out = json.load(open(sys.argv[2], encoding='utf-8'))
err, warn = [], []
keys = {u['key'] for u in src}
for k in out:
    if k not in keys:
        err.append(f'모르는 key: {k[:80]}')
for u in src:
    k, ko, en = u['key'], u['ko'], u['en']
    if k not in out:
        err.append(f'빠짐: {k[:80]}')
        continue
    zh = out[k]
    if not isinstance(zh, str):
        err.append(f'문자열 아님: {k[:80]}')
        continue
    if ko.strip() == '-':
        if zh.strip() != '-':
            err.append(f"'-' 칸은 '-' 그대로: {k[:80]}")
        continue
    if not zh.strip() and ko.strip():
        err.append(f'빈 번역: {k[:80]}')
    if HANGUL.search(zh):
        err.append(f'한글 섞임: {k[:60]} → {zh[:60]}')
    t = [c for c in zh if c in TRAD]
    if t:
        err.append(f"번체 글자 {''.join(t)}: {k[:60]}")
    if '|' in ''.join(TOKEN.findall(zh)):
        err.append(f'조사 쌍이 남음(간체엔 {{m:N}} 만): {k[:60]}')
    if toks(ko, True) != toks(zh, False):
        err.append(f'자리표시자 다름: {k[:60]} ko={toks(ko, True)} zh={toks(zh, False)}')
    if sorted(TAG.findall(ko)) != sorted(TAG.findall(zh)):
        err.append(f'HTML 태그 다름: {k[:60]} ko={sorted(TAG.findall(ko))} zh={sorted(TAG.findall(zh))}')
    if ko.count('\\n') != zh.count('\\n'):
        warn.append(f"\\n 수 다름(ko {ko.count(chr(92) + 'n')} · zh {zh.count(chr(92) + 'n')}): {k[:60]}")
    if '「' in zh or '」' in zh:
        warn.append(f'「」 대신 “ ”: {k[:60]}')
    if len(ko) >= 6 and len(zh) > len(ko) * 1.5:
        warn.append(f'길다(ko {len(ko)} · zh {len(zh)}): {k[:60]}')
    if k.startswith('csv|') and ',' in zh:
        warn.append(f'반각 쉼표(CSV) — 전각 ，로: {k[:60]}')
print(f'ERR {len(err)} · WARN {len(warn)} · {len(out)}/{len(src)}')
for e in err[:80]:
    print('ERR', e)
for w in warn[:60]:
    print('WARN', w)
sys.exit(1 if err else 0)
