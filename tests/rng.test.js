import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashSeed } from '../src/js/core/rng.js';
import fixture from './fixtures/rng-cases.json' with { type: 'json' };

test('rng.hashSeed 稳定且区分输入', () => {
  assert.equal(hashSeed('poster'), hashSeed('poster'));
  assert.notEqual(hashSeed('poster'), hashSeed('poster-2'));
  assert.equal(hashSeed(null), hashSeed(''));
  assert.ok(Number.isInteger(hashSeed('字间')) && hashSeed('字间') >= 0);
});

test('rng.createRng 同 seed 产生同序列', () => {
  const first = createRng(fixture.deterministicSeed);
  const second = createRng(fixture.deterministicSeed);
  for (let index = 0; index < fixture.drawCount; index += 1) {
    assert.equal(first.next(), second.next());
  }
});

test('rng.createRng 不同 seed 产生不同序列', () => {
  const first = createRng(1);
  const second = createRng(2);
  const left = Array.from({ length: 5 }, () => first.next());
  const right = Array.from({ length: 5 }, () => second.next());
  assert.notDeepEqual(left, right);
});

test('rng.int 含两端且返回整数', () => {
  const rng = createRng(7);
  const seen = new Set();
  for (let index = 0; index < 200; index += 1) {
    const value = rng.int(3, 5);
    assert.ok(Number.isInteger(value) && value >= 3 && value <= 5);
    seen.add(value);
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5]);
});

test('rng.pick 边界', () => {
  const rng = createRng(11);
  assert.equal(rng.pick([]), undefined);
  assert.equal(rng.pick(null), undefined);
  const list = ['a', 'b', 'c'];
  for (let index = 0; index < 50; index += 1) {
    assert.ok(list.includes(rng.pick(list)));
  }
});

test('rng.chance 边界不越界', () => {
  const rng = createRng(3);
  for (let index = 0; index < 100; index += 1) assert.equal(rng.chance(0), false);
  for (let index = 0; index < 100; index += 1) assert.equal(rng.chance(1), true);
});
