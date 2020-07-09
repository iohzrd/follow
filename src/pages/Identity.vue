<template>
  <div v-if="identity" class="identity-container">
    <br />
    <img :src="av" />
    <h6>{{ dn }} ({{ identity.id }})</h6>
    <div>Last update: {{ dt }}</div>
    <br />
    <h6>Info:</h6>
    <div v-for="obj in aux" :key="obj">
      placeholder
    </div>
    <br />
    <h6>Following:</h6>
    <div v-for="iden in following_deep" :key="iden">
      <router-link
        :identity="iden"
        :to="{ name: 'Identity', params: { identity: iden } }"
      >
        {{ iden.id }} - {{ iden.dn }}
      </router-link>
    </div>
    <br />
    <h6>Collections:</h6>
    <div v-for="obj in meta_deep" :key="obj">
      <router-link :to="{ name: 'Meta', params: { obj } }" :obj="obj">{{
        obj
      }}</router-link>
    </div>
    <br />
    <h6>Posts:</h6>
    <PostCard
      v-for="post in posts_deep"
      :id="post.id"
      :key="post.ts"
      class="post-card"
      :post="post"
    ></PostCard>
  </div>
</template>

<script>
import PostCard from "../components/PostCard.vue";
// const { Identity } = require("../modules/identity");
export default {
  name: "Identity",
  components: { PostCard },
  props: {
    identity: {
      type: Object,
      required: true
    }
  },
  data: function() {
    return {
      av: "",
      aux: {},
      id: "",
      dn: "",
      dt: "",
      following: [],
      following_deep: [],
      meta: [],
      meta_deep: [],
      posts: [],
      posts_deep: [],
      ts: 0
    };
  },
  computed: {
    getIdentity() {
      return this.identity;
    }
  },
  watch: {
    "identity.posts_deep": {
      deep: true,
      async handler(event) {
        this.posts = event;
      },
      "identity.meta_deep": {
        deep: true,
        async handler(event) {
          this.meta = event;
        }
      },
      "identity.following_deep": {
        deep: true,
        async handler(event) {
          this.following_deep = event;
        }
      }
    }
  },
  mounted: async function() {
    console.log("IdentityObj.init()");
    this.aux = this.identity.aux;
    this.av = this.identity.av;
    this.dn = this.identity.dn;
    this.dt = new Date(Number(this.identity.ts));
    this.following = this.identity.following; // convert to deep
    this.following_deep = this.identity.following_deep; // convert to deep
    this.id = this.identity.id;
    this.meta = this.identity.meta; // convert to deep
    this.meta_deep = this.identity.meta_deep; // convert to deep
    this.posts = this.identity.posts;
    this.posts_deep = this.identity.posts_deep;
    this.ts = this.identity.ts;
  },
  methods: {}
};
</script>

<style scoped></style>
