// Bootstrap e orquestracao geral do aplicativo.
import { el, toast, modal, confirmDialog, $, $$ } from './util.js';
import * as db from './db.js';
import { newFicha, emptyRows, newSpecs } from './model.js';
import { TEMPLATES } from './templates.js';
import {
  store, subscribe, createNew, loadById, listFichas, saveNow, commit,
  duplicateCurrent, newVersionCurrent, addImageFromFile, imageUrl, setCurrent,
  getMode, setBackendMode, nextFichaNumber,
} from './store.js';
import * as cloud from './cloud.js';
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
  { t: 'zoom', icon: '🔍', label: 'Zoom de detalhe (Z)' },
  { sep: true },
  { t: 'clear', icon: '🧹', label: 'Limpar preenchimentos', action: 'clear' },
];

function buildTools() {
  const nav = $('#tools');
  nav.innerHTML = '';
  for (const it of TOOLS) {
    if (it.sep) { nav.append(el('div', { class: 'sep' })); continue; }
    const b = el('button', { class: 'tool', dataset: { tool: it.t } },
      el('span', { html: it.icon }), el('span', { class: 'label', text: it.label }));
    b.onclick = () => (it.action === 'clear' ? openClearMenu() : activateTool(it.t));
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
    el('button', { class: 'btn ghost', id: 'cloudBtn', onclick: onCloudClick }, '☁ Nuvem'),
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
  let tipo = 'producao';
  const seg = el('div', { class: 'seg', style: { display: 'inline-flex', marginBottom: '14px' } });
  const bProd = el('button', { class: 'active' }, '🏭 Produção');
  const bPil = el('button', {}, '🧪 Piloto');
  bProd.onclick = () => { tipo = 'producao'; bProd.classList.add('active'); bPil.classList.remove('active'); };
  bPil.onclick = () => { tipo = 'piloto'; bPil.classList.add('active'); bProd.classList.remove('active'); };
  seg.append(bProd, bPil);

  const grid = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } });
  for (const tpl of TEMPLATES) {
    const card = el('button', { class: 'btn ghost', style: { height: 'auto', padding: '16px 10px', flexDirection: 'column', gap: '6px', fontSize: '13px' } },
      el('div', { style: { fontSize: '26px' } }, tpl.icon), el('div', { text: tpl.nome }));
    card.onclick = async () => {
      m.close();
      const fic = tpl.build();
      fic.meta.tipo = tipo;
      fic.meta.numero = await nextFichaNumber(tipo);
      await createNew(fic);
      switchView('editor');
      toast(`Nova ficha ${tipo === 'piloto' ? 'PILOTO' : 'de produção'} Nº ${fic.meta.numero}`, 'ok');
    };
    grid.append(card);
  }
  const body = el('div', {},
    el('p', { class: 'hint', style: { marginBottom: '6px' } }, 'A ficha é de produção ou de piloto? (numeração separada — piloto termina com “P”)'),
    seg, grid);
  const m = modal({ title: 'Nova ficha', body, width: '520px' });
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

