import {
  DEFAULT_SPEC,
  fromShareHash,
  normalizeSpec,
  posterFileName,
  toShareHash,
} from '../core/spec.js';
import {
  FONTS,
  PLACEHOLDER_TEXT,
  RATIOS,
  SAMPLES,
  THEMES,
  getRatio,
  getTheme,
  randomStyle,
} from '../core/presets.js';
import { createRng } from '../core/rng.js';
import { renderPoster } from '../core/renderer.js';
import { copyPoster, downloadPoster } from '../core/exporter.js';

const STORAGE_KEY = 'zijian.state.v1';
const INITIAL_TEXT = SAMPLES[0].text;

const el = {
  stage: document.getElementById('stage'),
  canvas: document.getElementById('poster'),
  text: document.getElementById('text-input'),
  count: document.getElementById('char-count'),
  samples: document.getElementById('samples'),
  themes: document.getElementById('themes'),
  themeName: document.getElementById('theme-name'),
  ratios: document.getElementById('ratios'),
  directions: document.getElementById('directions'),
  aligns: document.getElementById('aligns'),
  directionNote: document.getElementById('direction-note'),
  headline: document.getElementById('headline-toggle'),
  fontSelect: document.getElementById('font-select'),
  footer: document.getElementById('footer-input'),
  tag: document.getElementById('tag-input'),
  metaSize: document.getElementById('meta-size'),
  seed: document.getElementById('seed-btn'),
  download: document.getElementById('download-btn'),
  copy: document.getElementById('copy-btn'),
  share: document.getElementById('share-btn'),
  reset: document.getElementById('reset-btn'),
  random: document.getElementById('random-btn'),
  toast: document.getElementById('toast'),
};

const sliders = [...document.querySelectorAll('input[type="range"][data-field]')];
const ctx = el.canvas.getContext('2d');

let state = loadState();
let frameId = 0;
let toastTimer = 0;
let saveTimer = 0;

function loadState() {
  const shared = location.hash ? fromShareHash(location.hash) : null;
  if (shared) return shared;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeSpec(JSON.parse(raw));
  } catch {
    /* 隐私模式或损坏的旧数据，直接走默认 */
  }
  return normalizeSpec({ ...DEFAULT_SPEC, text: INITIAL_TEXT, footer: '字间 ZIJIAN', tag: '文字海报' });
}

function saveSoon() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* 存储已满或被禁用，静默失败 */
    }
  }, 400);
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.toast.classList.remove('show'), 2200);
}

function buildControls() {
  el.samples.innerHTML = '';
  for (const sample of SAMPLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = sample.label;
    button.dataset.sample = sample.id;
    el.samples.append(button);
  }

  el.themes.innerHTML = '';
  for (const theme of THEMES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme';
    button.dataset.theme = theme.id;
    button.setAttribute('aria-label', `主题：${theme.name}`);
    button.setAttribute('aria-pressed', String(theme.id === state.themeId));

    const swatch = document.createElement('span');
    swatch.className = 'theme-swatch';
    swatch.style.background = `linear-gradient(${theme.bg.angle}deg, ${theme.bg.from}, ${theme.bg.to})`;
    swatch.style.setProperty('--dot', theme.accent);

    const name = document.createElement('span');
    name.className = 'theme-name';
    name.textContent = theme.name;

    button.append(swatch, name);
    el.themes.append(button);
  }

  el.ratios.innerHTML = '';
  for (const ratio of RATIOS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.value = ratio.id;
    button.textContent = ratio.label;
    button.title = ratio.hint;
    button.setAttribute('aria-pressed', String(ratio.id === state.ratioId));
    el.ratios.append(button);
  }

  el.fontSelect.innerHTML = '';
  const auto = document.createElement('option');
  auto.value = 'auto';
  auto.textContent = '跟随主题';
  el.fontSelect.append(auto);
  for (const font of FONTS) {
    const option = document.createElement('option');
    option.value = font.id;
    option.textContent = font.label;
    el.fontSelect.append(option);
  }
}

function setGroupActive(container, activeValue) {
  for (const button of container.querySelectorAll('button[data-value]')) {
    button.setAttribute('aria-pressed', String(button.dataset.value === activeValue));
  }
}

function syncControls() {
  const active = document.activeElement;
  if (active !== el.text) el.text.value = state.text;
  if (active !== el.footer) el.footer.value = state.footer;
  if (active !== el.tag) el.tag.value = state.tag;

  el.count.textContent = `${state.text.length} 字`;
  el.count.style.color = state.text.length > 1000 ? 'var(--accent)' : '';

  for (const theme of el.themes.querySelectorAll('button[data-theme]')) {
    theme.setAttribute('aria-pressed', String(theme.dataset.theme === state.themeId));
  }
  el.themeName.textContent = getTheme(state.themeId).name;
  setGroupActive(el.ratios, state.ratioId);
  setGroupActive(el.directions, state.direction);
  setGroupActive(el.aligns, state.align);
  el.directionNote.hidden = state.direction !== 'vertical';

  el.headline.checked = state.headline;
  el.fontSelect.value = state.fontId;

  for (const slider of sliders) {
    const field = slider.dataset.field;
    slider.value = String(state[field]);
    const label = document.getElementById(`${field}-value`);
    if (label) {
      const digits = field === 'letterSpacing' || field === 'margin' ? 2 : 2;
      label.textContent = Number(state[field]).toFixed(digits);
    }
  }

  const ratio = getRatio(state.ratioId);
  el.metaSize.textContent = `${ratio.width} × ${ratio.height} · ${ratio.label}`;
  el.seed.textContent = `seed ${state.seed}`;
  el.download.disabled = !state.text.trim();
  el.copy.disabled = !state.text.trim();
}

