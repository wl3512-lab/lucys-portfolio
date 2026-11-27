/* The site footer on every page (plain JS, window.SiteFooter; mounts itself on [data-site-footer]). Lucy, 2026-10-31,
   from user testing: "headers and footers dpnt match about all work etc and build w ai page". She picked one shared
   footer for every page: a compact contact strip with the email (as text, a mailto link), LinkedIn, GitHub, Instagram,
   the resume (the designed PDF, in a new tab) signed "Lucy Liu · New York". The CV is reached only
   from About, so it is not here.

   It brings its own styles (built on the tokens in colors_and_type.css), so it looks the same whichever stylesheets a
   page loads. On the home page it sits under the last screen, Lights out, which stays one screen: index.html renders
   the host after <main> and mounts it from a ref (no link back up: Lucy removed it, Nov 18). Under a loading screen the footer is inert with the rest of the page:
   page-loader.js holds every element of <body>, and home's lifecycle holds #root. Print hides it. */
(function () {
  'use strict';

  // The email and the links went (Lucy, Nov 24: "i dont like this font and i thought this was removed"); the menu
  // carries Contact, the socials and the resume. What is left is one quiet line that ends the page.
  var SIGN = 'Lucy Liu · New York';

  var api = { sign: SIGN };
  if (typeof window !== 'undefined') window.SiteFooter = api;
  if (typeof document === 'undefined') return;

  // One line, in the site's label style.
  var CSS =
    '.site-footer{position:relative;z-index:2;box-sizing:border-box;margin:0;' +
    'padding:22px clamp(20px,5vw,48px) calc(22px + env(safe-area-inset-bottom,0px));' +
    'border-top:1px solid var(--border);background:var(--bg);color:var(--fg3);text-align:left}' +
    '.sf-in{margin:0}' +
    '.sf-sign{margin:0;font:var(--type-label);letter-spacing:var(--track-label);color:var(--fg3)}' +
    '@media print{.site-footer{display:none!important}}';

  function injectStyles() {
    if (document.getElementById('site-footer-styles')) return;
    var st = document.createElement('style');
    st.id = 'site-footer-styles';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function mount(host) {
    if (!host || host.__siteFooter) return;
    host.__siteFooter = true;
    injectStyles();
    host.classList.add('site-footer');
    host.innerHTML =
      '<div class="sf-in">' +
        '<p class="sf-sign">' + esc(SIGN) + '</p>' +
      '</div>';
  }

  api.mount = mount;
  function auto() { [].forEach.call(document.querySelectorAll('[data-site-footer]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
