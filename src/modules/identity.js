var remote = require("electron").remote;
const path = remote.require("path");
const APP_DATA_PATH = remote.app.getPath("appData");
var fs = remote.require("fs-extra");
const all = remote.require("it-all");
const IpfsHttpClient = remote.require("ipfs-http-client");
const globSource = remote.require("ipfs-http-client").globSource;

class Identity {
  serialize() {
    return {
      av: this.av,
      aux: this.aux,
      dn: this.dn,
      following: this.following,
      id: this.id,
      meta: this.meta,
      posts: this.posts,
      ts: Math.floor(new Date().getTime())
    };
  }

  constructor(id, self) {
    console.log(`Identity.constructor(${id})`);
    this.av = "";
    this.aux = {};
    this.dn = "";
    this.following = [id];
    this.id = id;
    this.meta = [];
    this.posts = [];
    this.ts = Math.floor(new Date().getTime());

    // private
    if (typeof self === "undefined") {
      self = false;
    }
    this.self = self;
    this.ipfs = IpfsHttpClient({
      host: "localhost",
      port: "5001",
      protocol: "http"
    });
    this.following_deep = [];
    this.meta_deep = [];
    this.posts_deep = [];
    this.feed = [];

    this.init();
  }

  async init() {
    console.log("init");
    // ensure 'follow' directory
    this.appDataPath = path.join(APP_DATA_PATH, "follow");
    console.log(this.appDataPath);
    if (!fs.existsSync(this.appDataPath)) {
      fs.mkdirSync(this.appDataPath);
    }
    // ensure 'follow' directory
    this.followDataPath = path.join(this.appDataPath, "data");
    if (!fs.existsSync(this.followDataPath)) {
      fs.mkdirSync(this.followDataPath);
    }
    // ensure identity directory
    this.identityPath = path.join(this.followDataPath, this.id);
    if (!fs.existsSync(this.identityPath)) {
      fs.mkdirSync(this.identityPath);
    }
    // ensure meta path
    this.identityMetaPath = path.join(this.identityPath, "meta");
    if (!fs.existsSync(this.identityMetaPath)) {
      fs.mkdirSync(this.identityMetaPath);
    }
    // ensure posts path
    this.identityPostsPath = path.join(this.identityPath, "posts");
    if (!fs.existsSync(this.identityPostsPath)) {
      fs.mkdirSync(this.identityPostsPath);
    }
    // ensure identity.json
    this.identityFilePath = path.join(this.identityPath, "identity.json");
    if (!fs.existsSync(this.identityFilePath)) {
      await this.save();
      if (!this.self) {
        await this.update();
      }
    }
    this.load();
    const _this = this;
    if (this.self) {
      // avoid fetching infinite identities
      await this.getFollowingDeep();
      console.log("registering setInterval for self");
      setInterval(async function() {
        console.log("refreshing feed...");
        await _this.getFollowingDeep();
      }, _this.following.length * 60 * 1000);
    } else {
      // get the latest from IPFS
      console.log("registering setInterval for other");
      setInterval(async function() {
        console.log("refreshing identity...");
        await _this.update();
      }, _this.following.length * 60 * 1000);
    }
  }

  load() {
    console.log("Identity.read()");
    const raw = fs.readFileSync(this.identityFilePath);
    const obj = JSON.parse(raw);
    for (var prop in obj) this[prop] = obj[prop];
    if (this.self === true) {
      this.publish();
    }
    return this;
  }

  async publish() {
    console.log("Identity.publish()");
    const globSourceOptions = {
      recursive: true
    };
    const addOptions = {
      pin: true,
      wrapWithDirectory: true,
      timeout: 10000
    };
    var pub = await all(
      this.ipfs.add(
        globSource(this.identityFilePath, globSourceOptions),
        addOptions
      )
    );
    const idObjRootCid = pub.slice(-1)[0].cid.string;
    return await this.ipfs.name.publish(idObjRootCid, { lifetime: "8760h" });
  }

