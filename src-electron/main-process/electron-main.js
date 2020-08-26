import { app, dialog, BrowserWindow, nativeTheme } from "electron";
const fixPath = require("fix-path");
const { criticalErrorDialog } = require("../dialogs");
const logger = require("../common/logger");
// const setupProtocolHandlers = require("./protocol-handlers");
// const setupI18n = require("../i18n");
const setupDaemon = require("../daemon");
// const setupAutoLaunch = require("./auto-launch");
// const setupDownloadCid = require("./download-cid");
// const setupTakeScreenshot = require("./take-screenshot");
const setupAppMenu = require("../app-menu");
// const setupArgvFilesHandler = require("./argv-files-handler");
// const setupAutoUpdater = require("./auto-updater");
// const setupTray = require("../tray");
// const setupSecondInstance = require("./second-instance");

// Hide Dock
if (app.dock) app.dock.hide();

// Sets User Model Id so notifications work on Windows 10
app.setAppUserModelId("io.iohzrd.follow");

// Fixes $PATH on macOS
fixPath();

// Only one instance can run at a time
if (!app.requestSingleInstanceLock()) {
  process.exit(0);
}

let ctx = {};
let mainWindow;

// app.on("will-finish-launching", () => {
//   setupProtocolHandlers(ctx);
// });

function handleError(err) {
  // Ignore network errors that might happen during the
  // execution.
  if (err.stack.includes("net::")) {
    return;
  }

  logger.error(err);
  criticalErrorDialog(err);
}
process.on("uncaughtException", handleError);
process.on("unhandledRejection", handleError);

try {
  if (
    process.platform === "win32" &&
    nativeTheme.shouldUseDarkColors === true
  ) {
    require("fs").unlinkSync(
      require("path").join(app.getPath("userData"), "DevTools Extensions")
    );
  }
} catch (_) {
  console.log(_);
}

/**
 * Set `__statics` path to static files in production;
 * The reason we are setting it here is that the path needs to be evaluated at runtime
 */
if (process.env.PROD) {
  global.__statics = __dirname;
}

async function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 960,
    height: 1080,
    useContentSize: true,
    webPreferences: {
      enableRemoteModule: true,
      // Change from /quasar.conf.js > electron > nodeIntegration;
      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: process.env.QUASAR_NODE_INTEGRATION,
      nodeIntegrationInWorker: process.env.QUASAR_NODE_INTEGRATION

      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      // preload: path.resolve(__dirname, 'electron-preload.js')
    }
  });

  console.log(process.env.APP_URL);
  mainWindow.loadURL(process.env.APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", main);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    main();
  }
});

async function main() {
  try {
    await app.whenReady();
  } catch (e) {
    dialog.showErrorBox("Electron could not start", e.stack);
    app.exit(1);
  }

  try {
    // await setupI18n(ctx);
    await setupAppMenu(ctx);
    // await setupTray(ctx); // ctx.tray
    await setupDaemon(ctx); // ctx.getIpfsd, startIpfs, stopIpfs, restartIpfs
    // await setupAutoUpdater(ctx); // ctx.checkForUpdates

    // open electron
    await createWindow();
  } catch (e) {
    handleError(e);
  }
}
