"""Build an itch.io HTML demo. Run with --help for edition and output options."""

from __future__ import annotations

import argparse
import ast
import csv
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from itertools import groupby
from pathlib import Path

from PIL import Image, ImageChops

import build_deploy as deploy


ROOT = deploy.ROOT
DATA = deploy.SRC / "data"
ART = deploy.SRC / "assets/art"
MANIFEST = Path(__file__).with_name("demo_content.json")
ERROR = deploy.BuildError


def read_tables(manifest):
    tables = {}
    for name, fields in manifest["columns"].items():
        with (DATA / f"{name}.csv").open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            columns = fields.split()
            available = set(reader.fieldnames or ())
            if set(columns) != available - {"description_kr", "note"}:
                raise ERROR(f"Review changed columns in {name}.csv")
            tables[name] = [{k: row[k] for k in columns} for row in reader]
    return tables


def demo_tables(manifest, scope):
    t = read_tables(manifest)
    last = max(scope.values())
    for name, rows in t.items():
        t[name] = [r for r in rows if int(r.get("chapter", r.get("chapter_id", 1))) <= scope.get(r.get("difficulty_id", "normal"), 0)
                   and r.get("difficulty_id", "normal") in scope and r.get("release", "main") == "main"]
    stages = {r["stage_id"]: int(r["chapter"]) for r in t["stage"]}
    monsters = {r["monster_idx"] for r in t["monster"]}
    if any(ch not in stages.values() for ch in range(1, last + 1)):
        raise ERROR("No stages for a requested chapter")
    for row in t["difficulty_tier"]:
        for key, expected in (("gear_ilvl_fixed", "0"), ("level_add", "0"), ("chapter_gate", "1")):
            if row.pop(key) != expected:
                raise ERROR(f"Review the demo rules for {row['difficulty_id']}: {key}")
        row["last_chapter"] = str(scope[row["difficulty_id"]])
    if {r["difficulty_id"] for r in t["difficulty_tier"]} != scope.keys():
        raise ERROR("Missing difficulty definition")
    nm = scope.get("nightmare", 0)
    for name, field in [("stage", "dlvl_nightmare"), ("monster", "nightmare_skill")]:
        for r in t[name]:
            if not nm:
                del r[field]
            elif int(r["chapter"]) > nm:
                r[field] = ""

    allowed = lambda difficulty, chapter: 0 < chapter <= scope.get(difficulty, 0)
    t["endless_floor"] = [r for r in t["endless_floor"] if allowed(r["difficulty_id"], stages.get(r["stage_id"], 0))]
    knobs = {r["key"]: r["value"] for r in t["balance"]}
    tactic_chapter = max((scope[r["difficulty_id"]] for r in t["difficulty_tier"]
                          if int(r["order"]) >= int(knobs["stage_tactic_min_order"])), default=0)
    t["stage_tactic"] = [r for r in t["stage_tactic"] if int(r["chapter"]) <= tactic_chapter]
    public_knobs = set(" ".join(manifest["balance"]).split())
    unreviewed = {k for k in knobs if k not in public_knobs and not k.startswith("pace_target_")}
    if unreviewed:
        raise ERROR(f"Review new balance keys: {sorted(unreviewed)}")
    t["balance"] = [r for r in t["balance"] if r["key"] in public_knobs
                    and r["key"] not in {"elite_trait_def_mult", "chapter_debuff_boss_mult"}
                    and (nm or not r["key"].startswith("elite_enchant_"))
                    and (tactic_chapter or r["key"] != "stage_tactic_min_order")]
    for r in t["balance"]:
        if r["key"] == "chapter_open_max":
            r["value"] = str(last)

    def requirement(part):
        kind, *args = part.split(":")
        if kind == "chapter":
            return allowed(args[1] if len(args) > 1 else "normal", int(args[0]))
        if kind == "stage":
            return args[0] in stages
        if kind == "difficulty":
            return args[0] in scope
        if kind in {"-", "hero", "building"}:
            return True
        raise ERROR(f"Review new building requirement: {part}")

    t["building_rank"] = [r for r in t["building_rank"] if all(map(requirement, r["require"].split("|")))]
    ranks = {(r["building_id"], r["rank"]) for r in t["building_rank"]}
    t["building_effect"] = [r for r in t["building_effect"] if (r["building_id"], r["rank"]) in ranks]
    lab_rank = sum(int(r["value"]) for r in t["building_effect"] if r["target"] == "resource_tier")
    t["lab_node"] = [r for r in t["lab_node"] if int(r["unlock_rank"]) <= lab_rank]
    for r in t["lab_node"]:
        r["max_lv"] = str(min(int(r["max_lv"]), lab_rank * int(knobs["lab_node_lv_per_rank"])))
    fame = next(int(r["max_lv"]) for r in t["lab_node"] if r["node"] == "commission")
    t["commission_level"] = [r for r in t["commission_level"] if int(r["level"]) <= fame]
    segments = sum(1 if r["target"] == "codex" else int(r["value"]) for r in t["building_effect"]
                   if r["target"] in {"codex", "codex_level"})
    groups = [list(g) for _, g in groupby(t["codex_level"], key=lambda r: r["reward"])]
    t["codex_level"] = [r for g in groups[:segments] for r in g]
    rewards = {r["reward"] for r in t["codex_level"]}
    t["codex_option"] = [r for r in t["codex_option"] if r["monster_idx"] in monsters]
    for r in t["codex_option"]:
        for reward, columns in [("option", ("stat", "value")), ("fight", ("fight", "fight_value"))]:
            if reward not in rewards:
                for column in columns:
                    del r[column]

    classes = {r["class_id"] for r in t["class"]}
    t["hero_name"] = [r for r in t["hero_name"] if r["class_id"] in classes]
    equipped = {r[k] for r in t["monster"] for k in ("innate_skill", "nightmare_skill") if k in r}
    t["skill"] = [r for r in t["skill"] if r["owner_kind"] != "monster" or r["skill_id"] in equipped]
    skills = {r["skill_id"] for r in t["skill"]}
    t["skill_effect"] = [r for r in t["skill_effect"] if r["skill_id"] in skills]
    return {k: v for k, v in t.items() if v and k not in {"raid_boss", "raid_pattern", "hero_unique_candidates"}}


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, rows[0].keys(), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def replace_one(source, pattern, replacement):
    result, count = re.subn(pattern, lambda _: replacement, source, flags=re.M | re.S)
    if count != 1:
        raise ERROR(f"Review demo source rule {pattern!r} ({count} matches)")
    return result


