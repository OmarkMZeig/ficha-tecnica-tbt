// Estado central + orquestracao de persistencia.
// Toda a UI lê de store.current e reage via subscribe().
import * as db from './db.js';
import { newFicha, ensureShape } from './model.js';
import { uuid, debounce, isoDate } from './util.js';

const listeners = new Set();
let current = null;
const imgUrls = new Map(); // imgKey -> objectURL (apenas nesta sessao)

export const store = {
  get current() { return current; },
};

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(reason) { for (const fn of listeners) try { fn(current, reason); } catch (e) { console.error(e); } }

const clone = (o) => JSON.parse(JSON.stringify(o));

const persist = debounce(async () => {
  if (!current) return;
  current.updatedAt = new Date().toISOString();
  try { await db.saveFicha(clone(current)); } catch (e) { console.error('Falha ao salvar', e); }
}, 600);

/** Aplica mudanca + persiste + re-renderiza (reason controla o que a UI atualiza). */
export function commit(reason = 'edit') { persist(); emit(reason); }
/** Persiste sem re-render (usado durante arraste/redimensionamento). */
export function touch() { persist(); }
/** Salva imediatamente (botao Salvar). */
export async function saveNow() {
  if (!current) return;
  current.updatedAt = new Date().toISOString();
  await db.saveFicha(clone(current));
}

// ---- Ciclo de vida da ficha ----
export async function createNew(ficha = newFicha()) {
  current = ficha;
  await db.saveFicha(clone(current));
  emit('load');
  return current;
}

export async function loadById(id) {
  const f = await db.getFicha(id);
  if (!f) return null;
  ensureShape(f);
  await hydrateImages(f);
  current = f;
  emit('load');
  return f;
}

export function setCurrent(f) { current = f; emit('load'); }

export async function duplicateCurrent() {
  if (!current) return null;
  const copy = clone(current);
  copy.id = uuid();
  copy.meta.referencia = (copy.meta.referencia || 'REF') + '-COPIA';
  copy.meta.versao = '1.0';
  copy.revisoes = [];
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  // imagens sao compartilhadas por chave (blobs imutaveis) — basta reusar imgKey
  current = copy;
  await db.saveFicha(clone(current));
  emit('load');
  return current;
}

export async function newVersionCurrent(note = '') {
  if (!current) return null;
  const [maj, min] = String(current.meta.versao || '1.0').split('.').map((n) => parseInt(n) || 0);
  current.meta.versao = `${maj}.${min + 1}`;
  current.revisoes = current.revisoes || [];
  current.revisoes.push({
    data: isoDate(),
    usuario: current.meta.responsavel || '',
    alteracao: note || `Nova versão ${current.meta.versao}`,
  });
  await saveNow();
  emit('load');
  return current;
}

export async function removeFicha(id) {
  await db.deleteFicha(id);
  if (current && current.id === id) current = null;
}

export const listFichas = () => db.allFichas();

// ---- Imagens ----
export async function addImageFromFile(file) {
  const key = uuid();
  await db.saveImage(key, file);
  imgUrls.set(key, URL.createObjectURL(file));
  if (!current.thumb) current.thumb = await makeThumb(file).catch(() => null);
  return key;
}
export function imageUrl(key) { return imgUrls.get(key) || null; }

async function hydrateImages(f) {
  const keys = (f.board?.objects || []).filter((o) => o.type === 'image' && o.imgKey).map((o) => o.imgKey);
  for (const key of new Set(keys)) {
    if (imgUrls.has(key)) continue;
    const blob = await db.getImage(key);
    if (blob) imgUrls.set(key, URL.createObjectURL(blob));
  }
}

/** dataURL de todas as imagens (para exportar PNG/PDF sem depender de objectURL). */
export async function imagesAsDataURLs() {
  const out = {};
  const keys = (current.board?.objects || []).filter((o) => o.type === 'image' && o.imgKey).map((o) => o.imgKey);
  for (const key of new Set(keys)) {
    const blob = await db.getImage(key);
    if (blob) out[key] = await blobToDataURL(blob);
  }
  return out;
}

export const blobToDataURL = (blob) => new Promise((res, rej) => {
  const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob);
});

function makeThumb(blob, max = 240) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(max / img.width, max / img.height, 1);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.7));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
