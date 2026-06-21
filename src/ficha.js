// Renderiza o documento A4 completo, no padrao de uma ficha de jeans:
// cabecalho denso em 2 blocos + grade + desenho + medidas (antes/depois) +
// aviamentos/materiais/custos + observacoes + revisoes + assinaturas + rodape.
import { el, brDate, isoDate } from './util.js';
import { store, touch, commit } from './store.js';
import { tableSection } from './tables.js';
import { measuresSection, refreshMeasures } from './measures.js';
import { brandLogoEl } from './brand.js';
import { blockTitle, sectionClass, rowEye, rowHiddenClass } from './blocks.js';

export function renderPage(pageEl) {
  const f = store.current;
  pageEl.innerHTML = '';
  pageEl.append(
    headerBlock(f),
    drawingBlock(),
    measuresSection(),
    tablesBlock(),
    qualidadeBlock(f),
    obsBlock(f),
    revisionsBlock(f),
    signaturesBlock(f),
    footerBlock(f),
  );
  syncTopbar();
}

// Campo editavel ligado a obj[key]
function ed(obj, key, ph = '', cls = 'sv') {
  const v = el('div', { class: cls, contenteditable: 'true', dataset: { ph, f: key } });
  v.textContent = obj[key] || '';
  v.addEventListener('input', () => { obj[key] = v.textContent; touch(); if (['referencia', 'descricao', 'produto', 'categoria'].includes(key)) syncTopbar(); });
  return v;
}
const sLine = (label, obj, key, ph) => el('div', { class: 'sline' }, el('span', { class: 'sk' }, label), ed(obj, key, ph));
const sLine2 = (l1, o1, k1, l2, o2, k2) => el('div', { class: 'sline two' },
  el('span', { class: 'sk' }, l1), ed(o1, k1, ''), el('span', { class: 'sk sk2' }, l2), ed(o2, k2, ''));

// ---- Cabecalho ----
function headerBlock(f) {
  const m = f.meta, s = f.specs;

  const brand = el('div', { class: 'fic-brandbar' },
    el('div', { class: 'blogo' }, brandLogoEl({ height: 26, color: '#111' })),
    el('div', { class: 'btitles' },
      el('div', { class: 'ttl' }, 'FICHA TÉCNICA DE PRODUÇÃO'),
      el('div', { class: 'sub two' }, el('span', { class: 'sk' }, 'Coleção'), ed(m, 'colecao', 'Coleção / Estação'))),
    el('div', { class: 'spacer' }),
    el('div', { class: 'fic-op' }, el('span', { class: 'sk' }, 'OP'), ed(m, 'op', '—', 'sv inline')),
    el('div', { class: 'fic-num' }, el('span', { class: 'sk' }, 'Ficha Nº'), ed(m, 'numero', '0000', 'sv inline')),
    el('div', { class: 'ver-badge' }, 'v', ed(m, 'versao', '1.0', 'sv inline')),
  );

  // tira de controle (metadados do sistema / Biblioteca)
  const ctrl = el('div', { class: 'fic-ctrl' },
    ctrlCell('Referência', m, 'referencia', 'REF'),
    ctrlCell('Descrição', m, 'descricao', 'Nome curto'),
    ctrlCell('Cliente', m, 'cliente', 'Cliente'),
    ctrlCell('Responsável', m, 'responsavel', 'Responsável'),
    ctrlCell('Data', m, 'data', 'dd/mm/aaaa'),
  );

  // bloco esquerdo: tecido / linha / pesponto / consumo
  const left = el('div', { class: 'hcol' },
    sLine2('Tecido', s, 'tecido', 'Tecelagem', s, 'tecelagem'),
    sLine('Composição', s, 'composicao', '% algodão / elastano...'),
    sLine2('Linha', s, 'linha', 'Cartela', s, 'cartela'),
    sLine('Pesponto 1AG', s, 'pesponto1', ''),
    sLine('Pesponto 2AG', s, 'pesponto2', ''),
    sLine('Pesponto 3AG', s, 'pesponto3', ''),
    sLine2('Travetes', s, 'travetes', 'Caseados', s, 'caseados'),
    sLine2('Fio interno', s, 'fioInterno', 'Filigrana', s, 'filigrana'),
    sLine2('Piloteiro', s, 'piloteiro', 'Lacre', s, 'lacre'),
    sLine2('Consumo peça', s, 'consumoPeca', 'Consumo aviam.', s, 'consumoAvios'),
  );

  // bloco direito: forro / produto / grade
  const right = el('div', { class: 'hcol' },
    sLine2('Tecido forro', s, 'tecidoForro', 'Tecelagem', s, 'tecelagemForro'),
    sLine('Composição forro', s, 'composicaoForro', ''),
    sLine('Produto', m, 'produto', 'Ex.: Calça Fem J Ly Skinny Cropped'),
    sLine2('Grupo', m, 'grupo', 'Modelagem', m, 'modelagem'),
    sLine2('Tipo produto', m, 'tipoProduto', 'Categoria', m, 'categoria'),
    sLine2('Família', m, 'familia', 'Marca', m, 'marca'),
    el('div', { class: 'sline three' },
      el('span', { class: 'sk' }, 'OC'), ed(m, 'oc'),
      el('span', { class: 'sk sk2' }, 'PROD'), ed(m, 'prod'),
      el('span', { class: 'sk sk2' }, 'M'), ed(m, 'mNum')),
    gradeBlock(f),
  );

  return el('section', { class: 'fic-head' }, brand, ctrl, el('div', { class: 'fic-head2' }, left, right));
}

