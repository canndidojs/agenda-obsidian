const { ipcRenderer } = require('electron');
ipcRenderer.on('focus-capture', () => window.dispatchEvent(new Event('focus-capture')));
