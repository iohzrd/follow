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
      <div class="q-pa-md">
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
import { defineComponent } from "vue";

export default defineComponent({
  name: "NewPost",
  components: {},
  props: {},
  emits: ["add-post-complete"],
  data: function () {
    return {
      body: "",
      files: [],
    };
  },
  computed: {},
  mounted: function () {
    console.log("NewPost init");
  },
  methods: {
    async addPost() {
      console.log("NewPost.addPost");
      const files = [];
      this.files.forEach((file) => {
        const file_object = {};
        file_object.name = file.name;
        file_object.path = file.path;
        file_object.type = file.type;
        file_object.size = file.size;
        files.push(file_object);
      });
      window.ipc
        .invoke("add-post", { body: this.body, files: files })
        .then((post) => {
          this.body = "";
          this.files = [];
          this.$emit("add-post-complete", post);
        });
    },
  },
});
</script>
<style scoped>
.addPost-button {
  float: right;
  float: bottom;
}
</style>