function ctrlCell(label, obj, key, ph) {
  return el('div', { class: 'cc' }, el('div', { class: 'k' }, label), ed(obj, key, ph, 'v'));
}

// Grade de tamanhos + quantidades (pedido)
function gradeBlock(f) {
  const g = f.grade;
  const wrap = el('div', { class: 'grade-wrap' });
  const render = () => {
    wrap.innerHTML = '';
    g.ziper = g.ziper || g.sizes.map(() => '');
    const tbl = el('table', { class: 'grade' });
    const rsz = el('tr', {}, el('th', { class: 'glabel' }, 'GRADE'));
    const rqt = el('tr', {}, el('th', { class: 'glabel' }, 'PEDIDO'));
    const rzp = el('tr', {}, el('th', { class: 'glabel' }, 'ZÍPER'));
    g.sizes.forEach((sz, i) => {
      const ts = el('td', { class: 'gsize', contenteditable: 'true' }); ts.textContent = sz;
      ts.addEventListener('input', () => { g.sizes[i] = ts.textContent; touch(); refreshMeasures(); });
      const tq = el('td', { class: 'gqtd', contenteditable: 'true' }); tq.textContent = g.qtd[i] || '';
      tq.addEventListener('input', () => { g.qtd[i] = tq.textContent; touch(); });
      const tz = el('td', { class: 'gzip', contenteditable: 'true' }); tz.textContent = g.ziper[i] || '';
      tz.addEventListener('input', () => { g.ziper[i] = tz.textContent; touch(); });
      rsz.append(ts); rqt.append(tq); rzp.append(tz);
    });
    const ctl = el('td', { class: 'gctl', rowspan: '3' },
      el('button', { class: 'gbtn', title: 'Adicionar tamanho', onclick: () => { g.sizes.push(''); g.qtd.push(''); g.ziper.push(''); render(); commit('grade'); } }, '+'),
      el('button', { class: 'gbtn', title: 'Remover último', onclick: () => { if (g.sizes.length > 1) { const i = g.sizes.length - 1; g.sizes.pop(); g.qtd.pop(); g.ziper.pop(); f.medidas.rows.forEach((r) => { r.a.splice(i, 1); r.d.splice(i, 1); }); render(); refreshMeasures(); commit('grade'); } } }, '−'),
    );
    rsz.append(ctl);
    tbl.append(rsz, rqt, rzp);
    wrap.append(tbl);
  };
  render();
  return wrap;
}

// ---- Prancheta ----
function drawingBlock() {
  return el('section', { class: sectionClass('drawing-wrap', 'desenho') },
    blockTitle('Desenho Técnico / Imagens', 'desenho',
      el('span', { style: { fontWeight: '400', opacity: '.75', fontSize: '8.5px' } }, 'arraste imagens e marcações nesta área')),
    el('div', { class: 'drawing-board' }));
}

// ---- Aviamentos / Materiais / Custos (empilhados, largura total) ----
function tablesBlock() {
  const sec = el('section', {});
  sec.append(tableSection('aviamentos'));
  sec.append(tableSection('materiais'));
  sec.append(tableSection('custos'));
  return sec;
}

// ---- Observacoes ----
function obsBlock(f) {
  const box = el('div', { class: 'obs-box', contenteditable: 'true', dataset: { ph: 'Observações técnicas, lavagem, acabamento, bitolas...' } });
  box.textContent = f.observacoes || '';
  box.addEventListener('input', () => { f.observacoes = box.textContent; touch(); });
  return el('section', { class: sectionClass('', 'observacoes') }, blockTitle('Observações', 'observacoes'), box);
}

