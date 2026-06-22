// Banco de produtos: lista pesquisavel + selecao multipla p/ impressao em lote.
import { el, brDate, confirmDialog, toast } from './util.js';
import { listFichas, removeFicha } from './store.js';
import { printFichas } from './export.js';
import { CATEGORIAS } from './model.js';

let libEl = null;
let onOpen = () => {};
let all = [];
let q = '';
let fCat = '';
let fTipo = 'producao'; // 'producao' | 'piloto'
const selected = new Set();
const tipoOf = (f) => (f.meta.tipo === 'piloto' ? 'piloto' : 'producao');

export function initLibrary(element, { open }) { libEl = element; onOpen = open; }

export async function refreshLibrary() {
  all = (await listFichas()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  render();
}

function matches(f) {
  const hay = [f.meta.referencia, f.meta.marca, f.meta.cliente, f.meta.colecao, f.meta.categoria, f.meta.descricao, f.meta.produto, f.meta.familia, f.meta.oc, f.meta.numero]
    .join(' ').toLowerCase();
  if (tipoOf(f) !== fTipo) return false;
  if (q && !hay.includes(q.toLowerCase())) return false;
  if (fCat && f.meta.categoria !== fCat) return false;
  return true;
}

function render() {
  libEl.innerHTML = '';

  // Separação Produção / Piloto (numeração e ordens diferentes)
  const nProd = all.filter((f) => tipoOf(f) === 'producao').length;
  const nPil = all.filter((f) => tipoOf(f) === 'piloto').length;
  const tabs = el('div', { class: 'lib-tabs' });
  const mkTab = (key, label) => {
    const b = el('button', { class: 'lib-tab' + (fTipo === key ? ' active' : ''), onclick: () => { fTipo = key; selected.clear(); render(); } }, label);
    return b;
  };
  tabs.append(mkTab('producao', `🏭 Produção (${nProd})`), mkTab('piloto', `🧪 Piloto (${nPil})`));
  libEl.append(tabs);

  const head = el('div', { class: 'lib-head' });
  const search = el('input', { class: 'search', placeholder: '🔍  Buscar por nº, referência, marca, cliente, coleção...', value: q });
  search.addEventListener('input', () => { q = search.value; renderCards(); });
  const catSel = el('select', {}, el('option', { value: '' }, 'Todas categorias'), ...CATEGORIAS.map((c) => el('option', { value: c, selected: fCat === c }, c)));
  catSel.onchange = () => { fCat = catSel.value; renderCards(); };

  const printBtn = el('button', { class: 'btn primary', id: 'libPrintBtn', onclick: doPrint }, '🖨 Imprimir selecionadas');
  const clearBtn = el('button', { class: 'btn ghost', id: 'libClearBtn', onclick: () => { selected.clear(); renderCards(); } }, 'Limpar');

  head.append(search, el('div', { class: 'filters' }, catSel, printBtn, clearBtn));
  libEl.append(head);
  libEl.append(el('div', { class: 'cards', id: 'libCards' }));
  renderCards();
}

function updateActions() {
  const pb = document.getElementById('libPrintBtn');
  const cb = document.getElementById('libClearBtn');
  if (pb) { pb.textContent = `🖨 Imprimir selecionadas (${selected.size})`; pb.disabled = selected.size === 0; pb.style.opacity = selected.size ? '1' : '.5'; }
  if (cb) cb.hidden = selected.size === 0;
}

async function doPrint() {
  if (!selected.size) return;
  // imprime na ordem em que aparecem na lista filtrada
  const ids = all.filter(matches).map((f) => f.id).filter((id) => selected.has(id));
  await printFichas(ids);
}

function renderCards() {
  const wrap = document.getElementById('libCards');
  if (!wrap) return;
  wrap.innerHTML = '';
  const list = all.filter(matches);
  if (!list.length) {
    wrap.append(el('div', { class: 'lib-empty' }, all.length ? 'Nenhuma ficha encontrada para o filtro.' : 'Nenhuma ficha salva ainda. Crie uma nova no Editor.'));
    updateActions();
    return;
  }
  for (const f of list) wrap.append(card(f));
  updateActions();
}

function card(f) {
  const thumb = el('div', { class: 'thumb' });
  if (f.thumb) thumb.style.backgroundImage = `url(${f.thumb})`;
  else thumb.textContent = '👕';

  const tags = el('div', { class: 'tags' });
  if (f.meta.numero) tags.append(el('span', { class: 'tag', style: { background: 'var(--accent-soft)', color: '#fff' }, text: 'Nº ' + f.meta.numero }));
  if (f.meta.categoria) tags.append(el('span', { class: 'tag', text: f.meta.categoria }));
  if (f.meta.marca) tags.append(el('span', { class: 'tag', text: f.meta.marca }));
  if (f.meta.cliente) tags.append(el('span', { class: 'tag', text: f.meta.cliente }));

  const open = () => onOpen(f.id);

  // checkbox de selecao para impressao
  const chk = el('input', { type: 'checkbox', class: 'card-chk', title: 'Selecionar para impressão' });
  chk.checked = selected.has(f.id);
  chk.addEventListener('click', (e) => e.stopPropagation());
  chk.addEventListener('change', () => { if (chk.checked) selected.add(f.id); else selected.delete(f.id); c.classList.toggle('sel', chk.checked); updateActions(); });

  const c = el('div', { class: 'card' + (selected.has(f.id) ? ' sel' : '') },
    chk,
    el('div', { onclick: open }, thumb),
    el('div', { class: 'meta' },
      el('div', { class: 'r', text: (f.meta.referencia || f.meta.produto || 'Sem referência') + '  ·  v' + (f.meta.versao || '1.0') }),
      el('div', { class: 'd', text: f.meta.descricao || f.meta.produto || '—' }),
      tags,
      el('div', { class: 'row2' },
        el('button', { class: 'btn btn-sm primary', style: { flex: '1', justifyContent: 'center' }, onclick: open }, 'Abrir'),
        el('button', { class: 'btn btn-sm danger', onclick: async (e) => { e.stopPropagation(); if (await confirmDialog(`Excluir a ficha "${f.meta.referencia || f.meta.produto || 'sem ref'}"? Esta ação não pode ser desfeita.`, { danger: true, okLabel: 'Excluir' })) { await removeFicha(f.id); selected.delete(f.id); toast('Ficha excluída'); refreshLibrary(); } } }, '🗑'),
      ),
    ),
  );
  return c;
}
