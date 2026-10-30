"""Inspect Korean JS string content while excluding comments and template code.

Usage: python -X utf8 tmp/audit_korean_literals.py [path ...]
The default covers the current UI and game logic JS files. This lightweight
scanner is an audit helper, not a complete JavaScript parser.
"""

import argparse
import json
import re
from pathlib import Path


def korean_literals(source):
    hits = []

    def save(start, end):
        value = source[start:end]
        if re.search(r"[가-힣]", value):
            hits.append({"line": source.count("\n", 0, start) + 1,
                         "text": value,
                         "context": source[max(0, source.rfind("\n", 0, start) + 1):start]})

    def string_at(index):
        quote = source[index]
        index += 1
        segment = index
        while index < len(source):
            if source[index] == "\\":
                index += 2
                continue
            if source[index] == quote:
                save(segment, index)
                return index + 1
            if quote == "`" and source.startswith("${", index):
                save(segment, index)
                index = code_at(index + 2, expression=True)
                segment = index
                continue
            index += 1
        save(segment, index)
        return index

    def code_at(index, expression=False):
        depth = 0
        regex_allowed = True
        while index < len(source):
            if source.startswith("//", index):
                end = source.find("\n", index + 2)
                index = len(source) if end < 0 else end
                continue
            if source.startswith("/*", index):
                end = source.find("*/", index + 2)
                index = len(source) if end < 0 else end + 2
                continue
            if source[index] in "\"'`":
                index = string_at(index)
                regex_allowed = False
                continue
            if source[index] == "/" and regex_allowed:
                index += 1
                in_class = False
                while index < len(source):
                    char = source[index]
                    if char == "\\":
                        index += 2
                        continue
                    if char == "[":
                        in_class = True
                    elif char == "]":
                        in_class = False
                    elif char == "/" and not in_class:
                        index += 1
                        while index < len(source) and source[index].isalpha():
                            index += 1
                        break
                    index += 1
                regex_allowed = False
                continue
            if source[index].isalpha() or source[index] in "_$":
                end = index + 1
                while end < len(source) and (source[end].isalnum() or source[end] in "_$"):
                    end += 1
                regex_allowed = source[index:end] in {
                    "return", "throw", "case", "delete", "typeof", "void", "new",
                    "in", "of", "yield", "await", "instanceof",
                }
                index = end
                continue
            if expression:
                if source[index] == "{":
                    depth += 1
                elif source[index] == "}":
                    if depth == 0:
                        return index + 1
                    depth -= 1
            if not source[index].isspace():
                regex_allowed = source[index] not in ")]}." and not source[index].isdigit()
            index += 1
        return index

    code_at(0)
    return hits


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    paths = [Path(p) for p in args.paths] if args.paths else sorted(
        [*Path("src/ui").glob("*.js"), *Path("src/game_logic").glob("*.js")])
    rows = []
    for path in paths:
        for hit in korean_literals(path.read_text(encoding="utf-8-sig")):
            rows.append({"path": path.as_posix(), **hit})
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        for row in rows:
            print(f"{row['path']}:{row['line']}: {row['context']}{row['text']}")
        print(f"Korean literal segments: {len(rows)} in {len(paths)} files")


if __name__ == "__main__":
    main()