// ---------------- Limpar preenchimentos ----------------
const CLEAR_MODULES = [
  { key: 'cabecalho', label: 'Cabeçalho (referência, tecido, linha, pesponto, grade...)' },
  { key: 'desenho', label: 'Desenho técnico (imagens e marcações)' },
  { key: 'medidas', label: 'Tabela de medidas' },
  { key: 'aviamentos', label: 'Aviamentos' },
  { key: 'materiais', label: 'Materiais / Tecidos' },
  { key: 'custos', label: 'Custos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'revisoes', label: 'Revisões' },
  { key: 'aprovacoes', label: 'Aprovações e rodapé' },
];

function clearModule(f, key) {
  if (key === 'cabecalho') {
    const keep = { numero: f.meta.numero, categoria: f.meta.categoria, versao: f.meta.versao, marca: f.meta.marca };
    f.meta = { ...newFicha().meta, ...keep };
    f.specs = newSpecs();
    f.grade.qtd = f.grade.sizes.map(() => '');
  } else if (key === 'desenho') { f.board.objects = []; f.board.numberSeq = 0; }
  else if (key === 'medidas') { f.medidas.rows.forEach((r) => { r.a = []; r.d = []; }); }
  else if (key === 'aviamentos') { f.tables.aviamentos = emptyRows('aviamentos', 4); }
  else if (key === 'materiais') { f.tables.materiais = emptyRows('materiais', 2); }
  else if (key === 'custos') { f.tables.custos = emptyRows('custos', 4); }
  else if (key === 'observacoes') { f.observacoes = ''; }
  else if (key === 'revisoes') { f.revisoes = []; }
  else if (key === 'aprovacoes') { f.assinaturas = { modelista: '', aprovacao: '', producao: '' }; f.footer = { oficina: '', desenho: '', modelagem: '', fichaTecnica: '' }; }
}

function openClearMenu() {
  const opts = CLEAR_MODULES.map((mod) => {
    const chk = el('input', { type: 'checkbox' });
    return { mod, chk, row: el('label', { class: 'clear-row' }, chk, el('span', { text: mod.label })) };
  });
  const allChk = el('input', { type: 'checkbox' });
  allChk.onchange = () => opts.forEach((o) => { o.chk.checked = allChk.checked; });
  const allRow = el('label', { class: 'clear-row master' }, allChk, el('span', { text: 'Tudo (limpar a ficha inteira)' }));

  const ok = el('button', { class: 'btn danger' }, 'Limpar selecionados');
  const body = el('div', {},
    el('p', { class: 'hint', style: { marginBottom: '10px' } }, 'Apaga apenas os PREENCHIMENTOS (a ficha e o número não são excluídos). Marque o que limpar:'),
    allRow,
    el('div', { style: { height: '1px', background: 'var(--border)', margin: '8px 0' } }),
    ...opts.map((o) => o.row));
  const m = modal({ title: '🧹 Limpar preenchimentos', body, width: '460px', footer: [el('button', { class: 'btn ghost', onclick: () => m.close() }, 'Cancelar'), ok] });

  ok.onclick = async () => {
    const keys = opts.filter((o) => o.chk.checked).map((o) => o.mod.key);
    if (!keys.length) { toast('Selecione ao menos um módulo'); return; }
    m.close();
    if (!await confirmDialog(`Apagar os preenchimentos de ${keys.length === CLEAR_MODULES.length ? 'TODA a ficha' : keys.length + ' módulo(s)'}? Não dá para desfazer.`, { danger: true, okLabel: 'Limpar' })) return;
    keys.forEach((k) => clearModule(store.current, k));
    commit('load');
    await saveNow();
    canvas.setTool('select');
    toast('Preenchimentos limpos', 'ok');
  };
}

// ---------------- Nuvem (Firebase) ----------------
function onCloudClick() {
  if (!cloud.cloudAvailable()) { toast('Sem internet — a nuvem precisa de conexão', 'err'); return; }
  if (cloud.currentUser()) openCloudMenu();
  else openCloudLogin();
}

function openCloudLogin() {
  const email = el('input', { type: 'email', placeholder: 'E-mail', style: inputCss });
  const senha = el('input', { type: 'password', placeholder: 'Senha', style: inputCss });
  const msg = el('div', { class: 'hint', style: { color: 'var(--danger)', minHeight: '14px', marginTop: '4px' } });
  const ok = el('button', { class: 'btn primary' }, 'Entrar');
  const body = el('div', {},
    el('p', { class: 'hint', style: { marginBottom: '10px' } }, 'Use o mesmo login do ERP. As fichas passam a ser compartilhadas com a equipe.'),
    el('div', { class: 'field' }, el('label', { text: 'E-mail' }), email),
    el('div', { class: 'field' }, el('label', { text: 'Senha' }), senha),
    msg);
  const m = modal({ title: '☁ Entrar na nuvem', body, width: '420px', footer: [el('button', { class: 'btn ghost', onclick: () => m.close() }, 'Cancelar'), ok] });
  const tryLogin = async () => {
    ok.disabled = true; msg.textContent = 'Conectando...';
    try {
      await cloud.login(email.value.trim(), senha.value);
      m.close();
      await enterCloud();
    } catch (e) { msg.textContent = cloud.friendlyError(e); ok.disabled = false; }
  };
  ok.onclick = tryLogin;
  senha.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
  setTimeout(() => email.focus(), 50);
}

function openCloudMenu() {
  const u = cloud.currentUser();
  const body = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    el('p', { class: 'hint' }, `Conectado como ${u && u.email}. Modo atual: ${getMode() === 'cloud' ? 'NUVEM (compartilhado)' : 'LOCAL'}.`),
    getMode() !== 'cloud' ? bigBtn('☁  Usar a nuvem agora', 'Carrega as fichas compartilhadas da equipe.', async () => { m.close(); await enterCloud(); }) : null,
    bigBtn('💻  Voltar ao modo local', 'Usa só as fichas deste computador.', async () => { m.close(); await setBackendMode('local'); await reloadForMode(); updateCloudUI(); toast('Modo local', 'ok'); }),
    bigBtn('🚪  Sair da conta', 'Desconecta a nuvem.', async () => { m.close(); await cloud.logout(); await setBackendMode('local'); await reloadForMode(); updateCloudUI(); toast('Desconectado', 'ok'); }),
  );
  const m = modal({ title: '☁ Nuvem', body, width: '440px' });
}