function draw() {
  const ratio = getRatio(state.ratioId);
  const styles = window.getComputedStyle(el.stage);
  const availableWidth = el.stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const availableHeight = el.stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
  if (availableWidth <= 0 || availableHeight <= 0) return;

  const fit = Math.min(availableWidth / ratio.width, availableHeight / ratio.height);
  const cssWidth = Math.max(80, Math.floor(ratio.width * fit));
  const cssHeight = Math.max(80, Math.floor(ratio.height * fit));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  el.canvas.style.width = `${cssWidth}px`;
  el.canvas.style.height = `${cssHeight}px`;
  el.canvas.width = Math.round(cssWidth * dpr);
  el.canvas.height = Math.round(cssHeight * dpr);

  const scale = el.canvas.width / ratio.width;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const spec = state.text.trim() ? state : { ...state, text: PLACEHOLDER_TEXT };
  try {
    renderPoster(ctx, spec, { width: ratio.width, height: ratio.height });
  } catch (error) {
    console.error(error);
    toast('渲染失败，请刷新重试');
  }
}

function scheduleDraw() {
  if (frameId) return;
  frameId = window.requestAnimationFrame(() => {
    frameId = 0;
    draw();
  });
}

function update(patch, options = {}) {
  state = normalizeSpec({ ...state, ...patch });
  if (options.persist !== false) saveSoon();
  syncControls();
  if (options.redraw !== false) scheduleDraw();
}

el.text.addEventListener('input', () => {
  state = normalizeSpec({ ...state, text: el.text.value });
  el.count.textContent = `${state.text.length} 字`;
  el.count.style.color = state.text.length > 1000 ? 'var(--accent)' : '';
  el.download.disabled = !state.text.trim();
  el.copy.disabled = !state.text.trim();
  saveSoon();
  scheduleDraw();
});

el.samples.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-sample]');
  if (!button) return;
  const sample = SAMPLES.find((item) => item.id === button.dataset.sample);
  if (!sample) return;
  update({ text: sample.text });
  el.text.focus();
});

el.themes.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-theme]');
  if (!button) return;
  update({ themeId: button.dataset.theme });
});

el.ratios.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (!button) return;
  update({ ratioId: button.dataset.value });
});

el.directions.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (!button) return;
  update({ direction: button.dataset.value });
});

el.aligns.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (!button) return;
  update({ align: button.dataset.value });
});

el.headline.addEventListener('change', () => update({ headline: el.headline.checked }));
el.fontSelect.addEventListener('change', () => update({ fontId: el.fontSelect.value }));
el.footer.addEventListener('input', () => update({ footer: el.footer.value }, { redraw: true }));
el.tag.addEventListener('input', () => update({ tag: el.tag.value }, { redraw: true }));

for (const slider of sliders) {
  slider.addEventListener('input', () => {
    const field = slider.dataset.field;
    const value = Number(slider.value);
    state = normalizeSpec({ ...state, [field]: value });
    const label = document.getElementById(`${field}-value`);
    if (label) label.textContent = value.toFixed(2);
    saveSoon();
    scheduleDraw();
  });
}

el.random.addEventListener('click', () => {
  const seed = Math.floor(Math.random() * 1000000);
  const style = randomStyle(createRng(seed));
  update({ ...style, seed, headline: Math.random() < 0.75 });
  toast(`换了一套：${getTheme(style.themeId).name} · ${style.ratioId}`);
});

el.download.addEventListener('click', async () => {
  if (!state.text.trim()) return;
  el.download.disabled = true;
  try {
    const { filename, bytes } = await downloadPoster(state);
    const size = bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
    toast(`已导出 ${filename}（${size}）`);
  } catch (error) {
    console.error(error);
    toast('导出失败，请重试');
  } finally {
    el.download.disabled = false;
  }
});

el.copy.addEventListener('click', async () => {
  if (!state.text.trim()) return;
  try {
    const result = await copyPoster(state);
    toast(result === 'image' ? '图片已复制到剪贴板' : '剪贴板不可用，已改为下载');
  } catch (error) {
    console.error(error);
    toast('复制失败，请直接下载');
  }
});

el.share.addEventListener('click', async () => {
  const hash = toShareHash(state);
  const base = `${location.origin}${location.pathname}`;
  const url = hash ? `${base}#s=${hash}` : base;
  try {
    await navigator.clipboard.writeText(url);
    toast(url.length > 3000 ? '链接较长，部分平台可能截断，建议直接下载图片' : '分享链接已复制');
  } catch {
    if (hash) location.hash = `s=${hash}`;
    toast('已写入地址栏，可直接复制');
  }
});

el.seed.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(String(state.seed));
    toast(`seed ${state.seed} 已复制`);
  } catch {
    toast(`seed ${state.seed}`);
  }
});

el.reset.addEventListener('click', () => {
  if (!window.confirm('重置为默认样式？文字与署名会保留。')) return;
  state = normalizeSpec({
    ...DEFAULT_SPEC,
    text: state.text,
    footer: state.footer,
    tag: state.tag,
  });
  saveSoon();
  syncControls();
  scheduleDraw();
  toast('样式已重置');
});

window.addEventListener('keydown', (event) => {
  const meta = event.metaKey || event.ctrlKey;
  if (!meta) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    el.random.click();
  } else if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    el.download.click();
  }
});

const observer = new ResizeObserver(() => scheduleDraw());
observer.observe(el.stage);

buildControls();
syncControls();
scheduleDraw();

if (document.fonts?.ready) {
  document.fonts.ready.then(() => scheduleDraw());
}

window.addEventListener('beforeunload', () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 忽略 */
  }
});

// 供调试与验收使用（不参与渲染）
window.__zijian = {
  get state() {
    return { ...state };
  },
  posterFileName,
};
