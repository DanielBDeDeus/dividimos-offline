'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dividimos', Object.freeze({
  loadState: () => ipcRenderer.invoke('state:load'),
  saveStateSync: (state) => ipcRenderer.sendSync('state:save-sync', state),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
}));
