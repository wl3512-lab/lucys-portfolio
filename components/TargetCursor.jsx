/* global React */
/*
  TargetCursor: the site's pointer on mice and trackpads (none on touch). Lucy, 2026-10-31: "brainstorm cursor ideas",
  then "Build both parts" of the pick (the look test is docs/superpowers/plans/2026-10-31-cursor/cursor-mock.html):
  1. Pixel brackets that snap round whatever a click would act on, in steps on the site's 3 px grid, with a word under
     them saying what the click does (OPEN ↗, GO ↓, EMAIL ✉, NEXT →, PICK UP, TURN OVER...).
  2. A pointer of its own in each room: a pixel dot in the hero, a remote's blinking infrared dot at Standout work,
     headlights in Capabilities, a gem that glints at s0mped, and in About his paperclip, which bends into a key over
     anything to pick up. Over the ticket's silver the ticket's coin takes over (styles.css hides this there), and the
     end scene's paperclip hides it too (body.end-clip).
  It replaced React Bits' spinning brackets (same name, props and wrapper class, so index.html and the rules that hide
  it are unchanged). Plain DOM and canvas, no GSAP. Reduced motion: no blink or glint, the brackets jump straight on.
*/
const getContainingBlock = function (element) {
  let node = element && element.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (style.transform !== 'none' || style.perspective !== 'none' || style.filter !== 'none' ||
      style.willChange.indexOf('transform') !== -1 || style.willChange.indexOf('filter') !== -1 || /paint|layout|strict|content/.test(style.contain)) return node;
    node = node.parentElement;
  }
  return null;
};

