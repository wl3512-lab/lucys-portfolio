# Portfolio Pet: case study look test

A drop-in for the live site source (`ui_kits/portfolio/`), built 26 Nov 2026. It is the first page on the
**narrative case-study template** (`case-narrative.css`), modelled on aaronjames.design at Lucy's request: "easy to
read, understand and digest, not overwhelming with pictures". The other case studies move to it in a separate
session.

**Status: look test, not shipped.** Two slots wait for files that only exist on Lucy's computer (see below).

## The narrative rules (case-narrative.css)

One narrow column (920 px), a lot of air between sections, and the same order on every page:

1. **Title** that says what was done ("Designing the dragon who lives in my portfolio"), one link, the hero media.
2. **Overview**: label beside a 2-3 sentence paragraph; under it My role / Tools / Year.
3. **Problems**: 2-3 numbered, one-word names, one or two sentences each, three across.
4. **One big "How might …?" line**, its key words highlighted in the accent.
5. **Goals**: the old problem word struck through, an arrow, the goal word; one sentence each.
6. **Process sections**: a short heading, one or two sentences, then the pictures grouped after the words (never
   between them). At most 2 pictures in a row. Captions only when a picture needs one.
7. **Outcomes** ("What shipped"): plain statements of what changed. Big numbers only for real user or business
   outcomes; never process counts (frames, scenes, tests, files). Lucy, 26 Nov: "recruiters aren't looking for that".
8. **What I learned**: three short lessons.
9. **Credits** (what AI did), then the **next project**.

About 400-650 visible words. Pictures are never pixelated, filtered or cropped (only he is pixel art).

## Files

| Path | What it is |
| --- | --- |
| `portfolio-pet.html` | The case study page. Copy to the site root. |
| `case-narrative.css` | The narrative template's styles (prefix `nr-`). Copy to the site root. |
| `assets/portfolio-pet/` | Its pictures, the 15 s reel (`reel.mp4`, poster `reel.webp`) and the Blender desk loop (`blender-desk.mp4`, poster `.webp`). |
| `_reel/reel.html` | The reel, drawn on one canvas; `renderAt(i)` draws frame i of 360 (24 fps). |
| `tools/rig.cjs` | Captures 48 colour + 48 mesh turns of the Blender model from the rig viewer on `portfolio-creature.html` into `_reel/rig/`. |
| `tools/reel.cjs` | Renders the reel's 360 frames to PNG. |
| `tools/check.cjs` | Loads the page at 1440 x 900 and iPhone 14: words, errors, failed requests, sideways scroll, screenshots. |
| `tools/cdn.cjs` | Sandbox only (`LOCAL_CDN=1`): serves unpkg/cdnjs libraries from local npm copies. |

Every picture comes from the site's own files, Lucy's recordings or renders of her model; nothing is copied from
the FigJam board.

## Open slots

1. **Moodboard photos from Reel 2**: "His world before his style". Each photo needs its original source found and
   linked.
2. **A rig-check overlay at full size** (cyan model, red invented, yellow missing) from
   `docs/projects/portfolio-character/*/audits`: "Checking AI against the model", and the reel's fourth beat
   (`reel.html?audit=<path>`). The live archive only has thumbnails.
3. Remove the `.pp-slot` style once the last slot is filled.

Filled: Lucy's notebook sketches (26 Nov; `sketch-v1.webp` cropped to the page, `sketch-routes.webp`), shown in
"Sketches first" and as the reel's opening beat (the reel loads `sketch-v1.webp` by default); the Blender desk
loop (her screen recording of 26 Nov, 11.19.41, cropped to the viewport, 7.4 s, crossfaded at the seam) in the
link-preview section.

## Re-render the reel

From the site root, with the site served at `BASE` (default `http://127.0.0.1:8931`):

```bash
node drafts/portfolio-pet/tools/rig.cjs
```

```bash
node drafts/portfolio-pet/tools/reel.cjs frames "?audit=../assets/portfolio-pet/audit.webp"
```

```bash
ffmpeg -y -framerate 24 -i frames/f%04d.png -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart -an assets/portfolio-pet/reel.mp4
```

The poster is frame 0 (the loop's rest frame), saved as `assets/portfolio-pet/reel.webp`.

## Facts on the page, and where they come from

- **Where he appears** (hero, About drawer, loading screens): loaded in a browser on lucyliu.xyz, 26 Nov.
- **Eight-blade takes, nine shipped; Blender render style rejected**: `portfolio-creature.html`.
- **The cover**: built at real scale in Blender (`cover-pose-v1`, tools/cover_scene.py) at Lucy's direction ("render
  this all in blender and create it back to 2d style to understand the perspective, height, depth and placement"),
  then painted back to pixels. Lucy's reason for not rendering him straight from Blender: "too taxing". The page uses
  the "product designer" cover from `../link-preview/`.
- **Who made what** (Lucy, 26 Nov): her sketches, anatomy rules, every motion idea and the Blender model; AI wrote
  the bones, actions and rig code; AI image tools drew the master illustration and key poses.

## After approval

- All Work: add Portfolio Pet as FILE 06 (`work.html`, `components/work-index.js`, its tests).
- How I made this site (`portfolio-creature.html`): cut the creature section to two lines and a link here, and
  change "I had a Blender model and rig built of him" to match who made what above.
- Ship only through `bash deploy.sh`, on Lucy's "ship".
