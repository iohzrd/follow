const { app, ipcMain } = require("electron");
const IpfsHttpClient = require("ipfs-http-client");
const all = require("it-all");
const http = require("http");
const path = require("path");
const fs = require("fs-extra");
const levelup = require("levelup");
const leveldown = require("leveldown");
const encode = require("encoding-down");
const granax = require("@iohzrd/granax");
const tr = require("tor-request");
const logger = require("../common/logger");

const IDENTITY_TEMPLATE = {
  aux: [],
  av: "",
  dn: "",
  following: [],
  id: "",
  hs: "",
  meta: [],
  posts: [],
  ts: 0
};

module.exports = async function(ctx) {
  logger.info("[identity] starting");
  logger.info(ctx);
  let app_data_path = null;
  let identity_storage_path = null;
  let post_storage_path = null;
  let feed_storage_path = null;
  let pin_storage_path = null;
  let ipfs = null;
  let ipfs_id = null;
  let identity_db = null;
  let post_db = null;
  let feed_db = null;
  let pin_db = null;
  let self = null;
  let tor = null;
  let tor_id = {};

  const dbContainsKey = (db, key) => {
    return new Promise(resolve => {
      db.get(key, function(err) {
        if (err) resolve(false);
        resolve(true);
      });
    });
  };

  const torRequestPromise = onion => {
    return new Promise((resolve, reject) => {
      tr.request(onion, function(err, res, body) {
        if (err) reject();
        if (!err && res.statusCode == 200) {
          resolve(body);
        }
      });
    });
  };

  const init = async () => {
    logger.info("[identity] init");

    // start IpfsHttpClient
    ipfs = IpfsHttpClient({
      host: "localhost",
      port: "5001",
      protocol: "http"
    });
    ipfs_id = await ipfs.id();

    // ensure paths and directories...
    app_data_path = path.join(app.getPath("appData"), "follow");
    if (!fs.existsSync(app_data_path)) {
      fs.mkdirSync(app_data_path);
    }
    identity_storage_path = path.join(app_data_path, "Identity Storage");
    if (!fs.existsSync(identity_storage_path)) {
      fs.mkdirSync(identity_storage_path);
    }
    post_storage_path = path.join(app_data_path, "Post Storage");
    if (!fs.existsSync(post_storage_path)) {
      fs.mkdirSync(post_storage_path);
    }
    pin_storage_path = path.join(app_data_path, "Pin Storage");
    if (!fs.existsSync(pin_storage_path)) {
      fs.mkdirSync(pin_storage_path);
    }
    feed_storage_path = path.join(app_data_path, "Feed Storage");
    if (!fs.existsSync(feed_storage_path)) {
      fs.mkdirSync(feed_storage_path);
    }

    // ensure db's
    identity_db = levelup(
      encode(leveldown(identity_storage_path), {
        valueEncoding: "json"
      })
    );
    post_db = levelup(
      encode(leveldown(post_storage_path), {
        valueEncoding: "json"
      })
    );
    pin_db = levelup(
      encode(leveldown(pin_storage_path), {
        valueEncoding: "json"
      })
    );
    feed_db = levelup(
      encode(leveldown(feed_storage_path), {
        valueEncoding: "json"
      })
    );

    if (!(await dbContainsKey(post_db, ipfs_id.id))) {
      await post_db.put(ipfs_id.id, {});
    }

    if (!(await dbContainsKey(pin_db, ipfs_id.id))) {
      await pin_db.put(ipfs_id.id, []);
    }

    if (!(await dbContainsKey(feed_db, "feed"))) {
      await feed_db.put("feed", []);
    }

    if (await dbContainsKey(identity_db, ipfs_id.id)) {
      await load();
    } else {
      // first run, initialize new identity...
      self = IDENTITY_TEMPLATE;
      self.following = [ipfs_id.id];
    }

    const server = http.createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      switch (req.url) {
        case "/identity.json":
          res.writeHead(200);
          res.end(JSON.stringify(self));
          break;

        default:
          res.writeHead(200);
          res.end(JSON.stringify(self));
      }
    });
    server.listen(0, "127.0.0.1");
    tor = await granax();

    if (await dbContainsKey(identity_db, "tor_id")) {
      tor_id = await identity_db.get("tor_id");
    }

    const tor_hs = await tor.createHiddenServicePromise(
      `127.0.0.1:${server.address().port}`,
      tor_id
    );
    logger.info("serving identity via tor hidden service:");
    console.log(tor_hs);

    if (self && tor_hs && tor_hs.serviceId) {
      console.log("self && data && data.serviceId");
      self.hs = tor_hs.serviceId;
    }

    if (!(await dbContainsKey(identity_db, "tor_id"))) {
      if (tor_hs && tor_hs.privateKey && tor_hs.serviceId) {
        const pk = tor_hs.privateKey.split(":");
        tor_id = {
          keyType: pk[0],
          keyBlob: pk[1],
          serviceId: tor_hs.serviceId
        };
        await identity_db.put("tor_id", tor_id);
      }
    }

    save();
  };

  // get id
  ipcMain.on("get-id", async event => {
    if (!ipfs_id) {
      ipfs_id = await ipfs.id();
    }
    event.sender.send("id", ipfs_id);
  });
  ipcMain.handle("get-id", async event => {
    console.log(event);
    if (!ipfs_id) {
      ipfs_id = await ipfs.id();
    }
    return ipfs_id;
  });

  const load = async () => {
    logger.info("load");
    self = await identity_db.get(ipfs_id.id);
    console.log(self);
  };

  const save = async () => {
    logger.info("saving identity...");
    self.id = ipfs_id.id;
    self.hs = tor_id.serviceId || "";
    self.ts = Math.floor(new Date().getTime());
    console.log(self);
    await identity_db.put(ipfs_id.id, self);
    await publish();
  };

  // publish identity
  const publish = async () => {
    logger.info("[Identity] publish()");
    console.log(self);
    const obj = {
      path: "identity.json",
      content: JSON.stringify(self)
    };
    const add_options = {
      pin: true,
      wrapWithDirectory: true,
      timeout: 10000
    };
    const publish_object = await ipfs.add(obj, add_options);
    const publish_result = await ipfs.name.publish(publish_object.cid.string, {
      lifetime: "8760h"
    });
    logger.info("publish complete");
    console.log(publish_result);
    return publish_result;
  };
  ipcMain.on("publish-identity", async event => {
    const result = await publish();
    event.sender.send("publish-identity-complete", result);
  });
  ipcMain.handle("publish-identity", async () => {
    const result = await publish();
    return result;
  });

  const pinCID = async cid => {
    logger.info(`[Identity] pinCID(${cid})`);
    const pin_result = await ipfs.pin.add(cid);
    logger.info("pin_result");
    logger.info(pin_result);
    return pin_result;
  };

  const pinIdentity = async (id, cid) => {
    logger.info(`[Identity] pinIdentity(${cid})`);

    if (!(await dbContainsKey(pin_db, id))) {
      await pin_db.put(id, []);
    }
    let pins = await post_db.get(id);
    for await (const pin of pins) {
      logger.info("unpinning old identity CID");
      const unpin_result = await ipfs.pin.rm(pin);
      logger.info("unpin_result");
      logger.info(unpin_result);
    }
    pins = [];
    logger.info("pinning new identity CID");
    const pin_result = await ipfs.pin.add(cid);
    pins.push(pin_result);
    logger.info(pin_result);
    logger.info("pin_result");
    await pin_db.put(id, pins);
    return pin_result;
  };

  const getIdentityIpfs = async id => {
    logger.info(`[Identity] getIdentityIpfs(${id})`);
    const identity_root_cid = await all(ipfs.name.resolve(id));
    const identity_json_cid = `${identity_root_cid[0]}/identity.json`;
    await pinIdentity(id, identity_root_cid);
    const identity_json = Buffer.concat(await all(ipfs.cat(identity_json_cid)));
    return JSON.parse(identity_json);
  };

  const getIdentityTor = async id => {
    logger.info(`[Identity] getIdentityTor(${id})`);
    let identity_json, identity_object;
    if (await dbContainsKey(identity_db, id)) {
      identity_object = await identity_db.get(id);
    }
    if (identity_object.hs) {
      const tor_url = `http://${identity_object.hs}.onion/identity.json`;
      identity_json = await torRequestPromise(tor_url);
    }
    return JSON.parse(identity_json);
  };

  const getIdentity = async id => {
    logger.info(`getIdentity(${id})`);
    let identity_object;
    if (await dbContainsKey(identity_db, id)) {
      logger.info("loading identity from DB...");
      identity_object = await identity_db.get(id);
    } else {
      logger.info(
        "inserting blank identity into DB. We'll grab the real one when we can..."
      );
      identity_object = IDENTITY_TEMPLATE;
      identity_object.following = [id];
      identity_object.id = id;
      identity_object.ts = Math.floor(new Date().getTime());
      if (id !== ipfs_id.id) {
        await identity_db.put(id, identity_object);
      }
    }
    // console.log(identity_object);
    return identity_object;
  };
  ipcMain.on("get-identity", async (event, id) => {
    const identity_object = await getIdentity(id);
    event.sender.send("identity", identity_object);
  });
  ipcMain.handle("get-identity", async (event, id) => {
    const identity_object = await getIdentity(id);
    return identity_object;
  });

  // edit identity field
  const editIdentityField = async (event, kv) => {
    logger.info("[Identity] editIdentityField()");
    console.log(kv);
    const key = kv.key;
    const value = kv.value;
    if (typeof self[key] === typeof value) {
      self[key] = value;
      await save();
    }
  };
  ipcMain.on("edit-identity-field", editIdentityField);

  // update followed identities
  const updateFollowing = async () => {
    logger.info("updateFollowing()");
    for await (const id of self.following) {
      let identity_object = null;
      if (id !== ipfs_id.id) {
        // try retreiving identity from tor
        identity_object = await getIdentityIpfs(id).catch(() => {
          logger.info("failed to fetch identity from ipfs");
        });
        // if tor fails, try retreiving identity from IPFS
        if (!identity_object) {
          identity_object = await getIdentityTor(id).catch(() => {
            logger.info(`failed to fetch identity from tor: ${id}`);
          });
        }
        // if retreived, save it...
        if (identity_object) {
          logger.info("Identity retreived, saving DB...");
          if (identity_object.id != id) {
            console.log("Id in identity fraudulent, correcting....");
            console.log(`expected: ${id}, got: ${identity_object["id"]}`);
            identity_object["id"] = id;
          }
          await identity_db.put(id, identity_object);
        }
      }
    }
  };
  ipcMain.on("update-following", async event => {
    const result = await updateFollowing();
    event.sender.send("update-following-complete", result);
  });
  ipcMain.handle("update-following", async () => {
    const result = await updateFollowing();
    return result;
  });

  const followId = async id => {
    logger.info("[Identity] followId()");
    if (!self.following.includes(id)) {
      self.following.push(id);
      await save();
    }
  };
  ipcMain.on("follow", async (event, id) => {
    await followId(id);
  });

  const unfollowId = async (id, purge) => {
    logger.info("[Identity] unfollowId()");
    if (self.following.includes(id)) {
      const id_index = self.following.indexOf(id);
      if (id_index > -1) {
        self.following.splice(id_index, 1);
      }
      await save();
      let feed = await feed_db.get("feed");
      feed = feed.filter(post_object => post_object.publisher != id);
      feed_db.put("feed", feed);
      if (purge) {
        feed_db.del(id);
      }
    }
  };
  ipcMain.on("unfollow", async (event, id, purge) => {
    await unfollowId(id, purge);
  });

  const getPostIpfs = async post_cid => {
    logger.info("getPostIpfs");
    await pinCID(post_cid);
    let post_buffer;
    try {
      post_buffer = Buffer.concat(await all(ipfs.cat(`${post_cid}/post.json`)));
    } catch (error) {
      post_buffer = Buffer.concat(await all(ipfs.cat(post_cid)));
    }
    return JSON.parse(post_buffer);
  };

  const getPost = async (identity_object, cid) => {
    logger.info("getPost");
    const fid = identity_object.id;
    let post_object;

    if (!(await dbContainsKey(post_db, fid))) {
      await post_db.put(fid, {});
    }
    let posts_deep = await post_db.get(fid);
    if (posts_deep[cid]) {
      logger.info("loading post from DB...");
      post_object = posts_deep[cid];
    } else {
      logger.info("loading post from IPFS...");
      post_object = await getPostIpfs(cid);
      posts_deep[cid] = post_object;
      await post_db.put(fid, posts_deep);
    }
    if (!post_object.publisher) {
      post_object.publisher = identity_object.id;
    }
    post_object.postCid = cid;
    post_object.identity = {};
    post_object.identity.av = identity_object.av;
    post_object.identity.dn = identity_object.dn;
    post_object.identity.id = identity_object.id;
    post_object.identity.ts = identity_object.ts;
    return post_object;
  };

  // get post
  ipcMain.on("get-post", async (event, id, postCid) => {
    const identity_object = await getIdentity(id);
    const post_object = await getPost(identity_object, postCid);
    event.sender.send("post", post_object);
  });

  // get posts
  ipcMain.on("get-posts", async (event, id) => {
    const identity_object = await getIdentity(id);
    for await (const postCid of identity_object.posts) {
      const post_object = await getPost(identity_object, postCid);
      event.sender.send("post", post_object);
    }
  });

  // get feed
  ipcMain.on("get-feed", async event => {
    logger.info("get-feed");
    let feed = await feed_db.get("feed");
    feed.forEach(post_object => {
      event.sender.send("feedItem", post_object);
    });
  });

  // get feed all
  ipcMain.on("get-feed-all", async event => {
    let feed = await feed_db.get("feed");
    event.sender.send("feedAll", feed);
  });

  // update feed
  const updateFeed = async rerender => {
    logger.info("updateFeed()");
    let feed;
    if (rerender) {
      feed = [];
    } else {
      feed = await feed_db.get("feed");
    }
    console.log("loading posts_deep");
    for await (const fid of self.following) {
      let include_deleted;
      if (!(await dbContainsKey(post_db, fid))) {
        await post_db.put(fid, {});
      }
      let posts_deep = await post_db.get(fid);
      const identity_object = await getIdentity(fid);
      // update posts_deep
      for await (const postCid of identity_object.posts) {
        console.log("postCid");
        console.log(postCid);
        const post_object = await getPost(identity_object, postCid);
        if (!posts_deep[postCid]) {
          console.log(`adding ${fid} to posts_deep`);
          posts_deep[postCid] = post_object;
        }
      }
      await post_db.put(fid, posts_deep);

      if (typeof posts_deep.include_deleted === "boolean") {
        include_deleted = posts_deep.include_deleted;
      } else {
        posts_deep.include_deleted = include_deleted = true;
      }

      if (include_deleted) {
        // get posts, including deleted ones
        for (const postCid in posts_deep) {
          const post_object = posts_deep[postCid];
          if (typeof post_object === "object") {
            post_object.postCid = postCid;
            post_object.identity = {};
            post_object.identity.av = identity_object.av;
            post_object.identity.dn = identity_object.dn;
            post_object.identity.id = identity_object.id;
            post_object.identity.ts = identity_object.ts;
            if (!feed.some(id => id.postCid === post_object.postCid)) {
              feed.unshift(post_object);
            }
          }
        }
      } else {
        // get posts, excluding deleted ones
        for await (const postCid of identity_object.posts) {
          const post_object = await getPost(identity_object, postCid);
          if (!feed.some(id => id.postCid === post_object.postCid)) {
            feed.unshift(post_object);
          }
        }
      }
      //
    }
    feed.sort((a, b) => (a.ts > b.ts ? 1 : -1));
    await feed_db.put("feed", feed);
  };
  ipcMain.on("update-feed", async event => {
    const result = await updateFeed();
    event.sender.send("update-feed-complete", result);
  });
  ipcMain.handle("update-feed", async () => {
    const result = await updateFeed();
    return result;
  });

  // get following deep
  ipcMain.on("get-following", async event => {
    for await (const fid of self.following) {
      const identity_object = await getIdentity(fid);
      event.sender.send("followingIdentity", identity_object);
    }
  });

  // add post
  const addPost = async post => {
    logger.info("[Identity] addPost()");
    const { body, files } = post;
    // console.log(files);
    // console.log(body);
    let filesRoot = "";
    let file_list = [];
    let file_names = [];

    let ts = Math.floor(new Date().getTime());
    if (files.length) {
      for await (const file of files) {
        const file_object = {
          path: file.name,
          content: await fs.readFile(file.path)
        };
        file_names.push(file.name);
        file_list.push(file_object);
      }

      logger.info(file_names);
      logger.info(file_list);
      const add_options = {
        pin: true,
        wrapWithDirectory: true,
        timeout: 10000
      };
      const add_result = await ipfs.add(file_list, add_options);
      filesRoot = add_result.cid.string;
      logger.info("addRet1");
      logger.info(add_result);
    }

    const post_object = {
      body: body,
      dn: self.dn,
      files: file_names,
      filesRoot: filesRoot,
      magnet: "",
      meta: [],
      publisher: ipfs_id.id,
      ts: ts
    };
    logger.info("post_object");
    logger.info(post_object);
    const index_html = await fs.readFile(
      path.join(__statics, "/postStandalone.html")
    );
    const obj = [
      {
        path: "post.json",
        content: JSON.stringify(post_object)
      },
      {
        path: "index.html",
        content: index_html
      }
    ];
    const add_options = {
      // pin: true,
      wrapWithDirectory: true,
      timeout: 10000
    };
    const add_result = await ipfs.add(obj, add_options);
    logger.info("addRet2");
    logger.info(add_result);
    const cid = add_result.cid.string;
    if (typeof cid === "string" && cid.length == 46) {
      self.posts.unshift(cid);
      save();
    }
    post_object.postCid = cid;
    post_object.identity = {};
    post_object.identity.av = self.av;
    post_object.identity.dn = self.dn;
    post_object.identity.id = self.id;
    post_object.identity.ts = self.ts;
    // ctx.mainWindow.webContents.send("feedItem", post_object);

    if (!(await dbContainsKey(post_db, ipfs_id.id))) {
      await post_db.put(ipfs_id.id, {});
    }
    let posts_deep = await post_db.get(ipfs_id.id);
    if (!posts_deep[cid]) {
      console.log(`adding ${cid} to posts_deep`);
      posts_deep[cid] = post_object;
      await post_db.put(ipfs_id.id, posts_deep);
    }

    let feed = await feed_db.get("feed");
    if (!feed.some(id => id.postCid === post_object.postCid)) {
      feed.unshift(post_object);
    }
    await feed_db.put("feed", feed);

    return add_result;
  };
  ipcMain.on("add-post", async (event, post_object) => {
    await addPost(post_object);
  });
  ipcMain.handle("add-post", async (event, post_object) => {
    const add_result = await addPost(post_object);
    return add_result;
  });

  // remove post
  const removePost = async cid => {
    logger.info("[Identity] removePost()");
    const post_index = self.posts.indexOf(cid);
    if (post_index > -1) {
      self.posts.splice(post_index, 1);
    }

    if (!(await dbContainsKey(post_db, ipfs_id.id))) {
      await post_db.put(ipfs_id.id, {});
    }
    let posts_deep = await post_db.get(ipfs_id.id);
    if (posts_deep && posts_deep[cid]) {
      delete posts_deep[cid];
      await post_db.put(ipfs_id.id, posts_deep);
    }
    save();
    let feed = await feed_db.get("feed");
    feed = feed.filter(post_object => post_object.postCid != cid);
    feed_db.put("feed", feed);
  };
  ipcMain.on("remove-post", async (event, cid) => {
    await removePost(cid);
  });
  ipcMain.handle("remove-post", async (event, cid) => {
    const remove_result = await removePost(cid);
    return remove_result;
  });

  // repost
  const repost = async cid => {
    logger.info("[Identity] repost()");
    if (!self.posts.includes(cid)) {
      self.posts.unshift(cid);
      await save();
    }
  };
  ipcMain.on("repost", async (event, postCid) => {
    await repost(postCid);
    event.sender.send();
  });
  ipcMain.handle("repost", async (event, postCid) => {
    // console.log(event);
    const result = await repost(postCid);
    return result;
  });
  //

  await init();
};
