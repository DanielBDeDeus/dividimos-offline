'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dividimos', Object.freeze({
  loadState: () => ipcRenderer.invoke('state:load'),
  saveStateSync: (state) => ipcRenderer.sendSync('state:save-sync', state),
  readFx: () => ipcRenderer.invoke('fx:read'),
  refreshFx: () => ipcRenderer.invoke('fx:refresh'),
  saveManualFx: (rate) => ipcRenderer.invoke('fx:manual', rate),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
}));
