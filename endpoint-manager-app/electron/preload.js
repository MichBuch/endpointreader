const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  loadStore:    ()     => ipcRenderer.invoke('store:load'),
  saveStore:    (data) => ipcRenderer.invoke('store:save', data),
  openFile:     ()     => ipcRenderer.invoke('dialog:openFile'),
  getProxyPort: ()     => ipcRenderer.invoke('proxy:port'),
})
