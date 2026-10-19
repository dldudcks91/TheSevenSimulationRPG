"""Read Git objects without a Git executable and make an isolated HEAD snapshot."""
import hashlib
import json
import mmap
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
DEST = OUT / "snapshot"

class GitReader:
    def __init__(self):
        self.indices = []
        self.packs = {}
        self.cache = {}
        for idx in (ROOT / ".git/objects/pack").glob("*.idx"):
            b = idx.read_bytes()
            assert b[:8] == b"\xfftOc\x00\x00\x00\x02"
            n = struct.unpack_from(">I", b, 8 + 255 * 4)[0]
            entries = {}
            off_start = 8 + 1024 + n * 24
            for i in range(n):
                oid = b[1032 + i * 20:1032 + (i + 1) * 20].hex()
                off = struct.unpack_from(">I", b, off_start + i * 4)[0]
                if off & 0x80000000:
                    off = struct.unpack_from(">Q", b, off_start + n * 4 + (off & 0x7fffffff) * 8)[0]
                entries[oid] = off
            self.indices.append((idx.with_suffix(".pack"), entries))

    def read(self, oid):
        if oid in self.cache:
            return self.cache[oid]
        loose = ROOT / ".git/objects" / oid[:2] / oid[2:]
        if loose.exists():
            hdr, data = zlib.decompress(loose.read_bytes()).split(b"\0", 1)
            result = (hdr.split()[0].decode(), data)
        else:
            for path, entries in self.indices:
                if oid in entries:
                    result = self.packed(path, entries[oid])
                    break
            else:
                raise KeyError(oid)
        kind, data = result
        assert hashlib.sha1(kind.encode() + b" " + str(len(data)).encode() + b"\0" + data).hexdigest() == oid
        self.cache[oid] = result
        return result

    def packed(self, path, off):
        if path not in self.packs:
            f = path.open("rb")
            self.packs[path] = (f, mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ))
        b = self.packs[path][1]
        i = off
        c = b[i]; i += 1
        kind = (c >> 4) & 7
        while c & 128:
            c = b[i]; i += 1
        base = None
        if kind == 6:
            c = b[i]; i += 1
            back = c & 127
            while c & 128:
                c = b[i]; i += 1
                back = ((back + 1) << 7) + (c & 127)
            base = self.packed(path, off - back)
        elif kind == 7:
            base = self.read(b[i:i + 20].hex()); i += 20
        d = zlib.decompressobj()
        chunks = []
        while not d.eof:
            chunk = b[i:i + 65536]
            if not chunk:
                raise ValueError("truncated pack")
            chunks.append(d.decompress(chunk)); i += len(chunk)
        data = b"".join(chunks)
        if base is not None:
            data = self.delta(base[1], data)
            return base[0], data
        return {1:"commit",2:"tree",3:"blob",4:"tag"}[kind], data

    @staticmethod
    def delta(base, delta):
        i = 0
        def varint():
            nonlocal i
            n = shift = 0
            while True:
                c = delta[i]; i += 1
                n |= (c & 127) << shift
                if not c & 128: return n
                shift += 7
        assert varint() == len(base)
        size = varint()
        out = bytearray()
        while i < len(delta):
            cmd = delta[i]; i += 1
            if cmd & 128:
                off = length = 0
                for bit in range(4):
                    if cmd & (1 << bit):
                        off |= delta[i] << (bit * 8); i += 1
                for bit in range(3):
                    if cmd & (1 << (bit + 4)):
                        length |= delta[i] << (bit * 8); i += 1
                out.extend(base[off:off + (length or 65536)])
            else:
                assert cmd
                out.extend(delta[i:i + cmd]); i += cmd
        assert len(out) == size
        return bytes(out)

    def tree(self, oid):
        kind, b = self.read(oid)
        assert kind == "tree"
        i = 0
        while i < len(b):
            j = b.index(b" ", i)
            k = b.index(b"\0", j)
            yield b[i:j].decode(), b[j + 1:k].decode(), b[k + 1:k + 21].hex()
            i = k + 21

if __name__ == "__main__":
    git = GitReader()
    ref = (ROOT / ".git/HEAD").read_text().strip()
    head = (ROOT / ".git" / ref[5:]).read_text().strip() if ref.startswith("ref: ") else ref
    _, commit = git.read(head)
    tree = commit.splitlines()[0].split()[1].decode()
    manifest = {}
    def walk(oid, prefix=""):
        for mode, name, child in git.tree(oid):
            rel = prefix + name
            if rel == "src" or (rel.startswith("src/") and not rel.startswith("src/assets")):
                if mode == "40000":
                    walk(child, rel + "/")
                else:
                    _, data = git.read(child)
                    dst = DEST / rel
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    dst.write_bytes(data)
                    live = ROOT / rel
                    manifest[rel] = {"blob": child, "working_copy_differs": not live.exists() or live.read_bytes() != data}
    walk(tree)
    (OUT / "snapshot_manifest.json").write_text(json.dumps({"commit":head,"files":manifest}, indent=2), encoding="utf-8")
    print(json.dumps({"commit":head,"files":len(manifest),"working_copy_differences":sum(x["working_copy_differs"] for x in manifest.values())}))
