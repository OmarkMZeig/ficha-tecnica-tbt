// Templates de fabrica + exemplo preenchido (reproduz a ficha de referencia).
import { newFicha, emptyRow } from './model.js?v=16';
import { uuid } from './util.js?v=16';

const rows = (tableKey, list) => list.map((data) => ({ ...emptyRow(tableKey), ...data }));
const sizes6 = ['36', '38', '40', '42', '44', '46'];
const sizesLetter = ['PP', 'P', 'M', 'G', 'GG', 'XG'];

// medidas a partir de um mapa { medida: [[antes,depois], ...por tamanho] }
function medidas(map) {
  return {
    antesDepois: true,
    rows: Object.entries(map).map(([medida, pairs]) => ({
      medida, a: pairs.map((p) => p[0]), d: pairs.map((p) => p[1]),
    })),
  };
}
const emptyMedidas = (measureNames) => ({ antesDepois: true, rows: measureNames.map((m) => ({ medida: m, a: [], d: [] })) });
const JEANS_MEASURES = ['Cintura', 'Quadril', 'Gancho Frente', 'Gancho Costa', 'Coxa', 'Joelho', 'Barra', 'Entreperna'];

// ---- Aviamentos / materiais / custos tipicos ----
const aviCalca = rows('aviamentos', [
  { descricao: 'Zíper metal nº 4,5', qtd: '1' },
  { descricao: 'Botão metal 17mm (mosca)', qtd: '1' },
  { descricao: 'Rebite metal', qtd: '6' },
  { descricao: 'Etiqueta de marca (cós)', qtd: '1' },
  { descricao: 'Etiqueta composição/tamanho', qtd: '1' },
  { descricao: 'Linha de costura', qtd: '' },
]);
const custosBase = rows('custos', [
  { item: 'Tecido', valor: '' }, { item: 'Aviamentos', valor: '' },
  { item: 'Corte', valor: '' }, { item: 'Costura', valor: '' },
  { item: 'Lavanderia', valor: '' }, { item: 'Acabamento', valor: '' },
]);
const tecidoJeans = rows('materiais', [{ tecido: 'Jeans (índigo)', composicao: '98% Algodão 2% Elastano', gramatura: '11 oz', consumo: '1,40 m' }]);
const tecidoSarja = rows('materiais', [{ tecido: 'Sarja', composicao: '97% Algodão 3% Elastano', gramatura: '240 g/m²', consumo: '1,40 m' }]);

// Templates de categoria: trazem APENAS a estrutura (categoria, grade de
// tamanhos, linhas de medida). Sem aviamentos/materiais/custos/specs/observações
// pré-preenchidos — o usuário preenche.
function baseJeans(over = {}) {
  return newFicha({
    meta: { categoria: 'Calça Jeans', tipoProduto: 'Calça', grupo: 'Jeans' },
    grade: { sizes: [...sizes6], qtd: sizes6.map(() => '') },
    medidas: emptyMedidas(JEANS_MEASURES),
    ...over,
  });
}

export const TEMPLATES = [
  { id: 'tpl-calca-jeans', nome: 'Calça Jeans', icon: '👖', build: () => baseJeans({ meta: { categoria: 'Calça Jeans', tipoProduto: 'Calça', grupo: 'Jeans' } }) },
  { id: 'tpl-calca-sarja', nome: 'Calça Sarja', icon: '👖', build: () => baseJeans({ meta: { categoria: 'Calça Sarja', tipoProduto: 'Calça', grupo: 'Sarja' } }) },
  { id: 'tpl-bermuda-jeans', nome: 'Bermuda Jeans', icon: '🩳', build: () => baseJeans({ meta: { categoria: 'Bermuda Jeans', tipoProduto: 'Bermuda', grupo: 'Jeans' } }) },
  { id: 'tpl-bermuda-sarja', nome: 'Bermuda Sarja', icon: '🩳', build: () => baseJeans({ meta: { categoria: 'Bermuda Sarja', tipoProduto: 'Bermuda', grupo: 'Sarja' } }) },
  { id: 'tpl-jaqueta', nome: 'Jaqueta Jeans', icon: '🧥', build: () => newFicha({ meta: { categoria: 'Jaqueta Jeans', tipoProduto: 'Jaqueta', grupo: 'Jeans' }, grade: { sizes: [...sizesLetter], qtd: sizesLetter.map(() => '') }, medidas: emptyMedidas(['Tórax', 'Cintura', 'Comprimento', 'Ombro', 'Manga']) }) },
  { id: 'tpl-camisa', nome: 'Camisa', icon: '👔', build: () => newFicha({ meta: { categoria: 'Camisa', tipoProduto: 'Camisa' }, grade: { sizes: [...sizesLetter], qtd: sizesLetter.map(() => '') }, medidas: emptyMedidas(['Tórax', 'Cintura', 'Comprimento', 'Ombro', 'Manga', 'Colarinho']) }) },
  { id: 'tpl-private', nome: 'Private Label', icon: '🏷️', build: () => baseJeans({ meta: { categoria: 'Private Label' } }) },
  { id: 'tpl-blank', nome: 'Em branco', icon: '📄', build: () => newFicha() },
  { id: 'tpl-exemplo', nome: '★ Exemplo preenchido', icon: '⭐', build: buildExemplo },
];

