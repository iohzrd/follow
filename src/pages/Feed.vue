<template>
  <q-page>
    <NewPost class="new-post" />
    <PostCard
      v-for="post in feed"
      :id="post.id"
      :key="post.ts"
      :post="post"
      @remove-post="removePost"
      @show-unfollow-prompt="showUnfollowPrompt"
      @show-link-prompt="showLinkPrompt"
    />
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
  props: {
    id: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {
      feed: [],
      refreshInterval: null
    };
  },
  beforeDestroy: function() {
    clearInterval(this.refreshInterval);
    ipcRenderer.removeAllListeners("feedItem");
  },
  mounted: function() {
    ipcRenderer.on("feedItem", this.onFeedItem);
    ipcRenderer.send("get-feed");
    this.refreshInterval = setInterval(async function() {
      console.log("refreshing feed...");
      ipcRenderer.send("get-feed");
    }, 1 * 60 * 1000);
  },
  methods: {
    showUnfollowPrompt(id) {
      console.log(`Feed: showUnfollowPrompt(${id})`);
      this.$emit("show-unfollow-prompt", id);
    },
    showLinkPrompt(link) {
      console.log(`Feed: showLinkPrompt(${link})`);
      this.$emit("show-link-prompt", link);
    },
    removePost(cid) {
      console.log("removePost");
      console.log(cid);
      this.feed = this.feed.filter(post => post.postCid !== cid);
    },
    onFeedItem(event, postObj) {
      if (!this.feed.some(id => id.ts === postObj.ts)) {
        this.feed.push(postObj);
        this.feed.sort((a, b) => (a.ts > b.ts ? -1 : 1));
      }
    }
  }
};
</script>
<style scoped></style>
