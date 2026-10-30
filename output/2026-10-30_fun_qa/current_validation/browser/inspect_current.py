"""Reuse the observation procedure while resolving every product input from latest snapshot."""
import runpy,sys
from pathlib import Path
OUT=Path(__file__).resolve().parent
CURRENT=OUT.parent
FUN=CURRENT.parent
sys.path.insert(0,str(FUN/'browser'))
import fun_browser as b
b.OUT=OUT;b.RUN=CURRENT;b.SNAPSHOT=CURRENT/'snapshot/src'
b.SOURCE={'/'+p.relative_to(b.SNAPSHOT).as_posix():p.read_bytes() for p in b.SNAPSHOT.rglob('*') if p.is_file()}
runpy.run_path(str(FUN/'browser/inspect_checkpoint.py'),run_name='__main__')
