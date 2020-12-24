<template>
  <q-page>
    <NewPost class="new-post" />
    <q-infinite-scroll :offset="0" @load="onFeedPage">
      <PostCard
        v-for="post in feed"
        :key="post.ts"
        :publisher="post.publisher"
        :post="post"
        @remove-post="removePost"
        @show-unfollow-prompt="showUnfollowPrompt"
        @show-link-prompt="showLinkPrompt"
      />
      <template #loading>
        <div class="row justify-center q-my-md">
          <q-spinner-dots color="primary" size="80px" />
        </div>
      </template>
    </q-infinite-scroll>
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
    publisher: {
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
    // clearInterval(this.requestFeedInterval);
    clearInterval(this.updateFeedInterval);
    ipcRenderer.removeAllListeners("feedNewItem");
  },
  mounted: function() {
    ipcRenderer.on("feedItem", this.onNewFeedItem);
    this.updateFeedInterval = setInterval(async () => {
      console.log("updating feed...");
      ipcRenderer.send("update-feed");
    }, 1 * 60 * 1000);
    // this.requestFeedInterval = setInterval(async function() {
    //   console.log("requesting feed...");
    //   ipcRenderer.send("get-feed");
    // }, 1 * 60 * 1000);
  },
  methods: {
    onFeedPage(index, done) {
      console.log("onFeedPage");
      ipcRenderer.invoke("get-feed-page", index - 1, 10).then(posts => {
        if (posts.results.length > 0) {
          posts.results.forEach(postObj => {
            if (!this.feed.some(id => id.ts === postObj.ts)) {
              this.feed.push(postObj);
            }
            // this.feed.push(postObj);
          });
          done();
        }
      });
    },
    onNewFeedItem(event, postObj) {
      if (!this.feed.some(id => id.ts === postObj.ts)) {
        this.feed.unshift(postObj);
      }
    },
    showUnfollowPrompt(id) {
      this.$emit("show-unfollow-prompt", id);
    },
    showLinkPrompt(link) {
      this.$emit("show-link-prompt", link);
    },
    removePost(cid) {
      this.feed = this.feed.filter(post => post.postCid !== cid);
    }
  }
};
</script>
<style scoped></style>
