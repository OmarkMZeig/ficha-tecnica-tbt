// Painel direito contextual: propriedades do objeto selecionado OU da ficha.
import { el } from './util.js';
import { store, touch, addImageFromFile, imageUrl } from './store.js';
import { CATEGORIAS, STROKE_COLORS, FONTS } from './model.js';
import * as canvas from './canvas.js';

let root = null;
export function initInspector(element) { root = element; showFicha(); }

export function showSelection(o) { o ? showObject(o) : showFicha(); }

// ---------------- Inspetor de objeto ----------------
function showObject(o) {
  root.innerHTML = '';
  const names = { image: 'Imagem', text: 'Texto', arrow: 'Seta', line: 'Linha', circle: 'Círculo', rect: 'Retângulo', callout: 'Balão', number: 'Número' };
  root.append(el('h3', { text: names[o.type] || 'Objeto' }));

  // Acoes rapidas
  root.append(el('div', { class: 'toggle-row', style: { marginBottom: '12px' } },
    btn('⧉ Duplicar', () => canvas.duplicateSelected()),
    btn('⬆ Frente', () => canvas.bringFront()),
    btn('⬇ Trás', () => canvas.sendBack()),
  ));

  // Posicao / tamanho
  root.append(el('h3', { text: 'Geometria' }));
  const grid = el('div', { class: 'prop-grid' });
  grid.append(
    numField('X', Math.round(o.x), (v) => canvas.updateSelected({ x: v })),
    numField('Y', Math.round(o.y), (v) => canvas.updateSelected({ y: v })),
    numField('Largura', Math.round(o.w), (v) => canvas.updateSelected({ w: Math.max(4, v) })),
    numField('Altura', Math.round(o.h), (v) => canvas.updateSelected({ h: Math.max(4, v) })),
    numField('Rotação°', Math.round(o.rot || 0), (v) => canvas.updateSelected({ rot: v })),
  );
  root.append(grid);

  if (o.type === 'image') {
    root.append(el('h3', { text: 'Imagem' }));
    root.append(btnFull('🔄 Substituir imagem', () => replaceImage(o)));
    root.append(el('p', { class: 'hint', style: { marginTop: '8px' } }, 'Arraste os cantos na prancheta para redimensionar; use a alça superior para girar.'));
  }

  if (o.type === 'text' || o.type === 'callout') {
    root.append(el('h3', { text: 'Texto' }));
    const fontSel = el('select', {}, ...FONTS.map((fn) => el('option', { value: fn, selected: o.font === fn }, fn)));
    fontSel.onchange = () => canvas.updateSelected({ font: fontSel.value });
    root.append(field('Fonte', fontSel));
    root.append(el('div', { class: 'prop-grid' },
      numField('Tamanho', o.size || 13, (v) => canvas.updateSelected({ size: Math.max(6, v) })),
      colorField('Cor', o.color || '#1a1a1a', (v) => canvas.updateSelected({ color: v })),
    ));
    if (o.type === 'text') {
      root.append(el('div', { class: 'toggle-row', style: { marginTop: '8px' } },
        tgl('N', o.bold, () => canvas.updateSelected({ bold: !o.bold }), { fontWeight: '800' }),
        tgl('I', o.italic, () => canvas.updateSelected({ italic: !o.italic }), { fontStyle: 'italic' }),
        tgl('S', o.underline, () => canvas.updateSelected({ underline: !o.underline }), { textDecoration: 'underline' }),
      ));
      root.append(el('div', { class: 'toggle-row', style: { marginTop: '6px' } },
        tgl('⯇', o.align === 'left', () => canvas.updateSelected({ align: 'left' })),
        tgl('▤', o.align === 'center', () => canvas.updateSelected({ align: 'center' })),
        tgl('⯈', o.align === 'right', () => canvas.updateSelected({ align: 'right' })),
      ));
    }
    if (o.type === 'callout') root.append(fillRow(o));
    root.append(el('p', { class: 'hint', style: { marginTop: '8px' } }, 'Duplo-clique no objeto para editar o texto.'));
  }

  if (['arrow', 'line', 'circle', 'rect'].includes(o.type)) {
    root.append(el('h3', { text: 'Traço' }));
    root.append(swatches(o.stroke, (v) => canvas.updateSelected({ stroke: v })));
    root.append(el('div', { class: 'prop-grid', style: { marginTop: '8px' } },
      numField('Espessura', o.strokeW || 2, (v) => canvas.updateSelected({ strokeW: Math.max(0.5, v) })),
    ));
    if (o.type === 'circle' || o.type === 'rect') root.append(fillRow(o));
  }

  if (o.type === 'number') {
    root.append(el('h3', { text: 'Número' }));
    root.append(numField('Valor', o.value, (v) => canvas.updateSelected({ value: v })));
    root.append(swatches(o.fill, (v) => canvas.updateSelected({ fill: v })));
  }

  root.append(el('div', { style: { marginTop: '18px' } }, btnFull('🗑 Excluir objeto', () => canvas.deleteSelected(), 'danger')));
  root.append(el('p', { class: 'hint', style: { marginTop: '12px' } }, 'Atalhos: Delete = excluir • Ctrl+D = duplicar • setas = mover'));
}

