const { ipcRenderer, contextBridge } = require('electron');

// Eventos vindos do processo principal viram eventos da página
ipcRenderer.on('focus-capture', () => window.dispatchEvent(new Event('focus-capture')));
ipcRenderer.on('refresh', () => window.dispatchEvent(new Event('agenda-refresh')));
ipcRenderer.on('quick-show', () => window.dispatchEvent(new Event('quick-show')));

// Só a janela mínima de captura usa isto
contextBridge.exposeInMainWorld('agendaQuick', {
  resize: h => ipcRenderer.send('quick-resize', h),
  close: () => ipcRenderer.send('quick-close'),
  saved: () => ipcRenderer.send('quick-saved')
});
