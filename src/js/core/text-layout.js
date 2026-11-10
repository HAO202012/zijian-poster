export const NO_LINE_START = '，。、；：！？…—·）】》」』〕〉”’%,.;:!?)]}';
export const NO_LINE_END = '（【《「『〔〈“‘([{';

const CJK_PATTERN = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF\u3000-\u303F\u3040-\u30FF]/;
const WORD_PATTERN = /^[A-Za-z0-9@#$%&*+=^~_./\\-]$/;

let segmenter = null;
if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
  segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
}

export function toGraphemes(text) {
  const value = typeof text === 'string' ? text : '';
  if (!value) return [];
  if (!segmenter) return Array.from(value);
  return Array.from(segmenter.segment(value), (item) => item.segment);
}

export function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function tokenizeParagraph(paragraph) {
  const tokens = [];
  let word = '';
  const flush = () => {
    if (word) {
      tokens.push({ text: word, type: 'word' });
      word = '';
    }
  };

  for (const glyph of toGraphemes(paragraph)) {
    if (glyph === ' ') {
      flush();
      tokens.push({ text: glyph, type: 'space' });
    } else if (CJK_PATTERN.test(glyph)) {
      flush();
      tokens.push({ text: glyph, type: 'cjk' });
    } else if (WORD_PATTERN.test(glyph)) {
      word += glyph;
    } else {
      flush();
      tokens.push({ text: glyph, type: 'cjk' });
    }
  }
  flush();
  return tokens;
}

function firstGlyph(text) {
  const glyphs = toGraphemes(text);
  return glyphs[0] || '';
}

function lastGlyph(text) {
  const glyphs = toGraphemes(text);
  return glyphs[glyphs.length - 1] || '';
}

export function wrapParagraph(tokens, measure, maxWidth, opts = {}) {
  const fontSize = Number(opts.fontSize) || 0;
  const spacing = Math.max(0, Number(opts.letterSpacing) || 0) * fontSize;
  const limit = Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : Infinity;
  const lines = [];
  let current = [];

  const glyphCount = (text) => toGraphemes(text).length;
  const widthOf = (list) => {
    if (!list.length) return 0;
    let glyphs = 0;
    let width = 0;
    for (const token of list) {
      width += Number(measure(token.text)) || 0;
      glyphs += glyphCount(token.text);
    }
    return width + spacing * Math.max(0, glyphs - 1);
  };

  const pushLine = () => {
    while (current.length && current[0].type === 'space') current.shift();
    while (current.length && current[current.length - 1].type === 'space') current.pop();
    if (!current.length) return;
    lines.push({ text: current.map((token) => token.text).join(''), width: widthOf(current) });
    current = [];
  };

  for (const token of tokens) {
    if (!current.length && token.type === 'space') continue;
    const candidate = [...current, token];
    const width = widthOf(candidate);
    if (width <= limit) {
      current = candidate;
      continue;
    }
    if (!current.length) {
      current = [token];
      continue;
    }
    if (NO_LINE_START.includes(firstGlyph(token.text)) && width <= limit + Math.max(1, fontSize)) {
      current = candidate;
      pushLine();
      continue;
    }
    if (NO_LINE_END.includes(lastGlyph(current[current.length - 1].text)) && current.length > 1) {
      const moved = current.pop();
      pushLine();
      current = [moved, token];
      continue;
    }
    pushLine();
    current = [token];
  }
  pushLine();
  return lines;
}

export function splitHeadline(text) {
  const value = normalizeText(text);
  if (!value) return { headline: '', body: '' };
  const firstBreak = value.indexOf('\n');
  const match = value.match(/[。！？!?…]/);
  let cut = -1;
  if (match) cut = match.index + 1;
  if (firstBreak !== -1 && (cut === -1 || firstBreak < cut)) cut = firstBreak;
  if (cut === -1) return { headline: value, body: '' };
  return {
    headline: value.slice(0, cut).trim(),
    body: value.slice(cut).trim(),
  };
}

