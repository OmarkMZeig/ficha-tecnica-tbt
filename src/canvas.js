// Prancheta de desenho: objetos posicionados livremente (imagens, marcacoes,
// caixas de texto, numeros) com mover / redimensionar / girar.
// Modelo unificado: todo objeto e um bbox { x, y, w, h, rot }.
import { el, clamp, escapeHtml, toast } from './util.js?v=17';
import { store, commit, touch, imageUrl } from './store.js?v=17';
import { newObject } from './model.js?v=17';

let boardEl = null;
let tool = 'select';
let selectedId = null;
let onSelectCb = () => {};
let selbox = null;

const rad = (d) => (d * Math.PI) / 180;
const rotate = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
const objs = () => store.current.board.objects;
const find = (id) => objs().find((o) => o.id === id);

function scale() { return boardEl ? boardEl.getBoundingClientRect().width / boardEl.offsetWidth : 1; }
function boardPoint(e) {
  const r = boardEl.getBoundingClientRect();
  const s = scale();
  return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
}

export function mountBoard(element, { onSelect } = {}) {
  boardEl = element;
  if (onSelect) onSelectCb = onSelect;
  selectedId = null;
  boardEl.innerHTML = '';
  selbox = null;
  for (const o of objs().sort((a, b) => a.z - b.z)) boardEl.append(renderObject(o));
  boardEl.onpointerdown = onBoardPointerDown;
}

export function setTool(t) {
  tool = t;
  boardEl.classList.toggle('tool-active', t !== 'select');
  document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
}
export const getTool = () => tool;

// ---------- Renderizacao ----------
function renderObject(o) {
  const node = el('div', { class: `obj type-${o.type}`, dataset: { id: o.id } });
  applyBox(node, o);
  node.append(buildBody(o));
  node.addEventListener('pointerdown', (e) => onObjectPointerDown(e, o));
  if (o.type === 'text' || o.type === 'callout') {
    node.addEventListener('dblclick', (e) => { e.stopPropagation(); startTextEdit(o); });
  }
  return node;
}

function applyBox(node, o) {
  node.style.left = o.x + 'px';
  node.style.top = o.y + 'px';
  node.style.width = o.w + 'px';
  node.style.height = o.h + 'px';
  node.style.transform = `rotate(${o.rot || 0}deg)`;
  node.style.transformOrigin = 'center center';
  node.style.zIndex = o.z;
}

function buildBody(o) {
  if (o.type === 'image') {
    const img = el('img', { class: 'obj-body', src: imageUrl(o.imgKey) || '', draggable: 'false', alt: '' });
    return img;
  }
  if (o.type === 'text') {
    const d = el('div', { class: 'obj-body' });
    styleText(d, o);
    d.textContent = o.text || '';
    return d;
  }
  if (o.type === 'callout') {
    const wrap = el('div', { class: 'obj-body' });
    wrap.style.cssText = `border:${o.strokeW}px solid ${o.stroke};background:${o.fill};border-radius:7px;padding:5px 8px;box-sizing:border-box;position:relative;`;
    const txt = el('div');
    txt.textContent = o.text || '';
    txt.style.cssText = `font-family:${o.font || 'Arial'};font-size:${o.size}px;color:${o.color};line-height:1.2;pointer-events:none;`;
    wrap.append(txt);
    // rabicho
    const tail = el('div');
    tail.style.cssText = `position:absolute;left:14px;bottom:-9px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:9px solid ${o.stroke};`;
    wrap.append(tail);
    return wrap;
  }
  if (o.type === 'number') {
    const d = el('div', { class: 'obj-body' });
    d.style.background = o.fill; d.style.color = o.color;
    d.style.fontSize = Math.round(Math.min(o.w, o.h) * 0.55) + 'px';
    d.textContent = o.value;
    return d;
  }
  if (o.type === 'zoom') return buildZoomBody(o);

  // formas vetoriais
  const holder = el('div', { class: 'obj-body' });
  holder.innerHTML = shapeSVG(o);
  return holder;
}

