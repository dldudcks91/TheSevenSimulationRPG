"""Validate shipped game text against the UI dictionary, CSV data and static UI names.

Run from any directory with Python 3 and Node.js: python scripts/check_locales.py
"""
import csv
import json
import re
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UI = ROOT / "src/ui"
TOKEN = re.compile(r"\{[^{}\n]+\}|</?[A-Za-z][^>]*>")
LITERAL = r"""(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")"""


def sources():
    # Evaluate the actual JS dictionary and string literals, including JS escape sequences.
    extract = r"""
        const fs = require('node:fs'), vm = require('node:vm');
        const read = file => fs.readFileSync('src/ui/' + file, 'utf8');
        const src = read('i18n.js');
        const ui = vm.runInNewContext(src.slice(src.indexOf('const STRINGS = {')) + '\nSTRINGS');
        const names = [];
        const pair = new RegExp('\\bko:\\s*(' + process.argv[1] + ')\\s*,\\s*en:\\s*(' + process.argv[1] + ')', 'g');
        for (const directory of ['src/ui', 'src/game_logic']) {
            for (const file of fs.readdirSync(directory).filter(f => f.endsWith('.js') && !['i18n.js', 'locales.js'].includes(f))) {
                for (const m of fs.readFileSync(directory + '/' + file, 'utf8').matchAll(pair)) {
                    names.push(vm.runInNewContext('[' + m[1] + ',' + m[2] + ']'));
                }
            }
        }
        process.stdout.write(JSON.stringify({ui, names}));
    """
    source = json.loads(subprocess.check_output(["node", "-e", extract, LITERAL], cwd=ROOT))
    pairs = {(ko, en) for ko, en in source["names"] if en and (en != ko or re.search(r"\w", en))}
    for path in (ROOT / "src/data").glob("*.csv"):
        if path.stem == "hero_unique_candidates":
            continue  # Design proposals outside the game.
        with path.open(encoding="utf-8-sig", newline="") as stream:
            rows = csv.DictReader(stream)
            fields = [(f[:-3] + "_kr", f) for f in rows.fieldnames if f.endswith("_en") and f[:-3] + "_kr" in rows.fieldnames]
            for row in rows:
                for kr, en in fields:
                    if row[kr] and row[en] and row[en] != "-":
                        pairs.add((row[kr].replace("\\n", "\n"), row[en].replace("\\n", "\n")))
    return source["ui"], pairs


def check():
    ui, pairs = sources()
    errors = []

    def text_matches(code, key, value, english):
        if not isinstance(value, str) or (english.strip() and not value.strip()):
            errors.append(f"{code} {key}: empty or missing")
        elif Counter(TOKEN.findall(english)) != Counter(TOKEN.findall(value)):
            errors.append(f"{code} {key}: placeholders or markup differ")
        elif any(c in value for c in ("\ufffd", "▁")):
            errors.append(f"{code} {key}: malformed text")
        else:
            stack = []
            for closing, name in re.findall(r"<(/?)(b|em)>", value):
                if not closing:
                    stack.append(name)
                elif not stack or stack.pop() != name:
                    errors.append(f"{code} {key}: mismatched </{name}>")
                    break
            if stack:
                errors.append(f"{code} {key}: unclosed <{stack[-1]}>")

    registry = (UI / "locales.js").read_text(encoding="utf-8")
    codes = re.findall(r"import\('\./locales/([\w-]+)\.js'\)", registry)
    shipped = {p.stem for p in (UI / "locales").glob("*.js")}
    if set(codes) != shipped or not codes:
        raise SystemExit("The language registry and shipped catalog files differ")
    for code in codes:
        module = (UI / "locales" / (code + ".js")).read_text(encoding="utf-8").strip()
        catalog = json.loads(module.removeprefix("export default ").removesuffix(";"))
        for key, row in ui.items():
            english, value = row["en"], catalog["ui"].get(key)
            if isinstance(english, dict):
                if code in {"ja", "zh-TW"}:
                    text_matches(code, key, value, english["other"])
                else:
                    forms = ("one", "few", "many", "other") if code == "ru" else ("one", "other")
                    for form in forms:
                        translated = value.get(form) if isinstance(value, dict) else None
                        text_matches(code, key + "#" + form, translated, english.get(form, english["other"]))
            else:
                text_matches(code, key, value, english)
        for ko, en in sorted(pairs):
            text_matches(code, en[:60], catalog["data"].get(ko + "\t" + en), en)
        with (ROOT / "src/data/sin_word.csv").open(encoding="utf-8-sig") as stream:
            for row in csv.DictReader(stream):
                text_matches(code, row["name_en"], catalog["affixes"].get(row["name_en"]), row["name_en"])
        print(f"{code}: {len(catalog['ui'])} UI entries, {len(catalog['data'])} data entries, {len(catalog['affixes'])} name modifiers")
    if errors:
        raise SystemExit("\n".join(errors))


if __name__ == "__main__":
    check()
