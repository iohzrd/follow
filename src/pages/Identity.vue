<template>
  <q-page v-if="identity">
    <q-card flat bordered>
      <!-- avatar -->
      <q-card-section>
        <div class="center">
          <q-img
            v-if="identity.av"
            :src="identity.av"
            @click="console.log('not yet implemented...')"
          />
          <q-icon
            v-else
            :size="'xl'"
            :name="'assignment_ind'"
            @click="console.log('not yet implemented...')"
          />
        </div>
      </q-card-section>
      <!--  -->
      <q-card-section>
        <!-- display name -->
        <div class="row items-center no-wrap">
          <div class="col">
            <q-input
              v-model="identity.dn"
              filled
              label="Display name"
              :disable="ipfs_id.id != identity.publisher"
            />
          </div>
        </div>
      </q-card-section>
      <!--  -->
      <q-card-section>
        <q-input
          v-model="identity.publisher"
          filled
          label="Publisher"
          disable
        />
      </q-card-section>
      <!--  -->
      <q-card-section>
        <q-input v-model="identity.hs" filled label="Hidden service" disable />
      </q-card-section>
      <!--  -->
      <q-card-section>
        <div v-for="(obj, index) in identity.aux" :key="index">
          <div class="row items-center no-wrap">
            <div class="col-auto">
              <q-input
                v-model="obj.key"
                filled
                label="Custom key"
                :disable="ipfs_id.id != identity.publisher"
              />
            </div>
            <q-card-section />
            <div class="col">
              <q-input
                v-model="obj.value"
                filled
                label="Custom value"
                :disable="ipfs_id.id != identity.publisher"
              />
            </div>
            <div class="col-auto">
              <q-btn
                v-if="ipfs_id.id == identity.publisher"
                color="primary"
                flat
                size="xl"
                icon="remove"
                @click="removeAuxItem(index)"
              />
            </div>
          </div>
        </div>
      </q-card-section>
      <!--  -->
      <q-card-section v-if="ipfs_id.id == identity.publisher">
        <div class="row items-center no-wrap">
          <div class="col"></div>
          <div class="col-auto">
            <q-btn
              color="primary"
              flat
              size="xl"
              icon="add"
              @click="addAuxItem()"
            />
          </div>
        </div>
      </q-card-section>
      <!--  -->
      <q-card-section>
        <div class="row items-center no-wrap">
          <div class="col">Last update: {{ dt }}</div>
          <div v-if="ipfs_id.id == identity.publisher" class="col-auto">
            <q-btn
              v-if="!saving"
              flat
              color="primary"
              size="xl"
              label=""
              icon="save"
              @click="editIdentity()"
            />
            <q-spinner v-else-if="saving" color="primary" size="xl" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- following -->
    <h6>Following:</h6>
    <IdentityCard
      v-for="iden in identity.following"
      :key="iden"
      :publisher="iden"
      @show-unfollow-prompt="showUnfollowPrompt"
    ></IdentityCard>
    <br />
    <!-- meta  -->
    <h6>Collections:</h6>
    <div v-for="obj in meta" :key="obj">
      <router-link :to="{ name: 'Meta', params: { obj } }" :obj="obj">
        {{ obj }}
      </router-link>
    </div>
    <br />
    <!-- posts  -->
    <h6>Posts:</h6>
    <q-infinite-scroll :offset="0" @load="getPosts">
      <PostCard
        v-for="post in posts"
        :key="post.postCid"
        :publisher="post.publisher"
        :post="post"
        @show-link-prompt="showLinkPrompt"
      />
      <template #loading>
        <div class="row justify-center q-my-md">
          <q-spinner-dots color="primary" size="80px" />
        </div>
      </template>
    </q-infinite-scroll>

    <!-- edit field modal -->
    <q-dialog v-model="editModal" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Enter an ID to follow</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="editModal"
            dense
            autofocus
            @keyup.enter="editModal = false"
            @keyup.escape="editModal = false"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn
            v-close-popup
            flat
            label="Add ID"
            @click="addNewFollowing(editModal)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- end -->
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import IdentityCard from "../components/IdentityCard.vue";
import PostCard from "../components/PostCard.vue";

