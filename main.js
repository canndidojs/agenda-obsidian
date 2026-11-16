const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, shell } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) { app.quit(); return; }

let win = null, tray = null, quitting = false;
const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
  win.webContents.send('focus-capture');
}

function createWindow() {
  win = new BrowserWindow({
    width: 520, height: 780, minWidth: 400, minHeight: 520,
    title: 'Agenda', icon, show: false,
    backgroundColor: '#14131a',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  win.setMenu(null);
  win.loadURL('http://127.0.0.1:3377');
  win.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

app.on('second-instance', showWindow);

app.whenReady().then(() => {
  require('./server.js');
  createWindow();

  tray = new Tray(icon.resize({ width: 32, height: 32 }));
  tray.setToolTip('Agenda');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir agenda', click: showWindow },
    { type: 'separator' },
    { label: 'Sair', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', showWindow);

  // Atalho global: anotar de qualquer lugar
  globalShortcut.register('Control+Alt+N', showWindow);
});

app.on('window-all-closed', e => e.preventDefault());
app.on('will-quit', () => globalShortcut.unregisterAll());
