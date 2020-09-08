const path = require("path");
const fs = require("fs-extra");
const { app, ipcMain } = require("electron");
const APP_DATA_PATH = app.getPath("appData");
const IpfsHttpClient = require("ipfs-http-client");
const Orbit = require("orbit_");

module.exports = async function(ctx) {
  function getComments(cid) {
    if (!orbit.channels[cid]) {
      console.log("already joined...");
      console.log(true);
    }
  }

  console.log(ctx);
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
    const orbitPath = path.join(appDataPath, "Orbit Storage");
    if (!fs.existsSync(orbitPath)) {
      fs.mkdirSync(orbitPath);
    }
    const orbitOptions = {
      directory: orbitPath
    };
    const orbit = new Orbit(ipfs, orbitOptions);

    const channel = "chat";

    orbit.events.on("connected", () => {
      console.log(`-!- Orbit connected`);
      orbit.join(channel);
    });

    orbit.events.on("joined", channelName => {
      console.log("orbit.channels");
      console.log(orbit.channels);
      // orbit.send(channelName, `is now caching this channel`);
      // console.log("_getChannelFeed(channelName)");
      // console.log(orbit._getChannelFeed(channelName));
      console.log(`-!- Joined # ${channelName}`);
    });

    // Listen for new messages
    orbit.events.on("entry", (entry, channelName) => {
      const post = entry.payload.value;
      console.log("post");
      console.log(post);
      console.log(channelName);
    });

    ipcMain.on("getID", event => {
      event.returnValue = id;
    });

    // Connect to Orbit network
    orbit.connect(id).catch(e => console.error(e));
  } catch (error) {
    console.log(error);
  }
};
