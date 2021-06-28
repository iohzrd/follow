<template>
  <q-page v-if="post">
    <PostCard
      :key="post.postCid"
      :post="post"
      @delete-post="deletePost"
      @show-unfollow-prompt="unfollow"
    />
    <Comments :cid="post.postCid" :publisher="post.publisher" />
  </q-page>
</template>
<script>
import { defineComponent } from "vue";
import Comments from "../components/Comments.vue";
import PostCard from "../components/PostCard.vue";

export default defineComponent({
  name: "Post",
  components: {
    Comments,
    PostCard,
  },
  props: {
    post: {
      type: Object,
      required: true,
    },
  },
  data: function () {
    return {};
  },
  mounted: function () {},
  methods: {
    unfollow(id) {
      console.log("on show-unfollow-prompt");
      console.log(id);
      // this.$emit("show-unfollow-prompt", id);
    },
    deletePost(cid) {
      console.log("deletePost");
      console.log(cid);
      this.feed = this.feed.filter((post) => post.postCid !== cid);
    },
  },
});
</script>
<style scoped></style>
