<template>
  <div v-if="post">
    <q-card flat bordered class="my-card">
      <q-card-section>
        <div class="row items-center no-wrap">
          <q-avatar>
            <img v-if="av" :src="av" />
            <q-icon v-if="!av" :size="'xl'" :name="'assignment_ind'" />
          </q-avatar>
          <q-card-section />
          <div class="col">
            <div class="text-subtitle1">
              <router-link
                :identity="post.identity"
                :to="{ name: 'post' }"
                :post="post"
              >
                {{ dt }}
              </router-link>
            </div>
            <div class="text-subtitle1">
              <router-link
                :identity="post.identity"
                :to="{ name: 'Identity', params: { identity: post.identity } }"
              >
                {{ post.identity.dn || post.identity.id }}
              </router-link>
            </div>
          </div>

          <div class="col-auto">
            <q-btn color="grey-7" round flat icon="more_vert">
              <q-menu cover auto-close>
                <q-list>
                  <q-item clickable>
                    <q-item-section>Remove Card</q-item-section>
                  </q-item>
                  <q-item clickable>
                    <q-item-section>Send Feedback</q-item-section>
                  </q-item>
                  <q-item clickable>
                    <q-item-section>Share</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
        </div>
      </q-card-section>

      <q-card-section>
        {{ body }}
      </q-card-section>

      <q-card-section v-if="files.length && cid">
        <div :id="cid" class="media-contrainer" />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="files.length"
          flat
          color="primary"
          label="view files"
          class="get-content-button"
          @click="getContent(cid)"
        >
        </q-btn>
      </q-card-actions>
    </q-card>
  </div>
</template>
<script>
const IpfsHttpClient = require("ipfs-http-client");
const all = require("it-all");
const render = require("render-media");
const from2 = require("from2");

export default {
  name: "PostCard",
  props: {
    post: {
      type: Object,
      required: true
    }
  },
  data: function() {
    return {
      av: "",
      body: "",
      cid: "",
      dn: "",
      dt: "",
      files: [],
      id: "",
      identity: {},
      magnet: "",
      meta: [],
      ts: ""
    };
  },
  mounted: function() {
    this.getPost();
  },
  methods: {
    async getPost() {
      console.log(this.post);
      console.log(this.post.identity);
      this.identity = this.post.identity;

      this.av = this.post.identity.av;
      this.dn = this.post.identity.dn;
      this.id = this.post.identity.id;

      this.body = this.post.body;
      this.files = this.post.files;
      this.cid = this.post.cid;
      this.dt = new Date(Number(this.post.ts));
      this.magnet = this.post.magnet;
      this.meta = this.post.meta;
      this.ts = this.post.ts;
      // if (this.cid) {
      //   await this.getContent(this.cid);
      // }
    },
    async getContent(cid) {
      const ipfs = await IpfsHttpClient({
        host: "localhost",
        port: "5001",
        protocol: "http"
      });
      var files = await all(ipfs.ls(cid));
      for await (const file of files) {
        var buf = Buffer.concat(await all(ipfs.cat(file.path)));
        var f = {
          name: file.name,
          createReadStream: function() {
            return from2([buf]);
          }
        };

        render.append(f, `#${cid}`, function(err, elem) {
          if (err) return console.error(err.message);
          console.log(elem); // this is the newly created element with the media in it
        });
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
