/* The standout projector's remote, cut as the navette from the nav logo (Lucy, 2026-10-24: she picked "Facets"
   in the remote look test, https://claude.ai/artifact/13WM86tW7eGpK1Ph7HrC3w). A pixel gem drawn on a canvas in
   3px cells, in the hero's palette with a Bayer dither and a one-pixel outline: its three bands are the project
   buttons, the chosen band lights up from inside, and its two points step. Plain JS, window.NavetteRemote; the
   buttons are real DOM in Spotlight.jsx, clipped to the shapes this file gives them. */
(function (root) {
  'use strict';
  var W = 230, H = 366, CELL = 3;
  var R = 206.4, C = 95.4;                       // two arcs through the tips, 222 wide at the girdle (y 183)
  var BANDS = [[108, 152], [158, 202], [208, 252]], TOP = 98, BOTTOM = 262;
  var RAMPS = {
    gem: ['#142133', '#213452', '#2f4b75', '#3f659e', '#5283cc', '#66a3ff', '#94a1ff'],
    lit: ['#213452', '#2f4b75', '#3f659e', '#5283cc', '#66a3ff'],
    well: ['#05060f', '#090b1e', '#0e122e'],
  };
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16 - 0.5; });

  function hw(y) { var d = y - 183; return d * d > R * R ? 0 : Math.max(0, Math.sqrt(R * R - d * d) - C); }

  // What the stone is made of at (x, y): a facet of the cap, one of the bands (lit when chosen), or a groove.
  function at(x, y, active) {
    if (Math.abs(x - 115) > hw(y)) return null;
    var side = x < 115 ? 1 : -1;
    if (y < TOP) return { k: 'gem', v: 0.2 + side * 0.06 };
    if (y > BOTTOM) return { k: 'gem', v: -0.16 + side * 0.06 };
    for (var i = 0; i < 3; i++) {
      var b = BANDS[i];
      if (y >= b[0] && y < b[1]) return i === active ? { k: 'lit', v: 0.12 + side * 0.08 } : { k: 'gem', v: side * 0.09 - 0.12 - i * 0.04 };
    }
    return { k: 'well', v: 0 };
  }

  // Sideways, for phones (Lucy, 2026-10-24: she picked "Sideways" in https://claude.ai/artifact/RAU3ZW15STM3yARW15mJGL):
  // the same stone lying on its side, 366 x 170, the left point steps back, the right point forward, and the
  // facets stand upright as three slices wide enough for the number over the name.
  var SIDE = { W: 366, H: 170, SLICES: [[48, 136], [140, 226], [230, 318]], LEFT: 44, RIGHT: 322 };
  var SR = 239.5, SC = 154.5;                   // arcs through the tips, 170 tall at the middle (x 183)
  function hv(x) { var d = x - 183; return d * d > SR * SR ? 0 : Math.max(0, Math.sqrt(SR * SR - d * d) - SC); }
  SIDE.hv = hv;
  function atSide(x, y, active) {
    if (Math.abs(y - 85) > hv(x)) return null;
    var side = y < 85 ? 1 : -1;
    if (x < SIDE.LEFT) return { k: 'gem', v: 0.2 + side * 0.06 };
    if (x > SIDE.RIGHT) return { k: 'gem', v: -0.16 + side * 0.06 };
    for (var i = 0; i < 3; i++) {
      var s = SIDE.SLICES[i];
      if (x >= s[0] && x < s[1]) return i === active ? { k: 'lit', v: 0.12 + side * 0.08 } : { k: 'gem', v: side * 0.09 - 0.12 - i * 0.04 };
    }
    return { k: 'well', v: 0 };
  }
  SIDE.at = atSide;

  function draw(canvas, active, sideways) {
    if (!canvas || !canvas.getContext) return;
    var w = sideways ? SIDE.W : W, h = sideways ? SIDE.H : H, shape = sideways ? atSide : at;
    var cw = Math.ceil(w / CELL), ch = Math.ceil(h / CELL);
    canvas.width = cw; canvas.height = ch;
    var g = canvas.getContext('2d'), m = new Array(cw * ch), x, y;
    for (y = 0; y < ch; y++) for (x = 0; x < cw; x++) m[y * cw + x] = shape(x * CELL + 1.5, y * CELL + 1.5, active);
    var get = function (gx, gy) { return gx < 0 || gy < 0 || gx >= cw || gy >= ch ? null : m[gy * cw + gx]; };
    g.clearRect(0, 0, cw, ch);
    for (y = 0; y < ch; y++) for (x = 0; x < cw; x++) {
      var c = get(x, y);
      if (!c) continue;
      if (!get(x, y - 1) || !get(x, y + 1) || !get(x - 1, y) || !get(x + 1, y)) { g.fillStyle = '#090b1e'; g.fillRect(x, y, 1, 1); continue; }
      // Lit from the top left, a rim light along the upper edges and a shade along the lower ones.
      var v = 0.62 - 0.34 * y / ch - 0.12 * x / cw + c.v;
      if (c.k !== 'well') { if (!get(x, y - 2) || !get(x - 2, y)) v += 0.3; if (!get(x, y + 2) || !get(x + 2, y)) v -= 0.25; }
      var ramp = RAMPS[c.k], idx = Math.round(Math.max(0, Math.min(1, v)) * (ramp.length - 1) + BAY[((y & 3) << 2) | (x & 3)]);
      g.fillStyle = ramp[Math.max(0, Math.min(ramp.length - 1, idx))];
      g.fillRect(x, y, 1, 1);
    }
  }

  var poly = function (pts) { return 'polygon(' + pts.map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(', ') + ')'; };
  // A band button's shape in its own box (left 0, top = the band's top), inset 3px from the stone's edge.
  function bandClip(i) {
    var y0 = BANDS[i][0], y1 = BANDS[i][1], h = y1 - y0, ym = (y0 + y1) / 2;
    return poly([[118 - hw(y0), 0], [112 + hw(y0), 0], [112 + hw(ym), h / 2], [112 + hw(y1), h], [118 - hw(y1), h], [118 - hw(ym), h / 2]]);
  }
  // The points: the top one (0 to TOP) and the bottom one (BOTTOM to H), each in its own box.
  function capClip(top) {
    return top ? poly([[115, 0], [115 + hw(TOP), TOP], [115 - hw(TOP), TOP]]) : poly([[115 - hw(BOTTOM), 0], [115 + hw(BOTTOM), 0], [115, H - BOTTOM]]);
  }

  // A slice button's shape in its own box (left = the slice's left, top 0, full height), inset 3px from the edge.
  function sliceClip(i) {
    var a = SIDE.SLICES[i][0], b = SIDE.SLICES[i][1], m = (a + b) / 2, w = b - a;
    return poly([[0, 88 - hv(a)], [w / 2, 88 - hv(m)], [w, 88 - hv(b)], [w, 82 + hv(b)], [w / 2, 82 + hv(m)], [0, 82 + hv(a)]]);
  }
  // The side points: the left one (0 to LEFT) and the right one (RIGHT to W), each in its own box.
  function sideCapClip(left) {
    return left ? poly([[0, 85], [SIDE.LEFT, 85 - hv(SIDE.LEFT)], [SIDE.LEFT, 85 + hv(SIDE.LEFT)]])
      : poly([[0, 85 - hv(SIDE.RIGHT)], [SIDE.W - SIDE.RIGHT, 85], [0, 85 + hv(SIDE.RIGHT)]]);
  }
  SIDE.sliceClip = sliceClip; SIDE.capClip = sideCapClip;

  root.NavetteRemote = { W: W, H: H, BANDS: BANDS, TOP: TOP, BOTTOM: BOTTOM, hw: hw, at: at, draw: draw, bandClip: bandClip, capClip: capClip, SIDE: SIDE };
})(typeof window !== 'undefined' ? window : globalThis);
