// preload — expose safe APIs here if needed
const { contextBridge } = require('electron')
contextBridge.exposeInMainWorld('electronAPI', {})