async function enterCloud() {
  try {
    await setBackendMode('cloud');
    await reloadForMode();
    updateCloudUI();
    toast('Conectado à nuvem — fichas compartilhadas', 'ok');
  } catch (e) { console.error(e); toast('Erro ao carregar nuvem: ' + (e.message || e), 'err'); }
}

async function reloadForMode() {
  const list = await listFichas();
  if (list.length) await loadById(list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0].id);
  else await createNew((TEMPLATES.find((t) => t.id === 'tpl-exemplo') || TEMPLATES[0]).build());
  if (view === 'library') refreshLibrary();
}

function updateCloudUI() {
  const b = $('#cloudBtn');
  if (!b) return;
  const u = cloud.cloudAvailable() && cloud.currentUser();
  if (getMode() === 'cloud' && u) { b.textContent = '☁ Nuvem ✓'; b.classList.add('primary'); b.classList.remove('ghost'); }
  else if (u) { b.textContent = '☁ Nuvem'; b.classList.remove('primary'); b.classList.add('ghost'); }
  else { b.textContent = '☁ Entrar'; b.classList.remove('primary'); b.classList.add('ghost'); }
}

const inputCss = { width: '100%', height: '36px', padding: '0 10px', background: 'var(--bg-toolbar)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px' };

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
  if (slot) { slot.innerHTML = ''; slot.append(brandLogoEl({ height: 18, color: '#ffffff', variant: 'chrome' })); }
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
    const map = { v: 'select', i: 'image', t: 'text', a: 'arrow', l: 'line', c: 'circle', r: 'rect', b: 'callout', n: 'number', z: 'zoom' };
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

  // Nuvem: reflete login e auto-entra se a preferência salva for "cloud"
  if (cloud.cloudAvailable()) {
    cloud.onAuth(async (user) => {
      updateCloudUI();
      const pref = await db.getMeta('mode');
      if (user && pref === 'cloud' && getMode() !== 'cloud') await enterCloud();
      else if (!user && getMode() === 'cloud') { await setBackendMode('local'); await reloadForMode(); updateCloudUI(); }
    });
  }
  updateCloudUI();

  canvas.setTool('select');
}

init().catch((e) => { console.error(e); toast('Erro ao iniciar: ' + e.message, 'err'); });
