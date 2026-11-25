# -*- coding: utf-8 -*-
"""거친 잉크(roughink) 그림체 설치 — Gemini 2차 판(자유롭게 다시 그린 판)을 fx/skills/<file>_roughink.webp 로 (ADR-1379).

원본 시트 · 프롬프트 · 키잉 · 자르기는 output/2026-11-24_fx_gemini/ (README) — 여기서는 잘린 칸(384 RGBA)을 그대로 WebP 로 옮긴다.
  python src/assets/art/fx_source/roughink_20261124/install.py           설치
  python src/assets/art/fx_source/roughink_20261124/install.py --verify  skill_art.js 가 부르는 파일이 다 있나만 본다
빼는 칸 — 삭제된 스킬(state.js:RETIRED_ADVANCE · 애로우 레인 R383)과 「마법사 대형」 시트 끝 두 칸(배시 · 파이어볼 한 판 더 — 제 칸을 쓴다).
"""
import json, re, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[5]
CUT = ROOT / 'output/2026-11-24_fx_gemini'
OUT = ROOT / 'src/assets/art/fx/skills'
STYLE = 'roughink'
TAKE = '2'
SIZE = 384
RETIRED = {'kni_showdown', 'kni_unyieldingoath', 'kni_holywar', 'kni_vow', 'mag_firewall', 'mag_frostburst',
           'mag_staticfield', 'arc_arrowrain', 'arc_fulldraw', 'pri_aegis', 'pri_benediction'}


def retired(name):
    return any(name == k or name.startswith(k + '_') for k in RETIRED)


def plan():
    groups = json.loads((CUT / 'fx_map.json').read_text(encoding='utf-8'))
    out = []
    for g, names in groups.items():
        for n in names:
            if '@' in n or retired(n):
                continue
            out.append((CUT / 'cut' / f'{g}_{TAKE}' / f'{n}.png', OUT / f'{n}_{STYLE}.webp'))
    return out


def wanted():
    """skill_art.js 가 거친 잉크로 부를 파일 — styles 가 없거나 roughink 를 든 정의 + 모으기 기운."""
    js = (ROOT / 'src/ui/skill_art.js').read_text(encoding='utf-8')
    body = js.split('export const SKILL_ART')[1].split('export const CHARGE_ART')[0]
    files = set()
    for m in re.finditer(r"(?=file: '([a-z_]+)'([^{}]*))", body):   # 정의마다 — 이어 서는 그림(then)도 따로
        st = re.search(r"styles: (\[[^\]]*\]|RETIRED_STYLES)", m.group(2))
        if not st or STYLE in st.group(1):
            files.add(m.group(1))
    return files | {'charge_gather'}


def verify():
    missing = sorted(f for f in wanted() if not (OUT / f'{f}_{STYLE}.webp').exists())
    extra = sorted(p.stem[:-len(STYLE) - 1] for p in OUT.glob(f'*_{STYLE}.webp') if p.stem[:-len(STYLE) - 1] not in wanted())
    print('wanted', len(wanted()), 'missing', missing, 'extra', extra)
    return not missing and not extra


if __name__ == '__main__':
    if '--verify' in sys.argv:
        sys.exit(0 if verify() else 1)
    pairs = plan()
    for src, dst in pairs:
        im = Image.open(src).convert('RGBA')
        if im.size != (SIZE, SIZE):
            im = im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        im.save(dst, 'WEBP', quality=92, alpha_quality=100, method=4)
    print('installed', len(pairs))
