# Portfolio Pet: case study look test

A drop-in for the live site source (`ui_kits/portfolio/`). Built 26 Nov 2026 against lucyliu.xyz's
stage-and-board case-study template (`case-spreads.css`, `cover-reel.js`), following the 7 Nov portfolio
audit: one hero item, one role line, one button, about 500 words, heading plus a sentence or two per tile.

**Status: look test, not shipped.** Five slots wait for files that only exist on Lucy's computer (see below).

## Files

| Path | What it is |
| --- | --- |
| `portfolio-pet.html` | The case study page. Copy to the site root. |
| `assets/portfolio-pet/` | Its pictures and the 15 s reel (`reel.mp4`, poster `reel.webp`). |
| `_reel/reel.html` | The reel, drawn on one canvas; `renderAt(i)` draws frame i of 360 (24 fps). |
| `tools/rig.cjs` | Captures 48 colour + 48 mesh turns of the Blender model from the rig viewer on `portfolio-creature.html` into `_reel/rig/`. |
| `tools/reel.cjs` | Renders the reel's 360 frames to PNG. |
| `tools/check.cjs` | Loads the page at 1440 x 900 and iPhone 14: words, errors, failed requests, sideways scroll, screenshots. |
| `tools/cdn.cjs` | Sandbox only (`LOCAL_CDN=1`): serves unpkg/cdnjs libraries from local npm copies. |

Every picture comes from the site's own files or from rendering Lucy's model; nothing is copied from the FigJam board.

## Open slots

1. **Sketch, "Portfolio Pet Mock V1"** (notebook photo): tile "He started in my notebook", and the reel's first beat
   (`reel.html?sketch=<path>`).
2. **v0 routes** (rabbit, lizard head): same tile.
3. **Moodboard photos from Reel 2**: tile "I set his world before his style". Each photo needs its original
   source found and linked.
4. **A rig-check overlay at full size** (cyan model, red invented, yellow missing) from
   `docs/projects/portfolio-character/*/audits`: tile "The model catches what AI invents", and the reel's fourth
   beat (`reel.html?audit=<path>`). The live archive only has thumbnails.
5. **The cover scene in Blender**: tile "I staged the link preview in Blender". Lucy's screen recording of the
   Blender desk ("Screen Recording 2026-11-26 at 11.09.07 AM"), cut to a short muted loop, goes here.
6. Remove the `.pp-slot` style once the last slot is filled.

## Re-render the reel

From the site root, with the site served at `BASE` (default `http://127.0.0.1:8931`):

```bash
node drafts/portfolio-pet/tools/rig.cjs
```

```bash
node drafts/portfolio-pet/tools/reel.cjs frames "?sketch=assets/portfolio-pet/sketch-v1.webp&audit=assets/portfolio-pet/audit.webp"
```

```bash
ffmpeg -y -framerate 24 -i frames/f%04d.png -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart -an assets/portfolio-pet/reel.mp4
```

The poster is frame 0 (the loop's rest frame), saved as `assets/portfolio-pet/reel.webp`.

## Facts on the page, and where they come from

- **10 animated scenes**: loaded in a browser on lucyliu.xyz, 26 Nov: opening heist; spotlight, wake, clip-toss and
  peekaboo loading screens; hero room; With AI band; About drawer; closing scene; gallery wall.
  **To confirm with Lucy:** that all ten were posed on the Blender model ("from one model" in the role line).
- **7,008 saved frames, 47 concept images**: `creature-frames.html`.
- **Eight-blade takes, nine shipped; Blender render style rejected**: `portfolio-creature.html`.
- **The cover**: built at real scale in Blender (`cover-pose-v1`, tools/cover_scene.py) at Lucy's direction ("render
  this all in blender and create it back to 2d style to understand the perspective, height, depth and placement"),
  then painted back to pixels; shipped 27 Oct as `assets/og-cover-curious-2026-10-27.png`. Lucy's reason for not
  rendering him straight from Blender: "too taxing". Note: the cover still reads "design engineer"; the home page
  now says "product designer". Fixed in `../link-preview/` (26 Nov); the case study already uses the fixed cover.
- **Who made what** (Lucy, 26 Nov): her sketches, anatomy rules, every motion idea and the Blender model; AI wrote
  the bones, actions and rig code; AI image tools drew the master illustration and key poses.

## After approval

- All Work: add Portfolio Pet as FILE 06 (`work.html`, `components/work-index.js`, its tests).
- How I made this site (`portfolio-creature.html`): cut the creature section to two lines and a link here, and
  change "I had a Blender model and rig built of him" to match who made what above.
- Ship only through `bash deploy.sh`, on Lucy's "ship".
