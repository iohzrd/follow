const { remote } = require("electron");
const APP_DATA_PATH = remote.app.getPath("appData");
const path = require("path");
const fs = require("fs-extra");
const IpfsHttpClient = require("ipfs-http-client");
const levelup = require("levelup");
const leveldown = require("leveldown");
const encode = require("encoding-down");

async function main() {
  const ipfs = IpfsHttpClient({
    host: "localhost",
    port: "5001",
    protocol: "http"
  });
  const { id } = await ipfs.id();
  const appDataPath = path.join(APP_DATA_PATH, "follow");
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath);
  }
  const followStoragePath = path.join(appDataPath, "Follow Storage");
  if (!fs.existsSync(followStoragePath)) {
    fs.mkdirSync(followStoragePath);
  }

  const leveldb = levelup(
    encode(leveldown(followStoragePath), {
      valueEncoding: "json"
    })
  );
  const idObj = {
    av: "",
    aux: {},
    dn: "",
    following: [id],
    id: id,
    meta: [],
    posts: [],
    ts: Math.floor(new Date().getTime())
  };
  await leveldb.put(this.id, idObj);

  const obj = {
    path: "identity.json",
    content: JSON.stringify(idObj)
  };
  const addOptions = {
    pin: true,
    wrapWithDirectory: true,
    timeout: 10000
  };
  const pub = await this.ipfs.add(obj, addOptions);
  await this.ipfs.name.publish(pub.cid.string, { lifetime: "8760h" });
}
main();
