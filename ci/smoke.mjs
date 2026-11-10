#!/usr/bin/env node
// W2 骨架（architect 所有）：起一个临时静态服务，验证关键资源 200 且 MIME 正确。
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');

if (!existsSync(path.join(src, 'index.html'))) {
  console.log('[SKIP] project/src/index.html 尚未生成');
  process.exit(0);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel.endsWith('/')) rel += 'index.html';
    const file = path.join(src, rel);
    if (!file.startsWith(src)) {
      res.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not file');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

const port = await new Promise((resolve) => {
  server.listen(4173, '127.0.0.1', () => resolve(server.address().port));
});

const paths = ['/', '/css/style.css', '/js/ui/app.js', '/js/core/renderer.js', '/js/core/text-layout.js'];
const failures = [];
try {
  for (const p of paths) {
    const res = await fetch(`http://127.0.0.1:${port}${p}`);
    if (res.status !== 200) failures.push(`${p} -> ${res.status}`);
    else if (!res.headers.get('content-type')?.includes(p.endsWith('.js') ? 'javascript' : p.endsWith('.css') ? 'css' : 'html')) {
      failures.push(`${p} -> content-type ${res.headers.get('content-type')}`);
    }
  }
  if (failures.length) {
    console.error('[FAIL] smoke 未通过：');
    for (const f of failures) console.error(`  - ${f}`);
  } else {
    console.log(`[OK] smoke 通过：${paths.length} 个资源 200`);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

process.exitCode = failures.length ? 1 : 0;
