const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { startProxy } = require('./proxy')
const { readStore, writeStore } = require('./store')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let proxyHandle = null  // { server, port }

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('store:load', () => readStore())
ipcMain.handle('store:save', (_, data) => { writeStore(data); return true })
ipcMain.handle('proxy:port', () => proxyHandle?.port ?? null)
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Certificates & Keys', extensions: ['pem','crt','cer','key','p12','pfx'] }]
  })
  return canceled ? null : filePaths[0]
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  proxyHandle = await startProxy()
  createWindow()
})
app.on('window-all-closed', () => {
  if (proxyHandle) proxyHandle.server.close()
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
