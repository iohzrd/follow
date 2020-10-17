const { app, ipcMain, ipcRenderer } = require("electron");
const IpfsHttpClient = require("ipfs-http-client");
const all = require("it-all");
const path = require("path");
const fs = require("fs-extra");
const levelup = require("levelup");
const leveldown = require("leveldown");
const encode = require("encoding-down");
const logger = require("../common/logger");

const IDENTITY_TEMPLATE = {
  aux: {},
  av: "",
  dn: "",
  following: [],
  id: "",
  meta: [],
  posts: [],
  ts: 0
};

module.exports = async function(ctx) {
  logger.info("[identity] starting");
  logger.info(ctx);
  let app_data_path = null;
  let follow_storage_path = null;
  let ipfs = null;
  let ipfs_id = null;
  let level_db = null;
  let self = null;

  const dbContainsKey = (db, key) => {
    return new Promise(resolve => {
      db.get(key, function(err) {
        if (err) resolve(false);
        resolve(true);
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
    follow_storage_path = path.join(app_data_path, "Follow Storage");
    if (!fs.existsSync(follow_storage_path)) {
      fs.mkdirSync(follow_storage_path);
    }

    // ensure db
    level_db = levelup(
      encode(leveldown(follow_storage_path), {
        valueEncoding: "json"
      })
    );

    if (await dbContainsKey(level_db, ipfs_id.id)) {
      await load();
    } else {
      // first run, initialize new identity...
      self = IDENTITY_TEMPLATE;
      self.following = [ipfs_id.id];
      self.id = ipfs_id.id;
      self.ts = Math.floor(new Date().getTime());
      await save();
    }
  };

  // get id
  ipcMain.on("getId", async event => {
    if (!ipfs_id) {
      ipfs_id = await ipfs.id();
    }
    event.sender.send("id", ipfs_id);
  });
  ipcMain.handle("getId", async event => {
    console.log(event);
    if (!ipfs_id) {
      ipfs_id = await ipfs.id();
    }
    return ipfs_id;
  });

  const load = async () => {
    logger.info("load");
    self = await level_db.get(ipfs_id.id);
  };

  const save = async () => {
    logger.info("save");
    await level_db.put(ipfs_id.id, self);
    await publish();
  };

  // publish identity
  const publish = async () => {
    logger.info("[Identity] publish()");
    const temp_self = self;
    delete temp_self.posts_deep;
    const obj = {
      path: "identity.json",
      content: JSON.stringify(temp_self)
    };
    const addOptions = {
      pin: true,
      wrapWithDirectory: true,
      timeout: 10000
    };
    const pubObj = await ipfs.add(obj, addOptions);
    const pubRet = await ipfs.name.publish(pubObj.cid.string, {
      lifetime: "8760h"
    });
    logger.info("publish complete");
    logger.info(pubRet);
    return pubRet;
  };
  ipcMain.on("publish", async event => {
    const result = await publish();
    event.sender.send("publish", result);
  });
  ipcMain.handle("publish", async () => {
    const result = await publish();
    return result;
  });

  // const pinCID = async cid => {
  //   logger.info(`[Identity] pinCID(${cid})`);
  //   const pinResult = await ipfs.pin.add(cid);
  //   // logger.info("pinResult");
  //   // logger.info(pinResult);
  //   return pinResult;
  // };

  const getIdentityIpfs = async id => {
    logger.info(`[Identity] getIdentityIpfs(${id})`);
    const identityFileCID = await all(ipfs.name.resolve(id));
    const cid = `${identityFileCID[0]}/identity.json`;
    // await pinCID(cid);
    const identityJson = Buffer.concat(await all(ipfs.cat(cid)));
    return JSON.parse(identityJson);
  };

  const getIdentity = async id => {
    logger.info(`getIdentity(${id})`);
    let identityObj;
    if (await dbContainsKey(level_db, id)) {
      logger.info("loading identity from DB...");
      identityObj = await level_db.get(id);
    } else {
      logger.info(
        "inserting blank identity into DB. We'll grab the real one when we can..."
      );
      identityObj = IDENTITY_TEMPLATE;
      identityObj.following = [id];
      identityObj.id = id;
      identityObj.ts = Math.floor(new Date().getTime());
      if (id !== ipfs_id.id) {
        await level_db.put(id, identityObj);
      }
    }
    logger.info(identityObj);
    console.log(identityObj);
    return identityObj;
  };
  ipcMain.on("getIdentity", async (event, id) => {
    const identityObj = await getIdentity(id);
    delete identityObj.posts_deep;
    event.sender.send("identity", identityObj);
  });
  ipcMain.handle("getIdentity", async (event, id) => {
    const identityObj = await getIdentity(id);
    delete identityObj.posts_deep;
    return identityObj;
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
  ipcMain.on("editIdentityField", editIdentityField);

  // update followed identities
  const updateFollowing = async () => {
    logger.info("updateFollowing()");
    const following_deep = [];
    for await (const id of self.following) {
      try {
        if (id !== ipfs_id.id) {
          const identityObj = await getIdentityIpfs(id);
          following_deep.push(identityObj);
          await level_db.put(id, identityObj);
        }
      } catch (error) {
        logger.info(`failed to fetch identity: ${id}`);
        logger.info(error);
      }
    }
  };
  ipcMain.on("updateFollowing", async event => {
    const result = await updateFollowing();
    event.sender.send("publish", result);
  });
  ipcMain.handle("updateFollowing", async () => {
    const result = await updateFollowing();
    return result;
  });

  const addToFollowing = async id => {
    logger.info("[Identity] addToFollowing()");
    if (!self.following.includes(id)) {
      self.following.push(id);
      await save();
    }
  };
  ipcMain.on("addToFollowing", async (event, id) => {
    await addToFollowing(id);
  });

  const getPostIpfs = async cid => {
    logger.info("getPostIpfs");
    // await pinCID(cid);
    let post;
    try {
      post = Buffer.concat(await all(ipfs.cat(`${cid}/post.json`)));
    } catch (error) {
      post = Buffer.concat(await all(ipfs.cat(cid)));
    }
    return JSON.parse(post);
  };

  const getPost = async (identityObj, cid) => {
    logger.info("getPost");
    let postObj;
    if (!identityObj.posts_deep) {
      identityObj.posts_deep = {};
    }
    if (identityObj.posts_deep && identityObj.posts_deep[cid]) {
      logger.info("loading post from DB...");
      postObj = identityObj.posts_deep[cid];
    } else {
      logger.info("loading post from IPFS...");
      postObj = await getPostIpfs(cid);
      identityObj.posts_deep[cid] = postObj;
      await level_db.put(identityObj.id, identityObj);
    }
    if (!postObj.publisher) {
      postObj.publisher = identityObj.id;
    }
    postObj.postCid = cid;
    postObj.identity = {};
    postObj.identity.av = identityObj.av;
    postObj.identity.dn = identityObj.dn;
    postObj.identity.id = identityObj.id;
    postObj.identity.ts = identityObj.ts;
    return postObj;
  };

  // get post
  ipcMain.on("getPost", async (event, id, postCid) => {
    const identityObj = await getIdentity(id);
    const postObj = await getPost(identityObj, postCid);
    event.sender.send("post", postObj);
  });

  // get posts
  ipcMain.on("getPosts", async (event, id) => {
    const identityObj = await getIdentity(id);
    for await (const postCid of identityObj.posts) {
      const postObj = await getPost(identityObj, postCid);
      event.sender.send("post", postObj);
    }
  });

  // get feed
  ipcMain.on("getFeed", async event => {
    for await (const fid of self.following) {
      const identityObj = await getIdentity(fid);
      for await (const postCid of identityObj.posts) {
        const postObj = await getPost(identityObj, postCid);
        event.sender.send("feedItem", postObj);
      }
    }
  });

  // get following deep
  ipcMain.on("getFollowing", async event => {
    for await (const fid of self.following) {
      const identityObj = await getIdentity(fid);
      delete identityObj.posts_deep;
      event.sender.send("followingIdentity", identityObj);
    }
  });

  // add post
  const addPost = async post => {
    logger.info("[Identity] addPost()");
    const { body, files } = post;
    console.log(files);
    console.log(body);
    let filesRoot = "";
    let addedFiles = [];
    let fileNames = [];

    let ts = Math.floor(new Date().getTime());
    if (files.length) {
      for await (const file of files) {
        const fileObj = {
          path: file.name,
          content: await fs.readFile(file.path)
        };
        fileNames.push(file.name);
        addedFiles.push(fileObj);
      }

      logger.info(fileNames);
      logger.info(addedFiles);
      const addOptions = {
        // pin: true,
        wrapWithDirectory: true,
        timeout: 10000
      };
      const addRet = await ipfs.add(addedFiles, addOptions);
      filesRoot = addRet.cid.string;
      logger.info("addRet1");
      logger.info(addRet);
    }

    const postObj = {
      body: body,
      dn: self.dn,
      files: fileNames,
      filesRoot: filesRoot,
      magnet: "",
      meta: [],
      publisher: ipfs_id.id,
      ts: ts
    };
    logger.info("postObj");
    logger.info(postObj);
    const indexHTML = await fs.readFile("src/pages/postStandalone.html");
    const obj = [
      {
        path: "post.json",
        content: JSON.stringify(postObj)
      },
      {
        path: "index.html",
        content: indexHTML
      }
    ];
    const addOptions = {
      // pin: true,
      wrapWithDirectory: true,
      timeout: 10000
    };
    const addRet = await ipfs.add(obj, addOptions);
    logger.info("addRet2");
    logger.info(addRet);
    const cid = addRet.cid.string;
    if (typeof cid === "string" && cid.length == 46) {
      self.posts.unshift(cid);
      save();
      // getFeed();
    }
    return addRet;
  };
  ipcMain.on("addPost", async (event, postObj) => {
    console.log(postObj);
    await addPost(postObj);
  });
  ipcMain.handle("addPost", async (event, postObj) => {
    console.log(postObj);
    const addRet = await addPost(postObj);
    return addRet;
  });

  // remove post
  const removePost = async cid => {
    logger.info("[Identity] removePost()");
    const postsIndex = self.posts.indexOf(cid);
    if (postsIndex > -1) {
      self.posts.splice(postsIndex, 1);
    }
    const identityObj = await getIdentity(ipfs_id.id);
    if (identityObj.posts_deep && identityObj.posts_deep[cid]) {
      delete identityObj.posts_deep[cid];
      await level_db.put(ipfs_id.id, identityObj);
    }
    save();
  };
  ipcMain.on("removePost", async (event, cid) => {
    await removePost(cid);
  });
  ipcMain.handle("removePost", async (event, cid) => {
    const remRet = await removePost(cid);
    return remRet;
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
    console.log(event);
    const result = await repost(postCid);
    return result;
  });
  //

  await init();
};