const PX = 3;   // the site's pixel
const INK = { o: '#05060f', b: '#a0c8ff', w: '#f6faff', l: '#c4b0ff', m: '#e2eeff', p: '#ffd6ea', s: '#c6cce9', r: '#ff9fb8', y: '#fff3c4' };
const SPRITES = {   // rows of INK keys ('.' clear); two frames blink or glint
  dot: [['.ooo.', 'obwbo', 'owwwo', 'obwbo', '.ooo.']],
  remote: [['.......', '...o...', '..oro..', '.orwro.', '..oro..', '...o...', '.......'],
           ['r..r..r', '.r.o.r.', '..oro..', 'rorwror', '..oro..', '.r.o.r.', 'r..r..r']],
  lights: [['...y.y.y...', '..y.y.y.y..', '.y.y.y.y.y.', '..y.y.y.y..', '...........', '.oo.....oo.', 'oywo...owyo', '.oo.....oo.']],
  gem: [['...ooo...', '..ommbo..', '.omllbbo.', 'omllbbbpo', '.olbbppo.', '..obppo..', '...opo...', '....o....'],
        ['...owo...', '..owwwo..', '.wmllbbw.', 'owwlbbwwo', '.olbwppo.', '..obppo..', '...opo...', '....o....']],
  clip: [['..ooooo..', '.os...so.', '.os.o.so.', '.os.s.so.', '.os.s.so.', '.os.s.so.', '.os...so.', '..ooooo..']],
  key: [['..ooo....', '.os.so...', '.os.so...', '..oso....', '...so....', '...soo...', '...so....', '...soo...']],
};
// Which pointer, by room (the first that holds the pointer wins)
const ROOMS = [['.about-overlay', 'clip'], ['#projection-standout, .pr-cover', 'remote'], ['#skills', 'lights'], ['#gems', 'gem']];
// What a click does: by the target's own label, a few of the site's controls, then links and buttons in general
const WORDS = [
  ['.pr-tap', (el, x) => { const b = el.getBoundingClientRect(); return x - b.left < b.width * 0.4 ? '← Back' : 'Next →'; }],
  ['.dr-initem[data-doc="spotify"]', 'Play'], ['.dr-initem, .dr-dochit', 'Pick up'], ['.dr-tk-flip', 'Turn over'],
  ['.dr-backup', 'Back up'], ['.dr-lookin', 'Look inside'], ['.about-overlay-close, .dr-card-x, .dr-phone-file-close', 'Close'],
  ['.cr-channel', 'Play'], ['.dr-copy', 'Copy'],
];
function wordFor(el, x) {
  if (el.dataset && el.dataset.cursorLabel) return el.dataset.cursorLabel;
  for (const [sel, w] of WORDS) if (el.matches(sel)) return typeof w === 'function' ? w(el, x) : w;
  const href = el.getAttribute('href');
  if (href != null) {
    if (href.startsWith('mailto:')) return 'Email ✉';
    if (href.startsWith('#')) return 'Go ↓';
    return el.target === '_blank' || /^https?:/.test(href) ? 'Open ↗' : 'Open';
  }
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  if (text && text.length <= 14) return text;
  const aria = (el.getAttribute('aria-label') || '').split(/[\s:,(]/)[0];
  return aria || 'Press';
}

function TargetCursor(props) {
  const p = props || {};
  const targetSelector = p.targetSelector || '.cursor-target';
  const hideDefaultCursor = p.hideDefaultCursor != null ? p.hideDefaultCursor : true;
  const { useEffect, useRef, useMemo } = React;
  const rootRef = useRef(null), spriteRef = useRef(null), bracketsRef = useRef(null), tagRef = useRef(null);

  const isMobile = useMemo(function () {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
    return (touch && innerWidth <= 768) || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent || '');
  }, []);

  useEffect(function () {
    if (isMobile || !rootRef.current) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const original = document.body.style.cursor;
    if (hideDefaultCursor) document.body.style.cursor = 'none';
    const root = rootRef.current, cv = spriteRef.current, g = cv.getContext('2d'), br = bracketsRef.current, tag = tagRef.current;
    let block = getContainingBlock(root), x = -99, y = -99, frame = 0, drawn = '', target = null, shown = null, raf = 0, down = false;
    const offset = () => { if (!block) return [0, 0]; const r = block.getBoundingClientRect(); return [r.left + block.clientLeft, r.top + block.clientTop]; };

    function sprite(name) {   // drawn only when the sprite or its frame changes
      const frames = SPRITES[name], i = reduced ? 0 : frame % frames.length, key = name + i;
      if (key !== drawn) {
        const rows = frames[i], h = rows.length, w = rows[0].length;
        cv.width = w; cv.height = h; cv.style.width = w * PX + 'px'; cv.style.height = h * PX + 'px';
        g.clearRect(0, 0, w, h);
        rows.forEach((row, j) => [...row].forEach((k, n) => { if (INK[k]) { g.fillStyle = INK[k]; g.fillRect(n, j, 1, 1); } }));
        drawn = key;
      }
      return [cv.width * PX, cv.height * PX];
    }
    function roomAt(el) { for (const [sel, name] of ROOMS) if (el && el.closest(sel)) return name; return 'dot'; }
    function render() {
      const [ox, oy] = offset(), el = document.elementFromPoint(x, y);
      const t = el && el.closest(targetSelector);
      let room = roomAt(el);
      if (room === 'clip' && t) room = 'key';   // the paperclip bends into a key over what you can pick up
      const [w, h] = sprite(room);
      cv.style.transform = `translate(${Math.round(x - ox - w / 2)}px, ${Math.round(y - oy - h / 2)}px) scale(${down ? 0.85 : 1})`;
      if (t !== target) { target = t; if (!t) shown = null; }
      br.classList.toggle('on', !!t); tag.classList.toggle('on', !!t);
      if (!t) return;
      tag.textContent = wordFor(t, x);
      const r = t.getBoundingClientRect(), pad = 6;
      const goal = [r.left - pad - ox, r.top - pad - oy, r.width + pad * 2, r.height + pad * 2].map(v => Math.round(v / PX) * PX);
      shown = !shown || reduced ? goal : shown.map((v, i) => { const d = goal[i] - v; return Math.abs(d) <= PX ? goal[i] : Math.round((v + d * 0.5) / PX) * PX; });   // steps on the grid
      const [l, tp, bw, bh] = shown;
      br.style.transform = `translate(${l}px, ${tp}px)`; br.style.width = bw + 'px'; br.style.height = bh + 'px';
      const below = tp + bh + 6 + 22 < innerHeight - oy;
      tag.style.transform = `translate(${Math.max(4, l + bw - tag.offsetWidth)}px, ${below ? tp + bh + 6 : tp - 28}px)`;
      if (shown.some((v, i) => v !== goal[i])) loop();   // still stepping in
    }
    function loop() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
    const move = e => { x = e.clientX; y = e.clientY; loop(); };
    const press = () => { down = true; loop(); }, release = () => { down = false; loop(); };
    const resize = () => { block = getContainingBlock(root); loop(); };
    addEventListener('mousemove', move, { passive: true });
    addEventListener('scroll', loop, { passive: true });
    addEventListener('mousedown', press); addEventListener('mouseup', release); addEventListener('resize', resize);
    const blink = setInterval(() => { if (document.hidden || reduced) return; frame++; loop(); }, 420);   // the infrared blink, the gem's glint
    return function () {
      removeEventListener('mousemove', move); removeEventListener('scroll', loop); removeEventListener('mousedown', press);
      removeEventListener('mouseup', release); removeEventListener('resize', resize); clearInterval(blink); cancelAnimationFrame(raf);
      document.body.style.cursor = original;
    };
  }, [targetSelector, hideDefaultCursor, isMobile]);

  if (isMobile) return null;
  return (
    <div ref={rootRef} className="target-cursor-wrapper pixel-cursor" aria-hidden="true">
      <canvas ref={spriteRef} className="pc-sprite" width="5" height="5" />
      <div ref={bracketsRef} className="pc-brackets"><i /><i /><i /><i /></div>
      <span ref={tagRef} className="pc-tag" />
    </div>
  );
}

window.TargetCursor = TargetCursor;
