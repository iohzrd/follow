<template>
  <div v-if="post">
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center no-wrap">
          <q-avatar>
            <img v-if="post.identity.av" :src="post.identity.av" />
            <q-icon
              v-if="!post.identity.av"
              :size="'xl'"
              :name="'assignment_ind'"
            />
          </q-avatar>
          <q-card-section />
          <div class="col">
            <div class="text-subtitle1">
              Time:
              <router-link :to="{ name: 'Post', params: { post: post } }">{{
                dt
              }}</router-link>
            </div>
            <div class="text-subtitle1">
              From:
              <router-link
                :to="{
                  name: 'Identity',
                  params: { identity: post.identity, id: post.identity.id },
                }"
                >{{ post.identity.dn || post.identity.id }}</router-link
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
                  <q-item v-if="post.identity.id == id.id" clickable>
                    <q-item-section @click="deleteModal = true"
                      >Delete post</q-item-section
                    >
                  </q-item>
                  <q-item v-if="post.identity.id != id.id" clickable>
                    <q-item-section @click="unfollowModal = true"
                      >Unfollow</q-item-section
                    >
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
          <!--  -->
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
            />-->
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
        <!--  -->
        <div v-if="post.identity.id != id.id">
          <q-btn
            class="col"
            color="primary"
            flat
            icon="autorenew"
            label="Repost"
            @click="repost()"
          />
        </div>
        <!--  -->
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
            @click="removePost(post.identity.id)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- unfollow confirmation modal -->
    <q-dialog v-model="unfollowModal">
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
            @click="unfollow()"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!--  -->
  </div>
</template>
<script>
import { ipcRenderer } from "electron";
const IpfsHttpClient = require("ipfs-http-client");
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
      id: {},
      magnet: "",
      meta: [],
      ts: "",
      shareModal: false,
      deleteModal: false,
      unfollowModal: false,
      shareLink: "",
    };
  },
  mounted: function () {
    this.id = this.$store.state.id;
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
    async removePost() {
      // ipcRenderer.send("removePost", this.post.postCid);
      ipcRenderer.invoke("removePost", this.post.postCid).then((result) => {
        console.log("removePost.then");
        console.log(result);
        ipcRenderer.send("getFeed");
      });
    },
    async unfollow(id) {
      ipcRenderer.send("unfollow", id);
    },
    async repost() {
      // ipcRenderer.send("repost", this.post.postCid);
      ipcRenderer.invoke("repost", this.post.postCid).then((result) => {
        console.log("repost.then");
        console.log(result);
        ipcRenderer.send("getFeed");
      });
    },
    async getContent(filesRoot) {
      const ipfs = await IpfsHttpClient({
        host: "localhost",
        port: "5001",
        protocol: "http",
      });
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
</style>
