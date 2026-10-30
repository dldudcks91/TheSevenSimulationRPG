"""Normalize generated archer silhouettes and export just the four game icons."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'src/assets/art/icons_source/skills'
GAME = ROOT / 'src/assets/art/icons/skills'
RECORD = SOURCE / 'source/archer_revision_20261030'
OUT = Path(__file__).resolve().parent
IDS = ['arc_coldarrow', 'arc_quickhands', 'arc_eagleeye', 'arc_evade']
sys.path.insert(0, str(ROOT / 'scripts'))
import build_icons


def main():
    manifest = json.loads((RECORD / 'manifest.json').read_text(encoding='utf-8'))
    rows = []
    for skill_id in IDS:
        entry = manifest['assets'][skill_id]
        generated = Image.open(RECORD / entry['generated']).convert('RGBA')
        alpha = generated.getchannel('A')
        bbox = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
        if bbox is None:
            raise ValueError(f'Empty generated icon: {skill_id}')
        # Match the established icon pipeline: preserve generated alpha,
        # normalize framing, and use the existing basic-skill solid fill.
        alpha = alpha.crop(bbox)
        scale = 450 / max(alpha.size)
        size = tuple(round(v * scale) for v in alpha.size)
        alpha = alpha.resize(size, Image.Resampling.LANCZOS)
        canvas_alpha = Image.new('L', (512, 512), 0)
        canvas_alpha.paste(alpha, ((512-size[0])//2, (512-size[1])//2))
        icon = Image.new('RGBA', (512, 512), (216, 217, 230, 0))
        icon.putalpha(canvas_alpha)
        icon.save(SOURCE / f'{skill_id}.png')
        webp = GAME / f'{skill_id}.webp'
        webp.write_bytes(build_icons.encode(icon.resize((256, 256), Image.Resampling.LANCZOS)))
        b = canvas_alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
        row = {'id': skill_id, 'source_size': [512, 512], 'game_size': [256, 256],
               'source_bbox': b, 'long_percent': round(max(b[2]-b[0], b[3]-b[1])/512*100, 2),
               'center_percent': [round((b[0]+b[2])/1024*100, 2), round((b[1]+b[3])/1024*100, 2)],
               'webp_bytes': webp.stat().st_size}
        rows.append(row)
        print(json.dumps(row))
    manifest['exports'] = rows
    (RECORD / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    preview()


def preview():
    bg = '#171b29'
    sheet = Image.new('RGB', (1120, 730), bg)
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 20)
    small = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 15)
    labels = ['콜드 애로우', '퀵 핸즈', '이글 아이', '이베이드']
    draw.text((24, 14), '궁수 스킬 아이콘 · 기존 스타일에 맞춘 수정본', fill='#d8d9e6', font=font)
    for i, skill_id in enumerate(IDS):
        x = 280*i
        icon = Image.open(GAME / f'{skill_id}.webp').convert('RGBA')
        sheet.paste(icon, (x+12, 55), icon)
        draw.text((x+75, 320), labels[i], fill='#d8d9e6', font=font)
        for j, size in enumerate([28, 32, 44]):
            px = x+30+j*80
            resized = icon.resize((size, size), Image.Resampling.LANCZOS)
            sheet.paste(resized, (px+(44-size)//2, 373+(44-size)//2), resized)
            draw.text((px+2, 426), f'{size}px', fill='#949bb4', font=small)
    draw.text((24, 486), '기존 궁수 아이콘 · 동일한 회백 단색 실루엣', fill='#d8d9e6', font=font)
    for i, skill_id in enumerate(['arc_snipe', 'arc_rapid', 'arc_guided', 'arc_multishot', 'arc_pierce', 'arc_poison']):
        icon = Image.open(GAME / f'{skill_id}.webp').convert('RGBA')
        icon = icon.resize((130, 130), Image.Resampling.LANCZOS)
        x = 24+i*182
        sheet.paste(icon, (x, 538), icon)
        draw.text((x+5, 682), skill_id, fill='#949bb4', font=small)
    sheet.save(OUT / 'comparison.png')


if __name__ == '__main__':
    main()