export function layoutText(opts) {
  const {
    text,
    measure,
    maxWidth,
    maxHeight = Infinity,
    fontSize,
    lineHeight = 1.7,
    letterSpacing = 0,
    direction = 'horizontal',
  } = opts;

  const normalized = normalizeText(text);
  const safeSize = Math.max(1, Number(fontSize) || 12);
  const paragraphs = normalized ? normalized.split('\n') : [];

  if (direction === 'vertical') {
    const columnGap = safeSize * 1.55;
    const charAdvance = safeSize * 1.08;
    const capacity = Math.max(1, Math.floor(Math.max(1, maxHeight) / charAdvance));
    const columns = [];
    let chars = [];
    const flushColumn = () => {
      if (!chars.length) return;
      columns.push({
        text: chars.join(''),
        width: safeSize,
        height: chars.length * charAdvance,
      });
      chars = [];
    };

    for (let index = 0; index < paragraphs.length; index += 1) {
      const paragraph = paragraphs[index];
      if (!paragraph) {
        flushColumn();
        continue;
      }
      for (const glyph of toGraphemes(paragraph)) {
        if (glyph === ' ' && chars.length === 0) continue;
        if (glyph === ' ') {
          chars.push(glyph);
          continue;
        }
        if (chars.length >= capacity) {
          if (NO_LINE_START.includes(glyph) && chars.length <= capacity + 1) {
            chars.push(glyph);
            flushColumn();
            continue;
          }
          flushColumn();
        }
        chars.push(glyph);
      }
      flushColumn();
    }
    flushColumn();

    const width = columns.length * columnGap;
    const height = columns.reduce((max, column) => Math.max(max, column.height), 0);
    return {
      direction,
      fontSize: safeSize,
      lines: columns,
      width,
      height,
      overflow: width > maxWidth || height > maxHeight,
    };
  }

  const lines = [];
  const measureAtSize = (value) => Number(measure(value, safeSize, 'body')) || 0;
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push({ text: '', width: 0 });
      continue;
    }
    lines.push(
      ...wrapParagraph(tokenizeParagraph(paragraph), measureAtSize, maxWidth, {
        fontSize: safeSize,
        letterSpacing,
      }),
    );
  }

  const lineHeightPx = safeSize * lineHeight;
  const width = lines.reduce((max, line) => Math.max(max, line.width), 0);
  const height = lines.length * lineHeightPx;
  return {
    direction,
    fontSize: safeSize,
    lines,
    width,
    height,
    overflow: width > maxWidth || height > maxHeight,
  };
}

export function layoutDocument(opts) {
  const {
    headline = '',
    body = '',
    measure,
    boxWidth,
    boxHeight,
    fontSize,
    lineHeight = 1.7,
    letterSpacing = 0,
    direction = 'horizontal',
    headlineScale = 1.75,
  } = opts;

  const safeSize = Math.max(1, Number(fontSize) || 12);
  const titleSize = Math.max(1, Math.round(safeSize * headlineScale));
  const blocks = [];
  let height = 0;

  if (headline) {
    const result = layoutText({
      text: headline,
      measure: (value, size) => measure(value, size, 'headline'),
      maxWidth: boxWidth,
      maxHeight: boxHeight,
      fontSize: titleSize,
      lineHeight: Math.min(lineHeight, 1.35),
      letterSpacing: letterSpacing + 0.01,
      direction,
    });
    blocks.push({
      kind: 'headline',
      fontSize: titleSize,
      lines: result.lines,
      width: result.width,
      height: result.height,
      gapBefore: 0,
    });
    height += result.height;
  }

  if (body) {
    const gap = Math.round(safeSize * 0.8);
    const result = layoutText({
      text: body,
      measure: (value, size) => measure(value, size, 'body'),
      maxWidth: boxWidth,
      maxHeight: boxHeight,
      fontSize: safeSize,
      lineHeight,
      letterSpacing,
      direction,
    });
    blocks.push({
      kind: 'body',
      fontSize: safeSize,
      lines: result.lines,
      width: result.width,
      height: result.height,
      gapBefore: blocks.length ? gap : 0,
    });
    height += (blocks.length > 1 ? gap : 0) + result.height;
  }

  const vertical = direction === 'vertical';
  const width = vertical
    ? blocks.reduce((total, block) => total + block.width + block.gapBefore, 0)
    : blocks.reduce((max, block) => Math.max(max, block.width), 0);
  const blockHeight = vertical
    ? blocks.reduce((max, block) => Math.max(max, block.height), 0)
    : height;

  return {
    blocks,
    fontSize: safeSize,
    width,
    height: blockHeight,
    overflow: width > boxWidth || blockHeight > boxHeight,
  };
}

export function fitDocument(opts) {
  const minFontSize = Math.max(1, Number(opts.minFontSize) || 10);
  const start = Math.max(minFontSize, Number(opts.fontSize) || minFontSize);
  let low = minFontSize;
  let high = start;
  let best = null;

  for (let index = 0; index < 12; index += 1) {
    const middle = (low + high) / 2;
    const result = layoutDocument({ ...opts, fontSize: middle });
    if (result.overflow) {
      high = middle;
    } else {
      best = result;
      low = middle;
    }
  }

  if (best) return best;
  return { ...layoutDocument({ ...opts, fontSize: minFontSize }), overflow: true };
}
