const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const WWW = path.join(__dirname, 'www');

// La app se sirve desde "app://local/..." (en vez de file://) para que las
// imágenes locales no "contaminen" el canvas y el PDF se pueda generar.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

// Una sola ventana: si se abre otra vez, se enfoca la existente
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let ventana;

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1100,
    height: 900,
    title: 'Herramientas CDR',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  Menu.setApplicationMenu(null);
  ventana.maximize();
  ventana.loadURL('app://local/index.html');
}

app.on('second-instance', () => {
  if (ventana) {
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  }
});

app.whenReady().then(() => {
  protocol.handle('app', request => {
    let ruta = decodeURIComponent(new URL(request.url).pathname);
    if (ruta === '/' || ruta === '') ruta = '/index.html';
    const archivo = path.normalize(path.join(WWW, ruta));
    if (!archivo.startsWith(WWW)) return new Response('Prohibido', { status: 403 });
    return net.fetch(pathToFileURL(archivo).toString());
  });

  crearVentana();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) crearVentana(); });
});

app.on('window-all-closed', () => app.quit());
