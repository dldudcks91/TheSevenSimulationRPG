"""Print executable-looking lines for review, preserving original line numbers."""
import re
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text(encoding='utf-8-sig')
text = re.sub(r'/\*[\s\S]*?\*/', lambda m: '\n' * m[0].count('\n'), text)
lo = int(sys.argv[2]) if len(sys.argv) > 2 else 1
hi = int(sys.argv[3]) if len(sys.argv) > 3 else 100000
for n, line in enumerate(text.splitlines(), 1):
    if lo <= n <= hi and line.strip() and not line.lstrip().startswith('//'):
        print(f'{n}: {line}')
