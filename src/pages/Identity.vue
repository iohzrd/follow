<template>
  <div v-if="identity" class="identity-container">
    <q-card flat bordered>
      <!-- avatar -->
      <q-card-section>
        <div class="center">
          <q-img v-if="identity.av" :src="identity.av" @click="temp" />
          <q-icon v-else :size="'xl'" :name="'assignment_ind'" @click="temp" />
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
              :disable="ipfs_id != identity.id"
            />
          </div>
        </div>
      </q-card-section>
      <!--  -->
      <q-card-section>
        <q-input v-model="identity.id" filled label="ID" disable />
      </q-card-section>
      <!--  -->
      <q-card-section>
        <div v-for="(obj, index) in aux" :key="index">
          <div class="row items-center no-wrap">
            <div class="col-auto">
              <q-input
                v-model="obj.key"
                filled
                label="Custom key"
                :disable="ipfs_id != identity.id"
              />
            </div>
            <q-card-section />
            <div class="col">
              <q-input
                v-model="obj.value"
                filled
                label="Custom value"
                :disable="ipfs_id != identity.id"
              />
            </div>
            <div class="col-auto">
              <q-btn
                v-if="ipfs_id == identity.id"
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
              v-if="ipfs_id == identity.id"
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
              v-if="ipfs_id == identity.id"
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
      required: true
    }
  },
  data: function() {
    return {
      aux: [],
      dt: "",
      editModal: false,
      identity: {},
      ipfs_id: "",
      meta_deep: [],
      posts_deep: []
    };
  },
  beforeDestroy: function() {
    ipcRenderer.removeAllListeners("post");
    // try {
    //   ipcRenderer.removeAllListeners("post");
    // } catch (error) {
    //   console.log(
    //     "error trying to remove event listeners for 'post', listens must not have been listening"
    //   );
    //   console.log(error);
    // }
  },

  mounted: async function() {
    const ipfs_id = this.$store.state.id;
    this.ipfs_id = ipfs_id.id;
    ipcRenderer.once("identity", (event, identityObj) => {
      this.identity = identityObj;
      if (!Array.isArray(this.identity.aux)) {
        this.identity.aux = [];
      }
      this.aux = this.identity.aux;
      console.log("this.aux");
      console.log(this.aux);
      this.dt = new Date(Number(this.identity.ts));
    });
    ipcRenderer.send("get-identity", this.id);
    ipcRenderer.on("post", (event, postObj) => {
      if (!this.posts_deep.some(id => id.ts === postObj.ts)) {
        this.posts_deep.push(postObj);
        this.posts_deep.sort((a, b) => (a.ts > b.ts ? -1 : 1));
      }
    });
    ipcRenderer.send("get-posts", this.id);
  },

  methods: {
    addAuxItem() {
      console.log("addAuxItem");
      const newKey = ``;
      const newValue = ``;
      const newObj = { key: newKey, value: newValue };
      this.aux.push(newObj);
    },
    removeAuxItem(index) {
      this.aux.splice(index, 1);
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
        value: this.aux
      });
      ipcRenderer.send("get-identity", this.id);
    },
    temp() {
      console.log("temp");
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
