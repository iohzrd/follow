<template>
  <q-card flat bordered>
    <q-card-section>
      <q-input
        v-model="newComment"
        autogrow
        filled
        label="Add a comment"
        type="textarea"
      >
        <template #after>
          <q-btn
            color="primary"
            dense
            size="xl"
            icon="comment"
            :disable="!newComment.length"
            @click="addComment"
          />
        </template>
      </q-input>
    </q-card-section>

    <q-separator dark inset />

    <q-infinite-scroll :offset="0" @load="getComments">
      <!-- <PostCard
          v-for="post in feed"
          :key="post.postCid"
          :publisher="post.publisher"
          :post="post"
          @remove-post="removePost"
          @show-unfollow-prompt="showUnfollowPrompt"
          @show-link-prompt="showLinkPrompt"
        /> -->

      <div v-for="comment in comments" :key="comment.ts">
        <q-card-section>
          <div class="text-caption">From: {{ comment.from }}</div>
          <br />
          <div class="text-body1">{{ comment.content }}</div>
        </q-card-section>
        <q-separator dark inset />
      </div>

      <template #loading>
        <div class="row justify-center q-my-md">
          <q-spinner-dots color="primary" size="80px" />
        </div>
      </template>
    </q-infinite-scroll>
  </q-card>
</template>
<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "Comments",
  props: {
    cid: {
      type: String,
      required: true,
    },
    publisher: {
      type: String,
      required: true,
    },
  },
  data: function () {
    return {
      newestTs: 0,
      oldestTs: 0,
      pageSize: 10,
      newComment: "",
      comments: [],
    };
  },
  watch: {},
  beforeUnmount: function () {
    // window.ipc.send("unsubscribe-from-publisher", this.publisher);
    window.ipc.removeAllListeners("comment");
  },
  mounted: function () {
    console.log(this.cid);
    window.ipc.on("comment", this.onComment);
    window.ipc.on("comments", this.onComments);
    window.ipc.on("comments-new", this.onCommentsNew);
    window.ipc.on("comments-old", this.onCommentsOld);
    // window.ipc.on("topic-subscribed", () => {
    //   this.getComments();
    // });
    // window.ipc.send("subscribe-to-publisher", this.publisher);
  },
  methods: {
    getLatestComments() {
      console.log("getLatestFeed");
      if (this.comments.length > 0) {
        this.newestTs = this.comments[0].ts;
        window.ipc
          .invoke("get-comments-newer-than", this.newestTs)
          .then((comments) => {
            if (comments.length > 0) {
              this.onCommentsNew(undefined, comments);
            }
          });
      } else {
        this.getComments();
      }
    },
    getComments(index, done) {
      console.log("getComments");
      console.log(index);
      console.log(done);
      // console.log(this.oldestTs);
      // console.log(this.comments);
      // if (this.comments.length > 0) {
      //   this.oldestTs = this.comments[this.comments.length - 1].ts;
      // } else {
      //   this.oldestTs = Math.floor(new Date().getTime());
      // }
      // window.ipc
      //   .invoke(
      //     "get-comments-older-than",
      //     this.publisher,
      //     this.cid,
      //     this.oldestTs,
      //     this.pageSize
      //   )
      //   .then((comments) => {
      //     if (comments.length > 0) {
      //       this.onCommentsOld(undefined, comments);
      //       if (done) {
      //         done();
      //       }
      //     }
      //   });
    },
    addComment() {
      console.log("addComment");
      window.ipc
        .invoke("add-comment", this.publisher, this.cid, this.newComment, "")
        .then((comment) => {
          console.log("add-comment.then");
          console.log(comment);
          this.onComment(undefined, comment);
          this.newComment = "";
        });
    },
    onComment(event, comment) {
      this.comments.unshift(comment);
    },
    onComments(event, comments) {
      comments.forEach((commentObj) => {
        this.comments.push(commentObj);
      });
    },
    onCommentsNew(event, comments) {
      comments.forEach((commentObj) => {
        this.comments.unshift(commentObj);
      });
    },
    onCommentsOld(event, comments) {
      comments.forEach((commentObj) => {
        this.comments.push(commentObj);
      });
    },
  },
});
</script>
<style scoped>
.spinner {
  display: block;
  margin-left: auto;
  margin-right: auto;
}
</style>
