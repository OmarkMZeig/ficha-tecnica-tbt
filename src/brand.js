// Identidade da marca: wordmark #TBT em SVG (vetorial) e suporte a logo
// customizado (PNG/JPG enviado pelo usuario, recortado automaticamente).
import * as db from './db.js';

// Wordmark "#TBT": cerquilha desenhada (rects) + "TBT" em fonte pesada universal.
export function tbtWordmark(color = 'currentColor', height = 28) {
  const w = (height * 232) / 64;
  return `
<svg viewBox="0 0 232 64" height="${height}" width="${w}" fill="${color}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="#TBT">
  <rect x="20" y="3"  width="9"  height="58" rx="1"/>
  <rect x="40" y="3"  width="9"  height="58" rx="1"/>
  <rect x="3"  y="20" width="63" height="9"  rx="1"/>
  <rect x="3"  y="38" width="63" height="9"  rx="1"/>
  <text x="80" y="49" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="56" letter-spacing="-1">TBT</text>
</svg>`;
}

let _custom = undefined; // dataURL ou null

export async function loadBrandLogo() {
  if (_custom !== undefined) return _custom;
  const raw = (await db.getMeta('brandLogo')) || null;
  if (raw) {
    // recorta logos salvos antes da correcao (idempotente p/ ja recortados)
    const trimmed = await trimToContent(raw).catch(() => raw);
    if (trimmed !== raw) await db.setMeta('brandLogo', trimmed);
    _custom = trimmed;
  } else {
    _custom = null;
  }
  return _custom;
}
export function brandLogo() { return _custom || null; }

export async function setBrandLogo(dataUrl) {
  _custom = dataUrl ? await trimToContent(dataUrl).catch(() => dataUrl) : null;
  await db.setMeta('brandLogo', _custom);
  return _custom;
}

// Recorta a margem em branco/transparente ao redor da arte do logo.
export function trimToContent(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      if (!W || !H) return resolve(dataUrl);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      let data;
      try { data = ctx.getImageData(0, 0, W, H).data; } catch (e) { return resolve(dataUrl); }
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const a = data[i + 3];
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const isBlank = a < 12 || (r > 244 && g > 244 && b > 244);
          if (!isBlank) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return resolve(dataUrl); // imagem toda branca/transparente
      const pad = Math.max(2, Math.round(Math.max(maxX - minX, maxY - minY) * 0.05));
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
      const w = maxX - minX + 1, h = maxY - minY + 1;
      const o = document.createElement('canvas'); o.width = w; o.height = h;
      o.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, w, h);
      resolve(o.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Retorna um elemento DOM com o logo (custom se houver, senao o wordmark).
export function brandLogoEl({ height = 28, color = 'currentColor', maxWidth = 150 } = {}) {
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  if (_custom) {
    const img = document.createElement('img');
    img.src = _custom;
    img.style.height = height + 'px';
    img.style.width = 'auto';
    img.style.maxWidth = maxWidth + 'px';
    img.style.objectFit = 'contain';
    img.alt = 'Logo';
    span.append(img);
  } else {
    span.innerHTML = tbtWordmark(color, height);
  }
  return span;
}
