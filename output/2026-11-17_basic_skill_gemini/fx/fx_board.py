# -*- coding: utf-8 -*-
"""fx_board.html — one row per effect file: current dark cartoon | Gemini takes (cut/<key>_<n>/<file>.png) + raw sheets."""
import base64, csv, glob, io, json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
JOB = {'war': '전사', 'kni': '기사', 'arc': '궁수', 'mag': '마법사', 'pri': '사제'}
SHEET = {'f1': '전사', 'f2': '기사', 'f3': '궁수', 'f4': '마법사', 'f5': '사제', 'f6': '나머지 + 대안'}

def uri(im, fmt='PNG', size=None, q=82):
    if size: im = im.resize(size, Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=88, alpha_quality=90, method=4)
    fmt = 'WEBP'
    return 'data:image/%s;base64,%s' % (fmt.lower(), base64.b64encode(b.getvalue()).decode())

skills = {r['skill_id']: r for r in csv.DictReader(open(os.path.join(ROOT, 'src/data/skill.csv'), encoding='utf-8')) if r['owner_kind'] == 'job'}
mp = json.load(open(os.path.join(HERE, 'fx_map.json'), encoding='utf-8'))
tags = sorted(os.path.basename(d) for d in glob.glob(os.path.join(HERE, 'cut', '*')))
order = [n for k in mp for n in mp[k]]
rows = []
for name in order:
    base = name.split('@')[0]
    sid = base.replace('_shockwave', '').replace('_shatter', '')
    r = skills.get(sid)
    takes = []
    for t in tags:
        key, n = t.rsplit('_', 1)
        if name not in mp[key]: continue
        f = os.path.join(HERE, 'cut', t, name.replace('@', '_') + '.png')
        if os.path.exists(f):
            takes.append({'src': uri(Image.open(f), size=(256, 256)), 'label': '%s판 · 시트 %s-%d번' % (n, key[1], mp[key].index(name) + 1)})
    if not takes: continue
    cur = os.path.join(ROOT, 'src/assets/art/fx/skills/%s_darktoon.webp' % base)
    title = r['name_kr'] + (' · 깨짐' if base.endswith('_shatter') else '') + (' · 대안' if '@' in name else '')
    rows.append({'id': name.replace('@', '_'), 'job': sid[:3], 'kr': title, 'en': r['name_en'], 'file': base,
                 'cur': uri(Image.open(cur).convert('RGBA'), size=(256, 256)) if os.path.exists(cur) else None, 'takes': takes})
sheets = [{'tag': '시트 %s · %s · %s판' % (os.path.basename(f)[1], SHEET[os.path.basename(f)[:2]], os.path.basename(f).rsplit('_', 1)[1][:-4]),
           'src': uri(Image.open(os.path.join(HERE, 'cut', os.path.basename(f)[:-4], '_keyed.png')), 'PNG', (768, 768)),
           'ids': mp[os.path.basename(f)[:-4].rsplit('_', 1)[0]]}
          for f in sorted(glob.glob(os.path.join(HERE, 'sheets', 'f?_*_[0-9].png')))]
tpl = open(os.path.join(HERE, 'fx_board_template.html'), encoding='utf-8').read()
html = tpl.replace('/*ROWS*/[]', json.dumps(rows, ensure_ascii=False)).replace('/*SHEETS*/[]', json.dumps(sheets, ensure_ascii=False)) \
          .replace('/*JOBS*/[]', json.dumps(list(JOB.items()), ensure_ascii=False))
open(os.path.join(HERE, 'fx_board.html'), 'w', encoding='utf-8').write(html)
print('fx_board.html', len(html) // 1024, 'KB |', len(rows), 'rows |', len(sheets), 'sheets')
