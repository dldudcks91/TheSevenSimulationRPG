# Mail icon redraw — 2026-10-30

Generation: built-in `image_gen`, transparent background, edit with current envelope plus two game skill icons as style references. Export uses the existing `scripts/build_icons.py:encode` routine, scoped to the envelope only.

The new icon has a brighter white fill, a fuller envelope body, a V top flap and short lower fold cutouts. The bell remains unchanged. Final 26px, 52px and 96px review: `preview.png`.

## Final prompt

Redraw Image 1 as a new CLOSED ENVELOPE game icon. Images 2 and 3 are style references only: use their bold near-white skill-icon silhouette style. Create a fuller front-facing rectangular envelope with slightly rounded corners, an overlapping downward-pointing V top flap and two short lower diagonal folds. The V seam and lower fold seams are thick clean transparent negative space. Main silhouette is a bright, completely opaque flat white (#f5f5fa), with no interior gray clouding. Envelope occupies 86% of a square canvas width and 66% of its height, centered, so it feels large and solid when displayed at only 26 pixels. Clean simple readable shape, smooth edges. Actual transparent background and transparent seams. No parchment, wax, seal, pin, nail, stamp, box, frame, colored accents, glow, texture, drop shadow or text.

## Generated original

`C:/Users/ANGames-001/.codex/generated_images/01a1889f-d8f8-7fd0-b16f-53a887ec62e1/exec-1b56b5d9-dd1b-410c-b913-284080eef0b5.png`

## Applied files

- `src/assets/art/icons_source/mail/mail.png` — 512×512 RGBA PNG
- `src/assets/art/icons/mail/mail.webp` — 256×256 RGBA WebP

Both files preserve actual alpha transparency (range 0–255). They replace the previous installed envelope in place.

