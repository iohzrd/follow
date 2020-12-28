<template>
  <q-page>
    <NewPost class="new-post" @add-post-complete="onAddPostComplete" />
    <q-infinite-scroll :offset="0" @load="getFeed">
      <PostCard
        v-for="post in feed"
        :key="post.postCid"
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
      getLatestFeedInterval: null,
      newestTs: 0,
      oldestTs: 0,
      pageSize: 10,
      updateFeedInterval: null
    };
  },
  beforeDestroy: function() {
    clearInterval(this.getLatestFeedInterval);
    clearInterval(this.updateFeedInterval);
  },
  mounted: function() {
    this.updateFeedInterval = setInterval(async () => {
      console.log("updating feed...");
      ipcRenderer.send("update-feed");
    }, 1 * 60 * 1000);
    this.getLatestFeedInterval = setInterval(this.getLatestFeed, 10 * 1000);
  },
  methods: {
    getLatestFeed() {
      console.log("getLatestFeed");
      if (this.feed.length > 0) {
        this.newestTs = this.feed[0].ts;
        ipcRenderer.invoke("get-feed-newer-than", this.newestTs).then(posts => {
          if (posts.length > 0) {
            posts.forEach(postObj => {
              this.feed.unshift(postObj);
            });
          }
        });
      } else {
        this.getFeed();
      }
    },
    getFeed(index, done) {
      console.log("getFeed");
      if (this.feed.length > 0) {
        this.oldestTs = this.feed[this.feed.length - 1].ts;
      } else {
        this.oldestTs = Math.floor(new Date().getTime());
      }
      ipcRenderer
        .invoke("get-feed-older-than", this.oldestTs, this.pageSize)
        .then(posts => {
          if (posts.length > 0) {
            posts.forEach(postObj => {
              this.feed.push(postObj);
            });
            if (done) {
              done();
            }
          }
        });
    },
    onAddPostComplete(postObj) {
      this.feed.unshift(postObj);
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