def array(source, name, items):
    return replace_one(source, rf"(?<=const {name} = )\[.*?\];", json.dumps(items, ensure_ascii=False) + ";")


def edition_blocks(source, features):
    # Markers surround normal, readable full-game code. Reject new/unbalanced directives.
    out, last, active = [], 0, None
    for mark in re.finditer(r"/\* @(include (\w+)|end) \*/", source):
        if active is None or features[active]:
            out.append(source[last:mark.start()])
        name = mark[2]
        if (name is None) != (active is not None) or (name and name not in features):
            raise ERROR(f"Unexpected edition directive {mark[0]}")
        active, last = name, mark.end()
    if active is not None:
        raise ERROR(f"Unclosed edition directive {active}")
    return "".join(out) + source[last:]


def localize(source, scope, tables, catalog_ui):
    nm = scope.get("nightmare", 0)
    cap = max(int(r["level"]) for r in tables["codex_level"])
    normal = scope["normal"]
    bounds = [f"노말 {normal}장", f"Normal Chapter {normal}", f"普通第{normal}章"]
    if nm:
        bounds = [f"{bounds[0]}, 나이트메어 {nm}장", f"{bounds[1]}, Nightmare Chapter {nm}", f"{bounds[2]}、噩梦第{nm}章"]
    compact = {
        "help.expedition.difficulty.body": bounds,
        "help.expedition.stages.body": ["스테이지를 차례로 클리어하고 장 보스를 처치하면 다음 공개 장이 열립니다.",
            "Clear stages in order and defeat the chapter boss to open the next available chapter.", "依次通关并击败章节首领即可开启下一个开放章节。"],
        "help.explore.run.body": ["동굴에서는 원정 전투, 마차에서는 호위전, 폐허에서는 보물과 장마다 다른 함정을 만납니다.",
            "Fight expeditions in caves, defend caravans, and encounter treasure and chapter-specific traps in ruins.", "洞穴中可进行远征，商队需要护送，废墟中藏有宝藏以及各章独特的陷阱。"],
        "help.character.rarity.body": ["장비의 희귀도와 옵션을 확인하세요. 적의 등급에 따라 드롭 확률이 달라집니다.",
            "Check equipment rarity and options. Drop chances depend on enemy grade.", "查看装备稀有度与词条。掉率随敌人品级而变化。"],
        "help.codex.library_unlocks.body": [f"도서관 랭크에 따라 도감 레벨이 최대 {cap}까지 열립니다.",
            f"Library ranks unlock Codex levels up to {cap}.", f"图书馆等级可解锁最高{cap}级的图鉴。"],
        "help.codex.milestones.body": ["몬스터를 처치하면 도감 경험치를 얻습니다. 구간별 누적 경험치는 {list}입니다.",
            "Defeat monsters to earn Codex experience. The cumulative thresholds are {list}.", "击败怪物可获得图鉴经验。各区间所需的累计经验为{list}。"],
    }
    # Each translation is one top-level property of STRINGS, containing an object.
    # Entries may close inline on any line. A following top-level key reliably ends the entry.
    prop = re.compile(r"^    '([^'\n]+)'[ \t]*:[ \t]*\{.*?(?=^    '[^'\n]+'[ \t]*:[ \t]*\{|^\};)", re.M | re.S)
    seen = set()
    def project(match):
        key = match[1]
        if key in compact:
            seen.add(key)
            return f"    '{key}': " + json.dumps(dict(zip(("ko", "en", "zh"), compact[key])), ensure_ascii=False) + ",\n"
        if (key.startswith(("raid.", "help.raid.", "help.expedition.hell_debuffs.", "bt.curse.lore.", "exp.debuff.")) or
                key in {"nav.raid", "lab.tool.raid", "bt.trait.defMult", "bt.trait.resCap", "exp.debuffLine", "bt.buff.curse"} or
                (not nm and key.startswith("bt.trait.enchant."))):
            return ""
        catalog_ui.add(key)
        return match[0]
    result = prop.sub(project, source)
    if seen != compact.keys():
        raise ERROR(f"Review help keys: {compact.keys() - seen}")
    return result


