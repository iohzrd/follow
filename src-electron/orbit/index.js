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
    const orbitPath = path.join(appDataPath, "Orbit Storage");
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
          // const feed = orbit.channels[channelName].feed;
          const feed = channel.feed;
          const all = feed
            .iterator({ limit: -1 })
            .collect()
            .map(e => e.payload.value);
          all.forEach(comment => {
            // event.sender.send("comment", comment);
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

    // ipcMain.on("join-comment-channel", (event, channelName) => {
    //   console.log(orbit.channels);
    //   if (!(channelName in orbit.channels)) {
    //     orbit.join(channelName).then((channel) => {
    //       console.log("joined")
    //       // console.log(channel)

    //       channel.on('entry', entry => {
    //         // messages = [...messages, entry.payload.value].sort((a, b) => a.meta.ts - b.meta.ts)
    //         console.log("entry")
    //         // console.log(entry.payload.value)
    //         ctx.mainWindow.webContents.send("comment", entry.payload.value)
    //       })

    //       channel.on('ready', async () => {
    //         console.log(`${channelName} ready`)
    //         // const feed = orbit.channels[channelName].feed
    //         // const all = feed.iterator({ limit: -1 })
    //         // .collect()
    //         // .map((e) => e.payload.value)
    //         // console.log("all")
    //         // console.log(all)
    //         // try {
    //         //   all.forEach(comment => {
    //         //     // event.sender.send("comment", comment);
    //         //     ctx.mainWindow.webContents.send("comment", comment)

    //         //     console.log(comment)
    //         //   });
    //         // } catch (error) {
    //         //   console.log(error)
    //         // }
    //         // feed.forEach(comment => {
    //         //   event.sender.send("comment", comment);
    //         // });
    //         // event.sender.send("comment", feed);
    //       })

    //       // channel.load(-1)

    //     })
    //   }

    // });

    // Connect to Orbit network
    orbit.connect(id).catch(e => console.error(e));
  } catch (error) {
    console.log(error);
  }
};
