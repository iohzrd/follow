const path = require("path");
const fs = require("fs-extra");
const { app, ipcMain } = require("electron");
const APP_DATA_PATH = app.getPath("appData");
const IpfsHttpClient = require("ipfs-http-client");
const Orbit = require("orbit-core");
const logger = require("../common/logger");

module.exports = async function (ctx) {
  const ipfs = await IpfsHttpClient({
    host: "localhost",
    port: "5001",
    protocol: "http",
  });
  const { id } = await ipfs.id();

  const appDataPath = path.join(APP_DATA_PATH, "follow");
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath);
  }
  const orbitPath = path.join(appDataPath, "Comment Storage");
  if (!fs.existsSync(orbitPath)) {
    fs.mkdirSync(orbitPath);
  }
  const orbitOptions = {
    directory: orbitPath,
  };
  const orbit = new Orbit(ipfs, orbitOptions);
  ctx.orbit = orbit;
  orbit.events.on("connected", () => {
    logger.info(`[Orbit] connected`);
  });

  ipcMain.on("join-comment-channel", (event, channelName) => {
    try {
      orbit.join(channelName).then((channel) => {
        logger.info("joined");

        channel.on("entry", (entry) => {
          logger.info("entry");
          ctx.mainWindow.webContents.send("comment", entry.payload.value);
        });

        channel.on("ready", async () => {
          logger.info(`${channelName} ready`);
          ctx.mainWindow.webContents.send("comments-ready");
          const all = channel.feed
            .iterator({ limit: -1 })
            .collect()
            .map((e) => e.payload.value);
          all.forEach((comment) => {
            ctx.mainWindow.webContents.send("comment", comment);

            logger.info(comment);
          });
        });

        channel.load(-1);
      });
    } catch (error) {
      logger.info(`failed to join comment channel: ${channelName}`);
      logger.info(error);
    }
  });

  ipcMain.on("add-comment", (event, channelName, newComment) => {
    try {
      if (channelName in orbit.channels) {
        logger.info(`add-comment: ${channelName}, ${newComment}`);
        orbit.send(channelName, newComment);
      }
    } catch (error) {
      logger.info(`failed to add comment: ${channelName}, ${newComment}`);
      logger.info(error);
    }
  });

  ipcMain.on("leave-comment-channel", (event, channelName) => {
    try {
      const channel = orbit.channels[channelName];
      channel.removeAllListeners("entry");
      orbit.leave(channelName);
    } catch (error) {
      logger.info(`failed to leave comment channel: ${channelName}`);
      logger.info(error);
    }
  });

  // Connect to Orbit network
  try {
    orbit.connect(id);
  } catch (error) {
    logger.info("failed to connect to orbit");
    logger.info(error);
  }
};
