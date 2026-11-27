/* Pull back from the workspace to reveal the same computer on his drawer.
 * Only transforms and opacity scrub. Phones and reduced motion retain a normal stack.
 */
(function () {
  'use strict';
  var ZOOM_MEDIA = '(min-width: 761px) and (min-height: 640px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
  window.WorkspaceJourney = {
    isAnimated: function () { return !!(window.gsap && window.ScrollTrigger && matchMedia(ZOOM_MEDIA).matches && !document.documentElement.classList.contains('reduce-motion')); },
    mount: function (root) {
      if (!root || root.__journey) return root && root.__journey;
      var gsap = window.gsap, ST = window.ScrollTrigger;
      if (!gsap || !ST) return null;
      gsap.registerPlugin(ST);
      var stage = root.querySelector('.journey-stage');
      var computer = root.querySelector('.journey-computer');
      var entry = computer.querySelector('.wat-entry');
      var monitor = computer.querySelector('.wat-monitor');
      var room = root.querySelector('.journey-room');
      var foreground = root.querySelector('.journey-foreground');
      var label = computer.querySelector('.wat-entry-label');
      var mini = computer.querySelector('.wat-mini-desktop');
      var previews = computer.querySelectorAll('.wat-tiles, .wat-monitor-folders');
      var screen = computer.querySelectorAll('.wat-monitor-bar, .wat-monitor-desk');
      var hint = root.querySelector('.journey-scroll');
      var media = gsap.matchMedia();
      var handle = { trigger: null, timeline: null, destroy: function () { media.revert(); delete root.__journey; } };
      root.__journey = handle;
      media.add(ZOOM_MEDIA, function () {
        if (document.documentElement.classList.contains('reduce-motion')) return;
        root.classList.add('is-zoom-ready');
        var dimensions;
        function measure() {
          var w = stage.clientWidth, h = stage.clientHeight;
          var cw = computer.offsetWidth, ch = computer.offsetHeight;
          var rw = room.offsetWidth;
          var scale = Math.min(170, rw * 0.19) / cw;
          var foot = getComputedStyle(monitor, '::after');
          var base = monitor.offsetTop + parseFloat(foot.top) + parseFloat(foot.height) + parseFloat(getComputedStyle(monitor).borderTopWidth) + 3;
          dimensions = {
            startX: (w - cw) / 2, startY: (h - ch) / 2 - 20,
            endX: (w - rw) / 2 + rw * 0.471 - cw / 2,
            endY: room.offsetTop + rw * 0.2518125 - base,
            scale: scale, origin: (cw / 2) + 'px ' + base + 'px',
            perspective: (rw * 0.5) / scale,
            perspectiveOrigin: ((rw * 0.114) / scale) + 'px ' + ((rw * 0.053) / scale) + 'px',
          };
        }
        measure();
        function revealDragon(self) {
          if (self.progress < 0.68 || !window.EndSceneMount) return;
          var ending = window.EndSceneMount(room.querySelector('[data-workspace-room]'));
          if (ending && ending.reveal) ending.reveal();
        }
        var timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            id: 'workspace-pullback', trigger: root, pin: stage,
            start: 'top 80px', end: function () { return '+=' + Math.round(innerHeight * 1.05); },
            scrub: 0.45, anticipatePin: 1, invalidateOnRefresh: true,
            onRefreshInit: measure,
            onUpdate: revealDragon, onRefresh: revealDragon,
          },
        });
        timeline.fromTo(computer,
          { x: function () { return dimensions.startX; }, y: function () { return dimensions.startY; }, scale: 1, rotationX: 0, rotationY: 0, rotationZ: 0, transformPerspective: 0, transformOrigin: function () { return dimensions.origin; } },
          { x: function () { return dimensions.endX; }, y: function () { return dimensions.endY; }, scale: function () { return dimensions.scale; }, duration: 0.78 }, 0.04);
        // Lucy's Figma scene: 37-degree yaw, 500px scene perspective,
        // and its existing 0.8-degree roll / 1.55-degree shear.
        timeline.set(entry, { perspective: function () { return dimensions.perspective; }, perspectiveOrigin: function () { return dimensions.perspectiveOrigin; } }, 0);
        timeline.fromTo(monitor, { rotationX: 0, rotationY: 0, rotationZ: 0, skewX: 0, transformOrigin: '50% 50%' },
          { rotationY: 37, rotationZ: 0.8, skewX: 1.55, duration: 0.78 }, 0.04);
        timeline.fromTo(label, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.24 }, 0.06);
        timeline.fromTo(screen, { filter: 'blur(0px)' }, { filter: 'blur(10px)', duration: 0.34 }, 0.32);
        if (mini) {
          timeline.fromTo(mini, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18 }, 0.46);
          timeline.to(previews, { autoAlpha: 0, duration: 0.18 }, 0.46);
        }
        timeline.fromTo(foreground ? [room, foreground] : room, { autoAlpha: 0, y: 100 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 0.15);
        timeline.to(hint, { autoAlpha: 0, duration: 0.15 }, 0);
        timeline.to({}, { duration: 0.18 });
        handle.timeline = timeline; handle.trigger = timeline.scrollTrigger;
        var removeLanding = window.ScrollLandings ? window.ScrollLandings.add(function () { return [timeline.scrollTrigger.end]; }) : function () {};
        function focused(e) {
          if (!room.contains(e.target)) return;
          var end = timeline.scrollTrigger.end;
          if (scrollY < end - 2) {
            if (window.__lenis) window.__lenis.scrollTo(end, { immediate: true, force: true });
            else window.scrollTo({ top: end, behavior: 'instant' });
            timeline.progress(1);
          }
        }
        stage.addEventListener('focusin', focused);
        return function () {
          stage.removeEventListener('focusin', focused);
          removeLanding();
          root.classList.remove('is-zoom-ready');
          var ending = window.EndSceneMount && window.EndSceneMount(room.querySelector('[data-workspace-room]'));
          if (ending && ending.reveal) ending.reveal();
          handle.trigger = null; handle.timeline = null;
        };
      });
      return handle;
    },
  };
})();