def locale_registry(source):
    # Languages without a source catalog are still in development. Expose only working choices.
    start = source.index("const loaders = {")
    end = source.index("};", start)
    entries = re.findall(r"""^\s*['"]?([\w-]+)['"]?:\s*\(\) => import\('\./locales/([\w-]+)\.js'\),\s*$""",
                         source[start:end], re.M)
    if not entries or any(code != stem for code, stem in entries) or len(entries) != source[start:end].count("import("):
        raise ERROR("Review the language catalog loaders")
    missing = [code for code, _ in entries if not (deploy.SRC / "ui/locales" / (code + ".js")).is_file()]
    for code in missing:
        key = rf"(?:'{re.escape(code)}'|\b{re.escape(code)})"
        source = replace_one(source, key + r": '[^'\n]+',\s*", "")
        source = replace_one(source, key + r": \(\) => import\('[^']+'\),\s*", "")
    if missing:
        print("Demo omits unavailable language catalogs: " + ", ".join(missing))
    return source


def write_catalogs(out, paths, tables, catalog_ui, name_pairs, scope):
    pairs = set()
    for rows in tables.values():
        fields = [(k, k[:-3] + "_en") for k in rows[0] if k.endswith("_kr") and k[:-3] + "_en" in rows[0]]
        for row in rows:
            for ko, en in fields:
                pairs.add((row[ko] + "\t" + row[en]).replace("\\n", "\n"))
    pairs.update(name_pairs)
    allowed = {"ui": catalog_ui, "data": pairs, "affixes": {r["name_en"] for r in tables["sin_word"]}}
    localized_help = json.loads(Path(__file__).with_name("demo_locale_text.json").read_text(encoding="utf-8"))
    cap = max(int(row["level"]) for row in tables["codex_level"])
    for path in paths:
        raw = path.read_text(encoding="utf-8-sig").strip()
        if not raw.startswith("export default ") or not raw.endswith(";"):
            raise ERROR(f"Review the format of {path.name}")
        catalog = json.loads(raw[len("export default "):-1])
        if catalog.keys() != allowed.keys() or any(not isinstance(v, dict) for v in catalog.values()):
            raise ERROR(f"Review changed catalog sections in {path.name}")
        projected = {k: {key: value for key, value in catalog[k].items() if key in keys} for k, keys in allowed.items()}
        help_text = localized_help.get(path.stem)
        if help_text:
            bounds = [help_text["normal"].format(normal=scope["normal"])]
            if "nightmare" in scope:
                bounds.append(help_text["nightmare"].format(nm=scope["nightmare"]))
            delimiter = "、" if path.stem in {"ja", "zh-TW"} else ", "
            projected["ui"]["help.expedition.difficulty.body"] = delimiter.join(bounds)
            for key, value in help_text.items():
                if key.startswith("help."):
                    projected["ui"][key] = value.replace("{cap}", str(cap))
        deploy.put(out / path.relative_to(ROOT), "export default " + json.dumps(projected, ensure_ascii=False) + ";\n")


