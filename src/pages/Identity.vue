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
        <q-input v-model="identity.publisher" filled label="ID" disable />
      </q-card-section>
      <!--  -->
      <q-card-section>
        <q-input v-model="identity.hs" filled label="HS" disable />
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
      <q-card-section>
        <div class="row items-center no-wrap">
          <div class="col"></div>
          <div class="col-auto">
            <q-btn
              v-if="ipfs_id.id == identity.publisher"
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
          <div class="col-auto">
            <q-btn
              v-if="ipfs_id.id == identity.publisher"
              flat
              color="primary"
              size="xl"
              label=""
              icon="save"
              @click="saveIdentityFields()"
            />
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
    <div v-for="obj in identity.meta_deep" :key="obj">
      <router-link :to="{ name: 'Meta', params: { obj } }" :obj="obj">
        {{ obj }}
      </router-link>
    </div>
    <br />
    <!-- posts  -->
    <h6>Posts:</h6>
    <q-infinite-scroll :offset="0" @load="onPostsPage">
      <PostCard
        v-for="post in posts_deep"
        :key="post.postCid"
        :publisher="post.publisher"
        :post="post"
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
import { ipcRenderer } from "electron";
import IdentityCard from "../components/IdentityCard.vue";
import PostCard from "../components/PostCard.vue";
export default {
  name: "Identity",
  // components: { IdentityCard },
  components: { IdentityCard, PostCard },
  props: {
    publisher: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {
      dt: "",
      editModal: false,
      identity: {},
      ipfs_id: {},
      meta_deep: [],
      posts_deep: []
    };
  },
  beforeDestroy: function() {
    ipcRenderer.removeAllListeners("post");
  },

  mounted: async function() {
    this.ipfs_id = this.$store.state.ipfs_id;
    if (this.$store.state.identities[this.publisher]) {
      console.log("already had it...");
      this.identity = this.$store.state.identities[this.publisher];
    } else {
      console.log("getting it...");
      ipcRenderer.invoke("get-identity", this.publisher).then(identity => {
        this.$store.commit("setIdentity", identity);
        this.identity = identity;
      });
    }
    if (!Array.isArray(this.identity.aux)) {
      this.identity.aux = [];
    }
    this.dt = new Date(Number(this.identity.ts));
  },

  methods: {
    addAuxItem() {
      console.log("addAuxItem");
      const newKey = ``;
      const newValue = ``;
      const newObj = { key: newKey, value: newValue };
      this.identity.aux.push(newObj);
    },
    onPostsPage(index, done) {
      ipcRenderer
        .invoke("get-posts-page", this.publisher, index - 1, 10)
        .then(posts => {
          if (posts.results.length > 0) {
            posts.results.forEach(postObj => {
              if (!this.posts_deep.some(id => id.ts === postObj.ts)) {
                this.posts_deep.push(postObj);
              }
              // this.posts_deep.push(postObj);
            });
            done();
          }
        });
    },
    removeAuxItem(index) {
      this.identity.aux.splice(index, 1);
    },
    saveIdentityFields() {
      console.log("edit-identity-field");
      ipcRenderer.send("edit-identity-field", {
        key: "av",
        value: this.identity.av
      });
      ipcRenderer.send("edit-identity-field", {
        key: "dn",
        value: this.identity.dn
      });
      ipcRenderer.send("edit-identity-field", {
        key: "aux",
        value: this.identity.aux
      });
      ipcRenderer.send("get-identity", this.ipfs_id);
    },
    showUnfollowPrompt(id) {
      console.log(`Identity: showUnfollowPrompt(${id})`);
      this.$emit("show-unfollow-prompt", id);
    }
  }
};
</script>

<style scoped>
.center {
  display: block;
  text-align: center;
  margin-left: auto;
  margin-right: auto;
}
</style>
