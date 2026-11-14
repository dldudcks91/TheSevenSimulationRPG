"""Export generated shout VFX drafts and a local, standalone comparison page.

Only crops transparent margins, resizes with premultiplied alpha, and encodes.
Does not install or redraw artwork. Run from any working directory.
"""
from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

from PIL import Image

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[4]
SIZE = 384


def main():
    manifest = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))
    with (ROOT / 'src/data/skill.csv').open(encoding='utf-8-sig', newline='') as stream:
        shout_ids = {row['skill_id'] for row in csv.DictReader(stream)
                     if 'shout' in row['tags'].split('|')}
    assert {s['id'] for s in manifest['skills']} == shout_ids
    assert len(manifest['skills']) == len(shout_ids) * 2 == 12
    report = []
    for spec in manifest['skills']:
        original = Image.open(BASE / spec['source']).convert('RGBA')
        assert original.getextrema()[3] == (0, 255), spec['source']
        cropped = original.crop(original.getbbox())
        scale = SIZE * .88 / max(cropped.size)
        dimensions = tuple(max(1, round(edge * scale)) for edge in cropped.size)
        art = cropped.convert('RGBa').resize(dimensions, Image.Resampling.LANCZOS).convert('RGBA')
        sprite = Image.new('RGBA', (SIZE, SIZE))
        sprite.paste(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2))
        target = BASE / spec['output']
        target.parent.mkdir(exist_ok=True)
        sprite.save(target, 'WEBP', quality=92, alpha_quality=100, method=6)
        decoded = Image.open(target).convert('RGBA')
        alpha = decoded.getchannel('A')
        center = alpha.crop((round(SIZE * .40), round(SIZE * .20),
                             round(SIZE * .60), round(SIZE * .80)))
        # The generated alpha can retain a one-level (1/255) residual.
        assert center.getextrema()[1] <= 1, (spec['id'], 'face core covered')
        box = alpha.getbbox()
        assert min(box[:2]) > 8 and max(box[2:]) < SIZE - 8, spec['id']
        report.append({'id': spec['id'], 'style': spec['style'], 'size': decoded.size,
                       'bbox': box, 'center_alpha_max': center.getextrema()[1],
                       'bytes': target.stat().st_size, 'path': spec['output']})
    preserved = json.loads((BASE / 'preserved_sha256.json').read_text(encoding='utf-8'))
    for path, expected in preserved.items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == expected, path
    (BASE / 'export_report.json').write_text(json.dumps({
        'sprites': report, 'existing_files_unchanged': len(preserved),
        'generation': 'built-in image_gen', 'status': 'review drafts',
        'face_core_region': [.40, .20, .60, .80], 'face_core_max_alpha': 1
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    template = (BASE / 'preview.template.html').read_text(encoding='utf-8')
    data = json.dumps(manifest['skills'], ensure_ascii=False).replace('</', '<\\/')
    (BASE / 'preview.html').write_text(template.replace('/*__SPRITES__*/[]', data), encoding='utf-8')
    print(f'Exported {len(report)} transparent {SIZE}px drafts; all face centers clear; '
          f'{len(preserved)} existing files unchanged.')


if __name__ == '__main__':
    main()
