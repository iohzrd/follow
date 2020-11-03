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
      requestFeedInterval: null,
      updateFeedInterval: null
    };
  },
  beforeDestroy: function() {
    clearInterval(this.requestFeedInterval);
    clearInterval(this.updateFeedInterval);
    ipcRenderer.removeAllListeners("feedItem");
    ipcRenderer.removeAllListeners("feedAll");
  },
  mounted: function() {
    ipcRenderer.on("feedItem", this.onFeedItem);
    ipcRenderer.on("feedAll", this.onFeedAll);
    ipcRenderer.send("get-feed");
    // ipcRenderer.send("get-feed-all");
    this.updateFeedInterval = setInterval(async function() {
      console.log("updating feed...");
      ipcRenderer.send("update-feed");
    }, 1 * 60 * 1000);
    this.requestFeedInterval = setInterval(async function() {
      console.log("requesting feed...");
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
      }
    },
    onFeedAll(event, feedAll) {
      this.feed = feedAll;
    }
  }
};
</script>
<style scoped></style>
