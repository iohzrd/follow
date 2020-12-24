const { ipcMain } = require("electron");
const IpfsHttpClient = require("ipfs-http-client");
const all = require("it-all");
const http = require("http");
const path = require("path");
const fs = require("fs-extra");
const granax = require("granax");
const tr = require("tor-request");
const Knex = require("knex");
const knexConfig = require("./db/knexfile");
const knexMigrate = require("knex-migrate");
const { Model } = require("objection");
const Hiddenservice = require("./db/models/Hiddenservice");
const Identity = require("./db/models/Identity");
// const Pin = require("./db/models/Pin");
// const Meta = require("./db/models/Meta");
const Post = require("./db/models/Post");
const logger = require("../common/logger");

const IDENTITY_TEMPLATE = {
  aux: [],
  av: "",
  dn: "",
  following: [],
  hs: "",
  meta: [],
  posts: [],
  publisher: "",
  ts: 0
};

module.exports = async function(ctx) {
  logger.info(`[identity] starting: ${ctx}`);
  let ipfs = null;
  let ipfs_id = null;
  let self = null;
  let tor = null;
  let hiddenservice = {};

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

    // Initialize knex and give the instance to objection.
    const knex_config = knexConfig(ipfs_id.id);
    const knex = await Knex(knex_config);
    Model.knex(knex);
    await knexMigrate(
      "up",
      {
        config: knex_config,
        migrations: path.resolve("./src-electron/identity/db/migrations")
      },
      logger.info
    );

    if (await Identity.query().findOne("publisher", ipfs_id.id)) {
      self = await Identity.query().findOne("publisher", ipfs_id.id);
    } else {
      // first run, initialize new identity...
      self = IDENTITY_TEMPLATE;
      self.following = [ipfs_id.id];
      await saveIdentity();
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

    let hs_query = await Hiddenservice.query().findById(1);
    if (hs_query) {
      hiddenservice = hs_query;
    }

    const tor_hs = await tor.createHiddenServicePromise(
      `127.0.0.1:${server.address().port}`,
      hiddenservice
    );
    logger.info("serving identity via tor hidden service:");
    console.log(tor_hs);

    if (self && tor_hs && tor_hs.serviceId) {
      console.log("self && data && data.serviceId");
      self.hs = tor_hs.serviceId;
    }

    if (!hs_query) {
      if (tor_hs && tor_hs.privateKey && tor_hs.serviceId) {
        const pk = tor_hs.privateKey.split(":");
        hiddenservice = {
          keyType: pk[0],
          keyBlob: pk[1],
          serviceId: tor_hs.serviceId
        };
        const hs = await Hiddenservice.query().insert(hiddenservice);
        console.log("Tor hidden service created:", hs);
      }
    }

    publish();
  };

  // get id
  ipcMain.on("get-ipfs_id", async event => {
    if (!ipfs_id) {
      ipfs_id = await ipfs.id();
    }
    event.sender.send("ipfs_id", ipfs_id);
  });
  ipcMain.handle("get-ipfs_id", async () => {
    if (!ipfs_id) {
      ipfs_id = await ipfs.id();
    }
    return ipfs_id;
  });

  const saveIdentity = async () => {
    logger.info("saving identity...");
    self.publisher = ipfs_id.id;
    self.hs = hiddenservice.serviceId || "";
    self.ts = Math.floor(new Date().getTime());
    if (await Identity.query().findOne("publisher", ipfs_id.id)) {
      console.log(`${ipfs_id.id} found`);
      await Identity.query()
        .findOne("publisher", ipfs_id.id)
        .patch(self);
    } else {
      console.log(`${ipfs_id.id} not found`);
      console.log(self);
      await Identity.query().insert(self);
    }
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
      pin: false,
      wrapWithDirectory: true,
      timeout: 10000
    };
    const publish_object = await ipfs.add(obj, add_options);
    // await pinIdentity(ipfs_id.id, publish_object.cid.string);
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

  const pinIdentity = async (publisher, cid) => {
    if (typeof cid === "string" && cid.includes("/ipfs/")) {
      cid = cid.replace("/ipfs/", "");
    }
    logger.info(`[Identity] pinIdentity(${publisher}, ${cid})`);
    let db_pins = await pin_db.get(publisher);
    let ipfs_pins = await all(ipfs.pin.ls());
    if (ipfs_pins.some(pin => pin.cid.string === cid)) {
      console.log(`${cid} already pinned, skipping...`);
      if (!db_pins.some(pin => pin === cid)) {
        db_pins.push(cid);
        await pin_db.put(publisher, db_pins);
      }
    } else {
      for await (const pin of db_pins) {
        logger.info(`unpinning old identity CIDs: ${pin}`);
        try {
          await ipfs.pin.rm(pin);
        } catch (error) {
          logger.info("failed to unpin from pin_db");
          console.log(error);
        }
      }
      db_pins = [];
      logger.info(`pinning new identity CID: ${cid}`);
      try {
        const pin_result = await ipfs.pin.add(cid);
        db_pins.push(pin_result.string);
        await pin_db.put(publisher, db_pins);
        return pin_result;
      } catch (error) {
        logger.info(`failed to pin CID: ${cid}`);
        console.log(error);
      }
    }
  };

  const getIdentityIpfs = async publisher => {
    logger.info(`[Identity] getIdentityIpfs(${publisher})`);
    const identity_root_cid = await all(ipfs.name.resolve(publisher));
    const identity_json_cid = `${identity_root_cid[0]}/identity.json`;
    // await pinIdentity(publisher, identity_root_cid[0]);
    const identity_json = Buffer.concat(await all(ipfs.cat(identity_json_cid)));
    return JSON.parse(identity_json);
  };

  const getIdentityTor = async publisher => {
    logger.info(`[Identity] getIdentityTor(${publisher})`);
    let identity_json, identity_object;
    if (await Identity.query().findOne("publisher", publisher)) {
      identity_object = await Identity.query().findOne("publisher", publisher);
    }
    if (identity_object.hs) {
      const tor_url = `http://${identity_object.hs}.onion/identity.json`;
      identity_json = await torRequestPromise(tor_url);
    }
    return JSON.parse(identity_json);
  };

  const getIdentity = async publisher => {
    logger.info(`getIdentity(${publisher})`);
    let identity_object;
    if (await Identity.query().findOne("publisher", publisher)) {
      logger.info("loading identity from DB...");
      identity_object = await Identity.query().findOne("publisher", publisher);
    } else {
      logger.info(
        "inserting blank identity into DB. We'll grab the real one when we can..."
      );
      identity_object = IDENTITY_TEMPLATE;
      identity_object.following = [publisher];
      identity_object.publisher = publisher;
      identity_object.ts = Math.floor(new Date().getTime());
      if (publisher !== ipfs_id.id) {
        await Identity.query().insert(identity_object);
      }
    }
    // console.log(identity_object);
    return identity_object;
  };
  ipcMain.on("get-identity", async (event, publisher) => {
    console.log(`on get-identity(${publisher})`);
    const identity_object = await getIdentity(publisher);
    console.log(identity_object);
    event.sender.send("identity", identity_object);
  });
  ipcMain.handle("get-identity", async (event, publisher) => {
    console.log(`handle get-identity(${publisher})`);
    const identity_object = await getIdentity(publisher);
    console.log(identity_object);
    return identity_object;
  });
  ipcMain.on("get-identities", async event => {
    console.log(`on get-identities`);
    const identities = await Identity.query();
    const identities_obj = {};
    identities.forEach(identity => {
      identities_obj[identity.publisher] = identity;
    });
    event.sender.send("identity", identities_obj);
  });
  ipcMain.handle("get-identities", async event => {
    console.log(`handle get-identities ${event}`);
    const identities = await Identity.query();
    const identities_obj = {};
    identities.forEach(identity => {
      identities_obj[identity.publisher] = identity;
    });
    return identities_obj;
  });

  // edit identity field
  const editIdentityField = async (event, kv) => {
    logger.info("[Identity] editIdentityField()");
    console.log(kv);
    const key = kv.key;
    const value = kv.value;
    if (typeof self[key] === typeof value) {
      self[key] = value;
      await saveIdentity();
    }
  };
  ipcMain.on("edit-identity-field", editIdentityField);

  // update followed identities
  const updateFollowing = async () => {
    logger.info("updateFollowing()");
    for await (const publisher of self.following) {
      let identity_object = null;
      if (publisher !== ipfs_id.id) {
        // try retreiving identity from tor
        identity_object = await getIdentityIpfs(publisher).catch(() => {
          logger.info("failed to fetch identity from ipfs");
        });
        // if tor fails, try retreiving identity from IPFS
        if (!identity_object) {
          identity_object = await getIdentityTor(publisher).catch(() => {
            logger.info(`failed to fetch identity from tor: ${publisher}`);
          });
        }
        // if retreived, save it...
        if (identity_object) {
          logger.info("Identity retreived, saving DB...");
          if ("id" in identity_object) {
            delete identity_object.id;
          }
          if (
            !identity_object.publisher ||
            identity_object.publisher != publisher
          ) {
            identity_object.publisher = publisher;
          }
          if (await Identity.query().findOne("publisher", publisher)) {
            await Identity.query()
              .findOne("publisher", publisher)
              .patch(identity_object);
          } else {
            await Identity.query().insert(identity_object);
          }
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

  const followId = async publisher => {
    logger.info("[Identity] followId()");
    if (!self.following.includes(publisher)) {
      self.following.push(publisher);
      await saveIdentity();
    }
  };
  ipcMain.on("follow", async (event, publisher) => {
    await followId(publisher);
  });

  const unfollowId = async (publisher, purge) => {
    logger.info(`[Identity] unfollowId(${publisher}, ${purge})`);
    if (self.following.includes(publisher)) {
      // remove id from following
      const id_index = self.following.indexOf(publisher);
      if (id_index > -1) {
        self.following.splice(id_index, 1);
      }
      // remove identity pins
      let pins = await pin_db.get(publisher);
      for await (const pin of pins) {
        logger.info("unpinning old identity CID");
        try {
          await ipfs.pin.rm(pin);
        } catch (error) {
          logger.info("failed to remove some pins from pin_dv");
          console.log(error);
        }
      }
      await pin_db.del(publisher);
      // remove post pins
      let posts_deep = await post_db.get(publisher);
      for (const postCid in posts_deep) {
        try {
          ipfs.pin.rm(postCid);
        } catch (error) {
          logger.info("failed to remove some pins from post_db");
          console.log(error);
        }
      }
      // remove posts from feed
      await Identity.query()
        .delete()
        .where("publisher", publisher);
      await Post.query()
        .delete()
        .where("publisher", publisher);
      // save
      await saveIdentity();
    }
  };
  ipcMain.on("unfollow", async (event, publisher, purge) => {
    await unfollowId(publisher, purge);
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
    let post_object = await Post.query().findOne("postCid", cid);
    if (post_object) {
      logger.info("post loaded from DB...");
    } else {
      logger.info("post not found in DB, loading from IPFS...");
      post_object = await getPostIpfs(cid);
      if (!post_object.aux) {
        post_object.aux = [];
      }
      if ("dn" in post_object) {
        delete post_object.dn;
      }
      if (!post_object.postCid) {
        post_object.postCid = cid;
      }
      if (!post_object.publisher) {
        post_object.publisher = identity_object.publisher;
      }
      console.log("post_object");
      console.log(post_object);
      await Post.query().insert(post_object);
    }

    return post_object;
  };

  // get a particular post from a particular id
  ipcMain.on("get-post", async (event, publisher, postCid) => {
    const post_object = await Post.query()
      .where("publisher", publisher)
      .findOne("postCid", postCid);
    event.sender.send("post", post_object);
  });
  ipcMain.handle("get-post", async (event, publisher, postCid) => {
    let post = await Post.query()
      .where("publisher", publisher)
      .findOne("postCid", postCid);
    return post;
  });

  // get posts for a particular id
  ipcMain.on("get-posts", async (event, publisher) => {
    const posts = await Post.query()
      .where("publisher", publisher)
      .orderBy("ts", "desc");

    posts.forEach(post_object => {
      event.sender.send("post", post_object);
    });
  });
  ipcMain.handle("get-posts", async (event, publisher) => {
    let posts = await Post.query()
      .where("publisher", publisher)
      .orderBy("ts", "desc");
    return posts;
  });

  // get paged posts for a particular id
  ipcMain.on("get-posts-page", async (event, publisher, index, count) => {
    const posts = await Post.query()
      .where("publisher", publisher)
      .orderBy("ts", "desc")
      .page(index, count);
    event.sender.send("posts", posts);
  });
  ipcMain.handle("get-posts-page", async (event, publisher, index, count) => {
    let posts = await Post.query()
      .where("publisher", publisher)
      .orderBy("ts", "desc")
      .page(index, count);
    return posts;
  });

  // get feed page
  ipcMain.handle("get-feed-page", async (event, index, count) => {
    let posts = await Post.query()
      .orderBy("ts", "desc")
      .page(index, count);
    return posts;
  });

  // update feed
  const updateFeed = async () => {
    logger.info("updateFeed()");
    for await (const fid of self.following) {
      const identity_object = await getIdentity(fid);
      for await (const postCid of identity_object.posts) {
        console.log("postCid");
        console.log(postCid);
        await getPost(identity_object, postCid);
      }
    }
  };
  ipcMain.on("update-feed", async event => {
    await updateFeed();
    event.sender.send("update-feed-complete");
  });
  ipcMain.handle("update-feed", async () => {
    await updateFeed();
    return "update-feed-complete";
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
      aux: [],
      body: body,
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
      saveIdentity();
    }
    if (!post_object.postCid) {
      post_object.postCid = cid;
    }
    // ctx.mainWindow.webContents.send("feedItem", post_object);
    await Post.query().insert(post_object);

    return add_result;
  };
  ipcMain.on("add-post", async (event, post_object) => {
    const add_result = await addPost(post_object);
    const post = await Post.query().findOne("postCid", add_result.cid.string);
    event.sender.send("add-post-complete", post);
  });
  ipcMain.handle("add-post", async (event, post_object) => {
    const add_result = await addPost(post_object);
    const post = await Post.query().findOne("postCid", add_result.cid.string);
    return post;
  });

  // remove post
  const removePost = async cid => {
    logger.info("[Identity] removePost()");
    const post_index = self.posts.indexOf(cid);
    if (post_index > -1) {
      self.posts.splice(post_index, 1);
    }

    await Post.query()
      .delete()
      .where("postCid", cid);
    saveIdentity();
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
      await saveIdentity();
    }
  };
  ipcMain.on("repost", async (event, postCid) => {
    await repost(postCid);
    event.sender.send();
  });
  ipcMain.handle("repost", async (event, postCid) => {
    const result = await repost(postCid);
    return result;
  });
  //

  await init();
};
