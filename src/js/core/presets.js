export const FONTS = [
  {
    id: 'serif',
    label: '宋体',
    stack: '"Songti SC","Source Han Serif SC","Noto Serif CJK SC",SimSun,"Times New Roman",serif',
  },
  {
    id: 'sans',
    label: '黑体',
    stack: '"PingFang SC","Microsoft YaHei","Source Han Sans SC","Noto Sans CJK SC",system-ui,"Helvetica Neue",Arial,sans-serif',
  },
  {
    id: 'kai',
    label: '楷体',
    stack: '"Kaiti SC",KaiTi,STKaiti,"Songti SC",SimSun,serif',
  },
  {
    id: 'mono',
    label: '等宽',
    stack: '"JetBrains Mono","SF Mono",Consolas,"Courier New",monospace',
  },
];

export const RATIOS = [
  { id: '3:4', label: '3:4', width: 1080, height: 1440, hint: '小红书' },
  { id: '4:5', label: '4:5', width: 1080, height: 1350, hint: 'Instagram' },
  { id: '1:1', label: '1:1', width: 1080, height: 1080, hint: '方图' },
  { id: '9:16', label: '9:16', width: 1080, height: 1920, hint: '故事' },
  { id: '16:9', label: '16:9', width: 1920, height: 1080, hint: '横版' },
];

export const THEMES = [
  {
    id: 'ink',
    name: '宣纸',
    bg: { from: '#f7f3e7', to: '#e5ddc9', angle: 155 },
    ink: '#15140f',
    accent: '#b8352a',
    muted: 'rgba(21,20,15,0.55)',
    fontId: 'serif',
    deco: 'frame',
    grain: 0.1,
    titleWeight: 700,
    bodyWeight: 400,
    swatch: ['#f7f3e7', '#e5ddc9', '#b8352a'],
  },
  {
    id: 'midnight',
    name: '夜航',
    bg: {
      from: '#080c13',
      to: '#16202e',
      angle: 165,
      glow: { color: 'rgba(107,231,255,0.16)', x: 0.74, y: 0.16, r: 0.85 },
    },
    ink: '#eef4f8',
    accent: '#6be7ff',
    muted: 'rgba(238,244,248,0.52)',
    fontId: 'sans',
    deco: 'grid',
    grain: 0.06,
    titleWeight: 700,
    bodyWeight: 300,
    swatch: ['#080c13', '#16202e', '#6be7ff'],
  },
  {
    id: 'neon',
    name: '霓虹',
    bg: {
      from: '#0e0418',
      to: '#2b0a3f',
      angle: 140,
      glow: { color: 'rgba(255,62,165,0.28)', x: 0.28, y: 0.2, r: 0.7 },
    },
    ink: '#fdf0ff',
    accent: '#ff3ea5',
    muted: 'rgba(253,240,255,0.55)',
    fontId: 'sans',
    deco: 'halo',
    grain: 0.07,
    titleWeight: 800,
    bodyWeight: 400,
    swatch: ['#0e0418', '#2b0a3f', '#ff3ea5'],
  },
  {
    id: 'sunset',
    name: '落日',
    bg: {
      from: '#1b0f1f',
      to: '#5c1f2e',
      angle: 120,
      glow: { color: 'rgba(255,138,76,0.32)', x: 0.5, y: 0.78, r: 0.75 },
    },
    ink: '#fff2e6',
    accent: '#ffb347',
    muted: 'rgba(255,242,230,0.58)',
    fontId: 'serif',
    deco: 'halo',
    grain: 0.09,
    titleWeight: 700,
    bodyWeight: 400,
    swatch: ['#1b0f1f', '#5c1f2e', '#ffb347'],
  },
  {
    id: 'moss',
    name: '苔原',
    bg: { from: '#0e1f18', to: '#1f3a2c', angle: 150 },
    ink: '#e9f3ea',
    accent: '#b6e86b',
    muted: 'rgba(233,243,234,0.5)',
    fontId: 'sans',
    deco: 'rules',
    grain: 0.07,
    titleWeight: 700,
    bodyWeight: 300,
    swatch: ['#0e1f18', '#1f3a2c', '#b6e86b'],
  },
  {
    id: 'editorial',
    name: '杂志',
    bg: { from: '#f4f3ee', to: '#dfddd2', angle: 170 },
    ink: '#111111',
    accent: '#1f4bff',
    muted: 'rgba(17,17,17,0.5)',
    fontId: 'serif',
    deco: 'grid',
    grain: 0.05,
    titleWeight: 700,
    bodyWeight: 400,
    swatch: ['#f4f3ee', '#dfddd2', '#1f4bff'],
  },
  {
    id: 'ocean',
    name: '深海',
    bg: { from: '#03121f', to: '#0b3049', angle: 160 },
    ink: '#e7f4ff',
    accent: '#55c8ff',
    muted: 'rgba(231,244,255,0.5)',
    fontId: 'sans',
    deco: 'frame',
    grain: 0.05,
    titleWeight: 700,
    bodyWeight: 300,
    swatch: ['#03121f', '#0b3049', '#55c8ff'],
  },
  {
    id: 'tape',
    name: '磁带',
    bg: { from: '#1a1917', to: '#2d2b26', angle: 135 },
    ink: '#f6efdf',
    accent: '#ffcf5c',
    muted: 'rgba(246,239,223,0.5)',
    fontId: 'mono',
    deco: 'stamp',
    grain: 0.12,
    titleWeight: 700,
    bodyWeight: 400,
    swatch: ['#1a1917', '#2d2b26', '#ffcf5c'],
  },
  {
    id: 'blush',
    name: '柔粉',
    bg: { from: '#fdeef1', to: '#f3d6dd', angle: 150 },
    ink: '#3b232a',
    accent: '#c93f63',
    muted: 'rgba(59,35,42,0.55)',
    fontId: 'kai',
    deco: 'dots',
    grain: 0.09,
    titleWeight: 600,
    bodyWeight: 400,
    swatch: ['#fdeef1', '#f3d6dd', '#c93f63'],
  },
  {
    id: 'mono',
    name: '极黑',
    bg: { from: '#050505', to: '#141414', angle: 180 },
    ink: '#f7f7f7',
    accent: '#f7f7f7',
    muted: 'rgba(247,247,247,0.5)',
    fontId: 'sans',
    deco: 'rules',
    grain: 0.04,
    titleWeight: 700,
    bodyWeight: 300,
    swatch: ['#050505', '#141414', '#f7f7f7'],
  },
];

