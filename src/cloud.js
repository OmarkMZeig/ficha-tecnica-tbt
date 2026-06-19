// Camada de NUVEM (opcional): Firebase Firestore (fichas) + Storage (imagens)
// + Auth (login da equipe). Reaproveita o projeto 'confeccao-erp' do ERP.
// O app funciona 100% local sem isto; a nuvem só liga quando o usuário faz login.

const CONFIG = {
  apiKey: 'AIzaSyCr82kwCmJbwKRuuqwPBn8PBDJmlJGzNJc',
  authDomain: 'confeccao-erp.firebaseapp.com',
  projectId: 'confeccao-erp',
  storageBucket: 'confeccao-erp.firebasestorage.app',
  messagingSenderId: '115465583238',
  appId: '1:115465583238:web:e0473dcf1ce1cc94eb2f07',
};
const COL = 'fichas_tecnicas';   // coleção das fichas no Firestore
const IMG = 'fichas_tecnicas';   // pasta das imagens no Storage

let auth = null, fs = null, storage = null, ready = false;
const urlCache = new Map();

export function cloudAvailable() { return typeof window.firebase !== 'undefined'; }

export function initCloud() {
  if (ready) return true;
  if (!cloudAvailable()) return false;
  const fb = window.firebase;
  const app = fb.apps && fb.apps.length ? fb.app() : fb.initializeApp(CONFIG);
  auth = fb.auth(); fs = fb.firestore(); storage = fb.storage();
  try { auth.setPersistence(fb.auth.Auth.Persistence.LOCAL); } catch (e) { /* ok */ }
  ready = true;
  return true;
}

// ---- Auth ----
export function onAuth(cb) { if (!initCloud()) return () => {}; return auth.onAuthStateChanged(cb); }
export function currentUser() { return auth && auth.currentUser; }
export function login(email, senha) { initCloud(); return auth.signInWithEmailAndPassword(email, senha); }
export function logout() { return auth ? auth.signOut() : Promise.resolve(); }

// ---- Fichas (Firestore) ----
const clean = (f) => JSON.parse(JSON.stringify(f));
export async function listFichas() { const s = await fs.collection(COL).get(); return s.docs.map((d) => d.data()); }
export async function getFicha(id) { const d = await fs.collection(COL).doc(id).get(); return d.exists ? d.data() : null; }
export function saveFicha(f) { return fs.collection(COL).doc(f.id).set(clean(f)); }
export function deleteFicha(id) { return fs.collection(COL).doc(id).delete(); }
export function onFichasChange(cb) {
  return fs.collection(COL).onSnapshot((s) => cb(s.docs.map((d) => d.data())), (e) => console.warn('snapshot', e));
}

// ---- Imagens (Storage) ----
export async function uploadImage(key, blob) {
  await storage.ref().child(`${IMG}/${key}`).put(blob);
  urlCache.delete(key);
  return key;
}
export async function imageUrl(key) {
  if (urlCache.has(key)) return urlCache.get(key);
  const u = await storage.ref().child(`${IMG}/${key}`).getDownloadURL();
  urlCache.set(key, u);
  return u;
}
export async function deleteImage(key) { try { await storage.ref().child(`${IMG}/${key}`).delete(); } catch (e) { /* ok */ } }

export const friendlyError = (e) => {
  const m = (e && e.code) || '';
  if (m.includes('wrong-password') || m.includes('invalid-credential')) return 'E-mail ou senha incorretos.';
  if (m.includes('user-not-found')) return 'Usuário não encontrado. Crie no Firebase Console.';
  if (m.includes('network')) return 'Sem conexão com a internet.';
  if (m.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco.';
  return (e && e.message) || 'Falha ao conectar à nuvem.';
};
