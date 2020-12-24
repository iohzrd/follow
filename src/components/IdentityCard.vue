<template>
  <div v-if="publisher">
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center no-wrap">
          <q-avatar>
            <img v-if="identity.av" :src="identity.av" />
            <q-icon v-if="!identity.av" :size="'xl'" :name="'assignment_ind'" />
          </q-avatar>
          <q-card-section />
          <div class="col">
            <router-link
              :publisher="identity.publisher"
              :to="{
                name: 'Identity',
                params: { publisher: identity.publisher }
              }"
            >
              {{ identity.dn }} - {{ identity.publisher }}
            </router-link>
          </div>
          <!-- unfollow -->
          <div v-if="publisher != ipfs_id.id" class="col-auto">
            <q-btn color="grey-7" round flat icon="more_vert">
              <q-menu cover auto-close>
                <q-list>
                  <q-item v-if="publisher != ipfs_id.id" clickable>
                    <q-item-section
                      @click="showUnfollowPrompt(identity.publisher)"
                    >
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
    </q-card>
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
            @click="removePost()"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
<script>
import { ipcRenderer } from "electron";
export default {
  name: "IdentityCard",
  props: {
    publisher: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {
      unfollowModal: false,
      ipfs_id: {},
      identity: {}
    };
  },
  mounted: function() {
    console.log(this.publisher);
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
  },
  methods: {
    showUnfollowPrompt() {
      console.log(`IdentityCard: showUnfollowPrompt(${this.publisher})`);
      this.$emit("show-unfollow-prompt", this.publisher);
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
