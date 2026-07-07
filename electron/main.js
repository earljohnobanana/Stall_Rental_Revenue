const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;

const PORT = 5000;
const APP_URL = `http://localhost:${PORT}`;

/**
 * Prevent opening two copies of the desktop app at the same time.
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

/**
 * Make sure the real writable database is stored in AppData.
 * This prevents the database from being overwritten during app updates.
 */
function ensureAppDataDatabase() {
  const userDataDir = app.getPath('userData');
  const appDataDbDir = path.join(userDataDir, 'data');
  const appDataDbPath = path.join(appDataDbDir, 'stall_rental.db');

  if (!fs.existsSync(appDataDbDir)) {
    fs.mkdirSync(appDataDbDir, { recursive: true });
  }

  if (!fs.existsSync(appDataDbPath)) {
    let starterDbPath;

    if (app.isPackaged) {
      starterDbPath = path.join(
        process.resourcesPath,
        'server',
        'data',
        'stall_rental.db'
      );
    } else {
      starterDbPath = path.join(
        __dirname,
        '..',
        'server',
        'data',
        'stall_rental.db'
      );
    }

    if (!fs.existsSync(starterDbPath)) {
      throw new Error(`Starter database not found at: ${starterDbPath}`);
    }

    fs.copyFileSync(starterDbPath, appDataDbPath);
  }

  process.env.SQLITE_DB_PATH = appDataDbPath;

  return appDataDbPath;
}

/**
 * Start the existing Express server.
 * Your server/app.js already serves client/dist and listens on localhost:5000.
 */
function startExpressServer() {
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(PORT);

  const dbPath = ensureAppDataDatabase();

  console.log('Using SQLite database:', dbPath);

  require(path.join(__dirname, '..', 'server', 'app.js'));
}

/**
 * Wait until Express is ready before opening the Electron window.
 */
function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server did not start within ${timeoutMs}ms`));
          return;
        }

        setTimeout(check, 300);
      });

      req.setTimeout(3000, () => {
        req.destroy();
      });
    };

    check();
  });
}

/**
 * Create the desktop window.
 */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1100,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    title: 'Stall Revenue Monitoring System',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  await mainWindow.loadURL(APP_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    startExpressServer();

    await waitForServer(`${APP_URL}/api/health`);

    await createWindow();
  } catch (error) {
    console.error(error);

    dialog.showErrorBox(
      'SRMS Startup Error',
      error.message || 'The application failed to start.'
    );

    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});