// Tabelas editaveis: edicao inline, inserir/excluir/reordenar linhas,
// e colar dados direto do Excel (TSV).
import { el, $$, toast } from './util.js?v=18';
import { store, commit, touch } from './store.js?v=18';
import { TABLE_DEFS, emptyRow } from './model.js?v=18';
import { blockTitle, sectionClass, rowEye, rowHiddenClass } from './blocks.js?v=18';

export function tableSection(tableKey, { compact = false } = {}) {
  const sec = el('section', { class: 'tbl-section', dataset: { table: tableKey } });
  renderInto(sec, tableKey);
  return sec;
}

function refresh(tableKey) {
  const sec = document.querySelector(`.tbl-section[data-table="${tableKey}"]`);
  if (sec) renderInto(sec, tableKey);
}

function rowsOf(tableKey) { return store.current.tables[tableKey]; }

function renderInto(sec, tableKey) {
  const def = TABLE_DEFS[tableKey];
  const rows = rowsOf(tableKey);
  sec.innerHTML = '';
  sec.className = sectionClass('tbl-section', tableKey);

  const title = blockTitle(def.title, tableKey,
    el('button', { class: 'add-row', onclick: () => addRow(tableKey) }, '+ linha'));

  const table = el('table', { class: 'fic' });
  const thead = el('thead', {},
    el('tr', {},
      el('th', { style: { width: '16px' }, html: '&nbsp;' }),
      ...def.cols.map((c) => el('th', { style: c.w ? { width: c.w } : {} }, c.label)),
      el('th', { style: { width: '30px' }, html: '&nbsp;' }),
    ));
  const tbody = el('tbody');

  rows.forEach((row, ri) => {
    const tr = el('tr', { dataset: { ri }, class: rowHiddenClass(row) });
    // handle de reordenacao (drag)
    const handle = el('td', { class: 'row-handle', title: 'Arraste para reordenar', html: '⠿' });
    handle.draggable = true;
    tr.append(handle);

    def.cols.forEach((c) => {
      const td = el('td', {
        contenteditable: 'true',
        class: c.center ? 'num' : '',
        dataset: { ri, col: c.k },
      });
      td.textContent = row[c.k] || '';
      td.addEventListener('input', () => { rowsOf(tableKey)[ri][c.k] = td.textContent; touch(); });
      td.addEventListener('paste', (e) => onPaste(e, tableKey, ri, c.k));
      tr.append(td);
    });

    const del = el('td', { class: 'rowctl' },
      rowEye(row, () => { refresh(tableKey); commit('table'); }),
      el('span', { class: 'del-row', title: 'Excluir linha', onclick: () => removeRow(tableKey, ri) }, '✕'));
    tr.append(del);

    wireDrag(tr, handle, tableKey);
    tbody.append(tr);
  });

  table.append(thead, tbody);
  sec.append(title, el('div', { class: 'tbl-wrap' }, table));
}

function addRow(tableKey) {
  rowsOf(tableKey).push(emptyRow(tableKey));
  refresh(tableKey); commit('table');
}
function removeRow(tableKey, ri) {
  rowsOf(tableKey).splice(ri, 1);
  refresh(tableKey); commit('table');
}

// ---- Reordenar por drag ----
let dragSrc = null;
function wireDrag(tr, handle, tableKey) {
  handle.addEventListener('dragstart', (e) => {
    dragSrc = +tr.dataset.ri; tr.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragSrc));
  });
  handle.addEventListener('dragend', () => {
    tr.classList.remove('dragging');
    $$('.drop-target').forEach((n) => n.classList.remove('drop-target'));
  });
  tr.addEventListener('dragover', (e) => { e.preventDefault(); tr.classList.add('drop-target'); });
  tr.addEventListener('dragleave', () => tr.classList.remove('drop-target'));
  tr.addEventListener('drop', (e) => {
    e.preventDefault();
    const to = +tr.dataset.ri;
    if (dragSrc == null || dragSrc === to) return;
    const arr = rowsOf(tableKey);
    const [moved] = arr.splice(dragSrc, 1);
    arr.splice(to, 0, moved);
    dragSrc = null;
    refresh(tableKey); commit('table');
  });
}

// ---- Colar do Excel (TSV) ----
function onPaste(e, tableKey, ri, col) {
  const text = (e.clipboardData || window.clipboardData).getData('text');
  if (!text || (!text.includes('\t') && !text.includes('\n'))) return; // colar simples: deixa o navegador
  e.preventDefault();
  const def = TABLE_DEFS[tableKey];
  const startCol = def.cols.findIndex((c) => c.k === col);
  const grid = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
  const arr = rowsOf(tableKey);

  grid.forEach((cells, r) => {
    const targetRow = ri + r;
    while (arr.length <= targetRow) arr.push(emptyRow(tableKey));
    cells.forEach((val, ci) => {
      const c = def.cols[startCol + ci];
      if (c) arr[targetRow][c.k] = val.trim();
    });
  });
  refresh(tableKey); commit('table');
  toast(`${grid.length} linha(s) coladas`, 'ok');
}
