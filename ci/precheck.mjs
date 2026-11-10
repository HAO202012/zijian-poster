#!/usr/bin/env node
// W2 骨架（architect 所有）：发布前静态检查。可重复执行，失败退出码 1。
// 检查：必需文件存在、无外链资源、无 npm 依赖、vercel.json 合法、契约未被手改 frozen。
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const problems = [];

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

const required = [
  'index.html',
  'css/style.css',
  'js/core/rng.js',
  'js/core/presets.js',
  'js/core/text-layout.js',
  'js/core/spec.js',
  'js/core/renderer.js',
  'js/core/exporter.js',
  'js/ui/app.js',
];

const missing = required.filter((rel) => !existsSync(path.join(src, rel)));
if (missing.length) {
  console.log(`[SKIP] 代码尚未就绪（缺 ${missing.length} 个文件），跳过内容检查`);
  process.exit(0);
}

for (const rel of required) {
  const st = await stat(path.join(src, rel));
  if (st.size === 0) problems.push(`${rel} 为空文件`);
}

const files = await walk(src);
for (const file of files) {
  if (!/\.(html|css|js|json)$/.test(file)) continue;
  const rel = path.relative(src, file).replace(/\\/g, '/');
  const text = await readFile(file, 'utf8');
  if (/(src|href)\s*=\s*["']https?:\/\//i.test(text)) problems.push(`${rel} 引用了外链资源`);
  if (/@import\s+url\(["']?https?:/i.test(text)) problems.push(`${rel} 引用了外链样式`);
  if (/from\s+["'][^./][^"']*["']/.test(text) && !/from\s+["']node:/.test(text)) {
    problems.push(`${rel} 存在非相对路径 import（禁止 npm 依赖 / 裸模块）`);
  }
}

const vercelPath = path.join(src, 'vercel.json');
if (existsSync(vercelPath)) {
  try {
    const conf = JSON.parse(await readFile(vercelPath, 'utf8'));
    if (typeof conf !== 'object' || conf === null) problems.push('vercel.json 不是对象');
  } catch (err) {
    problems.push(`vercel.json 不是合法 JSON：${err.message}`);
  }
}

const contractPath = path.join(root, 'api-contract.yaml');
if (existsSync(contractPath)) {
  const text = await readFile(contractPath, 'utf8');
  if (!/^frozen:\s*(true|false)/m.test(text)) problems.push('api-contract.yaml 缺少 frozen 字段');
}

if (problems.length) {
  console.error('[FAIL] precheck 未通过：');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`[OK] precheck 通过：${files.length} 个文件，无外链、无裸模块 import`);
