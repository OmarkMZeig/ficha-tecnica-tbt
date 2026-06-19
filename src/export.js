// Exportacao: PDF (impressao nativa = fidelidade total), PNG/JPG (html-to-image),
// e backup/compartilhamento em JSON (ficha + imagens embutidas).
import { download, slug, toast } from './util.js';
import { store, imagesAsDataURLs, addImageFromFile, createNew } from './store.js';
import { newFicha } from './model.js';

const pageEl = () => document.getElementById('page');

export function exportPDF() {
  // Deseleciona para nao imprimir alcas
  document.querySelectorAll('.obj.selected').forEach((n) => n.classList.remove('selected'));
  document.querySelectorAll('.selbox').forEach((n) => (n.style.display = 'none'));
  toast('Na janela de impressão, escolha "Salvar como PDF"', 'ok');
  setTimeout(() => {
    window.print();
    document.querySelectorAll('.selbox').forEach((n) => (n.style.display = ''));
  }, 300);
}

export async function exportImage(format = 'png') {
  const node = pageEl();
  if (!window.htmlToImage) { toast('Biblioteca de imagem indisponível', 'err'); return; }
  document.body.classList.add('exporting');
  const prevTransform = node.style.transform;
  node.style.transform = 'none';
  // esconde caixa de selecao
  const selboxes = [...document.querySelectorAll('.selbox')];
  selboxes.forEach((n) => (n.style.display = 'none'));

  const opts = { pixelRatio: 3, backgroundColor: '#ffffff', cacheBust: true };
  try {
    const fn = format === 'jpg' || format === 'jpeg' ? window.htmlToImage.toJpeg : window.htmlToImage.toPng;
    const dataUrl = await fn(node, format.startsWith('jp') ? { ...opts, quality: 0.95 } : opts);
    const name = `${slug(store.current.meta.referencia || 'ficha')}_v${store.current.meta.versao || '1'}.${format === 'jpeg' ? 'jpg' : format}`;
    download(name, dataUrl);
    toast('Imagem exportada', 'ok');
  } catch (e) {
    console.error(e);
    toast('Falha ao exportar imagem', 'err');
  } finally {
    document.body.classList.remove('exporting');
    node.style.transform = prevTransform;
    selboxes.forEach((n) => (n.style.display = ''));
  }
}

// ---- Backup / compartilhamento em JSON (.ftj) ----
export async function exportFichaFile() {
  const f = JSON.parse(JSON.stringify(store.current));
  const images = await imagesAsDataURLs(); // { imgKey: dataURL }
  const pkg = { _type: 'ficha-tecnica-tbt', version: 1, ficha: f, images };
  const blob = new Blob([JSON.stringify(pkg)], { type: 'application/json' });
  download(`${slug(f.meta.referencia || 'ficha')}.ftj.json`, blob);
  toast('Ficha exportada (.ftj.json)', 'ok');
}

export async function importFichaFile(file) {
  const text = await file.text();
  const pkg = JSON.parse(text);
  if (pkg._type !== 'ficha-tecnica-tbt') throw new Error('Arquivo inválido');
  const f = newFicha(pkg.ficha);
  Object.assign(f, pkg.ficha);
  f.id = crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now();
  // re-importa imagens como novos blobs e remapeia chaves
  const map = {};
  for (const [oldKey, dataUrl] of Object.entries(pkg.images || {})) {
    const blob = await (await fetch(dataUrl)).blob();
    const newKey = await addImageFromFile(new File([blob], 'img', { type: blob.type }));
    map[oldKey] = newKey;
  }
  for (const o of f.board.objects) if (o.type === 'image' && map[o.imgKey]) o.imgKey = map[o.imgKey];
  await createNew(f);
  toast('Ficha importada', 'ok');
  return f;
}