def build_resources(out, tables, scope, manifest):
    art = {(ART / d / n) for d, names in manifest["shared_art"].items() for n in names.split()}
    # Only elemental enchanted elites use these four chips in an edition without the defense slot.
    buff_dir = ART / "icons/battle_buffs"
    visible_buffs = {"elite_" + el for el in ("fire", "cold", "lightning", "poison")} if "nightmare" in scope else set()
    art = {p for p in art if p.parent != buff_dir or not p.stem.startswith("elite_") or p.stem in visible_buffs}
    def add(folder, names):
        for name in names:
            p = ART / folder / (str(name) + ".webp")
            if p.is_file():
                art.add(p)
    classes = [r["class_id"] for r in tables["class"]]
    skills = [r["skill_id"] for r in tables["skill"]]
    add("icons/difficulty", scope)
    add("icons/skills", skills)
    for r in tables["weapon_base"]:
        add("icons/items/weapon_base/" + r["group_id"], [r["base_id"]])
    for group, stems in manifest["legacy_weapon_art"].items():
        add("icons/items/weapon_base/" + group, stems.split())
    add("icons/items/item_base", [r["base_id"] for r in tables["item_base"]])
    for r in tables["mastery_node"]:
        add("icons/mastery/" + r["tree_kind"], [r["node_id"]])
        if r["tree_kind"] == "class" and r["owner_id"] == "*":
            add("icons/mastery/class", [r["node_id"] + "_" + c for c in classes])
    for r in tables["advance_common"]:
        add("icons/mastery/advance", [r["advance_id"] + "_" + r["slot"]])
    for r in tables["advance_node"]:
        add("icons/mastery/advance", [r["skill_id"] + "_" + r["slot"]])
        if r["slot"].startswith("var"):
            add("icons/mastery/advance", [r["skill_id"] + "_" + n for n in ("2", "3", "4")])
    stages = {int(r["chapter"]) * 100 + int(r["stage_num"]) for r in tables["stage"]}
    add("backgrounds/illustrate", ["background_stage_" + str(i) for i in stages])
    add("backgrounds/illustrate", ["background_colosseum", *["background_duel_" + r["tier_id"] for r in tables["arena_tier"]]])
    add("backgrounds/pixel", ["town"])
    add("backgrounds", ["explore_ruins"])
    chapters = [int(r["chapter_id"]) for r in tables["chapter"]]
    add("backgrounds/explore_world_muted_locked", chapters)
    # The map itself contains all seven regions. Copy only pixels belonging to public land.
    world_dir = out / "src/assets/art/backgrounds"
    world_dir.mkdir(parents=True)
    with Image.open(ART / "backgrounds/explore_world_muted.webp") as world:
        mask = Image.new("L", world.size)
        for ch in chapters:
            with Image.open(ART / f"backgrounds/explore_world_muted_mask/{ch}.png") as region:
                mask = ImageChops.lighter(mask, region.getchannel("A"))
        clean = Image.new("RGB", world.size, (23, 37, 42))
        clean.paste(world, mask=mask)
        clean.save(world_dir / "explore_world_muted.webp", lossless=True)
    add("faces", ["backdrop"])
    portraits = (ART / "faces/portrait_files.js").read_text(encoding="utf-8")
    full_faces = json.loads(portraits.split(" = ", 1)[1].strip().rstrip(";"))
    monsters = {r["monster_idx"] for r in tables["monster"]}
    faces = []
    for rel in full_faces["gemini"]:
        kind, stem = rel.split("/")
        key = stem.split(".")[0].split("_")[0]
        if (kind == "hero" and key in [*classes, "goblin"]) or (kind == "monster" and key in monsters | {"goblin"}):
            faces.append(rel)
            art.add(ART / "faces/gemini" / rel)
    deploy.put(out / "src/assets/art/faces/portrait_files.js", "export const PORTRAIT_FILES = " + json.dumps({"gemini": faces}) + ";\n")
    return art


