import { app, dialog, BrowserWindow, nativeTheme } from "electron";
const fixPath = require("fix-path");
const { criticalErrorDialog } = require("../dialogs");
const logger = require("../common/logger");
// const setupProtocolHandlers = require("../protocol-handlers");
const setupI18n = require("../i18n");
const setupDaemon = require("../daemon");
const setupAutoLaunch = require("../auto-launch");
const setupAppMenu = require("../app-menu");
// const setupAutoUpdater = require("../auto-updater");
const setupTray = require("../tray");
const setupDownloadCid = require("../download-cid");
// const setupAnalytics = require("../analytics");
const setupIdentity = require("../identity");

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
  logger.error(err.stack);
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

async function createWindow(ctx) {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 960,
    height: 1080,
    useContentSize: true,
    webPreferences: {
      contextIsolation: false,
      // Change from /quasar.conf.js > electron > nodeIntegration;
      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: process.env.QUASAR_NODE_INTEGRATION,
      nodeIntegrationInWorker: process.env.QUASAR_NODE_INTEGRATION

      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      // preload: path.resolve(__dirname, 'electron-preload.js')
    }
  });

  ctx.mainWindow = mainWindow;

  mainWindow.loadURL(process.env.APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", main);

app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    console.log("shutting down...");
    if (ctx.tor && ctx.tor_hs && ctx.tor_hs.serviceId) {
      await ctx.tor.destroyHiddenServicePromise(ctx.tor_hs.serviceId);
    }
    if (ctx.ipfs) {
      await ctx.ipfs.shutdown();
    }
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
    // await setupAnalytics(ctx); // ctx.countlyDeviceId
    await setupI18n(ctx);
    await setupAppMenu(ctx);
    await setupTray(ctx); // ctx.tray
    await setupDaemon(ctx); // ctx.getIpfsd, startIpfs, stopIpfs, restartIpfs
    // await setupAutoUpdater(ctx); // ctx.checkForUpdates

    await Promise.all([
      setupAutoLaunch(ctx),
      // Setup global shortcuts
      setupDownloadCid(ctx)
    ]);

    // // Setup identity
    await setupIdentity(ctx);
    // open electron
    await createWindow(ctx);
    // // Setup pubsub
    // await setupOrbit(ctx);
  } catch (e) {
    handleError(e);
  }
}
