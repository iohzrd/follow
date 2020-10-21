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

    <q-card-section v-for="comment in comments" :key="comment.meta.ts">
      {{ comment.content }}
    </q-card-section>
  </q-card>
</template>
<script>
import { ipcRenderer } from "electron";
export default {
  name: "Comments",
  props: {
    cid: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {
      newComment: "",
      comments: []
    };
  },
  watch: {},
  beforeDestroy: function() {
    ipcRenderer.send("leave-comment-channel", `${this.cid}:comments`);
    ipcRenderer.removeAllListeners("comment");
  },
  mounted: function() {
    console.log(this.cid);
    ipcRenderer.on("comment", this.onComment);
    ipcRenderer.send("join-comment-channel", `${this.cid}:comments`);
  },
  methods: {
    addComment() {
      console.log("addComment");
      ipcRenderer.send("add-comment", `${this.cid}:comments`, this.newComment);
      this.newComment = "";
    },
    onComment(event, comment) {
      console.log(event);
      if (!this.comments.some(c => c.meta.ts === comment.meta.ts)) {
        this.comments.push(comment);
        this.comments.sort((a, b) => (a.meta.ts > b.meta.ts ? -1 : 1));
        console.log(comment);
      }
    }
  }
};
</script>
<style scoped></style>
