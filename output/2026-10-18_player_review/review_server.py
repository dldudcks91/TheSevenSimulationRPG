"""Serve frozen committed code and the existing read-only art tree."""
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAP = Path(__file__).resolve().parent / (sys.argv[1] if len(sys.argv)>1 else "snapshot") / "src"
spec = importlib.util.spec_from_file_location("review_http", ROOT / "serve.py")
server = importlib.util.module_from_spec(spec)
saved_args = sys.argv
sys.argv = sys.argv[:1]
spec.loader.exec_module(server)
sys.argv = saved_args
server.ROOT = str(SNAP)

class Handler(server.NoCacheHandler):
    def translate_path(self, path):
        target = Path(super().translate_path(path))
        rel = target.relative_to(SNAP)
        if rel.parts and rel.parts[0] == "assets":
            return str(ROOT / "src" / rel)
        return str(target)

    def log_message(self, *args):
        pass

server.Server.allow_reuse_address = False
port = int(sys.argv[2]) if len(sys.argv)>2 else 8793
with server.Server((server.HOST, port), Handler) as httpd:
    print(f"Review snapshot on http://127.0.0.1:{port}", flush=True)
    httpd.serve_forever()