def build(out, tables, scope, manifest):
    art = build_resources(out, tables, scope, manifest)
    features = dict(raid=False, hell=False, defense=False, debug=False, enchant="nightmare" in scope)
    for table, rows in tables.items():
        write_csv(out / f"src/data/{table}.csv", rows)
    # Walk local module imports from the shipped page, so new unreferenced modules stay out.
    queue = [ROOT / "index.html", deploy.SRC / "index.html"]
    done = set()
    catalogs, catalog_ui, name_pairs = [], set(), set()
    literal = r"""(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")"""
    name_pair = re.compile(rf"\bko:\s*({literal})\s*,\s*en:\s*({literal})")
    skills = {r["skill_id"] for r in tables["skill"]}
    while queue:
        path = queue.pop()
        if path in done:
            continue
        done.add(path)
        rel = path.relative_to(ROOT)
        if path.parent == deploy.SRC / "ui/locales":
            catalogs.append(path)
            continue
        s = edition_blocks(path.read_text(encoding="utf-8"), features)
        if path.suffix == ".js":
            s = deploy.strip_js(s, str(rel))
            if path.name == "data.js":
                block = re.search(r"const TABLE_ORDER = (\[.*?\]);", s, re.S)
                names = re.findall(r"'(\w+)'", block[1]) if block else []
                if set(names) != manifest["columns"].keys():
                    raise ERROR("Review the loader and demo_content.json after a table change")
                s = array(s, "TABLE_ORDER", [n if n in tables else None for n in names])
            elif path.name == "mock.js":
                s = array(s, "DIFFICULTY_ICON_FILES", list(scope))
                s = array(s, "CLASS_ICON_FILES", [r["class_id"] for r in tables["class"]])
                s = array(s, "BG_STYLES", ["illustrate"])
                s = array(s, "SKILL_ICON_FILES", sorted(p.stem for p in art if p.parent == ART / "icons/skills"))
                s = s.replace("icons/difficulty/hell${ICON_EXT}", "icons/explore/ruins${ICON_EXT}")
                s = re.sub(r"^    (\d+): \{ at:.*$", lambda m: m[0] if int(m[1]) <= scope["normal"] else "", s, flags=re.M)
            elif path.name in {"skill_art.js", "skill_looks.js"}:
                s = re.sub(r"^    (mon_\w+): .*?$", lambda m: m[0] if m[1] in skills else "", s, flags=re.M)
                if path.name == "skill_art.js":
                    style = re.search(r"const ART_STYLES = \['(\w+)'", s)[1]
                    s = array(s, "ART_STYLES", [style])
                    for name in set(re.findall(r"\bfile: '([\w-]+)'", s)):
                        art.add(ART / f"fx/skills/{style}/{name}.webp")
            elif path.name == "i18n.js":
                s = localize(s, scope, tables, catalog_ui)
            elif path == deploy.SRC / "ui/locales.js":
                s = locale_registry(s)
            elif path.name == "devcompare.js":
                s = array(s, "SKINS", [["now", "Now"]])
                s = array(s, "KIT_SKINS", [])
                s = replace_one(s, r"(?<=const SKIN_DEFAULT = )[^;]+;", "'now';")
            elif path.name == "env.js":
                s = replace_one(s, r"(?<=const DEV_HOST = )[^;]+;", "false;")
            if path.name not in {"i18n.js", "locales.js"}:
                for ko, en in name_pair.findall(s):
                    name_pairs.add(ast.literal_eval(ko) + "\t" + ast.literal_eval(en))
            links = re.findall(r"\b(?:from\s*|import\s*(?:\(\s*)?)['\"](\.[^'\"]+\.js)['\"]", s)
        elif path.suffix == ".html":
            s = deploy.strip_html(s, str(rel))
            s = re.sub(r' *<link[^>]*href="\./ui/raid\.css"[^>]*>\n?', '', s)
            links = re.findall(r'(?:href|src)="(\./[^"]+\.(?:js|css))"', s)
        else:
            s = deploy.strip_css(s, str(rel))
            links = []
        deploy.put(out / rel, s)
        for link in links:
            child = (path.parent / link).resolve()
            if not child.is_relative_to(deploy.SRC):
                raise ERROR(f"Unexpected local import {link} in {rel}")
            if child != ART / "faces/portrait_files.js":
                queue.append(child)
    write_catalogs(out, catalogs, tables, catalog_ui, name_pairs, scope)
    files = [(p, p.relative_to(ROOT).as_posix()) for p in sorted(art)]
    packs, inside = deploy.pack_icons(files, out, {})
    loose = [(p, r) for p, r in files if r not in inside]
    for p, rel in loose:
        deploy.put(out / rel, copy_from=p)
    pre = deploy.preload_list(loose + [(None, "src/assets/art/backgrounds/explore_world_muted.webp")])
    pre["packs"] = packs
    deploy.put(out / "src/assets/art/preload.json", json.dumps(pre, separators=(",", ":")))
    for p in (deploy.SRC / "assets/fonts").iterdir():
        if p.suffix in {".woff2", ".txt"}:
            deploy.put(out / p.relative_to(ROOT), copy_from=p)


