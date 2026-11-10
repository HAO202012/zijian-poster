import { DEFAULT_SPEC, FONTS, RATIOS, THEMES } from './presets.js';

export { DEFAULT_SPEC };

const DIRECTIONS = ['horizontal', 'vertical'];
const ALIGNS = ['left', 'center', 'right'];
const FONT_IDS = ['auto', ...FONTS.map((font) => font.id)];

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function textValue(value, fallback, maxLength) {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLength);
}

export function normalizeSpec(partial) {
  const source = partial && typeof partial === 'object' ? partial : {};
  return {
    text: textValue(source.text, DEFAULT_SPEC.text, 4000),
    themeId: THEMES.some((theme) => theme.id === source.themeId) ? source.themeId : DEFAULT_SPEC.themeId,
    ratioId: RATIOS.some((ratio) => ratio.id === source.ratioId) ? source.ratioId : DEFAULT_SPEC.ratioId,
    direction: DIRECTIONS.includes(source.direction) ? source.direction : DEFAULT_SPEC.direction,
    align: ALIGNS.includes(source.align) ? source.align : DEFAULT_SPEC.align,
    fontId: FONT_IDS.includes(source.fontId) ? source.fontId : DEFAULT_SPEC.fontId,
    headline: typeof source.headline === 'boolean' ? source.headline : DEFAULT_SPEC.headline,
    footer: textValue(source.footer, DEFAULT_SPEC.footer, 40),
    tag: textValue(source.tag, DEFAULT_SPEC.tag, 16),
    seed: Math.round(clampNumber(source.seed, DEFAULT_SPEC.seed, 0, 999999)),
    fontSize: clampNumber(source.fontSize, DEFAULT_SPEC.fontSize, 0.7, 1.4),
    lineHeight: clampNumber(source.lineHeight, DEFAULT_SPEC.lineHeight, 1.3, 2.2),
    letterSpacing: clampNumber(source.letterSpacing, DEFAULT_SPEC.letterSpacing, 0, 0.16),
    margin: clampNumber(source.margin, DEFAULT_SPEC.margin, 0.05, 0.16),
  };
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

const SHARE_KEYS = Object.keys(DEFAULT_SPEC);

export function toShareHash(spec) {
  try {
    const normalized = normalizeSpec(spec);
    const payload = {};
    for (const key of SHARE_KEYS) {
      if (normalized[key] !== DEFAULT_SPEC[key]) payload[key] = normalized[key];
    }
    if (!Object.keys(payload).length) return '';
    const json = JSON.stringify(payload);
    return bytesToBase64( new TextEncoder().encode(json));
  } catch {
    return '';
  }
}

export function fromShareHash(input) {
  if (typeof input !== 'string') return null;
  let raw = input.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      raw = new URL(raw).hash;
    } catch {
      return null;
    }
  }
  raw = raw.replace(/^#/, '').replace(/^s=/, '');
  if (!raw) return null;
  try {
    const json = new TextDecoder().decode(base64ToBytes(raw));
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object') return null;
    return normalizeSpec({ ...DEFAULT_SPEC, ...payload });
  } catch {
    return null;
  }
}

export function posterFileName(spec) {
  const themeId = String(spec?.themeId || DEFAULT_SPEC.themeId).replace(/[^a-z0-9-]/gi, '-');
  const ratioId = String(spec?.ratioId || DEFAULT_SPEC.ratioId).replace(':', 'x').replace(/[^0-9x]/gi, '');
  const seed = Math.round(clampNumber(spec?.seed, DEFAULT_SPEC.seed, 0, 999999));
  return `zijian-${themeId}-${ratioId}-${seed}.png`;
}
