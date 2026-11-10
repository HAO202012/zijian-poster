import { createRng } from './rng.js';
import { getRatio, getTextBox, getTheme, resolveFontStack } from './presets.js';
import { fitDocument, splitHeadline, toGraphemes } from './text-layout.js';

const NOISE_SIZE = 90;
let noiseCanvas = null;

function getNoiseCanvas() {
  if (noiseCanvas) return noiseCanvas;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = NOISE_SIZE;
  canvas.height = NOISE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const image = ctx.createImageData(NOISE_SIZE, NOISE_SIZE);
  let state = 0x9e3779b9;
  for (let index = 0; index < image.data.length; index += 4) {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const value = 96 + (state & 127);
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  noiseCanvas = canvas;
  return canvas;
}

function withAlpha(color, alpha) {
  if (typeof color !== 'string') return `rgba(255,255,255,${alpha})`;
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
    const number = Number.parseInt(full, 16);
    const r = (number >> 16) & 255;
    const g = (number >> 8) & 255;
    const b = number & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith('rgba(')) {
    return color.replace(/rgba\(([^)]+)\)/, (_, body) => {
      const parts = body.split(',').slice(0, 3).join(',');
      return `rgba(${parts},${alpha})`;
    });
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
  }
  return color;
}

function paintBackground(ctx, theme, width, height) {
  const angle = ((theme.bg.angle ?? 160) * Math.PI) / 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  const gradient = ctx.createLinearGradient(
    centerX - (dx * length) / 2,
    centerY - (dy * length) / 2,
    centerX + (dx * length) / 2,
    centerY + (dy * length) / 2,
  );
  gradient.addColorStop(0, theme.bg.from);
  gradient.addColorStop(1, theme.bg.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (theme.bg.glow) {
    const glow = theme.bg.glow;
    const radius = Math.min(width, height) * (glow.r ?? 0.8);
    const radial = ctx.createRadialGradient(
      width * (glow.x ?? 0.5),
      height * (glow.y ?? 0.4),
      0,
      width * (glow.x ?? 0.5),
      height * (glow.y ?? 0.4),
      radius,
    );
    radial.addColorStop(0, glow.color);
    radial.addColorStop(1, withAlpha(glow.color, 0));
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);
  }
}

function paintGrain(ctx, theme, width, height) {
  if (!theme.grain) return;
  const tile = getNoiseCanvas();
  if (!tile) return;
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  if (typeof pattern.setTransform === 'function' && typeof DOMMatrix === 'function') {
    // 放大颗粒：纹理更柔，导出 PNG 体积更小
    pattern.setTransform(new DOMMatrix([2, 0, 0, 2, 0, 0]));
  }
  ctx.save();
  ctx.globalAlpha = theme.grain;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function paintFrame(ctx, theme, width, height) {
  const short = Math.min(width, height);
  const inset = short * 0.036;
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.accent, 0.42);
  ctx.lineWidth = Math.max(1, short * 0.0012);
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  const tick = short * 0.028;
  ctx.strokeStyle = withAlpha(theme.ink, 0.55);
  ctx.lineWidth = Math.max(1.2, short * 0.0018);
  const corners = [
    [inset, inset, 1, 1],
    [width - inset, inset, -1, 1],
    [inset, height - inset, 1, -1],
    [width - inset, height - inset, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + tick * sx, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + tick * sy);
    ctx.stroke();
  }
  ctx.restore();
}

