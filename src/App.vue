<template>
  <div id="q-app">
    <q-layout view="hHh Lpr lFr">
      <q-header class="bg-black row no-wrap">
        <q-toolbar>
          <q-btn flat round dense icon="menu" @click="drawer = !drawer" />
          <q-toolbar-title>Follow</q-toolbar-title>
          <div>ID: {{ ipfs_id.id }}</div>
          <q-space />
        </q-toolbar>

        <q-btn unelevated icon="person_add" @click="addPrompt = true" />
      </q-header>

      <q-drawer
        v-model="drawer"
        behavior="desktop"
        bordered
        show-if-above
        side="left"
      >
        <q-scroll-area class="fit">
          <q-list v-for="(menuItem, index) in menuList" :key="index">
            <q-item
              v-if="ipfs_id.id"
              :id="ipfs_id.id"
              v-ripple
              clickable
              :to="{ name: menuItem.route, params: { id: ipfs_id.id } }"
            >
              <q-item-section avatar>
                <q-icon :name="menuItem.icon" />
              </q-item-section>
              <q-item-section>{{ menuItem.label }}</q-item-section>
            </q-item>
          </q-list>

          <q-item>
            <q-item-section avatar>
              <q-icon name="style" />
            </q-item-section>
            <q-item-section>
              <q-toggle v-model="dark" color="green" />
            </q-item-section>
          </q-item>
        </q-scroll-area>
      </q-drawer>

      <!-- router view -->
      <q-page-container>
        <q-page class="root-container">
          <div>
            <router-view
              v-if="ipfs_id.id"
              :id="ipfs_id.id"
              :key="$route.path"
            />
          </div>
        </q-page>
      </q-page-container>

      <!-- follow new id modal -->
      <q-dialog v-model="addPrompt" persistent>
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Enter an ID to follow</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="idToFollow"
              dense
              autofocus
              @keyup.enter="addPrompt = false"
            />
          </q-card-section>

          <q-card-actions align="right" class="text-primary">
            <q-btn v-close-popup flat label="Cancel" />
            <q-btn
              v-close-popup
              flat
              label="Add ID"
              @click="addNewFollowing()"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-layout>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";

const menuList = [
  {
    icon: "rss_feed",
    label: "Feed",
    route: "Feed"
  },
  {
    icon: "assignment_ind",
    label: "Profile",
    route: "Identity"
  },
  {
    icon: "settings",
    label: "Settings",
    route: "Settings"
  }
];

export default {
  name: "App",
  data() {
    return {
      addPrompt: false,
      dark: true,
      drawer: false,
      idToFollow: "",
      ipfs_id: {},
      menuList,
      publishInterval: null,
      refreshInterval: null
    };
  },

  watch: {
    dark: {
      handler: function(after) {
        this.dark = after;
        this.$q.dark.set(this.dark);
      }
    }
  },
  created() {
    this.$q.dark.set(true);
  },
  beforeDestroy: function() {
    clearInterval(this.publishInterval);
    clearInterval(this.refreshInterval);
  },
  mounted: function() {
    ipcRenderer.invoke("getId", this.id).then(id => {
      console.log("getIdentity.then");
      console.log(id);
      this.ipfs_id = id;
      this.$store.commit("setID", id);
    });

    ipcRenderer.send("publish");
    ipcRenderer.send("updateFollowing");

    this.publishInterval = setInterval(async function() {
      console.log("auto-publish...");
      ipcRenderer.send("publish");
    }, 60 * 60 * 1000);
    this.refreshInterval = setInterval(async function() {
      console.log("refreshing identities...");
      ipcRenderer.send("updateFollowing");
    }, 1 * 60 * 1000);
  },
  methods: {
    async addNewFollowing() {
      ipcRenderer.send("addNewFollowing", this.idToFollow);
      this.idToFollow = "";
    }
  }
};
</script>
<style scoped>
.root-container {
  padding-left: 16.5%;
  padding-right: 16.5%;
  position: relative;
}
</style>
