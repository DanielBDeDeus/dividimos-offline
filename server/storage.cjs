'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const KEYS = Object.freeze([
  'controle-financeiro:pessoas',
  'controle-financeiro:gasto-debito',
  'controle-financeiro:fatura-atual',
  'controle-financeiro:cartoes',
  'controle-financeiro:gastos',
  'controle-financeiro:perfil-ativo',
  'controle-financeiro:reset-etapa',
  'controle-financeiro:transacoes',
  'controle-financeiro:contas',
  'mesSelecionado', 'anoSelecionado',
]);
const ALLOWED = new Set(KEYS);
const MAX_STATE_BYTES = 2 * 1024 * 1024;

function validateState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Estado deve ser um objeto JSON');
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED.has(key)) throw new Error(`Chave nao permitida: ${key}`);
    if (typeof value !== 'string') throw new Error(`Valor de ${key} deve ser texto`);
    result[key] = value;
  }
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_STATE_BYTES) throw new Error('Dados excedem 2 MiB');
  return result;
}

function openStore(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec('CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)');
  const getStmt = db.prepare('SELECT data FROM app_state WHERE id = ?');
  const setStmt = db.prepare('INSERT INTO app_state (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at');
  return {
    read() { const row = getStmt.get('local'); return row ? validateState(JSON.parse(row.data)) : {}; },
    write(state) { const clean = validateState(state); setStmt.run('local', JSON.stringify(clean), new Date().toISOString()); return clean; },
    close() { db.close(); },
  };
}

function parseArray(state, key) {
  try { const arr = JSON.parse(state[key] || '[]'); return Array.isArray(arr) ? arr : []; } catch { return []; }
}
function summary(state) {
  const people = parseArray(state, 'controle-financeiro:pessoas');
  const expenses = parseArray(state, 'controle-financeiro:gastos');
  const accounts = parseArray(state, 'controle-financeiro:contas');
  return { pessoas: people.length, gastos: expenses.length, contas: accounts.length, persistencia: 'sqlite', offline: true };
}

module.exports = { KEYS, validateState, openStore, summary };
