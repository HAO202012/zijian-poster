import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DECOS,
  FONTS,
  PLACEHOLDER_TEXT,
  RATIOS,
  SAMPLES,
  THEMES,
  getRatio,
  getTextBox,
  getTheme,
  randomStyle,
  resolveFontStack,
} from '../src/js/core/presets.js';
import { createRng } from '../src/js/core/rng.js';
import fixture from './fixtures/themes.json' with { type: 'json' };

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const number = Number.parseInt(full, 16);
  return (
    0.2126 * channel((number >> 16) & 255) +
    0.7152 * channel((number >> 8) & 255) +
    0.0722 * channel(number & 255)
  );
}

function contrast(left, right) {
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('presets.THEMES 数量与唯一性', () => {
  assert.ok(THEMES.length >= fixture.minThemeCount);
  const ids = THEMES.map((theme) => theme.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(THEMES.length, fixture.count);
});

test('presets.THEMES 字段合法且文字对比度达标', () => {
  const fontIds = FONTS.map((font) => font.id);
  for (const theme of THEMES) {
    assert.ok(theme.name.length > 0);
    assert.ok(fontIds.includes(theme.fontId), `${theme.id} fontId`);
    assert.ok(DECOS.includes(theme.deco), `${theme.id} deco`);
    assert.ok(theme.grain >= 0 && theme.grain <= 0.2, `${theme.id} grain`);
    assert.match(theme.bg.from, /^#[0-9a-f]{6}$/i);
    assert.match(theme.bg.to, /^#[0-9a-f]{6}$/i);
    assert.match(theme.ink, /^#[0-9a-f]{6}$/i);
    assert.ok(theme.swatch.length === 3);
    const ratio = contrast(theme.ink, theme.bg.from);
    assert.ok(ratio >= fixture.minContrast, `${theme.id} 对比度 ${ratio.toFixed(2)} < 4.5`);
  }
});

test('presets.FONTS 栈末位是 generic family', () => {
  for (const font of FONTS) {
    assert.match(font.stack, /(serif|sans-serif|monospace)$/, `${font.id} 缺少兜底字体`);
  }
  assert.deepEqual(FONTS.map((font) => font.id), ['serif', 'sans', 'kai', 'mono']);
});

test('presets.RATIOS 尺寸符合画幅', () => {
  assert.equal(RATIOS.length, 5);
  const byId = Object.fromEntries(RATIOS.map((ratio) => [ratio.id, ratio]));
  assert.deepEqual([byId['3:4'].width, byId['3:4'].height], [1080, 1440]);
  assert.deepEqual([byId['9:16'].width, byId['9:16'].height], [1080, 1920]);
  assert.deepEqual([byId['16:9'].width, byId['16:9'].height], [1920, 1080]);
  for (const ratio of RATIOS) {
    assert.ok(ratio.width > 0 && ratio.height > 0);
  }
});

test('presets.getTheme / getRatio 未命中回退第一项', () => {
  assert.equal(getTheme('ink').id, 'ink');
  assert.equal(getTheme('nope').id, THEMES[0].id);
  assert.equal(getRatio('9:16').id, '9:16');
  assert.equal(getRatio('nope').id, RATIOS[0].id);
});

test('presets.getTextBox 按短边计算且页脚高度恒定', () => {
  const ratio = getRatio('3:4');
  const box = getTextBox(ratio, 0.09);
  assert.equal(box.short, 1080);
  assert.ok(Math.abs(box.x - 1080 * 0.09) < 1e-6);
  assert.ok(Math.abs(box.footerHeight - 1080 * 0.06) < 1e-6);
  assert.ok(box.height > 0 && box.width > 0);
  const wide = getTextBox(getRatio('16:9'), 0.09);
  assert.ok(Math.abs(wide.footerHeight - 1080 * 0.06) < 1e-6);
});

test('presets.randomStyle 返回合法枚举', () => {
  const rng = createRng(2026);
  for (let index = 0; index < 20; index += 1) {
    const style = randomStyle(rng);
    assert.ok(THEMES.some((theme) => theme.id === style.themeId));
    assert.ok(RATIOS.some((ratio) => ratio.id === style.ratioId));
    assert.ok(['horizontal', 'vertical'].includes(style.direction));
    assert.ok(['left', 'center', 'right'].includes(style.align));
  }
});

test('presets.resolveFontStack 处理 auto 与未知值', () => {
  assert.match(resolveFontStack('auto', 'kai'), /KaiTi/);
  assert.match(resolveFontStack('mono', 'ink'), /monospace$/);
  assert.match(resolveFontStack('unknown', 'ink'), /serif$/);
});

test('presets.SAMPLES / PLACEHOLDER_TEXT 可用', () => {
  assert.equal(SAMPLES.length, 4);
  for (const sample of SAMPLES) {
    assert.ok(sample.label.length > 0);
    assert.ok(sample.text.length >= 20 && sample.text.length <= 80, `${sample.id} 文案长度`);
  }
  assert.ok(PLACEHOLDER_TEXT.length > 0);
});
