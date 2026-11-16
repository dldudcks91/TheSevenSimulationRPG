"""간체 글꼴 서브셋을 짓는다 — src/assets/fonts/NotoSansSC-zh.woff2 (+ OFL.txt)

docs/client/LOCALIZATION_ZH.md D6 — 간체 화면은 한국어 글꼴을 빼고 이 파일을 맨 앞에 둔다(style.css `:root:lang(zh)`).
글자 = 게임이 쓰는 간체 글자(i18n.js · mock.js · game_logic 의 zh 문자열 · CSV `_zh` 열) ∪ GB2312 1급 3,755자 ∪ ASCII · 전각 부호.
1급을 늘 넣는 까닭 — 새 문구의 zh 가 나중에 들어와도 대개 글꼴을 다시 안 지어도 된다(빠진 글자는 시스템 글꼴로 떨어진다).

원본: Google Fonts 의 Noto Sans SC 가변 글꼴(OFL) — 처음 한 번 받아 `_scratch/fonts_src/` 에 둔다(저장소에 안 올린다 · .gitignore).
사용: python scripts/build_zh_font.py        (fonttools · brotli 필요)
"""
import glob, os, re, sys, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
CACHE = os.path.join(ROOT, '_scratch', 'fonts_src')
OUT = os.path.join(SRC, 'assets', 'fonts')
GF = 'https://github.com/google/fonts/raw/main/ofl/notosanssc/'
FONT, LICENSE = 'NotoSansSC[wght].ttf', 'OFL.txt'


def fetch(name):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        print('download', name)
        urllib.request.urlretrieve(GF + name.replace('[', '%5B').replace(']', '%5D'), p)
    return p


HAN = re.compile(r'[　-〿一-鿿＀-￯‐-⁯]')


def used_chars():
    text = []
    for p in glob.glob(os.path.join(SRC, 'ui', '*.js')) + glob.glob(os.path.join(SRC, 'game_logic', '*.js')):
        s = open(p, encoding='utf-8').read()
        text += re.findall(r"zh:\s*'((?:[^'\\]|\\.)*)'", s)
    for p in glob.glob(os.path.join(SRC, 'data', '*.csv')):
        s = open(p, encoding='utf-8-sig').read()
        head = s.split('\n', 1)[0]
        if '_zh' in head:
            text.append(s)        # 한자 범위만 거르므로 파일 통째로 넣어도 된다
    return set(''.join(HAN.findall(''.join(text))))


def gb2312_level1():
    out = []
    for a in range(0xB0, 0xD8):
        for b in range(0xA1, 0xFF):
            try:
                out.append(bytes([a, b]).decode('gb2312'))
            except UnicodeDecodeError:
                pass
    return set(out)


def main():
    src = fetch(FONT)
    lic = fetch(LICENSE)
    chars = used_chars() | gb2312_level1() | set(chr(c) for c in range(0x20, 0x7f)) \
        | set('，。、；：？！“”‘’（）《》【】—…·～％＋－×÷　')
    f = TTFont(src)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.notdef_outline = True
    opts.name_IDs = ['*']
    s = subset.Subsetter(opts)
    s.populate(text=''.join(sorted(chars)))
    s.subset(f)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, 'NotoSansSC-zh.woff2')
    f.flavor = 'woff2'
    f.save(out)
    with open(lic, 'rb') as a, open(os.path.join(OUT, 'OFL.txt'), 'wb') as b:
        b.write(a.read())
    print(f'chars {len(chars)} (used {len(used_chars())}) -> {os.path.relpath(out, ROOT)} {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    sys.exit(main())