// ---- Controle de Qualidade (defeitos por etapa) ----
function qualidadeBlock(f) {
  f.qualidade = f.qualidade || { rows: [] };
  const sec = el('section', { class: sectionClass('cq-section', 'qualidade') });
  const render = () => {
    sec.innerHTML = '';
    const title = blockTitle('Controle de Qualidade', 'qualidade',
      el('button', { class: 'add-row', onclick: () => { f.qualidade.rows.push({ etapa: '', verificadas: '', defeitos: '', tipo: '', status: '' }); render(); commit('cq'); } }, '+ etapa'));
    const cols = [
      { k: 'etapa', label: 'Etapa', w: '110px' },
      { k: 'verificadas', label: 'Qtd verificada', w: '78px', c: true },
      { k: 'defeitos', label: 'Qtd defeito', w: '70px', c: true },
      { k: 'tipo', label: 'Tipo de defeito' },
      { k: 'status', label: 'Status', w: '90px' },
    ];
    const thead = el('thead', {}, el('tr', {}, ...cols.map((c) => el('th', { style: c.w ? { width: c.w } : {} }, c.label)), el('th', { style: { width: '30px' }, html: '&nbsp;' })));
    const tb = el('tbody');
    f.qualidade.rows.forEach((r, i) => {
      const tr = el('tr', { class: rowHiddenClass(r) });
      cols.forEach((c) => {
        const td = el('td', { contenteditable: 'true', class: c.c ? 'num' : '' });
        td.textContent = r[c.k] || '';
        td.addEventListener('input', () => { r[c.k] = td.textContent; touch(); });
        tr.append(td);
      });
      tr.append(el('td', { class: 'rowctl' },
        rowEye(r, () => { render(); commit('cq'); }),
        el('span', { class: 'del-row', onclick: () => { f.qualidade.rows.splice(i, 1); render(); commit('cq'); } }, '✕')));
      tb.append(tr);
    });
    sec.append(title, el('div', { class: 'tbl-wrap' }, el('table', { class: 'fic' }, thead, tb)));
  };
  render();
  return sec;
}

// ---- Revisoes ----
function revisionsBlock(f) {
  f.revisoes = f.revisoes || [];
  const sec = el('section', { class: sectionClass('rev-section', 'revisoes') });
  const render = () => {
    sec.innerHTML = '';
    const title = blockTitle('Controle de Revisões', 'revisoes',
      el('button', { class: 'add-row', onclick: () => { f.revisoes.push({ data: brDate(isoDate()), usuario: f.meta.responsavel || '', alteracao: '' }); render(); commit('rev'); } }, '+ revisão'));
    const tb = el('tbody');
    f.revisoes.forEach((r, i) => {
      const tr = el('tr', { class: rowHiddenClass(r) });
      ['data', 'usuario', 'alteracao'].forEach((k) => {
        const td = el('td', { contenteditable: 'true', class: k === 'data' ? 'num' : '' });
        td.textContent = r[k] || '';
        td.addEventListener('input', () => { r[k] = td.textContent; touch(); });
        tr.append(td);
      });
      tr.append(el('td', { class: 'rowctl' },
        rowEye(r, () => { render(); commit('rev'); }),
        el('span', { class: 'del-row', onclick: () => { f.revisoes.splice(i, 1); render(); commit('rev'); } }, '✕')));
      tb.append(tr);
    });
    const table = el('table', { class: 'fic' },
      el('thead', {}, el('tr', {}, el('th', { style: { width: '80px' } }, 'Data'), el('th', { style: { width: '120px' } }, 'Usuário'), el('th', {}, 'Alteração realizada'), el('th', { style: { width: '30px' }, html: '&nbsp;' }))), tb);
    sec.append(title, el('div', { class: 'tbl-wrap' }, table));
  };
  render();
  return sec;
}

// ---- Assinaturas ----
function signaturesBlock(f) {
  f.assinaturas = f.assinaturas || { modelista: '', aprovacao: '', producao: '' };
  const cell = (key, role) => {
    const who = el('div', { class: 'who', contenteditable: 'true' });
    who.textContent = f.assinaturas[key] || '';
    who.addEventListener('input', () => { f.assinaturas[key] = who.textContent; touch(); });
    return el('div', { class: 'sign-cell' }, el('div', { class: 'line' }), who, el('div', {}, role));
  };
  return el('section', { class: sectionClass('', 'aprovacoes') }, blockTitle('Aprovações', 'aprovacoes'),
    el('div', { class: 'sign-row' }, cell('modelista', 'Modelista'), cell('aprovacao', 'Aprovação de Amostra'), cell('producao', 'Produção / PCP')));
}

// ---- Rodape responsaveis ----
function footerBlock(f) {
  const fo = f.footer;
  const cell = (label, key) => el('div', { class: 'foot-cell' }, el('span', { class: 'sk' }, label), ed(fo, key, ''));
  return el('div', { class: 'fic-foot2' },
    cell('Oficina', 'oficina'), cell('Desenho', 'desenho'),
    cell('Modelagem', 'modelagem'), cell('Ficha Técnica', 'fichaTecnica'));
}

export function syncTopbar() {
  const f = store.current;
  const r = document.getElementById('topRef');
  const d = document.getElementById('topDesc');
  if (r) r.textContent = f.meta.referencia || f.meta.familia || 'Sem referência';
  if (d) d.textContent = `${f.meta.categoria || ''}${(f.meta.produto || f.meta.descricao) ? ' • ' + (f.meta.produto || f.meta.descricao) : ''}`;
}
