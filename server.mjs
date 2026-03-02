import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
const distDir = resolve('dist');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

const serveFile = (filePath, res) => {
  const ext = extname(filePath);
  res.statusCode = 200;
  res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
  createReadStream(filePath).pipe(res);
};

createServer((req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  if (req.url === '/health' || req.url === '/healthz') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  const requestPath = req.url.split('?')[0];
  const candidate = requestPath === '/' ? join(distDir, 'index.html') : join(distDir, requestPath);

  if (existsSync(candidate) && !candidate.endsWith('/')) {
    serveFile(candidate, res);
    return;
  }

  const fallback = join(distDir, 'index.html');
  if (existsSync(fallback)) {
    serveFile(fallback, res);
    return;
  }

  res.statusCode = 503;
  res.end('Build artifacts missing. Run `npm run build`.');
}).listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Panda Flood listening on http://${host}:${port}`);
});
