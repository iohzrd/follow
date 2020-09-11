<template>
  <q-page class="flex flex-center">
    <div class="feed-container">
      <NewPost class="new-post" :identity="identity" />
      <div v-if="feed">
        <PostCard
          v-for="(post, index) in feed"
          :id="post.id"
          :key="post.ts"
          :index="index"
          :identity="identity"
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
    PostCard,
  },
  props: {
    identity: {
      type: Object,
      required: true,
    },
  },
  data: function () {
    return {
      feed: [],
    };
  },
  watch: {
    "identity.feed": {
      deep: true,
      handler: function (after) {
        console.log("identity.feed changed!");
        this.feed = after;
      },
    },
  },

  mounted: function () {
    this.feed = this.identity.feed;
  },
};
</script>

<style scoped></style>
