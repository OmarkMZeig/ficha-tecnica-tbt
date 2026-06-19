// Bootstrap e orquestracao geral do aplicativo.
import { el, toast, modal, confirmDialog, $, $$ } from './util.js';
import * as db from './db.js';
import { newFicha } from './model.js';
import { TEMPLATES } from './templates.js';
import {
  store, subscribe, createNew, loadById, listFichas, saveNow, commit,
  duplicateCurrent, newVersionCurrent, addImageFromFile, imageUrl, setCurrent,
} from './store.js';
import { renderPage } from './ficha.js';
import * as canvas from './canvas.js';
import { initInspector, showSelection } from './inspector.js';
import { initLibrary, refreshLibrary } from './library.js';
import { exportPDF, exportImage, exportFichaFile, importFichaFile } from './export.js';
import { loadBrandLogo, setBrandLogo, brandLogoEl, brandLogo } from './brand.js';
import { readFileAsDataURL } from './util.js';

const pageEl = $('#page');
const boardSel = '.drawing-board';
let view = 'editor';

// ---------------- Ferramentas (barra esquerda) ----------------
const TOOLS = [
  { t: 'select', icon: '➚', label: 'Selecionar (V)' },
  { t: 'image', icon: '🖼', label: 'Imagem (I)' },
  { sep: true },
  { t: 'text', icon: 'T', label: 'Texto (T)' },
  { t: 'arrow', icon: '↗', label: 'Seta (A)' },
  { t: 'line', icon: '╱', label: 'Linha (L)' },
  { t: 'circle', icon: '◯', label: 'Círculo (C)' },
  { t: 'rect', icon: '▭', label: 'Retângulo (R)' },
  { t: 'callout', icon: '💬', label: 'Balão (B)' },
  { t: 'number', icon: '①', label: 'Número (N)' },
];

function buildTools() {
  const nav = $('#tools');
  nav.innerHTML = '';
  for (const it of TOOLS) {
    if (it.sep) { nav.append(el('div', { class: 'sep' })); continue; }
    const b = el('button', { class: 'tool', dataset: { tool: it.t } },
      el('span', { html: it.icon }), el('span', { class: 'label', text: it.label }));
    b.onclick = () => activateTool(it.t);
    nav.append(b);
  }
}

function activateTool(t) {
  if (t === 'image') { $('#fileImage').click(); return; }
  canvas.setTool(t);
}

// ---------------- Topbar ----------------
function buildTopbar() {
  const a = $('#topActions');
  a.innerHTML = '';
  a.append(
    iconBtn('＋ Nova', 'ghost', openTemplatePicker),
    iconBtn('💾 Salvar', 'ghost', async () => { await saveNow(); toast('Ficha salva', 'ok'); }),
    iconBtn('⧉ Duplicar', 'ghost', async () => { await duplicateCurrent(); toast('Ficha duplicada', 'ok'); }),
    iconBtn('＋ Versão', 'ghost', openNewVersion),
    iconBtn('⬇ Exportar', 'primary', openExportMenu),
    iconBtn('⋯', 'ghost', openMoreMenu),
  );
  // toggle de visao
  $$('#viewToggle button').forEach((b) => b.onclick = () => switchView(b.dataset.view));
}
const iconBtn = (label, cls, on) => el('button', { class: `btn ${cls}`, onclick: on }, label);

function switchView(v) {
  view = v;
  $$('#viewToggle button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  $('#workspace').hidden = v !== 'editor';
  $('#library').hidden = v !== 'library';
  if (v === 'library') refreshLibrary();
}

// ---------------- Menus ----------------
function openTemplatePicker() {
  const grid = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } });
  for (const tpl of TEMPLATES) {
    const card = el('button', { class: 'btn ghost', style: { height: 'auto', padding: '16px 10px', flexDirection: 'column', gap: '6px', fontSize: '13px' } },
      el('div', { style: { fontSize: '26px' } }, tpl.icon), el('div', { text: tpl.nome }));
    card.onclick = async () => { m.close(); await createNew(tpl.build()); switchView('editor'); toast(`Nova ficha: ${tpl.nome}`, 'ok'); };
    grid.append(card);
  }
  const m = modal({ title: 'Nova ficha — escolha um modelo', body: grid, width: '520px' });
}

