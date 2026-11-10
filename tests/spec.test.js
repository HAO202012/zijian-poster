import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SPEC,
  fromShareHash,
  normalizeSpec,
  posterFileName,
  toShareHash,
} from '../src/js/core/spec.js';
import fixture from './fixtures/spec-cases.json' with { type: 'json' };

test('spec.normalizeSpec 空入参返回默认值', () => {
  assert.deepEqual(normalizeSpec({}), DEFAULT_SPEC);
  assert.deepEqual(normalizeSpec(null), DEFAULT_SPEC);
  assert.deepEqual(normalizeSpec('oops'), DEFAULT_SPEC);
});

test('spec.normalizeSpec 按契约 clamp 数值', () => {
  for (const item of fixture.clampCases) {
    const spec = normalizeSpec({ ...DEFAULT_SPEC, [item.field]: item.input });
    assert.equal(spec[item.field], item.expected, `${item.field} 期望 ${item.expected}`);
  }
});

test('spec.normalizeSpec 未知枚举回退默认', () => {
  const spec = normalizeSpec({
    themeId: 'unknown',
    ratioId: '2:1',
    direction: 'diagonal',
    align: 'justify',
    fontId: 'comic',
    headline: 'yes',
  });
  assert.equal(spec.themeId, DEFAULT_SPEC.themeId);
  assert.equal(spec.ratioId, DEFAULT_SPEC.ratioId);
  assert.equal(spec.direction, DEFAULT_SPEC.direction);
  assert.equal(spec.align, DEFAULT_SPEC.align);
  assert.equal(spec.fontId, DEFAULT_SPEC.fontId);
  assert.equal(spec.headline, DEFAULT_SPEC.headline);
});

test('spec.normalizeSpec 截断长文本、页脚与标签', () => {
  const spec = normalizeSpec({
    text: '字'.repeat(5000),
    footer: '署'.repeat(60),
    tag: '标'.repeat(30),
  });
  assert.equal(spec.text.length, 4000);
  assert.equal(spec.footer.length, 40);
  assert.equal(spec.tag.length, 16);
});

test('spec.normalizeSpec 不修改入参', () => {
  const input = { ...DEFAULT_SPEC, fontSize: 99 };
  const snapshot = { ...input };
  normalizeSpec(input);
  assert.deepEqual(input, snapshot);
});

test('spec.toShareHash 只在偏离默认值时返回内容', () => {
  assert.equal(toShareHash(DEFAULT_SPEC), '');
  const hash = toShareHash({ ...DEFAULT_SPEC, themeId: 'neon' });
  assert.ok(hash.length > 0);
  assert.ok(!hash.includes('#'));
  assert.ok(!hash.includes('='));
  assert.match(hash, /^[A-Za-z0-9_-]+$/);
});

test('spec.fromShareHash 支持纯 hash / #s= / 完整 URL', () => {
  const source = normalizeSpec({ ...DEFAULT_SPEC, ...fixture.shareCases[0] });
  const hash = toShareHash(source);
  assert.deepEqual(fromShareHash(hash), source);
  assert.deepEqual(fromShareHash(`#s=${hash}`), source);
  assert.deepEqual(fromShareHash(`https://poster.example/#s=${hash}`), source);
});

test('spec.fromShareHash 非法输入返回 null', () => {
  assert.equal(fromShareHash(''), null);
  assert.equal(fromShareHash('!!!not-base64!!!'), null);
  assert.equal(fromShareHash('https://poster.example/'), null);
  assert.equal(fromShareHash(null), null);
});

test('spec.posterFileName 输出稳定文件名', () => {
  assert.equal(
    posterFileName({ themeId: 'neon', ratioId: '9:16', seed: 7 }),
    'zijian-neon-9x16-7.png',
  );
  assert.equal(
    posterFileName({ themeId: 'ink', ratioId: '3:4', seed: 42 }),
    'zijian-ink-3x4-42.png',
  );
});
