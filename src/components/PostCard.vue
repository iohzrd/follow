<template>
  <div v-if="post">
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center no-wrap">
          <q-avatar>
            <img v-if="identity.av" :src="identity.av" />
            <q-icon v-if="!identity.av" :size="'xl'" :name="'assignment_ind'" />
          </q-avatar>
          <q-card-section />
          <div class="col">
            <div class="text-caption">
              Time:
              <router-link :to="{ name: 'Post', params: { post: post } }">{{
                dt
              }}</router-link>
            </div>
            <div class="text-caption">
              From:
              <router-link
                :publisher="identity.publisher"
                :to="{
                  name: 'Identity',
                  params: { publisher: identity.publisher },
                }"
                >{{ identity.dn || identity.publisher }}</router-link
              >
            </div>
          </div>
          <!--  -->
          <div class="col-auto">
            <q-btn
              v-if="files.length"
              color="primary"
              flat
              icon="preview"
              label="view files"
              @click="getContent(filesRoot)"
            />
          </div>
          <!--  -->
          <div class="col-auto">
            <q-btn color="grey-7" round flat icon="more_vert">
              <q-menu cover auto-close>
                <q-list>
                  <q-item v-if="identity.publisher == ipfs_id.id" clickable>
                    <q-item-section @click="removePost">
                      Delete post
                    </q-item-section>
                  </q-item>
                  <q-item v-if="identity.publisher != ipfs_id.id" clickable>
                    <q-item-section @click="showUnfollowPrompt(identity.id)">
                      Unfollow
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
          <!--  -->
        </div>
      </q-card-section>

      <q-card-section v-if="body">
        <div class="text-body1">
          {{ body.substring(0, 1024) }}
        </div>
      </q-card-section>

      <q-card-section v-if="filesRoot && fileObjs.length" class="q-pa-md">
        <div class="q-gutter-sm row items-start">
          <div v-for="(fileObj, idx) in fileObjs" :key="fileObj.name">
            <q-img
              v-if="fileObj.mime.includes('image')"
              :alt="fileObj.name"
              :src="fileObj.blobUrl"
              spinner-color="primary"
              spinner-size="82px"
              style="height: 125px; width: 125px"
              @click="
                slide = idx;
                carousel = true;
              "
            />
            <q-media-player
              v-else-if="fileObj.mime.includes('video')"
              :sources="[{ src: fileObj.blobUrl }]"
              type="video"
            >
            </q-media-player>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="q">
        <q-btn
          class="col"
          color="primary"
          flat
          icon="comment"
          label="Comment"
          :to="{ name: 'Post', params: { post: post } }"
        />
        <!--  -->
        <q-btn
          v-if="identity.publisher != ipfs_id.id"
          class="col"
          color="primary"
          flat
          icon="autorenew"
          label="Repost"
          @click="repost()"
        />
        <!--  -->
        <q-btn
          class="col"
          color="primary"
          flat
          icon="share"
          label="Share"
          @click="showPostLinkPrompt()"
        />
      </q-card-actions>
    </q-card>

    <!-- media modal -->
    <q-dialog v-model="carousel">
      <q-responsive style="height: 100%; width: 100%; max-width: 100%">
        <q-carousel v-model="slide" animated infinite swipeable thumbnails>
          <q-carousel-slide
            v-for="(fileObj, idx) in fileObjs"
            :key="fileObj.name"
            :name="idx"
            :img-src="fileObj.blobUrl"
            style="height: 100%; width: 100%"
          />
        </q-carousel>
      </q-responsive>
    </q-dialog>

    <!-- delete post confirmation modal -->
    <q-dialog v-model="removePostModal">
      <q-card>
        <q-card-section>
          <div class="text-h6">Are you sure?</div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="primary" />
          <q-btn
            v-close-popup
            flat
            label="Delete"
            color="primary"
            @click="removePost()"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!--  -->
  </div>
</template>
<script>
import { ipcRenderer } from "electron";
const { create } = require("ipfs-http-client");
const all = require("it-all");
const FileType = require("file-type");

export default {
  name: "PostCard",
  props: {
    post: {
      type: Object,
      required: true,
    },
  },
  data: function () {
    return {
      body: "",
      filesRoot: "",
      dt: "",
      files: [],
      fileObjs: [],
      carousel: false,
      slide: 0,
      ipfs_id: {},
      publisher: "",
      identity: {},
      magnet: "",
      meta: [],
      ts: "",
      removePostModal: false,
      shareLink: "",
    };
  },
  mounted: function () {
    console.log("PostCard init");
    this.publisher = this.post.publisher;
    if (this.$store.state.identities[this.publisher]) {
      console.log("already had it...");
      this.identity = this.$store.state.identities[this.publisher];
    } else {
      console.log("getting it...");
      ipcRenderer.invoke("get-identity", this.publisher).then((identity) => {
        this.$store.commit("setIdentity", identity);
        this.identity = identity;
      });
    }
    this.ipfs_id = this.$store.state.ipfs_id;
    this.init();
  },
  methods: {
    async init() {
      this.getPost();
      if (this.filesRoot) {
        await this.getContent(this.filesRoot);
      }
    },
    getPost() {
      this.body = this.post.body;
      this.files = this.post.files;
      this.filesRoot = this.post.filesRoot;
      this.dt = new Date(Number(this.post.ts)).toLocaleString();
      this.magnet = this.post.magnet;
      this.meta = this.post.meta;
      this.ts = this.post.ts;
      this.shareLink = "https://ipfs.io/ipfs/" + this.post.postCid;
    },
    removePost() {
      ipcRenderer.invoke("remove-post", this.post.postCid).then((result) => {
        console.log("remove-post.then");
        console.log(result);
      });
      this.$emit("remove-post", this.post.postCid);
    },
    repost() {
      ipcRenderer.invoke("repost", this.post.postCid).then((result) => {
        console.log("repost.then");
        console.log(result);
        ipcRenderer.send("get-feed");
      });
    },
    async getContent(filesRoot) {
      const ipfs = await create("/ip4/127.0.0.1/tcp/5001");
      const files = await all(ipfs.ls(filesRoot));
      for await (const file of files) {
        // var buf = Buffer.concat(await all(ipfs.cat(file.path)));
        let bufs = [];
        for await (const buf of ipfs.cat(file.path)) {
          bufs.push(buf);
        }
        const buf = Buffer.concat(bufs);
        const fType = await FileType.fromBuffer(buf);
        var blob = new Blob([buf], { type: fType.mime });
        var urlCreator = window.URL || window.webkitURL;
        var blobUrl = urlCreator.createObjectURL(blob);
        const fileObj = {
          ...file,
          ...fType,
          blobUrl,
        };
        this.fileObjs.push(fileObj);
      }
    },
    showUnfollowPrompt() {
      console.log(`PostCard: showUnfollowPrompt(${this.identity.publisher})`);
      this.$emit("show-unfollow-prompt", this.identity.publisher);
    },
    showPostLinkPrompt() {
      console.log(`PostCard: showPostLinkPrompt(${this.shareLink})`);
      this.$emit("show-link-prompt", this.shareLink);
    },
  },
};
</script>

<style scoped lang="scss">
.get-content-button {
  float: right;
}
:any-link {
  color: $primary;
}
.spinner {
  display: block;
  margin-left: auto;
  margin-right: auto;
}
</style>
