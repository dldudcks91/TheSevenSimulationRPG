"""Serve the frozen snapshot (pace/snap/src) with the repo's serve.py handler; assets come from the repo."""
import importlib.util
import sys
from pathlib import Path

ROOT = Path(r"C:\Users\user\Desktop\python_text\git\TheSevenSimulationRPG")
SNAP = Path(__file__).resolve().parent / "snap" / "src"
spec = importlib.util.spec_from_file_location("review_http", ROOT / "serve.py")
server = importlib.util.module_from_spec(spec)
saved = sys.argv
sys.argv = sys.argv[:1]
spec.loader.exec_module(server)
sys.argv = saved
server.ROOT = str(SNAP)


class Handler(server.NoCacheHandler):
    def translate_path(self, path):
        target = Path(super().translate_path(path))
        try:
            rel = target.relative_to(SNAP)
        except ValueError:
            return str(target)
        if rel.parts and rel.parts[0] == "assets":
            return str(ROOT / "src" / rel)
        return str(target)

    def log_message(self, *args):
        pass


server.Server.allow_reuse_address = False
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8797
with server.Server((server.HOST, port), Handler) as httpd:
    print(f"snapshot on http://127.0.0.1:{port}", flush=True)
    httpd.serve_forever()
