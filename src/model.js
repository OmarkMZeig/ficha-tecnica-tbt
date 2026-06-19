// Modelo de dados da ficha tecnica + definicoes das tabelas.
// Estrutura inspirada na ficha real de jeans (Razon/TBT): cabecalho denso em
// 2 blocos (tecido/linha/pesponto + produto/grade) e medidas ANTES/DEPOIS de lavar.
import { uuid, isoDate, brDate } from './util.js';

export const CATEGORIAS = [
  'Calça Jeans', 'Calça Sarja', 'Bermuda Jeans', 'Bermuda Sarja',
  'Jaqueta Jeans', 'Camisa', 'Saia', 'Macacão', 'Short', 'Private Label', 'Outro',
];

// Tabelas genericas (linhas livres). Medidas tem componente proprio (grade).
export const TABLE_DEFS = {
  aviamentos: {
    title: 'Aviamentos',
    cols: [
      { k: 'codigo', label: 'Código', w: '74px' },
      { k: 'descricao', label: 'Descrição' },
      { k: 'fornecedor', label: 'Fornecedor' },
      { k: 'cor', label: 'Cor', w: '74px' },
      { k: 'qtd', label: 'Qtd', w: '44px', center: true },
    ],
  },
  materiais: {
    title: 'Materiais / Tecidos',
    cols: [
      { k: 'tecido', label: 'Tecido' },
      { k: 'composicao', label: 'Composição' },
      { k: 'gramatura', label: 'Gramatura', w: '72px' },
      { k: 'cor', label: 'Cor', w: '72px' },
      { k: 'consumo', label: 'Consumo', w: '72px' },
    ],
  },
  custos: {
    title: 'Custos',
    cols: [
      { k: 'item', label: 'Item' },
      { k: 'valor', label: 'Valor (R$)', w: '92px', center: true },
    ],
  },
};
export const TABLE_KEYS = Object.keys(TABLE_DEFS);

export function emptyRow(tableKey) {
  const row = {};
  for (const c of TABLE_DEFS[tableKey].cols) row[c.k] = '';
  return row;
}
export function emptyRows(tableKey, n) {
  return Array.from({ length: n }, () => emptyRow(tableKey));
}

// Pontos de medida padrao de uma calca jeans (linhas da grade de medidas).
export const MEASURE_ROWS = ['Cintura', 'Quadril', 'Gancho Frente', 'Gancho Costa', 'Coxa', 'Joelho', 'Barra', 'Entreperna'];

// a[] e d[] sao alinhados por INDICE a grade.sizes (sobrevive a renomear tamanho).
export function newMeasures() {
  return {
    antesDepois: true,
    rows: MEASURE_ROWS.map((m) => ({ medida: m, a: [], d: [] })),
  };
}
export const DEFAULT_SIZES = ['36', '38', '40', '42', '44', '46'];

// Paletas tecnicas (neutras + acento) para marcacoes e textos.
export const STROKE_COLORS = ['#1a1a1a', '#db4040', '#2f6fed', '#1f9d57', '#d98c12', '#8b5cf6', '#ffffff'];
export const TEXT_COLORS = ['#1a1a1a', '#db4040', '#2f6fed', '#1f9d57', '#666666'];
export const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'];

// Campos de especificacao de costura/tecido (bloco esquerdo do cabecalho).
export function newSpecs() {
  return {
    tecido: '', tecelagem: '', composicao: '',
    tecidoForro: '', tecelagemForro: '', composicaoForro: '',
    linha: '', cartela: '',
    pesponto1: '', pesponto2: '', pesponto3: '',
    travetes: '', caseados: '', fioInterno: '', filigrana: '',
    piloteiro: '', lacre: '', consumoPeca: '', consumoAvios: '',
  };
}

