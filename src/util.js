// Utilitarios compartilhados (sem dependencias externas).

export const uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9));

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const isoDate = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const brDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d ? `${d}/${m}/${y}` : iso;
};

export const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Cria elemento com atributos e filhos. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Toast no rodape. */
export function toast(msg, kind = '') {
  const root = $('#toasts');
  const t = el('div', { class: `toast ${kind}` }, msg);
  root.append(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2200);
  setTimeout(() => t.remove(), 2600);
}

/** Modal simples. Retorna { close }. body = elemento; footer = array de botoes. */
export function modal({ title, body, footer = [], width }) {
  const root = $('#modalRoot');
  const backdrop = el('div', { class: 'modal-backdrop' });
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  const m = el('div', { class: 'modal', style: width ? { width } : {} },
    el('header', {}, el('h2', { text: title }), el('div', { class: 'spacer' }),
      el('button', { class: 'btn ghost btn-sm', onclick: close }, '✕')),
    el('div', { class: 'body' }, body),
    footer.length ? el('div', { class: 'foot' }, ...footer) : null
  );
  backdrop.append(m);
  root.append(backdrop);
  return { close, backdrop };
}

export function confirmDialog(message, { okLabel = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    const ok = el('button', { class: `btn ${danger ? 'danger' : 'primary'}` }, okLabel);
    const cancel = el('button', { class: 'btn ghost' }, 'Cancelar');
    const m = modal({ title: 'Confirmar', body: el('p', { style: { lineHeight: '1.5', fontSize: '13px' }, text: message }), footer: [cancel, ok], width: '420px' });
    ok.onclick = () => { m.close(); resolve(true); };
    cancel.onclick = () => { m.close(); resolve(false); };
  });
}

/** Dispara download de um Blob/URL. */
export function download(filenameOrBlob, blobOrUrl) {
  let filename, url, revoke = false;
  if (typeof filenameOrBlob === 'string') { filename = filenameOrBlob; }
  url = blobOrUrl;
  if (url instanceof Blob) { url = URL.createObjectURL(url); revoke = true; }
  const a = el('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const readFileAsDataURL = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = rej;
  fr.readAsDataURL(file);
});

/** Debounce simples. */
export function debounce(fn, ms = 400) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** Slug seguro para nome de arquivo. */
export const slug = (s = 'ficha') =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_') || 'ficha';
