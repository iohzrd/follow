<template>
  <div v-if="identity" class="profile-container">
    <img :src="av" />
    <h2>{{ dn }}</h2>
    <div>ID:</div>
    <div>{{ identity.id }}</div>
    <br />
    <div>Last update:</div>
    <div>{{ ts }}</div>
    <br />
    <div>Following:</div>
    <div v-for="iden in following" :key="iden">
      <router-link :id="iden" :to="{ name: 'Profile', params: { iden } }">
        {{
        iden
        }}
      </router-link>
    </div>
    <br />
    <div>Meta:</div>
    <div v-for="obj in meta" :key="obj">
      <router-link :to="{ name: 'Meta', params: { obj } }" :obj="obj">
        {{
        obj
        }}
      </router-link>
    </div>
    <br />
    <div>Posts:</div>
    <div v-for="post in posts" :key="post">
      <router-link :to="{ name: 'Post', params: { post } }" :post="post">
        {{
        post.cid
        }}
      </router-link>
    </div>
  </div>
</template>

<script>
const { Identity } = require("../modules/identity");
export default {
  name: "Meta",
  props: {
    id: { type: String, required: true },
  },
  data: function () {
    return {
      av: "",
      dn: "",
      following: [],
      identity: {},
      meta: [],
      posts: [],
      ts: 0,
    };
  },
  watch: {
    "$route.params.id"(newId) {
      console.log(newId);
      this.init(newId);
    },
  },
  mounted: function () {
    this.init();
  },
  methods: {
    init() {
      console.log("MetaObj.init()");
      // if (!id) {
      //   id = this.$store.id;
      // }
      this.identity = new Identity(this.id);
      // if (this.identity.id != this.$store.id) {
      //   this.identity.refresh();
      // }
      this.av = this.identity.av;
      this.dn = this.identity.dn;
      this.following = this.identity.following;
      this.meta = this.identity.meta;
      this.posts = this.identity.posts;
      this.ts = this.identity.ts;
      this.dt = new Date(Number(this.identity.ts));
    },
  },
};
</script>

<style scoped></style>
