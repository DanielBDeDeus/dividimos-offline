'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const { createApi } = require('../server/api.cjs');
const { validateState } = require('../server/storage.cjs');
let win, api;
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
app.on('second-instance', () => {
  if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.focus(); }
});
const isValidSender = event => !!win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame;

function handlers() {
  ipcMain.handle('state:load', event => { if (!isValidSender(event)) throw new Error('Remetente bloqueado'); return api.store.read(); });
  ipcMain.on('state:save-sync', (event, state) => {
    if (!isValidSender(event)) { event.returnValue = { ok: false, error: 'Remetente bloqueado' }; return; }
    try { api.store.write(state); event.returnValue = { ok: true }; }
    catch (e) { console.error('[DividimOS] Falha ao salvar:', e); event.returnValue = { ok: false, error: e.message }; }
  });
  ipcMain.handle('backup:export', async event => {
    if (!isValidSender(event)) throw new Error('Remetente bloqueado');
    const { canceled, filePath } = await dialog.showSaveDialog(win, { title: 'Exportar backup', defaultPath: `dividimos-backup-${new Date().toISOString().slice(0,10)}.json`, filters: [{ name: 'Backup JSON', extensions: ['json'] }] });
    if (canceled || !filePath) return { canceled: true };
    const dest = filePath.endsWith('.json') ? filePath : filePath + '.json';
    const data = JSON.stringify({ format: 'DividimOS-backup-v1', exported_at: new Date().toISOString(), state: api.store.read() }, null, 2);
    fs.writeFileSync(dest, data, { flag: 'w', mode: 0o600 });
    return { saved: true };
  });
  ipcMain.handle('backup:import', async event => {
    if (!isValidSender(event)) throw new Error('Remetente bloqueado');
    const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: 'Importar backup', properties: ['openFile'], filters: [{ name: 'Backup JSON', extensions: ['json'] }] });
    if (canceled || !filePaths.length) return { canceled: true };
    const bytes = fs.statSync(filePaths[0]).size;
    if (bytes > 2 * 1024 * 1024 + 4096) throw new Error('Arquivo de backup muito grande');
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (data.format !== 'DividimOS-backup-v1') throw new Error('Formato de backup nao reconhecido');
    const clean = validateState(data.state);
    const answer = await dialog.showMessageBox(win, { type: 'warning', buttons: ['Cancelar', 'Substituir dados locais'], defaultId: 0, cancelId: 0, message: 'A importacao substituirá os dados atuais. Exporte um backup antes de continuar.' });
    if (answer.response !== 1) return { canceled: true };
    api.store.write(clean);
    return { restored: true };
  });
}

async function boot() {
  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });
  const databasePath = path.join(dataDir, 'finances.db');
  api = createApi({ databasePath, staticDir: path.join(__dirname, '..', 'dist') });
  const origin = await api.start();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  handlers();
  win = new BrowserWindow({ width: 1250, height: 840, minWidth: 960, minHeight: 600, title: 'DividimOS', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(origin + '/')) event.preventDefault(); });
  await win.loadURL(origin + '/');
  console.log(`[DividimOS] API local pronta; dados: ${databasePath}`);
  console.log('[DividimOS] Uso offline: nenhuma conexao externa necessaria.');
}
app.whenReady().then(() => { if (hasLock) return boot(); }).catch(err => { console.error(err); dialog.showErrorBox('Falha ao iniciar DividimOS', err.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (api) { /* banco fechado pelo processo ao encerrar */ } });
