import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_LINE_START,
  fitDocument,
  layoutDocument,
  layoutText,
  normalizeText,
  splitHeadline,
  tokenizeParagraph,
  wrapParagraph,
} from '../src/js/core/text-layout.js';
import fixture from './fixtures/layout-cases.json' with { type: 'json' };

const measure = (text, size) => [...text].length * size;

test('text-layout.normalizeText 归一化换行与空白', () => {
  assert.equal(normalizeText('甲\r\n乙'), '甲\n乙');
  assert.equal(normalizeText('  \n甲  \n\n\n\n乙\n '), '甲\n\n乙');
  assert.equal(normalizeText(null), '');
});

test('text-layout.tokenizeParagraph 区分 CJK 与英文词', () => {
  const tokens = tokenizeParagraph('今天Hello世界 42%');
  assert.deepEqual(
    tokens.map((token) => token.text),
    ['今', '天', 'Hello', '世', '界', ' ', '42%'],
  );
  assert.equal(tokens[2].type, 'word');
  assert.equal(tokens[5].type, 'space');
  assert.deepEqual(tokenizeParagraph(''), []);
});

test('text-layout.wrapParagraph 中文按字换行且尊重行首禁则', () => {
  const { text, maxWidth, fontSize, forbiddenStart } = fixture.kinsoku;
  const lines = wrapParagraph(tokenizeParagraph(text), (value) => [...value].length * fontSize, maxWidth, {
    fontSize,
    letterSpacing: 0,
  });
  assert.ok(lines.length >= 2);
  for (const line of lines) {
    const head = [...line.text][0];
    assert.ok(!forbiddenStart.includes(head), `行首出现禁则标点：${line.text}`);
    assert.ok(NO_LINE_START.includes(head) === false, `行首出现禁则标点：${line.text}`);
  }
  for (const line of lines.slice(0, -1)) {
    assert.ok(line.width <= maxWidth + fontSize, `行宽溢出：${line.text}`);
  }
});

test('text-layout.wrapParagraph 不拆分英文单词', () => {
  const source = 'Hello Canvas poster generator';
  const size = 20;
  const lines = wrapParagraph(tokenizeParagraph(source), (value) => [...value].length * size, 200, {
    fontSize: size,
    letterSpacing: 0,
  });
  const words = source.split(' ');
  for (const line of lines) {
    for (const word of line.text.split(' ')) {
      assert.ok(words.includes(word), `英文单词被截断：${word}`);
    }
  }
});

test('text-layout.wrapParagraph 超宽单 token 独占一行', () => {
  const lines = wrapParagraph(tokenizeParagraph('Supercalifragilisticexpialidocious'), (value) => [...value].length * 10, 40, {
    fontSize: 10,
    letterSpacing: 0,
  });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, 'Supercalifragilisticexpialidocious');
});

test('text-layout.layoutText 处理换行与空文本', () => {
  const result = layoutText({
    text: '第一行\n第二行',
    measure,
    maxWidth: 1000,
    fontSize: 20,
    lineHeight: 1.7,
  });
  assert.equal(result.lines.length, 2);
  assert.equal(result.height, 20 * 1.7 * 2);
  assert.equal(result.overflow, false);

  const empty = layoutText({ text: '', measure, maxWidth: 300, fontSize: 20 });
  assert.deepEqual(empty.lines, []);
  assert.equal(empty.height, 0);
});

test('text-layout.layoutText 竖排按列自右向左排布', () => {
  const text = '一二三四五六七八九十';
  const result = layoutText({
    text,
    measure,
    maxWidth: 1000,
    maxHeight: 160,
    fontSize: 50,
    direction: 'vertical',
  });
  assert.equal(result.direction, 'vertical');
  assert.ok(result.lines.length >= 2);
  assert.ok(Math.abs(result.width - result.lines.length * 50 * 1.55) < 1e-6);
  assert.ok(result.lines.every((column) => [...column.text].length <= 3));
  assert.equal(result.lines.map((column) => column.text).join(''), text);
});

test('text-layout.splitHeadline 在句末标点或换行处切分', () => {
  assert.deepEqual(splitHeadline(fixture.headline.sentence), {
    headline: fixture.headline.expectHeadline,
    body: fixture.headline.expectBody,
  });
  assert.deepEqual(splitHeadline('没有标点的一句话'), { headline: '没有标点的一句话', body: '' });
  assert.deepEqual(splitHeadline(''), { headline: '', body: '' });
  assert.deepEqual(splitHeadline('第一行\n第二行'), { headline: '第一行', body: '第二行' });
});

test('text-layout.layoutDocument 组合标题与正文', () => {
  const doc = layoutDocument({
    headline: '标题',
    body: '正文正文正文',
    measure,
    boxWidth: 200,
    boxHeight: 400,
    fontSize: 20,
    lineHeight: 1.7,
  });
  assert.equal(doc.blocks.length, 2);
  assert.equal(doc.blocks[0].kind, 'headline');
  assert.equal(doc.blocks[0].fontSize, 35);
  assert.equal(doc.blocks[1].gapBefore, 16);
  assert.ok(doc.height > 0);
});

test('text-layout.layoutDocument 竖排时两块并排、宽取和、高取最大', () => {
  const doc = layoutDocument({
    headline: '标题',
    body: '正文正文',
    measure,
    boxWidth: 400,
    boxHeight: 400,
    fontSize: 20,
    direction: 'vertical',
  });
  assert.equal(doc.blocks.length, 2);
  assert.ok(doc.width > doc.blocks[0].width);
  assert.equal(doc.height, Math.max(...doc.blocks.map((block) => block.height)));
});

test('text-layout.fitDocument 取最大可容纳字号并守住 10px 下限', () => {
  const text = '在有限的空间里，把一段话排出节奏。'.repeat(3);
  const doc = fitDocument({
    headline: '',
    body: text,
    measure,
    boxWidth: 400,
    boxHeight: 300,
    fontSize: 60,
    lineHeight: 1.8,
  });
  assert.equal(doc.overflow, false);
  assert.ok(doc.fontSize <= 60 && doc.fontSize >= 10);

  const squeezed = fitDocument({
    headline: '',
    body: text,
    measure,
    boxWidth: 100,
    boxHeight: 30,
    fontSize: 40,
    lineHeight: 2,
  });
  assert.equal(squeezed.overflow, true);
  assert.ok(squeezed.fontSize >= 9.9);
});
