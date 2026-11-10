#!/usr/bin/env node
// W2 骨架（architect 所有）：跑 node --test。测试目录不存在时 SKIP。
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'tests');

if (!existsSync(testsDir)) {
  console.log('[SKIP] tests 尚未生成');
  process.exit(0);
}

const res = spawnSync(process.execPath, ['--test', 'tests/*.test.js'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--enable-source-maps' },
});

if (res.status !== 0) {
  console.error('[FAIL] 测试未通过');
  process.exit(res.status ?? 1);
}
console.log('[OK] 测试全绿');
