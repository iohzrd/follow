const { app } = require("electron");
const APP_DATA_PATH = app.getPath("appData");
const http = require("http");
const granax = require("@iohzrd/granax");
const path = require("path");
const fs = require("fs-extra");
const IpfsHttpClient = require("ipfs-http-client");
const levelup = require("levelup");
const leveldown = require("leveldown");
const encode = require("encoding-down");

const dbContainsKey = (db, key) => {
  return new Promise((resolve) => {
    db.get(key, function (err) {
      if (err) resolve(false);
      resolve(true);
    });
  });
};

async function main() {
  let tor = null;
  let tor_id = null;
  const ipfs = IpfsHttpClient({
    host: "localhost",
    port: "5001",
    protocol: "http",
  });
  const { id } = await ipfs.id();
  const appDataPath = path.join(APP_DATA_PATH, "identicity");
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath);
  }
  const followStoragePath = path.join(appDataPath, "identicity Storage");
  if (!fs.existsSync(followStoragePath)) {
    fs.mkdirSync(followStoragePath);
  }

  const level_db = levelup(
    encode(leveldown(followStoragePath), {
      valueEncoding: "json",
    })
  );

  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    switch (req.url) {
      case "/identity.json":
        res.writeHead(200);
        // res.end(JSON.stringify(self));
        break;

      default:
        res.writeHead(200);
      // res.end(JSON.stringify(self));
    }
  });
  server.listen(0, "127.0.0.1");
  tor = await granax();

  tor_id = {};
  if (await dbContainsKey(level_db, "tor_id")) {
    tor_id = await level_db.get("tor_id");
  }

  const data = await tor.createHiddenServicePromise(
    `127.0.0.1:${server.address().port}`,
    tor_id
  );
  console.log("serving identity via tor hidden service:");
  console.log(data);

  // if (self && data && data.serviceId) {
  //   console.log("self && data && data.serviceId");
  //   self.hs = data.serviceId;
  // }

  if (!(await dbContainsKey(level_db, "tor_id"))) {
    if (data && data.privateKey && data.serviceId) {
      const pk = data.privateKey.split(":");
      tor_id = {
        keyType: pk[0],
        keyBlob: pk[1],
        serviceId: data.serviceId,
      };
      await level_db.put("tor_id", tor_id);
    }
  }

  const idObj = {
    aux: [],
    av: "",
    dn: "",
    following: [id],
    hs: tor_id.serviceId || "",
    id: id,
    meta: [],
    posts: [],
    ts: Math.floor(new Date().getTime()),
  };
  console.log("idObj");
  console.log(idObj);
  await level_db.put("feed", []);
  // await level_db.put("posts_deep", {});
  await level_db.put(id, idObj);

  const obj = {
    path: "identity.json",
    content: JSON.stringify(idObj),
  };
  const addOptions = {
    pin: true,
    wrapWithDirectory: true,
    timeout: 10000,
  };
  const pub = await ipfs.add(obj, addOptions);
  await ipfs.name.publish(String(pub.cid), { lifetime: "8760h" });

  const db_id = await level_db.get(id);
  console.log("db_id");
  console.log(db_id);
}
main();