function paintGrid(ctx, theme, width, height) {
  const inset = Math.min(width, height) * 0.05;
  ctx.save();
  ctx.strokeStyle = withAlpha(theme.ink, 0.09);
  ctx.lineWidth = 1;
  for (let index = 1; index < 8; index += 1) {
    const x = inset + ((width - inset * 2) / 8) * index;
    ctx.beginPath();
    ctx.moveTo(x, inset * 0.8);
    ctx.lineTo(x, height - inset * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function paintHalo(ctx, theme, width, height) {
  const short = Math.min(width, height);
  const radial = ctx.createRadialGradient(
    width * 0.5,
    height * 0.46,
    0,
    width * 0.5,
    height * 0.46,
    short * 0.58,
  );
  radial.addColorStop(0, withAlpha(theme.accent, 0.2));
  radial.addColorStop(0.55, withAlpha(theme.accent, 0.06));
  radial.addColorStop(1, withAlpha(theme.accent, 0));
  ctx.save();
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function paintRules(ctx, theme, width, height) {
  const short = Math.min(width, height);
  const inset = short * 0.05;
  ctx.save();
  ctx.fillStyle = theme.accent;
  ctx.fillRect(inset, inset * 0.72, short * 0.085, Math.max(2, short * 0.006));
  ctx.strokeStyle = withAlpha(theme.ink, 0.18);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(inset, inset * 0.72 + short * 0.02);
  ctx.lineTo(width - inset, inset * 0.72 + short * 0.02);
  ctx.stroke();
  ctx.restore();
}

function paintDots(ctx, theme, width, height) {
  const short = Math.min(width, height);
  const step = short * 0.042;
  const radius = Math.max(0.9, short * 0.0016);
  ctx.save();
  ctx.fillStyle = withAlpha(theme.ink, 0.13);
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function paintStamp(ctx, theme, width, height, rng) {
  const short = Math.min(width, height);
  const stripe = short * 0.016;
  ctx.save();
  ctx.translate(width * 0.9, stripe * 2.2);
  ctx.rotate(-0.5);
  for (let index = 0; index < 3; index += 1) {
    ctx.fillStyle = withAlpha(theme.accent, 0.22 + index * 0.05);
    ctx.fillRect(0, index * stripe * 1.9, short * 0.2, stripe);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = withAlpha(theme.accent, 0.55);
  ctx.lineWidth = Math.max(1, short * 0.0016);
  ctx.strokeRect(short * 0.05, short * 0.05, short * 0.055, short * 0.055);
  ctx.fillStyle = withAlpha(theme.accent, 0.85);
  ctx.beginPath();
  ctx.arc(short * 0.05 + short * 0.0275, short * 0.05 + short * 0.0275, short * 0.006, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (rng.chance(0.5)) {
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.ink, 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.06, height * 0.9);
    ctx.lineTo(width * 0.2, height * 0.9);
    ctx.stroke();
    ctx.restore();
  }
}

function paintDecor(ctx, theme, width, height, rng) {
  switch (theme.deco) {
    case 'frame':
      paintFrame(ctx, theme, width, height);
      break;
    case 'grid':
      paintGrid(ctx, theme, width, height);
      break;
    case 'halo':
      paintHalo(ctx, theme, width, height);
      break;
    case 'rules':
      paintRules(ctx, theme, width, height);
      break;
    case 'dots':
      paintDots(ctx, theme, width, height);
      break;
    case 'stamp':
      paintStamp(ctx, theme, width, height, rng);
      break;
    default:
      break;
  }
}

function fontFor(weight, size, family) {
  return `${weight} ${Math.max(1, Math.round(size * 10) / 10)}px ${family}`;
}

function measureRun(ctx, text, spacing) {
  const glyphs = toGraphemes(text);
  if (!glyphs.length) return 0;
  if (!spacing) return ctx.measureText(text).width;
  let width = 0;
  for (const glyph of glyphs) width += ctx.measureText(glyph).width;
  return width + spacing * Math.max(0, glyphs.length - 1);
}

function drawSpacedRun(ctx, text, x, baseline, spacing) {
  const glyphs = toGraphemes(text);
  if (!glyphs.length) return 0;
  const widths = glyphs.map((glyph) => ctx.measureText(glyph).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, glyphs.length - 1);
  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let cursor = x;
  for (let index = 0; index < glyphs.length; index += 1) {
    ctx.fillText(glyphs[index], cursor, baseline);
    cursor += widths[index] + spacing;
  }
  ctx.textAlign = previousAlign;
  return total;
}

function drawVerticalBlock(ctx, { block, theme, family, rightEdge, top }) {
  const weight = block.kind === 'headline' ? theme.titleWeight : theme.bodyWeight;
  const columnGap = block.fontSize * 1.55;
  const charAdvance = block.fontSize * 1.08;
  const startY = top + block.fontSize * 0.9;

  ctx.save();
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = fontFor(weight, block.fontSize, family);
  if (block.kind === 'headline' && theme.deco === 'halo') {
    ctx.shadowColor = withAlpha(theme.accent, 0.45);
    ctx.shadowBlur = block.fontSize * 0.35;
  }

  block.lines.forEach((column, index) => {
    const columnX = rightEdge - (index + 0.5) * columnGap;
    let charY = startY;
    for (const glyph of toGraphemes(column.text)) {
      ctx.fillText(glyph, columnX, charY);
      charY += charAdvance;
    }
  });
  ctx.restore();

  return block.width;
}

function drawHorizontalBlock(ctx, { block, theme, family, box, top, spec }) {
  const weight = block.kind === 'headline' ? theme.titleWeight : theme.bodyWeight;
  const spacing = spec.letterSpacing * block.fontSize;
  const lineHeightPx = block.fontSize * (block.kind === 'headline' ? Math.min(spec.lineHeight, 1.35) : spec.lineHeight);

  ctx.save();
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = fontFor(weight, block.fontSize, family);
  if (block.kind === 'headline' && theme.deco === 'halo') {
    ctx.shadowColor = withAlpha(theme.accent, 0.45);
    ctx.shadowBlur = block.fontSize * 0.35;
  }

  block.lines.forEach((line, index) => {
    if (!line.text) return;
    let x;
    if (spec.align === 'center') x = box.x + (box.width - line.width) / 2;
    else if (spec.align === 'right') x = box.x + box.width - line.width;
    else x = box.x;
    const baseline = top + lineHeightPx * index + block.fontSize * 0.86;
    drawSpacedRun(ctx, line.text, x, baseline, spacing);
  });
  ctx.restore();
}

function drawDocument(ctx, { spec, theme, document: doc, box, blockTop, family }) {
  if (spec.direction === 'vertical') {
    const groupRight =
      spec.align === 'right'
        ? box.x + box.width
        : spec.align === 'center'
          ? box.x + (box.width + doc.width) / 2
          : box.x + doc.width;
    let edge = groupRight;
    for (const block of doc.blocks) {
      edge -= block.gapBefore;
      const top = blockTop + Math.max(0, (doc.height - block.height) / 2);
      const used = drawVerticalBlock(ctx, { block, theme, family, rightEdge: edge, top });
      edge -= used;
    }
    return;
  }

  let cursorY = blockTop;
  for (const block of doc.blocks) {
    cursorY += block.gapBefore;
    drawHorizontalBlock(ctx, { block, theme, family, box, top: cursorY, spec });
    cursorY += block.height;
  }
}

function paintFooter(ctx, { spec, theme, width, height, box, family }) {
  const lowerBaseline = height - box.short * 0.042;
  const size = Math.max(9, box.short * 0.016);
  ctx.save();
  ctx.font = fontFor(400, size, family);
  ctx.fillStyle = theme.muted;
  ctx.textAlign = 'left';

  if (spec.footer) {
    drawSpacedRun(ctx, spec.footer, box.x, lowerBaseline, size * 0.05);
  }

  if (spec.tag) {
    const spacing = size * 0.05;
    const tagWidth = measureRun(ctx, spec.tag, spacing);
    const dotRadius = size * 0.16;
    const gap = size * 0.55;
    const textX = box.x + box.width - tagWidth;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(textX - gap - dotRadius, lowerBaseline - size * 0.3, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.ink;
    drawSpacedRun(ctx, spec.tag, textX, lowerBaseline, spacing);
  }

  if (spec.footer || spec.tag) {
    const ruleY = lowerBaseline - size * 1.9;
    ctx.strokeStyle = withAlpha(theme.ink, 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(box.x, ruleY);
    ctx.lineTo(box.x + box.width, ruleY);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderPoster(ctx, spec, options = {}) {
  const ratio = getRatio(spec.ratioId);
  const width = Number(options.width) || ratio.width;
  const height = Number(options.height) || ratio.height;
  const theme = getTheme(spec.themeId);
  const short = Math.min(width, height);
  const rng = createRng(spec.seed);
  const family = resolveFontStack(spec.fontId, theme.fontId);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  paintBackground(ctx, theme, width, height);
  paintGrain(ctx, theme, width, height);
  paintDecor(ctx, theme, width, height, rng);

  const box = getTextBox({ width, height }, spec.margin);
  const baseSize = Math.max(12, short * 0.042 * spec.fontSize);
  const { headline, body } = splitHeadline(spec.text);

  const measure = (text, size, role) => {
    const weight = role === 'headline' ? theme.titleWeight : theme.bodyWeight;
    ctx.font = fontFor(weight, size, family);
    return ctx.measureText(text).width;
  };

  const doc = fitDocument({
    headline: spec.headline ? headline : '',
    body: spec.headline ? body : spec.text,
    measure,
    boxWidth: box.width,
    boxHeight: box.height,
    fontSize: baseSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    direction: spec.direction,
  });

  const blockTop = box.y + Math.max(0, (box.height - doc.height) / 2);
  drawDocument(ctx, { spec, theme, document: doc, box, blockTop, family });
  paintFooter(ctx, { spec, theme, width, height, box, family });
  ctx.restore();
}
