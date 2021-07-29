const { ipcMain } = require("electron");
const { create } = require("ipfs-http-client");
const all = require("it-all");
const http = require("http");
const path = require("path");
const fs = require("fs-extra");
const granax = require("@iohzrd/granax");
const tr = require("tor-request");
const Knex = require("knex");
const knexConfig = require("./db/knexfile");
const knexMigrate = require("knex-migrate");
const { Model } = require("objection");
const Comment = require("./db/models/Comment");
const Hiddenservice = require("./db/models/Hiddenservice");
const Identity = require("./db/models/Identity");
const Pin = require("./db/models/Pin");
const Post = require("./db/models/Post");
// const Meta = require("./db/models/Meta");
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
  ts: 0,
};

module.exports = async function (ctx) {
  logger.info(`[identity] starting: ${ctx}`);
  let ipfs = null;
  let ipfs_id = null;
  let self = null;
  let tor_enabled = false;
  let tor = null;
  let hiddenservice = {};

  const torRequestPromise = (onion) => {
    return new Promise((resolve, reject) => {
      tr.request(onion, function (err, res, body) {
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
    ipfs = create({
      host: "localhost",
      port: "5001",
      protocol: "http",
    });
    ctx.ipfs = ipfs;
    ipfs_id = await ipfs.id();

    // Initialize knex and give the instance to objection.
    const knex_config = knexConfig(ipfs_id.id);
    const knex = await Knex(knex_config);
    Model.knex(knex);
    await knexMigrate(
      "up",
      {
        config: knex_config,
        migrations: path.resolve(
          __dirname,
          process.env.QUASAR_PUBLIC_FOLDER,
          "migrations"
        ),
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

    if (tor_enabled) {
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
      ctx.tor = tor;

      let hs_query = await Hiddenservice.query().findById(1);
      if (hs_query) {
        hiddenservice = hs_query;
      }

      const tor_hs = await tor.createHiddenServicePromise(
        `127.0.0.1:${server.address().port}`,
        hiddenservice
      );
      logger.info("serving identity via tor hidden service:");
      logger.info(tor_hs);

      if (self && tor_hs && tor_hs.serviceId) {
        logger.info("self && data && data.serviceId");
        self.hs = tor_hs.serviceId;
        ctx.tor_hs = tor_hs;
      }

      if (!hs_query) {
        if (tor_hs && tor_hs.privateKey && tor_hs.serviceId) {
          const pk = tor_hs.privateKey.split(":");
          hiddenservice = {
            keyType: pk[0],
            keyBlob: pk[1],
            serviceId: tor_hs.serviceId,
          };
          const hs = await Hiddenservice.query().insert(hiddenservice);
          logger.info("Tor hidden service created:", hs);
        }
      }
    }

    await ipfs.pubsub.subscribe(ipfs_id.id, handlePubsubUnsolicited);
    publish();
  };

  const handlePubsubUnsolicited = async (rawMsg) => {
    logger.info(`handlePubsubUnsolicited(${rawMsg})`);
    let blacklist = [];
    // TODO real blacklist...
    if (!blacklist.includes(rawMsg.from)) {
      if (rawMsg.from != ipfs_id.id) {
        // parse message...
        let obj;
        try {
          const data = new TextDecoder("utf-8").decode(rawMsg.data);
          obj = JSON.parse(data);
        } catch (error) {
          logger.info(`[Identity] error in handlePubsubUnsolicited(${rawMsg})`);
          logger.info(error);
        }
        // handle message...
        if (typeof obj === "object") {
          if (obj.type === "place-holder") {
            obj.from = rawMsg.from;
          } else if (obj.type === "get-comments-request") {
            if (typeof obj.topic === "string" && obj.ts && obj.count) {
              const comments = getCommentsOlderThan(
                ipfs_id.id,
                obj.topic,
                obj.ts,
                obj.count
              );
              const response = {
                type: "get-comments-response",
                topic: obj.topic,
                comments: comments,
              };
              ipfs.pubsub.publish(ipfs_id.id, JSON.stringify(response));
            }
            //
          } else if (obj.type === "get-comments-response") {
            ipcMain.emit();
            // store in DB
            //
          } else if (obj.type === "post-comment-request") {
            //
          } else if (obj.type === "post-comment-response") {
            // ACK
            // NAK
          }
        }
      }
    }
  };

  const pubsubSendReceive = (publisher, msg) => {
    return new Promise((resolve) => {
      ipfs.pubsub.subscribe(publisher, (resp) => {
        // TODO more filtering...
        if (resp.from == publisher) {
          resolve(resp);
        }
      });
      ipfs.pubsub.publish(publisher, msg);
    });
  };

  // add comment
  const addComment = async (publisher, postCid, content, inReplyTo) => {
    logger.info("addComment()");
    try {
      const obj = {
        acknowledged: false,
        content: content,
        inReplyTo: inReplyTo,
        topic: postCid,
        ts: Math.floor(new Date().getTime()),
        type: "comment",
      };
      // const ret = await ipfs.add(JSON.stringify(obj), { timeout: 60 * 1000 });
      // obj.cid = String(ret.cid);
      obj.cid = "";
      if (publisher != ipfs_id.id) {
        // ipfs.pubsub.publish(publisher, JSON.stringify(obj));
        await pubsubSendReceive(publisher, JSON.stringify(obj));
      } else {
        obj.from = ipfs_id.id;
        obj.acknowledged = true;
        await Comment.query().insert(obj);
      }
      return obj;
    } catch (error) {
      logger.info(`[Identity] error in addComment()`);
      logger.info(error);
    }
  };
  ipcMain.on(
    "add-comment",
    async (event, publisher, postCid, content, inReplyTo) => {
      const comment = await addComment(publisher, postCid, content, inReplyTo);
      event.sender.send("comment", comment);
    }
  );
  ipcMain.handle(
    "add-comment",
    async (event, publisher, postCid, content, inReplyTo) => {
      const comment = await addComment(publisher, postCid, content, inReplyTo);
      return comment;
    }
  );

  // get comments newer than
  const getCommentsNewerThan = async (publisher, postCid, ts) => {
    logger.info("getCommentsNewerThan");
    if (publisher != ipfs_id.id) {
      const comments = await pubsubSendReceive(
        publisher,
        JSON.stringify({
          topic: postCid,
          ts: ts,
          type: "comments-newer-than-request",
        })
      );
      return comments;
    } else {
      const comments = await Comment.query()
        .where("topic", postCid)
        .where("ts", ">", ts)
        .orderBy("ts", "asc");
      return comments;
    }
  };
  ipcMain.on(
    "get-comments-newer-than",
    async (event, publisher, postCid, ts) => {
      const comments = await getCommentsNewerThan(publisher, postCid, ts);
      event.sender.send("comments-newer-than", comments);
    }
  );
  ipcMain.handle(
    "get-comments-newer-than",
    async (event, publisher, postCid, ts) => {
      const comments = await getCommentsNewerThan(publisher, postCid, ts);
      return comments;
    }
  );

  // // get comments Newest
  // const getCommentsNewest = async (publisher, postCid, ts, count) => {
  //   logger.info("getCommentsNewest");
  //   if (publisher != ipfs_id.id) {
  //     const comments = await pubsubSendReceive(
  //       publisher,
  //       JSON.stringify({
  //         count: count,
  //         topic: postCid,
  //         olderThan: ts,
  //         type: "comment-request",
  //       })
  //     );
  //     return comments;
  //   } else {
  //     const comments = await Comment.query()
  //       .where("topic", postCid)
  //       .max("ts")
  //       .limit(count)
  //       .orderBy("ts", "desc");
  //     logger.info(comments);
  //     return comments;
  //   }
  // };
  ipcMain.on(
    "get-comments-newest",
    async (event, publisher, postCid, ts, count) => {
      logger.info("on.get-comments-newest");
      const comments = await getCommentsOlderThan(
        publisher,
        postCid,
        ts,
        count
      );
      event.sender.send("comments-newest", comments);
    }
  );
  ipcMain.handle(
    "get-comments-newest",
    async (event, publisher, postCid, ts, count) => {
      logger.info("handle.get-comments-newest");
      const comments = await getCommentsOlderThan(
        publisher,
        postCid,
        ts,
        count
      );
      return comments;
    }
  );

  // get comments older than
  const getCommentsOlderThan = async (publisher, postCid, ts, count) => {
    logger.info("getCommentsOlderThan");
    if (publisher != ipfs_id.id) {
      const comments = await pubsubSendReceive(
        publisher,
        JSON.stringify({
          count: count,
          topic: postCid,
          olderThan: ts,
          type: "comment-request",
        })
      );
      return comments;
    } else {
      const comments = await Comment.query()
        .where("topic", postCid)
        .where("ts", "<", ts)
        .limit(count)
        .orderBy("ts", "desc");
      logger.info(comments);
      return comments;
    }
  };
  ipcMain.on(
    "get-comments-older-than",
    async (event, publisher, postCid, ts, count) => {
      logger.info("on.get-comments-older-than");
      const comments = await getCommentsOlderThan(
        publisher,
        postCid,
        ts,
        count
      );
      event.sender.send("comments-older-than", comments);
    }
  );
  ipcMain.handle(
    "get-comments-older-than",
    async (event, publisher, postCid, ts, count) => {
      logger.info("handle.get-comments-older-than");
      const comments = await getCommentsOlderThan(
        publisher,
        postCid,
        ts,
        count
      );
      return comments;
    }
  );

  //
  ipcMain.on("subscribe-to-publisher", async (event, publisher) => {
    let topics = await ipfs.pubsub.ls();
    if (!topics.includes(publisher)) {
      await ipfs.pubsub.subscribe(publisher, handlePubsubUnsolicited);
      topics = await ipfs.pubsub.ls();
    }
    if (topics.includes(publisher)) {
      logger.info(`topic "${publisher}" subscribed`);
      event.sender.send("topic-subscribed");
    }
  });

  ipcMain.on("unsubscribe-from-publisher", async (event, publisher) => {
    let topics = await ipfs.pubsub.ls();
    if (topics.includes(publisher) && publisher != ipfs_id.id) {
      await ipfs.pubsub.unsubscribe(publisher);
      topics = await ipfs.pubsub.ls();
    }
    if (!topics.includes(publisher)) {
      logger.info(`topic "${publisher}" unsubscribed`);
      event.sender.send("topic-unsubscribed");
    }
  });

  // get id
  ipcMain.on("get-ipfs_id", async (event) => {
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
      logger.info(`${ipfs_id.id} found`);
      await Identity.query().findOne("publisher", ipfs_id.id).patch(self);
    } else {
      logger.info(`${ipfs_id.id} not found`);
      logger.info(JSON.stringify(self, null, 2));
      await Identity.query().insert(self);
    }
    await publish();
  };

  // publish identity
  const publish = async () => {
    logger.info("[Identity] publish()");
    try {
      logger.info(JSON.stringify(self, null, 2));
      const obj = {
        path: "identity.json",
        content: JSON.stringify(self),
      };
      const add_options = {
        pin: false,
        wrapWithDirectory: true,
        timeout: 60 * 1000,
      };
      const publish_object = await ipfs.add(obj, add_options);
      await pinIdentity(ipfs_id.id, String(publish_object.cid));
      const publish_result = await ipfs.name.publish(
        String(publish_object.cid),
        {
          lifetime: "24h",
        }
      );
      logger.info("publish complete");
      logger.info(publish_result);
      return publish_result;
    } catch (error) {
      logger.info(`[Identity] error in publish()`);
      logger.info(error);
      // hack to get around error in publish:
      // "ipfs publish can’t replace a newer value with an older value"
      self.ts = Math.floor(new Date().getTime());
    }
  };
  ipcMain.on("publish-identity", async (event) => {
    // const result = await saveIdentity();
    const result = await publish();
    event.sender.send("publish-identity-complete", result);
  });
  ipcMain.handle("publish-identity", async () => {
    // const result = await saveIdentity();
    const result = await publish();
    return result;
  });

  const pinCID = async (cid) => {
    try {
      logger.info(`[Identity] pinCID(${cid})`);
      const pin_result = await ipfs.pin.add(cid, { timeout: 60 * 1000 });
      logger.info("pin_result");
      logger.info(pin_result);
      return pin_result;
    } catch (error) {
      logger.info(`[Identity] error in pinCID(${cid})`);
      logger.info(error);
    }
  };

  const pinIdentity = async (publisher, cid) => {
    try {
      if (typeof cid === "string") {
        if (cid.includes("/ipfs/")) {
          cid = cid.replace("/ipfs/", "");
        }
        logger.info(`[Identity] pinIdentity(${publisher}, ${cid})`);
        let db_pins = await Pin.query().findOne("publisher", publisher);
        if (!db_pins) {
          db_pins = {};
          db_pins.pins = [];
          db_pins.publisher = publisher;
          await Pin.query().insert(db_pins);
        }

        let ipfs_pins = await all(ipfs.pin.ls());
        if (ipfs_pins.some((pin) => String(pin.cid) === cid)) {
          logger.info(`${cid} already pinned, skipping...`);
          if (!db_pins.pins.some((pin) => pin === cid)) {
            db_pins.pins.push(cid);
            await Pin.query().findOne("publisher", publisher).patch(db_pins);
          }
        } else {
          for await (const pin of db_pins.pins) {
            logger.info(`unpinning old identity CIDs: ${pin}`);
            try {
              await ipfs.pin.rm(pin);
            } catch (error) {
              logger.info("failed to unpin from pin_db");
              logger.info(error);
            }
          }
          db_pins.pins = [];
          logger.info(`pinning new identity CID: ${cid}`);
          try {
            const pin_result = await ipfs.pin.add(cid, { timeout: 60 * 1000 });
            db_pins.pins.push(pin_result.string);
            await Pin.query().findOne("publisher", publisher).patch(db_pins);
            return pin_result;
          } catch (error) {
            logger.info(`failed to pin CID: ${cid}`);
            logger.info(error);
          }
        }
      }
    } catch (error) {
      logger.info(`[Identity] error in pinIdentity(${cid})`);
      logger.info(error);
    }
  };

  const getIdentityIpfs = async (publisher) => {
    try {
      logger.info(`[Identity] getIdentityIpfs(${publisher})`);
      const identity_root_cid = await all(
        ipfs.name.resolve(publisher, { timeout: 60 * 1000 })
      );
      if (identity_root_cid) {
        const identity_json_cid = `${identity_root_cid[0]}/identity.json`;
        await pinIdentity(publisher, identity_root_cid[0]);
        const identity_json = Buffer.concat(
          await all(ipfs.cat(identity_json_cid, { timeout: 60 * 1000 }))
        );
        return JSON.parse(identity_json);
      }
    } catch (error) {
      logger.info(`[Identity] error in getIdentityIpfs(${publisher})`);
      logger.info(error);
    }
  };

  const getIdentityTor = async (publisher) => {
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

  const getIdentity = async (publisher) => {
    try {
      logger.info(`getIdentity(${publisher})`);
      let identity_object;
      if (await Identity.query().findOne("publisher", publisher)) {
        logger.info("loading identity from DB...");
        identity_object = await Identity.query().findOne(
          "publisher",
          publisher
        );
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
      // logger.info(identity_object);
      return identity_object;
    } catch (error) {
      logger.info(`[Identity] error in getIdentity(${publisher})`);
      logger.info(error);
    }
  };
  ipcMain.on("get-identity", async (event, publisher) => {
    logger.info(`on get-identity(${publisher})`);
    const identity_object = await getIdentity(publisher);
    logger.info(identity_object);
    event.sender.send("identity", identity_object);
  });
  ipcMain.handle("get-identity", async (event, publisher) => {
    logger.info(`handle get-identity(${publisher})`);
    const identity_object = await getIdentity(publisher);
    logger.info(identity_object);
    return identity_object;
  });
  ipcMain.on("get-identities", async (event) => {
    logger.info(`on get-identities`);
    const identities = await Identity.query();
    const identities_obj = {};
    identities.forEach((identity) => {
      identities_obj[identity.publisher] = identity;
    });
    event.sender.send("identities", identities_obj);
  });
  ipcMain.handle("get-identities", async (event) => {
    logger.info(`handle get-identities ${event}`);
    const identities = await Identity.query();
    const identities_obj = {};
    identities.forEach((identity) => {
      identities_obj[identity.publisher] = identity;
    });
    return identities_obj;
  });

  // edit identity field
  ipcMain.handle("edit-identity", async (event, array) => {
    logger.info("[Identity] editIdentity()");
    logger.info(array);
    array.forEach((kv) => {
      const key = kv.key;
      const value = kv.value;
      if (typeof self[key] === typeof value) {
        self[key] = value;
      }
    });
    await saveIdentity();
    return self;
  });

  // update followed identities
  const updateFollowing = async () => {
    logger.info("updateFollowing()");
    for await (const publisher of self.following) {
      let identity_object = null;
      if (publisher !== ipfs_id.id) {
        // if tor fails, try retreiving identity from IPFS
        identity_object = await getIdentityIpfs(publisher).catch(() => {
          logger.info("failed to fetch identity from ipfs");
        });
        // try retreiving identity from tor
        if (tor_enabled && !identity_object) {
          identity_object = await getIdentityTor(publisher).catch(() => {
            logger.info(`failed to fetch identity from tor: ${publisher}`);
          });
        }
        // if retreived, save it...
        if (identity_object) {
          logger.info("Identity retreived...");
          if ("id" in identity_object) {
            delete identity_object.id;
          }
          if (
            !identity_object.publisher ||
            identity_object.publisher != publisher
          ) {
            identity_object.publisher = publisher;
          }
          let db_io = await Identity.query().findOne("publisher", publisher);
          if (db_io) {
            if (db_io.ts != identity_object.ts) {
              logger.info(
                "Identity is different the one in the DB, saving DB..."
              );
              await Identity.query()
                .findOne("publisher", publisher)
                .patch(identity_object);
            } else {
              logger.info(
                "Identity is the same as the one in the DB, skipping..."
              );
            }
          } else {
            logger.info("Identity not in DB, saving DB...");
            await Identity.query().insert(identity_object);
          }
        }
      }
    }
  };
  ipcMain.on("update-following", async (event) => {
    const result = await updateFollowing();
    event.sender.send("update-following-complete", result);
  });
  ipcMain.handle("update-following", async () => {
    const result = await updateFollowing();
    return result;
  });

  const followId = async (publisher) => {
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
    try {
      if (self.following.includes(publisher)) {
        // remove id from following
        const id_index = self.following.indexOf(publisher);
        if (id_index > -1) {
          self.following.splice(id_index, 1);
        }
        // remove identity pins
        let db_pins = await Pin.query().findOne("publisher", publisher);
        for await (const pin of db_pins.pins) {
          logger.info(`unpinning identity CID: ${pin}`);
          try {
            // await ipfs.pin.rm(pin);
          } catch (error) {
            logger.info("failed to remove some pins from pin_db");
            logger.info(error);
          }
        }
        // remove post pins
        let posts = await Post.query().where("publisher", publisher);
        for (const post in posts) {
          try {
            logger.info(`unpinning post CID: ${post}`);
            // ipfs.pin.rm(post.postCid);
          } catch (error) {
            logger.info("failed to remove some pins from post_db");
            logger.info(error);
          }
        }
        // remove posts from feed
        try {
          await Identity.query().delete().where("publisher", publisher);
          await Pin.query().delete().where("publisher", publisher);
          await Post.query().delete().where("publisher", publisher);
        } catch (error) {
          logger.info(`[Identity] error in unfollowId(${publisher})`);
          logger.info(error);
        }
        // save
        await saveIdentity();
      }
    } catch (error) {
      logger.info(`[Identity] error in unfollowId(${publisher})`);
      logger.info(error);
    }
  };
  ipcMain.on("unfollow", async (event, publisher, purge) => {
    await unfollowId(publisher, purge);
  });

  const getPostIpfs = async (post_cid) => {
    try {
      logger.info("getPostIpfs");
      await pinCID(post_cid);
      let post_buffer;
      try {
        post_buffer = Buffer.concat(
          await all(ipfs.cat(`${post_cid}/post.json`, { timeout: 60 * 1000 }))
        );
      } catch (error) {
        post_buffer = Buffer.concat(
          await all(ipfs.cat(post_cid, { timeout: 60 * 1000 }))
        );
      }
      return JSON.parse(post_buffer);
    } catch (error) {
      logger.info(`[Identity] error in getPostIpfs(${post_cid})`);
      logger.info(error);
    }
  };

  const getPost = async (identity_object, cid) => {
    logger.info("getPost");
    let post_object = await Post.query().findOne("postCid", cid);
    if (post_object) {
      logger.info("post loaded from DB...");
    } else {
      logger.info("post not found in DB, loading from IPFS...");
      post_object = await getPostIpfs(cid);
      if (typeof post_object === "object") {
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
        logger.info("post_object");
        logger.info(post_object);
        await Post.query().insert(post_object);
        return post_object;
      }
    }
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

  // get all posts for a particular publisher
  ipcMain.on("get-posts", async (event, publisher) => {
    const posts = await Post.query()
      .where("publisher", publisher)
      .orderBy("ts", "desc");

    posts.forEach((post_object) => {
      event.sender.send("post", post_object);
    });
  });
  ipcMain.handle("get-posts", async (event, publisher) => {
    let posts = await Post.query()
      .where("publisher", publisher)
      .orderBy("ts", "desc");
    return posts;
  });

  // get posts newer than
  ipcMain.handle("get-posts-newer-than", async (event, publisher, ts) => {
    let posts = await Post.query()
      .where("publisher", publisher)
      .where("ts", ">", ts)
      .orderBy("ts", "asc");
    return posts;
  });

  // get posts older than
  ipcMain.handle(
    "get-posts-older-than",
    async (event, publisher, ts, count) => {
      let posts = await Post.query()
        .where("publisher", publisher)
        .where("ts", "<", ts)
        .limit(count)
        .orderBy("ts", "desc");
      return posts;
    }
  );

  // get feed items newer than
  ipcMain.handle("get-feed-newer-than", async (event, ts) => {
    let posts = await Post.query().where("ts", ">", ts).orderBy("ts", "asc");
    return posts;
  });

  // get feed items older than
  ipcMain.handle("get-feed-older-than", async (event, ts, count) => {
    let posts = await Post.query()
      .where("ts", "<", ts)
      .limit(count)
      .orderBy("ts", "desc");
    return posts;
  });

  // update feed
  const updateFeed = async () => {
    logger.info("updateFeed()");
    for await (const fid of self.following) {
      const identity_object = await getIdentity(fid);
      for await (const postCid of identity_object.posts) {
        logger.info("postCid");
        logger.info(postCid);
        try {
          await getPost(identity_object, postCid);
        } catch (error) {
          logger.info(`[Identity] error in updateFeed()`);
          logger.info(error);
        }
      }
    }
  };
  ipcMain.on("update-feed", async (event) => {
    await updateFeed();
    event.sender.send("update-feed-complete");
  });
  ipcMain.handle("update-feed", async () => {
    await updateFeed();
    return "update-feed-complete";
  });

  // add post
  const addPost = async (post) => {
    logger.info("[Identity] addPost()");
    try {
      const { body, files } = post;
      // logger.info(files);
      // logger.info(body);
      let filesRoot = "";
      let file_list = [];
      let file_names = [];

      let ts = Math.floor(new Date().getTime());
      if (files.length) {
        for await (const file of files) {
          const file_object = {
            path: file.name,
            type: file.type,
            size: file.size,
            content: await fs.readFile(file.path),
          };
          file_names.push(file.name);
          file_list.push(file_object);
        }

        logger.info(file_names);
        logger.info(file_list);
        const add_options = {
          pin: true,
          wrapWithDirectory: true,
          timeout: 60 * 1000,
        };
        const add_result = await ipfs.add(file_list, add_options);
        filesRoot = String(add_result.cid);
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
        ts: ts,
      };
      logger.info("post_object");
      logger.info(post_object);
      const index_html = await fs.readFile(
        path.resolve(
          __dirname,
          process.env.QUASAR_PUBLIC_FOLDER,
          "postStandalone.html"
        )
      );
      const obj = [
        {
          path: "post.json",
          content: JSON.stringify(post_object),
        },
        {
          path: "index.html",
          content: index_html,
        },
      ];
      const add_options = {
        // pin: true,
        wrapWithDirectory: true,
        timeout: 60 * 1000,
      };
      const add_result = await ipfs.add(obj, add_options);
      logger.info("addRet2");
      console.log(JSON.stringify(add_result));
      const cid = String(add_result.cid);
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
    } catch (error) {
      logger.info(`[Identity] error in addPost(${post})`);
      logger.info(error);
    }
  };
  ipcMain.on("add-post", async (event, post_object) => {
    const add_result = await addPost(post_object);
    const post = await Post.query().findOne("postCid", String(add_result.cid));
    event.sender.send("add-post-complete", post);
  });
  ipcMain.handle("add-post", async (event, post_object) => {
    const add_result = await addPost(post_object);
    const post = await Post.query().findOne("postCid", String(add_result.cid));
    return post;
  });

  // remove post
  const removePost = async (cid) => {
    logger.info("[Identity] removePost()");
    const post_index = self.posts.indexOf(cid);
    if (post_index > -1) {
      self.posts.splice(post_index, 1);
    }

    await Post.query().delete().where("postCid", cid);
    await saveIdentity();
    return cid;
  };
  ipcMain.on("remove-post", async (event, cid) => {
    await removePost(cid);
  });
  ipcMain.handle("remove-post", async (event, cid) => {
    const remove_result = await removePost(cid);
    return remove_result;
  });

  // repost
  const repost = async (cid) => {
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

  ////////////////////
  // main entry
  ////////////////////
  await init();
};
