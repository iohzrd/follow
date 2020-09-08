const { ipcMain } = require("electron");
const IpfsHttpClient = require("ipfs-http-client");
const { Identity } = require("../..//identity");

module.exports = async function(ctx) {
  ipcMain.on("identityRequest", event => {
    event.sender.send("identity", identity.serialize());
  });
  ipcMain.on("getID", event => {
    event.returnValue = id;
  });
  ipcMain.on("getFeed", event => {
    console.log("on.getFeed");
    console.log(event);
    console.log("identity.feed");
    console.log(identity.feed);
    event.sender.send("feed", identity.feed);
  });
  const ipfs = await IpfsHttpClient({
    host: "localhost",
    port: "5001",
    protocol: "http"
  });
  const { id } = await ipfs.id();
  const identity = new Identity(id, true);
  ctx.identity = identity;
  return identity;
};
