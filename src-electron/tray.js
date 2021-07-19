const { Menu, Tray, shell, app, ipcMain } = require("electron");
const i18n = require("i18next");
const path = require("path");
const logger = require("./common/logger");
const store = require("./common/store");
const moveRepositoryLocation = require("./move-repository-location");
const runGarbageCollector = require("./run-gc");
const {
  setCustomBinary,
  clearCustomBinary,
  hasCustomBinary,
} = require("./custom-ipfs-binary");
const { STATUS } = require("./daemon");
const {
  IS_MAC,
  IS_WIN,
  ELECTRON_VERSION,
  GO_IPFS_VERSION,
  VERSION,
} = require("./common/consts");

const {
  CONFIG_KEY: AUTO_LAUNCH_KEY,
  isSupported: supportsLaunchAtLogin,
} = require("./auto-launch");

const CONFIG_KEYS = [AUTO_LAUNCH_KEY];

function buildCheckbox(key, label) {
  return {
    id: key,
    label: i18n.t(label),
    click: () => {
      ipcMain.emit(`toggle_${key}`);
    },
    type: "checkbox",
    checked: false,
  };
}

// Notes on this: we are only supporting accelerators on macOS for now because
// they natively work as soon as the menu opens. They don't work like that on Windows
// or other OSes and must be registered globally. They still collide with global
// accelerator. Please see ../utils/setup-global-shortcut.js for more info.
function buildMenu(ctx) {
  return Menu.buildFromTemplate([
    ...[
      ["ipfsIsStarting", "yellow"],
      ["ipfsIsRunning", "green"],
      ["ipfsIsStopping", "yellow"],
      ["ipfsIsNotRunning", "gray"],
      ["ipfsHasErrored", "red"],
      ["runningWithGC", "yellow"],
    ].map(([status, color]) => ({
      id: status,
      label: i18n.t(status),
      visible: false,
      enabled: false,
      icon: path.resolve(
        __dirname,
        process.env.QUASAR_PUBLIC_FOLDER,
        `${color}.png`
      ),
    })),
    {
      id: "restartIpfs",
      label: i18n.t("restart"),
      click: () => {
        ctx.restartIpfs();
      },
      visible: false,
      accelerator: IS_MAC ? "Command+R" : null,
    },
    {
      id: "startIpfs",
      label: i18n.t("start"),
      click: () => {
        ctx.startIpfs();
      },
      visible: false,
    },
    {
      id: "stopIpfs",
      label: i18n.t("stop"),
      click: () => {
        ctx.stopIpfs();
      },
      visible: false,
    },
    { type: "separator" },
    {
      label: IS_MAC
        ? i18n.t("settings.preferences")
        : i18n.t("settings.settings"),
      submenu: [
        {
          label: i18n.t("settings.appPreferences"),
          enabled: false,
        },
        buildCheckbox(AUTO_LAUNCH_KEY, "settings.launchOnStartup"),
      ],
    },
    {
      label: i18n.t("advanced"),
      submenu: [
        {
          label: i18n.t("openLogsDir"),
          click: () => {
            shell.openItem(app.getPath("userData"));
          },
        },
        {
          label: i18n.t("openRepoDir"),
          click: () => {
            shell.openItem(store.get("ipfsConfig.path"));
          },
        },
        {
          label: i18n.t("openConfigFile"),
          click: () => {
            shell.openItem(store.path);
          },
        },
        { type: "separator" },
        {
          id: "runGarbageCollector",
          label: i18n.t("runGarbageCollector"),
          click: () => {
            runGarbageCollector(ctx);
          },
          enabled: false,
        },
        { type: "separator" },
        {
          id: "moveRepositoryLocation",
          label: i18n.t("moveRepositoryLocation"),
          click: () => {
            moveRepositoryLocation(ctx);
          },
        },
        {
          id: "setCustomBinary",
          label: i18n.t("setCustomIpfsBinary"),
          click: () => {
            setCustomBinary(ctx);
          },
          visible: false,
        },
        {
          id: "clearCustomBinary",
          label: i18n.t("clearCustomIpfsBinary"),
          click: () => {
            clearCustomBinary(ctx);
          },
          visible: false,
        },
      ],
    },
    {
      label: i18n.t("about"),
      submenu: [
        {
          label: i18n.t("versions"),
          enabled: false,
        },
        {
          label: `Follow: ${VERSION}`,
          click: () => {
            shell.openExternal("https://github.com/iohzrd/follow/releases");
          },
        },
        {
          label: `Electron: ${ELECTRON_VERSION}`,
          click: () => {
            shell.openExternal("https://github.com/electron/electron/releases");
          },
        },
        {
          label: hasCustomBinary()
            ? i18n.t("customIpfsBinary")
            : `go-ipfs: ${GO_IPFS_VERSION}`,
          click: () => {
            shell.openExternal("https://github.com/ipfs/go-ipfs/releases");
          },
        },
        { type: "separator" },
        {
          label: i18n.t("checkForUpdates"),
          click: () => {
            ctx.checkForUpdates();
          },
        },
        { type: "separator" },
        {
          label: i18n.t("viewOnGitHub"),
          click: () => {
            shell.openExternal(
              "https://github.com/iohzrd/follow/blob/master/README.md"
            );
          },
        },
        {
          label: i18n.t("helpUsTranslate"),
          click: () => {
            shell.openExternal("https://www.transifex.com/ipfs/follow/");
          },
        },
      ],
    },
    {
      label: i18n.t("quit"),
      click: async () => {
        console.log("shutting down...");
        if (ctx.tor && ctx.tor_hs && ctx.tor_hs.serviceId) {
          await ctx.tor.destroyHiddenServicePromise(ctx.tor_hs.serviceId);
        }
        if (ctx.ipfs) {
          await ctx.ipfs.stop();
        }
        app.quit();
      },
      accelerator: IS_MAC ? "Command+Q" : null,
    },
  ]);
}

