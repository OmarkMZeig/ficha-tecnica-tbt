// Estado central + persistência via "backend" plugável (local OU nuvem).
// A UI não muda: sempre lê store.current e chama as mesmas funções.
import * as db from './db.js';
import * as cloud from './cloud.js';
import { newFicha, ensureShape } from './model.js';
import { uuid, debounce, isoDate } from './util.js';

const listeners = new Set();
let current = null;
let mode = 'local';                 // 'local' | 'cloud'
const imgUrls = new Map();          // imgKey -> URL (cache síncrono para render)

export const store = { get current() { return current; } };
export const getMode = () => mode;

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(reason) { for (const fn of listeners) try { fn(current, reason); } catch (e) { console.error(e); } }
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------- Backends ----------------
const localBackend = {
  list: () => db.allFichas(),
  get: (id) => db.getFicha(id),
  save: (f) => db.saveFicha(clone(f)),
  remove: (id) => db.deleteFicha(id),
  async putImage(file) { const key = uuid(); await db.saveImage(key, file); imgUrls.set(key, URL.createObjectURL(file)); return key; },
  async hydrate(f) {
    for (const key of imageKeys(f)) {
      if (imgUrls.has(key)) continue;
      const blob = await db.getImage(key);
      if (blob) imgUrls.set(key, URL.createObjectURL(blob));
    }
  },
  async dataUrls(f) {
    const out = {};
    for (const key of imageKeys(f)) { const blob = await db.getImage(key); if (blob) out[key] = await blobToDataURL(blob); }
    return out;
  },
};

const cloudBackend = {
  list: () => cloud.listFichas(),
  get: (id) => cloud.getFicha(id),
  save: (f) => cloud.saveFicha(clone(f)),
  remove: (id) => cloud.deleteFicha(id),
  async putImage(file) { const key = 'img-' + uuid(); await cloud.uploadImage(key, file); imgUrls.set(key, await cloud.imageUrl(key)); return key; },
  async hydrate(f) {
    for (const key of imageKeys(f)) {
      if (imgUrls.has(key)) continue;
      try { imgUrls.set(key, await cloud.imageUrl(key)); } catch (e) { /* imagem ausente */ }
    }
  },
  async dataUrls(f) {
    const out = {};
    for (const key of imageKeys(f)) {
      try { const u = await cloud.imageUrl(key); const blob = await (await fetch(u)).blob(); out[key] = await blobToDataURL(blob); } catch (e) { /* CORS/ausente */ }
    }
    return out;
  },
};

let backend = localBackend;
const imageKeys = (f) => [...new Set((f.board?.objects || []).filter((o) => o.type === 'image' && o.imgKey).map((o) => o.imgKey))];

/** Troca o backend (ao logar/deslogar). Limpa o cache de imagens. */
export async function setBackendMode(m) {
  mode = m;
  backend = m === 'cloud' ? cloudBackend : localBackend;
  imgUrls.clear();
  current = null;
  await db.setMeta('mode', m);
}

// ---------------- Persistência ----------------
const persist = debounce(async () => {
  if (!current) return;
  current.updatedAt = new Date().toISOString();
  try { await backend.save(current); } catch (e) { console.error('Falha ao salvar', e); }
}, 600);

export function commit(reason = 'edit') { persist(); emit(reason); }
export function touch() { persist(); }
export async function saveNow() { if (!current) return; current.updatedAt = new Date().toISOString(); await backend.save(current); }

// ---------------- Ciclo de vida ----------------
export async function createNew(ficha = newFicha()) {
  current = ficha;
  await backend.save(current);
  emit('load');
  return current;
}

export async function loadById(id) {
  const f = await backend.get(id);
  if (!f) return null;
  ensureShape(f);
  await backend.hydrate(f);
  current = f;
  emit('load');
  return f;
}

export function setCurrent(f) { current = f; emit('load'); }
export function setCurrentSilent(f) { current = f; }
export const hydrate = (f) => backend.hydrate(f);

/** Carrega + hidrata uma ficha SEM mexer na ficha atual (usado p/ impressão em lote). */
export async function fetchFicha(id) {
  const f = await backend.get(id);
  if (!f) return null;
  ensureShape(f);
  await backend.hydrate(f);
  return f;
}

export async function duplicateCurrent() {
  if (!current) return null;
  const copy = clone(current);
  copy.id = uuid();
  copy.meta.referencia = (copy.meta.referencia || 'REF') + '-COPIA';
  copy.meta.versao = '1.0';
  copy.revisoes = [];
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  copy.meta.numero = await nextFichaNumber(copy.meta.tipo);
  current = copy;
  await backend.save(current);
  emit('load');
  return current;
}

export async function newVersionCurrent(note = '') {
  if (!current) return null;
  const [maj, min] = String(current.meta.versao || '1.0').split('.').map((n) => parseInt(n) || 0);
  current.meta.versao = `${maj}.${min + 1}`;
  current.revisoes = current.revisoes || [];
  current.revisoes.push({ data: isoDate(), usuario: current.meta.responsavel || '', alteracao: note || `Nova versão ${current.meta.versao}` });
  await saveNow();
  emit('load');
  return current;
}

// Numeração automática — contadores SEPARADOS por tipo. Piloto sai com "P" no fim.
export async function nextFichaNumber(tipo = 'producao') {
  const key = tipo === 'piloto' ? 'fichaSeqPiloto' : 'fichaSeq';
  let n = (await db.getMeta(key)) || 0;
  n += 1;
  await db.setMeta(key, n);
  const s = String(n).padStart(4, '0');
  return tipo === 'piloto' ? s + 'P' : s;
}

export async function removeFicha(id) { await backend.remove(id); if (current && current.id === id) current = null; }
export const listFichas = () => backend.list();

// ---------------- Imagens ----------------
export async function addImageFromFile(file) {
  const key = await backend.putImage(file);
  if (!current.thumb) current.thumb = await makeThumb(file).catch(() => null);
  return key;
}
export function imageUrl(key) { return imgUrls.get(key) || null; }
export function imagesAsDataURLs() { return backend.dataUrls(current); }

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
