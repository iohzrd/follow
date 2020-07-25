<template>
  <div id="q-app">
    <q-layout view="hHh Lpr lff">
      <q-header unelevated class="bg-black row no-wrap">
        <q-toolbar>
          <q-btn flat round dense icon="menu" @click="drawer = !drawer" />
          <q-toolbar-title>Follow</q-toolbar-title>
          <div>ID: {{ ipfsId }}</div>
          <q-space />
        </q-toolbar>

        <q-btn unelevated icon="person_add" @click="prompt = true" />
      </q-header>

      <q-drawer
        v-model="drawer"
        show-if-above
        :width="200"
        :breakpoint="500"
        bordered
        content-class="bg-grey-3"
      >
        <q-scroll-area class="fit">
          <q-list v-for="(menuItem, index) in menuList" :key="index">
            <q-item
              v-ripple
              clickable
              :to="{ name: menuItem.route }"
              :identity="identity"
            >
              <q-item-section avatar>
                <q-icon :name="menuItem.icon" />
              </q-item-section>
              <q-item-section>
                {{ menuItem.label }}
              </q-item-section>
            </q-item>

            <q-separator v-if="menuItem.separator" />
          </q-list>
        </q-scroll-area>
      </q-drawer>
      <q-page-container>
        <q-page class="root-container">
          <div v-if="identity">
            <router-view :identity="identity" />
          </div>
        </q-page>
      </q-page-container>

      <q-dialog v-model="prompt" persistent>
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Enter an ID to follow</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-input
              v-model="idToFollow"
              dense
              autofocus
              @keyup.enter="prompt = false"
            />
          </q-card-section>

          <q-card-actions align="right" class="text-primary">
            <q-btn v-close-popup flat label="Cancel" />
            <q-btn
              v-close-popup
              flat
              label="Add ID"
              @click="addNewFollowing(idToFollow)"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-layout>
  </div>
</template>

<script>
const IpfsHttpClient = require("ipfs-http-client");
const { Identity } = require("./modules/identity");

const menuList = [
  {
    icon: "rss_feed",
    label: "Feed",
    route: "Feed",
    separator: false
  },
  {
    icon: "featured_play_list",
    label: "Collections",
    route: "MetaList",
    separator: false
  },
  {
    icon: "people",
    label: "Following",
    route: "IdentityList",
    separator: false
  },
  {
    icon: "assignment_ind",
    label: "Profile",
    route: "Identity",
    separator: false
  },
  {
    icon: "settings",
    label: "Settings",
    route: "Settings",
    separator: false
  }
];

export default {
  name: "App",
  data() {
    return {
      drawer: false,
      idToFollow: "",
      identity: {},
      ipfsId: "",
      menuList,
      prompt: false
    };
  },
  mounted: function() {
    this.init();
  },
  methods: {
    async init() {
      const ipfs = await IpfsHttpClient({
        host: "localhost",
        port: "5001",
        protocol: "http"
      });
      const { id } = await ipfs.id();
      this.ipfsId = id;
      this.identity = new Identity(this.ipfsId);
    },
    async addNewFollowing(id) {
      this.identity.addToFollowing(id);
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
