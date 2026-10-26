"""Build the deployed copy of the game (GitHub Pages) — the files the game reads, with comments stripped.

Rule (docs/client/ARCHITECTURE.md §11 「배포판」):
- Development runs the repo as-is — no build. Only the deployed copy goes through this script
  (.github/workflows/pages.yml runs it on every push to main).
- In:  index.html (repo root redirect) · src/index.html · src/ui · src/game_logic · src/data/*.csv
       · installed art under src/assets/art (originals `source/` · `*_source/` stay out) · src/dev/funnel.* (admin funnel page).
- Out: docs · output · prototypes · tmp · PLAN*.md · READMEs · the dev test pages · CSV `inherited/`.
- JS · CSS lose their comments; HTML loses `<!-- -->` comments (inline <script>/<style> get the JS/CSS treatment).
  Nothing else changes — names, strings, template literals and regex literals are copied byte for byte.
  Whitespace outside literals is tidied (blank lines and trailing spaces go; a newline stays wherever one was).
- CSV is copied as-is (CLAUDE.md rule 4).
- Self-check per file: the stripped output is lexed again and its token stream (comments and whitespace aside)
  must equal the source's; brackets must balance. Any mismatch stops the build.

Usage:  python scripts/build_deploy.py <out_dir> [--with-dev]
  --with-dev  also copies the dev test pages (src/dev/test · sim · golden — stripped the same way) so dev/test.html
              can be run against the built copy. Never use it for the real deploy.
Requires the standard library only.
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

ART_EXT = {".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg"}
DEV_PAGES = ["funnel.html", "funnel.js"]
DEV_TEST_PAGES = ["test.html", "test.js", "sim.html", "sim.js", "golden.js", "golden.json"]


class BuildError(Exception):
    pass


# ── JS ──────────────────────────────────────────────────────────────────────

WS = " \t\r\n﻿   \v\f"
PUNCT = sorted("""
>>>= ... === !== **= <<= >>= >>> &&= ||= ??= => == != <= >= && || ?? ?. ++ -- += -= *= /= %= &= |= ^= ** << >>
{ } ( ) [ ] ; , < > + - * / % & | ^ ! ~ ? : = . @ #
""".split(), key=len, reverse=True)
# a `/` after one of these starts a regex literal (anything else: division)
REGEX_AFTER_WORDS = {"return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw",
                     "case", "do", "else", "yield", "await"}
NUM = re.compile(r"0[xX][0-9a-fA-F_]+n?|0[oO][0-7_]+n?|0[bB][01_]+n?"
                 r"|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?n?")
IDENT = re.compile(r"(?:[A-Za-z_$\u0080-￿]|\\u[0-9a-fA-F]{4})(?:[\w$\u0080-￿]|\\u[0-9a-fA-F]{4})*")


def lex_js(src: str, name: str) -> list[tuple[str, str]]:
    """Tokens as (kind, text): ws · comment · str · tpl · re · num · id · punc. Template literals are split at `${` / `}`."""
    toks: list[tuple[str, str]] = []
    i, n = 0, len(src)
    subs: list[int] = []      # one entry per open `${` — the `{` depth inside that substitution
    last: tuple[str, str] | None = None

    def regex_ok() -> bool:
        if last is None:
            return True
        k, t = last
        if k == "punc":
            return t not in (")", "]")
        if k == "id":
            return t in REGEX_AFTER_WORDS
        if k == "tpl":
            return t.endswith("${")
        return False

    def scan_tpl(j: int) -> int:
        """From inside a template literal, return the index just past its next `` ` `` or `${`."""
        while j < n:
            ch = src[j]
            if ch == "\\":
                j += 2
            elif ch == "`":
                return j + 1
            elif ch == "$" and src.startswith("${", j):
                return j + 2
            else:
                j += 1
        raise BuildError(f"{name}: unterminated template literal")

    while i < n:
        c = src[i]
        if c in WS:
            j = i
            while j < n and src[j] in WS:
                j += 1
            toks.append(("ws", src[i:j])); i = j; continue
        if c == "/" and src.startswith("//", i):
            j = i
            while j < n and src[j] not in "\n\r  ":
                j += 1
            toks.append(("comment", src[i:j])); i = j; continue
        if c == "/" and src.startswith("/*", i):
            j = src.find("*/", i + 2)
            if j < 0:
                raise BuildError(f"{name}: unterminated block comment")
            toks.append(("comment", src[i:j + 2])); i = j + 2; continue
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == "\\":
                    j += 1
                elif src[j] in "\n\r":
                    raise BuildError(f"{name}: newline inside a string literal (offset {i})")
                j += 1
            if j >= n:
                raise BuildError(f"{name}: unterminated string literal (offset {i})")
            tok = ("str", src[i:j + 1]); toks.append(tok); last = tok; i = j + 1; continue
        if c == "`" or (c == "}" and subs and subs[-1] == 0):
            if c == "}":
                subs.pop()
            j = scan_tpl(i + 1)
            text = src[i:j]
            if text.endswith("${"):
                subs.append(0)
            tok = ("tpl", text); toks.append(tok); last = tok; i = j; continue
        if c == "/" and regex_ok():
            j, in_class = i + 1, False
            while j < n:
                ch = src[j]
                if ch == "\\":
                    j += 2; continue
                if ch in "\n\r":
                    raise BuildError(f"{name}: newline inside a regex literal (offset {i})")
                if ch == "[":
                    in_class = True
                elif ch == "]":
                    in_class = False
                elif ch == "/" and not in_class:
                    break
                j += 1
            if j >= n:
                raise BuildError(f"{name}: unterminated regex literal (offset {i})")
            j += 1
            while j < n and (src[j].isalnum() or src[j] in "_$"):
                j += 1
            tok = ("re", src[i:j]); toks.append(tok); last = tok; i = j; continue
        m = NUM.match(src, i) if (c.isdigit() or (c == "." and i + 1 < n and src[i + 1].isdigit())) else None
        if m:
            tok = ("num", m.group()); toks.append(tok); last = tok; i = m.end(); continue
        m = IDENT.match(src, i)
        if m:
            tok = ("id", m.group()); toks.append(tok); last = tok; i = m.end(); continue
        for p in PUNCT:
            if src.startswith(p, i):
                if p == "{" and subs:
                    subs[-1] += 1
                elif p == "}" and subs:
                    subs[-1] -= 1
                tok = ("punc", p); toks.append(tok); last = tok; i += len(p)
                break
        else:
            raise BuildError(f"{name}: unexpected character {c!r} at offset {i}")
    if subs:
        raise BuildError(f"{name}: unterminated template substitution")
    return toks


def tidy_ws(toks: list[tuple[str, str]]) -> str:
    """Join tokens, collapsing each whitespace run: a run with a newline becomes one newline + the next line's indent."""
    out: list[str] = []
    pending: list[str] = []

    def flush(at_start: bool) -> None:
        if not pending:
            return
        run = "".join(pending)
        pending.clear()
        if at_start:
            return
        nl = max(run.rfind("\n"), run.rfind("\r"))
        out.append("\n" + run[nl + 1:] if nl >= 0 else run)

    for k, t in toks:
        if k == "ws":
            pending.append(t)
        else:
            flush(not out)
            out.append(t)
    return "".join(out) + "\n"


def strip_js(src: str, name: str) -> str:
    toks = lex_js(src, name)
    kept: list[tuple[str, str]] = []
    for k, t in toks:
        if k == "comment":
            # a block comment holding a line break is a line terminator for ASI — keep the break
            if t.startswith("/*"):
                kept.append(("ws", "\n" if ("\n" in t or "\r" in t) else " "))
            continue
        kept.append((k, t))
    out = tidy_ws(kept)
    check_js(src, out, name)
    return out


def check_js(src: str, out: str, name: str) -> None:
    sig = lambda ts: [(k, t) for k, t in ts if k not in ("ws", "comment")]
    a, b = sig(lex_js(src, name)), sig(lex_js(out, name))
    if a != b:
        at = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
        raise BuildError(f"{name}: token stream changed at token {at}: {a[at:at + 3]} -> {b[at:at + 3]}")
    depth = {"(": 0, "[": 0, "{": 0}
    close = {")": "(", "]": "[", "}": "{"}
    for k, t in b:
        if k == "punc" and t in depth:
            depth[t] += 1
        elif k == "punc" and t in close:
            depth[close[t]] -= 1
            if depth[close[t]] < 0:
                raise BuildError(f"{name}: unbalanced {t!r}")
    if any(depth.values()):
        raise BuildError(f"{name}: unbalanced brackets {depth}")


# ── CSS ─────────────────────────────────────────────────────────────────────

def lex_css(src: str, name: str) -> list[tuple[str, str]]:
    toks: list[tuple[str, str]] = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c in WS:
            j = i
            while j < n and src[j] in WS:
                j += 1
            toks.append(("ws", src[i:j])); i = j; continue
        if src.startswith("/*", i):
            j = src.find("*/", i + 2)
            if j < 0:
                raise BuildError(f"{name}: unterminated comment")
            toks.append(("comment", src[i:j + 2])); i = j + 2; continue
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == "\\" else 1
            if j >= n:
                raise BuildError(f"{name}: unterminated string (offset {i})")
            toks.append(("str", src[i:j + 1])); i = j + 1; continue
        if src[i:i + 4].lower() == "url(" and not src[i + 4:i + 5].strip() in ("'", '"'):
            j = src.find(")", i)
            if j < 0:
                raise BuildError(f"{name}: unterminated url(")
            toks.append(("url", src[i:j + 1])); i = j + 1; continue
        j = i
        while j < n and src[j] not in WS and src[j] not in "'\"" and not src.startswith("/*", j) \
                and src[j:j + 4].lower() != "url(":
            j += 1
        toks.append(("text", src[i:max(j, i + 1)])); i = max(j, i + 1)
    return toks


def strip_css(src: str, name: str) -> str:
    toks = lex_css(src, name)
    kept: list[tuple[str, str]] = []
    for idx, (k, t) in enumerate(toks):
        if k != "comment":
            kept.append((k, t))
            continue
        # comments are not whitespace in CSS — `a/**/b` is two tokens; keep an empty comment only where that matters
        prev = kept[-1] if kept else None
        nxt = toks[idx + 1] if idx + 1 < len(toks) else None
        word_end = prev is not None and prev[0] != "ws" and (prev[1][-1:].isalnum() or prev[1][-1:] in ("-", "_"))
        word_start = nxt is not None and nxt[0] not in ("ws", "comment") and (nxt[1][:1].isalnum() or nxt[1][:1] in ("-", "_"))
        if word_end and word_start:
            kept.append(("text", "/**/"))
    out = tidy_ws(kept)
    sig = lambda ts: [t for k, t in ts if k not in ("ws", "comment")]
    if "".join(sig(lex_css(src, name))) != "".join(t for t in sig(lex_css(out, name)) if t != "/**/"):
        raise BuildError(f"{name}: CSS content changed while stripping")
    return out


# ── HTML ────────────────────────────────────────────────────────────────────

BLOCK = re.compile(r"(<script\b[^>]*>)(.*?)(</script>)|(<style\b[^>]*>)(.*?)(</style>)|<!--.*?-->", re.S | re.I)


def strip_html(src: str, name: str) -> str:
    def sub(m: re.Match) -> str:
        if m.group(1):
            body = m.group(2)
            return m.group(1) + (strip_js(body, f"{name} <script>").strip("\n") if body.strip() else body) + m.group(3)
        if m.group(4):
            return m.group(4) + strip_css(m.group(5), f"{name} <style>").strip("\n") + m.group(6)
        return ""
    out = BLOCK.sub(sub, src)
    lines = [ln.rstrip() for ln in out.splitlines()]
    return "\n".join(ln for ln in lines if ln) + "\n"


# ── copy plan ───────────────────────────────────────────────────────────────

def put(dst: Path, text: str | None = None, copy_from: Path | None = None) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if copy_from is not None:
        shutil.copyfile(copy_from, dst)
    else:
        dst.write_text(text, encoding="utf-8", newline="\n")


def build_file(src: Path, dst: Path, stats: dict) -> None:
    rel = src.relative_to(ROOT).as_posix()
    ext = src.suffix.lower()
    raw = src.stat().st_size
    if ext == ".js":
        put(dst, strip_js(src.read_text(encoding="utf-8"), rel))
    elif ext == ".css":
        put(dst, strip_css(src.read_text(encoding="utf-8"), rel))
    elif ext == ".html":
        put(dst, strip_html(src.read_text(encoding="utf-8"), rel))
    else:
        put(dst, copy_from=src)
    kind = ext if ext in (".js", ".css", ".html", ".csv") else "art"
    s = stats.setdefault(kind, [0, 0, 0])
    s[0] += 1; s[1] += raw; s[2] += dst.stat().st_size


def is_art_original(p: Path) -> bool:
    return any(part == "source" or part.endswith("_source") for part in p.relative_to(SRC / "assets/art").parts[:-1])


def plan(with_dev: bool) -> list[tuple[Path, str]]:
    files: list[tuple[Path, str]] = [(ROOT / "index.html", "index.html"), (SRC / "index.html", "src/index.html")]
    for d in ("ui", "game_logic"):
        files += [(p, f"src/{d}/{p.name}") for p in sorted((SRC / d).glob("*")) if p.suffix in (".js", ".css")]
    files += [(p, f"src/data/{p.name}") for p in sorted((SRC / "data").glob("*.csv"))]
    for p in sorted((SRC / "assets/art").rglob("*")):
        if p.is_file() and not is_art_original(p) and (p.suffix.lower() in ART_EXT or p.suffix == ".js"):
            files.append((p, p.relative_to(ROOT).as_posix()))
    for f in DEV_PAGES + (DEV_TEST_PAGES if with_dev else []):
        files.append((SRC / "dev" / f, f"src/dev/{f}"))
    return files


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__.split("\n\n")[-2])
        return 2
    out = Path(args[0]).resolve()
    # the out dir is wiped first — inside the repo only `_site/` (what the workflow uploads) is allowed
    if out == ROOT or (ROOT in out.parents and out.relative_to(ROOT).parts[0] != "_site"):
        raise BuildError(f"refusing to write into the repo outside _site/: {out}")
    if out.exists():
        shutil.rmtree(out)
    stats: dict = {}
    for src, rel in plan("--with-dev" in argv):
        if not src.is_file():
            raise BuildError(f"missing: {src.relative_to(ROOT).as_posix()}")
        build_file(src, out / rel, stats)
    (out / ".nojekyll").write_text("", encoding="utf-8")
    for kind in sorted(stats):
        n, a, b = stats[kind]
        print(f"{kind:6s} {n:5d} files  {a / 1024:9.1f} KB -> {b / 1024:9.1f} KB")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except BuildError as e:
        print(f"build_deploy: {e}", file=sys.stderr)
        sys.exit(1)
