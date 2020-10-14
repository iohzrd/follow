<template>
  <div v-if="id">
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
              :to="{
                name: 'Identity',
                params: { id: id }
              }"
            >
              {{ identity.dn }} - {{ id }}
            </router-link>
          </div>
          <!-- unfollow -->
          <div v-if="ipfs_id != id">
            <div class="col-auto">
              <q-btn color="grey-7" round flat icon="more_vert">
                <q-menu cover auto-close>
                  <q-list>
                    <q-item v-if="id != identity.id" clickable>
                      <q-item-section @click="unfollowModal = true"
                        >Unfollow</q-item-section
                      >
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
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
  name: "PostCard",
  props: {
    id: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {
      unfollowModal: false,
      ipfs_id: "",
      identity: {}
    };
  },
  mounted: function() {
    console.log(this.id);
    const ipfs_id = this.$store.state.id;
    this.ipfs_id = ipfs_id.id;
    // ipcRenderer.on("identity", (event, identityObj) => {
    //   console.log(identityObj);
    //   this.identity = identityObj;
    // });
    ipcRenderer.invoke("getIdentity", this.id).then(result => {
      console.log("getIdentity.then");
      console.log(result);
      this.identity = result;
    });
  },
  methods: {}
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