const on = "on";
const off = "off";

function icon(color) {
  if (!IS_MAC) {
    return path.resolve(
      __dirname,
      process.env.QUASAR_PUBLIC_FOLDER,
      `${color}-big.png`
    );
  }

  return path.resolve(
    __dirname,
    process.env.QUASAR_PUBLIC_FOLDER,
    `${color}-22Template.png`
  );
}

module.exports = function (ctx) {
  logger.info("[tray] starting");
  const tray = new Tray(icon(off));
  let menu = null;

  const state = {
    status: null,
    gcRunning: false,
  };

  if (!IS_MAC) {
    // Show the context menu on left click on other
    // platforms than macOS.
    tray.on("click", (event) => {
      logger.info(event);
      tray.popUpContextMenu();
    });
  }

  const setupMenu = () => {
    menu = buildMenu(ctx);

    tray.setContextMenu(menu);
    tray.setToolTip("follow");

    menu.on("menu-will-show", () => {
      ipcMain.emit("menubar-will-open");
    });
    menu.on("menu-will-close", () => {
      ipcMain.emit("menubar-will-close");
    });

    updateMenu();
  };

  const updateMenu = () => {
    const { status, gcRunning } = state;
    const errored =
      status === STATUS.STARTING_FAILED || status === STATUS.STOPPING_FAILED;

    menu.getMenuItemById("ipfsIsStarting").visible =
      status === STATUS.STARTING_STARTED && !gcRunning;
    menu.getMenuItemById("ipfsIsRunning").visible =
      status === STATUS.STARTING_FINISHED && !gcRunning;
    menu.getMenuItemById("ipfsIsStopping").visible =
      status === STATUS.STOPPING_STARTED && !gcRunning;
    menu.getMenuItemById("ipfsIsNotRunning").visible =
      status === STATUS.STOPPING_FINISHED && !gcRunning;
    menu.getMenuItemById("ipfsHasErrored").visible = errored && !gcRunning;
    menu.getMenuItemById("runningWithGC").visible = gcRunning;

    menu.getMenuItemById("startIpfs").visible =
      status === STATUS.STOPPING_FINISHED;
    menu.getMenuItemById("stopIpfs").visible =
      status === STATUS.STARTING_FINISHED;
    menu.getMenuItemById("restartIpfs").visible =
      status === STATUS.STARTING_FINISHED || errored;

    menu.getMenuItemById("startIpfs").enabled = !gcRunning;
    menu.getMenuItemById("stopIpfs").enabled = !gcRunning;
    menu.getMenuItemById("restartIpfs").enabled = !gcRunning;

    menu.getMenuItemById(AUTO_LAUNCH_KEY).enabled = supportsLaunchAtLogin();

    menu.getMenuItemById("moveRepositoryLocation").enabled =
      !gcRunning && status !== STATUS.STOPPING_STARTED;
    menu.getMenuItemById("runGarbageCollector").enabled =
      menu.getMenuItemById("ipfsIsRunning").visible && !gcRunning;

    menu.getMenuItemById("setCustomBinary").visible = !hasCustomBinary();
    menu.getMenuItemById("clearCustomBinary").visible = hasCustomBinary();

    if (status === STATUS.STARTING_FINISHED) {
      tray.setImage(icon(on));
    } else {
      tray.setImage(icon(off));
    }

    // Update configuration checkboxes.
    for (const key of CONFIG_KEYS) {
      menu.getMenuItemById(key).checked = store.get(key, false);
    }

    if (!IS_MAC && !IS_WIN) {
      // On Linux, in order for changes made to individual MenuItems to take effect,
      // you have to call setContextMenu again - https://electronjs.org/docs/api/tray
      tray.setContextMenu(menu);
    }
  };

  ipcMain.on("ipfsd", (status) => {
    state.status = status;
    updateMenu();
  });

  ipcMain.on("gcRunning", () => {
    state.gcRunning = true;
    updateMenu();
  });

  ipcMain.on("gcEnded", () => {
    state.gcRunning = false;
    updateMenu();
  });

  ipcMain.on("configUpdated", () => {
    updateMenu();
  });
  ipcMain.on("languageUpdated", () => {
    setupMenu();
  });

  setupMenu();

  ctx.tray = tray;
  logger.info("[tray] started");
};
