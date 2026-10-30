"""Normalize generated buff glyphs, then export with the shared icon encoder.

Original generated RGBA files stay beside this script. Only crop/scale/pad;
keep the generated colors and alpha in the glyph bounds.
"""
import importlib.util
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[5]
spec = importlib.util.spec_from_file_location('build_icons', ROOT / 'scripts/build_icons.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

records = []
for key in ('shrine', 'tactic', 'codex'):
    image = Image.open(HERE / f'{key}_generated.png').convert('RGBA')
    # The visible silhouette sets the content bounds; faint generator edge noise
    # outside it must not shrink the actual glyph during square normalization.
    bounds = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
    if not bounds:
        raise ValueError(f'{key}: empty generated icon')
    content = image.crop(bounds)
    scale = 450 / max(content.size)
    size = tuple(round(x * scale) for x in content.size)
    content = content.resize(size, Image.Resampling.LANCZOS)
    square = Image.new('RGBA', (512, 512))
    square.alpha_composite(content, ((512 - size[0]) // 2, (512 - size[1]) // 2))
    square.save(HERE.parent / f'{key}.png')
    target = ROOT / 'src/assets/art/icons/battle_buffs' / f'{key}.webp'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(builder.encode(square.resize((256, 256), Image.Resampling.LANCZOS)))
    records.append({'id': key, 'generatedSize': list(image.size), 'contentBounds': bounds,
                    'normalizedSize': [512, 512], 'gameSize': [256, 256], 'bytes': target.stat().st_size})

(HERE / 'manifest.json').write_text(json.dumps({'date': '2026-10-30', 'icons': records}, indent=2) + '\n', encoding='utf-8')
print(json.dumps(records))
