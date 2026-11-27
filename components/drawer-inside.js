/* Inside the drawer (plain JS, window.DrawerInside.mount(root, inner)). Lucy, 2026-10-29: "how about when dragon opens
   the drawer instead of resume and stuff popping out, the user goes into the bottom drawer" (she picked "dive in"), and
   its odds and ends ("gem, keychain, clips"; the gem later merged into the s0mped keychain: "merge diamond to somped
   keychain in drawer"). Spec:
   docs/superpowers/specs/2026-10-29-about-drawer-dive-design.md.
   Once he has the lower drawer open the engine's camera closes in on it (inner.dive, 0 to 1) and this canvas, the
   drawer seen from above, replaces the scene in a stepped dissolve. Lying on its felt: the resume, the CV, a burned CD in
   its case (her Spotify: pressed, the CD slides out and its card opens; Lucy, "i want the cd case to be shown w no cd
   and when you press it the cd comes out"; renders since Oct 31, Lucy: "i dont liek how the disk is lookign and
   rendered", pixelated to this grid on Nov 1: "keep aimation but make pielated. dont let cd disapear in case the case
   is clear": a clear jewel case with her MIX sticker, the CD in it, its rainbow moving while it is picked up), the
   laser-cut s0mped keychain (the real render, Lucy: "use the rendered keychain made for the preview link ... to make it
   actually look realistic", pixelated like the CD on Nov 1: "do all"), her headphones and a paintbrush (Nov 1: "headphones
   and paint brush ... open to other work"; they open Off hours' #visuals and #art, and took the collage book's place:
   "remove pintrests from drawer and reoraginze layout w new side projects") with a tin tube of acrylic beside the brush
   (Nov 1: "next to paintbrush render a paint tube of acrylic tin. pixelated"; part of the brush's button), the Lucky
   Drawer ticket, his spare paperclips and a pencil. He stays with the cabinet (Lucy, Oct 29:
   "remove him here, because why would he peek like that"). The items are the drawer's buttons (class dr-dochit, data-doc the
   card's id, so the engine's cards open under the picture as the filing tabs' did). An open card's item stays where it
   lies, lifted and outlined (Lucy: "i dont like how item preview disappears when i click it"). Back up climbs out;
   Escape closes a card first (the engine), then climbs out (here), then closes About (index.html). The drawer
   remembers where you were for the next open. Drawn at twice the camera's tight view (440 x 330 art px; Lucy: "i want
   them to be rendered more pixels and detailed") and scaled up pixelated. The room and each item are drawn once and
   kept; a frame is a few drawImages. Reduced motion: cuts, and the CD's light holds still. */
