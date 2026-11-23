'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createFxStore } = require('../desktop/fx.cjs');

const date = new Date('2026-11-22T14:00:00Z');
const row = { cotacaoVenda: 5.8889, dataHoraCotacao: '2026-11-19 13:04:18.325373' };

async function setup(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dividimos-fx-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('FX does not contact the provider until explicitly refreshed, then keeps the quote offline', async t => {
  const dir = await setup(t);
  let calls = 0;
  const fx = createFxStore(dir, { now: () => date, request(url, options) {
    calls++;
    assert.equal(url.origin, 'https://olinda.bcb.gov.br');
    assert.match(url.href, /\?@dataInicial=%2711-08-2026%27&@dataFinalCotacao=%2711-22-2026%27&\$orderby=dataHoraCotacao%20desc&\$top=1&\$format=json$/);
    assert.equal(options.redirect, 'error');
    return Response.json({ value: [row] });
  } });
  assert.equal(await fx.read(), null);
  assert.equal(calls, 0);
  const manual = await fx.manual(5.1289);
  assert.equal(manual.source, 'manual');
  assert.equal(calls, 0);
  const quote = await fx.refresh();
  assert.deepEqual(quote, { date: '2026-11-19', source: 'ptax', rate: 5.8889, savedAt: date.toISOString(), stale: false });
  assert.equal(calls, 1);
  const offline = createFxStore(dir, {
    now: () => new Date('2026-11-24T14:00:00Z'),
    request() { throw new Error('Sem rede'); },
  });
  assert.deepEqual(await offline.read(), { ...quote, stale: true });
  await assert.rejects(offline.refresh(), /Sem rede/);
  assert.deepEqual(await offline.read(), { ...quote, stale: true });
});

test('FX invalid, oversized and timed-out responses leave the saved value intact', async t => {
  const dir = await setup(t);
  let response = Response.json({ value: [{ ...row, cotacaoVenda: '5.00' }] });
  const fx = createFxStore(dir, { now: () => date, request: () => response });
  const manual = await fx.manual(5.5);
  assert.throws(() => fx.manual(Infinity), /válida/);
  await assert.rejects(fx.refresh(), /cotação válida/);
  response = Response.json({ value: [{ ...row, dataHoraCotacao: '2026-11-23' }] });
  await assert.rejects(fx.refresh(), /cotação válida/);
  response = new Response('a'.repeat(8193));
  await assert.rejects(fx.refresh(), /muito grande/);
  response = new Response('service unavailable', { status: 503 });
  await assert.rejects(fx.refresh(), /falhou/);
  const blocked = createFxStore(dir, { now: () => date, timeout: 10, request(_url, { signal }) {
    return new Promise((_resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error('Timeout was not enforced')), 1000);
      signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
    });
  } });
  const refresh = blocked.refresh();
  assert.throws(() => blocked.manual(5.7), /andamento/);
  await assert.rejects(refresh, { name: 'TimeoutError' });
  assert.deepEqual(await fx.read(), manual);
});
