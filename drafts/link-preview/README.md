# Link preview: "product designer"

`og-cover-curious-2026-11-26.png` (1200 x 630) is the live cover, `assets/og-cover-curious-2026-10-27.png`, with the
role line changed from "design engineer" to "product designer" to match the home page (Lucy, 26 Nov 2026). Nothing
else in the picture changed.

How: the old line was erased and the room behind it rebuilt from the same rows 16 px along (the dither's repeat),
then "product designer" was set in Syne 700, 28 px, -0.75 px tracking ("product" #72ADFF, "designer" #F6FAFF), the
style that matched the old line best (0.80 overlap), at the same left edge and baseline (x 60, baseline 136).

## To ship (in `ui_kits/portfolio/`)

1. Copy the PNG to `assets/og-cover-curious-2026-11-26.png`. A new name, so LinkedIn and others do not keep the old
   cached picture.
2. Point the seven pages that use the old cover at it (11 tags):

   ```bash
   sed -i '' 's#og-cover-curious-2026-10-27.png#og-cover-curious-2026-11-26.png#g' cv.html index.html live-visuals-nyc.html off-hours.html other-work.html undertheweather.html with-ai.html
   ```

   Their `og:image:alt` already says "product designer" (index, with-ai); the others have none.
3. Ship with `bash deploy.sh` on Lucy's "ship", then refresh the preview in LinkedIn's Post Inspector.

Also out of date: `portfolio-creature.html` (How I made this site) uses `assets/creature-process/in-the-room.png`,
an October capture that reads "engineer". Fix it with that page's trim (see `../portfolio-pet/README.md`).