function fillRow(o) {
  const wrap = el('div', {});
  wrap.append(el('h3', { text: 'Preenchimento' }));
  const colors = ['none', '#fffbe6', '#ffffff', '#fde2e2', '#e2ecff', '#e6f7ec', '#1a1a1a'];
  const row = el('div', { class: 'swatch-row' });
  colors.forEach((c) => {
    const sw = el('div', { class: 'swatch' + (o.fill === c ? ' active' : ''), title: c });
    sw.style.background = c === 'none' ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50%/8px 8px' : c;
    sw.onclick = () => { canvas.updateSelected({ fill: c }); row.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active')); sw.classList.add('active'); };
    row.append(sw);
  });
  wrap.append(row);
  return wrap;
}

function replaceImage(o) {
  const inp = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/jpg,image/webp', style: { display: 'none' } });
  document.body.append(inp);
  inp.onchange = async () => {
    const file = inp.files[0]; inp.remove();
    if (!file) return;
    const key = await addImageFromFile(file);
    canvas.updateSelected({ imgKey: key });
  };
  inp.click();
}

// ---------------- Inspetor da ficha ----------------
function showFicha() {
  const f = store.current;
  root.innerHTML = '';
  if (!f) { root.append(el('div', { class: 'empty-inspector', text: 'Nenhuma ficha aberta.' })); return; }

  root.append(el('h3', { text: 'Categoria' }));
  const sel = el('select', {}, ...CATEGORIAS.map((c) => el('option', { value: c, selected: f.meta.categoria === c }, c)));
  sel.onchange = () => {
    f.meta.categoria = sel.value; touch();
    const cell = document.querySelector('.fic-head [data-f="categoria"]');
    if (cell) cell.textContent = sel.value;
    const d = document.getElementById('topDesc'); if (d) d.textContent = `${sel.value}${(f.meta.produto || f.meta.descricao) ? ' • ' + (f.meta.produto || f.meta.descricao) : ''}`;
  };
  root.append(field('', sel));

  root.append(el('h3', { text: 'Marcações' }));
  root.append(el('p', { class: 'hint' }, 'Use a barra de ferramentas à esquerda para inserir imagens, setas, formas, balões, números e textos sobre o desenho. Selecione um objeto para editar suas propriedades aqui.'));

  root.append(el('h3', { text: 'Informações' }));
  root.append(infoRow('Criada em', fmtDate(f.createdAt)));
  root.append(infoRow('Atualizada', fmtDate(f.updatedAt)));
  root.append(infoRow('Objetos no desenho', String(f.board.objects.length)));
  root.append(infoRow('Revisões', String((f.revisoes || []).length)));
}

// ---------------- helpers UI ----------------
const btn = (label, on) => { const b = el('button', { onclick: on }, label); return b; };
function btnFull(label, on, cls = '') {
  return el('button', { class: `btn ${cls}`, style: { width: '100%', justifyContent: 'center' }, onclick: on }, label);
}
function field(label, control) {
  const f = el('div', { class: 'field' });
  if (label) f.append(el('label', { text: label }));
  f.append(control);
  return f;
}
function numField(label, value, on) {
  const inp = el('input', { type: 'number', value });
  inp.addEventListener('input', () => on(parseFloat(inp.value) || 0));
  return field(label, inp);
}
function colorField(label, value, on) {
  const inp = el('input', { type: 'color', value });
  inp.addEventListener('input', () => on(inp.value));
  return field(label, inp);
}
function tgl(label, active, on, style = {}) {
  const b = el('button', { class: active ? 'active' : '', style }, label);
  b.onclick = () => on();
  return b;
}
function swatches(active, on) {
  const row = el('div', { class: 'swatch-row' });
  STROKE_COLORS.forEach((c) => {
    const sw = el('div', { class: 'swatch' + (active === c ? ' active' : '') });
    sw.style.background = c;
    sw.onclick = () => { on(c); row.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active')); sw.classList.add('active'); };
    row.append(sw);
  });
  return row;
}
function infoRow(k, v) {
  return el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border-soft)' } },
    el('span', { style: { color: 'var(--text-dim)' } }, k), el('span', {}, v));
}
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('pt-BR'); } catch { return '—'; } };
