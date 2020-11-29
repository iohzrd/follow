const path = require("path");
const fs = require("fs-extra");
const { app, ipcMain } = require("electron");
const APP_DATA_PATH = app.getPath("appData");
const IpfsHttpClient = require("ipfs-http-client");
const Orbit = require("orbit_");

module.exports = async function(ctx) {
  try {
    const ipfs = await IpfsHttpClient({
      host: "localhost",
      port: "5001",
      protocol: "http"
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
      directory: orbitPath
    };
    const orbit = new Orbit(ipfs, orbitOptions);
    orbit.connect(id).catch(e => console.error(e));

    orbit.events.on("connected", () => {
      console.log(`[Orbit] connected`);
    });

    ipcMain.on("join-comment-channel", (event, channelName) => {
      orbit.join(channelName).then(channel => {
        console.log("joined");

        channel.on("entry", entry => {
          console.log("entry");
          ctx.mainWindow.webContents.send("comment", entry.payload.value);
        });

        channel.on("ready", async () => {
          console.log(`${channelName} ready`);
          ctx.mainWindow.webContents.send("comments-ready");
          const all = channel.feed
            .iterator({ limit: -1 })
            .collect()
            .map(e => e.payload.value);
          all.forEach(comment => {
            ctx.mainWindow.webContents.send("comment", comment);

            console.log(comment);
          });
        });

        channel.load(-1);
      });
    });

    ipcMain.on("add-comment", (event, channelName, newComment) => {
      if (channelName in orbit.channels) {
        console.log(`add-comment: ${channelName}, ${newComment}`);
        orbit.send(channelName, newComment);
      }
    });

    ipcMain.on("leave-comment-channel", (event, channelName) => {
      const channel = orbit.channels[channelName];
      channel.removeAllListeners("entry");
      orbit.leave(channelName);
    });

    // Connect to Orbit network
    orbit.connect(id).catch(e => console.error(e));
  } catch (error) {
    console.log(error);
  }
};