function buildZoomBody(o) {
  const holder = el('div', { class: 'obj-body' });
  holder.style.cssText = `position:relative; overflow:hidden; background:#fff; border:${o.strokeW}px solid ${o.stroke}; border-radius:${o.shape === 'rect' ? '4px' : '50%'};`;
  const src = objs().find((x) => x.id === o.srcId && x.type === 'image');
  const url = src && imageUrl(src.imgKey);
  if (src && url) {
    const fw = Math.max(0.02, o.fw || 0.25);
    const mag = o.w / (fw * src.w);          // amplia a região selecionada p/ preencher a largura
    const innerW = src.w * mag, innerH = src.h * mag;
    const wrap = el('div', {});
    wrap.style.cssText = `position:absolute; width:${innerW}px; height:${innerH}px; left:${-o.fx * innerW}px; top:${-o.fy * innerH}px;`;
    const img = el('img', { src: url, draggable: 'false' });
    img.style.cssText = 'width:100%; height:100%; object-fit:contain; display:block;';
    wrap.append(img);
    holder.append(wrap);
  } else {
    holder.style.display = 'grid'; holder.style.placeItems = 'center';
    holder.append(el('span', { style: { fontSize: '9px', color: '#999' } }, '🔍 zoom'));
  }
  return holder;
}

function styleText(d, o) {
  d.style.fontFamily = o.font || 'Arial';
  d.style.fontSize = (o.size || 13) + 'px';
  d.style.color = o.color || '#1a1a1a';
  d.style.fontWeight = o.bold ? '700' : '400';
  d.style.fontStyle = o.italic ? 'italic' : 'normal';
  d.style.textDecoration = o.underline ? 'underline' : 'none';
  d.style.textAlign = o.align || 'left';
}

function shapeSVG(o) {
  const { w, h, strokeW: sw, stroke: s } = o;
  const f = o.fill && o.fill !== 'none' ? o.fill : 'none';
  const p = Math.max(sw, 3);
  const svg = (inner) => `<svg class="obj-body" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${inner}</svg>`;
  if (o.type === 'rect') return svg(`<rect x="${p / 2}" y="${p / 2}" width="${Math.max(0, w - p)}" height="${Math.max(0, h - p)}" fill="${f}" stroke="${s}" stroke-width="${sw}"/>`);
  if (o.type === 'circle') return svg(`<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(0, (w - p) / 2)}" ry="${Math.max(0, (h - p) / 2)}" fill="${f}" stroke="${s}" stroke-width="${sw}"/>`);
  if (o.type === 'line') return svg(`<line x1="${p}" y1="${h / 2}" x2="${w - p}" y2="${h / 2}" stroke="${s}" stroke-width="${sw}" stroke-linecap="round"/>`);
  if (o.type === 'arrow') {
    const id = 'ah-' + o.id;
    return svg(`<defs><marker id="${id}" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="${s}"/></marker></defs>` +
      `<line x1="${p}" y1="${h / 2}" x2="${w - p * 2}" y2="${h / 2}" stroke="${s}" stroke-width="${sw}" stroke-linecap="round" marker-end="url(#${id})"/>`);
  }
  return svg('');
}

// Recria o corpo do objeto (usado apos resize/edicao de props)
function rebuildBody(o) {
  const node = boardEl.querySelector(`.obj[data-id="${o.id}"]`);
  if (!node) return;
  applyBox(node, o);
  node.innerHTML = '';
  node.append(buildBody(o));
}

// ---------- Selecao ----------
export function select(id) {
  selectedId = id;
  objs().forEach((o) => {
    const n = boardEl.querySelector(`.obj[data-id="${o.id}"]`);
    if (n) n.classList.toggle('selected', o.id === id);
  });
  renderSelbox();
  onSelectCb(find(id) || null);
}
export function deselect() { select(null); }
export const getSelected = () => find(selectedId) || null;

function renderSelbox() {
  if (selbox) { selbox.remove(); selbox = null; }
  const o = find(selectedId);
  if (!o) return;
  selbox = el('div', { class: 'selbox' });
  applyBox(selbox, o);
  selbox.style.zIndex = 100000;
  selbox.append(el('div', { class: 'outline' }));
  for (const h of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    const handle = el('div', { class: `handle ${h}`, dataset: { dir: h } });
    handle.addEventListener('pointerdown', (e) => onResizeDown(e, o, h));
    selbox.append(handle);
  }
  const rotH = el('div', { class: 'handle rot' });
  rotH.addEventListener('pointerdown', (e) => onRotateDown(e, o));
  selbox.append(rotH);
  boardEl.append(selbox);
}
function updateSelbox(o) {
  if (selbox) applyBox(selbox, o), (selbox.style.zIndex = 100000);
}

// ---------- Interacoes ----------
function onBoardPointerDown(e) {
  // o Zoom precisa iniciar SOBRE a imagem, entao roda antes da guarda de objeto
  if (tool === 'zoom') { e.preventDefault(); createZoomWithDrag(e); return; }
  if (e.target.closest('.obj') || e.target.closest('.selbox')) return;
  if (tool !== 'select') { createWithDrag(e); return; }
  deselect();
}

