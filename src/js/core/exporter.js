import { getRatio } from './presets.js';
import { renderPoster } from './renderer.js';
import { posterFileName } from './spec.js';

export function renderToCanvas(spec, { scale = 2 } = {}) {
  if (typeof document === 'undefined') return null;
  const ratio = getRatio(spec.ratioId);
  const factor = Math.max(1, Math.min(4, Number(scale) || 2));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ratio.width * factor);
  canvas.height = Math.round(ratio.height * factor);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(factor, 0, 0, factor, 0, 0);
  renderPoster(ctx, spec, { width: ratio.width, height: ratio.height });
  return canvas;
}

export function posterBlob(spec, scale = 2) {
  const canvas = renderToCanvas(spec, { scale });
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function downloadPoster(spec) {
  const blob = await posterBlob(spec, 2);
  if (!blob) throw new Error('export_failed');
  const filename = posterFileName(spec);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { filename, bytes: blob.size };
}

export async function copyPoster(spec) {
  const blob = await posterBlob(spec, 2);
  if (!blob) throw new Error('export_failed');
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      throw new Error('unsupported');
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'image';
  } catch {
    await downloadPoster(spec);
    return 'download';
  }
}
