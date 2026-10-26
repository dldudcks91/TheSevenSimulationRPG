"""Export the missing dark-cartoon skills and remove the rejected five styles.

Generation uses built-in imagegen; export only crops, resizes and encodes alpha.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/assets/art/fx_source/darktoon_completion_20261024'
OUT = ROOT / 'src/assets/art/fx/skills'
REJECTED = {'watercolor', 'glass', 'plasma', 'lowpoly', 'embroidery'}


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def manifest():
    return json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))


def prepare():
    retained = [p for p in OUT.glob('*.webp') if p.stem.rsplit('_', 1)[-1] in {'darktoon', 'foil'}]
    for name in ['world_styles_20261012', 'material_20261017', 'stage_banner_20261018']:
        retained += [p for p in (ROOT / 'src/assets/art/fx_source' / name).rglob('*')
                     if p.is_file() and p.suffix.lower() in {'.png', '.webp', '.jpg', '.txt'}]
    retained += [p for p in (ROOT / 'src/assets/art/fx/ui').rglob('*') if p.is_file()]
    preserved = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in retained}
    if not (SOURCE / 'preserved_sha256.json').exists():
        write_json(SOURCE / 'preserved_sha256.json', preserved)
    print(f'Preserving {len(preserved)} existing art files.')


def verify_preserved():
    preserved = json.loads((SOURCE / 'preserved_sha256.json').read_text(encoding='utf-8'))
    for relative, digest in preserved.items():
        assert hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() == digest, relative
    return len(preserved)


def cleanup():
    verify_preserved()
    targets = [p for p in OUT.glob('*.webp') if p.stem.rsplit('_', 1)[-1] in REJECTED]
    directories = [ROOT / 'src/assets/art/fx_source/revision_20261024', ROOT / 'tmp/revision_fx_review']
    for directory in directories:
        targets += [p for p in directory.rglob('*') if p.is_file()]
    targets += [ROOT / 'scripts' / name for name in ['build_revision_fx.py', 'verify_revision_fx.py']
                if (ROOT / 'scripts' / name).is_file()]
    report = []
    workspace = ROOT.resolve()
    for path in targets:
        if not path.resolve().is_relative_to(workspace):
            raise ValueError(f'Deletion outside workspace: {path}')
        report.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size})
    write_json(SOURCE / 'cleanup_report.json', report)
    for path in targets:
        path.unlink()
    for directory in directories:
        for child in sorted(directory.rglob('*'), key=lambda p: len(p.parts), reverse=True):
            if child.is_dir() and not any(child.iterdir()):
                child.rmdir()
        if directory.exists() and not any(directory.iterdir()):
            directory.rmdir()
    print(f'Deleted {len(targets)} rejected-style files; preserved art is unchanged.')


def boundaries(alpha, axis):
    projection = (alpha > 224).mean(axis=axis)
    length = len(projection)
    step = length / 3
    smoothed = np.convolve(projection, np.ones(5) / 5, mode='same')
    cuts = [0]
    for i in [1, 2]:
        intended = round(i * step)
        lo, hi = round(intended - step * .22), round(intended + step * .22)
        values = smoothed[lo:hi]
        candidates = np.flatnonzero(values <= values.min() + .004) + lo
        runs = np.split(candidates, np.flatnonzero(np.diff(candidates) > 1) + 1)
        run = min(runs, key=lambda r: min(abs(r - intended)))
        cuts.append(round(float((run[0] + run[-1]) / 2)))
    return cuts + [length]


def install():
    pending = {}
    report = []
    for sheet in manifest()['sheets']:
        path = SOURCE / f"sheet_{sheet['id']}.png"
        image = Image.open(path).convert('RGBA')
        assert abs(image.width - image.height) <= 6 and image.getextrema()[3][0] == 0, path
        alpha = np.asarray(image)[..., 3]
        rows = boundaries(alpha, 1)
        for i, entry in enumerate(sheet['cells']):
            x, y = i % 3, i // 3
            columns = boundaries(alpha[rows[y]:rows[y + 1]], 0)
            box = (columns[x], rows[y], columns[x + 1], rows[y + 1])
            sprite = image.crop(box).convert('RGBa').resize((256, 256), Image.Resampling.LANCZOS).convert('RGBA')
            a = np.asarray(sprite)[..., 3]
            coverage = float((a > 16).mean())
            edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
            assert .005 < coverage < .80 and (edge > 224).mean() < .1, (entry['skill'], coverage, float((edge > 224).mean()))
            name = entry['skill'] + '_darktoon'
            pending[name] = sprite
            report.append({'file': name, 'sheet': sheet['id'], 'crop': box,
                           'coverage': round(coverage, 4), 'solid_edge_coverage': round(float((edge > 224).mean()), 4)})
    for name, sprite in pending.items():
        sprite.save(OUT / f'{name}.webp', 'WEBP', quality=92, alpha_quality=100, method=4)
    write_json(SOURCE / 'export_report.json', report)
    print(f'Installed {len(pending)} genuinely transparent dark-cartoon effects.')


def compare():
    entries = [entry for sheet in manifest()['sheets'] for entry in sheet['cells']]
    width, height = 230, 170
    board = Image.new('RGB', (5 * width, 4 * height), '#10141d')
    draw = ImageDraw.Draw(board)
    font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 16)
    for i, entry in enumerate(entries):
        x, y = i % 5 * width, i // 5 * height
        sprite = Image.open(OUT / f"{entry['skill']}_darktoon.webp").convert('RGBA')
        sprite.thumbnail((112, 112), Image.Resampling.LANCZOS)
        board.paste(sprite, (x + (width - sprite.width) // 2, y + 8), sprite)
        draw.text((x + width // 2, y + 130), entry['ko'], font=font, anchor='mt', fill='#dddde4')
    board.save(SOURCE / 'compare.png')


def verify():
    art = (ROOT / 'src/ui/skill_art.js').read_text(encoding='utf-8')
    keys = set(re.findall(r'^    ([a-z][a-z0-9_]+):', art, re.M))
    rows = list(csv.DictReader((ROOT / 'src/data/skill.csv').open(encoding='utf-8-sig')))
    missing = [r['skill_id'] for r in rows if r['skill_id'] not in keys]
    assert not missing, missing
    counts = Counter(p.stem.rsplit('_', 1)[-1] for p in OUT.glob('*.webp'))
    assert set(counts) == {'darktoon', 'foil'}, counts
    files = set(re.findall(r"file: '([^']+)'", art))
    for file in files:
        path = OUT / (file + '_darktoon.webp')
        image = Image.open(path).convert('RGBA')
        assert image.getextrema()[3][0] == 0, path
    report = {'skills': len(rows), 'mapped_skills': len(keys), 'active_darktoon_files': len(files),
              'new_files': sum(len(s['cells']) for s in manifest()['sheets']),
              'preserved_unchanged': verify_preserved(), 'runtime_counts': dict(counts)}
    write_json(SOURCE / 'asset_verification.json', report)
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--cleanup', action='store_true')
    parser.add_argument('--compare', action='store_true')
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    if args.prepare:
        prepare()
    elif args.cleanup:
        cleanup()
    elif args.compare:
        compare()
    elif args.verify:
        verify()
    else:
        install()
