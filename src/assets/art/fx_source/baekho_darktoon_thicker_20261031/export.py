"""Export the two built-in imagegen originals as transparent combat sprites."""
from pathlib import Path
import hashlib
import json

from PIL import Image, ImageDraw

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[4]
OUT = ROOT / 'src/assets/art/fx/skills'
SKILLS = ('war_bash', 'war_doubleswing')
SIZE = 384


def main():
    report = {'size': SIZE, 'content_span': 0.86, 'assets': []}
    board = Image.new('RGB', (768, 490), '#15151a')
    draw = ImageDraw.Draw(board)
    for index, skill in enumerate(SKILLS):
        raw = Image.open(SOURCE / f'{skill}.png').convert('RGBA')
        # Ignore practically invisible generation dust when measuring the crop.
        # Keep the native alpha of the actual stroke and its antialiased edges.
        box = raw.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        assert box, skill
        box = (max(0, box[0] - 4), max(0, box[1] - 4),
               min(raw.width, box[2] + 4), min(raw.height, box[3] + 4))
        crop = raw.crop(box)
        side = round(max(crop.size) / 0.86)
        padded = Image.new('RGBA', (side, side))
        padded.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
        sprite = padded.convert('RGBa').resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert('RGBA')
        path = OUT / f'{skill}_darktoon.webp'
        sprite.save(path, 'WEBP', quality=90, alpha_quality=100, method=6, exact=True)
        installed = Image.open(path).convert('RGBA')
        alpha = installed.getchannel('A')
        assert installed.size == (SIZE, SIZE) and alpha.getextrema() == (0, 255)
        assert all(alpha.getpixel(p) == 0 for p in [(0, 0), (SIZE-1, 0), (0, SIZE-1), (SIZE-1, SIZE-1)])
        assert not alpha.crop((0, 0, SIZE, 20)).getbbox()
        assert not alpha.crop((0, SIZE-20, SIZE, SIZE)).getbbox()
        assert not alpha.crop((0, 0, 20, SIZE)).getbbox()
        assert not alpha.crop((SIZE-20, 0, SIZE, SIZE)).getbbox()
        entry = {'skill': skill, 'raw_size': raw.size, 'crop': box,
                 'alpha_bbox': alpha.getbbox(), 'bytes': path.stat().st_size,
                 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        report['assets'].append(entry)
        x = index * SIZE
        board.paste(installed, (x, 30), installed)
        thumb = installed.resize((92, 92), Image.Resampling.LANCZOS)
        board.paste(thumb, (x+146, 390), thumb)
        draw.text((x+16, 10), skill, fill='#d8d1bf')
    before = json.loads((SOURCE / 'before_sha256.json').read_text(encoding='utf-8'))
    changed = [p for p, digest in before.items()
               if hashlib.sha256((ROOT / p).read_bytes()).hexdigest() != digest]
    expected = {f'src/assets/art/fx/skills/{s}_darktoon.webp' for s in SKILLS}
    assert set(changed) == expected, changed
    report['changed_runtime_files'] = changed
    report['other_runtime_files_preserved'] = len(before) - len(changed)
    board.save(SOURCE / 'comparison.png')
    (SOURCE / 'export_report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
