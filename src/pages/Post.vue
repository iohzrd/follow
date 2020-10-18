<template>
  <div v-if="post">
    <PostCard :key="post.ts" :post="post" @delete-post="deletePost" />
    {{ post }}
    <Comments :cid="post.postCid" />
  </div>
</template>
<script>
import Comments from "../components/Comments.vue";
import PostCard from "../components/PostCard.vue";
export default {
  name: "Post",
  components: {
    Comments,
    PostCard
  },
  props: {
    post: {
      type: Object,
      required: true
    }
  },
  data: function() {
    return {};
  },
  mounted: function() {},
  methods: {
    deletePost(cid) {
      console.log("deletePost");
      console.log(cid);
      this.feed = this.feed.filter(post => post.postCid !== cid);
    }
  }
};
</script>
<style scoped></style>
