---
name: seven-portrait-art
description: "TheSevenSimulationRPG 영웅·몬스터 초상화 생성, 비교 시트, 생성 프롬프트 작성, 선택한 그림의 게임 적용에 사용한다. 아이콘·배경·건물·UI 그림에는 사용하지 않는다."
---

# TheSevenSimulationRPG portrait art

Use this skill for hero and monster bust portraits in this repository. The existing Claude art skill and the user's saved main prompt are the source material for the project's art direction. Adapt their Gemini-specific steps to the image tools available in Codex.

## Before writing a prompt

1. Read `.claude/skills/art-prompt/SKILL.md`, `prompt_template.md`, and `gem_main_prompt.txt` in that directory. Read `postprocess.md` when preparing or applying an image.
2. Open the relevant current portraits, not just their filenames. For a redesign, inspect the current `src/assets/art/faces/source/ready/<hero|monster>/` image for identity and equipment, plus suitable game portraits for style. State each reference role. If the user asks to replace the current face or rendering style, use the old portrait only to understand the class and equipment; prioritize the requested style references in generation.
3. Draft from the full saved main prompt. Preserve its style, framing, lighting, palette, flat green background, divider, and exclusions. If the user requests another sheet layout, change the grid dimensions and character count directly throughout the prompt. Do not leave a conflicting “ALWAYS 2x2” rule in place. The chapter 1 stage 2 human addendum is specific to those monsters and is not a global default.

4. For chapter 1 stage 2 human monsters, follow the specific comparison criteria in `docs/reference/character_portrait_prompt.md` before generation and review. Installed human hero portraits control rendering style only: outline behavior, flat shading, palette, detail density and framing. Never transfer distinctive hero faces, hair, scars, tattoos, costume silhouettes or emblems to a monster. Existing monsters provide class and gear cues. Match hero headroom while designing new enemy faces and uniforms; reject a sheet that clones heroes or repeats one face template across rows.

## Produce and apply

- If the user asks only for a prompt, provide one complete copyable prompt and explain reference roles in Korean. Generate an image only when requested.
- For raster generation, use the available image generation tool and its workflow. Inspect the resulting sheet for cell order, distinct characters, style, divider, and background. Correct a missed requirement where possible. Save final project art under `src/assets/art/faces/source/`.
- When the user selects portraits for the game, confirm their row and column from the visible sheet. Follow `.claude/skills/art-prompt/postprocess.md` and `src/assets/art/faces/source/README.md`. Remove the green background; save selected 512×512 transparent PNGs in `source/ready/`; export 256×256 monster WebPs or 320×320 hero WebPs through the project exporter. Preserve prior target files before replacement and update current-art documentation. Do not change unrelated portraits.
- Verify final files visually and check that the game uses their portrait paths. Report selected cells, saved paths, and any limits.
