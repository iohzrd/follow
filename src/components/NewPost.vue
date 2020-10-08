<template>
  <q-card title="New post">
    <div class="q-pa-md">
      <div class="q-pa-md">
        <q-input
          v-model="body"
          autogrow
          filled
          label="What's happening?"
          type="textarea"
        />
      </div>

      <!-- file manager -->
      <div class="q-pa-md column items-start q-gutter-y-md">
        <q-file
          v-model="files"
          label="drag file(s) or click here"
          outlined
          use-chips
          multiple
        >
          <template #after>
            <q-btn
              color="primary"
              dense
              size="xl"
              icon="cloud_upload"
              :disable="!files.length && !body.length"
              @click="addPost"
            />
          </template>
        </q-file>
      </div>
    </div>
  </q-card>
</template>
<script>
import { ipcRenderer } from "electron";

export default {
  name: "NewPost",
  components: {},
  props: {},
  data: function() {
    return {
      body: "",
      files: []
    };
  },
  computed: {},
  methods: {
    addPost: async function() {
      ipcRenderer
        .invoke("addPost", { body: this.body, files: this.files })
        .then(result => {
          console.log("addPost.then");
          console.log(result);
          this.body = "";
          this.files = [];
          ipcRenderer.send("getFeed");
        });
    }
  }
};
</script>
<style scoped>
.addPost-button {
  float: right;
  float: bottom;
}
</style>