// ---------- Exemplo preenchido ----------
// Online (URL pública) NÃO expõe dados de cliente: usa um demo genérico.
// Local (localhost/file) mostra o exemplo completo reproduzindo a ficha real.
const isLocalHost = () => ['localhost', '127.0.0.1', ''].includes(location.hostname);
function buildExemplo() { return isLocalHost() ? buildExemploFull() : buildExemploDemo(); }

function buildExemploDemo() {
  return newFicha({
    meta: {
      referencia: 'DEMO-001', descricao: 'Skinny (demonstração)', categoria: 'Calça Jeans',
      produto: 'Calça Jeans Skinny', grupo: 'Jeans', modelagem: 'Skinny', tipoProduto: 'Calça Feminina',
    },
    specs: {
      tecido: '', tecelagem: '', composicao: '98% Algodão 2% Elastano',
      linha: 'Fio 36 simples', cartela: '', pesponto1: 'Grafite', pesponto2: 'Grafite',
      travetes: 'Grafite', caseados: 'Grafite',
    },
    grade: { sizes: [...sizes6], qtd: sizes6.map(() => '') },
    medidas: emptyMedidas(JEANS_MEASURES),
    board: {
      numberSeq: 0,
      objects: [
        note(250, 175, 230, 60, 'Arraste aqui o desenho técnico (frente / costas)'),
        co(8, 8, 150, 46, 'Bolso relógio: pesp. 2 ag + travetes. Bitola 1/8.'),
        co(8, 60, 150, 46, 'Bolso frontal: pesp. 2 ag. Bitola 1/8.'),
        co(8, 112, 150, 60, 'Vista: pesp. 2 ag bitola 1/8 + travetes. Gancho: pesp. 2 ag bitola 1/4.'),
        co(560, 8, 158, 60, 'Cós larg. 3 cm pesp. 1 ag rente. Passantes larg. 1 cm. Pala pesp. 2 ag bitola 1/8.'),
        co(560, 78, 158, 46, 'Lateral pesp. 2 ag bitola 1/8 interrompido c/ travete.'),
        co(560, 130, 158, 56, 'Bolso traseiro: pesp. 2 ag bitola 1/8 + travetes e filigrana.'),
      ],
    },
    tables: { aviamentos: aviCalca, materiais: tecidoJeans, custos: custosBase },
    observacoes: 'Bitolas: 1/8 nos pespontos gerais; 1/4 no gancho. Conferir simetria de bolsos.',
  });
}

// Exemplo completo (reproduz a ficha Razon → TBT) — somente local.
function co(x, y, w, h, text, size = 9) {
  return { id: uuid(), type: 'callout', x, y, w, h, rot: 0, z: Date.now() + Math.random(), text, stroke: '#1a1a1a', strokeW: 1.1, fill: '#ffffff', font: 'Arial', size, color: '#1a1a1a' };
}
function note(x, y, w, h, text, size = 11) {
  return { id: uuid(), type: 'text', x, y, w, h, rot: 0, z: Date.now() + Math.random(), text, font: 'Arial', size, color: '#9a9a9a', bold: false, italic: true, underline: false, align: 'center' };
}

