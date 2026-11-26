// Local copy of lucyliu.xyz for checks when the source folder is out of reach: serves OVERLAY dirs first, then
// MIRROR; a file missing from MIRROR is fetched once from the live site.
//   MIRROR=/tmp/live OVERLAY=drafts/case-narrative PORT=8931 node drafts/case-narrative/tools/serve-live.cjs
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path');
const MIRROR = process.env.MIRROR, OVERLAYS = (process.env.OVERLAY || '').split(':').filter(Boolean);
const PORT = +process.env.PORT || 8931;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain', '.xml': 'application/xml', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const missing = new Set();
function fetchLive(rel, dest) {
  return new Promise((res) => {
    https.get('https://lucyliu.xyz' + rel, r => {
      if (r.statusCode !== 200) { r.resume(); return res(r.statusCode); }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = dest + '.part'; const w = fs.createWriteStream(tmp);
      r.pipe(w); w.on('finish', () => { fs.renameSync(tmp, dest); res(200); });
    }).on('error', () => res(502));
  });
}
function send(res, file, req) {
  const st = fs.statSync(file), type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  if (range && /^bytes=/.test(range)) {
    let [a, b] = range.slice(6).split('-'); a = a ? +a : 0; b = b ? +b : st.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 });
    return fs.createReadStream(file, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}
http.createServer(async (req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel.includes('..')) { res.writeHead(400); return res.end(); }
  for (const dir of OVERLAYS) { const f = path.join(dir, rel); if (fs.existsSync(f) && fs.statSync(f).isFile()) return send(res, f, req); }
  const f = path.join(MIRROR, rel);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return send(res, f, req);
  if (missing.has(rel)) { res.writeHead(404); return res.end(); }
  const code = await fetchLive(rel, f);
  if (code === 200) return send(res, f, req);
  missing.add(rel); res.writeHead(code === 502 ? 502 : 404); res.end();
}).listen(PORT, '127.0.0.1', () => console.log('serving on', PORT));
