<template>
  <div v-if="post">
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center no-wrap">
          <q-avatar>
            <img v-if="av" :src="av" />
            <q-icon v-if="!av" :size="'xl'" :name="'assignment_ind'" />
          </q-avatar>
          <q-card-section />
          <div class="col">
            <div class="text-subtitle1">
              Time:
              <router-link :to="{ name: 'Post', params: { post: post } }">
                {{ dt }}
              </router-link>
            </div>
            <div class="text-subtitle1">
              From:
              <router-link
                :identity="post.identity"
                :to="{ name: 'Identity', params: { identity: post.identity } }"
                >{{ post.identity.dn || post.identity.id }}</router-link
              >
            </div>
          </div>

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

          <div v-if="post.identity.id == identity.id">
            <div class="col-auto">
              <q-btn color="grey-7" round flat icon="more_vert">
                <q-menu cover auto-close>
                  <q-list>
                    <q-item clickable>
                      <q-item-section @click="deleteModal = true"
                        >Delete post</q-item-section
                      >
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-section v-if="body">{{ body }}</q-card-section>

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
            <!-- <q-video
              v-else-if="fileObj.mime.includes('video')"
              :autoplay="false"
              :src="fileObj.blobUrl"
              controls
              allowfullscreen
            /> -->
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
        />
        <div v-if="post.identity.id != identity.id">
          <q-btn
            class="col"
            color="primary"
            flat
            icon="autorenew"
            label="Repost"
            @click="repost()"
          />
        </div>
        <q-btn
          class="col"
          color="primary"
          flat
          icon="share"
          label="Share"
          @click="shareModal = true"
        />
      </q-card-actions>
    </q-card>

    <!-- media modal -->
    <q-dialog v-model="carousel">
      <q-responsive :ratio="16 / 9" style="width: 100%; max-width: 1000px;">
        <q-carousel v-model="slide" animated infinite swipeable thumbnails>
          <q-carousel-slide
            v-for="(fileObj, idx) in fileObjs"
            :key="fileObj.name"
            :name="idx"
            :img-src="fileObj.blobUrl"
          />
        </q-carousel>
      </q-responsive>
    </q-dialog>

    <!-- share link modal -->
    <q-dialog v-model="shareModal">
      <q-card>
        <q-card-section>
          <div class="text-h6">Link</div>
        </q-card-section>

        <q-card-section>{{ shareLink }}</q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="OK" color="primary" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- delete post confirmation modal -->
    <q-dialog v-model="deleteModal">
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
  </div>
</template>
<script>
// import { ipcRenderer } from "electron";
const IpfsHttpClient = require("ipfs-http-client");
const all = require("it-all");
const FileType = require("file-type");

export default {
  name: "PostCard",
  props: {
    identity: {
      type: Object,
      required: true
    },
    post: {
      type: Object,
      required: true
    },
    index: {
      type: Number,
      required: true
    }
  },
  data: function() {
    return {
      av: "",
      body: "",
      filesRoot: "",
      dn: "",
      dt: "",
      files: [],
      fileObjs: [],
      carousel: false,
      slide: 0,
      id: "",
      magnet: "",
      meta: [],
      ts: "",
      shareModal: false,
      deleteModal: false,
      shareLink: ""
    };
  },
  mounted: function() {
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
      console.log("this.post");
      console.log(this.post);
      console.log("this.post.identity");
      console.log(this.post.identity);

      this.av = this.post.identity.av;
      this.dn = this.post.identity.dn;
      this.id = this.post.identity.id;

      this.body = this.post.body;
      this.files = this.post.files;
      this.filesRoot = this.post.filesRoot;
      this.dt = new Date(Number(this.post.ts)).toLocaleString();
      this.magnet = this.post.magnet;
      this.meta = this.post.meta;
      this.ts = this.post.ts;

      this.shareLink = "https://ipfs.io/ipfs/" + this.post.postCid;
    },
    async removePost() {
      this.identity.removePost(this.post.postCid);
      // ipcRenderer.send("repost", this.post.postCid);
    },
    async repost() {
      this.identity.repost(this.post.postCid);
      // ipcRenderer.send("repost", this.post.postCid);
    },
    async getContent(filesRoot) {
      console.log("getContent");
      console.log("filesRoot");
      console.log(filesRoot);
      const ipfs = await IpfsHttpClient({
        host: "localhost",
        port: "5001",
        protocol: "http"
      });
      console.log(ipfs);
      const files = await all(ipfs.ls(filesRoot));
      for await (const file of files) {
        console.log("file");
        console.log(file);
        // var buf = Buffer.concat(await all(ipfs.cat(file.path)));
        let bufs = [];
        for await (const buf of ipfs.cat(file.path)) {
          bufs.push(buf);
        }
        const buf = Buffer.concat(bufs);
        console.log("buf");
        console.log(buf);
        const fType = await FileType.fromBuffer(buf);
        var blob = new Blob([buf], { type: fType.mime });
        var urlCreator = window.URL || window.webkitURL;
        var blobUrl = urlCreator.createObjectURL(blob);
        const fileObj = {
          ...file,
          ...fType,
          blobUrl
        };
        this.fileObjs.push(fileObj);
      }
    }
  }
};
</script>

<style scoped lang="scss">
.get-content-button {
  float: right;
}
:any-link {
  color: $primary;
}
</style>
