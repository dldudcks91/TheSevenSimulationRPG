"""Export AI-drawn shockwaves and generate an overflow-enabled comparison.

Only frames, resizes and encodes generated artwork; does not install it.
"""
import csv
import json
from pathlib import Path

from PIL import Image

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[4]
SIZE = 512


def main():
    data = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))
    with (ROOT / 'src/data/skill.csv').open(encoding='utf-8-sig', newline='') as stream:
        expected = {r['skill_id'] for r in csv.DictReader(stream) if 'shout' in r['tags'].split('|')}
    assert {s['id'] for s in data['skills']} == expected
    assert len(data['skills']) == 12
    report = []
    for s in data['skills']:
        original = Image.open(BASE / s['source']).convert('RGBA')
        alpha_range = original.getextrema()[3]
        assert alpha_range[0] == 0 and alpha_range[1] >= 128, s['source']
        # Normalize composition around the canvas center; never distort perspective.
        ratio = SIZE * .90 / max(original.size)
        art = original.convert('RGBa').resize(tuple(round(v * ratio) for v in original.size),
                                             Image.Resampling.LANCZOS).convert('RGBA')
        out = Image.new('RGBA', (SIZE, SIZE))
        out.paste(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2))
        path = BASE / s['output']
        path.parent.mkdir(exist_ok=True)
        out.save(path, 'WEBP', quality=92, alpha_quality=100, method=4)
        alpha = Image.open(path).convert('RGBA').getchannel('A')
        box = alpha.getbbox()
        assert min(box[:2]) >= 20 and max(box[2:]) <= SIZE - 20
        report.append({'id': s['id'], 'style': s['style'], 'dimensions': [SIZE, SIZE],
                       'bbox': box, 'display_px': s['size'], 'portrait_px': 90,
                       'source_alpha_range': alpha_range,
                       'bytes': path.stat().st_size, 'path': s['output']})
    (BASE / 'export_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    source = (BASE / 'preview.template.html').read_text(encoding='utf-8')
    payload = json.dumps(data['skills'], ensure_ascii=False).replace('</', '<\\/')
    (BASE / 'preview.html').write_text(source.replace('/*__SPRITES__*/[]', payload), encoding='utf-8')
    print(f'Exported {len(report)} shockwaves at {SIZE}px.')


if __name__ == '__main__':
    main()
