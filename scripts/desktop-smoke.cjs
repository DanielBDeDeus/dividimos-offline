'use strict';
// Runs the real Electron main/preload/renderer with synthetic data only.
// Native file pickers are stubbed; this does not claim manual OS-dialog testing.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (!process.versions.electron) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dividimos-desktop-test-'));
  const childEnv = { ...process.env };
  delete childEnv.ELECTRON_RUN_AS_NODE;
  try {
    for (const phase of ['write', 'read']) {
      const result = spawnSync(require('electron'), [__filename, dir, phase], {
        cwd: root, env: childEnv,
        stdio: 'inherit', timeout: 90000,
      });
      if (result.error) throw result.error;
      assert.equal(result.status, 0, `Electron ${phase} failed`);
    }
    console.log('PASS desktop: fresh launch, IPC, backups, rejected import, process restart, external network blocked');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
} else {
  const { app, dialog, session } = require('electron');
  const dir = process.argv[2], phase = process.argv[3];
  assert.ok(dir && ['write', 'read'].includes(phase));
  fs.mkdirSync(path.join(dir, 'profile'), { recursive: true });
  app.setPath('userData', path.join(dir, 'profile'));
  const backup = path.join(dir, 'backup.json');
  const blocked = [];
  let fxCalls = 0;
  let fxOffline = false;
  globalThis.fetch = async url => {
    assert.equal(url.origin, 'https://olinda.bcb.gov.br');
    fxCalls++;
    if (fxOffline) throw new Error('No external connection in smoke test');
    return Response.json({ value: [{ cotacaoVenda: 5.4321, dataHoraCotacao: new Date(Date.now() - 86400000).toISOString() }] });
  };
  const { openStore } = require('../server/storage.cjs');
  const prefix = 'controle-financeiro:';
  const syntheticLegacy = {
    [prefix + 'pessoas']: JSON.stringify([{ id: 123, nome: 'Perfil legado', salario: 1200, saldo: 1200, tema: 'purple' }]),
    [prefix + 'gastos']: JSON.stringify([{ id: 321, tipo: 'debito', valor: 25, pessoaId: 123, pessoaNome: 'Perfil legado', nome: 'Ajuste legado', origem: 'ajuste_manual' }]),
  };
  if (phase === 'read') {
    const store = openStore(path.join(dir, 'profile', 'finances.db'));
    const state = store.read();
    assert.equal(JSON.parse(state[prefix + 'pessoas'])[0].saldo, 950);
    assert.equal(JSON.parse(state[prefix + 'gastos'])[0].valor, 50);
    store.write({ ...state, ...syntheticLegacy,
      [prefix + 'transacoes']: JSON.stringify([]),
    });
    store.close();
  }
  let confirmation = 1;
  dialog.showSaveDialog = async () => ({ canceled: false, filePath: backup });
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [backup] });
  dialog.showMessageBox = async () => ({ response: confirmation });
  dialog.showErrorBox = (_title, message) => { console.error(message); app.exit(1); };
  const watchdog = setTimeout(() => { console.error('Desktop smoke timed out'); app.exit(1); }, 60000);
  app.whenReady().then(() => {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const allowed = details.url.startsWith('http://127.0.0.1:') || details.url.startsWith('data:');
      if (!allowed) blocked.push(details.url);
      callback({ cancel: !allowed });
    });
  });
  app.on('browser-window-created', (_event, win) => {
    win.webContents.once('did-finish-load', async () => {
      try {
        const evaluate = script => win.webContents.executeJavaScript(script);
        async function ready() {
          for (let i = 0; i < 100; i++) {
            if (await evaluate(`!!window.dividimos && !!document.getElementById('workspace-title')`)) return;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          throw new Error('Renderer did not render the desktop workspace');
        }
        async function reload() {
          const loaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve));
          win.reload(); await loaded; await ready();
        }
        await ready();
        const startupLog = fs.readFileSync(path.join(dir, 'profile', 'logs', 'application.log'), 'utf8');
        assert.match(startupLog, /health=http:\/\/127\.0\.0\.1:\d+\/health/);
        assert.equal(await evaluate(`typeof window.require`), 'undefined');
        const key = prefix + 'pessoas';
        const wait = async predicate => {
          for (let i = 0; i < 50; i++) {
            if (await evaluate(predicate)) return;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          throw new Error('Renderer state not reached: ' + predicate);
        };
        async function nav(label) {
          await evaluate(`[...document.querySelectorAll('nav a')].find(a => a.textContent === ${JSON.stringify(label)}).click()`);
          await wait(`document.querySelector('h1').textContent === ${JSON.stringify(label)}`);
        }
        function fill(label, value) {
          return evaluate(`(() => {
            const element = [...document.querySelectorAll('label')].find(node => node.firstChild.textContent === ${JSON.stringify(label)}).querySelector('input');
            const { set } = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            set.call(element, ${JSON.stringify(value)});
            element.dispatchEvent(new Event('input', { bubbles: true }));
          })()`);
        }
        function button(label) {
          return evaluate(`[...document.querySelectorAll('button')].find(node => node.textContent === ${JSON.stringify(label)}).click()`);
        }
        if (phase === 'write') {
          assert.equal(fxCalls, 0);
          await nav('Pessoas');
          await fill('Nome', 'Teste Offline');
          await fill('Saldo inicial (R$)', '1.000,00');
          await button('Adicionar pessoa');
          await wait(`document.body.innerText.includes('Teste Offline cadastrada.')`);
          await nav('Gastos');
          await fill('Descrição', 'Mercado');
          await fill('Valor (R$)', '50,00');
          await button('Registrar gasto');
          await wait(`document.body.innerText.includes('Gasto registrado.')`);
          const expected = (await evaluate('window.dividimos.loadState()'))[key];
          assert.equal(JSON.parse(expected)[0].saldo, 950);
          assert.equal(fxCalls, 0);
          await nav('Backup e ajustes');
          await wait(`document.body.innerText.includes('Cotação ainda não disponível.')`);
          assert.equal(fxCalls, 0);
          await button('Atualizar cotação');
          await wait(`document.body.innerText.includes('5,4321')`);
          assert.equal(fxCalls, 1);
          fxOffline = true;
          await button('Atualizar cotação');
          await wait(`document.body.innerText.includes('Não foi possível atualizar a cotação')`);
          assert.equal(await evaluate(`document.body.innerText.includes('5,4321')`), true);
          assert.equal(fxCalls, 2);
          await reload();
          assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`), expected);
          assert.equal((await evaluate('window.dividimos.exportBackup()')).saved, true);
          const exported = JSON.parse(fs.readFileSync(backup, 'utf8'));
          assert.equal(exported.state[key], expected);
          await evaluate(`localStorage.setItem(${JSON.stringify(key)}, '[]')`);
          confirmation = 0;
          assert.equal((await evaluate('window.dividimos.importBackup()')).canceled, true);
          assert.equal((await evaluate('window.dividimos.loadState()'))[key], '[]');
          confirmation = 1;
          assert.equal((await evaluate('window.dividimos.importBackup()')).restored, true);
          await reload();
          assert.equal((await evaluate('window.dividimos.loadState()'))[key], expected);
          const beforeInvalid = await evaluate('window.dividimos.loadState()');
          fs.writeFileSync(backup, '{invalid JSON');
          const rejected = await evaluate(`window.dividimos.importBackup().then(() => false, () => true)`);
          assert.equal(rejected, true);
          assert.deepEqual(await evaluate('window.dividimos.loadState()'), beforeInvalid);
        } else {
          for (const [legacyKey, expected] of Object.entries(syntheticLegacy)) {
            assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(legacyKey)})`), expected);
            assert.equal((await evaluate('window.dividimos.loadState()'))[legacyKey], expected);
          }
          await nav('Visão geral');
          assert.match(await evaluate(`[...document.querySelectorAll('.finance-kpi')].find(node => node.innerText.includes('Saídas no débito')).querySelector('dd').innerText`), /25,00/);
          assert.match(await evaluate(`[...document.querySelectorAll('.finance-kpi')].find(node => node.innerText.includes('Compras no crédito')).querySelector('dd').innerText`), /0,00/);
          await nav('Backup e ajustes');
          await wait(`document.body.innerText.includes('5,4321')`);
          assert.equal(fxCalls, 0, 'Cached quote triggered a request');
        }
        assert.deepEqual(blocked, [], 'Renderer attempted external network access');
        console.log(`PASS Electron ${phase}: renderer and SQLite with external network blocked`);
        clearTimeout(watchdog); app.exit(0);
      } catch (error) { console.error(error); clearTimeout(watchdog); app.exit(1); }
    });
  });
  require('../desktop/main.cjs');
}
