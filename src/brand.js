// Identidade da marca: wordmark #TBT em SVG (vetorial) e suporte a logo
// customizado (PNG/JPG enviado pelo usuario, recortado automaticamente).
import * as db from './db.js?v=18';

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

// Emblema do APP "Ficha Técnica": cartão de ficha + pesponto tracejado (a costura
// icônica do jeans, em laranja) + barra de título e régua de medidas (azul técnico),
// sobre azul-denim. Usado no favicon e na topbar (o #TBT segue na ficha impressa).
export function fichaLogoSVG(size = 30) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ficha Técnica TBT">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#243a73"/>
  <rect x="15" y="11" width="34" height="42" rx="5" fill="#ffffff"/>
  <rect x="19" y="15" width="26" height="34" rx="3" fill="none" stroke="#e0651f" stroke-width="1.6" stroke-dasharray="2.8 2.6" stroke-linecap="round"/>
  <rect x="23" y="20" width="18" height="3.6" rx="1.8" fill="#2f6fed"/>
  <rect x="23" y="28" width="18" height="2.3" rx="1.15" fill="#ccd0da"/>
  <rect x="23" y="32.6" width="12" height="2.3" rx="1.15" fill="#ccd0da"/>
  <rect x="24" y="40" width="1.3" height="3" rx="0.5" fill="#2f6fed"/>
  <rect x="29" y="40" width="1.3" height="3" rx="0.5" fill="#2f6fed"/>
  <rect x="34" y="40" width="1.3" height="3" rx="0.5" fill="#2f6fed"/>
  <rect x="39" y="40" width="1.3" height="3" rx="0.5" fill="#2f6fed"/>
  <rect x="23" y="43" width="18" height="1.5" rx="0.7" fill="#2f6fed"/>
</svg>`;
}
export function fichaLogoEl(size = 30) {
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.innerHTML = fichaLogoSVG(size);
  return span;
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

const ASSET = 'assets/logo-tbt.png'; // logo fixo do site (fundo claro)

// Retorna um elemento DOM com o logo.
// variant 'chrome' (topbar escura): sempre o wordmark branco vetorial.
// variant 'paper'  (cabeçalho da ficha, fundo branco): logo enviado > asset fixo > wordmark preto.
export function brandLogoEl({ height = 28, color = 'currentColor', maxWidth = 170, variant = 'paper' } = {}) {
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  if (variant === 'chrome') { span.innerHTML = tbtWordmark(color, height); return span; }

  const mkImg = (src) => {
    const img = document.createElement('img');
    img.src = src; img.alt = 'Logo';
    img.style.height = height + 'px'; img.style.width = 'auto';
    img.style.maxWidth = maxWidth + 'px'; img.style.objectFit = 'contain';
    return img;
  };
  if (_custom) { span.append(mkImg(_custom)); return span; }
  const img = mkImg(ASSET);
  img.onerror = () => { span.innerHTML = tbtWordmark('#111', height); };
  span.append(img);
  return span;
}
