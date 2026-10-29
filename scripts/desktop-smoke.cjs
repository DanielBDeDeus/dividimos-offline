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
  try {
    for (const phase of ['write', 'read']) {
      const result = spawnSync(require('electron'), [__filename, dir, phase], {
        cwd: root, env: { ...process.env, ELECTRON_RUN_AS_NODE: '' },
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
            if (await evaluate(`!!window.dividimos && document.body.innerText.includes('Exportar backup')`)) return;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          throw new Error('Renderer did not render the offline toolbar');
        }
        async function reload() {
          const loaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve));
          win.reload(); await loaded; await ready();
        }
        await ready();
        assert.equal(await evaluate(`typeof window.require`), 'undefined');
        const key = 'controle-financeiro:pessoas';
        const expected = JSON.stringify([{ id: 123, nome: 'Teste Offline', salario: 1200, saldo: 1200, tema: 'purple' }]);
        if (phase === 'write') {
          await evaluate(`localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(expected)})`);
          assert.equal((await evaluate('window.dividimos.loadState()'))[key], expected);
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
          assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`), expected);
          assert.equal((await evaluate('window.dividimos.loadState()'))[key], expected);
        }
        assert.deepEqual(blocked, [], 'Renderer attempted external network access');
        console.log(`PASS Electron ${phase}: renderer and SQLite with external network blocked`);
        clearTimeout(watchdog); app.exit(0);
      } catch (error) { console.error(error); clearTimeout(watchdog); app.exit(1); }
    });
  });
  require('../desktop/main.cjs');
}