export function newFicha(overrides = {}) {
  const now = new Date();
  const f = {
    id: uuid(),
    meta: {
      // nucleo (usado na Biblioteca/busca/duplicar)
      referencia: '', descricao: '', marca: '', cliente: '',
      colecao: '', categoria: 'Calça Jeans', codigoInterno: '',
      responsavel: '', data: brDate(isoDate(now)), versao: '1.0', pecaPiloto: '', numero: '',
      // produto (bloco direito do cabecalho)
      produto: '', grupo: '', modelagem: '', tipoProduto: '',
      familia: '', oc: '', prod: '', mNum: '',
    },
    specs: newSpecs(),
    grade: { sizes: [...DEFAULT_SIZES], qtd: DEFAULT_SIZES.map(() => '') },
    medidas: newMeasures(),
    board: { objects: [], numberSeq: 0 },
    tables: {
      aviamentos: emptyRows('aviamentos', 4),
      materiais: emptyRows('materiais', 2),
      custos: emptyRows('custos', 4),
    },
    observacoes: '',
    revisoes: [],
    assinaturas: { modelista: '', aprovacao: '', producao: '' },
    footer: { oficina: '', desenho: '', modelagem: '', fichaTecnica: '' },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    thumb: null,
  };
  applyOverrides(f, overrides);
  return f;
}

function applyOverrides(f, ov) {
  for (const k of Object.keys(ov)) {
    if (k === 'meta' || k === 'specs' || k === 'grade' || k === 'footer' || k === 'assinaturas') Object.assign(f[k], ov[k]);
    else f[k] = ov[k];
  }
}

// Garante que fichas antigas/importadas tenham todos os campos novos.
export function ensureShape(f) {
  const base = newFicha();
  if (!f.meta) f.meta = {}; f.meta = { ...base.meta, ...f.meta };
  if (!f.specs) f.specs = {}; f.specs = { ...base.specs, ...f.specs };
  if (!f.grade || !Array.isArray(f.grade.sizes)) f.grade = base.grade;
  if (!f.grade.qtd) f.grade.qtd = f.grade.sizes.map(() => '');
  if (!f.medidas || !Array.isArray(f.medidas.rows)) f.medidas = base.medidas;
  if (!f.board) f.board = base.board;
  if (!f.tables) f.tables = base.tables;
  for (const k of TABLE_KEYS) if (!Array.isArray(f.tables[k])) f.tables[k] = emptyRows(k, 2);
  if (!f.footer) f.footer = base.footer; else f.footer = { ...base.footer, ...f.footer };
  if (!f.assinaturas) f.assinaturas = base.assinaturas;
  if (!Array.isArray(f.revisoes)) f.revisoes = [];
  return f;
}

// Cria um objeto novo da prancheta com defaults por tipo.
export function newObject(type, props = {}) {
  const base = { id: uuid(), type, x: 60, y: 60, w: 120, h: 120, rot: 0, z: Date.now() };
  const byType = {
    image: { w: 200, h: 240 },
    text: { w: 160, h: 30, text: 'Texto', font: 'Arial', size: 13, color: '#1a1a1a', bold: false, italic: false, underline: false, align: 'left' },
    arrow: { w: 120, h: 60, stroke: '#db4040', strokeW: 2.5, fill: 'none' },
    line: { w: 120, h: 2, stroke: '#1a1a1a', strokeW: 2, fill: 'none' },
    circle: { w: 90, h: 90, stroke: '#db4040', strokeW: 2.5, fill: 'none' },
    rect: { w: 120, h: 80, stroke: '#db4040', strokeW: 2.5, fill: 'none' },
    callout: { w: 150, h: 56, stroke: '#1a1a1a', strokeW: 1.2, fill: '#ffffff', text: 'Observação', font: 'Arial', size: 10, color: '#1a1a1a' },
    number: { w: 24, h: 24, value: 1, stroke: '#1a1a1a', fill: '#1a1a1a', color: '#fff' },
    // detalhe ampliado (lupa): recorta uma região de uma imagem (srcId) e amplia
    zoom: { w: 120, h: 120, shape: 'circle', stroke: '#1a1a1a', strokeW: 2, srcId: '', fx: 0, fy: 0, fw: 0.25, fh: 0.25 },
  };
  return { ...base, ...(byType[type] || {}), ...props };
}
