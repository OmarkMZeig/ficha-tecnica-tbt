// Banco de produtos: lista pesquisavel de todas as fichas salvas.
import { el, brDate, confirmDialog, toast } from './util.js';
import { listFichas, removeFicha } from './store.js';
import { CATEGORIAS } from './model.js';

let libEl = null;
let onOpen = () => {};
let all = [];
let q = '';
let fCat = '';

export function initLibrary(element, { open }) { libEl = element; onOpen = open; }

export async function refreshLibrary() {
  all = (await listFichas()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  render();
}

function matches(f) {
  const hay = [f.meta.referencia, f.meta.marca, f.meta.cliente, f.meta.colecao, f.meta.categoria, f.meta.descricao, f.meta.produto, f.meta.familia, f.meta.oc]
    .join(' ').toLowerCase();
  if (q && !hay.includes(q.toLowerCase())) return false;
  if (fCat && f.meta.categoria !== fCat) return false;
  return true;
}

function render() {
  libEl.innerHTML = '';
  const head = el('div', { class: 'lib-head' });
  const search = el('input', { class: 'search', placeholder: '🔍  Buscar por referência, marca, cliente, coleção...' , value: q });
  search.addEventListener('input', () => { q = search.value; renderCards(); });
  const catSel = el('select', {}, el('option', { value: '' }, 'Todas categorias'), ...CATEGORIAS.map((c) => el('option', { value: c, selected: fCat === c }, c)));
  catSel.onchange = () => { fCat = catSel.value; renderCards(); };
  head.append(search, el('div', { class: 'filters' }, catSel));
  libEl.append(head);

  const cardsWrap = el('div', { class: 'cards', id: 'libCards' });
  libEl.append(cardsWrap);
  renderCards();
}

function renderCards() {
  const wrap = document.getElementById('libCards');
  if (!wrap) return;
  wrap.innerHTML = '';
  const list = all.filter(matches);
  if (!list.length) {
    wrap.append(el('div', { class: 'lib-empty' }, all.length ? 'Nenhuma ficha encontrada para o filtro.' : 'Nenhuma ficha salva ainda. Crie uma nova no Editor.'));
    return;
  }
  for (const f of list) wrap.append(card(f));
}

function card(f) {
  const thumb = el('div', { class: 'thumb' });
  if (f.thumb) thumb.style.backgroundImage = `url(${f.thumb})`;
  else thumb.textContent = '👕';

  const tags = el('div', { class: 'tags' });
  if (f.meta.categoria) tags.append(el('span', { class: 'tag', text: f.meta.categoria }));
  if (f.meta.marca) tags.append(el('span', { class: 'tag', text: f.meta.marca }));
  if (f.meta.cliente) tags.append(el('span', { class: 'tag', text: f.meta.cliente }));

  const open = () => onOpen(f.id);
  const c = el('div', { class: 'card' },
    el('div', { onclick: open }, thumb),
    el('div', { class: 'meta' },
      el('div', { class: 'r', text: (f.meta.referencia || 'Sem referência') + '  ·  v' + (f.meta.versao || '1.0') }),
      el('div', { class: 'd', text: f.meta.descricao || '—' }),
      tags,
      el('div', { class: 'row2' },
        el('button', { class: 'btn btn-sm primary', style: { flex: '1', justifyContent: 'center' }, onclick: open }, 'Abrir'),
        el('button', { class: 'btn btn-sm danger', onclick: async (e) => { e.stopPropagation(); if (await confirmDialog(`Excluir a ficha "${f.meta.referencia || 'sem ref'}"? Esta ação não pode ser desfeita.`, { danger: true, okLabel: 'Excluir' })) { await removeFicha(f.id); toast('Ficha excluída'); refreshLibrary(); } } }, '🗑'),
      ),
    ),
  );
  return c;
}
