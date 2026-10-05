"""Verify the installed warrior sheet in the actual FX renderer and codex.

Reuses the shared browser harness; snapshots and reports go beside the new sheet.
Run: python scripts/verify_warrior_skill_fx.py
"""

from __future__ import annotations

import hashlib
import json
import re
import sys

import verify_party_skill_fx as shared


def main() -> None:
    source = shared.ROOT / "src/assets/art/fx_source/warrior_sheet_20261006"
    manifest = json.loads((source / "prompts.json").read_text(encoding="utf-8"))
    legacy = "--legacy" in sys.argv or not manifest.get("installed", False)
    if "--legacy" in sys.argv:
        sys.argv.remove("--legacy")
    shared.OUT = source / "restored_legacy_20261006" if legacy else source
    shared.VIRTUAL_TIME_BUDGET = 30000 if legacy else 12000
    backup = json.loads((source / "previous/manifest.json").read_text(encoding="utf-8"))
    for name, expected in backup["warrior_files"].items():
        assert hashlib.sha256((source / "previous/skills" / name).read_bytes()).hexdigest() == expected, name
        if legacy:
            assert hashlib.sha256((shared.ROOT / "src/assets/art/fx/skills" / name).read_bytes()).hexdigest() == expected, name
    for name, expected in backup["other_files"].items():
        assert hashlib.sha256((shared.ROOT / "src/assets/art/fx/skills" / name).read_bytes()).hexdigest() == expected, name

    if legacy:
        previous = (source / "previous/ui/skill_art.js").read_text(encoding="utf-8")
        skills = []
        for spec in manifest["skills"]:
            definition = re.search(rf"(?m)^    {re.escape(spec['id'])}: (.*)$", previous).group(1)
            entry = {key: value for key, value in spec.items() if key != "fit"}
            entry["motion"] = re.search(r"motion: '([^']+)'", definition).group(1)
            entry["size"] = int(re.search(r"size: (\d+)", definition).group(1))
            entry["duration"] = int(re.search(r"duration: (\d+)", definition).group(1))
            skills.append(entry)
        shared.OUT.mkdir(parents=True, exist_ok=True)
        (shared.OUT / "prompts.json").write_text(json.dumps({"mode": "restored legacy", "skills": skills}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    shared.HARNESS = shared.HARNESS.replace("job='priest'", "job='warrior'")
    shared.HARNESS = shared.HARNESS.replace(
        "import { SKILL_ART } from '/ui/skill_art.js';",
        "import { SKILL_ART } from '/ui/skill_art.js';\nimport { SKILL_ART as previous } from '/assets/art/fx_source/warrior_sheet_20261006/previous/ui/skill_art.js';",
    )
    shared.HARNESS = shared.HARNESS.replace(
        "await F.fxPreload();",
        "await F.fxPreload();\nfor(const [id, events] of Object.entries(previous)){if(!id.startsWith('war_'))check('unchanged_'+id,JSON.stringify(events)===JSON.stringify(SKILL_ART[id]));}",
    )
    if legacy:
        shared.HARNESS = shared.HARNESS.replace("if(!id.startsWith('war_'))check", "check")
    shared.HARNESS = shared.HARNESS.replace(
        "document.querySelector('#grid').replaceChildren();",
        """const compact=unit('compact','warrior');
 compact.node.querySelector('.sprite').style.cssText+=';width:91px;height:91px';
 F.fxPreview(1,compact,'war_taunt','buff');
 check('portrait_frame_fits_91px',parseFloat(getComputedStyle(images(compact)[0]).width)===91);
 document.querySelector('#grid').replaceChildren();""",
    )
    if legacy:
        shared.HARNESS = shared.HARNESS.replace("portrait_frame_fits_91px", "legacy_taunt_size_preserved").replace(".width)===91", ".width)===previous.war_taunt.buff.size")
    shared.APP_REVIEW = shared.APP_REVIEW.replace(
        '.unit[data-skill="kni_smite"],.unit[data-skill="mag_fireball"],.unit[data-skill="arc_snipe"],.unit[data-skill="pri_heal"]',
        '.unit[data-skill="war_bash"]',
    )
    shared.main()


if __name__ == "__main__":
    main()
