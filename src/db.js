// Camada de persistencia local (IndexedDB).
// Stores: 'fichas' (documento JSON por id), 'images' (blobs por chave),
//         'templates' (modelos salvos pelo usuario), 'meta' (config geral).
// Projetado para futura migracao a nuvem: toda escrita passa por funcoes
// puras aqui; trocar o corpo destas funcoes por Firestore/Storage no futuro.

const DB_NAME = 'ficha-tecnica-tbt';
const DB_VERSION = 1;
let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('fichas')) {
        const s = db.createObjectStore('fichas', { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// ---- Fichas ----
export const saveFicha = (ficha) => tx('fichas', 'readwrite', (s) => s.put(ficha));
export const getFicha = (id) => tx('fichas', 'readonly', (s) => reqP(s.get(id)));
export const deleteFicha = (id) => tx('fichas', 'readwrite', (s) => s.delete(id));
export const allFichas = () => tx('fichas', 'readonly', (s) => reqP(s.getAll()));

// ---- Imagens (blobs) ----
export const saveImage = (key, blob) => tx('images', 'readwrite', (s) => s.put({ key, blob }));
export const getImage = (key) => tx('images', 'readonly', (s) => reqP(s.get(key)).then((r) => r && r.blob));
export const deleteImage = (key) => tx('images', 'readwrite', (s) => s.delete(key));

// ---- Templates do usuario ----
export const saveTemplate = (tpl) => tx('templates', 'readwrite', (s) => s.put(tpl));
export const allTemplates = () => tx('templates', 'readonly', (s) => reqP(s.getAll()));
export const deleteTemplate = (id) => tx('templates', 'readwrite', (s) => s.delete(id));

// ---- Meta / config ----
export const setMeta = (k, v) => tx('meta', 'readwrite', (s) => s.put({ k, v }));
export const getMeta = (k) => tx('meta', 'readonly', (s) => reqP(s.get(k)).then((r) => r && r.v));