  async save() {
    console.log("Identity.save()");
    await fs.writeFile(this.identityFilePath, JSON.stringify(this.serialize()));
    if (this.self) {
      await this.publish();
    }
  }

  async update() {
    if (!this.self) {
      console.log("Identity.update()");
      const idObj = await this.getIdentityIpfs(this.id);
      console.log(idObj);
      for (var prop in idObj) this[prop] = idObj[prop];
      this.save();
    }
  }

  async pinIdentityJson(identityFileCID) {
    console.log("Identity.pinIdentityJson()");
    return await this.ipfs.pin.add(`${identityFileCID}/identity.json`);
  }

  async pinIdentityObject(cid) {
    console.log(`Identity.pinIdentityObject(${cid})`);
    return await this.ipfs.pin.add(cid);
  }

  async getIdentityIpfs(id) {
    console.log(`Identity.getIdentityIpfs(${id})`);
    const identityFileCID = await all(this.ipfs.name.resolve(id));
    console.log("identityFileCID");
    console.log(identityFileCID);
    const cid = `${identityFileCID[0]}/identity.json`;
    const identityJson = Buffer.concat(await all(this.ipfs.cat(cid)));
    await fs.writeFile(this.identityFilePath, identityJson); // temp
    return JSON.parse(identityJson);
  }

  async getIdentityFile(path) {
    const identityRaw = await fs.readFile(path);
    return JSON.parse(identityRaw);
  }

  async getIdentity(id) {
    console.log(`getIdentity(${id})`);
    const identityFilePath = path.join(
      this.followDataPath,
      `${id}/identity.json`
    );
    let idObj = {};
    if (fs.existsSync(identityFilePath)) {
      console.log("loading identity from file...");
      idObj = await this.getIdentityFile(identityFilePath);
    } else {
      console.log("loading identity from ipfs...");
      idObj = await this.getIdentityIpfs(id);
    }
    return idObj;
  }

  async getFollowingDeep() {
    console.log("getFollowingDeep()");
    console.log("this.following");
    console.log(this.following);
    for await (const fid of this.following) {
      let idObj = this;
      if (!this.following_deep.some(o => o.id === fid)) {
        if (fid === this.id) {
          // idObj = this
        } else {
          idObj = new Identity(fid, false);
        }
        this.following_deep.push(idObj);
      } else {
        idObj = this.following_deep.find(o => o.id === fid);
      }
      // this.following_deep.sort((a, b) => (a.ts > b.ts ? -1 : 1))
      console.log(this.following_deep);

      await idObj.getPostsDeep();
      idObj.posts_deep.forEach(post => {
        // console.log('post')
        // console.log(post)
        if (!this.feed.some(id => id.ts === post.ts)) {
          console.log("about to push...");
          const files = post.files;

          files.forEach(p => {
            const idx = files.indexOf(p);
            files[idx] = path.join(this.identityPostsPath, p);
          });

          this.feed.push(post);
          this.feed.sort((a, b) => (a.ts > b.ts ? -1 : 1));
        }
      });
    }
  }

  async addToFollowing(id) {
    console.log("Identity.addToFollowing()");
    if (!this.following.includes(id)) {
      this.following.push(id);
      this.save();
    }
  }

  async getPostIpfs(cid) {
    console.log("getPostIpfs");
    const post = Buffer.concat(await all(this.ipfs.cat(cid)));
    console.log("post");
    console.log(post);
    const postPath = path.join(this.identityPostsPath, `${cid}.json`);
    await fs.writeFile(postPath, post);
    return JSON.parse(post);
  }

  async getPostFile(path) {
    console.log("getPostFile");
    console.log("path");
    console.log(path);
    const postRaw = await fs.readFile(path);
    console.log("postRaw");
    console.log(postRaw);
    return JSON.parse(postRaw);
  }

  async getPost(cid) {
    console.log("getPost");
    let post = {};
    const postObjPath = path.join(this.identityPostsPath, `${cid}.json`); // temp
    if (fs.existsSync(postObjPath)) {
      console.log("loading from file...");
      post = await this.getPostFile(postObjPath);
    } else {
      console.log("loading from ipfs...");
      post = await this.getPostIpfs(cid);
    }
    // Instantiate post here?
    return post;
  }

