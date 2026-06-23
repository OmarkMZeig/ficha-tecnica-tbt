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
const COL = 'fichas_tecnicas';     // coleção das fichas no Firestore
const IMGCOL = 'fichas_tecnicas_img'; // imagens (base64) no Firestore — sem Storage/Blaze
const USERS = 'app_users';         // cadastro de acessos (nome, status) gerido pelo master
const LOG = 'fichas_tecnicas_log'; // histórico de alterações (quem mexeu em quê)

let auth = null, fs = null, ready = false;
const urlCache = new Map();

export function cloudAvailable() { return typeof window.firebase !== 'undefined'; }

export function initCloud() {
  if (ready) return true;
  if (!cloudAvailable()) return false;
  const fb = window.firebase;
  const app = fb.apps && fb.apps.length ? fb.app() : fb.initializeApp(CONFIG);
  auth = fb.auth(); fs = fb.firestore();
  try { auth.setPersistence(fb.auth.Auth.Persistence.LOCAL); } catch (e) { /* ok */ }
  ready = true;
  return true;
}

// ---- Auth ----
export function onAuth(cb) { if (!initCloud()) return () => {}; return auth.onAuthStateChanged(cb); }
export function currentUser() { return auth && auth.currentUser; }
export function login(email, senha) { initCloud(); return auth.signInWithEmailAndPassword(email, senha); }
export function logout() { return auth ? auth.signOut() : Promise.resolve(); }
export function currentEmail() { return auth && auth.currentUser ? auth.currentUser.email : null; }

// ---- Controle de acessos (master cria logins) ----
const emailKey = (e) => String(e || '').trim().toLowerCase();
let _master = undefined; // undefined=não carregado, null=sem master ainda, string=email
let _me = undefined;     // registro do usuário logado: {email,nome,status,master?} ou null

export async function loadMaster() {
  initCloud();
  try { const d = await fs.collection('config').doc('app').get(); _master = d.exists ? (d.data().masterEmail || null) : null; }
  catch (e) { _master = null; }
  return _master;
}
export const masterEmail = () => _master;
export const noMasterYet = () => _master === null;
export function isMaster() {
  const e = currentEmail();
  return !!e && !!_master && e.toLowerCase() === String(_master).toLowerCase();
}
export async function claimMaster() {
  initCloud();
  const e = currentEmail();
  if (!e) throw new Error('Faça login primeiro.');
  await fs.collection('config').doc('app').set({ masterEmail: e }, { merge: true });
  _master = e;
  await loadMe();
  return e;
}

// Carrega o registro do usuário logado (nome + status). Garante registro do master.
export async function loadMe() {
  initCloud();
  const e = currentEmail();
  if (!e) { _me = null; return null; }
  if (_master === undefined) await loadMaster();
  if (isMaster()) {
    _me = { email: e, nome: 'Administrador', status: 'ativo', master: true };
    try {
      const ref = fs.collection(USERS).doc(emailKey(e));
      const d = await ref.get();
      if (!d.exists) await ref.set({ email: e, nome: 'Administrador', status: 'ativo', master: true, criadoEm: Date.now(), criadoPor: e });
      else _me.nome = d.data().nome || _me.nome;
    } catch (_) { /* ok */ }
    return _me;
  }
  try { const d = await fs.collection(USERS).doc(emailKey(e)).get(); _me = d.exists ? { email: e, ...d.data() } : null; }
  catch (_) { _me = null; }
  return _me;
}
export const myName = () => (_me && _me.nome) || currentEmail() || '';

// Decide se o usuário logado pode usar o app. {ok, reason}
export function accessState() {
  const e = currentEmail();
  if (!e) return { ok: false, reason: 'no-auth' };
  if (noMasterYet()) return { ok: true };            // bootstrap: ninguém é master ainda
  if (isMaster()) return { ok: true };
  if (!_me) return { ok: false, reason: 'not-registered' };
  if (_me.status === 'bloqueado') return { ok: false, reason: 'blocked' };
  return { ok: true };
}
export async function touchLastAccess() {
  const e = currentEmail();
  if (!e) return;
  try { await fs.collection(USERS).doc(emailKey(e)).set({ ultimoAcesso: Date.now() }, { merge: true }); } catch (_) { /* ok */ }
}