function openNewVersion() {
  const inp = el('textarea', { placeholder: 'O que mudou nesta versão?', style: { width: '100%', minHeight: '70px', padding: '8px', background: 'var(--bg-toolbar)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px' } });
  const ok = el('button', { class: 'btn primary' }, 'Criar versão');
  const m = modal({
    title: 'Nova versão', width: '440px',
    body: el('div', {}, el('p', { class: 'hint', style: { marginBottom: '10px' } }, `Versão atual: ${store.current.meta.versao}. Será criada a próxima e registrada no controle de revisões.`), inp),
    footer: [el('button', { class: 'btn ghost', onclick: () => m.close() }, 'Cancelar'), ok],
  });
  ok.onclick = async () => { m.close(); await newVersionCurrent(inp.value.trim()); toast(`Versão ${store.current.meta.versao} criada`, 'ok'); };
}

function openExportMenu() {
  const body = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    bigBtn('📄  PDF (impressão / Salvar como PDF)', 'Qualidade total para impressão e envio.', () => { m.close(); exportPDF(); }),
    bigBtn('🖼  PNG (imagem de alta resolução)', 'Para WhatsApp, e-mail ou apresentação.', () => { m.close(); exportImage('png'); }),
    bigBtn('🖼  JPG (imagem compacta)', 'Arquivo menor, boa para compartilhar.', () => { m.close(); exportImage('jpg'); }),
    bigBtn('💾  Arquivo .ftj (backup / enviar a outro PC)', 'Inclui imagens. Reimportável em Mais ▸ Importar.', () => { m.close(); exportFichaFile(); }),
  );
  const m = modal({ title: 'Exportar ficha', body, width: '480px' });
}

function openMoreMenu() {
  const body = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    bigBtn('🏷  Definir logo da marca (PNG/JPG)', 'Aparece no cabeçalho de todas as fichas. Padrão: #TBT.', () => { m.close(); chooseBrandLogo(); }),
    brandLogo() ? bigBtn('↺  Voltar ao logo #TBT', 'Remove o logo enviado.', async () => { m.close(); await setBrandLogo(null); applyTopbarLogo(); commit('load'); }) : null,
    bigBtn('📥  Importar ficha (.ftj.json)', 'Abre uma ficha exportada de outro computador.', () => { m.close(); $('#fileFtj').click(); }),
    bigBtn('💾  Salvar como modelo', 'Reutilize esta ficha como ponto de partida.', () => { m.close(); saveAsTemplate(); }),
    bigBtn('🗑  Excluir esta ficha', 'Remove a ficha atual do banco.', async () => { m.close(); if (await confirmDialog('Excluir a ficha atual?', { danger: true, okLabel: 'Excluir' })) { await db.deleteFicha(store.current.id); await bootAfterDelete(); } }),
  );
  const m = modal({ title: 'Mais ações', body, width: '460px' });
}

function chooseBrandLogo() {
  const inp = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/jpg,image/webp', style: { display: 'none' } });
  document.body.append(inp);
  inp.onchange = async () => {
    const file = inp.files[0]; inp.remove();
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    await setBrandLogo(dataUrl);
    applyTopbarLogo();
    commit('load');
    toast('Logo da marca atualizado', 'ok');
  };
  inp.click();
}

function applyTopbarLogo() {
  const slot = $('#brandLogoSlot');
  if (slot) { slot.innerHTML = ''; slot.append(brandLogoEl({ height: 18, color: '#ffffff' })); }
}

async function saveAsTemplate() {
  const f = JSON.parse(JSON.stringify(store.current));
  f.meta.referencia = ''; f.meta.codigoInterno = ''; f.board.objects = [];
  await db.saveTemplate({ id: 'utpl-' + Date.now(), nome: f.meta.descricao || f.meta.categoria, ficha: f });
  toast('Modelo salvo', 'ok');
}

