<template>
  <q-page class="flex flex-center">
    <div class="feed-container">
      <NewPost class="new-post" />
      <div v-if="feed">
        <PostCard
          v-for="(post, index) in feed"
          :id="post.id"
          :key="post.ts"
          :index="index"
          :post="post"
        />
      </div>
    </div>
  </q-page>
</template>

<script>
import { ipcRenderer } from "electron";
import NewPost from "../components/NewPost.vue";
import PostCard from "../components/PostCard.vue";

export default {
  name: "Feed",
  components: {
    NewPost,
    PostCard
  },
  props: {},
  data: function() {
    return {
      feed: [],
      refreshInterval: null
    };
  },
  beforeDestroy: function() {
    clearInterval(this.refreshInterval);
  },
  mounted: function() {
    ipcRenderer.on("feedItem", (event, postObj) => {
      if (!this.feed.some(id => id.ts === postObj.ts)) {
        this.feed.push(postObj);
        this.feed.sort((a, b) => (a.ts > b.ts ? -1 : 1));
      }
    });
    ipcRenderer.send("getFeed");
    this.refreshInterval = setInterval(async function() {
      console.log("refreshing feed...");
      // ipcRenderer.send("updateFollowing");
      ipcRenderer.send("getFeed");
    }, 1 * 60 * 1000);
  },
  methods: {}
};
</script>
