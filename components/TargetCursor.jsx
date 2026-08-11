/* global React, gsap */
/*
  TargetCursor — a spinning corner-bracket cursor that locks onto interactive elements.
  Adapted from React Bits (https://reactbits.dev) to this site's no-build globals pattern:
  ESM imports removed (gsap + React hooks are globals, CSS lives in styles.css), recolored
  to the Lit Archive brand (signal-blue brackets + glow, cloud-white dot), idle spin gated
  by prefers-reduced-motion, and returns null on touch devices. Exposed as window.TargetCursor.
*/
const getContainingBlock = function (element) {
  let node = element && element.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (
      style.transform !== 'none' ||
      style.perspective !== 'none' ||
      style.filter !== 'none' ||
      style.willChange.indexOf('transform') !== -1 ||
      style.willChange.indexOf('perspective') !== -1 ||
      style.willChange.indexOf('filter') !== -1 ||
      /paint|layout|strict|content/.test(style.contain)
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

const getContainingBlockOffset = function (block) {
  if (!block) return { x: 0, y: 0 };
  const rect = block.getBoundingClientRect();
  return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
};

function TargetCursor(props) {
  const p = props || {};
  const targetSelector = p.targetSelector || '.cursor-target';
  const spinDuration = p.spinDuration != null ? p.spinDuration : 2;
  const hideDefaultCursor = p.hideDefaultCursor != null ? p.hideDefaultCursor : true;
  const hoverDuration = p.hoverDuration != null ? p.hoverDuration : 0.2;
  const parallaxOn = p.parallaxOn != null ? p.parallaxOn : true;

  const { useEffect, useRef, useCallback, useMemo } = React;

  const cursorRef = useRef(null);
  const cornersRef = useRef(null);
  const spinTl = useRef(null);
  const dotRef = useRef(null);
  const containingBlockRef = useRef(null);

  const isActiveRef = useRef(false);
  const targetCornerPositionsRef = useRef(null);
  const tickerFnRef = useRef(null);
  const activeStrengthRef = useRef(0);

  const isMobile = useMemo(function () {
    if (typeof window === 'undefined') return false;
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const isSmallScreen = window.innerWidth <= 768;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(String(userAgent).toLowerCase());
    return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
  }, []);

  const constants = useMemo(function () { return { borderWidth: 2, cornerSize: 12 }; }, []);

  useEffect(function () {
    if (isMobile || !cursorRef.current || typeof gsap === 'undefined') return;

    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) document.body.style.cursor = 'none';

    const cursor = cursorRef.current;
    cornersRef.current = cursor.querySelectorAll('.target-cursor-corner');

    containingBlockRef.current = getContainingBlock(cursor);
    const getOffset = function () { return getContainingBlockOffset(containingBlockRef.current); };

    let activeTarget = null;
    let currentLeaveHandler = null;
    let resumeTimeout = null;

    const cleanupTarget = function (target) {
      if (currentLeaveHandler) target.removeEventListener('mouseleave', currentLeaveHandler);
      currentLeaveHandler = null;
    };

    const initialOffset = getOffset();
    gsap.set(cursor, {
      xPercent: -50, yPercent: -50,
      x: window.innerWidth / 2 - initialOffset.x,
      y: window.innerHeight / 2 - initialOffset.y
    });

    // Smooth pointer follow: one reusable tween (quickTo) instead of a fresh gsap.to per
    // mousemove — far cheaper and visibly smoother on heavy pages (BorderGlow + ScrollStack).
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.2, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.2, ease: 'power3' });

    // Corners are driven by quickSetters + a JS lerp in the ticker (no per-frame tweens).
    const cornerEls = Array.prototype.slice.call(cornersRef.current);
    const cornerSetX = cornerEls.map(function (c) { return gsap.quickSetter(c, 'x', 'px'); });
    const cornerSetY = cornerEls.map(function (c) { return gsap.quickSetter(c, 'y', 'px'); });
    let cornerCur = cornerEls.map(function (c) {
      return { x: Number(gsap.getProperty(c, 'x')) || 0, y: Number(gsap.getProperty(c, 'y')) || 0 };
    });

    const createSpinTimeline = function () {
      if (reduced) return;
      if (spinTl.current) spinTl.current.kill();
      spinTl.current = gsap.timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    };
    createSpinTimeline();

    const tickerFn = function () {
      if (!activeTarget || !cursorRef.current) return;
      // Recompute the target rect each frame so the brackets stay glued even when the
      // card moves (ScrollStack transforms the standout cards). getBoundingClientRect is a
      // read; quickSetter writes transforms only (no forced layout).
      const off = getOffset();
      const rect = activeTarget.getBoundingClientRect();
      const bw = constants.borderWidth, cs = constants.cornerSize;
      const tgt = [
        { x: rect.left - bw - off.x, y: rect.top - bw - off.y },
        { x: rect.right + bw - cs - off.x, y: rect.top - bw - off.y },
        { x: rect.right + bw - cs - off.x, y: rect.bottom + bw - cs - off.y },
        { x: rect.left - bw - off.x, y: rect.bottom + bw - cs - off.y }
      ];
      const cursorX = Number(gsap.getProperty(cursorRef.current, 'x'));
      const cursorY = Number(gsap.getProperty(cursorRef.current, 'y'));
      const k = parallaxOn ? 0.25 : 0.45; // per-frame lerp toward target (smoothing)
      for (let i = 0; i < cornerEls.length; i++) {
        cornerCur[i].x += ((tgt[i].x - cursorX) - cornerCur[i].x) * k;
        cornerCur[i].y += ((tgt[i].y - cursorY) - cornerCur[i].y) * k;
        cornerSetX[i](cornerCur[i].x);
        cornerSetY[i](cornerCur[i].y);
      }
    };
    tickerFnRef.current = tickerFn;

    const moveHandler = function (e) {
      const o = getOffset();
      xTo(e.clientX - o.x);
      yTo(e.clientY - o.y);
    };
    window.addEventListener('mousemove', moveHandler);

    const scrollHandler = function () {
      if (!activeTarget || !cursorRef.current) return;
      const off = getOffset();
      const mouseX = gsap.getProperty(cursorRef.current, 'x') + off.x;
      const mouseY = gsap.getProperty(cursorRef.current, 'y') + off.y;
      const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      const isStillOverTarget = elementUnderMouse &&
        (elementUnderMouse === activeTarget || elementUnderMouse.closest(targetSelector) === activeTarget);
      if (!isStillOverTarget && currentLeaveHandler) currentLeaveHandler();
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    const mouseDownHandler = function () {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 });
    };
    const mouseUpHandler = function () {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 1, duration: 0.2 });
    };
    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);

    const enterHandler = function (e) {
      const directTarget = e.target;
      const allTargets = [];
      let current = directTarget;
      while (current && current !== document.body) {
        if (current.matches && current.matches(targetSelector)) allTargets.push(current);
        current = current.parentElement;
      }
      const target = allTargets[0] || null;
      if (!target || !cursorRef.current || !cornersRef.current) return;
      if (activeTarget === target) return;
      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }

      activeTarget = target;
      cornerEls.forEach(function (corner) { gsap.killTweensOf(corner); });

      gsap.killTweensOf(cursorRef.current, 'rotation');
      spinTl.current && spinTl.current.pause();
      gsap.set(cursorRef.current, { rotation: 0 });

      isActiveRef.current = true;
      // Start the lerp from the corners' current positions, then the ticker animates them
      // onto the (live) target rect — one smooth interpolation, no competing tweens.
      cornerCur = cornerEls.map(function (c) {
        return { x: Number(gsap.getProperty(c, 'x')) || 0, y: Number(gsap.getProperty(c, 'y')) || 0 };
      });
      gsap.ticker.add(tickerFnRef.current);

      const leaveHandler = function () {
        gsap.ticker.remove(tickerFnRef.current);
        isActiveRef.current = false;
        targetCornerPositionsRef.current = null;
        gsap.set(activeStrengthRef, { current: 0, overwrite: true });
        activeTarget = null;

        if (cornersRef.current) {
          const cs = Array.prototype.slice.call(cornersRef.current);
          gsap.killTweensOf(cs);
          const cornerSize2 = constants.cornerSize;
          const positions = [
            { x: -cornerSize2 * 1.5, y: -cornerSize2 * 1.5 },
            { x: cornerSize2 * 0.5, y: -cornerSize2 * 1.5 },
            { x: cornerSize2 * 0.5, y: cornerSize2 * 0.5 },
            { x: -cornerSize2 * 1.5, y: cornerSize2 * 0.5 }
          ];
          const tl = gsap.timeline();
          cs.forEach(function (corner, index) {
            tl.to(corner, { x: positions[index].x, y: positions[index].y, duration: 0.3, ease: 'power3.out' }, 0);
          });
        }

        resumeTimeout = setTimeout(function () {
          if (!reduced && !activeTarget && cursorRef.current && spinTl.current) {
            const currentRotation = gsap.getProperty(cursorRef.current, 'rotation');
            const normalizedRotation = currentRotation % 360;
            spinTl.current.kill();
            spinTl.current = gsap.timeline({ repeat: -1 })
              .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
            gsap.to(cursorRef.current, {
              rotation: normalizedRotation + 360,
              duration: spinDuration * (1 - normalizedRotation / 360),
              ease: 'none',
              onComplete: function () { spinTl.current && spinTl.current.restart(); }
            });
          }
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      };

      currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    };
    window.addEventListener('mouseover', enterHandler, { passive: true });

    const resizeHandler = function () { containingBlockRef.current = getContainingBlock(cursor); };
    window.addEventListener('resize', resizeHandler);

    return function () {
      if (tickerFnRef.current) gsap.ticker.remove(tickerFnRef.current);
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseover', enterHandler);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
      if (activeTarget) cleanupTarget(activeTarget);
      spinTl.current && spinTl.current.kill();
      document.body.style.cursor = originalCursor;
      isActiveRef.current = false;
      targetCornerPositionsRef.current = null;
      activeStrengthRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSelector, spinDuration, constants, hideDefaultCursor, isMobile, hoverDuration, parallaxOn]);

  if (isMobile) return null;

  return (
    <div ref={cursorRef} className="target-cursor-wrapper" aria-hidden="true">
      <div ref={dotRef} className="target-cursor-dot" />
      <div className="target-cursor-corner corner-tl" />
      <div className="target-cursor-corner corner-tr" />
      <div className="target-cursor-corner corner-br" />
      <div className="target-cursor-corner corner-bl" />
    </div>
  );
}

window.TargetCursor = TargetCursor;
