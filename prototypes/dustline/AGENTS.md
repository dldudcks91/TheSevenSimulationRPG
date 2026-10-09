# DUSTLINE project instructions

- This is an independent western train prototype. Keep changes inside this directory unless the user explicitly asks otherwise.
- Read README.md and docs/RULES.md before changing gameplay. Keep docs/COVERAGE.md aligned with implemented behavior.
- No runtime package installation or external asset/network dependency. Opening index.html directly must remain supported.
- data.js owns content; engine.js owns deterministic state and action guards; app.js owns DOM, storage, inputs and sound; art.js and scene.js own clean native vector graphics.
- Keep Korean player-facing copy concrete. Explain costs and effects before choices.
- Preserve training and workshop charge when storing, deploying and merging cars. Permanent unlock/pool changes take effect next run.
- Save validation must reject malformed data without destroying the existing save. Rewards settle once.
- For engine behavior changes run node --test tests/engine.test.js. For UI/state integration changes run the relevant Python Playwright tests; they use Edge.
- Do not spawn agents unless explicitly requested by the user.