(function () {
  'use strict';
  const W = 440, H = 330;
  const C = { void: '#050710', navy: '#0a0f2a', ink: '#141a3c', felt: '#141a3c', feltDot: '#182050', feltHi: '#1d2662', shade: '#0d1231', rule: '#25305a',
    cobalt: '#2f45c2', rimLit: '#5b6eff', rimHi: '#7d8cff', rimDark: '#24339a', grain: '#2a3cb0', wallL: '#22307a', wallL2: '#1d2a6e', wallR: '#182264', wallR2: '#151e58',
    wallB: '#1b2660', wallB2: '#172156', seam: '#121a48', front: '#2a3a9e', frontLit: '#3a4cc0',
    paper: '#eef2ff', paper2: '#dfe4fb', paper3: '#cdd3f2', page: '#f4f1ff', page2: '#e4def9', page3: '#d2caf2', lav: '#c4b0ff', lav2: '#a99af0', mist: '#e2eeff',
    line: '#9aa3cc', line2: '#b7bedf', dim: '#5a63c8', blue: '#a0c8ff', pink: '#ffd6ea', pink2: '#f2b4d6', silver: '#c6cce9', silver2: '#b9c0e1', silver3: '#a3abd3',
    white: '#f6faff', wire: '#c9cfe9', wireHi: '#f6faff' };
  const FONT = { A: ['010', '101', '111', '101', '101'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'],
    I: ['111', '010', '010', '010', '111'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'], M: ['10001', '11011', '10101', '10001', '10001'],
    H: ['101', '101', '111', '101', '101'], O: ['111', '101', '101', '101', '111'], R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], U: ['101', '101', '101', '101', '111'],
    T: ['111', '010', '010', '010', '010'], V: ['101', '101', '101', '101', '010'], W: ['10001', '10001', '10101', '11011', '10001'], X: ['101', '101', '010', '101', '101'], Y: ['101', '101', '010', '010', '010'] };
  // The drawer, in art px: its rim, the floor its walls lead down to
  const RIM = [20, 44, 400, 240], FLOOR = [52, 88, 336, 180];
  // What lies in it, in reading order (the keyboard's): id (the card), its rect (art px), its name. The paintbrush's
  // rect takes in the paint tube beside it (BRUSH is the brush's own): one button, lifted and outlined together.
  const ITEMS = [
    { id: 'resume', r: [54, 102, 60, 80], label: 'Resume' },
    { id: 'cv', r: [119, 98, 68, 86], label: 'CV' },
    { id: 'spotify', r: [192, 100, 65, 58], label: 'A burned CD: my Spotify' },   // a jewel case's shape (142 x 125 mm)
    { id: 'keychain', r: [344, 94, 40, 90], label: 'A sompednyc keychain I made: tooth gems' },
    { id: 'sound', r: [62, 192, 78, 64], label: 'Headphones: my live visuals' },        // where the collage book lay (Nov 1)
    { id: 'postcard', r: [152, 192, 104, 52], label: 'The Lucky Drawer: a winning ticket' },   // left, the row spaced evenly (Lucy, Nov 18: "move lucky scratcher to the left more")
    { id: 'paint', r: [274, 196, 94, 58], label: 'A paintbrush and a tube of acrylic: my art' },
  ];
  const BRUSH = [278, 196, 90, 58];
  // A stack of polaroids (Lucy, Nov 18: "make space in drawer for a stack of polaroids ... you can press thru and the
  // first one goes to bottom"): it lies between the CD and the keychain, the top photo drawn small; pressed, the stack
  // opens big over About (openPhotos below). Not one of ITEMS: it opens its own viewer, not an engine card.
  // Then (Nov 18): "maybe insteadof corkboard its a colladge book, size down otehr elemets ind rawer saller so it cna fut a
  // book preveiw", "i want ti to have a cowhide cover, that pixelated, withg a cool closure": a closed scrapbook in a
  // pixel cowhide cover, a leather strap wrapped round its edge and fastened with a brass snap, the photo last brought
  // close tucked in so its top peeks out. The keychain moved 8 right for it. Its name stays POLA (the hit, the tests).
  const POLA = [286, 98, 50, 63], POLA_PHOTO = [3, 3, 34, 45];   // clear of the CD's slide (out to x 279; Lucy, Nov 18: "cd animation overlap journal rearrange drawer"); the tucked print's size
  const PHOTOS = [
    { src: 'assets/about-photos/night.webp', cap: 'Hi, I’m Lucy.', alt: 'Lucy at night in a dark room, looking back over her shoulder at the camera.' },
    { src: 'assets/about-photos/goat.webp', cap: 'Made a friend. I wanted to be a vet when I was little.', alt: 'Lucy crouching in the sun in a white dress, cream scarf and white boots, petting a black and white goat, pumpkins behind.' },
    { src: 'assets/about-photos/snake.webp', cap: '', alt: 'Lucy smiling down at a long black snake she holds in both hands, in a leopard print top, a reptile show’s crates behind her.' },
    { src: 'assets/about-photos/snow.webp', cap: 'I get the ski pass at Cypress when I visit Vancouver every December.', alt: 'Three friends lying flat in the snow on a ski run, one on a snowboard, two on skis, snowy pines behind.' },
    { src: 'assets/about-photos/lake.webp', cap: 'I love hiking.', alt: 'Lucy from behind at the edge of a lake covered in lily pads, a forested hill across the water.' },
    { src: 'assets/about-photos/summit.webp', cap: '', alt: 'Lucy from behind on a granite summit, looking out over forested ridges and hazy water.' },
    { src: 'assets/about-photos/nurse.webp', cap: 'I make things in my free time: this papier-mâché mask, and the clothes I sew.', alt: 'A mirror selfie in a papier-mâché mask painted like the nurse from Silent Hill, holding a phone with a sticker case.' },
    { src: 'assets/about-photos/concert.webp', sq: true, cap: 'Saw Young Thug live.', alt: 'Lucy in an off-shoulder white tee in a crowd at an outdoor concert at dusk, a friend beside her covering his eyes with one hand, a hand-painted banner on the stage behind.' },
  ];
  const CD_R = 27, CD_OUT = 24;   // the CD's radius, and how far it slides out of its case (Lucy: "when you press it the cd comes out")
  // The keychain and the paint tube, pixelated like the CD (docs/projects/about-keychain/build.py; one cell each at CD_Z,
  // the CD's palette, dither and alpha steps). The keychain is the cover scene's render (keychain.webp, kept beside it),
  // its -6 degree tilt baked in, drawn into KEY_IMG round the centre of its rect; the tube is a Blender render lying
  // along the brush, below it, drawn into TUBE_IMG.
  const KEYCHAIN = 'assets/creature/about-drawer/keychain-pixel.webp', KEY_IMG = [338, 91, 52, 96];   // right for the book (Nov 18)
  const TUBE = 'assets/creature/about-drawer/paint-tube.webp', TUBE_IMG = [272, 208, 56, 46];
  // The CD and its case, rendered in Blender and pixelated to this canvas's grid, one pixel an art px, in its colours,
  // dithered (docs/projects/about-cd/: build.py). Three layers, the CD between the case's two so it shows through the
  // clear lid: the case's sheet is the under part (the tray) then the lid in each of CD_FRAMES lights, the disc's the CD
  // in each; the lamp swings from the drawer's light (frame 0, at rest and under reduced motion) over the top to the
  // right, moving the lid's reflection and the CD's rainbow. The case covers CASE_IMG; the CD is CD_IMG art px square
  // round its centre, CD_AT while it lies in its case (the hub).
  const CD_CASE = 'assets/creature/about-drawer/cd-case.webp', CD_DISC = 'assets/creature/about-drawer/cd-disc.webp';
  // The CD and its case are drawn at CD_Z pixels an art px, twice the drawer's density (Lucy, Nov 1: "make cd clear case
  // detailed": at one pixel an art px, 2.2 mm, the case's spine, ledge, rosette and well were a pixel or nothing). The
  // inside's canvas has CD_Z pixels an art px; everything else is drawn in art px and scaled up by whole pixels, as before.
  const CD_FRAMES = 16, CASE_IMG = [191, 99, 67, 60], CD_IMG = 58, CD_AT = [226, 129], CD_Z = 2;
  const CD_RATE = 5;   // frames a second the light steps while the CD is picked up (there and back: a tilt under the lamp)
  const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  function line(g, x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let s = 0; s <= n; s++) px(g, Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n), c); }
  function path(g, pts, c) { for (let k = 0; k < pts.length - 1; k++) line(g, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], c); }
  function words(g, str, x, y, col, k = 1) {
    for (const ch of str) { const gl = FONT[ch]; if (!gl) { x += 3 * k; continue; } gl.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') px(g, x + i * k, y + j * k, col, k, k); })); x += (gl[0].length + 1) * k; }
  }
  const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function sheet(g, x, y, w, h, fill = C.paper) { px(g, x, y, C.ink, w, h); px(g, x + 1, y + 1, fill, w - 2, h - 2); px(g, x + w - 2, y + 1, C.paper2, 1, h - 2); px(g, x + 1, y + h - 2, C.paper2, w - 2, 1); }
  function textRows(g, x, y, rows) { rows.forEach(([dy, w, c]) => px(g, x, y + dy, c || C.line, w, 1)); }
  function dogEar(g, x, y, w, h, F) {   // the bottom right corner folded over
    for (let dy = 0; dy <= F; dy++) for (let dx = 0; dx <= F; dx++) {
      const X = x + w - 1 - dx, Y = y + h - 1 - dy, s = dx + dy;
      if (s < F) g.clearRect(X, Y, 1, 1); else px(g, X, Y, s === F || dx === F || dy === F ? C.ink : dx + dy === F + 1 ? C.paper3 : C.paper2);
    }
  }
  function clip(g, x, y, L, down, col = C.wire) {   // a gem paperclip, L long, lying across (or down): its wire, a highlight, its shadow
    const P = [[Math.round(L * .45), 0], [L - 2, 0], [L, 2], [L, 7], [L - 2, 9], [2, 9], [0, 7], [0, 5], [2, 3], [L - 6, 3], [L - 4, 4], [L - 4, 5], [L - 6, 6], [6, 6]];
    const at = (dx, dy) => P.map(([a, b]) => down ? [x + b + dx, y + a + dy] : [x + a + dx, y + b + dy]);
    path(g, at(1, 1), 'rgba(5,7,16,0.55)'); path(g, at(0, 0), col);
    const [hx, hy] = down ? [x, y + 4] : [x + 4, y + 9]; px(g, hx, hy, C.wireHi);
  }

  // the drawer from above: rim, walls in perspective, felt, the shadows of its walls
  function box(g) {
    const [rx, ry, rw, rh] = RIM, [fx, fy, fw, fh] = FLOOR;
    px(g, rx, ry, C.cobalt, rw, rh);                                                     // the rim, lit from the top left
    px(g, rx, ry, C.rimLit, rw, 2); px(g, rx, ry, C.rimLit, 2, rh); px(g, rx + 2, ry + 2, C.rimHi, rw - 4, 1);
    px(g, rx, ry + rh - 2, C.rimDark, rw, 2); px(g, rx + rw - 2, ry, C.rimDark, 2, rh);
    for (let k = 0; k < 40; k++) { const t = hash(k, 7), gx = rx + 6 + Math.floor(t * (rw - 20)), top = k % 2;   // the wood's grain along the rim
      px(g, gx, top ? ry + 4 : ry + rh - 6, C.grain, 3 + Math.floor(hash(k, 9) * 6), 1); }
    const ix = rx + 8, iy = ry + 8, iw = rw - 16, ih = rh - 16;                         // inside the rim
    px(g, ix - 1, iy - 1, C.rimDark, iw + 2, 1); px(g, ix - 1, iy - 1, C.rimDark, 1, ih + 2);
    for (let y = iy; y < iy + ih; y++) {                                                 // the walls lean in to the floor
      const t = Math.min(1, (y - iy) / (fy - iy)), l = Math.round(ix + (fx - ix) * t), r = Math.round(ix + iw - (ix + iw - (fx + fw)) * t);
      for (let x = ix; x < l; x++) px(g, x, y, x - ix < (l - ix) / 2 ? C.wallL : C.wallL2);
      for (let x = r; x < ix + iw; x++) px(g, x, y, x - r < (ix + iw - r) / 2 ? C.wallR2 : C.wallR);
      if (y < fy) { px(g, l, y, y - iy < (fy - iy) * .45 ? C.wallB : C.wallB2, r - l, 1); px(g, l, y, C.seam); px(g, r - 1, y, C.seam); }
    }
    for (let x = ix + 6; x < ix + iw - 6; x += 18) px(g, x, iy + 2, C.rimDark, 6, 1);   // grain on the back wall
    for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) {           // felt: a dense weave, flecked
      const n = hash(x, y), weave = (x + (y >> 1)) % 3 === 0;
      px(g, x, y, n > .996 ? C.feltHi : n < .16 || (weave && n < .5) ? C.feltDot : C.felt);
    }
    g.fillStyle = 'rgba(5,7,16,0.5)'; g.fillRect(fx, fy, fw, 4); g.fillRect(fx, fy, 3, fh);   // the walls' shadows on it, two steps
    g.fillStyle = 'rgba(5,7,16,0.25)'; g.fillRect(fx, fy + 4, fw, 4); g.fillRect(fx + 3, fy + 4, 3, fh - 4);
    px(g, fx, fy + fh, C.front, fw, iy + ih - fy - fh); px(g, fx, fy + fh, C.frontLit, fw, 1);   // the front wall, seen edge-on
  }
  function scenery(g) {   // his spare paperclips and a pencil: not buttons (the half-made key went: Lucy, Oct 29, "remove this key")
    clip(g, 291, 172, 26, false);   // moved for the brush (Nov 1)
    path(g, [[187, 255], [207, 252], [210, 255], [208, 258], [190, 261], [188, 258], [196, 257]], 'rgba(5,7,16,0.5)');   // one bent open
    path(g, [[186, 254], [206, 251], [209, 254], [207, 257], [189, 260], [187, 257], [195, 256]], C.wire);
    clip(g, 190, 166, 22, false);   // moved for the polaroids (Nov 18; it lay down at (314, 112))
    g.fillStyle = 'rgba(5,7,16,0.5)'; g.fillRect(232, 250, 40, 5);                       // a pencil, worn down: cobalt, its ferrule and eraser
    px(g, 236, 248, C.cobalt, 26, 5); px(g, 236, 248, C.rimLit, 26, 1); px(g, 236, 252, C.rimDark, 26, 1);
    px(g, 262, 248, C.silver, 4, 5); px(g, 263, 248, C.silver3, 1, 5); px(g, 266, 248, C.pink, 4, 5); px(g, 266, 252, C.pink2, 4, 1);
    px(g, 232, 249, '#e6d2b0', 4, 3); px(g, 230, 250, '#e6d2b0', 2, 1); px(g, 229, 250, C.ink, 1, 1);
    // loose crystals, spares from the gem kit, by the s0mped keychain (the middle one moved up from (286, 188) for the paint
    // tube, Nov 1: the brush's outline, taking in the tube, reached it)
    for (const [x, y] of [[330, 190], [288, 183], [160, 262]]) { px(g, x, y, C.lav); px(g, x - 1, y + 1, C.lav2, 3, 1); px(g, x, y + 2, C.lav2); px(g, x, y + 1, C.white); }
  }

  // the items, each drawn at its rect
  const DRAW = {
    resume(g, [x, y, w, h]) {
      sheet(g, x, y, w, h);
      px(g, x + 1, y + 1, C.cobalt, w - 2, 18); px(g, x + 1, y + 1, C.rimLit, w - 2, 1); px(g, x + 1, y + 18, C.rimDark, w - 2, 1);
      words(g, 'RESUME', x + 5, y + 5, C.paper, 2);
      px(g, x + 5, y + 23, C.ink, 26, 2); px(g, x + 5, y + 27, C.dim, 18, 1); px(g, x + 26, y + 27, C.line, 12, 1);   // her name, the contact line
      for (const [sy, rows] of [[32, [44, 40, 46]], [47, [42, 46, 38, 30]], [65, [44, 36]]]) {   // three sections: a heading, bullets
        px(g, x + 5, y + sy, C.cobalt, 16, 2);
        rows.forEach((ww, k) => { px(g, x + 5, y + sy + 5 + k * 3, C.dim); px(g, x + 8, y + sy + 5 + k * 3, C.line, ww - 3, 1); });
      }
      g.fillStyle = 'rgba(196,176,255,0.6)'; g.fillRect(x + 7, y + 39, 26, 3);          // a phrase she highlighted
      dogEar(g, x, y, w, h, 9);
    },
    cv(g, [x, y, w, h]) {   // two pages, clipped
      const pw = w - 7, ph = h - 4;
      sheet(g, x + 7, y, pw, ph); textRows(g, x + 12, y, [[46, 40], [49, 44], [52, 34], [58, 42], [61, 38], [64, 46], [70, 30]]);
      g.fillStyle = 'rgba(5,7,16,0.45)'; g.fillRect(x + pw, y + 6, 2, ph - 2);          // the front page's shadow on the back one
      sheet(g, x, y + 4, pw, ph);
      words(g, 'CV', x + 6, y + 12, C.cobalt, 4); px(g, x + 6, y + 34, C.lav, 28, 2);
      px(g, x + 38, y + 14, C.ink, 18, 2); px(g, x + 38, y + 19, C.dim, 14, 1); px(g, x + 38, y + 22, C.line, 16, 1);
      for (const [sy, rows] of [[40, [48, 44, 50, 36]], [59, [46, 50, 40]], [75, [44]]]) {
        px(g, x + 6, y + sy, C.cobalt, 18, 2); textRows(g, x + 6, y + sy + 4, rows.map((ww, k) => [k * 3, ww]));
      }
      clip(g, x + 42, y - 3, 20, true);
    },
    spotify() {},    // rendered, pixelated: drawCD
    keychain() {},   // rendered, pixelated: drawSheet
    // Her side projects, two things of hers lying in the drawer that open Off hours (Lucy, 2026-11-01: "maybe in drawer
    // there can be headphones and paint brush or wacom pen and open to other work"; the collage book went the same day:
    // "remove pintrests from drawer and reoraginze layout w new side projects").
    sound(g, [x, y, w, h]) {   // headphones lying open: the band arched over, two cups with their cushions facing in, the cable curling off (Off hours: the live visuals)
      const cx = x + Math.round(w / 2), cy = y + 30, R = 26;
      for (let a = 0; a <= 96; a++) {                                                     // the band: ink edges, cobalt, lit along its top
        const t = Math.PI * a / 96, c = Math.cos(t), sn = Math.sin(t);
        for (let r = R - 3; r <= R + 2; r++) px(g, Math.round(cx + r * c), Math.round(cy - r * sn * 0.86), r === R + 2 || r === R - 3 ? C.ink : r === R + 1 ? C.rimLit : r === R - 2 ? C.rimDark : C.cobalt);
      }
      const cup = (ox, inward) => {                                                       // 15 x 25, rounded: an ink rim, the cobalt shell lit at its top left, the lavender cushion on the side facing in
        const oy = cy + 7;
        for (let j = -12; j <= 12; j++) for (let i = -7; i <= 7; i++) {
          const e = (i * i) / 56 + (j * j) / 156; if (e > 1) continue;
          const cushion = i * inward >= 2;
          px(g, ox + i, oy + j, e > 0.7 ? C.ink : cushion ? (j > 5 ? C.lav2 : C.lav) : (i <= -2 && j <= -5 ? C.rimLit : j > 6 ? C.rimDark : C.cobalt));
        }
        px(g, ox - 2, cy - 7, C.silver, 5, 3); px(g, ox - 2, cy - 7, C.white, 2, 1);      // the hinge where the band meets it
      };
      cup(cx - R, 1); cup(cx + R, -1);
      const cable = [[cx - R, cy + 19], [cx - R + 1, cy + 23], [cx - R + 6, cy + 25], [cx - R + 13, cy + 23], [cx - R + 19, cy + 21], [cx - R + 24, cy + 23]];
      path(g, cable.map(([a, b]) => [a + 1, b + 1]), 'rgba(5,7,16,0.55)'); path(g, cable, C.wire);
      px(g, cx - R + 24, cy + 22, C.silver, 4, 3); px(g, cx - R + 27, cy + 23, C.silver3, 2, 1);   // the jack
    },
    paint(g) {   // a paintbrush lying on the diagonal, its tip still wet (Off hours: the art); the tube beside it is drawSheet's
      const [x, y, w, h] = BRUSH, x0 = x + 4, y0 = y + 6, x1 = x + w - 4, y1 = y + h - 6, L = Math.hypot(x1 - x0, y1 - y0);   // from the tip (top left) to the handle's end
      const ux = (x1 - x0) / L, uy = (y1 - y0) / L, vx = -uy, vy = ux;
      const half = s => s < .06 * L ? 1 + 1.8 * s / (.06 * L) : s < .19 * L ? 3 : s < .33 * L ? 3.2 : 2.6 - .8 * (s - .33 * L) / (.67 * L);   // the bristles fan out, the ferrule is widest, the handle tapers
      const col = (s, k) => {
        if (s < .08 * L) return k < -.6 ? C.pink : C.pink2;                               // the paint on it
        if (s < .12 * L) return k < -.6 ? C.pink : k > .7 ? '#d8bf96' : '#e6d2b0';          // where the paint thins into the bristles
        if (s < .19 * L) return k < -.6 ? '#f0e2c4' : k > .7 ? '#c9ae84' : '#e6d2b0';       // the bristles
        if (s < .33 * L) return Math.abs(s - .24 * L) < 1 ? C.silver3 : k < -.8 ? C.white : k > .8 ? C.silver3 : C.silver;   // the ferrule, crimped
        if (s > L - 3) return C.lav2;                                                     // the handle's dipped end
        return k < -.8 ? C.white : k > .8 ? C.lav2 : C.lav;                               // the handle, lit along one side
      };
      for (const pass of [0, 1]) for (let s = 0; s <= L; s += .5) {                      // an ink edge, then the brush
        const hw = half(s) + (pass ? 0 : 1);
        for (let k = -hw; k <= hw; k += .5) px(g, Math.round(x0 + ux * s + vx * k), Math.round(y0 + uy * s + vy * k), pass ? col(s, k / Math.max(1, half(s)) * 1.6) : C.ink);
      }
    },
    postcard(g, [x, y, w, h]) {   // the Lucky Drawer, crumpled, tossed on top, as the ticket itself is (Lucy, Oct 29, of the last one: "i dont like how the key looks")
      const top = i => (hash(i >> 2, 11) > .7 ? 1 : 0) + (hash(i >> 3, 12) > .8 ? 1 : 0), bot = i => (hash(i >> 2, 13) > .7 ? 1 : 0);
      for (let i = 0; i < w; i++) {                                                         // ragged edges, the paper's facets
        const t = top(i), b = bot(i); px(g, x + i, y + t, C.ink, 1, h - t - b);
        for (let j = t + 1; j < h - b - 1; j++) {
          const a = i - j * .7 - 34, c = i + j * .9 - 74, tone = (a > 0) + 2 * (c > 0);
          px(g, x + i, y + j, [C.paper, '#e9e4ff', '#f6f4ff', '#dcd6fa'][tone]);
        }
      }
      for (let j = 3; j < h - 3; j += 2) px(g, x + 21, y + j, C.line);                     // the stub's perforation
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const d = Math.hypot(dx, dy); if (d <= 6.3) px(g, x + 11 + dx, y + 13 + dy, d > 5.4 ? C.silver3 : (dx + dy) % 3 ? C.silver : C.silver2); }   // the jackpot's silver
      px(g, x + 8, y + 10, C.white, 2, 1);
      ['....#....', '...###...', '#########', '..#####..', '.##...##.', '.#.....#.'].forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') px(g, x + 7 + i, y + 23 + j, C.cobalt); }));   // its star
      px(g, x + 5, y + 33, C.cobalt, 12, 1); px(g, x + 7, y + 36, C.cobalt, 8, 1); px(g, x + 9, y + 41, C.dim, 4, 1); px(g, x + 9, y + 44, C.dim, 4, 1);   // admit one, no 2027
      words(g, 'LUCKY', x + 26, y + 7, C.lav, 2); words(g, 'LUCKY', x + 25, y + 6, C.cobalt, 2);
      words(g, 'DRAWER', x + 66, y + 11, C.cobalt);
      const [sx, sy, sw, sh] = [25, 20, 74, 19];                                            // the silver, SCRATCH pressed into it
      for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) px(g, x + sx + i, y + sy + j, hash(i, j + 7) > .92 ? C.white : (i + j) % 3 ? C.silver : C.silver2);
      px(g, x + sx, y + sy, C.silver3, sw, 1); px(g, x + sx, y + sy + sh - 1, C.silver3, sw, 1);
      words(g, 'SCRATCH', x + sx + 23, y + sy + 6, C.white); words(g, 'SCRATCH', x + sx + 24, y + sy + 7, '#8f97c8');
      px(g, x + 25, y + 42, C.cobalt, 6, 1); px(g, x + 33, y + 42, C.line, 24, 1); px(g, x + 62, y + 42, C.cobalt, 6, 1); px(g, x + 70, y + 42, C.line, 18, 1);   // its fine print
      px(g, x + 25, y + 45, C.cobalt, 6, 1); px(g, x + 33, y + 45, C.line, 16, 1);
      for (let q = 0; q < 10; q++) { const X = x + 72 + Math.round(q * .5), Y = y + 18 + q * 3; px(g, X, Y, C.mist, 1, 3); px(g, X + 1, Y, '#b3a9e4', 1, 3); }   // a crease
      for (let dy = 0; dy < 9; dy++) for (let dx = 0; dx < 9; dx++) { const X = x + w - 1 - dx, Y = y + h - 2 - dy, s = dx + dy;   // its folded corner: on the site it turns the ticket over
        if (s < 8) px(g, X, Y, s < 1 ? C.ink : C.navy); else if (s === 8 || dx === 8 || dy === 8) px(g, X, Y, C.ink); else px(g, X, Y, s < 11 ? '#c9c3ef' : '#b3aae6'); }
    },
  };

  // drawn once, kept: the room, and each item with its shadow (its own shape, darkened)
  const layer = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  let ROOM = null; const SPR = {}, PAD = 6;
  function room() { if (!ROOM) { ROOM = layer(W, H); const g = ROOM.getContext('2d'); box(g); scenery(g); } return ROOM; }
  function withShadow(c) { const s = layer(c.width, c.height), sg = s.getContext('2d'); sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(5,7,16,0.55)'; sg.fillRect(0, 0, s.width, s.height); return { c, s }; }
  function sprite(it) {
    if (SPR[it.id]) return SPR[it.id];
    const [x, y, w, h] = it.r, c = layer(w + PAD * 2, h + PAD * 2), g = c.getContext('2d');
    g.translate(PAD - x, PAD - y); DRAW[it.id](g, it.r);
    return (SPR[it.id] = withShadow(c));
  }
  // the rendered things (the CD and its case, the keychain, the paint tube): the sheets (mount loads them), each cell
  // cut out once with its shadow, as the drawn things
  const CDS = {}, CELL = { case: CASE_IMG.slice(2), disc: [CD_IMG, CD_IMG], key: KEY_IMG.slice(2), tube: TUBE_IMG.slice(2) };
  function cdLoad(onload) {
    if (CDS.case || typeof Image === 'undefined') return;
    for (const [k, src] of [['case', CD_CASE], ['disc', CD_DISC], ['key', KEYCHAIN], ['tube', TUBE]]) { const im = new Image(); im.decoding = 'async'; im.onload = onload; im.src = src; CDS[k] = im; }
  }
  function cdCell(kind, i) {   // the case's cell 0 is its under part, 1 + f its lid in light f; the disc's cell f the CD in light f; the keychain's and the tube's one cell
    const k = kind + i; if (SPR[k]) return SPR[k];
    const im = CDS[kind]; if (!im || !im.complete || !im.naturalWidth) return null;
    const [w, h] = CELL[kind].map(v => v * CD_Z), c = layer(w, h);
    c.getContext('2d').drawImage(im, i * w, 0, w, h, 0, 0, w, h);
    return (SPR[k] = withShadow(c));
  }
  function cdWhole() {   // the whole case, for its shadow
    if (SPR.cdWhole) return SPR.cdWhole;
    const a = cdCell('case', 0), b = cdCell('case', 1); if (!a || !b) return null;
    const c = layer(CASE_IMG[2] * CD_Z, CASE_IMG[3] * CD_Z), cg = c.getContext('2d'); cg.drawImage(a.c, 0, 0); cg.drawImage(b.c, 0, 0);
    return (SPR.cdWhole = withShadow(c));
  }
  function drawCD(g, l, out, f) {   // the case's tray, the CD in it (or slid out by whole pixels), the clear lid over it; lifted by l
    const whole = cdWhole(), under = cdCell('case', 0), lid = cdCell('case', 1 + f), disc = cdCell('disc', f);
    if (!whole || !under || !lid || !disc) return;
    const [x, y, w, h] = CASE_IMG, dx = CD_AT[0] - CD_IMG / 2 + Math.round(CD_OUT * out), dy = CD_AT[1] - CD_IMG / 2;
    // sized in art px: on the inside's canvas (CD_Z pixels an art px) each cell's pixel lands on one of its pixels
    g.drawImage(whole.s, x + 2 + l, y + 2 + l, w, h); g.drawImage(under.c, x, y - l, w, h);
    g.drawImage(disc.s, dx + 2 + l, dy + 2 + l, CD_IMG, CD_IMG); g.drawImage(disc.c, dx, dy - l, CD_IMG, CD_IMG);
    g.drawImage(lid.c, x, y - l, w, h);
  }
  function drawSheet(g, kind, [x, y, w, h], l) {   // a one-cell render (the keychain, the tube): its hard shadow, then it, lifted by l, on whole pixels
    const s = cdCell(kind, 0); if (!s) return;
    g.drawImage(s.s, x + 2 + l, y + 2 + l, w, h); g.drawImage(s.c, x, y - l, w, h);
  }
  function outline(g, [x, y, w, h], col, open) {   // hover: a line round it; open: that and its corners marked
    const d = 3; px(g, x - d, y - d, col, w + d * 2, 1); px(g, x - d, y + h + d - 1, col, w + d * 2, 1); px(g, x - d, y - d, col, 1, h + d * 2); px(g, x + w + d - 1, y - d, col, 1, h + d * 2);
    if (!open) return;
    const e = 5, n = 7;
    for (const [cx, cy, sx, sy] of [[x - e, y - e, 1, 1], [x + w + e - 1, y - e, -1, 1], [x - e, y + h + e - 1, 1, -1], [x + w + e - 1, y + h + e - 1, -1, -1]]) {
      for (let i = 0; i < n; i++) { px(g, cx + i * sx, cy, C.mist); px(g, cx, cy + i * sy, C.mist); }
    }
  }
  // the polaroid stack: two frames under the top one, crooked by whole pixels, and the top photo in it (s.print: a
  // canvas the photo was shrunk into at POLA_PHOTO's size, so it reads as a tiny print, not noise)
  // Cowhide: cream hide with black patches, each a blob with a wobbly edge, a sheen pixel or two on its rim and a few
  // hairs in the cream. Seeded, so the drawer's cover and the open book's cover are the same hide every visit.
  const HIDE = { cream: '#f1e8d6', cream2: '#e3d7bf', cream3: '#d3c4a6', spot: '#1b1613', spot2: '#2e2520', spot3: '#43362d' };
  function cowhide(w, h, seed, k = 1, wrap = false) {   // wrap: a seamless tile (the open book's cover repeats it)
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const n = Math.max(3, Math.round(w * h / (260 * k * k))), spots = [];
    for (let i = 0; i < n; i++) spots.push([hash(i, seed) * w, hash(seed, i + 9) * h, (5 + hash(i + 3, seed) * 7) * k, hash(i, seed + 4) * 6.3, hash(i + 7, seed) * 6.3]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = -99;
      for (const [cx, cy, r, a1, a2] of spots) {
        let ax = Math.abs(x - cx), ay = Math.abs(y - cy); if (wrap) { ax = Math.min(ax, w - ax); ay = Math.min(ay, h - ay); }
        const dx = ax * Math.sign(x - cx || 1), dy = ay * Math.sign(y - cy || 1) * 1.15, d = Math.hypot(dx, dy), t = Math.atan2(dy, dx);
        const edge = r * (0.78 + 0.26 * Math.sin(3 * t + a1) + 0.14 * Math.sin(5 * t + a2) + 0.06 * Math.sin(9 * t + a1 * 2));
        best = Math.max(best, edge - d);
      }
      const nz = hash(x + seed, y * 3);
      px(g, x, y, best > 1.5 ? (best < 2.6 && nz > .6 ? HIDE.spot3 : nz > .93 ? HIDE.spot2 : HIDE.spot)
        : best > 0 ? (nz > .5 ? HIDE.spot2 : HIDE.cream3)
        : nz > .97 ? HIDE.cream3 : (x + y * 2) % 7 === 0 && nz > .55 ? HIDE.cream2 : HIDE.cream);
    }
    return c;
  }
  let HIDE_ART = null;
  // the book, closed, from above, at CD_Z pixels an art px like the CD (so the hide and the snap get their detail): the
  // page block shows along its fore-edge and foot, the cover is cowhide with a dark leather spine and a stitched edge,
  // the strap comes round the fore-edge to a brass snap, and the tucked print peeks out of the top.
  function drawPola(g, l, pic) {
    const [x, y, w, h] = POLA, Y = y - l, cw = w - 3, ch = h - 3, Z = CD_Z, q = 1 / Z;
    const hp = (X, Yy, c, ww = 1, hh = 1) => px(g, X, Yy, c, ww, hh);
    const fine = (X, Yy, c, ww = q, hh = q) => { g.fillStyle = c; g.fillRect(X, Yy, ww, hh); };
    hp(x + 3, y + 3, 'rgba(5,7,16,0.55)', w - 1, h - 1);                                      // its shadow on the felt
    if (pic) {                                                                                  // the print tucked in, peeking out the top
      const [px0, py0, pw, ph] = [x + 27, Y - 7, 16, 13];
      hp(px0 + 1, py0 + 1, 'rgba(5,7,16,0.45)', pw, ph); hp(px0, py0, C.ink, pw, ph); hp(px0 + 1, py0 + 1, C.page, pw - 2, ph - 2);
      g.drawImage(pic, 4, 6, 24, 18, px0 + 2, py0 + 2, pw - 4, ph - 4);
    }
    hp(x + 2, Y + 2, C.ink, cw + 1, ch + 1);                                                    // the page block under the cover
    hp(x + 3, Y + 3, C.page, cw - 1, ch - 1);
    for (let k = 0; k < ch - 2; k += 2) fine(x + cw, Y + 4 + k, C.page3, 2, q);                // page edges, fore-edge
    for (let k = 0; k < cw - 2; k += 2) fine(x + 4 + k, Y + ch, C.page3, q, 2);                // and foot
    hp(x, Y, '#120c09', cw, ch);                                                                // the cover's dark edge
    if (!HIDE_ART) HIDE_ART = cowhide((cw - 2) * Z, (ch - 2) * Z, 41, Z * 0.8);
    g.drawImage(HIDE_ART, x + 1, Y + 1, cw - 2, ch - 2);
    hp(x + 1, Y + 1, 'rgba(255,250,235,0.35)', cw - 2, q);                                      // lit along the top
    hp(x + 1, Y + 1, '#3a2418', 6, ch - 2); hp(x + 1, Y + 1, '#5a3826', 6, q * 2); fine(x + 6.5, Y + 1, '#24150e', q, ch - 2);   // the leather spine
    for (let k = 0; k < 3; k++) hp(x + 2, Y + 8 + k * 20, '#24150e', 4, q);                     // its bands
    for (let k = 3; k < ch - 4; k += 2) { fine(x + 8.5, Y + k, '#c9a77a'); fine(x + cw - 2.5, Y + k, '#c9a77a'); }   // stitching
    for (let k = 9; k < cw - 3; k += 2) { fine(x + k, Y + 2.5, '#c9a77a'); fine(x + k, Y + ch - 3, '#c9a77a'); }
    const sy = Y + Math.round(ch / 2) - 4;                                                      // the strap, round the fore-edge
    hp(x + cw - 15, sy + 1, 'rgba(5,7,16,0.5)', 17, 8);
    hp(x + cw - 16, sy, '#4a2a18', 18, 8); hp(x + cw - 16, sy + 1, '#6b4026', 18, 6); hp(x + cw - 16, sy + 1, '#8a5634', 18, q * 2);
    for (let k = 0; k < 16; k += 2) { fine(x + cw - 15 + k, sy + 1.5, '#c9a77a'); fine(x + cw - 15 + k, sy + 6, '#c9a77a'); }
    fine(x + cw - 16, sy + 1, '#4a2a18', 1, 6); fine(x + cw - 17, sy + 2, '#4a2a18', 1, 4);   // its rounded tip
    const bx = x + cw - 15, by = sy;                                                             // the brass snap: a ring and a dome
    hp(bx, by + 1, '#7a5a1e', 8, 6); hp(bx + 1, by, '#7a5a1e', 6, 8);
    hp(bx + 1, by + 1, '#c99a3a', 6, 6); hp(bx + 2, by + 2, '#e2bd5c', 4, 4);
    hp(bx + 2, by + 2, '#f6e3a0', 2, 1); fine(bx + 2, by + 3, '#f6e3a0', q, 1); fine(bx + 5, by + 5, '#a37a2a', 1, 1);
    fine(bx + 3.5, by + 3.5, '#8d6823', 1, 1); fine(bx + 3.5, by + 3.5, '#fff3c8', q, q);
  }
  function draw(g, s) {   // s: { hover, open, out (how far the CD is out of its case, 0 to 1: its outline takes it in), cd (its light's frame) }
    const z = g.canvas.width / W;   // pixels an art px (CD_Z on the page): everything below is in art px
    g.setTransform(z, 0, 0, z, 0, 0); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H); g.drawImage(room(), 0, 0);   // the room shows round it (the scene crossfades out underneath, styles.css)
    const lift = id => id === s.open ? 3 : id === s.hover ? 2 : 0;
    const pl = s.open === 'photos' ? 3 : s.hover === 'photos' ? 2 : 0;
    drawPola(g, pl, s.print);
    if (pl) outline(g, [POLA[0] - 2, POLA[1] - pl, POLA[2] + 4, POLA[3] + 3], pl === 3 ? C.lav : C.blue, pl === 3);
    const order = ITEMS.filter(it => !lift(it.id)).concat(ITEMS.filter(it => lift(it.id)));   // what is picked up lies on top
    for (const it of order) {
      const l = lift(it.id), [x, y, w, h] = it.r;
      if (it.id === 'spotify') drawCD(g, l, s.out || 0, s.cd || 0);
      else if (it.id === 'keychain') drawSheet(g, 'key', KEY_IMG, l);
      else {
        if (it.id === 'paint') drawSheet(g, 'tube', TUBE_IMG, l);   // the tube beside the brush, picked up with it
        const { c, s: sh } = sprite(it);
        g.drawImage(sh, x - PAD + 2 + l, y - PAD + 2 + l);
        g.drawImage(c, x - PAD, y - PAD - l);
      }
      if (l) outline(g, [x, y - l, w + (it.id === 'spotify' ? Math.round((CD_OUT - 2) * (s.out || 0)) : 0), h], it.id === s.open ? C.lav : C.blue, it.id === s.open);
    }
  }

  // ── The behaviour: an inside canvas and the buttons laid over the stage, the dive and the climb, where you were ──
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const pct = ([x, y, w, h]) => ({ left: (x + w / 2) / W * 100 + '%', top: (y + h / 2) / H * 100 + '%', width: w / W * 100 + '%', height: h / H * 100 + '%' });
  function mount(root, inner) {
    const stage = root.querySelector('[data-dr="stage"]'), scene = root.querySelector('[data-dr="canvas"]');
    if (!stage || !scene || !inner) return null;
    const cv = document.createElement('canvas'); cv.className = 'dr-inside'; cv.width = W * CD_Z; cv.height = H * CD_Z; cv.setAttribute('aria-hidden', 'true');
    scene.after(cv);
    const g = cv.getContext('2d');
    cdLoad(() => { if (inside) paint(); });
    const up = document.createElement('button'); up.type = 'button'; up.className = 'dr-backup'; up.hidden = true;
    up.innerHTML = '<span aria-hidden="true">&uarr;</span> Back up'; up.setAttribute('aria-label', 'Back up out of the drawer');
    cv.after(up);
    const look = document.createElement('button'); look.type = 'button'; look.className = 'dr-lookin'; look.hidden = true;   // outside again: back in
    look.innerHTML = '<span aria-hidden="true">&darr;</span> Look inside'; look.setAttribute('aria-label', 'Look inside the drawer');
    up.after(look);
    let hover = null, inside = false, wanted = true, tween = 0, watch = 0, clock = 0;   // wanted: go in once he is up (first visit: yes)
    let out = 0, outRaf = 0, cdWanted = false;   // the CD: out of its case while its card is open
    let light = 0, lightAt = null;   // where the light is in its swing (0 to 2 (CD_FRAMES - 1), there and back): it moves only while the CD is picked up, and stays where it stopped
    function sweep(up, t) {
      if (!up || t == null) { lightAt = null; return; }   // reduced motion: t is null, it holds still
      if (lightAt != null && t > lightAt) light = (light + Math.min(.25, (t - lightAt) / 1000) * CD_RATE) % (2 * (CD_FRAMES - 1));
      lightAt = t;
    }
    let frame = 0;
    function cdFrame() {   // the light's frame, stepped (pixel art does not crossfade)
      sweep(hover === 'spotify' || inner.openId === 'spotify', reduce() ? null : performance.now());
      const n = CD_FRAMES - 1;
      return (frame = Math.round(light <= n ? light : 2 * n - light));
    }
    function slide(to, done) {   // the CD comes out (to 1) or goes back in (to 0): a third of a second, eased
      cancelAnimationFrame(outRaf); outRaf = 0;
      if (reduce()) { out = to; paint(); if (done) done(); return; }
      const from = out, t0 = performance.now(), ms = 340 * Math.abs(to - from) || 1;
      const step = now => { const k = Math.min(1, (now - t0) / ms); out = from + (to - from) * (1 - (1 - k) ** 3); if (k < 1) outRaf = requestAnimationFrame(step); else outRaf = 0; paint(); if (!outRaf && done) done(); };
      outRaf = requestAnimationFrame(step);
    }
    const hits = ITEMS.map(it => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'dr-dochit dr-initem'; b.dataset.doc = it.id; b.hidden = true;
      b.setAttribute('aria-label', it.label);
      Object.assign(b.style, pct(it.r));
      b.onclick = () => {
        if (it.id === 'spotify' && inner.openId !== 'spotify') {   // its CD comes out first, then its card (Spotify) opens
          cdWanted = true; slide(1, () => { if (cdWanted && inside) { cdWanted = false; inner.openDoc('spotify'); paint(); } }); return;
        }
        cdWanted = false; inner.openDoc(it.id); paint();
      };
      b.onmouseenter = b.onfocus = () => { hover = it.id; paint(); };
      b.onmouseleave = b.onblur = () => { if (hover === it.id) hover = null; paint(); };
      return b;
    });
    look.after(...hits);

    // ── the polaroids: a hit in the drawer opens a corkboard over About (Lucy, Nov 18, option D: "Everything visible at
    // once, pinned crooked, each with a handwritten note. Click one to bring it close with arrows"). On the board all
    // five are pinned with a note each; a click brings one close, where ← → (buttons, keys or a swipe) step through
    // them. Escape steps back: close-up, then board, then the drawer. `top` is the photo last brought close (the
    // drawer's print shows it).
    let top = 0, thumbs = [], photosOpen = false;
    const N = PHOTOS.length;
    function thumb(i) {   // each photo shrunk to the drawer's tiny print, once its file is in
      if (thumbs[i] !== undefined) return thumbs[i];
      thumbs[i] = null;
      const im = new Image(); im.decoding = 'async'; im.src = PHOTOS[i].src;
      im.onload = () => { const [, , w, h] = POLA_PHOTO, c = layer(w, h), cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(im, 0, 0, w, h); thumbs[i] = c; if (inside) paint(); };
      return null;
    }
    const polaHit = document.createElement('button'); polaHit.type = 'button'; polaHit.className = 'dr-dochit dr-initem dr-pola-hit'; polaHit.hidden = true;
    polaHit.setAttribute('aria-label', 'A cowhide scrapbook: my photos'); polaHit.setAttribute('aria-haspopup', 'dialog');
    Object.assign(polaHit.style, pct([POLA[0] - 2, POLA[1], POLA[2] + 4, POLA[3] + 3]));
    polaHit.onmouseenter = polaHit.onfocus = () => { hover = 'photos'; paint(); };
    polaHit.onmouseleave = polaHit.onblur = () => { if (hover === 'photos') hover = null; paint(); };
    polaHit.onclick = () => openPhotos();
    hits.push(polaHit); hits[hits.length - 2].after(polaHit);

    const view = document.createElement('div'); view.className = 'dr-pola'; view.hidden = true;
    view.setAttribute('role', 'dialog'); view.setAttribute('aria-modal', 'true'); view.setAttribute('aria-label', 'My photos, in a cowhide scrapbook');
    // the collage: each photo's place on a laptop board (L) and a phone board (P), in % of the board: x, y, width,
    // tilt; its sticky's place in % of the photo's box (x, y, tilt) and colour; an arrow from the sticky to the photo
    // (x, y in % of the photo's box, turn in degrees; null: the sticky lies on the photo, no arrow). Tape or a pin.
    const LAY = [   // laptop L: two photos a page, none across the spine (Lucy, Nov 18: "no photos in the spine of the book")
      { L: [3, 6, 16, -5], P: [3, 1, 46, -5], n: [40, 84, 5, 0], np: [36, 79, 4], fix: 'tape' },
      { L: [26, 4, 16, 3], P: [51, 3, 45, 4], n: [18, 80, -3, 2], np: [-14, 91, -3], fix: 'pin' },
      { L: [55, 7, 16, -3], P: [4, 26, 45, 3], fix: 'tape' },
      { L: [77, 3, 16, 4], P: [51, 28, 45, -4], n: [14, 80, 3, 1], np: [-30, 58, -3], fix: 'pin' },
      { L: [4, 54, 16, 3], P: [3, 51, 46, -3], n: [-6, 86, -3, 0], np: [40, 86, 3], fix: 'pin' },
      { L: [27, 57, 15, -5], P: [50, 53, 45, 5], fix: 'tape' },
      { L: [54, 50, 16, 2], P: [3, 73, 46, 3], n: [22, 44, -3, 1], np: [0, 70, -3], fix: 'tape' },
      { L: [81, 57, 15, -4], P: [54, 75, 44, -3], n: [-8, 84, 4, 3], np: [6, 84, 3], fix: 'pin' },
    ];
    const v = (k, arr) => arr.map((n, j) => '--' + k[j] + ':' + n).join(';');
    // phones (Lucy, Nov 19: "i dont want it to fit the entire screen"): a smaller journal that sits in the dimmed drawer,
    // two photos a page and four pages, turned with a swipe or the ‹ › keys. Each pair: one high, one low, crossing over;
    // odd pages mirror even ones. Q: x, y, width, tilt in % of the page; NQ: its sticky's x, y, tilt in % of the page.
    const PG = 2, PAGES = Math.ceil(PHOTOS.length / PG);
    const SLOT = [[[19, 3, 50, -4], [46, 38, 50, 4]], [[46, 3, 50, 4], [19, 38, 50, -3]]];
    const NQ = [[21, 46, -3], [19, 66, -3], null, [58, 68, 3], [21, 46, -2], null, [19, 8, -3], [52, 74, 3]];
    const qOf = i => SLOT[Math.floor(i / PG) % 2][i % PG];
    const nqVars = (i, sq) => {   // the sticky's page place, as % of its photo's box (the box is about 0.99 x its width tall; square 0.78)
      const q = qOf(i), n = NQ[i]; if (!n) return '';
      const hh = q[2] * (sq ? 0.78 : 0.99);
      return ';' + v(['nqx', 'nqy', 'nqr', 'nqw'], [((n[0] - q[0]) / q[2] * 100).toFixed(1), ((n[1] - q[1]) / hh * 100).toFixed(1), n[2], (38 / q[2] * 100).toFixed(1)]);
    };
    // scrapbook bits between the photos, in pixels (Lucy, Nov 18: "add stickers paper clip s etc in journal", then "render the
    // stickers pixels, just make light blue stars and pigeon"): light blue stars and a pigeon, each drawn on a small grid with a
    // cream die-cut edge, shown big and crisp. Decoration only: hidden from screen readers, never in the way of a press.
    // L / P: x, y, width (% of the page), tilt; no P: not on the phone's single page.
    const PIX = (() => {
      const draw = (w, h, at) => {   // at(x, y): a colour or null; then a one-pixel cream edge round the shape
        const c = document.createElement('canvas'); c.width = w + 2; c.height = h + 2; const x2 = c.getContext('2d'); const m = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = at(x, y); if (k) m.push([x, y, k]); }
        const on = new Set(m.map(([x, y]) => x + ',' + y)); x2.fillStyle = '#f6f0e2';
        m.forEach(([x, y]) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!on.has((x + dx) + ',' + (y + dy))) x2.fillRect(x + dx + 1, y + dy + 1, 1, 1); });
        m.forEach(([x, y, k]) => { x2.fillStyle = k; x2.fillRect(x + 1, y + 1, 1, 1); });
        return '<img alt="" src="' + c.toDataURL() + '">';
      };
      const star = n => {   // a five-point star on an n x n grid, lit from the top left
        const R = n / 2, r = R * 0.45, pts = [];
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; pts.push([R + q * Math.cos(a), R + 0.4 + q * Math.sin(a)]); }
        const inside = (x, y) => { let o = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) o = !o; } return o; };
        return draw(n, n, (x, y) => {
          if (!inside(x + 0.5, y + 0.5)) return null;
          const edge = !inside(x + 1.5, y + 0.5) || !inside(x + 0.5, y + 1.5);
          if (edge) return '#5e9bd8';
          if (!inside(x - 0.5, y + 0.5) || !inside(x + 0.5, y - 0.5)) return '#e6f5ff';
          return x + y > n ? '#8cc6f5' : '#a9d8ff';
        });
      };
      // the pigeon, side on, facing left: o outline, g grey, l light wing, w wing bars, n neck sheen, m its purple, k eye, b beak, c cere, p feet
      const P = ['....ooo.............', '...oggggo...........', '..okggggo...........', 'bcogggggo...........', '..ognnngo...........', '..onmmnngo..........',
        '..ogmnggggoooooo....', '..oggglllllllllooo..', '..ogglllwwllllllggo.', '..oggllllllwwllggggo', '...ogglllllllggoooo.', '....oogggggggoo.....', '......ooooooo.......', '.......p...p........', '......pp..pp........'];
      const PC = { o: '#3d4357', g: '#9ea6ba', l: '#c3c9d8', w: '#4f566b', n: '#5fae93', m: '#8a6bb8', k: '#141a2e', b: '#3d4357', c: '#f4f1ea', p: '#e58a9c' };
      return { star: star(13), starS: star(9), pigeon: draw(20, 15, (x, y) => PC[P[y][x]] || null) };
    })();
    const DECO = [   // Q: the phone page it lies on, then x, y, width, tilt in % of that page
      { k: 'star', L: [44, 40, 3.6, 12], P: [22, 46.8, 8, 12], Q: [0, 86, 6, 8, 12] },
      { k: 'starS', L: [20.5, 44, 2.6, -10], P: [83, 22, 6, -10], Q: [1, 24, 90, 6, -10] },
      { k: 'pigeon', L: [61, 40.5, 6.2, 0], P: [20, 70, 15, 0], Q: [2, 22, 72, 15, 0] },
      { k: 'star', L: [93.5, 44, 3.2, 10], P: [86, 72, 8, 10], Q: [3, 86, 92, 8, 10] },
      { k: 'starS', L: [70, 90, 2.6, 0], P: [76, 96, 6, 0], Q: [0, 26, 90, 6, 0] },
      { k: 'starS', L: [6, 47, 2.4, -8] },
      { k: 'star', L: [96.5, 3, 2.6, -14], P: [90, 0.4, 7, -14], Q: [2, 86, 8, 7, -14] },
    ];
    view.innerHTML = '<div class="dr-pola-in">' +
      '<div class="dr-book"><span class="dr-book-strap" aria-hidden="true"><span class="dr-book-snap"></span></span><span class="dr-book-void" aria-hidden="true"></span><span class="dr-book-shade" aria-hidden="true"></span><span class="dr-book-flap" aria-hidden="true"><span class="dr-book-face"></span><span class="dr-book-inner"></span><span class="dr-book-edge"></span></span>' +
      '<ul class="dr-cork" aria-label="' + N + ' photos">' + PHOTOS.map((p, i) => {
        const o = LAY[i % LAY.length];
        const note = !!p.cap && !!o.n;
        return '<li class="dr-pin' + (p.sq ? ' dr-pin-sq' : '') + (note ? ' has-note' : '') + '" data-pg="' + Math.floor(i / PG) + '" style="' + v(['lx', 'ly', 'lw', 'lr'], o.L) + ';' + v(['px', 'py', 'pw', 'pr'], o.P) + ';' + v(['qx', 'qy', 'qw', 'qr'], qOf(i)) +
          (o.n ? ';' + v(['nx', 'ny', 'nr', 'nc'], o.n) + ';' + v(['npx', 'npy', 'npr'], o.np) : '') + nqVars(i, p.sq) + '">' +
          '<button type="button" class="dr-pin-b"><span class="dr-pin-' + o.fix + '" aria-hidden="true"></span><img alt="" width="600" height="800" decoding="async"></button>' +
          (note ? '<p class="dr-note" aria-hidden="true"></p>' : '') + '</li>';
      }).join('') + DECO.map(d => '<li class="dr-deco' + (d.P ? '' : ' dr-deco-wide') + '" aria-hidden="true"' + (d.Q ? ' data-pg="' + d.Q[0] + '"' : '') + ' style="' + v(['lx', 'ly', 'lw', 'lr'], d.L) + (d.P ? ';' + v(['px', 'py', 'pw', 'pr'], d.P) : '') + (d.Q ? ';' + v(['qx', 'qy', 'qw', 'qr'], d.Q.slice(1)) : '') + '">' + PIX[d.k] + '</li>').join('') + '</ul></div>' +
      '<div class="dr-pg"><button type="button" class="dr-near-go dr-pg-prev" aria-label="Previous page">‹</button><span class="dr-pg-n" aria-live="polite"></span><button type="button" class="dr-near-go dr-pg-next" aria-label="Next page">›</button></div>' +
      '<div class="dr-near" hidden><button type="button" class="dr-near-go dr-near-prev" aria-label="Previous photo">←</button>' +
      '<figure class="dr-near-card"><img alt="" width="600" height="800" decoding="async"><figcaption class="dr-note dr-near-note"></figcaption></figure>' +
      '<button type="button" class="dr-near-go dr-near-next" aria-label="Next photo">→</button></div>' +
      '<p class="dr-pola-bar"><span class="dr-pola-n" aria-live="polite"></span></p>' +
      '<div class="dr-pola-acts">' +   // no visible button (Lucy, Nov 18: "remove back to the book and close button"): a tap on the
      // dimmed drawer round the journal or Escape steps back; this one shows only to the keyboard, like a skip link
      '<button type="button" class="dr-pola-x">Close</button></div></div>';
    // the cover's hide, pixelated: the same generator as the drawer's book, big pixels, set once as a CSS image
    try { view.style.setProperty('--hide', 'url(' + cowhide(56, 56, 41, 0.9, true).toDataURL() + ')'); } catch (e) {}
    // the polaroids' frames in pixels (Lucy, Nov 18: "make the polaroid frames pixelated"): a seamless tile of cream paper,
    // flecked and dithered, drawn big and crisp behind the photos (the photos themselves stay as they are)
    try {
      const t = document.createElement('canvas'); t.width = t.height = 16; const tg = t.getContext('2d');
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1, r = Math.abs(n) * 16;
        tg.fillStyle = r < B[y & 3][x & 3] * 0.6 ? '#e2d9c6' : Math.abs(n) > 0.9 ? '#fdfbf5' : Math.abs(n) < 0.06 ? '#d2c7af' : '#f1ece1';
        tg.fillRect(x, y, 1, 1);
      }
      view.style.setProperty('--pframe', 'url(' + t.toDataURL() + ')');
    } catch (e) {}
    root.appendChild(view);
    const board = view.querySelector('.dr-book'), pins = [...view.querySelectorAll('.dr-pin-b')], near = view.querySelector('.dr-near'),
      nearCard = view.querySelector('.dr-near-card'), nearImg = nearCard.querySelector('img'), nearNote = nearCard.querySelector('figcaption'),
      prevB = view.querySelector('.dr-near-prev'), nextB = view.querySelector('.dr-near-next'), nEl = view.querySelector('.dr-pola-n'),
      xBtn = view.querySelector('.dr-pola-x');
    pins.forEach((b, i) => { b.querySelector('img').alt = PHOTOS[i].alt; const nt = b.parentNode.querySelector('.dr-note'); if (nt) { nt.textContent = PHOTOS[i].cap; nt.onclick = () => bringClose(i); } b.setAttribute('aria-label', 'Bring close: ' + (PHOTOS[i].cap || PHOTOS[i].alt)); b.onclick = () => bringClose(i); });
    let close = false;   // a photo brought close
    // the phone's pages: which one is open, turned by a swipe on the page or ‹ ›; laptops show the whole spread and ignore it
    const phone = () => matchMedia('(max-width: 640px)').matches;
    const cork = view.querySelector('.dr-cork'), pgEl = view.querySelector('.dr-pg'), pgN = view.querySelector('.dr-pg-n'),
      pgPrev = view.querySelector('.dr-pg-prev'), pgNext = view.querySelector('.dr-pg-next');
    let pg = 0;
    function setPage(n, dir = 0) {
      pg = Math.max(0, Math.min(PAGES - 1, n));
      cork.dataset.pg = pg; pgN.textContent = 'Page ' + (pg + 1) + ' / ' + PAGES;
      pgPrev.disabled = pg === 0; pgNext.disabled = pg === PAGES - 1;
      if (dir && !reduce()) { cork.style.setProperty('--dx', dir); cork.classList.remove('is-turn'); void cork.offsetWidth; cork.classList.add('is-turn'); }
    }
    const turn = dir => { if (close || !phone()) return false; const was = pg; setPage(pg + dir, dir); return pg !== was; };
    pgPrev.onclick = () => turn(-1); pgNext.onclick = () => turn(1);
    let sx0 = null, sy0 = 0;
    cork.addEventListener('pointerdown', e => { if (e.button > 0 || !phone()) return; sx0 = e.clientX; sy0 = e.clientY; });
    cork.addEventListener('pointerup', e => { if (sx0 == null) return; const dx = e.clientX - sx0, dy = e.clientY - sy0; sx0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { turn(dx < 0 ? 1 : -1); e.preventDefault(); } });
    cork.addEventListener('pointercancel', () => { sx0 = null; });
    setPage(0);
    function showNear(i, dir) {
      top = (i + N) % N; const p = PHOTOS[top];
      nearImg.src = p.src; nearImg.alt = p.alt; nearCard.classList.toggle('is-sq', !!p.sq); nearNote.textContent = p.cap; nearNote.hidden = !p.cap; const ln = LAY[top % LAY.length].n || [0, 0, -2, 0]; nearNote.style.setProperty('--nr', ln[2]); nearNote.style.setProperty('--nc', ln[3]);
      nearCard.style.setProperty('--rot', LAY[top % LAY.length].L[3] / 2 + 'deg');
      if (dir && !reduce()) { nearCard.style.setProperty('--dx', dir); nearCard.classList.remove('is-step'); void nearCard.offsetWidth; nearCard.classList.add('is-step'); }
      nEl.textContent = (top + 1) + ' / ' + N; const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = ': ' + (p.cap || p.alt); nEl.appendChild(sr);
      if (inside) paint();
    }
    function bringClose(i) {
      close = true; board.hidden = true; near.hidden = false; showNear(i, 0); nextB.focus({ preventScroll: true });
    }
    function toBoard() {
      if (!close) return; close = false; view.classList.add('is-back'); near.hidden = true; board.hidden = false; nEl.textContent = '';   // back from a photo: the book is already open, no flip (Lucy, Nov 18)
      setPage(Math.floor(top / PG)); pins[top].focus({ preventScroll: true });
    }
    const next = (dir = 1) => { if (close) showNear(top + dir, dir); };
    prevB.onclick = () => next(-1); nextB.onclick = () => next(1);
    // a sideways swipe on the close-up steps through them
    let px0 = null, py0 = 0;
    nearCard.addEventListener('pointerdown', e => { if (e.button > 0) return; px0 = e.clientX; py0 = e.clientY; });
    const release = e => { if (px0 == null) return; const dx = e.clientX - px0, dy = e.clientY - py0; px0 = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) next(dx < 0 ? 1 : -1); };
    nearCard.addEventListener('pointerup', release); nearCard.addEventListener('pointercancel', () => { px0 = null; });
    xBtn.onclick = () => { if (close) toBoard(); else closePhotos(); };   // a photo up close: Close goes back to the open book, then to the drawer (Lucy, Nov 18: "close shud take to open book now drawer")
    view.addEventListener('pointerdown', e => { if (e.target === view || e.target.classList.contains('dr-pola-in')) { if (close) toBoard(); else closePhotos(); } });   // a photo up close: back to the book (Lucy, Nov 18)
    // the left page is glued inside the cover (as in a real scrapbook), so past 90 degrees the cover's inside shows it and
    // it lands as that page: its inside face carries a copy of the spread (clipped to the left half), swapped out on landing
    function ghost() {
      const inner = view.querySelector('.dr-book-inner'), cork = view.querySelector('.dr-cork:not(.dr-cork-ghost)');
      inner.textContent = '';   // phones too (Lucy, Nov 18: the polaroids show on the back of the cover)
      const c = cork.cloneNode(true); c.classList.add('dr-cork-ghost'); c.removeAttribute('aria-label'); c.setAttribute('aria-hidden', 'true'); c.inert = true;
      c.style.cssText = 'position:absolute;margin:0;left:' + cork.offsetLeft + 'px;top:' + cork.offsetTop + 'px;width:' + cork.offsetWidth + 'px;height:' + cork.offsetHeight + 'px';
      inner.appendChild(c);
    }
    function openPhotos() {
      if (photosOpen) return; photosOpen = true;
      pins.forEach((b, i) => { const im = b.querySelector('img'); if (!im.src) im.src = PHOTOS[i].src; });
      close = false; near.hidden = true; board.hidden = false; nEl.textContent = '';
      view.classList.remove('is-back'); view.hidden = false; setPage(Math.floor(top / PG)); ghost(); requestAnimationFrame(() => view.classList.add('is-on'));
      paint(); pins[top].focus({ preventScroll: true });
    }
    function closePhotos(refocus = true) {
      if (!photosOpen) return; photosOpen = false; close = false;
      view.classList.remove('is-on'); view.hidden = true;
      paint(); if (refocus && !polaHit.hidden) polaHit.focus({ preventScroll: true });
    }
    const onPolaKey = e => {
      if (!photosOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (close) toBoard(); else closePhotos(); }
      else if (close && e.key === 'ArrowRight') { e.preventDefault(); next(1); }
      else if (close && e.key === 'ArrowLeft') { e.preventDefault(); next(-1); }
      else if (!close && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && phone()) { e.preventDefault(); turn(e.key === 'ArrowRight' ? 1 : -1); }
      else if (e.key === 'Tab') {   // focus stays in the viewer
        const f = [...view.querySelectorAll('button, a[href]')].filter(b => !b.hidden && b.offsetParent);
        const k = f.indexOf(document.activeElement); e.preventDefault();
        f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    addEventListener('keydown', onPolaKey, true);
    const paint = () => {
      const open = inner.openId;
      if (out > 0 && !outRaf && !cdWanted && open !== 'spotify') slide(0);   // its card closed, however: back in its case
      draw(g, { hover, open: photosOpen ? 'photos' : open, out, cd: cdFrame(), print: thumb(top) });
    };
    function tweenDive(from, to, ms, done) {
      cancelAnimationFrame(tween);
      if (reduce() || ms <= 0) { inner.dive = to; done && done(); return; }
      const t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / ms); inner.dive = from + (to - from) * easeIO(k); if (k < 1) tween = requestAnimationFrame(step); else { tween = 0; done && done(); } };
      tween = requestAnimationFrame(step);
    }
    function placeLook() {   // in the dark of the open lower drawer, under the one above it (Lucy, Oct 29, a sketch: "put look inside where i drew"), wherever the camera has it;
      // centred over the second drawer, in its opening between its mouth and its front's lip (Lucy, Nov 1: "look inside above second drawer")
      const v = inner.view, st = inner.data.setSteps_px[inner.data.setSteps - 1], ax = st.lip[0] * inner.A, ay = (st.mouth[1] + st.lip[1]) / 2 * inner.A;
      look.style.left = (ax - v[0]) / v[2] * 100 + '%'; look.style.top = (ay - v[1]) / v[3] * 100 + '%';
    }
    function show() {
      stage.classList.add('dr-in'); up.hidden = false; look.hidden = true; hits.forEach(b => { b.hidden = false; }); paint();
      clearInterval(clock); clock = setInterval(() => { if (!document.hidden) paint(); }, 1000 / 12);   // the open card's item, the CD going back in
    }
    function hideNow() { closePhotos(false); stage.classList.remove('dr-in'); up.hidden = true; look.hidden = true; hits.forEach(b => { b.hidden = true; }); clearInterval(clock); clock = 0; hover = null; cancelAnimationFrame(outRaf); outRaf = 0; out = 0; cdWanted = false; lightAt = null; }
    function dive(animated = true) {   // in: the camera closes on the open drawer, then the inside dissolves in
      if (inside) return; inside = true; wanted = true;
      tweenDive(inner.dive, 1, animated ? 520 : 0, () => { if (inside) show(); });
    }
    function climb() {   // out: the inside dissolves away, the camera eases back to the cabinet
      if (!inside) return; inside = false; wanted = false;
      if (inner.openId) inner.openDoc(inner.openId);
      hideNow();
      setTimeout(() => tweenDive(inner.dive, 0, 460), reduce() ? 0 : 250);
    }
    function sync() {   // About opened: watch for him to be up with the drawer open, then go back in if that is where you were
      clearInterval(watch);
      watch = setInterval(() => {
        if (!inner.open) { clearInterval(watch); watch = 0; return; }
        if (inside && inner.duckPx > 0) { inside = false; cancelAnimationFrame(tween); hideNow(); inner.dive = 0; return; }   // closing About: he ducks; the view is his again, and you stay "inside" for next time
        const ready = inner.frame >= inner.OPEN && !inner.hiding && !inner.duckPx && !tween;
        if (!inside && wanted && ready) dive(true);
        look.hidden = inside || !ready || wanted; if (!look.hidden) placeLook();
      }, 150);
    }
    look.onclick = () => { look.hidden = true; dive(true); setTimeout(() => up.focus({ preventScroll: true }), reduce() ? 0 : 800); };
    up.onclick = () => { climb(); const note = stage.querySelector('.dr-dochit[data-doc="note"]'); if (note) note.focus({ preventScroll: true }); };
    // Escape: a card first (the engine), then out of the drawer (here), then About (index.html)
    const onKey = e => {
      if (e.key !== 'Escape' || !inside || !inner.open || inner.openId) return;
      if (root.querySelector('.dr-phone-file:not([hidden])')) return;   // a phone's file closes first (AboutSection)
      e.preventDefault(); e.stopPropagation(); climb();
    };
    addEventListener('keydown', onKey, true);
    return { dive, climb, sync, get inside() { return inside; }, get wanted() { return wanted; }, get cd() { return { out, frame }; }, get photos() { return { open: photosOpen, top, close }; }, openPhotos, closePhotos,
      destroy() { removeEventListener('keydown', onKey, true); removeEventListener('keydown', onPolaKey, true); view.remove(); clearInterval(watch); clearInterval(clock); cancelAnimationFrame(tween); cancelAnimationFrame(outRaf); cv.remove(); up.remove(); look.remove(); hits.forEach(b => b.remove()); } };
  }

  const api = { W, H, ITEMS, POLA, POLA_PHOTO, PHOTOS, BRUSH, KEYCHAIN, KEY_IMG, TUBE, TUBE_IMG, CD_R, CD_OUT, CD_CASE, CD_DISC, CD_FRAMES, CASE_IMG, CD_IMG, CD_AT, CD_Z, draw, mount };
  if (typeof window !== 'undefined') window.DrawerInside = Object.assign(window.DrawerInside || {}, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