def verify_zip(path, tables, scope):
    with zipfile.ZipFile(path) as z:
        names = set(z.namelist())
        if z.testzip() or "index.html" not in names or len(names) > 1000 or path.stat().st_size > 500_000_000:
            raise ERROR("Incomplete ZIP or itch.io upload limit exceeded")
        if any(f.file_size > 200_000_000 or len(f.filename) > 240 for f in z.infolist()):
            raise ERROR("An entry exceeds itch.io upload limits")
        expected = {f"src/data/{n}.csv" for n in tables}
        if {p for p in names if p.endswith(".csv")} != expected:
            raise ERROR("ZIP table list differs from the edition")
        for n, rows in tables.items():
            if list(csv.DictReader(io.StringIO(z.read(f"src/data/{n}.csv").decode()))) != rows:
                raise ERROR(f"ZIP data mismatch: {n}")
        forbidden = [
            r"icons/difficulty/hell", r"\bhell_debuffs\b", r"chapter:\d+:hell", r"헬 난이도", r"Hell difficulty", r"地狱难度",
            r"chapter_?debuff", r"\b(?:debuffOf|departDebuff|curseDiff|curseOf|curseTipCard)\b",
            r"bt\.(?:buff\.curse|curse\.lore|trait\.(?:defMult|resCap))", r"exp\.debuff", r"tip-curse-lore",
            r"gear_?ilvl_?fixed|gearFixedOf|elite_trait_def|\bdefFx\b|\bET\.def\b|(?-i:\bchapter_gate\b)",
            r"""(?:slot\s*===?\s*|slot:\s*|fxOf\()['"]def['"]""",
            r"""['"]hell['"]|(?:^|/)hell\.(?:js|webp|json|csv)\b|\bhell\s+mode\b""",
        ]
        # Detect private content copied into prose, code or another language's dictionary.
        private_names = set()
        for table, field in [("chapter", "name_en"), ("stage", "stage_name_en"), ("explore_spot", "name_en"),
                             ("monster", "monster_name_en"), ("skill", "skill_id"), ("class", "class_id")]:
            with (DATA / (table + ".csv")).open(encoding="utf-8-sig", newline="") as handle:
                full = {row[field] for row in csv.DictReader(handle)}
            private_names.update(full - {row[field] for row in tables[table]} - {"", "-"})
        if private_names:
            forbidden.append(r"(?<!\w)(?:" + "|".join(map(re.escape, sorted(private_names))) + r")(?!\w)")
        if "nightmare" not in scope:
            forbidden += [r"nightmare_skill", r"dlvl_nightmare", r"icons/difficulty/nightmare", r"나이트메어", r"噩梦", r"\bNightmare\b"]
        private = re.compile("|".join(forbidden), re.I)
        for name in names:
            if private.search(name):
                raise ERROR(f"Out-of-scope path: {name}")
            if name.endswith((".csv", ".html", ".js", ".json", ".css")):
                match = private.search(z.read(name).decode("utf-8"))
                if match:
                    raise ERROR(f"Out-of-scope content in {name}: {match[0]}")
        pre = json.loads(z.read("src/assets/art/preload.json"))
        # Inspect the bytes as well as the names in case a private icon was copied under an alias.
        hell_icon = (ART / "icons/difficulty/hell.webp").read_bytes()
        for name in names:
            if name.endswith((".bin", ".webp")) and hell_icon in z.read(name):
                raise ERROR(f"Private difficulty icon in {name}")
        for rel in pre["first"] + pre["rest"] + [p["src"] for p in pre["packs"]]:
            if "src/" + rel not in names:
                raise ERROR(f"Missing preload path {rel}")
        art = "src/assets/art/"
        public = {
            "faces/gemini/monster/": {r["monster_idx"] for r in tables["monster"]} | {"goblin"},
            "backgrounds/illustrate/background_stage_": {str(int(r["chapter"]) * 100 + int(r["stage_num"])) for r in tables["stage"]},
            "icons/skills/": {r["skill_id"] for r in tables["skill"]},
            "icons/difficulty/": set(scope),
        }
        packed = {"src/" + item[0] for pack in pre["packs"] for item in pack["items"]}
        for name in names | packed:
            for prefix, allowed in public.items():
                if name.startswith(art + prefix):
                    stem = Path(name[len(art + prefix):]).stem
                    if prefix.startswith("faces/"):
                        stem = stem.split("_")[0]
                    if stem not in allowed:
                        raise ERROR(f"Out-of-scope artwork: {name}")
        # Read the client back from the archive. Node needs ESM mode only in this temporary copy.
        node = shutil.which("node")
        if not node:
            raise ERROR("Install Node.js 18+ to run the packaged game's release check")
        check = path.parent / "verify"
        z.extractall(check)
        (check / "package.json").write_text('{"type":"module"}', encoding="utf-8")
        subprocess.run([node, str(Path(__file__).with_name("check_demo.mjs")), str(check / "src"), json.dumps(scope)],
                       check=True)
    return len(names)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--nightmare-through", type=int, choices=range(1, 6), metavar="1..5",
                        help="include Nightmare through this chapter in addition to Normal 1-5")
    parser.add_argument("--output", type=Path, help="destination ZIP (default: _demo/)")
    args = parser.parse_args()
    scope = {"normal": 5}
    stem = "demo-normal"
    if args.nightmare_through:
        scope["nightmare"] = args.nightmare_through
        stem = f"demo-nightmare-{args.nightmare_through}"
    target = (args.output or ROOT / "_demo" / (stem + ".zip")).resolve()
    if target.suffix.lower() != ".zip":
        parser.error("--output must name a .zip file")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    tables = demo_tables(manifest, scope)
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=target.parent, prefix=".demo-") as tmp:
        out, archive = Path(tmp) / "game", Path(tmp) / "release.zip"
        build(out, tables, scope, manifest)
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for p in sorted(out.rglob("*")):
                if p.is_file():
                    z.write(p, p.relative_to(out).as_posix())
        count = verify_zip(archive, tables, scope)
        archive.replace(target)
    print(f"{target} ({count} files, {target.stat().st_size / 1048576:.1f} MiB) {scope}")


if __name__ == "__main__":
    try:
        main()
    except (ERROR, OSError, ValueError, subprocess.CalledProcessError) as exc:
        sys.exit(f"build_demo: {exc}")