function buildExemploFull() {
  return newFicha({
    meta: {
      referencia: 'RZ 390/20', descricao: 'Skinny Cropped', cliente: 'FMS', colecao: 'Alto Verão 2020',
      categoria: 'Calça Jeans', responsavel: 'Gabi', data: '17/09/2019', versao: '1.0',
      produto: 'Calça Fem J Ly Skinny Cropped', grupo: 'Jeans Lycra', modelagem: 'Skinny Cropped',
      tipoProduto: 'Calça Feminina', familia: 'RZ 390/20', marca: 'FMS', oc: '769/920', prod: '21111282', mNum: '769',
    },
    specs: {
      tecido: 'Extreme', tecelagem: 'Jolitex', composicao: '82% Algodão 16% Poliéster 2% Elastano',
      tecidoForro: '', tecelagemForro: '', composicaoForro: '',
      linha: 'Fio 36 simples', cartela: 'Sancris',
      pesponto1: 'Grafite 323', pesponto2: 'Grafite 323', pesponto3: '',
      travetes: 'Grafite 323', caseados: 'Grafite 323', fioInterno: '', filigrana: '',
      piloteiro: '', lacre: '', consumoPeca: '', consumoAvios: '',
    },
    grade: { sizes: [...sizes6], qtd: ['2', '3', '3', '2', '1', '1'] },
    medidas: medidas({
      'Cintura': [['36', '32,5'], ['38', '34,5'], ['40', '36,5'], ['42', '38,5'], ['44', '40,5'], ['46', '42,5']],
      'Quadril': [['47,5', '43'], ['49,5', '45'], ['51,5', '47'], ['53,5', '49'], ['55,5', '51'], ['57,5', '53']],
      'Gancho Frente': [['26,5', '25,5'], ['27', '26'], ['27,5', '26,5'], ['28', '27'], ['28,5', '27,5'], ['29', '28']],
      'Gancho Costa': [['42', '40'], ['42,5', '40,5'], ['43', '41'], ['43,5', '41,5'], ['44', '42'], ['44,5', '42,5']],
      'Barra': [['15,5', '14'], ['16', '14,5'], ['16,5', '15'], ['17', '15,5'], ['17,5', '16'], ['18', '16,5']],
      'Entreperna': [['65,2', '61,5'], ['65,2', '61,5'], ['65,2', '61,5'], ['65,2', '61,5'], ['65,2', '61,5'], ['65,2', '61,5']],
    }),
    board: {
      numberSeq: 0,
      objects: [
        note(250, 175, 230, 60, 'Arraste aqui o desenho técnico (frente / costas)'),
        co(8, 8, 150, 46, 'Bolso relógio: pesp. 2 ag + travetes. Bitola 1/8.'),
        co(8, 60, 150, 46, 'Bolso frontal: pesp. 2 ag. Bitola 1/8.'),
        co(8, 112, 150, 60, 'Vista: pesp. 2 ag bitola 1/8 + travetes. Gancho: pesp. 2 ag bitola 1/4.'),
        co(8, 178, 150, 40, 'Abertura de 2 cm lateral da barra.'),
        co(250, 250, 170, 40, 'Entrepernas: pesp. 2 ag bitola 1/8.'),
        co(560, 8, 158, 64, 'Cós larg. 3 cm pesp. 1 ag rente. Passantes P1 larg. 1 cm. Pala pesp. 2 ag bitola 1/8.'),
        co(560, 78, 158, 46, 'Lateral pesp. 2 ag bitola 1/8 interrompido c/ travete.'),
        co(560, 130, 158, 64, 'Bolso traseiro: pesp. 2 ag bitola 1/8 + pesp. 1 ag c/ dist. na boca + travetes e filigrana.'),
        co(560, 200, 158, 46, 'Barra c/ boca bem justa: pesp. 1 ag c/ dist. de 1,5 cm.'),
      ],
    },
    tables: { aviamentos: aviCalca, materiais: rows('materiais', [{ tecido: 'Extreme (Jolitex)', composicao: '82% Algodão 16% Poliéster 2% Elastano', gramatura: '', cor: '', consumo: '' }]), custos: custosBase },
    observacoes: 'Bitolas: 1/8 nos pespontos gerais; 1/4 no gancho. Cores de linha: Grafite 323 (pespontos, travetes e caseados). Conferir simetria de bolsos.',
    footer: { oficina: '', desenho: 'Lílian 06/19', modelagem: 'Marcos 09/2019', fichaTecnica: 'Gabi 17/09/19' },
  });
}