// ---- Gestão de acessos (somente master) ----
export async function listUsers() {
  initCloud();
  const s = await fs.collection(USERS).get();
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.master ? 1 : 0) - (a.master ? 1 : 0) || String(a.nome || '').localeCompare(String(b.nome || '')));
}
// Cria um login SEM deslogar o master (usa um app Firebase secundário) e grava o cadastro.
export async function createUser(email, senha, nome) {
  initCloud();
  const fb = window.firebase;
  const sec = (fb.apps || []).find((a) => a.name === 'userCreator') || fb.initializeApp(CONFIG, 'userCreator');
  const cred = await sec.auth().createUserWithEmailAndPassword(email.trim(), senha);
  try { await sec.auth().signOut(); } catch (e) { /* ok */ }
  await fs.collection(USERS).doc(emailKey(email)).set({
    email: email.trim(), nome: (nome || '').trim() || email.trim().split('@')[0],
    status: 'ativo', criadoEm: Date.now(), criadoPor: currentEmail() || '',
  });
  await logActivity('cadastrou acesso', null, `${(nome || email).trim()} (${email.trim()})`);
  return cred.user.email;
}
export async function setUserStatus(email, status) {
  initCloud();
  await fs.collection(USERS).doc(emailKey(email)).set({ status }, { merge: true });
  await logActivity(status === 'bloqueado' ? 'bloqueou acesso' : 'desbloqueou acesso', null, email);
}
export async function renameUser(email, nome) {
  initCloud();
  await fs.collection(USERS).doc(emailKey(email)).set({ nome: (nome || '').trim() }, { merge: true });
}
export async function deleteUserRecord(email) {
  initCloud();
  await fs.collection(USERS).doc(emailKey(email)).delete();
  await logActivity('removeu acesso', null, email);
}

// ---- Histórico de alterações ----
export async function logActivity(acao, ficha, info = '') {
  if (!ready || !auth || !auth.currentUser) return;
  try {
    await fs.collection(LOG).add({
      ts: Date.now(),
      email: currentEmail(),
      nome: myName(),
      acao,
      fichaId: ficha ? (ficha.id || null) : null,
      fichaRef: ficha && ficha.meta ? (ficha.meta.referencia || '') : '',
      fichaNum: ficha && ficha.meta ? (ficha.meta.numero || '') : '',
      info: info || '',
    });
  } catch (e) { console.warn('log', e); }
}
export async function listActivity(max = 250) {
  initCloud();
  const s = await fs.collection(LOG).orderBy('ts', 'desc').limit(max).get();
  return s.docs.map((d) => d.data());
}
export async function clearActivityBefore(tsMillis) {
  initCloud();
  const s = await fs.collection(LOG).where('ts', '<', tsMillis).get();
  const batch = fs.batch();
  s.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return s.size;
}

// ---- Fichas (Firestore) ----
const clean = (f) => JSON.parse(JSON.stringify(f));
export async function listFichas() { const s = await fs.collection(COL).get(); return s.docs.map((d) => d.data()); }
export async function getFicha(id) { const d = await fs.collection(COL).doc(id).get(); return d.exists ? d.data() : null; }
export function saveFicha(f) { return fs.collection(COL).doc(f.id).set(clean(f)); }
export function deleteFicha(id) { return fs.collection(COL).doc(id).delete(); }
export function onFichasChange(cb) {
  return fs.collection(COL).onSnapshot((s) => cb(s.docs.map((d) => d.data())), (e) => console.warn('snapshot', e));
}

// ---- Imagens (Firestore, base64 comprimido — sem Storage/Blaze) ----
// Cada imagem é um doc <1MB. dataURL base64 serve direto como <img src> e
// não "contamina" o canvas (export PNG funciona sem config de CORS).
export async function uploadImage(key, blob) {
  const dataUrl = await toStorableDataURL(blob);
  await fs.collection(IMGCOL).doc(key).set({ data: dataUrl, ts: Date.now() });
  urlCache.set(key, dataUrl);
  return key;
}
export async function imageUrl(key) {
  if (urlCache.has(key)) return urlCache.get(key);
  const d = await fs.collection(IMGCOL).doc(key).get();
  const u = d.exists ? (d.data().data || '') : '';
  urlCache.set(key, u);
  return u;
}
export async function deleteImage(key) { try { await fs.collection(IMGCOL).doc(key).delete(); } catch (e) { /* ok */ } }

const blobToDataURL = (blob) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });

function downscale(blob, max, q) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(max / img.width, max / img.height, 1);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', q));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// Mantém o doc < ~1MB (limite do Firestore). Imagens pequenas ficam como estão
// (preserva PNG/transparência); grandes são reduzidas a JPEG.
async function toStorableDataURL(blob) {
  if (blob.size <= 700 * 1024) return blobToDataURL(blob);
  for (const [max, q] of [[1400, 0.78], [1100, 0.70], [850, 0.62]]) {
    const u = await downscale(blob, max, q);
    if (u.length < 950000) return u;
  }
  return downscale(blob, 680, 0.55);
}

export const friendlyError = (e) => {
  const m = (e && e.code) || '';
  if (m.includes('wrong-password') || m.includes('invalid-credential')) return 'E-mail ou senha incorretos.';
  if (m.includes('user-not-found')) return 'Usuário não encontrado. Peça ao master para criar o acesso.';
  if (m.includes('email-already-in-use')) return 'Este e-mail já tem acesso.';
  if (m.includes('invalid-email')) return 'E-mail inválido.';
  if (m.includes('weak-password')) return 'Senha muito curta (mínimo 6 caracteres).';
  if (m.includes('network')) return 'Sem conexão com a internet.';
  if (m.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco.';
  return (e && e.message) || 'Falha ao conectar à nuvem.';
};
