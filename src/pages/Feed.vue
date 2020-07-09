<template>
  <q-page class="flex flex-center">
    <div class="feed-container">
      <NewPost class="new-post" :identity="identity" />
      <div v-if="feed">
        <PostCard
          v-for="post in feed"
          :id="post.id"
          :key="post.ts"
          :post="post"
        />
      </div>
    </div>
  </q-page>
</template>

<script>
import NewPost from "../components/NewPost.vue";
import PostCard from "../components/PostCard.vue";

export default {
  name: "Feed",
  components: {
    NewPost,
    PostCard
  },
  props: {
    identity: {
      type: Object,
      required: true
    }
  },
  data: function() {
    return {
      feed: []
    };
  },
  watch: {
    "identity.feed": {
      deep: true,
      handler: function(after) {
        this.feed = after;
      }
    }
  },

  mounted: async function() {
    this.feed = this.identity.feed;
  }
};
</script>

<style scoped></style>
