import path from "path";
import { app, dialog, BrowserWindow, nativeTheme } from "electron";
import fixPath from "fix-path";
import { criticalErrorDialog } from "./dialogs";
import logger from "./common/logger";
// import setupProtocolHandlers from "./protocol-handlers";
import setupI18n from "./i18n";
import setupDaemon from "./daemon";
// import setupWebUI from "./webui";
import setupAutoLaunch from "./auto-launch";
import setupAutoGc from "./automatic-gc";
import setupPubsub from "./enable-pubsub";
import setupNamesysPubsub from "./enable-namesys-pubsub";
import setupDownloadCid from "./download-cid";
import setupAppMenu from "./app-menu";
// import setupArgvFilesHandler from "./argv-files-handler";
// import setupAutoUpdater from "./auto-updater";
import setupTray from "./tray";
// import setupIpfsOnPath from "./ipfs-on-path";
// import setupAnalytics from "./analytics";
import setupIdentity from "./identity";

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

try {
  if (
    process.platform === "win32" &&
    nativeTheme.shouldUseDarkColors === true
  ) {
    require("fs").unlinkSync(
      require("path").join(app.getPath("userData"), "DevTools Extensions")
    );
  }
} catch (e) {
  console.log(e);
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

async function createWindow(ctx) {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 960,
    height: 1080,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
    },
  });

  ctx.mainWindow = mainWindow;

  mainWindow.loadURL(process.env.APP_URL);

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", main);

app.on("window-all-closed", async () => {
  console.log("shutting down...");
  if (ctx.tor && ctx.tor_hs && ctx.tor_hs.serviceId) {
    await ctx.tor.destroyHiddenServicePromise(ctx.tor_hs.serviceId);
  }
  if (ctx.ipfs) {
    await ctx.ipfs.stop();
  }

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
    // await setupAnalytics(ctx); // ctx.countlyDeviceId
    await setupI18n(ctx);
    await setupAppMenu(ctx);

    // await setupWebUI(ctx) // ctx.webui, launchWebUI
    await setupTray(ctx); // ctx.tray
    await setupDaemon(ctx); // ctx.getIpfsd, startIpfs, stopIpfs, restartIpfs
    // await setupAutoUpdater(ctx); // ctx.checkForUpdates

    await Promise.all([
      // setupArgvFilesHandler(ctx),
      setupAutoLaunch(ctx),
      setupAutoGc(ctx),
      setupPubsub(ctx),
      setupNamesysPubsub(ctx),
      // Setup global shortcuts
      setupDownloadCid(ctx),
      // setupIpfsOnPath(ctx)
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
