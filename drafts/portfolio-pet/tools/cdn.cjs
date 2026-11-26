// Serve the site's CDN libraries from local npm copies (this sandbox blocks unpkg/cdnjs).
const fs = require('fs'), path = require('path');
const NM = path.join(__dirname, 'node_modules');
module.exports = async function routeCdn(ctx) {
  await ctx.route(/https:\/\/(unpkg\.com|cdnjs\.cloudflare\.com)\/.*/, async route => {
    const u = new URL(route.request().url());
    let file = null;
    if (u.hostname === 'unpkg.com') {
      const m = u.pathname.match(/^\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.*)$/);
      if (m) file = path.join(NM, m[1], m[2]);
    } else {
      const m = u.pathname.match(/^\/ajax\/libs\/gsap\/[^/]+\/(.*)$/);
      if (m) file = path.join(NM, 'gsap', 'dist', m[1]);
    }
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  await ctx.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\/.*/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
};
