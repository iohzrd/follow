<template>
  <div v-if="identity" class="identity-container">
    <br />
    <!-- avatar -->
    <img :src="identity.av" />
    <!-- display name -->
    <h6>
      {{ identity.dn }}
      <q-btn
        flat
        round
        color="primary"
        icon="edit"
        @click="editIdentityString(identity.dn)"
      />
    </h6>
    <!-- identity -->
    <h6>({{ identity.id }})</h6>
    <!-- time of last publication -->
    <div>Last update: {{ dt }}</div>
    <br />
    <!-- auxiliary fields -->
    <h6>Info:</h6>
    <div v-for="obj in identity.aux" :key="obj">placeholder</div>
    <br />
    <!-- following -->
    <h6>Following:</h6>
    <IdentityCard
      v-for="iden in identity.following"
      :id="iden"
      :key="iden"
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
    <PostCard
      v-for="post in posts_deep"
      :id="post.id"
      :key="post.ts"
      :post="post"
    ></PostCard>

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
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import IdentityCard from "../components/IdentityCard.vue";
import PostCard from "../components/PostCard.vue";
export default {
  name: "Identity",
  components: { IdentityCard, PostCard },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data: function () {
    return {
      dt: "",
      editModal: false,
      following_deep: [],
      identity: {},
      ipfs_id: "",
      meta_deep: [],
      posts_deep: [],
    };
  },
  beforeDestroy: function () {
    ipcRenderer.removeAllListeners("post");
  },

  mounted: async function () {
    const ipfs_id = this.$store.state.id;
    this.ipfs_id = ipfs_id.id;
    ipcRenderer.once("identity", (event, identityObj) => {
      this.identity = identityObj;
      this.dt = new Date(Number(this.identity.ts));
      // for (const postCid in identityObj.posts_deep) {
      //   const postObj = identityObj.posts_deep[postCid];
      //   postObj.postCid = postCid;
      //   postObj.identity = identityObj;
      //   this.posts_deep.push(postObj);
      //   this.posts_deep.sort((a, b) => (a.ts > b.ts ? -1 : 1));
      // }
    });
    ipcRenderer.send("getIdentity", this.id);
    ipcRenderer.on("post", (event, postObj) => {
      if (!this.posts_deep.some((id) => id.ts === postObj.ts)) {
        this.posts_deep.push(postObj);
        this.posts_deep.sort((a, b) => (a.ts > b.ts ? -1 : 1));
      }
    });
    ipcRenderer.send("getPosts", this.id);
  },
  methods: {
    editIdentityString(field, fieldName) {
      console.log(field);
      console.log(fieldName);
      this.editModal = true;
    },
  },
};
</script>

<style scoped></style>
