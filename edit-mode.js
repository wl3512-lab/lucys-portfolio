/*! edit-mode.js: press E to drag/resize elements and copy their exact x/y/width/height.
 * Dependency-free drop-in. Active only on localhost / file: / *.local, or with ?edit in the URL
 * (or window.EDIT_MODE_FORCE = true). Off until you press E. */
(function () {
  'use strict';
  if (window.EditMode) return;
  var h = location.hostname;
  var allowed = window.EDIT_MODE_FORCE === true || location.protocol === 'file:' ||
    /^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)$/.test(h) || /\.local$/.test(h) ||
    /[?&]edit(=|&|$)/.test(location.search);
  if (!allowed) return;

  var on = false, host, root, ui = {}, sel = null, hover = null, op = null, fmt = 'css';
  var edits = new Map(); // el -> { orig: cssText, selector, clone?, of? }
  var undos = [], redos = [], clip = null, layer = null, passthru = null, sHeld = false, kTool = false, altHeld = false, multi = [], batching = null;
  var vgroups = [], renames = new Map(), locked = new Set(), props = null, uiHidden = false, tool = 'move', showDesign = true, cmode = false, notes = [], curNote = null, lastDraw = 0, lastType = 0;
  var NKEY = 'edit-mode-notes:' + location.pathname; // layer: { i, n } of the selection in the stack under the last click
  var KEY = 'edit-mode:' + location.pathname;
  var layerStack = null, open = new Set(), openRuns = new Set(), runs = [], rows = [], treeFor = undefined, showLayers = true; // layers panel state
  var r1 = function (n) { return Math.round(n * 10) / 10; };
  var rp = function (v) { return v ? r1(parseFloat(v)) + 'px' : undefined; };
  var px = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };

  // ---------- selectors ----------
  function esc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&'); }
  function unique(s, el) { try { var m = document.querySelectorAll(s); return m.length === 1 && m[0] === el; } catch (e) { return false; } }
  function selectorFor(el) {
    if (el.id && unique('#' + esc(el.id), el)) return '#' + esc(el.id);
    var attrs = ['data-edit-id', 'data-testid', 'data-id'];
    for (var i = 0; i < attrs.length; i++) {
      var v = el.getAttribute(attrs[i]);
      if (v) { var s = '[' + attrs[i] + '="' + v.replace(/"/g, '\\"') + '"]'; if (unique(s, el)) return s; }
    }
    var parts = [], cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && cur !== document.documentElement) {
      if (cur !== el && cur.id && unique('#' + esc(cur.id), cur)) { parts.unshift('#' + esc(cur.id)); break; }
      var tag = cur.tagName.toLowerCase(), n = 1, sib = cur;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === cur.tagName) n++;
      var same = cur.parentElement ? Array.prototype.filter.call(cur.parentElement.children, function (c) { return c.tagName === cur.tagName; }).length : 1;
      parts.unshift(same > 1 ? tag + ':nth-of-type(' + n + ')' : tag);
      cur = cur.parentElement;
      if (cur === document.body) parts.unshift('body');
    }
    return parts.join(' > ');
  }

  // ---------- geometry ----------
  function box(el) {
    var r = el.getBoundingClientRect();
    return { x: r1(r.left + scrollX), y: r1(r.top + scrollY), width: r1(r.width), height: r1(r.height), vx: r1(r.left), vy: r1(r.top) };
  }
  function track(el) {
    if (edits.has(el)) return edits.get(el);
    var rec = { orig: el.getAttribute('style'), selector: selectorFor(el) };
    edits.set(el, rec);
    var cs = getComputedStyle(el);
    if (cs.position === 'static') { el.style.position = 'relative'; el.style.left = '0px'; el.style.top = '0px'; }
    else { el.style.left = px(cs.left) + 'px'; el.style.top = px(cs.top) + 'px'; }
    el.style.right = 'auto'; el.style.bottom = 'auto';
    return rec;
  }
  function sizeable(el) {
    if (el._emSized) return; el._emSized = true;
    var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (cs.display === 'inline') el.style.display = 'inline-block';
    el.style.boxSizing = 'border-box'; el.style.minWidth = '0px'; el.style.minHeight = '0px';
    el.style.maxWidth = 'none'; el.style.maxHeight = 'none'; el.style.flexShrink = '0';
    el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
  }
  // a layer that is only type: scaling it scales the font (like Figma's K), not its box
  function isText(el) {
    if (!el || /^(IMG|CANVAS|VIDEO|SVG|PICTURE|IFRAME|INPUT|TEXTAREA)$/i.test(el.tagName)) return false;
    if (el.querySelector('img,canvas,video,svg,picture,iframe') || !(el.textContent || '').trim()) return false;
    // only inline type inside (a heading, a label, "Lucy Liu"); a card with paragraphs resizes as a box
    var all = el.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) if (!/^(SPAN|B|STRONG|EM|I|A|BR|SMALL|SUP|SUB|MARK|U|S|ABBR|CODE)$/.test(all[i].tagName) || /block|flex|grid|table/.test(getComputedStyle(all[i]).display) && all[i].textContent.trim().length > 30) return false;
    return true;
  }
  function sizeOp(el, dir, x, y, scale) {
    var before = [snap(el)], text = isText(el) && (scale || dir.length === 2); track(el);
    if (!text) sizeable(el);
    var r = el.getBoundingClientRect();
    return { kind: 'resize', scale: !!scale, text: text, dir: dir, x: x, y: y, el: el, before: before,
      l: px(el.style.left), t: px(el.style.top), w: text ? r.width : px(el.style.width), h: text ? r.height : px(el.style.height),
      fs: parseFloat(getComputedStyle(el).fontSize) || 16, sw: px(el.style.width), sh: px(el.style.height) };
  }
  function moveBy(el, dx, dy) { track(el); el.style.left = px(el.style.left) + dx + 'px'; el.style.top = px(el.style.top) + dy + 'px'; }

  // ---------- multi-selection (Shift-click) ----------
  function picks() { var a = sel && sel.isConnected ? [sel] : []; multi.forEach(function (x) { if (x && x.isConnected && a.indexOf(x) < 0) a.push(x); }); return a; }
  function setSel(list) { list = (list || []).filter(function (x) { return x && x.isConnected; }); sel = list[0] || null; multi = list.slice(1); layer = null; render.dirty = true; }
  function toggleSel(el) { var a = picks(), i = a.indexOf(el); if (i >= 0) a.splice(i, 1); else a.unshift(el); setSel(a); }
  function movers(list) { var out = []; (list || picks()).forEach(function (p) { together(p).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); }); }); return out; }
  function rectOf(el) { var g = groupOf(el), els = g && g.lead === el ? g.els : [el], r = null;
    els.forEach(function (x) { var b = x.getBoundingClientRect(); if (b.width < 1 && b.height < 1 && els.length > 1) return;
      r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
    r = r || { left: 0, top: 0, right: 0, bottom: 0 }; r.width = r.right - r.left; r.height = r.bottom - r.top; return r; }
  function union(list) { var r = null; list.forEach(function (el) { var b = rectOf(el);
      r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
    if (!r) return null; r.width = r.right - r.left; r.height = r.bottom - r.top; return r; }
  // run several history entries as one Cmd+Z
  function batch(kind, fn) {
    var before = picks(); batching = []; try { fn(); } finally { var list = batching; batching = null; }
    if (!list.length) return; var after = picks();
    push({ kind: kind, sels: after, undoSels: before, redoSels: after,
      undo: function () { list.slice().reverse().forEach(function (e) { e.undo(); }); }, redo: function () { list.forEach(function (e) { e.redo(); }); } });
  }

  // ---------- history (Cmd+Z / Cmd+Shift+Z) ----------
  function snap(el) { return { el: el, style: el.getAttribute('style'), rec: edits.get(el), sized: el._emSized }; }
  function restore(list) {
    list.forEach(function (s) {
      if (s.style == null) s.el.removeAttribute('style'); else s.el.setAttribute('style', s.style);
      if (s.rec) edits.set(s.el, s.rec); else edits.delete(s.el);
      if (s.sized) s.el._emSized = true; else delete s.el._emSized;
    });
  }
  function push(entry) { if (batching) { batching.push(entry); return; } entry.t = Date.now(); undos.push(entry); if (undos.length > 200) undos.shift(); redos.length = 0; }
  // record a style change of `els` whose before-state is `before`
  function commit(kind, before) {
    var after = before.map(function (b) { return snap(b.el); });
    var changed = after.some(function (a, i) { return a.style !== before[i].style || a.rec !== before[i].rec; });
    if (!changed) return;
    var last = undos[undos.length - 1];
    if (!batching && kind === 'nudge' && last && last.kind === 'nudge' && last.el === before[0].el && before.length === (last.before || []).length && Date.now() - last.t < 800 && !redos.length) {
      last.after = after; last.t = Date.now(); return;
    }
    push({ kind: kind, el: before[0].el, sel: sel, sels: picks(), before: before, after: after,
      undo: function () { restore(this.before); }, redo: function () { restore(this.after); } });
  }
  function undo() {
    var e = undos.pop(); if (!e) return toast('Nothing to undo');
    e.undo(); redos.push(e); refresh((e.before || []).map(function (b) { return b.el; }).concat(e.el || [])); if (e.undoSels) setSel(e.undoSels); else if (e.sels) setSel(e.sels); else { sel = e.undoSel !== undefined ? e.undoSel : (e.sel && e.sel.isConnected ? e.sel : null); multi = []; } layer = null; render.dirty = true;
    toast('Undo ' + e.kind);
  }
  function redo() {
    var e = redos.pop(); if (!e) return toast('Nothing to redo');
    e.redo(); undos.push(e); refresh((e.after || []).map(function (b) { return b.el; }).concat(e.el || [])); if (e.redoSels) setSel(e.redoSels); else if (e.sels) setSel(e.sels); else { sel = e.redoSel !== undefined ? e.redoSel : (e.sel && e.sel.isConnected ? e.sel : null); multi = []; } layer = null; render.dirty = true;
    toast('Redo ' + e.kind);
  }

  // ---------- copy / paste / duplicate / delete ----------
  function copyPixels(from, to) {
    var a = from.tagName === 'CANVAS' ? [from] : from.querySelectorAll('canvas');
    var b = to.tagName === 'CANVAS' ? [to] : to.querySelectorAll('canvas');
    for (var i = 0; i < a.length && i < b.length; i++) { try { b[i].getContext('2d').drawImage(a[i], 0, 0); } catch (e) {} }
  }
  function cloneOf(src) {
    var c = src.cloneNode(true);
    [c].concat(Array.prototype.slice.call(c.querySelectorAll('[id]'))).forEach(function (n) { n.removeAttribute && n.removeAttribute('id'); });
    delete c._emSized;
    return c;
  }
  // insert a copy of `src` (the template) after `anchor`, offset 10px, select it
  function insertCopy(template, from, anchor, kind) {
    if (!anchor || !anchor.parentNode) return;
    var c = cloneOf(template), parent = anchor.parentNode, next = anchor.nextSibling;
    parent.insertBefore(c, next);
    copyPixels(from || template, c);
    var rec = track(c); rec.clone = true; rec.of = from && from.isConnected ? selectorFor(from) : rec.selector;
    if (from && from._emSized) c._emSized = true;
    moveBy(c, 10, 10);
    var prev = sel;
    sel = c; multi = []; layer = null;
    push({ kind: kind, sel: c, undoSel: prev && prev.isConnected ? prev : null, redoSel: c,
      undo: function () { c.remove(); edits.delete(c); }, redo: function () { parent.insertBefore(c, next && next.parentNode === parent ? next : null); edits.set(c, rec); } });
    toast(kind === 'paste' ? 'Pasted' : 'Duplicated');
  }
  function copySel(cut) {
    var list = picks(); if (!list.length) return;
    clip = list.map(function (el) { var t = cloneOf(el); copyPixels(el, t); return { template: t, from: el }; });
    var b = box(sel);
    copyText(list.map(function (el) { var b = box(el); return selectorFor(el) + '  x: ' + b.x + 'px, y: ' + b.y + 'px, width: ' + b.width + 'px, height: ' + b.height + 'px'; }).join('\n'), null, (cut ? 'Cut ' : 'Copied ') + (list.length > 1 ? list.length + ' layers' : ''));
    if (cut) hide();
  }
  function paste() {
    if (!clip || !clip.length) return toast('Nothing copied');
    var made = [];
    batch('paste', function () {
      clip.forEach(function (c, i) {
        var from = c.from.isConnected ? c.from : null, anchor = clip.length === 1 && sel && sel.isConnected ? sel : from;
        if (!anchor) return; insertCopy(c.template, from, anchor, 'paste'); made.push(sel);
      });
    });
    if (!made.length) return toast('Select where to paste');
    setSel(made); if (undos.length) undos[undos.length - 1].redoSels = made;
  }
  function duplicate() {
    var list = picks(), made = []; if (!list.length) return;
    batch('duplicate', function () { list.forEach(function (el) { insertCopy(el, el, el, 'duplicate'); made.push(sel); }); });
    setSel(made); if (undos.length) undos[undos.length - 1].redoSels = made;
  }
  function hide() {
    var list = picks(); if (!list.length) return;
    var els = movers(list), before = els.map(snap);
    els.forEach(function (el) { track(el); el.style.display = 'none'; });
    setSel([]);
    var n = undos.length; commit('delete', before);
    if (undos.length > n) { undos[n].undoSels = list; undos[n].redoSels = []; }
    toast('Deleted' + (list.length > 1 ? ' ' + list.length + ' layers' : '') + ' (Cmd+Z brings it back)');
  }

  // ---------- Figma commands ----------
  // style change on every picked layer, one undo step
  function change(kind, els, fn) { if (!els.length) return; var before = els.map(snap); els.forEach(fn); commit(kind, before); refresh(els); }
  function zOf(el) { var z = parseInt(getComputedStyle(el).zIndex, 10); return isNaN(z) ? 0 : z; }
  function align(how) {
    var list = picks(); if (!list.length) return;
    var to = list.length > 1 ? union(list) : (list[0].parentElement && list[0].parentElement !== document.documentElement ? list[0].parentElement.getBoundingClientRect() : null);
    if (!to) return;
    var els = movers(list), before = els.map(snap);
    list.forEach(function (p) {
      var r = rectOf(p), dx = 0, dy = 0;
      if (how === 'left') dx = to.left - r.left; if (how === 'right') dx = to.right - r.right; if (how === 'hcenter') dx = (to.left + to.right) / 2 - (r.left + r.right) / 2;
      if (how === 'top') dy = to.top - r.top; if (how === 'bottom') dy = to.bottom - r.bottom; if (how === 'vcenter') dy = (to.top + to.bottom) / 2 - (r.top + r.bottom) / 2;
      together(p).forEach(function (x) { moveBy(x, dx, dy); });
    });
    commit('align ' + how, before); refresh(els); toast('Align ' + how.replace('hcenter', 'centre horizontally').replace('vcenter', 'centre vertically'));
  }
  function distribute(axis) {
    var list = picks(); if (list.length < 3) return toast('Select 3 or more layers to distribute');
    var A = axis === 'h' ? ['left', 'right', 'width'] : ['top', 'bottom', 'height'];
    var items = list.map(function (p) { return { p: p, r: rectOf(p) }; }).sort(function (a, b) { return a.r[A[0]] - b.r[A[0]]; });
    var first = items[0].r, last = items[items.length - 1].r, used = items.reduce(function (n, it) { return n + it.r[A[2]]; }, 0);
    var gap = (last[A[1]] - first[A[0]] - used) / (items.length - 1), at = first[A[0]];
    var els = movers(list), before = els.map(snap);
    items.forEach(function (it) { var d = at - it.r[A[0]]; together(it.p).forEach(function (x) { moveBy(x, axis === 'h' ? d : 0, axis === 'h' ? 0 : d); }); at += it.r[A[2]] + gap; });
    commit('distribute', before); refresh(els); toast('Distributed with ' + r1(gap) + 'px gaps');
  }
  function zMove(how) {
    var list = picks(); if (!list.length) return;
    change(how, movers(list), function (el) {
      track(el); var sib = el.parentElement ? kids(el.parentElement) : [el], zs = sib.map(zOf), z = zOf(el);
      el.style.zIndex = how === 'bring to front' ? Math.max.apply(null, zs) + 1 : how === 'send to back' ? Math.min.apply(null, zs) - 1 : how === 'bring forward' ? z + 1 : z - 1;
    });
    toast(how[0].toUpperCase() + how.slice(1));
  }
  function flip(axis) {
    var list = picks(), mark = axis === 'h' ? 'scaleX(-1)' : 'scaleY(-1)';
    change('flip', movers(list), function (el) {
      track(el); var t = el.style.transform || '';
      el.style.transform = t.indexOf(mark) >= 0 ? t.replace(mark, '').trim() : (t + ' ' + mark).trim();
    });
    toast(axis === 'h' ? 'Flipped horizontally' : 'Flipped vertically');
  }
  function showHide() {
    var list = picks(); if (!list.length) return;
    var hideIt = list.some(function (el) { return getComputedStyle(el).visibility !== 'hidden'; });
    change(hideIt ? 'hide' : 'show', movers(list), function (el) { track(el); el.style.visibility = hideIt ? 'hidden' : 'visible'; });
    render.dirty = true; toast(hideIt ? 'Hidden (⌘⇧H shows it)' : 'Shown');
  }
  function opacity(v) { change('opacity', picks(), function (el) { track(el); el.style.opacity = v === 1 ? '' : String(v); }); toast('Opacity ' + Math.round(v * 100) + '%'); }
  function lockToggle() {
    var list = picks(); if (!list.length) return;
    var lockIt = list.some(function (el) { return !locked.has(el); });
    var flipTo = function (to) { list.forEach(function (el) { if (to) locked.add(el); else locked.delete(el); }); render.dirty = true; };
    flipTo(lockIt); push({ kind: lockIt ? 'lock' : 'unlock', sels: list, undo: function () { flipTo(!lockIt); }, redo: function () { flipTo(lockIt); } });
    toast(lockIt ? 'Locked: it can only be picked from Layers now' : 'Unlocked');
  }
  function isLocked(el) { for (var a = el; a; a = a.parentElement) if (locked.has(a)) return true; return false; }
  var gN = 0;
  function groupSel() {
    var list = picks(); if (list.length < 2) return toast('Shift-click two or more layers, then ⌘G');
    var g = { g: { name: 'Group ' + (++gN) }, lead: list[0], els: movers(list) };
    var add = function () { vgroups.unshift(g); render.dirty = true; }, del = function () { var i = vgroups.indexOf(g); if (i >= 0) vgroups.splice(i, 1); render.dirty = true; };
    add(); setSel([g.lead]); push({ kind: 'group', undoSels: list, redoSels: [g.lead], undo: del, redo: add });
    toast(g.g.name + ': ' + list.length + ' layers move together (⌘⇧G ungroups)');
  }
  function ungroupSel() {
    var found = vgroups.filter(function (g) { return picks().indexOf(g.lead) >= 0; });
    if (!found.length) return toast('Select a group made with ⌘G');
    var members = found.reduce(function (a, g) { return a.concat(g.els); }, []);
    var del = function () { found.forEach(function (g) { var i = vgroups.indexOf(g); if (i >= 0) vgroups.splice(i, 1); }); render.dirty = true; };
    var add = function () { found.forEach(function (g) { vgroups.unshift(g); }); render.dirty = true; };
    var before = picks(); del(); setSel(members); push({ kind: 'ungroup', undoSels: before, redoSels: members, undo: add, redo: del });
    toast('Ungrouped');
  }
  function rename() {
    if (!sel) return; var el = sel, old = renames.get(el), v = window.prompt('Layer name', label(el).name);
    if (v == null) return; v = v.trim();
    var set = function (n) { if (n) renames.set(el, n); else renames.delete(el); var g = vgroups.filter(function (g) { return g.lead === el; })[0]; if (g && n) g.g.name = n; render.dirty = true; };
    set(v); push({ kind: 'rename', sels: [el], undo: function () { set(old); }, redo: function () { set(v); } });
  }
  function copyProps() { if (!sel) return; var s = sel.style; props = { width: s.width, height: s.height, opacity: s.opacity, transform: s.transform, zIndex: s.zIndex, visibility: s.visibility }; toast('Copied properties'); }
  function pasteProps() {
    if (!props) return toast('Copy properties first (⌥⌘C)');
    change('paste properties', picks(), function (el) { track(el); if (props.width || props.height) sizeable(el); Object.keys(props).forEach(function (k) { if (props[k]) el.style[k] = props[k]; }); });
    toast('Pasted properties');
  }
  function siblings(el) { return el && el.parentElement ? kids(el.parentElement).filter(function (c) { return !hidden(c); }) : []; }
  function selectAll() {
    var list = sel ? siblings(sel) : kids(document.body).filter(function (c) { return !hidden(c); });
    setSel(list.filter(function (x) { return !isLocked(x); })); toast('Selected ' + picks().length + ' layers');
  }
  function stepSibling(d) { if (!sel) return; var sb = siblings(sel), i = sb.indexOf(sel); if (sb.length) setSel([sb[(i + d + sb.length) % sb.length]]); }
  function selectChildren() { if (!sel) return; var k = kids(sel).filter(function (c) { return !hidden(c); }); if (k.length) setSel(k); }
  function selectParent() { if (sel && sel.parentElement && sel.parentElement !== document.body && sel.parentElement !== document.documentElement) setSel([sel.parentElement]); }
  function zoomTo() { if (sel) { sel.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }); } }

  // ---------- save (Cmd+S) ----------
  function save() {
    var list = EditModeAPI.getEdits(), css = exportAll('css');
    try { localStorage.setItem(KEY, JSON.stringify(list.filter(function (e) { return !e.clone; }))); } catch (e) {}
    var payload = { page: location.pathname, css: css, edits: list };
    window.__editModeLastSave = payload;
    var fallback = function () {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([css + '\n'], { type: 'text/css' }));
      a.download = 'edit-mode' + (location.pathname.replace(/\.html?$/, '').replace(/[^\w-]+/g, '-') || '-index') + '.css';
      document.documentElement.appendChild(a); passthru = a; a.click(); passthru = null; a.remove();
      toast('Saved ' + list.length + ' edits (downloaded ' + a.download + ')');
    };
    if (!list.length) return toast('Nothing to save yet');
    if (!window.fetch) return fallback();
    fetch('/__edit-mode/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw 0; return r.json().catch(function () { return {}; }); })
      .then(function (j) { toast('Saved ' + list.length + ' edits' + (j && j.file ? ' to ' + j.file : '')); }, fallback);
  }
  function savedList() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function restoreSaved() {
    var list = savedList(), before = [], els = [];
    list.forEach(function (e) {
      var el; try { el = document.querySelector(e.selector); } catch (x) {}
      if (el && els.indexOf(el) < 0) { els.push(el); before.push(snap(el)); }
    });
    els.forEach(function (el, i) {
      var c = list.filter(function (e) { try { return document.querySelector(e.selector) === el; } catch (x) { return false; } })[0].css;
      track(el); if (c.width || c.height) sizeable(el);
      Object.keys(c).forEach(function (k) { if (c[k]) el.style[k] = c[k]; });
    });
    if (before.length) commit('restore', before);
    toast('Restored ' + els.length + ' of ' + list.length + ' saved edits');
  }

  // ---------- UI ----------
  var BLUE = '#0d99ff';
  var CSS_TXT = ':host{all:initial}*{box-sizing:border-box;font:11px/16px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;letter-spacing:.005em;-webkit-font-smoothing:antialiased}' +
    '.o{position:fixed;pointer-events:none;z-index:1}.hv{outline:1px solid #0d99ff;outline-offset:-1px}.sl{outline:1px solid #0d99ff;outline-offset:-.5px}' +
    '.hd{position:absolute;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;background:#fff;border:1px solid #0d99ff;pointer-events:auto}' +
    '.gl{position:absolute;background:#f24822}.gd{position:absolute;width:5px;height:5px;margin:-2px 0 0 -2px;background:#f24822}.sl.many .hd{display:none}.x2{outline:1px solid #0d99ff;outline-offset:-.5px}.ms{inset:0}.ml{position:absolute;background:#f24822}.mt{position:absolute;background:#f24822;color:#fff;padding:0 4px;border-radius:2px;transform:translate(-50%,-50%);white-space:nowrap}.lk{color:#8c8c8c;margin-left:auto;padding-left:6px}' +
    '.badge{position:absolute;left:50%;top:100%;margin-top:6px;transform:translateX(-50%);background:#0d99ff;color:#fff;padding:1px 4px;border-radius:2px;white-space:nowrap}' +
    '.side{position:fixed;top:0;bottom:0;width:240px;background:#2c2c2c;color:rgba(255,255,255,.9);z-index:2;display:flex;flex-direction:column;box-shadow:0 0 0 1px #3a3a3a}' +
    '.lft{left:0}.rgt{right:0;overflow:auto}' +
    '.hdr{flex:none;height:41px;display:flex;align-items:center;gap:12px;padding:0 8px 0 16px;border-bottom:1px solid #3a3a3a}.tab{font-weight:600;color:#fff}.tab.dim{font-weight:500;color:#8c8c8c}.sp{flex:1}' +
    '.lyb{flex:1;overflow:auto;padding:4px 0 16px}' +
    '.r{display:flex;align-items:center;height:32px;padding-right:8px;white-space:nowrap;cursor:default;color:rgba(255,255,255,.9);border-radius:0}' +
    '.r:hover{box-shadow:inset 0 0 0 1px #0d99ff}.r.on{background:rgba(13,153,255,.3);color:#fff}.r.hid{color:#7a7a7a}.r.hid .ic{color:#666}' +
    '.tg{width:16px;flex:none;text-align:center;color:#8c8c8c;font-size:9px}.ic{width:16px;flex:none;text-align:center;color:#b3b3b3;margin-right:8px}.r.on .ic{color:#fff}' +
    '.nm{overflow:hidden;text-overflow:ellipsis}.k{color:#7a7a7a;margin-left:6px}.sec{padding:12px 16px 4px;color:#8c8c8c;font-weight:600}' +
    '.grp{padding:12px 16px 16px;border-bottom:1px solid #3a3a3a}.gt{font-weight:600;color:#fff;margin-bottom:8px;display:flex;align-items:center}' +
    '.fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.f{display:flex;align-items:center;gap:6px;height:28px;min-width:0;background:#383838;border:1px solid transparent;border-radius:5px;padding:0 6px}' +
    '.f:hover{border-color:#4a4a4a}.f:focus-within{border-color:#0d99ff}.f span{color:#8c8c8c;width:10px;text-align:center}.f input{all:unset;flex:1;min-width:0;color:#fff;font:inherit}' +
    'button{background:#383838;color:#fff;border:0;border-radius:5px;height:28px;padding:0 10px;cursor:default}button:hover{background:#444}button.on,button.pri{background:#0d99ff}button.on:hover,button.pri:hover{background:#0b8ae6}' +
    'button.ghost{background:none;color:#b3b3b3;height:24px;padding:0 6px}button.ghost:hover{background:#383838;color:#fff}' +
    '.btns{display:flex;flex-wrap:wrap;gap:6px}.nmbig{font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.s{color:#8c8c8c;word-break:break-all;margin-top:2px}.lyr{color:#0d99ff;margin-top:4px}.muted{color:#8c8c8c}' +
    'textarea{width:100%;height:140px;margin-top:8px;background:#1e1e1e;color:#d4d4d4;border:1px solid #3a3a3a;border-radius:5px;padding:6px;resize:vertical;font:10px/14px ui-monospace,Menlo,monospace}' +
    '.keys{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;color:#b3b3b3}.keys b{font-weight:500;color:#fff;background:#383838;border-radius:3px;padding:0 5px;text-align:center}' +
    '.mq{position:absolute;border:1px solid #0d99ff;background:rgba(13,153,255,.08);display:none}' +
    '.bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:4px;padding:4px;background:#2c2c2c;border-radius:8px;box-shadow:0 0 0 1px #3a3a3a,0 4px 16px rgba(0,0,0,.35);z-index:2}.bar button{height:30px;padding:0 9px}.bar i{width:1px;background:#444;margin:3px 2px}' +
    '.cm{position:fixed;inset:0;pointer-events:none;overflow:visible}.cm path{fill:none;stroke:#f24822;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.cm path.cur{stroke:#ff8a00}' +
    '.pin{position:fixed;width:24px;height:24px;margin:-24px 0 0 0;border-radius:12px 12px 12px 2px;background:#f24822;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);z-index:1}.pin.cur{background:#ff8a00}' +
    '.pop{position:fixed;width:260px;background:#2c2c2c;border-radius:8px;box-shadow:0 0 0 1px #3a3a3a,0 6px 24px rgba(0,0,0,.45);padding:8px;z-index:2;display:none}.pop textarea{height:64px;margin:0 0 6px;font:12px/16px inherit;font-family:inherit}.pop .pt{margin:0 0 6px;color:#b3b3b3}' +
    '.nl{color:#d4d4d4;margin:2px 0 8px;line-height:1.4}.nl b{color:#f24822}' +
    '.toast{position:fixed;left:50%;bottom:62px;transform:translateX(-50%);background:#1e1e1e;color:#fff;padding:8px 12px;border-radius:6px;box-shadow:0 2px 14px rgba(0,0,0,.35);z-index:3;transition:opacity .2s;opacity:0}.toast.show{opacity:1}';
  function mk(tag, cls, txt, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; (parent || root).appendChild(e); return e; }
  function btn(act, txt, parent, cls) { var b = mk('button', cls || '', txt, parent); b.dataset.act = act; ui[act] = b; return b; }
  function build() {
    host = document.createElement('edit-mode-ui');
    host.style.cssText = 'position:fixed;inset:0 auto auto 0;width:0;height:0;z-index:2147483000;';
    root = host.attachShadow({ mode: 'open' });
    mk('style', '', CSS_TXT);
    ui.hover = mk('div', 'o hv'); ui.extra = []; ui.meas = mk('div', 'o ms'); ui.guides = mk('div', 'o ms'); ui.sel = mk('div', 'o sl'); ui.mq = mk('div', 'mq');
    ui.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ui.svg.setAttribute('class', 'cm'); root.appendChild(ui.svg);
    ui.g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); ui.svg.appendChild(ui.g); ui.pins = mk('div', '');
    ui.pop = mk('div', 'pop'); ui.popT = mk('div', 'pt', '', ui.pop); ui.popTa = mk('textarea', '', '', ui.pop); ui.popTa.placeholder = 'What should change? Drag on the page to draw on it.';
    var pb = mk('div', 'btns', '', ui.pop); btn('ndone', 'Done  ↵', pb, 'pri'); btn('ndel', 'Delete', pb);
    ui.popTa.addEventListener('keydown', function (e) { e.stopPropagation();
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) { var top = undos[undos.length - 1]; if (e.shiftKey || e.key === 'y' ? redos.length && redos[redos.length - 1].notes : top && top.notes && lastDraw > lastType) { e.preventDefault(); (e.shiftKey || e.key === 'y' ? redo : undo)(); render(); return; } } if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') { e.preventDefault(); closeNote(); render(); } });
    ui.popTa.addEventListener('input', function () { lastType = Date.now(); if (curNote) { curNote.text = ui.popTa.value; keepNotes(); } });
    ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(function (d) {
      var hd = mk('div', 'hd', '', ui.sel); hd.dataset.dir = d;
      hd.style.cursor = d + '-resize';
      hd.style.left = /w/.test(d) ? '0' : /e/.test(d) ? '100%' : '50%';
      hd.style.top = /n/.test(d) ? '0' : /s/.test(d) ? '100%' : '50%';
    });
    ui.badge = mk('div', 'badge', '', ui.sel);
    // left: Layers
    ui.ly = mk('div', 'side lft');
    var lh = mk('div', 'hdr', '', ui.ly); mk('span', 'tab', 'Layers', lh); ui.page = mk('span', 'tab dim', '', lh); mk('span', 'sp', '', lh);
    btn('layers', 'Hide  L', lh, 'ghost');
    ui.lyb = mk('div', 'lyb', '', ui.ly);
    // right: Design
    ui.panel = mk('div', 'side rgt p');
    var rh = mk('div', 'hdr', '', ui.panel); mk('span', 'tab', 'Design', rh); ui.count = mk('span', 'tab dim', '', rh); mk('span', 'sp', '', rh);
    btn('design', 'Hide  D', rh, 'ghost'); btn('off', 'Exit  E', rh, 'ghost');
    var g = mk('div', 'grp', '', ui.panel);
    ui.selName = mk('div', 'nmbig', '', g); ui.sTxt = mk('div', 's', '', g); ui.lyr = mk('div', 'lyr', '', g);
    g = mk('div', 'grp', '', ui.panel); mk('div', 'gt', 'Position and size', g);
    var fs = mk('div', 'fields', '', g); ui.fields = {};
    ['x', 'y', 'w', 'h'].forEach(function (k) {
      var f = mk('label', 'f', '', fs); mk('span', '', k.toUpperCase(), f);
      var inp = mk('input', '', '', f); inp.type = 'text'; inp.inputMode = 'decimal'; inp.dataset.field = k; ui.fields[k] = inp;
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); applyField(k, inp.value); inp.select(); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); var v = (parseFloat(inp.value) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1); inp.value = v; applyField(k, v); }
        else if (e.key === 'Escape') { inp.blur(); }
        e.stopPropagation();
      });
      inp.addEventListener('change', function () { applyField(k, inp.value); });
    });
    g = mk('div', 'grp', '', ui.panel); mk('div', 'gt', 'Export', g);
    var bs = mk('div', 'btns', '', g);
    btn('copy', 'Copy layer', bs); btn('all', 'Copy all edits', bs); btn('css', 'CSS', bs); btn('json', 'JSON', bs);
    ui.out = mk('textarea', '', '', g); ui.out.readOnly = true; ui.out.style.display = 'none';
    g = mk('div', 'grp', '', ui.panel); mk('div', 'gt', 'Comments for AI', g); ui.nlist = mk('div', 'nl', '', g);
    bs = mk('div', 'btns', '', g); btn('ncopy', 'Copy for AI', bs, 'pri'); btn('nsave', 'Save notes', bs); btn('nclear', 'Clear', bs);
    g = mk('div', 'grp', '', ui.panel); mk('div', 'gt', 'File', g);
    bs = mk('div', 'btns', '', g);
    btn('save', 'Save  ⌘S', bs, 'pri'); btn('restore', 'Restore saved', bs); btn('reset', 'Reset all', bs);
    g = mk('div', 'grp', '', ui.panel); mk('div', 'gt', 'Shortcuts', g);
    var ks = mk('div', 'keys', '', g);
    [['⌘K', 'comment: click a part to pin a note, drag to draw on it (⌘Z undoes a drawing)'], ['V', 'move tool: drag moves layers'], ['M', 'select tool: drag a box to select, nothing moves (⇧ adds)'], ['D', 'show or hide the Design panel'], ['Click', 'select · click again for the layer under it'], ['⇧ Click', 'add to / remove from the selection'], ['Drag', 'snaps to edges and centres with red guides (hold ⌘ to stop snapping)'], ['⌘ Click', 'pick the deepest layer'], ['⌘A', 'select all (siblings)'],
     ['Enter  ⇧Enter', 'children, parent'], ['Tab  ⇧Tab', 'next, previous sibling'], ['⌥ hover', 'measure distances'],
     ['⌥A ⌥D ⌥W ⌥S', 'align left, right, top, bottom'], ['⌥H ⌥V', 'align centres'], ['⌥⇧H ⌥⇧V', 'distribute spacing'],
     ['⌘] ⌘[', 'forward, backward (⌥ front, back)'], ['⌘G  ⌘⇧G', 'group, ungroup'], ['⌘R', 'rename'], ['⌘⇧H', 'show / hide'], ['⌘⇧L', 'lock'],
     ['⇧H ⇧V', 'flip'], ['1 … 0', 'opacity 10 … 100%'], ['K', 'scale tool'], ['⌥⌘C ⌥⌘V', 'copy, paste properties'], ['⇧2', 'scroll to selection'], ['⌘\\', 'hide panels'], ['⌥ Click', 'back up a layer'], ['Drag', 'move (⇧ locks an axis)'], ['S + drag', 'scale; type scales its font (⌥ from the centre)'], ['Handles', 'resize (⇧ keep shape, ⌥ from centre)'], ['P', 'select parent'],
     ['Arrows', 'nudge 1px (⇧ 10px)'], ['⌘Z  ⌘⇧Z', 'undo, redo'], ['⌘C ⌘X ⌘V', 'copy, cut, paste'], ['⌘D', 'duplicate'], ['⌫', 'delete (hide)'],
     ['⌘S', 'save'], ['L', 'show or hide layers'], ['Esc', 'deselect, then exit']].forEach(function (k) { mk('b', '', k[0], ks); mk('span', '', k[1], ks); });
    // bottom toolbar: tools and panels, on and off (stays when the panels are hidden)
    ui.bar = mk('div', 'bar');
    btn('tmove', 'Move  V', ui.bar); btn('tselect', 'Select  M', ui.bar); btn('tscale', 'Scale  K', ui.bar); btn('tcomment', 'Comment  ⌘K', ui.bar); mk('i', '', '', ui.bar);
    btn('players', 'Layers  L', ui.bar); btn('pdesign', 'Design  D', ui.bar);
    ui.toast = mk('div', 'toast');
  }
  // typed X / Y / W / H from the Design panel (page px), undoable
  function applyField(k, v) {
    if (!sel) return; v = parseFloat(v); if (isNaN(v)) return render();
    if (picks().length > 1) {
      if (k !== 'x' && k !== 'y') return render();
      var u = union(picks()), mv = movers(), bf = mv.map(snap), d = v - r1((k === 'x' ? u.left + scrollX : u.top + scrollY));
      mv.forEach(function (x) { moveBy(x, k === 'x' ? d : 0, k === 'y' ? d : 0); }); commit('edit ' + k.toUpperCase(), bf); refresh(mv); return render();
    }
    var b = box(sel), els = k === 'x' || k === 'y' ? together(sel) : [sel], before = els.map(snap);
    if (k === 'x') els.forEach(function (x) { moveBy(x, v - b.x, 0); });
    if (k === 'y') els.forEach(function (x) { moveBy(x, 0, v - b.y); });
    if (k === 'w' || k === 'h') { track(sel); sizeable(sel); sel.style[k === 'w' ? 'width' : 'height'] = Math.max(1, px(sel.style[k === 'w' ? 'width' : 'height']) + v - (k === 'w' ? b.width : b.height)) + 'px'; }
    commit('edit ' + k.toUpperCase(), before); refresh(els); render();
  }
  // ---------- smart guides: snap edges and centres while dragging ----------
  // everything the select tool's box can catch: visible layers, as their group leads (⌘: raw elements)
  function boxItems(deep) {
    memo = new Map(); var out = [], seen = new Set(), all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var n = all[i]; if (n === host || SKIP.test(n.tagName) || isLocked(n)) continue;
      var m = deep ? n : ((groupOf(n) || {}).lead || lettersTop(n) || n); if (seen.has(m)) continue;
      var r = rectOf(m); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      var cs = getComputedStyle(m); if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
      seen.add(m); out.push({ el: m, r: r });
    }
    return out;
  }
  function candidates(moving) {
    var out = [], all = document.body.getElementsByTagName('*'), vw = innerWidth, vh = innerHeight;
    for (var i = 0; i < all.length && out.length < 800; i++) {
      var n = all[i]; if (n === host || SKIP.test(n.tagName)) continue;
      var mine = false; for (var j = 0; j < moving.length; j++) if (moving[j] === n || moving[j].contains(n)) { mine = true; break; }
      if (mine) continue;
      var r = n.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < -40 || r.top > vh + 40 || r.right < -40 || r.left > vw + 40) continue;
      out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    }
    out.push({ left: 0, top: 0, right: vw, bottom: vh, win: true });
    return out;
  }
  function snapTo(base, dx, dy, cand, only) {
    var T = 5, g = [];
    var pts = function (r, ax) { return ax === 'x' ? [r.left, (r.left + r.right) / 2, r.right] : [r.top, (r.top + r.bottom) / 2, r.bottom]; };
    var best = function (ax, d) {
      var mine = pts({ left: base.left + dx, right: base.right + dx, top: base.top + dy, bottom: base.bottom + dy }, ax), b = null;
      cand.forEach(function (c) { pts(c, ax).forEach(function (v) { mine.forEach(function (m) { var k = v - m; if (Math.abs(k) <= T && (!b || Math.abs(k) < Math.abs(b))) b = k; }); }); });
      return b || 0;
    };
    var sx = only === 'y' ? 0 : best('x'), sy = only === 'x' ? 0 : best('y');
    var m = { left: base.left + dx + sx, right: base.right + dx + sx, top: base.top + dy + sy, bottom: base.bottom + dy + sy };
    // the lines: every candidate point that now lines up exactly
    ['x', 'y'].forEach(function (ax) {
      if ((ax === 'x' && only === 'y') || (ax === 'y' && only === 'x')) return;
      pts(m, ax).forEach(function (v) {
        var lo = ax === 'x' ? m.top : m.left, hi = ax === 'x' ? m.bottom : m.right, hit = false, dots = [];
        cand.forEach(function (c) {
          if (!pts(c, ax).some(function (w) { return Math.abs(w - v) < 0.5; })) return;
          hit = true; lo = Math.min(lo, ax === 'x' ? c.top : c.left); hi = Math.max(hi, ax === 'x' ? c.bottom : c.right);
          if (!c.win) dots.push(ax === 'x' ? [c.top, c.bottom] : [c.left, c.right]);
        });
        if (hit) g.push({ ax: ax, v: v, lo: lo, hi: hi, dots: dots });
      });
    });
    return { dx: sx, dy: sy, g: g };
  }
  function drawGuides(g) {
    var d = ui.guides; d.textContent = ''; if (!g || !g.length) { d.style.display = 'none'; return; } d.style.display = 'block';
    g.forEach(function (l) {
      var e = mk('div', 'gl', '', d);
      if (l.ax === 'x') { e.style.left = l.v + 'px'; e.style.top = l.lo + 'px'; e.style.width = '1px'; e.style.height = (l.hi - l.lo) + 'px'; }
      else { e.style.top = l.v + 'px'; e.style.left = l.lo + 'px'; e.style.height = '1px'; e.style.width = (l.hi - l.lo) + 'px'; }
      l.dots.slice(0, 12).forEach(function (p) { p.forEach(function (q) { var o = mk('div', 'gd', '', d); o.style.left = (l.ax === 'x' ? l.v : q) + 'px'; o.style.top = (l.ax === 'x' ? q : l.v) + 'px'; }); });
    });
  }
  function placeRect(div, r) {
    if (!r) { div.style.display = 'none'; return; }
    div.style.display = 'block'; div.style.left = r.left + 'px'; div.style.top = r.top + 'px'; div.style.width = r.width + 'px'; div.style.height = r.height + 'px';
  }
  // hold Option: red distance lines from the selection to what is under the pointer (or its parent)
  function measure(a, b) {
    var m = ui.meas; m.textContent = ''; if (!a || !b) { m.style.display = 'none'; return; } m.style.display = 'block';
    var line = function (x1, y1, x2, y2) {
      var len = Math.abs(x2 - x1) + Math.abs(y2 - y1); if (len < 1) return;
      var l = mk('div', 'ml', '', m); l.style.left = Math.min(x1, x2) + 'px'; l.style.top = Math.min(y1, y2) + 'px';
      l.style.width = (x1 === x2 ? 1 : Math.abs(x2 - x1)) + 'px'; l.style.height = (y1 === y2 ? 1 : Math.abs(y2 - y1)) + 'px';
      var t = mk('div', 'mt', String(Math.round(len)), m); t.style.left = (x1 + x2) / 2 + 'px'; t.style.top = (y1 + y2) / 2 + 'px';
    };
    var cy = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2, cx = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2;
    if (!(cy > Math.max(a.top, b.top))) cy = (a.top + a.bottom) / 2;
    if (!(cx > Math.max(a.left, b.left))) cx = (a.left + a.right) / 2;
    var inside = b.left <= a.left && b.right >= a.right && b.top <= a.top && b.bottom >= a.bottom;
    if (inside) { line(b.left, cy, a.left, cy); line(a.right, cy, b.right, cy); line(cx, b.top, cx, a.top); line(cx, a.bottom, cx, b.bottom); return; }
    if (a.right <= b.left) line(a.right, cy, b.left, cy); else if (b.right <= a.left) line(b.right, cy, a.left, cy);
    if (a.bottom <= b.top) line(cx, a.bottom, cx, b.top); else if (b.bottom <= a.top) line(cx, b.bottom, cx, a.top);
    if (!(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)) { // overlapping: edge to edge
      line(Math.min(a.left, b.left), cy, Math.max(a.left, b.left), cy); line(Math.min(a.right, b.right), cy, Math.max(a.right, b.right), cy);
      line(cx, Math.min(a.top, b.top), cx, Math.max(a.top, b.top)); line(cx, Math.min(a.bottom, b.bottom), cx, Math.max(a.bottom, b.bottom));
    }
  }
  function place(div, el) {
    if (!el) { div.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    div.style.display = 'block';
    div.style.left = r.left + 'px'; div.style.top = r.top + 'px'; div.style.width = r.width + 'px'; div.style.height = r.height + 'px';
  }
  // ---------- layers panel ----------
  var SKIP = /^(SCRIPT|STYLE|NOSCRIPT|LINK|META|TEMPLATE|BR|SOURCE|TRACK|WBR)$/;
  function kids(el) { return Array.prototype.filter.call(el.children, function (c) { return c !== host && !SKIP.test(c.tagName); }); }
  function icon(el) {
    var t = el.tagName;
    if (t === 'CANVAS') return '▦'; if (t === 'IMG' || t === 'PICTURE' || t === 'SVG' || t === 'svg') return '◩';
    if (t === 'VIDEO') return '▶'; if (/^(A|BUTTON)$/.test(t)) return '⌁';
    if (/^(H[1-6]|P|SPAN|B|I|EM|STRONG|LABEL|LI|DT|DD)$/.test(t)) return 'T';
    return kids(el).length ? '▢' : '·';
  }
  var TAGNAME = { div: 'Group', section: 'Section', header: 'Header', footer: 'Footer', nav: 'Nav', main: 'Main', aside: 'Aside', article: 'Article',
    ul: 'List', ol: 'List', li: 'Item', p: 'Text', span: 'Text', a: 'Link', button: 'Button', img: 'Image', picture: 'Image', svg: 'Icon',
    canvas: 'Canvas', video: 'Video', input: 'Field', textarea: 'Field', form: 'Form', figure: 'Figure', figcaption: 'Caption', dl: 'Facts', dt: 'Label', dd: 'Value' };
  // names + groups for this page: data-layer-name attributes, or a names file the dev server hands out
  // { rules: [[cssSelector, name with optional {text}]], groups: [{ name, lead, members: [cssSelector] }], refresh: ['__heroRoom.relayout'] }
  var nm = { rules: [], groups: [], refresh: [] }, memo = new Map();
  function q(sel) { try { return Array.prototype.slice.call(document.querySelectorAll(sel)); } catch (e) { return []; } }
  function matches(el, sel) { try { return el.matches(sel); } catch (e) { return false; } }
  // a virtual group: its lead is what gets selected; its members move with it
  function groupOf(el) {
    for (var v = 0; v < vgroups.length; v++) { var vg = vgroups[v]; for (var w = 0; w < vg.els.length; w++) if (vg.els[w] === el || vg.els[w].contains(el)) return vg; }
    for (var i = 0; i < nm.groups.length; i++) {
      var g = nm.groups[i], lead = q(g.lead)[0]; if (!lead) continue;
      var all = [lead].concat((g.members || []).reduce(function (a, s) { return a.concat(q(s)); }, []));
      for (var j = 0; j < all.length; j++) if (all[j] === el || all[j].contains(el)) return { g: g, lead: lead, els: all.filter(function (x, k) { return all.indexOf(x) === k; }) };
    }
    return null;
  }
  function together(el) { var g = groupOf(el); return g && g.lead === el ? g.els : [el]; }
  // "l u c y" split into one span a letter reads as one layer
  function letters(el) {
    if (memo.has(el)) return memo.get(el);
    var k = kids(el), v = k.length >= 3 && k.every(function (c) { return (c.textContent || '').trim().length <= 2 || letters(c); }) && (el.textContent || '').trim().length >= 3;
    memo.set(el, v); return v;
  }
  function lettersTop(el) { var top = null; for (var a = el; a && a !== document.body; a = a.parentElement) if (letters(a)) top = a; return top; }
  // refresh hooks: 'path.to.fn' always, or { when: selector, call: 'path.to.fn' } only when a changed element is or holds a match
  function refresh(els) {
    els = (els || (sel ? [sel] : [])).filter(Boolean);
    refresh.els = (refresh.els || []).concat(els);
    if (refresh.raf) return;
    refresh.raf = requestAnimationFrame(function () {
      refresh.raf = 0; var changed = refresh.els; refresh.els = [];
      (nm.refresh || []).forEach(function (h) {
        var path = typeof h === 'string' ? h : h.call;
        if (typeof h === 'object' && h.when && !changed.some(function (el) { return el.isConnected && (matches(el, h.when) || !!el.querySelector(h.when)); })) return;
        var o = window, parts = String(path).split('.'), fn = parts.pop();
        parts.forEach(function (p) { o = o && o[p]; });
        try { if (o && typeof o[fn] === 'function') o[fn](); } catch (e) {}
      });
    });
  }
  function human(s) {
    s = s.replace(/^(js|is|has|u|c|l)-/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
  function words(t, n) { t = (t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
  function label(el) {
    var tag = el.tagName.toLowerCase(), key = tag + (el.id ? '#' + el.id : '');
    var g = groupOf(el);
    if (renames.has(el)) return { name: renames.get(el), hint: g && g.lead === el ? 'group of ' + g.els.length : key, group: !!(g && g.lead === el) };
    if (g && g.lead === el) return { name: g.g.name, hint: g.els.length > 1 ? 'group of ' + g.els.length : key, group: true };
    var given = el.getAttribute('data-layer-name');
    for (var i = 0; !given && i < nm.rules.length; i++) if (matches(el, nm.rules[i][0])) given = nm.rules[i][1];
    if (given) return { name: given.replace('{text}', words(el.getAttribute('aria-label') || el.getAttribute('alt') || el.textContent, 28)), hint: key };
    if (letters(el)) return { name: '"' + words(el.textContent, 30) + '"', hint: 'letters' };
    var al = el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title');
    if (al) return { name: words(al, 34), hint: key };
    var txt = /^(h[1-6]|button|a|label|figcaption|dt|dd|li|p|span|b|strong|em)$/.test(tag) ? words(el.textContent, 34) : '';
    if (!txt) { var own = ''; for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3) own += c.nodeValue; txt = words(own, 34); }
    if (txt) return { name: (/^h[1-6]$/.test(tag) ? 'Heading: ' : '') + txt, hint: key };
    var cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(function (c) { return c.length > 2 && !/^(is|has|on|active|open|show)$/.test(c); }) : [];
    if (el.id) return { name: human(el.id), hint: tag };
    if (cls.length) return { name: human(cls[0]), hint: tag };
    return { name: TAGNAME[tag] || tag, hint: tag === 'div' ? '' : tag };
  }
  function loadNames() {
    if (loadNames.done || !window.fetch) return; loadNames.done = true;
    fetch('/__edit-mode/names?page=' + encodeURIComponent(location.pathname)).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { if (j && typeof j === 'object') { nm = { rules: j.rules || [], groups: j.groups || [], refresh: j.refresh || [] }; render.dirty = true; render(); } }, function () {});
  }
  function hidden(el) { var r = el.getBoundingClientRect(); return r.width < 1 || r.height < 1 || getComputedStyle(el).visibility === 'hidden'; }
  function buildTree() {
    treeFor = sel; rows = []; runs = []; ui.lyb.textContent = ''; memo = new Map();
    if (sel) for (var a = sel.parentElement; a && a !== document.documentElement; a = a.parentElement) { open.add(a); }
    open.add(document.body);
    var onRow = null;
    // the stack under the last click, as Figma's "select layer" list
    if (layerStack && layerStack.length > 1) {
      mk('div', 'sec', 'Under the pointer (' + layerStack.length + ')', ui.lyb);
      layerStack.forEach(function (el) { var r = row(el, 0, false); if (el === sel) onRow = onRow || r; });
      mk('div', 'sec', 'All layers', ui.lyb);
    }
    var sig = function (c) { return c.tagName + '|' + (typeof c.className === 'string' ? c.className : ''); };
    (function walk(el, depth) {
      var k = kids(el);
      for (var i = 0; i < k.length; i++) {
        var c = k[i], n = 1;
        if (!letters(el)) while (i + n < k.length && sig(k[i + n]) === sig(c)) n++;
        if (n >= 3) {   // a run of look-alike siblings folds into one row
          var run = k.slice(i, i + n), has = run.indexOf(sel) >= 0 || run.some(function (x) { return x.contains(sel); });
          if (has) openRuns.add(c);
          var rr = mk('div', 'r', '', ui.lyb); rr.style.paddingLeft = (4 + depth * 12) + 'px';
          rr.dataset.run = runs.length; runs.push(c);
          var t = mk('span', 'tg', openRuns.has(c) ? '▾' : '▸', rr); t.dataset.tog = '1';
          mk('span', 'ic', '▤', rr); var nmr = mk('span', 'nm', label(c).name.replace(/^(Cover|Item|Text|Link|Group): .*/, '$1s') + ' ×' + n, rr); mk('span', 'k', 'repeated', nmr);
          if (openRuns.has(c)) run.forEach(function (x) { var r = row(x, depth + 1, true); if (x === sel) onRow = r; if (open.has(x)) walk(x, depth + 2); });
          i += n - 1; continue;
        }
        var r = row(c, depth, true); if (c === sel) onRow = r;
        if (open.has(c)) walk(c, depth + 1);
      }
    })(document.body, 0);
    if (onRow) { var b = ui.lyb.getBoundingClientRect(), rr = onRow.getBoundingClientRect(); if (rr.top < b.top || rr.bottom > b.bottom) onRow.scrollIntoView({ block: 'center' }); }
  }
  function row(el, depth, tree) {
    var lb = label(el), has = tree && kids(el).length;
    var r = mk('div', 'r' + (picks().indexOf(el) >= 0 ? ' on' : '') + (hidden(el) ? ' hid' : ''), '', ui.lyb);
    if (lb.group) r.style.fontWeight = '700';
    r.style.paddingLeft = (4 + depth * 12) + 'px'; r.dataset.row = rows.length; rows.push(el);
    var tg = mk('span', 'tg', has ? (open.has(el) ? '▾' : '▸') : '', r); if (has) tg.dataset.tog = '1';
    mk('span', 'ic', lb.group ? '◆' : letters(el) ? 'T' : icon(el), r);
    var nm = mk('span', 'nm', lb.name, r); if (lb.hint) mk('span', 'k', lb.hint, nm);
    if (locked.has(el)) mk('span', 'lk', '🔒', r);
    r.title = selectorFor(el);
    return r;
  }
  function rowOf(e) {
    var p = e.composedPath();
    for (var i = 0; i < p.length && p[i] !== host; i++) {
      if (p[i].dataset && p[i].dataset.row != null) return { el: rows[+p[i].dataset.row], tog: !!(p[0].dataset && p[0].dataset.tog) };
      if (p[i].dataset && p[i].dataset.run != null) return { run: runs[+p[i].dataset.run] };
    }
    return null;
  }

  function render() {
    if (!on) return;
    var all = picks();
    ui.ly.style.display = showLayers && !uiHidden ? 'flex' : 'none'; ui.panel.style.display = uiHidden || !showDesign ? 'none' : ''; ui.bar.style.display = uiHidden ? 'none' : '';
    ui.tmove.className = tool === 'move' && !kTool ? 'on' : ''; ui.tselect.className = tool === 'select' && !kTool ? 'on' : ''; ui.tscale.className = kTool ? 'on' : '';
    ui.players.className = showLayers ? 'on' : ''; ui.pdesign.className = showDesign ? 'on' : '';
    ui.tcomment.className = cmode ? 'on' : ''; if (cmode) { ui.tmove.className = ui.tselect.className = ''; }
    drawNotes();
    if (op && op.kind === 'marquee' && op.started) { var mq = ui.mq.style; mq.display = 'block'; mq.left = Math.min(op.x, op.cx) + 'px'; mq.top = Math.min(op.y, op.cy) + 'px'; mq.width = Math.abs(op.cx - op.x) + 'px'; mq.height = Math.abs(op.cy - op.y) + 'px'; } else ui.mq.style.display = 'none';
    var sig = all.length + '|' + (sel ? 1 : 0);
    if (showLayers && (treeFor !== sel || render.dirty || render.sig !== sig)) { render.dirty = false; render.sig = sig; buildTree(); }
    place(ui.hover, hover && all.indexOf(hover) < 0 ? hover : null);
    while (ui.extra.length < all.length) ui.extra.push(mk('div', 'o x2'));
    ui.extra.forEach(function (d, i) { if (all.length > 1 && all[i]) placeRect(d, rectOf(all[i])); else d.style.display = 'none'; });
    if (all.length > 1) { ui.sel.className = 'o sl many'; placeRect(ui.sel, union(all)); } else { ui.sel.className = 'o sl'; if (sel) placeRect(ui.sel, rectOf(sel)); else place(ui.sel, null); }
    drawGuides(op && op.guides);
    measure(all.length ? union(all) : null, altHeld && all.length ? (hover && all.indexOf(hover) < 0 ? rectOf(hover) : (sel.parentElement ? sel.parentElement.getBoundingClientRect() : null)) : null);
    ui.css.className = fmt === 'css' ? 'on' : ''; ui.json.className = fmt === 'json' ? 'on' : '';
    if (render.n !== undos.length + redos.length * 1000) { render.n = undos.length + redos.length * 1000; if (showLayers && !render.dirty) buildTree(); }
    ui.count.textContent = edits.size ? edits.size + ' edited' : '';
    ui.page.textContent = (location.pathname.split('/').pop() || 'index.html');
    ui.restore.style.display = savedList().length ? '' : 'none';
    ui.layers.textContent = showLayers ? 'Hide  L' : 'Layers  L';
    if (ui.out.style.display !== 'none') ui.out.value = exportAll();
    var focused = root.activeElement && root.activeElement.dataset && root.activeElement.dataset.field;
    if (!sel) {
      ui.selName.textContent = 'Nothing selected'; ui.sTxt.textContent = 'Click anything on the page.'; ui.lyr.textContent = '';
      Object.keys(ui.fields).forEach(function (k) { ui.fields[k].value = ''; ui.fields[k].disabled = true; });
      return;
    }
    if (all.length > 1) {
      var u = union(all), vm = { x: r1(u.left + scrollX), y: r1(u.top + scrollY), w: 'Mixed', h: 'Mixed' };
      ui.badge.textContent = r1(u.width) + ' × ' + r1(u.height);
      ui.selName.textContent = all.length + ' layers'; ui.sTxt.textContent = all.map(function (x) { return label(x).name; }).join(', ');
      ui.lyr.textContent = 'Shift-click to add or remove · ⌘G groups them';
      Object.keys(ui.fields).forEach(function (k) { ui.fields[k].disabled = k === 'w' || k === 'h'; if (focused !== k) ui.fields[k].value = vm[k]; });
      return;
    }
    var rr = rectOf(sel), b = { x: r1(rr.left + scrollX), y: r1(rr.top + scrollY), width: r1(rr.width), height: r1(rr.height) }, v = { x: b.x, y: b.y, w: b.width, h: b.height };
    ui.badge.textContent = b.width + ' × ' + b.height;
    ui.selName.textContent = label(sel).name;
    ui.sTxt.textContent = selectorFor(sel);
    ui.lyr.textContent = layer && layer.n > 1 ? 'Layer ' + (layer.i + 1) + ' of ' + layer.n + ' under the pointer · click again for the next' : '';
    Object.keys(ui.fields).forEach(function (k) { ui.fields[k].disabled = false; if (focused !== k) ui.fields[k].value = v[k]; });
  }

  // ---------- export ----------
  function entry(el, rec) {
    var b = box(el), s = el.style;
    var e = { selector: rec.clone ? selectorFor(el) : rec.selector, x: b.x, y: b.y, width: b.width, height: b.height,
      css: { position: s.position || getComputedStyle(el).position, left: rp(s.left), top: rp(s.top), width: rp(s.width), height: rp(s.height), display: s.display === 'none' ? 'none' : undefined, 'z-index': s.zIndex || undefined, opacity: s.opacity || undefined, transform: s.transform || undefined, visibility: s.visibility || undefined, 'font-size': s.fontSize || undefined } };
    if (rec.clone) { e.clone = true; e.of = rec.of; }
    return e;
  }
  function cssOf(e) {
    var c = e.css, out = [];
    Object.keys(c).forEach(function (k) { if (c[k]) out.push('  ' + k + ': ' + c[k] + ';'); });
    return (e.clone ? '/* new element: a copy of ' + e.of + ' */\n' : '') + e.selector + ' {\n' + out.join('\n') + '\n}  /* page x:' + e.x + ' y:' + e.y + ' w:' + e.width + ' h:' + e.height + ' */';
  }
  function exportAll(f) {
    var list = []; edits.forEach(function (rec, el) { if (el.isConnected) list.push(entry(el, rec)); });
    var vp = innerWidth + ' x ' + innerHeight;
    return (f || fmt) === 'json' ? JSON.stringify(list, null, 2) : '/* viewport ' + vp + ' */\n' + list.map(cssOf).join('\n\n');
  }
  function toast(t) {
    if (!ui.toast) return; ui.toast.textContent = t; ui.toast.className = 'toast show';
    clearTimeout(toast.t); toast.t = setTimeout(function () { ui.toast.className = 'toast'; }, 1600);
  }
  function copyText(t, btn, msg) {
    var done = function () { if (!btn) return toast(msg || 'Copied'); var o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = o; }, 1100); };
    var fallback = function () { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); };
    window.__editModeLastCopy = t;
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
  }

  // ---------- events ----------
  function isUI(e) { return e.composedPath().indexOf(host) !== -1; }
  function pick(e) { var t = e.target; return t && t.nodeType === 1 && t !== document.body && t !== document.documentElement && t !== host ? t : null; }
  // every element under the point, topmost first: the hit-test stack, then boxes that
  // contain the point but don't take the pointer (pointer-events: none canvases etc.)
  function stackAt(x, y, raw) {
    var skip = function (n) { return !n || n.nodeType !== 1 || n === host || n === document.body || n === document.documentElement || host.contains(n) || isLocked(n); };
    var list = document.elementsFromPoint(x, y).filter(function (n) { return !skip(n); });
    var all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var n = all[i]; if (skip(n) || list.indexOf(n) >= 0) continue;
      var r = n.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      var cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      // paint order guess: it sits just above the nearest ancestor that is already in the stack
      var at = -1; for (var j = 0; j < list.length; j++) if (list[j].contains(n)) { at = j; break; }
      if (at < 0) list.push(n); else list.splice(at, 0, n);
    }
    // layers a page marks with data-edit-layer (e.g. the hero's Dragon) come first wherever they cover the point
    var pri = list.filter(function (n) { return n.hasAttribute('data-edit-layer'); });
    if (pri.length) list = pri.concat(list.filter(function (n) { return pri.indexOf(n) < 0; }));
    memo = new Map();
    if (raw) return list;
    var out = [];
    list.forEach(function (n) {
      var g = groupOf(n), m = g ? g.lead : (lettersTop(n) || n);
      if (out.indexOf(m) < 0) out.push(m);
    });
    return out;
  }
  function block(e) { if (!isUI(e)) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } }

  function onDown(e) {
    if (e.button !== 0) return;
    var path = e.composedPath(), t = path[0];
    if (isUI(e)) {
      if (t.dataset && t.dataset.dir && sel) {
        e.preventDefault(); op = sizeOp(sel, t.dataset.dir, e.clientX, e.clientY, false);
      }
      return;
    }
    block(e);
    if (sHeld) {
      var tgt = sel || stackAt(e.clientX, e.clientY)[0]; if (!tgt) return;
      if (tgt !== sel) multi = []; sel = tgt; op = sizeOp(tgt, 'se', e.clientX, e.clientY, true);
      render(); return;
    }
    if (cmode) {   // comment mode: a click pins a note, a drag draws
      op = { kind: 'draw', x: e.clientX, y: e.clientY, pts: [[e.clientX + scrollX, e.clientY + scrollY]], started: false };
      render(); return;
    }
    if (tool === 'select') {   // select tool: a drag draws a box, a click picks; nothing moves
      op = { kind: 'marquee', x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, add: e.shiftKey, base: picks(), started: false, deep: e.metaKey || e.ctrlKey };
      render(); return;
    }
    var stack = stackAt(e.clientX, e.clientY, e.metaKey || e.ctrlKey); if (!stack.length) { if (!e.shiftKey) setSel([]); layerStack = null; render.dirty = true; render(); return; }
    var cur = picks(), hit = null;
    for (var hi = 0; hi < stack.length && !hit; hi++) if (cur.indexOf(stack[hi]) >= 0) hit = stack[hi];
    if (e.shiftKey || (hit && cur.length > 1)) {
      var tgl = e.shiftKey ? (hit || stack[0]) : null;
      if (e.shiftKey && !hit) toggleSel(tgl);
      layerStack = stack; render.dirty = true; var mv = movers();
      op = { kind: 'move', picks: picks(), x: e.clientX, y: e.clientY, el: tgl || hit, els: mv, started: false, lx: 0, ly: 0, stack: stack, again: false,
        unpick: e.shiftKey && hit ? hit : null, only: !e.shiftKey ? hit : null, before: mv.map(snap) };
      render(); return;
    }
    multi = [];
    var at = sel ? stack.indexOf(sel) : -1;
    // pressing on the current selection drags it; a press that doesn't move steps to the next layer (on release)
    var el = at >= 0 ? sel : stack[0];
    sel = el; hover = null; layer = { i: stack.indexOf(el), n: stack.length }; layerStack = stack; render.dirty = true;
    var els = together(el);
    op = { kind: 'move', picks: [el], x: e.clientX, y: e.clientY, el: el, els: els, started: false, lx: 0, ly: 0, stack: stack, again: at >= 0, back: e.altKey, before: els.map(snap) };
    render();
  }
  function onMove(e) {
    if (!op) {
      var el = isUI(e) ? (rowOf(e) || {}).el || null : (stackAt(e.clientX, e.clientY)[0] || pick(e));
      if (el !== hover || altHeld !== e.altKey) { hover = el; altHeld = e.altKey; render(); }
      return;
    }
    e.preventDefault();
    var dx = e.clientX - op.x, dy = e.clientY - op.y;
    if (op.kind === 'draw') {
      if (!op.started && Math.abs(dx) + Math.abs(dy) < 4) return;
      op.started = true; var lp = op.pts[op.pts.length - 1], px = e.clientX + scrollX, py = e.clientY + scrollY;
      if (Math.abs(px - lp[0]) + Math.abs(py - lp[1]) >= 3) op.pts.push([px, py]);
      render(); return;
    }
    if (op.kind === 'marquee') {
      op.cx = e.clientX; op.cy = e.clientY;
      if (!op.started && Math.abs(dx) + Math.abs(dy) < 3) return;
      if (!op.started) { op.started = true; op.items = boxItems(op.deep); }
      var L = Math.min(op.x, op.cx), T = Math.min(op.y, op.cy), R = Math.max(op.x, op.cx), B = Math.max(op.y, op.cy);
      var got = op.items.filter(function (it) { return it.r.left >= L && it.r.right <= R && it.r.top >= T && it.r.bottom <= B; }).map(function (it) { return it.el; });
      got = got.filter(function (x) { return !got.some(function (y) { return y !== x && y.contains(x); }); });   // the outermost layers in the box
      var list = op.add ? op.base.slice() : []; got.forEach(function (x) { if (list.indexOf(x) < 0) list.push(x); });
      setSel(list); render(); return;
    }
    if (op.kind === 'move') {
      if (!op.started && Math.abs(dx) + Math.abs(dy) < 3) return;
      op.started = true;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (!op.base) { op.base = union(op.picks || picks()); op.cand = candidates(op.els); }
      var sn = e.metaKey || e.ctrlKey ? { dx: 0, dy: 0, g: [] } : snapTo(op.base, dx, dy, op.cand, e.shiftKey ? (dy === 0 ? 'x' : 'y') : null);
      dx += sn.dx; dy += sn.dy; op.guides = sn.g;
      op.els.forEach(function (x) { moveBy(x, dx - op.lx, dy - op.ly); }); op.lx = dx; op.ly = dy; refresh(op.els);
    } else {
      var d = op.dir, s = op.el.style, w, h, l, tp;
      if (op.text) {   // type: scale the font from the opposite corner (S/K: from the top left; Option: from the centre)
        var gx = op.scale ? 1 : /e/.test(d) ? 1 : -1, gy = op.scale ? 1 : /s/.test(d) ? 1 : -1;
        var ft = Math.max(0.1, 1 + (gx * dx + gy * dy) / (op.w + op.h) * (e.altKey ? 2 : 1));
        s.fontSize = r1(Math.max(4, op.fs * ft)) + 'px';
        if (op.sw) s.width = op.sw * ft + 'px'; if (op.sh) s.height = op.sh * ft + 'px';
        var nr = op.el.getBoundingClientRect();
        if (e.altKey) { l = op.l - (nr.width - op.w) / 2; tp = op.t - (nr.height - op.h) / 2; }
        else { l = !op.scale && /w/.test(d) ? op.l + op.w - nr.width : op.l; tp = !op.scale && /n/.test(d) ? op.t + op.h - nr.height : op.t; }
        s.left = l + 'px'; s.top = tp + 'px'; refresh([op.el]); render(); return;
      }
      if (op.scale) {   // hold S + drag: scale proportionally (right/down grows)
        var f = Math.max(0.05, 1 + (dx + dy) / (op.w + op.h));
        w = op.w * f; h = op.h * f;
      } else {
        var sx = /e/.test(d) ? 1 : /w/.test(d) ? -1 : 0, sy = /s/.test(d) ? 1 : /n/.test(d) ? -1 : 0, m2 = e.altKey ? 2 : 1;
        w = Math.max(4, op.w + sx * dx * m2); h = Math.max(4, op.h + sy * dy * m2);
        if (e.shiftKey) {   // keep proportions, like Figma
          var r0 = op.w / op.h;
          if (!sy || (sx && Math.abs(w / op.w - 1) >= Math.abs(h / op.h - 1))) h = w / r0; else w = h * r0;
        }
      }
      w = Math.max(4, w); h = Math.max(4, h);
      var fromC = op.scale ? e.altKey : e.altKey;
      if (fromC) { l = op.l - (w - op.w) / 2; tp = op.t - (h - op.h) / 2; }
      else {
        var dd = op.scale ? 'se' : d;
        l = /w/.test(dd) ? op.l + (op.w - w) : op.l;
        tp = /n/.test(dd) ? op.t + (op.h - h) : op.t;
        if (!op.scale && !/[ew]/.test(dd) && e.shiftKey) l = op.l - (w - op.w) / 2;   // edge handles grow both ways sideways
        if (!op.scale && !/[ns]/.test(dd) && e.shiftKey) tp = op.t - (h - op.h) / 2;
      }
      s.width = Math.max(4, w) + 'px'; s.height = Math.max(4, h) + 'px'; s.left = l + 'px'; s.top = tp + 'px'; refresh([op.el]);
    }
    render();
  }
  function onUp(e) {
    if (op && op.kind === 'draw') {
      var dop = op; op = null;
      if (!dop.started) { var t0 = stackAt(dop.x, dop.y)[0], nn; var ne = notesChange('note', function () { nn = newNote(dop.pts[0], t0, null); curNote = nn; }); if (ne) ne.added = nn; openNote(nn); }
      else { var st = stroke(dop.pts); notesChange('drawing', function () { if (curNote) curNote.strokes.push(st); else curNote = newNote(dop.pts[dop.pts.length - 1], null, st); }); openNote(curNote); }
      render(); if (!isUI(e)) block(e); return;
    }
    if (op && op.kind === 'marquee') {
      if (!op.started) {   // a click with the select tool: pick the top layer (⇧ adds or removes)
        var hit = stackAt(op.x, op.y, op.deep)[0];
        if (op.add) { if (hit) toggleSel(hit); } else setSel(hit ? [hit] : []);
      }
      op = null; render(); if (!isUI(e)) block(e); return;
    }
    if (op) {
      if (op.kind === 'resize' || op.started) commit(op.kind, op.before);
      else if (op.unpick) toggleSel(op.unpick);
      else if (op.only) setSel([op.only]);
      else if (op.again && op.stack.length > 1) { // click again in place: next layer down (Alt: back up)
        var i = (op.stack.indexOf(op.el) + (op.back ? -1 : 1) + op.stack.length) % op.stack.length;
        sel = op.stack[i]; multi = []; layer = { i: i, n: op.stack.length }; render.dirty = true;
      }
      op = null; render();
    }
    if (!isUI(e)) block(e);
  }
  function onClick(e) {
    if (passthru && e.target === passthru) return; // our own download link
    if (!isUI(e)) return block(e);
    var rw = rowOf(e);
    if (rw && rw.run) { if (openRuns.has(rw.run)) openRuns.delete(rw.run); else openRuns.add(rw.run); render.dirty = true; render(); return; }
    if (rw && rw.el) {
      if (rw.tog) { if (open.has(rw.el)) open.delete(rw.el); else open.add(rw.el); render.dirty = true; }
      else if (e.shiftKey) toggleSel(rw.el);
      else { sel = rw.el; multi = []; layer = layerStack ? { i: layerStack.indexOf(sel), n: layerStack.length } : null; if (layer && layer.i < 0) layer = null; render.dirty = true; }
      render(); return;
    }
    var t = e.composedPath()[0];
    if (t.dataset && t.dataset.note != null) { openNote(notes[+t.dataset.note]); render(); return; }
    var act = t.dataset && t.dataset.act; if (!act) return;
    if (act === 'tcomment') setComment(!cmode);
    if (act === 'ndone') closeNote();
    if (act === 'ndel' && curNote) { notesChange('delete note', function () { notes.splice(notes.indexOf(curNote), 1); curNote = null; }); ui.pop.style.display = 'none'; }
    if (act === 'ncopy') { if (curNote) closeNote(); copyText(notesText(), t, 'Copied ' + notes.length + ' notes for AI'); }
    if (act === 'nsave') saveNotes();
    if (act === 'nclear' && notes.length && confirm('Clear all ' + notes.length + ' notes on this page?')) { notesChange('clear notes', function () { notes = []; curNote = null; }); ui.pop.style.display = 'none'; }
    if (act === 'layers' || act === 'players') { showLayers = !showLayers; render.dirty = true; }
    if (act === 'design' || act === 'pdesign') showDesign = !showDesign;
    if (act === 'tmove' || act === 'tselect') setTool(act === 'tmove' ? 'move' : 'select');
    if (act === 'tscale') { kTool = !kTool; sHeld = kTool; document.documentElement.style.cursor = kTool ? 'nwse-resize' : ''; }
    if (act === 'copy' && sel) { var b = box(sel); copyText(selectorFor(sel) + '  x: ' + b.x + 'px, y: ' + b.y + 'px, width: ' + b.width + 'px, height: ' + b.height + 'px\n' + (edits.has(sel) ? cssOf(entry(sel, edits.get(sel))) : ''), t); }
    if (act === 'all') { ui.out.style.display = 'block'; ui.out.value = exportAll(); copyText(ui.out.value, t); }
    if (act === 'css' || act === 'json') { fmt = act; ui.out.style.display = 'block'; }
    if (act === 'reset') reset();
    if (act === 'save') save();
    if (act === 'restore') restoreSaved();
    if (act === 'off') disable();
    render();
  }
  // ---------- comments for AI: pinned notes and drawings, in page px ----------
  function setComment(v) {
    cmode = v; if (!v && curNote) closeNote(); if (v) { kTool = sHeld = false; showDesign = true; }
    document.documentElement.style.cursor = v ? 'crosshair' : tool === 'select' ? 'crosshair' : '';
    toast(v ? 'Comment: click a part to pin a note, drag to draw (⌘K or Esc to stop)' : 'Comment mode off');
  }
  function describe(el) { if (!el) return null; var b = box(el); return { name: label(el).name, selector: selectorFor(el), box: [b.x, b.y, b.width, b.height] }; }
  function newNote(pt, el, st) {
    if (!el) { var c = st ? [st.box[0] + st.box[2] / 2, st.box[1] + st.box[3] / 2] : pt; el = stackAt(c[0] - scrollX, c[1] - scrollY)[0]; }
    var n = { x: Math.round(pt[0]), y: Math.round(pt[1]), on: describe(el), text: '', strokes: st ? [st] : [] };
    notes.push(n); keepNotes(); return n;
  }
  function stroke(pts) {
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var bx = [Math.min.apply(0, xs), Math.min.apply(0, ys)]; bx.push(Math.max.apply(0, xs) - bx[0], Math.max.apply(0, ys) - bx[1]);
    var over = [], step = Math.max(1, Math.floor(pts.length / 12));
    for (var i = 0; i < pts.length; i += step) { var el = stackAt(pts[i][0] - scrollX, pts[i][1] - scrollY)[0]; if (el) { var nm2 = label(el).name; if (over.indexOf(nm2) < 0) over.push(nm2); } }
    return { box: bx.map(Math.round), d: pts.map(function (p, j) { return (j ? 'L' : 'M') + Math.round(p[0]) + ' ' + Math.round(p[1]); }).join(' '), over: over.slice(0, 6) };
  }
  function openNote(n) { curNote = n; ui.popTa.value = n.text; ui.popT.textContent = (notes.indexOf(n) + 1) + ' · on ' + (n.on ? n.on.name : 'the page'); ui.pop.style.display = 'block'; ui.popTa.focus(); setTimeout(function () { if (curNote === n) ui.popTa.focus(); }, 0); }
  function closeNote() { if (curNote && !curNote.text.trim() && !curNote.strokes.length) { notes.splice(notes.indexOf(curNote), 1); var top = undos[undos.length - 1]; if (top && top.added === curNote) undos.pop(); } curNote = null; ui.pop.style.display = 'none'; keepNotes(); }
  // comment changes go on the same ⌘Z history as layer edits
  function notesChange(kind, fn) {
    var b4 = JSON.stringify(notes), ci = curNote ? notes.indexOf(curNote) : -1; fn();
    var af = JSON.stringify(notes), ai = curNote ? notes.indexOf(curNote) : -1; keepNotes();
    if (b4 === af) return null;
    var e = { kind: kind, notes: true, undoSels: picks(), redoSels: picks(), undo: function () { setNotes(b4, ci); }, redo: function () { setNotes(af, ai); } };
    push(e); lastDraw = Date.now(); return e;
  }
  function setNotes(js, i) { var was = notes; notes = JSON.parse(js); if (was.length === notes.length) notes.forEach(function (n, k) { n.text = was[k].text; });   // words typed since stay
    curNote = null; ui.pop.style.display = 'none'; keepNotes(); if (i >= 0 && notes[i]) openNote(notes[i]); }
  function keepNotes() { try { localStorage.setItem(NKEY, JSON.stringify(notes)); } catch (e) {} }
  function loadNotes() { try { notes = JSON.parse(localStorage.getItem(NKEY) || '[]'); } catch (e) { notes = []; } }
  function drawNotes() {
    var show = on, h = '';
    ui.g.setAttribute('transform', 'translate(' + -scrollX + ' ' + -scrollY + ')');
    notes.forEach(function (n) { n.strokes.forEach(function (st) { h += '<path' + (n === curNote ? ' class="cur"' : '') + ' d="' + st.d + '"/>'; }); });
    if (op && op.kind === 'draw' && op.started) h += '<path class="cur" d="' + op.pts.map(function (p, j) { return (j ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ') + '"/>';
    ui.g.innerHTML = show ? h : '';
    while (ui.pins.children.length > notes.length) ui.pins.lastChild.remove();
    notes.forEach(function (n, i) {
      var d = ui.pins.children[i] || mk('div', 'pin', '', ui.pins); d.textContent = i + 1; d.dataset.note = i; d.className = 'pin' + (n === curNote ? ' cur' : '');
      d.style.left = (n.x - scrollX) + 'px'; d.style.top = (n.y - scrollY) + 'px'; d.style.display = show ? '' : 'none';
    });
    if (curNote) { var px = Math.min(innerWidth - 270, Math.max(250, curNote.x - scrollX + 16)), py = Math.min(innerHeight - 150, Math.max(8, curNote.y - scrollY - 10)); ui.pop.style.left = px + 'px'; ui.pop.style.top = py + 'px'; ui.pop.style.display = 'block'; } else ui.pop.style.display = 'none';
    if (ui.nlist) ui.nlist.innerHTML = notes.length ? notes.map(function (n, i) { return '<b>' + (i + 1) + '</b> ' + (n.text || '(no words)').replace(/[<&]/g, '') + (n.strokes.length ? ' ✎' : ''); }).join('<br>') : 'None yet. ⌘K, then click a part or draw on the page.';
  }
  function notesText() {
    var out = ['Comments on ' + (location.pathname.split('/').pop() || 'index.html') + ' (viewport ' + innerWidth + ' x ' + innerHeight + '; page px, from the top left of the page)'];
    notes.forEach(function (n, i) {
      out.push('', (i + 1) + '. "' + (n.text || '').trim() + '"');
      if (n.on) out.push('   on: ' + n.on.name + '  (' + n.on.selector + ', box x ' + n.on.box[0] + ' y ' + n.on.box[1] + ' w ' + n.on.box[2] + ' h ' + n.on.box[3] + ')');
      out.push('   pin at x ' + n.x + ' y ' + n.y);
      n.strokes.forEach(function (st, j) { out.push('   drawing ' + (j + 1) + ': covers x ' + st.box[0] + ' y ' + st.box[1] + ' w ' + st.box[2] + ' h ' + st.box[3] + ', over ' + (st.over.join(', ') || 'nothing') + '', '     path: ' + st.d); });
    });
    return out.join('\n');
  }
  function saveNotes() {
    if (curNote) closeNote(); if (!notes.length) return toast('No notes yet');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + document.documentElement.scrollWidth + '" height="' + document.documentElement.scrollHeight + '"><g fill="none" stroke="#f24822" stroke-width="3">' + notes.map(function (n) { return n.strokes.map(function (st) { return '<path d="' + st.d + '"/>'; }).join(''); }).join('') + '</g>' + notes.map(function (n, i) { return '<circle cx="' + n.x + '" cy="' + (n.y - 12) + '" r="12" fill="#f24822"/><text x="' + n.x + '" y="' + (n.y - 8) + '" fill="#fff" font-size="12" text-anchor="middle" font-family="sans-serif">' + (i + 1) + '</text>'; }).join('') + '</svg>';
    var text = notesText(); copyText(text, null, 'Copied');
    if (!window.fetch) return toast('Copied ' + notes.length + ' notes');
    fetch('/__edit-mode/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: location.pathname, text: text, svg: svg, notes: notes, viewport: [innerWidth, innerHeight] }) })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { toast('Saved ' + notes.length + ' notes to ' + j.file + ' (and copied)'); }, function () { toast('Copied ' + notes.length + ' notes (no server to save to)'); });
  }
  function setTool(t) {
    tool = t; cmode = false; if (curNote) closeNote(); if (kTool) { kTool = sHeld = false; } document.documentElement.style.cursor = t === 'select' ? 'crosshair' : '';
    toast(t === 'select' ? 'Select tool: drag a box to select (V to move again)' : 'Move tool: drag moves layers');
  }
  function onKey(e) {
    var a = document.activeElement; if (a === host && root) a = root.activeElement || a;
    var typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
    if (typing) return;
    var c = e.code || '', k0 = (e.key || '').toLowerCase(), fn = null;
    if (on && e.key === 'Alt') { altHeld = true; render(); }
    if (e.metaKey || e.ctrlKey) {
      if (!on) return;
      if (k0 === 'k' && !e.shiftKey) fn = function () { setComment(!cmode); };
      else if (e.altKey && c === 'KeyC') fn = copyProps;
      else if (e.altKey && c === 'KeyV') fn = pasteProps;
      else if (c === 'BracketRight') fn = function () { zMove(e.altKey ? 'bring to front' : 'bring forward'); };
      else if (c === 'BracketLeft') fn = function () { zMove(e.altKey ? 'send to back' : 'send backward'); };
      else if (e.ctrlKey && e.altKey && c === 'KeyH') fn = function () { distribute('h'); };
      else if (e.ctrlKey && e.altKey && c === 'KeyV') fn = function () { distribute('v'); };
      else if (k0 === 'z') fn = e.shiftKey ? redo : undo;
      else if (k0 === 'y') fn = redo;
      else if (k0 === 's') fn = save;
      else if (k0 === 'a') fn = selectAll;
      else if (k0 === 'g') fn = e.shiftKey ? ungroupSel : groupSel;
      else if (k0 === 'h' && e.shiftKey) fn = showHide;
      else if (k0 === 'l' && e.shiftKey) fn = lockToggle;
      else if (k0 === 'r') fn = rename;
      else if (c === 'Backslash') fn = function () { uiHidden = !uiHidden; toast(uiHidden ? 'Panels hidden (⌘\\ shows them)' : 'Panels shown'); };
      else if (k0 === 'c' && sel) fn = function () { copySel(false); };
      else if (k0 === 'x' && sel) fn = function () { copySel(true); };
      else if (k0 === 'v') fn = paste;
      else if (k0 === 'd' && sel) fn = duplicate;
      if (fn) { e.preventDefault(); e.stopPropagation(); fn(); render(); }
      return;
    }
    if (e.altKey) {
      if (!on) return;
      var al = { KeyA: 'left', KeyD: 'right', KeyW: 'top', KeyS: 'bottom', KeyH: 'hcenter', KeyV: 'vcenter' }[c];
      if (al && e.shiftKey && (c === 'KeyH' || c === 'KeyV')) { e.preventDefault(); distribute(c === 'KeyH' ? 'h' : 'v'); render(); return; }
      if (al) { e.preventDefault(); align(al); render(); }
      return;
    }
    if ((e.key === 'e' || e.key === 'E') && !e.shiftKey) { e.preventDefault(); toggle(); return; }
    if (!on) return;
    if (e.shiftKey && c === 'KeyH') { e.preventDefault(); flip('h'); render(); return; }
    if (e.shiftKey && c === 'KeyV') { e.preventDefault(); flip('v'); render(); return; }
    if (e.shiftKey && c === 'Digit2') { e.preventDefault(); zoomTo(); return; }
    if ((e.key === 's' || e.key === 'S') && !e.repeat) { sHeld = true; document.documentElement.style.cursor = 'nwse-resize'; toast('Scale: drag to resize (⌥ from the centre)'); return; }
    if (k0 === 'v' && !e.shiftKey) { setTool('move'); render(); return; }
    if (k0 === 'm' && !e.shiftKey) { setTool(tool === 'select' ? 'move' : 'select'); render(); return; }
    if (k0 === 'd' && !e.shiftKey) { showDesign = !showDesign; toast(showDesign ? 'Design panel shown' : 'Design panel hidden (D shows it)'); render(); return; }
    if (k0 === 'k') { kTool = !kTool; sHeld = kTool; document.documentElement.style.cursor = kTool ? 'nwse-resize' : ''; toast(kTool ? 'Scale tool on (K again to stop)' : 'Scale tool off'); return; }
    if (/^Digit\d$/.test(c) && !e.shiftKey && picks().length) { e.preventDefault(); var dg = +c.slice(5); opacity(dg === 0 ? 1 : dg / 10); render(); return; }
    if (e.key === 'l' || e.key === 'L') { showLayers = !showLayers; render.dirty = true; render(); return; }
    if ((e.key === 'Backspace' || e.key === 'Delete') && sel) { e.preventDefault(); hide(); render(); return; }
    if (e.key === 'Escape' && cmode) { e.preventDefault(); if (curNote) closeNote(); else setComment(false); render(); return; }
    if (e.key === 'Escape') { e.preventDefault(); if (kTool) { kTool = sHeld = false; document.documentElement.style.cursor = ''; } else if (sel) { setSel([]); render(); } else disable(); return; }
    if (e.key === 'Tab' && sel) { e.preventDefault(); stepSibling(e.shiftKey ? -1 : 1); render(); return; }
    if (e.key === 'Enter' && sel) { e.preventDefault(); if (e.shiftKey) selectParent(); else selectChildren(); render(); return; }
    if (e.key === '\\' && sel) { e.preventDefault(); selectParent(); render(); return; }
    var k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if ((e.key === 'p' || e.key === 'P') && sel) { selectParent(); render(); return; }
    if (k && sel) { e.preventDefault(); var m = e.shiftKey ? 10 : 1, ge = movers(), b0 = ge.map(snap); ge.forEach(function (x) { moveBy(x, k[0] * m, k[1] * m); }); commit('nudge', b0); refresh(ge); render(); }
  }
  var evs = [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['click', onClick],
    ['mousedown', block], ['mouseup', block], ['dblclick', block], ['dragstart', block], ['contextmenu', block], ['auxclick', block]];
  var redraw = function () { render(); };

  function enable() {
    if (on) return; on = true;
    if (!host) build();
    if (tool === 'select') document.documentElement.style.cursor = 'crosshair';
    loadNotes();
    loadNames();
    document.documentElement.appendChild(host);
    evs.forEach(function (p) { window.addEventListener(p[0], p[1], true); });
    addEventListener('scroll', redraw, true); addEventListener('resize', redraw);
    host._ta = document.documentElement.style.touchAction; document.documentElement.style.touchAction = 'none';
    render();
  }
  function disable() {
    if (!on) return; on = false; op = null; sel = null; multi = []; hover = null; layer = null; kTool = sHeld = altHeld = false; document.documentElement.style.cursor = ''; if (curNote) closeNote(); cmode = false;
    evs.forEach(function (p) { window.removeEventListener(p[0], p[1], true); });
    removeEventListener('scroll', redraw, true); removeEventListener('resize', redraw);
    document.documentElement.style.touchAction = host._ta || '';
    host.remove();
  }
  function toggle() { on ? disable() : enable(); }
  function reset() {
    var before = [], clones = [];
    edits.forEach(function (rec, el) { before.push(snap(el)); if (rec.clone) clones.push({ el: el, parent: el.parentNode, next: el.nextSibling }); });
    edits.forEach(function (rec, el) { if (rec.orig == null) el.removeAttribute('style'); else el.setAttribute('style', rec.orig); delete el._emSized; });
    edits.clear(); clones.forEach(function (c) { c.el.remove(); });
    if (ui.out) ui.out.value = '';
    if (before.length) push({ kind: 'reset', sel: null, undoSel: null, redoSel: null,
      undo: function () { clones.forEach(function (c) { if (c.parent) c.parent.insertBefore(c.el, c.next && c.next.parentNode === c.parent ? c.next : null); }); restore(before); },
      redo: function () { before.forEach(function (b) { var r = b.rec; if (r.orig == null) b.el.removeAttribute('style'); else b.el.setAttribute('style', r.orig); delete b.el._emSized; }); edits.clear(); clones.forEach(function (c) { c.el.remove(); }); } });
    sel = null; multi = []; layer = null;
  }

  window.addEventListener('keydown', onKey, true);
  var sUp = function (e) { if (e && (e.key === 'Alt' || e.type === 'blur') && altHeld) { altHeld = false; render(); } if (kTool) return; if (!e || e.type === 'blur' || e.key === 's' || e.key === 'S' || e.key === 'Meta') { if (sHeld) { sHeld = false; document.documentElement.style.cursor = ''; } } };
  window.addEventListener('keyup', sUp, true); window.addEventListener('blur', sUp);
  var EditModeAPI = window.EditMode = { toggle: toggle, enable: enable, disable: disable, reset: reset, isOn: function () { return on; },
    undo: function () { undo(); render(); }, redo: function () { redo(); render(); }, save: save, selectorFor: selectorFor,
    getEdits: function () { var l = []; edits.forEach(function (rec, el) { if (el.isConnected) l.push(entry(el, rec)); }); return l; },
    export: function (f) { return exportAll(f || fmt); } };
})();
