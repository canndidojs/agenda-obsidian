const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, nativeTheme, shell, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Mesma pasta de dados (e mesmo bloqueio de instância única) no app instalado e rodando da pasta do projeto
app.setPath('userData', path.join(app.getPath('appData'), 'agenda-obsidian'));
if (!app.requestSingleInstanceLock()) { app.quit(); return; }

let win = null, quick = null, tray = null, quitting = false, vaultPath = '';
const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'app.ico'));
app.setAppUserModelId('agenda-obsidian');
const bg = () => nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff';
const prefs = { preload: path.join(__dirname, 'preload.js'), contextIsolation: true };
const QUICK_W = 560;

// Configurações do app (pasta das anotações escolhida, início com o Windows)
const cfgPath = path.join(app.getPath('userData'), 'config.json');
process.env.AGENDA_CONFIG = cfgPath;
function readCfg() { try { return JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (e) { return {}; } }
function writeCfg(c) { fs.mkdirSync(path.dirname(cfgPath), { recursive: true }); fs.writeFileSync(cfgPath, JSON.stringify(c, null, 2)); }

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
  win.webContents.send('focus-capture');
}

function createWindow() {
  win = new BrowserWindow({
    width: 520, height: 780, minWidth: 400, minHeight: 520,
    title: 'Anotaí', icon, show: false, backgroundColor: bg(),
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

// Trocar a pasta das anotações: grava a escolha e reinicia o app para ele passar a usar a pasta nova
function relaunchApp() {
  quitting = true;
  app.relaunch({ args: process.argv.slice(1).filter(a => a !== '--hidden') });
  app.exit(0);
}
async function chooseFolder() {
  if (win && !win.isVisible()) showWindow();
  const r = await dialog.showOpenDialog(win, {
    title: 'Escolher a pasta das anotações (o app reinicia em seguida)',
    defaultPath: vaultPath || undefined,
    properties: ['openDirectory', 'createDirectory']
  });
  if (r.canceled || !r.filePaths[0]) return;
  writeCfg({ ...readCfg(), vault: r.filePaths[0] });
  relaunchApp();
}
function resetFolder() {
  const c = readCfg(); delete c.vault; writeCfg(c);
  relaunchApp();
}
function setAutostart(on) {
  writeCfg({ ...readCfg(), autostart: on });
  app.setLoginItemSettings({ openAtLogin: on, args: ['--hidden'] });
  buildMenu();
}

function buildMenu() {
  const items = [
    { label: 'Anotar agora', accelerator: 'Ctrl+Alt+N', click: showQuick },
    { label: 'Abrir o Anotaí', accelerator: 'Ctrl+Alt+A', click: showWindow },
    { type: 'separator' },
    // mostra onde as anotações estão sendo gravadas: o vault do Obsidian (detectado sozinho) ou uma pasta comum
    { label: fs.existsSync(path.join(vaultPath, '.obsidian')) ? `Vault do Obsidian: ${path.basename(vaultPath)}` : `Pasta das anotações: ${path.basename(vaultPath)}`, enabled: false },
    { label: 'Escolher pasta das anotações…', click: chooseFolder },
    { label: 'Abrir pasta das anotações', click: () => shell.openPath(path.join(vaultPath, 'Agenda')).then(e => { if (e) shell.openPath(vaultPath); }) }
  ];
  if (readCfg().vault) items.push({ label: 'Voltar para a pasta automática', click: resetFolder });
  // "Iniciar com o Windows" só no app instalado; na pasta do projeto o atalho de inicialização cuida disso
  if (app.isPackaged) {
    items.push({ type: 'separator' },
      { label: 'Iniciar com o Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: m => setAutostart(m.checked) });
  }
  items.push({ type: 'separator' }, { label: 'Sair', click: () => { quitting = true; app.quit(); } });
  tray.setContextMenu(Menu.buildFromTemplate(items));
}

app.on('second-instance', showWindow);

app.whenReady().then(() => {
  vaultPath = require('./server.js').vault;
  createWindow();
  createQuick();

  tray = new Tray(icon);
  tray.setToolTip('Anotaí');
  tray.on('click', showWindow);

  // Primeira execução do app instalado: começa com o Windows (dá para desligar no menu da bandeja)
  if (app.isPackaged && readCfg().autostart === undefined) setAutostart(true);
  buildMenu();

  // Atalhos globais (funcionam em qualquer programa)
  globalShortcut.register('Control+Alt+N', showQuick);
  globalShortcut.register('Control+Alt+A', showWindow);
});

app.on('window-all-closed', e => e.preventDefault());
app.on('will-quit', () => globalShortcut.unregisterAll());
