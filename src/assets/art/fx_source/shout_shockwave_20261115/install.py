"""Install the selected shout shockwaves and remove the replaced individual VFX."""
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[4]
OUT = ROOT / 'src/assets/art/fx/skills'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    data = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))
    assert len(data['skills']) == 12
    old = {OUT / f"{s['id']}_{s['style']}.webp" for s in data['skills']}
    new = {OUT / f"{s['id']}_shockwave_{s['style']}.webp" for s in data['skills']}
    untouched = {p.name: digest(p) for p in OUT.glob('*.webp') if p not in old | new}
    for s in data['skills']:
        source = BASE / s['output']
        with Image.open(source) as image:
            assert image.size == (512, 512) and image.convert('RGBA').getextrema()[3][0] == 0
    removed = []
    for s in data['skills']:
        s['game_file'] = f"{s['id']}_shockwave_{s['style']}.webp"
        s['duration'] = 1100
        s['pulses'] = 3
        s['ay'] = .45
        target = OUT / s['game_file']
        assert target.resolve().parent == OUT.resolve()
        shutil.copyfile(BASE / s['output'], target)
    for path in sorted(old):
        assert path.resolve().parent == OUT.resolve()
        if path.exists():
            removed.append({'path': path.relative_to(ROOT).as_posix(), 'sha256': digest(path)})
            path.unlink()
    # These review captures contain the retired art, or rely on its old filenames.
    for name in ['comparison_darktoon.png', 'comparison_foil.png', 'preserved_sha256.json',
                 'browser_report.json', 'verify_preview.py']:
        path = BASE / name
        if path.exists():
            removed.append({'path': path.relative_to(ROOT).as_posix(), 'sha256': digest(path)})
            path.unlink()
    assert all(digest(OUT / name) == value for name, value in untouched.items())
    assert all(not path.exists() for path in old)
    data['status'] = 'installed'
    (BASE / 'manifest.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    previous = BASE / 'installation_report.json'
    earlier = json.loads(previous.read_text(encoding='utf-8')).get('removed', []) if previous.exists() else []
    removed = {entry['path']: entry for entry in earlier + removed}
    report = {'installed': [s['game_file'] for s in data['skills']],
              'removed': list(removed.values()), 'unrelated_vfx_preserved': len(untouched),
              'installed_sha256': {p.name: digest(p) for p in new}}
    previous.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Installed {len(new)} shockwaves; legacy files remaining: {len(old & set(OUT.iterdir()))}; '
          f'{len(untouched)} unrelated VFX preserved.')


if __name__ == '__main__':
    main()
