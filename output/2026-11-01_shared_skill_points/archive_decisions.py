"""Keep GAME_DESIGN's recent log within its documented 30-row limit."""
from pathlib import Path
import re

root=Path(__file__).resolve().parents[2]
p=root/'docs/game_design/GAME_DESIGN.md'
q=root/'docs/game_design/DECISION_LOG.md'
s=p.read_text(encoding='utf-8'); archive=q.read_text(encoding='utf-8')
a=s.index('## 9. '); b=s.index('## 10.',a)
block=s[a:b]
rows=[line for line in block.splitlines() if re.match(r'^\| \d\d-\d\d ',line)]
if len(rows)>30:
    oldest=min(re.match(r'^\| (\d\d-\d\d)',line).group(1) for line in rows)
    moved=[line for line in rows if line.startswith('| '+oldest+' |')]
    kept=[line for line in block.splitlines(keepends=True) if line.rstrip('\r\n') not in moved]
    s=s[:a]+''.join(kept)+s[b:]
    s=s.replace('10-29 까지의 결정은 거기 있고',oldest+' 까지의 결정은 거기 있고')
    end=archive.index('\n## 2.')
    divider=archive.rfind('\n---',0,end)
    new=[line for line in moved if line not in archive[:end]]
    archive=archive[:divider].rstrip()+'\n'+'\n'.join(new)+'\n\n'+archive[divider:]
    archive=archive.replace('~ 10-29)', '~ '+oldest+')')
    p.write_text(s,encoding='utf-8',newline='')
    q.write_text(archive,encoding='utf-8',newline='')
    print('Archived',len(moved),'rows from',oldest,'; kept',len(rows)-len(moved),'recent decisions.')
