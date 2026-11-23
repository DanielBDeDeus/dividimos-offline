// Local-first storage bridge: keeps compatibility with existing React localStorage keys.
// In Electron, SQLite is the durable source of truth; no Supabase and no network required.
export const STORAGE_KEYS = Object.freeze({
  pessoas: 'controle-financeiro:pessoas',
  gastoDebito: 'controle-financeiro:gasto-debito',
  faturaAtual: 'controle-financeiro:fatura-atual',
  cartoes: 'controle-financeiro:cartoes',
  gastos: 'controle-financeiro:gastos',
  perfilAtivo: 'controle-financeiro:perfil-ativo',
  resetEtapa: 'controle-financeiro:reset-etapa',
  transacoes: 'controle-financeiro:transacoes',
  contas: 'controle-financeiro:contas',
  mesSelecionado: 'mesSelecionado',
  anoSelecionado: 'anoSelecionado',
});
export const STORAGE_KEY_LIST = Object.values(STORAGE_KEYS);
export function collectLocalState() {
  const out = {};
  for (const k of STORAGE_KEY_LIST) {
    const v = window.localStorage.getItem(k);
    if (v !== null) out[k] = v;
  }
  return out;
}
export function restoreLocalState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return;
  // Important: clear absent keys as well after backup restore.
  for (const k of STORAGE_KEY_LIST) window.localStorage.removeItem(k);
  for (const [k,v] of Object.entries(state)) {
    if (STORAGE_KEY_LIST.includes(k) && typeof v === 'string') window.localStorage.setItem(k, v);
  }
}
export async function loadStateFromLocal() {
  if (!window.dividimos?.loadState) return;
  const data = await window.dividimos.loadState();
  restoreLocalState(data);
}
let installed = false;
let batching = false;

export function saveLocalEntries(entries) {
  const storage = window.localStorage;
  const changes = Object.entries(entries).filter(([key, value]) => storage.getItem(key) !== value);
  if (!changes.length) return;
  const previous = changes.map(([key]) => [key, storage.getItem(key)]);
  batching = true;
  try {
    for (const [key, value] of changes) storage.setItem(key, value);
    if (installed) persistLocalState();
  } catch (error) {
    for (const [key, value] of previous) {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    throw error;
  } finally {
    batching = false;
  }
}

function persistLocalState() {
  const result = window.dividimos.saveStateSync(collectLocalState());
  if (!result?.ok) {
    const message = 'Falha ao salvar. Feche e reabra o aplicativo. ' + (result?.error || 'Erro SQLite');
    document.getElementById('root')?.replaceChildren(document.createTextNode(message));
    throw new Error(message);
  }
}
export function installLocalAutosave() {
  if (installed || !window.dividimos?.saveStateSync) return;
  installed = true;
  const set = Storage.prototype.setItem;
  const remove = Storage.prototype.removeItem;
  function persist(storage, key) {
    if (batching || storage !== window.localStorage || !STORAGE_KEY_LIST.includes(key)) return;
    persistLocalState();
  }
  Storage.prototype.setItem = function(key,value) { set.call(this,key,value); persist(this,key); };
  Storage.prototype.removeItem = function(key) { remove.call(this,key); persist(this,key); };
}