  async getPostsDeep() {
    console.log("getPostsDeep()");
    this.posts_deep = [];
    for await (const postCid of this.posts) {
      const postObj = await this.getPost(postCid);
      postObj.dt = new Date(Number(postObj.ts));
      postObj.postCid = postCid;
      postObj.identity = this;
      if (!this.posts_deep.some(post => post.postCid === postCid)) {
        this.posts_deep.push(postObj);
        this.posts_deep.sort((a, b) => (a.ts > b.ts ? -1 : 1));
      }
    }
  }

  async getPostList() {
    console.log("Identity.getPostList()");
    const feed = [];
    for await (const postCid of this.posts) {
      const postObj = await this.getPostIpfs(postCid);
      postObj.dn = this.dn;
      postObj.publisher = this.id;
      postObj.dt = new Date(Number(postObj.ts));
      feed.push(postObj);
    }
    feed.sort((a, b) => (a.ts > b.ts ? -1 : 1));

    return feed;
  }

  async addPost(files, body) {
    console.log("Identity.addPost()");
    console.log(files);
    console.log(body);
    const post = new Post(this, files, body, this.ipfs);
    const postCid = await post.ipfsAddFiles();
    this.posts.unshift(postCid);
    this.save();
    this.getFollowingDeep();
  }
}

class Post {
  serialize() {
    return {
      body: this.body,
      cid: this.cid,
      dn: this.dn,
      files: this.files,
      magnet: this.magnet,
      meta: this.meta,
      publisher: this.publisher,
      ts: this.ts
    };
  }

  constructor(identity, files, body, ipfs) {
    console.log(`Post.constructor(${identity}, ${files}, '${body}')`);
    // public
    this.body = body;
    this.cid = "";
    this.files = files;
    this.magnet = "";
    this.meta = [];
    this.publisher = identity.id;
    this.identity = identity;
    this.ts = Math.floor(new Date().getTime());
    this.ipfs = ipfs;
    this.init();
  }

  init() {
    this.appDataPath = path.join(APP_DATA_PATH, "follow");
    this.followDataPath = path.join(this.appDataPath, "data");
    this.identityPath = path.join(this.followDataPath, this.publisher);
    this.identityPostsPath = path.join(this.identityPath, "posts");
    this.postPath = path.join(this.identityPostsPath, this.ts.toString());
    this.postJsonPath = path.join(this.identityPostsPath, `${this.ts}.json`);
    // ensure post directory
    if (this.files.length) {
      if (!fs.existsSync(this.postPath)) {
        fs.mkdirSync(this.postPath);
      }
      // create local copies
      if (this.files.length) {
        this.files.forEach(element => {
          if (element.path) {
            const copyFilePath = path.join(this.postPath, element.name);
            fs.copyFileSync(element.path, copyFilePath);
          }
        });
      }
    }
  }

  async ipfsAddJson(postObj) {
    console.log(`Identity.ipfsAddPostJson(${path})`);
    const json = { path: "", content: Buffer.from(JSON.stringify(postObj)) };
    var addRet = await all(this.ipfs.add(json));
    return addRet.slice(-1)[0].cid.string;
  }

  async ipfsAddFiles() {
    console.log("Identity.ipfsAddRecursive()");
    let rootCid = "";
    const files = [];
    if (this.files.length) {
      const addRet = await all(
        this.ipfs.add(globSource(this.postPath, { recursive: true }))
      );
      addRet.forEach(element => {
        if (element.path !== this.ts) {
          files.push(element.path);
        }
      });
      rootCid = addRet.slice(-1)[0].cid.string;
    }
    this.cid = rootCid;
    this.files = files;
    const postObj = this.serialize();
    const cid = await this.ipfsAddJson(postObj);
    // cache post obj...
    const postJsonPath = path.join(this.identityPostsPath, `${cid}.json`);
    await fs.writeFile(postJsonPath, JSON.stringify(postObj));
    return cid;
  }
}

module.exports.Identity = Identity;