const bigBtn = (title, sub, on) => {
  const b = el('button', { class: 'btn ghost', style: { height: 'auto', padding: '12px 14px', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left' }, onclick: on },
    el('div', { style: { fontWeight: '600' }, text: title }), el('div', { class: 'hint', text: sub }));
  return b;
};

// ---------------- Imagens: input, drag-drop, colar ----------------
function wireImageImport() {
  $('#fileImage').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    for (const file of files) await importImage(file);
  });

  // arrastar arquivo para a prancheta
  const scroll = $('#canvasScroll');
  scroll.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  scroll.addEventListener('drop', async (e) => {
    const files = [...(e.dataTransfer.files || [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    for (const file of files) await importImage(file);
  });

  // colar imagem do clipboard
  document.addEventListener('paste', async (e) => {
    if (isEditingText()) return;
    const items = [...(e.clipboardData?.items || [])];
    const imgItem = items.find((i) => i.type.startsWith('image/'));
    if (imgItem) { const file = imgItem.getAsFile(); if (file) await importImage(file); }
  });
}

async function importImage(file) {
  if (!file.type.startsWith('image/')) { toast('Formato não suportado', 'err'); return; }
  const key = await addImageFromFile(file);
  const dims = await imageDims(imageUrl(key));
  if (view !== 'editor') switchView('editor');
  canvas.addImageObject(key, dims.w, dims.h);
  toast('Imagem adicionada', 'ok');
}
const imageDims = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res({ w: 200, h: 240 }); i.src = url; });

// ---------------- Teclado ----------------
function isEditingText() {
  const a = document.activeElement;
  return a && (a.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName));
}
function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow().then(() => toast('Ficha salva', 'ok')); return; }
    if (isEditingText()) return;
    const sel = canvas.getSelected();
    if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); canvas.duplicateSelected(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); canvas.deleteSelected(); return; }
    if (e.key === 'Escape') { canvas.setTool('select'); canvas.deselect(); return; }
    if (sel && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const d = e.shiftKey ? 10 : 1;
      const patch = {};
      if (e.key === 'ArrowUp') patch.y = sel.y - d;
      if (e.key === 'ArrowDown') patch.y = sel.y + d;
      if (e.key === 'ArrowLeft') patch.x = sel.x - d;
      if (e.key === 'ArrowRight') patch.x = sel.x + d;
      canvas.updateSelected(patch);
      return;
    }
    // atalhos de ferramenta
    const map = { v: 'select', i: 'image', t: 'text', a: 'arrow', l: 'line', c: 'circle', r: 'rect', b: 'callout', n: 'number' };
    const k = e.key.toLowerCase();
    if (map[k] && !e.ctrlKey && !e.metaKey) activateTool(map[k]);
  });
}

// ---------------- Render no carregamento de ficha ----------------
function onStoreChange(f, reason) {
  if (reason !== 'load') return; // edicoes pontuais nao re-renderizam tudo
  renderPage(pageEl);
  canvas.mountBoard(pageEl.querySelector(boardSel), { onSelect: (o) => showSelection(o) });
  showSelection(null);
}

async function bootAfterDelete() {
  const list = await listFichas();
  if (list.length) await loadById(list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0].id);
  else await createNew(TEMPLATES[0].build());
  switchView('editor');
}

// ---------------- Init ----------------
async function init() {
  buildTools();
  buildTopbar();
  await loadBrandLogo();
  applyTopbarLogo();
  initInspector($('#inspector'));
  initLibrary($('#library'), { open: async (id) => { await loadById(id); switchView('editor'); } });
  wireImageImport();
  wireKeyboard();
  subscribe(onStoreChange);

  // input oculto para importar .ftj
  const ftj = el('input', { type: 'file', id: 'fileFtj', accept: '.json,.ftj', hidden: 'true' });
  ftj.addEventListener('change', async (e) => { const file = e.target.files[0]; e.target.value = ''; if (file) try { await importFichaFile(file); switchView('editor'); } catch (err) { toast('Falha: ' + err.message, 'err'); } });
  document.body.append(ftj);

  // abre a ultima ficha ou cria a partir de template
  const last = await db.getMeta('lastId');
  const list = await listFichas();
  if (last && list.find((x) => x.id === last)) await loadById(last);
  else if (list.length) await loadById(list[0].id);
  else await createNew((TEMPLATES.find((t) => t.id === 'tpl-exemplo') || TEMPLATES[0]).build()); // 1o uso: exemplo preenchido

  // guarda ultima ficha aberta
  subscribe((f, reason) => { if (f && reason === 'load') db.setMeta('lastId', f.id); });

  canvas.setTool('select');
}

init().catch((e) => { console.error(e); toast('Erro ao iniciar: ' + e.message, 'err'); });
