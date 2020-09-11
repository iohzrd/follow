<template>
  <div class="posts-container">
    <NewPost class="new-post" :identity="identity"></NewPost>
    <div v-if="posts">
      <PostCard
        v-for="post in posts"
        :id="post.id"
        :key="post.ts"
        class="post-card"
        :publisher="post.publisher"
        :post="post"
      ></PostCard>
    </div>
  </div>
</template>

<script>
import PostCard from "../components/PostCard.vue";

export default {
  name: "PostList",
  components: {
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
      posts: [],
    };
  },
  mounted: function () {
    this.getPosts();
  },
  methods: {
    async getPosts() {
      this.posts = await this.identity.getPostList();
    },
  },
};
</script>

<style scoped></style>
