// Grade de medidas ANTES / DEPOIS de lavar (padrao jeans).
// Colunas = tamanhos (de store.current.grade.sizes); linhas = pontos de medida.
import { el } from './util.js?v=18';
import { store, commit, touch } from './store.js?v=18';
import { blockTitle, sectionClass, rowEye, rowHiddenClass } from './blocks.js?v=18';

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

  // Cabecalho — por tamanho: Esperado / Antes / Depois (ou só Esperado)
  const thead = el('thead');
  if (ad) {
    const r1 = el('tr', {}, el('th', { class: 'mlabel', rowspan: '2' }, 'Medida'));
    const r2 = el('tr', {});
    sizes.forEach((s) => {
      r1.append(el('th', { colspan: '3', class: 'sizehead gstart' }, s || '—'));
      r2.append(
        el('th', { class: 'subhead sub-e gstart' }, 'Esper.'),
        el('th', { class: 'subhead sub-a' }, 'Antes'),
        el('th', { class: 'subhead sub-d' }, 'Depois'));
    });
    r1.append(el('th', { rowspan: '2', class: 'gstart', style: { width: '30px' }, html: '&nbsp;' }));
    thead.append(r1, r2);
  } else {
    const r1 = el('tr', {}, el('th', { class: 'mlabel' }, 'Medida'));
    sizes.forEach((s) => r1.append(el('th', { class: 'sizehead gstart' }, (s || '—') + ' esp.')));
    r1.append(el('th', { class: 'gstart', style: { width: '30px' }, html: '&nbsp;' }));
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
      tr.append(cell(ri, ci, 'e', 'gstart'));
      if (ad) { tr.append(cell(ri, ci, 'a')); tr.append(cell(ri, ci, 'd')); }
    });
    tr.append(el('td', { class: 'rowctl gstart' },
      rowEye(row, () => { refreshMeasures(); commit('measures'); }),
      el('span', { class: 'del-row', title: 'Excluir', onclick: () => { M().rows.splice(ri, 1); refreshMeasures(); commit('measures'); } }, '✕')));
    tbody.append(tr);
  });

  table.append(thead, tbody);
  sec.append(title, el('div', { class: 'tbl-wrap' }, table));
}

function cell(ri, ci, which, extra) {
  const td = el('td', { class: 'num col-' + which + (extra ? ' ' + extra : ''), contenteditable: 'true' });
  const arr = M().rows[ri][which] || (M().rows[ri][which] = []);
  td.textContent = arr[ci] || '';
  td.addEventListener('input', () => {
    (M().rows[ri][which] || (M().rows[ri][which] = []))[ci] = td.textContent; touch();
  });
  return td;
}

function addMeasure() { M().rows.push({ medida: '', e: [], a: [], d: [] }); refreshMeasures(); commit('measures'); }
function toggleAD() { M().antesDepois = !M().antesDepois; refreshMeasures(); commit('measures'); }