function onObjectPointerDown(e, o) {
  if (tool !== 'select') return; // ferramenta de criacao ativa: ignora objetos
  e.stopPropagation();
  select(o.id);
  startMove(e, o);
}

function startMove(e, o) {
  const node = boardEl.querySelector(`.obj[data-id="${o.id}"]`);
  const start = boardPoint(e);
  const ox = o.x, oy = o.y;
  const move = (ev) => {
    const p = boardPoint(ev);
    o.x = Math.round(ox + (p.x - start.x));
    o.y = Math.round(oy + (p.y - start.y));
    applyBox(node, o); updateSelbox(o);
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); touch(); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function onResizeDown(e, o, dir) {
  e.stopPropagation(); e.preventDefault();
  const node = boardEl.querySelector(`.obj[data-id="${o.id}"]`);
  const a = rad(o.rot || 0);
  const dragX = dir.includes('e') ? 1 : dir.includes('w') ? -1 : 0;
  const dragY = dir.includes('s') ? 1 : dir.includes('n') ? -1 : 0;
  const C = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  const fixedLocal = { x: -dragX * o.w / 2, y: -dragY * o.h / 2 };
  const fRot = rotate(fixedLocal.x, fixedLocal.y, a);
  const F = { x: C.x + fRot.x, y: C.y + fRot.y };
  const min = o.type === 'line' ? 4 : 16;

  const move = (ev) => {
    const p = boardPoint(ev);
    const d = rotate(p.x - F.x, p.y - F.y, -a); // delta em espaco local
    let w = dragX ? Math.max(min, Math.abs(d.x)) : o.w;
    let h = dragY ? Math.max(min, Math.abs(d.y)) : o.h;
    const cen = rotate(dragX * w / 2, dragY * h / 2, a);
    const nc = { x: F.x + cen.x, y: F.y + cen.y };
    o.w = Math.round(w); o.h = Math.round(h);
    o.x = Math.round(nc.x - w / 2); o.y = Math.round(nc.y - h / 2);
    if (['arrow', 'line', 'circle', 'rect', 'number', 'callout', 'zoom'].includes(o.type)) rebuildBody(o);
    else applyBox(node, o);
    updateSelbox(o);
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); touch(); onSelectCb(o); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function onRotateDown(e, o) {
  e.stopPropagation(); e.preventDefault();
  const node = boardEl.querySelector(`.obj[data-id="${o.id}"]`);
  const C = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  const move = (ev) => {
    const p = boardPoint(ev);
    let ang = Math.atan2(p.y - C.y, p.x - C.x) * 180 / Math.PI + 90;
    if (ev.shiftKey) ang = Math.round(ang / 15) * 15;
    o.rot = Math.round(ang);
    applyBox(node, o); updateSelbox(o);
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); touch(); onSelectCb(o); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// Criar objeto arrastando (ou clique simples = tamanho padrao)
function createWithDrag(e) {
  const start = boardPoint(e);
  const o = newObject(tool, { x: Math.round(start.x), y: Math.round(start.y), z: nextZ() });
  if (tool === 'number') { o.value = ++store.current.board.numberSeq; }
  objs().push(o);
  const node = renderObject(o);
  boardEl.append(node);
  let dragged = false;

  const move = (ev) => {
    const p = boardPoint(ev);
    const dx = p.x - start.x, dy = p.y - start.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;
    if (tool === 'number') return; // numero tem tamanho fixo
    if (tool === 'line' || tool === 'arrow') {
      o.w = Math.max(8, Math.abs(dx)); o.h = o.type === 'line' ? o.strokeW + 2 : 24;
      o.x = Math.min(start.x, p.x); o.y = Math.round(start.y);
      o.rot = Math.atan2(dy, dx) * 180 / Math.PI;
      // posicao: ancorar no ponto inicial
      const cx = (start.x + p.x) / 2, cy = (start.y + p.y) / 2;
      o.x = Math.round(cx - o.w / 2); o.y = Math.round(cy - o.h / 2);
    } else {
      o.w = Math.max(12, Math.abs(dx)); o.h = Math.max(12, Math.abs(dy));
      o.x = Math.round(Math.min(start.x, p.x)); o.y = Math.round(Math.min(start.y, p.y));
    }
    rebuildBody(o);
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    if (!dragged) { /* mantem tamanho padrao */ rebuildBody(o); }
    setTool('select');
    select(o.id);
    commit('object');
    if (o.type === 'text') startTextEdit(o);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// Ferramenta Zoom: arraste sobre uma imagem para criar um detalhe ampliado.
function createZoomWithDrag(e) {
  const start = boardPoint(e);
  const img = objs().filter((o) => o.type === 'image')
    .sort((a, b) => b.z - a.z)
    .find((o) => start.x >= o.x && start.x <= o.x + o.w && start.y >= o.y && start.y <= o.y + o.h);
  if (!img) { toast('Use o Zoom sobre uma imagem importada para o desenho.', 'err'); setTool('select'); return; }

  const marquee = el('div', { class: 'zoom-marquee' });
  boardEl.append(marquee);
  const draw = (p) => {
    const x = Math.min(start.x, p.x), y = Math.min(start.y, p.y), w = Math.abs(p.x - start.x), h = Math.abs(p.y - start.y);
    marquee.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:${w}px; height:${h}px;`;
    return { x, y, w, h };
  };
  const move = (ev) => draw(boardPoint(ev));
  const up = (ev) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    marquee.remove();
    let { x, y, w, h } = draw(boardPoint(ev));
    if (w < 12 || h < 12) { w = Math.min(70, img.w * 0.3); h = w; x = start.x - w / 2; y = start.y - h / 2; } // clique = região padrão
    // seleção quadrada -> detalhe circular (padrão de ficha técnica)
    { const cx = x + w / 2, cy = y + h / 2, side = Math.max(w, h); w = h = side; x = cx - side / 2; y = cy - side / 2; }
    // limita a seleção à área da imagem
    x = clamp(x, img.x, img.x + img.w); y = clamp(y, img.y, img.y + img.h);
    w = Math.min(w, img.x + img.w - x); h = Math.min(h, img.y + img.h - y);
    const fx = (x - img.x) / img.w, fy = (y - img.y) / img.h, fw = w / img.w, fh = h / img.h;
    const mag = 2.3;
    let zw = w * mag, zh = h * mag;
    const maxDim = Math.min(boardEl.offsetWidth * 0.5, 280);
    const k = Math.min(1, maxDim / Math.max(zw, zh));
    zw = Math.round(zw * k); zh = Math.round(zh * k);
    const o = newObject('zoom', {
      srcId: img.id, fx, fy, fw, fh, w: zw, h: zh, shape: 'circle', z: nextZ(),
      x: clamp(img.x + img.w + 14, 0, Math.max(0, boardEl.offsetWidth - zw)),
      y: clamp(img.y, 0, Math.max(0, boardEl.offsetHeight - zh)),
    });
    objs().push(o);
    boardEl.append(renderObject(o));
    setTool('select');
    select(o.id);
    commit('object');
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function nextZ() { return (objs().reduce((m, o) => Math.max(m, o.z), 0) || 0) + 1; }

// ---------- Edicao de texto ----------
let activeEditor = null;
function startTextEdit(o) {
  const node = boardEl.querySelector(`.obj[data-id="${o.id}"]`);
  const body = node.querySelector(o.type === 'callout' ? '.obj-body > div' : '.obj-body');
  node.classList.add('editing');
  body.setAttribute('contenteditable', 'true');
  body.style.pointerEvents = 'auto';
  body.focus();
  document.execCommand && document.getSelection().selectAllChildren(body);
  showTextToolbar(o, node);
  const finish = () => {
    o.text = body.textContent;
    body.removeAttribute('contenteditable');
    body.style.pointerEvents = 'none';
    node.classList.remove('editing');
    hideTextToolbar();
    commit('object');
    body.removeEventListener('blur', finish);
  };
  body.addEventListener('blur', finish);
  activeEditor = { o, finish };
}

let textToolbar = null;
function hideTextToolbar() { if (textToolbar) { textToolbar.remove(); textToolbar = null; } }
function showTextToolbar(o, node) {
  hideTextToolbar();
  const r = node.getBoundingClientRect();
  const tb = el('div', { class: 'text-toolbar' });
  tb.style.left = (r.left) + 'px';
  tb.style.top = (r.top - 40 + window.scrollY) + 'px';
  // impede que clicar na toolbar tire o foco/feche
  tb.addEventListener('pointerdown', (e) => e.preventDefault());

  const apply = () => { rebuildBody(o); touch(); reattachEdit(o); };

  const fontSel = el('select', {});
  ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'].forEach((f) =>
    fontSel.append(el('option', { value: f, selected: o.font === f }, f)));
  fontSel.onchange = () => { o.font = fontSel.value; apply(); };

  const sizeInp = el('input', { type: 'number', value: o.size, min: 6, max: 96, style: { width: '46px' } });
  sizeInp.onchange = () => { o.size = +sizeInp.value || 12; apply(); };

  const mk = (label, prop) => {
    const b = el('button', { class: o[prop] ? 'active' : '', title: label }, label[0]);
    b.style.fontWeight = label === 'B' ? '800' : '';
    b.style.fontStyle = label === 'I' ? 'italic' : '';
    b.style.textDecoration = label === 'U' ? 'underline' : '';
    b.onclick = () => { o[prop] = !o[prop]; b.classList.toggle('active', o[prop]); apply(); };
    return b;
  };
  const color = el('input', { type: 'color', value: o.color || '#1a1a1a' });
  color.oninput = () => { o.color = color.value; apply(); };

  tb.append(fontSel, sizeInp, sep(), mk('B', 'bold'), mk('I', 'italic'), mk('U', 'underline'), sep(), color);
  document.body.append(tb);
  textToolbar = tb;
}
const sep = () => el('div', { class: 'sep' });

// Reanexa o modo edicao apos rebuild (que recria o DOM do corpo)
function reattachEdit(o) {
  const node = boardEl.querySelector(`.obj[data-id="${o.id}"]`);
  if (!node) return;
  node.classList.add('editing');
  const body = node.querySelector(o.type === 'callout' ? '.obj-body > div' : '.obj-body');
  if (!body) return;
  body.setAttribute('contenteditable', 'true');
  body.style.pointerEvents = 'auto';
  body.focus();
  const finish = () => {
    o.text = body.textContent;
    body.removeAttribute('contenteditable'); body.style.pointerEvents = 'none';
    node.classList.remove('editing'); hideTextToolbar(); commit('object');
  };
  body.addEventListener('blur', finish, { once: true });
}

// ---------- API publica de manipulacao ----------
export function addImageObject(imgKey, natW, natH) {
  const maxW = boardEl.offsetWidth * 0.45;
  const ratio = natH / natW || 1;
  let w = Math.min(natW || 200, maxW);
  let h = w * ratio;
  if (h > boardEl.offsetHeight * 0.85) { h = boardEl.offsetHeight * 0.85; w = h / ratio; }
  const o = newObject('image', { imgKey, w: Math.round(w), h: Math.round(h), x: 40, y: 30, z: nextZ() });
  objs().push(o);
  boardEl.append(renderObject(o));
  select(o.id);
  commit('object');
}

export function deleteSelected() {
  if (!selectedId) return;
  const i = objs().findIndex((o) => o.id === selectedId);
  if (i < 0) return;
  objs().splice(i, 1);
  const n = boardEl.querySelector(`.obj[data-id="${selectedId}"]`);
  if (n) n.remove();
  deselect();
  commit('object');
}

export function duplicateSelected() {
  const o = getSelected();
  if (!o) return;
  const copy = { ...o, id: crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now(), x: o.x + 16, y: o.y + 16, z: nextZ() };
  if (o.type === 'number') copy.value = ++store.current.board.numberSeq;
  objs().push(copy);
  boardEl.append(renderObject(copy));
  select(copy.id);
  commit('object');
}

export function updateSelected(patch) {
  const o = getSelected();
  if (!o) return;
  Object.assign(o, patch);
  rebuildBody(o);
  updateSelbox(o);
  touch();
}

// Renderiza os objetos de uma ficha (somente leitura) num board — p/ impressão em lote.
export function renderStatic(boardElement, ficha) {
  boardElement.innerHTML = '';
  const list = [...(ficha.board?.objects || [])].sort((a, b) => a.z - b.z);
  for (const o of list) {
    const node = el('div', { class: `obj type-${o.type}`, dataset: { id: o.id } });
    applyBox(node, o);
    node.append(buildBody(o));
    boardElement.append(node);
  }
}

export function bringFront() { const o = getSelected(); if (o) { o.z = nextZ(); applyBox(boardEl.querySelector(`.obj[data-id="${o.id}"]`), o); touch(); } }
export function sendBack() {
  const o = getSelected(); if (!o) return;
  const minZ = objs().reduce((m, x) => Math.min(m, x.z), Infinity);
  o.z = minZ - 1; applyBox(boardEl.querySelector(`.obj[data-id="${o.id}"]`), o); touch();
}
