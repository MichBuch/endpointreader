// preload — expose safe APIs here if needed
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Org / encrypted store
  loadStore:  ()       => ipcRenderer.invoke('store:load'),
  saveStore:  (data)   => ipcRenderer.invoke('store:save', data),
  // File picker for cert paths
  openFile:   ()       => ipcRenderer.invoke('dialog:openFile'),
})
