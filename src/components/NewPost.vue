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
          <template v-slot:after>
            <q-btn
              color="primary"
              dense
              size="xl"
              icon="cloud_upload"
              :disable="!files.length && !body.length"
              @click="publish"
            />
          </template>
        </q-file>
      </div>
    </div>
  </q-card>
</template>
<script>
export default {
  name: "NewPost",
  components: {},
  props: {
    identity: {
      type: Object,
      required: true
    }
  },
  data: function() {
    return {
      body: "",
      files: []
    };
  },
  computed: {},
  methods: {
    publish: async function() {
      await this.identity.addPost(this.body, this.files);
      this.body = "";
      this.files = [];
    }
  }
};
</script>
<style scoped>
.publish-button {
  float: right;
  float: bottom;
}
</style>