export default defineComponent({
  name: "Identity",
  // components: { IdentityCard },
  components: { IdentityCard, PostCard },
  props: {
    publisher: {
      type: String,
      required: true,
    },
  },
  emits: ["show-unfollow-prompt", "show-link-prompt"],
  data: function () {
    return {
      editModal: false,
      getLatestPostsInterval: null,
      identity: {},
      ipfs_id: {},
      meta: [],
      newestTs: 0,
      oldestTs: 0,
      pageSize: 10,
      posts: [],
      saving: false,
      updateFeedInterval: null,
    };
  },
  computed: {
    dt: function () {
      return new Date(Number(this.identity.ts));
    },
  },
  beforeUnmount: function () {
    clearInterval(this.getLatestPostsInterval);
    clearInterval(this.updateFeedInterval);
  },
  mounted: function () {
    this.ipfs_id = this.$store.state.ipfs_id;
    // always get lastest version of the identity...
    window.ipc.invoke("get-identity", this.publisher).then((identity) => {
      this.$store.state.identities[this.publisher] = identity;
      this.identity = this.$store.state.identities[this.publisher];
    });
    this.updateFeedInterval = setInterval(async () => {
      console.log("updating feed...");
      window.ipc.send("update-feed");
    }, 1 * 60 * 1000);
    this.getLatestPostsInterval = setInterval(
      this.getLatestPosts,
      1 * 60 * 1000
    );
  },

  methods: {
    addAuxItem() {
      console.log("addAuxItem");
      const newKey = "";
      const newValue = "";
      const newObj = { key: newKey, value: newValue };
      this.identity.aux.push(newObj);
    },
    removeAuxItem(index) {
      this.identity.aux.splice(index, 1);
    },
    getLatestPosts() {
      console.log("getLatestPosts");
      if (this.posts.length > 0) {
        this.newestTs = this.posts[0].ts;
        window.ipc
          .invoke("get-posts-newer-than", this.publisher, this.newestTs)
          .then((posts) => {
            if (posts.length > 0) {
              posts.forEach((postObj) => {
                this.posts.unshift(postObj);
              });
            }
          });
      } else {
        this.getPosts();
      }
    },
    getPosts(index, done) {
      console.log("getPosts");
      if (this.posts.length > 0) {
        this.oldestTs = this.posts[this.posts.length - 1].ts;
      } else {
        this.oldestTs = Math.floor(new Date().getTime());
      }
      window.ipc
        .invoke(
          "get-posts-older-than",
          this.publisher,
          this.oldestTs,
          this.pageSize
        )
        .then((posts) => {
          if (posts.length > 0) {
            posts.forEach((postObj) => {
              this.posts.push(postObj);
            });
            if (done) {
              done();
            }
          }
        });
    },
    editIdentity() {
      console.log("edit-identity");
      const array = [
        {
          key: "av",
          value: this.identity.av,
        },
        {
          key: "dn",
          value: this.identity.dn,
        },
        {
          key: "aux",
          value: this.identity.aux,
        },
      ];
      this.saving = true;
      window.ipc.invoke("edit-identity", array).then((identity) => {
        console.log("edit-complete");
        console.log(identity);
        this.$store.state.identities[this.publisher] = identity;
        this.saving = false;
      });
    },
    showUnfollowPrompt(id) {
      console.log(`Identity: showUnfollowPrompt(${id})`);
      this.$emit("show-unfollow-prompt", id);
    },
    showLinkPrompt(link) {
      this.$emit("show-link-prompt", link);
    },
  },
});
</script>

<style scoped>
.center {
  display: block;
  text-align: center;
  margin-left: auto;
  margin-right: auto;
}
</style>
