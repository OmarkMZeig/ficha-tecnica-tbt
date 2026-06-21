// Grade de medidas ANTES / DEPOIS de lavar (padrao jeans).
// Colunas = tamanhos (de store.current.grade.sizes); linhas = pontos de medida.
import { el } from './util.js';
import { store, commit, touch } from './store.js';
import { blockTitle, sectionClass, rowEye, rowHiddenClass } from './blocks.js';

export function measuresSection() {
  const sec = el('section', { class: 'measures-section', dataset: { measures: '1' } });
  renderInto(sec);
  return sec;
}

export function refreshMeasures() {
  const sec = document.querySelector('.measures-section');
  if (sec) renderInto(sec);
}

const M = () => store.current.medidas;
const SIZES = () => store.current.grade.sizes;

function renderInto(sec) {
  const m = M();
  const sizes = SIZES();
  sec.innerHTML = '';
  sec.className = sectionClass('measures-section', 'medidas');

  const title = blockTitle('Tabela de Medidas (cm)', 'medidas',
    el('span', { style: { display: 'flex', gap: '10px' } },
      el('button', { class: 'add-row', onclick: toggleAD }, m.antesDepois ? 'antes/depois ✓' : 'antes/depois'),
      el('button', { class: 'add-row', onclick: addMeasure }, '+ medida')));

  const table = el('table', { class: 'fic measures' });
  const ad = m.antesDepois;

  // Cabecalho
  const thead = el('thead');
  if (ad) {
    const r1 = el('tr', {}, el('th', { class: 'mlabel', rowspan: '2' }, 'Medida'));
    const r2 = el('tr', {});
    sizes.forEach((s, i) => {
      r1.append(el('th', { colspan: '2', class: 'sizehead' }, s || '—'));
      r2.append(el('th', { class: 'subhead' }, 'antes'), el('th', { class: 'subhead' }, 'depois'));
    });
    r1.append(el('th', { rowspan: '2', style: { width: '30px' }, html: '&nbsp;' }));
    thead.append(r1, r2);
  } else {
    const r1 = el('tr', {}, el('th', { class: 'mlabel' }, 'Medida'));
    sizes.forEach((s) => r1.append(el('th', { class: 'sizehead' }, s || '—')));
    r1.append(el('th', { style: { width: '30px' }, html: '&nbsp;' }));
    thead.append(r1);
  }

  const tbody = el('tbody');
  m.rows.forEach((row, ri) => {
    const tr = el('tr', { class: rowHiddenClass(row) });
    const md = el('td', { class: 'mlabel', contenteditable: 'true' });
    md.textContent = row.medida || '';
    md.addEventListener('input', () => { M().rows[ri].medida = md.textContent; touch(); });
    tr.append(md);

    sizes.forEach((s, ci) => {
      tr.append(cell(ri, ci, 'a'));
      if (ad) tr.append(cell(ri, ci, 'd'));
    });
    tr.append(el('td', { class: 'rowctl' },
      rowEye(row, () => { refreshMeasures(); commit('measures'); }),
      el('span', { class: 'del-row', title: 'Excluir', onclick: () => { M().rows.splice(ri, 1); refreshMeasures(); commit('measures'); } }, '✕')));
    tbody.append(tr);
  });

  table.append(thead, tbody);
  sec.append(title, el('div', { class: 'tbl-wrap' }, table));
}

function cell(ri, ci, which) {
  const td = el('td', { class: 'num', contenteditable: 'true' });
  const arr = M().rows[ri][which];
  td.textContent = (arr && arr[ci]) || '';
  td.addEventListener('input', () => {
    const a = M().rows[ri][which] || (M().rows[ri][which] = []);
    a[ci] = td.textContent; touch();
  });
  return td;
}

function addMeasure() { M().rows.push({ medida: '', a: [], d: [] }); refreshMeasures(); commit('measures'); }
function toggleAD() { M().antesDepois = !M().antesDepois; refreshMeasures(); commit('measures'); }
