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
    async addPost() {
      console.log("NewPost.addPost");
      const files = [];
      this.files.forEach(file => {
        const file_object = {};
        file_object.name = file.name;
        file_object.path = file.path;
        file_object.type = file.type;
        file_object.size = file.size;
        files.push(file_object);
      });
      ipcRenderer
        .invoke("add-post", { body: this.body, files: files })
        .then(result => {
          console.log("add-post.then");
          console.log(result);
          this.body = "";
          this.files = [];
          ipcRenderer.send("get-feed");
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
