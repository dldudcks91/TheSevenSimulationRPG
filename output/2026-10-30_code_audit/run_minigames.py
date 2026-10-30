"""Run the repository's real-input minigame checks on the audit server and output path."""
from pathlib import Path
import sys

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
original=ROOT/'scripts/verify_resource_minigames.py'
source=original.read_text(encoding='utf-8')
source=source.replace("OUT = ROOT / 'tmp/minigame_review'",f'OUT = Path({str(OUT / "minigames")!r})')
source=source.replace('127.0.0.1:8777','127.0.0.1:8921')
if '--original-setup' not in sys.argv:
    # Since R361 the resource line also requires storage construction. The old
    # repository script only builds the laboratory through dev=mg and is locked.
    source=source.replace('dev=mg&','dev=mg&cn=max&')
source=source.replace("    page = context.new_page()", "    context.route('https://**/*', lambda route: route.abort())\n    page = context.new_page()",1)
source=source.replace('    touch=touch_context.new_page()', "    touch_context.route('https://**/*',lambda route:route.abort())\n    touch=touch_context.new_page()")
exec(compile(source,str(original),'exec'),{'__file__':str(original),'__name__':'__main__'})