export const SAMPLES = [
  {
    id: 'poem',
    label: '短诗',
    text: '凌晨四点的海面很安静\n风把最后一句台词吹散\n我站在原地\n等一场不会来的潮汐',
  },
  {
    id: 'quote',
    label: '摘录',
    text: '我们终其一生，就是要摆脱他人的期待，找到真正的自己。',
  },
  {
    id: 'event',
    label: '活动',
    text: '周六 19:30 · 旧工厂书店\n《城市与它的影子》新书分享会\n限 40 人，先到先得',
  },
  {
    id: 'brand',
    label: '品牌',
    text: '把复杂的事情，做得简单。\nZIJIAN STUDIO · 2026',
  },
];

export const PLACEHOLDER_TEXT = '把想说的话，排成一张海报。\n在这里输入你的文字……';

export const DEFAULT_SPEC = {
  text: '',
  themeId: 'ink',
  ratioId: '3:4',
  direction: 'horizontal',
  align: 'left',
  fontId: 'auto',
  headline: true,
  footer: '',
  tag: '',
  seed: 42,
  fontSize: 1,
  lineHeight: 1.75,
  letterSpacing: 0.02,
  margin: 0.09,
};

export const DECOS = ['frame', 'grid', 'halo', 'rules', 'dots', 'stamp'];

export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) || THEMES[0];
}

export function getRatio(id) {
  return RATIOS.find((ratio) => ratio.id === id) || RATIOS[0];
}

export function getTextBox(ratio, margin) {
  const width = Number(ratio?.width) || RATIOS[0].width;
  const height = Number(ratio?.height) || RATIOS[0].height;
  const short = Math.min(width, height);
  const safeMargin = Number.isFinite(margin) ? Math.min(0.16, Math.max(0.05, margin)) : DEFAULT_SPEC.margin;
  const inset = short * safeMargin;
  const footerHeight = short * 0.06;
  return {
    x: inset,
    y: inset * 1.15,
    width: width - inset * 2,
    height: height - inset * 2 - footerHeight,
    footerHeight,
    short,
  };
}

export function resolveFontStack(fontId, themeFontId) {
  const id = fontId === 'auto' || !fontId ? themeFontId : fontId;
  return (FONTS.find((font) => font.id === id) || FONTS[0]).stack;
}

export function randomStyle(rng) {
  return {
    themeId: rng.pick(THEMES).id,
    ratioId: rng.pick(RATIOS).id,
    direction: rng.pick(['horizontal', 'horizontal', 'vertical']),
    align: rng.pick(['left', 'center', 'center', 'right']),
  };
}
