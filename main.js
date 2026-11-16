const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, nativeTheme, shell, screen, ipcMain } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) { app.quit(); return; }

let win = null, quick = null, tray = null, quitting = false;
const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'app.ico'));
app.setAppUserModelId('agenda-obsidian');
const bg = () => nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff';
const prefs = { preload: path.join(__dirname, 'preload.js'), contextIsolation: true };
const QUICK_W = 560;

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
  win.webContents.send('focus-capture');
}

function createWindow() {
  win = new BrowserWindow({
    width: 520, height: 780, minWidth: 400, minHeight: 520,
    title: 'Agenda', icon, show: false, backgroundColor: bg(),
    autoHideMenuBar: true, webPreferences: prefs
  });
  win.setMenu(null);
  win.loadURL('http://127.0.0.1:3377');
  win.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

// Janela mínima: só o campo de anotação, no alto da tela, some ao salvar, ao apertar Esc ou ao perder o foco
function createQuick() {
  quick = new BrowserWindow({
    width: QUICK_W, height: 100, show: false, frame: false, resizable: false, fullscreenable: false,
    skipTaskbar: true, alwaysOnTop: true, title: 'Anotar', icon, backgroundColor: bg(), webPreferences: prefs
  });
  quick.setMenu(null);
  quick.loadURL('http://127.0.0.1:3377/quick');
  quick.on('blur', () => { if (quick.isVisible()) quick.hide(); });
  quick.on('close', e => { if (!quitting) { e.preventDefault(); quick.hide(); } });
}
function showQuick() {
  if (!quick) return;
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  quick.setPosition(Math.round(area.x + (area.width - QUICK_W) / 2), Math.round(area.y + area.height * 0.22));
  quick.show(); quick.focus();
  quick.webContents.send('quick-show');
}
ipcMain.on('quick-resize', (_e, h) => { if (quick) quick.setContentSize(QUICK_W, Math.min(Math.max(Math.round(h), 60), 480)); });
ipcMain.on('quick-close', () => { if (quick) quick.hide(); });
ipcMain.on('quick-saved', () => { if (quick) quick.hide(); if (win) win.webContents.send('refresh'); });

app.on('second-instance', showWindow);

app.whenReady().then(() => {
  require('./server.js');
  createWindow();
  createQuick();

  tray = new Tray(icon);
  tray.setToolTip('Agenda');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Anotar agora', accelerator: 'Ctrl+Alt+N', click: showQuick },
    { label: 'Abrir agenda', accelerator: 'Ctrl+Alt+A', click: showWindow },
    { type: 'separator' },
    { label: 'Sair', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', showWindow);

  // Atalhos globais (funcionam em qualquer programa)
  globalShortcut.register('Control+Alt+N', showQuick);
  globalShortcut.register('Control+Alt+A', showWindow);
});

app.on('window-all-closed', e => e.preventDefault());
app.on('will-quit', () => globalShortcut.unregisterAll());
